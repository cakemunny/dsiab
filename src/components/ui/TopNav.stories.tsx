import type { Meta, StoryObj } from "@storybook/react-vite";
import { Box, Code, Flex, Text } from "@radix-ui/themes";
import {
  Cube, Gauge, Tag, Lightning, Cloud, ShieldCheck, ChartBar, Users, Sparkle, Stack, Rocket,
} from "@phosphor-icons/react";
import {
  TopNav, TopNavItem, TopNavHeading, TopNavMenu, TopNavMegaMenu, TopNavMegaMenuItem, TopNavMegaMenuFeaturedCard,
} from "./TopNav";
import { Button } from "./Button";
import { LinkProvider } from "./Link";
import { ComparisonSection, NAV_SURFACES_COMPARISON, MENU_SURFACES_COMPARISON } from "./_comparisons";
import {
  Caption, Decision, DemoLink, DoDont, DODONT_LABEL, HexThemeKey, MeasuredRow, MeasuredSpec, Mono, OpenedByClick, Page, PageHeader, PropsLead,
  type PropDef, PropTable, Rule, Section,
} from "./_storyKit";
import { awaitMeasuredRows } from "../../foundations/_assert";

/* ---- a realistic top bar reused across the specimens ---------------------- */
/** A brand, primary links, a flyout Menu, and a MegaMenu — shown CLOSED (menus open on hover/click, never
 *  on view, so the docs page never flashes). Each specimen needs a UNIQUE nav label (axe landmark-unique). */
function DemoBar({ label }: { label: string }) {
  return (
    <TopNav
      aria-label={label}
      end={
        <>
          {/* No size override: the utility buttons ride the same control lane as the nav links and the
              menu triggers, so they track the global size step. Priority — not size — carries the
              difference: "Docs" is tertiary, a peer of the nav links; "Sign in" keeps its fill. The two
              occupy the SAME box height at every tier (the bar floors a quiet button to the filled
              button's height), so the emphasis difference never reads as a size difference. */}
          <Button priority="tertiary">Docs</Button>
          <Button>Sign in</Button>
        </>
      }
    >
      <TopNavHeading href="#home" logo={<Cube weight="fill" />}>Acme</TopNavHeading>
      <TopNavItem icon={<Gauge />} label="Dashboard" href="#dashboard" isSelected />
      <TopNavItem icon={<Tag />} label="Pricing" href="#pricing" />
      <TopNavMenu label="Products">
        <TopNavItem icon={<Lightning />} label="Automations" href="#products-automations" />
        <TopNavItem icon={<Cloud />} label="Sync" href="#products-sync" />
        <TopNavItem icon={<ShieldCheck />} label="Security" href="#products-security" />
      </TopNavMenu>
      <TopNavMegaMenu
        label="Solutions"
        columns={2}
        featured={
          <TopNavMegaMenuFeaturedCard
            media={<Sparkle weight="fill" />}
            title="What's new"
            description="See the latest platform updates and roadmap."
            cta="Read the changelog"
            href="#featured-changelog"
          />
        }
      >
        <TopNavMegaMenuItem icon={<ChartBar />} label="Analytics" description="Dashboards and reporting" href="#sol-analytics" />
        <TopNavMegaMenuItem icon={<Users />} label="Teams" description="Collaboration at scale" href="#sol-teams" />
        <TopNavMegaMenuItem icon={<Stack />} label="Platform" description="APIs and integrations" href="#sol-platform" />
        <TopNavMegaMenuItem icon={<Rocket />} label="Startups" description="Get moving fast" href="#sol-startups" />
      </TopNavMegaMenu>
    </TopNav>
  );
}

/** The bar dropped in a bordered frame with page content beneath, so the bar reads in context. */
function BarFrame({ label, testid }: { label: string; testid?: string }) {
  return (
    <Box
      data-testid={testid}
      style={{ border: "1px solid var(--ds-stroke-weak)", borderRadius: "var(--ds-radius-4)", overflow: "hidden" }}
    >
      <DemoBar label={label} />
      <Box style={{ padding: 24, background: "var(--ds-bg-base)" }}>
        <Text size="1" style={{ color: "var(--ds-text-weak)" }}>Page content</Text>
      </Box>
    </Box>
  );
}

/* The DON'T's flat top level — equal peers, no grouping, no current item. The note quotes the count off
   this array and the play asserts every one of them renders INSIDE the bar's own box: a specimen whose
   point is "too many" cannot be one that quietly drops the overflow.

   THE LENGTH IS NOT A FREE CHOICE — it is sized against the LARGEST tier, because that is the tightest.
   The box is the page measure (816px of card, the same at every tier); everything inside it steps with
   the ladder (a row 24 / 32 / 40 tall, its label 14 / 16 / 18px), so ONE list costs three widths. Twelve
   items were picked against `small` — 764px of the 784px available, 20px to spare — and ran 124px
   past the box at `large`, cutting "Press" mid-glyph and dropping "Legal" entirely. A DON'T that shows a
   broken bar teaches "the bar broke", not "the bar is unscannable", so the ceiling is what the LARGEST
   tier holds: these ten cost 634 / 691 / 748px of that 784px box at small / medium / large. There is no
   eleventh — 36px is left at large and the narrowest item on the bar costs ~54px with its gap. If the
   ladder moves again this list gets shorter; the assertion does not get weaker. */
const DONT_ITEMS = [
  "Home", "Products", "Pricing", "Docs", "Blog",
  "Team", "Status", "About", "Press", "Legal",
];

/* ---- token spec: measured off a rendered bar ------------------------------- */
function TopNavTokens() {
  return (
    <Box style={{ borderRadius: "var(--ds-radius-4)", border: "1px solid var(--ds-stroke-weak)", overflow: "hidden", background: "var(--ds-bg-subtle)" }}>
      <Flex direction="column" gap="2" style={{ padding: "20px" }}>
        <Text size="1" style={{ color: "var(--ds-text-weak)" }}>
          The bar and its rows paint from existing <Mono>--ds-*</Mono> roles — <strong>no new tokens</strong>.
          Rows reuse the <Code>Item</Code> hover / selected vocabulary; the menu and mega panels are the opaque
          overlay surface so they never bleed the page behind. Every row below is read off a rendered bar —
          including the flyout panel, which exists only while a menu is open, so a second bar's menu trigger
          is clicked off-screen for the few frames the reading takes.
        </Text>
      </Flex>
      {/* The menu panel is not a prop — no `open` reaches it, because the trigger owns the latch that
          opens it. So the host renders a SECOND bar and clicks that menu's real trigger, then takes the
          whole thing down again once every row below has read (`transient`: the rows join a barrier and
          the host cannot unmount until all of them release). The panel portals to the document body
          rather than into the host, so the host adopts what it created and hides it in the same commit
          it appeared in — nothing paints, and no menu is left open on the page. */}
      <MeasuredSpec
        transient
        render={() => (
          <LinkProvider component={DemoLink}>
            <TopNav aria-label="TopNav paint measurement">
              <TopNavItem icon={<Gauge />} label="Dashboard" href="#measure-dashboard" isSelected />
              <TopNavItem icon={<Tag />} label="Pricing" href="#measure-pricing" />
            </TopNav>
            <TopNavMegaMenuFeaturedCard title="Featured measurement" description="measurement" />
            <OpenedByClick trigger=".rt-ds-topnav-trigger">
              <TopNav aria-label="TopNav menu measurement">
                <TopNavMenu label="Products">
                  <TopNavItem icon={<Lightning />} label="Automations" href="#measure-automations" />
                </TopNavMenu>
              </TopNav>
            </OpenedByClick>
          </LinkProvider>
        )}
      >
        <MeasuredRow
          part="Bar surface"
          note="The raised chrome step — the bar sits above the page it frames."
          token="--ds-bg-raised"
          select=".rt-ds-topnav"
          prop="background-color"
        />
        <MeasuredRow
          part="Bottom divider / edge"
          note="The bar's own block-end hairline against the page below it."
          token="--ds-stroke-weak"
          select=".rt-ds-topnav"
          prop="border-bottom-color"
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
          part="Current item (aria-current)"
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
          part="Featured card surface"
          note="The promo card in a mega panel's trailing column — a subtle block inside the overlay."
          token="--ds-bg-subtle"
          select=".rt-ds-topnav-featured"
          prop="background-color"
        />
        <MeasuredRow
          part="Menu / mega panel (opaque)"
          note="The portaled flyout a menu trigger opens — read off a real panel, opened from its own trigger."
          token="--ds-bg-overlay"
          select=".rt-ds-topnav-menu-panel"
          prop="background-color"
        />
      </MeasuredSpec>
    </Box>
  );
}

/* ---- Properties ---------------------------------------------------------- */
const TOPNAV_PROPS: PropDef[] = [
  { name: "aria-label", type: "string", def: `"Primary"`, desc: <>Accessible name for the <Code>nav</Code> landmark (each nav landmark must be labelled).</>, source: "TopNav.tsx" },
  { name: "children", type: "ReactNode", desc: <>The leading cluster — <Code>TopNav.Heading</Code> + <Code>TopNav.Item</Code> / <Code>TopNav.Menu</Code> / <Code>TopNav.MegaMenu</Code>.</>, source: "TopNav.tsx" },
  { name: "center", type: "ReactNode", desc: <>Optional centered region. When present the bar becomes a <Code>1fr auto 1fr</Code> grid so it is truly centered.</>, source: "TopNav.tsx" },
  { name: "end", type: "ReactNode", desc: <>Trailing region — actions (search, avatar, buttons), pinned to the far end.</>, source: "TopNav.tsx" },
];

const ITEM_PROPS: PropDef[] = [
  { name: "label", type: "ReactNode", desc: <>Row text (required).</>, source: "TopNav.tsx" },
  { name: "icon", type: "ReactNode", desc: <>Optional leading icon (Item's <Code>startContent</Code>).</>, source: "TopNav.tsx" },
  { name: "href", type: "string", desc: <>Destination — routes through Item's pluggable link (a framework <Code>Link</Code> via <Code>linkComponent</Code> / a <Code>LinkProvider</Code>).</>, source: "TopNav.tsx" },
  { name: "isSelected", type: "boolean", def: "false", desc: <>The current destination — paints selected and emits <Code>aria-current="page"</Code> on the link.</>, source: "TopNav.tsx" },
  { name: "isDisabled", type: "boolean", def: "false", desc: <>Disable the item.</>, source: "TopNav.tsx" },
];

const HEADING_PROPS: PropDef[] = [
  { name: "children", type: "ReactNode", desc: <>The brand title.</>, source: "TopNav.tsx" },
  { name: "logo", type: "ReactNode", desc: <>Leading brand mark (a logo / icon).</>, source: "TopNav.tsx" },
  { name: "href", type: "string", desc: <>Makes the brand a routed link (the usual "home" link). The interaction-boundary tree: <Code>href</Code> → link, else <Code>onClick</Code> → button, else static text.</>, source: "TopNav.tsx" },
  { name: "onClick", type: "(event) => void", desc: <>Makes the brand a button (when there is no <Code>href</Code>).</>, source: "TopNav.tsx" },
];

const MENU_PROPS: PropDef[] = [
  { name: "label", type: "ReactNode", desc: <>Trigger text (also the flyout's accessible name).</>, source: "TopNav.tsx" },
  { name: "icon", type: "ReactNode", desc: <>Optional leading icon on the trigger.</>, source: "TopNav.tsx" },
  { name: "isDisabled", type: "boolean", def: "false", desc: <>Disable the trigger.</>, source: "TopNav.tsx" },
  { name: "children", type: "ReactNode", desc: <>The flyout rows — <Code>TopNav.Item</Code> links.</>, source: "TopNav.tsx" },
];

const MEGA_PROPS: PropDef[] = [
  { name: "label", type: "ReactNode", desc: <>Trigger text (also the panel's accessible name).</>, source: "TopNav.tsx" },
  { name: "columns", type: "number", def: "3", desc: <>Column count for the mega item grid.</>, source: "TopNav.tsx" },
  { name: "featured", type: "ReactNode", desc: <>Optional presentational <Code>TopNav.MegaMenuFeaturedCard</Code> in the trailing column.</>, source: "TopNav.tsx" },
  { name: "children", type: "ReactNode", desc: <><Code>TopNav.MegaMenuItem</Code> cells (icon · title · description).</>, source: "TopNav.tsx" },
];

/* ========================================================================== */
const meta: Meta<typeof TopNav> = {
  title: "Components/Navigation/TopNav",
  component: TopNav,
  parameters: {
    controls: { disable: true },
    docs: {
      description: {
        component:
          "**TopNav** is the top application bar: a labelled `nav` of primary destinations (never " +
          "`role=\"menu\"` — the current item carries `aria-current=\"page\"`). A leading cluster (brand + " +
          "nav) plus optional centered and trailing slots; flex by default, a `1fr auto 1fr` grid when a " +
          "center slot is used. **TopNav.Menu** is a hover-intent popover flyout of links; **TopNav.MegaMenu** " +
          "is a full-width panel anchored to the bar with a grid of items + an optional featured card. Menus " +
          "open on hover-intent (150/200ms) and click-latch, and open independently. Zero net-new tokens.",
      },
    },
  },
};
export default meta;
type Story = StoryObj<typeof TopNav>;

/** The one definition of this component — the standfirst every page of it opens with. */
const DEFINITION = (
  <>
    The top application bar — a brand, primary destinations, flyout menus, and a full-width mega menu.
    The bar is a labelled <Code>nav</Code> landmark of links; the current destination carries{" "}
    <Code>aria-current="page"</Code>.
  </>
);

/** Usage — the primary lite docs story: the working bar, the live token spec, the comparisons, and do/don't. */
export const Usage: Story = {
  // The DoDont callout labels (success/error text on the tint) measure just under axe's strict 4.5; the
  // callout colour + the DO/DON'T word already carry the meaning, so color-contrast is scoped off here (the
  // documented specimen exception, as on SideNav / MobileNav). The bar specimen itself clears contrast.
  parameters: { a11y: { context: { exclude: [DODONT_LABEL] } } },
  render: (_args, { globals }) => (
    // Nav specimens route their links through DemoLink so a click in the docs story never navigates the
    // Storybook iframe away (hover-intent, click-latch, roving, aria-current, tooltips all stay intact).
    <LinkProvider component={DemoLink}>
      <HexThemeKey.Provider value={`${globals.accent}-${globals.appearance}-${globals.contrast}`}>
      <Page maxWidth={900}>
        <PageHeader
          title="TopNav · Usage"
          standfirst={<>{DEFINITION} Hover a menu to peek it (or click to pin); shown closed — menus never open on view.</>}
        />

        <Section title="The bar" lead="A brand (a home link), primary items, a Products menu (hover or click it), and a Solutions mega menu with a featured card. The current destination (Dashboard) is marked.">
          <BarFrame label="Primary (overview)" testid="tn-overview" />
          <Caption>The bar is a labelled nav landmark of links; the current item carries aria-current="page". Menus open on hover-intent and click-latch, and open independently.</Caption>
        </Section>

        <Rule />

        <ComparisonSection comparison={NAV_SURFACES_COMPARISON} highlight="TopNav" />

        <Rule />

        <ComparisonSection comparison={MENU_SURFACES_COMPARISON} highlight="TopNav menu" />

        <Rule />

        <Section title="What belongs in the bar" lead="A TopNav is the primary top-level navigation for a wide viewport — a few clear areas. A menu groups a section; a mega menu presents a wider, grouped set — it is not a dumping ground for everything.">
          {/* ONE BOX, TWO CONTENTS — and the box is as wide as the page gives it. This pair STACKS rather
              than sitting in two columns because a top bar is full-bleed: in a half-width column the bar
              is 384px, and the DON'T — whose entire point is "too many equal items" — needed 559px, so
              five items rendered, one was cut mid-glyph and the rest were not on screen at all. The
              reader has to SEE the whole wall to judge that it has no shape to scan; a bar cut at its
              right edge reads as a broken specimen instead. Full width is the widest box available, so
              it is the DON'T's CONTENT that has to fit — sized against the largest tier (`DONT_ITEMS`),
              and held there by the play's fit assertion. */}
          <Flex direction="column" gap="3">
            <DoDont kind="do" bare note="Do use it for a few top-level areas, with the current one marked. Group a section under a Menu, and a wide, grouped set under a MegaMenu.">
              <Box style={{ border: "1px solid var(--ds-stroke-weak)", borderRadius: "var(--ds-radius-3)", overflow: "hidden" }}>
                <TopNav aria-label="Do example" end={<Button>Sign in</Button>}>
                  <TopNavHeading href="#do-home" logo={<Cube weight="fill" />}>Acme</TopNavHeading>
                  <TopNavItem label="Dashboard" href="#do-dashboard" isSelected />
                  <TopNavItem label="Pricing" href="#do-pricing" />
                  <TopNavMenu label="Products">
                    <TopNavItem label="Automations" href="#do-automations" />
                    <TopNavItem label="Sync" href="#do-sync" />
                  </TopNavMenu>
                </TopNav>
              </Box>
            </DoDont>
            {/* The count is read off the array the bar renders, so the note can never quote a wall the
                specimen no longer shows. */}
            <DoDont kind="dont" bare note={<>Don't cram every link and section into the bar — a wall of {DONT_ITEMS.length} equal top-level items (or one mega menu holding everything) defeats scanning. Nothing is grouped, nothing is current, and there is no shape to scan for. Keep the top level short; group the rest.</>}>
              <Box data-testid="tn-dont" style={{ border: "1px solid var(--ds-stroke-weak)", borderRadius: "var(--ds-radius-3)", overflow: "hidden" }}>
                <TopNav aria-label="Don't example">
                  <TopNavHeading logo={<Cube weight="fill" />}>Acme</TopNavHeading>
                  {DONT_ITEMS.map((l) => (
                    <TopNavItem key={l} label={l} href={`#dont-${l}`} />
                  ))}
                </TopNav>
              </Box>
            </DoDont>
          </Flex>
        </Section>

        <Rule />

        <Section title="Tokens" lead="Measured off a rendered bar — the bar paints from existing --ds-* roles, and each row checks what its part paints against the role it claims.">
          <TopNavTokens />
        </Section>
      </Page>
      </HexThemeKey.Provider>
    </LinkProvider>
  ),
  play: async ({ canvasElement }) => {
    // The token table's EVIDENCE, asserted at runtime — six rows read a REAL rendered bar (and a real
    // featured card); the flyout row reads a real panel, opened from its own trigger and closed again.
    // `awaitMeasuredRows` waits for every row to record its evidence AND for that mount cycle to have
    // closed, so the checks below (no menu open on view) see the page as a reader finds it.
    const rows = await awaitMeasuredRows(canvasElement);
    if (rows.measured !== 7 || rows.unproven !== 0) {
      throw new Error(`expected 7 measured / 0 unproven token rows, got ${rows.measured} / ${rows.unproven}`);
    }

    // Passive (no driving / no flash): assert the landmark + the current destination, and that no flyout is
    // open on view — driving (hover-intent, roving, the mega anchor) is exercised in _internal.
    const frame = canvasElement.querySelector<HTMLElement>('[data-testid="tn-overview"]');
    if (!frame) throw new Error("Usage must render the bar frame");
    const nav = frame.querySelector<HTMLElement>('nav[aria-label="Primary (overview)"]');
    if (!nav) throw new Error("Usage must render a labelled nav landmark");
    if (!nav.querySelector('[aria-current="page"]')) throw new Error('the current item must carry aria-current="page"');
    // Both menu triggers start collapsed; no panel portaled on view.
    for (const t of nav.querySelectorAll(".rt-ds-topnav-trigger")) {
      if (t.getAttribute("aria-expanded") !== "false") throw new Error("menu triggers must start closed (aria-expanded=false)");
    }
    if (document.querySelector(".rt-ds-topnav-menu-panel, .rt-ds-topnav-mega-panel")) {
      throw new Error("no flyout may be open on view (no on-view flash)");
    }
    // The DON'T specimen must actually SHOW the wall its note describes: every declared item painted,
    // inside the bar's own box. A clipped bar reads as an accident, not as the mistake being taught.
    const dont = canvasElement.querySelector<HTMLElement>('[data-testid="tn-dont"] nav');
    if (!dont) throw new Error("Usage must render the DON'T bar");
    const links = dont.querySelectorAll("a[href^='#dont-']");
    if (links.length !== DONT_ITEMS.length)
      throw new Error(`the DON'T bar must render all ${DONT_ITEMS.length} items; got ${links.length}`);
    // A fixed box holding tier-stepping content: this can only ever prove the tier it RUNS at, and the
    // suite runs `small` (uiSize is not swept — .storybook/preview.tsx). So the failure names the type
    // step it measured, because "it fits" is a claim about one rung of the ladder, not about the bar.
    const step = links[0] ? getComputedStyle(links[0]).fontSize : "?";
    if (dont.scrollWidth > dont.clientWidth)
      throw new Error(
        `the DON'T bar must fit its panel at EVERY tier; at ${step} type it needs ${dont.scrollWidth}px of a ` +
        `${dont.clientWidth}px box — shorten DONT_ITEMS until the LARGEST tier fits, don't relax this.`,
      );
  },
};

/* ---- Props ---------------------------------------------------------- */
type PropsArgs = { withCenter: boolean };

/** Props — the live bar. Toggle a centered slot (the layout switches to a 1fr auto 1fr grid). */
export const Props: StoryObj<PropsArgs> = {
  args: { withCenter: false },
  argTypes: {
    withCenter: { control: "boolean", description: "Render a centered slot — the bar switches from a flex row to a 1fr auto 1fr grid.", table: { category: "Layout" } },
  },
  parameters: { controls: { disable: false } },
  render: (args: PropsArgs) => (
    <LinkProvider component={DemoLink}>
    <Page maxWidth="none">
      <PageHeader title="TopNav · Props" standfirst={<>{DEFINITION} Toggle a centered slot to switch the layout to a grid; hover the Products menu or the Solutions mega menu to open them (or click to pin).</>} />
      <Box style={{ border: "1px solid var(--ds-stroke-weak)", borderRadius: "var(--ds-radius-4)", overflow: "hidden" }}>
        <TopNav
          aria-label="Primary"
          data-testid="pg-topnav"
          center={args.withCenter ? <TopNavItem label="Overview" href="#pg-overview" /> : undefined}
          end={
            <>
              <Button priority="tertiary">Docs</Button>
              <Button>Sign in</Button>
            </>
          }
        >
          <TopNavHeading href="#pg-home" logo={<Cube weight="fill" />}>Acme</TopNavHeading>
          <TopNavItem icon={<Gauge />} label="Dashboard" href="#pg-dashboard" isSelected />
          <TopNavItem icon={<Tag />} label="Pricing" href="#pg-pricing" />
          <TopNavMenu label="Products">
            <TopNavItem icon={<Lightning />} label="Automations" href="#pg-automations" />
            <TopNavItem icon={<Cloud />} label="Sync" href="#pg-sync" />
          </TopNavMenu>
          <TopNavMegaMenu
            label="Solutions"
            columns={2}
            featured={<TopNavMegaMenuFeaturedCard media={<Sparkle weight="fill" />} title="What's new" description="Latest platform updates." cta="Read the changelog" href="#pg-featured" />}
          >
            <TopNavMegaMenuItem icon={<ChartBar />} label="Analytics" description="Dashboards and reporting" href="#pg-analytics" />
            <TopNavMegaMenuItem icon={<Users />} label="Teams" description="Collaboration at scale" href="#pg-teams" />
          </TopNavMegaMenu>
        </TopNav>
        <Box style={{ padding: 24, background: "var(--ds-bg-base)" }}>
          <Text size="1" style={{ color: "var(--ds-text-weak)" }}>Page content</Text>
        </Box>
      </Box>
      <PropsLead />
      <Rule />
      <Section title="TopNav props" lead={<>Every prop the bar container accepts.</>}>
        <PropTable rows={TOPNAV_PROPS} />
      </Section>
      <Section title="TopNav.Heading props" lead={<>The brand — the interaction-boundary decision tree.</>}>
        <PropTable rows={HEADING_PROPS} />
      </Section>
      <Section title="TopNav.Item props" lead={<>A bar link (also used in a Menu flyout). Composes Item.</>}>
        <PropTable rows={ITEM_PROPS} />
      </Section>
      <Section title="TopNav.Menu props" lead={<>The hover-intent popover flyout.</>}>
        <PropTable rows={MENU_PROPS} />
      </Section>
      <Section title="TopNav.MegaMenu props" lead={<>The full-width bar-anchored panel.</>}>
        <PropTable rows={MEGA_PROPS} />
      </Section>
    </Page>
    </LinkProvider>
  ),
};

/** History — the rulings this component encodes and a changelog of how it changes over time. */
export const History: Story = {
  render: () => (
    <Page>
      <PageHeader title="TopNav · History" standfirst={DEFINITION} />
      <Section title="Decisions" lead="The rulings this component encodes.">
        <Flex direction="column" gap="3">
          <Decision id="[[top-nav]] · popover, not navigation-menu">
            The menus ride <Code>@radix-ui/react-popover</Code> (the MultiSelect / SideNav recipe), NOT{" "}
            <Code>@radix-ui/react-navigation-menu</Code>. That primitive was evaluated and rejected: it is
            non-modal, roving, and <em>single-open-enforced</em>, which would silently add coordination the
            original nav never had. Our flyouts are independently-open popovers with hover-intent.
          </Decision>
          <Decision id="[[top-nav]] · nav + links, not role=menu">
            Every panel is a <strong>labelled <Code>nav</Code> region of links</strong>, and the current
            destination carries <Code>aria-current="page"</Code> — the correct wayfinding semantic (a
            menu/menuitem is for <em>commands</em>, not destinations). Rows compose the <Code>Item</Code>{" "}
            primitive, and the mega panel gets <strong>arrow-key roving</strong> — full keyboard navigation
            across the mega grid.
          </Decision>
          <Decision id="Hover-intent (useMenuHover)">
            Menus open on <strong>sustained hover</strong> (150ms show / 200ms hide), gated to fine pointers
            (<Code>(hover:hover)</Code>) so touch falls back to click; a <strong>click latches</strong> the
            menu open. The trigger is a <Code>Popover.Anchor</Code> (not a <Code>Trigger</Code>, which would
            auto-toggle and fight the latch), so the click owns opening and the panel exempts the trigger from
            outside-dismiss. Focus is the popover's own, minus the hover-steal — <strong>no hand focus trap</strong>.
          </Decision>
          <Decision id="[[top-nav]] · menus open independently">
            Menus open <strong>independently</strong> — opening one does not close another. Enforcing
            single-open coordination would add behaviour the pattern does not need, so it is deliberately
            left out (add it only if a product asks).
          </Decision>
          <Decision id="MegaMenu · aria-controls + full-width">
            The mega trigger carries <Code>aria-controls</Code>. The panel is anchored{" "}
            <strong>full-width to the bar</strong> (not the trigger) via a fixed anchor measured to the bar's
            rect, so it spans the bar rather than the button — JS measurement, since CSS anchor-positioning is
            not used here yet.
          </Decision>
          <Decision id="No built-in 'More' overflow menu">
            There is <strong>no built-in overflow "More" menu</strong> on the bar. If a real overflow need
            arises, compose one on the <Code>useOverflow</Code> engine.
          </Decision>
          <Decision id="FeaturedCard · a real icon">
            The featured card is <strong>presentational</strong> (or a routed link card). Its hard-appended{" "}
            <Code>→</Code> text glyph is replaced with a proper Phosphor <Code>ArrowRight</Code> icon.
          </Decision>
        </Flex>
      </Section>

      <Rule />

      <Section title="Changelog" lead="Notable changes, newest first — grows as the component evolves.">
        <Flex direction="column" gap="3">
          <Decision id="0.9.0">
            Initial <Code>System/Navigation/TopNav</Code> — the slot bar (<Code>TopNav.Heading</Code> /{" "}
            <Code>Item</Code> / <Code>Menu</Code> / <Code>MegaMenu</Code> + <Code>MegaMenuItem</Code> /{" "}
            <Code>MegaMenuFeaturedCard</Code>); flex ↔ <Code>1fr auto 1fr</Code> grid slot layout; the render-mode
            drawer swap; popover flyouts with hover-intent + click-latch; arrow roving; <Code>nav</Code>+links
            semantics with <Code>aria-current="page"</Code>; the full-width mega anchor + <Code>aria-controls</Code>;
            the FeaturedCard icon — painted from existing <Code>--ds-*</Code> roles with no new tokens.
          </Decision>
        </Flex>
      </Section>
    </Page>
  ),
};
