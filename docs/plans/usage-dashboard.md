# Usage dashboard: plan

A working plan for [[local-usage-scan]]. It records how the work is sequenced and is updated as each phase lands. The ruling is the decision, and this file is not.

The plan answers kanban task t_ad0bf9c3 with a local usage scan of each project's own code, shown by a new usage command and by a Usage page in the hosted documentation, with no tracking and no network telemetry. Its prerequisite, a fix to the rule checker, merged into main on 3 November 2026, so Phase 1 is unblocked.

## Where the task stands, 3 November 2026

| Step | State |
|---|---|
| Explore and plan | Done. Three review panels read the plan, and their findings are in it. |
| Jason's decisions on the shape | Done. Eleven decisions, listed below. |
| Rule checker fix, the prerequisite | Merged into main as cakemunny/dsiab#23 (`aa25061`). |
| Phase 0, the record | Drafted on `claude/affectionate-knuth-c742av` (`036be16`, amended by the counting, project and report decisions). Waits for Jason's review. |
| Phase 1a, the shared source modules | Built on `claude/affectionate-knuth-c742av`. Waits for review with Phase 0. |
| Phase 1b, the kind field and the roots | Built on `claude/affectionate-knuth-c742av`. Waits for review with Phase 0 and 1a. |
| Phase 1c, the scanner and the usage command | Not started. |
| Need check | Waits for Jason's personal project to hold a finished screen. Runs on a locally packed build, before any release ships Phase 1. |
| Phase 2, the Usage page | Waits for the Need check. |

## The goal, in Jason's terms

When a team installs the package, some part of the documentation should show which system components that project uses, how often, and where, with charts that give an overview of how the system is being used. The Storybook is the documentation, so it is the natural home for the dashboard page.

## The answer in one paragraph

A program on the developer's machine reads the project's own code, finds every import from the dsiab package, matches each one against the component list the installed package ships, and counts where each component is used, down to the file and line. It prints a summary and can write the answer to a report file. The Usage page in the hosted documentation opens that file inside the browser, sends nothing anywhere, and draws tables of what is used, what is not, how often and where. Nothing runs inside the product, and nothing leaves the machine.

## Why this shape

- **The hosted docs cannot read a project.** An installed package carries no documentation and only links to the hosted pages, and a hosted page cannot see the files of the project that opened it. So the reading has to happen on the developer's machine.
- **Reading the code answers the question asked.** It gives which components, how often and where, to the file and line. Tracking rendered components would need telemetry inside a shipped package, would count only screens someone opened, and could still not name the file.
- **Most of the parts exist.** The rule checker already walks a project's files and reports what it could and could not read. The package already ships the component list, with 330 exported names. The command line tool already routes commands and adds one more cleanly.

## Who it is for

- **Primary:** a developer on a team that installed the package, who wants to know which parts of the system their project uses, which it never uses, and where in their code the system is not used yet.
- **First instance:** Jason, in a personal project on the system.
- **Secondary:** the maintainer, who sees a report only when a team chooses to share the file.

The main scenario:

1. The developer runs the usage command with the report option in the project root.
2. The command prints a summary, writes the report file and prints its path.
3. In a release whose hosted docs hold the Usage page, it also prints that page's address for the installed version.
4. The developer opens the page, chooses Open report and selects the file.
5. The page draws the Overview, Components, Where used, By folder and Reach views from the file alone.

## Decided by Jason, 3 November 2026

1. Each team sees only its own project. Nothing is collected across installs.
2. The page lives in the hosted documentation and opens a report file from the developer's disk.
3. Tables and counts with existing components are fine for a start. A chart component waits for three real uses.
4. The need is tested through a personal project of Jason's before the page is built.
5. Rule findings shown beside usage, and a way for a project to configure the system or add its own rules, stay ideas for now, to be tested in a local project first.
6. The published component list gains a kind for each exported name: component, hook, function, constant or type, worked out at build time.
7. That kind sits in a separate map beside the list of names, so every existing reader of the list keeps working.
8. The rule checker fix goes first, as its own task, with its own decision record entry.
9. **A component is counted the way the documentation presents it.** One documentation page is one registry entry, and one registry entry is one component in every count. A dropdown is one dropdown, not a root and three items. The parts used inside it are recorded, so a filtered view can show them, but they never add to the component's count.
10. **A repository that holds several projects reports each project apart.** The report keeps each project with its own installed version, and the page filters by project, alongside the filter that shows parts.
11. **The report is a snapshot, not code or documentation, and it is never committed.** It gives context to decisions about how the system is used, at one moment.

## Defaults the agent chose, open to change

- **Exit code.** The usage command exits 0 when the scan ran, even when some files could not be read, and prints those files. It exits 2 when it could not do its job. This matters only to a team that runs the command inside an automated check. Jason did not object.
- **The fifth kind is named constant,** for an export that is neither a component, a hook, a function nor a type, such as a plain style object.

## The prerequisite: the rule checker fix

The rule checker's method for skipping comments and text misread page text, and the usage scanner reuses that method, so it had to be fixed first.

- **What was wrong.** Page text holding the characters that open a code comment hid every finding below it, and the run still passed. Page text holding a web address or an apostrophe hid the rest of its line. Words inside a message in backticks were reported as rule breaks. A rule exception written between page elements could not cover the line below it.
- **What the fix does.** The rule checker reads page text as text, ignores message text for every rule except the motion rules, and lets an exception in curly braces on its own line cover the line below.
- **Evidence.** The guard for it failed in eight cases before the fix and passes in all 17 after. Across 450 real files, no finding changed, and five false comments vanished from four of this repository's own story pages. All four repository checks pass.
- **Recorded as** the ruling on JSX text masking, with Jason's approval of its text and of the amendment.
- **Next.** Jason opens the pull request and merges it into main.

## Phases

### Phase 0: the record

- Add rows to the prior-art index for react-scanner, Omlet, zeroheight, Atlassian, Mews and Preply, and the telemetry consent pattern of Storybook and Next.js, each with what was adopted and rejected.
- Add a ruling that records where usage data is collected, that nothing is sent, where the page lives, the kind field, and that the need is tested before the page is built.
- Both files are held by Jason, so each change waits for his word on a review block.

**Done when** both land and every critical and major review finding is fixed in this plan or declined by Jason in writing.

### Phase 1a: a shared module for reading source

- Move the file walker, the file read loop and the masking out of `consumerRules.mjs` into **three** new shipped modules: `scanScript.mjs`, the character scanner for script and JSX; `sourceRegions.mjs`, the CSS comment scan, the markup split and `regionsFor`; and `sourceWalk.mjs`, the walk and `readSources`. The masking alone is about 390 lines, so it splits in two to keep each file under the cap of 400 lines. The rule checker and the scanner both import them, and `consumerRules.mjs` still exports the extension lists and `collectFiles`, which `ds-check` and its guards import from it.
- Split the scanning function in the move, because the fix took it past the limit of 100 lines per function. `scanJs` keeps the loop, and the regex literal, the quoted string, the template literal and its `${…}` body each become a helper.
- **The walker records names, and the rule checker's output stays the same.** Today `collectFiles` skips a symlink without recording it, counts skipped folders as a number only, and skips a folder in `DIR_IGNORE` at any depth, `build` inside `src` included. The walker gains, additively, the list of skipped folders with the reason for each (ignored name, hidden, or symlink) and the list of skipped symlinks. The rule checker reads only the fields it reads today, so its printed report and its exit code do not change. Case 17 reads the new fields.
- Add the three modules to the package's file list, the shipped-files guard and the packaging message `ds-check` prints when it cannot load its rules.

**Done when** the rule checker's tests pass unchanged, a byte-for-byte comparison of `ds-check` output over this repository before and after the move shows no difference, with the old and new module run over the same tree, a test asserts the new walker fields for a symlinked folder and for `src/build`, and the release check finds the three modules in the packed package.

### Phase 1b: the kind field

- The build step that writes the published component list works out each export's kind by the classification the compiled reference already uses (`scripts/reference/types.mjs`), over a TypeScript program with the options the shipped declarations are emitted with. One rule then serves both the reference and the roster. Its six kinds map onto the five shipped ones: a `compound` is a `component` and a `value` is a `constant`. The rule, in order:
  1. A name exported only as a type is a `type`.
  2. A function whose name is `use` followed by a capital letter is a `hook`.
  3. A `component` is any of these, as the declarations write them:
     - a function that returns a page element, such as `declare function Breadcrumbs(...): JSX.Element`, which is how many components in this package compile
     - a forwarded-ref component (`ForwardRefExoticComponent`), a memoised component (`MemoExoticComponent`) or a named exotic component (`NamedExoticComponent`), such as `Button`
     - a React context (`Context<…>`), such as `BreadcrumbContext`
     - an object whose members are all components, such as `DropdownMenu`
  4. Any other callable is a `function`.
  5. Anything else is a `constant`.
- The same step records each entry's **roots**, a list of the names whose placement counts as one use of the whole component:
  - the export named after the entry, such as `Button`, or `SideNav`, a compound that renders on its own;
  - its `Root` part instead, when that export is only an object of parts, such as `DropdownMenu.Root`;
  - both, when a component that renders on its own keeps its Radix spelling as an alias: `Select` and `Select.Root`, `TextField` and `TextField.Root`, `CheckboxGroup`, `RadioGroup`;
  - a flat `<Name>Root` export that is the same part under a flat name, which today means `ToolbarRoot`;
  - for an entry with no export of its own name, a short written list in the script, which today is `Field` (`useOptionalFieldControl`) and `Toast` (`ToastProvider`). The build fails on any new entry whose root cannot be worked out.

  An entry that publishes nothing, such as `TypeaheadItem`, or only types, such as `AccentColor`, has no roots and is never counted. A list, not a single root, because the scan needs `<Select.Root>` to count as one Select.
- The shipped consumer rules say that more kinds may come, and that a reader treats an unknown kind as not countable.
- Four documents name the published list's fields and change together: the repository guide, the shipped consumer rules, the field table in the build script, and the description the build script writes into the list. The consumer rules stay under their size cap of 23,700 bytes, and they measure 13,319 today.

**Done when** a guard fails on any export with no kind and names it, a guard fails on any available entry with no root, and a test asserts the kind of Button, Breadcrumbs, ButtonProps, useAnnounce, interactiveLayer, DropdownMenu, BreadcrumbContext and AccentColor, and the roots of Button, DropdownMenu, Select, Toolbar, SideNav, Field, Toast, AccentColor and TypeaheadItem. `BreadcrumbContext` replaces `AvatarHostSizedContext`, which is an internal export the roster never publishes.

### Phase 1c: the scanner and the usage command

The scanner:

- Reads named, renamed, namespace and type-only imports from the dsiab package, and matches them against the component list of the copy the project installed.
- **Counts one use per placement of a component, the way the documentation presents it.** One registry entry is one component. A rendered root element counts one. Every other export of the entry that is rendered or called, and every dotted member such as `DropdownMenu.Item`, is recorded as a part of that component with its own count and locations, and adds nothing to the component's count. A part rendered in a file where its component's root is not rendered is still recorded, marked as having its root elsewhere, and the component shows as used. A call of a hook that is its own entry counts as a use of that entry.
- **Shadowing, by a written rule and not by scope analysis.** The masking is not a parser, so the scanner does not track scope. When a file declares the local name of an import again, as a function, class, `const`, `let`, `var` or parameter, it counts none of that name's uses in that file and lists them as untraced with the reason `shadowed`. A wrong guess therefore shows up as untraced and never as a silent count.
- **Reads each project apart.** In a repository that holds several projects, the scanner finds each folder with its own `package.json` that installs `dsiab`, reads that folder's files against that copy's component list, and records the project with its path and installed version. A file belongs to the nearest such project above it.
- Never counts a type. Leaves an entry made only of types, such as the accent colour type, out of every list and count.
- Lists anything it cannot trace under "untraced" with the file, line, name and a reason from a fixed list: re-export, imported but not called, passed by reference, dynamic, shadowed, unknown kind, or masking hid possible uses. Nothing is counted as zero in silence.
- Owns its own record of what it read: the script and markup files it read, the folders and links it skipped, and the file types it could not read. Any gap marks the unused list as limited.
- When nothing imports from dsiab, says so instead of calling every component unused.

The command:

- **Writes the report where it will not be committed.** The default path is `node_modules/.cache/dsiab/usage-report.json`, which every project that ignores `node_modules` already ignores, so the command edits no `.gitignore`. A `--report <path>` option puts it elsewhere, and when that path is not ignored by git, the command prints a line saying the file is a snapshot that should not be committed and how to ignore it. The command prints the full path either way, because the developer opens the file from the page.
- Writes the report to a temporary file and renames it into place, so a failed run never leaves half a report.
- Names the installed version and its own version on its first line.
- Prints the Usage page address only in a release whose own docs hold that page.
- Exits 2 on a bad path, an unknown option, nothing read, a report it could not write, or a component list it could not read, and names a broken component list as a packaging fault.

The report file is one JSON file that carries its own component list, so the page needs nothing else. It is a snapshot, never committed. It holds a format marker, a schema version, the scanner version, the scan time, relative paths only, and a list of projects, each with its path, its installed version, its components with counts, locations and parts, its untraced list and its reach. The schema version starts at 1 and rises only when a field is removed or changes meaning.

The test cases, one fixture file each, with the result each must give:

```
1  a named import of Button, two <Button>                   -> Button 2
2  Button imported as DsButton, one <DsButton>              -> Button 1
3  a namespace import ds, one <ds.Button>                   -> Button 1
4  ButtonProps imported with the type keyword, both forms   -> nothing
5  ButtonProps imported without the type keyword            -> nothing
6  <Button> inside a comment and inside a string            -> nothing
7  a team file re-exports Button, a second file renders it  -> Button 0, second file untraced: re-export
8  Button imported from a local file, one <Button>          -> nothing, nothing untraced
9  a local function named Button shadows the import         -> nothing for Button, its uses untraced: shadowed
10 one <DropdownMenu.Root> holding three <DropdownMenu.Item> -> DropdownMenu 1, parts Root 1 and Item 3
11 a namespace import ds, one <ds.DropdownMenu.Item>        -> DropdownMenu 0 and used, part Item 1, root elsewhere
12 useAnnounce imported and called twice                    -> useAnnounce 2
13 the same import and no call                              -> 0, untraced: imported, not called
14 useAnnounce assigned to a variable, never called         -> 0, untraced: passed by reference
15 a component chosen at run time                           -> untraced: dynamic, not listed as unused
16 the package installed and no imports                     -> the no-uses message, no unused list
17 an unreadable file, a file over 2 MB, a symlinked folder
   and a folder named build inside src                      -> all four under reach, unused list limited
18 page text holding a comment opener, then <Button/>       -> Button 1
19 page text holding a web address, then <Button/>          -> Button 1
20 a component name inside a message in backticks           -> nothing
21 the command of one version over a project on another     -> both versions recorded, installed list used
22 <Breadcrumbs> (a function component in the declarations) -> Breadcrumbs 1
23 <ToastProvider> once and useToast called twice           -> Toast 1, parts ToastProvider 1 and useToast 2
24 two projects in one repository, on two installed versions -> two projects, each read against its own list
25 no --report option                                       -> report under node_modules/.cache/dsiab, path printed
26 --report to a path git does not ignore                   -> report written, a do-not-commit line printed
```

A committed sample report, the one exception to never committing a report because it belongs to no team and only feeds the docs page, comes from a separate small sample project, produced by the scanner and checked byte for byte against a fresh run, so the docs build never runs the scanner.

**Done when**

- Every case above gives its stated result, and a guard fails when any one breaks.
- Each exit code has a test.
- The release check runs the command from a real install with every network connection made fatal, and it passes.
- The four repository checks pass.

### Need check

- Waits until Jason's personal project holds at least one finished screen built on the system.
- Runs on a tarball from `npm run pack` installed into that project, not on a release. Phase 1a and 1b change what the package ships, and no release carries them until this check passes.
- Before the run, Jason writes up to three things he wants to know, for example which system components he never uses, where he still builds by hand something the system has, or which screens lean on the system most.
- After the run, each question is marked answered or not, with the report line that answers it. A hand check of three files chosen before the run confirms the report line for line.
- Phase 2 starts when at least one question is answered. If none is, the work stops, and Jason decides whether the command stays.

### Phase 2: the Usage page

- A Foundations page that opens a report from disk and draws every view from the report alone, with system components only and no progress bars, since a share of components is not a task in progress.
- Every view counts components the way the documentation presents them. Two filters change what a view shows, and neither changes how a component is counted: **Project**, shown when the report holds more than one, and **Show parts**, which lists each component's parts with their own counts beneath it.
- With no report open it shows the committed sample, with a banner on every view saying it is a sample and not the reader's project.
- A report from another version keeps every view and shows a notice naming both versions, with a link to that version's docs. A newer schema, or a file that is not a report, shows a cannot-read message. A report above a measured size limit shows a too-large message.

**Done when**

- The page renders the sample, a test report and Jason's report at every size tier and in both appearances, and passes the accessibility checks.
- A test report with two projects shows the Project filter, and a report with one project hides it. Show parts changes the listed rows and no count.
- The version, schema and size cases each have a test.
- A browser test, run on a local build before the release tag and again after each deploy, records every network request and fails if any request after a report is opened leaves the page's own address or carries report content. A failure after deploy stops the docs from becoming the latest.
- jj-bot and the design system steward pass the page, and captures before and after are viewed.

## Ideas kept for later, not planned

- Rule findings shown beside usage for the same files, for pattern auditing.
- A way for a project to configure the system and add its own rules, starting from the usage and rule views.
- A config that names a team's own re-export files, so uses behind them count instead of showing as untraced.

## Open questions for Jason

1. **Review the Phase 0 drafts** on `claude/affectionate-knuth-c742av`. Five of the eight prior-art rows could not be fetched again from the cloud session, the zeroheight verdict rests on the article title alone, and the Mews row carries no verdict until the source is read again.
2. **The personal project.** Nothing is needed now. Phase 1 runs on sample projects, and only the Need check waits for a finished screen.
3. **The Need check questions.** Written when the project is ready, before the scanner runs over it.

## How this plan was validated

- Every claim about the code was read from the source in the exploration worktree, and the Evidence section names the place.
- A throwaway scan ran twice over this repository's own docs pages, to measure speed and failure modes. The first run reported three rendered components as unused, which set the main correctness risk.
- A research agent fetched and read each prior-art source cited. Sources it could not read are marked not verified.
- Two review panels read earlier drafts: one on requirements with three seats, one on design with four seats. One reviewer then checked the masking edits. Each critical and major finding is applied.
- The rule checker defect was reproduced, fixed and measured, as the prerequisite section says.
- A third panel, on 3 November 2026, checked this plan against the code on `main` at `aa25061`. Its four major findings are folded in: the kind rule for function components, the walker that records names, the shadowing rule, and the split into two modules. Jason's answers to its three design questions are decisions 9 to 11.
- Not reviewed: no reviewer checked the prior-art sources a second time beyond the three rows fetched again for Phase 0.

## Evidence

- Exploration: branch `explore/usage-dashboard`, cut from `origin/main` at `7400654`.
- Fix: branch `fix/rule-checker-masking`, commits `a77a016` (JSX text fix and ruling `[[jsx-text-masking]]`), `aaf14c6` (template text and JSX allowance placement), `8ac15ce` (ledger amendment). Merged as cakemunny/dsiab#23 (`aa25061`).
- Fix verification: `src/foundations/jsx-text-masking.node-check.ts` 17 tests, 8 red before. Old against new scanner over 450 files: 0 findings changed, phantom comments removed in `DateInput`, `DateTimeInput`, `FileInput`, `PowerSearch` stories. `npm run test:tokens` 1,127 passed and 1 skipped. `npm test` printed 376 files and 1,550 tests passed. Decisions stories 4 of 4 after the amendment.
- Reproduction before the fix: `regionsFor(".tsx", "<Code>/* x</Code>\n<Button/>\n<Card/>\n").code` blanked every line below. `checkSource` on a code-sample line plus an `asChild` swap gave 0 findings, and the swap alone gave 1.
- Hosted docs: `bin/dsiab.mjs:73-123`, `bin/docs-url.mjs:4-12,55-57`, ruling `[[docs-hosting]]` at `docs/DECISIONS.md:627-657`. The docs workflow `.github/workflows/docs.yml` runs `npm ci` and `npm run build-storybook` only.
- CLI: command table `bin/dsiab.mjs:125-153`, `ownVersion` at 39-46, exit convention `bin/ds-check.mjs:35-38`, zero dependencies `bin/ds-check.mjs:25-27`.
- Walker and reach: `src/foundations/consumerRules.mjs` `collectFiles` and `checkTree` (Maps in reach, symlinks skipped silently), `DIR_IGNORE`, `MAX_FILE_BYTES`.
- Roster: `registry.json`, 111 entries (108 ported, 3 out of scope), 330 exports, no kind. `AGENTS.md` said 110 until 3 November 2026. Shipped as `dist/registry.json` by `scripts/dist-registry.mjs` (`exports: entry.exports` at 143, `about` string at 164-168). `AccentColor` type-only (`src/components/ui/index.ts:281`), `interactiveLayer` a constant (`ClickableCard.tsx:30`), `DropdownMenu` an object of parts (`DropdownMenu.tsx:130`).
- Consumer rules: `skills/dsiab/references/rules.md`, 14,224 bytes on 3 November 2026, under the cap of 23,700.
- Function components in the declarations: `dist/components/ui/Breadcrumbs.d.ts` declares `function Breadcrumbs(...): JSX.Element`, `Button.d.ts` a `ForwardRefExoticComponent`, `DropdownMenu.d.ts` an object of parts.
- Entries with no export of their own name: `Field` (`useOptionalFieldControl`), `Toast` (`ToastProvider`, `ToastViewport`, `useToast` and types), and `TypeaheadItem`, which has no exports.
- Walker: `collectFiles` at `src/foundations/consumerRules.mjs:990`, symlinks skipped without a record, `skippedDirs` a number, `DIR_IGNORE` at line 214 holding `build` and matched at any depth.
- Release network check: `scripts/acceptance.mjs:322-341`, Node only.
- Docs pages load static data by import: `src/foundations/Decisions.stories.tsx:5-6`.
- Consumers on the maintainer's machine: none install dsiab, and the one checked has no dsiab import.
- Contribution bar: `[[contribution-threshold]]` at `docs/DECISIONS.md:836-865`.
- Review panels: requirements (Wiegers, Adzic, Cockburn), design (Fowler, Newman, Hohpe, Nygard), two editing passes in Wiegers' seat, and the third panel of 3 November 2026 (Wiegers, Adzic, Cockburn, Fowler, Nygard, Crispin, Hightower).
- Prior art, fetched 2 Nov 2026: `https://github.com/moroshko/react-scanner`, `https://github.com/zeplin/omlet`, `https://help.zeroheight.com/hc/en-us/articles/35887034128795-Measure-usage-of-Angular-and-React-components`, `https://atlassian.design/components/eslint-plugin-design-system/no-html-button/usage`, `https://developers.mews.com/design-system-adoption-metric-building/`, `https://github.com/preply/design-system-visual-coverage`, `https://storybook.js.org/docs/configure/telemetry.md`, `https://nextjs.org/telemetry`, `https://storybook.js.org/docs/addons/writing-presets`, `https://storybook.js.org/docs/configure/integration/images-and-assets.md`.
- Not verified: Cloudflare Pages analytics on the hosted docs, react-scanner maintenance state, Omlet hosted retention terms, and the Atlassian, Polaris, Primer, Twilio Paste and Segment writeups.
