/**
 * checkFacts.mjs — the facts the dsiab rules in `ds-check` check against ([[ds-check-dsiab-rules]]).
 *
 * One function defines them, `buildCheckFacts(root)`, and it reads only this package's own sources:
 * the token CSS, the shipped TypeScript, the root registry, and the Radix stylesheet in
 * `node_modules`. `scripts/dist-check-facts.mjs` writes its result to `dist/check-facts.json`, which
 * ships. `loadFacts(packageRoot)` reads the sources when the package root is a checkout, which a
 * tarball never is because it ships neither `src/tokens` nor the root `registry.json`, and reads
 * `dist/check-facts.json` otherwise. A linked checkout (`npm link`, a workspace) runs on its sources,
 * which is intended. When neither is there, or the file does not parse, it returns the reason, and
 * the rules that need it report NOT RUN. They never report clean.
 *
 *   known        every `--ds-*` name the package declares, references in its token CSS, or sets as a
 *                complete string literal in its TypeScript. A name built at runtime, such as the
 *                prefix `--ds-space`, is dropped when it is only the prefix of another known name.
 *   suggest      the names declared in the foundation token files: the pool a suggestion names.
 *   scales       every colour scale prefix, read as a prefix that has an alpha step (`--gray-a6`).
 *                Only colour scales have alpha steps, so this needs no hand-typed colour list, and it
 *                picks up `oxblood` and the status aliases (`error`, `warning`, …) with Radix's own.
 *   steps        `--gray-a6` -> the semantic roles that `semantic.css` declares as exactly that step.
 *   duplicates   Radix name -> the available dsiab component that wraps it under the same name.
 *   passthrough  the components whose module is one bare re-export from `@radix-ui/themes`. Importing
 *                those from Radix imports the same object, so they are not duplicates.
 *
 * Plain ESM, `node:` imports only, like `consumerRules.mjs`.
 */
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

export const FACTS_PATH = "dist/check-facts.json";

/** The foundation token files. A suggestion only ever names a token declared in one of these. */
const SUGGEST_FILES = new Set([
  "semantic", "spacing", "typography", "motion", "shadow", "stacking", "icons", "forced-colors", "contrast",
]);
const TS_DIRS = ["src/components", "src/theme", "src/hooks"];

const NAME = "--ds-[A-Za-z0-9-]*[A-Za-z0-9]";
const DECL_RE = new RegExp(`(?<![\\w-])(${NAME})\\s*:`, "g");
const REF_RE = new RegExp(`var\\(\\s*(${NAME})(?![\\w$-])`, "g");
const LITERAL_RE = new RegExp(`["'](${NAME})["']`, "g");
const ALPHA_STEP_RE = /(?<![\w-])--([a-z]+)-a(?:1[0-2]|[1-9])(?![\w-])/g;
const STEP_ALIAS_RE = new RegExp(`(${NAME})\\s*:\\s*var\\(\\s*(--[a-z]+-a?(?:1[0-2]|[1-9]))\\s*\\)`, "g");
const RADIX_WRAP_RE = /^Radix ([A-Za-z][A-Za-z0-9]*)$/;
const PASSTHROUGH_RE = /^\s*export\s*\{[^}]*\}\s*from\s*["']@radix-ui\/themes["'];?\s*$/;

const stripComments = (s) => s.replace(/\/\*[\s\S]*?\*\//g, " ").replace(/(^|[^:"'])\/\/[^\n]*/g, "$1");
const sorted = (set) => [...set].sort();

function tsFiles(dir, out = []) {
  if (!existsSync(dir)) return out;
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, e.name);
    if (e.isDirectory()) tsFiles(p, out);
    else if (/\.tsx?$/.test(e.name) && !/\.(stories|test|node-check|type-check)\.tsx?$/.test(e.name)) out.push(p);
  }
  return out;
}

/** The registry's view: which Radix names a dsiab component duplicates, and which are passthroughs. */
function registryFacts(root) {
  const duplicates = {};
  const passthrough = [];
  for (const entry of JSON.parse(readFileSync(join(root, "registry.json"), "utf8"))) {
    const wraps = RADIX_WRAP_RE.exec(entry.buildingBlock ?? "")?.[1];
    if (entry.status !== "ported" || !wraps || !entry.exports.includes(wraps)) continue;
    const base = entry.module.includes("/") ? join(root, "src", entry.module) : join(root, "src/components/ui", entry.module);
    const file = [".tsx", ".ts"].map((x) => base + x).find(existsSync);
    if (file && PASSTHROUGH_RE.test(stripComments(readFileSync(file, "utf8")))) passthrough.push(entry.name);
    else duplicates[wraps] = entry.name;
  }
  return { duplicates, passthrough: passthrough.sort() };
}

/** Build the facts from a checkout. Throws when a source is missing. */
export function buildCheckFacts(root) {
  const known = new Set();
  const suggest = new Set();
  const scales = new Set();
  const steps = {};
  const tokenDir = join(root, "src/tokens");
  for (const f of readdirSync(tokenDir).filter((n) => n.endsWith(".css")).sort()) {
    const css = stripComments(readFileSync(join(tokenDir, f), "utf8"));
    const isFoundation = SUGGEST_FILES.has(f.slice(0, -4));
    for (const m of css.matchAll(DECL_RE)) { known.add(m[1]); if (isFoundation) suggest.add(m[1]); }
    for (const m of css.matchAll(REF_RE)) known.add(m[1]);
    for (const m of css.matchAll(ALPHA_STEP_RE)) scales.add(m[1]);
    if (f === "semantic.css") for (const m of css.matchAll(STEP_ALIAS_RE)) (steps[m[2]] ??= new Set()).add(m[1]);
  }
  const radixCss = join(root, "node_modules/@radix-ui/themes/styles.css");
  for (const m of readFileSync(radixCss, "utf8").matchAll(ALPHA_STEP_RE)) scales.add(m[1]);
  const literals = new Set();
  for (const file of TS_DIRS.flatMap((d) => tsFiles(join(root, d)))) {
    for (const m of stripComments(readFileSync(file, "utf8")).matchAll(LITERAL_RE)) literals.add(m[1]);
  }
  const all = [...known, ...literals];
  for (const name of literals) if (!all.some((k) => k.startsWith(`${name}-`))) known.add(name);
  return {
    about:
      "What `ds-check` checks dsiab code against: the --ds-* names this package defines, the colour " +
      "scales, the semantic role for each scale step, and the Radix names a dsiab component replaces.",
    generatedBy: "scripts/dist-check-facts.mjs",
    known: sorted(known),
    suggest: sorted(suggest),
    scales: sorted(scales),
    steps: Object.fromEntries(Object.keys(steps).sort().map((k) => [k, sorted(steps[k])])),
    ...registryFacts(root),
  };
}

const SHAPE = ["known", "suggest", "scales"];

/** @returns {{facts: object|null, source: string, error?: string}} */
export function loadFacts(packageRoot) {
  if (existsSync(join(packageRoot, "src/tokens")) && existsSync(join(packageRoot, "registry.json"))) {
    try {
      return { facts: buildCheckFacts(packageRoot), source: `the package's own sources at ${packageRoot}` };
    } catch (err) {
      return { facts: null, source: packageRoot, error: `its sources could not be read: ${err.message}` };
    }
  }
  const path = join(packageRoot, FACTS_PATH);
  if (!existsSync(path)) return { facts: null, source: path, error: `${path} is missing` };
  try {
    const facts = JSON.parse(readFileSync(path, "utf8"));
    const bad = SHAPE.filter((k) => !Array.isArray(facts?.[k]));
    if (bad.length) return { facts: null, source: path, error: `${path} has no ${bad.join(", ")} list` };
    return { facts, source: path };
  } catch (err) {
    return { facts: null, source: path, error: `${path} could not be read: ${err.message}` };
  }
}
