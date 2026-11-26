import { describe, expect, it } from "vitest";
import {
  OpfsFileSystem,
  type OpfsDirectoryHandleLike,
  type OpfsFileHandleLike,
} from "@/lib/terminal/opfs-fs";
import { decodeText, encodeText } from "@/lib/terminal/types";

function makeError(name: string, message: string): Error {
  const err = new Error(message);
  err.name = name;
  return err;
}

class MockOpfsFileHandle implements OpfsFileHandleLike {
  readonly kind = "file" as const;
  private bytes = new Uint8Array(0);
  private lastModified = Date.now();

  constructor(readonly name: string) {}

  async getFile() {
    const copy = new Uint8Array(this.bytes);
    return {
      size: copy.byteLength,
      lastModified: this.lastModified,
      arrayBuffer: async () => copy.buffer as ArrayBuffer,
    };
  }

  async createWritable() {
    let nextBytes = new Uint8Array(0);
    return {
      write: async (data: Uint8Array | ArrayBuffer) => {
        nextBytes =
          data instanceof Uint8Array
            ? new Uint8Array(data)
            : new Uint8Array(data);
      },
      close: async () => {
        this.bytes = nextBytes;
        this.lastModified = Date.now();
      },
    };
  }
}

class MockOpfsDirectoryHandle implements OpfsDirectoryHandleLike {
  readonly kind = "directory" as const;
  readonly map = new Map<string, MockOpfsDirectoryHandle | MockOpfsFileHandle>();

  constructor(readonly name: string) {}

  async getDirectoryHandle(
    name: string,
    options?: { create?: boolean },
  ): Promise<OpfsDirectoryHandleLike> {
    const existing = this.map.get(name);
    if (existing) {
      if (existing.kind !== "directory") {
        throw makeError("TypeMismatchError", `${name} is a file`);
      }
      return existing;
    }
    if (options?.create) {
      const dir = new MockOpfsDirectoryHandle(name);
      this.map.set(name, dir);
      return dir;
    }
    throw makeError("NotFoundError", `${name} not found`);
  }

  async getFileHandle(
    name: string,
    options?: { create?: boolean },
  ): Promise<OpfsFileHandleLike> {
    const existing = this.map.get(name);
    if (existing) {
      if (existing.kind !== "file") {
        throw makeError("TypeMismatchError", `${name} is a directory`);
      }
      return existing;
    }
    if (options?.create) {
      const file = new MockOpfsFileHandle(name);
      this.map.set(name, file);
      return file;
    }
    throw makeError("NotFoundError", `${name} not found`);
  }

  async removeEntry(
    name: string,
    options?: { recursive?: boolean },
  ): Promise<void> {
    const existing = this.map.get(name);
    if (!existing) {
      throw makeError("NotFoundError", `${name} not found`);
    }
    if (
      existing.kind === "directory" &&
      existing.map.size > 0 &&
      !options?.recursive
    ) {
      throw makeError("InvalidModificationError", `${name} not empty`);
    }
    this.map.delete(name);
  }

  async *entries(): AsyncIterableIterator<
    [string, OpfsFileHandleLike | OpfsDirectoryHandleLike]
  > {
    for (const [k, v] of this.map.entries()) {
      yield [k, v];
    }
  }
}

describe("OpfsFileSystem", () => {
  it("isolates users by Supabase user ID under /users/<id>/ and keeps files when username changes", async () => {
    const root = new MockOpfsDirectoryHandle("");
    const getRoot = async () => root;

    const studentA = new OpfsFileSystem("uid-111", "ali", getRoot);
    await studentA.init();
    await studentA.writeFile("/home/ali/secret.txt", encodeText("ali-only"));

    // Different student on the same browser sees NONE of studentA's files
    const studentB = new OpfsFileSystem("uid-222", "vali", getRoot);
    await studentB.init();
    expect(await studentB.exists("/home/vali/secret.txt")).toBe(false);
    expect(await studentB.exists("/home/ali/secret.txt")).toBe(false);

    // Verify underlying OPFS path uses /users/<userId>/
    const usersDir = root.map.get("users") as MockOpfsDirectoryHandle;
    expect(usersDir.map.has("uid-111")).toBe(true);
    expect(usersDir.map.has("uid-222")).toBe(true);

    // Renaming studentA's username keeps their files under /home/<new-username>
    const studentARenamed = new OpfsFileSystem("uid-111", "ali_new", getRoot);
    await studentARenamed.init();
    expect(
      decodeText(await studentARenamed.readFile("/home/ali_new/secret.txt")),
    ).toBe("ali-only");
  });

  it("creates ~/challenges by default and clears /tmp on each new visit", async () => {
    const root = new MockOpfsDirectoryHandle("");
    const getRoot = async () => root;

    const visit1 = new OpfsFileSystem("uid-111", "ali", getRoot);
    await visit1.init();
    expect(await visit1.exists("/home/ali/challenges")).toBe(true);

    await visit1.writeFile("/home/ali/keep.txt", encodeText("persisted"));
    await visit1.writeFile("/tmp/scratch.txt", encodeText("ephemeral"));
    expect(decodeText(await visit1.readFile("/tmp/scratch.txt"))).toBe(
      "ephemeral",
    );

    // New visit: home persists, /tmp is empty
    const visit2 = new OpfsFileSystem("uid-111", "ali", getRoot);
    await visit2.init();
    expect(decodeText(await visit2.readFile("/home/ali/keep.txt"))).toBe(
      "persisted",
    );
    expect(await visit2.exists("/tmp/scratch.txt")).toBe(false);
  });

  it("resets only the active user's files and preserves binary bytes", async () => {
    const root = new MockOpfsDirectoryHandle("");
    const getRoot = async () => root;

    const fsA = new OpfsFileSystem("uid-1", "ali", getRoot);
    const fsB = new OpfsFileSystem("uid-2", "vali", getRoot);
    await fsA.init();
    await fsB.init();

    const binary = new Uint8Array([0x00, 0xff, 0x89, 0x50, 0x4e, 0x47]);
    await fsA.writeFile("/home/ali/bin.dat", binary);
    await fsB.writeFile("/home/vali/keep.txt", encodeText("still here"));

    expect(await fsA.readFile("/home/ali/bin.dat")).toEqual(binary);

    await fsA.reset();
    expect(await fsA.exists("/home/ali/bin.dat")).toBe(false);
    expect(await fsA.exists("/home/ali/challenges")).toBe(true);

    // User B is untouched
    expect(decodeText(await fsB.readFile("/home/vali/keep.txt"))).toBe(
      "still here",
    );
  });
});
