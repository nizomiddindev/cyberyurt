import { beforeEach, describe, expect, it } from "vitest";
import { expandTrSet } from "@/lib/terminal/commands/transform";
import { MemoryFileSystem } from "@/lib/terminal/memory-fs";
import { ShellSession } from "@/lib/terminal/shell";
import { decodeText } from "@/lib/terminal/types";

async function createShell(): Promise<ShellSession> {
  const fs = new MemoryFileSystem("ali");
  await fs.init();
  return new ShellSession({ fs, username: "ali", allowedOrigin: "http://localhost:3000" });
}

async function run(shell: ShellSession, cmd: string) {
  const r = await shell.execute(cmd);
  return { out: decodeText(r.stdout), err: r.stderr, code: r.exitCode };
}

describe("rev", () => {
  let shell: ShellSession;
  beforeEach(async () => {
    shell = await createShell();
  });

  it("reverses every line from stdin", async () => {
    expect((await run(shell, "echo salom | rev")).out).toBe("molas\n");
    const multi = await run(shell, 'echo -e "abc\\nxyz" | rev');
    expect(multi.out).toBe("cba\nzyx\n");
  });

  it("reverses lines of a file and keeps Uzbek letters whole", async () => {
    await run(shell, "echo o‘zbek > a.txt");
    expect((await run(shell, "rev a.txt")).out).toBe("kebz‘o\n");
  });

  it("reports missing files and bad options", async () => {
    const missing = await run(shell, "rev nope.txt");
    expect(missing.code).not.toBe(0);
    expect(missing.err).toContain("rev: nope.txt");
    expect((await run(shell, "rev -x")).code).not.toBe(0);
  });
});

describe("tr", () => {
  let shell: ShellSession;
  beforeEach(async () => {
    shell = await createShell();
  });

  it("translates ranges (ROT13 round trip)", async () => {
    const rot = await run(shell, "echo Salom | tr A-Za-z N-ZA-Mn-za-m");
    expect(rot.out).toBe("Fnybz\n");
    const back = await run(shell, "echo Fnybz | tr A-Za-z N-ZA-Mn-za-m");
    expect(back.out).toBe("Salom\n");
  });

  it("turns base64url into base64 (JWT payload use case)", async () => {
    expect((await run(shell, "echo ab-_cd | tr _- /+")).out).toBe("ab+/cd\n");
  });

  it("supports classes, -d and -s", async () => {
    expect((await run(shell, "echo salom | tr [:lower:] [:upper:]")).out).toBe("SALOM\n");
    expect((await run(shell, "echo a1b2c3 | tr -d 0-9")).out).toBe("abc\n");
    expect((await run(shell, "echo aaabbb | tr -s ab")).out).toBe("ab\n");
    expect((await run(shell, 'echo "a  b" | tr -s " " _')).out).toBe("a_b\n");
  });

  it("pads SET2 with its last character like GNU tr", async () => {
    expect((await run(shell, "echo abc | tr abc x")).out).toBe("xxx\n");
  });

  it("gives clear errors instead of crashing", async () => {
    expect((await run(shell, "echo a | tr")).err).toContain("missing operand");
    expect((await run(shell, "echo a | tr a")).err).toContain("missing operand");
    expect((await run(shell, "echo a | tr -d a b")).err).toContain("extra operand");
    expect((await run(shell, "echo a | tr z-a b")).err).toContain("reverse collating");
  });

  it("expands escapes", () => {
    expect(expandTrSet("\\n\\t")).toEqual(["\n", "\t"]);
  });
});

describe("base64 -d without padding (GNU behaviour)", () => {
  it("still prints the decoded text, then warns and exits 1", async () => {
    const shell = await createShell();
    const r = await run(shell, "echo S0lCRVJ7YjY0fQ | base64 -d");
    expect(r.out).toBe("KIBER{b64}");
    expect(r.err).toBe("base64: invalid input\n");
    expect(r.code).toBe(1);
  });

  it("decodes a JWT payload after tr _- /+", async () => {
    const shell = await createShell();
    // {"user":"ali"} in base64url without padding
    const r = await run(shell, "echo eyJ1c2VyIjoiYWxpIn0 | tr _- /+ | base64 -d");
    expect(r.out).toBe('{"user":"ali"}');
  });
});
