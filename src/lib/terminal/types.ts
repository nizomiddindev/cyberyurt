export type EntryType = "file" | "dir";

export interface FsEntryStat {
  name: string;
  path: string;
  type: EntryType;
  size: number;
  mtime: number;
}

export interface VirtualFileSystem {
  readonly homeDir: string;
  readonly isPersistent: boolean;
  init(): Promise<void>;
  reset(): Promise<void>;
  exists(path: string): Promise<boolean>;
  stat(path: string): Promise<FsEntryStat | null>;
  listDir(path: string): Promise<FsEntryStat[]>;
  readFile(path: string): Promise<Uint8Array>;
  writeFile(path: string, data: Uint8Array): Promise<void>;
  appendFile(path: string, data: Uint8Array): Promise<void>;
  mkdir(path: string, recursive?: boolean): Promise<void>;
  remove(path: string, recursive?: boolean): Promise<void>;
  copy(src: string, dest: string, recursive?: boolean): Promise<void>;
  move(src: string, dest: string): Promise<void>;
  listAllFiles(): Promise<string[]>;
}

export interface FetchResponseLike {
  ok: boolean;
  status: number;
  url?: string;
  arrayBuffer(): Promise<ArrayBuffer>;
}

export type WgetFetcher = (url: string) => Promise<FetchResponseLike>;

export interface CommandResult {
  stdout: Uint8Array;
  stderr: string;
  exitCode: number;
  clearScreen?: boolean;
}

export interface CommandContext {
  fs: VirtualFileSystem;
  username: string;
  hostname: string;
  cwd: string;
  prevCwd: string;
  setCwd: (nextCwd: string) => void;
  history: readonly string[];
  stdin: Uint8Array;
  hasStdin: boolean;
  allowedOrigin: string;
  fetcher: WgetFetcher;
}

export type CommandHandler = (
  args: string[],
  ctx: CommandContext,
) => Promise<CommandResult>;

const textEncoder = new TextEncoder();
const textDecoder = new TextDecoder("utf-8", { fatal: false });

export function encodeText(text: string): Uint8Array {
  return textEncoder.encode(text);
}

export function decodeText(bytes: Uint8Array): string {
  return textDecoder.decode(bytes);
}

export function okText(text: string): CommandResult {
  return {
    stdout: encodeText(text),
    stderr: "",
    exitCode: 0,
  };
}

export function okBytes(bytes: Uint8Array): CommandResult {
  return {
    stdout: bytes,
    stderr: "",
    exitCode: 0,
  };
}

export function errResult(message: string, exitCode = 1): CommandResult {
  const normalized = message.endsWith("\n") ? message : `${message}\n`;
  return {
    stdout: new Uint8Array(0),
    stderr: normalized,
    exitCode,
  };
}
