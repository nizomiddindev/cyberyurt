import { resolvePath } from "@/lib/terminal/path";
import {
  decodeText,
  errResult,
  okText,
  type CommandContext,
  type CommandHandler,
} from "@/lib/terminal/types";

async function readInput(
  files: string[],
  ctx: CommandContext,
  cmdName: string,
): Promise<{ text: string } | { error: string }> {
  if (files.length === 0) return { text: decodeText(ctx.stdin) };
  let text = "";
  for (const file of files) {
    try {
      text += decodeText(await ctx.fs.readFile(resolvePath(file, ctx.cwd, ctx.fs.homeDir)));
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Read error";
      return { error: `${cmdName}: ${file}: ${msg}` };
    }
  }
  return { text };
}

/** rev: reverse the characters of every line (like util-linux rev). */
export const revCommand: CommandHandler = async (args, ctx) => {
  const opt = args.find((a) => a.startsWith("-") && a.length > 1);
  if (opt) return errResult(`rev: invalid option -- '${opt.slice(1)}'`);

  const src = await readInput(args, ctx, "rev");
  if ("error" in src) return errResult(src.error);
  if (src.text.length === 0) return okText("");

  const trailing = src.text.endsWith("\n");
  const body = trailing ? src.text.slice(0, -1) : src.text;
  const out = body
    .split("\n")
    .map((line) => Array.from(line).reverse().join(""))
    .join("\n");
  return okText(trailing ? `${out}\n` : out);
};

const ESCAPES: Record<string, string> = { n: "\n", t: "\t", r: "\r", "\\": "\\" };

const CLASSES: Record<string, string> = {
  "[:upper:]": "ABCDEFGHIJKLMNOPQRSTUVWXYZ",
  "[:lower:]": "abcdefghijklmnopqrstuvwxyz",
  "[:digit:]": "0123456789",
  "[:space:]": " \t\n\r\v\f",
};

/** Expand a tr set: escapes (\n), ranges (a-z) and classes ([:upper:]). */
export function expandTrSet(set: string): string[] | { error: string } {
  const out: string[] = [];
  const chars = Array.from(set);
  let i = 0;
  while (i < chars.length) {
    const rest = chars.slice(i).join("");
    const cls = Object.keys(CLASSES).find((name) => rest.startsWith(name));
    if (cls) {
      out.push(...Array.from(CLASSES[cls]));
      i += cls.length;
      continue;
    }

    let ch = chars[i];
    let width = 1;
    if (ch === "\\" && i + 1 < chars.length) {
      ch = ESCAPES[chars[i + 1]] ?? chars[i + 1];
      width = 2;
    }

    if (chars[i + width] === "-" && i + width + 1 < chars.length) {
      let end = chars[i + width + 1];
      let endWidth = 1;
      if (end === "\\" && i + width + 2 < chars.length) {
        end = ESCAPES[chars[i + width + 2]] ?? chars[i + width + 2];
        endWidth = 2;
      }
      const from = ch.codePointAt(0)!;
      const to = end.codePointAt(0)!;
      if (to < from) {
        return { error: `tr: range-endpoints of '${ch}-${end}' are in reverse collating sequence order` };
      }
      for (let c = from; c <= to; c++) out.push(String.fromCodePoint(c));
      i += width + 1 + endWidth;
      continue;
    }

    out.push(ch);
    i += width;
  }
  return out;
}

/** tr: translate or delete characters from standard input (like coreutils tr). */
export const trCommand: CommandHandler = async (args, ctx) => {
  let del = false;
  let squeeze = false;
  const sets: string[] = [];

  for (const arg of args) {
    if (/^-[ds]+$/.test(arg)) {
      if (arg.includes("d")) del = true;
      if (arg.includes("s")) squeeze = true;
    } else if (arg.startsWith("-") && arg.length > 1) {
      return errResult(`tr: invalid option -- '${arg.slice(1)}'`);
    } else {
      sets.push(arg);
    }
  }

  // GNU rules: translate needs 2 sets; -d needs 1; -d -s needs 2 (delete SET1,
  // squeeze SET2); -s alone takes 1 or 2 (squeeze the last set).
  const needed = del ? (squeeze ? 2 : 1) : squeeze ? sets.length || 1 : 2;
  if (sets.length === 0) return errResult("tr: missing operand");
  if (sets.length < needed) {
    return errResult(`tr: missing operand after '${sets[sets.length - 1]}'`);
  }
  if (sets.length > 2 || (del && !squeeze && sets.length > 1)) {
    return errResult(`tr: extra operand '${sets[sets.length - 1]}'`);
  }

  const set1 = expandTrSet(sets[0]);
  if ("error" in set1) return errResult(set1.error);
  const set2Raw = sets[1] !== undefined ? expandTrSet(sets[1]) : [];
  if ("error" in set2Raw) return errResult(set2Raw.error);

  const map = new Map<string, string>();
  if (!del && set2Raw.length > 0) {
    set1.forEach((ch, idx) => {
      map.set(ch, set2Raw[Math.min(idx, set2Raw.length - 1)]);
    });
  }
  const deleteSet = new Set(del ? set1 : []);
  const squeezeSet = new Set(squeeze ? (sets.length === 2 ? set2Raw : set1) : []);

  const input = Array.from(decodeText(ctx.stdin));
  let out = "";
  let last = "";
  for (const ch of input) {
    if (deleteSet.has(ch)) continue;
    const mapped = map.get(ch) ?? ch;
    if (squeezeSet.has(mapped) && mapped === last) continue;
    out += mapped;
    last = mapped;
  }
  return okText(out);
};
