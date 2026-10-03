import type { Meta, StoryObj } from "@storybook/react-vite";
import { Box } from "@radix-ui/themes";
import { NumberInput } from "./NumberInput";

/* _internal — the NumberInput BEHAVIORAL test suite. Underscore-prefixed → the `_internal` group, exempt
   from the registry / story-order guards (like `_timeinput.stories.tsx`). Storybook runs a story's `play`
   on VIEW; keeping every behavioral play HERE lets the docs stories (System/NumberInput) stay static and
   calm on view, while 100% of the coverage still runs in the test runner. Each story renders its OWN live
   specimen and drives it. Mirrors `_timeinput.stories.tsx`. */

/* ---- play helpers -------------------------------------------------------- */
function typeInto(input: HTMLInputElement, value: string) {
  const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value")!.set!;
  setter.call(input, value);
  input.dispatchEvent(new Event("input", { bubbles: true }));
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
const field = (root: ParentNode = document) => root.querySelector<HTMLInputElement>("input");
const liveAssertive = () => document.querySelector('[data-ds-live-region="assertive"]')?.textContent ?? "";
type Num = number | undefined;
const record = (key: string) => (v: Num) => {
  const w = window as unknown as Record<string, Num[]>;
  (w[key] ??= []).push(v);
};
const calls = (key: string) => (window as unknown as Record<string, Num[]>)[key] ?? [];

const meta: Meta<typeof NumberInput> = {
  title: "_internal/NumberInput behavior",
  component: NumberInput,
  parameters: { controls: { disable: true } },
};
export default meta;
type Story = StoryObj<typeof NumberInput>;

/** Parse-on-type fires onValueChange eagerly with the numeric value; the raw text shows while pending. */
export const ParseOnType: Story = {
  render: () => (
    <Box p="4" data-testid="ni-parse" style={{ maxWidth: 320 }}>
      <NumberInput label="Quantity" onValueChange={record("niParse")} />
    </Box>
  ),
  play: async ({ canvasElement }) => {
    const scope = canvasElement.querySelector<HTMLElement>('[data-testid="ni-parse"]')!;
    const input = field(scope)!;
    (window as unknown as Record<string, unknown[]>)["niParse"] = [];

    input.focus();
    typeInto(input, "5");
    await waitFor(() => calls("niParse").length > 0);
    if (calls("niParse").at(-1) !== 5)
      throw new Error(`parse-on-type must fire the numeric value; got ${String(calls("niParse").at(-1))}`);
    if (input.value !== "5") throw new Error(`pending shows the raw text; got "${input.value}"`);

    // Blur commits; the display stays the committed number (no formatting layer for plain numbers).
    input.blur();
    await sleep(40);
    if (input.value !== "5") throw new Error(`commit-on-blur must keep the value; got "${input.value}"`);
  },
};

/** Reject-not-clamp: typing 99 with max=10 does NOT become 10 — it reverts to the last valid value and
 *  announces assertively (the parity upgrade), never the validation channel; aria-invalid only while pending. */
export const RejectNotClamp: Story = {
  render: () => (
    <Box p="4" data-testid="ni-clamp" style={{ maxWidth: 320 }}>
      <NumberInput label="Quantity" min={1} max={10} defaultValue={5} onValueChange={record("niClamp")} />
    </Box>
  ),
  play: async ({ canvasElement }) => {
    const scope = canvasElement.querySelector<HTMLElement>('[data-testid="ni-clamp"]')!;
    const input = field(scope)!;
    (window as unknown as Record<string, unknown[]>)["niClamp"] = [];

    // Rest shows the committed value; a valid resting field is not aria-invalid + no validation paint.
    if (input.value !== "5") throw new Error(`rest shows the committed defaultValue; got "${input.value}"`);
    if (input.getAttribute("aria-invalid") === "true") throw new Error("a valid resting field must NOT be aria-invalid");
    if (scope.querySelector('[data-validation="error"]'))
      throw new Error("an ephemeral range failure must not paint the validation channel");

    // Type 99 (> max) → aria-invalid WHILE pending, no value fired (rejected, not clamped).
    input.focus();
    typeInto(input, "99");
    await waitFor(() => input.getAttribute("aria-invalid") === "true");
    if (calls("niClamp").length !== 0) throw new Error("an out-of-range value must not fire onValueChange");

    // Blur → REVERTS to 5 (NOT clamped to 10) + assertive announce naming the range and kept value.
    // (String() breaks the earlier `!== "5"` control-flow narrowing so the reject-not-clamp assertion is honest.)
    input.blur();
    await waitFor(() => String(input.value) === "5");
    const reverted = String(input.value);
    if (reverted !== "5")
      throw new Error(`reject-not-clamp: the value must REVERT to 5, never become the bound 10 (got "${reverted}")`);
    if (input.getAttribute("aria-invalid") === "true") throw new Error("aria-invalid must clear on revert");
    const msg = liveAssertive();
    if (!/from 1 to 10/i.test(msg) || !/kept 5/i.test(msg))
      throw new Error(`revert must announce the range + kept value assertively; got "${msg}"`);
    if (calls("niClamp").length !== 0) throw new Error("a reverted out-of-range entry must never fire onValueChange");
    if (scope.querySelector('[data-validation="error"]'))
      throw new Error("after revert the field must stay at neutral rest (no validation paint)");
  },
};

/** Malformed / non-numeric commit reverts + announces "That isn't a number." (no prior value → no "Kept"). */
export const MalformedRevert: Story = {
  render: () => (
    <Box p="4" data-testid="ni-bad" style={{ maxWidth: 320 }}>
      <NumberInput label="Quantity" isIntegerOnly onValueChange={record("niBad")} />
    </Box>
  ),
  play: async ({ canvasElement }) => {
    const scope = canvasElement.querySelector<HTMLElement>('[data-testid="ni-bad"]')!;
    const input = field(scope)!;
    (window as unknown as Record<string, unknown[]>)["niBad"] = [];

    // A decimal under isIntegerOnly is rejected → held pending (aria-invalid), then announces the whole-number ask.
    input.focus();
    typeInto(input, "2.5");
    await waitFor(() => input.getAttribute("aria-invalid") === "true");
    if (calls("niBad").length !== 0) throw new Error("a non-integer under isIntegerOnly must not fire");
    input.blur();
    await sleep(40);
    if (!/whole number/i.test(liveAssertive()))
      throw new Error(`isIntegerOnly revert must announce the whole-number ask; got "${liveAssertive()}"`);
    // No prior value → the announcement carries no "Kept …".
    if (/kept/i.test(liveAssertive())) throw new Error("with no prior value the announcement must omit 'Kept'");
  },
};

/** Empty-commit: clearable fires undefined on empty; non-clearable reverts to the last value (never undefined). */
export const EmptyCommit: Story = {
  render: () => (
    <Box p="4" style={{ display: "flex", flexDirection: "column", gap: 24, maxWidth: 340 }}>
      <Box data-testid="ni-clearable">
        <NumberInput label="Clearable" clearable defaultValue={7} onValueChange={record("niClearable")} />
      </Box>
      <Box data-testid="ni-required">
        <NumberInput label="Non-clearable" defaultValue={7} onValueChange={record("niRequired")} />
      </Box>
    </Box>
  ),
  play: async ({ canvasElement }) => {
    // --- clearable: emptying + blur fires undefined ---
    const clScope = canvasElement.querySelector<HTMLElement>('[data-testid="ni-clearable"]')!;
    const cl = field(clScope)!;
    (window as unknown as Record<string, unknown[]>)["niClearable"] = [];
    cl.focus();
    typeInto(cl, "");
    cl.blur();
    await waitFor(() => calls("niClearable").length > 0);
    if (calls("niClearable").at(-1) !== undefined) throw new Error("clearable empty-commit must fire undefined");

    // --- non-clearable: emptying + blur REVERTS to 7, never fires undefined ---
    const rqScope = canvasElement.querySelector<HTMLElement>('[data-testid="ni-required"]')!;
    const rq = field(rqScope)!;
    (window as unknown as Record<string, unknown[]>)["niRequired"] = [];
    rq.focus();
    typeInto(rq, "");
    rq.blur();
    await waitFor(() => rq.value === "7");
    if (rq.value !== "7") throw new Error(`non-clearable empty must revert to the last value; got "${rq.value}"`);
    if (calls("niRequired").some((v) => v === undefined))
      throw new Error("a non-clearable field must never fire undefined");
  },
};

/** Native spinbutton semantics: type=number + min/max/step attributes back role=spinbutton + aria-value*. */
export const NativeSpinbutton: Story = {
  render: () => (
    <Box p="4" data-testid="ni-spin" style={{ maxWidth: 320 }}>
      <NumberInput label="Quantity" min={1} max={10} step={2} defaultValue={4} onValueChange={record("niSpin")} />
    </Box>
  ),
  play: async ({ canvasElement }) => {
    const scope = canvasElement.querySelector<HTMLElement>('[data-testid="ni-spin"]')!;
    const input = field(scope)!;
    (window as unknown as Record<string, unknown[]>)["niSpin"] = [];

    // The native attributes are present — these back the implicit role=spinbutton + aria-valuemin/max/now.
    if (input.type !== "number") throw new Error(`must be a native type=number field; got "${input.type}"`);
    if (input.getAttribute("min") !== "1") throw new Error(`min attr must be 1; got "${input.getAttribute("min")}"`);
    if (input.getAttribute("max") !== "10") throw new Error(`max attr must be 10; got "${input.getAttribute("max")}"`);
    if (input.getAttribute("step") !== "2") throw new Error(`step attr must be 2; got "${input.getAttribute("step")}"`);
    if (input.getAttribute("inputmode") !== "numeric")
      throw new Error(`an integer step must set inputmode=numeric; got "${input.getAttribute("inputmode")}"`);
    // A native spinner click dispatches an `input` event with the stepped value — the same path typeInto
    // models. Landing on 6 (4 + step 2, in range) must fire the numeric value through the shared change path.
    input.focus();
    typeInto(input, "6");
    await waitFor(() => calls("niSpin").at(-1) === 6);
    if (calls("niSpin").at(-1) !== 6) throw new Error(`a stepped in-range value (6) must fire; got ${String(calls("niSpin").at(-1))}`);
  },
};

/** A fractional step switches the numeric keypad hint to decimal. */
export const DecimalInputMode: Story = {
  render: () => (
    <Box p="4" data-testid="ni-dec" style={{ maxWidth: 320 }}>
      <NumberInput label="Price" min={0} step={0.01} units="USD" onValueChange={record("niDec")} />
    </Box>
  ),
  play: async ({ canvasElement }) => {
    const scope = canvasElement.querySelector<HTMLElement>('[data-testid="ni-dec"]')!;
    const input = field(scope)!;
    if (input.getAttribute("inputmode") !== "decimal")
      throw new Error(`a fractional step must set inputmode=decimal; got "${input.getAttribute("inputmode")}"`);
  },
};

/** units renders a decorative (aria-hidden) suffix AND is folded into aria-describedby via a persistent node. */
export const UnitsInDescribedBy: Story = {
  render: () => (
    <Box p="4" data-testid="ni-units" style={{ maxWidth: 320 }}>
      <NumberInput label="Weight" units="kg" defaultValue={72} onValueChange={record("niUnits")} />
    </Box>
  ),
  play: async ({ canvasElement }) => {
    const scope = canvasElement.querySelector<HTMLElement>('[data-testid="ni-units"]')!;
    const input = field(scope)!;

    // aria-describedby must resolve to a node containing the unit text.
    const describedby = input.getAttribute("aria-describedby");
    if (!describedby) throw new Error("units must wire aria-describedby");
    const ids = describedby.split(" ");
    const unitNode = ids
      .map((id) => scope.querySelector(`#${CSS.escape(id)}`))
      .find((n) => /kg/.test(n?.textContent ?? ""));
    if (!unitNode) throw new Error("aria-describedby must resolve to a node carrying the unit 'kg'");

    // The VISIBLE suffix must be aria-hidden so the unit isn't double-announced.
    const visibleUnit = Array.from(scope.querySelectorAll("*")).find(
      (el) => el.getAttribute("aria-hidden") === "true" && el.textContent === "kg",
    );
    if (!visibleUnit) throw new Error("the visible units suffix must be aria-hidden (no double-announce)");
  },
};

/** disabledReason SOFT-disables (aria-disabled + readOnly, editing inert, reason wired via aria-describedby). */
export const SoftDisabledReason: Story = {
  render: () => (
    <Box p="4" data-testid="ni-soft" style={{ maxWidth: 340 }}>
      <NumberInput label="Soft-disabled" disabled disabledReason="Set a plan first." defaultValue={3} onValueChange={record("niSoft")} />
    </Box>
  ),
  play: async ({ canvasElement }) => {
    const scope = canvasElement.querySelector<HTMLElement>('[data-testid="ni-soft"]')!;
    const input = field(scope)!;
    (window as unknown as Record<string, unknown[]>)["niSoft"] = [];

    if (input.getAttribute("aria-disabled") !== "true") throw new Error("soft-disable must set aria-disabled (not native disabled)");
    if (!input.hasAttribute("readonly")) throw new Error("soft-disable must set readOnly");
    if (input.hasAttribute("disabled")) throw new Error("soft-disable must NOT natively disable (it would drop from the a11y tree)");
    if (input.getAttribute("aria-invalid") === "true") throw new Error("a reason is guidance, not an error — never aria-invalid");
    const describedby = input.getAttribute("aria-describedby");
    if (!describedby) throw new Error("soft-disable must wire aria-describedby to the reason");
    const reasonNode = describedby
      .split(" ")
      .map((id) => scope.querySelector(`#${CSS.escape(id)}`))
      .find((n) => /set a plan first/i.test(n?.textContent ?? ""));
    if (!reasonNode) throw new Error("aria-describedby must resolve to the reason text");

    // Editing is inert: a change event does not fire while soft-disabled (handlers early-return).
    input.focus();
    typeInto(input, "9");
    await sleep(60);
    if (calls("niSoft").length !== 0) throw new Error("a soft-disabled field must not commit edits (handlers early-return)");
  },
};
