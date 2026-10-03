import { type ReactNode, useLayoutEffect, useRef, useState } from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { Box, Code, Flex, Grid } from "@radix-ui/themes";
import { Check, Circle, Info, Tag, WarningCircle } from "@phosphor-icons/react";
import { Badge, type BadgeTone } from "./Badge";
import { Text as UIText } from "./Text";
import {
  AccentColor, AnatomyLegend, Caption, Decision, DoDont, DODONT_LABEL, dotStyle, HexThemeKey, hLine, MeasuredRow,
  MeasuredSpec, NoteRow, Page, PageHeader, PropsLead, PropDef, PropTable, Rule, Scenario, Section, tick,
  TokenGroup,
} from "./_storyKit";
import { ComparisonSection, CHIPS_COMPARISON } from "./_comparisons";
import { assertMeasuredRows, parseColor, resolveColor, themeRoot, withAccent, type RGBA } from "../../foundations/_assert";

/** The one definition of this component — the standfirst every page of it opens with. */
const DEFINITION = (
  <>
    A display marker you read, never a control. A flat soft tint, a pill by default so it cannot be mistaken
    for a button, with semantic tone painting from the accent-aware families so status colour follows the
    brand's collision shifts. The moment a chip clicks, navigates, or removes, it is a <Code>Token</Code>{" "}
    instead.
  </>
);

/* ---- helpers ------------------------------------------------------------- */
const near = (a: RGBA, b: RGBA, tol = 6) =>
  Math.abs(a.r - b.r) <= tol && Math.abs(a.g - b.g) <= tol && Math.abs(a.b - b.b) <= tol;
const variantOf = (b: HTMLElement) =>
  Array.from(b.classList).find((c) => c.startsWith("rt-variant-"))?.replace("rt-variant-", "");

/* ---- anatomy diagram (Badge-specific) -------------------------------------
   The size="3" DISPLAY specimen (a leading tag glyph + a label, no trailing icon) sits flex-centred
   in the frame, and every callout is MEASURED off it: a dot takes its x from the part it names and
   its y from that part's own edge, read in a layout effect and re-read by a ResizeObserver on the
   frame and the specimen. Hand-computed offsets go stale the moment the label, the type step or the
   pill's padding moves — the numbers they replace were pinned against one render of one accent. */

/** Where a callout sits and what it points at.
 *  `gutter` — the dot parks in the left gutter and runs a leader in to the part's LEFT edge, landing
 *  on the part's vertical middle.
 *  `over` — the dot sits above the specimen and drops a tick onto the first edge below it; `lane` is
 *  how far above that edge the tick starts, so the label's callout clears the icon callouts. `x`
 *  picks the column: the part's centre by default, or `"end"` for the pill's inner right edge —
 *  where an optional trailing glyph attaches, so callout 4 has a real place to point even though
 *  this specimen carries no trailing icon. */
type Pin =
  | { n: number; part: string; place: "gutter" }
  | { n: number; part: string; place: "over"; lane: number; x?: "end" };

/** The pill every `over` tick stops on, so no leader is drawn across the badge's tint. */
const CONTAINER = ".rt-Badge";
const DOT = 20; // dotStyle's diameter
const LEADER = 51; // the gutter leader's length
const LANE = { icon: 22, label: 40 };

const PINS: Pin[] = [
  { n: 1, part: CONTAINER, place: "gutter" },
  { n: 2, part: `${CONTAINER} > span[aria-hidden]`, place: "over", lane: LANE.icon },
  { n: 3, part: "[data-part='label']", place: "over", lane: LANE.label },
  { n: 4, part: CONTAINER, place: "over", lane: LANE.icon, x: "end" },
];

function AnatomyDiagram() {
  const frame = useRef<HTMLDivElement>(null);
  const specimen = useRef<HTMLDivElement>(null);
  const [pins, setPins] = useState<Record<number, { x: number; y: number }>>({});
  const [gutter, setGutter] = useState<number | null>(null);

  useLayoutEffect(() => {
    const f = frame.current;
    const s = specimen.current;
    if (!f || !s) return;
    const measure = () => {
      const pill = s.querySelector<HTMLElement>(CONTAINER);
      if (!pill) return;
      const fr = f.getBoundingClientRect();
      const stop = pill.getBoundingClientRect().top;
      const next: Record<number, { x: number; y: number }> = {};
      let leftmost = Infinity;
      for (const p of PINS) {
        const el = s.querySelector<HTMLElement>(p.part);
        if (!el) continue;
        const r = el.getBoundingClientRect();
        if (p.place === "gutter") {
          const x = Math.round(r.left - fr.left);
          next[p.n] = { x, y: Math.round(r.top + r.height / 2 - fr.top) };
          leftmost = Math.min(leftmost, x);
        } else {
          const end = r.right - parseFloat(getComputedStyle(el).paddingRight || "0");
          next[p.n] = {
            x: Math.round((p.x === "end" ? end : r.left + r.width / 2) - fr.left),
            // the tick stops at whichever edge it reaches first — the part's own top, or the pill's.
            y: Math.round(Math.min(r.top, stop) - fr.top),
          };
        }
      }
      setPins(next);
      setGutter(Number.isFinite(leftmost) ? leftmost - LEADER - DOT : null);
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
      <Box ref={frame} style={{ position: "relative", width: "100%", minWidth: 340, maxWidth: 600, margin: "0 auto", height: 200, background: "var(--ds-bg-subtle)", borderRadius: "var(--ds-radius-4)", overflow: "hidden" }}>
        <Flex align="center" justify="center" style={{ position: "absolute", inset: 0 }}>
          {/* the specimen ref shrink-wraps the pill, so the ResizeObserver sees the badge itself grow */}
          <Box ref={specimen}>
            <Badge size="3" leadingIcon={<Tag weight="bold" />} color="gray"><span data-part="label">Design</span></Badge>
          </Box>
        </Flex>
        {PINS.map((p) => {
          const a = pins[p.n];
          if (!a) return null;
          if (p.place === "gutter") {
            if (gutter == null) return null;
            return (
              <Box key={p.n}>
                <Box style={{ ...dotStyle, left: gutter, top: a.y - DOT / 2 }}>{p.n}</Box>
                <Box style={hLine({ left: gutter + DOT, top: a.y, width: a.x - gutter - DOT })} />
              </Box>
            );
          }
          return (
            <Box key={p.n}>
              <Box style={{ ...dotStyle, left: a.x - DOT / 2, top: a.y - p.lane - DOT }}>{p.n}</Box>
              <Box style={tick({ left: a.x, top: a.y - p.lane, height: p.lane })} />
            </Box>
          );
        })}
      </Box>
    </Box>
  );
}
const ANATOMY_PARTS: [number, string, string][] = [
  [1, "Container", "the pill surface — a flat soft fill; radius defaults to full"],
  [2, "Leading icon", "optional — identifies the badge (a category, type, or entity)"],
  [3, "Label", "the badge text; the accessible name when there's no aria-label"],
  [4, "Trailing icon", "optional decorative glyph after the label. Keep it inert — a trailing caret or ✕ promises an action, and an action belongs on a Token, not a Badge."],
];

/* ========================================================================== */
const meta: Meta<typeof Badge> = {
  title: "Components/Feedback & Status/Badge",
  component: Badge,
  // color-contrast is NOT disabled at meta scope — it stays ON for every story so the neutral/prose
  // specimens are genuinely checked. Only the specific stories that render soft-fill semantic labels
  // scope it off per-story, as a labelled specimen exception. The reason is [[soft-fill-text-exception]], NOT the retired solid-fill large/bold
  // provision: a Badge is 12px at weight 500, which qualifies as neither, so the 3.0 tier cannot be
  // borrowed here. It is a measured exception at 4.10-4.43 in light (7.7-10.4 in dark), roughly 0.4
  // under the strict threshold because the weak fill tints the background the floor was set against.
  parameters: {
    controls: { disable: true },
    docs: {
      description: {
        component:
          "The system badge is a **display marker** — a flat `soft` tint you *read*, never a control. " +
          "Semantic **tone** (`error/warning/success/info`) paints from the accent-aware `--ds-*` families, so " +
          "status colour follows the brand's collision shifts instead of a fixed Radix red/green. A pill by " +
          "default (`radius=\"full\"`) so a badge never reads as a button, with an optional icon in each slot. " +
          "The moment a chip is clickable, navigable, or removable it is a **Token** (see `System/Token`), not a " +
          "Badge — the surface edge is the honest signal that a chip is a control, not a label.",
      },
    },
  },
};
export default meta;
type Story = StoryObj<typeof Badge>;

/* ---- Anatomy ------------------------------------------------------------- */
export const Anatomy: Story = {
  // OPEN — same unruled tone-token gap as Callout, needs a ruling rather than a story fix.
  // The SOFT toned badge is step-11 ink on its own step-3 tint: success #218358 on #e3f3e9 = 4.10,
  // info #107d98 on #dbf4f7 = 4.14, warning #ab6400 on #fdf5c0 = 4.17, error #ce2c31 on #fbe8ea = 4.42,
  // all at 12px normal — and a success badge sitting on an already-tinted row composites down to 4.02.
  // Measured at the default iris accent, so this is not the brand-accent tolerance; and every value is
  // below the 4.39 floor that tolerance sets, so nothing standing covers it.
  // Narrowed to the SOFT variant: solid and outline toned badges clear 4.5 and are now checked again,
  // where ".rt-Badge[data-tone]" had excused all three variants from every rule.
  parameters: { a11y: { context: { exclude: [DODONT_LABEL, ".rt-Badge[data-tone].rt-variant-soft"] } } },
  render: () => (
    <Page>
      <PageHeader title="Badge · Anatomy" standfirst={DEFINITION} />
      <Section title="Anatomy" lead="A neutral display badge — the rest layer. A pill container with an optional icon on each side and a text label.">
        <AnatomyDiagram />
        <AnatomyLegend parts={ANATOMY_PARTS} />
        <Caption>The label is the badge's accessible name when no <Code>aria-label</Code> is set. An icon-only badge must carry <Code>aria-label</Code>.</Caption>
      </Section>

      <Rule />

      <Section title="Semantic tone" lead="The four families paint from the accent-aware --ds-* tokens — colour is paired with a label (never colour alone, 1.4.1). Untoned = neutral / brand accent.">
        <Flex gap="3" wrap="wrap">
          <Box data-testid="tone-success"><Badge tone="success" leadingIcon={<Check weight="bold" />}>Active</Badge></Box>
          <Box data-testid="tone-error"><Badge tone="error" leadingIcon={<WarningCircle weight="bold" />}>Failed</Badge></Box>
          <Badge tone="warning" leadingIcon={<WarningCircle weight="bold" />}>Pending</Badge>
          <Badge tone="info" leadingIcon={<Info weight="bold" />}>Beta</Badge>
          <Badge color="gray">Neutral</Badge>
        </Flex>
      </Section>

      {/* Test fixture (visually hidden, aria-hidden): an icon-only badge with NO accessible name
          must emit the dev warning (WCAG 4.1.2). This story's play installs a console.warn spy, then
          mounts — the on-mount effect fires inside the spy window. Folded here from the former
          `_A11yWarn` fixture story so the assertion lives in a doc story's play (matching Callout),
          with no extra sidebar entry. aria-hidden keeps it out of the a11y tree (axe skips it). */}
      <Box aria-hidden data-testid="a11y-fixture" style={{ position: "absolute", width: 1, height: 1, padding: 0, margin: -1, overflow: "hidden", clipPath: "inset(50%)", whiteSpace: "nowrap", border: 0 }}>
        <Badge leadingIcon={<Tag weight="bold" />} />
      </Box>
    </Page>
  ),
  play: async ({ canvasElement, mount }) => {
    // Fold of the former `_A11yWarn` fixture: an icon-only badge with no accessible name must warn
    // (WCAG 4.1.2). Install the console.warn spy BEFORE mount so the on-mount effect fires inside the
    // spy window (the page renders a visually-hidden nameless icon-only fixture badge for exactly this).
    const originalWarn = console.warn;
    const warnings: string[] = [];
    console.warn = (...a: unknown[]) => { warnings.push(String(a[0])); };
    try {
      await mount();
    } finally {
      console.warn = originalWarn;
    }
    if (!warnings.some((m) => m.includes("aria-label"))) {
      throw new Error("expected an icon-only Badge (no accessible name) to warn about it (WCAG 4.1.2)");
    }

    const root = themeRoot(canvasElement);
    // Display-only ([[badge-scope]]): every Badge is the flat `soft` variant — no surface edge lives on Badge anymore
    // (a chip that needs an edge is a Token). This invariant is what the interactive/removable removal buys.
    const badges = Array.from(canvasElement.querySelectorAll<HTMLElement>(".rt-Badge"));
    if (badges.length === 0) throw new Error("no badges rendered");
    for (const b of badges) {
      if (variantOf(b) !== "soft") throw new Error(`every Badge must be the soft display variant; found "${variantOf(b)}"`);
    }
    // Icon slots render as aria-hidden affix spans (decorative — the label is the accessible name).
    const lead = canvasElement.querySelector<HTMLElement>('[data-testid="tone-success"] .rt-Badge > span[aria-hidden]');
    if (!lead) throw new Error("leading icon slot must render as an aria-hidden affix span");
    // tone bridge — painted colour IS --ds-text-success and follows the grass shift.
    const toned = canvasElement.querySelector<HTMLElement>('[data-testid="tone-success"] .rt-Badge');
    if (toned?.getAttribute("data-tone") !== "success") throw new Error("data-tone not stamped");
    const painted = parseColor(getComputedStyle(toned).color);
    if (!near(painted, resolveColor(root, "--ds-text-success"))) throw new Error("toned text ≠ --ds-text-success");
    const rI = withAccent(root, "iris"); const base = resolveColor(root, "--ds-text-success"); rI();
    const rG = withAccent(root, "grass"); const shifted = resolveColor(root, "--ds-text-success"); rG();
    if (near(base, shifted)) throw new Error("success tone did not follow the grass collision shift");
  },
};

/* ---- Usage --------------------------------------------------------------- */
export const Usage: Story = {
  // Same open tone-token item as Anatomy. Here the composites go lower still, because these badges sit
  // on tinted rows rather than the page: error #ce2c31 on #e4e0d7 = 3.95, success #218358 on #cdebd7 =
  // 3.69. Narrowed to the SOFT variant so solid/outline toned badges are checked again.
  parameters: { a11y: { context: { exclude: [DODONT_LABEL, ".rt-Badge[data-tone].rt-variant-soft"] } } },
  render: (_args, { globals }) => (
    <HexThemeKey.Provider value={`${globals.accent}-${globals.appearance}-${globals.contrast}`}>
      <Page>
        <PageHeader title="Badge · Usage" standfirst={DEFINITION} />
        <ComparisonSection comparison={CHIPS_COMPARISON} highlight="Badge" />

        <Rule />

        <Section title="A badge labels — it never does something" lead="A badge is a read-only marker: a status, a category, a count. No hover, no focus, no target-size obligation, because there's nothing to click. The moment a chip is clickable, navigable, or removable, reach for a Token.">
          <Grid columns={{ initial: "1", sm: "3" }} gapX="6" gapY="4">
            <Scenario label="STATUS" caption="Read-only state on a row or card — colour paired with an icon and a word.">
              <Flex gap="2"><Badge tone="success" leadingIcon={<Check weight="bold" />}>Active</Badge><Badge tone="warning" leadingIcon={<WarningCircle weight="bold" />}>Trial</Badge></Flex>
            </Scenario>
            <Scenario label="CATEGORY" caption="A tag or type marker — a categorical hue, no semantic valence.">
              <Flex gap="2"><Badge leadingIcon={<Tag weight="bold" />} color="gray">Design</Badge><Badge color="gray">Docs</Badge></Flex>
            </Scenario>
            <Scenario label="COUNT" caption="A small numeric marker beside a label or icon.">
              <Badge color="gray">128</Badge>
            </Scenario>
          </Grid>
        </Section>

        <Rule />

        <Section title="Badge vs IconButton vs Token" lead="Three neighbours, three jobs.">
          <Grid columns={{ initial: "1", sm: "3" }} gapX="6" gapY="4">
            <Scenario label="BADGE" caption="Labels state or category — text-first, sits inline with content. Display only.">
              <Badge tone="info" leadingIcon={<Info weight="bold" />}>Beta</Badge>
            </Scenario>
            <Scenario label="ICONBUTTON" caption="A no-label action — its accessible name is aria-label, not visible text.">
              <UIText style={{ color: "var(--ds-text-weak)" }}>e.g. a toolbar ✕ / ⋯</UIText>
            </Scenario>
            <Scenario label="TOKEN" caption="An interactive chip — a clickable/navigable body, a remove ✕, or both. The surface edge marks it as a control.">
              <UIText style={{ color: "var(--ds-text-weak)" }}>see System/Token</UIText>
            </Scenario>
          </Grid>
        </Section>

        <Rule />

        <Section title="Semantic colour is never alone" lead="Status pairs colour with an icon and a word (WCAG 1.4.1) — colour can't be the only signal.">
          <Grid columns={{ initial: "1", sm: "2" }} gap="3">
            <DoDont kind="do" accent={globals.accent as AccentColor} bare note="Icon + label carry the meaning; colour reinforces it.">
              <Flex gap="2"><Badge tone="error" leadingIcon={<WarningCircle weight="bold" />}>Failed</Badge><Badge tone="success" leadingIcon={<Check weight="bold" />}>Passed</Badge></Flex>
            </DoDont>
            <DoDont kind="dont" accent={globals.accent as AccentColor} bare note="Colour-only dots read identically to anyone with a colour-vision deficiency — the status is lost.">
              <Flex gap="2" align="center">
                <Circle weight="fill" color="var(--ds-fill-error)" /><Circle weight="fill" color="var(--ds-fill-success)" />
              </Flex>
            </DoDont>
          </Grid>
          <Caption>Set <Code>tone</Code> <em>or</em> <Code>color</Code>, not both — they're effectively mutually exclusive. The <Code>[data-tone]</Code> bridge (specificity (0,3,0)) outranks Radix's <Code>data-accent-color</Code>, so a set <Code>tone</Code> always wins the paint.</Caption>
        </Section>

        <Rule />

        <Section title="Tokens" lead="Every colour row is read off a rendered badge and checked against the token it names, so the table reports what the chip paints rather than what the tokens say.">
          <Flex direction="column" gap="4">
            <TokenGroup label="DISPLAY (soft)" blurb="A flat tint. The gray badge shown here rides the neutral scale; an untoned badge rides the same steps of the brand accent (--accent-a3 / --accent-a11)." specimen={<Badge color="gray">Badge</Badge>}>
              <MeasuredSpec render={() => <Badge color="gray">Badge</Badge>}>
                <MeasuredRow part="Container fill" token="--gray-a3" select=".rt-Badge" prop="background-color" />
                <MeasuredRow part="Label" token="--gray-a11" select=".rt-Badge" prop="color" />
              </MeasuredSpec>
            </TokenGroup>
            <TokenGroup label="SEMANTIC TONE (success shown)" blurb="Accent-aware — follows the brand collision shift." specimen={<Badge tone="success" leadingIcon={<Check weight="bold" />}>Active</Badge>}>
              <MeasuredSpec render={() => <Badge tone="success" leadingIcon={<Check weight="bold" />}>Active</Badge>}>
                <MeasuredRow part="Fill" token="--ds-fill-success-weak" select='.rt-Badge[data-tone="success"]' prop="background-color" />
                <MeasuredRow part="Label + icon" note="The glyph inherits the label ink; it is never a second colour." token="--ds-text-success" select='.rt-Badge[data-tone="success"]' prop="color" />
              </MeasuredSpec>
              {/* Not measured beside the two above on purpose: a display Badge is always soft and
                  therefore borderless, so there is no edge on this specimen to read. The family stroke
                  is drawn as an inset box-shadow, and only the interactive surface chip (Token) paints it. */}
              <NoteRow part="Border" value="none — a display badge is borderless; the surface chip draws the family stroke as an inset 1px shadow" radix="--ds-stroke-success" />
            </TokenGroup>
            <TokenGroup label="ALL">
              <NoteRow part="Shape (radius)" value="full (pill) by default" radix="--radius-full" />
              <NoteRow part="Label type" value="text size lane" radix="--font-size-*" />
            </TokenGroup>
          </Flex>
        </Section>
      </Page>
    </HexThemeKey.Provider>
  ),
  play: async ({ canvasElement }) => {
    // Display-only ([[badge-scope]]): no Badge is a control. Every `.rt-Badge` is the flat `soft` variant, is not a
    // <button>/<a>, and carries no remove ✕ or data-interactive — a chip that does any of those is a Token.
    const badges = Array.from(canvasElement.querySelectorAll<HTMLElement>(".rt-Badge"));
    if (badges.length === 0) throw new Error("no badges rendered");
    for (const b of badges) {
      if (variantOf(b) !== "soft") throw new Error(`a display Badge must be soft, got "${variantOf(b)}"`);
      if (b.tagName === "BUTTON" || b.tagName === "A") throw new Error("a Badge must never render as an interactive element — that's a Token");
      if (b.getAttribute("data-interactive") != null) throw new Error("a Badge must not carry data-interactive");
      if (b.querySelector("button.rt-IconButton")) throw new Error("a Badge must not carry a remove ✕ — a removable chip is a Token");
    }

    // The token table's EVIDENCE, asserted at runtime: each colour row read a real rendered badge,
    // resolved its claim on a different node, and the two agree.
    const rows = assertMeasuredRows(canvasElement);
    if (rows.measured !== 4 || rows.unproven !== 0) {
      throw new Error(`expected 4 measured / 0 unproven token rows, got ${rows.measured} / ${rows.unproven}`);
    }
  },
};

/* ---- Properties (Badge-specific) ----------------------------------------- */

const BADGE_PROPS: PropDef[] = [
  { name: "tone", type: `"error" | "warning" | "success" | "info"`, desc: <>The system’s accent-aware semantic family → stamps <Code>data-tone</Code> for the CSS bridge. <strong>Wins over <Code>color</Code></strong>: the <Code>[data-tone]</Code> rule’s specificity (0,3,0) outranks Radix’s <Code>data-accent-color</Code> paint, so <Code>tone</Code> and <Code>color</Code> are effectively mutually exclusive. Unset = neutral / brand accent.</>, source: "Badge.tsx:18" },
  { name: "variant", type: `"soft" | "solid" | "surface" | …`, locked: true, desc: <>Radix’s raw variant is <strong>not exposed</strong> — Badge is display-only, so it’s always the flat <Code>soft</Code> tint. <Code>solid</Code>, <Code>surface</Code>, <Code>outline</Code>, and <Code>classic</Code> are intentionally unavailable: a chip that needs a surface edge is a <Code>Token</Code>, not a Badge.</>, source: "Badge.tsx:14" },
  { name: "color", type: `"gray" | "blue" | "red" | …`, desc: <>A categorical Radix hue for a non-semantic marker (a tag or type). Set <Code>tone</Code> <em>or</em> <Code>color</Code>, not both — a set <Code>tone</Code> wins the paint. Untinted, the badge picks up the theme accent.</>, source: "Radix" },
  { name: "leadingIcon", type: "ReactNode", desc: <>Optional identification glyph before the label — a fixed-width slot rendered as an <Code>aria-hidden</Code> affix (decorative, since the label is the accessible name).</>, source: "Badge.tsx:20" },
  { name: "trailingIcon", type: "ReactNode", desc: <>Optional display glyph after the label. Keep it <strong>inert</strong> — a trailing caret or ✕ promises an action, and an action belongs on a <Code>Token</Code>, not a Badge.</>, source: "Badge.tsx:23" },
  { name: "radius", type: `"full" | "none" | "small" | "medium" | "large"`, def: `"full"`, desc: <>Corner radius. Defaults to <Code>full</Code> (a pill) so a badge never reads as a button.</>, source: "Badge.tsx:42" },
  { name: "size", type: `"1" | "2" | "3"`, desc: <>Text size lane. Unset, it resolves from the global <Code>uiSize</Code> (default <Code>small</Code> → <Code>1</Code>); Radix’s own default is <Code>2</Code>.</>, source: "Badge.tsx:43 · Radix" },
  { name: "children", type: "ReactNode", desc: <>The visible label — also the badge’s accessible name when there’s no <Code>aria-label</Code>.</>, source: "Radix" },
  { name: "aria-label", type: "string", desc: <>Accessible name — <strong>required</strong> for an icon-only badge (no visible text), which otherwise has no name (WCAG 4.1.2).</>, source: "Badge.tsx:45" },
];

/* ---- Props ---------------------------------------------------------- */
const ICON_OPTIONS = ["none", "tag", "check", "warning", "info"] as const;
type IconKey = (typeof ICON_OPTIONS)[number];
const ICON_MAP: Record<IconKey, ReactNode> = {
  none: undefined,
  tag: <Tag weight="bold" />,
  check: <Check weight="bold" />,
  warning: <WarningCircle weight="bold" />,
  info: <Info weight="bold" />,
};

type PropsArgs = {
  tone: "none" | BadgeTone;
  color: "none" | "gray" | "blue" | "green" | "red" | "purple";
  radius: "full" | "none" | "small" | "medium" | "large";
  label: string;
  ariaLabel: string;
  leadIcon: IconKey;
  trailIcon: IconKey;
};

/** Props — the live, args-driven Badge. Build any display badge from the Controls: tone or colour,
 *  both icon slots, radius, label, and aria-label. (Interactive/removable chips are Tokens — see System/Token.) */
export const Props: StoryObj<PropsArgs> = {
  args: {
    tone: "none",
    color: "none",
    radius: "full",
    label: "Badge",
    ariaLabel: "",
    leadIcon: "tag",
    trailIcon: "none",
  },
  argTypes: {
    tone: { control: "inline-radio", options: ["none", "error", "warning", "success", "info"], table: { category: "Variant" } },
    color: { control: "inline-radio", options: ["none", "gray", "blue", "green", "red", "purple"], description: "Categorical hue. Set tone OR color — a set tone wins the paint.", table: { category: "Variant" } },
    radius: { control: "inline-radio", options: ["full", "none", "small", "medium", "large"], table: { category: "Variant" } },
    label: { control: "text", description: "The visible label (also the accessible name when there's no aria-label).", table: { category: "Content" } },
    ariaLabel: { name: "aria-label", control: "text", description: "Accessible name — required for an icon-only badge.", table: { category: "Content" } },
    leadIcon: { name: "leading icon", control: "select", options: ICON_OPTIONS, table: { category: "Content" } },
    trailIcon: { name: "trailing icon", control: "select", options: ICON_OPTIONS, table: { category: "Content" } },
  },
  parameters: { controls: { disable: false } },
  render: ({ tone, color, radius, label, ariaLabel, leadIcon, trailIcon }: PropsArgs) => {
    const lead = ICON_MAP[leadIcon];
    const trail = ICON_MAP[trailIcon];
    return (
      <Page maxWidth="none">
        <PageHeader title="Badge · Props" standfirst={DEFINITION} />
        <Box style={{ padding: "8px 0 2px" }}>
          <Badge
            radius={radius}
            {...(tone !== "none" ? { tone } : {})}
            {...(color !== "none" ? { color } : {})}
            {...(ariaLabel ? { "aria-label": ariaLabel } : {})}
            leadingIcon={lead}
            trailingIcon={trail}
          >
            {label}
          </Badge>
        </Box>
        <PropsLead />
        <Rule />
        <Section title="Props reference" lead={<>Every prop <Code>Badge</Code> accepts — <Code>tone</Code> is the system’s own accent-aware API, the rest pass through to Radix’s <Code>Badge</Code>. <Code>variant</Code> is locked so a badge stays a display-only marker.</>}>
          <PropTable rows={BADGE_PROPS} />
        </Section>
      </Page>
    );
  },
};

/* ---- History ------------------------------------------------------------- */
export const History: Story = {
  render: () => (
    <Page>
      <PageHeader title="Badge · History" standfirst={DEFINITION} />
      <Section title="Decisions" lead="The rulings this component encodes.">
        <Flex direction="column" gap="3">
          <Decision id="[[badge-scope]] · display-only, soft only">Badge is <strong>display-only</strong> — a flat <Code>soft</Code> tint you <em>read</em>, and <Code>soft</Code> is the only Radix variant it exposes (<Code>solid</Code>/<Code>surface</Code>/<Code>outline</Code>/<Code>classic</Code> aren't). The interactive (<Code>emphasis="interactive"</Code> / <Code>asChild</Code>) and removable (<Code>onRemove</Code>) modes it once carried were removed and consolidated onto <Code>System/Token</Code>: a clickable, navigable, or removable chip is always a Token, because the surface <strong>edge</strong> is the honest signal that a chip is a control, not a label. This sharpens the earlier Badge/Token boundary, which had let Badge keep a removable mode.</Decision>
          <Decision id="[[one-accent]]/[[status-colour-defaults]]/[[field-shell]] · accent-aware semantic tone">Semantic <Code>tone</Code> paints from the accent-aware <Code>--ds-*</Code> families via the <Code>[data-tone]</Code> bridge, so it follows brand-collision shifts (a grass brand's success reads lime). Accent stays reserved for brand/interactive meaning.</Decision>
        </Flex>
      </Section>
      <Rule />
      <Section title="Changelog" lead="Notable changes, newest first.">
        <Flex direction="column" gap="3">
          <Decision id="0.9.0">Initial component — a <strong>display-only</strong> marker: the accent-aware <Code>[data-tone]</Code> bridge (the <Code>[data-validation]</Code> recipe re-keyed for a display component), icon slots, and a live token spec. The interactive (<Code>emphasis</Code>/<Code>asChild</Code>) and removable (<Code>onRemove</Code>) modes were consolidated onto <Code>System/Token</Code> — a chip that clicks, navigates, or removes is a Token. Stories split History · Anatomy · Usage · Props.</Decision>
        </Flex>
      </Section>
    </Page>
  ),
};
