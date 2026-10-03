// Copyright (c) Meta Platforms, Inc. and affiliates.
// Portions derived from facebook/astryx packages/core/src/Overlay/Overlay.tsx @ 88c95e4 (MIT, © Meta Platforms)
// Portions derived from facebook/astryx packages/core/src/Overlay/useOverlay.tsx @ 88c95e4 (MIT, © Meta Platforms)

import { type ComponentProps, type MouseEvent, type ReactNode, useState } from "react";

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
 */

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
  ...rest
}: OverlayProps) {
  const [tapped, setTapped] = useState(false);

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
      className="rt-ds-overlay"
      data-show-on={showOn}
      data-tapped={tapped ? "true" : undefined}
      onClick={handleClick}
      {...rest}
    >
      {media}
      <div className="rt-ds-overlay-scrim" data-position={position} data-scrim={scrim}>
        {children}
      </div>
    </div>
  );
}
