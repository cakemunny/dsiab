import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";
import { Box } from "@radix-ui/themes";
import { FileInput } from "./FileInput";

/* _internal — the FileInput BEHAVIORAL test suite. Underscore-prefixed → the `_internal` group, exempt
   from the registry / story-order guards (like `_dateinput.stories.tsx`). Keeping the behavioral plays
   HERE lets the docs stories (System/FileInput) stay static and calm on view. Each story renders its OWN
   controlled specimen (FileInput is controlled — value + onValueChange) and drives it with synthetic
   events (a real drop via DataTransfer; a browse via input.files + change; we can't script the OS picker,
   so keyboard-browse is asserted via the operable-tab-stop contract). */

/* ---- play helpers -------------------------------------------------------- */
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
const nativeInput = (root: ParentNode) => root.querySelector<HTMLInputElement>('input[type="file"]')!;
const dropzone = (root: ParentNode) => root.querySelector<HTMLElement>(".rt-ds-fileinput-dropzone")!;
const statusRegion = (root: ParentNode) => root.querySelector<HTMLElement>(".rt-ds-fileinput-status")!;
const livePolite = () => document.querySelector('[data-ds-live-region="polite"]')?.textContent ?? "";

function mkFile(name: string, type: string, bytes = 8): File {
  return new File([new Uint8Array(bytes)], name, { type });
}
function dataTransferOf(...files: File[]): DataTransfer {
  const dt = new DataTransfer();
  for (const f of files) dt.items.add(f);
  return dt;
}
function drop(zone: HTMLElement, ...files: File[]) {
  zone.dispatchEvent(new DragEvent("drop", { bubbles: true, cancelable: true, dataTransfer: dataTransferOf(...files) }));
}
function browse(input: HTMLInputElement, ...files: File[]) {
  input.files = dataTransferOf(...files).files;
  input.dispatchEvent(new Event("change", { bubbles: true }));
}

type Val = File | File[] | undefined;
const record = (key: string) => (v: Val) => {
  const w = window as unknown as Record<string, Val[]>;
  (w[key] ??= []).push(v);
};
const calls = (key: string) => (window as unknown as Record<string, Val[]>)[key] ?? [];
const names = (v: Val): string[] => (v == null ? [] : Array.isArray(v) ? v.map((f) => f.name) : [v.name]);

/* A controlled harness so a committed value re-renders the specimen (FileInput is controlled). */
function Harness({
  testid,
  record: rec,
  ...props
}: Omit<React.ComponentProps<typeof FileInput>, "onValueChange"> & { testid: string; record?: (v: Val) => void }) {
  const [v, setV] = useState<Val>(props.value);
  return (
    <Box p="4" data-testid={testid} style={{ maxWidth: 420 }}>
      <FileInput
        {...props}
        value={v}
        onValueChange={(nv) => {
          setV(nv);
          rec?.(nv);
        }}
      />
    </Box>
  );
}

const meta: Meta<typeof FileInput> = {
  title: "_internal/FileInput behavior",
  component: FileInput,
  parameters: { controls: { disable: true } },
};
export default meta;
type Story = StoryObj<typeof FileInput>;

/** The native <input type=file> IS the operable control AND the tab stop in dropzone mode (not a role=button
 *  div): type=file, NOT tabIndex=-1, clip-hidden (never display:none — that drops it from the tab order). */
export const NativeInputIsTheTabStop: Story = {
  render: () => <Harness testid="fi-tabstop" label="Attachment" record={record("fiTab")} />,
  play: async ({ canvasElement }) => {
    const scope = canvasElement.querySelector<HTMLElement>('[data-testid="fi-tabstop"]')!;
    const input = nativeInput(scope);
    if (input.type !== "file") throw new Error("the operable control must be a native <input type=file>");
    if (input.tabIndex === -1) throw new Error("dropzone: the native input must be the tab stop (not tabIndex=-1)");
    // Clip-hidden — present in the a11y tree + tab order (NOT display:none/visibility:hidden).
    const cs = getComputedStyle(input);
    if (cs.display === "none" || cs.visibility === "hidden")
      throw new Error("the input must be CLIP-hidden, never display:none/visibility:hidden");
    if (cs.position !== "absolute") throw new Error("the input must use the absolute clip technique");
    // Named by the Field label's htmlFor (no hand-rolled role=button div).
    if (scope.querySelector('[role="button"]')) throw new Error("we do NOT hand-roll a role=button div (native input is the control)");
    const label = scope.querySelector<HTMLLabelElement>("label.rt-ds-fileinput-dropzone");
    if (!label) throw new Error("the drop surface must be wrapped in a <label> (pointer click opens the picker)");
  },
};

/** Browse (input.files + change) commits the file, and a CLEAN selection announces politely (surface 1). */
export const BrowseCommitsAndAnnounces: Story = {
  render: () => <Harness testid="fi-browse" label="Résumé" accept=".pdf" record={record("fiBrowse")} />,
  play: async ({ canvasElement }) => {
    const scope = canvasElement.querySelector<HTMLElement>('[data-testid="fi-browse"]')!;
    (window as unknown as Record<string, unknown[]>)["fiBrowse"] = [];
    const input = nativeInput(scope);
    browse(input, mkFile("cv.pdf", "application/pdf", 2400));
    await waitFor(() => calls("fiBrowse").length > 0);
    if (names(calls("fiBrowse").at(-1)).join() !== "cv.pdf")
      throw new Error(`browse must commit the single File; got ${names(calls("fiBrowse").at(-1)).join()}`);
    // Surface 1 — a clean selection announces politely with the name + size.
    await waitFor(() => /added.*cv\.pdf/i.test(livePolite()));
    if (!/2\.3 KB|2\.4 KB/.test(livePolite())) throw new Error(`clean selection must announce the size; got "${livePolite()}"`);
    // Re-selecting the SAME file re-fires (native input value reset after each pick).
    if (input.value !== "") throw new Error("the native input value must reset to '' after a pick (re-select re-fires)");
  },
};

/** A synthetic DROP in dropzone mode sets the value; dragover toggles the accent-preview [data-drop-target]. */
export const DropSetsValue: Story = {
  render: () => <Harness testid="fi-drop" label="Attachment" record={record("fiDrop")} />,
  play: async ({ canvasElement }) => {
    const scope = canvasElement.querySelector<HTMLElement>('[data-testid="fi-drop"]')!;
    (window as unknown as Record<string, unknown[]>)["fiDrop"] = [];
    const zone = dropzone(scope);
    // dragover → the accent-preview drag-over attribute appears.
    zone.dispatchEvent(new DragEvent("dragover", { bubbles: true, cancelable: true, dataTransfer: dataTransferOf() }));
    await waitFor(() => zone.hasAttribute("data-drop-target"));
    // drop commits the file and clears the drag-over state.
    drop(zone, mkFile("photo.png", "image/png", 1024));
    await waitFor(() => calls("fiDrop").length > 0);
    if (names(calls("fiDrop").at(-1)).join() !== "photo.png") throw new Error("drop must commit the dropped File");
    await waitFor(() => !zone.hasAttribute("data-drop-target"));
    // The dropped file now shows in the surface (its name, truncatable, title = full name).
    await waitFor(() => scope.querySelector(".rt-ds-fileinput-file-name"));
    const nameEl = scope.querySelector<HTMLElement>(".rt-ds-fileinput-file-name")!;
    if (nameEl.getAttribute("title") !== "photo.png") throw new Error("the filename must carry title=full name");
    // MED-1 (WCAG 4.1.2): the committed selection is exposed to AT via aria-describedby — the native input's
    // value is reset (re-fire same-file) and the visible list is aria-hidden, so a seeded/edit form conveys
    // the attached file only through this persistent node.
    const input = scope.querySelector<HTMLInputElement>('input[type="file"]')!;
    const dbText = (input.getAttribute("aria-describedby") ?? "")
      .split(" ")
      .map((id) => document.getElementById(id)?.textContent)
      .filter(Boolean)
      .join(" ");
    if (!/Selected: photo\.png/.test(dbText))
      throw new Error(`the committed selection must be in aria-describedby; got "${dbText}"`);
  },
};

/** Drop is a NO-OP in compact (input) mode and when disabled — drag-and-drop is a dropzone-only pointer
 *  enhancement; keyboard users are served by the same input, so there is no second tab stop (WCAG 2.1.1). */
export const DropIsNoOpInCompactAndDisabled: Story = {
  render: () => (
    <Box style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      <Harness testid="fi-compact" label="Compact" mode="input" record={record("fiCompact")} />
      <Harness testid="fi-disabled" label="Disabled" disabled record={record("fiDisabledDrop")} />
    </Box>
  ),
  play: async ({ canvasElement }) => {
    (window as unknown as Record<string, unknown[]>)["fiCompact"] = [];
    (window as unknown as Record<string, unknown[]>)["fiDisabledDrop"] = [];
    // Compact mode: the Button is the tab stop, the input is tabIndex=-1, and there is NO dropzone surface.
    const compact = canvasElement.querySelector<HTMLElement>('[data-testid="fi-compact"]')!;
    if (compact.querySelector(".rt-ds-fileinput-dropzone")) throw new Error("compact mode must NOT render a dropzone surface");
    const cbtn = compact.querySelector<HTMLButtonElement>("button");
    if (!cbtn || !/choose file/i.test(cbtn.textContent ?? "")) throw new Error("compact must render a 'Choose file' Button");
    if (nativeInput(compact).tabIndex !== -1) throw new Error("compact: the input must be tabIndex=-1 (the Button is the tab stop)");

    // Disabled dropzone: a synthetic drop must not commit anything (handlers early-return).
    const disabledScope = canvasElement.querySelector<HTMLElement>('[data-testid="fi-disabled"]')!;
    drop(dropzone(disabledScope), mkFile("x.png", "image/png"));
    await sleep(80);
    if (calls("fiDisabledDrop").length !== 0) throw new Error("a disabled dropzone must ignore drops");
  },
};

/** PARTIAL acceptance — some files pass, some are rejected: the accepted subset is COMMITTED, the visible
 *  role=status shows the honest rejection (surface 2), and surface 1 does NOT fire (never double-announce). */
export const PartialAcceptance: Story = {
  render: () => <Harness testid="fi-partial" label="Images" accept=".png,.jpg" isMultiple record={record("fiPartial")} />,
  play: async ({ canvasElement }) => {
    const scope = canvasElement.querySelector<HTMLElement>('[data-testid="fi-partial"]')!;
    (window as unknown as Record<string, unknown[]>)["fiPartial"] = [];
    // Clear any lingering polite text from a prior story so the never-double-announce check is honest.
    const politeBefore = livePolite();

    drop(scope.querySelector<HTMLElement>(".rt-ds-fileinput-dropzone")!, mkFile("keep.png", "image/png"), mkFile("cat.gif", "image/gif"));
    await waitFor(() => calls("fiPartial").length > 0);
    // Value = the ACCEPTED subset only.
    if (names(calls("fiPartial").at(-1)).join() !== "keep.png")
      throw new Error(`partial accept must commit ONLY the valid subset; got ${names(calls("fiPartial").at(-1)).join()}`);
    // Surface 2 — the visible role=status names the rejected file + the reason.
    const region = await waitFor(() => {
      const r = statusRegion(scope);
      return r.textContent && r.textContent.trim() ? r : null;
    });
    if (region.getAttribute("role") !== "status") throw new Error("surface 2 must be role=status (NOT alert — partial isn't blocking)");
    if (region.getAttribute("aria-live") !== "polite") throw new Error("surface 2 must be aria-live=polite");
    if (!/cat\.gif/.test(region.textContent ?? "")) throw new Error(`surface 2 must name the rejected file; got "${region.textContent}"`);
    if (!/Added 1 file/i.test(region.textContent ?? "")) throw new Error(`a partial accept must LEAD with the win; got "${region.textContent}"`);
    // Colour-not-alone: an icon accompanies the text.
    if (!region.querySelector("svg")) throw new Error("surface 2 must pair an icon with the text (colour-not-alone)");
    // Never double-announce: surface 1 (the polite useAnnounce region) must NOT gain an "Added … files selected" line.
    await sleep(60);
    if (livePolite() !== politeBefore && /files selected|Added .+,/i.test(livePolite()))
      throw new Error(`a rejection must NOT also fire the shared success announce; got "${livePolite()}"`);
  },
};

/** Replace-never-append: a second selection REPLACES the first (the native input can't append). */
export const ReplaceNeverAppend: Story = {
  render: () => <Harness testid="fi-replace" label="Attachment" isMultiple record={record("fiReplace")} />,
  play: async ({ canvasElement }) => {
    const scope = canvasElement.querySelector<HTMLElement>('[data-testid="fi-replace"]')!;
    (window as unknown as Record<string, unknown[]>)["fiReplace"] = [];
    const zone = dropzone(scope);
    drop(zone, mkFile("a.png", "image/png"), mkFile("b.png", "image/png"));
    await waitFor(() => calls("fiReplace").length > 0);
    if (names(calls("fiReplace").at(-1)).sort().join() !== "a.png,b.png") throw new Error("first drop commits both files");
    drop(zone, mkFile("c.png", "image/png"));
    await waitFor(() => calls("fiReplace").length > 1);
    if (names(calls("fiReplace").at(-1)).join() !== "c.png")
      throw new Error(`a second selection must REPLACE (not append); got ${names(calls("fiReplace").at(-1)).join()}`);
  },
};

/** Clear-all → undefined + refocus; the ✕ is a REAL tab stop (the only way to clear), NEUTRAL (not danger). */
export const ClearAll: Story = {
  render: () => {
    function Demo() {
      const [v, setV] = useState<Val>(new File(["x"], "seed.png", { type: "image/png" }));
      return (
        <Box p="4" data-testid="fi-clear" style={{ maxWidth: 420 }}>
          <FileInput label="Attachment" value={v} onValueChange={(nv) => { setV(nv); record("fiClear")(nv); }} />
        </Box>
      );
    }
    return <Demo />;
  },
  play: async ({ canvasElement }) => {
    const scope = canvasElement.querySelector<HTMLElement>('[data-testid="fi-clear"]')!;
    (window as unknown as Record<string, unknown[]>)["fiClear"] = [];
    const clearBtn = await waitFor(() => scope.querySelector<HTMLButtonElement>('button[aria-label="Remove all files"]'));
    // A REAL tab stop (unlike the [[field-family-anatomy]] date/time ✕ at tabIndex=-1) — it's the ONLY way to clear.
    if (clearBtn.tabIndex === -1) throw new Error("the clear-all ✕ must be a real tab stop (tabbable)");
    // NEUTRAL, not tone=danger (clearing an un-uploaded selection is trivially reversible).
    if (clearBtn.getAttribute("data-tone") === "danger") throw new Error("clear-all must be NEUTRAL, not tone=danger");
    clearBtn.click();
    await waitFor(() => calls("fiClear").length > 0);
    if (calls("fiClear").at(-1) !== undefined) throw new Error("clear-all must fire onValueChange(undefined)");
    // Refocus the tab stop the ✕ disappeared from (the dropzone input).
    await waitFor(() => document.activeElement === nativeInput(scope));
  },
};

/** disabledReason SOFT-disables (aria-disabled, NOT native disabled) so the reason stays perceivable; the
 *  input's click is preventDefault'd (the picker never opens) and drops early-return. */
export const DisabledReasonSoftDisable: Story = {
  render: () => <Harness testid="fi-soft" label="Attachment" disabled disabledReason="Verify your email first." record={record("fiSoft")} />,
  play: async ({ canvasElement }) => {
    const scope = canvasElement.querySelector<HTMLElement>('[data-testid="fi-soft"]')!;
    (window as unknown as Record<string, unknown[]>)["fiSoft"] = [];
    const input = nativeInput(scope);
    if (input.getAttribute("aria-disabled") !== "true") throw new Error("soft-disable must set aria-disabled");
    if (input.hasAttribute("disabled")) throw new Error("soft-disable must NOT natively disable (it would drop from the a11y tree)");
    if (input.getAttribute("aria-invalid") === "true") throw new Error("a reason is guidance, not an error — never aria-invalid");
    // The reason is wired via aria-describedby → a persistent hidden node.
    const describedby = input.getAttribute("aria-describedby");
    const reasonNode = describedby ? scope.querySelector(`#${CSS.escape(describedby.split(" ").at(-1)!)}`) : null;
    if (!/verify your email/i.test(reasonNode?.textContent ?? "")) throw new Error("aria-describedby must resolve to the reason");
    // Clicking the input is preventDefault'd → the native picker never opens while soft.
    const ev = new MouseEvent("click", { bubbles: true, cancelable: true });
    input.dispatchEvent(ev);
    if (!ev.defaultPrevented) throw new Error("a soft-disabled input's click must be preventDefault'd (picker stays closed)");
    // A drop early-returns → no commit.
    drop(dropzone(scope), mkFile("x.png", "image/png"));
    await sleep(80);
    if (calls("fiSoft").length !== 0) throw new Error("a soft-disabled dropzone must ignore drops (handlers early-return)");
  },
};
