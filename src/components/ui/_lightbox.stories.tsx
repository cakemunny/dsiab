import { useState } from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { Lightbox, type LightboxMedia } from "./Lightbox";
import { Button } from "./Button";
import { assertDisabledPaintDiffers } from "../../foundations/_disabledPaint";

/* Test-only behavior for Lightbox — kept OUT of the docs stories (System/Lightbox). Underscore-prefixed →
   registry- and story-order-guard-exempt, grouped under _internal. Opening a fullscreen portal here is
   fine (the on-view flash concern is a docs-story rule). Covers open/close + Escape, gallery nav +
   disabled-not-unmounted ends, the counter, keyboard zoom (D18 addition), and the polite announcer that
   fires ONLY on an in-session index change. */

async function waitFor<T>(fn: () => T | null | undefined | false, timeout = 3000): Promise<T> {
  const t0 = performance.now();
  for (;;) {
    const v = fn();
    if (v) return v;
    if (performance.now() - t0 > timeout) throw new Error("waitFor: timed out");
    await new Promise((r) => setTimeout(r, 16));
  }
}
const gone = async (sel: string, timeout = 3000) => {
  const t0 = performance.now();
  while (document.querySelector(sel)) {
    if (performance.now() - t0 > timeout) throw new Error(`still present: ${sel}`);
    await new Promise((r) => setTimeout(r, 16));
  }
};

const img = (label: string) =>
  "data:image/svg+xml," +
  encodeURIComponent(`<svg xmlns='http://www.w3.org/2000/svg' width='400' height='300'><rect width='400' height='300' fill='#6d78ff'/><text x='200' y='160' font-size='48' fill='white' text-anchor='middle'>${label}</text></svg>`);

const GALLERY: LightboxMedia[] = [
  { src: img("1"), alt: "Aurora over a lake", caption: "One" },
  { src: img("2"), alt: "Desert dunes at dawn" },
  { src: img("3"), alt: "Turquoise coastline" },
  { src: img("4"), alt: "Cherry blossom canopy" },
];

const meta: Meta<typeof Lightbox> = {
  title: "_internal/Lightbox behavior",
  component: Lightbox,
  parameters: { controls: { disable: true } },
};
export default meta;
type Story = StoryObj<typeof Lightbox>;

function Harness({ media, hasZoom }: { media: LightboxMedia | LightboxMedia[]; hasZoom?: boolean }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button data-testid="open" onClick={() => setOpen(true)}>Open</Button>
      <Lightbox isOpen={open} onOpenChange={setOpen} media={media} hasZoom={hasZoom} />
    </>
  );
}

/** Open via the trigger; the dialog mounts with the media named by alt. Close button dismisses it. */
export const OpensAndCloses: Story = {
  render: () => <Harness media={GALLERY[0]} />,
  play: async ({ canvasElement }) => {
    (canvasElement.querySelector('[data-testid="open"]') as HTMLButtonElement).click();
    const dialog = await waitFor(() => document.querySelector<HTMLElement>(".rt-ds-lightbox"));
    if (dialog.getAttribute("aria-label") !== "Aurora over a lake")
      throw new Error("the dialog must be named by the current item's alt");
    if (!dialog.querySelector("img.rt-ds-lightbox-img")) throw new Error("the media <img> must render");
    // A single item shows no gallery chrome.
    if (dialog.querySelector('[aria-label="Next"]')) throw new Error("a single item must not show gallery nav");
    (document.querySelector('[aria-label="Close"]') as HTMLButtonElement).click();
    await gone(".rt-ds-lightbox");
  },
};

/** Escape closes (Radix Dialog owns it — no duplicate handler). */
export const EscapeCloses: Story = {
  render: () => <Harness media={GALLERY[0]} />,
  play: async ({ canvasElement }) => {
    (canvasElement.querySelector('[data-testid="open"]') as HTMLButtonElement).click();
    await waitFor(() => document.querySelector(".rt-ds-lightbox"));
    document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
    await gone(".rt-ds-lightbox");
  },
};

/** Gallery: nav advances the index + counter; prev/next disable (never unmount) at the range ends. */
export const GalleryNavAndDisabledEnds: Story = {
  render: () => <Harness media={GALLERY} />,
  play: async ({ canvasElement }) => {
    (canvasElement.querySelector('[data-testid="open"]') as HTMLButtonElement).click();
    const dialog = await waitFor(() => document.querySelector<HTMLElement>(".rt-ds-lightbox"));
    const counter = () => dialog.querySelector<HTMLElement>(".rt-ds-lightbox-counter")!.textContent?.trim();
    const prev = () => document.querySelector<HTMLButtonElement>('[aria-label="Previous"]')!;
    const next = () => document.querySelector<HTMLButtonElement>('[aria-label="Next"]')!;

    // At index 0: prev disabled, next enabled, counter "1 / 4".
    if (counter() !== "1 / 4") throw new Error(`counter must read "1 / 4"; got "${counter()}"`);
    if (!prev().disabled) throw new Error("prev must be disabled at the start");
    if (next().disabled) throw new Error("next must be enabled at the start");
    assertDisabledPaintDiffers(prev(), next(), "Lightbox prev at the start of the range");

    // Advance to the end — wait for each re-render so the handler's index closure is fresh.
    next().click();
    await waitFor(() => counter() === "2 / 4");
    next().click();
    await waitFor(() => counter() === "3 / 4");
    next().click();
    await waitFor(() => counter() === "4 / 4");
    if (next().disabled === false) throw new Error("next must be disabled at the end");
    if (prev().disabled) throw new Error("prev must be enabled at the end");
    // Both nav buttons stayed MOUNTED the whole time (disabled, not unmounted → focus never dropped).
    if (!document.querySelector('[aria-label="Previous"]') || !document.querySelector('[aria-label="Next"]'))
      throw new Error("both nav buttons must remain mounted at every index");

    // Mounted-but-inert only helps if it LOOKS inert. At the end of the range `next` is the disabled one
    // and `prev` is live, so the pair is directly comparable.
    assertDisabledPaintDiffers(next(), prev(), "Lightbox next at the end of the range");

    (document.querySelector('[aria-label="Close"]') as HTMLButtonElement).click();
    await gone(".rt-ds-lightbox");
  },
};

/** Closing returns focus to whatever opened the viewer, on BOTH exit paths ([[focus-return-on-close]]).
 *
 *  Radix hands close-focus to a registered `Dialog.Trigger`. The viewer registers none — it opens from
 *  `isOpen` — so without `useReturnFocus` the focus scope's own restore is cancelled and nothing takes
 *  over, leaving focus on <body>. This story fails on that regression; the mounted-nav assertions above
 *  do not, because they never look at where focus went. */
export const RestoresFocusOnClose: Story = {
  render: () => <Harness media={GALLERY} />,
  play: async ({ canvasElement }) => {
    const trigger = canvasElement.querySelector('[data-testid="open"]') as HTMLButtonElement;

    for (const exit of ["escape", "close button"] as const) {
      // A real pointer activation focuses the button first, then fires click.
      trigger.focus();
      if (document.activeElement !== trigger) throw new Error("the trigger must be focusable");
      trigger.click();
      await waitFor(() => document.querySelector(".rt-ds-lightbox"));
      await waitFor(() => document.activeElement !== trigger); // focus moved into the viewer

      if (exit === "escape") document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
      else (document.querySelector('[aria-label="Close"]') as HTMLButtonElement).click();
      await gone(".rt-ds-lightbox");

      await waitFor(() => document.activeElement === trigger, 1500).catch(() => {
        const a = document.activeElement as HTMLElement;
        throw new Error(
          `closing by ${exit} must return focus to the trigger; it went to <${a.tagName.toLowerCase()}>`,
        );
      });
    }
  },
};

/** Keyboard zoom (D18 addition): "+" zooms the image to 2×; "0" resets to fit. */
export const KeyboardZoom: Story = {
  render: () => <Harness media={GALLERY[0]} hasZoom />,
  play: async ({ canvasElement }) => {
    (canvasElement.querySelector('[data-testid="open"]') as HTMLButtonElement).click();
    const dialog = await waitFor(() => document.querySelector<HTMLElement>(".rt-ds-lightbox"));
    const image = () => dialog.querySelector<HTMLImageElement>("img.rt-ds-lightbox-img")!;
    if (image().style.transform) throw new Error("the image must start unzoomed (no transform)");

    // "+" → scale(2).
    dialog.dispatchEvent(new KeyboardEvent("keydown", { key: "+", bubbles: true }));
    await waitFor(() => image().style.transform.includes("scale(2)"));
    // "0" → reset (no transform).
    dialog.dispatchEvent(new KeyboardEvent("keydown", { key: "0", bubbles: true }));
    await waitFor(() => image().style.transform === "");

    (document.querySelector('[aria-label="Close"]') as HTMLButtonElement).click();
    await gone(".rt-ds-lightbox");
  },
};

/** The polite announcer fires ONLY on an in-session index change — not on open. */
export const AnnouncesOnIndexChange: Story = {
  render: () => <Harness media={GALLERY} />,
  play: async ({ canvasElement }) => {
    const region = () => document.querySelector<HTMLElement>('[data-ds-live-region="polite"]');
    // Clear any lingering announcement from a prior story before opening.
    region()?.replaceChildren();
    if (region()) region()!.textContent = "";

    (canvasElement.querySelector('[data-testid="open"]') as HTMLButtonElement).click();
    await waitFor(() => document.querySelector(".rt-ds-lightbox"));
    // On open at index 0, nothing is announced (the dialog aria-label already names the current image).
    await new Promise((r) => setTimeout(r, 80));
    if (region()?.textContent?.includes("Aurora over a lake"))
      throw new Error("opening must NOT announce the current image (only in-session index changes announce)");

    // Navigate → the new image is announced politely as "{alt}, N of M".
    (document.querySelector('[aria-label="Next"]') as HTMLButtonElement).click();
    await waitFor(() => region()?.textContent === "Desert dunes at dawn, 2 of 4");

    (document.querySelector('[aria-label="Close"]') as HTMLButtonElement).click();
    await gone(".rt-ds-lightbox");
  },
};
