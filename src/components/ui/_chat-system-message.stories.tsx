import type { Meta, StoryObj } from "@storybook/react-vite";
import { Box, Flex } from "@radix-ui/themes";
import { Sparkle } from "@phosphor-icons/react";
import { ChatMessage } from "./ChatMessage";
import { ChatMessageList } from "./ChatMessageList";
import { ChatSystemMessage } from "./ChatSystemMessage";

/* Test-only behavior for ChatSystemMessage. The docs page is static on view, so everything that
   measures a wrapped line or compares the SAME notice in two placements lives here.
   Underscore-prefixed → _internal, and exempt from the story guards. */

const LONG_NOTICE =
  "This conversation was moved to the archived workspace on 29 July, so replies here no longer " +
  "notify the original participants and the thread is read-only for everyone outside the team.";

const meta: Meta<typeof ChatSystemMessage> = {
  title: "_internal/ChatSystemMessage behavior",
  component: ChatSystemMessage,
  parameters: { controls: { disable: true } },
};
export default meta;
type Story = StoryObj<typeof ChatSystemMessage>;

/** [[chat-system-line]] — THE DECISION'S WHOLE SUBSTANCE. The same notice, with the same props, in two placements:
 *  inside a log it renders NO role (the log is already a polite live region and would announce the
 *  line a second time), standing on its own it takes `role="status"` and announces itself. Both
 *  branches, both variants, in one fixture — so a regression that collapsed the two would have to
 *  fail here. */
export const LiveRegionFollowsThePlacement: Story = {
  render: () => (
    <Flex direction="column" gap="3" p="4" style={{ width: 460 }}>
      <Box data-testid="standalone">
        <ChatSystemMessage>Theme updated.</ChatSystemMessage>
      </Box>
      <Box data-testid="standalone-divider">
        <ChatSystemMessage variant="divider">Today</ChatSystemMessage>
      </Box>
      <Box data-testid="in-list">
        <ChatMessageList label="Conversation with the assistant" style={{ height: 160 }}>
          <ChatSystemMessage>Theme updated.</ChatSystemMessage>
          <ChatMessage sender="assistant">Applied.</ChatMessage>
          <ChatSystemMessage variant="divider">Today</ChatSystemMessage>
        </ChatMessageList>
      </Box>
    </Flex>
  ),
  play: async ({ canvasElement }) => {
    const at = (id: string) => canvasElement.querySelector<HTMLElement>(`[data-testid="${id}"]`)!;
    const notice = (id: string) => at(id).querySelector<HTMLElement>(".rt-ds-chat-system")!;
    const noticesIn = (id: string) =>
      Array.from(at(id).querySelectorAll<HTMLElement>(".rt-ds-chat-system"));

    // OUTSIDE a log there is nothing announcing, so the notice announces itself.
    for (const id of ["standalone", "standalone-divider"]) {
      const el = notice(id);
      if (el.getAttribute("role") !== "status")
        throw new Error(`${id}: a standalone notice must take role="status"; got “${el.getAttribute("role")}”`);
    }

    // INSIDE a log the role is absent — not "polite", not "off", ABSENT. The log's implicit
    // aria-live is what announces the line, and a nested region reads it twice.
    const inside = noticesIn("in-list");
    if (inside.length !== 2)
      throw new Error(`the in-list fixture must render two notices; found ${inside.length}`);
    for (const el of inside) {
      if (el.hasAttribute("role"))
        throw new Error(`inside a log a notice must render NO role; got “${el.getAttribute("role")}”`);
      if (el.hasAttribute("aria-live"))
        throw new Error("inside a log a notice must not open a live region of its own");
    }

    // The two branches are the SAME component with the SAME children — the only difference is where
    // it is mounted. If that stops being true, this fixture stops proving the decision.
    if (notice("standalone").textContent !== inside[0].textContent)
      throw new Error("the two branches must render identical content, or the comparison is not a comparison");

    // And the log region really is the thing doing the announcing.
    const logs = at("in-list").querySelectorAll('[role="log"]');
    if (logs.length !== 1)
      throw new Error(`the enclosing log must be the one live region in the branch; found ${logs.length}`);
  },
};

/** [[chat-system-line]] — THE TEXT WRAPS. The shape this was derived from sets `white-space: nowrap`, which
 *  truncates exactly the long notices its own documentation recommends writing. Asserted by
 *  MEASURING: a long notice in a narrow column has to occupy more than one line box and must not
 *  overflow the column it sits in. */
export const LongNoticeWraps: Story = {
  render: () => (
    <Flex direction="column" gap="4" p="4">
      <Box data-testid="narrow" style={{ width: 260 }}>
        <ChatSystemMessage icon={<Sparkle weight="fill" />}>{LONG_NOTICE}</ChatSystemMessage>
      </Box>
      <Box data-testid="short" style={{ width: 260 }}>
        <ChatSystemMessage>Today</ChatSystemMessage>
      </Box>
      <Box data-testid="divider" style={{ width: 260 }}>
        <ChatSystemMessage variant="divider">{LONG_NOTICE}</ChatSystemMessage>
      </Box>
    </Flex>
  ),
  play: async ({ canvasElement }) => {
    const at = (id: string) => canvasElement.querySelector<HTMLElement>(`[data-testid="${id}"]`)!;
    const notice = (id: string) => at(id).querySelector<HTMLElement>(".rt-ds-chat-system")!;
    const content = (id: string) => at(id).querySelector<HTMLElement>(".rt-ds-chat-system-content")!;

    // Nothing in this component may declare nowrap — that is the defect being fixed.
    for (const id of ["narrow", "short", "divider"]) {
      for (const el of [notice(id), content(id)]) {
        const ws = getComputedStyle(el).whiteSpace;
        if (ws === "nowrap" || ws === "pre")
          throw new Error(`${id}: a system notice must be allowed to wrap; white-space is ${ws}`);
      }
    }

    // MEASURED, not declared: one line box vs several. The short notice is the control — if it also
    // wrapped, the tall reading below would prove nothing about the long one.
    const oneLine = notice("short").getBoundingClientRect().height;
    const wrapped = notice("narrow").getBoundingClientRect().height;
    if (!(wrapped > oneLine * 2))
      throw new Error(`a long notice in a 260px column must wrap to several lines; it is ${wrapped}px against a ${oneLine}px single line`);

    // …and wrapping is not overflowing.
    const column = at("narrow").getBoundingClientRect();
    const box = notice("narrow").getBoundingClientRect();
    if (box.right > column.right + 0.5 || box.left < column.left - 0.5)
      throw new Error(`a wrapped notice must stay inside its column; ${box.left}–${box.right} against ${column.left}–${column.right}`);
    if (notice("narrow").scrollWidth > notice("narrow").clientWidth + 1)
      throw new Error("a wrapped notice must not scroll sideways — that is truncation wearing a different hat");

    // The divider variant wraps too: the label is what shrinks, and the rules keep their line.
    const dividerBox = notice("divider").getBoundingClientRect();
    if (!(dividerBox.height > oneLine * 2))
      throw new Error(`a long divider label must wrap as well; it is ${dividerBox.height}px`);
  },
};

/** The divider variant composes the system Separator — a rule out to EACH side of the label, sharing
 *  whatever width the label leaves. */
export const DividerComposesTheSeparator: Story = {
  render: () => (
    <Flex direction="column" gap="4" p="4" style={{ width: 420 }}>
      <Box data-testid="plain"><ChatSystemMessage>Theme updated.</ChatSystemMessage></Box>
      <Box data-testid="divider"><ChatSystemMessage variant="divider">Today</ChatSystemMessage></Box>
      <Box data-testid="long-divider"><ChatSystemMessage variant="divider">{LONG_NOTICE}</ChatSystemMessage></Box>
    </Flex>
  ),
  play: async ({ canvasElement }) => {
    const at = (id: string) => canvasElement.querySelector<HTMLElement>(`[data-testid="${id}"]`)!;

    if (at("plain").querySelector(".rt-ds-chat-system-rule"))
      throw new Error("the default variant is a line of type — no rules");

    const rules = at("divider").querySelectorAll<HTMLElement>(".rt-ds-chat-system-rule");
    if (rules.length !== 2)
      throw new Error(`the divider variant must run a rule out to each side; found ${rules.length}`);

    // They are the SYSTEM Separator, not a hand-drawn hairline.
    for (const rule of Array.from(rules)) {
      if (!rule.classList.contains("rt-Separator"))
        throw new Error(`each rule must be the system Separator; got class "${rule.className}"`);
      const w = rule.getBoundingClientRect().width;
      if (w < 8) throw new Error(`each rule must actually take width beside the label; got ${w}px`);
    }

    // Balanced: the label sits in the middle, so neither side may swallow the other.
    const [left, right] = Array.from(rules).map((r) => r.getBoundingClientRect().width);
    if (Math.abs(left - right) > 1)
      throw new Error(`the two rules must share the leftover width evenly; got ${left} and ${right}`);

    // A LONG label must not eat the rules. Left to shrink-to-fit, the label takes the whole row and
    // both rules resolve to zero — a divider that silently stops being one, which is the same class
    // of defect as the truncation the wrap fixes, one layer down.
    const longRules = at("long-divider").querySelectorAll<HTMLElement>(".rt-ds-chat-system-rule");
    for (const rule of Array.from(longRules)) {
      const w = rule.getBoundingClientRect().width;
      if (w < 8)
        throw new Error(`a long label must still leave a visible rule on each side; got ${w}px`);
    }
  },
};

/** The notice is quiet BY WEIGHT AND COLOUR, at the same type step as the message bodies around it —
 *  the text lane floors at 12px, so a smaller step would render identically and buy nothing. And it
 *  is deliberately NOT a Callout: no surface, no border, no severity tint. */
export const QuietWithoutASurface: Story = {
  render: () => (
    <Flex direction="column" gap="3" p="4" style={{ width: 460 }}>
      <Box data-testid="pair">
        <ChatMessage sender="assistant">A message body, for comparison.</ChatMessage>
        <ChatSystemMessage>Theme updated.</ChatSystemMessage>
      </Box>
    </Flex>
  ),
  play: async ({ canvasElement }) => {
    const body = canvasElement.querySelector<HTMLElement>(".rt-ds-chat-message-bubble")!;
    const notice = canvasElement.querySelector<HTMLElement>(".rt-ds-chat-system")!;
    const n = getComputedStyle(notice);
    const b = getComputedStyle(body);

    // Same step as the body — quieter, not smaller.
    if (n.fontSize !== b.fontSize)
      throw new Error(`the notice must sit at the message body's step; ${n.fontSize} against ${b.fontSize}`);
    if (n.color === b.color)
      throw new Error("the notice must be a tier below the body by COLOUR");
    if (Number(n.fontWeight) > Number(b.fontWeight))
      throw new Error(`a secondary line must not out-weigh the body; ${n.fontWeight} against ${b.fontWeight}`);

    // NOT a Callout: nothing about it is a box.
    const TRANSPARENT = "rgba(0, 0, 0, 0)";
    if (n.backgroundColor !== TRANSPARENT)
      throw new Error(`a system notice has no surface; it paints ${n.backgroundColor}`);
    for (const w of [n.borderTopWidth, n.borderRightWidth, n.borderBottomWidth, n.borderLeftWidth]) {
      if (w !== "0px") throw new Error(`a system notice has no border; got ${w}`);
    }

    // Centred — that is what separates a notice from a turn.
    if (n.justifyContent !== "center")
      throw new Error(`a system notice must be centred; got ${n.justifyContent}`);
  },
};
