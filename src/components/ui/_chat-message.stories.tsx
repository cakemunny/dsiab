import type { Meta, StoryObj } from "@storybook/react-vite";
import { Box, Flex } from "@radix-ui/themes";
import { Avatar } from "./Avatar";
import { ChatMessage } from "./ChatMessage";
import { ChatMessageMetadata } from "./ChatMessageMetadata";
import { CHAT_MESSAGE_ATTR } from "../../hooks/useChatNewMessages";

/* Test-only behavior for ChatMessage. Everything that MEASURES or DRIVES the component lives here —
   the docs pages are static on view, so a play that reads geometry off a 1200px frame belongs in this
   file. Underscore-prefixed → _internal, and exempt from the story guards. */

/** Resolve what a token means ON THIS ELEMENT, the way the token spec's rows do: paint a throwaway
 *  probe with `var(--token)` and read back what the browser computed. Comparing raw custom-property
 *  text would compare `var(--accent-a3)` against a resolved colour and never agree. */
function resolve(el: Element, prop: string, token: string): string {
  const probe = document.createElement("span");
  probe.style.setProperty(prop, `var(${token})`);
  el.appendChild(probe);
  const value = getComputedStyle(probe).getPropertyValue(prop).trim();
  probe.remove();
  return value;
}

const LONG =
  "Switching the accent to teal moves every accent-aware role at once, so the only thing worth " +
  "checking by hand is where a tint meets text. I measured the three that matter and all of them " +
  "clear the floor in both light and dark.";

const meta: Meta<typeof ChatMessage> = {
  title: "_internal/ChatMessage behavior",
  component: ChatMessage,
  parameters: { controls: { disable: true } },
};
export default meta;
type Story = StoryObj<typeof ChatMessage>;

/** The accessible name: a rendered name wins; without one the fallback is a SENTENCE, not the raw
 *  prop value; and `label` overrides the fallback. */
export const AccessibleName: Story = {
  render: () => (
    <Flex direction="column" gap="3" p="4" style={{ maxWidth: 520 }}>
      <Box data-testid="named">
        <ChatMessage sender="assistant" name="Navi">Named in the layout.</ChatMessage>
      </Box>
      <Box data-testid="user-fallback"><ChatMessage sender="user">No name.</ChatMessage></Box>
      <Box data-testid="assistant-fallback"><ChatMessage sender="assistant">No name.</ChatMessage></Box>
      <Box data-testid="system-fallback"><ChatMessage sender="system">No name.</ChatMessage></Box>
      <Box data-testid="overridden">
        <ChatMessage sender="assistant" label="Message from Navi">No name, but named anyway.</ChatMessage>
      </Box>
    </Flex>
  ),
  play: async ({ canvasElement }) => {
    const article = (id: string) =>
      canvasElement.querySelector<HTMLElement>(`[data-testid="${id}"] article.rt-ds-chat-message`)!;

    // A rendered name IS the accessible name, via aria-labelledby pointing at the node that shows it.
    const named = article("named");
    if (named.hasAttribute("aria-label"))
      throw new Error("a message with a visible name must not carry a competing aria-label");
    const id = named.getAttribute("aria-labelledby");
    if (!id) throw new Error("a message with a visible name must point aria-labelledby at it");
    const target = named.querySelector(`#${CSS.escape(id)}`);
    if (!target) throw new Error(`aria-labelledby=${id} must name a mounted element inside the message`);
    if (target.textContent !== "Navi")
      throw new Error(`aria-labelledby must point at the NAME; it points at “${target.textContent}”`);

    // Without a name the message still introduces itself — in words, never by echoing the prop value.
    const fallbacks: [string, string][] = [
      ["user-fallback", "Message from you"],
      ["assistant-fallback", "Message from the assistant"],
      ["system-fallback", "System message"],
    ];
    for (const [id, expected] of fallbacks) {
      const el = article(id);
      const label = el.getAttribute("aria-label");
      if (label !== expected)
        throw new Error(`${id}: expected the accessible name “${expected}”; got “${label}”`);
      if (el.hasAttribute("aria-labelledby"))
        throw new Error(`${id}: there is no name node to point at, so aria-labelledby must be absent`);
    }

    // …and the sentence is overridable, because "the assistant" is wrong for a named one and for
    // every build that is not in English.
    if (article("overridden").getAttribute("aria-label") !== "Message from Navi")
      throw new Error("the label prop must override the fallback accessible name");
  },
};

/** Sender drives the frame: which way the row runs, and whether there is an avatar slot at all. */
export const SenderLayout: Story = {
  render: () => (
    <Flex direction="column" gap="3" p="4" style={{ maxWidth: 520 }}>
      <Box data-testid="user">
        <ChatMessage sender="user" avatar={<Avatar fallback="AL" />}>Mine.</ChatMessage>
      </Box>
      <Box data-testid="assistant">
        <ChatMessage sender="assistant" avatar={<Avatar fallback="AI" />}>Theirs.</ChatMessage>
      </Box>
      <Box data-testid="system">
        <ChatMessage sender="system" avatar={<Avatar fallback="AI" />}>Theme updated.</ChatMessage>
      </Box>
    </Flex>
  ),
  play: async ({ canvasElement }) => {
    const article = (id: string) =>
      canvasElement.querySelector<HTMLElement>(`[data-testid="${id}"] article.rt-ds-chat-message`)!;

    const expected: [string, string][] = [
      ["user", "row-reverse"],
      ["assistant", "row"],
      ["system", "row"],
    ];
    for (const [id, direction] of expected) {
      const got = getComputedStyle(article(id)).flexDirection;
      if (got !== direction)
        throw new Error(`${id}: expected flex-direction ${direction}; got ${got}`);
    }

    // A system notice is centred rather than aligned to a side…
    if (getComputedStyle(article("system")).justifyContent !== "center")
      throw new Error("a system message must be centred in its row");

    // …and the avatar slot renders for the ASSISTANT only ([[chat-avatar-size]]). All three were passed one here, so
    // this asserts the slot is IGNORED — for the system line, which has no author to picture, and for
    // the reader's own turn, which direction and the filled tint already identify.
    for (const id of ["user", "system"]) {
      if (article(id).querySelector(".rt-ds-chat-message-avatar"))
        throw new Error(`${id}: the avatar slot must be ignored, even when one is passed`);
    }
    if (!article("assistant").querySelector(".rt-ds-chat-message-avatar"))
      throw new Error("assistant: an avatar passed to the other party's message must render");
  },
};

/** [[chat-avatar-header-row]] — the avatar owns the header row. Two shapes of one rule: with a name, the name's row IS the
 *  avatar's box (so the picture's bottom edge and the body's first line meet on one line); without
 *  one, the body's first line is centred against the picture instead. Measured, at whatever lane the
 *  toolbar is on — the fixtures set no size of their own, so the assertions are relationships rather
 *  than the numbers of one tier. */
export const HeaderRhythm: Story = {
  render: () => (
    <Flex direction="column" gap="4" p="4" style={{ maxWidth: 520 }}>
      <Box data-testid="band">
        <ChatMessage sender="assistant" avatar={<Avatar fallback="AI" />} name="Assistant">
          {LONG}
        </ChatMessage>
      </Box>
      <Box data-testid="line">
        <ChatMessage sender="assistant" avatar={<Avatar fallback="AI" />}>{LONG}</ChatMessage>
      </Box>
      <Box data-testid="line-filled">
        <ChatMessage sender="assistant" avatar={<Avatar fallback="AI" />} variant="filled">
          {LONG}
        </ChatMessage>
      </Box>
      <Box data-testid="bare">
        <ChatMessage sender="assistant" name="Assistant">{LONG}</ChatMessage>
      </Box>
    </Flex>
  ),
  play: async ({ canvasElement }) => {
    const at = (id: string, sel: string) =>
      canvasElement.querySelector<HTMLElement>(`[data-testid="${id}"] ${sel}`);
    const box = (id: string, sel: string) => {
      const el = at(id, sel);
      if (!el) throw new Error(`${id}: expected to find ${sel}`);
      return el.getBoundingClientRect();
    };
    const article = (id: string) => at(id, "article.rt-ds-chat-message")!;

    /* ---- band: an avatar WITH a name ---------------------------------------------------------- */
    if (article("band").getAttribute("data-header") !== "band")
      throw new Error(`an avatar beside a name must take the BAND header; got ${article("band").getAttribute("data-header")}`);

    const avatar = box("band", ".rt-ds-chat-message-avatar");
    const name = box("band", ".rt-ds-chat-message-name");
    const body = box("band", ".rt-ds-chat-message-bubble");

    // The header row is the avatar's box — not the name's own line, which is what left the picture
    // ending part-way down the first line of the message.
    if (Math.abs(name.height - avatar.height) > 0.5)
      throw new Error(`the name's row must be the avatar's box (${avatar.height}px); it is ${name.height}px`);
    if (Math.abs(name.top - avatar.top) > 0.5)
      throw new Error(`the header row and the avatar must start on the same line; ${name.top} vs ${avatar.top}`);

    // …and the body starts exactly where the picture ends. THIS is the rhythm claim.
    if (Math.abs(avatar.bottom - body.top) > 0.5)
      throw new Error(
        `the avatar's bottom edge and the body's top edge must be one line; they are ${Math.abs(avatar.bottom - body.top)}px apart`,
      );

    /* ---- line: an avatar with NO name --------------------------------------------------------- */
    for (const id of ["line", "line-filled"]) {
      if (article(id).getAttribute("data-header") !== "line")
        throw new Error(`${id}: an avatar with no name must take the LINE header`);
      const av = box(id, ".rt-ds-chat-message-avatar");
      const bubble = at(id, ".rt-ds-chat-message-bubble")!;
      const s = getComputedStyle(bubble);
      const lead = parseFloat(s.lineHeight);
      const padTop = parseFloat(s.paddingTop);
      // The centre of the FIRST LINE BOX inside the bubble — the line the picture belongs to.
      const lineCentre = bubble.getBoundingClientRect().top + padTop + lead / 2;
      const avatarCentre = (av.top + av.bottom) / 2;
      if (Math.abs(avatarCentre - lineCentre) > 1)
        throw new Error(
          `${id}: the avatar and the first line of the body must share a centre; they are ${Math.abs(avatarCentre - lineCentre).toFixed(2)}px apart`,
        );
    }

    /* ---- neither: no avatar, so nothing to align to and nothing is moved ---------------------- */
    if (article("bare").hasAttribute("data-header"))
      throw new Error("a message with no avatar has no header row to build, so it must carry no data-header");
    const bareName = box("bare", ".rt-ds-chat-message-name");
    const bareAvatarBox = getComputedStyle(article("bare")).getPropertyValue("--chat-avatar-box").trim();
    if (bareName.height >= parseFloat(bareAvatarBox))
      throw new Error(
        `without an avatar the name keeps its own line (${bareAvatarBox} is the avatar's box); it rendered ${bareName.height}px`,
      );
  },
};

/** [[chat-avatar-header-row]] — a run introduces its speaker ONCE, and holds the picture's place on the rest so every body
 *  in the run keeps one left edge. */
export const RunIntroducesOnce: Story = {
  render: () => (
    <Flex direction="column" gap="1" p="4" data-testid="run" style={{ maxWidth: 460 }}>
      <ChatMessage sender="assistant" avatar={<Avatar fallback="AI" />} name="Assistant" group="first">
        One.
      </ChatMessage>
      <ChatMessage sender="assistant" avatar={<Avatar fallback="AI" />} name="Assistant" group="middle">
        Two.
      </ChatMessage>
      <ChatMessage sender="assistant" avatar={<Avatar fallback="AI" />} name="Assistant" group="last">
        Three.
      </ChatMessage>
    </Flex>
  ),
  play: async ({ canvasElement }) => {
    const run = canvasElement.querySelector<HTMLElement>('[data-testid="run"]')!;
    const messages = Array.from(run.querySelectorAll<HTMLElement>("article.rt-ds-chat-message"));
    if (messages.length !== 3) throw new Error(`the fixture must render 3 messages; it rendered ${messages.length}`);

    // One face and one name for the whole run, both on the message that OPENS it.
    const avatars = run.querySelectorAll(".rt-ds-chat-message-avatar");
    const names = run.querySelectorAll(".rt-ds-chat-message-name");
    if (avatars.length !== 1)
      throw new Error(`a run must draw exactly one avatar; it drew ${avatars.length}`);
    if (names.length !== 1)
      throw new Error(`a run must draw exactly one name; it drew ${names.length}`);
    if (!messages[0].contains(avatars[0]) || !messages[0].contains(names[0]))
      throw new Error("the face and the name belong to the message that opens the run");

    // The other two HOLD the picture's place — same box, no height of their own…
    const holds = run.querySelectorAll<HTMLElement>(".rt-ds-chat-message-gutter");
    if (holds.length !== 2)
      throw new Error(`the rest of the run must hold the gutter; ${holds.length} of 2 did`);
    const avatarWidth = avatars[0].getBoundingClientRect().width;
    for (const hold of Array.from(holds)) {
      const w = hold.getBoundingClientRect().width;
      if (Math.abs(w - avatarWidth) > 0.5)
        throw new Error(`a held gutter must be the avatar's own width (${avatarWidth}px); it is ${w}px`);
    }

    // …which is the whole point: every body in the run stands on ONE left edge.
    const edges = messages.map((m) => m.querySelector(".rt-ds-chat-message-bubble")!.getBoundingClientRect().left);
    for (const edge of edges) {
      if (Math.abs(edge - edges[0]) > 0.5)
        throw new Error(`a run's bodies must share a left edge; got ${edges.map((e) => e.toFixed(1)).join(", ")}`);
    }

    // The name is not DROPPED on the later messages, only undrawn: a reader arriving at the third
    // message out of context is still told who is talking.
    if (!messages[0].getAttribute("aria-labelledby"))
      throw new Error("the message that opens the run is named by the name it draws");
    for (const m of messages.slice(1)) {
      if (m.hasAttribute("aria-labelledby"))
        throw new Error("a message that draws no name has nothing to point aria-labelledby at");
      if (m.getAttribute("aria-label") !== "Assistant")
        throw new Error(`a run's later messages must still be named; got “${m.getAttribute("aria-label")}”`);
    }

    // A message standing on its own is untouched by any of it.
    if (messages[0].querySelector(".rt-ds-chat-message-gutter"))
      throw new Error("the message that draws the avatar must not also hold its place");
  },
};

/** [[chat-bubble]] — the default pairing is ASYMMETRIC (user filled, everyone else ghost), the filled tint is the
 *  measured accent step, and `variant` overrides per message. */
export const VariantDefaults: Story = {
  render: () => (
    <Flex direction="column" gap="3" p="4" style={{ maxWidth: 520 }}>
      <Box data-testid="user"><ChatMessage sender="user">Mine.</ChatMessage></Box>
      <Box data-testid="assistant"><ChatMessage sender="assistant">Theirs.</ChatMessage></Box>
      <Box data-testid="system"><ChatMessage sender="system">Theme updated.</ChatMessage></Box>
      <Box data-testid="forced-ghost"><ChatMessage sender="user" variant="ghost">Mine, unboxed.</ChatMessage></Box>
      <Box data-testid="forced-filled"><ChatMessage sender="assistant" variant="filled">Theirs, boxed.</ChatMessage></Box>
    </Flex>
  ),
  play: async ({ canvasElement }) => {
    const bubble = (id: string) =>
      canvasElement.querySelector<HTMLElement>(`[data-testid="${id}"] .rt-ds-chat-message-bubble`)!;
    const fill = (id: string) => getComputedStyle(bubble(id)).backgroundColor;
    const TRANSPARENT = "rgba(0, 0, 0, 0)";

    // The user's message is the filled one, and it is filled with the step the ruling measured —
    // resolved on the element rather than compared as raw custom-property text.
    const userFill = fill("user");
    if (userFill === TRANSPARENT)
      throw new Error("a user message must default to the FILLED variant");
    const expected = resolve(bubble("user"), "background-color", "--ds-fill-accent-weak");
    if (userFill !== expected)
      throw new Error(`the filled bubble must paint --ds-fill-accent-weak (${expected}); got ${userFill}`);

    // Everyone else is plain text on the page — that asymmetry is what carries authorship when a
    // narrow column flattens the left/right alignment.
    for (const id of ["assistant", "system"]) {
      if (fill(id) !== TRANSPARENT)
        throw new Error(`${id}: must default to the GHOST variant; got background ${fill(id)}`);
    }

    // And the default is a default, not a rule.
    if (fill("forced-ghost") !== TRANSPARENT)
      throw new Error("variant=ghost must override the user's filled default");
    if (fill("forced-filled") === TRANSPARENT)
      throw new Error("variant=filled must override the assistant's ghost default");

    // A ghost bubble spends nothing on chrome — that is what buys a long answer its width back.
    const ghostPad = getComputedStyle(bubble("assistant")).paddingInlineStart;
    if (ghostPad !== "0px")
      throw new Error(`a ghost bubble must carry no inline padding; got ${ghostPad}`);
  },
};

/** Grouped corners tighten on the SENDER's side only, so a run reads as one block without losing
 *  which side it came from. */
export const GroupedCorners: Story = {
  render: () => (
    <Flex direction="column" gap="1" p="4" style={{ maxWidth: 420 }}>
      <Box data-testid="standalone"><ChatMessage sender="user">One.</ChatMessage></Box>
      <Box data-testid="user-middle"><ChatMessage sender="user" group="middle">Two.</ChatMessage></Box>
      <Box data-testid="assistant-middle"><ChatMessage sender="assistant" group="middle">Three.</ChatMessage></Box>
    </Flex>
  ),
  play: async ({ canvasElement }) => {
    const bubble = (id: string) =>
      canvasElement.querySelector<HTMLElement>(`[data-testid="${id}"] .rt-ds-chat-message-bubble`)!;

    const standalone = bubble("standalone");
    const full = resolve(standalone, "border-top-left-radius", "--ds-radius-4");
    const tight = resolve(standalone, "border-top-left-radius", "--ds-radius-2");
    if (full === tight)
      throw new Error(`--ds-radius-4 and --ds-radius-2 resolve to the same value (${full}) — this fixture proves nothing`);

    // A standalone message is round on every corner.
    const s = getComputedStyle(standalone);
    for (const corner of ["borderTopLeftRadius", "borderTopRightRadius", "borderBottomRightRadius", "borderBottomLeftRadius"] as const) {
      if (s[corner] !== full)
        throw new Error(`a standalone bubble must be ${full} on every corner; ${corner} is ${s[corner]}`);
    }

    // The user's run tightens on the RIGHT — their own side.
    const u = getComputedStyle(bubble("user-middle"));
    if (u.borderTopRightRadius !== tight || u.borderBottomRightRadius !== tight)
      throw new Error(`a user run must tighten both right corners to ${tight}; got ${u.borderTopRightRadius} / ${u.borderBottomRightRadius}`);
    if (u.borderTopLeftRadius !== full)
      throw new Error(`a user run must leave the far side at ${full}; got ${u.borderTopLeftRadius}`);

    // The assistant's mirrors it on the LEFT.
    const a = getComputedStyle(bubble("assistant-middle"));
    if (a.borderTopLeftRadius !== tight || a.borderBottomLeftRadius !== tight)
      throw new Error(`an assistant run must tighten both left corners to ${tight}; got ${a.borderTopLeftRadius} / ${a.borderBottomLeftRadius}`);
    if (a.borderTopRightRadius !== full)
      throw new Error(`an assistant run must leave the far side at ${full}; got ${a.borderTopRightRadius}`);
  },
};

/** [[chat-bubble]] — the width clamp, measured at both ends of the range. `min(max(80%, 280px), 100%)` only
 *  renders what it computes because the bubble declares `box-sizing: border-box`: a plain div is
 *  content-box, Radix ships no universal reset, and the padding-box was landing a full inset wider
 *  than the clamp on both frames. */
export const BubbleClamp: Story = {
  render: () => (
    <Box p="4">
      <Box data-testid="narrow" style={{ width: 320 }}>
        <ChatMessage sender="user">{LONG}</ChatMessage>
      </Box>
      <Box data-testid="wide" style={{ width: 1200 }}>
        <ChatMessage sender="user">{LONG}</ChatMessage>
      </Box>
    </Box>
  ),
  play: async ({ canvasElement }) => {
    const bubble = (id: string) =>
      canvasElement.querySelector<HTMLElement>(`[data-testid="${id}"] .rt-ds-chat-message-bubble`)!;
    const column = (id: string) =>
      canvasElement.querySelector<HTMLElement>(`[data-testid="${id}"] .rt-ds-chat-message-column`)!;

    // The declaration that makes the rest of this story true.
    for (const id of ["narrow", "wide"]) {
      const box = getComputedStyle(bubble(id)).boxSizing;
      if (box !== "border-box")
        throw new Error(`${id}: the bubble must be border-box or the clamp renders wider than it computes; got ${box}`);
    }

    // 320px frame: 80% would be 256px, so the 280px FLOOR governs. A phone-width column is exactly
    // where an unclamped percentage turns a paragraph into a ribbon.
    const narrowColumn = column("narrow").getBoundingClientRect().width;
    const narrow = bubble("narrow").getBoundingClientRect().width;
    if (Math.abs(narrowColumn - 320) > 0.5)
      throw new Error(`the narrow fixture must give the message a 320px column; got ${narrowColumn}`);
    if (Math.abs(narrow - 280) > 0.5)
      throw new Error(`at a 320px column the bubble must render 280px (the floor); got ${narrow}`);

    // 1200px frame: the percentage governs, and 80% of 1200 is 960 — INCLUDING the inset, which is
    // the whole point of border-box.
    const wideColumn = column("wide").getBoundingClientRect().width;
    const wide = bubble("wide").getBoundingClientRect().width;
    if (Math.abs(wideColumn - 1200) > 0.5)
      throw new Error(`the wide fixture must give the message a 1200px column; got ${wideColumn}`);
    if (Math.abs(wide - 960) > 0.5)
      throw new Error(`at a 1200px column the bubble must render 960px (80%); got ${wide}`);

    // Never wider than the column it sits in — the third arm of the clamp.
    if (wide > wideColumn + 0.5 || narrow > narrowColumn + 0.5)
      throw new Error(`the bubble must never exceed its column; got ${narrow}/${narrowColumn} and ${wide}/${wideColumn}`);
  },
};

/** The attribute contract: the BUBBLE carries the stamp the scroll engines query, and it carries it
 *  once per message. The constant is imported from the engine, so the stamp and the query cannot
 *  drift apart the way a class-name contract does. */
export const MessageAttributeStamp: Story = {
  render: () => (
    <Flex direction="column" gap="2" p="4" style={{ maxWidth: 520 }}>
      <ChatMessage sender="user" metadata={<ChatMessageMetadata timestamp="2:29 PM" status="read" />}>
        One.
      </ChatMessage>
      <ChatMessage sender="assistant" name="Assistant">Two.</ChatMessage>
      <ChatMessage sender="system">Three.</ChatMessage>
    </Flex>
  ),
  play: async ({ canvasElement }) => {
    const stamped = canvasElement.querySelectorAll(`[${CHAT_MESSAGE_ATTR}]`);
    if (stamped.length !== 3)
      throw new Error(`every message must be stamped exactly once; found ${stamped.length} stamps for 3 messages`);

    // The stamp is on the BUBBLE, not the article: the engine measures what the reader watches
    // arrive, and an article stretches the full column whatever the message says.
    for (const el of Array.from(stamped)) {
      if (!el.classList.contains("rt-ds-chat-message-bubble"))
        throw new Error(`the stamp must sit on the bubble; found it on <${el.tagName.toLowerCase()} class="${el.className}">`);
    }

    // Every sender is stamped, including a system notice — a transcript's new-message detector must
    // not go blind on the one message type it did not expect.
    const senders = Array.from(stamped).map(
      (el) => el.closest(".rt-ds-chat-message")?.getAttribute("data-sender"),
    );
    for (const sender of ["user", "assistant", "system"]) {
      if (!senders.includes(sender))
        throw new Error(`a ${sender} message must carry the stamp too; got ${senders.join(", ")}`);
    }
  },
};
