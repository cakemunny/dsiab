import { useContext, useLayoutEffect, useRef, useState } from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { Box, Code, Flex, Grid, Text } from "@radix-ui/themes";
import { Collapsible, CollapsibleGroup } from "./Collapsible";
import {
  Caption, Decision, DoDont, DODONT_LABEL, HexThemeKey, MeasuredRow, MeasuredSpec, Mono, NoteRow, Page, PageHeader,
  PropsLead, type PropDef, PropTable, Rule, Section,
} from "./_storyKit";
import { assertMeasuredRows } from "../../foundations/_assert";

/** The one definition of this component — the standfirst every page of it opens with. */
const DEFINITION = (
  <>
    A disclosure that expands and collapses secondary detail. Default closed; the content height
    animates on the system motion ladder, with a chevron that rotates on open. Several stack into a
    CollapsibleGroup accordion.
  </>
);

/* System/Collapsible — the lite spine (Kbd shape): History → Usage (specimen · live token spec ·
   a do/don't) → Props. Covers BOTH Collapsible (a single disclosure) and CollapsibleGroup (its
   accordion group). All specimens are STATIC — open ones render via defaultOpen/defaultValue; Radix
   prevents the mount animation (animationName:none on first layout), so nothing flashes on view. The
   toggle/arrow-nav/aria/motion behavior lives in _internal/Collapsible behavior. */

// Live-read the motion durations off the rendered DOM (the drift guard) — never a hand-typed ms.
function MotionSpec() {
  const themeKey = useContext(HexThemeKey);
  const ref = useRef<HTMLDivElement>(null);
  const [d, setD] = useState<{ expand: string; collapse: string } | null>(null);
  useLayoutEffect(() => {
    if (!ref.current) return;
    const cs = getComputedStyle(ref.current);
    setD({
      expand: cs.getPropertyValue("--ds-duration-overlay").trim(),
      collapse: cs.getPropertyValue("--ds-duration-emphasis").trim(),
    });
  }, [themeKey]);
  return (
    <Box ref={ref} style={{ borderRadius: "var(--ds-radius-4)", border: "1px solid var(--ds-stroke-weak)", overflow: "hidden", background: "var(--ds-bg-subtle)" }}>
      <Flex align="center" gap="3" style={{ padding: "20px" }}>
        <Text size="1" style={{ color: "var(--ds-text-weak)" }}>
          The header shares its ink with its own body content — <Mono>--ds-text-weak</Mono>, softened via colour
          rather than weight — tints on hover from <Mono>--ds-fill-hover</Mono>, and (in a group) rules between
          items with <Mono>--ds-stroke-weak</Mono>. The content height animates <strong>faster in than out</strong>,
          so a section settles shut instead of snapping away and dropping the page under the cursor. Every colour
          row below is measured off a rendered trigger and checked against the token it names; the two motion rows
          are read live off the DOM, so they track a token change and fall to ~0 under reduced motion.
        </Text>
      </Flex>
      {/* MEASURED ([[measured-token-rows]]). The specimen below is a real CollapsibleGroup with dividers, rendered into the
          measurement host; each row reads its property off it. Two of these values exist only while a
          pseudo-state is active — no script can force :hover, and :focus-visible needs a keyboard — so
          those rows read the declaration the component's OWN stylesheet will paint for that state and
          resolve it on the element, rather than resolving the token the row names. The row still checks
          two independently-sourced expressions, so it can disagree. */}
      <MeasuredSpec
        render={() => (
          <CollapsibleGroup.Root type="single" defaultValue="a" dividers="all">
            <CollapsibleGroup.Item value="a" trigger="Measurement item">
              <Text>body</Text>
            </CollapsibleGroup.Item>
            <CollapsibleGroup.Item value="b" trigger="Second item">
              <Text>body</Text>
            </CollapsibleGroup.Item>
          </CollapsibleGroup.Root>
        )}
      >
        <MeasuredRow
          part="Trigger label"
          note="Softened via colour, not weight — header and body share an ink and are told apart by weight."
          token="--ds-text-weak"
          select=".rt-ds-collapsible-trigger"
          prop="color"
        />
        <MeasuredRow
          part="Trigger hover fill"
          note="Only under a pointer that can hover — the rule sits inside @media (hover: hover)."
          token="--ds-fill-hover"
          select=".rt-ds-collapsible-trigger"
          prop="background-color"
          state="hover"
        />
        <MeasuredRow
          part="Focus ring (inset)"
          note="The accent base, inset so it never overflows the group border. A Radix alpha, --ds-stroke-focus-stack, sits on top of it, 2px wide ([[focus-ring]])."
          token="--ds-stroke-focus"
          select=".rt-ds-collapsible-trigger"
          prop="outline-color"
          state="focus-visible"
        />
        <MeasuredRow
          part="Item divider"
          token="--ds-stroke-weak"
          select=".rt-ds-accordion-item"
          prop="border-top-color"
        />
      </MeasuredSpec>
      {/* Each token is named ONCE per row — the duration in the token column, the ease in the value. */}
      <NoteRow part="Expand motion" value={`${d?.expand || "—"} with --ds-ease-entry (decelerate-in)`} radix="--ds-duration-overlay" />
      <NoteRow part="Collapse motion" value={`${d?.collapse || "—"} with --ds-ease-standard (decelerate-out)`} radix="--ds-duration-emphasis" />
      <NoteRow part="Height" value="animates 0 ↔ the measured content height; reduced-motion clamps the duration to ~0" radix="--radix-collapsible-content-height" />
    </Box>
  );
}

// A bordered card wrapper for a live disclosure specimen (keeps the borderless component visually contained).
function Card({ children }: { children: React.ReactNode }) {
  return (
    <Box style={{ width: 320, background: "var(--ds-bg-base)", border: "1px solid var(--ds-stroke-weak)", borderRadius: "var(--ds-radius-3)", overflow: "hidden" }}>
      {children}
    </Box>
  );
}

const PROPS: PropDef[] = [
  { name: "trigger", type: "ReactNode", desc: <>The always-visible header. A rotating chevron indicator is appended automatically.</>, source: "Collapsible.tsx" },
  { name: "open", type: "boolean", desc: <>Controlled open state — pair with <Code>onOpenChange</Code>.</>, source: "Radix" },
  { name: "defaultOpen", type: "boolean", def: "false", desc: <>Initial open state when uncontrolled. <strong>Default closed</strong> — the platform convention.</>, source: "Radix" },
  { name: "onOpenChange", type: "(open: boolean) => void", desc: <>Fires when the disclosure opens or closes.</>, source: "Radix" },
  { name: "disabled", type: "boolean", desc: <>Disable the disclosure.</>, source: "Radix" },
  { name: "Group · type", type: `"single" | "multiple"`, desc: <><Code>single</Code> → one item open at a time; <Code>multiple</Code> → any number.</>, source: "CollapsibleGroup" },
  { name: "Group · defaultValue", type: "string | string[]", desc: <>Item(s) open on first render when uncontrolled (<Code>string</Code> for single, <Code>string[]</Code> for multiple).</>, source: "Radix" },
  { name: "Group · value / onValueChange", type: "string | string[] / fn", desc: <>Controlled open-item selection + its change handler.</>, source: "Radix" },
  { name: "Group · dividers", type: `"between" | "all" | "none"`, def: "none", desc: <>Borders drawn by our CSS: between items, around all items, or none.</>, source: "CollapsibleGroup" },
  { name: "Group · collapsible", type: "true", locked: true, desc: <>Forced <Code>true</Code> for single mode — a single-mode item is always closable to none.</>, source: "CollapsibleGroup" },
  { name: "Group.Item · value / trigger / disabled", type: "string / ReactNode / boolean", desc: <>Per-item key, header, and disabled flag.</>, source: "CollapsibleGroup" },
];

const meta: Meta<typeof Collapsible> = {
  title: "Components/Container/Collapsible",
  component: Collapsible,
  parameters: {
    controls: { disable: true },
    docs: {
      description: {
        component:
          "**Collapsible** is a single disclosure — an always-visible `trigger` header plus `children` " +
          "content that expands and collapses. **CollapsibleGroup** stacks several into an accordion. " +
          "It's **default closed** (the platform convention), takes a " +
          "`disabled` flag, and inherits proper aria wiring from the primitive " +
          "(`aria-expanded` + `aria-controls`). The content **height animates** on " +
          "the system motion ladder — it opens on the quick overlay tier and takes noticeably longer to " +
          "close, on the emphasis tier, with a chevron rotation. The group rides " +
          "`@radix-ui/react-accordion` with `collapsible` forced true (always closable to none) and " +
          "arrow-key nav between triggers.",
      },
    },
  },
};
export default meta;
type Story = StoryObj<typeof Collapsible>;

export const Usage: Story = {
  // The DO/DON'T word (success/error step-11 ink on its own tint) measures 4.10 at 12px bold, under axe's
  // 4.5; the colour + the word already carry the meaning, so that row is the documented exception. Scoped
  // to the label itself — the cards' specimens stay fully axe-checked, which "[data-dodont]" did not do.
  parameters: { a11y: { context: { exclude: [DODONT_LABEL] } } },
  render: (_args, { globals }) => (
    <HexThemeKey.Provider value={`${globals.accent}-${globals.appearance}-${globals.contrast}`}>
      <Page>
        <PageHeader title="Collapsible · Usage" standfirst={DEFINITION} />
        {/* The motion ladder is SPECIFIED once, in the Tokens card below, where the durations are read
            live off the DOM. Repeating the token names and hand-typed millisecond values here made the
            page state the same ladder four times over, and two of those copies could go stale. */}
        <Section title="Specimen" lead="A single disclosure (shown open via defaultOpen, and closed), and a group with one item open via defaultValue. Every specimen renders in its resting state — nothing animates on load. Click any header to toggle and watch the height animate: it opens faster than it closes.">
          <Flex align="start" gap="5" wrap="wrap">
            <Flex direction="column" gap="1">
              <Caption>Collapsible — open (defaultOpen)</Caption>
              <Card>
                <Collapsible defaultOpen trigger="What's included">
                  <Text style={{ color: "var(--ds-text-weak)" }}>
                    Unlimited projects, 50 GB of storage, and email support. Upgrade any time.
                  </Text>
                </Collapsible>
              </Card>
            </Flex>
            <Flex direction="column" gap="1">
              <Caption>Collapsible — closed (default)</Caption>
              <Card>
                <Collapsible trigger="Advanced settings">
                  <Text style={{ color: "var(--ds-text-weak)" }}>
                    Region, retention window, and export format.
                  </Text>
                </Collapsible>
              </Card>
            </Flex>
            <Flex direction="column" gap="1">
              <Caption>CollapsibleGroup — single, dividers</Caption>
              <Card>
                <CollapsibleGroup.Root type="single" defaultValue="ship" dividers="between">
                  <CollapsibleGroup.Item value="ship" trigger="Shipping">
                    <Text style={{ color: "var(--ds-text-weak)" }}>Ships in 2–3 business days.</Text>
                  </CollapsibleGroup.Item>
                  <CollapsibleGroup.Item value="returns" trigger="Returns">
                    <Text style={{ color: "var(--ds-text-weak)" }}>Free returns within 30 days.</Text>
                  </CollapsibleGroup.Item>
                  <CollapsibleGroup.Item value="warranty" trigger="Warranty">
                    <Text style={{ color: "var(--ds-text-weak)" }}>Two-year limited warranty.</Text>
                  </CollapsibleGroup.Item>
                </CollapsibleGroup.Root>
              </Card>
            </Flex>
          </Flex>
        </Section>
        <Rule />
        <Section title="What may be hidden" lead="A Collapsible is for progressive disclosure — secondary detail a user can reveal on demand. It is not a place to hide primary or critical content, nor a substitute for navigation.">
          <Grid columns={{ initial: "1", sm: "2" }} gap="3">
            <DoDont kind="do" bare note="Progressive disclosure of secondary detail — specs, an FAQ, advanced options. The primary content stays visible; the collapse only defers the extra.">
              <Card>
                <CollapsibleGroup.Root type="single" defaultValue="specs" dividers="between">
                  <CollapsibleGroup.Item value="specs" trigger="Specifications">
                    <Text style={{ color: "var(--ds-text-weak)" }}>Aluminium body, 1.2 kg, USB-C.</Text>
                  </CollapsibleGroup.Item>
                  <CollapsibleGroup.Item value="care" trigger="Care & cleaning">
                    <Text style={{ color: "var(--ds-text-weak)" }}>Wipe with a dry microfibre cloth.</Text>
                  </CollapsibleGroup.Item>
                </CollapsibleGroup.Root>
              </Card>
            </DoDont>
            <DoDont kind="dont" bare note="Don't hide critical or primary content behind a collapse (a user may never open it), and don't use it as a navigation tree — a hierarchical, selectable structure belongs in a TreeList.">
              <Card>
                <Collapsible trigger="Payment failed — action required">
                  <Text style={{ color: "var(--ds-text-weak)" }}>Update your card to avoid interruption.</Text>
                </Collapsible>
              </Card>
            </DoDont>
          </Grid>
        </Section>
        <Rule />
        <Section title="Tokens" lead="Read live from the rendered element — the drift guard.">
          <MotionSpec />
        </Section>
      </Page>
    </HexThemeKey.Provider>
  ),
  play: async ({ canvasElement }) => {
    // The token table's EVIDENCE, asserted at runtime ([[measured-token-rows]]). Static analysis can prove a row is a
    // MeasuredRow; only a live DOM can prove it measured a real component node, that the claim was
    // resolved somewhere else, and that the two agree. Four measured rows, none unproven — the
    // :hover and :focus-visible rows are read from the component's own matched rules.
    const rows = assertMeasuredRows(canvasElement);
    if (rows.measured !== 4 || rows.unproven !== 0) {
      throw new Error(`expected 4 measured / 0 unproven token rows, got ${rows.measured} / ${rows.unproven}`);
    }

    // Passive render assertion only — the defaultOpen/defaultValue specimens already show the open state
    // statically (Radix prevents the mount animation); this reads it, it does NOT drive the disclosure.
    // The toggle, arrow-nav, aria wiring, and motion-token behavior are exercised in
    // _internal/Collapsible behavior.
    const open = canvasElement.querySelector<HTMLElement>('.rt-ds-collapsible-content[data-state="open"]');
    if (!open) throw new Error("Usage must render an open Collapsible (defaultOpen)");
    const trigger = canvasElement.querySelector<HTMLElement>('.rt-ds-collapsible-trigger[data-state="open"]');
    if (!trigger) throw new Error("the open disclosure's trigger must carry data-state='open'");
    if (trigger.getAttribute("aria-expanded") !== "true")
      throw new Error("the open trigger must be aria-expanded='true'");
  },
};

type PropsArgs = {
  kind: "single" | "group";
  trigger: string;
  defaultOpen: boolean;
  disabled: boolean;
  type: "single" | "multiple";
  openItem: "a" | "b" | "(none)";
  dividers: "between" | "all" | "none";
};

export const Props: StoryObj<PropsArgs> = {
  args: { kind: "single", trigger: "Advanced settings", defaultOpen: true, disabled: false, type: "single", openItem: "a", dividers: "between" },
  argTypes: {
    kind: { control: "inline-radio", options: ["single", "group"], description: "A single Collapsible or a CollapsibleGroup accordion.", table: { category: "Shape" } },
    trigger: { control: "text", description: "The header text (single Collapsible).", table: { category: "Content" } },
    defaultOpen: { control: "boolean", description: "Initial open state (single). Default closed is the platform convention.", table: { category: "State" } },
    disabled: { control: "boolean", description: "Disable the disclosure (single).", table: { category: "State" } },
    type: { control: "inline-radio", options: ["single", "multiple"], description: "Group: one item open at a time, or any number.", table: { category: "Group" } },
    openItem: { control: "select", options: ["a", "b", "(none)"], description: "Group: which item is open on first render (defaultValue).", table: { category: "Group" } },
    dividers: { control: "inline-radio", options: ["between", "all", "none"], description: "Group: borders between / around items, or none.", table: { category: "Group" } },
  },
  parameters: { controls: { disable: false } },
  render: ({ kind, trigger, defaultOpen, disabled, type, openItem, dividers }: PropsArgs) => {
    const initial = openItem === "(none)" ? undefined : openItem;
    return (
      <Page maxWidth="none">
        {/* The one sentence this page adds to the shared definition: the Props drives the
            UNCONTROLLED mode, so the controlled props are documented rather than demonstrated. */}
        <PageHeader
          title="Collapsible · Props"
          standfirst={<>{DEFINITION} Single demos the uncontrolled (<Code>defaultOpen</Code>/<Code>defaultValue</Code>) mode — the controlled <Code>open</Code>/<Code>value</Code> props are documented in the table.</>}
        />
        <Box style={{ padding: "8px 0 2px", width: "fit-content" }}>
          <Box style={{ width: 340, background: "var(--ds-bg-base)", border: "1px solid var(--ds-stroke-weak)", borderRadius: "var(--ds-radius-3)", overflow: "hidden" }}>
            {kind === "single" ? (
              <Collapsible key={`${defaultOpen}`} trigger={trigger} defaultOpen={defaultOpen} disabled={disabled}>
                <Text style={{ color: "var(--ds-text-weak)" }}>
                  Region, retention window, and export format. This body reveals with the height animation on open.
                </Text>
              </Collapsible>
            ) : type === "single" ? (
              <CollapsibleGroup.Root key={`s-${initial}-${dividers}`} type="single" defaultValue={initial} dividers={dividers}>
                <CollapsibleGroup.Item value="a" trigger="First section">
                  <Text style={{ color: "var(--ds-text-weak)" }}>Content of the first section.</Text>
                </CollapsibleGroup.Item>
                <CollapsibleGroup.Item value="b" trigger="Second section">
                  <Text style={{ color: "var(--ds-text-weak)" }}>Content of the second section.</Text>
                </CollapsibleGroup.Item>
              </CollapsibleGroup.Root>
            ) : (
              <CollapsibleGroup.Root key={`m-${initial}-${dividers}`} type="multiple" defaultValue={initial ? [initial] : []} dividers={dividers}>
                <CollapsibleGroup.Item value="a" trigger="First section">
                  <Text style={{ color: "var(--ds-text-weak)" }}>Content of the first section.</Text>
                </CollapsibleGroup.Item>
                <CollapsibleGroup.Item value="b" trigger="Second section">
                  <Text style={{ color: "var(--ds-text-weak)" }}>Content of the second section.</Text>
                </CollapsibleGroup.Item>
              </CollapsibleGroup.Root>
            )}
          </Box>
        </Box>
        <PropsLead />
        <Rule />
        <Section title="Props reference" lead={<>Everything <Code>Collapsible</Code> and <Code>CollapsibleGroup</Code> add or forward.</>}>
          <PropTable rows={PROPS} />
        </Section>
      </Page>
    );
  },
};

export const History: Story = {
  render: () => (
    <Page>
      <PageHeader title="Collapsible · History" standfirst={DEFINITION} />
      <Section title="Decisions" lead="The rulings this component encodes.">
        <Flex direction="column" gap="3">
          <Decision id="[[collapsible-and-accordion]] · defaults">
            <strong>Default closed</strong> (Radix/platform convention). Controlled (<Code>open</Code>/<Code>onOpenChange</Code>) or
            uncontrolled (<Code>defaultOpen</Code>), with a <Code>disabled</Code> flag. The aria
            wiring comes <strong>free from the primitive</strong> — the trigger carries <Code>aria-expanded</Code>{" "}
            and (when open) <Code>aria-controls</Code> pointing at the content id (asserted in the behavior suite).
          </Decision>
          <Decision id="[[collapsible-and-accordion]] · motion">
            A height animation on the motion ladder, <strong>faster in than out</strong>. The content animates{" "}
            <Code>height</Code> between 0 and <Code>--radix-collapsible-content-height</Code>:{" "}
            <strong>expand</strong> on <Code>--ds-duration-overlay</Code> (150ms) + <Code>--ds-ease-entry</Code>,{" "}
            <strong>collapse</strong> on the longer <Code>--ds-duration-emphasis</Code> (260ms) +{" "}
            <Code>--ds-ease-standard</Code>, plus a chevron rotation. A disclosure is ambient rather than
            direct manipulation, so it settles shut on a decelerating curve rather than snapping closed and
            pulling the page up under the cursor. Reduced motion is free — motion.css clamps the duration
            tokens to ~0.
          </Decision>
          <Decision id="[[collapsible-and-accordion]] · group">
            <strong>CollapsibleGroup</strong> rides <Code>@radix-ui/react-accordion</Code> with{" "}
            <Code>collapsible</Code> forced <Code>true</Code> for single mode — so a single-mode item is{" "}
            <strong>always closable to none</strong> (Radix defaults it false). <Code>type</Code> single/multiple +{" "}
            <Code>defaultValue</Code> map 1:1; arrow-key roving nav between triggers is a built-in a11y affordance.
          </Decision>
        </Flex>
      </Section>
      <Rule />
      <Section title="Changelog" lead="Notable changes, newest first — grows as the component evolves.">
        <Flex direction="column" gap="3">
          <Decision id="0.9.0">
            Initial <Code>System/Collapsible</Code> — <Code>@radix-ui/react-collapsible</Code> (default closed,
            disabled, aria wiring) with an animated content height on the motion ladder + chevron
            rotation; <Code>CollapsibleGroup</Code> on <Code>@radix-ui/react-accordion</Code> with{" "}
            <Code>collapsible=true</Code> always + <Code>dividers</Code> CSS and arrow-key nav.
          </Decision>
        </Flex>
      </Section>
    </Page>
  ),
};
