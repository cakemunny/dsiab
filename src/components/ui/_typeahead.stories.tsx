import type { Meta, StoryObj } from "@storybook/react-vite";
import { type ReactNode } from "react";
import { Box, Grid, Theme } from "@radix-ui/themes";
import { Typeahead, createStaticSource, type TypeaheadOption, type TypeaheadSource } from "./Typeahead";
import { assertMenuOptionBox, deltaEOK, oklab, themeRoot, withAccent } from "../../foundations/_assert";

/* _internal — the Typeahead BEHAVIORAL test suite. Underscore-prefixed → the `_internal` group,
   exempt from the registry node-guard (exactly like `_focus.stories.tsx`). Storybook runs a story's
   `play` on VIEW, which visibly flashes the panel; keeping every behavioral play HERE lets the docs
   stories (System/Typeahead) stay static and calm on view, while 100% of the coverage still runs in
   the test runner. Each story renders its OWN live specimen(s) and drives them — no dependency on the
   docs stories' DOM. */

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

/* ---- fixtures ------------------------------------------------------------ */
const FRUITS: TypeaheadOption[] = [
  "Apple", "Apricot", "Avocado", "Banana", "Blackberry", "Blueberry", "Cherry",
  "Clementine", "Cranberry", "Date", "Elderberry", "Fig", "Grape", "Grapefruit",
  "Kiwi", "Lemon", "Lime", "Mango", "Melon", "Nectarine", "Orange", "Papaya",
  "Peach", "Pear", "Pineapple", "Plum", "Pomegranate", "Raspberry", "Strawberry", "Watermelon",
].map((label, i) => ({ id: String(i), label }));
const fruitSource = createStaticSource(FRUITS);
const emptySource: TypeaheadSource = { search: () => Promise.resolve([]) };
let errorCalls = 0;
const errorSource: TypeaheadSource = {
  search: async () => { errorCalls++; throw new Error("network boom"); },
};
let raceResolve: ((v: TypeaheadOption[]) => void) | null = null;
const raceSource: TypeaheadSource = {
  search: (q) => {
    const ql = q.toLowerCase();
    if (ql === "app") return new Promise<TypeaheadOption[]>((res) => { raceResolve = res; });
    return FRUITS.filter((f) => f.label.toLowerCase().includes(ql));
  },
};
const overlapDeferreds: Record<string, (v: TypeaheadOption[]) => void> = {};
const overlapSource: TypeaheadSource = {
  search: (q) => new Promise<TypeaheadOption[]>((res) => { overlapDeferreds[q] = res; }),
};

// Faithful static panel specimen (real compound class + tokens) — the [[floating-surface-fill]] opacity read target.
function PanelSpecimen({ testid, children }: { testid?: string; children: ReactNode }) {
  return (
    <Box data-testid={testid} style={{ width: 260 }}>
      <Theme className="rt-ds-typeahead-panel rt-r-size-2" hasBackground={false} style={{ position: "static", display: "block" }}>
        {children}
      </Theme>
    </Box>
  );
}
const specOption = (label: string, opts?: { highlighted?: boolean; selected?: boolean }): ReactNode => (
  <div className="rt-ds-typeahead-option" data-highlighted={opts?.highlighted ? "" : undefined} style={{ cursor: "default" }}>
    <span className="rt-ds-typeahead-label" style={opts?.selected ? { fontWeight: 600 } : undefined}>{label}</span>
  </div>
);

const meta: Meta<typeof Typeahead> = {
  title: "_internal/Typeahead behavior",
  component: Typeahead,
  parameters: { controls: { disable: true } },
};
export default meta;
type Story = StoryObj<typeof Typeahead>;

/** ARIA combobox contract · select-by-click · edit-then-abandon reconcile · clear. */
export const AriaSelection: Story = {
  render: () => (
    <Box p="4" data-testid="ta-usage" style={{ maxWidth: 320 }}>
      <Typeahead
        label="Assignee"
        source={fruitSource}
        placeholder="Search people…"
        debounceMs={0}
        onValueChange={(v) => { (window as unknown as { __taSelected?: TypeaheadOption | null }).__taSelected = v; }}
      />
    </Box>
  ),
  play: async ({ canvasElement }) => {
    const scope = canvasElement.querySelector<HTMLElement>('[data-testid="ta-usage"]')!;
    const input = combobox(scope)!;

    // --- ARIA combobox contract ---
    if (input.getAttribute("aria-expanded") !== "false")
      throw new Error(`resting aria-expanded must be "false"; got ${input.getAttribute("aria-expanded")}`);
    if (input.getAttribute("aria-autocomplete") !== "list")
      throw new Error(`aria-autocomplete must be "list"; got ${input.getAttribute("aria-autocomplete")}`);
    input.focus();
    typeInto(input, "ap");
    const box = await waitFor(() => panelOf(input));
    if (box.getAttribute("role") !== "listbox") throw new Error("typing must open a role=listbox");
    if (box.querySelectorAll('[role="option"]').length === 0) throw new Error("a matching query must reveal options");
    if (input.getAttribute("aria-expanded") !== "true") throw new Error("aria-expanded must flip to true when open");
    press(input, "ArrowDown");
    await waitFor(() => input.getAttribute("aria-activedescendant"));
    const active = input.getAttribute("aria-activedescendant")!;
    if (!box.querySelector(`#${CSS.escape(active)}`)) throw new Error("aria-activedescendant must reference a rendered option");

    // --- select by click (commits + shows the label + closes + fires onValueChange) ---
    typeInto(input, "man"); // → Mango
    const b2 = await waitFor(() => panelOf(input));
    const opt = await waitFor(() => b2.querySelector<HTMLElement>('[role="option"]'));
    const label = opt.textContent ?? "";
    opt.click();
    await waitFor(() => input.getAttribute("aria-expanded") === "false");
    if (input.value !== label) throw new Error(`selecting must show the label; got "${input.value}"`);
    const got = (window as unknown as { __taSelected?: TypeaheadOption | null }).__taSelected;
    if (!got || got.label !== label) throw new Error("onValueChange must fire with the selected option");

    // --- edit-then-abandon reconciles the input back to the committed selection (no lying control) ---
    typeInto(input, "Man"); // partial edit of the selected "Mango" — a search opens
    await waitFor(() => panelOf(input));
    input.blur(); // abandon without re-selecting
    await waitFor(() => input.value === label); // input reverts to the model's label, not "Man"
    if (panelOf(input)) throw new Error("abandon must close the panel");
    input.focus();
    await sleep(40);
    if (panelOf(input)) throw new Error("re-focus after abandon must not resurface the stale panel");
    input.blur();
    await waitFor(() => input.getAttribute("aria-expanded") === "false");

    // --- clear ✕ resets value + query ---
    const clearBtn = await waitFor(() => scope.querySelector<HTMLElement>('button[aria-label="Clear"]'));
    clearBtn.click();
    await waitFor(() => input.value === "");
    if (input.value !== "") throw new Error("clear must reset the query");
    if (panelOf(input)) throw new Error("clear must close the panel");
  },
};

/** Validation reaches the combobox input, and the error paint is accent-aware (not raw red). */
export const Validation: Story = {
  render: () => (
    <Box p="4" data-testid="anatomy-validation" style={{ maxWidth: 300 }}>
      <Typeahead label="Fruit" source={fruitSource} placeholder="Search fruit…" debounceMs={0} validation={{ tone: "error", message: "Pick a fruit from the list." }} />
    </Box>
  ),
  play: async ({ canvasElement }) => {
    const scope = canvasElement.querySelector<HTMLElement>('[data-testid="anatomy-validation"]')!;
    const input = combobox(scope)!;
    if (input.getAttribute("aria-invalid") !== "true")
      throw new Error("error validation must set aria-invalid on the combobox input");
    const describedby = input.getAttribute("aria-describedby");
    if (!describedby) throw new Error("error validation must set aria-describedby");
    const msg = scope.querySelector(`#${CSS.escape(describedby)}`);
    if (!/pick a fruit/i.test(msg?.textContent ?? ""))
      throw new Error("aria-describedby must resolve to the validation message");
    if (!scope.querySelector('[data-validation="error"] .rt-TextFieldRoot'))
      throw new Error("error paint must target the reused .rt-TextFieldRoot");

    // Accent-aware: --ds-stroke-error shifts under a red brand (red → oxblood; COLLISION_TABLE).
    const root = themeRoot(canvasElement);
    const boxEl = scope.querySelector<HTMLElement>(".rt-TextFieldRoot")!;
    const r1 = withAccent(root, "iris");
    const errIris = oklab(boxEl, "var(--ds-stroke-error)");
    r1();
    const r2 = withAccent(root, "red");
    const errRed = oklab(boxEl, "var(--ds-stroke-error)");
    r2();
    if (deltaEOK(errIris, errRed) < 0.03)
      throw new Error("error family must follow the accent collision shift (accent-aware, not raw red)");
  },
};

/** The full keyboard walk: auto-highlight · ArrowDown/Up wrap · Home/End · Enter selects · Escape
 *  closes · a polite announcement · blur-close. */
export const Keyboard: Story = {
  render: () => (
    <Box p="4" data-testid="ta-keyboard" style={{ maxWidth: 300 }}>
      <Typeahead label="Fruit" source={fruitSource} placeholder="Search fruit…" debounceMs={0} />
    </Box>
  ),
  play: async ({ canvasElement, globals }) => {
    const input = combobox(canvasElement.querySelector<HTMLElement>('[data-testid="ta-keyboard"]')!)!;
    input.focus();
    typeInto(input, "a"); // many matches (sliced to maxItems)
    const box = await waitFor(() => panelOf(input));
    const count = box.querySelectorAll('[role="option"]').length;
    if (count < 3) throw new Error("keyboard walk needs ≥3 options");

    // --- THE OPEN-STATE ROW BOX ([[box-law-scope]]). The rest-state manifest in `_control-box.stories.tsx` cannot
    // reach a row that only exists inside an opened portal, and it names this suite as where the open
    // geometry is guarded. This is that guard: the rows the reader is arrowing through must measure
    // the step the tier asks for, on the ladder in `boxLaw.ts` rather than a number retyped here.
    assertMenuOptionBox({
      selector: ".rt-ds-typeahead-option",
      uiSize: String(globals.uiSize ?? "small"),
      label: "Typeahead",
      minRows: 3,
    });
    const activeIdx = () => {
      const a = input.getAttribute("aria-activedescendant");
      return [...box.querySelectorAll('[role="option"]')].findIndex((o) => o.id === a);
    };

    await waitFor(() => activeIdx() === 0); // first result auto-highlighted on open
    press(input, "ArrowDown");
    await waitFor(() => activeIdx() === 1);
    press(input, "ArrowUp");
    await waitFor(() => activeIdx() === 0);
    press(input, "ArrowUp"); // wrap to last
    await waitFor(() => activeIdx() === count - 1);
    press(input, "Home");
    await waitFor(() => activeIdx() === 0);
    press(input, "End");
    await waitFor(() => activeIdx() === count - 1);

    const lastLabel = box.querySelectorAll('[role="option"]')[count - 1].textContent ?? "";
    press(input, "Enter"); // selects the highlighted (last) option
    await waitFor(() => input.getAttribute("aria-expanded") === "false");
    if (input.value !== lastLabel) throw new Error(`Enter must select the highlighted option; got "${input.value}"`);

    // Escape closes an open panel.
    typeInto(input, "ba");
    await waitFor(() => panelOf(input));
    press(input, "Escape");
    await waitFor(() => !panelOf(input));

    // A completed search announces a polite result count (visibility of system status).
    typeInto(input, "cherr"); // → Cherry
    await waitFor(() => /result/i.test(document.querySelector('[data-ds-live-region="polite"]')?.textContent ?? ""));

    // Focus leaving the field (blur) closes the orphaned panel.
    await waitFor(() => panelOf(input));
    input.blur();
    await waitFor(() => !panelOf(input));
  },
};

/** States — [[floating-surface-fill]] panel opacity · empty-vs-error distinction · both Retry paths · the async-generation
 *  guard (select-vs-search + search-vs-search) · bare-label naming. */
export const States: Story = {
  render: () => (
    <Box p="4">
      <Grid columns={{ initial: "1", sm: "3" }} gapX="5" gapY="4">
        <PanelSpecimen testid="matrix-results">
          <div className="rt-ds-typeahead-listbox">
            {specOption("Apple", { selected: true })}
            {specOption("Apricot", { highlighted: true })}
            {specOption("Avocado")}
            {specOption("Grape")}
          </div>
        </PanelSpecimen>
        <Box data-testid="ta-empty"><Typeahead label="Empty" source={emptySource} placeholder="Type anything…" debounceMs={0} /></Box>
        <Box data-testid="ta-error"><Typeahead label="Error" source={errorSource} placeholder="Type anything…" debounceMs={0} errorText="Couldn't load results." /></Box>
        <Box data-testid="ta-race"><Typeahead label="Race" source={raceSource} placeholder="Type ‘app’…" debounceMs={0} /></Box>
        <Box data-testid="ta-overlap"><Typeahead label="Overlap" source={overlapSource} placeholder="Type…" debounceMs={0} /></Box>
        <Box data-testid="ta-bare"><Typeahead aria-label="Search fruit" source={fruitSource} placeholder="Search…" debounceMs={0} /></Box>
      </Grid>
    </Box>
  ),
  play: async ({ canvasElement }) => {
    // --- [[floating-surface-fill]]: the panel surface is OPAQUE (the coloured-backdrop check white canvases hide) ---
    const panel = canvasElement.querySelector<HTMLElement>('[data-testid="matrix-results"] .rt-ds-typeahead-panel')!;
    const bg = getComputedStyle(panel).backgroundColor;
    if (!bg || bg === "transparent" || /,\s*0\)\s*$/.test(bg))
      throw new Error(`panel surface must be opaque ([[floating-surface-fill]]); got background "${bg}"`);

    // --- empty echoes the query, and is NOT the error treatment ---
    const ei = combobox(canvasElement.querySelector<HTMLElement>('[data-testid="ta-empty"]')!)!;
    ei.focus();
    typeInto(ei, "zzz");
    const ep = await waitFor(() => { const p = panelOf(ei); return p?.classList.contains("rt-ds-typeahead-empty") ? p : null; });
    if (!/no results for/i.test(ep.textContent ?? "") || !(ep.textContent ?? "").includes("zzz"))
      throw new Error(`empty must echo the query; got "${ep.textContent}"`);
    if (ep.querySelector('[role="option"]')) throw new Error("empty must render no options");
    if (ep.classList.contains("rt-ds-typeahead-error")) throw new Error("empty must NOT use the error treatment");
    ei.blur();
    await waitFor(() => ei.getAttribute("aria-expanded") === "false");

    // --- error is distinct + both Retry paths (pointer + Enter) re-run the query ---
    errorCalls = 0;
    const eri = combobox(canvasElement.querySelector<HTMLElement>('[data-testid="ta-error"]')!)!;
    eri.focus();
    typeInto(eri, "x");
    const erp = await waitFor(() => { const p = panelOf(eri); return p?.classList.contains("rt-ds-typeahead-error") ? p : null; });
    await waitFor(() => errorCalls >= 1);
    if (erp.querySelector('[role="option"]')) throw new Error("error must render no options");
    const retry = erp.querySelector("button");
    if (!retry) throw new Error("error must offer a Retry button");
    const before = errorCalls;
    retry.click(); // pointer retry
    await waitFor(() => errorCalls > before);
    const beforeEnter = errorCalls;
    press(eri, "Enter"); // keyboard retry (in-panel buttons are outside the Tab sequence)
    await waitFor(() => errorCalls > beforeEnter);
    eri.blur();
    await waitFor(() => eri.getAttribute("aria-expanded") === "false");

    // --- race: a slow resolve after a newer selection must NOT clobber it ---
    raceResolve = null;
    const ri = combobox(canvasElement.querySelector<HTMLElement>('[data-testid="ta-race"]')!)!;
    ri.focus();
    typeInto(ri, "ap"); // fast: real matches show
    const rb = await waitFor(() => { const p = panelOf(ri); return p?.getAttribute("role") === "listbox" ? p : null; });
    const first = await waitFor(() => rb.querySelector<HTMLElement>('[role="option"]'));
    const firstLabel = first.textContent ?? "";
    typeInto(ri, "app"); // slow: hangs on the controllable promise; prior results stay visible
    await waitFor(() => raceResolve !== null);
    first.click(); // select — bumps the generation, closes the panel
    await waitFor(() => ri.getAttribute("aria-expanded") === "false");
    if (ri.value !== firstLabel) throw new Error("selection must win");
    raceResolve!([{ id: "stale", label: "STALE RESULT" }]); // the stale resolve arrives late
    await sleep(80);
    if (ri.value !== firstLabel) throw new Error("a stale resolve must not overwrite the selection");
    if (panelOf(ri)) throw new Error("a stale resolve must not reopen the panel");
    if ([...document.querySelectorAll('[role="option"]')].some((o) => /STALE/.test(o.textContent ?? "")))
      throw new Error("a stale resolve must not inject its results");
    ri.blur();
    await waitFor(() => ri.getAttribute("aria-expanded") === "false");

    // --- search-vs-search: an OLDER search resolving AFTER a NEWER one must be dropped ---
    for (const k of Object.keys(overlapDeferreds)) delete overlapDeferreds[k];
    const oi = combobox(canvasElement.querySelector<HTMLElement>('[data-testid="ta-overlap"]')!)!;
    oi.focus();
    typeInto(oi, "old"); // gen N — hangs
    await waitFor(() => overlapDeferreds["old"] !== undefined);
    typeInto(oi, "new"); // gen N+1 — hangs
    await waitFor(() => overlapDeferreds["new"] !== undefined);
    overlapDeferreds["new"]([{ id: "n", label: "NEW MATCH" }]); // newer resolves first
    const op = await waitFor(() => { const p = panelOf(oi); return p?.querySelector('[role="option"]') ? p : null; });
    if (!/NEW MATCH/.test(op.textContent ?? "")) throw new Error("the newer search's results must show");
    overlapDeferreds["old"]([{ id: "o", label: "OLD STALE" }]); // older resolves late — must be dropped
    await sleep(80);
    const opAfter = panelOf(oi);
    if (opAfter && /OLD STALE/.test(opAfter.textContent ?? ""))
      throw new Error("an older search resolving late must NOT clobber the newer results");
    if (!opAfter || !/NEW MATCH/.test(opAfter.textContent ?? ""))
      throw new Error("the newer results must survive the stale resolve");
    oi.blur();
    await waitFor(() => oi.getAttribute("aria-expanded") === "false");

    // --- a bare Typeahead (no label) is named via aria-label (WCAG 4.1.2; a placeholder is not a name) ---
    const bareInput = combobox(canvasElement.querySelector<HTMLElement>('[data-testid="ta-bare"]')!)!;
    if (bareInput.getAttribute("aria-label") !== "Search fruit")
      throw new Error("a bare Typeahead must forward aria-label to the combobox input");
  },
};
