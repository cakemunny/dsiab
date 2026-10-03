import type { Meta, StoryObj } from "@storybook/react-vite";
import { Box, Flex } from "@radix-ui/themes";
import { Button } from "./Button";
import { Link } from "./Link";
import { ChatMessage } from "./ChatMessage";
import { ChatMessageMetadata, type ChatMessageStatus } from "./ChatMessageMetadata";

/* Test-only behavior for ChatMessageMetadata. The docs page is static on view, so everything that
   counts separators, reads a computed direction or scans the stylesheet lives here. Underscore-
   prefixed → _internal, and exempt from the story guards. */

const ALL_STATES: ChatMessageStatus[] = ["sending", "sent", "delivered", "read", "error"];

const meta: Meta<typeof ChatMessageMetadata> = {
  title: "_internal/ChatMessageMetadata behavior",
  component: ChatMessageMetadata,
  parameters: { controls: { disable: true } },
};
export default meta;
type Story = StoryObj<typeof ChatMessageMetadata>;

/** The separator appears BETWEEN two present slots and nowhere else — never leading, never trailing,
 *  and never doubled when the slot in the middle is missing. */
export const ConditionalSeparators: Story = {
  render: () => (
    <Flex direction="column" gap="3" p="4" style={{ maxWidth: 420 }}>
      <Box data-testid="one"><ChatMessageMetadata sender="assistant" timestamp="2:31 PM" /></Box>
      <Box data-testid="status-only"><ChatMessageMetadata sender="assistant" status="read" /></Box>
      <Box data-testid="two"><ChatMessageMetadata sender="assistant" timestamp="2:31 PM" status="read" /></Box>
      <Box data-testid="skip-middle"><ChatMessageMetadata sender="assistant" timestamp="2:31 PM" status="read" /></Box>
      <Box data-testid="three">
        <ChatMessageMetadata sender="assistant" timestamp="2:31 PM" footer="Answered in 4.2s" status="read" />
      </Box>
    </Flex>
  ),
  play: async ({ canvasElement }) => {
    const row = (id: string) =>
      canvasElement.querySelector<HTMLElement>(`[data-testid="${id}"] .rt-ds-chat-meta`)!;
    const seps = (id: string) => row(id).querySelectorAll(".rt-ds-chat-meta-sep").length;

    // n slots ⇒ n − 1 separators. One fact never gets a dot; three facts get exactly two.
    for (const [id, expected] of [["one", 0], ["status-only", 0], ["two", 1], ["three", 2]] as const) {
      if (seps(id) !== expected)
        throw new Error(`${id}: expected ${expected} separator(s); got ${seps(id)}`);
    }

    // …and a missing MIDDLE slot does not leave two dots side by side. The timestamp and the status
    // are present, the footer is not: one dot, between the two things that are there.
    if (seps("skip-middle") !== 1)
      throw new Error(`a missing middle slot must still yield exactly one separator; got ${seps("skip-middle")}`);

    // Never on the outside. Read POSITION, not text: the dot is generated content
    // (`.rt-ds-chat-meta-sep::before`), so it is deliberately absent from `textContent` — a
    // startsWith("·") test would pass on every row without ever looking at anything.
    for (const id of ["one", "two", "three", "skip-middle"]) {
      const kids = [...row(id).children];
      const isSep = (el: Element | undefined) => el?.classList.contains("rt-ds-chat-meta-sep") ?? false;
      if (isSep(kids.at(0)) || isSep(kids.at(-1)))
        throw new Error(`${id}: the row must not lead or trail with a separator; got “${kids.map((k) => k.className).join(" | ")}”`);
    }

    // The dot is decoration between two facts, so it is out of the accessibility tree — and it is
    // PAINTED rather than written, which is what keeps a contrast checker from reading it as prose.
    const dot = row("three").querySelector(".rt-ds-chat-meta-sep")!;
    if (dot.getAttribute("aria-hidden") !== "true")
      throw new Error("the separator must be aria-hidden — a screen reader announcing “middle dot” is worse than a pause");
    if (dot.textContent !== "")
      throw new Error(`the separator must carry no text node (the glyph is ::before content); got “${dot.textContent}”`);
    if (!getComputedStyle(dot, "::before").content.includes("·"))
      throw new Error("the separator's dot must be generated content on ::before");
  },
};

/** With nothing to show the component renders NOTHING — not an empty row that still takes up a line
 *  and still spaces the message above it away from the one below. */
export const EmptyRendersNothing: Story = {
  render: () => (
    <Box p="4" style={{ maxWidth: 420 }}>
      <Box data-testid="empty"><ChatMessageMetadata sender="assistant" /></Box>
      <Box data-testid="present"><ChatMessageMetadata sender="assistant" status="sent" /></Box>
    </Box>
  ),
  play: async ({ canvasElement }) => {
    const empty = canvasElement.querySelector<HTMLElement>('[data-testid="empty"]')!;
    if (empty.querySelector(".rt-ds-chat-meta"))
      throw new Error("with every slot empty the component must render nothing at all");
    if (empty.getBoundingClientRect().height !== 0)
      throw new Error(`an empty metadata row must occupy no height; it occupies ${empty.getBoundingClientRect().height}px`);

    const present = canvasElement.querySelector<HTMLElement>('[data-testid="present"] .rt-ds-chat-meta');
    if (!present) throw new Error("a row with a status must render — this fixture proves nothing otherwise");
  },
};

/** [[delivery-status]] — every state carries its WORD, `delivered` and `read` share a glyph and are told apart by
 *  that word alone, and `error` adds colour and weight on top of it rather than instead of it. */
export const StatesCarryTheirWord: Story = {
  render: () => (
    <Flex direction="column" gap="2" p="4" style={{ maxWidth: 420 }}>
      {ALL_STATES.map((status) => (
        <Box key={status} data-testid={status}>
          <ChatMessageMetadata sender="assistant" status={status} />
        </Box>
      ))}
    </Flex>
  ),
  play: async ({ canvasElement }) => {
    const at = (id: string) => canvasElement.querySelector<HTMLElement>(`[data-testid="${id}"]`)!;
    const label = (id: string) => at(id).querySelector<HTMLElement>(".rt-ds-chat-meta-label")!;

    const words: [ChatMessageStatus, string][] = [
      ["sending", "Sending"], ["sent", "Sent"], ["delivered", "Delivered"],
      ["read", "Read"], ["error", "Failed"],
    ];
    for (const [status, word] of words) {
      const el = label(status);
      if (!el) throw new Error(`${status}: must render a visible state label`);
      if (el.textContent !== word)
        throw new Error(`${status}: expected the word “${word}”; got “${el.textContent}”`);
      if (el.getClientRects().length === 0)
        throw new Error(`${status}: the state label must actually be visible, not clipped out of the layout`);
    }

    // No competing name and no tooltip: what the row says and what a screen reader says are the
    // same words. A title attribute is a hover-only fact, which is the audience that needs it least.
    for (const [status] of words) {
      const chip = at(status).querySelector<HTMLElement>(".rt-ds-chat-meta-status")!;
      if (chip.hasAttribute("aria-label"))
        throw new Error(`${status}: the visible label IS the accessible name — no second one`);
      if (at(status).querySelector("[title]"))
        throw new Error(`${status}: the state must not be hidden in a title attribute`);
    }

    // delivered and read genuinely share ONE glyph — there is no second tick to invent — so the word
    // is the whole distinguisher, and the glyphs must be identical rather than nearly so.
    const glyph = (id: string) => at(id).querySelector<SVGElement>(".rt-ds-chat-meta-glyph")!;
    if (glyph("delivered").innerHTML !== glyph("read").innerHTML)
      throw new Error("delivered and read are documented as sharing one glyph — they no longer do");
    if (label("delivered").textContent === label("read").textContent)
      throw new Error("sharing a glyph is only safe while the WORDS differ");

    // …and colour is never the distinguisher on its own: those two ink the same, too.
    const ink = (id: string) => getComputedStyle(glyph(id)).color;
    if (ink("delivered") !== ink("read"))
      throw new Error("delivered and read must not be told apart by colour — the word does that job");

    // The failed state is the one that breaks out, and it breaks out THREE ways at once.
    const failed = at("error").querySelector<HTMLElement>(".rt-ds-chat-meta-status")!;
    const settled = at("sent").querySelector<HTMLElement>(".rt-ds-chat-meta-status")!;
    const f = getComputedStyle(failed);
    const s = getComputedStyle(settled);
    if (f.color === s.color) throw new Error("a failed send must take the error text role");
    if (Number(f.fontWeight) <= Number(s.fontWeight))
      throw new Error(`a failed send must carry more weight than a settled one; got ${f.fontWeight} vs ${s.fontWeight}`);
    if (ink("error") === ink("sent")) throw new Error("a failed send's glyph must take the error icon role");
  },
};

/** The row follows the message it sits in, and an explicit `sender` wins over that — the same
 *  "explicit beats context" rule the size lanes resolve by. */
export const DirectionFollowsTheMessage: Story = {
  render: () => (
    <Flex direction="column" gap="3" p="4" style={{ maxWidth: 480 }}>
      <Box data-testid="in-user">
        <ChatMessage sender="user" metadata={<ChatMessageMetadata timestamp="2:29 PM" status="read" />}>
          Mine.
        </ChatMessage>
      </Box>
      <Box data-testid="in-assistant">
        <ChatMessage sender="assistant" metadata={<ChatMessageMetadata timestamp="2:31 PM" />}>
          Theirs.
        </ChatMessage>
      </Box>
      <Box data-testid="standalone">
        <ChatMessageMetadata timestamp="2:31 PM" status="read" />
      </Box>
      <Box data-testid="explicit">
        <ChatMessage sender="assistant" metadata={<ChatMessageMetadata sender="user" timestamp="2:31 PM" />}>
          Theirs, with the row overridden.
        </ChatMessage>
      </Box>
    </Flex>
  ),
  play: async ({ canvasElement }) => {
    const row = (id: string) =>
      canvasElement.querySelector<HTMLElement>(`[data-testid="${id}"] .rt-ds-chat-meta`)!;
    const direction = (id: string) => getComputedStyle(row(id)).flexDirection;

    // Inside a message, the row inherits the sender — no prop, no second copy of the fact.
    if (row("in-user").getAttribute("data-sender") !== "user")
      throw new Error("a row inside a user message must read the message's sender from context");
    if (direction("in-user") !== "row-reverse")
      throw new Error(`the user's own small print must run the other way; got ${direction("in-user")}`);
    if (direction("in-assistant") !== "row")
      throw new Error(`the assistant's runs normally; got ${direction("in-assistant")}`);

    // Standalone, with no message to read, it assumes the assistant's direction rather than throwing.
    if (direction("standalone") !== "row")
      throw new Error(`outside a message the row must still render, running normally; got ${direction("standalone")}`);

    // Explicit wins over context.
    if (direction("explicit") !== "row-reverse")
      throw new Error(`an explicit sender must beat the enclosing message; got ${direction("explicit")}`);
  },
};

/** The sending breathe is an ambient loop — a deliberate literal off the intent-named duration
 *  ladder, which is exactly why the central reduced-motion clamp cannot reach it. A play cannot force
 *  the media query, so prove the silencing rule EXISTS in the shipped stylesheet.
 *  It runs on the GLYPH, never the row: the loop's 0.5 trough on the whole span dimmed the word
 *  "Sending" below AA (measured 2.12:1), so the label is held at full opacity. */
export const SendingPulseIsSilenceable: Story = {
  render: () => (
    <Flex direction="column" gap="2" p="4" style={{ maxWidth: 420 }}>
      <Box data-testid="sending"><ChatMessageMetadata sender="assistant" status="sending" /></Box>
      <Box data-testid="sent"><ChatMessageMetadata sender="assistant" status="sent" /></Box>
    </Flex>
  ),
  play: async ({ canvasElement }) => {
    const glyph = (id: string) =>
      canvasElement.querySelector<HTMLElement>(`[data-testid="${id}"] .rt-ds-chat-meta-glyph`)!;

    // Only the in-flight state moves, and only its GLYPH. The breathe REUSES the system's ambient pulse
    // keyframes rather than declaring an identical set of its own — the two were byte-for-byte the same,
    // differing only in a duration that lives on the shorthand. Asserting the shared name is what keeps
    // the reuse honest: if someone re-forks a private copy, this fails.
    const moving = getComputedStyle(glyph("sending")).animationName;
    if (!moving.includes("ds-statusdot-pulse"))
      throw new Error(`a sending glyph must run the shared ambient pulse; got animation-name "${moving}"`);
    const still = getComputedStyle(glyph("sent")).animationName;
    if (still !== "none")
      throw new Error(`a settled row must not animate; got animation-name "${still}"`);

    // The WORD never dims: an opacity loop on the label takes it to 2.12:1 at the trough.
    const label = canvasElement.querySelector<HTMLElement>('[data-testid="sending"] .rt-ds-chat-meta-label')!;
    const labelAnim = getComputedStyle(label).animationName;
    if (labelAnim !== "none")
      throw new Error(`the sending LABEL must not animate (contrast); got animation-name "${labelAnim}"`);
    const rowAnim = getComputedStyle(canvasElement.querySelector<HTMLElement>('[data-testid="sending"] .rt-ds-chat-meta-status')!).animationName;
    if (rowAnim !== "none")
      throw new Error(`the sending row must not animate as a whole (it would dim the label); got animation-name "${rowAnim}"`);

    let found = false;
    for (const sheet of Array.from(document.styleSheets)) {
      let rules: CSSRuleList;
      try { rules = sheet.cssRules; } catch { continue; }
      for (const r of Array.from(rules)) {
        if (r instanceof CSSMediaRule && /prefers-reduced-motion\s*:\s*reduce/.test(r.conditionText)) {
          for (const inner of Array.from(r.cssRules)) {
            if (
              inner instanceof CSSStyleRule &&
              /\.rt-ds-chat-meta-status\[data-status="sending"\]\s+\.rt-ds-chat-meta-glyph/.test(inner.selectorText) &&
              (inner.style.animationName === "none" || inner.style.animation.includes("none"))
            ) {
              found = true;
            }
          }
        }
      }
    }
    if (!found)
      throw new Error('no @media (prefers-reduced-motion: reduce) rule sets animation: none on .rt-ds-chat-meta-status[data-status="sending"] .rt-ds-chat-meta-glyph');
  },
};

/** [[container-size-seeding]] — the FOOTER reads at the row's own type step, whatever is put in it, and the row stays one
 *  line tall. The fixture puts three things in the slot: plain text, a control pinned to a step of
 *  its own (the shape that put 12px beside 16px in one line), and the documented treatment for an
 *  action — a link-styled button. All three must come out at the row's size.
 *
 *  Nothing here sets a size on the ROW: it reads whatever step the ambient lane resolved, so the
 *  assertion cannot pass by forcing the value it measures. */
export const FooterTakesTheRowStep: Story = {
  render: () => (
    <Flex direction="column" gap="3" p="4" style={{ maxWidth: 460 }}>
      <Box data-testid="text">
        <ChatMessage sender="assistant" metadata={<ChatMessageMetadata footer="Answered in 4.2s" />}>
          One.
        </ChatMessage>
      </Box>
      <Box data-testid="pinned">
        <ChatMessage
          sender="user"
          metadata={
            <ChatMessageMetadata
              status="error"
              footer={<Button size="1" priority="tertiary">Retry</Button>}
            />
          }
        >
          Two.
        </ChatMessage>
      </Box>
      <Box data-testid="link">
        <ChatMessage
          sender="user"
          metadata={
            <ChatMessageMetadata
              status="error"
              footer={
                <Link asChild>
                  <button type="button">Retry</button>
                </Link>
              }
            />
          }
        >
          Three.
        </ChatMessage>
      </Box>
    </Flex>
  ),
  play: async ({ canvasElement }) => {
    const row = (id: string) =>
      canvasElement.querySelector<HTMLElement>(`[data-testid="${id}"] .rt-ds-chat-meta`)!;

    for (const id of ["text", "pinned", "link"]) {
      const r = row(id);
      const rowSize = getComputedStyle(r).fontSize;
      const footer = r.querySelector<HTMLElement>(".rt-ds-chat-meta-footer")!;
      const content = (footer.firstElementChild ?? footer) as HTMLElement;
      const got = getComputedStyle(content).fontSize;
      if (got !== rowSize)
        throw new Error(
          `${id}: the footer must read at the row's step (${rowSize}); it read ${got}`,
        );
    }

    // The link-styled action is TEXT in a line of text: the row keeps the height it has with no
    // action in it at all. A boxed control is what stretched it — and that fixture proves the two
    // shapes are actually different, so this assertion is not vacuous.
    const plain = row("text").getBoundingClientRect().height;
    const linked = row("link").getBoundingClientRect().height;
    const boxed = row("pinned").getBoundingClientRect().height;
    if (Math.abs(linked - plain) > 0.5)
      throw new Error(`a link-styled action must not change the row's height; ${linked} vs ${plain}`);
    if (boxed < linked)
      throw new Error(
        `a boxed control must never sit SHORTER than the link treatment; boxed ${boxed}px vs linked ${linked}px`,
      );

    // The action is a real button, and it is not carried by colour alone.
    const action = row("link").querySelector<HTMLElement>("button")!;
    if (action.tagName !== "BUTTON")
      throw new Error("the retry action must be a real button, whatever it is skinned as");
    if (!getComputedStyle(action).textDecorationLine.includes("underline"))
      throw new Error("a link-styled action carries an underline — colour alone is not a signal");
  },
};
