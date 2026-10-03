import { useLayoutEffect, useRef, useState, type CSSProperties } from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { Box, Code, Flex, Grid, Text } from "@radix-ui/themes";
import {
  ArrowsClockwise, ChartBar, ChatsCircle, Gear, House, Paperclip, Sparkle, Users,
} from "@phosphor-icons/react";
import { AppShell } from "./AppShell";
import { Avatar } from "./Avatar";
import { Button } from "./Button";
import { EmptyState } from "./EmptyState";
import { IconButton } from "./IconButton";
import { Link } from "./Link";
/* The compound parts (`.Item`, `.Heading`) hang off the DEFAULT export of each nav — the named
   export is the root component only. */
import SideNav from "./SideNav";
import TopNav from "./TopNav";
import { Timestamp } from "./Timestamp";
import { ChatComposer } from "./ChatComposer";
import { ChatLayout, ChatLayoutScrollButton } from "./ChatLayout";
import { ChatMessage } from "./ChatMessage";
import { ChatMessageMetadata } from "./ChatMessageMetadata";
import { ChatSystemMessage } from "./ChatSystemMessage";
import { ChatToolCalls, type ChatToolCallItem } from "./ChatToolCalls";
import {
  AnatomyLegend, Caption, Decision, DoDont, DODONT_LABEL, dotStyle, HexThemeKey, hLine, MeasuredRow, MeasuredSpec,
  Mono, NoteRow, Page, PageHeader, PropsLead, type PropDef, PropTable, Rule, Scenario, Section, tick,
} from "./_storyKit";
import { SizeContext } from "../../theme/SizeContext";
import { awaitMeasuredRows } from "../../foundations/_assert";

/** The one definition of this component — the standfirst every page of it opens with. */
const DEFINITION = (
  <>
    The whole conversation as one thing: a transcript that follows itself as answers arrive, a composer
    docked under it, and one control for getting back to the bottom. Give it a name, a height, messages, and
    a composer — it owns the scrolling, the follow-the-newest behaviour, the empty state, and the
    announcement region.
  </>
);

/* The layout is only ever seen holding a whole conversation, so the specimens below hold one: a
   person asking this design system to change its own accent, the assistant's working, and the answer
   it came back with. The numbers quoted in that conversation are the system's real ones. */

/* ---- fixtures ------------------------------------------------------------- */

const ASSISTANT_AVATAR = <Avatar radius="medium" fallback={<Sparkle weight="fill" />} />;

/** The way out of a failed send, in the metadata row's own small print ([[container-size-seeding]]). A `Link` wrapped around
 *  a real `<button>`: the row is one line of text, so the action in it is text — a boxed control
 *  beside "Failed" reads as a second scale in a line that has only one. */
function RetryAction() {
  return (
    <Link asChild>
      <button type="button" onClick={() => {}}>Retry</button>
    </Link>
  );
}

const SUMMARY =
  "Teal is clear on every text role that lands on a bubble. Body copy on the tinted user bubble " +
  "bottoms out at 11.86 : 1 and the small print at 4.73 : 1 — the WORST pairings across every accent in "
  + "both appearances, so every reader is at least that clear of the 4.5 floor. I did try the heavier tint "
  + "one step up first — it puts the small print at 3.78 : 1, " +
  "which fails — so the lighter step is what I wrote. The theme file itself is read-only in this " +
  "sandbox, so the last step did not land; the preview above is running the new accent in memory.";

/** The assistant's working — three calls, and the one that could not finish says why, in words. */
const TOOL_RUN: ChatToolCallItem[] = [
  { name: "read_tokens", target: "src/tokens/semantic.css", duration: "88ms" },
  { name: "measure_contrast", target: "every text role on the bubble", duration: "1.1s" },
  {
    name: "apply_accent",
    status: "error",
    target: "teal",
    errorMessage: "Permission denied — src/tokens/theme.css is read-only in this sandbox.",
  },
];

const EMPTY_SLOT = (
  <EmptyState
    icon={<ChatsCircle />}
    title="No messages yet"
    description="Ask a question and the answer will appear here."
  />
);

/** The conversation every specimen draws from, in the order it happened. */
function Conversation() {
  return (
    <>
      <ChatSystemMessage variant="divider">Today</ChatSystemMessage>

      <ChatMessage
        sender="user"
        metadata={
          <ChatMessageMetadata
            timestamp={<Timestamp value="2026-07-29T14:29:00Z" format="time" />}
            status="read"
          />
        }
      >
        Switch the brand accent to teal, but check the contrast before you write anything.
      </ChatMessage>

      <ChatMessage sender="assistant" avatar={ASSISTANT_AVATAR} name="Assistant">
        {/* Opened, because the point of this turn is the call that FAILED and the sentence saying
            why. Collapsed — the default — a group shows only its latest call's status and name, and
            the reason would be one press away on a page nobody is going to press. */}
        <ChatToolCalls calls={TOOL_RUN} defaultOpen />
      </ChatMessage>

      <ChatSystemMessage>Theme updated</ChatSystemMessage>

      <ChatMessage
        sender="assistant"
        avatar={ASSISTANT_AVATAR}
        name="Assistant"
        metadata={
          <ChatMessageMetadata
            timestamp={<Timestamp value="2026-07-29T14:31:00Z" format="time" />}
            footer="Answered in 4.2s"
          />
        }
      >
        {SUMMARY}
      </ChatMessage>

      <ChatMessage
        sender="user"
        metadata={
          <ChatMessageMetadata
            status="error"
            footer={<RetryAction />}
          />
        }
      >
        Write it to the file anyway — I will unlock the sandbox.
      </ChatMessage>
    </>
  );
}

const DEMO_COMPOSER = (
  <ChatComposer
    onSubmit={() => {}}
    label="Message the assistant"
    placeholder="Ask about a token, a contrast pair, a component…"
  />
);

/* ---- the three destinations -----------------------------------------------
   Three different things can go wrong around a composer, and each sentence goes
   next to the thing it is about: the SESSION's condition above the dock, a SENT
   MESSAGE's failure on that message, and the DRAFT's own problem under the dock.
   The two fixtures below are the outer two; the middle one is a metadata row on
   the message itself. Usage stands all three up at once. */

/** The SESSION's condition, for the slot above the dock. That slot paints no surface of its own, so
 *  a line in it is a glyph and a sentence sitting on whatever the layout is already sitting on. */
const SESSION_LINE = (
  <Flex align="center" gap="2" style={{ color: "var(--ds-text-weak)" }}>
    <ArrowsClockwise size={14} aria-hidden />
    <Text size="1" style={{ color: "var(--ds-text-weak)" }}>
      Reconnecting — anything you send now is queued until the connection is back.
    </Text>
  </Flex>
);

/** The DRAFT's own problem, for the composer's status line: the file just attached to this message
 *  is too big to send. It is about what is in the box right now, which is the test for that slot. */
const DRAFT_COMPOSER = (
  <ChatComposer
    onSubmit={() => {}}
    label="Message the assistant"
    defaultValue="Here is the full sweep — every accent, both appearances."
    status={{ tone: "error", message: "accent-sweep.csv is 48 MB. The limit is 25 MB." }}
    actions={
      <IconButton type="button" priority="tertiary" aria-label="Attach a file">
        <Paperclip aria-hidden />
      </IconButton>
    }
  />
);

/* ---- anatomy diagram ------------------------------------------------------
   The layout's parts are STACKED BANDS rather than a row of siblings, so the
   callouts hang in a left gutter and run a leader into the part they name.
   Positions are MEASURED off the live specimen, because the dock's height moves
   with the composer inside it and every band moves with the size toolbar. */

const GUTTER = 88;
/** Where a leader turns the corner, and the closest two dots may sit. */
const ELBOW = GUTTER - 30;
const MIN_GAP = 26;
/** Tall parts are pinned near their TOP edge; short ones at their middle. */
const EDGE_INSET = 16;

/** [callout number, CSS selector inside the diagram frame] */
const PINS: [number, string][] = [
  [1, ".rt-ds-chat-layout-log"],
  [2, ".rt-ds-chat-layout-content"],
  [3, ".rt-ds-chat-layout-dock"],
  [4, ".rt-ds-chat-layout-dock textarea"],
];

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
      // Declared in visual order, so one forward pass keeps the dots from stacking on each other.
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
      // Only write when something moved: the frame's height is derived from these positions, so an
      // unconditional write would loop the observer against its own output.
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
          position: "relative", paddingLeft: GUTTER, paddingTop: 8, maxWidth: 660,
          minHeight: lastDot ? lastDot + 16 : undefined,
        }}
      >
        <Box ref={specimen}>
          {/* The dashed edge is DIAGRAM FURNITURE: the layout paints no boundary of its own, so
              without it callout 1 would point at empty space. */}
          <Box style={{ outline: "1px dashed var(--ds-stroke-weak)", outlineOffset: 2, borderRadius: "var(--ds-radius-4)" }}>
            <ChatLayout
              label="Conversation with the assistant"
              composer={DEMO_COMPOSER}
              style={{ height: 330 }}
            >
              <ChatMessage sender="user">
                Switch the brand accent to teal, but check the contrast first.
              </ChatMessage>
              <ChatMessage
                sender="assistant"
                avatar={ASSISTANT_AVATAR}
                name="Assistant"
                metadata={<ChatMessageMetadata timestamp={<Timestamp value="2026-07-29T14:31:00Z" format="time" />} />}
              >
                Body copy on the tinted bubble bottoms out at 11.86 : 1 and the small print at 4.73 : 1
                — the worst pairings across every accent, not this one, so both clear the floor everywhere.
              </ChatMessage>
            </ChatLayout>
          </Box>
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
  [1, "The log", "a ChatMessageList — the scrolling half, and the only thing on the page that scrolls. It is a named, announcing region — the first stop for a keyboard user — and it is the node both scroll engines are attached to."],
  [2, "The transcript", "the turns themselves, stacked oldest-first and anchored to the bottom edge. It carries the space between turns, and the clearance that keeps the newest message clear of the fade above the dock."],
  [3, "The dock", "the bottom edge of the layout: opaque, on the container's own background, holding the composer. Above it a short gradient dissolves the outgoing message into that background instead of cutting it in half."],
  [4, "The composer", "whatever you put in the composer slot. The dock is a frame around it, not a replacement for it — the input keeps its own border, its own ring and its own send control."],
];

/** The real scroll control, shown on its own.
 *
 *  It is positioned to float ABOVE the dock it belongs to, so a specimen has to stand a dock line in
 *  for it: the column pushes a zero-height anchor to its own bottom edge, and the control rises out
 *  of that into the space reserved above. Framing it as a plain box instead puts the control outside
 *  the box, on top of whatever text sits above — which is exactly what it did on first render here. */
function ScrollControlSpecimen({ hasNewMessages }: { hasNewMessages: boolean }) {
  return (
    <Flex direction="column" justify="end" style={{ height: 52, width: "100%" }} data-size-lesson="the scroll control holds step 2 — it floats over the dock, not in the ambient row">
      <Box style={{ position: "relative" }}>
        <ChatLayoutScrollButton
          isVisible
          hasNewMessages={hasNewMessages}
          idleLabel="Scroll to latest"
          newMessagesLabel="New messages"
          onClick={() => {}}
        />
      </Box>
    </Flex>
  );
}

/* ---- token spec -----------------------------------------------------------
   The layout paints three things: the dock's surface, the band that fades into
   it, and the floating control. Everything else it does is rhythm. Both are read
   off a live instance below — the layout for the bands, and a real scroll control
   for the pill, because a control that only appears once a reader has scrolled
   away cannot be reached from a page that is static on view. */

function LayoutSpec() {
  return (
    <MeasuredSpec
      render={() => (
        /* PINNED TO ONE TIER, deliberately. The layout rides the container lane, so its inset and its
           turn rhythm are a LADDER — 12 / 16 / 20px as the global size climbs. A row names one step,
           so measured against whatever tier the toolbar happens to be on it would be true at one
           setting and false at the other two. Pinning the measured instance makes every row below
           true at any toolbar setting, and each row that moves with the lane says which step it is
           quoting. The sibling list spec does the same thing, one instance per tier. */
        <SizeContext.Provider value="small">
          <Flex direction="column" gap="4">
            <Box style={{ width: 420 }}>
              <ChatLayout
                label="Measured conversation"
                composer={DEMO_COMPOSER}
                /* Present so the session row below has a real line to read. The slot only renders
                   when something is in it, and a row cannot measure an element that never mounts. */
                sessionStatus={SESSION_LINE}
                style={{ height: 220 }}
              >
                <ChatMessage sender="user">One.</ChatMessage>
                <ChatMessage sender="assistant">Two.</ChatMessage>
              </ChatLayout>
            </Box>
            <ScrollControlSpecimen hasNewMessages={false} />
          </Flex>
        </SizeContext.Provider>
      )}
    >
      <MeasuredRow
        part="Dock surface"
        note="What the dock is filled with, and the one paint a caller overrides."
        token="--ds-bg-base"
        select=".rt-ds-chat-layout-dock"
        prop="background-color"
      />
      <MeasuredRow
        part="Fade band"
        pseudo="::before"
        note="The dissolve above the dock — tall enough to cover the scroll control's whole travel."
        token="--ds-space-48"
        select=".rt-ds-chat-layout-fade"
        prop="height"
      />
      <MeasuredRow
        part="Dock inset"
        note="The space around the composer. Climbs with the size lane; the small step is quoted."
        token="--ds-space-12"
        select=".rt-ds-chat-layout-dock"
        prop="padding-block-start"
      />
      <MeasuredRow
        part="Turn spacing"
        note="The rhythm a transcript is read at. Climbs with the size lane; small step quoted."
        token="--ds-space-12"
        select=".rt-ds-chat-layout-content"
        prop="row-gap"
      />
      <MeasuredRow
        part="Newest-message clearance"
        note="The space held under the last turn, so the newest message is never the one dissolving."
        token="--ds-space-16"
        select=".rt-ds-chat-layout-content"
        prop="padding-block-end"
      />
      <MeasuredRow
        part="Session line gap"
        note="What holds the conversation's own status line off the dock. One step at every tier."
        token="--ds-space-8"
        select=".rt-ds-chat-layout-session"
        prop="padding-block-end"
      />
      <MeasuredRow
        part="Scroll control shape"
        note="The control is a pill in both of its states, so the swap changes width and nothing else."
        token="--ds-radius-full"
        select=".rt-ds-chat-layout-scroll-control"
        prop="border-radius"
      />
      <MeasuredRow
        part="Scroll control lift"
        note="What separates a control floating over the transcript from one sitting in it."
        token="--ds-shadow-3"
        select=".rt-ds-chat-layout-scroll-control"
        prop="box-shadow"
      />
      <MeasuredRow
        part="Scroll control entrance"
        note="How long the control takes to arrive — named, so reduced motion can silence it."
        token="--ds-duration-fast"
        select=".rt-ds-chat-layout-scroll-control"
        prop="animation-duration"
      />
      <NoteRow
        part="Scroll spring"
        value="a frame-by-frame animation of the scroll POSITION — no token, and no CSS"
        radix="reduced motion replaces it with a jump"
      />
    </MeasuredSpec>
  );
}
const SPEC_ROWS = 9;

/** Wait until every token row's painted verdict agrees with the evidence recorded on its node — see
 *  the note in Usage's play for why the two can be a commit apart here. Bounded, and it asserts
 *  nothing: `awaitMeasuredRows` still does all the judging. */
async function waitForVerdicts(root: Element, timeout = 4000): Promise<void> {
  const deadline = Date.now() + timeout;
  for (;;) {
    const rows = Array.from(root.querySelectorAll("[data-token-row]"));
    const settled = rows.every((r) => {
      const ev = (r as Element & { __dsRowEvidence?: { reason: string } }).__dsRowEvidence;
      if (!ev) return r.getAttribute("data-token-row") === "note";
      return r.getAttribute("data-token-row") === (ev.reason ? "unproven" : "measured");
    });
    if (settled || Date.now() > deadline) return;
    await new Promise((r) => requestAnimationFrame(() => r(null)));
  }
}

/* ---- props ---------------------------------------------------------------- */

const PROPS: PropDef[] = [
  { name: "label", type: "string", locked: true, desc: <><strong>Required.</strong> What this conversation is, in words. It names the scrolling region, which is the first thing a keyboard user lands on.</>, source: "ChatLayout.tsx" },
  { name: "composer", type: "ReactNode", locked: true, desc: <><strong>Required.</strong> What goes in the dock. <Code>ChatComposer</Code> is what belongs here; the dock frames it and never replaces it.</>, source: "ChatLayout.tsx" },
  { name: "children", type: "ReactNode", desc: <>The transcript, oldest first — <Code>ChatMessage</Code>, <Code>ChatSystemMessage</Code>, <Code>ChatToolCalls</Code>.</>, source: "ChatLayout.tsx" },
  { name: "as", type: `"div" | "main" | "section"`, def: `"div"`, desc: <>The root tag, and nothing else. The class, the data attributes and every prop here ride along unchanged. Use <Code>main</Code> when the chat <strong>is</strong> the page and no <Code>AppShell</Code> above it owns the landmark, and <Code>section</Code> with an <Mono>aria-label</Mono> for a chat that is one named region of a larger page. The union is closed, so a tag this component cannot survive is a compile error.</>, source: "ChatLayout.tsx" },
  { name: "emptyState", type: "ReactNode", desc: <>What stands in for a conversation with nothing in it. <Code>EmptyState</Code> belongs here; the dock still shows, because writing the first message is the point.</>, source: "ChatLayout.tsx" },
  { name: "isStreaming", type: "boolean", def: "false", desc: <>Whether an answer is arriving right now. Marks the region busy, so assistive technology reads the finished message once instead of re-reading each partial.</>, source: "ChatLayout.tsx" },
  { name: "sessionStatus", type: "ReactNode", desc: <>One line about the <strong>conversation&rsquo;s own condition</strong> — reconnecting, queued, a model being retired. It renders above the dock and outside its border, because it is not about the draft in the box and it is not something that happened in the conversation. A failed send goes on the message; a problem with the draft is the composer&rsquo;s <Code>status</Code>.</>, source: "ChatLayout.tsx" },
  { name: "scrollToLatestLabel", type: "string", def: `"Scroll to latest"`, desc: <>Accessible name for the resting scroll control — the round one, which has no visible text.</>, source: "ChatLayout.tsx" },
  { name: "newMessagesLabel", type: "string", def: `"New messages"`, desc: <>The <strong>visible</strong> label the control takes once messages have arrived out of view.</>, source: "ChatLayout.tsx" },
  { name: "ref", type: "Ref<ChatLayoutHandle>", desc: <>The imperative handle, <strong>not</strong> a DOM ref. It carries one method: <Mono>scrollToBottom()</Mono>.</>, source: "ChatLayout.tsx" },
  { name: "className", type: "string", desc: <>Merged onto the root — the element to give a height to.</>, source: "ChatLayout.tsx" },
  { name: "style", type: "CSSProperties", desc: <>Inline styles on the root. The layout needs a bounded height, or there is nothing to scroll.</>, source: "ChatLayout.tsx" },
];

/* ========================================================================== */

const meta: Meta<typeof ChatLayout> = {
  title: "Components/Chat/ChatLayout",
  component: ChatLayout,
  parameters: {
    controls: { disable: true },
    docs: {
      description: {
        component:
          "**ChatLayout** is the whole conversation as one thing: a transcript that follows itself " +
          "as answers arrive, a composer docked under it, and one control for getting back to the " +
          "bottom. Give it a name, a height, some messages and a composer — it owns the scrolling, " +
          "the follow-the-newest behaviour, the empty state and the announcement region, so nothing " +
          "else has to be wired up.",
      },
    },
  },
};
export default meta;
type Story = StoryObj<typeof ChatLayout>;

/** Anatomy — the labelled bands and the control's two states. The token spec closes Usage. */
export const Anatomy: Story = {
  render: () => (
    <Page maxWidth={940}>
      <PageHeader title="ChatLayout · Anatomy" standfirst={DEFINITION} />
      <Section
        title="The parts"
        lead="Two bands and a floating control. The top band scrolls and holds the conversation; the bottom band holds the composer and never moves. The callouts are pinned onto a live layout — the dock's height follows the composer inside it, so nothing here is drawn by hand."
      >
        <AnatomyDiagram />
        <AnatomyLegend parts={ANATOMY_PARTS} />
        <Caption>
          The dashed edge is part of the diagram, not the component: the layout paints no boundary
          of its own, because it is nearly always sitting inside something that already has one.
          Give it a <strong>bounded height</strong> — from <Code>style</Code>, from a class, or
          from a parent — or there is nothing to scroll.
        </Caption>
      </Section>

      <Rule />

      <Section
        title="One control, two things to say"
        lead="The control appears when the newest message is out of view, and it says which of two situations you are in. Both are the real control; neither is mounted while you are already at the bottom."
      >
        <Grid columns={{ initial: "1", sm: "2" }} gap="4">
          <Scenario
            label="YOU SCROLLED UP"
            caption="Nothing has arrived — you simply moved away. A round arrow, named for a screen reader and unlabelled on screen, because there is nothing to report."
          >
            <ScrollControlSpecimen hasNewMessages={false} />
          </Scenario>
          <Scenario
            label="SOMETHING ARRIVED WHILE YOU WERE AWAY"
            caption="Now there is news, so the control carries it as visible text. Pressing either one takes you to the newest message and puts the conversation back on live."
          >
            <ScrollControlSpecimen hasNewMessages />
          </Scenario>
        </Grid>
        <Caption>
          The pill is wider than the arrow, and that is the whole reason they are two elements
          rather than one that grows: animating a control&rsquo;s width animates layout, and a
          label caught mid-flight is a clipped word. Each state fades and scales in instead.
        </Caption>
      </Section>
    </Page>
  ),
};

/* ---- Usage: the flagship ---------------------------------------------------
   The whole family, in a real page shell, holding a real conversation: this
   system being asked to change its own accent. Static on view — the only thing
   that moves is the button the reader presses. */

/** A message the reader can make arrive, so the follow-and-catch-up behaviour can be SEEN without
 *  the page animating itself. Inert until pressed: [[press-to-see-demos]]'s sanctioned exception — and this page is
 *  the instance that ruling names. */
const SIMULATED = [
  "One more thing — on the tint the small print bottoms out at 4.73 : 1 across every accent, so the Failed label is legible on both sides of the conversation.",
  "I re-ran the sweep across every accent and both appearances: 54 combinations, no failures on body copy or small print.",
  "The read-only sandbox is the only thing standing between this preview and the file. Unlock it and I will write the accent in one call.",
];

function FlagshipShell() {
  const [extra, setExtra] = useState<string[]>([]);

  return (
    <Flex direction="column" gap="3">
      <Flex align="center" gap="3" wrap="wrap">
        <Button
          priority="secondary"
          onClick={() => setExtra((list) => [...list, SIMULATED[list.length % SIMULATED.length]])}
        >
          Simulate incoming message
        </Button>
        <Text size="1" style={{ color: "var(--ds-text-weak)" }}>
          Nothing below moves until you press it.
        </Text>
      </Flex>

      <AppShell
        mainLabel="Assistant"
        /* Pinned to the desktop regime so the specimen stays expanded: no drawer, nothing to
           flash open when the page is viewed. */
        mobileNav={{ breakpoint: "none" }}
        topNav={
          <TopNav end={<Avatar size="sm" fallback="AL" />}>
            <TopNav.Heading
              href="#home"
              logo={<Box style={{ width: 18, height: 18, borderRadius: "var(--ds-radius-2)", background: "var(--ds-fill-accent)" }} />}
            >
              Studio
            </TopNav.Heading>
            <TopNav.Item label="Assistant" href="#assistant" isSelected />
            <TopNav.Item label="Tokens" href="#tokens" />
          </TopNav>
        }
        sideNav={
          <SideNav>
            <SideNav.Item icon={<Sparkle weight="fill" />} label="Assistant" href="#assistant" isSelected />
            <SideNav.Item icon={<House />} label="Overview" href="#overview" />
            <SideNav.Item icon={<ChartBar />} label="Contrast" href="#contrast" />
            <SideNav.Item icon={<Users />} label="Team" href="#team" />
            <SideNav.Item icon={<Gear />} label="Settings" href="#settings" />
          </SideNav>
        }
        footer={
          <Flex align="center" justify="between" width="100%" px="3" py="2">
            <Text size="1" style={{ color: "var(--ds-text-weak)" }}>Accent preview · teal</Text>
            <Text size="1" style={{ color: "var(--ds-text-weak)" }}>Sandbox read-only</Text>
          </Flex>
        }
        style={{
          height: 580, border: "1px solid var(--ds-stroke-weak)",
          borderRadius: "var(--ds-radius-4)", overflow: "hidden",
        }}
      >
        <ChatLayout
          label="Conversation with the assistant"
          composer={DEMO_COMPOSER}
          emptyState={EMPTY_SLOT}
          style={{ height: 420 }}
        >
          <Conversation />
          {extra.map((line, i) => (
            <ChatMessage
              key={i}
              sender="assistant"
              avatar={ASSISTANT_AVATAR}
              name="Assistant"
              metadata={<ChatMessageMetadata timestamp={<Timestamp value="2026-07-29T14:34:00Z" format="time" />} />}
            >
              {line}
            </ChatMessage>
          ))}
        </ChatLayout>
      </AppShell>
    </Flex>
  );
}

/** Usage — the whole family assembled in a page shell, the empty conversation, the one knob a
 *  chat on another surface has to set, and the live token spec that closes the page. */
export const Usage: Story = {
  parameters: { a11y: { context: { exclude: [DODONT_LABEL] } } },
  render: (_args, { globals }) => (
    <Page maxWidth={940}>
      <PageHeader title="ChatLayout · Usage" standfirst={DEFINITION} />
      <Section
        title="A conversation, assembled"
        lead="Everything in this family, in one page shell, holding one real exchange: someone asking this design system to change its own accent, the assistant's working — including the step that failed — and the answer it came back with. Press the button above the shell to make a message arrive; if you are at the bottom the transcript follows it down, and if you have scrolled up the control tells you there is something new."
      >
        <FlagshipShell />
        <Caption>
          Read the conversation for what each part is doing: the tool log shows a failed call with
          its reason <strong>in words</strong> rather than a red dot; the quiet centred line is the
          conversation talking about itself; the last message failed to send and its{" "}
          <strong>Retry</strong> sits in the metadata row — as text, at the row&rsquo;s own size,
          because that row is one line of small print — since retrying is the product&rsquo;s
          decision to offer, not the message&rsquo;s.
        </Caption>
      </Section>

      <Rule />

      <Section
        title="Three things go wrong, and there are three places to say so"
        lead="Something is wrong with the session, with a message that has already been sent, or with the draft still in the box. They are three different subjects and they get three different destinations — each sentence next to the thing it is about. The layout below is carrying all three at once."
      >
        <Box style={{ maxWidth: 560 }}>
          <ChatLayout
            label="Conversation while the connection is down"
            sessionStatus={SESSION_LINE}
            composer={DRAFT_COMPOSER}
            /* Sized to the two turns it holds. The transcript is bottom-anchored, so a taller box
               would open a band of empty log above the first message and read as a gap. */
            style={{ height: 320 }}
          >
            <ChatMessage
              sender="assistant"
              avatar={ASSISTANT_AVATAR}
              name="Assistant"
              metadata={
                <ChatMessageMetadata
                  timestamp={<Timestamp value="2026-07-29T14:31:00Z" format="time" />}
                />
              }
            >
              Body copy on the tinted bubble bottoms out at 11.86 : 1 and the small print at
              4.73 : 1, measured across every accent in both appearances.
            </ChatMessage>
            <ChatMessage
              sender="user"
              metadata={
                <ChatMessageMetadata
                  status="error"
                  footer={<RetryAction />}
                />
              }
            >
              Write it to the file anyway — I will unlock the sandbox.
            </ChatMessage>
          </ChatLayout>
        </Box>

        <Flex direction="column" gap="3">
          <Text as="p" size="2" style={{ color: "var(--ds-text-weak)", lineHeight: 1.6 }}>
            <strong>The session</strong> goes in <Code>sessionStatus</Code>, above the dock and
            outside its border — reconnecting, queued, a model being retired. It is about the
            conversation rather than about what is being typed, and the two neighbouring places both
            say the wrong thing: inside the dock it reads as a note on the draft, and in the
            transcript it reads as something that happened between the two of you.
          </Text>
          <Text as="p" size="2" style={{ color: "var(--ds-text-weak)", lineHeight: 1.6 }}>
            <strong>A message that did not send</strong> goes on that message.{" "}
            <Code>ChatMessageMetadata</Code> reads &ldquo;Failed&rdquo; and its <Code>footer</Code>{" "}
            slot carries the Retry, so the state and the way out arrive together, attached to the one
            message that has to go again. A line under the composer cannot say <em>which</em> message
            it means, and in a thread with two failures it is a sentence about neither.
          </Text>
          <Text as="p" size="2" style={{ color: "var(--ds-text-weak)", lineHeight: 1.6 }}>
            <strong>The draft in the box</strong> is the composer&rsquo;s own <Code>status</Code>,
            under the dock, where every field in this system puts its message — a file over the size
            limit, a message past the length the model will take. The reader is looking at the thing
            being described while they read the description of it.
          </Text>
        </Flex>

        <Caption>
          Note what is <strong>not</strong> here: nothing has opened a panel inside the composer to
          hold any of it. Emptying that box is what makes the three survivable together — all three
          can be on screen at the same time, as they are above, without any of them having to explain
          which one it is.
        </Caption>
      </Section>

      <Rule />

      <Section
        title="Before there is anything to read"
        lead="An empty conversation is a beginning, not a failure. Put an EmptyState in the slot: it centres itself in the transcript, says what is missing, and the composer stays exactly where it will be for every message after the first."
      >
        <Box style={{ maxWidth: 520 }}>
          <ChatLayout
            label="New conversation"
            composer={
              <ChatComposer onSubmit={() => {}} label="Message the assistant" placeholder="Ask a question…" />
            }
            emptyState={
              <EmptyState
                icon={<ChatsCircle />}
                title="No messages yet"
                description="Ask a question and the answer will appear here."
              />
            }
            style={{ height: 300 }}
          />
        </Box>
        <Caption>
          The copy is <strong>blameless</strong> — &ldquo;No messages yet&rdquo;, never &ldquo;You
          haven&rsquo;t asked anything&rdquo;. The reader has just arrived; there is nothing for them
          to have done wrong.
        </Caption>
      </Section>

      <Rule />

      <Section
        title="Put it on another surface"
        lead="The band above the dock fades into the page background by default. On any other surface — a card, a raised panel — set --ds-chat-layout-bg to that surface's own role and the fade follows it. It is one custom property, and it is the only thing a chat needs to move house."
      >
        <Grid columns={{ initial: "1", sm: "2" }} gap="3">
          <DoDont
            kind="do"
            bare
            note="Names the surface it is sitting on, so the dock and the fade are the card's own colour."
          >
            <Flex direction="column" gap="2" style={{ width: "100%" }}>
              <Mono>--ds-chat-layout-bg: var(--ds-bg-raised)</Mono>
              <Box style={{ background: "var(--ds-bg-raised)", borderRadius: "var(--ds-radius-4)", border: "1px solid var(--ds-stroke-weak)", padding: "var(--ds-space-8)" }}>
                <ChatLayout
                  label="Conversation on a raised surface"
                  composer={<ChatComposer onSubmit={() => {}} label="Message" placeholder="Ask a question…" />}
                  style={{ height: 220, "--ds-chat-layout-bg": "var(--ds-bg-raised)" } as CSSProperties}
                >
                  <ChatMessage sender="user">Check the contrast first.</ChatMessage>
                  <ChatMessage sender="assistant" name="Assistant">
                    Measured across every accent — body copy and small print both clear the floor.
                  </ChatMessage>
                </ChatLayout>
              </Box>
            </Flex>
          </DoDont>
          <DoDont
            kind="dont"
            bare
            note="Left at the default on a card, so a page-coloured band cuts across the wrong surface."
          >
            <Flex direction="column" gap="2" style={{ width: "100%" }}>
              <Mono>(left at the default)</Mono>
              <Box style={{ background: "var(--ds-bg-raised)", borderRadius: "var(--ds-radius-4)", border: "1px solid var(--ds-stroke-weak)", padding: "var(--ds-space-8)" }}>
                <ChatLayout
                  label="Conversation with a mismatched dock"
                  composer={<ChatComposer onSubmit={() => {}} label="Message" placeholder="Ask a question…" />}
                  style={{ height: 220 }}
                >
                  <ChatMessage sender="user">Check the contrast first.</ChatMessage>
                  <ChatMessage sender="assistant" name="Assistant">
                    Measured across every accent — body copy and small print both clear the floor.
                  </ChatMessage>
                </ChatLayout>
              </Box>
            </Flex>
          </DoDont>
        </Grid>
      </Section>

      <Rule />

      <Section
        title="Reaching it from outside"
        lead="The ref is not a DOM node — it is a handle with one method on it. Call scrollToBottom() when the product decides the reader should be looking at the newest message: a jump-to-latest menu item, a notification they just tapped, a turn that has to be read."
      >
        <Flex direction="column" gap="2">
          <Text as="p" size="2" style={{ color: "var(--ds-text-weak)", lineHeight: 1.6 }}>
            It moves the transcript <strong>even if the reader had scrolled away</strong>, and it
            puts the conversation back on live afterwards. That is deliberate: the alternative — a
            call that declines because the reader is elsewhere — gives a product a control that
            silently does nothing, which is worse than not having one.
          </Text>
          <Text as="p" size="2" style={{ color: "var(--ds-text-weak)", lineHeight: 1.6 }}>
            There is no method for scrolling to a particular message. Deep-linking into a thread is a
            real need and it is written down as one, but the type says only what the component can
            actually do today.
          </Text>
        </Flex>
      </Section>

      <Rule />

      {/* The closing reference section. The provider is what makes the table live: every measured row
          re-reads its value when this key changes, so an accent/appearance flip re-resolves the spec. */}
      <HexThemeKey.Provider value={`${globals.accent}-${globals.appearance}-${globals.contrast}`}>
        <Section
          title="Tokens"
          lead="Every row below is read off a rendered layout and checked against the token it names, so the table reports what the component paints rather than what the tokens say. Zero net-new design tokens."
        >
          <LayoutSpec />
          <Caption>
            <Code>--ds-chat-layout-bg</Code> is the one property a caller is expected to set: it is
            an input, not a token, and it exists so a chat on a card fades into the card. Everything
            else here is the shared scale. The session line has <strong>no fill and no ink of its
            own</strong> — it holds a gap and nothing else, so what it paints is whatever the caller
            puts in it.
          </Caption>
        </Section>
      </HexThemeKey.Provider>
    </Page>
  ),
  play: async ({ canvasElement }) => {
    // The token table's EVIDENCE, asserted at runtime — every row read a REAL rendered part of a
    // real layout (the dock, the fade, the rhythm, the floating control), never a probe this story
    // painted. `rows: N` is the exact form: the layout mounts asynchronously, so an "at least one"
    // floor would be satisfied by a table that had not filled in yet.
    /* LET THE VERDICTS COMMIT BEFORE READING THEM.
     *
     * A row records its evidence on its own node SYNCHRONOUSLY and paints the verdict on the next
     * React commit. For a row that reads on its first attempt the two land together, which is why
     * this wait is not in every play — but the three rows measuring the floating control cannot read
     * on their first attempt: no property can be read at rest off an element with a running
     * animation, and the control plays its 120ms entrance as it mounts. Those rows therefore land
     * their evidence in a frame callback, one commit ahead of the verdict the assertion reads.
     *
     * The wait is for CONSISTENCY, never for a good answer: a row whose evidence carries a reason
     * satisfies it the moment its "unproven" verdict paints, and then fails the assertion below
     * exactly as it should. */
    await waitForVerdicts(canvasElement);
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
  as: "div" | "main" | "section";
  isStreaming: boolean;
  showEmptyState: boolean;
  scrollToLatestLabel: string;
  newMessagesLabel: string;
  height: number;
};

/** Props — the live, args-driven layout. Every capability is a control. */
export const Props: StoryObj<PropsArgs> = {
  args: {
    label: "Conversation with the assistant",
    conversation: "full",
    as: "div",
    isStreaming: false,
    showEmptyState: true,
    scrollToLatestLabel: "Scroll to latest",
    newMessagesLabel: "New messages",
    height: 440,
  },
  argTypes: {
    label: { control: "text", description: "The scrolling region's accessible name. Required — it is read out the moment a keyboard user reaches the transcript.", table: { category: "Layout" } },
    conversation: { control: "inline-radio", options: ["empty", "short", "full"], description: "How much is in the transcript. Empty shows the slot below; short sits against the dock; full overflows and scrolls.", table: { category: "Content" } },
    as: { control: "inline-radio", options: ["div", "main", "section"], description: "The root tag. Inspect the specimen to see it change: div is a plain box, main is the page landmark for a chat page with no AppShell over it, and section takes an aria-label so it lands as a named region.", table: { category: "Layout" } },
    isStreaming: { control: "boolean", description: "Whether an answer is arriving. Marks the region busy so a screen reader waits for the finished sentence.", table: { category: "Layout" } },
    showEmptyState: { control: "boolean", description: "Whether an empty conversation shows the empty-state slot. With it off, an empty transcript renders nothing at all.", table: { category: "Content" } },
    scrollToLatestLabel: { control: "text", description: "Accessible name for the resting scroll control. Scroll the transcript up to see it.", table: { category: "Scroll control" } },
    newMessagesLabel: { control: "text", description: "Visible label once messages have arrived out of view.", table: { category: "Scroll control" } },
    height: { control: { type: "range", min: 220, max: 640, step: 20 }, description: "The layout's bounded height. Without a bound there is nothing to scroll.", table: { category: "Layout" } },
  },
  parameters: { controls: { disable: false } },
  render: (args: PropsArgs) => {
    const { label, conversation, as, isStreaming, showEmptyState, scrollToLatestLabel, newMessagesLabel, height } = args;
    return (
      <Page maxWidth="none">
        <PageHeader title="ChatLayout · Props" standfirst={DEFINITION} />
        <Box style={{ padding: "16px 0 8px", maxWidth: 680 }}>
          <ChatLayout
            as={as}
            aria-label={as === "section" ? "Support chat" : undefined}
            label={label}
            composer={DEMO_COMPOSER}
            isStreaming={isStreaming}
            scrollToLatestLabel={scrollToLatestLabel}
            newMessagesLabel={newMessagesLabel}
            emptyState={showEmptyState ? EMPTY_SLOT : undefined}
            style={{ height }}
          >
            {conversation === "empty" ? null : conversation === "short" ? (
              <>
                <ChatMessage sender="user">Check the contrast first.</ChatMessage>
                <ChatMessage sender="assistant" avatar={ASSISTANT_AVATAR} name="Assistant">
                  Measured — everything clears the floor.
                </ChatMessage>
              </>
            ) : (
              <Conversation />
            )}
          </ChatLayout>
        </Box>
        <PropsLead />
        <Rule />
        <Section title="Props reference" lead={<>Every prop <Code>ChatLayout</Code> accepts. There is no density prop: the rhythm comes from the global size, so a product tunes it once.</>}>
          <PropTable rows={PROPS} />
        </Section>
        <Section
          title="The handle"
          lead={<>The <Code>ref</Code> is an imperative handle rather than a DOM node.</>}
        >
          <Flex direction="column" gap="2">
            <Text as="p" size="2" style={{ color: "var(--ds-text-weak)", lineHeight: 1.6 }}>
              <Mono>scrollToBottom()</Mono> — take the transcript to its newest message and put it
              back on live. It works even when the reader had scrolled away. That is the whole
              handle; there is nothing else on it.
            </Text>
          </Flex>
        </Section>
        <Section
          title="Which root tag"
          lead={<>The <Code>as</Code> prop swaps the root element and changes nothing else.</>}
        >
          <Flex direction="column" gap="2">
            <Text as="p" size="2" style={{ color: "var(--ds-text-weak)", lineHeight: 1.6 }}>
              Leave it at <Mono>div</Mono> inside an <Code>AppShell</Code>, which already guarantees
              the page&rsquo;s one <Mono>main</Mono>. Reach for <Mono>main</Mono> on a dedicated chat
              page that has no shell over it, so the skip link has a target and the landmark is
              where a reader expects it. Reach for <Mono>section</Mono> plus an{" "}
              <Mono>aria-label</Mono> when the conversation is one named region of a wider page. A{" "}
              <Mono>section</Mono> with no name is not a landmark at all, and it is exposed exactly
              as the default is.
            </Text>
            <Text as="p" size="2" style={{ color: "var(--ds-text-weak)", lineHeight: 1.6 }}>
              <strong>Two landmarks named main is a defect, not a preference.</strong> Setting{" "}
              <Mono>as=&quot;main&quot;</Mono> inside an <Code>AppShell</Code> nests a second one and
              axe reports three violations for it: <Mono>landmark-no-duplicate-main</Mono>,{" "}
              <Mono>landmark-main-is-top-level</Mono> and <Mono>landmark-unique</Mono>. The prop is
              a release valve for the page that has no shell, not a second way to write one.
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
      <PageHeader title="ChatLayout · History" standfirst={DEFINITION} />
      <Section title="Decisions" lead="The rulings this component encodes.">
        <Flex direction="column" gap="3">
          <Decision id="[[chat-layout-assembly]] · The transcript follows itself, and lets go the moment you scroll">
            A conversation stays pinned to its newest message while answers arrive, and{" "}
            <strong>any upward scroll releases it</strong> — read off the position, so a scrollbar
            drag and <Mono>PageUp</Mono> count, not just a wheel. It re-takes the pin once the scroll
            settles within ten pixels of the bottom. Growth is told apart from intent: content
            arriving fires a scroll event of its own, and without that distinction a streaming answer
            would release the pin on its own growth.
          </Decision>
          <Decision id="[[chat-layout-assembly]] · The handle is real, and it does not decline">
            <Mono>scrollToBottom()</Mono> works, and it works <strong>even when the reader had
            scrolled away</strong>. The consumer invoked it deliberately — a menu item, a new turn
            the product wants read — and a call that quietly did nothing would be a control that
            lies. There is deliberately no <Mono>scrollToMessage</Mono>: a method that exists only in
            the type is a promise the runtime cannot keep.
          </Decision>
          <Decision id="[[chat-layout-assembly]] · The dock inherits its container, and is never blurred">
            The band above the dock is a plain gradient painted from{" "}
            <Code>--ds-chat-layout-bg</Code>, which falls back to the page background. A chat inside
            a card sets that one property and the fade follows the surface it is on.{" "}
            <strong>No backdrop blur:</strong> blur in this system is bounded to small floating
            surfaces, and a dock that spans the full width and never goes away is exactly what that
            bound excludes.
          </Decision>
          <Decision id="[[chat-layout-assembly]] · Three things go wrong, and there are three places to say so">
            A composer stands next to three different failures, and each sentence goes next to the
            thing it is about. The <strong>session&rsquo;s</strong> condition is{" "}
            <Mono>sessionStatus</Mono>, above the dock and outside its border. A{" "}
            <strong>sent message&rsquo;s</strong> failure goes on that message, where the metadata
            row reads &ldquo;Failed&rdquo; and its footer carries the retry. Whatever is wrong with
            the <strong>draft in the box</strong> is the composer&rsquo;s own <Mono>status</Mono>,
            under the dock, where every field in this system puts its message. None of the three is a
            panel inside the composer&rsquo;s border: emptying that box is what lets all three be on
            screen at once without arguing over which one the reader is being told about.
          </Decision>
          <Decision id="[[press-to-see-demos]] · Nothing moves until you ask it to">
            Documentation pages here do not animate themselves. The one exception is a control the
            reader presses — Usage carries a <strong>Simulate incoming message</strong> button, inert
            until clicked. Everything unattended (streams, springs, reduced-motion checks) lives in
            the behavior suite instead.
          </Decision>
          <Decision id="[[scroll-position-animation]] · The scroll spring is not motion the system governs">
            The scroll runs on a frame-by-frame integrator driving the scroll POSITION. It paints
            nothing, so the rule against spring timing does not reach it and no token is minted for
            its constants. Reduced motion replaces it with a single jump.
          </Decision>
          <Decision id="[[chat-layout-assembly]] · Two states, one control, one tab stop">
            Away from the bottom, the control is a round arrow. Once messages have arrived out of
            view it becomes a labelled pill, because &ldquo;there is something new down
            there&rdquo; is a message an arrow cannot carry. They are two elements and only one is
            ever mounted, so there is one tab stop and no half-rendered word mid-swap; the incoming
            one fades and scales in, and <strong>neither ever animates its width or height</strong>.
          </Decision>
          <Decision id="[[api-seam-criterion]] · The root tag is a valve, and the element itself is not handed over">
            <Code>as</Code> takes a <strong>closed</strong> union of{" "}
            <Mono>div</Mono>, <Mono>main</Mono> and <Mono>section</Mono>, the shape{" "}
            <Code>Item</Code> already ships, so a tag this layout cannot survive is a compile error
            rather than a broken page. It was earned on a measured need. A wrapping{" "}
            <Mono>&lt;main&gt;</Mono> is what a consumer writes without it, and it costs a{" "}
            <strong>second height contract</strong>: in a 420px column that wrapper leaves the log
            at 348px against a 348px scroll height, so the transcript never scrolls, and it hangs
            the dock 18px below the box with nothing reported. <Code>asChild</Code> is refused, and
            that refusal is in the type. <Mono>children</Mono> is the transcript, so an element
            seam would need the transcript moved to a named prop, and every existing call site
            would then render an empty conversation with no crash and no type error.
          </Decision>
        </Flex>
      </Section>

      <Rule />

      <Section title="Changelog" lead="Notable changes, newest first — grows as the component evolves.">
        <Flex direction="column" gap="3">
          <Decision id="0.9.0">
            Added <Code>as</Code>, the closed <Mono>div | main | section</Mono> root tag valve.
            Zero visual change at the default tag, proved byte for byte on a screenshot pair, and
            the transcript, the composer, the <Mono>role=&quot;log&quot;</Mono> tab stop and the{" "}
            <Mono>scrollToBottom()</Mono> handle all measured working at every tag in the union.
          </Decision>
          <Decision id="0.9.0">
            Initial <Code>System/Chat/ChatLayout</Code> — the assembled shell: a scroll-anchored
            transcript, the docked composer over a container-inheriting fade, the two-state
            scroll-to-latest control, the <Mono>sessionStatus</Mono> line above the dock, and a
            working <Mono>scrollToBottom()</Mono> handle.
          </Decision>
        </Flex>
      </Section>
    </Page>
  ),
};
