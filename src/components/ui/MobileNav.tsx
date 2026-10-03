// Copyright (c) Meta Platforms, Inc. and affiliates.
// Portions derived from facebook/astryx packages/core/src/MobileNav/MobileNav.tsx @ d7c9a39b (MIT, © Meta Platforms)
//
//   Their native <dialog>+showModal() maps near-1:1 onto our raw-Dialog
//   precedent ([[command-palette]]/[[lightbox-viewer]]); the side="auto" trigger-position heuristic has no Radix analog and is lifted.
import {
  useCallback,
  useId,
  useRef,
  useState,
  type MouseEvent,
  type ReactNode,
} from "react";
import { Dialog } from "@radix-ui/themes";
import { List, X } from "@phosphor-icons/react";
import { IconButton, type IconButtonProps } from "./IconButton";
import { useAppShellMobile } from "./appShellContext";
import { useReturnFocus } from "./useReturnFocus";

/* MobileNav / MobileNavToggle — a slide-in navigation drawer for mobile breakpoints (D4).
 *
 * SHELL: a THIN wrapper over the RAW Radix Themes `Dialog` (the CommandPalette / Lightbox precedent —
 * System/Dialog is status:planned, so per the [[component-registry]] agent-gap rule we compose the primitive directly).
 * Radix Dialog owns the focus-trap, Escape, scroll-lock, and backdrop-dismiss for free. Unlike the
 * centered CommandPalette/Lightbox, the drawer PINS to a viewport edge and slides in: the CSS override
 * (components.css) repositions the `.rt-BaseDialogContent` and swaps its inherited scale+fade motion
 * for an edge SLIDE keyframe (still on the modal/emphasis motion tier; reduced-motion collapses free
 * through the duration tokens). The backdrop repaints from `--ds-scrim`.
 *
 * STATE: AppShell owns the open state machine and publishes it via `useAppShellMobile()`. When that
 * context is present, MobileNav reads AppShell's open/setOpen/drawerId (the panel carries `id={drawerId}`
 * so MobileNavToggle's `aria-controls` points at it). Standalone (no AppShell), MobileNav manages its own
 * state — controlled via `open`/`onOpenChange`, or uncontrolled.
 *
 * SIDE: "start" / "end" pin left / right (writing-direction aware via left/right in CSS is edge-based).
 * "auto" (default) reads the trigger's bounding rect at open (from `document.activeElement`, which is
 * still the trigger when `onOpenAutoFocus` fires — before we steer focus to the panel): a trigger on the
 * left half opens from the start edge, the right half from the end edge. No Radix analog — lifted.
 *
 * A11Y (upgrades over upstream, stated in History): the toggle gains `aria-expanded` + `aria-controls`
 * (Astryx has neither); initial focus lands on the drawer panel (`onOpenAutoFocus` + preventDefault, per
 * D4); the drawer is a named dialog (`aria-label`). Width is honestly `min(100vw, width)` — their docs'
 * "85vw cap" is fiction. Paint from `--ds-*` only; no new tokens; no `!important`. */

export type MobileNavSide = "start" | "end" | "auto";

export interface MobileNavProps {
  /** Which edge the drawer slides from. `"auto"` picks the edge nearest the trigger at open. @default "auto" */
  side?: MobileNavSide;
  /** Drawer width in px. The rendered width is honestly `min(100vw, width)`. @default 320 */
  width?: number;
  /** Optional header slot pinned above the scrollable nav body (a title, brand, or close affordance). */
  header?: ReactNode;
  /** Controlled open state (standalone use — ignored when an AppShell provides the drawer state). */
  open?: boolean;
  /** Fires on open/close (standalone controlled/uncontrolled use). */
  onOpenChange?: (open: boolean) => void;
  /** id for the drawer panel — pin it to point a standalone MobileNavToggle's `aria-controls` here.
   *  Ignored when an AppShell provides the drawer state (its `drawerId` wins). Auto-generated otherwise. */
  id?: string;
  /** Accessible name for the drawer dialog. @default "Navigation" */
  label?: string;
  /** The drawer contents — typically the nav rendered in its mobile/drawer regime. */
  children: ReactNode;
}

export function MobileNav({
  side = "auto",
  width = 320,
  header,
  open,
  onOpenChange,
  id,
  label = "Navigation",
  children,
}: MobileNavProps) {
  const ctx = useAppShellMobile();
  const fallbackId = useId();

  // State resolution: AppShell owns it when present; else controlled (`open` set) or uncontrolled.
  const isControlled = open !== undefined;
  const [uncontrolledOpen, setUncontrolledOpen] = useState(false);
  const resolvedOpen = ctx ? ctx.open : isControlled ? open : uncontrolledOpen;
  const drawerId = ctx?.drawerId ?? id ?? fallbackId;

  const setOpen = useCallback(
    (next: boolean) => {
      if (ctx) {
        ctx.setOpen(next);
        return;
      }
      if (!isControlled) setUncontrolledOpen(next);
      onOpenChange?.(next);
    },
    [ctx, isControlled, onOpenChange],
  );

  // Resolved edge — fixed sides pass through; "auto" resolves at open (default "start" until then).
  const [autoSide, setAutoSide] = useState<"start" | "end">("start");
  const resolvedSide = side === "auto" ? autoSide : side;

  const panelRef = useRef<HTMLDivElement>(null);

  // Radix restores close-focus to a `Dialog.Trigger`; the drawer opens from `open` and registers none —
  // without this the toggle that opened it loses focus and the next Tab restarts from the top of the page.
  const returnFocus = useReturnFocus();

  const handleOpenAutoFocus = useCallback(
    (event: Event) => {
      // Capture the opener FIRST — this handler is about to move focus, and the capture must read
      // activeElement while it is still the toggle (the same instant `side="auto"` reads it below).
      returnFocus.onOpenAutoFocus(event);
      // Steer initial focus to the panel (D4), not Radix's default first-focusable.
      event.preventDefault();
      // Resolve "auto" BEFORE stealing focus — activeElement is still the trigger at this point.
      if (side === "auto") {
        const trigger = document.activeElement as HTMLElement | null;
        const rect = trigger?.getBoundingClientRect();
        if (rect && rect.width > 0) {
          const mid = rect.left + rect.width / 2;
          setAutoSide(mid > window.innerWidth / 2 ? "end" : "start");
        }
      }
      panelRef.current?.focus();
    },
    [side, returnFocus],
  );

  return (
    <Dialog.Root open={resolvedOpen} onOpenChange={setOpen}>
      <Dialog.Content
        ref={panelRef}
        id={drawerId}
        className="rt-ds-mobilenav"
        data-side={resolvedSide}
        aria-label={label}
        aria-describedby={undefined}
        tabIndex={-1}
        onOpenAutoFocus={handleOpenAutoFocus}
        onCloseAutoFocus={returnFocus.onCloseAutoFocus}
        style={{ width: `min(100vw, ${width}px)` }}
      >
        {header != null && <div className="rt-ds-mobilenav-header">{header}</div>}
        <div className="rt-ds-mobilenav-body">{children}</div>
      </Dialog.Content>
    </Dialog.Root>
  );
}

export interface MobileNavToggleProps
  extends Omit<IconButtonProps, "aria-expanded" | "aria-controls" | "aria-label" | "children" | "onToggle" | "asChild"> {
  /** Explicit open state (standalone use — falls back to the AppShell drawer state). */
  open?: boolean;
  /** Explicit toggle handler (standalone use — falls back to AppShell's `setOpen`). */
  onToggle?: (open: boolean) => void;
  /** id of the drawer this toggle controls (standalone — falls back to AppShell's `drawerId`). */
  drawerId?: string;
  /** Accessible name. Defaults to "Open/Close navigation menu" tracking the open state. */
  label?: string;
  /** Refused, and measured before it was refused. `children` was already omitted above, so a consumer
   *  has no element to hand over: the hamburger and close glyphs are the only child, chosen from the
   *  open state. What `asChild` actually did was ride the rest spread into `IconButton` and slot that
   *  GLYPH. Server-rendered at 51bfa0b, `<MobileNavToggle asChild>` emitted no `<button>` at all: an
   *  `<svg>` stood where the control had been, carrying `aria-label` and `aria-expanded` on an element
   *  that is neither focusable nor activatable, which voids the one a11y upgrade this component exists
   *  to add ([[mobile-nav]]) and leaves the drawer unopenable by keyboard. Declared rather than merely omitted so
   *  the refusal is a type error a reader can see, and destructured away below so a spread from untyped
   *  JavaScript is IGNORED. */
  asChild?: never;
}

/**
 * The hamburger button that opens/closes the mobile drawer. Reads `useAppShellMobile()` for the drawer
 * state + ids (or takes them explicitly), and drives `aria-expanded` + `aria-controls` — an a11y upgrade
 * over upstream, which has neither. Reuses the System `IconButton`.
 */
export function MobileNavToggle({
  open,
  onToggle,
  drawerId,
  label,
  priority = "tertiary",
  onClick,
  asChild: _refusedAsChild,
  ...rest
}: MobileNavToggleProps) {
  const ctx = useAppShellMobile();
  const isOpen = open ?? ctx?.open ?? false;
  const controls = drawerId ?? ctx?.drawerId;
  const toggleId = ctx?.toggleId;

  // COMPOSE the consumer's onClick with the internal toggle rather than letting either override the other:
  // run the consumer handler first, and if it didn't preventDefault, toggle the drawer.
  const handleClick = useCallback(
    (event: MouseEvent<HTMLButtonElement>) => {
      onClick?.(event);
      if (event.defaultPrevented) return;
      const next = !isOpen;
      if (onToggle) onToggle(next);
      else ctx?.setOpen(next);
    },
    [isOpen, onToggle, onClick, ctx],
  );

  return (
    // `...rest` first so the internal id / aria / composed onClick below always win over consumer props.
    <IconButton
      {...rest}
      id={toggleId}
      priority={priority}
      aria-label={label ?? (isOpen ? "Close navigation menu" : "Open navigation menu")}
      aria-expanded={isOpen}
      aria-controls={controls}
      onClick={handleClick}
    >
      {isOpen ? <X weight="bold" /> : <List weight="bold" />}
    </IconButton>
  );
}
