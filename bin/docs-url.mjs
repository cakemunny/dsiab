/**
 * Where this system's documentation lives, in one place.
 *
 * The built Storybook is hosted on Cloudflare Pages. The production branch
 * (`main`) answers at DOCS_URL and always shows the latest stable release. Each
 * release also deploys to its own branch, and Pages keeps a permanent alias for
 * every branch, so the docs for one exact version never change after it ships.
 *
 * Three readers need these strings and must agree: `dsiab docs` in an installed
 * copy, the deploy workflow that picks the branch name, and the manifest and
 * README a person reads first. They all come from here, and a node-check holds
 * the manifest and the README to it.
 *
 * Zero dependencies, because `bin/dsiab.mjs` imports it from a consumer's
 * node_modules.
 */

import { spawn } from "node:child_process";

/** The Pages project. It is the first label of every hosted URL. */
export const DOCS_PROJECT = "dsiab";

/** The latest stable release's documentation. */
export const DOCS_URL = `https://${DOCS_PROJECT}.pages.dev`;

/**
 * Pages cuts a branch alias longer than this. A cut alias would point at the
 * wrong name, so a version that cannot fit is refused rather than truncated.
 * Source: https://community.cloudflare.com/t/algorithm-to-generate-a-preview-dns-subdomain-from-a-branch-name/477633
 */
export const MAX_ALIAS_LENGTH = 28;

/**
 * The Pages branch a release deploys to: `v` plus the version with every run of
 * characters other than a lowercase letter or a digit turned into one hyphen.
 * `0.9.0` becomes `v0-9-0`, and `0.9.0-rc.1` becomes `v0-9-0-rc-1`.
 *
 * Pages lowercases a branch name and replaces each other character with a
 * hyphen to make the alias. The name built here is already in that form, so
 * Pages keeps it exactly and the URL below is the one that exists.
 * Source: https://developers.cloudflare.com/pages/configuration/preview-deployments/#preview-aliases
 */
export function docsBranchFor(version) {
  const label = `v${String(version).toLowerCase()}`.replace(/[^a-z0-9]+/g, "-").replace(/-+$/, "");
  if (label.length > MAX_ALIAS_LENGTH) {
    throw new RangeError(
      `docs branch \`${label}\` for version ${version} is ${label.length} characters, and Pages cuts an ` +
        `alias at ${MAX_ALIAS_LENGTH}. Choose a shorter version string.`,
    );
  }
  return label;
}

/** The permanent documentation URL for one exact release. */
export function docsUrlFor(version) {
  return `https://${docsBranchFor(version)}.${DOCS_PROJECT}.pages.dev`;
}

/** Open a URL in the platform browser, and stay silent when there is none.
 *  A headless machine is a normal place to run `dsiab docs`, not an error.
 *  Both docs routes use this: the hosted URL from an install, and the local
 *  server in a checkout. */
export function openBrowser(url) {
  const cmd = process.platform === "darwin" ? "open" : process.platform === "win32" ? "start" : "xdg-open";
  const child = spawn(cmd, [url], { stdio: "ignore", detached: true, shell: process.platform === "win32" });
  child.on("error", () => {});
  child.unref();
}
