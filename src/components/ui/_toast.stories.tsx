import type { ReactNode } from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { Box, Flex } from "@radix-ui/themes";
import { ToastProvider, ToastViewport, useToast, type ToastOptions, type ToastPosition, type ToastTone } from "./Toast";
import { Button } from "./Button";
import { Dialog } from "./Dialog";
import { toHex } from "./_storyKit";
import { parseColor, resolveColor, themeRoot, withAccent } from "../../foundations/_assert";

/* Test-only behavior for Toast — kept OUT of the docs stories (System/Toast) so viewing a docs page never
   spawns or auto-hides a toast on view (Storybook runs a story's play on view — that would flash the corner).
   Underscore-prefixed file → registry-guard-exempt, grouped under _internal. These plays DRIVE the
   real engine: they spawn via useToast, wait on the manager, and assert the [[toast-feedback-tier]]/[[toast-feedback-tier]]/[[toast-feedback-tier]] contracts. */

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

const toMs = (v: string) => (v.trim().endsWith("ms") ? parseFloat(v) : parseFloat(v) * 1000);
const toasts = () => Array.from(document.querySelectorAll<HTMLElement>("[data-ds-toast-id]"));
const liveToasts = () => toasts().filter((t) => t.getAttribute("data-state") !== "closed");
const tokenHex = (el: Element, name: string) => {
  const probe = document.createElement("span");
  el.appendChild(probe);
  probe.style.color = `var(${name})`;
  const hex = toHex(getComputedStyle(probe).color);
  probe.remove();
  return hex;
};

/** A driven sandbox: its own ToastProvider + ToastViewport so each play controls maxVisible/position and
 *  starts from a clean queue. A saturated backdrop sits behind the corner so opacity is verified over
 *  colour, not the white canvas. */
function Sandbox({ position, maxVisible, backdrop, children }: {
  position?: ToastPosition; maxVisible?: number; backdrop?: boolean; children: ReactNode;
}) {
  return (
    <ToastProvider>
      {backdrop && (
        <div style={{ position: "fixed", bottom: 0, right: 0, width: 440, height: 420, background: "var(--ds-fill-accent)", zIndex: 1 }} aria-hidden />
      )}
      <Box p="5">{children}</Box>
      <ToastViewport position={position} maxVisible={maxVisible} />
    </ToastProvider>
  );
}

function Spawner({ specs }: { specs: { id: string; label: string; make: () => ToastOptions }[] }) {
  const toast = useToast();
  return (
    <Flex gap="2" wrap="wrap">
      {specs.map((s) => (
        <Button key={s.id} data-testid={s.id} priority="secondary" onClick={() => toast(s.make())}>
          {s.label}
        </Button>
      ))}
    </Flex>
  );
}

const click = (root: HTMLElement, id: string) => (root.querySelector<HTMLElement>(`[data-testid="${id}"]`))!.click();
const TONES: ToastTone[] = ["info", "success", "warning", "error"];

const meta: Meta = {
  title: "_internal/Toast behavior",
  parameters: { controls: { disable: true } },
};
export default meta;
type Story = StoryObj;

/** [[toast-feedback-tier]] tone paint — each family resolves --ds-stroke-{fam}/--ds-text-{fam} by hex, the surface is OPAQUE
 *  ([[floating-surface-fill]]) over a coloured backdrop, and the paint is accent-aware (error shifts gray→tomato). axe per tone. */
export const Tones: Story = {
  render: () => (
    <Sandbox backdrop>
      <Spawner
        specs={TONES.map((tone) => ({
          id: `spawn-${tone}`,
          label: tone,
          // autoHide:false so all four stay put while the play inspects them.
          make: () => ({ body: `${tone} — a short line of feedback.`, tone, autoHide: false }),
        }))}
      />
    </Sandbox>
  ),
  play: async ({ canvasElement }) => {
    for (const tone of TONES) click(canvasElement, `spawn-${tone}`);
    await waitFor(() => liveToasts().length === 4);

    for (const tone of TONES) {
      const el = await waitFor(() => document.querySelector<HTMLElement>(`.rt-ds-toast[data-tone="${tone}"]`));
      const body = el.querySelector<HTMLElement>(".rt-ds-toast-body")!;

      // border = --ds-stroke-{fam}, body text = --ds-text-{fam}, by resolved hex.
      const gotBorder = toHex(getComputedStyle(el).borderTopColor);
      const wantBorder = tokenHex(el, `--ds-stroke-${tone}`);
      if (gotBorder !== wantBorder) throw new Error(`${tone} border must resolve --ds-stroke-${tone}; got ${gotBorder} vs ${wantBorder}`);

      const gotText = toHex(getComputedStyle(body).color);
      const wantText = tokenHex(el, `--ds-text-${tone}`);
      if (gotText !== wantText) throw new Error(`${tone} body must resolve --ds-text-${tone}; got ${gotText} vs ${wantText}`);

      // The --ds-fill-{fam}-weak tint layer is applied (a solid gradient over the opaque base).
      if (getComputedStyle(el).backgroundImage === "none") throw new Error(`${tone} must carry the --ds-fill-${tone}-weak tint layer`);

      // [[floating-surface-fill]] — the surface is OPAQUE (the tint composites over an opaque base), verified over the coloured backdrop.
      const bg = parseColor(getComputedStyle(el).backgroundColor);
      if (bg.a !== 1) throw new Error(`${tone} surface must be opaque ([[floating-surface-fill]]); got alpha ${bg.a}`);
    }

    // Accent-aware: --ds-text-error resolves the error FAMILY token, so its hex differs between two brand
    // accents (gray vs tomato here) instead of being pinned to a fixed red — that following-the-accent is
    // exactly why a raw Radix color="red" is banned. (This checks the shift exists, not a specific target.)
    const anyToast = document.querySelector<HTMLElement>(".rt-ds-toast")!;
    const root = themeRoot(anyToast);
    const rGray = withAccent(root, "gray");
    const errGray = resolveColor(root, "--ds-text-error");
    rGray();
    const rTomato = withAccent(root, "tomato");
    const errTomato = resolveColor(root, "--ds-text-error");
    rTomato();
    if (errGray.r === errTomato.r && errGray.g === errTomato.g && errGray.b === errTomato.b)
      throw new Error("--ds-text-error did not differ between the gray and tomato accents — the tone paint would not be accent-aware");
  },
};

/** [[toast-feedback-tier]] persistence — error persists past its would-be auto-hide window; a non-error auto-hides. */
export const Persistence: Story = {
  render: () => (
    <Sandbox>
      <Spawner
        specs={[
          { id: "spawn-info", label: "info (250ms)", make: () => ({ body: "Saved.", tone: "info", autoHideDuration: 250 }) },
          { id: "spawn-error", label: "error (persists)", make: () => ({ body: "Upload failed.", tone: "error" }) },
        ]}
      />
    </Sandbox>
  ),
  play: async ({ canvasElement }) => {
    click(canvasElement, "spawn-info");
    click(canvasElement, "spawn-error");
    await waitFor(() => liveToasts().length === 2);
    // Wait well past the info countdown (250ms) + its exit GC; the error must remain.
    await sleep(900);
    const info = document.querySelector('.rt-ds-toast[data-tone="info"]');
    const error = document.querySelector('.rt-ds-toast[data-tone="error"]');
    if (info) throw new Error("an info toast must auto-hide past its autoHideDuration");
    if (!error) throw new Error("an error toast must persist (no auto-hide)");
  },
};

/** [[toast-feedback-tier]] windowing — only the newest maxVisible render; older queued toasts wait. */
export const Windowing: Story = {
  render: () => (
    <Sandbox maxVisible={3}>
      <Spawner
        specs={[{ id: "spawn", label: "spawn", make: () => ({ body: "Queued item.", tone: "error" }) }]}
      />
    </Sandbox>
  ),
  play: async ({ canvasElement }) => {
    for (let i = 0; i < 5; i++) click(canvasElement, "spawn");
    // Five spawned, cap 3 → exactly three render; the other two queue.
    await waitFor(() => liveToasts().length === 3);
    await sleep(120);
    if (liveToasts().length !== 3) throw new Error(`windowing must cap visible toasts at maxVisible=3; got ${liveToasts().length}`);
  },
};

/** [[toast-feedback-tier]] focus handoff — dismissing a focused toast moves focus to the NEXT toast, never to <body>. */
export const FocusHandoff: Story = {
  render: () => (
    <Sandbox>
      <Spawner
        specs={[{ id: "spawn", label: "spawn", make: () => ({ body: "Notice.", tone: "error" }) }]}
      />
    </Sandbox>
  ),
  play: async ({ canvasElement }) => {
    for (let i = 0; i < 3; i++) click(canvasElement, "spawn");
    await waitFor(() => liveToasts().length === 3);
    const [t1, t2, t3] = liveToasts();
    void t1;
    // Focus the middle toast's dismiss control, then dismiss it.
    const dismiss2 = t2.querySelector<HTMLElement>('[aria-label="Dismiss"]')!;
    dismiss2.focus();
    if (!t2.contains(document.activeElement)) throw new Error("precondition: focus should be inside the middle toast");
    dismiss2.click();
    // Focus must land inside the NEXT toast, and never on <body>.
    await waitFor(() => t3.contains(document.activeElement));
    if (document.activeElement === document.body) throw new Error("focus handoff must never drop to <body>");
  },
};

/** Motion — a toast arrives on the moderate tier and leaves on the SLOWER expressive tier, and the
 *  entry is held in the DOM long enough for that exit to finish. The exit half is the one that bites:
 *  the manager hard-removes the node on a timer (EXIT_GC_MS in Toast.tsx) that is independent of the
 *  CSS, so a retimed exit silently outgrows its own hold and the toast vanishes mid-animation instead
 *  of leaving. This asserts the exit names REAL keyframes (a duration on a nameless animation is dead
 *  CSS — it declares motion that never runs, and a duration-only check passes anyway) and that the
 *  node survives, from the dismiss click, at least as long as the exit it declares. */
export const Motion: Story = {
  render: () => (
    <Sandbox>
      <Spawner specs={[{ id: "spawn", label: "spawn", make: () => ({ body: "Hello.", tone: "info", autoHide: false }) }]} />
    </Sandbox>
  ),
  play: async ({ canvasElement }) => {
    click(canvasElement, "spawn");
    const el = await waitFor(() => document.querySelector<HTMLElement>('.rt-ds-toast[data-state="open"]'));

    // IN — the modal tier's fast side.
    const wantIn = toMs(getComputedStyle(el).getPropertyValue("--ds-duration-moderate"));
    const gotIn = toMs(getComputedStyle(el).animationDuration.split(",")[0]);
    if (Math.abs(gotIn - wantIn) > 1) throw new Error(`toast enter must use --ds-duration-moderate (${wantIn}ms); got ${gotIn}ms`);

    // OUT — dismiss through the real control, then read the closing state off the same node.
    const wantOut = toMs(getComputedStyle(el).getPropertyValue("--ds-duration-expressive"));
    const dismissedAt = performance.now();
    el.querySelector<HTMLElement>('[aria-label="Dismiss"]')!.click();
    await waitFor(() => el.getAttribute("data-state") === "closed");

    const exitCs = getComputedStyle(el);
    const exitName = exitCs.animationName.trim();
    if (!exitName || exitName === "none")
      throw new Error("the closing toast declares no animation-name — a duration alone is dead CSS and the toast would vanish, not leave");
    const gotOut = toMs(exitCs.animationDuration.split(",")[0]);
    if (Math.abs(gotOut - wantOut) > 1) throw new Error(`toast exit must use --ds-duration-expressive (${wantOut}ms); got ${gotOut}ms`);
    // The named keyframes must EXIST — a name pointing at nothing produces no animation at all.
    // (Skipped under reduced motion, where the ~0.01ms exit is already over by this line.)
    if (gotOut > 50 && !el.getAnimations().some((a) => a.playState === "running"))
      throw new Error(`the closing toast names '${exitName}' but no animation is running — the keyframes do not resolve`);

    // THE TRUNCATION GUARD — EXIT_GC_MS is a timer started at the dismiss call, so the hold is measured
    // from the click, not from the state flip. If that constant ever falls back under the exit duration
    // the node is torn out mid-animation and this fails.
    await waitFor(() => !el.isConnected, 3000);
    const heldMs = performance.now() - dismissedAt;
    if (heldMs + 1 < gotOut)
      throw new Error(`the toast must be held through its exit; the node was removed after ${Math.round(heldMs)}ms of a ${gotOut}ms exit animation (raise EXIT_GC_MS in Toast.tsx)`);
  },
};

/** [[toast-feedback-tier]] action cluster — action + mandatory dismiss ride a ButtonGroup (buttonOrder governs the cluster,
 *  never a raw Flex). The action is a secondary (surface) chip (ruled 2026-07-09) — a quiet accent
 *  surface, not a solid block; the dismiss is a neutral-gray ghost. The spawned success toast paints
 *  --ds-text-success (step-11) on a weak tint, just under axe's strict 4.5 for some accents (the [[brand-collision-shift-table]] step-11
 *  reality), so color-contrast is scoped off here (documented). */
export const ActionCluster: Story = {
  // Excluded as an ELEMENT (the toast body text) rather than switching color-contrast off for the whole
  // fixture, so the action chip and the dismiss ghost are contrast-checked again.
  parameters: { a11y: { context: { exclude: [".rt-ds-toast-body"] } } },
  render: () => (
    <Sandbox>
      <Spawner
        specs={[{
          id: "spawn",
          label: "spawn with Undo",
          make: () => ({ body: "Project archived.", tone: "success", autoHide: false, action: { label: "Undo", altText: "Undo archiving the project", onClick: () => {} } }),
        }]}
      />
    </Sandbox>
  ),
  play: async ({ canvasElement }) => {
    click(canvasElement, "spawn");
    const el = await waitFor(() => document.querySelector<HTMLElement>(".rt-ds-toast"));
    // The action is a secondary surface chip; the dismiss is a ghost. buttonOrder governs the cluster; Undo
    // stays first in source order.
    const buttons = Array.from(el.querySelectorAll<HTMLElement>("button"));
    if (buttons.length !== 2) throw new Error(`the cluster must render exactly action + dismiss; got ${buttons.length}`);
    const action = el.querySelector<HTMLElement>(".rt-variant-surface");
    if (!action || action.textContent !== "Undo") throw new Error("the action must be the secondary surface chip in the cluster");
    if (buttons[0].textContent !== "Undo") throw new Error(`primary-first: Undo should be first in the cluster; got ${buttons.map((b) => b.textContent || b.getAttribute("aria-label")).join(" | ")}`);
    if (buttons[1].getAttribute("aria-label") !== "Dismiss") throw new Error("the mandatory dismiss must follow the action");
  },
};

/** onHide-once — clicking Undo runs the action AND onHide EXACTLY once, and the toast dismisses. Radix's
 *  ToastAction composes our onClick with an internal onClose, so the click would drive dismiss(id) twice in a
 *  tick; the manager's per-tick dismiss guard collapses them so the documented onHide callback fires only once
 *  (the double-fire this regresses). color-contrast is scoped off (the step-11 toast body, as on ActionCluster). */
const onHideOnceCounts = { click: 0, hide: 0 };
export const OnHideOnce: Story = {
  // Same narrowing as ActionCluster: the step-11 toast body only, not the whole fixture's contrast rule.
  parameters: { a11y: { context: { exclude: [".rt-ds-toast-body"] } } },
  render: () => (
    <Sandbox>
      <Spawner
        specs={[{
          id: "spawn",
          label: "spawn with Undo",
          make: () => ({
            body: "Project archived.",
            tone: "success",
            autoHide: false,
            action: { label: "Undo", altText: "Undo archiving the project", onClick: () => { onHideOnceCounts.click += 1; } },
            onHide: () => { onHideOnceCounts.hide += 1; },
          }),
        }]}
      />
    </Sandbox>
  ),
  play: async ({ canvasElement }) => {
    onHideOnceCounts.click = 0;
    onHideOnceCounts.hide = 0;
    click(canvasElement, "spawn");
    const el = await waitFor(() => document.querySelector<HTMLElement>(".rt-ds-toast"));
    const undo = Array.from(el.querySelectorAll<HTMLElement>("button")).find((b) => b.textContent === "Undo");
    if (!undo) throw new Error("precondition: the Undo action should render in the cluster");
    undo.click();
    // Radix's Action closes the toast → it must dismiss (element unmounts after the exit + GC).
    await waitFor(() => toasts().length === 0);
    if (onHideOnceCounts.click !== 1) throw new Error(`action.onClick must fire exactly once on Undo; got ${onHideOnceCounts.click}`);
    if (onHideOnceCounts.hide !== 1) throw new Error(`onHide must fire exactly once on Undo (no double-fire); got ${onHideOnceCounts.hide}`);
  },
};

/** uniqueID reuse — re-pushing a just-dismissed uniqueID inside the exit-GC window REVIVES the closing entry
 *  instead of appending a second one, so exactly ONE element ever carries the id and no duplicate React key is
 *  emitted (the key warning fires at render time, independent of exit-animation timing → the deterministic tell). */
export const UniqueIdReuse: Story = {
  render: () => (
    <Sandbox>
      <Spawner
        specs={[
          { id: "push-x", label: "push x", make: () => ({ body: "First x.", tone: "error", uniqueID: "x" }) },
          { id: "repush-x", label: "re-push x", make: () => ({ body: "Second x.", tone: "error", uniqueID: "x" }) },
        ]}
      />
    </Sandbox>
  ),
  play: async ({ canvasElement }) => {
    const withId = () => document.querySelectorAll<HTMLElement>('[data-ds-toast-id="x"]');
    const keyWarnings: string[] = [];
    const origError = console.error;
    console.error = (...args: unknown[]) => {
      if (args.some((a) => /same key|two children with the same key/i.test(String(a)))) keyWarnings.push(String(args[0]));
      origError(...(args as []));
    };
    try {
      click(canvasElement, "push-x");
      const first = await waitFor(() => (withId().length === 1 ? withId()[0] : null));
      // Dismiss it — the entry now lingers (open:false) through the exit-GC window before hardRemove.
      first.querySelector<HTMLElement>('[aria-label="Dismiss"]')!.click();
      await waitFor(() => first.getAttribute("data-state") === "closed" || withId().length === 0);
      // Re-push the SAME uniqueID well inside that window.
      await sleep(60);
      click(canvasElement, "repush-x");
      await sleep(80); // let the render (and any duplicate-key warning) flush; still < the 220ms GC
      // Exactly one element carries the id — the closing entry was revived, not appended past.
      if (withId().length !== 1) throw new Error(`re-pushing a just-dismissed uniqueID must not duplicate the entry; got ${withId().length} elements with data-ds-toast-id="x"`);
      if (withId()[0].getAttribute("data-state") === "closed") throw new Error("the re-pushed toast must revive (open), not stay closing");
      if (keyWarnings.length) throw new Error(`re-pushing a just-dismissed uniqueID produced a duplicate React key: ${keyWarnings[0]}`);
    } finally {
      console.error = origError;
    }
  },
};

/* A modal whose own action raises the toast, the shape Radix #4115 reports. Undo counts its runs, so the
   pointer check can tell a click that ran Undo from one the dialog swallowed. */
const underModalUndo = { runs: 0 };
function ModalRaiser() {
  const toast = useToast();
  return (
    <Dialog.Root>
      <Dialog.Trigger>
        <Button data-testid="open-modal" priority="secondary">Open modal</Button>
      </Dialog.Trigger>
      <Dialog.Content maxWidth="420px">
        <Dialog.Title>Delete project</Dialog.Title>
        <Dialog.Description size="2">The toast is raised while this modal is open.</Dialog.Description>
        <Dialog.Footer>
          <Button
            data-testid="raise-in-modal"
            priority="primary"
            onClick={() => toast({ body: "Project deleted.", tone: "info", autoHide: false, action: { label: "Undo", altText: "Undo deleting the project", onClick: () => { underModalUndo.runs += 1; } } })}
          >
            Delete project
          </Button>
        </Dialog.Footer>
      </Dialog.Content>
    </Dialog.Root>
  );
}

/** A mouse click at (x, y) in the browser's own event order, delivered to whatever the hit test finds
 *  there. A layer painted over the target takes the click, as it would from a real pointer, and the
 *  pointerdown reaches the document listeners that dismiss a Radix layer on an outside press. */
function clickAt(x: number, y: number): Element {
  const target = document.elementFromPoint(x, y);
  if (!target) throw new Error(`nothing to click at ${Math.round(x)},${Math.round(y)}`);
  const mouse = { bubbles: true, cancelable: true, composed: true, clientX: x, clientY: y, button: 0, view: window };
  const pointer = { ...mouse, pointerId: 1, pointerType: "mouse", isPrimary: true };
  const pressed = target.dispatchEvent(new PointerEvent("pointerdown", { ...pointer, buttons: 1 }));
  // A cancelled pointerdown suppresses the compatibility mousedown, and a cancelled mousedown keeps focus.
  if (pressed && target.dispatchEvent(new MouseEvent("mousedown", { ...mouse, buttons: 1 })))
    target.closest<HTMLElement>("button, a[href], input, [tabindex]")?.focus();
  target.dispatchEvent(new PointerEvent("pointerup", pointer));
  target.dispatchEvent(new MouseEvent("mouseup", mouse));
  target.dispatchEvent(new MouseEvent("click", { ...mouse, detail: 1 }));
  return target;
}

/** Toast under a modal (Radix #4115). A modal Dialog hides everything outside itself with `aria-hidden`,
 *  so a toast raised from inside the modal sat in a hidden subtree and a screen reader could not reach
 *  Undo. The rail now carries `aria-live="off"`, which aria-hidden leaves alone with its ancestors.
 *  The pointer half: the rail portals to the body, so the toast paints above the scrim, Undo is the hit
 *  target at its centre, and a click there runs Undo while the dialog stays open. A toast raised BEFORE
 *  the modal opened is not covered, because Radix turns pointer events off on every older layer. The
 *  toast body text is excluded from the contrast rule, as on ActionCluster. */
export const UnderModal: Story = {
  parameters: { a11y: { context: { exclude: [".rt-ds-toast-body"] } } },
  render: () => (
    <Sandbox>
      <ModalRaiser />
    </Sandbox>
  ),
  play: async ({ canvasElement }) => {
    underModalUndo.runs = 0;
    const opener = canvasElement.querySelector<HTMLElement>('[data-testid="open-modal"]')!;
    opener.click();
    const raise = await waitFor(() => document.querySelector<HTMLElement>('[role="dialog"] [data-testid="raise-in-modal"]'));
    // Precondition: the modal hid the page behind it, or "no aria-hidden ancestor" proves nothing.
    await waitFor(() => opener.closest('[aria-hidden="true"]')).catch(() => {
      throw new Error("precondition: an open modal Dialog must hide the page behind it with aria-hidden");
    });
    raise.click();
    const el = await waitFor(() => document.querySelector<HTMLElement>(".rt-ds-toast"));
    const hidden = el.closest('[aria-hidden="true"]');
    if (hidden)
      throw new Error(`a toast raised under a modal must not sit inside aria-hidden; the hidden ancestor is <${hidden.tagName.toLowerCase()} class="${hidden.className}">`);

    // Pointer: the toast paints above the scrim, so the hit test at Undo's centre lands on Undo.
    const undo = Array.from(el.querySelectorAll<HTMLElement>("button")).find((b) => b.textContent === "Undo");
    if (!undo) throw new Error("precondition: the Undo action should render in the toast");
    const centre = () => {
      const r = undo.getBoundingClientRect();
      return { x: r.x + r.width / 2, y: r.y + r.height / 2 };
    };
    let hit: Element | null = null;
    await waitFor(() => {
      const { x, y } = centre();
      hit = document.elementFromPoint(x, y);
      return hit != null && undo.contains(hit);
    }).catch(() => {
      const at = hit as Element | null;
      throw new Error(`a toast raised under a modal must paint above the scrim; the hit test at Undo returned <${at?.tagName.toLowerCase()} class="${at?.getAttribute("class")}">`);
    });

    // And a click there runs Undo, and the dialog stays open (the rail is a Radix dismiss branch).
    const dialog = document.querySelector<HTMLElement>('[role="dialog"]')!;
    const { x, y } = centre();
    const clicked = clickAt(x, y);
    await waitFor(() => underModalUndo.runs > 0, 1000).catch(() => {
      throw new Error(`a click at Undo on a toast raised under a modal must run Undo; it reached <${clicked.tagName.toLowerCase()} class="${clicked.getAttribute("class")}"> and Undo ran ${underModalUndo.runs} times`);
    });
    await sleep(150);
    if (underModalUndo.runs !== 1) throw new Error(`one click at Undo must run Undo once; it ran ${underModalUndo.runs} times`);
    if (!dialog.isConnected || dialog.getAttribute("data-state") !== "open")
      throw new Error(`a click at Undo on a toast must leave the modal open; the dialog is ${dialog.isConnected ? `data-state="${dialog.getAttribute("data-state")}"` : "unmounted"}`);
  },
};
