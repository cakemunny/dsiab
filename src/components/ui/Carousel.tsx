// Copyright (c) Meta Platforms, Inc. and affiliates.
// Portions derived from facebook/astryx packages/core/src/Carousel/Carousel.tsx @ 88c95e4 (MIT, © Meta Platforms)

import { Children, forwardRef, useCallback, useRef, type ReactNode } from "react";
import { CaretLeft, CaretRight } from "@phosphor-icons/react";
import { IconButton } from "./IconButton";
import { useScrollOverflow, scrollByViewport } from "../../hooks/useScrollOverflow";

/* Carousel — a horizontal scroll container with edge-fade overflow hints + optional prev/next buttons
 * ([[carousel-scroller]] · D19). NOT a slide widget: no index, dots, or autoplay upstream — do not invent them. It's a
 * scroll track that snaps optional items and fades the edges when content runs off-screen.
 *
 * LIFTED logic: useScrollOverflow (src/hooks — reuses our sharedResizeObserver singleton) drives the
 * per-side edge fade + the button enable state; scrollByViewport (also lifted) scrolls ~one viewport with
 * a half-item peek, reduced-motion-aware (behavior: "auto"). NORMALIZED off upstream: its useLayer/Layer
 * top-layer machinery + CSS anchor-positioning (positionArea / anchor-size()) → plain absolutely-
 * positioned buttons inside the position:relative region (no top layer needed on our substrate).
 *
 * a11y: role="region" + aria-roledescription="carousel" + aria-label; the scroll track is tabIndex=0
 * (keyboard-scrollable). Prev/next stay MOUNTED but disabled + opacity-hidden at the range ends (never
 * unmounted — that would drop focus to <body>). Reuses our IconButton + Phosphor carets. Zero net-new
 * tokens; scoped .radix-themes; no !important. */

/** Spacing steps → --ds-space-* tokens. A divergence from Astryx's fractional 0.5/1.5 steps (our
 *  scaling-aware scale has no half-steps); the useful range is covered. */
export type CarouselSpace = 0 | 1 | 2 | 3 | 4 | 5 | 6;
const SPACE_TOKEN: Record<CarouselSpace, string> = {
  0: "var(--ds-space-0)",
  1: "var(--ds-space-4)",
  2: "var(--ds-space-8)",
  3: "var(--ds-space-12)",
  4: "var(--ds-space-16)",
  5: "var(--ds-space-24)",
  6: "var(--ds-space-32)",
};

export interface CarouselProps {
  /** Ref forwarded to the region element. */
  ref?: React.Ref<HTMLDivElement>;
  /** Carousel items — each direct child becomes a snap item in the horizontal scroll track. */
  children: ReactNode;
  /** Gap between items (spacing step → --ds-space-*). @default 2 (8px) */
  gap?: CarouselSpace;
  /** Show prev/next buttons when content is scrollable. @default true */
  hasButtons?: boolean;
  /** Show the gradient edge-fade mask per overflowing side. @default true */
  hasEdgeFade?: boolean;
  /** Enable scroll-snap — each child snaps to the start edge. @default false */
  hasSnap?: boolean;
  /** Inline padding inside the scroll track (spacing step → --ds-space-*), with matching scroll-padding
   *  so snap points align to the content edge. @default undefined (none) */
  padding?: CarouselSpace;
  /** Accessible name for the carousel region. @default "Carousel" */
  "aria-label"?: string;
  className?: string;
  "data-testid"?: string;
}

export const Carousel = forwardRef<HTMLDivElement, CarouselProps>(function Carousel(
  {
    children,
    gap = 2,
    hasButtons = true,
    hasEdgeFade = true,
    hasSnap = false,
    padding,
    "aria-label": ariaLabel = "Carousel",
    className,
    "data-testid": testId,
  },
  ref,
) {
  const trackRef = useRef<HTMLDivElement | null>(null);
  const { scrollRef, overflowStart, overflowEnd } = useScrollOverflow();

  // Compose the hook's ref callback with our own track ref (needed by scrollByViewport).
  const composedRef = useCallback(
    (el: HTMLDivElement | null) => {
      trackRef.current = el;
      scrollRef(el);
    },
    [scrollRef],
  );

  const scroll = useCallback((direction: -1 | 1) => {
    if (trackRef.current) scrollByViewport(trackRef.current, direction);
  }, []);

  const fade = !hasEdgeFade
    ? "none"
    : overflowStart && overflowEnd
      ? "both"
      : overflowStart
        ? "start"
        : overflowEnd
          ? "end"
          : "none";

  const trackStyle = {
    "--ds-carousel-gap": SPACE_TOKEN[gap],
    ...(padding != null ? { "--ds-carousel-pad": SPACE_TOKEN[padding] } : {}),
  } as React.CSSProperties;

  return (
    <div
      ref={ref}
      role="region"
      aria-roledescription="carousel"
      aria-label={ariaLabel}
      data-testid={testId}
      className={["rt-ds-carousel", className].filter(Boolean).join(" ")}
    >
      <div
        ref={composedRef}
        tabIndex={0}
        className="rt-ds-carousel-track"
        data-snap={hasSnap ? "" : undefined}
        data-fade={fade}
        data-padded={padding != null ? "" : undefined}
        style={trackStyle}
      >
        {Children.map(children, (child) => (
          <div className="rt-ds-carousel-item">{child}</div>
        ))}
      </div>

      {hasButtons && (
        <>
          <div className="rt-ds-carousel-nav" data-side="prev" data-hidden={!overflowStart ? "" : undefined}>
            <IconButton
              priority="tertiary"
              radius="full"
              aria-label="Scroll left"
              className="rt-ds-carousel-navbtn"
              disabled={!overflowStart}
              onClick={() => scroll(-1)}
            >
              <CaretLeft weight="bold" />
            </IconButton>
          </div>
          <div className="rt-ds-carousel-nav" data-side="next" data-hidden={!overflowEnd ? "" : undefined}>
            <IconButton
              priority="tertiary"
              radius="full"
              aria-label="Scroll right"
              className="rt-ds-carousel-navbtn"
              disabled={!overflowEnd}
              onClick={() => scroll(1)}
            >
              <CaretRight weight="bold" />
            </IconButton>
          </div>
        </>
      )}
    </div>
  );
});
