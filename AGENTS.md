# Working in the dsiab repository

This file is for anyone, a person or an agent of any kind, who changes this repository. It covers what
the repository holds, how to add a component, which guards run, and what a change must prove before
anyone calls it done. The rules for code built on the system bind here too, and they live in their own
file, described first.

## Two rule files, and which one binds

- **`skills/dsiab/references/rules.md`** holds the rules that bind any code built on the system: the
  tokens, `!important`, reuse before invent, field chrome, the focus ring, seams, floating surfaces,
  the install, and the `npx ds-check` done-claim. It ships in the package, and `dsiab init` writes it
  into a product repository as that project's `AGENTS.md`. Every rule in it binds the code in this
  repository as well. Read it before this file.
- **This file** adds what working on the system itself needs. It does not ship.

A rule that binds consumers belongs in `rules.md` and nowhere else, so that one copy stays current.
Keep `rules.md` under 23,700 bytes: `dsiab init` adds a one-line header, and Antigravity CLI truncates a
rule file above 24,000 bytes.

## Where the rest is written down

- **`README.md`**: install it, run the docs, build it, import from it.
- **`CONTRIBUTING.md`**: how to propose a change, the bar a new component, token family or pattern
  must clear, where to report a security problem, and the code of conduct.
- **`docs/GUIDELINES.md`**: the design language. Its §9 scopes the accessibility claim, so read the
  scope before you repeat the claim.
- **`docs/DECISIONS.md`**: the ruling ledger. Each ruling has a permanent name, such as `focus-ring`, and
  one to three tags. Cite it as `[[focus-ring]]` instead of restating it. The package ships it as
  `dsiab/DECISIONS.md`, built by `scripts/dist-decisions.mjs`, which keeps every entry and removes every
  Evidence part. Its table of rewrites, for a passage that is true in the repository and wrong for a
  package reader, holds no record, because each such passage was written again at the source for both
  readers.
- **`docs/REFERENCES.md`**: every outside source the system consulted, and what it adopted or rejected
  from each.
- **`docs/AGENT-SETUP.md`**: the guide a consumer's agent reads once after `dsiab init`.
- **`skills/`**: the four Agent Skills. `dsiab` and `design-system-steward` ship. `docs-steward` and
  `pattern-steward` stay here for contributors.
- **Storybook** (`npm run storybook`, port 6006): the rendered source of truth. When a page and a doc
  disagree about what a component does, the running page wins and the doc is a defect.

## The roster in this repository

**`registry.json` at the root is the roster of record**: 110 entries on 2026-10-01, one per component,
each with `status`, `tier`, `module` and the exact `exports[]` names it publishes. Read the file, never
a remembered list or a count in a doc. It answers the first question worth asking: does this already
exist?

- `status: "ported"`: import it from the package, and do not rebuild it.
- `status: "out-of-scope"`: deliberately not ported, and the entry's `note` says why.
- **Absent from the registry**: do not improvise a `Components/*` equivalent. Use the raw Radix Themes
  component under the GUIDELINES conventions, or surface the gap.

The package ships a projection of this file as `dsiab/registry.json`, built by
`scripts/dist-registry.mjs`. It differs in five ways:

- The entries sit under `components`, beside `about`, `generatedBy` and `counts`.
- `status` reads `available` instead of `ported`.
- `wraps` replaces `buildingBlock`. It names the Radix primitive when `buildingBlock` reads exactly
  `Radix <Name>`, and it holds `null` otherwise.
- An entry that is not available carries a `reason`, written in the script for a package reader, in
  place of its `note`, which cites specs that do not ship.
- Every other field is gone, `module`, `controlBox` and `priorArt` among them, so an entry holds
  `name`, `status`, `tier`, `wraps`, `exports` and, when it is not available, `reason`.

## The bar for anything new

**A new component, token family or pattern needs three real uses before it enters the system** ([[contribution-threshold]]).
`CONTRIBUTING.md` carries the threshold for a proposal. The bar sits on top of *reuse before you invent*
in `rules.md`: first show that nothing existing serves, then show the three uses.

## Research the prior art before you design

For any NEW component, and for any LARGE edit to an existing one, study how established design systems
solve the same problem before you write anything.

**Start with `docs/REFERENCES.md`, which is an input and not an archive.** It holds every source the
system already consulted, what it adopted or rejected from each, and the component or ruling each one
informed. If the question was already answered, the answer is there with its verdict. Reuse it instead
of researching it again, because a second pass costs time and risks a different conclusion from the
same sources, which is how two parts of one system end up disagreeing. A source consulted and never
recorded is research the next person pays for twice.

If the question really is new, research it, and record it in `docs/REFERENCES.md` and in the entry's
`priorArt` field in the same change. Name at least two sources and cite at least one URL. Say what you
adopted and what you deliberately rejected, because a rejection with a reason is worth as much as an
adoption.

**Where to look, by the question and not by the vendor.** Different sources are authoritative for
different things, and a source is worth citing only where it is actually strong. Check what a source
shipped recently before you lean on it. A large enterprise system carries weight, but much of its
published guidance stood still for years, and a pattern page older than the interaction you build is a
historical document and not prior art.

- **Interaction and state, headless.** Zag.js and Ark UI publish explicit state machines per component,
  the closest thing to a specification for behaviour. Radix Primitives and Base UI answer the same
  questions in the shape this system already uses. Headless UI gives a third reading.
- **Accessibility semantics, keyboard and focus.** The ARIA Authoring Practices of the Web Accessibility
  Initiative (WAI) for the role and key model, and React Aria for what it takes to make that model
  survive real assistive technology. The two disagree now and then, and the disagreement is usually
  informative.
- **Motion.** Motion's own documentation for the mechanics, Material 3 for the duration and easing
  reasoning. Both receive active maintenance, which matters more here than elsewhere.
- **Tokens, colour and theming.** Radix Colors for scale construction, Open Props and Tailwind for how
  a token layer reaches a consumer, APCA for perceptual contrast.
- **Dense data, tables and enterprise shapes.** Carbon, Atlassian and Primer are strong here, because
  it is the problem they actually have.
- **Shipping products, not systems.** Linear, Vercel and Stripe show how a pattern behaves under real
  use, where the documentation of a design system often shows only the happy path.

That list is a start and not a boundary. If the best answer for your question lives elsewhere, use it
and record why it was the right source.

This is *reuse before you invent* applied one level out. That rule governs assets inside this
repository. A pattern that every mature system converged on is prior art too, and a private
re-derivation produces something subtly wrong in ways internal review cannot catch, because everyone
who reviews it shares the same blind spot. A reader who used other tools feels it at once. The ruling
is **[[prior-art-required]]**.

`prior-art.node-check.ts` enforces the mechanical half: a registry entry added after 2026-09-20 must
carry a substantive `priorArt`. The 107 entries older than the rule are grandfathered and counted, the
same way the line caps below are. Do not retro-document them because the guard exists. Add the field
to one when you next make a substantial change to it. Whether the research was any GOOD stays a review
obligation, as it must.

## What adding a component takes

Four things land together, or the guards fail:

1. **The component** in `src/components/ui/`, painting from tokens, riding `Field` if it takes input.
2. **A `registry.json` entry** with `module` and the exact `exports[]` names. **The registry is what
   publishes a name.** `src/index.ts` is generated from it by `npm run barrel`, and nothing reaches a
   consumer without an entry. The parity guard fails in both directions: a declared name that vanished,
   and an actual export never declared. A bare `module` resolves under `src/components/ui/`. A `module`
   with a slash resolves relative to `src/`, which is how `hooks/useMediaQuery` publishes without a move
   into a components directory (**[[registry-module-paths]]**). Names a published module exports but should NOT publish go in
   `internalExports[]`, and the guard requires `exports[]` and `internalExports[]` together to account
   for every one of them.
3. **A `*.stories.tsx` on the shared spine**, importing the primitives in
   `src/components/ui/_storyKit.tsx` and never duplicating them. Story order is **declaration order**,
   and a guard holds it: the first story is `Anatomy` (full tier) or `Usage` (lite tier), the last is
   `History`, and `Props` sits immediately before it. Content stories such as Keyboard and MenuStates
   sit in between and are not order-locked. Every docs story opens on `<Page><PageHeader …/>`, and a
   guard holds that too. Docs read token values **live** from the CSS: a hand-typed hex drifts, and a
   guard rejects it.
4. **A `docs/DECISIONS.md` entry** if you decided something, with a new name of two to five hyphenated
   words and one to three tags ([[ruling-names-and-tags]]).

## The traps inside the system

**Portaled custom popovers** (the `MultiSelect` pattern, on `@radix-ui/react-popover`). A portal moves
its content outside the theme root, so the content must re-establish one with Radix's `Theme`, which
is deliberately unexported (`src/index.ts` gives the reason). `rules.md` sends consumers to the shipped
floating surfaces for that reason. Inside this repository, four things bite:

1. Wrap the portal content in `<Theme>`. Radix token scales (`--scaling`, `--space-*`, `--accent-*`) do
   not resolve outside a `.radix-themes` root, and the class alone is not enough.
2. CSS that targets the panel element must be **compound**: `.radix-themes.panel`, no space. `<Theme>`
   plus `Popover.Content asChild` put both classes on the *same* node, so a descendant selector
   (`.radix-themes .panel`) matches nothing, and nothing reports it.
3. **Pre-bundle the primitive** in `.storybook/main.ts` `viteFinal` *and* in `vitest.config.ts`
   `optimizeDeps.include`, or it pulls a second React (`Cannot read … 'useMemo'`).
4. `Popover.Content` hardcodes `role="dialog"`. Give it an `aria-label` and carry `role="listbox"` on the
   inner element.

**A control that renders its own `Field.Root`** (Select and MultiSelect wrap themselves) must call
`useOptionalFieldControl()` from a **child component rendered inside that `Field.Root`**. Called at the
top level, it reads the outer null context, and `aria-invalid` and `aria-describedby` never reach the
trigger.

**Colour comparisons go through the helpers.** `rules.md` explains why a P3 display breaks a regular
expression over `rgb()`. The helpers in `src/foundations/_assert.ts` already rasterize, so a guard or a
story play uses them instead of its own parser.

## Size, refactoring, and what a change may contain

**The line caps bind new hand-written source only: 400 lines per file, 100 per function.** They do not
apply to generated output (`src/foundations/changelog.generated.ts`, anything `npm run barrel` writes),
to the token CSS, or to `*.stories.tsx`, where length tracks the number of documented states and not
complexity.

**The 8-files-per-folder cap is rejected here, deliberately.** The system documents a file-per-component
convention, so `src/components/ui/` holds more than 260 files by design. Importing that cap would put the
repository in permanent violation of a rule its own architecture contradicts, which teaches every agent
that the limits are decorative. A folder cap, if anyone wants one, needs a number derived from this
layout.

**Measured at adoption, so nobody claims a clean baseline that never existed.** When the caps arrived,
109 source files exceeded 400 lines. The largest were `src/tokens/components.css` at 7,205 lines,
`src/foundations/changelog.generated.ts` at 2,354, `src/components/ui/_storyKit.tsx` at 1,685 and
`src/components/ui/Calendar.tsx` at 1,188. These are grandfathered. Do not open a refactor of them
because this section exists. The cap governs what you add, and it turns each of those files into a
reason to extract instead of extend when you next touch one. No guard counts lines, so file length stays
a review obligation: report a breach with the file and the count.

**Refactor before you add.** Before you build a feature or fix a defect, establish whether a
reorganisation of what exists can do it, instead of another layer on top. This is *reuse before you
invent* applied to structure instead of the component roster. A diff that only grows is worth naming as
such, and a healthy one deletes as well as adds.

**A change contains only what it claims to contain.** When you find a second defect while you fix the
first, record it as a `docs/DECISIONS.md` entry or a surfaced gap. Do not widen the diff to absorb it. A
reviewer cannot check a change against a description that no longer covers it.

**A pull request description states its assumptions**: before and after, the approach, the alternatives
considered, and every point where the implementation decided something the ledger did not. The reviewer
inherits responsibility for each decision and cannot inherit one they cannot see. Keep a pull request
under roughly 1,000 lines excluding tests, and stack instead of growing past that.

## What enforces this, and what does not

This repository runs no CI check and no pre-commit gate. Four commands hold, and all four work in any
harness: `npx ds-check` over the code, the type check, `npm run test:tokens` for the source-scanning
guards, and `npm test` for the story suite. Anyone can run them, a person, a script or an agent of any
kind, and they are the only enforcement this project guarantees. The one workflow,
`.github/workflows/docs.yml`, runs on a release tag or by hand: it builds the Storybook, scans the
built pages for terms that must not ship, and deploys them to the docs site. It runs none of the four
commands.

The package ships no agent gate, and `dsiab init` installs none. It writes the consumer rules, the
`dsiab` skill and the `design-system-steward` reviewer, and it edits no tool settings.
`docs/AGENT-SETUP.md` lists the gates a user can add with their own harness.

## Agent files for contributors

`npm run agents` writes the agent files your tool reads, from the sources in `skills/`: `.agents/skills/`
and `.claude/skills/` with all four skills, and `.claude/agents/` with the three reviewers. The output
is untracked and git-ignored. Edit a skill in `skills/`, never a generated copy, then run the command
again. It never touches this file.

Three reviewers, and each one reviews and reports instead of implementing. Their findings are worth a
second look, because some come back overstated.

- **`design-system-steward`**: before any done-claim on UI. It owns tokens, accessibility, reuse, the
  cascade and visual proof.
- **`docs-steward`**: after a change to a `*.stories.tsx`, a doc in `docs/`, a ledger entry or a shared
  docs primitive. It hunts claims the code contradicts, pages that disagree, and stale prose.
- **`pattern-steward`**: after something lands, never as a gate. It names the existing assets that
  should adopt a new mechanism, and what a new asset hand-rolled that a sibling already solved.

## The commands

```bash
npm install                         # dependencies at the exact lockfile versions
npm run storybook                   # the docs, on port 6006, the rendered source of truth
npm run barrel                      # regenerate src/index.ts from registry.json
npm run build                       # dist/index.js + .d.ts + styles.css + registry.json + DECISIONS.md
npm run pack                        # build, then npm pack, the tarball you install into an app
npm run test:tokens                 # the source-scanning guard lane
npm test                            # the story suite, with axe
npm run test:publish                # pack it, install it elsewhere, prove the tarball works
npm run agents                      # generate the contributor agent files
npx ds-check [path]                 # check code against the shipped rules
npx ds-check --rules                # what those rules are, and how to allow a line on purpose
```

**`npm run test:publish` is the pre-release gate, not a per-change one.** It packs the real tarball,
installs it into a throwaway app, builds that app from the README's own snippet, and reads computed
values off a rendered element in a Chromium-family browser, resolved as `npm test` resolves it below.
It exists because no known failure mode of this package breaks the build. In development, a missing
stylesheet import and a component rendered outside `Provider` each print one console warning ([[missing-provider-warning]]). A
second copy of Radix's stylesheet loaded after ours prints nothing, because both sheets write legitimate
values and nothing can tell which one won. So a build that appears to work proves nothing. It needs the
npm registry and takes a couple of minutes. `-- --keep` leaves the throwaway app behind.

## What a done-claim requires

**`npx ds-check` must exit 0 before you say anything works.** Run it over the code you touched and read
the output. A pass is a statement about the files it lists and nothing else. Then, in this order:

- `./node_modules/.bin/tsc --noEmit`, the type gate. Use the local binary, not `npx tsc`.
- `npm run test:tokens`, the source-scanning guards (`src/foundations/*.node-check.ts`): registry
  parity, story order, `<PageHeader>`, token-row shape and others. Read a guard before you argue with
  it.
- `npm test`, the story tests in vitest browser mode, with axe on every story bar the opt-outs
  registered in `AXE_EXEMPT` (`axe-scope.node-check.ts`, guarded in both directions). The suite drives
  the first Chromium-family browser that `scripts/browser.mjs` finds: the `DS_BROWSER_PATH` override if
  it is set, then Playwright's own Chromium, the same version on every machine. Install that once with
  `npx playwright install chromium`, or point `DS_BROWSER_PATH` at any Chromium-family binary.
- **Look at it.** A visual claim is earned by observing rendered pixels and writing the diff sentence:
  *"Before: [what I saw]. After: [what I see]."* A `className` in the markup, a passing type check and
  "no console errors" are not visual verification. The reply that makes the claim cites the baseline
  `.screenshots/<task>-before.png` and the result `.screenshots/<task>-after.png`, both taken by you and
  present on disk, the after file newer than the change.
