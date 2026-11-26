import { MemoryFileSystem } from "@/lib/terminal/memory-fs";
import {
  basename,
  dirname,
  normalizePath,
  splitPathSegments,
} from "@/lib/terminal/path";
import type { FsEntryStat, VirtualFileSystem } from "@/lib/terminal/types";

// Minimal structural interfaces for the browser Origin Private File System (OPFS)
// so this module can also be tested cleanly in Node with mock OPFS handles.
export interface OpfsFileHandleLike {
  readonly kind: "file";
  readonly name: string;
  getFile(): Promise<{
    size: number;
    lastModified: number;
    arrayBuffer(): Promise<ArrayBuffer>;
  }>;
  createWritable(): Promise<{
    write(data: Uint8Array | ArrayBuffer): Promise<void>;
    close(): Promise<void>;
  }>;
}

export interface OpfsDirectoryHandleLike {
  readonly kind: "directory";
  readonly name: string;
  getDirectoryHandle(
    name: string,
    options?: { create?: boolean },
  ): Promise<OpfsDirectoryHandleLike>;
  getFileHandle(
    name: string,
    options?: { create?: boolean },
  ): Promise<OpfsFileHandleLike>;
  removeEntry(name: string, options?: { recursive?: boolean }): Promise<void>;
  entries(): AsyncIterableIterator<
    [string, OpfsFileHandleLike | OpfsDirectoryHandleLike]
  >;
}

export type OpfsRootProvider = () => Promise<OpfsDirectoryHandleLike>;

function isNotFoundError(err: unknown): boolean {
  return (
    err instanceof Error &&
    (err.name === "NotFoundError" || err.message.includes("NotFoundError"))
  );
}

function isTypeMismatchError(err: unknown): boolean {
  return (
    err instanceof Error &&
    (err.name === "TypeMismatchError" ||
      err.message.includes("TypeMismatchError"))
  );
}

export function isOpfsSupported(): boolean {
  return (
    typeof navigator !== "undefined" &&
    typeof navigator.storage?.getDirectory === "function"
  );
}

export async function requestPersistentStorage(): Promise<boolean> {
  if (
    typeof navigator === "undefined" ||
    typeof navigator.storage?.persist !== "function"
  ) {
    return false;
  }
  try {
    return await navigator.storage.persist();
  } catch {
    return false;
  }
}

/**
 * OPFS-backed virtual filesystem.
 *
 * Maps:
 *   /home/<username>/... -> OPFS /users/<userId>/home/...
 *   /tmp/...             -> ephemeral in-memory FS (cleared on every visit)
 *   /, /home             -> virtual root containers
 */
export class OpfsFileSystem implements VirtualFileSystem {
  readonly homeDir: string;
  readonly isPersistent = true;
  private readonly userId: string;
  private readonly getRoot: OpfsRootProvider;
  private readonly tmpFs: MemoryFileSystem;
  private homeHandle: OpfsDirectoryHandleLike | null = null;

  constructor(
    userId: string,
    username: string,
    getRoot?: OpfsRootProvider,
  ) {
    this.userId = userId;
    this.homeDir = `/home/${username}`;
    this.tmpFs = new MemoryFileSystem(username);
    this.getRoot =
      getRoot ??
      (async () =>
        (await navigator.storage.getDirectory()) as unknown as OpfsDirectoryHandleLike);
  }

  async init(): Promise<void> {
    await this.tmpFs.init();
    const root = await this.getRoot();
    const usersDir = await root.getDirectoryHandle("users", { create: true });
    const userDir = await usersDir.getDirectoryHandle(this.userId, {
      create: true,
    });
    // Ensure any legacy /users/<id>/tmp directory is cleared each visit
    try {
      await userDir.removeEntry("tmp", { recursive: true });
    } catch {
      // Ignore if not present
    }
    const homeDir = await userDir.getDirectoryHandle("home", { create: true });
    await homeDir.getDirectoryHandle("challenges", { create: true });
    this.homeHandle = homeDir;
  }

  async reset(): Promise<void> {
    await this.tmpFs.reset();
    const root = await this.getRoot();
    const usersDir = await root.getDirectoryHandle("users", { create: true });
    const userDir = await usersDir.getDirectoryHandle(this.userId, {
      create: true,
    });
    try {
      await userDir.removeEntry("home", { recursive: true });
    } catch {
      // Ignore if not present
    }
    const homeDir = await userDir.getDirectoryHandle("home", { create: true });
    await homeDir.getDirectoryHandle("challenges", { create: true });
    this.homeHandle = homeDir;
  }

  private getHomeHandle(): OpfsDirectoryHandleLike {
    if (!this.homeHandle) {
      throw new Error("Filesystem not initialized");
    }
    return this.homeHandle;
  }

  private classify(
    path: string,
  ):
    | { area: "root" }
    | { area: "home-parent" }
    | { area: "home"; relSegments: string[] }
    | { area: "tmp"; path: string }
    | { area: "outside" } {
    const normalized = normalizePath(path);
    if (normalized === "/") return { area: "root" };
    if (normalized === "/home") return { area: "home-parent" };
    if (normalized === "/tmp" || normalized.startsWith("/tmp/")) {
      return { area: "tmp", path: normalized };
    }
    if (normalized === this.homeDir) {
      return { area: "home", relSegments: [] };
    }
    if (normalized.startsWith(`${this.homeDir}/`)) {
      const rel = normalized.slice(this.homeDir.length);
      return { area: "home", relSegments: splitPathSegments(rel) };
    }
    return { area: "outside" };
  }

  private async resolveOpfsHandle(
    relSegments: string[],
  ): Promise<OpfsDirectoryHandleLike | OpfsFileHandleLike | null> {
    let current: OpfsDirectoryHandleLike = this.getHomeHandle();
    for (let i = 0; i < relSegments.length; i++) {
      const seg = relSegments[i];
      const isLast = i === relSegments.length - 1;
      try {
        current = await current.getDirectoryHandle(seg);
      } catch (err) {
        if (isLast && isTypeMismatchError(err)) {
          try {
            return await current.getFileHandle(seg);
          } catch {
            return null;
          }
        }
        if (isNotFoundError(err) || isTypeMismatchError(err)) {
          return null;
        }
        throw err;
      }
    }
    return current;
  }

  private async resolveOpfsParent(
    relSegments: string[],
    createParents = false,
  ): Promise<{ parent: OpfsDirectoryHandleLike; name: string }> {
    if (relSegments.length === 0) {
      throw new Error("Cannot operate on home root");
    }
    let current: OpfsDirectoryHandleLike = this.getHomeHandle();
    for (let i = 0; i < relSegments.length - 1; i++) {
      try {
        current = await current.getDirectoryHandle(relSegments[i], {
          create: createParents,
        });
      } catch {
        throw new Error(`No such file or directory: ${this.homeDir}/${relSegments.slice(0, i + 1).join("/")}`);
      }
    }
    return { parent: current, name: relSegments[relSegments.length - 1] };
  }

  async exists(path: string): Promise<boolean> {
    return (await this.stat(path)) !== null;
  }

  async stat(path: string): Promise<FsEntryStat | null> {
    const normalized = normalizePath(path);
    const kind = this.classify(normalized);

    if (kind.area === "root") {
      return { name: "/", path: "/", type: "dir", size: 2, mtime: Date.now() };
    }
    if (kind.area === "home-parent") {
      return {
        name: "home",
        path: "/home",
        type: "dir",
        size: 1,
        mtime: Date.now(),
      };
    }
    if (kind.area === "tmp") {
      return this.tmpFs.stat(kind.path);
    }
    if (kind.area === "outside") {
      return null;
    }

    const handle = await this.resolveOpfsHandle(kind.relSegments);
    if (!handle) return null;

    if (handle.kind === "directory") {
      return {
        name: basename(normalized),
        path: normalized,
        type: "dir",
        size: 0,
        mtime: Date.now(),
      };
    }

    const file = await handle.getFile();
    return {
      name: basename(normalized),
      path: normalized,
      type: "file",
      size: file.size,
      mtime: file.lastModified || Date.now(),
    };
  }

  async listDir(path: string): Promise<FsEntryStat[]> {
    const normalized = normalizePath(path);
    const kind = this.classify(normalized);

    if (kind.area === "root") {
      return [
        { name: "home", path: "/home", type: "dir", size: 1, mtime: Date.now() },
        { name: "tmp", path: "/tmp", type: "dir", size: 0, mtime: Date.now() },
      ];
    }
    if (kind.area === "home-parent") {
      return [
        {
          name: basename(this.homeDir),
          path: this.homeDir,
          type: "dir",
          size: 0,
          mtime: Date.now(),
        },
      ];
    }
    if (kind.area === "tmp") {
      return this.tmpFs.listDir(kind.path);
    }
    if (kind.area === "outside") {
      throw new Error(`No such file or directory: ${normalized}`);
    }

    const handle = await this.resolveOpfsHandle(kind.relSegments);
    if (!handle) {
      throw new Error(`No such file or directory: ${normalized}`);
    }
    if (handle.kind !== "directory") {
      throw new Error(`Not a directory: ${normalized}`);
    }

    const entries: FsEntryStat[] = [];
    for await (const [name, child] of handle.entries()) {
      const childPath = `${normalized}/${name}`;
      if (child.kind === "directory") {
        entries.push({
          name,
          path: childPath,
          type: "dir",
          size: 0,
          mtime: Date.now(),
        });
      } else {
        const file = await child.getFile();
        entries.push({
          name,
          path: childPath,
          type: "file",
          size: file.size,
          mtime: file.lastModified || Date.now(),
        });
      }
    }

    entries.sort((a, b) => a.name.localeCompare(b.name));
    return entries;
  }

  async readFile(path: string): Promise<Uint8Array> {
    const normalized = normalizePath(path);
    const kind = this.classify(normalized);

    if (kind.area === "tmp") {
      return this.tmpFs.readFile(kind.path);
    }
    if (kind.area !== "home") {
      if (kind.area === "root" || kind.area === "home-parent") {
        throw new Error(`Is a directory: ${normalized}`);
      }
      throw new Error(`No such file or directory: ${normalized}`);
    }

    const handle = await this.resolveOpfsHandle(kind.relSegments);
    if (!handle) {
      throw new Error(`No such file or directory: ${normalized}`);
    }
    if (handle.kind !== "file") {
      throw new Error(`Is a directory: ${normalized}`);
    }
    const file = await handle.getFile();
    return new Uint8Array(await file.arrayBuffer());
  }

  async writeFile(path: string, data: Uint8Array): Promise<void> {
    const normalized = normalizePath(path);
    const kind = this.classify(normalized);

    if (kind.area === "tmp") {
      await this.tmpFs.writeFile(kind.path, data);
      return;
    }
    if (kind.area !== "home" || kind.relSegments.length === 0) {
      throw new Error(`Permission denied: ${normalized}`);
    }

    const existing = await this.resolveOpfsHandle(kind.relSegments);
    if (existing && existing.kind === "directory") {
      throw new Error(`Is a directory: ${normalized}`);
    }

    const { parent, name } = await this.resolveOpfsParent(kind.relSegments);
    const fileHandle = await parent.getFileHandle(name, { create: true });
    const writable = await fileHandle.createWritable();
    await writable.write(new Uint8Array(data));
    await writable.close();
  }

  async appendFile(path: string, data: Uint8Array): Promise<void> {
    const existing = await this.stat(path);
    if (!existing) {
      await this.writeFile(path, data);
      return;
    }
    if (existing.type !== "file") {
      throw new Error(`Is a directory: ${normalizePath(path)}`);
    }
    const prev = await this.readFile(path);
    const combined = new Uint8Array(prev.byteLength + data.byteLength);
    combined.set(prev, 0);
    combined.set(data, prev.byteLength);
    await this.writeFile(path, combined);
  }

  async mkdir(path: string, recursive = false): Promise<void> {
    const normalized = normalizePath(path);
    const kind = this.classify(normalized);

    if (kind.area === "tmp") {
      await this.tmpFs.mkdir(kind.path, recursive);
      return;
    }
    if (kind.area === "root" || kind.area === "home-parent") {
      if (recursive) return;
      throw new Error(`File exists: ${normalized}`);
    }
    if (kind.area !== "home") {
      throw new Error(`Permission denied: ${normalized}`);
    }
    if (kind.relSegments.length === 0) {
      if (recursive) return;
      throw new Error(`File exists: ${normalized}`);
    }

    const existing = await this.resolveOpfsHandle(kind.relSegments);
    if (existing) {
      if (recursive && existing.kind === "directory") return;
      throw new Error(`File exists: ${normalized}`);
    }

    const { parent, name } = await this.resolveOpfsParent(
      kind.relSegments,
      recursive,
    );
    await parent.getDirectoryHandle(name, { create: true });
  }

  async remove(path: string, recursive = false): Promise<void> {
    const normalized = normalizePath(path);
    const kind = this.classify(normalized);

    if (
      kind.area === "root" ||
      kind.area === "home-parent" ||
      (kind.area === "home" && kind.relSegments.length === 0) ||
      normalized === "/tmp"
    ) {
      throw new Error(`Cannot remove protected directory: ${normalized}`);
    }
    if (kind.area === "tmp") {
      await this.tmpFs.remove(kind.path, recursive);
      return;
    }
    if (kind.area !== "home") {
      throw new Error(`No such file or directory: ${normalized}`);
    }

    const existing = await this.resolveOpfsHandle(kind.relSegments);
    if (!existing) {
      throw new Error(`No such file or directory: ${normalized}`);
    }
    if (existing.kind === "directory" && !recursive) {
      throw new Error(`Is a directory: ${normalized}`);
    }

    const { parent, name } = await this.resolveOpfsParent(kind.relSegments);
    await parent.removeEntry(name, { recursive });
  }

  async copy(src: string, dest: string, recursive = false): Promise<void> {
    const normalizedSrc = normalizePath(src);
    let normalizedDest = normalizePath(dest);
    const srcStat = await this.stat(normalizedSrc);
    if (!srcStat) {
      throw new Error(`No such file or directory: ${normalizedSrc}`);
    }
    if (srcStat.type === "dir" && !recursive) {
      throw new Error(`Omitting directory: ${normalizedSrc}`);
    }

    const destStat = await this.stat(normalizedDest);
    if (destStat && destStat.type === "dir") {
      normalizedDest =
        normalizedDest === "/"
          ? `/${basename(normalizedSrc)}`
          : `${normalizedDest}/${basename(normalizedSrc)}`;
    }

    if (
      srcStat.type === "dir" &&
      (normalizedDest === normalizedSrc ||
        normalizedDest.startsWith(`${normalizedSrc}/`))
    ) {
      throw new Error(`Cannot copy directory into itself: ${normalizedSrc}`);
    }

    if (srcStat.type === "file") {
      const parentStat = await this.stat(dirname(normalizedDest));
      if (!parentStat || parentStat.type !== "dir") {
        throw new Error(`No such file or directory: ${dirname(normalizedDest)}`);
      }
      const bytes = await this.readFile(normalizedSrc);
      await this.writeFile(normalizedDest, bytes);
      return;
    }

    await this.mkdir(normalizedDest, true);
    const entries = await this.listDir(normalizedSrc);
    for (const entry of entries) {
      await this.copy(entry.path, `${normalizedDest}/${entry.name}`, true);
    }
  }

  async move(src: string, dest: string): Promise<void> {
    const normalizedSrc = normalizePath(src);
    let normalizedDest = normalizePath(dest);
    const srcKind = this.classify(normalizedSrc);

    if (
      srcKind.area === "root" ||
      srcKind.area === "home-parent" ||
      (srcKind.area === "home" && srcKind.relSegments.length === 0) ||
      normalizedSrc === "/tmp"
    ) {
      throw new Error(`Cannot move protected directory: ${normalizedSrc}`);
    }

    const srcStat = await this.stat(normalizedSrc);
    if (!srcStat) {
      throw new Error(`No such file or directory: ${normalizedSrc}`);
    }

    const destStat = await this.stat(normalizedDest);
    if (destStat && destStat.type === "dir") {
      normalizedDest =
        normalizedDest === "/"
          ? `/${basename(normalizedSrc)}`
          : `${normalizedDest}/${basename(normalizedSrc)}`;
    }

    if (normalizedDest === normalizedSrc) return;

    await this.copy(normalizedSrc, normalizedDest, true);
    await this.remove(normalizedSrc, true);
  }

  async listAllFiles(): Promise<string[]> {
    const files: string[] = [];

    const walkHome = async (dirPath: string) => {
      const entries = await this.listDir(dirPath);
      for (const entry of entries) {
        if (entry.type === "file") {
          files.push(entry.path);
        } else {
          await walkHome(entry.path);
        }
      }
    };

    await walkHome(this.homeDir);
    const tmpFiles = await this.tmpFs.listAllFiles();
    for (const tmpPath of tmpFiles) {
      if (tmpPath.startsWith("/tmp/")) {
        files.push(tmpPath);
      }
    }

    files.sort((a, b) => a.localeCompare(b));
    return files;
  }
}
