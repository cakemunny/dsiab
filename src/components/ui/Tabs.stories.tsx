import type { Meta, StoryObj } from "@storybook/react-vite";
import { Box, Code, Flex, Grid, Text } from "@radix-ui/themes";
import { Tabs } from "./Tabs";
import { LinkProvider } from "./Link";
import {
  Caption, DemoLink, Decision, DoDont, DODONT_LABEL, HexThemeKey, type KeyBinding, KeyRow, LiteTokenSpec,
  MeasuredRow, MeasuredSpec, Mono, Page, PageHeader, PropsLead, type PropDef, PropTable, Rule, Section,
} from "./_storyKit";
import { awaitMeasuredRows } from "../../foundations/_assert";
import { ComparisonSection, NAV_SURFACES_COMPARISON } from "./_comparisons";

/** The component's definition — one source, referenced by the header of every story on this page. */
const DEFINITION = <>Two surfaces under one name. <Mono>Panel</Mono> tabs switch the <em>view</em> of one screen in place; <Mono>Nav</Mono> tabs <em>navigate</em> to routes. Reach for the one that matches whether the content changes in place or the URL does.</>;

/* Tabs — the DUAL-surface docs. Two components under one name: PANEL tabs (Root/List/Trigger/Content)
   switch a view of one screen in place; NAV tabs (Nav.Root/Nav.Link) navigate to routes. The stories
   teach WHICH to reach for. Lite-ish spine: History · Usage (specimen + tokens + usage) · Keyboard ·
   Props. The skin is reused from Radix's tab primitives, so Tabs owns no --ds-* roles — its Tokens
   section is the tokenless (lite) shape: the rendered tablist's own paint, measured off a real tablist
   and checked against the system role each value claims. */

const labelCap: React.CSSProperties = { color: "var(--ds-text-weak)", letterSpacing: "0.06em" };

/* The token spec. Tabs declares no --ds-* roles, so — like ScrollArea — the spec can't be dropped or
   hand-typed: every row is MEASURED off a real tablist rendered into the measurement host, naming the
   element and the property that paints the part (the active trigger's ::before underline, and each
   label's colour) and checking it against the token it claims. So a row can DISAGREE with the component,
   which is what makes the table evidence rather than a restatement of the tokens. */
function TabsSkinSpec() {
  return (
    <LiteTokenSpec
      rationale={
        <>
          Tabs reuses Radix's own tab skin and declares no <Mono>--ds-*</Mono> roles of its own — so the
          three values that carry “which tab am I on” are read off a rendered tablist. The active
          underline is Radix's <Mono>--accent-indicator</Mono>, the shade every part without text paints,
          so the selection is accent-aware and follows the brand shift with no override. The labels split
          on the neutral ramp: the active tab
          rises to <Mono>--ds-text-strong</Mono> while the rest sit on <Mono>--gray-a11</Mono>, the alpha
          sibling of the <Mono>--gray-11</Mono> that <Mono>--ds-text-weak</Mono> aliases. Nav tabs paint
          from the same three.
        </>
      }
    >
      {/* A real tablist with one active and one inactive trigger. Both panels are forceMount-ed even
          though nothing shows: a Trigger's aria-controls points at its panel's id, and an unmounted
          panel leaves that reference dangling (axe's aria-valid-attr-value). */}
      <MeasuredSpec
        render={() => (
          <Tabs.Root defaultValue="a">
            <Tabs.List aria-label="Tab paint measurement">
              <Tabs.Trigger value="a">Active</Tabs.Trigger>
              <Tabs.Trigger value="b">Inactive</Tabs.Trigger>
            </Tabs.List>
            <Tabs.Content value="a" forceMount />
            <Tabs.Content value="b" forceMount />
          </Tabs.Root>
        )}
      >
        <MeasuredRow
          part="Active tab underline"
          note="Radix draws it on the trigger's ::before, so it never affects the row's layout."
          token="--accent-indicator"
          select='[role="tab"][data-state="active"]'
          prop="background-color"
          pseudo="::before"
        />
        <MeasuredRow
          part="Active tab label"
          note="Rises off the neutral ramp — the underline is not the only cue."
          token="--ds-text-strong"
          select='[role="tab"][data-state="active"]'
          prop="color"
        />
        <MeasuredRow
          part="Inactive tab label"
          note="The alpha sibling of the step --ds-text-weak aliases."
          token="--gray-a11"
          select='[role="tab"][data-state="inactive"]'
          prop="color"
        />
      </MeasuredSpec>
    </LiteTokenSpec>
  );
}

/* ---- the panel-tabs specimen: three peer views of ONE project screen -------- */
function ProjectPanels() {
  return (
    <Tabs.Root defaultValue="overview" data-testid="panel-tabs">
      <Tabs.List aria-label="Project sections">
        <Tabs.Trigger value="overview">Overview</Tabs.Trigger>
        <Tabs.Trigger value="activity">Activity</Tabs.Trigger>
        <Tabs.Trigger value="settings">Settings</Tabs.Trigger>
      </Tabs.List>
      <Box style={{ maxWidth: 520 }}>
        <Tabs.Content value="overview">
          <Text as="p" size="2" style={{ color: "var(--ds-text-strong)", lineHeight: 1.6 }}>
            <Text weight="medium">Orbit</Text> is on track — 12 of 18 issues closed this sprint, next
            milestone in 6 days. The health, burndown, and owners live on this view.
          </Text>
        </Tabs.Content>
        <Tabs.Content value="activity">
          <Flex direction="column" gap="2">
            <Text size="2" style={{ color: "var(--ds-text-strong)" }}>Dana moved <Text weight="medium">API rate limits</Text> to In review.</Text>
            <Text size="2" style={{ color: "var(--ds-text-strong)" }}>Priya opened <Text weight="medium">Flaky auth test</Text>.</Text>
            <Text size="2" style={{ color: "var(--ds-text-weak)" }}>3 more events today.</Text>
          </Flex>
        </Tabs.Content>
        <Tabs.Content value="settings">
          <Flex direction="column" gap="2">
            <Flex justify="between" gap="4"><Text size="2" style={{ color: "var(--ds-text-weak)" }}>Visibility</Text><Text size="2" weight="medium">Private</Text></Flex>
            <Flex justify="between" gap="4"><Text size="2" style={{ color: "var(--ds-text-weak)" }}>Default branch</Text><Text size="2" weight="medium">main</Text></Flex>
          </Flex>
        </Tabs.Content>
      </Box>
    </Tabs.Root>
  );
}

/* ---- the nav-tabs specimen: link tabs that NAVIGATE (muted by DemoLink) ------ */
function AccountNav() {
  return (
    <LinkProvider component={DemoLink}>
      <Tabs.Nav aria-label="Account settings" data-testid="nav-tabs">
        <Tabs.Nav.Link href="/settings/profile" active>Profile</Tabs.Nav.Link>
        <Tabs.Nav.Link href="/settings/billing">Billing</Tabs.Nav.Link>
        <Tabs.Nav.Link href="/settings/members">Members</Tabs.Nav.Link>
        <Tabs.Nav.Link href="/settings/api">API keys</Tabs.Nav.Link>
      </Tabs.Nav>
    </LinkProvider>
  );
}

const meta: Meta<typeof Tabs.Root> = {
  title: "Components/Container/Tabs",
  component: Tabs.Root,
  parameters: {
    controls: { disable: true },
    docs: {
      description: {
        component:
          "**Tabs** is a DUAL surface under one name. **Panel tabs** (`Root`/`List`/`Trigger`/`Content`) " +
          "switch a **view** of one screen in place — the content below the tablist changes, nothing " +
          "navigates. **Nav tabs** (`Nav`/`Nav.Link`) are link tabs that **navigate** to routes, each " +
          "routed through the app's framework Link and the active one carrying `aria-current=\"page\"`. Both " +
          "wrap Radix Themes' tab primitives and reuse their skin (no `--ds-*` roles). Because Radix's tab " +
          "lists accept only `size` `1`|`2`, the tab **box** is a documented **two-size lane**: small & " +
          "medium → `1`, large → `2` — 32 / 32 / 40px. The **type** is ours and rides the ordinary text " +
          "lane — 12 / 14 / 16px — so a tab row matches the control row beside it on height *and* on " +
          "label size at medium and at large.",
      },
    },
  },
};
export default meta;
type Story = StoryObj<typeof Tabs.Root>;

/** Usage — the primary docs story: both surfaces side by side, then the do/don't that teaches WHICH. */
export const Usage: Story = {
  // Only the DO/DON'T word is exempt (step-11 ink on its own tint, 4.10 at 12px bold) — the specimens
  // inside the cards stay fully axe-checked. The old "[data-dodont]" carve-out covered the whole card,
  // and was covering a critical aria-valid-attr-value on both tablists; those now forceMount their
  // panels instead of being excused.
  parameters: { a11y: { context: { exclude: [DODONT_LABEL] } } },
  render: (_args, { globals }) => (
    <HexThemeKey.Provider value={`${globals.accent}-${globals.appearance}-${globals.contrast}`}>
      <Page>
        <PageHeader title="Tabs · Usage" standfirst={DEFINITION} />

        <Section title="Specimen" lead="Left, panel tabs switch three peer views of one project screen — the content below changes in place, nothing navigates. Right, nav tabs are links that navigate to routes; the active one carries aria-current.">
          <Grid columns={{ initial: "1", md: "2" }} gapX="7" gapY="6" align="start">
            <Flex direction="column" gap="2" align="start">
              <Text size="1" weight="bold" style={labelCap}>PANEL TABS · switch a view in place</Text>
              <ProjectPanels />
            </Flex>
            <Flex direction="column" gap="2" align="start">
              <Text size="1" weight="bold" style={labelCap}>NAV TABS · navigate to routes</Text>
              <AccountNav />
              <Caption>Each tab is a real link routed through the app's framework Link; the active one carries <Code>aria-current="page"</Code>. (Navigation is muted here so the docs iframe stays put.)</Caption>
            </Flex>
          </Grid>
          <Caption>
            <strong>Which one?</strong> If the content swaps <em>in place</em> and nothing navigates, use{" "}
            <strong>panel</strong> tabs. If each tab is a URL the user can bookmark or land on directly, use{" "}
            <strong>nav</strong> tabs.
          </Caption>
        </Section>

        <Rule />

        <Section title="A view, not a value" lead="Tabs switch the VIEW of one screen among peer panels. To pick a VALUE inline (a setting, a mode, a filter), that's a SegmentedControl.">
          <Grid columns={{ initial: "1", sm: "2" }} gap="3">
            <DoDont kind="do" bare note="Switch the VIEW of one screen among peer panels — Overview / Activity / Settings are three views of the same project, and the content below the tablist changes in place.">
              <Flex direction="column" gap="2" align="start" width="100%">
                <Text size="1" weight="bold" style={labelCap}>PROJECT</Text>
                <Tabs.Root defaultValue="overview">
                  <Tabs.List aria-label="Project view (do)">
                    <Tabs.Trigger value="overview">Overview</Tabs.Trigger>
                    <Tabs.Trigger value="activity">Activity</Tabs.Trigger>
                    <Tabs.Trigger value="settings">Settings</Tabs.Trigger>
                  </Tabs.List>
                  {/* The card shows the tablist only, but each Trigger's aria-controls still points at its
                      panel's id — an unmounted panel leaves that reference dangling (aria-valid-attr-value,
                      critical). forceMount keeps the empty panels in the DOM, same fix as the paint probe. */}
                  <Tabs.Content value="overview" forceMount />
                  <Tabs.Content value="activity" forceMount />
                  <Tabs.Content value="settings" forceMount />
                </Tabs.Root>
              </Flex>
            </DoDont>
            <DoDont kind="dont" bare note="Don't use tabs to pick a VALUE (a setting, a mode, a filter) — that's a SegmentedControl, at System/Choice/SegmentedControl. Tabs swap what's on screen; USD / EUR / GBP is a currency setting, not a peer view.">
              <Flex direction="column" gap="2" align="start" width="100%">
                <Text size="1" weight="bold" style={labelCap}>CURRENCY</Text>
                <Tabs.Root defaultValue="usd">
                  <Tabs.List aria-label="Currency (anti-pattern)">
                    <Tabs.Trigger value="usd">USD</Tabs.Trigger>
                    <Tabs.Trigger value="eur">EUR</Tabs.Trigger>
                    <Tabs.Trigger value="gbp">GBP</Tabs.Trigger>
                  </Tabs.List>
                  {/* Same forceMount reason as the DO card. The anti-pattern being taught here is using
                      tabs to pick a value — dangling aria-controls is not part of the lesson. */}
                  <Tabs.Content value="usd" forceMount />
                  <Tabs.Content value="eur" forceMount />
                  <Tabs.Content value="gbp" forceMount />
                </Tabs.Root>
              </Flex>
            </DoDont>
          </Grid>
          <Caption>
            The reciprocal of the SegmentedControl guidance — a SegmentedControl switches a value in place,
            Tabs switch the view. See <Code>System/Choice/SegmentedControl</Code>.
          </Caption>
        </Section>

        <Rule />

        <ComparisonSection comparison={NAV_SURFACES_COMPARISON} highlight="Tabs" />

        <Rule />

        <Section title="Tokens" lead="Measured off a rendered tablist — Tabs reuses Radix's tab skin, so it owns no --ds-* roles, and each row checks what a trigger paints against the system role it claims.">
          <TabsSkinSpec />
        </Section>
      </Page>
    </HexThemeKey.Provider>
  ),
  play: async ({ canvasElement }) => {
    // The token table's EVIDENCE, asserted at runtime — every row read a REAL rendered trigger.
    // `awaitMeasuredRows` blocks until every row has recorded its evidence (a row whose element
    // mounts late retries for up to 60 frames before it reports), then runs the identical assertions.
    const rows = await awaitMeasuredRows(canvasElement);
    if (rows.measured !== 3 || rows.unproven !== 0) {
      throw new Error(`expected 3 measured / 0 unproven token rows, got ${rows.measured} / ${rows.unproven}`);
    }

    // Passive (no driving / no flash): assert the rendered specimen's selection contract in place.
    const panel = canvasElement.querySelector<HTMLElement>('[data-testid="panel-tabs"]');
    if (!panel) throw new Error("Usage must render the panel-tabs specimen");
    const tabs = [...panel.querySelectorAll<HTMLElement>('[role="tab"]')];
    if (tabs.length !== 3) throw new Error(`panel tabs must render 3 triggers; got ${tabs.length}`);
    const selected = tabs.filter((t) => t.getAttribute("aria-selected") === "true");
    if (selected.length !== 1) throw new Error(`exactly one panel tab must be selected; got ${selected.length}`);
    const activeLabel = selected[0].querySelector(".rt-TabsTriggerInner")?.textContent?.trim();
    if (activeLabel !== "Overview") throw new Error(`the specimen must default to the Overview panel; got "${activeLabel}"`);

    // The nav specimen marks exactly one link as the current route.
    const nav = canvasElement.querySelector<HTMLElement>('[data-testid="nav-tabs"]');
    if (!nav) throw new Error("Usage must render the nav-tabs specimen");
    const current = nav.querySelectorAll<HTMLAnchorElement>('a[aria-current="page"]');
    if (current.length !== 1) throw new Error(`exactly one nav tab must be aria-current="page"; got ${current.length}`);
  },
};

/* ---- Keyboard contract (roving focus from Radix, what opens a tab from the wrap, [[tabs-open-on-navigation]]) ------------ */
const TAB_KEYS: KeyBinding[] = [
  { keys: ["Tab"], action: <>Move focus <strong>into</strong> the tablist — a single tab stop. One Tab enters, one Tab leaves; the next Tab lands on the active panel.</>, src: "radix" },
  { keys: ["←", "→"], action: <>Move between tabs and open each one the arrow reaches (the roving tab stop). A vertical list steps on ↑ and ↓. Under RTL the arrows mirror, so a key always steps in its on-screen direction.</>, src: "system" },
  { keys: ["Home", "End"], action: "Jump to the first or last tab and open it.", src: "system" },
  { keys: ["PageUp", "PageDown"], action: "Jump to the first or last tab and open it, the same as Home and End.", src: "system" },
  { keys: ["Enter", "Space"], action: <>Open the focused tab. A nav tab follows its link.</>, src: "radix" },
];

/** Keyboard — the roving tab-stop contract: one Tab into the tablist, arrows between tabs, the panel one Tab away. */
export const Keyboard: Story = {
  render: () => (
    <Page maxWidth={900}>
      <PageHeader title="Tabs · Keyboard" standfirst={DEFINITION} />

      <Section
        title="Keyboard"
        lead={<>The tablist is a <strong>single tab stop</strong> with a roving focus: <Code>Tab</Code> moves into it, the arrows move between tabs, and one more <Code>Tab</Code> reaches the panel. This is the WAI-ARIA tabs pattern with automatic activation: an arrow key, <Code>Home</Code> or <Code>End</Code> opens the tab it reaches. A focus that no key moved leaves the open tab where it is, so a screen reader cursor that moves focus can read across the tabs. No VoiceOver run confirms this yet ([[tabs-open-on-navigation]]).</>}
      >
        <Flex direction="column" gap="2">
          <Box><ProjectPanels /></Box>
          <Caption>A live target — <Code>Tab</Code> into the tablist, then <Code>←</Code>/<Code>→</Code> to move; the panel below follows.</Caption>
        </Flex>
        <Box style={{ borderRadius: "var(--ds-radius-4)", border: "1px solid var(--ds-stroke-weak)", overflow: "hidden", background: "var(--ds-bg-subtle)" }}>
          {TAB_KEYS.map((b) => <KeyRow key={b.keys.join("+")} {...b} />)}
        </Box>
        <Caption>
          <strong>Nav tabs</strong> follow the same roving pattern — arrows move between links and the
          active one carries <Code>aria-current="page"</Code>, so a screen reader announces the current
          route.
        </Caption>
      </Section>
    </Page>
  ),
};

/* ---- Props ------------------------------------------------------------ */
const PROPS: PropDef[] = [
  { name: "size", type: `"1" | "2"`, def: `uiSize`, desc: <>The tablist's <strong>height</strong>, on both <Code>List</Code> and <Code>Nav</Code>. Unset, it follows the global <Code>uiSize</Code> <strong>clamped</strong> to the two-size tab lane (<Code>small/medium → 1</Code>, <Code>large → 2</Code> — 32 / 32 / 40px); an explicit step wins. The <strong>label size</strong> is not on this prop — it rides the text lane (12 / 14 / 16px) off the ambient tier.</>, source: "Tabs.tsx" },
  { name: "defaultValue / value", type: "string", desc: <>The active panel's <Code>value</Code> — uncontrolled (<Code>defaultValue</Code>) or controlled (<Code>value</Code> + <Code>onValueChange</Code>). Panel tabs only.</>, source: "Radix" },
  { name: "onValueChange", type: "(value: string) => void", desc: <>Fires with the newly-active panel's <Code>value</Code> when the user switches tabs.</>, source: "Radix" },
  { name: "Trigger / Content value", type: "string", desc: <>Pairs a <Code>Trigger</Code> to its <Code>Content</Code> panel — matching <Code>value</Code>s bind the tab to its view.</>, source: "Radix" },
  { name: "activationMode", type: `"automatic" | "manual"`, def: `"automatic"`, desc: <><Code>automatic</Code>: an arrow key, <Code>Home</Code>, <Code>End</Code>, <Code>PageUp</Code> or <Code>PageDown</Code> opens the tab it reaches. <Code>manual</Code>: those keys move focus only. In both modes <Code>Enter</Code>, <Code>Space</Code> or a click opens the focused tab, and a focus that no key moved opens nothing, so a screen reader cursor that moves focus does not switch the panel. One exception: <Code>Home</Code> or <Code>PageUp</Code> on the first tab, and <Code>End</Code> or <Code>PageDown</Code> on the last, move no focus, and a focus within 100ms after one of them still opens its tab. Radix's own automatic mode opens a tab on any focus, and this wrap does not.</>, source: "Tabs.tsx" },
  { name: "Nav.Link href", type: "string", desc: <>The route a nav tab navigates to — routed through the app's framework Link via <Code>useLinkComponent()</Code> (plain <Code>&lt;a&gt;</Code> with no provider).</>, source: "Tabs.tsx" },
  { name: "Nav.Link active", type: "boolean", def: "false", desc: <>Marks the current route — draws the active underline and sets <Code>aria-current="page"</Code>.</>, source: "Tabs.tsx" },
];

type PropsArgs = {
  size: "auto" | "1" | "2";
  defaultValue: "overview" | "activity" | "settings";
};

/** Props — the live, args-driven panel tabs. Drive the clamped size and the default panel. */
export const Props: StoryObj<PropsArgs> = {
  args: { size: "auto", defaultValue: "overview" },
  argTypes: {
    size: { control: "inline-radio", options: ["auto", "1", "2"], description: '"auto" tracks the global uiSize toolbar (unset → the control lane, clamped to 1|2); a step pins the tablist HEIGHT. The label size always rides the text lane off the ambient tier.', table: { category: "Variant" } },
    defaultValue: { control: "inline-radio", options: ["overview", "activity", "settings"], description: "The initially-active panel (uncontrolled).", table: { category: "Value" } },
  },
  parameters: { controls: { disable: false } },
  render: ({ size, defaultValue }: PropsArgs) => (
    <Page maxWidth="none">
      <PageHeader title="Tabs · Props" standfirst={DEFINITION} />
      <Box style={{ padding: "16px 0 8px" }}>
        {/* key on the args so changing defaultValue re-mounts the uncontrolled Root and reflects it */}
        <Tabs.Root key={`${size}-${defaultValue}`} defaultValue={defaultValue}>
          <Tabs.List size={size === "auto" ? undefined : size} aria-label="Project sections">
            <Tabs.Trigger value="overview">Overview</Tabs.Trigger>
            <Tabs.Trigger value="activity">Activity</Tabs.Trigger>
            <Tabs.Trigger value="settings">Settings</Tabs.Trigger>
          </Tabs.List>
          <Box style={{ maxWidth: 520 }}>
            <Tabs.Content value="overview"><Text size="2" style={{ color: "var(--ds-text-strong)" }}>Health, burndown, and owners for the current sprint.</Text></Tabs.Content>
            <Tabs.Content value="activity"><Text size="2" style={{ color: "var(--ds-text-strong)" }}>A running feed of recent changes on this project.</Text></Tabs.Content>
            <Tabs.Content value="settings"><Text size="2" style={{ color: "var(--ds-text-strong)" }}>Visibility, default branch, and other project settings.</Text></Tabs.Content>
          </Box>
        </Tabs.Root>
      </Box>
      <PropsLead />
      <Rule />
      <Section title="Props reference" lead={<>The props across the Tabs surfaces — <Code>size</Code> rides the clamped two-size <em>height</em> lane on the panel <Code>List</Code> and the <Code>Nav</Code> (the label size rides the text lane); the rest pass through to the Radix primitives.</>}>
        <PropTable rows={PROPS} />
      </Section>
    </Page>
  ),
};

/** History — the rulings this component encodes and a changelog of how it changes over time. */
export const History: Story = {
  render: () => (
    <Page>
      <PageHeader title="Tabs · History" standfirst={DEFINITION} />

      <Section title="Decisions" lead="The rulings this component encodes.">
        <Flex direction="column" gap="3">
          <Decision id="[[catalog-as-specification]] · Wrapped Radix component">
            Tabs is a <strong>wrapped</strong> Radix Themes component — the Radix name wins; built on the
            Radix substrate + our <Code>--ds-*</Code> layer, not a hand-rolled tablist.
          </Decision>
          <Decision id="Dual surface">
            <strong>One name, two surfaces.</strong> <Code>Root/List/Trigger/Content</Code> are{" "}
            <strong>panel</strong> tabs — peer views of one screen, content swapped <em>in place</em>.{" "}
            <Code>Nav</Code> (<Code>Nav.Root/Nav.Link</Code>) are <strong>link</strong> tabs that{" "}
            <em>navigate</em> to routes. Picking the wrong one is the classic tabs mistake; the Usage
            do/don't and the SegmentedControl cross-reference draw the line.
          </Decision>
          <Decision id="Two-size lane — for the BOX">
            Radix's tab lists accept <Code>size</Code> <Code>1</Code>|<Code>2</Code> only (default{" "}
            <Code>2</Code>), so the usual control lane's <Code>large → 3</Code> is out of range and would
            drop the size class. The tab <strong>box</strong> is therefore a{" "}
            <strong>documented two-size exception</strong>: it reads the global <Code>uiSize</Code> and
            clamps <Code>small/medium → 1</Code>, <Code>large → 2</Code> — an explicit <Code>size</Code>{" "}
            still wins. Applied on both the panel List and the Nav.
          </Decision>
          <Decision id="Where the two boxes land">
            The vendor's two tab steps are <strong>32px</strong> and <strong>40px</strong> — the two boxes
            the control lane resolves at <Code>medium</Code> and <Code>large</Code> (steps 2 and 3 of
            24 / 32 / 40). There is no 24px tab step, so <Code>small</Code> is pinned to the lowest box
            that exists, and two steps across three tiers leave one boundary silent whichever way they
            map. It falls on <strong>medium → large</strong>: the row measures <strong>32 / 32 / 40</strong>,
            so a tab row placed beside a control matches its height at medium (32) and at large (40), and
            steps where it steps.
          </Decision>
          <Decision id="The type is ours, not the vendor's">
            Radix welds the two knobs together: each tab size class sets <Code>--tab-height</Code>{" "}
            <em>and</em> the font size in one rule, and it pairs each tab box with a label{" "}
            <strong>one step below</strong> what the control lane pairs with that same box (12px where a
            32px control carries 14px; 14px where a 40px control carries 16px). Taking the box clamp
            would therefore have taken that pairing too — and because <Code>small</Code> and{" "}
            <Code>medium</Code> share the class <Code>1</Code>, both tiers would render{" "}
            <strong>12px</strong> labels, putting 12px tab labels beside 14px body text at medium.
            So only the box is the vendor's. The <strong>type rides the ordinary text lane</strong> —
            12 / 14 / 16px at small / medium / large — restated on{" "}
            <Code>.rt-ds-tablist-N</Code> in <Code>components.css</Code>. Measured landing:{" "}
            <strong>32px + 12px</strong>, <strong>32px + 14px</strong>, <strong>40px + 16px</strong> — the
            tab row equals the control row on <em>both</em> axes at medium and at large. An explicit{" "}
            <Code>size</Code> pins the box; the label stays on the text lane.
          </Decision>
          <Decision id="Roving tabindex">
            The <strong>roving tab stop</strong> comes from the Radix primitives: one Tab enters the tablist,
            arrow keys move focus between tabs, and the panel is one more Tab away. Which moves open a tab is
            the wrap's own, as [[tabs-open-on-navigation]] below records. The active-tab underline reuses Radix's own tab skin, so the
            wrap declares <strong>no <Code>--ds-*</Code> roles</strong>.
          </Decision>
          <Decision id="[[tabs-open-on-navigation]] · Only navigation opens a tab">
            Radix opens a tab on <strong>any</strong> focus, and VoiceOver moves focus as its cursor reads,
            so reading across the tab row opened every tab on the way (Radix #1047). The wrap runs Radix in
            manual mode and opens a tab on an <strong>arrow key, <Code>Home</Code>, <Code>End</Code>,{" "}
            <Code>PageUp</Code>, <Code>PageDown</Code>, <Code>Enter</Code>, <Code>Space</Code> or a
            click</strong>, including the click with no pointer
            press that VoiceOver sends. A focus that no key moved opens nothing, and{" "}
            <Code>activationMode="manual"</Code> keeps manual.
          </Decision>
          <Decision id="Nav routes">
            A nav tab routes through <Code>useLinkComponent()</Code>, so an app's framework Link (Next /
            React Router) handles the click; with no provider it falls back to a plain <Code>&lt;a&gt;</Code>.
            The active link carries <Code>aria-current="page"</Code> — the accessible “you are here”.
          </Decision>
        </Flex>
      </Section>

      <Rule />

      <Section title="Changelog" lead="Notable changes, newest first — grows as the component evolves.">
        <Flex direction="column" gap="3">
          <Decision id="0.9.0">
            <strong>The box and the label became two knobs.</strong> The row lands at{" "}
            <strong>32 / 32 / 40px</strong> boxes carrying <strong>12 / 14 / 16px</strong> labels across
            small / medium / large. The <strong>box</strong> rides the two-size tab lane at{" "}
            <Code>small/medium → 1 / large → 2</Code>, so each vendor step falls on the tier whose{" "}
            <em>control</em> box it equals. The <strong>label</strong> does not ride with it — Radix's
            own pairing would have stood 12px tab labels beside 14px body text at medium — so it takes
            the ordinary text lane instead. A tab row now equals the control row on <em>both</em> axes
            at medium and at large.
          </Decision>
          <Decision id="0.9.0">
            Initial <Code>System/Tabs</Code> — a dual-surface wrap of Radix's panel <Code>Tabs</Code> and
            link <Code>TabNav</Code>: panel tabs switch a view in place, nav tabs navigate through the
            framework Link with <Code>aria-current="page"</Code>. Clamped to the two-size tab lane; the tab
            skin reused tokenlessly; History page added so every component has one.
          </Decision>
        </Flex>
      </Section>
    </Page>
  ),
};
