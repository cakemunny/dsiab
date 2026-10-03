// Copyright (c) Meta Platforms, Inc. and affiliates.
// Portions derived from facebook/astryx packages/core/src/FileInput/FileInput.tsx @ 88c95e4 (MIT, © Meta Platforms)

/* formatFileSize — render a byte count as a compact, human-readable size string.
 *
 * LIFTED from Astryx (facebook/astryx `@astryxdesign/core`, commit 88c95e4,
 * `packages/core/src/FileInput/FileInput.tsx`, where it was an inline private helper) under the port
 * doctrine (DECISIONS [[catalog-as-specification]]). Kept BYTE-FAITHFUL to the upstream logic — the only change is extracting it to
 * its own module so the FileInput component, validateFiles, and the node-lane logic suite share one pure
 * function.
 *
 * The contract (BINARY units, base 1024):
 *   • < 1 KiB              → whole bytes, e.g. "512 B" (no decimal)
 *   • < 1 MiB              → 1-decimal KB, e.g. "1.5 KB" (1024 → "1.0 KB")
 *   • ≥ 1 MiB              → 1-decimal MB, e.g. "2.4 MB" (1048576 → "1.0 MB")
 * "KB"/"MB" are the labels upstream ships (they denote the binary 1024 unit, not the SI 1000 one).
 */
export function formatFileSize(bytes: number): string {
  if (bytes < 1024) {
    return `${bytes} B`;
  }
  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`;
  }
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
