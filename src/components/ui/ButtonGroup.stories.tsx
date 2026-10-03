import type { Meta, StoryObj } from "@storybook/react-vite";
import { Box, Code, Flex, Grid, Text } from "@radix-ui/themes";
import { Copy, PencilSimple, TextB, TextItalic, TextUnderline, Trash } from "@phosphor-icons/react";
import { ButtonGroup } from "./ButtonGroup";
import { Button } from "./Button";
import { IconButton } from "./IconButton";
import { TextField } from "./TextField";
import {
  Caption, Decision, DoDont, DODONT_LABEL, HexThemeKey, MeasuredRow, MeasuredSpec, Mono, NoteRow, Page, PageHeader,
  PropsLead, type PropDef, PropTable, Rule, Scenario, Section,
} from "./_storyKit";
import { awaitMeasuredRows } from "../../foundations/_assert";

/** The one definition of this component — the standfirst every page of it opens with. */
const DEFINITION = (
  <>
    The row a set of related actions sits in. It owns two decisions so no screen has to make them again —
    one flat <Code>8px</Code> between controls, and the solid action anchored per the system{" "}
    <strong>buttonOrder</strong>, with the cluster's alignment following the anchor. It paints nothing:
    every pixel you can see belongs to the controls inside it.
  </>
);

/* Every specimen on this page rides the ambient lanes — no `size` is pinned anywhere except the one
   place the pin IS the lesson (the ghost row's `gap="0"`). ButtonGroup resolves no size of its own,
   so a pinned specimen here would be pinning the CHILDREN and hiding the thing worth showing: the
   controls grow with the global size setting while the cluster's gap holds still. */

/** A confirm panel — the shape a footer cluster actually lands in. The chrome is the mock; the only
 *  component on show is the ButtonGroup holding the two actions. */
function ConfirmPanel() {
  return (
    <Box style={{ width: 300, background: "var(--ds-bg-overlay)", border: "1px solid var(--ds-stroke-weak)", borderRadius: "var(--ds-radius-4)", boxShadow: "var(--ds-shadow-overlay)", overflow: "hidden" }}>
      <Flex direction="column" gap="2" style={{ padding: "16px 16px 12px" }}>
        <Text size="3" weight="bold" style={{ color: "var(--ds-text-strong)" }}>Archive 3 files</Text>
        <Text size="2" style={{ color: "var(--ds-text-weak)", lineHeight: 1.5 }}>
          They leave Shared drafts and stop appearing in search. Anyone on the team can restore them
          from Archive later.
        </Text>
      </Flex>
      <Box style={{ padding: "12px 16px", borderTop: "1px solid var(--ds-stroke-weak)", background: "var(--ds-bg-subtle)" }}>
        <ButtonGroup data-testid="bg-confirm-footer">
          <Button priority="primary">Archive files</Button>
          <Button priority="secondary">Cancel</Button>
        </ButtonGroup>
      </Box>
    </Box>
  );
}

/** A settings form's action row — the second place almost every cluster shows up. The field is the
 *  system's own TextField rather than a painted stand-in, so it rides the same control lane the
 *  buttons under it do: at every size the field and the cluster stay the same tier as each other. */
function SettingsForm() {
  return (
    <Box style={{ width: 300, background: "var(--ds-bg-base)", border: "1px solid var(--ds-stroke-weak)", borderRadius: "var(--ds-radius-4)", padding: 16 }}>
      <Flex direction="column" gap="4">
        <TextField label="Workspace name" defaultValue="Northwind Design" />
        <ButtonGroup>
          <Button priority="primary">Save changes</Button>
          <Button priority="secondary">Discard</Button>
        </ButtonGroup>
      </Flex>
    </Box>
  );
}

/** A file row's trailing utilities. The one specimen that pins its gap, and the caption says why:
 *  ghost controls carry no resting surface, so flush is the rhythm that reads right. */
function FileRow() {
  return (
    <Flex
      align="center"
      justify="between"
      gap="3"
      style={{ width: 300, padding: "8px 12px", background: "var(--ds-bg-base)", borderTop: "1px solid var(--ds-stroke-weak)", borderBottom: "1px solid var(--ds-stroke-weak)" }}
    >
      <Text size="2" style={{ color: "var(--ds-text-strong)", whiteSpace: "nowrap" }}>Q3 revenue model</Text>
      <ButtonGroup gap="0">
        <IconButton priority="tertiary" aria-label="Rename Q3 revenue model"><PencilSimple /></IconButton>
        <IconButton priority="tertiary" aria-label="Duplicate Q3 revenue model"><Copy /></IconButton>
        <IconButton priority="tertiary" tone="danger" aria-label="Delete Q3 revenue model"><Trash /></IconButton>
      </ButtonGroup>
    </Flex>
  );
}

/* The token spec — and the honest version of it is short. ButtonGroup paints NOTHING: no surface, no
   border, no --ds-* fill. What it owns is one length, the space between two controls, so that is the
   one row that can be measured. It reads `column-gap` off a rendered cluster and checks it against
   the scale step the component asks Flex for; everything the reader might expect to find here and
   will not is stated as prose beneath it, rather than invented as a row. */
function ClusterSpec() {
  return (
    <Box style={{ borderRadius: "var(--ds-radius-4)", border: "1px solid var(--ds-stroke-weak)", overflow: "hidden", background: "var(--ds-bg-subtle)" }}>
      <Flex align="center" gap="4" wrap="wrap" style={{ padding: "20px" }}>
        <Box style={{ flexShrink: 0 }}>
          <ButtonGroup>
            <Button priority="primary">Save changes</Button>
            <Button priority="secondary">Cancel</Button>
          </ButtonGroup>
        </Box>
        <Text size="1" style={{ color: "var(--ds-text-weak)", maxWidth: 420, lineHeight: 1.6 }}>
          A cluster paints no surface of its own — the controls bring all of it. The single value it
          owns is the space between them: <Mono>--space-2</Mono>, the step the system also spells{" "}
          <Mono>--ds-space-8</Mono>. The row below is read off a rendered cluster, so it can disagree
          with the component.
        </Text>
      </Flex>
      <MeasuredSpec
        render={() => (
          <ButtonGroup data-testid="bg-gap-measure">
            <Button priority="primary">Save changes</Button>
            <Button priority="secondary">Cancel</Button>
          </ButtonGroup>
        )}
      >
        <MeasuredRow
          part="Cluster gap"
          note="The space between two controls in the row — one flat step, unchanged at every size."
          token="--space-2"
          select='[data-testid="bg-gap-measure"]'
          prop="column-gap"
        />
      </MeasuredSpec>
      <NoteRow part="Surface" value="None — no background, border, radius or shadow; the cluster is a layout box and nothing else" />
      <NoteRow part="Control skin" value="Whatever the children are — Button / IconButton chrome, untouched (priority grades the emphasis)" />
      <NoteRow part="Alignment" value="justify follows the resolved order — start for primary-first, end for primary-last; an explicit justify wins" />
      <NoteRow part="Size" value="No size of its own: each control reads the ambient control lane, and the gap does not scale with it" />
      <NoteRow part="Cross-axis" value="align=&quot;center&quot;, wrap=&quot;wrap&quot; — a cluster too wide for its container drops to a second line rather than clipping" />
    </Box>
  );
}

const PROPS: PropDef[] = [
  { name: "children", type: "ReactNode", desc: <>The controls in the cluster. A child with <Code>priority="primary"</Code> is the anchor; a single-element wrapper around one (a dialog action, a tooltip trigger) counts as that child, and a fragment is flattened so its buttons are seen individually.</>, source: "ButtonGroup.tsx" },
  { name: "order", type: `"primary-first" | "primary-last"`, def: "the system setting", desc: <>Where the solid action sits in THIS cluster. Unset, it follows the system <Code>buttonOrder</Code> set once on <Code>Provider</Code>. Set it only for a cluster that must deviate — a destructive confirm that has to read safe-action-first.</>, source: "ButtonGroup.tsx" },
  { name: "gap", type: `"0" | "1" | … | "9"`, def: `"2"`, desc: <>The space between controls, on the spacing scale. Default <Code>2</Code> (8px) at every size. Reach for <Code>0</Code> when every control is a ghost — with no resting surface to separate, flush is the rhythm that reads right.</>, source: "ButtonGroup.tsx" },
  { name: "justify", type: `"start" | "center" | "end" | "between"`, def: "follows the order", desc: <>Where the cluster sits in its container. Left unset it follows the resolved order (<Code>start</Code> for primary-first, <Code>end</Code> for primary-last); an explicit value overrides that. A cluster with no solid child gets none at all.</>, source: "Radix" },
  { name: "align", type: `"start" | "center" | "end" | "baseline" | "stretch"`, def: `"center"`, desc: <>Cross-axis alignment. Centred by default so controls of different heights sit on one line.</>, source: "ButtonGroup.tsx" },
  { name: "wrap", type: `"nowrap" | "wrap" | "wrap-reverse"`, def: `"wrap"`, desc: <>Wrapping. On by default: a cluster too wide for a narrow container drops to a second line instead of overflowing it.</>, source: "ButtonGroup.tsx" },
  { name: "direction", type: `"row" | "column" | "row-reverse" | "column-reverse"`, def: `"row"`, desc: <>Flow axis. A stacked cluster (<Code>column</Code>) is the narrow-container answer when wrapping is not enough.</>, source: "Radix" },
  { name: "asChild", type: "boolean", def: "false", desc: <>Render the cluster as the child element rather than a <Code>div</Code>. The controls are that element's children, so <Code>{"<ButtonGroup asChild><nav aria-label=\"Actions\">…</nav></ButtonGroup>"}</Code> renders one <Code>nav</Code> carrying the cluster's classes, and the primary still anchors because the ordering runs one level down. Before 2026-09-21 this prop type-checked and then threw inside Radix's <Code>Slot</Code>.</>, source: "ButtonGroup.tsx" },
  { name: "…Flex props", type: "ComponentProps<typeof Flex>", desc: <>Everything else a <Code>Flex</Code> takes, including <Code>width</Code> and the margin and padding props, passes straight through.</>, source: "Radix" },
];

const meta: Meta<typeof ButtonGroup> = {
  title: "Components/Action/ButtonGroup",
  component: ButtonGroup,
  parameters: {
    controls: { disable: true },
    docs: {
      description: {
        component:
          "**ButtonGroup** is the row a set of related actions sits in — a `Flex` that owns two " +
          "decisions so no call site has to make them again. **Spacing:** one flat `8px` between " +
          "controls, the same at every `uiSize`. **Order:** the solid (`priority=\"primary\"`) action " +
          "anchors per the system `buttonOrder` — `primary-first` by default, set once on `Provider` — " +
          "and the cluster's alignment follows, so a primary-first group leads at the start of its " +
          "container and a primary-last group pins to the end. The reorder happens in the DOM, so tab " +
          "order always matches what is on screen. A cluster with no solid child is left exactly as " +
          "authored. It paints nothing of its own: no surface, no border, no `--ds-*` fill.",
      },
    },
  },
};
export default meta;
type Story = StoryObj<typeof ButtonGroup>;

export const Usage: Story = {
  /* Two scoped exceptions; everything else on the page IS contrast-checked.
   *   DODONT_LABEL   the DO/DON'T word only — semantic step-11 ink on its own step-3 tint, under 4.5 at
   *                  12px bold. The colour and the word already carry the meaning. Scoped to the label,
   *                  so the specimens inside the cards keep full coverage.
   *   danger SOLID   entered at white on the red-9 solid #e5484d, 3.91 in both appearances, under the
   *                  retired 3:1 floor for text on a solid fill. [[text-on-solid-fill-contrast]] replaced
   *                  that floor with 4.5:1 and APCA Lc 60 and moved the danger fill to --error-solid,
   *                  and no current ruling excuses this button. The selector names the solid variant
   *                  alone, narrower than the Button page's, so the danger ghost icon button in the
   *                  row-utilities specimen stays fully checked. */
  parameters: { a11y: { context: { exclude: [DODONT_LABEL, ".rt-Button.rt-variant-solid[data-tone='danger']"] } } },
  render: (_args, { globals }) => (
    <HexThemeKey.Provider value={`${globals.accent}-${globals.appearance}-${globals.contrast}`}>
      <Page>
        <PageHeader
          title="ButtonGroup · Usage"
          standfirst={DEFINITION}
        />

        <Section
          title="Specimen"
          lead="The common pair — one solid commit and one surface escape. Nothing here is pinned: flip the Size toolbar and the controls step through the size ladder while the gap between them holds at 8px."
        >
          <ButtonGroup data-testid="bg-specimen">
            <Button priority="primary">Save changes</Button>
            <Button priority="secondary">Cancel</Button>
          </ButtonGroup>
          <Caption>
            The cluster is a layout box, so on this page it has no visible edge of its own — what you are
            looking at is two Buttons and the space the cluster puts between them.
          </Caption>
        </Section>

        <Rule />

        <Section
          title="Where the primary anchors"
          lead={<>The solid action moves to the end the system <Code>buttonOrder</Code> names, and the cluster justifies itself to that same end. The top row is what a cluster does when it does NOT pin — flip <strong>Btn order</strong> in the toolbar above and only the first specimen moves. The bottom row is the two pins, side by side: each holds its own end whatever the global says, and each takes the alignment its own order implies.</>}
        >
          <Grid columns={{ initial: "1", sm: "2" }} gapX="6" gapY="5">
            <Scenario
              label="FOLLOWS THE SYSTEM"
              caption={<>No <Code>order</Code> prop — the default. The solid takes whichever end the system setting names, and the cluster hangs from that edge.</>}
            >
              <ButtonGroup data-testid="bg-order-system">
                <Button priority="primary">Publish</Button>
                <Button priority="secondary">Save draft</Button>
              </ButtonGroup>
            </Scenario>
            <Scenario
              label="NO SOLID, NO REORDER"
              caption="Equal-weight utilities. With no solid child there is nothing to anchor, so the cluster leaves the author's order alone and forces no alignment."
            >
              <ButtonGroup data-testid="bg-order-none">
                <Button priority="secondary">Export CSV</Button>
                <Button priority="secondary">Duplicate</Button>
              </ButtonGroup>
            </Scenario>
            <Scenario
              label="PINNED — COMMIT FIRST"
              caption={<>A setup step pins <Code>order="primary-first"</Code> so the forward action leads the row under either system setting — and the cluster hangs from the START edge, because the alignment follows the pin rather than the global.</>}
            >
              <ButtonGroup data-testid="bg-order-pinned-first" order="primary-first">
                <Button priority="primary">Continue</Button>
                <Button priority="secondary">Back</Button>
              </ButtonGroup>
            </Scenario>
            <Scenario
              label="PINNED — SAFE ACTION FIRST"
              caption={<>A destructive confirm pins <Code>order="primary-last"</Code>: whatever the system setting is, the way out reads before the irreversible action — and the cluster hangs from the END edge, the mirror of the pin beside it.</>}
            >
              <ButtonGroup data-testid="bg-order-pinned" order="primary-last">
                <Button priority="primary" tone="danger"><Trash weight="bold" /> Delete project</Button>
                <Button priority="secondary">Cancel</Button>
              </ButtonGroup>
            </Scenario>
          </Grid>
        </Section>

        <Rule />

        <Section
          title="In context"
          lead="The three shapes a cluster actually lands in. All of them ride the toolbar — Accent re-skins them, Size steps the controls, Appearance flips light and dark."
        >
          <Grid columns={{ initial: "1", md: "3" }} gapX="6" gapY="5">
            <Scenario
              label="CONFIRM FOOTER"
              caption="The commit and the way out, in one cluster at the foot of the panel. The panel decides nothing about order — the cluster does, which is how every confirm in the system agrees without being told twice."
            >
              <ConfirmPanel />
            </Scenario>
            <Scenario
              label="FORM ACTIONS"
              caption="A settings form's action row. Same cluster, same 8px, and the same anchor rule as the confirm beside it — that repetition is what makes the two feel like one product."
            >
              <SettingsForm />
            </Scenario>
            <Scenario
              label="ROW UTILITIES — THE ONE PIN"
              caption={<>Ghost icon buttons pin <Code>gap="0"</Code>, and the pin IS the lesson: a control with no resting surface has nothing for a gap to hold apart, so 8px between them reads as a hole. Flush, the three sit as one utility block — and each still owns its own box and target.</>}
            >
              <FileRow />
            </Scenario>
          </Grid>
        </Section>

        <Rule />

        <Section
          title="Which container"
          lead="Three ways to lay out a row of controls, and they are not interchangeable — the difference is what the row MEANS, and what a keyboard does with it."
        >
          <Grid columns={{ initial: "1", sm: "2" }} gap="3">
            <DoDont
              kind="do"
              bare
              note="Related actions on one thing, one of which may be the primary — a footer, a form's action row, a card's trailing utilities. The cluster hands you the spacing and the anchor, and each control keeps its own tab stop, which is right for actions a keyboard user reaches one at a time."
            >
              <ButtonGroup>
                <Button priority="primary">Save changes</Button>
                <Button priority="secondary">Cancel</Button>
              </ButtonGroup>
            </DoDont>
            <DoDont
              kind="dont"
              bare
              note="Don't reach for it as a toolbar. A cohesive toolset acting on one surface — formatting controls over an editor — wants Toolbar: role=&quot;toolbar&quot;, ONE tab stop, and arrow keys between items. And for a layout that is not an action row at all, a plain Flex is the honest container; a ButtonGroup around non-actions inherits an anchor rule that means nothing there."
            >
              <Flex align="center" gap="2" style={{ width: "fit-content", padding: "6px 8px", background: "var(--ds-bg-base)", border: "1px solid var(--ds-stroke-weak)", borderRadius: "var(--ds-radius-3)" }}>
                <ButtonGroup gap="0" data-testid="bg-dont-toolbar">
                  <IconButton priority="tertiary" aria-label="Bold (don't)"><TextB /></IconButton>
                  <IconButton priority="tertiary" aria-label="Italic (don't)"><TextItalic /></IconButton>
                  <IconButton priority="tertiary" aria-label="Underline (don't)"><TextUnderline /></IconButton>
                </ButtonGroup>
              </Flex>
            </DoDont>
          </Grid>
          <Caption>
            The short test: <strong>actions on a thing</strong> → ButtonGroup. <strong>Tools for a
            surface</strong> → Toolbar. <strong>Anything that is not a row of actions</strong> → Flex.
          </Caption>
        </Section>

        <Rule />

        <Section
          title="Tokens"
          lead="Measured off a rendered cluster, not resolved from the token — the row reads the space the component really puts between two controls and reports whether it equals what the step it names resolves to. There is one row because there is one value; the rest of the table is prose, and says so."
        >
          <ClusterSpec />
        </Section>
      </Page>
    </HexThemeKey.Provider>
  ),
  play: async ({ canvasElement }) => {
    // The token row's EVIDENCE: it measured a real cluster, resolved its claim on a different node,
    // and the two agree.
    const rows = await awaitMeasuredRows(canvasElement, { rows: 1 });
    if (rows.measured !== 1 || rows.unproven !== 0) {
      throw new Error(`expected 1 measured / 0 unproven token rows, got ${rows.measured} / ${rows.unproven}`);
    }

    const cluster = (id: string) => {
      const el = canvasElement.querySelector<HTMLElement>(`[data-testid="${id}"]`);
      if (!el) throw new Error(`Usage must render the “${id}” cluster`);
      return el;
    };
    const solids = (el: HTMLElement) => Array.from(el.children).filter((c) => c.classList.contains("rt-variant-solid"));

    /* Passive render assertions — every one reads the static rest state. Nothing is clicked, focused
       or dispatched, so viewing this page never flashes a state at the reader. */

    // 1. THE ANCHOR, stated without depending on the toolbar's current setting: the solid sits at an
    //    END of the cluster, never in the middle. Which end is the global's business, and the two
    //    pinned assertions below cover both answers deterministically.
    const system = cluster("bg-order-system");
    const systemSolids = solids(system);
    if (systemSolids.length !== 1) throw new Error(`the system-following cluster must hold exactly one solid; got ${systemSolids.length}`);
    if (systemSolids[0] !== system.firstElementChild && systemSolids[0] !== system.lastElementChild) {
      throw new Error("the solid action must be anchored to an END of the cluster, not left mid-row");
    }

    // 2. THE TWO PINS. A pinned cluster holds its own order whatever the system setting is, and its
    //    alignment follows that order rather than being set separately. Both pins are asserted, which
    //    is what makes the "an END of the cluster" check above cover both answers rather than one.
    const pinnedFirst = cluster("bg-order-pinned-first");
    if (solids(pinnedFirst)[0] !== pinnedFirst.firstElementChild) {
      throw new Error('order="primary-first" must put the solid action first in the DOM');
    }
    if (!pinnedFirst.className.includes("rt-r-jc-start")) {
      throw new Error('order="primary-first" must justify the cluster to the start — the alignment follows the order');
    }

    const pinned = cluster("bg-order-pinned");
    if (solids(pinned)[0] !== pinned.lastElementChild) {
      throw new Error('order="primary-last" must put the solid action last in the DOM');
    }
    if (!pinned.className.includes("rt-r-jc-end")) {
      throw new Error('order="primary-last" must justify the cluster to the end — the alignment follows the order');
    }

    // 3. NO SOLID → NO OPINION. Nothing is reordered and no alignment is forced, so a row of
    //    equal-weight utilities keeps the order the page authored.
    const none = cluster("bg-order-none");
    if (solids(none).length !== 0) throw new Error("the no-solid cluster must not contain a primary");
    const labels = Array.from(none.children).map((c) => (c.textContent ?? "").trim());
    if (labels.join("|") !== "Export CSV|Duplicate") {
      throw new Error(`a cluster with no solid must keep the author's order; got ${labels.join(", ")}`);
    }
    if (/rt-r-jc-/.test(none.className)) {
      throw new Error(`a cluster with no solid must force no alignment; got class "${none.className}"`);
    }

    // 4. The in-context footer is a real cluster, not a hand-laid row — the specimen has to be the
    //    thing it documents.
    const footer = cluster("bg-confirm-footer");
    if (solids(footer).length !== 1) throw new Error("the confirm footer must hold exactly one solid action");
  },
};

type PGArgs = {
  order: "auto" | "primary-first" | "primary-last";
  gap: "0" | "1" | "2" | "3" | "4" | "5" | "6" | "7" | "8" | "9";
  justify: "auto" | "start" | "center" | "end" | "between";
  align: "start" | "center" | "end" | "baseline" | "stretch";
  direction: "row" | "column" | "row-reverse" | "column-reverse";
  wrap: "nowrap" | "wrap" | "wrap-reverse";
  primary: boolean;
};

export const Props: StoryObj<PGArgs> = {
  // "auto" is the default on both derived props, so the cluster starts out doing what it does in a
  // real screen: taking its order from the global toolbar and its alignment from that order.
  args: { order: "auto", gap: "2", justify: "auto", align: "center", direction: "row", wrap: "wrap", primary: true },
  argTypes: {
    order: { control: "inline-radio", options: ["auto", "primary-first", "primary-last"], description: '"auto" follows the global Btn order toolbar (prop unset); the other two pin this cluster.', table: { category: "Behaviour" } },
    gap: { control: "select", options: ["0", "1", "2", "3", "4", "5", "6", "7", "8", "9"], description: "Space between controls — the full spacing scale the prop reference documents. Default 2 (8px), flat at every size.", table: { category: "Layout" } },
    justify: { control: "select", options: ["auto", "start", "center", "end", "between"], description: '"auto" leaves it unset, so alignment follows the resolved order; anything else overrides that.', table: { category: "Layout" } },
    align: { control: "inline-radio", options: ["start", "center", "end", "baseline", "stretch"], description: "Cross-axis alignment. Default center.", table: { category: "Layout" } },
    direction: { control: "select", options: ["row", "column", "row-reverse", "column-reverse"], description: "Flow axis. Column stacks the cluster for a narrow container; the -reverse values run it the other way.", table: { category: "Layout" } },
    wrap: { control: "select", options: ["nowrap", "wrap", "wrap-reverse"], description: "Wrapping. Default wrap — a cluster too wide for its container drops to a second line; wrap-reverse puts that line above instead of below.", table: { category: "Layout" } },
    primary: { control: "boolean", description: "Include a solid action. Turn it OFF to see the passthrough: no solid, no reorder and no forced alignment.", table: { category: "Content" } },
  },
  parameters: { controls: { disable: false } },
  render: ({ order, gap, justify, align, direction, wrap, primary }: PGArgs) => (
    <Page maxWidth="none">
      <PageHeader title="ButtonGroup · Props" standfirst={DEFINITION} />
      <Box style={{ width: 420, padding: "12px 0", border: "1px dashed var(--ds-stroke-weak)", borderRadius: "var(--ds-radius-3)" }}>
        <ButtonGroup
          order={order === "auto" ? undefined : order}
          gap={gap}
          justify={justify === "auto" ? undefined : justify}
          align={align}
          direction={direction}
          wrap={wrap}
        >
          {primary ? <Button priority="primary">Save changes</Button> : <Button priority="secondary">Export CSV</Button>}
          <Button priority="secondary">Cancel</Button>
          <Button priority="tertiary">Learn more</Button>
        </ButtonGroup>
      </Box>
      <PropsLead />
      <Caption>
        The dashed box is the container, not the component — it is there so the cluster's alignment has
        something to hang from.
      </Caption>
      <Rule />
      <Section title="Props reference" lead={<>Every prop <Code>ButtonGroup</Code> adds or re-defaults; everything else is a <Code>Flex</Code> prop passed straight through.</>}>
        <PropTable rows={PROPS} />
      </Section>
    </Page>
  ),
};

export const History: Story = {
  render: () => (
    <Page>
      <PageHeader title="ButtonGroup · History" standfirst={DEFINITION} />
      <Section title="Decisions" lead="The rulings this component encodes.">
        <Flex direction="column" gap="3">
          <Decision id="[[button-cluster]] · the gap">
            <strong>One flat step between controls — 8px, at every size.</strong> The gap is a fixed{" "}
            <Code>gap="2"</Code> and deliberately does NOT scale with the global size setting: 8px reads
            correctly beside a control of any height, and a size-relative gap was tried and reverted. So
            spacing is a component rather than a number each screen re-decides. Override it per cluster
            when the fill calls for it — a row of ghosts sits <Code>gap="0"</Code>, because a control with
            no resting surface has nothing for a gap to separate, and the space reads as a hole instead.
          </Decision>
          <Decision id="[[button-cluster]] · the anchor">
            <strong>The primary anchors; the alignment follows it.</strong> The cluster reads the system{" "}
            <Code>buttonOrder</Code> — <Code>primary-first</Code> (the default) or <Code>primary-last</Code>,
            set once on <Code>Provider</Code> and previewable from the <strong>Btn order</strong> toolbar
            above — and moves the solid child to that end. Alignment is derived, not separate:{" "}
            <Code>primary-first</Code> justifies the cluster to the start, <Code>primary-last</Code> to the
            end, so the anchor also decides which edge of the container the row hangs from. The reorder is
            a DOM reorder, so tab order always matches the visual order. A per-cluster{" "}
            <Code>order</Code> prop overrides the system setting; an explicit <Code>justify</Code> overrides
            the derived alignment.
          </Decision>
          <Decision id="[[button-cluster]] · no primary, no opinion">
            A cluster with <em>no</em> solid child is left untouched — the author's order, and no forced
            alignment. Nothing is anchored because there is nothing to anchor: a row of equal-weight
            utilities is a list, and reordering it would be the component inventing a hierarchy the page
            did not ask for.
          </Decision>
          <Decision id="[[button-cluster]] · fragments">
            A fragment is flattened one level before the cluster looks for its primary. Without that,{" "}
            <Code>{"<>…</>"}</Code> counts as a single child, a two-button fragment reports no solid, and the
            cluster silently falls through to "author's order, no anchoring" — which is exactly how a
            confirm panel came to render Cancel-first while every other panel read primary-first. Fixing
            it in the cluster fixes every call site at once instead of each one remembering.
          </Decision>
          <Decision id="[[button-priority]]">
            The anchor keys on <Code>priority="primary"</Code>, the system's own button vocabulary, and{" "}
            <strong>one solid primary</strong> is the budget for a page. That is why "the primary" is
            singular here: a cluster is expected to hold at most one, and the one sanctioned exception —
            a destructive confirm pairing a safe solid with a danger solid — is the case the per-cluster{" "}
            <Code>order</Code> override exists for.
          </Decision>
          <Decision id="[[control-box-per-step]]">
            A size step names ONE control box, and every priority honours it, so a solid standing beside a
            ghost is the same height. The cluster depends on that: it sets no heights and does no
            vertical correction — it centres its children on the cross axis and trusts the row to agree
            with itself.
          </Decision>
          <Decision id="[[container-size-seeding]] · not a size container">
            <strong>The cluster resolves no size, so it seeds none.</strong> The rule that a container
            resolving a size must pass it to its slots binds a container that resolves one; this is a
            layout box, and every control inside it reads the ambient control lane directly. Two
            consequences worth stating: a mixed-size cluster is possible and is an authoring mistake
            rather than something the component prevents, and the gap holds at 8px while the controls
            around it grow.
          </Decision>
          <Decision id="Where it is already wired">
            The cluster is the channel the system's own action rows run through, so they inherit{" "}
            <Code>buttonOrder</Code> without re-implementing it: a Dialog's footer, an EmptyState's
            actions, and a Toast's action-plus-dismiss pair are all a ButtonGroup underneath.
          </Decision>
          <Decision id="asChild · the cluster as your element">
            <strong>The consumer's element can BE the cluster.</strong> Under <Code>asChild</Code> the
            controls arrive as that element's children, so the cluster reads them from there, anchors the
            primary, and hands Radix's <Code>Slot</Code> the one element it requires. The classes and the
            gap survive because <Code>Slot</Code> concatenates <Code>className</Code> and merges{" "}
            <Code>style</Code>. The rule this encodes is that a component owning one styled box and no
            behaviour tied to the tag name has no reason to refuse the seam.
          </Decision>
        </Flex>
      </Section>
      <Rule />
      <Section title="Changelog" lead="Notable changes, newest first — grows as the component evolves.">
        <Flex direction="column" gap="3">
          <Decision id="0.9.0 · documentation page">
            This documentation page. The cluster had none before it.
          </Decision>
          <Decision id="0.9.0 · asChild">
            <Code>asChild</Code> renders the cluster as the consumer's own element. The prop was in the
            type and reached <Code>Flex</Code> before this, so it type-checked and then threw{" "}
            <Code>Slot failed to slot onto its children</Code> at runtime: the cluster handed{" "}
            <Code>Slot</Code> its ordered ARRAY of controls, and <Code>Children.toArray</Code> rewraps
            even a lone element as an array, so a one-child cluster crashed too.
          </Decision>
          <Decision id="0.9.0 · fragment-wrapped clusters">
            Fragment-wrapped clusters are flattened before the primary is looked for, so a footer passed
            as <Code>{"<>…</>"}</Code> anchors like every other cluster.
          </Decision>
          <Decision id="0.9.0 · configurable order">
            Configurable order — a system default of <Code>primary-first</Code>, a per-cluster{" "}
            <Code>order</Code> override, and the toolbar control that previews both.
          </Decision>
          <Decision id="0.9.0">
            Initial <Code>ButtonGroup</Code> — the system's default control gap, made a component instead
            of a number repeated per screen; the gap follows the fill.
          </Decision>
        </Flex>
      </Section>
    </Page>
  ),
};
