import { forwardRef, useEffect, useState, type MouseEvent } from "react";
import { Skeleton, Theme } from "@radix-ui/themes";
import { Spinner } from "./Spinner";
import { Tooltip } from "./Tooltip";
import { ImageSquare, X } from "@phosphor-icons/react";
import { IconButton } from "./IconButton";

/* Thumbnail — a 64px square preview for an image attachment ([[thumbnail-preview]] · D16). A prop-driven state machine:
 * skeleton (uploading, no URL yet) · <img> (has src) · a placeholder glyph (no src, or a BROKEN src) ·
 * an upload spinner overlaid on the image while it processes. An optional scrim-backed remove ✕ sits
 * top-right; an optional onClick makes the tile a keyboard-operable open trigger.
 *
 * D16 — THE LOAD-ERROR FIX we BUILD (upstream promised it and shipped nothing): Astryx's
 * `showPlaceholder = !isLoading && !hasSrc` covers a MISSING src only, and its <img> has no onError — so a
 * broken URL shows the browser's default broken-image glyph. Ours adds `onError` → fall back to the
 * placeholder, so a 404 reads as "no image" not "broken page".
 *
 * NORMALIZED (dropped from upstream): `useImageMode` (APCA luminance sampling) + `MediaTheme` (adaptive
 * remove-button contrast) — heavy. Replaced by a scrim-backed remove button: the ✕ sits on a `--ds-scrim`
 * disc inside a permanently-dark `<Theme appearance="dark">` (the scrim is dark in BOTH app modes), so the
 * glyph is always light on the dark disc via the system's own dark-scale --ds-* tokens (no hardcoded
 * white, no per-image sampling). [[overlay-hover-scrim]]'s reveal idiom is not needed here — the remove ✕ is always shown.
 *
 * REUSE: our IconButton + Phosphor X (remove) · Radix Skeleton + System Spinner (loading) · System
 * Tooltip (the `label` tooltip — swapped from the raw primitive once Tooltip ported, the [[tooltip-wrap]] pattern).
 * A fixed 64px box (not AspectRatio — the square is a constant, no ratio math needed). Zero net-new tokens. */

export interface ThumbnailProps {
  /** Ref forwarded to the root group element. */
  ref?: React.Ref<HTMLDivElement>;
  /** Image source. Shows the image on success, or the placeholder on a load error / when absent. */
  src?: string;
  /** Alt text for the image. Required for accessibility when `src` is set. */
  alt?: string;
  /** Accessible label (e.g. a file name) — the group's accessible name, the remove ✕'s name, and the
   *  hover tooltip. Not rendered as visible text. */
  label?: string;
  /** When set, an overlaid remove ✕ appears top-right. */
  onRemove?: (e: MouseEvent) => void;
  /** When set, the tile becomes a keyboard-operable open trigger (a real `<button>`). */
  onClick?: (e: MouseEvent) => void;
  /** Loading state — a skeleton shimmer (no src yet) or an upload spinner over the image (has src). */
  isLoading?: boolean;
  /** Disabled — dims the tile and removes the remove ✕ / open affordance. */
  isDisabled?: boolean;
  /** Override the remove ✕ accessible name (defaults to `Remove {accessible name}`). */
  removeLabel?: string;
  className?: string;
  "data-testid"?: string;
}

export const Thumbnail = forwardRef<HTMLDivElement, ThumbnailProps>(function Thumbnail(
  {
    src,
    alt,
    label,
    onRemove,
    onClick,
    isLoading = false,
    isDisabled = false,
    removeLabel,
    className,
    "data-testid": testId,
  },
  ref,
) {
  // D16 — a broken src falls back to the placeholder. Reset on every src change so a new URL gets a fresh
  // attempt (a previously-broken tile can recover).
  const [errored, setErrored] = useState(false);
  useEffect(() => {
    setErrored(false);
  }, [src]);

  const hasSrc = src != null;
  const showImage = hasSrc && !errored;
  const showSkeleton = isLoading && !hasSrc;
  const showUploadOverlay = isLoading && showImage;
  // Placeholder covers BOTH "no src, not loading" AND the D16 broken-src fallback.
  const showPlaceholder = !showImage && !showSkeleton;

  const isInteractive = onClick != null && !isDisabled && !isLoading;
  // `alt=""` is the valid HTML idiom for a decorative image, so it must fall THROUGH to the generic name
  // rather than being adopted as one — `??` kept the empty string and left the group (and its remove ✕)
  // with a blank accessible name. `||` skips it, so a tile with neither a label nor a real alt reports
  // "Thumbnail" / "Remove Thumbnail", which is what the docs have always described.
  const accessibleName = label && alt ? `${label} — ${alt}` : label || alt || "Thumbnail";
  const removeName = removeLabel ?? `Remove ${accessibleName}`;

  const imageContent = (
    <>
      {showImage && (
        <img
          className="rt-ds-thumbnail-img"
          src={src}
          alt={alt ?? ""}
          draggable={false}
          onError={() => setErrored(true)}
        />
      )}
      {showSkeleton && <Skeleton width="100%" height="100%" />}
      {showPlaceholder && (
        <span className="rt-ds-thumbnail-placeholder" aria-hidden>
          <ImageSquare size={24} weight="regular" />
        </span>
      )}
    </>
  );

  const tile = (
    <div
      ref={ref}
      role="group"
      aria-label={accessibleName}
      data-testid={testId}
      data-disabled={isDisabled ? "" : undefined}
      className={["rt-ds-thumbnail", className].filter(Boolean).join(" ")}
    >
      <div className="rt-ds-thumbnail-frame">
        {isInteractive ? (
          <button
            type="button"
            className="rt-ds-thumbnail-open"
            aria-label={`Open ${accessibleName}`}
            onClick={onClick}
          >
            {imageContent}
          </button>
        ) : (
          imageContent
        )}

        {/* 1px inset border — only over a real image (the neutral frame already reads bounded otherwise). */}
        {showImage && <span className="rt-ds-thumbnail-border" aria-hidden />}

        {/* Upload spinner over the image while it processes.
            The spinner paints its leaves from `currentColor`, so outside a pinned appearance it
            inherits the page's ink — near-black in light mode — and then sits on the dark
            --ds-scrim disc this element paints. Measured: 1.08:1 at worst against its own scrim,
            where WCAG 1.4.11 wants 3:1 for a non-text indicator. Dark mode was already fine, which
            is why it survived so long.
            THE THEME GOES INSIDE THE SCRIM ELEMENT, NOT AROUND IT, and the nesting is the whole
            point. --ds-scrim is defined per appearance (black-a8 light / black-a11 dark), so a
            wrapper placed ON this span flips the FILL as well as the ink — the disc jumps from 60%
            to 90% black and reads far too dark over light media. Wrapping only the Spinner leaves
            the scrim resolving in the page's own appearance, exactly as before, and changes only
            what was broken. Contrast then comes from the spinner being opaque rather than from a
            darker plate: 4.95:1 worst case, against 3.09:1 if it kept Radix's 0.65 veil. */}
        {showUploadOverlay && (
          <span className="rt-ds-thumbnail-uploading">
            <Theme appearance="dark" hasBackground={false}>
              <Spinner size="2" />
            </Theme>
          </span>
        )}

        {/* Scrim-backed remove ✕ — a permanently-dark Theme so the glyph stays light on the dark disc in
            both app modes. A SIBLING of the open button (never nested), so removal + open coexist. */}
        {onRemove != null && !isDisabled && (
          <Theme appearance="dark" hasBackground={false} className="rt-ds-thumbnail-remove">
            <IconButton
              priority="tertiary"
              size="1"
              radius="full"
              aria-label={removeName}
              className="rt-ds-thumbnail-removebtn"
              onClick={(e) => {
                e.stopPropagation();
                onRemove(e);
              }}
            >
              <X size={14} weight="bold" />
            </IconButton>
          </Theme>
        )}
      </div>
    </div>
  );

  // The label is the tooltip content (also the group name + remove-✕ name). Raw Radix Tooltip ([[component-registry]]).
  return label != null ? <Tooltip content={label}>{tile}</Tooltip> : tile;
});
