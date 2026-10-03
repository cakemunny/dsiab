import type { Meta, StoryObj } from "@storybook/react-vite";
import { Flex } from "@radix-ui/themes";
import { Timestamp } from "./Timestamp";

/* Test-only behavior for Timestamp — kept OUT of the docs stories (System/Timestamp). Underscore-prefixed
   file → registry- and story-order-guard-exempt, grouped under _internal. Covers the semantic <time>
   element, format switching (locale-safe via the machine formats + distinctness), the clock-skew → "now"
   clamp, the relative-mode aria-label/tooltip contract, and a real live tick. */

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
// The locale's rendering of "now" (Intl format(0,'second') under numeric:auto) — compared against, so the
// assertions stay locale-independent (they never hard-code the English word).
const NOW_STR = new Intl.RelativeTimeFormat(undefined, { numeric: "auto" }).format(0, "second");
const iso = (msAgo: number) => new Date(Date.now() - msAgo).toISOString();

const meta: Meta<typeof Timestamp> = {
  title: "_internal/Timestamp behavior",
  component: Timestamp,
  parameters: { controls: { disable: true } },
};
export default meta;
type Story = StoryObj<typeof Timestamp>;

/** The root is a semantic <time> whose dateTime is the ISO of the value (machine-readable). */
export const SemanticTimeElement: Story = {
  render: () => (
    <Flex p="4">
      <Timestamp data-testid="t" value="2026-02-19T17:00:00Z" format="date" />
    </Flex>
  ),
  play: async ({ canvasElement }) => {
    const t = canvasElement.querySelector<HTMLTimeElement>('[data-testid="t"]')!;
    if (t.tagName !== "TIME") throw new Error("Timestamp must render a <time> element");
    if (t.getAttribute("datetime") !== new Date("2026-02-19T17:00:00Z").toISOString())
      throw new Error(`the <time> must carry the ISO dateTime; got "${t.getAttribute("datetime")}"`);
    // Styled AS a Radix Text (asChild) — one element, no wrapper span around it.
    if (!t.classList.contains("rt-Text")) throw new Error("the <time> must carry Radix Text's class (asChild)");
    if (!t.classList.contains("rt-ds-timestamp")) throw new Error("the <time> must carry the rt-ds-timestamp class");
  },
};

/** Format switching: the machine system_* formats match their exact shapes (locale-independent), and the
 *  relative form differs from the absolute form for the same moment. */
export const FormatSwitching: Story = {
  render: () => (
    <Flex direction="column" gap="2" p="4">
      <Timestamp data-testid="relative" value={iso(2 * 3600 * 1000)} format="relative" />
      <Timestamp data-testid="date_time" value={iso(2 * 3600 * 1000)} format="date_time" />
      <Timestamp data-testid="sys_date" value={iso(2 * 3600 * 1000)} format="system_date" />
      <Timestamp data-testid="sys_time" value={iso(2 * 3600 * 1000)} format="system_time" />
      <Timestamp data-testid="sys_dt" value={iso(2 * 3600 * 1000)} format="system_date_time" />
    </Flex>
  ),
  play: async ({ canvasElement }) => {
    const text = (id: string) => canvasElement.querySelector<HTMLElement>(`[data-testid="${id}"]`)!.textContent ?? "";
    if (!/^\d{4}-\d{2}-\d{2}$/.test(text("sys_date")))
      throw new Error(`system_date must be YYYY-MM-DD; got "${text("sys_date")}"`);
    if (!/^\d{2}:\d{2}:\d{2}$/.test(text("sys_time")))
      throw new Error(`system_time must be HH:MM:SS; got "${text("sys_time")}"`);
    if (!/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/.test(text("sys_dt")))
      throw new Error(`system_date_time must be YYYY-MM-DD HH:MM:SS; got "${text("sys_dt")}"`);
    // The relative and absolute forms of the same moment must differ, and relative must be non-empty.
    if (text("relative").trim() === "") throw new Error("relative must render a non-empty string");
    if (text("relative") === text("date_time"))
      throw new Error("the relative and date_time forms must differ for the same moment");
  },
};

/** Clock-skew tolerance: a value at (or a hair before/after) now renders the locale's "now"; a future value
 *  within the 30s skew window is also "now"; a clearly-past value is NOT "now". */
export const SkewToNow: Story = {
  render: () => (
    <Flex direction="column" gap="2" p="4">
      <Timestamp data-testid="present" value={iso(3 * 1000)} format="relative" />
      <Timestamp data-testid="near-future" value={new Date(Date.now() + 20 * 1000).toISOString()} format="relative" />
      <Timestamp data-testid="past" value={iso(2 * 3600 * 1000)} format="relative" />
    </Flex>
  ),
  play: async ({ canvasElement }) => {
    const text = (id: string) => canvasElement.querySelector<HTMLElement>(`[data-testid="${id}"]`)!.textContent ?? "";
    if (text("present") !== NOW_STR)
      throw new Error(`a value ~3s in the past must read "${NOW_STR}"; got "${text("present")}"`);
    if (text("near-future") !== NOW_STR)
      throw new Error(`a future value within the 30s skew window must read "${NOW_STR}"; got "${text("near-future")}"`);
    if (text("past") === NOW_STR)
      throw new Error(`a 2-hours-ago value must NOT read "${NOW_STR}"`);
  },
};

/** Relative-mode contract: the full absolute string is the aria-label (so "2 hours ago" is unambiguous to
 *  AT and the hover tooltip); an absolute format carries NO aria-label (its text is already the full value). */
export const RelativeLabelContract: Story = {
  render: () => (
    <Flex direction="column" gap="2" p="4">
      <Timestamp data-testid="rel" value={iso(2 * 3600 * 1000)} format="relative" />
      <Timestamp data-testid="abs" value={iso(2 * 3600 * 1000)} format="date_time" />
    </Flex>
  ),
  play: async ({ canvasElement }) => {
    const rel = canvasElement.querySelector<HTMLElement>('[data-testid="rel"]')!;
    const abs = canvasElement.querySelector<HTMLElement>('[data-testid="abs"]')!;
    const label = rel.getAttribute("aria-label");
    if (!label) throw new Error("a relative Timestamp must carry an aria-label with the full absolute time");
    // The full absolute label must be richer than the visible relative text (it names the real moment).
    if (label === rel.textContent) throw new Error("the aria-label must be the full absolute time, not the relative text");
    if (!/\d{4}/.test(label)) throw new Error(`the aria-label should carry a full date (a year); got "${label}"`);
    if (abs.getAttribute("aria-label") != null)
      throw new Error("an absolute-format Timestamp must NOT set an aria-label (its text is already the full value)");
  },
};

/** Live tick: with isLive + relative, a value just inside the "now" window ticks OUT of "now" as the clock
 *  advances past the 10s boundary (the 1s interval firing). Proves the live re-render actually happens. */
export const LiveTick: Story = {
  render: () => (
    <Flex p="4">
      {/* 9s in the past → initially inside the <10s "now" window; the 1s interval ticks it past 10s. */}
      <Timestamp data-testid="live" value={iso(9 * 1000)} format="relative" isLive />
    </Flex>
  ),
  play: async ({ canvasElement }) => {
    const el = canvasElement.querySelector<HTMLElement>('[data-testid="live"]')!;
    const initial = el.textContent ?? "";
    if (initial !== NOW_STR)
      throw new Error(`a 9s-ago live timestamp should start at "${NOW_STR}"; got "${initial}"`);
    // Wait past the 10s boundary — the 1s interval must re-render it off "now".
    await sleep(3500);
    const after = el.textContent ?? "";
    if (after === NOW_STR)
      throw new Error(`the live timestamp must tick off "${NOW_STR}" as time passes; still "${after}"`);
  },
};
