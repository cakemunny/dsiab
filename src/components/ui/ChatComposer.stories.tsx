import { useEffect, useLayoutEffect, useRef, useState } from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { Box, Code, Flex, Grid, Text } from "@radix-ui/themes";
import { Paperclip } from "@phosphor-icons/react";
import { ChatComposer, type ChatComposerStatusTone } from "./ChatComposer";
import { ChatMessage } from "./ChatMessage";
import { IconButton } from "./IconButton";
import {
  AnatomyLegend, Caption, Decision, DoDont, DODONT_LABEL, dotStyle, HexThemeKey, hLine, Kbd, type KeyBinding, KeyRow,
  MeasuredRow, MeasuredSpec, Mono, Page, PageHeader, PropsLead, type PropDef, PropTable, Rule, Scenario,
  Section,
} from "./_storyKit";
import { awaitMeasuredRows } from "../../foundations/_assert";

/** The one definition of this component — the standfirst every page of it opens with. */
const DEFINITION = (
  <>
    Where the reader writes, and the one control that sends it: a single bordered dock holding a multiline
    input, any controls that belong to the message, and a send button that becomes a stop button while a
    response generates. The box grows with the message and stops at eight lines. <Kbd>Enter</Kbd> sends;{" "}
    <Kbd>Shift</Kbd>+<Kbd>Enter</Kbd> breaks the line.
  </>
);

/* Every specimen below is a plausible moment in a real conversation about THIS system — the reader
   is asking an assistant to change the brand accent and check the contrast — rather than foo/bar.
   Nothing on these pages moves or types on its own: all the driving lives in the behavior suite. */

/* ---- fixtures ------------------------------------------------------------- */

const DRAFT = "Switch the brand accent to teal and check the contrast on the message bubbles.";

/** The anatomy specimen carries a three-line draft on purpose: at one line the dock's top edge and
 *  the input's midpoint are close enough that their two callouts collide in the gutter. */
const ANATOMY_DRAFT =
  "Switch the brand accent to teal and check the contrast on the message bubbles.\n" +
  "Use the light and the dark appearance.\n" +
  "Tell me before you change anything.";

const LONG_DRAFT =
  "Switch the brand accent to teal and check the contrast on the message bubbles.\n" +
  "Use the light and the dark appearance, and measure every text role that lands on the tint.\n" +
  "If any of them falls under 4.5 to 1, stop and tell me which one before changing anything.\n" +
  "Then write the result into the theme file.";

const OVERLONG_DRAFT = Array.from(
  { length: 12 },
  (_, i) => `${i + 1}. Check the metadata role against the tinted bubble in both appearances.`,
).join("\n");

const NOOP = () => {};

/* ---- anatomy diagram ------------------------------------------------------
   The composer's parts are STACKED, not side by side, so the callouts sit in a
   left gutter and run a leader line into the part they name. Positions are
   MEASURED off the live specimen: the dock's height is content-driven, the box
   grows with what is typed into it, and the control lane moves all of it the
   moment the size toolbar changes. */

const GUTTER = 60;
const FRAME_W = 520;

/** [callout number, selector, where on the element to anchor, which gutter].
 *
 *  Two gutters and two anchors, because a single left gutter of element CENTRES collapses here: the
 *  dock, its action row and the send control all share one vertical midpoint, so three callouts land
 *  on the same pixel and the last one drawn hides the other two. The action row's two parts are told
 *  apart by SIDE (the leading slot is at the dock's left edge, the send control at its right), and
 *  the dock — which contains everything else — is anchored to its own top edge rather than to a
 *  centre it shares with its contents. */
const PINS: [number, string, "top" | "center", "left" | "right"][] = [
  [1, ".rt-ds-chat-composer-dock", "top", "left"],
  [2, ".rt-ds-chat-composer-input", "center", "left"],
  [3, ".rt-ds-chat-composer-actions-lead", "center", "left"],
  [4, ".rt-ds-chat-composer-send", "center", "right"],
  [5, '.rt-ds-chat-composer > [data-field-part="message"]', "center", "left"],
];

function AnatomyDiagram() {
  const frame = useRef<HTMLDivElement>(null);
  const specimen = useRef<HTMLDivElement>(null);
  const [pins, setPins] = useState<Record<number, number>>({});

  useLayoutEffect(() => {
    const f = frame.current;
    const s = specimen.current;
    if (!f || !s) return;
    const measure = () => {
      const top = f.getBoundingClientRect().top;
      const next: Record<number, number> = {};
      for (const [n, sel, anchor] of PINS) {
        const el = s.querySelector<HTMLElement>(sel);
        if (!el) continue;
        const box = el.getBoundingClientRect();
        next[n] = Math.round(box.top + (anchor === "top" ? 0 : box.height / 2) - top);
      }
      setPins(next);
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
        /* paddingTop: the dock's callout is anchored to its TOP edge, so without a band above the
           specimen the dot is drawn half outside the frame and clipped. */
        style={{
          position: "relative", width: FRAME_W + GUTTER * 2,
          paddingLeft: GUTTER, paddingRight: GUTTER, paddingTop: 16,
        }}
      >
        <Box ref={specimen} style={{ width: FRAME_W }} data-size-lesson="anatomy callout geometry — the dock buttons take the composer's pinned step ([[container-size-seeding]])">
          <ChatComposer
            onSubmit={NOOP}
            size="3"
            label="Message"
            defaultValue={ANATOMY_DRAFT}
            status={{ tone: "warning", message: "This draft is close to the length the model will accept." }}
            actions={
              <IconButton type="button" priority="tertiary" aria-label="Attach a file">
                <Paperclip aria-hidden />
              </IconButton>
            }
          />
        </Box>

        {PINS.map(([n, , , side]) => {
          const y = pins[n];
          if (y == null) return null;
          const right = side === "right";
          return (
            <Box key={n}>
              <Box style={{ ...dotStyle, left: right ? GUTTER + FRAME_W + GUTTER - 20 : 0, top: y - 10 }}>{n}</Box>
              <Box
                style={hLine(
                  right
                    ? { left: GUTTER + FRAME_W + 4, top: y, width: GUTTER - 26 }
                    : { left: 22, top: y, width: GUTTER - 26 },
                )}
              />
            </Box>
          );
        })}
      </Box>
    </Box>
  );
}

const ANATOMY_PARTS: [number, string, string][] = [
  [1, "The dock", "one bordered surface holding the input and everything that acts on it. Clicking anywhere in it that is not already a control puts the cursor in the text, and the focus ring is drawn around this box rather than around the input inside it."],
  [2, "The input", "a real multiline text control with a native placeholder. It grows as the message does and stops at eight lines, after which it scrolls — so a long message is fully editable without ever pushing the conversation off the screen."],
  [3, "Leading actions", "optional — controls that belong to the message being written: attach something, pick a model, change a setting. They sit inside the dock because they are part of composing, not page furniture."],
  [4, "The send control", "one icon button carrying the whole send action. It is off while there is nothing to send, and while a response is generating it is replaced — not joined — by a stop control with its own name."],
  [5, "The status line", "optional — one sentence about the DRAFT in the box: a file over the size limit, a message past the length the model will take. It sits on the page under the dock, where every other field in the system puts its message: colour and a glyph, never a panel."],
];

/* ---- token spec -----------------------------------------------------------
   Four instances, so every row reads off a REAL rendered part: one with a draft
   (its send control is live, which is the only state that paints the accent),
   one switched off, and one for each status tone. */

function ComposerSpec() {
  return (
    <MeasuredSpec
      render={() => (
        <>
          <ChatComposer onSubmit={NOOP} label="Message" defaultValue={DRAFT} />
          <ChatComposer onSubmit={NOOP} label="Message" disabled defaultValue={DRAFT} />
          <ChatComposer
            onSubmit={NOOP}
            label="Message"
            status={{ tone: "error", message: "That attachment is over the size limit." }}
          />
          <ChatComposer
            onSubmit={NOOP}
            label="Message"
            status={{ tone: "warning", message: "This draft is close to the length the model will accept." }}
          />
        </>
      )}
    >
      <MeasuredRow
        part="Dock surface"
        note="The writing surface itself — the raised role, so the dock sits over the conversation."
        token="--ds-bg-raised"
        select=".rt-ds-chat-composer-dock"
        prop="background-color"
      />
      <MeasuredRow
        part="Dock edge"
        note="The hairline that makes the dock one box."
        token="--ds-stroke-weak"
        select=".rt-ds-chat-composer-dock"
        prop="border-top-color"
      />
      <MeasuredRow
        part="Dock edge (hover)"
        state="hover"
        note="The edge firms up under the pointer — the weak-to-strong step every border takes."
        token="--ds-stroke-strong"
        select=".rt-ds-chat-composer-dock"
        prop="border-top-color"
      />
      <MeasuredRow
        part="Dock corner"
        note="The dock's rounding, from the shared radius ladder rather than a chat-only value."
        token="--ds-radius-4"
        select=".rt-ds-chat-composer-dock"
        prop="border-top-left-radius"
      />
      <MeasuredRow
        part="Focus ring"
        state="focus-visible"
        note="Drawn around the whole dock while the text inside it has focus. This is the accent base. A Radix alpha, --ds-stroke-focus-stack, sits on top of it, 2px wide, the ring every control shares ([[focus-ring]])."
        token="--ds-stroke-focus"
        select=".rt-ds-chat-composer-dock"
        prop="outline-color"
      />
      <MeasuredRow
        part="Message text"
        note="The ink the field box declares and the text inside it inherits — read off the box."
        token="--ds-text-strong"
        select=".rt-ds-chat-composer .rt-TextAreaRoot"
        prop="color"
      />
      <MeasuredRow
        part="Dock surface (off)"
        note="A composer that is switched off says so on the surface the reader was going to click."
        token="--ds-fill-disabled"
        select='.rt-ds-chat-composer[data-disabled] .rt-ds-chat-composer-dock'
        prop="background-color"
      />
      <MeasuredRow
        part="Send control fill"
        note="The one consequential action in the dock, so it takes the solid accent fill."
        token="--ds-fill-accent"
        select='.rt-ds-chat-composer-send[data-mode="send"]'
        prop="background-color"
      />
      <MeasuredRow
        part="Send glyph"
        note="The arrow sits on a solid fill, so it inks from the on-solid foreground."
        token="--on-accent"
        select='.rt-ds-chat-composer-send[data-mode="send"]'
        prop="color"
      />
      <MeasuredRow
        part="Failure text"
        note="The sentence under the dock when the draft in the box cannot be sent as it stands."
        token="--ds-text-error"
        select='.rt-ds-chat-composer > [data-field-part="message"][data-tone="error"]'
        prop="color"
      />
      <MeasuredRow
        part="Warning text"
        note="The same line at the quieter tone — something to know about, not something that failed."
        token="--ds-text-warning"
        select='.rt-ds-chat-composer > [data-field-part="message"][data-tone="warning"]'
        prop="color"
      />
    </MeasuredSpec>
  );
}
const SPEC_ROWS = 11;

/* ---- keyboard ------------------------------------------------------------- */

const COMPOSER_KEYS: KeyBinding[] = [
  { keys: ["Enter"], action: <>Send the message. The value is trimmed first, and a message that is empty or only whitespace is <strong>not sent</strong> — and not turned into a blank line either.</>, src: "system" },
  { keys: ["Shift", "Enter"], action: <>Insert a line break. The composer does not intercept this at all, so the browser does exactly what it does in any other multiline field.</>, src: "system" },
  { keys: ["Tab"], action: <>Move out of the input to the leading actions and then the send control. Focus is visible on the dock as a whole, so it is obvious the cursor is in the composer.</>, src: "system" },
];

/* ---- props ---------------------------------------------------------------- */

const PROPS: PropDef[] = [
  { name: "onSubmit", type: "(value: string) => void", desc: <>Fired with the <strong>trimmed</strong> message when the reader sends it. Never fired with an empty string, so a handler does not have to re-check.</>, source: "ChatComposer.tsx" },
  { name: "value", type: "string", desc: <>Controlled value. Pair it with <Code>onChange</Code>; leave both unset and the composer holds its own draft.</>, source: "ChatComposer.tsx" },
  { name: "onChange", type: "(value: string) => void", desc: <>Fired with the new value on every keystroke, and with <Code>""</Code> when a message is sent — that empty round-trip is how a controlled composer clears.</>, source: "ChatComposer.tsx" },
  { name: "defaultValue", type: "string", desc: <>Starting draft when uncontrolled.</>, source: "ChatComposer.tsx" },
  { name: "placeholder", type: "string", def: '"Type a message…"', desc: <>Placeholder in the empty input. It is the field's <strong>native</strong> placeholder, so it behaves like every other one on the platform.</>, source: "ChatComposer.tsx" },
  { name: "label", type: "string", def: '"Message"', desc: <>The input's accessible name. There is no visible label, so this is the only name it gets — set it whenever "Message" would be ambiguous on the page.</>, source: "ChatComposer.tsx" },
  { name: "disabled", type: "boolean", def: "false", desc: <>Switches the input and the send control off. The <strong>stop control stays live</strong> — see the guidance above.</>, source: "ChatComposer.tsx" },
  { name: "isStopShown", type: "boolean", def: "false", desc: <>Replace the send control with a stop control while a response is being generated. One of the two is in the DOM at a time, never both.</>, source: "ChatComposer.tsx" },
  { name: "onStop", type: "() => void", desc: <>Fired when the stop control is pressed.</>, source: "ChatComposer.tsx" },
  { name: "sendLabel", type: "string", def: '"Send message"', desc: <>Accessible name for the send control. Both controls are icon-only, so both are named.</>, source: "ChatComposer.tsx" },
  { name: "stopLabel", type: "string", def: '"Stop generating"', desc: <>Accessible name for the stop control.</>, source: "ChatComposer.tsx" },
  { name: "status", type: "{ tone: 'error' | 'warning'; message: ReactNode }", desc: <>One sentence about <strong>the draft in the box</strong>, rendered under the dock — this composer's own validation, and nothing else. <Code>error</Code> is announced assertively and marks the input invalid; <Code>warning</Code> is announced politely and does not. A failed send goes on that message&rsquo;s metadata row; the conversation&rsquo;s own condition goes above the dock, in the layout&rsquo;s <Code>sessionStatus</Code>.</>, source: "ChatComposer.tsx" },
  { name: "size", type: `"1" | "2" | "3" | "inherit"`, def: "control lane", desc: <>Control-lane step, the same prop every other typed entry takes. It scales the support line beneath as well: a size-3 field gets a 14px message, smaller fields 12px.</>, source: "ChatComposer.tsx" },
  { name: "actions", type: "ReactNode", desc: <>Controls to the left of the send button, inside the dock — attach, model, settings. Use icon buttons so the row keeps the send control's height, and leave them <strong>unsized</strong>: the composer publishes its own step to this slot, so they come out at the size of the send control beside them. Naming a size on one still wins.</>, source: "ChatComposer.tsx" },
  { name: "className", type: "string", desc: <>Merged onto the root element.</>, source: "ChatComposer.tsx" },
  { name: "style", type: "CSSProperties", desc: <>Inline styles on the root element.</>, source: "ChatComposer.tsx" },
];

const meta: Meta<typeof ChatComposer> = {
  title: "Components/Chat/ChatComposer",
  component: ChatComposer,
  parameters: {
    controls: { disable: true },
    docs: {
      description: {
        component:
          "**ChatComposer** is where the reader writes and the one control that sends it: a single " +
          "bordered dock holding a real multiline text input, any controls that belong to the message, " +
          "and a send button that becomes a stop button while a response is generating. The box grows " +
          "with the message and stops at eight lines. Enter sends, Shift+Enter breaks the line, and " +
          "there is nothing to send until there is something other than whitespace in the box.",
      },
    },
  },
};
export default meta;
type Story = StoryObj<typeof ChatComposer>;

/** Anatomy — the labelled parts and the keyboard contract. The token spec closes Usage. */
export const Anatomy: Story = {
  // One carve-out, and it is load-bearing: the anatomy diagram pins a warning-tone status line, and at
  // the 12px floor that role reads just under axe's strict 4.5. Nothing else here needs excluding —
  // no do/don't card, no success tone, no tone ink painted inline.
  parameters: { a11y: { context: { exclude: ['[data-field-part="message"][data-tone="warning"]'] } } },
  render: () => (
    <Page maxWidth={900}>
      <PageHeader title="ChatComposer · Anatomy" standfirst={DEFINITION} />
      <Section
        title="The parts"
        lead="One bordered dock, a text box that grows, a row of controls, and — only when there is something to say — a line underneath. Everything except the dock and the input is optional. The numbered callouts are pinned onto a live composer; the legend spells each one out."
      >
        <AnatomyDiagram />
        <AnatomyLegend parts={ANATOMY_PARTS} />
        <Caption>
          The dock is the control. The input inside it draws nothing of its own — no border, no
          fill, no ring — so there is one box on screen rather than a box inside a box.
        </Caption>
      </Section>

      <Rule />

      <Section
        title="The keyboard"
        lead="Two keys carry the whole interaction, and the split between them is the one convention a reader arrives already knowing."
      >
        <Box>
          {COMPOSER_KEYS.map((b) => (
            <KeyRow key={b.keys.join("+")} {...b} />
          ))}
        </Box>
        <Caption>
          Sending with the keyboard and sending with the button are the same path: both trim, both
          refuse an empty message, and both clear the box.
        </Caption>
      </Section>
    </Page>
  ),
};

/** Usage — where the composer sits, how it behaves as a message grows, the one way it is commonly
 *  wrong, and the live token spec that closes the page. */
export const Usage: Story = {
  // The warning-tone message is the same carve-out every field in this system takes: at the 12px
  // floor the warning role reads just under axe's strict 4.5, and the ruling that accepts it does so
  // because the glyph ships with the text — status is never colour alone. Scoped to the message
  // itself, never page-wide, and the error tone stays IN (it clears).
  parameters: { a11y: { context: { exclude: [DODONT_LABEL, "[style*='--ds-text-warning']", '[data-field-part="message"][data-tone="warning"]', "[style*='--ds-text-success']", '[data-field-part="message"][data-tone="success"]'] } } },
  render: (_args, { globals }) => (
    <Page maxWidth={900}>
      <PageHeader title="ChatComposer · Usage" standfirst={DEFINITION} />
      <Section
        title="Under the conversation"
        lead="The composer is the floor of a chat: the transcript scrolls above it and it stays put. It is one dock, full width of the column, and it does not compete with the messages — its only permanent colour is the send control."
      >
        <Box style={{ maxWidth: 560 }}>
          <Flex direction="column" gap="4">
            <ChatMessage sender="user">
              Which accents fail the contrast floor on a tinted bubble?
            </ChatMessage>
            <ChatMessage sender="assistant" name="Assistant">
              None of them, for body text — the worst pairing lands at 11.86 to 1. The metadata role
              is tighter but still clears, at 4.73.
            </ChatMessage>
            <ChatComposer onSubmit={NOOP} label="Message" defaultValue={DRAFT} />
          </Flex>
        </Box>
        <Caption>
          The draft above is a real one, not a placeholder: this is what the dock looks like with
          something in it, with the send control live.
        </Caption>
      </Section>

      <Rule />

      <Section
        title="It grows with the message, then stops"
        lead="A one-line box is right for a one-line message and wrong for a paragraph, so the box follows the text — up to eight lines. Past that it scrolls rather than growing, because a composer that keeps growing eventually eats the conversation it belongs to."
      >
        <Flex direction="column" gap="4">
          <Scenario label="ONE LINE" caption="The resting height — a single line, and nothing reserved for text that is not there.">
            <Box style={{ width: "100%", maxWidth: 520 }}>
              <ChatComposer onSubmit={NOOP} label="Short message" defaultValue="Check the contrast." />
            </Box>
          </Scenario>
          <Scenario label="FOUR LINES" caption="Still growing: every line of the message is visible at once, which is what makes it editable.">
            <Box style={{ width: "100%", maxWidth: 520 }}>
              <ChatComposer onSubmit={NOOP} label="Longer message" defaultValue={LONG_DRAFT} />
            </Box>
          </Scenario>
          <Scenario label="PAST THE CAP" caption="Twelve lines of message in an eight-line box: the height has stopped and the input scrolls instead. The conversation above keeps the rest of the screen.">
            <Box style={{ width: "100%", maxWidth: 520 }}>
              <ChatComposer onSubmit={NOOP} label="Very long message" defaultValue={OVERLONG_DRAFT} />
            </Box>
          </Scenario>
        </Flex>
      </Section>

      <Rule />

      <Section
        title="While a response is generating"
        lead="Set isStopShown and the send control becomes a stop control — the same slot, the same tab stop, its own name. The input stays live underneath, so the reader can start writing the next message while the current answer arrives."
      >
        <Grid columns={{ initial: "1", sm: "2" }} gap="4">
          <Scenario label="IDLE" caption="Nothing running. The send control is off until there is something to send.">
            <Box style={{ width: "100%" }}>
              <ChatComposer onSubmit={NOOP} label="Idle message" />
            </Box>
          </Scenario>
          <Scenario label="GENERATING" caption="A response is streaming. Stop is the action on offer, and it is the only one the reader needs.">
            <Box style={{ width: "100%" }}>
              <ChatComposer onSubmit={NOOP} onStop={NOOP} isStopShown label="Message while generating" />
            </Box>
          </Scenario>
        </Grid>
      </Section>

      <Rule />

      <Section
        title="When something is wrong with the draft in the box"
        lead="The status line is this composer's own validation, and its subject is what the reader has in front of them right now: a message too long to send, a file too big to attach. One sentence on the page under the dock, where a field puts its message. An error is announced assertively and marks the input invalid; a warning is announced politely and does not. Both are described by the input itself, so a reader who tabs back into the box hears the reason rather than finding an unexplained failure."
      >
        <Flex direction="column" gap="4">
          <Scenario label="ERROR" caption="The draft cannot be sent as it stands. Say what is wrong with it, in a sentence the reader can act on without leaving the box.">
            <Box style={{ width: "100%", maxWidth: 520 }}>
              <ChatComposer
                onSubmit={NOOP}
                label="Message with an oversized attachment"
                defaultValue="Here is the full sweep — every accent, both appearances."
                status={{ tone: "error", message: "accent-sweep.csv is 48 MB. The limit is 25 MB." }}
              />
            </Box>
          </Scenario>
          <Scenario label="WARNING" caption="Something is worth knowing before it becomes a problem. Not a failure, and not styled like one.">
            <Box style={{ width: "100%", maxWidth: 520 }}>
              <ChatComposer
                onSubmit={NOOP}
                label="Message near the limit"
                status={{ tone: "warning", message: "This draft is close to the length the model will accept." }}
              />
            </Box>
          </Scenario>
        </Flex>
        <Caption>
          Where the other two go, because this is the slot people reach for first. A send that failed
          for one particular message belongs on <strong>that message</strong> — the metadata row has
          a failed state and a slot for a retry, and it is the only one of the three that can say{" "}
          <em>which</em> message. Anything about the conversation rather than the draft —
          reconnecting, queued, a model being retired — belongs above the dock, in the layout&rsquo;s
          own <Code>sessionStatus</Code>. What is left for this slot is the draft in the box, and it
          sits <strong>under</strong> the dock, where every field in this system puts its message:
          colour and a glyph, no fill and no border.
        </Caption>
      </Section>

      <Rule />

      <Section
        title="Do not switch the composer off while a response is generating"
        lead="This is the mistake the API makes easy. Locking the input while the assistant is answering feels protective, and it takes away the two things the reader still wants: somewhere to write the follow-up they just thought of, and a way to end an answer that has gone wrong."
      >
        <Grid columns={{ initial: "1", sm: "2" }} gap="3">
          <DoDont kind="do" bare note="isStopShown, with the input left alone. The reader can stop the answer and keep drafting.">
            <Box style={{ width: "100%" }}>
              <ChatComposer
                onSubmit={NOOP}
                onStop={NOOP}
                isStopShown
                label="Message while generating"
                defaultValue="Actually, use the dark appearance too."
              />
            </Box>
          </DoDont>
          <DoDont kind="dont" bare note="disabled while generating. The draft is frozen and nothing here can end the answer.">
            <Box style={{ width: "100%" }}>
              <ChatComposer
                onSubmit={NOOP}
                disabled
                label="Message locked while generating"
                defaultValue="Actually, use the dark appearance too."
              />
            </Box>
          </DoDont>
        </Grid>
        <Caption>
          <Code>disabled</Code> is for a composer that genuinely cannot be used — a read-only
          transcript, a thread the reader has left. When it IS set, the stop control stays operable,
          so a composer switched off mid-response never traps the reader.
        </Caption>
      </Section>

      <Rule />

      {/* The closing reference section. The provider is what makes the table live: every measured row
          re-reads its value when this key changes, so an accent/appearance flip re-resolves the spec. */}
      <HexThemeKey.Provider value={`${globals.accent}-${globals.appearance}-${globals.contrast}`}>
        <Section
          title="Tokens"
          lead="Every row below is read off a rendered instance — one with a draft, one switched off, and one for each status tone — and checked against the token it names, so the table reports what the component paints rather than what the tokens say. Zero net-new tokens: the dock reuses the raised surface and the shared stroke ladder, the send control reuses the accent fill and its on-solid foreground, and the ring is the same stacked accent ring every control shares ([[focus-ring]]). The message-ink row reads the field box rather than the text inside it, because a text control has no measurable interior."
        >
          <ComposerSpec />
          <Caption>
            The status colours are the accent-aware <Mono>--ds-text-error</Mono> and{" "}
            <Mono>--ds-text-warning</Mono> roles, so they follow a brand's collision shift instead of
            pinning a fixed red and yellow.
          </Caption>
        </Section>
      </HexThemeKey.Provider>
    </Page>
  ),
  play: async ({ canvasElement }) => {
    // The token table's EVIDENCE, asserted at runtime — each row read a REAL rendered part of a real
    // instance (the dock, the live send control, the switched-off surface, both status tones), never
    // a probe this story painted. `rows: N` is the exact form: four instances mount inside the
    // measurement host, so an "at least one row" floor could be met by a table still filling in.
    const rows = await awaitMeasuredRows(canvasElement, { rows: SPEC_ROWS });
    if (rows.measured !== SPEC_ROWS || rows.unproven !== 0) {
      throw new Error(`expected ${SPEC_ROWS} measured / 0 unproven token rows, got ${rows.measured} / ${rows.unproven}`);
    }
  },
};

/* ---- Props ----------------------------------------------------------- */

type PropsArgs = {
  size: "auto" | "1" | "2" | "3" | "inherit";
  draft: string;
  placeholder: string;
  label: string;
  disabled: boolean;
  isStopShown: boolean;
  sendLabel: string;
  stopLabel: string;
  statusTone: ChatComposerStatusTone | "none";
  statusMessage: string;
  actions: boolean;
};

function PropsDemo(args: PropsArgs) {
  const { draft, placeholder, label, disabled, isStopShown, sendLabel, stopLabel, statusTone, statusMessage, actions, size } = args;
  // Controlled, so the Controls panel can seed a draft AND the reader can keep typing over it. The
  // sync exists because the arg is the source of truth only until the reader touches the box.
  const [value, setValue] = useState(draft);
  const [sent, setSent] = useState<string[]>([]);
  useEffect(() => setValue(draft), [draft]);

  return (
    <Flex direction="column" gap="3" style={{ maxWidth: 560 }}>
      <ChatComposer
        value={value}
        onChange={setValue}
        onSubmit={(message) => setSent((all) => [...all, message])}
        placeholder={placeholder}
        label={label || "Message"}
        disabled={disabled}
        size={size === "auto" ? undefined : size}
        isStopShown={isStopShown}
        onStop={() => setSent((all) => [...all, "— stopped —"])}
        sendLabel={sendLabel || "Send message"}
        stopLabel={stopLabel || "Stop generating"}
        status={statusTone === "none" ? undefined : { tone: statusTone, message: statusMessage }}
        actions={
          actions ? (
            <IconButton type="button" priority="tertiary" aria-label="Attach a file">
              <Paperclip aria-hidden />
            </IconButton>
          ) : undefined
        }
      />
      <Text size="1" style={{ color: "var(--ds-text-weak)" }}>
        {sent.length === 0 ? "Nothing sent yet — type something and press Enter." : `Sent: ${sent.join(" · ")}`}
      </Text>
    </Flex>
  );
}

/** Props — the live, args-driven composer. Every capability is a control. */
export const Props: StoryObj<PropsArgs> = {
  args: {
    // "auto" (size unset) is the default so the composer tracks the global uiSize toolbar out of the box.
    size: "auto",
    draft: "Switch the brand accent to teal.",
    placeholder: "Type a message…",
    label: "Message",
    disabled: false,
    isStopShown: false,
    sendLabel: "Send message",
    stopLabel: "Stop generating",
    statusTone: "none",
    statusMessage: "This draft is close to the length the model will accept.",
    actions: true,
  },
  argTypes: {
    size: { control: "inline-radio", options: ["auto", "1", "2", "3", "inherit"], description: 'Control-lane step, as every typed entry takes one. It scales the support line too — a size-3 field gets a 14px message. "auto" tracks the global uiSize toolbar (unset); a step pins it; "inherit" opts out (Radix default).', table: { category: "FIELD" } },
    draft: { control: "text", description: "Seed the box. Empty is the state that matters most: with nothing but whitespace in it, Enter does nothing and the send control is off.", table: { category: "Message" } },
    placeholder: { control: "text", description: "Placeholder in the empty input — the field's native one.", table: { category: "Message" } },
    label: { control: "text", description: "The input's accessible name. There is no visible label, so this is the only name it gets.", table: { category: "Message" } },
    disabled: { control: "boolean", description: "Switch the input and the send control off. The stop control stays live.", table: { category: "State" } },
    isStopShown: { control: "boolean", description: "Replace the send control with a stop control, for while a response is generating.", table: { category: "State" } },
    sendLabel: { control: "text", description: "Accessible name for the send control.", table: { category: "State" } },
    stopLabel: { control: "text", description: "Accessible name for the stop control.", table: { category: "State" } },
    statusTone: { control: "inline-radio", options: ["none", "error", "warning"], description: "The line under the dock, for what is wrong with the draft in the box. error is announced assertively and marks the input invalid; warning is announced politely.", table: { category: "Status" } },
    statusMessage: { control: "text", description: "What the status line says about the draft. Ignored when the tone is none.", table: { category: "Status" } },
    actions: { control: "boolean", description: "Render a leading control inside the dock — an attach button stands in for whatever belongs to the message.", table: { category: "Slots" } },
  },
  parameters: { controls: { disable: false } },
  render: (args: PropsArgs) => (
    <Page maxWidth="none">
      <PageHeader title="ChatComposer · Props" standfirst={DEFINITION} />
      <Box style={{ padding: "16px 0 8px" }}>
        <PropsDemo {...args} />
      </Box>
      <PropsLead />
      <Rule />
      <Section
        title="Props reference"
        lead={<>Every prop <Code>ChatComposer</Code> accepts. The value props follow the usual pairing: pass <Code>value</Code> and <Code>onChange</Code> to own the draft, or neither and let the composer hold it.</>}
      >
        <PropTable rows={PROPS} />
      </Section>
    </Page>
  ),
};

/** History — the rulings this component encodes and a changelog of how it changes over time. */
export const History: Story = {
  render: () => (
    <Page>
      <PageHeader title="ChatComposer · History" standfirst={DEFINITION} />
      <Section title="Decisions" lead="The rulings this component encodes.">
        <Flex direction="column" gap="3">
          <Decision id="[[chat-composer]] · The input is a real text control">
            The message box is a genuine multiline <Code>&lt;textarea&gt;</Code> riding the same field
            shell as every other input in the system — not an editable <Code>div</Code> with a text
            role bolted on. That buys real textbox semantics (selection, undo, spellcheck, autofill,
            dictation and every assistive technology's text-editing mode are the platform's, not
            ours), a <strong>native</strong> placeholder that disappears on the platform's rules, and
            the shared field ring. The cost is named rather than hidden: inline entity chips cannot
            render inside a text box, so that would be a decision to rebuild the input, not a setting
            to turn on.
          </Decision>
          <Decision id="[[chat-composer]] · Enter sends, Shift+Enter breaks the line">
            The value is <strong>trimmed first</strong>, and a message that is empty or only
            whitespace does nothing at all — it is not sent, the box is not cleared, and no blank line
            is inserted in its place. Shift+Enter is not intercepted, so the browser inserts the break
            exactly as it would in any other multiline field.
          </Decision>
          <Decision id="[[chat-composer]] · It grows to eight lines, then scrolls">
            The box follows its content up to eight lines and stops. The cap is{" "}
            <strong>measured from the line-height the input actually renders</strong>, not written as
            a pixel maximum: it therefore stays eight lines at every size step, in every brand's type
            scale, and after a webfont finishes loading. Past the cap the input scrolls, so a long
            message stays fully editable without pushing the conversation off the screen.
          </Decision>
          <Decision id="[[chat-composer]] · One ring, around the whole dock">
            The dock is one surface holding the input and its actions, so the focus ring is drawn
            around <strong>the dock</strong> and the field inside it is de-skinned — no border of its
            own, no fill, no second ring. Two rings nested one inside the other would read as two
            controls where there is one.
          </Decision>
          <Decision id="[[chat-composer]] · Stop replaces send, it does not join it">
            While a response is generating the send control is <strong>replaced</strong> by a stop
            control: one button in the slot, one tab stop, and each state carrying its own accessible
            name. Stop stays operable even when the composer is switched off, because ending a
            response that is already running is the one thing left to do.
          </Decision>
          <Decision id="[[chat-composer]] · The status line says how loudly to say it">
            An <Code>error</Code> is announced assertively and marks the input invalid; a{" "}
            <Code>warning</Code> is announced politely and does not, because a warning is guidance
            rather than a failure. Either way the input describes itself with the message, so a reader
            who tabs back into the box hears what happened.
          </Decision>
          <Decision id="[[chat-composer]] · The status line sits under the dock, like every other field">
            A line on the page beneath the dock, not a row inside it — colour and a glyph, no fill and
            no border. Every input in the system puts its message there, this one is built on that
            input, and the send control stays the dock&apos;s last element rather than having a
            sentence after it. It sat inside the dock briefly, on the argument that a 12px warning
            reads <strong>4.50 : 1</strong> on the page against a 4.5 floor and clears at{" "}
            <strong>4.61 : 1</strong> on the dock&apos;s raised fill — but warning text is accepted at{" "}
            <strong>4.40 : 1</strong> precisely because the glyph ships with it and status is never
            colour alone. 4.50 is better than the figure already ratified, so the placement is a
            layout question, and layout says it goes where a field message goes.
          </Decision>
          <Decision id="[[chat-density]] · One size lane, not a density prop">
            The composer is a control, so it and the buttons inside it ride the global{" "}
            <strong>control</strong> lane — the same step a Button and a TextField take on the same
            page. There is no per-composer density knob to keep in sync.
          </Decision>
          <Decision id="[[container-size-seeding]] · The size it resolves is published to its slot">
            <Code>actions</Code> holds the consumer's controls, and a control resolves the{" "}
            <strong>page's</strong> size unless something tells it otherwise — which is not this
            composer's size whenever <Code>size</Code> is set. So the composer publishes its resolved
            step to everything below it: an unsized attach button lands on the same step and the same
            centre line as the send control beside it, and a control that names its own size keeps it.
          </Decision>
        </Flex>
      </Section>

      <Rule />

      <Section title="Changelog" lead="Notable changes, newest first — grows as the component evolves.">
        <Flex direction="column" gap="3">
          <Decision id="0.9.0 · the actions slot takes the composer's size">
            The composer publishes its resolved step to the tree below it, so an unsized control
            handed to <Code>actions</Code> resolves the <em>composer's</em> size rather than the page's
            — an attach button and the send control beside it are one step and one centre line. A
            control that names its own size is untouched.
          </Decision>
          <Decision id="0.9.0">
            Initial <Code>System/Chat/ChatComposer</Code> — a real textarea on the shared field shell
            with a measured eight-line autogrow cap, the focus ring hoisted to the dock, Enter to send
            with a whitespace no-op, a send control that swaps to stop, and a status line that carries
            its own announcement level.
          </Decision>
        </Flex>
      </Section>
    </Page>
  ),
};
