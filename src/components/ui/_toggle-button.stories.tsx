import type { Meta, StoryObj } from "@storybook/react-vite";
import { Flex } from "@radix-ui/themes";
import { TextAlignLeft, TextAlignCenter, TextB } from "@phosphor-icons/react";
import { ToggleButton } from "./ToggleButton";
import { ToggleButtonGroup } from "./ToggleButtonGroup";
import { toHex } from "./_storyKit";
import {
  ALL_ACCENTS, contrastRatio, flatten, parseColor, themeRoot, withAccent, type RGBA,
} from "../../foundations/_assert";

/* Test-only behavior for ToggleButton — kept OUT of the docs stories (System/ToggleButton) so viewing a
   docs page doesn't drive the toggle (the play clicks it → a data-state flip / fill flash on view).
   Underscore-prefixed file → registry-guard-exempt, grouped under _internal. */

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
function tokenHex(el: Element, name: string): string {
  const probe = document.createElement("span");
  el.appendChild(probe);
  probe.style.color = `var(${name})`;
  const hex = toHex(getComputedStyle(probe).color);
  probe.remove();
  return hex;
}

const meta: Meta<typeof ToggleButton> = {
  title: "_internal/ToggleButton behavior",
  component: ToggleButton,
  parameters: { controls: { disable: true } },
};
export default meta;
type Story = StoryObj<typeof ToggleButton>;

/** [[toggle-button]] pressed paint + the [[select-selected-row]] non-colour cue + the width-reservation proof, plus the disabled guard.
 *  A long label ("Strikethrough") makes the 500→600 weight a several-px width delta, so a passing
 *  offsetWidth-equality assertion can only hold because the bold width is reserved. */
export const Pressed: Story = {
  render: () => (
    <Flex gap="4" p="4" align="center">
      <ToggleButton data-testid="tb">Strikethrough</ToggleButton>
      <ToggleButton data-testid="tb-disabled" defaultPressed disabled>Strikethrough</ToggleButton>
    </Flex>
  ),
  play: async ({ canvasElement }) => {
    // Wait for the web font to load before measuring: a fallback font has wider metrics than Inter, so a
    // width read taken mid-swap would compare a fallback-rendered rest state against an Inter-rendered
    // pressed state — a false reflow. With the font settled, both states render in the same metrics.
    await document.fonts.ready;
    const btn = canvasElement.querySelector<HTMLButtonElement>('[data-testid="tb"]');
    if (!btn) throw new Error("behavior story must render the enabled ToggleButton");
    const visible = btn.querySelector<HTMLElement>("[data-ds-toggle-label]");
    if (!visible) throw new Error("ToggleButton must render a visible label span");
    const selectedHex = tokenHex(btn, "--ds-fill-selected-subtle");

    // ---- rest (off) ----
    if (btn.getAttribute("data-state") !== "off")
      throw new Error(`toggle must start off; got data-state=${btn.getAttribute("data-state")}`);
    if (btn.getAttribute("aria-pressed") !== "false")
      throw new Error(`an off toggle must be aria-pressed="false"; got ${btn.getAttribute("aria-pressed")}`);
    const wOff = btn.offsetWidth;
    const weightOff = Number(getComputedStyle(visible).fontWeight);
    // An unpressed toggle must NOT paint the selected fill.
    if (toHex(getComputedStyle(btn).backgroundColor) === selectedHex)
      throw new Error("an unpressed ToggleButton must not paint --ds-fill-selected-subtle");

    // ---- press it ----
    btn.click();
    await sleep(0);
    if (btn.getAttribute("data-state") !== "on")
      throw new Error("clicking the toggle must flip data-state to 'on'");
    if (btn.getAttribute("aria-pressed") !== "true")
      throw new Error("a pressed toggle must be aria-pressed='true'");
    const wOn = btn.offsetWidth;
    const weightOn = Number(getComputedStyle(visible).fontWeight);

    // (1) pressed bg resolves --ds-fill-selected-subtle (accent-aware, by hex).
    const gotBg = toHex(getComputedStyle(btn).backgroundColor);
    if (gotBg !== selectedHex)
      throw new Error(`pressed ToggleButton must resolve --ds-fill-selected-subtle; got ${gotBg} vs ${selectedHex}`);

    // (2) the label bolds to 600 on press (the [[select-selected-row]] non-colour cue) — and was lighter at rest.
    if (weightOn !== 600)
      throw new Error(`a pressed label must be font-weight 600; got ${weightOn}`);
    if (!(weightOff < 600))
      throw new Error(`an unpressed label must be lighter than 600; got ${weightOff}`);

    // (3) width-reservation: the 500→600 weight flip must NOT change offsetWidth.
    if (wOn !== wOff)
      throw new Error(`ToggleButton width must not change on press (bold width reserved); off=${wOff}px on=${wOn}px`);

    // (4) disabled + pressed keeps Radix's dimmed treatment — the selected fill is gated off.
    const disabled = canvasElement.querySelector<HTMLButtonElement>('[data-testid="tb-disabled"]');
    if (!disabled) throw new Error("behavior story must render the disabled ToggleButton");
    if (disabled.getAttribute("data-state") !== "on")
      throw new Error("the disabled specimen is defaultPressed — it should carry data-state='on'");
    if (!disabled.hasAttribute("data-disabled"))
      throw new Error("a disabled ToggleButton must carry Radix's [data-disabled] marker");
    if (toHex(getComputedStyle(disabled).backgroundColor) === selectedHex)
      throw new Error("a disabled+pressed ToggleButton must NOT paint the selected fill — Radix's disabled state wins");
  },
};

/** THE PRESSED PAIRING IS A PAIRING, AND IT IS SWEPT — the gate the shipped defect walked past.
 *
 *  The D11 rule paints an "on" toggle from two accent-derived roles at once: the tint is
 *  `--ds-fill-selected-subtle` (accent-a5) and, until this was fixed, the ink was whatever the ghost
 *  Button had — Radix's `--accent-a11`. Both track the brand, so the brand cannot separate them: swept
 *  over all 27 accents in both appearances, 17 of the 54 combinations sat under WCAG AA's 4.5:1, worst
 *  light/orange at 3.13:1 (#cc4e00 on #fdcf99). Lightening the tint does not help and was measured, not
 *  assumed (a4: still 17 failures, worst 3.47; a3: 10, worst 3.90) — which is why the INK moved, to the
 *  `--ds-text-strong` every other committed-selection surface here already uses.
 *
 *  WHY THIS STORY AND NOT AXE. The suite runs axe on every story, but only in the two APPEARANCE lanes
 *  and only at the default accent (see .storybook/preview.tsx) — accent is not swept and cannot be, at
 *  27 brands x hundreds of stories. So the shipped state was axe-green at 15 of 27 brands and broken at
 *  the other 12, and the one it reported (light/iris, 4.44:1) was among the mildest. This play is where
 *  the other 53 combinations get read.
 *
 *  IT COVERS THE FAMILY, NOT THE INSTANCE. The fixture renders a lone ToggleButton AND a
 *  ToggleButtonGroup member, because the two are the same node under the same rule — a group item is a
 *  ghost Button carrying `data-state="on"` — and the assertion runs over every `[data-state="on"]` in the
 *  canvas. Add a third consumer of D11 and it is covered by rendering it here.
 *
 *  NOTHING HERE AGREES WITH THE CSS BY CONSTRUCTION: 4.5 is a literal, the colours are read off the
 *  rendered node and composited bottom-up to the first opaque ancestor, and no token name appears in the
 *  measurement. Delete the `color` line from the D11 block and this fails on its own evidence.
 *  FALSIFIED that way: `34 of 108 readings are under it, worst light/orange at 3.08:1`. */
export const PressedInkClearsAA: Story = {
  render: () => (
    <Flex gap="4" p="4" align="center">
      <ToggleButton data-testid="tb-ink" defaultPressed>Strikethrough</ToggleButton>
      <ToggleButtonGroup.Root type="single" defaultValue="left" label="Text alignment">
        <ToggleButtonGroup.Item value="left" aria-label="Align left" pressedIcon={<TextAlignLeft weight="bold" />}>
          <TextAlignLeft />
        </ToggleButtonGroup.Item>
        <ToggleButtonGroup.Item value="center" aria-label="Align center" pressedIcon={<TextAlignCenter weight="bold" />}>
          <TextAlignCenter />
        </ToggleButtonGroup.Item>
      </ToggleButtonGroup.Root>
    </Flex>
  ),
  play: async ({ canvasElement }) => {
    const on = [...canvasElement.querySelectorAll<HTMLElement>('.rt-BaseButton[data-state="on"]')];
    // Two consumers of the same rule — a lone toggle and a group member. If the fixture ever renders only
    // one of them the sweep silently narrows, so the count is asserted rather than assumed.
    if (on.length !== 2) {
      throw new Error(`the sweep fixture must render exactly 2 pressed nodes (a ToggleButton and a group member); got ${on.length}`);
    }

    /* The composited background under a node's own text: its own paint first, then up the ancestors
       until something opaque stops the stack. --ds-fill-selected-subtle is an ALPHA tint, so the surface
       underneath is genuinely part of the answer — reading the tint alone would flatter it. */
    const surfaceUnder = (el: Element): RGBA => {
      const layers: RGBA[] = [];
      for (let node: Element | null = el; node; node = node.parentElement) {
        const paint = parseColor(getComputedStyle(node).backgroundColor);
        if (paint.a === 0) continue;
        layers.push(paint);
        if (paint.a === 1) break;
      }
      if (!layers.length || layers[layers.length - 1].a !== 1) {
        throw new Error("no opaque surface behind a pressed toggle — its paint cannot be composited");
      }
      return layers.reduceRight((under, over) => flatten(over, under));
    };

    const root = themeRoot(canvasElement);
    const wasDark = root.classList.contains("dark");
    const failures: string[] = [];
    let worst = { at: "", ratio: Infinity };
    try {
      for (const mode of ["light", "dark"] as const) {
        // Both classes move together: Radix's Theme sets exactly one of .light / .dark, and leaving the
        // old one behind would measure a root claiming both appearances at once.
        root.classList.toggle("dark", mode === "dark");
        root.classList.toggle("light", mode === "light");
        for (const accent of ALL_ACCENTS) {
          const restore = withAccent(root, accent);
          try {
            for (const el of on) {
              const bg = surfaceUnder(el);
              const ratio = contrastRatio(parseColor(getComputedStyle(el).color), bg);
              if (ratio < worst.ratio) worst = { at: `${mode}/${accent}`, ratio };
              if (ratio < 4.5) failures.push(`${mode}/${accent}: ${ratio.toFixed(2)}:1`);
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
    if (failures.length) {
      throw new Error(
        `a pressed toggle's label must clear 4.5:1 against its own composited fill, at every accent in ` +
          `both appearances — ${failures.length} of ${ALL_ACCENTS.length * 2 * on.length} readings are under ` +
          `it, worst ${worst.at} at ${worst.ratio.toFixed(2)}:1:\n  ${failures.slice(0, 8).join("\n  ")}`,
      );
    }
    console.info(`[ToggleButton] pressed ink clears AA on all ${ALL_ACCENTS.length * 2} accent x appearance combinations; worst ${worst.at} at ${worst.ratio.toFixed(2)}:1`);
  },
};

/** `pressedIcon` must actually SWAP THE GLYPH. Everything the suite above asserts — data-state, aria,
 *  the selected fill, the label weight, the reserved width — passes just as green when off and on draw
 *  the SAME mark, which is precisely how a docs specimen shipped a `pressedIcon`-less "Bold" pair whose
 *  glyph never changed. So this reads the rendered `<path d>` in each state and requires them to differ:
 *  drop the `pressedIcon` prop below and the story fails. */
export const PressedIconSwapsGlyph: Story = {
  render: () => (
    <Flex gap="4" p="4" align="center">
      <ToggleButton data-testid="tb-icon" pressedIcon={<><TextB weight="bold" /> Bold</>}>
        <TextB /> Bold
      </ToggleButton>
    </Flex>
  ),
  play: async ({ canvasElement }) => {
    const btn = canvasElement.querySelector<HTMLButtonElement>('[data-testid="tb-icon"]');
    if (!btn) throw new Error("behavior story must render the pressedIcon ToggleButton");
    // The VISIBLE label only — the hidden width-reservation twin renders the same content.
    const glyph = () => {
      const paths = Array.from(btn.querySelectorAll<SVGPathElement>("[data-ds-toggle-label] svg path"));
      if (paths.length === 0) throw new Error("the toggle's visible label must render an <svg> glyph to compare");
      return paths.map((p) => p.getAttribute("d")).join("|");
    };

    if (btn.getAttribute("data-state") !== "off")
      throw new Error(`toggle must start off; got data-state=${btn.getAttribute("data-state")}`);
    const dOff = glyph();

    btn.click();
    await sleep(0);
    if (btn.getAttribute("data-state") !== "on")
      throw new Error("clicking the toggle must flip data-state to 'on'");
    const dOn = glyph();

    if (dOn === dOff)
      throw new Error(
        `pressedIcon must render a DIFFERENT glyph while pressed — both states drew the same path data (${dOff.slice(0, 56)}…)`,
      );
  },
};
