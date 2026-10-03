// Copyright (c) Meta Platforms, Inc. and affiliates.
// Portions derived from facebook/astryx packages/core/src/utils/sharedResizeObserver.ts @ 88c95e4 (MIT, © Meta Platforms)

/* sharedResizeObserver — a lazily-created singleton ResizeObserver plus a Map<Element, callback>, so N
 * components share ONE observer (one callback dispatch per frame) instead of N. LIFTED from Astryx
 * (facebook/astryx `@astryxdesign/core` v0.1.4, commit 88c95e4,
 * `packages/core/src/utils/sharedResizeObserver.ts`) under the port doctrine (DECISIONS [[catalog-as-specification]]), adapted to
 * our naming — the algorithm is byte-faithful. Consumed by `useOverflow` (OverflowList's engine). */

type ResizeCallback = (entry: ResizeObserverEntry) => void;

let observer: ResizeObserver | null = null;
const callbacks = new Map<Element, ResizeCallback>();

function getObserver(): ResizeObserver {
  if (!observer) {
    observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const cb = callbacks.get(entry.target);
        if (cb) cb(entry);
      }
    });
  }
  return observer;
}

/**
 * Observe an element's size via the shared ResizeObserver singleton.
 *
 * Fires `callback` once SYNCHRONOUSLY on registration (with a synthetic `{ target }` entry) so callers
 * get an initial measurement without duplicating their logic outside the observer path. Subsequent
 * callbacks fire on real resizes. Call `unobserveResize` when the element unmounts.
 */
export function observeResize(element: Element, callback: ResizeCallback): void {
  callbacks.set(element, callback);
  getObserver().observe(element);

  // Fire once immediately so callers get an initial measurement without a separate code path.
  const entry: Partial<ResizeObserverEntry> = { target: element };
  callback(entry as ResizeObserverEntry);
}

/**
 * Stop observing an element. When the last element is unobserved the singleton is disconnected and
 * NULLED, so a later `observeResize` re-creates a fresh observer.
 */
export function unobserveResize(element: Element): void {
  callbacks.delete(element);
  if (observer) {
    observer.unobserve(element);
    if (callbacks.size === 0) {
      observer.disconnect();
      observer = null;
    }
  }
}
