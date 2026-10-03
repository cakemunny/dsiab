#!/usr/bin/env node
/**
 * The local documentation server behind `dsiab docs` in a source checkout.
 *
 * -----------------------------------------------------------------------------
 * WHY A CHECKOUT SERVES FROM DISK AND AN INSTALL DOES NOT
 * -----------------------------------------------------------------------------
 * An installed copy of dsiab opens the hosted docs for its exact version, and
 * this file does not ship ([[docs-hosting]]). A checkout is different: the pages may describe
 * work no release carries yet, so `dsiab docs` there serves the bundle that
 * `npm run build-storybook` wrote beside the source.
 *
 * This file stays out of the npm tarball on purpose. Shipping the server without
 * the 23 MB bundle beside it would give a consumer a command that starts and
 * then reports a missing bundle.
 *
 * THIS FILE IS A SERVER, NOT A BUILDER. The bundle is already compiled. Serving
 * it needs no Storybook, no Vite and no dependencies: `node:http` and nothing
 * else.
 */
import { createServer } from "node:http";
import { readFile, stat } from "node:fs/promises";
import { existsSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, extname, join, normalize, resolve, sep } from "node:path";
import { openBrowser } from "./docs-url.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));

/** The bundle `npm run build-storybook` writes, one level up from this file. */
const ROOT_CANDIDATE = resolve(HERE, "..", "storybook-static");
const ROOT = existsSync(join(ROOT_CANDIDATE, "index.html")) ? ROOT_CANDIDATE : undefined;

/** Content types for what a Storybook build actually emits. An unknown extension
 *  falls through to a byte stream rather than to `text/html`, because a wrong
 *  `text/html` renders a font as mojibake instead of failing visibly. */
const TYPES = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".map": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".gif": "image/gif",
  ".ico": "image/x-icon",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
  ".ttf": "font/ttf",
  ".txt": "text/plain; charset=utf-8",
};

function parseArgs(argv) {
  const opts = { port: 6006, open: true, host: "127.0.0.1" };
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === "--no-open") opts.open = false;
    else if (arg === "--port" || arg === "-p") opts.port = Number(argv[(i += 1)]);
    else if (arg.startsWith("--port=")) opts.port = Number(arg.slice("--port=".length));
    else if (arg === "--host") opts.host = argv[(i += 1)];
    else if (arg === "--help" || arg === "-h") opts.help = true;
    else {
      process.stderr.write(`dsiab docs: unknown option \`${arg}\`. Try --help.\n`);
      process.exit(2);
    }
  }
  if (!Number.isInteger(opts.port) || opts.port < 1 || opts.port > 65535) {
    process.stderr.write(`dsiab docs: --port must be a port number, got \`${opts.port}\`.\n`);
    process.exit(2);
  }
  return opts;
}

function help() {
  process.stdout.write(
    [
      "",
      "  dsiab docs — serve this checkout's Storybook locally",
      "",
      "  USAGE",
      "    dsiab docs [options]",
      "",
      "  OPTIONS",
      "    --port, -p <n>   port to listen on (default 6006, next free port if taken)",
      "    --host <addr>    interface to bind (default 127.0.0.1, loopback only)",
      "    --no-open        do not open a browser",
      "    --help, -h       print this",
      "",
      "  The bundle is served from disk. No network, no Storybook toolchain.",
      "",
    ].join("\n") + "\n",
  );
}

/**
 * Resolve a URL path to a file inside ROOT, or null when it escapes.
 *
 * The containment check is the security boundary: this serves a directory over
 * HTTP, so `..` traversal has to be impossible rather than unlikely. Comparing
 * the NORMALIZED absolute path against `ROOT + sep` is what makes it so —
 * checking the URL for ".." is the version of this that gets bypassed by
 * encoding.
 */
function resolveRequestPath(urlPath) {
  let decoded;
  try {
    decoded = decodeURIComponent(urlPath.split("?")[0].split("#")[0]);
  } catch {
    return null;
  }
  if (decoded.endsWith("/")) decoded += "index.html";
  const full = normalize(join(ROOT, decoded));
  if (full !== ROOT && !full.startsWith(ROOT + sep)) return null;
  return full;
}

/** Listen on `port`, stepping to the next one while the port is taken. Ten
 *  attempts, because a machine with ten consecutive busy ports is telling you
 *  something a eleventh attempt will not fix. */
function listen(server, { host, port }, attemptsLeft = 10) {
  return new Promise((resolvePort, reject) => {
    const onError = (err) => {
      server.removeListener("error", onError);
      if (err.code === "EADDRINUSE" && attemptsLeft > 0) {
        listen(server, { host, port: port + 1 }, attemptsLeft - 1).then(resolvePort, reject);
      } else reject(err);
    };
    server.once("error", onError);
    server.listen(port, host, () => {
      server.removeListener("error", onError);
      resolvePort(port);
    });
  });
}

const opts = parseArgs(process.argv.slice(2));
if (opts.help) {
  help();
  process.exit(0);
}

if (!ROOT) {
  process.stderr.write(
    "dsiab docs: the documentation bundle is missing.\n" +
      `  Looked in ${ROOT_CANDIDATE}\n` +
      "  Run `npm run build-storybook` first.\n",
  );
  process.exit(2);
}
/* =============================================================================
   THE EJECTION MARKER
   -----------------------------------------------------------------------------
   `dsiab eject` copies a component into the consumer's repo and records it in
   `dsiab.json`. From that moment the page documenting that component describes
   the PACKAGED version rather than the copy the app actually renders, and the
   failure mode is somebody six months later reading documentation for markup
   that no longer exists in their product.

   THE BUNDLE CANNOT BE PATCHED, which is what makes injection the answer rather
   than a workaround. It is compiled output living in `node_modules`, so editing
   it is both futile — the next install rewrites it — and wrong, because one
   project's ejections are not another's. But the SERVER is ours, and it reads
   the manifest from the project it was launched in. So the bundle stays byte-
   identical, the marking is per-project, and it all still works offline.

   Injected into the two HTML documents only, as one script tag before </head>.
   No page rewriting, no DOM surgery on 500 compiled files.
   ============================================================================= */

/** Components this project has ejected, read from the launch directory. */
function ejectedHere() {
  const path = join(process.cwd(), "dsiab.json");
  if (!existsSync(path)) return {};
  try {
    return JSON.parse(readFileSync(path, "utf8")).ejected ?? {};
  } catch (err) {
    // ONLY a bad manifest is tolerated. A malformed dsiab.json is not worth failing the docs over,
    // and `dsiab eject` is where that gets reported and fixed. Anything else is a defect in THIS
    // file and must be loud: a blanket catch here already swallowed a missing `readFileSync`
    // import once and silently disabled the whole marker, which looked exactly like "no
    // components are ejected".
    if (err instanceof SyntaxError) return {};
    throw err;
  }
}

const EJECTED = ejectedHere();

/**
 * The marker script. Runs in the Storybook manager AND in the story iframe, so
 * it works whichever frame a reader is looking at: it flags the sidebar entry in
 * one and banners the page in the other.
 */
function markerScript() {
  return (
    `<script>(function(){var E=${JSON.stringify(EJECTED)};` +
    `var names=Object.keys(E);if(!names.length)return;` +
    `function slug(n){return n.replace(/([a-z0-9])([A-Z])/g,"$1-$2").toLowerCase()}` +
    `function banner(){` +
    `var id=(location.search.match(/[?&]id=([^&]+)/)||[])[1]||"";` +
    `var hit=names.filter(function(n){return id.indexOf(slug(n))===0||id.indexOf("-"+slug(n)+"-")>-1});` +
    `if(!hit.length||document.getElementById("dsiab-ejected"))return;` +
    `var e=E[hit[0]];var d=document.createElement("div");d.id="dsiab-ejected";` +
    `d.setAttribute("role","note");` +
    `d.style.cssText="position:sticky;top:0;z-index:2147483647;padding:10px 14px;` +
    `font:600 13px/1.45 ui-sans-serif,system-ui,sans-serif;color:#582d1d;background:#ffe0c2;` +
    `border-bottom:1px solid #f3b391";` +
    `d.textContent="Ejected in this project \\u2014 your copy at "+e.path+" is what renders. ` +
    `This page documents the packaged "+hit[0]+" from dsiab "+e.version+".";` +
    `document.body.insertBefore(d,document.body.firstChild)}` +
    `function sidebar(){names.forEach(function(n){` +
    `document.querySelectorAll('[data-item-id],[id]').forEach(function(el){` +
    `var k=el.getAttribute("data-item-id")||el.id||"";` +
    `if(k.indexOf(slug(n))>-1&&!el.dataset.dsiabEjected){el.dataset.dsiabEjected="1";` +
    `el.title="Ejected in this project";el.style.opacity="0.75"}})})}` +
    `function go(){try{banner();sidebar()}catch(_){}}` +
    `if(document.readyState!=="loading")go();else document.addEventListener("DOMContentLoaded",go);` +
    `setTimeout(go,1200);setTimeout(go,3000)})();</script>`
  );
}


const server = createServer(async (req, res) => {
  const filePath = resolveRequestPath(req.url ?? "/");
  if (!filePath) {
    res.writeHead(403, { "content-type": "text/plain; charset=utf-8" });
    res.end("forbidden");
    return;
  }
  try {
    const info = await stat(filePath);
    const target = info.isDirectory() ? join(filePath, "index.html") : filePath;
    let body = await readFile(target);
    const type = TYPES[extname(target).toLowerCase()] ?? "application/octet-stream";

    // HTML only, and only when this project has ejected something. Everything
    // else is served byte-for-byte off disk.
    if (type.startsWith("text/html") && Object.keys(EJECTED).length) {
      const html = body.toString("utf8");
      const marker = markerScript();
      body = Buffer.from(
        html.includes("</head>") ? html.replace("</head>", `${marker}</head>`) : `${marker}${html}`,
        "utf8",
      );
    }

    res.writeHead(200, {
      "content-type": type,
      "content-length": body.length,
      // The bundle is immutable for a given version, but a served copy is read
      // from disk each time so a rebuilt checkout shows up without a hard reload.
      "cache-control": "no-cache",
    });
    res.end(body);
  } catch {
    res.writeHead(404, { "content-type": "text/plain; charset=utf-8" });
    res.end("not found");
  }
});

const port = await listen(server, opts);
const url = `http://${opts.host}:${port}/`;
process.stdout.write(`\n  dsiab docs → ${url}\n  serving ${ROOT}\n  Ctrl+C to stop\n\n`);
if (opts.open) openBrowser(url);

for (const signal of ["SIGINT", "SIGTERM"]) {
  process.on(signal, () => {
    server.close(() => process.exit(0));
  });
}
