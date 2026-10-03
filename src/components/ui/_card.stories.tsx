import type { Meta, StoryObj } from "@storybook/react-vite";
import { Box, Text } from "@radix-ui/themes";
import { Card, type CardVariant } from "./Card";
import { contrastRatio, flatten, parseColor, themeRoot, withAccent, type RGBA } from "../../foundations/_assert";

/* Test-only contract for Card's variant CSS — the ONE thing in the component that is net-new paint
   rather than a Radix passthrough (`[data-ds-card]` in tokens/components.css). Underscore-prefixed →
   _internal, because the play flips the theme root's appearance class to measure both modes and that
   is behaviour, not documentation.

   The contract, in the order the variant model claims it:
     1. ONE box. All three build on Radix's `surface`, so padding and radius must be IDENTICAL —
        the moment a variant changes the box, "same box, different boundary" stops being true.
     2. The lift is the LADDER's Raised step, not a bespoke shadow — `elevated`'s computed box-shadow
        must equal `--ds-shadow-2` exactly, and the other two must carry no lift at all.
     3. The edge is Radix's ::after ring: `outlined` and `elevated` draw it, `filled` drops it.
     4. `filled` reads as its OWN surface — in BOTH appearances, and across accents.

   (4) is the one this file exists for. `filled` used to paint `--ds-bg-subtle` (gray-2), which in dark
   is the exact colour Radix's translucent panel composites to: filled and outlined became the same
   interior differing only by whether the 1px edge was drawn (measured 1.00:1 between them, 1.07:1
   against the page). Nothing caught it, because a fill that exists is not the same as a fill you can
   see. So the assertion is a MEASURED separation, not the presence of a declaration.

   Thresholds. `filled` composited over the page must clear MIN_VS_PAGE, and must clear
   MIN_VS_OUTLINED against outlined's own composited interior. Both are set below what the current
   tokens deliver (light 1.14 / dark 1.18 against the page; light 1.16 / dark 1.10 against outlined)
   and ABOVE what the regression delivered (1.03 / 1.07 against the page; 1.04 / 1.00 against
   outlined) — so the gate has room for the real values to breathe and still fails the specific
   regression it is here to catch, in either appearance. Surface-vs-surface ratios are small by
   nature: WCAG's 3:1 is a rule for text and for control boundaries, not for one neutral panel step
   against another, and holding a card fill to it would mean no neutral fill could ever pass. */

const VARIANTS: CardVariant[] = ["outlined", "elevated", "filled"];
const MIN_VS_PAGE = 1.1;
const MIN_VS_OUTLINED = 1.05;
// A spread of accents — the fill is a neutral role, but Radix pairs a TINTED gray to each accent, so
// "neutral" still has to be proven across the brands rather than assumed from one.
const ACCENTS = ["gray", "iris", "tomato", "grass", "amber", "sky"];

const meta: Meta<typeof Card> = {
  title: "_internal/Card variants",
  component: Card,
  parameters: { controls: { disable: true } },
};
export default meta;
type Story = StoryObj<typeof Card>;

export const VariantContract: Story = {
  /* The fixture paints its own backdrop from --ds-bg-base — the app background a card actually sits
     on. That sets the specimen's AMBIENT condition (which the measurement needs) without touching the
     value under test (the card's own fill), so the probe can't pass by forcing what it measures. */
  render: () => (
    <Box data-testid="page" style={{ background: "var(--ds-bg-base)", padding: "24px" }}>
      {VARIANTS.map((v) => (
        <Card key={v} variant={v} style={{ maxWidth: 240, marginBottom: "16px" }}>
          <Text as="p" size="2" style={{ color: "var(--ds-text-strong)" }}>{v}</Text>
        </Card>
      ))}
    </Box>
  ),
  play: async ({ canvasElement }) => {
    const root = themeRoot(canvasElement);
    const page = canvasElement.querySelector<HTMLElement>('[data-testid="page"]');
    if (!page) throw new Error("no page fixture rendered");
    const card = (v: CardVariant) => {
      const el = canvasElement.querySelector<HTMLElement>(`[data-ds-card="${v}"]`);
      if (!el) throw new Error(`no card rendered for variant "${v}"`);
      return el;
    };

    // 1. ONE box across the trio — padding and radius may not drift between variants.
    const box = (el: HTMLElement) => {
      const cs = getComputedStyle(el);
      return [cs.paddingTop, cs.paddingRight, cs.paddingBottom, cs.paddingLeft, cs.borderRadius].join(" / ");
    };
    const boxes = VARIANTS.map((v) => `${v}: ${box(card(v))}`);
    if (new Set(VARIANTS.map((v) => box(card(v)))).size !== 1) {
      throw new Error(`all three variants must share ONE box (padding + radius):\n  ${boxes.join("\n  ")}`);
    }

    // 2. The lift IS the ladder's Raised step — reuse, not a bespoke shadow.
    const probe = document.createElement("div");
    root.appendChild(probe);
    probe.style.boxShadow = "var(--ds-shadow-2)";
    const raised = getComputedStyle(probe).boxShadow;
    probe.remove();
    if (raised === "none" || raised === "") throw new Error("--ds-shadow-2 did not resolve — the elevation ladder is missing");
    const lift = (v: CardVariant) => getComputedStyle(card(v)).boxShadow;
    if (lift("elevated") !== raised) {
      throw new Error(`elevated must carry --ds-shadow-2 (the Raised step).\n  expected: ${raised}\n  got:      ${lift("elevated")}`);
    }
    for (const v of ["outlined", "filled"] as const) {
      if (lift(v) !== "none") throw new Error(`${v} must carry no lift; got box-shadow: ${lift(v)}`);
    }

    // 3. The edge: Radix's ::after ring on outlined + elevated, dropped on filled.
    const ring = (v: CardVariant) => getComputedStyle(card(v), "::after").boxShadow;
    for (const v of ["outlined", "elevated"] as const) {
      if (ring(v) === "none") throw new Error(`${v} must draw the 1px edge (::after ring); got none`);
    }
    if (ring("filled") !== "none") {
      throw new Error(`filled must DROP the edge — the fill does the separating; got ::after box-shadow: ${ring("filled")}`);
    }

    // 4. filled reads as its own surface, in both appearances and across accents. Read the ::before
    //    each card actually paints and composite it over the page it sits on: a translucent fill's
    //    raw token value says nothing about whether the card is visible.
    const interior = (v: CardVariant, backdrop: RGBA) =>
      flatten(parseColor(getComputedStyle(card(v), "::before").backgroundColor), backdrop);

    const wasDark = root.classList.contains("dark");
    const failures: string[] = [];
    const measured: string[] = [];
    try {
      for (const mode of ["light", "dark"] as const) {
        // Both classes are toggled together: Radix's Theme sets exactly one of .light / .dark, and
        // leaving the old one behind would measure a root claiming both appearances at once.
        root.classList.toggle("dark", mode === "dark");
        root.classList.toggle("light", mode === "light");
        for (const accent of ACCENTS) {
          const restore = withAccent(root, accent);
          try {
            const backdrop = parseColor(getComputedStyle(page).backgroundColor);
            const filled = interior("filled", backdrop);
            const outlined = interior("outlined", backdrop);
            const vsPage = contrastRatio(filled, backdrop);
            const vsOutlined = contrastRatio(filled, outlined);
            measured.push(`${mode}/${accent} page ${vsPage.toFixed(3)} outlined ${vsOutlined.toFixed(3)}`);
            if (vsPage < MIN_VS_PAGE) {
              failures.push(`${mode}/${accent}: filled vs the page = ${vsPage.toFixed(3)}:1, below ${MIN_VS_PAGE}:1`);
            }
            if (vsOutlined < MIN_VS_OUTLINED) {
              failures.push(`${mode}/${accent}: filled vs outlined = ${vsOutlined.toFixed(3)}:1, below ${MIN_VS_OUTLINED}:1 — the same box twice`);
            }
          } finally {
            restore();
          }
        }
      }
    } finally {
      root.classList.toggle("dark", wasDark);
      root.classList.toggle("light", !wasDark);
    }
    console.info(`[Card] filled separation (informational):\n  ${measured.join("\n  ")}`);
    if (failures.length) {
      throw new Error(
        `filled must be tellable apart from the page AND from outlined, in both appearances:\n  ${failures.join("\n  ")}`,
      );
    }
  },
};
