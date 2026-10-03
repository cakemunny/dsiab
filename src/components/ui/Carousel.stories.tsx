import { useLayoutEffect, useRef, useState, type ReactNode } from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { Box, Code, Flex, Text } from "@radix-ui/themes";
import { Carousel } from "./Carousel";
import { Thumbnail } from "./Thumbnail";
import {
  AnatomyLegend, Caption, Decision, DoDont, DODONT_LABEL, dotStyle, HexThemeKey, hLine, KeyRow, MeasuredRow,
  MeasuredSpec, Muted, NoteRow, Page, PageHeader, PropsLead, type PropDef, PropTable, Rule, Section, tick, TokenGroup,
} from "./_storyKit";
import { awaitMeasuredRows } from "../../foundations/_assert";

/** The one definition of this component — the standfirst every page of it opens with. */
const DEFINITION = (
  <>
    A horizontal scroll container, not a slide widget — no index, no dots, no autoplay, by design. It wraps
    any content in a keyboard-scrollable row, fades whichever edge overflows to signal more items, and floats
    optional prev/next buttons that move about one viewport at a time. Reduced motion is honoured in both the
    CSS and the scripted scroll.
  </>
);

/* ---- sample content ------------------------------------------------------ */
const photo = (a: string, b: string) =>
  "data:image/svg+xml," +
  encodeURIComponent(
    `<svg xmlns='http://www.w3.org/2000/svg' width='128' height='128'>` +
      `<defs><linearGradient id='g' x1='0' y1='0' x2='1' y2='1'>` +
      `<stop offset='0' stop-color='${a}'/><stop offset='1' stop-color='${b}'/></linearGradient></defs>` +
      `<rect width='128' height='128' fill='url(#g)'/></svg>`,
  );
const HUES: [string, string][] = [
  ["#6d78ff", "#b98bff"], ["#ff9a6d", "#ffd36d"], ["#3ec7a8", "#57d6ff"],
  ["#ff6d97", "#ffa6c1"], ["#6dd08b", "#c9f06d"], ["#8b6dff", "#6db5ff"],
  ["#ffb86d", "#ff8b6d"], ["#6dffe0", "#6dc1ff"],
];
const thumbs = (n: number) =>
  Array.from({ length: n }, (_, i) => {
    const [a, b] = HUES[i % HUES.length];
    return <Thumbnail key={i} src={photo(a, b)} alt={`Photo ${i + 1}`} label={`photo-${i + 1}.jpg`} />;
  });

// A simple content card (a non-image carousel item).
const Card = ({ children }: { children: ReactNode }) => (
  <Box style={{ width: 160, padding: 16, borderRadius: "var(--ds-radius-4)", border: "1px solid var(--ds-stroke-weak)", background: "var(--ds-bg-raised)" }}>
    <Text size="2" style={{ color: "var(--ds-text-strong)" }}>{children}</Text>
  </Box>
);

/* ---- Usage: the paint the carousel adds, measured off a rendered carousel ----
   Invoked at the END of the Usage story, as its closing reference section. */
function CarouselTokens() {
  return (
    <TokenGroup
      label="EDGE FADE + NAV PILL"
      blurb="The carousel adds no colour to your items — it fades the overflowing edges (an alpha mask, no paint) and floats an opaque nav pill with the system's overlay elevation. Both rows below are read off a rendered nav pill and checked against the token they name."
      specimen={
        <Box style={{ maxWidth: 320 }}>
          <Carousel aria-label="Token spec carousel" gap={2}>{thumbs(8)}</Carousel>
        </Box>
      }
    >
      <MeasuredSpec
        render={() => (
          <Carousel aria-label="Nav pill measurement" gap={2}>{thumbs(4)}</Carousel>
        )}
      >
        <MeasuredRow
          part="Nav pill surface"
          note="Opaque, so an item never shows through the control that scrolls past it."
          token="--ds-bg-overlay"
          select=".rt-ds-carousel-nav"
          prop="background-color"
        />
      </MeasuredSpec>
      <NoteRow part="Nav pill elevation" value="--ds-shadow-overlay — the pill floats over the track, not in it" />
      <NoteRow part="Edge fade" value="16px alpha mask per overflowing side (paints nothing)" />
      <NoteRow part="Item gap" value="--ds-space-* (scaling-aware), by the gap step" />
    </TokenGroup>
  );
}

const ANATOMY_PARTS: [number, string, string][] = [
  [1, "Region", "role=region + aria-roledescription='carousel' + an aria-label — a labelled landmark. Give each carousel a DISTINCT aria-label."],
  [2, "Scroll track", "the tabIndex=0 flex row (overflow-x: auto, scrollbar hidden). Keyboard-scrollable; scroll-behavior smooth, degrading to auto under reduced motion."],
  [3, "Item", "each direct child, wrapped in a shrink-proof snap slot. With hasSnap each snaps to the start edge."],
  [4, "Edge fade", "a gradient mask on whichever side overflows — one side, both, or none. Suppress with hasEdgeFade={false} when items have full-bleed surfaces that look broken masked."],
  [5, "Prev / next", "floating pill buttons that scroll ~one viewport. Mounted always; disabled + hidden at the range end (never unmounted — that would drop focus to <body>)."],
];

/* ========================================================================== */
const meta: Meta<typeof Carousel> = {
  title: "Components/Container/Carousel",
  component: Carousel,
  parameters: {
    controls: { disable: true },
    docs: {
      description: {
        component:
          "**Carousel** is a horizontal **scroll container**, not a slide widget — it has no index, dots, or " +
          "autoplay, by design. It wraps any content in a keyboard-scrollable " +
          "row, fades whichever **edge overflows** to signal more items, and floats optional **prev/next** " +
          "buttons that scroll about one viewport at a time. The overflow state is tracked by " +
          "`useScrollOverflow` (reusing our shared `ResizeObserver`); reduced motion is honored in both the CSS " +
          "and the JS scroll. Zero net-new tokens.",
      },
    },
  },
};
export default meta;
type Story = StoryObj<typeof Carousel>;

/* ---- Anatomy diagram -----------------------------------------------------
   The carousel's parts are spread ACROSS the row, not stacked, so the callouts sit in bands above and
   below it and drop a leader into the part they name. Two bands rather than one, because the region and
   the track are the same rectangle: the outer landmark is named from ABOVE (at its own left corner) and
   the scrolling row from BELOW, so two dots never point at one edge from one side.

   Everything is MEASURED off the live specimen — a Thumbnail's width follows the control lane, and which
   edge fades (and which pill is up) follows the scroll position, so the diagram re-reads on both a resize
   and a scroll. Nothing here is a hand-typed coordinate. */

/** The fade mask's width, from the track's own rule (`black var(--ds-space-16)`), so the callout lands
 *  in the middle of the gradient rather than on the hard edge beside it. */
const FADE_W = 16;
const SIDE_PAD = 28;
const FRAME_W = 420;
const TOP_BAND = 76;
const BOT_BAND = 64;
/** Where the leaders in each band turn their corner — one shared line, so the elbows read as a set. */
const TOP_ELBOW = 40;
const BOT_ELBOW = 30;
/** Closest two dots in one band may sit, centre to centre. A dot is 20px wide. */
const MIN_GAP = 30;

type PinSpec = {
  n: number;
  band: "top" | "bottom";
  /** The element this callout names, resolved LIVE — which pill is up depends on the scroll position. */
  find: (root: HTMLElement) => HTMLElement | null;
  /** Where across that element's box the leader lands, in px from its left edge. */
  at: (box: DOMRect, el: HTMLElement) => number;
};

/** The second item while the track is at rest; once it has scrolled, the leftmost item still fully in
 *  view. Whichever it is, the callout lands on an item the reader is looking at. */
function visibleItem(root: HTMLElement): HTMLElement | null {
  const track = root.querySelector<HTMLElement>(".rt-ds-carousel-track");
  const items = Array.from(root.querySelectorAll<HTMLElement>(".rt-ds-carousel-item"));
  if (!track || items.length === 0) return null;
  const view = track.getBoundingClientRect();
  const shown = items.filter((el) => {
    const b = el.getBoundingClientRect();
    return b.left >= view.left - 1 && b.right <= view.right + 1;
  });
  if (shown.length === 0) return items[0];
  return shown[Math.min(1, shown.length - 1)];
}

const PINS: PinSpec[] = [
  { n: 1, band: "top", find: (r) => r.querySelector(".rt-ds-carousel"), at: () => 0 },
  // An item the reader can actually SEE: the second one at rest, but the track scrolls, and a leader
  // into an item that has left the viewport points off the side of the specimen at nothing.
  { n: 3, band: "top", find: visibleItem, at: (b) => b.width / 2 },
  // The pill that is actually UP: at rest the track sits at the start, so it is the next pill; scroll to
  // the end and the prev pill takes over. `data-hidden` is the component's own word for which is which.
  {
    n: 5, band: "top",
    find: (r) => r.querySelector(".rt-ds-carousel-nav:not([data-hidden])") ?? r.querySelector(".rt-ds-carousel-nav"),
    at: (b) => b.width / 2,
  },
  { n: 2, band: "bottom", find: (r) => r.querySelector(".rt-ds-carousel-track"), at: (b) => b.width * 0.22 },
  // The fade sits on whichever side overflows, which the track publishes as `data-fade` — so the callout
  // follows it instead of pointing at a hard edge once the reader has scrolled to the other end.
  {
    n: 4, band: "bottom",
    find: (r) => r.querySelector(".rt-ds-carousel-track"),
    at: (b, el) => (el.getAttribute("data-fade") === "start" ? FADE_W / 2 : b.width - FADE_W / 2),
  },
];

function AnatomyDiagram() {
  const frame = useRef<HTMLDivElement>(null);
  const specimen = useRef<HTMLDivElement>(null);
  const [pins, setPins] = useState<Record<number, { dotX: number; partX: number }>>({});
  const [edges, setEdges] = useState({ top: TOP_BAND, bottom: TOP_BAND });

  useLayoutEffect(() => {
    const f = frame.current;
    const s = specimen.current;
    if (!f || !s) return;

    const measure = () => {
      const frameBox = f.getBoundingClientRect();
      const specBox = s.getBoundingClientRect();
      const next: Record<number, { dotX: number; partX: number }> = {};
      for (const band of ["top", "bottom"] as const) {
        const measured: { n: number; partX: number }[] = [];
        for (const pin of PINS.filter((p) => p.band === band)) {
          const el = pin.find(s);
          if (!el) continue;
          const box = el.getBoundingClientRect();
          measured.push({ n: pin.n, partX: Math.round(box.left - frameBox.left + pin.at(box, el)) });
        }
        // Sorted by where the parts ACTUALLY are, not by declaration order: scrolling moves the fade
        // and the live pill to the other end of the row, and a fixed order would then push a dot the
        // wrong way. One forward pass over the sorted list keeps any two dots a legible distance
        // apart; the leader turns a corner to reach its part, so the dot moves and the line still lands.
        measured.sort((a, b) => a.partX - b.partX);
        let floor = -Infinity;
        for (const m of measured) {
          const dotX = Math.max(m.partX, floor + MIN_GAP);
          floor = dotX;
          next[m.n] = { dotX, partX: m.partX };
        }
      }
      const nextEdges = {
        top: Math.round(specBox.top - frameBox.top),
        bottom: Math.round(specBox.bottom - frameBox.top),
      };
      // Only write when something moved — the frame's own size feeds this observer otherwise.
      setPins((prev) => (JSON.stringify(prev) === JSON.stringify(next) ? prev : next));
      setEdges((prev) => (prev.top === nextEdges.top && prev.bottom === nextEdges.bottom ? prev : nextEdges));
    };

    measure();
    let raf = 0;
    const schedule = () => { cancelAnimationFrame(raf); raf = requestAnimationFrame(measure); };
    const ro = new ResizeObserver(schedule);
    ro.observe(f);
    ro.observe(s);
    // Scrolling changes which side fades and which pill is up — neither of which resizes anything, so
    // the observer alone would leave callouts 4 and 5 pointing at where those parts USED to be.
    const track = s.querySelector<HTMLElement>(".rt-ds-carousel-track");
    track?.addEventListener("scroll", schedule, { passive: true });
    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      track?.removeEventListener("scroll", schedule);
    };
  }, []);

  return (
    <Box style={{ overflowX: "auto" }}>
      <Box
        ref={frame}
        style={{
          position: "relative", width: "fit-content",
          paddingTop: TOP_BAND, paddingBottom: BOT_BAND, paddingLeft: SIDE_PAD, paddingRight: SIDE_PAD,
        }}
      >
        <Box ref={specimen} data-testid="anatomy" style={{ width: FRAME_W }}>
          <Carousel aria-label="Anatomy carousel" gap={2}>{thumbs(8)}</Carousel>
        </Box>

        {PINS.map(({ n, band }) => {
          const pin = pins[n];
          if (!pin) return null;
          const { dotX, partX } = pin;
          const top = band === "top";
          // The two bands are mirror images: the dot sits at the outer end, the leader turns at the
          // band's shared elbow line, and the last segment runs into the specimen's near edge.
          const dotTop = top ? 2 : edges.bottom + BOT_BAND - 22;
          const elbow = top ? TOP_ELBOW : edges.bottom + BOT_ELBOW;
          const stem = top
            ? { top: dotTop + 20, height: elbow - dotTop - 20 }
            : { top: elbow, height: dotTop - elbow };
          const reach = top
            ? { top: elbow, height: edges.top - 6 - elbow }
            : { top: edges.bottom + 6, height: elbow - edges.bottom - 6 };
          return (
            <Box key={n}>
              <Box data-pin={n} style={{ ...dotStyle, left: dotX - 10, top: dotTop }}>{n}</Box>
              {/* out of the dot… */}
              <Box style={tick({ left: dotX, ...stem })} />
              {/* …across to the part's own column (zero-width when they already agree)… */}
              {dotX !== partX && (
                <Box style={hLine({ left: Math.min(dotX, partX), top: elbow, width: Math.abs(dotX - partX) })} />
              )}
              {/* …and into the part. */}
              <Box style={tick({ left: partX, ...reach })} />
            </Box>
          );
        })}
      </Box>
    </Box>
  );
}

/* ---- Anatomy — the labelled diagram only; the token spec closes Usage ----- */
export const Anatomy: Story = {
  render: (_args, { globals }) => (
    <HexThemeKey.Provider value={`${globals.accent}-${globals.appearance}-${globals.contrast}`}>
      <Page>
        <PageHeader title="Carousel · Anatomy" standfirst={DEFINITION} />
        <Section title="Anatomy" lead="A labelled region wrapping a keyboard-scrollable track of snap items, with edge fades and floating nav buttons.">
          <AnatomyDiagram />
          <AnatomyLegend parts={ANATOMY_PARTS} />
          <Caption>The nav pills appear only when the corresponding side overflows — scroll to the end and the right pill hides, the left pill appears. Callouts 4 and 5 follow that: they re-read on every scroll, so they always point at the edge that is actually fading and the pill that is actually up.</Caption>
        </Section>
      </Page>
    </HexThemeKey.Provider>
  ),
  play: async ({ canvasElement }) => {
    // Passive structure reads only (no scrolling/focus → nothing flashes on view).
    const region = canvasElement.querySelector<HTMLElement>('[data-testid="anatomy"] .rt-ds-carousel')!;
    if (region.getAttribute("role") !== "region") throw new Error("the carousel must be a role=region");
    if (region.getAttribute("aria-roledescription") !== "carousel")
      throw new Error('the region must carry aria-roledescription="carousel"');
    if (!region.getAttribute("aria-label")) throw new Error("the region must be named (aria-label)");
    const track = region.querySelector<HTMLElement>(".rt-ds-carousel-track")!;
    if (track.tabIndex !== 0) throw new Error("the scroll track must be tabIndex=0 (keyboard-scrollable)");
    const items = region.querySelectorAll(".rt-ds-carousel-item");
    if (items.length !== 8) throw new Error(`expected 8 wrapped items; got ${items.length}`);
    // Both nav pills are mounted (even the hidden one), so focus never drops when reaching an end.
    if (region.querySelectorAll(".rt-ds-carousel-nav").length !== 2)
      throw new Error("both prev + next nav pills must be mounted");
    // Every numbered part in the legend has a callout ON the specimen — a numbered legend with nothing
    // to point at is the defect this diagram exists to avoid.
    const pins = canvasElement.querySelectorAll("[data-pin]");
    if (pins.length !== ANATOMY_PARTS.length)
      throw new Error(`expected ${ANATOMY_PARTS.length} callout pins on the specimen; got ${pins.length}`);
  },
};

/* ---- Usage — scenarios, then the closing live token spec ----------------- */
export const Usage: Story = {
  // The DO/DON'T word (success/error step-11 ink on its own tint) measures 4.10 at 12px bold, under axe's
  // 4.5; the colour + the word already carry the meaning, so that row is the documented exception. Scoped
  // to the label itself — the cards' specimens stay fully axe-checked, which "[data-dodont]" did not do.
  parameters: { a11y: { context: { exclude: [DODONT_LABEL] } } },
  render: (_args, { globals }) => (
    <Page>
      <PageHeader title="Carousel · Usage" standfirst={DEFINITION} />
      <Section title="A thumbnail gallery" lead="The canonical use — a scrollable row of Thumbnails. Each is a self-contained tile; the carousel just handles the overflow + navigation.">
        <Box style={{ maxWidth: 440 }} data-testid="gallery">
          <Carousel aria-label="Photo gallery" gap={2} hasSnap>{thumbs(10)}</Carousel>
        </Box>
        <Caption>With <Code>hasSnap</Code>, each tile snaps to the start edge as you scroll or press a nav button.</Caption>
      </Section>

      <Rule />

      <Section title="A card row" lead="Any content works — cards, chips, tiles. Content with full-bleed surfaces can suppress the fade so the mask doesn't clip a card edge.">
        <Box style={{ maxWidth: 440 }}>
          <Carousel aria-label="Card row" gap={2} hasEdgeFade={false} padding={1}>
            {Array.from({ length: 6 }, (_, i) => <Card key={i}>Card {i + 1}</Card>)}
          </Carousel>
        </Box>
        <Caption><Code>hasEdgeFade={"{false}"}</Code> here — the cards have their own borders, which a fade mask would clip.</Caption>
      </Section>

      <Rule />

      <Section title="Do & Don't" lead="A carousel is for browsing peers, not for staging one hero.">
        <Flex direction="column" gap="3">
          <DoDont kind="do" bare note="A row of equal-weight items the user scans and scrolls — thumbnails, cards, chips.">
            <Box style={{ maxWidth: 360 }}><Carousel aria-label="Do example" gap={2}>{thumbs(6)}</Carousel></Box>
          </DoDont>
          <DoDont kind="dont" bare note="Don't stage a single hero/banner in a Carousel and reach for autoplay + dots — that's a different component. This one has no index, dots, or autoplay by design.">
            <Box style={{ maxWidth: 360 }}><Carousel aria-label="Dont example" gap={2}>{[<Card key="0">One big hero slide</Card>]}</Carousel></Box>
          </DoDont>
        </Flex>
      </Section>

      <Rule />

      {/* The closing reference section. The provider is what makes the table live: every measured row
          re-reads its value when this key changes, so an accent/appearance flip re-resolves the spec. */}
      <HexThemeKey.Provider value={`${globals.accent}-${globals.appearance}-${globals.contrast}`}>
        <Section title="Tokens" lead="Measured off a rendered carousel — the carousel adds only the nav-pill surface + the edge-fade mask, and each row checks what the pill paints against the token it names.">
          <CarouselTokens />
        </Section>
      </HexThemeKey.Provider>
    </Page>
  ),
  play: async ({ canvasElement }) => {
    // Passive: the gallery items are Thumbnails inside carousel item slots.
    const gallery = canvasElement.querySelector('[data-testid="gallery"]')!;
    const items = gallery.querySelectorAll(".rt-ds-carousel-item");
    if (items.length !== 10) throw new Error(`expected 10 gallery items; got ${items.length}`);
    for (const it of Array.from(items))
      if (!it.querySelector(".rt-ds-thumbnail")) throw new Error("each gallery item should hold a Thumbnail");

    // The token table's EVIDENCE, asserted at runtime — both rows read a REAL rendered nav pill.
    // `awaitMeasuredRows` blocks until every row has recorded its evidence (a row whose element
    // mounts late retries for up to 60 frames before it reports), then runs the identical assertions.
    const rows = await awaitMeasuredRows(canvasElement);
    if (rows.measured !== 1 || rows.unproven !== 0) {
      throw new Error(`expected 1 measured / 0 unproven token rows, got ${rows.measured} / ${rows.unproven}`);
    }
  },
};

/* ---- Keyboard ------------------------------------------------------------ */
export const Keyboard: Story = {
  render: () => (
    <Page>
      <PageHeader title="Carousel · Keyboard" standfirst={DEFINITION} />
      <Section title="Keyboard" lead="The scroll track is a focusable, keyboard-scrollable region; the nav buttons are ordinary Tab stops.">
        <Box style={{ borderRadius: "var(--ds-radius-4)", border: "1px solid var(--ds-stroke-weak)", overflow: "hidden" }}>
          <KeyRow keys={["Tab"]} action={<>Move focus onto the scroll track, then to each visible nav button.</>} src="system" />
          <KeyRow keys={["←", "→"]} action={<>With the track focused, scroll horizontally by a small step (native scroll-container behavior).</>} src="system" />
          <KeyRow keys={["Home", "End"]} action={<>With the track focused, jump to the start / end of the row.</>} src="system" />
          <KeyRow keys={["Enter", "Space"]} action={<>Activate a focused prev / next button to scroll ~one viewport (with a half-item peek).</>} src="system" />
        </Box>
        <Caption>A nav button becomes <Code>disabled</Code> (and leaves the tab order) at the range end, but stays mounted — so reaching an edge never drops focus to the page body.</Caption>
      </Section>
    </Page>
  ),
};

/* ---- Properties ---------------------------------------------------------- */
const PROPS: PropDef[] = [
  { name: "children", type: "ReactNode", desc: <>Carousel items — each direct child becomes a snap slot in the scroll track.</>, source: "Carousel.tsx" },
  { name: "gap", type: "0 | 1 | 2 | 3 | 4 | 5 | 6", def: "2", desc: <>Gap between items (spacing step → <Code>--ds-space-*</Code>).</>, source: "Carousel.tsx" },
  { name: "hasButtons", type: "boolean", def: "true", desc: <>Show prev/next buttons when content is scrollable.</>, source: "Carousel.tsx" },
  { name: "hasEdgeFade", type: "boolean", def: "true", desc: <>Show the gradient edge-fade mask per overflowing side.</>, source: "Carousel.tsx" },
  { name: "hasSnap", type: "boolean", def: "false", desc: <>Enable scroll-snap — each child snaps to the start edge.</>, source: "Carousel.tsx" },
  { name: "padding", type: "0 | 1 | 2 | 3 | 4 | 5 | 6", desc: <>Inline padding inside the track (with matching scroll-padding so snap points align to the content edge).</>, source: "Carousel.tsx" },
  { name: "aria-label", type: "string", def: `"Carousel"`, desc: <>Accessible name for the region — make it <strong>distinct</strong> per carousel (landmark-unique).</>, source: "Carousel.tsx" },
];

/* ---- Props ---------------------------------------------------------- */
type PropsArgs = {
  count: number;
  gap: 0 | 1 | 2 | 3 | 4 | 5 | 6;
  hasButtons: boolean;
  hasEdgeFade: boolean;
  hasSnap: boolean;
  padding: 0 | 1 | 2 | 3 | 4 | 5 | 6;
};

export const Props: StoryObj<PropsArgs> = {
  args: { count: 10, gap: 2, hasButtons: true, hasEdgeFade: true, hasSnap: false, padding: 0 },
  argTypes: {
    count: { control: { type: "range", min: 2, max: 16, step: 1 }, description: "How many items to render.", table: { category: "Content" } },
    gap: { control: "inline-radio", options: [0, 1, 2, 3, 4, 5, 6], description: "Gap between items (spacing step).", table: { category: "Layout" } },
    hasButtons: { control: "boolean", table: { category: "Behavior" } },
    hasEdgeFade: { control: "boolean", table: { category: "Behavior" } },
    hasSnap: { control: "boolean", table: { category: "Behavior" } },
    padding: { control: "inline-radio", options: [0, 1, 2, 3, 4, 5, 6], description: "Inline padding inside the track.", table: { category: "Layout" } },
  },
  parameters: { controls: { disable: false } },
  render: ({ count, gap, hasButtons, hasEdgeFade, hasSnap, padding }: PropsArgs) => (
    <Page maxWidth="none">
      <PageHeader
        title="Carousel · Props"
        standfirst={<>{DEFINITION} Resize the frame below to watch the edge fades and the nav buttons appear as the content overflows.</>}
      />
      <Box style={{ maxWidth: 480 }}>
        <Carousel aria-label="Props carousel" gap={gap} hasButtons={hasButtons} hasEdgeFade={hasEdgeFade} hasSnap={hasSnap} padding={padding || undefined}>
          {thumbs(count)}
        </Carousel>
      </Box>
      <Muted>Scroll the row, or press the nav pills. The buttons hide at each end when there's nothing more to scroll toward.</Muted>
      <PropsLead />
      <Rule />
      <Section title="Props reference" lead={<>Every prop <Code>Carousel</Code> accepts.</>}>
        <PropTable rows={PROPS} />
      </Section>
    </Page>
  ),
};

/* ---- History ------------------------------------------------------------- */
export const History: Story = {
  render: () => (
    <Page>
      <PageHeader title="Carousel · History" standfirst={DEFINITION} />
      <Section title="Decisions" lead="The rulings this component encodes.">
        <Flex direction="column" gap="3">
          <Decision id="[[carousel-scroller]] · scroll container, not a slide widget">
            The Carousel is a <strong>scroll container</strong>, not a slideshow — no index, no dots, no
            autoplay, <strong>by design</strong>. It's a horizontal scroll track
            that snaps optional items and fades the overflowing edge(s).
          </Decision>
          <Decision id="[[carousel-scroller]] · shared overflow logic">
            <Code>useScrollOverflow</Code> lives in <Code>src/hooks</Code> and <strong>reuses our shared
            <Code> ResizeObserver</Code></strong> singleton (<Code>sharedResizeObserver</Code>) — so N carousels
            share one observer. The pure overflow math
            (<Code>computeOverflow</Code>) is extracted for the node lane; <Code>scrollByViewport</Code> scrolls
            ~one viewport with a half-item peek, <strong>reduced-motion-aware</strong>.
          </Decision>
          <Decision id="[[carousel-scroller]] · plain absolute buttons">
            The prev/next buttons are plain absolutely-positioned pills inside the
            <Code> position:relative</Code> region (the region is <Code>overflow: visible</Code>; the track owns
            horizontal clipping) — no top-layer or CSS anchor-positioning needed on our substrate.
          </Decision>
          <Decision id="[[carousel-scroller]] · buttons mounted, disabled at ends">
            Prev/next stay <strong>mounted</strong> and become <Code>disabled</Code> + opacity-hidden at the
            range ends — never unmounted, which would drop focus to <Code>&lt;body&gt;</Code>. The scroll track is
            <Code> tabIndex=0</Code> so keyboard users can scroll it directly.
          </Decision>
        </Flex>
      </Section>
      <Rule />
      <Section title="Changelog" lead="Notable changes, newest first — grows as the component evolves.">
        <Flex direction="column" gap="3">
          <Decision id="0.9.0">
            Initial <Code>System/Carousel</Code> — the scroll container:
            <Code> useScrollOverflow</Code> (reusing <Code>sharedResizeObserver</Code>) + <Code>computeOverflow</Code>
            (node-tested) + <Code>scrollByViewport</Code>; edge-fade masks; plain absolute prev/next pills;
            <Code> gap</Code>/<Code>hasButtons</Code>/<Code>hasEdgeFade</Code>/<Code>hasSnap</Code>/<Code>padding</Code>.
          </Decision>
        </Flex>
      </Section>
    </Page>
  ),
};
