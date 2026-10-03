#!/usr/bin/env node
/**
 * `dsiab init` — the first five minutes, made correct.
 *
 * -----------------------------------------------------------------------------
 * WHAT THIS AUTOMATES, AND WHY THESE THINGS
 * -----------------------------------------------------------------------------
 * Not a wishlist. Every step below is a failure this package has MEASURED:
 *
 *   The stylesheet import      Without it every `--ds-*` role computes to the
 *                              empty string. Measured 2026-09-02. The library
 *                              build extracts CSS out of the JS, so importing a
 *                              component alone paints nothing, silently.
 *   The Provider               Same measurement, other half: `--scaling`,
 *                              `[data-radius]`, `[data-accent-color]` and
 *                              `[data-gray-color]` are written by Provider, so
 *                              without it every `calc()` is invalid at
 *                              computed-value time.
 *   The peer ranges            A mismatched React resolves two copies and
 *                              surfaces as *Invalid hook call*, far from here.
 *   A token override file      GUIDELINES §10 documents two sanctioned seams
 *                              and nothing points a new consumer at them, so
 *                              people reach for `.rt-Button { … }` instead,
 *                              which the guards cannot see.
 *   The agent layer            Already solved by `--init`; delegated, not
 *                              reimplemented.
 *
 * PRINT FIRST, WRITE ONLY WHEN ASKED. An init that silently edits a consumer's
 * entry file is a tool people run once and then distrust. The default prints a
 * plan and the exact diff; `--write` applies it. This mirrors the restraint the
 * agent-layer installer already has: it never replaces a file that lacks its
 * `dsiab-managed` marker, and that restraint is why it is safe to run twice.
 *
 * NO TTY MEANS NO PROMPTS. This command installs agent instruction files, so an
 * agent will run it, and CI will too. A prompt with nowhere to read from is a hang,
 * and a hang in the tool built to help agents is the worst possible failure. So
 * every question has a flag, and with no TTY the defaults are taken and printed.
 *
 * ZERO DEPENDENCIES, deliberately. `node:readline` is a worse prompt library
 * than the good ones. It is also the difference between this command working in
 * any install and asking a design-system consumer to accept a dependency tree
 * for a setup script.
 */
import { spawnSync } from "node:child_process";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { createInterface } from "node:readline";
import { fileURLToPath } from "node:url";
import { dirname, join, relative, sep } from "node:path";

const HERE = dirname(fileURLToPath(import.meta.url));
const CWD = process.cwd();

/* ---- the questions, their flags, and their defaults ---------------------- */

const ACCENTS = [
  "iris", "blue", "cyan", "teal", "jade", "green", "grass", "lime", "mint", "sky",
  "indigo", "violet", "purple", "plum", "pink", "crimson", "ruby", "red", "tomato",
  "orange", "amber", "yellow", "brown", "bronze", "gold", "gray", "oxblood",
];
const NEUTRALS = ["auto", "gray", "mauve", "slate", "sage", "olive", "sand"];
const TIERS = ["small", "medium", "large"];
const RADII = ["none", "small", "medium", "large", "full"];

const QUESTIONS = [
  { key: "accent", flag: "--accent", prompt: "Brand accent", def: "iris", options: ACCENTS },
  { key: "neutral", flag: "--neutral", prompt: "Neutral (auto pairs it to the accent)", def: "auto", options: NEUTRALS },
  { key: "uiSize", flag: "--size", prompt: "Density tier", def: "small", options: TIERS },
  { key: "radius", flag: "--radius", prompt: "Corner radius", def: "medium", options: RADII },
];

/* ---- argument parsing ----------------------------------------------------- */

function parseArgs(argv) {
  const opts = { write: false, yes: false, force: false, answers: {} };
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === "--write" || arg === "-w") opts.write = true;
    else if (arg === "--yes" || arg === "-y") opts.yes = true;
    else if (arg === "--force") opts.force = true;
    else if (arg === "--help" || arg === "-h") opts.help = true;
    else {
      const q = QUESTIONS.find((question) => arg === question.flag || arg.startsWith(`${question.flag}=`));
      if (!q) {
        process.stderr.write(`dsiab init: unknown option \`${arg}\`. Try --help.\n`);
        process.exit(2);
      }
      const value = arg.includes("=") ? arg.slice(arg.indexOf("=") + 1) : argv[(i += 1)];
      if (!q.options.includes(value)) {
        process.stderr.write(
          `dsiab init: \`${value}\` is not a valid ${q.key}. One of: ${q.options.join(", ")}\n`,
        );
        process.exit(2);
      }
      opts.answers[q.key] = value;
    }
  }
  return opts;
}

function help() {
  process.stdout.write(
    [
      "",
      "  dsiab init — wire this project up correctly",
      "",
      "  USAGE",
      "    dsiab init [options]          print the plan and the exact diff",
      "    dsiab init --write            apply it",
      "",
      "  OPTIONS",
      "    --write, -w      apply the changes instead of printing them",
      "    --yes, -y        take the defaults, ask nothing",
      "    --accent <name>  brand accent (default iris)",
      "    --neutral <name> neutral ramp (default auto, pairs to the accent)",
      "    --size <tier>    density tier: small | medium | large (default small)",
      "    --radius <name>  none | small | medium | large | full (default medium)",
      "    --force          let the agent-layer install overwrite its own files",
      "    --help, -h       print this",
      "",
      "  With no TTY every question takes its default, so this is safe in CI",
      "  and safe for an agent to run.",
      "",
    ].join("\n") + "\n",
  );
}

/* ---- prompting ------------------------------------------------------------ */

/** Ask one question, or return the default when there is nothing to read from. */
async function ask(rl, question, preset) {
  if (preset !== undefined) return preset;
  if (!rl) return question.def;
  const shown = question.options.length > 8
    ? `${question.options.slice(0, 6).join(", ")}, … (${question.options.length} total)`
    : question.options.join(" | ");
  const answer = (
    await new Promise((resolve) => rl.question(`  ${question.prompt} [${question.def}]\n    ${shown}\n  > `, resolve))
  ).trim();
  if (!answer) return question.def;
  if (!question.options.includes(answer)) {
    process.stdout.write(`    \`${answer}\` is not one of those. Keeping ${question.def}.\n`);
    return question.def;
  }
  return answer;
}

/* ---- project detection ---------------------------------------------------- */

/** Candidate entry files, in the order a project is most likely to use them. */
const ENTRY_CANDIDATES = [
  "src/main.tsx", "src/main.jsx", "src/main.ts", "src/main.js",
  "src/index.tsx", "src/index.jsx",
  "app/layout.tsx", "app/layout.jsx",
  "src/app/layout.tsx",
  "src/App.tsx", "src/App.jsx",
];

function detectProject() {
  const manifestPath = join(CWD, "package.json");
  if (!existsSync(manifestPath)) return { ok: false, why: "there is no package.json here" };
  let manifest;
  try {
    manifest = JSON.parse(readFileSync(manifestPath, "utf8"));
  } catch (err) {
    return { ok: false, why: `package.json is not valid JSON (${err.message})` };
  }
  const deps = { ...manifest.dependencies, ...manifest.devDependencies };
  const framework = deps.next ? "next" : deps.vite ? "vite" : deps["react-scripts"] ? "cra" : "unknown";
  const entry = ENTRY_CANDIDATES.find((candidate) => existsSync(join(CWD, candidate))) ?? null;
  return { ok: true, manifest, deps, framework, entry };
}

/** Peer ranges this package needs. The plan reports a peer only when its name is absent from package.json, and does not compare the declared range. */
const PEERS = [
  { name: "react", need: ">=19" },
  { name: "react-dom", need: ">=19" },
  { name: "@radix-ui/themes", need: "~3.3.0" },
];

/* ---- the edits ------------------------------------------------------------ */

const TOKENS_FILE = "dsiab-tokens.css";

/** How the token file is spelled from whichever file imports it. Set once the
 *  entry is known; `./` is the honest default for a root-level import. */
let tokenSpecifier = `./${TOKENS_FILE}`;

function tokenScaffold(answers) {
  return [
    "/* Your overrides of this design system's token layer.",
    " *",
    " * TWO SANCTIONED SEAMS, and this file is both of them. The rule is: declare it AFTER the",
    " * system stylesheet, at matching-or-higher specificity, scoped to `.radix-themes` or tighter.",
    " * Importing this file after `dsiab/styles.css` satisfies the ordering half.",
    " *",
    " *   1. A SEMANTIC FAMILY — `--error-*` / `--warning-*` / `--success-*` / `--info-*`.",
    " *      Overriding one moves only that family; the rest keep the automatic brand-collision",
    " *      shift.",
    " *   2. A `--ds-*` ROLE — the vocabulary every component paints from. Redeclare the role and",
    " *      every component using it follows, because they read the role rather than a scale.",
    " *",
    " * WHAT IS OFF CONTRACT, and will break quietly: vendor internals (`--space-*`,",
    " * `--font-size-*`, `--base-button-height`) are the terms the system's own laws are written",
    " * in, so redeclaring one stops the ladder agreeing with itself. Reach for the `scaling` prop",
    " * instead, which moves all of them together. Restyling by selector (`.rt-Button { … }`) is",
    " * invisible to every guard, including `dsiab check`.",
    " *",
    " * See node_modules/dsiab/docs/GUIDELINES.md §10 for the full contract.",
    " */",
    ".radix-themes {",
    "  /* Example — uncomment to move one role everywhere it is used:",
    "  --ds-text-strong: #101418;",
    "  */",
    "}",
    "",
    `/* Generated by \`dsiab init\` with accent=${answers.accent} neutral=${answers.neutral} ` +
      `size=${answers.uiSize} radius=${answers.radius}. Those four are Provider props, not tokens —`,
    "   they live in your app's entry, not in this file. */",
    "",
  ].join("\n");
}

function providerSnippet(answers, framework) {
  const props =
    `accentColor="${answers.accent}"` +
    (answers.neutral === "auto" ? "" : ` grayColor="${answers.neutral}"`) +
    ` uiSize="${answers.uiSize}" radius="${answers.radius}"`;
  const clientNote =
    framework === "next"
      ? [
          '// Next.js App Router: this package ships no "use client" directive, and its components',
          "// are built on hooks and context. Mark the boundary yourself, here or in a wrapper.",
          '"use client";',
          "",
        ]
      : [];
  return [
    ...clientNote,
    'import "dsiab/styles.css";',
    `import "${tokenSpecifier}";`,
    'import { Provider } from "dsiab";',
    "",
    "export default function App({ children }) {",
    `  return <Provider ${props}>{children}</Provider>;`,
    "}",
  ].join("\n");
}

/**
 * The token file sits at the project ROOT, so its specifier depends on where the
 * importing file lives. `./dsiab-tokens.css` is right from a root-level entry
 * and wrong from `src/main.tsx`, which is the common case — a resolve error the
 * consumer would meet at their next build rather than here.
 */
function specifierFor(fromFile) {
  const rel = relative(dirname(join(CWD, fromFile)), join(CWD, TOKENS_FILE)).split(sep).join("/");
  return rel.startsWith(".") ? rel : `./${rel}`;
}

/** The stylesheet import lines, in the order that matters. */
function importLines() {
  return [`import "dsiab/styles.css";`, `import "${tokenSpecifier}";`];
}

/**
 * Insert the two imports at the top of `source`, after any leading directive
 * (`"use client"`) and any leading comment block, and never twice.
 */
function withImports(source) {
  const lines = importLines().filter((line) => !source.includes(line));
  if (!lines.length) return { changed: false, text: source };
  const srcLines = source.split("\n");
  let at = 0;
  // A directive prologue has to stay first, or it stops being a directive.
  while (at < srcLines.length && /^\s*(["'])use \w+\1\s*;?\s*$/.test(srcLines[at])) at += 1;
  while (at < srcLines.length && /^\s*(\/\/|\/\*|\*)/.test(srcLines[at])) at += 1;
  srcLines.splice(at, 0, ...lines);
  return { changed: true, text: srcLines.join("\n"), inserted: lines, at: at + 1 };
}

/* ---- reporting ------------------------------------------------------------ */

const OK = "  ok  ";
const TODO = " todo ";
const WARN = " warn ";

function line(mark, text) {
  process.stdout.write(`${mark} ${text}\n`);
}

/* ---- main ----------------------------------------------------------------- */

const opts = parseArgs(process.argv.slice(2));
if (opts.help) {
  help();
  process.exit(0);
}

const project = detectProject();
if (!project.ok) {
  process.stderr.write(
    `dsiab init: ${project.why}.\n  Run this from the root of the project you want to wire up.\n`,
  );
  process.exit(2);
}
if (project.entry) tokenSpecifier = specifierFor(project.entry);

process.stdout.write(`\n  dsiab init — ${relative(dirname(CWD), CWD) || CWD}\n\n`);

const interactive = Boolean(process.stdin.isTTY && process.stdout.isTTY) && !opts.yes;
const rl = interactive ? createInterface({ input: process.stdin, output: process.stdout }) : null;
if (!interactive) {
  line(OK, `no prompts (${opts.yes ? "--yes" : "no TTY"}) — taking defaults for anything not passed as a flag`);
}

const answers = {};
for (const question of QUESTIONS) answers[question.key] = await ask(rl, question, opts.answers[question.key]);
if (rl) rl.close();

process.stdout.write("\n  PLAN\n");

/* 1. peers */
const missingPeers = PEERS.filter((peer) => !project.deps[peer.name]);
if (missingPeers.length) {
  for (const peer of missingPeers) line(TODO, `${peer.name} (needs ${peer.need}) is not in package.json`);
  // Only the ones actually absent. Telling somebody to install react when they already have it
  // is the kind of noise that teaches people to skim a tool's output.
  line(TODO, `install: npm i ${missingPeers.map((p) => `${p.name}@"${p.need}"`).join(" ")}`);
} else {
  line(OK, `peer dependencies present: ${PEERS.map((p) => p.name).join(", ")}`);
}

/* 2. the token override file */
const tokensPath = join(CWD, TOKENS_FILE);
const tokensExists = existsSync(tokensPath);
const tokensText = tokenScaffold(answers);
if (tokensExists) {
  line(OK, `${TOKENS_FILE} already exists — left exactly as it is`);
} else {
  line(opts.write ? OK : TODO, `${opts.write ? "wrote" : "would write"} ${TOKENS_FILE} (${tokensText.split("\n").length} lines)`);
  if (opts.write) writeFileSync(tokensPath, tokensText);
}

/* 3. the stylesheet imports in the entry file */
let entryResult = null;
if (!project.entry) {
  line(
    WARN,
    "no entry file found — looked for " + ENTRY_CANDIDATES.slice(0, 4).join(", ") + " and others",
  );
} else {
  const entryPath = join(CWD, project.entry);
  const before = readFileSync(entryPath, "utf8");
  entryResult = withImports(before);
  if (!entryResult.changed) {
    line(OK, `${project.entry} already imports the stylesheet and your token file`);
  } else {
    line(
      opts.write ? OK : TODO,
      `${opts.write ? "added" : "would add"} 2 imports to ${project.entry} at line ${entryResult.at}`,
    );
    if (opts.write) writeFileSync(entryPath, entryResult.text);
  }
}

/* 4. the agent layer — delegated, never reimplemented */
const dsCheck = join(HERE, "ds-check.mjs");
if (opts.write) {
  const initArgs = ["--init", ...(opts.force ? ["--force"] : [])];
  const agent = spawnSync(process.execPath, [dsCheck, ...initArgs], { stdio: "inherit" });
  line(agent.status === 0 ? OK : WARN, `agent instruction files (ds-check --init) exited ${agent.status}`);
} else {
  line(TODO, "would install the agent instruction files (ds-check --init)");
}

/* ---- what the tool cannot do for you ------------------------------------- */

process.stdout.write("\n  MOUNT THE PROVIDER — this part is yours\n");
process.stdout.write(
  "  Wrapping your tree is a structural edit, and guessing where your root renders is how a\n" +
    "  setup tool corrupts a file. The imports above are mechanical; this is not:\n\n",
);
process.stdout.write(
  providerSnippet(answers, project.framework)
    .split("\n")
    .map((l) => `    ${l}`)
    .join("\n") + "\n",
);

if (entryResult?.changed && !opts.write) {
  process.stdout.write(`\n  DIFF — ${project.entry}\n`);
  for (const inserted of entryResult.inserted) process.stdout.write(`    + ${inserted}\n`);
}

process.stdout.write(
  opts.write
    ? "\n  Done. Verify with `dsiab check .`, and read the system with `dsiab docs`.\n\n"
    : "\n  Nothing was written. Re-run with --write to apply.\n\n",
);
process.exit(0);
