import { siteConfig } from "@/config/site";
import { COMMAND_REGISTRY } from "@/lib/terminal/commands";
import { completeInput, type CompletionResult } from "@/lib/terminal/completion";
import { parseCommandLine, type ParsedPipeline } from "@/lib/terminal/parser";
import { formatPromptCwd, resolvePath } from "@/lib/terminal/path";
import {
  errResult,
  okText,
  type CommandResult,
  type ExecutedCommand,
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

  private async executePipeline(
    pipeline: ParsedPipeline,
    executedCommands: ExecutedCommand[],
  ): Promise<CommandResult> {
    let stdinBytes: Uint8Array = new Uint8Array(0);
    let hasStdin = false;
    let combinedStderr = "";
    let lastResult: CommandResult = okText("");

    for (const cmd of pipeline.commands) {
      const cmdText =
        cmd.args.length > 0 ? `${cmd.name} ${cmd.args.join(" ")}` : cmd.name;
      const handler = COMMAND_REGISTRY[cmd.name];
      if (!handler) {
        executedCommands.push({
          command: cmdText,
          exitCode: 127,
          cwd: this.cwd,
        });
        return {
          stdout: new Uint8Array(0),
          stderr: `${combinedStderr}${cmd.name}: command not found\n`,
          exitCode: 127,
        };
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
          executedCommands.push({
            command: cmdText,
            exitCode: 1,
            cwd: this.cwd,
          });
          return {
            stdout: new Uint8Array(0),
            stderr: `${combinedStderr}${cmd.redirect.target}: ${msg}\n`,
            exitCode: 1,
          };
        }
      } else {
        stdinBytes = result.stdout;
        lastResult = {
          ...result,
          stderr: combinedStderr,
        };
      }

      executedCommands.push({
        command: cmdText,
        exitCode: lastResult.exitCode,
        cwd: this.cwd,
      });

      hasStdin = true;
    }

    return lastResult;
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

    if (parsed.pipelines.length === 0) {
      return okText("");
    }

    const stdoutChunks: Uint8Array[] = [];
    let combinedStderr = "";
    let lastExitCode = 0;
    let clearScreen = false;
    const executedCommands: ExecutedCommand[] = [];

    for (const pipeline of parsed.pipelines) {
      if (pipeline.connector === "&&" && lastExitCode !== 0) {
        continue;
      }
      if (pipeline.connector === "||" && lastExitCode === 0) {
        continue;
      }

      const res = await this.executePipeline(pipeline, executedCommands);

      if (res.clearScreen) {
        clearScreen = true;
        stdoutChunks.length = 0;
        combinedStderr = "";
      }

      if (res.stdout.byteLength > 0) {
        stdoutChunks.push(res.stdout);
      }
      if (res.stderr) {
        combinedStderr += res.stderr;
      }
      lastExitCode = res.exitCode;
    }

    return {
      stdout: concatBytes(stdoutChunks),
      stderr: combinedStderr,
      exitCode: lastExitCode,
      clearScreen: clearScreen || undefined,
      executedCommands,
    };
  }
}
