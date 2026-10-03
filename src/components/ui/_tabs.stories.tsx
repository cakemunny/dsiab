import type { Meta, StoryObj } from "@storybook/react-vite";
import { Box, Text } from "@radix-ui/themes";
import { Tabs } from "./Tabs";
import { LinkProvider } from "./Link";
import { DemoLink } from "./_storyKit";
import { Provider } from "../../theme/Provider";

/* Test-only behavior for Tabs — kept OUT of the docs stories (System/Container/Tabs) so viewing a docs
   page never drives the roving focus / changes panels on view (Storybook runs a story's play on view —
   that flash belongs here, not in the docs). Underscore-prefixed file → guard-exempt, grouped under
   _internal. Four plays: (a) the panel roving contract; (b) only navigation opens a tab ([[tabs-open-on-navigation]]); (c) the
   nav aria-current contract; (d) the box and type ladders, both surfaces, all three tiers. */

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
async function waitFor<T>(fn: () => T | null | undefined | false, timeout = 1500): Promise<T> {
  const t0 = performance.now();
  for (;;) {
    const r = fn();
    if (r) return r as T;
    if (performance.now() - t0 > timeout) throw new Error("waitFor: timed out");
    await sleep(20);
  }
}

const meta: Meta<typeof Tabs.Root> = {
  title: "_internal/Tabs behavior",
  component: Tabs.Root,
  parameters: { controls: { disable: true } },
};
export default meta;
type Story = StoryObj<typeof Tabs.Root>;

/** Panel roving: focusing a Trigger and pressing ArrowRight moves the active/focused tab and swaps the
 *  shown Content (automatic activation, a single roving tab stop). */
export const Roving: Story = {
  render: () => (
    <Box p="5" data-testid="roving">
      <Tabs.Root defaultValue="overview">
        <Tabs.List aria-label="Project sections">
          <Tabs.Trigger value="overview">Overview</Tabs.Trigger>
          <Tabs.Trigger value="activity">Activity</Tabs.Trigger>
          <Tabs.Trigger value="settings">Settings</Tabs.Trigger>
        </Tabs.List>
        <Tabs.Content value="overview"><Text size="2">OVERVIEW PANEL</Text></Tabs.Content>
        <Tabs.Content value="activity"><Text size="2">ACTIVITY PANEL</Text></Tabs.Content>
        <Tabs.Content value="settings"><Text size="2">SETTINGS PANEL</Text></Tabs.Content>
      </Tabs.Root>
    </Box>
  ),
  play: async ({ canvasElement }) => {
    const scope = canvasElement.querySelector<HTMLElement>('[data-testid="roving"]');
    if (!scope) throw new Error("missing roving specimen");
    const tabs = [...scope.querySelectorAll<HTMLElement>('[role="tab"]')];
    if (tabs.length !== 3) throw new Error(`expected 3 tabs; got ${tabs.length}`);

    // Rest state: the first tab is selected and the Overview panel is the visible one. (Radix keeps all
    // tabpanel divs mounted; the inactive ones are hidden + emptied, so target the active panel.)
    if (tabs[0].getAttribute("aria-selected") !== "true")
      throw new Error("the first tab must start selected");
    const restPanel = scope.querySelector<HTMLElement>('[role="tabpanel"][data-state="active"]');
    if (!/OVERVIEW/.test(restPanel?.textContent ?? ""))
      throw new Error(`the Overview panel must be shown at rest; got "${restPanel?.textContent}"`);

    // Focus the first tab, then ArrowRight — the roving tab stop moves focus AND (automatic activation)
    // selects the next tab, swapping the shown panel.
    tabs[0].focus();
    if (document.activeElement !== tabs[0]) throw new Error("the first tab must take focus");
    tabs[0].dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowRight", bubbles: true }));

    await waitFor(() => tabs[1].getAttribute("aria-selected") === "true");
    if (document.activeElement !== tabs[1])
      throw new Error("ArrowRight must move the roving focus to the second tab");
    if (tabs[0].getAttribute("aria-selected") === "true")
      throw new Error("the first tab must deselect when the second activates");

    const panel = await waitFor(() => {
      const p = scope.querySelector<HTMLElement>('[role="tabpanel"][data-state="active"]');
      return p && /ACTIVITY/.test(p.textContent ?? "") ? p : null;
    });
    if (!panel) throw new Error("the shown panel must update to Activity after ArrowRight");
  },
};

const PANEL_TABS = [
  { value: "overview", label: "Overview", panel: "OVERVIEW PANEL" },
  { value: "activity", label: "Activity", panel: "ACTIVITY PANEL" },
  { value: "settings", label: "Settings", panel: "SETTINGS PANEL" },
];

/** Every onValueChange a declining controlled Root hears, so an arm can count them. */
const declinedChanges: string[] = [];

function PanelTabs({ testId, activationMode, declining }: { testId: string; activationMode?: "automatic" | "manual"; declining?: boolean }) {
  const valueProps = declining
    ? { value: "overview", onValueChange: (v: string) => declinedChanges.push(v) }
    : { defaultValue: "overview" };
  return (
    <Box data-testid={testId}>
      <Tabs.Root {...valueProps} activationMode={activationMode}>
        <Tabs.List aria-label={`Project sections, ${testId}`}>
          {PANEL_TABS.map((t) => <Tabs.Trigger key={t.value} value={t.value}>{t.label}</Tabs.Trigger>)}
        </Tabs.List>
        {PANEL_TABS.map((t) => <Tabs.Content key={t.value} value={t.value}><Text size="2">{t.panel}</Text></Tabs.Content>)}
      </Tabs.Root>
    </Box>
  );
}

/** Only navigation opens a tab ([[tabs-open-on-navigation]], Radix #1047). A screen reader cursor moves keyboard focus as it
 *  reads, so a bare focus must leave the selection where it is. An arrow key opens the tab it reaches, a
 *  click with no pointer press opens its tab, a click that ends a press Radix answered selects nothing
 *  a second time, and a consumer who asks for manual keeps manual. */
export const ScreenReaderFocus: Story = {
  render: () => (
    <Box p="5">
      <PanelTabs testId="default" />
      <PanelTabs testId="manual" activationMode="manual" />
      <PanelTabs testId="declining" declining />
    </Box>
  ),
  play: async ({ canvasElement }) => {
    const specimen = (id: string) => {
      const scope = canvasElement.querySelector<HTMLElement>(`[data-testid="${id}"]`);
      if (!scope) throw new Error(`missing ${id} specimen`);
      const tabs = [...scope.querySelectorAll<HTMLElement>('[role="tab"]')];
      const selected = () => tabs.findIndex((t) => t.getAttribute("aria-selected") === "true");
      const panel = () => scope.querySelector<HTMLElement>('[role="tabpanel"][data-state="active"]')?.textContent ?? "";
      return { tabs, selected, panel };
    };

    const auto = specimen("default");
    if (auto.selected() !== 0) throw new Error("Overview must start selected");

    // A bare focus, the move a VoiceOver cursor makes, moves focus and opens nothing.
    auto.tabs[1].focus();
    if (document.activeElement !== auto.tabs[1]) throw new Error("Activity must take focus");
    await sleep(300);
    if (auto.selected() !== 0 || !/OVERVIEW/.test(auto.panel()))
      throw new Error(`a bare focus must not open a tab; selected index ${auto.selected()}, panel "${auto.panel()}"`);

    // An arrow key opens the tab that it moves focus to.
    auto.tabs[0].focus();
    auto.tabs[0].dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowRight", bubbles: true }));
    await waitFor(() => auto.selected() === 1);
    if (document.activeElement !== auto.tabs[1]) throw new Error("ArrowRight must move focus to Activity");
    await waitFor(() => /ACTIVITY/.test(auto.panel()));

    // A key Radix ignores drops its mark at once: ArrowUp moves no focus in a horizontal tab list, so
    // a bare focus straight after it opens nothing.
    auto.tabs[1].dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowUp", bubbles: true }));
    await Promise.resolve();
    auto.tabs[2].focus();
    await sleep(300);
    if (auto.selected() !== 1) throw new Error(`a bare focus after an ignored arrow key must not open a tab; selected index ${auto.selected()}`);

    // A key Radix answers without moving focus keeps its mark only briefly: End on the last tab. A
    // later bare focus opens nothing.
    auto.tabs[2].dispatchEvent(new KeyboardEvent("keydown", { key: "End", bubbles: true }));
    await sleep(300);
    auto.tabs[0].focus();
    await sleep(300);
    if (auto.selected() !== 1) throw new Error(`a bare focus after an unused End key must not open a tab; selected index ${auto.selected()}`);

    // A click with no pointer press, the click VoiceOver sends on VO+Space, opens its tab.
    auto.tabs[2].click();
    await waitFor(() => auto.selected() === 2);
    await waitFor(() => /SETTINGS/.test(auto.panel()));

    // A consumer who asks for manual keeps it: an arrow key moves focus and opens nothing.
    const manual = specimen("manual");
    manual.tabs[0].focus();
    manual.tabs[0].dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowRight", bubbles: true }));
    await waitFor(() => document.activeElement === manual.tabs[1]);
    await sleep(300);
    if (manual.selected() !== 0) throw new Error(`manual mode must not open a tab on an arrow key; selected index ${manual.selected()}`);

    // A controlled Root that declines every change hears one onValueChange per activation. Radix
    // answers a pointer press and Enter itself, so the click that ends either must not select again.
    declinedChanges.length = 0;
    const declining = specimen("declining");
    const target = declining.tabs[1];
    target.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true, button: 0, pointerType: "mouse" }));
    target.dispatchEvent(new MouseEvent("mousedown", { bubbles: true, button: 0 }));
    target.dispatchEvent(new PointerEvent("pointerup", { bubbles: true, button: 0, pointerType: "mouse" }));
    target.dispatchEvent(new MouseEvent("mouseup", { bubbles: true, button: 0 }));
    target.click();
    await sleep(50);
    if (declinedChanges.join() !== "activity")
      throw new Error(`a pointer press and its click must fire onValueChange once; got [${declinedChanges.join()}]`);
    declining.tabs[2].focus();
    declining.tabs[2].dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", bubbles: true }));
    declining.tabs[2].click();
    declining.tabs[2].dispatchEvent(new KeyboardEvent("keyup", { key: "Enter", bubbles: true }));
    await sleep(50);
    if (declinedChanges.join() !== "activity,settings")
      throw new Error(`Enter and its click must fire onValueChange once; got [${declinedChanges.join()}]`);
    declining.tabs[1].click();
    await sleep(50);
    if (declinedChanges.join() !== "activity,settings,activity")
      throw new Error(`a click with no press must fire onValueChange once; got [${declinedChanges.join()}]`);
  },
};

/** Nav aria-current: the active Tabs.Nav link carries aria-current="page" (and only that one). */
export const NavAriaCurrent: Story = {
  render: () => (
    <Box p="5" data-testid="nav">
      <LinkProvider component={DemoLink}>
        <Tabs.Nav aria-label="Account settings">
          <Tabs.Nav.Link href="/settings/profile">Profile</Tabs.Nav.Link>
          <Tabs.Nav.Link href="/settings/billing" active>Billing</Tabs.Nav.Link>
          <Tabs.Nav.Link href="/settings/members">Members</Tabs.Nav.Link>
        </Tabs.Nav>
      </LinkProvider>
    </Box>
  ),
  play: async ({ canvasElement }) => {
    const scope = canvasElement.querySelector<HTMLElement>('[data-testid="nav"]');
    if (!scope) throw new Error("missing nav specimen");
    const links = [...scope.querySelectorAll<HTMLAnchorElement>("a[href]")];
    if (links.length !== 3) throw new Error(`expected 3 nav links; got ${links.length}`);

    const current = links.filter((a) => a.getAttribute("aria-current") === "page");
    if (current.length !== 1)
      throw new Error(`exactly one link must be aria-current="page"; got ${current.length}`);
    if (!/Billing/.test(current[0].textContent ?? ""))
      throw new Error(`the active (Billing) link must carry aria-current="page"; got "${current[0].textContent}"`);
    // The active link also drives Radix's visual active state via data-active.
    if (!current[0].hasAttribute("data-active"))
      throw new Error("the active nav link must carry data-active for the underline");
    // The others must not claim to be the current page.
    if (links.some((a) => a !== current[0] && a.getAttribute("aria-current") === "page"))
      throw new Error("only the active link may be aria-current");
  },
};

/* -------------------------------------------------------------------------
 * BOX AND TYPE ARE TWO LADDERS (the [[floating-surface-wraps]] bracket)
 *
 * The tab BOX rides Radix's two-step lane, clamped {1, 1, 2} → 32 / 32 / 40px. The tab TYPE does NOT ride
 * the vendor's paired step (which would render 12px at small AND medium, because both tiers share the
 * class "1"); it rides our text lane → 12 / 14 / 16px. Two independent ladders, so they need two
 * assertions, and the second one is why this story exists: the size COVERAGE guard in `_size.stories.tsx`
 * reads the `rt-r-size-N` CLASS, which is unchanged by the type fix and would stay green through a full
 * revert of it.
 *
 * The expected values are written out as local constants — the `_size` / `_sidenav` / `boxLaw` convention:
 * a probe that recomputes the component's own derivation agrees with it by construction and can never
 * catch a derivation that moved. Both surfaces are measured, because `Tabs.List` and `Tabs.Nav` reach the
 * painting element by DIFFERENT routes (Radix forwards `className` to the inner `.rt-BaseTabList` on the
 * Nav and to the list itself on the panel), and a hook that lands on only one of them looks correct on
 * whichever page you happen to open.
 * ------------------------------------------------------------------------- */

const TIERS = ["small", "medium", "large"] as const;
/** Row height: the vendor's `--tab-height` at the clamped step (--space-6 / --space-6 / --space-7). */
const TAB_BOX_PX: Record<(typeof TIERS)[number], number> = { small: 32, medium: 32, large: 40 };
/** Label size: OUR text lane, `--font-size-1/2/3`. Never the vendor's box-paired step. */
const TAB_TYPE_PX: Record<(typeof TIERS)[number], number> = { small: 12, medium: 14, large: 16 };

/** Both tab surfaces under all three tiers. Unsized on purpose: each list resolves the Provider around it. */
export const BoxAndTypeLadders: Story = {
  render: () => (
    <Box p="4">
      {TIERS.map((tier) => (
        <Provider key={tier} uiSize={tier}>
          <Box data-tab-tier={tier} pb="4">
            <Tabs.Root defaultValue="a">
              <Tabs.List aria-label={`Panel tabs ${tier}`}>
                <Tabs.Trigger value="a">Overview</Tabs.Trigger>
                <Tabs.Trigger value="b">Activity</Tabs.Trigger>
              </Tabs.List>
              <Tabs.Content value="a" forceMount />
              <Tabs.Content value="b" forceMount />
            </Tabs.Root>
            <LinkProvider component={DemoLink}>
              <Tabs.Nav aria-label={`Nav tabs ${tier}`}>
                <Tabs.Nav.Link href="/profile" active>Profile</Tabs.Nav.Link>
                <Tabs.Nav.Link href="/billing">Billing</Tabs.Nav.Link>
              </Tabs.Nav>
            </LinkProvider>
          </Box>
        </Provider>
      ))}
    </Box>
  ),
  play: async ({ canvasElement }) => {
    await document.fonts.ready;
    await sleep(120);
    const failures: string[] = [];
    for (const tier of TIERS) {
      const scope = canvasElement.querySelector<HTMLElement>(`[data-tab-tier="${tier}"]`);
      if (!scope) {
        failures.push(`${tier}: fixture slot missing`);
        continue;
      }
      // Both surfaces render a `.rt-BaseTabList`; the panel triggers and the nav links are its rows.
      const lists = [...scope.querySelectorAll<HTMLElement>(".rt-BaseTabList")];
      if (lists.length !== 2) {
        failures.push(`${tier}: expected a panel list AND a nav list; got ${lists.length}`);
        continue;
      }
      for (const list of lists) {
        const which = list.classList.contains("rt-TabNavList") ? "Nav" : "List";
        // The hook has to be ON the painting element — a class that lands on a wrapper paints nothing.
        if (!list.classList.contains("rt-ds-tablist"))
          failures.push(`${tier} / ${which}: the tab list carries no rt-ds-tablist hook`);
        const type = Math.round(parseFloat(getComputedStyle(list).fontSize));
        if (type !== TAB_TYPE_PX[tier])
          failures.push(`${tier} / ${which}: the label must be ${TAB_TYPE_PX[tier]}px (the text lane); got ${type}px`);
        const rows = [...list.querySelectorAll<HTMLElement>('[role="tab"], .rt-TabNavLink')];
        if (rows.length === 0) {
          failures.push(`${tier} / ${which}: no tab rows rendered`);
          continue;
        }
        for (const row of rows) {
          const h = Math.round(row.getBoundingClientRect().height);
          if (h !== TAB_BOX_PX[tier])
            failures.push(`${tier} / ${which}: a tab row must be ${TAB_BOX_PX[tier]}px; got ${h}px`);
          const rowType = Math.round(parseFloat(getComputedStyle(row).fontSize));
          if (rowType !== TAB_TYPE_PX[tier])
            failures.push(`${tier} / ${which}: a tab row's own type must be ${TAB_TYPE_PX[tier]}px; got ${rowType}px`);
        }
      }
    }
    if (failures.length) {
      throw new Error(
        `The tab ladders did not hold (${failures.length}). BOX rides the clamped vendor lane ` +
          `(32 / 32 / 40) and TYPE rides our text lane (12 / 14 / 16) — two ladders, independently:\n${failures.join("\n")}`,
      );
    }
  },
};
