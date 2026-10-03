import { useState } from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { Box, Code, Flex, Grid, Spinner, Text } from "@radix-ui/themes";
import { Skeleton } from "./Skeleton";
/* The ported SegmentedControl, not the raw Radix one: raw Radix defaults to step 2 and ignores the
   uiSize control lane, so the docs chrome froze at 32px while everything it sits beside moved. */
import { SegmentedControl } from "./SegmentedControl";
import {
  Caption, Decision, DoDont, DODONT_LABEL, HexThemeKey, LiteTokenSpec, MeasuredRow, MeasuredSpec, Mono, Page, PageHeader,
  PropsLead, type PropDef, PropTable, Rule, Section,
} from "./_storyKit";
import { assertMeasuredRows } from "../../foundations/_assert";

/* Skeleton reuses Radix's own skeleton skin (a gray placeholder that breathes between --gray-a3 and
   --gray-a4), so it declares no --ds-* roles of its own.

   This is the ANIMATED case, and it is the one a token table has always fudged. There is no resting
   value to read: the fill is somewhere in the pulse whenever you look, so a single reading lands
   anywhere in the band and means nothing. The old rows papered over it — one printed whatever the fill
   happened to be at that instant, and the two "endpoint" rows just resolved --gray-a3 and --gray-a4 and
   printed them back, which is the row agreeing with itself.

   Measured instead ([[measured-token-rows]]): each endpoint row names a FRAME of the placeholder's own animation. The row
   pauses that animation on the rendered element, reads the fill at that frame, restores the clock, and
   checks the reading against the token it claims. A row with no frame named stays unproven rather than
   printing a number that is true for a few milliseconds.

   Under `prefers-reduced-motion: reduce` the pulse is switched off entirely (the one sanctioned
   !important in the system's component CSS overrides Radix's unconditional animation), so there is no
   animation to take a frame of and the rows say exactly that instead of guessing. */
function SkeletonSpec() {
  return (
    <LiteTokenSpec
      rationale={
        <>
          Skeleton reuses Radix's own skeleton skin and declares no <Mono>--ds-*</Mono> roles of its own —
          the placeholder is a neutral gray whose pulse breathes between two Radix steps,{" "}
          <Mono>--gray-a3</Mono> (the same step <Mono>--ds-fill-weak</Mono> aliases) and{" "}
          <Mono>--gray-a4</Mono>. Each row below pauses a real placeholder's own animation at the named
          frame and reads the fill there, so the band is proved at both ends rather than sampled at a
          random instant. It mirrors whatever it wraps, so it rides no size lane; a childless placeholder
          falls back to <Mono>var(--space-3)</Mono> tall until you give it a width / height.
        </>
      }
    >
      <MeasuredSpec render={() => <Skeleton loading width="60px" height="16px" />}>
        <MeasuredRow
          part="Pulse fill"
          note="At the start of the loop."
          token="--gray-a4"
          select=".rt-Skeleton"
          prop="background-color"
          at={{ label: "frame 0%", percent: 0 }}
        />
        <MeasuredRow
          part="Pulse fill"
          note="At the far end of the loop."
          token="--gray-a3"
          select=".rt-Skeleton"
          prop="background-color"
          at={{ label: "frame 100%", percent: 100 }}
        />
      </MeasuredSpec>
    </LiteTokenSpec>
  );
}

/* ---- specimen: a loading card that MIRRORS the real layout --------------------
   The card chrome (border, padding) stays; only the CONTENT is skeletoned, each piece shaped like what
   will land in it — an avatar circle, a name line, a subtitle, two body lines. The SAME markup renders
   both states via `loading`, so the placeholder is the loaded layout with its skin swapped for gray:
   nothing reflows when the data arrives. The avatar initials ride --on-accent, the guaranteed-contrast
   foreground on --ds-fill-accent (the dotStyle precedent), so the loaded state stays axe-clean. The
   avatar is an inline Radix Box (not a custom wrapper) so it forwards className/style/ref — Radix merges
   the skeleton skin onto it via Slot; a non-forwarding component would drop the skin and render loaded. */
function ContactCard({ loading }: { loading: boolean }) {
  return (
    <Box
      style={{
        width: 320, maxWidth: "100%", padding: 16,
        border: "1px solid var(--ds-stroke-weak)", borderRadius: "var(--ds-radius-4)",
        background: "var(--ds-bg-subtle)",
      }}
    >
      <Flex direction="column" gap="4">
        <Flex align="center" gap="3">
          <Skeleton loading={loading} width="44px" height="44px" style={{ borderRadius: "var(--ds-radius-full)" }}>
            <Box
              style={{
                width: 44, height: 44, borderRadius: "var(--ds-radius-full)", flexShrink: 0,
                background: "var(--ds-fill-accent)", color: "var(--on-accent)",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontFamily: "var(--code-font-family)", fontSize: 14, fontWeight: 700,
              }}
            >
              AL
            </Box>
          </Skeleton>
          <Flex direction="column" gap="1" style={{ minWidth: 0 }}>
            <Skeleton loading={loading}>
              <Text size="3" weight="medium" style={{ color: "var(--ds-text-strong)" }}>Ada Lovelace</Text>
            </Skeleton>
            <Skeleton loading={loading}>
              <Text size="2" style={{ color: "var(--ds-text-weak)" }}>Principal Engineer</Text>
            </Skeleton>
          </Flex>
        </Flex>
        <Flex direction="column" gap="2">
          <Skeleton loading={loading}>
            <Text size="2" style={{ color: "var(--ds-text-strong)", lineHeight: 1.5 }}>
              Wrote the first published algorithm for the analytical engine.
            </Text>
          </Skeleton>
          <Skeleton loading={loading}>
            <Text size="2" style={{ color: "var(--ds-text-strong)", lineHeight: 1.5 }}>
              Notes on machine intelligence, 1843.
            </Text>
          </Skeleton>
        </Flex>
      </Flex>
    </Box>
  );
}

/* Toggle the SAME card between its loading and loaded states so the point reads: the skeleton is the
   loaded shape with its skin swapped for gray. Defaults to Loading so the placeholder is what renders. */
function SpecimenToggle() {
  const [state, setState] = useState<"loading" | "loaded">("loading");
  return (
    <Flex direction="column" gap="3" align="start">
      <SegmentedControl.Root
        value={state}
        onValueChange={(v) => setState((v as "loading" | "loaded") || "loading")}
        aria-label="Toggle the card between loading and loaded"
      >
        <SegmentedControl.Item value="loading">Loading</SegmentedControl.Item>
        <SegmentedControl.Item value="loaded">Loaded</SegmentedControl.Item>
      </SegmentedControl.Root>
      <ContactCard loading={state === "loading"} />
    </Flex>
  );
}

const SKELETON_PROPS: PropDef[] = [
  { name: "loading", type: "boolean", def: "true", desc: <>When <Code>true</Code> (default) renders the gray placeholder sized to its children (or to <Code>width</Code> / <Code>height</Code>); when <Code>false</Code> renders the children unchanged. The same markup drives both states.</>, source: "Radix" },
  { name: "width", type: "string (responsive)", desc: <>Explicit width for a childless placeholder (any CSS length, e.g. <Code>"60%"</Code> or <Code>"120px"</Code>). Pass a <Code>{"{ initial, sm, … }"}</Code> object to vary it per breakpoint.</>, source: "Radix" },
  { name: "height", type: "string (responsive)", desc: <>Explicit height for a childless placeholder. A bare skeleton with no size falls back to <Code>var(--space-3)</Code> tall.</>, source: "Radix" },
  { name: "minWidth / maxWidth / minHeight / maxHeight", type: "string (responsive)", desc: <>Clamp the placeholder's size — all responsive, all passthrough to Radix.</>, source: "Radix" },
  { name: "children", type: "ReactNode", desc: <>The real content the placeholder reserves space for. While <Code>loading</Code> it's hidden and taken out of the a11y tree (<Code>aria-hidden</Code>, <Code>inert</Code>, <Code>tabIndex={-1}</Code>) with the skeleton skin merged onto its box; when loaded it renders unchanged.</>, source: "Radix" },
];

/** The one definition of this component — the standfirst every page of it opens with. */
const DEFINITION = <>A loading placeholder sized to its children, so the gray box is the exact shape that will land — no reflow when the data arrives. Reuses Radix's gray skin; rides no size lane; its pulse is an ambient breathe that goes <Mono>static</Mono> under reduced motion.</>;

const meta: Meta<typeof Skeleton> = {
  title: "Components/Feedback & Status/Skeleton",
  component: Skeleton,
  parameters: {
    controls: { disable: true },
    docs: {
      description: {
        component:
          "**Skeleton** is a loading placeholder that reserves a chunk of layout while its content loads, " +
          "then swaps to that content. It’s a thin wrapper over Radix’s `Skeleton`: `loading` (default " +
          "`true`) renders a gray box **sized to its children**, so the placeholder mirrors the exact shape " +
          "that will land; flip it `false` and the children render unchanged. It reuses Radix’s own gray " +
          "skin (no `--ds-*` roles) and rides **no size lane** — it takes the size of whatever it stands in " +
          "for. The pulse is an **ambient** ~1s breathe; under `prefers-reduced-motion` it holds a static " +
          "fill. A **lite-tier** wrap — one Usage story (a shape-matched specimen · live token spec · a " +
          "do/don’t) plus a Props.",
      },
    },
  },
};
export default meta;
type Story = StoryObj<typeof Skeleton>;

/** Usage — the primary lite docs story: a shape-matched specimen, the live token spec, and one do/don't. */
export const Usage: Story = {
  // The DoDont callout labels (success/error text on the green/red tint) measure ~4.1–4.4 — just under
  // axe's strict 4.5; the callout colour + the DO/DON'T word already carry the meaning, so color-contrast
  // is scoped off here, a documented specimen exception (same pattern as Separator/StatusDot Usage).
  parameters: { a11y: { context: { exclude: [DODONT_LABEL] } } },
  render: (_args, { globals }) => (
    <HexThemeKey.Provider value={`${globals.accent}-${globals.appearance}-${globals.contrast}`}>
      <Page>
        <PageHeader title="Skeleton · Usage" standfirst={DEFINITION} />

        <Section title="Specimen" lead="A card whose content is skeletoned to mirror the real layout — an avatar circle, a name and subtitle, two body lines. Toggle it: the loaded shape and the placeholder are the same box, skin swapped for gray.">
          <Flex direction="column" gap="3" align="start">
            <SpecimenToggle />
            <Caption>The pulse is an ambient ~1s gray breathe; under <Mono>prefers-reduced-motion</Mono> it holds a static fill — the placeholder shape still signals what's loading. While loading, each placeholder is <Mono>aria-hidden</Mono> and inert, so assistive tech reaches the content only once it renders.</Caption>
          </Flex>
        </Section>

        <Rule />

        <Section title="Match the shape of what's coming" lead="A skeleton is worth reaching for only when you know the shape of what's coming. Match it to that shape; otherwise a spinner is the honest signal.">
          <Grid columns={{ initial: "1", sm: "2" }} gap="3">
            <DoDont kind="do" bare note="Shape the skeleton like the content that will load — an avatar circle and text lines. The user reads the layout before the data arrives, and nothing reflows when it does.">
              <Box style={{ width: "100%", padding: 12, border: "1px solid var(--ds-stroke-weak)", borderRadius: "var(--ds-radius-3)", background: "var(--ds-bg-base)" }}>
                <Flex align="center" gap="3">
                  <Skeleton loading width="32px" height="32px" style={{ borderRadius: "var(--ds-radius-full)" }} />
                  <Flex direction="column" gap="2" style={{ flex: 1, minWidth: 0 }}>
                    <Skeleton loading width="70%" height="10px" />
                    <Skeleton loading width="45%" height="10px" />
                  </Flex>
                </Flex>
              </Box>
            </DoDont>
            <DoDont kind="dont" bare note="Don’t drop a spinner where you already know the shape of what’s loading — a shape-matched skeleton tells the user what to expect. Reserve the spinner for a wait of unknown or variable shape.">
              <Flex align="center" justify="center" style={{ height: 84 }}>
                <Spinner size="3" />
              </Flex>
            </DoDont>
          </Grid>
        </Section>

        <Rule />

        <Section title="Tokens" lead="Measured off a rendered placeholder — the drift guard. Skeleton reuses Radix's gray skin and declares no role of its own, so each row pauses the placeholder's own pulse at a named frame and checks the fill there against the gray step it claims.">
          <SkeletonSpec />
        </Section>
      </Page>
    </HexThemeKey.Provider>
  ),
  play: async ({ canvasElement }) => {
    // The token table's EVIDENCE, asserted at runtime ([[measured-token-rows]]). Both rows read a frame of the
    // placeholder's OWN animation. Under `prefers-reduced-motion: reduce` there is no animation to
    // take a frame of, and the rows correctly report that instead of guessing — so the assertion is
    // on the row COUNT plus the evidence integrity, which holds either way.
    const rows = assertMeasuredRows(canvasElement);
    if (rows.measured + rows.unproven !== 2) {
      throw new Error(`expected 2 pulse-endpoint token rows, got ${rows.measured} measured / ${rows.unproven} unproven`);
    }

    // Passive (no driving / no flash): a skeleton has no open/close behaviour, so its default loading
    // state and a11y contract are asserted right here. axe runs automatically on the story.
    const skeletons = canvasElement.querySelectorAll<HTMLElement>(".rt-Skeleton");
    if (skeletons.length === 0) throw new Error("Usage must render skeleton placeholders in the default loading state");

    // While loading, the placeholder is out of the a11y tree (Radix sets aria-hidden + inert) so a screen
    // reader skips the gray box and reaches the real content only once it renders.
    const first = skeletons[0];
    if (first.getAttribute("aria-hidden") !== "true") throw new Error("a loading skeleton must be aria-hidden");
    if (!first.hasAttribute("inert")) throw new Error("a loading skeleton must be inert (non-interactive)");
  },
};

type PropsArgs = {
  loading: boolean;
  width: string;
  height: string;
};

/** Props — the live, args-driven Skeleton. Drive loading, and size a bare placeholder with
 *  width / height; toggle loading off and the real content renders in its place. */
export const Props: StoryObj<PropsArgs> = {
  args: { loading: true, width: "220px", height: "20px" },
  argTypes: {
    loading: { control: "boolean", description: "Show the placeholder (true) or the content (false).", table: { category: "State" } },
    width: { control: "text", description: "Placeholder width (any CSS length).", table: { category: "Layout" } },
    height: { control: "text", description: "Placeholder height (any CSS length).", table: { category: "Layout" } },
  },
  parameters: { controls: { disable: false } },
  render: ({ loading, width, height }: PropsArgs) => (
    <Page maxWidth="none">
      <PageHeader
        title="Skeleton · Props"
        standfirst={<>{DEFINITION} While <strong>loading</strong>, a bare placeholder sized by <strong>width</strong> / <strong>height</strong>; toggle it off and the real content renders in its place.</>}
      />
      <Box style={{ padding: "16px 0 8px" }}>
        <Skeleton loading={loading} width={width} height={height}>
          <Text size="2" style={{ color: "var(--ds-text-strong)" }}>Loaded content appears here.</Text>
        </Skeleton>
      </Box>
      <PropsLead />
      <Rule />
      <Section title="Props reference" lead={<>Every prop <Code>Skeleton</Code> accepts — it re-surfaces Radix's <Code>Skeleton</Code> unchanged, so all props pass straight through.</>}>
        <PropTable rows={SKELETON_PROPS} />
      </Section>
    </Page>
  ),
};

/** History — the rulings this component encodes and a changelog of how it changes over time. */
export const History: Story = {
  render: () => (
    <Page>
      <PageHeader title="Skeleton · History" standfirst={DEFINITION} />
      <Section title="Decisions" lead="The rulings this component encodes.">
        <Flex direction="column" gap="3">
          <Decision id="[[catalog-as-specification]] · Wrapped Radix component">
            Skeleton is a <strong>wrapped</strong> Radix Themes component — the Radix name wins; built on the
            Radix substrate + our <Code>--ds-*</Code> layer, not a hand-rolled placeholder. There is nothing to
            paint or size, so it is re-surfaced as a documented <strong>re-export</strong> (like Grid /
            AspectRatio), not a forwardRef shell that would imply an override it doesn't have.
          </Decision>
          <Decision id="Mirrors children">
            While <Code>loading</Code> the placeholder is <strong>sized to its children</strong> — Radix merges
            the skeleton skin onto the child element and hides it — so the gray box is the exact shape that will
            load and nothing reflows when it arrives. It therefore rides <strong>no size lane</strong>: a
            skeleton has no scale of its own, it takes the size of whatever it stands in for.
          </Decision>
          <Decision id="Gray skin, tokenless">
            It reuses Radix's own skeleton skin — a neutral placeholder whose pulse breathes between{" "}
            <Code>--gray-a3</Code> and <Code>--gray-a4</Code> — so a bare skeleton already matches the system's
            loading look with <strong>no new CSS and no new token</strong>. It declares no <Code>--ds-*</Code>
            roles of its own.
          </Decision>
          <Decision id="Ambient pulse + reduced-motion">
            The pulse is a ~1s gray breathe with no start or end — an <em>ambient</em> loop, so its duration is a
            deliberate literal rather than a value off the intent-named <Code>--ds-duration</Code> ladder (the
            StatusDot precedent). Radix ships the animation unconditionally, so a{" "}
            <Code>prefers-reduced-motion: reduce</Code> guard that holds a <strong>static fill</strong> is
            applied centrally in the system's component CSS — the shape still signals what's loading.
          </Decision>
        </Flex>
      </Section>

      <Rule />

      <Section title="Changelog" lead="Notable changes, newest first — grows as the component evolves.">
        <Flex direction="column" gap="3">
          <Decision id="0.9.0">
            Initial <Code>System/Skeleton</Code> — Radix's Skeleton wrapped as a documented re-export; its gray
            skin reused tokenlessly (no <Code>--ds-*</Code> roles), sized to its children so a placeholder
            mirrors the loaded shape; the ambient pulse noted with its central reduced-motion guard; History
            page added so every component, stubs included, has one.
          </Decision>
        </Flex>
      </Section>
    </Page>
  ),
};
