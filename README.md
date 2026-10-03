# DSIAB - Design System In A Box

React components and design tokens over Radix Themes. Accent, neutral, size, contrast and typefaces are props on one `Provider`, so a single change re-skins a whole product.

[![npm](https://img.shields.io/npm/v/dsiab)](https://www.npmjs.com/package/dsiab)
[![license](https://img.shields.io/badge/license-MIT%20%2B%20OFL--1.1-blue)](LICENSE)
[![docs](https://img.shields.io/badge/docs-dsiab.pages.dev-blue)](https://dsiab.pages.dev)

**Documentation:** [dsiab.pages.dev](https://dsiab.pages.dev) is the Storybook for the latest release, and `npx dsiab docs` opens the docs for the version you installed.

[Changelog](CHANGELOG.md) · [Issues](https://github.com/cakemunny/dsiab/issues) · [Contributing](CONTRIBUTING.md)

## Install

Node `^20.19.0 || ^22.12.0 || >=24.0.0`.

```bash
npm install dsiab
```

The peer dependencies are `react >=19`, `react-dom >=19` and `@radix-ui/themes ~3.3.0`. Some components take `ref` as an ordinary prop, which needs React 19, and `dsiab/styles.css` bundles the Radix Themes 3.3 stylesheet.

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

The stylesheet import is required, and `Provider` mounts once, above everything else.

## Before you ship

**React only.** The token layer exists under `Provider`, so the stylesheet on plain HTML or in another framework gives empty token values.

**Server components need a client boundary.** The components use hooks and context. In a React Server Components app, such as the Next.js App Router, put `Provider` and the components behind a `"use client"` module.

**Import one stylesheet.** `dsiab/styles.css` already contains the Radix Themes CSS. A second copy of Radix's stylesheet, loaded later, reverts the fonts and the base text size.

**Pre-1.0.** The API can change between minor versions, and release candidates publish to the `next` tag.

## What is included

- Components with keyboard support and accessible names, tested in a real browser
- `--ds-*` semantic tokens for colour, type, spacing, radius, shadow and motion
- Runtime theming through `Provider` props
- `ds-check`, which checks your code against the system's rules
- Rules and skills for AI coding agents
- Inter, JetBrains Mono, Schibsted Grotesk and Atkinson Hyperlegible Next, bundled

dsiab is a layer over Radix Themes: its components wrap Radix primitives with this system's tokens and props. Layout primitives such as `Box` and `Flex` are Radix's own, re-exported from `dsiab`.

The roster of what ships, and what stays out on purpose with the reason, is machine-readable:

```ts
import roster from "dsiab/registry.json";
```

Icons are Phosphor (`@phosphor-icons/react`), and styling is plain CSS under `.radix-themes`, with no Tailwind and no CSS-in-JS.

## For AI agents

| Command or file | What you get |
| --- | --- |
| `npx ds-check .` | A check of your code against the system's rules |
| `npx dsiab init` | A plan for the imports, a token file and the agent layer, applied with `--write` |
| The shipped rules | The rules for code built on dsiab, written to your `AGENTS.md` |
| The `dsiab` skill | What exists, the rules and the commands, in Agent Skills format |
| `docs/AGENT-SETUP.md` | How to fit those files to your agent tool |

It works with any agent tool that reads `AGENTS.md` or Agent Skills.

## More docs

[GUIDELINES](docs/GUIDELINES.md) · [DECISIONS](https://github.com/cakemunny/dsiab/blob/main/docs/DECISIONS.md) · [CHANGELOG](CHANGELOG.md) · [Storybook](https://dsiab.pages.dev)

## Contributing

See [CONTRIBUTING.md](https://github.com/cakemunny/dsiab/blob/main/CONTRIBUTING.md).

## License

MIT © 2026 cakemunny. See [LICENSE](LICENSE). The bundled fonts are under the SIL Open Font License 1.1, and [THIRD-PARTY-NOTICES](THIRD-PARTY-NOTICES) holds the terms for everything this package redistributes.
