import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState, type ReactNode } from "react";
import { Box } from "@radix-ui/themes";
import { CommandPalette } from "./CommandPalette";
import { createStaticSource, type TypeaheadOption, type TypeaheadSource } from "./Typeahead";
import { assertMenuOptionBox } from "../../foundations/_assert";

/* _internal — the CommandPalette BEHAVIORAL suite. Underscore-prefixed → the `_internal` group, exempt
   from the registry/story-order node-guard. Storybook runs a story's `play` on VIEW, which flashes the
   modal open; keeping every behavioral play HERE lets the docs stories (System/CommandPalette) stay static
   and calm on view. Each story renders its OWN live modal (over a coloured backdrop, so the [[floating-surface-fill]] opacity
   check is honest) and drives the portaled content via `document` (the modal portals to <body>). */

/* ---- play helpers -------------------------------------------------------- */
function typeInto(input: HTMLInputElement, value: string) {
  const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value")!.set!;
  setter.call(input, value);
  input.dispatchEvent(new Event("input", { bubbles: true }));
}
function press(el: Element, key: string) {
  el.dispatchEvent(new KeyboardEvent("keydown", { key, bubbles: true, cancelable: true }));
}
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
async function waitFor<T>(fn: () => T | null | undefined | false, timeout = 2000): Promise<T> {
  const t0 = performance.now();
  for (;;) {
    const r = fn();
    if (r) return r as T;
    if (performance.now() - t0 > timeout) throw new Error("waitFor: timed out");
    await sleep(20);
  }
}
const cmdkInput = () => document.querySelector<HTMLInputElement>("input.rt-ds-cmdk-input");
const cmdkPanel = () => document.querySelector<HTMLElement>(".rt-ds-commandpalette");
const cmdkOptions = () => [...document.querySelectorAll<HTMLElement>(".rt-ds-cmdk-option")];
const cmdkScroll = () => document.querySelector<HTMLElement>(".rt-ds-cmdk-scroll");
const activeIdx = (input: HTMLInputElement) => {
  const a = input.getAttribute("aria-activedescendant");
  return a ? cmdkOptions().findIndex((o) => o.id === a) : -1;
};

/* ---- fixtures ------------------------------------------------------------ */
const GROUPED: TypeaheadOption[] = [
  { id: "a1", label: "New File", auxiliaryData: { group: "Actions" } },
  { id: "a2", label: "New Folder", auxiliaryData: { group: "Actions" } },
  { id: "n1", label: "Go to File", auxiliaryData: { group: "Navigation" } },
  { id: "n2", label: "Go to Line", auxiliaryData: { group: "Navigation" } },
];
const groupedSource = createStaticSource(GROUPED);

let overlapDeferreds: Record<string, (v: TypeaheadOption[]) => void> = {};
const overlapSource: TypeaheadSource = {
  search: (q) => new Promise<TypeaheadOption[]>((res) => { overlapDeferreds[q] = res; }),
  bootstrap: () => [],
};

let stabDeferred: ((v: TypeaheadOption[]) => void) | null = null;
const resetStab = () => { stabDeferred = null; };
const stabSource: TypeaheadSource = {
  search: (q) => (q === "zzzz" ? new Promise<TypeaheadOption[]>((res) => { stabDeferred = res; }) : []),
  bootstrap: () => [],
};

const slowSource: TypeaheadSource = {
  search: async () => { await sleep(300); return GROUPED; },
  bootstrap: async () => { await sleep(300); return GROUPED; },
};

/* A live modal over a coloured backdrop (dense enough that a transparent panel would read wrong). */
function OpenPalette(props: Omit<React.ComponentProps<typeof CommandPalette>, "open" | "onOpenChange"> & { children?: ReactNode }) {
  const [open, setOpen] = useState(true);
  const { children, ...rest } = props;
  return (
    <Box
      style={{
        minHeight: 420,
        padding: 24,
        background: "repeating-linear-gradient(135deg, var(--accent-9) 0 22px, var(--accent-11) 22px 44px)",
      }}
    >
      {children}
      <CommandPalette open={open} onOpenChange={setOpen} {...rest} />
    </Box>
  );
}

const meta: Meta<typeof CommandPalette> = {
  title: "_internal/CommandPalette behavior",
  component: CommandPalette,
  parameters: { controls: { disable: true } },
};
export default meta;
type Story = StoryObj<typeof CommandPalette>;

/** Structure — the ARIA contract over a coloured backdrop: opaque panel ([[floating-surface-fill]]), listbox + role=group
 *  semantics, cross-group continuous arrow flow, launcher = no aria-selected, footer aria-hidden. */
export const Structure: Story = {
  render: () => <OpenPalette source={groupedSource} />,
  play: async ({ globals }) => {
    const input = await waitFor(() => cmdkInput());
    await waitFor(() => cmdkOptions().length === 4); // bootstrap resting set, grouped

    // --- THE OPEN-STATE ROW BOX ([[box-law-scope]]). The rest-state manifest in `_control-box.stories.tsx` cannot
    // reach a row that only exists inside an opened portal, and it says so — naming this suite as
    // where the open geometry is guarded. This is that guard. The palette's search row rides the same
    // ladder, so a drift here is also the seam the reader sees at the hairline.
    assertMenuOptionBox({
      selector: ".rt-ds-cmdk-option",
      uiSize: String(globals.uiSize ?? "small"),
      label: "CommandPalette",
      minRows: 4,
    });

    // --- [[floating-surface-fill]]: the panel surface is OPAQUE (the coloured-backdrop check a white canvas would hide) ---
    const panel = cmdkPanel()!;
    const bg = getComputedStyle(panel).backgroundColor;
    if (!bg || bg === "transparent" || /,\s*0\)\s*$/.test(bg))
      throw new Error(`palette surface must be opaque ([[floating-surface-fill]]); got "${bg}"`);

    // --- listbox + group semantics: headings are role=group/aria-labelledby, NOT options ---
    const listbox = document.querySelector('[role="listbox"]');
    if (!listbox || listbox.getAttribute("aria-label") !== "Commands")
      throw new Error('the results must be a role=listbox named "Commands"');
    const groups = [...document.querySelectorAll('[role="group"]')];
    if (groups.length !== 2) throw new Error(`expected 2 role=group (Actions, Navigation); got ${groups.length}`);
    for (const g of groups) {
      const labelledby = g.getAttribute("aria-labelledby");
      const heading = labelledby ? document.getElementById(labelledby) : null;
      if (!heading?.textContent) throw new Error("each role=group must be aria-labelledby a heading");
      if (heading.getAttribute("role") === "option") throw new Error("a group heading must NOT be an option");
    }
    if (cmdkOptions().length !== 4) throw new Error("headings must not count as options (flat option count = 4)");

    // --- launcher (no value): NO option is aria-selected ---
    if (cmdkOptions().some((o) => o.getAttribute("aria-selected") != null))
      throw new Error("a launcher (no value) must set aria-selected on NO option");

    // --- continuous cross-group arrow flow: index 1 (Actions) → index 2 (Navigation) with no skip ---
    input.focus();
    press(input, "ArrowDown"); // -1 → 0
    await waitFor(() => activeIdx(input) === 0);
    press(input, "ArrowDown"); // → 1 (New Folder, Actions)
    await waitFor(() => activeIdx(input) === 1);
    press(input, "ArrowDown"); // → 2 (Go to File, Navigation) — crosses the boundary
    await waitFor(() => activeIdx(input) === 2);
    const active = document.getElementById(input.getAttribute("aria-activedescendant")!);
    if (active?.textContent !== "Go to File")
      throw new Error(`arrows must flow across group boundaries; landed on "${active?.textContent}"`);
    if (!active.closest('[role="group"]')?.getAttribute("aria-labelledby"))
      throw new Error("the crossed-into row must live inside the next role=group");

    // --- footer is aria-hidden (redundant for AT) ---
    const footer = document.querySelector(".rt-ds-cmdk-footer");
    if (footer?.getAttribute("aria-hidden") !== "true") throw new Error("the footer must be aria-hidden");
  },
};

/** Group-header scroll — crossing into a NEW group scrolls that group's heading into view. */
export const GroupHeaderScroll: Story = {
  render: () => <OpenPalette source={groupedSource} />,
  play: async () => {
    const input = await waitFor(() => cmdkInput());
    await waitFor(() => cmdkOptions().length === 4);

    const scrolled = new Set<Element>();
    const orig = Element.prototype.scrollIntoView;
    Element.prototype.scrollIntoView = function (this: Element, ...args: unknown[]) {
      scrolled.add(this);
      return (orig as ((...a: unknown[]) => void) | undefined)?.apply(this, args);
    };
    try {
      input.focus();
      press(input, "ArrowDown"); // 0 (Actions)
      await waitFor(() => activeIdx(input) === 0);
      press(input, "ArrowDown"); // 1 (Actions)
      await waitFor(() => activeIdx(input) === 1);
      scrolled.clear();
      press(input, "ArrowDown"); // 2 (Navigation) — crosses into a new group
      await waitFor(() => activeIdx(input) === 2);
      await sleep(40);
      const active = document.getElementById(input.getAttribute("aria-activedescendant")!)!;
      const heading = document.getElementById(active.closest('[role="group"]')!.getAttribute("aria-labelledby")!)!;
      if (!scrolled.has(heading))
        throw new Error("crossing into a new group must scroll that group's HEADING into view");
    } finally {
      Element.prototype.scrollIntoView = orig;
    }
  },
};

/** Pointer-vs-keyboard guard — a mouseenter WITHOUT real movement (a keyboard scroll under a stationary
 *  cursor) must NOT steal the active row; a genuine move-then-hover does. */
export const PointerGuard: Story = {
  render: () => <OpenPalette source={groupedSource} />,
  play: async () => {
    const input = await waitFor(() => cmdkInput());
    await waitFor(() => cmdkOptions().length === 4);
    input.focus();
    press(input, "ArrowDown"); // keyboard highlight → 0
    await waitFor(() => activeIdx(input) === 0);

    const opts = cmdkOptions();
    // A mouseover with NO preceding mousemove (React derives onMouseEnter from mouseover) — must be ignored.
    opts[2].dispatchEvent(new MouseEvent("mouseover", { bubbles: true }));
    await sleep(40);
    if (activeIdx(input) !== 0) throw new Error("a hover without pointer movement must NOT steal the active row");

    // Now the pointer genuinely moves, then hovers — the highlight follows.
    cmdkScroll()!.dispatchEvent(new MouseEvent("mousemove", { bubbles: true }));
    opts[2].dispatchEvent(new MouseEvent("mouseover", { bubbles: true }));
    await waitFor(() => activeIdx(input) === 2);
  },
};

/** Stale-resolution guard — an OLDER search resolving AFTER a NEWER one must be dropped. */
export const StaleResolution: Story = {
  render: () => <OpenPalette source={overlapSource} debounceMs={0} />,
  play: async () => {
    overlapDeferreds = {};
    const input = await waitFor(() => cmdkInput());
    input.focus();
    typeInto(input, "old"); // gen N — hangs
    await waitFor(() => overlapDeferreds["old"] !== undefined);
    typeInto(input, "new"); // gen N+1 — hangs
    await waitFor(() => overlapDeferreds["new"] !== undefined);
    overlapDeferreds["new"]([{ id: "n", label: "NEW MATCH" }]); // newer resolves first
    await waitFor(() => cmdkOptions().some((o) => /NEW MATCH/.test(o.textContent ?? "")));
    overlapDeferreds["old"]([{ id: "o", label: "OLD STALE" }]); // older resolves late — must be dropped
    await sleep(80);
    if (cmdkOptions().some((o) => /OLD STALE/.test(o.textContent ?? "")))
      throw new Error("an older search resolving late must NOT clobber the newer results");
    if (!cmdkOptions().some((o) => /NEW MATCH/.test(o.textContent ?? "")))
      throw new Error("the newer results must survive the stale resolve");
  },
};

/** Empty-state stability — while a no-result search is pending, the empty line keeps echoing the
 *  COMMITTED query (it never flips/unmounts mid-search). */
export const EmptyStateStability: Story = {
  render: () => <OpenPalette source={stabSource} debounceMs={0} />,
  play: async () => {
    resetStab();
    const input = await waitFor(() => cmdkInput());
    input.focus();
    typeInto(input, "zzz"); // resolves sync to [] → committed "zzz"
    const empty = await waitFor(() => {
      const e = document.querySelector(".rt-ds-cmdk-empty");
      return e && /zzz/.test(e.textContent ?? "") ? e : null;
    });
    if (!/no commands match/i.test(empty.textContent ?? ""))
      throw new Error(`empty must echo the committed query; got "${empty.textContent}"`);

    typeInto(input, "zzzz"); // a refinement that HANGS (no resolve yet)
    await sleep(60);
    const stillEmpty = document.querySelector(".rt-ds-cmdk-empty");
    if (!stillEmpty || !/zzz/.test(stillEmpty.textContent ?? ""))
      throw new Error("the empty line must stay mounted + echo the committed query while a search is pending");
    if (/zzzz/.test(stillEmpty.textContent ?? ""))
      throw new Error("the empty line must NOT flip to the live query mid-search (committed-query stability)");
    if (stillEmpty.querySelector('[role="option"]')) throw new Error("empty must render no options");

    stabDeferred?.([]); // resolve → now the committed query advances
    await waitFor(() => /zzzz/.test(document.querySelector(".rt-ds-cmdk-empty")?.textContent ?? ""));
  },
};

/** Delayed spinner — a sub-150ms resolve never flashes the spinner; a slow search mounts it after the
 *  grace and drops it on resolve. */
export const DelayedSpinner: Story = {
  render: () => <OpenPalette source={slowSource} />,
  play: async () => {
    await waitFor(() => cmdkInput());
    const spinner = () => document.querySelector(".rt-ds-cmdk-trail .rt-Spinner");
    // Within the 150ms grace: the search is in flight but the visible spinner must NOT have mounted yet.
    await sleep(80);
    if (spinner()) throw new Error("the spinner must NOT mount within the 150ms grace (a fast resolve would not flash)");
    // Past the grace, still loading (the source takes ~300ms): the spinner mounts.
    await waitFor(() => spinner(), 400);
    // On resolve, it drops.
    await waitFor(() => cmdkOptions().length === 4);
    await waitFor(() => !spinner());
  },
};

/** Escape closes — the Dialog's own dismiss (no duplicate handler) drives onOpenChange(false). */
export const EscapeCloses: Story = {
  render: () => <OpenPalette source={groupedSource} />,
  play: async () => {
    const input = await waitFor(() => cmdkInput());
    input.focus();
    await waitFor(() => cmdkOptions().length === 4);
    document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
    await waitFor(() => !cmdkInput());
    if (cmdkPanel()) throw new Error("Escape must close the palette (panel removed)");
  },
};

/* A trigger-owned palette — the shape every real launcher has, and the only shape that can show where
   focus lands on close. The other stories here mount already-open, so none of them can see this. */
function TriggeredPalette() {
  const [open, setOpen] = useState(false);
  return (
    <Box style={{ minHeight: 320, padding: 24 }}>
      <button type="button" data-testid="palette-trigger" onClick={() => setOpen(true)}>
        Open command palette
      </button>
      <CommandPalette open={open} onOpenChange={setOpen} source={groupedSource} />
    </Box>
  );
}

/** Closing returns focus to whatever opened the palette ([[focus-return-on-close]]). Radix restores close-focus to a registered
 *  `Dialog.Trigger`; a palette opens from `open` and registers none, so `useReturnFocus` supplies it. */
export const RestoresFocusOnClose: Story = {
  render: () => <TriggeredPalette />,
  play: async ({ canvasElement }) => {
    const trigger = canvasElement.querySelector('[data-testid="palette-trigger"]') as HTMLButtonElement;
    trigger.focus();
    trigger.click();
    await waitFor(() => cmdkInput());
    await waitFor(() => document.activeElement !== trigger);
    document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
    await waitFor(() => !cmdkInput());
    await waitFor(() => document.activeElement === trigger, 1500).catch(() => {
      const a = document.activeElement as HTMLElement;
      throw new Error(`closing must return focus to the trigger; it went to <${a.tagName.toLowerCase()}>`);
    });
  },
};

/** Picker mode — a set `value` marks the matching option aria-selected with a muted-accent paint; other
 *  options carry aria-selected="false" (an explicit single-select listbox). */
export const PickerMode: Story = {
  render: () => <OpenPalette source={groupedSource} value="a2" onValueChange={() => {}} />,
  play: async () => {
    await waitFor(() => cmdkInput());
    await waitFor(() => cmdkOptions().length === 4);
    const selected = cmdkOptions().find((o) => o.getAttribute("aria-selected") === "true");
    if (!selected || selected.textContent !== "New Folder")
      throw new Error("the option matching `value` must be aria-selected");
    if (cmdkOptions().filter((o) => o.getAttribute("aria-selected") === "true").length !== 1)
      throw new Error("exactly one option may be aria-selected in picker mode");
    if (cmdkOptions().some((o) => o.getAttribute("aria-selected") == null))
      throw new Error("in picker mode every option carries aria-selected (true/false)");
    // The selected row takes a muted-accent fill (distinct from a plain rest row's transparent bg).
    const restBg = getComputedStyle(cmdkOptions().find((o) => o !== selected)!).backgroundColor;
    const selBg = getComputedStyle(selected).backgroundColor;
    if (selBg === restBg) throw new Error("the selected row must paint a distinct muted-accent fill");
  },
};
