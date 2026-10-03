import { useContext, useLayoutEffect, useRef, useState } from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { Box, Code, Flex, Grid, Text } from "@radix-ui/themes";
import { Outline, type OutlineItem } from "./Outline";
import { LinkProvider } from "./Link";
import { ScrollArea } from "./ScrollArea";
import {
  Caption, Decision, DemoLink, DoDont, DODONT_LABEL, HexThemeKey, MeasuredRow, MeasuredSpec, Mono, NoteRow, Page,
  PageHeader, PropsLead, type PropDef, PropTable, Rule, Scenario, Section, TokenGroup,
} from "./_storyKit";
import { assertMeasuredRows } from "../../foundations/_assert";

/* System/Navigation/Outline — LITE spine (History → Usage → Props). The behavioral, spy-driving
   plays live in _outline.stories.tsx (_internal) so viewing this docs page never auto-scrolls a fixture.

   The FLAGSHIP specimen runs LIVE — its scroll-spy is watching the article's own bounded scroll box, so
   a reader can scroll it and watch the highlight track. That is the component's headline behaviour and a
   controlled specimen cannot show it. Nothing auto-drives on view: the spy only reacts to a scroll the
   reader performs. The remaining specimens stay controlled (a static activeId) because they document
   token roles and guidance, where a moving highlight would be noise — plus one specimen that documents
   the controlled mode itself. */

const DOC_SECTIONS: OutlineItem[] = [
  { id: "ov-overview", text: "Overview", level: 2 },
  { id: "ov-install", text: "Installation", level: 2 },
  { id: "ov-config", text: "Configuration", level: 3 },
  { id: "ov-theming", text: "Theming", level: 3 },
  { id: "ov-api", text: "API reference", level: 2 },
  { id: "ov-faq", text: "FAQ", level: 2 },
];

/* A styled pseudo-heading + filler — the specimen article the TOC points at. Deliberately NOT a real
   <h2>/<h3> (the anchor resolves by id all the same), so a docs page crowded with authored headings
   doesn't trip axe's heading-order on the specimen. */
const ArticleBlock = ({ id, title, sub }: { id: string; title: string; sub?: boolean }) => (
  /* scroll-margin-top doubles as the spy's activation line (that value + 1px). It has to clear the
     scroll box's own top padding, or the first section sits BELOW the line at rest and the TOC opens
     with nothing highlighted. */
  <Box style={{ scrollMarginTop: 24 }}>
    <Box id={id} style={{ scrollMarginTop: 24 }}>
      <Text weight="bold" size={sub ? "2" : "4"} style={{ color: "var(--ds-text-strong)" }}>{title}</Text>
    </Box>
    <Text as="p" size="2" style={{ color: "var(--ds-text-weak)", lineHeight: 1.6, marginTop: 4 }}>
      Placeholder body copy for the {title.toLowerCase()} section. In a real page each section runs long
      enough that a reader needs a persistent map to move between them without scrolling by feel.
    </Text>
  </Box>
);

/* ---- Tokens: measured off a rendered outline ------------------------------
   Each colour row names an element and a property and reads that property off a real rendered
   Outline, then checks it against the token it claims — so a row can disagree with the component.
   The hover and focus rows read the declaration the component's OWN matched rule paints, since no
   script can synthesise a hover and :focus-visible needs a keyboard. One row stays prose: the indent
   PER LEVEL is a difference between two entries, not a property either of them carries, so it is
   measured as that difference off the specimen above. */
function OutlineRoles() {
  const themeKey = useContext(HexThemeKey);
  const ref = useRef<HTMLDivElement>(null);
  const [indent, setIndent] = useState<string | null>(null);
  useLayoutEffect(() => {
    const links = ref.current?.querySelectorAll<HTMLElement>(".rt-ds-outline-link");
    if (!links || links.length < 3) return;
    // DOC_SECTIONS[1] is level 2, [2] is level 3 — one level apart, so the delta is one step.
    const a = parseFloat(getComputedStyle(links[1]).paddingInlineStart);
    const b = parseFloat(getComputedStyle(links[2]).paddingInlineStart);
    setIndent(`${Math.round((b - a) * 100) / 100}px`);
  }, [themeKey]);
  return (
    <TokenGroup
      label="ROLES — the entry text + the sliding indicator"
      blurb="Idle entries are muted; the active entry reads at the link colour with the accent indicator bar over a neutral rail. Every row below is read off a rendered outline and checked against the token it names."
      specimen={
        /* The rail width the flagship above declares as its own grid track (200px). The specimen
           used to hug its entries, which stopped being a width the moment the entry stopped
           driving its container ([[truncating-label-width]]). A TOC is a rail widget, and a rail states its width. */
        <Box ref={ref} style={{ width: 200 }}>
          <Outline items={DOC_SECTIONS.slice(0, 4)} activeId="ov-install" label="Token preview" />
        </Box>
      }
    >
      <MeasuredSpec
        render={() => <Outline items={DOC_SECTIONS.slice(0, 4)} activeId="ov-install" label="Measurement outline" />}
      >
        <MeasuredRow
          part="Entry — idle"
          token="--ds-text-weak"
          select='.rt-ds-outline-link:not([aria-current])'
          prop="color"
        />
        <MeasuredRow
          part="Entry — hover"
          note="Deepens under the pointer; the active entry keeps its own colour."
          token="--ds-text-strong"
          select=".rt-ds-outline-link"
          prop="color"
          state="hover"
        />
        <MeasuredRow
          part="Entry — active"
          note="Marked aria-current=&quot;location&quot;, and carried by weight as well as colour."
          token="--ds-text-link"
          select='.rt-ds-outline-link[aria-current="location"]'
          prop="color"
        />
        <MeasuredRow
          part="Indicator bar"
          note="A 2px segment the script slides to the active entry."
          token="--accent-indicator"
          select=".rt-ds-outline-indicator"
          prop="background-color"
        />
        <MeasuredRow
          part="Rail"
          note="The full-height groove the bar slides along, drawn on the track's ::before."
          token="--ds-stroke-weak"
          select=".rt-ds-outline-track"
          prop="background-color"
          pseudo="::before"
        />
        <MeasuredRow
          part="Focus ring"
          note="Inset, because a full-width entry has no gutter for an outset ring. The accent base, with the stack alpha on top ([[focus-ring]])."
          token="--ds-stroke-focus"
          select=".rt-ds-outline-link"
          prop="outline-color"
          state="focus-visible"
        />
        <MeasuredRow
          part="Entry inset"
          note="The base inset of a top-level entry; each extra level adds another step of it."
          token="--ds-space-16"
          select='.rt-ds-outline-link:not([aria-current])'
          prop="padding-inline-start"
        />
        <MeasuredRow
          part="Entry text"
          note="Rides the ambient text lane (12/14/16) like the rest of the nav family — the step named here is the small default the docs render at."
          token="--font-size-1"
          select=".rt-ds-outline-link"
          prop="font-size"
        />
      </MeasuredSpec>
      <NoteRow part="Focus ring geometry" value="2px solid, inset (outline-offset -2px), the accent base under the --ds-stroke-focus-stack alpha ([[focus-ring]]) — a full-width entry has no gutter for an outset ring" radix="outline" />
      <NoteRow part="Indent per level" value={indent ? `${indent} — one --ds-space-16 step per level, measured between a level-2 and a level-3 entry` : "…"} />
    </TokenGroup>
  );
}

/* ---- Properties ---------------------------------------------------------- */
/* The flagship: a LIVE Outline spying on the article beside it. The article scrolls in its own bounded
   box rather than the page, so `getContainer` points the spy at that element instead of the window —
   which also keeps the specimen self-contained (scrolling it never moves the docs page). The ref must
   live in a component, hence this wrapper rather than inline JSX in the story. */
function LiveArticleOutline() {
  const articleRef = useRef<HTMLDivElement>(null);
  return (
    <Grid columns={{ initial: "1", sm: "1fr 200px" }} gap="5" align="start">
      <Box
        ref={articleRef}
        tabIndex={0}
        aria-label="Article preview"
        style={{
          maxHeight: 280,
          overflow: "auto",
          borderRadius: "var(--ds-radius-4)",
          border: "1px solid var(--ds-stroke-weak)",
          background: "var(--ds-bg-subtle)",
          padding: 20,
        }}
      >
        <Flex direction="column" gap="4">
          <ArticleBlock id="ov-overview" title="Overview" />
          <ArticleBlock id="ov-install" title="Installation" />
          <ArticleBlock id="ov-config" title="Configuration" sub />
          <ArticleBlock id="ov-theming" title="Theming" sub />
          <ArticleBlock id="ov-api" title="API reference" />
          <ArticleBlock id="ov-faq" title="FAQ" />
        </Flex>
      </Box>
      <Box style={{ position: "sticky", top: 0 }}>
        <Outline items={DOC_SECTIONS} getContainer={() => articleRef.current} label="On this page" />
      </Box>
    </Grid>
  );
}

const OUTLINE_PROPS: PropDef[] = [
  { name: "items", type: "OutlineItem[]", desc: <>Explicit entries <Code>{`{ id, text, level }`}</Code> in document order. <Code>level</Code> (1–6) drives indentation only. Mutually exclusive with <Code>containerRef</Code> (items wins).</>, source: "Outline.tsx" },
  { name: "containerRef", type: "RefObject<HTMLElement>", desc: <>DOM-driven mode: builds the outline from the container's headings via <Code>useOutlineFromDOM</Code> (h1–h6 / <Code>[data-outline-heading]</Code>, re-scanned on a <Code>MutationObserver</Code>; missing ids get a slug). Ignored when <Code>items</Code> is set.</>, source: "Outline.tsx" },
  { name: "activeId", type: "string | null", desc: <>Controlled active entry. When provided (including <Code>null</Code>), the internal scroll-spy is <strong>disabled</strong> and this value is used verbatim.</>, source: "useScrollSpy" },
  { name: "label", type: "string", def: `"On this page"`, desc: <>Accessible name for the <Code>&lt;nav&gt;</Code>. Give each Outline on a page a distinct label (several nav landmarks need unique names).</>, source: "Outline.tsx" },
  { name: "getContainer", type: "() => HTMLElement | null", desc: <>The scroll container the spy observes. Defaults to the document / window scroll.</>, source: "useScrollSpy" },
];

/* ========================================================================== */
/** The one definition of this component — the standfirst every page of it opens with. */
const DEFINITION = <>A scroll-spy table of contents. It highlights the section you are reading. The active entry reads at the link colour with a sliding <Mono>--accent-indicator</Mono> bar and carries <Mono>aria-current="location"</Mono>.</>;

const meta: Meta<typeof Outline> = {
  title: "Components/Navigation/Outline",
  component: Outline,
  parameters: {
    controls: { disable: true },
    docs: {
      description: {
        component:
          "**Outline** is a scroll-spy table of contents — a `<nav>` of in-page links, one per heading, " +
          "with an indicator bar that slides to the section you're reading. Feed it explicit " +
          "`items={[{ id, text, level }]}`, or pass a `containerRef` and it builds the list from that " +
          "container's headings (the DOM-driven mode). The active entry carries `aria-current=\"location\"`; " +
          "a controlled `activeId` disables the spy so you can drive it yourself. Entries route through the " +
          "pluggable `Link` (a `#anchor` by default). Flat list — `level` is indentation only.",
      },
    },
  },
};
export default meta;
type Story = StoryObj<typeof Outline>;

/* ---- Usage ------------------------------------------------------------ */
export const Usage: Story = {
  // The DO/DON'T word (success/error step-11 ink on its own tint) measures 4.10 at 12px bold, under axe's
  // 4.5; the colour + the word already carry the meaning, so that row is the documented exception. Scoped
  // to the label itself — the cards' specimens stay fully axe-checked, which "[data-dodont]" did not do.
  parameters: { a11y: { context: { exclude: [DODONT_LABEL] } } },
  render: (_args, { globals }) => (
    // Entries route through DemoLink so clicking a TOC entry in the docs story pins the highlight
    // (lockActiveId still fires) without navigating the Storybook iframe's #hash — every other
    // interaction (the live scroll-spy, the sliding indicator) is unaffected.
    <LinkProvider component={DemoLink}>
      <HexThemeKey.Provider value={`${globals.accent}-${globals.appearance}-${globals.contrast}`}>
      <Page maxWidth={880}>
        <PageHeader title="Outline · Usage" standfirst={DEFINITION} />

        <Section title="A TOC beside an article" lead="The core layout: a persistent map next to long-form content. Scroll the article — the highlight and the sliding bar follow the section you're reading.">
          <LiveArticleOutline />
          <Caption>
            This is the live component: the scroll-spy is running against the article's own scroll box, so the
            active entry changes as you scroll it. Entries are indented by <Code>level</Code> —{" "}
            <Code>Configuration</Code> sits one step under <Code>Installation</Code>, which is indentation, not a
            nested list. Clicking an entry scrolls to that section and pins the highlight until you scroll again.
          </Caption>
        </Section>

        <Rule />

        <Section title="Controlled" lead="Pass activeId and the scroll-spy switches off — the value you pass is used verbatim. For a page that already owns the notion of 'where the reader is' (a router, a virtualised list) and needs the TOC to agree with it.">
          <Outline items={DOC_SECTIONS} activeId="ov-api" label="Controlled contents" />
          <Caption>
            Held at <Code>API reference</Code>. Nothing here reacts to scrolling — that is the point of the
            controlled mode. Passing <Code>null</Code> is also "controlled": it means no active entry.
          </Caption>
        </Section>

        <Rule />

        <Section title="Do / don't" lead="An Outline earns its space on a long page a reader jumps around — not a short one.">
          <Grid columns={{ initial: "1", sm: "2" }} gap="3">
            <DoDont kind="do" bare note="Long-form docs with many sections a reader scans and jumps between — the TOC is a persistent map that saves real scrolling.">
              <Outline items={DOC_SECTIONS} activeId="ov-api" label="Guide contents" />
            </DoDont>
            <DoDont kind="dont" bare note="A three-section page. The TOC is longer to read than the content it maps — just let the reader scroll.">
              <Outline
                items={[
                  { id: "dd-intro", text: "Intro", level: 2 },
                  { id: "dd-body", text: "Details", level: 2 },
                  { id: "dd-end", text: "Wrap-up", level: 2 },
                ]}
                activeId="dd-body"
                label="Short page"
              />
            </DoDont>
          </Grid>
        </Section>

        <Rule />

        <Section title="Tokens" lead="Every row is read off a rendered outline and checked against the token it names, so the table can disagree with the component — flip the accent / appearance toolbar and the rows re-resolve.">
          <OutlineRoles />
        </Section>
      </Page>
      </HexThemeKey.Provider>
    </LinkProvider>
  ),
  play: async ({ canvasElement }) => {
    // The token table's EVIDENCE, asserted at runtime ([[measured-token-rows]]). The hover and focus rows read the
    // declaration the component's own matched rule paints — no script can synthesise either state.
    const rows = assertMeasuredRows(canvasElement);
    if (rows.measured !== 8 || rows.unproven !== 0) {
      throw new Error(`expected 8 measured / 0 unproven token rows, got ${rows.measured} / ${rows.unproven}`);
    }

    // Passive checks only — no scroll driving (that lives in _internal). axe runs automatically.
    const nav = canvasElement.querySelector<HTMLElement>("nav.rt-ds-outline");
    if (!nav) throw new Error("Outline must render a <nav>");
    const active = nav.querySelector<HTMLElement>("[aria-current]");
    if (!active) throw new Error("the controlled active entry must carry aria-current");
    if (active.getAttribute("aria-current") !== "location")
      throw new Error(`active entry must be aria-current="location"; got "${active.getAttribute("aria-current")}"`);
    // The entry is an in-page #anchor <a> (routed here through the story's DemoLink; the component's
    // default with no provider is a native <a> — proven in _internal / Item's LinkComponentRouting).
    if (active.tagName !== "A" || !active.getAttribute("href")?.startsWith("#"))
      throw new Error("an Outline entry must render an in-page #anchor <a>");
  },
};

/* ---- Narrowing ------------------------------------------------------------
   A TOC lives in a rail, and a rail gets dragged. Both specimens are the same entries in the same
   kind of container (a vertical ScrollArea, which is what a rail is) at two widths. The ScrollArea
   is load-bearing rather than decorative: its content wrapper is `width: fit-content`, so it is the
   ancestor that used to take the entry's min-content and hand the viewport something too wide to
   show, which is the clip [[truncating-label-width]] removed. */

const SYMBOLS: OutlineItem[] = [
  { id: "nw-loyalty", text: "LOYALTY_RATE", level: 2 },
  { id: "nw-total", text: "totalCart(cart, promo)", level: 2 },
  { id: "nw-subtotal", text: "subtotal", level: 3 },
  { id: "nw-settle", text: "settle(subtotal, discounts)", level: 3 },
];

function SymbolRail({ width, testId }: { width: number; testId: string }) {
  return (
    <Box
      data-testid={testId}
      style={{
        width,
        height: 168,
        border: "1px solid var(--ds-stroke-weak)",
        borderRadius: "var(--ds-radius-3)",
        overflow: "hidden",
      }}
    >
      <ScrollArea type="auto" scrollbars="vertical">
        <Box style={{ padding: "var(--ds-space-8)" }}>
          <Outline items={SYMBOLS} activeId="nw-total" label={`Symbols at ${width}px`} />
        </Box>
      </ScrollArea>
    </Box>
  );
}

export const Narrowing: Story = {
  render: () => (
    <Page maxWidth={880}>
      <PageHeader title="Outline · Narrowing" standfirst={DEFINITION} />

      <Section
        title="Narrowing"
        lead="A TOC rail gets dragged narrower than anyone designed for. The entry truncates to one line and the rail keeps its width, because a symbol name is a label and a label is what gives way."
      >
        <Grid columns={{ initial: "1", sm: "2" }} gapX="6" gapY="5">
          <Scenario label="240px — the rail at rest" caption="Every symbol fits, so the entries read in full and the indicator marks the active one.">
            <SymbolRail width={240} testId="toc-wide" />
          </Scenario>
          <Scenario label="150px — dragged in" caption="The same entries. The long signatures ellipse, and title gives the hidden tail back on hover.">
            <SymbolRail width={150} testId="toc-narrow" />
          </Scenario>
        </Grid>
        <Caption>
          Truncate labels, reflow prose (<Code>GUIDELINES</Code> §8b). The entry shrinks because it no
          longer reports its whole string as an intrinsic width, which is what <Code>min-width: 0</Code>{" "}
          alone cannot buy: a rail inside a <Code>ScrollArea</Code> is sized <Code>fit-content</Code>, so
          an entry that refuses to shrink is handed straight to a viewport that clips it mid-glyph.
        </Caption>
      </Section>
    </Page>
  ),
  play: async ({ canvasElement }) => {
    const read = (testId: string) => {
      const rail = canvasElement.querySelector<HTMLElement>(`[data-testid="${testId}"]`);
      if (!rail) throw new Error(`${testId}: rail missing`);
      const viewport = rail.querySelector<HTMLElement>(".rt-ScrollAreaViewport");
      if (!viewport) throw new Error(`${testId}: the rail must scroll inside a ScrollArea`);
      const links = Array.from(rail.querySelectorAll<HTMLElement>(".rt-ds-outline-link"));
      if (links.length === 0) throw new Error(`${testId}: no outline entries rendered`);
      return { links, edge: viewport.getBoundingClientRect().right };
    };

    for (const testId of ["toc-wide", "toc-narrow"]) {
      const { links, edge } = read(testId);
      for (const link of links) {
        const right = link.getBoundingClientRect().right;
        if (right > edge + 0.5) {
          throw new Error(`${testId}: an entry must not overflow the rail (entry right ${Math.round(right)} vs viewport ${Math.round(edge)})`);
        }
        // 1.4.12: the ellipsis is only allowed because the full string is recoverable.
        if (!link.getAttribute("title")) throw new Error(`${testId}: a truncating entry must carry its full text in title`);
      }
    }

    const narrow = read("toc-narrow");
    if (!narrow.links.some((link) => link.scrollWidth > link.clientWidth)) {
      throw new Error("the 150px rail must ellipse at least one entry; none of them overflow their box");
    }
  },
};

/* ---- Props ---------------------------------------------------------- */
const PLAYGROUND_IDS = ["(none)", ...DOC_SECTIONS.map((s) => s.id)];

type PropsArgs = {
  label: string;
  activeEntry: string;
};

export const Props: StoryObj<PropsArgs> = {
  args: { label: "On this page", activeEntry: "ov-config" },
  argTypes: {
    activeEntry: {
      control: "select",
      options: PLAYGROUND_IDS,
      description: "Controlled active entry — drives aria-current + the indicator. \"(none)\" passes null (disables the spy, no active entry).",
      table: { category: "State" },
    },
    label: { control: "text", description: "Accessible name for the nav landmark.", table: { category: "A11y" } },
  },
  parameters: { controls: { disable: false } },
  render: ({ label, activeEntry }: PropsArgs) => (
    <LinkProvider component={DemoLink}>
    <Page maxWidth="none">
      <PageHeader
        title="Outline · Props"
        standfirst={<>{DEFINITION} The active entry is controlled here, so this page holds still while you read it. Scroll-spy in motion is on the Usage page.</>}
      />
      <Box style={{ padding: "8px 0 2px", maxWidth: 220 }}>
        <Outline items={DOC_SECTIONS} activeId={activeEntry === "(none)" ? null : activeEntry} label={label} />
      </Box>
      <PropsLead />
      <Rule />
      <Section title="Props reference" lead={<>Every prop <Code>Outline</Code> accepts. Give it <Code>items</Code> or a <Code>containerRef</Code>; <Code>activeId</Code> and <Code>getContainer</Code> pass through to the scroll-spy engine.</>}>
        <PropTable rows={OUTLINE_PROPS} />
      </Section>
    </Page>
    </LinkProvider>
  ),
};

/* ---- History ------------------------------------------------------------- */
export const History: Story = {
  render: () => (
    <Page>
      <PageHeader title="Outline · History" standfirst={DEFINITION} />
      <Section title="Decisions" lead="The rulings this component encodes.">
        <Flex direction="column" gap="3">
          <Decision id="[[outline-scrollspy]] · rAF scroll-spy">
            The active entry is chosen by a <strong>passive scroll listener + <Code>requestAnimationFrame</Code></strong>
            {" "}(not an <Code>IntersectionObserver</Code>): the active id is the <strong>last</strong> heading whose
            top has passed its activation line (its own <Code>scroll-margin-top</Code> + 1px), with an
            <Code>atBottom</Code> guard (the final section wins at page end even if it's too short to reach its
            line) and a top-edge guard (nothing active above the first heading). The pick logic is a pure,
            node-tested function; the component wires the DOM half.
          </Decision>
          <Decision id="[[outline-scrollspy]] · JS-measured indicator">
            The sliding indicator is <strong>JS-measured</strong>, not CSS anchor positioning (a named
            deferral until browser support matures): an effect reads the active link's box relative to the
            track and positions an absolute bar (<Code>transform</Code> + <Code>height</Code>). The slide rides the
            {" "}<Code>--ds-duration-moderate</Code> / <Code>--ds-ease-standard</Code> tokens, which the motion layer
            clamps to ~0ms under <Code>prefers-reduced-motion</Code> — so reduced motion snaps.
          </Decision>
          <Decision id="[[outline-scrollspy]] · aria-current=location">
            The active entry carries <Code>aria-current="location"</Code> — the ARIA value for the
            <strong> current location within a set</strong>, the correct token for a "you are here" marker in a
            page map. This is a deliberate upgrade over the nonstandard <Code>"true"</Code>.
          </Decision>
          <Decision id="[[outline-scrollspy]] · DOM-driven mode">
            Beyond explicit <Code>items</Code>, passing a <Code>containerRef</Code> builds the outline from that
            container's headings (<Code>h1</Code>–<Code>h6</Code> / <Code>[data-outline-heading]</Code>), assigning a
            slug id to any heading missing one and re-scanning on a <Code>MutationObserver</Code> — so a TOC tracks
            a live document without a hand-kept list.
          </Decision>
          <Decision id="[[outline-scrollspy]] · controlled disables spy">
            A controlled <Code>activeId</Code> (including <Code>null</Code>) <strong>disables the spy</strong> and is
            used verbatim — the escape hatch for driving the active section from routing or your own logic.
          </Decision>
          <Decision id="[[outline-scrollspy]] · flat list · pluggable Link">
            Entries are <strong>flat</strong>; <Code>level</Code> drives indentation only (no nested lists). Each
            entry routes through <Code>useLinkComponent</Code> — a plain in-page <Code>#anchor</Code> by default, or
            the app's framework link inside a <Code>&lt;LinkProvider&gt;</Code>. Zero net-new tokens.
          </Decision>
        </Flex>
      </Section>
      <Rule />
      <Section title="Changelog" lead="Notable changes, newest first — grows as the component evolves.">
        <Flex direction="column" gap="3">
          <Decision id="0.9.0">
            Initial <Code>System/Outline</Code>: the scroll-spy TOC on <Code>useScrollSpy</Code> +
            <Code>useOutlineFromDOM</Code> + the pluggable <Code>Link</Code>; JS-measured sliding indicator;
            <Code>aria-current="location"</Code>; explicit + DOM-driven entry sources; controlled
            <Code>activeId</Code> disables the spy. Zero net-new tokens.
          </Decision>
        </Flex>
      </Section>
    </Page>
  ),
};
