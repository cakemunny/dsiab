import type { Meta, StoryObj } from "@storybook/react-vite";
import { Box } from "@radix-ui/themes";
import { DateRangeInput, type DateRangePreset } from "./DateRangeInput";
import type { DateRange, ISODateString } from "../../dates/dateTypes";

/* _internal — the DateRangeInput BEHAVIORAL test suite. Underscore-prefixed → the `_internal` group, exempt
   from the registry / story-order guards (like `_dateinput.stories.tsx`). Storybook runs a story's `play`
   on VIEW, which visibly flashes the dialog; keeping every behavioral play HERE lets the docs stories
   (System/DateRangeInput) stay static and calm on view, while 100% of the coverage still runs in the test
   runner. Each story renders its OWN live specimen and drives it. */

/* ---- play helpers -------------------------------------------------------- */
function press(el: Element, key: string, opts: KeyboardEventInit = {}) {
  el.dispatchEvent(new KeyboardEvent("keydown", { key, bubbles: true, cancelable: true, ...opts }));
}
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
const triggerOf = (root: ParentNode = document) =>
  root.querySelector<HTMLButtonElement>('button[aria-haspopup="dialog"]');
const dialogOf = (trigger: HTMLButtonElement) => {
  const id = trigger.getAttribute("aria-controls");
  return id ? document.getElementById(id) : null;
};
// The visible smart-formatted range lives in the aria-hidden span; the SR full-form in the sibling
// VisuallyHidden span; the placeholder is a bare text node in the inner when empty.
const displayText = (trigger: HTMLButtonElement) =>
  trigger.querySelector('.rt-SelectTriggerInner span[aria-hidden="true"]')?.textContent ?? "";
const srText = (trigger: HTMLButtonElement) =>
  trigger.querySelector<HTMLElement>('.rt-SelectTriggerInner span:not([aria-hidden])')?.textContent ?? "";
const innerText = (trigger: HTMLButtonElement) =>
  trigger.querySelector(".rt-SelectTriggerInner")?.textContent ?? "";

type RangeOrUndef = DateRange | undefined;
const record = (key: string) => (v: RangeOrUndef) => {
  const w = window as unknown as Record<string, RangeOrUndef[]>;
  (w[key] ??= []).push(v);
};
const calls = (key: string) => (window as unknown as Record<string, RangeOrUndef[]>)[key] ?? [];
const reset = (key: string) => {
  (window as unknown as Record<string, RangeOrUndef[]>)[key] = [];
};

const R = (start: string, end: string): DateRange => ({ start: start as ISODateString, end: end as ISODateString });

const meta: Meta<typeof DateRangeInput> = {
  title: "_internal/DateRangeInput behavior",
  component: DateRangeInput,
  parameters: { controls: { disable: true } },
};
export default meta;
type Story = StoryObj<typeof DateRangeInput>;

/** Opening the dialog: aria-haspopup=dialog, a named role=dialog, and focus moves INTO the range grid's
 *  roving day so the calendar is keyboard-operable (the WCAG 2.1.1 regression guard — a roving-tabindex
 *  grid is unreachable if focus stays on the trigger; green axe can't detect that focus-order gap). */
export const OpensDialogFocusIntoGrid: Story = {
  render: () => (
    <Box p="4" data-testid="dr-open" style={{ maxWidth: 340 }}>
      <DateRangeInput label="Report window" defaultValue={R("2026-07-15", "2026-07-20")} onValueChange={() => {}} />
    </Box>
  ),
  play: async ({ canvasElement }) => {
    const scope = canvasElement.querySelector<HTMLElement>('[data-testid="dr-open"]')!;
    const trigger = triggerOf(scope)!;

    // ARIA dialog-trigger contract at rest.
    if (trigger.getAttribute("aria-haspopup") !== "dialog") throw new Error('aria-haspopup must be "dialog" (not listbox)');
    if (trigger.getAttribute("aria-expanded") !== "false") throw new Error('resting aria-expanded must be "false"');
    // No caret — this opens a dialog, not a dropdown.
    if (scope.querySelector(".rt-SelectIcon")) throw new Error("the trigger must NOT render a caret (it opens a dialog)");

    trigger.click();
    const dialog = await waitFor(() => dialogOf(trigger));
    if (dialog.getAttribute("role") !== "dialog") throw new Error("popover must KEEP role=dialog");
    if (dialog.getAttribute("aria-label") !== "Choose date range") throw new Error('dialog must be named "Choose date range"');
    if (trigger.getAttribute("aria-expanded") !== "true") throw new Error("open must flip aria-expanded to true");

    // Focus moves into the grid's roving day (the committed start, 2026-07-15) so it's keyboard-operable.
    const day = await waitFor(() => {
      const a = document.activeElement as HTMLElement | null;
      return a?.classList?.contains("rt-ds-calendar-day") ? a : null;
    });
    if (!dialog.contains(day)) throw new Error("open must move focus INTO the calendar grid (keyboard-operable)");
    if (day.getAttribute("data-date") !== "2026-07-15")
      throw new Error(`open must focus the seed day (range start 2026-07-15); got ${day.getAttribute("data-date")}`);

    // ArrowRight moves the roving day → the grid is keyboard-operable.
    press(day, "ArrowRight");
    const moved = await waitFor(() => {
      const a = document.activeElement as HTMLElement | null;
      return a?.getAttribute?.("data-date") === "2026-07-16" ? a : null;
    });
    if (!moved) throw new Error("ArrowRight must move the roving day (grid keyboard-operable)");

    // Escape closes and returns focus to the trigger.
    press(dialog, "Escape");
    await waitFor(() => !dialogOf(trigger));
    if (document.activeElement !== trigger) throw new Error("Escape must return focus to the trigger");
  },
};

/** Pick a range with two calendar clicks → onValueChange fires the committed {start,end} (normalized) and
 *  the trigger shows the smart-formatted range. */
export const PickRangeTwoClicks: Story = {
  render: () => (
    <Box p="4" data-testid="dr-pick" style={{ maxWidth: 340 }}>
      <DateRangeInput label="Report window" defaultValue={R("2026-07-03", "2026-07-05")} onValueChange={record("drPick")} />
    </Box>
  ),
  play: async ({ canvasElement }) => {
    const scope = canvasElement.querySelector<HTMLElement>('[data-testid="dr-pick"]')!;
    const trigger = triggerOf(scope)!;
    reset("drPick");

    trigger.click();
    const dialog = await waitFor(() => dialogOf(trigger));

    // Two clicks in the visible month (July 2026, seeded by the start) commit a NEW range.
    const d1 = await waitFor(() => dialog.querySelector<HTMLButtonElement>('button[data-date="2026-07-10"]'));
    d1.click();
    const d2 = await waitFor(() => dialog.querySelector<HTMLButtonElement>('button[data-date="2026-07-20"]'));
    d2.click();

    await waitFor(() => calls("drPick").length > 0 && calls("drPick").at(-1) !== undefined);
    const last = calls("drPick").at(-1)!;
    if (last.start !== "2026-07-10" || last.end !== "2026-07-20")
      throw new Error(`two clicks must commit the normalized range; got ${JSON.stringify(last)}`);

    // The trigger shows the formatted range (same-year, so no year; an en dash between).
    await waitFor(() => /10/.test(displayText(trigger)) && /20/.test(displayText(trigger)));
    if (/2026/.test(displayText(trigger)))
      throw new Error(`a same-year range must drop the year; got "${displayText(trigger)}"`);
    if (!srText(trigger).includes("to"))
      throw new Error(`the SR full form must join with "to"; got "${srText(trigger)}"`);
  },
};

/** Pick a PRESET → onValueChange fires its range, the preset carries aria-current="true", the grid reflects
 *  the range, and the dialog STAYS OPEN (the keep-open divergence). */
export const PresetKeepsOpen: Story = {
  render: () => {
    const presets: DateRangePreset[] = [
      { label: "Q3 2026", getRange: () => R("2026-07-01", "2026-09-30") },
      { label: "Q4 2026", getRange: () => R("2026-10-01", "2026-12-31") },
    ];
    return (
      <Box p="4" data-testid="dr-preset" style={{ maxWidth: 380 }}>
        <DateRangeInput label="Report window" presets={presets} onValueChange={record("drPreset")} />
      </Box>
    );
  },
  play: async ({ canvasElement }) => {
    const scope = canvasElement.querySelector<HTMLElement>('[data-testid="dr-preset"]')!;
    const trigger = triggerOf(scope)!;
    reset("drPreset");

    trigger.click();
    const dialog = await waitFor(() => dialogOf(trigger));

    // The preset group is a role="group" (NOT a listbox) of plain Tab-order buttons.
    const group = dialog.querySelector<HTMLElement>('[role="group"][aria-label="Date range presets"]')!;
    if (!group) throw new Error("presets must render inside a role=group named 'Date range presets'");
    if (dialog.querySelector('[role="listbox"]')) throw new Error("presets must NOT be a listbox");
    const q3 = Array.from(group.querySelectorAll("button")).find((b) => /Q3 2026/.test(b.textContent ?? ""))!;
    if (!q3) throw new Error("the Q3 preset button must render");
    if (q3.getAttribute("aria-current") === "true") throw new Error("an inactive preset must not carry aria-current");

    q3.click();

    // onValueChange fired the preset's range.
    await waitFor(() => calls("drPreset").length > 0 && calls("drPreset").at(-1) !== undefined);
    const last = calls("drPreset").at(-1)!;
    if (last.start !== "2026-07-01" || last.end !== "2026-09-30")
      throw new Error(`a preset click must fire its range; got ${JSON.stringify(last)}`);

    // The active preset now carries aria-current="true".
    await waitFor(() => q3.getAttribute("aria-current") === "true");

    // The grid reflects the range (the start endpoint is painted as a range start).
    const startCell = await waitFor(() => dialog.querySelector<HTMLButtonElement>('button[data-date="2026-07-01"]'));
    if (startCell.getAttribute("data-range") !== "start")
      throw new Error(`the grid must show the preset range (start endpoint); got data-range=${startCell.getAttribute("data-range")}`);

    // The dialog STAYS OPEN (the keep-open divergence) — Done/Escape/outside-click would close it.
    await sleep(80);
    if (!dialogOf(trigger)) throw new Error("a preset click must KEEP the dialog open (confirm/refine)");
  },
};

/** hasClear (default) renders the ✕ (out of tab order) that clears to undefined + refocuses the trigger; the
 *  focused trigger's Backspace/Delete is its keyboard parity. */
export const ClearAndBackspaceParity: Story = {
  render: () => (
    <Box p="4" style={{ display: "flex", flexDirection: "column", gap: 24, maxWidth: 360 }}>
      <Box data-testid="dr-clear">
        <DateRangeInput label="With clear" defaultValue={R("2026-07-04", "2026-07-11")} onValueChange={record("drClear")} />
      </Box>
      <Box data-testid="dr-bksp">
        <DateRangeInput label="Backspace parity" defaultValue={R("2026-07-04", "2026-07-11")} onValueChange={record("drBksp")} />
      </Box>
    </Box>
  ),
  play: async ({ canvasElement }) => {
    // --- hasClear: the trailing ✕ clears to undefined + refocuses (out of tab order) ---
    const clearScope = canvasElement.querySelector<HTMLElement>('[data-testid="dr-clear"]')!;
    const ct = triggerOf(clearScope)!;
    reset("drClear");
    if (!/4/.test(displayText(ct)) || !/11/.test(displayText(ct)))
      throw new Error(`clear specimen shows the formatted range; got "${displayText(ct)}"`);
    const clearBtn = clearScope.querySelector<HTMLButtonElement>('button[aria-label="Clear dates"]')!;
    if (!clearBtn) throw new Error("hasClear (default) must render the clear ✕ while a value is set");
    if (clearBtn.getAttribute("tabindex") !== "-1") throw new Error("the clear ✕ must be out of the tab order (tabIndex=-1)");
    clearBtn.click();
    await waitFor(() => calls("drClear").length > 0);
    if (calls("drClear").at(-1) !== undefined) throw new Error("clear must fire onValueChange(undefined)");
    await waitFor(() => /Select dates/.test(innerText(ct)));
    if (document.activeElement !== ct) throw new Error("clear must refocus the trigger");

    // --- Backspace/Delete parity on the focused trigger ---
    const bkspScope = canvasElement.querySelector<HTMLElement>('[data-testid="dr-bksp"]')!;
    const bt = triggerOf(bkspScope)!;
    reset("drBksp");
    bt.focus();
    press(bt, "Backspace");
    await waitFor(() => calls("drBksp").length > 0);
    if (calls("drBksp").at(-1) !== undefined) throw new Error("Backspace on the focused trigger must clear to undefined");
    await waitFor(() => /Select dates/.test(innerText(bt)));
  },
};

/** The smart display format: a same-year range drops the year; a cross-year range keeps it. Both back the
 *  visible en-dash form with an unambiguous "to" full form for screen readers. */
export const SmartFormat: Story = {
  render: () => (
    <Box p="4" style={{ display: "flex", flexDirection: "column", gap: 24, maxWidth: 360 }}>
      <Box data-testid="dr-same">
        <DateRangeInput label="Same year" defaultValue={R("2026-07-03", "2026-07-10")} onValueChange={() => {}} />
      </Box>
      <Box data-testid="dr-cross">
        <DateRangeInput label="Cross year" defaultValue={R("2025-12-30", "2026-01-02")} onValueChange={() => {}} />
      </Box>
      <Box data-testid="dr-one">
        <DateRangeInput label="Single day" defaultValue={R("2026-07-03", "2026-07-03")} onValueChange={() => {}} />
      </Box>
    </Box>
  ),
  play: async ({ canvasElement }) => {
    // Same-year → the year is dropped from the visible form.
    const sameT = triggerOf(canvasElement.querySelector<HTMLElement>('[data-testid="dr-same"]')!)!;
    if (/2026/.test(displayText(sameT))) throw new Error(`same-year must drop the year; got "${displayText(sameT)}"`);
    if (!/3/.test(displayText(sameT)) || !/10/.test(displayText(sameT)))
      throw new Error(`same-year must show both days; got "${displayText(sameT)}"`);
    if (!/July 3 to July 10, 2026/.test(srText(sameT)))
      throw new Error(`same-year SR full form must be unambiguous with "to"; got "${srText(sameT)}"`);

    // Cross-year → BOTH years are kept in the visible form.
    const crossT = triggerOf(canvasElement.querySelector<HTMLElement>('[data-testid="dr-cross"]')!)!;
    if (!/2025/.test(displayText(crossT)) || !/2026/.test(displayText(crossT)))
      throw new Error(`cross-year must keep both years; got "${displayText(crossT)}"`);
    if (!/December 30, 2025 to January 2, 2026/.test(srText(crossT)))
      throw new Error(`cross-year SR full form must name both endpoints; got "${srText(crossT)}"`);

    // start == end → a single date (no dash).
    const oneT = triggerOf(canvasElement.querySelector<HTMLElement>('[data-testid="dr-one"]')!)!;
    if (/–/.test(displayText(oneT))) throw new Error(`a single-day range must not show a dash; got "${displayText(oneT)}"`);
    if (!/July 3, 2026/.test(srText(oneT))) throw new Error(`a single-day SR form is the one date; got "${srText(oneT)}"`);
  },
};

/** disabledReason SOFT-disables (aria-disabled, NOT native disabled, reason via aria-describedby); the
 *  dialog stays inert (the click handler early-returns while soft). */
export const SoftDisabledReason: Story = {
  render: () => (
    <Box p="4" data-testid="dr-soft" style={{ maxWidth: 340 }}>
      <DateRangeInput label="Soft-disabled" disabled disabledReason="Pick a project first." onValueChange={() => {}} />
    </Box>
  ),
  play: async ({ canvasElement }) => {
    const scope = canvasElement.querySelector<HTMLElement>('[data-testid="dr-soft"]')!;
    const trigger = triggerOf(scope)!;
    if (trigger.getAttribute("aria-disabled") !== "true") throw new Error("soft-disable must set aria-disabled (not native disabled)");
    if (trigger.hasAttribute("disabled")) throw new Error("soft-disable must NOT natively disable (it would drop from the a11y tree)");
    if (trigger.getAttribute("aria-invalid") === "true") throw new Error("a reason is guidance, not an error — never aria-invalid");
    const describedby = trigger.getAttribute("aria-describedby");
    if (!describedby) throw new Error("soft-disable must wire aria-describedby to the reason");
    const reasonNode = scope.querySelector(`#${CSS.escape(describedby.split(" ").at(-1)!)}`);
    if (!/pick a project first/i.test(reasonNode?.textContent ?? ""))
      throw new Error("aria-describedby must resolve to the reason text");
    // Clicking a soft-disabled trigger does not open the dialog (handlers early-return).
    trigger.click();
    await sleep(60);
    if (dialogOf(trigger)) throw new Error("a soft-disabled trigger must not open the dialog");
  },
};
