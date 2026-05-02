/**
 * Trigger a browser download for an in-memory Blob. Used by every
 * client-side export button. Kept tiny and dependency-free so it doesn't
 * pull anything into the export libs' dynamic chunks.
 */
export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  // Defer revocation so the browser has time to read the blob.
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function todayStamp(): string {
  return new Date().toISOString().slice(0, 10);
}
