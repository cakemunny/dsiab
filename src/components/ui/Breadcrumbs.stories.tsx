import type { Meta, StoryObj } from "@storybook/react-vite";
import type { ReactNode } from "react";
import { useContext, useLayoutEffect, useRef, useState } from "react";
import { Box, Code, Flex, Grid, Text as RadixText } from "@radix-ui/themes";
import { House, CaretRight, Folder } from "@phosphor-icons/react";
import { Breadcrumbs, BreadcrumbItem, type BreadcrumbsVariant } from "./Breadcrumbs";
import {
  AnatomyLegend, Caption, Decision, DoDont, DODONT_LABEL, dotStyle, HexThemeKey, hLine, MeasuredRow, MeasuredSpec,
  NoteRow, Page, PageHeader, PropsLead, type PropDef, PropTable, Rule, Section, tick, TokenGroup,
} from "./_storyKit";
import { assertMeasuredRows } from "../../foundations/_assert";
import { ComparisonSection, NAV_SURFACES_COMPARISON } from "./_comparisons";

/** The one definition of this component — the standfirst every page of it opens with. */
const DEFINITION = (
  <>
    A navigation trail: a <Code>nav</Code> wrapping an ordered list of crumbs with a decorative separator
    between them. Compose it from <Code>BreadcrumbItem</Code> children — a <Code>href</Code> makes a link, an{" "}
    <Code>onClick</Code> a button, the current page a plain span. The last crumb is auto-detected as current
    when no item claims it. There is no collapse mechanism; flatten the hierarchy instead.
  </>
);

/* ---- anatomy diagram ------------------------------------------------------
   The trail is a horizontal STRIP — every part sits on one line — so the callouts go in bands above and
   below it rather than in side gutters, and each leader drops (or rises) into the part's own column. Two
   bands, not one: the landmark's leading edge and the Home icon share an x, as do the second crumb's
   <li> and the link inside it, so a single band would draw those pairs on top of each other.

   Positions are MEASURED off the live specimen: crumb widths follow the global text lane, so every one
   of these x values moves when the reader changes size and none of them can be written down. */

const SIDE_PAD = 28;
const TOP_BAND = 84;
const BOT_BAND = 76;
/** Where the leaders in each band turn their corner — one shared line, so the elbows read as a set. */
const TOP_ELBOW = 48;
const BOT_ELBOW = 30;
/** Closest two dots in one band may sit, centre to centre. A dot is 20px wide. */
const MIN_GAP = 28;
const DOT = 20; // dotStyle's diameter
/** How far a dot sits off the frame's own edge — the surface is painted here, so a dot flush against
 *  the rounded corner reads as clipped rather than as the end of a leader. */
const DOT_INSET = 10;

/** [callout, selector inside the specimen, where across that element the leader lands, which band]. */
const PINS: [number, string, "left" | "center", "top" | "bottom"][] = [
  [1, ".rt-ds-breadcrumbs-nav", "left", "top"],
  // The THIRD crumb's <li>, not the second's: the second is where callout 4 names the <a> inside it, and
  // an <li> and its own link land within a few px of each other.
  [2, ".rt-ds-breadcrumb-item:nth-child(3)", "center", "top"],
  [5, ".rt-ds-breadcrumb-current", "center", "top"],
  [6, ".rt-ds-breadcrumb-icon", "center", "bottom"],
  [4, ".rt-ds-breadcrumb-item:nth-child(2) .rt-ds-breadcrumb-link", "center", "bottom"],
  // The separator LEADING the third crumb — the first crumb's is rendered but display:none'd by the
  // component's own rule, so it has no box to point at.
  [3, ".rt-ds-breadcrumb-item:nth-child(3) .rt-ds-breadcrumb-sep", "center", "bottom"],
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
        for (const [n, sel, at, pinBand] of PINS) {
          if (pinBand !== band) continue;
          const el = s.querySelector<HTMLElement>(sel);
          if (!el) continue;
          const box = el.getBoundingClientRect();
          measured.push({
            n,
            partX: Math.round(box.left + (at === "left" ? 0 : box.width / 2) - frameBox.left),
          });
        }
        // Sorted by where the parts ACTUALLY are, not by declaration order: a longer crumb label at a
        // bigger size reorders nothing, but a fixed order would still push a dot the wrong way the
        // moment two of them close up. One forward pass over the sorted list keeps any two dots a
        // legible distance apart; the leader turns a corner to reach its part, so the dot moves and
        // the line still lands.
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
          position: "relative", borderRadius: "var(--ds-radius-4)", background: "var(--ds-bg-subtle)",
          paddingTop: TOP_BAND, paddingBottom: BOT_BAND, paddingLeft: SIDE_PAD, paddingRight: SIDE_PAD,
        }}
      >
        {/* fit-content, so the <nav> (a block) shrinks to the trail instead of stretching the whole
            surface — the callout columns then sit over the crumbs rather than over empty space. */}
        <Box ref={specimen} data-testid="anatomy" style={{ width: "fit-content" }}>
          <Breadcrumbs label="Anatomy specimen">
            <BreadcrumbItem href="#home" startIcon={<House weight="bold" />}>Home</BreadcrumbItem>
            <BreadcrumbItem href="#projects">Projects</BreadcrumbItem>
            <BreadcrumbItem href="#ds">Design System</BreadcrumbItem>
            <BreadcrumbItem isCurrent>Tokens</BreadcrumbItem>
          </Breadcrumbs>
        </Box>

        {PINS.map(([n, , , band]) => {
          const pin = pins[n];
          if (!pin) return null;
          const { dotX, partX } = pin;
          const top = band === "top";
          // The two bands are mirror images: the dot sits at the outer end, the leader turns at the
          // band's shared elbow line, and the last segment runs into the specimen's near edge.
          const dotTop = top ? DOT_INSET : edges.bottom + BOT_BAND - DOT - DOT_INSET;
          const elbow = top ? TOP_ELBOW : edges.bottom + BOT_ELBOW;
          const stem = top
            ? { top: dotTop + DOT, height: Math.max(0, elbow - dotTop - DOT) }
            : { top: elbow, height: Math.max(0, dotTop - elbow) };
          const reach = top
            ? { top: elbow, height: Math.max(0, edges.top - 6 - elbow) }
            : { top: edges.bottom + 6, height: Math.max(0, elbow - edges.bottom - 6) };
          return (
            <Box key={n}>
              <Box data-pin={n} style={{ ...dotStyle, left: dotX - DOT / 2, top: dotTop }}>{n}</Box>
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

/* ---- anatomy legend ------------------------------------------------------ */
const ANATOMY_PARTS: [number, string, string][] = [
  [1, "Landmark", "a <nav aria-label=\"Breadcrumb\"> wrapping an ordered <ol> — the WAI-ARIA breadcrumb pattern."],
  [2, "Item", "each crumb is an <li>. Give each Breadcrumbs on a page a distinct label (two nav landmarks need unique names)."],
  [3, "Separator", "a LEADING aria-hidden span before every crumb, hidden on the first via CSS. Decorative — screen readers skip it."],
  [4, "Link crumb", "a plain <a> (or a caller `as` component) — muted secondary text, underline on hover, the system focus ring ([[focus-ring]])."],
  [5, "Current crumb", "the trail's end: aria-current=\"page\" on the CONTENT element (link/button/span, never the <li>) + strong text, no link when explicit."],
  [6, "Start icon", "an optional glyph before the label (a House on Home, a Folder on a section)."],
];

/* ---- live type spec ------------------------------------------------------
   The trail's two variants are sized off the GLOBAL text lane, so "default is
   --font-size-2" is only true at the medium setting. Naming a step by hand also
   produced `--font-size-1–3`, an EN DASH inside a token name — nothing you can
   paste into CSS, printed in the ink that says "this is a token".
   So both rows are measured instead: read the rendered crumb's font-size, then
   find WHICH `--font-size-N` step resolves to that same value and name that one.
   The probe only supplies candidate steps to compare against — the reading itself
   comes from the specimen, never from anything this function sets on it. */
function typeStep(el: HTMLElement): { token: string; value: string } {
  const px = getComputedStyle(el).fontSize;
  const probe = document.createElement("span");
  probe.style.position = "absolute";
  el.appendChild(probe);
  let token = "—";
  for (let n = 1; n <= 9; n += 1) {
    probe.style.fontSize = `var(--font-size-${n})`;
    if (getComputedStyle(probe).fontSize === px) {
      token = `--font-size-${n}`;
      break;
    }
  }
  probe.remove();
  return { token, value: px };
}

function BreadcrumbsTokens() {
  const themeKey = useContext(HexThemeKey);
  const ref = useRef<HTMLDivElement>(null);
  const [type, setType] = useState<{ def?: { token: string; value: string }; sup?: { token: string; value: string } }>({});
  useLayoutEffect(() => {
    const def = ref.current?.querySelector<HTMLElement>('[data-variant="default"] .rt-ds-breadcrumb-link');
    const sup = ref.current?.querySelector<HTMLElement>('[data-variant="supporting"] .rt-ds-breadcrumb-link');
    if (def && sup) setType({ def: typeStep(def), sup: typeStep(sup) });
  }, [themeKey]);
  return (
    <TokenGroup
      label="TEXT — the muted trail + the strong current crumb"
      blurb="Link and separator take the secondary text role; the current crumb takes the strong role. Every colour row is read off a rendered trail and checked against the token it names, and the type rows are measured off the two trails above."
      specimen={
        <Flex ref={ref} direction="column" gap="2">
          <Breadcrumbs label="Token specimen — default">
            <BreadcrumbItem href="#a">Root</BreadcrumbItem>
            <BreadcrumbItem href="#b">Folder</BreadcrumbItem>
            <BreadcrumbItem isCurrent>File</BreadcrumbItem>
          </Breadcrumbs>
          <Breadcrumbs variant="supporting" label="Token specimen — supporting">
            <BreadcrumbItem href="#c">Root</BreadcrumbItem>
            <BreadcrumbItem href="#d">Folder</BreadcrumbItem>
            <BreadcrumbItem isCurrent>File</BreadcrumbItem>
          </Breadcrumbs>
        </Flex>
      }
    >
      <MeasuredSpec
        render={() => (
          <Breadcrumbs label="Measurement trail">
            <BreadcrumbItem href="#m1">Root</BreadcrumbItem>
            <BreadcrumbItem href="#m2">Folder</BreadcrumbItem>
            <BreadcrumbItem isCurrent>File</BreadcrumbItem>
          </Breadcrumbs>
        )}
      >
        <MeasuredRow part="Link crumb" token="--ds-text-weak" select=".rt-ds-breadcrumb-link" prop="color" />
        <MeasuredRow
          part="Separator"
          note="A leading decorative glyph, hidden on the first crumb — it shares the link's ink."
          token="--ds-text-weak"
          select=".rt-ds-breadcrumb-sep"
          prop="color"
        />
        <MeasuredRow
          part="Current crumb"
          note="The trail's end on the default variant; the supporting variant keeps it muted."
          token="--ds-text-strong"
          select='[data-variant="default"] .rt-ds-breadcrumb-current'
          prop="color"
        />
        <MeasuredRow
          part="Link hover"
          note="Colour AND an underline — the trail never signals a link by colour alone."
          token="--ds-text-strong"
          select=".rt-ds-breadcrumb-link"
          prop="color"
          state="hover"
        />
        <MeasuredRow
          part="Focus ring (links)"
          token="--ds-stroke-focus"
          select=".rt-ds-breadcrumb-link"
          prop="outline-color"
          state="focus-visible"
        />
      </MeasuredSpec>
      {/* The two type rows stay prose: the trail has no size prop, so which --font-size-N step a crumb
          lands on is decided by the ambient text lane. Each row reads the rendered crumb's size and then
          names the step that resolves to it — the step is found, never asserted. */}
      <NoteRow part="Text size — default" value={type.def?.value ?? "…"} radix={type.def?.token ?? "—"} />
      <NoteRow part="Text size — supporting" value={type.sup?.value ?? "…"} radix={type.sup?.token ?? "—"} />
      <NoteRow part="How the two relate" value="supporting sits one step below default and is floored at the lane's smallest step — so at the small lane the two rows above read the same size" />
      <NoteRow part="Focus ring geometry" value="2px solid, outline-offset 2px. The accent with a Radix alpha (--ds-stroke-focus-stack) stacked on top, the same ring on every control ([[focus-ring]])" radix="outline" />
    </TokenGroup>
  );
}

/* ========================================================================== */
const meta: Meta<typeof Breadcrumbs> = {
  title: "Components/Navigation/Breadcrumbs",
  component: Breadcrumbs,
  parameters: {
    controls: { disable: true },
    docs: {
      description: {
        component:
          "**Breadcrumbs** is a navigation trail — a `<nav aria-label=\"Breadcrumb\">` wrapping an `<ol>` of " +
          "`<li>` crumbs with a decorative separator between them. Compose it from **BreadcrumbItem** children: " +
          "a `href` makes a link, `onClick` a button, and the current page a `<span>`. If no item sets " +
          "`isCurrent`, the **last** crumb is auto-detected as current — `aria-current=\"page\"` landing on its " +
          "**content element** (even a link), never the `<li>`. Two variants (**default** / **supporting**) and a " +
          "custom `separator`. No collapse mechanism — flatten the hierarchy instead.",
      },
    },
  },
};
export default meta;
type Story = StoryObj<typeof Breadcrumbs>;

/* ---- Anatomy ------------------------------------------------------------- */
export const Anatomy: Story = {
  render: (_args, { globals }) => (
    <HexThemeKey.Provider value={`${globals.accent}-${globals.appearance}-${globals.contrast}`}>
      <Page maxWidth={860}>
        <PageHeader title="Breadcrumbs · Anatomy" standfirst={DEFINITION} />
        <Section title="Anatomy" lead="A nav landmark wrapping an ordered list of crumbs, with a decorative separator leading each one.">
          <AnatomyDiagram />
          <AnatomyLegend parts={ANATOMY_PARTS} />
          <Caption>The current crumb is <Code>aria-current="page"</Code> for AT and strong text for sight. Separators are aria-hidden.</Caption>
        </Section>

        <Rule />

        <Section title="Variants" lead="Two text scales. Supporting is for a secondary trail (a sub-header, a card footer).">
          <Flex direction="column" gap="4">
            {(["default", "supporting"] as BreadcrumbsVariant[]).map((v) => (
              <Flex key={v} align="center" gap="4">
                <Box style={{ width: 96, flexShrink: 0 }}><Code>{v}</Code></Box>
                <Breadcrumbs variant={v} label={`Variant ${v}`}>
                  <BreadcrumbItem href="#a">Workspace</BreadcrumbItem>
                  <BreadcrumbItem href="#b">Reports</BreadcrumbItem>
                  <BreadcrumbItem isCurrent>Q3 revenue</BreadcrumbItem>
                </Breadcrumbs>
              </Flex>
            ))}
          </Flex>
        </Section>

        <Rule />

        <Section title="Separators" lead="Any ReactNode works as the separator — a slash, a chevron, a dot.">
          <Flex direction="column" gap="4">
            {([
              { sep: "/", note: "default slash" },
              { sep: <CaretRight size={12} weight="bold" />, note: "chevron icon" },
              { sep: "•", note: "dot" },
            ] as { sep: ReactNode; note: string }[]).map(({ sep, note }, i) => (
              <Flex key={i} align="center" gap="4">
                <Box style={{ width: 96, flexShrink: 0 }}><Code>{note}</Code></Box>
                <Breadcrumbs separator={sep} label={`Separator ${note}`}>
                  <BreadcrumbItem href="#a">Docs</BreadcrumbItem>
                  <BreadcrumbItem href="#b">Guides</BreadcrumbItem>
                  <BreadcrumbItem isCurrent>Theming</BreadcrumbItem>
                </Breadcrumbs>
              </Flex>
            ))}
          </Flex>
        </Section>
      </Page>
    </HexThemeKey.Provider>
  ),
  play: async ({ canvasElement }) => {
    // Every numbered part in the legend has a callout ON the specimen — a numbered legend with nothing
    // to point at is the defect this diagram exists to avoid.
    const pins = canvasElement.querySelectorAll("[data-pin]");
    if (pins.length !== ANATOMY_PARTS.length)
      throw new Error(`expected ${ANATOMY_PARTS.length} callout pins on the specimen; got ${pins.length}`);
  },
};

/* ---- Usage --------------------------------------------------------------- */
export const Usage: Story = {
  // The DO/DON'T word (success/error step-11 ink on its own tint) measures 4.10 at 12px bold, under axe's
  // 4.5; the colour + the word already carry the meaning, so that row is the documented exception. Scoped
  // to the label itself — the cards' specimens stay fully axe-checked, which "[data-dodont]" did not do.
  parameters: { a11y: { context: { exclude: [DODONT_LABEL] } } },
  render: (_args, { globals }) => (
    <Page maxWidth={860}>
      <PageHeader title="Breadcrumbs · Usage" standfirst={DEFINITION} />
      <ComparisonSection comparison={NAV_SURFACES_COMPARISON} highlight="Breadcrumbs" />

      <Rule />

      <Section title="A page path" lead="The core use: where am I, and how do I get back up. Links for ancestors, a plain current for here.">
        <Breadcrumbs label="Settings path">
          <BreadcrumbItem href="#home" startIcon={<House weight="bold" />}>Home</BreadcrumbItem>
          <BreadcrumbItem href="#settings">Settings</BreadcrumbItem>
          <BreadcrumbItem href="#billing">Billing</BreadcrumbItem>
          <BreadcrumbItem isCurrent>Invoices</BreadcrumbItem>
        </Breadcrumbs>
      </Section>

      <Rule />

      <Section title="A file tree — with icons + auto-current" lead="Here no item sets isCurrent — the last crumb is auto-detected, and its aria-current lands on the content element.">
        <Breadcrumbs label="File tree">
          <BreadcrumbItem href="#root" startIcon={<Folder weight="fill" />}>src</BreadcrumbItem>
          <BreadcrumbItem href="#c" startIcon={<Folder weight="fill" />}>components</BreadcrumbItem>
          <BreadcrumbItem href="#ui" startIcon={<Folder weight="fill" />}>ui</BreadcrumbItem>
          <BreadcrumbItem href="#file">Breadcrumbs.tsx</BreadcrumbItem>
        </Breadcrumbs>
        <Caption>The last crumb is still a link (you can re-open it), but it's marked current — that's the navigation-a11y fix.</Caption>
      </Section>

      <Rule />

      <Section title="Supporting trail" lead="Under a page title, a supporting-variant trail gives quiet context without competing with the heading.">
        <Flex direction="column" gap="1">
          <RadixText size="6" weight="bold" style={{ color: "var(--ds-text-strong)" }}>Q3 revenue</RadixText>
          <Breadcrumbs variant="supporting" separator={<CaretRight size={12} weight="bold" />} label="Report context">
            <BreadcrumbItem href="#w">Workspace</BreadcrumbItem>
            <BreadcrumbItem href="#r">Reports</BreadcrumbItem>
            <BreadcrumbItem isCurrent>Q3 revenue</BreadcrumbItem>
          </Breadcrumbs>
        </Flex>
      </Section>

      <Rule />

      <Section title="Do / don't" lead="Breadcrumbs show hierarchy, not history.">
        <Grid columns={{ initial: "1", sm: "2" }} gap="3">
          <DoDont kind="do" bare note="Reflect the site hierarchy: each crumb is an ancestor of the current page. Keep the current page as the last, non-link crumb.">
            <RadixText size="2" style={{ color: "var(--ds-text-strong)" }}>Home / Settings / Billing / <strong>Invoices</strong></RadixText>
          </DoDont>
          <DoDont kind="dont" bare note="Don't use breadcrumbs as a back-button history (Search → Product → Cart). That's a journey, not a hierarchy — it confuses orientation.">
            <RadixText size="2" style={{ color: "var(--ds-text-strong)" }}>Search / Product / Cart / <strong>Checkout</strong></RadixText>
          </DoDont>
        </Grid>
      </Section>

      <Rule />

      {/* The closing reference section. The provider is what makes the table live: every measured row
          re-reads its value when this key changes, so an accent/appearance flip re-resolves the spec. */}
      <HexThemeKey.Provider value={`${globals.accent}-${globals.appearance}-${globals.contrast}`}>
        <Section title="Tokens" lead="Every colour row is read off a rendered trail and checked against the token it claims, so the table can disagree with the component. The two type rows are measured off the rendered crumbs, so they follow the global text lane instead of naming a step that only holds at one setting.">
          <BreadcrumbsTokens />
        </Section>
      </HexThemeKey.Provider>
    </Page>
  ),
  play: async ({ canvasElement }) => {
    // The token table's EVIDENCE, asserted at runtime ([[measured-token-rows]]). Two of these values exist only while a
    // pseudo-state is active, so those rows read the declaration the component's own rule paints.
    const rows = assertMeasuredRows(canvasElement);
    if (rows.measured !== 5 || rows.unproven !== 0) {
      throw new Error(`expected 5 measured / 0 unproven token rows, got ${rows.measured} / ${rows.unproven}`);
    }
  },
};

/* ---- Props ---------------------------------------------------------- */
const SEPARATORS: Record<string, ReactNode> = {
  slash: "/",
  chevron: <CaretRight size={12} weight="bold" />,
  dot: "•",
};

const BC_PROPS: PropDef[] = [
  { name: "children", type: "ReactNode", desc: <>BreadcrumbItem children forming the trail.</>, source: "Breadcrumbs.tsx" },
  { name: "separator", type: "ReactNode", def: `"/"`, desc: <>Decorative separator between items (aria-hidden).</>, source: "Breadcrumbs.tsx" },
  { name: "variant", type: `"default" | "supporting"`, def: `"default"`, desc: <>Text scale — body vs supporting.</>, source: "Breadcrumbs.tsx" },
  { name: "label", type: "string", def: `"Breadcrumb"`, desc: <>Accessible name for the <Code>&lt;nav&gt;</Code>. Distinct per trail.</>, source: "Breadcrumbs.tsx" },
];
const ITEM_PROPS: PropDef[] = [
  { name: "children", type: "ReactNode", desc: <>The crumb label.</>, source: "BreadcrumbItem" },
  { name: "href", type: "string", desc: <>URL → renders a link (<Code>&lt;a&gt;</Code>). Omit for the current page.</>, source: "BreadcrumbItem" },
  { name: "onClick", type: "(e) => void", desc: <>Click handler — with <Code>href</Code> (link) or without (a reset <Code>&lt;button&gt;</Code>).</>, source: "BreadcrumbItem" },
  { name: "isCurrent", type: "boolean", desc: <>Marks this crumb current (a <Code>&lt;span aria-current&gt;</Code>). Unset on all → the last is auto-detected.</>, source: "BreadcrumbItem" },
  { name: "startIcon", type: "ReactNode", desc: <>Optional glyph before the label.</>, source: "BreadcrumbItem" },
  { name: "as", type: "ElementType", desc: <>Custom link component (a router Link) for a linked crumb.</>, source: "BreadcrumbItem" },
];

type PropsArgs = {
  variant: BreadcrumbsVariant;
  separator: keyof typeof SEPARATORS;
  useAutoCurrent: boolean;
  withIcons: boolean;
  label: string;
};

export const Props: StoryObj<PropsArgs> = {
  args: { variant: "default", separator: "slash", useAutoCurrent: false, withIcons: true, label: "Props" },
  argTypes: {
    variant: { control: "inline-radio", options: ["default", "supporting"], table: { category: "Display" } },
    separator: { control: "inline-radio", options: ["slash", "chevron", "dot"], table: { category: "Display" } },
    useAutoCurrent: { control: "boolean", description: "Drop the explicit isCurrent — the last crumb is auto-detected.", table: { category: "Behavior" } },
    withIcons: { control: "boolean", description: "Show a leading icon on the first crumb.", table: { category: "Content" } },
    label: { control: "text", table: { category: "A11y" } },
  },
  parameters: { controls: { disable: false } },
  render: (args: PropsArgs) => (
    <Page maxWidth="none">
      <PageHeader title="Breadcrumbs · Props" standfirst={DEFINITION} />
      <Box style={{ padding: "var(--ds-space-16) 0" }}>
        <Breadcrumbs variant={args.variant} separator={SEPARATORS[args.separator]} label={args.label}>
          <BreadcrumbItem href="#home" startIcon={args.withIcons ? <House weight="bold" /> : undefined}>Home</BreadcrumbItem>
          <BreadcrumbItem href="#projects">Projects</BreadcrumbItem>
          <BreadcrumbItem href="#ds">Design System</BreadcrumbItem>
          <BreadcrumbItem href={args.useAutoCurrent ? "#tokens" : undefined} isCurrent={args.useAutoCurrent ? undefined : true}>
            Tokens
          </BreadcrumbItem>
        </Breadcrumbs>
      </Box>
      <PropsLead />
      <Rule />
      <Section title="Breadcrumbs props" lead={<>The container.</>}>
        <PropTable rows={BC_PROPS} />
      </Section>
      <Section title="BreadcrumbItem props" lead={<>Each crumb.</>}>
        <PropTable rows={ITEM_PROPS} />
      </Section>
    </Page>
  ),
};

/* ---- History ------------------------------------------------------------- */
export const History: Story = {
  render: () => (
    <Page>
      <PageHeader title="Breadcrumbs · History" standfirst={DEFINITION} />
      <Section title="Decisions" lead="The rulings this component encodes.">
        <Flex direction="column" gap="3">
          <Decision id="[[breadcrumb-trail]] · Auto-current on the content element">
            When no item sets <Code>isCurrent</Code>, the <strong>last</strong> crumb's <strong>content
            element</strong> (the link/button/span via a <Code>contentRef</Code> — <strong>never</strong> the
            <Code>&lt;li&gt;</Code>) gets <Code>aria-current="page"</Code>, via a post-render DOM scan of the
            <Code>&lt;ol&gt;</Code> children. This is the navigation-a11y fix:
            the current marker lands on the actual interactive element — including when the last crumb is a link —
            not a positional last child. (Chosen over the plan's early "children introspection" guess: the DOM
            scan needs no child cloning and is robust to any child structure.)
          </Decision>
          <Decision id="[[breadcrumb-trail]] · leading separators">
            Each item renders its own <strong>leading</strong> <Code>aria-hidden</Code> separator, hidden on
            <Code>:first-child</Code> via CSS. Separators are <strong>decorative</strong> — screen readers skip
            them; the crumbs carry the meaning.
          </Decision>
          <Decision id="[[breadcrumb-trail]] · plain-<a> links">
            Linked crumbs render as a plain
            <Code>&lt;a&gt;</Code> styled from <Code>--ds-*</Code> tokens — muted secondary text
            (<Code>--ds-text-weak</Code>), underline on hover, the system focus ring ([[focus-ring]]) — not the raw Radix
            <Code>Link</Code>, whose accent skin would fight the muted trail. A caller <Code>as</Code> component
            (a router Link) can override. Current text is <Code>--ds-text-strong</Code>. <strong>Zero net-new
            tokens.</strong>
          </Decision>
          <Decision id="[[breadcrumb-trail]] · no collapse">
            There is <strong>no collapse mechanism</strong> — flatten the hierarchy rather than truncate a long
            trail. Two variants (<Code>default</Code> / <Code>supporting</Code>) size text off the Radix scale.
          </Decision>
        </Flex>
      </Section>
      <Rule />
      <Section title="Changelog" lead="Notable changes, newest first — grows as the component evolves.">
        <Flex direction="column" gap="3">
          <Decision id="0.9.0">
            Initial <Code>System/Breadcrumbs</Code> — the nav trail: BreadcrumbItem (link / button /
            current), DOM-scan auto-current on the content element, leading aria-hidden separators, two
            variants, custom separator, <Code>startIcon</Code>. Zero net-new tokens.
          </Decision>
        </Flex>
      </Section>
    </Page>
  ),
};
