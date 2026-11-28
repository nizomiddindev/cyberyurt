import { resolvePath } from "@/lib/terminal/path";
import {
  decodeText,
  errResult,
  okBytes,
  okText,
  type CommandContext,
  type CommandHandler,
} from "@/lib/terminal/types";

function startsWithMagic(bytes: Uint8Array, magic: number[]): boolean {
  if (bytes.byteLength < magic.length) return false;
  for (let i = 0; i < magic.length; i++) {
    if (bytes[i] !== magic[i]) return false;
  }
  return true;
}

function detectFileType(bytes: Uint8Array): string {
  if (bytes.byteLength === 0) return "empty";

  if (startsWithMagic(bytes, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) {
    return "PNG image data";
  }
  if (startsWithMagic(bytes, [0xff, 0xd8, 0xff])) {
    return "JPEG image data";
  }
  if (
    startsWithMagic(bytes, [0x47, 0x49, 0x46, 0x38, 0x37, 0x61]) ||
    startsWithMagic(bytes, [0x47, 0x49, 0x46, 0x38, 0x39, 0x61])
  ) {
    return "GIF image data";
  }
  if (startsWithMagic(bytes, [0x25, 0x50, 0x44, 0x46, 0x2d])) {
    return "PDF document";
  }
  if (startsWithMagic(bytes, [0x50, 0x4b, 0x03, 0x04])) {
    return "Zip archive data";
  }
  if (startsWithMagic(bytes, [0x1f, 0x8b])) {
    return "gzip compressed data";
  }
  if (startsWithMagic(bytes, [0x7f, 0x45, 0x4c, 0x46])) {
    return "ELF executable";
  }
  if (
    startsWithMagic(
      bytes,
      [0x53, 0x51, 0x4c, 0x69, 0x74, 0x65, 0x20, 0x66, 0x6f, 0x72, 0x6d, 0x61, 0x74, 0x20, 0x33, 0x00],
    )
  ) {
    return "SQLite 3.x database";
  }

  let hasHighByte = false;
  let hasBinaryControl = false;
  for (let i = 0; i < bytes.byteLength; i++) {
    const b = bytes[i];
    if (b === 0) {
      hasBinaryControl = true;
      break;
    }
    if (b < 0x09 || (b > 0x0d && b < 0x20)) {
      hasBinaryControl = true;
      break;
    }
    if (b >= 0x80) {
      hasHighByte = true;
    }
  }

  if (hasBinaryControl) return "data";

  if (hasHighByte) {
    try {
      new TextDecoder("utf-8", { fatal: true }).decode(bytes);
      return "UTF-8 Unicode text";
    } catch {
      return "data";
    }
  }

  return "ASCII text";
}

export const fileCommand: CommandHandler = async (args, ctx) => {
  const targets = args.filter((a) => !a.startsWith("-"));
  if (targets.length === 0) {
    return errResult("file: missing file operand");
  }

  const lines: string[] = [];
  let hadError = false;

  for (const target of targets) {
    const resolved = resolvePath(target, ctx.cwd, ctx.fs.homeDir);
    const stat = await ctx.fs.stat(resolved);
    if (!stat) {
      lines.push(`${target}: cannot open (No such file or directory)`);
      hadError = true;
      continue;
    }
    if (stat.type === "dir") {
      lines.push(`${target}: directory`);
      continue;
    }
    const bytes = await ctx.fs.readFile(resolved);
    lines.push(`${target}: ${detectFileType(bytes)}`);
  }

  return {
    stdout: okText(`${lines.join("\n")}\n`).stdout,
    stderr: "",
    exitCode: hadError ? 1 : 0,
  };
};

async function readSingleInput(
  fileArg: string | undefined,
  ctx: CommandContext,
  cmdName: string,
): Promise<{ bytes: Uint8Array } | { error: string }> {
  if (!fileArg || fileArg === "-") {
    return { bytes: ctx.stdin };
  }
  const resolved = resolvePath(fileArg, ctx.cwd, ctx.fs.homeDir);
  try {
    return { bytes: await ctx.fs.readFile(resolved) };
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Read error";
    return { error: `${cmdName}: ${fileArg}: ${msg}` };
  }
}

export const stringsCommand: CommandHandler = async (args, ctx) => {
  let minLength = 4;
  const files: string[] = [];

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === "-n") {
      const next = args[i + 1];
      if (!next || !/^\d+$/.test(next) || Number.parseInt(next, 10) < 1) {
        return errResult(`strings: invalid minimum length '${next ?? ""}'`);
      }
      minLength = Number.parseInt(next, 10);
      i++;
    } else if (/^-n\d+$/.test(arg)) {
      minLength = Number.parseInt(arg.slice(2), 10);
    } else if (arg.startsWith("-") && arg.length > 1) {
      return errResult(`strings: invalid option -- '${arg.slice(1)}'`);
    } else {
      files.push(arg);
    }
  }

  const extract = (bytes: Uint8Array): string[] => {
    const found: string[] = [];
    let current = "";
    for (let i = 0; i < bytes.byteLength; i++) {
      const b = bytes[i];
      if ((b >= 0x20 && b <= 0x7e) || b === 0x09) {
        current += String.fromCharCode(b);
      } else {
        if (current.length >= minLength) {
          found.push(current);
        }
        current = "";
      }
    }
    if (current.length >= minLength) {
      found.push(current);
    }
    return found;
  };

  if (files.length === 0) {
    const found = extract(ctx.stdin);
    return okText(found.length > 0 ? `${found.join("\n")}\n` : "");
  }

  const all: string[] = [];
  for (const file of files) {
    const input = await readSingleInput(file, ctx, "strings");
    if ("error" in input) return errResult(input.error);
    all.push(...extract(input.bytes));
  }

  return okText(all.length > 0 ? `${all.join("\n")}\n` : "");
};

function bytesToBase64(bytes: Uint8Array): string {
  let binary = "";
  const chunkSize = 0x8000;
  for (let i = 0; i < bytes.byteLength; i += chunkSize) {
    const slice = bytes.subarray(i, i + chunkSize);
    binary += String.fromCharCode(...slice);
  }
  return btoa(binary);
}

/**
 * Decode base64 like GNU coreutils: decode everything up to the first problem.
 * Missing "=" padding still yields the decoded bytes, but `complete` is false so
 * the command can print "base64: invalid input" and exit 1 (as real Linux does).
 */
function base64ToBytes(encoded: string): { bytes: Uint8Array; complete: boolean } {
  const cleaned = encoded.replace(/\s+/g, "");
  if (cleaned.length === 0) return { bytes: new Uint8Array(0), complete: true };

  const validPrefix = cleaned.match(/^[A-Za-z0-9+/]*/)?.[0] ?? "";
  const padding = cleaned.slice(validPrefix.length).match(/^={0,2}/)?.[0] ?? "";
  const fullyValid =
    validPrefix.length + padding.length === cleaned.length &&
    cleaned.length % 4 === 0;

  // Decode only whole characters we trust; a single leftover char carries < 1 byte.
  let usable = validPrefix;
  if (usable.length % 4 === 1) usable = usable.slice(0, -1);
  const padded = usable + "=".repeat((4 - (usable.length % 4)) % 4);

  const binary = padded.length > 0 ? atob(padded) : "";
  const out = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    out[i] = binary.charCodeAt(i);
  }
  return { bytes: out, complete: fullyValid };
}

export const base64Command: CommandHandler = async (args, ctx) => {
  let decode = false;
  const files: string[] = [];

  for (const arg of args) {
    if (arg === "-d" || arg === "--decode") {
      decode = true;
    } else if (arg.startsWith("-") && arg.length > 1) {
      return errResult(`base64: invalid option -- '${arg.slice(1)}'`);
    } else {
      files.push(arg);
    }
  }

  const input = await readSingleInput(files[0], ctx, "base64");
  if ("error" in input) return errResult(input.error);

  if (decode) {
    const { bytes, complete } = base64ToBytes(decodeText(input.bytes));
    if (complete) return okBytes(bytes);
    return { stdout: bytes, stderr: "base64: invalid input\n", exitCode: 1 };
  }

  const encoded = bytesToBase64(input.bytes);
  return okText(`${encoded}\n`);
};

function formatXxd(bytes: Uint8Array, plain: boolean): string {
  if (bytes.byteLength === 0) return "";

  if (plain) {
    let hex = "";
    for (let i = 0; i < bytes.byteLength; i++) {
      hex += bytes[i].toString(16).padStart(2, "0");
    }
    const lines: string[] = [];
    for (let i = 0; i < hex.length; i += 60) {
      lines.push(hex.slice(i, i + 60));
    }
    return `${lines.join("\n")}\n`;
  }

  const lines: string[] = [];
  for (let offset = 0; offset < bytes.byteLength; offset += 16) {
    const addr = offset.toString(16).padStart(8, "0");
    const slice = bytes.subarray(offset, offset + 16);
    const hexGroups: string[] = [];
    for (let i = 0; i < 16; i += 2) {
      const b1 = i < slice.length ? slice[i].toString(16).padStart(2, "0") : "  ";
      const b2 =
        i + 1 < slice.length
          ? slice[i + 1].toString(16).padStart(2, "0")
          : "  ";
      hexGroups.push(`${b1}${b2}`);
    }
    let ascii = "";
    for (let i = 0; i < slice.length; i++) {
      const b = slice[i];
      ascii += b >= 0x20 && b <= 0x7e ? String.fromCharCode(b) : ".";
    }
    lines.push(`${addr}: ${hexGroups.join(" ")}  ${ascii}`);
  }
  return `${lines.join("\n")}\n`;
}

function reverseXxd(text: string, plain: boolean): Uint8Array {
  let hex = "";
  if (plain) {
    hex = text.replace(/[^0-9a-fA-F]/g, "");
  } else {
    for (const line of text.split(/\r?\n/)) {
      const colon = line.indexOf(":");
      if (colon === -1) continue;
      const body = line.slice(colon + 1, colon + 41);
      hex += body.replace(/[^0-9a-fA-F]/g, "");
    }
  }

  const len = Math.floor(hex.length / 2);
  const out = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    out[i] = Number.parseInt(hex.slice(i * 2, i * 2 + 2), 16);
  }
  return out;
}

export const xxdCommand: CommandHandler = async (args, ctx) => {
  let plain = false;
  let reverse = false;
  const files: string[] = [];

  for (const arg of args) {
    if (arg.startsWith("-") && arg.length > 1) {
      for (const flag of arg.slice(1)) {
        if (flag === "p") plain = true;
        else if (flag === "r") reverse = true;
        else return errResult(`xxd: invalid option -- '${flag}'`);
      }
    } else {
      files.push(arg);
    }
  }

  const input = await readSingleInput(files[0], ctx, "xxd");
  if ("error" in input) return errResult(input.error);

  if (reverse) {
    return okBytes(reverseXxd(decodeText(input.bytes), plain));
  }

  return okText(formatXxd(input.bytes, plain));
};

export const hexdumpCommand: CommandHandler = async (args, ctx) => {
  let canonical = false;
  const files: string[] = [];

  for (const arg of args) {
    if (arg === "-C") {
      canonical = true;
    } else if (arg.startsWith("-") && arg.length > 1) {
      return errResult(`hexdump: invalid option -- '${arg.slice(1)}'`);
    } else {
      files.push(arg);
    }
  }

  const input = await readSingleInput(files[0], ctx, "hexdump");
  if ("error" in input) return errResult(input.error);

  const bytes = input.bytes;
  if (bytes.byteLength === 0) return okText("");

  const lines: string[] = [];

  if (canonical) {
    for (let offset = 0; offset < bytes.byteLength; offset += 16) {
      const addr = offset.toString(16).padStart(8, "0");
      const slice = bytes.subarray(offset, offset + 16);
      const firstHalf: string[] = [];
      const secondHalf: string[] = [];
      for (let i = 0; i < 8; i++) {
        firstHalf.push(
          i < slice.length ? slice[i].toString(16).padStart(2, "0") : "  ",
        );
      }
      for (let i = 8; i < 16; i++) {
        secondHalf.push(
          i < slice.length ? slice[i].toString(16).padStart(2, "0") : "  ",
        );
      }
      let ascii = "";
      for (let i = 0; i < slice.length; i++) {
        const b = slice[i];
        ascii += b >= 0x20 && b <= 0x7e ? String.fromCharCode(b) : ".";
      }
      lines.push(
        `${addr}  ${firstHalf.join(" ")}  ${secondHalf.join(" ")}  |${ascii}|`,
      );
    }
    lines.push(bytes.byteLength.toString(16).padStart(8, "0"));
    return okText(`${lines.join("\n")}\n`);
  }

  for (let offset = 0; offset < bytes.byteLength; offset += 16) {
    const addr = offset.toString(16).padStart(7, "0");
    const slice = bytes.subarray(offset, offset + 16);
    const words: string[] = [];
    for (let i = 0; i < slice.length; i += 2) {
      const lo = slice[i];
      const hi = i + 1 < slice.length ? slice[i + 1] : 0;
      const word = ((hi << 8) | lo).toString(16).padStart(4, "0");
      words.push(word);
    }
    lines.push(`${addr} ${words.join(" ")}`);
  }
  lines.push(bytes.byteLength.toString(16).padStart(7, "0"));
  return okText(`${lines.join("\n")}\n`);
};
