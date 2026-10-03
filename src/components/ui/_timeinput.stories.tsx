import type { Meta, StoryObj } from "@storybook/react-vite";
import { Box } from "@radix-ui/themes";
import { TimeInput } from "./TimeInput";
import { type ISOTimeString, adjustTime, formatISOTime } from "../../dates/timeParser";

/* _internal — the TimeInput BEHAVIORAL test suite. Underscore-prefixed → the `_internal` group, exempt
   from the registry / story-order guards (like `_dateinput.stories.tsx`). Storybook runs a story's `play`
   on VIEW; keeping every behavioral play HERE lets the docs stories (System/TimeInput) stay static and
   calm on view, while 100% of the coverage still runs in the test runner. Each story renders its OWN live
   specimen and drives it. Mirrors `_dateinput.stories.tsx`. */

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
// TimeInput is a PLAIN text field — deliberately NOT role="combobox"/"spinbutton" ([[time-input]]) — so scope to <input>.
const field = (root: ParentNode = document) => root.querySelector<HTMLInputElement>("input");
const liveAssertive = () => document.querySelector('[data-ds-live-region="assertive"]')?.textContent ?? "";
const livePolite = () => document.querySelector('[data-ds-live-region="polite"]')?.textContent ?? "";
const record = (key: string) => (v: ISOTimeString | undefined) => {
  const w = window as unknown as Record<string, (ISOTimeString | undefined)[]>;
  (w[key] ??= []).push(v);
};
const calls = (key: string) => (window as unknown as Record<string, (ISOTimeString | undefined)[]>)[key] ?? [];

const meta: Meta<typeof TimeInput> = {
  title: "_internal/TimeInput behavior",
  component: TimeInput,
  parameters: { controls: { disable: true } },
};
export default meta;
type Story = StoryObj<typeof TimeInput>;

/** Parse-on-type fires onValueChange eagerly; the raw text shows while pending; the field is a plain text
 *  input (NOT role=combobox/spinbutton, [[time-input]]). */
export const ParseOnType: Story = {
  render: () => (
    <Box p="4" data-testid="ti-parse" style={{ maxWidth: 320 }}>
      <TimeInput label="Start time" onValueChange={record("tiParse")} />
    </Box>
  ),
  play: async ({ canvasElement }) => {
    const scope = canvasElement.querySelector<HTMLElement>('[data-testid="ti-parse"]')!;
    const input = field(scope)!;
    (window as unknown as Record<string, unknown[]>)["tiParse"] = [];

    // Free-text-first: a plain text input, deliberately NOT a spinbutton / combobox ([[time-input]]).
    if (input.getAttribute("role") === "spinbutton") throw new Error("TimeInput must NOT be role=spinbutton ([[time-input]])");
    if (input.getAttribute("role") === "combobox") throw new Error("TimeInput has no popover — not a combobox");

    input.focus();
    typeInto(input, "3pm");
    await waitFor(() => calls("tiParse").length > 0);
    if (calls("tiParse").at(-1) !== "15:00")
      throw new Error(`parse-on-type must fire the ISO value; got ${String(calls("tiParse").at(-1))}`);
    // The raw typed text is shown while pending (not yet the formatted value).
    if (input.value !== "3pm") throw new Error(`pending shows the raw text; got "${input.value}"`);

    // Blur commits and reverts the display to the FORMATTED value (12h default).
    input.blur();
    await waitFor(() => input.value === "3:00 PM");
    if (String(input.value) !== "3:00 PM") throw new Error(`commit-on-blur must show the formatted value; got "${input.value}"`);
  },
};

/** Commit-on-blur silent revert on invalid: aria-invalid flags WHILE pending, reverts to the last formatted
 *  value on blur, announces ASSERTIVELY, never the validation channel ([[date-input]]/[[time-input]]). */
export const SilentRevertOnInvalid: Story = {
  render: () => (
    <Box p="4" data-testid="ti-revert" style={{ maxWidth: 320 }}>
      <TimeInput label="Start time" defaultValue={"14:30" as ISOTimeString} onValueChange={record("tiRevert")} />
    </Box>
  ),
  play: async ({ canvasElement }) => {
    const scope = canvasElement.querySelector<HTMLElement>('[data-testid="ti-revert"]')!;
    const input = field(scope)!;
    (window as unknown as Record<string, unknown[]>)["tiRevert"] = [];

    // Rest shows the formatted committed value; a valid resting field is not aria-invalid + no validation paint.
    if (input.value !== "2:30 PM") throw new Error(`rest shows the formatted defaultValue; got "${input.value}"`);
    if (input.getAttribute("aria-invalid") === "true") throw new Error("a valid resting field must NOT be aria-invalid");
    if (scope.querySelector('[data-validation="error"]'))
      throw new Error("an ephemeral parse failure must not paint the validation channel");

    // Type garbage → aria-invalid WHILE pending (assertive, not a silent grey-out), no value fired.
    input.focus();
    typeInto(input, "not a time");
    await waitFor(() => input.getAttribute("aria-invalid") === "true");
    if (calls("tiRevert").length !== 0) throw new Error("unparseable text must not fire onValueChange");

    // Blur → silent revert to the last formatted value + an assertive announcement; aria-invalid clears.
    input.blur();
    await waitFor(() => input.value === "2:30 PM");
    if (input.getAttribute("aria-invalid") === "true") throw new Error("aria-invalid must clear on revert");
    if (!/didn.t recognize/i.test(liveAssertive()) || !/2:30 PM/.test(liveAssertive()))
      throw new Error(`revert must announce assertively with the kept time; got "${liveAssertive()}"`);
    if (calls("tiRevert").length !== 0) throw new Error("a reverted invalid entry must never fire onValueChange");
    if (scope.querySelector('[data-validation="error"]'))
      throw new Error("after revert the field must stay at neutral rest (no validation paint)");
  },
};

/** ArrowUp/Down increment in place by `increment` minutes, wraps around midnight, and announces POLITELY. */
export const IncrementAndWrap: Story = {
  render: () => (
    <Box p="4" data-testid="ti-step" style={{ maxWidth: 320 }}>
      <TimeInput label="Start time" defaultValue={"23:59" as ISOTimeString} onValueChange={record("tiStep")} />
    </Box>
  ),
  play: async ({ canvasElement }) => {
    const scope = canvasElement.querySelector<HTMLElement>('[data-testid="ti-step"]')!;
    const input = field(scope)!;
    (window as unknown as Record<string, unknown[]>)["tiStep"] = [];
    input.focus();

    // ArrowUp from 23:59 → wraps to 00:00 (adjustTime double-modulo), fires it, shows "12:00 AM", announces POLITELY.
    press(input, "ArrowUp");
    await waitFor(() => calls("tiStep").at(-1) === "00:00");
    await waitFor(() => input.value === "12:00 AM");
    if (input.value !== "12:00 AM") throw new Error(`ArrowUp wrap must show "12:00 AM"; got "${input.value}"`);
    await waitFor(() => /12:00 AM/.test(livePolite()));
    if (!/12:00 AM/.test(livePolite())) throw new Error(`each step must announce POLITELY; polite region "${livePolite()}"`);
    if (liveAssertive() === "12:00 AM") throw new Error("a step must NOT use the assertive channel (that's for parse failures)");

    // ArrowDown from 00:00 → wraps back to 23:59.
    press(input, "ArrowDown");
    await waitFor(() => calls("tiStep").at(-1) === "23:59");
    await waitFor(() => input.value === "11:59 PM");
    if (String(input.value) !== "11:59 PM") throw new Error(`ArrowDown wrap must show "11:59 PM"; got "${input.value}"`);
  },
};

/** The increment is CLAMPED by min/max — a step that would leave the range is a no-op at the bound. */
export const IncrementClampedByRange: Story = {
  render: () => (
    <Box p="4" style={{ display: "flex", flexDirection: "column", gap: 24, maxWidth: 340 }}>
      <Box data-testid="ti-max">
        <TimeInput label="At max" max={"10:00" as ISOTimeString} defaultValue={"10:00" as ISOTimeString} onValueChange={record("tiMax")} />
      </Box>
      <Box data-testid="ti-min">
        <TimeInput label="At min" min={"10:00" as ISOTimeString} defaultValue={"10:00" as ISOTimeString} onValueChange={record("tiMin")} />
      </Box>
    </Box>
  ),
  play: async ({ canvasElement }) => {
    // At max: ArrowUp would exceed max → no fire, value unchanged.
    const maxScope = canvasElement.querySelector<HTMLElement>('[data-testid="ti-max"]')!;
    const mi = field(maxScope)!;
    (window as unknown as Record<string, unknown[]>)["tiMax"] = [];
    mi.focus();
    press(mi, "ArrowUp");
    await sleep(80);
    if (calls("tiMax").length !== 0) throw new Error("ArrowUp past max must be a no-op (clamped, no fire)");
    if (mi.value !== "10:00 AM") throw new Error(`the value must stay at the bound; got "${mi.value}"`);
    // A step WITHIN range still works (ArrowDown from the max is fine).
    press(mi, "ArrowDown");
    await waitFor(() => calls("tiMax").at(-1) === "09:59");

    // At min: ArrowDown would drop below min → no fire, value unchanged.
    const minScope = canvasElement.querySelector<HTMLElement>('[data-testid="ti-min"]')!;
    const ni = field(minScope)!;
    (window as unknown as Record<string, unknown[]>)["tiMin"] = [];
    ni.focus();
    press(ni, "ArrowDown");
    await sleep(80);
    if (calls("tiMin").length !== 0) throw new Error("ArrowDown below min must be a no-op (clamped, no fire)");
    if (ni.value !== "10:00 AM") throw new Error(`the value must stay at the bound; got "${ni.value}"`);
  },
};

/** Empty-field ArrowUp seeds the base from the current wall-clock time, then increments by one. */
export const EmptySeedFromNow: Story = {
  render: () => (
    <Box p="4" data-testid="ti-seed" style={{ maxWidth: 320 }}>
      <TimeInput label="Start time" hourFormat="24h" onValueChange={record("tiSeed")} />
    </Box>
  ),
  play: async ({ canvasElement }) => {
    const scope = canvasElement.querySelector<HTMLElement>('[data-testid="ti-seed"]')!;
    const input = field(scope)!;
    (window as unknown as Record<string, unknown[]>)["tiSeed"] = [];

    // Capture the clock the component will read, before pressing.
    const before = new Date();
    input.focus();
    press(input, "ArrowUp");
    await waitFor(() => calls("tiSeed").length > 0);
    const got = calls("tiSeed").at(-1);
    if (!got || !/^\d{2}:\d{2}$/.test(got)) throw new Error(`empty ArrowUp must fire a valid seeded time; got ${String(got)}`);

    // Acceptable = now+1min, tolerating a minute boundary tick between the test's read and the component's.
    const seedAt = (d: Date) =>
      formatISOTime({ hour: d.getHours(), minute: d.getMinutes(), second: d.getSeconds() });
    const accept = new Set([
      adjustTime(seedAt(before), 1),
      adjustTime(seedAt(new Date(before.getTime() + 1000)), 1),
      adjustTime(seedAt(new Date(before.getTime() + 2000)), 1),
    ]);
    if (!accept.has(got))
      throw new Error(`empty ArrowUp must seed from NOW and add 1min (expected ~${[...accept].join("/")}); got ${got}`);
    // The display reflects the seeded value (24h here).
    if (input.value !== got) throw new Error(`the field must show the seeded value ${got}; got "${input.value}"`);
  },
};

/** hasClear clears to undefined + refocuses (out of tab order); disabledReason SOFT-disables (aria-disabled
 *  + readOnly, the increment inert, the reason wired via aria-describedby). */
export const ClearAndDisabledReason: Story = {
  render: () => (
    <Box p="4" style={{ display: "flex", flexDirection: "column", gap: 24, maxWidth: 340 }}>
      <Box data-testid="ti-clear">
        <TimeInput label="With clear" hasClear defaultValue={"09:15" as ISOTimeString} onValueChange={record("tiClear")} />
      </Box>
      <Box data-testid="ti-soft">
        <TimeInput label="Soft-disabled" disabled disabledReason="Pick a date first." defaultValue={"09:00" as ISOTimeString} onValueChange={record("tiSoft")} />
      </Box>
    </Box>
  ),
  play: async ({ canvasElement }) => {
    // --- hasClear: the trailing ✕ clears to undefined + refocuses (out of tab order) ---
    const clearScope = canvasElement.querySelector<HTMLElement>('[data-testid="ti-clear"]')!;
    const ci = field(clearScope)!;
    (window as unknown as Record<string, unknown[]>)["tiClear"] = [];
    if (ci.value !== "9:15 AM") throw new Error(`clear specimen shows the formatted value; got "${ci.value}"`);
    const clearBtn = clearScope.querySelector<HTMLButtonElement>('button[aria-label="Clear time"]')!;
    if (!clearBtn) throw new Error("hasClear must render the clear ✕ while a value is set");
    if (clearBtn.getAttribute("tabindex") !== "-1") throw new Error("the clear ✕ must be out of the tab order (tabIndex=-1)");
    clearBtn.click();
    await waitFor(() => ci.value === "");
    if (calls("tiClear").at(-1) !== undefined) throw new Error("clear must fire onValueChange(undefined)");
    if (document.activeElement !== ci) throw new Error("clear must refocus the input");

    // --- disabledReason: soft-disable = aria-disabled + readOnly, inert increment, reason perceivable ---
    const softScope = canvasElement.querySelector<HTMLElement>('[data-testid="ti-soft"]')!;
    const si = field(softScope)!;
    (window as unknown as Record<string, unknown[]>)["tiSoft"] = [];
    if (si.getAttribute("aria-disabled") !== "true") throw new Error("soft-disable must set aria-disabled (not native disabled)");
    if (!si.hasAttribute("readonly")) throw new Error("soft-disable must set readOnly");
    if (si.hasAttribute("disabled")) throw new Error("soft-disable must NOT natively disable (it would drop from the a11y tree)");
    if (si.getAttribute("aria-invalid") === "true") throw new Error("a reason is guidance, not an error — never aria-invalid");
    // The reason is wired via aria-describedby → a persistent hidden node (readable before the tooltip opens).
    const describedby = si.getAttribute("aria-describedby");
    if (!describedby) throw new Error("soft-disable must wire aria-describedby to the reason");
    const reasonNode = softScope.querySelector(`#${CSS.escape(describedby.split(" ").at(-1)!)}`);
    if (!/pick a date first/i.test(reasonNode?.textContent ?? ""))
      throw new Error("aria-describedby must resolve to the reason text");
    // The increment is inert: ArrowUp does not fire while soft-disabled (handlers early-return).
    si.focus();
    press(si, "ArrowUp");
    await sleep(80);
    if (calls("tiSoft").length !== 0) throw new Error("a soft-disabled field must not increment (handlers early-return)");
  },
};
