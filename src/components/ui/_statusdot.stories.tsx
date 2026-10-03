import type { Meta, StoryObj } from "@storybook/react-vite";
import { Flex } from "@radix-ui/themes";
import { StatusDot, type StatusDotVariant } from "./StatusDot";

/* Test-only behavior for StatusDot — kept OUT of the docs stories (System/StatusDot). Underscore-prefixed
   file → registry- and story-order-guard-exempt, grouped under _internal. Covers the role/label a11y
   contract, the accent-aware variant paint (distinct + non-transparent), the pulse animation, and the
   reduced-motion override (asserted by scanning the shipped CSS rule, since matchMedia can't be forced). */

const ALL: StatusDotVariant[] = ["success", "warning", "error", "accent", "neutral"];

const meta: Meta<typeof StatusDot> = {
  title: "_internal/StatusDot behavior",
  component: StatusDot,
  parameters: { controls: { disable: true } },
};
export default meta;
type Story = StoryObj<typeof StatusDot>;

/** Role + name: a non-focusable <span role="img"> whose required `label` is its accessible name. */
export const RoleAndLabel: Story = {
  render: () => (
    <Flex gap="3" p="4">
      <StatusDot data-testid="dot" variant="success" label="Online" />
    </Flex>
  ),
  play: async ({ canvasElement }) => {
    const dot = canvasElement.querySelector<HTMLElement>('[data-testid="dot"]')!;
    if (dot.tagName !== "SPAN") throw new Error("StatusDot must render a <span>");
    if (dot.getAttribute("role") !== "img") throw new Error('StatusDot must carry role="img"');
    if (dot.getAttribute("aria-label") !== "Online")
      throw new Error(`the label must become aria-label; got "${dot.getAttribute("aria-label")}"`);
    // Not a tab stop — a status dot is a decorative indicator, named but not focusable.
    if (dot.tabIndex > 0 || dot.getAttribute("tabindex") != null)
      throw new Error("a StatusDot must not be focusable");
    // Fixed 8px box.
    const cs = getComputedStyle(dot);
    if (cs.width !== "8px" || cs.height !== "8px")
      throw new Error(`StatusDot must be a fixed 8×8 box; got ${cs.width}×${cs.height}`);
  },
};

/** Variant paint: every variant resolves to a NON-transparent fill, and the five are mutually distinct. */
export const VariantPaint: Story = {
  render: () => (
    <Flex gap="3" p="4">
      {ALL.map((v) => <StatusDot key={v} data-testid={`v-${v}`} variant={v} label={v} />)}
    </Flex>
  ),
  play: async ({ canvasElement }) => {
    const seen = new Map<string, string>();
    for (const v of ALL) {
      const dot = canvasElement.querySelector<HTMLElement>(`[data-testid="v-${v}"]`)!;
      const bg = getComputedStyle(dot).backgroundColor;
      // Transparent is rgba(0,0,0,0) in every colour space — safe to compare as a string.
      if (bg === "rgba(0, 0, 0, 0)" || bg === "transparent" || bg === "")
        throw new Error(`variant ${v} must paint a non-transparent fill; got "${bg}"`);
      if (dot.getAttribute("data-variant") !== v)
        throw new Error(`variant ${v} must set data-variant="${v}"`);
      for (const [other, otherBg] of seen)
        if (otherBg === bg) throw new Error(`variants ${other} and ${v} must be distinct colours (both "${bg}")`);
      seen.set(v, bg);
    }
  },
};

/** Pulse: isPulsing adds data-pulsing + the ds-statusdot-pulse animation; without it, no animation. */
export const Pulse: Story = {
  render: () => (
    <Flex gap="3" p="4">
      <StatusDot data-testid="pulsing" variant="success" label="Live" isPulsing />
      <StatusDot data-testid="still" variant="success" label="Online" />
    </Flex>
  ),
  play: async ({ canvasElement }) => {
    const pulsing = canvasElement.querySelector<HTMLElement>('[data-testid="pulsing"]')!;
    const still = canvasElement.querySelector<HTMLElement>('[data-testid="still"]')!;

    if (pulsing.getAttribute("data-pulsing") !== "")
      throw new Error("isPulsing must set data-pulsing");
    if (still.getAttribute("data-pulsing") != null)
      throw new Error("a non-pulsing dot must NOT carry data-pulsing");

    const pulseName = getComputedStyle(pulsing).animationName;
    if (!pulseName.includes("ds-statusdot-pulse"))
      throw new Error(`a pulsing dot must run the ds-statusdot-pulse keyframes; got animation-name "${pulseName}"`);
    const stillName = getComputedStyle(still).animationName;
    if (stillName !== "none")
      throw new Error(`a non-pulsing dot must have no animation; got "${stillName}"`);
  },
};

/** Reduced-motion: the shipped CSS silences the pulse under prefers-reduced-motion (scan the rule — a
 *  play can't force the media query, so we prove the override EXISTS rather than emulate it). */
export const ReducedMotionOverride: Story = {
  render: () => (
    <Flex gap="3" p="4">
      <StatusDot variant="success" label="Live" isPulsing />
    </Flex>
  ),
  play: async () => {
    let found = false;
    for (const sheet of Array.from(document.styleSheets)) {
      let rules: CSSRuleList;
      try { rules = sheet.cssRules; } catch { continue; }
      for (const r of Array.from(rules)) {
        if (
          r instanceof CSSMediaRule &&
          /prefers-reduced-motion\s*:\s*reduce/.test(r.conditionText)
        ) {
          for (const inner of Array.from(r.cssRules)) {
            if (
              inner instanceof CSSStyleRule &&
              /\.rt-ds-statusdot\[data-pulsing\]/.test(inner.selectorText) &&
              (inner.style.animationName === "none" || inner.style.animation.includes("none"))
            ) {
              found = true;
            }
          }
        }
      }
    }
    if (!found)
      throw new Error("no @media (prefers-reduced-motion: reduce) rule sets animation: none on .rt-ds-statusdot[data-pulsing]");
  },
};
