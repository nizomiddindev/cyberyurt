"use client";

import { useCallback, useEffect, useRef, useState, type ChangeEvent } from "react";
import { Terminal as XTerm } from "@xterm/xterm";
import { FitAddon } from "@xterm/addon-fit";
import "@xterm/xterm/css/xterm.css";
import {
  getTerminalFontFamily,
  TerminalFrame,
  terminalTheme,
  type TerminalFileItem,
} from "@/components/ui";
import { siteConfig } from "@/config/site";
import { LineEditor } from "@/lib/terminal/line-editor";
import {
  getTotalStorageBytes,
  validateUploadSizes,
} from "@/lib/terminal/limits";
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

export interface TerminalCommandEvent {
  command: string;
  result: CommandResult;
  cwd: string;
  fs: VirtualFileSystem;
}

export interface TerminalSeedRequest {
  id: number;
  targetDir: string;
  files: { name: string; bytes: Uint8Array }[];
  /** Skip files that already exist (automatic loading must never overwrite a student's work). */
  onlyIfMissing?: boolean;
}

export interface TerminalProps {
  username: string;
  userId: string | null;
  isGuest: boolean;
  onCommandExecuted?: (event: TerminalCommandEvent) => void;
  seedRequest?: TerminalSeedRequest | null;
  onSeedComplete?: (targetDir: string) => void;
}

async function copyTextToClipboard(text: string): Promise<void> {
  try {
    await navigator.clipboard.writeText(text);
    return;
  } catch {
    // Clipboard API can be unavailable (older browsers, non-https); fall back below.
  }
  const helper = document.createElement("textarea");
  helper.value = text;
  helper.setAttribute("readonly", "");
  helper.style.position = "fixed";
  helper.style.opacity = "0";
  document.body.appendChild(helper);
  helper.select();
  try {
    document.execCommand("copy");
  } finally {
    document.body.removeChild(helper);
  }
}

function toTerminalNewlines(text: string): string {
  return text.replace(/\r?\n/g, "\r\n");
}

export function Terminal({
  username,
  userId,
  isGuest,
  onCommandExecuted,
  seedRequest,
  onSeedComplete,
}: TerminalProps) {
  const messages = getMessages();
  const t = messages.terminal;

  const containerRef = useRef<HTMLDivElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const xtermRef = useRef<XTerm | null>(null);
  const sessionRef = useRef<ShellSession | null>(null);
  const editorRef = useRef<LineEditor | null>(null);
  const onCommandRef = useRef(onCommandExecuted);
  const onSeedCompleteRef = useRef(onSeedComplete);
  useEffect(() => {
    onCommandRef.current = onCommandExecuted;
  }, [onCommandExecuted]);
  useEffect(() => {
    onSeedCompleteRef.current = onSeedComplete;
  }, [onSeedComplete]);

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
      fontFamily: getTerminalFontFamily(),
      theme: { ...terminalTheme },
    });
    const fitAddon = new FitAddon();
    term.loadAddon(fitAddon);
    term.open(container);
    fitAddon.fit();
    xtermRef.current = term;

    // Copy / paste like a normal terminal:
    // - Ctrl+C copies when text is selected, otherwise it cancels the line (^C).
    // - Ctrl+Shift+C always copies. Ctrl+V / Ctrl+Shift+V paste.
    // Returning false stops xterm from turning the key into a control character,
    // so the browser's own paste event reaches xterm and arrives in onData as text.
    term.attachCustomKeyEventHandler((event) => {
      if (event.type !== "keydown") return true;
      const mod = event.ctrlKey || event.metaKey;
      if (!mod || event.altKey) return true;
      const key = event.key.toLowerCase();

      if (key === "c" && (event.shiftKey || term.hasSelection())) {
        const selected = term.getSelection();
        if (selected) {
          void copyTextToClipboard(selected);
          term.clearSelection();
        }
        event.preventDefault();
        return false;
      }

      if (key === "v") {
        return false;
      }

      return true;
    });

    const editor = new LineEditor();
    editorRef.current = editor;
    let busy = false;

    const writeFreshPrompt = () => {
      const session = sessionRef.current;
      if (!session) return;
      term.write(editor.renderFresh(session.getPrompt(), term.cols));
    };

    const runLine = async (raw: string) => {
      const session = sessionRef.current;
      if (!session) return;
      busy = true;

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

      if (result.executedCommands && result.executedCommands.length > 0) {
        for (const executed of result.executedCommands) {
          onCommandRef.current?.({
            command: executed.command,
            result: {
              ...result,
              exitCode: executed.exitCode,
            },
            cwd: executed.cwd,
            fs: session.fs,
          });
        }
      } else {
        onCommandRef.current?.({
          command: raw,
          result,
          cwd: session.getCwd(),
          fs: session.fs,
        });
      }
      await refreshFiles();

      busy = false;
      writeFreshPrompt();
    };

    const handleTab = async () => {
      const session = sessionRef.current;
      if (!session || busy) return;

      const beforeCursor = editor.getBeforeCursor();
      const afterCursor = editor.getAfterCursor();
      const result = await session.complete(beforeCursor);

      if (result.candidates.length === 0) return;

      if (result.completedLine !== beforeCursor) {
        const nextLine = result.completedLine + afterCursor;
        const nextCursor = Array.from(result.completedLine).length;
        term.write(
          editor.setLine(nextLine, nextCursor, session.getPrompt(), term.cols),
        );
        return;
      }

      if (result.candidates.length > 1) {
        term.write(editor.moveBelowInput());
        term.write(`${result.candidates.join("  ")}\r\n`);
        term.write(editor.renderFresh(session.getPrompt(), term.cols));
      }
    };

    const dataListener = term.onData((data) => {
      const session = sessionRef.current;
      if (busy || !session) return;

      const prompt = session.getPrompt();
      const cols = term.cols;

      // Handle special escape sequences and editing shortcuts
      if (data === "\x1b[A") {
        // Up arrow: previous history entry
        term.write(editor.historyPrev(prompt, cols));
        return;
      }

      if (data === "\x1b[B") {
        // Down arrow: next history entry
        term.write(editor.historyNext(prompt, cols));
        return;
      }

      if (data === "\x1b[D") {
        term.write(editor.moveLeft(prompt, cols));
        return;
      }

      if (data === "\x1b[C") {
        term.write(editor.moveRight(prompt, cols));
        return;
      }

      if (data === "\x1b[H" || data === "\x01") {
        // Home or Ctrl+A
        term.write(editor.moveHome(prompt, cols));
        return;
      }

      if (data === "\x1b[F" || data === "\x05") {
        // End or Ctrl+E
        term.write(editor.moveEnd(prompt, cols));
        return;
      }

      if (data === "\x1b[3~") {
        // Delete key
        term.write(editor.deleteForward(prompt, cols));
        return;
      }

      if (data === "\x17") {
        // Ctrl+W: delete word before cursor
        term.write(editor.killWordBeforeCursor(prompt, cols));
        return;
      }

      if (data === "\x15") {
        // Ctrl+U: clear line before cursor
        term.write(editor.killBeforeCursor(prompt, cols));
        return;
      }

      if (data === "\x0b") {
        // Ctrl+K: clear line after cursor
        term.write(editor.killAfterCursor(prompt, cols));
        return;
      }

      if (data === "\x03") {
        // Ctrl+C
        term.write(editor.cancel(prompt, cols));
        return;
      }

      if (data === "\x0c") {
        // Ctrl+L
        term.clear();
        term.write(editor.renderFresh(prompt, cols));
        return;
      }

      if (data === "\t") {
        void handleTab();
        return;
      }

      if (data === "\r") {
        const { line, output } = editor.submit();
        term.write(output);
        void runLine(line);
        return;
      }

      if (data === "\x7f" || data === "\b") {
        term.write(editor.backspace(prompt, cols));
        return;
      }

      // Ignore unhandled escape sequences
      if (data.startsWith("\x1b")) return;

      // Insert printable characters (handles pasted text too)
      const seq = editor.insert(data, prompt, cols);
      if (seq) {
        term.write(seq);
      }
    });

    resizeObserver = new ResizeObserver(() => {
      try {
        fitAddon.fit();
        const session = sessionRef.current;
        if (session && !busy) {
          const seq = editor.handleResize(session.getPrompt(), term.cols);
          if (seq) {
            term.write(seq);
          }
        }
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
      writeFreshPrompt();
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
      editorRef.current = null;
    };
  }, [isGuest, refreshFiles, userId, username]);

  const lastSeedIdRef = useRef<number>(0);

  useEffect(() => {
    if (!ready || !seedRequest || seedRequest.id === lastSeedIdRef.current) {
      return;
    }
    const session = sessionRef.current;
    if (!session) return;

    lastSeedIdRef.current = seedRequest.id;

    async function writeSeedFiles() {
      if (!session || !seedRequest) return;
      const absDir = resolvePath(
        seedRequest.targetDir,
        session.fs.homeDir,
        session.fs.homeDir,
      );
      await session.fs.mkdir(absDir, true);
      let written = 0;
      for (const item of seedRequest.files) {
        const safeName = sanitizeUploadName(item.name);
        const target = `${absDir}/${safeName}`;
        if (seedRequest.onlyIfMissing && (await session.fs.exists(target))) {
          continue;
        }
        await session.fs.writeFile(target, item.bytes);
        written++;
      }
      await refreshFiles();
      if (written > 0 || !seedRequest.onlyIfMissing) {
        setStatusMessage(`${t.uploaded}: ${seedRequest.targetDir}`);
      }
      onSeedCompleteRef.current?.(seedRequest.targetDir);
    }

    void writeSeedFiles();
  }, [ready, refreshFiles, seedRequest, t.uploaded]);

  async function handleUploadChange(event: ChangeEvent<HTMLInputElement>) {
    const session = sessionRef.current;
    const selected = event.target.files;
    if (!session || !selected || selected.length === 0) return;

    const fileArray = Array.from(selected);

    try {
      const currentTotal = await getTotalStorageBytes(session.fs);
      const sizeCheck = validateUploadSizes(fileArray, currentTotal);
      if (!sizeCheck.ok) {
        setStatusMessage(
          sizeCheck.reason === "fileTooLarge"
            ? `${sizeCheck.fileName}: ${t.uploadTooLarge}`
            : t.uploadQuotaExceeded,
        );
        return;
      }

      const uploadedNames: string[] = [];
      for (const file of fileArray) {
        const safeName = sanitizeUploadName(file.name);
        const destPath = resolvePath(
          safeName,
          session.getCwd(),
          session.fs.homeDir,
        );
        const bytes = new Uint8Array(await file.arrayBuffer());
        await session.fs.writeFile(destPath, bytes);
        uploadedNames.push(safeName);
      }

      await refreshFiles();
      setStatusMessage(`${t.uploaded}: ${uploadedNames.join(", ")}`);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "";
      setStatusMessage(msg ? `${t.uploadFailed}: ${msg}` : t.uploadFailed);
    } finally {
      event.target.value = "";
      xtermRef.current?.focus();
    }
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
      if (editorRef.current) {
        editorRef.current.resetAll();
        term.write(editorRef.current.renderFresh(session.getPrompt(), term.cols));
      } else {
        term.write(`\r\x1b[2K${session.getPrompt()}`);
      }
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
