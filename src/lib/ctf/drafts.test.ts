import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import YAML from "yaml";
import { sha256Hex } from "@/lib/ctf/loader";
import { CTF_CATEGORIES } from "@/lib/ctf/types";
import { MemoryFileSystem } from "@/lib/terminal/memory-fs";
import { ShellSession } from "@/lib/terminal/shell";
import { decodeText } from "@/lib/terminal/types";
import { validateChallenges } from "../../../scripts/validate-challenges.mjs";

const DRAFTS_DIR = path.join(process.cwd(), "content", "challenges-draft");

interface DraftInfo {
  slug: string;
  dirPath: string;
  raw: string;
  data: Record<string, unknown>;
}

function readAllDrafts(): DraftInfo[] {
  const results: DraftInfo[] = [];
  for (const cat of fs.readdirSync(DRAFTS_DIR, { withFileTypes: true })) {
    if (!cat.isDirectory() || cat.name.startsWith(".")) continue;
    const catPath = path.join(DRAFTS_DIR, cat.name);
    for (const slug of fs.readdirSync(catPath, { withFileTypes: true })) {
      if (!slug.isDirectory() || slug.name.startsWith(".")) continue;
      const dirPath = path.join(catPath, slug.name);
      const yamlPath = path.join(dirPath, "challenge.yaml");
      if (!fs.existsSync(yamlPath)) continue;
      const raw = fs.readFileSync(yamlPath, "utf-8");
      results.push({
        slug: slug.name,
        dirPath,
        raw,
        data: YAML.parse(raw) as Record<string, unknown>,
      });
    }
  }
  return results;
}

async function mountDraftInShell(draft: DraftInfo): Promise<ShellSession> {
  const fsMem = new MemoryFileSystem("ali");
  await fsMem.init();
  const targetDir = `/home/ali/challenges/${draft.slug}`;
  await fsMem.mkdir(targetDir, true);

  const filesDir = path.join(draft.dirPath, "files");
  for (const fileName of fs.readdirSync(filesDir)) {
    const full = path.join(filesDir, fileName);
    if (fs.statSync(full).isFile()) {
      await fsMem.writeFile(
        `${targetDir}/${fileName}`,
        new Uint8Array(fs.readFileSync(full)),
      );
    }
  }

  const shell = new ShellSession({ fs: fsMem, username: "ali" });
  const cd = await shell.execute(`cd ~/challenges/${draft.slug}`);
  expect(cd.exitCode).toBe(0);
  return shell;
}

describe("CTF Draft Challenges (content/challenges-draft/)", () => {
  it("passes validateChallenges on all 16 draft challenges (solve.py hash match + zero plaintext flags)", () => {
    expect(validateChallenges(DRAFTS_DIR)).toEqual([]);
  });

  it("covers all 8 categories (2 each) with balanced easy/medium/hard difficulty and Uzbek U+2018 typography", () => {
    const drafts = readAllDrafts();
    expect(drafts).toHaveLength(16);

    const byCategory: Record<string, number> = {};
    const byDifficulty: Record<string, number> = {};

    for (const item of drafts) {
      const cat = String(item.data.category ?? "");
      const diff = String(item.data.difficulty ?? "");
      byCategory[cat] = (byCategory[cat] ?? 0) + 1;
      byDifficulty[diff] = (byDifficulty[diff] ?? 0) + 1;
      expect(item.raw).not.toMatch(/[oOgG]'/);
    }

    for (const category of CTF_CATEGORIES) {
      expect(byCategory[category]).toBe(2);
    }
    expect(byDifficulty.easy).toBe(6);
    expect(byDifficulty.medium).toBe(6);
    expect(byDifficulty.hard).toBe(4);
  });

  it("verifies every single one of the 16 drafts is solvable using our CyberYurt terminal shell", async () => {
    const drafts = readAllDrafts();
    const bySlug = new Map(drafts.map((d) => [d.slug, d]));

    const assertMatchesHash = (slug: string, recovered: string) => {
      const expected = String(bySlug.get(slug)?.data.flag_sha256 ?? "");
      expect(sha256Hex(recovered.trim())).toBe(expected);
    };

    // 1. ikki-qatlam (pure shell pipeline)
    {
      const shell = await mountDraftInShell(bySlug.get("ikki-qatlam")!);
      const res = await shell.execute("cat shifr.txt | xxd -r -p | base64 -d");
      expect(res.exitCode).toBe(0);
      assertMatchesHash("ikki-qatlam", decodeText(res.stdout));
    }

    // 2. xor-kalit (shell reads sir.hex + eslatma.txt, student XORs with key 'yurt')
    {
      const shell = await mountDraftInShell(bySlug.get("xor-kalit")!);
      const note = decodeText((await shell.execute("cat eslatma.txt")).stdout);
      expect(note).toContain("yurt");
      const hex = decodeText((await shell.execute("cat sir.hex")).stdout).trim();
      const bytes = Buffer.from(hex, "hex");
      const key = Buffer.from("yurt", "utf-8");
      const plain = Buffer.from(bytes.map((b, i) => b ^ key[i % key.length])).toString("utf-8");
      assertMatchesHash("xor-kalit", plain);
    }

    // 3. soxta-pdf (file confirms PNG, strings + grep + base64 -d)
    {
      const shell = await mountDraftInShell(bySlug.get("soxta-pdf")!);
      const f = decodeText((await shell.execute("file hujjat.pdf")).stdout);
      expect(f).toContain("PNG image data");
      const hit = decodeText((await shell.execute("strings hujjat.pdf | grep FAKEPDF")).stdout);
      const b64 = hit.match(/FAKEPDF_B64=([A-Za-z0-9+/=]+)/)?.[1] ?? "";
      const dec = await shell.execute(`echo ${b64} | base64 -d`);
      expect(dec.exitCode).toBe(0);
      assertMatchesHash("soxta-pdf", decodeText(dec.stdout));
    }

    // 4. ochirilgan-iz (strings + grep + sort + xxd -r -p)
    {
      const shell = await mountDraftInShell(bySlug.get("ochirilgan-iz")!);
      const out = decodeText((await shell.execute("strings disk.img | grep FRAG_ | sort")).stdout);
      const frags = [...out.matchAll(/FRAG_([123])=([0-9a-f]+)/g)].sort(
        (a, b) => Number(a[1]) - Number(b[1]),
      );
      expect(frags).toHaveLength(3);
      const fullHex = frags.map((m) => m[2]).join("");
      const dec = await shell.execute(`echo ${fullHex} | xxd -r -p`);
      expect(dec.exitCode).toBe(0);
      assertMatchesHash("ochirilgan-iz", decodeText(dec.stdout));
    }

    // 5. satr-sanash (pure shell pipeline)
    {
      const shell = await mountDraftInShell(bySlug.get("satr-sanash")!);
      const res = await shell.execute("sort kodlar.txt | uniq -u | base64 -d");
      expect(res.exitCode).toBe(0);
      assertMatchesHash("satr-sanash", decodeText(res.stdout));
    }

    // 6. qavatli-papka (cat muhit.conf + grep REVHEX + reverse + xxd -r -p)
    {
      const shell = await mountDraftInShell(bySlug.get("qavatli-papka")!);
      const conf = decodeText((await shell.execute("cat muhit.conf")).stdout);
      expect(conf).toContain("arxiv_02.dat");
      const line = decodeText((await shell.execute("grep REVHEX arxiv_02.dat")).stdout).trim();
      const revHex = line.replace("REVHEX:", "").split("").reverse().join("");
      const dec = await shell.execute(`echo ${revHex} | xxd -r -p`);
      expect(dec.exitCode).toBe(0);
      assertMatchesHash("qavatli-papka", decodeText(dec.stdout));
    }

    // 7. manba-kodi (grep ADMIN_NOTE + base64 -d)
    {
      const shell = await mountDraftInShell(bySlug.get("manba-kodi")!);
      const line = decodeText((await shell.execute("grep ADMIN_NOTE index.html")).stdout);
      const b64 = line.match(/ADMIN_NOTE=([A-Za-z0-9+/=]+)/)?.[1] ?? "";
      const dec = await shell.execute(`echo ${b64} | base64 -d`);
      expect(dec.exitCode).toBe(0);
      assertMatchesHash("manba-kodi", decodeText(dec.stdout));
    }

    // 8. cookie-siri (grep Set-Cookie + JWT payload Base64URL + xxd -r -p)
    {
      const shell = await mountDraftInShell(bySlug.get("cookie-siri")!);
      const line = decodeText((await shell.execute("grep Set-Cookie javob.http")).stdout);
      const jwt = line.match(/session=([A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+)/)?.[1] ?? "";
      const payloadSeg = jwt.split(".")[1] ?? "";
      const padded =
        payloadSeg.replaceAll("-", "+").replaceAll("_", "/") +
        "=".repeat((4 - (payloadSeg.length % 4)) % 4);
      const payloadJson = decodeText((await shell.execute(`echo ${padded} | base64 -d`)).stdout);
      const debugHex = (JSON.parse(payloadJson) as { debug_hex: string }).debug_hex;
      const dec = await shell.execute(`echo ${debugHex} | xxd -r -p`);
      expect(dec.exitCode).toBe(0);
      assertMatchesHash("cookie-siri", decodeText(dec.stdout));
    }

    // 9. foto-manzil (cat post.txt + grep META_B64 exif.txt + base64 -d)
    {
      const shell = await mountDraftInShell(bySlug.get("foto-manzil")!);
      const post = decodeText((await shell.execute("cat post.txt")).stdout);
      expect(post).toContain("Sirdaryo");
      const line = decodeText((await shell.execute("grep META_B64 exif.txt")).stdout);
      const b64 = line.match(/META_B64=([A-Za-z0-9+/=]+)/)?.[1] ?? "";
      const dec = await shell.execute(`echo ${b64} | base64 -d`);
      expect(dec.exitCode).toBe(0);
      assertMatchesHash("foto-manzil", decodeText(dec.stdout));
    }

    // 10. domen-tarixi (grep TXT dns_records.txt + xxd -r -p)
    {
      const shell = await mountDraftInShell(bySlug.get("domen-tarixi")!);
      const txt = decodeText((await shell.execute("grep TXT dns_records.txt")).stdout);
      const hex = txt.match(/cyberyurt-verify=([0-9a-f]+)/)?.[1] ?? "";
      const dec = await shell.execute(`echo ${hex} | xxd -r -p`);
      expect(dec.exitCode).toBe(0);
      assertMatchesHash("domen-tarixi", decodeText(dec.stdout));
    }

    // 11. http-trafik (grep Authorization + base64 -d)
    {
      const shell = await mountDraftInShell(bySlug.get("http-trafik")!);
      const line = decodeText((await shell.execute("grep Authorization trafik.txt")).stdout);
      const b64 = line.match(/Basic\s+([A-Za-z0-9+/=]+)/)?.[1] ?? "";
      const creds = decodeText((await shell.execute(`echo ${b64} | base64 -d`)).stdout);
      expect(creds.startsWith("admin:")).toBe(true);
      assertMatchesHash("http-trafik", creds.slice("admin:".length));
    }

    // 12. dns-tunel (grep exfil.example + xxd -r -p)
    {
      const shell = await mountDraftInShell(bySlug.get("dns-tunel")!);
      const lines = decodeText((await shell.execute("grep exfil.example dns.log")).stdout);
      const chunks = [...lines.matchAll(/QNAME=(\d{2})\.([0-9a-f]+)\.exfil\.example/g)].sort(
        (a, b) => Number(a[1]) - Number(b[1]),
      );
      const fullHex = chunks.map((m) => m[2]).join("");
      const dec = await shell.execute(`echo ${fullHex} | xxd -r -p`);
      expect(dec.exitCode).toBe(0);
      assertMatchesHash("dns-tunel", decodeText(dec.stdout));
    }

    // 13. oddiy-tekshiruv (cat tekshir.py + undo +7 shift)
    {
      const shell = await mountDraftInShell(bySlug.get("oddiy-tekshiruv")!);
      const src = decodeText((await shell.execute("cat tekshir.py")).stdout);
      const shift = Number(src.match(/SHIFT\s*=\s*(\d+)/)?.[1]);
      const arr = JSON.parse(src.match(/TARGET\s*=\s*(\[[0-9,\s]+\])/)?.[1] ?? "[]") as number[];
      const plain = arr.map((v) => String.fromCharCode(v - shift)).join("");
      assertMatchesHash("oddiy-tekshiruv", plain);
    }

    // 14. bayt-qulf (cat qulf.py + invert +5, XOR, reverse)
    {
      const shell = await mountDraftInShell(bySlug.get("bayt-qulf")!);
      const src = decodeText((await shell.execute("cat qulf.py")).stdout);
      const expected = JSON.parse(src.match(/EXPECTED\s*=\s*(\[[0-9,\s]+\])/)?.[1] ?? "[]") as number[];
      const rev = expected.map((val, i) => (((val - 5 + 256) % 256) ^ ((i * 3 + 11) % 256)));
      const plain = Buffer.from(rev.reverse()).toString("utf-8");
      assertMatchesHash("bayt-qulf", plain);
    }

    // 15. soxta-xat (grep X-Campaign-Ref + base64 -d)
    {
      const shell = await mountDraftInShell(bySlug.get("soxta-xat")!);
      const line = decodeText((await shell.execute("grep X-Campaign-Ref xat.eml")).stdout);
      const b64 = line.match(/X-Campaign-Ref:\s*([A-Za-z0-9+/=]+)/)?.[1] ?? "";
      const dec = await shell.execute(`echo ${b64} | base64 -d`);
      expect(dec.exitCode).toBe(0);
      assertMatchesHash("soxta-xat", decodeText(dec.stdout));
    }

    // 16. aldovchi-havola (cat redirect.log + grep track= + URL-decode + base64 -d | xxd -r -p)
    {
      const shell = await mountDraftInShell(bySlug.get("aldovchi-havola")!);
      const log = decodeText((await shell.execute("cat redirect.log")).stdout);
      expect(log).toContain("base64 -d");
      const htmlLine = decodeText((await shell.execute("grep track= sahifa.html")).stdout);
      const rawTrack = htmlLine.match(/track=([^"'&\s]+)/)?.[1] ?? "";
      const b64 = decodeURIComponent(rawTrack);
      const dec = await shell.execute(`echo ${b64} | base64 -d | xxd -r -p`);
      expect(dec.exitCode).toBe(0);
      assertMatchesHash("aldovchi-havola", decodeText(dec.stdout));
    }
  });
});
