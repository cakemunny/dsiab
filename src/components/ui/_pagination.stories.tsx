import { useState } from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { Box } from "@radix-ui/themes";
import { Pagination } from "./Pagination";
import { generatePageRange } from "../../utils/generatePageRange";

/* Test-only behavior for Pagination — kept OUT of the docs stories (System/Pagination) so viewing a
   docs page doesn't drive the pager (plays click / keyboard it). Underscore-prefixed → registry- and
   story-order-guard-exempt, grouped under _internal. Covers: the pages render tracks generatePageRange,
   the active page's aria-current + disabled ends, dots selection-follows-focus + roving/wrap, the polite
   page announce, the page-size Select reset-to-1 wiring, and the empty-state null. */

async function waitFor<T>(fn: () => T | null | undefined | false, timeout = 2000): Promise<T> {
  const t0 = performance.now();
  for (;;) {
    const v = fn();
    if (v) return v as T;
    if (performance.now() - t0 > timeout) throw new Error("waitFor: timed out");
    await new Promise((r) => requestAnimationFrame(r));
  }
}
const press = (el: Element, key: string) =>
  el.dispatchEvent(new KeyboardEvent("keydown", { key, bubbles: true, cancelable: true }));
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
// Read a spy counter through a widening boundary — the handlers mutate the spy from OUTSIDE the play
// (in the render), which TS can't see, so it would otherwise narrow a prior-compared value to a literal.
const read = (n: number): number => n;

/* A controlled harness that records page changes on a module spy so plays can assert them. */
const spy = { page: 1, changes: 0, sizeChanges: 0, lastSize: 0 };
function Controlled({
  initial = 1,
  ...props
}: { initial?: number } & Omit<React.ComponentProps<typeof Pagination>, "page" | "onChange">) {
  const [page, setPage] = useState(initial);
  return (
    <Pagination
      page={page}
      onChange={(p) => { spy.page = p; spy.changes += 1; setPage(p); }}
      {...props}
    />
  );
}
function ControlledSize({
  initial = 1,
  ...props
}: { initial?: number } & Omit<React.ComponentProps<typeof Pagination>, "page" | "onChange" | "onPageSizeChange">) {
  const [page, setPage] = useState(initial);
  const [size, setSize] = useState<number>((props.pageSize as number) ?? 10);
  return (
    <Pagination
      page={page}
      pageSize={size}
      onChange={(p) => { spy.page = p; spy.changes += 1; setPage(p); }}
      onPageSizeChange={(s) => { spy.sizeChanges += 1; spy.lastSize = s; setSize(s); }}
      {...props}
    />
  );
}

const meta: Meta<typeof Pagination> = {
  title: "_internal/Pagination behavior",
  component: Pagination,
  parameters: { controls: { disable: true } },
};
export default meta;
type Story = StoryObj<typeof Pagination>;

/** The `pages` render exactly tracks generatePageRange: a Button per number, an aria-hidden … per gap,
 *  and aria-current on the active page. */
export const PagesRender: Story = {
  render: () => (
    <Box p="4">
      <Controlled initial={10} totalPages={20} siblingCount={1} variant="pages" label="Pages render" />
    </Box>
  ),
  play: async ({ canvasElement }) => {
    const nav = canvasElement.querySelector<HTMLElement>(".rt-ds-pagination")!;
    const expected = generatePageRange(10, 20, 1); // [1,'...',9,10,11,'...',20]

    // The numbered buttons, in order.
    const pageBtns = Array.from(nav.querySelectorAll<HTMLElement>(".rt-ds-pagination__page"));
    const nums = pageBtns.map((b) => Number(b.textContent));
    const expectedNums = expected.filter((x) => x !== "...");
    if (JSON.stringify(nums) !== JSON.stringify(expectedNums))
      throw new Error(`page buttons ${JSON.stringify(nums)} must equal generatePageRange numbers ${JSON.stringify(expectedNums)}`);

    // The ellipsis spans, aria-hidden, one per '...'.
    const ell = Array.from(nav.querySelectorAll<HTMLElement>(".rt-ds-pagination__ellipsis"));
    const expectedEll = expected.filter((x) => x === "...").length;
    if (ell.length !== expectedEll)
      throw new Error(`expected ${expectedEll} ellipsis spans; got ${ell.length}`);
    for (const e of ell) {
      if (e.getAttribute("aria-hidden") !== "true") throw new Error("ellipsis must be aria-hidden");
      if (e.tabIndex >= 0) throw new Error("ellipsis must not be focusable");
    }

    // aria-current on exactly the active page (10), and only it.
    const current = pageBtns.filter((b) => b.getAttribute("aria-current") === "page");
    if (current.length !== 1) throw new Error(`exactly one page must be aria-current; got ${current.length}`);
    if (Number(current[0].textContent) !== 10) throw new Error("page 10 must be the current page");
    if (current[0].getAttribute("data-current") !== "") throw new Error("the current page must carry data-current for the tint");
  },
};

/** Prev/Next disable at the range ends: page 1 → prev off; last page → next off. */
export const DisabledEnds: Story = {
  render: () => (
    <Box p="4" style={{ display: "flex", gap: 24, flexDirection: "column" }}>
      <Controlled initial={1} totalPages={5} variant="pages" label="At the start" />
      <Controlled initial={5} totalPages={5} variant="pages" label="At the end" />
    </Box>
  ),
  play: async ({ canvasElement }) => {
    const navs = canvasElement.querySelectorAll<HTMLElement>(".rt-ds-pagination");
    const prevOf = (n: HTMLElement) => n.querySelector<HTMLButtonElement>('[aria-label="Go to previous page"]')!;
    const nextOf = (n: HTMLElement) => n.querySelector<HTMLButtonElement>('[aria-label="Go to next page"]')!;

    // At page 1: prev disabled, next enabled.
    if (!prevOf(navs[0]).disabled) throw new Error("prev must be disabled on page 1");
    if (nextOf(navs[0]).disabled) throw new Error("next must be enabled on page 1 of 5");

    // At the last page: next disabled, prev enabled.
    if (prevOf(navs[1]).disabled) throw new Error("prev must be enabled on the last page");
    if (!nextOf(navs[1]).disabled) throw new Error("next must be disabled on the last page");
  },
};

/** Dots — selection-follows-focus + 1D roving with wrap, plus the Safari click-to-focus workaround. */
export const DotsRovingSelection: Story = {
  render: () => (
    <Box p="4">
      <Controlled initial={1} totalPages={5} variant="dots" label="Dots roving" />
    </Box>
  ),
  play: async ({ canvasElement }) => {
    spy.changes = 0;
    const group = canvasElement.querySelector<HTMLElement>(".rt-ds-pagination__dots")!;
    const dots = () => Array.from(group.querySelectorAll<HTMLButtonElement>(".rt-ds-pagination__dot"));
    const activeIndex = () => dots().findIndex((d) => d.getAttribute("aria-current") === "page");

    // Exactly one tab stop: the active dot (page 1) is tabIndex 0, the rest -1.
    const tabbable = dots().filter((d) => d.tabIndex === 0);
    if (tabbable.length !== 1 || activeIndex() !== 0)
      throw new Error("only the active (page 1) dot may be the tab stop");

    // Tabbing IN focuses the active dot — a no-op (next === current), so no page change.
    dots()[0].focus();
    await sleep(0);
    if (read(spy.changes) !== 0) throw new Error("focusing the already-active dot must NOT change the page");

    // ArrowRight → focus moves to dot 2 and selection follows (page 2).
    press(dots()[0], "ArrowRight");
    await waitFor(() => activeIndex() === 1);
    if (read(spy.page) !== 2) throw new Error(`ArrowRight must select page 2; got ${spy.page}`);
    if (document.activeElement !== dots()[1]) throw new Error("focus must be on dot 2 after ArrowRight");

    // End → last dot (page 5).
    press(dots()[1], "End");
    await waitFor(() => activeIndex() === 4);
    if (read(spy.page) !== 5) throw new Error(`End must select the last page (5); got ${spy.page}`);

    // ArrowRight wraps from the last dot back to the first (page 1).
    press(dots()[4], "ArrowRight");
    await waitFor(() => activeIndex() === 0);
    if (read(spy.page) !== 1) throw new Error(`ArrowRight on the last dot must wrap to page 1; got ${spy.page}`);

    // ArrowLeft wraps from the first dot to the last (page 5).
    press(dots()[0], "ArrowLeft");
    await waitFor(() => activeIndex() === 4);
    if (read(spy.page) !== 5) throw new Error(`ArrowLeft on the first dot must wrap to page 5; got ${spy.page}`);

    // Clicking a dot focuses it (Safari workaround) → selection follows (page 3).
    dots()[2].click();
    await waitFor(() => activeIndex() === 2);
    if (read(spy.page) !== 3) throw new Error(`clicking dot 3 must select page 3; got ${spy.page}`);
  },
};

/** The polite live region announces "Page N of M" on a user-driven change. */
export const PageAnnounce: Story = {
  render: () => (
    <Box p="4">
      <Controlled initial={1} totalPages={8} variant="compact" label="Announce" />
    </Box>
  ),
  play: async ({ canvasElement }) => {
    const next = canvasElement.querySelector<HTMLButtonElement>('[aria-label="Go to next page"]')!;
    next.click();
    const region = await waitFor(() =>
      document.querySelector<HTMLElement>('[data-ds-live-region="polite"]'),
    );
    await waitFor(() => region.textContent === "Page 2 of 8");
    if (region.getAttribute("aria-live") !== "polite")
      throw new Error("the page announce must ride the polite region");
  },
};

/** The page-size Select changes the size and resets to page 1 (my handlePageSizeChange wiring). */
export const PageSizeReset: Story = {
  render: () => (
    <Box p="4">
      <ControlledSize initial={4} totalItems={480} pageSize={20} pageSizeOptions={[10, 20, 50]} variant="count" label="Page size" />
    </Box>
  ),
  play: async ({ canvasElement }) => {
    spy.changes = 0;
    spy.sizeChanges = 0;
    spy.lastSize = 0;

    const trigger = canvasElement.querySelector<HTMLElement>('.rt-ds-pagination__pagesize .rt-SelectTrigger')!;
    if (trigger.getAttribute("aria-label") !== "Items per page")
      throw new Error('the page-size trigger must be named "Items per page"');

    // Open the Radix Select (it opens on pointerdown), then pick "50" from the portaled listbox.
    trigger.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true, cancelable: true, button: 0, pointerType: "mouse" }));
    trigger.dispatchEvent(new PointerEvent("pointerup", { bubbles: true, cancelable: true, button: 0, pointerType: "mouse" }));
    trigger.click();

    const option = await waitFor(() => {
      const opts = Array.from(document.querySelectorAll<HTMLElement>('[role="option"]'));
      return opts.find((o) => o.textContent?.trim() === "50") ?? null;
    });
    option.click();

    await waitFor(() => spy.sizeChanges === 1 && spy.lastSize === 50);
    // Changing the page size resets to page 1.
    await waitFor(() => spy.page === 1);
  },
};

/** The `count` info text holds its width as the page changes — the system's tabular-figures rule
 *  (GUIDELINES §3) measured on the PAINT, not on the declaration.
 *
 *  Why the specimen is built this way: page 2 of 250-in-tens reads "11–20 of 250" and page 3 reads
 *  "21–30 of 250" — same character count, same DIGIT count in all three numbers, so under tabular
 *  figures the two strings must measure identically. A flip that ADDS a digit (9 → 10) legitimately
 *  widens and is not a valid subject; neither is `.rt-ds-pagination__page`, whose `min-width` floor
 *  hides the difference at one digit. The separator is U+2013 EN DASH (Pagination.tsx), not a hyphen.
 *
 *  The assertion is a `Range` around the text, not `getComputedStyle` — a computed-style read only
 *  fails if someone deletes the declaration, while the width read fails if the declaration is deleted
 *  OR outranked OR aimed at an element that doesn't paint the digits. Falsified by removing
 *  `font-variant-numeric` from `.rt-ds-pagination__info`: 71.05px vs 73.58px, drift 2.53px against a
 *  0.05px budget, in both the light and dark projects. */
export const TabularInfo: Story = {
  render: () => (
    <Box p="4">
      <Controlled initial={2} totalItems={250} pageSize={10} variant="count" label="Tabular info" />
    </Box>
  ),
  play: async ({ canvasElement }) => {
    const nav = canvasElement.querySelector<HTMLElement>(".rt-ds-pagination")!;
    const info = nav.querySelector<HTMLElement>(".rt-ds-pagination__info")!;
    // U+2013 EN DASH — the character Pagination actually renders.
    const AT_PAGE_2 = "11–20 of 250";
    const AT_PAGE_3 = "21–30 of 250";

    // Measure the painted text, not the box: the box has padding and a min-width floor of its own,
    // either of which could absorb a real width change and report a false green.
    const textW = (el: Element) => {
      const r = document.createRange();
      r.selectNodeContents(el);
      return r.getBoundingClientRect().width;
    };

    if (info.textContent !== AT_PAGE_2)
      throw new Error(`the specimen must open on "${AT_PAGE_2}"; got "${info.textContent}"`);
    const before = textW(info);

    nav.querySelector<HTMLButtonElement>('[aria-label="Go to next page"]')!.click();
    await waitFor(() => info.textContent === AT_PAGE_3);
    const after = textW(info);

    const drift = Math.abs(after - before);
    if (drift > 0.05)
      throw new Error(
        `an in-place number must not change width at a constant digit count: "${AT_PAGE_2}" ${before.toFixed(2)}px ` +
        `vs "${AT_PAGE_3}" ${after.toFixed(2)}px, drift ${drift.toFixed(2)}px ` +
        `(font-variant-numeric reads "${getComputedStyle(info).fontVariantNumeric}")`,
      );
  },
};

/** Empty state: totalItems <= 0 renders nothing. */
export const EmptyState: Story = {
  render: () => (
    <Box p="4" data-testid="host">
      <Controlled initial={1} totalItems={0} variant="pages" label="Empty" />
    </Box>
  ),
  play: async ({ canvasElement }) => {
    const host = canvasElement.querySelector<HTMLElement>('[data-testid="host"]')!;
    if (host.querySelector(".rt-ds-pagination"))
      throw new Error("Pagination must render null when totalItems <= 0");
  },
};
