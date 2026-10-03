/**
 * The private term list, `.private-terms.json` at the repository root.
 *
 * The public guards need the names of private review tools, internal commit ids and personal
 * identifiers to keep them out of public files. Writing those names into the
 * guards would publish them, so they live in one local file that git never commits (it is listed
 * in `.git/info/exclude`, not in the public `.gitignore`). The guards read it when it is present.
 * In a clone without it, each guard runs its generic rows alone.
 *
 * Shape:
 *   banned          rows of { term, pattern, planted }. `term` is the label a report prints,
 *                   `pattern` is a regular expression source compiled with the `g` flag, and
 *                   `planted` is one sample sentence the pattern matches, for the REVERSE arm of
 *                   `src/foundations/dist-decisions.node-check.ts`.
 *   changelogTerms  rows of [pattern, replacement]. `pattern` is a regular expression source
 *                   compiled with the `gi` flags, applied to commit summaries before the generic
 *                   rows of `scripts/gen-changelog.mjs`.
 *   buildTerms      plain strings that `scripts/scan-public-build.mjs` searches the built output
 *                   for, without regard to case.
 */
import { existsSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

export const PRIVATE_TERMS_PATH = resolve(dirname(fileURLToPath(import.meta.url)), "..", ".private-terms.json");

/** The parsed file, or empty lists when the file is absent. A malformed file stops the caller with a parse error. */
export function readPrivateTerms() {
  if (!existsSync(PRIVATE_TERMS_PATH)) return { banned: [], changelogTerms: [], buildTerms: [] };
  const raw = JSON.parse(readFileSync(PRIVATE_TERMS_PATH, "utf8"));
  return { banned: raw.banned ?? [], changelogTerms: raw.changelogTerms ?? [], buildTerms: raw.buildTerms ?? [] };
}
