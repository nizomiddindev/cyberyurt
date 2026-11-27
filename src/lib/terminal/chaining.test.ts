import { beforeEach, describe, expect, it } from "vitest";
import { MemoryFileSystem } from "@/lib/terminal/memory-fs";
import { ShellSession } from "@/lib/terminal/shell";
import { decodeText, encodeText } from "@/lib/terminal/types";

describe("Shell command chaining (&&, ||, ;)", () => {
  let shell: ShellSession;

  beforeEach(async () => {
    const fs = new MemoryFileSystem("ali");
    await fs.init();
    shell = new ShellSession({ fs, username: "ali" });
  });

  it("supports && (runs second command only when first succeeds)", async () => {
    const ok = await shell.execute("ls && cd challenges");
    expect(ok.exitCode).toBe(0);
    expect(decodeText(ok.stdout)).toContain("challenges");
    expect(shell.getCwd()).toBe("/home/ali/challenges");

    const fail = await shell.execute("cat missing.txt && echo should_not_run");
    expect(fail.exitCode).toBe(1);
    expect(decodeText(fail.stdout)).toBe("");
    expect(fail.stderr).toContain("missing.txt");
  });

  it("supports || (runs second command only when first fails)", async () => {
    const fallback = await shell.execute("cat missing.txt || echo recovered");
    expect(fallback.exitCode).toBe(0);
    expect(decodeText(fallback.stdout)).toBe("recovered\n");

    const skipped = await shell.execute("echo ok || echo skipped");
    expect(skipped.exitCode).toBe(0);
    expect(decodeText(skipped.stdout)).toBe("ok\n");
  });

  it("supports ; (always runs next command regardless of exit code) and trailing ;", async () => {
    const res = await shell.execute("cat nope.txt ; echo still_here");
    expect(res.exitCode).toBe(0);
    expect(res.stderr).toContain("nope.txt");
    expect(decodeText(res.stdout)).toBe("still_here\n");

    const trailing = await shell.execute("echo done;");
    expect(trailing.exitCode).toBe(0);
    expect(decodeText(trailing.stdout)).toBe("done\n");
  });

  it("combines chaining with pipes and > / >> redirection", async () => {
    await shell.fs.writeFile(
      "/home/ali/a",
      encodeText("alpha\nxray\nbeta\nbox\n"),
    );

    const res = await shell.execute("cat a | grep x > out.txt && cat out.txt");
    expect(res.exitCode).toBe(0);
    expect(decodeText(res.stdout)).toBe("xray\nbox\n");

    const res2 = await shell.execute(
      "echo extra >> out.txt && cat out.txt | wc -l",
    );
    expect(res2.exitCode).toBe(0);
    expect(decodeText(res2.stdout)).toBe("3\n");
  });

  it("keeps operators literal inside single and double quotes", async () => {
    const dq = await shell.execute('echo "a && b"');
    expect(dq.exitCode).toBe(0);
    expect(decodeText(dq.stdout)).toBe("a && b\n");

    const sq = await shell.execute("echo 'x || y ; z'");
    expect(sq.exitCode).toBe(0);
    expect(decodeText(sq.stdout)).toBe("x || y ; z\n");
  });

  it("applies cd inside a chain to subsequent commands and supports Tab completion", async () => {
    const res = await shell.execute(
      "mkdir work && cd work && echo hi > note.txt && pwd && cat note.txt",
    );
    expect(res.exitCode).toBe(0);
    expect(shell.getCwd()).toBe("/home/ali/work");
    expect(decodeText(res.stdout)).toBe("/home/ali/work\nhi\n");

    await shell.execute("cd ~");
    const comp = await shell.complete("ls && cd chal");
    expect(comp.completedLine).toBe("ls && cd challenges/");
  });

  it("reports each actually-executed command in executedCommands for lesson auto-complete", async () => {
    const chain = await shell.execute("whoami && pwd");
    expect(chain.exitCode).toBe(0);
    expect(chain.executedCommands?.map((c) => c.command)).toEqual([
      "whoami",
      "pwd",
    ]);
    expect(chain.executedCommands?.every((c) => c.exitCode === 0)).toBe(true);

    // A skipped command after a failed && must NOT appear in executedCommands
    const skipped = await shell.execute("cat missing.txt && whoami");
    expect(skipped.exitCode).toBe(1);
    expect(skipped.executedCommands?.map((c) => c.command)).toEqual([
      "cat missing.txt",
    ]);
  });

  it("returns bash-like syntax errors without crashing on malformed chains", async () => {
    const invalidInputs = [
      "&& ls",
      "|| ls",
      "; ls",
      "ls &&",
      "ls ||",
      "ls ;; pwd",
      "ls && || pwd",
      "ls ; && pwd",
      "echo hi > && ls",
    ];

    for (const input of invalidInputs) {
      const res = await shell.execute(input);
      expect(res.exitCode).toBe(2);
      expect(res.stderr).toContain("syntax error");
    }
  });
});
