import { useLayoutEffect, useRef, useState } from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { Box, Code, Flex, Grid, Text } from "@radix-ui/themes";
import { Bell, Lock, CreditCard, CaretRight, Hash } from "@phosphor-icons/react";
import { List, ListItem, type ListStyle } from "./List";
import { Badge } from "./Badge";
import {
  AnatomyLegend, Caption, Decision, DoDont, DODONT_LABEL, dotStyle, HexThemeKey, hLine, MeasuredRow,
  MeasuredSpec, NoteRow, Page, PageHeader, PropsLead, type PropDef, PropTable, Rule, Scenario, Section, TokenGroup,
} from "./_storyKit";
import { assertMeasuredRows } from "../../foundations/_assert";

/* ---- a small settings-list specimen reused across the page ---------------- */
function SettingsList({ dividers = false }: { dividers?: boolean }) {
  return (
    <List hasDividers={dividers} header={<Text size="2" weight="bold" style={{ color: "var(--ds-text-strong)" }}>Account</Text>}>
      <ListItem startContent={<Bell style={{ color: "var(--ds-icon-interactive)" }} />} label="Notifications" description="Alerts, email digests, and push" endContent={<CaretRight style={{ color: "var(--ds-icon-neutral)" }} />} onClick={() => {}} />
      <ListItem startContent={<Lock style={{ color: "var(--ds-icon-interactive)" }} />} label="Privacy" description="Control who can see your activity" endContent={<CaretRight style={{ color: "var(--ds-icon-neutral)" }} />} onClick={() => {}} />
      <ListItem startContent={<CreditCard style={{ color: "var(--ds-icon-interactive)" }} />} label="Billing" description="Plan, invoices, and payment method" endContent={<CaretRight style={{ color: "var(--ds-icon-neutral)" }} />} onClick={() => {}} />
    </List>
  );
}

/* ---- Anatomy legend ------------------------------------------------------- */
const ANATOMY_PARTS: [number, string, string][] = [
  [1, "List (ul / ol)", "the passive semantic container. list-style:none + role=list re-added on the marker-less <ul> so Safari keeps list semantics; a decimal list is a real <ol>."],
  [2, "Header", "optional — an id'd node above the list, wired to it via aria-labelledby so a screen reader announces the list's name."],
  [3, "Marker", "the disc / hollow-circle / decimal-counter glyph, custom-rendered (not native list-style-type) so it aligns to the first text line and paints from --ds-text-strong."],
  [4, "ListItem (Item as=li)", "one row — the shared Item primitive. Slots: startContent · label(+description) · endContent, with density from the List. onClick/href makes the whole row an invisible-button/anchor control."],
  [5, "Divider", "optional hairline between rows (--ds-stroke-weak). Turning dividers on removes the row gap and squares the item corners."],
];

/* ---- Anatomy diagram ------------------------------------------------------
   The list's parts are STACKED, not side by side, so the callouts sit in gutters either side of the
   specimen and run a leader into the part they name. Positions are MEASURED off the live specimen: row
   height follows the density AND the control lane (the size toolbar), so every one of these y values
   moves when the reader changes size; none of them can be written down.

   Callout 3 (the marker) has no target HERE: a settings list is marker-less — `listStyle="none"` makes
   Item render no marker node at all — so there is nothing on this specimen to point at. The three
   glyphs are shown in the Markers section below; the Caption says so, and the play below asserts the
   OTHER four callouts against the legend by number. */

const GUTTER = 56;

/** [callout, selector inside the specimen, where on that element to anchor, which gutter]. */
const PINS: [number, string, "top" | "center" | "bottom", "left" | "right"][] = [
  [1, ".rt-ds-list", "top", "left"],
  [2, ".rt-ds-list-header", "center", "right"],
  [4, ".rt-ds-list > li:nth-child(2)", "center", "right"],
  // The divider is a hairline ON a row's block-end edge, not a node of its own — so this callout is
  // anchored to the BOTTOM of the first row, which is exactly where that rule paints.
  [5, ".rt-ds-list > li:first-child", "bottom", "left"],
];

/** The legend numbers that carry a callout on the specimen — every part except the marker. */
const PINNED_PARTS = PINS.map(([n]) => n);

function AnatomyDiagram() {
  const frame = useRef<HTMLDivElement>(null);
  const specimen = useRef<HTMLDivElement>(null);
  const [pins, setPins] = useState<Record<number, number>>({});
  /** The specimen's own width — the right gutter's dots hang off it. */
  const [specW, setSpecW] = useState(0);

  useLayoutEffect(() => {
    const f = frame.current;
    const s = specimen.current;
    if (!f || !s) return;
    const measure = () => {
      const top = f.getBoundingClientRect().top;
      const next: Record<number, number> = {};
      for (const [n, sel, anchor] of PINS) {
        const el = s.querySelector<HTMLElement>(sel);
        if (!el) continue;
        const box = el.getBoundingClientRect();
        const offset = anchor === "top" ? 0 : anchor === "bottom" ? box.height : box.height / 2;
        next[n] = Math.round(box.top + offset - top);
      }
      const nextW = Math.round(s.getBoundingClientRect().width);
      // Only write when something moved — the frame's own size feeds this observer otherwise.
      setPins((prev) => (JSON.stringify(prev) === JSON.stringify(next) ? prev : next));
      setSpecW((prev) => (prev === nextW ? prev : nextW));
    };
    measure();
    let raf = 0;
    const ro = new ResizeObserver(() => { cancelAnimationFrame(raf); raf = requestAnimationFrame(measure); });
    ro.observe(f);
    ro.observe(s);
    return () => { cancelAnimationFrame(raf); ro.disconnect(); };
  }, []);

  return (
    <Box style={{ overflowX: "auto" }}>
      <Box ref={frame} style={{ position: "relative", width: "fit-content", paddingLeft: GUTTER, paddingRight: GUTTER }}>
        <Box
          ref={specimen}
          data-testid="anatomy"
          style={{ width: 320, border: "1px solid var(--ds-stroke-weak)", borderRadius: "var(--ds-radius-4)", padding: 16, background: "var(--ds-bg-subtle)" }}
        >
          <SettingsList dividers />
        </Box>
        {PINS.map(([n, , , side]) => {
          const y = pins[n];
          if (y == null) return null;
          const right = side === "right";
          return (
            <Box key={n}>
              <Box data-pin={n} style={{ ...dotStyle, left: right ? GUTTER + specW + GUTTER - 20 : 0, top: y - 10 }}>{n}</Box>
              <Box
                style={hLine(
                  right
                    ? { left: GUTTER + specW + 4, top: y, width: GUTTER - 26 }
                    : { left: 22, top: y, width: GUTTER - 26 },
                )}
              />
            </Box>
          );
        })}
      </Box>
    </Box>
  );
}

/* ---- Tokens: measured off rendered rows -----------------------------------
   Each row names an element and a property and reads that property off a real rendered List, then
   checks it against the token it claims — so a row can disagree with the component. The hover and
   focus rows read the declaration the component's OWN matched rule paints, since no script can
   synthesise a real hover and :focus-visible needs a keyboard. */
function ListTokens() {
  return (
    <TokenGroup
      label="ROW — measured off a rendered ListItem"
      blurb="The row paints only from --ds-* semantic tokens, so it follows brand collision shifts. Every value below is read off a rendered list and checked against the token the row names."
      specimen={
        <Box style={{ width: 280, border: "1px solid var(--ds-stroke-weak)", borderRadius: "var(--ds-radius-3)" }}>
          <List><ListItem label="Label text" description="Description text" /></List>
        </Box>
      }
    >
      {/* One host, three lists — the plain row (label / description / hover / focus), a divided list
          (the hairline between rows), and a disc list (the marker glyph). Each row's selector names
          which of the three it reads. */}
      <MeasuredSpec
        render={() => (
          <>
            <List>
              <ListItem label="Label text" description="Description text" onClick={() => {}} />
              <ListItem label="Selected row" description="Selected description" isSelected />
            </List>
            <List hasDividers>
              <ListItem label="First" />
              <ListItem label="Second" />
            </List>
            <List listStyle="disc">
              <ListItem label="Marker" />
            </List>
          </>
        )}
      >
        <MeasuredRow part="Label" token="--ds-text-strong" select=".rt-ds-item-label" prop="color" />
        <MeasuredRow part="Description" token="--ds-text-weak" select=".rt-ds-item-description" prop="color" />
        <MeasuredRow
          part="Row fill"
          note="Only on an interactive row, and only under a pointer that can hover — the rule sits inside @media (hover: hover)."
          token="--ds-fill-hover"
          select=".rt-ds-item[data-interactive]"
          prop="background-color"
          state="hover"
        />
        <MeasuredRow
          part="Selected row"
          note="A selected row keeps this tint under the pointer; it is never re-tinted by hover."
          token="--ds-fill-selected-subtle"
          select=".rt-ds-item[data-selected]"
          prop="background-color"
        />
        <MeasuredRow
          part="Selected description"
          note="Strong ink on a selected row, where the weak ink read under 4.5:1 on the tint ([[status-dot-edges]]). The tint stays."
          token="--ds-text-strong"
          select=".rt-ds-item[data-selected] .rt-ds-item-description"
          prop="color"
        />
        <MeasuredRow
          part="Divider"
          note="Only with hasDividers — the hairline also drops the row gap and squares the corners."
          token="--ds-stroke-weak"
          select=".rt-ds-list[data-dividers] > .rt-ds-item"
          prop="border-block-end-color"
        />
        <MeasuredRow
          part="Marker"
          note="Custom-rendered rather than a native list-style-type, so it aligns to the first text line."
          token="--ds-text-strong"
          select=".rt-ds-list-dot"
          prop="background-color"
        />
        <MeasuredRow
          part="Focus ring"
          note="Hoisted to the row, because the invisible body takes focus. The accent base, with the stack alpha on top, 2px ([[focus-ring]])."
          token="--ds-stroke-focus"
          select=".rt-ds-item[data-interactive]"
          prop="outline-color"
          state="focus-visible"
        />
      </MeasuredSpec>
      <NoteRow part="Density (block padding)" value="compact 4 · balanced 8 · spacious 12 px" radix="--ds-space-4/8/12" />
    </TokenGroup>
  );
}

/* ========================================================================== */
/** The one definition of this component — the standfirst every page of it opens with. */
const DEFINITION = <>The passive semantic collection — a ul/ol of rows on the shared Item primitive, with density, dividers, markers, and a labelled header.</>;

const meta: Meta<typeof List> = {
  title: "Components/Table & List/List",
  component: List,
  parameters: {
    controls: { disable: true },
    docs: {
      description: {
        component:
          "**List** is the passive, semantic collection — a `<ul>` (or an `<ol>` for numbered lists) whose " +
          "rows are built from the shared **Item** primitive: `startContent · label(+description) · endContent`, " +
          "with `density`, optional `hasDividers`, custom `disc`/`circle`/`decimal` markers, and an optional " +
          "`header`. It is **passive** — for *menus* (actions, roving focus) reach for `DropdownMenu`; for a " +
          "*tree* reach for `TreeList`. A row becomes interactive by taking `onClick`/`href`, which wraps its " +
          "content in an invisible button/anchor so the whole row is one keyboard-operable control.",
      },
    },
  },
};
export default meta;
type Story = StoryObj<typeof List>;

/* ---- Anatomy — the labelled diagram only; the token spec closes Usage ------ */
export const Anatomy: Story = {
  render: (_args, { globals }) => (
    <HexThemeKey.Provider value={`${globals.accent}-${globals.appearance}-${globals.contrast}`}>
      <Page>
        <PageHeader title="List · Anatomy" standfirst={DEFINITION} />
        {/* The legend sits UNDER the diagram, as it does on every other Anatomy page: the callouts now
            occupy the gutters either side of the specimen, and a legend beside them would put its own
            numerals within a few dozen pixels of the pins — two sets of numbered dots side by side,
            which reads as one confusing set. */}
        <Section title="Anatomy" lead="A labelled settings list — a header wired via aria-labelledby, then rows built from the shared Item primitive.">
          <AnatomyDiagram />
          <AnatomyLegend parts={ANATOMY_PARTS} />
          <Caption>
            The header's id backs the list's <Code>aria-labelledby</Code>, so the collection is announced by name.
            Each row's accessible name is its label. Callout 3 is not on the specimen above: a settings list is
            marker-less, so the glyph is shown in <strong>Markers</strong> below.
          </Caption>
        </Section>

        <Rule />

        <Section title="Markers" lead="Unordered lists take disc or hollow-circle bullets; a decimal list is a real <ol> whose numbers come from a CSS counter (so start works).">
          <Flex gap="6" wrap="wrap">
            <Flex direction="column" gap="1">
              <Caption>disc</Caption>
              <Box style={{ width: 220, border: "1px solid var(--ds-stroke-weak)", borderRadius: "var(--ds-radius-3)", padding: "4px 8px" }}>
                <List listStyle="disc" density="compact"><ListItem label="Fast" /><ListItem label="Accessible" /><ListItem label="Themeable" /></List>
              </Box>
            </Flex>
            <Flex direction="column" gap="1">
              <Caption>circle</Caption>
              <Box style={{ width: 220, border: "1px solid var(--ds-stroke-weak)", borderRadius: "var(--ds-radius-3)", padding: "4px 8px" }}>
                <List listStyle="circle" density="compact"><ListItem label="Fast" /><ListItem label="Accessible" /><ListItem label="Themeable" /></List>
              </Box>
            </Flex>
            <Flex direction="column" gap="1">
              <Caption>decimal · start=3</Caption>
              <Box data-testid="ordered" style={{ width: 220, border: "1px solid var(--ds-stroke-weak)", borderRadius: "var(--ds-radius-3)", padding: "4px 8px" }}>
                <List listStyle="decimal" density="compact" start={3}><ListItem label="Third" /><ListItem label="Fourth" /><ListItem label="Fifth" /></List>
              </Box>
            </Flex>
          </Flex>
        </Section>
      </Page>
    </HexThemeKey.Provider>
  ),
  play: async ({ canvasElement }) => {
    // Every numbered part in the legend has a callout ON the specimen — a numbered legend with nothing
    // to point at is the defect this diagram exists to avoid. Compared by NUMBER, not by count, so a
    // callout that lands under the wrong number is caught too.
    const pinned = [...canvasElement.querySelectorAll("[data-pin]")]
      .map((el) => Number(el.getAttribute("data-pin")))
      .sort((a, b) => a - b);
    if (pinned.join() !== PINNED_PARTS.join()) {
      throw new Error(`callouts [${pinned}] on the specimen do not match the pinned parts [${PINNED_PARTS}]`);
    }
    // …and the marker's carve-out has to stay TRUE: the moment this specimen renders a marker, part 3
    // is owed a callout like every other part, and this fails rather than quietly staying at four.
    const anatomy = canvasElement.querySelector('[data-testid="anatomy"]')!;
    if (anatomy.querySelector(".rt-ds-list-marker, .rt-ds-list-number")) {
      throw new Error("the anatomy specimen renders a marker now — callout 3 is owed a pin on it");
    }
  },
};

/* ---- Usage — scenarios, then the closing live token spec ------------------ */
export const Usage: Story = {
  // The DO/DON'T word (success/error step-11 ink on its own tint) measures 4.10 at 12px bold, under axe's
  // 4.5; the colour + the word already carry the meaning, so that row is the documented exception. Scoped
  // to the label itself — the cards' specimens stay fully axe-checked, which "[data-dodont]" did not do.
  parameters: { a11y: { context: { exclude: [DODONT_LABEL] } } },
  render: (_args, { globals }) => (
    <Page>
      <PageHeader title="List · Usage" standfirst={DEFINITION} />
      <Section title="Where a List fits" lead="A passive, scannable collection of like items — settings rows, an ordered set of steps, a compact feature list.">
        <Grid columns={{ initial: "1", sm: "2" }} gapX="6" gapY="5">
          <Scenario label="SETTINGS — INTERACTIVE ROWS" caption="Each row navigates; the whole row is one control (invisible button), with a chevron affordance and hover tint.">
            <Box style={{ border: "1px solid var(--ds-stroke-weak)", borderRadius: "var(--ds-radius-3)", padding: 16 }}><SettingsList dividers /></Box>
          </Scenario>
          <Scenario label="STEPS — ORDERED" caption="A numbered <ol> for a sequence; the counter is seeded from start, and screen readers keep the ordinal semantics.">
            <Box style={{ border: "1px solid var(--ds-stroke-weak)", borderRadius: "var(--ds-radius-3)", padding: "8px 12px" }}>
              <List listStyle="decimal">
                <ListItem label="Connect your repository" />
                <ListItem label="Choose a framework preset" />
                <ListItem label="Deploy" />
              </List>
            </Box>
          </Scenario>
        </Grid>
      </Section>

      <Rule />

      <Section title="Passive collection, not a menu" lead="List carries no menu roles or roving focus. For an actions menu use DropdownMenu; for expandable hierarchy use TreeList.">
        <Grid columns={{ initial: "1", sm: "2" }} gap="3">
          <DoDont kind="do" bare note="A List for a static, scannable set of rows — settings, metadata, a feature list. The row is interactive only when it should navigate.">
            <Box style={{ width: "100%", border: "1px solid var(--ds-stroke-weak)", borderRadius: "var(--ds-radius-3)", padding: "4px 8px" }}>
              <List listStyle="disc" density="compact"><ListItem label="Unlimited projects" /><ListItem label="Audit log" /><ListItem label="SSO" /></List>
            </Box>
          </DoDont>
          <DoDont kind="dont" bare note="Don't rebuild a menu out of a List — clickable rows with no menu roles/roving focus. Reach for DropdownMenu (menuitem semantics, keyboard model) instead.">
            <Box style={{ width: "100%", border: "1px solid var(--ds-stroke-weak)", borderRadius: "var(--ds-radius-3)" }}>
              <List>
                <ListItem label="Cut" endContent={<Badge color="gray">⌘X</Badge>} onClick={() => {}} />
                <ListItem label="Copy" endContent={<Badge color="gray">⌘C</Badge>} onClick={() => {}} />
              </List>
            </Box>
          </DoDont>
        </Grid>
        <Caption>Dividers vs. gap: turn <Code>hasDividers</Code> on for a records/settings feel (hairline rules, squared rows); leave it off for a lighter, gapped list.</Caption>
      </Section>

      <Rule />

      {/* The closing reference section. The provider is what makes the table live: every measured row
          re-reads its value when this key changes, so an accent/appearance flip re-resolves the spec. */}
      <HexThemeKey.Provider value={`${globals.accent}-${globals.appearance}-${globals.contrast}`}>
        <Section title="Tokens" lead="Every value read off a rendered list and checked against the token the row names, so the table can disagree with the component.">
          <ListTokens />
        </Section>
      </HexThemeKey.Provider>
    </Page>
  ),
  play: async ({ canvasElement }) => {
    // The token table's EVIDENCE, asserted at runtime ([[measured-token-rows]]). The hover and focus rows read the
    // declaration the component's own matched rule paints — no script can synthesise either state.
    const rows = assertMeasuredRows(canvasElement);
    if (rows.measured !== 8 || rows.unproven !== 0) {
      throw new Error(`expected 8 measured / 0 unproven token rows, got ${rows.measured} / ${rows.unproven}`);
    }
  },
};

/* ---- Props ----------------------------------------------------------- */
const LIST_STYLES: ListStyle[] = ["none", "disc", "circle", "decimal"];

const PROPS: PropDef[] = [
  { name: "children", type: "ReactNode", desc: <>The rows — <Code>ListItem</Code> components.</>, source: "List.tsx" },
  { name: "density", type: `"compact" | "balanced" | "spacious"`, def: "balanced", desc: <>Row block padding (~4 / 8 / 12 px), pushed to every <Code>ListItem</Code> via context.</>, source: "List.tsx" },
  { name: "hasDividers", type: "boolean", def: "false", desc: <>Hairline rules between rows; removes the gap and squares the row corners.</>, source: "List.tsx" },
  { name: "header", type: "ReactNode", desc: <>A node above the list, wired to it via <Code>aria-labelledby</Code>.</>, source: "List.tsx" },
  { name: "listStyle", type: `"none" | "disc" | "circle" | "decimal"`, def: "none", desc: <><Code>decimal</Code> renders an <Code>&lt;ol&gt;</Code> with a CSS-counter marker; the rest render a <Code>&lt;ul&gt;</Code> (marker-less keeps <Code>role="list"</Code> for Safari).</>, source: "List.tsx" },
  { name: "start", type: "number", def: "1", desc: <>Seeds the ordered-list counter (and the <Code>&lt;ol start&gt;</Code>) when not 1.</>, source: "List.tsx" },
  { name: "ListItem: label", type: "ReactNode", desc: <>Primary text (required). A string truncates to one line by default.</>, source: "List.tsx" },
  { name: "ListItem: description", type: "ReactNode", desc: <>Secondary text below the label.</>, source: "List.tsx" },
  { name: "ListItem: startContent / endContent", type: "ReactNode", desc: <>Leading (icon/avatar/checkbox) and trailing (badge/chevron/action) slots.</>, source: "List.tsx" },
  { name: "ListItem: onClick / href", type: "(e) => void / string", desc: <>Makes the whole row an interactive invisible-button / -anchor control.</>, source: "List.tsx" },
  { name: "ListItem: isSelected / isDisabled", type: "boolean", desc: <>Selected: the <Code>--ds-fill-selected-subtle</Code> tint, with the label bold and the label and description in <Code>--ds-text-strong</Code> ([[selected-row-cue]], [[status-dot-edges]]). Disabled: a dimmed row with <Code>aria-disabled</Code>.</>, source: "List.tsx" },
];

type PropsArgs = {
  density: "compact" | "balanced" | "spacious";
  listStyle: ListStyle;
  hasDividers: boolean;
  withHeader: boolean;
  interactive: boolean;
  start: number;
};

export const Props: StoryObj<PropsArgs> = {
  args: { density: "balanced", listStyle: "none", hasDividers: false, withHeader: true, interactive: true, start: 1 },
  argTypes: {
    density: { control: "inline-radio", options: ["compact", "balanced", "spacious"], table: { category: "List" } },
    listStyle: { control: "inline-radio", options: LIST_STYLES, table: { category: "List" } },
    hasDividers: { control: "boolean", table: { category: "List" } },
    withHeader: { name: "header", control: "boolean", table: { category: "List" } },
    interactive: { control: "boolean", description: "Rows take onClick (an interactive invisible-button row).", table: { category: "ListItem" } },
    start: { control: { type: "number", min: 1 }, description: "Ordered-list counter seed (decimal only).", table: { category: "List" } },
  },
  parameters: { controls: { disable: false } },
  render: ({ density, listStyle, hasDividers, withHeader, interactive, start }: PropsArgs) => {
    const rows = [
      { icon: <Bell />, label: "Notifications", description: "Alerts, email digests, and push" },
      { icon: <Lock />, label: "Privacy", description: "Control who can see your activity" },
      { icon: <Hash />, label: "Integrations", description: "Connect the tools your team uses" },
    ];
    const showIcons = listStyle === "none";
    return (
      <Page maxWidth="none">
        <PageHeader title="List · Props" standfirst={DEFINITION} />
        <Box style={{ maxWidth: 420, border: "1px solid var(--ds-stroke-weak)", borderRadius: "var(--ds-radius-4)", padding: 16 }}>
          <List
            density={density}
            listStyle={listStyle}
            hasDividers={hasDividers}
            start={start}
            header={withHeader ? <Text size="2" weight="bold" style={{ color: "var(--ds-text-strong)" }}>Settings</Text> : undefined}
          >
            {rows.map((r) => (
              <ListItem
                key={r.label}
                startContent={showIcons ? <span style={{ color: "var(--ds-icon-interactive)" }}>{r.icon}</span> : undefined}
                label={r.label}
                description={r.description}
                endContent={interactive ? <CaretRight style={{ color: "var(--ds-icon-neutral)" }} /> : undefined}
                onClick={interactive ? () => {} : undefined}
              />
            ))}
          </List>
        </Box>
        <PropsLead />
        <Rule />
        <Section title="Props reference" lead={<>Every prop <Code>List</Code> and <Code>ListItem</Code> add.</>}>
          <PropTable rows={PROPS} />
        </Section>
      </Page>
    );
  },
};

/* ---- History -------------------------------------------------------------- */
export const History: Story = {
  render: () => (
    <Page>
      <PageHeader title="List · History" standfirst={DEFINITION} />
      <Section title="Decisions" lead="The rulings this component encodes.">
        <Flex direction="column" gap="3">
          <Decision id="[[item-row-primitive]] · The Item primitive">
            List and ListItem sit on a shared <Code>_internal</Code> <strong>Item</strong> row primitive (built once,
            like <Code>Field</Code>) so the <em>marker · start · label(+description) · end</em> anatomy — and the
            interactivity guard — are written once and reused by List and <Code>TreeList</Code>.
          </Decision>
          <Decision id="[[item-row-primitive]] · interactivity guard">
            A row goes interactive via <Code>onClick</Code>/<Code>href</Code>. With <strong>no parent role</strong>,
            the content is wrapped in an <strong>invisible <Code>&lt;button&gt;</Code>/<Code>&lt;a&gt;</Code></strong>
            (one keyboard-operable control, focus ring hoisted via <Code>:has(:focus-visible)</Code>); the root adds an
            extended hit area that <strong>ignores clicks on nested interactives</strong> (no double-fire). With a
            parent <Code>role</Code> (menu/tree), the parent owns keyboard and <Code>onClick</Code> rides the root
            through the same guard.
          </Decision>
          <Decision id="[[item-row-primitive]] · passive, not a menu">
            List is <strong>passive</strong> — a semantic collection, not an actions surface. Menus (roving focus,
            <Code>menuitem</Code>) are <Code>DropdownMenu</Code>; trees are <Code>TreeList</Code>. Overusing List for
            those loses the right roles and keyboard model.
          </Decision>
          <Decision id="[[item-row-primitive]] · Safari role=list + markers">
            Custom markers replace native <Code>list-style-type</Code> (so they align to the first text line and paint
            from <Code>--ds-text-strong</Code>). Because <Code>list-style:none</Code> makes Safari drop list
            semantics, a marker-less <Code>&lt;ul&gt;</Code> re-adds <Code>role="list"</Code>; a numbered list is a real
            <Code>&lt;ol&gt;</Code> with a CSS counter (seeded from <Code>start</Code>).
          </Decision>
          <Decision id="[[item-row-primitive]] · zero net-new tokens">
            All paint reuses shipped <Code>--ds-*</Code> roles (text, the <Code>--ds-fill-hover</Code>/
            <Code>--ds-fill-selected-subtle</Code> Select-menu highlight vocabulary, <Code>--ds-stroke-weak</Code>
            dividers, the [[focus-ring]] focus ring (<Code>--ds-stroke-focus</Code>), the motion ladder). No new tokens; no
            <Code>!important</Code>.
          </Decision>
          <Decision id="[[status-dot-edges]] · strong description on a selected row">
            On the <Code>--ds-fill-selected-subtle</Code> tint the <Code>--ds-text-weak</Code> description read as
            low as 3.64:1 in light and 4.03:1 and APCA Lc 47.0 in dark, under the text floors of 4.5:1 and Lc 60.
            A selected row now sets its description in <Code>--ds-text-strong</Code>, at 10.13:1 or more in light
            and 7.28:1 and Lc 82.1 or more in dark, and the tint stays, so every selected row in List, SideNav,
            TopNav, TreeList and MobileNav keeps the tint Select, the CommandPalette and the current Pagination
            page share. The label keeps its [[selected-row-cue]] weight and ink.
          </Decision>
        </Flex>
      </Section>
      <Rule />
      <Section title="Changelog" lead="Notable changes, newest first — grows as the component evolves.">
        <Flex direction="column" gap="3">
          <Decision id="0.9.0">
            Initial <Code>System/List</Code> + <Code>ListItem</Code> on the net-new <Code>_internal</Code>
            <Code>Item</Code> primitive: slots, three densities, dividers, disc/circle/decimal markers,
            labelled header, interactive rows via the invisible-button guard, the Safari <Code>role="list"</Code> fix,
            and the ordered-list counter with <Code>start</Code>.
          </Decision>
        </Flex>
      </Section>
    </Page>
  ),
};
