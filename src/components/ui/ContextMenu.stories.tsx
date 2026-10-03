import { type ReactNode } from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { Box, Code, Flex, Grid, Text } from "@radix-ui/themes";
import { File, PencilSimple, Copy, Trash, DotsThree } from "@phosphor-icons/react";
import { ContextMenu, useClampedMenuSize } from "./ContextMenu";
import { IconButton } from "./IconButton";
import { Text as UIText } from "./Text";
import { useResolvedSize } from "../../theme/SizeContext";
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
    Actions on a right-clicked target. The same command menu as DropdownMenu, opened by right-click (or{" "}
    <Code variant="soft">Shift+F10</Code>); the destructive item is isolated below a separator,
    error-toned, with a trash glyph and a verb label.
  </>
);

/* The right-click target — a realistic file card. Right-clicking it opens the command menu (Rename,
   Duplicate, then an isolated danger Delete). No `defaultOpen` exists on a ContextMenu — it is opened
   by the pointer/keyboard — so the docs render the target live and illustrate the menu it opens with a
   static, token-painted mock beside it (the danger paint + open motion are exercised in _internal). */
function TargetCard() {
  return (
    <ContextMenu.Root>
      <ContextMenu.Trigger>
        <Box
          style={{
            display: "flex", alignItems: "center", gap: "var(--space-3)", width: 260,
            padding: "var(--space-3) var(--space-4)", cursor: "context-menu",
            background: "var(--ds-bg-subtle)", border: "1px solid var(--ds-stroke-weak)",
            borderRadius: "var(--ds-radius-4)",
          }}
        >
          <File size={22} weight="duotone" color="var(--ds-text-weak)" />
          <Flex direction="column" style={{ minWidth: 0 }}>
            <UIText weight="medium" style={{ color: "var(--ds-text-strong)" }}>Orbit brief.pdf</UIText>
            <Text size="1" style={{ color: "var(--ds-text-weak)" }}>Right-click me — 84 KB</Text>
          </Flex>
        </Box>
      </ContextMenu.Trigger>
      <ContextMenu.Content>
        <ContextMenu.Item><PencilSimple /> Rename</ContextMenu.Item>
        <ContextMenu.Item><Copy /> Duplicate</ContextMenu.Item>
        <ContextMenu.Separator />
        <ContextMenu.Item tone="danger"><Trash /> Delete file</ContextMenu.Item>
      </ContextMenu.Content>
    </ContextMenu.Root>
  );
}

/* MEASURED ([[measured-token-rows]]). Every row is read off a REAL menu row and checked against the token it claims, so it can
   disagree with the component. Two hard cases, both solved rather than skipped:

   PORTALED — a ContextMenu has no `defaultOpen`; the panel exists only after a right-click, and mounts
   outside the story's tree. A measurement-only Content is `forceMount`ed with the Root closed and
   `container`-portaled into the MeasuredSpec host, which is visibility:hidden — off screen, out of the
   a11y tree, out of axe, still computing full styles. `modal={false}` matters: a modal menu aria-hides
   the rest of the page the moment it mounts.

   HIGHLIGHTED — the highlight is an attribute Radix stamps on the focused row (`data-highlighted`), not a
   CSS pseudo-state, so the measurement rows carry it directly: the component goes into the state and ITS
   OWN stylesheet paints it. Nothing here declares a colour. */
function MenuRowSpec() {
  return (
    <Box style={{ borderRadius: "var(--ds-radius-4)", border: "1px solid var(--ds-stroke-weak)", overflow: "hidden", background: "var(--ds-bg-subtle)" }}>
      <Flex align="center" gap="3" style={{ padding: "20px" }}>
        <Muted>
          The highlighted row is a <strong>neutral</strong> layer — <Mono>--ds-fill-hover</Mono> behind{" "}
          <Mono>--ds-text-strong</Mono>, plus a 2px inset edge in the system focus ring ([[focus-ring]]): the accent{" "}
          <Mono>--ds-stroke-focus</Mono> with <Mono>--ds-stroke-focus-stack</Mono> on top — never
          a label on a coloured fill, so the label holds its contrast at every accent while the edge keeps the
          state itself clear of the 3:1 a non-text cue owes. A danger item is <Mono>--ds-text-error</Mono>{" "}
          text at rest, swapping the neutral wash for a weak <Mono>--ds-fill-error-weak</Mono> tint on
          highlight — the accent-aware error family, so it tracks the brand collision shift — and keeping the
          same edge. The item skin is otherwise Radix's own menu row, shared with DropdownMenu
          (<Mono>.rt-BaseMenuItem</Mono>) — both rules reach a ContextMenu item with no added CSS.
        </Muted>
      </Flex>
      <MeasuredSpec
        render={(host) => (
          <ContextMenu.Root modal={false}>
            <ContextMenu.Trigger>
              <span>Menu row measurement</span>
            </ContextMenu.Trigger>
            <ContextMenu.Content forceMount container={host} aria-label="Menu row measurement">
              <ContextMenu.Item data-highlighted="">Highlighted</ContextMenu.Item>
              <ContextMenu.Item tone="danger">Danger at rest</ContextMenu.Item>
              <ContextMenu.Item tone="danger" data-highlighted="">Danger highlighted</ContextMenu.Item>
            </ContextMenu.Content>
          </ContextMenu.Root>
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
        <MeasuredRow
          part="Panel surface"
          note="The opaque card the rows sit on — Radix's own panel skin, shared with DropdownMenu and Popover."
          token="--color-panel-solid"
          select=".rt-ContextMenuContent"
          prop="background-color"
        />
      </MeasuredSpec>
      <NoteRow part="Item skin" value="Reused Radix menu row, shared with DropdownMenu" radix=".rt-BaseMenuItem" />
      <NoteRow part="Panel elevation" value="The shared overlay elevation — the same lift a DropdownMenu and a Popover ride" radix="--ds-shadow-overlay" />
    </Box>
  );
}

const PROPS: PropDef[] = [
  { name: "Item — tone", type: `"danger"`, desc: <>Destructive intent → <Code>data-tone</Code>. Re-paints from the accent-aware error family, reusing the shared menu-item skin. Never Radix's <Code>color</Code> (it bypasses collision avoidance).</>, source: "ContextMenu.tsx" },
  { name: "Content — size", type: `"1" | "2"`, desc: <>Radix Content size — a menu panel has exactly two steps. Unset, it follows the global <Code>uiSize</Code>, <strong>clamped</strong> to those two: small → <Code>1</Code>, medium and large → <Code>2</Code>. Variant is locked to <Code>solid</Code> (opaque).</>, source: "ContextMenu.tsx" },
  { name: "Root / Trigger / Separator / Sub…", type: "compound parts", desc: <>Pass through to Radix. The Trigger wraps the target that responds to right-click (Label, Group, CheckboxItem, RadioItem, Sub*).</>, source: "Radix" },
];

const meta: Meta<typeof ContextMenu.Root> = {
  title: "Components/Action/ContextMenu",
  component: ContextMenu.Root,
  parameters: {
    controls: { disable: true },
    docs: {
      description: {
        component:
          "**ContextMenu** wraps Radix's compound ContextMenu — the same command menu as DropdownMenu, but " +
          "opened by right-clicking (or Shift+F10) the wrapped target instead of a visible trigger. Content " +
          "is an opaque `solid` panel on a two-step size lane (the global `uiSize`, clamped: small → 1, " +
          "medium and large → 2). Its System addition is `Item tone=\"danger\"`: " +
          "a destructive item paints from the accent-aware error family — error text at rest, a weak " +
          "error tint on highlight — reusing the shared `.rt-BaseMenuItem` skin, and is isolated with a " +
          "Separator + a leading glyph + a verb label (colour is never the only cue).",
      },
    },
  },
};
export default meta;
type Story = StoryObj<typeof ContextMenu.Root>;

export const Usage: Story = {
  parameters: { a11y: { context: { exclude: [DODONT_LABEL] } } },
  render: (_args, { globals }) => (
    <HexThemeKey.Provider value={`${globals.accent}-${globals.appearance}-${globals.contrast}`}>
      <Page>
        <PageHeader title="ContextMenu · Usage" standfirst={DEFINITION} />
        <Section title="Specimen" lead="Right-click the target to open its command menu — normal actions, then an isolated danger item.">
          <Flex gap="6" align="center" wrap="wrap">
            <TargetCard />
            <Box>
              <Caption>The command menu that appears on right-click</Caption>
              <Box mt="2">
                <MenuMock
                  items={[
                    { label: "Rename", icon: <PencilSimple /> },
                    { label: "Duplicate", icon: <Copy /> },
                    { label: "Delete file", icon: <Trash />, danger: true, sep: true },
                  ]}
                />
              </Box>
            </Box>
          </Flex>
        </Section>
        <Rule />
        <ComparisonSection comparison={MENU_SURFACES_COMPARISON} highlight="ContextMenu" />
        <Rule />
        <Section title="A shortcut, never the only way in" lead="A ContextMenu is a shortcut, never the only way in — right-click is easy to miss and invisible to keyboard and touch.">
          <Grid columns={{ initial: "1", sm: "2" }} gap="3">
            <DoDont kind="do" bare note="Right-click is a fast path, but the same actions also sit on a visible ⋯ button (and a toolbar) — reachable by mouse, keyboard, and touch without discovering right-click.">
              <RowMock label="Orbit brief.pdf" trailing />
            </DoDont>
            <DoDont kind="dont" bare note="Right-click is the ONLY way to rename or delete — no visible affordance, so keyboard and touch users (and anyone who doesn't try right-clicking) can't reach the action at all.">
              <RowMock label="Orbit brief.pdf" />
            </DoDont>
          </Grid>
        </Section>
        <Rule />
        <Section title="Tokens" lead="Measured off a rendered menu, not resolved from the token — each row reads its property off a real menu row and reports whether it equals what the token it names resolves to, so a row can disagree with the component.">
          <MenuRowSpec />
        </Section>
      </Page>
    </HexThemeKey.Provider>
  ),
  // The only play here is PASSIVE: viewing this story must never drive the visible menu (the brief
  // data-highlighted flash). The danger paint + open motion + keyboard behavior live in _internal/ContextMenu.
  play: async ({ canvasElement }) => {
    // The token table's EVIDENCE ([[measured-token-rows]]) — the panel is portaled into the measurement host, so this proves
    // each row read a REAL mounted menu row rather than a value the story computed.
    const rows = assertMeasuredRows(canvasElement);
    if (rows.measured !== 6 || rows.unproven !== 0) {
      throw new Error(`expected 6 measured / 0 unproven token rows, got ${rows.measured} / ${rows.unproven}`);
    }
  },
};

type PropsArgs = { size: "auto" | "1" | "2"; danger: boolean; disabled: boolean };

export const Props: StoryObj<PropsArgs> = {
  // "auto" (size unset) is the default so the panel tracks the global uiSize toolbar out of the box.
  args: { size: "auto", danger: true, disabled: false },
  argTypes: {
    size: { control: "inline-radio", options: ["auto", "1", "2"], description: 'Radix Content size — a panel has two steps. "auto" tracks the global uiSize toolbar (unset), clamped to them (small → 1, medium and large → 2); a step pins it.', table: { category: "Variant" } },
    danger: { control: "boolean", description: "Give the last item tone=\"danger\".", table: { category: "Content" } },
    disabled: { control: "boolean", description: "Disable the last item.", table: { category: "State" } },
  },
  parameters: { controls: { disable: false } },
  render: ({ size, danger, disabled }: PropsArgs) => (
    <Page maxWidth="none">
      {/* The one sentence this page adds to the shared definition: this menu has no visible trigger,
          so the reader is told how to open it before the specimen. */}
      <PageHeader
        title="ContextMenu · Props"
        standfirst={<>{DEFINITION} Right-click the card below to open the menu.</>}
      />
      <Box style={{ padding: "8px 0 2px", minHeight: 120 }}>
        <ContextMenu.Root>
          <ContextMenu.Trigger>
            <Box
              style={{
                display: "inline-flex", alignItems: "center", gap: "var(--space-3)",
                padding: "var(--space-3) var(--space-4)", cursor: "context-menu",
                background: "var(--ds-bg-subtle)", border: "1px solid var(--ds-stroke-weak)",
                borderRadius: "var(--ds-radius-4)",
              }}
            >
              <File size={22} weight="duotone" color="var(--ds-text-weak)" />
              <UIText weight="medium" style={{ color: "var(--ds-text-strong)" }}>Right-click this card</UIText>
            </Box>
          </ContextMenu.Trigger>
          <ContextMenu.Content size={size === "auto" ? undefined : size}>
            <ContextMenu.Item><PencilSimple /> Rename</ContextMenu.Item>
            <ContextMenu.Item><Copy /> Duplicate</ContextMenu.Item>
            <ContextMenu.Separator />
            <ContextMenu.Item tone={danger ? "danger" : undefined} disabled={disabled}>
              <Trash /> Delete file
            </ContextMenu.Item>
          </ContextMenu.Content>
        </ContextMenu.Root>
      </Box>
      <PropsLead />
      <Rule />
      <Section title="Props reference" lead={<>Every prop <Code>ContextMenu</Code> adds or forwards.</>}>
        <PropTable rows={PROPS} />
      </Section>
    </Page>
  ),
};

/* A static FULL-menu mock — painted from the real system menu tokens (bg-overlay, shadow, stroke-weak,
   text-error), so it reads exactly like the live ContextMenu without a floating menu sitting open on the
   page. Shows the danger item IN CONTEXT (a menu is never one item). */
type MockItem = { label: string; icon?: ReactNode; danger?: boolean; sep?: boolean };
function MenuMock({ items }: { items: MockItem[] }) {
  // The mock must land on the SAME step the live panel resolves (the two-size menu clamp), or the
  // "reads exactly like the live ContextMenu" claim above stops being true the moment uiSize moves.
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

/* A file-row mock for the do/don't — the right-click TARGET in context. `trailing` adds the visible ⋯
   affordance (the alternate, discoverable path to the same actions).

   The row carries a REAL IconButton, whose box steps with the control lane (24 / 32 / 40 — [[control-box-per-step]]), so a
   row with nothing but fixed padding around it drifted away from its own pair as the tier climbed:
   measured 42 vs 36px at small, 50 vs 38 at medium, 58 vs 42 at large — and the do/don't only reads if
   the two are THE SAME ROW, one of them carrying the ⋯. So the content area takes the step's box as its
   floor, which is what makes both rows land on the control's height. The ladder is spelled in
   --ds-space-24/32/40, the sanctioned mirror [[control-box-per-step]] names for an element that is not a `.rt-BaseButton`
   and therefore cannot read the vendor's own `--base-button-height` (the same mirror the TopNav bar
   uses). Padding stays fixed on purpose: the system's containers (Toolbar, TopNav) step the BOX and
   leave their inset alone. */
const ROW_BOX: Record<"1" | "2" | "3", string> = {
  "1": "var(--ds-space-24)", "2": "var(--ds-space-32)", "3": "var(--ds-space-40)",
};
function RowMock({ label, trailing }: { label: string; trailing?: boolean }) {
  const step = useResolvedSize<"1" | "2" | "3">("control", undefined) ?? "1";
  return (
    <Flex
      align="center" justify="between" gap="3"
      style={{ width: 240, padding: "var(--space-2) var(--space-3)", background: "var(--ds-bg-subtle)", border: "1px solid var(--ds-stroke-weak)", borderRadius: "var(--ds-radius-3)" }}
    >
      <Flex align="center" gap="2" style={{ minWidth: 0, minHeight: ROW_BOX[step] }}>
        <File size={18} weight="duotone" color="var(--ds-text-weak)" />
        <UIText style={{ color: "var(--ds-text-strong)", whiteSpace: "nowrap" }}>{label}</UIText>
      </Flex>
      {trailing && (
        <IconButton priority="tertiary" aria-label="File actions"><DotsThree weight="bold" /></IconButton>
      )}
    </Flex>
  );
}

export const History: Story = {
  render: () => (
    <Page>
      <PageHeader title="ContextMenu · History" standfirst={DEFINITION} />
      <Section title="Decisions" lead="The rulings this component encodes.">
        <Flex direction="column" gap="3">
          <Decision id="[[catalog-as-specification]] · Wrapped Radix component">A wrapped Radix Themes component — built on the Radix menu substrate + our <Code>--ds-*</Code> layer. Same command-menu semantics as DropdownMenu, opened by right-click.</Decision>
          <Decision id="[[destructive-tone]] · Danger menu item">Menu items adopt the <Code>tone="danger"</Code> axis: error text at rest, a weak <Code>--ds-fill-error-weak</Code> tint on highlight, gated on <Code>:not([data-disabled])</Code>. The paint reuses the shared <Code>.rt-BaseMenuItem</Code> skin — the same rule DropdownMenu uses reaches a ContextMenu item with no added CSS. Isolate with a Separator + glyph + verb label — colour is never the only cue (WCAG 1.4.1). Never Radix's <Code>color</Code> prop (it bypasses the collision layer).</Decision>
          <Decision id="[[floating-surface-fill]] · Opaque solid panel">Content is locked to the opaque <Code>solid</Code> variant.</Decision>
          <Decision id="Neutral highlighted row">The row under the pointer or the arrow keys is a neutral layer — <Code>--ds-fill-hover</Code> behind <Code>--ds-text-strong</Code>, plus a 2px inset edge in the system focus ring ([[focus-ring]]), the accent <Code>--ds-stroke-focus</Code> with <Code>--ds-stroke-focus-stack</Code> stacked on it — not a label on a coloured fill. A 12–14px label on a mid-tone fill cannot reach the 4.5:1 minimum that text of that size owes, and the fill step it would sit on carries no text-contrast commitment in the first place; the neutral layer holds the label at roughly 11–13:1 at every accent, while the edge keeps the state itself past the 3:1 a non-text cue owes. Shared verbatim with DropdownMenu and the Select menu's active row — one active-row vocabulary across the floating surfaces.</Decision>
          <Decision id="Two-step size lane">
            A menu panel has exactly <strong>two</strong> size steps, so ContextMenu rides a clamped lane rather
            than the full global one: unset, Content <Code>size</Code> follows the global <Code>uiSize</Code>{" "}
            clamped to those two steps — small → <Code>1</Code>, medium <em>and</em> large → <Code>2</Code>. An
            explicit <Code>size</Code> still wins. The clamp is deliberate and visible: handed a step the panel
            doesn't have, the underlying primitive quietly falls back to its own default, so the menu would
            render at step 2 while the page's buttons and inputs grew — a size lane that looks connected and
            isn't. Tabs rides an identical two-step lane for the same reason.
          </Decision>
          <Decision id="Affordance">Right-click / long-press opens it (Shift+F10 or the menu key by keyboard). A secondary path — its actions must also be reachable another way, since right-click is easy to miss.</Decision>
        </Flex>
      </Section>
      <Rule />
      <Section title="Changelog" lead="Newest first.">
        <Flex direction="column" gap="3">
          <Decision id="0.9.0">The highlighted row's edge moves to the system focus ring ([[focus-ring]]): the accent with a stacked Radix alpha, 2px, inset. Inherited from the shared menu-row rule. CSS-only.</Decision>
          <Decision id="0.9.0">Highlighted row moved off the coloured fill onto the neutral layer + hairline edge, inherited from the shared menu-row rule; the danger item keeps its own error tint on top of that edge. CSS-only.</Decision>
          <Decision id="0.9.0">Initial <Code>System/ContextMenu</Code> — the right-click sibling of DropdownMenu; the danger-menu-item extension reused with no added CSS; lite spine.</Decision>
        </Flex>
      </Section>
    </Page>
  ),
};
