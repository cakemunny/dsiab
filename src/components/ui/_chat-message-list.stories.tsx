import { useState } from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { Box, Flex } from "@radix-ui/themes";
import { ChatsCircle } from "@phosphor-icons/react";
import { Button } from "./Button";
import { EmptyState } from "./EmptyState";
import { ChatMessage } from "./ChatMessage";
import { ChatMessageList } from "./ChatMessageList";

/* Test-only behavior for ChatMessageList. The docs pages are static on view, so everything that
   DRIVES the component — starting a stream, scrolling the log, measuring a bubble against a 320px
   and a 1200px frame — lives here. Underscore-prefixed → _internal, and exempt from the story
   guards. */

// A promise-based poll — the same idiom the other _internal suites use (no @storybook/test dep).
async function waitFor<T>(fn: () => T | null | undefined | false, timeout = 2000): Promise<T> {
  const t0 = performance.now();
  for (;;) {
    const v = fn();
    if (v) return v;
    if (performance.now() - t0 > timeout) throw new Error("waitFor: timed out");
    await new Promise((r) => setTimeout(r, 16));
  }
}

const LONG =
  "Switching the accent to teal moves every accent-aware role at once, so the only thing worth " +
  "checking by hand is where a tint meets text. I measured the three that matter and all of them " +
  "clear the floor in both light and dark.";

/** Enough turns to overflow any log short enough to fit on a test page. */
function Transcript({ turns = 8 }: { turns?: number }) {
  return (
    <>
      {Array.from({ length: turns }, (_, i) => (
        <ChatMessage key={i} sender={i % 2 === 0 ? "user" : "assistant"}>
          {i % 2 === 0 ? `Question number ${i + 1}.` : LONG}
        </ChatMessage>
      ))}
    </>
  );
}

const meta: Meta<typeof ChatMessageList> = {
  title: "_internal/ChatMessageList behavior",
  component: ChatMessageList,
  parameters: { controls: { disable: true } },
};
export default meta;
type Story = StoryObj<typeof ChatMessageList>;

/** ONE NODE IS THE SCROLLER AND THE LOG. The role, the name and the tab stop all land on the
 *  viewport — the node that actually scrolls — so a keyboard user's focus and the arrow keys reach
 *  the same element. A `role="log"` wrapper around a separate scroller would pass every attribute
 *  check here and still move nothing. */
export const TheLogIsTheScroller: Story = {
  render: () => (
    <Box p="4" data-testid="frame">
      <ChatMessageList label="Conversation with the assistant" style={{ height: 220 }}>
        <Transcript />
      </ChatMessageList>
    </Box>
  ),
  play: async ({ canvasElement }) => {
    const root = canvasElement.querySelector<HTMLElement>(".rt-ds-chat-list")!;
    if (!root) throw new Error("the list must render a root carrying .rt-ds-chat-list");

    const named = canvasElement.querySelectorAll('[role="log"]');
    if (named.length !== 1)
      throw new Error(`exactly one log region per list; found ${named.length}`);
    const log = named[0] as HTMLElement;

    // [[chat-log-scroller]] — a focusable region with no accessible name is a WCAG 4.1.2 failure, and the log is the
    // first thing a keyboard user lands on.
    if (log.getAttribute("aria-label") !== "Conversation with the assistant")
      throw new Error(`the log must carry its accessible name; got “${log.getAttribute("aria-label")}”`);
    if (log.tabIndex !== 0)
      throw new Error(`the log must be a tab stop; tabIndex is ${log.tabIndex}`);

    // …and it is the VIEWPORT, not a wrapper around it. This is the whole adjudication.
    if (!log.classList.contains("rt-ScrollAreaViewport"))
      throw new Error(`the role must sit on the scrolling viewport; it sits on <${log.tagName.toLowerCase()} class="${log.className}">`);

    // Proven by SCROLLING it, not by reading a class name off it.
    await waitFor(() => log.scrollHeight > log.clientHeight + 8);
    log.scrollTop = 40;
    if (log.scrollTop < 1)
      throw new Error(`the node carrying role="log" must be the node that scrolls; scrollTop stayed ${log.scrollTop}`);

    // The class the stylesheet hangs on is on the ROOT (Radix routes className there), and the root
    // is not the scroller — which is exactly why the CSS reaches the viewport by descent.
    if (root.classList.contains("rt-ScrollAreaViewport"))
      throw new Error("the class must land on the Root; if it lands on the viewport the CSS notes are wrong");
    if (!root.contains(log)) throw new Error("the viewport must be inside the classed root");
  },
};

/** [[chat-log-scroller]] — `isStreaming` marks the log `aria-busy`, which is what stops a screen reader re-reading a
 *  half-arrived answer on every token. Driven through the REAL control, and asserted in BOTH
 *  directions: it has to come back down when the answer lands. */
export const AriaBusyFlipsOnStream: Story = {
  render: function StreamingHarness() {
    const [streaming, setStreaming] = useState(false);
    return (
      <Flex direction="column" gap="3" p="4">
        <Flex gap="2">
          <Button data-testid="start" onClick={() => setStreaming(true)}>Start</Button>
          <Button data-testid="release" priority="secondary" onClick={() => setStreaming(false)}>Release</Button>
        </Flex>
        <ChatMessageList label="Conversation with the assistant" isStreaming={streaming} style={{ height: 180 }}>
          <ChatMessage sender="user">Check the contrast first.</ChatMessage>
          <ChatMessage sender="assistant">{streaming ? "Measur" : LONG}</ChatMessage>
        </ChatMessageList>
      </Flex>
    );
  },
  play: async ({ canvasElement }) => {
    const log = () => canvasElement.querySelector<HTMLElement>('[role="log"]')!;
    const busy = () => log().getAttribute("aria-busy");
    const press = (id: string) =>
      canvasElement.querySelector<HTMLButtonElement>(`[data-testid="${id}"]`)!.click();

    // At rest the log is NOT busy — the attribute is present and false, so the state is stated
    // rather than inferred from an absence.
    if (busy() !== "false")
      throw new Error(`a settled log must read aria-busy="false"; got “${busy()}”`);

    press("start");
    await waitFor(() => busy() === "true");

    press("release");
    await waitFor(() => busy() === "false");

    // A one-way flag would pass a "goes true" test and never announce the finished answer, so the
    // round trip is the assertion — and it is driven twice to prove it is not a first-render fluke.
    press("start");
    await waitFor(() => busy() === "true");
    press("release");
    await waitFor(() => busy() === "false");
  },
};

/** The empty slot: nothing to show means the slot shows, and a conversation means the rail shows.
 *  Neither is ever both, and a list with no children AND no slot renders no rail at all. */
export const EmptyStateSlot: Story = {
  render: () => (
    <Flex direction="column" gap="3" p="4">
      <Box data-testid="empty" style={{ width: 420 }}>
        <ChatMessageList
          label="New conversation"
          style={{ height: 200 }}
          emptyState={
            <EmptyState
              icon={<ChatsCircle />}
              title="No messages yet"
              description="Ask a question to start the conversation."
            />
          }
        />
      </Box>
      <Box data-testid="filled" style={{ width: 420 }}>
        <ChatMessageList
          label="Conversation with the assistant"
          style={{ height: 200 }}
          emptyState={<EmptyState title="No messages yet" />}
        >
          <ChatMessage sender="user">One.</ChatMessage>
        </ChatMessageList>
      </Box>
      <Box data-testid="bare" style={{ width: 420 }}>
        <ChatMessageList label="Nothing at all" style={{ height: 120 }}>
          {[]}
        </ChatMessageList>
      </Box>
    </Flex>
  ),
  play: async ({ canvasElement }) => {
    const at = (id: string) => canvasElement.querySelector<HTMLElement>(`[data-testid="${id}"]`)!;

    const emptySlot = at("empty").querySelector<HTMLElement>(".rt-ds-chat-list-empty");
    if (!emptySlot) throw new Error("a list with no children must render its empty-state slot");
    if (at("empty").querySelector(".rt-ds-chat-list-rail"))
      throw new Error("an empty list must not also render the message rail");
    // Blameless copy is a contract, not a suggestion — the specimen models it and this pins it.
    if (!/No messages yet/.test(emptySlot.textContent ?? ""))
      throw new Error(`the empty state must say what is missing, not what the reader failed to do; got “${emptySlot.textContent}”`);

    if (!at("filled").querySelector(".rt-ds-chat-list-rail"))
      throw new Error("a list with a message must render the rail");
    if (at("filled").querySelector(".rt-ds-chat-list-empty"))
      throw new Error("a list with a message must not also render the empty-state slot");

    // An empty ARRAY of children is empty — `Children.toArray` is what makes `{items.map(…)}` read
    // as nothing rather than as one child.
    if (at("bare").querySelector(".rt-ds-chat-list-rail"))
      throw new Error("an empty children array must not render a rail");
    if (at("bare").querySelector(".rt-ds-chat-list-empty"))
      throw new Error("with no slot to show, an empty list renders nothing at all");
  },
};

/** The geometry that the log inherits from the scroll primitive: a bubble's percentage max-width has
 *  to resolve against the rail, at both ends of the range. Measured INSIDE the log, because that is
 *  the box whose sizing was in question. */
export const BubbleWidthInsideTheLog: Story = {
  render: () => (
    <Box p="4">
      <Box data-testid="narrow" style={{ width: 320 }}>
        <ChatMessageList label="Narrow conversation" style={{ height: 200 }}>
          <ChatMessage sender="user">{LONG}</ChatMessage>
        </ChatMessageList>
      </Box>
      <Box data-testid="wide" style={{ width: 1200 }}>
        <ChatMessageList label="Wide conversation" style={{ height: 200 }}>
          <ChatMessage sender="user">{LONG}</ChatMessage>
        </ChatMessageList>
      </Box>
    </Box>
  ),
  play: async ({ canvasElement }) => {
    const rail = (id: string) =>
      canvasElement.querySelector<HTMLElement>(`[data-testid="${id}"] .rt-ds-chat-list-rail`)!;
    const bubble = (id: string) =>
      canvasElement.querySelector<HTMLElement>(`[data-testid="${id}"] .rt-ds-chat-message-bubble`)!;

    for (const id of ["narrow", "wide"]) {
      const w = rail(id).getBoundingClientRect().width;
      const b = bubble(id).getBoundingClientRect().width;
      // The clamp the bubble declares — min(max(80%, 280px), 100%) — recomputed from what the rail
      // ACTUALLY measured, so this fails if percentages stop resolving against the rail's own box.
      const expected = Math.min(Math.max(w * 0.8, 280), w);
      if (Math.abs(b - expected) > 1)
        throw new Error(`${id}: a ${w}px rail must clamp the bubble to ${expected.toFixed(1)}px; got ${b.toFixed(1)}px`);
      if (b > w + 0.5)
        throw new Error(`${id}: the bubble must never exceed the rail; got ${b.toFixed(1)} in ${w.toFixed(1)}`);
    }

    // The two frames must land on DIFFERENT arms of the clamp, or the check above proves nothing.
    const narrow = bubble("narrow").getBoundingClientRect().width;
    const wide = bubble("wide").getBoundingClientRect().width;
    if (Math.abs(narrow - 280) > 1)
      throw new Error(`the 320px frame must land on the 280px floor; got ${narrow.toFixed(1)}`);
    if (wide <= narrow)
      throw new Error(`the 1200px frame must land on the percentage arm; got ${wide.toFixed(1)}`);
  },
};

/** [[focus-ring]] — the log is a real tab stop, so its focus indicator is the system ring: the accent base with
 *  a Radix alpha stacked on it, 2px, on the overlay ring element the scroll primitive renders. A play
 *  cannot force `:focus-visible` reliably, so prove from the shipped stylesheet which rules REACH this
 *  log's elements in that state, in cascade order, including the `forced-colors: none` block that
 *  draws the two layers. Reach is tested with `matches()` on the real nodes, not a class-name regex,
 *  because the ring rules serve every ScrollArea. */
type FocusRule = { selector: string; slot: "" | "::before" | "::after"; style: CSSStyleDeclaration };
function focusRulesReaching(el: Element): FocusRule[] {
  const out: FocusRule[] = [];
  const walk = (rules: CSSRuleList) => {
    for (const rule of Array.from(rules)) {
      if (rule instanceof CSSMediaRule) {
        if (window.matchMedia(rule.media.mediaText).matches) walk(rule.cssRules);
        continue;
      }
      if (!(rule instanceof CSSStyleRule)) continue;
      if (!/:focus-visible/.test(rule.selectorText)) continue;
      // Split the selector list at TOP-LEVEL commas only: the [[focus-ring]] rules carry `:is(a, b, …)::before`
      // and a pseudo-element anywhere in the string makes `matches()` throw.
      const parts: string[] = [];
      let depth = 0;
      let start = 0;
      for (let i = 0; i < rule.selectorText.length; i++) {
        const c = rule.selectorText[i];
        if (c === "(") depth++;
        else if (c === ")") depth--;
        else if (c === "," && depth === 0) { parts.push(rule.selectorText.slice(start, i)); start = i + 1; }
      }
      parts.push(rule.selectorText.slice(start));
      for (const part of parts) {
        const slot = /::after\s*$/.test(part) ? "::after" : /::before\s*$/.test(part) ? "::before" : "";
        const stripped = part
          .replace(/:where\(:focus-visible\)|:focus-visible/g, "")
          .replace(/::(before|after)\s*$/, "");
        let reaches = false;
        try { reaches = el.matches(stripped); } catch { continue; }
        if (reaches) out.push({ selector: rule.selectorText, slot, style: rule.style });
      }
    }
  };
  for (const sheet of Array.from(document.styleSheets)) {
    let rules: CSSRuleList;
    try { rules = sheet.cssRules; } catch { continue; }
    walk(rules);
  }
  return out;
}

export const FocusRingTakesTheSystemRing: Story = {
  render: () => (
    <Box p="4" style={{ width: 420 }}>
      <ChatMessageList label="Conversation with the assistant" style={{ height: 160 }}>
        <Transcript turns={4} />
      </ChatMessageList>
    </Box>
  ),
  play: async ({ canvasElement }) => {
    const ring = canvasElement.querySelector<HTMLElement>(".rt-ds-chat-list .rt-ScrollAreaViewportFocusRing");
    if (!ring) throw new Error("the scroll primitive must render its focus-ring overlay");

    // The overlay is absolutely positioned at inset:0, so it needs a positioning context or it
    // outlines whatever ancestor happens to be positioned.
    const root = canvasElement.querySelector<HTMLElement>(".rt-ds-chat-list")!;
    if (getComputedStyle(root).position !== "relative")
      throw new Error("the list root must establish a positioning context for the focus-ring overlay");

    // The overlay's own outline is the ring's geometry and its forced-colours ring: the accent base
    // at 2px.
    const rules = focusRulesReaching(ring);
    const own = rules.find((r) => r.slot === "" && /var\(--ds-stroke-focus\)/.test(r.style.outlineColor));
    if (!own) throw new Error("no :focus-visible rule gives the log's ring overlay the --ds-stroke-focus base");
    if (own.style.outlineWidth !== "2px")
      throw new Error(`the ring is 2px wide ([[focus-ring]]); ${own.selector} declares ${own.style.outlineWidth || "no width"}`);

    // The two layers. The LAST outline colour declared for each pseudo is the one the cascade uses.
    const layers: [FocusRule["slot"], string][] = [["::before", "var(--ds-stroke-focus)"], ["::after", "var(--ds-stroke-focus-stack)"]];
    for (const [slot, expected] of layers) {
      const painted = rules.filter((r) => r.slot === slot && r.style.outlineColor).at(-1)?.style.outlineColor.trim() ?? "";
      if (painted !== expected)
        throw new Error(`the ring's ${slot} layer must paint ${expected}; it paints “${painted}”`);
    }

    // …and the BROWSER'S own outline is suppressed on the focusable node. A stock ScrollArea has no
    // tab stop, so nothing ever had to remove it; ours does, and the UA paints a hard-coded blue one
    // pixel outside the ring above — two rings, in two colours, one of which no theme can reach.
    const viewport = canvasElement.querySelector<HTMLElement>(".rt-ds-chat-list .rt-ScrollAreaViewport")!;
    const suppressed = focusRulesReaching(viewport).some(
      (r) => r.slot === "" && (r.style.outlineStyle === "none" || r.style.outline === "none"),
    );
    if (!suppressed)
      throw new Error("the focusable viewport must suppress the browser's own outline — the system ring is drawn on the overlay beside it");
  },
};

/** The list publishes a context so a part rendered inside it can tell it is inside a log. This is the
 *  provider half of that contract; ChatSystemMessage's suite asserts the consumer half. */
export const PublishesTheListContext: Story = {
  render: () => (
    <Flex direction="column" gap="3" p="4" style={{ width: 420 }}>
      <Box data-testid="idle">
        <ChatMessageList label="Idle conversation" style={{ height: 120 }}>
          <ChatMessage sender="user">One.</ChatMessage>
        </ChatMessageList>
      </Box>
      <Box data-testid="streaming">
        <ChatMessageList label="Streaming conversation" isStreaming style={{ height: 120 }}>
          <ChatMessage sender="user">One.</ChatMessage>
        </ChatMessageList>
      </Box>
    </Flex>
  ),
  play: async ({ canvasElement }) => {
    const log = (id: string) =>
      canvasElement.querySelector<HTMLElement>(`[data-testid="${id}"] [role="log"]`)!;
    if (log("idle").getAttribute("aria-busy") !== "false")
      throw new Error("an idle list must publish a settled log");
    if (log("streaming").getAttribute("aria-busy") !== "true")
      throw new Error("a streaming list must publish a busy log");

    // One live region per list, and only one. A second one inside would double every announcement.
    const regions = canvasElement.querySelectorAll('[role="log"], [role="status"], [role="alert"], [aria-live]');
    if (regions.length !== 2)
      throw new Error(`two lists must contribute exactly two live regions; found ${regions.length}`);
  },
};
