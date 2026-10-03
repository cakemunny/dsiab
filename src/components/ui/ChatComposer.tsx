// Copyright (c) Meta Platforms, Inc. and affiliates.
// Portions derived from facebook/astryx packages/core/src/Chat/ChatComposer.tsx @ d7c9a39b (MIT, © Meta Platforms)
// Portions derived from facebook/astryx packages/core/src/Chat/ChatComposerInput.tsx @ d7c9a39b (MIT, © Meta Platforms)
// Portions derived from facebook/astryx packages/core/src/Chat/ChatSendButton.tsx @ d7c9a39b (MIT, © Meta Platforms)
//
// The dock's slot layout, the submit / stop semantics, the
// click-empty-space-to-focus rule and the send button's two states. The input itself is ours ([[chat-composer]]).

import {
  forwardRef, useCallback, useEffect, useId, useLayoutEffect, useRef, useState,
  type CSSProperties, type KeyboardEvent, type MouseEvent, type ReactNode, type Ref,
} from "react";
import { ArrowUp, Stop } from "@phosphor-icons/react";
import { IconButton } from "./IconButton";
import { StatusLine } from "./Field";
import { TextArea } from "./TextArea";
import { CONTROL_STEP_TO_UISIZE, SizeContext, useResolvedSize } from "../../theme/SizeContext";
import { observeResize, unobserveResize } from "../../utils/sharedResizeObserver";

/* =============================================================================
 * ChatComposer — where the reader writes, and the one control that sends it.
 * -----------------------------------------------------------------------------
 * ONE BORDERED DOCK holding the input and its actions, a real multiline text
 * control inside it, and a send button that becomes a stop button while a
 * response is being generated.
 *
 * [[chat-composer]] — THE INPUT IS A REAL `<textarea>`, ON OUR OWN FIELD SHELL. The shape this
 * was derived from uses a `contentEditable` div carrying `aria-multiline` and
 * `aria-label`, and fakes its placeholder with an `aria-hidden` div positioned
 * over the text. Both were read out of the source. Ours is `TextArea`, which is
 * a deliberate upgrade rather than a like-for-like lift:
 *
 *   · real textbox semantics — a browser-native multiline control, so selection,
 *     undo, spellcheck, autofill, dictation and every assistive technology's
 *     text-editing mode work because they are the platform's, not ours;
 *   · a NATIVE placeholder, which disappears on the platform's own rules instead
 *     of on a `value === ""` check, and is never read out as stray text;
 *   · the shared field ring and the shared field shell, so the composer cannot
 *     drift away from every other input in the system.
 *
 * The cost is the named deferral it creates: inline entity chips cannot render
 * inside a textarea. That is a decision to REBUILD the input if a consumer ever
 * needs them, not a gap in this one.
 *
 * AUTOGROW is driven through the ref `TextArea` forwards to the inner textarea —
 * that ref is the ONLY handle on the real node, because the wrap routes
 * `className` and `style` to the root `<div>` that paints the field's border.
 * The box grows with the text and stops at eight lines, after which the textarea
 * scrolls; the cap is computed from the element's OWN measured line-height, so it
 * follows the size lane, the brand's type scale and a late-loading webfont rather
 * than a hardcoded pixel maximum. See `resizeToContent`.
 *
 * THE FOCUS RING HOISTS TO THE DOCK (a named visual decision). The dock is one
 * bordered surface holding the input and its actions; a ring drawn around the
 * input alone would put a second edge inside the first and read as two nested
 * controls. So the inner field is de-skinned — no border, no fill, no ring of its
 * own — and the DOCK takes the system's accent focus ring ([[focus-ring]]) whenever the
 * textarea inside it has focus. The rule is a `:has()` selector in the stylesheet
 * rather than a `data-focus` attribute maintained in JavaScript: focus state that
 * a component has to track is focus state a component can get wrong.
 *
 * [[chat-density]] — the composer and its send / stop controls ride the CONTROL lane.
 *
 * [[container-size-seeding]] — AND IT SEEDS THAT STEP TO ITS SLOT. `actions` is the consumer's content, so it resolves the
 * ambient tier on its own — which is not this composer's whenever `size` is set, and the two land in
 * the same row at different sizes. The composer publishes its resolved step back as a tier, the way
 * `Toolbar` does, so unsized slot content comes out at the size of the send control beside it.
 * ============================================================================= */

/** Where the composer stops growing. Eight lines is long enough to see a paragraph whole and short
 *  enough that the transcript above it is still the larger half of the screen. */
const MAX_ROWS = 8;

/** What the composer can say about itself, on the dock's last row. */
export type ChatComposerStatusTone = "error" | "warning";

export interface ChatComposerStatus {
  /** `error` is announced assertively; `warning` politely. */
  tone: ChatComposerStatusTone;
  /** What happened, in a sentence. */
  message: ReactNode;
}

export interface ChatComposerProps {
  /** Ref forwarded to the root element. */
  ref?: Ref<HTMLDivElement>;
  /** Fired with the TRIMMED message when the reader sends it. Never fired with an empty string. */
  onSubmit: (value: string) => void;
  /** Controlled value. Pair it with `onChange`; leave both unset to let the composer hold its own. */
  value?: string;
  /** Fired with the new value on every keystroke, and with `""` when a message is sent. */
  onChange?: (value: string) => void;
  /** Starting value when uncontrolled. */
  defaultValue?: string;
  /** Placeholder in the empty input. */
  placeholder?: string;
  /** The input's accessible name. It has no visible label, so this is the only name it gets. */
  label?: string;
  /** Turns the input and the send control off. The stop control stays live — see the note below. */
  disabled?: boolean;
  /** Show the stop control instead of send, while a response is being generated. */
  isStopShown?: boolean;
  /** Fired when the stop control is pressed. */
  onStop?: () => void;
  /** Accessible name for the send control. */
  sendLabel?: string;
  /** Accessible name for the stop control. */
  stopLabel?: string;
  /** A warning or an error about this composer, rendered as the dock's last row. */
  status?: ChatComposerStatus;
  /** Controls to the left of the send button — an attach button, a model picker. Leave them UNSIZED:
   *  the composer seeds its own step to this slot ([[container-size-seeding]]), so they come out at the size of the send
   *  control beside them. An explicit `size` on one of them still wins. */
  actions?: ReactNode;
  /** Control-lane size step, as every other typed entry takes one. Unset it follows the global size;
   *  `"inherit"` opts out entirely. It scales the field the same way it scales a text field — which
   *  includes the support line beneath: the shared shell gives a size-3 field a 14px message and a
   *  smaller field a 12px one, so a composer sized like a field reads like one. */
  size?: "1" | "2" | "3" | "inherit";
  className?: string;
  style?: CSSProperties;
  /** Escape hatch for passthrough attributes (data-*). */
  [key: `data-${string}`]: unknown;
}

/** Anything a click can land on that already does something. A click there must NOT be stolen and
 *  turned into "focus the input" — that would swallow the press the reader actually made. */
const INTERACTIVE =
  'button, a, input, select, textarea, [role="button"], [role="link"], [contenteditable="true"], [tabindex]:not([tabindex="-1"])';

/**
 * Grow the textarea to fit its content, up to `MAX_ROWS` lines, then let it scroll.
 *
 * The cap is MEASURED, never assumed: the line-height is read off the element, so the eight lines
 * are eight of the lines this instance actually renders — at its size step, in its brand's type
 * scale, in whatever font finally loaded. Reading it once at module scope, or writing the pixel
 * height the default theme happens to produce, is how an autogrowing box ends up capped at six
 * lines on one page and eleven on another.
 *
 * `height: auto` first, because `scrollHeight` can never report LESS than the height already set —
 * without the collapse the box grows and never shrinks again. Everything is then computed before
 * anything else is written, so the browser lays out once rather than once per property.
 */
function resizeToContent(el: HTMLTextAreaElement): void {
  const cs = getComputedStyle(el);
  const lineHeight = Number.parseFloat(cs.lineHeight);
  // `normal` parses to NaN. There is no measurement to be had, so leave the box exactly as it is
  // rather than writing a height derived from a number that is not one.
  if (!Number.isFinite(lineHeight) || lineHeight <= 0) return;

  const padding = Number.parseFloat(cs.paddingBlockStart) + Number.parseFloat(cs.paddingBlockEnd);
  const borders = Number.parseFloat(cs.borderBlockStartWidth) + Number.parseFloat(cs.borderBlockEndWidth);
  // `scrollHeight` counts the content and its padding but not its borders, and `height` means the
  // border box under `border-box` and the content box under `content-box`. The shipped case is
  // border-box (the field's reset declares it); the other branch is here because a content-box
  // textarea would silently cap at eight lines PLUS the padding, which reads as a bug in the number.
  const borderBox = cs.boxSizing === "border-box";
  const cap = MAX_ROWS * lineHeight + (borderBox ? padding + borders : 0);

  el.style.height = "auto";
  const natural = borderBox ? el.scrollHeight + borders : el.scrollHeight - padding;
  const capped = natural > cap;

  el.style.height = `${capped ? cap : natural}px`;
  // Past the cap the box stops growing, so the overflow has to become reachable.
  el.style.overflowY = capped ? "auto" : "hidden";
}

/** The send / stop control: two states, two accessible names, one place in the tab order.
 *
 *  Ships no story and no registry entry of its own — it is a part of the composer, documented in
 *  the composer's own page, and it has no meaning outside one. */
function ChatSendButton({
  isStopShown, canSend, disabled, onSend, onStop, sendLabel, stopLabel, size,
}: {
  isStopShown: boolean;
  canSend: boolean;
  disabled: boolean;
  onSend: () => void;
  onStop?: () => void;
  sendLabel: string;
  stopLabel: string;
  size?: "1" | "2" | "3";
}) {
  // STOP IS NOT DISABLED BY `disabled`. While a response is generating, stopping it is the only
  // thing left to do; a stop control that cannot stop strands the reader in front of output they
  // asked to end. Send is a different case — with nothing to send, pressing it would do nothing,
  // and a control that does nothing should say so.
  if (isStopShown) {
    return (
      <IconButton
        type="button"
        priority="secondary"
        radius="full"
        size={size}
        className="rt-ds-chat-composer-send"
        data-mode="stop"
        aria-label={stopLabel}
        onClick={onStop}
      >
        <Stop weight="fill" aria-hidden />
      </IconButton>
    );
  }
  return (
    <IconButton
      type="button"
      priority="primary"
      radius="full"
      size={size}
      className="rt-ds-chat-composer-send"
      data-mode="send"
      aria-label={sendLabel}
      disabled={disabled || !canSend}
      onClick={onSend}
    >
      <ArrowUp weight="bold" aria-hidden />
    </IconButton>
  );
}

export const ChatComposer = forwardRef<HTMLDivElement, ChatComposerProps>(function ChatComposer(
  {
    onSubmit, value, onChange, defaultValue, placeholder = "Type a message…",
    label = "Message", disabled = false, isStopShown = false, onStop,
    sendLabel = "Send message", stopLabel = "Stop generating",
    status, actions, size: sizeProp, className, style, ...rest
  },
  ref,
) {
  // The composer IS a control, so it and the buttons inside it ride the CONTROL lane ([[chat-density]]).
  const size = useResolvedSize("control", sizeProp);
  const statusId = useId();

  // …AND IT SEEDS THAT STEP BACK INTO THE TREE ([[container-size-seeding]]). The composer's own children are handed `size`
  // directly, but `actions` is the CONSUMER's content: an unsized IconButton in that slot resolves
  // the ambient tier, which is not the composer's whenever `size` is set — measured as a 24px attach
  // button beside a 40px send, in the same row. Seeding the resolved step as a tier makes the slot
  // resolve the composer's size instead; a child with an explicit `size` still wins, because
  // `useResolvedSize` checks the explicit value before it ever reads the context.
  // `size="inherit"` resolves to undefined — nothing was decided here, so nothing is seeded.
  const seedTier = typeof size === "string" ? CONTROL_STEP_TO_UISIZE[size] : undefined;

  // The textarea node is held in STATE, not a plain ref: the autogrow effects have to re-run — and
  // the resize observer has to be torn down and re-registered — if the node is ever replaced. A
  // `useRef` cannot express that dependency, and the observer's teardown is silently dropped.
  const [textarea, setTextarea] = useState<HTMLTextAreaElement | null>(null);

  const isControlled = value !== undefined;
  const [internalValue, setInternalValue] = useState(() => defaultValue ?? "");
  const current = isControlled ? value : internalValue;

  const setValue = useCallback(
    (next: string) => {
      if (!isControlled) setInternalValue(next);
      onChange?.(next);
    },
    [isControlled, onChange],
  );

  const canSend = current.trim().length > 0 && !disabled;

  const submit = useCallback(() => {
    const trimmed = current.trim();
    // Nothing to send is a NO-OP, not an empty message and not a clear: a reader who pressed Enter
    // on a line of spaces has done nothing, and the composer should reflect that by doing nothing.
    if (!trimmed || disabled) return;
    onSubmit(trimmed);
    setValue("");
  }, [current, disabled, onSubmit, setValue]);

  /* ---- autogrow ---------------------------------------------------------- */

  // Every input that changes the box's content or its metrics: a keystroke, the size lane moving,
  // the node itself arriving. Layout effect, so the reader never sees the pre-growth height paint.
  useLayoutEffect(() => {
    if (textarea) resizeToContent(textarea);
  }, [textarea, current, size]);

  // A webfont landing changes the line-height the cap is computed from, and it lands after the
  // first paint. Re-measure once it has.
  useEffect(() => {
    if (!textarea || !document.fonts) return;
    let live = true;
    document.fonts.ready.then(() => {
      if (live) resizeToContent(textarea);
    });
    return () => {
      live = false;
    };
  }, [textarea]);

  // WIDTH changes re-wrap the text and therefore change its height. The shared observer, never a
  // window resize listener: the composer can be re-laid-out by a sidebar opening beside it, and
  // the window never resizes for that.
  //
  // Two properties of that observer are load-bearing here. It fires once SYNCHRONOUSLY on
  // registration with a partial entry — `contentRect` is undefined on that call — so the width is
  // read off the ELEMENT, never off the entry. And it holds ONE callback per element, so this
  // effect must own the textarea exclusively; nothing else in the family observes this node.
  //
  // The width guard is not an optimisation. `resizeToContent` writes a height, the observer sees
  // that as a resize, and calling it again from inside its own callback is a feedback loop.
  const lastWidth = useRef(-1);
  const widthFrame = useRef(0);
  useLayoutEffect(() => {
    if (!textarea) return;
    lastWidth.current = -1;
    observeResize(textarea, () => {
      const width = textarea.clientWidth;
      if (width === lastWidth.current) return;
      lastWidth.current = width;
      // Defer the height write OUT of the observer's delivery frame. The width guard stops
      // recursion, but even one synchronous write to the observed element raises the browser's
      // "ResizeObserver loop completed with undelivered notifications" window error — an
      // intermittent suite flake when it lands inside another test's window.
      cancelAnimationFrame(widthFrame.current);
      widthFrame.current = requestAnimationFrame(() => resizeToContent(textarea));
    });
    return () => {
      cancelAnimationFrame(widthFrame.current);
      unobserveResize(textarea);
    };
  }, [textarea]);

  /* ---- keyboard + pointer ------------------------------------------------ */

  const handleKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key !== "Enter" || event.shiftKey) return;
    // Enter while an input method editor is composing is the editor's key, not ours — intercepting
    // it sends half a word in every language that needs one.
    if (event.nativeEvent.isComposing) return;
    // Always prevented, including when there is nothing to send: otherwise "Enter does nothing"
    // would quietly mean "Enter adds a blank line".
    event.preventDefault();
    submit();
  };

  const handleDockClick = (event: MouseEvent<HTMLDivElement>) => {
    if (disabled) return;
    const target = event.target as HTMLElement | null;
    // A press that landed on something that already does something keeps its meaning.
    if (target?.closest(INTERACTIVE)) return;
    textarea?.focus();
  };

  const composer = (
    <div
      ref={ref}
      className={["rt-ds-chat-composer", className].filter(Boolean).join(" ")}
      style={style}
      data-size={size}
      data-disabled={disabled ? "" : undefined}
      {...rest}
    >
      {/* The dock: one bordered surface, and the element the focus ring hoists to. */}
      <div className="rt-ds-chat-composer-dock" onClick={handleDockClick}>
        <div className="rt-ds-chat-composer-input">
          <TextArea
            ref={setTextarea}
            rows={1}
            size={typeof size === "string" ? size : undefined}
            value={current}
            onChange={(event) => setValue(event.currentTarget.value)}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            aria-label={label}
            aria-describedby={status ? statusId : undefined}
            aria-invalid={status?.tone === "error" || undefined}
            disabled={disabled}
          />
        </div>

        <div className="rt-ds-chat-composer-actions">
          <div className="rt-ds-chat-composer-actions-lead">{actions}</div>
          <ChatSendButton
            isStopShown={isStopShown}
            canSend={canSend}
            disabled={disabled}
            size={typeof size === "string" ? size : undefined}
            onSend={submit}
            onStop={onStop}
            sendLabel={sendLabel}
            stopLabel={stopLabel}
          />
        </div>

      </div>

      {status != null && (
        // UNDER THE DOCK, which is where every other input in this system puts its message. The
        // composer is built on that input, so it follows it: the send control stays the dock's last
        // element, and the sentence belongs to the page the way a field's does — it appears, it
        // changes height, and it goes away without moving anything inside the box.
        //
        // It sat INSIDE the dock until a review, on a contrast argument: at 12px the warning role
        // reads 4.50 : 1 on the page against a 4.5 floor, and 4.61 : 1 on the dock's raised fill.
        // That argument does not survive the system's own ruling — warning text is accepted at
        // 4.40 : 1 precisely because the glyph ships with it and status is never colour alone, and
        // 4.50 is better than the figure already ratified. A layout question was being answered with
        // a measurement that had already been decided.
        //
        // An error is announced assertively and a warning politely — the difference between "this
        // send failed" and "you are near the limit". It is the SHARED status line rendered directly,
        // with no wrapper of its own, so this message is the same construction a field's message is —
        // and the space above it comes from the root's gap, the same way a field's does.
        <StatusLine
          id={statusId}
          tone={status.tone}
          size={typeof size === "string" ? size : undefined}
          role={status.tone === "error" ? "alert" : "status"}
        >
          {status.message}
        </StatusLine>
      )}
    </div>
  );

  return seedTier ? (
    <SizeContext.Provider value={seedTier}>{composer}</SizeContext.Provider>
  ) : (
    composer
  );
});
