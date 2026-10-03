import { useContext, useRef, useState, type AnchorHTMLAttributes, type ReactNode } from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { Box, Flex, Text } from "@radix-ui/themes";
import { Star, CaretRight, IconContext } from "@phosphor-icons/react";
import { Item } from "./Item";
import { LinkProvider } from "./Link";
import { List, ListItem } from "./List";
import { SideNav, SideNavItem, SideNavSection } from "./SideNav";
import { TopNav, TopNavItem, TopNavMenu } from "./TopNav";
import { TreeList } from "./TreeList";
import { CommandPalette } from "./CommandPalette";
import { createStaticSource } from "./Typeahead";
import { themeRoot, resolveColor, parseColor, ALL_ACCENTS } from "../../foundations/_assert";

/* Test-only BEHAVIOR + a working overview for the _internal `Item` primitive ([[item-row-primitive]] / D13). Item is a
   building block (like Field), NOT a public System component — so it lives here under _internal, not
   System/*. The docs-facing component is System/List (List.stories.tsx). The plays below pin the two
   things that MUST be right: the interactivity dual-model (invisible-body vs parent-role, no nested
   interactives / no double-fire) and the truncation + focus-ring hoist. */

const meta: Meta<typeof Item> = {
  title: "_internal/Item",
  component: Item,
  parameters: { controls: { disable: true } },
};
export default meta;
type Story = StoryObj<typeof Item>;

/* ---- Usage (calm on view — passive structure reads only) --------------- */
export const Usage: Story = {
  render: () => (
    <Box p="4" style={{ maxWidth: 560, background: "var(--ds-bg-base)" }}>
      <Flex direction="column" gap="5">
        <Flex direction="column" gap="1">
          <Text size="1" weight="bold" style={{ color: "var(--ds-text-weak)", letterSpacing: "0.06em" }}>SLOTS</Text>
          <Box data-testid="slots" style={{ border: "1px solid var(--ds-stroke-weak)", borderRadius: "var(--ds-radius-3)" }}>
            <Item
              startContent={<Star style={{ color: "var(--ds-icon-interactive)" }} />}
              label="Notifications"
              description="Manage how and when you're alerted"
              endContent={<CaretRight style={{ color: "var(--ds-icon-neutral)" }} />}
            />
          </Box>
        </Flex>

        <Flex direction="column" gap="1">
          <Text size="1" weight="bold" style={{ color: "var(--ds-text-weak)", letterSpacing: "0.06em" }}>DENSITY — compact · balanced · spacious</Text>
          <Box data-testid="density" style={{ border: "1px solid var(--ds-stroke-weak)", borderRadius: "var(--ds-radius-3)" }}>
            <Item density="compact" label="Compact" />
            <Item density="balanced" label="Balanced" />
            <Item density="spacious" label="Spacious" />
          </Box>
        </Flex>

        <Flex direction="column" gap="1">
          <Text size="1" weight="bold" style={{ color: "var(--ds-text-weak)", letterSpacing: "0.06em" }}>STATES — interactive · selected · disabled</Text>
          <Box data-testid="states" style={{ border: "1px solid var(--ds-stroke-weak)", borderRadius: "var(--ds-radius-3)" }}>
            <Item label="Clickable row" description="Hover for the tint; Tab for the ring" onClick={() => {}} />
            <Item label="Link row" href="#" />
            <Item label="Selected row" isSelected onClick={() => {}} />
            <Item label="Disabled row" description="Not available" isDisabled onClick={() => {}} />
          </Box>
        </Flex>
      </Flex>
    </Box>
  ),
  play: async ({ canvasElement }) => {
    const slots = canvasElement.querySelector('[data-testid="slots"] .rt-ds-item')!;
    // The slot order is marker? · start · content · end (start pushed before, end pushed after).
    if (!slots.querySelector(".rt-ds-item-start")) throw new Error("missing start slot");
    if (!slots.querySelector(".rt-ds-item-label")) throw new Error("missing label");
    if (!slots.querySelector(".rt-ds-item-description")) throw new Error("missing description");
    if (!slots.querySelector(".rt-ds-item-end")) throw new Error("missing end slot");

    // Interactive rows expose a REAL body control; a link row an <a>, a click row a <button>.
    const states = canvasElement.querySelector('[data-testid="states"]')!;
    const rows = Array.from(states.querySelectorAll<HTMLElement>(".rt-ds-item"));
    const clickRow = rows[0], linkRow = rows[1], disabledRow = rows[3];
    if (clickRow.querySelector(".rt-ds-item-body")?.tagName !== "BUTTON") throw new Error("onClick row body must be a <button>");
    if (linkRow.querySelector(".rt-ds-item-body")?.tagName !== "A") throw new Error("href row body must be an <a>");
    if (clickRow.getAttribute("data-interactive") !== "") throw new Error("an interactive row must carry data-interactive");
    // Disabled row: aria-disabled on the root + a natively-disabled body (exempt from contrast).
    if (disabledRow.getAttribute("aria-disabled") !== "true") throw new Error("disabled row must set aria-disabled");
    if (!(disabledRow.querySelector(".rt-ds-item-body") as HTMLButtonElement)?.disabled) throw new Error("disabled onClick body must be natively disabled");
  },
};

/* ---- Interactivity dual-model — the whole point of Item -------------------- */
function GuardHarness() {
  const [rowNoRole, setRowNoRole] = useState(0);
  const [innerNoRole, setInnerNoRole] = useState(0);
  const [rowRole, setRowRole] = useState(0);
  const [innerRole, setInnerRole] = useState(0);
  return (
    <Box p="4" style={{ maxWidth: 520 }}>
      {/* CASE A — NO parent role: content lives in an invisible <button>; the root's container handler
          gives the extended hit area but IGNORES clicks on the nested action button (no double-fire). */}
      <Box data-testid="caseA" style={{ border: "1px solid var(--ds-stroke-weak)", borderRadius: "var(--ds-radius-3)" }}>
        <Item
          label="Open project"
          description="click the body, the padding, or the action"
          onClick={() => setRowNoRole((n) => n + 1)}
          endContent={
            <button data-testid="innerA" type="button" onClick={() => setInnerNoRole((n) => n + 1)}>
              Action
            </button>
          }
        />
      </Box>
      {/* CASE B — parent role="menuitem": NO invisible button (the menu owns keyboard); onClick rides the
          root, still ignoring clicks on the nested action button. */}
      <Box data-testid="caseB" role="menu" style={{ marginTop: 16, border: "1px solid var(--ds-stroke-weak)", borderRadius: "var(--ds-radius-3)" }}>
        <Item
          role="menuitem"
          label="Rename"
          onClick={() => setRowRole((n) => n + 1)}
          endContent={
            <button data-testid="innerB" type="button" onClick={() => setInnerRole((n) => n + 1)}>
              Action
            </button>
          }
        />
      </Box>
      <Box mt="3">
        <Text size="1" data-testid="counts">
          {`rowNoRole=${rowNoRole} innerNoRole=${innerNoRole} rowRole=${rowRole} innerRole=${innerRole}`}
        </Text>
      </Box>
    </Box>
  );
}

export const InteractivityGuard: Story = {
  render: () => <GuardHarness />,
  play: async ({ canvasElement }) => {
    const counts = () => canvasElement.querySelector('[data-testid="counts"]')!.textContent!;
    const read = (k: string) => Number(new RegExp(`\\b${k}=(\\d+)`).exec(counts())![1]);
    // React flushes the state update from a native .click() asynchronously in this harness — poll for it.
    const wait = async (k: string, expected: number) => {
      for (let i = 0; i < 60; i++) {
        if (read(k) === expected) return;
        await new Promise((r) => setTimeout(r, 10));
      }
      throw new Error(`${k} expected ${expected}, got ${read(k)} — [${counts()}]`);
    };

    const caseA = canvasElement.querySelector('[data-testid="caseA"]')!;
    const bodyA = caseA.querySelector<HTMLButtonElement>(".rt-ds-item-body")!;
    const innerA = canvasElement.querySelector<HTMLButtonElement>('[data-testid="innerA"]')!;

    // Structure: NO parent role → the content is a REAL <button> body (single keyboard-operable control).
    if (bodyA.tagName !== "BUTTON") throw new Error("no-role interactive item must render a <button> body");

    // (1) Clicking the invisible body fires the row's onClick ONCE (the container handler ignores it).
    bodyA.click();
    await wait("rowNoRole", 1);

    // (2) Clicking the nested action button fires ONLY the action — NOT the row (no double-fire).
    innerA.click();
    await wait("innerNoRole", 1);
    if (read("rowNoRole") !== 1) throw new Error(`nested action click must NOT also fire the row onClick; got rowNoRole=${read("rowNoRole")}`);

    // (3) Extended hit area: a click on the row root (the padding, not the body/action) fires the row.
    const rootA = caseA.querySelector<HTMLElement>(".rt-ds-item")!;
    rootA.click(); // event target = the root itself → not inside button/a → fires
    await wait("rowNoRole", 2);

    const caseB = canvasElement.querySelector('[data-testid="caseB"]')!;
    const rowB = caseB.querySelector<HTMLElement>(".rt-ds-item")!;
    const innerB = canvasElement.querySelector<HTMLButtonElement>('[data-testid="innerB"]')!;

    // Structure: parent role → NO invisible body (a plain content span; the menu owns keyboard).
    if (rowB.querySelector(".rt-ds-item-body")) throw new Error("a parent-role item must NOT render an invisible button/anchor body");
    if (rowB.getAttribute("role") !== "menuitem") throw new Error("the role must reach the root");

    // (4) Clicking the row body fires the root onClick; clicking the nested action does NOT.
    (rowB.querySelector(".rt-ds-item-content") as HTMLElement).click();
    await wait("rowRole", 1);
    innerB.click();
    await wait("innerRole", 1);
    if (read("rowRole") !== 1) throw new Error(`nested action click must NOT double-fire the parent-role row; got rowRole=${read("rowRole")}`);
  },
};

/* ---- Truncation ----------------------------------------------------------- */
export const Truncation: Story = {
  render: () => (
    <Box p="4" style={{ maxWidth: 260 }}>
      <Box data-testid="trunc" style={{ border: "1px solid var(--ds-stroke-weak)", borderRadius: "var(--ds-radius-3)" }}>
        <Item
          label="A single-line label that is far too long to ever fit on one line"
          description="And a two-line description clamp that eventually stops after the second line of running text here"
          labelLines={1}
          descriptionLines={2}
        />
      </Box>
    </Box>
  ),
  play: async ({ canvasElement }) => {
    const row = canvasElement.querySelector('[data-testid="trunc"] .rt-ds-item')!;
    const label = row.querySelector<HTMLElement>(".rt-ds-item-label")!;
    const desc = row.querySelector<HTMLElement>(".rt-ds-item-description")!;
    // labelLines=1 → single-line ellipsis; descriptionLines=2 → webkit line-clamp box.
    if (getComputedStyle(label).textOverflow !== "ellipsis") throw new Error("labelLines=1 must apply text-overflow:ellipsis");
    if (getComputedStyle(label).whiteSpace !== "nowrap") throw new Error("labelLines=1 must apply white-space:nowrap");
    if ((getComputedStyle(desc) as unknown as { webkitLineClamp?: string }).webkitLineClamp !== "2" && desc.style.webkitLineClamp !== "2")
      throw new Error("descriptionLines=2 must apply a 2-line webkit line-clamp");
    // The label actually overflows its box (proves the clamp is doing work).
    if (label.scrollWidth <= label.clientWidth) throw new Error("expected the long label to overflow (clamped)");
  },
};

/* ---- Focus ring hoist ----------------------------------------------------- */
export const FocusRing: Story = {
  render: () => {
    const ref = useRef<HTMLElement>(null);
    return (
      <Box p="4" data-testid="focus">
        <Item ref={ref} label="Focus me with the keyboard" onClick={() => {}} />
      </Box>
    );
  },
  play: async ({ canvasElement }) => {
    // The hoist rule exists: .rt-ds-item[data-interactive]:has(.rt-ds-item-body:focus-visible) → the [[focus-ring]]
    // ring's base, --ds-stroke-focus, on outline-color (longhand, so the CSSOM keeps the value). The exact
    // var is matched, since --ds-stroke-focus-stack shares its prefix.
    const hoisted = Array.from(document.styleSheets).some((sheet) => {
      let rules: CSSRuleList;
      try { rules = sheet.cssRules; } catch { return false; }
      return Array.from(rules).some(
        (r) =>
          r instanceof CSSStyleRule &&
          /\.rt-ds-item\[data-interactive\][^,{]*:has\([^)]*\.rt-ds-item-body:focus-visible/.test(r.selectorText) &&
          /var\(\s*--ds-stroke-focus\s*[,)]/.test(r.style.outlineColor),
      );
    });
    if (!hoisted) throw new Error("the interactive Item focus ring is not hoisted via :has(.rt-ds-item-body:focus-visible)");

    // The body carries no skin of its own (all:unset → no underline, no UA button chrome).
    const body = canvasElement.querySelector<HTMLElement>('[data-testid="focus"] .rt-ds-item-body')!;
    if (getComputedStyle(body).textDecorationLine !== "none") throw new Error("the interactive body must strip the UA underline (all:unset)");
  },
};

/* ---- Link-component routing (the pluggable-Link seam, D-P3) ---------------- */
// A tiny custom framework Link — renders a plain <a data-custom> so the play can prove which tag the
// Item href body actually used. Satisfies LinkComponent = ComponentType<{href}&AnchorHTMLAttributes>.
function CustomLink({ children, ...rest }: { href: string } & AnchorHTMLAttributes<HTMLAnchorElement>) {
  return (
    <a data-custom="" {...rest}>
      {children}
    </a>
  );
}

export const LinkComponentRouting: Story = {
  render: () => (
    <Box p="4" style={{ maxWidth: 520 }}>
      {/* Inside a LinkProvider: the href body routes through the provided component. */}
      <Box data-testid="routed" style={{ border: "1px solid var(--ds-stroke-weak)", borderRadius: "var(--ds-radius-3)" }}>
        <LinkProvider component={CustomLink}>
          <Item label="Routed row" description="href body renders through the provided Link" href="/routed" />
        </LinkProvider>
      </Box>
      {/* No provider anywhere: the href body is a native <a> — the zero-change default. */}
      <Box data-testid="plain" style={{ marginTop: 16, border: "1px solid var(--ds-stroke-weak)", borderRadius: "var(--ds-radius-3)" }}>
        <Item label="Plain row" description="no provider → a native <a>" href="/plain" />
      </Box>
    </Box>
  ),
  play: async ({ canvasElement }) => {
    const routed = canvasElement.querySelector<HTMLAnchorElement>('[data-testid="routed"] .rt-ds-item-body')!;
    const plain = canvasElement.querySelector<HTMLAnchorElement>('[data-testid="plain"] .rt-ds-item-body')!;
    if (!routed || !plain) throw new Error("both fixtures must render an href body");

    // The seam: inside a LinkProvider the href body IS the provided component (data-custom present),
    // and the href reaches it.
    if (!routed.hasAttribute("data-custom")) throw new Error("Item href body inside a LinkProvider must render the provided component ([data-custom])");
    if (routed.getAttribute("href") !== "/routed") throw new Error("the href must reach the provided Link");

    // The default: WITHOUT a provider the body is a native <a> (no custom marker) — proving every
    // existing Item consumer (List / TreeList / Token, none of which pass a provider) is unchanged.
    if (plain.tagName !== "A") throw new Error("the no-provider href body must be a native <a>");
    if (plain.hasAttribute("data-custom")) throw new Error("an Item href with no provider must NOT use the custom component");
  },
};

/* ---- Selection cue ([[selected-row-cue]]) ---------------------------------------------------- */
/* A selected row reads bold in strong ink with a solid icon, and every other row reads regular with an
   outline icon. The specimen renders one row set per surface [[selected-row-cue]] names, each with one selected row:
   Item, List, the SideNav rows and its collapsed rail (a parent trigger included), TopNav (a menu
   trigger included), TreeList and the CommandPalette picker. Every icon is the same Star with no weight
   of its own, so its weight can come only from the row. The set renders twice: once bare, where a solid
   selected icon proves the row supplies the weight, and once under a solid IconContext, where an outline
   unselected icon proves no parent weight leaks into a row. */
const cueSource = createStaticSource([
  { id: "rest", label: "Rest" },
  { id: "picked", label: "Picked" },
  { id: "other", label: "Other" },
]);

function CueRows({ ctx }: { ctx: string }) {
  return (
    <Flex direction="column" gap="3" data-cue={ctx}>
      <Box data-part="item">
        <Item startContent={<Star />} label="Rest" onClick={() => {}} />
        <Item startContent={<Star />} label="Picked" isSelected onClick={() => {}} />
        <Item startContent={<Star />} label="Other" href={`#cue-${ctx}-item`} />
      </Box>
      <Box data-part="list">
        <List>
          <ListItem startContent={<Star />} label="Rest" onClick={() => {}} />
          <ListItem startContent={<Star />} label="Picked" isSelected onClick={() => {}} />
          <ListItem startContent={<Star />} label="Other" onClick={() => {}} />
        </List>
      </Box>
      <Flex gap="3" style={{ height: 200 }}>
        <Box data-part="sidenav" style={{ display: "flex" }}>
          <SideNav aria-label={`Cue rows ${ctx}`}>
            <SideNavSection>
              <SideNavItem icon={<Star />} label="Picked" href={`#cue-${ctx}-a`} isSelected />
              <SideNavItem icon={<Star />} label="Rest" href={`#cue-${ctx}-b`} />
              <SideNavItem icon={<Star />} label="Other" href={`#cue-${ctx}-c`} />
            </SideNavSection>
          </SideNav>
        </Box>
        <Box data-part="rail" style={{ display: "flex" }}>
          <SideNav aria-label={`Cue rail ${ctx}`} defaultCollapsed>
            <SideNavSection>
              <SideNavItem icon={<Star />} label="Picked" href={`#cue-${ctx}-d`} isSelected />
              <SideNavItem icon={<Star />} label="Rest" href={`#cue-${ctx}-e`} />
              <SideNavItem icon={<Star />} label="Group">
                <SideNavItem label="Child" href={`#cue-${ctx}-f`} />
              </SideNavItem>
            </SideNavSection>
          </SideNav>
        </Box>
      </Flex>
      <Box data-part="topnav">
        <TopNav aria-label={`Cue bar ${ctx}`}>
          <TopNavItem icon={<Star />} label="Picked" href={`#cue-${ctx}-g`} isSelected />
          <TopNavItem icon={<Star />} label="Rest" href={`#cue-${ctx}-h`} />
          <TopNavMenu label="More" icon={<Star />}>
            <TopNavItem label="Inner" href={`#cue-${ctx}-i`} />
          </TopNavMenu>
        </TopNav>
      </Box>
      <Box data-part="tree">
        <TreeList
          items={[
            { id: `${ctx}-rest`, label: "Rest", startContent: <Star />, isSelected: false, onClick: () => {} },
            { id: `${ctx}-picked`, label: "Picked", startContent: <Star />, isSelected: true, onClick: () => {} },
          ]}
        />
      </Box>
      <Box data-part="palette" style={{ width: 280 }}>
        <CommandPalette
          open
          isInline
          source={cueSource}
          value="picked"
          onValueChange={() => {}}
          onOpenChange={() => {}}
          showFooter={false}
          label={`Cue palette ${ctx}`}
          inputLabel={`Search cue commands ${ctx}`}
          listLabel={`Cue commands ${ctx}`}
          renderItem={(o) => (
            <Flex align="center" gap="2">
              <Star />
              <span>{o.label}</span>
            </Flex>
          )}
        />
      </Box>
    </Flex>
  );
}

/** A solid parent weight around a row set, the leak [[selected-row-cue]] closes. It keeps the rest of Phosphor's default
 *  context (size 1em, currentColor), as an app-level provider would, so only the weight differs. */
function SolidAbove({ children }: { children: ReactNode }) {
  const outer = useContext(IconContext);
  return <IconContext.Provider value={{ ...outer, weight: "fill" }}>{children}</IconContext.Provider>;
}

type CueRow = { where: string; selected: boolean; label: HTMLElement | null; icon: SVGElement | null };

/** Every row in one rendered set: the Item-built rows, the rail's buttons and trigger, the TopNav
 *  trigger and the palette options, each with its label (none on an icon-only control) and icon. */
function cueRows(set: HTMLElement): CueRow[] {
  const rows: CueRow[] = [];
  for (const part of ["item", "list", "sidenav", "topnav", "tree"]) {
    for (const row of set.querySelectorAll<HTMLElement>(`[data-part="${part}"] .rt-ds-item`)) {
      rows.push({
        where: `${part} "${row.textContent}"`,
        selected: row.hasAttribute("data-selected"),
        label: row.querySelector<HTMLElement>(":scope > :is(.rt-ds-item-content, .rt-ds-item-body) > .rt-ds-item-label"),
        icon: row.querySelector<SVGElement>(":scope > .rt-ds-item-start svg"),
      });
    }
  }
  for (const button of set.querySelectorAll<HTMLElement>('[data-part="rail"] :is(.rt-ds-sidenav-raillink, .rt-ds-sidenav-railtrigger)')) {
    rows.push({ where: `rail "${button.textContent}"`, selected: button.hasAttribute("data-selected"), label: null, icon: button.querySelector("svg") });
  }
  for (const trigger of set.querySelectorAll<HTMLElement>('[data-part="topnav"] .rt-ds-topnav-trigger')) {
    rows.push({ where: `topnav trigger "${trigger.textContent}"`, selected: false, label: null, icon: trigger.querySelector(".rt-ds-topnav-trigger-icon svg") });
  }
  for (const option of set.querySelectorAll<HTMLElement>('[data-part="palette"] .rt-ds-cmdk-option')) {
    rows.push({
      where: `palette "${option.textContent}"`,
      selected: option.getAttribute("aria-selected") === "true",
      label: option.querySelector<HTMLElement>(".rt-ds-cmdk-option-label span"),
      icon: option.querySelector("svg"),
    });
  }
  return rows;
}

export const SelectionCue: Story = {
  render: () => (
    <Box p="4" data-testid="selection-cue" style={{ maxWidth: 720 }}>
      <Box hidden data-testid="cue-weights">
        <Star weight="fill" data-weight="fill" />
        <Star weight="regular" data-weight="regular" />
      </Box>
      <Flex direction="column" gap="6">
        <CueRows ctx="bare" />
        <SolidAbove>
          <CueRows ctx="solid-above" />
        </SolidAbove>
      </Flex>
    </Box>
  ),
  play: async ({ canvasElement }) => {
    const shape = (weight: string) => canvasElement.querySelector(`[data-testid="cue-weights"] [data-weight="${weight}"] path`)?.getAttribute("d");
    const fill = shape("fill");
    const regular = shape("regular");
    if (!fill || !regular || fill === regular) throw new Error("the solid and outline Star reference shapes did not render apart");
    const sets = Array.from(canvasElement.querySelectorAll<HTMLElement>("[data-cue]"));
    if (sets.length !== 2) throw new Error(`expected the bare and solid-above row sets, found ${sets.length}`);
    // The palette bootstraps its options asynchronously, so wait for all three in both sets.
    for (let waited = 0; canvasElement.querySelectorAll('[data-part="palette"] .rt-ds-cmdk-option').length < 6; waited += 20) {
      if (waited > 3000) throw new Error("the CommandPalette options never rendered");
      const tick = Promise.withResolvers<void>();
      setTimeout(tick.resolve, 20);
      await tick.promise;
    }

    // One fresh theme per colour and appearance, the PartsWithoutText sweep in _non-text-contrast.
    const root = themeRoot(canvasElement);
    const host = document.createElement("div");
    host.style.cssText = "position:fixed;left:-9999px;top:0;width:720px";
    document.body.appendChild(host);
    const fails: string[] = [];
    let read = 0;
    const perSet = cueRows(sets[0]).length;
    try {
      for (const appearance of ["light", "dark"] as const) {
        for (const accent of ALL_ACCENTS) {
          host.replaceChildren();
          const theme = document.createElement("div");
          for (const a of Array.from(root.attributes)) {
            if (a.name !== "class" && a.name !== "style") theme.setAttribute(a.name, a.value);
          }
          theme.className = `radix-themes ${appearance}`;
          theme.setAttribute("data-accent-color", accent);
          for (const set of sets) theme.appendChild(set.cloneNode(true));
          host.appendChild(theme);
          const cs = getComputedStyle(theme);
          const strong = cs.getPropertyValue("--ds-font-weight-strong").trim();
          const base = cs.getPropertyValue("--ds-font-weight-base").trim();
          const ink = resolveColor(theme, "--ds-text-strong");
          for (const set of Array.from(theme.querySelectorAll<HTMLElement>("[data-cue]"))) {
            const rows = cueRows(set);
            const at = `[${appearance} ${accent} ${set.dataset.cue}]`;
            for (const part of ["item", "list", "sidenav", "rail", "topnav", "tree", "palette"]) {
              const picked = rows.filter((r) => r.selected && r.where.startsWith(`${part} `)).length;
              if (picked !== 1) fails.push(`${at} ${part}: expected one selected row, found ${picked}`);
            }
            for (const row of rows) {
              read++;
              const d = row.icon?.querySelector("path")?.getAttribute("d");
              const want = row.selected ? fill : regular;
              if (d !== want) {
                fails.push(`${at} ${row.where}: icon renders ${d === fill ? "solid" : d === regular ? "outline" : "no Star"}, want ${row.selected ? "solid" : "outline"}`);
              }
              if (!row.label) continue;
              const label = getComputedStyle(row.label);
              const weight = row.selected ? strong : base;
              if (label.fontWeight !== weight) {
                fails.push(`${at} ${row.where}: label weight ${label.fontWeight}, want ${weight} (${row.selected ? "--ds-font-weight-strong" : "--ds-font-weight-base"})`);
              }
              if (row.selected) {
                const got = parseColor(label.color);
                if (Math.max(Math.abs(got.r - ink.r), Math.abs(got.g - ink.g), Math.abs(got.b - ink.b)) > 1 || Math.abs(got.a - ink.a) > 0.01) {
                  fails.push(`${at} ${row.where}: label ink ${label.color}, want --ds-text-strong`);
                }
              }
            }
          }
        }
      }
    } finally {
      host.remove();
    }
    if (fails.length) throw new Error(`[[selected-row-cue]] selection cue, ${fails.length} failures:\n  ${fails.slice(0, 40).join("\n  ")}`);
    const want = 2 * ALL_ACCENTS.length * 2 * perSet;
    if (read !== want) throw new Error(`expected ${want} row readings, read ${read}`);
  },
};
