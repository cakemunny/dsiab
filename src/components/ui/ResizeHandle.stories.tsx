import type { Meta, StoryObj } from "@storybook/react-vite";
import { Box, Code, Flex, Grid, Text } from "@radix-ui/themes";
import { useResizable } from "../../hooks/useResizable";
import type { ResizeOrientation } from "../../utils/resizableMath";
import { ResizeHandle } from "./ResizeHandle";
import {
  Decision, DoDont, DODONT_LABEL, HexThemeKey, MeasuredRow, MeasuredSpec, Mono, Page, PageHeader,
  PropsLead, type PropDef, PropTable, Rule, Section,
  Muted,
} from "./_storyKit";
import { assertMeasuredRows } from "../../foundations/_assert";

/* ---- the working specimen: two panes + a live ResizeHandle between them ---- */
/* ResizeHandle is presentational — the CONSUMER owns the `useResizable` call and hands the handle its
   `separatorProps` + `onDragStart`. This is exactly how Layout / SideNav wire it. The demo renders the
   engine's live `size` on the resizable pane so a reader can drag/keyboard it and watch it work. */
function TwoPaneDemo({
  orientation = "vertical",
  collapsible = false,
  defaultSize = 260,
  minSizePx = 160,
  maxSizePx = 420,
  label = "Resize the panel",
  testid,
}: {
  orientation?: ResizeOrientation;
  collapsible?: boolean;
  defaultSize?: number;
  minSizePx?: number;
  maxSizePx?: number;
  label?: string;
  testid?: string;
}) {
  const rz = useResizable({ orientation, collapsible, defaultSize, minSizePx, maxSizePx, "aria-label": label });
  const isVertical = orientation === "vertical";
  const paneSize = rz.isCollapsed ? 0 : rz.size;
  return (
    <Flex
      direction={isVertical ? "row" : "column"}
      data-testid={testid}
      style={{
        height: isVertical ? 220 : 320,
        border: "1px solid var(--ds-stroke-weak)",
        borderRadius: "var(--ds-radius-4)",
        overflow: "hidden",
        background: "var(--ds-bg-base)",
      }}
    >
      {/* Pane A — the resizable one; its width (or height) follows the engine's live size. */}
      <Box
        style={{
          [isVertical ? "width" : "height"]: paneSize,
          flexShrink: 0,
          overflow: "hidden",
          background: "var(--ds-bg-raised)",
        }}
      >
        <Box p="4">
          <Text size="1" weight="bold" style={{ color: "var(--ds-text-weak)", letterSpacing: "0.06em" }}>PANEL</Text>
          <Text as="p" size="2" mt="1" style={{ color: "var(--ds-text-strong)" }}>
            {isVertical ? `${Math.round(paneSize)}px wide` : `${Math.round(paneSize)}px tall`}
            {rz.isCollapsed ? " · collapsed" : ""}
          </Text>
        </Box>
      </Box>

      <ResizeHandle separatorProps={rz.separatorProps} onDragStart={rz.onDragStart} />

      {/* Pane B — fills the remaining space. */}
      <Box style={{ flex: 1, minWidth: 0, minHeight: 0, overflow: "hidden", background: "var(--ds-bg-base)" }}>
        <Box p="4">
          <Text size="1" weight="bold" style={{ color: "var(--ds-text-weak)", letterSpacing: "0.06em" }}>CONTENT</Text>
          <Text as="p" size="2" mt="1" style={{ color: "var(--ds-text-strong)", lineHeight: 1.6 }}>
            Drag the handle to resize, or focus it and use {isVertical ? "←/→" : "↑/↓"} (±10px), Shift+arrow
            (±50px), Home/End (min/max){collapsible ? ", Enter or double-click to collapse" : ""}.
          </Text>
        </Box>
      </Box>
    </Flex>
  );
}

/* ---- token spec: measured off a rendered handle ----------------------------
   Each row names an element and a property and reads that property off a real, wired ResizeHandle,
   then checks it against the token it claims — so a row can disagree with the component. The strengthen
   and focus rows read the declaration the component's OWN matched rule paints, since no script can
   synthesise a hover and :focus-visible needs a keyboard. */
function ResizeHandleTokens() {
  return (
    <Box style={{ borderRadius: "var(--ds-radius-4)", border: "1px solid var(--ds-stroke-weak)", overflow: "hidden", background: "var(--ds-bg-subtle)" }}>
      <Flex direction="column" gap="2" style={{ padding: "20px" }}>
        <Muted>
          ResizeHandle paints from existing <Mono>--ds-*</Mono> roles — <strong>no new tokens</strong>. The
          track is the subtle-divider stroke; the grab pill is quiet at rest and strengthens on hover/focus;
          the focus ring is the system ring, the accent with a stacked Radix alpha at 2px ([[focus-ring]]), never recoloured by state.
        </Muted>
      </Flex>
      <MeasuredSpec render={() => <TwoPaneDemo />}>
        <MeasuredRow
          part="Track"
          note="A 1px line inside a wider transparent hit area — background-clip keeps the padding unpainted."
          token="--ds-stroke-weak"
          select=".rt-ds-resize-handle"
          prop="background-color"
        />
        <MeasuredRow part="Pill · rest" token="--ds-fill-hover" select=".rt-ds-resize-handle-pill" prop="background-color" />
        <MeasuredRow
          part="Pill · hover"
          note="The same strengthened fill answers keyboard focus, so the grab affordance is discoverable either way."
          token="--ds-fill-medium"
          select=".rt-ds-resize-handle-pill"
          prop="background-color"
          state="hover"
        />
        <MeasuredRow
          part="Focus ring"
          note="On the grab zone (::before), because the 1px seam is too thin to hold a 2px ring. Inset within that zone, so it reaches no further into the panes. The accent base, with the stack alpha on top, 2px ([[focus-ring]])."
          token="--ds-stroke-focus"
          select=".rt-ds-resize-handle"
          prop="outline-color"
          pseudo="::before"
          state="focus-visible"
        />
      </MeasuredSpec>
    </Box>
  );
}

/* ---- Properties ---------------------------------------------------------- */
const RESIZE_HANDLE_PROPS: PropDef[] = [
  { name: "separatorProps", type: "SeparatorProps", desc: <>The engine's separator contract, spread verbatim onto the root — <Code>role="separator"</Code>, <Code>aria-orientation</Code>, <Code>aria-valuenow/min[/max]</Code>, <Code>tabIndex</Code>, <Code>onKeyDown</Code>, <Code>onDoubleClick</Code>. Get it from <Code>useResizable().separatorProps</Code>.</>, source: "ResizeHandle.tsx" },
  { name: "onDragStart", type: "(e: PointerEvent) => void", desc: <>The pointer-drag start handler, wired to <Code>onPointerDown</Code>. Kept distinct from <Code>separatorProps</Code> (the §1d seam). Get it from <Code>useResizable().onDragStart</Code>.</>, source: "ResizeHandle.tsx" },
  { name: "orientation", type: `"vertical" | "horizontal"`, desc: <>Visual axis — drives the cursor (<Code>col-resize</Code>/<Code>row-resize</Code>) and the pill/track direction. Defaults to <Code>separatorProps["aria-orientation"]</Code>, so a wired engine needs no explicit value.</>, source: "ResizeHandle.tsx" },
  { name: "aria-label", type: "string", desc: <>Accessible name for the separator. Provide it here when the engine wasn't given one; otherwise it falls back to the engine's <Code>aria-label</Code>. A nameless splitter is opaque to assistive tech.</>, source: "ResizeHandle.tsx" },
  { name: "className", type: "string", desc: <>Appended after <Code>rt-ds-resize-handle</Code>.</>, source: "ResizeHandle.tsx" },
  { name: "style", type: "CSSProperties", desc: <>Inline style forwarded to the root.</>, source: "ResizeHandle.tsx" },
];

/* ========================================================================== */

/** The one definition of this component — the standfirst every page of it opens with. */
const DEFINITION = <>The visible drag handle for a resizable pane — a thin flush track with a grab pill that strengthens on hover and focus. It renders the shared resize engine's separator, so keyboard and pointer both drive the same panel.</>;

const meta: Meta<typeof ResizeHandle> = {
  title: "Components/Layout/ResizeHandle",
  component: ResizeHandle,
  parameters: {
    controls: { disable: true },
    docs: {
      description: {
        component:
          "**ResizeHandle** is the visible drag handle for a resizable pane — a thin flush track with a " +
          "centered grab pill that strengthens on hover/focus. It's **purely presentational**: it renders the " +
          "`useResizable` engine's separator contract (the WAI window-splitter role, ARIA, and keyboard model). " +
          "The consumer owns the `useResizable` call and hands the handle its `separatorProps` + `onDragStart`, " +
          "so Layout and SideNav each drive their own panel while sharing one engine. It's the **lite docs " +
          "tier**: one Usage story (working specimen · live token spec · a do/don't) plus a Props.",
      },
    },
  },
};
export default meta;
type Story = StoryObj<typeof ResizeHandle>;

/** Usage — the primary lite docs story: a working specimen, the live token spec, and one do/don't. */
export const Usage: Story = {
  // The DO/DON'T word (success/error step-11 ink on its own tint) measures 4.10 at 12px bold, under axe's
  // 4.5; the colour + the word already carry the meaning, so that row is the documented exception. Scoped
  // to the label itself — the cards' specimens stay fully axe-checked, which "[data-dodont]" did not do.
  parameters: { a11y: { context: { exclude: [DODONT_LABEL] } } },
  render: (_args, { globals }) => (
    <HexThemeKey.Provider value={`${globals.accent}-${globals.appearance}-${globals.contrast}`}>
      <Page>
        <PageHeader title="ResizeHandle · Usage" standfirst={DEFINITION} />

        <Section title="Specimen" lead="A live two-pane split. Drag the handle, or focus it and use the arrows / Home / End / Enter — the left panel reports its size as it changes.">
          <TwoPaneDemo collapsible minSizePx={140} maxSizePx={420} defaultSize={240} label="Resize the panel" testid="rh-overview" />
        </Section>

        <Rule />

        <Section title="Grab zone and bounds" lead="A handle needs a comfortable grab zone and a resolvable size. Give the pane a min/max so a drag can't crush or run away.">
          <Grid columns={{ initial: "1", sm: "2" }} gap="3">
            <DoDont kind="do" bare note="Bound the pane (min/max) and let the wide hit target do the work — the visible line stays a hairline while the grab zone stays easy to hit.">
              <Box style={{ background: "var(--ds-bg-base)", border: "1px solid var(--ds-stroke-weak)", borderRadius: "var(--ds-radius-3)", padding: 12 }}>
                <TwoPaneDemo minSizePx={120} maxSizePx={280} defaultSize={180} label="Sidebar width" />
              </Box>
            </DoDont>
            <DoDont kind="dont" bare note="Don't fatten the visible divider to make it grabbable — the hit target is already wider than the line. A thick bar reads as a panel edge, not a control.">
              <Box style={{ background: "var(--ds-bg-base)", border: "1px solid var(--ds-stroke-weak)", borderRadius: "var(--ds-radius-3)", padding: 12 }}>
                <Flex style={{ height: 120 }}>
                  <Box style={{ width: 120, background: "var(--ds-bg-raised)" }} />
                  <Box aria-hidden style={{ width: 10, background: "var(--ds-fill-medium)", cursor: "col-resize" }} />
                  <Box style={{ flex: 1, background: "var(--ds-bg-base)" }} />
                </Flex>
              </Box>
            </DoDont>
          </Grid>
        </Section>

        <Rule />

        <Section title="Tokens" lead="Read off a rendered handle and checked against the token each row names, so the table can disagree with the component. ResizeHandle paints from existing --ds-* roles only.">
          <ResizeHandleTokens />
        </Section>
      </Page>
    </HexThemeKey.Provider>
  ),
  play: async ({ canvasElement }) => {
    // Passive (no driving / no flash): the handle has no open/close of its own on view, so its
    // window-splitter contract + token binding are asserted right here. axe runs automatically.
    const handle = canvasElement.querySelector<HTMLElement>('[data-testid="rh-overview"] [role="separator"]');
    if (!handle) throw new Error("Usage must render a role=separator ResizeHandle");

    // WAI window-splitter contract from the engine, rendered on the handle.
    if (handle.getAttribute("aria-orientation") !== "vertical")
      throw new Error(`handle must carry aria-orientation="vertical"; got ${handle.getAttribute("aria-orientation")}`);
    if (handle.tabIndex !== 0) throw new Error(`handle must be focusable (tabIndex 0); got ${handle.tabIndex}`);
    if (!handle.hasAttribute("aria-valuenow")) throw new Error("handle must expose aria-valuenow");
    if (!handle.hasAttribute("aria-valuemin")) throw new Error("handle must expose aria-valuemin");
    // maxSizePx is finite (420) here, so aria-valuemax must be present.
    if (!handle.hasAttribute("aria-valuemax")) throw new Error("a bounded handle must expose aria-valuemax");
    if (!handle.getAttribute("aria-label")) throw new Error("handle must be named (aria-label) for AT");

    // The grab pill renders, and the cursor reflects the resize axis.
    if (!handle.querySelector(".rt-ds-resize-handle-pill")) throw new Error("handle must render its grab pill");
    if (getComputedStyle(handle).cursor !== "col-resize")
      throw new Error(`a vertical handle must use col-resize; got ${getComputedStyle(handle).cursor}`);

    // The token table's EVIDENCE, asserted at runtime ([[measured-token-rows]]). This is also the track/pill token
    // binding: each row reads its property off a rendered handle and resolves its claim on a different
    // node, and `assertMeasuredRows` throws if the two disagree.
    const rows = assertMeasuredRows(canvasElement);
    if (rows.measured !== 4 || rows.unproven !== 0) {
      throw new Error(`expected 4 measured / 0 unproven token rows, got ${rows.measured} / ${rows.unproven}`);
    }
  },
};

type PropsArgs = {
  orientation: ResizeOrientation;
  collapsible: boolean;
  defaultSize: number;
  minSizePx: number;
  maxSizePx: number;
};

/** Props — the live, args-driven handle. Drive orientation, collapsibility, and the size bounds. */
export const Props: StoryObj<PropsArgs> = {
  args: { orientation: "vertical", collapsible: true, defaultSize: 260, minSizePx: 160, maxSizePx: 420 },
  argTypes: {
    orientation: { control: "inline-radio", options: ["vertical", "horizontal"], description: "Resize axis — vertical splits side-by-side panes (width), horizontal splits stacked panes (height).", table: { category: "Variant" } },
    collapsible: { control: "boolean", description: "Allow collapse (drag below threshold, Enter, double-click). Expand restores the pre-collapse size.", table: { category: "Behaviour" } },
    defaultSize: { control: { type: "number", min: 80, max: 480, step: 10 }, description: "The resizable pane's initial size in px.", table: { category: "Behaviour" } },
    minSizePx: { control: { type: "number", min: 0, max: 400, step: 10 }, description: "Smallest expanded size in px (also the Home target).", table: { category: "Behaviour" } },
    maxSizePx: { control: { type: "number", min: 120, max: 640, step: 10 }, description: "Largest expanded size in px (also the End target).", table: { category: "Behaviour" } },
  },
  parameters: { controls: { disable: false } },
  render: ({ orientation, collapsible, defaultSize, minSizePx, maxSizePx }: PropsArgs) => (
    <Page maxWidth="none">
      <PageHeader title="ResizeHandle · Props" standfirst={DEFINITION} />
      <Box style={{ padding: "8px 0 2px" }}>
        {/* Remount on structural arg changes so defaultSize / collapsible re-init the engine state. */}
        <TwoPaneDemo
          key={`${orientation}-${collapsible}-${defaultSize}-${minSizePx}-${maxSizePx}`}
          orientation={orientation}
          collapsible={collapsible}
          defaultSize={defaultSize}
          minSizePx={minSizePx}
          maxSizePx={maxSizePx}
          label="Resize the panel"
        />
      </Box>
      <PropsLead />
      <Rule />
      <Section title="Props reference" lead={<>Every prop <Code>ResizeHandle</Code> accepts. It's presentational — the resize <em>options</em> (min/max/collapsible/orientation) live on the consumer's <Code>useResizable</Code> call; the handle just renders the engine's output.</>}>
        <PropTable rows={RESIZE_HANDLE_PROPS} />
      </Section>
    </Page>
  ),
};

/** History — the rulings this component encodes and a changelog of how it changes over time. */
export const History: Story = {
  render: () => (
    <Page>
      <PageHeader title="ResizeHandle · History" standfirst={DEFINITION} />
      <Section title="Decisions" lead="The rulings this component encodes.">
        <Flex direction="column" gap="3">
          <Decision id="[[resize-handle]] · Shared resize engine">
            The resize <strong>behaviour</strong> is a shared engine (<Code>useResizable</Code> + the pure{" "}
            <Code>resizableMath</Code>); ResizeHandle itself is the thin <strong>presentational</strong> shell
            that renders it. Built on that engine + our <Code>--ds-*</Code> layer, not a from-scratch splitter.
          </Decision>
          <Decision id="API · consumer-owned engine">
            ResizeHandle takes the engine's <Code>separatorProps</Code> + <Code>onDragStart</Code> as props and
            spreads them onto its root — the <strong>consumer</strong> calls <Code>useResizable</Code> and reads
            its <Code>size</Code>/<Code>isCollapsed</Code> for the pane. This matches how Layout and SideNav
            wire it (they own the hook so the panel and its handle share one source of truth), rather than the
            handle hiding its own state where a panel can't read it.
          </Decision>
          <Decision id="Window-splitter contract">
            The handle is a WAI <strong>window splitter</strong>: <Code>role="separator"</Code>,{" "}
            <Code>tabIndex=0</Code>, and live <Code>aria-valuenow</Code>/<Code>aria-valuemin</Code>. Arrow keys
            step ±10px, Shift+arrow ±50px, Home/End jump to min/max. <Code>aria-valuemax</Code> is{" "}
            <strong>omitted</strong> when the pane is unbounded (max = ∞), and <Code>aria-valuenow</Code> reads{" "}
            <strong>0</strong> while collapsed — both per the spec.
          </Decision>
          <Decision id="Collapse · restore-not-min">
            When a collapsible pane is expanded again (Enter or double-click), it restores the size it had
            <strong> before</strong> collapsing — not the minimum. The engine remembers the pre-collapse size,
            so a toggle round-trips losslessly instead of snapping the pane down to its floor.
          </Decision>
          <Decision id="Focus · [[focus-ring]]">
            Focus shows the system ring: the accent fill (<Code>--ds-stroke-focus</Code>) with a Radix alpha
            stacked on top, 2px wide. The seam itself is 1px, too thin to hold a 2px ring, so the ring draws
            around the grab zone, the <Code>::before</Code> hit area either side of the seam. It sits{" "}
            <strong>inset</strong> there (<Code>outline-offset: -2px</Code>), so it reaches no further into
            the panes than the grab zone does. The grab pill also strengthens on focus so keyboard users see
            the same affordance as pointer users.
          </Decision>
        </Flex>
      </Section>

      <Rule />

      <Section title="Changelog" lead="Notable changes, newest first — grows as the component evolves.">
        <Flex direction="column" gap="3">
          <Decision id="0.9.0">
            Initial <Code>System/Layout/ResizeHandle</Code> — the presentational splitter handle on the shared
            resize engine; track + grab pill painted from <Code>--ds-stroke-weak</Code> /{" "}
            <Code>--ds-fill-hover</Code> → <Code>--ds-fill-medium</Code> with no new tokens; the WAI
            window-splitter ARIA/keyboard contract with the collapse-restores-pre-collapse-size fix; the
            inset focus ring (now [[focus-ring]]); History page added so every component has one.
          </Decision>
        </Flex>
      </Section>
    </Page>
  ),
};
