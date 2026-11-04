/* =============================================================================
   apca-port.node-check.ts — THE APCA PORT AND THE REFERENCE STAY APART
   -----------------------------------------------------------------------------
   The system has two copies of APCA, on purpose ([[apca-runtime-port]]):

     • the REFERENCE, the apca-w3 package, a development dependency. The test
       lane (`src/foundations/apca.ts`) measures with it, and it never ships.
     • the PORT, `src/palette/apca.ts`, which the generator and the published
       assessment run at runtime.

   The arrangement fails in four quiet ways, and each arm below turns one of
   them into a red test:

     REFERENCE  A module outside the test lane imports apca-w3. The package's
                licence is limited, and it is not a runtime dependency, so a
                consumer's build would either break or carry it unseen.
     PORT       The port imports anything. It is pure arithmetic with no
                dependency, and an import from the test lane would make the
                code that picks a colour depend on the code that checks it.
     GUARDS     The test lane measures with the port. Then a defect in the port
                would pass its own check. The guards measure with the reference.
     VERSION    The port records which apca-w3 release it was ported from, and
                the licence requires keeping current. When the installed
                reference moves, this fails until someone re-checks the port
                against it (`src/palette/apca.logic.test.ts`) and updates the
                recorded version.
     CONSTANTS  Every constant in the port equals the one in the reference
                source's SA98G block. The agreement test catches a changed
                constant through its output, except `deltaYmin`, which no
                output can show, so this arm reads the values themselves.
   ============================================================================= */
import { readFileSync, readdirSync, statSync } from "node:fs";
import { createRequire } from "node:module";
import { join, relative } from "node:path";
import { test, expect } from "vitest";
import { APCA_W3_VERSION, SA98G } from "../palette/apca";

const ROOT = process.cwd();
const PORT = "src/palette/apca.ts";

/** The files that may import apca-w3, each with its reason. */
const MAY_IMPORT_REFERENCE: Record<string, string> = {
  "src/foundations/apca.ts": "the test lane's adapter, which every guard and story play measures through",
  "src/palette/apca.logic.test.ts": "the agreement test, which compares the port with the reference",
};

function walk(dir: string, out: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    if (name === "node_modules" || name.startsWith(".")) continue;
    const path = join(dir, name);
    if (statSync(path).isDirectory()) walk(path, out);
    else if (/\.(?:[cm]?[jt]sx?)$/.test(name)) out.push(relative(ROOT, path));
  }
  return out;
}

const SOURCES = [...walk(join(ROOT, "src")), ...walk(join(ROOT, "scripts")), ...walk(join(ROOT, "bin"))];

/** Module specifiers a file imports, re-exports or requires. */
function specifiers(file: string): string[] {
  const text = readFileSync(join(ROOT, file), "utf8");
  const found: string[] = [];
  for (const m of text.matchAll(/(?:^|[\s;])(?:import|export)\b[^'"`;]*?\bfrom\s*["']([^"']+)["']/gm)) found.push(m[1]!);
  for (const m of text.matchAll(/(?:^|[\s;(])import\s*["']([^"']+)["']/gm)) found.push(m[1]!);
  for (const m of text.matchAll(/\b(?:import|require)\s*\(\s*["']([^"']+)["']\s*\)/g)) found.push(m[1]!);
  return found;
}

test("the walk found the source tree, or every arm below is vacuous", () => {
  expect(SOURCES.length).toBeGreaterThan(300);
  expect(SOURCES).toContain(PORT);
  for (const file of Object.keys(MAY_IMPORT_REFERENCE)) expect(SOURCES).toContain(file);
});

test("REFERENCE: only the test lane imports apca-w3", () => {
  const offenders = SOURCES.filter((f) => !(f in MAY_IMPORT_REFERENCE) && specifiers(f).some((s) => s === "apca-w3" || s.startsWith("apca-w3/")));
  expect(offenders, "apca-w3 is a development dependency under a limited licence; runtime code uses src/palette/apca.ts").toEqual([]);
  // Anti-rot: every allowed file still imports it, so the list cannot keep a stale entry.
  for (const file of Object.keys(MAY_IMPORT_REFERENCE)) expect(specifiers(file), file).toContain("apca-w3");
});

test("PORT: the runtime port imports nothing", () => {
  expect(specifiers(PORT)).toEqual([]);
});

test("GUARDS: the test lane never measures with the port", () => {
  const lane = SOURCES.filter((f) => f.startsWith("src/foundations/") && f !== "src/foundations/apca-port.node-check.ts");
  const offenders = lane.filter((f) => specifiers(f).some((s) => /(?:^|\/)palette\/apca$/.test(s)));
  expect(offenders, "a guard that measures with the port cannot catch a defect in it").toEqual([]);
});

test("VERSION: the port records the installed apca-w3 release", () => {
  const installed = JSON.parse(readFileSync(join(ROOT, "node_modules/apca-w3/package.json"), "utf8")).version;
  expect(
    APCA_W3_VERSION,
    `apca-w3 is now ${installed}. Run src/palette/apca.logic.test.ts against it, port any change, ` +
      "then update APCA_W3_VERSION and the notice in THIRD-PARTY-NOTICES ([[apca-runtime-port]]).",
  ).toBe(installed);
  const notices = readFileSync(join(ROOT, "THIRD-PARTY-NOTICES"), "utf8");
  expect(notices, "THIRD-PARTY-NOTICES names the release the port is derived from").toContain(`apca-w3 ${APCA_W3_VERSION}`);
});

test("CONSTANTS: every constant equals the reference source's SA98G block", () => {
  const src = readFileSync(createRequire(import.meta.url).resolve("apca-w3"), "utf8");
  const block = src.slice(src.indexOf("const SA98G = {"), src.indexOf("MAGIC NUMBERS"));
  const theirs: Record<string, number> = {};
  for (const m of block.matchAll(/^\s*([A-Za-z]+):\s*([0-9.]+)\s*,/gm)) theirs[m[1]!] = Number(m[2]);
  expect(Object.keys(theirs).length, "the reference's constant block was not found").toBe(16);
  expect(theirs).toEqual({ ...SA98G });
});
