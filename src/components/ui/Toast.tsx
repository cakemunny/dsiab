// Copyright (c) Meta Platforms, Inc. and affiliates.
// Portions derived from facebook/astryx packages/core/src/Toast/Toast.tsx @ 032e639f (MIT, © Meta Platforms)
// Portions derived from facebook/astryx packages/core/src/Toast/ToastViewport.tsx @ 032e639f (MIT, © Meta Platforms)

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ComponentType,
  type FocusEvent,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";
import * as RadixToast from "@radix-ui/react-toast";
import { Theme } from "@radix-ui/themes";
import { Info, CheckCircle, Warning, WarningCircle, X, type IconProps } from "@phosphor-icons/react";
import { ButtonGroup } from "./ButtonGroup";
import { Button } from "./Button";
import { IconButton } from "./IconButton";
import { useUISize } from "../../theme/SizeContext";

/**
 * Toast — transient feedback that floats over content, built on the raw
 * `@radix-ui/react-toast` primitive ([[headless-primitives-declared]]). Radix supplies the per-toast lifecycle
 * (enter/exit via Presence, swipe, Escape, the assertive/polite live-region
 * announcement); the System supplies the skin (four accent-aware tone families,
 * the emphasis-tier motion) and the queue MANAGER Radix deliberately doesn't ship
 * — windowing, id-based dedup, a pause-aware auto-hide timer, and focus handoff.
 *
 * A toast is FEEDBACK, not a decision. Use `AlertDialog` for a decision, `Callout`
 * for persistent in-page messaging, and never a toast for form validation (that
 * rides the `Field` shell). One action per toast, canonically "Undo".
 *
 * @example
 * const toast = useToast();
 * toast({ body: "Project archived.", tone: "success",
 *         action: { label: "Undo", altText: "Undo archiving the project", onClick: restore } });
 */

// The derived logic is the queue manager: windowing, uniqueID/collisionBehavior dedup,
// pause-aware auto-hide timer with the 1000ms resume clamp, and next→previous→restore focus
// handoff. Radix's Presence lifecycle replaces Astryx's exitingIds/onTransitionEnd bookkeeping;
// the createRoot singleton fallback is intentionally NOT ported (see History).

export type ToastTone = "info" | "success" | "warning" | "error";
export type ToastPosition = "top-start" | "top-end" | "bottom-start" | "bottom-end";
export type CollisionBehavior = "overwrite" | "ignore";
export type DismissFn = () => void;

/** A single, canonical action ("Undo"). `altText` is mandatory (an a11y upgrade
 *  over Astryx's bare endContent) — the assistive-tech description of the action. */
export interface ToastAction {
  label: ReactNode;
  altText: string;
  onClick: () => void;
}

export interface ToastOptions {
  /** The message. A toast has no title — it's a single line of feedback. */
  body: ReactNode;
  /** Semantic family. `info` (default) · `success` · `warning` · `error`. */
  tone?: ToastTone;
  /** Auto-dismiss after `autoHideDuration`. Defaults to `true` for every tone
   *  except `error`, which persists (Astryx's rule, kept). */
  autoHide?: boolean;
  /** Auto-hide countdown in ms (default 5000). Paused on hover/focus/window-blur;
   *  on resume the remaining time is clamped to a 1000ms minimum. */
  autoHideDuration?: number;
  /** One action, canonically Undo. Renders in a `ButtonGroup` with the dismiss. */
  action?: ToastAction;
  /** Dedup key. A second toast with a live `uniqueID` follows `collisionBehavior`. */
  uniqueID?: string;
  /** How a `uniqueID` collision resolves: `overwrite` (default — replace content,
   *  reset the timer) or `ignore` (drop the newcomer). */
  collisionBehavior?: CollisionBehavior;
  /** Fires when the entry leaves (dismissed, swiped, timed out, or programmatic). */
  onHide?: () => void;
}

const TONE_ICON: Record<ToastTone, ComponentType<IconProps>> = {
  info: Info,
  success: CheckCircle,
  warning: Warning,
  error: WarningCircle,
};

const DEFAULT_DURATION = 5000;
const MIN_RESUME_REMAINING = 1000; // a resumed toast never vanishes in under a second
// Hold the entry through the exit animation, then GC it. This MUST outlast the exit — the toast's exit
// runs at --ds-duration-expressive (320ms) under the "faster in, slower out" motion rule, so a shorter
// hold hard-removes the node mid-animation and the toast vanishes instead of leaving. Was 220ms, tuned
// to a 120ms exit under the previous (reversed) convention; the retime made it a truncation bug.
// 420, not 380: the timer starts at the dismiss CALL, but React's `data-state` flip — and therefore the
// animation's own start — lags it by a measured 39-61ms. At 380 the animation finished at 359-381ms
// against a 380ms timer: 11-17ms of headroom, under a single frame, so a slower render would truncate it.
const EXIT_GC_MS = 420;

type Entry = {
  id: string;
  nonce: number; // bumped on overwrite → resets the timer
  body: ReactNode;
  tone: ToastTone;
  autoHide: boolean;
  autoHideDuration: number;
  action?: ToastAction;
  onHide?: () => void;
  open: boolean;
};

type ToastManager = {
  entries: Entry[];
  push: (options: ToastOptions) => DismissFn;
  dismiss: (id: string) => void;
};

const ToastManagerContext = createContext<ToastManager | null>(null);

function useManager(): ToastManager {
  const ctx = useContext(ToastManagerContext);
  if (!ctx) {
    throw new Error(
      "useToast must be called inside a <ToastProvider>. Mount <ToastProvider> once at the app root " +
        "(typically just inside the system <Provider>) and place a <ToastViewport /> for the toasts to render into.",
    );
  }
  return ctx;
}

/** Returns the imperative `toast(options) => dismiss` function. Throws if there is
 *  no `<ToastProvider>` above it (no implicit DOM mount — see History). */
export function useToast(): (options: ToastOptions) => DismissFn {
  return useManager().push;
}

// ---- focus handoff (DOM-driven, so it's independent of render timing) ---------
// When the dismissed toast holds focus, move it to the NEXT live toast, else the
// PREVIOUS, else restore the pre-chain element — never let it drop to <body>.
function handoffFocus(id: string, restore: HTMLElement | null) {
  const dismissed = document.querySelector<HTMLElement>(`[data-ds-toast-id="${id}"]`);
  if (!dismissed || !dismissed.contains(document.activeElement)) return;
  const live = Array.from(document.querySelectorAll<HTMLElement>("[data-ds-toast-id]")).filter(
    (el) => el.getAttribute("data-state") !== "closed",
  );
  const idx = live.indexOf(dismissed);
  const focusInside = (el: HTMLElement | null | undefined): boolean => {
    if (!el) return false;
    const target =
      el.querySelector<HTMLElement>('button, [href], [tabindex]:not([tabindex="-1"])') ?? el;
    target.focus();
    return document.activeElement !== document.body && el.contains(document.activeElement);
  };
  if (focusInside(live[idx + 1]) || focusInside(live[idx - 1])) return;
  if (restore && document.contains(restore)) restore.focus();
}

export interface ToastProviderProps {
  children: ReactNode;
  /** a11y label for the primitive's announcer region. */
  label?: string;
  /** Swipe-to-dismiss direction — defaults to `right` (the default bottom-end
   *  viewport). Set `left` for a `*-start` viewport corner. */
  swipeDirection?: RadixToast.ToastProviderProps["swipeDirection"];
}

/** Owns the entry map + the manager logic and wraps the primitive's provider.
 *  Mount once at the app root, inside the system `<Provider>`. */
export function ToastProvider({ children, label = "Notification", swipeDirection = "right" }: ToastProviderProps) {
  const [entries, setEntries] = useState<Entry[]>([]);
  const entriesRef = useRef<Entry[]>([]);
  entriesRef.current = entries; // keep in sync every render for the imperative paths
  const restoreRef = useRef<HTMLElement | null>(null);
  const gcTimers = useRef<Map<string, number>>(new Map());
  const dismissingIds = useRef<Set<string>>(new Set()); // ids already mid-dismiss — makes dismiss() idempotent
  const idSeq = useRef(0);

  const hardRemove = useCallback((id: string) => {
    dismissingIds.current.delete(id); // the entry is fully gone — a later genuine re-push of this id may dismiss again
    setEntries((prev) => {
      const next = prev.filter((e) => e.id !== id);
      if (next.length === 0) restoreRef.current = null; // the chain ended
      return next;
    });
  }, []);

  const dismiss = useCallback(
    (id: string) => {
      const entry = entriesRef.current.find((e) => e.id === id);
      if (!entry || !entry.open) return;
      // Idempotent within a tick: Radix's ToastAction composes its onClick with an internal onClose, so an Undo
      // click can drive dismiss(id) twice before entriesRef re-syncs on render — both would still see open:true
      // and double-fire onHide (a callback-contract violation). This guard collapses them to a single dismiss.
      if (dismissingIds.current.has(id)) return;
      dismissingIds.current.add(id);
      handoffFocus(id, restoreRef.current);
      setEntries((prev) => prev.map((e) => (e.id === id ? { ...e, open: false } : e)));
      entry.onHide?.();
      if (!gcTimers.current.has(id)) {
        const t = window.setTimeout(() => {
          gcTimers.current.delete(id);
          hardRemove(id);
        }, EXIT_GC_MS);
        gcTimers.current.set(id, t);
      }
    },
    [hardRemove],
  );

  const push = useCallback(
    (options: ToastOptions): DismissFn => {
      const tone = options.tone ?? "info";
      const autoHide = options.autoHide ?? tone !== "error";
      const autoHideDuration = options.autoHideDuration ?? DEFAULT_DURATION;
      const id = options.uniqueID ?? `ds-toast-${(idSeq.current += 1)}`;
      const nonce = (idSeq.current += 1); // computed ONCE here — a React updater must be pure (StrictMode double-invokes it)

      // Capture the element focused before the chain started, so a full dismiss
      // can restore it. Only when this is the first live toast.
      if (entriesRef.current.filter((e) => e.open).length === 0) {
        const active = document.activeElement as HTMLElement | null;
        restoreRef.current = active && active !== document.body ? active : null;
      }

      setEntries((prev) => {
        // Match a collision on the id REGARDLESS of open: a just-dismissed entry lingers (open:false) through
        // EXIT_GC_MS before hardRemove, so appending past it would put two entries under one id → a duplicate
        // React key in ToastViewport (a reconciliation glitch + a React warning).
        const collision = prev.find((e) => e.id === id);
        const entry: Entry = {
          id,
          nonce,
          body: options.body,
          tone,
          autoHide,
          autoHideDuration,
          action: options.action,
          onHide: options.onHide,
          open: true,
        };
        // "ignore" drops the newcomer only against a LIVE (open) entry. A CLOSING entry must revive instead —
        // ignoring it would drop the newcomer AND let the old one GC away, leaving nothing on screen.
        if (collision && collision.open && (options.collisionBehavior ?? "overwrite") === "ignore") {
          return prev;
        }
        if (collision) {
          // Revive/replace (open → overwrite + reset timer; closing → resurrect before GC). Cancel the pending
          // GC timer so the revived entry isn't hard-removed, and clear the dismiss guard so it's dismissable
          // again. (These ref writes are idempotent → a StrictMode double-invoke is harmless, unlike the nonce.)
          const pendingGc = gcTimers.current.get(id);
          if (pendingGc != null) {
            window.clearTimeout(pendingGc);
            gcTimers.current.delete(id);
          }
          dismissingIds.current.delete(id);
          return prev.map((e) => (e.id === id ? entry : e));
        }
        return [...prev, entry];
      });

      return () => dismiss(id);
    },
    [dismiss],
  );

  return (
    <RadixToast.Provider label={label} swipeDirection={swipeDirection} duration={DEFAULT_DURATION}>
      <ToastManagerContext.Provider value={{ entries, push, dismiss }}>
        {children}
      </ToastManagerContext.Provider>
    </RadixToast.Provider>
  );
}

export interface ToastViewportProps {
  /** Corner the toasts stack in. Default `bottom-end`. */
  position?: ToastPosition;
  /** Cap of simultaneously-rendered toasts; older ones queue (default 5). */
  maxVisible?: number;
  /** Focus-the-viewport hotkey (Radix default `F8`). */
  hotkey?: string[];
  /** a11y label for the viewport landmark. `{hotkey}` is substituted by Radix. */
  label?: string;
  /** Element the rail portals into. Default `document.body`, which is what lets a toast clear an open
   *  modal. Pass another element only to contain the rail, as a docs measurement host does. */
  container?: HTMLElement | null;
}

/** The fixed corner rail the toasts render into. It is portaled to `document.body` and `<Theme>`-wrapped
 *  there, so the toasts resolve the token scales outside the app's theme root.
 *
 *  Why the portal: the Provider's root Theme is a `z-index: 0` stacking context (Radix Themes styles.css,
 *  `[data-is-root-theme='true']`), so inside it `--ds-z-toast` only orders the rail among the app's own
 *  layers. A modal's overlay portals to the body after it, so a toast raised under an open modal painted
 *  beneath the scrim, and a click at Undo landed on the dialog and closed it. At body level the rail's
 *  z-index stacks above the scrim. One case stays open: a toast raised BEFORE the modal opened paints
 *  above the scrim but takes no pointer input, because Radix's DismissableLayer turns pointer events off
 *  on every layer older than the modal.
 *
 *  Why `aria-live="off"`: a modal Dialog hides everything outside itself with `aria-hidden` (the
 *  aria-hidden package), and that package leaves any `[aria-live]` node and its ancestors alone. The
 *  rail's `ol` carries the attribute so a toast raised under a modal stays reachable to a screen reader
 *  (Radix #4115, the #4127 mechanism). "off" announces nothing itself, so Radix's own status node still
 *  speaks once. */
export function ToastViewport({ position = "bottom-end", maxVisible = 5, hotkey, label, container }: ToastViewportProps) {
  const { entries } = useManager();
  // Known limitation: handoffFocus guarantees a dismissed toast never drops focus to <body>, but that
  // covers DISMISSAL only. A toast that currently holds focus and is evicted here by windowing (a newer
  // toast pushes it past maxVisible) can still drop focus to <body>. Accepted as a named deferral —
  // windowing an actively-focused toast is a rare race (see DECISIONS [[toast-feedback-tier]]).
  const visible = entries.slice(-maxVisible); // window: only the newest maxVisible render
  // The body is read after mount, so a server render emits nothing and hydration matches.
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  // Outside the root theme the `data-ui-size` the Provider writes is gone, and `--ds-ui-body-size` with
  // it (typography.css). The portaled Theme carries the tier again, so the rail computes as it did inside.
  const uiSize = useUISize();
  const host = container ?? (mounted ? document.body : null);
  if (!host) return null;
  return createPortal(
    <Theme hasBackground={false} data-ui-size={uiSize}>
      {visible.map((entry) => (
        <ToastItem key={entry.id} entry={entry} />
      ))}
      <RadixToast.Viewport
        className="rt-ds-toast-viewport"
        data-position={position}
        hotkey={hotkey}
        label={label}
        aria-live="off"
      />
    </Theme>,
    host,
  );
}

function ToastItem({ entry }: { entry: Entry }) {
  const { dismiss } = useManager();
  const { id, tone, body, action, autoHide, autoHideDuration, nonce, open } = entry;
  const Glyph = TONE_ICON[tone];
  const isError = tone === "error";
  const rootRef = useRef<HTMLLIElement>(null);

  // ---- the pause-aware auto-hide timer (owned here, not Radix's) --------------
  // Radix's own timer is disabled (duration={Infinity}); this one implements the
  // hover/focus/window-blur pause + the 1000ms resume clamp (the Astryx manager).
  const paused = useRef({ hover: false, focus: false, blur: false });
  const remaining = useRef(autoHideDuration);
  const startedAt = useRef(0);
  const timer = useRef<number | null>(null);
  const fire = useRef<() => void>(() => {});
  fire.current = () => dismiss(id);

  const clear = () => {
    if (timer.current != null) {
      window.clearTimeout(timer.current);
      timer.current = null;
    }
  };
  const anyPaused = () => paused.current.hover || paused.current.focus || paused.current.blur;
  const run = () => {
    if (!autoHide || anyPaused() || timer.current != null || remaining.current === Infinity) return;
    startedAt.current = Date.now();
    timer.current = window.setTimeout(() => {
      timer.current = null;
      fire.current();
    }, remaining.current);
  };
  const pause = () => {
    if (timer.current == null) return;
    clear();
    remaining.current = Math.max(remaining.current - (Date.now() - startedAt.current), 0);
  };
  const resume = () => {
    if (anyPaused()) return;
    remaining.current = Math.max(remaining.current, MIN_RESUME_REMAINING); // 1000ms clamp
    run();
  };

  // Start on mount; a new nonce (overwrite) resets the countdown + content.
  useEffect(() => {
    remaining.current = autoHideDuration;
    clear();
    run();
    return clear;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nonce]);

  // Window blur/focus pauses/resumes the countdown (a background tab shouldn't burn the timer).
  useEffect(() => {
    if (!autoHide) return;
    const onBlur = () => {
      paused.current.blur = true;
      pause();
    };
    const onFocus = () => {
      paused.current.blur = false;
      resume();
    };
    window.addEventListener("blur", onBlur);
    window.addEventListener("focus", onFocus);
    return () => {
      window.removeEventListener("blur", onBlur);
      window.removeEventListener("focus", onFocus);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nonce]);

  const onBlurCapture = (e: FocusEvent<HTMLLIElement>) => {
    if (rootRef.current && !rootRef.current.contains(e.relatedTarget as Node | null)) {
      paused.current.focus = false;
      resume();
    }
  };

  return (
    <RadixToast.Root
      ref={rootRef}
      className="rt-ds-toast"
      data-tone={tone}
      data-ds-toast-id={id}
      type={isError ? "foreground" : "background"}
      duration={Infinity}
      open={open}
      onOpenChange={(o) => {
        if (!o) dismiss(id);
      }}
      onPointerEnter={() => {
        paused.current.hover = true;
        pause();
      }}
      onPointerLeave={() => {
        paused.current.hover = false;
        resume();
      }}
      onFocusCapture={() => {
        paused.current.focus = true;
        pause();
      }}
      onBlurCapture={onBlurCapture}
    >
      <span className="rt-ds-toast-icon" aria-hidden>
        <Glyph weight="fill" />
      </span>
      <RadixToast.Title className="rt-ds-toast-body">{body}</RadixToast.Title>
      <ButtonGroup className="rt-ds-toast-actions" gap="2" wrap="nowrap" align="center">
        {action && (
          <RadixToast.Action asChild altText={action.altText}>
            <Button
              priority="secondary"
              size="1"
              // Radix's ToastAction already closes the toast (its composed onClose → onOpenChange(false) →
              // dismiss(id)), so we only run the caller's handler here. dismiss stays idempotent as a backstop.
              onClick={() => action.onClick()}
            >
              {action.label}
            </Button>
          </RadixToast.Action>
        )}
        <IconButton priority="tertiary" color="gray" size="1" aria-label="Dismiss" onClick={() => dismiss(id)}>
          <X weight="bold" />
        </IconButton>
      </ButtonGroup>
    </RadixToast.Root>
  );
}
