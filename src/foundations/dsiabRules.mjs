/**
 * dsiabRules.mjs — the rules `ds-check` runs for this design system ([[ds-check-dsiab-rules]]).
 *
 * The header of `consumerRules.mjs` states the test a rule had to pass to ship: would it be a defect in
 * a codebase that had never heard of this design system? Two of these pass it unchanged.
 * `unknown-token` catches a `var(--ds-…)` that resolves to nothing, and `radix-duplicate` catches a
 * second copy of a component the project already installed. Both are defects in any codebase.
 *
 * The other two pass a REFINED test: would it be a defect in a file that already builds on this
 * system? `bare-scale-step` and `important-flag` run only in a DSIAB FILE, one whose comment-free text
 * imports `dsiab` (`from "dsiab"`, `from "dsiab/…"`, `import "dsiab/…"`, `require("dsiab")`, a CSS
 * `@import "dsiab/…"`) or contains `var(--ds-` or `.radix-themes`. A product's marketing page that never
 * touched the system keeps its own `!important`, and a file painting from the token layer does not.
 *
 * `radix-stylesheet` passes the same refined test at the scope of the TREE: would a second copy of
 * Radix's stylesheet be a defect in a project that already imports this system? It runs in every file
 * of a run where some file IMPORTS `dsiab`, because that stylesheet usually sits in a global CSS file
 * or an entry point with no marker of its own. The gate is the import alone. `.radix-themes` and
 * `var(--ds-` are left out: a project on Radix Themes without dsiab writes the first, a `--ds-` prefix
 * of its own is common, and either would turn that project's own stylesheet import into a finding.
 *
 * SELF-SOURCE. Run over this package's own checkout, `bare-scale-step` skips `src/tokens/**` and the
 * stories, and `radix-duplicate` and `radix-stylesheet` skip all of `src/`, because those are the
 * layer the rules protect: `src/tokens/index.css` is where `dsiab/styles.css` takes in Radix's sheet.
 * `unknown-token` and `important-flag` run everywhere. A rule that did not run on a file leaves any
 * allowance for it there "not evaluated", never stale.
 *
 * Plain ESM, `node:` imports only.
 */
import { realpathSync } from "node:fs";
import { dirname, join, relative, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { loadFacts } from "./checkFacts.mjs";

const PACKAGE_ROOT = join(dirname(fileURLToPath(import.meta.url)), "..", "..");

/** @type {import("./consumerRules.mjs").Rule[]} */
export const DSIAB_RULES = [
  {
    id: "unknown-token",
    title: "a `--ds-*` token this system does not define",
    why:
      "A custom property that nothing declares is guaranteed-invalid, so the property that reads it " +
      "silently falls back to its initial value, and the type checker, the console and the build all " +
      "stay quiet. `--ds-text-danger` reads like a token and paints like no colour at all.",
    fix:
      "Use the name the detail suggests. The real names are in `node_modules/dsiab/dist/check-facts.json` " +
      "(`known`). A `--ds-*` name you declare yourself anywhere in the checked tree is accepted.",
    reads:
      "`var(--ds-…)` in CSS, tagged CSS-in-JS templates, and quoted strings that are a style value: an " +
      "object property value, or a `style` / `className` / `class` attribute. A string passed to a call " +
      "(`cn(\"…\")`) and a name built at runtime (`--ds-text-${tone}`) are not read. A name outside every " +
      "family this system owns, such as `--ds-mything-gap`, is left alone.",
  },
  {
    id: "bare-scale-step",
    title: "a raw colour scale step where a `--ds-*` role belongs",
    why:
      "The `--ds-*` roles follow the accent shift that moves a status colour off a brand colour it " +
      "collides with, and the brand swap that re-skins the product. A bare step such as `--accent-9`, " +
      "`--gray-a7` or `--ds-custom-9` follows neither, so it paints the right colour today and the wrong " +
      "one after the next brand change.",
    fix: "Paint from the `--ds-*` role the detail names. The one sanctioned exception is reusing a Radix component's own skin.",
    reads:
      "dsiab files only. Numeric steps of every colour scale, including the brand ramps, in the same " +
      "places `unknown-token` reads. `--accent-contrast`, `--accent-surface` and `--color-*` are not caught.",
  },
  {
    id: "hex-colour",
    title: "a hex colour where a `--ds-*` role belongs",
    why:
      "A hex value is one colour forever. It ignores the light and dark appearance, the brand swap and " +
      "the accent shift that the `--ds-*` roles follow, so it is right on the screen it was picked on " +
      "and wrong on the next theme, and nothing reports it.",
    fix:
      "Paint from the `--ds-*` role for what the colour means (`--ds-text-*`, `--ds-fill-*`, " +
      "`--ds-stroke-*`, `--ds-bg-*`), or set the brand through `Provider`'s `accentColor`.",
    reads:
      "dsiab files only, in the same places `bare-scale-step` reads, which includes a Tailwind " +
      "`bg-[#…]` class. A `#` in a selector, in `url(#…)` and in an HTML entity is not a colour. " +
      "`rgb()`, `hsl()` and named colours are not caught.",
  },
  {
    // The three strings that name the flag are template literals, which `ds-check` does not read, so
    // this file's own description of the rule is not reported by the rule.
    id: "important-flag",
    title: `\`!important\` in a file that builds on this system`,
    why:
      "This system wins the cascade by specificity and source order, scoped under `.radix-themes`, so a " +
      `parent layer can always override it. One \`!important\` breaks that for every rule after it, and ` +
      "usually the selector already won without it.",
    fix:
      "Scope the rule under `.radix-themes` and load it after the stylesheet. Probe `getComputedStyle` " +
      "first: most of the time the selector already wins.",
    reads:
      "dsiab files only. CSS, tagged CSS-in-JS templates and style-value strings. The Tailwind `!` " +
      "modifier is not read.",
  },
  {
    id: "radix-duplicate",
    title: "a component imported from `@radix-ui/themes` that dsiab ships",
    why:
      "dsiab's component of the same name wraps the Radix one with this system's tokens, sizes and " +
      "behaviour. Importing the raw one puts two versions of the same control in one product, and the " +
      "raw one ignores the brand and the size lane.",
    fix:
      "Import it from `dsiab` instead; the detail names the line. If this is a copy of a dsiab " +
      "component you own, allow the line and say so.",
    reads:
      "Named value imports and re-exports from `@radix-ui/themes`. Type imports, namespace imports " +
      "(`import * as T`) and the five bare re-exports dsiab ships unchanged (Grid, Section, AspectRatio, " +
      "VisuallyHidden, Skeleton) are not reported.",
  },
  {
    id: "radix-stylesheet",
    title: "a second copy of Radix's stylesheet in a project that imports dsiab",
    why:
      "`dsiab/styles.css` already contains `@radix-ui/themes/styles.css`, ahead of this system's " +
      "overrides. This system wins the cascade by source order, so a second copy loaded after it " +
      "silently undoes every override, and nothing reports it: both sheets hold legitimate values. " +
      "Loaded before it, the copy is dead weight.",
    fix: 'Delete the import. `import "dsiab/styles.css"`, once at the entry point, is the whole stylesheet.',
    reads:
      "Only in a run where some file imports `dsiab`. A script `import`, `import()`, `require()` or " +
      "`from` of any `@radix-ui/themes/….css`, and a CSS `@import` of one. A `<link>` tag, a bundler " +
      "entry and a CDN URL are not read, and a MISSING `dsiab/styles.css` is not reported.",
  },
];

export const DSIAB_RULE_IDS = DSIAB_RULES.map((r) => r.id);
const FACT_RULES = ["unknown-token", "bare-scale-step", "radix-duplicate"];
const IMPORT_MARKER =
  /\bfrom\s*["']dsiab(?:\/[^"']*)?["']|\bimport\s*["']dsiab\/[^"']*["']|\brequire\(\s*["']dsiab(?:\/[^"']*)?["']\s*\)|@import\s+(?:url\(\s*)?["']dsiab\//;
/** Does this file's comment-free text import dsiab? */
const importsDsiab = (regions) => IMPORT_MARKER.test(regions.code) || IMPORT_MARKER.test(regions.css);

/* ---- the tree: facts, declarations and counts ------------------------------------------------- */

const NAME = "--ds-[A-Za-z0-9-]*[A-Za-z0-9]";
const DECLARE_RES = [
  new RegExp(`(?<![\\w-])(${NAME})\\s*:`, "g"),
  new RegExp(`["'](${NAME})["']\\s*(?:as\\s+[\\w.<>|\\s]+)?\\]?\\s*:`, "g"),
  new RegExp(`setProperty\\(\\s*["'](${NAME})["']`, "g"),
];

/** Every `--ds-*` name the source declares: a CSS declaration, a quoted object key, a setProperty. */
const declaredIn = (src, into) => {
  if (src.includes("--ds-")) for (const re of DECLARE_RES) for (const m of src.matchAll(re)) into.add(m[1]);
  return into;
};

let packageFacts;
/** The package's own facts, loaded once per process. */
const factsOnce = () => (packageFacts ??= loadFacts(PACKAGE_ROOT));

/**
 * One run's shared state. `sources` is every file the run read, as `{file, src}`. `regionsOf(file, src)`
 * splits a file the way `checkSource` does, so `importsDsiab` reads comment-free text. Without it the
 * tree imports nothing, and `radix-stylesheet` reads only each file's own imports.
 */
export function prepareTree(sources, loaded = factsOnce(), regionsOf) {
  const declared = new Set();
  for (const { src } of sources) declaredIn(src, declared);
  const imports = !!regionsOf && sources.some(({ file, src }) => {
    const regions = src.includes("dsiab") && regionsOf(file, src);
    return !!regions && importsDsiab(regions);
  });
  return { ...loaded, declared, importsDsiab: imports, dsiab: 0, other: 0, self: 0 };
}

/** Per-file flags: is this file part of the package's own source, and which part. */
export function fileContext(absPath) {
  let rel;
  try {
    rel = relative(realpathSync(join(PACKAGE_ROOT, "src")), realpathSync(absPath));
  } catch {
    return {};
  }
  if (rel.startsWith("..") || rel.startsWith(sep) || rel === absPath) return {};
  return { selfSrc: true, selfLayer: rel.startsWith(`tokens${sep}`) || /\.stories\.tsx?$/.test(rel) };
}

/* ---- matching ---------------------------------------------------------------------------------- */

const MARKER_RE = new RegExp(`${IMPORT_MARKER.source}|var\\(\\s*--ds-|\\.radix-themes\\b`);
const SHEET = `(?:~|[^"'\\s()]*node_modules/)?(@radix-ui/themes/[^"'\\s()]*\\.css)`;
const SHEET_CODE_RE = new RegExp(`\\b(?:import\\s*\\(?|require\\(|from)\\s*["']${SHEET}["']`, "g");
const SHEET_CSS_RE = new RegExp(`@import\\s+(?:url\\(\\s*)?["']?${SHEET}`, "g");
const TOKEN_RE = new RegExp(`var\\(\\s*(${NAME})(?![\\w$-])`, "g");
const IMPORTANT_RE = /!\s*important\b/gi;
const HEX_RE = /(?<![\w&#-])#(?:[0-9a-f]{8}|[0-9a-f]{6}|[0-9a-f]{3,4})(?![\w-])/gi;
const RADIX_IMPORT_RE = /(?:^|[;\n{}])[ \t]*(?:import|export)\s+(?!type\b)\{([^}]*)\}\s*from\s*["']@radix-ui\/themes["']/g;
const STYLE_KEY_RE = /(?::|\b(?:style|className|class)\s*=\s*\{?)\s*$/;
const ATTR_RE = /\b(?:class|className)\s*=\s*(["'])([^"'\n]*)\1/g;

const inSpans = (i, spans) => spans.some(([s, e]) => i >= s && i < e);

/** The text a style matcher may read: the CSS region, plus every string that is a style value. */
function styleText(regions, markup) {
  const { css, code, strings } = regions;
  const spans = strings.filter(([s]) => STYLE_KEY_RE.test(code.slice(Math.max(0, s - 40), s - 1)));
  if (markup) {
    for (const m of code.matchAll(ATTR_RE)) {
      if (inSpans(m.index, strings)) continue;
      const off = m.index + m[0].indexOf(m[1]) + 1;
      spans.push([off, off + m[2].length]);
    }
  }
  if (!spans.length) return css;
  const out = css.split("");
  for (const [s, e] of spans) for (let i = s; i < e; i++) out[i] = code[i];
  return out.join("");
}

let scaleRe;
let scaleFor;
function scaleRegex(facts) {
  if (scaleFor === facts) return scaleRe;
  const ramps = new Set();
  for (const k of facts.known) {
    const m = /^--(ds-(?:custom|brand)(?:-[a-z]+)*?)-a?\d+$/.exec(k);
    if (m) ramps.add(m[1]);
  }
  const names = [...facts.scales, ...ramps].sort((a, b) => b.length - a.length).join("|");
  scaleFor = facts;
  return (scaleRe = new RegExp(`var\\(\\s*--(${names})-(a?)(1[0-2]|[1-9])(?![\\w-])`, "g"));
}

/**
 * Run the dsiab rules over one file's regions. `add(ruleId, index, text, detail)` records a finding.
 * Returns the ids of the rules that did NOT run on this file, so its allowances for them are not
 * called stale. Called with no `ctx.tree`, it uses the package's own facts and this file's own
 * declarations, and treats the file as a consumer's.
 */
export function dsiabFindings(src, regions, { markup = false, tree, file = {} } = {}, add, inCode) {
  tree ??= prepareTree([{ src }]);
  const skipped = new Set();
  const { facts } = tree;
  if (!facts) FACT_RULES.forEach((id) => skipped.add(id));
  const isDsiab = MARKER_RE.test(regions.code) || MARKER_RE.test(regions.css);
  if (file.selfSrc) tree.self++;
  if (isDsiab) tree.dsiab++;
  else tree.other++;
  if (!isDsiab) ["bare-scale-step", "hex-colour", "important-flag"].forEach((id) => skipped.add(id));
  if (file.selfLayer) ["bare-scale-step", "hex-colour"].forEach((id) => skipped.add(id));
  if (file.selfSrc) ["radix-duplicate", "radix-stylesheet"].forEach((id) => skipped.add(id));
  if (!tree.importsDsiab && !importsDsiab(regions)) skipped.add("radix-stylesheet");
  const runs = (id) => !skipped.has(id);

  const text = src.includes("var(") || src.includes("important") || src.includes("#") ? styleText(regions, markup) : "";
  if (runs("unknown-token") && text.includes("--ds-")) {
    const { known, families } = lookup(facts);
    for (const m of text.matchAll(TOKEN_RE)) {
      const name = m[1];
      if (known.has(name) || tree.declared.has(name) || !families.has(familyOf(name))) continue;
      add("unknown-token", m.index, m[0] + ")", `\`${name}\` is not a dsiab token. ${suggestToken(name, facts)}`);
    }
  }
  if (runs("bare-scale-step") && text.includes("var(")) {
    for (const m of text.matchAll(scaleRegex(facts))) {
      add("bare-scale-step", m.index, `${m[0]})`, `\`--${m[1]}-${m[2]}${m[3]}\` is a raw scale step. ${suggestForStep(m[1], m[2], m[3], facts)}`);
    }
  }
  if (runs("hex-colour") && text.includes("#")) {
    for (const m of text.matchAll(HEX_RE)) {
      if (/url\(\s*['"]?$/i.test(text.slice(Math.max(0, m.index - 6), m.index))) continue;
      // A selector (`#fade {`) reaches `{` before any `;` or `}`; a value does not.
      const after = /[{;}]/.exec(text.slice(m.index, m.index + 300));
      if (after && after[0] === "{") continue;
      add("hex-colour", m.index, m[0], `\`${m[0]}\` is a fixed colour. Use the \`--ds-*\` role for what it means.`);
    }
  }
  if (runs("important-flag") && text.includes("important")) {
    for (const m of text.matchAll(IMPORTANT_RE)) {
      const line = src.slice(src.lastIndexOf("\n", m.index) + 1, (src.indexOf("\n", m.index) + 1 || src.length + 1) - 1);
      add("important-flag", m.index, line, "`!important` in a dsiab file");
    }
  }
  if (runs("radix-duplicate") && regions.code.includes("@radix-ui/themes")) {
    for (const m of regions.code.matchAll(RADIX_IMPORT_RE)) {
      const at = m.index + m[0].search(/import|export/);
      if (!inCode(at)) continue;
      const open = m.index + m[0].indexOf("{") + 1;
      for (const spec of m[1].matchAll(/[^,]+/g)) {
        const name = spec[0].trim().split(/\s+as\s+/)[0];
        const dsiab = facts.duplicates?.[name];
        if (!dsiab || /^type\s/.test(spec[0].trim())) continue;
        const lead = spec[0].length - spec[0].trimStart().length;
        add("radix-duplicate", open + spec.index + lead, spec[0].trim(),
          `dsiab ships \`${dsiab}\`, which wraps this one. Write \`import { ${dsiab} } from "dsiab"\``);
      }
    }
  }
  if (runs("radix-stylesheet") && src.includes("@radix-ui/themes/")) radixSheets(src, regions, add, inCode);
  return skipped;
}

/** Every import of a Radix Themes stylesheet, reported with its whole source line. */
function radixSheets(src, regions, add, inCode) {
  const lineAt = (i) => src.slice(src.lastIndexOf("\n", i - 1) + 1, (src.indexOf("\n", i) + 1 || src.length + 1) - 1);
  const report = (m) => add("radix-stylesheet", m.index, lineAt(m.index),
    `\`${m[1]}\` is already inside \`dsiab/styles.css\`, so this loads a second copy of it`);
  for (const m of regions.code.matchAll(SHEET_CODE_RE)) if (inCode(m.index)) report(m);
  for (const m of regions.css.matchAll(SHEET_CSS_RE)) report(m);
}

/* ---- suggestions ------------------------------------------------------------------------------- */

/** Families other systems use, mapped to the ones this system names. They open the family gate. */
const FAMILY_ALIASES = {
  color: ["text", "fill", "stroke", "icon", "bg"], colors: ["text", "fill", "stroke", "icon", "bg"],
  spacing: ["space"], size: ["space"], border: ["stroke"], background: ["bg"], surface: ["bg"],
  foreground: ["text"], fg: ["text"], primary: ["fill"],
};
const WORD_SYNONYMS = {
  danger: "error", critical: "error", destructive: "error", negative: "error", positive: "success",
  caution: "warning", primary: "accent", brand: "accent", muted: "weak", secondary: "weak", subtle: "weak",
};
const HUE_TONE = {
  red: "error", tomato: "error", ruby: "error", crimson: "error", oxblood: "error",
  green: "success", grass: "success", jade: "success", teal: "success", mint: "success",
  amber: "warning", yellow: "warning", orange: "warning", blue: "info", sky: "info", cyan: "info", indigo: "info",
};

const familyOf = (name) => name.slice(5).split("-")[0];
const lookups = new WeakMap();
/** The sets one run's facts need on every file, built once. */
function lookup(facts) {
  if (!lookups.has(facts)) {
    lookups.set(facts, {
      known: new Set(facts.known),
      families: new Set([...facts.known.map(familyOf), ...Object.keys(FAMILY_ALIASES)]),
    });
  }
  return lookups.get(facts);
}
const code = (names) => names.map((n) => `\`${n}\``).join(" or ");

export function suggestToken(name, facts) {
  const suggest = new Set(facts.suggest);
  const [fam, ...rest] = name.slice(5).split("-");
  const words = rest.length ? rest.map((w) => WORD_SYNONYMS[w] ?? w) : WORD_SYNONYMS[fam] ? [WORD_SYNONYMS[fam]] : [];
  const fams = FAMILY_ALIASES[fam] ?? [fam];
  const hits = fams.map((f) => ["--ds", f, ...words].join("-")).filter((n) => suggest.has(n));
  if (hits.length) return `Did you mean ${code(hits)}?`;
  if (/^\d+$/.test(rest.at(-1) ?? "")) {
    for (const f of fams) {
      const ladder = facts.suggest.filter((n) => new RegExp(`^--ds-${f}-\\d+$`).test(n));
      if (ladder.length) {
        const nums = ladder.map((n) => Number(n.split("-").pop())).sort((a, b) => a - b);
        return `The \`--ds-${f}-*\` steps are ${nums.join(" ")}.`;
      }
    }
  }
  const pool = facts.suggest.filter((n) => fams.includes(familyOf(n))).slice(0, 10);
  return pool.length ? `The \`--ds-${fams.join("/")}-*\` names include ${code(pool)}.` : "No dsiab family by that name.";
}

export function suggestForStep(scale, alpha, step, facts) {
  const ramp = /^ds-(?:custom|brand)(?:-([a-z]+))?/.exec(scale);
  const tone = ramp ? (!ramp[1] || ramp[1] === "dark" ? "accent" : ramp[1]) : HUE_TONE[scale] ?? scale;
  const roles = facts.steps?.[`--${tone}-${alpha}${step}`];
  if (roles?.length) return `The token layer maps this step to ${code(roles)}.`;
  const n = Number(step);
  const family = n <= 2 ? "bg" : n <= 5 || n === 9 || n === 10 ? "fill" : n <= 8 ? "stroke" : "text";
  return `No \`--ds-*\` role is this exact step. Step ${n} is usually a \`--ds-${family}-*\` role.`;
}

/* ---- reach ------------------------------------------------------------------------------------- */

/** The block `formatReach` prints for these rules. */
export function formatDsiabReach(tree, notEvaluated) {
  if (!tree) return [];
  const out = ["", "  The dsiab rules (unknown-token, bare-scale-step, hex-colour, important-flag, radix-duplicate,", "  radix-stylesheet):"];
  if (tree.facts) out.push(`      · facts read from ${tree.source}.`);
  else out.push(`      · NOT RUN: ${FACT_RULES.join(", ")}, because ${tree.error}.`, "        Reinstall the package.");
  out.push(
    `      · ${tree.dsiab} dsiab file(s) and ${tree.other} other file(s). bare-scale-step, hex-colour and`,
    "        important-flag ran only in the dsiab files.",
    tree.importsDsiab
      ? "      · radix-stylesheet ran, because a file here imports dsiab."
      : "      · NOT RUN: radix-stylesheet, because no file here imports dsiab.",
  );
  if (tree.self) {
    out.push(
      `      · ${tree.self} file(s) of the dsiab package's own source. bare-scale-step and hex-colour skipped`,
      "        src/tokens and the stories, and radix-duplicate and radix-stylesheet skipped all of src/: the",
      "        layer they protect.",
    );
  }
  if (notEvaluated) {
    out.push(`      · ${notEvaluated} allowance(s) not evaluated, because their rule did not run on that file.`, "        Not counted as stale.");
  }
  return out;
}
