import type { Meta, StoryObj } from "@storybook/react-vite";
import { type ReactNode, useLayoutEffect, useRef, useState } from "react";
import { Box, Code, Flex, Grid, Text } from "@radix-ui/themes";
import { FileInput } from "./FileInput";
import {
  AnatomyLegend, Caption, Decision, DoDont, DODONT_LABEL, dotStyle, HexThemeKey, hLine, type KeyBinding, KeyRow,
  MeasuredRow, MeasuredSpec, Mono, Muted, NoteRow, Page, PageHeader, PropsLead, type PropDef, PropTable,
  Rule, Scenario, Section, tick, TokenGroup,
} from "./_storyKit";
import { assertMeasuredRows } from "../../foundations/_assert";

/** The one definition of this component — the standfirst every page of it opens with. */
const DEFINITION = (
  <>
    Reach for a FileInput when the user attaches <strong>files</strong> — a résumé, product images, a
    signed contract. The <strong>dropzone</strong> is the default: a large target that accepts a
    drag-and-drop OR a click to browse. Use the compact <Code>mode="input"</Code> in dense forms where a
    full drop surface is too heavy.
  </>
);

/* The DOCS stories (History · Anatomy · Usage · Keyboard · Props) — static and calm on view. The
   behavioral plays live in `_fileinput.stories.tsx` (_internal/FileInput behavior). FileInput is
   controlled, so every live specimen wraps a tiny stateful <Demo>. */

type Val = File | File[] | undefined;

/** A controlled demo wrapper — a committed selection re-renders the specimen. */
function Demo({ initial, ...props }: Omit<React.ComponentProps<typeof FileInput>, "onValueChange"> & { initial?: Val }) {
  const [v, setV] = useState<Val>(initial ?? props.value);
  return <FileInput {...props} value={v} onValueChange={setV} />;
}

/* ---- a house-faithful pre-selected value for the "filled" specimens (constructed lazily in the browser) */
const seededPdf = (): File => new File([new Uint8Array(2400)], "quarterly-report.pdf", { type: "application/pdf" });
const seededPng = (): File => new File([new Uint8Array(184_320)], "hero-banner.png", { type: "image/png" });

/* ========================================================================== */

const meta: Meta<typeof FileInput> = {
  title: "Components/Typed Entry/FileInput",
  component: FileInput,
  parameters: {
    controls: { disable: true },
    docs: {
      description: {
        component:
          "**FileInput** — a file picker with a default **dropzone**, on the shared **Field** shell. The one " +
          "component earning genuinely net-new UI (a visual drop surface); everything else is assembled " +
          "from shipped parts. The native `<input type=file>` is the operable control AND the tab stop (not a " +
          "hand-rolled `role=button` div), clip-hidden so its focus lights the zone's ring. The size formatter " +
          "+ the partial-acceptance validator are pure " +
          "helpers. Three feedback surfaces keep it honest: a polite success announce, a visible `role=status` " +
          "for rejections + partial acceptance, and the standing `Field.validation` channel.",
      },
    },
  },
};
export default meta;
type Story = StoryObj<typeof FileInput>;

/* ---- anatomy parts ------------------------------------------------------- */
const DROPZONE_PARTS: [number, string, string][] = [
  [1, "Label", "the field’s name — sets the accessible name via htmlFor → the native input’s id (shared Field.Label)"],
  [2, "Upload glyph", "a centered Phosphor UploadSimple in --ds-icon-neutral — the visual identity of the target"],
  [3, "Primary prompt", "“Drag files here, or browse” — the word “browse” is a styled, NON-interactive accent cue (the whole label is the target; a real button would double-activate)"],
  [4, "Constraints line", "a --ds-text-weak line stating the rules up front (“PNG or JPG, up to 5 MB”), derived from accept / maxSize; also wired into aria-describedby"],
  [5, "Clear-all ✕", "a NEUTRAL IconButton (aria-label “Remove all files”), a REAL tab stop — the only way to clear a selection"],
  [6, "Status (surface 2)", "a visible role=status below the control — rejections + partial acceptance, colour-not-alone (icon + text)"],
];

/* ---- Anatomy diagram -----------------------------------------------------
   The dropzone's parts are STACKED inside one surface, so the callouts sit in gutters either side of the
   specimen and run a leader into the part they name. Two gutters, not one: the glyph, the prompt and the
   constraints line are ~24px apart, and a single column of dots would draw them on top of each other —
   so the label, the prompt and the status region are named from the left, the glyph, the constraints
   line and the clear ✕ from the right.

   Positions are MEASURED off the live specimens. The zone's padding, the glyph, the prompt's leading and
   the whole surface's height follow the control lane (the size toolbar), so every y here moves when the
   reader changes size; none of them can be written down.

   TWO specimens, because a resting dropzone cannot hold all six parts at once — and neither gap is
   cosmetic:
     • a committed dropzone REPLACES the glyph + prompt + constraints line with the file list, so ⑤ (the
       clear ✕, which only exists once something is selected) is pinned on a second, filled surface. It
       is also the only place on the page the dropzone's own filled state is shown.
     • ⑥ the status region is ALWAYS mounted — a live region that appears already holding its message is
       dropped by most screen readers — but it stays empty and zero-height until a file is rejected, and
       nothing on a docs page may drive a rejection. Its callout marks WHERE it opens, flush under the
       control, which is the part of it that is true at rest. */

const SPEC_W = 400;
const GUTTER = 56;
/** Where the leaders turn their corner inside a gutter — one shared column per side, so the elbows read
 *  as a set. */
const ELBOW = 30;
/** Closest two dots in one gutter may sit, centre to centre. A dot is 20px wide. */
const MIN_GAP = 26;

type PinSpec = {
  n: number;
  /** Which gutter the callout sits in. */
  side: "left" | "right";
  /** The element this callout names, resolved inside the frame. */
  sel: string;
  /** Where down that element's box the leader lands (0 = its top edge, 0.5 = its middle). */
  at?: number;
};

type Measured = { dotY: number; partY: number; edgeX: number };

/** A specimen with numbered callouts in the gutters either side, measured off the live DOM. */
function PinFrame({ pins, width, children }: { pins: PinSpec[]; width: number; children: ReactNode }) {
  const frame = useRef<HTMLDivElement>(null);
  const body = useRef<HTMLDivElement>(null);
  const [measured, setMeasured] = useState<Record<number, Measured>>({});
  const [frameW, setFrameW] = useState(0);

  useLayoutEffect(() => {
    const f = frame.current;
    const b = body.current;
    if (!f || !b) return;
    const measure = () => {
      const fb = f.getBoundingClientRect();
      const next: Record<number, Measured> = {};
      for (const side of ["left", "right"] as const) {
        const found: Array<{ n: number; partY: number; edgeX: number }> = [];
        for (const p of pins.filter((q) => q.side === side)) {
          const el = b.querySelector<HTMLElement>(p.sel);
          if (!el) continue;
          const box = el.getBoundingClientRect();
          found.push({
            n: p.n,
            partY: Math.round(box.top - fb.top + box.height * (p.at ?? 0.5)),
            edgeX: Math.round((side === "left" ? box.left : box.right) - fb.left),
          });
        }
        // Sorted by where the parts ACTUALLY are, not by declaration order. One forward pass over the
        // sorted list keeps any two dots in a gutter a legible distance apart; the leader turns a corner
        // to reach its part, so the dot moves and the line still lands.
        found.sort((x, y) => x.partY - y.partY);
        let floor = -Infinity;
        for (const m of found) {
          const dotY = Math.max(m.partY, floor + MIN_GAP);
          floor = dotY;
          next[m.n] = { dotY, partY: m.partY, edgeX: m.edgeX };
        }
      }
      const w = Math.round(fb.width);
      // Only write when something moved — the frame's own size feeds this observer otherwise.
      setMeasured((prev) => (JSON.stringify(prev) === JSON.stringify(next) ? prev : next));
      setFrameW((prev) => (prev === w ? prev : w));
    };
    measure();
    let raf = 0;
    const ro = new ResizeObserver(() => { cancelAnimationFrame(raf); raf = requestAnimationFrame(measure); });
    ro.observe(f);
    ro.observe(b);
    return () => { cancelAnimationFrame(raf); ro.disconnect(); };
  }, [pins]);

  return (
    <Box style={{ overflowX: "auto" }}>
      <Box ref={frame} style={{ position: "relative", width: "fit-content", margin: "0 auto", paddingLeft: GUTTER, paddingRight: GUTTER }}>
        <Box ref={body} style={{ width }}>{children}</Box>
        {pins.map(({ n, side }) => {
          const m = measured[n];
          if (!m) return null;
          const right = side === "right";
          const elbowX = right ? frameW - ELBOW : ELBOW;
          const dotX = right ? frameW - 20 : 0;
          return (
            <Box key={n}>
              <Box data-pin={n} style={{ ...dotStyle, left: dotX, top: m.dotY - 10 }}>{n}</Box>
              {/* out of the dot… */}
              <Box style={hLine(right ? { left: elbowX, top: m.dotY, width: dotX - elbowX } : { left: 22, top: m.dotY, width: elbowX - 22 })} />
              {/* …down the gutter's own column to the part's line (zero-height when they already agree)… */}
              {m.dotY !== m.partY && (
                <Box style={tick({ left: elbowX, top: Math.min(m.dotY, m.partY), height: Math.abs(m.dotY - m.partY) })} />
              )}
              {/* …and into the part. */}
              <Box
                style={hLine(
                  right
                    ? { left: m.edgeX + 4, top: m.partY, width: Math.max(elbowX - m.edgeX - 4, 0) }
                    : { left: elbowX, top: m.partY, width: Math.max(m.edgeX - elbowX - 4, 0) },
                )}
              />
            </Box>
          );
        })}
      </Box>
    </Box>
  );
}

const DROPZONE_PINS: PinSpec[] = [
  { n: 1, side: "left", sel: '[data-spec="rest"] [data-field-part="label"]' },
  { n: 2, side: "right", sel: '[data-spec="rest"] .rt-ds-fileinput-dropzone-content svg' },
  { n: 3, side: "left", sel: '[data-spec="rest"] .rt-ds-fileinput-prompt' },
  { n: 4, side: "right", sel: '[data-spec="rest"] .rt-ds-fileinput-hint' },
  // The clear ✕ sits at the top-right of a FILLED surface — the second specimen below.
  { n: 5, side: "right", sel: '[data-spec="filled"] .rt-ds-fileinput-clear' },
  // The status region is empty at rest, so the leader lands on its TOP edge: where it opens.
  { n: 6, side: "left", sel: '[data-spec="rest"] .rt-ds-fileinput-status', at: 0 },
];

const SPEC_LABEL = { color: "var(--ds-text-weak)", letterSpacing: "0.06em" } as const;

function DropzoneDiagram() {
  return (
    <PinFrame pins={DROPZONE_PINS} width={SPEC_W}>
      <Flex direction="column" gap="4">
        <Flex direction="column" gap="2" data-spec="rest">
          <Text size="1" weight="bold" style={SPEC_LABEL}>EMPTY</Text>
          <Demo label="Product images" accept=".png,.jpg" maxSize={5 * 1024 * 1024} isMultiple maxFiles={5} />
        </Flex>
        <Flex
          direction="column"
          gap="2"
          data-spec="filled"
          data-size-lesson="inset affordances hold step 1 — they garnish the field, not the row"
        >
          <Text size="1" weight="bold" style={SPEC_LABEL}>WITH A FILE</Text>
          <Demo label="Product images" accept=".png,.jpg" maxSize={5 * 1024 * 1024} isMultiple maxFiles={5} initial={seededPng()} />
        </Flex>
      </Flex>
    </PinFrame>
  );
}

/** Anatomy — the drop surface, the compact row, and the three feedback surfaces. The live token spec
 *  lives in Usage. */
export const Anatomy: Story = {
  render: (_args, { globals }) => (
    <HexThemeKey.Provider value={`${globals.accent}-${globals.appearance}-${globals.contrast}`}>
      <Page>
        <PageHeader title="FileInput · Anatomy" standfirst={DEFINITION} />
        <Section title="Anatomy — the dropzone" lead="The default surface: a large dashed target from --ds-stroke-weak over --ds-bg-subtle, with a centered upload glyph, a primary prompt, and a constraints line derived from accept/maxSize. The whole surface is a <label> wrapping the clip-hidden native input, so a pointer click anywhere opens the picker and the input’s focus lights the zone’s ring. Shown empty and with a file, because a committed surface swaps the glyph, prompt and constraints line for the file list — one specimen cannot carry all six parts.">
          <DropzoneDiagram />
          <AnatomyLegend parts={DROPZONE_PARTS} />
          <Caption>
            Only the <strong>label</strong> is required; the <strong>constraints line</strong> appears when{" "}
            <Code>accept</Code> / <Code>maxSize</Code> are set, and the <strong>clear ✕</strong> appears
            once a file is selected. Callout <strong>⑥</strong> marks where the <strong>status</strong>{" "}
            opens: that region is always mounted (a live region that appears already holding its message
            goes unread by most screen readers) but stays empty and zero-height until a file is rejected.
          </Caption>
        </Section>

        <Rule />

        <Section title="Anatomy — the compact row (mode=input)" lead="A tighter affordance for dense forms: a real System Button (“Choose file”) that calls the input, the filename or a muted hint, and the same neutral clear ✕. Here the BUTTON is the tab stop and the input sits at tabIndex=-1 — the stated focus-mechanism delta from the dropzone.">
          <Box
            data-size-lesson="inset affordances hold step 1 — they garnish the field, not the row"
            style={{ maxWidth: 420 }}
          >
            <Demo label="Résumé" mode="input" accept=".pdf" initial={seededPdf()} />
          </Box>
          <Caption>The compact row shows a committed file inline with its size; the dropzone shows it centered in the surface.</Caption>
        </Section>

        <Rule />

        <Section title="Three feedback surfaces" lead="The model that keeps the field honest. A success, a partial/rejection, and a standing error are DIFFERENT signals and never share a surface.">
          <Grid columns={{ initial: "1", sm: "3" }} gapX="6" gapY="4">
            <Flex direction="column" gap="2">
              <Text size="1" weight="bold" style={{ color: "var(--ds-text-weak)", letterSpacing: "0.06em" }}>1 · SUCCESS — polite announce</Text>
              <Muted>A clean selection announces via the shared live region: “Added report.pdf, 2.4 MB” / “3 files selected”. Nothing is painted — the file simply appears.</Muted>
            </Flex>
            <Flex direction="column" gap="2">
              <Text size="1" weight="bold" style={{ color: "var(--ds-text-weak)", letterSpacing: "0.06em" }}>2 · PARTIAL / REJECTED — visible status</Text>
              <Muted>A component-local role=status (also VISIBLE) leads with the win: “Added 2 files. ‘cat.gif’ wasn’t added — PNG or JPG only.” Colour-not-alone (icon + text). Not an alert — partial acceptance isn’t blocking.</Muted>
            </Flex>
            <Flex direction="column" gap="2">
              <Text size="1" weight="bold" style={{ color: "var(--ds-text-weak)", letterSpacing: "0.06em" }}>3 · STANDING — validation</Text>
              <Muted>A caller-supplied validation rides Field.Message (role=alert) — the accent-aware family border + message, the same as any Field control. A form owns submit-time “required, but empty”.</Muted>
              <Box style={{ maxWidth: 300 }}>
                <Demo label="Contract (required)" validation={{ tone: "error", message: "Attach the signed contract to continue." }} />
              </Box>
            </Flex>
          </Grid>
        </Section>
      </Page>
    </HexThemeKey.Provider>
  ),
  play: async ({ canvasElement }) => {
    // Every numbered part in the legend has a callout ON the specimen — a numbered legend with nothing
    // to point at is the defect this diagram exists to avoid. Passive: nothing here drives the field.
    const pins = canvasElement.querySelectorAll("[data-pin]");
    if (pins.length !== DROPZONE_PARTS.length)
      throw new Error(`expected ${DROPZONE_PARTS.length} callout pins on the specimen; got ${pins.length}`);
  },
};

/** Usage — when to reach for FileInput, the field kept in context, and the live token spec that closes
 *  the page. */
export const Usage: Story = {
  // Semantic step-11 error text on the invalid-field wash: #ce2c31 on #fbe8ea = 4.42, under axe's 4.5.
  // Surfaced by narrowing the do/don't carve-out to the DO/DON'T word alone. Same unruled tone-on-tint
  // gap as Callout/Badge — it needs a ruling on the tone tokens, not a story-level fix.
  parameters: { a11y: { context: { exclude: [DODONT_LABEL, "[style*='--ds-text-error']", '[data-field-part="message"][data-tone="error"]'] } } },
  render: (_args, { globals }) => (
    <Page>
      <PageHeader title="FileInput · Usage" standfirst={DEFINITION} />

      <Section title="A realistic form" lead="A FileInput sits in a form like any Field control — a label, an optional description, and the constraints stated up front so the user knows the rules before they pick.">
        <Box style={{ maxWidth: 460, padding: 20, borderRadius: "var(--ds-radius-4)", border: "1px solid var(--ds-stroke-weak)", background: "var(--ds-bg-subtle)" }}>
          <Flex direction="column" gap="4">
            <Demo
              label="Portfolio"
              description="Attach up to five work samples."
              accept=".png,.jpg,.pdf"
              maxSize={10 * 1024 * 1024}
              isMultiple
              maxFiles={5}
            />
            <Demo label="Cover letter" mode="input" accept=".pdf,.docx" description="Optional — PDF or Word." />
          </Flex>
        </Box>
        <Caption>The dropzone carries the multi-file upload; the compact row is the right weight for a single optional attachment beside it.</Caption>
      </Section>

      <Rule />

      <Section title="Dropzone vs. compact" lead="Pick the surface that matches the density of the form.">
        <Grid columns={{ initial: "1", sm: "2" }} gapX="6" gapY="4">
          <Scenario label="DROPZONE (default)" caption={<>A prominent target — an <strong>upload-first</strong> screen, a media library, a multi-file attach. Supports drag-and-drop.</>}>
            <Box style={{ maxWidth: 300 }}><Demo label="Assets" accept="image/*" isMultiple /></Box>
          </Scenario>
          <Scenario label="COMPACT (mode=input)" caption={<>A single, secondary attachment inside a <strong>dense</strong> form — a receipt, an avatar. No drop surface; a Button opens the picker.</>}>
            <Box style={{ maxWidth: 300 }}><Demo label="Receipt" mode="input" accept=".pdf" /></Box>
          </Scenario>
        </Grid>
      </Section>

      <Rule />

      <Section title="Show what was dropped, don’t swallow it" lead="The single most important rule this component enforces: when SOME files pass and some don’t, commit the good ones and SAY which were skipped — never silently drop them, and never turn a partial success into a blocking red error.">
        <Grid columns={{ initial: "1", sm: "2" }} gap="3">
          <DoDont kind="do" bare note="A partial accept commits the valid files and shows a visible, polite status that leads with the win and names the rejected file (“Added 2 files. ‘cat.gif’ wasn’t added — PNG or JPG only.”). The user sees exactly what happened.">
            <Box style={{ maxWidth: 320 }}>
              <Demo label="Images (do)" accept=".png,.jpg" isMultiple />
            </Box>
          </DoDont>
          <DoDont kind="dont" bare note="Painting the whole field with a red validation error when only ONE of several files was the wrong type — the user attached three good images and reads “error”. The standing red channel is for a real, whole-field problem, not a partial accept.">
            <Box style={{ maxWidth: 320 }}>
              <Demo label="Images (don’t)" accept=".png,.jpg" isMultiple validation={{ tone: "error", message: "Invalid files." }} />
            </Box>
          </DoDont>
        </Grid>
        <Caption>Reserve <Code>validation</Code> for a genuine whole-field problem — a required field left empty at submit, a caller-detected error — not for the per-file rejections the visible status already reports.</Caption>
      </Section>

      <Rule />

      <HexThemeKey.Provider value={`${globals.accent}-${globals.appearance}-${globals.contrast}`}>
        <Section title="Tokens" lead="Every resting colour below is MEASURED off a real dropzone rendered for the purpose — the property is read from the element that paints it and checked against the token the row names, so a row can disagree with the component. The net-new is only the surface geometry + the accent-preview drag-over + the :focus-within ring; every colour is an existing --ds-* role (zero net-new tokens).">
          <Flex direction="column" gap="4">
            <TokenGroup label="DROP SURFACE (rest)" blurb="A dashed target over a subtle fill; the upload glyph + constraints line in neutral tones.">
              <MeasuredSpec render={() => <FileInput label="Measurement" accept="image/png,image/jpeg" maxSize={5_000_000} onValueChange={() => {}} />}>
                <MeasuredRow
                  part="Border (dashed)" note="The dashed edge that reads as a target."
                  token="--ds-stroke-weak" select=".rt-ds-fileinput-dropzone" prop="border-top-color"
                />
                <MeasuredRow
                  part="Surface fill" note="The zone's resting back."
                  token="--ds-bg-subtle" select=".rt-ds-fileinput-dropzone" prop="background-color"
                />
                <MeasuredRow
                  part="Hover fill" note="Only under a pointer that can hover — the rule sits inside @media (hover: hover)."
                  token="--ds-fill-hover" select=".rt-ds-fileinput-dropzone" prop="background-color" state="hover"
                />
                <MeasuredRow
                  part="Upload glyph" note="The arrow at the top of the zone."
                  token="--ds-icon-neutral" select=".rt-ds-fileinput-dropzone-content svg" prop="fill"
                />
                <MeasuredRow
                  part="Constraints line" note="The accepted types and size limit, under the prompt."
                  token="--ds-text-weak" select=".rt-ds-fileinput-hint" prop="color"
                />
              </MeasuredSpec>
              <NoteRow part="Radius · padding" value="--ds-radius-4 · --space-6 / --space-4" />
            </TokenGroup>
            <TokenGroup label="DRAG-OVER + FOCUS" blurb="Drag-over reuses the accent PREVIEW tier (the same a3 role Calendar uses) — accent-aware, zero net-new tokens; focus is the system focus ring ([[focus-ring]]).">
              <NoteRow part="Drag-over fill" value="painted only while a file is over the zone, so there is no resting element to read it from" radix="--ds-fill-accent-weak" />
              <NoteRow part="Drag-over border" value="the dashed edge turns accent for the same moment" radix="--ds-stroke-accent" />
              <NoteRow part="Focus ring" value="the accent with --ds-stroke-focus-stack stacked on it, 2px, 2px outside the zone ([[focus-ring]]). Lit by the clip-hidden input inside the zone (:focus-within), which a resting read cannot reach" radix="--ds-stroke-focus" />
            </TokenGroup>
            <TokenGroup label="STATUS (surface 2)" blurb="The visible rejection/partial status — the warning family (a heads-up), colour-not-alone with a Warning glyph. NOT the red error vocabulary surface 3 owns.">
              <NoteRow part="Status text + glyph" value="the status line is empty until a file is rejected, so there is no resting element to read it from" radix="--ds-text-warning" />
              <NoteRow part="Selected filename" value="--ds-text-strong · size in --ds-text-weak" />
            </TokenGroup>
          </Flex>
        </Section>
      </HexThemeKey.Provider>
    </Page>
  ),
  play: async ({ canvasElement }) => {
    // The token table's EVIDENCE, asserted at runtime: every measured row read a real dropzone node,
    // resolved its claim somewhere else, and the two agree. Five rows, none unproven.
    const rows = assertMeasuredRows(canvasElement);
    if (rows.measured !== 5 || rows.unproven !== 0) {
      throw new Error(`expected 5 measured / 0 unproven token rows, got ${rows.measured} / ${rows.unproven}`);
    }
  },
};

/* ---- Keyboard contract --------------------------------------------------- */
const DROPZONE_KEYS: KeyBinding[] = [
  { keys: ["Tab"], action: <>Move focus to the <strong>drop surface</strong> — the native input is the tab stop (the zone’s <Code>:focus-within</Code> ring lights).</>, src: "system" },
  { keys: ["Enter", "Space"], action: <>Open the file picker (native input behavior — no hand-rolled handler needed).</>, src: "system" },
  { keys: ["Tab"], action: <>From the surface, move to the <strong>clear-all ✕</strong> when a file is selected (a real tab stop), then on.</>, src: "system" },
];
const COMPACT_KEYS: KeyBinding[] = [
  { keys: ["Tab"], action: <>Move focus to the <strong>“Choose file” Button</strong> — the tab stop in compact mode (the input sits at <Code>tabIndex=-1</Code>).</>, src: "system" },
  { keys: ["Enter", "Space"], action: <>Activate the Button → open the file picker.</>, src: "system" },
];

/** Keyboard — the complete key → action contract for both modes. */
export const Keyboard: Story = {
  render: () => (
    <Page>
      <PageHeader title="FileInput · Keyboard" standfirst={DEFINITION} />
      <Section title="Keyboard" lead={<>The full key → action contract. The native <Code>&lt;input type=file&gt;</Code> carries Enter/Space/focus/disabled for free — so keyboard operation needs no hand-rolled handler, and drag-and-drop is a pointer-only extra (no second tab stop, WCAG 2.1.1).</>}>
        <Flex direction="column" gap="4">
          <Box style={{ maxWidth: 360 }}>
            <Demo label="Attachment" accept=".pdf" description="Tab to the surface, then Enter to browse." />
          </Box>
          <TokenGroup label="DROPZONE (mode=dropzone)">
            {DROPZONE_KEYS.map((b, i) => <KeyRow key={i} {...b} />)}
          </TokenGroup>
          <TokenGroup label="COMPACT (mode=input)">
            {COMPACT_KEYS.map((b, i) => <KeyRow key={i} {...b} />)}
          </TokenGroup>
        </Flex>
        <Caption><strong>Pointer</strong> — click anywhere on the drop surface to browse, or drag files onto it (the surface lights with the accent-preview tier while a drag is over it).</Caption>
      </Section>
    </Page>
  ),
};

/* ---- Props ---------------------------------------------------------- */
const PROPS: PropDef[] = [
  { name: "label", type: "ReactNode", desc: <>Required. Sets the accessible name (via htmlFor → the native input’s id).</>, source: "FileInput.tsx" },
  { name: "value", type: "File | File[] | undefined", desc: <>Controlled selection — a single File, a File[] (when <Code>isMultiple</Code>), or <Code>undefined</Code> when empty. <Code>null</Code>-free.</>, source: "FileInput.tsx" },
  { name: "onValueChange", type: "(v: File | File[] | undefined) => void", desc: <>Required. Fires with the committed file(s), or <Code>undefined</Code> when cleared / nothing valid was picked.</>, source: "FileInput.tsx" },
  { name: "accept", type: "string", desc: <>Accepted types — the HTML accept format (“.pdf,.docx”, “image/*”, “image/png,image/jpeg”). Drives both the native filter and the constraints line.</>, source: "FileInput.tsx" },
  { name: "isMultiple", type: "boolean", def: "false", desc: <>Allow more than one file. When true, <Code>value</Code>/<Code>onValueChange</Code> use <Code>File[]</Code>.</>, source: "FileInput.tsx" },
  { name: "maxSize", type: "number (bytes)", desc: <>Maximum size per file; oversize files are rejected on surface 2.</>, source: "FileInput.tsx" },
  { name: "maxFiles", type: "number", desc: <>Maximum number of files (only when <Code>isMultiple</Code>). Extra files are sliced off with a status.</>, source: "FileInput.tsx" },
  { name: "mode", type: `"dropzone" | "input"`, def: `"dropzone"`, desc: <>The visual surface. Dropzone (default) is the large drag-and-drop target; input is the compact Button row.</>, source: "FileInput.tsx" },
  { name: "placeholder", type: "string", desc: <>Overrides the resting prompt (dropzone) / the empty hint (compact).</>, source: "FileInput.tsx" },
  { name: "size", type: `"1" | "2" | "3"`, def: `"1"`, desc: <>Control size. Unset, it resolves from the global <Code>uiSize</Code> control lane (default <Code>small</Code> → <Code>1</Code>).</>, source: "FileInput.tsx" },
  { name: "isRequired", type: "boolean", def: "false", desc: <>Sets <Code>required</Code>/<Code>aria-required</Code> + a subtle <Code>*</Code>. Does NOT paint an error at rest — a form owns submit-time validation.</>, source: "FileInput.tsx" },
  { name: "disabled", type: "boolean", def: "false", desc: <>Dims the control and makes it inert (native disabled — unless paired with a reason).</>, source: "FileInput.tsx" },
  { name: "disabledReason", type: "string", desc: <>A non-empty reason SOFT-disables (aria-disabled + reason tooltip + glyph) so the reason stays perceivable on hover and focus.</>, source: "FileInput.tsx" },
  { name: "info / endSlot / description / validation", type: "Field props", desc: <>The shared <Code>Field</Code> shell. <Code>validation</Code> is the STANDING channel (surface 3); rejections + partial acceptance surface separately (surface 2).</>, source: "FileInput.tsx" },
  { name: "width", type: "number | string", desc: <>Constrain the field width.</>, source: "FileInput.tsx" },
];

type PropsArgs = {
  label: string;
  mode: "dropzone" | "input";
  accept: string;
  isMultiple: boolean;
  maxSizeMB: number;
  description: string;
  validation: { tone: "error" | "warning" | "success" | "info"; message: string } | undefined;
  size: "auto" | "1" | "2" | "3";
  isRequired: boolean;
  disabled: boolean;
  disabledReason: string;
};

/** Props — the live, args-driven field (drive every prop from Controls; drop or browse real files). */
export const Props: StoryObj<PropsArgs> = {
  args: {
    label: "Attachment",
    mode: "dropzone",
    accept: ".png,.jpg,.pdf",
    isMultiple: false,
    maxSizeMB: 5,
    description: "Type isn’t your only option — drop a file or browse.",
    validation: undefined,
    // "auto" (size unset) is the default so the field tracks the global uiSize toolbar out of the box.
    size: "auto",
    isRequired: false,
    disabled: false,
    disabledReason: "",
  },
  argTypes: {
    label: { control: "text", table: { category: "Field" } },
    mode: { control: "inline-radio", options: ["dropzone", "input"], table: { category: "Variant" } },
    accept: { control: "text", table: { category: "Behaviour" } },
    isMultiple: { control: "boolean", table: { category: "Behaviour" } },
    maxSizeMB: { name: "maxSize (MB)", control: { type: "number", min: 0 }, table: { category: "Behaviour" } },
    description: { name: "description (helper)", control: "text", table: { category: "Field" } },
    validation: {
      control: "inline-radio",
      options: ["none", "error", "warning", "success", "info"],
      mapping: {
        none: undefined,
        error: { tone: "error", message: "Attach a file to continue." },
        warning: { tone: "warning", message: "Double-check this attachment." },
        success: { tone: "success", message: "Attachment looks good." },
        info: { tone: "info", message: "You can change this later." },
      },
      table: { category: "Field" },
    },
    size: { control: "inline-radio", options: ["auto", "1", "2", "3"], description: '"auto" tracks the global uiSize toolbar (unset → the control lane); a step (1–3) pins the field.', table: { category: "Variant" } },
    isRequired: { control: "boolean", table: { category: "Field" } },
    disabled: { control: "boolean", table: { category: "Variant" } },
    disabledReason: { control: "text", table: { category: "Variant" } },
  },
  parameters: { controls: { disable: false } },
  render: (args: PropsArgs) => {
    function PropsDemo() {
      const [v, setV] = useState<Val>(undefined);
      return (
        <FileInput
          value={v}
          onValueChange={setV}
          label={args.label}
          mode={args.mode}
          accept={args.accept || undefined}
          isMultiple={args.isMultiple}
          maxSize={args.maxSizeMB ? args.maxSizeMB * 1024 * 1024 : undefined}
          description={args.description || undefined}
          validation={args.validation}
          size={args.size === "auto" ? undefined : args.size}
          isRequired={args.isRequired}
          disabled={args.disabled}
          disabledReason={args.disabledReason || undefined}
        />
      );
    }
    return (
      <Page maxWidth="none">
        <PageHeader title="FileInput · Props" standfirst={DEFINITION} />
        <Box p="5" style={{ maxWidth: 440 }}>
          <PropsDemo />
          <Box mt="3"><Caption>Drop a file on the surface or click to browse. Set <Mono>accept</Mono> to “.png,.jpg” then drop a mismatched file to see the visible partial/rejection status.</Caption></Box>
        </Box>
        <PropsLead />
        <Rule />
        <Section title="Props reference" lead={<>Every prop <Code>FileInput</Code> accepts — the file wire contract, the constraints, and the shared <Code>Field</Code> shell.</>}>
          <PropTable rows={PROPS} />
        </Section>
      </Page>
    );
  },
};

/** History — the rulings this component encodes and a changelog of how it changes over time. */
export const History: Story = {
  render: () => (
    <Page>
      <PageHeader title="FileInput · History" standfirst={DEFINITION} />
      <Section title="Decisions" lead="The rulings this component encodes.">
        <Flex direction="column" gap="3">
          <Decision id="[[catalog-as-specification]] · reuse">
            <strong>Composed from existing parts.</strong> The two pure helpers are{" "}
            <Code>formatFileSize</Code> + <Code>validateFiles</Code> (<Code>src/utils/*</Code>), with node-lane
            logic coverage (including the mixed partial-acceptance case). The shell is the shared <Code>Field</Code>,
            the clear ✕ is <Code>IconButton</Code>, the success announce is the singleton live-region announcer.
          </Decision>
          <Decision id="[[file-input]] · native input is the control">
            <strong>The native <Code>&lt;input type="file"&gt;</Code> is the operable control AND the tab stop</strong>{" "}
            — not a hand-rolled <Code>role="button"</Code> div. The native input ships
            Enter/Space/focus/disabled/label-association for free. It is <strong>clip-hidden</strong> (never <Code>display:none</Code>, which
            would drop it from the tab order + a11y tree) and takes its id / describedby / invalid from the Field;
            the drop surface is wrapped in a <Code>&lt;label&gt;</Code> so a pointer click opens the picker and the
            input's focus lights the zone's ring via <Code>:focus-within</Code>.
          </Decision>
          <Decision id="Dropzone default">
            <strong><Code>mode="dropzone"</Code> is the default</strong> — the drop surface is the richer, more
            discoverable affordance. <Code>mode="input"</Code> is the compact Button row; the focus mechanism differs by mode
            (input-is-tab-stop in dropzone vs Button-is-tab-stop in compact).
          </Decision>
          <Decision id="Three feedback surfaces">
            <strong>Three surfaces, never crossed.</strong> (1) A clean selection announces{" "}
            <strong>politely</strong> via the shared <Code>useAnnounce</Code> (“Added report.pdf, 2.4 MB”). (2)
            Rejections + <strong>partial acceptance</strong> surface in a component-local{" "}
            <Code>role="status"</Code> that is ALSO <strong>visible text</strong> below the control — status, NOT
            alert (partial acceptance isn't a blocking failure; the user must SEE which files were dropped). (3) A{" "}
            <strong>standing</strong> whole-field invalid rides <Code>Field.validation</Code> (<Code>role="alert"</Code>),
            for a caller <Code>validation</Code>. On a partial accept we COMMIT the accepted subset AND surface the
            rejection on (2) — never double-announcing (the local region self-announces; <Code>useAnnounce</Code>{" "}
            owns only clean-success + clear-all).
          </Decision>
          <Decision id="Replace + clear-all">
            <strong>Replace-never-append; a single clear-all.</strong> Every selection/drop REPLACES value (the
            native input's <Code>.value</Code> is reset so re-picking the same file re-fires). Per-file remove isn't
            built yet; the clear-all ✕ is <strong>NEUTRAL</strong> (not <Code>tone="danger"</Code> —
            clearing an un-uploaded selection is trivially reversible) and a <strong>REAL tab stop</strong> (it's
            the only way to clear, so unlike the date/time ✕ it earns the tab order — the same logic that puts
            DateInput's calendar button in the tab order).
          </Decision>
          <Decision id="Drag = pointer-only">
            <strong>Drag-and-drop is a pointer-only enhancement.</strong> The zone toggles a{" "}
            <Code>data-drop-target</Code> attribute on <Code>dragenter/over/leave/drop</Code>; keyboard users are
            fully served by the same input, so there is <strong>no second tab stop</strong> (WCAG 2.1.1).
          </Decision>
          <Decision id="[[disabled-reason]] · Soft-disable with reason">
            <strong>Soft-disable-with-reason.</strong> <Code>disabled</Code> + a non-empty{" "}
            <Code>disabledReason</Code> soft-disables (<Code>aria-disabled</Code> + a reason tooltip + a quiet Info
            glyph) instead of natively disabling, so the reason stays perceivable on hover AND keyboard focus. The
            operable control + the drag handlers early-return while soft. Inherited from the <Code>Field</Code> family.
          </Decision>
        </Flex>
      </Section>

      <Rule />

      <Section title="Changelog" lead="Notable changes, newest first — grows as the component evolves.">
        <Flex direction="column" gap="3">
          <Decision id="0.9.0">
            Initial <Code>System/FileInput</Code> — the dropzone-default file picker: the native-input-as-control
            model, the accent-preview drag-over, the three feedback surfaces, replace-never-append + a neutral
            clear-all, the compact <Code>mode="input"</Code> Button row, and full Field-shell validation +{" "}
            <Code>disabledReason</Code>. Stories: History · Anatomy · Usage · Keyboard · Props.
          </Decision>
          <Decision id="Deferred → per-file rows">
            <strong>Per-file removable rows + per-file progress</strong> — not built yet; a single
            clear-all is the whole remove story for now.
          </Decision>
          <Decision id="Deferred → server actions">
            <strong>The <Code>changeAction</Code> async-optimistic layer</strong> (<Code>isLoading</Code> / a
            Spinner while an upload settles) — a react-server-action optimistic-UI affordance not built yet;
            revisit if the app layer needs it.
          </Decision>
          <Decision id="Deferred → InputGroup">
            <strong>InputGroup composition</strong> — parked until <Code>InputGroup</Code> ships.
          </Decision>
        </Flex>
      </Section>
    </Page>
  ),
};
