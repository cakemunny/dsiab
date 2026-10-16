// Copyright (c) Meta Platforms, Inc. and affiliates.
// Portions derived from facebook/astryx packages/core/src/Overlay/Overlay.tsx @ 88c95e4 (MIT, © Meta Platforms)
// Portions derived from facebook/astryx packages/core/src/Overlay/useOverlay.tsx @ 88c95e4 (MIT, © Meta Platforms)

import {
  type ComponentProps,
  type FocusEvent,
  type MouseEvent,
  type PointerEvent,
  type ReactNode,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";

/* Overlay — a media hover-scrim (D10). RECLASSIFIED: this is NOT a portal layer. The registry
 * hypothesis "Portal + Dialog.Overlay" was falsified — Astryx's Overlay is a small fully-custom
 * widget: a `position: relative` container wrapping the media, an ABSOLUTE-INSET scrim painted from
 * --ds-scrim, and a content slot for actions. No @radix-ui primitive, no portal. (Anchored floating
 * content — a menu, a card-on-hover, a confirm — is Popover / HoverCard / Dialog territory, not this.)
 *
 * KEYBOARD REACHABILITY — the load-bearing a11y contract. The reveal is OPACITY-based, NEVER
 * `display:none` or `visibility:hidden`: both of those drop the inner actions from the tab order AND
 * the accessibility tree, so a keyboard/AT user could never reach them. Opacity keeps them focusable
 * and screen-reader-reachable at all times, even while the scrim reads as hidden. `pointer-events`
 * only gates MOUSE clicks on the invisible controls — it never blocks Tab or Enter/Space. And the
 * scrim reveals on `:focus-within` in EVERY `showOn` mode (a non-negotiable a11y net: a focused action
 * must never be invisible — WCAG 2.4.7). The reveal / paint / positioning all live in components.css
 * (--ds-scrim + the motion ladder); this file owns the structure and the touch tap-to-toggle.
 *
 * TAP-TO-TOGGLE (ported from Astryx's `useOverlay` as-is): on `(hover: none)` devices hover can never
 * fire, so a tap on the media toggles the scrim. The hover capability is read at interaction time via
 * `matchMedia` (no listener needed — it responds to a device change on the next tap).
 *
 * ESCAPE DISMISSES THE VEIL (WCAG 1.4.13, [[overlay-dismissible-gap]]). While the pointer is over the Overlay or
 * focus is inside it, Escape sets `data-dismissed`. A veil that hover revealed hides. A veil that focus
 * holds turns transparent and stops taking clicks, and every other scrim child, actions and captions alike,
 * hides, so the focused control stays visible with its ring (WCAG 2.4.7). A hollow plate of the veil's colour
 * sits behind the focused control so the ring keeps 3:1 over any media. The plate is its own element, so the
 * control keeps every border it draws itself. The state clears only when both the pointer and focus have left.
 */

const PLATE = 6; // px of veil colour around the focused control, behind its ring

interface PlateBox {
  left: number;
  top: number;
  width: number;
  height: number;
  radius: number;
}

export type OverlayShowOn = "hover" | "focus" | "always" | "hover-or-focus";
export type OverlayPosition = "fill" | "bottom" | "top";
export type OverlayScrim = "dark" | "light";

export interface OverlayProps extends Omit<ComponentProps<"div">, "content"> {
  /** When the scrim + content reveal. Default `hover-or-focus` — the a11y-safe default (keyboard focus
   *  is always an explicit reveal trigger, not only the a11y net). */
  showOn?: OverlayShowOn;
  /** Where the content sits within the scrim. Default `bottom`. */
  position?: OverlayPosition;
  /** Scrim tint: `dark` (--ds-scrim, for light media) or `light` (--ds-scrim-light, for dark media). */
  scrim?: OverlayScrim;
  /** The media/card that sits BENEATH the scrim (an `<img>`, a Card, a poster div). */
  media: ReactNode;
  /** The content/actions revealed WITHIN the scrim. Real focusable controls (Button/IconButton) here
   *  stay keyboard-reachable — see the class note. */
  children?: ReactNode;
}

export function Overlay({
  showOn = "hover-or-focus",
  position = "bottom",
  scrim = "dark",
  media,
  children,
  onClick,
  onPointerEnter,
  onPointerLeave,
  onFocus,
  onBlur,
  ref,
  ...rest
}: OverlayProps) {
  const [tapped, setTapped] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  // `focus` holds the focused element, so the plate can follow it from one action to the next.
  const [engaged, setEngaged] = useState<{ hover: boolean; focus: Element | null }>({ hover: false, focus: null });
  const [plate, setPlate] = useState<PlateBox | null>(null);
  // The blur check needs the root node, and a caller may pass a ref of their own (a plain prop in React 19).
  const root = useRef<HTMLDivElement | null>(null);
  const setRoot = useCallback(
    (node: HTMLDivElement | null) => {
      root.current = node;
      if (typeof ref === "function") ref(node);
      else if (ref) ref.current = node;
    },
    [ref],
  );

  // Escape is heard on the document only while this Overlay shows its veil, and only until it dismisses.
  // Hover counts only in the modes hover reveals. `always` content is not hover or focus content.
  const hoverReveals = showOn === "hover" || showOn === "hover-or-focus";
  const listening = ((engaged.hover && hoverReveals) || !!engaged.focus) && !dismissed && showOn !== "always";
  useEffect(() => {
    if (!listening) return;
    const onKey = (e: KeyboardEvent) => {
      // An Escape that a layer inside already handled (a menu, a select) closes that layer only.
      if (e.key === "Escape" && !e.defaultPrevented) setDismissed(true);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [listening]);

  const handlePointerEnter = (e: PointerEvent<HTMLDivElement>) => {
    onPointerEnter?.(e);
    setEngaged((s) => ({ ...s, hover: true }));
  };
  // A dismissal lasts until the user leaves the Overlay entirely (WCAG 1.4.13, persistent): the pointer leaving
  // while focus stays inside, or focus leaving while the pointer stays, keeps it.
  useEffect(() => {
    if (!engaged.hover && !engaged.focus) setDismissed(false);
  }, [engaged.hover, engaged.focus]);

  // The plate follows the focused control while the Overlay is dismissed. A control focused in a portal (a menu
  // the action opened) sits outside the root and gets no plate.
  const focused = dismissed ? engaged.focus : null;
  useEffect(() => {
    const node = root.current;
    if (!(focused instanceof HTMLElement) || !node?.contains(focused)) {
      setPlate(null);
      return;
    }
    const place = () => {
      // A focused control removed from the page fires no blur. Treat it as focus leaving, so the dismissal clears.
      if (!focused.isConnected) {
        setEngaged((s) => (s.focus === focused ? { ...s, focus: null } : s));
        return;
      }
      const o = node.getBoundingClientRect();
      const r = focused.getBoundingClientRect();
      setPlate({
        left: r.left - o.left - PLATE,
        top: r.top - o.top - PLATE,
        width: r.width + 2 * PLATE,
        height: r.height + 2 * PLATE,
        radius: (parseFloat(getComputedStyle(focused).borderTopLeftRadius) || 0) + PLATE,
      });
    };
    place();
    // A removed element resizes to zero, so the observer also reports the removal.
    const observer = new ResizeObserver(place);
    observer.observe(node);
    observer.observe(focused);
    return () => observer.disconnect();
  }, [focused]);

  const handlePointerLeave = (e: PointerEvent<HTMLDivElement>) => {
    onPointerLeave?.(e);
    setEngaged((s) => ({ ...s, hover: false, focus: s.focus?.isConnected ? s.focus : null }));
  };
  const handleFocus = (e: FocusEvent<HTMLDivElement>) => {
    onFocus?.(e);
    const target = e.target as Element;
    setEngaged((s) => ({ ...s, focus: target }));
  };
  const handleBlur = (e: FocusEvent<HTMLDivElement>) => {
    onBlur?.(e);
    // A move between two actions inside the Overlay keeps the state. Only focus leaving it clears it.
    if (root.current?.contains(e.relatedTarget as Node | null)) return;
    // Focus that moves into a portal opened from inside (a menu) reaches handleFocus through the React tree, which
    // sets it again before the effect that clears the dismissal runs.
    setEngaged((s) => ({ ...s, focus: null }));
  };

  const handleClick = (e: MouseEvent<HTMLDivElement>) => {
    onClick?.(e);
    // Tap-to-toggle only where hover can't reveal: a coarse (no-hover) pointer, in a mode that relies
    // on hover. `always` is always shown and `focus` reveals on focus, so neither needs the fallback.
    if (showOn === "always" || showOn === "focus") return;
    if (typeof window === "undefined" || !window.matchMedia?.("(hover: none)").matches) return;
    // A tap on a real control activates it — don't hijack that into a scrim toggle.
    if ((e.target as HTMLElement).closest("button, a, [role='button'], input, select, textarea, label")) return;
    setTapped((t) => !t);
  };

  return (
    <div
      ref={setRoot}
      className="rt-ds-overlay"
      data-show-on={showOn}
      data-tapped={tapped ? "true" : undefined}
      data-dismissed={dismissed ? "true" : undefined}
      onClick={handleClick}
      onPointerEnter={handlePointerEnter}
      onPointerLeave={handlePointerLeave}
      onFocus={handleFocus}
      onBlur={handleBlur}
      {...rest}
    >
      {media}
      {plate && (
        <div
          className="rt-ds-overlay-plate"
          data-scrim={scrim}
          aria-hidden="true"
          style={{ left: plate.left, top: plate.top, width: plate.width, height: plate.height, borderRadius: plate.radius }}
        />
      )}
      <div className="rt-ds-overlay-scrim" data-position={position} data-scrim={scrim}>
        {children}
      </div>
    </div>
  );
}
