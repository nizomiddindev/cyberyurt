"use client";

import type { ReactNode, RefObject } from "react";
import { Download, RotateCcw, Upload, X } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";

/** Colors used by xterm.js. Kept here so the whole look lives in src/components/ui/. */
export const terminalTheme = {
  background: "#081424",
  foreground: "#e6edf7",
  cursor: "#ff7a59",
  cursorAccent: "#081424",
  selectionBackground: "rgba(255, 122, 89, 0.35)",
  black: "#0b1a2e",
  red: "#f87171",
  green: "#4ade80",
  yellow: "#facc15",
  blue: "#60a5fa",
  magenta: "#c084fc",
  cyan: "#22d3ee",
  white: "#e6edf7",
  brightBlack: "#7189a6",
  brightRed: "#fca5a5",
  brightGreen: "#86efac",
  brightYellow: "#fde047",
  brightBlue: "#93c5fd",
  brightMagenta: "#d8b4fe",
  brightCyan: "#67e8f9",
  brightWhite: "#ffffff",
} as const;

/**
 * xterm.js draws on a canvas and cannot read CSS variables, so resolve the real
 * Geist Mono family name that next/font generated.
 */
export function getTerminalFontFamily(): string {
  const fallback = "ui-monospace, SFMono-Regular, Menlo, Consolas, monospace";
  if (typeof window === "undefined") return fallback;
  const resolved = getComputedStyle(document.documentElement)
    .getPropertyValue("--font-geist-mono")
    .trim();
  return resolved ? `${resolved}, ${fallback}` : fallback;
}

export interface TerminalFileItem {
  path: string;
  label: string;
}

export interface TerminalFrameProps {
  identityLabel: string;
  storageLabel: string;
  uploadLabel: string;
  downloadLabel: string;
  resetLabel: string;
  confirmResetLabel: string;
  cancelLabel: string;
  noFilesLabel: string;
  closeLabel: string;
  statusMessage?: string | null;
  downloadOpen: boolean;
  resetConfirmOpen: boolean;
  files: TerminalFileItem[];
  disabled?: boolean;
  onUploadClick: () => void;
  onToggleDownload: () => void;
  onDownloadFile: (path: string) => void;
  onRequestReset: () => void;
  onConfirmReset: () => void;
  onCancelReset: () => void;
  terminalContainerRef: RefObject<HTMLDivElement | null>;
  hiddenInputs?: ReactNode;
}

export function TerminalFrame({
  identityLabel,
  storageLabel,
  uploadLabel,
  downloadLabel,
  resetLabel,
  confirmResetLabel,
  cancelLabel,
  noFilesLabel,
  closeLabel,
  statusMessage,
  downloadOpen,
  resetConfirmOpen,
  files,
  disabled = false,
  onUploadClick,
  onToggleDownload,
  onDownloadFile,
  onRequestReset,
  onConfirmReset,
  onCancelReset,
  terminalContainerRef,
  hiddenInputs,
}: TerminalFrameProps) {
  return (
    <section className="overflow-hidden rounded-2xl border border-line bg-deep">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line bg-card px-3 py-2">
        <div className="flex flex-wrap items-center gap-2">
          <span aria-hidden="true" className="flex gap-1.5 pr-1">
            <span className="h-2.5 w-2.5 rounded-full bg-accent" />
            <span className="h-2.5 w-2.5 rounded-full bg-line-strong" />
            <span className="h-2.5 w-2.5 rounded-full bg-line-strong" />
          </span>
          <Badge tone="accent">{identityLabel}</Badge>
          <Badge>{storageLabel}</Badge>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="ghost"
            onClick={onUploadClick}
            disabled={disabled}
          >
            <Upload size={16} aria-hidden="true" />
            <span>{uploadLabel}</span>
          </Button>

          <Button
            variant="ghost"
            onClick={onToggleDownload}
            disabled={disabled}
            aria-expanded={downloadOpen}
          >
            <Download size={16} aria-hidden="true" />
            <span>{downloadLabel}</span>
          </Button>

          {resetConfirmOpen ? (
            <>
              <Button
                variant="primary"
                onClick={onConfirmReset}
                disabled={disabled}
              >
                {confirmResetLabel}
              </Button>
              <Button
                variant="secondary"
                onClick={onCancelReset}
                disabled={disabled}
              >
                {cancelLabel}
              </Button>
            </>
          ) : (
            <Button
              variant="ghost"
              onClick={onRequestReset}
              disabled={disabled}
            >
              <RotateCcw size={16} aria-hidden="true" />
              <span>{resetLabel}</span>
            </Button>
          )}
        </div>
      </div>

      {statusMessage ? (
        <div
          role="status"
          key={statusMessage}
          className="animate-rise border-b border-line bg-card px-3 py-2 text-xs text-ink-muted"
        >
          {statusMessage}
        </div>
      ) : null}

      {downloadOpen ? (
        <div className="animate-rise border-b border-line bg-card px-3 py-2">
          <div className="mb-2 flex items-center justify-between">
            <span className="text-xs font-medium text-ink-subtle">
              {downloadLabel}
            </span>
            <button
              type="button"
              aria-label={closeLabel}
              onClick={onToggleDownload}
              className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-lg text-ink-muted hover:bg-card-hover hover:text-ink cursor-pointer"
            >
              <X size={16} aria-hidden="true" />
            </button>
          </div>
          {files.length === 0 ? (
            <p className="py-2 text-sm text-ink-muted">{noFilesLabel}</p>
          ) : (
            <ul className="flex max-h-48 flex-col gap-1 overflow-y-auto">
              {files.map((file) => (
                <li key={file.path}>
                  <button
                    type="button"
                    onClick={() => onDownloadFile(file.path)}
                    className="flex min-h-11 w-full items-center justify-between rounded-lg border border-line bg-deep px-3 py-2 text-left font-mono text-xs text-ink transition-colors hover:border-line-strong hover:text-accent cursor-pointer"
                  >
                    <span className="truncate">{file.label}</span>
                    <Download size={14} aria-hidden="true" className="shrink-0" />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      ) : null}

      <div
        ref={terminalContainerRef}
        className="h-[60vh] min-h-[340px] max-h-[640px] w-full bg-deep p-3"
      />

      {hiddenInputs}
    </section>
  );
}
