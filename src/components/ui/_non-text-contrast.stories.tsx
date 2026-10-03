import type { Meta, StoryObj } from "@storybook/react-vite";
import { useEffect, useRef } from "react";
import { Box, Flex } from "@radix-ui/themes";
import { Plus } from "@phosphor-icons/react";
import type { DateRange } from "../../dates/dateTypes";
import { plainDateAddDays, plainDateToday, plainDateToISO } from "../../dates/plainDate";
import {
  themeRoot, assertNoEmpty, resolveColor, parseColor, flatten, contrastRatio, withAccent, ALL_ACCENTS,
  FOCUS_RING, FOCUS_SURFACES, NEUTRALS, CARD_PICKER_CARRIERS, SOLID_TEXT_MIN, checkDrawnRing, readDrawnRing, surfaceColour,
  type RGBA,
} from "../../foundations/_assert";
import { APCA_LC, apcaContrast } from "../../foundations/apca";
import { SizeContext } from "../../theme/SizeContext";
import { Screen as AnalyticsDashboard } from "../../scenarios/AnalyticsDashboard.stories";
import { Avatar } from "./Avatar";
import { Button } from "./Button";
import { Calendar } from "./Calendar";
import { Checkbox } from "./Checkbox";
import { CheckboxCards } from "./CheckboxCards";
import { Code } from "./Code";
import { FileInput } from "./FileInput";
import { IconButton } from "./IconButton";
import { List, ListItem } from "./List";
import { Outline } from "./Outline";
import { Pagination } from "./Pagination";
import { Progress } from "./Progress";
import { RadioCards } from "./RadioCards";
import { RadioGroup } from "./RadioGroup";
import { ScrollArea } from "./ScrollArea";
import { SegmentedControl } from "./SegmentedControl";
import { Slider } from "./Slider";
import { StatusDot } from "./StatusDot";
import { Switch } from "./Switch";
import { Tabs } from "./Tabs";

/* NON-TEXT CONTRAST (WCAG 1.4.11). Seven stories.

   Census MEASURES and gates nothing. The numbers are the deliverable: which token
   pairings are in scope, and at what threshold, is a ruling to be made against
   that table rather than assumed ahead of it. Modelled on the FocusRingContrast
   play: the same detached probe, the same accent sweep, the same flatten()
   compositing, and the same assertNoEmpty guard, so a missing token fails cleanly
   instead of resolving to "" and scoring as a spurious pass.

   PartsWithoutText GATES ([[textless-part-fills]], [[part-fill-edge]], [[radio-cards-band-edge]], [[indicator-mark-edges]], [[neutral-part-stacks]]). It renders the real parts that carry no text,
   clones them into a fresh theme for each of the 27 accents in each appearance,
   and reads every colour off the painted element. See the story for what it
   holds.

   ColourPropAndHighContrast GATES ([[colour-prop-and-high-contrast]], [[part-colour-parity]]). It re-renders those parts, a solid
   Button, IconButton and Code chip with Radix's `color` prop and with `highContrast`,
   and holds the same edges, the switch and Slider thumbs and the card bands at 3:1,
   the text on each solid fill at 4.5:1 and the check and radio dot at 3:1, on 27
   colours, both appearances, six neutrals and the [[dark-override-selectors]] frames. A part given a colour,
   oxblood included, must paint what the same part paints on a theme of that colour:
   its fill, edge, text, check, dot and card tint.

   FocusRingOnParts GATES ([[focus-ring]], [[card-picker-focus-width]]). It focuses the Radix-ringed parts the same way and
   holds each ring as drawn to the system ring, 2px, the stacked accent, at WCAG 3:1
   and APCA Lc 30. A card picker rings 4px, and its focused paint differs from its own
   rest paint and from a selected card at rest by 3:1 over the strip the 4px ring adds.

   MarksAndDashesOnTint GATES ([[mark-on-tint-edge]], [[drop-target-dash]]). It holds the three marks that sit on a tint
   and the two dashed drop edges, each with its stack flattened on it, at WCAG 3:1 and
   APCA Lc 30 against the tint and the surface, on 27 accents, both appearances and
   the six neutrals.

   GreyAndWhiteParts GATES ([[neutral-part-stacks]]). It holds the Pagination dots at three sizes, the
   Slider thumb, the selected SegmentedControl segment and the ScrollArea thumb, each
   with its stack flattened on it, at WCAG 3:1 and APCA Lc 30 against every surface
   and neighbour, on the same sweep, and holds the dots' ring and pill shape.

   DotsEdgesAndSelectedRows GATES ([[status-dot-edges]]). It holds every StatusDot and Avatar status
   dot, every part that stacks --accent-part-edge, and the Progress bar and Slider
   range against their track at WCAG 3:1 and APCA Lc 30, and the description of a
   selected row at 4.5:1 and Lc 60 on its tint, on the same sweep and four surfaces. */

const meta: Meta = { title: "_internal/Non-text contrast" };
export default meta;
type Story = StoryObj;

const FAMILIES = ["error", "warning", "success", "info"] as const;

const CANDIDATES: { group: "STATE" | "BOUNDARY"; name: string; fg: string; bg: string }[] = [
  // The validation ring against the PAGE — the outer side of the boundary.
  ...FAMILIES.map((f) => ({
    group: "STATE" as const, name: `stroke-${f}/bg-base (ring, outer side)`,
    fg: `--ds-stroke-${f}`, bg: "--ds-bg-base",
  })),
  // The ring against the tint it encloses. components.css paints validation as
  // `box-shadow: inset 0 0 0 1px var(--ds-stroke-{fam})` OVER
  // `background-color: var(--ds-fill-{fam}-weak)`, so this same-family adjacency
  // is the one most likely to fall under 3:1 — and the outer row never sees it.
  ...FAMILIES.map((f) => ({
    group: "STATE" as const, name: `stroke-${f}/fill-${f}-weak (ring, INNER side)`,
    fg: `--ds-stroke-${f}`, bg: `--ds-fill-${f}-weak`,
  })),
  // State-vs-state: a tinted field against a resting one. The pairing that
  // actually answers "can you tell the two states apart".
  ...FAMILIES.map((f) => ({
    group: "STATE" as const, name: `fill-${f}-weak/bg-base (tinted field vs resting)`,
    fg: `--ds-fill-${f}-weak`, bg: "--ds-bg-base",
  })),
  { group: "STATE", name: "stroke-selected/bg-base", fg: "--ds-stroke-selected", bg: "--ds-bg-base" },
  { group: "STATE", name: "accent-indicator/bg-base (checked fill, selected outline, status dot)", fg: "--accent-indicator", bg: "--ds-bg-base" },
  { group: "STATE", name: "accent-track/bg-base (switch ON, slider range, progress)", fg: "--accent-track", bg: "--ds-bg-base" },
  { group: "STATE", name: "accent-indicator/bg-raised", fg: "--accent-indicator", bg: "--ds-bg-raised" },
  // NOT --ds-fill-accent: that is the fill that carries TEXT ([[text-on-solid-fill-contrast]]), held to 4.5:1 and APCA Lc 60 by
  // ON_FILL. Parts without text paint --accent-indicator and --accent-track ([[textless-part-fills]]).
  { group: "STATE", name: "fill-selected-subtle/bg-base", fg: "--ds-fill-selected-subtle", bg: "--ds-bg-base" },
  { group: "BOUNDARY", name: "stroke-weak/bg-base", fg: "--ds-stroke-weak", bg: "--ds-bg-base" },
  { group: "BOUNDARY", name: "stroke-weak/bg-subtle", fg: "--ds-stroke-weak", bg: "--ds-bg-subtle" },
  { group: "BOUNDARY", name: "stroke-strong/bg-base", fg: "--ds-stroke-strong", bg: "--ds-bg-base" },
  { group: "BOUNDARY", name: "stroke-weak/bg-overlay", fg: "--ds-stroke-weak", bg: "--ds-bg-overlay" },
  // CONTROLS — not candidates. Two pairings whose answers are already known and
  // gated elsewhere, measured through this same probe so a wrong instrument is
  // visible in the output rather than inferred from plausibility.
  //   text-strong/bg-base is gated >= 4.5 by TEXT_ON_BG
  //   the focus ring base on the page: FocusRingContrast gates the ring, the stack flattened on this
  //   base ([[focus-ring]]), so the base alone may read under 3:1 wherever a colour's stack is not transparent
  { group: "CONTROL" as never, name: "CONTROL text-strong/bg-base (expect >=4.5)", fg: "--ds-text-strong", bg: "--ds-bg-base" },
  { group: "CONTROL" as never, name: "CONTROL focus ring base/bg-base (the stack lifts the rest)", fg: "--ds-stroke-focus", bg: "--ds-bg-base" },
];

export const Census: Story = {
  render: () => <Box data-testid="probe" />,
  play: async ({ canvasElement }) => {
    const root = themeRoot(canvasElement);

    const probe = document.createElement("div");
    for (const a of Array.from(root.attributes)) probe.setAttribute(a.name, a.value);
    probe.style.cssText = "position:fixed;left:-9999px;top:0;width:320px";
    document.body.appendChild(probe);

    // Checked on the probe, not the theme root — the probe is what gets measured.
    assertNoEmpty(probe, [...new Set(CANDIDATES.flatMap((p) => [p.fg, p.bg]))]);

    const rows: string[] = [];
    try {
      for (const appearance of ["light", "dark"] as const) {
        probe.classList.toggle("dark", appearance === "dark");
        for (const accent of ALL_ACCENTS) {
          const restore = withAccent(probe, accent);
          try {
            const page = resolveColor(probe, "--ds-bg-base");
            for (const p of CANDIDATES) {
              const rawFg = resolveColor(probe, p.fg);
              const rawBg = resolveColor(probe, p.bg);
              // The BACKGROUND is composited over the page first: --ds-fill-{fam}-weak
              // is an alpha tint whose raw value overstates its colour. The FOREGROUND
              // is deliberately not pre-flattened — contrastRatio already flattens fg
              // over bg internally, so doing it here would be redundant, not righter.
              const bg = rawBg.a < 1 ? flatten(rawBg, page) : rawBg;
              rows.push(
                `${p.group}\t${appearance}\t${accent}\t${p.name}\t${contrastRatio(rawFg, bg).toFixed(3)}`,
              );
            }
          } finally {
            restore();
          }
        }
      }
    } finally {
      probe.remove();
    }

    const below = rows.filter((r) => Number(r.split("\t")[4]) < 3.0);

    // Worst case per (pairing x mode), which is what a ruling is made against —
    // 46 lines rather than 1242. Browser console is not forwarded to stdout by
    // this runner, so the summary is raised through the assertion channel.
    const worst = new Map<string, { ratio: number; accent: string; group: string }>();
    for (const r of rows) {
      const [group, mode, accent, name, ratio] = r.split("\t");
      const key = `${mode}\t${name}`;
      const n = Number(ratio);
      const cur = worst.get(key);
      if (!cur || n < cur.ratio) worst.set(key, { ratio: n, accent, group });
    }
    const summary = [...worst.entries()]
      .sort((a, b) => a[1].ratio - b[1].ratio)
      .map(([key, v]) => `${v.group}\t${key}\tworst ${v.ratio.toFixed(3)} @ ${v.accent}`)
      .join("\n");

    // REPORTS ONLY — this story gates nothing on purpose (see the header).
    //
    // DELIBERATELY QUIET: it logs the 46-line worst-case summary, not all 1242
    // measurements. Reprinting the full table on every run
    // would be noise in the one place a reader might actually be looking (the
    // Storybook console — this runner does not forward browser output to stdout,
    // so `vitest run | tee` captures none of it either way).
    //
    // To get the full per-accent table again, set VERBOSE to true for one run,
    // or temporarily `throw new Error(summary)` from here.
    const VERBOSE = false;
    console.log(`[non-text census] ${rows.length} measurements, ${below.length} under 3.0:1`);
    console.log(`group\tmode\tpairing\tworst\n${summary}`);
    if (VERBOSE) {
      console.log("group\tmode\taccent\tpairing\tratio");
      for (let i = 0; i < rows.length; i += 50) console.log(rows.slice(i, i + 50).join("\n"));
    }
  },
};

/* =============================================================================
   PARTS WITHOUT TEXT ([[textless-part-fills]], [[part-fill-edge]], [[radio-cards-band-edge]], [[indicator-mark-edges]]). A GATE.
   -----------------------------------------------------------------------------
   Every part below carries no text, so it owes WCAG 3:1 (1.4.11). The play clones
   the rendered specimen into a fresh theme for each of the 27 accents in light and
   in dark, reads each colour off the element that paints it, and holds:

   1. Each part's painted edge against the page at 3:1: the Checkbox and Radio
      checked fills, the Tabs underline, the accent StatusDot, the CheckboxCards
      and RadioCards outlines, the Switch track, the Slider range and the
      Progress bar, and the [[indicator-mark-edges]] marks: the Pagination current dot, the Outline
      bar, the Calendar today bar, the DragHandle drop line and its end dot, and
      the Analytics dashboard chart line, end point and legend swatch. The edge
      is the part's outer pixel as painted: its fill with every 1px inset ring on
      it (Radix's own and the [[part-fill-edge]] edge) laid over it bottom layer first. A card's
      fill is the 2px band its ::after paints, and the edge sits on the band's
      outer 1px. The chart is SVG, so its line's edge is the second path drawn
      over it and its point's edge is the ring drawn over the point. The Outline
      bar and the chart line carry the [[mark-on-tint-edge]] edge in place of the [[part-fill-edge]] one, which
      clears the page too, so they are held here as before.

      The chart lives in the Analytics dashboard showcase, which [[showcases-and-fixture]] bars from
      carrying a play. So the specimen renders that showcase hidden, which keeps
      it out of the axe pass, and each theme clones only the chart's card.
   2. The white thumb against its track at 3:1, or, where the white thumb cannot
      reach it, the stroke around the thumb (its 1px rings composited over the
      track in paint order). The thumb stays white.
   3. The Checkbox check and the Radio dot at 3:1 on the fill under them.
   4. One shade. Every part that paints the indicator paints the colour the
      Checkbox paints, so the CheckboxCards outline matches the box inside it and
      the RadioCards outline matches both. In light, a colour whose text fill is
      deepened (--ds-fill-accent is not step 9) paints every part from that fill.

   No colour is exempt. The six colours whose fills sat under 3:1 before [[part-fill-edge]] (light
   amber, lime, mint, sky and yellow, and dark oxblood) pass on their edge.

   Ratios are sRGB-defined. On a P3 display the parts read Radix's P3 variants,
   which measure slightly lower ([[srgb-contrast-checks]]), so the ratio floors run only in an sRGB
   context (CI and headless). The one-shade and white-thumb checks always run.
   ============================================================================= */

const NON_TEXT_MIN = 3;
/** Parts read against the page in each theme. The count guard below fails if one goes missing. */
const PARTS_PER_THEME = 17;

/** The real parts, all in their checked or active state, each tagged so the play can find it in a clone. */
function PartsSpecimen() {
  return (
    <Flex data-testid="parts" direction="column" gap="3" p="4" style={{ width: 320 }}>
      <Box data-part="checkbox"><Checkbox defaultChecked aria-label="Checked checkbox" /></Box>
      <Box data-part="radio">
        <RadioGroup defaultValue="on" aria-label="Radio group">
          <RadioGroup.Item value="on" aria-label="Selected option" />
        </RadioGroup>
      </Box>
      <Box data-part="switch"><Switch defaultChecked aria-label="Switch, on" /></Box>
      <Box data-part="slider"><Slider defaultValue={[60]} aria-label="Slider" /></Box>
      <Box data-part="progress"><Progress value={60} aria-label="Progress" /></Box>
      <Box data-part="tabs">
        <Tabs.Root defaultValue="a">
          <Tabs.List aria-label="Tabs">
            <Tabs.Trigger value="a">Active</Tabs.Trigger>
            <Tabs.Trigger value="b">Other</Tabs.Trigger>
          </Tabs.List>
          <Tabs.Content value="a" forceMount />
          <Tabs.Content value="b" forceMount />
        </Tabs.Root>
      </Box>
      <Box data-part="dot"><StatusDot variant="accent" label="Accent status" /></Box>
      <Box data-part="card">
        <CheckboxCards.Root defaultValue={["pro"]} columns="1" aria-label="Plan">
          <CheckboxCards.Item value="pro">Pro</CheckboxCards.Item>
        </CheckboxCards.Root>
      </Box>
      <Box data-part="radiocard">
        <RadioCards.Root defaultValue="pro" columns="1" aria-label="Plan">
          <RadioCards.Item value="pro">Pro</RadioCards.Item>
        </RadioCards.Root>
      </Box>
      <Box data-part="pagination"><Pagination page={2} onChange={() => {}} totalPages={4} variant="dots" label="Specimen pages" /></Box>
      <Box data-part="outline">
        <Outline
          items={[{ id: "indicator-mark-edges-first", text: "First", level: 2 }, { id: "indicator-mark-edges-second", text: "Second", level: 2 }]}
          activeId="indicator-mark-edges-second"
          label="Specimen contents"
        />
      </Box>
      {/* Today is never selected here, so its bar paints the accent. */}
      <Box data-part="calendar"><Calendar mode="single" onValueChange={() => {}} /></Box>
      {/* The attribute pair useReorder writes on a group while a lift hovers between two items. */}
      <Box data-part="drop"><div data-ds-reorder-group="indicator-mark-edges" data-ds-reorder-drop="between" /></Box>
    </Flex>
  );
}

/** The Analytics dashboard showcase, rendered hidden so axe skips it. The play clones its chart card. */
function DashboardSpecimen() {
  return <div hidden data-testid="dashboard">{AnalyticsDashboard.render?.({}, {} as never)}</div>;
}

const WHITE: RGBA = { r: 255, g: 255, b: 255, a: 1 };

function opaque(c: RGBA, under: RGBA): RGBA {
  return c.a < 1 ? flatten(c, under) : c;
}

/** One unit per channel absorbs the rounding between two routes to the same colour. */
function same(a: RGBA, b: RGBA): boolean {
  return Math.abs(a.r - b.r) <= 1 && Math.abs(a.g - b.g) <= 1 && Math.abs(a.b - b.b) <= 1;
}

function hex({ r, g, b }: RGBA): string {
  return `#${[r, g, b].map((v) => Math.round(v).toString(16).padStart(2, "0")).join("")}`;
}

/** Split a computed list (a gradient's arguments, a box-shadow's layers) on its top-level commas. */
function topLevel(list: string): string[] {
  const out: string[] = [];
  let depth = 0;
  let cur = "";
  for (const ch of list) {
    if (ch === "(") depth++;
    if (ch === ")") depth--;
    if (ch === "," && depth === 0) {
      out.push(cur.trim());
      cur = "";
    } else cur += ch;
  }
  if (cur.trim()) out.push(cur.trim());
  return out;
}

/** The switch's ON colour. It rides the track's ::before gradient as the first stop, over the base fill. */
function switchTrack(root: HTMLElement, page: RGBA): RGBA {
  const cs = getComputedStyle(root, "::before");
  const gradient = cs.backgroundImage;
  const stop = topLevel(gradient.slice(gradient.indexOf("(") + 1, gradient.lastIndexOf(")")))[1];
  if (!stop) throw new Error(`a checked switch must paint its ON colour as a gradient stop; got "${gradient}"`);
  return opaque(parseColor(stop.replace(/\s+[-\d.]+%$/, "")), opaque(parseColor(cs.backgroundColor), page));
}

/** The colour of the thumb's edge: its box-shadow rings (no offset, no blur) painted over the track,
 *  bottom layer first. The blurred shadows only darken it further, so leaving them out is the safe side. */
function thumbEdge(thumb: HTMLElement, track: RGBA): RGBA {
  let edge = track;
  for (const layer of topLevel(getComputedStyle(thumb).boxShadow).reverse()) {
    if (/inset/.test(layer)) continue;
    const colour = layer.match(/^[a-z-]+\([^)]*\)|^#[0-9a-f]+/i)?.[0];
    if (!colour) continue;
    const [x, y, blur, spread] = layer.slice(colour.length).trim().split(/\s+/).map(parseFloat);
    if (x === 0 && y === 0 && blur === 0 && spread > 0) edge = flatten(parseColor(colour), edge);
  }
  return edge;
}

/** The inset rings of a box-shadow (no offset, no blur, 1px or wider), top layer first. */
function insetRings(el: HTMLElement, pseudo: string | null): { colour: RGBA; spread: number }[] {
  const rings: { colour: RGBA; spread: number }[] = [];
  for (const layer of topLevel(getComputedStyle(el, pseudo).boxShadow)) {
    if (!/\binset\b/.test(layer)) continue;
    const colour = layer.match(/^[a-z-]+\([^)]*\)|^#[0-9a-f]+/i)?.[0];
    if (!colour) continue;
    const [x, y, blur, spread] = layer.slice(colour.length).replace("inset", "").trim().split(/\s+/).map(parseFloat);
    if (x === 0 && y === 0 && blur === 0 && spread >= 1) rings.push({ colour: parseColor(colour), spread });
  }
  return rings;
}

/** The part's outer pixel: its fill with every inset ring laid over it, bottom layer first. That is
 *  Radix's own hairline where it paints one, then the [[part-fill-edge]] edge, which lists first and so paints on top. */
function insetEdge(el: HTMLElement, pseudo: string | null, fill: RGBA): RGBA {
  return insetRings(el, pseudo).reverse().reduce((edge, ring) => flatten(ring.colour, edge), fill);
}

/** The selected card's 2px band. Forced colours paint it as the ::after outline. Everywhere else [[part-fill-edge]]
 *  paints it as the widest inset ring on ::after, so the edge can stack on its outer 1px. */
function cardBand(item: HTMLElement, page: RGBA): RGBA {
  const cs = getComputedStyle(item, "::after");
  if (cs.outlineStyle !== "none") return opaque(parseColor(cs.outlineColor), page);
  const band = insetRings(item, "::after").sort((a, b) => b.spread - a.spread)[0];
  if (!band) throw new Error(`the selected card paints no band: no outline and no inset ring on ::after ("${cs.boxShadow}")`);
  return opaque(band.colour, page);
}

export const PartsWithoutText: Story = {
  render: () => (
    <>
      <PartsSpecimen />
      <DashboardSpecimen />
    </>
  ),
  play: async ({ canvasElement }) => {
    const specimen = canvasElement.querySelector<HTMLElement>('[data-testid="parts"]');
    if (!specimen) throw new Error("the parts specimen did not render");
    const chartCard = canvasElement.querySelector<HTMLElement>('[data-testid="dashboard"] svg[role="img"]')?.closest<HTMLElement>(".rt-BaseCard");
    if (!chartCard) throw new Error("the Analytics dashboard chart card did not render");
    const root = themeRoot(canvasElement);
    const sRGB = !window.matchMedia?.("(color-gamut: p3)")?.matches;
    if (!sRGB) console.info("[Non-text contrast] P3 display: the 3:1 floors run in CI only. The one-shade and white-thumb checks still run here.");

    const host = document.createElement("div");
    host.style.cssText = "position:fixed;left:-9999px;top:0";
    document.body.appendChild(host);
    const fails: string[] = [];
    let read = 0;
    try {
      for (const appearance of ["light", "dark"] as const) {
        for (const accent of ALL_ACCENTS) {
          // A fresh theme for every combination. Re-pointing one theme in place starts the thumb's and
          // the track's transitions, and a computed read mid-transition reports the colour it left.
          host.replaceChildren();
          const theme = document.createElement("div");
          for (const a of Array.from(root.attributes)) {
            if (a.name !== "class" && a.name !== "style") theme.setAttribute(a.name, a.value);
          }
          theme.className = `radix-themes ${appearance}`;
          theme.setAttribute("data-accent-color", accent);
          theme.appendChild(specimen.cloneNode(true));
          const chart = chartCard.cloneNode(true) as HTMLElement;
          chart.setAttribute("data-part", "chart");
          theme.appendChild(chart);
          host.appendChild(theme);

          const at = `[${appearance} ${accent}]`;
          const page = resolveColor(theme, "--ds-bg-base");
          const find = <E extends Element = HTMLElement>(part: string, selector: string): E => {
            const el = theme.querySelector<E>(`[data-part="${part}"] ${selector}`);
            if (!el) throw new Error(`${at} ${part}: nothing matched ${selector}`);
            return el;
          };
          const paint = (el: Element, pseudo: string | null, prop: "backgroundColor" | "outlineColor" | "color" | "fill" | "stroke") =>
            opaque(parseColor(getComputedStyle(el, pseudo)[prop]), page);

          const checkbox = find("checkbox", ".rt-CheckboxRoot");
          const indicator = paint(checkbox, "::before", "backgroundColor");
          const radio = find("radio", ".rt-BaseRadioRoot");
          const radioFill = paint(radio, "::before", "backgroundColor");
          const switchRoot = find("switch", ".rt-SwitchRoot");
          const track = switchTrack(switchRoot, page);
          const cardItem = find("card", ".rt-CheckboxCardsItem");
          const cardFill = cardBand(cardItem, page);
          const radioCard = find("radiocard", ".rt-RadioCardsItem");
          const radioCardFill = cardBand(radioCard, page);
          const tab = find("tabs", '[role="tab"][data-state="active"]');
          const tabFill = paint(tab, "::before", "backgroundColor");
          const dot = find("dot", ".rt-ds-statusdot");
          const dotFill = paint(dot, null, "backgroundColor");
          const range = find("slider", ".rt-SliderRange");
          const rangeFill = paint(range, null, "backgroundColor");
          const bar = find("progress", ".rt-ProgressIndicator");
          const barFill = paint(bar, null, "backgroundColor");
          // [[indicator-mark-edges]]. Seven marks outside the [[part-fill-edge]] set that paint the same indicator. The current Pagination
          // dot stacks --accent-mark-edge since [[neutral-part-stacks]], and the reading below takes whatever ring it paints.
          const pageDot = find("pagination", '.rt-ds-pagination__dot[aria-current="page"]');
          const pageDotFill = paint(pageDot, null, "backgroundColor");
          const outlineBar = find("outline", ".rt-ds-outline-indicator");
          const outlineBarFill = paint(outlineBar, null, "backgroundColor");
          const todayBar = find("calendar", ".rt-ds-calendar-today-bar");
          const todayBarFill = paint(todayBar, null, "backgroundColor");
          const drop = find("drop", "[data-ds-reorder-group]");
          const dropLine = paint(drop, "::before", "backgroundColor");
          const dropEnd = paint(drop, "::after", "backgroundColor");
          const chartPath = find<SVGPathElement>("chart", 'path[stroke="var(--accent-indicator)"]');
          const chartEdgePath = find<SVGPathElement>("chart", 'path[stroke="var(--accent-mark-edge)"]');
          const chartLine = paint(chartPath, null, "stroke");
          const chartLineEdge = flatten(parseColor(getComputedStyle(chartEdgePath).stroke), chartLine);
          // The line reads wholly in the stacked shade only where the edge path retraces it at its width.
          if (chartEdgePath.getAttribute("d") !== chartPath.getAttribute("d") || getComputedStyle(chartEdgePath).strokeWidth !== getComputedStyle(chartPath).strokeWidth) {
            fails.push(`${at} the Analytics chart line's edge path does not retrace the line at its width, so part of the line keeps the fill under 3:1 ([[indicator-mark-edges]], [[mark-on-tint-edge]])`);
          }
          const chartPoint = paint(find<SVGCircleElement>("chart", 'circle[fill="var(--accent-indicator)"]'), null, "fill");
          const chartPointEdge = flatten(parseColor(getComputedStyle(find<SVGCircleElement>("chart", 'circle[stroke="var(--accent-part-edge)"]')).stroke), chartPoint);
          const swatch = find("chart", 'span[aria-hidden][style*="--accent-indicator"]');
          const swatchFill = paint(swatch, null, "backgroundColor");
          const parts: { part: string; colour: RGBA; edge: RGBA; paints: "indicator" | "track"; ruling?: "[[indicator-mark-edges]]" | "[[neutral-part-stacks]]" }[] = [
            { part: "Checkbox checked fill", colour: indicator, edge: insetEdge(checkbox, "::before", indicator), paints: "indicator" },
            { part: "Radio checked fill", colour: radioFill, edge: insetEdge(radio, "::before", radioFill), paints: "indicator" },
            { part: "Tabs underline", colour: tabFill, edge: insetEdge(tab, "::before", tabFill), paints: "indicator" },
            { part: "StatusDot accent", colour: dotFill, edge: insetEdge(dot, null, dotFill), paints: "indicator" },
            { part: "CheckboxCards outline", colour: cardFill, edge: insetEdge(cardItem, "::after", cardFill), paints: "indicator" },
            { part: "RadioCards outline", colour: radioCardFill, edge: insetEdge(radioCard, "::after", radioCardFill), paints: "indicator" },
            { part: "Switch track", colour: track, edge: insetEdge(switchRoot, "::before", track), paints: "track" },
            { part: "Slider range", colour: rangeFill, edge: insetEdge(range, null, rangeFill), paints: "track" },
            { part: "Progress bar", colour: barFill, edge: insetEdge(bar, null, barFill), paints: "track" },
            { part: "Pagination current dot", colour: pageDotFill, edge: insetEdge(pageDot, null, pageDotFill), paints: "indicator", ruling: "[[neutral-part-stacks]]" },
            { part: "Outline bar", colour: outlineBarFill, edge: insetEdge(outlineBar, null, outlineBarFill), paints: "indicator", ruling: "[[indicator-mark-edges]]" },
            { part: "Calendar today bar", colour: todayBarFill, edge: insetEdge(todayBar, null, todayBarFill), paints: "indicator", ruling: "[[indicator-mark-edges]]" },
            { part: "DragHandle drop line", colour: dropLine, edge: insetEdge(drop, "::before", dropLine), paints: "indicator", ruling: "[[indicator-mark-edges]]" },
            { part: "DragHandle drop end dot", colour: dropEnd, edge: insetEdge(drop, "::after", dropEnd), paints: "indicator", ruling: "[[indicator-mark-edges]]" },
            { part: "Analytics chart line", colour: chartLine, edge: chartLineEdge, paints: "indicator", ruling: "[[indicator-mark-edges]]" },
            { part: "Analytics chart end point", colour: chartPoint, edge: chartPointEdge, paints: "indicator", ruling: "[[indicator-mark-edges]]" },
            { part: "Analytics legend swatch", colour: swatchFill, edge: insetEdge(swatch, null, swatchFill), paints: "indicator", ruling: "[[indicator-mark-edges]]" },
          ];
          read += parts.length;

          // 1. Each part's painted edge against the page.
          for (const p of parts) {
            const ratio = contrastRatio(p.edge, page);
            if (sRGB && ratio < NON_TEXT_MIN) fails.push(`${at} ${p.part} edge ${hex(p.edge)} on fill ${hex(p.colour)} reads ${ratio.toFixed(2)}:1 on the page, under 3:1 (WCAG 1.4.11, ${p.ruling ?? "[[part-fill-edge]]"})`);
          }

          // 2. The white thumb against its track, or the stroke around it.
          const thumb = find("switch", ".rt-SwitchThumb");
          const thumbFill = opaque(parseColor(getComputedStyle(thumb).backgroundColor), track);
          if (!same(thumbFill, WHITE)) fails.push(`${at} the switch thumb paints ${hex(thumbFill)}. The thumb stays white on every colour ([[textless-part-fills]])`);
          const thumbRatio = contrastRatio(thumbFill, track);
          const edgeRatio = contrastRatio(thumbEdge(thumb, track), track);
          if (sRGB && Math.max(thumbRatio, edgeRatio) < NON_TEXT_MIN) {
            fails.push(`${at} the switch thumb reads ${thumbRatio.toFixed(2)}:1 on its track ${hex(track)} and its stroke ${edgeRatio.toFixed(2)}:1, under 3:1 ([[textless-part-fills]])`);
          }

          // 3. The glyphs on the indicator.
          const check = contrastRatio(parseColor(getComputedStyle(find("checkbox", ".rt-BaseCheckboxIndicator")).color), indicator);
          const radioDot = contrastRatio(paint(radio, "::after", "backgroundColor"), radioFill);
          if (sRGB && check < NON_TEXT_MIN) fails.push(`${at} the Checkbox check reads ${check.toFixed(2)}:1 on its fill, under 3:1 ([[textless-part-fills]])`);
          if (sRGB && radioDot < NON_TEXT_MIN) fails.push(`${at} the Radio dot reads ${radioDot.toFixed(2)}:1 on its fill, under 3:1 ([[textless-part-fills]])`);

          // 4. One shade.
          const cardBox = paint(find("card", ".rt-CheckboxCardCheckbox"), "::before", "backgroundColor");
          for (const p of [...parts.filter((q) => q.paints === "indicator"), { part: "CheckboxCards box", colour: cardBox }]) {
            if (!same(p.colour, indicator)) fails.push(`${at} ${p.part} paints ${hex(p.colour)} and the Checkbox paints ${hex(indicator)}: two shades of one colour ([[textless-part-fills]])`);
          }
          if (appearance === "light") {
            const textFill = resolveColor(theme, "--ds-fill-accent");
            if (!same(textFill, resolveColor(theme, "--accent-9"))) {
              for (const p of parts) {
                if (!same(p.colour, textFill)) fails.push(`${at} ${p.part} paints ${hex(p.colour)} and the text fill is ${hex(textFill)}. A deepened colour paints its parts from its text fill in light ([[textless-part-fills]])`);
              }
            }
          }
        }
      }
    } finally {
      host.remove();
    }
    const want = 2 * ALL_ACCENTS.length * PARTS_PER_THEME;
    if (read !== want) throw new Error(`expected ${want} part readings, read ${read}`);
    if (fails.length) throw new Error(`Parts without text, ${fails.length} failures:\n  ${fails.join("\n  ")}`);
  },
};

/* =============================================================================
   PARTS GIVEN A COLOUR OR HIGH CONTRAST ([[colour-prop-and-high-contrast]], [[part-colour-parity]]). A GATE.
   -----------------------------------------------------------------------------
   The fixes PartsWithoutText holds ([[textless-part-fills]], [[part-fill-edge]], [[radio-cards-band-edge]], [[neutral-part-stacks]]) and the fill that carries
   text ([[text-on-solid-fill-contrast]]) also reach a part given Radix's `color` prop or `highContrast`. The
   play renders the parts twice, once with `color` and once with `highContrast`,
   and clones them into fresh themes. The parts are the Checkbox, Radio, Switch,
   Slider, Progress, Tabs, Tabs.Nav, CheckboxCards and RadioCards, and the solid
   Button, IconButton and Code chip, the three system fills that carry text.

   THE COLOUR SWEEP. Radix writes the `color` prop as `data-accent-color` on the
   part, and the system writes oxblood on the same element ([[part-colour-parity]]), so the play
   re-points that attribute in each clone to each of the 27 colours a part takes,
   under a yellow theme, on each of the six neutrals. Yellow is the theme because
   its values differ from the base value in most of the tables, so a part that read
   the theme's value in place of its own would show. Six frames place that theme:
   light, dark, dark from the document class, light inside dark, light inside a dark
   document, and dark inside light ([[dark-override-selectors]]). In every frame each part paints what the
   same part paints on a plain theme of its own colour in the frame's appearance:
   the fill, the edge, the switch thumb's ring, the Slider thumb's ring, the text
   and its fill on each solid part, the check and the radio dot, and the tint of
   each card picker ([[part-colour-parity]]).

   THE HIGH CONTRAST SWEEP. Each part carries `highContrast`, under a theme of each
   of the 27 colours, in light and in dark, on each of the six neutrals.

   In both sweeps the play holds:
   1. Each part's painted edge against the page at 3:1: the Checkbox and Radio
      fills, the Switch track, the Slider range, the Progress bar, the Tabs and
      Tabs.Nav underlines, and the CheckboxCards and RadioCards bands.
   2. The white switch thumb against its track at 3:1, or its stroke where the white
      thumb cannot reach it. The thumb stays white.
   3. The Slider thumb against its range and its track at 3:1, by its ring or its
      face.
   4. One shade. Each card band paints the fill of its own card's checkbox, and the
      RadioCards band matches the CheckboxCards band.
   5. The text on the solid Button, IconButton and Code chip at 4.5:1 against its
      fill, and the check and the radio dot at 3:1 against theirs ([[part-colour-parity]]).

   The ratios and the frame match run only in an sRGB context ([[srgb-contrast-checks]]). The white
   thumb and the one-shade checks always run.
   ============================================================================= */

/** The colour the specimen renders its parts in. The play re-points it in each clone. */
const COLOUR_PROP_PLACEHOLDER = "lime";
/** The 27 colours a part takes ([[part-colour-parity]]): Radix's 26 and the oxblood preset. */
const COLOUR_PROP_COLOURS = ALL_ACCENTS;
/** The theme the coloured parts sit under. */
const COLOUR_PROP_THEME = "yellow";
/** Readings per theme: nine edges, the switch thumb, the Slider thumb, three texts, the check, the
 *  radio dot and two card tints. */
const COLOUR_PROP_PARTS = 18;

type ColourPropFrame = { name: string; appearance: "light" | "dark"; layers: string[] };
/** Where a theme sits. Each layer is a class list, outermost first. A layer without `radix-themes`
 *  stands for the document element, which carries the appearance under `appearance="inherit"` ([[dark-override-selectors]]). */
const COLOUR_PROP_FRAMES: ColourPropFrame[] = [
  { name: "light", appearance: "light", layers: ["radix-themes light"] },
  { name: "dark", appearance: "dark", layers: ["radix-themes dark"] },
  { name: "dark from the document", appearance: "dark", layers: ["dark", "radix-themes"] },
  { name: "light inside dark", appearance: "light", layers: ["radix-themes dark", "radix-themes light"] },
  { name: "light inside a dark document", appearance: "light", layers: ["dark", "radix-themes", "radix-themes light"] },
  { name: "dark inside light", appearance: "dark", layers: ["radix-themes light", "radix-themes dark"] },
];

/** The parts that take `color` and `highContrast`, each checked or active and tagged for the play. */
function OwnColourSpecimen({ testId, name, own }: { testId: string; name: string; own: { color?: typeof COLOUR_PROP_PLACEHOLDER; highContrast?: boolean } }) {
  return (
    <Flex data-testid={testId} direction="column" gap="3" p="4" style={{ width: 320 }}>
      <Box data-part="button"><Button priority="primary" {...own}>Save changes</Button></Box>
      <Box data-part="iconbutton"><IconButton priority="primary" aria-label={`Add, ${name}`} {...own}><Plus /></IconButton></Box>
      <Box data-part="code"><Code variant="solid" {...own}>npm run build</Code></Box>
      <Box data-part="checkbox"><Checkbox defaultChecked aria-label={`Checked checkbox, ${name}`} {...own} /></Box>
      <Box data-part="radio">
        <RadioGroup defaultValue="on" aria-label={`Radio group, ${name}`} {...own}>
          <RadioGroup.Item value="on" aria-label="Selected option" />
        </RadioGroup>
      </Box>
      <Box data-part="switch"><Switch defaultChecked aria-label={`Switch, on, ${name}`} {...own} /></Box>
      <Box data-part="slider"><Slider defaultValue={[60]} aria-label={`Slider, ${name}`} {...own} /></Box>
      <Box data-part="progress"><Progress value={60} aria-label={`Progress, ${name}`} {...own} /></Box>
      <Box data-part="tabs">
        <Tabs.Root defaultValue="a">
          <Tabs.List aria-label={`Tabs, ${name}`} {...own}>
            <Tabs.Trigger value="a">Active</Tabs.Trigger>
            <Tabs.Trigger value="b">Other</Tabs.Trigger>
          </Tabs.List>
          <Tabs.Content value="a" forceMount />
          <Tabs.Content value="b" forceMount />
        </Tabs.Root>
      </Box>
      <Box data-part="tabnav">
        <Tabs.Nav aria-label={`Sections, ${name}`} {...own}>
          <Tabs.Nav.Link href="#colour-prop-and-high-contrast-active" active>Active</Tabs.Nav.Link>
          <Tabs.Nav.Link href="#colour-prop-and-high-contrast-other">Other</Tabs.Nav.Link>
        </Tabs.Nav>
      </Box>
      <Box data-part="card">
        <CheckboxCards.Root defaultValue={["pro"]} columns="1" aria-label={`Plan, ${name}`} {...own}>
          <CheckboxCards.Item value="pro">Pro</CheckboxCards.Item>
        </CheckboxCards.Root>
      </Box>
      <Box data-part="radiocard">
        <RadioCards.Root defaultValue="pro" columns="1" aria-label={`Tier, ${name}`} {...own}>
          <RadioCards.Item value="pro">Pro</RadioCards.Item>
        </RadioCards.Root>
      </Box>
    </Flex>
  );
}

/** The first stop of each gradient layer, bottom layer first, past a leading direction. */
function layerStops(image: string): RGBA[] {
  return topLevel(image)
    .filter((layer) => layer !== "none")
    .map((layer) => {
      const args = topLevel(layer.slice(layer.indexOf("(") + 1, layer.lastIndexOf(")")));
      const stop = /^(to\s|[-\d.]+(deg|turn|rad|grad)\b)/.test(args[0] ?? "") ? args[1] : args[0];
      if (!stop) throw new Error(`a gradient layer carries no colour stop: "${layer}"`);
      return parseColor(stop.replace(/\s+[-\d.]+%$/, ""));
    })
    .reverse();
}

/** A fill as painted: its background colour over what sits under it, then each gradient layer. Radix
 *  draws the switch track's ON colour and the high contrast overlay on the track and the range as
 *  gradient layers. */
function paintedFill(el: Element, pseudo: string | null, under: RGBA): RGBA {
  const cs = getComputedStyle(el, pseudo);
  return layerStops(cs.backgroundImage).reduce((below, stop) => flatten(stop, below), opaque(parseColor(cs.backgroundColor), under));
}

type ColourPropReading = {
  page: RGBA;
  parts: { part: string; fill: RGBA; edge: RGBA }[];
  track: RGBA;
  thumbFill: RGBA;
  thumbEdge: RGBA;
  range: RGBA;
  sliderTrack: RGBA;
  sliderRings: RGBA[];
  sliderFace: RGBA;
  cardBox: RGBA;
  /** The text on each solid part, and the fill under it ([[part-colour-parity]]). */
  texts: { part: string; ink: RGBA; fill: RGBA }[];
  /** The check and the radio dot, each with the part fill it sits on ([[part-colour-parity]]). */
  marks: { part: string; ink: RGBA; fill: RGBA }[];
  /** The selected tint of each card picker, flattened on the page ([[part-colour-parity]]). */
  tints: { part: string; tint: RGBA }[];
};

/** A card picker's selected tint: the first stop of its ::before layer over the page, or the page. */
function cardTint(item: HTMLElement, page: RGBA): RGBA {
  return layerStops(getComputedStyle(item, "::before").backgroundImage).reduce((below, stop) => flatten(stop, below), page);
}

/** Every colour the play holds, read off the parts inside one theme. */
function readOwnColourParts(theme: HTMLElement, at: string): ColourPropReading {
  const page = resolveColor(theme, "--ds-bg-base");
  const find = (part: string, selector: string): HTMLElement => {
    const el = theme.querySelector<HTMLElement>(`[data-part="${part}"] ${selector}`);
    if (!el) throw new Error(`${at} ${part}: nothing matched ${selector}`);
    return el;
  };
  const part = (name: string, el: HTMLElement, pseudo: string | null, fill: RGBA) => ({ part: name, fill, edge: insetEdge(el, pseudo, fill) });
  const checkbox = find("checkbox", ".rt-CheckboxRoot");
  const radio = find("radio", ".rt-BaseRadioRoot");
  const switchRoot = find("switch", ".rt-SwitchRoot");
  const track = paintedFill(switchRoot, "::before", page);
  const range = find("slider", ".rt-SliderRange");
  const rangeFill = paintedFill(range, null, page);
  const bar = find("progress", ".rt-ProgressIndicator");
  const tab = find("tabs", '[role="tab"][data-state="active"]');
  const navTab = find("tabnav", ".rt-BaseTabListTrigger[data-active]");
  const card = find("card", ".rt-CheckboxCardsItem");
  const radioCard = find("radiocard", ".rt-RadioCardsItem");
  const thumb = find("switch", ".rt-SwitchThumb");
  const sliderThumb = find("slider", ".rt-SliderThumb");
  const solid = (part: string, box: string, selector: string) => {
    const el = find(box, selector);
    const fill = paintedFill(el, null, page);
    return { part, ink: opaque(parseColor(getComputedStyle(el).color), fill), fill };
  };
  const checkboxFill = paintedFill(checkbox, "::before", page);
  const radioFill = paintedFill(radio, "::before", page);
  return {
    page,
    parts: [
      part("Checkbox checked fill", checkbox, "::before", checkboxFill),
      part("Radio checked fill", radio, "::before", radioFill),
      part("Switch track", switchRoot, "::before", track),
      part("Slider range", range, null, rangeFill),
      part("Progress bar", bar, null, paintedFill(bar, null, page)),
      part("Tabs underline", tab, "::before", paintedFill(tab, "::before", page)),
      part("Tabs.Nav underline", navTab, "::before", paintedFill(navTab, "::before", page)),
      part("CheckboxCards band", card, "::after", cardBand(card, page)),
      part("RadioCards band", radioCard, "::after", cardBand(radioCard, page)),
    ],
    track,
    thumbFill: opaque(parseColor(getComputedStyle(thumb).backgroundColor), track),
    thumbEdge: thumbEdge(thumb, track),
    range: rangeFill,
    sliderTrack: paintedFill(find("slider", ".rt-SliderTrack"), null, page),
    sliderRings: outerRings(sliderThumb, "::after"),
    sliderFace: parseColor(getComputedStyle(sliderThumb, "::after").backgroundColor),
    cardBox: paintedFill(find("card", ".rt-CheckboxCardCheckbox"), "::before", page),
    texts: [
      solid("Button label", "button", ".rt-BaseButton"),
      solid("IconButton glyph", "iconbutton", ".rt-BaseButton"),
      solid("Code chip text", "code", ".rt-Code"),
    ],
    marks: [
      { part: "Checkbox check", ink: opaque(parseColor(getComputedStyle(find("checkbox", ".rt-CheckboxIndicator")).color), checkboxFill), fill: checkboxFill },
      { part: "Radio dot", ink: opaque(parseColor(getComputedStyle(radio, "::after").backgroundColor), radioFill), fill: radioFill },
    ],
    tints: [
      { part: "CheckboxCards tint", tint: cardTint(card, page) },
      { part: "RadioCards tint", tint: cardTint(radioCard, page) },
    ],
  };
}

/** Checks 1 to 5, on one theme's readings. */
function holdOwnColourParts(r: ColourPropReading, at: string, sRGB: boolean, fails: string[]) {
  for (const p of r.parts) {
    const ratio = contrastRatio(p.edge, r.page);
    if (sRGB && ratio < NON_TEXT_MIN) fails.push(`${at} ${p.part} edge ${hex(p.edge)} on fill ${hex(p.fill)} reads ${ratio.toFixed(2)}:1 on the page, under 3:1 (WCAG 1.4.11, [[colour-prop-and-high-contrast]])`);
  }
  if (!same(r.thumbFill, WHITE)) fails.push(`${at} the switch thumb paints ${hex(r.thumbFill)}. The thumb stays white on every colour ([[textless-part-fills]])`);
  const thumbRatio = contrastRatio(r.thumbFill, r.track);
  const strokeRatio = contrastRatio(r.thumbEdge, r.track);
  if (sRGB && Math.max(thumbRatio, strokeRatio) < NON_TEXT_MIN) {
    fails.push(`${at} the switch thumb reads ${thumbRatio.toFixed(2)}:1 on its track ${hex(r.track)} and its stroke ${strokeRatio.toFixed(2)}:1, under 3:1 ([[textless-part-fills]], [[colour-prop-and-high-contrast]])`);
  }
  for (const [against, beside] of [["range", r.range], ["track", r.sliderTrack]] as const) {
    const ring = contrastRatio(r.sliderRings.reduce((edge, layer) => flatten(layer, edge), beside), beside);
    const face = contrastRatio(flatten(r.sliderFace, beside), beside);
    if (sRGB && Math.max(ring, face) < NON_TEXT_MIN) fails.push(`${at} the Slider thumb reads ${face.toFixed(2)}:1 by its face and ${ring.toFixed(2)}:1 by its ring against its ${against} ${hex(beside)}, under 3:1 ([[neutral-part-stacks]], [[colour-prop-and-high-contrast]])`);
  }
  const band = r.parts[7].fill;
  if (!same(band, r.cardBox)) fails.push(`${at} the CheckboxCards band paints ${hex(band)} and its own checkbox ${hex(r.cardBox)}: two shades in one card ([[colour-prop-and-high-contrast]])`);
  if (!same(r.parts[8].fill, band)) fails.push(`${at} the RadioCards band paints ${hex(r.parts[8].fill)} and the CheckboxCards band ${hex(band)}: the two card pickers differ ([[radio-cards-band-edge]], [[colour-prop-and-high-contrast]])`);
  for (const t of r.texts) {
    const ratio = contrastRatio(t.ink, t.fill);
    if (sRGB && ratio < SOLID_TEXT_MIN) fails.push(`${at} the ${t.part} ${hex(t.ink)} reads ${ratio.toFixed(2)}:1 on its fill ${hex(t.fill)}, under 4.5:1 (WCAG 1.4.3, [[text-on-solid-fill-contrast]], [[part-colour-parity]])`);
  }
  for (const m of r.marks) {
    const ratio = contrastRatio(m.ink, m.fill);
    if (sRGB && ratio < NON_TEXT_MIN) fails.push(`${at} the ${m.part} ${hex(m.ink)} reads ${ratio.toFixed(2)}:1 on its fill ${hex(m.fill)}, under 3:1 (WCAG 1.4.11, [[textless-part-fills]], [[part-colour-parity]])`);
  }
}

/** A clone of the specimen with every part's colour re-pointed, or removed when `colour` is null. */
function recolour(specimen: HTMLElement, colour: string | null): HTMLElement {
  const clone = specimen.cloneNode(true) as HTMLElement;
  for (const el of Array.from(clone.querySelectorAll(`[data-accent-color="${COLOUR_PROP_PLACEHOLDER}"]`))) {
    if (colour) el.setAttribute("data-accent-color", colour);
    else el.removeAttribute("data-accent-color");
  }
  return clone;
}

/** Builds the frame's layers inside `host`, puts `content` in the innermost, and returns that theme. */
function placeInFrame(host: HTMLElement, root: HTMLElement, frame: ColourPropFrame, accent: string, neutral: string, content: HTMLElement): HTMLElement {
  host.replaceChildren();
  let parent = host;
  let theme: HTMLElement | null = null;
  for (const layer of frame.layers) {
    const el = document.createElement("div");
    if (layer.includes("radix-themes")) {
      for (const a of Array.from(root.attributes)) {
        if (a.name !== "class" && a.name !== "style") el.setAttribute(a.name, a.value);
      }
      el.setAttribute("data-accent-color", accent);
      el.setAttribute("data-gray-color", neutral);
      theme = el;
    }
    el.className = layer;
    parent.appendChild(el);
    parent = el;
  }
  if (!theme) throw new Error(`the frame "${frame.name}" holds no theme`);
  parent.appendChild(content);
  return theme;
}

export const ColourPropAndHighContrast: Story = {
  render: () => (
    <>
      <OwnColourSpecimen testId="own-colour" name="own colour" own={{ color: COLOUR_PROP_PLACEHOLDER }} />
      <OwnColourSpecimen testId="high-contrast" name="high contrast" own={{ highContrast: true }} />
    </>
  ),
  play: async ({ canvasElement }) => {
    const coloured = canvasElement.querySelector<HTMLElement>('[data-testid="own-colour"]');
    const contrasted = canvasElement.querySelector<HTMLElement>('[data-testid="high-contrast"]');
    if (!coloured || !contrasted) throw new Error("the [[colour-prop-and-high-contrast]] specimens did not render");
    // Each part must carry its prop, or the sweep would read the theme's paint and pass for the wrong reason.
    for (const box of Array.from(coloured.querySelectorAll<HTMLElement>("[data-part]"))) {
      if (!box.querySelector(`[data-accent-color="${COLOUR_PROP_PLACEHOLDER}"]`)) throw new Error(`the ${box.dataset.part} part carries no data-accent-color, so its color prop never reached the DOM`);
    }
    for (const box of Array.from(contrasted.querySelectorAll<HTMLElement>("[data-part]"))) {
      if (!box.querySelector(".rt-high-contrast")) throw new Error(`the ${box.dataset.part} part carries no rt-high-contrast class, so its highContrast prop never reached the DOM`);
    }
    const root = themeRoot(canvasElement);
    const sRGB = !window.matchMedia?.("(color-gamut: p3)")?.matches;
    if (!sRGB) console.info("[Non-text contrast] P3 display: the [[colour-prop-and-high-contrast]] and [[part-colour-parity]] floors and the frame match run in CI only. The white-thumb and one-shade checks still run here.");

    const host = document.createElement("div");
    host.style.cssText = "position:fixed;left:-9999px;top:0";
    document.body.appendChild(host);
    const fails: string[] = [];
    let read = 0;
    try {
      for (const neutral of NEUTRALS) {
        // Each colour as its theme's own colour, in each appearance: what a part given that colour must match.
        const twin = new Map<string, ColourPropReading>();
        for (const frame of COLOUR_PROP_FRAMES.slice(0, 2)) {
          for (const colour of COLOUR_PROP_COLOURS) {
            const at = `[${frame.appearance} ${colour} ${neutral}, theme colour]`;
            twin.set(`${frame.appearance} ${colour}`, readOwnColourParts(placeInFrame(host, root, frame, colour, neutral, recolour(coloured, null)), at));
          }
        }
        // The colour sweep.
        for (const frame of COLOUR_PROP_FRAMES) {
          for (const colour of COLOUR_PROP_COLOURS) {
            const at = `[${frame.name}, ${COLOUR_PROP_THEME} theme, color="${colour}", ${neutral}]`;
            const r = readOwnColourParts(placeInFrame(host, root, frame, COLOUR_PROP_THEME, neutral, recolour(coloured, colour)), at);
            holdOwnColourParts(r, at, sRGB, fails);
            const t = twin.get(`${frame.appearance} ${colour}`);
            if (!t) throw new Error(`${at} no theme reading to match`);
            if (sRGB) {
              r.parts.forEach((p, i) => {
                const q = t.parts[i];
                if (!same(p.fill, q.fill) || !same(p.edge, q.edge)) fails.push(`${at} ${p.part} paints ${hex(p.fill)} with edge ${hex(p.edge)}, and on a ${colour} theme ${hex(q.fill)} with edge ${hex(q.edge)} ([[colour-prop-and-high-contrast]])`);
              });
              if (!same(r.thumbEdge, t.thumbEdge)) fails.push(`${at} the switch thumb's ring reads ${hex(r.thumbEdge)}, and on a ${colour} theme ${hex(t.thumbEdge)} ([[textless-part-fills]], [[colour-prop-and-high-contrast]])`);
              const ring = (x: ColourPropReading) => x.sliderRings.reduce((edge, layer) => flatten(layer, edge), x.range);
              if (!same(ring(r), ring(t))) fails.push(`${at} the Slider thumb's ring reads ${hex(ring(r))}, and on a ${colour} theme ${hex(ring(t))} ([[neutral-part-stacks]], [[colour-prop-and-high-contrast]])`);
              r.texts.forEach((x, i) => {
                const y = t.texts[i];
                if (!same(x.ink, y.ink) || !same(x.fill, y.fill)) fails.push(`${at} the ${x.part} paints ${hex(x.ink)} on ${hex(x.fill)}, and on a ${colour} theme ${hex(y.ink)} on ${hex(y.fill)} ([[part-colour-parity]])`);
              });
              r.marks.forEach((x, i) => {
                const y = t.marks[i];
                if (!same(x.ink, y.ink)) fails.push(`${at} the ${x.part} paints ${hex(x.ink)}, and on a ${colour} theme ${hex(y.ink)} ([[part-colour-parity]])`);
              });
              r.tints.forEach((x, i) => {
                const y = t.tints[i];
                if (!same(x.tint, y.tint)) fails.push(`${at} the ${x.part} paints ${hex(x.tint)}, and on a ${colour} theme ${hex(y.tint)} ([[part-colour-parity]])`);
              });
            }
            read += COLOUR_PROP_PARTS;
          }
        }
        // The high contrast sweep.
        for (const frame of COLOUR_PROP_FRAMES.slice(0, 2)) {
          for (const accent of ALL_ACCENTS) {
            const at = `[${frame.appearance} ${accent} ${neutral}, highContrast]`;
            holdOwnColourParts(readOwnColourParts(placeInFrame(host, root, frame, accent, neutral, contrasted.cloneNode(true) as HTMLElement), at), at, sRGB, fails);
            read += COLOUR_PROP_PARTS;
          }
        }
      }
    } finally {
      host.remove();
    }
    const want = NEUTRALS.length * (COLOUR_PROP_FRAMES.length * COLOUR_PROP_COLOURS.length + 2 * ALL_ACCENTS.length) * COLOUR_PROP_PARTS;
    if (fails.length) throw new Error(`Parts given a colour or high contrast, ${fails.length} failures:\n  ${fails.slice(0, 80).join("\n  ")}`);
    if (read !== want) throw new Error(`expected ${want} readings, read ${read}`);
  },
};

/* =============================================================================
   THE FOCUS RING ON THE PARTS ([[focus-ring]], [[card-picker-focus-width]]). A GATE.
   -----------------------------------------------------------------------------
   Nine Radix controls drew Radix's own accent-8 ring, as low as 1.47:1 against a
   tint. [[focus-ring]] gives them the system ring: the accent fill with a Radix black or white
   alpha stacked on it, 2px wide. Each of these parts spends a pseudo-element on its
   own paint, so the ring's two layers sit where each part has room for them, and
   this play reads every one of them off the rendered part:
   · Checkbox and Switch: Radix's box or track on ::before, and a ::after laid over it.
   · Radio, checked and unchecked: ::before, and the dot's ::after scaled 0.4, whose
     outline the scale brings to the ring's width and place. An unchecked radio's
     dot must stay hidden while it rings.
   · Slider thumb: the hit extender on ::before takes the visible thumb's box.
   · Tabs trigger, SegmentedControl item: two outlines over the box Radix rings.
   · CheckboxCards, RadioCards, selected and not: inset box-shadows on the card's
     ::after, 4px wide ([[card-picker-focus-width]]).
   · Pagination dot: the hit extender on ::after takes the dot's box.
   The play clones the specimen into a fresh theme for each of the 27 accents in
   each appearance, focuses each part with keyboard modality, and holds every layer
   at its width on one outer box, 2px, or 4px on a card ([[card-picker-focus-width]]), the bottom layer at
   the button's fill, the layers at the stack flattened on it, and that ring at WCAG
   3:1 and APCA Lc 30 against every surface a ring sits on. The floors run only in
   an sRGB context.

   [[card-picker-focus-width]] holds three more things on each card, selected and not. A selected card rests
   on most colours with a 2px band in the ring's own colour, so a 2px ring changed no
   pixel on it, and a focused card that was not selected looked selected. The play
   reads each card's paint in 1px bands from its edge inward, from the card's own box
   and its two pseudos, first at rest and then focused, and holds:
   · the focused paint at 3:1 or more against the rest paint over at least the 2px
     strip the 4px ring adds, 2px to 4px in from the edge.
   · every ring layer 4px wide, on the card itself.
   · the focused paint at 3:1 or more against a selected card at rest over the same
     area, so a focused card never reads as a selected one.
   The area of that strip on a w x h card is 4 x (w + h) - 48 CSS px. The model
   counts whole bands and does not model the rounded corners, so it demands the
   whole strip, where the pixel census of [[card-picker-focus-width]] counted at least 99% of the strip on
   every colour, the corners lost to antialiasing.
   ============================================================================= */

const FOCUS_PARTS: readonly { part: string; focus: string }[] = [
  { part: "checkbox", focus: ".rt-CheckboxRoot" },
  { part: "radio", focus: '.rt-BaseRadioRoot[data-state="checked"]' },
  { part: "radio-off", focus: '.rt-BaseRadioRoot[data-state="unchecked"]' },
  { part: "switch", focus: ".rt-SwitchRoot" },
  { part: "slider", focus: ".rt-SliderThumb" },
  { part: "tabs", focus: '[role="tab"][data-state="active"]' },
  { part: "segmented", focus: '.rt-SegmentedControlItem[data-state="on"]' },
  { part: "card", focus: ".rt-CheckboxCardCheckbox" },
  { part: "card-off", focus: ".rt-CheckboxCardCheckbox" },
  { part: "radiocard", focus: '.rt-RadioCardsItem[data-state="checked"]' },
  { part: "radiocard-off", focus: ".rt-RadioCardsItem" },
  { part: "pagination", focus: ".rt-ds-pagination__dot" },
];

/** [[card-picker-focus-width]]. Each card part, the card that carries its ring, and the selected card it must not match. */
const CARD_PICKER_CARDS: Readonly<Record<string, { item: string; selected: string }>> = {
  card: { item: ".rt-CheckboxCardsItem", selected: "card" },
  "card-off": { item: ".rt-CheckboxCardsItem", selected: "card" },
  radiocard: { item: ".rt-RadioCardsItem", selected: "radiocard" },
  "radiocard-off": { item: ".rt-RadioCardsItem", selected: "radiocard" },
};
/** The bands read in from a card's edge: the 4px ring and 2px of the fill inside it. */
const CARD_PICKER_BANDS = 6;

/** A card's paint in 1px bands from its edge inward, each read at the middle of the band: the card's
 *  own background over the page, the fill of ::before from its inset inward, then each ring ::after
 *  paints, bottom layer first. A shadow ring lies outside the box of ::after and an inset one inside
 *  it, and an outline lies outside its offset. The rounded corners are not modelled. */
function cardBands(item: HTMLElement, page: RGBA): RGBA[] {
  const after = getComputedStyle(item, "::after");
  const afterIn = parseFloat(after.top);
  const beforeIn = parseFloat(getComputedStyle(item, "::before").top);
  const rings: { colour: RGBA; from: number; to: number }[] = [];
  for (const layer of topLevel(after.boxShadow).reverse()) {
    const colour = layer.match(/^[a-z-]+\([^)]*\)|^#[0-9a-f]+/i)?.[0];
    if (!colour) continue;
    const [x, y, blur, spread] = layer.slice(colour.length).replace("inset", "").trim().split(/\s+/).map(parseFloat);
    if (x !== 0 || y !== 0 || blur !== 0 || !(spread > 0)) continue;
    const inset = /\binset\b/.test(layer);
    rings.push({ colour: parseColor(colour), from: inset ? afterIn : afterIn - spread, to: inset ? afterIn + spread : afterIn });
  }
  const outline = parseFloat(after.outlineWidth);
  if (after.outlineStyle !== "none" && outline > 0) {
    const offset = parseFloat(after.outlineOffset);
    rings.push({ colour: parseColor(after.outlineColor), from: afterIn - offset - outline, to: afterIn - offset });
  }
  const bands: RGBA[] = [];
  for (let band = 0; band < CARD_PICKER_BANDS; band += 1) {
    const depth = band + 0.5;
    let paint = opaque(parseColor(getComputedStyle(item).backgroundColor), page);
    if (depth >= beforeIn) paint = paintedFill(item, "::before", paint);
    for (const ring of rings) if (depth >= ring.from && depth < ring.to) paint = flatten(ring.colour, paint);
    bands.push(paint);
  }
  return bands;
}

/** The CSS px of a w x h card whose paint differs by 3:1 between two readings, band by band. Band k
 *  covers 2 x (w + h) - 8k - 4 px of the card. */
function cardPixelsApart(a: RGBA[], b: RGBA[], w: number, h: number): number {
  let px = 0;
  for (let band = 0; band < CARD_PICKER_BANDS; band += 1) {
    if (contrastRatio(a[band], b[band]) >= NON_TEXT_MIN) px += 2 * (w + h) - 8 * band - 4;
  }
  return px;
}

function FocusPartsSpecimen() {
  return (
    <Flex data-testid="focus-parts" direction="column" gap="3" p="4" style={{ width: 320 }}>
      <Box data-part="checkbox"><Checkbox defaultChecked aria-label="Checked checkbox" /></Box>
      <Box data-part="radio">
        <RadioGroup defaultValue="on" aria-label="Radio group">
          <RadioGroup.Item value="on" aria-label="Selected option" />
        </RadioGroup>
      </Box>
      <Box data-part="radio-off">
        <RadioGroup aria-label="Radio group, nothing selected">
          <RadioGroup.Item value="off" aria-label="Unselected option" />
        </RadioGroup>
      </Box>
      <Box data-part="switch"><Switch defaultChecked aria-label="Switch, on" /></Box>
      <Box data-part="slider"><Slider defaultValue={[60]} aria-label="Slider" /></Box>
      <Box data-part="tabs">
        <Tabs.Root defaultValue="a">
          <Tabs.List aria-label="Tabs">
            <Tabs.Trigger value="a">Active</Tabs.Trigger>
            <Tabs.Trigger value="b">Other</Tabs.Trigger>
          </Tabs.List>
          <Tabs.Content value="a" forceMount />
          <Tabs.Content value="b" forceMount />
        </Tabs.Root>
      </Box>
      <Box data-part="segmented">
        <SegmentedControl.Root defaultValue="day" aria-label="Range">
          <SegmentedControl.Item value="day">Day</SegmentedControl.Item>
          <SegmentedControl.Item value="week">Week</SegmentedControl.Item>
        </SegmentedControl.Root>
      </Box>
      <Box data-part="card">
        <CheckboxCards.Root defaultValue={["pro"]} columns="1" aria-label="Add-ons">
          <CheckboxCards.Item value="pro">Pro</CheckboxCards.Item>
        </CheckboxCards.Root>
      </Box>
      <Box data-part="card-off">
        <CheckboxCards.Root defaultValue={[]} columns="1" aria-label="Add-ons, nothing selected">
          <CheckboxCards.Item value="team">Team</CheckboxCards.Item>
        </CheckboxCards.Root>
      </Box>
      <Box data-part="radiocard">
        <RadioCards.Root defaultValue="pro" columns="1" aria-label="Plan">
          <RadioCards.Item value="pro">Pro</RadioCards.Item>
        </RadioCards.Root>
      </Box>
      <Box data-part="radiocard-off">
        <RadioCards.Root columns="1" aria-label="Plan, nothing selected">
          <RadioCards.Item value="team">Team</RadioCards.Item>
        </RadioCards.Root>
      </Box>
      <Box data-part="pagination"><Pagination page={2} onChange={() => {}} totalPages={4} variant="dots" label="Ring pages" /></Box>
    </Flex>
  );
}

export const FocusRingOnParts: Story = {
  render: () => <FocusPartsSpecimen />,
  play: async ({ canvasElement }) => {
    const specimen = canvasElement.querySelector<HTMLElement>('[data-testid="focus-parts"]');
    if (!specimen) throw new Error("the focus parts specimen did not render");
    const root = themeRoot(canvasElement);
    const sRGB = !window.matchMedia?.("(color-gamut: p3)")?.matches;
    const host = document.createElement("div");
    host.style.cssText = "position:fixed;left:-9999px;top:0";
    document.body.appendChild(host);
    const fails: string[] = [];
    let read = 0;
    let cardsRead = 0;
    try {
      for (const appearance of ["light", "dark"] as const) {
        for (const accent of ALL_ACCENTS) {
          // A fresh theme for every combination, for PartsWithoutText's reason: a theme re-pointed in
          // place starts transitions, and a read mid-transition reports the colour it left.
          host.replaceChildren();
          const theme = document.createElement("div");
          for (const a of Array.from(root.attributes)) {
            if (a.name !== "class" && a.name !== "style") theme.setAttribute(a.name, a.value);
          }
          theme.className = `radix-themes ${appearance}`;
          theme.setAttribute("data-accent-color", accent);
          theme.appendChild(specimen.cloneNode(true));
          host.appendChild(theme);
          // [[card-picker-focus-width]] reads every card at rest before any part takes focus.
          const page = resolveColor(theme, "--ds-bg-base");
          const rest = new Map<string, RGBA[]>();
          for (const [part, { item }] of Object.entries(CARD_PICKER_CARDS)) {
            const card = theme.querySelector<HTMLElement>(`[data-part="${part}"] ${item}`);
            if (card) rest.set(part, cardBands(card, page));
          }
          for (const { part, focus } of FOCUS_PARTS) {
            const at = `[${appearance} ${accent}] ${part}`;
            const cell = theme.querySelector<HTMLElement>(`[data-part="${part}"]`);
            const target = cell?.querySelector<HTMLElement>(focus);
            if (!cell || !target) {
              fails.push(`${at}: nothing matched ${focus}`);
              continue;
            }
            target.focus({ focusVisible: true, preventScroll: true } as FocusOptions);
            try {
              if (!target.matches(":focus-visible")) {
                fails.push(`${at}: keyboard focus did not reach :focus-visible, so no ring was measured`);
                continue;
              }
              for (const animation of document.getAnimations()) animation.finish();
              const drawn = readDrawnRing(target, cell);
              if (!drawn) {
                fails.push(`${at}: no box between the part and its cell draws a ring`);
                continue;
              }
              read += 1;
              const { problems, colour } = checkDrawnRing(drawn);
              for (const p of problems) fails.push(`${at}: ${p}`);
              if (part === "radio-off" && parseColor(getComputedStyle(target, "::after").backgroundColor).a > 0) {
                fails.push(`${at}: the unchecked radio shows its dot while it rings`);
              }
              const cardPicker = CARD_PICKER_CARDS[part];
              const card = cardPicker ? cell.querySelector<HTMLElement>(cardPicker.item) : null;
              if (cardPicker && !(card && drawn.carrier === card && card.matches(CARD_PICKER_CARRIERS))) {
                fails.push(`${at}: the ring draws on ${drawn.carrier.className}, not on the card, so its 4px width is not held ([[card-picker-focus-width]])`);
              }
              if (!sRGB) continue;
              if (cardPicker && card) {
                const ownRest = rest.get(part);
                const selectedRest = rest.get(cardPicker.selected);
                if (!ownRest || !selectedRest) {
                  fails.push(`${at}: no card was read at rest, so the focused card has nothing to differ from ([[card-picker-focus-width]])`);
                } else {
                  cardsRead += 1;
                  const focused = cardBands(card, page);
                  const w = card.offsetWidth;
                  const h = card.offsetHeight;
                  const strip = 4 * (w + h) - 48;
                  const fromRest = cardPixelsApart(focused, ownRest, w, h);
                  if (fromRest < strip) {
                    fails.push(`${at}: focused, the card differs from itself at rest by 3:1 over ${fromRest} px, under the ${strip} px of the 2px strip the 4px ring adds ([[card-picker-focus-width]])`);
                  }
                  const fromSelected = cardPixelsApart(focused, selectedRest, w, h);
                  if (fromSelected < strip) {
                    fails.push(`${at}: focused, the card differs from a selected card at rest by 3:1 over ${fromSelected} px, under ${strip} px, so it reads as selected ([[card-picker-focus-width]])`);
                  }
                }
              }
              for (const surface of FOCUS_SURFACES) {
                const under = surfaceColour(drawn.carrier, surface);
                const ratio = contrastRatio(colour, under);
                const lc = apcaContrast(colour, under);
                if (ratio < FOCUS_RING.min || lc < FOCUS_RING.minLc) {
                  fails.push(`${at} on the ${surface.name}: ${ratio.toFixed(2)}:1, Lc ${lc.toFixed(1)}, under WCAG ${FOCUS_RING.min}:1 or APCA Lc ${FOCUS_RING.minLc} ([[focus-ring]])`);
                }
              }
            } finally {
              target.blur();
            }
          }
        }
      }
    } finally {
      host.remove();
    }
    const want = 2 * ALL_ACCENTS.length * FOCUS_PARTS.length;
    const wantCards = sRGB ? 2 * ALL_ACCENTS.length * Object.keys(CARD_PICKER_CARDS).length : 0;
    if (fails.length) throw new Error(`The focus ring on the parts, ${fails.length} failures:\n  ${fails.join("\n  ")}`);
    if (read !== want) throw new Error(`expected ${want} ring readings, read ${read}`);
    if (cardsRead !== wantCards) throw new Error(`expected ${wantCards} card readings ([[card-picker-focus-width]]), read ${cardsRead}`);
  },
};

/* =============================================================================
   MARKS AND DASHED EDGES ON A TINT ([[mark-on-tint-edge]], [[drop-target-dash]]). A GATE.
   -----------------------------------------------------------------------------
   Three marks sit on a tint: the Calendar today bar inside a range on the range
   band, the Outline bar on its rail, and the Analytics dashboard chart line on its
   area fill. Each stacks --accent-mark-edge on its own fill ([[mark-on-tint-edge]]). Two dashed
   edges show during a drag: the DragHandle empty slot and the FileInput drop
   target. Each lays a second dash in --accent-dash-stack on its step 7 dash ([[drop-target-dash]]).

   The play clones the specimen into a fresh theme for each of the 27 accents, in
   light and in dark, on each of the six neutrals. It reads each colour off the
   element that paints it, flattens the stack on the mark or the dash, and holds
   that at WCAG 3:1 and APCA Lc 30 against the tint under it and the surface around
   it:
   · the today bar: its band on the page and on the popover panel a range is picked
     on (DateInput and DateRangeInput), and each of the two surfaces
   · the Outline bar: its rail on the page, and the page
   · the chart line: its area on the card, and the card
   · each dash: its tint on the page, the subtle recess, a card and a panel, and
     each of the four surfaces
   It also holds each stack where it is drawn: the slot's dash as a 1px dashed
   outline on the slot's own 1px border band, the zone's dash as a 1px dashed
   border on a box the size of the zone, and the chart's edge path on the line at
   its width. The floors run only in an sRGB context ([[srgb-contrast-checks]]), and the placement
   checks always run.
   ============================================================================= */

/** Readings per theme: the three marks and the two dashes. */
const TINT_PARTS = 5;
const TINT_FLOOR = { min: 3, minLc: APCA_LC.minAnyText } as const;
const TINT_TODAY = plainDateToday();
const TINT_RANGE: DateRange = {
  start: plainDateToISO(plainDateAddDays(TINT_TODAY, -2)),
  end: plainDateToISO(plainDateAddDays(TINT_TODAY, 2)),
};
/** The surfaces a dash is held on, as the layers that paint each, bottom first. */
const DASH_SURFACES = {
  page: ["--ds-bg-base"],
  subtle: ["--ds-bg-base", "--ds-bg-subtle"],
  card: ["--ds-bg-base", "--ds-bg-raised"],
  panel: ["--ds-bg-base", "--ds-bg-overlay"],
} as const;

/** A FileInput held in its drag-over state. One dragenter on the zone runs the component's own
 *  handler, which sets `data-drop-target`. Outside a real drag no dragleave follows. */
function DraggedOverFileInput() {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    ref.current
      ?.querySelector(".rt-ds-fileinput-dropzone")
      ?.dispatchEvent(new DragEvent("dragenter", { bubbles: true, cancelable: true, dataTransfer: new DataTransfer() }));
  }, []);
  return (
    <div ref={ref}>
      <FileInput label="Attachments" accept=".png,.jpg" isMultiple onValueChange={() => {}} />
    </div>
  );
}

function TintSpecimen() {
  return (
    <Flex data-testid="tint-parts" direction="column" gap="3" p="4" style={{ width: 320 }}>
      {/* Today in the middle of a committed range, on the month that holds today. */}
      <Box data-part="calendar">
        <Calendar mode="range" value={TINT_RANGE} focusDate={plainDateToISO(TINT_TODAY)} onValueChange={() => {}} />
      </Box>
      <Box data-part="outline">
        <Outline
          items={[{ id: "mark-on-tint-edge-first", text: "First", level: 2 }, { id: "mark-on-tint-edge-second", text: "Second", level: 2 }]}
          activeId="mark-on-tint-edge-first"
          label="Tint contents"
        />
      </Box>
      {/* The attribute pair useReorder writes on an empty group while a lift hovers over it, in a column. */}
      <Box data-part="slot" style={{ background: "var(--ds-bg-subtle)" }}>
        <ul data-ds-reorder-group="drop-target-dash" data-ds-reorder-drop="empty" aria-label="Empty column" style={{ listStyle: "none", margin: 0, padding: 12 }} />
      </Box>
      <Box data-part="zone"><DraggedOverFileInput /></Box>
    </Flex>
  );
}

export const MarksAndDashesOnTint: Story = {
  render: () => (
    <>
      <TintSpecimen />
      <DashboardSpecimen />
    </>
  ),
  play: async ({ canvasElement }) => {
    const specimen = canvasElement.querySelector<HTMLElement>('[data-testid="tint-parts"]');
    if (!specimen) throw new Error("the tint specimen did not render");
    // The FileInput reaches its drag state one render after mount.
    for (let i = 0; i < 50 && !specimen.querySelector(".rt-ds-fileinput-dropzone[data-drop-target]"); i++) {
      await new Promise((r) => setTimeout(r, 20));
    }
    if (!specimen.querySelector(".rt-ds-fileinput-dropzone[data-drop-target]")) throw new Error("the FileInput never reached its drag state");
    const chartCard = canvasElement.querySelector<HTMLElement>('[data-testid="dashboard"] svg[role="img"]')?.closest<HTMLElement>(".rt-BaseCard");
    if (!chartCard) throw new Error("the Analytics dashboard chart card did not render");
    const root = themeRoot(canvasElement);
    const sRGB = !window.matchMedia?.("(color-gamut: p3)")?.matches;
    if (!sRGB) console.info("[Non-text contrast] P3 display: the tint floors run in CI only. The placement checks still run here.");

    const host = document.createElement("div");
    host.style.cssText = "position:fixed;left:-9999px;top:0";
    document.body.appendChild(host);
    const fails: string[] = [];
    let read = 0;
    try {
      for (const appearance of ["light", "dark"] as const) {
        for (const accent of ALL_ACCENTS) {
          for (const neutral of NEUTRALS) {
            // A fresh theme for every combination, for PartsWithoutText's reason.
            host.replaceChildren();
            const theme = document.createElement("div");
            for (const a of Array.from(root.attributes)) {
              if (a.name !== "class" && a.name !== "style") theme.setAttribute(a.name, a.value);
            }
            theme.className = `radix-themes ${appearance}`;
            theme.setAttribute("data-accent-color", accent);
            theme.setAttribute("data-gray-color", neutral);
            theme.style.background = "var(--ds-bg-base)";
            theme.appendChild(specimen.cloneNode(true));
            const chart = chartCard.cloneNode(true) as HTMLElement;
            chart.setAttribute("data-part", "chart");
            theme.appendChild(chart);
            host.appendChild(theme);

            const at = `[${appearance} ${accent} ${neutral}]`;
            const find = <E extends Element = HTMLElement>(part: string, selector: string): E => {
              const el = theme.querySelector<E>(`[data-part="${part}"] ${selector}`);
              if (!el) throw new Error(`${at} ${part}: nothing matched ${selector}`);
              return el;
            };
            const paint = (el: Element, pseudo: string | null, prop: "backgroundColor" | "borderTopColor" | "outlineColor" | "fill" | "stroke") =>
              parseColor(getComputedStyle(el, pseudo)[prop]);
            const surface = (name: keyof typeof DASH_SURFACES) => surfaceColour(theme, { name, layers: DASH_SURFACES[name] });
            const readings: { part: string; ruling: "[[mark-on-tint-edge]]" | "[[drop-target-dash]]"; mark: RGBA; tint: RGBA; surface: string; under: RGBA }[] = [];

            // [[mark-on-tint-edge]]. The today bar in the middle of the range, on its band, on the page and on the popover panel.
            const bar = find("calendar", ".rt-ds-calendar-day[data-today] .rt-ds-calendar-today-bar");
            const day = bar.closest<HTMLElement>(".rt-ds-calendar-day");
            if (!day?.hasAttribute("data-range") || day.hasAttribute("data-endpoint")) throw new Error(`${at} today is not in the middle of the range`);
            const band = paint(day, "::before", "backgroundColor");
            const barMark = insetEdge(bar, null, paint(bar, null, "backgroundColor"));
            for (const s of ["page", "panel"] as const) {
              readings.push({ part: "Calendar today bar", ruling: "[[mark-on-tint-edge]]", mark: barMark, tint: flatten(band, surface(s)), surface: s, under: surface(s) });
            }

            // [[mark-on-tint-edge]]. The Outline bar on its rail, on the page.
            const outlineBar = find("outline", ".rt-ds-outline-indicator");
            const rail = paint(outlineBar.closest(".rt-ds-outline-track") ?? outlineBar, "::before", "backgroundColor");
            const page = surface("page");
            readings.push({ part: "Outline bar", ruling: "[[mark-on-tint-edge]]", mark: insetEdge(outlineBar, null, paint(outlineBar, null, "backgroundColor")), tint: flatten(rail, page), surface: "page", under: page });

            // [[mark-on-tint-edge]]. The chart line on its area, on its card. The card paints its fill on its pseudos too.
            const line = find<SVGPathElement>("chart", 'path[stroke="var(--accent-indicator)"]');
            const edgePath = find<SVGPathElement>("chart", 'path[stroke="var(--accent-mark-edge)"]');
            if (edgePath.getAttribute("d") !== line.getAttribute("d") || getComputedStyle(edgePath).strokeWidth !== getComputedStyle(line).strokeWidth) {
              fails.push(`${at} the chart's edge path does not retrace the line at its width, so part of the line paints no step ([[mark-on-tint-edge]])`);
            }
            let card = page;
            for (const pseudo of [null, "::before", "::after"]) {
              if (pseudo && getComputedStyle(chart, pseudo).content === "none") continue;
              card = flatten(paint(chart, pseudo, "backgroundColor"), card);
            }
            const area = paint(find<SVGPathElement>("chart", 'path[fill="var(--ds-fill-accent-weak)"]'), null, "fill");
            readings.push({ part: "Analytics chart line", ruling: "[[mark-on-tint-edge]]", mark: flatten(paint(edgePath, null, "stroke"), paint(line, null, "stroke")), tint: flatten(area, card), surface: "card", under: card });

            // [[drop-target-dash]]. The slot: step 7 on its border, and the stack as a dashed outline drawn 1px inward onto that band.
            const slot = find("slot", '[data-ds-reorder-drop="empty"]');
            const slotAfter = getComputedStyle(slot, "::after");
            if (slotAfter.borderTopStyle !== "dashed" || slotAfter.borderTopWidth !== "1px" || slotAfter.outlineStyle !== "dashed" || slotAfter.outlineWidth !== "1px" || slotAfter.outlineOffset !== "-1px") {
              fails.push(`${at} the empty slot's stack is not a 1px dashed outline on its 1px dashed border: border ${slotAfter.borderTopStyle} ${slotAfter.borderTopWidth}, outline ${slotAfter.outlineStyle} ${slotAfter.outlineWidth} at ${slotAfter.outlineOffset} ([[drop-target-dash]])`);
            }
            // An outline that is not drawn still computes a colour, so the stack counts only where it paints.
            const slotDash = paint(slot, "::after", "borderTopColor");
            const slotMark = slotAfter.outlineStyle === "none" ? slotDash : flatten(paint(slot, "::after", "outlineColor"), slotDash);
            const slotTint = paint(slot, "::after", "backgroundColor");

            // [[drop-target-dash]]. The zone: step 7 on its border, and the stack as a dashed border on its shell's ::after, the zone's size.
            const zone = find("zone", ".rt-ds-fileinput-dropzone[data-drop-target]");
            const shell = zone.closest<HTMLElement>(".rt-ds-fileinput-shell");
            if (!shell) throw new Error(`${at} the drop zone has no shell`);
            const shellAfter = getComputedStyle(shell, "::after");
            const zr = zone.getBoundingClientRect();
            const sr = shell.getBoundingClientRect();
            const offBox = [zr.left - sr.left, zr.top - sr.top, zr.width - sr.width, zr.height - sr.height].some((d) => Math.abs(d) > 0.01);
            if (shellAfter.content === "none" || shellAfter.position !== "absolute" || shellAfter.top !== "0px" || shellAfter.borderTopStyle !== "dashed" || shellAfter.borderTopWidth !== "1px" || shellAfter.borderTopLeftRadius !== getComputedStyle(zone).borderTopLeftRadius || offBox) {
              fails.push(`${at} the drop zone's stack is not a 1px dashed border on a box the size and radius of the zone ([[drop-target-dash]])`);
            }
            const zoneDash = paint(zone, null, "borderTopColor");
            const zoneMark = shellAfter.content === "none" || shellAfter.borderTopStyle === "none" ? zoneDash : flatten(paint(shell, "::after", "borderTopColor"), zoneDash);
            const zoneTint = paint(zone, null, "backgroundColor");
            for (const [part, mark, tint] of [["DragHandle empty slot dash", slotMark, slotTint], ["FileInput drop target dash", zoneMark, zoneTint]] as const) {
              for (const s of Object.keys(DASH_SURFACES) as (keyof typeof DASH_SURFACES)[]) {
                readings.push({ part, ruling: "[[drop-target-dash]]", mark, tint: flatten(tint, surface(s)), surface: s, under: surface(s) });
              }
            }
            read += TINT_PARTS;

            if (!sRGB) continue;
            for (const r of readings) {
              for (const [against, colour] of [[`tint on the ${r.surface}`, r.tint], [r.surface, r.under]] as const) {
                const ratio = contrastRatio(r.mark, colour);
                const lc = apcaContrast(r.mark, colour);
                if (ratio < TINT_FLOOR.min || lc < TINT_FLOOR.minLc) {
                  fails.push(`${at} ${r.part} ${hex(r.mark)} reads ${ratio.toFixed(2)}:1 and Lc ${lc.toFixed(1)} against the ${against}, under WCAG 3:1 or APCA Lc 30 (${r.ruling})`);
                }
              }
            }
          }
        }
      }
    } finally {
      host.remove();
    }
    const want = 2 * ALL_ACCENTS.length * NEUTRALS.length * TINT_PARTS;
    if (fails.length) throw new Error(`Marks and dashes on a tint, ${fails.length} failures:\n  ${fails.slice(0, 80).join("\n  ")}`);
    if (read !== want) throw new Error(`expected ${want} readings, read ${read}`);
  },
};

/* =============================================================================
   THE GREY AND WHITE PARTS ([[neutral-part-stacks]]). A GATE.
   -----------------------------------------------------------------------------
   Four parts paint a grey or a white that read under WCAG 3:1 against what sits
   beside them. Each stacks one Radix alpha from theme.css ([[neutral-part-stacks]]):
   · the inactive Pagination dot: a 1px ring with a clear centre, --ds-fill-press
     with --neutral-ring-stack on it. The current dot is a --ds-space-20 pill at the
     dot's own height, with --accent-mark-edge on its fill.
   · the Slider thumb: --accent-slider-thumb-stack on Radix's --black-a4 ring.
   · the selected SegmentedControl segment: --neutral-ring-stack on Radix's
     --gray-a4 ring.
   · the ScrollArea thumb: --neutral-thumb-stack as a gradient layer on its fill.

   The play renders the real parts, the dots at sizes 1, 2 and 3, and clones them
   into a fresh theme for each of the 27 accents, in light and in dark, on each of
   the six neutrals. It reads each colour off the element that paints it, flattens
   the stack on the part, and holds the part at WCAG 3:1 and APCA Lc 30 on the page,
   the subtle recess, a card and a panel:
   · a dot ring and the pill's edge against the surface
   · the Slider thumb against its range, its track and the surface, where the ring
     or the white face clears
   · the segment against the control's track, where the ring or the tile clears
   · the ScrollArea thumb against its lane and the surface
   It also holds the shape: every inactive dot keeps a clear centre, and the pill is
   --ds-space-20 long at the dot's height. The floors run only in an sRGB context
   ([[srgb-contrast-checks]]), and the shape checks always run.
   ============================================================================= */

/** Readings per theme: a ring and a pill at each of the three sizes, the two thumbs and the segment. */
const GREY_PARTS = 9;
const GREY_FLOOR = { min: 3, minLc: APCA_LC.minAnyText } as const;
const GREY_LINES = ["0.9.0 Initial release", "0.8.4 Rings outside", "0.8.3 Forced colours", "0.8.2 Select numbers", "0.8.1 Toast under a modal", "0.8.0 Dialog description"];

function GreyPartsSpecimen() {
  return (
    <Flex data-testid="grey-parts" direction="column" gap="3" p="4" style={{ width: 320 }}>
      <Box data-part="dots-1"><Pagination size="sm" page={2} onChange={() => {}} totalPages={5} variant="dots" label="Dots, size 1" /></Box>
      <Box data-part="dots-2"><Pagination size="md" page={2} onChange={() => {}} totalPages={5} variant="dots" label="Dots, size 2" /></Box>
      {/* Size 3 is the control lane at the large tier. */}
      <SizeContext.Provider value="large">
        <Box data-part="dots-3"><Pagination page={2} onChange={() => {}} totalPages={5} variant="dots" label="Dots, size 3" /></Box>
      </SizeContext.Provider>
      <Box data-part="slider"><Slider defaultValue={[60]} aria-label="Grey part slider" /></Box>
      <Box data-part="segment">
        <SegmentedControl.Root defaultValue="eur" aria-label="Currency">
          <SegmentedControl.Item value="usd">USD</SegmentedControl.Item>
          <SegmentedControl.Item value="eur">EUR</SegmentedControl.Item>
        </SegmentedControl.Root>
      </Box>
      <Box data-part="scroll">
        <ScrollArea type="always" scrollbars="vertical" style={{ height: 48 }} aria-label="Release log">
          {GREY_LINES.map((line) => <p key={line} style={{ margin: 0 }}>{line}</p>)}
        </ScrollArea>
      </Box>
    </Flex>
  );
}

/** The outer rings of a box-shadow (no offset, no blur, 1px or wider), bottom layer first. */
function outerRings(el: Element, pseudo: string | null): RGBA[] {
  const rings: RGBA[] = [];
  for (const layer of topLevel(getComputedStyle(el, pseudo).boxShadow)) {
    if (/\binset\b/.test(layer)) continue;
    const colour = layer.match(/^[a-z-]+\([^)]*\)|^#[0-9a-f]+/i)?.[0];
    if (!colour) continue;
    const [x, y, blur, spread] = layer.slice(colour.length).trim().split(/\s+/).map(parseFloat);
    if (x === 0 && y === 0 && blur === 0 && spread >= 1) rings.push(parseColor(colour));
  }
  return rings.reverse();
}

/** The first stop of each flat gradient layer in a computed background-image, bottom layer first. */
function gradientStops(image: string): RGBA[] {
  if (!image || image === "none") return [];
  return topLevel(image)
    .map((layer) => topLevel(layer.slice(layer.indexOf("(") + 1, layer.lastIndexOf(")")))[0])
    .filter((stop): stop is string => Boolean(stop))
    .map((stop) => parseColor(stop.replace(/\s+[-\d.]+%$/, "")))
    .reverse();
}

export const GreyAndWhiteParts: Story = {
  render: () => <GreyPartsSpecimen />,
  play: async ({ canvasElement }) => {
    const specimen = canvasElement.querySelector<HTMLElement>('[data-testid="grey-parts"]');
    if (!specimen) throw new Error("the grey parts specimen did not render");
    // Radix mounts the ScrollArea thumb after it measures the overflow.
    for (let i = 0; i < 50 && !specimen.querySelector(".rt-ScrollAreaThumb"); i++) {
      const tick = Promise.withResolvers<void>();
      setTimeout(tick.resolve, 20);
      await tick.promise;
    }
    if (!specimen.querySelector(".rt-ScrollAreaThumb")) throw new Error("the ScrollArea never mounted its thumb");
    const root = themeRoot(canvasElement);
    const sRGB = !window.matchMedia?.("(color-gamut: p3)")?.matches;
    if (!sRGB) console.info("[Non-text contrast] P3 display: the grey part floors run in CI only. The shape checks still run here.");

    const host = document.createElement("div");
    host.style.cssText = "position:fixed;left:-9999px;top:0";
    document.body.appendChild(host);
    const fails: string[] = [];
    let read = 0;
    try {
      for (const appearance of ["light", "dark"] as const) {
        for (const accent of ALL_ACCENTS) {
          for (const neutral of NEUTRALS) {
            // A fresh theme for every combination, for PartsWithoutText's reason.
            host.replaceChildren();
            const theme = document.createElement("div");
            for (const a of Array.from(root.attributes)) {
              if (a.name !== "class" && a.name !== "style") theme.setAttribute(a.name, a.value);
            }
            theme.className = `radix-themes ${appearance}`;
            theme.setAttribute("data-accent-color", accent);
            theme.setAttribute("data-gray-color", neutral);
            theme.style.background = "var(--ds-bg-base)";
            theme.appendChild(specimen.cloneNode(true));
            host.appendChild(theme);

            const at = `[${appearance} ${accent} ${neutral}]`;
            const find = (part: string, selector: string): HTMLElement => {
              const el = theme.querySelector<HTMLElement>(`[data-part="${part}"] ${selector}`);
              if (!el) throw new Error(`${at} ${part}: nothing matched ${selector}`);
              return el;
            };
            const paint = (el: Element, pseudo: string | null) => parseColor(getComputedStyle(el, pseudo).backgroundColor);
            // The same four surfaces [[drop-target-dash]] holds a dash on.
            const surfaces = (Object.keys(DASH_SURFACES) as (keyof typeof DASH_SURFACES)[]).map((name) => ({ name, colour: surfaceColour(theme, { name, layers: DASH_SURFACES[name] }) }));
            /** A part clears where any one of the paints that bound it clears both floors. */
            const hold = (part: string, paints: { what: string; colour: RGBA }[], against: string, bg: RGBA) => {
              if (!sRGB) return;
              const readings = paints.map((p) => ({ ...p, ratio: contrastRatio(p.colour, bg), lc: apcaContrast(p.colour, bg) }));
              if (readings.some((r) => r.ratio >= GREY_FLOOR.min && r.lc >= GREY_FLOOR.minLc)) return;
              fails.push(`${at} ${part}, ${readings.map((r) => `${r.what} ${hex(r.colour)} ${r.ratio.toFixed(2)}:1 Lc ${r.lc.toFixed(1)}`).join(", ")}, against the ${against}, under WCAG 3:1 or APCA Lc 30 ([[neutral-part-stacks]])`);
            };

            // The dots at each size: a ring with a clear centre, and the pill.
            const probe = document.createElement("div");
            probe.style.width = "var(--ds-space-20)";
            theme.appendChild(probe);
            const pillLength = getComputedStyle(probe).width;
            probe.remove();
            for (const size of [1, 2, 3]) {
              const dot = find(`dots-${size}`, '.rt-ds-pagination__dot:not([aria-current="page"])');
              const pill = find(`dots-${size}`, '.rt-ds-pagination__dot[aria-current="page"]');
              const dotStyle = getComputedStyle(dot);
              const pillStyle = getComputedStyle(pill);
              if (paint(dot, null).a !== 0) fails.push(`${at} the inactive dot at size ${size} paints its centre ${dotStyle.backgroundColor}. Its centre stays clear ([[neutral-part-stacks]])`);
              if (pillStyle.width !== pillLength) fails.push(`${at} the current dot at size ${size} is ${pillStyle.width} long, not --ds-space-20 (${pillLength}) ([[neutral-part-stacks]])`);
              if (pillStyle.height !== dotStyle.height) fails.push(`${at} the current dot at size ${size} is ${pillStyle.height} tall and the other dots ${dotStyle.height}. The pill keeps the dot's height ([[neutral-part-stacks]])`);
              for (const s of surfaces) {
                hold(`Pagination dot ring, size ${size}`, [{ what: "ring", colour: insetEdge(dot, null, flatten(paint(dot, null), s.colour)) }], s.name, s.colour);
                hold(`Pagination current dot, size ${size}`, [{ what: "edge", colour: insetEdge(pill, null, flatten(paint(pill, null), s.colour)) }], s.name, s.colour);
              }
            }

            // The Slider thumb against its range, its track and the surface.
            const thumb = find("slider", ".rt-SliderThumb");
            const face = paint(thumb, "::after");
            const thumbRings = outerRings(thumb, "::after");
            const trackFill = paint(find("slider", ".rt-SliderTrack"), null);
            const rangeFill = paint(find("slider", ".rt-SliderRange"), null);
            for (const s of surfaces) {
              const track = flatten(trackFill, s.colour);
              const range = flatten(rangeFill, track);
              for (const [against, beside] of [[`range on the ${s.name}`, range], [`track on the ${s.name}`, track], [s.name, s.colour]] as const) {
                hold("Slider thumb", [
                  { what: "ring", colour: thumbRings.reduce((edge, ring) => flatten(ring, edge), beside) },
                  { what: "face", colour: flatten(face, beside) },
                ], against, beside);
              }
            }

            // The selected segment against the control's track.
            const control = find("segment", ".rt-SegmentedControlRoot");
            const controlSurface = paint(control, null);
            const controlWash = gradientStops(getComputedStyle(control).backgroundImage);
            const tile = find("segment", ".rt-SegmentedControlIndicator");
            const tileFill = paint(tile, "::before");
            const tileRings = outerRings(tile, "::before");
            for (const s of surfaces) {
              const track = controlWash.reduce((under, wash) => flatten(wash, under), flatten(controlSurface, s.colour));
              hold("SegmentedControl selected segment", [
                { what: "ring", colour: tileRings.reduce((edge, ring) => flatten(ring, edge), track) },
                { what: "tile", colour: flatten(tileFill, track) },
              ], `track on the ${s.name}`, track);
            }

            // The ScrollArea thumb against its lane and the surface.
            const lane = paint(find("scroll", ".rt-ScrollAreaScrollbar"), null);
            const scrollThumb = find("scroll", ".rt-ScrollAreaThumb");
            const thumbStack = gradientStops(getComputedStyle(scrollThumb).backgroundImage);
            for (const s of surfaces) {
              const laneOn = flatten(lane, s.colour);
              const painted = thumbStack.reduce((under, layer) => flatten(layer, under), flatten(paint(scrollThumb, null), laneOn));
              hold("ScrollArea thumb", [{ what: "thumb", colour: painted }], `lane on the ${s.name}`, laneOn);
              hold("ScrollArea thumb", [{ what: "thumb", colour: painted }], s.name, s.colour);
            }
            read += GREY_PARTS;
          }
        }
      }
    } finally {
      host.remove();
    }
    const want = 2 * ALL_ACCENTS.length * NEUTRALS.length * GREY_PARTS;
    if (fails.length) throw new Error(`Grey and white parts, ${fails.length} failures:\n  ${fails.slice(0, 80).join("\n  ")}`);
    if (read !== want) throw new Error(`expected ${want} readings, read ${read}`);
  },
};

/* =============================================================================
   STATUS DOTS, PART EDGES AND THE SELECTED ROW AT BOTH FLOORS ([[status-dot-edges]]). A GATE.
   -----------------------------------------------------------------------------
   [[status-dot-edges]] holds four things at WCAG and APCA together. The play renders the real
   parts, clones them into a fresh theme for each of the 27 accents, in light and
   in dark, on each of the six neutrals, reads each colour from the element that
   paints it, flattens every inset ring on the fill, and holds:
   · each StatusDot at WCAG 3:1 and APCA Lc 30 against the page, the subtle
     recess, a card and a panel. The warning, success and error dots stack their
     dot edge, the accent dot stacks --accent-part-edge and the neutral dot
     clears on its own fill.
   · each Avatar status dot at 3:1 and Lc 30 against its cutout ring, which
     paints the page colour on any surface.
   · every part that stacks --accent-part-edge ([[part-fill-edge]], [[radio-cards-band-edge]], [[indicator-mark-edges]]) at 3:1 and Lc 30
     against each of the four surfaces, and the Progress bar and the Slider
     range against their track on each surface as well. PartsWithoutText holds
     the same parts at 3:1 against the page alone.
   · the description of a selected Item row, static and with onClick, at 4.5:1
     and APCA Lc 60 against the row's tint over each surface.
   The floors run only in an sRGB context ([[srgb-contrast-checks]]).
   ============================================================================= */

const STATUS_DOT_FLOOR = { min: NON_TEXT_MIN, minLc: APCA_LC.minAnyText } as const;
const STATUS_DOT_TEXT_FLOOR = { min: 4.5, minLc: APCA_LC.largeUi } as const;
const STATUS_DOT_VARIANTS = ["success", "warning", "error", "accent", "neutral"] as const;
const STATUS_DOT_PRESENCE = ["online", "busy", "away", "offline"] as const;
/** Readings per theme: five dots, four Avatar dots, thirteen edged parts, two tracks and two descriptions. */
const STATUS_DOT_PARTS = 26;

function DotsAndRowsSpecimen() {
  return (
    <Flex data-testid="status-dot-edges" direction="column" gap="3" p="4" style={{ width: 320 }}>
      <Flex data-part="dots" align="center" gap="3">
        {STATUS_DOT_VARIANTS.map((variant) => <StatusDot key={variant} variant={variant} label={`Status, ${variant}`} />)}
      </Flex>
      <Flex data-part="avatars" align="center" gap="3">
        {STATUS_DOT_PRESENCE.map((status) => <Avatar key={status} size="lg" status={status} fallback="AL" />)}
      </Flex>
      <Box data-part="rows">
        <List>
          <ListItem label="Billing" description="Plan, invoices and payment" isSelected />
          <ListItem label="Security" description="Passkeys and sessions" isSelected onClick={() => {}} />
        </List>
      </Box>
    </Flex>
  );
}

export const DotsEdgesAndSelectedRows: Story = {
  render: () => (
    <>
      <DotsAndRowsSpecimen />
      <PartsSpecimen />
      <DashboardSpecimen />
    </>
  ),
  play: async ({ canvasElement }) => {
    const dotsSpecimen = canvasElement.querySelector<HTMLElement>('[data-testid="status-dot-edges"]');
    const partsSpecimen = canvasElement.querySelector<HTMLElement>('[data-testid="parts"]');
    if (!dotsSpecimen || !partsSpecimen) throw new Error("the [[status-dot-edges]] specimens did not render");
    const chartCard = canvasElement.querySelector<HTMLElement>('[data-testid="dashboard"] svg[role="img"]')?.closest<HTMLElement>(".rt-BaseCard");
    if (!chartCard) throw new Error("the Analytics dashboard chart card did not render");
    const root = themeRoot(canvasElement);
    const sRGB = !window.matchMedia?.("(color-gamut: p3)")?.matches;
    if (!sRGB) console.info("[Non-text contrast] P3 display: the [[status-dot-edges]] floors run in CI only.");

    const host = document.createElement("div");
    host.style.cssText = "position:fixed;left:-9999px;top:0";
    document.body.appendChild(host);
    const fails: string[] = [];
    let read = 0;
    try {
      for (const appearance of ["light", "dark"] as const) {
        for (const accent of ALL_ACCENTS) {
          for (const neutral of NEUTRALS) {
            // A fresh theme for every combination, for PartsWithoutText's reason.
            host.replaceChildren();
            const theme = document.createElement("div");
            for (const a of Array.from(root.attributes)) {
              if (a.name !== "class" && a.name !== "style") theme.setAttribute(a.name, a.value);
            }
            theme.className = `radix-themes ${appearance}`;
            theme.setAttribute("data-accent-color", accent);
            theme.setAttribute("data-gray-color", neutral);
            theme.style.background = "var(--ds-bg-base)";
            theme.appendChild(dotsSpecimen.cloneNode(true));
            theme.appendChild(partsSpecimen.cloneNode(true));
            const chart = chartCard.cloneNode(true) as HTMLElement;
            chart.setAttribute("data-part", "chart");
            theme.appendChild(chart);
            host.appendChild(theme);

            const at = `[${appearance} ${accent} ${neutral}]`;
            const find = <E extends Element = HTMLElement>(part: string, selector: string): E => {
              const el = theme.querySelector<E>(`[data-part="${part}"] ${selector}`);
              if (!el) throw new Error(`${at} ${part}: nothing matched ${selector}`);
              return el;
            };
            const paint = (el: Element, pseudo: string | null, prop: "backgroundColor" | "color" | "fill" | "stroke" | "borderTopColor" = "backgroundColor") =>
              parseColor(getComputedStyle(el, pseudo)[prop]);
            const hold = (part: string, colour: RGBA, against: string, bg: RGBA, floor: { min: number; minLc: number } = STATUS_DOT_FLOOR) => {
              if (!sRGB) return;
              const ratio = contrastRatio(colour, bg);
              const lc = apcaContrast(colour, bg);
              if (ratio >= floor.min && lc >= floor.minLc) return;
              fails.push(`${at} ${part} ${hex(colour)} reads ${ratio.toFixed(2)}:1 and Lc ${lc.toFixed(1)} against the ${against} ${hex(bg)}, under WCAG ${floor.min}:1 or APCA Lc ${floor.minLc} ([[status-dot-edges]])`);
            };
            // The same four surfaces [[drop-target-dash]] and [[neutral-part-stacks]] hold a part on.
            const surfaces = (Object.keys(DASH_SURFACES) as (keyof typeof DASH_SURFACES)[]).map((name) => ({ name, colour: surfaceColour(theme, { name, layers: DASH_SURFACES[name] }) }));
            const page = surfaces[0].colour;

            // The Avatar status dots, against the cutout ring around each.
            for (const status of STATUS_DOT_PRESENCE) {
              const dot = theme.querySelector<HTMLElement>(`[data-part="avatars"] .rt-ds-avatar-status[aria-label="${status[0].toUpperCase()}${status.slice(1)}"]`);
              if (!dot) throw new Error(`${at} the ${status} Avatar dot did not render`);
              const ring = flatten(paint(dot, null, "borderTopColor"), page);
              hold(`Avatar ${status} dot`, insetEdge(dot, null, flatten(paint(dot, null), ring)), "cutout ring", ring);
            }

            const dots = STATUS_DOT_VARIANTS.map((variant) => ({ variant, el: find("dots", `.rt-ds-statusdot[data-variant="${variant}"]`) }));
            const checkbox = find("checkbox", ".rt-CheckboxRoot");
            const radio = find("radio", ".rt-BaseRadioRoot");
            const switchRoot = find("switch", ".rt-SwitchRoot");
            const tab = find("tabs", '[role="tab"][data-state="active"]');
            const cardItem = find("card", ".rt-CheckboxCardsItem");
            const radioCard = find("radiocard", ".rt-RadioCardsItem");
            const todayBar = find("calendar", ".rt-ds-calendar-today-bar");
            const drop = find("drop", "[data-ds-reorder-group]");
            const chartPoint = find<SVGCircleElement>("chart", 'circle[fill="var(--accent-indicator)"]');
            const chartPointEdge = find<SVGCircleElement>("chart", 'circle[stroke="var(--accent-part-edge)"]');
            const swatch = find("chart", 'span[aria-hidden][style*="--accent-indicator"]');
            const sliderTrack = find("slider", ".rt-SliderTrack");
            const range = find("slider", ".rt-SliderRange");
            const progress = find("progress", ".rt-ProgressRoot");
            const bar = find("progress", ".rt-ProgressIndicator");
            const rows = [
              { name: "static", row: find("rows", ".rt-ds-item[data-selected]:not([data-interactive])") },
              { name: "with onClick", row: find("rows", ".rt-ds-item[data-selected][data-interactive]") },
            ];

            for (const s of surfaces) {
              const on = (el: Element, pseudo: string | null) => insetEdge(el as HTMLElement, pseudo, flatten(paint(el, pseudo), s.colour));
              // The StatusDots.
              for (const d of dots) hold(`StatusDot ${d.variant}`, on(d.el, null), s.name, s.colour);
              // The parts that stack --accent-part-edge.
              const edged: [string, RGBA][] = [
                ["Checkbox checked fill", on(checkbox, "::before")],
                ["Radio checked fill", on(radio, "::before")],
                ["Switch track", insetEdge(switchRoot, "::before", switchTrack(switchRoot, s.colour))],
                ["Tabs underline", on(tab, "::before")],
                ["CheckboxCards band", insetEdge(cardItem, "::after", cardBand(cardItem, s.colour))],
                ["RadioCards band", insetEdge(radioCard, "::after", cardBand(radioCard, s.colour))],
                ["Calendar today bar", on(todayBar, null)],
                ["DragHandle drop line", on(drop, "::before")],
                ["DragHandle drop end dot", on(drop, "::after")],
                ["Analytics chart end point", flatten(paint(chartPointEdge, null, "stroke"), flatten(paint(chartPoint, null, "fill"), s.colour))],
                ["Analytics legend swatch", on(swatch, null)],
              ];
              for (const [part, edge] of edged) hold(part, edge, s.name, s.colour);
              // The Progress bar and the Slider range, against the surface and their track on it.
              for (const [part, trackEl, fillEl] of [["Progress bar", progress, bar], ["Slider range", sliderTrack, range]] as const) {
                const track = flatten(paint(trackEl, null), s.colour);
                const edge = insetEdge(fillEl, null, flatten(paint(fillEl, null), track));
                hold(part, edge, s.name, s.colour);
                hold(part, edge, `track on the ${s.name}`, track);
              }
              // The description of a selected row, on the row's tint.
              for (const { name, row } of rows) {
                const description = row.querySelector<HTMLElement>(":scope > :is(.rt-ds-item-content, .rt-ds-item-body) > .rt-ds-item-description");
                if (!description) throw new Error(`${at} the selected ${name} row has no description`);
                const tint = flatten(paint(row, null), s.colour);
                hold(`selected ${name} row description`, flatten(paint(description, null, "color"), tint), `tint on the ${s.name}`, tint, STATUS_DOT_TEXT_FLOOR);
              }
            }
            read += STATUS_DOT_PARTS;
          }
        }
      }
    } finally {
      host.remove();
    }
    const want = 2 * ALL_ACCENTS.length * NEUTRALS.length * STATUS_DOT_PARTS;
    if (fails.length) throw new Error(`Dots, edges and selected rows, ${fails.length} failures:\n  ${fails.slice(0, 80).join("\n  ")}`);
    if (read !== want) throw new Error(`expected ${want} readings, read ${read}`);
  },
};
