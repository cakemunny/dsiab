/* =============================================================================
   src/version.ts — WHAT BUILD IS THIS?
   -----------------------------------------------------------------------------
   `dist/index.js` used to contain the package version zero times, so two builds
   of this package were indistinguishable from inside a consuming app. A bug
   report could name a symptom but never the artifact that produced it, and
   "which version are you on?" had no answer that did not depend on the reporter
   reading their own lockfile correctly.

   `__DS_VERSION__` is replaced at build time by the `define` in
   `vite.config.lib.ts`, which reads it from `package.json`. Two things about
   that mechanism are worth stating, because both have a trap next to them:

   1. Vite's define plugin DOES fire for user-supplied keys in library mode.
      Only the automatic `process.env.*` map is skipped there — measured in
      `node_modules/vite/dist/node/chunks/node.js`, where `if (!isBuildLib)`
      wraps that map and nothing else. The neighbouring warning in
      `vite.config.lib.ts` about never defining `process.env.NODE_ENV` or
      `import.meta.env.DEV` still stands and is a different rule.

   2. `typeof` is load-bearing, not defensive noise. Storybook and the vitest
      configs do not carry this define, so in those two environments the
      identifier is genuinely undeclared. `typeof` on an undeclared identifier is
      the one operation JavaScript allows without throwing; a bare reference
      would be a ReferenceError on every story.

   The development fallback is deliberately not a plausible version number. A
   reader who sees `0.0.0-dev` in a bug report knows the reporter is running a
   source checkout, which is the fact worth carrying.
   ============================================================================= */
declare const __DS_VERSION__: string | undefined;

/**
 * The version of this package, injected at build time.
 *
 * `0.0.0-dev` outside a library build — Storybook, the test suites, and any
 * source checkout. That value means "not a released artifact", not "version
 * zero".
 */
export const version: string =
  typeof __DS_VERSION__ === "string" ? __DS_VERSION__ : "0.0.0-dev";
