import { useState } from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { Flex } from "@radix-ui/themes";
import { Thumbnail } from "./Thumbnail";

/* Test-only behavior for Thumbnail — kept OUT of the docs stories (System/Thumbnail). Underscore-prefixed
   → registry- and story-order-guard-exempt, grouped under _internal. Covers the four prop-driven states,
   the D16 broken-src → placeholder fallback (onError), the remove-✕ stopPropagation + sibling structure,
   the open trigger, and the disabled affordance removal. */

// A promise-based poll — the same idiom the other _internal suites use (no @storybook/test dep).
async function waitFor<T>(fn: () => T | null | undefined | false, timeout = 2000): Promise<T> {
  const t0 = performance.now();
  for (;;) {
    const v = fn();
    if (v) return v;
    if (performance.now() - t0 > timeout) throw new Error("waitFor: timed out");
    await new Promise((r) => setTimeout(r, 16));
  }
}

const PHOTO =
  "data:image/svg+xml," +
  encodeURIComponent(
    "<svg xmlns='http://www.w3.org/2000/svg' width='64' height='64'><rect width='64' height='64' fill='#6d78ff'/></svg>",
  );
// A malformed data URI — the browser fails to decode it → onError fires.
const BROKEN = "data:image/png;base64,notarealimage";

const meta: Meta<typeof Thumbnail> = {
  title: "_internal/Thumbnail behavior",
  component: Thumbnail,
  parameters: { controls: { disable: true } },
};
export default meta;
type Story = StoryObj<typeof Thumbnail>;

/** The four states resolve from src + isLoading. */
export const States: Story = {
  render: () => (
    <Flex gap="3" p="4">
      <Thumbnail data-testid="skeleton" isLoading alt="Uploading" />
      <Thumbnail data-testid="image" src={PHOTO} alt="A photo" />
      <Thumbnail data-testid="uploading" src={PHOTO} alt="Processing" isLoading />
      <Thumbnail data-testid="placeholder" alt="No image" />
    </Flex>
  ),
  play: async ({ canvasElement }) => {
    const q = (id: string) => canvasElement.querySelector<HTMLElement>(`[data-testid="${id}"]`)!;
    // Skeleton — no img, a Radix Skeleton, no placeholder.
    const sk = q("skeleton");
    if (sk.querySelector("img")) throw new Error("skeleton: must not render an <img>");
    if (!sk.querySelector(".rt-Skeleton")) throw new Error("skeleton: must render a Radix Skeleton");
    // Image — an <img>, an inset border, no upload overlay.
    const im = q("image");
    if (!im.querySelector("img.rt-ds-thumbnail-img")) throw new Error("image: must render the <img>");
    if (!im.querySelector(".rt-ds-thumbnail-border")) throw new Error("image: must show the inset border");
    if (im.querySelector(".rt-ds-thumbnail-uploading")) throw new Error("image: must NOT show the upload overlay");
    // Uploading — img + spinner overlay.
    const up = q("uploading");
    if (!up.querySelector("img")) throw new Error("uploading: must still render the image");
    if (!up.querySelector(".rt-ds-thumbnail-uploading")) throw new Error("uploading: must overlay a spinner");
    // Placeholder — the glyph, no img.
    const pl = q("placeholder");
    if (pl.querySelector("img")) throw new Error("placeholder: must not render an <img>");
    if (!pl.querySelector(".rt-ds-thumbnail-placeholder")) throw new Error("placeholder: must render the glyph");
  },
};

/** D16 — a broken src starts as an <img>, then onError swaps it for the placeholder (no browser glyph). */
export const BrokenSrcFallsBackToPlaceholder: Story = {
  render: () => (
    <Flex gap="3" p="4">
      <Thumbnail data-testid="broken" src={BROKEN} alt="Broken source" />
    </Flex>
  ),
  play: async ({ canvasElement }) => {
    const tile = canvasElement.querySelector<HTMLElement>('[data-testid="broken"]')!;
    // The <img> renders first (optimistic); once the decode fails, onError flips to the placeholder.
    await waitFor(() => tile.querySelector(".rt-ds-thumbnail-placeholder"));
    if (tile.querySelector("img")) throw new Error("a broken src must fall back to the placeholder — the <img> should be gone");
  },
};

/** The remove ✕ fires onRemove, is a SIBLING of the open trigger (never nested), and its stopPropagation
 *  keeps a click from also firing the tile's onClick. */
export const RemoveStopsPropagation: Story = {
  render: function RemoveHarness() {
    const [opens, setOpens] = useState(0);
    const [removes, setRemoves] = useState(0);
    return (
      <Flex direction="column" gap="2" p="4">
        <Thumbnail
          data-testid="tile"
          src={PHOTO}
          alt="Open me"
          label="photo.jpg"
          onClick={() => setOpens((n) => n + 1)}
          onRemove={() => setRemoves((n) => n + 1)}
        />
        <span data-testid="counts" data-opens={opens} data-removes={removes} />
      </Flex>
    );
  },
  play: async ({ canvasElement }) => {
    const tile = canvasElement.querySelector<HTMLElement>('[data-testid="tile"]')!;
    const counts = canvasElement.querySelector<HTMLElement>('[data-testid="counts"]')!;
    const openBtn = tile.querySelector<HTMLButtonElement>("button.rt-ds-thumbnail-open")!;
    const removeWrap = tile.querySelector<HTMLElement>(".rt-ds-thumbnail-remove")!;
    const removeBtn = tile.querySelector<HTMLButtonElement>(".rt-ds-thumbnail-removebtn")!;
    // Sibling structure: the remove wrapper and the open button share the same parent (the frame).
    if (removeWrap.parentElement !== openBtn.parentElement)
      throw new Error("the remove ✕ must be a SIBLING of the open trigger (same parent), not nested inside it");
    if (openBtn.contains(removeBtn)) throw new Error("the remove ✕ must not be inside the open <button>");

    // Click remove → onRemove fires, onClick does NOT.
    removeBtn.click();
    await waitFor(() => counts.getAttribute("data-removes") === "1");
    if (counts.getAttribute("data-opens") !== "0")
      throw new Error("clicking the remove ✕ must NOT fire the tile's onClick (stopPropagation)");

    // Click the open trigger → onClick fires.
    openBtn.click();
    await waitFor(() => counts.getAttribute("data-opens") === "1");
  },
};

/** Disabled removes the remove ✕ and the open affordance (image renders inline, not in a button). */
export const DisabledDropsAffordances: Story = {
  render: () => (
    <Flex gap="3" p="4">
      <Thumbnail data-testid="tile" src={PHOTO} alt="Disabled" label="x.jpg" isDisabled onClick={() => {}} onRemove={() => {}} />
    </Flex>
  ),
  play: async ({ canvasElement }) => {
    const tile = canvasElement.querySelector<HTMLElement>('[data-testid="tile"]')!;
    if (tile.getAttribute("data-disabled") !== "") throw new Error("a disabled tile must carry data-disabled");
    if (tile.querySelector(".rt-ds-thumbnail-removebtn")) throw new Error("a disabled tile must not render the remove ✕");
    if (tile.querySelector("button.rt-ds-thumbnail-open")) throw new Error("a disabled tile must not render the open trigger");
    if (!tile.querySelector("img.rt-ds-thumbnail-img")) throw new Error("a disabled tile still shows its image inline");
  },
};
