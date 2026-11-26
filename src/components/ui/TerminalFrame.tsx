"use client";

import type { ReactNode, RefObject } from "react";
import { Download, RotateCcw, Upload, X } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";

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
    <section className="overflow-hidden rounded-md border border-neutral-300 bg-white">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-neutral-300 bg-neutral-50 px-3 py-2">
        <div className="flex flex-wrap items-center gap-2">
          <Badge>{identityLabel}</Badge>
          <Badge>{storageLabel}</Badge>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="secondary"
            onClick={onUploadClick}
            disabled={disabled}
          >
            <Upload size={16} aria-hidden="true" />
            <span>{uploadLabel}</span>
          </Button>

          <Button
            variant="secondary"
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
              variant="secondary"
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
          className="border-b border-neutral-200 bg-neutral-100 px-3 py-2 text-xs text-neutral-800"
        >
          {statusMessage}
        </div>
      ) : null}

      {downloadOpen ? (
        <div className="border-b border-neutral-300 bg-neutral-50 px-3 py-2">
          <div className="mb-2 flex items-center justify-between">
            <span className="text-xs font-medium text-neutral-700">
              {downloadLabel}
            </span>
            <button
              type="button"
              aria-label={closeLabel}
              onClick={onToggleDownload}
              className="inline-flex min-h-11 min-w-11 items-center justify-center rounded text-neutral-700 hover:bg-neutral-200 cursor-pointer"
            >
              <X size={16} aria-hidden="true" />
            </button>
          </div>
          {files.length === 0 ? (
            <p className="py-2 text-sm text-neutral-600">{noFilesLabel}</p>
          ) : (
            <ul className="flex max-h-48 flex-col gap-1 overflow-y-auto">
              {files.map((file) => (
                <li key={file.path}>
                  <button
                    type="button"
                    onClick={() => onDownloadFile(file.path)}
                    className="flex min-h-11 w-full items-center justify-between rounded border border-neutral-200 bg-white px-3 py-2 text-left font-mono text-xs text-neutral-900 hover:bg-neutral-100 cursor-pointer"
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
        className="h-[60vh] min-h-[340px] max-h-[640px] w-full bg-neutral-950 p-2"
      />

      {hiddenInputs}
    </section>
  );
}
