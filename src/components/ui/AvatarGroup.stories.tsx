import { useContext, useLayoutEffect, useRef, useState, type ReactNode } from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { Box, Code, Flex, Grid, Text } from "@radix-ui/themes";
import { Avatar } from "./Avatar";
import { AvatarGroup } from "./AvatarGroup";
import { Button } from "./Button";
import type { AvatarSize } from "../../theme/SizeContext";
import { awaitMeasuredRows, parseColor } from "../../foundations/_assert";
import {
  AnatomyLegend, Caption, Decision, DoDont, DODONT_LABEL, dotStyle, HexThemeKey, hLine, MeasuredRow, MeasuredSpec,
  NoteRow, Page, PageHeader, PropsLead, type PropDef, PropTable, Rule, Scenario, Section, tick, TokenGroup,
} from "./_storyKit";

/** The one definition of this component — the standfirst every page of it opens with. */
const DEFINITION = (
  <>
    A tight, cohesive stack of avatars, each ringed in the page background so its edge reads against its
    neighbour. <Code>max</Code> caps the stack and folds the rest into a +N counter that reuses{" "}
    <Code>Avatar</Code> itself — the same size, the same circle, never a shorter pill. Every child renders
    at the group's size.
  </>
);

const meta: Meta<typeof AvatarGroup> = {
  title: "Components/Content/AvatarGroup",
  component: AvatarGroup,
  parameters: {
    controls: { disable: true },
    docs: {
      description: {
        component:
          "AvatarGroup overlaps a set of avatars into a tight, cohesive stack — a bg-base ring makes each " +
          "edge read against its neighbour. `max` caps the stack and folds the rest into a neutral **+N** " +
          "counter that reuses **Avatar** — a same-size, same-shape circular disc, so the surplus " +
          "indicator sits in the stack like any other avatar and the row keeps one rhythm to its end, " +
          "never a shorter pill. Every child renders at the group's size.",
      },
    },
  },
};
export default meta;
type Story = StoryObj<typeof AvatarGroup>;

/* The people every specimen stands for. A stack is a picture of a TEAM, so the discs carry real
   initials — a row of A / B / C reads as a diagram of the component rather than as a group of
   colleagues, and everything below is about what a reader takes from the picture. */
const TEAM = [
  { initials: "RK", name: "Rae Kowalski" },
  { initials: "DM", name: "Diego Marín" },
  { initials: "SO", name: "Simone Osei" },
  { initials: "HB", name: "Hana Basara" },
  { initials: "TN", name: "Tomas Novak" },
  { initials: "EW", name: "Elin Warner" },
  { initials: "JP", name: "Joon Park" },
];
const many = (n: number) => TEAM.slice(0, n).map((p) => <Avatar key={p.initials} fallback={p.initials} />);

/** The documented box for each rung of the avatar ladder, for the size-contract assertion below. */
const LADDER: Record<string, number> = { xs: 16, sm: 20, md: 24, lg: 30, xl: 40 };

/* ---- in-context specimen kit ----------------------------------------------
   A stack never appears on its own in a product: it lives in the trailing
   column of a row that repeats — a project in a list, a request in a queue, an
   incident. That repetition is the whole reason it overlaps and the whole
   reason it caps, so every Usage specimen below is one of those rows. */

/** The bordered row the specimens sit in — the subtle ground, hairline edge and 4-step radius the
 *  library's other in-context specimens use. */
function Surface({ children, maxWidth = 560 }: { children: ReactNode; maxWidth?: number | string }) {
  return (
    <Box
      style={{
        background: "var(--ds-bg-subtle)",
        border: "1px solid var(--ds-stroke-weak)",
        borderRadius: "var(--ds-radius-4)",
        padding: "var(--space-3) var(--space-4)",
        maxWidth,
      }}
    >
      {children}
    </Box>
  );
}

/** The primary line of a row. */
const RowTitle = ({ children }: { children: ReactNode }) => (
  <Text size="2" weight="medium" style={{ color: "var(--ds-text-strong)" }}>{children}</Text>
);

/** The supporting line under it. */
const RowMeta = ({ children }: { children: ReactNode }) => (
  <Text size="1" style={{ color: "var(--ds-text-weak)" }}>{children}</Text>
);

/** One project in a list — title, when it last moved, and its team in the trailing column. */
function ProjectRow({ title, meta, children }: { title: string; meta: string; children: ReactNode }) {
  return (
    <Flex align="center" gap="4" py="2" style={{ borderTop: "1px solid var(--ds-stroke-weak)" }}>
      <Flex direction="column" style={{ minWidth: 0, flex: 1 }}>
        <RowTitle>{title}</RowTitle>
        <RowMeta>{meta}</RowMeta>
      </Flex>
      <Box style={{ flexShrink: 0 }}>{children}</Box>
    </Flex>
  );
}

/** A code-review request — the shape a capped stack most often lands in. The status rides the meta
 *  line rather than a toned Badge: a success Badge at this size measures 4.02:1 on the subtle ground
 *  (step-11 ink on its own step-3 tint), which is a real contrast failure and not one to carve out. */
function RequestRow({ children }: { children: ReactNode }) {
  return (
    <Surface>
      <Flex align="center" gap="4">
        <Flex direction="column" style={{ minWidth: 0, flex: 1 }}>
          <RowTitle>Add idempotency keys to the charge endpoint</RowTitle>
          <RowMeta>#4182 · approved · opened by Rae Kowalski</RowMeta>
        </Flex>
        <Box style={{ flexShrink: 0 }}>{children}</Box>
      </Flex>
    </Surface>
  );
}

/** An incident row, for the sizing pair. */
function IncidentRow({ children }: { children: ReactNode }) {
  return (
    <Surface maxWidth="100%">
      <Flex align="center" gap="3">
        <Flex direction="column" style={{ minWidth: 0, flex: 1 }}>
          <RowTitle>Checkout latency spike</RowTitle>
          <RowMeta>Sev 2 · 14 minutes</RowMeta>
        </Flex>
        <Box style={{ flexShrink: 0 }}>{children}</Box>
      </Flex>
    </Surface>
  );
}

/** The project row the label do/don't turns exactly one prop on. */
function LabelledProjectRow({ children }: { children: ReactNode }) {
  return (
    <Surface maxWidth="100%">
      <Flex align="center" gap="3">
        <Flex direction="column" style={{ minWidth: 0, flex: 1 }}>
          <RowTitle>Payments platform</RowTitle>
          <RowMeta>Updated 12 minutes ago</RowMeta>
        </Flex>
        <Box style={{ flexShrink: 0 }}>{children}</Box>
      </Flex>
    </Surface>
  );
}

/* ---- Anatomy diagram ------------------------------------------------------
   The parts of a stack sit SIDE BY SIDE and only a few pixels apart, so the
   callouts hang above it on two tiers and drop a tick onto the part they name.
   Positions are MEASURED off the live stack rather than hard-coded: every disc
   is sized from the group's box, so a hard-coded pin would point at the wrong
   sliver the moment anything about that box changed.

   This one specimen is deliberately PINNED to `xl`: the parts it labels are a
   2px ring and a 40% seam, which are simply not resolvable on a 24px disc.
   Every other stack on the page is left unset and tracks the toolbar. */

const PIN_BAND = 92;
const GUTTER = 40;
/** Closest two callout dots may sit, centre to centre. A dot is 20px wide. */
const MIN_GAP = 30;
/** Where every leader turns its corner — one shared band, so the elbows read as a set. */
const ELBOW = 42;

/** [callout number, which disc it points at, where across that disc (0–1)] */
const PINS: [number, number, number][] = [
  [1, 0, 0.35], // the disc itself
  [2, 1, 0.05], // the ring — the leading sliver of the next disc
  [3, 2, 0.02], // the overlap seam — where the third disc starts covering the second
  [4, 3, 0.6], // the +N counter
];

/** Where a callout's dot sits (`dotX`) and where its leader has to land (`partX`). */
type Pin = { dotX: number; partX: number };

function AnatomyDiagram() {
  const frame = useRef<HTMLDivElement>(null);
  const stack = useRef<HTMLDivElement>(null);
  const [pins, setPins] = useState<Record<number, Pin>>({});

  useLayoutEffect(() => {
    const f = frame.current;
    const s = stack.current;
    if (!f || !s) return;
    const measure = () => {
      const left = f.getBoundingClientRect().left;
      const discs = Array.from(s.querySelectorAll<HTMLElement>(".rt-AvatarRoot"));
      const next: Record<number, Pin> = {};
      // The parts are ~24px apart (the discs overlap by design), so dots placed on their measured
      // centres would collide and a callout would disappear. The pins are declared in visual order,
      // so one forward pass pushes each dot to a legible distance from the last; the leader then
      // turns a corner to reach the part it names — the dot moves, the line still lands on the sliver.
      let floor = -Infinity;
      for (const [n, index, ratio] of PINS) {
        const el = discs[index];
        if (!el) continue;
        const box = el.getBoundingClientRect();
        const partX = Math.round(box.left + box.width * ratio - left);
        const dotX = Math.max(partX, floor + MIN_GAP);
        floor = dotX;
        next[n] = { dotX, partX };
      }
      // Only write when something moved — the frame's own size feeds this observer otherwise.
      setPins((prev) => (JSON.stringify(prev) === JSON.stringify(next) ? prev : next));
    };
    measure();
    let raf = 0;
    const ro = new ResizeObserver(() => { cancelAnimationFrame(raf); raf = requestAnimationFrame(measure); });
    ro.observe(s);
    return () => { cancelAnimationFrame(raf); ro.disconnect(); };
  }, []);

  return (
    <Box style={{ overflowX: "auto" }}>
      <Box ref={frame} style={{ position: "relative", paddingTop: PIN_BAND, paddingLeft: GUTTER, paddingRight: GUTTER, width: "fit-content", minWidth: 320 }}>
        <Box ref={stack}>
          <AvatarGroup size="xl" max={3} label="6 people on this project">{many(6)}</AvatarGroup>
        </Box>
        {PINS.map(([n]) => {
          const pin = pins[n];
          if (!pin) return null;
          const { dotX, partX } = pin;
          return (
            <Box key={n}>
              <Box style={{ ...dotStyle, left: dotX - 10, top: 2 }}>{n}</Box>
              {/* down from the dot… */}
              <Box style={tick({ left: dotX, top: 22, height: ELBOW - 22 })} />
              {/* …across to the part's own column (zero-width when they already agree)… */}
              {dotX !== partX && (
                <Box style={hLine({ left: Math.min(dotX, partX), top: ELBOW, width: Math.abs(dotX - partX) })} />
              )}
              {/* …and down into the part. */}
              <Box style={tick({ left: partX, top: ELBOW, height: PIN_BAND - ELBOW - 6 })} />
            </Box>
          );
        })}
      </Box>
    </Box>
  );
}

const ANATOMY_PARTS: [number, string, string][] = [
  [1, "Disc", "one Avatar, forced to the GROUP's box — a per-child size is overridden, so a stack can never come out ragged. It is painted with the OPAQUE twin of the standalone avatar's tinted fill, because a translucent disc would let the one behind it bleed through the overlap."],
  [2, "Ring", "a 2px band in the page background around every disc, so an edge reads against its neighbour instead of melting into it. Drawn as a shadow rather than a border, so keeping the discs apart costs the box no width."],
  [3, "Overlap", "each disc after the first is pulled back over the one before it by 40% of the box — tight enough that the row reads as one thing rather than a line of separate segments. Derived from the box, so the stack stays proportional at every size."],
  [4, "+N counter", "present only when max is smaller than the set it was handed. Another Avatar — same diameter, same circle, overlapping like the rest — carrying a stronger neutral fill so it reads as a count rather than as one more person. Never a shorter pill."],
];

/* ---- Tokens: measured off a rendered stack ---------------------------------------------------
   AvatarGroup owns no fills — every disc IS an Avatar, so its fills ARE Avatar's, swapped to the
   OPAQUE step (so an overlap obscures the disc behind it). Each row names an element and a property,
   reads that property off a REAL rendered group, and checks it against the token it claims, so a row
   can disagree with the component. The ring is a colour carried INSIDE a box-shadow, which the row
   compares colour-against-colour and reports the geometry of; the overlap is a calc() margin with no
   token behind it at all, so it stays a prose row read live off the rendered stack. */
function AvatarGroupTokens() {
  const themeKey = useContext(HexThemeKey);
  const ref = useRef<HTMLDivElement>(null);
  const [overlap, setOverlap] = useState<string | null>(null);
  useLayoutEffect(() => {
    const root = ref.current;
    if (!root) return;
    const discs = Array.from(root.querySelectorAll<HTMLElement>(".rt-ds-avatar-group .rt-AvatarRoot"));
    if (discs[1]) setOverlap(getComputedStyle(discs[1]).marginInlineStart);
  }, [themeKey]);
  return (
    <TokenGroup
      label="OVERLAPPED STACK (reused Avatar skin)"
      blurb="AvatarGroup adds no fills of its own — every disc IS an Avatar, so its skin is Avatar's, swapped to the OPAQUE step so an overlap obscures the disc behind it. Each row below is read off a rendered stack and checked against the token it names, so the table reports what the stack paints."
      specimen={<Box ref={ref}><AvatarGroup max={3} label="6 people">{many(6)}</AvatarGroup></Box>}
    >
      <MeasuredSpec render={() => <AvatarGroup max={3} label="6 people">{many(6)}</AvatarGroup>}>
        <MeasuredRow
          part="Disc fill"
          note="The OPAQUE twin of the standalone avatar's alpha fill, so a disc obscures the one behind it."
          token="--accent-3"
          select=".rt-ds-avatar-group .rt-AvatarFallback"
          prop="background-color"
        />
        <MeasuredRow
          part="+N counter fill"
          note="A stronger neutral, so the surplus disc reads as a count rather than as another person."
          token="--gray-6"
          select=".rt-ds-avatar-count .rt-AvatarFallback"
          prop="background-color"
        />
        <MeasuredRow
          part="+N counter text"
          note="The count itself — the same strongest text role every other label in the system takes."
          token="--ds-text-strong"
          select=".rt-ds-avatar-count .rt-AvatarFallback"
          prop="color"
        />
        <MeasuredRow
          part="Read-through ring"
          note="The band that separates a disc from the one behind it. It is drawn as a shadow rather than a border, so the row proves the ring's COLOUR and reports its geometry — the 2px spread — beside it."
          token="--ds-bg-base"
          select=".rt-ds-avatar-group .rt-AvatarRoot"
          prop="box-shadow"
        />
      </MeasuredSpec>
      {/* The overlap is a calc() margin with no token behind it, so there is nothing for a measured row
          to compare against — it is read live off the rendered stack and reported as the geometry it is. */}
      <NoteRow part="Overlap" value={`−40% of the box — margin-inline-start ${overlap ?? "…"}`} />
      <NoteRow part="Box (size)" value="unset → the portrait ramp: 24 / 30 / 40 by tier. Pinned, any rung of Avatar's shared ladder (xs–xl: 16 / 20 / 24 / 30 / 40)" radix="--ds-avatar-box" />
    </TokenGroup>
  );
}
/** Rows in the measured spec — the exact count the Usage play asserts have measured. */
const SPEC_ROWS = 4;

export const Anatomy: Story = {
  render: (_args, { globals }) => (
    <HexThemeKey.Provider value={`${globals.accent}-${globals.appearance}-${globals.contrast}`}>
      <Page maxWidth={900}>
        <PageHeader title="AvatarGroup · Anatomy" standfirst={DEFINITION} />
        <Section
          title="The parts"
          lead="A stack is one Avatar repeated and pulled back over itself, with a ring holding the edges apart and — once there are more people than room — a counter standing in for the rest. Only the discs are the component's own; everything else is geometry derived from a single box size. The callouts are pinned onto a live stack; the legend spells each one out."
        >
          <AnatomyDiagram />
          <AnatomyLegend parts={ANATOMY_PARTS} />
        </Section>

        <Rule />

        <Section
          title="Capped, and uncapped"
          lead="The counter is the only part that comes and goes. Below max the stack is just the discs — no counter and no other chrome — and both of these track the global size toolbar, like every stack that has not been deliberately pinned."
        >
          <Flex direction="column" gap="5">
            <Scenario label="UNCAPPED" caption="Four people, no max. Every one of them gets a disc.">
              <div data-case="plain"><AvatarGroup>{many(4)}</AvatarGroup></div>
            </Scenario>
            <Scenario label="CAPPED · max=3" caption="Six people, three discs and a +3. The counter is the fourth disc in the row, not an annotation beside it.">
              <div data-case="capped"><AvatarGroup max={3}>{many(6)}</AvatarGroup></div>
            </Scenario>
          </Flex>
          <Caption>
            The ring is <Code>box-shadow: 0 0 0 2px var(--ds-bg-base)</Code>; the overlap is a negative
            inline-start margin (~40% of the box). The <Code>+N</Code> is another <Code>Avatar</Code> —
            same diameter, same circle, overlapping like the rest.
          </Caption>
        </Section>
      </Page>
    </HexThemeKey.Provider>
  ),
  // Folds the former `_Contract` fixture into a doc story's play (matching Badge/Callout) so there is no
  // extra sidebar page. Asserts the named-group boundary, the `max` cap, and that the "+N" overflow is a
  // SAME-SIZE Avatar disc (never a shorter pill Badge), overlapping like the rest. The token table's own
  // evidence is asserted where the table now lives — in Usage's play.
  play: async ({ canvasElement }) => {
    for (const name of ["plain", "capped"]) {
      const g = canvasElement.querySelector(`[data-case="${name}"] .rt-ds-avatar-group`) as HTMLElement | null;
      if (!g) throw new Error(`${name}: group not rendered`);
      // Named group boundary: role="group" + an accessible name (default "N avatars").
      if (g.getAttribute("role") !== "group") throw new Error(`${name}: group root needs role="group"`);
      if (!g.getAttribute("aria-label")?.trim()) throw new Error(`${name}: group root needs an aria-label (accessible name)`);
      // The overflow counter is an Avatar disc, never a Badge pill.
      if (g.querySelector(".rt-Badge")) throw new Error(`${name}: "+N" must NOT be a Badge (.rt-Badge) — it reuses Avatar`);
    }

    const capped = canvasElement.querySelector('[data-case="capped"] .rt-ds-avatar-group') as HTMLElement;
    // max=3 on 6 → 3 shown avatars + 1 counter disc = 4 .rt-AvatarRoot discs total.
    const discs = Array.from(capped.querySelectorAll<HTMLElement>(".rt-AvatarRoot"));
    if (discs.length !== 4) throw new Error(`max=3 on 6 should render 3 avatars + a counter = 4 discs, got ${discs.length}`);
    // The last disc is the "+3" counter, the same circular disc as the rest. It SHOWS "+3" and ANNOUNCES
    // "3 more": the glyph is marked decorative and a visually-hidden phrase carries the name, because an
    // `aria-label` on the Avatar is routed onto the inner <img> — which never mounts without a `src`, so
    // the name silently disappeared (it measured null in the DOM).
    const counter = discs[discs.length - 1];
    const glyph = counter.querySelector<HTMLElement>('[aria-hidden="true"]');
    if (glyph?.textContent?.trim() !== "+3") throw new Error(`overflow counter should show "+3", got "${glyph?.textContent}"`);
    const announced = Array.from(counter.querySelectorAll<HTMLElement>("span"))
      .filter((s) => s !== glyph && !s.contains(glyph) && s.textContent?.trim())
      .map((s) => s.textContent!.trim());
    if (!announced.includes("3 more"))
      throw new Error(`the counter must carry an accessible "3 more" beside the decorative glyph; found ${JSON.stringify(announced)}`);
    if (counter.tagName !== "SPAN" || !counter.classList.contains("rt-AvatarRoot")) throw new Error("counter must be an Avatar (.rt-AvatarRoot span)");

    // THE SIZE CONTRACT: the GROUP owns the box. Every disc — the counter included — renders at the
    // same diameter, and that diameter is the rung of the avatar ladder the group's own size class
    // names. The rung is read off the element rather than hard-coded, because these specimens track
    // the global uiSize toolbar: a literal here would assert the toolbar's current default instead of
    // the component's contract, and would fail the moment that default moved (it did — the pinned 30
    // this replaces broke when the specimens were unpinned).
    const step = Object.keys(LADDER).find((s) => capped.classList.contains(`rt-ds-avatar-${s}`));
    if (!step) throw new Error(`the group must carry a ladder size class, got "${capped.className}"`);
    const box = Math.round(parseFloat(getComputedStyle(discs[0]).width));
    if (box !== LADDER[step]) throw new Error(`a ${step} group's discs should be ${LADDER[step]}px, got ${box}px`);
    for (const d of discs) {
      const w = Math.round(parseFloat(getComputedStyle(d).width));
      if (w !== box) throw new Error(`every disc must render at the group's box (${box}px), got ${w}px`);
    }
    const counterBox = Math.round(parseFloat(getComputedStyle(counter).width));
    if (Math.round(counter.getBoundingClientRect().height) !== counterBox) throw new Error("counter must be a circle (equal width/height), not a pill");

    // Overlap (no gap): every disc after the first carries a NEGATIVE inline-start margin — including the counter.
    for (let i = 1; i < discs.length; i++) {
      if (parseFloat(getComputedStyle(discs[i]).marginInlineStart) >= 0) throw new Error(`disc ${i} should overlap (negative margin), including the counter`);
    }
    // Opaque fills — the discs OVERLAP and must OBSCURE each other; a translucent (alpha) fill lets the
    // disc behind bleed through the overlap. Every fallback background must be fully opaque.
    // The alpha is RASTERISED rather than regex-parsed: on a wide-gamut display getComputedStyle
    // returns `color(display-p3 …)`, which matches no rgba() pattern — and a regex that finds nothing
    // has to pick a default, so the old form defaulted to opaque and passed whatever it was handed.
    // `parseColor` puts the value through a 2d canvas and reads the real byte back ([[measured-token-rows]]'s own gotcha).
    for (const d of discs) {
      const bg = getComputedStyle(d.querySelector<HTMLElement>(".rt-AvatarFallback")!).backgroundColor;
      const { a: alpha } = parseColor(bg);
      if (alpha < 1) throw new Error(`grouped avatar fill must be OPAQUE (it obscures the overlap), got ${bg} (alpha ${alpha})`);
    }
  },
};

export const Usage: Story = {
  // The one carve-out this page takes, scoped to THIS story: DODONT_LABEL — the DO/DON'T word row only
  // (--ds-text-success/-error on the weak semantic fill), 4.10 at 12px bold, under axe's 4.5;
  // colour-not-alone, since the word + the check/X icon carry the meaning (WCAG 1.4.1). Listing it here
  // is mandatory rather than decorative: Storybook REPLACES arrays when merging parameters, so this
  // array wins outright over preview.tsx's identical default.
  //
  // THE "+N" COUNTER'S STANDING CONTRAST EVIDENCE. axe reports one INCOMPLETE against the counter's
  // "+3" glyph — `elmPartiallyObscuring`, "background color could not be determined because it partially
  // overlaps other elements". It is not a defect, and it is not resolvable. Both halves were MEASURED on
  // this page rather than assumed:
  //   · WHY axe punts — it samples `elementsFromPoint` at the glyph's corners and centre. The 40%
  //     overlap pulls the disc BEHIND the counter under the glyph's left edge, so that disc is in the
  //     stack at the left corners and absent at the right ones. Differing stacks → incomplete.
  //   · WHY z-order cannot fix it — `elementsFromPoint` is geometry, not paint order. Measured live on
  //     this page: `position:relative; z-index:1` leaves it incomplete; `isolation:isolate` leaves it
  //     incomplete AND downgrades the reason to `bgOverlap`. Zeroing the negative margin resolves it
  //     (0 incomplete, 1 pass) — so the overlap IS the cause, and the overlap is the component.
  //   · WHAT THE ANSWER ACTUALLY IS — sampled off a rendered PNG of the counter disc rather than off
  //     getComputedStyle: light, ink rgb(28,32,36) on fill rgb(217,217,224) = 11.67:1; dark, ink
  //     rgb(237,238,240) on fill rgb(54,58,63) = 9.86:1. Both clear the 4.5 floor twofold or better.
  // Re-measure the same way if the counter's fill or ink ever changes. Do NOT blanket-disable
  // color-contrast to silence it — that would take every other piece of text on the page with it.
  parameters: { a11y: { context: { exclude: [DODONT_LABEL] } } },
  render: (_args, { globals }) => (
    <Page maxWidth={900}>
      <PageHeader title="AvatarGroup · Usage" standfirst={DEFINITION} />
      <Section
        title="A column of teams, read in one pass"
        lead="A stack almost never appears alone. Its habitat is the trailing column of a row that repeats — a project in a list, a request in a queue — where the reader is scanning downward and wants one thing from each row: is my team on this, and roughly how many people are. That is what the overlap buys, and it is why the width has to stay predictable from row to row."
      >
        <Surface>
          <Flex direction="column">
            <Flex direction="column" pb="2">
              <RowTitle>Projects</RowTitle>
              <RowMeta>Sorted by last activity</RowMeta>
            </Flex>
            <ProjectRow title="Payments platform" meta="Updated 12 minutes ago">
              <AvatarGroup max={4} label="7 people on Payments platform">{many(7)}</AvatarGroup>
            </ProjectRow>
            <ProjectRow title="Identity and access" meta="Updated 2 hours ago">
              <AvatarGroup max={4} label="3 people on Identity and access">{many(3)}</AvatarGroup>
            </ProjectRow>
            <ProjectRow title="Ledger exports" meta="Updated yesterday">
              <AvatarGroup max={4} label="2 people on Ledger exports">{many(2)}</AvatarGroup>
            </ProjectRow>
          </Flex>
        </Surface>
        <Caption>
          Three teams of different sizes, and the column still lines up: a capped stack has a ceiling, so
          the rows never fight each other for width. The full membership lives one click into the project
          — that is the deal the stack is making, a summary here and the detail where there is room for it.
        </Caption>
      </Section>

      <Rule />

      <Section
        title="Cap it before it costs the row"
        lead="Without max a stack grows with the team, and everything to its left is squeezed by however many people happened to join. With it, the stack has a fixed ceiling and the surplus folds into one counter — so the row's layout is a decision you made rather than a consequence of the data."
      >
        <Flex direction="column" gap="4">
          <Scenario
            label="UNCAPPED"
            caption="Seven approvers, seven discs. The stack has taken width the title needed, and a busier request would take more."
          >
            <RequestRow>
              <AvatarGroup label="7 people approved">{many(7)}</AvatarGroup>
            </RequestRow>
          </Scenario>
          <Scenario
            label="CAPPED · max=4"
            caption="The same seven, capped. Four discs and a +3 counter — the row is the width you designed, and the count is still there to be read."
          >
            <RequestRow>
              <AvatarGroup max={4} label="7 people approved">{many(7)}</AvatarGroup>
            </RequestRow>
          </Scenario>
        </Flex>
        <Caption>
          The <Code>+3</Code> is another <Code>Avatar</Code> — same diameter, same circle, overlapping like
          the rest — so the eye counts along one unbroken row of discs instead of stopping at a differently
          shaped chip. It announces itself as "3 more".
        </Caption>
      </Section>

      <Rule />

      <Section
        title="One box, and where it comes from"
        lead="The group owns the size, not the children: every disc renders at the group's box and a per-child size is discarded, so a stack can never come out ragged. Leave the box unset and it follows the global size setting along with everything else; pin it only when the row it sits in has to hold one diameter regardless."
      >
        <Grid columns={{ initial: "1", sm: "2" }} gapX="6" gapY="5">
          <Scenario label="TRACKS THE TOOLBAR" caption={<>Size left unset — the default. The stack follows the global <Code>uiSize</Code> setting like every other sized component; flip the toolbar above and watch this one resize while its neighbour holds.</>}>
            <IncidentRow>
              <AvatarGroup max={4} label="6 responders">{many(6)}</AvatarGroup>
            </IncidentRow>
          </Scenario>
          <Scenario label="PINNED" caption={<>An explicit <Code>lg</Code> opts out of the toolbar and holds 30px at every tier. At the <strong>medium</strong> tier the ramp lands on 30 too, so the pair looks identical there — flip the toolbar to <strong>small</strong> or <strong>large</strong> and this one holds while its neighbour moves. Reach for a pin only when a row must keep one diameter regardless of the global size.</>}>
            <IncidentRow>
              <AvatarGroup size="lg" max={4} label="6 responders">{many(6)}</AvatarGroup>
            </IncidentRow>
          </Scenario>
        </Grid>
      </Section>

      <Rule />

      <Section
        title="Name the group for what it is"
        lead="The stack is one thing to a screen reader — a named group — and that name is the entire picture, because the discs are initials with no names attached to them. Left unset it falls back to a count of avatars, which describes the control rather than the people inside it."
      >
        <Grid columns={{ initial: "1", sm: "2" }} gap="3">
          <DoDont
            kind="do"
            bare
            note={<>A label that says who these people ARE. The reader gets the same summary from the name that a sighted reader gets from the picture.</>}
          >
            <Box data-label="named" style={{ width: "100%" }}>
              <LabelledProjectRow>
                <AvatarGroup max={4} label="7 people on Payments platform">{many(7)}</AvatarGroup>
              </LabelledProjectRow>
            </Box>
          </DoDont>
          <DoDont
            kind="dont"
            bare
            note={<>The same stack with no <Code>label</Code>. It announces "7 avatars" — the reader is told the shape of the control and nothing about whose project this is.</>}
          >
            <Box data-label="default" style={{ width: "100%" }}>
              <LabelledProjectRow>
                <AvatarGroup max={4}>{many(7)}</AvatarGroup>
              </LabelledProjectRow>
            </Box>
          </DoDont>
        </Grid>
      </Section>

      <Rule />

      <Section
        title="A summary, not a roster"
        lead="The overlap covers 40% of every disc except the last, so a stack can say HOW MANY and roughly WHO — and it can never say WHICH. The moment a reader has to tell one person from another, or read something that differs per person, the picture is the wrong shape for the job and the row has to give back the space it saved."
      >
        <Grid columns={{ initial: "1", sm: "2" }} gap="3">
          <DoDont
            kind="do"
            bare
            note={<>Everyone in this stack did the same thing, so one summary covers all of them and the count is the only per-person detail worth carrying.</>}
          >
            <Box style={{ width: "100%" }}>
              <Surface maxWidth="100%">
                <Flex direction="column" gap="2">
                  <RowMeta>Approved by</RowMeta>
                  <Flex align="center" gap="3">
                    <AvatarGroup max={4} label="7 people approved this request">{many(7)}</AvatarGroup>
                    <Button priority="secondary">See all</Button>
                  </Flex>
                </Flex>
              </Surface>
            </Box>
          </DoDont>
          <DoDont
            kind="dont"
            bare
            note={<>Three different verdicts folded into one picture. Two of the three discs are 40% covered, none of them carries a name, and there is nowhere to hang "requested changes" — so the reader cannot act on any of it.</>}
          >
            <Box style={{ width: "100%" }}>
              <Surface maxWidth="100%">
                <Flex direction="column" gap="2">
                  <RowMeta>Review status</RowMeta>
                  <Flex align="center" gap="3">
                    <AvatarGroup label="3 reviewers">{many(3)}</AvatarGroup>
                    <RowMeta>1 approved · 1 requested changes · 1 pending</RowMeta>
                  </Flex>
                </Flex>
              </Surface>
            </Box>
          </DoDont>
        </Grid>
        <Caption>
          Where the reader needs individuals, unstack it: one row per person, with that person's detail
          beside their name. Two more habits worth keeping — set <Code>max</Code> on any stack whose length
          is data-driven, and give every group a <Code>label</Code> that names the people rather than
          counting the discs.
        </Caption>
      </Section>

      <Rule />

      {/* The closing reference section. The provider is what makes the table live: every measured row
          re-reads its value when this key changes, so an accent/appearance flip re-resolves the spec. */}
      <HexThemeKey.Provider value={`${globals.accent}-${globals.appearance}-${globals.contrast}`}>
        <Section
          title="Tokens"
          lead="Every row below is read off a rendered stack and checked against the token it names, so the table reports what the stack paints rather than what the tokens say. Zero net-new colour: the disc fills are Avatar's own, swapped to their opaque step; only the read-through ring and the overlap belong to the group."
        >
          <AvatarGroupTokens />
        </Section>
      </HexThemeKey.Provider>
    </Page>
  ),
  play: async ({ canvasElement }) => {
    // The token table's EVIDENCE, asserted at runtime — every row read a REAL rendered part of a real
    // stack (both fills, the count's ink, and the ring's colour out of its box-shadow), never a swatch
    // this story painted. `rows: N` is the exact form: an "at least one" floor is satisfied by a table
    // that has not filled in yet.
    const rows = await awaitMeasuredRows(canvasElement, { rows: SPEC_ROWS });
    if (rows.measured !== SPEC_ROWS || rows.unproven !== 0) {
      throw new Error(`expected ${SPEC_ROWS} measured / 0 unproven token rows, got ${rows.measured} / ${rows.unproven}`);
    }

    // The label do/don't teaches ONE rule by turning ONE prop, so the page is only honest if the markup
    // actually differs there. Assert the accessible name each card claims: the DO names the people, the
    // DON'T falls back to the component's own count of discs.
    const nameOf = (key: string) =>
      canvasElement.querySelector(`[data-label="${key}"] .rt-ds-avatar-group`)?.getAttribute("aria-label");
    if (nameOf("named") !== "7 people on Payments platform") {
      throw new Error(`the DO stack must carry its own label, got ${JSON.stringify(nameOf("named"))}`);
    }
    if (nameOf("default") !== "7 avatars") {
      throw new Error(`the DON'T stack must show the unlabelled count fallback, got ${JSON.stringify(nameOf("default"))}`);
    }
  },
};

const GROUP_PROPS: PropDef[] = [
  { name: "children", type: "ReactNode", desc: <>The avatars to stack — <Code>Avatar</Code> elements. Every one renders at the group's box, so a per-child <Code>size</Code> is overridden.</>, source: "AvatarGroup.tsx:9" },
  { name: "size", type: `"xs" | "sm" | "md" | "lg" | "xl" | number | "inherit"`, def: "portrait ramp (md at small)", desc: <>The box every disc renders at — the same line-height ladder <Code>Avatar</Code> rides (<Code>xs</Code> 16 · <Code>sm</Code> 20 · <Code>md</Code> 24 · <Code>lg</Code> 30 · <Code>xl</Code> 40). Unset, it follows the global <Code>uiSize</Code> on the <strong>portrait</strong> ramp (<Code>small</Code> → <Code>md</Code>, 24px · <Code>medium</Code> → <Code>lg</Code>, 30px · <Code>large</Code> → <Code>xl</Code>, 40px), not the beside-text ramp a standalone <Code>Avatar</Code> takes: a stack is an identity, and discs overlapped by 40% need a face-sized box to read as people. The overlap is derived from the box, so the stack stays proportional at every step.</>, source: "AvatarGroup.tsx:11" },
  { name: "max", type: "number", desc: <>Show at most this many avatars; the surplus folds into a single <Code>+N</Code> counter. The counter reuses <Code>Avatar</Code>, so it's the same diameter and circle as the rest of the stack — never a shorter pill. Set it on any stack whose length is data-driven.</>, source: "AvatarGroup.tsx:13" },
  { name: "label", type: "string", def: '"{count} avatars"', desc: <>Accessible name for the stack. The root is a <Code>role="group"</Code>, so a screen reader announces one named unit (e.g. "4 team members") instead of a pile of loose discs. The <Code>+N</Code> counter announces itself as "<Code>N more</Code>" inside it.</>, source: "AvatarGroup.tsx:18" },
];

// `children` is listed only so its inferred control can be switched off below — the story builds
// the avatars itself from `count`.
type PGArgs = { size: AvatarSize | "auto" | "inherit"; count: number; max: number; label: string; children?: ReactNode };
export const Props: StoryObj<PGArgs> = {
  // "auto" (size unset) is the default so the stack tracks the global uiSize toolbar out of the box.
  args: { size: "auto", count: 6, max: 4, label: "" },
  argTypes: {
    size: { control: "inline-radio", options: ["auto", "xs", "sm", "md", "lg", "xl", "inherit"], description: '"auto" tracks the global uiSize toolbar (unset); a t-shirt name pins the box; "inherit" opts out (Radix default). A raw px number is also accepted in code.', table: { category: "Size" } },
    count: { control: { type: "number", min: 1, max: 7 }, description: "How many avatars the story renders — it builds `children` for you.", table: { category: "Content" } },
    max: { control: { type: "number", min: 1, max: 7 }, description: "Cap the visible discs; the rest fold into the +N counter.", table: { category: "Content" } },
    label: { control: "text", description: 'Accessible name for the group. Blank = the default "{count} avatars".', table: { category: "A11y" } },
    // `children` is built from `count` above — an editable JSON control for it would only produce
    // React elements the panel can't author, so the row is dropped rather than left inert.
    children: { control: false, table: { disable: true } },
  },
  parameters: { controls: { disable: false } },
  render: ({ size, count, max, label }: PGArgs) => (
    <Page maxWidth="none">
      <PageHeader title="AvatarGroup · Props" standfirst={DEFINITION} />
      <Box style={{ padding: "8px 0 2px" }}>
        <AvatarGroup
          size={size === "auto" ? undefined : size}
          max={max}
          {...(label ? { label } : {})}
        >
          {many(count)}
        </AvatarGroup>
      </Box>
      <PropsLead />
      <Rule />
      <Section title="Props reference" lead={<>Every prop <Code>AvatarGroup</Code> accepts. It paints nothing of its own — the discs are <Code>Avatar</Code>s; the group adds the box, the overlap, the ring, and the named-group boundary.</>}>
        <PropTable rows={GROUP_PROPS} />
      </Section>
    </Page>
  ),
};

export const History: Story = {
  render: () => (
    <Page>
      <PageHeader title="AvatarGroup · History" standfirst={DEFINITION} />
      <Section title="Decisions" lead="The rulings this component encodes.">
        <Flex direction="column" gap="3">
          <Decision id="Reuse">
            The <Code>+N</Code> overflow counter <strong>reuses <Code>Avatar</Code></strong> — the same
            diameter, the same circle, overlapping like every other disc — rather than a pill{" "}
            <Code>Badge</Code> or a bespoke counter. The surplus is the one place in the row where the eye
            stops to read a number, and a differently shaped thing sitting there breaks the stack at
            exactly the point it is being counted.
          </Decision>
          <Decision id="Ring">
            Each disc carries a 2px <Code>--ds-bg-base</Code> ring so overlaps read on any background. It
            is drawn as a <strong>shadow</strong>, not a border, so keeping the discs apart costs the box
            no width and the stack's whole geometry stays derived from one number.
          </Decision>
          <Decision id="Overlap">
            Discs overlap ~40% of the box — tight enough that the row reads as one cohesive unit, not a
            spaced "caterpillar". The figure is <strong>derived from the box</strong>, so a stack stays
            proportional at every size step instead of needing a table of pitches.
          </Decision>
          <Decision id="Uniform">
            All children render at the group's size; per-child sizes are overridden. A stack is one
            picture, and a single disc a step out of line reads as a defect rather than as emphasis.
          </Decision>
          <Decision id="Opaque fills">
            A grouped disc takes the <strong>opaque</strong> twin of the standalone avatar's tinted fill.
            The standalone tint is an alpha step — a difference invisible until discs overlap, at which
            point the disc behind bleeds through the one in front. The counter's neutral is opaque for the
            same reason.
          </Decision>
          <Decision id="Group a11y">
            The root carries <Code>role="group"</Code> + an accessible name (the <Code>label</Code> prop,
            or a "N avatars" default), so a screen reader reaches the stack as one named group (e.g.
            "6 team members") rather than an unlabelled pile of discs. The counter's own name is carried{" "}
            <strong>inside</strong> its fallback rather than handed in as a prop: an{" "}
            <Code>aria-label</Code> on an avatar is routed onto an <Code>&lt;img&gt;</Code> that never
            mounts without a <Code>src</Code>, so the name silently evaporated.
          </Decision>
        </Flex>
      </Section>
      <Rule />
      <Section title="Changelog" lead="Notable changes, newest first.">
        <Decision id="0.9.0">Initial component — tight overlapped stack (~40%), bg-base ring, and the same-size Avatar "+N" counter disc.</Decision>
      </Section>
    </Page>
  ),
};
