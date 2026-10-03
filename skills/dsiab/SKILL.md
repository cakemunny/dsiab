---
name: dsiab
description: >-
  Build or review UI on dsiab, the brand-themeable layer on Radix Themes. Use it whenever you are
  about to write a component, a page, a style rule, or a token against this package, and whenever you
  review code that consumes it. It tells you what already exists so you compose instead of inventing,
  the rules that bind the code, the exact commands, which steward to dispatch, and the check that must
  pass before you claim anything works.
metadata:
  dsiab-managed: "true"
---

# Building on this design system

This system is a token and component layer over [Radix Themes](https://www.radix-ui.com/themes). Brand
and neutral are runtime `Provider` props, so one swap re-skins a whole product — which is exactly why a
hardcoded colour or a private spacing value does more damage here than it would in an ordinary app.

Your job when writing UI on it is mostly *composition*, not construction. The system has already
decided most of what you are about to decide.

## First — which of the two places are you in?

They hold different files, and most of this page assumes the second.

- **A product repo that installed the package.** You have `node_modules/dsiab` and `npx
  ds-check`. You do **not** have `src/`, the Storybook, or any `npm run …` script listed below — npm
  answers *Missing script*. You **do** have a roster: `dsiab/registry.json`, a trimmed
  projection carrying each component's `name`, `status`, `tier`, `exports[]` and `wraps`. Step 1
  below works here, with the consumer form of the lookup. `dist/index.d.ts` stays the authority on
  exact type signatures.
- **The system repo itself** — a fork, or the folder the zip unpacked to. Everything here runs:
  `registry.json` at the root, Storybook on :6006, `npm run barrel`, the guards, the story suite.

Every `npm run …` command below assumes the second. `npx ds-check` is the one gate that holds in
both, and Step 1 holds in both with the lookup written for where you are.

## Step 1 — look it up before you build it

**`registry.json` is the roster of record.** Read the file rather than any count or list you remember.
Each entry carries the component's `status`, `tier` and the exact `exports[]` names it publishes, and
in the system repo its `module` as well.

```bash
# does this exist? — in the SYSTEM REPO
node -e "console.log(require('./registry.json').filter(e=>/dialog/i.test(e.name)).map(e=>e.name+' '+e.status).join('\n'))"

# does this exist? — in a PRODUCT REPO that installed the package
node -e "console.log(require('dsiab/registry.json').components.filter(e=>/dialog/i.test(e.name)).map(e=>e.name+' '+e.status).join('\n'))"
```

Three outcomes, and each has one correct response. The status value differs by where you are: the
system repo says `ported`, the shipped roster says `available`, and they mean the same thing.

| What the registry says | What you do |
| --- | --- |
| `ported` / `available` | Import it. Do not rebuild it, and do not wrap it "just to add one prop". |
| `out-of-scope` | Deliberately absent. The entry says why — `note` in the system repo, `reason` in the shipped roster. Do not build your own. |
| Not there at all | Use the raw Radix Themes component under `GUIDELINES.md`, or **surface the gap**. Never improvise a `Components/*` equivalent. |

The same rule governs *values*. If the system does not specify a number for your context — a target
size, a duration, a spacing step — say so and stop. Never invent a number, and never split the
difference between two you found elsewhere.

Then read the component's Storybook page (`npm run storybook`, `:6006`). It is the rendered source of
truth, and its Usage story closes on a live token spec that tells you what the component actually
paints.

## Step 2 — the rules that will fail your code

Four, and the first two are absolute:

1. **Paint from `--ds-*` semantic tokens.** Never a hex, never a bare Radix scale step (`--accent-9`,
   `--gray-a7`). Status and validation come from the accent-aware families —
   `--ds-{text,fill,stroke,icon}-{error,warning,success,info}` — so they follow the brand→semantic
   collision shift. Radix `red`/`green` in a component is a defect.
2. **No `!important`, ever.** Win the cascade with specificity and source order under `.radix-themes`:
   a `.radix-themes`-scoped selector (0,2,0) beats Radix's `:where()`-wrapped rule (0,1,0) when it
   loads after. Live-probe `getComputedStyle` before adding any override — usually the selector
   already wins and the `!important` is dead weight.
3. **Reuse before you invent.** Before the first edit that adds a new component, token or pattern,
   write down: what already exists that could serve this (with paths or token names), which of those
   you are applying and how, and — only if nothing fits — what you must invent and why nothing
   existing can be adapted. "Cleaner", "I prefer it" and "faster fresh" are not reasons.
4. **Inputs carry their own field chrome; you do not compose it.** `label`, `description` and
   `validation` are props on the input — plus `info` / `endSlot` where the label row takes them — and a
   `validation` message *replaces* the description rather than stacking under it. The shell behind
   those props (`Field.Root` / `Field.Label` / `Field.Description` / `Field.Message`) is internal by
   ruling and is **not exported**, so a hand-built input cannot be given this chrome; surface the gap
   instead. Two consequences to design around: `CheckboxGroup` / `RadioGroup` have **no group-level
   `label` or `validation`** — name the group with `aria-label` / `aria-labelledby`, put the error
   where the form puts its others, and raise it, because that one is an open gap rather than a ruling
   — and `useOptionalFieldControl()` returns `null` outside an input that renders its own `Field.Root`.
   The focus ring is built by overriding **Radix's own focus selector**, never by adding a parallel
   `.ds-focus-ring` class — that class silently never fires, because `:focus-visible` matches the inner
   input rather than the wrapper.

`references/rules.md` beside this skill carries these in full. The system-repo traps, portaled
popovers and the rules for building onto the `Field` shell from inside the system, live in the
repository's own `AGENTS.md`, for contributors only. `DECISIONS.md` says why each exists. Cite the
ruling name rather than re-argue it.

## Step 3 — run the check, then claim

**`npx ds-check` is mandatory before any done-claim. Run it, read the output, and quote the exit
status.** Not "available", not "you may want to" — a claim that code works, is fixed, is complete, or
is ready, made without a `ds-check` run in the same session, is invalid and must be withdrawn.

```bash
npx ds-check                 # the current directory
npx ds-check src/features    # a subtree, or a single file
npx ds-check --rules         # the five rules in full, and the allowance grammar
```

It enforces five rules that are defects in **any** codebase, not this system's house style:
`transition-all`, `will-change-misuse`, `focus-outline-removed`, `tabindex-positive`, `aschild-nonint`. It reads
`.css .scss .less .pcss .postcss .ts .tsx .js .jsx .mjs .cjs .mts .cts .html .htm .vue .svelte .astro`
and **prints its own reach on every run** — a pass is a statement about the files it lists and nothing
more, so read that section rather than assuming coverage.

Exit `0` = nothing to fix in what was read. Exit `1` = a violation, or an allowance that was rejected
or has gone stale. Exit `2` = the command itself was wrong.

To keep a deliberate deviation, annotate the line. It stays visible in the report under ALLOWED
instead of failing the run, and an allowance on a line that no longer violates the rule **fails**, so
these cannot silt up into permanent exemptions:

```css
/* ds-allow transition-all — third-party widget re-themes on load, properties unknown */
```

If you are working inside the system repo rather than consuming it, `ds-check` is not the whole gate.
Also run `./node_modules/.bin/tsc --noEmit` (the local binary, not `npx tsc`), `npm run test:tokens`
for the source-scanning guards, and `npm test` for the story suite in vitest browser mode with axe on
every story. That last one drives the first Chromium-family browser that [`scripts/browser.mjs`](https://github.com/cakemunny/dsiab/blob/main/scripts/browser.mjs) finds:
the `DS_BROWSER_PATH` override if it is set, then Playwright's own Chromium, the same version on every
machine. Install that once with `npx playwright install chromium`, or point `DS_BROWSER_PATH` at any
Chromium-family binary.

Then **look at it**. A visual claim is earned by observing rendered pixels and writing the diff
sentence: *"Before: [what I saw]. After: [what I see]."* A passing type check and a quiet console are
not visual verification.

## Step 4 — dispatch the right steward

The `design-system-steward` review agent ships with the package, and `npx ds-check --init` installs it
in `.claude/agents/` and `.agents/skills/`. It reviews and reports. It is not an implementer, and its
findings are worth re-checking yourself, because some come back overstated. The other two reviewers
serve contributors to the dsiab repository, where `npm run agents` generates them.

- **`design-system-steward`** — before any done-claim on UI. It owns system fidelity: tokens,
  accessibility (WCAG 2.2 AA), reuse, cascade, and visual proof. This is the default dispatch once you
  have built or changed something a user can see.
- **`docs-steward`** — when the change touches a `*.stories.tsx`, `GUIDELINES.md`, a `DECISIONS.md`
  entry, or a shared docs primitive. It hunts claims the code contradicts, pages that disagree with
  each other, and prose a refactor left behind.
- **`pattern-steward`** — *after* something has landed, never as a gate. It answers "what else in the
  system is now out of step with this?": which existing assets should adopt the new mechanism, and
  what the new asset hand-rolled that a sibling already solved.

## The commands, in one place

Every `npm run …` line here belongs to the system repo. In a product repo, `npx ds-check` is the only
one of them that exists.

```bash
npm install                  # dependencies, exact lockfile versions
npm run storybook            # the docs on :6006 — the rendered source of truth
npm run build                # dist/index.js + .d.ts + styles.css + registry.json + DECISIONS.md
npm run pack                 # build, then npm pack → the tarball you install into an app
npm run barrel               # regenerate the public surface from registry.json
npx ds-check                 # required before any done-claim
```

## Consuming the package — two imports and one root

The stylesheet import is not optional: the library build extracts CSS out of the JS, so importing a
component alone paints nothing. And `Provider` is the theme root — the element every `--ds-*` role and
every Radix scale resolves against, and where the accent, the neutral, the size tier, the contrast model
and the button order are seeded. Mount it **once, above everything**. A component rendered outside it
gets unresolved custom properties. In development, each of these two failures prints one console
warning. A production build prints nothing, and the page paints wrong.

```tsx
import "dsiab/styles.css";        // once, at your app's entry point
import { Provider, Button } from "dsiab";

export function App() {
  return (
    <Provider accentColor="iris" uiSize="small">
      <Button priority="primary">Create project</Button>
    </Provider>
  );
}
```

Do **not** also import `@radix-ui/themes/styles.css`. This system wins the cascade by source order and
bans `!important`, so a second copy of Radix's stylesheet loaded after ours silently costs every
override.
