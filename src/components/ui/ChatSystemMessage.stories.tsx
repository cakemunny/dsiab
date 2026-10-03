import type { Meta, StoryObj } from "@storybook/react-vite";
import { Box, Code, Flex, Grid, Text } from "@radix-ui/themes";
import { ArrowsClockwise, Info, Sparkle, UserPlus } from "@phosphor-icons/react";
import { Avatar } from "./Avatar";
import { Callout } from "./Callout";
import { ChatMessage } from "./ChatMessage";
import { ChatMessageList } from "./ChatMessageList";
import { ChatSystemMessage, type ChatSystemMessageVariant } from "./ChatSystemMessage";
import { ComparisonSection, MESSAGING_COMPARISON } from "./_comparisons";
import {
  Caption, Decision, DoDont, DODONT_LABEL, HexThemeKey, MeasuredRow, MeasuredSpec, Mono, Page, PageHeader,
  PropsLead, type PropDef, PropTable, Rule, Scenario, Section,
} from "./_storyKit";
import { awaitMeasuredRows } from "../../foundations/_assert";

/** The one definition of this component — the standfirst every page of it opens with. */
const DEFINITION = (
  <>
    A line the conversation says about itself — what just changed, who joined, which day this is. Put it
    between turns in a <Mono>ChatMessageList</Mono>: centred, quiet, and made of nothing but type.
  </>
);

/* A system line is only ever read BETWEEN messages, so every specimen below shows it where it lives:
   in a transcript, with turns above and below it. On its own it is just a grey sentence. */

/* ---- fixtures ------------------------------------------------------------- */

const ASSISTANT_AVATAR = <Avatar radius="medium" fallback={<Sparkle weight="fill" />} />;

/** The long one. It exists to prove the wrap, so it has to actually be long. */
const LONG_NOTICE =
  "This conversation was moved to the archived workspace on 29 July, so replies here no longer " +
  "notify the original participants and the thread is read-only for everyone outside the team.";

/* ---- token spec -----------------------------------------------------------
   One fixture carries every row: a notice with an icon, and a divider beside it so the rule is
   readable off the same spec. */

function SystemMessageSpec() {
  return (
    <MeasuredSpec
      render={() => (
        <Box style={{ width: 460 }}>
          <ChatSystemMessage icon={<Info weight="fill" />}>Theme preview started.</ChatSystemMessage>
          <ChatSystemMessage variant="divider">Today</ChatSystemMessage>
        </Box>
      )}
    >
      <MeasuredRow
        part="Notice text"
        note="The line itself. A tier below the messages around it, and quiet by design."
        token="--ds-text-weak"
        select=".rt-ds-chat-system"
        prop="color"
      />
      <MeasuredRow
        part="Notice weight"
        note="Base weight, at the same type step as a message body — the lane already floors here."
        token="--ds-font-weight-base"
        select=".rt-ds-chat-system"
        prop="font-weight"
      />
      <MeasuredRow
        part="Line inset"
        note="The breathing room above and below, so a notice separates the turns it sits between."
        token="--ds-space-4"
        select=".rt-ds-chat-system"
        prop="padding-block-start"
      />
      <MeasuredRow
        part="Icon colour"
        note="The optional glyph before the text — the neutral role, because it is not a severity."
        token="--ds-icon-neutral"
        select=".rt-ds-chat-system-icon"
        prop="color"
      />
      <MeasuredRow
        part="Icon gap"
        note="The space between the glyph and the first word."
        token="--ds-space-8"
        select=".rt-ds-chat-system-content"
        prop="column-gap"
      />
      <MeasuredRow
        part="Divider rule"
        note="The rule running out to each side of a date break — the system Separator, drawn once."
        token="--ds-stroke-weak"
        select=".rt-ds-chat-system-rule"
        prop="background-color"
      />
    </MeasuredSpec>
  );
}
const SPEC_ROWS = 6;

/* ---- props ---------------------------------------------------------------- */

const PROPS: PropDef[] = [
  { name: "children", type: "ReactNode", desc: <>What the conversation is saying about itself. Write a full sentence when it needs one — the line wraps.</>, source: "ChatSystemMessage.tsx" },
  { name: "variant", type: `"default" | "divider"`, def: `"default"`, desc: <><Code>default</Code> is a centred line. <Code>divider</Code> runs a rule out to each side of it, for a date break or the start of a session.</>, source: "ChatSystemMessage.tsx" },
  { name: "icon", type: "ReactNode", desc: <>An optional glyph before the text. Decorative — the words carry the meaning, so it is hidden from assistive technology and never the only signal.</>, source: "ChatSystemMessage.tsx" },
  { name: "className", type: "string", desc: <>Merged onto the root element.</>, source: "ChatSystemMessage.tsx" },
  { name: "style", type: "CSSProperties", desc: <>Inline styles on the root element.</>, source: "ChatSystemMessage.tsx" },
];

/* ========================================================================== */

const meta: Meta<typeof ChatSystemMessage> = {
  title: "Components/Chat/ChatSystemMessage",
  component: ChatSystemMessage,
  parameters: {
    controls: { disable: true },
    docs: {
      description: {
        component:
          "**ChatSystemMessage** is a line the conversation says about itself — “Theme updated”, " +
          "“Dana joined”, “Today”. Not a turn: no sender, no avatar, no bubble, no side. It is a " +
          "centred sentence in the quiet text role, and a `divider` variant runs a rule out to each " +
          "side of it for a date break. It is deliberately **not** a Callout — no surface, no tint, " +
          "no severity — because a footnote in a transcript that looks like a warning is a lie.",
      },
    },
  },
};
export default meta;
type Story = StoryObj<typeof ChatSystemMessage>;

/** Usage — where it lives, the two variants, the wrap, the announcement rule, and the tokens. */
export const Usage: Story = {
  parameters: { a11y: { context: { exclude: [DODONT_LABEL] } } },
  render: (_args, { globals }) => (
    <HexThemeKey.Provider value={`${globals.accent}-${globals.appearance}-${globals.contrast}`}>
      <Page>
        <PageHeader
          title="ChatSystemMessage · Usage"
          standfirst={DEFINITION}
        />

        <Section
          title="Where it lives"
          lead="Between the turns, not beside them. It has no sender and no side, so it reads as the conversation speaking rather than as somebody in it — which is exactly why it is centred and why it has no bubble."
        >
          <Box style={{ maxWidth: 560 }}>
            <ChatMessageList label="Conversation with the assistant" style={{ height: 300 }}>
              <ChatSystemMessage variant="divider">Today</ChatSystemMessage>
              <ChatMessage sender="user">
                Switch the brand accent to teal, but check the contrast first.
              </ChatMessage>
              <ChatSystemMessage icon={<ArrowsClockwise weight="bold" />}>
                Theme preview started.
              </ChatSystemMessage>
              <ChatMessage sender="assistant" avatar={ASSISTANT_AVATAR} name="Assistant">
                Measured across every accent — body copy and small print both clear the floor.
              </ChatMessage>
              <ChatSystemMessage icon={<UserPlus weight="bold" />}>Dana joined the conversation.</ChatSystemMessage>
            </ChatMessageList>
          </Box>
          <Caption>
            Inside the log the notice renders <strong>no live region of its own</strong> — the log
            announces it, once. On its own it takes <Mono>role=&quot;status&quot;</Mono> and announces
            itself, so a notice outside a transcript is still heard.
          </Caption>
        </Section>

        <Rule />

        <Section
          title="The two variants"
          lead="A plain line marks something that happened. A divider marks a boundary — a new day, a new session, the point where history stops and the current thread begins."
        >
          <Grid columns={{ initial: "1", sm: "2" }} gap="4">
            <Scenario
              label="DEFAULT"
              caption={<>A centred line, with an optional glyph in front. The glyph is decoration: the words say the same thing on their own.</>}
            >
              <Flex direction="column" gap="2" style={{ width: "100%" }}>
                <ChatSystemMessage>Theme updated.</ChatSystemMessage>
                <ChatSystemMessage icon={<UserPlus weight="bold" />}>Dana joined the conversation.</ChatSystemMessage>
              </Flex>
            </Scenario>
            <Scenario
              label="DIVIDER"
              caption={<>The same line with a rule out to each side. The two rules share whatever the label leaves, so the label always sits in the middle.</>}
            >
              <Flex direction="column" gap="2" style={{ width: "100%" }}>
                <ChatSystemMessage variant="divider">Today</ChatSystemMessage>
                <ChatSystemMessage variant="divider">29 July 2026</ChatSystemMessage>
              </Flex>
            </Scenario>
          </Grid>
        </Section>

        <Rule />

        <Section
          title="A long notice wraps"
          lead="System lines are where a product explains itself, and the explanations that matter are the long ones. The line wraps — centred, at any width — rather than cutting off mid-sentence at the edge of the column."
        >
          <Grid columns={{ initial: "1", sm: "2" }} gap="4">
            <Scenario
              label="NARROW · 280px"
              caption="Three lines, all readable. A phone-width column is exactly where a one-line rule would have swallowed the second half of the sentence."
            >
              <Box style={{ width: 280, maxWidth: "100%" }}>
                <ChatSystemMessage icon={<Info weight="fill" />}>{LONG_NOTICE}</ChatSystemMessage>
              </Box>
            </Scenario>
            <Scenario
              label="WIDE · 560px"
              caption="The same notice with room to breathe — and the divider variant wraps the same way, with the rules keeping their line."
            >
              <Flex direction="column" gap="3" style={{ width: 560, maxWidth: "100%" }}>
                <ChatSystemMessage icon={<Info weight="fill" />}>{LONG_NOTICE}</ChatSystemMessage>
                <ChatSystemMessage variant="divider">{LONG_NOTICE}</ChatSystemMessage>
              </Flex>
            </Scenario>
          </Grid>
        </Section>

        <Rule />

        <Section
          title="Keep it a footnote"
          lead="This is the mistake the component makes easy to avoid and a product makes easy to reintroduce. The moment a system line grows a surface, a border or a severity colour, it stops being a footnote and starts competing with the messages it sits between."
        >
          <Grid columns={{ initial: "1", sm: "2" }} gap="3">
            <DoDont kind="do" bare note="Quiet type between two turns. The eye passes over it and comes back when it needs to.">
              <Flex direction="column" gap="2" style={{ width: "100%" }}>
                <ChatMessage sender="user">Switch the accent to teal.</ChatMessage>
                <ChatSystemMessage>Theme preview started.</ChatSystemMessage>
                <ChatMessage sender="assistant">Measured — everything clears the floor.</ChatMessage>
              </Flex>
            </DoDont>
            <DoDont kind="dont" bare note="A Callout between two turns. It outweighs both, so the housekeeping gets read first.">
              <Flex direction="column" gap="2" style={{ width: "100%" }}>
                <ChatMessage sender="user">Switch the accent to teal.</ChatMessage>
                <Callout urgency="attention">Theme preview started.</Callout>
                <ChatMessage sender="assistant">Measured — everything clears the floor.</ChatMessage>
              </Flex>
            </DoDont>
          </Grid>
          <Caption>
            If the reader actually has to <em>act</em> on it, it is not a system line. Reach for a
            Callout in the page, or a Toast if it is about something that just happened.
          </Caption>
        </Section>

        <Rule />

        <ComparisonSection comparison={MESSAGING_COMPARISON} highlight="ChatSystemMessage" />

        <Rule />

        <Section
          title="Tokens"
          lead="Every row below is read off a rendered notice — one with a glyph, one as a divider — and checked against the token it names, so the table reports what the component paints rather than what the tokens say. Zero net-new tokens, and no fill or stroke of its own beyond the shared rule."
        >
          <SystemMessageSpec />
          <Caption>
            There is no background row and no border row because there is no background and no
            border. That absence is the design, not an omission.
          </Caption>
        </Section>
      </Page>
    </HexThemeKey.Provider>
  ),
  play: async ({ canvasElement }) => {
    // The token table's EVIDENCE, asserted at runtime — every row read a REAL rendered part of a real
    // notice (the text, its weight, the inset, the glyph, the gap, the shared rule), never a probe
    // this story painted. `rows: N` is the exact form: an "at least one" floor is satisfied by a
    // table that has not filled in yet.
    const rows = await awaitMeasuredRows(canvasElement, { rows: SPEC_ROWS });
    if (rows.measured !== SPEC_ROWS || rows.unproven !== 0) {
      throw new Error(`expected ${SPEC_ROWS} measured / 0 unproven token rows, got ${rows.measured} / ${rows.unproven}`);
    }
  },
};

/* ---- Props ----------------------------------------------------------- */

type PropsArgs = {
  text: string;
  variant: ChatSystemMessageVariant;
  showIcon: boolean;
  inList: boolean;
  width: number;
};

/** Props — the live, args-driven notice. Every capability is a control. */
export const Props: StoryObj<PropsArgs> = {
  args: {
    text: "Theme preview started.",
    variant: "default",
    showIcon: true,
    inList: true,
    width: 460,
  },
  argTypes: {
    text: { control: "text", description: "What the conversation is saying about itself. Paste a long sentence in to watch it wrap rather than truncate.", table: { category: "Content" } },
    variant: { control: "inline-radio", options: ["default", "divider"], description: "A centred line, or the same line with a rule running out to each side.", table: { category: "Content" } },
    showIcon: { control: "boolean", description: "Render a decorative glyph before the text. Never the only signal — the words say the same thing.", table: { category: "Content" } },
    inList: { control: "boolean", description: "Show it inside a conversation or on its own. Inside a log it renders no live region; on its own it announces itself.", table: { category: "Placement" } },
    width: { control: { type: "range", min: 220, max: 720, step: 20 }, description: "The column the notice sits in. Narrow it with a long sentence to see the wrap.", table: { category: "Placement" } },
  },
  parameters: { controls: { disable: false } },
  render: (args: PropsArgs) => {
    const { text, variant, showIcon, inList, width } = args;
    const notice = (
      <ChatSystemMessage variant={variant} icon={showIcon ? <Info weight="fill" /> : undefined}>
        {text}
      </ChatSystemMessage>
    );
    return (
      <Page maxWidth="none">
        <PageHeader title="ChatSystemMessage · Props" standfirst={DEFINITION} />
        <Box style={{ padding: "16px 0 8px", width, maxWidth: "100%" }}>
          {inList ? (
            <ChatMessageList label="Conversation with the assistant" style={{ height: 240 }}>
              <ChatMessage sender="user">Switch the accent to teal.</ChatMessage>
              {notice}
              <ChatMessage sender="assistant" avatar={ASSISTANT_AVATAR} name="Assistant">
                Measured — everything clears the floor.
              </ChatMessage>
            </ChatMessageList>
          ) : (
            notice
          )}
        </Box>
        <PropsLead />
        <Rule />
        <Section title="Props reference" lead={<>Every prop <Code>ChatSystemMessage</Code> accepts. There is no severity, no surface and no dismissal — the whole component is one quiet line.</>}>
          <PropTable rows={PROPS} />
        </Section>
        <Section title="What goes in the slots" lead={<>Two of the props take content rather than a value.</>}>
          <Text as="p" size="2" style={{ color: "var(--ds-text-weak)", lineHeight: 1.6 }}>
            <Code>children</Code> is the sentence — plain text most of the time, but anything
            composed works, and it wraps whatever it is. <Code>icon</Code> takes a glyph and is hidden
            from assistive technology, so it may repeat what the words say but must never replace it.
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
      <PageHeader title="ChatSystemMessage · History" standfirst={DEFINITION} />
      <Section title="Decisions" lead="The rulings this component encodes.">
        <Flex direction="column" gap="3">
          <Decision id="[[chat-system-line]] · It is not a Callout, and that is the whole design">
            A Callout is a standing message box with a surface, a tint and a severity, and it earns
            that weight by being about something the reader has to deal with. A system line is a
            footnote in a transcript. Give it a surface and every <em>“Today”</em> separator reads as
            a warning — and a column that already has bubbles in it gains a second competing box.
          </Decision>
          <Decision id="[[chat-system-line]] · The text wraps">
            A long notice is <strong>not</strong> truncated. This is a correction: holding the line to
            one row cuts off exactly the sentences a system line is for — <em>“moved to the archived
            workspace, so replies no longer notify the original participants”</em> — and a notice
            nobody can finish reading is not a notice.
          </Decision>
          <Decision id="[[chat-system-line]] · The live region follows where it is">
            Inside a <Code>ChatMessageList</Code> this renders <strong>no role</strong>: the log is
            already a polite live region and announces everything appended to it, so a second region
            here would read the same line twice. Standing on its own it takes{" "}
            <Mono>role=&quot;status&quot;</Mono> and announces itself. One announcement, either way.
          </Decision>
          <Decision id="[[chat-density]] · Quiet by weight and colour, never by a smaller step">
            The line sits at the <strong>same type step</strong> as the messages around it and is a
            tier below them by <Mono>--ds-text-weak</Mono> at base weight. The text lane floors at
            12px, so a smaller step would render at exactly the same size and buy nothing but a
            broken ladder.
          </Decision>
          <Decision id="[[chat-system-line]] · The divider is the system rule, drawn once">
            The <Code>divider</Code> variant composes <Code>Separator</Code> rather than drawing its
            own hairline, so a date break in a conversation and every other rule in the product are
            the same line — and stay the same line when that line changes.
          </Decision>
        </Flex>
      </Section>

      <Rule />

      <Section title="Changelog" lead="Notable changes, newest first — grows as the component evolves.">
        <Flex direction="column" gap="3">
          <Decision id="0.9.0">
            Initial <Code>System/Chat/ChatSystemMessage</Code> — the centred quiet line with an
            optional decorative glyph; the wrapping long notice; the divider variant on{" "}
            <Code>Separator</Code>; the context-dependent live region.
          </Decision>
        </Flex>
      </Section>
    </Page>
  ),
};
