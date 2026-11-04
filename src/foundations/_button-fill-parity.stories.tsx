import type { Meta, StoryObj } from "@storybook/react-vite";
import { Box } from "@radix-ui/themes";
import {
  themeRoot, cssVarColour, flatten, contrastRatio, parseColor, withAccent, ALL_ACCENTS, LIGHT_SCALE_ACCENTS,
  SOLID_TEXT_MIN, SOLID_TEXT_MIN_LC, type RGBA,
} from "./_assert";
import { apcaContrast } from "./apca";
import { labelOnFill, searchFill } from "../palette/buttonFill";
import { pageReading } from "../palette/brandAnalysis";
import { HOVER_OVERLAY, INKS } from "../palette/surfaces";

/* THE GENERATOR'S BUTTON QUESTIONS AGAINST THE NAMED ACCENTS ([[generated-button-fill]]).

   The generator asks of a seed what the theme already answered by hand for
   the 27 named accents. Fed each named accent's own colours, it must give the
   theme's answers. The expected sets come from the rendered theme, not from
   a list typed here.

   Question2MatchesTheDeepenedFills. In light, the theme deepens a filled
   button wherever its rendered --accent-solid is not its --accent-9. The
   generator's question 2 on that --accent-9 must fail exactly there. For each
   one it fails, the shade the search returns must reach 4.5:1 and APCA Lc 60
   with its ink at rest and under the hover overlay, measured with the guards'
   own WCAG and reference APCA, not the generator's. The shade does not have to
   equal the theme's pin. Light only: in dark, gray's step 9 passes, and the
   pins hold one value for both appearances.

   Question1aMatchesThePartEdges. On the fill a part paints, --accent-indicator,
   question 1a must fail exactly amber, lime, mint, sky and yellow in light, and
   plum, purple, violet, iris, indigo, gray and oxblood in dark. Every accent it
   fails must carry a rendered --accent-part-edge, because a 1a miss is what the
   part edge fixes. The edge set can hold more (dark pink takes one for a track
   on a panel, not for the page). */

const meta: Meta = { title: "_internal/Button fill parity" };
export default meta;
type Story = StoryObj;

const DARK_1A = ["plum", "purple", "violet", "iris", "indigo", "gray", "oxblood"];

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

const rgb = (c: RGBA) => ({ r: Math.round(c.r), g: Math.round(c.g), b: Math.round(c.b) });
const same = (a: RGBA, b: RGBA) => Math.abs(a.r - b.r) < 1 && Math.abs(a.g - b.g) < 1 && Math.abs(a.b - b.b) < 1;
const sorted = (xs: string[]) => [...xs].sort().join(", ");

export const Question2MatchesTheDeepenedFills: Story = {
  render: () => <Box data-testid="probe" />,
  play: async ({ canvasElement }) => {
    const probe = probeFor(themeRoot(canvasElement), "light");
    const deepened: string[] = [];
    const fails: string[] = [];
    const problems: string[] = [];
    try {
      for (const accent of ALL_ACCENTS) {
        const restore = withAccent(probe, accent);
        try {
          const nine = cssVarColour(probe, "--accent-9");
          if (!same(nine, cssVarColour(probe, "--accent-solid"))) deepened.push(accent);
          if (!labelOnFill(rgb(nine), "light").passes) {
            fails.push(accent);
            const found = searchFill(rgb(nine), "light");
            if (!found.adjusted) { problems.push(`${accent}: the search found no passing shade`); continue; }
            const fill = parseColor(found.fill);
            const ink = parseColor(INKS[found.label.ink]);
            const hover = flatten(parseColor(HOVER_OVERLAY[found.label.ink]), fill);
            for (const [state, bg] of [["rest", fill], ["hover", hover]] as const) {
              const ratio = contrastRatio(ink, bg);
              const lc = apcaContrast(ink, bg);
              if (ratio < SOLID_TEXT_MIN || lc < SOLID_TEXT_MIN_LC) {
                problems.push(`${accent} ${state}: ${found.fill} with ${found.label.ink} reads ${ratio.toFixed(2)}:1, Lc ${lc.toFixed(1)}`);
              }
            }
          }
        } finally {
          restore();
        }
      }
    } finally {
      probe.remove();
    }
    if (deepened.length !== 16) throw new Error(`expected the theme to deepen 16 accents in light, read ${deepened.length}: ${sorted(deepened)}`);
    if (sorted(fails) !== sorted(deepened)) {
      throw new Error(`question 2 fails ${sorted(fails)}\nthe theme deepens ${sorted(deepened)}`);
    }
    if (problems.length) throw new Error(`the search's shades miss the floor:\n${problems.join("\n")}`);
  },
};

export const Question1aMatchesThePartEdges: Story = {
  render: () => <Box data-testid="probe" />,
  play: async ({ canvasElement }) => {
    const root = themeRoot(canvasElement);
    const problems: string[] = [];
    for (const [appearance, expected] of [["light", LIGHT_SCALE_ACCENTS], ["dark", DARK_1A]] as const) {
      const probe = probeFor(root, appearance);
      const fails: string[] = [];
      try {
        for (const accent of ALL_ACCENTS) {
          const restore = withAccent(probe, accent);
          try {
            const fill = rgb(cssVarColour(probe, "--accent-indicator"));
            if (!pageReading(fill, appearance).passes) {
              fails.push(accent);
              if (cssVarColour(probe, "--accent-part-edge").a === 0) problems.push(`${appearance} ${accent}: fails 1a and carries no part edge`);
            }
          } finally {
            restore();
          }
        }
      } finally {
        probe.remove();
      }
      if (sorted(fails) !== sorted([...expected])) problems.push(`${appearance}: 1a fails ${sorted(fails)}, expected ${sorted([...expected])}`);
    }
    if (problems.length) throw new Error(problems.join("\n"));
  },
};
