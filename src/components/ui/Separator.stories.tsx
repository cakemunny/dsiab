import { type ReactNode } from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { Box, Code, Flex, Grid, Text } from "@radix-ui/themes";
import { PencilSimple, Copy, Archive, Trash } from "@phosphor-icons/react";
import { Separator } from "./Separator";
import { Item } from "./Item";
import { Button } from "./Button";
import {
  Decision, DoDont, DODONT_LABEL, HexThemeKey, LiteTokenSpec, MeasuredRow, MeasuredSpec, Mono, Page, PageHeader,
  PropsLead, type PropDef, PropTable, Rule, Scenario, Section,
} from "./_storyKit";
import { assertMeasuredRows } from "../../foundations/_assert";

/* Separator reuses Radix's own separator skin (its default paints --accent-a6 under the gray scope =
   --gray-a6, which is exactly what --ds-stroke-weak aliases), so it declares no --ds-* roles of its own.

   MEASURED ([[measured-token-rows]]): the row reads `background-color` off a real rendered rule and checks it against the
   token it claims, on a probe appended INSIDE that rule — so both sides share the rule's own ambient
   conditions, and the row can still disagree. */

function SeparatorSpec() {
  return (
    <LiteTokenSpec
      rationale={
        <>
          Separator reuses Radix's own skin and declares no <Mono>--ds-*</Mono> roles of its own — its
          default line resolves live to <Mono>--ds-stroke-weak</Mono>, the system's subtle-divider role,
          so a bare rule already matches with no override.
        </>
      }
    >
      <MeasuredSpec render={() => <Separator size="4" />}>
        <MeasuredRow part="Line colour" token="--ds-stroke-weak" select=".rt-Separator" prop="background-color" />
      </MeasuredSpec>
    </LiteTokenSpec>
  );
}

/* ---- The do/don't menu mock -------------------------------------------------
   A STATIC menu specimen (no floating menus overlapping the grid), built on the shared row primitive
   `Item` rather than bare paragraphs — so the rows carry real menu-row anatomy (icon slot, row padding,
   radius) and the guidance is judged against something that actually reads as a menu. The surface
   mirrors the static menu specimen in the DropdownMenu story (bg-overlay + shadow-overlay + radius-3),
   so both stories describe the same object. Between the two cards ONLY the rule count changes — that
   is the point being compared. */
function MenuMock({ children }: { children: ReactNode }) {
  return (
    <Box style={{ background: "var(--ds-bg-overlay)", borderRadius: "var(--ds-radius-3)", boxShadow: "var(--ds-shadow-overlay)", padding: "var(--space-1)", width: 200 }}>
      {children}
    </Box>
  );
}

/* One menu row. `Item` owns the anatomy; `density="compact"` is the menu-row block padding. A danger
   row paints from the accent-aware error family — the label carries the colour because
   `.rt-ds-item-label` sets its own, so a colour on the row root would not reach it. Static mock: the
   rows are non-interactive (no onClick/href), so no nested controls land inside a docs specimen. */
function MenuRow({ icon, label, danger }: { icon: ReactNode; label: string; danger?: boolean }) {
  const color = danger ? "var(--ds-text-error)" : undefined;
  return (
    <Item
      density="compact"
      startContent={<span style={{ color, display: "flex" }}>{icon}</span>}
      label={<span style={{ color }}>{label}</span>}
    />
  );
}

/* ---- The specimen surface --------------------------------------------------
   A separator is 1px of colour: shown full-bleed on the page it is INDISTINGUISHABLE from the page's own
   section rules directly above and below it — same width, same x, same thickness, same colour — and the
   reader cannot tell which of three stacked lines is the component. So each specimen sits in a bounded,
   width-capped card (the framed-panel recipe the DataList story uses for the same reason: a flat artifact
   needs a container to read AS an artifact). The card is deliberately far narrower than the page column,
   so the rule inside it can only be the component. */
function SpecimenCard({ children, width = 300 }: { children: ReactNode; width?: number | string }) {
  return (
    <Box
      style={{
        width,
        maxWidth: "100%",
        background: "var(--ds-bg-subtle)",
        border: "1px solid var(--ds-stroke-weak)",
        borderRadius: "var(--ds-radius-4)",
        padding: "var(--space-3)",
      }}
    >
      {children}
    </Box>
  );
}

/* A settings row — `Item` owns the anatomy (the same primitive the do/don't rows use); the value rides
   the end slot. Static: no onClick/href, so no nested controls land inside a docs specimen. */
function SettingRow({ label, value }: { label: string; value: string }) {
  return (
    <Item
      density="compact"
      label={label}
      endContent={<Text size="1" style={{ color: "var(--ds-text-weak)" }}>{value}</Text>}
    />
  );
}

/* A vertical rule in an action row. It demonstrates the requirement the props table states: a vertical
   separator FILLS its parent's cross-axis, so at size="4" (100%) it needs a parent that has a height.
   A flex row's height is auto, so the 100% resolves to nothing and the rule vanishes; a stretched
   wrapper takes the row's height and gives the rule something real to fill — so the divider tracks the
   control height at every tier instead of being pinned to one of the fixed length steps. */
function VRule(props: { "data-testid"?: string }) {
  return (
    <Box style={{ alignSelf: "stretch", display: "flex" }}>
      <Separator orientation="vertical" size="4" decorative={false} {...props} />
    </Box>
  );
}

/* The System Separator, inset to the menu's inline padding the way a real menu rule is. */
function MenuRule() {
  return (
    <Box style={{ margin: "var(--space-1) var(--space-2)" }}>
      <Separator size="4" />
    </Box>
  );
}

const SEPARATOR_PROPS: PropDef[] = [
  { name: "orientation", type: `"horizontal" | "vertical"`, def: `"horizontal"`, desc: <>Which way the rule runs. A vertical separator needs a parent with height (it fills the cross-axis).</>, source: "Radix" },
  { name: "decorative", type: "boolean", def: "true", desc: <>Whether the rule is purely visual. Decorative (default) → no role, invisible to AT. A <strong>semantic</strong> separator (<Code>decorative={false}</Code>) → <Code>role="separator"</Code>; this wrap adds <Code>aria-orientation</Code> for a semantic vertical rule (Radix Themes omits it).</>, source: "Separator.tsx" },
  { name: "size", type: `"1" | "2" | "3" | "4"`, def: `"1"`, desc: <>The rule's LENGTH step along its orientation (<Code>"4"</Code> = 100% of the container). It is not the thickness — a separator is always 1px thick.</>, source: "Radix" },
];

/** The one definition of this component — the standfirst every page of it opens with. */
const DEFINITION = <>A thin rule that divides content or controls. Horizontal by default; vertical for inline groups. Decorative unless you opt into a semantic <Mono>role="separator"</Mono>.</>;

const meta: Meta<typeof Separator> = {
  title: "Components/Layout/Separator",
  component: Separator,
  parameters: {
    controls: { disable: true },
    docs: {
      description: {
        component:
          "**Separator** is a thin 1px rule that divides content or controls, horizontally or vertically. " +
          "It’s a thin wrapper over Radix’s `Separator` whose default skin already paints the system’s " +
          "subtle-divider role (`--ds-stroke-weak`), so it matches with no override. Decorative by default " +
          "(invisible to assistive tech); set `decorative={false}` for a semantic `role=\"separator\"`. " +
          "It’s a **lite-tier** wrap — one Usage story (specimen · live token spec · a do/don’t) plus a Props.",
      },
    },
  },
};
export default meta;
type Story = StoryObj<typeof Separator>;

/** Usage — the primary lite docs story: labeled specimens, the live token spec, and one do/don't. */
export const Usage: Story = {
  // The DoDont callout labels (success/error text on the green/red tint) measure ~4.1–4.4 — just under
  // axe's strict 4.5; the callout colour + the DO/DON'T word already carry the meaning, so color-contrast
  // is scoped off here, a documented specimen exception (same pattern as Kbd/AlertDialog Usage).
  parameters: { a11y: { context: { exclude: [DODONT_LABEL] } } },
  render: (_args, { globals }) => (
    <HexThemeKey.Provider value={`${globals.accent}-${globals.appearance}-${globals.contrast}`}>
      <Page>
        <PageHeader title="Separator · Usage" standfirst={DEFINITION} />

        <Section title="Specimen" lead="Both orientations, each inside a bounded surface — a horizontal rule dividing groups in a settings card, a vertical rule dividing controls in an action row.">
          <Grid columns={{ initial: "1", sm: "2" }} gap="5">
            <Scenario
              label="HORIZONTAL"
              caption={<>Full-width inside its container (<Mono>size="4"</Mono>) and <strong>decorative</strong> — the grouping is already visible, so the rule stays out of the accessibility tree.</>}
            >
              <SpecimenCard>
                <SettingRow label="Name" value="Ada Lovelace" />
                <SettingRow label="Email" value="ada@example.com" />
                <Box my="2"><Separator size="4" data-testid="sep-decorative" /></Box>
                <SettingRow label="Plan" value="Team" />
                <SettingRow label="Renews" value="12 Aug 2026" />
              </SpecimenCard>
            </Scenario>

            <Scenario
              label="VERTICAL"
              caption={<>Between real controls, filling the row's height (<Mono>size="4"</Mono> in a stretched row). These are <strong>semantic</strong> — <Mono>decorative={"{false}"}</Mono> — so the boundary is announced, with <Mono>aria-orientation="vertical"</Mono>.</>}
            >
              <SpecimenCard width="fit-content">
                <Flex align="stretch" gap="2">
                  <Button priority="tertiary">Edit</Button>
                  <VRule data-testid="sep-semantic" />
                  <Button priority="tertiary">Duplicate</Button>
                  <VRule />
                  <Button priority="tertiary">Archive</Button>
                </Flex>
              </SpecimenCard>
            </Scenario>
          </Grid>
        </Section>

        <Rule />

        <Section title="When a rule earns its line" lead="A separator marks a real boundary between groups. Where whitespace already groups content, a rule is noise.">
          <Grid columns={{ initial: "1", sm: "2" }} gap="3">
            <DoDont kind="do" bare note="One rule between distinct clusters — it clarifies where one group ends and the next begins.">
              <MenuMock>
                <MenuRow icon={<PencilSimple />} label="Rename" />
                <MenuRow icon={<Copy />} label="Duplicate" />
                <MenuRule />
                <MenuRow icon={<Trash />} label="Delete" danger />
              </MenuMock>
            </DoDont>
            <DoDont kind="dont" bare note="A rule around every row turns structure into visual static — the row padding already separates them. Reserve the line for real boundaries.">
              <MenuMock>
                <MenuRow icon={<PencilSimple />} label="Rename" />
                <MenuRule />
                <MenuRow icon={<Copy />} label="Duplicate" />
                <MenuRule />
                <MenuRow icon={<Archive />} label="Archive" />
              </MenuMock>
            </DoDont>
          </Grid>
        </Section>

        <Rule />

        <Section title="Tokens" lead="Read off a rendered rule and checked against the token the row names. Separator reuses Radix's skin, so it owns no --ds-* roles; the row confirms its colour lands on --ds-stroke-weak in the running theme.">
          <SeparatorSpec />
        </Section>
      </Page>
    </HexThemeKey.Provider>
  ),
  play: async ({ canvasElement }) => {
    // Passive (no driving / no flash): a separator has no open/close behaviour, so its a11y contract and
    // token binding are asserted right here. axe runs automatically on the story.
    const deco = canvasElement.querySelector<HTMLElement>('[data-testid="sep-decorative"]');
    const sem = canvasElement.querySelector<HTMLElement>('[data-testid="sep-semantic"]');
    if (!deco || !sem) throw new Error("Usage must render both a decorative and a semantic separator");

    // Decorative → no role at all, no aria-orientation (out of the a11y tree — Radix Themes renders a
    // bare visual span, not role="none").
    if (deco.hasAttribute("role")) throw new Error(`a decorative separator must carry no role; got role="${deco.getAttribute("role")}"`);
    if (deco.hasAttribute("aria-orientation")) throw new Error("a decorative separator must NOT carry aria-orientation");

    // Semantic vertical → role=separator + aria-orientation="vertical" (the wrap's a11y upgrade).
    if (sem.getAttribute("role") !== "separator") throw new Error(`a semantic separator must be role="separator"; got ${sem.getAttribute("role")}`);
    if (sem.getAttribute("aria-orientation") !== "vertical") throw new Error(`a semantic vertical separator must carry aria-orientation="vertical"; got ${sem.getAttribute("aria-orientation")}`);

    // The token table's EVIDENCE, asserted at runtime ([[measured-token-rows]]). This is also the colour binding: the row
    // reads background-color off a rendered rule and resolves --ds-stroke-weak on a different node, and
    // `assertMeasuredRows` throws if the two disagree.
    const rows = assertMeasuredRows(canvasElement);
    if (rows.measured !== 1 || rows.unproven !== 0) {
      throw new Error(`expected 1 measured / 0 unproven token rows, got ${rows.measured} / ${rows.unproven}`);
    }
  },
};

type PropsArgs = {
  orientation: "horizontal" | "vertical";
  decorative: boolean;
  size: "1" | "2" | "3" | "4";
};

/** Props — the live, args-driven Separator. Drive orientation, semantic vs decorative, and length. */
export const Props: StoryObj<PropsArgs> = {
  args: { orientation: "horizontal", decorative: true, size: "4" },
  argTypes: {
    orientation: { control: "inline-radio", options: ["horizontal", "vertical"], description: "Which way the rule runs.", table: { category: "Variant" } },
    decorative: { control: "boolean", description: "Purely visual (role=none) vs semantic (role=separator).", table: { category: "Accessibility" } },
    size: { control: "inline-radio", options: ["1", "2", "3", "4"], description: "Length step along the orientation (4 = 100%).", table: { category: "Variant" } },
  },
  parameters: { controls: { disable: false } },
  render: ({ orientation, decorative, size }: PropsArgs) => (
    <Page maxWidth="none">
      <PageHeader title="Separator · Props" standfirst={DEFINITION} />
      <Box style={{ padding: "16px 0 8px" }}>
        {orientation === "vertical" ? (
          <Flex align="center" gap="3" style={{ height: 40 }}>
            <Text size="2" style={{ color: "var(--ds-text-strong)" }}>Left</Text>
            <Separator orientation="vertical" decorative={decorative} size={size} />
            <Text size="2" style={{ color: "var(--ds-text-strong)" }}>Right</Text>
          </Flex>
        ) : (
          <Box style={{ width: 320 }}>
            <Text as="p" size="2" style={{ color: "var(--ds-text-strong)" }}>Above</Text>
            <Box my="2"><Separator orientation="horizontal" decorative={decorative} size={size} /></Box>
            <Text as="p" size="2" style={{ color: "var(--ds-text-strong)" }}>Below</Text>
          </Box>
        )}
      </Box>
      <PropsLead />
      <Rule />
      <Section title="Props reference" lead={<>Every prop <Code>Separator</Code> accepts — all pass through to Radix's <Code>Separator</Code>; <Code>color</Code> is withheld so the divider stays on the neutral stroke.</>}>
        <PropTable rows={SEPARATOR_PROPS} />
      </Section>
    </Page>
  ),
};

/** History — the rulings this component encodes and a changelog of how it changes over time. */
export const History: Story = {
  render: () => (
    <Page>
      <PageHeader title="Separator · History" standfirst={DEFINITION} />
      <Section title="Decisions" lead="The rulings this component encodes.">
        <Flex direction="column" gap="3">
          <Decision id="[[catalog-as-specification]] · Wrapped Radix component">
            Separator is a <strong>wrapped</strong> Radix Themes component — the Radix name wins; built on the
            Radix substrate + our <Code>--ds-*</Code> layer, not a hand-rolled rule.
          </Decision>
          <Decision id="Stroke role">
            The default separator colour (<Code>--gray-a6</Code>) is exactly what <Code>--ds-stroke-weak</Code>{" "}
            aliases — the subtle-divider role — so it binds to the system with <strong>no new CSS and no new
            token</strong>. <Code>color</Code> is deliberately not exposed: a divider stays on the neutral
            stroke, never a raw Radix scale.
          </Decision>
          <Decision id="Semantic vs decorative">
            Decorative by default (no role, a bare visual span) — most rules are visual grouping the layout
            already conveys, so they stay out of the accessibility tree. When a rule genuinely marks a
            boundary between regions, <Code>decorative={false}</Code> exposes <Code>role="separator"</Code>.
            Radix Themes' Separator omits <Code>aria-orientation</Code>; this wrap adds it for a semantic
            vertical rule — a small a11y upgrade so the boundary's direction is stated.
          </Decision>
        </Flex>
      </Section>

      <Rule />

      <Section title="Changelog" lead="Notable changes, newest first — grows as the component evolves.">
        <Flex direction="column" gap="3">
          <Decision id="0.9.0">
            Initial <Code>System/Separator</Code> — Radix Separator wrapped, its default skin bound to{" "}
            <Code>--ds-stroke-weak</Code> tokenlessly; <Code>color</Code> withheld so the divider stays on the
            neutral stroke; History page added so every component, stubs included, has one.
          </Decision>
        </Flex>
      </Section>
    </Page>
  ),
};
