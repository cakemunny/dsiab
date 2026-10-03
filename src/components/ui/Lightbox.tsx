// Copyright (c) Meta Platforms, Inc. and affiliates.
// Portions derived from facebook/astryx packages/core/src/Lightbox/Lightbox.tsx @ 88c95e4 (MIT, © Meta Platforms)
import {
  forwardRef,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
  type MouseEvent as ReactMouseEvent,
  type ReactNode,
} from "react";
import { Dialog, Theme } from "@radix-ui/themes";
import { CaretLeft, CaretRight, X } from "@phosphor-icons/react";
import { IconButton } from "./IconButton";
import { useAnnounce } from "./useAnnounce";
import { useReturnFocus } from "./useReturnFocus";

/* Lightbox — a fullscreen media viewer with single + gallery modes ([[lightbox-viewer]] · D18). Single image or a gallery
 * with prev/next nav, a "N / M" counter, captions, and optional zoom/pan.
 *
 * D18 — SWAP native <dialog>+showModal() → RAW Radix Themes Dialog (the AlertDialog.tsx thin-wrapper
 * pattern; System/Dialog is status:planned → [[component-registry]] agent-gap). Radix Dialog gives focus-trap + scroll-lock +
 * Escape + backdrop-dismiss FOR FREE, so upstream's useScrollLock is DROPPED. Close-focus is NOT free:
 * Radix restores to a registered `Dialog.Trigger`, and a viewer opened from `isOpen` registers none, so
 * `useReturnFocus` supplies it ([[focus-return-on-close]]). Modal enter/exit motion is INHERITED from the [[toast-feedback-tier]] .rt-BaseDialogContent /
 * .rt-BaseDialogOverlay bindings — NO per-component override. The backdrop paints from --ds-scrim.
 *
 * D18 — ADD keyboard zoom: upstream's handleKeyDown does ArrowLeft/Right only (zoom is double-click-only,
 * an a11y gap). Ours adds +/= (zoom in), - (zoom out), 0 (reset). Zoom/pan is disabled for video.
 *
 * D18 — the doc-omitted defaultIndex (uncontrolled start) + hasAutoPlay (video) are documented + wired.
 *
 * Controls sit in a permanently-dark <Theme> so their glyphs + the counter/caption read light on the dark
 * stage in both app modes (the scrim-surface idiom, shared with Thumbnail). Announce via OUR useAnnounce
 * (polite "{alt}, N of M"), fired ONLY on an in-session index change — not on mount/open/close. Reuses our
 * IconButton + Phosphor glyphs. Zero net-new tokens; scoped .radix-themes; no !important. */

export type LightboxMediaType = "image" | "video";

export interface LightboxMedia {
  /** Media source URL. */
  src: string;
  /** Alt text (also the video aria-label + the dialog name). */
  alt: string;
  /** Optional caption below the media. */
  caption?: ReactNode;
  /** Media type. Zoom/pan is disabled for video. @default "image" */
  type?: LightboxMediaType;
}

export interface LightboxProps {
  /** Ref forwarded to the Dialog content element. */
  ref?: React.Ref<HTMLDivElement>;
  /** Whether the lightbox is open. */
  isOpen: boolean;
  /** Called with `false` on Escape, backdrop click, or the close button. */
  onOpenChange: (isOpen: boolean) => void;
  /** A single item, or an array for gallery mode with prev/next navigation. */
  media: LightboxMedia | LightboxMedia[];
  /** Current gallery index — provide to control the component. */
  index?: number;
  /** Initial index for uncontrolled gallery usage. @default 0 */
  defaultIndex?: number;
  /** Called when the gallery index changes via prev/next. */
  onIndexChange?: (index: number) => void;
  /** Enable zoom (double-click or +/-/0; images only). Drag to pan when zoomed. @default false */
  hasZoom?: boolean;
  /** Autoplay video when the lightbox opens. @default false */
  hasAutoPlay?: boolean;
}

export const Lightbox = forwardRef<HTMLDivElement, LightboxProps>(function Lightbox(
  { isOpen, onOpenChange, media, index: controlledIndex, defaultIndex = 0, onIndexChange, hasZoom = false, hasAutoPlay = false },
  ref,
) {
  // Index state (controlled + uncontrolled).
  const isControlled = controlledIndex !== undefined;
  const [uncontrolledIndex, setUncontrolledIndex] = useState(defaultIndex);
  const index = isControlled ? controlledIndex : uncontrolledIndex;

  const setIndex = useCallback(
    (value: number) => {
      if (!isControlled) setUncontrolledIndex(value);
      onIndexChange?.(value);
    },
    [isControlled, onIndexChange],
  );

  // Zoom / pan state.
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const dragStartRef = useRef({ x: 0, y: 0, panX: 0, panY: 0 });

  const mediaArray = useMemo(() => (Array.isArray(media) ? media : [media]), [media]);
  const isGallery = mediaArray.length > 1;
  const currentItem = mediaArray.length > 0 ? mediaArray[Math.min(index, mediaArray.length - 1)] : null;
  const isVideo = (currentItem?.type ?? "image") === "video";
  const canPrev = isGallery && index > 0;
  const canNext = isGallery && index < mediaArray.length - 1;

  // Reset zoom/pan on media change.
  useEffect(() => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
  }, [index, currentItem?.src]);

  // Announce gallery navigation politely — only when the index changes during an already-open session
  // (not on mount/open/close; the dialog's aria-label already names the current image on open).
  const announce = useAnnounce();
  // Radix restores close-focus to a `Dialog.Trigger`; this viewer opens from `isOpen` and registers none.
  const returnFocus = useReturnFocus();
  const prevIndexRef = useRef(index);
  const wasOpenRef = useRef(isOpen);
  useEffect(() => {
    const indexChanged = prevIndexRef.current !== index;
    const wasOpen = wasOpenRef.current;
    prevIndexRef.current = index;
    wasOpenRef.current = isOpen;
    if (!indexChanged || !isOpen || !wasOpen) return;
    const item = mediaArray[Math.min(index, mediaArray.length - 1)];
    const position = `${index + 1} of ${mediaArray.length}`;
    announce(item?.alt ? `${item.alt}, ${position}` : `Image ${position}`);
  }, [index, isOpen, announce, mediaArray]);

  const goToPrev = useCallback(() => {
    if (canPrev) setIndex(index - 1);
  }, [canPrev, index, setIndex]);
  const goToNext = useCallback(() => {
    if (canNext) setIndex(index + 1);
  }, [canNext, index, setIndex]);

  // Zoom helpers (double-click toggles 1↔2; keyboard +/-/0). Reset pan on every zoom change.
  const zoomIn = useCallback(() => {
    if (hasZoom && !isVideo) {
      setZoom(2);
      setPan({ x: 0, y: 0 });
    }
  }, [hasZoom, isVideo]);
  const zoomOut = useCallback(() => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
  }, []);
  const handleDoubleClick = useCallback(() => {
    if (!hasZoom || isVideo) return;
    if (zoom === 1) zoomIn();
    else zoomOut();
  }, [hasZoom, isVideo, zoom, zoomIn, zoomOut]);

  // Keyboard: arrows navigate the gallery; +/-/0 zoom (D18 addition). Escape is left to Radix Dialog.
  const handleKeyDown = useCallback(
    (e: ReactKeyboardEvent) => {
      if (e.key === "ArrowLeft") {
        e.preventDefault();
        goToPrev();
      } else if (e.key === "ArrowRight") {
        e.preventDefault();
        goToNext();
      } else if (hasZoom && !isVideo && (e.key === "+" || e.key === "=")) {
        e.preventDefault();
        zoomIn();
      } else if (hasZoom && !isVideo && (e.key === "-" || e.key === "_")) {
        e.preventDefault();
        zoomOut();
      } else if (hasZoom && !isVideo && e.key === "0") {
        e.preventDefault();
        zoomOut();
      }
    },
    [goToPrev, goToNext, hasZoom, isVideo, zoomIn, zoomOut],
  );

  // Pan: pointer drag when zoomed.
  const handlePointerDown = useCallback(
    (e: ReactMouseEvent<HTMLDivElement>) => {
      if (zoom <= 1 || !hasZoom || isVideo) return;
      setIsDragging(true);
      dragStartRef.current = { x: e.clientX, y: e.clientY, panX: pan.x, panY: pan.y };
    },
    [zoom, hasZoom, isVideo, pan],
  );

  useEffect(() => {
    if (!isDragging) return;
    const move = (e: PointerEvent) => {
      const dx = e.clientX - dragStartRef.current.x;
      const dy = e.clientY - dragStartRef.current.y;
      setPan({ x: dragStartRef.current.panX + dx, y: dragStartRef.current.panY + dy });
    };
    const up = () => setIsDragging(false);
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
    return () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
    };
  }, [isDragging]);

  const isZoomed = zoom > 1;
  const imageTransform = zoom === 1 ? undefined : `scale(${zoom}) translate(${pan.x / zoom}px, ${pan.y / zoom}px)`;

  // Clicking the empty stage area (not the media or a control) closes — Radix's overlay is fully covered
  // by the full-viewport content, so we reproduce the backdrop-dismiss here.
  const handleStageClick = useCallback(
    (e: ReactMouseEvent<HTMLDivElement>) => {
      if (e.target === e.currentTarget) onOpenChange(false);
    },
    [onOpenChange],
  );

  if (!currentItem) return null;

  return (
    <Dialog.Root open={isOpen} onOpenChange={onOpenChange}>
      <Dialog.Content
        ref={ref}
        aria-label={currentItem.alt || "Media viewer"}
        aria-describedby={undefined}
        className="rt-ds-lightbox"
        onKeyDown={handleKeyDown}
        onOpenAutoFocus={returnFocus.onOpenAutoFocus}
        onCloseAutoFocus={returnFocus.onCloseAutoFocus}
      >
        <Theme appearance="dark" hasBackground={false} className="rt-ds-lightbox-theme">
          <div className="rt-ds-lightbox-stage" onClick={handleStageClick}>
            {/* Close */}
            <div className="rt-ds-lightbox-close">
              <IconButton priority="tertiary" radius="full" aria-label="Close" className="rt-ds-lightbox-control" onClick={() => onOpenChange(false)}>
                <X weight="bold" />
              </IconButton>
            </div>

            {/* Counter */}
            {isGallery && (
              <div className="rt-ds-lightbox-counter" aria-hidden>
                {index + 1} / {mediaArray.length}
              </div>
            )}

            {/* Prev — disabled (not unmounted) at the start so focus never drops to <body>. */}
            {isGallery && (
              <div className="rt-ds-lightbox-nav rt-ds-lightbox-nav-prev">
                <IconButton priority="tertiary" radius="full" aria-label="Previous" className="rt-ds-lightbox-control" disabled={!canPrev} onClick={goToPrev}>
                  <CaretLeft weight="bold" />
                </IconButton>
              </div>
            )}

            {/* Media + caption */}
            <div className="rt-ds-lightbox-media">
              <div
                className="rt-ds-lightbox-viewport"
                data-zoomable={!isVideo && hasZoom && !isZoomed ? "" : undefined}
                data-zoomed={!isVideo && isZoomed ? "" : undefined}
                data-dragging={!isVideo && isDragging ? "" : undefined}
                onDoubleClick={isVideo ? undefined : handleDoubleClick}
                onPointerDown={isVideo ? undefined : handlePointerDown}
              >
                {isVideo ? (
                  <video className="rt-ds-lightbox-video" src={currentItem.src} aria-label={currentItem.alt} controls autoPlay={hasAutoPlay} />
                ) : (
                  <img
                    className="rt-ds-lightbox-img"
                    src={currentItem.src}
                    alt={currentItem.alt}
                    draggable={false}
                    data-dragging={isDragging ? "" : undefined}
                    style={imageTransform ? { transform: imageTransform } : undefined}
                  />
                )}
              </div>
              {currentItem.caption && <div className="rt-ds-lightbox-caption">{currentItem.caption}</div>}
            </div>

            {/* Next — disabled (not unmounted) at the end. */}
            {isGallery && (
              <div className="rt-ds-lightbox-nav rt-ds-lightbox-nav-next">
                <IconButton priority="tertiary" radius="full" aria-label="Next" className="rt-ds-lightbox-control" disabled={!canNext} onClick={goToNext}>
                  <CaretRight weight="bold" />
                </IconButton>
              </div>
            )}
          </div>
        </Theme>
      </Dialog.Content>
    </Dialog.Root>
  );
});
