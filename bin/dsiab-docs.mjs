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
import { existsSync } from "node:fs";
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
    const body = await readFile(target);
    const type = TYPES[extname(target).toLowerCase()] ?? "application/octet-stream";

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
