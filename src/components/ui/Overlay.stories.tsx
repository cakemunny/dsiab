import { useContext, useLayoutEffect, useRef, useState, type ReactNode } from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { Box, Code, Flex, Grid, Text, Theme } from "@radix-ui/themes";
import { ArrowsOut, DownloadSimple, Heart, Play } from "@phosphor-icons/react";
import { Overlay, type OverlayPosition, type OverlayScrim, type OverlayShowOn } from "./Overlay";
import { IconButton } from "./IconButton";
import {
  Caption, Decision, DoDont, DODONT_LABEL, HexThemeKey, MeasuredRow, MeasuredSpec, Mono, NoteRow, Page,
  PageHeader, PropsLead, type PropDef, PropTable, Rule, Section,
  Muted,
} from "./_storyKit";
import { awaitMeasuredRows } from "../../foundations/_assert";

/* System/Overlay — the lite spine (Kbd shape): History → Usage (specimen · live token spec ·
   a do/don't) → Props. Overlay is a MEDIA HOVER-SCRIM, reclassified per [[overlay-hover-scrim]] — NOT a portal layer.
   All docs specimens are STATIC: they render with showOn="always" (or a static revealed state), so the
   scrim is shown at rest and nothing animates on view (a CSS transition only runs on a state change,
   never on mount). The reveal-on-hover/focus, the keyboard-reachability proof, and the tap-to-toggle
   behavior live in _internal/Overlay behavior. */

// A poster-style media stand-in (no network in tests), a gradient box painted from Radix scales.
// The default is a mid-tone accent poster. `dark` renders a dark poster for the light-scrim demo, and
// that one is PINNED to the light scale. A photograph keeps its colours whatever the page's appearance,
// and gray-12 inverts, so unpinned the "dark" poster turned light in the dark appearance. The light
// scrim then sat over light media, the opposite of what its caption says, and its focus ring measured
// 1.11:1 there. Pinned, it draws the same near-black to grey poster in both appearances.
function Media({ dark, w = 240, h = 150, label }: { dark?: boolean; w?: number; h?: number; label?: string }) {
  const bg = dark
    ? "linear-gradient(135deg, var(--gray-12), var(--gray-10))"
    : "linear-gradient(135deg, var(--accent-6), var(--accent-9))";
  const poster = <div role="img" aria-label={label ?? "Sample media"} style={{ width: w, height: h, background: bg }} />;
  return dark ? <Theme appearance="light" hasBackground={false}>{poster}</Theme> : poster;
}

// Live-read the scrim tokens + motion off the rendered DOM.
function ScrimSpec() {
  const themeKey = useContext(HexThemeKey);
  const ref = useRef<HTMLDivElement>(null);
  const [v, setV] = useState<{ moderate: string; fast: string } | null>(null);
  useLayoutEffect(() => {
    if (!ref.current) return;
    const cs = getComputedStyle(ref.current);
    setV({
      moderate: cs.getPropertyValue("--ds-duration-moderate").trim(),
      fast: cs.getPropertyValue("--ds-duration-fast").trim(),
    });
  }, [themeKey]);
  return (
    <Box ref={ref} style={{ borderRadius: "var(--ds-radius-4)", border: "1px solid var(--ds-stroke-weak)", overflow: "hidden", background: "var(--ds-bg-subtle)" }}>
      <Flex align="center" gap="3" style={{ padding: "20px" }}>
        <Muted>
          The scrim paints from <Mono>--ds-scrim</Mono> for light media, or <Mono>--ds-scrim-light</Mono>{" "}
          (a white alpha) for dark media where a dark scrim would vanish — both measured off a rendered
          overlay below. It reveals with an opacity transition on the ladder — enter{" "}
          <Mono>--ds-duration-moderate</Mono> ({v?.moderate || "—"}) with the entry ease, hide{" "}
          <Mono>--ds-duration-fast</Mono> ({v?.fast || "—"}) with the exit ease. Both read live, so a
          token change tracks and reduced motion collapses to ~0. A focused control rings in the
          system ring, the accent fill with a Radix alpha stacked on top, 2px wide ([[focus-ring]]). Each scrim
          re-points the alpha: a white one on the dark scrim and a black one on the light scrim. So
          a control reached by Tab stays visible over any media. The media beneath is your own node.
        </Muted>
      </Flex>
      <MeasuredSpec
        render={() => (
          <>
            <Overlay showOn="always" scrim="dark" media={<Media label="Dark scrim measurement" />} data-probe="dark">
              <IconButton priority="primary" aria-label="Play"><Play weight="fill" /></IconButton>
            </Overlay>
            <Overlay showOn="always" scrim="light" media={<Media dark label="Light scrim measurement" />} data-probe="light">
              <IconButton priority="primary" aria-label="Play"><Play weight="fill" /></IconButton>
            </Overlay>
          </>
        )}
      >
        <MeasuredRow
          part="Scrim (dark)"
          note="For light media — the default."
          token="--ds-scrim"
          select='[data-probe="dark"] .rt-ds-overlay-scrim'
          prop="background-color"
        />
        <MeasuredRow
          part="Scrim (light)"
          note="A white alpha, for dark media where a dark scrim would vanish."
          token="--ds-scrim-light"
          select='[data-probe="light"] .rt-ds-overlay-scrim'
          prop="background-color"
        />
        <MeasuredRow
          part="Content ink (dark scrim)"
          note="The scrim seeds its own slot, so your content inherits this — 5.74:1 at the worst case that exists, which is white media under the dark veil."
          token="--ds-on-scrim"
          select='[data-probe="dark"] .rt-ds-overlay-scrim'
          prop="color"
        />
        <MeasuredRow
          part="Content ink (light scrim)"
          note="The inverse. White here would read 1.00:1 — the two properties always move together."
          token="--ds-on-scrim-light"
          select='[data-probe="light"] .rt-ds-overlay-scrim'
          prop="color"
        />
        <MeasuredRow
          part="Focus ring (dark scrim)"
          note="The base layer on ::before: the accent fill, the same base as every ring ([[focus-ring]])."
          token="--ds-stroke-focus"
          select='[data-probe="dark"] .rt-BaseButton'
          prop="outline-color"
          pseudo="::before"
          state="focus-visible"
        />
        <MeasuredRow
          part="Focus ring stack (dark scrim)"
          note="The alpha on ::after, over the base: the lightest Radix white alpha that holds the ring at 3:1 over any media, 3.03:1 at worst. Transparent on yellow, amber, lime, mint and sky, whose fill clears alone."
          token="--accent-ring-stack-scrim"
          select='[data-probe="dark"] .rt-BaseButton'
          prop="outline-color"
          pseudo="::after"
          state="focus-visible"
        />
        <MeasuredRow
          part="Focus ring (light scrim)"
          note="The same accent base on ::before. Only the stack above it changes with the scrim."
          token="--ds-stroke-focus"
          select='[data-probe="light"] .rt-BaseButton'
          prop="outline-color"
          pseudo="::before"
          state="focus-visible"
        />
        <MeasuredRow
          part="Focus ring stack (light scrim)"
          note="The alpha on ::after, over the base: the lightest Radix black alpha that holds the ring at 3:1 over any media, 3.00:1 at worst. Transparent on oxblood, whose fill clears alone."
          token="--accent-ring-stack-scrim-light"
          select='[data-probe="light"] .rt-BaseButton'
          prop="outline-color"
          pseudo="::after"
          state="focus-visible"
        />
      </MeasuredSpec>
      <NoteRow part="Reveal motion" value={`${v?.moderate || "—"} enter · ${v?.fast || "—"} hide — opacity, not display/visibility (keyboard reachability)`} />
      <NoteRow part="Media" value="Your own node beneath the scrim (an <img>, a Card) — the Overlay never repaints it" />
    </Box>
  );
}

// A labelled specimen tile.
function Tile({ caption, children }: { caption: ReactNode; children: ReactNode }) {
  return (
    <Flex direction="column" gap="1">
      <Caption>{caption}</Caption>
      {children}
    </Flex>
  );
}

/* NO LOCAL COLOUR HERE, AND THAT IS THE POINT.
 *
 * Until 2026-09-02 this file carried two hardcoded literals — `color: "white"` for the dark scrim
 * and a near-black for the light one — because the scrim had no paired foreground role and there
 * was no other way to make its content readable. Both are gone. [[scrim-foreground-tokens]] minted --ds-on-scrim and
 * --ds-on-scrim-light, and [[overlay-scrim-ink]] made `.rt-ds-overlay-scrim` set `color`, so anything placed in the
 * content slot inherits the right ink from the scrim it sits on.
 *
 * The specimens below therefore set no colour at all. That is deliberate: a story that reached past
 * the mechanism would document a workaround rather than the component, and would keep passing if
 * the mechanism broke.
 *
 * Worth knowing while reading this page: scrim content is structurally un-gateable by axe. The
 * `Media` stand-in paints a linear-gradient and a real Overlay wraps an <img>, and axe abstains when
 * it cannot resolve the background it composites against — an incomplete, which cannot fail a run.
 * That is true in every consumer's app too, and it is why the role and its measured floor exist at
 * all: a named token and a written number are the only checks that reach this case.
 */

const PROPS: PropDef[] = [
  { name: "media", type: "ReactNode", desc: <>The media/card beneath the scrim — an <Code>&lt;img&gt;</Code>, a Card, a poster. The Overlay never repaints it.</>, source: "Overlay.tsx" },
  { name: "children", type: "ReactNode", desc: <>The content/actions revealed within the scrim. Real controls (Button/IconButton) stay keyboard-reachable.</>, source: "Overlay.tsx" },
  { name: "showOn", type: `"hover" | "focus" | "always" | "hover-or-focus"`, def: `"hover-or-focus"`, desc: <>When the scrim reveals. <strong>Always reveals on keyboard <Code>:focus-within</Code></strong> regardless (a focused action must never be invisible); <Code>hover-or-focus</Code> is the a11y-safe default.</>, source: "Overlay.tsx" },
  { name: "position", type: `"fill" | "bottom" | "top"`, def: `"bottom"`, desc: <>Where the content sits within the scrim — centered, or pinned to the bottom / top edge.</>, source: "Overlay.tsx" },
  { name: "scrim", type: `"dark" | "light"`, def: `"dark"`, desc: <><Code>dark</Code> = <Mono>--ds-scrim</Mono> (for light media); <Code>light</Code> = <Mono>--ds-scrim-light</Mono> (a white alpha, for dark media).</>, source: "Overlay.tsx" },
];

/** The one definition of this component — the standfirst every page of it opens with. */
const DEFINITION = <>A scrim plus actions drawn over media, revealed on hover or focus — a media hover-scrim, not a portal layer.</>;

const meta: Meta<typeof Overlay> = {
  title: "Components/Container/Overlay",
  component: Overlay,
  parameters: {
    controls: { disable: true },
    docs: {
      description: {
        component:
          "**Overlay** is a **media hover-scrim** — a dimming scrim plus actions rendered over an image " +
          "or card, revealed on hover / focus / always. It is **not a portal layer** — anchored " +
          "floating content is Popover / HoverCard / Dialog territory. It's a small fully-custom widget: " +
          "a `position: relative` container wrapping your media, an absolute-inset scrim from " +
          "`--ds-scrim` (or `--ds-scrim-light` for dark media), and a content slot (`fill` / `bottom` / " +
          "`top`). The **keyboard-reachability contract** is load-bearing: the reveal is opacity-based " +
          "(never `display:none`/`visibility:hidden`, which drop actions from the tab order + a11y " +
          "tree), and the scrim reveals on `:focus-within` in every mode so a focused action is never " +
          "invisible. On `(hover: none)` devices a tap toggles the scrim.",
      },
    },
  },
};
export default meta;
type Story = StoryObj<typeof Overlay>;

export const Usage: Story = {
  // The DO/DON'T word (success/error step-11 ink on its own tint) measures 4.10 at 12px bold, under axe's
  // 4.5; the colour + the word already carry the meaning, so that row is the documented exception. Scoped
  // to the label itself — the cards' specimens stay fully axe-checked, which "[data-dodont]" did not do.
  parameters: { a11y: { context: { exclude: [DODONT_LABEL] } } },
  render: (_args, { globals }) => (
    <HexThemeKey.Provider value={`${globals.accent}-${globals.appearance}-${globals.contrast}`}>
      <Page>
        <PageHeader
          title="Overlay · Usage"
          standfirst={<>{DEFINITION} Hover a card below (or Tab to a control inside it) to reveal the scrim and its actions; it stays hidden at rest, so nothing flashes on view.</>}
        />
        <Section title="Specimen" lead="Each media type reveals its scrim on hover or keyboard focus. The content sits in one of three slots (fill / bottom / top) within a dark scrim; the last is a light scrim over dark media. Hover a card to see it.">
          <Flex align="start" gap="5" wrap="wrap">
            <Tile caption="position='bottom' · scrim='dark'">
              <Overlay showOn="hover-or-focus" position="bottom" media={<Media label="Aurora over a coastline" />}>
                <Flex align="center" justify="between" width="100%">
                  <Text size="2" weight="bold">Aurora Bay</Text>
                  <IconButton priority="secondary" aria-label="Save to favourites"><Heart /></IconButton>
                </Flex>
              </Overlay>
            </Tile>
            <Tile caption="position='fill' · scrim='dark'">
              <Overlay showOn="hover-or-focus" position="fill" media={<Media label="A video thumbnail" />}>
                <IconButton priority="primary" aria-label="Play"><Play weight="fill" /></IconButton>
              </Overlay>
            </Tile>
            <Tile caption="position='top' · scrim='dark'">
              <Overlay showOn="hover-or-focus" position="top" media={<Media label="A gallery photo" />}>
                <Flex align="center" gap="2" justify="end" width="100%">
                  <IconButton priority="secondary" aria-label="Expand"><ArrowsOut /></IconButton>
                  <IconButton priority="secondary" aria-label="Download"><DownloadSimple /></IconButton>
                </Flex>
              </Overlay>
            </Tile>
            <Tile caption="scrim='light' · over dark media">
              <Overlay showOn="hover-or-focus" position="fill" scrim="light" media={<Media dark label="A dark poster" />}>
                <IconButton priority="secondary" aria-label="Play"><Play weight="fill" /></IconButton>
              </Overlay>
            </Tile>
          </Flex>
        </Section>
        <Rule />
        <Section title="What belongs under the scrim" lead="An Overlay reveals secondary actions or a caption over media — a hover affordance, not a place for primary or sole-path controls. Anything a user must be able to do belongs in the always-visible UI.">
          <Grid columns={{ initial: "1", sm: "2" }} gap="3">
            <DoDont kind="do" bare note="Reveal secondary actions or a caption over an image or card — save, expand, play, a title. Real Button/IconButton controls stay keyboard-reachable, and the scrim reveals on focus.">
              <Overlay showOn="always" position="bottom" media={<Media label="A saved place" w={220} h={130} />}>
                <Flex align="center" justify="between" width="100%">
                  <Text size="2" weight="bold">Harbour View</Text>
                  <IconButton priority="secondary" aria-label="Save"><Heart /></IconButton>
                </Flex>
              </Overlay>
            </DoDont>
            <DoDont kind="dont" bare note="Don't hide primary or sole-path actions behind a hover reveal (a user may never hover), and don't use a scrim for anchored floating content — a menu, a hover card, a confirm. Those are Popover / HoverCard / Dialog.">
              <Overlay showOn="always" position="fill" media={<Media dark label="A checkout card" w={220} h={130} />}>
                <IconButton priority="primary" aria-label="Complete purchase — the only way to pay"><DownloadSimple /></IconButton>
              </Overlay>
            </DoDont>
          </Grid>
        </Section>
        <Rule />
        <Section title="Tokens" lead="Each scrim is measured off a rendered Overlay of that tint and checked against the token it names, so the table reports what the scrim paints.">
          <ScrimSpec />
        </Section>
      </Page>
    </HexThemeKey.Provider>
  ),
  play: async ({ canvasElement }) => {
    // The token table's EVIDENCE, asserted at runtime — all eight rows read a REAL rendered scrim.
    // `awaitMeasuredRows` blocks until every row has recorded its evidence (a row whose element
    // mounts late retries for up to 60 frames before it reports), then runs the identical assertions.
    // EIGHT since [[focus-ring]]: the two scrim backgrounds, the two content inks the scrim seeds into its own slot
    // ([[scrim-foreground-tokens]]/[[overlay-scrim-ink]]), and each scrim's focus ring as two rows, the accent base on ::before and that scrim's
    // stack on ::after. The count is exact on purpose. It went from 2 to 4, 4 to 6, 6 to 7 and 7 to 8 in
    // four changes, and this line is what noticed, which is the point of asserting a number rather
    // than a minimum.
    const rows = await awaitMeasuredRows(canvasElement);
    if (rows.measured !== 8 || rows.unproven !== 0) {
      throw new Error(`expected 8 measured / 0 unproven token rows, got ${rows.measured} / ${rows.unproven}`);
    }

    // Passive render assertion only — it does NOT drive a reveal. The scrim's paint is no longer
    // re-checked here: the token table below measures it off a rendered Overlay and the row asserts it.
    // The reveal-on-hover/focus, keyboard-reachability, and tap-toggle behavior live in
    // _internal/Overlay behavior.
    const scrim = canvasElement.querySelector<HTMLElement>('.rt-ds-overlay .rt-ds-overlay-scrim');
    if (!scrim) throw new Error("Usage must render a scrim");
    // A real focusable action lives inside the scrim.
    if (!scrim.querySelector("button")) throw new Error("the scrim must contain a real action control");
  },
};

type PropsArgs = {
  showOn: OverlayShowOn;
  position: OverlayPosition;
  scrim: OverlayScrim;
  caption: string;
};

export const Props: StoryObj<PropsArgs> = {
  args: { showOn: "hover-or-focus", position: "bottom", scrim: "dark", caption: "Aurora Bay" },
  argTypes: {
    showOn: { control: "inline-radio", options: ["hover", "focus", "always", "hover-or-focus"], description: "When the scrim reveals. Always reveals on keyboard :focus-within regardless.", table: { category: "Behavior" } },
    position: { control: "inline-radio", options: ["fill", "bottom", "top"], description: "Where the content sits within the scrim.", table: { category: "Layout" } },
    scrim: { control: "inline-radio", options: ["dark", "light"], description: "Dark (--ds-scrim, light media) or light (--ds-scrim-light, dark media).", table: { category: "Paint" } },
    caption: { control: "text", description: "The bottom-bar caption in this demo.", table: { category: "Content" } },
  },
  parameters: { controls: { disable: false } },
  render: ({ showOn, position, scrim, caption }: PropsArgs) => (
    <Page maxWidth="none">
      <PageHeader
        title="Overlay · Props"
        standfirst={<>{DEFINITION} Hover the media (or Tab to the action) to reveal the scrim; on a touch device a tap toggles it.</>}
      />
      <Box style={{ padding: "8px 0 2px", width: "fit-content" }}>
        <Overlay showOn={showOn} position={position} scrim={scrim} media={<Media dark={scrim === "light"} label="Demo media" w={300} h={190} />}>
          <Flex align="center" justify="between" width="100%">
            <Text size="2" weight="bold">{caption}</Text>
            <IconButton priority="secondary" aria-label="Save to favourites"><Heart /></IconButton>
          </Flex>
        </Overlay>
      </Box>
      <PropsLead />
      <Rule />
      <Section title="Props reference" lead={<>Everything <Code>Overlay</Code> adds. Standard <Code>div</Code> props (<Code>className</Code>, <Code>style</Code>, <Code>aria-*</Code>) pass through to the container.</>}>
        <PropTable rows={PROPS} />
      </Section>
    </Page>
  ),
};

export const History: Story = {
  render: () => (
    <Page>
      <PageHeader title="Overlay · History" standfirst={DEFINITION} />
      <Section title="Decisions" lead="The rulings this component encodes.">
        <Flex direction="column" gap="3">
          <Decision id="[[overlay-hover-scrim]] · reclassified">
            Overlay is a <strong>media hover-scrim</strong>, <strong>not a portal layer</strong> — a scrim + actions
            drawn over an image or card, absolute-inset inside its OWN container. No portal, no primitive: it ships
            as a small fully-custom lite component. Anchored floating content (a menu, a hover card, a confirm) belongs
            to <Code>Popover</Code> / <Code>HoverCard</Code> / <Code>Dialog</Code> — NOT this.
          </Decision>
          <Decision id="[[overlay-hover-scrim]] · keyboard">
            Inner actions must stay reachable by keyboard when the scrim isn't shown. So the reveal is{" "}
            <strong>opacity-based, never <Code>display:none</Code> or <Code>visibility:hidden</Code></strong> —
            both drop the actions from the tab order AND the a11y tree. Opacity keeps them focusable +
            AT-reachable while hidden (<Code>pointer-events</Code> only gates mouse clicks, never Tab/Enter).
            And the scrim reveals on <Code>:focus-within</Code> in <strong>every</strong> <Code>showOn</Code> mode —
            a focused action must never be invisible (WCAG 2.4.7). Proven in the behavior suite: an action is
            focused, asserted reachable, and the scrim reveals.
          </Decision>
          <Decision id="[[overlay-hover-scrim]] · scrim">
            The scrim paints from <Code>--ds-scrim</Code> (a black alpha; for light media) with a{" "}
            <Code>--ds-scrim-light</Code> white-alpha variant added for dark media. Reveal rides the motion
            ladder (enter <Code>--ds-duration-moderate</Code>, hide <Code>--ds-duration-fast</Code>). On{" "}
            <Code>(hover: none)</Code> devices — where hover can never fire — a tap toggles the scrim.
          </Decision>
          <Decision id="[[scrim-focus-ring]] · focus ring (superseded by [[focus-ring]])">
            A focus ring on the scrim takes the scrim's paired ink. The page ring is <Code>gray-12</Code>,
            which flips with the appearance, while both veils keep their colour. So the ring could match
            the scrim composite exactly, at 1.00:1: on the dark scrim in the light appearance, and on the
            light scrim in the dark appearance. Inside <Code>.rt-ds-overlay-scrim</Code> the ring token
            now resolves to <Code>--ds-on-scrim</Code> or <Code>--ds-on-scrim-light</Code>, the ink the
            slot's text already uses, so it reads at least 5.72:1 over any media while the scrim stays at
            0.6 alpha or stronger. The token, width and offset are the ones every control uses (the first neutral focus ring and [[validation-focus-paint]]).
            One visible change: in the light appearance a secondary button on the dark scrim shows a
            white rim just outside its light face.
          </Decision>
          <Decision id="[[light-scrim-focus-ring]] · focus ring on the light scrim (superseded by [[focus-ring]])">
            On the light scrim a focused <Code>Button</Code> or <Code>IconButton</Code> rings in a deep
            shade of its own colour. An outline on <Code>::before</Code> paints the button's fill,{" "}
            <Code>--ds-fill-accent</Code>, and one on <Code>::after</Code> stacks a Radix black alpha on
            it, <Code>--accent-scrim-ring-stack</Code>: the lightest step that holds the ring at 3:1 over
            black media, <Code>--black-a5</Code>, <Code>-a6</Code> or <Code>-a9</Code> by colour, and none on
            oxblood, whose fill clears alone. Both take the button's own width, offset and radius ([[button-focus-ring-offset]]), and
            the button's outline stays under them, transparent. A classic or inset button, other controls
            in the light scrim, the dark scrim and forced colours keep the [[scrim-focus-ring]] ring.
          </Decision>
          <Decision id="[[focus-ring]] · one focus ring">
            [[focus-ring]] replaces both scrim rings. A focused control on either scrim wears the system ring: the
            accent fill, <Code>--ds-stroke-focus</Code>, on <Code>::before</Code>, with the stack,{" "}
            <Code>--ds-stroke-focus-stack</Code>, on <Code>::after</Code>. It is 2px wide, the same as
            every control. The scrim keeps the base and re-points only the stack. The dark scrim takes{" "}
            <Code>--accent-ring-stack-scrim</Code>, a Radix white alpha. The light scrim takes{" "}
            <Code>--accent-ring-stack-scrim-light</Code>, a Radix black alpha and the new name of [[light-scrim-focus-ring]]'s{" "}
            <Code>--accent-scrim-ring-stack</Code>. Each is the lightest step that holds the ring at 3:1
            and APCA Lc 30 over any media. The dark scrim ring is no longer white. Forced colours keep
            the system <Code>Highlight</Code> ring at 2px.
          </Decision>
        </Flex>
      </Section>
      <Rule />
      <Section title="Changelog" lead="Notable changes, newest first — grows as the component evolves.">
        <Flex direction="column" gap="3">
          <Decision id="0.9.0">
            Initial <Code>System/Overlay</Code> — a media hover-scrim, <strong>not a portal layer</strong>.
            Absolute-inset scrim from <Code>--ds-scrim</Code> (+ new{" "}
            <Code>--ds-scrim-light</Code> for dark media), <Code>position</Code> slots (fill/bottom/top),{" "}
            <Code>showOn</Code> hover/focus/always/hover-or-focus with opacity + <Code>:focus-within</Code>{" "}
            reveal (keyboard-reachable) and a <Code>(hover: none)</Code> tap-to-toggle.
          </Decision>
        </Flex>
      </Section>
    </Page>
  ),
};
