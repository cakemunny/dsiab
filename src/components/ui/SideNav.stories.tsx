import type { Meta, StoryObj } from "@storybook/react-vite";
import { useEffect, useState } from "react";
import { Box, Code, Flex, Grid, Text } from "@radix-ui/themes";
import { House, ChartBar, Users, Gear, FileText, Lifebuoy } from "@phosphor-icons/react";
import { SideNav, SideNavItem, SideNavSection, SideNavHeading, SideNavCollapseButton } from "./SideNav";
import { LinkProvider } from "./Link";
import { Badge } from "./Badge";
import { ComparisonSection, NAV_SURFACES_COMPARISON } from "./_comparisons";
import {
  Caption, Decision, DemoLink, DoDont, DODONT_LABEL, HexThemeKey, MeasuredRow, MeasuredSpec, Mono, OpenedByClick, Page,
  PageHeader, PropsLead, type PropDef, PropTable, Rule, Section,
} from "./_storyKit";
import { awaitMeasuredRows } from "../../foundations/_assert";

/* ---- a realistic rail body reused across the specimens --------------------- */
function RailBody() {
  return (
    <>
      <SideNavSection>
        <SideNavHeading>Workspace</SideNavHeading>
        <SideNavItem icon={<House />} label="Home" href="#home" isSelected />
        <SideNavItem icon={<ChartBar />} label="Reports" defaultExpanded>
          <SideNavItem label="Overview" href="#reports-overview" />
          <SideNavItem label="Traffic" href="#reports-traffic" />
          <SideNavItem label="Conversions" href="#reports-conversions" />
        </SideNavItem>
        <SideNavItem icon={<Users />} label="Team" href="#team" endContent={<Badge>4</Badge>} />
        <SideNavItem icon={<FileText />} label="Documents" href="#docs" />
      </SideNavSection>
      <SideNavSection>
        <SideNavHeading>Account</SideNavHeading>
        <SideNavItem icon={<Gear />} label="Settings" href="#settings" />
        <SideNavItem icon={<Lifebuoy />} label="Help" href="#help" />
      </SideNavSection>
    </>
  );
}

/* THE SPECIMEN FRAMES ARE SIZED BY WHAT THEY HOLD, NEVER BY A PX LITERAL.
 *
 * They were `height: 380 / 420 / 260`, numbers picked against the ladder before [[nav-row-ladder]]. When a nav row grew
 * from 24 / 32 / 40 to 32 / 36 / 40 the frames did not, and the rail overflowed by 46 / 86 / 126px at
 * small / medium / large — taking the collapse button off the bottom of every frame while the section
 * lead said "use the button at the bottom to collapse it". A literal that has to be re-picked whenever
 * the ladder moves will go stale again, so none of these are literals now.
 *
 * `frameStyle` — fit-content: the frame is exactly as tall as the rail it holds, at any tier, so
 * everything in the rail is on screen by construction and the collapse button cannot be cropped again.
 * `railRows` — the one place a BOUND is the lesson: the DO / DON'T pair, where the point is that the
 * same box holds a short grouped rail comfortably and a flat wall not at all. */
const frameStyle = {
  height: "fit-content",
  border: "1px solid var(--ds-stroke-weak)",
  borderRadius: "var(--ds-radius-4)",
  overflow: "hidden",
  display: "flex",
} as const;

/** The tier → TEXT step map — the lane the rail's rows read. Written out rather than imported, the
 *  `_size.stories.tsx` / `boxLaw.ts` convention: a specimen that reads the very table the component
 *  reads agrees with it by construction. */
const TEXT_STEP: Record<string, "1" | "2" | "3"> = { small: "1", medium: "2", large: "3" };

/** N rows of rail, in the NAV LADDER'S OWN TERMS. A row is `--line-height-N + 2 × --ds-space-8` ([[nav-row-ladder]]),
 *  rows sit on the nav's `--ds-space-2` gap inside its `--ds-space-8` padding, and the frame adds its
 *  1px border each side. So the height of N rows is arithmetic on tokens — it tracks the ladder, the
 *  type scale and `--scaling` without anyone re-picking a number.
 *  The HALF row is the whole point at the wall: the bound lands exactly half a row-pitch into the 7th
 *  row at every tier (17 / 19 / 21px of a 32 / 36 / 40px row), so the list is visibly cut through a row
 *  and reads as continuing. A whole number would land flush on a row edge and read as a finished list. */
const railRows = (uiSize: string, rows: number) => {
  const rung = `(var(--line-height-${TEXT_STEP[uiSize] ?? "1"}) + 2 * var(--ds-space-8))`;
  return `calc(${rows} * (${rung} + var(--ds-space-2)) + var(--ds-space-8) + 2px)`;
};

/** The DO / DON'T frame, in rows. Six and a half: enough of the wall standing to read AS a wall, and
 *  the half so the seventh row is cut through rather than stopping at its edge. */
const WALL_ROWS = 6.5;

/** A dozen, because the DON'T note says a dozen — a "wall" that turned out to be eight tidy rows in a
 *  frame that fit them was the other half of what the reader was being asked to believe. */
const WALL_LINKS = [
  "Home", "Reports", "Team", "Documents", "Billing", "Settings",
  "Help", "Status", "Integrations", "Audit log", "Webhooks", "Exports",
];

/** A rail dropped in a frame sized to it (the rail is height:100% by design). Each specimen needs a
 *  UNIQUE nav label — multiple nav landmarks on one page must be distinguishable (axe landmark-unique). */
function RailFrame({ label, collapsed, testid, resizable }: { label: string; collapsed?: boolean; testid?: string; resizable?: boolean }) {
  return (
    <Box style={frameStyle}>
      <SideNav aria-label={label} defaultCollapsed={collapsed} resizable={resizable} data-testid={testid}>
        <RailBody />
        <Box mt="auto" pt="2">
          <SideNavCollapseButton />
        </Box>
      </SideNav>
      <Box style={{ flex: 1, padding: 16, background: "var(--ds-bg-base)" }}>
        <Text size="1" style={{ color: "var(--ds-text-weak)" }}>Page content</Text>
      </Box>
    </Box>
  );
}

/* ---- token spec: measured off a rendered rail ------------------------------ */
function SideNavTokens() {
  return (
    <Box style={{ borderRadius: "var(--ds-radius-4)", border: "1px solid var(--ds-stroke-weak)", overflow: "hidden", background: "var(--ds-bg-subtle)" }}>
      <Flex direction="column" gap="2" style={{ padding: "20px" }}>
        <Text size="1" style={{ color: "var(--ds-text-weak)" }}>
          The rail and its rows paint from existing <Mono>--ds-*</Mono> roles — <strong>no new tokens</strong>.
          Rows reuse the <Code>Item</Code> hover / selected vocabulary; the flyout panel is the opaque overlay
          surface so it never bleeds the page behind. Every row below is read off a rendered rail — including
          the flyout, which exists only while a collapsed parent's panel is open, so a second rail is
          collapsed and its parent row opened off-screen for the few frames the reading takes.
        </Text>
      </Flex>
      {/* The flyout is not a prop — no `open` reaches it, because a collapsed parent row owns the state
          its trigger toggles. So the host renders a SECOND, collapsed rail and clicks that row's real
          trigger, then takes the whole thing down again once every row below has read (`transient`: the
          rows join a barrier and the host cannot unmount until all of them release). The panel portals to
          the document body rather than into the host, so the host adopts what it created and hides it in
          the same commit it appeared in — nothing paints, and nothing is left open on the page. */}
      <MeasuredSpec
        transient
        render={() => (
          <LinkProvider component={DemoLink}>
            <SideNav aria-label="SideNav paint measurement">
              <SideNavSection>
                <SideNavItem icon={<House />} label="Home" href="#measure-home" isSelected />
                <SideNavItem icon={<Gear />} label="Settings" href="#measure-settings" />
              </SideNavSection>
            </SideNav>
            <OpenedByClick trigger=".rt-ds-sidenav-railtrigger">
              <SideNav aria-label="SideNav flyout measurement" defaultCollapsed>
                <SideNavSection>
                  <SideNavItem icon={<ChartBar />} label="Reports">
                    <SideNavItem label="Overview" href="#measure-overview" />
                  </SideNavItem>
                </SideNavSection>
              </SideNav>
            </OpenedByClick>
          </LinkProvider>
        )}
      >
        <MeasuredRow
          part="Rail surface"
          note="The chrome role — a step above the page role beside it. Visible in dark; in light both land on near-white, so what separates rail from page is the edge hairline below, not the fill."
          token="--ds-bg-raised"
          select=".rt-ds-sidenav"
          prop="background-color"
        />
        <MeasuredRow
          part="Divider / edge"
          note="The rail's own inline-end hairline against the content beside it."
          token="--ds-stroke-weak"
          select=".rt-ds-sidenav"
          prop="border-inline-end-color"
        />
        <MeasuredRow
          part="Row hover"
          note="Only under a pointer that can hover — the rule sits inside @media (hover: hover)."
          token="--ds-fill-hover"
          select='.rt-ds-item[data-interactive]:not([data-selected])'
          prop="background-color"
          state="hover"
        />
        <MeasuredRow
          part="Active row (aria-current)"
          note="A neutral tint, not an accent fill — the label keeps its own ink."
          token="--ds-fill-selected-subtle"
          select=".rt-ds-item[data-selected]"
          prop="background-color"
        />
        <MeasuredRow
          part="Focus ring"
          note="Hoisted onto the row from the focused body inside it. The accent base, with the stack alpha on top, 2px ([[focus-ring]])."
          token="--ds-stroke-focus"
          select=".rt-ds-item[data-interactive]"
          prop="outline-color"
          state="focus-visible"
        />
        <MeasuredRow
          part="Flyout panel (opaque)"
          note="The panel a COLLAPSED parent row opens — read off a real flyout, opened from its own trigger."
          token="--ds-bg-overlay"
          select=".rt-ds-sidenav-flyout-panel"
          prop="background-color"
        />
      </MeasuredSpec>
    </Box>
  );
}

/* ---- Properties ---------------------------------------------------------- */
const SIDENAV_PROPS: PropDef[] = [
  { name: "collapsed", type: "boolean", desc: <>Controlled collapse (the icon rail). Collapse is user/state-driven, never breakpoint-driven.</>, source: "SideNav.tsx" },
  { name: "defaultCollapsed", type: "boolean", def: "false", desc: <>Uncontrolled initial collapse.</>, source: "SideNav.tsx" },
  { name: "onCollapsedChange", type: "(collapsed) => void", desc: <>Fires when the collapse state changes.</>, source: "SideNav.tsx" },
  { name: "resizable", type: "boolean", def: "false", desc: <>Drag-to-resize the rail width via the shared <Code>useResizable</Code> engine (renders a <Code>ResizeHandle</Code> at the edge).</>, source: "SideNav.tsx" },
  { name: "defaultWidth", type: "number", def: "240", desc: <>Initial expanded width in px (resizable mode).</>, source: "SideNav.tsx" },
  { name: "minWidth / maxWidth", type: "number", def: "180 / 420", desc: <>Resizable bounds in px.</>, source: "SideNav.tsx" },
  { name: "aria-label", type: "string", def: `"Main"`, desc: <>Accessible name for the <Code>nav</Code> landmark (each nav landmark must be labelled).</>, source: "SideNav.tsx" },
  { name: "children", type: "ReactNode", desc: <><Code>SideNav.Section</Code> / <Code>SideNav.Item</Code> / <Code>SideNav.Heading</Code> / <Code>SideNav.CollapseButton</Code>.</>, source: "SideNav.tsx" },
];

const ITEM_PROPS: PropDef[] = [
  { name: "label", type: "ReactNode", desc: <>Row text (required). Kept for the link's accessible name even when the collapsed rail hides it visually.</>, source: "SideNav.tsx" },
  { name: "icon", type: "ReactNode", desc: <>Leading icon (Item's <Code>startContent</Code>). Shown alone in the collapsed rail.</>, source: "SideNav.tsx" },
  { name: "href", type: "string", desc: <>Destination — routes through Item's pluggable link (a framework <Code>Link</Code> via <Code>linkComponent</Code> / a <Code>LinkProvider</Code>).</>, source: "SideNav.tsx" },
  { name: "isSelected", type: "boolean", def: "false", desc: <>The active destination — paints selected and emits <Code>aria-current="page"</Code> on the link.</>, source: "SideNav.tsx" },
  { name: "endContent", type: "ReactNode", desc: <>Trailing content on an expanded leaf (a <Code>Badge</Code> / count). Hidden in the collapsed rail.</>, source: "SideNav.tsx" },
  { name: "children", type: "ReactNode", desc: <>Nested <Code>SideNav.Item</Code>s → the row becomes a disclosure parent (an animated <Code>role="group"</Code> subtree; a popover flyout when collapsed).</>, source: "SideNav.tsx" },
  { name: "expanded / defaultExpanded", type: "boolean", desc: <>Controlled / uncontrolled expansion of a parent's group.</>, source: "SideNav.tsx" },
  { name: "isDisabled", type: "boolean", def: "false", desc: <>Disable the row (skipped by arrow roving).</>, source: "SideNav.tsx" },
];

/* ========================================================================== */
/** The one definition of this component — the standfirst every page of it opens with. */
const DEFINITION = <>A collapsible primary-navigation rail. Sections group destinations; a parent row expands an inline group; collapsing the rail leaves icons with tooltips (and a flyout for parents). Arrow keys rove the rows.</>;

const meta: Meta<typeof SideNav> = {
  title: "Components/Navigation/SideNav",
  component: SideNav,
  parameters: {
    controls: { disable: true },
    docs: {
      description: {
        component:
          "**SideNav** is a collapsible primary-navigation rail: a labelled `nav` of link rows (never " +
          "`role=\"menu\"` — the current destination carries `aria-current=\"page\"`). Rows compose the " +
          "**Item** primitive. Three regimes flow from collapse-state × has-children: an expanded row, an " +
          "inline animated `role=\"group\"` disclosure (inert while collapsed), and a collapsed icon rail " +
          "whose leaves get a **Tooltip** and whose parents open a popover **flyout**. Collapse is " +
          "user/state-driven; a narrow viewport instead swaps the whole rail into the mobile drawer. Arrow " +
          "keys rove the rows; the rail is optionally resizable. Zero net-new tokens.",
      },
    },
  },
};
export default meta;
type Story = StoryObj<typeof SideNav>;

/** Usage — the primary lite docs story: working specimens, the live token spec, the comparison, and do/don't. */
export const Usage: Story = {
  // The DO/DON'T word (success/error step-11 ink on its own tint) measures 4.10 at 12px bold, under axe's
  // 4.5; the colour + the word already carry the meaning, so that row is the documented exception. Scoped
  // to the label itself — the cards' specimens stay fully axe-checked, which "[data-dodont]" did not do.
  parameters: { a11y: { context: { exclude: [DODONT_LABEL] } } },
  render: (_args, { globals }) => (
    // Nav specimens route their links through DemoLink so a click in the docs story never navigates the
    // Storybook iframe away (every other interaction — hover, focus, roving, tooltips, flyouts — is intact).
    <LinkProvider component={DemoLink}>
      <HexThemeKey.Provider value={`${globals.accent}-${globals.appearance}-${globals.contrast}`}>
      <Page maxWidth={900}>
        <PageHeader title="SideNav · Usage" standfirst={DEFINITION} />

        <Section title="Expanded rail" lead="Sections, icon rows, a nested group (Reports, shown open), and the active destination (Home). Use the button at the bottom to collapse it to the icon rail.">
          <RailFrame label="Workspace" testid="sn-expanded" />
          <Caption>The active row carries aria-current="page"; the nested group is a role="group" that animates open/closed and is inert while collapsed.</Caption>
        </Section>

        <Rule />

        <Section title="Collapsed rail" lead="Collapsed, each leaf is an icon with a System Tooltip (hover a row); a parent (Reports) becomes an icon that opens a popover flyout re-providing its children expanded.">
          <RailFrame label="Workspace (collapsed)" collapsed testid="sn-collapsed" />
        </Section>

        <Rule />

        <ComparisonSection comparison={NAV_SURFACES_COMPARISON} highlight="SideNav" />

        <Rule />

        <Section title="What belongs in the rail" lead="A SideNav is the primary navigation for a section-heavy app — a persistent, grouped, optionally-nested rail. It is not a dumping ground for every link.">
          {/* ONE BOX, TWO CONTENTS — a controlled comparison. Both frames are the SAME six-and-a-half
              rows of rail (derived, per `railRows`), so the only difference a reader sees is what was
              poured into it: a short grouped set that fits with room to spare, and a flat dozen that
              runs off the bottom mid-row. The DON'T card's clipping is the lesson, not an accident. */}
          <Grid columns={{ initial: "1", sm: "2" }} gap="3">
            <DoDont kind="do" bare note="Do use it as primary app navigation: a short set of grouped destinations, nesting only where the IA is genuinely hierarchical, with the current page marked.">
              <Box style={{ height: railRows(String(globals.uiSize ?? "small"), WALL_ROWS), border: "1px solid var(--ds-stroke-weak)", borderRadius: "var(--ds-radius-3)", overflow: "hidden", display: "flex" }}>
                <SideNav aria-label="Do example">
                  <SideNavSection>
                    <SideNavHeading>Workspace</SideNavHeading>
                    <SideNavItem icon={<House />} label="Home" href="#do-home" isSelected />
                    <SideNavItem icon={<ChartBar />} label="Reports" href="#do-reports" />
                    <SideNavItem icon={<Users />} label="Team" href="#do-team" />
                  </SideNavSection>
                </SideNav>
                <Box style={{ flex: 1 }} />
              </Box>
            </DoDont>
            <DoDont kind="dont" bare note="Don't pour every link into one flat, ungrouped rail — a wall of a dozen equal items with no sections defeats scanning. Group them, or move secondary links elsewhere.">
              <Box style={{ height: railRows(String(globals.uiSize ?? "small"), WALL_ROWS), border: "1px solid var(--ds-stroke-weak)", borderRadius: "var(--ds-radius-3)", overflow: "hidden", display: "flex" }}>
                <SideNav aria-label="Don't example">
                  <SideNavSection>
                    {WALL_LINKS.map((l) => (
                      <SideNavItem key={l} icon={<FileText />} label={l} href={`#dont-${l}`} />
                    ))}
                  </SideNavSection>
                </SideNav>
                <Box style={{ flex: 1 }} />
              </Box>
            </DoDont>
          </Grid>
        </Section>

        <Rule />

        <Section title="Tokens" lead="Measured off a rendered rail — the rail paints from existing --ds-* roles, and each row checks what its part paints against the role it claims.">
          <SideNavTokens />
        </Section>
      </Page>
      </HexThemeKey.Provider>
    </LinkProvider>
  ),
  play: async ({ canvasElement }) => {
    // The token table's EVIDENCE, asserted at runtime — all six rows read a REAL rendered rail, the
    // flyout one off a panel opened from its own trigger and closed again. `awaitMeasuredRows` waits
    // for every row to record its evidence AND for that mount cycle to have closed, so the checks
    // below (nothing portaled on view) see the page as a reader finds it.
    const rows = await awaitMeasuredRows(canvasElement);
    if (rows.measured !== 6 || rows.unproven !== 0) {
      throw new Error(`expected 6 measured / 0 unproven token rows, got ${rows.measured} / ${rows.unproven}`);
    }

    // Passive (no driving / no flash): assert the landmark, the active destination, and that the roving
    // tab stop is seeded — driving (collapse toggle / flyout / animation) is exercised in _internal.
    const nav = canvasElement.querySelector<HTMLElement>('[data-testid="sn-expanded"] nav[aria-label]');
    if (!nav) throw new Error("Usage must render a labelled nav landmark");
    const current = nav.querySelector('[aria-current="page"]');
    if (!current) throw new Error("the active destination must carry aria-current=\"page\"");
    // Exactly one roving tab stop among the rows.
    const stops = nav.querySelectorAll('.rt-ds-item-body[tabindex="0"], .rt-ds-sidenav-disclosure[tabindex="0"], .rt-ds-sidenav-railtrigger[tabindex="0"]');
    if (stops.length !== 1) throw new Error(`expected exactly one roving tab stop; got ${stops.length}`);
    // The collapsed-rail flyout is closed → nothing portaled on view.
    if (document.querySelector(".rt-ds-sidenav-flyout-panel")) throw new Error("no flyout may be open on view (no on-view flash)");
  },
};

/* ---- Props ---------------------------------------------------------- */
type PropsArgs = { collapsed: boolean; resizable: boolean };

function PropsDemo({ collapsed, resizable }: PropsArgs) {
  // Controlled, so the Controls panel drives the rail live AND the in-story collapse button still
  // works. `defaultCollapsed` read the arg once at mount, which made the Control a lie after the
  // first render. The sync exists because the arg is the source of truth only until the reader
  // clicks the rail's own toggle.
  const [isCollapsed, setIsCollapsed] = useState(collapsed);
  useEffect(() => setIsCollapsed(collapsed), [collapsed]);

  return (
    <LinkProvider component={DemoLink}>
    <Page maxWidth="none">
      <PageHeader
        title="SideNav · Props"
        standfirst={<>{DEFINITION} Collapse it to the icon rail — leaves get tooltips, and the Reports parent opens a flyout — or turn on drag-to-resize.</>}
      />
      <Box style={frameStyle}>
        <SideNav aria-label="Primary" collapsed={isCollapsed} onCollapsedChange={setIsCollapsed} resizable={resizable} data-testid="pg-sidenav">
          <RailBody />
          <Box mt="auto" pt="2">
            <SideNavCollapseButton />
          </Box>
        </SideNav>
        <Box style={{ flex: 1, padding: 16, background: "var(--ds-bg-base)" }}>
          <Text size="1" style={{ color: "var(--ds-text-weak)" }}>Page content</Text>
        </Box>
      </Box>
      <PropsLead />
      <Rule />
      <Section title="SideNav props" lead={<>Every prop the rail container accepts.</>}>
        <PropTable rows={SIDENAV_PROPS} />
      </Section>
      <Section title="SideNav.Item props" lead={<>The row — composes <Code>Item</Code>.</>}>
        <PropTable rows={ITEM_PROPS} />
      </Section>
    </Page>
    </LinkProvider>
  );
}

/** Props — the live, args-driven rail. Toggle collapse and resizable from the Controls panel. */
export const Props: StoryObj<PropsArgs> = {
  args: { collapsed: false, resizable: false },
  argTypes: {
    collapsed: { control: "boolean", description: "Collapse to the icon rail (user/state-driven — never breakpoint-driven).", table: { category: "State" } },
    resizable: { control: "boolean", description: "Enable drag-to-resize on the rail edge (the shared useResizable engine).", table: { category: "Layout" } },
  },
  parameters: { controls: { disable: false } },
  render: (args: PropsArgs) => <PropsDemo {...args} />,
};

/** History — the rulings this component encodes and a changelog of how it changes over time. */
export const History: Story = {
  render: () => (
    <Page>
      <PageHeader title="SideNav · History" standfirst={DEFINITION} />
      <Section title="Decisions" lead="The rulings this component encodes.">
        <Flex direction="column" gap="3">
          <Decision id="[[side-nav]] · nav + links, not role=menu">
            Rows are <strong>links inside a labelled <Code>nav</Code> landmark</strong>; the current
            destination carries <Code>aria-current="page"</Code>. This is the correct wayfinding semantic —
            a menu/menuitem is for <em>commands</em>, not destinations. Rows compose the <Code>Item</Code>{" "}
            primitive, so the anatomy is never re-invented.
          </Decision>
          <Decision id="[[side-nav]] · three item regimes">
            One <Code>SideNavItem</Code> resolves to one of three regimes from collapse-state × has-children:
            an <strong>expanded leaf</strong> (icon + label + optional badge); an{" "}
            <strong>expanded parent</strong> — a disclosure <Code>button</Code> toggling a nested{" "}
            <Code>role="group"</Code>; a <strong>collapsed-rail leaf</strong> (icon + a System{" "}
            <Code>Tooltip</Code>); and a <strong>collapsed-rail parent</strong> that opens a popover{" "}
            <strong>flyout</strong> re-providing the expanded context.
          </Decision>
          <Decision id="[[nav-row-ladder]] · the nav ladder — 32 / 36 / 40, collapsed and expanded">
            Navigation carries <strong>more prominence than a standard control</strong>, so a nav row is an{" "}
            <Code>Item</Code>-family row rather than a control-lane button: <strong>32 / 36 / 40px</strong> at
            small / medium / large, where the control box names 24 / 32 / 40. The number is a{" "}
            <strong>derivation, not a token</strong> — the row's own line box plus the <Code>Item</Code> block
            padding on both sides (<Code>--line-height-N</Code> + 2 × <Code>--ds-space-8</Code>) — so it moves
            with the type scale and carries <Code>--scaling</Code> by construction. The{" "}
            <strong>collapsed rail rides the same ladder</strong>: it is the same navigation as the rows it
            replaces, so a rail button measures what a row measures at every tier, and its glyph is the nav's
            own text (14 / 16 / 18px), the same glyph an expanded row's icon is.
          </Decision>
          <Decision id="[[collapsible-and-accordion]] · animated, inert nested group">
            The nested group animates on the shared collapsible height keyframes (expand rides the moderate
            tier + entry ease; collapse the fast tier + exit ease; reduced motion collapses it free). The
            collapsed subtree stays <strong>mounted and <Code>inert</Code></strong> — non-focusable, skipped
            by arrow roving — and the animation is suppressed on first paint so nothing flashes on view.
          </Decision>
          <Decision id="[[side-nav]] · collapse ≠ breakpoint">
            Collapse (the icon rail) is <strong>user/state-driven</strong>, never breakpoint-driven. A narrow
            viewport is a <em>different axis</em>: the whole rail re-renders into the mobile drawer via{" "}
            <Code>useSideNavRenderMode()</Code> (a drawer render is always expanded).
          </Decision>
          <Decision id="Resizable · the [[resize-handle]] engine">
            With <Code>resizable</Code>, the rail reads the shared <Code>useResizable</Code> engine and
            renders a <Code>ResizeHandle</Code> at its edge (the WAI window-splitter contract — drag, arrows,
            Home/End, double-click collapse).
          </Decision>
          <Decision id="A11y">
            <strong>Deliberate accessibility choices:</strong> <Code>SideNavCollapseButton</Code> carries{" "}
            <Code>aria-expanded={"{!collapsed}"}</Code> + <Code>aria-controls</Code> at the nav so the
            collapsed state is announced; arrow keys rove the rows with a single roving tab stop; each{" "}
            <Code>nav</Code> landmark is labelled so multiple navs stay distinguishable.
          </Decision>
          <Decision id="Deviation · parents disclose, leaves navigate">
            A parent is a <strong>single disclosure control</strong> (<Code>aria-expanded</Code> on the row
            button — the honest a11y for expand/collapse), not a split navigate-and-toggle row. Composing{" "}
            <Code>Item</Code> — whose interactivity lives on an inner body that can't carry{" "}
            <Code>aria-expanded</Code> — yields one clean disclosure button. Leaves navigate; parents disclose.
          </Decision>
        </Flex>
      </Section>

      <Rule />

      <Section title="Changelog" lead="Notable changes, newest first — grows as the component evolves.">
        <Flex direction="column" gap="3">
          <Decision id="0.9.0">
            Initial <Code>System/Navigation/SideNav</Code> — the collapsible rail + <Code>SideNav.Item</Code>{" "}
            / <Code>Section</Code> / <Code>Heading</Code> / <Code>CollapseButton</Code>; the three item
            regimes (expanded row, animated inert <Code>role="group"</Code>, collapsed icon rail with Tooltip
            + popover flyout); <Code>nav</Code>+links semantics with <Code>aria-current="page"</Code>; arrow
            roving over a single tab stop; the render-mode drawer swap; optional resize on the shared{" "}
            <Code>useResizable</Code> engine; the{" "}
            <Code>aria-expanded</Code> collapse-button upgrade — painted from existing <Code>--ds-*</Code> roles
            with no new tokens.
          </Decision>
        </Flex>
      </Section>
    </Page>
  ),
};
