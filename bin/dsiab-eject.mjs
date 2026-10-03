#!/usr/bin/env node
/**
 * `dsiab eject <Component>` — copy one component into your own repo.
 *
 * -----------------------------------------------------------------------------
 * WHY THIS EXISTS, AND WHY IT IS DELIBERATELY SMALL
 * -----------------------------------------------------------------------------
 * This system is a library, not a vendored template. Its components are thin
 * adapters — `Button.tsx` is about 45 lines and three imports — while the design
 * lives in 8,631 lines of token CSS behind `Provider`. So there is no "copy a
 * component and own it" model here: copying `Button.tsx` alone gives a bare
 * Radix button with none of this system's paint.
 *
 * What a consumer genuinely needs is the rarer case: a component whose INTERNAL
 * MARKUP has to change for one product, where the documented customization
 * surface (eight `Provider` props and two token seams) cannot reach. Today the
 * answer is "use the raw Radix component or surface the gap", which is a wall.
 * This makes it a door, and puts an honest sign on the door.
 *
 * WHAT IT COPIES, AND WHAT IT REFUSES TO. One component's source file, with its
 * intra-package imports rewritten to resolve from the package. It does NOT
 * follow the graph: a consumer who ejects `TextField` gets a file that imports
 * `Field` from `dsiab`, which is correct — they asked to own one component, not
 * to fork a subtree. And it does not touch the token CSS, because a component
 * that stops reading the roles stops being part of the system in the one way
 * that matters.
 *
 * THE MANIFEST IS THE POINT AS MUCH AS THE COPY. An ejected component silently
 * stops receiving upgrades and silently leaves the reach of `dsiab check`. So
 * every ejection is recorded in `dsiab.json`, and `dsiab docs` reads that file
 * and marks the matching page — because the failure mode here is not the copy,
 * it is somebody six months later reading the documentation for a component
 * their app no longer renders.
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import { dirname, join, relative, resolve } from "node:path";

const HERE = dirname(fileURLToPath(import.meta.url));
const CWD = process.cwd();
export const MANIFEST = "dsiab.json";

/* ---- arguments ------------------------------------------------------------ */

function parseArgs(argv) {
  const opts = { write: false, into: "src/design-system", names: [] };
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === "--write" || arg === "-w") opts.write = true;
    else if (arg === "--help" || arg === "-h") opts.help = true;
    else if (arg === "--into") opts.into = argv[(i += 1)];
    else if (arg.startsWith("--into=")) opts.into = arg.slice("--into=".length);
    else if (arg.startsWith("-")) {
      process.stderr.write(`dsiab eject: unknown option \`${arg}\`. Try --help.\n`);
      process.exit(2);
    } else opts.names.push(arg);
  }
  return opts;
}

function help() {
  process.stdout.write(
    [
      "",
      "  dsiab eject — copy one component into your own repo, on the record",
      "",
      "  USAGE",
      "    dsiab eject <Component>              print what would happen",
      "    dsiab eject <Component> --write      do it",
      "",
      "  OPTIONS",
      "    --into <dir>   where to put it (default src/design-system)",
      "    --write, -w    apply instead of printing",
      "    --help, -h     print this",
      "",
      "  An ejected component leaves the reach of upgrades and of `dsiab check`.",
      "  That is recorded in dsiab.json, and `dsiab docs` marks its page so the",
      "  documentation cannot quietly describe a component you no longer render.",
      "",
      "  Most customization does NOT need this. Eight Provider props and two token",
      "  seams cover re-skinning; see GUIDELINES.md §10. Reach for eject only when",
      "  a component's internal markup has to change.",
      "",
    ].join("\n") + "\n",
  );
}

/* ---- locating the installed package -------------------------------------- */

/**
 * The installed package root, or null from a source checkout where this file
 * already sits inside it.
 */
function packageRoot() {
  try {
    return dirname(createRequire(join(CWD, "package.json")).resolve("dsiab/package.json"));
  } catch {
    const here = resolve(HERE, "..");
    return existsSync(join(here, "registry.json")) || existsSync(join(here, "dist")) ? here : null;
  }
}

/**
 * The roster, from wherever it is: `dist/registry.json` in an install (the
 * consumer projection) or `registry.json` in a checkout. Both carry `name` and
 * `status`, which is all this needs.
 */
function loadRoster(root) {
  for (const candidate of [join(root, "dist", "registry.json"), join(root, "registry.json")]) {
    if (!existsSync(candidate)) continue;
    const parsed = JSON.parse(readFileSync(candidate, "utf8"));
    return Array.isArray(parsed) ? parsed : parsed.components;
  }
  return null;
}

/* ---- the manifest --------------------------------------------------------- */

/** Read `dsiab.json`, tolerating absence but never malformed content — a
 *  manifest this tool cannot parse is a manifest it must not overwrite. */
export function readManifest(dir = CWD) {
  const path = join(dir, MANIFEST);
  if (!existsSync(path)) return { path, data: { ejected: {} }, existed: false };
  try {
    const data = JSON.parse(readFileSync(path, "utf8"));
    data.ejected ??= {};
    return { path, data, existed: true };
  } catch (err) {
    process.stderr.write(
      `dsiab eject: ${MANIFEST} exists but is not valid JSON (${err.message}).\n` +
        `  Refusing to overwrite it. Fix or remove it and run this again.\n`,
    );
    process.exit(2);
  }
}

/* ---- the copy ------------------------------------------------------------- */

/**
 * Rewrite a component's intra-package imports so the copied file resolves from
 * the package instead of from paths that only exist inside it.
 *
 * `../../theme/SizeContext` and `./Field` both become `dsiab`, which is correct
 * and is also the line that makes the copy shallow ON PURPOSE: the consumer owns
 * this component's markup and keeps using the system for everything it leans on.
 * A name the package does not export is reported rather than rewritten, because
 * a silently broken import is worse than a refusal.
 */
export function rewriteImports(source, exportedNames) {
  const unresolved = [];
  const text = source.replace(
    /^(\s*import\s+(?:type\s+)?\{([^}]*)\}\s+from\s+["'])(\.[^"']*)(["'];?)$/gm,
    (whole, head, names, _spec, tail) => {
      const wanted = names
        .split(",")
        .map((n) => n.trim().replace(/^type\s+/, "").split(/\s+as\s+/)[0].trim())
        .filter(Boolean);
      const missing = wanted.filter((n) => !exportedNames.has(n));
      if (missing.length) {
        unresolved.push(...missing);
        return whole;
      }
      return `${head}dsiab${tail}`;
    },
  );
  return { text, unresolved: [...new Set(unresolved)] };
}

/* ---- main ----------------------------------------------------------------- */

const opts = parseArgs(process.argv.slice(2));
if (opts.help) {
  help();
  process.exit(0);
}
if (!opts.names.length) {
  process.stderr.write("dsiab eject: name a component. `dsiab eject Button`, or --help.\n");
  process.exit(2);
}
if (opts.names.length > 1) {
  process.stderr.write(
    `dsiab eject: one component at a time. Ejecting is a decision per component, and ` +
      `${opts.names.length} at once hides ${opts.names.length - 1} of them.\n`,
  );
  process.exit(2);
}

const root = packageRoot();
if (!root) {
  process.stderr.write(
    "dsiab eject: cannot find the dsiab package. Run this from a project that installed it.\n",
  );
  process.exit(2);
}
const roster = loadRoster(root);
if (!roster) {
  process.stderr.write(`dsiab eject: no registry found in ${root}. This is a packaging bug.\n`);
  process.exit(2);
}

const name = opts.names[0];
const entry = roster.find((e) => e.name === name);
if (!entry) {
  const near = roster
    .filter((e) => e.name.toLowerCase().includes(name.toLowerCase()))
    .slice(0, 5)
    .map((e) => e.name);
  process.stderr.write(
    `dsiab eject: \`${name}\` is not in the roster.\n` +
      (near.length ? `  Did you mean: ${near.join(", ")}?\n` : "  Run `dsiab docs` to see what exists.\n"),
  );
  process.exit(2);
}
if (entry.status !== "available" && entry.status !== "ported") {
  process.stderr.write(
    `dsiab eject: \`${name}\` is ${entry.status} — there is no source to copy.\n` +
      (entry.reason || entry.note ? `  ${entry.reason ?? entry.note}\n` : ""),
  );
  process.exit(2);
}

/* The source. An installed package ships `dist/` only, so this is the one thing eject genuinely
   cannot do from a published tarball today, and it says so rather than copying a compiled bundle
   and calling it a component. */
/* The module basename. The CONSUMER projection deliberately drops `module` — it is a path inside
   `src/`, which a consumer does not have — so fall back to the entry name, which is the same string
   for all but a handful of entries. Without this the error below printed `undefined.tsx`, which
   told the reader nothing about what was actually looked for. */
const moduleName = entry.module ?? entry.name;
const sourceCandidates = [
  join(root, "src", "components", "ui", `${moduleName}.tsx`),
  join(root, "src", "components", "ui", `${moduleName}.ts`),
  join(root, "src", `${moduleName}.tsx`),
];
const sourcePath = sourceCandidates.find((candidate) => existsSync(candidate));
if (!sourcePath) {
  process.stderr.write(
    `dsiab eject: \`${name}\`'s source is not in this install.\n` +
      `  The package ships dist/ rather than src/, so eject needs the component source to be\n` +
      `  present — it works from a source checkout today. Copying compiled output would give you\n` +
      `  a bundle rather than a component, which is not what you asked for.\n` +
      `  Looked in:\n${sourceCandidates.map((c) => `    ${relative(root, c)}\n`).join("")}`,
  );
  process.exit(2);
}

/* What the package exports, so a rewritten import can be checked rather than hoped. */
const exportedNames = new Set(roster.flatMap((e) => e.exports ?? []));
const original = readFileSync(sourcePath, "utf8");
const { text, unresolved } = rewriteImports(original, exportedNames);

const targetDir = join(CWD, opts.into);
const targetPath = join(targetDir, `${moduleName}.tsx`);
const manifest = readManifest();
const already = manifest.data.ejected[name];

process.stdout.write(`\n  dsiab eject ${name}\n\n`);

if (already) {
  process.stdout.write(
    `  Already ejected to ${already.path} (${already.version}).\n` +
      `  Delete that file and its ${MANIFEST} entry to eject again.\n\n`,
  );
  process.exit(0);
}
if (existsSync(targetPath)) {
  process.stderr.write(
    `  ${relative(CWD, targetPath)} already exists and is not recorded in ${MANIFEST}.\n` +
      `  Refusing to overwrite a file this tool did not write.\n\n`,
  );
  process.exit(2);
}

const version = JSON.parse(readFileSync(join(root, "package.json"), "utf8")).version;
const rewrittenCount = (original.match(/^\s*import .* from ["']\./gm) ?? []).length - unresolved.length;

process.stdout.write(`  from  ${relative(root, sourcePath)} (dsiab ${version})\n`);
process.stdout.write(`  to    ${relative(CWD, targetPath)}\n`);
process.stdout.write(`  imports rewritten to "dsiab": ${Math.max(rewrittenCount, 0)}\n`);
if (unresolved.length) {
  process.stdout.write(
    `\n  LEFT ALONE, because the package does not export them: ${unresolved.join(", ")}\n` +
      `  These are internal by ruling. The copied file will not compile until you provide them,\n` +
      `  and that is the honest state rather than a silently broken import.\n`,
  );
}

process.stdout.write(
  `\n  WHAT YOU ARE TAKING ON\n` +
    `    · This copy stops receiving upgrades. Fixes to ${name} in future versions will not reach it.\n` +
    `    · It leaves the reach of \`dsiab check\` for everything the guards assert about ${name}.\n` +
    `    · It keeps reading the token layer, so a re-skin still moves it. That part still works.\n` +
    `    · \`dsiab docs\` will mark ${name}'s page as ejected in this project, so the documentation\n` +
    `      cannot quietly describe a component you no longer render.\n`,
);

if (!opts.write) {
  process.stdout.write(`\n  Nothing was written. Re-run with --write to apply.\n\n`);
  process.exit(0);
}

mkdirSync(targetDir, { recursive: true });
writeFileSync(targetPath, text);
manifest.data.ejected[name] = {
  path: relative(CWD, targetPath).split("\\").join("/"),
  version,
  at: new Date().toISOString().slice(0, 10),
};
writeFileSync(manifest.path, `${JSON.stringify(manifest.data, null, 2)}\n`);

process.stdout.write(
  `\n  Wrote ${relative(CWD, targetPath)} and recorded it in ${MANIFEST}.\n` +
    `  Import it from there rather than from "dsiab", or the package's copy is what renders.\n\n`,
);
process.exit(0);
