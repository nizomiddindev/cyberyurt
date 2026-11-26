import { resolvePath } from "@/lib/terminal/path";
import {
  decodeText,
  encodeText,
  errResult,
  okBytes,
  okText,
  type CommandHandler,
} from "@/lib/terminal/types";

function concatBytes(chunks: Uint8Array[]): Uint8Array {
  const total = chunks.reduce((sum, c) => sum + c.byteLength, 0);
  const out = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    out.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return out;
}

export const catCommand: CommandHandler = async (args, ctx) => {
  let numberLines = false;
  const files: string[] = [];

  for (const arg of args) {
    if (arg === "-n") {
      numberLines = true;
    } else if (arg.startsWith("-") && arg.length > 1) {
      return errResult(`cat: invalid option -- '${arg.slice(1)}'`);
    } else {
      files.push(arg);
    }
  }

  let data: Uint8Array;
  if (files.length === 0) {
    data = ctx.stdin;
  } else {
    const chunks: Uint8Array[] = [];
    for (const file of files) {
      if (file === "-") {
        chunks.push(ctx.stdin);
        continue;
      }
      const resolved = resolvePath(file, ctx.cwd, ctx.fs.homeDir);
      try {
        chunks.push(await ctx.fs.readFile(resolved));
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Read error";
        return errResult(`cat: ${file}: ${msg}`);
      }
    }
    data = concatBytes(chunks);
  }

  if (!numberLines) {
    return okBytes(data);
  }

  const text = decodeText(data);
  if (!text) return okText("");
  const lines = text.split("\n");
  const hasTrailingNewline = text.endsWith("\n");
  if (hasTrailingNewline) lines.pop();
  const numbered = lines
    .map((line, i) => `${String(i + 1).padStart(6, " ")}\t${line}`)
    .join("\n");
  return okText(hasTrailingNewline ? `${numbered}\n` : numbered);
};

export const echoCommand: CommandHandler = async (args) => {
  let noNewline = false;
  let interpretEscapes = false;
  let i = 0;

  while (i < args.length && /^-[ne]+$/.test(args[i])) {
    for (const ch of args[i].slice(1)) {
      if (ch === "n") noNewline = true;
      if (ch === "e") interpretEscapes = true;
    }
    i++;
  }

  let output = args.slice(i).join(" ");
  if (interpretEscapes) {
    output = output
      .replaceAll("\\n", "\n")
      .replaceAll("\\t", "\t")
      .replaceAll("\\r", "\r")
      .replaceAll("\\\\", "\\");
  }

  return okText(noNewline ? output : `${output}\n`);
};

export const mkdirCommand: CommandHandler = async (args, ctx) => {
  let recursive = false;
  const dirs: string[] = [];

  for (const arg of args) {
    if (arg === "-p") {
      recursive = true;
    } else if (arg.startsWith("-") && arg.length > 1) {
      return errResult(`mkdir: invalid option -- '${arg.slice(1)}'`);
    } else {
      dirs.push(arg);
    }
  }

  if (dirs.length === 0) {
    return errResult("mkdir: missing operand");
  }

  for (const dir of dirs) {
    const resolved = resolvePath(dir, ctx.cwd, ctx.fs.homeDir);
    try {
      await ctx.fs.mkdir(resolved, recursive);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Cannot create directory";
      return errResult(`mkdir: cannot create directory '${dir}': ${msg}`);
    }
  }

  return okText("");
};

export const rmCommand: CommandHandler = async (args, ctx) => {
  let recursive = false;
  let force = false;
  const targets: string[] = [];

  for (const arg of args) {
    if (arg.startsWith("-") && arg.length > 1) {
      for (const flag of arg.slice(1)) {
        if (flag === "r" || flag === "R") recursive = true;
        else if (flag === "f") force = true;
        else return errResult(`rm: invalid option -- '${flag}'`);
      }
    } else {
      targets.push(arg);
    }
  }

  if (targets.length === 0) {
    return force ? okText("") : errResult("rm: missing operand");
  }

  for (const target of targets) {
    const resolved = resolvePath(target, ctx.cwd, ctx.fs.homeDir);
    try {
      await ctx.fs.remove(resolved, recursive);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Remove error";
      if (force && msg.includes("No such file or directory")) {
        continue;
      }
      return errResult(`rm: cannot remove '${target}': ${msg}`);
    }
  }

  return okText("");
};

export const cpCommand: CommandHandler = async (args, ctx) => {
  let recursive = false;
  const operands: string[] = [];

  for (const arg of args) {
    if (arg === "-r" || arg === "-R") {
      recursive = true;
    } else if (arg.startsWith("-") && arg.length > 1) {
      return errResult(`cp: invalid option -- '${arg.slice(1)}'`);
    } else {
      operands.push(arg);
    }
  }

  if (operands.length < 2) {
    return errResult("cp: missing file operand");
  }

  const destRaw = operands[operands.length - 1];
  const dest = resolvePath(destRaw, ctx.cwd, ctx.fs.homeDir);
  const sources = operands.slice(0, -1);

  if (sources.length > 1) {
    const destStat = await ctx.fs.stat(dest);
    if (!destStat || destStat.type !== "dir") {
      return errResult(`cp: target '${destRaw}' is not a directory`);
    }
  }

  for (const srcRaw of sources) {
    const src = resolvePath(srcRaw, ctx.cwd, ctx.fs.homeDir);
    try {
      await ctx.fs.copy(src, dest, recursive);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Copy error";
      return errResult(`cp: cannot copy '${srcRaw}': ${msg}`);
    }
  }

  return okText("");
};

export const mvCommand: CommandHandler = async (args, ctx) => {
  const operands: string[] = [];

  for (const arg of args) {
    if (arg.startsWith("-") && arg.length > 1) {
      return errResult(`mv: invalid option -- '${arg.slice(1)}'`);
    }
    operands.push(arg);
  }

  if (operands.length < 2) {
    return errResult("mv: missing file operand");
  }

  const destRaw = operands[operands.length - 1];
  const dest = resolvePath(destRaw, ctx.cwd, ctx.fs.homeDir);
  const sources = operands.slice(0, -1);

  if (sources.length > 1) {
    const destStat = await ctx.fs.stat(dest);
    if (!destStat || destStat.type !== "dir") {
      return errResult(`mv: target '${destRaw}' is not a directory`);
    }
  }

  for (const srcRaw of sources) {
    const src = resolvePath(srcRaw, ctx.cwd, ctx.fs.homeDir);
    try {
      await ctx.fs.move(src, dest);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Move error";
      return errResult(`mv: cannot move '${srcRaw}': ${msg}`);
    }
  }

  return okText("");
};

export const touchCommand: CommandHandler = async (args, ctx) => {
  const files = args.filter((a) => !a.startsWith("-"));
  if (files.length === 0) {
    return errResult("touch: missing file operand");
  }

  for (const file of files) {
    const resolved = resolvePath(file, ctx.cwd, ctx.fs.homeDir);
    try {
      const existing = await ctx.fs.stat(resolved);
      if (!existing) {
        await ctx.fs.writeFile(resolved, encodeText(""));
      } else if (existing.type === "file") {
        const current = await ctx.fs.readFile(resolved);
        await ctx.fs.writeFile(resolved, current);
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Touch error";
      return errResult(`touch: cannot touch '${file}': ${msg}`);
    }
  }

  return okText("");
};
