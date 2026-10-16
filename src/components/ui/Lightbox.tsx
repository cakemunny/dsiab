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
import { LightboxPanPad, PAN_KEYS, PAN_STEPS_TO_EDGE, type PanDirection, useLayoutLetters } from "./lightboxPan";
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
 * IconButton + Phosphor glyphs. Zero net-new tokens; scoped .radix-themes; no !important.
 *
 * PAN WITHOUT A DRAG lives in lightboxPan.tsx ([[dragging-movement-gaps]]). */

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
  /** Enable zoom (double-click or +/-/0; images only). While zoomed, drag, the keypad or W A S D pans. @default false */
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
  const imageRef = useRef<HTMLImageElement>(null);
  // How far the image can move from the centre on each axis before an edge of the image reaches the edge of the
  // viewport. It follows the image's displayed size, which changes with the window.
  const [panLimit, setPanLimit] = useState({ x: 0, y: 0 });
  const letters = useLayoutLetters(isOpen && hasZoom);

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

  const isZoomed = zoom > 1;
  const canPan = hasZoom && !isVideo && isZoomed;
  useEffect(() => {
    const image = imageRef.current;
    if (!canPan || !image) return;
    const measure = () =>
      setPanLimit({ x: (image.offsetWidth * (zoom - 1)) / 2, y: (image.offsetHeight * (zoom - 1)) / 2 });
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(image);
    return () => observer.disconnect();
  }, [canPan, zoom]);

  // "Pan up" shows more of the top of the image, so the image itself moves down.
  const atEdge: Record<PanDirection, boolean> = {
    up: pan.y >= panLimit.y - 0.5,
    down: pan.y <= -panLimit.y + 0.5,
    left: pan.x >= panLimit.x - 0.5,
    right: pan.x <= -panLimit.x + 0.5,
  };
  const panBy = useCallback(
    (dir: PanDirection) => {
      const clamp = (v: number, limit: number) => Math.max(-limit, Math.min(limit, v));
      const sx = panLimit.x / PAN_STEPS_TO_EDGE;
      const sy = panLimit.y / PAN_STEPS_TO_EDGE;
      setPan((p) => ({
        x: clamp(p.x + (dir === "left" ? sx : dir === "right" ? -sx : 0), panLimit.x),
        y: clamp(p.y + (dir === "up" ? sy : dir === "down" ? -sy : 0), panLimit.y),
      }));
    },
    [panLimit],
  );

  // Keyboard: arrows navigate the gallery; +/-/0 zoom (D18 addition); W A S D pan while zoomed. Escape is left to
  // Radix Dialog.
  const handleKeyDown = useCallback(
    (e: ReactKeyboardEvent) => {
      const panKey = canPan && !e.ctrlKey && !e.metaKey && !e.altKey ? PAN_KEYS.find((k) => k.code === e.code) : undefined;
      if (panKey) {
        e.preventDefault();
        panBy(panKey.dir);
      } else if (e.key === "ArrowLeft") {
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
    [canPan, panBy, goToPrev, goToNext, hasZoom, isVideo, zoomIn, zoomOut],
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
                    ref={imageRef}
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

            {/* Pan keypad — only while an image is zoomed. Each key names its action and the letter that does the same. */}
            {canPan && (
              <LightboxPanPad letters={letters} atEdge={atEdge} onPan={panBy} />
            )}

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
