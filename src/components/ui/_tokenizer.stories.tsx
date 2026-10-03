import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";
import { Box } from "@radix-ui/themes";
import { Tokenizer } from "./Tokenizer";
import { createStaticSource, type TypeaheadOption } from "./Typeahead";

/* _internal — the Tokenizer BEHAVIORAL suite for the dropdown-only D10 model ([[tokenizer-input]]).
   Underscore-prefixed → the `_internal` group, exempt from the
   story-order + registry node-guards (like `_typeahead.stories.tsx`). Storybook runs a story's `play`
   on VIEW (which flashes the dropdown), so every behavioral play lives HERE, keeping the docs stories
   (System/Tokenizer) static + calm. Each story renders its OWN controlled specimen and drives it. */

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
const panelOf = (input: HTMLInputElement) => {
  const id = input.getAttribute("aria-controls");
  return id ? document.getElementById(id) : null;
};
const optionByText = (panel: HTMLElement, text: string) =>
  Array.from(panel.querySelectorAll<HTMLElement>('[role="option"]')).find((o) => (o.textContent ?? "").includes(text));
const chipEls = (scope: HTMLElement) =>
  Array.from(scope.querySelectorAll<HTMLElement>("[data-tk-chip]")).filter((el) => !el.closest("[inert]"));
const chipText = (scope: HTMLElement) => chipEls(scope).map((c) => c.textContent?.replace(/Remove.*/, "").trim());

/* ---- fixtures ------------------------------------------------------------ */
type Item = TypeaheadOption;
const FRUITS: Item[] = ["Apple", "Apricot", "Avocado", "Banana", "Cherry"].map((label, i) => ({ id: String(i), label }));
const fruitSource = createStaticSource(FRUITS);

// Track the last change payload + value for assertions.
declare global {
  interface Window {
    __tk?: { value: Item[]; change: { item: Item; type: string } | null };
  }
}
// Fresh reads (never a narrowed local) — `window.__tk` is mutated from the Controlled callback, which
// TS can't see, so reading through a call avoids stale control-flow narrowing across awaits.
const lastChange = () => window.__tk?.change ?? null;

function Controlled({
  testid,
  initial = [],
  ...props
}: {
  testid: string;
  initial?: Item[];
  [key: string]: unknown;
}) {
  const [value, setValue] = useState<Item[]>(initial);
  // Refresh the tracked value on every render but PRESERVE the last change (the callback sets it; a
  // re-render must not clobber it back to null).
  window.__tk = { value, change: window.__tk?.change ?? null };
  return (
    <Box data-outer={testid} style={{ maxWidth: 380, padding: 16 }}>
      <Tokenizer
        value={value}
        onValueChange={(items, change) => {
          setValue(items);
          window.__tk = { value: items, change };
        }}
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        {...(props as any)}
      />
    </Box>
  );
}

const meta: Meta<typeof Tokenizer> = {
  title: "_internal/Tokenizer behavior",
  component: Tokenizer,
  parameters: { controls: { disable: true } },
};
export default meta;
type Story = StoryObj<typeof Tokenizer>;

/* ── Dropdown-only creation: pick a real match, pick Create-X, and the non-creatable / creatable
      Enter paths (real match wins; Enter-on-a-new-value commits Create only when it's index 0). ── */
export const DropdownOnlyCreation: Story = {
  render: () => (
    <Controlled testid="create" label="Tags" source={fruitSource} creatable debounceMs={0} placeholder="Search to add…" />
  ),
  play: async ({ canvasElement }) => {
    const scope = canvasElement.querySelector<HTMLElement>('[data-outer="create"]')!;
    const input = combobox(scope)!;

    if (input.getAttribute("role") !== "combobox") throw new Error("the input must be role=combobox");
    if (!/Search to add/i.test(input.getAttribute("placeholder") ?? "")) throw new Error("placeholder must name the mechanism");

    // (a) real match: typing "ap" → Apple/Apricot + a bottom Create "ap"; Enter picks the auto-highlighted
    // REAL match (index 0), NOT Create.
    input.focus();
    typeInto(input, "ap");
    const panel = await waitFor(() => panelOf(input));
    await waitFor(() => optionByText(panel, "Apple"));
    if (!optionByText(panel, 'Create "ap"')) throw new Error("creatable must append a Create row alongside real matches");
    press(input, "Enter");
    await waitFor(() => window.__tk!.value.some((v) => v.label === "Apple"));
    if (lastChange()?.type !== "add") throw new Error(`Enter on real matches must add (not create); got ${lastChange()?.type}`);
    if (chipText(scope)[0] !== "Apple") throw new Error("a chip must commit for the picked match");

    // (b) zero real matches + creatable: Create becomes index 0, so Enter-on-a-new-value commits it.
    typeInto(input, "mango");
    const p2 = await waitFor(() => panelOf(input));
    await waitFor(() => optionByText(p2, 'Create "mango"'));
    press(input, "Enter");
    await waitFor(() => window.__tk!.value.some((v) => v.label === "mango"));
    if (lastChange()?.type !== "create") throw new Error(`Enter on a new value must create; got ${lastChange()?.type}`);
    // The committed token is the RAW value, not the `Create "…"` label.
    if (!window.__tk!.value.some((v) => v.id === "mango" && v.label === "mango")) throw new Error("create must commit the raw value");

    // (c) click-to-create also works.
    typeInto(input, "kiwi");
    const p3 = await waitFor(() => panelOf(input));
    const createRow = await waitFor(() => optionByText(p3, 'Create "kiwi"'));
    createRow.click();
    await waitFor(() => window.__tk!.value.some((v) => v.label === "kiwi"));
  },
};

/* ── Regression (review MEDIUM): the Create row SURVIVES when real matches fill the visible cap.
   The embedded Typeahead slices to EMBEDDED_MAX_ITEMS(=10) and Create is appended LAST; without a
   reserved slot, ≥10 real matches would push Create past the slice and the create affordance would
   vanish silently. `filteredSource` trims real matches to leave the final slot for it. ── */
const MEADOWS: Item[] = Array.from({ length: 12 }, (_, i) => ({ id: `m${i}`, label: `Meadow ${i + 1}` }));
const meadowSource = createStaticSource(MEADOWS);
export const CreateSurvivesSlice: Story = {
  render: () => (
    <Controlled testid="survive" label="Places" source={meadowSource} creatable debounceMs={0} placeholder="Search to add…" />
  ),
  play: async ({ canvasElement }) => {
    const scope = canvasElement.querySelector<HTMLElement>('[data-outer="survive"]')!;
    const input = combobox(scope)!;
    input.focus();
    typeInto(input, "mead"); // matches all 12 "Meadow N" — enough to overflow the 10-row cap
    const panel = await waitFor(() => panelOf(input));
    const rows = await waitFor(() => {
      const opts = panel.querySelectorAll<HTMLElement>('[role="option"]');
      return opts.length > 0 ? opts : null;
    });
    // The list is capped at 10 rows, but the Create row must still be one of them…
    if (!optionByText(panel, 'Create "mead"'))
      throw new Error("Create row was sliced off when ≥10 real matches filled the cap — the create affordance vanished");
    // …and it must occupy the reserved FINAL slot (real matches trimmed to make room).
    if (!(rows[rows.length - 1].textContent ?? "").includes('Create "mead"'))
      throw new Error("Create row must occupy the reserved final visible slot");
  },
};

/* ── NON-creatable + no match: there is NO free-text Enter commit (deferred by design). ── */
export const NoFreeTextCommit: Story = {
  render: () => <Controlled testid="nofree" label="Tags" source={fruitSource} debounceMs={0} />,
  play: async ({ canvasElement }) => {
    const scope = canvasElement.querySelector<HTMLElement>('[data-outer="nofree"]')!;
    const input = combobox(scope)!;
    input.focus();
    typeInto(input, "zzz");
    await sleep(80); // let the (empty) search settle
    if (optionByText(panelOf(input) ?? scope, 'Create "zzz"')) throw new Error("non-creatable must NEVER synthesize a Create row");
    press(input, "Enter");
    await sleep(60);
    if (window.__tk!.value.length !== 0) throw new Error("Enter with no match + no creatable must NOT commit a free-text token");
    // Comma / blur also never commit (deferred) — a comma just types into the field.
    typeInto(input, "zzz,");
    press(input, ",");
    input.blur();
    await sleep(60);
    if (window.__tk!.value.length !== 0) throw new Error("comma / blur must NOT commit a token");
  },
};

/* ── Three-layer dedupe: selected items leave the menu; no Create-X for a selected/matching value. ── */
export const Dedupe: Story = {
  render: () => <Controlled testid="dedupe" label="Tags" source={fruitSource} creatable initial={[FRUITS[0]]} debounceMs={0} />,
  play: async ({ canvasElement }) => {
    const scope = canvasElement.querySelector<HTMLElement>('[data-outer="dedupe"]')!;
    const input = combobox(scope)!;
    input.focus();

    // (1) the already-selected item never appears in the menu.
    typeInto(input, "ap"); // matches Apple (selected) + Apricot
    const panel = await waitFor(() => panelOf(input));
    await waitFor(() => optionByText(panel, "Apricot"));
    if (optionByText(panel, "Apple") && !optionByText(panel, "Apricot")) throw new Error("selected Apple must be filtered from the menu");
    const appleOpt = Array.from(panel.querySelectorAll<HTMLElement>('[role="option"]')).find(
      (o) => (o.textContent ?? "").trim() === "Apple",
    );
    if (appleOpt) throw new Error("selected item must not be listed as its own option");

    // (2) no Create-X when the typed value already matches a SELECTED token (case-insensitive).
    typeInto(input, "apple");
    await sleep(80);
    if (optionByText(panelOf(input) ?? scope, 'Create "apple"')) throw new Error("no Create row for an already-selected value");

    // (2b) no Create-X when the typed value exactly matches a RESULT label.
    typeInto(input, "Apricot");
    const p2 = await waitFor(() => panelOf(input));
    await waitFor(() => optionByText(p2, "Apricot"));
    if (optionByText(p2, 'Create "Apricot"')) throw new Error("no Create row when it matches a result label");
  },
};

/* ── Backspace on the empty input removes the LAST chip + refocuses the input. ── */
export const BackspaceRemovesLast: Story = {
  render: () => <Controlled testid="bksp" label="Tags" source={fruitSource} initial={[FRUITS[0], FRUITS[1]]} debounceMs={0} />,
  play: async ({ canvasElement }) => {
    const scope = canvasElement.querySelector<HTMLElement>('[data-outer="bksp"]')!;
    const input = combobox(scope)!;
    if (chipText(scope).length !== 2) throw new Error("two chips expected at start");
    input.focus();
    press(input, "Backspace");
    await waitFor(() => window.__tk!.value.length === 1);
    if (lastChange()?.type !== "remove" || lastChange()?.item.label !== "Apricot")
      throw new Error("Backspace-on-empty must remove the LAST chip with a remove change");
    if (document.activeElement !== input) throw new Error("Backspace-on-empty must refocus the input");
    // A non-empty input does NOT eat the chip on Backspace (it edits the text).
    typeInto(input, "x");
    press(input, "Backspace");
    await sleep(40);
    if (window.__tk!.value.length !== 1) throw new Error("Backspace with text in the input must not remove a chip");
  },
};

/* ── maxEntries: input collapses-but-stays-focusable, dropdown suppressed, calm description hint. ── */
export const MaxEntries: Story = {
  render: () => <Controlled testid="max" label="Tags" source={fruitSource} maxEntries={2} initial={[FRUITS[0], FRUITS[1]]} debounceMs={0} />,
  play: async ({ canvasElement }) => {
    const scope = canvasElement.querySelector<HTMLElement>('[data-outer="max"]')!;
    const input = combobox(scope)!;

    // Input stays in the DOM + focusable (a sliver), never disabled.
    if (!input) throw new Error("the input must remain in the DOM at the cap");
    if (input.disabled) throw new Error("the capped input must not be natively disabled (focusable sliver)");
    const anchor = input.closest<HTMLElement>(".rt-ds-typeahead-anchor")!;
    if (!anchor.hasAttribute("data-collapsed")) throw new Error("the input must collapse to a sliver at the cap");
    input.focus();
    if (document.activeElement !== input) throw new Error("the capped sliver must remain focusable");

    // Dropdown suppressed — the input is readOnly at the cap, so a real user cannot type (no search
    // fires → no panel opens); the source is also swapped to an empty one.
    if (!input.readOnly) throw new Error("the capped input must be readOnly (typing suppressed → no dropdown)");

    // The calm hint lives in the Field description (guidance, not validation) + is wired to the input.
    const described = input.getAttribute("aria-describedby") ?? "";
    const hint = described.split(/\s+/).map((id) => document.getElementById(id)).find((n) => /Maximum 2 tags/i.test(n?.textContent ?? ""));
    if (!hint) throw new Error('the cap hint "Maximum 2 tags" must be in the Field description + aria-describedby');
    if (scope.querySelector('[role="alert"]')) throw new Error("the cap hint must NOT be an error/alert (it is guidance)");

    // Backspace still works at the cap → drops below, input re-expands.
    press(input, "Backspace");
    await waitFor(() => window.__tk!.value.length === 1);
    await waitFor(() => !combobox(scope)!.closest(".rt-ds-typeahead-anchor")!.hasAttribute("data-collapsed"));
  },
};

/* ── Roving: Tab capture-redirect, Shift+Tab→chips, arrow roving, post-removal focus. ── */
export const Roving: Story = {
  render: () => <Controlled testid="rove" label="Tags" source={fruitSource} initial={[FRUITS[0], FRUITS[1], FRUITS[2]]} debounceMs={0} />,
  play: async ({ canvasElement }) => {
    const scope = canvasElement.querySelector<HTMLElement>('[data-outer="rove"]')!;
    const input = combobox(scope)!;
    const chips = () => chipEls(scope);

    // Chips are OUT of the linear tab order (the ✕ too — swept to tabindex=-1).
    if (chips().some((c) => c.getAttribute("tabindex") !== "-1")) throw new Error("chips must be tabindex=-1 (roving, not linear)");
    const removeButtons = scope.querySelectorAll<HTMLElement>('[data-tk-chip] .rt-IconButton');
    if (Array.from(removeButtons).some((b) => b.getAttribute("tabindex") !== "-1")) throw new Error("the ✕ must not be a tab stop");

    // Tab capture-redirect: focus entering from OUTSIDE lands on the INPUT, not a chip.
    const outside = document.createElement("button");
    document.body.appendChild(outside);
    outside.focus();
    chips()[0].focus(); // simulate focus arriving on a chip from outside
    await waitFor(() => document.activeElement === input);
    outside.remove();

    // Shift+Tab from the input reaches the chips (the last one, adjacent to the input).
    input.focus();
    press(input, "Tab", { shiftKey: true });
    await waitFor(() => document.activeElement === chips()[2]);

    // Arrow Left/Right + Home/End rove chip-to-chip.
    press(chips()[2], "ArrowLeft");
    await waitFor(() => document.activeElement === chips()[1]);
    press(chips()[1], "Home");
    await waitFor(() => document.activeElement === chips()[0]);
    press(chips()[0], "End");
    await waitFor(() => document.activeElement === chips()[2]);

    // Post-removal focus: remove the MIDDLE chip → focus moves to the next chip.
    press(chips()[2], "Home"); // → chip 0 (Apple)
    await waitFor(() => document.activeElement === chips()[0]);
    press(chips()[1] ?? chips()[0], "Home"); // ensure a stable start
    // Focus the middle chip and Delete it.
    chips()[1].focus();
    await waitFor(() => document.activeElement === chips()[1]);
    press(chips()[1], "Delete");
    await waitFor(() => window.__tk!.value.length === 2);
    // The chip that was at index 1 (Avocado) is now the focus target (next → …).
    await waitFor(() => document.activeElement === chipEls(scope)[1] || document.activeElement === chipEls(scope)[chipEls(scope).length - 1]);
    if (lastChange()?.item.label !== "Apricot") throw new Error("Delete on the middle chip must remove THAT chip");
  },
};

/* ── unfocusedInline overflow: collapse to "+N" while blurred, expand to full rows on focus. ── */
export const UnfocusedInlineOverflow: Story = {
  render: () => (
    <Box style={{ width: 220 }}>
      <Controlled
        testid="overflow"
        label="Tags"
        source={fruitSource}
        tokenOverflowBehavior="unfocusedInline"
        initial={[FRUITS[0], FRUITS[1], FRUITS[2], FRUITS[3]]}
        debounceMs={0}
      />
    </Box>
  ),
  play: async ({ canvasElement }) => {
    const scope = canvasElement.querySelector<HTMLElement>('[data-outer="overflow"]')!;
    const input = combobox(scope)!;

    // Blurred → the OverflowList collapse engine is mounted (a "+N" appears when chips don't fit).
    await waitFor(() => scope.querySelector(".rt-ds-overflowlist"));

    // Focus → expand to full wrapping rows: the OverflowList is gone, all chips render directly.
    input.focus();
    await waitFor(() => !scope.querySelector(".rt-ds-overflowlist"));
    for (const label of ["Apple", "Apricot", "Avocado", "Banana"]) {
      if (!chipText(scope).includes(label)) throw new Error(`focused rows must show every chip; missing ${label}`);
    }

    // Blur back out → collapse again.
    const outside = document.createElement("button");
    document.body.appendChild(outside);
    outside.focus();
    await waitFor(() => scope.querySelector(".rt-ds-overflowlist"));
    outside.remove();
  },
};

/* ── htmlName form participation: one hidden input per token id; disabled excluded from FormData. ── */
export const HtmlNameFormParticipation: Story = {
  render: () => (
    <form data-outer="form">
      <Tokenizer label="Users" htmlName="users" source={fruitSource} value={[FRUITS[0], FRUITS[1]]} onValueChange={() => {}} />
      <Tokenizer label="Off" htmlName="off" source={fruitSource} value={[FRUITS[0]]} onValueChange={() => {}} disabled />
    </form>
  ),
  play: async ({ canvasElement }) => {
    const form = canvasElement.querySelector<HTMLFormElement>('form[data-outer="form"]')!;
    const data = new FormData(form);
    const users = data.getAll("users");
    if (users.length !== 2 || users[0] !== "0" || users[1] !== "1")
      throw new Error(`htmlName must submit one entry per token id; got ${JSON.stringify(users)}`);
    if (data.getAll("off").length !== 0) throw new Error("a hard-disabled Tokenizer must be excluded from FormData");
  },
};
