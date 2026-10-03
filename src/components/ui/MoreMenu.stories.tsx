import { type ReactNode } from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { Box, Code, Flex, Grid, Text } from "@radix-ui/themes";
import { ArrowSquareOut, DotsThree, DotsThreeVertical, PencilSimple, Copy, Trash } from "@phosphor-icons/react";
import { MoreMenu } from "./MoreMenu";
import { DropdownMenu } from "./DropdownMenu";
import { Button } from "./Button";
import { IconButton } from "./IconButton";
import { Avatar } from "./Avatar";
import {
  Caption, Decision, DoDont, DODONT_LABEL, HexThemeKey, Mono, NoteRow, Page, PageHeader,
  PropsLead, type PropDef, PropTable, Rule, Section,
} from "./_storyKit";

/* MoreMenu owns no --ds-* roles: the trigger is a ghost IconButton and the surface is a solid
   DropdownMenu Content, each reusing its own skin. The Tokens section states that reuse plainly and
   points at the two components' own token specs, rather than inventing a role this composition doesn't have. */

/* A realistic in-context item row: a project card header — leading avatar, name + supporting line, a
   VISIBLE primary action, and the overflow ⋯ at the trailing edge. Used for the Usage specimen (live
   MoreMenu) and, in a static form, for the Usage do/don't. */
function ProjectRow({ trailing }: { trailing: ReactNode }) {
  return (
    <Flex
      align="center"
      gap="3"
      style={{
        background: "var(--ds-bg-subtle)",
        border: "1px solid var(--ds-stroke-weak)",
        borderRadius: "var(--ds-radius-4)",
        padding: "var(--space-3) var(--space-4)",
        maxWidth: 460,
      }}
    >
      {/* No size pins — the row rides the ambient lanes so the page responds to the global size
          toolbar like the controls beside it. Only the meta line keeps the ruled secondary floor. */}
      <Avatar radius="medium" fallback="OR" />
      <Flex direction="column" style={{ minWidth: 0, flex: 1 }}>
        <Text weight="medium" style={{ color: "var(--ds-text-strong)" }}>Orbit</Text>
        <Text size="1" style={{ color: "var(--ds-text-weak)" }}>Updated 2 hours ago</Text>
      </Flex>
      <Flex align="center" gap="1" style={{ flexShrink: 0 }}>{trailing}</Flex>
    </Flex>
  );
}

/* The menu contents, shared by the live specimens — normal actions, then an isolated destructive item
   (Separator + trash glyph + verb label + tone="danger"), per the DropdownMenu contract. */
function itemActions() {
  return (
    <>
      <DropdownMenu.Item><PencilSimple /> Rename</DropdownMenu.Item>
      <DropdownMenu.Item><Copy /> Duplicate</DropdownMenu.Item>
      <DropdownMenu.Separator />
      <DropdownMenu.Item tone="danger"><Trash /> Delete project</DropdownMenu.Item>
    </>
  );
}

/* A static menu representation for the do/don't — painted from the real menu tokens (bg-overlay, shadow,
   stroke-weak, text-error), so it reads exactly like the live surface without a floating portal opening
   inside the grid. */
type MockItem = { label: string; icon?: ReactNode; danger?: boolean; sep?: boolean };
function MenuMock({ items }: { items: MockItem[] }) {
  return (
    <Box style={{ background: "var(--ds-bg-overlay)", borderRadius: "var(--ds-radius-3)", boxShadow: "var(--ds-shadow-overlay)", padding: "var(--space-1)", width: 190 }}>
      {items.map((it, i) => (
        <div key={i}>
          {it.sep && <Box style={{ height: 1, background: "var(--ds-stroke-weak)", margin: "var(--space-1) var(--space-2)" }} />}
          <Flex align="center" gap="2" style={{ padding: "var(--space-1) var(--space-2)", borderRadius: "var(--ds-radius-2)", color: it.danger ? "var(--ds-text-error)" : "var(--ds-text-strong)", fontSize: "var(--font-size-2)", whiteSpace: "nowrap" }}>
            {it.icon}
            <span>{it.label}</span>
          </Flex>
        </div>
      ))}
    </Box>
  );
}

/* A static ⋯ trigger for the do/don't rows (no portal) — the real ghost IconButton, named, so the
   affordance reads identically to the live trigger without opening a menu in the docs grid. */
function StaticDots({ label }: { label: string }) {
  return (
    <IconButton priority="tertiary" aria-label={label}>
      <DotsThreeVertical weight="bold" />
    </IconButton>
  );
}

/* The Tokens readout — MoreMenu declares no --ds-* roles; both surfaces reuse a documented skin. */
function MoreMenuTokens() {
  return (
    <Box style={{ borderRadius: "var(--ds-radius-4)", border: "1px solid var(--ds-stroke-weak)", overflow: "hidden", background: "var(--ds-bg-subtle)" }}>
      <Box style={{ padding: "var(--space-4)" }}>
        <Text size="1" style={{ color: "var(--ds-text-weak)", lineHeight: 1.6, maxWidth: "var(--ds-text-measure)" }}>
          MoreMenu is a composition, not a paint surface — it declares <strong>no <Mono>--ds-*</Mono> roles of
          its own</strong>. The trigger reuses <Mono>IconButton</Mono>'s ghost skin — an{" "}
          <Mono>--accent-a11</Mono> glyph (the alpha sibling of the <Mono>--accent-11</Mono> that{" "}
          <Mono>--ds-text-link</Mono> aliases) on a transparent rest fill, tinting to{" "}
          <Mono>--ds-fill-accent-weak</Mono> on hover — and the menu reuses <Mono>DropdownMenu</Mono>'s
          opaque <Mono>--color-panel-solid</Mono> Content, the same panel skin ContextMenu and Popover sit
          on, carried on our <Mono>--ds-shadow-overlay</Mono> elevation. A destructive item keeps
          DropdownMenu's danger paint — <Mono>--ds-text-error</Mono> at rest, a{" "}
          <Mono>--ds-fill-error-weak</Mono> tint on highlight, isolated below a Separator. Each component's
          own token spec is the source of truth for its colours; the rows below name what each reused skin
          resolves to.
        </Text>
      </Box>
      {/* One line each — the SPEC_GRID's prose column is ~55 characters wide, and a token name that
          straddles the wrap breaks at its own hyphens ("--ds-/fill-accent-weak"). The detail lives in the
          wide rationale above; each row names the one token its part resolves to. */}
      <NoteRow part="Trigger" value="IconButton ghost skin — --accent-a11 glyph" radix="IconButton" />
      <NoteRow part="Menu surface" value="DropdownMenu solid Content — --color-panel-solid" radix="DropdownMenu" />
      <NoteRow part="Danger item" value="DropdownMenu Item tone='danger' — --ds-text-error" radix="DropdownMenu" />
    </Box>
  );
}

const PROPS: PropDef[] = [
  { name: "label", type: "string", desc: <>The trigger's accessible name (<Code>aria-label</Code>) — <strong>required</strong>. An icon-only ⋯ button has no text, so without it the control is invisible to assistive tech (WCAG 4.1.2).</>, source: "MoreMenu.tsx" },
  { name: "icon", type: "ReactNode", def: "<DotsThreeVertical/>", desc: <>The trigger glyph. Defaults to the vertical three-dots; pass <Code>{"<DotsThree/>"}</Code> for the horizontal variant.</>, source: "MoreMenu.tsx" },
  { name: "priority", type: `"primary" | "secondary" | "tertiary"`, def: `"tertiary"`, desc: <>Trigger grade on <Code>IconButton</Code>. Defaults to <Code>tertiary</Code> (ghost) — the quiet overflow affordance; bump to <Code>secondary</Code> on a dense toolbar.</>, source: "MoreMenu.tsx" },
  { name: "size", type: `"1" | "2"`, desc: <>Sets BOTH the trigger and the menu Content — an explicit step renders them at the same size. Unset, the trigger follows the global <Code>uiSize</Code> control lane and the menu follows that lane <strong>clamped</strong> to the two steps a menu panel has, so at <Code>uiSize</Code> large the trigger is step 3 and the menu holds at step 2.</>, source: "MoreMenu.tsx" },
  { name: "contentProps", type: "DropdownMenu.Content props", desc: <>Forwarded to the <Code>DropdownMenu.Content</Code> — e.g. <Code>align="end"</Code> to hang the menu off a trailing ⋯, or <Code>side</Code> / <Code>sideOffset</Code>.</>, source: "MoreMenu.tsx" },
  { name: "Root props", type: "open / defaultOpen / onOpenChange / modal", desc: <>Every remaining prop passes through to <Code>DropdownMenu.Root</Code> for controlled/uncontrolled open state.</>, source: "Radix" },
];

/** The one definition of this component — the standfirst every page of it opens with. */
const DEFINITION = <>An overflow <Mono>⋯</Mono> menu for an item's secondary actions — a ghost icon-button trigger and a dropdown of actions. The primary action stays visible; the ⋯ collects the rest.</>;

const meta: Meta<typeof MoreMenu> = {
  title: "Components/Action/MoreMenu",
  component: MoreMenu,
  parameters: {
    controls: { disable: true },
    docs: {
      description: {
        component:
          "**MoreMenu** is the overflow “⋯” menu — a small **composition** of a ghost `IconButton` " +
          "trigger and a `DropdownMenu` of secondary actions. It reuses both shipped components as-is and adds " +
          "nothing new. The icon-only trigger takes a **required `label`** (its `aria-label`), and the menu is " +
          "for **secondary / overflow actions only** — the item's primary action always stays visible beside " +
          "it, never hidden inside the ⋯.",
      },
    },
  },
};
export default meta;
type Story = StoryObj<typeof MoreMenu>;

/** Usage — the primary lite docs story: an in-context specimen, the token note, and one do/don't. */
export const Usage: Story = {
  // The DO/DON'T word (success/error step-11 ink on its own tint) measures 4.10 at 12px bold, under axe's
  // 4.5; the colour + the word already carry the meaning, so that row is the documented exception. Scoped
  // to the label itself — the cards' specimens stay fully axe-checked, which "[data-dodont]" did not do.
  parameters: { a11y: { context: { exclude: [DODONT_LABEL] } } },
  render: (_args, { globals }) => (
    <HexThemeKey.Provider value={`${globals.accent}-${globals.appearance}-${globals.contrast}`}>
      <Page>
        <PageHeader title="MoreMenu · Usage" standfirst={DEFINITION} />

        <Section title="Specimen" lead="A project row: the primary action (Open) stays visible, and the trailing ⋯ collects the secondary actions — Rename, Duplicate, and an isolated Delete.">
          <ProjectRow
            trailing={
              <>
                <Button priority="secondary">Open</Button>
                <MoreMenu label="More actions for Orbit" contentProps={{ align: "end" }}>
                  {itemActions()}
                </MoreMenu>
              </>
            }
          />
          <Caption>Click the ⋯ to open the menu. The trigger is a named ghost icon-button; the menu is the System DropdownMenu, with the destructive item isolated below a separator.</Caption>
        </Section>

        <Rule />

        <Section title="The primary action stays visible" lead="A ⋯ menu is for the actions that don't earn a permanent spot. The item's primary action must stay visible — the overflow is never where the main action hides.">
          <Grid columns={{ initial: "1", sm: "2" }} gap="3">
            <DoDont kind="do" bare note="The primary action (Open) stays visible on the row; the ⋯ collects only the secondary actions — Rename, Duplicate, Delete. The reader can always do the main thing in one click.">
              <ProjectRow
                trailing={
                  <>
                    <Button priority="secondary">Open</Button>
                    <StaticDots label="More actions" />
                  </>
                }
              />
            </DoDont>
            <DoDont kind="dont" bare note="The main action (Open) is buried in the overflow with everything else — now the reader must open a menu to reach the one thing they most want to do. Keep the primary visible; overflow the rest.">
              <Flex direction="column" gap="2" align="start">
                <ProjectRow trailing={<StaticDots label="Actions" />} />
                <MenuMock
                  items={[
                    { label: "Open", icon: <ArrowSquareOut /> },
                    { label: "Rename", icon: <PencilSimple /> },
                    { label: "Delete project", icon: <Trash />, danger: true, sep: true },
                  ]}
                />
              </Flex>
            </DoDont>
          </Grid>
        </Section>

        <Rule />

        <Section title="Tokens" lead="MoreMenu owns no --ds-* roles — it reuses the IconButton and DropdownMenu skins. Each component's own token spec is the drift guard for its colours.">
          <MoreMenuTokens />
        </Section>
      </Page>
    </HexThemeKey.Provider>
  ),
  // No play on the docs story — viewing it must not open the menu (a portal flash on view). The menu is
  // opened by a real user click; its keyboard + danger behaviour is covered by the DropdownMenu suite.
};

type PropsArgs = {
  label: string;
  orientation: "vertical" | "horizontal";
  priority: "primary" | "secondary" | "tertiary";
  size: "auto" | "1" | "2";
};

/** Props — args-driven: drive the accessible label, the glyph orientation, the trigger grade, and the size. */
export const Props: StoryObj<PropsArgs> = {
  // "auto" (size unset) is the default so trigger + menu track the global uiSize toolbar out of the box.
  args: { label: "More actions", orientation: "vertical", priority: "tertiary", size: "auto" },
  argTypes: {
    label: { control: "text", description: "The trigger's accessible name (aria-label) — required.", table: { category: "Accessibility" } },
    orientation: { control: "inline-radio", options: ["vertical", "horizontal"], description: "Which three-dots glyph — DotsThreeVertical (default) or DotsThree.", table: { category: "Trigger" } },
    priority: { control: "inline-radio", options: ["primary", "secondary", "tertiary"], description: "Trigger grade on IconButton (default tertiary/ghost).", table: { category: "Trigger" } },
    size: { control: "inline-radio", options: ["auto", "1", "2"], description: '"auto" tracks the global uiSize toolbar (unset → the trigger takes the control lane, the menu that lane clamped to a panel\'s two steps); "1" or "2" pins both.', table: { category: "Variant" } },
  },
  parameters: { controls: { disable: false } },
  render: ({ label, orientation, priority, size }: PropsArgs) => (
    <Page maxWidth="none">
      <PageHeader title="MoreMenu · Props" standfirst={DEFINITION} />
      <Box style={{ padding: "var(--space-2) 0" }}>
        <ProjectRow
          trailing={
            <>
              <Button priority="secondary" size={size === "auto" ? undefined : size}>Open</Button>
              <MoreMenu
                label={label}
                priority={priority}
                size={size === "auto" ? undefined : size}
                icon={orientation === "horizontal" ? <DotsThree weight="bold" /> : <DotsThreeVertical weight="bold" />}
                contentProps={{ align: "end" }}
              >
                <DropdownMenu.Item><PencilSimple /> Rename</DropdownMenu.Item>
                <DropdownMenu.Item><Copy /> Duplicate</DropdownMenu.Item>
                <DropdownMenu.Separator />
                <DropdownMenu.Item tone="danger"><Trash /> Delete project</DropdownMenu.Item>
              </MoreMenu>
            </>
          }
        />
      </Box>
      <PropsLead />
      <Rule />
      <Section title="Props reference" lead={<>Every prop <Code>MoreMenu</Code> adds; the rest pass through to <Code>DropdownMenu.Root</Code>.</>}>
        <PropTable rows={PROPS} />
      </Section>
    </Page>
  ),
};

/** History — the rulings this component encodes and a changelog of how it changes over time. */
export const History: Story = {
  render: () => (
    <Page>
      <PageHeader title="MoreMenu · History" standfirst={DEFINITION} />
      <Section title="Decisions" lead="The rulings this component encodes.">
        <Flex direction="column" gap="3">
          <Decision id="Composition">
            MoreMenu is a <strong>composition, not a new component</strong> — it reuses <Code>IconButton</Code>{" "}
            (the ghost trigger) and <Code>DropdownMenu</Code> (the surface) exactly as they ship, adding no new
            component, token, or CSS. Repeating the two existing patterns is the point: an overflow menu is a
            named arrangement of parts the system already owns.
          </Decision>
          <Decision id="Required label">
            The trigger is icon-only, so <Code>label</Code> is <strong>required</strong> and becomes its{" "}
            <Code>aria-label</Code>. Without a text alternative an icon button is invisible to assistive tech
            (WCAG 4.1.2) — the API makes the accessible name unskippable rather than optional.
          </Decision>
          <Decision id="Two lanes, one size prop">
            An explicit <Code>size</Code> presets the trigger <em>and</em> the menu, so they render at the same
            step. Unset, they follow the global <Code>uiSize</Code> down <strong>different lanes</strong>: the
            trigger takes the full control lane — it is a control among controls, and must match the button
            beside it at every tier — while the menu takes that lane clamped to the two steps a menu panel has.
            At <Code>uiSize</Code> large the trigger is step 3 and the menu holds at step 2; that is the same
            pairing any icon-button-triggered dropdown renders, not a mismatch. The clamp is explicit because
            an out-of-range step is otherwise swapped for the panel's own default, silently.
          </Decision>
          <Decision id="Target floor">
            The trigger clears <strong>24×24</strong> at every step — the minimum pointer target (WCAG 2.5.8),
            which the quiet ghost step-1 button misses by 2px on its own. The floor is held once, for every
            ghost icon-button in the system's stylesheet, rather than by bumping this trigger a size: the glyph
            keeps its own size and only the pressable box grows.
          </Decision>
          <Decision id="Overflow only">
            The ⋯ holds <strong>secondary actions only</strong>. The item's primary action stays visible beside
            it — never buried in the overflow. A destructive item follows the DropdownMenu contract: isolated
            below a <Code>Separator</Code>, with a trash glyph, a verb label, and <Code>tone="danger"</Code>{" "}
            (colour is never the only cue, WCAG 1.4.1).
          </Decision>
        </Flex>
      </Section>

      <Rule />

      <Section title="Changelog" lead="Notable changes, newest first — grows as the component evolves.">
        <Flex direction="column" gap="3">
          <Decision id="0.9.0">
            Initial <Code>System/MoreMenu</Code> — a composition of a ghost <Code>IconButton</Code> (three-dots,
            required <Code>aria-label</Code>) and a <Code>DropdownMenu</Code> of secondary actions; no new
            component, token, or CSS. Lite spine: History · Usage · Props.
          </Decision>
        </Flex>
      </Section>
    </Page>
  ),
};
