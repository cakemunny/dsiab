import type { Meta, StoryObj } from "@storybook/react-vite";
import { Box } from "@radix-ui/themes";
import { DateTimeInput, type ISODateTimeString } from "./DateTimeInput";

/* _internal — the DateTimeInput BEHAVIORAL test suite. Underscore-prefixed → the `_internal` group, exempt
   from the registry / story-order guards (like `_dateinput.stories.tsx` / `_timeinput.stories.tsx`). Storybook
   runs a story's `play` on VIEW; keeping every behavioral play HERE lets the docs stories (System/DateTimeInput)
   stay static and calm on view, while 100% of the coverage still runs in the test runner. Each story renders its
   OWN live specimen and drives it. */

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
// The composite embeds a DATE field (role="combobox", aria-label="Date") + a TIME field (plain input,
// aria-label="Time"). Scope each by its own aria-label — which also proves they carry DISTINCT names.
const dateField = (root: ParentNode) => root.querySelector<HTMLInputElement>('input[aria-label="Date"]');
const timeField = (root: ParentNode) => root.querySelector<HTMLInputElement>('input[aria-label="Time"]');
const liveAssertive = () => document.querySelector('[data-ds-live-region="assertive"]')?.textContent ?? "";
const record = (key: string) => (v: ISODateTimeString | undefined) => {
  const w = window as unknown as Record<string, (ISODateTimeString | undefined)[]>;
  (w[key] ??= []).push(v);
};
const calls = (key: string) => (window as unknown as Record<string, (ISODateTimeString | undefined)[]>)[key] ?? [];
const dt = (s: string) => s as ISODateTimeString;

const meta: Meta<typeof DateTimeInput> = {
  title: "_internal/DateTimeInput behavior",
  component: DateTimeInput,
  parameters: { controls: { disable: true } },
};
export default meta;
type Story = StoryObj<typeof DateTimeInput>;

/** The GROUP has ONE label; the two sub-inputs carry their OWN distinct aria-labels + DISTINCT ids (no
 *  double-labeling, no duplicate-id collision — the bare-child-under-FieldGroup dodge). */
export const GroupLabelingNoDuplicateId: Story = {
  render: () => (
    <Box p="4" data-testid="dt-group" style={{ maxWidth: 420 }}>
      <DateTimeInput label="Appointment" onValueChange={record("dtGroup")} />
    </Box>
  ),
  play: async ({ canvasElement }) => {
    const scope = canvasElement.querySelector<HTMLElement>('[data-testid="dt-group"]')!;

    // Exactly ONE grouping element, named once via aria-labelledby → the single group LABEL.
    const groups = scope.querySelectorAll('[role="group"]');
    if (groups.length !== 1) throw new Error(`the composite must render exactly ONE role=group; got ${groups.length}`);
    const group = groups[0] as HTMLElement;
    const labelledby = group.getAttribute("aria-labelledby");
    if (!labelledby) throw new Error("the group must be named via aria-labelledby (the FieldGroup label)");
    const labelEl = document.getElementById(labelledby);
    if ((labelEl?.textContent ?? "") !== "Appointment")
      throw new Error(`aria-labelledby must resolve to the group label; got "${labelEl?.textContent}"`);

    // Two sub-inputs, each named by its OWN aria-label — DISTINCT accessible names.
    const di = dateField(scope);
    const ti = timeField(scope);
    if (!di || !ti) throw new Error("both a Date field and a Time field must render");
    if (di.getAttribute("aria-label") !== "Date") throw new Error("the date field must be named 'Date'");
    if (ti.getAttribute("aria-label") !== "Time") throw new Error("the time field must be named 'Time'");
    // The duplicate-id collision is AVOIDED: under a FieldGroupCtx there is NO FieldCtx, so
    // useOptionalFieldControl returns null and neither bare input is stamped with a shared field id (both
    // would otherwise grab the same `${base}-control`). Verify NO id repeats anywhere in the composite.
    const ids = [...scope.querySelectorAll<HTMLElement>("[id]")].map((e) => e.id);
    const dupes = ids.filter((id, i) => ids.indexOf(id) !== i);
    if (dupes.length) throw new Error(`duplicate-id collision in the composite: ${[...new Set(dupes)].join(", ")}`);
    // The children use their OWN aria-label — they do NOT adopt a shared FieldGroup labelledby (would collide).
    if (di.getAttribute("aria-labelledby")) throw new Error("the date field must not carry a group aria-labelledby");
    if (ti.getAttribute("aria-labelledby")) throw new Error("the time field must not carry a group aria-labelledby");
    // The date field is the combobox (its own popover); the time field is a plain input.
    if (di.getAttribute("role") !== "combobox") throw new Error("the date field keeps role=combobox");
    if (ti.getAttribute("role")) throw new Error("the time field is a plain input (no role)");
  },
};

/** Typing a date auto-seeds the current time (a date pick never emits date-only); typing a time then combines
 *  once into a single ISODateTime at the 'T'. */
export const CombineAndAutoSeed: Story = {
  render: () => (
    <Box p="4" data-testid="dt-combine" style={{ maxWidth: 420 }}>
      <DateTimeInput label="Appointment" onValueChange={record("dtCombine")} />
    </Box>
  ),
  play: async ({ canvasElement }) => {
    const scope = canvasElement.querySelector<HTMLElement>('[data-testid="dt-combine"]')!;
    const di = dateField(scope)!;
    const ti = timeField(scope)!;
    (window as unknown as Record<string, unknown[]>)["dtCombine"] = [];

    // Type a date → AUTO-SEED now: a date selection always combines with a time (never date-only).
    di.focus();
    typeInto(di, "2026-03-15");
    await waitFor(() => calls("dtCombine").length > 0);
    const seeded = calls("dtCombine").at(-1);
    if (!seeded || !/^2026-03-15T\d{2}:\d{2}$/.test(seeded))
      throw new Error(`a date pick must auto-seed a time and fire a combined ISODateTime; got ${String(seeded)}`);
    // The time field now shows the seeded value (non-empty) — proof the empty half was filled.
    await waitFor(() => (timeField(scope)?.value ?? "") !== "");

    // Type a time → combine at the 'T' with the existing date, fired as ONE combined value.
    ti.focus();
    typeInto(ti, "9:00 AM");
    await waitFor(() => calls("dtCombine").at(-1) === "2026-03-15T09:00");
    if (calls("dtCombine").at(-1) !== "2026-03-15T09:00")
      throw new Error(`typing date + time must combine to the ISODateTime; got ${String(calls("dtCombine").at(-1))}`);
  },
};

/** Conditional clamp: on the MIN boundary date the embedded TimeInput's bound tightens, the window HINT
 *  appears (guidance, not error), a too-early time REVERTS via TimeInput's own channel, and moving off the
 *  boundary lifts the bound + hides the hint. */
export const ConditionalClampAndHint: Story = {
  render: () => (
    <Box p="4" data-testid="dt-clamp" style={{ maxWidth: 420 }}>
      <DateTimeInput
        label="Delivery slot"
        min={dt("2026-07-03T09:00")}
        max={dt("2026-07-05T17:00")}
        onValueChange={record("dtClamp")}
      />
    </Box>
  ),
  play: async ({ canvasElement }) => {
    const scope = canvasElement.querySelector<HTMLElement>('[data-testid="dt-clamp"]')!;
    const di = dateField(scope)!;
    const ti = timeField(scope)!;
    (window as unknown as Record<string, unknown[]>)["dtClamp"] = [];

    // Land on the MIN boundary date → the window hint appears (weak-neutral guidance, never aria-invalid).
    di.focus();
    typeInto(di, "2026-07-03");
    di.blur();
    const desc = await waitFor(() => scope.querySelector<HTMLElement>('[data-field-part="description"]'));
    if (!/On Jul 3, times from 9:00 AM are available\./.test(desc.textContent ?? ""))
      throw new Error(`the boundary-date hint must show the window; got "${desc.textContent}"`);
    // The hint is GUIDANCE — the group is not marked invalid, the field is not painted with a validation state.
    const group = scope.querySelector<HTMLElement>('[role="group"]')!;
    if (group.getAttribute("aria-invalid") === "true") throw new Error("the window hint must not set aria-invalid (guidance, not error)");
    if (scope.querySelector('[data-validation="error"]')) throw new Error("the window hint must not paint the validation channel");

    // The time bound TIGHTENED: a too-early time reverts via TimeInput's OWN ephemeral channel (not the composite).
    ti.focus();
    typeInto(ti, "7:00 AM");
    await waitFor(() => ti.getAttribute("aria-invalid") === "true"); // aria-invalid WHILE pending (out of range)
    ti.blur();
    await waitFor(() => ti.value !== "7:00 AM"); // silently reverts
    if (!/at or after 9:00 AM/i.test(liveAssertive()))
      throw new Error(`a too-early time must revert with TimeInput's assertive announce; got "${liveAssertive()}"`);
    if (calls("dtClamp").some((v) => v === "2026-07-03T07:00"))
      throw new Error("a too-early time must never be committed to the composite");

    // Move to a BETWEEN date → the bound lifts and the hint disappears (time is unconstrained mid-range).
    typeInto(di, "2026-07-04");
    di.blur();
    await waitFor(() => {
      const d = scope.querySelector<HTMLElement>('[data-field-part="description"]');
      return !d || !/times from/.test(d.textContent ?? "");
    });
  },
};

/** On a date change, the current time SNAPS into the new date's window — up onto minTime landing on minDate,
 *  down onto maxTime landing on maxDate (a silent snap, not an error). */
export const SnapToBoundaryOnDateChange: Story = {
  render: () => (
    <Box p="4" style={{ display: "flex", flexDirection: "column", gap: 24, maxWidth: 420 }}>
      <Box data-testid="dt-snapup">
        <DateTimeInput
          label="Snap up"
          min={dt("2026-07-03T09:00")}
          max={dt("2026-07-05T17:00")}
          defaultValue={dt("2026-07-04T07:00")}
          onValueChange={record("dtSnapUp")}
        />
      </Box>
      <Box data-testid="dt-snapdown">
        <DateTimeInput
          label="Snap down"
          min={dt("2026-07-03T09:00")}
          max={dt("2026-07-05T17:00")}
          defaultValue={dt("2026-07-04T18:00")}
          onValueChange={record("dtSnapDown")}
        />
      </Box>
    </Box>
  ),
  play: async ({ canvasElement }) => {
    // Snap UP: 7:00 AM carried onto the MIN date (09:00 floor) → snaps to 09:00.
    const up = canvasElement.querySelector<HTMLElement>('[data-testid="dt-snapup"]')!;
    const upDate = dateField(up)!;
    (window as unknown as Record<string, unknown[]>)["dtSnapUp"] = [];
    upDate.focus();
    typeInto(upDate, "2026-07-03");
    await waitFor(() => calls("dtSnapUp").at(-1) === "2026-07-03T09:00");
    if (calls("dtSnapUp").at(-1) !== "2026-07-03T09:00")
      throw new Error(`landing on minDate below minTime must snap UP to 09:00; got ${String(calls("dtSnapUp").at(-1))}`);
    await waitFor(() => timeField(up)?.value === "9:00 AM");

    // Snap DOWN: 6:00 PM carried onto the MAX date (17:00 ceiling) → snaps to 17:00.
    const down = canvasElement.querySelector<HTMLElement>('[data-testid="dt-snapdown"]')!;
    const downDate = dateField(down)!;
    (window as unknown as Record<string, unknown[]>)["dtSnapDown"] = [];
    downDate.focus();
    typeInto(downDate, "2026-07-05");
    await waitFor(() => calls("dtSnapDown").at(-1) === "2026-07-05T17:00");
    if (calls("dtSnapDown").at(-1) !== "2026-07-05T17:00")
      throw new Error(`landing on maxDate above maxTime must snap DOWN to 17:00; got ${String(calls("dtSnapDown").at(-1))}`);
    await waitFor(() => timeField(down)?.value === "5:00 PM");
  },
};

/** The COMPOSITE STANDING problem surfaces ONCE on FieldGroup.Message (role="alert") + the group's composite
 *  aria-invalid — and is NOT double-rendered on either bare sub-field. */
export const CompositeStandingError: Story = {
  render: () => (
    <Box p="4" data-testid="dt-standing" style={{ maxWidth: 420 }}>
      <DateTimeInput
        label="Booking"
        validation={{ tone: "error", message: "That slot is already taken." }}
        defaultValue={dt("2026-07-04T10:00")}
        onValueChange={record("dtStanding")}
      />
    </Box>
  ),
  play: async ({ canvasElement }) => {
    const scope = canvasElement.querySelector<HTMLElement>('[data-testid="dt-standing"]')!;

    // ONE composite message, role="alert" (fires on appearance), carrying the corrective copy.
    const alerts = scope.querySelectorAll('[role="alert"]');
    if (alerts.length !== 1) throw new Error(`the composite error must render exactly ONE role=alert; got ${alerts.length}`);
    if (!/that slot is already taken/i.test(alerts[0].textContent ?? ""))
      throw new Error(`the composite message must carry the corrective copy; got "${alerts[0].textContent}"`);

    // The GROUP carries the composite aria-invalid (the minimal standing signal for the pair).
    const group = scope.querySelector<HTMLElement>('[role="group"]')!;
    if (group.getAttribute("aria-invalid") !== "true")
      throw new Error("a composite error must set the group's aria-invalid");

    // NOT double-rendered: exactly ONE [data-validation="error"] — the composite's own FieldGroup.Root. A bare
    // sub-field renders no Field.Root, so a per-field standing error would show up as a SECOND marker.
    const marked = scope.querySelectorAll('[data-validation="error"]');
    if (marked.length !== 1) throw new Error(`the composite error must surface ONCE; got ${marked.length} [data-validation=error]`);
    if (!marked[0].contains(dateField(scope)) || !marked[0].contains(timeField(scope)))
      throw new Error("the single validation marker must be the composite group root (wrapping both sub-fields)");
    if (dateField(scope)!.getAttribute("aria-invalid") === "true" || timeField(scope)!.getAttribute("aria-invalid") === "true")
      throw new Error("the sub-inputs must not carry aria-invalid (the composite owns the standing signal)");
  },
};

/** disabledReason SOFT-disables BOTH sub-fields (aria-disabled + readOnly, never native disabled; the calendar
 *  and the increment inert; the reason wired via aria-describedby on each). */
export const DisabledReasonSoftDisablesBoth: Story = {
  render: () => (
    <Box p="4" data-testid="dt-soft" style={{ maxWidth: 420 }}>
      <DateTimeInput
        label="Appointment"
        disabled
        disabledReason="Pick a project first."
        defaultValue={dt("2026-07-04T10:00")}
        onValueChange={record("dtSoft")}
      />
    </Box>
  ),
  play: async ({ canvasElement }) => {
    const scope = canvasElement.querySelector<HTMLElement>('[data-testid="dt-soft"]')!;
    const di = dateField(scope)!;
    const ti = timeField(scope)!;
    (window as unknown as Record<string, unknown[]>)["dtSoft"] = [];

    for (const [name, el] of [["date", di], ["time", ti]] as const) {
      if (el.getAttribute("aria-disabled") !== "true") throw new Error(`${name}: soft-disable must set aria-disabled`);
      if (!el.hasAttribute("readonly")) throw new Error(`${name}: soft-disable must set readOnly`);
      if (el.hasAttribute("disabled")) throw new Error(`${name}: soft-disable must NOT natively disable (drops from the a11y tree)`);
      if (el.getAttribute("aria-invalid") === "true") throw new Error(`${name}: a reason is guidance, not an error — never aria-invalid`);
      const describedby = el.getAttribute("aria-describedby");
      if (!describedby) throw new Error(`${name}: soft-disable must wire aria-describedby to the reason`);
      const reasonNode = scope.querySelector(`#${CSS.escape(describedby.split(" ").at(-1)!)}`);
      if (!/pick a project first/i.test(reasonNode?.textContent ?? ""))
        throw new Error(`${name}: aria-describedby must resolve to the reason text`);
    }

    // Both affordances are inert while soft: the calendar does not open, the increment does not fire.
    di.focus();
    press(di, "ArrowDown", { altKey: true });
    ti.focus();
    press(ti, "ArrowUp");
    await sleep(80);
    if (di.getAttribute("aria-controls")) throw new Error("a soft-disabled date field must not open the calendar");
    if (calls("dtSoft").length !== 0) throw new Error("a soft-disabled composite must not fire onValueChange");
  },
};
