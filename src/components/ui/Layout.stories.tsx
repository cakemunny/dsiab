import type { CSSProperties, ReactNode } from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { Box, Code, Flex, Grid, Text } from "@radix-ui/themes";
import { Layout, type LayoutPadding, type LayoutResizableOptions } from "./Layout";
import {
  AnatomyLegend, Caption, Decision, DoDont, DODONT_LABEL, dotStyle, HexThemeKey, MeasuredRow, MeasuredSpec, Mono, NoteRow,
  Page, PageHeader, PropsLead, type PropDef, PropTable, Rule, Scenario, Section, toHex, TokenGroup,
} from "./_storyKit";
import { awaitMeasuredRows } from "../../foundations/_assert";

/** The one definition of this component — the standfirst every page of it opens with. */
const DEFINITION = (
  <>
    The page-shell composition primitive: a slot grid you assemble from <Code>Layout.Header</Code>,{" "}
    <Code>Layout.Panel</Code>, <Code>Layout.Content</Code>, and <Code>Layout.Footer</Code> in any order,
    which it arranges into header / [panel · content] / footer. It resolves the hairline dividers between
    adjacent areas and can cap the content measure. Landmark roles are opt-in per slot, because a Layout
    can nest.
  </>
);

/* Resolve a CSS custom property to an sRGB hex as it computes on `el` (P3-safe via the canvas). */
function tokenHex(el: Element, name: string): string {
  const probe = document.createElement("span");
  el.appendChild(probe);
  probe.style.color = `var(${name})`;
  const hex = toHex(getComputedStyle(probe).color);
  probe.remove();
  return hex;
}

/* ---- placeholder chrome (neutral bars — the shell, not the content, is the subject) ------------- */
const Bar = ({ w = "100%", h = 8 }: { w?: number | string; h?: number }) => (
  <Box style={{ width: w, height: h, borderRadius: "var(--ds-radius-2)", background: "var(--ds-fill-weak)" }} />
);
const SlotTag = ({ children }: { children: ReactNode }) => (
  <Text size="1" weight="bold" style={{ color: "var(--ds-text-weak)", letterSpacing: "0.06em" }}>{children}</Text>
);

/* A realistic, compact page shell built from the REAL Layout — reused by Usage, both as the token
   specimen and for the scenarios. Roleless by default so several can coexist on one docs page
   without minting duplicate landmarks (the opt-in roles are exercised in Props + _internal). */
function MiniLayout({
  height = 220, testid, dividers = true, contentWidth, panelResizable = false, padding = "3",
  panelWidth = 128, contentMin = 96,
}: {
  height?: number; testid?: string; dividers?: boolean; contentWidth?: number;
  panelResizable?: boolean | LayoutResizableOptions; padding?: LayoutPadding;
  panelWidth?: number; contentMin?: number;
}) {
  return (
    <Layout
      data-testid={testid}
      defaultHasDividers={dividers}
      padding={padding}
      contentWidth={contentWidth}
      // The rail measure and the content floor are set through the shell's own custom properties —
      // the same two knobs a real app reaches for — not an ad-hoc inline width on the slot.
      style={{
        height, border: "1px solid var(--ds-stroke-weak)", borderRadius: "var(--ds-radius-4)", overflow: "hidden",
        "--ds-layout-panel-width": `${panelWidth}px`,
        "--ds-layout-content-min": `${contentMin}px`,
      } as CSSProperties}
    >
      <Layout.Header>
        <Flex align="center" justify="between" gap="3">
          <SlotTag>HEADER</SlotTag>
          <Flex gap="2"><Bar w={48} /><Bar w={28} /></Flex>
        </Flex>
      </Layout.Header>
      <Layout.Panel resizable={panelResizable}>
        <Flex direction="column" gap="3">
          <SlotTag>PANEL</SlotTag>
          <Flex direction="column" gap="2"><Bar /><Bar w="70%" /><Bar w="85%" /><Bar w="60%" /></Flex>
        </Flex>
      </Layout.Panel>
      <Layout.Content>
        <Flex direction="column" gap="3">
          <SlotTag>CONTENT</SlotTag>
          <Flex direction="column" gap="2"><Bar /><Bar w="92%" /><Bar w="96%" /><Bar w="80%" /></Flex>
        </Flex>
      </Layout.Content>
      <Layout.Footer>
        <Flex align="center" justify="between"><SlotTag>FOOTER</SlotTag><Bar w={64} /></Flex>
      </Layout.Footer>
    </Layout>
  );
}

/* ---- Anatomy diagram — a labelled page-shell wireframe with numbered callouts ------------------- */
const wire: CSSProperties = { display: "flex", alignItems: "center", justifyContent: "center" };
const num = (over: CSSProperties): CSSProperties => ({ ...dotStyle, ...over });

function AnatomyDiagram() {
  return (
    <Box style={{ overflowX: "auto" }}>
      <Box style={{ position: "relative", width: "100%", minWidth: 380, maxWidth: 560, margin: "0 auto" }}>
        {/* The shell: a real slot grid drawn to scale (surfaces + dividers are the actual --ds-* roles). */}
        <Box style={{ height: 300, borderRadius: "var(--ds-radius-4)", border: "1px solid var(--ds-stroke-weak)", overflow: "hidden", background: "var(--ds-bg-base)", display: "flex", flexDirection: "column" }}>
          <Box style={{ ...wire, justifyContent: "flex-start", height: 52, flexShrink: 0, background: "var(--ds-bg-raised)", padding: "0 16px" }}><SlotTag>HEADER</SlotTag></Box>
          <Box style={{ height: 1, background: "var(--ds-stroke-weak)", flexShrink: 0 }} />
          <Flex style={{ flex: 1, minHeight: 0 }}>
            <Box style={{ ...wire, justifyContent: "flex-start", alignItems: "flex-start", width: 132, flexShrink: 0, background: "var(--ds-bg-subtle)", padding: 16 }}><SlotTag>PANEL</SlotTag></Box>
            <Box style={{ width: 1, background: "var(--ds-stroke-weak)", flexShrink: 0 }} />
            <Box style={{ ...wire, justifyContent: "flex-start", alignItems: "flex-start", flex: 1, padding: 16 }}><SlotTag>CONTENT</SlotTag></Box>
          </Flex>
          <Box style={{ height: 1, background: "var(--ds-stroke-weak)", flexShrink: 0 }} />
          <Box style={{ ...wire, justifyContent: "flex-start", height: 44, flexShrink: 0, background: "var(--ds-bg-raised)", padding: "0 16px" }}><SlotTag>FOOTER</SlotTag></Box>
        </Box>

        {/* Numbered callouts — positioned against the wireframe's fixed geometry above. */}
        <Box style={num({ left: 6, top: 6 })}>1</Box>
        <Box style={num({ left: "calc(50% - 9px)", top: 16 })}>2</Box>
        <Box style={num({ left: 52, top: 150 })}>3</Box>
        <Box style={num({ left: "62%", top: 150 })}>4</Box>
        <Box style={num({ left: "calc(50% - 9px)", top: 268 })}>5</Box>
        <Box style={num({ left: 122, top: 108 })}>6</Box>
      </Box>
    </Box>
  );
}
const ANATOMY_PARTS: [number, string, string][] = [
  [1, "Shell", "the page frame — a flex column: header on top, footer on the bottom, the body row between. Paints --ds-bg-base."],
  [2, "Header", "the top chrome bar (title, global actions). Opt-in role=\"banner\". Raised surface."],
  [3, "Panel", "a side rail — sidebar, inspector, or aside. Opt-in role=\"complementary\"; optionally resizable. Subtle surface."],
  [4, "Content", "the primary reading area — fills the remaining measure, constrained + centred by contentWidth when set."],
  [5, "Footer", "the bottom chrome bar (status, meta). Opt-in role=\"contentinfo\". Raised surface."],
  [6, "Divider", "a hairline rule between adjacent areas — defaultHasDividers with per-slot hasDivider overrides. A resizable panel's handle takes this seam instead."],
];

/* ---- Properties ---------------------------------------------------------- */
const LAYOUT_PROPS: PropDef[] = [
  { name: "children", type: "ReactNode", desc: <>The slot children — <Code>Layout.Header</Code>, <Code>Layout.Panel</Code>, <Code>Layout.Content</Code>, <Code>Layout.Footer</Code>, in any order (the Layout arranges them).</>, source: "Layout.tsx" },
  { name: "contentWidth", type: "number | string", desc: <>Cap + centre the content measure. A number is px; a string is any CSS length (<Code>"72ch"</Code>). Omit for full-bleed.</>, source: "Layout.tsx" },
  { name: "padding", type: `"0"–"6"`, def: `"4"`, desc: <>Slot-aware inner padding on the <Code>--ds-space</Code> scale (<Code>"4"</Code> = 16px). Header/footer get inline + block padding; content + panel get full padding.</>, source: "Layout.tsx" },
  { name: "defaultHasDividers", type: "boolean", def: "false", desc: <>Draw a hairline rule between adjacent areas (header↔body, body↔footer, panel↔content).</>, source: "Layout.tsx" },
  { name: "data-testid", type: "string", desc: <>Forwarded to the root — along with <Code>className</Code>, <Code>style</Code>, <Code>id</Code>, and every other DOM/aria prop (<Code>…rest</Code>), forwarded honestly rather than accepted-and-discarded.</>, source: "Layout.tsx" },
  { name: "Slot: landmark", type: "boolean", def: "false", desc: <>On a slot: expose its ARIA landmark — header ⇒ <Code>banner</Code>, footer ⇒ <Code>contentinfo</Code>, panel ⇒ <Code>complementary</Code>. <strong>Opt-in, never auto-emitted</strong> (a nested Layout must not stamp two of the same). <Code>main</Code> is AppShell's.</>, source: "Layout.tsx" },
  { name: "Slot: hasDivider", type: "boolean", desc: <>On a slot: override <Code>defaultHasDividers</Code> for the rule beside it — header: below it; footer: above it; panel: after it (toward content).</>, source: "Layout.tsx" },
  { name: "Panel: resizable", type: "boolean | LayoutResizableOptions", def: "false", desc: <>Make the panel user-resizable on the shared <Code>useResizable</Code> engine — it renders a <Code>ResizeHandle</Code> on its content-facing edge and follows the live size. Options are the narrower <Code>LayoutResizableOptions</Code> (the panel owns <Code>orientation</Code> + <Code>side</Code>). The handle takes the panel↔content seam (no extra divider). SSR-safe.</>, source: "Layout.tsx" },
  { name: "Panel: side", type: `"start" | "end"`, def: `"start"`, desc: <>Which edge a resizable panel docks to — <Code>"start"</Code> puts the handle on its trailing edge, <Code>"end"</Code> on its leading edge.</>, source: "Layout.tsx" },
  { name: "--ds-layout-panel-width", type: "CSS length", def: "260px", desc: <>The rail's fixed measure, set as a custom property on the Layout (or any ancestor). Areas are <Code>border-box</Code>, so this is the width the rail <em>occupies</em> — padding included, and it doesn't move when <Code>padding</Code> does.</>, source: "components.css" },
  { name: "--ds-layout-content-min", type: "CSS length", def: "0", desc: <>The floor under the content measure. The panel can't shrink, so content is the only flexible region — with no floor it absorbs every pixel a narrowing viewport takes and <strong>crushes silently</strong> (no scrollbar; text wraps to one character per line). Opt-in and <Code>0</Code> by default, so no existing shell changes; set it on any shell that renders standalone.</>, source: "components.css" },
];

/* ========================================================================== */
const meta = {
  title: "Components/Layout/Layout",
  component: Layout,
  parameters: {
    controls: { disable: true },
    docs: {
      description: {
        component:
          "**Layout** is the page-shell composition primitive — a structured slot grid you assemble from " +
          "`Layout.Header`, `Layout.Panel`, `Layout.Content`, and `Layout.Footer` (in any order; the Layout " +
          "arranges them into *header / [panel · content] / footer*). It resolves the hairline **dividers** " +
          "between adjacent areas from `defaultHasDividers` + per-slot overrides, applies **slot-aware padding**, " +
          "and can **cap the content measure** with `contentWidth`. Landmark roles (`banner`/`contentinfo`/" +
          "`complementary`) are **opt-in** per slot — never auto-emitted, because a Layout can nest; `main` is " +
          "AppShell's. A panel can be **resizable** on the shared resize engine. It's the **full docs tier**: " +
          "History · Anatomy · Usage · Props.",
      },
    },
  },
} satisfies Meta<typeof Layout>;
export default meta;
type Story = StoryObj<typeof Layout>;

/* ---- Anatomy ------------------------------------------------------------- */
export const Anatomy: Story = {
  render: () => (
    <Page>
      <PageHeader title="Layout · Anatomy" standfirst={DEFINITION} />
      <Section title="Anatomy" lead="A page shell — a header and footer bracketing a body row of panel(s) and content. Dividers mark the real boundaries; each surface reads from a --ds-* role.">
        <AnatomyDiagram />
        <AnatomyLegend parts={ANATOMY_PARTS} />
        <Caption>Slots may be given in any order — the Layout arranges them. Omit a slot and its area (and the divider beside it) simply isn't drawn.</Caption>
      </Section>
    </Page>
  ),
};

/* ---- Usage --------------------------------------------------------------- */
export const Usage: Story = {
  // The DoDont callout labels (success/error text on the tint) measure ~4.1–4.4 — just under axe's strict
  // 4.5; the DO/DON'T word + icon already carry the meaning, so color-contrast is scoped off for THIS story
  // only (the documented specimen exception, same as ResizeHandle/Separator). The Layout specimens are neutral.
  parameters: { a11y: { context: { exclude: [DODONT_LABEL] } } },
  render: (_args, { globals }) => (
    <Page maxWidth={920}>
      <PageHeader title="Layout · Usage" standfirst={DEFINITION} />
      <Section title="Real shells" lead="Three shapes the same primitive covers — an app shell, a documentation page, and a split panel. All roleless here (multiple on one page); opt in to the landmark roles in a real app.">
        <Grid columns={{ initial: "1", md: "3" }} gapX="6" gapY="5">
          <Scenario label="APP SHELL" caption="Header · a nav panel · the working content · a status footer. Dividers separate the chrome from the work.">
            <MiniLayout height={220} dividers testid="usage-app" />
          </Scenario>
          <Scenario label="DOC PAGE" caption="No side panel; a capped, centred content measure (contentWidth) keeps prose readable. A header, no footer.">
            <Layout defaultHasDividers padding="3" contentWidth={220} style={{ height: 220, border: "1px solid var(--ds-stroke-weak)", borderRadius: "var(--ds-radius-4)", overflow: "hidden" }}>
              <Layout.Header><SlotTag>DOC TITLE</SlotTag></Layout.Header>
              <Layout.Content>
                <Flex direction="column" gap="2"><Bar /><Bar w="96%" /><Bar w="90%" /><Bar w="98%" /><Bar w="72%" /></Flex>
              </Layout.Content>
            </Layout>
          </Scenario>
          {/* Dividers ON, like its two neighbours — this scenario had them off wholesale to keep the
              panel↔content seam clear for the handle, which also erased the header↔body and body↔footer
              rules, leaving the footer strip abutting the body with no edge between them. The component
              already suppresses the auto-divider AFTER a resizable panel (Layout.tsx), so the handle
              still owns that one seam and nothing is drawn twice. */}
          <Scenario label="SPLIT PANEL" caption="A resizable panel beside content — the panel↔content seam IS the resize handle, so no rule is drawn there; the chrome bars keep theirs. Drag it or focus it and use the arrows.">
            <MiniLayout height={220} dividers panelResizable={{ defaultSize: 110, minSizePx: 100 }} testid="usage-split" />
          </Scenario>
        </Grid>
      </Section>

      <Rule />

      <Section
        title="Floor the content measure"
        lead={<>The rail is a fixed measure and doesn't shrink, so content is the only region with any give. In a narrow window it gives up <em>everything</em> — and it does it silently: the shell still fits, so no scrollbar appears; the text simply wraps to one character per line and then to nothing. Set <Code>--ds-layout-content-min</Code> and the row runs out of room instead, which is a problem you can see. Both shells below are 200px wide with the same 128px rail.</>}
      >
        <Grid columns={{ initial: "1", sm: "2" }} gap="3">
          {/* DO leads the pair — every DO/DON'T grid in the system reads good-then-bad, so the eye
              learns the correct shape before the failure it's being warned about. */}
          <DoDont kind="do" bare note="A 140px floor: the body row overflows at its minimum and the shell's own wrapper scrolls. The content keeps a readable measure, and the squeeze is visible instead of silent.">
            {/* tabIndex 0 because this box actually scrolls: a scrollable region a keyboard user cannot
                reach fails WCAG 2.1.1 (axe scrollable-region-focusable). It is a DO specimen, so the
                fix is to make the pattern correct rather than to exempt it — the blanket [data-dodont]
                axe exclusion this page used to carry is what hid it. */}
            <Box tabIndex={0} style={{ width: 200, maxWidth: "100%", overflowX: "auto", background: "var(--ds-bg-base)", border: "1px solid var(--ds-stroke-weak)", borderRadius: "var(--ds-radius-3)", padding: 12 }}>
              <Box style={{ minWidth: "fit-content" }}>
                <MiniLayout height={190} dividers contentMin={140} testid="usage-floor" />
              </Box>
            </Box>
          </DoDont>
          <DoDont kind="dont" bare note="No floor: the 128px rail keeps its full measure and the content column is squeezed under 50px — the word CONTENT breaks a letter per line, with nothing on screen to say anything went wrong.">
            <Box style={{ width: 200, maxWidth: "100%", background: "var(--ds-bg-base)", border: "1px solid var(--ds-stroke-weak)", borderRadius: "var(--ds-radius-3)", padding: 12 }}>
              <MiniLayout height={190} dividers contentMin={0} testid="usage-nofloor" />
            </Box>
          </DoDont>
        </Grid>
        <Caption>
          The floor is opt-in (<Code>0</Code> by default), so it never changes an existing shell. It also isn't the whole answer to a narrow viewport — a responsive shell that swaps the rail for a drawer is, and that swap belongs to AppShell, not to this primitive.
        </Caption>
      </Section>

      <Rule />

      <Section title="Dividers mark boundaries — not spacing" lead="A divider says 'these are distinct regions.' Reach for padding or a gap when you just want breathing room, and never nest a Layout as a spacing hack.">
        <Grid columns={{ initial: "1", sm: "2" }} gap="3">
          <DoDont kind="do" bare note="Turn dividers on where areas are genuinely distinct — the chrome bars and the panel read as separate regions from the content.">
            <Box style={{ background: "var(--ds-bg-base)", border: "1px solid var(--ds-stroke-weak)", borderRadius: "var(--ds-radius-3)", padding: 12 }}>
              <MiniLayout height={150} dividers />
            </Box>
          </DoDont>
          <DoDont kind="dont" bare note="Don't nest a second Layout inside content just to add space — that mints phantom regions (and slots) for AT. Use padding / a gap instead.">
            <Box style={{ background: "var(--ds-bg-base)", border: "1px solid var(--ds-stroke-weak)", borderRadius: "var(--ds-radius-3)", padding: 12 }}>
              <Layout padding="4" style={{ height: 150, border: "1px solid var(--ds-stroke-weak)", borderRadius: "var(--ds-radius-3)", overflow: "hidden" }}>
                <Layout.Content>
                  <Layout padding="4" style={{ height: "100%", outline: "1px dashed var(--ds-stroke-strong)" }}>
                    <Layout.Content><SlotTag>NESTED AS A SPACER — DON'T</SlotTag></Layout.Content>
                  </Layout>
                </Layout.Content>
              </Layout>
            </Box>
          </DoDont>
        </Grid>
      </Section>

      <Rule />

      {/* The closing reference section. The provider is what makes the table live: every measured row
          re-reads its value when this key changes, so an accent/appearance flip re-resolves the spec. */}
      <HexThemeKey.Provider value={`${globals.accent}-${globals.appearance}-${globals.contrast}`}>
        <Section title="Tokens" lead="Measured off a rendered shell — each row names the element and the property that paints a surface, reads it, and checks it against the role it claims.">
          <TokenGroup
            label="SURFACES + DIVIDERS"
            blurb="A live page shell painted from the surface ladder; dividers are the System Separator (already --ds-stroke-weak). Every row below is read off a rendered shell."
            specimen={<Box style={{ width: "100%" }}><MiniLayout testid="spec-live" height={200} /></Box>}
          >
            <MeasuredSpec render={() => <MiniLayout height={200} />}>
              <MeasuredRow
                part="Shell · content"
                note="The page's own base surface — everything else is chrome on top of it."
                token="--ds-bg-base"
                select=".rt-ds-layout"
                prop="background-color"
              />
              <MeasuredRow
                part="Header · footer"
                note="The raised chrome step, shared by both bars."
                token="--ds-bg-raised"
                select='.rt-ds-layout-area[data-ds-layout-area="header"]'
                prop="background-color"
              />
              <MeasuredRow
                part="Panel rail"
                note="One step off the base, so the rail reads as beside the content rather than on it."
                token="--ds-bg-subtle"
                select='.rt-ds-layout-area[data-ds-layout-area="panel"]'
                prop="background-color"
              />
              <MeasuredRow
                part="Divider"
                note="The System Separator, sized to its seam — the shell adds geometry, never paint."
                token="--ds-stroke-weak"
                select=".rt-ds-layout-divider"
                prop="background-color"
              />
            </MeasuredSpec>
            <NoteRow part="Slot padding" value="slot-aware, on the --ds-space scale" radix="padding prop → --ds-layout-pad" />
            <NoteRow part="Content measure" value="capped + centred when set" radix="contentWidth" />
            <NoteRow part="Panel measure" value="260px, border-box — the width it occupies" radix="--ds-layout-panel-width" />
            <NoteRow part="Content floor" value="opt-in minimum; 0 by default" radix="--ds-layout-content-min" />
            <NoteRow part="Dividers" value="System Separator (decorative)" radix="defaultHasDividers + hasDivider" />
          </TokenGroup>
        </Section>
      </HexThemeKey.Provider>
    </Page>
  ),
  play: async ({ canvasElement }) => {
    // The token table's EVIDENCE, asserted at runtime — every row read a REAL rendered shell.
    // `awaitMeasuredRows` blocks until every row has recorded its evidence (a row whose element
    // mounts late retries for up to 60 frames before it reports), then runs the identical assertions.
    const rows = await awaitMeasuredRows(canvasElement);
    if (rows.measured !== 4 || rows.unproven !== 0) {
      throw new Error(`expected 4 measured / 0 unproven token rows, got ${rows.measured} / ${rows.unproven}`);
    }

    // Passive (no driving / no flash): a static real Layout is on the page, so its slot structure, divider
    // resolution, and surface-token binding are asserted right here. axe runs automatically.
    const root = canvasElement.querySelector<HTMLElement>('[data-testid="spec-live"]');
    if (!root) throw new Error("the token spec must render a live Layout specimen");

    // All four slot areas render, in the right regions.
    for (const area of ["header", "panel", "content", "footer"]) {
      if (!root.querySelector(`[data-ds-layout-area="${area}"]`)) throw new Error(`missing slot area: ${area}`);
    }
    // defaultHasDividers → a horizontal rule above/below the body and a vertical rule between panel & content.
    const dividers = root.querySelectorAll("[data-ds-layout-divider]");
    if (dividers.length < 3) throw new Error(`expected 3 area dividers with defaultHasDividers; got ${dividers.length}`);
    if (!root.querySelector('[data-ds-layout-divider="vertical"]')) throw new Error("no vertical divider between panel and content");

    // Surface token binding — the shell, header, and panel paint their --ds-* roles.
    const themeRoot = canvasElement.querySelector<HTMLElement>(".radix-themes") ?? root;
    const check = (el: Element | null, token: string, label: string) => {
      if (!el) throw new Error(`${label}: element missing`);
      const got = toHex(getComputedStyle(el).backgroundColor);
      const want = tokenHex(themeRoot, token);
      if (got !== want) throw new Error(`${label} must paint ${token}; got ${got} vs ${want}`);
    };
    check(root, "--ds-bg-base", "shell");
    check(root.querySelector('[data-ds-layout-area="header"]'), "--ds-bg-raised", "header");
    check(root.querySelector('[data-ds-layout-area="panel"]'), "--ds-bg-subtle", "panel");

    // Structural assertions on the real scenarios (passive — no driving).
    const app = canvasElement.querySelector<HTMLElement>('[data-testid="usage-app"]');
    if (!app) throw new Error("missing app-shell scenario");
    // The app shell has all four areas + dividers.
    for (const area of ["header", "panel", "content", "footer"]) {
      if (!app.querySelector(`[data-ds-layout-area="${area}"]`)) throw new Error(`app shell missing area ${area}`);
    }
    // The split-panel scenario: dividers ON everywhere EXCEPT the panel↔content seam, which the
    // resizable panel's handle takes. That is the claim the scenario makes, so assert both halves —
    // the chrome bars keep their rules, and the seam is a handle rather than a doubled-up hairline.
    const split = canvasElement.querySelector<HTMLElement>('[data-testid="usage-split"]');
    if (!split) throw new Error("missing split-panel scenario");
    const splitRules = split.querySelectorAll('[data-ds-layout-divider="horizontal"]');
    if (splitRules.length !== 2) throw new Error(`split scenario must bound header + footer with a rule each; got ${splitRules.length}`);
    if (split.querySelector('[data-ds-layout-divider="vertical"]')) throw new Error("a resizable panel's handle IS the panel↔content seam — no vertical divider should be drawn beside it");
    const handle = split.querySelector('[role="separator"]');
    if (!handle) throw new Error("a resizable panel must render a role=separator handle");
    if (handle.getAttribute("aria-orientation") !== "vertical") throw new Error("panel resize handle must be a vertical splitter");
    // The panel must be bounded so BOTH areas render at a usable measure — the seam reads as "panel
    // BESIDE content", not a panel that eats the whole column (the crushed-content regression).
    const splitPanel = split.querySelector<HTMLElement>('[data-ds-layout-area="panel"]');
    const splitContent = split.querySelector<HTMLElement>('[data-ds-layout-area="content"]');
    if (!splitPanel) throw new Error("split scenario must render a resizable panel area");
    if (!splitContent) throw new Error("split scenario must render a content area");
    const panelW = Math.round(splitPanel.getBoundingClientRect().width);
    const contentW = Math.round(splitContent.getBoundingClientRect().width);
    if (contentW < 100) throw new Error(`split content must keep a usable measure (>=100px); got ${contentW}px beside a ${panelW}px panel`);
    if (panelW < 100) throw new Error(`split panel must render at a visible size (>=100px); got ${panelW}px`);

    // The content floor holds inside a 200px shell. Its unfloored twin beside it is the control: same
    // rail, same shell width, and its content really is crushed — that contrast is what the pair claims.
    const noFloor = canvasElement.querySelector<HTMLElement>('[data-testid="usage-nofloor"]');
    if (!noFloor) throw new Error("missing unfloored control scenario");
    const noFloorContent = noFloor.querySelector<HTMLElement>('[data-ds-layout-area="content"]');
    if (!noFloorContent) throw new Error("unfloored control must render a content area");
    const crushedW = Math.round(noFloorContent.getBoundingClientRect().width);
    if (crushedW > 80) throw new Error(`the unfloored control must actually be crushed (<=80px) for the pair to teach; got ${crushedW}px`);

    const floored = canvasElement.querySelector<HTMLElement>('[data-testid="usage-floor"]');
    if (!floored) throw new Error("missing content-floor scenario");
    const flooredContent = floored.querySelector<HTMLElement>('[data-ds-layout-area="content"]');
    if (!flooredContent) throw new Error("content-floor scenario must render a content area");
    const flooredW = Math.round(flooredContent.getBoundingClientRect().width);
    if (flooredW < 140) throw new Error(`--ds-layout-content-min must floor the content measure at 140px; got ${flooredW}px`);
    // …and the panel is border-box, so its declared measure is the width it occupies (not width + padding).
    const flooredPanel = floored.querySelector<HTMLElement>('[data-ds-layout-area="panel"]');
    if (!flooredPanel) throw new Error("content-floor scenario must render a panel area");
    if (getComputedStyle(flooredPanel).boxSizing !== "border-box") throw new Error("layout areas must be border-box");
    const flooredPanelW = Math.round(flooredPanel.getBoundingClientRect().width);
    if (flooredPanelW !== 128) throw new Error(`--ds-layout-panel-width: 128px must occupy 128px (border-box); got ${flooredPanelW}px`);
  },
};

/* ---- Props ---------------------------------------------------------- */
type PropsArgs = {
  padding: LayoutPadding;
  defaultHasDividers: boolean;
  contentWidth: number;
  panelWidth: number;
  contentMin: number;
  panelResizable: boolean;
  landmarks: boolean;
};

/** Props — the live, args-driven Layout. Toggle dividers, padding, the capped content measure, the
 *  rail measure and the content floor, a resizable panel, and the opt-in landmark roles (one Layout on
 *  the page, so the roles stay unique). Narrow the browser with the floor on and the body row runs out
 *  of room and scrolls; drop the floor to 0 and the content silently crushes instead. */
export const Props: StoryObj<PropsArgs> = {
  args: { padding: "4", defaultHasDividers: true, contentWidth: 0, panelWidth: 160, contentMin: 240, panelResizable: false, landmarks: false },
  argTypes: {
    padding: { control: "inline-radio", options: ["0", "1", "2", "3", "4", "5", "6"], description: "Slot-aware inner padding on the --ds-space scale.", table: { category: "Layout" } },
    defaultHasDividers: { control: "boolean", description: "Draw hairline rules between adjacent areas.", table: { category: "Layout" } },
    contentWidth: { control: { type: "number", min: 0, max: 900, step: 20 }, description: "Cap + centre the content measure in px (0 = full-bleed).", table: { category: "Layout" } },
    panelWidth: { name: "panel width", control: { type: "number", min: 80, max: 480, step: 20 }, description: "--ds-layout-panel-width — the rail's fixed measure (260px by default). Border-box: this is what it occupies.", table: { category: "Panel" } },
    contentMin: { name: "content floor", control: { type: "number", min: 0, max: 480, step: 20 }, description: "--ds-layout-content-min — the floor under the content measure (0 = none, the default). Narrow the window to see it hold.", table: { category: "Layout" } },
    panelResizable: { name: "panel resizable", control: "boolean", description: "Make the panel user-resizable (the handle becomes the panel↔content seam).", table: { category: "Panel" } },
    landmarks: { control: "boolean", description: "Expose the opt-in landmark roles (header=banner, panel=complementary, footer=contentinfo).", table: { category: "A11y" } },
  },
  parameters: { controls: { disable: false } },
  render: ({ padding, defaultHasDividers, contentWidth, panelWidth, contentMin, panelResizable, landmarks }: PropsArgs) => (
    <Page maxWidth="none">
      <PageHeader title="Layout · Props" standfirst={DEFINITION} />
      {/* The scroll lives on the shell's wrapper, not inside Layout — the floor makes the row overflow;
          what that overflow DOES is the app's call. `fit-content` lets the root grow to the floored row. */}
      <Box p="3" style={{ overflowX: "auto" }}>
        <Layout
          key={`${panelResizable}-${contentWidth}`}
          data-testid="pg-layout"
          padding={padding}
          defaultHasDividers={defaultHasDividers}
          contentWidth={contentWidth || undefined}
          style={{
            height: 320, border: "1px solid var(--ds-stroke-weak)", borderRadius: "var(--ds-radius-4)", overflow: "hidden",
            minWidth: "fit-content",
            "--ds-layout-panel-width": `${panelWidth}px`,
            "--ds-layout-content-min": `${contentMin}px`,
          } as CSSProperties}
        >
          <Layout.Header landmark={landmarks}>
            <Flex align="center" justify="between"><SlotTag>HEADER</SlotTag><Flex gap="2"><Bar w={48} /><Bar w={28} /></Flex></Flex>
          </Layout.Header>
          <Layout.Panel landmark={landmarks} resizable={panelResizable}>
            <Flex direction="column" gap="3"><SlotTag>PANEL</SlotTag><Flex direction="column" gap="2"><Bar /><Bar w="70%" /><Bar w="84%" /></Flex></Flex>
          </Layout.Panel>
          <Layout.Content>
            <Flex direction="column" gap="3"><SlotTag>CONTENT</SlotTag><Flex direction="column" gap="2"><Bar /><Bar w="94%" /><Bar w="98%" /><Bar w="76%" /></Flex></Flex>
          </Layout.Content>
          <Layout.Footer landmark={landmarks}>
            <Flex align="center" justify="between"><SlotTag>FOOTER</SlotTag><Bar w={64} /></Flex>
          </Layout.Footer>
        </Layout>
      </Box>
      <PropsLead />
      <Rule />
      <Section title="Props reference" lead={<>Every meaningful prop — the Layout root, the slot props, and the panel's resizable options. The <Mono>Slot:</Mono> / <Mono>Panel:</Mono> rows apply to the slot children.</>}>
        <PropTable rows={LAYOUT_PROPS} />
      </Section>
    </Page>
  ),
};

/* ---- History ------------------------------------------------------------- */
export const History: Story = {
  render: () => (
    <Page>
      <PageHeader title="Layout · History" standfirst={DEFINITION} />
      <Section title="Decisions" lead="The rulings this component encodes.">
        <Flex direction="column" gap="3">
          <Decision id="[[layout-primitive]] · slot contexts">
            The page shell is a <strong>structured slot grid</strong>, not the flex-wrapping box the source's
            docs describe. Children are classified into slots (<Code>Header</Code>/<Code>Panel</Code>/
            <Code>Content</Code>/<Code>Footer</Code>) by a static slot marker and share one Layout context; the
            root <strong>resolves which dividers to draw</strong> between adjacent areas and applies slot-aware
            padding. The scan is <strong>synchronous</strong> — an SSR-safe approach that avoids a mount-time
            registration effect, which would race divider placement and flash on hydration.
          </Decision>
          <Decision id="Documented API">
            <Code>contentWidth</Code>, <Code>padding</Code>, and <Code>defaultHasDividers</Code> are <strong>real
            API the source hides</strong> — this component documents them (see Properties). They constrain the
            content measure, set slot-aware padding, and toggle the area dividers respectively.
          </Decision>
          <Decision id="Forward rest · [[layout-primitive]]">
            The root <strong>forwards</strong> <Code>…rest</Code> + <Code>data-testid</Code> (and
            <Code>className</Code>/<Code>style</Code>/<Code>id</Code>/aria). The rule here is <strong>forward
            honestly or omit from the type</strong> — never declare a prop surface and silently discard it.
          </Decision>
          <Decision id="Landmarks · opt-in">
            <Code>banner</Code>/<Code>contentinfo</Code>/<Code>complementary</Code> are <strong>opt-in</strong>
            per slot (the <Code>landmark</Code> prop), never auto-emitted: a Layout can be nested, and multiple
            same-type landmarks are invalid. Slots render generic containers by default; <Code>main</Code> is
            deliberately not offered here — AppShell owns the single <Code>main</Code> landmark + skip target.
          </Decision>
          <Decision id="Content floor · opt-in on the primitive">
            The rail is <Code>flex: 0 0 auto</Code> — a rail that narrows with the window stops being a rail —
            which leaves content as the <strong>only</strong> flexible region. Given no floor it gives up
            everything, and it does so <strong>silently</strong>: the shell still fits, so nothing scrolls; the
            text just wraps to one character per line and then to nothing. The floor lives on the primitive as
            <Code>--ds-layout-content-min</Code>, the sibling of <Code>--ds-layout-panel-width</Code>, and
            defaults to <Code>0</Code> — <strong>opt-in</strong>, so no existing shell moves, and no new token
            or prop is minted for it. Layout does not impose an overflow mode of its own; what the overflow
            <em>does</em> is the shell's call. The responsive rail→drawer swap stays AppShell's job.
          </Decision>
          <Decision id="Areas are border-box">
            A declared area width is the width it <strong>occupies</strong>. Under content-box the documented
            <Code>260px</Code> rail rendered <Code>292px</Code> at the default padding — and widened again with
            every step of the <Code>padding</Code> prop, so the number in the docs described nothing you could
            measure on screen.
          </Decision>
          <Decision id="Resizable · shared engine">
            A resizable <Code>Layout.Panel</Code> reuses the shared <Code>useResizable</Code> engine +
            <Code>ResizeHandle</Code> (the WAI window-splitter contract), rather than a bespoke splitter. The
            handle <strong>is</strong> the panel↔content seam (it suppresses the auto-divider there); the hook is
            isolated in a subcomponent so it is never called inside a <Code>.map()</Code>.
          </Decision>
        </Flex>
      </Section>

      <Rule />

      <Section title="Changelog" lead="Notable changes, newest first.">
        <Flex direction="column" gap="3">
          <Decision id="0.9.0 · content floor + border-box areas">
            Added <Code>--ds-layout-content-min</Code>, an opt-in floor under the content measure
            (<Code>0</Code> by default — no existing shell changes). Without it the fixed rail kept its full
            width while content absorbed every pixel a narrowing viewport took, down to nothing, with no
            scrollbar to show it. Slot areas are now <Code>box-sizing: border-box</Code>, so a declared panel
            width is the width it occupies — previously <Code>260px</Code> rendered <Code>292px</Code> at the
            default padding, and grew again whenever <Code>padding</Code> did.
          </Decision>
          <Decision id="0.9.0">
            Initial <Code>System/Layout/Layout</Code> — the page-shell primitive (<Code>Layout</Code> +
            <Code>Header</Code>/<Code>Footer</Code>/<Code>Panel</Code>/<Code>Content</Code> slots, via a namespace
            or named exports). Synchronous slot-scan + divider resolution; documented
            <Code>contentWidth</Code>/<Code>padding</Code>/<Code>defaultHasDividers</Code>; honest
            <Code>…rest</Code>/<Code>data-testid</Code> forwarding; opt-in landmark roles; a resizable panel on the
            shared engine. Painted from <Code>--ds-*</Code> surfaces + the System Separator — no new tokens.
            Stories split History · Anatomy · Usage · Props.
          </Decision>
        </Flex>
      </Section>
    </Page>
  ),
};
