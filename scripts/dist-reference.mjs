#!/usr/bin/env node
/**
 * The compiled component reference: `dist/components/<Name>.md` and `dist/components/index.md`,
 * shipped as `dsiab/components/<Name>.md` ([[compiled-component-reference]]).
 *
 * An agent in a product repository has `node_modules/dsiab` and no running Storybook. The types
 * answer "which props", but a `.d.ts` is a barrel of re-exports and a reader has to chase each
 * name through two or three files to find out what a wrapper removed from the Radix component it
 * remembers. This compiles that answer once per roster entry: the exports, each export's own props
 * with their JSDoc, the Radix props it inherits, the Radix props it does NOT accept, and the import
 * line. Every file opens on DOCS_WIN, and links the version-locked docs page.
 *
 * It is generated and never committed, like `dist/registry.json`, so it cannot fall behind a
 * JSDoc edit: every build writes it again. Status, tier and `wraps` come from `buildDistRegistry`,
 * so the reference cannot disagree with the shipped roster.
 *
 * NO SIDE EFFECT ON IMPORT. `buildReference` is pure apart from reading the source tree, and the
 * write happens only when this file is the process entry point, so its guard can import it.
 *
 * Usage:  node scripts/dist-reference.mjs      (writes dist/components/*.md)
 */
import { readFileSync, writeFileSync, mkdirSync, readdirSync, rmSync } from "node:fs";
import { fileURLToPath, pathToFileURL } from "node:url";
import { dirname, resolve } from "node:path";
import { buildDistRegistry } from "./dist-registry.mjs";
import { docsUrlFor } from "../bin/docs-url.mjs";
import { openProgram } from "./reference/types.mjs";
import { pageFor } from "./reference/sources.mjs";
import { renderComponent, renderIndex } from "./reference/render.mjs";

export { DOCS_WIN } from "./reference/render.mjs";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");

/** Where the files land, relative to the package root. The guard holds `exports` to it. */
export const OUT_DIR = "dist/components";

/**
 * Entries whose parts wrap more than one Radix component, which a single `wraps` cannot name: each
 * pair is an export path prefix and the Radix component the parts under it mirror, longest prefix
 * first. `Tabs.Nav.*` is Radix `TabNav`, the rest of `Tabs` is Radix `Tabs`. Every name here must
 * appear in the entry's `buildingBlock`, which `dist-reference.node-check.ts` holds.
 */
export const PART_WRAPS = { Tabs: [["Tabs.Nav", "TabNav"], ["Tabs", "Tabs"]] };

/** The Radix label and refused names for an export (or a part) that wraps a Radix component. */
function refusalFor(program, entry, model) {
  if (!model.props) return null;
  const path = model.path ?? model.name;
  const pairs = PART_WRAPS[entry.name] ?? (entry.wraps ? [[entry.name, entry.wraps]] : []);
  for (const [prefix, radix] of pairs) {
    if (path !== prefix && !path.startsWith(`${prefix}.`)) continue;
    const part = path.slice(prefix.length + 1) || undefined;
    if (part?.includes(".")) return null;
    return { label: part ? `${radix}.${part}` : radix, names: program.notAccepted(model.props, radix, part) };
  }
  return null;
}

/**
 * Build every file in memory. Returns a Map from the file name (`Select.md`, `index.md`) to its
 * text, sorted by name so two builds are byte-identical. No writes and no clock.
 */
export function buildReference({ root = ROOT, version } = {}) {
  const pkgVersion = version ?? JSON.parse(readFileSync(resolve(root, "package.json"), "utf8")).version;
  const registry = JSON.parse(readFileSync(resolve(root, "registry.json"), "utf8"));
  const roster = buildDistRegistry(registry).components;
  const program = openProgram(root);
  const docsRoot = docsUrlFor(pkgVersion);
  const linkOf = (page) => (page.story ? `${docsRoot}/?path=/story/${page.story.id}` : `${docsRoot}/`);
  const items = [];
  for (const entry of roster.filter((e) => e.status === "available")) {
    const source = registry.find((e) => e.name === entry.name);
    const page = pageFor(root, source, registry);
    if (!entry.exports.length && !page.parent) {
      throw new Error(`reference: ${entry.name} has no exports and no parent page to point at`);
    }
    const models = entry.exports.map((name) => program.describe(name));
    items.push({ entry, page, models });
  }
  const files = new Map();
  for (const { entry, page, models } of items) {
    const ctx = { version: pkgVersion, linkOf, notAccepted: (m) => refusalFor(program, entry, m) };
    files.set(`${entry.name}.md`, renderComponent(entry, page, models, ctx));
  }
  const unavailable = roster.filter((e) => e.status !== "available");
  files.set("index.md", renderIndex(items, unavailable, pkgVersion));
  return new Map([...files].sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0)));
}

/** True when this module is the process entry point rather than an import. */
function isEntryPoint() {
  return Boolean(process.argv[1]) && import.meta.url === pathToFileURL(process.argv[1]).href;
}

if (isEntryPoint()) {
  const files = buildReference();
  const out = resolve(ROOT, OUT_DIR);
  mkdirSync(out, { recursive: true });
  // Only the top level is this script's. `dist/components/ui/` is the declaration tree tsc writes.
  for (const stale of readdirSync(out).filter((f) => f.endsWith(".md"))) rmSync(resolve(out, stale));
  let bytes = 0;
  for (const [name, text] of files) {
    writeFileSync(resolve(out, name), text);
    bytes += Buffer.byteLength(text);
  }
  console.log(`dist-reference: wrote ${files.size} files (${Math.round(bytes / 1024)} KB) -> ${out}`);
}
