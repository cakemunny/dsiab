# Contributing to dsiab

Anyone can read this system, report a defect and send a fix. New surface, such as a component, a token family or a pattern, needs an accepted written proposal first. The maintainer decides, records the reason, and makes no promise about response time. This guide serves one person who works with an agent, a small team, and a large team that forks the system.

## Which repository you are in

This repository holds the source: `src/`, the Storybook, the guards and the ledger. The npm package holds the build. If you installed `dsiab`, you have `node_modules/dsiab` and `npx ds-check`, and the `npm run` commands in this guide belong to a clone of this repository. A fork is a repository of its own, and the section on forks below covers what to keep.

## How a change is classified

| Change | Route |
| --- | --- |
| A bug fix, a docs correction or a token-value fix | A pull request directly, with one claim per pull request |
| A small enhancement inside an existing component | A one-line issue, then a pull request |
| A new component, token family or pattern, or a large edit to one | An accepted proposal first, recorded in `registry.json` as `planned` |
| A system-wide change | The maintainer only |

If you cannot tell which row a change belongs to, open an issue and ask.

## The proposal

Open an issue with the proposal. It covers these points:

1. **The need**, with the named places that use it.
2. **What already exists.** Check `registry.json`, the Storybook and the Radix Themes component first.
3. **Prior art.** At least two sources from other design systems, with what you take from each and what you reject, under the prior-art rule ([[prior-art-required]] in [DECISIONS](docs/DECISIONS.md)).
4. **What you leave out**, and why.
5. **The cost to own it**: the code, the stories, the guards and the docs it adds.
6. **Alternatives**, including raw Radix Themes under the conventions in [GUIDELINES](docs/GUIDELINES.md).
7. **Drawbacks.**

A proposal ends in one of three recorded outcomes:

- **Pursue.** The entry enters `registry.json` with status `planned`, and a pull request can follow.
- **More evidence.** The issue stays open with the evidence it needs.
- **Not in the system.** The entry enters `registry.json` as `out-of-scope`, with the reason recorded, so the next person with the same need finds the answer.

## What a proposal is judged on

A guard is an automated check in the test lanes. Review is a person reading the change.

| Criterion | Checked by |
| --- | --- |
| Not already served by the system or by Radix Themes | Review |
| Used in at least 3 real places | Review |
| Fits the scope of a React component and token layer over Radix Themes | Review |
| Accessible, with keyboard support and accessible names | Guard (axe on every story) and review (focus order and announcements) |
| Token-pure: paint from `--ds-*` semantic tokens, no hex values, no bare Radix scale steps | Guard |
| Documented with a Storybook page | Guard (the story and its category) and review (the prose) |
| A bounded cost to own | Review |

## What gets declined by default

- A wrapper that adds one prop to a Radix component
- A second convention beside an existing one
- Anything that needs `!important`
- A diff that absorbs a second defect. Report the second one on its own.
- Use outside React
- Chrome for native apps

## Opening a pull request

- **One claim.** A pull request does one thing, and its title says what.
- **Small.** Under about 1,000 lines, tests excluded. Split a larger change into a sequence.
- **Assumptions.** State what you assumed and what you did not check.
- **Before and after.** For a visual change, attach a before and an after screenshot, and say what each one shows.

Commit messages use the conventional-commit form `type(scope): summary`, because `scripts/gen-changelog.mjs` reads the type. A `feat` or `fix` commit, or any breaking change (a `!` after the type or a `BREAKING CHANGE` note in the body), reaches `CHANGELOG.md`. A `docs`, `chore`, `refactor`, `test`, `build`, `ci`, `style` or `perf` commit does not.

## The four checks

Run all four before you ask for review:

```bash
npx ds-check                        # the system's rules over the source
./node_modules/.bin/tsc --noEmit    # the type gate, the local binary, never npx tsc
npm run test:tokens                 # the source-scanning guards
npm test                            # story tests in real Chromium, with axe on every story
```

A visual claim also needs the before and after screenshots above. `npm run test:publish` is the pre-release gate. It packs the tarball, installs it into a throwaway app, builds the App snippet from the README and measures the result in a browser. Run it as well for a change to the build or to the package surface.

## Working with an agent

Any agent tool works here, and you are the author of what it writes. Say in the pull request what you tested and how. `npm run agents` installs this repository's skills and reviewer agents for your tool, in untracked folders. [AGENTS.md](AGENTS.md) holds the rules for work in this repository, and an agent reads it before it edits.

## Setup notes

Node `^20.19.0 || ^22.12.0 || >=24.0.0`.

```bash
npm install                        # dependencies at the exact lockfile versions
npx playwright install chromium    # once per machine, unless DS_BROWSER_PATH names a Chromium browser
npm run storybook                  # the docs on :6006, the rendered source of truth
npm run build                      # dist/: the JS, the types, the stylesheet, the roster, the ledger
npm run pack                       # build, then npm pack, for a tarball you can install into an app
```

The install is large, and slow on a cold cache, because it brings Storybook, TypeScript, the build toolchain and a browser test runner. `npm install` also runs a `prepare` step for the maintainer's git hooks. In a contributor clone that step installs nothing, and none of the four checks depends on it.

npm reports advisories after the install. They sit in devDependencies, which never reach `dist`. Compare the two graphs yourself:

```bash
npm audit --omit=dev   # the graph a consumer installs
npm audit              # the graph a contributor installs
```

Token values live in `src/tokens/*.css`, with `index.css` as the entry point. A change there reaches Storybook at once and an app on its next build.

### Adding or removing a component

Four steps, because the registry controls what ships and the Storybook navigation reads two lists of its own:

1. **`registry.json`.** Add or remove the entry. A bare `module` resolves under `src/components/ui/`. A `module` with a slash resolves relative to `src/`.
2. **`npm run barrel`.** It rewrites `src/index.ts` and `src/components/ui/index.ts` from the registry.
3. **`src/foundations/storyCategories.ts`.** Put the name in its category's array in `STORY_CATEGORIES`.
4. **`.storybook/preview.tsx`.** Put the same name, in the same position, in the `storySort` order list. Storybook parses that file without running it, so this list is a second copy of step 3 on purpose.

A guard reads the registry and the source in both directions, so a name the registry lacks never ships and a declared name with no module fails the suite. Steps 3 and 4 are guarded too, and each failure names the short list.

## Licence of contributions

Your contribution ships under the MIT licence, the same terms as the rest of the code. The bundled fonts keep the SIL Open Font License 1.1. Credit any third-party code you add, with its licence text, in [THIRD-PARTY-NOTICES](THIRD-PARTY-NOTICES). There is no contributor licence agreement.

## Forking or taking parts

The system is built to sit inside a larger one:

- Every token is namespaced `--ds-*`, and every rule is scoped under `.radix-themes`.
- The system's CSS declares `!important` only where Radix declares it first, so a host system wins the cascade everywhere else.
- Brand, neutral, size, contrast and typefaces are runtime props on `Provider`, so a host can re-skin the system without a fork of the CSS.

If you fork, keep the ledger in [DECISIONS](docs/DECISIONS.md) and keep the guards, because together they record why each rule exists and stop it from drifting. Replace the contact points in [SECURITY.md](SECURITY.md) and [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md) with your own.

## Where to ask

Open an issue in this repository. A security report goes through [SECURITY.md](SECURITY.md) instead.
