// Copyright (c) Meta Platforms, Inc. and affiliates.
// Portions derived from facebook/astryx packages/core/src/Outline/useOutlineFromDOM.ts @ d7c9a39b (MIT, © Meta Platforms)
//
// The DOM-driven Outline source (DECISIONS [[catalog-as-specification]], D6). Scans a container for
// `h1`–`h6` (or `[data-outline-heading]`), builds `{ id, text, level }[]`, ensures each heading has
// an id (deriving a unique slug when missing), and re-scans on a `MutationObserver`. SSR-safe: the
// scan runs in an effect, never during render.
//
// The pure slug logic (`slugify` / `uniqueSlug` / `levelForElement`) is extracted for the node lane
// (useOutlineFromDOM.logic.test.ts); the scan + observer are the DOM half.

import { useEffect, useState } from "react";

/** One entry in a document outline. */
export interface OutlineItem {
  /** The heading's id (existing, or a slug this hook assigned). */
  id: string;
  /** The heading's trimmed text content. */
  text: string;
  /** Heading level 1–6 (from the tag, or a `data-outline-level` on a `[data-outline-heading]`). */
  level: number;
}

/** Selector for the headings an outline is built from. */
const HEADING_SELECTOR = "h1, h2, h3, h4, h5, h6, [data-outline-heading]";

/**
 * Slugify heading text into an id-safe token: lower-cased, non-word characters dropped, runs of
 * whitespace/underscores collapsed to single hyphens, leading/trailing hyphens trimmed. Pure.
 */
export function slugify(text: string): string {
  return text
    .trim()
    .toLowerCase()
    .replace(/[^\w\s-]/g, "") // drop punctuation/symbols, keep word chars, whitespace, hyphen
    .replace(/[\s_]+/g, "-") // whitespace + underscores → hyphen
    .replace(/-+/g, "-") // collapse repeats
    .replace(/^-+|-+$/g, ""); // trim edge hyphens
}

/**
 * Ensure a slug is unique within a `used` set, appending `-1`, `-2`, … on collisions (and adding the
 * chosen slug to the set). An empty base falls back to `"section"`. Pure — the DOM scan threads one
 * `used` set through the headings so assigned ids never collide.
 */
export function uniqueSlug(base: string, used: Set<string>): string {
  const stem = base || "section";
  let candidate = stem;
  let n = 1;
  while (used.has(candidate)) {
    candidate = `${stem}-${n++}`;
  }
  used.add(candidate);
  return candidate;
}

/** The heading level (1–6) for an element: its `<hN>` tag, or a `data-outline-level` override,
 * clamped to 1–6 and defaulting to 1. Pure over a minimal `{ tagName, dataset }` shape. */
export function levelForElement(el: { tagName: string; dataset?: { outlineLevel?: string } }): number {
  const attr = el.dataset?.outlineLevel;
  if (attr != null && attr !== "") {
    const parsed = parseInt(attr, 10);
    if (Number.isFinite(parsed)) return Math.min(6, Math.max(1, parsed));
  }
  const match = /^h([1-6])$/i.exec(el.tagName);
  return match ? parseInt(match[1], 10) : 1;
}

export interface UseOutlineFromDOMOptions {
  /** Re-scan when the container's subtree changes. @default true */
  observe?: boolean;
}

/**
 * Build a live outline from the headings inside `containerRef`. Assigns a slug id to any heading
 * lacking one, and re-scans on DOM mutations (`MutationObserver`). Returns the `OutlineItem[]`.
 * SSR-safe — the scan is effect-only, so the server renders an empty outline and the client fills it
 * after mount.
 */
export function useOutlineFromDOM<T extends HTMLElement = HTMLElement>(
  containerRef: React.RefObject<T | null>,
  options: UseOutlineFromDOMOptions = {},
): OutlineItem[] {
  const { observe = true } = options;
  const [items, setItems] = useState<OutlineItem[]>([]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container || typeof window === "undefined") return;

    let frame = 0;

    const scan = () => {
      frame = 0;
      // Seed `used` with EVERY id in the document (not only container headings) so a generated heading id
      // can never collide with an unrelated element's id — a collision would make document.getElementById
      // (used by the scroll-spy + anchor links) resolve to the wrong element.
      const used = new Set(
        Array.from(container.ownerDocument.querySelectorAll<HTMLElement>("[id]"), (el) => el.id),
      );
      const headings = Array.from(container.querySelectorAll<HTMLElement>(HEADING_SELECTOR));

      const next: OutlineItem[] = headings.map((el) => {
        const text = (el.textContent ?? "").trim();
        if (!el.id) el.id = uniqueSlug(slugify(text), used);
        return { id: el.id, text, level: levelForElement(el) };
      });

      setItems((prev) => (sameOutline(prev, next) ? prev : next));
    };

    scan();

    let observer: MutationObserver | null = null;
    if (observe) {
      observer = new MutationObserver(() => {
        // Coalesce bursts of mutations into one rescan per frame.
        if (frame) return;
        frame = window.requestAnimationFrame(scan);
      });
      // Also observe the relevant ATTRIBUTES so an id / level / heading-marker change re-scans (not just
      // structural + text changes). The scan only assigns ids to headings that lack one, so the id it sets
      // triggers at most one extra (idempotent) rescan — no observer feedback loop.
      observer.observe(container, {
        childList: true,
        subtree: true,
        characterData: true,
        attributes: true,
        attributeFilter: ["id", "data-outline-heading", "data-outline-level"],
      });
    }

    return () => {
      if (frame) window.cancelAnimationFrame(frame);
      observer?.disconnect();
    };
  }, [containerRef, observe]);

  return items;
}

/** Shallow structural equality so a rescan that finds no change keeps the same array reference. */
function sameOutline(a: OutlineItem[], b: OutlineItem[]): boolean {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) {
    if (a[i].id !== b[i].id || a[i].text !== b[i].text || a[i].level !== b[i].level) return false;
  }
  return true;
}
