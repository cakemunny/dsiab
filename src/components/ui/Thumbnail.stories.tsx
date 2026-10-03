import { useLayoutEffect, useRef, useState, type ReactNode } from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { Box, Code, Flex, Grid } from "@radix-ui/themes";
import { Thumbnail } from "./Thumbnail";
import { Button } from "./Button";
import { useLightbox } from "./useLightbox";
import {
  AnatomyLegend, Caption, Decision, DoDont, DODONT_LABEL, dotStyle, HexThemeKey, hLine, MeasuredRow, MeasuredSpec,
  Mono, Muted, NoteRow, Page, PageHeader, PropsLead, type PropDef, PropTable, Rule, Scenario, Section, TokenGroup,
} from "./_storyKit";
import { assertMeasuredRows } from "../../foundations/_assert";

/** The component's definition — one source, referenced by the header of every story on this page. */
const DEFINITION = <>A 64px square preview for an image attachment, driven entirely by props: a skeleton while uploading with no URL yet, the image on success, a spinner over the image while it processes, or a placeholder glyph when there is no image or the source fails to load. An optional remove ✕ and an open trigger compose on top.</>;

/* ---- sample images (inline data URIs → deterministic in the headless test browser) --------- */
const photo = (a: string, b: string) =>
  "data:image/svg+xml," +
  encodeURIComponent(
    `<svg xmlns='http://www.w3.org/2000/svg' width='128' height='128'>` +
      `<defs><linearGradient id='g' x1='0' y1='0' x2='1' y2='1'>` +
      `<stop offset='0' stop-color='${a}'/><stop offset='1' stop-color='${b}'/></linearGradient></defs>` +
      `<rect width='128' height='128' fill='url(#g)'/></svg>`,
  );
const PHOTO_A = photo("#6d78ff", "#b98bff");
const PHOTO_B = photo("#ff9a6d", "#ffd36d");
const PHOTO_C = photo("#3ec7a8", "#57d6ff");
// A deliberately-malformed data URI — decoding fails → onError fires → the placeholder shows.
const BROKEN = "data:image/png;base64,notarealimage";

/* ---- Usage: the tokens Thumbnail paints from, measured off a rendered tile ----
   Each row names an element and a property and reads it off a real rendered Thumbnail, then checks it
   against the token it claims — so a row can disagree with the component. Invoked at the END of the
   Usage story, as its closing reference section. */
function ThumbnailTokens() {
  return (
    <TokenGroup
      label="FRAME + STATES"
      blurb="The square frame is a neutral surface; the placeholder glyph and the inset image border are muted neutrals. No image sampling — the remove ✕ gets its contrast from a scrim disc."
      specimen={
        <Flex
          gap="3"
          align="end"
          data-size-lesson="the thumbnail's remove ✕ holds step 1 — it garnishes the frame, it doesn't join the ambient row"
        >
          <Thumbnail src={PHOTO_A} alt="A sample photo" onRemove={() => {}} />
          <Thumbnail alt="No image" />
        </Flex>
      }
    >
      <MeasuredSpec
        render={() => (
          <Flex
            gap="3"
            align="end"
            data-size-lesson="the thumbnail's remove ✕ holds step 1 — it garnishes the frame, it doesn't join the ambient row"
          >
            <Thumbnail src={PHOTO_A} alt="A sample photo" onRemove={() => {}} />
            <Thumbnail alt="No image" />
          </Flex>
        )}
      >
        <MeasuredRow
          part="Frame surface"
          note="Sits behind the image, the skeleton and the placeholder alike, and clips all three to the radius."
          token="--ds-fill-weak"
          select=".rt-ds-thumbnail-frame"
          prop="background-color"
        />
        <MeasuredRow
          part="Placeholder glyph"
          note="Shown for a missing src and for one that fails to load."
          token="--ds-icon-neutral"
          select=".rt-ds-thumbnail-placeholder"
          prop="color"
        />
        <MeasuredRow
          part="Remove-✕ disc"
          note="Painted inside a permanently-dark theme, so the glyph stays light in both app modes — which is why this row resolves to the dark scale's value, not the page's."
          token="--ds-scrim"
          select=".rt-ds-thumbnail-removebtn"
          prop="background-color"
        />
      </MeasuredSpec>
      {/* The inset edge is drawn as a box-shadow, so there is no colour longhand on the element for a
          row to read against a token; it is stated rather than measured. The upload overlay takes the
          same scrim role as the ✕ disc above, and since 2026-09-02 it resolves in the same pinned dark
          scale too — see the row below. */}
      <NoteRow part="Inset image border" value="a 1px inset edge, drawn as a box-shadow rather than a border" radix="--ds-stroke-strong" />
      <NoteRow part="Upload overlay" value="the same scrim role as the ✕ disc, and resolved in the same permanently-dark scale — the spinner paints from currentColor, so in the page's own appearance it was near-black ink on a dark disc (2.03:1, under the 3:1 that 1.4.11 wants for a non-text indicator)" radix="--ds-scrim" />
      <NoteRow part="Size" value="64 × 64 px (fixed square)" />
      <NoteRow part="Radius" value="--ds-radius-3" radix="--radius-3" />
    </TokenGroup>
  );
}

const ANATOMY_PARTS: [number, string, string][] = [
  [1, "Frame", "the 64px square — a neutral --ds-fill-weak surface that clips the image to the radius and backs the skeleton / placeholder."],
  [2, "Media", "the <img> (object-fit: cover) on success, a Radix Skeleton while uploading with no URL yet, or a placeholder glyph when there's no image OR the src fails to load."],
  [3, "Remove ✕", "optional — a scrim-backed IconButton, top-right, named 'Remove {label}'. A sibling of the open trigger, so removal and open coexist. Light glyph on a dark --ds-scrim disc in both app modes."],
  [4, "Open trigger", "optional — when onClick is set the whole tile becomes a keyboard-operable <button> ('Open {label}'); the frame hoists its focus ring."],
];

/* ---- Anatomy diagram ------------------------------------------------------
   The tile is a fixed 64px square and three of its four parts fill it — the frame, the media inside it,
   and the open <button> wrapping that media all share one box. So the callouts can't be told apart by
   which box they land on; they are told apart by WHERE on the tile's edge each leader arrives. The left
   gutter names the stack from top to bottom (frame's top edge · the media's centre line · the open
   trigger's bottom edge) and the remove ✕ — the one part with its own corner — is named from the right.

   One gutter would not do: the ✕ sits ~18px above the media's centre line, so its dot and the media's
   would overlap in a single column.

   Positions are MEASURED off the live specimen. The ✕ is an IconButton whose box follows the control
   lane, so its centre moves when the reader changes size. */

const GUTTER = 56; // the band either side of the tile that the dots + leaders live in
const DOT = 20;    // dotStyle's diameter
const LEADER = 34; // the horizontal run from a dot to the tile edge it names

/** [callout, selector inside the specimen, where on that element to anchor, which gutter]. */
const PINS: [number, string, "top" | "center" | "bottom", "left" | "right"][] = [
  [1, ".rt-ds-thumbnail-frame", "top", "left"],
  [2, ".rt-ds-thumbnail-img", "center", "left"],
  [4, "button.rt-ds-thumbnail-open", "bottom", "left"],
  [3, ".rt-ds-thumbnail-removebtn", "center", "right"],
];

function AnatomyDiagram() {
  const frame = useRef<HTMLDivElement>(null);
  const specimen = useRef<HTMLDivElement>(null);
  const [at, setAt] = useState<Record<number, { x: number; y: number }>>({});
  /** One x per gutter, so each column's dots stack — taken off the outermost part on that side. */
  const [cols, setCols] = useState<{ left: number; right: number } | null>(null);

  useLayoutEffect(() => {
    const f = frame.current;
    const s = specimen.current;
    if (!f || !s) return;
    const measure = () => {
      const fr = f.getBoundingClientRect();
      const next: Record<number, { x: number; y: number }> = {};
      let leftmost = Infinity;
      let rightmost = -Infinity;
      for (const [n, sel, anchor, side] of PINS) {
        const el = s.querySelector<HTMLElement>(sel);
        if (!el) continue;
        const r = el.getBoundingClientRect();
        const x = Math.round((side === "left" ? r.left : r.right) - fr.left);
        const y = Math.round(
          (anchor === "top" ? r.top : anchor === "bottom" ? r.bottom : r.top + r.height / 2) - fr.top,
        );
        next[n] = { x, y };
        if (side === "left") leftmost = Math.min(leftmost, x);
        else rightmost = Math.max(rightmost, x);
      }
      // Only write when something moved — the frame's own size feeds this observer otherwise.
      setAt((prev) => (JSON.stringify(prev) === JSON.stringify(next) ? prev : next));
      setCols(
        Number.isFinite(leftmost) && Number.isFinite(rightmost)
          ? { left: leftmost - LEADER - DOT, right: rightmost + LEADER }
          : null,
      );
    };
    measure();
    let raf = 0;
    const ro = new ResizeObserver(() => { cancelAnimationFrame(raf); raf = requestAnimationFrame(measure); });
    ro.observe(f);
    ro.observe(s);
    return () => { cancelAnimationFrame(raf); ro.disconnect(); };
  }, []);

  return (
    <Box style={{ overflowX: "auto" }}>
      <Box ref={frame} style={{ position: "relative", width: "fit-content", padding: `16px ${GUTTER}px` }}>
        {/* flex, not the default block: an inline-flex tile in a block box sits on a baseline strut, which
            would leave a few px of phantom descender under the specimen for every leader to measure past. */}
        <Box
          ref={specimen}
          data-testid="anatomy"
          data-size-lesson="the thumbnail's remove ✕ holds step 1 — it garnishes the frame, it doesn't join the ambient row"
          style={{ display: "flex", width: "fit-content" }}
        >
          <Thumbnail data-testid="anatomy-tile" src={PHOTO_A} alt="A sample photo" label="beach.jpg" onClick={() => {}} onRemove={() => {}} />
        </Box>
        {PINS.map(([n, , , side]) => {
          const a = at[n];
          if (!a || !cols) return null;
          const right = side === "right";
          const dotX = right ? cols.right : cols.left;
          return (
            <Box key={n}>
              <Box data-pin={n} style={{ ...dotStyle, left: dotX, top: a.y - DOT / 2 }}>{n}</Box>
              <Box
                style={hLine(
                  right
                    ? { left: a.x, top: a.y, width: dotX - a.x }
                    : { left: dotX + DOT, top: a.y, width: a.x - dotX - DOT },
                )}
              />
            </Box>
          );
        })}
      </Box>
    </Box>
  );
}

/* ---- Live Usage specimens ------------------------------------------------
   The ✕ is CONDITIONAL — it appears only on a tile given `onRemove`, and disappears again while a tile is
   disabled. These specimens prove that by holding real state instead of no-op handlers: the ✕ removes its
   own tile, an openable tile launches a real Lightbox, and the still-uploading tile carries no ✕ at all
   because nothing has been given to remove yet. A Reset appears once a row is short, so the page recovers.
   Kept handler-driven (no play drives them), so viewing the page never animates anything. */

const ATTACHMENTS = [
  { name: "moodboard.png", src: PHOTO_A, alt: "Moodboard" },
  { name: "hero.jpg", src: PHOTO_B, alt: "Hero shot" },
  { name: "clip.mp4", src: PHOTO_C, alt: "Processing", isLoading: true },
];

function AttachmentRow() {
  const [kept, setKept] = useState(ATTACHMENTS);
  return (
    <Flex
      gap="3"
      wrap="wrap"
      align="center"
      data-testid="attachments"
      data-size-lesson="the thumbnail's remove ✕ holds step 1 — it garnishes the frame, it doesn't join the ambient row"
    >
      {kept.map((f) => (
        <Thumbnail
          key={f.name}
          src={f.src}
          alt={f.alt}
          label={f.name}
          isLoading={f.isLoading}
          onRemove={() => setKept((k) => k.filter((x) => x !== f))}
        />
      ))}
      {/* No onRemove — an upload with no URL yet has nothing to take back, so this tile shows no ✕. */}
      <Thumbnail isLoading alt="Uploading" label="upload.raw" />
      {kept.length < ATTACHMENTS.length && (
        <Button type="button" priority="tertiary" onClick={() => setKept(ATTACHMENTS)}>Reset</Button>
      )}
    </Flex>
  );
}

const PREVIEWS = [
  { name: "beach.jpg", src: PHOTO_A, alt: "A beach at golden hour", removable: true },
  { name: "sunset.jpg", src: PHOTO_B, alt: "A sunset over water", removable: false },
];

function OpenablePreviews() {
  const [kept, setKept] = useState(PREVIEWS);
  const lightbox = useLightbox({
    media: kept.map((p) => ({ src: p.src, alt: p.alt, caption: p.name })),
    hasZoom: true,
  });
  return (
    <>
      <Flex
        gap="3"
        wrap="wrap"
        align="center"
        data-testid="openable"
        data-size-lesson="the thumbnail's remove ✕ holds step 1 — it garnishes the frame, it doesn't join the ambient row"
      >
        {kept.map((p, i) => (
          <Thumbnail
            key={p.name}
            src={p.src}
            alt={p.alt}
            label={p.name}
            onClick={() => lightbox.open(i)}
            {...(p.removable ? { onRemove: () => setKept((k) => k.filter((x) => x !== p)) } : {})}
          />
        ))}
        {kept.length < PREVIEWS.length && (
          <Button type="button" priority="tertiary" onClick={() => setKept(PREVIEWS)}>Reset</Button>
        )}
      </Flex>
      {lightbox.element}
    </>
  );
}

/* The DO/DON'T pair below is about the ✕'s NAME, not about removing anything — so print the name each
   tile actually produces, read live off the rendered button. Hand-typing it would drift the moment the
   component's naming changes; this readout can't. */
function RemoveNameReadout({ children }: { children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  const [name, setName] = useState("");
  useLayoutEffect(() => {
    setName(ref.current?.querySelector(".rt-ds-thumbnail-removebtn")?.getAttribute("aria-label") ?? "");
  }, []);
  return (
    <Flex direction="column" gap="2" align="start">
      <Box ref={ref}>{children}</Box>
      <Caption>Its ✕ announces <Mono>{name || "—"}</Mono></Caption>
    </Flex>
  );
}

/* ========================================================================== */
const meta: Meta<typeof Thumbnail> = {
  title: "Components/Content/Thumbnail",
  component: Thumbnail,
  parameters: {
    controls: { disable: true },
    docs: {
      description: {
        component:
          "**Thumbnail** is a 64px square preview for an image attachment — a prop-driven state machine: a " +
          "**skeleton** while uploading with no URL yet, the **image** on success, an **upload spinner** over " +
          "the image while it processes, or a **placeholder glyph** when there's no image *or* the `src` fails " +
          "to load. An optional scrim-backed **remove ✕** and an optional **open** trigger compose on top. It " +
          "reuses our `IconButton`, Radix `Skeleton`/`Spinner`, and a raw Radix `Tooltip` for the `label` — " +
          "zero net-new tokens.",
      },
    },
  },
};
export default meta;
type Story = StoryObj<typeof Thumbnail>;

/* ---- Anatomy — the labelled diagram only; the token spec closes Usage ----- */
export const Anatomy: Story = {
  render: (_args, { globals }) => (
    <HexThemeKey.Provider value={`${globals.accent}-${globals.appearance}-${globals.contrast}`}>
      <Page>
        <PageHeader title="Thumbnail · Anatomy" standfirst={DEFINITION} />

        <Section title="Anatomy" lead="A neutral square frame holding one of four states, with optional overlaid controls.">
          <AnatomyDiagram />
          <AnatomyLegend parts={ANATOMY_PARTS} />
          <Caption>The <Code>label</Code> is the group's accessible name, the remove ✕'s name, and the hover tooltip. When there's no <Code>label</Code>, the <Code>alt</Code> names the group.</Caption>
        </Section>

        <Rule />

        <Section title="The four states" lead="Resolved by src + isLoading. A broken src falls back to the placeholder, not the browser's broken-image glyph.">
          <Box data-testid="states">
            <Grid columns={{ initial: "1", sm: "2" }} gapX="5" gapY="4">
              <Scenario label="SKELETON" caption="isLoading, no src yet — a shimmer while an upload has no URL.">
                <Thumbnail data-testid="s-skeleton" isLoading alt="Uploading" />
              </Scenario>
              <Scenario label="IMAGE" caption="A loaded src, object-fit: cover, with a 1px inset border.">
                <Thumbnail data-testid="s-image" src={PHOTO_B} alt="A sunset" />
              </Scenario>
              <Scenario label="UPLOADING" caption="isLoading with a src — a spinner over the image while it processes.">
                <Thumbnail data-testid="s-uploading" src={PHOTO_C} alt="Processing" isLoading />
              </Scenario>
              <Scenario label="PLACEHOLDER" caption="No src (or a broken one) — a muted image silhouette.">
                <Thumbnail data-testid="s-placeholder" alt="No image" />
              </Scenario>
            </Grid>
          </Box>
          <Caption>The rightmost tile below is fed a <strong>broken</strong> <Code>src</Code> — it falls back to the same placeholder rather than showing a broken-image icon.</Caption>
          <Flex gap="3" align="center" data-testid="broken-row" style={{ paddingTop: 4 }}>
            <Thumbnail data-testid="s-good" src={PHOTO_A} alt="Loads fine" />
            <Thumbnail data-testid="s-broken" src={BROKEN} alt="Broken source" />
          </Flex>
        </Section>
      </Page>
    </HexThemeKey.Provider>
  ),
  play: async ({ canvasElement }) => {
    // Passive structure reads only (no clicks/focus → nothing flashes on view).
    const states = canvasElement.querySelector('[data-testid="states"]')!;
    // Skeleton: no <img>, a Radix Skeleton present.
    const skeleton = states.querySelector<HTMLElement>('[data-testid="s-skeleton"]')!;
    if (skeleton.querySelector("img")) throw new Error("the skeleton state must not render an <img>");
    if (!skeleton.querySelector(".rt-Skeleton")) throw new Error("the skeleton state must render a Radix Skeleton");
    // Image: an <img> with the alt, plus the inset border.
    const image = states.querySelector<HTMLElement>('[data-testid="s-image"]')!;
    const img = image.querySelector<HTMLImageElement>("img.rt-ds-thumbnail-img");
    if (!img || img.alt !== "A sunset") throw new Error("the image state must render an <img> carrying its alt");
    if (!image.querySelector(".rt-ds-thumbnail-border")) throw new Error("a loaded image must show the 1px inset border");
    // Uploading: an <img> AND the spinner overlay.
    const uploading = states.querySelector<HTMLElement>('[data-testid="s-uploading"]')!;
    if (!uploading.querySelector("img")) throw new Error("the uploading state must still render the image");
    if (!uploading.querySelector(".rt-ds-thumbnail-uploading")) throw new Error("the uploading state must overlay a spinner");
    // Placeholder: no <img>, the placeholder glyph.
    const placeholder = states.querySelector<HTMLElement>('[data-testid="s-placeholder"]')!;
    if (placeholder.querySelector("img")) throw new Error("the placeholder state must not render an <img>");
    if (!placeholder.querySelector(".rt-ds-thumbnail-placeholder")) throw new Error("the placeholder state must render the placeholder glyph");
    // The group is named by the label (or alt).
    if (placeholder.getAttribute("role") !== "group" || placeholder.getAttribute("aria-label") !== "No image")
      throw new Error("a Thumbnail must be a role=group named by its label/alt");
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
      <PageHeader title="Thumbnail · Usage" standfirst={DEFINITION} />

      <Section title="An attachment row" lead="The canonical use — a row of upload previews, each removable, one still processing. This row is live: click a ✕ and that tile goes.">
        <AttachmentRow />
        <Caption>Each tile carries a <Code>label</Code> (the file name) — the tooltip on hover, and the accessible name for the tile and its ✕. The <strong>✕ is conditional</strong>: it appears only on a tile given <Code>onRemove</Code>, which is why the last tile — still uploading, with nothing yet to take back — doesn't have one.</Caption>
      </Section>

      <Rule />

      <Section title="Openable previews" lead="Give a tile onClick to make it a keyboard-operable open trigger. The whole square becomes a single <button>; a remove ✕ stays a separate control.">
        <OpenablePreviews />
        <Caption>Click either tile to open it full-screen in a <Code>Lightbox</Code> — arrow keys move between the two, Escape closes. Only the first tile is removable, so only it shows a ✕: an openable + removable tile is <strong>two</strong> tab stops (the open trigger, then the ✕), an openable-only tile is one. Tab to a tile and the frame shows its focus ring.</Caption>
      </Section>

      <Rule />

      <Section title="Do & Don't" lead="Keep the label meaningful; don't rely on the image alone. What's at stake is the name the tile and its ✕ announce — printed under each tile below, read live from the rendered control.">
        <Grid
          columns={{ initial: "1", sm: "2" }}
          gap="3"
          data-size-lesson="the thumbnail's remove ✕ holds step 1 — it garnishes the frame, it doesn't join the ambient row"
        >
          <DoDont kind="do" bare note="A real file name in label — the tile is nameable and removable without seeing the picture.">
            <RemoveNameReadout>
              <Thumbnail src={PHOTO_A} alt="Q3 launch moodboard" label="moodboard.png" onRemove={() => {}} />
            </RemoveNameReadout>
          </DoDont>
          <DoDont kind="dont" bare note="No alt and no label — the group falls back to a generic 'Thumbnail' and the ✕ can't say what it removes.">
            <RemoveNameReadout>
              <Thumbnail src={PHOTO_B} alt="" onRemove={() => {}} />
            </RemoveNameReadout>
          </DoDont>
        </Grid>
      </Section>

      <Rule />

      {/* The closing reference section. The provider is what makes the table live: every measured row
          re-reads its value when this key changes, so an accent/appearance flip re-resolves the spec. */}
      <HexThemeKey.Provider value={`${globals.accent}-${globals.appearance}-${globals.contrast}`}>
        <Section title="Tokens" lead="Read off a rendered tile and checked against the token each row names, so the table can disagree with the component.">
          <ThumbnailTokens />
        </Section>
      </HexThemeKey.Provider>
    </Page>
  ),
  play: async ({ canvasElement }) => {
    // Passive: every removable tile's ✕ is named "Remove …"; interactive tiles expose a real open <button>.
    const removes = Array.from(canvasElement.querySelectorAll<HTMLButtonElement>(".rt-ds-thumbnail-removebtn"));
    if (removes.length === 0) throw new Error("no removable thumbnails rendered");
    for (const x of removes)
      if (!x.getAttribute("aria-label")?.startsWith("Remove"))
        throw new Error(`a remove ✕ must be named "Remove …"; got "${x.getAttribute("aria-label")}"`);
    const openable = canvasElement.querySelector('[data-testid="openable"]')!;
    const opens = Array.from(openable.querySelectorAll<HTMLButtonElement>("button.rt-ds-thumbnail-open"));
    if (opens.length !== 2) throw new Error(`expected 2 open triggers; got ${opens.length}`);
    for (const o of opens)
      if (!o.getAttribute("aria-label")?.startsWith("Open"))
        throw new Error(`an open trigger must be named "Open …"; got "${o.getAttribute("aria-label")}"`);

    // The token table's EVIDENCE, asserted at runtime ([[measured-token-rows]]).
    const rows = assertMeasuredRows(canvasElement);
    if (rows.measured !== 3 || rows.unproven !== 0) {
      throw new Error(`expected 3 measured / 0 unproven token rows, got ${rows.measured} / ${rows.unproven}`);
    }
  },
};

/* ---- Properties ---------------------------------------------------------- */
const PROPS: PropDef[] = [
  { name: "src", type: "string", desc: <>Image source. Shows the image on success, or the placeholder on a load error / when absent.</>, source: "Thumbnail.tsx" },
  { name: "alt", type: "string", desc: <>Alt text for the image — required for accessibility when <Code>src</Code> is set.</>, source: "Thumbnail.tsx" },
  { name: "label", type: "string", desc: <>File name / label: the group's accessible name, the remove ✕'s name, and the hover tooltip. Not rendered as visible text.</>, source: "Thumbnail.tsx" },
  { name: "onRemove", type: "(e) => void", desc: <>When set, an overlaid scrim-backed remove ✕ appears top-right (a sibling of the open trigger).</>, source: "Thumbnail.tsx" },
  { name: "onClick", type: "(e) => void", desc: <>When set, the tile becomes a keyboard-operable open trigger (a real <Code>&lt;button&gt;</Code>).</>, source: "Thumbnail.tsx" },
  { name: "isLoading", type: "boolean", def: "false", desc: <>A skeleton shimmer (no <Code>src</Code> yet) or an upload spinner over the image (has <Code>src</Code>).</>, source: "Thumbnail.tsx" },
  { name: "isDisabled", type: "boolean", def: "false", desc: <>Dims the tile and removes the remove ✕ / open affordance.</>, source: "Thumbnail.tsx" },
  { name: "removeLabel", type: "string", def: "Remove {name}", desc: <>Override the remove ✕ accessible name.</>, source: "Thumbnail.tsx" },
];

/* ---- Props ---------------------------------------------------------- */
type PropsArgs = {
  state: "image" | "skeleton" | "uploading" | "placeholder" | "broken";
  label: string;
  removable: boolean;
  openable: boolean;
  isDisabled: boolean;
  onClick: () => void;
  onRemove: () => void;
};

export const Props: StoryObj<PropsArgs> = {
  args: {
    state: "image",
    label: "beach.jpg",
    removable: true,
    openable: false,
    isDisabled: false,
  },
  argTypes: {
    state: { control: "inline-radio", options: ["image", "skeleton", "uploading", "placeholder", "broken"], description: "Which state to render (broken → a bad src falling back to the placeholder).", table: { category: "State" } },
    label: { control: "text", description: "File name / accessible name / tooltip.", table: { category: "Content" } },
    removable: { control: "boolean", description: "Add the trailing remove ✕.", table: { category: "Content" } },
    openable: { control: "boolean", description: "Make the tile an open trigger (onClick).", table: { category: "Behavior" } },
    isDisabled: { control: "boolean", description: "Dim + disable.", table: { category: "State" } },
    onClick: { action: "opened", table: { category: "Events" } },
    onRemove: { action: "removed", table: { category: "Events" } },
  },
  parameters: { controls: { disable: false } },
  render: ({ state, label, removable, openable, isDisabled, onClick, onRemove }: PropsArgs) => {
    const src =
      state === "image" || state === "uploading" ? PHOTO_A : state === "broken" ? BROKEN : undefined;
    const isLoading = state === "skeleton" || state === "uploading";
    return (
      <Page maxWidth="none">
        <PageHeader title="Thumbnail · Props" standfirst={DEFINITION} />
        <Box style={{ padding: "12px 0" }}>
          <Thumbnail
            src={src}
            alt={label}
            label={label}
            isLoading={isLoading}
            isDisabled={isDisabled}
            {...(removable ? { onRemove } : {})}
            {...(openable ? { onClick } : {})}
          />
        </Box>
        <Muted>64 × 64 px · state = {state}</Muted>
        <PropsLead />
        <Rule />
        <Section title="Props reference" lead={<>Every prop <Code>Thumbnail</Code> accepts.</>}>
          <PropTable rows={PROPS} />
        </Section>
      </Page>
    );
  },
};

/* ---- History ------------------------------------------------------------- */
export const History: Story = {
  render: () => (
    <Page>
      <PageHeader title="Thumbnail · History" standfirst={DEFINITION} />

      <Section title="Decisions" lead="The rulings this component encodes.">
        <Flex direction="column" gap="3">
          <Decision id="[[thumbnail-preview]] · load-error fallback">
            A <strong>broken <Code>src</Code> falls back to the placeholder</strong>, not the browser's default
            broken-image glyph — the <Code>&lt;img&gt;</Code>'s <Code>onError</Code> drops to the placeholder, so
            a 404 reads as "no image", not "broken page". The <Code>errored</Code> flag resets on every
            <Code> src</Code> change, so a new URL gets a fresh attempt.
          </Decision>
          <Decision id="[[thumbnail-preview]] · scrim-backed remove ✕">
            No per-image luminance sampling. The ✕ sits on a
            <Code> --ds-scrim</Code> disc inside a permanently-dark <Code>&lt;Theme appearance="dark"&gt;</Code> (the
            scrim is dark in <em>both</em> app modes), so the glyph is always light via the system's own
            dark-scale tokens — no hardcoded white. <strong>Zero net-new tokens.</strong>
          </Decision>
          <Decision id="[[thumbnail-preview]] · prop-driven states">
            Four states resolved by props: <Code>isLoading</Code> without a <Code>src</Code> → a
            <strong> skeleton</strong>; a <Code>src</Code> → the <strong>image</strong> (with an
            <strong> upload spinner</strong> overlaid while <Code>isLoading</Code>); no <Code>src</Code> or a
            broken one → the <strong>placeholder</strong>. <Code>onClick</Code> makes the tile a keyboard-operable
            open trigger; <Code>onRemove</Code> adds the ✕. The two controls are <strong>siblings</strong>, never
            nested, so they coexist as valid HTML.
          </Decision>
          <Decision id="[[thumbnail-preview]] · reuse">
            Our <Code>IconButton</Code> + Phosphor <Code>X</Code> (remove) · Radix <Code>Skeleton</Code> /
            <Code>Spinner</Code> (loading) · raw Radix <Code>Tooltip</Code> for the <Code>label</Code>. A fixed 64px box (the square is a constant —
            no <Code>AspectRatio</Code> math).
          </Decision>
        </Flex>
      </Section>
      <Rule />
      <Section title="Changelog" lead="Notable changes, newest first — grows as the component evolves.">
        <Flex direction="column" gap="3">
          <Decision id="0.9.0">
            Initial <Code>System/Thumbnail</Code> — the 64px preview: the prop-driven state machine
            (skeleton / image / upload spinner / placeholder) plus the <strong><Code>onError</Code> fallback</strong>,
            a scrim-backed remove ✕, and an optional open trigger.
          </Decision>
        </Flex>
      </Section>
    </Page>
  ),
};
