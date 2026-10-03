#!/usr/bin/env node
/**
 * The public build scan. It reads every text file of the built output and fails on a term that
 * must not ship.
 *
 * `DECISIONS.md` and the other sources carry their own guards, but the built output is what a
 * reader receives: the package tarball from `dist/` and the documentation site from
 * `storybook-static/`. A bundler can inline an absolute path, a raw import can carry a sentence
 * that no source guard reads, and a story can quote a person. This scan reads the artifact itself.
 *
 * TERMS. The generic terms are written here: `/Users/`, `/Volumes/`, `file:///` and a marker that
 * introduces a quote of the owner. The pattern for that marker matches its words across any run of
 * spaces, so this file never spells the marker out and the export scan of the repository does not
 * match it here. The personal identifiers live in `.private-terms.json` (see
 * `scripts/private-terms.mjs`) under `buildTerms`, matched without regard to case, and are read
 * when the file is present. A clone without the file scans the generic terms alone.
 *
 * OUTPUT IS SAFE TO SHARE. A private hit prints its label, `private term #N`, which is its
 * position in `buildTerms`, and never the matched text. A generic hit prints the generic term.
 * No line of built text is ever printed.
 *
 * Usage:  node scripts/scan-public-build.mjs [<folder> ...]
 *         With no folder, it scans `storybook-static/` and `dist/` at the repository root.
 * Exit:   0 when no term is found, 1 with a list of file and term when one is, 2 when no folder
 *         to scan exists.
 */
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, extname, join, relative, resolve } from "node:path";
import { readPrivateTerms } from "./private-terms.mjs";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");

/** Fonts and raster images. Anything else that holds a NUL byte counts as binary as well. */
const BINARY_EXTENSIONS = new Set([
  ".woff", ".woff2", ".ttf", ".otf", ".eot",
  ".png", ".jpg", ".jpeg", ".gif", ".webp", ".avif", ".ico", ".bmp",
]);

const GENERIC_TERMS = [
  { label: "/Users/", re: /\/Users\//g },
  { label: "/Volumes/", re: /\/Volumes\//g },
  { label: "file:///", re: /file:\/\/\//g },
  { label: "owner quote marker", re: /in\s+his\s+words/gi },
];

const PRIVATE_TERMS = readPrivateTerms().buildTerms.map((term, index) => ({
  label: `private term #${index + 1}`,
  needle: term.toLowerCase(),
}));

function countOf(haystack, needle) {
  let count = 0;
  for (let at = haystack.indexOf(needle); at !== -1; at = haystack.indexOf(needle, at + needle.length)) count += 1;
  return count;
}

function* filesUnder(dir) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) yield* filesUnder(path);
    else if (entry.isFile()) yield path;
  }
}

const requested = process.argv.slice(2);
const folders = (requested.length ? requested.map((f) => resolve(f)) : [
  resolve(ROOT, "storybook-static"),
  resolve(ROOT, "dist"),
]).filter((f) => existsSync(f) && statSync(f).isDirectory());

const shown = (path) => relative(process.cwd(), path) || ".";

if (folders.length === 0) {
  console.error(
    `scan-public-build: no folder to scan. Looked for ${
      requested.length ? requested.join(", ") : "storybook-static/ and dist/"
    }. Run the build first.`,
  );
  process.exit(2);
}

let read = 0;
const hits = [];

for (const folder of folders) {
  for (const file of filesUnder(folder)) {
    if (BINARY_EXTENSIONS.has(extname(file).toLowerCase())) continue;
    const bytes = readFileSync(file);
    if (bytes.includes(0)) continue;
    read += 1;
    const text = bytes.toString("utf8");
    for (const { label, re } of GENERIC_TERMS) {
      const count = (text.match(re) || []).length;
      if (count) hits.push({ file, label, count });
    }
    if (PRIVATE_TERMS.length) {
      const lower = text.toLowerCase();
      for (const { label, needle } of PRIVATE_TERMS) {
        const count = countOf(lower, needle);
        if (count) hits.push({ file, label, count });
      }
    }
  }
}

const scope = `${read} text file(s) under ${folders.map(shown).join(", ")}`;

if (hits.length) {
  console.error(`scan-public-build: ${hits.length} hit(s) in ${scope}. These terms must not ship:`);
  for (const { file, label, count } of hits) console.error(`  ${shown(file)}: ${label} x${count}`);
  process.exit(1);
}

console.log(`scan-public-build: no term found in ${scope}.`);
