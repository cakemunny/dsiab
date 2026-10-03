import { useId, useState } from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { Box, Code, Flex, Grid, Text } from "@radix-ui/themes";
import { House, Gear, ChartBar, Users, SignOut } from "@phosphor-icons/react";
import { MobileNav, MobileNavToggle, type MobileNavSide } from "./MobileNav";
import { Item } from "./Item";
import { LinkProvider } from "./Link";
import {
  Caption, Decision, DemoLink, DoDont, DODONT_LABEL, HexThemeKey, MeasuredRow, MeasuredSpec, Mono, Page,
  PageHeader, PropsLead, type PropDef, PropTable, Rule, Section,
} from "./_storyKit";
import { awaitMeasuredRows } from "../../foundations/_assert";

/* ---- a small nav body reused across the specimen + playground ------------- */
const NAV_ROWS: { icon: typeof House; label: string; href: string; current?: boolean }[] = [
  { icon: House, label: "Home", href: "#home", current: true },
  { icon: ChartBar, label: "Reports", href: "#reports" },
  { icon: Users, label: "Team", href: "#team" },
  { icon: Gear, label: "Settings", href: "#settings" },
];

function NavBody() {
  // Nav destinations are real links marked with aria-current="page" for the active route (the correct
  // wayfinding semantic — [[mobile-nav]]). isSelected only drives the visual paint (data-selected) here; no parent
  // role means no aria-selected is emitted, so aria stays valid on a link.
  return (
    <nav aria-label="Primary">
      <Flex direction="column" gap="1">
        {NAV_ROWS.map((r) => (
          <Item
            key={r.label}
            href={r.href}
            startContent={<r.icon />}
            label={r.label}
            isSelected={r.current}
            aria-current={r.current ? "page" : undefined}
          />
        ))}
      </Flex>
    </nav>
  );
}

/* A compact "phone" chrome so the drawer reads in context without auto-opening (which would flash the
   docs page). The live MobileNavToggle sits in the top bar; tapping it slides the real drawer in. */
function PhoneFrame({
  side,
  testid,
}: {
  side?: MobileNavSide;
  testid?: string;
}) {
  const [open, setOpen] = useState(false);
  const drawerId = useId();
  return (
    <Box
      data-testid={testid}
      style={{
        width: 300,
        border: "1px solid var(--ds-stroke-strong)",
        borderRadius: "var(--ds-radius-5)",
        overflow: "hidden",
        background: "var(--ds-bg-base)",
      }}
    >
      {/* Mock top app bar */}
      <Flex
        align="center"
        justify="between"
        style={{ padding: "10px 12px", background: "var(--ds-bg-raised)", borderBottom: "1px solid var(--ds-stroke-weak)" }}
      >
        <MobileNavToggle open={open} onToggle={setOpen} drawerId={drawerId} />
        <Text size="2" weight="bold" style={{ color: "var(--ds-text-strong)" }}>Acme</Text>
        <Box style={{ width: 32 }} />
      </Flex>
      {/* Mock page body */}
      <Box style={{ padding: 16, minHeight: 120 }}>
        <Text size="1" style={{ color: "var(--ds-text-weak)" }}>Tap the menu to slide the navigation drawer in.</Text>
      </Box>

      <MobileNav
        id={drawerId}
        side={side}
        open={open}
        onOpenChange={setOpen}
        header={<Text size="3" weight="bold" style={{ color: "var(--ds-text-strong)" }}>Menu</Text>}
      >
        <NavBody />
      </MobileNav>
    </Box>
  );
}

/* ---- token spec: the drawer's own paint, measured -------------------------- */
/* Every part a MobileNav paints lives INSIDE the open drawer, and an open drawer cannot be LEFT on this
   page to be read: it is a modal, so its overlay locks body scroll and its content aria-hides every
   sibling — this docs page would stop scrolling. So the measurement host opens a real drawer, holds it
   only until the three rows below have read it (they join a barrier; the host cannot take it down until
   all of them have released), and then unmounts it. The drawer portals to the document body rather than
   into the host, so the host adopts what it created and hides it in the same commit — it never paints. */
function MobileNavTokens() {
  return (
    <Box style={{ borderRadius: "var(--ds-radius-4)", border: "1px solid var(--ds-stroke-weak)", overflow: "hidden", background: "var(--ds-bg-subtle)" }}>
      <Flex direction="column" gap="2" style={{ padding: "20px" }}>
        <Text size="1" style={{ color: "var(--ds-text-weak)" }}>
          The drawer paints from existing <Mono>--ds-*</Mono> roles — <strong>no new tokens</strong>. The
          panel is the opaque overlay surface (so nav rows never bleed through the content behind); the
          backdrop is the modal scrim; the header divider is the weak hairline. All three exist only while
          the drawer is open, so a real drawer is opened off-screen for the few frames the reading takes
          and closed again — the rows report what the drawer paints, not what the tokens say.
        </Text>
      </Flex>
      <MeasuredSpec
        transient
        render={() => (
          <MobileNav
            open
            onOpenChange={() => {}}
            label="Drawer paint measurement"
            header={<Text size="3" weight="bold" style={{ color: "var(--ds-text-strong)" }}>Menu</Text>}
          >
            <NavBody />
          </MobileNav>
        )}
      >
        <MeasuredRow
          part="Panel surface (opaque)"
          note="The edge-pinned sheet — opaque, so nav rows never bleed through the page behind."
          token="--ds-bg-overlay"
          select=".rt-ds-mobilenav"
          prop="background-color"
        />
        <MeasuredRow
          part="Backdrop scrim"
          note="Dims and blocks the page behind the drawer; Radix paints it on the overlay's ::before."
          token="--ds-scrim"
          select=".rt-BaseDialogOverlay:has(.rt-ds-mobilenav)"
          prop="background-color"
          pseudo="::before"
        />
        <MeasuredRow
          part="Header divider"
          note="The hairline under the drawer's pinned header slot."
          token="--ds-stroke-weak"
          select=".rt-ds-mobilenav-header"
          prop="border-bottom-color"
        />
      </MeasuredSpec>
    </Box>
  );
}

/* ---- Properties ---------------------------------------------------------- */
const MOBILENAV_PROPS: PropDef[] = [
  { name: "side", type: `"start" | "end" | "auto"`, def: `"auto"`, desc: <>Which edge the drawer slides from. <Code>"auto"</Code> reads the trigger's position at open and opens from the nearest edge.</>, source: "MobileNav.tsx" },
  { name: "width", type: "number", def: "320", desc: <>Drawer width in px. The rendered width is honestly <Code>min(100vw, width)</Code> — never wider than the viewport.</>, source: "MobileNav.tsx" },
  { name: "header", type: "ReactNode", desc: <>Optional slot pinned above the scrollable nav body (a title, brand, or close affordance).</>, source: "MobileNav.tsx" },
  { name: "open", type: "boolean", desc: <>Controlled open state (standalone use). Ignored when an AppShell owns the drawer state.</>, source: "MobileNav.tsx" },
  { name: "onOpenChange", type: "(open) => void", desc: <>Fires on open/close — Escape, backdrop click, or a toggle all route through it.</>, source: "MobileNav.tsx" },
  { name: "id", type: "string", desc: <>Pin the panel id so a standalone <Code>MobileNavToggle</Code>'s <Code>aria-controls</Code> can point at it.</>, source: "MobileNav.tsx" },
  { name: "label", type: "string", def: `"Navigation"`, desc: <>Accessible name for the drawer dialog.</>, source: "MobileNav.tsx" },
  { name: "children", type: "ReactNode", desc: <>The drawer contents — typically the nav rendered in its mobile/drawer regime.</>, source: "MobileNav.tsx" },
];

const TOGGLE_PROPS: PropDef[] = [
  { name: "open", type: "boolean", desc: <>Explicit open state (standalone). Falls back to the AppShell drawer state.</>, source: "MobileNav.tsx" },
  { name: "onToggle", type: "(open) => void", desc: <>Explicit toggle handler (standalone). Falls back to AppShell's <Code>setOpen</Code>.</>, source: "MobileNav.tsx" },
  { name: "drawerId", type: "string", desc: <>id of the controlled drawer — drives <Code>aria-controls</Code>. Falls back to AppShell's <Code>drawerId</Code>.</>, source: "MobileNav.tsx" },
  { name: "label", type: "string", desc: <>Accessible name. Defaults to "Open/Close navigation menu", tracking the open state.</>, source: "MobileNav.tsx" },
  { name: "…IconButtonProps", type: "IconButtonProps", desc: <>Everything the System <Code>IconButton</Code> accepts (<Code>priority</Code>, <Code>size</Code>, …). Defaults to <Code>tertiary</Code>.</>, source: "IconButton.tsx" },
];

/* ========================================================================== */
/** The one definition of this component — the standfirst every page of it opens with. */
const DEFINITION = <>A slide-in navigation drawer for mobile breakpoints. The hamburger toggle opens it; it slides from the edge nearest the trigger, traps focus, and dims the page behind a scrim.</>;

const meta: Meta<typeof MobileNav> = {
  title: "Components/Navigation/MobileNav",
  component: MobileNav,
  parameters: {
    controls: { disable: true },
    docs: {
      description: {
        component:
          "**MobileNav** is a slide-in navigation drawer for mobile breakpoints, with its hamburger " +
          "**MobileNavToggle**. It's built on the **raw Radix Themes `Dialog`** (the CommandPalette / Lightbox " +
          "precedent), so focus-trap, Escape, scroll-lock, and backdrop-dismiss come for free — the panel is " +
          "just repositioned to pin to a viewport edge and slide in on the modal motion tier. `side=\"auto\"` " +
          "opens from the edge nearest the trigger; the width is honestly `min(100vw, width)`. It reads the " +
          "AppShell drawer state via `useAppShellMobile()` (or manages its own), and the toggle drives " +
          "`aria-expanded` + `aria-controls`. Zero net-new tokens.",
      },
    },
  },
};
export default meta;
type Story = StoryObj<typeof MobileNav>;

/** Usage — the primary lite docs story: a working specimen, the live token spec, and one do/don't. */
export const Usage: Story = {
  // The DO/DON'T word (success/error step-11 ink on its own tint) measures 4.10 at 12px bold, under axe's
  // 4.5; the colour + the word already carry the meaning, so that row is the documented exception. Scoped
  // to the label itself — the cards' specimens stay fully axe-checked, which "[data-dodont]" did not do.
  parameters: { a11y: { context: { exclude: [DODONT_LABEL] } } },
  render: (_args, { globals }) => (
    // The drawer's nav rows route through DemoLink so opening the drawer and tapping a row never
    // navigates the Storybook iframe away — focus-trap, aria-current, and the slide motion stay intact.
    <LinkProvider component={DemoLink}>
      <HexThemeKey.Provider value={`${globals.accent}-${globals.appearance}-${globals.contrast}`}>
      <Page>
        <PageHeader title="MobileNav · Usage" standfirst={DEFINITION} />

        <Section title="Specimen" lead="A phone-sized frame with a live toggle in the top bar. Tap the menu to slide the real drawer in from the edge — it opens over the whole page (as it would on a device), then Escape, the backdrop, or the toggle dismiss it.">
          <PhoneFrame side="start" testid="mn-overview" />
          <Caption>The drawer is a modal: it traps focus and locks page scroll while open, and initial focus lands on the panel.</Caption>
        </Section>

        <Rule />

        <Section title="A wayfinding surface, not a second screen" lead="A drawer is for primary navigation on small screens — a short list of destinations. It is not a place to relocate a whole app.">
          <Grid columns={{ initial: "1", sm: "2" }} gap="3">
            <DoDont kind="do" bare note="Do put primary navigation destinations in the drawer — a short, scannable list of links, one tap from the top bar.">
              <Box style={{ background: "var(--ds-bg-base)", border: "1px solid var(--ds-stroke-weak)", borderRadius: "var(--ds-radius-3)", padding: 12 }}>
                <NavBody />
              </Box>
            </DoDont>
            <DoDont kind="dont" bare note="Don't cram a whole app — forms, dense tables, settings panels — into the drawer. It's a wayfinding surface, not a second screen; deep tasks belong on their own route.">
              <Box style={{ background: "var(--ds-bg-base)", border: "1px solid var(--ds-stroke-weak)", borderRadius: "var(--ds-radius-3)", padding: 12 }}>
                <Flex direction="column" gap="2">
                  <Box style={{ height: 12, borderRadius: "var(--ds-radius-2)", background: "var(--ds-fill-weak)" }} />
                  <Box style={{ height: 40, borderRadius: "var(--ds-radius-2)", background: "var(--ds-fill-weak)" }} />
                  <Box style={{ height: 12, width: "60%", borderRadius: "var(--ds-radius-2)", background: "var(--ds-fill-weak)" }} />
                  <Box style={{ height: 40, borderRadius: "var(--ds-radius-2)", background: "var(--ds-fill-weak)" }} />
                </Flex>
              </Box>
            </DoDont>
          </Grid>
        </Section>

        <Rule />

        <Section title="Tokens" lead="The drawer paints from existing --ds-* roles. Each row names the element and the property that paints its part — and, since every one of them lives inside the open drawer, says plainly that this page cannot read it rather than resolving the token it names.">
          <MobileNavTokens />
        </Section>
      </Page>
      </HexThemeKey.Provider>
    </LinkProvider>
  ),
  play: async ({ canvasElement }) => {
    // The token table's EVIDENCE, asserted at runtime — all three parts live inside a real drawer that
    // was opened, read and closed again. `awaitMeasuredRows` waits for every row to record its evidence
    // AND for that mount cycle to have closed, so everything below sees the page whole again.
    const rows = await awaitMeasuredRows(canvasElement);
    if (rows.measured !== 3 || rows.unproven !== 0) {
      throw new Error(`expected 3 measured / 0 unproven token rows, got ${rows.measured} / ${rows.unproven}`);
    }
    // The page survived the read: a modal drawer locks body scroll and aria-hides every sibling while
    // it is up, so the teardown is asserted rather than assumed.
    if (document.body.hasAttribute("data-scroll-locked")) {
      throw new Error("body is still scroll-locked after the measurement cycle — the drawer never closed");
    }
    const stillHidden = Array.from(document.body.children).filter((n) => n.hasAttribute("aria-hidden")).length;
    if (stillHidden) throw new Error(`${stillHidden} body children are still aria-hidden after the measurement cycle`);

    // Passive (no driving / no flash): the drawer opens over the whole page, so opening is exercised in
    // _internal, not here. Assert the toggle renders closed with its ARIA wiring; axe runs automatically.
    const toggle = canvasElement.querySelector<HTMLButtonElement>('[data-testid="mn-overview"] button[aria-controls]');
    if (!toggle) throw new Error("Usage must render a MobileNavToggle with aria-controls");
    if (toggle.getAttribute("aria-expanded") !== "false")
      throw new Error(`the toggle must start collapsed (aria-expanded=false); got ${toggle.getAttribute("aria-expanded")}`);
    // The drawer is unmounted while closed → nothing flashes on view.
    if (document.querySelector(".rt-ds-mobilenav")) throw new Error("the drawer must stay closed on view (no on-view flash)");
  },
};

/* ---- Props ---------------------------------------------------------- */
type PropsArgs = { side: MobileNavSide; width: number };

function PropsDemo({ side, width }: PropsArgs) {
  const [open, setOpen] = useState(false);
  const drawerId = useId();
  return (
    <Flex align="center" gap="3">
      <MobileNavToggle open={open} onToggle={setOpen} drawerId={drawerId} data-testid="pg-toggle" />
      <Text size="2" style={{ color: "var(--ds-text-weak)" }}>Open the drawer ({side})</Text>
      <MobileNav
        id={drawerId}
        side={side}
        width={width}
        open={open}
        onOpenChange={setOpen}
        header={<Text size="3" weight="bold" style={{ color: "var(--ds-text-strong)" }}>Menu</Text>}
      >
        <NavBody />
        <Box mt="2" px="2">
          <Item role="link" startContent={<SignOut />} label="Sign out" />
        </Box>
      </MobileNav>
    </Flex>
  );
}

/** Props — the live, args-driven drawer. Drive the edge and width, then open it. */
export const Props: StoryObj<PropsArgs> = {
  args: { side: "auto", width: 320 },
  argTypes: {
    side: { control: "inline-radio", options: ["start", "end", "auto"], description: "Which edge the drawer slides from; auto picks the edge nearest the trigger.", table: { category: "Variant" } },
    width: { control: { type: "number", min: 200, max: 480, step: 20 }, description: "Drawer width in px (rendered as min(100vw, width)).", table: { category: "Layout" } },
  },
  parameters: { controls: { disable: false } },
  render: (args: PropsArgs) => (
    <LinkProvider component={DemoLink}>
    <Page maxWidth="none">
      <PageHeader
        title="MobileNav · Props"
        standfirst={<>{DEFINITION} Open the drawer below — Escape, the backdrop, or the toggle dismiss it.</>}
      />
      <PropsDemo {...args} />
      <PropsLead />
      <Rule />
      <Section title="MobileNav props" lead={<>Every prop the drawer accepts.</>}>
        <PropTable rows={MOBILENAV_PROPS} />
      </Section>
      <Section title="MobileNavToggle props" lead={<>The hamburger button — a System <Code>IconButton</Code> that drives <Code>aria-expanded</Code> / <Code>aria-controls</Code>.</>}>
        <PropTable rows={TOGGLE_PROPS} />
      </Section>
    </Page>
    </LinkProvider>
  ),
};

/** History — the rulings this component encodes and a changelog of how it changes over time. */
export const History: Story = {
  render: () => (
    <Page>
      <PageHeader title="MobileNav · History" standfirst={DEFINITION} />
      <Section title="Decisions" lead="The rulings this component encodes.">
        <Flex direction="column" gap="3">
          <Decision id="[[mobile-nav]] · raw Dialog shell">
            The drawer is built on the <strong>raw Radix Themes <Code>Dialog</Code></strong> (there's no
            System <Code>Dialog</Code> wrapper, so it composes the raw primitive directly, like{" "}
            <Code>CommandPalette</Code> / <Code>Lightbox</Code>). Radix owns the{" "}
            <strong>focus-trap + Escape + scroll-lock + backdrop-dismiss</strong>. The centered modal is
            repositioned to <strong>pin to a viewport edge</strong> at full height.
          </Decision>
          <Decision id="[[mobile-nav]] · side=auto heuristic">
            With <Code>side="auto"</Code> (the default) the drawer reads the <strong>trigger's position</strong>{" "}
            at open (<Code>document.activeElement</Code>'s rect — the trigger still holds focus when{" "}
            <Code>onOpenAutoFocus</Code> fires): a trigger on the left half opens from the start edge, the right
            half from the end edge. There is no Radix analog for this — the edge-picking heuristic is our own.
          </Decision>
          <Decision id="[[mobile-nav]] · aria upgrades">
            <strong>Deliberate a11y upgrades:</strong> <Code>MobileNavToggle</Code> carries{" "}
            <Code>aria-expanded</Code> + <Code>aria-controls</Code>, and initial focus
            lands on the <strong>drawer panel</strong> (<Code>onOpenAutoFocus</Code> + <Code>preventDefault</Code>)
            so a screen-reader user starts inside the nav, not on a stray control.
          </Decision>
          <Decision id="[[mobile-nav]] · honest width">
            The width is honestly <Code>min(100vw, width)</Code> — the drawer never exceeds the viewport, and
            never claims a fixed cap it doesn't enforce.
          </Decision>
          <Decision id="Motion · modal tier">
            The drawer slides on the <strong>modal</strong> motion tier, and it <strong>arrives faster than it
            leaves</strong> (enter <Code>--ds-duration-moderate</Code> 180ms / <Code>--ds-ease-entry</Code>, exit
            the longer <Code>--ds-duration-expressive</Code> 320ms / <Code>--ds-ease-standard</Code>) — an edge
            slide, not the centered dialog's scale+fade. A drawer covers the screen, so it withdraws on a
            decelerating curve slow enough to read as leaving rather than being cut. Reduced motion collapses the
            slide to an instant swap through the duration tokens.
          </Decision>
          <Decision id="State · AppShell or standalone">
            When an <Code>AppShell</Code> is present, it owns the open state machine and MobileNav reads it via{" "}
            <Code>useAppShellMobile()</Code> (the panel carries <Code>id={"{drawerId}"}</Code> so the toggle's{" "}
            <Code>aria-controls</Code> resolves). Standalone, MobileNav is controlled (<Code>open</Code> /{" "}
            <Code>onOpenChange</Code>) or uncontrolled.
          </Decision>
        </Flex>
      </Section>

      <Rule />

      <Section title="Changelog" lead="Notable changes, newest first — grows as the component evolves.">
        <Flex direction="column" gap="3">
          <Decision id="0.9.0">
            Initial <Code>System/Navigation/MobileNav</Code> — the slide-in drawer + <Code>MobileNavToggle</Code>{" "}
            on the raw Radix Dialog; edge-pinned full-height panel with the emphasis-tier slide motion; the{" "}
            <Code>side="auto"</Code> trigger-position heuristic; honest <Code>min(100vw, width)</Code> width; the{" "}
            <Code>aria-expanded</Code> / <Code>aria-controls</Code> toggle upgrade and panel-focus on open; the{" "}
            <Code>useAppShellMobile()</Code> state seam with a standalone controlled/uncontrolled fallback; painted
            from <Code>--ds-bg-overlay</Code> / <Code>--ds-scrim</Code> with no new tokens.
          </Decision>
        </Flex>
      </Section>
    </Page>
  ),
};
