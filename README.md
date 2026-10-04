# DSIAB - Design System In A Box

DSIAB is a set of React components and design tokens built on Radix Themes. You set your brand colour, size and typefaces once, on one `Provider`, and the whole product follows, with no rebuild.

[![npm](https://img.shields.io/npm/v/dsiab)](https://www.npmjs.com/package/dsiab)
[![license](https://img.shields.io/badge/license-MIT%20%2B%20OFL--1.1-blue)](LICENSE)

## Example apps built with DSIAB

Six example apps from the docs, each made with DSIAB components.

| Project board | Mail client |
| :---: | :---: |
| ![Example: a project board built with DSIAB](https://github.com/cakemunny/dsiab/raw/main/docs/images/readme-project-board.png) | ![Example: a mail client built with DSIAB](https://github.com/cakemunny/dsiab/raw/main/docs/images/readme-mail-client.png) |
| **Code editor** | **AI assistant** |
| ![Example: a code editor built with DSIAB](https://github.com/cakemunny/dsiab/raw/main/docs/images/readme-code-editor.png) | ![Example: an AI assistant built with DSIAB](https://github.com/cakemunny/dsiab/raw/main/docs/images/readme-ai-assistant.png) |
| **Agent run** | **Analytics dashboard** |
| ![Example: an agent run screen built with DSIAB](https://github.com/cakemunny/dsiab/raw/main/docs/images/readme-agent-run.png) | ![Example: an analytics dashboard built with DSIAB](https://github.com/cakemunny/dsiab/raw/main/docs/images/readme-analytics-light.png) |

## Rebrand with one prop

The same app three times. Only one prop on `Provider` changes.

| Default | Dark mode | Orange brand |
| :---: | :---: | :---: |
| ![The project board in the default theme](https://github.com/cakemunny/dsiab/raw/main/docs/images/readme-project-board.png) | ![The same project board in dark mode](https://github.com/cakemunny/dsiab/raw/main/docs/images/readme-project-board-dark.png) | ![The same project board with an orange brand colour](https://github.com/cakemunny/dsiab/raw/main/docs/images/readme-project-board-orange.png) |

Dark mode is `appearance="dark"`, and the orange brand is `accentColor="orange"`. When a brand colour sits close to a status colour, such as green for success, the status colour moves out of its way.

## Try it in the live docs

[![The DSIAB docs site, open at the TextField anatomy page](https://github.com/cakemunny/dsiab/raw/main/docs/images/readme-docs.png)](https://dsiab.pages.dev)

**Documentation:** [dsiab.pages.dev](https://dsiab.pages.dev) runs the components live, with their props, their design tokens and the reasoning behind them. Its toolbar switches light and dark, the accent and the size, and `npx dsiab docs` opens the docs for the version you installed.

## Why use it

- **Accessible from the start.** Components ship with keyboard support and accessible names, and the test suite runs automated accessibility checks on the docs pages in a real browser.
- **Your styles stay on brand.** The `--ds-*` tokens the components paint from are yours too, for colour, type, spacing, radius, shadow and motion.
- **Forms without wrapper markup.** A text field or a select takes `label`, `description` and `validation` as props, so the label, the help text and the error message come from the system.
- **Ready for AI coding agents.** `npx dsiab init --write` adds the stylesheet imports and a token file, and gives your agent the system's rules, a skill and a review agent. `npx dsiab check` finds mistakes a type checker misses.
- **No new styling stack.** Styling is plain CSS, with no Tailwind and no CSS-in-JS.

## Quickstart

You need React and React DOM 19 or later, `@radix-ui/themes` 3.3 and Node `^20.19.0 || ^22.12.0 || >=24.0.0`.

```bash
npm install dsiab
```

Import the stylesheet once, and wrap your app in `Provider`:

```tsx
import "dsiab/styles.css";
import { Provider, Button, Callout, Flex, TextField } from "dsiab";

export default function App() {
  return (
    <Provider accentColor="iris" uiSize="small">
      <Flex direction="column" gap="3" p="4">
        <Callout tone="info">Signed in as ada@example.com</Callout>
        <TextField label="Project name" placeholder="Untitled" />
        <Button priority="primary">Create project</Button>
      </Flex>
    </Provider>
  );
}
```

## Before you ship

- **Keep both imports.** Without the stylesheet nothing is painted, and without `Provider` every token resolves empty.
- **React only.** Plain HTML or another framework gets empty token values.
- **Server components need a client boundary.** In the Next.js App Router, put `Provider` and the components behind a `"use client"` module.
- **Import one stylesheet.** `dsiab/styles.css` already contains the Radix Themes CSS, and a second copy loaded later reverts the fonts and the base text size.
- **Pre-1.0.** The API can change between minor versions, and release candidates publish to the `next` tag.

## Learn more

- [Guidelines](docs/GUIDELINES.md): the design language, from colour and type to motion and accessibility.
- [Agent setup](docs/AGENT-SETUP.md): how to fit the rules and the skill to your agent tool.
- [Decisions](https://github.com/cakemunny/dsiab/blob/main/docs/DECISIONS.md): the reason behind each rule.
- [Changelog](CHANGELOG.md): what changed in each release.
- [Contributing](https://github.com/cakemunny/dsiab/blob/main/CONTRIBUTING.md): how to report a defect or propose a component.
- [Issues](https://github.com/cakemunny/dsiab/issues): where to report a bug or ask a question.

## Credits and license

Built on [Radix Themes](https://www.radix-ui.com/themes) and [Radix Primitives](https://www.radix-ui.com/primitives), with icons from [Phosphor](https://phosphoricons.com). Parts of the source derive from [facebook/astryx](https://github.com/facebook/astryx), and each of those files says so in its header.

MIT © 2026 cakemunny, see [LICENSE](LICENSE). The bundled fonts, Inter, JetBrains Mono, Schibsted Grotesk and Atkinson Hyperlegible Next, are under the SIL Open Font License 1.1, and [THIRD-PARTY-NOTICES](THIRD-PARTY-NOTICES) holds the terms for everything the package redistributes.
