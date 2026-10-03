import type { Meta, StoryObj } from "@storybook/react-vite";
import { Box } from "@radix-ui/themes";
import { DateInput } from "./DateInput";
import type { ISODateString } from "../../dates/dateTypes";

/* _internal — the DateInput BEHAVIORAL test suite. Underscore-prefixed → the `_internal` group, exempt
   from the registry / story-order guards (like `_typeahead.stories.tsx`). Storybook runs a story's `play`
   on VIEW, which visibly flashes the calendar popover; keeping every behavioral play HERE lets the docs
   stories (System/DateInput) stay static and calm on view, while 100% of the coverage still runs in the
   test runner. Each story renders its OWN live specimen and drives it. */

/* ---- play helpers -------------------------------------------------------- */
function typeInto(input: HTMLInputElement, value: string) {
  const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value")!.set!;
  setter.call(input, value);
  input.dispatchEvent(new Event("input", { bubbles: true }));
}
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
const combobox = (root: ParentNode = document) => root.querySelector<HTMLInputElement>('input[role="combobox"]');
const dialogOf = (input: HTMLInputElement) => {
  const id = input.getAttribute("aria-controls");
  return id ? document.getElementById(id) : null;
};
const liveAssertive = () => document.querySelector('[data-ds-live-region="assertive"]')?.textContent ?? "";
const record = (key: string) => (v: ISODateString | undefined) => {
  const w = window as unknown as Record<string, (ISODateString | undefined)[]>;
  (w[key] ??= []).push(v);
};
const calls = (key: string) => (window as unknown as Record<string, (ISODateString | undefined)[]>)[key] ?? [];

const meta: Meta<typeof DateInput> = {
  title: "_internal/DateInput behavior",
  component: DateInput,
  parameters: { controls: { disable: true } },
};
export default meta;
type Story = StoryObj<typeof DateInput>;

/** Parse-on-type fires onValueChange immediately, and opening (Alt+ArrowDown) navigates the calendar to
 *  the typed month and moves focus INTO the grid's roving day (so the calendar is keyboard-operable). */
export const ParseAndNavigate: Story = {
  render: () => (
    <Box p="4" data-testid="di-parse" style={{ maxWidth: 320 }}>
      <DateInput label="Due date" onValueChange={record("diParse")} />
    </Box>
  ),
  play: async ({ canvasElement }) => {
    const scope = canvasElement.querySelector<HTMLElement>('[data-testid="di-parse"]')!;
    const input = combobox(scope)!;

    // ARIA combobox-with-dialog contract at rest.
    if (input.getAttribute("aria-haspopup") !== "dialog") throw new Error('aria-haspopup must be "dialog"');
    if (input.getAttribute("aria-expanded") !== "false") throw new Error('resting aria-expanded must be "false"');
    if (input.getAttribute("aria-autocomplete") !== "none") throw new Error('aria-autocomplete must be "none"');

    // --- parse-on-type fires onValueChange eagerly ---
    (window as unknown as Record<string, unknown[]>)["diParse"] = [];
    input.focus();
    typeInto(input, "2026-03-15");
    await waitFor(() => calls("diParse").length > 0);
    if (calls("diParse").at(-1) !== "2026-03-15")
      throw new Error(`parse-on-type must fire the ISO value; got ${String(calls("diParse").at(-1))}`);
    // The raw typed text is shown while pending (not yet the formatted value).
    if (input.value !== "2026-03-15") throw new Error(`pending shows the raw text; got "${input.value}"`);

    // --- Alt+ArrowDown opens the dialog, moves focus INTO the grid, calendar shows the typed month ---
    press(input, "ArrowDown", { altKey: true });
    const dialog = await waitFor(() => dialogOf(input));
    if (dialog.getAttribute("role") !== "dialog") throw new Error("popover must KEEP role=dialog (D5)");
    if (dialog.getAttribute("aria-label") !== "Choose date") throw new Error('dialog must be named "Choose date"');
    // Focus moves into the grid's roving day so the calendar is keyboard-operable (WCAG 2.1.1).
    const focusedDay = await waitFor(() => {
      const a = document.activeElement as HTMLElement | null;
      return a?.classList?.contains("rt-ds-calendar-day") ? a : null;
    });
    if (!dialog.contains(focusedDay)) throw new Error("open must move focus into the calendar grid (keyboard-operable)");
    const caption = await waitFor(() => dialog.querySelector<HTMLElement>(".rt-ds-calendar-heading"));
    if (!/March 2026/.test(caption.textContent ?? ""))
      throw new Error(`the calendar must navigate to the typed month; caption "${caption.textContent}"`);

    // Escape closes and returns focus to the input.
    press(input, "Escape");
    await waitFor(() => !dialogOf(input));
    if (document.activeElement !== input) throw new Error("Escape must return focus to the input");
  },
};

/** Keyboard operability after open (regression guard for the A3-review HIGH: green axe missed that the
 *  roving-tabindex grid was unreachable when focus stayed in the input). Opening focuses the seed day and
 *  arrows move the roving day. */
export const KeyboardOperable: Story = {
  render: () => (
    <Box p="4" data-testid="di-kbd" style={{ maxWidth: 320 }}>
      <DateInput label="Due date" defaultValue={"2026-07-15" as ISODateString} onValueChange={() => {}} />
    </Box>
  ),
  play: async ({ canvasElement }) => {
    const scope = canvasElement.querySelector<HTMLElement>('[data-testid="di-kbd"]')!;
    const input = combobox(scope)!;
    input.focus();
    press(input, "ArrowDown"); // open
    // Opening moves focus onto the roving SEED day (the committed 2026-07-15) — WCAG 2.1.1 regression guard.
    const day = await waitFor(() => {
      const a = document.activeElement as HTMLElement | null;
      return a?.classList?.contains("rt-ds-calendar-day") ? a : null;
    });
    if (day.getAttribute("data-date") !== "2026-07-15")
      throw new Error(`open must focus the seed day (2026-07-15); got ${day.getAttribute("data-date")}`);
    // ArrowRight moves the roving day → the grid is keyboard-operable.
    press(day, "ArrowRight");
    const moved = await waitFor(() => {
      const a = document.activeElement as HTMLElement | null;
      return a?.getAttribute?.("data-date") === "2026-07-16" ? a : null;
    });
    if (!moved) throw new Error("ArrowRight must move the roving day (grid keyboard-operable)");
  },
};

/** Commit-on-blur: a valid pending value commits and the input reverts to the FORMATTED committed value. */
export const CommitOnBlur: Story = {
  render: () => (
    <Box p="4" data-testid="di-commit" style={{ maxWidth: 320 }}>
      <DateInput label="Due date" onValueChange={record("diCommit")} />
    </Box>
  ),
  play: async ({ canvasElement }) => {
    const scope = canvasElement.querySelector<HTMLElement>('[data-testid="di-commit"]')!;
    const input = combobox(scope)!;
    (window as unknown as Record<string, unknown[]>)["diCommit"] = [];

    input.focus();
    typeInto(input, "2026-04-20");
    await waitFor(() => calls("diCommit").length > 0);
    input.blur();
    await waitFor(() => input.value === "April 20, 2026");
    if (input.value !== "April 20, 2026")
      throw new Error(`commit-on-blur must show the formatted value; got "${input.value}"`);
    if (calls("diCommit").at(-1) !== "2026-04-20") throw new Error("the committed ISO must be the last fired value");
  },
};

/** Silent revert on invalid: the ephemeral parse failure flags aria-invalid WHILE pending, reverts to the
 *  last formatted value on blur, announces assertively, and NEVER enters the validation channel ([[date-input]]). */
export const SilentRevertOnInvalid: Story = {
  render: () => (
    <Box p="4" data-testid="di-revert" style={{ maxWidth: 320 }}>
      <DateInput label="Due date" defaultValue={"2026-05-21" as ISODateString} onValueChange={record("diRevert")} />
    </Box>
  ),
  play: async ({ canvasElement }) => {
    const scope = canvasElement.querySelector<HTMLElement>('[data-testid="di-revert"]')!;
    const input = combobox(scope)!;
    (window as unknown as Record<string, unknown[]>)["diRevert"] = [];

    // Rest shows the formatted committed value.
    if (input.value !== "May 21, 2026") throw new Error(`rest shows the formatted defaultValue; got "${input.value}"`);
    if (input.getAttribute("aria-invalid") === "true") throw new Error("a valid resting field must NOT be aria-invalid");
    // The field is NOT painted with a standing validation state (two channels never cross).
    if (scope.querySelector('[data-validation="error"]'))
      throw new Error("an ephemeral parse failure must not paint the validation channel");

    // Type garbage → aria-invalid WHILE the pending text is unresolved, no value fired.
    input.focus();
    typeInto(input, "not a date");
    await waitFor(() => input.getAttribute("aria-invalid") === "true");
    if (calls("diRevert").length !== 0) throw new Error("unparseable text must not fire onValueChange");

    // Blur → silent revert to the last formatted value + an assertive announcement; aria-invalid clears.
    input.blur();
    await waitFor(() => input.value === "May 21, 2026");
    if (input.getAttribute("aria-invalid") === "true") throw new Error("aria-invalid must clear on revert");
    if (!/didn.t recognize/i.test(liveAssertive()) || !/May 21, 2026/.test(liveAssertive()))
      throw new Error(`revert must announce assertively with the kept date; got "${liveAssertive()}"`);
    if (calls("diRevert").length !== 0) throw new Error("a reverted invalid entry must never fire onValueChange");
    if (scope.querySelector('[data-validation="error"]'))
      throw new Error("after revert the field must stay at neutral rest (no validation paint)");
  },
};

/** Open via the calendar BUTTON (moves focus into the grid), pick a day (commits + closes + refocuses). */
export const CalendarButtonAndSelect: Story = {
  render: () => (
    <Box p="4" data-testid="di-cal" style={{ maxWidth: 320 }}>
      <DateInput label="Due date" defaultValue={"2026-06-10" as ISODateString} onValueChange={record("diCal")} />
    </Box>
  ),
  play: async ({ canvasElement }) => {
    const scope = canvasElement.querySelector<HTMLElement>('[data-testid="di-cal"]')!;
    const input = combobox(scope)!;
    (window as unknown as Record<string, unknown[]>)["diCal"] = [];

    // The calendar button is a REAL tab stop (tabbable) — NOT tabIndex=-1 like the Select/Typeahead ✕.
    const calBtn = scope.querySelector<HTMLButtonElement>('button[aria-label="Choose date"]')!;
    if (!calBtn) throw new Error("the trailing calendar button must render");
    if (calBtn.getAttribute("tabindex") === "-1") throw new Error("the calendar button must be a real tab stop (not tabIndex=-1)");

    // Clicking the button opens the dialog and moves focus INTO the grid (keyboard-operable).
    calBtn.click();
    const dialog = await waitFor(() => dialogOf(input));
    const opened = await waitFor(() => {
      const a = document.activeElement as HTMLElement | null;
      return a?.classList?.contains("rt-ds-calendar-day") ? a : null;
    });
    if (!dialog.contains(opened)) throw new Error("button-open must move focus into the calendar grid");

    // Pick a day → commits its ISO, closes the popover, refocuses the input, shows the formatted value.
    const day = await waitFor(() => dialog.querySelector<HTMLButtonElement>('button[data-date="2026-06-18"]'));
    day.click();
    await waitFor(() => !dialogOf(input));
    if (calls("diCal").at(-1) !== "2026-06-18") throw new Error("selecting a day must fire its ISO value");
    if (input.value !== "June 18, 2026") throw new Error(`the input must show the selected formatted date; got "${input.value}"`);
    if (document.activeElement !== input) throw new Error("closing after select must refocus the input");
  },
};

/** hasClear clears to undefined + refocuses; disabledReason SOFT-disables (aria-disabled + readOnly, the
 *  calendar affordance inert, the reason wired via aria-describedby). */
export const ClearAndDisabledReason: Story = {
  render: () => (
    <Box p="4" style={{ display: "flex", flexDirection: "column", gap: 24, maxWidth: 340 }}>
      <Box data-testid="di-clear">
        <DateInput label="With clear" hasClear defaultValue={"2026-07-04" as ISODateString} onValueChange={record("diClear")} />
      </Box>
      <Box data-testid="di-soft">
        <DateInput label="Soft-disabled" disabled disabledReason="Set the project first." onValueChange={() => {}} />
      </Box>
    </Box>
  ),
  play: async ({ canvasElement }) => {
    // --- hasClear: the trailing ✕ clears to undefined + refocuses (out of tab order) ---
    const clearScope = canvasElement.querySelector<HTMLElement>('[data-testid="di-clear"]')!;
    const ci = combobox(clearScope)!;
    (window as unknown as Record<string, unknown[]>)["diClear"] = [];
    if (ci.value !== "July 4, 2026") throw new Error(`clear specimen shows the formatted value; got "${ci.value}"`);
    const clearBtn = clearScope.querySelector<HTMLButtonElement>('button[aria-label="Clear date"]')!;
    if (!clearBtn) throw new Error("hasClear must render the clear ✕ while a value is set");
    if (clearBtn.getAttribute("tabindex") !== "-1") throw new Error("the clear ✕ must be out of the tab order (tabIndex=-1)");
    clearBtn.click();
    await waitFor(() => ci.value === "");
    if (calls("diClear").at(-1) !== undefined) throw new Error("clear must fire onValueChange(undefined)");
    if (document.activeElement !== ci) throw new Error("clear must refocus the input");

    // --- disabledReason: soft-disable = aria-disabled + readOnly, inert calendar, reason perceivable ---
    const softScope = canvasElement.querySelector<HTMLElement>('[data-testid="di-soft"]')!;
    const si = combobox(softScope)!;
    if (si.getAttribute("aria-disabled") !== "true") throw new Error("soft-disable must set aria-disabled (not native disabled)");
    if (!si.hasAttribute("readonly")) throw new Error("soft-disable must set readOnly");
    if (si.hasAttribute("disabled")) throw new Error("soft-disable must NOT natively disable (it would drop from the a11y tree)");
    if (si.getAttribute("aria-invalid") === "true") throw new Error("a reason is guidance, not an error — never aria-invalid");
    // The reason is wired via aria-describedby → a persistent hidden node (readable before the tooltip opens).
    const describedby = si.getAttribute("aria-describedby");
    if (!describedby) throw new Error("soft-disable must wire aria-describedby to the reason");
    const reasonNode = softScope.querySelector(`#${CSS.escape(describedby.split(" ").at(-1)!)}`);
    if (!/set the project first/i.test(reasonNode?.textContent ?? ""))
      throw new Error("aria-describedby must resolve to the reason text");
    // The calendar affordance is inert: no picker opens on Alt+ArrowDown.
    si.focus();
    press(si, "ArrowDown", { altKey: true });
    await sleep(60);
    if (dialogOf(si)) throw new Error("a soft-disabled field must not open the calendar (handlers early-return)");
  },
};
