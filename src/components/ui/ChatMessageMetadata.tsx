// Copyright (c) Meta Platforms, Inc. and affiliates.
//
// Portions derived from facebook/astryx packages/core/src/Chat/ChatMessageMetadata.tsx @ d7c9a39b
// (MIT, © Meta Platforms) — the timestamp · footer · status row under a chat message, its conditional
// separators, its sender-driven direction, and the five-value delivery-status enum.

import { forwardRef, type CSSProperties, type ReactNode, type Ref } from "react";
import { Check, Checks, Clock, WarningCircle } from "@phosphor-icons/react";
import { useOptionalChatMessage, type ChatMessageSender } from "./ChatMessage";
import { useResolvedSize } from "../../theme/SizeContext";

/* =============================================================================
 * ChatMessageMetadata — the small print under a message: when it was sent, what
 * happened to it, and anything the product wants to hang beside those.
 * -----------------------------------------------------------------------------
 * Three slots — timestamp · footer · status — joined by a middle dot that only
 * appears BETWEEN two present slots, so there is never a leading or trailing
 * separator hanging off the end of the row. With nothing to show it renders
 * `null` rather than an empty row that still takes up its line box.
 *
 * DIVERGENCES FROM THE SHAPE THIS WAS DERIVED FROM (recorded in DECISIONS as [[delivery-status]]
 * and [[chat-density]]; the ledger, not the stories, is where provenance lives):
 *
 *   [[delivery-status]]    `delivered` and `read` SHARE A GLYPH — a double check — in the source
 *         as well as here; there is no second tick to spend. The source tells
 *         them apart with a `title` attribute, which is a tooltip on hover and
 *         nothing at all on touch. Ours ships the WORD, visibly, always: the
 *         label is the distinguisher and the glyph is the second signal, never
 *         the other way round and never colour alone.
 *   [[delivery-status]]    NO REDUNDANT `aria-label`. The source labels the status span
 *         "Message delivered" while the same span visibly reads "Delivered",
 *         so the accessible name and the visible text disagree and the tooltip
 *         says a third thing. Here the visible label IS the accessible name.
 *   [[delivery-status]]    `error` READS "Failed" in the error text role, at strong weight. The
 *         failed-send state is a real state that ships — but the RETRY is the
 *         consumer's to place, and the `footer` slot is where it goes. A
 *         component that owned the retry would have to own the send, too.
 *   [[chat-density]]    ONE SIZE STEP, NOT A SMALLER ONE. The row is secondary to the message
 *         above it, and it carries that by WEIGHT + COLOUR (`--ds-text-weak` at
 *         base weight) rather than by dropping a step: the text lane floors at
 *         12px, so a sub-floor step collapses into the same rendered size and
 *         buys nothing but a broken ladder.
 *
 * The `sending` pulse is an ambient loop — a slow opacity breathe, a deliberate
 * literal off the intent-named duration ladder (the StatusDot precedent) — and it
 * is silenced explicitly under `prefers-reduced-motion: reduce`, because the
 * central duration clamp only reaches values that came from the ladder. It runs
 * on the GLYPH ONLY: the loop's 0.5 trough over the whole row dimmed the word
 * "Sending" to 2.12:1, and the StatusDot precedent is a pulsing dot beside static
 * text, never pulsing text. The label holds full opacity.
 * ============================================================================= */

/** What happened to the message after it was sent. */
export type ChatMessageStatus = "sending" | "sent" | "delivered" | "read" | "error";

/** The glyph and — always — the word. `delivered` and `read` share the double check on purpose: the
 *  label is what tells them apart, so neither state depends on a glyph the reader has to decode. */
const STATUS_CONFIG: Record<ChatMessageStatus, { label: string; Glyph: typeof Check }> = {
  sending: { label: "Sending", Glyph: Clock },
  sent: { label: "Sent", Glyph: Check },
  delivered: { label: "Delivered", Glyph: Checks },
  read: { label: "Read", Glyph: Checks },
  error: { label: "Failed", Glyph: WarningCircle },
};

export interface ChatMessageMetadataProps {
  /** Ref forwarded to the root element. */
  ref?: Ref<HTMLDivElement>;
  /** When the message was sent. `Timestamp` belongs here — it renders a real `<time>`, so the moment
   *  is machine-readable, and it can format relatively and keep itself current. A plain string works
   *  too: this SLOT declares tabular figures (components.css), so a column of times lines up either
   *  way — figures are not what separates the two. */
  timestamp?: ReactNode;
  /** Anything else the product hangs off the row: the model that answered, a reaction, a rating —
   *  and the **Retry** action beside a failed send. */
  footer?: ReactNode;
  /** Delivery state. Each one ships a glyph AND its word; `error` reads "Failed" in the error role. */
  status?: ChatMessageStatus;
  /** Which way the row runs. Unset, it follows the enclosing message — the user's own metadata runs
   *  right-to-left, under the right-aligned bubble. Set it when using the row standalone. */
  sender?: ChatMessageSender;
  className?: string;
  style?: CSSProperties;
  /** Escape hatch for passthrough attributes (data-*). */
  [key: `data-${string}`]: unknown;
}

export const ChatMessageMetadata = forwardRef<HTMLDivElement, ChatMessageMetadataProps>(
  function ChatMessageMetadata(
    { timestamp, footer, status, sender, className, style, ...rest },
    ref,
  ) {
    // Same lane as the message body it sits under ([[chat-density]]) — one step for the whole message, ambient
    // only (no per-instance size prop, like the rest of the chat family).
    const size = useResolvedSize("text", undefined);
    // For the SENDER, explicit wins over the message context — context is the convenience, not the contract.
    const message = useOptionalChatMessage();
    const resolvedSender = sender ?? message?.sender ?? "assistant";

    const config = status != null ? STATUS_CONFIG[status] : null;

    // Build the present slots first, then join them — that is what makes the separators conditional
    // rather than a pile of pairwise `&&` tests, and it is what makes "nothing at all" detectable.
    const slots: ReactNode[] = [];
    if (timestamp != null) {
      slots.push(
        <span key="timestamp" className="rt-ds-chat-meta-timestamp">
          {timestamp}
        </span>,
      );
    }
    if (footer != null) {
      slots.push(
        <span key="footer" className="rt-ds-chat-meta-footer">
          {footer}
        </span>,
      );
    }
    if (config != null) {
      const { label, Glyph } = config;
      slots.push(
        <span key="status" className="rt-ds-chat-meta-status" data-status={status}>
          <Glyph className="rt-ds-chat-meta-glyph" weight="bold" aria-hidden />
          <span className="rt-ds-chat-meta-label">{label}</span>
        </span>,
      );
    }

    // Nothing to say — say nothing. An empty row still occupies a line box and still spaces the
    // message above it away from the one below.
    if (slots.length === 0) return null;

    // Separators are SIBLINGS of the slots, not wrappers around them: `row-reverse` then mirrors the
    // whole sequence for free, and a dot can never end up leading or trailing the row.
    const row: ReactNode[] = [];
    for (const [i, slot] of slots.entries()) {
      if (i > 0) {
        // The dot is decoration between two facts, so it is hidden from the accessibility tree — a
        // screen reader reading "2:30 PM middle dot Read" is worse than a pause.
        //
        // The glyph itself is GENERATED (`.rt-ds-chat-meta-sep::before` in the stylesheet), not written
        // here. As a text node it is prose to a contrast checker, which then cannot resolve it and marks
        // every metadata row unverifiable; as generated content it is unambiguously decoration and the
        // rule stops applying. Same pixels, same aria-hidden, no open question. See the stylesheet.
        row.push(<span key={`separator-${i}`} className="rt-ds-chat-meta-sep" aria-hidden />);
      }
      row.push(slot);
    }

    return (
      <div
        ref={ref}
        className={["rt-ds-chat-meta", className].filter(Boolean).join(" ")}
        style={style}
        data-sender={resolvedSender}
        data-size={size}
        {...rest}
      >
        {row}
      </div>
    );
  },
);
