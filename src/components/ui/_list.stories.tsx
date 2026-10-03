import { useState } from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { Box, Text } from "@radix-ui/themes";
import { List, ListItem } from "./List";

/* Test-only BEHAVIOR for List/ListItem — kept OUT of the docs stories (System/List) so viewing a docs
   page never drives clicks/focus. Underscore-prefixed → registry- & story-order-guard-exempt, grouped
   under _internal. Pins: markers, dividers, the Safari role=list fix, aria-labelledby header wiring, the
   ordered counter + start, and the interactive-row guard (delegated to Item, re-checked at the List level). */

const meta: Meta<typeof List> = {
  title: "_internal/List behavior",
  component: List,
  parameters: { controls: { disable: true } },
};
export default meta;
type Story = StoryObj<typeof List>;

/* ---- Semantics: role=list (Safari) + header aria-labelledby --------------- */
export const Semantics: Story = {
  render: () => (
    <Box p="4" style={{ display: "flex", gap: 24, flexWrap: "wrap" }}>
      <Box data-testid="plain" style={{ width: 240 }}>
        <List header={<Text size="2" weight="bold">Account</Text>}>
          <ListItem label="Profile" />
          <ListItem label="Security" />
        </List>
      </Box>
      <Box data-testid="disc" style={{ width: 240 }}>
        <List listStyle="disc"><ListItem label="One" /><ListItem label="Two" /></List>
      </Box>
      <Box data-testid="ordered" style={{ width: 240 }}>
        <List listStyle="decimal" start={5}><ListItem label="Fifth" /><ListItem label="Sixth" /></List>
      </Box>
    </Box>
  ),
  play: async ({ canvasElement }) => {
    // Marker-less <ul> re-adds role="list" (Safari drops list semantics under list-style:none).
    const plainUl = canvasElement.querySelector<HTMLElement>('[data-testid="plain"] ul')!;
    if (plainUl.tagName !== "UL") throw new Error("a non-decimal list must be a <ul>");
    if (plainUl.getAttribute("role") !== "list") throw new Error('a marker-less <ul> must re-add role="list" (Safari fix)');

    // Header wired via aria-labelledby → the header node's id.
    const labelledBy = plainUl.getAttribute("aria-labelledby");
    if (!labelledBy) throw new Error("a list with a header must set aria-labelledby");
    const header = canvasElement.querySelector(`#${CSS.escape(labelledBy)}`);
    if (!header || !/Account/.test(header.textContent ?? "")) throw new Error("aria-labelledby must point at the header node");

    // A disc <ul> keeps native list semantics → no forced role="list" (markers preserve semantics).
    const discUl = canvasElement.querySelector<HTMLElement>('[data-testid="disc"] ul')!;
    if (discUl.getAttribute("role") === "list") throw new Error("a marker <ul> should NOT force role=list (it keeps native semantics)");

    // Decimal → a real <ol>; start!=1 emits the start attribute (AT ordinal correctness).
    const ol = canvasElement.querySelector<HTMLElement>('[data-testid="ordered"] ol')!;
    if (ol.tagName !== "OL") throw new Error("a decimal list must be an <ol>");
    if (ol.getAttribute("start") !== "5") throw new Error(`start=5 must be emitted on the <ol>; got ${ol.getAttribute("start")}`);
    // The <ol> has no forced role (native ordered semantics kept).
    if (ol.getAttribute("role") === "list") throw new Error("an <ol> must not force role=list");
  },
};

/* ---- Markers: dot / circle / decimal counter ------------------------------ */
export const Markers: Story = {
  render: () => (
    <Box p="4" style={{ display: "flex", gap: 24 }}>
      <Box data-testid="disc" style={{ width: 200 }}><List listStyle="disc"><ListItem label="A" /><ListItem label="B" /></List></Box>
      <Box data-testid="circle" style={{ width: 200 }}><List listStyle="circle"><ListItem label="A" /><ListItem label="B" /></List></Box>
      <Box data-testid="decimal" style={{ width: 200 }}><List listStyle="decimal" start={3}><ListItem label="A" /><ListItem label="B" /><ListItem label="C" /></List></Box>
    </Box>
  ),
  play: async ({ canvasElement }) => {
    const disc = canvasElement.querySelector('[data-testid="disc"]')!;
    if (!disc.querySelector(".rt-ds-list-dot")) throw new Error("disc must render a filled dot marker");

    const circle = canvasElement.querySelector('[data-testid="circle"]')!;
    const circleEl = circle.querySelector<HTMLElement>(".rt-ds-list-circle");
    if (!circleEl) throw new Error("circle must render a hollow-circle marker");
    // Hollow: transparent fill + a visible border.
    if (getComputedStyle(circleEl).backgroundColor !== "rgba(0, 0, 0, 0)") throw new Error("the circle marker must be hollow (transparent fill)");

    // Decimal marker: a CSS counter (the browser resolves the VISIBLE number; getComputedStyle returns the
    // UNRESOLVED `counter(ds-list) "."`, so we assert the WIRING: the ::before reads the ds-list counter,
    // the <ol> seeds it at start-1 (start=3 → reset "ds-list 2"), and each row increments it.
    const decimal = canvasElement.querySelector('[data-testid="decimal"]')!;
    const firstNumber = decimal.querySelector<HTMLElement>(".rt-ds-item .rt-ds-list-number");
    if (!firstNumber) throw new Error("decimal must render a .rt-ds-list-number marker");
    const beforeContent = getComputedStyle(firstNumber, "::before").content;
    if (!/counter\(ds-list\)/.test(beforeContent)) throw new Error(`the decimal marker ::before must read counter(ds-list); got ${beforeContent}`);
    const ol = decimal.querySelector<HTMLElement>("ol")!;
    if (ol.style.counterReset !== "ds-list 2") throw new Error(`start=3 must seed counter-reset "ds-list 2"; got "${ol.style.counterReset}"`);
    const firstItem = decimal.querySelector<HTMLElement>(".rt-ds-item")!;
    if (!/ds-list/.test(getComputedStyle(firstItem).counterIncrement)) throw new Error(`each decimal row must counter-increment ds-list; got "${getComputedStyle(firstItem).counterIncrement}"`);
    // start=3 emits start=3 on the <ol> (AT ordinal correctness), and there are 3 rows (3,4,5 visually).
    if (ol.getAttribute("start") !== "3") throw new Error(`the <ol> must carry start=3; got ${ol.getAttribute("start")}`);
  },
};

/* ---- Dividers: gap collapses, hairline rules, squared corners ------------- */
export const Dividers: Story = {
  render: () => (
    <Box p="4" style={{ width: 320 }}>
      <Box data-testid="divided" style={{ border: "1px solid var(--ds-stroke-weak)", borderRadius: "var(--ds-radius-3)" }}>
        <List hasDividers>
          <ListItem label="First" />
          <ListItem label="Second" />
          <ListItem label="Last" />
        </List>
      </Box>
    </Box>
  ),
  play: async ({ canvasElement }) => {
    const ul = canvasElement.querySelector<HTMLElement>('[data-testid="divided"] ul')!;
    if (ul.getAttribute("data-dividers") !== "") throw new Error("hasDividers must stamp data-dividers on the list");
    // Gap collapses to 0 with dividers on.
    if (parseFloat(getComputedStyle(ul).rowGap || "0") !== 0) throw new Error("dividers should collapse the row gap to 0");

    const rows = Array.from(ul.querySelectorAll<HTMLElement>(".rt-ds-item"));
    // Non-last rows carry a bottom hairline; the last row does not.
    const first = getComputedStyle(rows[0]);
    const last = getComputedStyle(rows[rows.length - 1]);
    if (parseFloat(first.borderBottomWidth) <= 0) throw new Error("a divided row (not last) must have a bottom border");
    if (parseFloat(last.borderBottomWidth) !== 0) throw new Error("the LAST divided row must have no bottom border");
    // Corners squared under dividers.
    if (parseFloat(first.borderTopLeftRadius) !== 0) throw new Error("divided rows should be squared (radius 0)");
  },
};

/* ---- Interactive rows: invisible-button + no double-fire ------------------ */
function InteractiveHarness() {
  const [rowClicks, setRowClicks] = useState(0);
  const [actionClicks, setActionClicks] = useState(0);
  return (
    <Box p="4" style={{ width: 360 }}>
      <Box data-testid="list" style={{ border: "1px solid var(--ds-stroke-weak)", borderRadius: "var(--ds-radius-3)" }}>
        <List>
          <ListItem
            label="Open ticket"
            description="the whole row is one control"
            onClick={() => setRowClicks((n) => n + 1)}
            endContent={<button data-testid="action" type="button" onClick={() => setActionClicks((n) => n + 1)}>Assign</button>}
          />
          <ListItem label="Docs" href="#docs" />
        </List>
      </Box>
      <Text size="1" data-testid="counts">{`row=${rowClicks} action=${actionClicks}`}</Text>
    </Box>
  );
}

export const InteractiveRows: Story = {
  render: () => <InteractiveHarness />,
  play: async ({ canvasElement }) => {
    const list = canvasElement.querySelector('[data-testid="list"]')!;
    const rows = Array.from(list.querySelectorAll<HTMLElement>(".rt-ds-item"));
    // onClick row → a real <button> body; href row → a real <a> body (li roots, one control each).
    if (rows[0].tagName !== "LI") throw new Error("ListItem must render an <li> root");
    if (rows[0].querySelector(".rt-ds-item-body")?.tagName !== "BUTTON") throw new Error("onClick row must render a <button> body");
    if (rows[1].querySelector(".rt-ds-item-body")?.tagName !== "A") throw new Error("href row must render an <a> body");

    const counts = () => canvasElement.querySelector('[data-testid="counts"]')!.textContent!;
    const read = (k: string) => Number(new RegExp(`\\b${k}=(\\d+)`).exec(counts())![1]);
    // The state update from a native .click() flushes asynchronously in this harness — poll for it.
    const wait = async (k: string, expected: number) => {
      for (let i = 0; i < 60; i++) {
        if (read(k) === expected) return;
        await new Promise((r) => setTimeout(r, 10));
      }
      throw new Error(`${k} expected ${expected}, got ${read(k)} — [${counts()}]`);
    };

    // Clicking the row body fires the row once.
    (rows[0].querySelector(".rt-ds-item-body") as HTMLButtonElement).click();
    await wait("row", 1);

    // Clicking the nested Assign button fires ONLY the action — not the row (no double-fire).
    canvasElement.querySelector<HTMLButtonElement>('[data-testid="action"]')!.click();
    await wait("action", 1);
    if (read("row") !== 1) throw new Error(`the nested action click must NOT double-fire the row onClick; got row=${read("row")}`);
  },
};
