// Copyright (c) Meta Platforms, Inc. and affiliates.
//
// Portions derived from facebook/astryx packages/core/src/Chat/ChatSystemMessage.tsx @ d7c9a39b
// (MIT, © Meta Platforms) — the centred notice line in a conversation, its optional leading icon,
// and the divider variant that runs a rule out to each side of a label.

import { forwardRef, type CSSProperties, type ReactNode, type Ref } from "react";
import { Separator } from "./Separator";
import { useOptionalChatList } from "./ChatMessageList";
import { useResolvedSize } from "../../theme/SizeContext";

/* =============================================================================
 * ChatSystemMessage — a line the CONVERSATION says about itself: "Theme
 * updated", "Dana joined", "Today". Not a turn, not a sender, not a bubble.
 * -----------------------------------------------------------------------------
 * IT IS DELIBERATELY NOT A CALLOUT. A Callout is a standing message box with a
 * surface, a tint and a severity, and it earns that weight by being about
 * something the reader has to deal with. A system line is a footnote in the
 * transcript — centred, quiet, and made of nothing but type. Giving it a surface
 * would make every "Today" separator look like a warning, and would put a second
 * competing box in a column that already has bubbles in it.
 *
 * DIVERGENCES FROM THE SHAPE THIS WAS DERIVED FROM (recorded in DECISIONS as [[chat-system-line]]
 * and [[chat-density]]; the ledger, not the stories, is where provenance lives):
 *
 *   [[chat-system-line]]  THE TEXT WRAPS. The source sets `white-space: nowrap` on the content,
 *         which truncates — silently, mid-sentence — exactly the long notices its
 *         own documentation recommends writing ("conversation started", "user
 *         joined", "status changed"). A notice that cannot be read in full is
 *         not a notice. Here it wraps, centred, at any width.
 *   [[chat-system-line]]    THE LIVE-REGION ROLE IS CONTEXT-DEPENDENT. The source stamps
 *         `role="status"` unconditionally — including inside the message log,
 *         which is a `role="log"` region that is ALREADY announcing everything
 *         appended to it. Nesting a second live region there makes a screen
 *         reader read the same line twice. So: inside a `ChatMessageList` this
 *         renders NO role and lets the log do its job; standing on its own it
 *         takes `role="status"` and announces itself. The optional-context
 *         idiom is `useOptionalFieldControl`'s.
 *   [[chat-density]]    SECONDARY BY WEIGHT AND COLOUR, NEVER BY A SMALLER STEP. The line is
 *         quieter than the messages around it and carries that with
 *         `--ds-text-weak` at base weight, at the SAME step as the message body:
 *         the text lane floors at 12px, so a sub-floor step renders identically
 *         and buys nothing but a broken ladder (the Item pattern).
 *
 * The `divider` variant composes the system `Separator` — one rule out to each
 * side of the label — rather than drawing its own hairline, so a date separator
 * and every other rule in the product are the same line.
 *
 * NO `as`, REFUSED ON MEASUREMENT ([[api-seam-criterion]], 2026-09-22). The candidate need was a
 * transcript marked up as `ul > li`, with this line as one of the items. The
 * root tag cannot move: standing outside a `ChatMessageList` this element takes
 * `role="status"` (above), and a `li` carrying that role is not a list item at
 * all. Measured on the rendered markup: axe reports `list` (serious, the `ul`
 * has a child that is not an `li`) and `aria-allowed-role` (minor), and the
 * accessibility tree reads `list "Transcript" > status, listitem, listitem`.
 * There is no supported way to drop the role from the call site either, because
 * `role` is not in the props. A consumer's own `li` around this notice draws
 * zero violations and paints identically, so that is the answer.
 * ============================================================================= */

/** `default` is a plain centred line; `divider` runs a rule out to each side of it. */
export type ChatSystemMessageVariant = "default" | "divider";

export interface ChatSystemMessageProps {
  /** Ref forwarded to the root element. */
  ref?: Ref<HTMLDivElement>;
  /** What the conversation is saying about itself. Text, or anything composed. */
  children: ReactNode;
  /** `default` — a centred line. `divider` — the same line with a rule running out to each side,
   *  for a date break or the start of a session. */
  variant?: ChatSystemMessageVariant;
  /** An optional glyph before the text. Decorative: the words carry the meaning, so it is hidden
   *  from assistive technology. */
  icon?: ReactNode;
  className?: string;
  style?: CSSProperties;
  /** Escape hatch for passthrough attributes (data-*). */
  [key: `data-${string}`]: unknown;
}

export const ChatSystemMessage = forwardRef<HTMLDivElement, ChatSystemMessageProps>(
  function ChatSystemMessage(
    { children, variant = "default", icon, className, style, ...rest },
    ref,
  ) {
    // Same lane as the message bodies it sits between ([[chat-density]]) — one type step down the whole transcript.
    const size = useResolvedSize("text", undefined);

    /* [[chat-system-line]] — the live region is the ENCLOSING LOG's when there is one. `role="log"` already carries an
       implicit `aria-live="polite"`, so a nested `role="status"` here would announce the same line a
       second time. Outside a log there is nothing announcing, so the notice announces itself. */
    const list = useOptionalChatList();
    const role = list ? undefined : "status";

    const isDivider = variant === "divider";
    const rule = isDivider ? <Separator className="rt-ds-chat-system-rule" /> : null;

    return (
      <div
        ref={ref}
        className={["rt-ds-chat-system", className].filter(Boolean).join(" ")}
        style={style}
        data-variant={variant}
        data-size={size}
        role={role}
        {...rest}
      >
        {rule}
        <span className="rt-ds-chat-system-content">
          {icon != null && (
            <span className="rt-ds-chat-system-icon" aria-hidden>
              {icon}
            </span>
          )}
          {children}
        </span>
        {rule}
      </div>
    );
  },
);
