import type { StorybookConfig } from "@storybook/react-vite";
import type { Plugin } from "vite";

const config: StorybookConfig = {
  framework: "@storybook/react-vite",
  stories: ["../src/**/*.stories.@(tsx|mdx)", "../src/**/*.docs.mdx"],
  addons: ["@storybook/addon-vitest", "@storybook/addon-a11y"],
  // [[storybook-onboarding-card]]: Storybook's own onboarding card stays out of the dev sidebar, so the dev server matches the
  // public build, which never draws it. The gear menu line needs Storybook 10.6 to go too.
  features: { sidebarOnboardingChecklist: false },
  // System components import @radix-ui headless primitives directly ([[headless-primitives-declared]]). Pre-bundle each and dedupe
  // React so they share the single React instance (an un-optimized primitive otherwise pulls a second
  // copy → "Cannot read properties of null (reading 'useMemo')"). Mirrors vitest.config.ts.
  viteFinal: async (cfg) => {
    cfg.resolve = cfg.resolve ?? {};
    cfg.resolve.dedupe = [...(cfg.resolve.dedupe ?? []), "react", "react-dom"];
    cfg.optimizeDeps = cfg.optimizeDeps ?? {};
    cfg.optimizeDeps.include = [
      ...(cfg.optimizeDeps.include ?? []),
      "@radix-ui/react-popover",
      "@radix-ui/react-toggle",
      "@radix-ui/react-toggle-group",
      "@radix-ui/react-toolbar",
      "@radix-ui/react-collapsible",
      "@radix-ui/react-accordion",
      "@radix-ui/react-toast",
    ];
    // Keep third-party licence banners (`@license`, `@preserve`, `/*!`) through minification.
    cfg.build = cfg.build ?? {};
    cfg.build.rolldownOptions = cfg.build.rolldownOptions ?? {};
    const out = cfg.build.rolldownOptions.output;
    if (Array.isArray(out)) throw new Error("viteFinal: unexpected array rolldownOptions.output");
    const comments = out?.comments;
    cfg.build.rolldownOptions.output = {
      ...out,
      comments: typeof comments === "object" ? { ...comments, legal: true } : { legal: true },
    };
    // Ship apca-w3's full licence text with the docs site, as licenses/apca-w3-LICENSE.md.
    const apcaLicense: Plugin = {
      name: "dsiab:apca-w3-license",
      apply: "build",
      async generateBundle() {
        const pkg = await this.resolve("apca-w3/package.json");
        if (!pkg) throw new Error("apca-w3-license: cannot resolve apca-w3/package.json");
        const source = await this.fs.readFile(pkg.id.replace(/package\.json$/, "LICENSE.md"));
        this.emitFile({ type: "asset", fileName: "licenses/apca-w3-LICENSE.md", source });
      },
    };
    cfg.plugins = [...(cfg.plugins ?? []), apcaLicense];
    return cfg;
  },
};
// addon-a11y runs axe-core on every story. The error-mode switch lives in
// preview.tsx (parameters.a11y.test), not here. The Vitest browser provider is
// 'playwright', and scripts/browser.mjs picks the browser it launches: the
// DS_BROWSER_PATH override, then Playwright's own Chromium, which
// `npx playwright install chromium` installs once per machine.
export default config;
