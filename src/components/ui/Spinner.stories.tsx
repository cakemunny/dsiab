import type { Meta, StoryObj } from "@storybook/react-vite";
import { Box, Code, Flex, Grid, Text } from "@radix-ui/themes";
import { Check } from "@phosphor-icons/react";
import { Spinner } from "./Spinner";
import {
  Decision, DoDont, DODONT_LABEL, HexThemeKey, LiteTokenSpec, MeasuredRow, MeasuredSpec, Mono, Muted,
  Page, PageHeader, PropsLead, type PropDef, PropTable, Rule, Section,
} from "./_storyKit";
import { assertMeasuredRows } from "../../foundations/_assert";

/* Spinner reuses Radix's own leaf-ring skin — the eight fading leaves ink from currentColor, so it
   declares no --ds-* roles of its own.

   MEASURED ([[measured-token-rows]]). This page carried the original set-what-you-measure row: it painted a probe and read
   the probe back. Both rows now read a real rendered ring. The ink row is the ANIMATED case — every
   leaf runs a fade, so a bare reading would be true for a few milliseconds and mean nothing; the row
   names a FRAME instead, and the primitive pauses that leaf's own animation there, reads, and restores
   the clock. What the fade moves is opacity, not colour, so the ink is the same at every frame — naming
   one is what makes the reading provable, not what makes it true. Under `prefers-reduced-motion: reduce`
   there is no animation left to take a frame of, and the row says so rather than guessing. */
function SpinnerSpec() {
  return (
    <LiteTokenSpec
      rationale={
        <>
          Spinner reuses Radix's own leaf-ring skin and declares no <Mono>--ds-*</Mono> roles of its own:
          the leaves ink from <Mono>currentColor</Mono>, which means the ring has no colour of its own at
          all — it inherits the text colour role of wherever it sits. In these specimens that inherited
          role is <Mono>--ds-text-strong</Mono> (<Mono>--gray-12</Mono>), and the row below proves it by
          reading the rendered leaf; place a spinner inside a <Mono>--ds-text-weak</Mono> block and it
          inks <Mono>--ds-text-weak</Mono> instead. The whole ring then sits at Radix's{" "}
          <Mono>--spinner-opacity</Mono>.
        </>
      }
    >
      <MeasuredSpec render={() => <Spinner size="2" />}>
        <MeasuredRow
          part="Leaf ink"
          note="currentColor, read off the leaf's painted ::before — the pixel a reader actually sees."
          token="--ds-text-strong"
          select=".rt-SpinnerLeaf"
          prop="background-color"
          pseudo="::before"
          at={{ label: "frame 0%", percent: 0 }}
        />
        <MeasuredRow
          part="Ring opacity"
          note="Radix's own ring token — the whole ring sits under it, leaves and all."
          token="--spinner-opacity"
          select=".rt-Spinner"
          prop="opacity"
        />
      </MeasuredSpec>
    </LiteTokenSpec>
  );
}

/* ---- size catalogue (in-context inline specimens) ------------------------- */
const SIZES: { size: "1" | "2" | "3"; text: "1" | "2" | "3"; label: string }[] = [
  { size: "1", text: "1", label: "Small" },
  { size: "2", text: "2", label: "Medium" },
  { size: "3", text: "3", label: "Large" },
];

const SPINNER_PROPS: PropDef[] = [
  { name: "size", type: `"1" | "2" | "3"`, desc: <>The ring's diameter step. Unset → the <strong>control lane</strong> (small → <Code>1</Code>), so a spinner matches the control/text beside it; an explicit <Code>1</Code>–<Code>3</Code> wins. Radix's own default is <Code>2</Code>.</>, source: "Spinner.tsx" },
  { name: "loading", type: "boolean", def: "true", desc: <>Whether the spinner shows. <Code>true</Code> → the ring; <Code>false</Code> → renders <Code>children</Code> in its place (so a control can swap its spinner for a result without a layout shift).</>, source: "Radix" },
];

/** The component's definition — one source, referenced by the header of every story on this page. */
const DEFINITION = <>An indeterminate loading indicator for a wait of unknown shape. It rides the control size lane and inks from the surrounding text colour. Reach for a <Mono>Skeleton</Mono> instead when the layout is already known.</>;

const meta: Meta<typeof Spinner> = {
  title: "Components/Feedback & Status/Spinner",
  component: Spinner,
  parameters: {
    controls: { disable: true },
    docs: {
      description: {
        component:
          "**Spinner** is an indeterminate loading indicator — a ring of eight fading leaves that cycles " +
          "while work of unknown shape is in flight. It’s a thin wrapper over Radix’s `Spinner`: it rides the " +
          "**control** size lane and reuses Radix’s own skin, so it declares no `--ds-*` roles (the leaves ink " +
          "from `currentColor`, taking the colour of the surrounding text). The cycle is an **ambient loop** — a " +
          "deliberate literal outside the `--ds-duration` ladder, the StatusDot precedent. `loading={false}` " +
          "renders `children` in the spinner’s place. It’s a **lite-tier** wrap — one Usage story " +
          "(specimen · live token spec · a do/don’t) plus a Props.",
      },
    },
  },
};
export default meta;
type Story = StoryObj<typeof Spinner>;

/** Usage — the primary lite docs story: in-context specimens, the live token spec, and one do/don't. */
export const Usage: Story = {
  // The DO/DON'T word (success/error step-11 ink on its own tint) measures 4.10 at 12px bold, under axe's
  // 4.5; the colour + the word already carry the meaning, so that row is the documented exception. Scoped
  // to the label itself — the cards' specimens stay fully axe-checked, which "[data-dodont]" did not do.
  parameters: { a11y: { context: { exclude: [DODONT_LABEL] } } },
  render: (_args, { globals }) => (
    <HexThemeKey.Provider value={`${globals.accent}-${globals.appearance}-${globals.contrast}`}>
      <Page>
        <PageHeader title="Spinner · Usage" standfirst={DEFINITION} />

        <Section title="Specimen" lead={<>A spinner beside a “Loading…” label at the three sizes (the ring tracks the text step), and a size-3 spinner centered in a panel awaiting content. The label carries <Code>role="status"</Code> in every one — the ring itself announces nothing.</>}>
          <Flex direction="column" gap="5">
            <Flex direction="column" gap="3">
              {SIZES.map((r) => (
                <Flex key={r.size} align="center" gap="4">
                  <Box style={{ width: 64 }}><Muted>{r.label}</Muted></Box>
                  <Flex align="center" gap="2">
                    <Spinner size={r.size} data-testid={r.size === "2" ? "spinner-specimen" : undefined} />
                    <Text role="status" size={r.text} style={{ color: "var(--ds-text-weak)" }}>Loading…</Text>
                  </Flex>
                </Flex>
              ))}
            </Flex>

            <Box style={{ maxWidth: 360, minHeight: 128, border: "1px solid var(--ds-stroke-weak)", borderRadius: "var(--ds-radius-4)", background: "var(--ds-bg-subtle)", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Flex direction="column" align="center" gap="2">
                <Spinner size="3" />
                {/* Muted's shape, spelled out because the live region needs a role on the text element. */}
                <Text role="status" size="1" style={{ color: "var(--ds-text-weak)" }}>Fetching projects…</Text>
              </Flex>
            </Box>
          </Flex>
        </Section>

        <Rule />

        <Section title="Announcing the wait" lead="The ring is decoration. Pair it with a live region, every time — that text is the only thing anyone hears.">
          <Flex direction="column" gap="3" style={{ maxWidth: "var(--ds-text-measure)" }}>
            <Text size="2" style={{ color: "var(--ds-text-strong)", lineHeight: 1.6 }}>
              A spinner renders eight leaf spans and nothing else — no role, no name, no busy state. Nothing
              about it reaches assistive tech, so a spinner on its own is a wait that only sighted users know
              is happening. <strong>Always give it an adjacent live region</strong> — the status text beside
              it, marked <Code>role="status"</Code> — and let that carry the message. Every specimen on this
              page does exactly that; copy the pairing, not the ring.
            </Text>
            <Text size="2" style={{ color: "var(--ds-text-strong)", lineHeight: 1.6 }}>
              This is the difference between a spinner and a <Mono>Progress</Mono> bar. Progress is a real
              control — it announces itself as a progress bar and reports its value, so it needs no help.
              A spinner is a picture of waiting, and a picture announces nothing.
            </Text>
          </Flex>
        </Section>

        <Rule />

        <Section title="Reduced motion" lead="An ambient loop, so it follows the same stance as the StatusDot breathe — silenced for users who opt out of motion.">
          <Flex direction="column" gap="2" style={{ maxWidth: "var(--ds-text-measure)" }}>
            <Text size="2" style={{ color: "var(--ds-text-strong)", lineHeight: 1.6 }}>
              Radix ships the leaf-fade without a <Code>prefers-reduced-motion</Code> guard; the system silences
              ambient loops centrally, so under <Code>prefers-reduced-motion: reduce</Code> the leaves settle and
              the spinner reads as a static ring. A static ring says nothing at all on its own — which is the
              same thing the moving ring said to a screen reader — so the live region above is what keeps the
              wait legible in either case. The motion is reinforcement; the text is the message.
            </Text>
          </Flex>
        </Section>

        <Rule />

        <Section title="When the wait has no shape" lead="A spinner suits an indeterminate wait with no knowable shape. Where the layout is already known, a Skeleton previews it and reads faster.">
          <Grid columns={{ initial: "1", sm: "2" }} gap="3">
            <DoDont kind="do" bare note="Use a spinner for an indeterminate wait whose result has no known shape — a submit, a handshake, a background action. There's nothing to preview, so a moving “working” cue is exactly right, and the status text beside it is what announces the wait.">
              <Flex align="center" gap="2">
                <Spinner size="2" />
                <Text role="status" size="2" style={{ color: "var(--ds-text-strong)" }}>Saving changes…</Text>
              </Flex>
            </DoDont>
            <DoDont kind="dont" bare note="Don’t spin over content whose layout you already know — a list, a table, a profile card. A Skeleton mirroring the real shape previews what's loading and reads faster than a lone spinner.">
              <Box style={{ minHeight: 96, border: "1px solid var(--ds-stroke-weak)", borderRadius: "var(--ds-radius-3)", background: "var(--ds-bg-base)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <Spinner size="3" />
              </Box>
            </DoDont>
          </Grid>
        </Section>

        <Rule />

        <Section title="Tokens" lead="Read off a rendered ring and checked against the token each row names. Spinner reuses Radix's skin and has no colour of its own: its leaves ink from the surrounding text colour, so the ink row reads the painted leaf at a named frame of its fade and checks the role that inheritance lands on.">
          <SpinnerSpec />
        </Section>
      </Page>
    </HexThemeKey.Provider>
  ),
  play: async ({ canvasElement }) => {
    // Passive (no driving / no flash / no animation reliance): a spinner has no open/close behaviour, so its
    // render contract is asserted right here. axe runs automatically on the story.
    const el = canvasElement.querySelector<HTMLElement>('[data-testid="spinner-specimen"]');
    if (!el) throw new Error("Usage must render the spinner specimen");
    // loading defaults true → the ring renders (not children).
    if (!el.classList.contains("rt-Spinner")) throw new Error(`the specimen must be the Radix spinner root; got ${el.className}`);
    const leaves = el.querySelectorAll(".rt-SpinnerLeaf");
    if (leaves.length !== 8) throw new Error(`the ring must render 8 leaves; got ${leaves.length}`);

    // The token table's EVIDENCE, asserted at runtime ([[measured-token-rows]]). The ink row names a frame of the leaf's
    // own fade, so it reads a value that is provable rather than one true for a few milliseconds.
    const rows = assertMeasuredRows(canvasElement);
    if (rows.measured !== 2 || rows.unproven !== 0) {
      throw new Error(`expected 2 measured / 0 unproven token rows, got ${rows.measured} / ${rows.unproven}`);
    }
  },
};

type PropsArgs = {
  size: "auto" | "1" | "2" | "3";
  loading: boolean;
};

/** Props — the live, args-driven Spinner. Drive the size step and toggle loading (false swaps in children). */
export const Props: StoryObj<PropsArgs> = {
  args: { size: "auto", loading: true },
  argTypes: {
    size: { control: "inline-radio", options: ["auto", "1", "2", "3"], description: '"auto" tracks the global uiSize toolbar (unset → the control lane); a step pins the diameter.', table: { category: "Size" } },
    loading: { control: "boolean", description: "true → the ring; false → renders children in its place.", table: { category: "State" } },
  },
  parameters: { controls: { disable: false } },
  render: ({ size, loading }: PropsArgs) => (
    <Page maxWidth="none">
      <PageHeader title="Spinner · Props" standfirst={<>{DEFINITION} Toggle <Code>loading</Code> off to see the children (a check) swap in.</>} />
      <Flex align="center" gap="2" style={{ padding: "var(--ds-space-8) 0 var(--ds-space-2)" }}>
        <Spinner size={size === "auto" ? undefined : size} loading={loading}><Check weight="bold" color="var(--ds-text-success)" /></Spinner>
        <Text size="2" style={{ color: "var(--ds-text-weak)" }}>{loading ? "Working…" : "Done"}</Text>
      </Flex>
      <PropsLead />
      <Rule />
      <Section title="Props reference" lead={<>Every prop <Code>Spinner</Code> takes — <Code>size</Code> rides the control lane, the rest pass through to Radix's <Code>Spinner</Code>.</>}>
        <PropTable rows={SPINNER_PROPS} />
      </Section>
    </Page>
  ),
};

/** History — the rulings this component encodes and a changelog of how it changes over time. */
export const History: Story = {
  render: () => (
    <Page>
      <PageHeader title="Spinner · History" standfirst={DEFINITION} />

      <Section title="Decisions" lead="The rulings this component encodes.">
        <Flex direction="column" gap="3">
          <Decision id="[[catalog-as-specification]] · Wrapped Radix component">
            Spinner is a <strong>wrapped</strong> Radix Themes component — the Radix name wins; built on the
            Radix substrate + our <Code>--ds-*</Code> layer, not a hand-rolled indicator. Button's own{" "}
            <Code>loading</Code> prop already renders this same Radix spinner, so there is one skin, no fork.
          </Decision>
          <Decision id="Control lane">
            An unset <Code>size</Code> follows the global size tier on the <strong>control lane</strong> (small →{" "}
            <Code>1</Code>), so a spinner renders at the same step as the button or text it sits beside. An
            explicit <Code>1</Code>–<Code>3</Code> wins.
          </Decision>
          <Decision id="Ambient loop">
            The eight-leaf fade is an <em>ambient</em> loop, so its cadence is a <strong>literal</strong> baked
            into Radix's skin rather than a value off the intent-named <Code>--ds-duration</Code> ladder — the
            same stance as the StatusDot breathe. The wrap therefore adds{" "}
            <strong>no motion CSS and no <Code>--ds-*</Code> roles</strong>; the leaves ink from{" "}
            <Code>currentColor</Code>.
          </Decision>
          <Decision id="Reduced motion">
            Radix Themes ships the leaf-fade with <strong>no <Code>prefers-reduced-motion</Code> guard</strong>,
            so the cycle does not stop on its own. Matching the StatusDot ambient-loop stance, the system silences
            it <strong>centrally</strong> — under <Code>prefers-reduced-motion: reduce</Code> the leaves settle and
            the spinner reads as a static ring. What keeps the wait legible then is the same thing that keeps it
            legible for a screen reader: the status text beside it.
          </Decision>
          <Decision id="The ring is decoration — the text is the announcement">
            The rendered spinner is a <Code>span</Code> of eight leaf spans with <strong>no role, no accessible
            name, no busy state</strong> — it contributes nothing to the accessibility tree, and this wrap does
            not add any. So a spinner is <strong>never</strong> the whole message: it must sit beside a status
            text marked <Code>role="status"</Code>, and that live region is what tells anyone not watching the
            pixels that a wait is in progress. Contrast <Mono>Progress</Mono>, which is a real control and
            announces its own role and value. The specimens on the Usage page model the required pairing.
            <em> Not yet enforced by the component</em> — putting the live region inside the wrap would mean
            every spinner on a page announcing itself, including decorative ones inside a Button's loading
            state, so the contract sits with the caller until that is designed.
          </Decision>
        </Flex>
      </Section>

      <Rule />

      <Section title="Changelog" lead="Notable changes, newest first — grows as the component evolves.">
        <Flex direction="column" gap="3">
          <Decision id="0.9.0">
            Initial <Code>System/Spinner</Code> — Radix Spinner wrapped on the control size lane, its leaf-ring
            skin reused tokenlessly (inks from <Code>currentColor</Code>); the ambient cycle documented as a
            deliberate literal with a central reduced-motion stance; History page added so every component,
            stubs included, has one.
          </Decision>
        </Flex>
      </Section>
    </Page>
  ),
};
