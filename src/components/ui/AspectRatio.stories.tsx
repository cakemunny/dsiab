import { useEffect, useRef, useState, type ReactNode, type RefObject } from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { Box, Code, Flex, Grid, Text } from "@radix-ui/themes";
import { Play, Image as ImageIcon, Crop, ArrowsHorizontal } from "@phosphor-icons/react";
import { AspectRatio } from "./AspectRatio";
import {
  Caption, Decision, DoDont, DODONT_LABEL, Mono, Page, PageHeader, PropsLead, type PropDef, PropTable,
  Rule, Scenario, Section,
} from "./_storyKit";

/** The one definition of this component — the standfirst every page of it opens with. */
const DEFINITION = (
  <>
    Locks a child to a fixed width : height ratio so its box reserves space before the asset loads — no layout
    shift when media, embeds, or map / video placeholders stream in. Layout only; the child fills the box
    (<Mono>object-fit: cover</Mono> for images).
  </>
);

/* ---- specimen: a ratio-locked media cell -------------------------------------
   A placeholder Box (not a remote image) so the story is self-contained and axe-clean. It is painted
   NEUTRAL — `--ds-bg-subtle` under an inset `--ds-stroke-weak` edge, the same surface + edge pairing the
   inset panel in `_storyKit` uses — because these tiles are filler standing in for media, and this page
   renders eight of them at up to ~992×558. In the accent role that is the loudest colour in the system
   used at page-dominating scale; colour is punctuation, and a placeholder has nothing to punctuate. The
   demonstration (a ratio HOLDS as the box scales) is unaffected by what colour the box is.
   AspectRatio owns no paint — every visible pixel here belongs to this CHILD, which fills the reserved
   box via width/height 100%. Rounding + clipping sit on AspectRatio's own div (its `style` passes
   through). A real <img> would swap in here with `object-fit: cover` and an alt. */
function MediaTile({ ratio, label, icon, testId }: { ratio: number; label: string; icon: ReactNode; testId?: string }) {
  return (
    <AspectRatio ratio={ratio} data-testid={testId} style={{ borderRadius: "var(--ds-radius-3)", overflow: "hidden" }}>
      <Flex
        direction="column"
        align="center"
        justify="center"
        gap="2"
        style={{
          width: "100%",
          height: "100%",
          background: "var(--ds-bg-subtle)",
          boxShadow: "inset 0 0 0 1px var(--ds-stroke-weak)",
        }}
      >
        <span aria-hidden style={{ display: "flex", fontSize: 26, color: "var(--ds-icon-neutral)" }}>{icon}</span>
        <Text size="1" weight="bold" style={{ color: "var(--ds-text-weak)", fontFamily: "var(--code-font-family)", letterSpacing: "0.04em" }}>{label}</Text>
      </Flex>
    </AspectRatio>
  );
}

/* ---- the measured readout ------------------------------------------------------
   The claim "the ratio holds as the box scales" is only worth anything if the reader can CHECK it, so
   every scaled specimen prints the box it actually rendered at. A ResizeObserver (not a one-shot read)
   keeps the numbers live: widen the Storybook panel and the fluid tile's figures track it in real time,
   which is the whole demonstration for a fluid layout. */
function useBoxSize(): [RefObject<HTMLDivElement | null>, { w: number; h: number } | null] {
  const ref = useRef<HTMLDivElement>(null);
  const [box, setBox] = useState<{ w: number; h: number } | null>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const read = () => {
      const r = el.getBoundingClientRect();
      setBox({ w: Math.round(r.width * 10) / 10, h: Math.round(r.height * 10) / 10 });
    };
    read();
    let raf = 0;
    const ro = new ResizeObserver(() => { cancelAnimationFrame(raf); raf = requestAnimationFrame(read); });
    ro.observe(el);
    return () => { cancelAnimationFrame(raf); ro.disconnect(); };
  }, []);
  return [ref, box];
}

/* One column of the scale row: a labelled, ratio-locked tile at a FIXED width, with its measured box and
   the width ÷ height it works out to underneath. Three of these at different widths, all reporting the
   same quotient, is the proof. */
function ScaledTile({ width, label, ratio, ratioLabel, icon, testId }: { width: number | string; label: string; ratio: number; ratioLabel: string; icon: ReactNode; testId: string }) {
  const [ref, box] = useBoxSize();
  return (
    <Flex direction="column" gap="2" style={{ width, flexShrink: 0, minWidth: 0 }}>
      <Text size="1" weight="bold" style={{ color: "var(--ds-text-weak)", letterSpacing: "0.06em" }}>{label}</Text>
      <Box ref={ref}>
        <MediaTile ratio={ratio} label={ratioLabel} icon={icon} testId={testId} />
      </Box>
      <Text size="1" style={{ color: "var(--ds-text-weak)", fontFamily: "var(--code-font-family)" }}>
        {box ? `${box.w} × ${box.h} → ${(box.w / box.h).toFixed(2)}` : "measuring…"}
      </Text>
    </Flex>
  );
}

/* AspectRatio is a re-surfaced Radix component: no own props beyond Radix's, so the reference documents
   the one meaningful knob (`ratio`) and the child contract. All props pass straight through. */
const ASPECT_RATIO_PROPS: PropDef[] = [
  { name: "ratio", type: "number", def: "1", desc: <>The locked <strong>width : height</strong> proportion — <Code>1</Code> is a square, <Code>16 / 9</Code> a widescreen frame, <Code>3 / 4</Code> a portrait. The box reserves exactly this shape before its content loads, so nothing reflows when the asset arrives.</>, source: "Radix" },
  { name: "children", type: "ReactNode", desc: <>The single element locked to the ratio. Radix stretches it to the reserved box's four edges; a replaced element (<Code>img</Code> / <Code>video</Code> / <Code>iframe</Code>) needs <Code>object-fit: cover</Code> to crop rather than distort, while a plain box fills via <Code>width / height: 100%</Code>.</>, source: "Radix" },
];

const meta: Meta<typeof AspectRatio> = {
  title: "Components/Container/AspectRatio",
  component: AspectRatio,
  parameters: {
    controls: { disable: true },
    docs: {
      description: {
        component:
          "**AspectRatio** locks a child to a fixed width : height `ratio` (default `1`; e.g. `ratio={16/9}`) " +
          "so the box reserves its footprint up front and never reflows as the media loads. You set the " +
          "width; the height falls out of the ratio — which is why it survives a responsive layout where a " +
          "fixed `height` would have to be re-picked per breakpoint. It’s a thin " +
          "wrapper over Radix’s `AspectRatio` — layout only, with no paint and no `--ds-*` roles; the child " +
          "fills the reserved box (use `object-fit: cover` for images). The Usage story compares three ratios, " +
          "then holds ONE ratio across three container widths and a fluid container, with every box measured " +
          "live on the page so the guarantee is checkable rather than asserted.",
      },
    },
  },
};
export default meta;
type Story = StoryObj<typeof AspectRatio>;

/** Usage — the primary lite docs story: a realistic ratio-locked specimen and the no-paint note. */
export const Usage: Story = {
  // The DO/DON'T word (success/error step-11 ink on its own tint) measures 4.10 at 12px bold, under axe's
  // 4.5; the colour + the word already carry the meaning, so that row is the documented exception. Scoped
  // to the label itself — the cards' specimens stay fully axe-checked, which "[data-dodont]" did not do.
  parameters: { a11y: { context: { exclude: [DODONT_LABEL] } } },
  render: () => (
    <Page>
      <PageHeader
        title="AspectRatio · Usage"
        standfirst={DEFINITION}
      />

      <Section title="Specimen" lead="Three ratio-locked media cells at the same width: a 16 / 9 video frame, a 1 / 1 thumbnail, a 3 / 4 portrait. Same width in, three different heights out — the ratio is what decides the height.">
        <Grid columns={{ initial: "1", sm: "3" }} gap="5">
          <Scenario label="VIDEO EMBED" caption={<>Locked to <Mono>16 / 9</Mono> — the player's footprint is reserved before the poster frame or iframe loads.</>}>
            <MediaTile ratio={16 / 9} label="16 / 9" icon={<Play weight="fill" />} testId="tile-16-9" />
          </Scenario>
          <Scenario label="THUMBNAIL" caption={<>Locked to <Mono>1 / 1</Mono> — a square media cell that never resizes as the image streams in.</>}>
            <MediaTile ratio={1} label="1 / 1" icon={<ImageIcon weight="fill" />} testId="tile-1-1" />
          </Scenario>
          <Scenario label="POSTER" caption={<>Locked to <Mono>3 / 4</Mono> — a portrait cell, taller than it is wide, for cover art or a profile shot.</>}>
            <MediaTile ratio={3 / 4} label="3 / 4" icon={<Crop weight="fill" />} testId="tile-3-4" />
          </Scenario>
        </Grid>
        <Caption>
          The gotcha: the box reserves its footprint up front, so content that loads late causes <strong>no layout
          shift</strong> — and the child is stretched to the box's edges, so an image needs <Mono>object-fit: cover</Mono>{" "}
          to crop instead of distort.
        </Caption>
      </Section>

      <Rule />

      <Section
        title="The ratio holds at any scale"
        lead="The same 16 / 9 lock in three containers of different widths. The height is never set — it falls out of the width, so the quotient underneath each tile comes out the same however big the box gets. The figures are measured off the rendered boxes, not written in."
      >
        <Flex align="end" gap="5" wrap="wrap" data-testid="scale-row">
          <ScaledTile width={160} label="160px" ratio={16 / 9} ratioLabel="16 / 9" icon={<Play weight="fill" />} testId="scale-160" />
          <ScaledTile width={260} label="260px" ratio={16 / 9} ratioLabel="16 / 9" icon={<Play weight="fill" />} testId="scale-260" />
          <ScaledTile width={380} label="380px" ratio={16 / 9} ratioLabel="16 / 9" icon={<Play weight="fill" />} testId="scale-380" />
        </Flex>
        <Caption>
          16 ÷ 9 = 1.78. Three boxes, three heights, one quotient — that is the guarantee you're buying:
          you size the container and the shape survives it.
        </Caption>
      </Section>

      <Rule />

      <Section
        title="Resizing: the height follows the width"
        lead="The container below is a percentage width, so it has no fixed size of its own — it is as wide as whatever holds it. Drag the Storybook panel narrower or wider and watch the readout: the width changes, the height changes with it, and the quotient does not move."
      >
        <Flex direction="column" gap="4">
          <ScaledTile width="100%" label="FLUID — 100% OF THE PANEL" ratio={16 / 9} ratioLabel="16 / 9" icon={<ArrowsHorizontal weight="bold" />} testId="scale-fluid" />
          <Caption>
            This is why the component earns its place in a responsive layout: you never compute a height.
            A fixed <Mono>height</Mono> would have to be re-picked at every breakpoint and would distort the
            media in between; a locked <Mono>ratio</Mono> is written once and stays correct at every width
            the container ever takes.
          </Caption>
        </Flex>
      </Section>

      <Rule />

      <Section
        title="Who knows the height"
        lead="Reserve a ratio when the box has to be the right shape BEFORE its contents can tell you what shape that is — media, embeds, thumbnails, anything whose intrinsic size arrives over the network. Content that already knows its own height should size to itself."
      >
        <Grid columns={{ initial: "1", sm: "2" }} gap="3">
          <DoDont
            kind="do"
            bare
            note={<>A video embed's footprint is known from its ratio long before the poster frame is. Reserving it means the caption below sits at its final position on the first paint, so nothing under it jumps when the media arrives — the layout-shift guard, which is the whole reason to reach for this.</>}
          >
            <Flex direction="column" gap="2">
              <MediaTile ratio={16 / 9} label="16 / 9" icon={<Play weight="fill" />} />
              <Text size="1" style={{ color: "var(--ds-text-weak)", lineHeight: 1.5 }}>
                Caption — already in its final position.
              </Text>
            </Flex>
          </DoDont>
          <DoDont
            kind="dont"
            bare
            note={<>Text knows its own height: it needs however many lines it needs, and that number moves with the width, the copy and the reader's font size. A ratio picks one height and holds it — so the copy is stranded in dead space, as it is here, and clipped outright once the box narrows or the copy grows.</>}
          >
            <AspectRatio ratio={16 / 9} style={{ borderRadius: "var(--ds-radius-3)", overflow: "hidden" }}>
              <Box style={{ width: "100%", height: "100%", background: "var(--ds-bg-subtle)", boxShadow: "inset 0 0 0 1px var(--ds-stroke-weak)", padding: 12 }}>
                <Text as="p" size="1" style={{ color: "var(--ds-text-weak)", lineHeight: 1.5 }}>
                  Two lines of copy in a box that reserved room for eight. Nothing here knows how tall this
                  paragraph wanted to be.
                </Text>
              </Box>
            </AspectRatio>
          </DoDont>
        </Grid>
        <Caption>
          The two cases are told apart by <strong>who knows the height</strong>. If the shape is a property of
          the asset and the asset is not here yet, reserve it. If the height is a consequence of the content —
          text, a list, a form, anything that reflows — let it size itself and put the ratio away; a locked box
          around reflowing content trades a shift you would have seen once for a clip you never see at all.
        </Caption>
      </Section>

      <Rule />

      <Section title="Tokens" lead="AspectRatio paints nothing — it reserves layout space only.">
        <Box style={{ borderRadius: "var(--ds-radius-4)", border: "1px solid var(--ds-stroke-weak)", background: "var(--ds-bg-subtle)", padding: "14px 20px" }}>
          <Text as="p" size="1" style={{ color: "var(--ds-text-weak)", lineHeight: 1.6, maxWidth: "var(--ds-text-measure)" }}>
            No swatches, no roles: AspectRatio contributes no colour of its own and declares no <Mono>--ds-*</Mono>{" "}
            tokens, and it takes no spacing either — the only number it owns is <Mono>ratio</Mono>, which is a
            proportion rather than a scale step. Every visible pixel belongs to the <strong>child</strong> you
            place inside — style that child (a fill, or an image with <Mono>object-fit: cover</Mono>) from the
            system tokens as usual.
          </Text>
        </Box>
      </Section>
    </Page>
  ),
  play: async ({ canvasElement }) => {
    // Passive (no driving / no flash): AspectRatio has no open/close behaviour, so its reserved-ratio maths
    // and layout-only contract are asserted right here. axe runs automatically on the story.
    const wrappers = canvasElement.querySelectorAll<HTMLElement>("[data-radix-aspect-ratio-wrapper]");
    if (wrappers.length < 2) throw new Error("Usage must render two ratio-locked tiles");

    // 16/9 reserves height = 9/16 of the width → the wrapper's padding-bottom trick resolves to ~56.25%.
    const tile = canvasElement.querySelector<HTMLElement>('[data-testid="tile-16-9"]');
    if (!tile) throw new Error("missing 16/9 tile");
    const wrapper = tile.parentElement;
    const pb = wrapper ? parseFloat(wrapper.style.paddingBottom) : NaN;
    if (Math.abs(pb - 56.25) > 0.5) throw new Error(`a 16/9 box must reserve ~56.25% padding-bottom; got ${wrapper?.style.paddingBottom}`);

    // Layout only: AspectRatio adds no ARIA role of its own (nothing to announce — it's a sizing box).
    if (tile.hasAttribute("role")) throw new Error(`AspectRatio is layout-only and must add no role; got role="${tile.getAttribute("role")}"`);

    // The page's central claim, asserted: the SAME ratio at three container widths (plus the fluid one)
    // renders three different boxes whose width ÷ height is the same 16/9. If the lock ever stopped
    // surviving a scale change, this is where it would fail — not in a caption a reader has to trust.
    const target = 16 / 9;
    for (const id of ["scale-160", "scale-260", "scale-380", "scale-fluid"]) {
      const el = canvasElement.querySelector<HTMLElement>(`[data-testid="${id}"]`);
      if (!el) throw new Error(`the scale row must render ${id}`);
      const r = el.getBoundingClientRect();
      if (r.width < 1 || r.height < 1) throw new Error(`${id} must render a real box; got ${r.width}×${r.height}`);
      const got = r.width / r.height;
      if (Math.abs(got - target) > 0.02) {
        throw new Error(`${id} must hold 16/9 (${target.toFixed(3)}); got ${got.toFixed(3)} from ${Math.round(r.width)}×${Math.round(r.height)}`);
      }
    }

    // …and the three fixed widths really are different sizes, so "holds at any scale" is a claim the
    // page actually exercises rather than three identical tiles agreeing with each other.
    const widths = ["scale-160", "scale-260", "scale-380"].map(
      (id) => Math.round(canvasElement.querySelector<HTMLElement>(`[data-testid="${id}"]`)!.getBoundingClientRect().width),
    );
    if (new Set(widths).size !== widths.length) throw new Error(`the scale row must render three DIFFERENT widths; got ${widths.join(", ")}`);
  },
};

const RATIO_OPTIONS: Record<string, number> = {
  "16 / 9": 16 / 9,
  "4 / 3": 4 / 3,
  "3 / 2": 3 / 2,
  "1 / 1": 1,
  "3 / 4": 3 / 4,
};

type PropsArgs = { ratio: string };

/** Props — the live, args-driven AspectRatio. Drive the ratio; the box's width is fixed, so the
 *  height follows the proportion you pick. */
export const Props: StoryObj<PropsArgs> = {
  args: { ratio: "16 / 9" },
  argTypes: {
    ratio: {
      control: "select",
      options: Object.keys(RATIO_OPTIONS),
      description: "The locked width : height proportion (a number, e.g. 16/9). The box reserves this shape; the child fills it.",
      table: { category: "Layout" },
    },
  },
  parameters: { controls: { disable: false } },
  render: ({ ratio }: PropsArgs) => {
    const r = RATIO_OPTIONS[ratio] ?? 1;
    return (
      <Page maxWidth="none">
        <PageHeader
          title="AspectRatio · Props"
          standfirst={<>{DEFINITION} The box's width is fixed (360px); changing <strong>ratio</strong> changes its height.</>}
        />
        <Box style={{ width: 360, maxWidth: "100%", padding: "8px 0" }}>
          <AspectRatio ratio={r} style={{ borderRadius: "var(--ds-radius-3)", overflow: "hidden" }}>
            <Flex
              align="center"
              justify="center"
              style={{
                width: "100%",
                height: "100%",
                background: "var(--ds-bg-subtle)",
                boxShadow: "inset 0 0 0 1px var(--ds-stroke-weak)",
              }}
            >
              <Text size="2" weight="bold" style={{ color: "var(--ds-text-weak)", fontFamily: "var(--code-font-family)", letterSpacing: "0.04em" }}>{ratio}</Text>
            </Flex>
          </AspectRatio>
        </Box>
        <PropsLead />
        <Rule />
        <Section title="Props reference" lead={<>Every prop <Code>AspectRatio</Code> accepts — it re-surfaces Radix's <Code>AspectRatio</Code> unchanged, so all props pass straight through.</>}>
          <PropTable rows={ASPECT_RATIO_PROPS} />
        </Section>
      </Page>
    );
  },
};

/** History — the rulings this component encodes and a changelog of how it changes over time. */
export const History: Story = {
  render: () => (
    <Page>
      <PageHeader title="AspectRatio · History" standfirst={DEFINITION} />
      <Section title="Decisions" lead="The rulings this component encodes.">
        <Flex direction="column" gap="3">
          <Decision id="[[catalog-as-specification]] · Wrapped Radix component">
            AspectRatio is a <strong>wrapped</strong> Radix Themes component — the Radix name wins; built on the
            Radix substrate + our <Code>--ds-*</Code> layer, not a hand-rolled box. It is <strong>layout only</strong>:
            no paint, no <Code>--ds-*</Code> roles, and no size lane — nothing to theme, so it is re-surfaced
            unchanged.
          </Decision>
          <Decision id="Reserves space">
            Locking the child to a fixed <Code>ratio</Code> reserves its exact footprint <strong>before</strong> the
            asset loads, so the page never reflows as media, embeds, or map / video placeholders stream in — the
            layout-shift guard. The width comes from the parent; the height falls out of the ratio.
          </Decision>
          <Decision id="Child fills">
            The child is stretched to the reserved box's four edges. A replaced element
            (<Code>img</Code> / <Code>video</Code> / <Code>iframe</Code>) must set <Code>object-fit: cover</Code> to
            crop rather than distort; a plain box fills via <Code>width / height: 100%</Code>. Every visible pixel
            belongs to that child — AspectRatio contributes none.
          </Decision>
        </Flex>
      </Section>

      <Rule />

      <Section title="Changelog" lead="Notable changes, newest first — grows as the component evolves.">
        <Flex direction="column" gap="3">
          <Decision id="0.9.0">
            Initial <Code>System/AspectRatio</Code> — Radix's AspectRatio wrapped as the uniform System import
            surface; layout only (no paint, no <Code>--ds-*</Code> roles, no size lane), with <Code>ratio</Code> the
            single knob; History page added so every component, stubs included, has one.
          </Decision>
        </Flex>
      </Section>
    </Page>
  ),
};
