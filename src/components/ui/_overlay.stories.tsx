import type { Meta, StoryObj } from "@storybook/react-vite";
import { Box } from "@radix-ui/themes";
import { Heart } from "@phosphor-icons/react";
import { Overlay } from "./Overlay";
import { IconButton } from "./IconButton";

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
