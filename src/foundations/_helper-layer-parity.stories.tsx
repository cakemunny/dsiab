import type { Meta, StoryObj } from "@storybook/react-vite";
import { Box } from "@radix-ui/themes";
import { themeRoot, cssVarColour, withAccent, ALL_ACCENTS, FOCUS_RING, type RGBA } from "./_assert";
import { BLACK_A, WHITE_A, partEdge, ringStack, scrimStack, thumbStroke, withoutMargin, type LayerStep } from "../palette/helperLayers";
import { parseColor, NEUTRALS } from "./_assert";
import { RAIL, dashStack, dotEdge, markEdge, sliderThumbStack } from "../palette/markLayers";
import { SCALE_ALPHA_3 } from "../palette/collisionTable";
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
     the mark edge                --accent-mark-edge, on --accent-indicator
     the drop dash                --accent-dash-stack, on --ds-stroke-accent
     the Slider thumb stack       --accent-slider-thumb-stack, by --accent-track
     the warning dot edge         --warning-dot-edge, on --ds-fill-warning
     the success dot edge         --success-dot-edge, on --ds-fill-success
     the error dot edge           --error-dot-edge, on --ds-fill-error

   A step is compared by the colour it paints, read through the guards' own
   rasteriser, so "none" matches a transparent token. 594 rows.

   ONE KIND OF DIFFERENCE IS ALLOWED, AND IT IS PROVED, NOT LISTED.
   HEAVIER BY THE MARGIN. The searches hold a margin above the floors
      (`LAYER_MARGIN`), because a few of the theme's steps were decided within
      0.01 of the floor, inside the guards' own canvas rounding: purple's
      light-scrim step reads 2.99 and indigo's 3.00 in the browser, and no model
      can split them. A search may pick a heavier step than the theme only where
      the same search with no margin (`withoutMargin`) picks exactly the theme's
      step, so the margin alone is the reason. At most 40 rows may do this.
   The Slider thumb has no class of its own: its search reads the ring over each
   neighbour, as `_internal/Non-text contrast` → GreyAndWhiteParts does, and so
   picks the theme's step on every colour.
   The gray accent's colours follow the neutral, so its step is the heaviest
   over the six. */

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

/** The alpha index a step paints: "none" is 0, `black-a6` is 6. Null for a step on the accent's own scale. */
function alphaIndex(step: LayerStep): number | null {
  if (step === "none") return 0;
  const m = /^(?:black|white)-a(\d+)$/.exec(step);
  return m ? Number(m[1]) : null;
}

/** The heavier of two steps on the same alpha scale. */
function heavier(a: LayerStep | null, b: LayerStep | null): LayerStep | null {
  if (a === null || b === null) return null;
  const ia = alphaIndex(a), ib = alphaIndex(b);
  if (ia === null || ib === null) return a === b ? a : null;
  return ia >= ib ? a : b;
}

type Layer = { name: string; token: string; run: (probe: HTMLElement, appearance: "light" | "dark") => LayerStep | null };

function tintsOf(probe: HTMLElement): TintSteps {
  return {
    accentA3: rgba(cssVarColour(probe, "--accent-a3")),
    accentA5: rgba(cssVarColour(probe, "--accent-a5")),
    errorA3: rgba(cssVarColour(probe, "--error-a3")),
    warningA3: rgba(cssVarColour(probe, "--warning-a3")),
    successA3: rgba(cssVarColour(probe, "--success-a3")),
    infoA3: rgba(cssVarColour(probe, "--info-a3")),
  };
}
const read = (probe: HTMLElement, token: string) => rgbOf(cssVarColour(probe, token));

const LAYERS: Layer[] = [
  { name: "ring stack", token: "--accent-ring-stack", run: (p, a) => ringStack(read(p, FOCUS_RING.fill), a, tintsOf(p)) },
  { name: "dark-scrim stack", token: "--accent-ring-stack-scrim", run: (p) => scrimStack(read(p, FOCUS_RING.fill), "dark") },
  { name: "light-scrim stack", token: "--accent-ring-stack-scrim-light", run: (p) => scrimStack(read(p, FOCUS_RING.fill), "light") },
  { name: "part edge", token: "--accent-part-edge", run: (p, a) => partEdge(read(p, "--accent-indicator"), a) },
  {
    name: "thumb stroke", token: "--accent-thumb-stroke",
    run: (p) => thumbStroke(
      Array.from({ length: 12 }, (_, i) => hex(cssVarColour(p, `--accent-${i + 1}`))),
      Array.from({ length: 12 }, (_, i) => rgba(cssVarColour(p, `--accent-a${i + 1}`))),
      read(p, "--accent-track"),
    ),
  },
  { name: "mark edge", token: "--accent-mark-edge", run: (p, a) => markEdge(read(p, "--accent-indicator"), a, tintsOf(p).accentA3, tintsOf(p).accentA5) },
  { name: "drop dash", token: "--accent-dash-stack", run: (p, a) => dashStack(read(p, "--ds-stroke-accent"), a, tintsOf(p).accentA3) },
  { name: "slider thumb stack", token: "--accent-slider-thumb-stack", run: (p, a) => sliderThumbStack(read(p, "--accent-track"), a) },
  { name: "warning dot edge", token: "--warning-dot-edge", run: (p, a) => dotEdge(read(p, "--ds-fill-warning"), a) },
  { name: "success dot edge", token: "--success-dot-edge", run: (p, a) => dotEdge(read(p, "--ds-fill-success"), a) },
  { name: "error dot edge", token: "--error-dot-edge", run: (p, a) => dotEdge(read(p, "--ds-fill-error"), a) },
];

/** A layer's step for the accent on `probe`. The gray accent's colours follow the neutral, so its
 *  step is the heaviest over the six. */
function stepFor(probe: HTMLElement, accent: string, appearance: "light" | "dark", layer: Layer): LayerStep | null {
  if (accent !== "gray") return layer.run(probe, appearance);
  const before = probe.getAttribute("data-gray-color");
  try {
    let worst: LayerStep | null | undefined;
    for (const neutral of NEUTRALS) {
      probe.setAttribute("data-gray-color", neutral);
      const step = layer.run(probe, appearance);
      worst = worst === undefined ? step : heavier(worst, step);
    }
    return worst ?? null;
  } finally {
    if (before) probe.setAttribute("data-gray-color", before);
  }
}

export const EveryLayerMatchesTheTheme: Story = {
  render: () => <Box data-testid="probe" />,
  play: async ({ canvasElement }) => {
    const root = themeRoot(canvasElement);
    const rows: string[] = [];
    const heavierRows: string[] = [];
    let readCount = 0;
    for (const appearance of ["light", "dark"] as const) {
      const probe = probeFor(root, appearance);
      try {
        for (const accent of ALL_ACCENTS) {
          const restore = withAccent(probe, accent);
          try {
            for (const layer of LAYERS) {
              readCount++;
              const key = `${appearance} ${layer.name} ${accent}`;
              const theme = cssVarColour(probe, layer.token);
              const step = stepFor(probe, accent, appearance, layer);
              if (step === null) { rows.push(`${key}: the search found no step, the theme paints ${rgba(theme)}`); continue; }
              if (samePaint(stepColour(probe, step), theme)) continue;
              // Heavier, and only because of the margin: with no margin it is the theme's step.
              const bare = withoutMargin(() => stepFor(probe, accent, appearance, layer));
              const si = alphaIndex(step), bi = bare === null ? null : alphaIndex(bare);
              if (bare !== null && samePaint(stepColour(probe, bare), theme) && si !== null && bi !== null && si > bi) {
                heavierRows.push(`${key}: ${bare} to ${step}`);
                continue;
              }
              rows.push(`${key}: search ${step}${bare && bare !== step ? ` (${bare} with no margin)` : ""}, theme ${rgba(theme)}`);
            }
          } finally {
            restore();
          }
        }
      } finally {
        probe.remove();
      }
    }
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
    // The Outline rail the mark edge is held on is each neutral's --gray-a6.
    for (const appearance of ["light", "dark"] as const) {
      const p = probeFor(root, appearance);
      try {
        for (const neutral of NEUTRALS) {
          p.setAttribute("data-gray-color", neutral);
          if (!samePaint(parseColor(RAIL[neutral][appearance]), cssVarColour(p, "--gray-a6"))) rows.push(`${appearance} ${neutral}: the rail table holds ${RAIL[neutral][appearance]}`);
        }
        // The status tints the brand analysis composes are each scale's own alpha step 3.
        for (const [family, steps] of Object.entries(SCALE_ALPHA_3)) {
          if (!samePaint(parseColor(steps[appearance]), cssVarColour(p, `--${family}-a3`))) rows.push(`${appearance} ${family}: the alpha-3 table holds ${steps[appearance]}`);
        }
      } finally {
        p.remove();
      }
    }
    const want = 2 * ALL_ACCENTS.length * LAYERS.length;
    if (readCount !== want) throw new Error(`read ${readCount} layers, expected ${want}`);
    if (rows.length) {
      throw new Error(
        `${rows.length} of ${want} layers differ from the theme ([[generated-helper-layers]]):\n${rows.join("\n")}` +
          `\n\nheavier by the margin (${heavierRows.length}):\n${heavierRows.join("\n")}`,
      );
    }
    // A bound, so a drift that makes the allowed class swallow the table cannot pass quietly.
    if (heavierRows.length > 40) throw new Error(`${heavierRows.length} rows went heavier by the margin, more than the 40 this story allows:\n${heavierRows.join("\n")}`);
  },
};
