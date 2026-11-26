import { siteConfig } from "@/config/site";
import { COMMAND_REGISTRY } from "@/lib/terminal/commands";
import { completeInput, type CompletionResult } from "@/lib/terminal/completion";
import { parseCommandLine } from "@/lib/terminal/parser";
import { formatPromptCwd, resolvePath } from "@/lib/terminal/path";
import {
  errResult,
  okText,
  type CommandResult,
  type VirtualFileSystem,
  type WgetFetcher,
} from "@/lib/terminal/types";

export interface ShellSessionOptions {
  fs: VirtualFileSystem;
  username: string;
  hostname?: string;
  allowedOrigin?: string;
  fetcher?: WgetFetcher;
}

const defaultFetcher: WgetFetcher = async (url) => {
  const res = await fetch(url, { redirect: "manual" });
  if (res.type === "opaqueredirect" || (res.status >= 300 && res.status < 400)) {
    throw new Error("Redirects are not allowed");
  }
  return {
    ok: res.ok,
    status: res.status,
    url: res.url,
    arrayBuffer: () => res.arrayBuffer(),
  };
};

export class ShellSession {
  readonly fs: VirtualFileSystem;
  readonly username: string;
  readonly hostname: string;
  private readonly allowedOrigin: string;
  private readonly fetcher: WgetFetcher;
  private cwd: string;
  private prevCwd: string;
  private history: string[] = [];

  constructor(options: ShellSessionOptions) {
    this.fs = options.fs;
    this.username = options.username;
    this.hostname = options.hostname ?? siteConfig.terminalHost;
    this.allowedOrigin =
      options.allowedOrigin ?? `https://${siteConfig.domain}`;
    this.fetcher = options.fetcher ?? defaultFetcher;
    this.cwd = options.fs.homeDir;
    this.prevCwd = options.fs.homeDir;
  }

  getCwd(): string {
    return this.cwd;
  }

  getPrompt(): string {
    const displayCwd = formatPromptCwd(this.cwd, this.fs.homeDir);
    return `${this.username}@${this.hostname}:${displayCwd}$ `;
  }

  getHistory(): readonly string[] {
    return this.history;
  }

  async reset(): Promise<void> {
    await this.fs.reset();
    this.cwd = this.fs.homeDir;
    this.prevCwd = this.fs.homeDir;
    this.history = [];
  }

  async complete(line: string): Promise<CompletionResult> {
    return completeInput(line, this.cwd, this.fs);
  }

  async execute(rawLine: string): Promise<CommandResult> {
    const trimmed = rawLine.trim();
    if (!trimmed) {
      return okText("");
    }

    this.history.push(trimmed);

    const parsed = parseCommandLine(trimmed, {
      homeDir: this.fs.homeDir,
      username: this.username,
    });

    if (parsed.error) {
      return errResult(parsed.error, 2);
    }

    if (parsed.commands.length === 0) {
      return okText("");
    }

    let stdinBytes: Uint8Array = new Uint8Array(0);
    let hasStdin = false;
    let combinedStderr = "";
    let lastResult: CommandResult = okText("");

    for (const cmd of parsed.commands) {
      const handler = COMMAND_REGISTRY[cmd.name];
      if (!handler) {
        return errResult(`${cmd.name}: command not found`, 127);
      }

      const result = await handler(cmd.args, {
        fs: this.fs,
        username: this.username,
        hostname: this.hostname,
        cwd: this.cwd,
        prevCwd: this.prevCwd,
        setCwd: (nextCwd) => {
          this.prevCwd = this.cwd;
          this.cwd = nextCwd;
        },
        history: this.history,
        stdin: stdinBytes,
        hasStdin,
        allowedOrigin: this.allowedOrigin,
        fetcher: this.fetcher,
      });

      if (result.stderr) {
        combinedStderr += result.stderr;
      }

      if (cmd.redirect) {
        const targetPath = resolvePath(
          cmd.redirect.target,
          this.cwd,
          this.fs.homeDir,
        );
        try {
          if (cmd.redirect.mode === "append") {
            await this.fs.appendFile(targetPath, result.stdout);
          } else {
            await this.fs.writeFile(targetPath, result.stdout);
          }
          stdinBytes = new Uint8Array(0);
          lastResult = {
            stdout: new Uint8Array(0),
            stderr: combinedStderr,
            exitCode: result.exitCode,
            clearScreen: result.clearScreen,
          };
        } catch (err) {
          const msg = err instanceof Error ? err.message : "Write error";
          return errResult(`${cmd.redirect.target}: ${msg}`);
        }
      } else {
        stdinBytes = result.stdout;
        lastResult = {
          ...result,
          stderr: combinedStderr,
        };
      }

      hasStdin = true;
    }

    return lastResult;
  }
}
