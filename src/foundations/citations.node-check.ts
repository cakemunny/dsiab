/* =============================================================================
   citations.node-check.ts: A DOCUMENT CITES ONLY PATHS ITS READER CAN OPEN ([[agent-files-and-docs-layout]] G4)
   -----------------------------------------------------------------------------
   Node-mode guard, in the same harness as registry.node-check.ts. It runs with
   vitest.node.config.ts, `npm run test:tokens` and the pretest hook.

   A citation is a promise that the reader can open the thing named. Two readers
   receive documents from this system and each can open a different set of
   files, so the promise is checked twice.

   Two defects made this guard. The old AGENTS.md told consumers to read
   REFERENCES.md, which did not ship, and a shipped reviewer cited
   `bin/gates/README.md`, which is private. Neither shows up in a type check or
   a render, and a reader who follows the citation finds nothing.

   TWO ARMS:

     SHIPPED: the documents a consumer receives in the package (every `.md`
       matched by `package.json` `files`, plus README.md) cite only paths the
       package contains, a `files` entry or a path under a directory entry.
       A path into this system's source that the package does not ship counts
       only when its line links to the public GitHub repository and the
       repository holds the path.
     TRACKED: the public documents a reader of the GitHub repository sees cite
       only paths the repository holds, listed by
       `git ls-files --cached --others --exclude-standard` and present on disk.
       A file staged for the next commit counts and an ignored one does not.
       Ignored means private, and a private path fails here.

   In both arms a path in the reader's own project (CONSUMER_SIDE) is present by
   definition, and so is `dist/`, which the build writes and the package ships.

   THE LEDGER'S EVIDENCE PARTS ARE NOT READ. An Evidence part quotes an entry
   word for word as it read before a rewrite, so a path in it records what
   existed then and promises nothing now, and the package copy of the ledger
   strips it. The skip runs in `docs/DECISIONS.md` only. It starts at the
   `**Evidence.**` label and ends at the first line that is neither blank nor a
   `>` quote line, so a sentence after a quote is still checked.

   WHAT IS A CITATION. A backticked token or a Markdown link target that is not
   a URL, a glob, a placeholder or a command line, and that either
     - ends in a known file extension after a name (a bare suffix such as
       `.logic.test.ts` is a file kind, not a file), or
     - holds a `/` and is ROOTED: its first folder is a top-level folder of the
       repository, or it ends in `/`. An unrooted slash token is a name and not
       a path: a docs page title, a module specifier the registry resolves, an
       alternation (`Ctrl/Cmd+A`, `--ds-icon-xs/sm/md`), a slash command
       (`/config`) or a repository slug.
   A path inside an installed dependency (`@scope/name/file.mjs`, or
   `name/dist/index.mjs`) cites that dependency, not this repository, and is
   skipped. An agent tool's `@path` import cites `path`. Fenced code blocks
   are commands and are skipped. A trailing `:line` or `#anchor` is dropped,
   and a rooted path without an extension is a module specifier that resolves
   to its source file.

   WHAT RESOLVES. A rooted path resolves exactly, against the repository root or
   the citing file's folder (a page in `docs/` may name `GUIDELINES.md` beside
   it). An unrooted file name or tail (`rules.md`, `references/rules.md`)
   resolves to any file the reader can open that ends with it. Shorthand after
   a full path passes, and a name the reader cannot open anywhere still fails,
   which is the REFERENCES.md defect.

   `dist/` is not scanned. It is build output, and `dist/DECISIONS.md` is a
   copy of `docs/DECISIONS.md`, which the TRACKED arm reads.

   CITATIONS_UNDER_TEST names a directory that mirrors repository-relative
   paths. A document found there replaces the real one, so a planted citation
   proves each arm goes red without editing a repository file.
   ============================================================================= */
import { execFileSync } from "node:child_process";
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { join, posix, relative } from "node:path";
import { test, expect } from "vitest";

const ROOT = join(import.meta.dirname, "..", "..");
const UNDER_TEST = process.env.CITATIONS_UNDER_TEST;

const EXTENSION = /[^./][^/]*\.(md|mjs|js|ts|tsx|json|css|yml|yaml|sh)$/;
/** A file kind: a run of suffixes with no name in front of them. */
const FILE_KIND = /^(\.(stories|logic|test|proto|node-check|generated|d))*\.[a-z]+$/;

/**
 * The reader's own project, never this repository: the package as installed,
 * its exports, the folders and files `dsiab init` and `docs/AGENT-SETUP.md`
 * tell the reader's agent tools to use, the `.screenshots/` folder the
 * reader's agent writes its visual proof into, the token override file
 * `dsiab init` writes at the project root (`bin/dsiab-init.mjs` TOKENS_FILE,
 * named from a nested entry as `../dsiab-tokens.css`), and the `app/` folder
 * it looks in for an entry file.
 */
const CONSUMER_SIDE = new RegExp(
  [
    String.raw`^node_modules/dsiab(/|$)`,
    String.raw`^dsiab/`,
    String.raw`^\.(agents|claude|codex|gemini|screenshots)/`,
    String.raw`^\.github/((skills|agents)(/|$)|$)`,
    String.raw`^(AGENTS|CLAUDE|GEMINI|CLAUDE\.local|AGENTS\.override)\.md$`,
    String.raw`^settings\.json$`,
    String.raw`^(\.\./)*dsiab-tokens\.css$`,
    String.raw`^app/$`,
  ].join("|"),
);

/** The public repository a shipped document may link to for source it does not ship. */
const PUBLIC_REPO = "github.com/cakemunny/dsiab";

/**
 * Tokens that look like paths and are not, matched as written. Each entry
 * says why: an entry without a reason is a citation somebody chose not to fix.
 */
const NOT_A_PATH: RegExp[] = [
  // A placeholder for the file under review: a one-letter capital name.
  /(^|\/)[A-Z]\.[a-z]+$/,
  // A placeholder in a report template, `path/to/` followed by a made-up name.
  /^path\/to\//,
];

export type Citation = { file: string; line: number; path: string };

/** Read a document, preferring its copy under CITATIONS_UNDER_TEST. */
function readDoc(rel: string): string {
  const planted = UNDER_TEST ? join(UNDER_TEST, rel) : undefined;
  return readFileSync(planted && existsSync(planted) ? planted : join(ROOT, rel), "utf8");
}

function repositoryFiles(): Set<string> {
  const listed = execFileSync("git", ["ls-files", "--cached", "--others", "--exclude-standard"], {
    cwd: ROOT,
    encoding: "utf8",
  });
  return new Set(listed.split("\n").filter((f) => f && existsSync(join(ROOT, f))));
}

/** Top-level folders of the repository, plus the two a build and an install create. */
function topFolders(repo: Set<string>): Set<string> {
  const folders = new Set(["dist", "node_modules"]);
  for (const f of repo) if (f.includes("/")) folders.add(f.slice(0, f.indexOf("/")));
  return folders;
}

/** Installed package names, each scoped one also under its bare name, as prose often writes it. */
function installedPackages(): Set<string> {
  const modules = join(ROOT, "node_modules");
  const names = new Set<string>();
  if (!existsSync(modules)) return names;
  for (const entry of readdirSync(modules)) {
    if (!entry.startsWith("@")) names.add(entry);
    else
      for (const name of readdirSync(join(modules, entry))) {
        names.add(`${entry}/${name}`);
        names.add(name);
      }
  }
  return names;
}
const PACKAGES = installedPackages();

/** A path anchored at the repository root: it ends in `/`, or starts at a top-level folder. */
function isRooted(path: string, folders: Set<string>): boolean {
  return path.endsWith("/") || (path.includes("/") && folders.has(path.slice(0, path.indexOf("/"))));
}

/** Every cited path in a Markdown document, with its line. */
export function citationsIn(file: string, text: string, folders: Set<string>): Citation[] {
  const out: Citation[] = [];
  let fenced = false;
  let evidence = false;
  text.split("\n").forEach((content, i) => {
    if (/^\s*(```|~~~)/.test(content)) {
      fenced = !fenced;
      return;
    }
    if (fenced) return;
    if (file === "docs/DECISIONS.md" && /^\*\*Evidence\.\*\*/.test(content)) evidence = true;
    else if (evidence && (content.trim() === "" || content.startsWith(">"))) return;
    else evidence = false;
    const tokens = [
      ...content.matchAll(/`([^`]+)`/g),
      ...content.matchAll(/\]\(([^)\s]+)(?:\s+"[^"]*")?\)/g),
      ...content.matchAll(/^\s*\[[^\]]+\]:\s*(\S+)/g),
    ].map((m) => m[1].trim());
    for (const token of tokens) {
      if (/\s/.test(token)) continue; // a flag or a command line
      if (/^[a-z][a-z0-9+.-]*:/i.test(token)) continue; // a URL, mailto: or similar
      if (/[*<>{}]/.test(token)) continue; // a glob or a placeholder
      let path = token.replace(/#.*$/, "").replace(/:(\d+([-,]\d+)*|N+)$/, "").replace(/^\.\//, "");
      if (path.startsWith("@")) {
        // `@scope/name/…` is a file inside a scoped dependency. Any other `@path`
        // is an agent tool's import syntax, and it cites `path`.
        if (PACKAGES.has(path.split("/").slice(0, 2).join("/"))) continue;
        path = path.slice(1).replace(/^\.\//, "");
      }
      const head = path.split("/")[0];
      if (path.includes("/") && !folders.has(head) && PACKAGES.has(head)) continue; // a file inside a dependency
      if (FILE_KIND.test(path) || NOT_A_PATH.some((re) => re.test(path))) continue;
      if (EXTENSION.test(path) || isRooted(path, folders)) out.push({ file, line: i + 1, path });
    }
  });
  return out;
}

/** True when the reader can open `c.path` from a tree of `files`, by the rules in the header. */
function opens(files: Set<string>, folders: Set<string>, c: Citation): boolean {
  if (CONSUMER_SIDE.test(c.path) || c.path.startsWith("dist/")) return true;
  const readings = new Set([
    posix.normalize(c.path.replace(/^\//, "")),
    posix.normalize(posix.join(posix.dirname(c.file), c.path)),
  ]);
  for (const p of readings) {
    // A module specifier names its file without the extension.
    if (["", ".ts", ".tsx", ".mjs", ".js"].some((ext) => files.has(p + ext))) return true;
    const dir = `${p.replace(/\/$/, "")}/`;
    for (const f of files) if (f.startsWith(dir)) return true;
  }
  if (isRooted(c.path, folders)) return false;
  const tail = `/${c.path.replace(/\/$/, "")}`;
  for (const f of files) if (`/${f}`.endsWith(tail) || `/${f}`.includes(`${tail}/`)) return true;
  return false;
}

/** Every file on disk the package's `files` list packs, plus what npm always packs. */
function packedFiles(): Set<string> {
  const entries: string[] = JSON.parse(readFileSync(join(ROOT, "package.json"), "utf8")).files;
  const packed = new Set(["package.json", "README.md"]);
  for (const entry of entries) {
    const abs = join(ROOT, entry);
    if (!existsSync(abs)) continue;
    if (!statSync(abs).isDirectory()) packed.add(entry);
    else
      for (const e of readdirSync(abs, { recursive: true, withFileTypes: true }))
        if (e.isFile()) packed.add(relative(ROOT, join(e.parentPath, e.name)).split("\\").join("/"));
  }
  return packed;
}

/** Every `.md` the package ships, bar the build output in `dist/`. */
export function shippedDocs(): string[] {
  return [...packedFiles()].filter((f) => f.endsWith(".md") && !f.startsWith("dist/")).sort();
}

/** The public documents a reader of the GitHub repository sees. */
export function trackedDocs(): string[] {
  const root = ["AGENTS.md", "CONTRIBUTING.md", "SECURITY.md", "CODE_OF_CONDUCT.md", "README.md"];
  return [...repositoryFiles()]
    .filter(
      (f) =>
        root.includes(f) ||
        /^docs\/[^/]+\.md$/.test(f) ||
        /^skills\/[^/]+\/(SKILL|references\/[^/]+)\.md$/.test(f),
    )
    .sort();
}

/** Citations in shipped documents that the package does not contain. */
export function danglingShipped(): Citation[] {
  const packed = packedFiles();
  const repo = repositoryFiles();
  const folders = topFolders(repo);
  return shippedDocs().flatMap((doc) => {
    const lines = readDoc(doc).split("\n");
    return citationsIn(doc, lines.join("\n"), folders).filter(
      (c) =>
        !opens(packed, folders, c) &&
        !(lines[c.line - 1].includes(PUBLIC_REPO) && opens(repo, folders, c)),
    );
  });
}

/** Citations in public repository documents that the repository does not hold. */
export function danglingTracked(): Citation[] {
  const repo = repositoryFiles();
  const folders = topFolders(repo);
  return trackedDocs().flatMap((doc) =>
    citationsIn(doc, readDoc(doc), folders).filter((c) => !opens(repo, folders, c)),
  );
}

function report(list: Citation[]): string {
  return list.map((c) => `  ${c.file}:${c.line}  \`${c.path}\``).join("\n");
}

test("SHIPPED: every path a packed document cites is in the package ([[agent-files-and-docs-layout]] G4)", () => {
  const dangling = danglingShipped();
  expect(
    dangling,
    `These shipped documents cite paths the package does not contain:\n${report(dangling)}\n` +
      "Fix: cite what ships (a `files` entry, or a `dsiab/` export), link the public GitHub " +
      `repository (https://${PUBLIC_REPO}) on the same line for source that does not ship, or drop ` +
      "the citation. A token that only looks like a path goes in NOT_A_PATH with its reason.",
  ).toEqual([]);
});

test("TRACKED: every path a public repository document cites is in the repository ([[agent-files-and-docs-layout]] G4)", () => {
  const dangling = danglingTracked();
  expect(
    dangling,
    `These public documents cite paths the repository does not hold, or holds only as ignored:\n${report(dangling)}\n` +
      "Fix: cite a tracked path, or drop the citation. A private path stays private and is never " +
      "cited from a public document. A token that only looks like a path goes in NOT_A_PATH with its reason.",
  ).toEqual([]);
});
