import { defineConfig } from "vitest/config";

// Node-mode config for the source-scanning guards (loose-values.node-check.ts) and the
// lifted pure-logic suites (*.logic.test.ts — the Astryx date engine, DECISIONS [[catalog-as-specification]]). Kept
// SEPARATE from vitest.config.ts (the browser / Storybook suite) on purpose: the guards read
// the filesystem, which browser mode can't do; the lifted logic is pure native Date + Intl and
// needs no DOM; and the browser config is fragile (pre-bundled deps + a single React instance).
// The guard files are named *.node-check.ts and the lifted suites *.logic.test.ts — the browser
// config's Storybook include never picks either up; this config includes them explicitly. Run via
// `npm run test:tokens`, and automatically as `npm test`'s pretest hook.
export default defineConfig({
  test: {
    include: ["src/**/*.node-check.ts", "src/**/*.logic.test.ts"],
    environment: "node",
  },
});
