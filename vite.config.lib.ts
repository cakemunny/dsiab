import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

/* Library build — the consumable package (plan D5/D7).
 *
 * This config is SEPARATE from vitest.config.ts / .storybook/main.ts on purpose:
 * those two build the docs and the test harness (app-shaped, everything bundled,
 * React deduped into one instance). This one builds the artifact another app
 * installs, where the opposite is true — the consumer's React must win.
 *
 * Two rules this file exists to hold:
 *
 * 1. NOTHING the consumer installs may be bundled. `react`, `react-dom` and
 *    `@radix-ui/themes` are BOTH peerDependencies and devDependencies here, so a
 *    bundled copy would ship inside the tarball and hand the consumer a second
 *    React ("Invalid hook call"). Every peer + runtime dependency is external —
 *    npm resolves them in the consuming app.
 *
 * 2. `process.env.NODE_ENV` is NOT inlined. The dev-only accessibility warnings
 *    (missing label, missing alt) gate on it, and Vite's define plugin skips the
 *    replacement in lib mode (`definePlugin`: `if (!isBuildLib)`), so the guard
 *    survives into dist as a live expression for the CONSUMER's bundler to fold.
 *    Never add a `define` for it, and never define `import.meta.env.DEV` either —
 *    a `false` there deletes all 14 warnings permanently and silently.
 */

const pkg = JSON.parse(
  readFileSync(fileURLToPath(new URL("./package.json", import.meta.url)), "utf8"),
) as {
  version: string;
  dependencies?: Record<string, string>;
  peerDependencies?: Record<string, string>;
};

const externalPackages = [
  ...Object.keys(pkg.peerDependencies ?? {}),
  ...Object.keys(pkg.dependencies ?? {}),
];

/** A bare specifier that resolves to a package the consumer installs. */
const isExternal = (id: string): boolean => {
  // Our own source, and anything already resolved to a path.
  if (id.startsWith(".") || id.startsWith("/") || id.startsWith("\0")) return false;
  // CSS is the exception: tokens/index.css `@import`s @radix-ui/themes/styles.css and
  // six @fontsource/inter sheets. Those must be INLINED into the one stylesheet the
  // README tells consumers to import (D7) — externalising them would emit a
  // stylesheet whose @imports the consumer's bundler has to resolve itself.
  if (id.endsWith(".css")) return false;
  return externalPackages.some((name) => id === name || id.startsWith(`${name}/`));
};

/* Fonts ship as FILES, not base64.
 *
 * Measured: Vite's `shouldInline` short-circuits on `if (config.build.lib) return true`
 * — in library mode every asset is inlined, and that check runs BEFORE
 * `build.assetsInlineLimit`, so the limit cannot turn it off. Left alone, the six
 * @fontsource/inter sheets land in the stylesheet as 84 base64 URIs: 1.85 MB of the
 * 3.15 MB total, every subset (cyrillic, greek, vietnamese…) downloaded by every
 * consumer on first paint, uncacheable and unsplittable.
 *
 * The one escape hatch checked ahead of the lib clause is Vite's public `?no-inline`
 * asset query. This postcss plugin appends it to font `url()`s. Vite's plugin order is
 * [postcss-import, …userPlugins, UrlRewritePostcssPlugin] (its css plugin unshifts the
 * importer and pushes the url rewriter), so this runs after the @font-face blocks are
 * inlined by @import and before their urls are turned into built assets — exactly the
 * slot needed. Result: dist/assets/*.woff2, and the browser fetches only the subsets
 * it actually renders.
 *
 * It MUST hook `Once`, not `Declaration`. PostCSS runs every plugin's `Once` over the
 * whole tree before it starts the per-node visitor walk, and Vite's url rewriter is a
 * `Once` — a `Declaration` visitor here would only ever see urls already replaced by
 * data: URIs. (Measured: with a `Declaration` visitor the stylesheet stayed at 3.15 MB
 * and `grep -c no-inline dist/styles.css` returned 0.)
 */
const noInlineFontAssets = {
  postcssPlugin: "ds-no-inline-font-assets",
  Once(root: { walkDecls(cb: (decl: { value: string }) => void): void }) {
    root.walkDecls((decl) => {
      if (!decl.value.includes("url(")) return;
      decl.value = decl.value.replace(
        /url\((['"]?)([^'")?]+\.(?:woff2?|ttf|otf|eot))(['"]?)\)/g,
        (_match, open: string, url: string, close: string) =>
          `url(${open}${url}?no-inline${close})`,
      );
    });
  },
};

export default defineConfig({
  // RELATIVE asset urls. Vite's default base is "/", which emits
  // `url(/assets/inter-latin-400-normal-<hash>.woff2)` into the stylesheet — a path off
  // the CONSUMER's web root, where nothing of ours is served. The fonts would exist in
  // the package and 404 in the browser. "./" makes each url() relative to styles.css, so
  // the consumer's bundler resolves it inside node_modules and emits its own copy.
  base: "./",
  // The one define this build carries, and it is not an exception to rule 2 above.
  // That rule bans defining `process.env.NODE_ENV` and `import.meta.env.DEV`, because
  // folding either one deletes the dev-only accessibility warnings from the shipped
  // file. This key is our own, it is read in exactly one place (src/version.ts), and
  // folding it is the entire point: without it `dist/index.js` contains the version
  // zero times and two builds are indistinguishable from inside a consuming app.
  //
  // Measured, so the neighbouring warning is not read as covering this too: Vite's
  // lib-mode skip is `if (!isBuildLib)` around the `process.env.*` map ALONE
  // (node_modules/vite/dist/node/chunks/node.js). User-supplied define keys are
  // replaced in library mode as they are anywhere else.
  define: { __DS_VERSION__: JSON.stringify(pkg.version) },
  plugins: [react()],
  css: { postcss: { plugins: [noInlineFontAssets] } },
  build: {
    outDir: "dist",
    // Deliberately FALSE. `tsc -p tsconfig.build.json` writes its .d.ts files into the
    // same dist/, and Vite empties outDir on every rebuild — under `npm run dev`
    // (vite build --watch) that would delete the declarations on each keystroke.
    // `npm run clean` owns the wipe instead, once, before the build.
    emptyOutDir: false,
    sourcemap: true,
    // One stylesheet, not one per chunk — the export map publishes exactly
    // "./styles.css" and the README documents exactly one import line.
    cssCodeSplit: false,
    // A library ships readable code; the consumer's bundler minifies. Keeping it
    // unminified also keeps the NODE_ENV guards legible in the shipped file.
    minify: false,
    target: "es2022",
    lib: {
      entry: fileURLToPath(new URL("./src/index.ts", import.meta.url)),
      formats: ["es"],
      fileName: () => "index.js",
      // -> dist/styles.css (resolveLibCssFilename appends the extension).
      cssFileName: "styles",
    },
    rollupOptions: {
      external: isExternal,
      output: {
        // The stylesheet keeps its unhashed lib name (build.lib.cssFileName -> `styles`)
        // because the export map publishes the literal path "./styles.css". Everything
        // else — the woff2 subsets — is hashed, so upgrading the package never serves a
        // stale font from cache.
        assetFileNames: (asset) => {
          const name = asset.names?.[0] ?? "";
          return name.endsWith(".css") ? "[name][extname]" : "assets/[name]-[hash][extname]";
        },
      },
    },
  },
});
