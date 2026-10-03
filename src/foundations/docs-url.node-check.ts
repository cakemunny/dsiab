/* =============================================================================
   docs-url.node-check.ts — EVERY POINTER AT THE DOCS NAMES THE SAME HOST
   -----------------------------------------------------------------------------
   The built Storybook is hosted on Cloudflare Pages ([[docs-hosting]]). Latest answers at
   DOCS_URL, and each release keeps a permanent alias of its own. `bin/docs-url.mjs`
   is the one place those strings are built. `dsiab docs` in an installed copy,
   the deploy workflow, the manifest and the README all depend on it, and the
   last two are hand-written text that can drift from it. This holds them to it.

   The per-release alias is the part that fails quietly. Pages derives an alias
   from the branch name and cuts it at 28 characters. A version whose alias came
   out different from what `docsUrlFor` builds would send every installed user to
   a page that does not exist, and nothing would error until someone clicked it.
   ============================================================================= */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { test, expect } from "vitest";
import { DOCS_URL, docsBranchFor, docsUrlFor } from "../../bin/docs-url.mjs";

const ROOT = process.cwd();
const pkg = JSON.parse(readFileSync(join(ROOT, "package.json"), "utf8"));
const readme = readFileSync(join(ROOT, "README.md"), "utf8");

test("a release's docs URL is its version, hyphenated, under the Pages project", () => {
  expect(docsUrlFor("0.9.0")).toBe("https://v0-9-0.dsiab.pages.dev");
  expect(docsUrlFor("0.9.0-rc.1")).toBe("https://v0-9-0-rc-1.dsiab.pages.dev");
});

test("the branch built for a release is the alias Pages derives from it, unchanged", () => {
  // Deploying to branch X creates an alias from X: lowercase, anything outside [a-z0-9-] to a
  // hyphen, hyphens trimmed at both ends, cut at 28. That is the algorithm a Cloudflare engineer
  // published at https://community.cloudflare.com/t/algorithm-to-generate-a-preview-dns-subdomain-from-a-branch-name/477633
  // docsUrlFor promises the alias is X, so X must come back from that normalisation untouched.
  for (const version of ["0.9.0", "0.9.0-rc.1", "1.0.0-beta.2+build.7", "1.0.0--x.Y", pkg.version]) {
    const branch = docsBranchFor(version);
    const alias = branch.toLowerCase().replace(/[^a-z0-9-]/g, "-").replace(/^-+|-+$/g, "").slice(0, 28);
    expect(alias, `${version} → ${branch}`).toBe(branch);
  }
});

test("a version whose alias Pages would cut is refused, not silently shortened", () => {
  expect(() => docsBranchFor("10.20.30-release-candidate.12")).toThrow(RangeError);
});

test("package.json homepage is the hosted docs", () => {
  expect(
    pkg.homepage,
    "npm shows `homepage` as the package's first link. It must reach the docs, from bin/docs-url.mjs.",
  ).toBe(DOCS_URL);
});

test("the README's Documentation line names the hosted docs", () => {
  const line = readme.split("\n").find((l) => l.startsWith("**Documentation:**"));
  expect(line, "README.md needs a line starting `**Documentation:**` near the top").toBeDefined();
  expect(line).toContain(DOCS_URL);
});

test("the package ships the URL module, because `dsiab docs` imports it", () => {
  expect(pkg.files).toContain("bin/docs-url.mjs");
});

test("the package does not ship the local docs server, because it does not ship the bundle", () => {
  const files: string[] = pkg.files;
  expect(
    files.filter((entry) => entry.includes("dsiab-docs")),
    "bin/dsiab-docs.mjs must stay out of files[]. Shipping the server without the 23 MB bundle " +
      "beside it would give a consumer a command that starts and then reports a missing bundle.",
  ).toEqual([]);
});
