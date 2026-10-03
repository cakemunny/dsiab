// Copyright (c) Meta Platforms, Inc. and affiliates.
// Portions derived from facebook/astryx packages/core/src/Lightbox/useLightbox.tsx @ 88c95e4 (MIT, © Meta Platforms)

import { useState, useCallback, useMemo, type KeyboardEvent, type ReactNode } from "react";
import { Lightbox, type LightboxProps, type LightboxMedia } from "./Lightbox";

/* useLightbox — a companion hook that eliminates the isOpen/index boilerplate for Lightbox ([[lightbox-viewer]] · D18).
 * Call open(i) to launch at a gallery index; spread getTriggerProps(i) on a trigger for the a11y wiring
 * (role="button" + aria-haspopup="dialog" + Enter/Space activation). LIFTED from Astryx ([[catalog-as-specification]] @ 88c95e4),
 * swapped onto our Lightbox. */

type LightboxOptions = Omit<
  LightboxProps,
  "isOpen" | "onOpenChange" | "media" | "index" | "defaultIndex" | "onIndexChange" | "ref"
>;

export interface UseLightboxOptions extends LightboxOptions {
  /** Media to display in the lightbox. */
  media: LightboxMedia | LightboxMedia[];
}

interface TriggerProps {
  role: "button";
  tabIndex: 0;
  "aria-haspopup": "dialog";
  onClick: () => void;
  onKeyDown: (e: KeyboardEvent) => void;
}

export interface UseLightboxReturn {
  /** Open the lightbox, optionally at a specific gallery index. */
  open: (index?: number) => void;
  /** Close the lightbox. */
  close: () => void;
  /** Whether the lightbox is currently open. */
  isOpen: boolean;
  /** Current gallery index. */
  index: number;
  /** Render this in your JSX tree. */
  element: ReactNode;
  /** Props to spread on a trigger element for accessibility (opens at index 0). */
  triggerProps: TriggerProps;
  /** Returns trigger props that open at a specific gallery index. */
  getTriggerProps: (index: number) => TriggerProps;
}

/**
 * Hook for lightbox with trigger props + state management.
 *
 * @example
 * const lightbox = useLightbox({ media: photos });
 * {photos.map((p, i) => <img key={p.src} src={p.src} alt={p.alt} {...lightbox.getTriggerProps(i)} />)}
 * {lightbox.element}
 */
export function useLightbox(options: UseLightboxOptions): UseLightboxReturn {
  const { media, ...lightboxProps } = options;
  const [isOpen, setIsOpen] = useState(false);
  const [index, setIndex] = useState(0);

  const open = useCallback((i: number = 0) => {
    setIndex(i);
    setIsOpen(true);
  }, []);
  const close = useCallback(() => setIsOpen(false), []);

  const getTriggerProps = useCallback(
    (i: number): TriggerProps => ({
      role: "button",
      tabIndex: 0,
      "aria-haspopup": "dialog",
      onClick: () => open(i),
      onKeyDown: (e: KeyboardEvent) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          open(i);
        }
      },
    }),
    [open],
  );

  const triggerProps = useMemo(() => getTriggerProps(0), [getTriggerProps]);

  const element = (
    <Lightbox
      isOpen={isOpen}
      onOpenChange={(nextOpen) => {
        if (!nextOpen) setIsOpen(false);
      }}
      media={media}
      index={index}
      onIndexChange={setIndex}
      {...lightboxProps}
    />
  );

  return { open, close, isOpen, index, element, triggerProps, getTriggerProps };
}
