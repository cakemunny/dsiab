import type { Meta, StoryObj } from "@storybook/react-vite";
import { Flex } from "@radix-ui/themes";
import { Tag } from "@phosphor-icons/react";
import { Token } from "./Token";

/* Test-only behavior for Token — kept OUT of the docs stories (System/Token) so viewing a docs page
   doesn't drive the chip (a play clicks / removes it). Underscore-prefixed file → registry- and
   story-order-guard-exempt, grouped under _internal. Covers Token's a11y with the sibling-remove
   structure (the body and the ✕ are valid-HTML SIBLINGS, never nested). */

const press = (el: Element, key: string, opts: KeyboardEventInit = {}) =>
  el.dispatchEvent(new KeyboardEvent("keydown", { key, bubbles: true, cancelable: true, ...opts }));
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
// Read a spy counter through a widening boundary — the handlers mutate these objects from OUTSIDE the
// play (in the render), which TS can't see, so it would otherwise narrow a just-reset `0` to the literal.
const read = (n: number): number => n;

const meta: Meta<typeof Token> = {
  title: "_internal/Token behavior",
  component: Token,
  parameters: { controls: { disable: true } },
};
export default meta;
type Story = StoryObj<typeof Token>;

/** Structure + a11y: exactly two focusables, NONE nested (no button-in-button / button-in-anchor); the
 *  ✕ is a SIBLING of the body; the ✕ is named `Remove {label}`; the href mode is a real <a> with the ✕
 *  a sibling of the anchor. */
export const Structure: Story = {
  render: () => (
    <Flex gap="4" p="4" wrap="wrap">
      <Token data-testid="clickable" leadingIcon={<Tag weight="bold" />} onClick={() => {}} onRemove={() => {}}>
        Design
      </Token>
      <Token data-testid="link" href="#docs" onRemove={() => {}}>Docs</Token>
      <Token data-testid="static" onRemove={() => {}}>Static</Token>
    </Flex>
  ),
  play: async ({ canvasElement }) => {
    const clickable = canvasElement.querySelector<HTMLElement>('[data-testid="clickable"]')!;
    const link = canvasElement.querySelector<HTMLElement>('[data-testid="link"]')!;
    const staticChip = canvasElement.querySelector<HTMLElement>('[data-testid="static"]')!;

    // (1) Exactly TWO buttons in a clickable+removable chip: the invisible body button + the remove ✕.
    const buttons = Array.from(clickable.querySelectorAll("button"));
    if (buttons.length !== 2)
      throw new Error(`a clickable+removable chip must have exactly 2 buttons; got ${buttons.length}`);
    // (2) NO button nested inside another button (nor inside an anchor).
    for (const b of buttons) {
      if (b.querySelector("button")) throw new Error("no button may contain another button");
      if (b.closest("a")) throw new Error("no button may be nested inside an anchor");
    }
    // (3) The body is a real <button type="button">; the ✕ is its SIBLING (same parent), never a child.
    const body = clickable.querySelector<HTMLElement>(".rt-ds-token-body")!;
    if (body.tagName !== "BUTTON" || body.getAttribute("type") !== "button")
      throw new Error("the clickable body must be a native <button type='button'>");
    const x = clickable.querySelector<HTMLButtonElement>("button.rt-IconButton")!;
    if (x.parentElement !== body.parentElement)
      throw new Error("the remove ✕ must be a SIBLING of the body (same parent), not nested in it");
    if (body.contains(x)) throw new Error("the ✕ must not be inside the body");
    // (4) The ✕ is named `Remove {label}` (Badge's default, reused).
    if (x.getAttribute("aria-label") !== "Remove Design")
      throw new Error(`✕ must be named "Remove Design"; got "${x.getAttribute("aria-label")}"`);

    // (5) href mode → a real <a href> with the ✕ a SIBLING (no button-in-anchor — that would be invalid HTML).
    const anchor = link.querySelector<HTMLAnchorElement>("a.rt-ds-token-body")!;
    if (anchor.tagName !== "A" || anchor.getAttribute("href") !== "#docs")
      throw new Error("the link body must be a real <a href>");
    if (anchor.querySelector("button")) throw new Error("no remove button may be nested inside the anchor");
    const xInLink = link.querySelector<HTMLButtonElement>("button.rt-IconButton")!;
    if (xInLink.parentElement !== anchor.parentElement)
      throw new Error("in link mode the ✕ must be a SIBLING of the <a>, not inside it");

    // (6) A static removable chip has ONE focusable (the ✕ only) — its span body isn't a tab stop.
    if (staticChip.querySelector(".rt-ds-token-body")?.tagName !== "SPAN")
      throw new Error("a static body must be a <span>");
    const staticFocusables = staticChip.querySelectorAll("a[href], button");
    if (staticFocusables.length !== 1)
      throw new Error(`a static removable chip must have exactly 1 focusable (the ✕); got ${staticFocusables.length}`);
  },
};

/** Independent focus on the body and the remove ✕ — two separate tab stops (not one). */
export const IndependentFocus: Story = {
  render: () => (
    <Flex gap="4" p="4">
      <Token data-testid="chip" onClick={() => {}} onRemove={() => {}}>Token</Token>
    </Flex>
  ),
  play: async ({ canvasElement }) => {
    const chip = canvasElement.querySelector<HTMLElement>('[data-testid="chip"]')!;
    const body = chip.querySelector<HTMLButtonElement>(".rt-ds-token-body")!;
    const x = chip.querySelector<HTMLButtonElement>("button.rt-IconButton")!;
    body.focus();
    if (document.activeElement !== body) throw new Error("the body must be focusable on its own");
    x.focus();
    if (document.activeElement !== x) throw new Error("the remove ✕ must be focusable independently of the body");
    // Neither steals the other's focusability — two distinct controls.
    if (body === x) throw new Error("the body and the ✕ must be two distinct focusable controls");
  },
};

/** Click + Enter/Space activation + stopPropagation: the body fires onClick; the ✕ fires onRemove and
 *  does NOT also fire the body's onClick. */
const clickSpy = { click: 0, remove: 0 };
export const ClickAndStopPropagation: Story = {
  render: () => (
    <Flex gap="4" p="4">
      <Token
        data-testid="chip"
        onClick={() => { clickSpy.click += 1; }}
        onRemove={() => { clickSpy.remove += 1; }}
      >
        Token
      </Token>
    </Flex>
  ),
  play: async ({ canvasElement }) => {
    clickSpy.click = 0;
    clickSpy.remove = 0;
    const chip = canvasElement.querySelector<HTMLElement>('[data-testid="chip"]')!;
    const body = chip.querySelector<HTMLButtonElement>(".rt-ds-token-body")!;
    const x = chip.querySelector<HTMLButtonElement>("button.rt-IconButton")!;

    // The body is a NATIVE <button>, so Enter/Space activation comes free from the platform (a manually
    // dispatched key event is untrusted and won't trigger the UA default action — the native element type
    // IS the guarantee). We drive the click path directly to prove onClick is wired.
    if (body.tagName !== "BUTTON") throw new Error("body must be a native <button> (Enter/Space activation is free)");
    body.click();
    await sleep(0);
    if (read(clickSpy.click) !== 1) throw new Error(`body click must fire onClick once; got ${clickSpy.click}`);
    if (read(clickSpy.remove) !== 0) throw new Error("a body click must NOT fire onRemove");

    // Clicking the ✕ fires onRemove and does NOT fire the body's onClick (siblings + stopPropagation).
    x.click();
    await sleep(0);
    if (read(clickSpy.remove) !== 1) throw new Error(`the ✕ must fire onRemove once; got ${clickSpy.remove}`);
    if (read(clickSpy.click) !== 1) throw new Error("clicking the ✕ must NOT also fire the body's onClick");
  },
};

/** Backspace/Delete on the focused BODY removes the chip; a non-removal key does not. */
const kbdSpy = { remove: 0 };
export const KeyboardRemove: Story = {
  render: () => (
    <Flex gap="4" p="4">
      <Token data-testid="chip" onClick={() => {}} onRemove={() => { kbdSpy.remove += 1; }}>
        Token
      </Token>
    </Flex>
  ),
  play: async ({ canvasElement }) => {
    kbdSpy.remove = 0;
    const body = canvasElement.querySelector<HTMLButtonElement>('[data-testid="chip"] .rt-ds-token-body')!;
    body.focus();

    // A non-removal key on the body is a no-op.
    press(body, "a");
    await sleep(0);
    if (read(kbdSpy.remove) !== 0) throw new Error("a non-removal key must NOT fire onRemove");

    // Backspace removes.
    press(body, "Backspace");
    await sleep(0);
    if (read(kbdSpy.remove) !== 1) throw new Error(`Backspace on the focused body must fire onRemove; got ${kbdSpy.remove}`);

    // Delete removes too.
    press(body, "Delete");
    await sleep(0);
    if (read(kbdSpy.remove) !== 2) throw new Error(`Delete on the focused body must fire onRemove; got ${kbdSpy.remove}`);
  },
};

/** A non-removable body ignores Backspace/Delete (the `removable` guard). */
const guardSpy = { click: 0 };
export const KeyboardRemoveGuarded: Story = {
  render: () => (
    <Flex gap="4" p="4">
      {/* No onRemove → not removable. Backspace/Delete must no-op (and never throw). */}
      <Token data-testid="chip" onClick={() => { guardSpy.click += 1; }}>Token</Token>
    </Flex>
  ),
  play: async ({ canvasElement }) => {
    guardSpy.click = 0;
    const chip = canvasElement.querySelector<HTMLElement>('[data-testid="chip"]')!;
    const body = chip.querySelector<HTMLButtonElement>(".rt-ds-token-body")!;
    if (chip.querySelector("button.rt-IconButton")) throw new Error("a non-removable token must not render a ✕");
    body.focus();
    press(body, "Backspace"); // must be a silent no-op (guarded by `removable`)
    press(body, "Delete");
    await sleep(0);
    // The chip still stands, and Backspace/Delete did nothing observable.
    if (!chip.isConnected) throw new Error("a non-removable chip must not disappear on Backspace/Delete");
    if (read(guardSpy.click) !== 0) throw new Error("Backspace/Delete must not trigger the body onClick");
  },
};

/** Disabled disables BOTH controls: the body <button> and the ✕ are natively disabled and fire nothing. */
const disabledSpy = { click: 0, remove: 0 };
export const Disabled: Story = {
  render: () => (
    <Flex gap="4" p="4">
      <Token
        data-testid="chip"
        disabled
        onClick={() => { disabledSpy.click += 1; }}
        onRemove={() => { disabledSpy.remove += 1; }}
      >
        Token
      </Token>
    </Flex>
  ),
  play: async ({ canvasElement }) => {
    disabledSpy.click = 0;
    disabledSpy.remove = 0;
    const chip = canvasElement.querySelector<HTMLElement>('[data-testid="chip"]')!;
    const body = chip.querySelector<HTMLButtonElement>(".rt-ds-token-body")!;
    const x = chip.querySelector<HTMLButtonElement>("button.rt-IconButton")!;

    // Both inner controls are natively disabled.
    if (!body.disabled) throw new Error("a disabled Token's body button must be [disabled]");
    if (!x.disabled) throw new Error("a disabled Token's remove ✕ must be [disabled]");
    // A disabled chip drops the interactive paint marker (no hover/press/floor/ring).
    if (chip.getAttribute("data-interactive") != null)
      throw new Error("a disabled Token must NOT carry data-interactive");
    if (chip.getAttribute("data-disabled") !== "")
      throw new Error("a disabled Token must carry data-disabled (Radix's disabled dim)");

    // Clicking either fires nothing (disabled buttons swallow the click).
    body.click();
    x.click();
    await sleep(0);
    if (read(disabledSpy.click) !== 0) throw new Error("a disabled body must not fire onClick");
    if (read(disabledSpy.remove) !== 0) throw new Error("a disabled ✕ must not fire onRemove");
  },
};
