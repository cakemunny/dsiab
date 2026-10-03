#!/usr/bin/env node
/**
 * The consumer roster — `dist/registry.json`.
 *
 * WHY THIS FILE EXISTS AT ALL. `registry.json` at the repo root is the roster of record, and it
 * answers the first question anyone writing UI on this system should ask: does this already exist?
 * A consumer who installed the package could not ask it. They got `dist/index.d.ts`, which lists
 * every published NAME but says nothing about status, and nothing about the components that were
 * deliberately left out — so "it is not in the types" and "you may build your own" looked identical.
 * That gap matters most for an agent writing code against the package, because an agent builds what
 * it can find.
 *
 * WHY IT IS A PROJECTION AND NOT A COPY. The root registry is a maintainer's file. Its `note` field
 * is a build log: which upstream file a behaviour came from, which API was rejected, what a port
 * deferred. Seventy-eight entries carry one, they name the project this system's catalogue was
 * re-implemented from ninety times over, and they cite paths under `docs/`, which is deliberately
 * excluded from the package. Copying that wholesale would ship a build log to strangers and fill it
 * with links to files they do not have. Attribution is not the reason to keep it: THIRD-PARTY-NOTICES
 * already ships and names the source.
 *
 * WHAT SURVIVES, AND THE TEST EACH FIELD HAD TO PASS — "can the consumer act on it?"
 *
 *   name     yes — the identity they search for.
 *   status   yes, RENAMED. The root file says "ported", which is this system's own build
 *            vocabulary and presumes a port the reader knows nothing about. A consumer wants to
 *            know whether they can import it, so it emits `available`.
 *   tier     yes — how much documentation exists for it.
 *   exports  yes — the single most actionable field: the exact names to import.
 *   wraps    yes, DERIVED. See below.
 *   reason   yes, and ONLY on entries that are not available. "Why can I not have this, and may I
 *            build my own?" is a consumer question. The root note answers it in maintainer
 *            shorthand citing a spec that does not ship, so these are written here instead.
 *
 *   module / storyPath   no — paths inside `src/`, which a consumer does not have. The same dead
 *                        link this projection exists to remove.
 *   controlBox           no — the box family (row, composite, nav or exempt) that this repository's
 *                        own box-law guard reads. `src/foundations/control-box-registry.node-check.ts`
 *                        joins it to the `_internal/Control box` manifest and to the nav-ladder guard,
 *                        so no single-row control or nav row goes unmeasured.
 *                        A consumer runs no such guard and has no use for the field.
 *   wave                 no — internal build sequencing.
 *   astryxName / note    no — provenance and build log, the whole reason this projection exists.
 *   internalExports      no — names deliberately withheld. Publishing them advertises what cannot
 *                        be imported.
 *
 * WHY `wraps` IS DERIVED RATHER THAN COPIED, WHICH IS THE ONE DESIGN DECISION HERE.
 * The root `buildingBlock` is free prose, and free prose leaks. The guard caught six entries whose
 * value would have shipped an internal rule code, the phrase "lifted use…", a `src/` path, or the
 * upstream project's name outright. Hand-written overrides would have fixed those six and left the
 * next one to chance, each override a second string to keep in sync with a first.
 *
 * So this emits a DERIVATION instead: the Radix primitive when `buildingBlock` is exactly
 * `Radix <Identifier>`, and `null` otherwise. Both halves are actionable — 41 components say "this
 * thinly wraps Radix X, so that component's own props and documentation apply", and 63 say "custom
 * composition, do not assume a passthrough". Neither can carry a sentence. The strictness is the
 * point: `Radix Flex/Text/Box — the shared label · control · helper/status shell` begins with
 * "Radix " and is prose, so it correctly falls to `null`.
 *
 * THE GUARD IS WHAT MAKES THIS SAFE. `src/foundations/dist-registry.node-check.ts` scans the whole
 * serialized projection for porting vocabulary and for `docs/` or `src/` paths, and fails on either.
 * It found the six leaks above on its first run, before any of this shipped.
 *
 * NO SIDE EFFECT ON IMPORT. `buildDistRegistry` is pure and the write happens only when this file is
 * the process entry point. A drift guard that imports a generator which writes on import would
 * regenerate the thing it is about to compare, and pass unconditionally.
 *
 * Usage:  node scripts/dist-registry.mjs      (writes dist/registry.json)
 * Output: dist/registry.json                  (ships — `dist` is already in package.json files[])
 */
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { fileURLToPath, pathToFileURL } from "node:url";
import { dirname, resolve } from "node:path";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
export const SOURCE_PATH = resolve(ROOT, "registry.json");
export const OUT_PATH = resolve(ROOT, "dist/registry.json");

/**
 * Consumer-facing reasons for the entries this package does not include.
 *
 * The root registry answers this in maintainer shorthand — "parked pending parser-dependency
 * approval (spec section 8)" cites a spec that is not in the tarball, and "not ported by ruling"
 * uses vocabulary that only means something inside the repo. These say the same thing to somebody
 * who has only installed the package.
 *
 * Every entry whose status is not `ported` MUST have one. `buildDistRegistry` throws otherwise, so
 * a component excluded tomorrow cannot ship with an empty explanation.
 */
export const OUT_OF_SCOPE_REASONS = {
  Markdown:
    "Not included. Rendering Markdown requires a parser dependency, and adding one to this package has not been approved.",
  CodeBlock:
    "Not included. Syntax highlighting requires a parser dependency, and adding one to this package has not been approved.",
  Icon: "Not included by design. Import icons directly from @phosphor-icons/react — this system does not wrap them.",
};

/** Root `status` values mapped to what they mean to somebody who has installed the package. */
const STATUS = {
  ported: "available",
  "out-of-scope": "out-of-scope",
};

/**
 * Exactly `Radix ` followed by one identifier and nothing else. Anything looser admits prose, which
 * is the failure this whole field is shaped to avoid.
 */
const RADIX_WRAP = /^Radix ([A-Za-z][A-Za-z0-9]*)$/;

/** The Radix primitive this component thinly wraps, or null when it is a custom composition. */
function wrapsOf(buildingBlock) {
  const match = RADIX_WRAP.exec(buildingBlock ?? "");
  return match ? match[1] : null;
}

/**
 * Project the maintainer's registry onto the consumer roster. Pure: no reads, no writes, no clock.
 *
 * @param {Array<object>} registry parsed contents of the root registry.json
 * @returns {object} the object written to dist/registry.json
 */
export function buildDistRegistry(registry) {
  const components = registry.map((entry) => {
    const status = STATUS[entry.status];
    if (!status) {
      throw new Error(
        `dist-registry: ${entry.name} has status "${entry.status}", which has no consumer-facing ` +
          `equivalent. Add one to STATUS in scripts/dist-registry.mjs rather than letting an ` +
          `unmapped value reach a consumer.`,
      );
    }

    const projected = {
      name: entry.name,
      status,
      tier: entry.tier,
      wraps: wrapsOf(entry.buildingBlock),
      exports: entry.exports,
    };

    if (status !== "available") {
      const reason = OUT_OF_SCOPE_REASONS[entry.name];
      if (!reason) {
        throw new Error(
          `dist-registry: ${entry.name} is not available to consumers and has no reason. Add one to ` +
            `OUT_OF_SCOPE_REASONS in scripts/dist-registry.mjs. "It is not in the types" and "you ` +
            `may build your own" look identical without it.`,
        );
      }
      projected.reason = reason;
    }

    return projected;
  });

  const available = components.filter((c) => c.status === "available").length;

  return {
    about:
      "The component roster for this package: what exists, what to import, and what is deliberately " +
      "absent. `wraps` names the Radix Themes primitive a component thinly wraps, so that component's " +
      "own props apply; null means a custom composition with no passthrough to assume. Generated from " +
      "the maintainer's registry with build-log fields removed.",
    generatedBy: "scripts/dist-registry.mjs",
    counts: { total: components.length, available, unavailable: components.length - available },
    components,
  };
}

/** True when this module is the process entry point rather than an import. */
function isEntryPoint() {
  return Boolean(process.argv[1]) && import.meta.url === pathToFileURL(process.argv[1]).href;
}

if (isEntryPoint()) {
  const registry = JSON.parse(readFileSync(SOURCE_PATH, "utf8"));
  const projection = buildDistRegistry(registry);
  mkdirSync(dirname(OUT_PATH), { recursive: true });
  writeFileSync(OUT_PATH, `${JSON.stringify(projection, null, 2)}\n`);
  const wrapped = projection.components.filter((c) => c.wraps !== null).length;
  console.log(
    `dist-registry: wrote ${projection.counts.total} components ` +
      `(${projection.counts.available} available, ${projection.counts.unavailable} not; ` +
      `${wrapped} thin Radix wraps) -> ${OUT_PATH}`,
  );
}
