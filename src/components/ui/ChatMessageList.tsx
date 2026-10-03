// Copyright (c) Meta Platforms, Inc. and affiliates.
//
// Portions derived from facebook/astryx packages/core/src/Chat/ChatMessageList.tsx @ d7c9a39b
// (MIT, © Meta Platforms) — the message log: the `role="log"` region, the streaming `aria-busy`
// suppression, the list context published to the parts rendered inside it, the empty-state slot,
// and the spacer that keeps a short conversation anchored to the bottom.

import {
  Children, createContext, forwardRef, useContext, useEffect, useMemo,
  type CSSProperties, type ReactNode, type Ref,
} from "react";
import { ScrollArea } from "./ScrollArea";
import { useResolvedSize } from "../../theme/SizeContext";

// Dev-only accessibility warnings, resolved once at module load. A `try` rather than
// `typeof process !== "undefined" && …`: a bundler replaces the LITERAL `process.env.NODE_ENV`
// without defining a `process` global, so the typeof form reads "undefined" and silences the
// warning in exactly the dev build it exists for (measured here: typeof process = "undefined",
// literal replaced with "test"). The catch fires only when NOTHING replaced the literal and no
// `process` exists — the browser bundle that used to throw a ReferenceError — and stays silent.
const DEV_WARN = (() => {
  try {
    return process.env.NODE_ENV !== "production";
  } catch {
    return false;
  }
})();

/* =============================================================================
 * ChatMessageList — the conversation itself: a scrolling, named, announcing log
 * of everything that has been said.
 * -----------------------------------------------------------------------------
 * ONE NODE IS THE SCROLLER AND THE LOG. `role="log"`, the accessible name,
 * `tabIndex={0}` and `aria-busy` are all handed to `ScrollArea` as rest props,
 * and Radix routes rest props AND the forwarded ref onto its VIEWPORT — the node
 * that actually scrolls — while `className` / `style` go to the Root. So the
 * region a reader can focus is the region a reader can scroll. The alternative
 * (a `role="log"` wrapper around a separate scrolling div) ships a focusable
 * element that swallows the arrow keys and moves nothing.
 *
 * The consequence for CSS: our class lands on the ROOT, so anything that has to
 * reach the viewport reaches it with a DESCENDANT selector on
 * `.rt-ScrollAreaViewport`. Setting `className` on this component can never
 * style the scrolling node.
 *
 * THE ANNOUNCEMENT MECHANISM IS THE ROLE, NOT A HAND-ROLLED REGION.
 * `role="log"` carries an implicit `aria-live="polite"`, so the log announces
 * its own additions — that is the whole point of putting the role on the node
 * the messages land in. `isStreaming` marks it `aria-busy`, which is what stops
 * a screen reader re-reading a partially-arrived answer on every token; the
 * finished message is announced once, when the flag clears. There is no
 * per-token announcement and no second live region anywhere in this family.
 *
 * DIVERGENCES FROM THE SHAPE THIS WAS DERIVED FROM (recorded in DECISIONS as
 * [[chat-log-scroller]] and [[chat-density]]; the ledger, not the stories, is where provenance lives):
 *
 *   [[chat-log-scroller]]  THE ACCESSIBLE NAME IS REQUIRED, in the type and at runtime. The
 *         source ships a focusable `role="log"` with no name at all, which is a
 *         WCAG 4.1.2 failure on the one element a keyboard user lands on first.
 *         `label` is not optional here, and a dev build says so out loud when it
 *         arrives empty.
 *   [[chat-density]]    ONE LANE, NOT A DENSITY PROP. The source carries
 *         `compact | balanced | spacious` and forks the gap and the padding on
 *         it; the list's spacing comes from the global CONTAINER lane — the same
 *         surface scale a Card or a Dialog rides — so a product sets its density
 *         once, globally, rather than per conversation.
 *   [[chat-log-scroller]]   A STREAMING ANSWER WITH NOTHING IN IT YET SHOWS A SPINNER IN THE
 *         BUBBLE. `aria-busy` closes the gap for a screen-reader user and leaves
 *         a sighted one watching an empty column, so the assistant's message is
 *         rendered with a `Spinner` as its body until the first token lands.
 *         That is composition, not a new component — documented on Usage.
 *
 * WHAT THIS COMPONENT DOES NOT OWN: auto-scroll, the scroll-to-latest control
 * and the docked composer. Those belong to the layout above it; the list is the
 * log and nothing else.
 * ============================================================================= */

/** What the log publishes to the parts rendered inside it. Deliberately minimal — its job is to let
 *  a part know it is INSIDE a log at all, so it does not open a second live region on top of one
 *  that is already announcing. */
export interface ChatListContextValue {
  /** Whether an answer is currently streaming into the log. */
  isStreaming: boolean;
}

const ChatListContext = createContext<ChatListContextValue | null>(null);

/** Read the enclosing log, if there is one. Returns `null` outside a `ChatMessageList`, so a part can
 *  be documented and used standalone — the `useOptionalFieldControl` idiom. */
export function useOptionalChatList(): ChatListContextValue | null {
  return useContext(ChatListContext);
}

export interface ChatMessageListProps {
  /** Ref forwarded to the SCROLLING node — the viewport, which is also the log region. */
  ref?: Ref<HTMLDivElement>;
  /** **Required.** What this conversation is, in words — "Conversation with the assistant",
   *  "Support thread with Dana". The log is focusable, so it is the first thing a keyboard user
   *  lands on; an unnamed focusable region is a WCAG 4.1.2 failure. */
  label: string;
  /** The messages, oldest first. `ChatMessage`, `ChatSystemMessage`, or anything composed. */
  children?: ReactNode;
  /** What to show when there is nothing in the conversation yet. `EmptyState` belongs here. */
  emptyState?: ReactNode;
  /** Whether an answer is streaming in right now. Marks the log `aria-busy`, so assistive technology
   *  waits and announces the finished message once rather than re-reading each partial. */
  isStreaming?: boolean;
  /** Merged onto the ROOT — this is the element to give a height to. */
  className?: string;
  /** Inline styles on the ROOT. The log needs a bounded height to scroll at all. */
  style?: CSSProperties;
  /** Escape hatch for passthrough attributes (data-*). Lands on the viewport with everything else. */
  [key: `data-${string}`]: unknown;
}

export const ChatMessageList = forwardRef<HTMLDivElement, ChatMessageListProps>(
  function ChatMessageList(
    { label, children, emptyState, isStreaming = false, className, style, ...rest },
    ref,
  ) {
    // The list is a SURFACE, so its inset and the space between messages ride the container lane —
    // the same scale a Card or a Dialog takes. The scrollbar's own thickness is ScrollArea's business
    // and rides the control lane inside that wrap.
    const size = useResolvedSize("container", undefined);

    // A focusable region with no name is a WCAG 4.1.2 failure, and it is the FIRST thing a keyboard
    // user reaches in a chat. The type makes it required; this catches the empty string a template
    // literal can hand over at runtime. (The TextArea precedent.)
    useEffect(() => {
      if (DEV_WARN && (label == null || label.trim() === "")) {
        console.warn(
          "ChatMessageList: `label` is the log region's accessible name and must not be empty — a " +
          "focusable region with no name is a WCAG 4.1.2 failure.",
        );
      }
    }, [label]);

    const context = useMemo<ChatListContextValue>(() => ({ isStreaming }), [isStreaming]);

    // `Children.toArray` is the honest test: it drops null, undefined and booleans and flattens
    // arrays, so `{items.map(…)}` over an empty array reads as empty rather than as one child.
    const hasChildren = Children.toArray(children).length > 0;

    return (
      <ChatListContext.Provider value={context}>
        <ScrollArea
          ref={ref}
          className={["rt-ds-chat-list", className].filter(Boolean).join(" ")}
          style={style}
          /* Everything from here lands on the VIEWPORT — the node that scrolls. */
          role="log"
          aria-label={label}
          aria-busy={isStreaming}
          tabIndex={0}
          {...rest}
        >
          <div className="rt-ds-chat-list-content" data-size={size}>
            {hasChildren ? (
              /* `margin-block-start: auto` on the rail is what keeps a two-message conversation at
                 the BOTTOM of a tall log, the way every chat reads. An auto margin only absorbs
                 POSITIVE free space, so once the conversation overflows it resolves to zero and the
                 top of the transcript stays reachable — which is exactly what
                 `justify-content: flex-end` gets wrong. */
              <div className="rt-ds-chat-list-rail">{children}</div>
            ) : emptyState != null ? (
              <div className="rt-ds-chat-list-empty">{emptyState}</div>
            ) : null}
          </div>
        </ScrollArea>
      </ChatListContext.Provider>
    );
  },
);
