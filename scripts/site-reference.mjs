#!/usr/bin/env node
/**
 * The docs site's Markdown twins and `llms.txt` ([[compiled-component-reference]]).
 *
 * An agent with only the web reads the site, and the site is a Storybook: every URL answers with the
 * same single-page HTML. This writes the files the package ships, byte for byte, beside the built
 * Storybook, so `/components/<Name>.md`, `/registry.json` and `/DECISIONS.md` answer as text, and an
 * `/llms.txt` index that links each of them. It reuses `buildReference` and the two dist builders
 * and renders nothing of its own except `llms.txt` and `_headers`.
 *
 * The component files link the docs page of the version they were built from, so `llms.txt` on the
 * latest site links that release's permanent alias by design.
 *
 * It fails closed: exit 1 when a story id that a component file links is missing from the built
 * `index.json`, and exit 2 when there is no `index.json`. It runs in `postbuild-storybook`, before
 * the public build scan, so the scan reads what it wrote. NO SIDE EFFECT ON IMPORT.
 *
 * Usage:  node scripts/site-reference.mjs storybook-static
 */
import { existsSync, readFileSync, writeFileSync, mkdirSync, rmSync } from "node:fs";
import { fileURLToPath, pathToFileURL } from "node:url";
import { dirname, resolve } from "node:path";
import { buildReference } from "./dist-reference.mjs";
import { distRegistryText } from "./dist-registry.mjs";
import { buildDistDecisions } from "./dist-decisions.mjs";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");

/** Package files the site publishes as they ship, keyed by their site path. */
const SHIPPED = { "AGENT-SETUP.md": "docs/AGENT-SETUP.md", "rules.md": "skills/dsiab/references/rules.md" };

/** `llms.txt`, in the llmstxt.org shape: H1, a blockquote summary, then H2 lists of links. */
export function renderLlms(names, version) {
  const link = (title, path, note) => `- [${title}](/${path})${note ? `: ${note}` : ""}`;
  return [
    "# dsiab",
    "",
    "> dsiab, Design System In A Box, is a brand-themeable React component and token layer over Radix Themes. " +
      "Each component below has a Markdown reference compiled from the package's types and roster: its exports, " +
      "the exact props each takes, the Radix props it inherits and the ones it does not accept, and the import line.",
    "",
    `These files are the ones dsiab ${version} ships as \`dsiab/components/<Name>.md\`. Each one links its docs ` +
      "page for that exact release, and where a file and its docs page disagree, the page is right.",
    "",
    "## Start here",
    "",
    link("Component index", "components/index.md", "every component by category, and what the package leaves out"),
    link("Rules", "rules.md", "the rules that bind code built on the system"),
    link("Agent setup", "AGENT-SETUP.md", "what `dsiab init` writes into a product repository"),
    "",
    "## Components",
    "",
    ...names.map((n) => link(n, `components/${n}.md`)),
    "",
    "## Optional",
    "",
    link("Roster", "registry.json", "every entry with its status, tier, `wraps` and exports"),
    link("Decisions", "DECISIONS.md", "the ruling ledger that `[[name]]` citations resolve against"),
    "",
  ].join("\n");
}

/** Cloudflare Pages `_headers`, so an em dash is not read as Latin-1. That Pages honours it here is unverified. */
const HEADERS = [["/llms.txt", "plain"], ...["/components/*", "/DECISIONS.md", ...Object.keys(SHIPPED).map((p) => `/${p}`)]
  .map((p) => [p, "markdown"])].map(([p, t]) => `${p}\n  Content-Type: text/${t}; charset=utf-8\n`).join("");

/** Every file the site step writes, as a Map from site path to text. Pure apart from reading the source. */
export function siteFiles({ root = ROOT } = {}) {
  const version = JSON.parse(readFileSync(resolve(root, "package.json"), "utf8")).version;
  const reference = buildReference({ root, version });
  const files = new Map([...reference].map(([name, text]) => [`components/${name}`, text]));
  files.set("registry.json", distRegistryText(JSON.parse(readFileSync(resolve(root, "registry.json"), "utf8"))));
  files.set("DECISIONS.md", buildDistDecisions(readFileSync(resolve(root, "docs/DECISIONS.md"), "utf8")).text);
  for (const [site, source] of Object.entries(SHIPPED)) files.set(site, readFileSync(resolve(root, source), "utf8"));
  const names = [...reference.keys()].filter((f) => f !== "index.md").map((f) => f.replace(/\.md$/, ""));
  files.set("llms.txt", renderLlms(names, version));
  files.set("_headers", HEADERS);
  return files;
}

/** The story ids the component files link that `index.json` does not hold. Pure. */
export function missingStories(files, index) {
  const known = new Set(Object.keys(index.entries ?? {}));
  const linked = new Set([...files.values()].flatMap((t) => [...t.matchAll(/\?path=\/story\/([a-z0-9-]+)/g)].map((m) => m[1])));
  return [...linked].filter((id) => !known.has(id)).sort();
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const out = resolve(process.argv[2] ?? "storybook-static");
  const indexPath = resolve(out, "index.json");
  if (!existsSync(indexPath)) {
    console.error(`site-reference: no ${indexPath}. Run \`storybook build\` first.`);
    process.exit(2);
  }
  const files = siteFiles();
  const missing = missingStories(files, JSON.parse(readFileSync(indexPath, "utf8")));
  if (missing.length) {
    console.error(`site-reference: ${missing.length} linked story id(s) not in index.json:\n  ${missing.join("\n  ")}`);
    process.exit(1);
  }
  rmSync(resolve(out, "components"), { recursive: true, force: true });
  for (const [path, text] of files) {
    mkdirSync(dirname(resolve(out, path)), { recursive: true });
    writeFileSync(resolve(out, path), text);
  }
  console.log(`site-reference: wrote ${files.size} files -> ${out}`);
}
