import type { Meta, StoryObj } from "@storybook/react-vite";
import { Box } from "@radix-ui/themes";
import { Carousel } from "./Carousel";
import { Thumbnail } from "./Thumbnail";

/* Test-only behavior for Carousel — kept OUT of the docs stories (System/Carousel). Underscore-prefixed →
   registry- and story-order-guard-exempt, grouped under _internal. Covers the overflow-driven button
   enable/disable (+ hide at the ends), scrollByViewport, the region roledescription/track a11y, and the
   reduced-motion scroll-behavior override. */

async function waitFor<T>(fn: () => T | null | undefined | false, timeout = 2500): Promise<T> {
  const t0 = performance.now();
  for (;;) {
    const v = fn();
    if (v) return v;
    if (performance.now() - t0 > timeout) throw new Error("waitFor: timed out");
    await new Promise((r) => setTimeout(r, 16));
  }
}

const photo = (i: number) =>
  "data:image/svg+xml," +
  encodeURIComponent(
    `<svg xmlns='http://www.w3.org/2000/svg' width='64' height='64'><rect width='64' height='64' fill='hsl(${(i * 40) % 360} 60% 55%)'/></svg>`,
  );
const items = (n: number) =>
  Array.from({ length: n }, (_, i) => <Thumbnail key={i} src={photo(i)} alt={`Photo ${i + 1}`} />);

const meta: Meta<typeof Carousel> = {
  title: "_internal/Carousel behavior",
  component: Carousel,
  parameters: { controls: { disable: true } },
};
export default meta;
type Story = StoryObj<typeof Carousel>;

const nav = (region: HTMLElement, side: "prev" | "next") => ({
  wrap: region.querySelector<HTMLElement>(`.rt-ds-carousel-nav[data-side="${side}"]`)!,
  btn: region.querySelector<HTMLButtonElement>(`.rt-ds-carousel-nav[data-side="${side}"] button`)!,
});

/** Overflow drives the button enable + hidden state: at the start the prev pill is disabled + hidden and
 *  the next pill is enabled; scrolled to the end it flips. Both stay MOUNTED throughout. */
export const OverflowDrivesButtons: Story = {
  render: () => (
    <Box style={{ maxWidth: 280 }} data-testid="wrap">
      <Carousel aria-label="Overflow test">{items(8)}</Carousel>
    </Box>
  ),
  play: async ({ canvasElement }) => {
    const region = canvasElement.querySelector<HTMLElement>('[data-testid="wrap"] .rt-ds-carousel')!;
    const track = region.querySelector<HTMLElement>(".rt-ds-carousel-track")!;
    const prev = nav(region, "prev");
    const next = nav(region, "next");

    // At the start (once the observer settles): prev disabled + hidden, next enabled + visible.
    await waitFor(() => next.btn.disabled === false);
    if (!prev.btn.disabled) throw new Error("at the start, the prev button must be disabled");
    if (prev.wrap.getAttribute("data-hidden") !== "") throw new Error("at the start, the prev pill must be hidden");
    if (next.wrap.getAttribute("data-hidden") != null) throw new Error("at the start, the next pill must be visible");

    // Jump to the end and let the scroll listener + observer re-measure.
    track.scrollLeft = track.scrollWidth;
    track.dispatchEvent(new Event("scroll"));
    await waitFor(() => next.btn.disabled === true);
    if (prev.btn.disabled) throw new Error("at the end, the prev button must be enabled");
    if (next.wrap.getAttribute("data-hidden") !== "") throw new Error("at the end, the next pill must be hidden");
    if (prev.wrap.getAttribute("data-hidden") != null) throw new Error("at the end, the prev pill must be visible");

    // Both pills were mounted the whole time (never unmounted → focus never dropped to <body>).
    if (region.querySelectorAll(".rt-ds-carousel-nav").length !== 2)
      throw new Error("both nav pills must remain mounted at every scroll position");
  },
};

/** scrollByViewport — pressing next scrolls the track right by ~a viewport; prev scrolls it back. */
export const ScrollByViewport: Story = {
  render: () => (
    <Box style={{ maxWidth: 280 }} data-testid="wrap">
      <Carousel aria-label="Scroll-by test">{items(8)}</Carousel>
    </Box>
  ),
  play: async ({ canvasElement }) => {
    const region = canvasElement.querySelector<HTMLElement>('[data-testid="wrap"] .rt-ds-carousel')!;
    const track = region.querySelector<HTMLElement>(".rt-ds-carousel-track")!;
    const next = nav(region, "next");
    const prev = nav(region, "prev");

    await waitFor(() => next.btn.disabled === false);
    const start = track.scrollLeft;
    next.btn.click();
    const advanced = await waitFor(() => (track.scrollLeft > start + 10 ? track.scrollLeft : false));

    await waitFor(() => prev.btn.disabled === false);
    prev.btn.click();
    await waitFor(() => track.scrollLeft < advanced - 10);
  },
};

/** Region a11y: role=region + aria-roledescription="carousel" + a name; the track is tabIndex=0. */
export const RegionRoledescription: Story = {
  render: () => (
    <Box style={{ maxWidth: 280 }} data-testid="wrap">
      <Carousel aria-label="Named carousel">{items(6)}</Carousel>
    </Box>
  ),
  play: async ({ canvasElement }) => {
    const region = canvasElement.querySelector<HTMLElement>('[data-testid="wrap"] .rt-ds-carousel')!;
    if (region.getAttribute("role") !== "region") throw new Error('must be role="region"');
    if (region.getAttribute("aria-roledescription") !== "carousel")
      throw new Error('must carry aria-roledescription="carousel"');
    if (region.getAttribute("aria-label") !== "Named carousel") throw new Error("the aria-label must name the region");
    const track = region.querySelector<HTMLElement>(".rt-ds-carousel-track")!;
    if (track.tabIndex !== 0) throw new Error("the scroll track must be tabIndex=0");
  },
};

/** Reduced motion: the shipped CSS sets scroll-behavior: auto on the track under prefers-reduced-motion.
 *  A play can't force the media query, so we prove the override EXISTS (StatusDot's approach). */
export const ReducedMotionScrollBehavior: Story = {
  render: () => (
    <Box style={{ maxWidth: 280 }}>
      <Carousel aria-label="Reduced-motion carousel">{items(6)}</Carousel>
    </Box>
  ),
  play: async () => {
    let found = false;
    for (const sheet of Array.from(document.styleSheets)) {
      let rules: CSSRuleList;
      try { rules = sheet.cssRules; } catch { continue; }
      for (const r of Array.from(rules)) {
        if (r instanceof CSSMediaRule && /prefers-reduced-motion\s*:\s*reduce/.test(r.conditionText)) {
          for (const inner of Array.from(r.cssRules)) {
            if (
              inner instanceof CSSStyleRule &&
              /\.rt-ds-carousel-track/.test(inner.selectorText) &&
              inner.style.scrollBehavior === "auto"
            ) {
              found = true;
            }
          }
        }
      }
    }
    if (!found)
      throw new Error("no @media (prefers-reduced-motion: reduce) rule sets scroll-behavior: auto on .rt-ds-carousel-track");
  },
};
