"use client";

import { useCallback, useEffect, useRef, useState, type ChangeEvent } from "react";
import { Terminal as XTerm } from "@xterm/xterm";
import { FitAddon } from "@xterm/addon-fit";
import "@xterm/xterm/css/xterm.css";
import { TerminalFrame, type TerminalFileItem } from "@/components/ui";
import { siteConfig } from "@/config/site";
import { MemoryFileSystem } from "@/lib/terminal/memory-fs";
import {
  isOpfsSupported,
  OpfsFileSystem,
  requestPersistentStorage,
} from "@/lib/terminal/opfs-fs";
import {
  basename,
  formatPromptCwd,
  resolvePath,
  sanitizeUploadName,
} from "@/lib/terminal/path";
import { ShellSession } from "@/lib/terminal/shell";
import {
  decodeText,
  type CommandResult,
  type VirtualFileSystem,
} from "@/lib/terminal/types";
import { getMessages } from "@/locales";

export interface TerminalProps {
  username: string;
  userId: string | null;
  isGuest: boolean;
  onCommandExecuted?: (command: string, result: CommandResult) => void;
}

function toTerminalNewlines(text: string): string {
  return text.replace(/\r?\n/g, "\r\n");
}

export function Terminal({
  username,
  userId,
  isGuest,
  onCommandExecuted,
}: TerminalProps) {
  const messages = getMessages();
  const t = messages.terminal;

  const containerRef = useRef<HTMLDivElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const xtermRef = useRef<XTerm | null>(null);
  const sessionRef = useRef<ShellSession | null>(null);
  const onCommandRef = useRef(onCommandExecuted);
  useEffect(() => {
    onCommandRef.current = onCommandExecuted;
  }, [onCommandExecuted]);

  const [ready, setReady] = useState(false);
  const [isPersistent, setIsPersistent] = useState(false);
  const [downloadOpen, setDownloadOpen] = useState(false);
  const [resetConfirmOpen, setResetConfirmOpen] = useState(false);
  const [files, setFiles] = useState<TerminalFileItem[]>([]);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  const refreshFiles = useCallback(async () => {
    const session = sessionRef.current;
    if (!session) return;
    const allPaths = await session.fs.listAllFiles();
    const items: TerminalFileItem[] = allPaths.map((p) => ({
      path: p,
      label: formatPromptCwd(p, session.fs.homeDir),
    }));
    setFiles(items);
  }, []);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    let disposed = false;
    let resizeObserver: ResizeObserver | null = null;

    const term = new XTerm({
      cursorBlink: true,
      fontSize: 14,
      fontFamily: "var(--font-geist-mono), monospace",
      theme: {
        background: "#0a0a0a",
        foreground: "#f5f5f5",
        cursor: "#f5f5f5",
      },
    });
    const fitAddon = new FitAddon();
    term.loadAddon(fitAddon);
    term.open(container);
    fitAddon.fit();
    xtermRef.current = term;

    let lineBuffer = "";
    let cursorPos = 0;
    let historyCursor = -1;
    let historyDraft = "";
    let busy = false;

    const writePrompt = () => {
      const session = sessionRef.current;
      if (!session) return;
      term.write(session.getPrompt());
    };

    const redrawLine = (nextLine: string, nextCursor: number) => {
      const session = sessionRef.current;
      if (!session) return;
      lineBuffer = nextLine;
      cursorPos = Math.max(0, Math.min(nextCursor, nextLine.length));
      term.write(`\r\x1b[2K${session.getPrompt()}${lineBuffer}`);
      const moveLeft = lineBuffer.length - cursorPos;
      if (moveLeft > 0) {
        term.write(`\x1b[${moveLeft}D`);
      }
    };

    const runLine = async (raw: string) => {
      const session = sessionRef.current;
      if (!session) return;
      busy = true;
      term.write("\r\n");

      const result = await session.execute(raw);

      if (result.clearScreen) {
        term.clear();
      }

      let endedWithNewline = true;
      if (result.stdout.byteLength > 0) {
        const outText = decodeText(result.stdout);
        term.write(toTerminalNewlines(outText));
        endedWithNewline = outText.endsWith("\n");
      }
      if (result.stderr.length > 0) {
        term.write(toTerminalNewlines(result.stderr));
        endedWithNewline = result.stderr.endsWith("\n");
      }
      if (!endedWithNewline) {
        term.write("\r\n");
      }

      onCommandRef.current?.(raw, result);
      await refreshFiles();

      lineBuffer = "";
      cursorPos = 0;
      historyCursor = -1;
      historyDraft = "";
      busy = false;
      writePrompt();
    };

    const handleTab = async () => {
      const session = sessionRef.current;
      if (!session || busy) return;

      const beforeCursor = lineBuffer.slice(0, cursorPos);
      const afterCursor = lineBuffer.slice(cursorPos);
      const result = await session.complete(beforeCursor);

      if (result.candidates.length === 0) return;

      if (result.completedLine !== beforeCursor) {
        redrawLine(result.completedLine + afterCursor, result.completedLine.length);
        return;
      }

      if (result.candidates.length > 1) {
        term.write(`\r\n${result.candidates.join("  ")}\r\n`);
        redrawLine(lineBuffer, cursorPos);
      }
    };

    const dataListener = term.onData((data) => {
      if (busy || !sessionRef.current) return;

      // Handle special escape sequences first
      if (data === "\x1b[A") {
        // Up arrow: previous history entry
        const history = sessionRef.current.getHistory();
        if (history.length === 0) return;
        if (historyCursor === -1) {
          historyDraft = lineBuffer;
          historyCursor = history.length - 1;
        } else if (historyCursor > 0) {
          historyCursor--;
        }
        const entry = history[historyCursor] ?? "";
        redrawLine(entry, entry.length);
        return;
      }

      if (data === "\x1b[B") {
        // Down arrow: next history entry
        if (historyCursor === -1) return;
        const history = sessionRef.current.getHistory();
        if (historyCursor < history.length - 1) {
          historyCursor++;
          const entry = history[historyCursor] ?? "";
          redrawLine(entry, entry.length);
        } else {
          historyCursor = -1;
          redrawLine(historyDraft, historyDraft.length);
        }
        return;
      }

      if (data === "\x1b[D") {
        if (cursorPos > 0) {
          cursorPos--;
          term.write("\x1b[D");
        }
        return;
      }

      if (data === "\x1b[C") {
        if (cursorPos < lineBuffer.length) {
          cursorPos++;
          term.write("\x1b[C");
        }
        return;
      }

      if (data === "\x1b[H" || data === "\x01") {
        // Home or Ctrl+A
        redrawLine(lineBuffer, 0);
        return;
      }

      if (data === "\x1b[F" || data === "\x05") {
        // End or Ctrl+E
        redrawLine(lineBuffer, lineBuffer.length);
        return;
      }

      if (data === "\x1b[3~") {
        // Delete key
        if (cursorPos < lineBuffer.length) {
          const next =
            lineBuffer.slice(0, cursorPos) + lineBuffer.slice(cursorPos + 1);
          redrawLine(next, cursorPos);
        }
        return;
      }

      if (data === "\x03") {
        // Ctrl+C
        term.write("^C\r\n");
        lineBuffer = "";
        cursorPos = 0;
        historyCursor = -1;
        writePrompt();
        return;
      }

      if (data === "\x0c") {
        // Ctrl+L
        term.clear();
        redrawLine(lineBuffer, cursorPos);
        return;
      }

      if (data === "\t") {
        void handleTab();
        return;
      }

      if (data === "\r") {
        void runLine(lineBuffer);
        return;
      }

      if (data === "\x7f" || data === "\b") {
        if (cursorPos > 0) {
          const next =
            lineBuffer.slice(0, cursorPos - 1) + lineBuffer.slice(cursorPos);
          redrawLine(next, cursorPos - 1);
        }
        return;
      }

      // Ignore unhandled escape sequences
      if (data.startsWith("\x1b")) return;

      // Insert printable characters (handles pasted text too)
      const cleaned = data.replace(/\r?\n/g, " ");
      if (cleaned.length > 0) {
        const next =
          lineBuffer.slice(0, cursorPos) + cleaned + lineBuffer.slice(cursorPos);
        redrawLine(next, cursorPos + cleaned.length);
      }
    });

    resizeObserver = new ResizeObserver(() => {
      try {
        fitAddon.fit();
      } catch {
        // Ignore fit errors during unmount
      }
    });
    resizeObserver.observe(container);

    async function setupSession() {
      let fs: VirtualFileSystem;
      if (!isGuest && userId && isOpfsSupported()) {
        try {
          await requestPersistentStorage();
          const opfs = new OpfsFileSystem(userId, username);
          await opfs.init();
          fs = opfs;
        } catch {
          const fallback = new MemoryFileSystem(username);
          await fallback.init();
          fs = fallback;
        }
      } else {
        const mem = new MemoryFileSystem(username);
        await mem.init();
        fs = mem;
      }

      if (disposed) return;

      const session = new ShellSession({
        fs,
        username,
        hostname: siteConfig.terminalHost,
        allowedOrigin: window.location.origin,
      });

      sessionRef.current = session;
      setIsPersistent(fs.isPersistent);
      setReady(true);
      await refreshFiles();
      writePrompt();
      term.focus();
    }

    void setupSession();

    return () => {
      disposed = true;
      dataListener.dispose();
      resizeObserver?.disconnect();
      term.dispose();
      xtermRef.current = null;
      sessionRef.current = null;
    };
  }, [isGuest, refreshFiles, userId, username]);

  async function handleUploadChange(event: ChangeEvent<HTMLInputElement>) {
    const session = sessionRef.current;
    const selected = event.target.files;
    if (!session || !selected || selected.length === 0) return;

    const uploadedNames: string[] = [];
    for (const file of Array.from(selected)) {
      const safeName = sanitizeUploadName(file.name);
      const destPath = resolvePath(safeName, session.getCwd(), session.fs.homeDir);
      const bytes = new Uint8Array(await file.arrayBuffer());
      await session.fs.writeFile(destPath, bytes);
      uploadedNames.push(safeName);
    }

    event.target.value = "";
    await refreshFiles();
    setStatusMessage(`${t.uploaded}: ${uploadedNames.join(", ")}`);
    xtermRef.current?.focus();
  }

  async function handleDownloadFile(path: string) {
    const session = sessionRef.current;
    if (!session) return;

    const bytes = await session.fs.readFile(path);
    const copy = new Uint8Array(bytes.byteLength);
    copy.set(bytes);
    const blob = new Blob([copy.buffer], { type: "application/octet-stream" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = basename(path);
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
    setDownloadOpen(false);
    xtermRef.current?.focus();
  }

  async function handleConfirmReset() {
    const session = sessionRef.current;
    const term = xtermRef.current;
    if (!session) return;

    await session.reset();
    await refreshFiles();
    setResetConfirmOpen(false);
    setDownloadOpen(false);
    setStatusMessage(t.resetDone);

    if (term) {
      term.clear();
      term.write(`\r\x1b[2K${session.getPrompt()}`);
      term.focus();
    }
  }

  return (
    <TerminalFrame
      identityLabel={`${username}@${siteConfig.terminalHost}`}
      storageLabel={isPersistent ? t.storageOpfs : t.storageMemory}
      uploadLabel={t.upload}
      downloadLabel={t.download}
      resetLabel={t.reset}
      confirmResetLabel={t.confirmReset}
      cancelLabel={t.cancel}
      noFilesLabel={t.noFiles}
      closeLabel={messages.ui.close}
      statusMessage={statusMessage}
      downloadOpen={downloadOpen}
      resetConfirmOpen={resetConfirmOpen}
      files={files}
      disabled={!ready}
      onUploadClick={() => fileInputRef.current?.click()}
      onToggleDownload={() => {
        setResetConfirmOpen(false);
        setDownloadOpen((prev) => !prev);
        void refreshFiles();
      }}
      onDownloadFile={(path) => {
        void handleDownloadFile(path);
      }}
      onRequestReset={() => {
        setDownloadOpen(false);
        setResetConfirmOpen(true);
      }}
      onConfirmReset={() => {
        void handleConfirmReset();
      }}
      onCancelReset={() => setResetConfirmOpen(false)}
      terminalContainerRef={containerRef}
      hiddenInputs={
        <input
          ref={fileInputRef}
          type="file"
          multiple
          hidden
          onChange={(event) => {
            void handleUploadChange(event);
          }}
        />
      }
    />
  );
}
