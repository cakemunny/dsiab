#!/usr/bin/env node
/**
 * The publish acceptance test — does the TARBALL work in somebody else's app?
 *
 * WHY THIS EXISTS, AND WHY IT READS VALUES RATHER THAN LOOKING AT A PAGE.
 * Every known failure mode of this package is SILENT. A consumer who forgets the stylesheet import
 * gets unstyled components and no error. A consumer who renders outside `Provider` gets custom
 * properties that never resolve, so every `calc()` is invalid at computed-value time and the page
 * simply paints a different system. A consumer who imports Radix's stylesheet after ours loses every
 * override. None of it throws, none of it warns, and no type check sees any of it.
 *
 * So "install it and check it works" would pass while the package was broken — everything APPEARS to
 * work. This test therefore asserts on COMPUTED VALUES off a rendered element in a real browser. The
 * measurement that motivated it: with `class="radix-themes"` but no `Provider`, `--ds-fill-accent`
 * and four spacing steps resolve to the empty string, and `--ds-text-strong` silently falls off the
 * paired grey ramp from `#1c2024` to `#202020`. That second one is the tell worth keeping, because a
 * near-identical dark grey is exactly the kind of wrong that survives a visual check.
 *
 * WHY A REAL TARBALL AND A REAL INSTALL. `npm pack` is the only step that applies the `files[]`
 * filter, so a document missing from that list is invisible to every other check in this repo. A
 * `file:` reference or a workspace link would resolve straight into the source tree and hide exactly
 * the packaging bugs this is for. It installs into a throwaway app, builds it with Vite, and serves
 * the build output — so the export map, the CSS extraction and the consumer's own bundler are all in
 * the path, which is where a packaging bug actually shows up.
 *
 * WHAT IT ASSERTS. Five groups of checks: the token layer resolves; components paint distinctly; the
 * two command-line entry points install, agree with each other and with their own help, run every
 * command the help lists, and change nothing without --write; the agent layer installs its seven
 * marked files; and the documents that are supposed to ship are present and carry no build log.
 * Each prints what it measured, so a failure names the value rather than the expectation.
 *
 * NETWORK. The install needs the npm registry for React, Radix and Vite. It runs with
 * `--prefer-offline` so a warm cache is used where possible. A failure here is reported as an
 * environment problem, not as a packaging failure, because the two need different responses.
 *
 * Usage:  npm run test:publish            (keeps nothing)
 *         npm run test:publish -- --keep  (leaves the throwaway app for inspection)
 */
import { execFileSync } from "node:child_process";
import { mkdtempSync, writeFileSync, mkdirSync, rmSync, existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve, join } from "node:path";
import { tmpdir } from "node:os";
import { createServer } from "node:http";
import { BANNED } from "./dist-decisions.mjs";
import { docsUrlFor } from "../bin/docs-url.mjs";
import { browserLaunchOptions, waitForBlockerStartup } from "./browser.mjs";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const KEEP = process.argv.includes("--keep");

/* ---------------------------------------------------------------------------
   Reporting. Every check prints what it MEASURED, not what it expected — a
   failure that says "expected non-empty" tells you nothing you did not already
   know, and one that says "got ''" tells you the token layer never resolved.
   --------------------------------------------------------------------------- */
const results = [];
function check(group, name, ok, measured) {
  results.push({ group, name, ok, measured });
  console.log(`  ${ok ? "PASS" : "FAIL"}  ${name}\n        measured: ${measured}`);
}

function run(cmd, args, opts = {}) {
  return execFileSync(cmd, args, { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"], ...opts });
}

/* ---------------------------------------------------------------------------
   The consumer's app. App.tsx opens with the README's own snippet, character for
   character, because "follow the README literally" is the point of the exercise —
   if the documented path does not work, nothing else matters. The probes come
   after it, wrapped in plain divs rather than passed as props, so the test never
   depends on a component forwarding an unknown attribute.
   --------------------------------------------------------------------------- */
const APP_TSX = `import "dsiab/styles.css";
import { Provider, Button, Callout, Flex, TextField, useMediaQuery } from "dsiab";

export default function App() {
  // useMediaQuery is the first export whose registry \`module\` is a PATH
  // (src/hooks/useMediaQuery.ts, not src/components/ui/). Importing it here is what
  // proves a slashed module survives the barrel, the bundle and the .d.ts — a unit
  // test in the repo cannot, because it resolves source rather than the tarball.
  const wide = useMediaQuery("(min-width: 600px)");
  return (
    <Provider accentColor="iris" uiSize="small">
      <Flex direction="column" gap="3" p="4">
        <Callout tone="info">Signed in as ada@example.com</Callout>
        <TextField label="Project name" placeholder="Untitled" />
        <Button priority="primary">Create project</Button>

        <div data-probe="primary"><Button priority="primary">Primary</Button></div>
        <div data-probe="danger"><Button priority="primary" tone="danger">Delete</Button></div>
        <div data-probe="hook">{String(wide)}</div>
      </Flex>
    </Provider>
  );
}
`;

const MAIN_TSX = `import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App";

createRoot(document.getElementById("root")).render(<StrictMode><App /></StrictMode>);
`;

const INDEX_HTML = `<!doctype html>
<html lang="en">
  <head><meta charset="utf-8" /><title>acceptance</title></head>
  <body><div id="root"></div><script type="module" src="/src/main.jsx"></script></body>
</html>
`;

const VITE_CONFIG = `import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
export default defineConfig({ plugins: [react()], build: { minify: false } });
`;

function scaffold(dir) {
  mkdirSync(join(dir, "src"), { recursive: true });
  writeFileSync(join(dir, "package.json"), JSON.stringify({
    name: "ds-acceptance-app", private: true, version: "0.0.0", type: "module",
  }, null, 2));
  writeFileSync(join(dir, "index.html"), INDEX_HTML);
  writeFileSync(join(dir, "vite.config.js"), VITE_CONFIG);
  writeFileSync(join(dir, "src/App.jsx"), APP_TSX);
  writeFileSync(join(dir, "src/main.jsx"), MAIN_TSX);
  // main.jsx imports "./App"; Vite resolves the extension.
}

/** Serve a built directory. Returns { url, close }. */
function serve(dir) {
  const TYPES = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css",
    ".woff2": "font/woff2", ".json": "application/json", ".svg": "image/svg+xml" };
  const server = createServer((req, res) => {
    const path = (req.url || "/").split("?")[0];
    const file = join(dir, path === "/" ? "index.html" : path);
    if (!existsSync(file) || statSync(file).isDirectory()) { res.writeHead(404); res.end(); return; }
    const ext = file.slice(file.lastIndexOf("."));
    res.writeHead(200, { "content-type": TYPES[ext] ?? "application/octet-stream" });
    res.end(readFileSync(file));
  });
  return new Promise((ok) => {
    server.listen(0, "127.0.0.1", () => {
      ok({ url: `http://127.0.0.1:${server.address().port}/`, close: () => server.close() });
    });
  });
}

async function main() {
  const app = mkdtempSync(join(tmpdir(), "ds-acceptance-"));
  let server = null;
  let browser = null;

  try {
    console.log("\n=== 1. pack the real tarball ===");
    run("npm", ["run", "build"], { cwd: ROOT });
    // `npm pack` runs the `prepare` lifecycle script, whose own stdout lands ahead of the
    // JSON — so this cannot be handed straight to JSON.parse. Slice from the first bracket
    // rather than silencing the lifecycle, which would hide a genuine prepare failure.
    const packOutput = run("npm", ["pack", "--json", "--pack-destination", app], { cwd: ROOT });
    const jsonStart = packOutput.indexOf("[");
    if (jsonStart === -1) throw new Error(`npm pack printed no JSON:\n${packOutput}`);
    const packed = JSON.parse(packOutput.slice(jsonStart));
    const tarball = join(app, packed[0].filename);
    console.log(`  ${packed[0].filename} — ${packed[0].files.length} files, ${(packed[0].size / 1e6).toFixed(2)} MB`);

    console.log("\n=== 2. install it into a throwaway app ===");
    scaffold(app);
    try {
      run("npm", ["install", "--prefer-offline", "--no-audit", "--no-fund",
        tarball, "react", "react-dom", "@radix-ui/themes", "vite", "@vitejs/plugin-react"], { cwd: app });
    } catch (error) {
      console.error("\nINSTALL FAILED — this is an environment problem, not a packaging one.");
      console.error(String(error.stderr || error.message).slice(0, 1200));
      process.exit(2);
    }
    console.log("  installed");

    console.log("\n=== 3. build the app exactly as the README says to write it ===");
    run("npx", ["vite", "build"], { cwd: app });
    console.log("  built");

    server = await serve(join(app, "dist"));
    const { chromium } = await import("playwright");
    // The browser comes from the resolver the story suite uses too (scripts/browser.mjs): the
    // DS_BROWSER_PATH override, then Playwright's own Chromium. The wait runs before the page loads
    // anything, because a Chromium build with uBlock Origin built in reloads a tab that loads while
    // the blocker is still starting. A reload in the middle of the reads below would measure a page
    // that is being torn down. In a browser with no blocker the wait returns at once.
    browser = await chromium.launch(browserLaunchOptions());
    const page = await browser.newPage();
    await waitForBlockerStartup(page);
    const errors = [];
    page.on("pageerror", (e) => errors.push(String(e)));
    // The detect-and-warn layer (DECISIONS [[missing-provider-warning]]) reports a missing Provider or a missing stylesheet.
    // This app has both, so any `[dsiab]` line here is a FALSE POSITIVE shipped to every correctly
    // installed consumer — the one failure mode of a warning layer that is worse than the silence
    // it replaced. `pageerror` does not see console.warn, so it is collected separately.
    const libWarnings = [];
    page.on("console", (m) => {
      if (m.type() === "warning" && m.text().includes("[dsiab]")) libWarnings.push(m.text());
    });
    await page.goto(server.url, { waitUntil: "networkidle" });
    await page.waitForSelector('[data-probe="primary"] button', { timeout: 15000 });

    console.log("\n=== 4. the token layer resolves ===");
    const tokens = await page.evaluate(() => {
      const root = document.querySelector(".radix-themes");
      const cs = getComputedStyle(root);
      const read = (name) => cs.getPropertyValue(name).trim();
      const probe = document.createElement("span");
      probe.style.color = "var(--ds-text-strong)";
      root.appendChild(probe);
      const textStrong = getComputedStyle(probe).color;
      probe.remove();
      return {
        fillAccent: read("--ds-fill-accent"),
        space8: read("--ds-space-8"),
        space16: read("--ds-space-16"),
        radius3: read("--ds-radius-3"),
        textSmSize: read("--ds-text-sm-size"),
        textStrongResolved: textStrong,
        hasRoot: Boolean(root),
      };
    });

    check("tokens", "a theme root exists", tokens.hasRoot, String(tokens.hasRoot));
    check("tokens", "--ds-fill-accent resolves", tokens.fillAccent !== "", `"${tokens.fillAccent}"`);
    check("tokens", "--ds-space-8 resolves", tokens.space8 !== "", `"${tokens.space8}"`);
    check("tokens", "--ds-space-16 resolves", tokens.space16 !== "", `"${tokens.space16}"`);
    check("tokens", "--ds-radius-3 resolves", tokens.radius3 !== "", `"${tokens.radius3}"`);
    check("tokens", "--ds-text-sm-size resolves", tokens.textSmSize !== "", `"${tokens.textSmSize}"`);
    // The tell. #202020 is bare slate; #1c2024 is the accent-paired ramp. If the
    // Provider's attributes never landed, this is the difference — and it is far
    // too small to catch by looking.
    check("tokens", "--ds-text-strong is the paired ramp, not bare slate",
      tokens.textStrongResolved === "rgb(28, 32, 36)",
      `${tokens.textStrongResolved}  (want rgb(28, 32, 36) = #1c2024; rgb(32, 32, 32) = #202020 means the ramp fell through)`);

    console.log("\n=== 5. components paint distinctly ===");
    const paints = await page.evaluate(() => {
      const of = (sel) => {
        const el = document.querySelector(sel);
        return el ? getComputedStyle(el).backgroundColor : null;
      };
      return { primary: of('[data-probe="primary"] button'), danger: of('[data-probe="danger"] button') };
    });
    check("paint", "a primary Button paints a colour", Boolean(paints.primary) && paints.primary !== "rgba(0, 0, 0, 0)", String(paints.primary));
    check("paint", 'tone="danger" paints differently from primary',
      Boolean(paints.danger) && paints.danger !== paints.primary,
      `primary ${paints.primary} vs danger ${paints.danger}`);
    check("paint", "the page threw no errors", errors.length === 0, errors.length ? errors.join(" | ") : "none");
    check("paint", "a correct install triggers no library warning", libWarnings.length === 0,
      libWarnings.length ? libWarnings.join(" | ") : "none — Provider and stylesheet both detected");

    // The path-module route, end to end. The viewport is wider than 600px, so a hook that
    // resolved, subscribed and returned would render "true". An unresolved import would have
    // failed the Vite build in step 3; a BROKEN one reaches here and renders nothing.
    const hookValue = await page.evaluate(() => {
      const el = document.querySelector('[data-probe="hook"]');
      return el ? el.textContent : null;
    });
    check("paint", "an export whose registry module is a path works from the tarball",
      hookValue === "true",
      `useMediaQuery("(min-width: 600px)") rendered ${JSON.stringify(hookValue)} (want "true")`);

    console.log("\n=== 5b. both binaries install and route to one code path ===");
    // `dsiab` is the front door; `ds-check` is the alias kept for the README, the installed agent
    // rules and anybody's CI. The router delegates by spawning ds-check.mjs, so the thing worth
    // asserting from a REAL install is that both entry points exist on PATH and agree.
    const installedPkg = join(app, "node_modules", "dsiab", "package.json");
    const manifestVersion = JSON.parse(readFileSync(installedPkg, "utf8")).version;
    const reportedVersion = run("npx", ["dsiab", "--version"], { cwd: app }).trim();
    check("cli", "`dsiab` is installed and reports the package version",
      reportedVersion === manifestVersion,
      `dsiab --version printed ${JSON.stringify(reportedVersion)}, manifest says ${JSON.stringify(manifestVersion)}`);

    const viaRouter = run("npx", ["dsiab", "check", "src"], { cwd: app });
    const viaAlias = run("npx", ["ds-check", "src"], { cwd: app });
    check("cli", "`dsiab check` and the `ds-check` alias are the same code path",
      viaRouter === viaAlias,
      viaRouter === viaAlias ? "byte-identical output" : "the router and the alias disagree");

    const helpText = run("npx", ["dsiab", "--help"], { cwd: app });
    // Help must not advertise a command that does not run. An absent command is honest; a listed
    // one teaches the reader to expect something. Parse the COMMANDS block ONLY — the USAGE line
    // above it also sits at this indent and reads as a command name if the whole file is scanned.
    const commandsBlock = helpText.slice(helpText.indexOf("COMMANDS"), helpText.indexOf("ALSO"));
    const advertised = [...commandsBlock.matchAll(/^ {4}(\w[\w-]*)/gm)].map((m) => m[1]);
    // Compared against the router's own table rather than by RUNNING each command: `docs` opens a
    // browser, which a gate must never do. `--list-commands` is the same assertion with no side
    // effect. Help and the table either agree or they do not.
    const tabled = run("npx", ["dsiab", "--list-commands"], { cwd: app }).trim().split("\n").filter(Boolean);
    const advertisedNotReal = advertised.filter((name) => !tabled.includes(name));
    const realNotAdvertised = tabled.filter((name) => !advertised.includes(name));
    check("cli", "the help text and the command table are the same set",
      advertisedNotReal.length === 0 && realNotAdvertised.length === 0,
      advertisedNotReal.length || realNotAdvertised.length
        ? `advertised but absent: [${advertisedNotReal.join(", ")}]; present but unadvertised: [${realNotAdvertised.join(", ")}]`
        : `${tabled.length} commands, help and table agree: ${tabled.join(", ")}`);

    // Listed is not enough: each listed command has to run from the tarball. `eject` once stayed in
    // the table after its script left `files`, so the help advertised a command that died on a
    // module-not-found stack trace. `--help` reaches each command's own code with no side effect,
    // and `docs --help` prints and exits before anything could open a browser.
    const dsiabBin = join(app, "node_modules", "dsiab", "bin", "dsiab.mjs");
    const brokenCommands = tabled.filter((name) => {
      try {
        run(process.execPath, [dsiabBin, name, "--help"], { cwd: app });
        return false;
      } catch {
        return true;
      }
    });
    check("cli", "every command the help lists runs from the tarball",
      brokenCommands.length === 0,
      brokenCommands.length
        ? `--help exited nonzero for: ${brokenCommands.join(", ")}`
        : `--help ran for all ${tabled.length}: ${tabled.join(", ")}`);

    // `dsiab docs` in an installed copy prints the hosted URL for exactly this version and opens
    // it ([[docs-hosting]]). `--no-open` prints only. Run with node directly rather than npx, and with every
    // socket connect and DNS lookup made fatal, so the check proves the command reaches no network
    // rather than trusting that it does not.
    const NO_NETWORK = "data:text/javascript," + encodeURIComponent(
      'import net from "node:net"; import dns from "node:dns";' +
        'const deny = () => { throw new Error("dsiab docs reached for the network"); };' +
        "net.Socket.prototype.connect = deny; dns.lookup = deny;",
    );
    const wantDocsUrl = docsUrlFor(manifestVersion);
    let docsOut = "";
    try {
      docsOut = run(process.execPath,
        ["--import", NO_NETWORK, join(app, "node_modules", "dsiab", "bin", "dsiab.mjs"), "docs", "--no-open"],
        { cwd: app });
    } catch (err) {
      docsOut = `exit ${err.status}: ${err.stdout ?? ""}${err.stderr ?? ""}`;
    }
    check("cli", "`dsiab docs --no-open` prints this version's hosted docs with no network",
      docsOut.includes(wantDocsUrl),
      docsOut.includes(wantDocsUrl) ? `printed ${wantDocsUrl}` : `want ${wantDocsUrl}, got ${JSON.stringify(docsOut.trim())}`);

    // `dsiab init` must be SAFE BY DEFAULT. The whole design rests on it printing a plan rather
    // than editing a consumer's entry file, so the gate proves the dry run touches nothing — read
    // from the filesystem, not from what the command claims.
    const entryBefore = readFileSync(join(app, "src/main.jsx"), "utf8");
    const initDryRun = run("npx", ["dsiab", "init", "--yes"], { cwd: app });
    const entryAfter = readFileSync(join(app, "src/main.jsx"), "utf8");
    const tokensAppeared = existsSync(join(app, "dsiab-tokens.css"));
    check("cli", "`dsiab init` writes nothing without --write", entryBefore === entryAfter && !tokensAppeared,
      entryBefore === entryAfter && !tokensAppeared
        ? "entry unchanged, no token file created"
        : `entry changed: ${entryBefore !== entryAfter}; token file created: ${tokensAppeared}`);

    // And it must name the two imports that are the measured failure it exists to prevent.
    check("cli", "`dsiab init` names the stylesheet and token imports it would add",
      initDryRun.includes("dsiab/styles.css") && initDryRun.includes("dsiab-tokens.css"),
      initDryRun.includes("dsiab/styles.css") && initDryRun.includes("dsiab-tokens.css")
        ? "both imports named in the plan"
        : "the plan did not name both imports");

    console.log("\n=== 6. the agent layer installs ===");
    const initOut = run("npx", ["ds-check", "--init"], { cwd: app });
    // --init writes seven files and no others ([[agent-files-and-docs-layout]]): the rules as AGENTS.md, then the dsiab skill, a
    // rules copy beside it and the review agent, once under .agents/ for tools that read Agent Skills
    // there and once under .claude/ for Claude Code. The list is written out here rather than read
    // from bin/ds-check.mjs, because a probe that reads the table it checks agrees with any mistake
    // in that table.
    const EXPECTED_INIT = [
      "AGENTS.md",
      ".agents/skills/dsiab/SKILL.md",
      ".agents/skills/dsiab/references/rules.md",
      ".agents/skills/design-system-steward/SKILL.md",
      ".claude/skills/dsiab/SKILL.md",
      ".claude/skills/dsiab/references/rules.md",
      ".claude/agents/design-system-steward.md",
    ];
    // The app has files of its own at the root, so the exact set is read under the two agent
    // folders, where this app starts with nothing.
    const agentFolderFiles = [".claude", ".agents"].flatMap((d) => existsSync(join(app, d))
      ? readdirSync(join(app, d), { recursive: true, withFileTypes: true })
        .filter((e) => e.isFile()).map((e) => join(e.parentPath, e.name).slice(app.length + 1).split("\\").join("/"))
      : []);
    const missing = EXPECTED_INIT.filter((f) => !existsSync(join(app, f)));
    const extra = agentFolderFiles.filter((f) => !EXPECTED_INIT.includes(f));
    check("agents", `ds-check --init writes exactly its ${EXPECTED_INIT.length} files`, missing.length === 0 && extra.length === 0,
      missing.length || extra.length
        ? `missing: ${missing.join(", ") || "none"}; extra: ${extra.join(", ") || "none"}`
        : `all ${EXPECTED_INIT.length} present, nothing else under .claude/ or .agents/`);

    /* NO GATE AND NO SETTINGS, FROM THE TARBALL ([[agent-files-and-docs-layout]]). The package ships no gate code, and --init
       installs no gate and creates no settings file, because either one would change how the
       user's tools behave. The report names the guide the user's agent reads next. */
    const hooksDir = existsSync(join(app, ".claude", "hooks"));
    const settingsFile = existsSync(join(app, ".claude", "settings.json"));
    const gateCode = ["bin/gates", "bin/ds-gates.mjs"].filter((f) => existsSync(join(app, "node_modules", "dsiab", f)));
    const namesGuide = initOut.includes("node_modules/dsiab/docs/AGENT-SETUP.md");
    check("agents", "--init installs no gate and no settings file, and names the setup guide",
      !hooksDir && !settingsFile && gateCode.length === 0 && namesGuide,
      `.claude/hooks: ${hooksDir}; .claude/settings.json: ${settingsFile}; gate code shipped: ${gateCode.join(", ") || "none"}; guide named: ${namesGuide}`);

    // Every copy comes from one source file in the package. A skill copy is that file byte for byte.
    // A rules copy is one marker comment line, a blank line, and then that file byte for byte. The
    // Claude Code agent is generated from the steward skill, so only its marker is checked, below.
    const COPIES = [
      ["AGENTS.md", "skills/dsiab/references/rules.md", "rules"],
      [".agents/skills/dsiab/SKILL.md", "skills/dsiab/SKILL.md", "skill"],
      [".agents/skills/dsiab/references/rules.md", "skills/dsiab/references/rules.md", "rules"],
      [".agents/skills/design-system-steward/SKILL.md", "skills/design-system-steward/SKILL.md", "skill"],
      [".claude/skills/dsiab/SKILL.md", "skills/dsiab/SKILL.md", "skill"],
      [".claude/skills/dsiab/references/rules.md", "skills/dsiab/references/rules.md", "rules"],
    ];
    const driftedCopies = COPIES.filter(([to, from, kind]) => {
      if (!existsSync(join(app, to))) return true;
      const copy = readFileSync(join(app, to), "utf8");
      const source = readFileSync(join(app, "node_modules", "dsiab", from), "utf8");
      if (kind === "skill") return copy !== source;
      const head = copy.slice(0, copy.length - source.length);
      return !copy.endsWith(source) || !/^<!--[^\n]*\bdsiab-managed\b[^\n]*-->\n\n$/.test(head);
    }).map(([to]) => to);
    check("agents", "every copy matches its source in the package", driftedCopies.length === 0,
      driftedCopies.length ? `differ or missing: ${driftedCopies.join(", ")}` : `${COPIES.length} copies, each identical to its source`);

    // The rules have to actually arrive, not just a file with a heading.
    const RULE_MARKER = "Paint from the `--ds-*` semantic tokens";
    const agents = readFileSync(join(app, "AGENTS.md"), "utf8");
    check("agents", "AGENTS.md carries the rules themselves", agents.includes(RULE_MARKER),
      `${agents.length} bytes, rule text present: ${agents.includes(RULE_MARKER)}`);

    /* OWNERSHIP RIDES A MARKER INSIDE THE FILE (bin/ds-check.mjs, isDsiabManaged). A rules copy
       carries it as an HTML comment on its first line, a skill or an agent as
       `dsiab-managed: "true"` in its frontmatter. A file without it belongs to the user, and --init
       never replaces it again, so a copy that lands unmarked is one the package can never update.
       The patterns are written out here for the same reason as the file list. --init writes no
       CLAUDE.md or GEMINI.md: the user's own files of those names stay theirs. */
    const marked = (text) => {
      if (/^<!--[^\n]*\bdsiab-managed\b[^\n]*-->/.test(text)) return true;
      if (!text.startsWith("---\n")) return false;
      const close = text.indexOf("\n---", 3);
      return close > 0 && /^\s+dsiab-managed:\s*"true"\s*$/m.test(text.slice(0, close));
    };
    const unmarked = EXPECTED_INIT.filter((f) => existsSync(join(app, f)) && !marked(readFileSync(join(app, f), "utf8")));
    const pointerFiles = ["CLAUDE.md", "GEMINI.md"].filter((f) => existsSync(join(app, f)));
    check("agents", "every file --init writes carries the marker, and it writes no CLAUDE.md or GEMINI.md",
      unmarked.length === 0 && pointerFiles.length === 0,
      `unmarked: ${unmarked.join(", ") || "none"}; pointer files: ${pointerFiles.join(", ") || "none"}`);

    // A second run changes nothing. Every file is this package's copy and identical to what --init
    // would write, so each reads ALREADY CURRENT. A run that rewrote an identical file would also
    // rewrite one the user had edited, the day the comparison went wrong.
    const firstRun = new Map(EXPECTED_INIT.filter((f) => existsSync(join(app, f)))
      .map((f) => [f, readFileSync(join(app, f))]));
    const rerunOut = run("npx", ["ds-check", "--init"], { cwd: app });
    const changedOnRerun = [...firstRun].filter(([f, bytes]) => !readFileSync(join(app, f)).equals(bytes)).map(([f]) => f);
    const rewroteOnRerun = /^WROTE$/m.test(rerunOut);
    check("agents", "a second --init changes no byte", changedOnRerun.length === 0 && !rewroteOnRerun,
      `changed: ${changedOnRerun.join(", ") || "none"}; report lists WROTE: ${rewroteOnRerun}; ` +
        `report lists ALREADY CURRENT: ${rerunOut.includes("ALREADY CURRENT")}`);

    console.log("\n=== 7. the shipped documents are there, and carry no build log ===");
    const pkgDir = join(app, "node_modules", "dsiab");
    const DOCS = ["docs/GUIDELINES.md", "docs/AGENT-SETUP.md", "docs/REFERENCES.md", "CHANGELOG.md", "LICENSE",
      "THIRD-PARTY-NOTICES", "skills/dsiab/SKILL.md", "skills/dsiab/references/rules.md",
      "skills/design-system-steward/SKILL.md", "dist/registry.json", "dist/DECISIONS.md"];
    const missingDocs = DOCS.filter((f) => !existsSync(join(pkgDir, f)));
    check("docs", "every document that should ship is installed", missingDocs.length === 0,
      missingDocs.length ? `missing: ${missingDocs.join(", ")}` : DOCS.join(", "));

    // The root AGENTS.md holds the rules for working on this repository, and CONTRIBUTING.md the
    // route for a change to it. A consumer receives the consumer rules from --init instead, so either
    // file in the package would hand the user a second rule set written for somebody else.
    const contributorDocs = ["AGENTS.md", "CONTRIBUTING.md"].filter((f) => existsSync(join(pkgDir, f)));
    check("docs", "no contributor document ships", contributorDocs.length === 0,
      contributorDocs.length ? `shipped: ${contributorDocs.join(", ")}` : "neither AGENTS.md nor CONTRIBUTING.md is in the package");

    // The ledger ships as a projection, so the ARTIFACT is what has to be clean — the node-lane
    // guard proves the generator. Every shipped doc cites ruling IDs, so a consumer who follows
    // one must not land on a `docs/` path excluded from distribution or the maintainer's home
    // directory. `astryx` is deliberately NOT checked here: THIRD-PARTY-NOTICES ships that
    // attribution because MIT requires it.
    const ledger = readFileSync(join(pkgDir, "dist/DECISIONS.md"), "utf8");
    // The term list is IMPORTED, not restated. A private copy here is the [[container-size-seeding]] shape, and it bit
    // immediately: this had its own `["docs/", "~/", ...]` array, and the moment the ledger gained
    // the word `dist-docs/` the copy reported a leak the real pattern had already been corrected
    // for. One definition, in the generator that owns the projection.
    const ledgerLeaks = BANNED.map(({ term, re }) => ({ term, n: (ledger.match(re) ?? []).length }))
      .filter((leak) => leak.n > 0);
    check("docs", "the shipped ledger carries no dead link or private path", ledgerLeaks.length === 0,
      ledgerLeaks.length
        ? `found: ${ledgerLeaks.map((l) => `${l.term} x${l.n}`).join(", ")}`
        : `${ledger.split("\n").length} lines, none of the ${BANNED.length} classes`);

    const roster = JSON.parse(readFileSync(join(pkgDir, "dist/registry.json"), "utf8"));
    check("docs", "the roster lists components with a status", Array.isArray(roster.components) && roster.components.length > 0,
      `${roster.counts?.total} components, ${roster.counts?.available} available`);
    // Checks the ARTIFACT, not the generator. The node-lane guard proves the
    // projection function is clean; this proves what actually landed on disk is.
    const rosterText = JSON.stringify(roster);
    const leaks = ["astryx", "stylex", "upstream", "docs/", "src/"].filter((t) => rosterText.toLowerCase().includes(t));
    check("docs", "the installed roster carries no build log", leaks.length === 0,
      leaks.length ? `found: ${leaks.join(", ")}` : "no lineage terms, no unreachable paths");

    const installedVersion = JSON.parse(readFileSync(join(pkgDir, "package.json"), "utf8")).version;
    const stamped = readFileSync(join(pkgDir, "dist/index.js"), "utf8").includes(`var version = "${installedVersion}"`);
    check("docs", "the build is stamped with its own version", stamped, `manifest ${installedVersion}, stamped in dist/index.js: ${stamped}`);
  } finally {
    if (browser) await browser.close();
    if (server) server.close();
    if (!KEEP) rmSync(app, { recursive: true, force: true });
    else console.log(`\n  kept: ${app}`);
  }

  const failed = results.filter((r) => !r.ok);
  console.log(`\n${"=".repeat(64)}`);
  console.log(`${results.length - failed.length}/${results.length} checks passed`);
  if (failed.length) {
    console.log("\nFAILED:");
    for (const f of failed) console.log(`  ${f.name}\n    ${f.measured}`);
    process.exit(1);
  }
  console.log("The published tarball works when installed and followed literally.");
}

main().catch((error) => {
  console.error("\nacceptance run itself failed:\n", error);
  process.exit(2);
});
