import { useLayoutEffect, useRef, useState } from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { Box, Code, Flex, Grid, Text } from "@radix-ui/themes";
import { ChatsCircle, Sparkle } from "@phosphor-icons/react";
import { Avatar } from "./Avatar";
import { Button } from "./Button";
import { EmptyState } from "./EmptyState";
import { Spinner } from "./Spinner";
import { Timestamp } from "./Timestamp";
import { ChatMessage } from "./ChatMessage";
import { ChatMessageMetadata } from "./ChatMessageMetadata";
import { ChatMessageList } from "./ChatMessageList";
import { ChatSystemMessage } from "./ChatSystemMessage";
import { SizeContext } from "../../theme/SizeContext";
import {
  AnatomyLegend, Caption, Decision, DoDont, DODONT_LABEL, dotStyle, HexThemeKey, hLine, MeasuredRow, MeasuredSpec,
  Mono, Page, PageHeader, PropsLead, type PropDef, PropTable, Rule, Scenario, Section, tick,
} from "./_storyKit";
import { awaitMeasuredRows } from "../../foundations/_assert";

/** The one definition of this component — the standfirst every page of it opens with. */
const DEFINITION = (
  <>
    The conversation itself: a scrolling, named, announcing log of everything said. One element does all
    three jobs — the region a reader focuses is the region the arrow keys scroll, and the region that reads a
    new message out when it arrives. Tell it when an answer is streaming and a screen reader waits for the
    finished sentence.
  </>
);

/* The list is only ever seen full of real messages, so every specimen below holds a real slice of a
   conversation — the same one the rest of this family documents: a person asking this system to
   change its own accent, and an assistant answering at the length a real answer runs to. */

/* ---- fixtures ------------------------------------------------------------- */

const ASSISTANT_AVATAR = <Avatar radius="medium" fallback={<Sparkle weight="fill" />} />;

const LONG_ANSWER =
  "Switching the accent to teal moves every accent-aware role at once, so the only thing worth " +
  "checking by hand is where a tint meets text. I measured the three that matter: body copy on the " +
  "tinted bubble bottoms out at 11.86 to 1 and the small print at 4.73 — the WORST pairings across every "
  + "accent in both appearances, not the one on screen, so every reader is at least that clear of the 4.5 floor.";

/** The conversation every specimen draws from. */
function Conversation() {
  return (
    <>
      <ChatSystemMessage variant="divider">Today</ChatSystemMessage>
      <ChatMessage
        sender="user"
        metadata={<ChatMessageMetadata timestamp={<Timestamp value="2026-07-29T14:29:00Z" format="time" />} status="read" />}
      >
        Switch the brand accent to teal, but check the contrast before you write anything.
      </ChatMessage>
      <ChatSystemMessage>Theme preview started.</ChatSystemMessage>
      <ChatMessage
        sender="assistant"
        avatar={ASSISTANT_AVATAR}
        name="Assistant"
        metadata={<ChatMessageMetadata timestamp={<Timestamp value="2026-07-29T14:31:00Z" format="time" />} footer="Answered in 4.2s" />}
      >
        {LONG_ANSWER}
      </ChatMessage>
    </>
  );
}

const EMPTY_SLOT = (
  <EmptyState
    icon={<ChatsCircle />}
    title="No messages yet"
    description="Ask a question and the answer will appear here."
  />
);

/* ---- anatomy diagram ------------------------------------------------------
   The list's parts are BOXES INSIDE BOXES rather than a row of siblings, so the callouts hang in a
   left gutter and run a leader into the top edge of the part they name. Positions are MEASURED off
   two live specimens — one holding a conversation, one holding nothing — because both the rail's
   position (it is bottom-anchored) and the type lane move the moment the size toolbar changes. */

const GUTTER = 84;
/** Where a leader turns the corner, and the closest two dots may sit. */
const ELBOW = GUTTER - 30;
const MIN_GAP = 26;
/** Tall parts are pinned near their TOP edge; short ones at their middle. */
const EDGE_INSET = 16;

/** [callout number, CSS selector inside the diagram frame] */
const PINS: [number, string][] = [
  [1, ".rt-ds-chat-list .rt-ScrollAreaViewport"],
  [2, ".rt-ds-chat-list-rail"],
  [3, ".rt-ds-chat-list-empty"],
];

/** Where each callout's dot sits (`dotY`) and where its leader has to land (`partY`). */
type Pin = { dotY: number; partY: number };

function AnatomyDiagram() {
  const frame = useRef<HTMLDivElement>(null);
  const specimen = useRef<HTMLDivElement>(null);
  const [pins, setPins] = useState<Record<number, Pin>>({});

  useLayoutEffect(() => {
    const f = frame.current;
    const s = specimen.current;
    if (!f || !s) return;
    const measure = () => {
      const top = f.getBoundingClientRect().top;
      const next: Record<number, Pin> = {};
      // The pins are declared in visual order, so one forward pass keeps them from stacking.
      let floor = -Infinity;
      for (const [n, sel] of PINS) {
        const el = s.querySelector<HTMLElement>(sel);
        if (!el) continue;
        const box = el.getBoundingClientRect();
        const partY = Math.round(box.top + Math.min(box.height / 2, EDGE_INSET) - top);
        const dotY = Math.max(partY, floor + MIN_GAP);
        floor = dotY;
        next[n] = { dotY, partY };
      }
      // Only write when something moved: the frame's own height is derived from these positions, so
      // an unconditional write would loop the observer against its own output.
      setPins((prev) => (JSON.stringify(prev) === JSON.stringify(next) ? prev : next));
    };
    measure();
    let raf = 0;
    const ro = new ResizeObserver(() => { cancelAnimationFrame(raf); raf = requestAnimationFrame(measure); });
    ro.observe(s);
    return () => { cancelAnimationFrame(raf); ro.disconnect(); };
  }, []);

  const lastDot = Math.max(0, ...Object.values(pins).map((p) => p.dotY));

  return (
    <Box style={{ overflowX: "auto" }}>
      <Box
        ref={frame}
        style={{
          position: "relative", paddingLeft: GUTTER, paddingTop: 8, maxWidth: 640,
          minHeight: lastDot ? lastDot + 16 : undefined,
        }}
      >
        <Box ref={specimen}>
          <Flex direction="column" gap="4">
            {/* The dashed edge is DIAGRAM FURNITURE, in the same category as the dots and the leader
                lines: the log paints no boundary of its own, so without it callout 1 would point at
                empty space. The specimen holds two turns in a tall box on purpose — that is what
                puts the rail visibly at the bottom, and what separates callout 2 from callout 1. */}
            <Box style={{ outline: "1px dashed var(--ds-stroke-weak)", outlineOffset: 2, borderRadius: "var(--ds-radius-4)" }}>
              <ChatMessageList label="Conversation with the assistant" style={{ height: 260 }}>
                <ChatMessage sender="user">
                  Switch the brand accent to teal, but check the contrast first.
                </ChatMessage>
                <ChatMessage
                  sender="assistant"
                  avatar={ASSISTANT_AVATAR}
                  name="Assistant"
                  metadata={<ChatMessageMetadata timestamp={<Timestamp value="2026-07-29T14:31:00Z" format="time" />} />}
                >
                  Measured across every accent — body copy and small print both clear the floor.
                </ChatMessage>
              </ChatMessageList>
            </Box>
            <Box style={{ outline: "1px dashed var(--ds-stroke-weak)", outlineOffset: 2, borderRadius: "var(--ds-radius-4)" }}>
              <ChatMessageList label="New conversation" style={{ height: 170 }} emptyState={EMPTY_SLOT} />
            </Box>
          </Flex>
        </Box>

        {PINS.map(([n]) => {
          const pin = pins[n];
          if (!pin) return null;
          const { dotY, partY } = pin;
          return (
            <Box key={n}>
              <Box style={{ ...dotStyle, left: 0, top: dotY - 10 }}>{n}</Box>
              {/* out from the dot… */}
              <Box style={hLine({ left: 22, top: dotY, width: ELBOW - 22 })} />
              {/* …down or up to the part's own row (zero-height when they already agree)… */}
              {dotY !== partY && (
                <Box style={tick({ left: ELBOW, top: Math.min(dotY, partY), height: Math.abs(dotY - partY) })} />
              )}
              {/* …and in to the part. */}
              <Box style={hLine({ left: ELBOW, top: partY, width: GUTTER - ELBOW - 6 })} />
            </Box>
          );
        })}
      </Box>
    </Box>
  );
}

const ANATOMY_PARTS: [number, string, string][] = [
  [1, "The log region", "the whole box — and it is ONE element, not two. The thing a keyboard user focuses, the thing the arrow keys scroll, and the thing that announces a new message are all the same node. It carries a required name, so a reader hears which conversation they have landed in."],
  [2, "The message rail", "where the turns stack, oldest at the top. It sits at the BOTTOM of the log, so a two-message conversation reads the way every chat does rather than hanging off the top edge — and the moment the transcript outgrows the box, the rail fills it and the oldest message stays reachable."],
  [3, "The empty slot", "what stands in for a conversation that has not started. It is centred rather than pinned to a corner, and the copy says what is missing — never what the reader failed to do."],
];

/* ---- token spec -----------------------------------------------------------
   The list paints almost nothing: it is structure, semantics and rhythm. So the rows below measure
   the rhythm — the inset and the space between turns, at all three tiers of the container lane — and
   the one thing it does paint, which is the focus indicator on a region that is a real tab stop.

   The three tiers are PINNED rather than left to the size toolbar, so each row measures the tier it
   names instead of whichever one happens to be selected. */

function ListSpec() {
  return (
    <MeasuredSpec
      render={() => (
        <Flex gap="3">
          {(["small", "medium", "large"] as const).map((tier) => (
            <SizeContext.Provider key={tier} value={tier}>
              <Box style={{ width: 200 }}>
                <ChatMessageList label={`Conversation at the ${tier} tier`} style={{ height: 150 }}>
                  <ChatMessage sender="user">One.</ChatMessage>
                  <ChatMessage sender="assistant">Two.</ChatMessage>
                </ChatMessageList>
              </Box>
            </SizeContext.Provider>
          ))}
        </Flex>
      )}
    >
      <MeasuredRow
        part="Log inset"
        note="The space between the edge of the log and the first message, at the default tier."
        token="--ds-space-12"
        select='.rt-ds-chat-list-content[data-size="2"]'
        prop="padding-block-start"
      />
      <MeasuredRow
        part="Turn spacing · small"
        note="The gap between one turn and the next — the rhythm a transcript is read at."
        token="--ds-space-12"
        select='.rt-ds-chat-list-content[data-size="2"] .rt-ds-chat-list-rail'
        prop="row-gap"
      />
      <MeasuredRow
        part="Turn spacing · medium"
        note="One step up the surface scale. The inset moves with it, so the log keeps its proportions."
        token="--ds-space-16"
        select='.rt-ds-chat-list-content[data-size="3"] .rt-ds-chat-list-rail'
        prop="row-gap"
      />
      <MeasuredRow
        part="Turn spacing · large"
        note="The roomiest tier. Nothing else about the list changes — only the rhythm."
        token="--ds-space-20"
        select='.rt-ds-chat-list-content[data-size="4"] .rt-ds-chat-list-rail'
        prop="row-gap"
      />
      <MeasuredRow
        part="Focus ring"
        state="focus-visible"
        note="The log is a real tab stop, so it takes the system focus ring. This is the accent base. A Radix alpha, --ds-stroke-focus-stack, sits on top of it, 2px wide ([[focus-ring]])."
        token="--ds-stroke-focus"
        select=".rt-ds-chat-list .rt-ScrollAreaViewportFocusRing"
        prop="outline-color"
      />
    </MeasuredSpec>
  );
}
const SPEC_ROWS = 5;

/* ---- props ---------------------------------------------------------------- */

const PROPS: PropDef[] = [
  { name: "label", type: "string", locked: true, desc: <><strong>Required.</strong> What this conversation is, in words — “Conversation with the assistant”, “Support thread with Dana”. The log is focusable, so it is the first thing a keyboard user lands on; a focusable region with no name leaves them nowhere.</>, source: "ChatMessageList.tsx" },
  { name: "children", type: "ReactNode", desc: <>The messages, oldest first. <Code>ChatMessage</Code>, <Code>ChatSystemMessage</Code>, or anything composed.</>, source: "ChatMessageList.tsx" },
  { name: "emptyState", type: "ReactNode", desc: <>What stands in for a conversation with nothing in it. <Code>EmptyState</Code> belongs here. With no children and no slot, the log renders nothing at all rather than an empty frame.</>, source: "ChatMessageList.tsx" },
  { name: "isStreaming", type: "boolean", def: "false", desc: <>Whether an answer is arriving right now. Marks the log busy, so assistive technology waits and reads the finished message once instead of re-reading each partial as it grows.</>, source: "ChatMessageList.tsx" },
  { name: "ref", type: "Ref<HTMLDivElement>", desc: <>Forwarded to the <strong>scrolling</strong> node — which is also the log region. Read <Code>scrollTop</Code> from it, or drive it.</>, source: "ChatMessageList.tsx" },
  { name: "className", type: "string", desc: <>Merged onto the outer element — the one to give a height to.</>, source: "ChatMessageList.tsx" },
  { name: "style", type: "CSSProperties", desc: <>Inline styles on the outer element. The log needs a bounded height, or there is nothing to scroll.</>, source: "ChatMessageList.tsx" },
];

/* ========================================================================== */

const meta: Meta<typeof ChatMessageList> = {
  title: "Components/Chat/ChatMessageList",
  component: ChatMessageList,
  parameters: {
    controls: { disable: true },
    docs: {
      description: {
        component:
          "**ChatMessageList** is the conversation itself — a scrolling, named, announcing log of " +
          "everything that has been said. One element does all three jobs: the region a reader can " +
          "focus is the region the arrow keys scroll, and it is the region that reads a new message " +
          "out when it arrives. Give it a name and a height; put messages in it; tell it when an " +
          "answer is streaming so a screen reader waits for the finished sentence instead of " +
          "re-reading a half-typed one.",
      },
    },
  },
};
export default meta;
type Story = StoryObj<typeof ChatMessageList>;

/** Anatomy — the labelled parts and the bottom-anchored rail. The token spec closes Usage. */
export const Anatomy: Story = {
  render: () => (
    <Page maxWidth={900}>
      <PageHeader title="ChatMessageList · Anatomy" standfirst={DEFINITION} />
      <Section
        title="The parts"
        lead="A log is a box with a rail in it. The box is the part that carries the semantics — the name, the tab stop, the announcement — and the rail is the part that carries the rhythm. The callouts are pinned onto two live logs, one holding a conversation and one holding nothing; the legend spells each one out."
      >
        <AnatomyDiagram />
        <AnatomyLegend parts={ANATOMY_PARTS} />
        <Caption>
          The dashed edge is part of the diagram, not part of the component: the log paints no
          boundary of its own, and one that tinted, bordered or shadowed itself would compete with
          the bubbles inside it. The focusable region and the scrolling region are the same
          element, so a keyboard user who tabs into the transcript can immediately page through it.
        </Caption>
      </Section>

      <Rule />

      <Section
        title="Short conversations sit at the bottom"
        lead="A log is read from the bottom up: the newest thing is the thing you came for. So a transcript that does not fill its box is pushed down to meet the edge it grows from, rather than starting at the top and leaving a gap underneath the most recent message."
      >
        <Grid columns={{ initial: "1", sm: "2" }} gap="4">
          <Scenario
            label="TWO TURNS IN A TALL LOG"
            caption="The pair sits against the bottom edge, where the next message will appear."
          >
            <ChatMessageList label="A short conversation" style={{ height: 240 }}>
              <ChatMessage sender="user">Check the contrast first.</ChatMessage>
              <ChatMessage sender="assistant" avatar={ASSISTANT_AVATAR} name="Assistant">
                Measured — everything clears the floor.
              </ChatMessage>
            </ChatMessageList>
          </Scenario>
          <Scenario
            label="A FULL LOG"
            caption="Once the transcript outgrows the box the rail fills it, and the oldest message is still one scroll away."
          >
            <ChatMessageList label="A full conversation" style={{ height: 240 }}>
              <Conversation />
            </ChatMessageList>
          </Scenario>
        </Grid>
      </Section>
    </Page>
  ),
};

/** Usage — a real conversation, the streaming pattern, the empty state, naming the log, and the
 *  live token spec that closes the page. */
export const Usage: Story = {
  parameters: { a11y: { context: { exclude: [DODONT_LABEL] } } },
  render: (_args, { globals }) => (
    <Page maxWidth={900}>
      <PageHeader title="ChatMessageList · Usage" standfirst={DEFINITION} />
      <Section
        title="A conversation in a box"
        lead="Give the log a name and a height, put messages in it, and it is done. Everything else in this family composes into it: turns, the small print under them, and the quiet lines the conversation says about itself."
      >
        <Box style={{ maxWidth: 640 }}>
          <ChatMessageList label="Conversation with the assistant" style={{ height: 380 }}>
            <Conversation />
          </ChatMessageList>
        </Box>
        <Caption>
          The log needs a <strong>bounded height</strong> — from <Code>style</Code>, from a class, or
          from a parent that gives it one. Without a bound there is nothing to scroll and nothing to
          anchor to the bottom. For a whole chat — this log with a composer docked under it, the
          transcript following new answers, and a control for getting back to the bottom — reach for{" "}
          <Code>ChatLayout</Code>, which renders this component inside itself. Use{" "}
          <Code>ChatMessageList</Code> directly when the product owns the composer and the scrolling.
        </Caption>
      </Section>

      <Rule />

      <Section
        title="While an answer is arriving"
        lead="Streaming needs two things said at once, to two different audiences. Set isStreaming so a screen reader waits for the finished sentence rather than re-reading a growing one — and render a Spinner as the assistant's body so a sighted reader is not watching an empty column wondering whether anything is happening."
      >
        <Grid columns={{ initial: "1", sm: "2" }} gap="4">
          <Scenario
            label="NOTHING HAS ARRIVED YET"
            caption={<>The assistant's turn is already on screen with a <Code>Spinner</Code> in it, so the answer has a place to appear rather than shifting the whole transcript when it does.</>}
          >
            <ChatMessageList label="Conversation with the assistant" isStreaming style={{ height: 200 }}>
              <ChatMessage sender="user">Check the contrast first.</ChatMessage>
              <ChatMessage sender="assistant" avatar={ASSISTANT_AVATAR} name="Assistant">
                <Spinner />
              </ChatMessage>
            </ChatMessageList>
          </Scenario>
          <Scenario
            label="THE ANSWER LANDED"
            caption={<>Clear <Code>isStreaming</Code> and the finished message is announced once, as a whole sentence.</>}
          >
            <ChatMessageList label="Conversation with the assistant" style={{ height: 200 }}>
              <ChatMessage sender="user">Check the contrast first.</ChatMessage>
              <ChatMessage sender="assistant" avatar={ASSISTANT_AVATAR} name="Assistant">
                Measured across every accent — body copy and small print both clear the floor.
              </ChatMessage>
            </ChatMessageList>
          </Scenario>
        </Grid>
        <Caption>
          Do not announce tokens as they arrive. A reader hearing the same sentence restarted forty
          times cannot follow any of them — which is exactly what the busy flag exists to prevent.
        </Caption>
      </Section>

      <Rule />

      <Section
        title="Before there is anything to read"
        lead="An empty conversation is a beginning, not a failure. Put an EmptyState in the slot: it centres itself in the log, says what is missing, and offers the one next step. With no slot at all the log renders nothing rather than an empty frame with a scrollbar."
      >
        <Box style={{ maxWidth: 480 }}>
          <ChatMessageList
            label="New conversation"
            style={{ height: 240 }}
            emptyState={
              <EmptyState
                icon={<ChatsCircle />}
                title="No messages yet"
                description="Ask a question and the answer will appear here."
                actions={<Button>Start a conversation</Button>}
              />
            }
          />
        </Box>
        <Caption>
          The copy is <strong>blameless</strong> — “No messages yet”, never “You haven’t sent
          anything”. The reader has just arrived; there is nothing for them to have done wrong.
        </Caption>
      </Section>

      <Rule />

      <Section
        title="Name the conversation, not the widget"
        lead="The name is read out the moment a keyboard user reaches the transcript, and it is often the only thing that distinguishes one log from another on a page holding several. Say which conversation this is."
      >
        <Grid columns={{ initial: "1", sm: "2" }} gap="3">
          {/* The two logs render identically — the name is not painted anywhere — so each panel
              states the value it was given. Without that line the comparison would be invisible. */}
          <DoDont kind="do" bare note="Names the thread. A reader knows whose conversation this is before reading a word of it.">
            <Flex direction="column" gap="2" style={{ width: "100%" }}>
              <Mono>label=&quot;Support thread with Dana&quot;</Mono>
              <ChatMessageList label="Support thread with Dana" style={{ height: 130 }}>
                <ChatMessage sender="user">Any update on the theme?</ChatMessage>
                <ChatMessage sender="assistant" name="Dana">Shipping this afternoon.</ChatMessage>
              </ChatMessageList>
            </Flex>
          </DoDont>
          <DoDont kind="dont" bare note="Names the component. The messages say that already — and two on a page are identical.">
            <Flex direction="column" gap="2" style={{ width: "100%" }}>
              <Mono>label=&quot;Chat&quot;</Mono>
              <ChatMessageList label="Chat" style={{ height: 130 }}>
                <ChatMessage sender="user">Any update on the theme?</ChatMessage>
                <ChatMessage sender="assistant" name="Dana">Shipping this afternoon.</ChatMessage>
              </ChatMessageList>
            </Flex>
          </DoDont>
        </Grid>
        <Caption>
          One more habit worth keeping: let <Code>ChatSystemMessage</Code> sit inside the log rather
          than beside it. Inside, it drops its own live region and the log announces it once — beside
          it, the notice announces itself, which is right there and wrong here.
        </Caption>
      </Section>

      <Rule />

      {/* The closing reference section. The provider is what makes the table live: every measured row
          re-reads its value when this key changes, so an accent/appearance flip re-resolves the spec. */}
      <HexThemeKey.Provider value={`${globals.accent}-${globals.appearance}-${globals.contrast}`}>
        <Section
          title="Tokens"
          lead="Every row below is read off a rendered log and checked against the token it names, so the table reports what the component paints rather than what the tokens say. The three tiers are shown together because the rhythm is the whole of what the container lane does here. Zero net-new tokens."
        >
          <ListSpec />
          <Caption>
            The log paints almost nothing else on purpose: it is a frame around messages, and a frame
            that tints, borders or shadows itself competes with the bubbles inside it.
          </Caption>
        </Section>
      </HexThemeKey.Provider>
    </Page>
  ),
  play: async ({ canvasElement }) => {
    // The token table's EVIDENCE, asserted at runtime — every row read a REAL rendered part of a real
    // log (the inset, the rhythm at all three tiers, the focus ring), never a probe this story
    // painted. `rows: N` is the exact form: the logs mount asynchronously, so an "at least one" floor
    // would be satisfied by a table that had not filled in yet.
    const rows = await awaitMeasuredRows(canvasElement, { rows: SPEC_ROWS });
    if (rows.measured !== SPEC_ROWS || rows.unproven !== 0) {
      throw new Error(`expected ${SPEC_ROWS} measured / 0 unproven token rows, got ${rows.measured} / ${rows.unproven}`);
    }
  },
};

/* ---- Props ----------------------------------------------------------- */

type PropsArgs = {
  label: string;
  conversation: "empty" | "short" | "full";
  isStreaming: boolean;
  showEmptyState: boolean;
  height: number;
};

/** Props — the live, args-driven log. Every capability is a control. */
export const Props: StoryObj<PropsArgs> = {
  args: {
    label: "Conversation with the assistant",
    conversation: "full",
    isStreaming: false,
    showEmptyState: true,
    height: 320,
  },
  argTypes: {
    label: { control: "text", description: "The log's accessible name. Required — it is read out the moment a keyboard user reaches the transcript.", table: { category: "Log" } },
    conversation: { control: "inline-radio", options: ["empty", "short", "full"], description: "How much is in the log. Empty shows the slot below; short sits against the bottom edge; full overflows and scrolls.", table: { category: "Content" } },
    isStreaming: { control: "boolean", description: "Whether an answer is arriving. Marks the log busy and renders the assistant's turn with a spinner in it.", table: { category: "Log" } },
    showEmptyState: { control: "boolean", description: "Whether an empty conversation shows the empty-state slot. With it off, an empty log renders nothing at all.", table: { category: "Content" } },
    height: { control: { type: "range", min: 140, max: 520, step: 20 }, description: "The log's bounded height. Without a bound there is nothing to scroll.", table: { category: "Log" } },
  },
  parameters: { controls: { disable: false } },
  render: (args: PropsArgs) => {
    const { label, conversation, isStreaming, showEmptyState, height } = args;
    return (
      <Page maxWidth="none">
        <PageHeader title="ChatMessageList · Props" standfirst={DEFINITION} />
        <Box style={{ padding: "16px 0 8px", maxWidth: 640 }}>
          <ChatMessageList
            label={label}
            isStreaming={isStreaming}
            style={{ height }}
            emptyState={showEmptyState ? EMPTY_SLOT : undefined}
          >
            {conversation === "empty" ? null : conversation === "short" ? (
              <>
                <ChatMessage sender="user">Check the contrast first.</ChatMessage>
                <ChatMessage sender="assistant" avatar={ASSISTANT_AVATAR} name="Assistant">
                  {isStreaming ? <Spinner /> : "Measured — everything clears the floor."}
                </ChatMessage>
              </>
            ) : (
              <>
                <Conversation />
                {isStreaming && (
                  <ChatMessage sender="assistant" avatar={ASSISTANT_AVATAR} name="Assistant">
                    <Spinner />
                  </ChatMessage>
                )}
              </>
            )}
          </ChatMessageList>
        </Box>
        <PropsLead />
        <Rule />
        <Section title="Props reference" lead={<>Every prop <Code>ChatMessageList</Code> accepts. There is no density prop: the rhythm comes from the global size, so a product tunes it once.</>}>
          <PropTable rows={PROPS} />
        </Section>
        <Section title="What goes in the slots" lead={<>Two of the props take content rather than a value.</>}>
          <Flex direction="column" gap="2">
            <Text as="p" size="2" style={{ color: "var(--ds-text-weak)", lineHeight: 1.6 }}>
              <Code>children</Code> is the transcript — <Code>ChatMessage</Code> for a turn,{" "}
              <Code>ChatSystemMessage</Code> for a line the conversation says about itself, and
              anything else a product needs between them. <Code>emptyState</Code> takes an{" "}
              <Code>EmptyState</Code>, which centres itself in the log.
            </Text>
          </Flex>
        </Section>
      </Page>
    );
  },
};

/** History — the rulings this component encodes and a changelog of how it changes over time. */
export const History: Story = {
  render: () => (
    <Page>
      <PageHeader title="ChatMessageList · History" standfirst={DEFINITION} />
      <Section title="Decisions" lead="The rulings this component encodes.">
        <Flex direction="column" gap="3">
          <Decision id="[[chat-log-scroller]] · label is required, not encouraged">
            The log carries <Mono>tabIndex=0</Mono>, which makes it a real tab stop — usually the
            first one in a chat. A focusable region with no accessible name tells a reader nothing
            about where they have landed, so <Code>label</Code> is <strong>required in the type</strong>,
            and a development build says so out loud if it arrives empty.
          </Decision>
          <Decision id="[[chat-log-scroller]] · One element is the scroller AND the log">
            The role, the name, the tab stop and the busy flag all land on the node that actually
            scrolls. The tempting alternative — a labelled wrapper around a separate scrolling div —
            passes every attribute check and ships a focusable element whose arrow keys move nothing.
          </Decision>
          <Decision id="[[chat-log-scroller]] · The role IS the announcement mechanism">
            <Mono>role=&quot;log&quot;</Mono> carries a polite live region of its own, so the log
            announces what is appended to it without a second region anywhere.{" "}
            <Code>isStreaming</Code> marks it busy, which is what stops a reader hearing a
            half-arrived answer re-read on every token; the finished message is announced once, when
            the flag clears. <strong>No per-token announcements.</strong>
          </Decision>
          <Decision id="[[chat-log-scroller]] · A streaming answer shows a spinner in the bubble">
            The busy flag closes the gap for a screen-reader user and leaves a sighted one watching an
            empty column. So an assistant message that is streaming with nothing in it yet renders a{" "}
            <Code>Spinner</Code> as its body. That is composition of two things that already exist —
            not a new typing-indicator component.
          </Decision>
          <Decision id="[[chat-density]] · The container lane, not a density prop">
            The inset and the space between turns ride the global <strong>container lane</strong> —
            the same surface scale a Card or a Dialog takes. A product sets its density once,
            globally, instead of every conversation carrying its own three-way switch.
          </Decision>
          <Decision id="[[chat-system-line]] · The log publishes itself to what is inside it">
            A part rendered in the log can tell that it is in one. That is what lets{" "}
            <Code>ChatSystemMessage</Code> drop its own live region here and keep it when it stands
            alone — one announcement, either way.
          </Decision>
        </Flex>
      </Section>

      <Rule />

      <Section title="Changelog" lead="Notable changes, newest first — grows as the component evolves.">
        <Flex direction="column" gap="3">
          <Decision id="0.9.0">
            Initial <Code>System/Chat/ChatMessageList</Code> — one node as both scroller and log; a
            required accessible name; the streaming busy flag and the spinner-in-the-bubble pattern
            it pairs with; the bottom-anchored message rail; the empty-state slot; the container-lane
            rhythm.
          </Decision>
        </Flex>
      </Section>
    </Page>
  ),
};
