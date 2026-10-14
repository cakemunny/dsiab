import { createRef, useEffect, useState } from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { Box, Flex } from "@radix-ui/themes";
import { Heart } from "@phosphor-icons/react";
import { Overlay } from "./Overlay";
import { IconButton } from "./IconButton";
import { MoreMenu } from "./MoreMenu";
import { DropdownMenu } from "./DropdownMenu";
import { parseColor } from "../../foundations/_assert";

/* Test-only behavior for Overlay — kept OUT of the docs stories (System/Overlay) so viewing a docs
   page never drives a reveal (these plays focus inner actions, toggle the scrim, and animate opacity →
   a flash on view). Underscore-prefixed file → registry-guard-exempt, grouped under _internal.

   The load-bearing assertion is KEYBOARD REACHABILITY: an inner action stays focusable when the scrim
   is hidden (opacity-based reveal, never display:none / visibility:hidden — both of which make
   .focus() a no-op and drop the action from the tab order + a11y tree). */

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
const toMs = (v: string) => (v.trim().endsWith("ms") ? parseFloat(v) : parseFloat(v) * 1000);
const opacityOf = (el: Element) => parseFloat(getComputedStyle(el).opacity);

// Read a --ds-* token's live rendered hex off a probe span (drift guard; never a hand-typed hex).
function toHex(color: string): string {
  const ctx = document.createElement("canvas").getContext("2d", { willReadFrequently: true })!;
  ctx.fillStyle = color;
  ctx.fillRect(0, 0, 1, 1);
  const [r, g, b, a] = ctx.getImageData(0, 0, 1, 1).data;
  const h = (n: number) => n.toString(16).padStart(2, "0");
  return `#${h(r)}${h(g)}${h(b)}${a < 255 ? h(a) : ""}`;
}
function tokenHex(el: Element, name: string): string {
  const probe = document.createElement("span");
  el.appendChild(probe);
  probe.style.color = `var(${name})`;
  const hex = toHex(getComputedStyle(probe).color);
  probe.remove();
  return hex;
}

const Media = () => <div role="img" aria-label="Sample media" style={{ width: 240, height: 150, background: "linear-gradient(135deg, var(--accent-6), var(--accent-9))" }} />;

const meta: Meta<typeof Overlay> = {
  title: "_internal/Overlay behavior",
  component: Overlay,
  parameters: { controls: { disable: true } },
};
export default meta;
type Story = StoryObj<typeof Overlay>;

/** Reveal-on-focus + the reveal motion token. With showOn="hover-or-focus" the scrim is hidden at
 *  rest and reveals when an inner action is focused; the reveal rides --ds-duration-moderate. */
export const RevealOnFocus: Story = {
  render: () => (
    <Box p="5">
      <Overlay showOn="hover-or-focus" position="bottom" media={<Media />}>
        <IconButton priority="secondary" aria-label="Save to favourites"><Heart /></IconButton>
      </Overlay>
    </Box>
  ),
  play: async ({ canvasElement }) => {
    const overlay = canvasElement.querySelector<HTMLElement>(".rt-ds-overlay")!;
    const scrim = overlay.querySelector<HTMLElement>(".rt-ds-overlay-scrim")!;
    const action = overlay.querySelector<HTMLButtonElement>("button")!;
    if (!scrim || !action) throw new Error("behavior story must render a scrim + an inner action");

    // (1) hidden at rest — opacity ~0, but the action is still in the DOM (not removed).
    if (opacityOf(scrim) > 0.1)
      throw new Error(`scrim must be hidden at rest (opacity ~0); got ${getComputedStyle(scrim).opacity}`);

    // (2) focusing an inner action reveals the scrim (:focus-within).
    action.focus();
    await waitFor(() => opacityOf(scrim) > 0.9);

    // (3) the reveal rides OUR moderate tier (--ds-duration-moderate), read live off the revealed node —
    //     proving the components.css transition is wired to the token, not a hardcoded ms (and reduced
    //     motion, which clamps the same token to ~0, is honored structurally).
    const wantMs = toMs(getComputedStyle(scrim).getPropertyValue("--ds-duration-moderate"));
    const gotMs = toMs(getComputedStyle(scrim).transitionDuration.split(",")[0]);
    if (Math.abs(gotMs - wantMs) > 1)
      throw new Error(`reveal transition must use --ds-duration-moderate (${wantMs}ms); got ${gotMs}ms`);

    // (4) blur hides it again.
    action.blur();
    await waitFor(() => opacityOf(scrim) < 0.1);
  },
};

/** THE load-bearing a11y assertion — keyboard reachability. Even in showOn="hover" (hover can't fire
 *  in a headless play), the inner action stays focusable (opacity reveal, never display:none /
 *  visibility:hidden), and focusing it reveals the scrim (the :focus-within a11y net, every mode).
 *  The scrim resolves --ds-scrim by hex. */
export const KeyboardReachable: Story = {
  render: () => (
    <Box p="5">
      <Overlay showOn="hover" position="bottom" media={<Media />}>
        <IconButton priority="secondary" aria-label="Expand"><Heart /></IconButton>
      </Overlay>
    </Box>
  ),
  play: async ({ canvasElement }) => {
    const overlay = canvasElement.querySelector<HTMLElement>(".rt-ds-overlay")!;
    const scrim = overlay.querySelector<HTMLElement>(".rt-ds-overlay-scrim")!;
    const action = overlay.querySelector<HTMLButtonElement>("button")!;

    // scrim hidden at rest (hover can't fire here) — the action is invisible but must NOT be gone.
    if (opacityOf(scrim) > 0.1)
      throw new Error(`scrim must be hidden at rest in hover mode; got opacity ${getComputedStyle(scrim).opacity}`);

    // (1) THE PROOF: the action is keyboard-focusable while the scrim is hidden. .focus() is a no-op on
    //     a display:none / visibility:hidden element (activeElement would stay <body>), so landing focus
    //     on it proves the reveal keeps actions in the tab order + a11y tree.
    action.focus();
    if (document.activeElement !== action)
      throw new Error("inner action must be keyboard-focusable while the scrim is hidden (opacity reveal, not display:none/visibility:hidden)");

    // (2) focusing it reveals the scrim even in hover mode — the :focus-within a11y net (a focused
    //     action must never be invisible, WCAG 2.4.7).
    await waitFor(() => opacityOf(scrim) > 0.9);

    // (3) the scrim paints --ds-scrim (accent/appearance-aware), read live off the DOM.
    const got = toHex(getComputedStyle(scrim).backgroundColor);
    const want = tokenHex(scrim, "--ds-scrim");
    if (got !== want) throw new Error(`scrim background must resolve --ds-scrim; got ${got} vs ${want}`);
  },
};

const pressEscape = () =>
  (document.activeElement ?? document.body).dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }));

/** Escape dismisses a hover-revealed veil (WCAG 1.4.13). A real CSS :hover cannot be driven in a headless play,
 *  so the play drives the pointer events Overlay listens to and checks the state the hover rules key on:
 *  Escape sets data-dismissed, the hover reveal selector then stops matching, and pointer leave clears it. */
export const EscapeDismissesHover: Story = {
  render: () => (
    <Box p="5">
      <Overlay showOn="hover-or-focus" position="bottom" media={<Media />}>
        <IconButton priority="secondary" aria-label="Save to favourites"><Heart /></IconButton>
      </Overlay>
    </Box>
  ),
  play: async ({ canvasElement }) => {
    const overlay = canvasElement.querySelector<HTMLElement>(".rt-ds-overlay")!;
    // React derives enter and leave from pointerover and pointerout. A null relatedTarget reads as a pointer
    // arriving from, or leaving to, outside the page, which reaches onPointerEnter and onPointerLeave.
    const pointer = { bubbles: true, relatedTarget: null, pointerId: 1, pointerType: "mouse" };
    overlay.dispatchEvent(new PointerEvent("pointerover", pointer));
    await sleep(20);
    pressEscape();
    await waitFor(() => overlay.getAttribute("data-dismissed") === "true").catch(() => {
      throw new Error("Escape with the pointer over the Overlay must set data-dismissed");
    });
    if (overlay.matches('[data-show-on="hover-or-focus"]:not([data-dismissed])'))
      throw new Error("a dismissed Overlay must fall out of the hover reveal rule");
    overlay.dispatchEvent(new PointerEvent("pointerout", pointer));
    await waitFor(() => !overlay.hasAttribute("data-dismissed")).catch(() => {
      throw new Error("the pointer leaving the Overlay must clear data-dismissed, so the next hover reveals again");
    });
  },
};

/** Escape with focus inside: the veil turns transparent and every action except the focused one hides, so the
 *  focused control stays visible with its ring (WCAG 1.4.13 and 2.4.7). A move between actions inside keeps the
 *  state, and focus leaving the Overlay clears it. */
const callerRef = createRef<HTMLDivElement>();
export const EscapeWithFocusInside: Story = {
  render: () => (
    <Box p="5">
      <button type="button" data-testid="before">Before</button>
      <Overlay ref={callerRef} showOn="hover-or-focus" position="top" media={<Media />}>
        <Flex gap="2" justify="end" width="100%">
          <IconButton priority="secondary" aria-label="Expand"><Heart /></IconButton>
          <IconButton priority="secondary" tone="danger" aria-label="Download"><Heart /></IconButton>
        </Flex>
      </Overlay>
    </Box>
  ),
  play: async ({ canvasElement }) => {
    const overlay = canvasElement.querySelector<HTMLElement>(".rt-ds-overlay")!;
    const scrim = overlay.querySelector<HTMLElement>(".rt-ds-overlay-scrim")!;
    const [expand, download] = [...overlay.querySelectorAll<HTMLButtonElement>("button")];
    const visible = (el: Element) => {
      for (let n: Element | null = el; n && n !== overlay; n = n.parentElement) if (opacityOf(n) < 0.9) return false;
      return true;
    };
    const veilAlpha = () => parseColor(getComputedStyle(scrim).backgroundColor).a;

    // Each action's own border, read before any dismissal. The plate must leave both untouched.
    const ownBorder = new Map<HTMLElement, string>([expand, download].map((b) => [b, getComputedStyle(b).boxShadow]));
    expand.focus();
    await waitFor(() => opacityOf(scrim) > 0.9 && veilAlpha() > 0.1);
    pressEscape();
    await waitFor(() => overlay.getAttribute("data-dismissed") === "true").catch(() => {
      throw new Error("Escape with focus inside the Overlay must set data-dismissed");
    });
    await waitFor(() => veilAlpha() < 0.01).catch(() => {
      throw new Error(`a dismissed veil held by focus must turn transparent; background is ${getComputedStyle(scrim).backgroundColor}`);
    });
    if (!visible(expand)) throw new Error("the focused action must stay visible after Escape (WCAG 2.4.7)");
    await waitFor(() => opacityOf(download) < 0.1).catch(() => {
      throw new Error(`an action without focus must hide after Escape; its opacity is ${getComputedStyle(download).opacity}`);
    });

    // The ring keeps a hollow plate of the veil's colour behind it, so it holds 3:1 over any media. The plate is its
    // own element, 6px around the focused action, and the action keeps the border it draws itself.
    const wantPlate = parseColor(getComputedStyle(scrim).getPropertyValue("--ds-scrim"));
    const checkPlate = async (target: HTMLElement) => {
      const plateEl = await waitFor(() => overlay.querySelector<HTMLElement>(".rt-ds-overlay-plate")).catch(() => {
        throw new Error("a dismissed Overlay with focus inside must place a plate behind the focused action");
      });
      const ps = getComputedStyle(plateEl!);
      const got = parseColor(ps.borderTopColor);
      if (ps.borderTopWidth !== "6px" || Math.abs(got.r - wantPlate.r) > 2 || Math.abs(got.g - wantPlate.g) > 2 || Math.abs(got.b - wantPlate.b) > 2 || Math.abs(got.a - wantPlate.a) > 0.02)
        throw new Error(`the plate must be a 6px border of --ds-scrim; got ${ps.borderTopWidth} ${ps.borderTopColor}`);
      const p = plateEl!.getBoundingClientRect(), r = target.getBoundingClientRect();
      if ([p.left - (r.left - 6), p.top - (r.top - 6), p.right - (r.right + 6), p.bottom - (r.bottom + 6)].some((d) => Math.abs(d) > 0.5))
        throw new Error(`the plate must sit 6px around the focused action; plate ${JSON.stringify(p)}, action ${JSON.stringify(r)}`);
      if (getComputedStyle(target).boxShadow !== ownBorder.get(target))
        throw new Error(`the plate must leave the action's own border alone; before "${ownBorder.get(target)}", after "${getComputedStyle(target).boxShadow}"`);
    };
    await checkPlate(expand);

    // The transparent veil passes clicks to the media, and the focused action still takes them.
    if (getComputedStyle(scrim).pointerEvents !== "none") throw new Error("the transparent veil must not catch clicks meant for the media");
    const r = expand.getBoundingClientRect();
    const hit = document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2);
    if (!hit || !expand.contains(hit)) throw new Error(`the focused action must still take the click; the hit test found <${hit?.tagName.toLowerCase()}>`);

    // A caller's ref reaches the root, and the internal one still works (the focus move below depends on it).
    if (callerRef.current !== overlay) throw new Error("a ref passed to Overlay must reach its root element");

    // A move to the other action keeps the dismissal, and that action is now the visible one.
    download.focus();
    await sleep(20);
    if (overlay.getAttribute("data-dismissed") !== "true") throw new Error("a focus move inside the Overlay must keep it dismissed");
    await waitFor(() => visible(download) && opacityOf(expand) < 0.1).catch(() => {
      throw new Error("after a focus move inside, the newly focused action must show and the other must hide");
    });
    // The plate follows focus, and the danger action keeps its red border under it.
    await waitFor(() => {
      const p = overlay.querySelector(".rt-ds-overlay-plate")?.getBoundingClientRect();
      return p && Math.abs(p.left - (download.getBoundingClientRect().left - 6)) < 0.5;
    });
    await checkPlate(download);

    // Focus leaving the Overlay clears the state.
    canvasElement.querySelector<HTMLButtonElement>('[data-testid="before"]')!.focus();
    await waitFor(() => !overlay.hasAttribute("data-dismissed")).catch(() => {
      throw new Error("focus leaving the Overlay must clear data-dismissed");
    });
    if (overlay.querySelector(".rt-ds-overlay-plate")) throw new Error("the plate must go once the dismissal clears");
  },
};

/** A dismissal lasts until the user leaves the Overlay entirely (WCAG 1.4.13, persistent). With focus inside,
 *  the pointer leaving keeps it, and focus leaving afterwards clears it. In focus-only mode a hover alone does
 *  not arm Escape, and an Escape that a layer inside already handled leaves the veil alone. */
export const EscapePersistsAndGuards: Story = {
  render: () => (
    <Box p="5">
      <button type="button" data-testid="outside">Outside</button>
      <Overlay data-testid="both" showOn="hover-or-focus" position="bottom" media={<Media />}>
        <IconButton priority="secondary" aria-label="Save"><Heart /></IconButton>
      </Overlay>
      <Overlay data-testid="focus-only" showOn="focus" position="bottom" media={<Media />}>
        <IconButton priority="secondary" aria-label="Share"><Heart /></IconButton>
      </Overlay>
    </Box>
  ),
  play: async ({ canvasElement }) => {
    const pointer = { bubbles: true, relatedTarget: null, pointerId: 1, pointerType: "mouse" };
    const outside = canvasElement.querySelector<HTMLButtonElement>('[data-testid="outside"]')!;

    // Pointer and focus inside, Escape, then the pointer leaves: still dismissed. Then focus leaves: cleared.
    const both = canvasElement.querySelector<HTMLElement>('[data-testid="both"]')!;
    both.dispatchEvent(new PointerEvent("pointerover", pointer));
    both.querySelector("button")!.focus();
    await sleep(20);
    pressEscape();
    await waitFor(() => both.getAttribute("data-dismissed") === "true");
    both.dispatchEvent(new PointerEvent("pointerout", pointer));
    await sleep(60);
    if (both.getAttribute("data-dismissed") !== "true")
      throw new Error("the pointer leaving while focus stays inside must keep the Overlay dismissed (WCAG 1.4.13, persistent)");
    outside.focus();
    await waitFor(() => !both.hasAttribute("data-dismissed")).catch(() => {
      throw new Error("once both the pointer and focus have left, the dismissal must clear");
    });

    // An Escape a layer inside already handled (defaultPrevented) leaves the veil alone.
    both.querySelector("button")!.focus();
    await sleep(20);
    const handled = (e: KeyboardEvent) => e.preventDefault();
    window.addEventListener("keydown", handled, { capture: true });
    try {
      (document.activeElement ?? document.body).dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true, cancelable: true }));
      await sleep(60);
    } finally {
      window.removeEventListener("keydown", handled, { capture: true });
    }
    if (both.hasAttribute("data-dismissed")) throw new Error("an Escape a layer inside already handled must not dismiss the veil");
    outside.focus();
    await sleep(20);

    // Focus-only mode: a hover shows nothing, so Escape while hovering must not arm a dismissal in advance.
    const focusOnly = canvasElement.querySelector<HTMLElement>('[data-testid="focus-only"]')!;
    focusOnly.dispatchEvent(new PointerEvent("pointerover", pointer));
    await sleep(20);
    pressEscape();
    await sleep(60);
    if (focusOnly.hasAttribute("data-dismissed")) throw new Error("in focus-only mode a hover alone must not arm Escape");
    focusOnly.dispatchEvent(new PointerEvent("pointerout", pointer));
  },
};

let removeAction: (() => void) | null = null;
function RemovableAction() {
  const [shown, setShown] = useState(true);
  useEffect(() => {
    removeAction = () => setShown(false);
    return () => {
      removeAction = null;
    };
  }, []);
  return shown ? <IconButton priority="secondary" aria-label="Archive"><Heart /></IconButton> : null;
}

/** Two ways focus leaves without the usual blur into the page. A focused action removed from the page fires no blur,
 *  and the dismissal must still clear. Focus moving into a menu opened from inside leaves the Overlay's DOM for a
 *  portal, and the dismissal must survive it and the Escape that closes the menu. */
export const EscapeFocusEdges: Story = {
  render: () => (
    <Box p="5">
      <button type="button" data-testid="outside">Outside</button>
      <Overlay data-testid="removable" showOn="hover-or-focus" position="bottom" media={<Media />}>
        <RemovableAction />
      </Overlay>
      <Overlay data-testid="portal" showOn="hover-or-focus" position="bottom" media={<Media />}>
        <MoreMenu label="More" priority="secondary" modal={false}>
          <DropdownMenu.Item>Rename</DropdownMenu.Item>
        </MoreMenu>
      </Overlay>
    </Box>
  ),
  play: async ({ canvasElement }) => {
    const removable = canvasElement.querySelector<HTMLElement>('[data-testid="removable"]')!;
    removable.querySelector("button")!.focus();
    await sleep(20);
    pressEscape();
    await waitFor(() => removable.getAttribute("data-dismissed") === "true");
    await waitFor(() => removable.querySelector(".rt-ds-overlay-plate"));
    removeAction!();
    await waitFor(() => !removable.hasAttribute("data-dismissed")).catch(() => {
      throw new Error("a focused action removed from the page must clear the dismissal, because focus has left");
    });
    if (removable.querySelector(".rt-ds-overlay-plate")) throw new Error("the plate must go with the removed action");

    const portal = canvasElement.querySelector<HTMLElement>('[data-testid="portal"]')!;
    const trigger = portal.querySelector<HTMLButtonElement>('button[aria-label="More"]')!;
    trigger.focus();
    await sleep(20);
    pressEscape();
    await waitFor(() => portal.getAttribute("data-dismissed") === "true");
    trigger.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", bubbles: true, cancelable: true }));
    await waitFor(() => document.activeElement?.closest('[role="menu"]')).catch(() => {
      throw new Error(`Enter on the trigger must open the menu and move focus into it; focus is on <${document.activeElement?.tagName.toLowerCase()}>`);
    });
    await sleep(60);
    if (portal.getAttribute("data-dismissed") !== "true")
      throw new Error("focus moving into a menu opened from inside the Overlay must keep it dismissed");
    // The menu's own Escape closes the menu only, and focus returns to the trigger with the dismissal intact.
    (document.activeElement ?? document.body).dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true, cancelable: true }));
    await waitFor(() => document.activeElement === trigger).catch(() => {
      throw new Error("Escape in the menu must close it and return focus to the trigger");
    });
    await sleep(60);
    if (portal.getAttribute("data-dismissed") !== "true")
      throw new Error("closing the menu with Escape must leave the Overlay dismissed");
    canvasElement.querySelector<HTMLButtonElement>('[data-testid="outside"]')!.focus();
    await waitFor(() => !portal.hasAttribute("data-dismissed")).catch(() => {
      throw new Error("focus leaving to the page must clear the dismissal");
    });
  },
};

/** Tap-to-toggle on a simulated (hover: none) device. matchMedia is stubbed to
 *  report a coarse pointer for the duration of the play; a tap on the media then toggles the scrim. */
export const TapToggle: Story = {
  render: () => (
    <Box p="5">
      <Overlay showOn="hover" position="bottom" media={<Media />}>
        <IconButton priority="secondary" aria-label="Save"><Heart /></IconButton>
      </Overlay>
    </Box>
  ),
  play: async ({ canvasElement }) => {
    const overlay = canvasElement.querySelector<HTMLElement>(".rt-ds-overlay")!;
    const mediaEl = overlay.querySelector<HTMLElement>('[role="img"]')!;

    if (overlay.getAttribute("data-tapped")) throw new Error("scrim must start un-tapped");

    // Simulate a no-hover (touch) device: matchMedia("(hover: none)") → matches:true, for this play only.
    const orig = window.matchMedia;
    window.matchMedia = ((q: string) => ({
      matches: /hover:\s*none/.test(q),
      media: q,
      onchange: null,
      addEventListener() {}, removeEventListener() {},
      addListener() {}, removeListener() {},
      dispatchEvent: () => false,
    })) as typeof window.matchMedia;
    try {
      // A tap on the media (not on the action) toggles the scrim on… (await the React re-render).
      mediaEl.click();
      await waitFor(() => overlay.getAttribute("data-tapped") === "true", 800).catch(() => {
        throw new Error("a tap on a (hover: none) device must toggle the scrim ON (data-tapped='true')");
      });
      await waitFor(() => opacityOf(overlay.querySelector(".rt-ds-overlay-scrim")!) > 0.9);

      // …and a second tap toggles it back off.
      mediaEl.click();
      await waitFor(() => !overlay.getAttribute("data-tapped"), 800).catch(() => {
        throw new Error("a second tap must toggle the scrim OFF (data-tapped removed)");
      });
    } finally {
      window.matchMedia = orig;
    }
  },
};
