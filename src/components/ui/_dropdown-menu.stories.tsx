import type { Meta, StoryObj } from "@storybook/react-vite";
import { DotsThree, PencilSimple, Copy, Archive, Trash } from "@phosphor-icons/react";
import { DropdownMenu } from "./DropdownMenu";
import { IconButton } from "./IconButton";
import { toHex } from "./_storyKit";

/* Test-only behavior for DropdownMenu — kept OUT of the docs stories (System/DropdownMenu) so viewing a
   docs page doesn't briefly drive the menu (the play sets/removes data-highlighted → a flash on the
   danger row). Underscore-prefixed file → registry-guard-exempt, grouped under _internal. */

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
function tokenHex(el: Element, name: string): string {
  const probe = document.createElement("span");
  el.appendChild(probe);
  probe.style.color = `var(${name})`;
  const hex = toHex(getComputedStyle(probe).color);
  probe.remove();
  return hex;
}

const meta: Meta<typeof DropdownMenu.Root> = {
  title: "_internal/DropdownMenu behavior",
  component: DropdownMenu.Root,
  parameters: { controls: { disable: true } },
};
export default meta;
type Story = StoryObj<typeof DropdownMenu.Root>;

/** [[destructive-tone]] danger item paint — error text at rest, weak error tint on highlight, disabled greys — plus the
 *  overlay opening AND closing on our motion scale (--ds-duration-overlay in, --ds-duration-emphasis out). */
export const Danger: Story = {
  render: () => (
    <DropdownMenu.Root defaultOpen modal={false}>
      <DropdownMenu.Trigger>
        <IconButton priority="secondary" aria-label="Project actions">
          <DotsThree weight="bold" />
        </IconButton>
      </DropdownMenu.Trigger>
      <DropdownMenu.Content>
        <DropdownMenu.Item><PencilSimple /> Edit</DropdownMenu.Item>
        <DropdownMenu.Item><Copy /> Duplicate</DropdownMenu.Item>
        <DropdownMenu.Item><Archive /> Archive</DropdownMenu.Item>
        <DropdownMenu.Separator />
        <DropdownMenu.Item tone="danger"><Trash /> Delete project</DropdownMenu.Item>
        <DropdownMenu.Item tone="danger" disabled><Trash /> Delete workspace</DropdownMenu.Item>
      </DropdownMenu.Content>
    </DropdownMenu.Root>
  ),
  play: async () => {
    const menu = await waitFor(() => document.querySelector<HTMLElement>('[role="menu"]'));
    const errHex = tokenHex(menu, "--ds-text-error");
    const weakHex = tokenHex(menu, "--ds-fill-error-weak");

    // The enabled danger item is error text at rest.
    const del = menu.querySelector<HTMLElement>('[data-tone="danger"]:not([data-disabled])');
    if (!del) throw new Error("menu must render an enabled danger item");
    if (toHex(getComputedStyle(del).color) !== errHex)
      throw new Error(`danger item text must resolve --ds-text-error; got ${toHex(getComputedStyle(del).color)} vs ${errHex}`);

    // On highlight it gains the weak error tint (test the [[destructive-tone]] paint deterministically).
    del.setAttribute("data-highlighted", "");
    await sleep(0);
    if (toHex(getComputedStyle(del).backgroundColor) !== weakHex)
      throw new Error(`highlighted danger item must resolve --ds-fill-error-weak; got ${toHex(getComputedStyle(del).backgroundColor)} vs ${weakHex}`);
    del.removeAttribute("data-highlighted");

    // A disabled danger item keeps Radix's dimmed treatment — NOT the error colour.
    const disabled = menu.querySelector<HTMLElement>('[data-tone="danger"][data-disabled]');
    if (!disabled) throw new Error("menu must render a disabled danger item");
    if (toHex(getComputedStyle(disabled).color) === errHex)
      throw new Error("a disabled danger item must grey out, not paint error");

    // Motion IN: the overlay opens on OUR scale (--ds-duration-overlay), not Radix's own timing.
    const toMs = (v: string) => (v.trim().endsWith("ms") ? parseFloat(v) : parseFloat(v) * 1000);
    const wantIn = toMs(getComputedStyle(menu).getPropertyValue("--ds-duration-overlay"));
    const gotIn = toMs(getComputedStyle(menu).animationDuration.split(",")[0]);
    if (Math.abs(gotIn - wantIn) > 1)
      throw new Error(`menu open animation must use --ds-duration-overlay (${wantIn}ms); got ${gotIn}ms`);

    // Motion OUT — the ambient tier leaves SLOWER than it arrives, and the exit has to be a REAL
    // animation. A duration on a nameless animation is dead CSS: the surface blinks out of existence
    // while the stylesheet claims it eases away, and a duration-only assertion passes anyway. That
    // exact defect shipped on three floating surfaces and survived every gate, so this checks the
    // name, that an animation is actually running, and that the node outlives the animation it
    // declares (Radix's Presence unmounts on animationend, so a truncated exit shows up as a node
    // that vanishes early).
    const wantOut = toMs(getComputedStyle(menu).getPropertyValue("--ds-duration-emphasis"));
    menu.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
    await waitFor(() => menu.getAttribute("data-state") === "closed");
    const closedAt = performance.now();

    const exitCs = getComputedStyle(menu);
    const exitName = exitCs.animationName.trim();
    if (!exitName || exitName === "none")
      throw new Error("the closing menu declares no animation-name — a duration alone is dead CSS and the menu would blink out, not leave");
    const gotOut = toMs(exitCs.animationDuration.split(",")[0]);
    if (Math.abs(gotOut - wantOut) > 1)
      throw new Error(`menu close animation must use --ds-duration-emphasis (${wantOut}ms); got ${gotOut}ms`);
    // The named keyframes must EXIST — a name pointing at nothing produces no animation at all.
    // (Skipped under reduced motion, where the ~0.01ms exit is already over by this line.)
    if (gotOut > 50 && !menu.getAnimations().some((a) => a.playState === "running"))
      throw new Error(`the closing menu names '${exitName}' but no animation is running — the keyframes do not resolve`);

    // Survival: the exit has to actually PLAY. Sampled at the midpoint of the declared duration rather
    // than at its endpoint — Radix's Presence unmounts on animationend, so the end of the animation and
    // the removal of the node are the same instant, and a wall-clock check there races itself. A surface
    // that blinks out (the dead-CSS failure) is long gone by this checkpoint.
    // (Skipped under reduced motion, where the whole exit is ~0.01ms by design.)
    if (gotOut > 50) {
      await sleep(Math.round(gotOut / 2));
      if (!menu.isConnected)
        throw new Error(`the menu vanished ${Math.round(performance.now() - closedAt)}ms into a ${gotOut}ms exit — the exit animation is not playing`);
      if (!menu.getAnimations().some((a) => a.playState === "running"))
        throw new Error(`the menu exit stopped early — no animation still running halfway through a ${gotOut}ms exit`);
    }
    // …and it does eventually leave.
    await waitFor(() => !menu.isConnected, 3000);
  },
};

/* THE CLICK ASSISTIVE TECHNOLOGY SENDS (Radix #1963, #2700). VoiceOver's VO+Space in Safari and
   Firefox and NVDA's browse-mode Enter send a click with no pointerdown before it. Radix's trigger has
   no click handler, so that click left the menu closed. The system's Root and Trigger add a
   click-to-toggle path that stands aside when a pointer gesture already toggled, so every path below
   must open the menu exactly once. The menu is modal, the default, because a modal menu is the case
   where a pointer gesture's own click never reaches the trigger. */
const openChanges: boolean[] = [];

function bareClick(el: HTMLElement) {
  el.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true, detail: 0 }));
}
function mousePress(el: HTMLElement) {
  const init: PointerEventInit = { bubbles: true, cancelable: true, button: 0, pointerId: 1, pointerType: "mouse", isPrimary: true };
  el.dispatchEvent(new PointerEvent("pointerdown", init));
  el.dispatchEvent(new PointerEvent("pointerup", init));
  // A modal menu's click lands elsewhere in a browser. Sending it to the trigger is the harder case,
  // because a trigger that toggled on it would close the menu the pointerdown just opened.
  el.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true, detail: 1, button: 0 }));
}
function press(el: HTMLElement, key: string) {
  el.focus();
  const down = new KeyboardEvent("keydown", { key, bubbles: true, cancelable: true });
  el.dispatchEvent(down);
  // A browser turns an Enter or Space on a button into a click unless keydown prevented it. Modelled
  // here, so a trigger that let that click through would open the menu and then close it.
  if (!down.defaultPrevented) bareClick(el);
  el.dispatchEvent(new KeyboardEvent("keyup", { key, bubbles: true, cancelable: true }));
}

export const AssistiveClick: Story = {
  render: () => (
    <DropdownMenu.Root onOpenChange={(open) => { openChanges.push(open); }}>
      <DropdownMenu.Trigger>
        <IconButton priority="secondary" aria-label="Project actions">
          <DotsThree weight="bold" />
        </IconButton>
      </DropdownMenu.Trigger>
      <DropdownMenu.Content>
        <DropdownMenu.Item><PencilSimple /> Edit</DropdownMenu.Item>
        <DropdownMenu.Item><Copy /> Duplicate</DropdownMenu.Item>
      </DropdownMenu.Content>
    </DropdownMenu.Root>
  ),
  play: async ({ canvasElement }) => {
    const trigger = canvasElement.querySelector<HTMLElement>('button[aria-label="Project actions"]');
    if (!trigger) throw new Error("the trigger must render");
    // Long enough for a second, unwanted toggle to land, and for the gesture mark to clear.
    const settle = () => sleep(60);
    const expectOpenOnce = (how: string, want: string) => {
      const open = document.querySelectorAll('[role="menu"][data-state="open"]').length;
      const expanded = trigger.getAttribute("aria-expanded");
      if (openChanges.join() !== want || open !== 1 || expanded !== "true")
        throw new Error(
          `${how} must open the menu exactly once (Radix #1963): onOpenChange saw [${openChanges.join()}], want [${want}], ` +
          `${open} open menu(s), aria-expanded=${expanded}`,
        );
    };
    const close = async () => {
      document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
      await waitFor(() => !document.querySelector('[role="menu"]'), 3000);
    };

    const paths: [string, () => void][] = [
      ["a bare click (detail 0, no pointerdown)", () => bareClick(trigger)],
      ["element.click()", () => trigger.click()],
      ["a mouse press", () => mousePress(trigger)],
      ["Enter", () => press(trigger, "Enter")],
      ["Space", () => press(trigger, " ")],
    ];
    for (const [how, act] of paths) {
      openChanges.length = 0;
      act();
      await settle();
      expectOpenOnce(how, "true");
      await close();
    }

    // A mouse open, then Escape, then a bare click reopens it. The gesture mark from the mouse press
    // must not outlive its own gesture and swallow the next assistive click.
    openChanges.length = 0;
    mousePress(trigger);
    await settle();
    await close();
    bareClick(trigger);
    await settle();
    expectOpenOnce("a bare click after a mouse open and Escape", "true,false,true");
    await close();
  },
};
