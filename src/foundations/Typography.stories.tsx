import { useEffect, useLayoutEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { resolve, themeRoot } from "./_assert";
import { Caption, DoDont, Page, PageHeader, Rule, Section } from "../components/ui/_storyKit";

interface Role {
  key: string; label: string; weight: number; sample: string;
}
const RAMP: Role[] = [
  { key: "h1", label: "Heading 1", weight: 600, sample: "The quick brown fox" },
  { key: "h2", label: "Heading 2", weight: 600, sample: "The quick brown fox" },
  { key: "h3", label: "Heading 3", weight: 600, sample: "The quick brown fox" },
  { key: "h4", label: "Heading 4", weight: 600, sample: "The quick brown fox" },
  { key: "h5", label: "Heading 5", weight: 600, sample: "The quick brown fox" },
  { key: "md", label: "Medium (body)", weight: 400, sample: "The quick brown fox jumps over the lazy dog" },
  { key: "sm", label: "Small", weight: 400, sample: "The quick brown fox jumps over the lazy dog" },
  { key: "xs", label: "XS", weight: 400, sample: "The quick brown fox jumps over the lazy dog" },
];

// role -> native Radix size step (the mapping the tokens encode)
const ROLE_STEP: Record<string, number> = { h1: 8, h2: 7, h3: 6, h4: 5, h5: 3, md: 3, sm: 2, xs: 1 };

// Shared three-column specimen row — label · spec (both mono) · sample — so the ramp and
// the weights table below it read as one consistent table.
function SpecRow({ label, spec, specTitle, children }: { label: ReactNode; spec: ReactNode; specTitle?: string; children: ReactNode }) {
  return (
    <div style={{ display: "flex", alignItems: "baseline", gap: 20, padding: "8px 0", borderBottom: "1px solid var(--ds-stroke-weak)" }}>
      <div style={{ width: 150, flexShrink: 0, fontFamily: "var(--code-font-family)", fontSize: 12, color: "var(--ds-text-weak)" }}>{label}</div>
      <div style={{ width: 112, flexShrink: 0, fontFamily: "var(--code-font-family)", fontSize: 11, color: "var(--ds-text-weak)" }} title={specTitle}>{spec}</div>
      <div style={{ flex: 1, minWidth: 0 }}>{children}</div>
    </div>
  );
}

function Row({ r }: { r: Role }) {
  // Read the rendered size/line-height back off the specimen so the metrics
  // always reflect the live tokens — never a hand-typed value that can drift.
  const ref = useRef<HTMLDivElement>(null);
  const [metrics, setMetrics] = useState("");
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const cs = getComputedStyle(el);
    const size = Math.round(parseFloat(cs.fontSize));
    const lead = Math.round(parseFloat(cs.lineHeight));
    setMetrics(`${size}/${lead}px · ${r.weight}`);
  }, [r]);
  return (
    <SpecRow label={r.label} spec={metrics} specTitle="size / line-height · weight">
      <div ref={ref} style={{
        fontFamily: "var(--default-font-family)", fontWeight: r.weight,
        fontSize: `var(--ds-text-${r.key}-size)`, lineHeight: `var(--ds-text-${r.key}-leading)`,
        color: "var(--ds-text-strong)",
      }}>{r.sample}</div>
    </SpecRow>
  );
}

interface Weight { label: string; spec: string; sample: string; style: CSSProperties; }
const WEIGHTS: Weight[] = [
  { label: "Base",       spec: "400",          sample: "Where most copy lives.",                        style: { fontWeight: 400 } },
  { label: "Strong",     spec: "600",          sample: "Buttons, labels, anything that needs to lead.", style: { fontWeight: 600 } },
  { label: "Strongest",  spec: "700",          sample: "Kept for the rare hard stop.",                  style: { fontWeight: 700 } },
  { label: "Emphasis",   spec: "italic",       sample: "A plain Inter italic.",                         style: { fontStyle: "italic" } },
  { label: "Em & Quote", spec: "serif italic", sample: "A small change of voice against the sans.",     style: { fontFamily: "var(--ds-font-em)", fontStyle: "italic" } },
  { label: "Code",       spec: "Menlo",        sample: "const ratio = (hi + 0.05) / (lo + 0.05);",      style: { fontFamily: "var(--code-font-family)", fontSize: 16 } },
];

function WeightRow({ w }: { w: Weight }) {
  return (
    <SpecRow label={w.label} spec={w.spec}>
      <div style={{ fontFamily: "var(--default-font-family)", fontSize: 18, color: "var(--ds-text-strong)", ...w.style }}>{w.sample}</div>
    </SpecRow>
  );
}

function TypeRamp() {
  return (
    <Page maxWidth="none">
      <PageHeader
        title="Typography · Ramp"
        standfirst="Eight named roles cover every typographic situation — heading to caption, label to body. Headings lead at weight 600, body stays easy at 400, and a serif italic steps in for emphasis that needs its own voice."
      />
      <Section title="The ramp">
        <div>{RAMP.map((r) => <Row key={r.key} r={r} />)}</div>
      </Section>
      <Section title="Weights & emphasis">
        <div>{WEIGHTS.map((w) => <WeightRow key={w.label} w={w} />)}</div>
      </Section>
    </Page>
  );
}

/* ---- Reading measure ------------------------------------------------------ */
// One paragraph rendered at three widths — the line length is the only thing that changes.
const MEASURE_SAMPLE =
  "Good typography is mostly invisible — you notice it only when it fails, and line length is the clearest case. " +
  "The eye doesn't glide along a line; it moves in short jumps and then sweeps back to the start of the next one. " +
  "When the lines run too long, that return sweep overshoots and you lose your place — you re-read a line, or skip " +
  "one, without quite knowing why. When they run too short, the sweep fires so often the rhythm never settles. The " +
  "comfortable band is roughly 45 to 80 characters, and about 65 is the sweet spot most prose sits at.";

// A longer body for the unbounded case, so it wraps to several lines even on wide screens.
const MEASURE_SAMPLE_LONG = MEASURE_SAMPLE +
  " That number isn't arbitrary: it's where the saccade — the short jump the eye makes between " +
  "fixations, seven to nine characters at a time — lines up with the return sweep so the two motions " +
  "stay in rhythm. Stretch the line and the sweep has farther to travel and a higher chance of " +
  "landing on the wrong row; you feel it as fatigue long before you can name the cause. It is why " +
  "running body copy edge-to-edge across a wide screen reads worse than the same words set in a " +
  "narrow column, even though nothing about the words themselves has changed at all.";

// The slider snaps to the system's own type-scale roles (read live off a probe), so the
// detents ARE the scale — xs → h1, 12px to 35px — and can't drift from the tokens.
const SCALE_ROLES = ["xs", "sm", "md", "h4", "h3", "h2", "h1"];
const DEFAULT_IDX = 2; // md · 16px

function MeasureDemo() {
  const rootRef = useRef<HTMLDivElement>(null);
  const ref = useRef<HTMLParagraphElement>(null);
  const [sizes, setSizes] = useState<number[]>([]);
  const [idx, setIdx] = useState(DEFAULT_IDX);
  const [width, setWidth] = useState(0);
  // Resolve each role's px off a probe (fontSize resolves where a raw custom-prop read may not).
  useLayoutEffect(() => {
    const host = rootRef.current;
    if (!host) return;
    const probe = document.createElement("span");
    host.appendChild(probe);
    setSizes(SCALE_ROLES.map((r) => {
      probe.style.fontSize = `var(--ds-text-${r}-size)`;
      return parseFloat(getComputedStyle(probe).fontSize);
    }));
    probe.remove();
  }, []);
  const px = sizes[idx] ?? 16;
  // Measure the 65ch box live so the readout proves the width tracks the type size.
  useLayoutEffect(() => {
    if (ref.current) setWidth(Math.round(ref.current.getBoundingClientRect().width));
  }, [px]);
  const body = { fontFamily: "var(--default-font-family)", fontSize: `${px}px`, lineHeight: 1.5, color: "var(--ds-text-strong)", margin: 0 };
  return (
    <Page maxWidth="none">
      <PageHeader
        title="Typography · Reading measure"
        standfirst={
          <>
            Comfortable reading depends on line length — counted in <strong style={{ color: "var(--ds-text-strong)", fontWeight: 600 }}>characters</strong>, not pixels. 65 is the sweet spot (Bringhurst); the comfortable band runs 45–80. <span style={{ fontFamily: "var(--code-font-family)" }}>--ds-text-measure</span> pins prose to exactly <span style={{ fontFamily: "var(--code-font-family)" }}>65ch</span>.
          </>
        }
      />
      <Section
        title="Reading measure"
        lead="Past roughly 80 characters the return sweep overshoots the next line; under roughly 45 it fires so often the rhythm never settles. Both failures are set out below, beside the measure itself."
      >
      <Section
        title="Scale the type — the measure follows"
        lead={
          <>
            Because <span style={{ fontFamily: "var(--code-font-family)" }}>65ch</span> is a <em>character</em> unit, the measure grows and shrinks with the type size — always about 65 characters wide. Step through the scale and watch it track:
          </>
        }
      >
        <div ref={rootRef}>
          {/* Custom track + thumb — accent-color alone makes Chrome derive a dark unfilled
              track under bright accents (e.g. orange) in light mode, so we paint it ourselves. */}
          <style>{
            ".ds-mslider { -webkit-appearance: none; appearance: none; height: 6px; border-radius: 999px; background: transparent; cursor: pointer; }" +
            ".ds-mslider::-webkit-slider-runnable-track { height: 6px; border-radius: 999px; background: linear-gradient(to right, var(--ds-fill-accent) 0 var(--pct), var(--ds-fill-weak) var(--pct) 100%); }" +
            ".ds-mslider::-moz-range-track { height: 6px; border-radius: 999px; background: var(--ds-fill-weak); }" +
            ".ds-mslider::-moz-range-progress { height: 6px; border-radius: 999px; background: var(--ds-fill-accent); }" +
            ".ds-mslider::-webkit-slider-thumb { -webkit-appearance: none; appearance: none; width: 16px; height: 16px; margin-top: -5px; border-radius: 999px; background: var(--ds-fill-accent); border: 2px solid var(--ds-bg-base); box-shadow: var(--ds-shadow-2); }" +
            ".ds-mslider::-moz-range-thumb { width: 16px; height: 16px; border-radius: 999px; background: var(--ds-fill-accent); border: 2px solid var(--ds-bg-base); box-shadow: var(--ds-shadow-2); }" +
            ".ds-mslider:focus-visible { outline: 2px solid var(--ds-stroke-focus); outline-offset: 2px; }"
          }</style>
          <div style={{ display: "flex", alignItems: "center", gap: 14, maxWidth: "var(--ds-text-measure)", margin: "0 0 22px" }}>
            <span style={{ fontFamily: "var(--code-font-family)", fontSize: 12, color: "var(--ds-text-weak)", whiteSpace: "nowrap" }}>Type scale</span>
            <input type="range" min={0} max={SCALE_ROLES.length - 1} step={1} value={idx} aria-label="Type scale step" list="measure-steps" onChange={(e) => setIdx(Number(e.target.value))} className="ds-mslider" style={{ flex: 1, "--pct": `${(idx / (SCALE_ROLES.length - 1)) * 100}%` } as CSSProperties} />
            <datalist id="measure-steps">{SCALE_ROLES.map((r, i) => <option key={r} value={i} label={r} />)}</datalist>
            <span style={{ fontFamily: "var(--code-font-family)", fontSize: 12, fontWeight: 700, color: "var(--ds-text-strong)", whiteSpace: "nowrap", minWidth: 196, textAlign: "right" }}>{SCALE_ROLES[idx]} · {px}px · 65ch ≈ {width}px</span>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <DoDont kind="do" bare note="About 65 characters — the eye settles into a rhythm and the return sweep lands where it expects to.">
              <p ref={ref} style={{ ...body, maxWidth: "var(--ds-text-measure)" }}>{MEASURE_SAMPLE}</p>
            </DoDont>
            <DoDont kind="dont" bare note="Too narrow at ~30 characters — the line breaks so often the rhythm never settles and the eye snaps back every few words.">
              <p style={{ ...body, maxWidth: "30ch" }}>{MEASURE_SAMPLE}</p>
            </DoDont>
            <DoDont kind="dont" bare note="Unconstrained, running the full width — past ~80 characters the return sweep overshoots and loses the start of the next line.">
              <p style={body}>{MEASURE_SAMPLE_LONG}</p>
            </DoDont>
          </div>
        </div>
      </Section>
      </Section>
    </Page>
  );
}

/* ---- Figures -------------------------------------------------------------- */
/* GUIDELINES §3's Figures law, made watchable. The law is that a number which updates IN PLACE is set
   in tabular figures, and the reason is a width fact about the type — which a sentence can state but
   cannot show. So this section runs the same value through both figure styles at once, side by side,
   with a fixed marker pinned to the right of each: under proportional figures the marker steps
   sideways on every tick; under tabular it does not move at all.

   Every number on the page is MEASURED, never typed — the widths are read back off the rendered
   specimens with `document.createRange()` on each tick, so the readouts cannot drift from what Inter
   actually draws. The section is built from the page's own `SpecRow` (the label · spec · sample shape
   the ramp and the weights table above already use) plus `DoDont` / `Caption` from `_storyKit`.

   The inline `fontVariantNumeric` here is GUIDELINES §3's case 1 — a specimen or probe whose SUBJECT
   is the property, which has to write both values to show or measure the difference. That covers the
   two lanes, the ten-1s/ten-4s pair, BOTH do/don't lines (the don't sets `normal`, because its whole
   claim is that a static figure in a sentence is better left proportional), and the measuring span in
   the play. Component paint stays in `components.css`, registered in `_tabular-figures.stories.tsx`. */

/** Same digit COUNT every time, maximally different digit SHAPES — "1" is the narrowest glyph in
 *  Inter's proportional figures and "4"/"0" among the widest, so the width swing is at its largest.
 *  A value that changed digit count would widen legitimately even under tabular figures and would
 *  teach the wrong thing. */
const FIGURE_VALUES = ["1,111", "4,890", "1,741", "8,004", "1,111", "7,246"];

/** The two figure styles, as the CSS values a reader would write. */
const FIGURE_MODES = [
  { key: "normal" as const, label: "Proportional" },
  { key: "tabular-nums" as const, label: "Tabular" },
];

/** One lane: the ticking number, a hairline seam, and a marker that is anchored to the number's
 *  trailing edge — the stand-in for the Clear button, stepper or arrow that sits beside a live count
 *  in a real component and gets shoved sideways by it. */
function FigureLane({
  mode, value, sampleRef,
}: { mode: (typeof FIGURE_MODES)[number]; value: string; sampleRef: (el: HTMLSpanElement | null) => void }) {
  return (
    <div style={{ display: "flex", alignItems: "stretch", width: "fit-content", border: "1px solid var(--ds-stroke-weak)", borderRadius: "var(--ds-radius-3)", overflow: "hidden" }}>
      <span
        ref={sampleRef}
        style={{
          fontFamily: "var(--default-font-family)", fontSize: "var(--ds-text-h4-size)",
          lineHeight: "var(--ds-text-h4-leading)", color: "var(--ds-text-strong)",
          fontVariantNumeric: mode.key, padding: "var(--ds-space-4) var(--ds-space-8)",
        }}
      >
        {value}
      </span>
      <span
        style={{
          borderLeft: "1px solid var(--ds-stroke-weak)", background: "var(--ds-fill-weak)",
          display: "flex", alignItems: "center", padding: "0 var(--ds-space-8)",
          fontFamily: "var(--default-font-family)", fontSize: "var(--ds-text-sm-size)",
          color: "var(--ds-text-weak)", whiteSpace: "nowrap",
        }}
      >
        Clear
      </span>
    </div>
  );
}

/** Painted-ink width of an element's text — the box has padding and can absorb a real change, so the
 *  measurement is taken on the text itself. Same technique the shipped guards use. */
function inkWidth(el: Element | null): number {
  if (!el) return 0;
  const r = document.createRange();
  r.selectNodeContents(el);
  return r.getBoundingClientRect().width;
}

function FiguresDemo() {
  const hostRef = useRef<HTMLDivElement>(null);
  const laneRefs = useRef<Record<string, HTMLSpanElement | null>>({});
  const [step, setStep] = useState(0);
  const [ink, setInk] = useState<Record<string, number>>({});
  const [swing, setSwing] = useState<Record<string, { ones: number; fours: number }>>({});

  // The tick. Under prefers-reduced-motion it never starts: the value holds still and the measured
  // rows below carry the lesson on their own. (A JS interval is out of reach of the --ds-duration
  // clamp in motion.css, so the query is read here rather than left to the token layer.)
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const id = window.setInterval(() => setStep((s) => s + 1), 900);
    return () => window.clearInterval(id);
  }, []);

  // Re-measure the painted ink on every tick — the readout is what the browser drew, not a prediction.
  useLayoutEffect(() => {
    setInk(Object.fromEntries(FIGURE_MODES.map((m) => [m.key, inkWidth(laneRefs.current[m.key])])));
  }, [step]);

  // The mechanism, in numbers: ten "1"s against ten "4"s in each style. The probe SETS
  // font-variant-numeric on purpose — the claim under test is what the FONT does with the property,
  // not what any component declares, so setting it is the experiment rather than a probe rigging its
  // own answer. Nothing here reads a component's paint.
  useLayoutEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    const probe = document.createElement("span");
    probe.style.font = "var(--ds-text-h4-size) var(--default-font-family)";
    probe.style.position = "absolute";
    probe.style.visibility = "hidden";
    probe.style.whiteSpace = "pre";
    host.appendChild(probe);
    const measure = (mode: string, text: string) => {
      probe.style.fontVariantNumeric = mode;
      probe.textContent = text;
      return probe.getBoundingClientRect().width;
    };
    setSwing(Object.fromEntries(FIGURE_MODES.map((m) => [m.key, { ones: measure(m.key, "1111111111"), fours: measure(m.key, "4444444444") }])));
    probe.remove();
  }, []);

  const value = FIGURE_VALUES[step % FIGURE_VALUES.length];

  return (
    <Page maxWidth="none">
      <PageHeader
        title="Typography · Figures"
        standfirst={
          <>
            A number that updates <strong style={{ color: "var(--ds-text-strong)", fontWeight: 600 }}>in place</strong> is set in tabular figures. Inter's default figures are proportional — a “1” is narrower than a “4” — so a value that changes re-measures, and whatever sits beside it moves under a cursor that never did. <span style={{ fontFamily: "var(--code-font-family)" }}>font-variant-numeric: tabular-nums</span> puts every digit on one advance width.
          </>
        }
      />

      {/* The probe host has to sit INSIDE the theme root for `var(--ds-text-h4-size)` to resolve on it,
          so the sections live under one wrapper — which then has to restate `Page`'s own band rhythm
          (`gap="6"` → `--space-6`), or every Section below stacks flush against the next. */}
      <div ref={hostRef} style={{ display: "flex", flexDirection: "column", gap: "var(--space-6)" }}>
        <Section
          title="Watch the button move"
          lead="The same value, ticking through the same sequence in both figure styles. The “Clear” chip is anchored to the number's trailing edge — exactly where a real component puts one. Only its neighbour changes; the chip is told to do nothing."
        >
          {/* aria-hidden: an unannounced value changing every 900ms is a screen-reader firehose, and the
              standfirst above already states what the specimen shows. Nothing here is focusable. */}
          <div aria-hidden style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            {FIGURE_MODES.map((m) => (
              <SpecRow
                key={m.key}
                label={m.label}
                spec={`${ink[m.key] ? ink[m.key].toFixed(2) : "…"}px ink`}
                specTitle="painted width of the number, measured live"
              >
                <FigureLane mode={m} value={value} sampleRef={(el) => { laneRefs.current[m.key] = el; }} />
              </SpecRow>
            ))}
          </div>
          <Caption>
            The proportional row's measured width changes every tick and drags the chip with it. The
            tabular row's does not move by a hundredth of a pixel. Under{" "}
            <span style={{ fontFamily: "var(--code-font-family)" }}>prefers-reduced-motion</span> the
            sequence holds on one value — the measured rows below say the same thing without moving.
          </Caption>
        </Section>

        <Rule />

        <Section
          title="Where the width goes"
          lead="Ten of the narrowest digit against ten of the widest, measured off a probe in each style. Proportional figures differ by most of a whole glyph over ten characters; tabular figures are identical by construction."
        >
          {FIGURE_MODES.map((m) => {
            const s = swing[m.key];
            const delta = s ? Math.abs(s.fours - s.ones) : null;
            return (
              <SpecRow
                key={m.key}
                label={m.label}
                spec={delta === null ? "…" : `Δ ${delta.toFixed(2)}px`}
                specTitle="difference between the two strings"
              >
                <div style={{ display: "flex", gap: 24, alignItems: "baseline", flexWrap: "wrap" }}>
                  {(["1111111111", "4444444444"] as const).map((text) => (
                    <span
                      key={text}
                      style={{
                        fontFamily: "var(--default-font-family)", fontSize: "var(--ds-text-h4-size)",
                        color: "var(--ds-text-strong)", fontVariantNumeric: m.key,
                        borderBottom: "1px solid var(--ds-stroke-weak)",
                      }}
                    >
                      {text}
                    </span>
                  ))}
                </div>
              </SpecRow>
            );
          })}
          <Caption>
            Tabular fixes the width <strong style={{ color: "var(--ds-text-strong)", fontWeight: 600 }}>per digit</strong>, not per string: a value that gains a digit (9 → 10) still widens, and should. Reserve the space with a <span style={{ fontFamily: "var(--code-font-family)" }}>min-width</span> if that jump matters — Pagination's page buttons do exactly that.
          </Caption>
        </Section>

        <Rule />

        <Section title="When to reach for it" lead="It is for numbers that CHANGE — not for every number on the page.">
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <DoDont kind="do" bare note="A counter, a result total, a page range, a live timestamp, a field value under a stepper, a “+N” overflow chip — anything that re-renders while its box stays put.">
              <span style={{ fontFamily: "var(--default-font-family)", fontSize: "var(--ds-text-md-size)", color: "var(--ds-text-strong)", fontVariantNumeric: "tabular-nums" }}>
                1,741 results &nbsp;·&nbsp; 11–20 of 250 &nbsp;·&nbsp; 148/280
              </span>
            </DoDont>
            <DoDont
              kind="dont"
              bare
              note={
                <>
                  A static figure inside a sentence reads better in the proportional figures the type was
                  drawn with — and this line is set in them: the digits fit their own shapes, and nothing
                  here is going to move. A column
                  of static numbers wants right-alignment as well, which <span style={{ fontFamily: "var(--code-font-family)" }}>Table</span>'s{" "}
                  <span style={{ fontFamily: "var(--code-font-family)" }}>numeric</span> prop sets along with the figures.
                </>
              }
            >
              {/* `normal`, not the absence of a declaration: this panel's whole claim is that the line is
                  set in PROPORTIONAL figures, so it says so on the element rather than relying on nothing
                  above it ever declaring otherwise. It read `tabular-nums` until 2026-08-01 — the specimen
                  rendered the treatment its own caption argues against. */}
              <span style={{ fontFamily: "var(--default-font-family)", fontSize: "var(--ds-text-md-size)", color: "var(--ds-text-strong)", fontVariantNumeric: "normal" }}>
                The comfortable band runs 45 to 80 characters, and about 65 is the sweet spot.
              </span>
            </DoDont>
          </div>
          <Caption>
            Where the rule lives: in <span style={{ fontFamily: "var(--code-font-family)" }}>components.css</span>, on a selector that REACHES the element painting the digits — that element itself, or a container it inherits from, which is the right shape for a slot whose content the component cannot know in advance. Never inline in a component. Every such rule is registered in{" "}
            <span style={{ fontFamily: "var(--code-font-family)" }}>_tabular-figures.stories.tsx</span>, which fails the suite if a site loses its declaration or a new one ships unregistered.
          </Caption>
        </Section>
      </div>
    </Page>
  );
}

const meta: Meta<typeof TypeRamp> = {
  title: "Foundations/Typography",
  component: TypeRamp,
  parameters: {
    docs: {
      description: {
        component:
          "Eight type roles, set in Inter on Radix's own size steps. Headings carry the " +
          "weight (600), body stays easy to read at 400, and emphasis switches to a serif " +
          "italic for a deliberate change of voice. Reach for a role through `<Text size>` or " +
          "the `--ds-text-*` tokens — both point at the same scale, so they never drift apart.",
      },
    },
  },
};
export default meta;
type Story = StoryObj<typeof TypeRamp>;

/** The whole ramp, top to bottom, then the weight axis and the serif Em/Quote.
    The check underneath makes sure every role lands on its Radix step and that
    Inter really loaded — no faux bold or italic slipping through. */
export const Ramp: Story = {
  play: async ({ canvasElement }) => {
    const root = themeRoot(canvasElement);
    // Every role token resolves, and maps to its native Radix size step.
    for (const [key, step] of Object.entries(ROLE_STEP)) {
      const size = resolve(root, `--ds-text-${key}-size`);
      const lead = resolve(root, `--ds-text-${key}-leading`);
      if (!size || !lead) throw new Error(`--ds-text-${key}-* unmapped`);
      const native = resolve(root, `--font-size-${step}`);
      if (size !== native) {
        throw new Error(`--ds-text-${key}-size (${size}) != --font-size-${step} (${native})`);
      }
    }
    // Inter actually loaded — roman + italic across weights (no faux styles).
    await document.fonts.ready;
    for (const spec of ["400 16px Inter", "600 16px Inter", "700 16px Inter",
      "italic 400 16px Inter", "italic 600 16px Inter", "italic 700 16px Inter"]) {
      if (!document.fonts.check(spec)) throw new Error(`Inter not loaded for "${spec}" (faux style risk)`);
    }
  },
};

/** The reading measure illustrated: one paragraph at three widths — too narrow, the
    65ch sweet spot, and unbounded (full width) where the return sweep loses its place.
    The play confirms the measure token resolves so the demo can't render unbacked. */
export const ReadingMeasure: Story = {
  // SIDEBAR LEAF, in the house's sentence case. Left to Storybook the export name is
  // title-cased into "Reading Measure", which then disagrees with this page's own h1 —
  // the header suffix is the role humanized ("Reading measure"), and the sidebar is the
  // same page. An explicit `name` does not change the story id.
  name: "Reading measure",
  render: () => <MeasureDemo />,
  parameters: {
    // The DoDont headers are colour-not-alone (icon + word); Radix step-11 success/error tone on
    // its own soft fill trips axe's color-contrast at ~4.1. Documented specimen exception, same as
    // the System component Usage stories.
    a11y: { config: { rules: [{ id: "color-contrast", enabled: false }] } },
    docs: {
      description: {
        story:
          "Why prose is constrained to `--ds-text-measure` (65ch). Reading comfort is " +
          "character-based — ~65 is the sweet spot (range 45–80). The same paragraph is shown " +
          "too narrow, at the measure, and unbounded; past ~80 characters the return sweep loses " +
          "its place on the way back. Visual / data content (grids, tables, swatches) is exempt and runs full width.",
      },
    },
  },
  play: async ({ canvasElement }) => {
    const root = themeRoot(canvasElement);
    if (!resolve(root, "--ds-text-measure")) throw new Error("--ds-text-measure unmapped");
  },
};

/** GUIDELINES §3's Figures law, demonstrated: one value ticking through both figure styles with a
    marker pinned beside it, plus the width swing measured off a probe.

    The play asserts the PRECONDITION the whole law rests on and nothing else: that Inter, as loaded,
    actually honours `font-variant-numeric: tabular-nums` — ten "1"s and ten "4"s must differ under
    proportional figures and be identical under tabular. If the family ever shipped without the `tnum`
    feature, every rule in `components.css` would become a no-op and every other check in the system
    would stay green, because they all read declarations. Adoption is guarded elsewhere: presence at
    every site by `_tabular-figures.stories.tsx`, painted ink by `TabularInfo` (`_pagination`) and
    `Usage` (`Table`). This story does not duplicate either. */
export const Figures: Story = {
  render: () => <FiguresDemo />,
  parameters: {
    // The DoDont headers are colour-not-alone (icon + word); Radix step-11 success/error tone on its
    // own soft fill trips axe's color-contrast at ~4.1 — the same documented specimen exception the
    // Reading measure story takes.
    a11y: { config: { rules: [{ id: "color-contrast", enabled: false }] } },
    docs: {
      description: {
        story:
          "Why a number that updates in place is set in tabular figures. The same value ticks through " +
          "both figure styles side by side, with a marker anchored to its trailing edge — under " +
          "proportional figures the marker steps sideways on every tick, under tabular it holds. Every " +
          "width on the page is measured off the rendered specimen, not typed.",
      },
    },
  },
  play: async ({ canvasElement }) => {
    await document.fonts.ready;
    const host = canvasElement.querySelector("div");
    if (!host) throw new Error("the Figures page must render");
    const probe = document.createElement("span");
    probe.style.font = "var(--ds-text-h4-size) var(--default-font-family)";
    probe.style.position = "absolute";
    probe.style.visibility = "hidden";
    probe.style.whiteSpace = "pre";
    host.appendChild(probe);
    const measure = (variant: string, text: string) => {
      probe.style.fontVariantNumeric = variant;
      probe.textContent = text;
      return probe.getBoundingClientRect().width;
    };
    const propDelta = Math.abs(measure("normal", "4444444444") - measure("normal", "1111111111"));
    const tabDelta = Math.abs(measure("tabular-nums", "4444444444") - measure("tabular-nums", "1111111111"));
    probe.remove();

    if (propDelta < 1) {
      throw new Error(
        `the loaded body font draws PROPORTIONAL figures at a uniform width (ten "1"s vs ten "4"s ` +
        `differ by ${propDelta.toFixed(2)}px) — the specimen above can't demonstrate anything, and the ` +
        `system's tabular rules would be decorative`,
      );
    }
    if (tabDelta > 0.05) {
      throw new Error(
        `the loaded body font does NOT honour font-variant-numeric: tabular-nums — ten "1"s vs ten ` +
        `"4"s differ by ${tabDelta.toFixed(2)}px under it. Every tabular declaration in components.css ` +
        `is a no-op, and every guard that reads declarations would still be green`,
      );
    }
  },
};
