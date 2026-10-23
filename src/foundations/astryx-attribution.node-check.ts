/* =============================================================================
   astryx-attribution.node-check.ts — THE GUARD ON THE ASTRYX ATTRIBUTION HEADERS
   -----------------------------------------------------------------------------
   A source file that adapts Astryx code opens with
     // Portions derived from facebook/astryx <path> @ <commit> (MIT, © Meta Platforms)
   MIT requires the notice, and [[package-licence]] records that the headers name an
   upstream path and commit. Before this file, review alone checked them.

   FOUR CHECKS, each a separate test:

     1  WELL-FORMED. Every line that contains the phrase has an upstream path under
        `packages/core/src/` that ends in .ts or .tsx, then ` @ `, then a hex commit of
        7 to 40 characters.
     2  CONSISTENT. Every header cites a commit that THIRD-PARTY-NOTICES lists, and every
        commit that file lists is cited by at least one header. The notices file is the
        one place the full hashes live.
     3  THE PATH EXISTS AT THE COMMIT. This needs a local clone of facebook/astryx.
        Point `ASTRYX_CLONE` at one, or place it at a sibling folder named `astryx`.
        Each header then runs `git cat-file -e <commit>:<path>` in the clone. With no
        clone the test is SKIPPED, and the skip reason says so, so CI without a clone
        stays green. A skip is not a pass: run this check before a release.
     4  THE CHECKS CAN FAIL. Fixture headers with a wrong path and an unlisted commit
        must be rejected by checks 1 and 2, and the `git cat-file` helper must accept a
        file at HEAD in THIS repository and reject a missing one.
   ============================================================================= */
import { execFileSync } from "node:child_process";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join, relative, resolve } from "node:path";
import { describe, expect, test } from "vitest";

const ROOT = join(import.meta.dirname, "..", "..");
const SRC = join(ROOT, "src");
const SELF = "src/foundations/astryx-attribution.node-check.ts";
const PHRASE = "Portions derived from facebook/astryx";
const UPSTREAM_PREFIX = "packages/core/src/";

type Header = { file: string; line: number; text: string };
type Parsed = { path: string; commit: string };

/** Every source file under src/ that can carry a header. */
function sourceFiles(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    const p = join(dir, e.name);
    if (e.isDirectory()) return sourceFiles(p);
    return /\.(tsx?|css|mjs)$/.test(e.name) ? [p] : [];
  });
}

function findHeaders(): Header[] {
  const out: Header[] = [];
  for (const abs of sourceFiles(SRC)) {
    const file = relative(ROOT, abs);
    if (file === SELF) continue;
    readFileSync(abs, "utf8")
      .split("\n")
      .forEach((text, i) => {
        if (text.includes(PHRASE)) out.push({ file, line: i + 1, text });
      });
  }
  return out;
}

const STRICT = new RegExp(
  `${PHRASE} (${UPSTREAM_PREFIX}\\S+\\.tsx?) @ ([0-9a-f]{7,40})(?=\\s|$)`,
);

/** Returns the parsed header, or the reason it is malformed. */
function parseHeader(text: string): Parsed | string {
  const m = STRICT.exec(text);
  if (!m) {
    return `expected "${PHRASE} ${UPSTREAM_PREFIX}<path>.ts|.tsx @ <hex commit of 7 to 40 characters>"`;
  }
  return { path: m[1], commit: m[2] };
}

/** Full hashes that THIRD-PARTY-NOTICES lists, one per `<short> = <full>` line. */
function listedCommits(): string[] {
  const notices = readFileSync(join(ROOT, "THIRD-PARTY-NOTICES"), "utf8");
  return [...notices.matchAll(/^\s+([0-9a-f]{7,40})\s+=\s+([0-9a-f]{40})\s*$/gm)].map((m) => m[2]);
}

/** Consistency problems for a set of headers against the listed full hashes. */
function consistencyProblems(
  headers: readonly { where: string; commit: string }[],
  listed: readonly string[],
): string[] {
  const problems: string[] = [];
  for (const h of headers) {
    if (!listed.some((full) => full.startsWith(h.commit))) {
      problems.push(`${h.where}: commit ${h.commit} is not listed in THIRD-PARTY-NOTICES.`);
    }
  }
  for (const full of listed) {
    if (!headers.some((h) => full.startsWith(h.commit))) {
      problems.push(`THIRD-PARTY-NOTICES lists ${full}, but no header cites it. Remove the line or restore the header.`);
    }
  }
  return problems;
}

/** True when `<commit>:<path>` exists in the git repository at `repo`. */
function pathExistsAt(repo: string, commit: string, path: string): boolean {
  try {
    execFileSync("git", ["-C", repo, "cat-file", "-e", `${commit}:${path}`], { stdio: "ignore" });
    return true;
  } catch {
    return false;
  }
}

function findClone(): string | null {
  const candidates = [process.env.ASTRYX_CLONE, join(ROOT, "..", "astryx"), join(ROOT, "..", "..", "astryx")]
    .filter((c): c is string => Boolean(c))
    .map((c) => resolve(c));
  return candidates.find((c) => existsSync(join(c, ".git"))) ?? null;
}

const headers = findHeaders();
const parsed = headers.map((h) => ({ h, result: parseHeader(h.text) }));
const where = (h: Header) => `${h.file}:${h.line}`;

describe("Astryx attribution headers", () => {
  test("at least one header exists, so the scan is not reading nothing", () => {
    expect(headers.length).toBeGreaterThan(0);
  });

  test("1: every header names an upstream path and a hex commit", () => {
    const bad = parsed
      .filter((p) => typeof p.result === "string")
      .map((p) => `${where(p.h)}: ${p.result as string}\n    ${p.h.text.trim()}`);
    expect(bad, `malformed Astryx header(s) (${bad.length}):\n  ${bad.join("\n  ")}`).toEqual([]);
  });

  test("2: every header cites a commit that THIRD-PARTY-NOTICES lists, and every listed commit is cited", () => {
    const ok = parsed.flatMap((p) => (typeof p.result === "string" ? [] : [{ where: where(p.h), commit: p.result.commit }]));
    const listed = listedCommits();
    expect(listed.length, "THIRD-PARTY-NOTICES lists no `<short> = <full hash>` lines").toBeGreaterThan(0);
    const problems = consistencyProblems(ok, listed);
    expect(problems, `header and notices disagree (${problems.length}):\n  ${problems.join("\n  ")}`).toEqual([]);
  });

  const clone = findClone();
  test.skipIf(!clone)(
    clone ? "3: every named path exists at its commit" : "3: SKIPPED, no facebook/astryx clone (set ASTRYX_CLONE or place one at ../astryx)",
    () => {
      const missing = parsed.flatMap((p) =>
        typeof p.result === "string" || pathExistsAt(clone!, p.result.commit, p.result.path)
          ? []
          : [`${where(p.h)}: ${p.result.path} does not exist at ${p.result.commit}`],
      );
      expect(missing, `upstream path(s) not found (${missing.length}):\n  ${missing.join("\n  ")}`).toEqual([]);
    },
  );

  test("4: the checks fail on bad fixtures and the git helper tells present from absent", () => {
    const good = `// ${PHRASE} ${UPSTREAM_PREFIX}Pagination/Pagination.tsx @ 88c95e4 (MIT, © Meta Platforms)`;
    expect(typeof parseHeader(good)).toBe("object");

    const wrongPath = `// ${PHRASE} src/Pagination/Pagination.tsx @ 88c95e4 (MIT, © Meta Platforms)`;
    const noCommit = `// ${PHRASE} ${UPSTREAM_PREFIX}Pagination/Pagination.tsx (MIT, © Meta Platforms)`;
    expect(typeof parseHeader(wrongPath)).toBe("string");
    expect(typeof parseHeader(noCommit)).toBe("string");

    const listed = ["88c95e4ce358523fb93b4bb1eccd83fdafe058f7"];
    expect(consistencyProblems([{ where: "fixture", commit: "88c95e4" }], listed)).toEqual([]);
    expect(consistencyProblems([{ where: "fixture", commit: "deadbee" }], listed)).toHaveLength(2);

    expect(pathExistsAt(ROOT, "HEAD", "package.json")).toBe(true);
    expect(pathExistsAt(ROOT, "HEAD", "packages/core/src/Nope/Nope.tsx")).toBe(false);
  });
});
