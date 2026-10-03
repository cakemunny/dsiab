import { useEffect, useRef, useState, type CSSProperties, type ReactNode, type RefObject } from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { Box, Code, Flex, Grid, Text } from "@radix-ui/themes";
import { ScrollArea } from "./ScrollArea";
import {
  Caption, Decision, DoDont, DODONT_LABEL, HexThemeKey, LiteTokenSpec, MeasuredRow, MeasuredSpec, Mono, NoteRow, Page,
  PageHeader, PropsLead, type PropDef, PropTable, Rule, Section,
} from "./_storyKit";
import { awaitMeasuredRows } from "../../foundations/_assert";

/* A scrollbar THUMB does not exist until Radix has measured the viewport against its content — a
   ResizeObserver round-trip, several frames after the ScrollArea itself mounts. A row that reads on the
   frame it renders would find nothing and report the part missing, which would be false: the thumb is
   simply late. So the rows wait for it. This gates only WHEN the rows read, never WHAT they read — the
   thumb they measure is the component's own, and the row still resolves its claim independently. */
function WhenPresent({ within, select, children }: { within: RefObject<HTMLElement | null>; select: string; children: ReactNode }) {
  const [ready, setReady] = useState(false);
  // useEffect, not useLayoutEffect: a parent's ref is attached AFTER its children's layout effects run,
  // so a layout effect here would find `within.current` still null and never start observing.
  useEffect(() => {
    const root = within.current;
    if (!root) return;
    if (root.querySelector(select)) { setReady(true); return; }
    const observer = new MutationObserver(() => {
      if (root.querySelector(select)) { setReady(true); observer.disconnect(); }
    });
    observer.observe(root, { childList: true, subtree: true });
    return () => observer.disconnect();
  }, [within, select]);
  return ready ? <>{children}</> : null;
}

/* ScrollArea reuses Radix's own overlay-scrollbar skin: the thumb paints --gray-a8 (--gray-a9 on hover),
   the neutral gray-alpha treatment, so it declares no --ds-* roles of its own. The lite spine's token
   spec still can't be dropped — both rows are MEASURED off a real, permanently-shown scrollbar rendered
   into the measurement host, and checked against the token they claim, so a row can disagree with the
   component. The hover value exists only while a pointer is on the thumb and no script can synthesise
   that, so its row reads the declaration the component's OWN stylesheet will paint for the state and
   resolves it on the rendered thumb. */
function ScrollAreaSpec() {
  const wrap = useRef<HTMLDivElement>(null);
  return (
    <LiteTokenSpec
      rationale={
        <>
          ScrollArea reuses Radix's own overlay-scrollbar skin and declares no <Mono>--ds-*</Mono> roles
          of its own. The thumb is the neutral gray-alpha treatment. [[neutral-part-stacks]] stacks <Mono>--neutral-thumb-stack</Mono>{" "}
          on the thumb's fill, so it clears WCAG 3:1 and APCA Lc 30 against its lane and the surface. Both rows
          below are read off a rendered thumb.
        </>
      }
    >
      <div ref={wrap}>
        <MeasuredSpec
          render={() => (
            <ScrollArea type="always" scrollbars="vertical" style={{ width: 120, height: 60 }}>
              <Box style={{ width: 120, height: 400 }} />
            </ScrollArea>
          )}
        >
          <WhenPresent within={wrap} select=".rt-ScrollAreaThumb">
            <MeasuredRow
              part="Thumb"
              note="At rest — the neutral gray-alpha step."
              token="--gray-a8"
              select=".rt-ScrollAreaThumb"
              prop="background-color"
            />
            <MeasuredRow
              part="Thumb"
              note="One step darker while a pointer is on it."
              token="--gray-a9"
              select=".rt-ScrollAreaThumb"
              prop="background-color"
              state="hover"
            />
          </WhenPresent>
        </MeasuredSpec>
      </div>
      <NoteRow
        part="Thumb stack"
        value="A black alpha in light or a white alpha in dark, stacked on the thumb's --gray-a8 fill as a gradient layer that the hover fill keeps, so neither background-color row above carries it ([[neutral-part-stacks]])"
        radix="--neutral-thumb-stack"
      />
    </LiteTokenSpec>
  );
}

/* ---- realistic scroll specimens ---------------------------------------------
   A fixed-height panel holding more rows than fit (a release changelog), and a fixed-width strip of
   metric cards wider than its container. Both scroll under the custom overlay scrollbar (type="always"
   here so the bar is visible in the docs), and both are bounded surfaces — the point of the component:
   a scroll container reserved for a REGION, never the page. */

const RELEASES: { v: string; date: string; note: string }[] = [
  { v: "2.14.0", date: "Jul 22", note: "MultiSelect gains a coloured-backdrop opacity guard." },
  { v: "2.13.2", date: "Jul 18", note: "Breadcrumbs supporting text carries by weight at the small lane." },
  { v: "2.13.1", date: "Jul 15", note: "Calendar range band runs flush across a week, gapped between weeks." },
  { v: "2.13.0", date: "Jul 11", note: "StatusDot folds into Avatar's presence slot; the 8px comment is gone." },
  { v: "2.12.4", date: "Jul 07", note: "Field focus ring overrides Radix's own focus var, not a parallel class." },
  { v: "2.12.3", date: "Jul 02", note: "DropdownMenu picks up the shared motion tokens on open / close." },
  { v: "2.12.2", date: "Jun 28", note: "Token owns the interactive, removable chip; Badge stays display-only." },
  { v: "2.12.1", date: "Jun 24", note: "Separator binds to --ds-stroke-weak tokenlessly — no new CSS." },
  { v: "2.12.0", date: "Jun 20", note: "AlertDialog honours primary-first button order via ButtonGroup." },
  { v: "2.11.5", date: "Jun 16", note: "Callout paints from the accent-aware error family, not raw red." },
  { v: "2.11.4", date: "Jun 12", note: "Comparison tables land for the confusable-sibling clusters." },
];

function ChangelogRow({ v, date, note }: { v: string; date: string; note: string }) {
  return (
    <Flex align="start" gap="3" style={{ padding: "10px 4px", borderTop: "1px solid var(--ds-stroke-weak)" }}>
      <Text size="1" weight="bold" style={{ color: "var(--ds-text-link)", fontFamily: "var(--code-font-family)", width: 52, flexShrink: 0 }}>{v}</Text>
      <Text size="1" style={{ color: "var(--ds-text-strong)", lineHeight: 1.6, flex: 1, minWidth: 0 }}>{note}</Text>
      <Text size="1" style={{ color: "var(--ds-text-weak)", width: 44, flexShrink: 0, textAlign: "right" }}>{date}</Text>
    </Flex>
  );
}

const METRICS: { label: string; value: string }[] = [
  { label: "Requests", value: "48.2k" },
  { label: "Errors", value: "0.31%" },
  { label: "p50 latency", value: "82ms" },
  { label: "p99 latency", value: "640ms" },
  { label: "Sessions", value: "12.9k" },
  { label: "Signups", value: "1,204" },
  { label: "Bounce", value: "24.7%" },
  { label: "Uptime", value: "99.98%" },
];

function MetricCard({ label, value }: { label: string; value: string }) {
  return (
    <Flex direction="column" gap="1" style={{ width: 132, flexShrink: 0, padding: "12px 14px", borderRadius: "var(--ds-radius-3)", border: "1px solid var(--ds-stroke-weak)", background: "var(--ds-bg-base)" }}>
      <Text size="1" style={{ color: "var(--ds-text-weak)", letterSpacing: "0.04em" }}>{label}</Text>
      <Text size="4" weight="bold" style={{ color: "var(--ds-text-strong)" }}>{value}</Text>
    </Flex>
  );
}

/* A bounded surface that frames a ScrollArea: subtle card, weak stroke, rounded — the panel chrome the
   scroll region lives inside. */
function Panel({ children, style }: { children: ReactNode; style?: CSSProperties }) {
  return (
    <Box style={{ borderRadius: "var(--ds-radius-4)", border: "1px solid var(--ds-stroke-weak)", background: "var(--ds-bg-subtle)", overflow: "hidden", ...style }}>
      {children}
    </Box>
  );
}

const SCROLL_AREA_PROPS: PropDef[] = [
  { name: "type", type: `"auto" | "always" | "hover" | "scroll"`, def: `"hover"`, desc: <>When the scrollbar shows. <Code>hover</Code> reveals it on pointer-over; <Code>auto</Code> shows it only while content overflows; <Code>always</Code> keeps it visible; <Code>scroll</Code> shows it during scrolling then fades.</>, source: "Radix" },
  { name: "scrollbars", type: `"vertical" | "horizontal" | "both"`, def: `"both"`, desc: <>Which axes scroll. Pick <Code>vertical</Code> for a fixed-height list, <Code>horizontal</Code> for a wide strip; <Code>both</Code> allows either where the content overflows two ways.</>, source: "Radix" },
  { name: "size", type: `"1" | "2" | "3"`, def: "control lane (1 at small)", desc: <>The scrollbar THICKNESS step (1 thin … 3 chunky). Unset, it rides the <strong>control</strong> size lane (small → 1, medium → 2, large → 3) — its 1–3 range can't take a container-scale <Code>"4"</Code>, so it deliberately follows the control lane, not the container lane its surface rides.</>, source: "ScrollArea.tsx" },
  { name: "radius", type: `"none" | "small" | "medium" | "large" | "full"`, def: `"full"`, desc: <>The scrollbar / thumb corner rounding. Inherits the theme radius when unset; the thumb defaults to a fully-rounded pill.</>, source: "Radix" },
  { name: "children", type: "ReactNode", desc: <>The scrolling content. Give the ScrollArea (or its content) a fixed <Code>height</Code> / <Code>maxHeight</Code> — or <Code>width</Code> for a horizontal bar — so there is a bounded box for the overflow to scroll within.</>, source: "Radix" },
  { name: "tabIndex · role · aria-label", type: `0 · "region" · string`, def: "tabIndex 0 on a text-only overflow · region when named", desc: <>The three that make a scroller reachable and announced, and the system applies two of them. A viewport that overflows and holds nothing focusable takes <Code>tabIndex=&#123;0&#125;</Code>, so a keyboard can reach and scroll it in every browser. A viewport given <Code>aria-label</Code> or <Code>aria-labelledby</Code> takes <Code>role="region"</Code>, a role that carries a name, so the label is announced when focus lands. <strong>The name is yours to give.</strong> A focusable scroller with no name warns once in development, because a stop that announces nothing fails WCAG 4.1.2. A scroller that holds a link, a button or a field is reached through those and takes no stop of its own. A <Code>tabIndex</Code> or <Code>role</Code> you pass wins.</>, source: "ScrollArea.tsx" },
];

/** The one definition of this component — the standfirst every page of it opens with. */
const DEFINITION = <>A custom-scrollbar scroll container for a bounded region with more content than fits. Give it a fixed height (or width) and the overflow scrolls under an overlay scrollbar — the native one, restyled to the theme. Use it for a region, not the page.</>;

const meta: Meta<typeof ScrollArea> = {
  title: "Components/Container/ScrollArea",
  component: ScrollArea,
  parameters: {
    controls: { disable: true },
    docs: {
      description: {
        component:
          "**ScrollArea** is a custom-scrollbar scroll container for a bounded region that holds more " +
          "content than fits — a fixed-height list, a message log, a wide row of cards. It’s a thin wrapper " +
          "over Radix’s `ScrollArea` that swaps the native scrollbar for an overlay one; the scrollbar " +
          "thickness rides the **control** size lane (its `1`–`3` range can’t take a container-scale `4`), and " +
          "it reuses Radix’s gray-alpha scrollbar skin, so it declares no `--ds-*` roles. A **lite-tier** wrap: " +
          "one Usage story (specimen · live token spec · a do/don’t) plus a Props.",
      },
    },
  },
};
export default meta;
type Story = StoryObj<typeof ScrollArea>;

/** Usage — the primary lite docs story: labeled specimens, the live token spec, and one do/don't. */
export const Usage: Story = {
  // The DoDont callout labels (success/error text on the green/red tint) measure ~4.1–4.4 — just under
  // axe's strict 4.5; the callout colour + the DO/DON'T word already carry the meaning, so color-contrast
  // is scoped off here, a documented specimen exception (same pattern as Separator/AlertDialog Usage).
  parameters: { a11y: { context: { exclude: [DODONT_LABEL] } } },
  render: (_args, { globals }) => (
    <HexThemeKey.Provider value={`${globals.accent}-${globals.appearance}-${globals.contrast}`}>
      <Page>
        <PageHeader title="ScrollArea · Usage" standfirst={DEFINITION} />

        <Section title="Specimen" lead="A fixed-height changelog that scrolls vertically, and a fixed-width metric strip that scrolls horizontally. Each is a bounded surface — the overflow scrolls under the custom scrollbar, the page around it stays put.">
          <Grid columns={{ initial: "1", md: "2" }} gap="5">
            <Flex direction="column" gap="2">
              <Text size="1" weight="bold" style={{ color: "var(--ds-text-weak)", letterSpacing: "0.06em" }}>VERTICAL · RELEASE LOG</Text>
              <Panel>
                <ScrollArea type="always" scrollbars="vertical" style={{ height: 220 }} tabIndex={0} role="region" aria-label="Release log, scrollable" data-testid="sa-vertical">
                  <Box style={{ padding: "4px 16px 12px" }}>
                    {RELEASES.map((r) => <ChangelogRow key={r.v} {...r} />)}
                  </Box>
                </ScrollArea>
              </Panel>
              <Caption>A fixed <Mono>height: 220</Mono> panel holding eleven entries — the list scrolls, its container doesn't grow.</Caption>
            </Flex>

            <Flex direction="column" gap="2">
              <Text size="1" weight="bold" style={{ color: "var(--ds-text-weak)", letterSpacing: "0.06em" }}>HORIZONTAL · METRIC STRIP</Text>
              <Panel>
                <ScrollArea type="always" scrollbars="horizontal" tabIndex={0} role="region" aria-label="Metrics, scrollable horizontally" data-testid="sa-horizontal">
                  <Flex gap="3" style={{ padding: "16px", width: "max-content" }}>
                    {METRICS.map((m) => <MetricCard key={m.label} {...m} />)}
                  </Flex>
                </ScrollArea>
              </Panel>
              <Caption>Eight cards wider than the panel — the strip scrolls sideways under a horizontal bar, no wrapping.</Caption>
            </Flex>
          </Grid>
        </Section>

        <Rule />

        <Section title="Bound a region, not the page" lead="A ScrollArea bounds a region that overflows. Wrapped around the whole page, it hides the native scrollbar and breaks the reading gestures people expect.">
          <Grid columns={{ initial: "1", sm: "2" }} gap="3">
            <DoDont kind="do" bare note="A fixed-height panel with more rows than fit — the region scrolls under the custom bar while the surrounding page stays put.">
              <Panel style={{ background: "var(--ds-bg-base)" }}>
                <ScrollArea type="always" scrollbars="vertical" style={{ height: 132 }} tabIndex={0} role="region" aria-label="Scrollable region">
                  <Box style={{ padding: "4px 16px 8px" }}>
                    {RELEASES.slice(0, 6).map((r) => <ChangelogRow key={r.v} {...r} />)}
                  </Box>
                </ScrollArea>
              </Panel>
            </DoDont>
            <DoDont kind="dont" bare note="Don't wrap the whole page in a ScrollArea — it overrides the native scrollbar, drops the browser's scroll affordances, and there's no bounded region to reserve. Let the page scroll natively.">
              <Box style={{ borderRadius: "var(--ds-radius-4)", border: "1px dashed var(--ds-stroke-strong)", background: "var(--ds-bg-base)", padding: "16px", height: 132, position: "relative", overflow: "hidden" }}>
                <Flex direction="column" gap="2">
                  <Box style={{ height: 8, width: "70%", borderRadius: "var(--ds-radius-1)", background: "var(--ds-fill-weak)" }} />
                  <Box style={{ height: 8, width: "90%", borderRadius: "var(--ds-radius-1)", background: "var(--ds-fill-weak)" }} />
                  <Box style={{ height: 8, width: "80%", borderRadius: "var(--ds-radius-1)", background: "var(--ds-fill-weak)" }} />
                  <Text size="1" style={{ color: "var(--ds-text-weak)", marginTop: "var(--space-2)" }}>Whole-page content</Text>
                </Flex>
                <Box style={{ position: "absolute", top: 8, right: 6, bottom: 8, width: 6, borderRadius: "var(--ds-radius-full)", background: "var(--gray-a8)" }} />
              </Box>
            </DoDont>
          </Grid>
        </Section>

        <Rule />

        <Section title="Tokens" lead="Measured off a rendered thumb — ScrollArea reuses Radix's overlay-scrollbar skin, so it owns no --ds-* roles, and each row checks what the thumb paints against the token it claims.">
          <ScrollAreaSpec />
        </Section>
      </Page>
    </HexThemeKey.Provider>
  ),
  play: async ({ canvasElement }) => {
    // The token table's EVIDENCE, asserted at runtime — both rows read a REAL rendered thumb.
    // The table itself is gated on the thumb existing, so `awaitMeasuredRows` is told how many rows this
    // story declares: it blocks until all 2 are on the page AND each has recorded its evidence (a row
    // whose element mounts late retries for up to 60 frames), then runs the identical assertions. Without
    // the count, an empty table would satisfy "every row I can see has evidence" and return 0/0.
    const rows = await awaitMeasuredRows(canvasElement, { rows: 2 });
    if (rows.measured !== 2 || rows.unproven !== 0) {
      throw new Error(`expected 2 measured / 0 unproven token rows, got ${rows.measured} / ${rows.unproven}`);
    }

    // Passive (no driving / no flash): a scroll container has no open/close behaviour, so its overflow
    // contract and skin binding are asserted right here. axe runs automatically on the story.
    const vert = canvasElement.querySelector<HTMLElement>('[data-testid="sa-vertical"]');
    const horiz = canvasElement.querySelector<HTMLElement>('[data-testid="sa-horizontal"]');
    if (!vert || !horiz) throw new Error("Usage must render both a vertical and a horizontal scroll container");

    // The viewport is the scrollable box (the wrap forwards its ref / data-* here). Content overflows it —
    // that is the whole point of a scroll container, so scrollHeight/scrollWidth must exceed the client box.
    if (vert.scrollHeight <= vert.clientHeight) throw new Error(`the vertical specimen must overflow its box; got scrollHeight ${vert.scrollHeight} ≤ clientHeight ${vert.clientHeight}`);
    if (horiz.scrollWidth <= horiz.clientWidth) throw new Error(`the horizontal specimen must overflow its box; got scrollWidth ${horiz.scrollWidth} ≤ clientWidth ${horiz.clientWidth}`);

    // Custom scrollbar is drawn (not the native one) — the restyled overlay bar renders in the DOM.
    const bar = canvasElement.querySelector<HTMLElement>(".rt-ScrollAreaScrollbar");
    if (!bar) throw new Error("the custom overlay scrollbar (.rt-ScrollAreaScrollbar) must render");

    // Thumb colour is no longer re-checked here: the token table below measures it off a rendered thumb
    // and its row asserts the binding, so a second copy of the check would only be able to drift.
  },
};

type PropsArgs = {
  type: "auto" | "always" | "hover" | "scroll";
  scrollbars: "vertical" | "horizontal" | "both";
  size: "auto" | "1" | "2" | "3";
  radius: "none" | "small" | "medium" | "large" | "full";
};

/** Props — the live, args-driven ScrollArea. Drive the reveal type, the scrolling axes, the
 *  scrollbar thickness, and the corner radius; the panel is fixed-size so the content overflows it. */
export const Props: StoryObj<PropsArgs> = {
  // "auto" (size unset) is the default so the scrollbar tracks the global uiSize toolbar out of the box.
  args: { type: "always", scrollbars: "vertical", size: "auto", radius: "full" },
  argTypes: {
    type: { control: "inline-radio", options: ["auto", "always", "hover", "scroll"], description: "When the scrollbar shows.", table: { category: "Behaviour" } },
    scrollbars: { control: "inline-radio", options: ["vertical", "horizontal", "both"], description: "Which axes scroll.", table: { category: "Behaviour" } },
    size: { control: "inline-radio", options: ["auto", "1", "2", "3"], description: '"auto" tracks the global uiSize toolbar (unset → the control lane); a step (1–3) pins the scrollbar thickness.', table: { category: "Variant" } },
    radius: { control: "inline-radio", options: ["none", "small", "medium", "large", "full"], description: "Scrollbar / thumb corner rounding.", table: { category: "Variant" } },
  },
  parameters: { controls: { disable: false } },
  render: ({ type, scrollbars, size, radius }: PropsArgs) => {
    const horizontal = scrollbars === "horizontal";
    return (
      <Page maxWidth="none">
        <PageHeader
          title="ScrollArea · Props"
          standfirst={<>{DEFINITION} The panel here is fixed-size ({horizontal ? "a wide strip" : "200px tall"}), so the content overflows and scrolls.</>}
        />
        <Box style={{ width: 380, maxWidth: "100%", padding: "8px 0" }}>
          <Box style={{ borderRadius: "var(--ds-radius-4)", border: "1px solid var(--ds-stroke-weak)", background: "var(--ds-bg-subtle)", overflow: "hidden" }}>
            <ScrollArea type={type} scrollbars={scrollbars} size={size === "auto" ? undefined : size} radius={radius} tabIndex={0} role="region" aria-label="Scrollable region" style={horizontal ? undefined : { height: 200 }}>
              {horizontal ? (
                <Flex gap="3" style={{ padding: "16px", width: "max-content" }}>
                  {METRICS.map((m) => <MetricCard key={m.label} {...m} />)}
                </Flex>
              ) : (
                <Box style={{ padding: "4px 16px 12px", width: scrollbars === "both" ? "max-content" : undefined }}>
                  {scrollbars === "both" ? (
                    <Flex direction="column" gap="0" style={{ minWidth: 560 }}>
                      {RELEASES.map((r) => <ChangelogRow key={r.v} {...r} />)}
                    </Flex>
                  ) : (
                    RELEASES.map((r) => <ChangelogRow key={r.v} {...r} />)
                  )}
                </Box>
              )}
            </ScrollArea>
          </Box>
        </Box>
        <PropsLead />
        <Rule />
        <Section title="Props reference" lead={<>Every prop <Code>ScrollArea</Code> accepts — all pass through to Radix's <Code>ScrollArea</Code>, except <Code>size</Code>, which the wrap resolves against the control size lane when unset, and <Code>tabIndex</Code> and <Code>role</Code>, which it fills in for a text-only or a named scroller when you pass none. <Code>color</Code> is withheld so the scrollbar stays neutral.</>}>
          <PropTable rows={SCROLL_AREA_PROPS} />
        </Section>
      </Page>
    );
  },
};

/** History — the rulings this component encodes and a changelog of how it changes over time. */
export const History: Story = {
  render: () => (
    <Page>
      <PageHeader title="ScrollArea · History" standfirst={DEFINITION} />
      <Section title="Decisions" lead="The rulings this component encodes.">
        <Flex direction="column" gap="3">
          <Decision id="[[catalog-as-specification]] · Wrapped Radix component">
            ScrollArea is a <strong>wrapped</strong> Radix Themes component — the Radix name wins; built on the
            Radix substrate + our <Code>--ds-*</Code> layer, not a hand-rolled scroll container.
          </Decision>
          <Decision id="Control size lane">
            The scrollbar THICKNESS rides the <strong>control</strong> size lane (small → 1, medium → 2,
            large → 3), not the container lane its surface rides. ScrollArea's <Code>size</Code> range is only
            1–3, and the container lane tops out at <Code>"4"</Code> — out of range. An out-of-range size
            isn't ignored: Radix falls back to that prop's <em>own</em> default, which for ScrollArea is{" "}
            <Code>1</Code>, so a container-lane <Code>large</Code> would quietly render the <em>thinnest</em>{" "}
            bar — the opposite of what was asked, with nothing to signal the size was dropped. Hence the
            deliberate deviation from the container scale: the scrollbar is a control-scale accent riding a
            surface, not a container-scale surface itself.
          </Decision>
          <Decision id="Scrollbar skin">
            The thumb reuses Radix's own gray-alpha skin, <Code>--gray-a8</Code> (<Code>--gray-a9</Code> on
            hover), the neutral overlay-scrollbar treatment. ScrollArea declares no <Code>--ds-*</Code> role, and
            since [[neutral-part-stacks]] one rule stacks <Code>--neutral-thumb-stack</Code> (theme.css) on the thumb as a gradient
            layer. <Code>color</Code> is deliberately not exposed: a scrollbar
            stays neutral, never a raw Radix accent scale.
          </Decision>
        </Flex>
      </Section>

      <Rule />

      <Section title="Changelog" lead="Notable changes, newest first — grows as the component evolves.">
        <Flex direction="column" gap="3">
          <Decision id="0.9.0">
            Initial <Code>System/ScrollArea</Code> — Radix ScrollArea wrapped, its scrollbar thickness bound to
            the control size lane (its 1–3 range can't take a container-scale <Code>"4"</Code>) and its thumb
            reusing Radix's gray-alpha skin tokenlessly; History page added so every component, stubs included,
            has one.
          </Decision>
        </Flex>
      </Section>
    </Page>
  ),
};
