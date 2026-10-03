import type { Meta, StoryObj } from "@storybook/react-vite";
import { Box } from "@radix-ui/themes";
import { House, ChartBar, Users, Gear } from "@phosphor-icons/react";
import { SideNav, SideNavItem, SideNavSection, SideNavCollapseButton } from "./SideNav";
import { Button } from "./Button";
import { Provider, type ProviderProps } from "../../theme/Provider";
import { toHex } from "./_storyKit";
import { ambientStepOf, sweepControlBoxes, type ControlBoxRecord } from "../../foundations/boxLaw";

/* Test-only behavior for SideNav — kept OUT of the docs stories (System/Navigation/SideNav).
   Underscore-prefixed → registry / story-order / category guard-exempt, grouped under _internal. Driving
   here (collapse toggling, nested-group animate, the portaled flyout, arrow roving) would flash the docs
   page, so it lives here. Covers: regime switching (expanded ↔ collapsed icon rail); the nested group
   toggling + its collapsed subtree being inert (non-focusable); aria-current="page" on the active row;
   the collapsed-with-children flyout opening + keyboard roving inside it (+ its panel being OPAQUE over
   coloured content); SideNavCollapseButton's aria-expanded tracking state; arrow-key roving; the [[nav-row-ladder]] NAV
   LADDER in both regimes at all three tiers AND under scaling 90%; and the scroll body's opaque paint
   (the one thing axe can only report as INCOMPLETE, so a guard has to assert it).
   Hand-rolled (no @storybook/test): local sleep + waitFor poll, native driving, throw-on-fail. */

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
async function waitFor<T>(fn: () => T | null | undefined | false, timeout = 3000): Promise<T> {
  const t0 = performance.now();
  for (;;) {
    const v = fn();
    if (v) return v;
    if (performance.now() - t0 > timeout) throw new Error("waitFor: timed out");
    await sleep(16);
  }
}
const gone = async (sel: string, timeout = 3000) => {
  const t0 = performance.now();
  while (document.querySelector(sel)) {
    if (performance.now() - t0 > timeout) throw new Error(`still present: ${sel}`);
    await sleep(16);
  }
};
const key = (el: Element, k: string) => el.dispatchEvent(new KeyboardEvent("keydown", { key: k, bubbles: true, cancelable: true }));

/** A rail with an active leaf, a nested group, several leaves, and the collapse button. */
function Rail({
  collapsed,
  defaultExpanded = false,
  testid = "sn",
}: {
  collapsed?: boolean;
  defaultExpanded?: boolean;
  testid?: string;
}) {
  return (
    <Box style={{ height: 360, width: 320, display: "flex" }}>
      <SideNav aria-label="Primary" defaultCollapsed={collapsed} data-testid={testid}>
        <SideNavSection>
          <SideNavItem icon={<House />} label="Home" href="#home" isSelected />
          <SideNavItem icon={<ChartBar />} label="Reports" defaultExpanded={defaultExpanded} data-testid="parent">
            <SideNavItem label="Overview" href="#reports-overview" data-testid="child-a" />
            <SideNavItem label="Traffic" href="#reports-traffic" data-testid="child-b" />
          </SideNavItem>
          <SideNavItem icon={<Users />} label="Team" href="#team" data-testid="team" />
          <SideNavItem icon={<Gear />} label="Settings" href="#settings" data-testid="settings" />
        </SideNavSection>
        <SideNavCollapseButton />
      </SideNav>
    </Box>
  );
}

const q = <T extends HTMLElement>(root: ParentNode, sel: string) => root.querySelector<T>(sel);

const meta: Meta<typeof SideNav> = {
  title: "_internal/SideNav behavior",
  component: SideNav,
  parameters: { controls: { disable: true } },
};
export default meta;
type Story = StoryObj<typeof SideNav>;

/** The active destination carries aria-current="page" on the link (D2). */
export const ActiveIsAriaCurrentPage: Story = {
  render: () => <Rail />,
  play: async ({ canvasElement }) => {
    const rail = q(canvasElement, '[data-testid="sn"]')!;
    const current = rail.querySelectorAll('[aria-current="page"]');
    if (current.length !== 1) throw new Error(`exactly one row must be aria-current="page"; got ${current.length}`);
    if ((current[0].textContent ?? "").trim() !== "Home") throw new Error(`the active row must be Home; got "${current[0].textContent}"`);
  },
};

/** ArrowUp/Down/Home/End rove focus among the rows; exactly one row is the tab stop, and it follows focus. */
export const ArrowRoving: Story = {
  render: () => <Rail />,
  play: async ({ canvasElement }) => {
    const nav = q(canvasElement, '[data-testid="sn"] nav')!;
    const rows = () => Array.from(nav.querySelectorAll<HTMLElement>('.rt-ds-item-body, .rt-ds-sidenav-disclosure'));
    // Exactly one seeded tab stop (the active row) on mount.
    await waitFor(() => nav.querySelectorAll('[tabindex="0"]').length === 1);
    const home = rows()[0];
    home.focus();
    if (document.activeElement !== home) throw new Error("could not focus the first row");
    // ArrowDown → the Reports disclosure (next enabled row), which becomes the sole tab stop.
    key(nav, "ArrowDown");
    const reports = await waitFor(() => (document.activeElement?.classList.contains("rt-ds-sidenav-disclosure") ? (document.activeElement as HTMLElement) : null));
    if (nav.querySelectorAll('[tabindex="0"]').length !== 1) throw new Error("still exactly one tab stop after ArrowDown");
    if (reports.getAttribute("tabindex") !== "0") throw new Error("the focused row must be the tab stop");
    if (home.getAttribute("tabindex") !== "-1") throw new Error("the previous row must drop to tabindex -1");
    // End → the last row; Home → the first.
    key(nav, "End");
    await waitFor(() => document.activeElement === rows()[rows().length - 1]);
    key(nav, "Home");
    await waitFor(() => document.activeElement === rows()[0]);
  },
};

/** The nested group toggles: closed → inert (non-focusable) subtree; open → animated + focusable. */
export const NestedGroupToggleAndInert: Story = {
  render: () => <Rail defaultExpanded={false} />,
  play: async ({ canvasElement }) => {
    const rail = q(canvasElement, '[data-testid="sn"]')!;
    const disclosure = q(rail, '.rt-ds-sidenav-disclosure')!;
    const group = q<HTMLElement>(rail, '[role="group"]')!;
    const childA = q(rail, '[data-testid="child-a"] .rt-ds-item-body')!;

    // Collapsed: the group is inert (kept mounted → non-focusable), aria-expanded=false.
    if (disclosure.getAttribute("aria-expanded") !== "false") throw new Error("parent must start collapsed (aria-expanded=false)");
    if (group.getAttribute("data-state") !== "closed") throw new Error("group must start data-state=closed");
    if (!group.hasAttribute("inert")) throw new Error("the collapsed subtree must be inert");
    (childA as HTMLElement).focus();
    if (document.activeElement === childA) throw new Error("an inert subtree's rows must NOT be focusable");

    // Expand: aria-expanded flips, inert clears, the height var is measured, and the animation is armed.
    disclosure.click();
    await waitFor(() => disclosure.getAttribute("aria-expanded") === "true");
    await waitFor(() => group.getAttribute("data-state") === "open");
    if (group.hasAttribute("inert")) throw new Error("the expanded subtree must not be inert");
    if (group.getAttribute("data-animate") == null) throw new Error("the animation must arm after the first toggle (data-animate)");
    if (!group.style.getPropertyValue("--radix-collapsible-content-height")) throw new Error("the group height must be measured (--radix-collapsible-content-height)");
    // Now the child is focusable.
    (childA as HTMLElement).focus();
    await waitFor(() => document.activeElement === childA);

    // Collapse again → inert returns.
    disclosure.click();
    await waitFor(() => group.getAttribute("data-state") === "closed");
    await waitFor(() => group.hasAttribute("inert"));
  },
};

/** Roving SKIPS a collapsed (inert) subtree: ArrowDown from the parent lands on the row AFTER the group. */
export const RovingSkipsCollapsedSubtree: Story = {
  render: () => <Rail defaultExpanded={false} />,
  play: async ({ canvasElement }) => {
    const nav = q(canvasElement, '[data-testid="sn"] nav')!;
    const disclosure = q<HTMLElement>(nav, '.rt-ds-sidenav-disclosure')!;
    disclosure.focus();
    key(nav, "ArrowDown");
    // Reports' children are inert → skipped; focus lands on Team (the next enabled row).
    const team = await waitFor(() => q<HTMLElement>(nav, '[data-testid="team"] .rt-ds-item-body'));
    await waitFor(() => document.activeElement === team);
  },
};

/** Toggling collapse swaps the regime: expanded rows → an icon rail (parent → a flyout trigger). */
export const RegimeSwitchOnCollapse: Story = {
  render: () => <Rail />,
  play: async ({ canvasElement }) => {
    const rail = q(canvasElement, '[data-testid="sn"]')!;
    const collapseBtn = q<HTMLElement>(rail, '.rt-ds-sidenav-collapse-btn')!;
    // Expanded: the parent is an inline disclosure, no rail trigger.
    if (!q(rail, '.rt-ds-sidenav-disclosure')) throw new Error("expanded rail must render an inline disclosure");
    if (q(rail, '.rt-ds-sidenav-railtrigger')) throw new Error("expanded rail must NOT render a flyout trigger");
    if (rail.hasAttribute("data-collapsed")) throw new Error("rail must start expanded");

    collapseBtn.click();
    // Collapsed: data-collapsed set, the parent is now an icon flyout trigger.
    await waitFor(() => rail.hasAttribute("data-collapsed"));
    await waitFor(() => q(rail, '.rt-ds-sidenav-railtrigger'));
    if (q(rail, '.rt-ds-sidenav-disclosure')) throw new Error("collapsed rail must NOT render an inline disclosure");
  },
};

/** SideNavCollapseButton carries aria-expanded={!collapsed}, tracking the state (an accessibility upgrade). */
export const CollapseButtonAriaTracksState: Story = {
  render: () => <Rail />,
  play: async ({ canvasElement }) => {
    const rail = q(canvasElement, '[data-testid="sn"]')!;
    const nav = q<HTMLElement>(rail, "nav")!;
    const btn = q<HTMLElement>(rail, '.rt-ds-sidenav-collapse-btn')!;
    if (btn.getAttribute("aria-expanded") !== "true") throw new Error("expanded → the collapse button must be aria-expanded=true");
    if (btn.getAttribute("aria-controls") !== nav.id) throw new Error("aria-controls must point at the nav landmark");
    btn.click();
    await waitFor(() => btn.getAttribute("aria-expanded") === "false");
    btn.click();
    await waitFor(() => btn.getAttribute("aria-expanded") === "true");
  },
};

/** The collapsed rail renders IconButtons: a SQUARE control per row with the glyph centred, the size
    coming from the global uiSize TEXT lane (the nav ladder, [[nav-row-ladder]]) — and aria-current="page" on the LINK,
    not a wrapper. */
export const CollapsedRailIsIconButtons: Story = {
  render: () => <Rail collapsed />,
  play: async ({ canvasElement }) => {
    const rail = q(canvasElement, '[data-testid="sn"]')!;
    await waitFor(() => rail.hasAttribute("data-collapsed"));
    const links = Array.from(rail.querySelectorAll<HTMLElement>(".rt-ds-sidenav-raillink"));
    if (links.length !== 3) throw new Error(`the collapsed rail must render its 3 leaves as rail links; got ${links.length}`);
    // No leaf may still be an Item row — the whole point of the regime.
    if (rail.querySelector(".rt-ds-sidenav-leaf .rt-ds-item-label")) throw new Error("a collapsed leaf must not render Item row anatomy");

    for (const el of links) {
      // It IS the IconButton (Radix's own class), rendered as the anchor itself — no wrapper element.
      if (!el.classList.contains("rt-IconButton")) throw new Error(`a rail leaf must render the System IconButton; got ${el.className}`);
      if (el.tagName !== "A") throw new Error(`an href leaf must render the anchor itself; got <${el.tagName}>`);
      const r = el.getBoundingClientRect();
      if (Math.abs(r.width - r.height) > 0.5) throw new Error(`a rail button must be SQUARE; got ${r.width}x${r.height}`);
      if (r.width < 24) throw new Error(`a rail button must clear the 24px target floor; got ${r.width}`);
      // …with the glyph centred on both axes.
      const svg = el.querySelector("svg")!.getBoundingClientRect();
      const dx = Math.abs(svg.x + svg.width / 2 - (r.x + r.width / 2));
      const dy = Math.abs(svg.y + svg.height / 2 - (r.y + r.height / 2));
      if (dx > 0.5 || dy > 0.5) throw new Error(`the glyph must be centred; off by dx=${dx.toFixed(2)} dy=${dy.toFixed(2)}`);
    }

    // aria-current="page" sits on the anchor a user navigates to (D2) — not on a wrapper div.
    const current = rail.querySelectorAll('[aria-current="page"]');
    if (current.length !== 1) throw new Error(`exactly one rail row must be aria-current="page"; got ${current.length}`);
    if (!current[0].classList.contains("rt-ds-sidenav-raillink")) throw new Error("aria-current must ride the rail link itself");
    if (current[0].getAttribute("aria-label") !== "Home") throw new Error(`the active rail row must be Home; got ${current[0].getAttribute("aria-label")}`);
    // The selected tint fills the square (a real background, not the transparent rest state).
    const bg = getComputedStyle(current[0] as HTMLElement).backgroundColor;
    if (bg === "rgba(0, 0, 0, 0)" || bg === "transparent") throw new Error("the active rail button must carry the selected tint");

    // The parent row is the flyout trigger and matches the leaves' square box.
    const trigger = q<HTMLElement>(rail, ".rt-ds-sidenav-railtrigger")!;
    const tr = trigger.getBoundingClientRect();
    if (Math.abs(tr.width - tr.height) > 0.5) throw new Error(`the rail flyout trigger must be square too; got ${tr.width}x${tr.height}`);
    // Every rail row is ONE box — leaves and the flyout trigger alike (they stand in the same column).
    const railH = links[0].getBoundingClientRect().height;
    for (const el of [...links, trigger]) {
      if (Math.abs(el.getBoundingClientRect().height - railH) > 0.5) {
        throw new Error(`every rail row must be the same box; got ${el.getBoundingClientRect().height} beside ${railH}`);
      }
    }

    // The System Tooltip still supplies the label on a collapsed leaf (hover → a role=tooltip panel).
    links[1].dispatchEvent(new PointerEvent("pointermove", { bubbles: true, pointerType: "mouse" }));
    links[1].dispatchEvent(new PointerEvent("pointerenter", { bubbles: true, pointerType: "mouse" }));
    links[1].focus();
    const tip = await waitFor(() => document.querySelector('[role="tooltip"]'));
    if (!(tip.textContent ?? "").includes("Team")) throw new Error(`the collapsed leaf tooltip must name the row; got "${tip.textContent}"`);
  },
};

/* ---------------------------------------------------------------------------
 * THE NAV LADDER ([[nav-row-ladder]]) — the rail measures what the rows measure, at every tier.
 *
 * Navigation carries more prominence than a standard control, so a nav row is an ITEM-family row and
 * NOT a control-lane button: 32 / 36 / 40px at small / medium / large, where the control box names
 * 24 / 32 / 40. And a collapsed rail is the same navigation as the rows it replaces, so it rides that
 * same ladder — collapsed and expanded measure the SAME box at the same tier.
 *
 * Two assertions, because each catches what the other cannot. The EXPECTED values are typed out here
 * as local constants (the `_control-box.stories.tsx` / `boxLaw.ts` convention: a probe that recomputes
 * the component's own derivation agrees with it by construction and can never catch a derivation that
 * moved). The EQUALITY is asserted separately and needs no constant at all — it is the half of the
 * ruling that says "collapsed = expanded", and it would still hold if the whole ladder moved.
 * ------------------------------------------------------------------------- */

/** The nav ladder, written out. Each rung is the row's line box plus the Item block padding on both
 *  sides — `--line-height-1/2/3` (16 / 20 / 24) + 2 × `--ds-space-8` (8) — at `--scaling: 1`. */
const NAV_LADDER_PX: Record<"small" | "medium" | "large", number> = { small: 32, medium: 36, large: 40 };

/** THE SAME LADDER UNDER THE ONE KNOB THAT MOVES IT. `scaling` multiplies the space AND line-height
 *  scales at once, and BOTH terms of a nav rung are scaled (`--line-height-N` is `calc(Npx * --scaling)`,
 *  `--ds-space-8` is `--space-2`, likewise) — so the whole ladder moves together and nothing here is a
 *  special case. These are INDEPENDENT constants, arrived at by multiplying the ruling's numbers, never
 *  by reading the ladder above at runtime: a probe that derives its expectation from the value it is
 *  checking agrees with a ladder that has silently stopped scaling.
 *
 *  Why the 24px pointer floor never appears in them: the floor is an absolute CSS px that does NOT scale
 *  and wins below itself (GUIDELINES §9), and the row ladder collides with it at 90% (a step-1 control
 *  holds 24 instead of 21.6). The NAV ladder does not — its lowest rung is 32, which scales to 28.8, so
 *  `max(rung × scaling, 24)` is the rung at every tier and the floor is inert here. Asserting the
 *  unfloored numbers is what states that difference rather than assuming it. */
const SCALING: ProviderProps["scaling"] = "90%";
const NAV_LADDER_PX_AT_90: Record<"small" | "medium" | "large", number> = { small: 28.8, medium: 32.4, large: 36 };

const TIERS = ["small", "medium", "large"] as const;

/** Both regimes under all three tiers. Unsized on purpose: each rail resolves the Provider around it.
 *  Shared by the two ladder stories so the scaled run cannot drift into a different fixture. */
function NavLadderGrid({ scaling }: { scaling?: ProviderProps["scaling"] }) {
  return (
    <>
      {TIERS.map((tier) => (
        <Provider key={tier} uiSize={tier} scaling={scaling}>
          <Box style={{ display: "flex", gap: 16 }} data-nav-tier={tier}>
            <Box data-nav-state="expanded" style={{ height: 220, width: 300, display: "flex" }}>
              <SideNav aria-label={`Primary ${tier} expanded`}>
                <SideNavSection>
                  <SideNavItem icon={<House />} label="Home" href="#home" isSelected />
                  <SideNavItem icon={<Users />} label="Team" href="#team" />
                </SideNavSection>
              </SideNav>
            </Box>
            <Box data-nav-state="collapsed" style={{ height: 220, width: 80, display: "flex" }}>
              <SideNav aria-label={`Primary ${tier} collapsed`} defaultCollapsed>
                <SideNavSection>
                  <SideNavItem icon={<House />} label="Home" href="#home" isSelected />
                  <SideNavItem icon={<Users />} label="Team" href="#team" />
                </SideNavSection>
              </SideNav>
            </Box>
          </Box>
        </Provider>
      ))}
    </>
  );
}

/** One measurement, run at whatever scaling the story mounted, against whatever ladder it expects.
 *  Tolerance is 0.25px — deliberately TIGHTER than the box law's 1px, because the two rungs this has to
 *  tell apart at 90% (32 unscaled against 32.4 scaled) are 0.4px apart: a 1px tolerance would let a
 *  ladder that had stopped scaling pass at medium, which is the exact failure the story exists for.
 *  These are declared `min-height`s on a square, not flow-dependent layout, so they do not drift. */
async function assertNavLadder(
  canvasElement: HTMLElement,
  expectedOf: Record<"small" | "medium" | "large", number>,
  scalingNote: string,
): Promise<void> {
  await document.fonts.ready;
  await sleep(200);
  const failures: string[] = [];
  for (const tier of TIERS) {
    const scope = q(canvasElement, `[data-nav-tier="${tier}"]`);
    if (!scope) {
      failures.push(`${tier}: fixture slot missing`);
      continue;
    }
    const expected = expectedOf[tier];
    const heights: Record<string, number[]> = {};
    for (const state of ["expanded", "collapsed"] as const) {
      const host = q(scope, `[data-nav-state="${state}"]`)!;
      // Expanded rows are Item rows; the collapsed rail's rows are the IconButtons that replace them.
      const rows = Array.from(
        host.querySelectorAll<HTMLElement>(".rt-ds-sidenav-leaf, .rt-ds-sidenav-railtrigger"),
      );
      if (rows.length === 0) {
        failures.push(`${tier} / ${state}: no nav rows rendered`);
        continue;
      }
      heights[state] = rows.map((el) => Math.round(el.getBoundingClientRect().height * 100) / 100);
      for (const h of heights[state]) {
        if (Math.abs(h - expected) > 0.25) {
          failures.push(`${tier} / ${state}: a nav row must be ${expected}px${scalingNote}; got ${h}px`);
        }
      }
    }
    // The ruling's own sentence: collapsed rides the SAME ladder as expanded. Asserted without the
    // constant above, so it survives the whole ladder moving.
    if (heights.expanded && heights.collapsed && Math.abs(heights.expanded[0] - heights.collapsed[0]) > 0.25) {
      failures.push(
        `${tier}: the collapsed rail must measure what the expanded rows measure; got ${heights.collapsed[0]}px against ${heights.expanded[0]}px`,
      );
    }
  }
  if (failures.length) {
    const ladder = TIERS.map((t) => expectedOf[t]).join(" / ");
    throw new Error(
      `[[nav-row-ladder]] — the nav ladder did not hold (${failures.length})${scalingNote}. Navigation rows are ` +
        `Item-family rows (${ladder} at small / medium / large), collapsed and expanded alike:\n${failures.join("\n")}`,
    );
  }
}

export const NavLadderTracksBothStates: Story = {
  render: () => <NavLadderGrid />,
  play: async ({ canvasElement }) => {
    await assertNavLadder(canvasElement, NAV_LADDER_PX, "");
  },
};

/** THE SAME LADDER WITH THE SCALING KNOB TURNED. A ladder that never sees a moved `--scaling` is only
 *  half-guarded: a rung frozen to a literal px, or built from one scaled term and one unscaled one, is
 *  indistinguishable from a correct one at `100%` and wrong everywhere else. GUIDELINES §10 claims the
 *  nav family scales cleanly to 28.8 / 32.4 / 36 with the 24px floor inert; this is where that claim is
 *  measured rather than asserted. Same fixture, same assertion, one knob different. */
export const NavLadderUnderScaling: Story = {
  render: () => <NavLadderGrid scaling={SCALING} />,
  play: async ({ canvasElement }) => {
    await assertNavLadder(canvasElement, NAV_LADDER_PX_AT_90, ` under scaling ${SCALING}`);
  },
};

/** THE NAV LADDER IS FOR NAV ROWS, NOT FOR EVERYTHING STANDING IN A RAIL.
 *
 *  The box law once decided the ladder by ANCESTRY — anything inside `.rt-ds-sidenav` was judged on
 *  32 / 36 / 40. A rail legitimately holds ordinary controls (a "New" action, a filter field, an
 *  end-slot ✕), and every one of them was scored BROKEN-BOX for being the size it is supposed to be,
 *  with the failure pointing at the control instead of at the rule. It now reads MEMBERSHIP: the
 *  `rt-ds-sidenav-row` class the rail's own rows carry.
 *
 *  This is the injection experiment, kept: a plain step-1 Button dropped into a rail, asserted to come
 *  back on the ROW ladder and TRUE, while the rail's own rows in the same sweep come back on the NAV
 *  ladder. Both directions, because a rule that stopped classifying nav rows would also "fix" the false
 *  red. The sweep is boxLaw's own, so this cannot pass by measuring something else. */
export const OrdinaryControlsInARailKeepTheRowLadder: Story = {
  // COLLAPSED on purpose: an expanded row is an `.rt-ds-item`, which is not a swept control root, so
  // an expanded rail puts nothing on the nav ladder for the second half to check. Collapsed, the rows
  // ARE swept controls (IconButtons) — one rail, one sweep, both classifications side by side.
  render: () => (
    <Box style={{ height: 220, width: 120, display: "flex" }}>
      <SideNav aria-label="Rail with an ordinary control" defaultCollapsed data-testid="sn">
        <Box p="2">
          <Button size="1">New</Button>
        </Box>
        <SideNavSection>
          <SideNavItem icon={<House />} label="Home" href="#home" isSelected />
          <SideNavItem icon={<Users />} label="Team" href="#team" />
        </SideNavSection>
      </SideNav>
    </Box>
  ),
  play: async ({ canvasElement }) => {
    await document.fonts.ready;
    await sleep(120);
    const rail = q(canvasElement, '[data-testid="sn"]')!;
    // The suite's ambient tier is `small`; read it the way the guard does rather than assuming.
    const records = sweepControlBoxes({ ambientStep: ambientStepOf("small"), root: rail });
    const named = (label: string): ControlBoxRecord | undefined =>
      records.find((r) => (r.label ?? "").trim() === label);

    const button = named("New");
    if (!button) {
      throw new Error(
        `the injected Button was not swept at all — the fixture is not exercising the rule ` +
          `(swept: ${records.map((r) => `${r.kind}/${r.label}`).join(", ") || "nothing"})`,
      );
    }
    if (button.rule !== "row") {
      throw new Error(
        `a plain Button standing in a rail is a CONTROL-lane control, not a nav row: expected the row ` +
          `ladder, got the "${button.rule}" ladder (expected ${button.expectBox}px, measured ${button.h}px). ` +
          `The ladder is decided by membership — the rt-ds-sidenav-row class — never by ancestry.`,
      );
    }
    if (button.v !== "TRUE") {
      throw new Error(`the injected step-1 Button must be on-law: expected TRUE, got ${button.v} at ${button.h}px`);
    }

    // …and the rule still fires where it should: the rail's own rows are nav rows in the same sweep.
    const navRows = records.filter((r) => r.rule === "nav");
    if (navRows.length === 0) {
      throw new Error(
        `no control in the rail was classified on the nav ladder — the membership test has stopped ` +
          `matching the rail's own rows, which is the false red's mirror image`,
      );
    }
  },
};

/** THE RAIL'S SCROLL BODY PAINTS THE RAIL SURFACE — asserted, because axe cannot assert it.
 *
 *  `.rt-ds-sidenav-nav` declares `background: var(--sn-surface)`, the same fill the root paints, purely so
 *  a row clipped at the scroll edge has an OPAQUE answer inside the container that owns the clip: axe
 *  resolves a text colour by hit-testing the pixels under the text, and on the clipped half it otherwise
 *  lands on whatever is behind the rail and reports `color-contrast` INCOMPLETE.
 *
 *  An incomplete cannot fail a run. Delete that one declaration and every gate stays green — the visual
 *  is byte-identical (the two fills are the same colour), the axe result goes back to incomplete rather
 *  than to a violation, and nothing anywhere notices. So the paint gets an assertion of its own.
 *
 *  The fixture reproduces the real condition rather than a convenient one: a frame SHORTER than the rail
 *  (so a row is genuinely cut through its own label — asserted, or the guard would pass on a rail that
 *  never scrolls) over a saturated backdrop (so "opaque" is a claim with something behind it to hide). */
export const NavBodyPaintsAnOpaqueSurface: Story = {
  render: () => (
    <>
      <Box style={{ position: "fixed", inset: 0, background: "#c026d3", zIndex: 0 }} />
      <Box style={{ position: "relative", zIndex: 1, height: 140, width: 240, display: "flex" }}>
        <SideNav aria-label="Paint" data-testid="sn">
          <SideNavSection>
            {["Home", "Reports", "Team", "Settings", "Billing", "Help"].map((l) => (
              <SideNavItem key={l} icon={<House />} label={l} href={`#${l}`} />
            ))}
          </SideNavSection>
        </SideNav>
      </Box>
    </>
  ),
  play: async ({ canvasElement }) => {
    const rail = q(canvasElement, '[data-testid="sn"]')!;
    const body = q<HTMLElement>(rail, ".rt-ds-sidenav-nav")!;

    // The fixture must actually clip, or nothing below is testing the condition the paint exists for.
    if (body.scrollHeight <= body.clientHeight) {
      throw new Error(
        `the fixture must overflow its frame so a row is cut at the scroll edge; ` +
          `scrollHeight ${body.scrollHeight} against clientHeight ${body.clientHeight}`,
      );
    }

    // OPAQUE (P3-safe rasterize → 7 chars). This is the assertion the missing declaration fails.
    const bodyBg = toHex(getComputedStyle(body).backgroundColor);
    if (!/^#[0-9a-f]{6}$/.test(bodyBg)) {
      throw new Error(
        `the rail's scroll body must paint an OPAQUE surface (a clipped row's contrast is hit-tested ` +
          `against it); got ${bodyBg}`,
      );
    }
    // …and it is the RAIL'S surface, not a second colour: the fix is an accessibility one, and nothing
    // may change on screen. Same `--sn-surface`, so the two resolve identically in either appearance.
    const railBg = toHex(getComputedStyle(rail).backgroundColor);
    if (bodyBg !== railBg) {
      throw new Error(`the scroll body must paint the rail's OWN surface; got ${bodyBg} against ${railBg}`);
    }

    // The clipped row's pixels land on the scroll body, not on the page behind the rail — the mechanism
    // axe walks. Sampled just inside the clip edge, on the label column.
    const r = body.getBoundingClientRect();
    const at = document.elementFromPoint(Math.round(r.left + r.width / 2), Math.round(r.bottom - 2));
    if (!(at && (at === body || body.contains(at)))) {
      throw new Error(`the clip edge must resolve inside the scroll body; hit <${at?.nodeName ?? "null"}>`);
    }
  },
};

/** Collapsed-with-children: the flyout opens, keyboard roves inside it, and its panel is OPAQUE over
    coloured content (a transparent panel looks fine on a white canvas but not over the page). */
export const CollapsedChildFlyout: Story = {
  render: () => (
    <>
      <Box style={{ position: "fixed", inset: 0, background: "#c026d3", zIndex: 0 }} />
      <Box style={{ position: "relative", zIndex: 1 }}>
        <Rail collapsed testid="sn" />
      </Box>
    </>
  ),
  play: async ({ canvasElement }) => {
    const rail = q(canvasElement, '[data-testid="sn"]')!;
    const trigger = q<HTMLElement>(rail, '.rt-ds-sidenav-railtrigger')!;
    trigger.click();
    const panel = await waitFor(() => q<HTMLElement>(document, ".rt-ds-sidenav-flyout-panel"));

    // OPAQUE: the resolved background has no alpha (P3-safe rasterize → 7 chars).
    const bg = toHex(getComputedStyle(panel).backgroundColor);
    if (!/^#[0-9a-f]{6}$/.test(bg)) throw new Error(`the flyout panel must be OPAQUE (no alpha); got ${bg}`);
    // …and it occludes the coloured backdrop at its centre (poll: mid-open it may be animating).
    await waitFor(() => {
      const r = panel.getBoundingClientRect();
      const top = document.elementFromPoint(Math.round(r.left + r.width / 2), Math.round(r.top + r.height / 2));
      return !!(top && panel.contains(top));
    });

    // The re-provided expanded context renders the children as full LINK rows.
    const links = panel.querySelectorAll<HTMLElement>(".rt-ds-item-body");
    if (links.length < 2) throw new Error(`the flyout must render the children as links; got ${links.length}`);
    // Initial focus lands on the first child (onOpenAutoFocus); ArrowDown roves to the next (dispatched on
    // the focused link so it bubbles to the flyout's useListFocus handler — the CommandPalette pattern).
    await waitFor(() => document.activeElement === links[0]);
    key(links[0], "ArrowDown");
    await waitFor(() => document.activeElement === links[1]);

    // Close.
    key(document.body, "Escape");
    await gone(".rt-ds-sidenav-flyout-panel");
  },
};
