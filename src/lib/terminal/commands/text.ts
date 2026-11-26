import { resolvePath } from "@/lib/terminal/path";
import {
  decodeText,
  errResult,
  okText,
  type CommandContext,
  type CommandHandler,
} from "@/lib/terminal/types";

function splitLines(text: string): { lines: string[]; trailingNewline: boolean } {
  if (text.length === 0) {
    return { lines: [], trailingNewline: false };
  }
  const trailingNewline = text.endsWith("\n");
  const raw = trailingNewline ? text.slice(0, -1) : text;
  return { lines: raw.split("\n"), trailingNewline };
}

async function readTextSource(
  files: string[],
  ctx: CommandContext,
  cmdName: string,
): Promise<{ text: string; bytes: Uint8Array } | { error: string }> {
  if (files.length === 0) {
    return { text: decodeText(ctx.stdin), bytes: ctx.stdin };
  }
  const chunks: Uint8Array[] = [];
  for (const file of files) {
    const resolved = resolvePath(file, ctx.cwd, ctx.fs.homeDir);
    try {
      chunks.push(await ctx.fs.readFile(resolved));
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Read error";
      return { error: `${cmdName}: ${file}: ${msg}` };
    }
  }
  const total = chunks.reduce((sum, c) => sum + c.byteLength, 0);
  const merged = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    merged.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return { text: decodeText(merged), bytes: merged };
}

function parseLineCountArgs(
  args: string[],
  cmdName: string,
): { count: number; files: string[]; error?: string } {
  let count = 10;
  const files: string[] = [];

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === "-n") {
      const next = args[i + 1];
      if (!next || !/^\d+$/.test(next)) {
        return {
          count,
          files,
          error: `${cmdName}: invalid number of lines: '${next ?? ""}'`,
        };
      }
      count = Number.parseInt(next, 10);
      i++;
    } else if (/^-n\d+$/.test(arg)) {
      count = Number.parseInt(arg.slice(2), 10);
    } else if (/^-\d+$/.test(arg)) {
      count = Number.parseInt(arg.slice(1), 10);
    } else if (arg.startsWith("-") && arg.length > 1) {
      return { count, files, error: `${cmdName}: invalid option -- '${arg.slice(1)}'` };
    } else {
      files.push(arg);
    }
  }

  return { count, files };
}

export const headCommand: CommandHandler = async (args, ctx) => {
  const parsed = parseLineCountArgs(args, "head");
  if (parsed.error) return errResult(parsed.error);

  const src = await readTextSource(parsed.files, ctx, "head");
  if ("error" in src) return errResult(src.error);

  if (parsed.count === 0 || src.text.length === 0) return okText("");
  const { lines } = splitLines(src.text);
  const sliced = lines.slice(0, parsed.count);
  return okText(`${sliced.join("\n")}\n`);
};

export const tailCommand: CommandHandler = async (args, ctx) => {
  const parsed = parseLineCountArgs(args, "tail");
  if (parsed.error) return errResult(parsed.error);

  const src = await readTextSource(parsed.files, ctx, "tail");
  if ("error" in src) return errResult(src.error);

  if (parsed.count === 0 || src.text.length === 0) return okText("");
  const { lines } = splitLines(src.text);
  const sliced = lines.slice(-parsed.count);
  return okText(`${sliced.join("\n")}\n`);
};

export const wcCommand: CommandHandler = async (args, ctx) => {
  let showLines = false;
  let showWords = false;
  let showBytes = false;
  const files: string[] = [];

  for (const arg of args) {
    if (arg.startsWith("-") && arg.length > 1) {
      for (const flag of arg.slice(1)) {
        if (flag === "l") showLines = true;
        else if (flag === "w") showWords = true;
        else if (flag === "c") showBytes = true;
        else return errResult(`wc: invalid option -- '${flag}'`);
      }
    } else {
      files.push(arg);
    }
  }

  if (!showLines && !showWords && !showBytes) {
    showLines = true;
    showWords = true;
    showBytes = true;
  }

  const measure = (bytes: Uint8Array) => {
    const text = decodeText(bytes);
    let lineCount = 0;
    for (let i = 0; i < bytes.byteLength; i++) {
      if (bytes[i] === 0x0a) lineCount++;
    }
    const trimmed = text.trim();
    const wordCount = trimmed.length === 0 ? 0 : trimmed.split(/\s+/).length;
    return { lines: lineCount, words: wordCount, bytes: bytes.byteLength };
  };

  const formatRow = (
    counts: { lines: number; words: number; bytes: number },
    label?: string,
  ) => {
    const parts: string[] = [];
    if (showLines) parts.push(String(counts.lines));
    if (showWords) parts.push(String(counts.words));
    if (showBytes) parts.push(String(counts.bytes));
    if (label !== undefined) parts.push(label);
    return parts.join(" ");
  };

  if (files.length === 0) {
    return okText(`${formatRow(measure(ctx.stdin))}\n`);
  }

  const outputLines: string[] = [];
  const total = { lines: 0, words: 0, bytes: 0 };

  for (const file of files) {
    const resolved = resolvePath(file, ctx.cwd, ctx.fs.homeDir);
    try {
      const bytes = await ctx.fs.readFile(resolved);
      const counts = measure(bytes);
      total.lines += counts.lines;
      total.words += counts.words;
      total.bytes += counts.bytes;
      outputLines.push(formatRow(counts, file));
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Read error";
      return errResult(`wc: ${file}: ${msg}`);
    }
  }

  if (files.length > 1) {
    outputLines.push(formatRow(total, "total"));
  }

  return okText(`${outputLines.join("\n")}\n`);
};

function compilePattern(pattern: string, ignoreCase: boolean): RegExp {
  const flags = ignoreCase ? "i" : "";
  try {
    return new RegExp(pattern, flags);
  } catch {
    const escaped = pattern.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    return new RegExp(escaped, flags);
  }
}

export const grepCommand: CommandHandler = async (args, ctx) => {
  let ignoreCase = false;
  let lineNumbers = false;
  let invert = false;
  let countOnly = false;
  let recursive = false;
  const positional: string[] = [];

  for (const arg of args) {
    if (arg.startsWith("-") && arg.length > 1) {
      for (const flag of arg.slice(1)) {
        if (flag === "i") ignoreCase = true;
        else if (flag === "n") lineNumbers = true;
        else if (flag === "v") invert = true;
        else if (flag === "c") countOnly = true;
        else if (flag === "r" || flag === "R") recursive = true;
        else return errResult(`grep: invalid option -- '${flag}'`);
      }
    } else {
      positional.push(arg);
    }
  }

  if (positional.length === 0) {
    return errResult("grep: missing pattern");
  }

  const pattern = positional[0];
  const targets = positional.slice(1);
  const regex = compilePattern(pattern, ignoreCase);

  const searchText = (text: string, prefix?: string): { lines: string[]; count: number } => {
    const { lines } = splitLines(text);
    const matched: string[] = [];
    let count = 0;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const isMatch = regex.test(line);
      if (invert ? !isMatch : isMatch) {
        count++;
        if (!countOnly) {
          const pfx = prefix ? `${prefix}:` : "";
          const num = lineNumbers ? `${i + 1}:` : "";
          matched.push(`${pfx}${num}${line}`);
        }
      }
    }

    if (countOnly) {
      const pfx = prefix ? `${prefix}:` : "";
      matched.push(`${pfx}${count}`);
    }

    return { lines: matched, count };
  };

  if (targets.length === 0 && !recursive) {
    const result = searchText(decodeText(ctx.stdin));
    const output = result.lines.length > 0 ? `${result.lines.join("\n")}\n` : "";
    return {
      stdout: okText(output).stdout,
      stderr: "",
      exitCode: result.count > 0 ? 0 : 1,
    };
  }

  const fileList: { display: string; path: string }[] = [];
  const rawTargets = targets.length > 0 ? targets : ["."];

  const collectDir = async (dirPath: string, displayBase: string) => {
    const entries = await ctx.fs.listDir(dirPath);
    for (const entry of entries) {
      const disp = displayBase === "." ? `./${entry.name}` : `${displayBase}/${entry.name}`;
      if (entry.type === "dir") {
        await collectDir(entry.path, disp);
      } else {
        fileList.push({ display: disp, path: entry.path });
      }
    }
  };

  for (const target of rawTargets) {
    const resolved = resolvePath(target, ctx.cwd, ctx.fs.homeDir);
    const stat = await ctx.fs.stat(resolved);
    if (!stat) {
      return errResult(`grep: ${target}: No such file or directory`);
    }
    if (stat.type === "dir") {
      if (!recursive) {
        return errResult(`grep: ${target}: Is a directory`);
      }
      await collectDir(resolved, target);
    } else {
      fileList.push({ display: target, path: resolved });
    }
  }

  const showPrefix = fileList.length > 1 || recursive;
  const allOutput: string[] = [];
  let totalMatches = 0;

  for (const item of fileList) {
    const bytes = await ctx.fs.readFile(item.path);
    const res = searchText(
      decodeText(bytes),
      showPrefix ? item.display : undefined,
    );
    totalMatches += res.count;
    allOutput.push(...res.lines);
  }

  return {
    stdout: okText(allOutput.length > 0 ? `${allOutput.join("\n")}\n` : "").stdout,
    stderr: "",
    exitCode: totalMatches > 0 ? 0 : 1,
  };
};

function globToRegex(pattern: string, ignoreCase: boolean): RegExp {
  let regexStr = "^";
  for (const ch of pattern) {
    if (ch === "*") regexStr += ".*";
    else if (ch === "?") regexStr += ".";
    else regexStr += ch.replace(/[.+^${}()|[\]\\]/g, "\\$&");
  }
  regexStr += "$";
  return new RegExp(regexStr, ignoreCase ? "i" : "");
}

export const findCommand: CommandHandler = async (args, ctx) => {
  let startRaw = ".";
  let idx = 0;

  if (args[0] && !args[0].startsWith("-")) {
    startRaw = args[0];
    idx = 1;
  }

  let nameRegex: RegExp | null = null;
  let typeFilter: "file" | "dir" | null = null;

  for (; idx < args.length; idx++) {
    const arg = args[idx];
    if (arg === "-name" || arg === "-iname") {
      const pattern = args[idx + 1];
      if (!pattern) {
        return errResult(`find: missing argument to '${arg}'`);
      }
      nameRegex = globToRegex(pattern, arg === "-iname");
      idx++;
    } else if (arg === "-type") {
      const val = args[idx + 1];
      if (val !== "f" && val !== "d") {
        return errResult(`find: Unknown argument to -type: ${val ?? ""}`);
      }
      typeFilter = val === "f" ? "file" : "dir";
      idx++;
    } else {
      return errResult(`find: unknown predicate '${arg}'`);
    }
  }

  const startPath = resolvePath(startRaw, ctx.cwd, ctx.fs.homeDir);
  const startStat = await ctx.fs.stat(startPath);
  if (!startStat) {
    return errResult(`find: '${startRaw}': No such file or directory`);
  }

  const results: string[] = [];

  const matches = (name: string, type: "file" | "dir"): boolean => {
    if (typeFilter && type !== typeFilter) return false;
    if (nameRegex && !nameRegex.test(name)) return false;
    return true;
  };

  const walk = async (absPath: string, displayPath: string, name: string, type: "file" | "dir") => {
    if (matches(name, type)) {
      results.push(displayPath);
    }
    if (type === "dir") {
      const entries = await ctx.fs.listDir(absPath);
      for (const entry of entries) {
        const nextDisplay =
          displayPath === "/"
            ? `/${entry.name}`
            : displayPath.endsWith("/")
              ? `${displayPath}${entry.name}`
              : `${displayPath}/${entry.name}`;
        await walk(entry.path, nextDisplay, entry.name, entry.type);
      }
    }
  };

  await walk(startPath, startRaw, startStat.name, startStat.type);
  return okText(results.length > 0 ? `${results.join("\n")}\n` : "");
};

export const sortCommand: CommandHandler = async (args, ctx) => {
  let reverse = false;
  let numeric = false;
  let unique = false;
  const files: string[] = [];

  for (const arg of args) {
    if (arg.startsWith("-") && arg.length > 1) {
      for (const flag of arg.slice(1)) {
        if (flag === "r") reverse = true;
        else if (flag === "n") numeric = true;
        else if (flag === "u") unique = true;
        else return errResult(`sort: invalid option -- '${flag}'`);
      }
    } else {
      files.push(arg);
    }
  }

  const src = await readTextSource(files, ctx, "sort");
  if ("error" in src) return errResult(src.error);
  if (src.text.length === 0) return okText("");

  const { lines } = splitLines(src.text);
  lines.sort((a, b) => {
    let cmp: number;
    if (numeric) {
      const na = Number.parseFloat(a);
      const nb = Number.parseFloat(b);
      const va = Number.isNaN(na) ? 0 : na;
      const vb = Number.isNaN(nb) ? 0 : nb;
      cmp = va === vb ? a.localeCompare(b) : va - vb;
    } else {
      cmp = a < b ? -1 : a > b ? 1 : 0;
    }
    return reverse ? -cmp : cmp;
  });

  const finalLines = unique
    ? lines.filter((line, i) => i === 0 || line !== lines[i - 1])
    : lines;

  return okText(`${finalLines.join("\n")}\n`);
};

export const uniqCommand: CommandHandler = async (args, ctx) => {
  let showCount = false;
  let onlyDuplicates = false;
  let onlyUnique = false;
  let ignoreCase = false;
  const files: string[] = [];

  for (const arg of args) {
    if (arg.startsWith("-") && arg.length > 1) {
      for (const flag of arg.slice(1)) {
        if (flag === "c") showCount = true;
        else if (flag === "d") onlyDuplicates = true;
        else if (flag === "u") onlyUnique = true;
        else if (flag === "i") ignoreCase = true;
        else return errResult(`uniq: invalid option -- '${flag}'`);
      }
    } else {
      files.push(arg);
    }
  }

  const src = await readTextSource(files, ctx, "uniq");
  if ("error" in src) return errResult(src.error);
  if (src.text.length === 0) return okText("");

  const { lines } = splitLines(src.text);
  const groups: { line: string; count: number }[] = [];

  for (const line of lines) {
    const prev = groups[groups.length - 1];
    const same =
      prev !== undefined &&
      (ignoreCase
        ? prev.line.toLowerCase() === line.toLowerCase()
        : prev.line === line);
    if (same) {
      prev.count++;
    } else {
      groups.push({ line, count: 1 });
    }
  }

  const output: string[] = [];
  for (const group of groups) {
    if (onlyDuplicates && group.count < 2) continue;
    if (onlyUnique && group.count > 1) continue;
    output.push(
      showCount
        ? `${String(group.count).padStart(7, " ")} ${group.line}`
        : group.line,
    );
  }

  return okText(output.length > 0 ? `${output.join("\n")}\n` : "");
};
