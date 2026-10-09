/* =============================================================================
   gen-changelog.node-check.ts — THE CHANGELOG READS THIS PACKAGE'S HISTORY ONLY
   -----------------------------------------------------------------------------
   `scripts/gen-changelog.mjs` turns `git log` into `CHANGELOG.md` and the typed
   module the Changelog page imports. In a clone nested inside another
   repository, `git log` reads the host's history, and the script would write
   that history into both files. The script refuses unless the package root is
   the top of its repository.

   Each test copies the script into a throwaway repository, so no run touches
   this checkout. The reverse arm runs the same copy in a repository of its own
   and expects it to write, so the refusal cannot pass by failing for an
   unrelated reason.
   ============================================================================= */
import { execFileSync, spawnSync } from "node:child_process";
import { copyFileSync, existsSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, expect, test } from "vitest";

const ROOT = process.cwd();
const temps: string[] = [];

afterEach(() => {
  for (const dir of temps.splice(0)) rmSync(dir, { recursive: true, force: true });
});

const git = (cwd: string, ...args: string[]) =>
  execFileSync("git", ["-c", "user.name=test", "-c", "user.email=test@example.com", ...args], { cwd, stdio: "ignore" });

/** A copy of the package files the script needs, at `pkg`, with one commit in the repository at `repo`. */
function stage(repo: string, pkg: string) {
  mkdirSync(join(pkg, "scripts"), { recursive: true });
  mkdirSync(join(pkg, "docs"), { recursive: true });
  mkdirSync(join(pkg, "src/foundations"), { recursive: true });
  copyFileSync(join(ROOT, "scripts/gen-changelog.mjs"), join(pkg, "scripts/gen-changelog.mjs"));
  copyFileSync(join(ROOT, "scripts/private-terms.mjs"), join(pkg, "scripts/private-terms.mjs"));
  writeFileSync(join(pkg, "docs/DECISIONS.md"), "# Decisions\n");
  git(repo, "init", "-q", "-b", "main");
  git(repo, "add", "-A");
  git(repo, "commit", "-q", "-m", "feat: a commit in this repository");
}

const run = (pkg: string) =>
  spawnSync(process.execPath, [join(pkg, "scripts/gen-changelog.mjs")], { cwd: pkg, encoding: "utf8" });

test("in a clone nested inside another repository, the script stops and writes nothing", () => {
  const host = mkdtempSync(join(tmpdir(), "gen-changelog-host-"));
  temps.push(host);
  const pkg = join(host, "vendor/dsiab");
  stage(host, pkg);

  const result = run(pkg);

  expect(result.status).toBe(1);
  expect(result.stderr).toMatch(/is not the root of its git repository/);
  expect(existsSync(join(pkg, "CHANGELOG.md"))).toBe(false);
  expect(existsSync(join(pkg, "src/foundations/changelog.generated.ts"))).toBe(false);
});

test("REVERSE: in a repository of its own, the same copy writes both outputs", () => {
  const pkg = mkdtempSync(join(tmpdir(), "gen-changelog-own-"));
  temps.push(pkg);
  stage(pkg, pkg);

  const result = run(pkg);

  expect(result.status, result.stderr).toBe(0);
  expect(existsSync(join(pkg, "CHANGELOG.md"))).toBe(true);
  expect(existsSync(join(pkg, "src/foundations/changelog.generated.ts"))).toBe(true);
});
