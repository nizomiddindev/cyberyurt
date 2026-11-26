import { beforeEach, describe, expect, it } from "vitest";
import { MemoryFileSystem } from "@/lib/terminal/memory-fs";
import { ShellSession } from "@/lib/terminal/shell";
import {
  decodeText,
  encodeText,
  type WgetFetcher,
} from "@/lib/terminal/types";

async function createTestShell(
  username = "ali",
  fetcher?: WgetFetcher,
): Promise<ShellSession> {
  const fs = new MemoryFileSystem(username);
  await fs.init();
  return new ShellSession({
    fs,
    username,
    allowedOrigin: "http://localhost:3000",
    fetcher,
  });
}

describe("ShellSession — every command and shell feature", () => {
  let shell: ShellSession;

  beforeEach(async () => {
    shell = await createTestShell("ali");
  });

  it("formats prompt with <username>@yurt:<cwd>$ and handles whoami & pwd", async () => {
    expect(shell.getPrompt()).toBe("ali@yurt:~$ ");

    const who = await shell.execute("whoami");
    expect(who.exitCode).toBe(0);
    expect(decodeText(who.stdout)).toBe("ali\n");

    const pwd = await shell.execute("pwd");
    expect(pwd.exitCode).toBe(0);
    expect(decodeText(pwd.stdout)).toBe("/home/ali\n");

    const guestShell = await createTestShell("mehmon");
    expect(guestShell.getPrompt()).toBe("mehmon@yurt:~$ ");
    expect(decodeText((await guestShell.execute("whoami")).stdout)).toBe(
      "mehmon\n",
    );
  });

  it("supports cd (relative, ~, .., -, /tmp) and rejects invalid targets", async () => {
    expect((await shell.execute("cd challenges")).exitCode).toBe(0);
    expect(shell.getPrompt()).toBe("ali@yurt:~/challenges$ ");

    expect((await shell.execute("cd /tmp")).exitCode).toBe(0);
    expect(shell.getPrompt()).toBe("ali@yurt:/tmp$ ");

    const back = await shell.execute("cd -");
    expect(back.exitCode).toBe(0);
    expect(decodeText(back.stdout)).toBe("/home/ali/challenges\n");

    expect((await shell.execute("cd ..")).exitCode).toBe(0);
    expect(shell.getCwd()).toBe("/home/ali");

    const missing = await shell.execute("cd nope");
    expect(missing.exitCode).toBe(1);
    expect(missing.stderr).toContain("No such file or directory");
  });

  it("supports ls, ls -a, ls -l, and ls -la", async () => {
    await shell.execute("touch .secret visible.txt");

    const plain = await shell.execute("ls");
    expect(decodeText(plain.stdout)).toContain("challenges");
    expect(decodeText(plain.stdout)).toContain("visible.txt");
    expect(decodeText(plain.stdout)).not.toContain(".secret");

    const all = await shell.execute("ls -a");
    expect(decodeText(all.stdout)).toContain(".secret");
    expect(decodeText(all.stdout)).toContain(".");
    expect(decodeText(all.stdout)).toContain("..");

    const long = await shell.execute("ls -la");
    expect(decodeText(long.stdout)).toContain("drwxr-xr-x");
    expect(decodeText(long.stdout)).toContain("-rw-r--r--");
    expect(decodeText(long.stdout)).toContain(".secret");
  });

  it("supports echo, touch, cat, >, >> redirection, and variable expansion", async () => {
    const e1 = await shell.execute('echo "Salom $USER"');
    expect(decodeText(e1.stdout)).toBe("Salom ali\n");

    const e2 = await shell.execute("echo -n hello");
    expect(decodeText(e2.stdout)).toBe("hello");

    const e3 = await shell.execute('echo -e "a\\nb"');
    expect(decodeText(e3.stdout)).toBe("a\nb\n");

    await shell.execute("echo first > note.txt");
    await shell.execute("echo second >> note.txt");

    const c1 = await shell.execute("cat note.txt");
    expect(decodeText(c1.stdout)).toBe("first\nsecond\n");

    const c2 = await shell.execute("cat -n note.txt");
    expect(decodeText(c2.stdout)).toContain("1\tfirst");
    expect(decodeText(c2.stdout)).toContain("2\tsecond");

    await shell.execute("touch empty.txt");
    expect(decodeText((await shell.execute("cat empty.txt")).stdout)).toBe("");
  });

  it("supports mkdir (-p), cp (-r), mv, and rm (-r, -f)", async () => {
    expect((await shell.execute("mkdir -p work/sub")).exitCode).toBe(0);
    await shell.execute("echo data > work/sub/a.txt");

    expect((await shell.execute("cp work/sub/a.txt work/b.txt")).exitCode).toBe(0);
    expect(decodeText((await shell.execute("cat work/b.txt")).stdout)).toBe("data\n");

    // Directory copy requires -r
    expect((await shell.execute("cp work work_copy")).exitCode).toBe(1);
    expect((await shell.execute("cp -r work work_copy")).exitCode).toBe(0);
    expect(decodeText((await shell.execute("cat work_copy/sub/a.txt")).stdout)).toBe(
      "data\n",
    );

    expect((await shell.execute("mv work/b.txt work/c.txt")).exitCode).toBe(0);
    expect(await shell.fs.exists("/home/ali/work/b.txt")).toBe(false);
    expect(await shell.fs.exists("/home/ali/work/c.txt")).toBe(true);

    // Removing directory without -r fails
    expect((await shell.execute("rm work_copy")).exitCode).toBe(1);
    expect((await shell.execute("rm -r work_copy")).exitCode).toBe(0);
    expect(await shell.fs.exists("/home/ali/work_copy")).toBe(false);

    // -f ignores missing file, but protected home cannot be deleted
    expect((await shell.execute("rm -f missing.txt")).exitCode).toBe(0);
    expect((await shell.execute("rm -rf /home/ali")).exitCode).toBe(1);
  });

  it("supports head, tail, and wc on files and piped stdin", async () => {
    const lines = Array.from({ length: 12 }, (_, i) => `line ${i + 1}`).join("\n") + "\n";
    await shell.fs.writeFile("/home/ali/lines.txt", encodeText(lines));

    const hDefault = await shell.execute("head lines.txt");
    expect(decodeText(hDefault.stdout).trim().split("\n")).toHaveLength(10);
    expect(decodeText(hDefault.stdout)).toContain("line 1\n");

    const h2 = await shell.execute("head -n 2 lines.txt");
    expect(decodeText(h2.stdout)).toBe("line 1\nline 2\n");

    const t2 = await shell.execute("tail -n 2 lines.txt");
    expect(decodeText(t2.stdout)).toBe("line 11\nline 12\n");

    const wcAll = await shell.execute("wc lines.txt");
    expect(decodeText(wcAll.stdout)).toBe(`12 24 ${lines.length} lines.txt\n`);

    const wcPiped = await shell.execute("cat lines.txt | head -n 3 | wc -l");
    expect(decodeText(wcPiped.stdout)).toBe("3\n");
  });

  it("supports grep (-i, -n, -v, -c, -r) and find (-name, -iname, -type)", async () => {
    await shell.execute("mkdir -p dir/nested");
    await shell.fs.writeFile(
      "/home/ali/dir/log.txt",
      encodeText("INFO start\nERROR failed\ninfo done\n"),
    );
    await shell.fs.writeFile(
      "/home/ali/dir/nested/FLAG.txt",
      encodeText("KIBER{found_it}\n"),
    );

    const g1 = await shell.execute("grep -in info dir/log.txt");
    expect(decodeText(g1.stdout)).toBe("1:INFO start\n3:info done\n");

    const gInv = await shell.execute("grep -v -i info dir/log.txt");
    expect(decodeText(gInv.stdout)).toBe("ERROR failed\n");

    const gCount = await shell.execute("grep -c ERROR dir/log.txt");
    expect(decodeText(gCount.stdout)).toBe("1\n");

    const gRec = await shell.execute("grep -r KIBER dir");
    expect(decodeText(gRec.stdout)).toContain("dir/nested/FLAG.txt:KIBER{found_it}");

    const fName = await shell.execute('find dir -name "*.txt"');
    expect(decodeText(fName.stdout)).toContain("dir/log.txt");
    expect(decodeText(fName.stdout)).toContain("dir/nested/FLAG.txt");

    const fIname = await shell.execute('find dir -iname "flag*" -type f');
    expect(decodeText(fIname.stdout)).toBe("dir/nested/FLAG.txt\n");

    const fDirs = await shell.execute("find dir -type d");
    expect(decodeText(fDirs.stdout)).toBe("dir\ndir/nested\n");
  });

  it("supports sort (-r, -n, -u) and uniq (-c, -d, -u) with pipes", async () => {
    await shell.fs.writeFile(
      "/home/ali/items.txt",
      encodeText("banana\napple\nbanana\ncherry\napple\n"),
    );

    const sorted = await shell.execute("sort -u items.txt");
    expect(decodeText(sorted.stdout)).toBe("apple\nbanana\ncherry\n");

    const pipedUniq = await shell.execute("sort items.txt | uniq -c");
    expect(decodeText(pipedUniq.stdout)).toBe(
      "      2 apple\n      2 banana\n      1 cherry\n",
    );

    const onlyDup = await shell.execute("sort items.txt | uniq -d");
    expect(decodeText(onlyDup.stdout)).toBe("apple\nbanana\n");

    const onlyUniq = await shell.execute("sort items.txt | uniq -u");
    expect(decodeText(onlyUniq.stdout)).toBe("cherry\n");

    await shell.fs.writeFile("/home/ali/nums.txt", encodeText("10\n2\n30\n1\n"));
    const numRev = await shell.execute("sort -nr nums.txt");
    expect(decodeText(numRev.stdout)).toBe("30\n10\n2\n1\n");
  });

  it("supports file, strings, base64 (-d), xxd (-p, -r), and hexdump (-C)", async () => {
    // file magic bytes
    const pngBytes = new Uint8Array([
      0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00,
    ]);
    await shell.fs.writeFile("/home/ali/pic.png", pngBytes);
    await shell.fs.writeFile("/home/ali/uz.txt", encodeText("O‘zbekiston\n"));
    await shell.fs.writeFile("/home/ali/ascii.txt", encodeText("hello\n"));
    await shell.execute("touch empty.bin");

    expect(decodeText((await shell.execute("file pic.png")).stdout)).toContain(
      "PNG image data",
    );
    expect(decodeText((await shell.execute("file uz.txt")).stdout)).toContain(
      "UTF-8 Unicode text",
    );
    expect(decodeText((await shell.execute("file ascii.txt")).stdout)).toContain(
      "ASCII text",
    );
    expect(decodeText((await shell.execute("file empty.bin")).stdout)).toContain(
      "empty",
    );
    expect(decodeText((await shell.execute("file challenges")).stdout)).toContain(
      "directory",
    );

    // strings on binary data with embedded flag
    const flagBytes = encodeText("KIBER{str1ngs_ok}");
    const bin = new Uint8Array([0x00, 0x01, 0x41, 0x42, 0x00, ...flagBytes, 0x00, 0xff]);
    await shell.fs.writeFile("/home/ali/blob.bin", bin);
    const strOut = await shell.execute("strings blob.bin");
    expect(decodeText(strOut.stdout)).toBe("KIBER{str1ngs_ok}\n");

    // base64 encode + decode pipeline
    const b64Enc = await shell.execute('echo -n "KIBER{b64}" | base64');
    expect(decodeText(b64Enc.stdout).trim()).toBe("S0lCRVJ7YjY0fQ==");

    const b64Dec = await shell.execute("echo S0lCRVJ7YjY0fQ== | base64 -d");
    expect(decodeText(b64Dec.stdout)).toBe("KIBER{b64}");

    expect((await shell.execute("echo %%% | base64 -d")).exitCode).toBe(1);

    // xxd canonical + plain + reverse
    const xxdCanon = await shell.execute('echo -n "Hello" | xxd');
    expect(decodeText(xxdCanon.stdout)).toContain("00000000: 4865 6c6c 6f");
    expect(decodeText(xxdCanon.stdout)).toContain("Hello");

    const xxdPlain = await shell.execute('echo -n "Hello" | xxd -p');
    expect(decodeText(xxdPlain.stdout)).toBe("48656c6c6f\n");

    const xxdRev = await shell.execute('echo "48656c6c6f" | xxd -r -p');
    expect(decodeText(xxdRev.stdout)).toBe("Hello");

    // hexdump -C and default
    const hdCanon = await shell.execute('echo -n "Hello" | hexdump -C');
    expect(decodeText(hdCanon.stdout)).toContain("00000000  48 65 6c 6c 6f");
    expect(decodeText(hdCanon.stdout)).toContain("|Hello|");

    const hdDefault = await shell.execute('echo -n "AB" | hexdump');
    expect(decodeText(hdDefault.stdout)).toContain("0000000 4241");
  });

  it("supports wget ONLY for our own domain and blocks external URLs and redirects", async () => {
    const mockFetcher: WgetFetcher = async (url) => {
      if (url.includes("redirect-out")) {
        return {
          ok: true,
          status: 200,
          url: "https://evil.com/payload.txt",
          arrayBuffer: async () => encodeText("bad").buffer as ArrayBuffer,
        };
      }
      return {
        ok: true,
        status: 200,
        url,
        arrayBuffer: async () =>
          encodeText("KIBER{wget_ok}\n").buffer as ArrayBuffer,
      };
    };

    const netShell = await createTestShell("ali", mockFetcher);

    // Allowed: relative path
    const rel = await netShell.execute("wget /challenges/flag.txt");
    expect(rel.exitCode).toBe(0);
    expect(decodeText(await netShell.fs.readFile("/home/ali/flag.txt"))).toBe(
      "KIBER{wget_ok}\n",
    );

    // Allowed: cyberyurt.com with -O - piped
    const own = await netShell.execute(
      "wget -O - https://cyberyurt.com/challenges/flag.txt | grep KIBER",
    );
    expect(own.exitCode).toBe(0);
    expect(decodeText(own.stdout)).toBe("KIBER{wget_ok}\n");

    // Blocked: external domain
    const ext = await netShell.execute("wget https://example.com/secret.txt");
    expect(ext.exitCode).toBe(1);
    expect(ext.stderr).toContain("blocked");

    // Blocked: lookalike subdomain attack
    const trick = await netShell.execute(
      "wget https://cyberyurt.com.evil.com/file.txt",
    );
    expect(trick.exitCode).toBe(1);
    expect(trick.stderr).toContain("blocked");

    // Blocked: non-http protocol
    const proto = await netShell.execute("wget file:///etc/passwd");
    expect(proto.exitCode).toBe(1);
    expect(proto.stderr).toContain("blocked");

    // Blocked: redirect to external host
    const redir = await netShell.execute("wget /redirect-out");
    expect(redir.exitCode).toBe(1);
    expect(redir.stderr).toContain("blocked redirect");
  });

  it("supports clear, help, history, and Tab completion", async () => {
    const cl = await shell.execute("clear");
    expect(cl.exitCode).toBe(0);
    expect(cl.clearScreen).toBe(true);

    const hp = await shell.execute("help");
    expect(hp.exitCode).toBe(0);
    expect(decodeText(hp.stdout)).toContain("base64");
    expect(decodeText(hp.stdout)).toContain("wget");

    const hist = await shell.execute("history");
    expect(decodeText(hist.stdout)).toContain("1  clear");
    expect(decodeText(hist.stdout)).toContain("2  help");
    expect(decodeText(hist.stdout)).toContain("3  history");

    // Command tab completion
    const compUnique = await shell.complete("who");
    expect(compUnique.completedLine).toBe("whoami ");

    const compMulti = await shell.complete("he");
    expect(compMulti.candidates).toEqual(["head", "help", "hexdump"]);

    // Path tab completion
    await shell.execute("touch notes.txt");
    const compFile = await shell.complete("cat no");
    expect(compFile.completedLine).toBe("cat notes.txt ");

    const compDir = await shell.complete("cd chal");
    expect(compDir.completedLine).toBe("cd challenges/");
  });

  it("reports unknown commands and syntax errors cleanly", async () => {
    const unknown = await shell.execute("notacommand");
    expect(unknown.exitCode).toBe(127);
    expect(unknown.stderr).toContain("command not found");

    const badQuote = await shell.execute('echo "unclosed');
    expect(badQuote.exitCode).toBe(2);
    expect(badQuote.stderr).toContain("unclosed quote");
  });
});
