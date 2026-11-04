import type { Meta, StoryObj } from "@storybook/react-vite";
import { Box } from "@radix-ui/themes";
import { themeRoot, cssVarColour, withAccent, ALL_ACCENTS, FOCUS_RING, type RGBA } from "./_assert";
import { BLACK_A, WHITE_A, partEdge, ringStack, scrimStack, thumbStroke, type LayerStep } from "../palette/helperLayers";
import { parseColor } from "./_assert";
import type { TintSteps } from "../palette/surfaces";

/* THE GENERATOR'S HELPER LAYERS AGAINST THE ONES THE THEME PICKED ([[generated-helper-layers]]).

   For each of the 27 named accents, in both appearances, every search in
   `src/palette/helperLayers.ts` is fed that accent's rendered colours, and the
   step it picks must paint what `theme.css` paints for the same accent:

     the ring's page stack        --accent-ring-stack, on --ds-fill-accent
     the dark-scrim stack         --accent-ring-stack-scrim
     the light-scrim stack        --accent-ring-stack-scrim-light
     the part edge                --accent-part-edge, on --accent-indicator
     the switch-thumb stroke      --accent-thumb-stroke, on --accent-track

   A step is compared by the colour it paints, read through the guards' own
   rasteriser, so "none" matches a transparent token. 270 rows.

   ONE KIND OF DIFFERENCE IS ALLOWED, AND EACH ONE IS NAMED. The searches hold
   a margin above the floors (`LAYER_MARGIN`), because a few of the theme's
   steps were decided within 0.01 of the floor, inside the guards' own canvas
   rounding: purple's light-scrim step reads 2.99 and indigo's 3.00 in the
   browser, and no model can split them. With the margin the search never
   picks a step a guard fails, and where the theme's step sits inside the
   margin it picks the next heavier one. HEAVIER lists every such row with the
   theme's step and the search's. A listed row that stops differing fails
   too, so the list cannot keep a stale entry. */

const meta: Meta = { title: "_internal/Helper layer parity" };
export default meta;
type Story = StoryObj;

function probeFor(root: HTMLElement, appearance: "light" | "dark"): HTMLElement {
  const probe = document.createElement("div");
  for (const a of Array.from(root.attributes)) {
    if (a.name !== "class" && a.name !== "style") probe.setAttribute(a.name, a.value);
  }
  probe.className = `radix-themes ${appearance}`;
  probe.setAttribute("data-gray-color", "gray");
  probe.style.cssText = "position:fixed;left:-9999px;top:0;width:10px;height:10px";
  document.body.appendChild(probe);
  return probe;
}

const rgbOf = (c: RGBA) => ({ r: Math.round(c.r), g: Math.round(c.g), b: Math.round(c.b) });
const rgba = (c: RGBA) => `rgba(${Math.round(c.r)}, ${Math.round(c.g)}, ${Math.round(c.b)}, ${c.a.toFixed(4)})`;
const hex = (c: RGBA) => `#${[c.r, c.g, c.b].map((v) => Math.round(v).toString(16).padStart(2, "0")).join("")}`;

/** The colour a step paints on `probe`. */
function stepColour(probe: HTMLElement, step: LayerStep): RGBA {
  return step === "none" ? { r: 0, g: 0, b: 0, a: 0 } : cssVarColour(probe, `--${step}`);
}

function samePaint(a: RGBA, b: RGBA): boolean {
  if (a.a < 0.01 && b.a < 0.01) return true;
  return Math.abs(a.a - b.a) <= 0.01 && Math.abs(a.r - b.r) <= 1 && Math.abs(a.g - b.g) <= 1 && Math.abs(a.b - b.b) <= 1;
}

/** Rows where the search picks exactly one step heavier than the theme, because the theme's step
 *  sits within `LAYER_MARGIN` of the floor. "appearance layer accent" -> [theme, search]. */
const HEAVIER: Record<string, [LayerStep, LayerStep]> = {
  "light light-scrim stack indigo": ["black-a5", "black-a6"], // 3.045:1 at black-a5 in the model
  "dark light-scrim stack indigo": ["black-a5", "black-a6"], // the scrim table has no dark arm
  "dark ring stack blue": ["white-a4", "white-a5"], // Lc 30.39 at white-a4 in the model
};

export const EveryLayerMatchesTheTheme: Story = {
  render: () => <Box data-testid="probe" />,
  play: async ({ canvasElement }) => {
    const root = themeRoot(canvasElement);
    const rows: string[] = [];
    const seen = new Set<string>();
    let read = 0;
    for (const appearance of ["light", "dark"] as const) {
      const probe = probeFor(root, appearance);
      try {
        for (const accent of ALL_ACCENTS) {
          const restore = withAccent(probe, accent);
          try {
            const tints: TintSteps = {
              accentA3: rgba(cssVarColour(probe, "--accent-a3")),
              accentA5: rgba(cssVarColour(probe, "--accent-a5")),
              errorA3: rgba(cssVarColour(probe, "--error-a3")),
              warningA3: rgba(cssVarColour(probe, "--warning-a3")),
              successA3: rgba(cssVarColour(probe, "--success-a3")),
              infoA3: rgba(cssVarColour(probe, "--info-a3")),
            };
            const fill = rgbOf(cssVarColour(probe, FOCUS_RING.fill));
            const solid = Array.from({ length: 12 }, (_, i) => hex(cssVarColour(probe, `--accent-${i + 1}`)));
            const alpha = Array.from({ length: 12 }, (_, i) => rgba(cssVarColour(probe, `--accent-a${i + 1}`)));
            const layers: [string, string, LayerStep | null][] = [
              ["ring stack", "--accent-ring-stack", ringStack(fill, appearance, tints)],
              ["dark-scrim stack", "--accent-ring-stack-scrim", scrimStack(fill, "dark")],
              ["light-scrim stack", "--accent-ring-stack-scrim-light", scrimStack(fill, "light")],
              ["part edge", "--accent-part-edge", partEdge(rgbOf(cssVarColour(probe, "--accent-indicator")), appearance)],
              ["thumb stroke", "--accent-thumb-stroke", thumbStroke(solid, alpha, rgbOf(cssVarColour(probe, "--accent-track")))],
            ];
            for (const [name, token, step] of layers) {
              read++;
              const theme = cssVarColour(probe, token);
              if (step === null) { rows.push(`${appearance} ${accent} ${name}: the search found no step, the theme paints ${rgba(theme)}`); continue; }
              const key = `${appearance} ${name} ${accent}`;
              const allowed = HEAVIER[key];
              if (allowed) {
                seen.add(key);
                if (!samePaint(stepColour(probe, allowed[0]), theme) || step !== allowed[1]) {
                  rows.push(`${key}: listed as theme ${allowed[0]} and search ${allowed[1]}, read theme ${rgba(theme)} and search ${step}`);
                }
                continue;
              }
              if (!samePaint(stepColour(probe, step), theme)) rows.push(`${key}: search ${step}, theme ${rgba(theme)}`);
            }
          } finally {
            restore();
          }
        }
      } finally {
        probe.remove();
      }
    }
    for (const key of Object.keys(HEAVIER)) if (!seen.has(key)) rows.push(`${key}: listed in HEAVIER and never read`);
    // The two alpha scales the searches stack are Radix's own.
    const scales = probeFor(root, "light");
    try {
      for (let i = 0; i < 12; i++) {
        for (const [name, table] of [["black", BLACK_A], ["white", WHITE_A]] as const) {
          if (!samePaint(parseColor(table[i]!), cssVarColour(scales, `--${name}-a${i + 1}`))) rows.push(`${name}-a${i + 1}: the table holds ${table[i]}`);
        }
      }
    } finally {
      scales.remove();
    }
    const want = 2 * ALL_ACCENTS.length * 5;
    if (read !== want) throw new Error(`read ${read} layers, expected ${want}`);
    if (rows.length) throw new Error(`${rows.length} of ${want} layers differ from the theme ([[generated-helper-layers]]):\n${rows.join("\n")}`);
  },
};
