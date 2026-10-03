/* =============================================================================
   registry.node-check.ts — THE PORT-REGISTRY GUARD ([[component-registry]])
   -----------------------------------------------------------------------------
   Node-mode source guard (same harness as loose-values.node-check.ts, runs via
   vitest.node.config.ts / `npm run test:tokens` / the pretest hook). Enforces
   that registry.json — the machine-readable state of the Astryx port — cannot
   drift from the actual component layer:
     1. every entry is well-formed (status / wave / tier enums);
     2. every ported entry's storyPath exists on disk;
     3. every Components/* story file maps to a ported registry entry
        (underscore-prefixed fixtures are exempt, like the stories themselves).
   ============================================================================= */
import { readFileSync, readdirSync, existsSync } from "node:fs";
import { join, basename } from "node:path";
import { test, expect } from "vitest";

const ROOT = process.cwd();

type Entry = {
  name: string;
  astryxName?: string;
  status: "ported" | "planned" | "external" | "out-of-scope";
  wave: number;
  tier: "full" | "lite";
  buildingBlock: string;
  storyPath?: string;
  note?: string;
};

const registry: Entry[] = JSON.parse(readFileSync(join(ROOT, "registry.json"), "utf8"));
const STATUSES = ["ported", "planned", "external", "out-of-scope"];

test("registry entries are well-formed", () => {
  expect(registry.length).toBeGreaterThan(0);
  for (const e of registry) {
    expect(STATUSES, `${e.name}: status`).toContain(e.status);
    expect(e.wave, `${e.name}: wave`).toBeGreaterThanOrEqual(0);
    expect(e.wave, `${e.name}: wave`).toBeLessThanOrEqual(5);
    expect(["full", "lite"], `${e.name}: tier`).toContain(e.tier);
  }
});

test("every ported storyPath exists on disk", () => {
  for (const e of registry.filter((e) => e.status === "ported" && e.storyPath)) {
    expect(existsSync(join(ROOT, e.storyPath!)), `${e.name}: missing ${e.storyPath}`).toBe(true);
  }
});

test("every Components/* story file has a ported registry entry", () => {
  const dir = join(ROOT, "src/components/ui");
  const stories = readdirSync(dir).filter(
    (f) => f.endsWith(".stories.tsx") && !basename(f).startsWith("_"),
  );
  const ported = new Set(
    registry
      .filter((e) => e.status === "ported" && e.storyPath)
      .map((e) => basename(e.storyPath!)),
  );
  for (const f of stories) {
    expect(ported.has(f), `story ${f} has no ported registry entry`).toBe(true);
  }
});
