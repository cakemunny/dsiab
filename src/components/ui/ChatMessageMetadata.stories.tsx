import type { Meta, StoryObj } from "@storybook/react-vite";
import { Box, Code, Flex, Grid, Text } from "@radix-ui/themes";
import { Link } from "./Link";
import { Timestamp } from "./Timestamp";
import { ChatMessage } from "./ChatMessage";
import { ChatMessageMetadata, type ChatMessageStatus } from "./ChatMessageMetadata";
import {
  Caption, Decision, HexThemeKey, MeasuredRow, MeasuredSpec, Mono, Page, PageHeader, PropsLead, type PropDef,
  PropTable, Rule, Scenario, Section,
} from "./_storyKit";
import { awaitMeasuredRows } from "../../foundations/_assert";

/** The one definition of this component — the standfirst every page of it opens with. */
const DEFINITION = (
  <>
    The small print under a message: when it was sent, what happened to it, and anything the product hangs
    beside those. Put it in <Mono>ChatMessage</Mono>'s <Mono>metadata</Mono> slot and it inherits the
    message's side and its left edge.
  </>
);

/* The small print under a message. Every specimen is shown WHERE IT LIVES — under a real message,
   on the side it belongs to — because the row's direction and its left edge are both inherited from
   the message above it, and a row floating on its own hides both. */

/* ---- fixtures ------------------------------------------------------------- */

/** The way out of a failed send, in the row's own small print ([[container-size-seeding]]): a `Link` wrapped around a real
 *  `<button>`. The row is one line of text, so an action in it is text — a boxed control beside
 *  "Failed" reads as a second scale in a line that has only one, and it stretches the line to the
 *  control's height. */
function RetryAction() {
  return (
    <Link asChild>
      <button type="button" onClick={() => {}}>Retry</button>
    </Link>
  );
}

const STATES: [ChatMessageStatus, string][] = [
  ["sending", "Handed to the network, no acknowledgement yet. The glyph breathes while it waits; the word holds still."],
  ["sent", "The service has it. One tick."],
  ["delivered", "It reached the other end. Two ticks — and the word, because two ticks alone cannot say which of the next two states this is."],
  ["read", "Somebody opened it. The same two ticks; the WORD is what tells it apart from delivered."],
  ["error", "It did not go. The error role, a heavier weight, and the word “Failed” — three signals, none of them load-bearing on its own."],
];

/* ---- token spec -----------------------------------------------------------
   Two rows in one fixture: a settled one carrying a timestamp, a footer and a delivered status (so
   the separator and the neutral glyph are both readable), and a failed one for the error paints. */

function MetadataSpec() {
  return (
    <MeasuredSpec
      render={() => (
        <Box style={{ width: 420 }}>
          <ChatMessageMetadata sender="assistant" timestamp="2:31 PM" footer="Answered in 4.2s" status="delivered" />
          <ChatMessageMetadata sender="assistant" status="error" />
        </Box>
      )}
    >
      <MeasuredRow
        part="Row text"
        note="Everything in the row by default — a tier below the message it sits under."
        token="--ds-text-weak"
        select=".rt-ds-chat-meta"
        prop="color"
      />
      <MeasuredRow
        part="Row weight"
        note="Base weight. The row is quieted by colour, not by a smaller type step."
        token="--ds-font-weight-base"
        select=".rt-ds-chat-meta"
        prop="font-weight"
      />
      <MeasuredRow
        part="Separator"
        note="The dot between two facts. Dimmer than either of them, and out of the accessibility tree."
        token="--ds-text-disabled"
        select=".rt-ds-chat-meta-sep"
        prop="color"
      />
      <MeasuredRow
        part="Status glyph"
        note="The tick, the clock, the double tick — the second signal beside the word."
        token="--ds-icon-neutral"
        select='.rt-ds-chat-meta-status[data-status="delivered"] .rt-ds-chat-meta-glyph'
        prop="color"
      />
      <MeasuredRow
        part="Failed text"
        note="The one state that breaks out of the row's uniform grey."
        token="--ds-text-error"
        select='.rt-ds-chat-meta-status[data-status="error"]'
        prop="color"
      />
      <MeasuredRow
        part="Failed glyph"
        note="Its glyph takes the matching icon role, so the pair reads as one thing."
        token="--ds-icon-error"
        select='.rt-ds-chat-meta-status[data-status="error"] .rt-ds-chat-meta-glyph'
        prop="color"
      />
    </MeasuredSpec>
  );
}
const SPEC_ROWS = 6;

/* ---- props ---------------------------------------------------------------- */

const PROPS: PropDef[] = [
  { name: "timestamp", type: "ReactNode", desc: <>When the message was sent. <Code>Timestamp</Code> belongs here — it renders a real <Code>&lt;time&gt;</Code>, so the moment is machine-readable, and it can format relatively and keep itself current. A plain string works too: the slot itself sets tabular figures, so a column of times lines up down the transcript either way.</>, source: "ChatMessageMetadata.tsx" },
  { name: "footer", type: "ReactNode", desc: <>Anything else the product hangs off the row: which model answered, a reaction, a rating — and <strong>the Retry action beside a failed send</strong>. Retrying is the product's decision, not this row's. Whatever goes here is rendered at <strong>the row's own type step</strong>, so an action belongs in text — a <Code>Link</Code> around a <Code>&lt;button&gt;</Code> — rather than as a boxed control, which brings a second height into a line of small print.</>, source: "ChatMessageMetadata.tsx" },
  { name: "status", type: `"sending" | "sent" | "delivered" | "read" | "error"`, desc: <>Delivery state. Each one renders a glyph <strong>and its word</strong>; <Code>error</Code> reads “Failed” in the error role.</>, source: "ChatMessageMetadata.tsx" },
  { name: "sender", type: `"user" | "assistant" | "system"`, def: "from the message", desc: <>Which way the row runs. Unset it follows the enclosing <Code>ChatMessage</Code>, so the user's own small print runs right-to-left under their right-aligned message. Set it only when using the row on its own.</>, source: "ChatMessageMetadata.tsx" },
  { name: "className", type: "string", desc: <>Merged onto the root element.</>, source: "ChatMessageMetadata.tsx" },
  { name: "style", type: "CSSProperties", desc: <>Inline styles on the root element.</>, source: "ChatMessageMetadata.tsx" },
];

/* ========================================================================== */

const meta: Meta<typeof ChatMessageMetadata> = {
  title: "Components/Chat/ChatMessageMetadata",
  component: ChatMessageMetadata,
  parameters: {
    controls: { disable: true },
    docs: {
      description: {
        component:
          "**ChatMessageMetadata** is the small print under a message — when it was sent, what " +
          "happened to it, and anything the product wants beside those. Three slots joined by a middle " +
          "dot that only appears BETWEEN two present slots, so the row never trails a stray separator; " +
          "with nothing to show it renders nothing at all. Every delivery state ships its word as well " +
          "as its glyph, because two of them share a glyph and none of them may rest on colour.",
      },
    },
  },
};
export default meta;
type Story = StoryObj<typeof ChatMessageMetadata>;

/** Usage — the single content story: where the row lives, the five states, the tokens, the usage. */
export const Usage: Story = {
  render: (_args, { globals }) => (
    <HexThemeKey.Provider value={`${globals.accent}-${globals.appearance}-${globals.contrast}`}>
      <Page>
        <PageHeader
          title="ChatMessageMetadata · Usage"
          standfirst={DEFINITION}
        />

        <Section
          title="Where it lives"
          lead="Under the body, lined up with the body's own left edge — inside a tinted bubble that means taking the bubble's inset, and under plain text it means no inset at all. The row also runs the other way for the person typing, so their timestamp sits under the outside edge of their own message."
        >
          <Flex direction="column" gap="4" style={{ maxWidth: 560 }}>
            <ChatMessage
              sender="user"
              metadata={
                <ChatMessageMetadata
                  timestamp={<Timestamp value="2026-07-29T14:29:00Z" format="time" />}
                  status="read"
                />
              }
            >
              Switch the brand accent to teal, but check the contrast first.
            </ChatMessage>
            <ChatMessage
              sender="assistant"
              name="Assistant"
              metadata={
                <ChatMessageMetadata
                  timestamp={<Timestamp value="2026-07-29T14:31:00Z" format="time" />}
                  footer="Answered in 4.2s"
                />
              }
            >
              Measured across every accent — the body copy and this line both clear the floor.
            </ChatMessage>
          </Flex>
          <Caption>
            Reach for <Code>Timestamp</Code> in the timestamp slot rather than a formatted string: it is
            a real <Code>&lt;time&gt;</Code>, so the moment is machine-readable, and it can render
            relatively and keep itself current. Figures are not the reason — the slot declares tabular
            figures, so a plain string gets them too, and either way a column of times down a transcript
            lines up instead of shuffling a pixel each time a digit changes.
          </Caption>
        </Section>

        <Rule />

        <Section
          title="The five states"
          lead="Each one is a glyph AND a word. Two of them share the same glyph on purpose — there is no third tick to invent — so the word is doing the distinguishing, not the picture and never the colour."
        >
          <Grid columns={{ initial: "1", sm: "2" }} gap="4">
            {STATES.map(([status, caption]) => (
              <Scenario key={status} label={status.toUpperCase()} caption={caption}>
                <ChatMessageMetadata sender="assistant" timestamp="2:31 PM" status={status} />
              </Scenario>
            ))}
          </Grid>
          <Caption>
            <Code>sending</Code> breathes — a slow opacity loop that reads as “in flight”. It runs on
            the GLYPH alone: dimming the word with it would drop the label below AA for half of every
            cycle. It is switched off entirely under <Mono>prefers-reduced-motion: reduce</Mono>; the
            word is what carries the state either way.
          </Caption>
        </Section>

        <Rule />

        <Section
          title="A failed send needs a way out"
          lead="A send that failed is reported here, on the message that failed, and nowhere else: a line under the composer is about the draft still in the box and cannot say which message it means. So the error state goes on the message and the Retry goes in this row's footer slot — beside the word, in the same line of small print, where the reader is already looking. The row's job is to report; acting on the report is the product's, and a state with no remedy leaves retyping the message as the only move left."
        >
          <Grid columns={{ initial: "1", sm: "2" }} gap="4">
            <Scenario
              label="A WAY OUT"
              caption={<>“Failed” beside a Retry the reader can press — two pieces of text at one size, in a row that stays one line tall. The state and the remedy arrive together, and the send is one click from happening.</>}
            >
              <Box style={{ width: "100%" }}>
                <ChatMessage sender="user" metadata={
                  <ChatMessageMetadata
                    status="error"
                    footer={<RetryAction />}
                  />
                }>
                  Check the contrast first.
                </ChatMessage>
              </Box>
            </Scenario>
            <Scenario
              label="A DEAD END"
              caption={<>“Failed” on its own. The reader is told something went wrong and given nowhere to go with it — this is the shape to avoid whenever the product can retry at all.</>}
            >
              <Box style={{ width: "100%" }}>
                <ChatMessage sender="user" metadata={<ChatMessageMetadata status="error" />}>
                  Check the contrast first.
                </ChatMessage>
              </Box>
            </Scenario>
          </Grid>
          <Caption>
            One more habit worth keeping: leave <Code>sender</Code> unset inside a{" "}
            <Code>ChatMessage</Code>. The row reads the message it sits in, so setting it by hand is
            a second copy of a fact that is already there — and it is the copy that goes stale.
          </Caption>
        </Section>

        <Rule />

        <Section
          title="Tokens"
          lead="Every row below is read off a rendered metadata row — one settled, one failed — and checked against the token it names, so the table reports what the component paints rather than what the tokens say. Zero net-new tokens."
        >
          <MetadataSpec />
          <Caption>
            The glyph and the text of a failed send take the matching <Mono>--ds-*-error</Mono> pair,
            which follows a brand's collision shift rather than pinning one red.
          </Caption>
        </Section>
      </Page>
    </HexThemeKey.Provider>
  ),
  play: async ({ canvasElement }) => {
    // The token table's EVIDENCE, asserted at runtime — each row read a REAL rendered part of a real
    // metadata row (the text, its weight, the separator, both glyph roles, the failed text), never a
    // probe this story painted. `rows: N` is the exact form: the fixture mounts asynchronously, so an
    // "at least one" floor would be satisfied by a table that had not filled in yet.
    const rows = await awaitMeasuredRows(canvasElement, { rows: SPEC_ROWS });
    if (rows.measured !== SPEC_ROWS || rows.unproven !== 0) {
      throw new Error(`expected ${SPEC_ROWS} measured / 0 unproven token rows, got ${rows.measured} / ${rows.unproven}`);
    }
  },
};

/* ---- Props ----------------------------------------------------------- */

type PropsArgs = {
  timestamp: string;
  footer: string;
  status: "none" | ChatMessageStatus;
  sender: "user" | "assistant" | "system";
  inMessage: boolean;
};

/** Props — the live, args-driven row. Every capability is a control. */
export const Props: StoryObj<PropsArgs> = {
  args: {
    timestamp: "2:31 PM",
    footer: "Answered in 4.2s",
    status: "delivered",
    sender: "assistant",
    inMessage: true,
  },
  argTypes: {
    timestamp: { control: "text", description: "When the message was sent. Empty hides the slot — and with it the separator that would have followed it.", table: { category: "Slots" } },
    footer: { control: "text", description: "Anything else beside the timestamp — the model that answered, a rating, a Retry. Empty hides the slot.", table: { category: "Slots" } },
    status: { control: "inline-radio", options: ["none", "sending", "sent", "delivered", "read", "error"], description: "Delivery state. Each one renders a glyph and its word. Set all three slots to empty to see the row render nothing at all.", table: { category: "Slots" } },
    sender: { control: "inline-radio", options: ["user", "assistant", "system"], description: "Which way the row runs. Inside a message this is inherited — the control is here to show the standalone case.", table: { category: "Direction" } },
    inMessage: { control: "boolean", description: "Show the row under a real message, or on its own.", table: { category: "Direction" } },
  },
  parameters: { controls: { disable: false } },
  render: (args: PropsArgs) => {
    const { timestamp, footer, status, sender, inMessage } = args;
    const row = (
      <ChatMessageMetadata
        sender={sender}
        timestamp={timestamp || undefined}
        footer={footer || undefined}
        status={status === "none" ? undefined : status}
      />
    );
    return (
      <Page maxWidth="none">
        <PageHeader title="ChatMessageMetadata · Props" standfirst={DEFINITION} />
        <Box style={{ padding: "16px 0 8px", maxWidth: 560 }}>
          {inMessage ? (
            <ChatMessage sender={sender} metadata={row}>
              Switch the brand accent to teal, but check the contrast first.
            </ChatMessage>
          ) : (
            row
          )}
        </Box>
        <PropsLead />
        <Rule />
        <Section title="Props reference" lead={<>Every prop <Code>ChatMessageMetadata</Code> accepts. All three content slots are optional, and with none of them present the component renders nothing.</>}>
          <PropTable rows={PROPS} />
        </Section>
        <Section title="What goes in the slots" lead={<>Two of the three take content rather than a value.</>}>
          <Text as="p" size="2" style={{ color: "var(--ds-text-weak)", lineHeight: 1.6 }}>
            <Code>Timestamp</Code> is the right thing for the timestamp slot — a real{" "}
            <Code>&lt;time&gt;</Code> element, and a live-updating relative format if the product wants
            one. Tabular figures are not what separates it: the slot declares them, so a plain string
            holds its width in the column too. The footer slot is free-form — a model name, a rating, a Retry — but it is small print: its content takes the row's own type step, and an action in it is a link-styled button rather than a boxed one.
          </Text>
        </Section>
      </Page>
    );
  },
};

/** History — the rulings this component encodes and a changelog of how it changes over time. */
export const History: Story = {
  render: () => (
    <Page>
      <PageHeader title="ChatMessageMetadata · History" standfirst={DEFINITION} />
      <Section title="Decisions" lead="The rulings this component encodes.">
        <Flex direction="column" gap="3">
          <Decision id="[[delivery-status]] · Every state ships its word">
            <Code>delivered</Code> and <Code>read</Code> share one glyph — a double tick — and there is
            no second tick to spend. So the <strong>label</strong> is what tells them apart, and it is
            always visible. Hiding the difference in a hover tooltip puts it out of reach of touch and
            of most assistive technology at once; leaving it to colour puts it out of reach of everyone
            else.
          </Decision>
          <Decision id="[[delivery-status]] · The visible label is the accessible name">
            No second name is bolted onto the status. What the row says and what a screen reader says
            are the same words — a hidden label that disagrees with the visible one is two facts to
            keep in sync and one of them will drift.
          </Decision>
          <Decision id="[[delivery-status]] · A failed send is a real state, and the retry is yours">
            <Code>error</Code> reads <strong>“Failed”</strong> in the error text role at a heavier
            weight. The <Code>footer</Code> slot is where the <strong>Retry</strong> action goes —
            this row reports what happened; deciding what to do about it belongs to whatever owns
            sending.
          </Decision>
          <Decision id="[[container-size-seeding]] · The footer is TEXT, at the row's own step">
            This row is one line of small print, so whatever goes in the footer reads at{" "}
            <strong>the row's size</strong> — the slot forces its own type step onto its content, so a
            control that arrives pinned to another one cannot put two scales in one line. An{" "}
            <strong>action</strong> here is text as well: a <Code>Link</Code> wrapped around a real{" "}
            <Code>&lt;button&gt;</Code>, underlined and pressable. A boxed control beside “Failed”
            brings its own height and stretches a 16px line to 24.
          </Decision>
          <Decision id="[[delivery-status]] · Separators appear only between two facts">
            The middle dot is emitted <strong>between</strong> present slots, never around them, so a
            row with only a timestamp is a timestamp — not <em>“· 2:31 PM ·”</em>. With every slot
            empty the component renders <strong>nothing</strong>, rather than an empty row that still
            takes up its line.
          </Decision>
          <Decision id="[[chat-density]] · Secondary by weight and colour, never by size">
            The row is one tier below the message above it and carries that with{" "}
            <Mono>--ds-text-weak</Mono> at base weight, at the <strong>same type step</strong> as the
            body. The text lane floors at 12px, so a smaller step would render at exactly the same size
            and buy nothing but a broken ladder.
          </Decision>
        </Flex>
      </Section>

      <Rule />

      <Section title="Changelog" lead="Notable changes, newest first — grows as the component evolves.">
        <Flex direction="column" gap="3">
          <Decision id="0.9.0 · the footer reads at the row's step">
            The footer slot now carries the row's own type step onto its content, and the documented
            treatment for an action in it is a link-styled button rather than a boxed one: “Failed ·
            Retry” is two pieces of text in one line, at one size, in a row that stays one line tall.
          </Decision>
          <Decision id="0.9.0">
            Initial <Code>System/Chat/ChatMessageMetadata</Code> — the five delivery states, each with
            a visible word; conditional separators; the failed state and its consumer-owned retry; the
            sending glyph's breathe, silenced under reduced motion.
          </Decision>
        </Flex>
      </Section>
    </Page>
  ),
};
