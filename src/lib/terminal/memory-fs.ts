import {
  basename,
  dirname,
  normalizePath,
  splitPathSegments,
} from "@/lib/terminal/path";
import type { FsEntryStat, VirtualFileSystem } from "@/lib/terminal/types";

interface MemoryFileNode {
  type: "file";
  data: Uint8Array;
  mtime: number;
}

interface MemoryDirNode {
  type: "dir";
  children: Map<string, MemoryNode>;
  mtime: number;
}

type MemoryNode = MemoryFileNode | MemoryDirNode;

function createDirNode(): MemoryDirNode {
  return {
    type: "dir",
    children: new Map(),
    mtime: Date.now(),
  };
}

function cloneNode(node: MemoryNode): MemoryNode {
  if (node.type === "file") {
    return {
      type: "file",
      data: new Uint8Array(node.data),
      mtime: Date.now(),
    };
  }
  const copy = createDirNode();
  for (const [name, child] of node.children.entries()) {
    copy.children.set(name, cloneNode(child));
  }
  return copy;
}

export class MemoryFileSystem implements VirtualFileSystem {
  readonly homeDir: string;
  readonly isPersistent = false;
  private root: MemoryDirNode = createDirNode();

  constructor(username: string) {
    this.homeDir = `/home/${username}`;
  }

  async init(): Promise<void> {
    this.ensureBaseLayout();
  }

  async reset(): Promise<void> {
    this.root = createDirNode();
    this.ensureBaseLayout();
  }

  private ensureBaseLayout(): void {
    this.mkdirSync("/home");
    this.mkdirSync(this.homeDir);
    this.mkdirSync(`${this.homeDir}/challenges`);
    this.mkdirSync("/tmp");
  }

  private mkdirSync(path: string): void {
    const segments = splitPathSegments(path);
    let current = this.root;
    for (const seg of segments) {
      const existing = current.children.get(seg);
      if (!existing) {
        const created = createDirNode();
        current.children.set(seg, created);
        current = created;
      } else if (existing.type === "dir") {
        current = existing;
      } else {
        throw new Error(`Not a directory: ${path}`);
      }
    }
  }

  private getNode(path: string): MemoryNode | null {
    const segments = splitPathSegments(path);
    let current: MemoryNode = this.root;
    for (const seg of segments) {
      if (current.type !== "dir") return null;
      const next = current.children.get(seg);
      if (!next) return null;
      current = next;
    }
    return current;
  }

  private getParentDir(path: string): { parent: MemoryDirNode; name: string } {
    const normalized = normalizePath(path);
    if (normalized === "/") {
      throw new Error("Cannot operate on root directory");
    }
    const parentPath = dirname(normalized);
    const parentNode = this.getNode(parentPath);
    if (!parentNode) {
      throw new Error(`No such file or directory: ${parentPath}`);
    }
    if (parentNode.type !== "dir") {
      throw new Error(`Not a directory: ${parentPath}`);
    }
    return { parent: parentNode, name: basename(normalized) };
  }

  private isProtectedPath(path: string): boolean {
    const normalized = normalizePath(path);
    return (
      normalized === "/" ||
      normalized === "/home" ||
      normalized === this.homeDir ||
      normalized === "/tmp"
    );
  }

  private isWritablePath(path: string): boolean {
    const normalized = normalizePath(path);
    return (
      normalized.startsWith(`${this.homeDir}/`) ||
      normalized.startsWith("/tmp/")
    );
  }

  private assertWritablePath(path: string): void {
    const normalized = normalizePath(path);
    if (!this.isWritablePath(normalized)) {
      throw new Error(`Permission denied: ${normalized}`);
    }
  }

  async exists(path: string): Promise<boolean> {
    return this.getNode(path) !== null;
  }

  async stat(path: string): Promise<FsEntryStat | null> {
    const normalized = normalizePath(path);
    const node = this.getNode(normalized);
    if (!node) return null;
    return {
      name: basename(normalized),
      path: normalized,
      type: node.type,
      size: node.type === "file" ? node.data.byteLength : node.children.size,
      mtime: node.mtime,
    };
  }

  async listDir(path: string): Promise<FsEntryStat[]> {
    const normalized = normalizePath(path);
    const node = this.getNode(normalized);
    if (!node) {
      throw new Error(`No such file or directory: ${normalized}`);
    }
    if (node.type !== "dir") {
      throw new Error(`Not a directory: ${normalized}`);
    }

    const entries: FsEntryStat[] = [];
    for (const [name, child] of node.children.entries()) {
      const childPath = normalized === "/" ? `/${name}` : `${normalized}/${name}`;
      entries.push({
        name,
        path: childPath,
        type: child.type,
        size: child.type === "file" ? child.data.byteLength : child.children.size,
        mtime: child.mtime,
      });
    }

    entries.sort((a, b) => a.name.localeCompare(b.name));
    return entries;
  }

  async readFile(path: string): Promise<Uint8Array> {
    const normalized = normalizePath(path);
    const node = this.getNode(normalized);
    if (!node) {
      throw new Error(`No such file or directory: ${normalized}`);
    }
    if (node.type !== "file") {
      throw new Error(`Is a directory: ${normalized}`);
    }
    return new Uint8Array(node.data);
  }

  async writeFile(path: string, data: Uint8Array): Promise<void> {
    const normalized = normalizePath(path);
    this.assertWritablePath(normalized);
    const { parent, name } = this.getParentDir(normalized);
    const existing = parent.children.get(name);
    if (existing && existing.type === "dir") {
      throw new Error(`Is a directory: ${normalized}`);
    }
    parent.children.set(name, {
      type: "file",
      data: new Uint8Array(data),
      mtime: Date.now(),
    });
    parent.mtime = Date.now();
  }

  async appendFile(path: string, data: Uint8Array): Promise<void> {
    const normalized = normalizePath(path);
    this.assertWritablePath(normalized);
    const existing = this.getNode(normalized);
    if (!existing) {
      await this.writeFile(normalized, data);
      return;
    }
    if (existing.type !== "file") {
      throw new Error(`Is a directory: ${normalized}`);
    }
    const combined = new Uint8Array(existing.data.byteLength + data.byteLength);
    combined.set(existing.data, 0);
    combined.set(data, existing.data.byteLength);
    existing.data = combined;
    existing.mtime = Date.now();
  }

  async mkdir(path: string, recursive = false): Promise<void> {
    const normalized = normalizePath(path);
    if (
      normalized === "/" ||
      normalized === "/home" ||
      normalized === this.homeDir ||
      normalized === "/tmp"
    ) {
      if (recursive) return;
      throw new Error(`File exists: ${normalized}`);
    }

    this.assertWritablePath(normalized);

    if (recursive) {
      this.mkdirSync(normalized);
      return;
    }

    const { parent, name } = this.getParentDir(normalized);
    if (parent.children.has(name)) {
      throw new Error(`File exists: ${normalized}`);
    }
    parent.children.set(name, createDirNode());
    parent.mtime = Date.now();
  }

  async remove(path: string, recursive = false): Promise<void> {
    const normalized = normalizePath(path);
    if (this.isProtectedPath(normalized)) {
      throw new Error(`Cannot remove protected directory: ${normalized}`);
    }
    const { parent, name } = this.getParentDir(normalized);
    const target = parent.children.get(name);
    if (!target) {
      throw new Error(`No such file or directory: ${normalized}`);
    }
    if (target.type === "dir" && !recursive) {
      throw new Error(`Is a directory: ${normalized}`);
    }
    parent.children.delete(name);
    parent.mtime = Date.now();
  }

  async copy(src: string, dest: string, recursive = false): Promise<void> {
    const normalizedSrc = normalizePath(src);
    let normalizedDest = normalizePath(dest);
    const srcNode = this.getNode(normalizedSrc);
    if (!srcNode) {
      throw new Error(`No such file or directory: ${normalizedSrc}`);
    }
    if (srcNode.type === "dir" && !recursive) {
      throw new Error(`Omitting directory: ${normalizedSrc}`);
    }

    const existingDest = this.getNode(normalizedDest);
    if (existingDest && existingDest.type === "dir") {
      normalizedDest =
        normalizedDest === "/"
          ? `/${basename(normalizedSrc)}`
          : `${normalizedDest}/${basename(normalizedSrc)}`;
    }

    if (
      srcNode.type === "dir" &&
      (normalizedDest === normalizedSrc ||
        normalizedDest.startsWith(`${normalizedSrc}/`))
    ) {
      throw new Error(`Cannot copy directory into itself: ${normalizedSrc}`);
    }

    this.assertWritablePath(normalizedDest);

    const { parent, name } = this.getParentDir(normalizedDest);
    const destTarget = parent.children.get(name);
    if (destTarget && destTarget.type === "dir" && srcNode.type === "file") {
      throw new Error(`Is a directory: ${normalizedDest}`);
    }

    parent.children.set(name, cloneNode(srcNode));
    parent.mtime = Date.now();
  }

  async move(src: string, dest: string): Promise<void> {
    const normalizedSrc = normalizePath(src);
    let normalizedDest = normalizePath(dest);
    if (this.isProtectedPath(normalizedSrc)) {
      throw new Error(`Cannot move protected directory: ${normalizedSrc}`);
    }

    const srcNode = this.getNode(normalizedSrc);
    if (!srcNode) {
      throw new Error(`No such file or directory: ${normalizedSrc}`);
    }

    const existingDest = this.getNode(normalizedDest);
    if (existingDest && existingDest.type === "dir") {
      normalizedDest =
        normalizedDest === "/"
          ? `/${basename(normalizedSrc)}`
          : `${normalizedDest}/${basename(normalizedSrc)}`;
    }

    if (normalizedDest === normalizedSrc) return;

    if (
      srcNode.type === "dir" &&
      normalizedDest.startsWith(`${normalizedSrc}/`)
    ) {
      throw new Error(`Cannot move directory into itself: ${normalizedSrc}`);
    }

    this.assertWritablePath(normalizedDest);

    const { parent: destParent, name: destName } =
      this.getParentDir(normalizedDest);
    const { parent: srcParent, name: srcName } =
      this.getParentDir(normalizedSrc);

    destParent.children.set(destName, srcNode);
    destParent.mtime = Date.now();
    srcParent.children.delete(srcName);
    srcParent.mtime = Date.now();
  }

  async listAllFiles(): Promise<string[]> {
    const results: string[] = [];
    const walk = (node: MemoryNode, currentPath: string) => {
      if (node.type === "file") {
        results.push(currentPath);
        return;
      }
      const names = [...node.children.keys()].sort((a, b) => a.localeCompare(b));
      for (const name of names) {
        const child = node.children.get(name);
        if (!child) continue;
        const nextPath = currentPath === "/" ? `/${name}` : `${currentPath}/${name}`;
        walk(child, nextPath);
      }
    };
    walk(this.root, "/");
    return results;
  }
}
