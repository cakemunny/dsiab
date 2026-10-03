import type { Meta, StoryObj } from "@storybook/react-vite";
import type { ComponentType } from "react";
import { Provider } from "../../theme/Provider";
import { Contrast } from "../../theme/Contrast";
import { Button } from "./Button";
import { IconButton } from "./IconButton";
import { Checkbox } from "./Checkbox";
import { Tabs } from "./Tabs";
import { CheckboxGroup } from "./CheckboxGroup";
import { RadioGroup } from "./RadioGroup";
import { Select } from "./Select";
import { TextField } from "./TextField";
import { TextArea } from "./TextArea";
import { Text } from "./Text";
import { Heading } from "./Heading";
import { Badge } from "./Badge";
import { Callout } from "./Callout";
import { Avatar } from "./Avatar";
import { AvatarGroup } from "./AvatarGroup";

// Radix stamps a `rt-r-size-N` class for the resolved `size` step. These tests
// assert on that class — a wrapper that forgot useResolvedSize carries no class
// (or the wrong one) and fails here.

/** All elements carrying a `rt-r-size-*` class inside the story canvas. */
function sizedEls(root: ParentNode): HTMLElement[] {
  return Array.from(root.querySelectorAll<HTMLElement>("[class*='rt-r-size-']"));
}

/** The size step (e.g. "1") off the first element that carries an rt-r-size-* class. */
function firstSizeStep(root: ParentNode): string | undefined {
  const el = root.querySelector<HTMLElement>("[class*='rt-r-size-']");
  if (!el) return undefined;
  const m = el.className.match(/rt-r-size-(\d)/);
  return m?.[1];
}

const meta: Meta = {
  title: "_internal/Size",
  // Bare specimens (a lone Select trigger, etc.) trip axe label/contrast rules
  // that aren't the concern of these structural size tests.
  parameters: { a11y: { test: "off" } },
};
export default meta;
type Story = StoryObj;

/** 1 — default applies: <Button> (no size) under small → rt-r-size-1. */
export const DefaultApplies: Story = {
  render: () => (
    <Provider uiSize="small">
      <Button>Default</Button>
    </Provider>
  ),
  play: async ({ canvasElement }) => {
    const btn = canvasElement.querySelector<HTMLElement>("button.rt-Button");
    if (!btn) throw new Error("Button not rendered");
    if (!btn.classList.contains("rt-r-size-1")) {
      throw new Error(`expected rt-r-size-1, got "${btn.className}"`);
    }
  },
};

/** 2 — override wins: <Button size="3"> under small → rt-r-size-3. */
export const OverrideWins: Story = {
  render: () => (
    <Provider uiSize="small">
      <Button size="3">Override</Button>
    </Provider>
  ),
  play: async ({ canvasElement }) => {
    const btn = canvasElement.querySelector<HTMLElement>("button.rt-Button");
    if (!btn) throw new Error("Button not rendered");
    if (!btn.classList.contains("rt-r-size-3")) {
      throw new Error(`explicit size should win: expected rt-r-size-3, got "${btn.className}"`);
    }
  },
};

/** 3 — tier flip: <Button> under large → rt-r-size-3. */
export const TierFlip: Story = {
  render: () => (
    <Provider uiSize="large">
      <Button>Large tier</Button>
    </Provider>
  ),
  play: async ({ canvasElement }) => {
    const btn = canvasElement.querySelector<HTMLElement>("button.rt-Button");
    if (!btn) throw new Error("Button not rendered");
    if (!btn.classList.contains("rt-r-size-3")) {
      throw new Error(`large control lane is step 3: expected rt-r-size-3, got "${btn.className}"`);
    }
  },
};

/** 4 — text lane (→1, same step as control) and heading lane (→5) under small. */
export const TextAndHeadingLanes: Story = {
  render: () => (
    <Provider uiSize="small">
      <Heading>Heading</Heading>
      <Text>Body copy</Text>
    </Provider>
  ),
  play: async ({ canvasElement }) => {
    const heading = canvasElement.querySelector<HTMLElement>(".rt-Heading");
    const text = canvasElement.querySelector<HTMLElement>(".rt-Text");
    if (!heading) throw new Error("Heading not rendered");
    if (!text) throw new Error("Text not rendered");
    if (!heading.classList.contains("rt-r-size-5")) {
      throw new Error(`heading lane small = step 5: got "${heading.className}"`);
    }
    if (!text.classList.contains("rt-r-size-1")) {
      throw new Error(`text lane small = step 1 (aligned to control): got "${text.className}"`);
    }
  },
};

/** 5 — inherit opt-out: <Text size="inherit"> → NO rt-r-size-* class. */
export const InheritOptOut: Story = {
  render: () => (
    <Provider uiSize="small">
      <Text size="inherit">No size injected</Text>
    </Provider>
  ),
  play: async ({ canvasElement }) => {
    const text = canvasElement.querySelector<HTMLElement>(".rt-Text");
    if (!text) throw new Error("Text not rendered");
    if (/rt-r-size-\d/.test(text.className)) {
      throw new Error(`inherit must inject NO size class, got "${text.className}"`);
    }
  },
};

/** 6 — coverage: every wrapper carries its LANE's step at EVERY tier.
 *
 *  This used to run at `uiSize="small"` alone, which is the one tier that cannot distinguish the two
 *  lanes it covers: control and text both resolve step 1 there, so a wrapper wired to the wrong lane
 *  passed, and so did one that ignored the tier entirely and hard-coded a 1. Three tiers separate
 *  them — and a wrapper that stopped tracking `uiSize` now fails at medium and large while still
 *  looking right at small. Same Provider-per-tier structure as the avatar ramps below. */
type Tier = "small" | "medium" | "large";
const TIERS: Tier[] = ["small", "medium", "large"];

type Lane = "control" | "text" | "heading";

/** The lane policy, WRITTEN OUT rather than imported from `SizeContext`. Same reasoning (and the same
 *  precedent) as `AVATAR_TIER_PX` below: a probe that reads the very table the components read agrees
 *  with it by construction and can never catch a table that moved. Control and text deliberately share
 *  a step at every tier; headings ride their own higher rungs. */
const LANE_STEP: Record<Tier, Record<Lane, string>> = {
  small: { control: "1", text: "1", heading: "5" },
  medium: { control: "2", text: "2", heading: "6" },
  large: { control: "3", text: "3", heading: "7" },
};

interface Spec {
  name: string;
  lane: Lane;
  el: ComponentType;
  /** A ruled per-tier step table for components OFF the lanes (the Tabs clamp) — independent
   *  constants, never imported from the component, so a silent remap goes red here. */
  steps?: Record<Tier, string>;
}
const COVERAGE: Spec[] = [
  { name: "Button", lane: "control", el: () => <Button>x</Button> },
  {
    // The D9/[[floating-surface-wraps]] clamp AS REMAPPED 2026-07-31: vendor tab steps are 32/40px (the control lane's TOP
    // two boxes), so each lands on the tier whose control box it equals — {1, 1, 2}, matching the
    // control row's height at medium and large. Guarded here because nothing else asserts the
    // mapping — a revert to {1, 2, 2} passed every test the day it was checked.
    name: "Tabs",
    lane: "control",
    steps: { small: "1", medium: "1", large: "2" },
    el: () => (
      <Tabs.Root defaultValue="a">
        <Tabs.List aria-label="Coverage tabs">
          <Tabs.Trigger value="a">A</Tabs.Trigger>
        </Tabs.List>
      </Tabs.Root>
    ),
  },
  { name: "IconButton", lane: "control", el: () => <IconButton aria-label="x">i</IconButton> },
  { name: "Checkbox", lane: "control", el: () => <Checkbox /> },
  {
    name: "CheckboxGroup",
    lane: "control",
    el: () => (
      <CheckboxGroup aria-label="g">
        <CheckboxGroup.Item value="a">A</CheckboxGroup.Item>
      </CheckboxGroup>
    ),
  },
  {
    name: "RadioGroup",
    lane: "control",
    el: () => (
      <RadioGroup aria-label="g">
        <RadioGroup.Item value="a">A</RadioGroup.Item>
      </RadioGroup>
    ),
  },
  {
    name: "Select",
    lane: "control",
    el: () => (
      <Select>
        <Select.Trigger placeholder="x" aria-label="x" />
        <Select.Content>
          <Select.Item value="a">A</Select.Item>
        </Select.Content>
      </Select>
    ),
  },
  { name: "TextField", lane: "control", el: () => <TextField aria-label="x" /> },
  { name: "TextArea", lane: "control", el: () => <TextArea aria-label="x" /> },
  { name: "Text", lane: "text", el: () => <Text>x</Text> },
  { name: "Heading", lane: "heading", el: () => <Heading>x</Heading> },
  // Badge tracks the text lane (a text-level display marker).
  { name: "Badge", lane: "text", el: () => <Badge>x</Badge> },
  // Callout tracks the text lane; the .rt-CalloutRoot precedes its Callout.Text child in document
  // order, so firstSizeStep reads the root's own step.
  { name: "Callout", lane: "text", el: () => <Callout>Callout body</Callout> },
];

export const Coverage: Story = {
  render: () => (
    <>
      {TIERS.map((tier) => (
        <Provider key={tier} uiSize={tier}>
          {COVERAGE.map((s) => (
            <div key={s.name} data-cov-tier={tier} data-spec={s.name}>
              <s.el />
            </div>
          ))}
        </Provider>
      ))}
    </>
  ),
  play: async ({ canvasElement }) => {
    const failures: string[] = [];
    for (const tier of TIERS) {
      for (const s of COVERAGE) {
        const expected = s.steps?.[tier] ?? LANE_STEP[tier][s.lane];
        const slot = canvasElement.querySelector(`[data-cov-tier="${tier}"][data-spec="${s.name}"]`);
        if (!slot) {
          failures.push(`${tier} / ${s.name}: slot missing`);
          continue;
        }
        // The size class lives on the wrapper's own root (first sized descendant).
        const els = sizedEls(slot);
        if (els.length === 0) {
          failures.push(`${tier} / ${s.name}: NO rt-r-size-* class (forgot useResolvedSize?)`);
          continue;
        }
        const got = firstSizeStep(slot);
        if (got !== expected) {
          // An entry with its own `steps` table is OFF the lanes by ruling — saying "the control lane at
          // medium is step 1" about the Tabs clamp states something false about the lane and sends a
          // reader to fix the wrong table. Name the ruled mapping instead, and keep the lane sentence for
          // the entries the lane actually governs.
          failures.push(
            s.steps
              ? `${tier} / ${s.name}: ${s.name} clamp at ${tier} is step ${expected} (a ruled per-tier mapping, ` +
                `not the ${s.lane} lane — the lane would ask for ${LANE_STEP[tier][s.lane]}), got ${got}`
              : `${tier} / ${s.name}: ${s.lane} lane at ${tier} is step ${expected}, got ${got}`,
          );
        }
      }
    }
    if (failures.length) throw new Error("Coverage failures:\n" + failures.join("\n"));
  },
};

/** 7 — Contrast inheritance: <Contrast><Button/></Contrast> under medium → step 2. */
export const ContrastInheritsSize: Story = {
  render: () => (
    <Provider uiSize="medium">
      <Contrast>
        <Button>Inverted</Button>
      </Contrast>
    </Provider>
  ),
  play: async ({ canvasElement }) => {
    const btn = canvasElement.querySelector<HTMLElement>("button.rt-Button");
    if (!btn) throw new Error("Button not rendered");
    if (!btn.classList.contains("rt-r-size-2")) {
      throw new Error(`Contrast must not reset uiSize: expected rt-r-size-2, got "${btn.className}"`);
    }
  },
};

/* === Avatar === (line-height ladder — emits rt-ds-avatar-*, NOT rt-r-size-N, so it is guarded HERE
   by measuring the rendered box against the tier, not by the generic Coverage scan above.)
   NOTE: these exact-px expectations assume the default --scaling: 1 — the leading tokens are
   calc(16px * var(--scaling)) etc., so a themed-scaling story would shift them. Use a round-tolerant
   compare (or pin --scaling: 1 on the story root) if this ever runs under a non-default scale. */
const AVATAR_TIER_PX: Record<"small" | "medium" | "large", number> = { small: 16, medium: 20, large: 24 };

export const AvatarSizeTracks: Story = {
  render: () => (
    <>
      {(["small", "medium", "large"] as const).map((tier) => (
        <Provider key={tier} uiSize={tier}>
          <div data-avatar-tier={tier}>
            <Avatar fallback="AL" />
          </div>
        </Provider>
      ))}
    </>
  ),
  play: async ({ canvasElement }) => {
    const failures: string[] = [];
    for (const [tier, px] of Object.entries(AVATAR_TIER_PX)) {
      const el = canvasElement.querySelector(`[data-avatar-tier="${tier}"] .rt-AvatarRoot`) as HTMLElement | null;
      if (!el) { failures.push(`${tier}: avatar not rendered`); continue; }
      const got = Math.round(parseFloat(getComputedStyle(el).width));
      if (got !== px) failures.push(`${tier}: expected box ${px}px, got ${got}px`);
    }
    if (failures.length) throw new Error("Avatar size-tracking failures:\n" + failures.join("\n"));
  },
};

/* The SECOND avatar ramp. An avatar standing beside text rides the ladder above; an avatar carrying an
   IDENTITY — a stack, a header portrait — rides a taller one, because discs overlapped by 40% need a
   face-sized box to read as people. AvatarGroup is the component that takes it, so the guard drives the
   ramp through the component rather than through the policy table.
   The constants are written out HERE on purpose: a probe that imports the same table the component
   reads agrees with it by construction and can never catch a table that moved. Same reasoning, and the
   same --scaling: 1 caveat, as AVATAR_TIER_PX above. */
const AVATAR_PORTRAIT_TIER_PX: Record<"small" | "medium" | "large", number> = { small: 24, medium: 30, large: 40 };

export const AvatarGroupSizeTracks: Story = {
  render: () => (
    <>
      {(["small", "medium", "large"] as const).map((tier) => (
        <Provider key={tier} uiSize={tier}>
          <div data-portrait-tier={tier}>
            <AvatarGroup label="Portrait ramp specimen">
              <Avatar fallback="RK" />
              <Avatar fallback="DM" />
            </AvatarGroup>
          </div>
        </Provider>
      ))}
    </>
  ),
  play: async ({ canvasElement }) => {
    const failures: string[] = [];
    for (const [tier, px] of Object.entries(AVATAR_PORTRAIT_TIER_PX)) {
      const group = canvasElement.querySelector(`[data-portrait-tier="${tier}"] .rt-ds-avatar-group`);
      if (!group) { failures.push(`${tier}: group not rendered`); continue; }
      const discs = Array.from(group.querySelectorAll<HTMLElement>(".rt-AvatarRoot"));
      if (!discs.length) { failures.push(`${tier}: group rendered no discs`); continue; }
      // Every disc, not just the first: the group owns the box, so a ragged stack is the other failure
      // this ramp has to rule out.
      for (const [i, d] of discs.entries()) {
        const got = Math.round(parseFloat(getComputedStyle(d).width));
        if (got !== px) failures.push(`${tier}: disc ${i} expected box ${px}px (portrait ramp), got ${got}px`);
      }
    }
    if (failures.length) throw new Error("AvatarGroup portrait-ramp failures:\n" + failures.join("\n"));
  },
};
