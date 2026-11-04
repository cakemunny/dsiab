import type { Meta, StoryObj } from "@storybook/react-vite";
import { Box } from "@radix-ui/themes";
import {
  themeRoot, parseColor, surfaceColour, cssVarColour, withAccent, ALL_ACCENTS, FOCUS_RING, FOCUS_SURFACES,
  NEUTRALS as GUARD_NEUTRALS, SOLID_TEXT_MIN, SOLID_TEXT_MIN_LC, type RGBA,
} from "./_assert";
import {
  FLOORS, HOVER_OVERLAY, INKS, NEUTRALS, NEUTRAL_SURFACE_NAMES, PRESS_FILTER, TINT_SURFACE_NAMES,
  neutralSurfaces, tintSurfaces, type TintSteps,
} from "../palette/surfaces";

/* THE SURFACE TABLE AGAINST THE RENDERED TOKENS ([[palette-surface-table]]).

   `src/palette/surfaces.ts` writes down, for code that cannot read CSS, the
   floors, inks, overlays, press filter and surfaces the browser guards
   measure on. This page holds every one of them to the live theme.

   StaticPartMatchesTheTokens reads the eight neutral surfaces off a fresh
   theme root for each neutral and appearance, composed by the guards' own
   `surfaceColour` from `FOCUS_SURFACES`, and holds the table's value to it.
   It also holds the names and order to `FOCUS_SURFACES`, the neutrals to the
   guards' list, the floors to the guards' constants, the near-black ink to
   amber's rendered label ink, the two hover overlays to the rendered
   `--ds-fill-accent-hover` under a white and a dark label, and the press
   filter to Radix's rendered `--base-button-solid-active-filter`.

   TintRecipeMatchesNamedAccents feeds the table's tint recipe each named
   accent's live alpha steps, and each status family's under that accent's
   collision shift, and holds the seven tinted surfaces to the ones the guards
   compose. That proves the recipe, which steps on which layers, and so that
   a generated brand's own steps, fed the same way, give its real tints.

   The tolerance is one byte per channel, because the guards read a
   translucent colour back through an 8-bit canvas. Neighbouring neutral steps
   differ by three bytes or more, so the tolerance cannot hide a wrong step. */

const meta: Meta = { title: "_internal/Surface table" };
export default meta;
type Story = StoryObj;

const TOLERANCE = 1;

function close(a: { r: number; g: number; b: number }, b: RGBA): boolean {
  return Math.abs(a.r - b.r) <= TOLERANCE && Math.abs(a.g - b.g) <= TOLERANCE && Math.abs(a.b - b.b) <= TOLERANCE;
}

function show(c: { r: number; g: number; b: number }): string {
  return `rgb(${c.r.toFixed(1)}, ${c.g.toFixed(1)}, ${c.b.toFixed(1)})`;
}

/** A fresh theme root for one neutral and appearance, off screen. */
function probeFor(root: HTMLElement, neutral: string, appearance: "light" | "dark"): HTMLElement {
  const probe = document.createElement("div");
  for (const a of Array.from(root.attributes)) {
    if (a.name !== "class" && a.name !== "style") probe.setAttribute(a.name, a.value);
  }
  probe.className = `radix-themes ${appearance}`;
  probe.setAttribute("data-gray-color", neutral);
  probe.style.cssText = "position:fixed;left:-9999px;top:0;width:10px;height:10px";
  document.body.appendChild(probe);
  return probe;
}

/** A token's colour as an `rgba()` the table's parser reads, through the guards' rasteriser. */
function tokenAsRgba(el: Element, name: string): string {
  const c = cssVarColour(el, name);
  return `rgba(${Math.round(c.r)}, ${Math.round(c.g)}, ${Math.round(c.b)}, ${c.a.toFixed(4)})`;
}

export const StaticPartMatchesTheTokens: Story = {
  render: () => <Box data-testid="probe" />,
  play: async ({ canvasElement }) => {
    const root = themeRoot(canvasElement);
    const fails: string[] = [];
    let read = 0;

    // Structure: the names, their order and the neutrals are the guards' own.
    const guardNames = FOCUS_SURFACES.map((s) => s.name);
    const tableNames = [...NEUTRAL_SURFACE_NAMES, ...TINT_SURFACE_NAMES];
    if (guardNames.join("|") !== tableNames.join("|")) fails.push(`surface names: ${tableNames.join(", ")} against the guards' ${guardNames.join(", ")}`);
    if (NEUTRALS.join("|") !== GUARD_NEUTRALS.join("|")) fails.push(`neutrals: ${NEUTRALS.join(", ")} against the guards' ${GUARD_NEUTRALS.join(", ")}`);

    // Floors: the guards' constants.
    if (FLOORS.textOnFill.wcag !== SOLID_TEXT_MIN || FLOORS.textOnFill.lc !== SOLID_TEXT_MIN_LC) fails.push("textOnFill floor differs from SOLID_TEXT_MIN");
    if (FLOORS.nonText.wcag !== FOCUS_RING.min || FLOORS.nonText.lc !== FOCUS_RING.minLc) fails.push("nonText floor differs from FOCUS_RING");

    for (const appearance of ["light", "dark"] as const) {
      for (const neutral of NEUTRALS) {
        const probe = probeFor(root, neutral, appearance);
        try {
          const want = neutralSurfaces(neutral, appearance);
          for (const surface of FOCUS_SURFACES.filter((s) => (NEUTRAL_SURFACE_NAMES as readonly string[]).includes(s.name))) {
            const got = surfaceColour(probe, surface);
            const table = want[surface.name as keyof typeof want];
            read++;
            if (!close(table, got)) fails.push(`[${appearance} ${neutral}] ${surface.name}: table ${show(table)}, rendered ${show(got)}`);
          }

          // Inks and overlays, read where the theme sets them. Amber's label is the near-black ink.
          const restore = withAccent(probe, "amber");
          try {
            const ink = cssVarColour(probe, "--accent-contrast");
            if (!close(parseColor(INKS.nearBlack), ink)) fails.push(`[${appearance} ${neutral}] near-black ink: ${INKS.nearBlack}, rendered ${show(ink)}`);
            const darkInkOverlay = cssVarColour(probe, "--ds-fill-accent-hover");
            if (!close(parseColor(HOVER_OVERLAY.nearBlack), darkInkOverlay) || Math.abs(parseColor(HOVER_OVERLAY.nearBlack).a - darkInkOverlay.a) > 0.01) {
              fails.push(`[${appearance} ${neutral}] hover overlay under the dark ink: ${HOVER_OVERLAY.nearBlack}, rendered ${show(darkInkOverlay)} at ${darkInkOverlay.a}`);
            }
          } finally {
            restore();
          }
          const restoreIris = withAccent(probe, "iris");
          try {
            const whiteInkOverlay = cssVarColour(probe, "--ds-fill-accent-hover");
            if (!close(parseColor(HOVER_OVERLAY.white), whiteInkOverlay) || Math.abs(parseColor(HOVER_OVERLAY.white).a - whiteInkOverlay.a) > 0.01) {
              fails.push(`[${appearance} ${neutral}] hover overlay under white: ${HOVER_OVERLAY.white}, rendered ${show(whiteInkOverlay)} at ${whiteInkOverlay.a}`);
            }
          } finally {
            restoreIris();
          }
          const filter = getComputedStyle(probe).getPropertyValue("--base-button-solid-active-filter").trim();
          const p = PRESS_FILTER[appearance];
          const expected = p.saturate === 1 ? `brightness(${p.brightness})` : `brightness(${p.brightness}) saturate(${p.saturate})`;
          if (filter !== expected) fails.push(`[${appearance} ${neutral}] press filter: table ${expected}, rendered ${filter}`);
        } finally {
          probe.remove();
        }
      }
    }

    const want = 2 * NEUTRALS.length * NEUTRAL_SURFACE_NAMES.length;
    if (read !== want) throw new Error(`read ${read} surfaces, expected ${want}`);
    if (fails.length) throw new Error(`${fails.length} table values differ from the theme ([[palette-surface-table]]):\n${fails.slice(0, 40).join("\n")}`);
  },
};

export const TintRecipeMatchesNamedAccents: Story = {
  render: () => <Box data-testid="probe" />,
  play: async ({ canvasElement }) => {
    const root = themeRoot(canvasElement);
    const fails: string[] = [];
    let read = 0;
    for (const appearance of ["light", "dark"] as const) {
      for (const neutral of NEUTRALS) {
        const probe = probeFor(root, neutral, appearance);
        try {
          for (const accent of ALL_ACCENTS) {
            const restore = withAccent(probe, accent);
            try {
              const steps: TintSteps = {
                accentA3: tokenAsRgba(probe, "--accent-a3"),
                accentA5: tokenAsRgba(probe, "--accent-a5"),
                errorA3: tokenAsRgba(probe, "--error-a3"),
                warningA3: tokenAsRgba(probe, "--warning-a3"),
                successA3: tokenAsRgba(probe, "--success-a3"),
                infoA3: tokenAsRgba(probe, "--info-a3"),
              };
              const want = tintSurfaces(neutral, appearance, steps);
              for (const surface of FOCUS_SURFACES.filter((s) => (TINT_SURFACE_NAMES as readonly string[]).includes(s.name))) {
                const got = surfaceColour(probe, surface);
                const table = want[surface.name as keyof typeof want];
                read++;
                if (!close(table, got)) fails.push(`[${appearance} ${neutral} ${accent}] ${surface.name}: recipe ${show(table)}, rendered ${show(got)}`);
              }
            } finally {
              restore();
            }
          }
        } finally {
          probe.remove();
        }
      }
    }
    const want = 2 * NEUTRALS.length * ALL_ACCENTS.length * TINT_SURFACE_NAMES.length;
    if (read !== want) throw new Error(`read ${read} tinted surfaces, expected ${want}`);
    if (fails.length) throw new Error(`${fails.length} tinted surfaces differ from the theme ([[palette-surface-table]]):\n${fails.slice(0, 40).join("\n")}`);
  },
};
