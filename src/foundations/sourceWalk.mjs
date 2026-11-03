/**
 * sourceWalk.mjs — walk a project's tree, collect the files a source scan can read, and read them,
 * recording everything it skipped and why, so a scan can state its own reach.
 *
 * `ds-check` and `dsiab usage` both walk through it ([[local-usage-scan]]). The named records,
 * `skippedDirNames` and `symlinks`, exist for the usage report, which lists each gap by name. The
 * rule checker reads the counts it always read.
 *
 * Plain ESM, `node:` imports only: it has to run in a consumer's repo with nothing installed but this
 * package.
 */
import { readdirSync, readFileSync, statSync, lstatSync } from "node:fs";
import { join, extname } from "node:path";
import { SCANNED_EXT } from "./sourceRegions.mjs";

export const DIR_IGNORE = new Set([
  "node_modules", "dist", "build", "out", "coverage", "vendor", "tmp", "temp",
  "storybook-static", "__snapshots__",
]);
/** Files above this are generated or vendored in practice; reading them produces noise, not findings. */
export const MAX_FILE_BYTES = 2_000_000;

/** Why a directory was not entered: its name is in DIR_IGNORE, or it begins with ".". */
export const SKIP_IGNORED = "ignored";
export const SKIP_HIDDEN = "hidden";

/**
 * Collect the files under `root` that a source scan can read.
 *
 * `skippedDirs` counts the directories not entered. `skippedDirNames` names each one with its reason,
 * and `symlinks` names each symbolic link, which the walk never follows. Both are additive: the rule
 * checker prints the count it always printed, and the usage report lists the names.
 *
 * @returns {{files:string[], scannedByExt:Map<string,number>, skippedByExt:Map<string,number>,
 *            skippedDirs:number, skippedDirNames:{path:string,reason:string}[], symlinks:string[],
 *            tooLarge:string[], unreadable:string[]}} */
export function collectFiles(root) {
  const files = [];
  const scannedByExt = new Map();
  const skippedByExt = new Map();
  const tooLarge = [];
  const unreadable = [];
  const skippedDirNames = [];
  const symlinks = [];
  let skippedDirs = 0;

  const bump = (map, ext) => map.set(ext, (map.get(ext) ?? 0) + 1);

  // A root that cannot be stat'd — missing, or not permitted — is reported the way an unreadable
  // directory inside the tree already is: it joins `unreadable` and the run ends on NOTHING READ.
  // `checkTree` is a library entry point as well as the CLI's, and the CLI's own path check cannot
  // cover a directory deleted between the check and the walk; either way a caller gets a report
  // rather than an ENOENT stack trace.
  let rootStat;
  try {
    rootStat = statSync(root);
  } catch {
    unreadable.push(root);
    return { files, scannedByExt, skippedByExt, skippedDirs, skippedDirNames, symlinks, tooLarge, unreadable };
  }
  if (rootStat.isFile()) {
    const ext = extname(root).toLowerCase();
    if (SCANNED_EXT.includes(ext)) { files.push(root); bump(scannedByExt, ext); }
    else bump(skippedByExt, ext || "(no extension)");
    return { files, scannedByExt, skippedByExt, skippedDirs, skippedDirNames, symlinks, tooLarge, unreadable };
  }

  const walk = (dir) => {
    let entries;
    try {
      entries = readdirSync(dir, { withFileTypes: true });
    } catch {
      unreadable.push(dir);
      return;
    }
    for (const entry of entries) {
      const p = join(dir, entry.name);
      if (entry.isSymbolicLink()) { symlinks.push(p); continue; }
      if (entry.isDirectory()) {
        const reason = DIR_IGNORE.has(entry.name) ? SKIP_IGNORED : entry.name.startsWith(".") ? SKIP_HIDDEN : null;
        if (reason) { skippedDirs++; skippedDirNames.push({ path: p, reason }); continue; }
        walk(p);
        continue;
      }
      if (!entry.isFile()) continue;
      const ext = extname(entry.name).toLowerCase();
      if (!SCANNED_EXT.includes(ext)) { bump(skippedByExt, ext || "(no extension)"); continue; }
      if (/\.min\.(css|js)$/i.test(entry.name)) { bump(skippedByExt, ".min" + ext); continue; }
      let size = 0;
      try {
        size = lstatSync(p).size;
      } catch {
        unreadable.push(p);
        continue;
      }
      if (size > MAX_FILE_BYTES) { tooLarge.push(p); continue; }
      files.push(p);
      bump(scannedByExt, ext);
    }
  };
  walk(root);
  files.sort();
  symlinks.sort();
  skippedDirNames.sort((a, b) => (a.path < b.path ? -1 : a.path > b.path ? 1 : 0));
  return { files, scannedByExt, skippedByExt, skippedDirs, skippedDirNames, symlinks, tooLarge, unreadable };
}

/**
 * Read every collected file as UTF-8. A file that cannot be read joins `unreadable`, after the paths
 * the walk could not open, so a scan reports it instead of stopping.
 *
 * @param {{files:string[], unreadable:string[]}} inventory what `collectFiles` returned
 * @returns {{sources:{file:string,src:string}[], unreadable:string[]}}
 */
export function readSources(inventory) {
  const sources = [];
  const unreadable = [...inventory.unreadable];
  for (const file of inventory.files) {
    try {
      sources.push({ file, src: readFileSync(file, "utf8") });
    } catch {
      unreadable.push(file);
    }
  }
  return { sources, unreadable };
}
