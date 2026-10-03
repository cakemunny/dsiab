#!/usr/bin/env node
/**
 * Installs the tracked hook sources in scripts/git-hooks/ into .git/hooks/ — native git hooks always
 * live outside the repo's tracked tree (local machine only), so this copy step is how a tracked hook
 * source actually becomes active. Resolves the SHARED .git dir (`git rev-parse --git-common-dir`), so
 * running this from any worktree installs the hook for every worktree + the main checkout alike.
 *
 * Runs automatically via the "prepare" npm lifecycle script. This repo's worktrees are provisioned by
 * `cp -a`ing node_modules rather than `npm install`, so re-run manually after adding a new worktree:
 *   node scripts/install-git-hooks.mjs
 *
 * Hooks are a CHECKOUT convenience, never a build requirement, so this exits 0 whenever there is no
 * checkout to install them into. The distributed zip (`git archive`) carries no .git, and `npm install`
 * fails the whole install if "prepare" exits non-zero — a consumer unpacking the zip must not be told
 * their install broke. `git rev-parse` also searches PARENT directories, so an unpacked copy sitting
 * inside an unrelated repository would otherwise write this repo's hooks into that one; requiring the
 * discovered toplevel to BE this package root rules that out (a worktree's toplevel is its own root,
 * so worktrees still install normally).
 */
import { readdirSync, copyFileSync, chmodSync, existsSync, mkdirSync, realpathSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { dirname, join, resolve } from "node:path";

const HERE = dirname(fileURLToPath(import.meta.url));
const SOURCE_DIR = join(HERE, "git-hooks");
const PACKAGE_ROOT = dirname(HERE);

const git = (...args) =>
  execFileSync("git", args, { cwd: PACKAGE_ROOT, encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }).trim();

const skip = (reason) => {
  console.log(`skipping git hook install: ${reason}`);
  process.exit(0);
};

let toplevel;
let gitCommonDir;
try {
  toplevel = git("rev-parse", "--show-toplevel");
  gitCommonDir = resolve(PACKAGE_ROOT, git("rev-parse", "--git-common-dir"));
} catch {
  skip("not a git checkout");
}

const samePath = (a, b) => {
  try {
    return realpathSync(a) === realpathSync(b);
  } catch {
    return false;
  }
};
if (!samePath(toplevel, PACKAGE_ROOT)) skip(`${PACKAGE_ROOT} is not the root of the git repo at ${toplevel}`);

// The changelog hooks commit on `main` by themselves ([[changelog-regeneration]]), which only the maintainer's clone wants.
// A contributor who clones the public repository and runs `npm install` gets no hooks. The marker is
// `MAINTAINING.md`, which stays on the maintainer's disk and never reaches the public repository.
if (!existsSync(join(PACKAGE_ROOT, "MAINTAINING.md"))) skip("MAINTAINING.md is absent, so this is not the maintainer's clone");

const hooksDir = join(gitCommonDir, "hooks");
if (!existsSync(hooksDir)) mkdirSync(hooksDir, { recursive: true });

for (const file of readdirSync(SOURCE_DIR)) {
  const dest = join(hooksDir, file);
  copyFileSync(join(SOURCE_DIR, file), dest);
  chmodSync(dest, 0o755);
  console.log(`installed git hook: ${file} -> ${dest}`);
}
