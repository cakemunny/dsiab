/* =============================================================================
   site-reference.node-check.ts — THE DOCS SITE'S llms.txt AND MARKDOWN TWINS
   ([[compiled-component-reference]])
   -----------------------------------------------------------------------------
   `scripts/site-reference.mjs` writes the package's reference files, the roster
   and the ledger beside the built Storybook, plus an `llms.txt` that links
   them. This lane needs no Storybook build: it checks the in-memory site map.

   `llmsProblems` is the one checker: llms.txt lists every available component
   and only those, and every link is site-absolute and names a file the step
   writes. The real run and the red proofs call the same function.
   ============================================================================= */
import { readFileSync } from "node:fs";
import { describe, test, expect } from "vitest";
import { buildReference } from "../../scripts/dist-reference.mjs";
import { siteFiles, missingStories } from "../../scripts/site-reference.mjs";

const registry: { name: string; status: string }[] = JSON.parse(readFileSync("registry.json", "utf8"));
const ported = registry.filter((e) => e.status === "ported").map((e) => e.name).sort();
const files: Map<string, string> = siteFiles();
const llms = files.get("llms.txt")!;

/** Everything wrong with one llms.txt against the files the site step writes. Pure. */
function llmsProblems(text: string, written: Map<string, string>, available: string[]): string[] {
  const out: string[] = [];
  if (!/^# dsiab\n\n> /.test(text)) out.push("does not open on an H1 and a blockquote summary");
  const links = [...text.matchAll(/\]\(([^)]*)\)/g)].map((m) => m[1]);
  for (const href of links) {
    if (!href.startsWith("/") || href.startsWith("//")) out.push(`link ${href} is not site-absolute`);
    else if (!written.has(href.slice(1))) out.push(`link ${href} names no file the site step writes`);
  }
  const listed = links.flatMap((h) => /^\/components\/(\w+)\.md$/.exec(h)?.[1] ?? []).filter((n) => n !== "index");
  for (const n of available.filter((n) => !listed.includes(n))) out.push(`available component ${n} is not listed`);
  for (const n of listed.filter((n) => !available.includes(n))) out.push(`${n} is listed and is not available`);
  if (new Set(listed).size !== listed.length) out.push("a component is listed twice");
  return out;
}

describe("the docs site's llms.txt ([[compiled-component-reference]])", () => {
  test("the real llms.txt has no problem", () => {
    expect(llmsProblems(llms, files, ported)).toEqual([]);
  });

  test("RED: a dropped component, an extra one, a dead link and a full URL each fail", () => {
    expect(llmsProblems(llms.replace("- [Button](/components/Button.md)\n", ""), files, ported)).toEqual([
      "available component Button is not listed",
    ]);
    const extra = llms.replace("## Optional", "- [Markdown](/components/Markdown.md)\n\n## Optional");
    expect(llmsProblems(extra, files, ported)).toEqual([
      "link /components/Markdown.md names no file the site step writes",
      "Markdown is listed and is not available",
    ]);
    const absolute = llms.replace("(/rules.md)", "(https://dsiab.pages.dev/rules.md)");
    expect(llmsProblems(absolute, files, ported)).toEqual(["link https://dsiab.pages.dev/rules.md is not site-absolute"]);
  });
});

describe("the site publishes the package's bytes", () => {
  // A second whole TypeScript program over the source: 2.1 s on two cores, 2.6 s on the CI runner,
  // against vitest's 5 s default. The limit names that cost, as its twin in dist-reference does.
  test("components/ is exactly the package reference, byte for byte", () => {
    const site = [...files].filter(([p]) => p.startsWith("components/")).map(([p, t]) => [p.slice(11), t]);
    expect(site).toEqual([...buildReference()]);
  }, 30_000);

  test("a linked story id missing from index.json is reported (RED proof of the build-time check)", () => {
    const ids = [...new Set([...files.values()].flatMap((t) => [...t.matchAll(/\?path=\/story\/([a-z0-9-]+)/g)].map((m) => m[1])))];
    expect(ids.length).toBeGreaterThan(50);
    const entries = Object.fromEntries(ids.map((id) => [id, {}]));
    expect(missingStories(files, { entries })).toEqual([]);
    delete entries[ids[0]];
    expect(missingStories(files, { entries })).toEqual([ids[0]]);
  });

  test("postbuild-storybook writes the files before the public scan reads them", () => {
    const pkg = JSON.parse(readFileSync("package.json", "utf8"));
    expect(pkg.scripts["postbuild-storybook"]).toBe(
      "node scripts/site-reference.mjs storybook-static && node scripts/scan-public-build.mjs storybook-static",
    );
  });
});
