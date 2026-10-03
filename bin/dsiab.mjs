#!/usr/bin/env node
/**
 * `dsiab` — the one command a consumer runs.
 *
 * -----------------------------------------------------------------------------
 * WHY THIS EXISTS RATHER THAN MORE FLAGS ON `ds-check`
 * -----------------------------------------------------------------------------
 * The package shipped one binary named `ds-check`, and it had already outgrown
 * its name: `ds-check --init` installs agent instruction files, which is not
 * checking anything, and opening the docs is further still from it. A setup
 * flow living under a binary called "check" is a name that has to be explained
 * every time.
 *
 * So `dsiab` is the front door and `ds-check` stays as a working alias, because
 * it is in a shipped README, in the agent rule files this package installs, and
 * plausibly in somebody's CI. Removing it would buy nothing.
 *
 * DELEGATION IS BY PROCESS, DELIBERATELY. `bin/ds-check.mjs` runs its command
 * only when Node starts it directly, and otherwise only exposes the helpers its
 * own guard tests import. Importing it here would tie the router to those
 * internals, and a refactor of the one tool consumers run every day would then
 * risk it for a cosmetic gain. Spawning it costs one process start and cannot
 * change its behaviour by accident, so the alias and the subcommand are
 * provably the same code path.
 *
 * HELP LISTS ONLY WHAT WORKS. A command named here that prints "coming soon" is
 * worse than one that is absent: absence is honest, and a listed command teaches
 * a reader to expect something. Commands arrive in this list when they run.
 */
import { spawnSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join, resolve } from "node:path";
import { DOCS_URL, docsUrlFor, openBrowser } from "./docs-url.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const DS_CHECK = join(HERE, "ds-check.mjs");

/** The package's own version, for `--version` and for the help footer. */
function ownVersion() {
  try {
    return JSON.parse(readFileSync(resolve(HERE, "..", "package.json"), "utf8")).version;
  } catch {
    return "unknown";
  }
}

/**
 * Run a sibling script in a child process, inheriting the terminal so colour,
 * width and interactivity behave exactly as running it directly does, and exit
 * with its status so a CI step sees the same code either way.
 *
 * Spawning rather than importing is the decision recorded in [[dsiab-command]]: these scripts
 * read `process.argv` and run at import, and rewriting them into modules to
 * satisfy a router would risk the tools people actually use for a cosmetic gain.
 */
function delegateTo(script, args, label) {
  const result = spawnSync(process.execPath, [script, ...args], { stdio: "inherit" });
  if (result.error) {
    process.stderr.write(`dsiab ${label}: could not run ${script}: ${result.error.message}\n`);
    process.exit(2);
  }
  // A child killed by a signal reports null status; 1 is the honest answer there,
  // because "it did not pass" is true and 0 would claim it did.
  process.exit(result.status ?? 1);
}

/** `check` and `rules` are the original binary, reached under its new name. */
function delegateToCheck(args) {
  delegateTo(DS_CHECK, args, "check");
}

/**
 * Open this version's documentation. Two routes, chosen by what sits on disk.
 *
 * A source CHECKOUT, with the local server and a built bundle beside this file,
 * serves the bundle from disk. That keeps the command useful while developing
 * the system, where the pages may describe work no release carries yet.
 *
 * Anywhere else, which means an installed copy, it prints the hosted URL for
 * exactly this version and opens it. Each release deploys to its own permanent
 * alias, so the pages can never describe a different release than the one
 * installed. Nothing is downloaded and no server starts.
 *
 * WHY THE DOCS ARE NOT IN THIS PACKAGE. A fresh Storybook build is 23 MB across
 * 504 files. Bundling it takes the package from 7.19 MB to 29.06 MB unpacked, in
 * every install, every CI run and every Docker layer. A second npm package for
 * the docs was the earlier answer, and [[docs-hosting]] retired it for hosting.
 */
function delegateToDocs(args) {
  const server = join(HERE, "dsiab-docs.mjs");
  if (existsSync(server) && existsSync(resolve(HERE, "..", "storybook-static", "index.html"))) {
    delegateTo(server, args, "docs");
  }

  let open = true;
  for (const arg of args) {
    if (arg === "--no-open") open = false;
    else if (arg === "--help" || arg === "-h") {
      process.stdout.write(
        "\n  dsiab docs [--no-open]\n\n" +
          "  Prints the documentation URL for this installed version and opens it.\n" +
          "  --no-open prints the URL only.\n\n",
      );
      process.exit(0);
    } else {
      process.stderr.write(`dsiab docs: unknown option \`${arg}\`. Try \`dsiab docs --help\`.\n`);
      process.exit(2);
    }
  }

  const version = ownVersion();
  // An unreadable manifest has no version to pin, so the latest docs are the honest fallback.
  const url = version === "unknown" ? DOCS_URL : docsUrlFor(version);
  process.stdout.write(`dsiab ${version} docs → ${url}\n`);
  // A checkout with the server but no bundle is a maintainer who has not built
  // one yet. Their version may not be deployed, so name the local route too.
  if (existsSync(server)) {
    process.stdout.write("  For a local copy of this checkout's docs, run `npm run build-storybook` first.\n");
  }
  if (open) openBrowser(url);
  process.exit(0);
}

/**
 * Every command, in the order help prints them. `run` receives the arguments
 * after the command name. A command appears here only when it works.
 */
const COMMANDS = {
  check: {
    args: "[path]",
    blurb: "check your code against the rules this system ships",
    run: (rest) => delegateToCheck(rest),
  },
  rules: {
    args: "",
    blurb: "print those rules, and how to allow a line on purpose",
    run: (rest) => delegateToCheck(["--rules", ...rest]),
  },
  init: {
    args: "[--write] [--yes]",
    blurb: "wire this project up: the imports, a token file, and the agent layer",
    // Spawned like the others, and for the same reason: one code path, and a
    // child that owns its own exit status. `init` installs the agent layer by
    // delegating to ds-check itself, so that installer stays the single copy.
    run: (rest) => delegateTo(join(HERE, "dsiab-init.mjs"), rest, "init"),
  },
  docs: {
    args: "[--no-open]",
    blurb: "open the documentation for this exact version",
    run: (rest) => delegateToDocs(rest),
  },
};

function help() {
  const width = Math.max(...Object.entries(COMMANDS).map(([n, c]) => `${n} ${c.args}`.trimEnd().length));
  const lines = [
    "",
    `  dsiab ${ownVersion()} — a brand-themeable design system on Radix Themes`,
    "",
    "  USAGE",
    "    dsiab <command> [options]",
    "",
    "  COMMANDS",
    ...Object.entries(COMMANDS).map(([name, c]) => {
      const left = `${name} ${c.args}`.trimEnd();
      return `    ${left.padEnd(width)}   ${c.blurb}`;
    }),
    "",
    "  ALSO",
    "    --version, -v    print the installed version",
    "    --help, -h       print this",
    "",
    "  `ds-check` is an alias for `dsiab check` and remains supported.",
    "",
  ];
  process.stdout.write(`${lines.join("\n")}\n`);
}

const argv = process.argv.slice(2);
const first = argv[0];

if (first === undefined || first === "--help" || first === "-h" || first === "help") {
  help();
  process.exit(0);
}

if (first === "--version" || first === "-v") {
  process.stdout.write(`${ownVersion()}\n`);
  process.exit(0);
}

// Undocumented, and deliberately so: this exists for the publish gate, which
// asserts that every command the help text advertises is really in the table.
// The obvious probe, running each advertised command, is wrong here because
// `docs` opens a browser or starts a server. Printing the table is the same
// assertion with no side effect at all.
if (first === "--list-commands") {
  process.stdout.write(`${Object.keys(COMMANDS).join("\n")}\n`);
  process.exit(0);
}

const command = COMMANDS[first];
if (command) {
  command.run(argv.slice(1));
  // `run` always exits. Reaching here means a command forgot to, which is a bug
  // in this file rather than in the user's invocation, so say so plainly.
  process.stderr.write(`dsiab: the \`${first}\` command did not exit. This is a bug in dsiab.\n`);
  process.exit(70);
}

// A path rather than a command is the most likely mistake, because that is what
// `ds-check` took. Name the correction instead of only rejecting the input.
const looksLikePath = first === "." || first.startsWith("./") || first.startsWith("/") || first.startsWith("--");
process.stderr.write(
  looksLikePath
    ? `dsiab: \`${first}\` is not a command. Did you mean \`dsiab check ${first}\`?\n`
    : `dsiab: unknown command \`${first}\`. Run \`dsiab --help\` for the list.\n`,
);
process.exit(2);
