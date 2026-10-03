import { type ReactNode } from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { Box, Code, Flex, Grid } from "@radix-ui/themes";
import { DotsThree, PencilSimple, Copy, Archive, Trash } from "@phosphor-icons/react";
import { DropdownMenu } from "./DropdownMenu";
import { useClampedMenuSize } from "./ContextMenu";
import { IconButton } from "./IconButton";
import {
  Caption, Decision, DoDont, DODONT_LABEL, HexThemeKey, MeasuredRow, MeasuredSpec, Mono, NoteRow, Page, PageHeader,
  PropsLead, type PropDef, PropTable, Rule, Section,
  Muted,
} from "./_storyKit";
import { assertMeasuredRows } from "../../foundations/_assert";
import { ComparisonSection, MENU_SURFACES_COMPARISON } from "./_comparisons";

/** The one definition of this component — the standfirst every page of it opens with. */
const DEFINITION = (
  <>
    Actions or navigation from a trigger. The destructive item is isolated below a separator,
    error-toned, with a trash glyph and a verb label.
  </>
);

/* The demo menu — normal actions, then an isolated destructive item (Separator + trash glyph + verb),
   plus a disabled destructive item. `defaultOpen` renders it open so the docs show the danger styling
   and the play can inspect it. */
function DemoMenu({ testid, defaultOpen }: { testid?: string; defaultOpen?: boolean }) {
  return (
    // modal={false} for the docs specimen: keeps the menu open without aria-hiding the surrounding
    // page (a real menu is modal; here it would hide the focusable docs content and trip axe).
    <DropdownMenu.Root defaultOpen={defaultOpen} modal={false}>
      <DropdownMenu.Trigger>
        <IconButton priority="secondary" aria-label="Project actions">
          <DotsThree weight="bold" />
        </IconButton>
      </DropdownMenu.Trigger>
      <DropdownMenu.Content data-testid={testid}>
        <DropdownMenu.Item><PencilSimple /> Edit</DropdownMenu.Item>
        <DropdownMenu.Item><Copy /> Duplicate</DropdownMenu.Item>
        <DropdownMenu.Item><Archive /> Archive</DropdownMenu.Item>
        <DropdownMenu.Separator />
        <DropdownMenu.Item tone="danger"><Trash /> Delete project</DropdownMenu.Item>
        <DropdownMenu.Item tone="danger" disabled><Trash /> Delete workspace</DropdownMenu.Item>
      </DropdownMenu.Content>
    </DropdownMenu.Root>
  );
}

/* MEASURED ([[measured-token-rows]]). Every row below is read off a REAL menu row and checked against the token it claims, so
   it can disagree with the component. Two things make this table the hard case, and both are solved rather
   than skipped:

   PORTALED — a menu panel exists only while it is open, and it mounts outside the story's tree. A
   measurement-only Content is `forceMount`ed with the Root CLOSED (so there is no open transition, no
   focus move, no dismissable behaviour) and `container`-portaled into the MeasuredSpec host, which is
   visibility:hidden — off screen, out of the a11y tree, out of axe, still computing full styles.
   `modal={false}` matters: a modal menu aria-hides the rest of the page the moment it mounts.

   HIGHLIGHTED — the highlight is not a CSS pseudo-state but an attribute Radix stamps on the focused row
   (`data-highlighted`), so the measurement rows carry it directly. That puts the component in the state
   and lets ITS OWN stylesheet paint it; nothing here declares a colour. */
function MenuRowSpec() {
  return (
    <Box style={{ borderRadius: "var(--ds-radius-4)", border: "1px solid var(--ds-stroke-weak)", overflow: "hidden", background: "var(--ds-bg-subtle)" }}>
      <Flex align="center" gap="3" style={{ padding: "20px" }}>
        <Muted>
          The highlighted row — the one under the pointer or the arrow keys — is a <strong>neutral</strong>{" "}
          layer, never a label on a coloured fill: <Mono>--ds-fill-hover</Mono> behind{" "}
          <Mono>--ds-text-strong</Mono>, so the label keeps its full contrast at every accent. Because that
          wash is faint against the panel, the row also carries a 2px inset edge in the system focus ring
          ([[focus-ring]]): the accent <Mono>--ds-stroke-focus</Mono> with <Mono>--ds-stroke-focus-stack</Mono> on top.
          It is the same ring every focused control draws, and it clears the 3:1 a state cue owes in either
          appearance. A danger item is{" "}
          <Mono>--ds-text-error</Mono> text at rest and swaps the neutral wash for a weak{" "}
          <Mono>--ds-fill-error-weak</Mono> tint on highlight — the accent-aware error family, so it tracks
          the brand collision shift — keeping the same edge.
        </Muted>
      </Flex>
      <MeasuredSpec
        render={(host) => (
          <DropdownMenu.Root modal={false}>
            <DropdownMenu.Trigger>
              <button type="button">Menu row measurement</button>
            </DropdownMenu.Trigger>
            <DropdownMenu.Content forceMount container={host} aria-label="Menu row measurement">
              <DropdownMenu.Item data-highlighted="">Highlighted</DropdownMenu.Item>
              <DropdownMenu.Item tone="danger">Danger at rest</DropdownMenu.Item>
              <DropdownMenu.Item tone="danger" data-highlighted="">Danger highlighted</DropdownMenu.Item>
            </DropdownMenu.Content>
          </DropdownMenu.Root>
        )}
      >
        <MeasuredRow
          part="Highlighted row · fill"
          note="The neutral wash under the row the pointer or the arrow keys is on."
          token="--ds-fill-hover"
          select=".rt-BaseMenuItem[data-highlighted]:not([data-tone])"
          prop="background-color"
        />
        <MeasuredRow
          part="Highlighted row · label"
          token="--ds-text-strong"
          select=".rt-BaseMenuItem[data-highlighted]:not([data-tone])"
          prop="color"
        />
        <MeasuredRow
          part="Highlighted row · edge"
          note="A 2px inset outline in the stacked accent ring ([[focus-ring]]). The row's own outline is the geometry, so this reads the accent base layer on ::before. It is what makes the faint wash unmistakable as a state."
          token="--ds-stroke-focus"
          select=".rt-BaseMenuItem[data-highlighted]:not([data-tone])"
          prop="outline-color"
          pseudo="::before"
        />
        <MeasuredRow
          part="Danger item text"
          note="Text-first at rest: the destructive row is coloured before it is ever highlighted."
          token="--ds-text-error"
          select='.rt-BaseMenuItem[data-tone="danger"]:not([data-highlighted])'
          prop="color"
        />
        <MeasuredRow
          part="Danger item highlight"
          token="--ds-fill-error-weak"
          select='.rt-BaseMenuItem[data-tone="danger"][data-highlighted]'
          prop="background-color"
        />
      </MeasuredSpec>
      <NoteRow part="Item skin" value="Radix .rt-BaseMenuItem (reused); opaque solid Content surface" />
    </Box>
  );
}

const PROPS: PropDef[] = [
  { name: "Item — tone", type: `"danger"`, desc: <>Destructive intent → <Code>data-tone</Code>. Re-paints from the accent-aware error family. Never Radix's <Code>color</Code> (it bypasses collision avoidance).</>, source: "DropdownMenu.tsx" },
  { name: "Content — size", type: `"1" | "2"`, def: "menu lane (1 at small)", desc: <>Radix Content size. Unset, it follows the global <Code>uiSize</Code> on the <strong>clamped two-step menu lane</strong> — Radix's menu surfaces accept only these two steps, so <Code>large</Code> resolves to <Code>2</Code>. Variant is locked to <Code>solid</Code> (opaque).</>, source: "DropdownMenu.tsx" },
  { name: "Root / Trigger / Separator / Sub…", type: "compound parts", desc: <>Pass through to Radix (Label, Group, CheckboxItem, RadioItem, Sub*).</>, source: "Radix" },
];

const meta: Meta<typeof DropdownMenu.Root> = {
  title: "Components/Action/DropdownMenu",
  component: DropdownMenu.Root,
  parameters: {
    controls: { disable: true },
    docs: {
      description: {
        component:
          "**DropdownMenu** wraps Radix's compound DropdownMenu with an opaque `solid` Content on the " +
          "clamped two-step menu lane. Its System addition is `Item tone=\"danger\"`: a destructive item " +
          "paints from the accent-aware error family — error text at rest, a weak error tint on highlight " +
          "— and is isolated with a Separator + a leading glyph + a verb label (colour is never the only cue).",
      },
    },
  },
};
export default meta;
type Story = StoryObj<typeof DropdownMenu.Root>;

export const Usage: Story = {
  parameters: { a11y: { context: { exclude: [DODONT_LABEL] } } },
  render: (_args, { globals }) => (
    <HexThemeKey.Provider value={`${globals.accent}-${globals.appearance}-${globals.contrast}`}>
      <Page>
        <PageHeader title="DropdownMenu · Usage" standfirst={DEFINITION} />
        <Section title="Specimen" lead="An open menu — normal actions, then an isolated danger item (and a disabled one).">
          <Box style={{ minHeight: 260, position: "relative" }}>
            <DemoMenu testid="dm-demo" defaultOpen />
          </Box>
        </Section>
        <Rule />
        <ComparisonSection comparison={MENU_SURFACES_COMPARISON} highlight="DropdownMenu" />
        <Rule />
        <Section title="Isolating a destructive item" lead="A destructive item is isolated and self-describing — never colour alone.">
          <Grid columns={{ initial: "1", sm: "2" }} gap="3">
            <DoDont kind="do" bare note="Set apart below a separator, with a trash glyph and a verb+object label — the destructive action is isolated in a real menu and readable without relying on colour (WCAG 1.4.1).">
              <MenuMock
                items={[
                  { label: "Edit", icon: <PencilSimple /> },
                  { label: "Duplicate", icon: <Copy /> },
                  { label: "Delete project", icon: <Trash />, danger: true, sep: true },
                ]}
              />
            </DoDont>
            <DoDont kind="dont" bare note="Flush among the edits with no separator and no glyph, leaning on red text alone — easy to hit by mistake and invisible to colour-blind users.">
              <MenuMock
                items={[
                  { label: "Edit", icon: <PencilSimple /> },
                  { label: "Delete project", danger: true },
                  { label: "Duplicate", icon: <Copy /> },
                ]}
              />
            </DoDont>
          </Grid>
          <Caption>
            An overflow <Mono>⋯</Mono> menu is a DropdownMenu opened from an icon-button trigger — reach for{" "}
            <Mono>System/Action/MoreMenu</Mono> for that composition. It carries the required <Mono>aria-label</Mono>{" "}
            on the icon-only trigger, and the rule is the same: the primary action stays visible beside the item,
            never hidden inside the <Mono>⋯</Mono>.
          </Caption>
        </Section>
        <Rule />
        <Section title="Tokens" lead="Measured off a rendered menu, not resolved from the token — each row reads its property off a real menu row and reports whether it equals what the token it names resolves to, so a row can disagree with the component.">
          <MenuRowSpec />
        </Section>
      </Page>
    </HexThemeKey.Provider>
  ),
  // The only play here is PASSIVE: viewing this story must never drive the visible menu (the brief
  // data-highlighted flash). The danger paint + motion behavior lives in _internal/DropdownMenu.
  play: async ({ canvasElement }) => {
    // The token table's EVIDENCE ([[measured-token-rows]]) — the panel is portaled into the measurement host, so this proves
    // each row read a REAL mounted menu row rather than a value the story computed.
    const rows = assertMeasuredRows(canvasElement);
    if (rows.measured !== 5 || rows.unproven !== 0) {
      throw new Error(`expected 5 measured / 0 unproven token rows, got ${rows.measured} / ${rows.unproven}`);
    }
  },
};

type PropsArgs = { size: "auto" | "1" | "2"; danger: boolean; disabled: boolean };

export const Props: StoryObj<PropsArgs> = {
  // "auto" (size unset) is the default so the menu tracks the global uiSize toolbar out of the box.
  args: { size: "auto", danger: true, disabled: false },
  argTypes: {
    size: { control: "inline-radio", options: ["auto", "1", "2"], description: '"auto" tracks the global uiSize toolbar (unset → the clamped two-step menu lane); "1" or "2" pins the Content size.', table: { category: "Variant" } },
    danger: { control: "boolean", description: "Give the last item tone=\"danger\".", table: { category: "Content" } },
    disabled: { control: "boolean", description: "Disable the last item.", table: { category: "State" } },
  },
  parameters: { controls: { disable: false } },
  render: ({ size, danger, disabled }: PropsArgs) => (
    <Page maxWidth="none">
      <PageHeader title="DropdownMenu · Props" standfirst={DEFINITION} />
      <Box style={{ padding: "8px 0 2px", minHeight: 220 }}>
        <DropdownMenu.Root defaultOpen modal={false}>
          <DropdownMenu.Trigger>
            <IconButton priority="secondary" aria-label="Actions"><DotsThree weight="bold" /></IconButton>
          </DropdownMenu.Trigger>
          <DropdownMenu.Content size={size === "auto" ? undefined : size}>
            <DropdownMenu.Item><PencilSimple /> Edit</DropdownMenu.Item>
            <DropdownMenu.Item><Copy /> Duplicate</DropdownMenu.Item>
            <DropdownMenu.Separator />
            <DropdownMenu.Item tone={danger ? "danger" : undefined} disabled={disabled}>
              <Trash /> Delete project
            </DropdownMenu.Item>
          </DropdownMenu.Content>
        </DropdownMenu.Root>
      </Box>
      <PropsLead />
      <Rule />
      <Section title="Props reference" lead={<>Every prop <Code>DropdownMenu</Code> adds or forwards.</>}>
        <PropTable rows={PROPS} />
      </Section>
    </Page>
  ),
};

/* A static FULL-menu mock for the do/don't — painted from the real system menu tokens (bg-overlay,
   shadow, stroke-weak, text-error), so it reads exactly like the live DropdownMenu without two
   floating menus overlapping in the grid. Shows the danger item IN CONTEXT (a menu is never one item). */
type MockItem = { label: string; icon?: ReactNode; danger?: boolean; sep?: boolean };
function MenuMock({ items }: { items: MockItem[] }) {
  // Same step the live panel resolves (the shared two-size menu clamp) — a hardcoded step froze the
  // mock while the real menu beside it moved with uiSize.
  const menuSize = useClampedMenuSize(undefined);
  return (
    <Box style={{ background: "var(--ds-bg-overlay)", borderRadius: "var(--ds-radius-3)", boxShadow: "var(--ds-shadow-overlay)", padding: "var(--space-1)", width: 200 }}>
      {items.map((it, i) => (
        <div key={i}>
          {it.sep && <Box style={{ height: 1, background: "var(--ds-stroke-weak)", margin: "var(--space-1) var(--space-2)" }} />}
          <Flex align="center" gap="2" style={{ padding: "var(--space-1) var(--space-2)", borderRadius: "var(--ds-radius-2)", color: it.danger ? "var(--ds-text-error)" : "var(--ds-text-strong)", fontSize: `var(--font-size-${menuSize})`, whiteSpace: "nowrap" }}>
            {it.icon}
            <span>{it.label}</span>
          </Flex>
        </div>
      ))}
    </Box>
  );
}

export const History: Story = {
  render: () => (
    <Page>
      <PageHeader title="DropdownMenu · History" standfirst={DEFINITION} />
      <Section title="Decisions" lead="The rulings this component encodes.">
        <Flex direction="column" gap="3">
          <Decision id="[[catalog-as-specification]] · Wrapped Radix component">A wrapped Radix Themes component — built on the Radix menu substrate + our <Code>--ds-*</Code> layer.</Decision>
          <Decision id="[[destructive-tone]] · Danger menu item">Menu items adopt the <Code>tone="danger"</Code> axis (the extension from buttons to menus): error text at rest, a weak <Code>--ds-fill-error-weak</Code> tint on highlight, gated on <Code>:not([data-disabled])</Code>. Isolate with a Separator + glyph + verb label — colour is never the only cue (WCAG 1.4.1). Never Radix's <Code>color</Code> prop (it bypasses the collision layer).</Decision>
          <Decision id="[[floating-surface-fill]] · Opaque solid panel">Content is locked to the opaque <Code>solid</Code> variant.</Decision>
          <Decision id="Neutral highlighted row">The row under the pointer or the arrow keys is a neutral layer — <Code>--ds-fill-hover</Code> behind <Code>--ds-text-strong</Code>, plus a 2px inset edge in the system focus ring ([[focus-ring]]), the accent <Code>--ds-stroke-focus</Code> with <Code>--ds-stroke-focus-stack</Code> stacked on it — not a label on a coloured fill. A 12–14px label on a mid-tone fill cannot reach the 4.5:1 minimum that text of that size owes, and the fill step it would sit on carries no text-contrast commitment in the first place; the neutral layer holds the label at roughly 11–13:1 at every accent, while the edge keeps the state itself past the 3:1 a non-text cue owes. Same treatment as the Select menu's active row — one active-row vocabulary across the floating surfaces.</Decision>
          <Decision id="Two-step size lane">Radix's menu surfaces accept only sizes <Code>1</Code> and <Code>2</Code>, so a menu cannot ride the full three-step control lane. Handing it an out-of-range <Code>3</Code> does not fail loudly — Radix quietly substitutes its own default, and the size you asked for goes unnoticed. Every System menu surface therefore shares one clamp: <Code>small → 1</Code>, <Code>medium → 2</Code>, <Code>large → 2</Code>. An explicit <Code>size</Code> still wins.</Decision>
        </Flex>
      </Section>
      <Rule />
      <Section title="Changelog" lead="Newest first.">
        <Flex direction="column" gap="3">
          <Decision id="0.9.0">The highlighted row's edge moves to the system focus ring ([[focus-ring]]): the accent with a stacked Radix alpha, 2px, inset. CSS-only.</Decision>
          <Decision id="0.9.0">Highlighted row moved off the coloured fill onto the neutral layer + hairline edge; the danger item keeps its own error tint on top of that edge. CSS-only.</Decision>
          <Decision id="0.9.0">Initial <Code>System/DropdownMenu</Code> — the danger-menu-item extension; lite spine.</Decision>
        </Flex>
      </Section>
    </Page>
  ),
};
