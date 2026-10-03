import type { Meta, StoryObj } from "@storybook/react-vite";
import { Theme } from "@radix-ui/themes";
import { contrastRatio, flatten, luminance, resolve, resolveColor } from "./_assert";
import { Page, PageHeader } from "../components/ui/_storyKit";

/* One elevation ladder, expressed two ways. Each level binds a surface token + a
   shadow token; the SAME five levels render in both appearances. The metaphor:
   elevation displaces the surface relative to the overhead light — up = toward the
   light (lighter surface in dark, deeper drop in light); down = into shadow (darker
   surface in both modes, edge carved by the inset bevel). */
type Level = { name: string; use: string; surface: string; shadow: string | null };
const LEVELS: Level[] = [
  { name: "Sunken",  use: "wells, inset inputs", surface: "--ds-bg-sunken",  shadow: "--ds-shadow-inset" },
  { name: "Base",    use: "the page / canvas",   surface: "--ds-bg-base",    shadow: null },
  { name: "Raised",  use: "cards, buttons",      surface: "--ds-bg-raised",  shadow: "--ds-shadow-2" },
  { name: "Overlay", use: "menus, popovers",     surface: "--ds-bg-overlay", shadow: "--ds-shadow-overlay" },
  { name: "Modal",   use: "dialogs over scrim",  surface: "--ds-bg-overlay", shadow: "--ds-shadow-6" },
];

const caption = { fontFamily: "var(--code-font-family)", fontSize: 11, color: "var(--ds-text-weak)" } as const;
const colHead = { ...caption, letterSpacing: "0.06em", textTransform: "uppercase" } as const;

function Specimen({ level }: { level: Level }) {
  return (
    <div style={{
      width: 200, height: 56, borderRadius: "var(--ds-radius-3)",
      background: `var(${level.surface})`,
      boxShadow: level.shadow ? `var(${level.shadow})` : "none",
      border: level.shadow ? "none" : "1px solid var(--ds-stroke-weak)",
    }} />
  );
}

/* Each cell forces its own appearance via a nested Theme, so light and dark render
   side by side in one view and read against the same tokens. */
function Cell({ appearance, level }: { appearance: "light" | "dark"; level: Level }) {
  const tall = level.shadow === "--ds-shadow-overlay" || level.shadow === "--ds-shadow-6";
  return (
    <Theme
      appearance={appearance}
      hasBackground={false}
      data-elev={appearance}
      style={{
        flex: 1, display: "flex", alignItems: "center", justifyContent: "center",
        background: "var(--ds-bg-base)", padding: tall ? "50px 40px" : "32px 40px",
        borderLeft: "1px solid var(--ds-stroke-weak)",
      }}
    >
      <Specimen level={level} />
    </Theme>
  );
}

function ElevationGrid() {
  return (
    <Page maxWidth="none">
      <PageHeader
        title="Elevation · Levels"
        standfirst={
          <>
            Five levels, from a recessed well up to a modal. Going <strong style={{ color: "var(--ds-text-strong)", fontWeight: 600 }}>up</strong> moves toward the light — lighter surface in dark mode, deeper drop shadow in light. Going <strong style={{ color: "var(--ds-text-strong)", fontWeight: 600 }}>down</strong> sinks into shadow — darker in both modes, edge carved by an inset bevel. Both appearances render below, side by side.
          </>
        }
      />
      <div style={{ border: "1px solid var(--ds-stroke-weak)", borderRadius: "var(--ds-radius-4)", overflow: "hidden", maxWidth: 980 }}>
        <div style={{ display: "flex", background: "var(--ds-bg-subtle)", borderBottom: "1px solid var(--ds-stroke-weak)" }}>
          <div style={{ width: 180, flexShrink: 0, padding: "10px 16px", ...colHead }}>Level</div>
          <div style={{ flex: 1, padding: "10px 16px", ...colHead }}>Light</div>
          <div style={{ flex: 1, padding: "10px 16px", ...colHead }}>Dark</div>
        </div>
        {LEVELS.map((level, i) => (
          <div key={level.name} style={{ display: "flex", alignItems: "stretch", borderBottom: i < LEVELS.length - 1 ? "1px solid var(--ds-stroke-weak)" : "none" }}>
            <div style={{ width: 180, flexShrink: 0, padding: 16, display: "flex", flexDirection: "column", gap: 4, justifyContent: "center" }}>
              <div style={{ font: "600 14px var(--default-font-family)", color: "var(--ds-text-strong)" }}>{level.name}</div>
              <div style={caption}>{level.shadow ? level.shadow.replace("--ds-shadow-", "") : "no shadow"}<br />{level.use}</div>
            </div>
            <div style={{ flex: 1, display: "flex" }}><Cell appearance="light" level={level} /></div>
            <div style={{ flex: 1, display: "flex" }}><Cell appearance="dark" level={level} /></div>
          </div>
        ))}
      </div>
    </Page>
  );
}

const meta: Meta = {
  title: "Foundations/Elevation",
  parameters: {
    docs: {
      description: {
        component:
          "One elevation ladder, expressed two ways. Elevation displaces a surface relative to the " +
          "overhead light: up moves toward the light (a lighter surface in dark, a deeper drop shadow in " +
          "light); down moves into shadow (a darker surface in both modes, edge carved by an inset bevel). " +
          "Shadows do not vanish in dark — Radix ships deepened dark variants. The same five levels " +
          "(Sunken, Base, Raised, Overlay, Modal) render at both appearances, side by side, so the pattern " +
          "is directly comparable and transferable between modes.",
      },
    },
  },
};
export default meta;
type Story = StoryObj;

export const Levels: Story = {
  render: () => <ElevationGrid />,
  parameters: { a11y: { test: "off" } }, // specimen swatches are decorative; surface/text contrast is asserted below
  play: async ({ canvasElement }) => {
    const lightCells = canvasElement.querySelectorAll<HTMLElement>('[data-elev="light"]');
    const darkCells = canvasElement.querySelectorAll<HTMLElement>('[data-elev="dark"]');

    // (a) Level-count parity — light and dark show the SAME ladder; the 7-vs-3 drift can't return.
    if (lightCells.length !== darkCells.length || lightCells.length !== LEVELS.length) {
      throw new Error(`Level parity: ${lightCells.length} light vs ${darkCells.length} dark (expected ${LEVELS.length})`);
    }
    const lc = lightCells[0];
    const dc = darkCells[0];

    // (c) The shadow tokens each level uses resolve; --ds-shadow-inset is a composite inset, both modes.
    for (const [mode, el] of [["light", lc], ["dark", dc]] as const) {
      const inset = resolve(el, "--ds-shadow-inset");
      if (!inset || !inset.includes("inset")) throw new Error(`--ds-shadow-inset not a composite inset (${mode}): "${inset}"`);
      for (const lvl of LEVELS) {
        if (lvl.shadow && !resolve(el, lvl.shadow)) throw new Error(`${lvl.shadow} unmapped (${mode})`);
      }
    }

    // Effective surface luminance — composite translucent surfaces (e.g. sunken) over base first.
    const surfLum = (el: HTMLElement, name: string) => {
      const c = resolveColor(el, name);
      return luminance(c.a < 1 ? flatten(c, resolveColor(el, "--ds-bg-base")) : c);
    };

    // (b) Dark: up the ladder steps strictly LIGHTER (base < raised < overlay); sunken steps DARKER than base.
    const [dB, dR, dO, dS] = ["--ds-bg-base", "--ds-bg-raised", "--ds-bg-overlay", "--ds-bg-sunken"].map((n) => surfLum(dc, n));
    if (!(dB < dR && dR < dO)) throw new Error(`Dark up-ladder not lighter: base ${dB.toFixed(4)} < raised ${dR.toFixed(4)} < overlay ${dO.toFixed(4)}`);
    if (!(dS < dB)) throw new Error(`Dark sunken not darker than base: sunken ${dS.toFixed(4)} vs base ${dB.toFixed(4)}`);

    // Light: sunken is darker than base too — the metaphor is symmetric (down = into shadow).
    const lB = surfLum(lc, "--ds-bg-base");
    const lS = surfLum(lc, "--ds-bg-sunken");
    if (!(lS < lB)) throw new Error(`Light sunken not darker than base: sunken ${lS.toFixed(4)} vs base ${lB.toFixed(4)}`);

    // (d) text-strong clears AA 4.5 on every surface used, both modes (sunken composited over base).
    for (const [mode, el] of [["light", lc], ["dark", dc]] as const) {
      const base = resolveColor(el, "--ds-bg-base");
      const text = resolveColor(el, "--ds-text-strong");
      for (const surf of ["--ds-bg-base", "--ds-bg-raised", "--ds-bg-overlay", "--ds-bg-sunken"]) {
        const sc = resolveColor(el, surf);
        const ratio = contrastRatio(text, sc.a < 1 ? flatten(sc, base) : sc);
        if (ratio < 4.5) throw new Error(`text-strong on ${surf} (${mode}) = ${ratio.toFixed(2)}, below 4.5`);
      }
    }
  },
};
