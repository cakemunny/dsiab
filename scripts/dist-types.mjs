#!/usr/bin/env node
/**
 * The type-file pass: makes `dist/**\/*.d.ts` resolvable under every consumer resolution mode.
 *
 * `tsc -p tsconfig.build.json` copies the source's extensionless relative specifiers into the
 * declaration files, such as `from "./theme/Provider"`, and keeps the side-effect import of
 * `../tokens/index.css` that the provider source carries. Two consumer failures follow. Under
 * `moduleResolution: nodenext` with `skipLibCheck: false`, TypeScript reports TS2834 inside this
 * package's type files, and with `skipLibCheck: true` every type the package exports silently
 * becomes `any`. With `skipLibCheck: false`, TypeScript 6 also reports TS2882 for the stylesheet
 * import, because the package does not ship that file.
 *
 * So this pass rewrites every relative specifier to the declaration it names (`./x.js` or
 * `./x/index.js`) and blanks each stylesheet import line, keeping the empty line so line numbers
 * hold. Styles reach a consumer only through `dsiab/styles.css`, never through a type file.
 *
 * A relative specifier that names no declaration file is a build defect, and the pass exits 1
 * naming the file and the specifier. Running it twice changes nothing the second time.
 *
 * Usage: node scripts/dist-types.mjs [distDir]   (default: <repo>/dist)
 */
import { readFileSync, writeFileSync, readdirSync, existsSync } from "node:fs";
import { fileURLToPath, pathToFileURL } from "node:url";
import { dirname, join, resolve } from "node:path";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");

/** A whole line that only imports a stylesheet for its side effect. */
const STYLE_IMPORT = /^[ \t]*import\s+["'][^"']*\.css["'];?[ \t]*$/gm;

/** `from "…"`, `import("…")` and side-effect `import "…"`, capturing the quote and specifier. */
const SPECIFIER = /(\bfrom\s+|\bimport\s*\(\s*|^[ \t]*import\s+)(["'])([^"']+)\2/gm;

/** Specifiers that already name a file and stay as they are. */
const HAS_EXTENSION = /\.(?:js|mjs|cjs|json)$/;

/** Every `*.d.ts` beneath `dir`. */
function declarationFiles(dir) {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) return declarationFiles(path);
    return entry.name.endsWith(".d.ts") ? [path] : [];
  });
}

/** The rewritten specifier, or null when the relative path names no declaration file. */
function resolveSpecifier(fromFile, specifier) {
  const target = resolve(dirname(fromFile), specifier);
  const base = specifier.replace(/\/$/, "");
  if (specifier !== "." && specifier !== ".." && existsSync(`${target}.d.ts`)) return `${base}.js`;
  if (existsSync(join(target, "index.d.ts"))) return `${base}/index.js`;
  return null;
}

/** Rewrite one file's source. Pure apart from existence checks against the file system. */
export function rewriteDeclaration(file, source) {
  let blanked = 0;
  let rewritten = 0;
  const failures = [];
  const text = source
    .replace(STYLE_IMPORT, () => {
      blanked += 1;
      return "";
    })
    .replace(SPECIFIER, (match, lead, quote, specifier) => {
      if (!specifier.startsWith(".") || HAS_EXTENSION.test(specifier)) return match;
      if (!/^\.\.?(?:\/|$)/.test(specifier)) return match;
      const next = resolveSpecifier(file, specifier);
      if (next === null) {
        failures.push(specifier);
        return match;
      }
      rewritten += 1;
      return `${lead}${quote}${next}${quote}`;
    });
  return { text, blanked, rewritten, failures };
}

/** Run the pass over `distDir`. Returns the totals; throws on an unresolvable specifier. */
export function rewriteDist(distDir) {
  const totals = { files: 0, changed: 0, rewritten: 0, blanked: 0 };
  const failures = [];
  for (const file of declarationFiles(distDir)) {
    const source = readFileSync(file, "utf8");
    const result = rewriteDeclaration(file, source);
    totals.files += 1;
    for (const specifier of result.failures) failures.push(`${file}: "${specifier}"`);
    if (result.text !== source) {
      writeFileSync(file, result.text);
      totals.changed += 1;
    }
    totals.rewritten += result.rewritten;
    totals.blanked += result.blanked;
  }
  if (failures.length > 0) {
    throw new Error(
      `dist-types: relative specifiers that name no declaration file:\n  ${failures.join("\n  ")}`,
    );
  }
  return totals;
}

/** True when this module is the process entry point rather than an import. */
function isEntryPoint() {
  return Boolean(process.argv[1]) && import.meta.url === pathToFileURL(process.argv[1]).href;
}

if (isEntryPoint()) {
  const distDir = resolve(process.argv[2] ?? resolve(ROOT, "dist"));
  try {
    const t = rewriteDist(distDir);
    console.log(
      `dist-types: rewrote ${t.rewritten} specifiers and blanked ${t.blanked} stylesheet imports across ${t.changed} of ${t.files} files in ${distDir}`,
    );
  } catch (error) {
    console.error(error.message);
    process.exit(1);
  }
}
