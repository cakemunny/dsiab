#!/usr/bin/env node
/**
 * The facts `ds-check` reads in an installed package — `dist/check-facts.json` ([[ds-check-dsiab-rules]]).
 *
 * A tarball ships neither `src/tokens` nor the root `registry.json`, so the dsiab rules cannot derive
 * their facts there the way they do in a checkout. This writes the same derivation,
 * `buildCheckFacts` in `src/foundations/checkFacts.mjs`, into `dist/`, which ships. One function
 * produces both, so a checkout and an install cannot disagree about what a dsiab name is, and
 * `dsiab-rules.node-check.ts` fails when the file on disk drifts from it.
 *
 * NO SIDE EFFECT ON IMPORT, as in `dist-registry.mjs`: the write happens only when this file is the
 * process entry point.
 *
 * Usage:  node scripts/dist-check-facts.mjs      (writes dist/check-facts.json)
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { buildCheckFacts, FACTS_PATH } from "../src/foundations/checkFacts.mjs";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
export const OUT_PATH = resolve(ROOT, FACTS_PATH);

if (Boolean(process.argv[1]) && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const facts = buildCheckFacts(ROOT);
  mkdirSync(dirname(OUT_PATH), { recursive: true });
  writeFileSync(OUT_PATH, `${JSON.stringify(facts, null, 2)}\n`);
  console.log(
    `dist-check-facts: wrote ${facts.known.length} known names, ${facts.scales.length} colour scales and ` +
      `${Object.keys(facts.duplicates).length} Radix duplicates -> ${OUT_PATH}`,
  );
}
