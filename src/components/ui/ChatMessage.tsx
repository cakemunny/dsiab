// Copyright (c) Meta Platforms, Inc. and affiliates.
// Portions derived from facebook/astryx packages/core/src/Chat/ChatMessage.tsx @ d7c9a39b (MIT, © Meta Platforms)
// Portions derived from facebook/astryx packages/core/src/Chat/ChatMessageBubble.tsx @ d7c9a39b (MIT, © Meta Platforms)
//
// The sender-aware message frame (avatar · name · body · metadata) and the bubble's variant/group skin.

import {
  createContext, forwardRef, useContext, useId, useMemo,
  type CSSProperties, type ReactNode, type Ref,
} from "react";
import { CHAT_MESSAGE_ATTR } from "../../hooks/useChatNewMessages";
import { useResolvedSize } from "../../theme/SizeContext";

/* =============================================================================
 * ChatMessage — one turn in a conversation: who said it, what they said, and
 * what happened to it afterwards.
 * -----------------------------------------------------------------------------
 * THE BUBBLE IS FOLDED IN ([[chat-family]]). The shape this was derived from splits the frame
 * and the bubble across two components — the frame renders NO bubble at all, and
 * every caller is expected to wrap its own content in a second component and keep
 * the two in sync (the source's own JSDoc spends two paragraphs on which of the
 * two `name`/`metadata` pairs to use). Here `variant` and `group` are props on the
 * message, so there is one component, one place to put a name, and one place to
 * put metadata — no coordination problem to document.
 *
 * DIVERGENCES FROM THE SHAPE THIS WAS DERIVED FROM (recorded in DECISIONS as [[chat-bubble]]
 * and [[chat-density]]; the ledger, not the stories, is where provenance lives):
 *
 *   —     THE FALLBACK ACCESSIBLE NAME IS HUMAN. The source interpolates the raw
 *         prop value — `Message from ${sender}` — so a screen reader announces
 *         "Message from assistant", an API token read aloud. Ours says "Message
 *         from you" / "Message from the assistant" / "System message", and the
 *         `label` prop overrides it (a product with a named assistant wants its
 *         name there, and a localized build needs the string to come from
 *         outside). A rendered `name` still wins over both, via aria-labelledby.
 *   [[chat-bubble]]    DEFAULT PAIRING IS ASYMMETRIC: user = filled, assistant = ghost. The
 *         source fills BOTH sides from the same neutral token, which means the
 *         bubble carries no authorship at all and the side alignment does all the
 *         work — and side alignment is exactly what collapses in a narrow column.
 *         Asymmetry survives that, and it buys the assistant's long answers back
 *         the padding a bubble would spend.
 *   [[chat-bubble]]    THE FILLED TINT IS `--ds-fill-accent-weak` (the a3 step), chosen on a
 *         measured sweep of every accent against both appearances: body text
 *         clears 4.5 everywhere (worst 11.86) and so does metadata (worst 4.73).
 *         The a5 step fails metadata on 25 of the 54 combinations. Recorded in
 *         the ruling with the numbers.
 *   [[chat-bubble]]    `box-sizing: border-box` on the bubble is LOAD-BEARING, not hygiene: a
 *         plain div is content-box and Radix ships no universal reset, so the
 *         clamped `max-width` rendered a full padding-box wider than it computed.
 *   [[chat-density]]    One lane, not a density prop. The source carries `compact | balanced |
 *         spacious` through context and forks the padding, the gap and the radius
 *         on it; our sizing comes from the global text lane, which every other
 *         text-shaped component in the system already follows.
 *
 * THE ATTRIBUTE CONTRACT. The bubble root is stamped with `CHAT_MESSAGE_ATTR`,
 * imported from the scroll engine that queries it — the stamp and the query share
 * one constant so they cannot drift. The source used a class name for this, which
 * makes message detection a hostage to styling.
 *
 * NO `as` AND NO `asChild`, BOTH REFUSED ON MEASUREMENT ([[api-seam-criterion]], 2026-09-22). The
 * candidate need was a transcript marked up as `ul > li`. A consumer's own `li`
 * around this article already serves it, and the paint is IDENTICAL: measured in
 * a 520px log, the message box is [36, 306, 496, 32] and the bubble [365, 306,
 * 167, 32] whether the article is the rail's own child or sits inside an `li`,
 * with zero axe violations either way, and the tree reads `listitem > article
 * "Message from you"`. A tag swap would also have to agree with
 * `ChatSystemMessage`, and that one cannot take `li` at all: outside a
 * `ChatMessageList` it carries `role="status"`, which replaces the listitem role
 * and breaks the list. The valve is thus not earned, which is [[api-seam-criterion]] working
 * rather than failing. `asChild` is refused for its own reason: `children` is
 * the bubble body, so there is no free slot to hand an element to.
 * ============================================================================= */

/** Who the message is from. Drives alignment, the default bubble skin, and the fallback name. */
export type ChatMessageSender = "user" | "assistant" | "system";

/** The bubble skin. `filled` takes the accent tint; `ghost` is text with no surface at all. */
export type ChatMessageVariant = "filled" | "ghost";

/** Position within a run of consecutive messages from the same sender. Tightens the sender-side corners. */
export type ChatMessageGroup = "first" | "middle" | "last";

/** What a message publishes to the parts rendered inside it (the metadata row reads `sender` to
 *  decide which way round it runs). Deliberately minimal — this is not a density channel. */
export interface ChatMessageContextValue {
  sender: ChatMessageSender;
}

const ChatMessageContext = createContext<ChatMessageContextValue | null>(null);

/** Read the enclosing message, if there is one. Returns `null` outside a `ChatMessage`, so a part can
 *  be documented and used standalone — the `useOptionalFieldControl` idiom. */
export function useOptionalChatMessage(): ChatMessageContextValue | null {
  return useContext(ChatMessageContext);
}

/** The fallback accessible name, in words rather than in the prop's own vocabulary. */
const FALLBACK_LABEL: Record<ChatMessageSender, string> = {
  user: "Message from you",
  assistant: "Message from the assistant",
  system: "System message",
};

/** Filled carries authorship for the user; the assistant's answers stay unboxed. */
const DEFAULT_VARIANT: Record<ChatMessageSender, ChatMessageVariant> = {
  user: "filled",
  assistant: "ghost",
  system: "ghost",
};

export interface ChatMessageProps {
  /** Ref forwarded to the root `<article>`. */
  ref?: Ref<HTMLElement>;
  /** Who the message is from. Drives alignment, the default variant, and the fallback name. */
  sender: ChatMessageSender;
  /** The message body — text, or any composed content. */
  children: ReactNode;
  /** Avatar for the sender, beside the message. Renders for **`assistant` only** — the slot is ignored
   *  for `user` and for `system` ([[chat-avatar-size]]). The reader's own turn is identified by direction and the filled
   *  tint ([[chat-bubble]]), so an avatar on it pictures the one person who needs no introduction; a centred system
   *  notice has no author to picture at all.
   *
   *  **In a run, pass it on EVERY message** ([[chat-avatar-header-row]]). It is drawn once, on the message that opens the run,
   *  and the others hold its place in the gutter so the whole run's bodies stay on one left edge. */
  avatar?: ReactNode;
  /** The sender's name, rendered above the body. When present it becomes the message's accessible
   *  name (via `aria-labelledby`), so a reader hears who is talking. **In a run it is drawn once**, on
   *  the message that opens it ([[chat-avatar-header-row]]) — a string `name` still names the later messages to a screen
   *  reader, which reads them out of the run's context. */
  name?: ReactNode;
  /** The row below the body — a timestamp, a delivery status, a retry action. `ChatMessageMetadata`
   *  is what usually goes here. */
  metadata?: ReactNode;
  /** Bubble skin. Unset: `filled` for the user, `ghost` for everyone else. */
  variant?: ChatMessageVariant;
  /** Position in a run of consecutive messages from one sender. `first` opens the run — it draws the
   *  avatar and the name; `middle` and `last` draw neither and hold the avatar's place in the gutter
   *  instead ([[chat-avatar-header-row]]). All three tighten the sender-side corners so the run reads as one block. Leave it
   *  unset for a message standing on its own. */
  group?: ChatMessageGroup;
  /** Accessible name used when there is no `name` to point at. Defaults to a plain-English phrase
   *  ("Message from you"); set it for a named assistant, or for a localized build. */
  label?: string;
  className?: string;
  style?: CSSProperties;
  /** Escape hatch for passthrough attributes (data-*). */
  [key: `data-${string}`]: unknown;
}

export const ChatMessage = forwardRef<HTMLElement, ChatMessageProps>(function ChatMessage(
  { sender, children, avatar, name, metadata, variant, group, label, className, style, ...rest },
  ref,
) {
  // The body is text, so the whole message rides the TEXT lane ([[chat-density]]). Stamped once on the root: the
  // name, the body and the metadata slot are all one type step and must not drift apart.
  const size = useResolvedSize("text", undefined);
  const nameId = useId();

  // The avatar renders for the OTHER party only ([[chat-avatar-size]]). The reader's own turn is already identified
  // twice over — the row runs the other way and the bubble carries the filled tint ([[chat-bubble]]) — so a face
  // on it labels the one person who never needs labelling; the bubble-family systems surveyed all omit
  // it. A system notice has no author to picture at all. Metadata is NOT suppressed for either — a
  // slot that silently drops what a caller passed is an API that lies; this one is documented on the
  // prop and is the anatomy decision, not a dropped value.
  const wantsAvatar = avatar != null && sender === "assistant";

  // ONE FACE AND ONE NAME PER RUN ([[chat-avatar-header-row]]). A run is one person talking, so it gets one introduction:
  // the message that OPENS it draws the avatar and the name, and the rest of the run draws neither.
  // The gutter is still HELD on those — an empty box the avatar's own width — so every body in the
  // run keeps the same left edge; drop it and the run's second message slides 38px left of its first.
  const runTail = group === "middle" || group === "last";
  const hasAvatar = wantsAvatar && !runTail;
  const holdsGutter = wantsAvatar && runTail;
  const hasName = name != null && !runTail;

  // THE HEADER IS THE AVATAR'S ROW ([[chat-avatar-header-row]]). Two shapes, one rule — the avatar shares a vertical centre
  // with the message's first line:
  //   band — there is a name, so the name's row is grown to the avatar's own box and the name is
  //          centred in it. The avatar's bottom edge, the header's bottom edge and the body's top edge
  //          are then ONE line, instead of the avatar ending part-way down a line of the body.
  //   line — there is no name, so the body's own first line is the header, and it is nudged down to
  //          centre against the avatar.
  // Nothing to align to without an avatar, so the name keeps its natural row and nothing is nudged.
  const header = hasAvatar ? (hasName ? "band" : "line") : undefined;

  const resolvedVariant = variant ?? DEFAULT_VARIANT[sender];

  // A run's later messages have no visible name to point at, but a reader arriving at one out of
  // context still has to be told who is talking — so a STRING name becomes the accessible name.
  // `label` stays the explicit override, ahead of both.
  const fallbackLabel =
    label ?? (typeof name === "string" && name !== "" ? name : FALLBACK_LABEL[sender]);

  const context = useMemo<ChatMessageContextValue>(() => ({ sender }), [sender]);

  return (
    <ChatMessageContext.Provider value={context}>
      <article
        ref={ref}
        className={["rt-ds-chat-message", className].filter(Boolean).join(" ")}
        style={style}
        data-sender={sender}
        data-variant={resolvedVariant}
        data-size={size}
        data-header={header}
        aria-labelledby={hasName ? nameId : undefined}
        aria-label={hasName ? undefined : fallbackLabel}
        {...rest}
      >
        {hasAvatar && <div className="rt-ds-chat-message-avatar">{avatar}</div>}
        {holdsGutter && <div className="rt-ds-chat-message-gutter" />}

        <div className="rt-ds-chat-message-column">
          {hasName && (
            <div id={nameId} className="rt-ds-chat-message-name">
              {name}
            </div>
          )}

          {/* The stamped element is the BUBBLE, not the article: the scroll engine measures what the
              reader actually sees arrive, and an article stretches the full column width. */}
          <div
            className="rt-ds-chat-message-bubble"
            data-group={group}
            {...{ [CHAT_MESSAGE_ATTR]: "" }}
          >
            {children}
          </div>

          {metadata != null && <div className="rt-ds-chat-message-meta-slot">{metadata}</div>}
        </div>
      </article>
    </ChatMessageContext.Provider>
  );
});
