// Copyright (c) Meta Platforms, Inc. and affiliates.
// Portions derived from facebook/astryx packages/core/src/Chat/ChatLayout.tsx @ d7c9a39b (MIT, © Meta Platforms)
// Portions derived from facebook/astryx packages/core/src/Chat/ChatLayoutScrollButton.tsx @ d7c9a39b (MIT, © Meta Platforms)
//
// The shell that pairs a scroll-anchored transcript with a docked composer, the scroll-to-latest control's
// two states, and the wiring between the two scroll engines. The dock's paint, the control's
// anatomy and the imperative handle are ours.

import {
  Children, forwardRef, useCallback, useImperativeHandle, useRef,
  type CSSProperties, type ReactNode, type Ref,
} from "react";
import { ArrowDown } from "@phosphor-icons/react";
import { Button } from "./Button";
import { IconButton } from "./IconButton";
import { ChatMessageList } from "./ChatMessageList";
import { useChatNewMessages } from "../../hooks/useChatNewMessages";
import { useChatStreamScroll } from "../../hooks/useChatStreamScroll";
import { useResolvedSize } from "../../theme/SizeContext";

/* =============================================================================
 * ChatLayout — the whole conversation as one thing: a transcript that follows
 * itself, a composer docked under it, and one control for getting back to the
 * bottom.
 * -----------------------------------------------------------------------------
 * This is the assembling component. It owns the log (a `ChatMessageList`), the
 * dock, the scroll-to-latest control and BOTH scroll engines; a caller puts
 * messages in it and a composer under it, and nothing else has to be wired.
 *
 * ONE SCROLLER, AND IT IS THE LOG. The log region is the node that scrolls (see
 * `ChatMessageList`), so the engines attach to the ref it forwards — its
 * viewport. Everything follows from that: the dock is a SIBLING of the log
 * rather than a sticky child of it, because the scroller is inside the log and a
 * dock inside the scroller would be inside the live region — every keystroke in
 * the composer would then be announced as conversation. The dock holds the
 * bottom edge of the layout, the transcript scrolls beneath it, and the fade
 * over the log's bottom edge is what dissolves the outgoing message into the
 * page instead of guillotining it.
 *
 * DIVERGENCES FROM THE SHAPE THIS WAS DERIVED FROM (recorded in DECISIONS as
 * [[chat-layout-assembly]] and [[scroll-position-animation]]; the ledger, not the stories, is where provenance
 * lives):
 *
 *   [[chat-layout-assembly]]   NO `backdrop-filter`. The shape this was derived from frosts a 100px
 *         band across the full width of the viewport. Blur in this system is
 *         bounded to small floating surfaces, and a persistent full-width dock is
 *         exactly what that bound excludes — so the dock is opaque and the band
 *         above it is a plain gradient.
 *   [[chat-layout-assembly]]   THE FADE INHERITS ITS CONTAINER. It paints
 *         `--ds-chat-layout-bg`, which defaults to the page role. A chat inside a
 *         Card or a raised panel sets that one property and the fade follows,
 *         rather than painting a page-coloured stripe across a surface that is
 *         not the page. It is a consumer knob, not a design token — the same
 *         shape as `--ds-item-pad-block`.
 *   [[chat-layout-assembly]]    THE ENGINES ARE DRIVEN, NOT RE-IMPLEMENTED. `useChatStreamScroll`
 *         keeps the transcript pinned and reports whether the reader has moved
 *         away; `useChatNewMessages` watches the content element and tells the
 *         first engine when to follow. The content element this component wraps
 *         its children in is the ONE element that hook observes — the shared
 *         resize observer holds a single callback per element, so nothing else
 *         may point at it.
 *   [[chat-layout-assembly]]   THE HANDLE IS REAL, AND HONEST. `scrollToBottom()` works, and it works
 *         even when the reader had scrolled away: the consumer asked for the
 *         bottom, and a control that silently declines is a control that lies.
 *         There is no `scrollToMessage` on the type — the shape this was derived
 *         from declares one and implements nothing, and a method that exists only
 *         in TypeScript is a promise the runtime cannot keep.
 *   [[scroll-position-animation]]   THE SPRING IS NOT CSS MOTION. A rAF integrator driving `scrollTop`
 *         paints nothing, so the system's rule against spring timing does not
 *         reach it. Reduced motion replaces it with a jump, and no token is
 *         minted for its constants.
 *
 * [[chat-density]] — the layout and its log ride the CONTAINER lane; the composer inside the
 * dock rides the control lane on its own.
 *
 * [[api-seam-criterion]]. THE ROOT TAG IS A VALVE, AND IT IS A TAG RATHER THAN AN ELEMENT
 * HANDOVER. `asChild` is refused here: `children` IS the transcript, so a slot
 * seam would need the transcript moved to a named prop, and an existing
 * `<ChatLayout>{messages}</ChatLayout>` would then render an empty conversation
 * with no crash and no type error. `as` was earned on a measured need instead.
 * A wrapping `<main>` is the answer without it, and it costs a SECOND height
 * contract. Measured in a 420px column: `<main><ChatLayout style height 100%>`
 * leaves the log at 348px against a 348px scrollHeight, so it never scrolls,
 * and it hangs the dock 18px below the box with nothing reported. `as="main"`
 * is the same one element and the same one contract the default already has.
 * ============================================================================= */

/** What a caller can do to a mounted layout from the outside. Deliberately one method: the two
 *  things a chat shell is asked for from outside are "take me to the bottom" and "put me back on
 *  live" — and here they are the same action. */
export interface ChatLayoutHandle {
  /**
   * Scroll the transcript to the newest message and re-take the follow lock.
   *
   * It scrolls **even when the reader had scrolled up**. That is the whole point of an explicit
   * call: the consumer invoked it deliberately (a "jump to latest" menu item, a new turn the
   * product wants read), and a no-op would leave them looking at a control that did nothing.
   */
  scrollToBottom: () => void;
}

export interface ChatLayoutProps {
  /** Imperative handle — see `ChatLayoutHandle`. This is NOT a DOM ref. */
  ref?: Ref<ChatLayoutHandle>;
  /**
   * The root element. A CLOSED union, the `Item` shape ([[api-seam-criterion]]): these are the three tags whose CSS
   * this component survives, and anything else is a compile error rather than a broken layout.
   *
   * `div` is the default and is right whenever something above this already owns the page
   * structure. `main` is for a dedicated chat page with no `AppShell` over it, where the shell IS
   * the page's one landmark and the skip link needs that target. `section` is a named region for a
   * chat that is one part of a larger page, and it needs an `aria-label` of its own: an unnamed
   * `section` is exposed as a plain group and buys nothing over the default.
   *
   * Swapping the tag is all this does. The class, the data attributes and every prop below are
   * unchanged, so the paint and the behaviour ride along.
   *
   * **One landmark per page.** `as="main"` inside an `AppShell` is a SECOND `main`, and axe reports
   * three violations for it (`landmark-no-duplicate-main`, `landmark-main-is-top-level`,
   * `landmark-unique`). `AppShell` already guarantees the landmark, so leave this at `div` there.
   * @default 'div'
   */
  as?: "div" | "main" | "section";
  /** **Required.** What this conversation is, in words. It names the log region, which is the first
   *  thing a keyboard user lands on. */
  label: string;
  /** The transcript, oldest first — `ChatMessage`, `ChatSystemMessage`, `ChatToolCalls`. */
  children?: ReactNode;
  /** The composer, docked at the bottom. `ChatComposer` is what belongs here. */
  composer: ReactNode;
  /** What to show while the conversation is empty. `EmptyState` belongs here. */
  emptyState?: ReactNode;
  /** Whether an answer is arriving right now. Marks the log busy so assistive technology reads the
   *  finished message once rather than re-reading each partial. */
  isStreaming?: boolean;
  /** A line about the CONVERSATION's own condition — reconnecting, queued, this model is retiring.
   *  It sits above the dock, outside its border, because it is not about the draft in the box.
   *
   *  Three different things can go wrong around a composer, and they belong in three places:
   *  something wrong with the SESSION goes here; something wrong with a SENT MESSAGE goes on that
   *  message, where `ChatMessageMetadata` has a failed state and a slot for its retry; something
   *  wrong with WHAT IS IN THE BOX RIGHT NOW is the composer's own `status`, under the dock, where
   *  every field in the system puts its message. Each sentence sits next to the thing it is about. */
  sessionStatus?: ReactNode;
  /** Accessible name for the scroll control in its resting state. */
  scrollToLatestLabel?: string;
  /** Visible label the control takes once messages have arrived out of view. */
  newMessagesLabel?: string;
  /** Merged onto the root — this is the element to give a height to. */
  className?: string;
  /** Inline styles on the root. The layout needs a bounded height, or there is nothing to scroll. */
  style?: CSSProperties;
  /** Escape hatch for passthrough attributes (data-*). */
  [key: `data-${string}`]: unknown;
}

/** The two states of the scroll control, and everything either of them needs. */
export interface ChatLayoutScrollButtonProps {
  /** Whether there is anywhere to scroll to. `false` renders nothing at all. */
  isVisible: boolean;
  /** Whether messages arrived while the reader was away — the labelled state. */
  hasNewMessages: boolean;
  /** Accessible name for the resting icon control. */
  idleLabel: string;
  /** Visible label for the new-messages state. */
  newMessagesLabel: string;
  /** Take the reader to the newest message. */
  onClick: () => void;
}

/**
 * The scroll-to-latest control: two states, ONE of them in the DOM at a time.
 *
 * A PART OF `ChatLayout`, not a component in its own right: the layout renders it, it ships no story
 * and no registry entry, and it has no meaning outside one. It is exported for exactly one reason —
 * so the layout's own documentation can show and measure THE REAL CONTROL. A docs page cannot reach
 * this control through the layout, because it only appears once a reader has scrolled away, and a
 * page that scrolled itself to reveal it would animate on view. The alternative is a look-alike in
 * the story file, which documents the story rather than the component.
 *
 * TWO ELEMENTS, NOT ONE THAT MORPHS. The resting state is a round icon control; once messages have
 * arrived out of view it becomes a labelled pill, because "there is something new down there" is a
 * different message from "you are not at the bottom" and a bare arrow cannot carry it. The shape
 * this was derived from animates ONE button's `max-width` between the two, which animates layout on
 * every swap and leaves a clipped label mid-flight. Here each state is its own element and only one
 * is ever mounted — so there is exactly one tab stop, and the swap cannot produce a half-rendered
 * word. The incoming element fades and scales in (see the stylesheet); nothing animates its box.
 */
export function ChatLayoutScrollButton({
  isVisible, hasNewMessages, idleLabel, newMessagesLabel, onClick,
}: ChatLayoutScrollButtonProps) {
  // Out of the DOM entirely when there is nowhere to go. A control kept mounted at `opacity: 0` is
  // still a tab stop and still announced, which is a keyboard user pressing a button that does
  // nothing they can see.
  if (!isVisible) return null;

  return (
    <div className="rt-ds-chat-layout-scroll">
      {hasNewMessages ? (
        <Button
          type="button"
          size="2"
          priority="secondary"
          radius="full"
          className="rt-ds-chat-layout-scroll-control"
          data-mode="new-messages"
          onClick={onClick}
        >
          <ArrowDown weight="bold" aria-hidden />
          {newMessagesLabel}
        </Button>
      ) : (
        <IconButton
          type="button"
          size="2"
          priority="secondary"
          radius="full"
          className="rt-ds-chat-layout-scroll-control"
          data-mode="idle"
          aria-label={idleLabel}
          onClick={onClick}
        >
          <ArrowDown weight="bold" aria-hidden />
        </IconButton>
      )}
    </div>
  );
}

export const ChatLayout = forwardRef<ChatLayoutHandle, ChatLayoutProps>(function ChatLayout(
  {
    as: Root = "div", label, children, composer, emptyState, isStreaming = false, sessionStatus,
    scrollToLatestLabel = "Scroll to latest", newMessagesLabel = "New messages",
    className, style, ...rest
  },
  ref,
) {
  // The layout is a SURFACE, so its rhythm rides the container lane ([[chat-density]]) — the same scale the log
  // inside it takes, so the dock's inset and the space between turns cannot drift apart.
  const size = useResolvedSize("container", undefined);

  // The scrolling node, handed over by the log: `ChatMessageList` forwards its ref to the VIEWPORT,
  // which is the element that actually scrolls and the element that carries `role="log"`.
  const viewportRef = useRef<HTMLDivElement>(null);

  const scroll = useChatStreamScroll({ scrollRef: viewportRef });
  const newMessages = useChatNewMessages({
    isLocked: scroll.isLocked,
    onResize: scroll.scrollIfLocked,
  });

  // One action behind both the control and the handle, so the two can never diverge: clear the
  // "new messages" flag (the reader is about to see them) and take the bottom.
  const { dismiss } = newMessages;
  const { scrollToBottom } = scroll;
  const goToLatest = useCallback(() => {
    /* Taking the bottom UNMOUNTS the control that asked for it — it only exists while the reader is
     * away from the bottom. So a keyboard reader who activates it would be left with focus on a node
     * that no longer exists, which the browser resolves to `<body>`: their next Tab restarts at the
     * top of the document and they have lost the transcript entirely. Re-home focus to the log,
     * which is a tab stop and is what they are now looking at. Only when the press CAME from the
     * control — a consumer calling the handle from elsewhere must not have its focus stolen. */
    const active = viewportRef.current?.ownerDocument.activeElement;
    const cameFromControl =
      active instanceof Element && active.closest(".rt-ds-chat-layout-scroll-control") != null;
    dismiss();
    scrollToBottom();
    if (cameFromControl) viewportRef.current?.focus();
  }, [dismiss, scrollToBottom]);

  useImperativeHandle(ref, () => ({ scrollToBottom: goToLatest }), [goToLatest]);

  // `Children.toArray` drops null / undefined / booleans and flattens arrays, so `{items.map(…)}`
  // over an empty array reads as EMPTY rather than as one child. That matters twice here: the log's
  // empty-state slot only shows when it has no children, and the content wrapper below would
  // otherwise be that one child and suppress the slot forever.
  const hasChildren = Children.toArray(children).length > 0;

  return (
    <Root
      className={["rt-ds-chat-layout", className].filter(Boolean).join(" ")}
      style={style}
      data-size={size}
      {...rest}
    >
      <ChatMessageList
        ref={viewportRef}
        className="rt-ds-chat-layout-log"
        label={label}
        emptyState={emptyState}
        isStreaming={isStreaming}
      >
        {hasChildren ? (
          /* THE OBSERVED ELEMENT. This wrapper exists so the new-message detector has a stable
             element of its own to watch — it is the box whose height changes when a message
             arrives or a streaming answer grows. It also carries the clearance that keeps the
             newest message clear of the fade band, and (because it is the log rail's only child,
             which makes the rail's own gap inert) the space between turns. */
          <div
            className="rt-ds-chat-layout-content"
            data-size={size}
            ref={newMessages.contentRef}
          >
            {children}
          </div>
        ) : null}
      </ChatMessageList>

      {sessionStatus != null && (
        /* ABOVE the dock and outside its border, on purpose. This line is about the conversation,
           not about the draft — putting it inside the dock would say it was about what the reader
           is typing, and putting it in the transcript would say it was something that happened in
           the conversation. It sits between the two because that is what it is. */
        <div className="rt-ds-chat-layout-session" data-size={size}>
          {sessionStatus}
        </div>
      )}

      {/* The dock: the bottom edge of the layout. It paints the container's own background so the
          fade above it has something to fade INTO, and it is the positioning context for both the
          fade and the floating control. */}
      <div className="rt-ds-chat-layout-dock">
        {/* The fade band's host, and nothing else. It is zero-height and carries no content — the
            gradient is painted by its `::before`, which reaches up over the log (see the stylesheet).
            It exists so the gradient is not attached to an ANCESTOR of the composer: a pseudo element
            that big on an ancestor makes every piece of text below it unmeasurable to a contrast
            checker, and a plain div would obscure the transcript in the hit-test grid instead. A leaf
            with no box is neither. */}
        <div className="rt-ds-chat-layout-fade" aria-hidden="true" />
        <ChatLayoutScrollButton
          isVisible={scroll.isScrolledUp || newMessages.hasNewMessages}
          hasNewMessages={newMessages.hasNewMessages}
          idleLabel={scrollToLatestLabel}
          newMessagesLabel={newMessagesLabel}
          onClick={goToLatest}
        />
        {composer}
      </div>
    </Root>
  );
});
