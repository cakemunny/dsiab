import type { Meta, StoryObj } from "@storybook/react-vite";
import { Box } from "@radix-ui/themes";
import { Calendar } from "./Calendar";
import type { ISODateString } from "../../dates/dateTypes";
import {
  plainDateFromISO,
  plainDateToISO,
  plainDateAddDays,
  plainDateSetStartOfWeek,
  plainDateSetFirstOfMonth,
  plainDateToday,
  plainDateFormat,
  DATE_FORMAT_MONTH_YEAR,
  DATE_FORMAT_WITH_WEEKDAY,
} from "../../dates/plainDate";

/* _internal — the Calendar BEHAVIORAL test suite. Underscore-prefixed → the `_internal` group, exempt from
   the registry node-guard AND the story-order guard (like `_typeahead`/`_toast`). Storybook runs a story's
   `play` on VIEW, and these plays DRIVE the grid — moving the roving focus, flipping the month, dragging a
   range band. That visibly flashes/animates the calendar, so every behavioral play lives HERE and the docs
   stories (System/Calendar) stay calm and static on view. 100% of the coverage still runs in `npm test`
   (vitest browser mode; axe on every story). Each story renders its OWN pinned specimen and drives it.

   The engine under test is the shared date math + `useGridFocus` (DECISIONS [[catalog-as-specification]]) wired to
   this system's markup: the assertions cover roving walk, edge callbacks, roving-tabindex single stop, and
   RTL arrow swap on the real Calendar DOM. Dates are
   pinned to 2026-07 so the grid geometry is deterministic (July 1 2026 is a Wednesday → the Sunday-start
   grid spans 2026-06-28 … 2026-08-08) — EXCEPT the aria-current probe, which by definition reads the real
   "today" and computes its ISO in-test. */

/* ---- play helpers -------------------------------------------------------- */
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
async function waitFor<T>(fn: () => T | null | undefined | false, timeout = 1500): Promise<T> {
  const t0 = performance.now();
  for (;;) {
    const r = fn();
    if (r) return r as T;
    if (performance.now() - t0 > timeout) throw new Error("waitFor: timed out");
    await sleep(15);
  }
}

// Pin an ISO literal without fighting the template-literal type at every call site.
const D = (s: string): ISODateString => s as ISODateString;
const addDays = (s: string, n: number) => plainDateToISO(plainDateAddDays(plainDateFromISO(D(s)), n));
const startOfWeek = (s: string) => plainDateToISO(plainDateSetStartOfWeek(plainDateFromISO(D(s)), 0));
const firstOfMonth = (s: string) => plainDateToISO(plainDateSetFirstOfMonth(plainDateFromISO(D(s))));
const monthYear = (s: string) => plainDateFormat(plainDateFromISO(D(s)), DATE_FORMAT_MONTH_YEAR);

const ANCHOR = "2026-07-15"; // a Wednesday, comfortably mid-month
const noop = () => {};

// The machine-readable day identity is `data-date` on the button (the human aria-label is never parsed).
const activeDate = () => document.activeElement?.getAttribute("data-date") ?? null;
const dayBtn = (scope: ParentNode, iso: string) =>
  scope.querySelector<HTMLButtonElement>(`button[data-date="${iso}"]`);
const dayButtons = (scope: ParentNode) =>
  [...scope.querySelectorAll<HTMLButtonElement>("button.rt-ds-calendar-day")];
const heading = (scope: ParentNode) =>
  scope.querySelector<HTMLElement>(".rt-ds-calendar-heading")?.textContent ?? "";
const gridOf = (scope: ParentNode) => scope.querySelector<HTMLElement>('[role="grid"]')!;

// Dispatch a keydown at the currently-focused cell (bubbles to the grid's onKeyDown).
function keyAtFocus(key: string, mods: KeyboardEventInit = {}) {
  const el =
    document.activeElement && document.activeElement !== document.body
      ? document.activeElement
      : document.querySelector('[role="grid"]');
  el?.dispatchEvent(new KeyboardEvent("keydown", { key, bubbles: true, cancelable: true, ...mods }));
}
function keyOn(el: Element, key: string, mods: KeyboardEventInit = {}) {
  el.dispatchEvent(new KeyboardEvent("keydown", { key, bubbles: true, cancelable: true, ...mods }));
}
const hover = (el: Element) => el.dispatchEvent(new MouseEvent("mouseover", { bubbles: true }));

/* ---- view-jump (month / year grid) helpers ------------------------------- */
const trigger = (scope: ParentNode, kind: "month" | "year") =>
  scope.querySelector<HTMLButtonElement>(`.rt-ds-calendar-caption-btn[data-picker-trigger="${kind}"]`);
const pickerGrid = (scope: ParentNode) => scope.querySelector<HTMLElement>(".rt-ds-calendar-picker");
const options = (scope: ParentNode) =>
  [...scope.querySelectorAll<HTMLButtonElement>(".rt-ds-calendar-picker-option")];
const option = (scope: ParentNode, value: string) =>
  scope.querySelector<HTMLButtonElement>(`.rt-ds-calendar-picker-option[data-picker-value="${value}"]`);
const navBtn = (scope: ParentNode, label: string) =>
  scope.querySelector<HTMLButtonElement>(`.rt-ds-calendar-nav-slot button[aria-label="${label}"]`);

/* ---- caption-row geometry (the "does the title move?" probe) -------------- */
/* Read in LAYOUT terms, not style terms: a rule can be present and still not hold the box
   (an empty flex container honours `min-width` and collapses to 0 height all the same). */
type CapBox = { x: number; y: number; w: number; h: number };
const round2 = (n: number) => Math.round(n * 100) / 100;
const boxWithin = (el: Element, origin: DOMRect): CapBox => {
  const r = el.getBoundingClientRect();
  return { x: round2(r.x - origin.x), y: round2(r.y - origin.y), w: round2(r.width), h: round2(r.height) };
};
/** Every caption row in the calendar, plus the calendar's own seat inside its block parent. */
function captionGeometry(scope: ParentNode) {
  const root = scope.querySelector<HTMLElement>(".rt-ds-calendar")!;
  const rootRect = root.getBoundingClientRect();
  const host = root.parentElement!;
  const hostRect = host.getBoundingClientRect();
  const hostStyle = getComputedStyle(host);
  const rows = [...root.querySelectorAll(".rt-ds-calendar-caption")].map((cap) => ({
    row: boxWithin(cap, rootRect),
    children: [...cap.children].map((c) => boxWithin(c, rootRect)),
  }));
  return {
    /* The root is inline-level, so it rides its parent's text baseline and a change INSIDE the
       caption can move the whole component. Height is excluded on purpose — the three views
       genuinely stack different grids — but the seat must not budge. */
    seat: {
      x: round2(rootRect.x - hostRect.x - parseFloat(hostStyle.paddingLeft)),
      y: round2(rootRect.y - hostRect.y - parseFloat(hostStyle.paddingTop)),
      w: round2(rootRect.width),
    },
    rows,
  };
}
function expectSameGeometry(a: unknown, b: unknown, msg: string) {
  const [ja, jb] = [JSON.stringify(a), JSON.stringify(b)];
  if (ja !== jb) throw new Error(`${msg}\n  day view: ${ja}\n  other:    ${jb}`);
}
// The announcement region is the useAnnounce SINGLETON on <body>, not inside the story canvas.
const liveRegion = () => document.querySelector<HTMLElement>('[data-ds-live-region="polite"]');
const clearLive = () => {
  const r = liveRegion();
  if (r) r.textContent = "";
};
// announce() clears, then re-sets on the NEXT frame — so always wait, never read synchronously.
async function expectAnnounced(text: string, msg: string) {
  await waitFor(() => liveRegion()?.textContent === text, 2000).catch(() => {
    throw new Error(`${msg}: expected the polite live region to read "${text}", got "${liveRegion()?.textContent ?? "(no region)"}"`);
  });
}
const activeText = () => document.activeElement?.textContent ?? null;

// Assert the focused day synchronously (React flushes discrete keydown updates + layout-effect focus steals
// before dispatchEvent returns; the async view-reflip is a passive effect that has NOT run yet).
function expectFocus(iso: string, msg: string) {
  if (activeDate() !== iso) throw new Error(`${msg}: expected focus on ${iso}, got ${activeDate()}`);
}
// Assert the focused day after an async month/year flip (moveFocusTo re-renders, then steals focus).
async function expectFocusEventually(iso: string, msg: string) {
  const t0 = performance.now();
  while (activeDate() !== iso) {
    if (performance.now() - t0 > 1500) throw new Error(`${msg}: expected focus on ${iso}, got ${activeDate()}`);
    await sleep(15);
  }
}

const meta: Meta<typeof Calendar> = {
  title: "_internal/Calendar behavior",
  component: Calendar,
  parameters: { controls: { disable: true } },
};
export default meta;
type Story = StoryObj<typeof Calendar>;

/* ========================================================================== */

/** Roving keyboard walk within the grid — arrows move by the true grid geometry (±1 day / ±7 rows),
 *  Home/End hit the week edges, Ctrl+Home/Ctrl+End the first/last focusable cell in the grid. Each step
 *  asserts `document.activeElement`'s `data-date` (grid-nav cases). */
export const KeyboardRovingWithinGrid: Story = {
  render: () => (
    <Box p="4" data-testid="cal-walk">
      <Calendar focusDate={D(ANCHOR)} onValueChange={noop} />
    </Box>
  ),
  play: async ({ canvasElement }) => {
    const scope = canvasElement.querySelector<HTMLElement>('[data-testid="cal-walk"]')!;
    const seed = () => {
      const b = dayBtn(scope, ANCHOR)!;
      b.focus();
    };

    seed();
    await sleep(0);
    expectFocus(ANCHOR, "focusing the seed lands on the pinned day");

    keyAtFocus("ArrowRight");
    await sleep(0);
    expectFocus(addDays(ANCHOR, 1), "ArrowRight moves one day forward");

    keyAtFocus("ArrowLeft");
    await sleep(0);
    expectFocus(ANCHOR, "ArrowLeft moves one day back");

    keyAtFocus("ArrowDown");
    await sleep(0);
    expectFocus(addDays(ANCHOR, 7), "ArrowDown moves one week (row) forward");

    keyAtFocus("ArrowUp");
    await sleep(0);
    expectFocus(ANCHOR, "ArrowUp moves one week (row) back");

    // Home → first cell of the week row; End → last cell of that row (weekStartsOn=0 → Sun…Sat).
    keyAtFocus("Home");
    await sleep(0);
    expectFocus(startOfWeek(ANCHOR), "Home moves to the start of the week row");

    keyAtFocus("End");
    await sleep(0);
    expectFocus(addDays(startOfWeek(ANCHOR), 6), "End moves to the end of the week row");

    // Ctrl+End → last IN-MONTH day. Outside/adjacent-month days are non-roving-focusable (so an edge arrow
    // flips the month instead of landing on a greyed spillover), which makes the last FOCUSABLE cell the
    // month's last day, not the trailing grid corner. It's already visible → no reflip; assert synchronously.
    const lastInMonth = D("2026-07-31"); // last in-month day of the pinned July-2026 specimen
    seed();
    await sleep(0);
    keyAtFocus("End", { ctrlKey: true });
    expectFocus(lastInMonth, "Ctrl+End moves to the last in-month day");

    // Ctrl+Home → first IN-MONTH day (first focusable cell). Final probe.
    seed();
    await sleep(0);
    keyAtFocus("Home", { ctrlKey: true });
    expectFocus(firstOfMonth(ANCHOR), "Ctrl+Home moves to the first in-month day");
  },
};

/** Paging — PageDown/PageUp change the month (same day-of-month), Shift+PageDown/Up change the year. These
 *  cross into a not-yet-rendered month, so focus is stolen after the re-render (assert with a wait). */
export const KeyboardPaging: Story = {
  render: () => (
    <Box p="4" data-testid="cal-page">
      <Calendar focusDate={D(ANCHOR)} onValueChange={noop} />
    </Box>
  ),
  play: async ({ canvasElement }) => {
    const scope = canvasElement.querySelector<HTMLElement>('[data-testid="cal-page"]')!;
    dayBtn(scope, ANCHOR)!.focus();
    await sleep(0);
    expectFocus(ANCHOR, "focusing the seed lands on the pinned day");

    keyAtFocus("PageDown");
    await expectFocusEventually("2026-08-15", "PageDown advances one month (same day)");
    if (heading(scope) !== monthYear("2026-08-01"))
      throw new Error(`PageDown must flip the caption to August; got "${heading(scope)}"`);

    keyAtFocus("PageUp");
    await expectFocusEventually("2026-07-15", "PageUp retreats one month");
    if (heading(scope) !== monthYear("2026-07-01"))
      throw new Error(`PageUp must flip the caption back to July; got "${heading(scope)}"`);

    keyAtFocus("PageDown", { shiftKey: true });
    await expectFocusEventually("2027-07-15", "Shift+PageDown advances one year");
    if (heading(scope) !== monthYear("2027-07-01"))
      throw new Error(`Shift+PageDown must flip the caption to July 2027; got "${heading(scope)}"`);

    keyAtFocus("PageUp", { shiftKey: true });
    await expectFocusEventually("2026-07-15", "Shift+PageUp retreats one year");
    if (heading(scope) !== monthYear("2026-07-01"))
      throw new Error(`Shift+PageUp must flip the caption back to July 2026; got "${heading(scope)}"`);
  },
};

/** Month-flip at the grid edge — with `hasOutsideDays={false}` the leading/trailing cells are empty, so the
 *  last in-month day sits at the true grid edge. ArrowRight off it advances the month (focus lands on the 1st
 *  of next month, via the roving hook's onNavigateAfter → moveFocusTo edge callback); ArrowLeft off the first
 *  day retreats it (focus lands on the last of the previous month). Both specimens flip INTO January 2027 —
 *  a full six-row month (Jan 1 2027 is a Friday) — so the settled grid has no all-empty (all-aria-hidden)
 *  week and stays axe-clean; the Dec 2026 / Feb 2027 starting months are only ever transient. */
export const MonthFlipAtEdges: Story = {
  render: () => (
    <Box p="4">
      <Box data-testid="cal-adv" mb="4">
        <Calendar focusDate={D("2026-12-15")} hasOutsideDays={false} onValueChange={noop} />
      </Box>
      <Box data-testid="cal-ret">
        <Calendar focusDate={D("2027-02-15")} hasOutsideDays={false} onValueChange={noop} />
      </Box>
    </Box>
  ),
  play: async ({ canvasElement }) => {
    // --- advance: ArrowRight off the last in-month day → the 1st of next month ---
    const adv = canvasElement.querySelector<HTMLElement>('[data-testid="cal-adv"]')!;
    const lastDay = dayButtons(adv).at(-1)!; // July 31 (empty trailing cells carry no button)
    const lastIso = lastDay.getAttribute("data-date")!;
    lastDay.focus();
    await sleep(0);
    expectFocus(lastIso, "focusing the last in-month cell");
    keyAtFocus("ArrowRight");
    await expectFocusEventually(addDays(lastIso, 1), "ArrowRight off the last cell flips to the next month");
    if (heading(adv) !== monthYear(addDays(lastIso, 1)))
      throw new Error(`the advanced caption must be the next month; got "${heading(adv)}"`);

    // --- retreat: ArrowLeft off the first in-month day → the last day of the previous month ---
    const ret = canvasElement.querySelector<HTMLElement>('[data-testid="cal-ret"]')!;
    const firstDay = dayButtons(ret)[0]!; // July 1
    const firstIso = firstDay.getAttribute("data-date")!;
    firstDay.focus();
    await sleep(0);
    expectFocus(firstIso, "focusing the first in-month cell");
    keyOn(firstDay, "ArrowLeft");
    await expectFocusEventually(addDays(firstIso, -1), "ArrowLeft off the first cell flips to the previous month");
    if (heading(ret) !== monthYear(addDays(firstIso, -1)))
      throw new Error(`the retreated caption must be the previous month; got "${heading(ret)}"`);
  },
};

/** Two-month cross-boundary (H1/M1 regression guard). With `numberOfMonths={2}` a boundary date renders
 *  TWICE — in-month in one pane and as a dimmed spillover in the sibling pane. (H1) Arrowing across the
 *  boundary must focus the REAL in-month cell, never the greyed duplicate. (M1) The second pane's initial
 *  roving tab stop must itself be an in-month day, not a leading spillover. Both regress if outside days are
 *  roving-focusable or the focus resolver takes the first `data-date` match. */
export const TwoMonthCrossBoundary: Story = {
  render: () => (
    <Box p="4" data-testid="cal-2mo">
      <Calendar numberOfMonths={2} focusDate={D("2026-07-15")} onValueChange={noop} />
    </Box>
  ),
  play: async ({ canvasElement }) => {
    const scope = canvasElement.querySelector<HTMLElement>('[data-testid="cal-2mo"]')!;

    // M1 — on initial render, the SECOND (August) pane's roving tab stop is an in-month August day, not a
    // leading July spillover. (July 15 seeds the first pane; August has no focusDate cell, so its stop falls
    // back to its first focusable — which must be in-month, i.e. not a `data-outside` copy.)
    const augGrid = [...scope.querySelectorAll('[role="grid"]')][1]!;
    const augStop = augGrid.querySelector<HTMLButtonElement>('button[tabindex="0"]');
    if (!augStop) throw new Error("M1: the August pane has no roving tab stop on render");
    if (augStop.hasAttribute("data-outside"))
      throw new Error(`M1: August pane tab stop is an outside spillover (${augStop.getAttribute("data-date")}), not in-month`);

    // H1 — ArrowRight off the in-month July 31 focuses the REAL (bright) August 1 in the second pane, not the
    // dimmed July-pane spillover of "1".
    const jul31 = [...scope.querySelectorAll<HTMLButtonElement>('button[data-date="2026-07-31"]')].find(
      (b) => !b.hasAttribute("data-outside"),
    )!;
    jul31.focus();
    await sleep(0);
    keyAtFocus("ArrowRight");
    await expectFocusEventually("2026-08-01", "ArrowRight across the two-month boundary focuses August 1");
    if ((document.activeElement as HTMLElement).hasAttribute("data-outside"))
      throw new Error("H1: focus landed on the dimmed spillover copy of August 1, not the in-month cell");
  },
};

/** Empty-week guard (axe) — with `hasOutsideDays={false}`, a month whose fixed 6-row grid contains a fully
 *  adjacent-month week (Feb 2026 starts Sunday + is 28 days → rows 5-6 are entirely March) must DROP those
 *  rows rather than render them as all-`aria-hidden` gridcells, which trips axe's aria-required-children
 *  ("role=row must contain a gridcell"). No play — the automatic per-story axe pass checks the static render. */
export const TrailingWeekAllOutside: Story = {
  render: () => (
    <Box p="4">
      <Calendar focusDate={D("2026-02-15")} hasOutsideDays={false} onValueChange={noop} />
    </Box>
  ),
};

/** Roving tabindex = ONE tab stop. Exactly one day carries `tabindex="0"` (the selected day → else today →
 *  else first); every other day is `-1`, so Tab enters the grid once and then leaves it (arrows rove within).
 *  Clicking another day MOVES the single stop — the roving-tabindex invariant. */
export const RovingTabStop: Story = {
  render: () => (
    <Box p="4" data-testid="cal-tab">
      {/* uncontrolled selection → the selected day seeds the roving tab stop */}
      <Calendar defaultValue={D(ANCHOR)} onValueChange={noop} />
    </Box>
  ),
  play: async ({ canvasElement }) => {
    const scope = canvasElement.querySelector<HTMLElement>('[data-testid="cal-tab"]')!;
    const tabbable = () => dayButtons(scope).filter((b) => b.getAttribute("tabindex") === "0");

    // Exactly one tab stop, on the selected day.
    if (tabbable().length !== 1)
      throw new Error(`the grid must expose exactly one tab stop; got ${tabbable().length}`);
    if (tabbable()[0].getAttribute("data-date") !== ANCHOR)
      throw new Error(`the tab stop must sit on the selected day (${ANCHOR}); got ${tabbable()[0].getAttribute("data-date")}`);
    // Every other day is out of the Tab sequence — this is HOW Tab exits the grid (no cell-to-cell tabbing).
    if (dayButtons(scope).some((b) => b !== tabbable()[0] && b.getAttribute("tabindex") !== "-1"))
      throw new Error("every non-stop day must be tabindex=-1 so Tab leaves the grid");

    // Clicking another day moves the single stop there (roving), still exactly one stop.
    const target = "2026-07-20";
    dayBtn(scope, target)!.click();
    await sleep(0);
    await waitFor(() => tabbable().length === 1 && tabbable()[0].getAttribute("data-date") === target);
    if (tabbable().length !== 1)
      throw new Error(`after a click there must still be exactly one tab stop; got ${tabbable().length}`);
  },
};

/** Range selection — mode="range": click a check-in, hover another day → a live preview band on the
 *  intervening cells; click check-out → commits (tinted endpoints over the a5 band, aria-selected on the run); clicking
 *  a new start begins fresh (the old band clears); Escape cancels an in-progress range. */
export const RangeSelection: Story = {
  render: () => (
    <Box p="4" data-testid="cal-range">
      <Calendar mode="range" focusDate={D(ANCHOR)} onValueChange={noop} />
    </Box>
  ),
  play: async ({ canvasElement }) => {
    const scope = canvasElement.querySelector<HTMLElement>('[data-testid="cal-range"]')!;
    const cellOf = (iso: string) => dayBtn(scope, iso)!.closest('[role="gridcell"]')!;

    // --- click check-in, hover a later day → preview band on the intervening cells ---
    dayBtn(scope, "2026-07-10")!.click();
    await sleep(0);
    hover(dayBtn(scope, "2026-07-14")!);
    await waitFor(() => dayBtn(scope, "2026-07-12")!.getAttribute("data-preview") != null);
    if (dayBtn(scope, "2026-07-10")!.getAttribute("data-preview") !== "start")
      throw new Error("the hovered range must mark the check-in as the preview start");
    if (dayBtn(scope, "2026-07-14")!.getAttribute("data-preview") !== "end")
      throw new Error("the hovered range must mark the hovered day as the preview end");
    for (const mid of ["2026-07-11", "2026-07-12", "2026-07-13"])
      if (dayBtn(scope, mid)!.getAttribute("data-preview") !== "middle")
        throw new Error(`intervening day ${mid} must carry the preview band (data-preview=middle)`);

    // --- click check-out → commit: tinted endpoints over the a5 band, aria-selected across the run ---
    dayBtn(scope, "2026-07-14")!.click();
    await waitFor(() => dayBtn(scope, "2026-07-10")!.getAttribute("data-range") === "start");
    if (dayBtn(scope, "2026-07-14")!.getAttribute("data-range") !== "end")
      throw new Error("committing must mark the check-out as the range end");
    for (const mid of ["2026-07-11", "2026-07-12", "2026-07-13"])
      if (dayBtn(scope, mid)!.getAttribute("data-range") !== "middle")
        throw new Error(`committed day ${mid} must carry the range band (data-range=middle)`);
    if (cellOf("2026-07-12").getAttribute("aria-selected") !== "true")
      throw new Error("committed in-range gridcells must be aria-selected");
    if (dayBtn(scope, "2026-07-10")!.getAttribute("data-preview") != null)
      throw new Error("committing must clear the preview attribute");

    // --- clicking a NEW start begins fresh: the old committed band clears ---
    dayBtn(scope, "2026-07-20")!.click();
    await waitFor(() => dayBtn(scope, "2026-07-10")!.getAttribute("data-range") == null);
    if (dayBtn(scope, "2026-07-14")!.getAttribute("data-range") != null)
      throw new Error("starting a new range must clear the previously committed band");
    if (dayBtn(scope, "2026-07-20")!.getAttribute("data-preview") == null)
      throw new Error("the new start must become the fresh in-progress anchor (a preview endpoint)");

    // --- Escape cancels the in-progress range (anchor + preview both drop) ---
    hover(dayBtn(scope, "2026-07-24")!);
    await waitFor(() => dayBtn(scope, "2026-07-22")!.getAttribute("data-preview") === "middle");
    keyOn(gridOf(scope), "Escape");
    await waitFor(() => scope.querySelectorAll("[data-preview]").length === 0);
    if (scope.querySelectorAll("[data-preview]").length !== 0)
      throw new Error("Escape must cancel the in-progress preview");
    if (scope.querySelectorAll("[data-range]").length !== 0)
      throw new Error("Escape on a fresh (uncommitted) range must leave nothing selected");
  },
};

/** Disabled days — an `isDateDisabled` day carries `aria-disabled`, is SKIPPED by roving focus (ArrowRight
 *  over it lands on the next enabled day), and cannot be selected (a click fires no onValueChange). */
const disabledState = { calls: 0 };
export const DisabledDays: Story = {
  render: () => (
    <Box p="4" data-testid="cal-disabled">
      <Calendar
        focusDate={D(ANCHOR)}
        isDateDisabled={(iso) => iso === "2026-07-16"}
        onValueChange={() => {
          disabledState.calls += 1;
        }}
      />
    </Box>
  ),
  play: async ({ canvasElement }) => {
    disabledState.calls = 0;
    const scope = canvasElement.querySelector<HTMLElement>('[data-testid="cal-disabled"]')!;
    const disabled = dayBtn(scope, "2026-07-16")!;

    // (a) the disabled day is announced as such (kept in the a11y tree, not natively `disabled`).
    if (disabled.getAttribute("aria-disabled") !== "true")
      throw new Error("a constraint-disabled day must carry aria-disabled=true");

    // (b) roving focus SKIPS it: ArrowRight from 07-15 jumps over 07-16 to 07-17.
    dayBtn(scope, ANCHOR)!.focus();
    await sleep(0);
    keyAtFocus("ArrowRight");
    await sleep(0);
    expectFocus("2026-07-17", "ArrowRight must skip the disabled day and land on the next enabled one");

    // (c) it cannot be selected — a click is inert.
    disabled.click();
    await sleep(20);
    if (disabledState.calls !== 0)
      throw new Error(`clicking a disabled day must not select it; onValueChange fired ${disabledState.calls}x`);
  },
};

/** a11y attributes — today's gridcell has `aria-current="date"` (computed against the REAL today), a selected
 *  gridcell has `aria-selected`, and every day carries a `data-date="YYYY-MM-DD"` plus a full localized
 *  aria-label (never parsed for nav — that is `data-date`'s job). */
export const A11yAttributes: Story = {
  render: () => {
    // Select a mid-current-month day so today AND a selected day are both in the displayed month.
    const t = plainDateToday();
    const mid = plainDateToISO({ year: t.year, month: t.month, day: 15 });
    return (
      <Box p="4" data-testid="cal-a11y">
        <Calendar defaultValue={mid} onValueChange={noop} />
      </Box>
    );
  },
  play: async ({ canvasElement }) => {
    const scope = canvasElement.querySelector<HTMLElement>('[data-testid="cal-a11y"]')!;
    const t = plainDateToday();
    const todayIso = plainDateToISO(t);
    const midIso = plainDateToISO({ year: t.year, month: t.month, day: 15 });

    // aria-current="date" on today's gridcell (and exactly one in the visible month).
    const todayBtn = dayBtn(scope, todayIso);
    if (!todayBtn) throw new Error(`today (${todayIso}) must render in the default (current-month) view`);
    const todayCell = todayBtn.closest('[role="gridcell"]')!;
    if (todayCell.getAttribute("aria-current") !== "date")
      throw new Error("today's gridcell must carry aria-current=date (our D3 upgrade)");
    if (todayBtn.getAttribute("data-today") == null)
      throw new Error("today's button must carry the data-today marker (the 2px bar channel)");
    if (scope.querySelectorAll('[role="gridcell"][aria-current="date"]').length !== 1)
      throw new Error("exactly one cell may be aria-current=date");

    // aria-selected on the selected gridcell.
    const selectedCell = dayBtn(scope, midIso)!.closest('[role="gridcell"]')!;
    if (selectedCell.getAttribute("aria-selected") !== "true")
      throw new Error("the selected day's gridcell must be aria-selected=true");

    // Every day: machine-readable data-date + a full localized aria-label.
    const days = dayButtons(scope);
    if (days.length === 0) throw new Error("the grid must render day buttons");
    for (const b of days) {
      const dd = b.getAttribute("data-date");
      if (!dd || !/^\d{4}-\d{2}-\d{2}$/.test(dd))
        throw new Error(`every day must carry a data-date="YYYY-MM-DD"; got "${dd}"`);
      const label = b.getAttribute("aria-label") ?? "";
      if (!/\d{4}/.test(label)) throw new Error(`every day must carry a full localized aria-label; got "${label}"`);
    }
    // The label is the full weekday form for its own date (locale-driven, never hand-parsed).
    const want = plainDateFormat(plainDateFromISO(D(midIso)), DATE_FORMAT_WITH_WEEKDAY);
    if (dayBtn(scope, midIso)!.getAttribute("aria-label") !== want)
      throw new Error(`the aria-label must be the localized long-weekday form (${want})`);
  },
};

/* ========================================================================== */
/* View jump — the caption's month and year are separate controls, each opening a grid. */

/** Month grid — clicking the caption's MONTH opens a 12-month grid over the day view: the control is a
 *  disclosure (`aria-expanded`), focus lands on the month being viewed, arrows rove the 3-column geometry,
 *  and a pick flips the view and hands focus back to the control that opened it. The day grid's
 *  `aria-labelledby` must still resolve to the whole caption ("July 2026") with the split in place. */
export const MonthGridOpenRovePick: Story = {
  render: () => (
    <Box p="4" data-testid="cal-month-grid">
      <Calendar focusDate={D(ANCHOR)} onValueChange={noop} />
    </Box>
  ),
  play: async ({ canvasElement }) => {
    const scope = canvasElement.querySelector<HTMLElement>('[data-testid="cal-month-grid"]')!;
    clearLive();

    // The caption still NAMES the day grid, with two buttons inside the same <h2>.
    const captionId = scope.querySelector(".rt-ds-calendar-grid")!.getAttribute("aria-labelledby")!;
    const h2 = document.getElementById(captionId)!;
    if (h2.tagName !== "H2") throw new Error(`the grid must be labelled by the caption heading; got <${h2.tagName}>`);
    if (h2.textContent !== monthYear(ANCHOR))
      throw new Error(`splitting the caption must leave its text intact ("${monthYear(ANCHOR)}"); got "${h2.textContent}"`);
    if (h2.querySelectorAll("button").length !== 2)
      throw new Error("the caption must hold exactly two controls (month, year) inside the heading");
    // An aria-label on either control would REPLACE its text in the heading's name computation.
    if ([...h2.querySelectorAll("button")].some((b) => b.hasAttribute("aria-label")))
      throw new Error("a caption control must be named by its own text, never an aria-label");

    const month = trigger(scope, "month")!;
    if (month.getAttribute("aria-expanded") !== "false")
      throw new Error("a closed view-jump control must report aria-expanded=false");

    // --- open: the day grid is replaced, focus seeds on the month being viewed ---
    month.click();
    await waitFor(() => pickerGrid(scope));
    if (scope.querySelector(".rt-ds-calendar-grid"))
      throw new Error("opening the month grid must REPLACE the day grid, not sit beside it");
    if (trigger(scope, "month")!.getAttribute("aria-expanded") !== "true")
      throw new Error("the open control must report aria-expanded=true");
    if (options(scope).length !== 12)
      throw new Error(`the month grid must offer all 12 months; got ${options(scope).length}`);
    await waitFor(() => activeText() === "Jul");
    if (option(scope, "2026-7")!.getAttribute("data-selected") !== "true")
      throw new Error("the month being viewed must read as the selected cell");

    // --- rove: the grid is 3 columns wide, so ArrowDown steps three months ---
    keyAtFocus("ArrowRight");
    await sleep(0);
    if (activeText() !== "Aug") throw new Error(`ArrowRight must move one month; got ${activeText()}`);
    keyAtFocus("ArrowDown");
    await sleep(0);
    if (activeText() !== "Nov") throw new Error(`ArrowDown must move one row (3 months); got ${activeText()}`);
    keyAtFocus("ArrowUp");
    await sleep(0);
    if (activeText() !== "Aug") throw new Error(`ArrowUp must move back one row; got ${activeText()}`);

    // --- pick: the view flips, the grid closes, focus returns to the CONTROL ---
    option(scope, "2026-9")!.click();
    await waitFor(() => !pickerGrid(scope));
    if (heading(scope) !== monthYear("2026-09-01"))
      throw new Error(`picking a month must flip the caption to September; got "${heading(scope)}"`);
    if (document.activeElement !== trigger(scope, "month"))
      throw new Error(`a committed pick must return focus to the control that opened the grid; focus is on "${activeText()}"`);
    if (trigger(scope, "month")!.getAttribute("aria-expanded") !== "false")
      throw new Error("the control must report aria-expanded=false once the grid closes");
    if (!scope.querySelector(".rt-ds-calendar-grid"))
      throw new Error("the day grid must come back after a pick");
    // The focused day keeps its day-of-month across the jump.
    if (scope.querySelector('button.rt-ds-calendar-day[tabindex="0"]')?.getAttribute("data-date") !== "2026-09-15")
      throw new Error("the roving day must carry its day-of-month into the new month");
    await expectAnnounced("September 2026", "a pointer-driven month jump");

    // Leave the MONTH grid open as the settled state: the automatic per-story axe pass runs after the
    // play, and an open month grid is otherwise never the resting state of any story (ViewJumpBounds
    // settles on the year grid). Its cells carry an aria-label the year grid's do not, so it needs its
    // own pass.
    trigger(scope, "month")!.click();
    await waitFor(() => pickerGrid(scope));
  },
};

/** Year grid — the caption's YEAR opens a decade page (the ten years plus one neighbour each side, the
 *  neighbours dimmed like out-of-month days). Page Down jumps a decade holding the grid position; an edge
 *  ARROW instead continues the year sequence across the page overlap; Escape closes with the view unchanged
 *  and focus back on the control. */
export const YearGridPageAndEscape: Story = {
  render: () => (
    <Box p="4" data-testid="cal-year-grid">
      <Calendar focusDate={D(ANCHOR)} onValueChange={noop} />
    </Box>
  ),
  play: async ({ canvasElement }) => {
    const scope = canvasElement.querySelector<HTMLElement>('[data-testid="cal-year-grid"]')!;
    clearLive();

    trigger(scope, "year")!.click();
    await waitFor(() => pickerGrid(scope));
    const labels = options(scope).map((b) => b.textContent);
    if (labels.join(",") !== "2019,2020,2021,2022,2023,2024,2025,2026,2027,2028,2029,2030")
      throw new Error(`the year page must be the decade plus a neighbour each side; got ${labels.join(",")}`);
    if (!options(scope)[0].hasAttribute("data-outside") || !options(scope)[11].hasAttribute("data-outside"))
      throw new Error("the two adjacent-decade years must read as outside (dimmed)");
    if (options(scope).filter((b) => b.hasAttribute("data-outside")).length !== 2)
      throw new Error("only the two adjacent-decade years may read as outside");
    await waitFor(() => activeText() === "2026");
    if (pickerGrid(scope)!.getAttribute("aria-label") !== "Years 2019 to 2030")
      throw new Error(`the year grid must name its own page; got "${pickerGrid(scope)!.getAttribute("aria-label")}"`);

    // --- Page Down = a decade jump that holds the grid position (index 7 → 2036) ---
    keyAtFocus("PageDown");
    await waitFor(() => pickerGrid(scope)!.getAttribute("aria-label") === "Years 2029 to 2040");
    if (activeText() !== "2036")
      throw new Error(`Page Down must hold the grid position across the decade jump; got ${activeText()}`);
    await expectAnnounced("Years 2029 to 2040", "a decade page");

    // --- an edge arrow continues the YEAR sequence, not the grid index. Pages overlap by two
    //     (a page is the decade + a neighbour each side), so stepping left off 2029 must land on
    //     2028 — a fixed "last cell of the previous page" would give 2030, a year LATER.
    option(scope, "2029")!.focus();
    await sleep(0);
    keyAtFocus("ArrowLeft");
    await waitFor(() => activeText() === "2028", 2000).catch(() => {
      throw new Error(`an edge arrow must continue the year sequence; got ${activeText()}`);
    });
    if (pickerGrid(scope)!.getAttribute("aria-label") !== "Years 2019 to 2030")
      throw new Error("stepping off the edge must page to whichever page holds the next year");

    // --- Escape: view unchanged, focus back on the control ---
    keyAtFocus("Escape");
    await waitFor(() => !pickerGrid(scope));
    if (heading(scope) !== monthYear(ANCHOR))
      throw new Error(`Escape must leave the view unchanged; caption reads "${heading(scope)}"`);
    if (document.activeElement !== trigger(scope, "year"))
      throw new Error(`Escape must return focus to the control that opened the grid; focus is on "${activeText()}"`);
    if (trigger(scope, "year")!.getAttribute("aria-expanded") !== "false")
      throw new Error("the control must report aria-expanded=false after Escape");
  },
};

/** Escape from a decade CHEVRON — the paging buttons live in the panel but outside the grid table, so a
 *  handler bound only to the table left Escape dead whenever focus sat on one. */
export const YearGridEscapeFromChevron: Story = {
  render: () => (
    <Box p="4" data-testid="cal-year-esc">
      <Calendar focusDate={D(ANCHOR)} onValueChange={noop} />
    </Box>
  ),
  play: async ({ canvasElement }) => {
    const scope = canvasElement.querySelector<HTMLElement>('[data-testid="cal-year-esc"]')!;
    trigger(scope, "year")!.click();
    await waitFor(() => pickerGrid(scope));

    const next = navBtn(scope, "Next decade")!;
    next.focus();
    next.click();
    await waitFor(() => pickerGrid(scope)!.getAttribute("aria-label") === "Years 2029 to 2040");
    // A chevron keeps focus on itself — it is the control the user is repeating.
    if (document.activeElement !== navBtn(scope, "Next decade"))
      throw new Error("paging by chevron must leave focus on the chevron");

    keyOn(document.activeElement!, "Escape");
    await waitFor(() => !pickerGrid(scope));
    if (document.activeElement !== trigger(scope, "year"))
      throw new Error(`Escape from a chevron must close the grid and return focus to the control; focus is on "${activeText()}"`);
  },
};

/** Bounds — min/max stop BOTH grids and the month chevrons, so nothing can page into a span where every day
 *  is disabled. (min = 2026-07-01, max = 2026-10-31.) */
export const ViewJumpBounds: Story = {
  render: () => (
    <Box p="4" data-testid="cal-bounds">
      <Calendar focusDate={D(ANCHOR)} min={D("2026-07-01")} max={D("2026-10-31")} onValueChange={noop} />
    </Box>
  ),
  play: async ({ canvasElement }) => {
    const scope = canvasElement.querySelector<HTMLElement>('[data-testid="cal-bounds"]')!;

    // --- the chevrons stop at the bound (this is the feedback that was missing) ---
    if (!navBtn(scope, "Previous month")!.disabled)
      throw new Error("the previous-month chevron must be disabled at the minimum month");
    if (navBtn(scope, "Next month")!.disabled)
      throw new Error("the next-month chevron must stay live while months remain inside the maximum");

    // --- the month grid: only July…October are reachable ---
    trigger(scope, "month")!.click();
    await waitFor(() => pickerGrid(scope));
    const live = options(scope).filter((b) => b.getAttribute("aria-disabled") !== "true").map((b) => b.textContent);
    if (live.join(",") !== "Jul,Aug,Sep,Oct")
      throw new Error(`only in-bounds months may be selectable; got ${live.join(",")}`);
    // A disabled month is inert AND skipped by roving.
    option(scope, "2026-7")!.focus();
    await sleep(0);
    keyAtFocus("ArrowLeft");
    await sleep(0);
    if (activeText() !== "Jul")
      throw new Error(`roving must not leave the in-bounds run; got ${activeText()}`);
    option(scope, "2026-3")!.click();
    await sleep(30);
    if (!pickerGrid(scope)) throw new Error("clicking an out-of-bounds month must not commit (the grid stayed open)");
    if (heading(scope) !== monthYear(ANCHOR))
      throw new Error(`clicking an out-of-bounds month must not move the view; caption reads "${heading(scope)}"`);

    // --- the year grid + its decade chevrons stop at the same bound ---
    trigger(scope, "year")!.click();
    await waitFor(() => pickerGrid(scope)!.getAttribute("aria-label")?.startsWith("Years"));
    const liveYears = options(scope).filter((b) => b.getAttribute("aria-disabled") !== "true").map((b) => b.textContent);
    if (liveYears.join(",") !== "2026")
      throw new Error(`only 2026 is inside the bounds; got ${liveYears.join(",")}`);
    if (!navBtn(scope, "Previous decade")!.disabled)
      throw new Error("the previous-decade chevron must be disabled when no earlier year is selectable");
    if (!navBtn(scope, "Next decade")!.disabled)
      throw new Error("the next-decade chevron must be disabled when no later year is selectable");
  },
};

/** Announcement — a POINTER month flip moves no focus, so without a live region it is silent to a screen
 *  reader. The caption is keyed by month and REMOUNTS on every flip, which is exactly the case an
 *  `aria-live` on the caption cannot serve (a region born with its content is dropped) — so the flip is
 *  announced through the persistent `useAnnounce` region instead. */
export const ViewChangeIsAnnounced: Story = {
  render: () => (
    <Box p="4" data-testid="cal-announce">
      <Calendar focusDate={D(ANCHOR)} onValueChange={noop} />
    </Box>
  ),
  play: async ({ canvasElement }) => {
    const scope = canvasElement.querySelector<HTMLElement>('[data-testid="cal-announce"]')!;
    clearLive();

    navBtn(scope, "Next month")!.click();
    await expectAnnounced(monthYear("2026-08-01"), "a chevron month flip");
    const region = liveRegion()!;
    if (region.getAttribute("aria-live") !== "polite" || region.getAttribute("aria-atomic") !== "true")
      throw new Error("the announcement must reach a persistent aria-live=polite, aria-atomic region");
    if (!region.isConnected || scope.contains(region))
      throw new Error("the region must be the persistent body-level singleton, not one born inside the caption");

    clearLive();
    navBtn(scope, "Previous month")!.click();
    await expectAnnounced(monthYear(ANCHOR), "a chevron month flip back");
  },
};

/** Two months — the view controls follow the same split as the nav chevrons: they live on the FIRST caption
 *  only, and opening a grid replaces the whole two-month body with ONE grid (never a second,
 *  differently-anchored copy). Picking moves both panes together. */
export const TwoMonthViewJump: Story = {
  render: () => (
    <Box p="4" data-testid="cal-2mo-jump">
      <Calendar numberOfMonths={2} focusDate={D(ANCHOR)} onValueChange={noop} />
    </Box>
  ),
  play: async ({ canvasElement }) => {
    const scope = canvasElement.querySelector<HTMLElement>('[data-testid="cal-2mo-jump"]')!;
    clearLive();

    const perCaption = [...scope.querySelectorAll(".rt-ds-calendar-caption")].map(
      (c) => c.querySelectorAll(".rt-ds-calendar-caption-btn").length,
    );
    if (perCaption.join(",") !== "2,0")
      throw new Error(`the view controls belong to the first caption only; got ${perCaption.join(",")} per caption`);

    trigger(scope, "month")!.click();
    await waitFor(() => pickerGrid(scope));
    if (scope.querySelectorAll(".rt-ds-calendar-picker").length !== 1)
      throw new Error("a two-month view must open exactly ONE grid, not one per pane");
    if (scope.querySelectorAll(".rt-ds-calendar-grid").length !== 0)
      throw new Error("opening a grid must replace the whole two-month body");

    option(scope, "2026-10")!.click();
    await waitFor(() => scope.querySelectorAll(".rt-ds-calendar-grid").length === 2);
    const captions = [...scope.querySelectorAll(".rt-ds-calendar-heading")].map((h) => h.textContent);
    if (captions.join(" / ") !== `${monthYear("2026-10-01")} / ${monthYear("2026-11-01")}`)
      throw new Error(`both panes must move together; captions read ${captions.join(" / ")}`);
    await expectAnnounced(
      `${monthYear("2026-10-01")} to ${monthYear("2026-11-01")}`,
      "a two-month view jump",
    );
  },
};

/** The title must not TRAVEL when a grid opens. Three views stack different grids under one caption,
 *  and the caption is the fixed point the disclosure reads against — if it moves, the month/year
 *  controls stop looking like an expansion of the title and start looking like a new screen.
 *
 *  Measured in LAYOUT, because that is the only place the failure shows. The nav slots reserve the
 *  chevron's box, but a slot is EMPTY in three real states — the 12-month grid (no chevrons at all)
 *  and either end of a two-month day view (the pair is split across the two panes) — and an empty
 *  flex container honours `min-width` while collapsing to zero height. That cost two visible things:
 *  the slot's own box changed shape between views, and, because the calendar root is inline-level and
 *  takes its baseline from that first slot, the WHOLE component dropped in its parent — by the host
 *  font's strut ascent minus the collapsed slot's baseline, so the exact number tracks the page's type
 *  (4px in the Storybook canvas, 5px here). Hence the assertion is "identical", never a tolerance.
 *
 *  So this asserts both halves: every nav slot is the same box everywhere, and neither the caption row
 *  nor the calendar's seat in its parent moves across day → month → year → day. Root HEIGHT is excluded
 *  — the views genuinely stack different grids. */
export const CaptionGeometryHoldsAcrossViews: Story = {
  render: () => (
    <>
      <Box p="4" data-testid="cal-geo-1mo">
        <Calendar focusDate={D(ANCHOR)} onValueChange={noop} />
      </Box>
      <Box p="4" data-testid="cal-geo-2mo">
        <Calendar numberOfMonths={2} focusDate={D(ANCHOR)} onValueChange={noop} />
      </Box>
    </>
  ),
  play: async ({ canvasElement }) => {
    for (const id of ["cal-geo-1mo", "cal-geo-2mo"]) {
      const scope = canvasElement.querySelector<HTMLElement>(`[data-testid="${id}"]`)!;

      /* One box for every nav slot in the calendar, whether or not it renders a chevron. The
         two-month day view already mixes both cases (prev lives on the first pane, next on the
         last), and the 12-month grid drops the pair entirely — so the set has to be checked
         WITHIN a view and again ACROSS views, or a grid that collapses both slots at once
         still looks self-consistent. */
      const slotBox = (where: string) => {
        const seen = new Set(
          [...scope.querySelectorAll(".rt-ds-calendar-nav-slot")].map((s) => {
            const r = s.getBoundingClientRect();
            return `${round2(r.width)}x${round2(r.height)}`;
          }),
        );
        if (seen.size !== 1)
          throw new Error(
            `${id}: an empty nav slot must still reserve the chevron's box — in the ${where} the slots measure ${[...seen].join(", ")}`,
          );
        return [...seen][0];
      };
      const day = captionGeometry(scope);
      const daySlot = slotBox("day view");
      const check = (where: string) => {
        const box = slotBox(where);
        if (box !== daySlot)
          throw new Error(
            `${id}: the ${where} must keep the day view's nav-slot box — day view ${daySlot}, ${where} ${box}`,
          );
        const now = captionGeometry(scope);
        expectSameGeometry(day.rows[0], now.rows[0], `${id}: the ${where} reshaped the caption row`);
        expectSameGeometry(day.seat, now.seat, `${id}: the ${where} moved the whole calendar inside its parent`);
      };

      trigger(scope, "month")!.click();
      await waitFor(() => pickerGrid(scope));
      check("12-month grid");

      // A direct switch between the two grids, the way the caption's own controls behave.
      trigger(scope, "year")!.click();
      await waitFor(() => scope.querySelector('.rt-ds-calendar-caption-btn[data-picker-trigger="year"][aria-expanded="true"]'));
      check("year grid");

      // Closing returns the day grid — and the caption lands back exactly where it started.
      trigger(scope, "year")!.click();
      await waitFor(() => scope.querySelector(".rt-ds-calendar-grid"));
      expectSameGeometry(day, captionGeometry(scope), `${id}: closing the year grid did not restore the caption's geometry`);
    }
  },
};

/** RTL — inside `dir="rtl"` the horizontal arrows swap (the `useGridFocus` isRtl behavior): ArrowLeft moves
 *  to the NEXT day, ArrowRight to the PREVIOUS. Vertical arrows are unaffected. */
export const Rtl: Story = {
  render: () => (
    <Box p="4" data-testid="cal-rtl" dir="rtl">
      <Calendar dir="rtl" focusDate={D(ANCHOR)} onValueChange={noop} />
    </Box>
  ),
  play: async ({ canvasElement }) => {
    const scope = canvasElement.querySelector<HTMLElement>('[data-testid="cal-rtl"]')!;
    dayBtn(scope, ANCHOR)!.focus();
    await sleep(0);
    expectFocus(ANCHOR, "focusing the seed lands on the pinned day");

    // Swapped: ArrowLeft advances (visual "next" in RTL), ArrowRight retreats.
    keyAtFocus("ArrowLeft");
    await sleep(0);
    expectFocus(addDays(ANCHOR, 1), "in RTL, ArrowLeft moves to the NEXT day");

    keyAtFocus("ArrowRight");
    await sleep(0);
    expectFocus(ANCHOR, "in RTL, ArrowRight moves to the PREVIOUS day");

    // Vertical axis is NOT swapped: ArrowDown still moves a row (week) forward.
    keyAtFocus("ArrowDown");
    await sleep(0);
    expectFocus(addDays(ANCHOR, 7), "in RTL, ArrowDown still moves one week forward (vertical axis unswapped)");
  },
};
