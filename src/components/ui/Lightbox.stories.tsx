import { useLayoutEffect, useRef, useState } from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { Box, Code, Flex, Theme } from "@radix-ui/themes";
import { CaretLeft, CaretRight, X } from "@phosphor-icons/react";
import { Lightbox, type LightboxMedia } from "./Lightbox";
import { useLightbox } from "./useLightbox";
import { Thumbnail } from "./Thumbnail";
import { Button } from "./Button";
import { IconButton } from "./IconButton";
import {
  AnatomyLegend, Caption, Decision, dotStyle, HexThemeKey, hLine, KeyRow, MeasuredRow, MeasuredSpec, Muted,
  NoteRow, Page, PageHeader, PropsLead, type PropDef, PropTable, Rule, Section, TokenGroup,
} from "./_storyKit";
import { awaitMeasuredRows } from "../../foundations/_assert";

/* ---- sample media (inline data URIs → deterministic; large so contain-fit reads as a photo) --------- */
const photo = (a: string, b: string, label: string) =>
  "data:image/svg+xml," +
  encodeURIComponent(
    `<svg xmlns='http://www.w3.org/2000/svg' width='800' height='600'>` +
      `<defs><linearGradient id='g' x1='0' y1='0' x2='1' y2='1'>` +
      `<stop offset='0' stop-color='${a}'/><stop offset='1' stop-color='${b}'/></linearGradient></defs>` +
      `<rect width='800' height='600' fill='url(#g)'/>` +
      `<text x='400' y='320' font-family='sans-serif' font-size='64' fill='white' text-anchor='middle' opacity='0.9'>${label}</text></svg>`,
  );
const thumb = (a: string) =>
  "data:image/svg+xml," +
  encodeURIComponent(`<svg xmlns='http://www.w3.org/2000/svg' width='64' height='64'><rect width='64' height='64' fill='${a}'/></svg>`);

const GALLERY: LightboxMedia[] = [
  { src: photo("#6d78ff", "#b98bff", "1"), alt: "Aurora over a lake", caption: "Aurora over a lake — long exposure" },
  { src: photo("#ff9a6d", "#ffd36d", "2"), alt: "Desert dunes at dawn" },
  { src: photo("#3ec7a8", "#57d6ff", "3"), alt: "Turquoise coastline" },
  { src: photo("#ff6d97", "#ffa6c1", "4"), alt: "Cherry blossom canopy", caption: "Cherry blossom canopy" },
];
const THUMB_HUES = ["#6d78ff", "#ff9a6d", "#3ec7a8", "#ff6d97"];

const ANATOMY_PARTS: [number, string, string][] = [
  [1, "Backdrop", "the Radix Dialog overlay, repainted from --ds-scrim + a subtle blur. Click it (the empty stage) to close; the Dialog also owns focus-trap, scroll-lock, and Escape."],
  [2, "Close", "a scrim-disc IconButton, top-right. Named 'Close'."],
  [3, "Counter", "top-left 'N / M' (gallery only, aria-hidden — the polite announcer speaks the change instead)."],
  [4, "Prev / next", "mid-height edge buttons (gallery only). Disabled — NOT unmounted — at the range ends, so reaching a boundary never drops focus to <body>."],
  [5, "Media", "the image (object-fit: contain) or a <video controls>. With hasZoom, double-click or +/-/0 zooms an image; drag to pan."],
  [6, "Caption", "optional text below the media, per item."],
];

/* ========================================================================== */
/** The one definition of this component — the standfirst every page of it opens with. */
const DEFINITION = <>A fullscreen media viewer — open it from any trigger; Escape, the backdrop, or the close button dismiss it.</>;

const meta: Meta<typeof Lightbox> = {
  title: "Components/Modals & Popovers/Lightbox",
  component: Lightbox,
  parameters: {
    controls: { disable: true },
    docs: {
      description: {
        component:
          "**Lightbox** is a fullscreen media viewer — a single image, or a gallery with prev/next nav, a " +
          "counter, captions, and optional zoom/pan. It's built on the **raw Radix Themes `Dialog`** (the " +
          "`AlertDialog` thin-wrapper pattern), so focus-trap, scroll-lock, Escape, and backdrop-dismiss come " +
          "for free — no hand-rolled scroll-lock. Returning focus to the opener on close is the one " +
          "exception Radix does not cover for a viewer opened from `isOpen`, so the system supplies it. The " +
          "backdrop paints from `--ds-scrim`; modal motion is inherited from the shared dialog bindings. " +
          "Navigation is announced politely via our `useAnnounce`, and zoom is fully keyboard-operable " +
          "(`+` / `-` / `0`), not mouse-only. Zero net-new tokens.",
      },
    },
  },
};
export default meta;
type Story = StoryObj<typeof Lightbox>;

/* ---- Anatomy -------------------------------------------------------------
   THE STAGE BELOW IS A STILL. The real viewer is a portal that goes fullscreen: it dims the page, traps
   focus and locks scroll — so anything pinned to it would be COVERED by the thing the pins name the
   moment the reader opened it, and the legend under the diagram would be unreachable. So the parts are
   labelled on a faithful reproduction, the way Dialog's Anatomy labels its panel: the component's OWN
   part classes (`.rt-ds-lightbox-stage` / `-close` / `-counter` / `-nav` / `-media` / `-viewport` /
   `-img` / `-caption` / `-control`) inside the same permanently-dark <Theme>, over a scrim painted from
   the same `--ds-scrim` the real overlay carries. That is what keeps the still from drifting: it IS the
   component's skin, only parented to this frame instead of to the document. The live, openable viewer
   sits directly under the diagram.

   Positions are MEASURED off the rendered still, never hand-typed: the control discs resize with the
   control lane (the size toolbar), and the image's box depends on when its bitmap decodes — so every
   pin target is observed, and a resize re-measures on the next frame. */

const GUTTER = 64;
const FRAME_W = 520;
const STAGE_H = 380;
/** How far inside the stage the backdrop's own dot sits. It needs no leader — it is ON the part. */
const INSET = 16;

/** [callout, selector inside the still, where on that element to anchor, which gutter the dot sits in
 *  — "on" puts the dot ON the part itself and draws no leader].
 *
 *  Two gutters, because the parts pair up by height: the counter and the close disc share the top band
 *  and the nav discs share the image's midline, so a single gutter would stack four dots on two pixels.
 *  Left carries the parts that live on the left edge (counter, prev) plus the caption; right carries the
 *  close disc and the media. */
const PINS: [number, string, "center" | "bottom-left", "left" | "right" | "on"][] = [
  [1, ".rt-ds-lightbox-stage", "bottom-left", "on"],
  [2, ".rt-ds-lightbox-close", "center", "right"],
  [3, ".rt-ds-lightbox-counter", "center", "left"],
  [4, ".rt-ds-lightbox-nav-prev", "center", "left"],
  [5, ".rt-ds-lightbox-img", "center", "right"],
  [6, ".rt-ds-lightbox-caption", "center", "left"],
];

/** The page the viewer opens OVER — inert, and there only so the backdrop reads as a dim of something
 *  rather than as a grey rectangle. No controls in it: nothing here should take a Tab stop. */
function PageBehind() {
  return (
    <Box aria-hidden style={{ position: "absolute", inset: 0, background: "var(--ds-bg-base)", padding: 20 }}>
      <Box style={{ height: 10, width: 132, borderRadius: "var(--ds-radius-2)", background: "var(--ds-fill-weak)" }} />
      <Flex gap="3" mt="4">
        {THUMB_HUES.map((hue) => (
          <img key={hue} src={thumb(hue)} alt="" width={104} height={104} style={{ borderRadius: "var(--ds-radius-3)" }} />
        ))}
      </Flex>
      <Box mt="4" style={{ height: 8, width: "68%", borderRadius: "var(--ds-radius-2)", background: "var(--ds-fill-weak)" }} />
      <Box mt="2" style={{ height: 8, width: "44%", borderRadius: "var(--ds-radius-2)", background: "var(--ds-fill-weak)" }} />
    </Box>
  );
}

function AnatomyDiagram() {
  const frame = useRef<HTMLDivElement>(null);
  const still = useRef<HTMLDivElement>(null);
  const [pins, setPins] = useState<Record<number, { x: number; y: number }>>({});

  useLayoutEffect(() => {
    const f = frame.current;
    const s = still.current;
    if (!f || !s) return;
    const measure = () => {
      const frameBox = f.getBoundingClientRect();
      const next: Record<number, { x: number; y: number }> = {};
      for (const [n, sel, anchor, side] of PINS) {
        const el = s.querySelector<HTMLElement>(sel);
        if (!el) continue;
        const box = el.getBoundingClientRect();
        const y = Math.round(
          anchor === "center"
            ? box.top + box.height / 2 - frameBox.top
            : box.bottom - frameBox.top - INSET - 10,
        );
        const x =
          side === "on" ? Math.round(box.left - frameBox.left + INSET)
          : side === "left" ? 0
          : GUTTER + FRAME_W + GUTTER - 20;
        next[n] = { x, y };
      }
      // Only write when something moved — the frame's own size feeds this observer otherwise.
      setPins((prev) => (JSON.stringify(prev) === JSON.stringify(next) ? prev : next));
    };
    measure();
    let raf = 0;
    const ro = new ResizeObserver(() => { cancelAnimationFrame(raf); raf = requestAnimationFrame(measure); });
    ro.observe(f);
    ro.observe(s);
    // Observe the parts themselves, not just the frame: the still's box is fixed, so a disc that grows
    // with the control lane — or an image that lays out when its bitmap decodes — changes NOTHING the
    // frame can feel. Without these, pin 5 would keep the position the image had before it loaded.
    for (const [, sel] of PINS) {
      const el = s.querySelector<HTMLElement>(sel);
      if (el) ro.observe(el);
    }
    return () => { cancelAnimationFrame(raf); ro.disconnect(); };
  }, []);

  return (
    <Box style={{ overflowX: "auto" }}>
      <Box ref={frame} style={{ position: "relative", width: FRAME_W + GUTTER * 2, paddingLeft: GUTTER, paddingRight: GUTTER }}>
        <Box
          ref={still}
          data-testid="anatomy-still"
          style={{
            position: "relative", width: FRAME_W, height: STAGE_H, overflow: "hidden",
            borderRadius: "var(--ds-radius-4)", border: "1px solid var(--ds-stroke-weak)",
          }}
        >
          <PageBehind />
          {/* The backdrop, painted exactly as the real overlay rule paints it (`--ds-scrim` + the 2px
              blur). It sits OUTSIDE the dark Theme, because the real overlay is outside it too — the
              scrim resolves in the app's appearance, the controls inside it resolve dark. */}
          <Box style={{ position: "absolute", inset: 0, background: "var(--ds-scrim)", backdropFilter: "blur(2px)" }} />
          <Theme appearance="dark" hasBackground={false} className="rt-ds-lightbox-theme" style={{ position: "absolute", inset: 0 }}>
            <div className="rt-ds-lightbox-stage">
              <div className="rt-ds-lightbox-close">
                <IconButton priority="tertiary" radius="full" aria-label="Close" className="rt-ds-lightbox-control">
                  <X weight="bold" />
                </IconButton>
              </div>
              <div className="rt-ds-lightbox-counter" aria-hidden>1 / {GALLERY.length}</div>
              <div className="rt-ds-lightbox-nav rt-ds-lightbox-nav-prev">
                <IconButton priority="tertiary" radius="full" aria-label="Previous" className="rt-ds-lightbox-control" disabled>
                  <CaretLeft weight="bold" />
                </IconButton>
              </div>
              <div className="rt-ds-lightbox-media">
                <div className="rt-ds-lightbox-viewport">
                  <img className="rt-ds-lightbox-img" src={GALLERY[0].src} alt={GALLERY[0].alt} draggable={false} />
                </div>
                <div className="rt-ds-lightbox-caption">{GALLERY[0].caption}</div>
              </div>
              <div className="rt-ds-lightbox-nav rt-ds-lightbox-nav-next">
                <IconButton priority="tertiary" radius="full" aria-label="Next" className="rt-ds-lightbox-control">
                  <CaretRight weight="bold" />
                </IconButton>
              </div>
            </div>
          </Theme>
        </Box>

        {PINS.map(([n, , , side]) => {
          const pin = pins[n];
          if (!pin) return null;
          const right = side === "right";
          return (
            <Box key={n}>
              <Box data-pin={n} style={{ ...dotStyle, left: pin.x, top: pin.y - 10 }}>{n}</Box>
              {side !== "on" && (
                <Box
                  style={hLine(
                    right
                      ? { left: GUTTER + FRAME_W + 4, top: pin.y, width: GUTTER - 26 }
                      : { left: 22, top: pin.y, width: GUTTER - 26 },
                  )}
                />
              )}
            </Box>
          );
        })}
      </Box>
    </Box>
  );
}

function AnatomyDemo() {
  const [open, setOpen] = useState(false);
  return (
    <>
      {/* A trigger is its content's width. Left to the Section's column it stretches to the full page
          measure, which reads as a slab rather than as a button. */}
      <Box style={{ display: "flex", width: "fit-content" }}>
        <Button data-testid="anatomy-trigger" onClick={() => setOpen(true)}>Open the viewer</Button>
      </Box>
      <Lightbox isOpen={open} onOpenChange={setOpen} media={GALLERY} hasZoom />
    </>
  );
}

/* ---- Anatomy — the labelled diagram only; the token spec closes Usage ----- */
export const Anatomy: Story = {
  render: (_args, { globals }) => (
    <HexThemeKey.Provider value={`${globals.accent}-${globals.appearance}-${globals.contrast}`}>
      <Page>
        <PageHeader title="Lightbox · Anatomy" standfirst={DEFINITION} />
        <Section title="Anatomy" lead="A fullscreen stage over a scrim, holding the media plus floating controls.">
          <AnatomyDiagram />
          <AnatomyLegend parts={ANATOMY_PARTS} />
          <Caption>
            The stage above is a <strong>still</strong> — the viewer's own part classes and tokens, held on the
            page so the callouts have something to point at. The real one is a fullscreen portal that would
            cover this legend on open.
          </Caption>
          <AnatomyDemo />
          <Caption>The viewer opens over the whole page. Press <Code>Esc</Code>, click the backdrop, or use the close button to dismiss.</Caption>
        </Section>
      </Page>
    </HexThemeKey.Provider>
  ),
  play: async ({ canvasElement }) => {
    // Every numbered part in the legend has a callout ON the still — a numbered legend with nothing to
    // point at is the defect this diagram exists to avoid.
    const still = canvasElement.querySelector<HTMLElement>('[data-testid="anatomy-still"]');
    if (!still) throw new Error("the Anatomy diagram must render the still stage");
    const pins = canvasElement.querySelectorAll("[data-pin]");
    if (pins.length !== ANATOMY_PARTS.length)
      throw new Error(`expected ${ANATOMY_PARTS.length} callout pins on the still; got ${pins.length}`);
    // Passive: the trigger exists and is a real button (opening is exercised in _internal, to avoid a flash).
    const trigger = canvasElement.querySelector<HTMLButtonElement>('[data-testid="anatomy-trigger"]');
    if (!trigger) throw new Error("the Anatomy demo must render an open trigger");
  },
};

/* ---- Usage — scenarios, then the closing live token spec ----------------- */
function SingleDemo() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Thumbnail data-testid="single-thumb" src={thumb(THUMB_HUES[0])} alt="Aurora over a lake" label="aurora.jpg" onClick={() => setOpen(true)} />
      <Lightbox isOpen={open} onOpenChange={setOpen} media={GALLERY[0]} hasZoom />
    </>
  );
}

function GalleryDemo() {
  const lightbox = useLightbox({ media: GALLERY, hasZoom: true });
  return (
    <>
      <Flex gap="3" wrap="wrap" data-testid="gallery-thumbs">
        {GALLERY.map((m, i) => (
          <Thumbnail key={i} src={thumb(THUMB_HUES[i])} alt={m.alt} label={`photo-${i + 1}.jpg`} onClick={() => lightbox.open(i)} />
        ))}
      </Flex>
      {lightbox.element}
    </>
  );
}

export const Usage: Story = {
  render: (_args, { globals }) => (
    <Page>
      <PageHeader title="Lightbox · Usage" standfirst={DEFINITION} />
      <Section title="A single image" lead="Give any trigger an onClick that opens the Lightbox with one media item. A Thumbnail is the natural launcher.">
        <SingleDemo />
        <Caption>Click the tile to open. With <Code>hasZoom</Code>, double-click the image (or press <Code>+</Code>) to zoom, then drag to pan.</Caption>
      </Section>

      <Rule />

      <Section title="A gallery, via useLightbox" lead="The useLightbox hook manages open + index for you — call open(i) from each trigger. Prev/next, the counter, and the polite announcer come with gallery mode.">
        <GalleryDemo />
        <Caption>Each tile opens the gallery at its index. Arrow keys move between images; each change is announced politely to screen readers.</Caption>
      </Section>

      <Rule />

      {/* The closing reference section. The provider is what makes the table live: every measured row
          re-reads its value when this key changes, so an accent/appearance flip re-resolves the spec. */}
      <HexThemeKey.Provider value={`${globals.accent}-${globals.appearance}-${globals.contrast}`}>
        <Section title="Tokens" lead="The lightbox is a permanently-dark surface — its controls, counter, and caption re-resolve to light inside a dark Theme.">
          <TokenGroup
            label="STAGE + CONTROLS"
            blurb="The backdrop and the control discs share the scrim; the glyphs, counter, and caption read from the strong text role, which re-resolves to near-white inside the viewer's dark Theme. Both scrim surfaces exist only while the viewer is open, so a real viewer is opened off-screen for the few frames the reading takes and closed again."
            specimen={<Muted>(the viewer is a fullscreen portal — open one above to see these live)</Muted>}
          >
            {/* Both surfaces live INSIDE the open viewer, and an open viewer cannot be LEFT on this page:
                it is a modal, so its overlay locks body scroll and its content aria-hides every sibling —
                this docs page would stop scrolling. So the measurement host opens a real viewer, holds it
                only until the two rows below have read it (they join a barrier; the host cannot take it
                down until both have released), and then unmounts it. The viewer portals to the document
                body rather than into the host, so the host adopts what it created and hides it in the same
                commit it appeared in — it never paints, holds no focus, and is gone before axe runs. */}
            <MeasuredSpec
              transient
              render={() => (
                <Lightbox isOpen onOpenChange={() => {}} media={GALLERY} />
              )}
            >
              <MeasuredRow
                part="Backdrop"
                note="The full-viewport dim behind the stage — Radix paints it on the dialog overlay itself."
                token="--ds-scrim"
                select=".rt-BaseDialogOverlay:has(.rt-ds-lightbox)"
                prop="background-color"
              />
              <MeasuredRow
                part="Control disc"
                note="The same scrim behind each floating control, so a glyph stays legible over any media."
                token="--ds-scrim"
                select=".rt-ds-lightbox-control"
                prop="background-color"
              />
            </MeasuredSpec>
            <NoteRow part="Glyph / counter / caption" value="--ds-text-strong (near-white in the dark Theme)" radix="--gray-12" />
            <NoteRow part="Backdrop blur" value="backdrop-filter: blur(2px)" />
            <NoteRow part="Modal motion" value="inherited from the shared dialog motion bindings (no override)" />
            <NoteRow part="Image zoom transition" value="--ds-duration-overlay · --ds-ease-standard (off while dragging / reduced-motion)" />
          </TokenGroup>
        </Section>
      </HexThemeKey.Provider>
    </Page>
  ),
  play: async ({ canvasElement }) => {
    // The token table's EVIDENCE, asserted at runtime — both scrim surfaces were read off a real viewer
    // that was opened, measured and closed again. `awaitMeasuredRows` waits for every row to record its
    // evidence AND for that mount cycle to have closed, so everything below sees the page whole again.
    const rows = await awaitMeasuredRows(canvasElement);
    if (rows.measured !== 2 || rows.unproven !== 0) {
      throw new Error(`expected 2 measured / 0 unproven token rows, got ${rows.measured} / ${rows.unproven}`);
    }
    // The page survived the read: a fullscreen modal viewer locks body scroll and aria-hides every
    // sibling while it is up, so the teardown is asserted rather than assumed.
    if (document.body.hasAttribute("data-scroll-locked")) {
      throw new Error("body is still scroll-locked after the measurement cycle — the viewer never closed");
    }
    const stillHidden = Array.from(document.body.children).filter((n) => n.hasAttribute("aria-hidden")).length;
    if (stillHidden) throw new Error(`${stillHidden} body children are still aria-hidden after the measurement cycle`);
    if (document.querySelector(".rt-ds-lightbox")) throw new Error("the viewer must not stay mounted on view");

    // Passive: the gallery renders a launcher per image (opening is exercised in _internal).
    const thumbs = canvasElement.querySelectorAll('[data-testid="gallery-thumbs"] .rt-ds-thumbnail');
    if (thumbs.length !== GALLERY.length) throw new Error(`expected ${GALLERY.length} gallery launchers`);
    const single = canvasElement.querySelector('[data-testid="single-thumb"] button.rt-ds-thumbnail-open');
    if (!single) throw new Error("the single-image demo must render an open trigger");
  },
};

/* ---- Keyboard ------------------------------------------------------------ */
export const Keyboard: Story = {
  render: () => (
    <Page>
      <PageHeader title="Lightbox · Keyboard" standfirst={DEFINITION} />
      <Section title="Keyboard" lead="The Radix Dialog traps focus while open; navigation and zoom are keyboard-operable.">
        <Box style={{ borderRadius: "var(--ds-radius-4)", border: "1px solid var(--ds-stroke-weak)", overflow: "hidden" }}>
          <KeyRow keys={["Esc"]} action={<>Close the viewer (Radix Dialog owns this — no duplicate handler).</>} src="radix" />
          <KeyRow keys={["Tab"]} action={<>Move through the controls (close, prev, next) within the focus trap.</>} src="radix" />
          <KeyRow keys={["←", "→"]} action={<>Previous / next image in gallery mode.</>} src="system" />
          <KeyRow keys={["+", "="]} action={<>Zoom in (images, when <Code>hasZoom</Code>) — zoom is fully keyboard-operable, not mouse-only.</>} src="system" />
          <KeyRow keys={["-"]} action={<>Zoom out.</>} src="system" />
          <KeyRow keys={["0"]} action={<>Reset zoom + pan to fit.</>} src="system" />
        </Box>
        <Caption>Prev / next are <Code>disabled</Code> at the range ends but stay mounted, so Tab focus never falls out of the dialog to the page body.</Caption>
      </Section>
    </Page>
  ),
};

/* ---- Properties ---------------------------------------------------------- */
const PROPS: PropDef[] = [
  { name: "isOpen", type: "boolean", desc: <>Whether the lightbox is open.</>, source: "Lightbox.tsx" },
  { name: "onOpenChange", type: "(open) => void", desc: <>Called with <Code>false</Code> on Escape, backdrop click, or the close button.</>, source: "Lightbox.tsx" },
  { name: "media", type: "LightboxMedia | LightboxMedia[]", desc: <>One item, or an array for gallery mode. Each: <Code>{`{ src, alt, caption?, type? }`}</Code>.</>, source: "Lightbox.tsx" },
  { name: "index", type: "number", desc: <>Current gallery index — provide to control the component.</>, source: "Lightbox.tsx" },
  { name: "defaultIndex", type: "number", def: "0", desc: <>Initial index for uncontrolled gallery usage.</>, source: "Lightbox.tsx" },
  { name: "onIndexChange", type: "(i) => void", desc: <>Called when the index changes via prev/next.</>, source: "Lightbox.tsx" },
  { name: "hasZoom", type: "boolean", def: "false", desc: <>Enable zoom (double-click or <Code>+</Code>/<Code>-</Code>/<Code>0</Code>; images only) + drag-to-pan.</>, source: "Lightbox.tsx" },
  { name: "hasAutoPlay", type: "boolean", def: "false", desc: <>Autoplay video on open.</>, source: "Lightbox.tsx" },
];

/* ---- Props ---------------------------------------------------------- */
type PropsArgs = { mode: "single" | "gallery"; hasZoom: boolean; hasAutoPlay: boolean };

function PropsDemo({ mode, hasZoom, hasAutoPlay }: PropsArgs) {
  const [open, setOpen] = useState(false);
  const media = mode === "gallery" ? GALLERY : GALLERY[0];
  return (
    <>
      <Button data-testid="pg-trigger" onClick={() => setOpen(true)}>Open the {mode} lightbox</Button>
      <Lightbox isOpen={open} onOpenChange={setOpen} media={media} hasZoom={hasZoom} hasAutoPlay={hasAutoPlay} />
    </>
  );
}

export const Props: StoryObj<PropsArgs> = {
  args: { mode: "gallery", hasZoom: true, hasAutoPlay: false },
  argTypes: {
    mode: { control: "inline-radio", options: ["single", "gallery"], description: "One image, or a navigable gallery.", table: { category: "Content" } },
    hasZoom: { control: "boolean", description: "Double-click / +/-/0 to zoom images; drag to pan.", table: { category: "Behavior" } },
    hasAutoPlay: { control: "boolean", description: "Autoplay video on open (no effect on images).", table: { category: "Behavior" } },
  },
  parameters: { controls: { disable: false } },
  render: (args: PropsArgs) => (
    <Page maxWidth="none">
      <PageHeader title="Lightbox · Props" standfirst={DEFINITION} />
      <PropsDemo {...args} />
      <Muted>Gallery mode adds prev/next, the counter, and the polite announcer.</Muted>
      <PropsLead />
      <Rule />
      <Section title="Props reference" lead={<>Every prop <Code>Lightbox</Code> accepts. The <Code>useLightbox</Code> hook wraps <Code>isOpen</Code>/<Code>index</Code> and returns <Code>open</Code>/<Code>getTriggerProps</Code>.</>}>
        <PropTable rows={PROPS} />
      </Section>
    </Page>
  ),
};

/* ---- History ------------------------------------------------------------- */
export const History: Story = {
  render: () => (
    <Page>
      <PageHeader title="Lightbox · History" standfirst={DEFINITION} />
      <Section title="Decisions" lead="The rulings this component encodes.">
        <Flex direction="column" gap="3">
          <Decision id="[[lightbox-viewer]] · Radix Dialog shell">
            The viewer is built on the
            <strong> raw Radix Themes <Code>Dialog</Code></strong> — composed directly, as <Code>AlertDialog</Code>
            does. Radix gives
            <strong> focus-trap + scroll-lock + Escape + backdrop-dismiss</strong> for free — no hand-rolled
            scroll-lock. <strong>Close-focus is the exception</strong> and is ours (see [[focus-return-on-close]] below). Modal enter/exit motion is <strong>inherited</strong> from
            the shared dialog motion bindings — no per-component override. The backdrop paints from <Code>--ds-scrim</Code>.
          </Decision>
          <Decision id="[[lightbox-viewer]] · keyboard zoom">
            Zoom is <strong>fully keyboard-operable</strong>: <Code>+</Code> / <Code>=</Code> zoom in, <Code>-</Code> zoom out,
            <Code> 0</Code> reset — alongside double-click. Zoom/pan stays disabled for <Code>video</Code>, and resets on every
            index / src change.
          </Decision>
          <Decision id="[[lightbox-viewer]] · defaultIndex + hasAutoPlay">
            <Code>defaultIndex</Code> (uncontrolled starting index) and <Code>hasAutoPlay</Code> (video autoplay)
            are both <strong>documented and wired</strong>.
          </Decision>
          <Decision id="[[lightbox-viewer]] · announcer + disabled-not-unmounted nav">
            Gallery navigation is announced <strong>politely</strong> via our <Code>useAnnounce</Code>
            (<Code>"{"{alt}"}, N of M"</Code> / <Code>"Image N of M"</Code>), fired <strong>only on an in-session
            index change</strong> — not on mount, open, or close (the dialog's <Code>aria-label</Code> already
            names the current image on open). Prev/next are <Code>disabled</Code> at the range ends but stay
            <strong> mounted</strong> — unmounting the focused control would drop focus to <Code>&lt;body&gt;</Code>.
          </Decision>
          <Decision id="[[focus-return-on-close]] · close returns focus to the opener">
            Radix hands close-focus to a registered <Code>Dialog.Trigger</Code>. The viewer opens from
            <Code> isOpen</Code> and registers none, so Radix cancelled the focus scope&rsquo;s own restore and
            replaced it with nothing: focus landed on <Code>&lt;body&gt;</Code> after both Escape and the close
            button. The shared <Code>useReturnFocus</Code> hook captures the opener and puts focus back.
          </Decision>
          <Decision id="[[disabled-paint-arm]] · the disabled arrow looks disabled">
            The control&rsquo;s scrim-disc rule outranked Radix&rsquo;s disabled skin, so an end-of-range arrow
            painted exactly like a live one and <Code>cursor</Code> was the only difference — a channel no
            touch or keyboard user receives. The disc stays; the glyph now drops to
            <Code> --ds-icon-disabled</Code>.
          </Decision>
        </Flex>
      </Section>
      <Rule />
      <Section title="Changelog" lead="Notable changes, newest first — grows as the component evolves.">
        <Flex direction="column" gap="3">
          <Decision id="0.9.0 · focus + disabled fixes">
            Closing now returns focus to whatever opened the viewer, on Escape and on the close button
            (<strong>[[focus-return-on-close]]</strong>) — it previously went to <Code>&lt;body&gt;</Code>. A disabled prev/next arrow
            now paints from <Code>--ds-icon-disabled</Code> instead of the live glyph colour
            (<strong>[[disabled-paint-arm]]</strong>).
          </Decision>
          <Decision id="0.9.0">
            Initial <Code>System/Lightbox</Code> — the fullscreen viewer: the Radix Dialog shell,
            gallery model (clamped index, disabled-not-unmounted nav, counter), captions, zoom/pan with
            <strong> keyboard zoom</strong>, the polite announcer on index change, and
            <Code> defaultIndex</Code> / <Code>hasAutoPlay</Code>. Ships with the <Code>useLightbox</Code> companion hook.
          </Decision>
        </Flex>
      </Section>
    </Page>
  ),
};
