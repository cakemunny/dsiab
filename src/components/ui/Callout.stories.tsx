import { useLayoutEffect, useRef, useState, type ReactNode } from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { Box, Code, Flex, Grid } from "@radix-ui/themes";
import { Bell, CheckCircle, Info, Warning, WarningCircle } from "@phosphor-icons/react";
import { Callout, type CalloutActionPlacement, type CalloutTone, type CalloutUrgency } from "./Callout";
import { Button } from "./Button";
import {
  AnatomyLegend, Caption, Decision, DoDont, DODONT_LABEL, dotStyle, HexThemeKey, hLine, MeasuredRow, MeasuredSpec,
  NoteRow, Page, PageHeader, PropsLead, PropDef, PropTable, Rule, Scenario, Section, tick, TokenGroup,
} from "./_storyKit";
import { ComparisonSection, MESSAGING_COMPARISON } from "./_comparisons";
import { assertMeasuredRows, themeRoot, resolveColor, parseColor, withAccent } from "../../foundations/_assert";

/** The one definition of this component — the standfirst every page of it opens with. */
const DEFINITION = (
  <>
    An in-page message that speaks in urgency, not raw Radix variants — <Code>passive</Code> for ambient
    context, <Code>attention</Code> for something that must be noticed. Semantic tone paints from the
    accent-aware families, each with a fixed icon, so colour is never the only signal. The optional{" "}
    <Code>actions</Code> slot takes a secondary button, never the page's solid primary.
  </>
);

const rootOf = (el: Element | null) => el?.querySelector<HTMLElement>(".rt-CalloutRoot") ?? null;
const variantOf = (b: HTMLElement | null) =>
  b ? Array.from(b.classList).find((c) => c.startsWith("rt-variant-"))?.replace("rt-variant-", "") : undefined;

/* ---- anatomy diagram ------------------------------------------------------
   The callout's parts are STACKED inside one box, so the callouts sit in gutters either side of the
   specimen and run a leader into the part they name. Two gutters, not one: the icon, the title and the
   dismiss control all share the first line's midpoint (22px at small, 36px at large), so a single column
   of dots would draw three of them on top of each other. The left gutter names what starts at the box's
   leading edge; the right gutter names the lead line and the two trailing controls.

   Positions are MEASURED off the live specimen: the body re-wraps with the container's width and every
   row moves the moment the size toolbar changes, so none of these y values can be written down. */

const GUTTER = 60;
const FRAME_W = 560;
/** Room above and below the box for the container callout, which is anchored to its own TOP edge. */
const BAND = 16;
const DOT = 20; // dotStyle's diameter
/** Where the leaders in each gutter turn their corner, in from the frame's outer edge — one shared
 *  line per side, so the elbows read as a set. */
const ELBOW = 38;
/** Closest two dots in one gutter may sit, centre to centre. A dot is 20px tall. */
const MIN_GAP = 26;

/** [callout, selector inside the specimen, where on that element to anchor, which gutter]. */
const PINS: [number, string, "top" | "center", "left" | "right"][] = [
  [1, ".rt-CalloutRoot", "top", "left"],
  [2, ".rt-CalloutIcon", "center", "left"],
  [4, ".rt-CalloutText:not(.rt-r-weight-bold)", "center", "left"],
  // Radix stamps its own weight class on the bold lead line, so the title and the body are told apart by
  // what they ARE rather than by their order in the box — a callout with no title still resolves both.
  [3, ".rt-CalloutText.rt-r-weight-bold", "center", "right"],
  [5, ".rt-ds-callout-actions", "center", "right"],
  [6, ".rt-ds-callout-dismiss", "center", "right"],
];

function AnatomyDiagram() {
  const frame = useRef<HTMLDivElement>(null);
  const specimen = useRef<HTMLDivElement>(null);
  const [pins, setPins] = useState<Record<number, { dotY: number; partY: number }>>({});
  /** The specimen's own edges inside the frame — measured, not derived from the padding, so the leaders
   *  land on the box rather than on where the arithmetic says the box should be. */
  const [edges, setEdges] = useState({ left: GUTTER, right: GUTTER + FRAME_W, width: FRAME_W + GUTTER * 2 });

  useLayoutEffect(() => {
    const f = frame.current;
    const s = specimen.current;
    if (!f || !s) return;

    const measure = () => {
      const frameBox = f.getBoundingClientRect();
      const specBox = s.getBoundingClientRect();
      const next: Record<number, { dotY: number; partY: number }> = {};
      for (const side of ["left", "right"] as const) {
        const measured: { n: number; partY: number }[] = [];
        for (const [n, sel, anchor, pinSide] of PINS) {
          if (pinSide !== side) continue;
          const el = s.querySelector<HTMLElement>(sel);
          if (!el) continue;
          const box = el.getBoundingClientRect();
          measured.push({
            n,
            partY: Math.round(box.top + (anchor === "top" ? 0 : box.height / 2) - frameBox.top),
          });
        }
        // Sorted by where the parts ACTUALLY are, not by declaration order — the title disappears when
        // there is none, and the rows below it move up. One forward pass over the sorted list keeps any
        // two dots a legible distance apart; the leader turns a corner to reach its part, so the dot
        // moves and the line still lands.
        measured.sort((a, b) => a.partY - b.partY);
        let floor = -Infinity;
        for (const m of measured) {
          const dotY = Math.max(m.partY, floor + MIN_GAP);
          floor = dotY;
          next[m.n] = { dotY, partY: m.partY };
        }
      }
      const nextEdges = {
        left: Math.round(specBox.left - frameBox.left),
        right: Math.round(specBox.right - frameBox.left),
        width: Math.round(frameBox.width),
      };
      // Only write when something moved — the frame's own size feeds this observer otherwise.
      setPins((prev) => (JSON.stringify(prev) === JSON.stringify(next) ? prev : next));
      setEdges((prev) => (JSON.stringify(prev) === JSON.stringify(nextEdges) ? prev : nextEdges));
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
      <Box
        ref={frame}
        style={{
          position: "relative", width: FRAME_W + GUTTER * 2,
          paddingLeft: GUTTER, paddingRight: GUTTER, paddingTop: BAND, paddingBottom: BAND,
        }}
      >
        <Box ref={specimen} data-testid="anatomy" style={{ width: FRAME_W }}>
          <Callout
            urgency="passive"
            icon={<Info weight="fill" aria-hidden />}
            title="Scheduled maintenance"
            actions={<Button priority="secondary">View status</Button>}
            onDismiss={() => {}}
          >
            The dashboard will be read-only on Sunday from 02:00–04:00 UTC while we upgrade the database.
          </Callout>
        </Box>

        {PINS.map(([n, , , side]) => {
          const pin = pins[n];
          if (!pin) return null;
          const { dotY, partY } = pin;
          const right = side === "right";
          // The two gutters are mirror images: the dot sits at the outer end, the leader turns on the
          // gutter's shared elbow line, and the last segment runs into the specimen's near edge.
          const dotX = right ? edges.width - DOT : 0;
          const elbow = right ? edges.right + (GUTTER - ELBOW) : edges.left - (GUTTER - ELBOW);
          const stem = right
            ? { left: elbow, top: dotY, width: Math.max(0, dotX - 2 - elbow) }
            : { left: DOT + 2, top: dotY, width: Math.max(0, elbow - DOT - 2) };
          const reach = right
            ? { left: edges.right + 4, top: partY, width: Math.max(0, elbow - edges.right - 4) }
            : { left: elbow, top: partY, width: Math.max(0, edges.left - 4 - elbow) };
          return (
            <Box key={n}>
              <Box data-pin={n} style={{ ...dotStyle, left: dotX, top: dotY - DOT / 2 }}>{n}</Box>
              {/* out of the dot… */}
              <Box style={hLine(stem)} />
              {/* …along the gutter's elbow line to the part's own row (nothing drawn when they agree)… */}
              {dotY !== partY && (
                <Box style={tick({ left: elbow, top: Math.min(dotY, partY), height: Math.abs(dotY - partY) })} />
              )}
              {/* …and into the part. */}
              <Box style={hLine(reach)} />
            </Box>
          );
        })}
      </Box>
    </Box>
  );
}

/* ---- anatomy parts legend (Callout-specific) ----------------------------- */
const ANATOMY_PARTS: [number, string, string][] = [
  [1, "Container", "the surface — fill (passive/soft) or fill + hairline border (attention/surface); radius + padding scale with size"],
  [2, "Icon", "a fixed per-tone glyph (colour-not-alone, WCAG 1.4.1); overridable, or suppressed with icon={null}"],
  [3, "Title", "an optional bold lead line — a paragraph, not a heading (keeps the document outline clean)"],
  [4, "Body", "the message; rides the 65-char reading measure"],
  [5, "Action", "an optional trailing System/Button — secondary, never the page's solid primary; sits below the body by default, or inline (end-pinned on the first line) for short messages"],
  [6, "Dismiss", "an optional top-right inset ✕ (≥24×24); the consumer owns whether dismissal persists"],
];

/* ========================================================================== */
const meta: Meta<typeof Callout> = {
  title: "Components/Feedback & Status/Callout",
  component: Callout,
  // color-contrast is NOT disabled at meta scope — it stays ON for every story so the neutral/prose
  // specimens are genuinely checked. Only the stories that render soft-fill semantic specimens scope
  // it off per-story, as a labelled specimen exception. The reason is [[soft-fill-text-exception]], NOT the retired solid-fill large/bold
  // provision: Callout body text is 14px at weight 400, which qualifies as neither, so the 3.0 tier
  // cannot be borrowed here. It is a measured exception at 4.10-4.43 in light (7.7-10.4 in dark).
  parameters: {
    controls: { disable: true },
    docs: {
      description: {
        component:
          "The system callout speaks in **urgency**, not raw Radix variants — **passive** (soft, ambient " +
          "context) or **attention** (surface + hairline border, a message that must be noticed). Semantic " +
          "**tone** (`error/warning/success/info`) paints from the accent-aware `--ds-*` families via a " +
          "`[data-tone]` bridge, so status colour follows the brand's collision shifts, and each tone carries " +
          "a fixed icon (colour is never the only signal). Optional `title`, `onDismiss` (a top-right inset ✕), " +
          "and an `actions` slot (a *secondary* button — never the page's solid primary).",
      },
    },
  },
};
export default meta;
type Story = StoryObj<typeof Callout>;

/* ---- Anatomy ------------------------------------------------------------- */
/** The parts of a callout, its urgencies, tones, and slots. The token spec lives on Usage. */
export const Anatomy: Story = {
  // OPEN — needs a ruling, not a repair here. The soft toned Callout paints step-11 ink on its
  // own step-3 tint and cannot clear 4.5 in light mode. Measured off the rendered pixels (default iris
  // accent, so this is NOT the brand-accent tolerance): success #218358 on #e3f3e9 = 4.10, info #107d98
  // on #dbf4f7 = 4.15, warning #ab6400 on #fdf5c0 = 4.17, error #ce2c31 on #fbe8ea = 4.43. None of the
  // standing tolerances actually reach this case — the solid-fill 3.0 allowance is about step-9 fills
  // with white text, the amber-11 allowance is a 0.05 slack on ONE token against the page background,
  // and the brand-accent floor is 4.39 (all four tones sit under it). Fixing it means moving the tone
  // ink or the tint, i.e. tokens — out of scope for this pass.
  // Scoped to the TEXT nodes only. The previous ".rt-CalloutRoot[data-tone]" dropped the whole callout
  // from every axe rule, so its links, action buttons and dismiss control were unchecked too; those are
  // back under full coverage, as are neutral callouts and the rest of the page.
  parameters: { a11y: { context: { exclude: [DODONT_LABEL, ".rt-CalloutRoot[data-tone] .rt-CalloutText"] } } },
  render: (_args, { globals }) => (
    <HexThemeKey.Provider value={`${globals.accent}-${globals.appearance}-${globals.contrast}`}>
      <Page>
        <PageHeader title="Callout · Anatomy" standfirst={DEFINITION} />
        <Section title="Anatomy" lead="A neutral, passive callout is the rest layer — the specimen below leaves size unset, so it rides the global UI size lane along with the action button inside it. A container holds a status icon, an optional bold title, the message body, and optional trailing action + dismiss controls.">
          <AnatomyDiagram />
          <AnatomyLegend parts={ANATOMY_PARTS} />
          <Caption>The title is a bold paragraph, not a heading — a callout can sit at any nesting depth without injecting a jump into the document outline.</Caption>
        </Section>

        <Rule />

        <Section title="Urgency" lead="Same message, two intensities — set side by side so the only delta, the edge, actually reads. Passive is a flat fill (ambient — absorb or skip); attention adds a hairline border (a message the user must not miss). Spend attention sparingly, or the border stops meaning anything.">
          <Grid columns={{ initial: "1", sm: "2" }} gap="4" style={{ maxWidth: 640 }}>
            <Scenario label="PASSIVE · soft" caption="Fill only — no edge.">
              <Box data-testid="urg-passive"><Callout urgency="passive" tone="warning">Your session expires in 10 minutes.</Callout></Box>
            </Scenario>
            <Scenario label="ATTENTION · surface" caption="Fill + a hairline border.">
              <Box data-testid="urg-attention"><Callout urgency="attention" tone="warning">Your session expires in 10 minutes.</Callout></Box>
            </Scenario>
          </Grid>
        </Section>

        <Rule />

        <Section title="Semantic tones" lead="error / warning / success / info paint from the accent-aware family tokens, so they follow the brand-collision shift.">
          <Flex direction="column" gap="4" style={{ maxWidth: 560 }}>
            <Box data-testid="tone-error"><Callout tone="error">Something went wrong. Please try again.</Callout></Box>
            <Box data-testid="tone-warning"><Callout tone="warning">Review your changes before continuing.</Callout></Box>
            <Box data-testid="tone-success"><Callout tone="success">Your changes were saved.</Callout></Box>
            <Box data-testid="tone-info"><Callout tone="info">A new version is available.</Callout></Box>
          </Flex>
        </Section>

        <Rule />

        <Section title="Icon" lead="Each tone maps to a fixed glyph (colour-not-alone, WCAG 1.4.1). Override with `icon`, or suppress with `icon={null}`.">
          <Flex direction="column" gap="4" style={{ maxWidth: 560 }}>
            <Box data-testid="icon-default-info"><Callout tone="info">Default info glyph.</Callout></Box>
            <Box data-testid="icon-override"><Callout tone="info" icon={<Bell weight="fill" aria-hidden />}>Overridden glyph.</Callout></Box>
            <Box data-testid="icon-suppressed"><Callout tone="info" icon={null}>No glyph.</Callout></Box>
          </Flex>
        </Section>

        <Rule />

        <Section title="Announcement" lead="error interrupts (role=&quot;alert&quot;); warning/success/info carry no role by default. Opt a dynamically-inserted callout into a polite live region with `announce`.">
          <Box data-testid="announced" style={{ maxWidth: 560 }}>
            <Callout tone="info" announce>A new version is available.</Callout>
          </Box>
        </Section>

        <Rule />

        <Section title="Title + body" lead="A short bold title above multi-sentence body copy; the body rides the 65-char reading measure (GUIDELINES §3).">
          <Box data-testid="titled" style={{ maxWidth: 560 }}>
            <Callout tone="info" title="Scheduled maintenance">
              The dashboard will be read-only on Sunday from 02:00–04:00 UTC while we upgrade the database.
              Draft changes are saved automatically and will sync when service resumes.
            </Callout>
          </Box>
        </Section>

        <Rule />

        <Section title="Dismissible" lead="onDismiss renders a top-right inset ✕ (ghost, ≥24×24). The consumer owns whether dismissal is remembered.">
          <Box data-testid="dismissable" style={{ maxWidth: 560 }}>
            <Callout tone="info" title="Tip" onDismiss={() => {}}>
              You can drag columns to reorder them. This note won’t come back this session.
            </Callout>
          </Box>
        </Section>

        <Rule />

        <Section title="Action slot" lead="A trailing action uses System/Button priority=&quot;secondary&quot; — never primary (one solid per page belongs to the page, not a callout). It sits below the body by default; end-pin it inline (actionPlacement=&quot;inline&quot;) only when the message is short.">
          <Flex direction="column" gap="4" style={{ maxWidth: 560 }}>
            <Box data-testid="actioned">
              <Callout
                tone="warning"
                title="Storage almost full"
                actions={<Button priority="secondary">Manage storage</Button>}
              >
                You’re using 95% of your plan’s storage. Free up space or upgrade to avoid interruptions.
              </Callout>
            </Box>
            <Box data-testid="action-inline">
              <Callout
                tone="info"
                actionPlacement="inline"
                actions={<Button priority="secondary">Extend</Button>}
              >
                Your session expires in 10 minutes.
              </Callout>
            </Box>
          </Flex>
          <Caption>Below (default) keeps a wrapping message readable; inline suits a single-line message where the action fits on the same row.</Caption>
        </Section>

      </Page>
    </HexThemeKey.Provider>
  ),
  play: async ({ canvasElement }) => {
    // Every numbered part in the legend has a callout ON the specimen — a numbered legend with nothing
    // to point at is the defect this diagram exists to avoid.
    const anatomyPins = canvasElement.querySelectorAll("[data-pin]");
    if (anatomyPins.length !== ANATOMY_PARTS.length)
      throw new Error(`expected ${ANATOMY_PARTS.length} callout pins on the specimen; got ${anatomyPins.length}`);

    const passive = variantOf(rootOf(canvasElement.querySelector('[data-testid="urg-passive"]')));
    const attention = variantOf(rootOf(canvasElement.querySelector('[data-testid="urg-attention"]')));
    if (passive !== "soft") throw new Error(`urgency passive → soft, got "${passive}"`);
    if (attention !== "surface") throw new Error(`urgency attention → surface, got "${attention}"`);

    const root = themeRoot(canvasElement);
    // Tolerance defaults to a tight 2 for the SOLID --ds-text-* compare; the weak (a3-alpha) fill,
    // rasterized over a backdrop, is flake-prone, so its compare passes a looser ~10 (Badge-plan parity).
    const sameRGB = (
      a: { r: number; g: number; b: number },
      b: { r: number; g: number; b: number },
      tol = 2,
    ) => Math.abs(a.r - b.r) < tol && Math.abs(a.g - b.g) < tol && Math.abs(a.b - b.b) < tol;

    // Each tone's text + fill resolve to the --ds-* family token (rasterized, not regex).
    for (const fam of ["error", "warning", "success", "info"] as const) {
      const el = rootOf(canvasElement.querySelector(`[data-testid="tone-${fam}"]`));
      if (!el) throw new Error(`tone-${fam} not rendered`);
      const gotText = parseColor(getComputedStyle(el).color);
      const wantText = resolveColor(root, `--ds-text-${fam}`);
      if (!sameRGB(gotText, wantText)) throw new Error(`tone ${fam} text ≠ --ds-text-${fam}`);
      const gotFill = parseColor(getComputedStyle(el).backgroundColor);
      const wantFill = resolveColor(root, `--ds-fill-${fam}-weak`);
      if (!sameRGB(gotFill, wantFill, 10)) throw new Error(`tone ${fam} fill ≠ --ds-fill-${fam}-weak`);
    }

    // Brand-collision shift: under a grass brand, success routes to lime (COLLISION_TABLE) — verify by
    // resolved hex, not pixels. The bridge re-resolves synchronously when data-accent-color flips.
    const successEl = rootOf(canvasElement.querySelector('[data-testid="tone-success"]'));
    if (!successEl) throw new Error("tone-success not rendered");
    const baseSuccess = parseColor(getComputedStyle(successEl).color);          // iris brand → green-11
    const restore = withAccent(root, "grass");
    const shifted = parseColor(getComputedStyle(successEl).color);              // grass brand → lime-11
    const wantGrass = resolveColor(root, "--ds-text-success");
    restore();
    if (!sameRGB(shifted, wantGrass)) throw new Error("success did not follow the grass→lime shift");
    if (sameRGB(shifted, baseSuccess)) throw new Error("success hex did not change under grass (bridge inert)");

    // Every toned callout is icon-distinct; icon={null} suppresses; icon override wins.
    for (const fam of ["error", "warning", "success", "info"] as const) {
      const el = rootOf(canvasElement.querySelector(`[data-testid="tone-${fam}"]`));
      if (!el?.querySelector(".rt-CalloutIcon svg")) throw new Error(`tone ${fam} is missing its fixed icon`);
    }
    const suppressed = rootOf(canvasElement.querySelector('[data-testid="icon-suppressed"]'));
    if (suppressed?.querySelector(".rt-CalloutIcon")) throw new Error("icon={null} did not suppress the icon");
    const override = rootOf(canvasElement.querySelector('[data-testid="icon-override"]'));
    if (!override?.querySelector(".rt-CalloutIcon svg")) throw new Error("icon override did not render");

    // Role — Field parity (Field.tsx:137): only error takes a baked-in role (the assertive `alert` a
    // real error earns). warning/success/info carry NO role by default; untoned is silent. `announce`
    // opts a callout into a polite live region (role="status" + aria-live="polite"). Explicit role wins.
    const roleOf = (id: string) => rootOf(canvasElement.querySelector(`[data-testid="${id}"]`))?.getAttribute("role") ?? null;
    const liveOf = (id: string) => rootOf(canvasElement.querySelector(`[data-testid="${id}"]`))?.getAttribute("aria-live") ?? null;
    if (roleOf("tone-error") !== "alert") throw new Error(`error → role="alert", got ${roleOf("tone-error")}`);
    if (roleOf("tone-warning") !== null) throw new Error(`warning → no role by default, got ${roleOf("tone-warning")}`);
    if (roleOf("tone-success") !== null) throw new Error(`success → no role by default, got ${roleOf("tone-success")}`);
    if (roleOf("tone-info") !== null) throw new Error(`info → no role by default, got ${roleOf("tone-info")}`);
    if (roleOf("urg-passive") !== null) throw new Error(`untoned passive → no role, got ${roleOf("urg-passive")}`);
    // Opt-in: announce → role="status" + aria-live="polite" (polite announcement of a dynamic insert).
    if (roleOf("announced") !== "status") throw new Error(`announce → role="status", got ${roleOf("announced")}`);
    if (liveOf("announced") !== "polite") throw new Error(`announce → aria-live="polite", got ${liveOf("announced")}`);

    // Title renders a bold first Callout.Text; the body paragraph carries the reading measure.
    const titled = rootOf(canvasElement.querySelector('[data-testid="titled"]'));
    const paras = Array.from(titled?.querySelectorAll<HTMLElement>(".rt-CalloutText") ?? []);
    if (paras.length < 2) throw new Error(`title+body should render 2 Callout.Text paragraphs, got ${paras.length}`);
    const titleWeight = getComputedStyle(paras[0]).fontWeight;
    if (Number(titleWeight) < 600) throw new Error(`title should be bold (≥600), got ${titleWeight}`);
    const body = paras[paras.length - 1];
    // Computed max-width resolves ch→px, so a "ch" substring check is always false; assert it isn't "none".
    if (getComputedStyle(body).maxWidth === "none") throw new Error("body not clamped to the reading measure");

    // Dismiss is a real <button>, named, inset (≥24×24 per 2.5.8).
    const dz = canvasElement.querySelector('[data-testid="dismissable"]');
    const xBtn = dz?.querySelector<HTMLButtonElement>("button.rt-ds-callout-dismiss");
    if (!xBtn) throw new Error("dismiss ✕ not rendered");
    if (xBtn.tagName !== "BUTTON") throw new Error("dismiss must be a real <button>");
    if (!xBtn.getAttribute("aria-label")?.trim()) throw new Error("dismiss needs an accessible name");
    if (!xBtn.hasAttribute("data-inset")) throw new Error("dismiss must be an inset IconButton");
    const r = xBtn.getBoundingClientRect();
    if (r.width < 24 || r.height < 24) throw new Error(`dismiss target < 24×24 (${r.width}×${r.height})`);

    // Action slot uses a secondary (surface) button, never a solid primary ([[button-priority]]).
    const actioned = canvasElement.querySelector('[data-testid="actioned"]');
    const actionBtn = actioned?.querySelector<HTMLElement>("button.rt-Button");
    if (!actionBtn) throw new Error("action button not rendered");
    if (actionBtn.classList.contains("rt-variant-solid")) throw new Error("callout action must NOT be a solid primary ([[button-priority]])");
    if (!actionBtn.classList.contains("rt-variant-surface")) throw new Error(`action should be secondary/surface, got "${actionBtn.className}"`);

    // Icon centres on the FIRST LINE of text (a header OR body) — never the middle of a multi-line
    // block. Measure the icon's mid-Y against the first line-box of the first Callout.Text (a Range
    // over its first text node yields the true first line, not the whole block rect) and require a
    // match within ~2px. Covers the reviewer's title+body ("titled") and title+body+action ("actioned").
    const firstLineMidY = (root: Element | null) => {
      const t = root?.querySelector(".rt-CalloutText");
      if (!t) throw new Error("no Callout.Text to measure");
      const walker = document.createTreeWalker(t, NodeFilter.SHOW_TEXT);
      const tn = walker.nextNode();
      if (!tn) throw new Error("no text node in the first Callout.Text");
      const rng = document.createRange();
      rng.selectNodeContents(tn);
      const fl = rng.getClientRects()[0];
      return fl.top + fl.height / 2;
    };
    const iconMidY = (root: Element | null) => {
      const r = root?.querySelector(".rt-CalloutIcon")?.getBoundingClientRect();
      if (!r) throw new Error("no icon to measure");
      return r.top + r.height / 2;
    };
    for (const id of ["titled", "actioned"] as const) {
      const el = rootOf(canvasElement.querySelector(`[data-testid="${id}"]`));
      const d = Math.abs(iconMidY(el) - firstLineMidY(el));
      if (d > 2) throw new Error(`icon not centred on the first line in "${id}" (Δ${d.toFixed(1)}px)`);
    }

    // Inline action (actionPlacement="inline") — end-pinned on the first line's ROW: its button rides
    // the same row as the first line (mid-Y within tolerance) and sits at the inline-end (its left edge
    // is right of the text column, i.e. a distinct end column, not stacked below). And the icon still
    // centres on the first line in this layout.
    const inlineRoot = rootOf(canvasElement.querySelector('[data-testid="action-inline"]'));
    if (!inlineRoot) throw new Error("inline-action callout not rendered");
    const inlineBtn = inlineRoot.querySelector<HTMLElement>("button.rt-Button");
    const inlineText = inlineRoot.querySelector<HTMLElement>(".rt-CalloutText");
    if (!inlineBtn || !inlineText) throw new Error("inline action button/text missing");
    if (!inlineBtn.classList.contains("rt-variant-surface")) throw new Error("inline action must stay secondary/surface ([[button-priority]])");
    const btnR = inlineBtn.getBoundingClientRect();
    const btnMidY = btnR.top + btnR.height / 2;
    if (Math.abs(btnMidY - firstLineMidY(inlineRoot)) > 4) throw new Error(`inline action is not on the first line's row (Δ${(btnMidY - firstLineMidY(inlineRoot)).toFixed(1)}px)`);
    if (btnR.left < inlineText.getBoundingClientRect().right) throw new Error("inline action should be end-pinned (right of the text column), not stacked/overlapping");
    if (Math.abs(iconMidY(inlineRoot) - firstLineMidY(inlineRoot)) > 2) throw new Error("inline layout broke the icon-first-line alignment");
  },
};

/* ---- Usage --------------------------------------------------------------- */
/** Usage: when a callout is the right home for a message, the do/don'ts, and the live token spec that
 *  closes the page. */
export const Usage: Story = {
  // Same open item as Anatomy: soft toned Callout text is step-11 ink on its own step-3 tint and lands
  // 4.10–4.43 in light mode (measured off the rendered pixels at the default iris accent). Needs a
  // ruling on the tone tokens. No standing tolerance covers it.
  // Scoped to the TEXT nodes only — the previous ".rt-CalloutRoot[data-tone]" also excused the callout's
  // links, action buttons and dismiss control from every rule. Neutral callouts and the rest of the page
  // stay contrast-checked. Two warning callouts nested INSIDE do/don't cards drop further (3.81 and 3.75)
  // because the amber tint composites over the card's own success/error tint — same token, worse stack.
  parameters: { a11y: { context: { exclude: [DODONT_LABEL, ".rt-CalloutRoot[data-tone] .rt-CalloutText"] } } },
  render: (_args, { globals }) => (
    <Page>
      <PageHeader title="Callout · Usage" standfirst={DEFINITION} />
      <ComparisonSection comparison={MESSAGING_COMPARISON} highlight="Callout" />

      <Rule />

      <Section title="Passive or attention — the decision, not the style" lead="Passive (soft) is the default: ambient context the user can absorb or skip. Attention (surface) adds a border to raise a message the user must not miss — spend it sparingly, or it stops meaning anything.">
        <Grid columns={{ initial: "1", sm: "2" }} gapX="6" gapY="5">
          <Scenario label="PASSIVE" caption="Ambient guidance beside the content it explains — a tip, a status, an FYI.">
            <Callout urgency="passive" icon={<Info weight="fill" aria-hidden />}>Drafts save automatically as you type.</Callout>
          </Scenario>
          <Scenario label="ATTENTION" caption="A message that changes what the user should do next — a limit reached, a required step.">
            <Callout urgency="attention" tone="warning" title="Verify your email">Some features stay locked until you confirm your address.</Callout>
          </Scenario>
        </Grid>
      </Section>

      <Rule />

      <Section title="Pick the tone by meaning" lead={<>Reach for a tone by what happened, not by colour. Each maps to a fixed icon so it never depends on colour alone (WCAG 1.4.1), and each paints from the accent-aware family tokens — so a failure stays red across every brand accent (flip <strong>Accent</strong> above).</>}>
        <Flex direction="column" gap="3" style={{ maxWidth: 560 }}>
          <Callout tone="error" title="Payment failed">We couldn’t charge your card. Update your payment method to keep your subscription active.</Callout>
          <Callout tone="warning" title="Storage almost full">You’re using 95% of your plan’s storage. Free up space or upgrade to avoid interruptions.</Callout>
          <Callout tone="success" title="Changes published">Your updates are live and visible to everyone on the team.</Callout>
          <Callout tone="info" title="New version available">Reload to get the latest features and fixes.</Callout>
        </Flex>
      </Section>

      <Rule />

      <Section title="Callout vs Toast vs field validation" lead="Three homes for a message — pick by where it belongs and how long it lives.">
        <Grid columns={{ initial: "1", sm: "3" }} gapX="6" gapY="5">
          <Scenario label="CALLOUT" caption="Contextual, inline with the content it’s about, and it persists until resolved or dismissed. This component.">
            <Callout tone="info">This workspace is read-only while maintenance runs.</Callout>
          </Scenario>
          <Scenario label="TOAST" caption={<>Ambient, system-generated, auto-dismissing confirmation — “Saved”, “Copied”. That job belongs to <Code>System/Toast</Code>; don’t press a Callout into it.</>}>
            <div className="rt-ds-toast" data-tone="success" style={{ maxWidth: 220 }}>
              <span className="rt-ds-toast-icon" aria-hidden><CheckCircle weight="fill" /></span>
              <div className="rt-ds-toast-body">Saved</div>
            </div>
          </Scenario>
          <Scenario label="FIELD VALIDATION" caption="A single field’s error belongs to Field/FieldGroup, attached to the input — never a whole Callout.">
            <Box style={{ fontSize: "var(--font-size-1)", color: "var(--ds-text-error)" }}><Warning weight="fill" aria-hidden /> Enter a valid email address.</Box>
          </Scenario>
        </Grid>
      </Section>

      <Rule />

      <Section title="Announce the right way" lead={<>The live-region role follows <Code>Field</Code>: only <Code>error → role=&quot;alert&quot;</Code> (interrupts a screen reader — a real error earns it). Other tones carry <strong>no</strong> role by default, so a callout that’s already on the page at load doesn’t register a live region that some screen readers re-announce. When you insert a callout <em>dynamically</em> and want it read out politely, opt in with <Code>announce</Code> (<Code>role=&quot;status&quot;</Code> + <Code>aria-live=&quot;polite&quot;</Code>). Override with an explicit <Code>role</Code> only for edge cases.</>}>
        <Flex direction="column" gap="3" style={{ maxWidth: 560 }}>
          <Callout tone="error" title="Upload failed">The file exceeds the 25 MB limit.</Callout>
          <Callout tone="success" announce>Your report is ready to download.</Callout>
        </Flex>
      </Section>

      <Rule />

      <Section title="Where the action sits — inline or below" lead={<>Two placements for the one secondary action. <strong>Inline</strong> (<Code>actionPlacement=&quot;inline&quot;</Code>) end-pins the button on the first line’s row — reach for it <em>only</em> when the message is short (a single line, not much taller than the button). <strong>Below</strong> (the default) drops the action onto its own row under the body — the right choice the moment the message wraps to multiple lines, so the button never crowds the text.</>}>
        <Grid columns={{ initial: "1", sm: "2" }} gapX="6" gapY="5">
          <Scenario label="INLINE — short message" caption="A single-line message where the action fits on the same row: the button end-pins beside the text.">
            <Callout tone="info" actionPlacement="inline" actions={<Button priority="secondary">Extend</Button>}>Your session expires in 10 minutes.</Callout>
          </Scenario>
          <Scenario label="BELOW — the message wraps" caption="Multi-sentence copy the button would crowd if pinned inline — it belongs on its own row underneath.">
            <Callout tone="warning" title="Storage almost full" actions={<Button priority="secondary">Manage storage</Button>}>You’re using 95% of your plan’s storage. Free up space or upgrade to avoid interruptions.</Callout>
          </Scenario>
        </Grid>
        <Caption>Let the message length pick the placement: a single line can carry the action beside it; the moment the copy wraps, the action drops below so it never competes with the text for the same row.</Caption>
      </Section>

      <Rule />

      <Section title="Do / don’t" lead="The failures that make a callout stop working.">
        <Grid columns={{ initial: "1", sm: "2" }} gap="3">
          <DoDont kind="do" bare note="One secondary action inside the callout — it offers a next step without stealing the page’s single solid primary.">
            <Callout tone="warning" title="Storage almost full" actions={<Button priority="secondary">Manage storage</Button>}>You’re using 95% of your storage.</Callout>
          </DoDont>
          <DoDont kind="dont" bare note="A solid primary inside a callout competes with the page’s real primary — a callout is context, not the page’s main action. Keep its action secondary.">
            <Callout tone="warning" title="Storage almost full" actions={<Button priority="primary">Upgrade now</Button>}>You’re using 95% of your storage.</Callout>
          </DoDont>
          <DoDont kind="do" bare note="Passive for ambient context the user can absorb at their own pace.">
            <Callout urgency="passive" icon={<Info weight="fill" aria-hidden />}>Tip: press ⌘K to search from anywhere.</Callout>
          </DoDont>
          <DoDont kind="dont" bare note="Attention (surface) on a low-stakes tip cries wolf — when everything is urgent, nothing is. Save the border for messages the user must act on.">
            <Callout urgency="attention" icon={<Info weight="fill" aria-hidden />}>Tip: press ⌘K to search from anywhere.</Callout>
          </DoDont>
        </Grid>
      </Section>

      <Rule />

      <HexThemeKey.Provider value={`${globals.accent}-${globals.appearance}-${globals.contrast}`}>
        <Section title="Tokens" lead="An untoned callout paints from Radix’s accent-alpha tokens; a toned callout re-points fill/text/border at the accent-aware --ds-* family via [data-tone]. Every colour row is read off a rendered callout and checked against the token it names, so the table can disagree with the component.">
          <Flex direction="column" gap="4">
            <TokenGroup label="PASSIVE (soft)" blurb="Untoned — Radix accent alpha; the consumer owns what the brand accent means." specimen={<Callout urgency="passive">Callout</Callout>}>
              <MeasuredSpec render={() => <Callout urgency="passive">Callout</Callout>}>
                <MeasuredRow part="Container fill" token="--accent-a3" select=".rt-CalloutRoot" prop="background-color" />
                <MeasuredRow part="Text + icon" note="One ink for both — the glyph takes currentColor." token="--accent-a11" select=".rt-CalloutRoot" prop="color" />
              </MeasuredSpec>
            </TokenGroup>
            <TokenGroup label="ATTENTION (surface)" blurb="Adds a hairline border; still Radix accent alpha when untoned." specimen={<Callout urgency="attention">Callout</Callout>}>
              <MeasuredSpec render={() => <Callout urgency="attention">Callout</Callout>}>
                <MeasuredRow part="Container fill" note="One step quieter than passive — the border carries the extra weight." token="--accent-a2" select=".rt-CalloutRoot" prop="background-color" />
                <MeasuredRow part="Text + icon" token="--accent-a11" select=".rt-CalloutRoot" prop="color" />
              </MeasuredSpec>
              {/* The hairline is an inset box-shadow, not a border longhand, so there is no single
                  colour property on the element for a row to read; it is stated rather than measured. */}
              <NoteRow part="Border" value="a 1px inset ring, drawn as a box-shadow rather than a border" radix="--accent-a6" />
            </TokenGroup>
            <TokenGroup label="SEMANTIC TONE (error)" blurb="A toned callout swaps in the accent-aware family tokens — these follow the brand-collision shift." specimen={<Callout tone="error">Callout</Callout>}>
              <MeasuredSpec render={() => <Callout tone="error">Callout</Callout>}>
                <MeasuredRow part="Container fill" token="--ds-fill-error-weak" select='.rt-CalloutRoot[data-tone="error"]' prop="background-color" />
                <MeasuredRow part="Text" token="--ds-text-error" select='.rt-CalloutRoot[data-tone="error"]' prop="color" />
                <MeasuredRow part="Icon" note="The fixed per-tone glyph, so the meaning never rides on colour alone." token="--ds-icon-error" select=".rt-CalloutIcon" prop="color" />
              </MeasuredSpec>
              <NoteRow part="Border (attention)" value="the attention urgency only — a 1px inset ring in the family stroke, drawn as a box-shadow" radix="--ds-stroke-error" />
            </TokenGroup>
            <TokenGroup label="ALL">
              <NoteRow part="Shape (radius)" value="per size (radius-3/4/5)" radix="--radius-*" />
              <NoteRow part="Padding" value="per size (space-3/4/5)" radix="--space-*" />
              <NoteRow part="Body measure" value="65ch" radix="--ds-text-measure" />
              <NoteRow part="Text size" value="text lane (Radix Callout 1–3)" radix="--font-size-*" />
            </TokenGroup>
          </Flex>
        </Section>
      </HexThemeKey.Provider>
    </Page>
  ),
  play: async ({ canvasElement }) => {
    // The do-vs-don't action-budget contract, in a realistic scenario: the DO card's action is a
    // secondary (surface) button; a solid primary in a callout is the documented antipattern.
    const btns = Array.from(canvasElement.querySelectorAll<HTMLElement>("button.rt-Button"));
    const surface = btns.filter((b) => b.classList.contains("rt-variant-surface"));
    if (!surface.length) throw new Error("expected at least one secondary (surface) callout action in Usage");

    // The token table's EVIDENCE, asserted at runtime ([[measured-token-rows]]): every colour row read a rendered callout,
    // resolved its claim on a different node, and the two agree.
    const rows = assertMeasuredRows(canvasElement);
    if (rows.measured !== 7 || rows.unproven !== 0) {
      throw new Error(`expected 7 measured / 0 unproven token rows, got ${rows.measured} / ${rows.unproven}`);
    }
  },
};

/* ---- Properties (Callout-specific) --------------------------------------- */

const CALLOUT_PROPS: PropDef[] = [
  { name: "urgency", type: `"passive" | "attention"`, def: `"passive"`, desc: <>How hard the callout presses for attention → Radix <Code>soft</Code> (passive, an ambient fill) / <Code>surface</Code> (attention, a fill + hairline border). No <Code>solid</Code>, <Code>outline</Code>, or <Code>radius</Code> — none exist for Callout in the system.</>, source: "Callout.tsx:49" },
  { name: "tone", type: `"error" | "warning" | "success" | "info"`, desc: <>Semantic status. Paints fill/text/border from the accent-aware <Code>--ds-*</Code> family tokens via a <Code>[data-tone]</Code> bridge (so status colour follows the brand-collision shift) and selects the tone’s fixed icon.</>, source: "Callout.tsx:51" },
  { name: "size", type: `"1" | "2" | "3" | "inherit"`, desc: <>Radix Callout size. Unset, it resolves from the global <Code>uiSize</Code> (text lane, default <Code>small</Code> → <Code>1</Code>); pass <Code>inherit</Code> to opt out of the global size.</>, source: "Callout.tsx:53 · Radix" },
  { name: "icon", type: "ReactNode", desc: <>Override the default per-tone glyph; <Code>null</Code> suppresses the icon entirely. Every tone otherwise carries a fixed icon so colour is never the only signal (WCAG 1.4.1).</>, source: "Callout.tsx:55" },
  { name: "title", type: "ReactNode", desc: <>An optional bold lead line above the body — a paragraph, not a heading, so a callout can nest at any depth without injecting a jump into the document outline.</>, source: "Callout.tsx:57" },
  { name: "children", type: "ReactNode", desc: <>The message body. Rides the 65-char reading measure (<Code>--ds-text-measure</Code>) so long copy stays legible.</>, source: "Radix" },
  { name: "onDismiss", type: "() => void", desc: <>When set, renders a top-right inset ✕ (a ≥24×24 <Code>IconButton</Code>, WCAG 2.5.8). The consumer owns whether the dismissal persists.</>, source: "Callout.tsx:59" },
  { name: "dismissLabel", type: "string", def: `"Dismiss"`, desc: <>Accessible name for the dismiss ✕ control.</>, source: "Callout.tsx:61" },
  { name: "actions", type: "ReactNode", desc: <>Trailing action slot — a <Code>priority="secondary"</Code> Button, never the page’s single solid primary.</>, source: "Callout.tsx:63" },
  { name: "actionPlacement", type: `"below" | "inline"`, def: `"below"`, desc: <><Code>below</Code> drops the action onto its own row under the body (default); <Code>inline</Code> end-pins it on the first line’s row — reach for it only when the message is short.</>, source: "Callout.tsx:67" },
  { name: "announce", type: "boolean", def: "false", desc: <>Opt a <em>dynamically-inserted</em> callout into a polite live region (<Code>role="status"</Code> + <Code>aria-live="polite"</Code>). Off by default so a callout present at load doesn’t register a live region.</>, source: "Callout.tsx:70" },
  { name: "role", type: `"alert" | "status" | …`, desc: <>Explicit ARIA role — always wins over the tone-derived default (only <Code>error</Code> takes a baked-in <Code>role="alert"</Code>; other tones carry none).</>, source: "Callout.tsx:83 · Radix" },
];

/* ---- Props ---------------------------------------------------------- */
type PropsArgs = {
  urgency: CalloutUrgency;
  tone: "none" | CalloutTone;
  size: "auto" | "1" | "2" | "3" | "inherit";
  iconKey: "default" | "suppressed" | "info" | "warning" | "success" | "error" | "bell";
  title: string;
  body: string;
  dismiss: boolean;
  action: boolean;
  actionPlacement: CalloutActionPlacement;
  announce: boolean;
  role: "" | "alert" | "status";
};

const ICON_NODES: Record<string, ReactNode> = {
  info: <Info weight="fill" aria-hidden />,
  warning: <Warning weight="fill" aria-hidden />,
  success: <CheckCircle weight="fill" aria-hidden />,
  error: <WarningCircle weight="fill" aria-hidden />,
  bell: <Bell weight="fill" aria-hidden />,
};

/** Props — the live, args-driven Callout. Every capability is a control: urgency, tone, size,
 *  icon override (incl. suppress), title, dismiss, action, the announce opt-in, and an explicit role. */
export const Props: StoryObj<PropsArgs> = {
  args: {
    urgency: "passive",
    tone: "none",
    // "auto" (size unset) is the default so the callout tracks the global uiSize toolbar out of the box.
    size: "auto",
    iconKey: "default",
    title: "Scheduled maintenance",
    body: "The dashboard will be read-only on Sunday from 02:00–04:00 UTC while we upgrade the database.",
    dismiss: false,
    action: false,
    actionPlacement: "below",
    announce: false,
    role: "",
  },
  argTypes: {
    urgency: { control: "inline-radio", options: ["passive", "attention"], table: { category: "Variant" } },
    tone: { control: "select", options: ["none", "error", "warning", "success", "info"], table: { category: "Variant" } },
    size: { control: "inline-radio", options: ["auto", "1", "2", "3", "inherit"], description: '"auto" tracks the global uiSize toolbar (unset); a step pins it; "inherit" opts out (Radix default).', table: { category: "Variant" } },
    iconKey: { name: "icon", control: "select", options: ["default", "suppressed", "info", "warning", "success", "error", "bell"], description: "default = the tone’s glyph; suppressed = icon={null}; else an override.", table: { category: "Content" } },
    title: { control: "text", table: { category: "Content" } },
    body: { control: "text", table: { category: "Content" } },
    dismiss: { control: "boolean", description: "Render the top-right inset ✕.", table: { category: "Slots" } },
    action: { control: "boolean", description: "Render a secondary action button.", table: { category: "Slots" } },
    actionPlacement: { control: "inline-radio", options: ["below", "inline"], description: "below = own row (default); inline = end-pinned on the first line (short messages only).", table: { category: "Slots" } },
    announce: { control: "boolean", description: "Opt into a polite live region (role=\"status\" + aria-live=\"polite\") for a dynamically-inserted callout.", table: { category: "A11y" } },
    role: { control: "inline-radio", options: ["", "alert", "status"], description: "Empty = derived from tone.", table: { category: "A11y" } },
  },
  parameters: {
    controls: { disable: false },
    // Toning to warning + soft can dip under axe 4.5 (documented specimen exception); the default
    // (untoned, iris) passes. Scoped off so live-panel toning doesn't flag the known ~4.1:1 case.
    a11y: { context: { exclude: [DODONT_LABEL] } },
  },
  render: ({ urgency, tone, size, iconKey, title, body, dismiss, action, actionPlacement, announce, role }: PropsArgs) => {
    const icon = iconKey === "default" ? undefined : iconKey === "suppressed" ? null : ICON_NODES[iconKey];
    return (
      <Page maxWidth="none">
        <PageHeader title="Callout · Props" standfirst={DEFINITION} />
        <Box p="5" style={{ maxWidth: 600 }}>
          <Callout
            urgency={urgency}
            tone={tone === "none" ? undefined : tone}
            size={size === "auto" ? undefined : size}
            icon={icon}
            title={title || undefined}
            role={role || undefined}
            announce={announce}
            onDismiss={dismiss ? () => {} : undefined}
            actions={action ? <Button priority="secondary">Take action</Button> : undefined}
            actionPlacement={actionPlacement}
          >
            {body}
          </Callout>
        </Box>
        <PropsLead />
        <Rule />
        <Section title="Props reference" lead={<>Every prop <Code>Callout</Code> accepts — <Code>urgency</Code>, <Code>tone</Code>, and the slot props are the system’s own API; the rest pass through to Radix’s <Code>Callout</Code>.</>}>
          <PropTable rows={CALLOUT_PROPS} />
        </Section>
      </Page>
    );
  },
};

/* ---- History ------------------------------------------------------------- */
export const History: Story = {
  render: () => (
    <Page>
      <PageHeader title="Callout · History" standfirst={DEFINITION} />
      <Section title="Decisions" lead="The rulings this component encodes.">
        <Flex direction="column" gap="3">
          <Decision id="[[system-wrapper-layer]] · narrowed wrapper">The wrapper narrows Radix Callout to the system’s options (urgency/tone/size), keeping the raw <Code>Callout.Root</Code>/<Code>.Icon</Code>/<Code>.Text</Code> compound available for advanced layouts.</Decision>
          <Decision id="[[soft-variant-scope]] · two urgencies, no raw variants"><Code>soft</Code> (passive) is the display-only default; <Code>surface</Code> (attention) adds a border. No <Code>solid</Code>, no <Code>outline</Code>, no <Code>radius</Code> — none exist for Callout in the system.</Decision>
          <Decision id="[[field-shell]] / [[brand-collision-shift-table]] / [[oxblood-preset]] · accent-aware tone bridge">Semantic tone paints from the accent-aware <Code>--ds-*</Code> family tokens via a <Code>[data-tone]</Code> bridge, so status colour follows the brand-collision shift instead of a fixed Radix colour.</Decision>
          <Decision id="[[soft-fill-text-exception]] · soft-fill text is a measured exception">Body text on a soft semantic fill measures <strong>4.10–4.43</strong> in light and 7.7–10.4 in dark, so it sits just under the strict 4.5 rather than at any relaxed tier. It is <strong>not</strong> covered by the retired large/bold provision for text on a solid fill: this text is 14px at weight 400, which qualifies as neither. The weak fill costs roughly 0.4 because it tints the background the step-11 floor was measured against. Warning keeps a dark amber-11 foreground. The strict-4.5 axe rule is scoped off on the toned specimens as a documented exception carrying those numbers.</Decision>
          <Decision id="1.4.1">Every tone carries a fixed icon (colour-not-alone). Live-region role follows <Code>Field</Code>: only <Code>error</Code> takes <Code>role=&quot;alert&quot;</Code>; other tones carry no role by default (so an on-load callout doesn’t register a spurious live region). Opt a dynamically-inserted callout into polite announcement with <Code>announce</Code> (<Code>role=&quot;status&quot;</Code> + <Code>aria-live=&quot;polite&quot;</Code>).</Decision>
          <Decision id="[[button-priority]] · secondary action only">The action slot uses <Code>priority=&quot;secondary&quot;</Code> — a callout never spends the page’s single solid primary.</Decision>
          <Decision id="[[type-and-target-density]] (c) · inset dismiss target">The dismiss ✕ is an <Code>IconButton inset</Code> — a ≥24×24 target (WCAG 2.5.8).</Decision>
        </Flex>
      </Section>
      <Rule />
      <Section title="Changelog" lead="Notable changes, newest first — grows as the component evolves.">
        <Flex direction="column" gap="3">
          <Decision id="0.9.0">Initial component — urgency→variant, the accent-aware <Code>[data-tone]</Code> bridge, fixed per-tone icons + roles, title/body structure, dismiss + secondary action slots, size on the global <Code>uiSize</Code> text lane. Stories on the standard spine: Anatomy · Usage · Props · History.</Decision>
        </Flex>
      </Section>
    </Page>
  ),
};
