import { useLayoutEffect, useRef, useState } from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { Box, Code, Flex, Grid, Text } from "@radix-ui/themes";
import { Sparkle } from "@phosphor-icons/react";
import { Avatar } from "./Avatar";
import { Timestamp } from "./Timestamp";
import {
  ChatMessage, type ChatMessageGroup, type ChatMessageSender, type ChatMessageVariant,
} from "./ChatMessage";
import { ChatMessageMetadata, type ChatMessageStatus } from "./ChatMessageMetadata";
import {
  AnatomyLegend, Caption, Decision, DoDont, DODONT_LABEL, dotStyle, HexThemeKey, hLine, MeasuredRow, MeasuredSpec,
  Mono, Page, PageHeader, PropsLead, type PropDef, PropTable, Rule, Scenario, Section, tick,
} from "./_storyKit";
import { awaitMeasuredRows } from "../../foundations/_assert";

/** The one definition of this component — the standfirst every page of it opens with. */
const DEFINITION = (
  <>
    One turn in a conversation: who said it, what they said, and what happened to it afterwards. The bubble
    is not a second thing to wrap content in — it is the <Code>variant</Code> and <Code>group</Code> props on
    this component. The sender drives alignment and skin: the person typing gets a tinted bubble on their
    side, the answer coming back is plain text on the page.
  </>
);

/* ChatMessage documents a CONVERSATION, so every specimen below is a plausible slice of one — a
   person asking this system to change its own accent, and an assistant answering at the length a
   real answer runs to. Nothing here is lorem, and nothing is a one-liner: the whole point of the
   width behaviour is that it only shows up on a paragraph. */

/* ---- fixtures ------------------------------------------------------------- */

/* Only the OTHER party gets a face ([[chat-avatar-size]]): the avatar slot renders for the assistant alone, so there is
   no user fixture to pair with this one. */
const ASSISTANT_AVATAR = <Avatar radius="medium" fallback={<Sparkle weight="fill" />} />;

/** The long one. It exists to prove the width clamp, so it has to actually be long. */
const LONG_ANSWER =
  "Switching the accent to teal moves every accent-aware role at once, so the only thing worth " +
  "checking by hand is where a tint meets text. I measured the three that matter: body copy on the " +
  "tinted bubble bottoms out at 11.86 to 1, and the small print at 4.73 — those are the WORST pairings "
  + "across every accent in both appearances, not this one, so every reader is at least that clear of the "
  + "4.5 floor. The small print is the number to watch: it only lands that low on the tint itself, and "
  + "the row we actually ship sits on the page ground, where it is higher. The one thing I could " +
  "not change is the theme file itself, which is read-only here, so nothing has been applied yet.";

const SHORT_ANSWER = "Teal it is. I will check the contrast before anything is written.";

/* ---- anatomy diagram ------------------------------------------------------
   A message stacks vertically — name over body over small print — so the callouts hang in a LEFT
   GUTTER and run a leader line into the part they name, rather than the two-tier band a single dense
   row takes. Positions are MEASURED off the live specimen: the parts are content-sized and the text
   lane moves them the moment the size toolbar changes.

   The avatar and the name are ONE header row now ([[chat-avatar-header-row]]) — the name's row is grown to the avatar's own
   box and the name is centred in it, so the two share a centre EXACTLY rather than sitting a few
   pixels apart. Two dots placed on those measured centres would land on top of each other and one
   callout would disappear. The dots are therefore pushed apart to a minimum spacing and each leader
   turns a corner to reach the part it names — the dot moves, the line still ends on the right row. */

const GUTTER = 84;
/** Where a leader turns the corner, and the closest two dots may sit. */
const ELBOW = GUTTER - 30;
const MIN_GAP = 24;

/** [callout number, CSS selector inside the specimen] */
const PINS: [number, string][] = [
  [1, ".rt-ds-chat-message-avatar"],
  [2, ".rt-ds-chat-message-name"],
  [3, ".rt-ds-chat-message-bubble"],
  [4, ".rt-ds-chat-message-meta-slot"],
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
      // The pins are declared in visual order, so one forward pass is enough to keep them apart.
      let floor = -Infinity;
      for (const [n, sel] of PINS) {
        const el = s.querySelector<HTMLElement>(sel);
        if (!el) continue;
        const box = el.getBoundingClientRect();
        const partY = Math.round(box.top + box.height / 2 - top);
        const dotY = Math.max(partY, floor + MIN_GAP);
        floor = dotY;
        next[n] = { dotY, partY };
      }
      // Only write when something actually moved: the frame's own height is derived from these
      // positions, so an unconditional write would loop the observer against its own output.
      setPins((prev) => (JSON.stringify(prev) === JSON.stringify(next) ? prev : next));
    };
    measure();
    // Observe the SPECIMEN, not the frame: the frame's height is derived from what this callback
    // computes, so observing it would feed the observer its own output.
    let raf = 0;
    const ro = new ResizeObserver(() => { cancelAnimationFrame(raf); raf = requestAnimationFrame(measure); });
    ro.observe(s);
    return () => { cancelAnimationFrame(raf); ro.disconnect(); };
  }, []);

  // The dots are absolutely positioned, so they contribute NO height — and once they are pushed
  // apart the last one can sit well below a short message. The frame reserves the room itself.
  const lastDot = Math.max(0, ...Object.values(pins).map((p) => p.dotY));

  return (
    <Box style={{ overflowX: "auto" }}>
      {/* paddingTop leaves the first dot room: it is 20px tall and centres on the 30px avatar sitting
          flush with the top of the message. */}
      <Box
        ref={frame}
        style={{
          position: "relative", paddingLeft: GUTTER, paddingTop: 12, maxWidth: 620,
          minHeight: lastDot ? lastDot + 16 : undefined,
        }}
      >
        <Box ref={specimen}>
          <ChatMessage
            sender="assistant"
            avatar={ASSISTANT_AVATAR}
            name="Assistant"
            metadata={<ChatMessageMetadata timestamp="2:31 PM" footer="Answered in 4.2s" />}
          >
            {SHORT_ANSWER}
          </ChatMessage>
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
  [1, "Avatar", "optional — who is talking, as a picture, and only ever the OTHER party. A circle is a person and a rounded square is a system or a bot. It owns the header row: the name beside it is centred against its box, so the picture and the words read as one unit and the bottom of the picture is where the message starts. The reader's own message never takes one — the side it sits on and the tint on it already say whose it is — and a centred system notice has no author to picture, so both slots are dropped rather than left hanging beside a line of text."],
  [2, "Name", "optional — who is talking, in words, centred on the avatar's row. When it is present it becomes the whole message's accessible name, so a reader hears the speaker before the message. Without one the message still names itself, in plain English rather than in the prop's own vocabulary."],
  [3, "Body", "the message. It is the only required part, and it is what the bubble skin applies to: a tinted surface for the person typing, plain text for the answer coming back. It never grows past 80% of the column, and never shrinks below 280px."],
  [4, "Small print", "optional — when it was sent, what happened to it, and anything the product hangs beside those. It sits below the body and lines up with the body's own left edge, tinted bubble or not."],
];

/* ---- token spec -----------------------------------------------------------
   ONE slice of a transcript carries every row: the person's last message (the tint, the inset, and
   both corners — the standalone one and the tightened one — readable off the same bubble), then a run
   of two from the assistant, which is what the header band and the held gutter need to be read off. */

function ChatMessageSpec() {
  return (
    <MeasuredSpec
      render={() => (
        <Flex direction="column" gap="1" style={{ width: 520 }}>
          <ChatMessage sender="user" group="last">
            Switch the brand accent to teal, but check the contrast first.
          </ChatMessage>
          <ChatMessage sender="assistant" avatar={ASSISTANT_AVATAR} name="Assistant" group="first">
            {SHORT_ANSWER}
          </ChatMessage>
          <ChatMessage sender="assistant" avatar={ASSISTANT_AVATAR} group="last">
            Nothing has been written yet.
          </ChatMessage>
        </Flex>
      )}
    >
      <MeasuredRow
        part="Bubble fill"
        note="The tint on the person's own message — an alpha step, so what is under it still reads."
        token="--ds-fill-accent-weak"
        select='.rt-ds-chat-message[data-sender="user"] .rt-ds-chat-message-bubble'
        prop="background-color"
      />
      <MeasuredRow
        part="Body text"
        note="The message itself — the strongest text role, on the tint and off it alike."
        token="--ds-text-strong"
        select=".rt-ds-chat-message-bubble"
        prop="color"
      />
      <MeasuredRow
        part="Bubble corner"
        note="The standalone corner radius, on the side a run never tightens."
        token="--ds-radius-4"
        select='.rt-ds-chat-message[data-sender="user"] .rt-ds-chat-message-bubble'
        prop="border-top-left-radius"
      />
      <MeasuredRow
        part="Grouped corner"
        note="The sender-side corner inside a run of consecutive messages — half the standalone step."
        token="--ds-radius-2"
        select='.rt-ds-chat-message[data-sender="user"] .rt-ds-chat-message-bubble[data-group="last"]'
        prop="border-top-right-radius"
      />
      <MeasuredRow
        part="Bubble inset"
        note="The space between the tint's edge and the first character. Name and small print match it."
        token="--ds-space-12"
        select='.rt-ds-chat-message[data-variant="filled"] .rt-ds-chat-message-bubble'
        prop="padding-inline-start"
      />
      <MeasuredRow
        part="Name colour"
        note="Who is talking — supporting information beside the message, not a peer of it."
        token="--ds-text-weak"
        select='.rt-ds-chat-message[data-header="band"] .rt-ds-chat-message-name'
        prop="color"
      />
      <MeasuredRow
        part="Name weight"
        note="A tier below the body, and carried by WEIGHT rather than by a smaller type step."
        token="--ds-font-weight-strong"
        select='.rt-ds-chat-message[data-header="band"] .rt-ds-chat-message-name'
        prop="font-weight"
      />
      <MeasuredRow
        part="Header row"
        note="The name's row is the AVATAR'S box, with the name centred in it — so the bottom of the picture and the top of the message are one line."
        token="--ds-text-h3-leading"
        select='.rt-ds-chat-message[data-header="band"] .rt-ds-chat-message-name'
        prop="min-height"
      />
      <MeasuredRow
        part="Held gutter"
        note="What a run's later messages stand in the avatar's place — the same box, so every body in the run keeps one left edge."
        token="--ds-text-h3-leading"
        select=".rt-ds-chat-message-gutter"
        prop="width"
      />
    </MeasuredSpec>
  );
}
const SPEC_ROWS = 9;

/* ---- props ---------------------------------------------------------------- */

const PROPS: PropDef[] = [
  { name: "sender", type: `"user" | "assistant" | "system"`, desc: <>Who the message is from. Drives which way the row runs, which skin the body takes by default, and what the message calls itself when there is no <Code>name</Code>. <Code>system</Code> centres the message, and only <Code>assistant</Code> renders an avatar.</>, source: "ChatMessage.tsx" },
  { name: "children", type: "ReactNode", desc: <>The message body. The only required content.</>, source: "ChatMessage.tsx" },
  { name: "variant", type: `"filled" | "ghost"`, def: "by sender", desc: <>The body's skin. Unset it is <Code>filled</Code> for the user and <Code>ghost</Code> for everyone else — the asymmetry is what carries authorship when a narrow column flattens the left/right alignment. Override it per message when a product needs the other pairing, but pick one and keep it.</>, source: "ChatMessage.tsx" },
  { name: "group", type: `"first" | "middle" | "last"`, desc: <>Position in a run of consecutive messages from one sender. All three tighten the sender-side corners so the run reads as one block; <Code>first</Code> also opens it, drawing the avatar and the name, while <Code>middle</Code> and <Code>last</Code> draw neither and hold the avatar's place in the gutter instead. Leave unset for a message standing on its own.</>, source: "ChatMessage.tsx" },
  { name: "avatar", type: "ReactNode", desc: <>Picture of the sender, beside the message, and the row the name is centred against. <Code>Avatar</Code> belongs here — a circle for a person, a rounded square for a system or a bot. <strong>Renders for <Code>assistant</Code> only</strong>: the slot is ignored for <Code>user</Code>, whose side and tint already carry authorship, and for <Code>system</Code>, which has no author. In a run, pass it on <strong>every</strong> message: it is drawn once and its place is held on the rest.</>, source: "ChatMessage.tsx" },
  { name: "name", type: "ReactNode", desc: <>The sender's name, on the avatar's row. When present it becomes the message's accessible name, so a reader hears who is talking first. In a run it is drawn once, on the message that opens it — a <Code>string</Code> name still names the later messages to a screen reader, which reads them out of the run's context.</>, source: "ChatMessage.tsx" },
  { name: "metadata", type: "ReactNode", desc: <>The row below the body — <Code>ChatMessageMetadata</Code> is what usually goes here.</>, source: "ChatMessage.tsx" },
  { name: "label", type: "string", def: `"Message from you" · "Message from the assistant" · "System message"`, desc: <>The accessible name used when there is no <Code>name</Code> to point at. Set it for a named assistant, or for a localized build — the defaults are English sentences, not identifiers.</>, source: "ChatMessage.tsx" },
  { name: "className", type: "string", desc: <>Merged onto the root <Code>&lt;article&gt;</Code>.</>, source: "ChatMessage.tsx" },
  { name: "style", type: "CSSProperties", desc: <>Inline styles on the root <Code>&lt;article&gt;</Code>.</>, source: "ChatMessage.tsx" },
];

/* ========================================================================== */

const meta: Meta<typeof ChatMessage> = {
  title: "Components/Chat/ChatMessage",
  component: ChatMessage,
  parameters: {
    controls: { disable: true },
    docs: {
      description: {
        component:
          "**ChatMessage** is one turn in a conversation: who said it, what they said, and what " +
          "happened to it afterwards. It is a single component — the bubble is not a second thing to " +
          "wrap your content in, it is the `variant` and `group` props on this one. The sender drives " +
          "alignment and the default skin: the person typing gets a tinted bubble on their side, the " +
          "answer coming back is plain text on the page. Every message is an `<article>` that names " +
          "itself, so a reader can move through a transcript one message at a time.",
      },
    },
  },
};
export default meta;
type Story = StoryObj<typeof ChatMessage>;

/** Anatomy — the labelled parts and the three senders. The token spec closes Usage. */
export const Anatomy: Story = {
  render: () => (
    <Page maxWidth={900}>
      <PageHeader title="ChatMessage · Anatomy" standfirst={DEFINITION} />
      <Section
        title="The parts"
        lead="A message is a picture of the speaker beside a column: their name, what they said, and what happened to it. Only the body is required — but the ORDER never changes, so a transcript scans the same way all the way down. The callouts are pinned onto a live message; the legend spells each one out."
      >
        <AnatomyDiagram />
        <AnatomyLegend parts={ANATOMY_PARTS} />
        <Caption>
          The whole message is one <Mono>&lt;article&gt;</Mono>, so assistive technology can step
          through a transcript a message at a time instead of a line at a time.
        </Caption>
      </Section>

      <Rule />

      <Section
        title="The three senders"
        lead="Sender is not a colour switch — it decides which side the message sits on, which skin the body takes, and whether there is an author to picture at all."
      >
        <Flex direction="column" gap="4">
          <Scenario
            label="ASSISTANT"
            caption={<>Left, plain text, avatar and name present. The answer reads as page copy rather than as something in a box.</>}
          >
            <Box style={{ maxWidth: 560 }}>
              <ChatMessage sender="assistant" avatar={ASSISTANT_AVATAR} name="Assistant">
                {SHORT_ANSWER}
              </ChatMessage>
            </Box>
          </Scenario>
          <Scenario
            label="USER"
            caption={<>Right, tinted, and no avatar — one is ignored here if you pass it. The reader knows their own messages from the side and the tint, so a face on their own words adds nothing the row has not already said.</>}
          >
            <Box style={{ maxWidth: 560 }}>
              <ChatMessage sender="user">
                Switch the brand accent to teal and check the contrast first.
              </ChatMessage>
            </Box>
          </Scenario>
          <Scenario
            label="SYSTEM"
            caption={<>Centred, and the avatar slot is dropped — a notice from the application has no author to picture.</>}
          >
            <Box style={{ maxWidth: 560 }}>
              <ChatMessage sender="system" avatar={ASSISTANT_AVATAR}>
                Theme updated.
              </ChatMessage>
            </Box>
          </Scenario>
        </Flex>
      </Section>
    </Page>
  ),
};

/** Usage — a real conversation, the width behaviour, runs of messages, the one common mistake, and
 *  the live token spec that closes the page. */
export const Usage: Story = {
  parameters: { a11y: { context: { exclude: [DODONT_LABEL] } } },
  render: (_args, { globals }) => (
    <Page maxWidth={900}>
      <PageHeader title="ChatMessage · Usage" standfirst={DEFINITION} />
      <Section
        title="A conversation, not a component"
        lead="This is what the pairing is for. The person's messages are tinted and on the right; the answers are plain text on the left, where a paragraph can be read as a paragraph. Nothing about the assistant's turn is boxed in, and nothing about the person's turn is ambiguous."
      >
        <Flex direction="column" gap="4" style={{ maxWidth: 620 }}>
          <ChatMessage
            sender="user"
            metadata={<ChatMessageMetadata timestamp={<Timestamp value="2026-07-29T14:29:00Z" format="time" />} status="read" />}
          >
            Switch the brand accent to teal, but check the contrast before you write anything.
          </ChatMessage>

          <ChatMessage sender="system">Theme preview started.</ChatMessage>

          <ChatMessage
            sender="assistant"
            avatar={ASSISTANT_AVATAR}
            name="Assistant"
            metadata={<ChatMessageMetadata timestamp={<Timestamp value="2026-07-29T14:31:00Z" format="time" />} footer="Answered in 4.2s" />}
          >
            {LONG_ANSWER}
          </ChatMessage>
        </Flex>
        <Caption>
          The long answer is the point of the example: it wraps at 80% of the column, so the eye has a
          consistent line to return to, and the ragged right edge stops a paragraph from reading as a
          block of colour.
        </Caption>
      </Section>

      <Rule />

      <Section
        title="Width, at both ends of the range"
        lead="The body is clamped to 80% of its column — but never below 280px, and never past the column itself. The floor is the part that matters: 80% of a phone-width column is a ribbon, and a conversation is read on phones."
      >
        <Flex direction="column" gap="4">
          <Scenario
            label="NARROW · 320px"
            caption="The percentage would have given the paragraph 256px. The floor overrides it and the message takes the full column instead."
          >
            <Box style={{ width: 320, maxWidth: "100%" }}>
              <ChatMessage sender="assistant" name="Assistant">{LONG_ANSWER}</ChatMessage>
            </Box>
          </Scenario>
          <Scenario
            label="WIDE · 860px"
            caption="The percentage governs here, and the answer stops short of the full width — a line that long is hard to return from."
          >
            <Box style={{ width: 860, maxWidth: "100%" }}>
              <ChatMessage sender="assistant" name="Assistant">{LONG_ANSWER}</ChatMessage>
            </Box>
          </Scenario>
        </Flex>
      </Section>

      <Rule />

      <Section
        title="Runs of messages"
        lead="When someone sends three things in a row, three separate rounded boxes read as three separate events. Set group on each one and the run becomes one turn: the sender-side corners tighten, and the speaker is introduced ONCE — one face, one name, at the top of the run."
      >
        <Grid columns={{ initial: "1", sm: "2" }} gap="4">
          <Scenario label="UNGROUPED" caption="Three standalone messages. Every corner is full, and the run reads as three unrelated events.">
            <Flex direction="column" gap="1" style={{ maxWidth: 360 }}>
              <ChatMessage sender="user">One more thing.</ChatMessage>
              <ChatMessage sender="user">Keep the old accent in the changelog.</ChatMessage>
              <ChatMessage sender="user">And note the date.</ChatMessage>
            </Flex>
          </Scenario>
          <Scenario label="GROUPED" caption="first · middle · last. The tightened inside corners bind the three into one turn.">
            <Flex direction="column" gap="1" style={{ maxWidth: 360 }}>
              <ChatMessage sender="user" group="first">One more thing.</ChatMessage>
              <ChatMessage sender="user" group="middle">Keep the old accent in the changelog.</ChatMessage>
              <ChatMessage sender="user" group="last">And note the date.</ChatMessage>
            </Flex>
          </Scenario>
        </Grid>
        <Box pt="4">
          <Scenario
            label="ONE FACE PER RUN"
            caption={<>All three messages are given the same <Code>avatar</Code> and the same <Code>name</Code>. Only the one that opens the run draws them; the other two hold the picture's place in the gutter, which is what keeps every body in the run on one left edge. Pass them on every message — the component decides where they show.</>}
          >
            <Flex direction="column" gap="1" style={{ maxWidth: 460 }}>
              <ChatMessage sender="assistant" avatar={ASSISTANT_AVATAR} name="Assistant" group="first">
                Two things, then.
              </ChatMessage>
              <ChatMessage sender="assistant" avatar={ASSISTANT_AVATAR} name="Assistant" group="middle">
                The tint follows the accent, so it never needs a second value.
              </ChatMessage>
              <ChatMessage sender="assistant" avatar={ASSISTANT_AVATAR} name="Assistant" group="last">
                And the small print stays on the page ground, where it is easiest to read.
              </ChatMessage>
            </Flex>
          </Scenario>
        </Box>
      </Section>

      <Rule />

      <Section
        title="Naming the speaker"
        lead="A message announces itself before it announces its content. With a name, that IS the name. Without one it falls back to a sentence — and if your assistant has a name of its own, say so."
      >
        <Flex direction="column" gap="3" style={{ maxWidth: 620 }}>
          <ChatMessage sender="assistant" avatar={ASSISTANT_AVATAR} name="Navi">
            Named in the layout, and named to a screen reader by the same words.
          </ChatMessage>
          <ChatMessage sender="assistant" avatar={ASSISTANT_AVATAR} label="Message from Navi">
            No visible name, but the message still introduces itself — and the wording is yours to set.
          </ChatMessage>
        </Flex>
        <Caption>
          Reach for <Code>label</Code> whenever the default sentence would be wrong: a named assistant,
          a group thread with several people, or any build that is not in English.
        </Caption>
      </Section>

      <Rule />

      <Section
        title="Pick one pairing and keep it"
        lead="This is the mistake the props make easy. Tinting both sides feels tidier and costs the reader the fastest signal they have — once every message is a coloured box, only the side tells them who is talking, and the side is the first thing a narrow column takes away."
      >
        <Grid columns={{ initial: "1", sm: "2" }} gap="3">
          <DoDont kind="do" bare note="One side filled, one side plain. Who said what survives a squeeze and a greyscale print.">
            <Flex direction="column" gap="2" style={{ width: "100%" }}>
              <ChatMessage sender="user">Check the contrast first.</ChatMessage>
              <ChatMessage sender="assistant">Measured — everything clears the floor.</ChatMessage>
            </Flex>
          </DoDont>
          <DoDont kind="dont" bare note="Both sides filled. The tint means nothing, and only the alignment says who is talking.">
            <Flex direction="column" gap="2" style={{ width: "100%" }}>
              <ChatMessage sender="user" variant="filled">Check the contrast first.</ChatMessage>
              <ChatMessage sender="assistant" variant="filled">Measured — everything clears the floor.</ChatMessage>
            </Flex>
          </DoDont>
        </Grid>
        <Caption>
          Two more habits worth keeping: give a run of messages its <Code>group</Code> positions rather
          than letting three boxes stack, and put <Code>ChatMessageMetadata</Code> in the{" "}
          <Code>metadata</Code> slot rather than as a child — the slot lines its left edge up with the
          body's, tinted bubble or not.
        </Caption>
      </Section>

      <Rule />

      {/* The closing reference section. The provider is what makes the table live: every measured row
          re-reads its value when this key changes, so an accent/appearance flip re-resolves the spec. */}
      <HexThemeKey.Provider value={`${globals.accent}-${globals.appearance}-${globals.contrast}`}>
        <Section
          title="Tokens"
          lead="Every row below is read off a rendered slice of a transcript — the end of the person's run, then two from the assistant — and checked against the token it names, so the table reports what the component paints rather than what the tokens say. Zero net-new tokens: the tint, the text, the corners, the inset and both parts of the header row are all roles the rest of the system already uses."
        >
          <ChatMessageSpec />
          <Caption>
            The tint is an <strong>accent-aware</strong> role, so it follows a brand's collision shift
            instead of pinning one blue — which is why the contrast behind it had to be measured across
            every accent rather than once.
          </Caption>
        </Section>
      </HexThemeKey.Provider>
    </Page>
  ),
  play: async ({ canvasElement }) => {
    // The token table's EVIDENCE, asserted at runtime — every row read a REAL rendered part of a real
    // message (the tint, the body ink, both corner radii, the inset, the name's colour and weight),
    // never a probe this story painted. `rows: N` is the exact form: an "at least one" floor is
    // satisfied by a table that has not filled in yet.
    const rows = await awaitMeasuredRows(canvasElement, { rows: SPEC_ROWS });
    if (rows.measured !== SPEC_ROWS || rows.unproven !== 0) {
      throw new Error(`expected ${SPEC_ROWS} measured / 0 unproven token rows, got ${rows.measured} / ${rows.unproven}`);
    }
  },
};

/* ---- Props ----------------------------------------------------------- */

type PropsArgs = {
  sender: ChatMessageSender;
  variant: "auto" | ChatMessageVariant;
  group: "none" | ChatMessageGroup;
  body: string;
  name: string;
  label: string;
  showAvatar: boolean;
  showMetadata: boolean;
  timestamp: string;
  status: "none" | ChatMessageStatus;
};

/** Props — the live, args-driven message. Every capability is a control. */
export const Props: StoryObj<PropsArgs> = {
  args: {
    sender: "user",
    variant: "auto",
    group: "none",
    body: "Switch the brand accent to teal, but check the contrast before you write anything.",
    name: "",
    label: "",
    showAvatar: true,
    showMetadata: true,
    timestamp: "2:29 PM",
    status: "read",
  },
  argTypes: {
    sender: { control: "inline-radio", options: ["user", "assistant", "system"], description: "Who the message is from. Drives the side, the default skin, and the fallback accessible name. System centres the message, and only assistant renders an avatar.", table: { category: "Message" } },
    variant: { control: "inline-radio", options: ["auto", "filled", "ghost"], description: "The body's skin. auto = filled for the user, ghost for everyone else.", table: { category: "Message" } },
    group: { control: "inline-radio", options: ["none", "first", "middle", "last"], description: "Position in a run of consecutive messages. Tightens the sender-side corners; first opens the run and draws the avatar and the name, while middle and last draw neither and hold the avatar's place in the gutter.", table: { category: "Message" } },
    body: { control: "text", description: "The message body. Make it long to see the width clamp.", table: { category: "Content" } },
    name: { control: "text", description: "The sender's name above the body. When set it becomes the message's accessible name.", table: { category: "Content" } },
    label: { control: "text", description: "The accessible name used when there is no visible name. Empty falls back to a plain-English sentence.", table: { category: "Content" } },
    showAvatar: { control: "boolean", description: "Pass an avatar to the slot. It renders on the assistant's side only — switch sender to user or system and it is ignored — and inside a run it is drawn on the first message only, with its place held on the rest.", table: { category: "Content" } },
    showMetadata: { control: "boolean", description: "Render a metadata row in the slot below the body.", table: { category: "Small print" } },
    timestamp: { control: "text", description: "Timestamp shown in the metadata row. Empty hides it.", table: { category: "Small print" } },
    status: { control: "inline-radio", options: ["none", "sending", "sent", "delivered", "read", "error"], description: "Delivery status shown in the metadata row.", table: { category: "Small print" } },
  },
  parameters: { controls: { disable: false } },
  render: (args: PropsArgs) => {
    const { sender, variant, group, body, name, label, showAvatar, showMetadata, timestamp, status } = args;
    return (
      <Page maxWidth="none">
        <PageHeader title="ChatMessage · Props" standfirst={DEFINITION} />
        <Box style={{ padding: "16px 0 8px", maxWidth: 620 }}>
          <ChatMessage
            sender={sender}
            variant={variant === "auto" ? undefined : variant}
            group={group === "none" ? undefined : group}
            name={name || undefined}
            label={label || undefined}
            avatar={showAvatar ? ASSISTANT_AVATAR : undefined}
            metadata={
              showMetadata ? (
                <ChatMessageMetadata
                  timestamp={timestamp || undefined}
                  status={status === "none" ? undefined : status}
                />
              ) : undefined
            }
          >
            {body}
          </ChatMessage>
        </Box>
        <PropsLead />
        <Rule />
        <Section title="Props reference" lead={<>Every prop <Code>ChatMessage</Code> accepts. The body's skin and its corners are props here rather than a second component, so a message is configured in one place.</>}>
          <PropTable rows={PROPS} />
        </Section>
        <Section title="What goes in the slots" lead={<>Three of the props take content rather than a value. <Code>Avatar</Code> belongs in <Code>avatar</Code>, <Code>ChatMessageMetadata</Code> in <Code>metadata</Code>, and the body is whatever the message actually says.</>}>
          <Flex direction="column" gap="2">
            <Text as="p" size="2" style={{ color: "var(--ds-text-weak)", lineHeight: 1.6 }}>
              A tool log, an image, a table — anything composed goes in as <Code>children</Code>, and
              the clamp applies to it exactly as it does to a paragraph.
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
      <PageHeader title="ChatMessage · History" standfirst={DEFINITION} />
      <Section title="Decisions" lead="The rulings this component encodes.">
        <Flex direction="column" gap="3">
          <Decision id="[[chat-bubble]] · One component, not two">
            The bubble is <strong>folded in</strong>. There is one place to put a name, one place to
            put small print, and one component to reach for — rather than a frame that renders no
            surface at all plus a second component every caller has to remember to wrap their content
            in, with two competing <Code>name</Code> slots to choose between.
          </Decision>
          <Decision id="[[chat-bubble]] · The two sides are told apart by SKIN, not by tint">
            The default pairing is <strong>asymmetric</strong>: the user's message is{" "}
            <Code>filled</Code>, the assistant's is <Code>ghost</Code>. Tinting both sides leaves the
            side alignment doing all the work of saying who is talking — and side alignment is exactly
            what collapses first in a narrow column. Asymmetry survives it, and it hands a long answer
            back the space a bubble would have spent on padding.
          </Decision>
          <Decision id="[[chat-bubble]] · The tint is the accent's weakest step, and it was measured">
            The filled bubble takes <Mono>--ds-fill-accent-weak</Mono>. Every accent was composited
            against both appearances and every text role that lands on the bubble was measured: body
            copy clears the 4.5 floor everywhere, and so does the small print underneath. The next step
            up fails that small print on most accents, which is why it is not used here.
          </Decision>
          <Decision id="[[chat-bubble]] · The body never runs the full width, and never gets narrow">
            The body is clamped to <strong>80% of the column, floored at 280px, capped at the column
            itself</strong>. The floor matters more than the ceiling: 80% of a 320px column is an
            unreadable ribbon, and a conversation is read on phones.
          </Decision>
          <Decision id="[[chat-bubble]] · A message says what it is, in words">
            Without a <Code>name</Code> the message still names itself — <em>“Message from you”</em>,{" "}
            <em>“Message from the assistant”</em> — and the <Code>label</Code> prop overrides that.
            Interpolating the raw prop value into the accessible name reads an identifier out loud to
            the one audience that cannot see the layout telling them the same thing.
          </Decision>
          <Decision id="[[chat-avatar-header-row]] · The avatar owns the header row">
            The name's row is grown to the <strong>avatar's own box</strong> and the name is centred in
            it, so the picture and the words are one unit and the bottom of the picture is where the
            message starts — one line, at every size. Left to its own height, a one-line name row put
            the avatar's bottom edge part-way down the first line of the body: a 30px picture ending
            10px into a 16px line, aligned with nothing.
          </Decision>
          <Decision id="[[chat-avatar-header-row]] · Without a name, the first line of the body is the header">
            Same rule, other shape: with no name to centre, the <strong>body's first line</strong> is
            nudged down to share the avatar's centre instead. A filled bubble already holds its first
            line an inset below its own top edge, so the nudge subtracts that rather than counting it
            twice.
          </Decision>
          <Decision id="[[chat-avatar-header-row]] · One face and one name per run">
            A run is one person talking, so it gets <strong>one introduction</strong>. The message that
            opens the run draws the avatar and the name; the rest draw neither and stand an empty box
            the avatar's width in its place, so every body in the run keeps the same left edge. Pass
            both on every message of the run — the component decides where they show. A string{" "}
            <Code>name</Code> still reaches the accessibility tree on the later messages, which a
            reader may well arrive at out of the run's context.
          </Decision>
          <Decision id="[[chat-density]] · One type lane, no density prop">
            The message rides the global <strong>text lane</strong>, like every other text-shaped
            component in the system. There is no per-message density channel forking the padding, the
            gap and the radius three ways.
          </Decision>
        </Flex>
      </Section>

      <Rule />

      <Section title="Changelog" lead="Notable changes, newest first — grows as the component evolves.">
        <Flex direction="column" gap="3">
          <Decision id="0.9.0 · header rhythm and runs">
            The avatar took over the header row: the name's row is now the avatar's own box with the
            name centred in it, so the picture's bottom edge and the body's first line meet on one
            line instead of the picture ending mid-sentence. A message with an avatar and no name
            centres its first body line against the picture by the same rule. Runs introduce their
            speaker once — one face, one name — and hold the picture's place on the rest of the run so
            the bodies stay on one left edge.
          </Decision>
          <Decision id="0.9.0">
            Initial <Code>System/Chat/ChatMessage</Code> — the bubble folded in as{" "}
            <Code>variant</Code>/<Code>group</Code>; the filled/ghost default pairing on a measured
            tint; the clamped body width; a plain-English accessible name with a{" "}
            <Code>label</Code> override.
          </Decision>
        </Flex>
      </Section>
    </Page>
  ),
};
