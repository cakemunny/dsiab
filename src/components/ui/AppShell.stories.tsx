import type { CSSProperties } from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { Box, Code, Flex, Grid, Text } from "@radix-ui/themes";
import { House, ChartBar, Users, Gear } from "@phosphor-icons/react";
import { AppShell, type AppShellVariant } from "./AppShell";
import SideNav from "./SideNav";
import TopNav from "./TopNav";
import { LinkProvider } from "./Link";
import { Avatar } from "./Avatar";
import {
  AnatomyLegend, Caption, Decision, DemoLink, DoDont, DODONT_LABEL, dotStyle, HexThemeKey, MeasuredRow,
  MeasuredSpec, Mono, NoteRow, Page, PageHeader, PropsLead, type PropDef, PropTable, Rule, Scenario,
  Section, toHex, TokenGroup,
} from "./_storyKit";

/** The one definition of this component — the standfirst every page of it opens with. */
const DEFINITION = (
  <>
    The top-level page shell. It composes <Code>Layout</Code> — top nav into the header, side nav into the
    panel, content into the one guaranteed <Code>main</Code> — and owns the responsive mode-swap: below the
    breakpoint the nav re-renders into a mobile drawer rather than collapsing with CSS. It provides the
    skip-to-content link and the drawer state, so a page never wires those up itself.
  </>
);
import { awaitMeasuredRows } from "../../foundations/_assert";

/* Resolve a CSS custom property to an sRGB hex as it computes on `el` (P3-safe via the canvas). */
function tokenHex(el: Element, name: string): string {
  const probe = document.createElement("span");
  el.appendChild(probe);
  probe.style.color = `var(${name})`;
  const hex = toHex(getComputedStyle(probe).color);
  probe.remove();
  return hex;
}

/* ---- the chrome the specimens hang in ------------------------------------------------------------
   The nav slots are filled with the REAL System SideNav / TopNav (see DemoSideNav / DemoTopNav below),
   so every shell specimen on this page is the integration a product actually ships. Only the page BODY
   is stand-in content — grey bars standing in for copy, so the eye stays on the shell. The numbered
   Anatomy diagram stays an abstract wireframe on purpose: its job is to carry the callout numbers. */
const Bar = ({ w = "100%", h = 8 }: { w?: number | string; h?: number }) => (
  <Box style={{ width: w, height: h, borderRadius: "var(--ds-radius-2)", background: "var(--ds-fill-weak)" }} />
);

const SIDE_ROWS = [
  { icon: House, label: "Home", href: "#home", current: true },
  { icon: ChartBar, label: "Reports", href: "#reports" },
  { icon: Users, label: "Team", href: "#team" },
  { icon: Gear, label: "Settings", href: "#settings" },
];

/* The shell's specimens are wired with the REAL System SideNav + TopNav, not look-alikes — a shell is
   defined by how it hosts those two components, so a hand-rolled stand-in would document a layout that
   nobody ships. AppShell supplies the nav render-mode contexts to both slots, so neither needs extra
   wiring here. Every instance takes an explicit landmark name: a page showing several shells at once
   would otherwise emit several identically-named <nav> landmarks, which is an a11y failure. */
function DemoSideNav({ label, collapsed = false }: { label: string; collapsed?: boolean }) {
  return (
    <SideNav aria-label={label} defaultCollapsed={collapsed}>
      {SIDE_ROWS.map((r) => (
        <SideNav.Item
          key={r.label}
          icon={<r.icon weight={r.current ? "fill" : "regular"} />}
          label={r.label}
          href={r.href}
          isSelected={r.current}
        />
      ))}
    </SideNav>
  );
}

function DemoTopNav({ label }: { label: string }) {
  return (
    <TopNav aria-label={label} end={<Avatar size="sm" fallback="AL" />}>
      <TopNav.Heading
        href="#home"
        logo={<Box style={{ width: 18, height: 18, borderRadius: "var(--ds-radius-2)", background: "var(--ds-fill-accent)" }} />}
      >
        Acme
      </TopNav.Heading>
      <TopNav.Item label="Docs" href="#docs" />
      <TopNav.Item label="Pricing" href="#pricing" />
    </TopNav>
  );
}

function DemoMain() {
  return (
    <Flex direction="column" gap="3">
      <Text size="4" weight="bold" style={{ color: "var(--ds-text-strong)" }}>Dashboard</Text>
      <Text size="2" style={{ color: "var(--ds-text-weak)" }}>The primary reading area — the single <Code>main</Code> landmark the shell guarantees.</Text>
      <Flex direction="column" gap="2"><Bar /><Bar w="92%" /><Bar w="96%" /><Bar w="70%" /></Flex>
    </Flex>
  );
}

function DemoFooter() {
  return (
    <Flex align="center" justify="between" width="100%" px="3" py="2">
      <Text size="1" style={{ color: "var(--ds-text-weak)" }}>© Acme</Text>
      <Text size="1" style={{ color: "var(--ds-text-weak)" }}>v1.0.0</Text>
    </Flex>
  );
}

/* The flagship dogfood: the same shell wired with the REAL System `SideNav` + `TopNav` — the actual
   integration a product ships. AppShell provides the nav render-mode contexts to both slots, so the bar
   and rail need no extra wiring. Distinct landmark names (rail "Main", bar "Primary" — the defaults) keep
   the two navs unambiguous; the active row carries aria-current on its link. `breakpoint: "none"` pins it
   to the desktop regime so the docs specimen stays expanded (no drawer, nothing flashes on view). */
function RealNavShell() {
  return (
    <AppShell
      data-testid="usage-realnav"
      mainLabel="Dashboard"
      mobileNav={{ breakpoint: "none" }}
      topNav={
        <TopNav end={<Avatar size="sm" fallback="AL" />}>
          <TopNav.Heading
            href="#home"
            logo={<Box style={{ width: 18, height: 18, borderRadius: "var(--ds-radius-2)", background: "var(--ds-fill-accent)" }} />}
          >
            Acme
          </TopNav.Heading>
          <TopNav.Item label="Dashboard" href="#dashboard" isSelected />
          <TopNav.Item label="Reports" href="#reports" />
        </TopNav>
      }
      sideNav={
        <SideNav>
          <SideNav.Item icon={<House weight="fill" />} label="Home" href="#home" isSelected />
          <SideNav.Item icon={<ChartBar />} label="Reports" href="#reports" />
          <SideNav.Item icon={<Users />} label="Team" href="#team" />
          <SideNav.Item icon={<Gear />} label="Settings" href="#settings" />
        </SideNav>
      }
      style={{ height: 340, border: "1px solid var(--ds-stroke-weak)", borderRadius: "var(--ds-radius-4)", overflow: "hidden" }}
    >
      <DemoMain />
    </AppShell>
  );
}

/* A compact, realistic full-page shell built from the REAL AppShell — reused by Usage, both as the token
   specimen and for the scenarios. Docs render at the desktop viewport (breakpoint md), so the
   drawer stays closed — nothing flashes on view.
   TWO KNOBS keep a miniature honest, the same pair the Layout page's own MiniLayout reaches for:
   a rail measure that stays PROPORTIONATE at the specimen's width, and a floor under the content.
   `railCollapsed` picks the SideNav's icon rail (its width derives from the nav ladder's top rung) instead of its 240px expanded measure. That is
   about scale, not preference: measured, a real shell at 1440px gives a 240px rail 17% of the window,
   while a 283px scenario card gives the same rail 85% — the specimen would be documenting a rail with
   a sliver beside it. The icon rail takes 20% of the card, which is the proportion of the real
   thing. Full width (the 790px token specimen, the flagship below) keeps the expanded rail.
   `--ds-layout-content-min` is the shell-level floor under the content measure: inert at these widths,
   it makes the silent crush (content absorbing every pixel the rail doesn't want, text wrapping to one
   character per line) structurally impossible if the card ever narrows. */
function MiniShell({
  height = 300, variant = "base", navLabel = "Primary", mainLabel, forceMobile = false, drawerOpen,
  hasTopNav = true, hasSideNav = true, hasFooter = true, railCollapsed = false, testid,
}: {
  height?: number; variant?: AppShellVariant; navLabel?: string; mainLabel?: string; forceMobile?: boolean;
  /** Pin the drawer open — only for the token table's measurement host, which mounts a shell with the
   *  drawer up, reads the scrim off it, and unmounts it again. Never on a visible specimen. */
  drawerOpen?: boolean;
  hasTopNav?: boolean; hasSideNav?: boolean; hasFooter?: boolean; railCollapsed?: boolean; testid?: string;
}) {
  return (
    <AppShell
      data-testid={testid}
      variant={variant}
      mainLabel={mainLabel}
      open={drawerOpen}
      onOpenChange={drawerOpen === undefined ? undefined : () => {}}
      // A very-wide breakpoint forces the mobile mode-swap at the docs viewport (drawer stays CLOSED —
      // no auto-open, no flash); a plain {} keeps the default md breakpoint (desktop at these widths).
      mobileNav={forceMobile ? { breakpoint: 4000 } : {}}
      // Both landmarks are named off `navLabel` so several MiniShells can sit on one page without
      // colliding (an unnamed-duplicate-landmark failure).
      topNav={hasTopNav ? <DemoTopNav label={`${navLabel} bar`} /> : undefined}
      sideNav={hasSideNav ? <DemoSideNav label={navLabel} collapsed={railCollapsed} /> : undefined}
      footer={hasFooter ? <DemoFooter /> : undefined}
      style={{
        height, border: "1px solid var(--ds-stroke-weak)", borderRadius: "var(--ds-radius-4)", overflow: "hidden",
        "--ds-layout-content-min": "160px",
      } as CSSProperties}
    >
      <DemoMain />
    </AppShell>
  );
}

/* ---- Anatomy diagram — a labelled page-shell wireframe with numbered callouts ------------------- */
const wire: CSSProperties = { display: "flex", alignItems: "center", justifyContent: "flex-start" };
const num = (over: CSSProperties): CSSProperties => ({ ...dotStyle, ...over });

function AnatomyDiagram() {
  return (
    <Box style={{ overflowX: "auto" }}>
      <Box style={{ position: "relative", width: "100%", minWidth: 400, maxWidth: 560, margin: "0 auto" }}>
        <Box style={{ height: 300, borderRadius: "var(--ds-radius-4)", border: "1px solid var(--ds-stroke-weak)", overflow: "hidden", background: "var(--ds-bg-base)", display: "flex", flexDirection: "column" }}>
          {/* Top bar (raised) */}
          <Box style={{ ...wire, height: 48, flexShrink: 0, background: "var(--ds-bg-raised)", padding: "0 16px", justifyContent: "space-between" }}>
            <Text size="1" weight="bold" style={{ color: "var(--ds-text-weak)", letterSpacing: "0.06em" }}>TOP BAR</Text>
          </Box>
          <Box style={{ height: 1, background: "var(--ds-stroke-weak)", flexShrink: 0 }} />
          {/* Body: rail + main */}
          <Flex style={{ flex: 1, minHeight: 0 }}>
            <Box style={{ ...wire, alignItems: "flex-start", width: 128, flexShrink: 0, background: "var(--ds-bg-subtle)", padding: 16 }}>
              <Text size="1" weight="bold" style={{ color: "var(--ds-text-weak)", letterSpacing: "0.06em" }}>SIDE RAIL</Text>
            </Box>
            <Box style={{ width: 1, background: "var(--ds-stroke-weak)", flexShrink: 0 }} />
            <Box style={{ ...wire, alignItems: "flex-start", flex: 1, padding: 16 }}>
              <Text size="1" weight="bold" style={{ color: "var(--ds-text-weak)", letterSpacing: "0.06em" }}>MAIN</Text>
            </Box>
          </Flex>
          <Box style={{ height: 1, background: "var(--ds-stroke-weak)", flexShrink: 0 }} />
          {/* Footer (raised) */}
          <Box style={{ ...wire, height: 40, flexShrink: 0, background: "var(--ds-bg-raised)", padding: "0 16px" }}>
            <Text size="1" weight="bold" style={{ color: "var(--ds-text-weak)", letterSpacing: "0.06em" }}>FOOTER</Text>
          </Box>
        </Box>

        {/* Skip-link chip — visible-on-focus in the real shell; shown here to mark its resting corner. */}
        <Box style={{ position: "absolute", left: 34, top: 8, padding: "3px 10px", borderRadius: "var(--ds-radius-3)", background: "var(--ds-bg-overlay)", boxShadow: "var(--ds-shadow-overlay)", border: "1px solid var(--ds-stroke-weak)", zIndex: 1 }}>
          <Text size="1" style={{ color: "var(--ds-text-link)" }}>Skip to content</Text>
        </Box>

        {/* Numbered callouts — positioned against the wireframe's fixed geometry. */}
        <Box style={num({ left: "calc(100% - 26px)", top: 6 })}>1</Box>
        <Box style={num({ left: 8, top: 6 })}>2</Box>
        <Box style={num({ left: "calc(50% - 9px)", top: 15 })}>3</Box>
        <Box style={num({ left: 48, top: 150 })}>4</Box>
        <Box style={num({ left: "64%", top: 150 })}>5</Box>
        <Box style={num({ left: "calc(50% - 9px)", top: 268 })}>6</Box>
      </Box>
    </Box>
  );
}

const ANATOMY_PARTS: [number, string, string][] = [
  [1, "Shell", "the page frame — a flex column that paints the variant surface (--ds-bg-base by default) and hosts the skip link + the header-height var."],
  [2, "Skip link", "a 'skip to content' link, visually hidden until focused (the first tab stop). It targets the main below, which has tabIndex=-1 so focus lands there deterministically."],
  [3, "Top bar", "the topNav slot — re-renders in 'default' mode on desktop and a condensed 'mobile-bar' (with the hamburger) below the breakpoint. Raised chrome."],
  [4, "Side rail", "the sideNav slot on desktop. Below the breakpoint it re-renders into the mobile drawer; the desktop rail stays mounted-but-hidden so its state survives the swap. Subtle chrome."],
  [5, "Main", "the guaranteed main landmark — the ONLY landmark AppShell auto-emits — wrapping your content. It is the skip-link target (tabIndex=-1)."],
  [6, "Footer", "the optional footer slot (status, meta). Raised chrome. banner/contentinfo/complementary stay opt-in on Layout's slots — never auto-emitted."],
];

/* ---- Properties ---------------------------------------------------------- */
const APPSHELL_PROPS: PropDef[] = [
  { name: "children", type: "ReactNode", desc: <>The main page content — rendered inside the single <Code>main</Code> landmark AppShell guarantees.</>, source: "AppShell.tsx" },
  { name: "topNav", type: "ReactNode", desc: <>The top navigation bar. Re-renders in <Code>"default"</Code> (desktop) / <Code>"mobile-bar"</Code> (mobile) modes via <Code>TopNavRenderProvider</Code>.</>, source: "AppShell.tsx" },
  { name: "sideNav", type: "ReactNode", desc: <>The side navigation rail. Shown in the desktop panel; on mobile it re-renders into the drawer (<Code>"drawer"</Code> mode) while the desktop rail stays mounted-but-hidden.</>, source: "AppShell.tsx" },
  { name: "footer", type: "ReactNode", desc: <>An optional footer bar (status, meta, secondary actions).</>, source: "AppShell.tsx" },
  { name: "mobileNav", type: "false | MobileNavConfig | ReactNode", def: "{}", desc: <><strong>Tri-modal.</strong> <Code>false</Code> disables the drawer + mode-swap; a <Code>MobileNavConfig</Code> tunes the default drawer (see below); a <Code>ReactNode</Code> supplies fully custom drawer contents.</>, source: "AppShell.tsx" },
  { name: "variant", type: `"base" | "subtle" | "raised"`, def: `"base"`, desc: <>The shell surface ladder from <Code>--ds-bg-*</Code> — sets the shell canvas + the main reading surface. Chrome (header/footer/rail) keeps its own paint.</>, source: "AppShell.tsx" },
  { name: "open", type: "boolean", desc: <>Controlled drawer open state (pair with <Code>onOpenChange</Code>). Omit for uncontrolled.</>, source: "AppShell.tsx" },
  { name: "onOpenChange", type: "(open) => void", desc: <>Fires when the drawer requests open/close (toggle, Escape, backdrop).</>, source: "AppShell.tsx" },
  { name: "defaultOpen", type: "boolean", def: "false", desc: <>Initial drawer open state when uncontrolled.</>, source: "AppShell.tsx" },
  { name: "defaultIsMobile", type: "boolean", def: "false", desc: <><strong>SSR hint</strong> — seeds the server media-query snapshot so a mobile client does not layout-flash from desktop→drawer after hydration. Affects only the server/first-hydration render.</>, source: "AppShell.tsx" },
  { name: "mainId", type: "string", desc: <>id for the guaranteed <Code>main</Code> (the skip-link target). Auto-generated when omitted.</>, source: "AppShell.tsx" },
  { name: "mainLabel", type: "string", desc: <>Optional accessible name for the <Code>main</Code> landmark.</>, source: "AppShell.tsx" },
  { name: "skipLinkLabel", type: "string", def: `"Skip to content"`, desc: <>Text of the skip link.</>, source: "AppShell.tsx" },
  { name: "…rest", type: "div props", desc: <>Forwarded honestly to the shell root — <Code>className</Code>, <Code>style</Code>, <Code>id</Code>, <Code>data-*</Code>, <Code>ref</Code>, etc.</>, source: "AppShell.tsx" },
];

const MOBILENAVCONFIG_PROPS: PropDef[] = [
  { name: "breakpoint", type: `"sm" | "md" | "lg" | "none" | number`, def: `"md"`, desc: <>The width BELOW which the shell swaps to mobile. A named nav breakpoint (<Code>sm</Code> 640 / <Code>md</Code> 768 / <Code>lg</Code> 1024), a custom min-width in px, or <Code>"none"</Code> (always desktop).</>, source: "AppShell.tsx" },
  { name: "side", type: `"start" | "end" | "auto"`, def: `"auto"`, desc: <>Which edge the drawer slides from — <Code>"auto"</Code> picks the edge nearest the toggle at open.</>, source: "MobileNav.tsx" },
  { name: "width", type: "number", def: "320", desc: <>Drawer width in px — rendered honestly as <Code>min(100vw, width)</Code>.</>, source: "MobileNav.tsx" },
  { name: "label", type: "string", def: `"Navigation"`, desc: <>Accessible name for the drawer dialog.</>, source: "MobileNav.tsx" },
  { name: "header", type: "ReactNode", desc: <>Optional header slot pinned above the drawer's scrollable nav body.</>, source: "MobileNav.tsx" },
  { name: "includeTopNav", type: "boolean", def: "true", desc: <>Also render the <Code>topNav</Code> inside the drawer (<Code>"drawer"</Code> mode), above the sidenav. Set false to keep the topNav in the condensed mobile bar only.</>, source: "AppShell.tsx" },
];

/* ========================================================================== */
const meta = {
  title: "Components/Layout/AppShell",
  component: AppShell,
  parameters: {
    controls: { disable: true },
    docs: {
      description: {
        component:
          "**AppShell** is the top-level page shell — the full-tier capstone of the layout family. It " +
          "**composes `Layout`** (topNav → header, sideNav → panel, content → the guaranteed `main`, footer → " +
          "footer), owns the responsive **mode-swap** (below the breakpoint the sidenav/topnav *re-render* into " +
          "a mobile drawer rather than CSS-collapsing), and **provides the app-shell contexts** — the drawer " +
          "state and the render modes. It guarantees the single `main` landmark plus a **skip-to-content** link " +
          "(with the `tabIndex={-1}` focus fix), keeps the off-screen rail **mounted** via `hidden`, and " +
          "publishes the runtime `--ds-appshell-header-height` var through the shared ResizeObserver. It's the " +
          "**full docs tier**: History · Anatomy · Usage · Props.",
      },
    },
  },
} satisfies Meta<typeof AppShell>;
export default meta;
type Story = StoryObj<typeof AppShell>;

/* ---- Anatomy ------------------------------------------------------------- */
export const Anatomy: Story = {
  render: () => (
    <Page>
      <PageHeader title="AppShell · Anatomy" standfirst={DEFINITION} />
      <Section title="Anatomy" lead="A full page shell — a top bar and footer bracketing a body row of the side rail and the main content, with a skip link and the guaranteed main landmark. Below the breakpoint the rail re-renders into a mobile drawer (reached by the hamburger).">
        <AnatomyDiagram />
        <AnatomyLegend parts={ANATOMY_PARTS} />
        <Caption>Give any of topNav / sideNav / footer or leave them out — the shell arranges what it's given. Only <Code>main</Code> is guaranteed.</Caption>
      </Section>
    </Page>
  ),
};

/* ---- Usage --------------------------------------------------------------- */
export const Usage: Story = {
  // Three real shells coexist on one docs page → three <main> landmarks (a docs artifact — a real app has
  // exactly ONE shell / ONE main, asserted in _internal). Scope off landmark-no-duplicate-main + the
  // DoDont tint's color-contrast (~4.1–4.4, the documented specimen exception) for THIS story only.
  parameters: {
    // color-contrast is scoped to the DoDont specimen only (exclude), not disabled page-wide.
    a11y: { context: { exclude: [DODONT_LABEL] }, config: { rules: [
      { id: "landmark-no-duplicate-main", enabled: false },
      // Several real shells coexist on ONE docs page, so nav landmark names repeat across shells (e.g.
      // two "Primary" bars in different shells) — a docs artifact, not a real-app state (one shell → one
      // set of landmarks). Scope off landmark-unique for THIS story only; the per-shell labelling is real.
      { id: "landmark-unique", enabled: false },
    ] } },
  },
  // The shells host the REAL SideNav/TopNav; DemoLink mutes their link navigation so a click never
  // reloads the Storybook iframe. AppShell's own skip link is a raw in-page <a> (not provider-routed).
  render: (_args, { globals }) => (
    <LinkProvider component={DemoLink}>
    <Page maxWidth={960}>
      <PageHeader title="AppShell · Usage" standfirst={DEFINITION} />
      <Section title="Real shells" lead="Three shapes the same shell covers. Each is a real AppShell — one main, one skip link. Opt in to nav placement; the drawer is the mobile fallback.">
        <Grid columns={{ initial: "1", md: "3" }} gapX="6" gapY="5">
          <Scenario label="DESKTOP SHELL" caption="Top bar · a side rail · the working content · a footer — the full composition. Shown with the rail collapsed to its icon rail; the flagship below runs it expanded.">
            {/* "Desktop", not "Primary": the flagship RealNavShell further down this same page already
                names its bar "Primary" (TopNav's default), and two nav landmarks on one page must not
                share a name. */}
            <MiniShell height={260} navLabel="Desktop" mainLabel="Dashboard" railCollapsed testid="usage-desktop" />
          </Scenario>
          <Scenario label="WITH DRAWER" caption="Forced to the mobile mode-swap: the rail folds into a drawer reached by the hamburger; the top bar condenses. (Tap the menu to slide it in.)">
            <MiniShell height={260} forceMobile navLabel="Mobile" mainLabel="Mobile app" testid="usage-drawer" />
          </Scenario>
          <Scenario label="NO TOP NAV" caption="Sidebar-only chrome — a rail beside the content, no top bar. Every slot is optional except the content.">
            <MiniShell height={260} hasTopNav={false} hasFooter={false} navLabel="Sections" mainLabel="Docs" railCollapsed testid="usage-notop" />
          </Scenario>
        </Grid>
      </Section>

      <Rule />

      <Section title="Real navigation, wired in" lead="The flagship dogfood — this same shell hosting the System SideNav + TopNav components. AppShell hands both slots the nav render-mode contexts, so the bar and rail need no extra wiring. Distinct landmark names (the rail is 'Main', the bar is 'Primary') keep the two navs unambiguous, and the active row carries aria-current on its link.">
        <RealNavShell />
        <Caption>The compact scenarios above keep the shell the subject; this is the actual integration a product ships.</Caption>
      </Section>

      <Rule />

      <Section title="One shell, one main" lead="AppShell guarantees exactly one main landmark and one skip link per page. Compose the whole page in a single shell — never nest shells or hand-roll a second main.">
        <Grid columns={{ initial: "1", sm: "2" }} gap="3">
          <DoDont kind="do" bare note="Do wrap the whole page in one AppShell — one main, one skip link, predictable landmarks. Put primary navigation in topNav / sideNav.">
            <Box style={{ background: "var(--ds-bg-base)", border: "1px solid var(--ds-stroke-weak)", borderRadius: "var(--ds-radius-3)", padding: 12 }}>
              <Flex direction="column" gap="2">
                <Bar h={10} />
                <Flex gap="2"><Box style={{ width: 40, flexShrink: 0 }}><Bar h={60} /></Box><Box style={{ flex: 1 }}><Bar h={60} /></Box></Flex>
                <Text size="1" style={{ color: "var(--ds-text-weak)" }}>one shell · one &lt;main&gt;</Text>
              </Flex>
            </Box>
          </DoDont>
          <DoDont kind="dont" bare note="Don't nest AppShells or add a second <main> for a sub-region — multiple main landmarks break assistive-tech wayfinding. Use Layout for inner regions.">
            <Box style={{ background: "var(--ds-bg-base)", border: "1px solid var(--ds-stroke-weak)", borderRadius: "var(--ds-radius-3)", padding: 12 }}>
              <Box style={{ border: "1px solid var(--ds-stroke-weak)", borderRadius: "var(--ds-radius-2)", padding: 8 }}>
                <Bar h={10} />
                <Box mt="2" style={{ outline: "1px dashed var(--ds-stroke-strong)", borderRadius: "var(--ds-radius-2)", padding: 8 }}>
                  <Text size="1" style={{ color: "var(--ds-text-weak)" }}>NESTED SHELL — two &lt;main&gt;s, DON'T</Text>
                </Box>
              </Box>
            </Box>
          </DoDont>
        </Grid>
      </Section>

      <Rule />

      {/* The closing reference section. The provider is what makes the table live: every measured row
          re-reads its value when this key changes, so an accent/appearance flip re-resolves the spec. */}
      <HexThemeKey.Provider value={`${globals.accent}-${globals.appearance}-${globals.contrast}`}>
        <Section title="Tokens" lead="Measured off rendered shells — each row names the element and the property that paints a surface, reads it, and checks it against the role it claims.">
          <TokenGroup
            label="SURFACE LADDER + SCRIM"
            blurb="A live AppShell painted from the variant surface ladder; the chrome (top bar / footer raised, rail subtle) reads its own roles; the mobile drawer dims the page behind the modal scrim. Every row below is read off a rendered shell of that variant."
            specimen={<Box style={{ width: "100%" }}><MiniShell testid="spec-live" height={280} /></Box>}
          >
            {/* The five surface rows read three rendered shells. The sixth — the drawer scrim — only
                exists while the mobile drawer is up, and a mobile drawer is a MODAL: leaving one mounted
                locks body scroll and aria-hides every sibling, so this docs page would stop scrolling.
                So the host is `transient`: it mounts a fourth shell with the drawer open, holds it only
                until all six rows have read (they join a barrier; the host cannot take it down until
                every one has released), then unmounts it. The drawer portals to the document body rather
                than into the host, so the host adopts what it created and hides it in the same commit. */}
            <MeasuredSpec
              transient
              render={() => (
                <>
                  <MiniShell height={200} variant="base" navLabel="Base measurement" testid="measure-base" />
                  <MiniShell height={200} variant="subtle" navLabel="Subtle measurement" testid="measure-subtle" />
                  <MiniShell height={200} variant="raised" navLabel="Raised measurement" testid="measure-raised" />
                  <MiniShell height={200} forceMobile drawerOpen navLabel="Drawer measurement" testid="measure-drawer" />
                </>
              )}
            >
              <MeasuredRow
                part="Shell surface · base"
                note="The default variant — the canvas the chrome sits on."
                token="--ds-bg-base"
                select='[data-testid="measure-base"]'
                prop="background-color"
              />
              <MeasuredRow
                part="Shell surface · subtle"
                note="One step off the base, for a shell whose content areas carry their own surfaces."
                token="--ds-bg-subtle"
                select='[data-testid="measure-subtle"]'
                prop="background-color"
              />
              <MeasuredRow
                part="Shell surface · raised"
                note="The chrome step, for a shell that reads as a panel in its own right."
                token="--ds-bg-raised"
                select='[data-testid="measure-raised"]'
                prop="background-color"
              />
              <MeasuredRow
                part="Top bar / footer"
                note="Chrome bars keep the raised step whatever the shell variant is."
                token="--ds-bg-raised"
                select='[data-testid="measure-base"] .rt-ds-layout-area[data-ds-layout-area="header"]'
                prop="background-color"
              />
              <MeasuredRow
                part="Side rail"
                note="The rail column the desktop nav sits in."
                token="--ds-bg-subtle"
                select='[data-testid="measure-base"] .rt-ds-appshell-rail'
                prop="background-color"
              />
              <MeasuredRow
                part="Drawer scrim"
                note="Dims the page behind the mobile drawer — read off a shell mounted with its drawer open."
                token="--ds-scrim"
                select=".rt-BaseDialogOverlay:has(.rt-ds-mobilenav)"
                prop="background-color"
                pseudo="::before"
              />
            </MeasuredSpec>
            <NoteRow part="Header height" value="published as a runtime CSS var" radix="--ds-appshell-header-height (shared ResizeObserver)" />
            <NoteRow part="Skip target" value="main gets tabIndex=-1" radix="skip link → #mainId" />
          </TokenGroup>
        </Section>
      </HexThemeKey.Provider>
    </Page>
    </LinkProvider>
  ),
  play: async ({ canvasElement }) => {
    // The token table's EVIDENCE, asserted at runtime — all six rows read a REAL rendered shell,
    // including the drawer scrim, which is read off a fourth shell mounted with its drawer open and
    // unmounted again. `awaitMeasuredRows` waits for every row to record its evidence AND for that
    // mount cycle to have closed, so everything below sees the page whole again. It runs FIRST for
    // that reason: the scenario assertions further down check that no drawer is mounted.
    const rows = await awaitMeasuredRows(canvasElement);
    if (rows.measured !== 6 || rows.unproven !== 0) {
      throw new Error(`expected 6 measured / 0 unproven token rows, got ${rows.measured} / ${rows.unproven}`);
    }
    // The page survived the read: an open drawer is a modal, so it locks body scroll and aria-hides
    // every sibling while it is up. The teardown is asserted rather than assumed.
    if (document.body.hasAttribute("data-scroll-locked")) {
      throw new Error("body is still scroll-locked after the measurement cycle — the drawer never closed");
    }
    const stillHidden = Array.from(document.body.children).filter((n) => n.hasAttribute("aria-hidden")).length;
    if (stillHidden) throw new Error(`${stillHidden} body children are still aria-hidden after the measurement cycle`);
    if (document.querySelector(".rt-ds-mobilenav")) throw new Error("the drawer must not stay mounted on view");

    // Passive (no driving / no flash): a static real AppShell rides the spec section, so its landmarks,
    // skip link, surface-token binding, and header-height var are asserted right here. axe runs automatically.
    const root = canvasElement.querySelector<HTMLElement>('[data-testid="spec-live"]');
    if (!root) throw new Error("the token spec must render a live AppShell specimen");

    // The single main landmark exists, is the skip-link target, and is programmatically focusable.
    const main = root.querySelector<HTMLElement>("main.rt-ds-appshell-main");
    if (!main) throw new Error("AppShell must emit a single <main>");
    if (main.tabIndex !== -1) throw new Error(`main must have tabIndex=-1 (skip target); got ${main.tabIndex}`);
    const skip = root.querySelector<HTMLAnchorElement>("a.rt-ds-appshell-skiplink");
    if (!skip) throw new Error("AppShell must render a skip link");
    if (skip.getAttribute("href") !== `#${main.id}`) throw new Error(`skip link must target #${main.id}; got ${skip.getAttribute("href")}`);

    // Surface token binding — the shell paints the variant surface (base).
    const themeRoot = canvasElement.querySelector<HTMLElement>(".radix-themes") ?? root;
    const got = toHex(getComputedStyle(root).backgroundColor);
    const want = tokenHex(themeRoot, "--ds-bg-base");
    if (got !== want) throw new Error(`shell must paint --ds-bg-base; got ${got} vs ${want}`);

    // Header-height var is published on the shell root (the shared ResizeObserver measured the top bar).
    const t0 = performance.now();
    while (!root.style.getPropertyValue("--ds-appshell-header-height")) {
      if (performance.now() - t0 > 1500) throw new Error("--ds-appshell-header-height was never published");
      await new Promise((r) => setTimeout(r, 20));
    }

    // Structural assertions on the real scenarios (passive — no driving).
    const desktop = canvasElement.querySelector<HTMLElement>('[data-testid="usage-desktop"]');
    if (!desktop) throw new Error("missing desktop scenario");
    if (!desktop.querySelector("main.rt-ds-appshell-main")) throw new Error("desktop shell missing main");
    // The desktop rail is visible (not hidden) at these widths.
    const rail = desktop.querySelector<HTMLElement>(".rt-ds-appshell-rail");
    if (!rail || rail.hidden) throw new Error("desktop rail must be visible");

    // The scenario card has to DEMONSTRATE the shell, not a collapse: the rail must leave the content a
    // real measure. With the 240px expanded rail in a 283px card this was 41px, and "Dashboard" wrapped
    // one letter per line — precisely the failure the Layout page's own DON'T card warns about.
    const dMain = desktop.querySelector<HTMLElement>("main.rt-ds-appshell-main")!;
    const dStyle = getComputedStyle(dMain);
    const measure = dMain.clientWidth - parseFloat(dStyle.paddingLeft) - parseFloat(dStyle.paddingRight);
    if (measure < 140) throw new Error(`the desktop scenario's content measure must stay usable (>=140px); got ${Math.round(measure)}px`);
    // …and the heading it holds must sit on ONE line (the visible symptom, measured font-size-free).
    const heading = Array.from(dMain.querySelectorAll("*")).find((el) => !el.children.length && el.textContent?.trim() === "Dashboard");
    if (!heading) throw new Error("the desktop scenario must render its 'Dashboard' heading");
    const range = document.createRange();
    range.selectNodeContents(heading);
    const lines = range.getClientRects().length;
    range.detach();
    if (lines !== 1) throw new Error(`"Dashboard" must sit on one line in the scenario card; it wrapped to ${lines}`);

    // The forced-mobile scenario condenses: a hamburger toggle appears and the desktop rail is hidden.
    const drawer = canvasElement.querySelector<HTMLElement>('[data-testid="usage-drawer"]');
    if (!drawer) throw new Error("missing with-drawer scenario");
    const toggle = drawer.querySelector<HTMLButtonElement>("button[aria-controls][aria-expanded]");
    if (!toggle) throw new Error("forced-mobile shell must render a hamburger toggle");
    const mRail = drawer.querySelector<HTMLElement>(".rt-ds-appshell-rail");
    if (!mRail || !mRail.hidden) throw new Error("forced-mobile shell must keep the desktop rail mounted-but-hidden");
    // No drawer flashes on view (closed by default).
    if (drawer.parentElement && document.querySelector(".rt-ds-mobilenav")) throw new Error("the drawer must stay closed on view (no flash)");

    // The flagship dogfood wires the REAL System SideNav + TopNav (also the standing regression proof for
    // the nav-landmark naming and the aria-current placement).
    const realnav = canvasElement.querySelector<HTMLElement>('[data-testid="usage-realnav"]');
    if (!realnav) throw new Error("missing real-navigation scenario");
    // Distinct nav landmark names: the rail is "Main", the bar is "Primary".
    const railNav = realnav.querySelector<HTMLElement>(".rt-ds-appshell-rail nav.rt-ds-sidenav-nav");
    if (railNav?.getAttribute("aria-label") !== "Main")
      throw new Error(`SideNav landmark must be labelled "Main"; got ${railNav?.getAttribute("aria-label")}`);
    const barNav = realnav.querySelector<HTMLElement>(".rt-ds-appshell-topnav nav.rt-ds-topnav");
    if (barNav?.getAttribute("aria-label") !== "Primary")
      throw new Error(`TopNav landmark must be labelled "Primary"; got ${barNav?.getAttribute("aria-label")}`);
    // aria-current="page" rides the <a> link body — NOT the Item root div (the a11y fix).
    const currentLink = realnav.querySelector<HTMLElement>('.rt-ds-appshell-rail a.rt-ds-item-body[aria-current="page"]');
    if (!currentLink) throw new Error("the active SideNav row must carry aria-current=page on its <a> body");
    if (realnav.querySelector('.rt-ds-appshell-rail .rt-ds-item[aria-current="page"]'))
      throw new Error("aria-current must NOT land on the Item root div");
  },
};

/* ---- Props ---------------------------------------------------------- */
type PropsArgs = {
  variant: AppShellVariant;
  breakpoint: "sm" | "md" | "lg" | "none";
  simulateMobile: boolean;
  side: "start" | "end" | "auto";
  drawerWidth: number;
  defaultIsMobile: boolean;
  includeTopNav: boolean;
  hasTopNav: boolean;
  hasSideNav: boolean;
  hasFooter: boolean;
};

/** Props — the live, args-driven AppShell. Flip **Simulate mobile** to force the mode-swap at any
 *  viewport (the real drawer opens from the hamburger); tune the variant, breakpoint, and slots. */
export const Props: StoryObj<PropsArgs> = {
  args: {
    variant: "base", breakpoint: "md", simulateMobile: false, side: "auto", drawerWidth: 320,
    defaultIsMobile: false, includeTopNav: true, hasTopNav: true, hasSideNav: true, hasFooter: true,
  },
  argTypes: {
    variant: { control: "inline-radio", options: ["base", "subtle", "raised"], description: "Shell surface ladder (--ds-bg-*).", table: { category: "AppShell" } },
    breakpoint: { control: "inline-radio", options: ["sm", "md", "lg", "none"], description: "Swap to mobile below this width (none = always desktop).", table: { category: "MobileNavConfig" } },
    simulateMobile: { name: "simulate mobile", control: "boolean", description: "Force the mobile mode-swap regardless of viewport (a wide breakpoint) — open the drawer from the hamburger.", table: { category: "MobileNavConfig" } },
    side: { control: "inline-radio", options: ["start", "end", "auto"], description: "Which edge the drawer slides from.", table: { category: "MobileNavConfig" } },
    drawerWidth: { name: "width", control: { type: "number", min: 220, max: 480, step: 20 }, description: "Drawer width in px (min(100vw, width)).", table: { category: "MobileNavConfig" } },
    defaultIsMobile: { control: "boolean", description: "SSR hint — seeds the server snapshot (no visible effect in this client-only preview).", table: { category: "AppShell" } },
    includeTopNav: { control: "boolean", description: "Render the topNav inside the drawer too.", table: { category: "MobileNavConfig" } },
    hasTopNav: { name: "topNav", control: "boolean", description: "Provide a topNav slot.", table: { category: "Slots" } },
    hasSideNav: { name: "sideNav", control: "boolean", description: "Provide a sideNav slot.", table: { category: "Slots" } },
    hasFooter: { name: "footer", control: "boolean", description: "Provide a footer slot.", table: { category: "Slots" } },
  },
  parameters: { controls: { disable: false } },
  render: ({ variant, breakpoint, simulateMobile, side, drawerWidth, defaultIsMobile, includeTopNav, hasTopNav, hasSideNav, hasFooter }: PropsArgs) => (
    <LinkProvider component={DemoLink}>
    <Page maxWidth="none">
      <PageHeader title="AppShell · Props" standfirst={DEFINITION} />
      <Box p="3">
        <AppShell
          key={`${hasTopNav}-${hasSideNav}-${hasFooter}`}
          data-testid="pg-appshell"
          variant={variant}
          defaultIsMobile={defaultIsMobile}
          mobileNav={{ breakpoint: simulateMobile ? 4000 : breakpoint, side, width: drawerWidth, includeTopNav }}
          topNav={hasTopNav ? <DemoTopNav label="Primary bar" /> : undefined}
          sideNav={hasSideNav ? <DemoSideNav label="Primary" /> : undefined}
          footer={hasFooter ? <DemoFooter /> : undefined}
          style={{ height: 380, border: "1px solid var(--ds-stroke-weak)", borderRadius: "var(--ds-radius-4)", overflow: "hidden" }}
        >
          <DemoMain />
        </AppShell>
      </Box>
      <PropsLead />
      <Rule />
      <Section title="AppShell props" lead={<>Every prop the shell accepts — including the tri-modal <Mono>mobileNav</Mono>.</>}>
        <PropTable rows={APPSHELL_PROPS} />
      </Section>
      <Section title="MobileNavConfig" lead={<>The <Mono>mobileNav</Mono> config object — its six knobs, documented in full.</>}>
        <PropTable rows={MOBILENAVCONFIG_PROPS} />
      </Section>
    </Page>
    </LinkProvider>
  ),
};

/* ---- History ------------------------------------------------------------- */
export const History: Story = {
  render: () => (
    <Page>
      <PageHeader title="AppShell · History" standfirst={DEFINITION} />
      <Section title="Decisions" lead="The rulings this component encodes.">
        <Flex direction="column" gap="3">
          <Decision id="[[app-shell]] · JS mode-swap">
            The responsive change is a <strong>JS mode-swap, not a CSS collapse</strong>: below the breakpoint
            the <Code>sideNav</Code>/<Code>topNav</Code> <strong>re-render</strong> into the mobile drawer via
            render-mode contexts (<Code>SideNavRenderProvider</Code> / <Code>TopNavRenderProvider</Code>, modes
            <Code>default</Code> / <Code>mobile-bar</Code> / <Code>drawer</Code>). The breakpoint rides the
            SSR-safe <Code>useMediaQuery</Code> engine (matchMedia inside a <Code>useSyncExternalStore</Code>
            snapshot) — never touched during render.
          </Decision>
          <Decision id="[[app-shell]] · SSR hint">
            <Code>defaultIsMobile</Code> seeds the <strong>server snapshot</strong> so a mobile client renders
            the drawer regime server-side and does <strong>not layout-flash</strong> desktop→drawer after
            hydration. Omit it and the server assumes desktop (the common case).
          </Decision>
          <Decision id="[[app-shell]] · skip-link fix">
            AppShell owns a <strong>skip-to-content link</strong> targeting the <Code>main</Code> — <strong>with
            <Code>tabIndex={"{-1}"}</Code> added</strong> so focus lands there deterministically. Fragment
            navigation alone does not move focus in every browser, so the explicit <Code>tabIndex</Code> is
            what makes it reliable. <Code>main</Code> is the
            <strong>only landmark AppShell auto-emits</strong>; banner/contentinfo/complementary stay opt-in on
            Layout's slots.
          </Decision>
          <Decision id="[[app-shell]] · header-height var">
            The header's height is published as the runtime var <Code>--ds-appshell-header-height</Code> on the
            shell root, measured through the <strong>shared ResizeObserver</strong> (reuse — not a new observer).
            Consumers read it with a fallback: <Code>var(--ds-appshell-header-height, 0px)</Code>, so a shell
            without a topNav still lays out.
          </Decision>
          <Decision id="[[app-shell]] · hidden keep-mounted">
            The off-screen desktop rail is kept <strong>mounted via the <Code>hidden</Code> attribute</strong>
            (+ <Code>display:none</Code>) rather than unmounted — so its tree, scroll position, and expanded
            groups survive the swap. Keeping it mounted uses only the stable <Code>hidden</Code> attribute —
            no experimental APIs.
          </Decision>
          <Decision id="[[app-shell]] · tri-modal mobileNav">
            <Code>mobileNav</Code> is honestly <strong>tri-modal</strong>: <Code>false</Code> disables the drawer;
            a <Code>MobileNavConfig</Code> object tunes it (breakpoint / side / width / label / header /
            includeTopNav — <strong>six knobs, all documented here</strong>); a <Code>ReactNode</Code>
            supplies fully custom drawer contents.
          </Decision>
        </Flex>
      </Section>

      <Rule />

      <Section title="Changelog" lead="Notable changes, newest first.">
        <Flex direction="column" gap="3">
          <Decision id="0.9.0">
            Initial <Code>System/Layout/AppShell</Code> — the top-level page shell composing <Code>Layout</Code>
            with the responsive mode-swap (SSR-safe <Code>useMediaQuery</Code>, <Code>defaultIsMobile</Code> hint),
            the guaranteed <Code>main</Code> landmark + skip link (<Code>tabIndex={"{-1}"}</Code>), the
            <Code>hidden</Code>-based keep-mounted rail, the tri-modal <Code>mobileNav</Code> +
            <Code>MobileNavConfig</Code>, the <Code>variant</Code> surface ladder, and the
            <Code>--ds-appshell-header-height</Code> var via the shared ResizeObserver. Painted from
            <Code>--ds-*</Code> surfaces — no new design tokens. Stories split History · Anatomy · Usage ·
            Props.
          </Decision>
        </Flex>
      </Section>
    </Page>
  ),
};
