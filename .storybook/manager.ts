/* =============================================================================
   manager.ts — STORYBOOK SIDEBAR CHROME
   -----------------------------------------------------------------------------
   `_internal/*` opens COLLAPSED.

   The sidebar has five top-level entries, in the order preview.tsx's storySort
   sets ([[sidebar-order]]): the Index page, then the Foundations, Components, UI examples and
   `_internal` roots. The first four are documentation. `_internal` is the test
   suite made visible: this
   project's QA model is Storybook `play` functions run in vitest browser mode
   (`npm test`), so a behavioural fixture has to BE a story to be runnable. It is
   not a catalogue of components, and nothing in it is meant to be read as
   guidance — `page-header.node-check.ts` says so in the guard that exempts it:
   "`_internal/*` behavioural fixtures — test-only, never read as docs." Its
   first page, "About this section", tells a reader who opens it the same thing.

   Left expanded it also dominates the sidebar it sits in: 334 of the 689 entries
   are `_internal`, against 341 components and 14 Foundations (measured 2026-08-04).
   Roughly half of what a reader scrolls past is scaffolding.

   Collapsing the root does not hide it — the fixtures stay reachable in one
   click, stay searchable by name, and stay addressable by URL, so a play that
   fails in CI still opens straight to its story. The default just stops the
   scaffolding from being the first thing between a reader and the components.

   The id is `internal`, not `_internal`: Storybook sanitises the leading
   underscore out when it derives root ids from titles (hence story ids like
   `internal-field--select-field-api`).
   ============================================================================= */
import { addons } from "storybook/manager-api";

addons.setConfig({
  sidebar: {
    collapsedRoots: ["internal"],
  },
});
