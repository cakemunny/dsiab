import type { Meta, StoryObj } from "@storybook/react-vite";
import { Box, Button as RadixButton, Flex } from "@radix-ui/themes";
import { Badge } from "../components/ui/Badge";
import {
  themeRoot, assertNoEmpty, resolveColor, parseColor, flatten, contrastRatio, NEUTRALS, type RGBA,
} from "../foundations/_assert";
import { parseSeed } from "../palette/parseSeed";
import { CUSTOM_ACCENT, customBrandProperties } from "./customBrand";

/* SEEDED BRAND TEXT ([[seeded-soft-text-as-painted]]).

   A generated brand's step 11 is a label on a soft fill: the accent Badge and a
   soft Button paint `--accent-a11` on `--accent-a3`, and the soft Button moves
   its fill to `--accent-a4` on hover and open and to `--accent-a5` on press.
   Both are alpha steps, so the colour on screen is the fill laid over the
   surface and the label laid over that.

   SoftLabelsAsPainted renders the real Badge and a Radix soft Button, clones
   them into a fresh `ds-custom` theme for each seed, appearance and neutral,
   writes the seed's generated values on that theme as the Provider writes them
   on the page root, and reads the painted label and fill on the page and on a
   card. It holds the label at 4.5:1 at rest in light, and at rest, on hover and
   on press in dark, which is what every named accent delivers in dark. Hover
   and press are read off the tokens Radix's soft rule paints, because a clone
   cannot be hovered.

   The seeds are the custom-accent census samples plus the one that was
   reported: #1a5fb4 read 4.28:1 in dark before the generator measured its text
   step as it paints. */

const meta: Meta = { title: "_internal/Seeded brand text" };
export default meta;
type Story = StoryObj;

const SEEDS = [
  "#1a5fb4", "#3b82f6", "#6e56cf", "#0b1a3a", "#c8102e", "#ff6b5e", "#00a86b",
  "#fff59d", "#f5f0ff", "#ffd400", "#111111", "#e91e63", "#ff8c00", "#b3e5fc",
] as const;

const FLOOR = 4.5;

/** The fills a soft Button paints, per state. Light is held at rest only, which is what
 *  the named accents deliver there. */
const STATES = {
  light: [["rest", "--accent-a3"]],
  dark: [["rest", "--accent-a3"], ["hover", "--accent-a4"], ["press", "--accent-a5"]],
} as const;

const SURFACES = [["page", "--ds-bg-base"], ["card", "--ds-bg-raised"]] as const;

function Specimen() {
  return (
    <Flex gap="3" align="center" data-part="specimen">
      <Badge data-part="badge">Draft</Badge>
      <RadixButton variant="soft" size="1" data-part="soft-button">Edit</RadixButton>
    </Flex>
  );
}

export const SoftLabelsAsPainted: Story = {
  render: () => <Box data-testid="probe"><Specimen /></Box>,
  play: async ({ canvasElement }) => {
    const root = themeRoot(canvasElement);
    const specimen = canvasElement.querySelector<HTMLElement>('[data-part="specimen"]');
    if (!specimen) throw new Error("the specimen did not render");

    const host = document.createElement("div");
    host.style.cssText = "position:fixed;left:-9999px;top:0;width:480px";
    document.body.appendChild(host);
    const fails: string[] = [];
    let read = 0;
    try {
      for (const seed of SEEDS) {
        const parsed = parseSeed(seed);
        if (!parsed.ok) throw new Error(`${seed}: the parser refused a seed this play expects to measure`);
        const props = customBrandProperties(parsed.rgb);
        for (const appearance of ["light", "dark"] as const) {
          for (const neutral of NEUTRALS) {
            for (const [surfaceName, surfaceVar] of SURFACES) {
              host.replaceChildren();
              const theme = document.createElement("div");
              for (const a of Array.from(root.attributes)) {
                if (a.name !== "class" && a.name !== "style") theme.setAttribute(a.name, a.value);
              }
              // The values go on before the attribute, as the Provider writes them.
              for (const [k, v] of Object.entries(props)) theme.style.setProperty(k, v);
              theme.className = `radix-themes ${appearance}`;
              theme.setAttribute("data-gray-color", neutral);
              theme.setAttribute("data-accent-color", CUSTOM_ACCENT);
              theme.style.background = "var(--ds-bg-base)";
              const surface = document.createElement("div");
              surface.style.background = `var(${surfaceVar})`;
              surface.appendChild(specimen.cloneNode(true));
              theme.appendChild(surface);
              host.appendChild(theme);
              if (read === 0) assertNoEmpty(theme, ["--accent-a3", "--accent-a11", "--ds-bg-base", "--ds-bg-raised"]);

              const at = `[${seed} ${appearance} ${neutral} ${surfaceName}]`;
              const under = flatten(resolveColor(surface, surfaceVar), resolveColor(theme, "--ds-bg-base"));
              const label = resolveColor(theme, "--accent-a11");
              for (const part of ["badge", "soft-button"] as const) {
                const el = surface.querySelector<HTMLElement>(`[data-part="${part}"]`);
                if (!el) throw new Error(`${at} ${part}: the clone holds no such part`);
                const painted = getComputedStyle(el);
                // Prove the part paints the soft pair, so the play measures what it says it measures.
                const paintedLabel = parseColor(painted.color);
                const paintedFill = parseColor(painted.backgroundColor);
                if (!same(paintedLabel, label) || !same(paintedFill, resolveColor(theme, "--accent-a3"))) {
                  throw new Error(`${at} ${part}: paints ${painted.color} on ${painted.backgroundColor}, not --accent-a11 on --accent-a3`);
                }
                const states = part === "badge" ? STATES[appearance].slice(0, 1) : STATES[appearance];
                for (const [state, fillVar] of states) {
                  const fill = flatten(resolveColor(theme, fillVar), under);
                  const ratio = contrastRatio(label, fill);
                  read++;
                  if (ratio < FLOOR) fails.push(`${at} ${part} ${state}: ${ratio.toFixed(2)}:1`);
                }
              }
            }
          }
        }
      }
    } finally {
      host.remove();
    }

    // 14 seeds x 6 neutrals x 2 surfaces x (light: 2 parts at rest; dark: the Badge at rest
    // and the Button in three states).
    const want = SEEDS.length * NEUTRALS.length * SURFACES.length * (2 + 4);
    if (read !== want) throw new Error(`read ${read} labels, expected ${want}`);
    if (fails.length) {
      throw new Error(`${fails.length} soft labels under ${FLOOR}:1 ([[seeded-soft-text-as-painted]]):\n${fails.slice(0, 40).join("\n")}`);
    }
  },
};

function same(a: RGBA, b: RGBA): boolean {
  return Math.abs(a.r - b.r) <= 1 && Math.abs(a.g - b.g) <= 1 && Math.abs(a.b - b.b) <= 1 && Math.abs(a.a - b.a) <= 0.01;
}
