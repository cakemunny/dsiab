// Copyright (c) Meta Platforms, Inc. and affiliates.
// Portions derived from facebook/astryx packages/core/src/FileInput/FileInput.tsx @ 88c95e4 (MIT, © Meta Platforms)

import { formatFileSize } from "./formatFileSize";

/* validateFiles — filter a picked/dropped batch to the subset that satisfies the field's constraints,
 * returning the SURVIVING files PLUS a per-file/aggregate list of rejection strings (PARTIAL ACCEPTANCE).
 *
 * LIFTED from Astryx (facebook/astryx `@astryxdesign/core`, commit 88c95e4,
 * `packages/core/src/FileInput/FileInput.tsx`, where it was an inline private helper) under the port
 * doctrine (DECISIONS [[catalog-as-specification]]). Kept BYTE-FAITHFUL to the upstream logic — the only change is extracting it to
 * its own module (importing the also-lifted `formatFileSize`) so the FileInput component and the node-lane
 * logic suite share one pure function.
 *
 * The contract — filter PROGRESSIVELY, keep the survivors, collect the rejections:
 *   1. accept   — each token is `.ext` (name suffix), `type/*` (MIME prefix), or an exact `type/subtype`;
 *                 a file matching NONE is dropped with a "not an accepted file type" error.
 *   2. maxSize  — a survivor larger than `maxSize` bytes is dropped with an "exceeds … limit" error.
 *   3. maxFiles — when `isMultiple` and more than `maxFiles` survive, the list is SLICED to the first
 *                 `maxFiles` with a single aggregate "Maximum N files allowed" error.
 * PARTIAL ACCEPTANCE: the good files survive in `valid` EVEN WHEN some siblings are rejected — the caller
 * commits `valid` and surfaces `errors`; it is never all-or-nothing. `valid` may be empty (all rejected).
 */
export function validateFiles(
  files: File[],
  accept: string | undefined,
  maxSize: number | undefined,
  maxFiles: number | undefined,
  isMultiple: boolean,
): { valid: File[]; errors: string[] } {
  const errors: string[] = [];
  let valid = files;

  if (accept) {
    const acceptedTypes = accept.split(",").map((t) => t.trim().toLowerCase());
    valid = valid.filter((file) => {
      const matches = acceptedTypes.some((type) => {
        if (type.startsWith(".")) {
          return file.name.toLowerCase().endsWith(type);
        }
        if (type.endsWith("/*")) {
          return file.type.startsWith(type.slice(0, -1));
        }
        return file.type.toLowerCase() === type;
      });
      if (!matches) {
        errors.push(`"${file.name}" is not an accepted file type`);
      }
      return matches;
    });
  }

  if (maxSize != null) {
    valid = valid.filter((file) => {
      if (file.size > maxSize) {
        errors.push(`"${file.name}" exceeds ${formatFileSize(maxSize)} limit`);
        return false;
      }
      return true;
    });
  }

  if (isMultiple && maxFiles != null && valid.length > maxFiles) {
    errors.push(`Maximum ${maxFiles} files allowed`);
    valid = valid.slice(0, maxFiles);
  }

  return { valid, errors };
}
