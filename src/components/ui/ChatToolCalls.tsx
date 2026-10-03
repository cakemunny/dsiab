// Copyright (c) Meta Platforms, Inc. and affiliates.
//
// Portions derived from facebook/astryx packages/core/src/Chat/ChatToolCalls.tsx @ d7c9a39b
// (MIT, © Meta Platforms) — the tool-call log's row anatomy, its truncation priority and the
// collapsed group summary. Rebuilt on our own row primitive and disclosure rather than lifted:
// the states, the visible failure text and the real button element are ours.

import { forwardRef, useId, useState, type CSSProperties, type ReactNode, type Ref } from "react";
import { CaretDown, Check, Clock, X } from "@phosphor-icons/react";
import { Badge } from "./Badge";
import { Code } from "./Code";
import { Collapsible } from "./Collapsible";
import { Item } from "./Item";
import { Spinner } from "./Spinner";
import { VisuallyHidden } from "./VisuallyHidden";
import { useResolvedSize } from "../../theme/SizeContext";

/* =============================================================================
 * ChatToolCalls — the record of what an assistant actually DID during a turn.
 * -----------------------------------------------------------------------------
 * A `calls` array in, a scannable activity log out: one row per tool invocation,
 * and — once there is more than one — a single collapsed summary line so a long
 * agent turn does not bury the answer underneath its own working.
 *
 * BUILT ON SHIPPED PARTS, not on new row chrome:
 *   · every row is the `Item` primitive at `density="compact"` (Item is _internal
 *     by DECISIONS [[item-row-primitive]] and correctly has no registry entry) — marker · start ·
 *     label · end is exactly a tool-call row's anatomy, and Item already owns the
 *     no-nested-interactives guard, the truncation longhands and the text lane;
 *   · the group disclosure is `Collapsible`, so `aria-expanded`/`aria-controls`,
 *     the chevron rotation, the height animation and reduced-motion silence all
 *     come from the substrate rather than being re-invented here;
 *   · `Badge` carries the sandbox/node chip and the call count, `Spinner` the
 *     running state, `Code` the monospace tool name.
 *
 * Collapsible's prop type is a CLOSED `Pick` (open | defaultOpen | onOpenChange |
 * disabled + trigger/children): no className, no data-*, no ref. Widening that
 * shared type for one consumer is not on, so this component wraps it in its own
 * element carrying `.rt-ds-chat-toolcalls` and reaches inside with descendant
 * selectors (see the ChatToolCalls block in tokens/components.css).
 *
 * DIVERGENCES FROM THE SHAPE THIS WAS DERIVED FROM (recorded in DECISIONS as
 * [[chat-tool-log]]; the ledger, not the stories, is where provenance lives):
 *
 *   · Default COLLAPSED. The reference implementation's JSDoc advertises
 *         "@default true for ≤3 calls" and its code reads `?? false` — the code
 *         is what shipped, and default-closed is also our Collapsible's ruling.
 *   · Dead API dropped: `label` (declared, never read), `renderDetail`
 *         (documented, never existed), the pile-of-cards decoration, and the
 *         orphan `data` passthrough that only fed `renderDetail`.
 *   · The two `role="button"` divs that ship here become REAL `<button>` elements
 *         (the source's third — the drawer toggle — belongs to the deferred attachments drawer). The
 *         group header is Collapsible's own primitive trigger; a row that owns a
 *         `resultDetail` wraps its Item in a `<button>` (Item renders `as="span"`
 *         there, so the button's content stays phrasing content and the markup
 *         is valid).
 *   · No hidden tab stops. Radix Presence UNMOUNTS the closed group body, so
 *         the "focusable rows at grid-template-rows: 0fr" bug is structurally
 *         impossible here — no `inert`, no `forceMount`. Asserted in
 *         `_internal/ChatToolCalls behavior`.
 *   · `pending` ≠ `running`. The reference renders an identical spinner for
 *         both, which makes a queued call look like a working one. Here `running`
 *         is the Spinner and `pending` is a clock glyph PLUS a visible "Queued"
 *         label — a bare glyph the reader has to decode is not a state.
 *   · `errorMessage` renders as VISIBLE text under the row (the reference put
 *         it in a `title` attribute, invisible to touch and to most AT).
 *
 * TRUNCATION LADDER (kept): the tool NAME shrinks slowly and never past ~4
 * characters, the TARGET shrinks aggressively (it is the longest and the most
 * guessable), and the duration / diff stats never shrink at all — they are the
 * two things a reader scans a collapsed log for. Implemented as flex-shrink
 * 1 / 10 / 0 with the ellipsis longhands; see the CSS block.
 *
 * Status is never carried by colour alone: queued = clock + "Queued", running =
 * an animated spinner, complete = a check, error = a cross plus the visible
 * message. Each state also contributes its word to the row's accessible name.
 * ============================================================================= */

export type ChatToolCallStatus = "pending" | "running" | "complete" | "error";

export interface ChatToolCallItem {
  /** Tool / function name, set in monospace. Required — it is what the row is about. */
  name: string;
  /** Execution state. @default 'complete' */
  status?: ChatToolCallStatus;
  /** What the tool acted on — a file path, a shell command, a search query. */
  target?: string;
  /** Human-readable elapsed time ("1.2s", "340ms"). Shown once the call completes. */
  duration?: string;
  /** Sandbox / environment the tool ran in, shown as a chip. */
  node?: string;
  /** Lines added by an edit — rendered in the success role with a leading `+`. */
  additions?: number;
  /** Lines removed by an edit — rendered in the error role with a leading `-`. */
  deletions?: number;
  /** Any further trailing metadata. Free-form, sits beside the diff counts. */
  stats?: ReactNode;
  /** Why the call failed. Rendered as visible text under the row when `status` is `error`. */
  errorMessage?: string;
  /** Stable React key. Derived from the row's own metadata when omitted. */
  key?: string;
  /** Output to reveal under the row — a diff, a terminal transcript, a JSON result.
   *  Its presence is what makes the row an expandable control. The revealed region scrolls
   *  horizontally when wide; content that actually overflows should bring its own tab stop
   *  (a scrollable region needs one) — none of the shipped fixtures do. */
  resultDetail?: ReactNode;
}

export interface ChatToolCallsProps {
  /** Ref forwarded to the root element. */
  ref?: Ref<HTMLDivElement>;
  /** The calls to display, oldest first. An empty array renders nothing at all. */
  calls: ChatToolCallItem[];
  /** Controlled disclosure state for the group summary. Ignored for a single call. */
  open?: boolean;
  /** Uncontrolled initial disclosure state. @default false */
  defaultOpen?: boolean;
  /** Fired when the group summary opens or closes. */
  onOpenChange?: (open: boolean) => void;
  className?: string;
  style?: CSSProperties;
  /** Escape hatch for passthrough attributes (data-*). */
  [key: `data-${string}`]: unknown;
}

/** The word each state contributes to the row's accessible name. `pending` shows its word. */
const STATUS_WORD: Record<ChatToolCallStatus, string> = {
  pending: "Queued",
  running: "Running",
  complete: "Done",
  error: "Failed",
};

/** A stable key: the caller's when given, else the row's own metadata plus its position (so
 *  appending a call never renumbers the rows already on screen). */
function toolCallKey(call: ChatToolCallItem, index: number): string {
  if (call.key != null) return call.key;
  return [
    call.name,
    call.status ?? "complete",
    call.target ?? "",
    call.node ?? "",
    call.duration ?? "",
    String(index),
  ].join("\u001f");
}

/** The status slot: a glyph that differs by SHAPE, plus the state's word — visible for `pending`
 *  ([[chat-tool-log]]: a lone clock reads as a duration, not as "not started yet"), announced for the rest. */
function StatusIndicator({ status }: { status: ChatToolCallStatus }) {
  const word = STATUS_WORD[status];
  return (
    <span className="rt-ds-chat-toolcalls-status" data-status={status}>
      <span className="rt-ds-chat-toolcalls-glyph">
        {status === "running" ? (
          <Spinner />
        ) : status === "pending" ? (
          <Clock weight="bold" aria-hidden />
        ) : status === "error" ? (
          <X weight="bold" aria-hidden />
        ) : (
          <Check weight="bold" aria-hidden />
        )}
      </span>
      {/* Every state announces its word from HERE, so the state is the first thing heard on every
       *  row. `pending` ALSO shows its word, but in the trailing rail (see CallMeta) rather than
       *  here: this slot is the row's fixed leading glyph, and widening it for one state pushed the
       *  name column 49px right on that row alone, in a log whose whole job is being scannable. The
       *  ruling asks for the word to be VISIBLE, not for it to be leading. */}
      <VisuallyHidden>{word}</VisuallyHidden>
    </span>
  );
}

/** The identifying line: tool name, optional node chip, optional target. Its three children carry
 *  the truncation ladder (name shrinks slowly, target aggressively, chip not at all). */
function CallLine({ call }: { call: ChatToolCallItem }) {
  return (
    <span className="rt-ds-chat-toolcalls-line">
      <Code variant="ghost" className="rt-ds-chat-toolcalls-name">
        {call.name}
      </Code>
      {call.node != null && <Badge className="rt-ds-chat-toolcalls-node">{call.node}</Badge>}
      {call.target != null && <span className="rt-ds-chat-toolcalls-target">{call.target}</span>}
    </span>
  );
}

/** The trailing rail: diff counts, duration, and the disclosure caret. Never shrinks. */
function CallMeta({ call, hasDetail }: { call: ChatToolCallItem; hasDetail: boolean }) {
  const status = call.status ?? "complete";
  const hasStats = call.additions != null || call.deletions != null || call.stats != null;
  const showDuration = call.duration != null && status === "complete";
  /* `pending` carries its word here rather than in the leading glyph slot, so the name column keeps
   * one left edge down the whole log. It is aria-hidden because StatusIndicator already announces
   * the same word — this copy is the sighted cue, not a second announcement. */
  const showQueued = status === "pending";
  if (!hasStats && !showDuration && !hasDetail && !showQueued) return null;
  return (
    <span className="rt-ds-chat-toolcalls-meta">
      {showQueued && (
        <span className="rt-ds-chat-toolcalls-statuslabel" aria-hidden>
          {STATUS_WORD.pending}
        </span>
      )}
      {hasStats && (
        <span className="rt-ds-chat-toolcalls-stats">
          {call.additions != null && (
            <span className="rt-ds-chat-toolcalls-additions">+{call.additions}</span>
          )}
          {call.deletions != null && (
            <span className="rt-ds-chat-toolcalls-deletions">-{call.deletions}</span>
          )}
          {call.stats}
        </span>
      )}
      {showDuration && <span className="rt-ds-chat-toolcalls-duration">{call.duration}</span>}
      {hasDetail && <CaretDown className="rt-ds-chat-toolcalls-caret" weight="bold" aria-hidden />}
    </span>
  );
}

/** One tool call. With a `resultDetail` the whole row becomes a real `<button>` disclosure
 *  ([[chat-tool-log]]); without one it is inert text. `aria-controls` is only emitted while the panel exists
 *  — pointing it at an unmounted id is an invalid reference, not a hint. */
function CallRow({ call }: { call: ChatToolCallItem }) {
  const status = call.status ?? "complete";
  const hasDetail = call.resultDetail != null;
  const [open, setOpen] = useState(false);
  const detailId = useId();
  const errorText = status === "error" ? call.errorMessage : undefined;

  const item = (
    <Item
      as={hasDetail ? "span" : "div"}
      density="compact"
      align={errorText != null ? "start" : "center"}
      className="rt-ds-chat-toolcalls-row"
      data-status={status}
      startContent={<StatusIndicator status={status} />}
      label={<CallLine call={call} />}
      description={
        errorText != null ? (
          <span className="rt-ds-chat-toolcalls-error">{errorText}</span>
        ) : undefined
      }
      endContent={<CallMeta call={call} hasDetail={hasDetail} />}
    />
  );

  if (!hasDetail) return <div className="rt-ds-chat-toolcalls-item">{item}</div>;

  return (
    <div className="rt-ds-chat-toolcalls-item">
      <button
        type="button"
        className="rt-ds-chat-toolcalls-toggle"
        aria-expanded={open}
        aria-controls={open ? detailId : undefined}
        onClick={() => setOpen((prev) => !prev)}
      >
        {item}
      </button>
      {open && (
        <div id={detailId} className="rt-ds-chat-toolcalls-detail">
          {call.resultDetail}
        </div>
      )}
    </div>
  );
}

export const ChatToolCalls = forwardRef<HTMLDivElement, ChatToolCallsProps>(function ChatToolCalls(
  { calls, open, defaultOpen, onOpenChange, className, style, ...rest },
  ref,
) {
  // The rows are text, not controls, so the whole component rides the TEXT lane. Stamped on the
  // root so the group trigger (which is not an Item and has no ladder of its own) inherits the
  // same step as the rows underneath it.
  const size = useResolvedSize("text", undefined);

  const root = (children: ReactNode) => (
    <div
      ref={ref}
      className={["rt-ds-chat-toolcalls", className].filter(Boolean).join(" ")}
      style={style}
      data-size={size}
      {...rest}
    >
      {children}
    </div>
  );

  // Nothing happened — render nothing. An empty shell would claim a turn used tools when it did not.
  if (calls.length === 0) return null;

  // One call is just a row: group chrome for a single item is a disclosure that hides nothing.
  if (calls.length === 1) return root(<CallRow call={calls[0]} />);

  // The summary shows the LATEST call — its state and its name — because that is what a reader
  // watching a turn unfold needs: what is happening now, not a count of what a wrench means.
  const latest = calls[calls.length - 1];
  return root(
    <Collapsible
      open={open}
      defaultOpen={defaultOpen}
      onOpenChange={onOpenChange}
      trigger={
        <span className="rt-ds-chat-toolcalls-summary">
          <StatusIndicator status={latest.status ?? "complete"} />
          <Code variant="ghost" className="rt-ds-chat-toolcalls-name">
            {latest.name}
          </Code>
          {latest.target != null && (
            <span className="rt-ds-chat-toolcalls-target">{latest.target}</span>
          )}
          <Badge className="rt-ds-chat-toolcalls-count">{calls.length} calls</Badge>
        </span>
      }
    >
      <div className="rt-ds-chat-toolcalls-list">
        {calls.map((call, i) => (
          <CallRow key={toolCallKey(call, i)} call={call} />
        ))}
      </div>
    </Collapsible>,
  );
});
