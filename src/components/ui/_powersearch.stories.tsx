import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";
import { Box, Flex, Text } from "@radix-ui/themes";
import { PowerSearchValueEditor } from "../../powersearch/PowerSearchValueEditor";
import { createInternalConfig } from "../../powersearch/useInternalConfig";
import { createPowerSearchConfig } from "../../powersearch/usePowerSearchConfig";
import { PowerSearch } from "./PowerSearch";
import type { OperatorValue, FilterValue, PowerSearchFilter, PowerSearchChangeType } from "../../powersearch/types";

/* _internal — the PowerSearch BEHAVIORAL suite (B5). Underscore-prefixed → the `_internal` group, exempt
   from the story-order + registry node-guards. Storybook runs a story's `play` on VIEW (which flashes
   editors / the edit popover), so every behavioral play lives HERE and the docs stories (System/PowerSearch)
   stay static + calm. Step-2 half: the PowerSearchValueEditor matrix — every operator value type renders
   the right OUR input and commits the right FilterValue shape (auto-commit for enum / date_relative, the
   unixSeconds ⇄ ISO round-trip for date_absolute). Step-3 half (add / edit / remove, 2-level Escape,
   state-reset) is appended below. */

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
const optionByText = (root: ParentNode, text: string) =>
  Array.from(root.querySelectorAll<HTMLElement>('[role="option"]')).find((o) =>
    (o.textContent ?? "").includes(text),
  );

/* ---- commit recorder ----------------------------------------------------- */
interface Commit {
  value: FilterValue;
  shouldSave?: boolean;
}
declare global {
  interface Window {
    __ps?: Record<string, Commit[]>;
  }
}
const commits = (key: string): Commit[] => (window.__ps ??= {})[key] ?? [];
const resetCommits = (key: string) => ((window.__ps ??= {})[key] = []);
const lastCommit = (key: string): Commit | undefined => commits(key).at(-1);

// PowerSearchValueEditor takes a config for API parity but the editors don't read it — a stub is fine.
const STUB_CONFIG = createInternalConfig({ name: "stub", fields: [] });

function EditorHarness({
  testid,
  operatorValue,
  recordKey,
  initial,
}: {
  testid: string;
  operatorValue: OperatorValue;
  recordKey: string;
  initial?: FilterValue;
}) {
  const [fv, setFv] = useState<FilterValue | undefined>(initial);
  return (
    <Box data-outer={testid} style={{ maxWidth: 360, padding: 16 }}>
      <PowerSearchValueEditor
        operatorValue={operatorValue}
        filterValue={fv}
        config={STUB_CONFIG}
        size="2"
        onChange={(value, shouldSave) => {
          setFv(value);
          (window.__ps ??= {})[recordKey] = [...commits(recordKey), { value, shouldSave }];
        }}
      />
    </Box>
  );
}

/* ---- fixtures ------------------------------------------------------------ */
const STATUS_VALUES = [
  { value: "open", label: "Open" },
  { value: "closed", label: "Closed" },
  { value: "blocked", label: "Blocked" },
];

const meta: Meta = {
  title: "_internal/PowerSearch behavior",
  parameters: { controls: { disable: true } },
};
export default meta;
type Story = StoryObj;

/* ============================================================================
   Step 2 — the value-editor matrix + commit-shape assertions.
   ============================================================================ */

/** Every operator value type renders the correct OUR input at rest (no dropdowns opened → calm on view).
 *  The empty Select/MultiSelect triggers show their muted placeholder text (--gray-a; a sub-component
 *  behavior with its own contrast coverage in the Select/MultiSelect suites), so color-contrast is scoped
 *  off for THIS smoke fixture — the same documented carve-out as `_field` / `_alert-dialog`. The
 *  interaction plays below keep axe fully ON and drive populated states. */
export const EditorMatrix: Story = {
  // No axe carve-out: the placeholder contrast this story used to exclude is FIXED (2026-08-04). The
  // three empty triggers measured #80838d on #ffffff = 3.78 light and #757981 on #0d0d0e = 4.44 dark
  // under Radix's [data-placeholder] skin (--gray-a10) — a real failure in both appearances, not an
  // exempt one (SC 1.4.3 exempts inactive controls; these are enabled). The family rule in
  // `components.css` now paints them --ds-text-weak: 5.94 light, 9.34 dark. axe stays ON over them.
  render: () => (
    <Flex direction="column" gap="4" style={{ padding: 16, maxWidth: 420 }}>
      <Labelled label="string" testid="m-string">
        <PowerSearchValueEditor operatorValue={{ type: "string" }} filterValue={undefined} config={STUB_CONFIG} onChange={() => {}} size="2" />
      </Labelled>
      <Labelled label="integer" testid="m-integer">
        <PowerSearchValueEditor operatorValue={{ type: "integer" }} filterValue={undefined} config={STUB_CONFIG} onChange={() => {}} size="2" />
      </Labelled>
      <Labelled label="float" testid="m-float">
        <PowerSearchValueEditor operatorValue={{ type: "float" }} filterValue={undefined} config={STUB_CONFIG} onChange={() => {}} size="2" />
      </Labelled>
      <Labelled label="time" testid="m-time">
        <PowerSearchValueEditor operatorValue={{ type: "time" }} filterValue={undefined} config={STUB_CONFIG} onChange={() => {}} size="2" />
      </Labelled>
      <Labelled label="date_absolute" testid="m-date">
        <PowerSearchValueEditor operatorValue={{ type: "date_absolute" }} filterValue={undefined} config={STUB_CONFIG} onChange={() => {}} size="2" />
      </Labelled>
      <Labelled label="date_range" testid="m-range">
        <PowerSearchValueEditor operatorValue={{ type: "date_range" }} filterValue={undefined} config={STUB_CONFIG} onChange={() => {}} size="2" />
      </Labelled>
      <Labelled label="date_relative" testid="m-rel">
        <PowerSearchValueEditor operatorValue={{ type: "date_relative" }} filterValue={undefined} config={STUB_CONFIG} onChange={() => {}} size="2" />
      </Labelled>
      <Labelled label="enum" testid="m-enum">
        <PowerSearchValueEditor operatorValue={{ type: "enum", values: STATUS_VALUES }} filterValue={undefined} config={STUB_CONFIG} onChange={() => {}} size="2" />
      </Labelled>
      <Labelled label="enum_list" testid="m-enumlist">
        <PowerSearchValueEditor operatorValue={{ type: "enum_list", values: STATUS_VALUES }} filterValue={undefined} config={STUB_CONFIG} onChange={() => {}} size="2" />
      </Labelled>
      <Labelled label="string_list" testid="m-strlist">
        <PowerSearchValueEditor operatorValue={{ type: "string_list" }} filterValue={undefined} config={STUB_CONFIG} onChange={() => {}} size="2" />
      </Labelled>
      <Labelled label="entity_list" testid="m-entity">
        <PowerSearchValueEditor operatorValue={{ type: "entity_list" }} filterValue={undefined} config={STUB_CONFIG} onChange={() => {}} size="2" />
      </Labelled>
    </Flex>
  ),
  play: async ({ canvasElement }) => {
    const at = (id: string) => canvasElement.querySelector<HTMLElement>(`[data-outer="${id}"]`)!;
    // string → a plain textbox; integer/float → a number spinbutton; string_list/entity_list → a combobox.
    if (!at("m-string").querySelector('input[type="text"], input:not([type])'))
      throw new Error("string must render a text input");
    if (!at("m-integer").querySelector('input[inputmode="numeric"], input[type="number"], input[role="spinbutton"], input')?.matches("input"))
      throw new Error("integer must render a number input");
    if (!at("m-strlist").querySelector('input[role="combobox"]')) throw new Error("string_list must render a tokenizer combobox");
    if (!at("m-entity").querySelector('input[role="combobox"]')) throw new Error("entity_list must render a tokenizer combobox");
    // enum / enum_list → a button popup trigger; date/time → an input.
    if (!at("m-enum").querySelector("button")) throw new Error("enum must render a Select trigger");
    if (!at("m-enumlist").querySelector('button[aria-haspopup="listbox"]')) throw new Error("enum_list must render a MultiSelect trigger");
    if (!at("m-rel").querySelector("button")) throw new Error("date_relative must render a Select trigger");
    if (!at("m-date").querySelector("input")) throw new Error("date_absolute must render a date input");
    if (!at("m-time").querySelector("input")) throw new Error("time must render a time input");
    if (!at("m-range").querySelector("button")) throw new Error("date_range must render a range trigger");
  },
};

/** string (plain) → commits {type:'string', value} on each keystroke. */
export const StringCommit: Story = {
  render: () => <EditorHarness testid="ps-str" operatorValue={{ type: "string" }} recordKey="str" />,
  play: async ({ canvasElement }) => {
    resetCommits("str");
    const scope = canvasElement.querySelector<HTMLElement>('[data-outer="ps-str"]')!;
    const input = scope.querySelector<HTMLInputElement>("input")!;
    input.focus();
    typeInto(input, "hello");
    await waitFor(() => commits("str").length > 0);
    const c = lastCommit("str")!;
    if (c.value.type !== "string" || c.value.value !== "hello")
      throw new Error(`string must commit {string,'hello'}; got ${JSON.stringify(c.value)}`);
  },
};

/** integer → NumberInput commits {type:'integer', value:number} (parse-on-type / blur). */
export const IntegerCommit: Story = {
  render: () => <EditorHarness testid="ps-int" operatorValue={{ type: "integer" }} recordKey="int" />,
  play: async ({ canvasElement }) => {
    resetCommits("int");
    const scope = canvasElement.querySelector<HTMLElement>('[data-outer="ps-int"]')!;
    const input = scope.querySelector<HTMLInputElement>("input")!;
    input.focus();
    typeInto(input, "42");
    input.blur();
    await waitFor(() => commits("int").length > 0);
    const c = lastCommit("int")!;
    if (c.value.type !== "integer" || c.value.value !== 42)
      throw new Error(`integer must commit {integer,42}; got ${JSON.stringify(c.value)}`);
  },
};

/** date_absolute → the unixSeconds ⇄ ISO round-trip: typing "2026-01-25" commits a unix that formats back
 *  to the same ISO date. */
export const DateAbsoluteRoundTrip: Story = {
  render: () => <EditorHarness testid="ps-date" operatorValue={{ type: "date_absolute" }} recordKey="date" />,
  play: async ({ canvasElement }) => {
    resetCommits("date");
    const scope = canvasElement.querySelector<HTMLElement>('[data-outer="ps-date"]')!;
    const input = scope.querySelector<HTMLInputElement>('input[role="combobox"]')!;
    input.focus();
    typeInto(input, "2026-01-25");
    await waitFor(() => commits("date").length > 0);
    const c = lastCommit("date")!;
    if (c.value.type !== "date_absolute") throw new Error(`must commit date_absolute; got ${JSON.stringify(c.value)}`);
    // Reconstruct via LOCAL calendar fields (the editor anchors to local midnight, matching the formatter).
    const d = new Date(c.value.unixSeconds * 1000);
    const p = (n: number) => String(n).padStart(2, "0");
    const roundTrip = `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
    if (roundTrip !== "2026-01-25")
      throw new Error(`unixSeconds must round-trip to the typed ISO; got ${roundTrip} (unix ${c.value.unixSeconds})`);
  },
};

/** enum → our Select AUTO-COMMITS on select: {type:'enum', value} with shouldSave === true. */
export const EnumAutoCommit: Story = {
  render: () => (
    <EditorHarness testid="ps-enum" operatorValue={{ type: "enum", values: STATUS_VALUES }} recordKey="enum" />
  ),
  play: async ({ canvasElement }) => {
    resetCommits("enum");
    const scope = canvasElement.querySelector<HTMLElement>('[data-outer="ps-enum"]')!;
    const trigger = scope.querySelector<HTMLButtonElement>("button")!;
    trigger.focus();
    press(trigger, "Enter"); // Radix Select opens on Enter
    const listbox = await waitFor(() => document.querySelector<HTMLElement>('[role="listbox"]'));
    const opt = await waitFor(() => optionByText(listbox, "Closed"));
    opt.click();
    await waitFor(() => commits("enum").length > 0);
    const c = lastCommit("enum")!;
    if (c.value.type !== "enum" || c.value.value !== "closed")
      throw new Error(`enum must commit {enum,'closed'}; got ${JSON.stringify(c.value)}`);
    if (c.shouldSave !== true) throw new Error("enum select must AUTO-COMMIT (shouldSave === true)");
  },
};

/** date_relative → our Select AUTO-COMMITS: {type:'date_relative', value:code} with shouldSave === true. */
export const DateRelativeAutoCommit: Story = {
  render: () => <EditorHarness testid="ps-rel" operatorValue={{ type: "date_relative" }} recordKey="rel" />,
  play: async ({ canvasElement }) => {
    resetCommits("rel");
    const scope = canvasElement.querySelector<HTMLElement>('[data-outer="ps-rel"]')!;
    const trigger = scope.querySelector<HTMLButtonElement>("button")!;
    trigger.focus();
    press(trigger, "Enter");
    const listbox = await waitFor(() => document.querySelector<HTMLElement>('[role="listbox"]'));
    const opt = await waitFor(() => optionByText(listbox, "7 days ago"));
    opt.click();
    await waitFor(() => commits("rel").length > 0);
    const c = lastCommit("rel")!;
    if (c.value.type !== "date_relative" || c.value.value !== "7d_ago")
      throw new Error(`date_relative must commit the machine code '7d_ago'; got ${JSON.stringify(c.value)}`);
    if (c.shouldSave !== true) throw new Error("date_relative select must AUTO-COMMIT (shouldSave === true)");
  },
};

/** enum_list → our MultiSelect commits {type:'enum_list', value:string[]} as options toggle (live-apply). */
export const EnumListToggle: Story = {
  render: () => (
    <EditorHarness testid="ps-el" operatorValue={{ type: "enum_list", values: STATUS_VALUES }} recordKey="el" />
  ),
  play: async ({ canvasElement }) => {
    resetCommits("el");
    const scope = canvasElement.querySelector<HTMLElement>('[data-outer="ps-el"]')!;
    const trigger = scope.querySelector<HTMLButtonElement>('button[aria-haspopup="listbox"]')!;
    // MultiSelect rides a Radix Popover trigger — it opens on a real click, not a synthetic Enter keydown.
    trigger.click();
    const listbox = await waitFor(() => document.querySelector<HTMLElement>('[role="listbox"]'));
    (await waitFor(() => optionByText(listbox, "Open"))).click();
    await waitFor(() => (lastCommit("el")?.value as { value?: string[] })?.value?.length === 1);
    (await waitFor(() => optionByText(listbox, "Blocked"))).click();
    await waitFor(() => (lastCommit("el")?.value as { value?: string[] })?.value?.length === 2);
    const c = lastCommit("el")!;
    if (c.value.type !== "enum_list") throw new Error(`must commit enum_list; got ${JSON.stringify(c.value)}`);
    if (!c.value.value.includes("open") || !c.value.value.includes("blocked"))
      throw new Error(`enum_list must carry both toggled values; got ${JSON.stringify(c.value.value)}`);
  },
};

/** string_list (creatable, no source) → picking the synthesized Create row commits {string_list,[tag]}. */
export const StringListCreate: Story = {
  render: () => <EditorHarness testid="ps-sl" operatorValue={{ type: "string_list" }} recordKey="sl" />,
  play: async ({ canvasElement }) => {
    resetCommits("sl");
    const scope = canvasElement.querySelector<HTMLElement>('[data-outer="ps-sl"]')!;
    const input = scope.querySelector<HTMLInputElement>('input[role="combobox"]')!;
    input.focus();
    typeInto(input, "urgent");
    const create = await waitFor(() => {
      const id = input.getAttribute("aria-controls");
      const panel = id ? document.getElementById(id) : null;
      return panel ? optionByText(panel, 'Create "urgent"') : null;
    });
    create.click();
    await waitFor(() => commits("sl").length > 0);
    const c = lastCommit("sl")!;
    if (c.value.type !== "string_list" || !c.value.value.includes("urgent"))
      throw new Error(`string_list must commit the created tag; got ${JSON.stringify(c.value)}`);
  },
};

/* ---- tiny presentational label used by EditorMatrix ---------------------- */
function Labelled({ label, testid, children }: { label: string; testid: string; children: React.ReactNode }) {
  return (
    <Box data-outer={testid}>
      <Text size="1" style={{ color: "var(--ds-text-strong)", display: "block", marginBottom: 4 }}>
        {label}
      </Text>
      {children}
    </Box>
  );
}

/* ============================================================================
   Step 3 — the full-component flow: add / edit / remove, the 2-level Escape, and the edit-popover
   state-reset cases (switch tokens, delete-then-edit-shifted-index) from PowerSearchEditPopover.test.tsx.
   ============================================================================ */

/* A real config: string / enum / boolean fields. */
const DEMO = createPowerSearchConfig([
  { key: "title", type: "string", label: "Title" },
  {
    key: "status",
    type: "enum",
    label: "Status",
    enumValues: [
      { value: "open", label: "Open" },
      { value: "closed", label: "Closed" },
      { value: "blocked", label: "Blocked" },
    ],
  },
  {
    key: "priority",
    type: "enum",
    label: "Priority",
    enumValues: [
      { value: "low", label: "Low" },
      { value: "high", label: "High" },
    ],
  },
  { key: "active", type: "boolean", label: "Active" },
] as const);

interface ChangeRec {
  type: PowerSearchChangeType;
  index: number;
  count: number;
}
declare global {
  interface Window {
    __psc?: Record<string, ChangeRec[]>;
  }
}
const psChanges = (k: string): ChangeRec[] => (window.__psc ??= {})[k] ?? [];
const resetChanges = (k: string) => ((window.__psc ??= {})[k] = []);
const lastChange = (k: string) => psChanges(k).at(-1);

function PSHarness({
  testid,
  initial = [],
  recordKey,
}: {
  testid: string;
  initial?: PowerSearchFilter[];
  recordKey: string;
}) {
  const [filters, setFilters] = useState<PowerSearchFilter[]>(initial);
  return (
    // A COLOURED backdrop so the edit-popover panel opacity is verified over app content, not white.
    <Box data-outer={testid} style={{ padding: 24, maxWidth: 680, background: "var(--accent-3)" }}>
      <PowerSearch
        config={DEMO.config}
        filters={filters}
        aria-label="Search issues"
        size="2"
        onChange={(next, type, index) => {
          setFilters([...next]);
          (window.__psc ??= {})[recordKey] = [...psChanges(recordKey), { type, index, count: next.length }];
        }}
      />
    </Box>
  );
}

const psInput = (scope: HTMLElement) => scope.querySelector<HTMLInputElement>('input[role="combobox"]')!;
const panelOf = (input: HTMLInputElement) => {
  const id = input.getAttribute("aria-controls");
  return id ? document.getElementById(id) : null;
};
const optionByExactText = (root: ParentNode, text: string) =>
  Array.from(root.querySelectorAll<HTMLElement>('[role="option"]')).find((o) => (o.textContent ?? "").trim() === text);
const chipBodyByText = (scope: HTMLElement, text: string) =>
  Array.from(scope.querySelectorAll<HTMLElement>(".rt-ds-token-body")).find((b) => (b.textContent ?? "").includes(text));
const editorEl = () => document.querySelector<HTMLElement>(".rt-ds-powersearch-editor");
const escape = () => document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
const btnByText = (root: ParentNode, text: string) =>
  Array.from(root.querySelectorAll<HTMLButtonElement>("button")).find((b) => (b.textContent ?? "").trim() === text);

/** Add: pick a string field → the editor opens → type a value → Apply commits a chip (onChange 'add'). */
export const AddFlow: Story = {
  render: () => <PSHarness testid="ps-add" recordKey="add" />,
  play: async ({ canvasElement }) => {
    resetChanges("add");
    const scope = canvasElement.querySelector<HTMLElement>('[data-outer="ps-add"]')!;
    const input = psInput(scope);
    input.focus();
    typeInto(input, "title");
    const panel = await waitFor(() => panelOf(input));
    const fieldRow = await waitFor(() => optionByExactText(panel, "Title"));
    fieldRow.click();
    // The editor opens; its rAF focuses the value input (non-dialog focus placement).
    const editor = await waitFor(() => editorEl());
    const valueInput = await waitFor(() => editor.querySelector<HTMLInputElement>(".rt-ds-powersearch-editor-value input"));
    typeInto(valueInput, "urgent bug");
    (await waitFor(() => btnByText(editor, "Apply"))).click();
    await waitFor(() => lastChange("add")?.type === "add");
    if (lastChange("add")!.count !== 1) throw new Error("add must yield exactly one filter");
    // The chip renders field:operator + the bold value.
    await waitFor(() => chipBodyByText(scope, "urgent bug"));
    if (!chipBodyByText(scope, "Title: contains")) throw new Error("chip must read the field:operator label");
    if (editorEl()) throw new Error("Apply must close the editor");
  },
};

/** Edit: click a chip → the editor reopens with the value → change + Apply → onChange 'edit'. */
export const EditFlow: Story = {
  render: () => (
    <PSHarness
      testid="ps-edit"
      recordKey="edit"
      initial={[{ field: "title", operator: "contains", value: { type: "string", value: "hello" } }]}
    />
  ),
  play: async ({ canvasElement }) => {
    resetChanges("edit");
    const scope = canvasElement.querySelector<HTMLElement>('[data-outer="ps-edit"]')!;
    const chip = await waitFor(() => chipBodyByText(scope, "hello"));
    chip.click();
    const editor = await waitFor(() => editorEl());
    const valueInput = await waitFor(() => editor.querySelector<HTMLInputElement>(".rt-ds-powersearch-editor-value input"));
    if (valueInput.value !== "hello") throw new Error(`edit must preload the value; got "${valueInput.value}"`);
    typeInto(valueInput, "world");
    (await waitFor(() => btnByText(editor, "Apply"))).click();
    await waitFor(() => lastChange("edit")?.type === "edit");
    if (lastChange("edit")!.count !== 1) throw new Error("edit must keep one filter");
    await waitFor(() => chipBodyByText(scope, "world"));
    if (chipBodyByText(scope, "hello")) throw new Error("the old value must be replaced");
  },
};

/** Remove: the chip's ✕ removes the filter (onChange 'remove'). */
export const RemoveFlow: Story = {
  render: () => (
    <PSHarness
      testid="ps-remove"
      recordKey="remove"
      initial={[{ field: "title", operator: "contains", value: { type: "string", value: "hello" } }]}
    />
  ),
  play: async ({ canvasElement }) => {
    resetChanges("remove");
    const scope = canvasElement.querySelector<HTMLElement>('[data-outer="ps-remove"]')!;
    const removeBtn = await waitFor(() =>
      scope.querySelector<HTMLButtonElement>('[data-tk-chip] button[aria-label^="Remove"]'),
    );
    removeBtn.click();
    await waitFor(() => lastChange("remove")?.type === "remove");
    if (lastChange("remove")!.count !== 0) throw new Error("remove must clear the last filter");
    if (chipBodyByText(scope, "hello")) throw new Error("the chip must be gone after remove");
  },
};

/** 2-level Escape: open the editor for an enum filter, open the value Select (inner layer); Escape #1
 *  closes ONLY the Select, Escape #2 cancels the editor. Radix's DismissableLayer stack — no escapeStack. */
export const TwoLevelEscape: Story = {
  render: () => (
    <PSHarness
      testid="ps-esc"
      recordKey="esc"
      initial={[{ field: "status", operator: "is", value: { type: "enum", value: "open" } }]}
    />
  ),
  play: async ({ canvasElement }) => {
    resetChanges("esc");
    const scope = canvasElement.querySelector<HTMLElement>('[data-outer="ps-esc"]')!;
    (await waitFor(() => chipBodyByText(scope, "Status: is"))).click();
    const editor = await waitFor(() => editorEl());
    // Open the VALUE enum Select (the inner DismissableLayer).
    const valueTrigger = await waitFor(() =>
      editor.querySelector<HTMLButtonElement>('.rt-ds-powersearch-editor-value button[aria-label="Value"]'),
    );
    valueTrigger.focus();
    press(valueTrigger, "Enter");
    await waitFor(() => document.querySelector('[role="listbox"]'));

    // Escape #1 — closes ONLY the Select; the editor survives.
    escape();
    await waitFor(() => !document.querySelector('[role="listbox"]'));
    if (!editorEl()) throw new Error("STACK COLLAPSE: Escape #1 closed the editor too (the nested Select must be the inner layer)");
    await sleep(40);
    if (!editorEl()) throw new Error("the edit popover must survive the first Escape");

    // Escape #2 — now the editor is the top layer → cancels.
    escape();
    await waitFor(() => !editorEl());
  },
};

/** State-reset (switch tokens): clicking Status then Priority must show the CURRENT filter, never stale
 *  state (PowerSearchEditPopover.test.tsx). */
export const StateResetSwitchTokens: Story = {
  render: () => (
    <PSHarness
      testid="ps-switch"
      recordKey="switch"
      initial={[
        { field: "status", operator: "is", value: { type: "enum", value: "open" } },
        { field: "priority", operator: "is", value: { type: "enum", value: "low" } },
      ]}
    />
  ),
  play: async ({ canvasElement }) => {
    const scope = canvasElement.querySelector<HTMLElement>('[data-outer="ps-switch"]')!;
    // Open Status → the Field select reads "Status".
    (await waitFor(() => chipBodyByText(scope, "Status: is"))).click();
    let editor = await waitFor(() => editorEl());
    let fieldTrigger = await waitFor(() =>
      editor.querySelector<HTMLElement>('.rt-ds-powersearch-editor-field button'),
    );
    if (!/Status/.test(fieldTrigger.textContent ?? "")) throw new Error(`editor must show Status; got "${fieldTrigger.textContent}"`);
    // Cancel, then open Priority → the Field select must read "Priority", not stale "Status".
    (await waitFor(() => btnByText(editor, "Cancel"))).click();
    await waitFor(() => !editorEl());
    (await waitFor(() => chipBodyByText(scope, "Priority: is"))).click();
    editor = await waitFor(() => editorEl());
    fieldTrigger = await waitFor(() => editor.querySelector<HTMLElement>('.rt-ds-powersearch-editor-field button'));
    if (!/Priority/.test(fieldTrigger.textContent ?? ""))
      throw new Error(`after switching, the editor must show Priority (not stale Status); got "${fieldTrigger.textContent}"`);
    escape();
    await waitFor(() => !editorEl());
  },
};

/** State-reset (delete then edit the shifted index): deleting filter 0 shifts filter 1 → index 0; editing
 *  it must show the correct (shifted) filter, not a stale one at the reused index. */
export const StateResetDeleteThenEdit: Story = {
  render: () => (
    <PSHarness
      testid="ps-shift"
      recordKey="shift"
      initial={[
        { field: "status", operator: "is", value: { type: "enum", value: "open" } },
        { field: "priority", operator: "is", value: { type: "enum", value: "low" } },
      ]}
    />
  ),
  play: async ({ canvasElement }) => {
    const scope = canvasElement.querySelector<HTMLElement>('[data-outer="ps-shift"]')!;
    // Open Status (index 0), Delete it from the editor footer.
    (await waitFor(() => chipBodyByText(scope, "Status: is"))).click();
    const editor = await waitFor(() => editorEl());
    (await waitFor(() => btnByText(editor, "Delete"))).click();
    await waitFor(() => !editorEl());
    await waitFor(() => !chipBodyByText(scope, "Status: is"));
    // Priority is now at index 0 — editing it must show Priority, not a stale Status.
    (await waitFor(() => chipBodyByText(scope, "Priority: is"))).click();
    const editor2 = await waitFor(() => editorEl());
    const fieldTrigger = await waitFor(() => editor2.querySelector<HTMLElement>('.rt-ds-powersearch-editor-field button'));
    if (!/Priority/.test(fieldTrigger.textContent ?? ""))
      throw new Error(`editing the shifted filter must show Priority; got "${fieldTrigger.textContent}"`);
    escape();
    await waitFor(() => !editorEl());
  },
};
