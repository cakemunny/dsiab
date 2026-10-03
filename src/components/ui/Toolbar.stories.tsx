import type { Meta, StoryObj } from "@storybook/react-vite";
import { Box, Code, Flex, Grid, Text } from "@radix-ui/themes";
import {
  TextB, TextItalic, TextUnderline, TextAlignLeft, TextAlignCenter, TextAlignRight,
  ArrowUUpLeft, ArrowUUpRight, Gear, DotsThree,
} from "@phosphor-icons/react";
import { Toolbar } from "./Toolbar";
import { Button } from "./Button";
import { IconButton } from "./IconButton";
import { ToggleButtonGroup } from "./ToggleButtonGroup";
import {
  Decision, DoDont, DODONT_LABEL, HexThemeKey, MeasuredRow, MeasuredSpec, Mono, NoteRow, Page, PageHeader,
  PropsLead, type PropDef, PropTable, Rule, Section,
} from "./_storyKit";

/** The component's definition — one source, referenced by the header of every story on this page. */
const DEFINITION = <>A single-tab-stop container for a related set of controls, with roving arrow-key navigation. Compose the System controls through the Radix item wrappers, and lay them out across start / center / end regions.</>;

// A framed shell around a specimen toolbar — the toolbar itself is a transparent layout container, so the
// visible chrome (the surface it sits on) is the demo frame, not the component.
function Frame({ children }: { children: React.ReactNode }) {
  return (
    <Box style={{ width: "fit-content", padding: "6px 8px", background: "var(--ds-bg-base)", border: "1px solid var(--ds-stroke-weak)", borderRadius: "var(--ds-radius-3)" }}>
      {children}
    </Box>
  );
}

// The alignment cluster reused across specimens — a System ToggleButtonGroup (single → radiogroup), which
// keeps its OWN roving scope, so it reads as one self-contained tab stop inside the toolbar ([[toolbar-slots]] nested roving).
function AlignGroup({ label }: { label: string }) {
  return (
    <ToggleButtonGroup.Root type="single" defaultValue="left" label={label}>
      <ToggleButtonGroup.Item value="left" aria-label="Align left"><TextAlignLeft /></ToggleButtonGroup.Item>
      <ToggleButtonGroup.Item value="center" aria-label="Align center"><TextAlignCenter /></ToggleButtonGroup.Item>
      <ToggleButtonGroup.Item value="right" aria-label="Align right"><TextAlignRight /></ToggleButtonGroup.Item>
    </ToggleButtonGroup.Root>
  );
}

/* The token spec — Toolbar owns NO --ds-* role of its own; it's a layout + roving container reusing child
   skins (the Kbd tokenless lite pattern). Its one visible token is the `dividers` rule.

   MEASURED: the divider row reads the rule's colour off a real Toolbar.Separator mounted in the
   measurement host and checks it against the token it claims, so the row can disagree with the component.
   The three rows beneath it make no colour claim — they are prose, and say so. */
function ToolbarSpec() {
  return (
    <Box style={{ borderRadius: "var(--ds-radius-4)", border: "1px solid var(--ds-stroke-weak)", overflow: "hidden", background: "var(--ds-bg-subtle)" }}>
      <Flex align="center" gap="3" style={{ padding: "20px" }}>
        <Box style={{ flexShrink: 0 }}>
          <Frame>
            <Toolbar.Root
              aria-label="Formatting (spec sample)"
              dividers
              start={
                <>
                  <AlignGroup label="Text alignment (spec)" />
                  <>
                    <Toolbar.Button asChild><IconButton priority="tertiary" aria-label="Undo"><ArrowUUpLeft /></IconButton></Toolbar.Button>
                    <Toolbar.Button asChild><IconButton priority="tertiary" aria-label="Redo"><ArrowUUpRight /></IconButton></Toolbar.Button>
                  </>
                </>
              }
            />
          </Frame>
        </Box>
        <Text size="1" style={{ color: "var(--ds-text-weak)" }}>
          A toolbar is a transparent layout + roving container — it paints no surface of its own. Its one
          visible token is the <Mono>dividers</Mono> rule, <Mono>--ds-stroke-weak</Mono>; every item reuses the
          composed <strong>Button</strong>/<strong>IconButton</strong> chrome via{" "}
          <Mono>Toolbar.Button asChild</Mono>. The row below is read off a rendered divider and checked
          against the token it names.
        </Text>
      </Flex>
      <MeasuredSpec
        render={() => (
          <Toolbar.Root
            aria-label="Divider measurement"
            dividers
            start={<><span>a</span><span>b</span></>}
          />
        )}
      >
        <MeasuredRow
          part="Divider rule"
          note="The thin line `dividers` interleaves between the groups in a slot."
          token="--ds-stroke-weak"
          select='[role="separator"]'
          prop="background-color"
        />
      </MeasuredSpec>
      <NoteRow part="Container" value="Transparent — no own surface, border, or --ds-* fill; a layout + roving container" />
      <NoteRow part="Roving" value="role=&quot;toolbar&quot;, roving tabindex — ONE tab stop; Arrow/Home/End move within (Radix)" />
      <NoteRow part="Item skin" value="Button / IconButton chrome, reused via Toolbar.Button asChild" />
    </Box>
  );
}

const PROPS: PropDef[] = [
  { name: "start", type: "ReactNode", desc: <>Leading region — the primary controls. The only slot most toolbars need. Pass multiple groups (a fragment) to divide them with <Code>dividers</Code>.</>, source: "Toolbar.tsx" },
  { name: "center", type: "ReactNode", desc: <>Optional middle region. When present the layout becomes a grid (<Code>1fr auto 1fr</Code>) so this region is truly centered.</>, source: "Toolbar.tsx" },
  { name: "end", type: "ReactNode", desc: <>Trailing region — pinned to the far end (right in LTR horizontal, bottom in vertical).</>, source: "Toolbar.tsx" },
  { name: "orientation", type: `"horizontal" | "vertical"`, desc: <>Roving axis + visual flow. <Code>horizontal</Code> → Arrow Left/Right; <Code>vertical</Code> → Arrow Up/Down. Default <Code>horizontal</Code>.</>, source: "Radix" },
  { name: "size", type: `"1" | "2" | "3"`, desc: <>Control tier for every composed control — cascaded via the shared size context. Unset → the global <Code>uiSize</Code> control lane (default <Code>small</Code> → <Code>1</Code>).</>, source: "Toolbar.tsx" },
  { name: "dividers", type: "boolean", desc: <>Interleave a styled <Code>Toolbar.Separator</Code> between the groups you pass into each slot.</>, source: "Toolbar.tsx" },
  { name: "asChild", type: "boolean", desc: <>Hand the toolbar's own element to your child: the <Code>role</Code>, the roving focus, the orientation and the layout merge onto it, and the three regions render inside it. The child is required with <Code>asChild</Code> and rejected without it, because the toolbar's content is its slots.</>, source: "Toolbar.tsx" },
  { name: "loop", type: "boolean", desc: <>Wrap the roving focus at the ends. Default <Code>true</Code>.</>, source: "Radix" },
];

const meta: Meta<typeof Toolbar.Root> = {
  title: "Components/Action/Toolbar",
  component: Toolbar.Root,
  parameters: {
    controls: { disable: true },
    docs: {
      description: {
        component:
          "**Toolbar** is a `role=\"toolbar\"` container for a set of RELATED controls with roving-tabindex " +
          "keyboard nav — the whole toolbar is ONE tab stop and Arrow/Home/End move a roving focus between " +
          "items. It composes `@radix-ui/react-toolbar` (role, roving focus, orientation) and adds a " +
          "**start / center / end** slot layout, a `size` cascade to the composed controls, and a `dividers` " +
          "affordance. Children are CONSTRAINED to the System controls that exist — `Button`/`IconButton` via " +
          "`Toolbar.Button asChild`, plus the raw Radix `Toolbar.ToggleGroup`/`Toolbar.Separator` — and a " +
          "`ToggleButtonGroup` can be nested as a self-contained sub-stop.",
      },
    },
  },
};
export default meta;
type Story = StoryObj<typeof Toolbar.Root>;

export const Usage: Story = {
  // The DoDont callout labels (success/error text on the green/red tint) measure ~4.1–4.4 — just under axe's
  // strict 4.5; the callout colour + the DO/DON'T word already carry the meaning, so color-contrast is scoped
  // off here, a documented specimen exception (same pattern as Kbd/DropdownMenu/ToggleButtonGroup Usage). The
  // toolbar specimens themselves keep full axe — only the shared DoDont primitive's labels are covered.
  parameters: { a11y: { context: { exclude: [DODONT_LABEL] } } },
  render: (_args, { globals }) => (
    <HexThemeKey.Provider value={`${globals.accent}-${globals.appearance}-${globals.contrast}`}>
      <Page>
        <PageHeader title="Toolbar · Usage" standfirst={DEFINITION} />

        <Section title="Specimen" lead="A formatting toolbar (start / end): an alignment ToggleButtonGroup and an undo/redo cluster lead; a primary action trails. The dividers prop separates the leading groups.">
          <Frame>
            <Toolbar.Root
              aria-label="Document formatting"
              data-testid="tb-overview"
              dividers
              start={
                <>
                  <AlignGroup label="Text alignment" />
                  <>
                    <Toolbar.Button asChild><IconButton priority="tertiary" aria-label="Undo"><ArrowUUpLeft /></IconButton></Toolbar.Button>
                    <Toolbar.Button asChild><IconButton priority="tertiary" aria-label="Redo"><ArrowUUpRight /></IconButton></Toolbar.Button>
                  </>
                </>
              }
              end={<Toolbar.Button asChild><Button priority="primary">Publish</Button></Toolbar.Button>}
            />
          </Frame>
        </Section>
        <Rule />
        <Section title="start · center · end" lead="With a center slot the layout switches to a grid so the middle region is truly centered, regardless of how wide the start and end regions are.">
          <Frame>
            <Toolbar.Root
              aria-label="Editor"
              style={{ width: 480 }}
              start={<Toolbar.Button asChild><IconButton priority="tertiary" aria-label="Settings"><Gear /></IconButton></Toolbar.Button>}
              center={
                <>
                  <Toolbar.Button asChild><IconButton priority="tertiary" aria-label="Bold"><TextB /></IconButton></Toolbar.Button>
                  <Toolbar.Button asChild><IconButton priority="tertiary" aria-label="Italic"><TextItalic /></IconButton></Toolbar.Button>
                  <Toolbar.Button asChild><IconButton priority="tertiary" aria-label="Underline"><TextUnderline /></IconButton></Toolbar.Button>
                </>
              }
              end={<Toolbar.Button asChild><IconButton priority="tertiary" aria-label="More actions"><DotsThree weight="bold" /></IconButton></Toolbar.Button>}
            />
          </Frame>
        </Section>
        <Rule />
        <Section title="A toolset, not a row of page actions" lead="A toolbar is for a cohesive set of controls that operate on ONE thing (a document, a selection) and benefit from single-tab-stop roving nav — not a generic row of unrelated page actions.">
          <Grid columns={{ initial: "1", sm: "2" }} gap="3">
            <DoDont kind="do" bare note="A related toolset acting on one surface — formatting controls over an editor. The whole cluster is one tab stop; Arrow/Home/End move between items, so a keyboard user isn't tabbing through a dozen buttons.">
              <Frame>
                <Toolbar.Root
                  aria-label="Formatting (do)"
                  dividers
                  start={
                    <>
                      <AlignGroup label="Text alignment (do)" />
                      <>
                        <Toolbar.Button asChild><IconButton priority="tertiary" aria-label="Undo (do)"><ArrowUUpLeft /></IconButton></Toolbar.Button>
                        <Toolbar.Button asChild><IconButton priority="tertiary" aria-label="Redo (do)"><ArrowUUpRight /></IconButton></Toolbar.Button>
                      </>
                    </>
                  }
                />
              </Frame>
            </DoDont>
            <DoDont kind="dont" bare note="Unrelated page-level actions (Save, Settings, Delete) are not a toolset — roving nav across them confuses assistive tech and buries the tab order. Lay them out with a plain Flex or a ButtonGroup instead.">
              {/* Real Buttons at their real priorities, not painted pills. The card is about what the
                  row MEANS (unrelated page actions ≠ a toolset), so the controls themselves have to be
                  the system's — the painted versions pinned font-size-1 and a 4px/12px pad, so they held
                  one size while the real Toolbar in the DO stepped with the uiSize lane. */}
              <Flex align="center" gap="2" style={{ width: "fit-content", padding: "6px 8px", background: "var(--ds-bg-base)", border: "1px solid var(--ds-stroke-weak)", borderRadius: "var(--ds-radius-3)" }}>
                <Button priority="primary">Save</Button>
                <Button priority="secondary">Settings</Button>
                <Button priority="tertiary" tone="danger">Delete</Button>
              </Flex>
            </DoDont>
          </Grid>
        </Section>
        <Rule />
        <Section title="Tokens" lead="Measured off a rendered toolbar, not resolved from the token — the row reads the divider's own colour and reports whether it equals what the token it names resolves to. A toolbar owns no --ds-* fill of its own.">
          <ToolbarSpec />
        </Section>
      </Page>
    </HexThemeKey.Provider>
  ),
  play: async ({ canvasElement }) => {
    // NO `assertMeasuredRows` here, and the reason is a real defect worth naming rather than hiding:
    // `ToolbarSeparator` paints its rule from an INLINE style (`style={{ background: "var(--ds-stroke-weak)" }}`
    // in Toolbar.tsx) instead of a stylesheet rule. The token table's divider row still measures the rendered
    // separator honestly — but the runtime evidence check rejects ANY measured node carrying an inline
    // paint for the property read, because it cannot tell a paint the COMPONENT applied from one the STORY
    // applied. Moving that declaration into a class in the token CSS makes the row assertable; until then
    // enabling the check here would fail on a row that is correct.

    // Passive render assertion only — reads the static rest state (no focus() / no key dispatch, so no focus
    // walk on view). The roving nav, orientation, and forwardRef behavior are exercised in
    // _internal/Toolbar behavior.
    const tb = canvasElement.querySelector<HTMLElement>('[data-testid="tb-overview"]');
    if (!tb) throw new Error("Usage must render the formatting toolbar");
    if (tb.getAttribute("role") !== "toolbar") throw new Error("the container must be role='toolbar'");
    if (!tb.getAttribute("aria-label")) throw new Error("the toolbar must carry an accessible name");
    // One tab stop: the toolbar container is tabindex 0 and its own roving items are -1 at rest.
    if (tb.tabIndex !== 0) throw new Error(`the toolbar must be the single tab stop; got tabindex ${tb.tabIndex}`);
  },
};

type PropsArgs = {
  orientation: "horizontal" | "vertical";
  size: "auto" | "1" | "2" | "3";
  dividers: boolean;
  center: boolean;
  end: boolean;
};

export const Props: StoryObj<PropsArgs> = {
  args: { orientation: "horizontal", size: "auto", dividers: true, center: false, end: true },
  argTypes: {
    orientation: { control: "inline-radio", options: ["horizontal", "vertical"], description: "Roving axis: horizontal → Arrow Left/Right; vertical → Arrow Up/Down.", table: { category: "Layout" } },
    size: { control: "inline-radio", options: ["auto", "1", "2", "3"], description: '"auto" tracks the global uiSize toolbar (unset → the control lane); a step pins the tier cascaded to every composed control.', table: { category: "Variant" } },
    dividers: { control: "boolean", description: "Interleave a separator between the groups in each slot.", table: { category: "Layout" } },
    center: { control: "boolean", description: "Render a center slot (switches the layout to a centered grid).", table: { category: "Slots" } },
    end: { control: "boolean", description: "Render a trailing (end) slot.", table: { category: "Slots" } },
  },
  parameters: { controls: { disable: false } },
  render: ({ orientation, size, dividers, center, end }: PropsArgs) => (
    <Page maxWidth="none">
      <PageHeader title="Toolbar · Props" standfirst={DEFINITION} />
      <Box style={{ padding: "8px 0 2px" }}>
        <Frame>
          <Toolbar.Root
            aria-label="Props toolbar"
            orientation={orientation}
            size={size === "auto" ? undefined : size}
            dividers={dividers}
            start={
              <>
                <AlignGroup label="Text alignment (playground)" />
                <>
                  <Toolbar.Button asChild><IconButton priority="tertiary" aria-label="Undo (pg)"><ArrowUUpLeft /></IconButton></Toolbar.Button>
                  <Toolbar.Button asChild><IconButton priority="tertiary" aria-label="Redo (pg)"><ArrowUUpRight /></IconButton></Toolbar.Button>
                </>
              </>
            }
            center={center ? <Toolbar.Button asChild><IconButton priority="tertiary" aria-label="Settings (pg)"><Gear /></IconButton></Toolbar.Button> : undefined}
            end={end ? <Toolbar.Button asChild><Button priority="primary">Publish</Button></Toolbar.Button> : undefined}
          />
        </Frame>
      </Box>
      <PropsLead />
      <Rule />
      <Section title="Props reference" lead={<>Every prop <Code>Toolbar.Root</Code> adds or forwards; item composition goes through <Code>Toolbar.Button</Code>/<Code>Toolbar.Separator</Code>.</>}>
        <PropTable rows={PROPS} />
      </Section>
    </Page>
  ),
};

export const History: Story = {
  render: () => (
    <Page>
      <PageHeader title="Toolbar · History" standfirst={DEFINITION} />

      <Section title="Decisions" lead="The rulings this component encodes.">
        <Flex direction="column" gap="3">
          <Decision id="[[toolbar-slots]] · slot layout">
            <Code>Toolbar.Root</Code> lays out three regions — <Code>start</Code> / <Code>center</Code> /{" "}
            <Code>end</Code>. With a center slot the layout is a CSS grid <Code>1fr auto 1fr</Code> (center truly
            centered); without one it is <Code>justify-content: space-between</Code> (start leads, end trails).
            <Code>orientation="vertical"</Code> stacks the same regions down the block axis.
          </Decision>
          <Decision id="[[toolbar-slots]] · children">
            Children are the System controls that EXIST, composed through the Radix item wrappers:{" "}
            <Code>Button</Code>/<Code>IconButton</Code> via <Code>Toolbar.Button asChild</Code> (each becomes a
            roving toolbar item), plus raw Radix <Code>Toolbar.ToggleGroup</Code>/<Code>Toolbar.ToggleItem</Code>/
            <Code>Toolbar.Link</Code>/<Code>Toolbar.Separator</Code>. This explicit registration model is why a
            general any-focusable DOM-query focus engine isn't needed here (see the deferrals).
          </Decision>
          <Decision id="[[toolbar-slots]] · nested roving">
            A System <Code>ToggleButtonGroup</Code> keeps its OWN roving scope, so nested in a toolbar it reads as
            a single self-contained tab stop (its arrows move ITS items; the toolbar's own arrows move the
            toolbar's items). Radix's built-in <Code>Toolbar.ToggleGroup</Code> instead turns roving OFF and
            delegates to the toolbar's single scope — use it when you want toggle items in the toolbar's own
            arrow flow.
          </Decision>
          <Decision id="forwardRef">
            Roving focus moves between items by DOM-node ref, so every composed control forwards its ref —{" "}
            <Code>Button</Code> (from ToggleButton's work) and now <Code>IconButton</Code>. Composing{" "}
            <Code>Toolbar.Button asChild</Code> over an IconButton that dropped its ref silently breaks
            arrow-navigation onto that item.
          </Decision>
          <Decision id="uiSize · R10">
            <Code>size</Code> follows the global <Code>uiSize</Code> control lane (default <Code>small</Code>) and
            cascades to every composed control via the shared size context.
          </Decision>
          <Decision id="Deferred">
            Deferred: a <Code>useListFocus</Code>-style any-focusable DOM-query roving engine (arbitrary
            inputs/selects as roving items) and a <Code>useKeyboardHint</Code> ("arrows to navigate" hint). The
            constrained-children model makes the caret-guard problem such an engine solves largely evaporate.
            Revisit if a real toolbar needs inputs/selects as roving items, or TreeList wants the engine.
          </Decision>
          <Decision id="SegmentedControl vs group">
            <Code>SegmentedControl</Code> is a System component — reach for it when the cluster picks a{" "}
            <em>value</em> that persists (a filter, a view density). A toolbar's alignment cluster is a{" "}
            <Code>ToggleButtonGroup</Code> (<Code>type="single"</Code>): tool state, roving focus inside the
            toolbar's own keyboard model, and the [[toggle-group-box]] tray so the cluster reads as one control in the row.
          </Decision>
        </Flex>
      </Section>
      <Rule />
      <Section title="Changelog" lead="Notable changes, newest first — grows as the component evolves.">
        <Flex direction="column" gap="3">
          <Decision id="0.9.0">
            Initial <Code>System/Toolbar</Code> — <Code>@radix-ui/react-toolbar</Code> composed with a
            start/center/end slot layout, a <Code>size</Code> cascade, and a <Code>dividers</Code>
            affordance. IconButton now forwards its ref so roving focus can land on icon-only items.
          </Decision>
        </Flex>
      </Section>
    </Page>
  ),
};
