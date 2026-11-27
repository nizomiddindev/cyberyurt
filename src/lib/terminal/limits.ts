import type { VirtualFileSystem } from "@/lib/terminal/types";

export const MAX_UPLOAD_FILE_BYTES = 5 * 1024 * 1024; // 5 MB per file
export const MAX_TOTAL_STORAGE_BYTES = 50 * 1024 * 1024; // 50 MB total per user

export type UploadValidationResult =
  | { ok: true }
  | { ok: false; reason: "fileTooLarge"; fileName: string }
  | { ok: false; reason: "totalQuotaExceeded" };

export function validateUploadSizes(
  incomingFiles: readonly { name: string; size: number }[],
  currentTotalBytes: number,
): UploadValidationResult {
  let addedBytes = 0;

  for (const file of incomingFiles) {
    if (file.size > MAX_UPLOAD_FILE_BYTES) {
      return { ok: false, reason: "fileTooLarge", fileName: file.name };
    }
    addedBytes += file.size;
  }

  if (currentTotalBytes + addedBytes > MAX_TOTAL_STORAGE_BYTES) {
    return { ok: false, reason: "totalQuotaExceeded" };
  }

  return { ok: true };
}

export async function getTotalStorageBytes(
  fs: VirtualFileSystem,
): Promise<number> {
  const allPaths = await fs.listAllFiles();
  let total = 0;
  for (const filePath of allPaths) {
    const info = await fs.stat(filePath);
    if (info && info.type === "file") {
      total += info.size;
    }
  }
  return total;
}
