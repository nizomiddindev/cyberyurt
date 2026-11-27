import { describe, expect, it } from "vitest";
import { isAllowedWgetUrl } from "@/lib/terminal/commands/network";
import {
  getTotalStorageBytes,
  MAX_TOTAL_STORAGE_BYTES,
  MAX_UPLOAD_FILE_BYTES,
  validateUploadSizes,
} from "@/lib/terminal/limits";
import { MemoryFileSystem } from "@/lib/terminal/memory-fs";
import {
  OpfsFileSystem,
  type OpfsDirectoryHandleLike,
  type OpfsFileHandleLike,
} from "@/lib/terminal/opfs-fs";
import { ShellSession } from "@/lib/terminal/shell";
import { decodeText, encodeText } from "@/lib/terminal/types";

function makeError(name: string, message: string): Error {
  const err = new Error(message);
  err.name = name;
  return err;
}

class MockOpfsFileHandle implements OpfsFileHandleLike {
  readonly kind = "file" as const;
  private bytes = new Uint8Array(0);

  constructor(readonly name: string) {}

  async getFile() {
    const copy = new Uint8Array(this.bytes);
    return {
      size: copy.byteLength,
      lastModified: Date.now(),
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
    if (!existing) throw makeError("NotFoundError", `${name} not found`);
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

describe("Upload size limits (5 MB per file, 50 MB total)", () => {
  it("rejects files over 5 MB before reading them", () => {
    expect(
      validateUploadSizes(
        [{ name: "big.bin", size: MAX_UPLOAD_FILE_BYTES + 1 }],
        0,
      ),
    ).toEqual({ ok: false, reason: "fileTooLarge", fileName: "big.bin" });

    expect(
      validateUploadSizes([{ name: "exact.bin", size: MAX_UPLOAD_FILE_BYTES }], 0),
    ).toEqual({ ok: true });
  });

  it("rejects uploads that would push total user storage over 50 MB", async () => {
    expect(
      validateUploadSizes(
        [{ name: "extra.bin", size: 2 * 1024 * 1024 }],
        MAX_TOTAL_STORAGE_BYTES - 1024 * 1024,
      ),
    ).toEqual({ ok: false, reason: "totalQuotaExceeded" });

    const fs = new MemoryFileSystem("ali");
    await fs.init();
    await fs.writeFile("/home/ali/a.txt", encodeText("hello"));
    expect(await getTotalStorageBytes(fs)).toBe(5);
  });
});

describe("Path-escape resistance (MemoryFileSystem & OpfsFileSystem)", () => {
  async function assertPathEscapesBlocked(shell: ShellSession) {
    await shell.fs.writeFile("/home/ali/a", encodeText("mine"));

    // 1. cd ../../.. clamps at / and cannot escape root
    await shell.execute("cd ../../..");
    expect(shell.getCwd()).toBe("/");
    await shell.execute("cd ~");

    // 2. cat /users/<other-id>/x fails and leaks nothing
    const catOther = await shell.execute("cat /users/uid-other/x");
    expect(catOther.exitCode).not.toBe(0);
    expect(decodeText(catOther.stdout)).toBe("");

    const catOtherHome = await shell.execute("cat /users/uid-other/home/x");
    expect(catOtherHome.exitCode).not.toBe(0);
    expect(decodeText(catOtherHome.stdout)).toBe("");

    // 3. cp ~/a ../../../x fails and writes nothing outside /home/ali
    const cpEscape = await shell.execute("cp ~/a ../../../x");
    expect(cpEscape.exitCode).not.toBe(0);
    expect(await shell.fs.exists("/x")).toBe(false);

    // 4. echo hi > /home/otheruser/x fails and writes nothing outside /home/ali
    const redirOther = await shell.execute("echo hi > /home/otheruser/x");
    expect(redirOther.exitCode).not.toBe(0);
    expect(await shell.fs.exists("/home/otheruser/x")).toBe(false);

    // 5. mv a / fails, leaves ~/a intact, writes nothing in /
    const mvRoot = await shell.execute("mv a /");
    expect(mvRoot.exitCode).not.toBe(0);
    expect(await shell.fs.exists("/a")).toBe(false);
    expect(decodeText(await shell.fs.readFile("/home/ali/a"))).toBe("mine");

    // 6. Direct upload/write while cwd is "/" fails cleanly
    await expect(
      shell.fs.writeFile("/upload.txt", encodeText("nope")),
    ).rejects.toThrow(/Permission denied/i);
  }

  it("blocks all path-escape attempts on MemoryFileSystem", async () => {
    const fs = new MemoryFileSystem("ali");
    await fs.init();
    const shell = new ShellSession({ fs, username: "ali" });
    await assertPathEscapesBlocked(shell);
  });

  it("blocks all path-escape attempts on OpfsFileSystem and protects other users", async () => {
    const root = new MockOpfsDirectoryHandle("");
    const getRoot = async () => root;

    const otherFs = new OpfsFileSystem("uid-other", "otheruser", getRoot);
    await otherFs.init();
    await otherFs.writeFile("/home/otheruser/x", encodeText("top-secret"));

    const aliFs = new OpfsFileSystem("uid-ali", "ali", getRoot);
    await aliFs.init();
    const shell = new ShellSession({ fs: aliFs, username: "ali" });

    await assertPathEscapesBlocked(shell);

    // Confirm other user's OPFS file is completely untouched
    expect(decodeText(await otherFs.readFile("/home/otheruser/x"))).toBe(
      "top-secret",
    );
  });
});

describe("wget HTTPS-only & URL-spoofing protection", () => {
  it("blocks evil.com/cyberyurt.com, user@host spoofing, and plain http://cyberyurt.com", () => {
    const prodOrigin = "https://cyberyurt.com";
    const devOrigin = "http://localhost:3000";

    // Path-spoofing
    expect(
      isAllowedWgetUrl("https://evil.com/cyberyurt.com", prodOrigin).allowed,
    ).toBe(false);
    expect(
      isAllowedWgetUrl("https://evil.com/cyberyurt.com", devOrigin).allowed,
    ).toBe(false);

    // Userinfo (@) spoofing
    expect(
      isAllowedWgetUrl("https://cyberyurt.com@evil.com/flag.txt", prodOrigin)
        .allowed,
    ).toBe(false);
    expect(
      isAllowedWgetUrl("https://cyberyurt.com@evil.com/flag.txt", devOrigin)
        .allowed,
    ).toBe(false);

    // Plain http:// to production domain MUST be blocked even in dev
    expect(
      isAllowedWgetUrl("http://cyberyurt.com/flag.txt", prodOrigin).allowed,
    ).toBe(false);
    expect(
      isAllowedWgetUrl("http://cyberyurt.com/flag.txt", devOrigin).allowed,
    ).toBe(false);

    // Protocol-relative URL must be blocked
    expect(
      isAllowedWgetUrl("//evil.com/flag.txt", devOrigin).allowed,
    ).toBe(false);

    // http://localhost is blocked when allowedOrigin is https://cyberyurt.com
    expect(
      isAllowedWgetUrl("http://localhost:3000/file.txt", prodOrigin).allowed,
    ).toBe(false);
  });

  it("allows https://cyberyurt.com and http://localhost only when origin is http://localhost", () => {
    expect(
      isAllowedWgetUrl("https://cyberyurt.com/api/challenges/a/files/b", "https://cyberyurt.com")
        .allowed,
    ).toBe(true);

    expect(
      isAllowedWgetUrl("http://localhost:3000/api/challenges/a/files/b", "http://localhost:3000")
        .allowed,
    ).toBe(true);

    expect(
      isAllowedWgetUrl("/api/challenges/a/files/b", "http://localhost:3000")
        .allowed,
    ).toBe(true);
  });
});
