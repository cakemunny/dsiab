// Copyright (c) Meta Platforms, Inc. and affiliates.
// Portions derived from facebook/astryx packages/core/src/Typeahead/BaseTypeahead.tsx @ 9daca871 (MIT, © Meta Platforms)

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type Dispatch,
  type KeyboardEvent,
  type ReactNode,
  type SetStateAction,
} from "react";
import type { TypeaheadOption, TypeaheadSource } from "./Typeahead";
import type { AnnouncePoliteness } from "./useAnnounce";

/* useComboboxEngine — the two headless hooks the async ARIA-combobox family shares.
 *
 * EXTRACTED (behavior-preserving) from the flagship `Typeahead` (C-Typeahead, itself a port of Astryx
 * `facebook/astryx @9daca871`), so the SAME engine drives Typeahead (standalone + Tokenizer's embedded
 * mode) AND CommandPalette ([[command-palette]]). The extraction is a pure MOVE: every closure, dep array, ref and timing
 * is Typeahead's current behavior verbatim. The two deltas CommandPalette needs — optimistic substring
 * narrowing and committed-query empty text — are OPT-IN options that DEFAULT OFF, so Typeahead is
 * byte-for-byte unchanged.
 *
 *   • useListboxNavigation — the roving aria-activedescendant machine: highlightedIndex, the
 *     Arrow/Home/End movement (wrap-around), the active-row scrollIntoView, and the getItemId /
 *     aria-activedescendant id scheme. NO letter-jump / type-ahead-to-item path (Typeahead never had one;
 *     this also removes CommandPalette's upstream `hasSearch` wart by construction).
 *   • useAsyncSearch — the async pipeline: the monotonic generation guard (searchGen/resultsGen), the
 *     debounce, the loading / error / empty state derivation (keep-prior-content-visible on refine, a
 *     DISTINCT retryable error), and the useAnnounce parity announcements.
 */

/* ========================================================================== */
/* useListboxNavigation                                                        */
/* ========================================================================== */

export interface ListboxNavigationOptions {
  /** Number of selectable rows (a FLAT count — group headers are not rows, so arrows flow across
   *  group boundaries by construction). */
  itemCount: number;
  /** Stable id root for the option id scheme (`${listboxId}-${idPart}-${i}`). */
  listboxId: string;
  /** Gates the active-row scrollIntoView + the exposed aria-activedescendant (Typeahead: `open`). */
  isActive: boolean;
  /** Suffix in the option id scheme. @default "option" */
  idPart?: string;
  /** Auto-scroll the active row into view on highlight change. CommandPalette's `isInline` docs mode
   *  passes `false` so a mounted specimen never scrolls the page. @default true */
  autoScroll?: boolean;
}

export interface ListboxNavigation {
  highlightedIndex: number;
  setHighlightedIndex: Dispatch<SetStateAction<number>>;
  getItemId: (index: number) => string;
  /** `getItemId(highlightedIndex)` when active with a highlight, else undefined — the input's
   *  `aria-activedescendant`. */
  activeDescendant: string | undefined;
  moveDown: () => void;
  moveUp: () => void;
  moveFirst: () => void;
  moveLast: () => void;
  /** Handles the pure navigation keys (ArrowDown/ArrowUp/Home/End) with the SAME preventDefault
   *  semantics Typeahead's open-branch used: arrows always preventDefault (moving only when there are
   *  rows), Home/End preventDefault + act only when there are rows. Returns true when it consumed the
   *  key — the caller then handles Enter/Escape itself. */
  handleNavigationKeyDown: (e: KeyboardEvent) => boolean;
}

/** The roving aria-activedescendant machine (LIFTED from Typeahead ~248/475-524/542-547). DOM focus
 *  never moves — only the virtual cursor. */
export function useListboxNavigation({
  itemCount,
  listboxId,
  isActive,
  idPart = "option",
  autoScroll = true,
}: ListboxNavigationOptions): ListboxNavigation {
  const [highlightedIndex, setHighlightedIndex] = useState(-1);

  const getItemId = useCallback((index: number) => `${listboxId}-${idPart}-${index}`, [listboxId, idPart]);

  // Wrap-around movers — Typeahead's exact arithmetic (ArrowDown: prev<count-1?prev+1:0; ArrowUp:
  // prev>0?prev-1:count-1; Home:0; End:count-1). Each no-ops when there are no rows.
  const moveDown = useCallback(() => {
    if (itemCount > 0) setHighlightedIndex((prev) => (prev < itemCount - 1 ? prev + 1 : 0));
  }, [itemCount]);
  const moveUp = useCallback(() => {
    if (itemCount > 0) setHighlightedIndex((prev) => (prev > 0 ? prev - 1 : itemCount - 1));
  }, [itemCount]);
  const moveFirst = useCallback(() => {
    if (itemCount > 0) setHighlightedIndex(0);
  }, [itemCount]);
  const moveLast = useCallback(() => {
    if (itemCount > 0) setHighlightedIndex(itemCount - 1);
  }, [itemCount]);

  const handleNavigationKeyDown = useCallback(
    (e: KeyboardEvent): boolean => {
      switch (e.key) {
        case "ArrowDown":
          e.preventDefault();
          moveDown();
          return true;
        case "ArrowUp":
          e.preventDefault();
          moveUp();
          return true;
        case "Home":
          if (itemCount > 0) {
            e.preventDefault();
            moveFirst();
            return true;
          }
          return false;
        case "End":
          if (itemCount > 0) {
            e.preventDefault();
            moveLast();
            return true;
          }
          return false;
        default:
          return false;
      }
    },
    [itemCount, moveDown, moveUp, moveFirst, moveLast],
  );

  // Keep the highlighted row in view during keyboard navigation (fixed-height scroll container) —
  // scrollIntoView({block:"nearest"}), LIFTED from Typeahead.
  useEffect(() => {
    if (!autoScroll || !isActive || highlightedIndex < 0) return;
    document.getElementById(getItemId(highlightedIndex))?.scrollIntoView?.({ block: "nearest" });
  }, [autoScroll, isActive, highlightedIndex, getItemId]);

  const activeDescendant = isActive && highlightedIndex >= 0 ? getItemId(highlightedIndex) : undefined;

  return {
    highlightedIndex,
    setHighlightedIndex,
    getItemId,
    activeDescendant,
    moveDown,
    moveUp,
    moveFirst,
    moveLast,
    handleNavigationKeyDown,
  };
}

/* ========================================================================== */
/* useAsyncSearch                                                              */
/* ========================================================================== */

export interface AsyncSearchOptions<TAux = unknown> {
  source: TypeaheadSource<TAux>;
  /** Cap the rendered result count. */
  maxItems: number;
  /** Debounce (ms) before firing `source.search`; 0 fires synchronously. */
  debounceMs: number;
  /** The singleton live-region announcer (`useAnnounce()`), for parity status announcements. */
  announce: (message: string, politeness?: AnnouncePoliteness) => void;
  /** Distinct error copy (announced on a rejected search). */
  errorText?: ReactNode;
  /** When true, a bootstrap runs for an empty query (else the empty branch of `scheduleQuery` is a
   *  no-op — matches Typeahead's `openOnFocus`). */
  openOnFocus?: boolean;
  /** Move the virtual cursor on resolve (injected from `useListboxNavigation`). */
  setHighlightedIndex: (index: number) => void;
  /** Open the surface on resolve (injected). A no-op for a surface that is always visible
   *  (CommandPalette's dialog owns visibility). */
  emitOpen: (open: boolean) => void;

  // ── OPT-IN deltas (both DEFAULT OFF → Typeahead unchanged) ────────────────────────────────────
  /** Optimistically filter the currently-shown results by the new query substring while the async
   *  source resolves (instant narrowing). OFF = keep prior content visible untouched during refine. */
  optimisticNarrow?: boolean;
  /** Track a `committedQuery` that only advances when results arrive — so a consumer's empty text can
   *  echo the COMMITTED query, not the live one (stable while a no-result search is pending). */
  commitQueryWithResults?: boolean;
  /** Compute the initial highlight after a BOOTSTRAP resolve (CommandPalette highlights a preselected
   *  value; else it stays at -1). Omitted → Typeahead's default (`shown.length > 0 ? 0 : -1`). */
  resolveBootstrapHighlight?: (shown: TypeaheadOption<TAux>[]) => number;
}

export interface AsyncSearchResult<TAux = unknown> {
  results: TypeaheadOption<TAux>[];
  isLoading: boolean;
  hasSearched: boolean;
  hasError: boolean;
  /** The query the on-screen results correspond to (only maintained when `commitQueryWithResults`). */
  committedQuery: string;
  /** The last query a search ran for — Retry / Enter-in-error re-run it unchanged. */
  lastQueryRef: React.RefObject<string>;
  performSearch: (q: string) => Promise<void>;
  performBootstrap: () => Promise<void>;
  /** Debounced trigger: search when non-empty, else bootstrap when `openOnFocus`. */
  scheduleQuery: (next: string) => void;
  /** Clear a pending debounce timer (used by select / clear / close). */
  cancelPending: () => void;
  /** Invalidate any in-flight search: bump the generation + `source.cancel()`. */
  invalidate: () => void;
  /** Clear the async state (results + hasSearched + hasError) WITHOUT touching isLoading — matches the
   *  reset Typeahead's select / clear / close / query-cleared branches performed inline. */
  resetState: () => void;
  /** `resultsGenRef.current === searchGenRef.current` — whether the shown results are current (a
   *  focus re-show gate). */
  isCurrentGeneration: () => boolean;
}

/** The async search pipeline (LIFTED from Typeahead ~247-356). Monotonic generation guard, debounce,
 *  loading/error/empty derivation, keep-prior-content-on-refine, the DISTINCT retryable error, and the
 *  parity announcements. */
export function useAsyncSearch<TAux = unknown>({
  source,
  maxItems,
  debounceMs,
  announce,
  errorText,
  openOnFocus = false,
  setHighlightedIndex,
  emitOpen,
  optimisticNarrow = false,
  commitQueryWithResults = false,
  resolveBootstrapHighlight,
}: AsyncSearchOptions<TAux>): AsyncSearchResult<TAux> {
  const [results, setResults] = useState<TypeaheadOption<TAux>[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [committedQuery, setCommittedQuery] = useState("");

  // The last query a search ran for — Retry (and Enter-in-error) re-run it unchanged.
  const lastQueryRef = useRef("");
  // Monotonic generation counter (adapted from Astryx). Advanced at the START of every search AND on
  // selection / clear / query-reset. Each search captures its generation before awaiting and drops its
  // resolve if the counter has moved on — so a slower/out-of-order search, or an aborted request's
  // rejection, can never clobber a newer search or a selection. resultsGenRef records the generation
  // `results` were last populated at, so a focus re-show can tell cached results are stale.
  const searchGenRef = useRef(0);
  const resultsGenRef = useRef(0);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Cleanup: clear a pending debounce + cancel any in-flight search on unmount.
  useEffect(
    () => () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      source.cancel?.();
    },
    [source],
  );

  const performSearch = useCallback(
    async (q: string) => {
      source.cancel?.();
      const gen = ++searchGenRef.current; // this search's generation — see the searchGenRef note
      lastQueryRef.current = q;
      // Don't clear results/error at the START — keep the prior content visible while the spinner
      // spins (never blank-then-repaint). With optimisticNarrow ON, filter the shown rows by
      // the new query substring for instant narrowing; OFF leaves them untouched. State flips on resolve.
      if (optimisticNarrow && q.length > 0) {
        const lower = q.toLowerCase().trim();
        setResults((prev) => (prev.length === 0 ? prev : prev.filter((item) => item.label.toLowerCase().includes(lower))));
      }
      setIsLoading(true);
      setHasSearched(true);
      if (q.length > 0) announce("Searching…"); // visibility of system status (polite; outcome replaces it)
      try {
        const res = await source.search(q);
        if (searchGenRef.current !== gen) return; // superseded — drop the stale resolve
        resultsGenRef.current = gen;
        const shown = res.slice(0, maxItems);
        setResults(shown);
        if (commitQueryWithResults) setCommittedQuery(q); // commit the query WITH its results
        setHasError(false); // a successful resolve (even zero rows) clears any prior error
        setHighlightedIndex(shown.length > 0 ? 0 : -1);
        // Open for results OR a non-empty query (so the empty state can show); prior results stay
        // visible during a refinement (we never blank-then-repaint).
        if (shown.length > 0 || q.length > 0) emitOpen(true);
        // Announce the outcome only for an active query (never the focus-open) — result count / no-results.
        if (q.length > 0) {
          announce(shown.length === 0 ? `No results for “${q}”` : `${shown.length} result${shown.length === 1 ? "" : "s"}`);
        }
      } catch {
        if (searchGenRef.current !== gen) return;
        // DISTINCT from empty (the flagship fix) — do not swallow into an empty result set; announce
        // the failure as its own status so screen-reader users hear "error", not "0 results".
        setHasError(true);
        setResults([]);
        if (commitQueryWithResults) setCommittedQuery(q);
        setHighlightedIndex(-1);
        emitOpen(true);
        if (q.length > 0) announce(typeof errorText === "string" ? errorText : "Couldn't load results.");
      } finally {
        if (searchGenRef.current === gen) setIsLoading(false);
      }
    },
    [source, maxItems, emitOpen, announce, errorText, optimisticNarrow, commitQueryWithResults, setHighlightedIndex],
  );

  const performBootstrap = useCallback(async () => {
    const gen = ++searchGenRef.current;
    setIsLoading(true);
    try {
      const list = source.bootstrap ? await source.bootstrap() : await source.search("");
      if (searchGenRef.current !== gen) return;
      resultsGenRef.current = gen;
      const shown = list.slice(0, maxItems);
      setResults(shown);
      if (commitQueryWithResults) setCommittedQuery("");
      setHasError(false);
      setHighlightedIndex(resolveBootstrapHighlight ? resolveBootstrapHighlight(shown) : shown.length > 0 ? 0 : -1);
      if (shown.length > 0) emitOpen(true);
    } catch {
      if (searchGenRef.current !== gen) return;
      setHasError(true);
      setResults([]);
      if (commitQueryWithResults) setCommittedQuery("");
      emitOpen(true);
    } finally {
      if (searchGenRef.current === gen) setIsLoading(false);
    }
  }, [source, maxItems, emitOpen, commitQueryWithResults, setHighlightedIndex, resolveBootstrapHighlight]);

  const cancelPending = useCallback(() => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
      debounceRef.current = null;
    }
  }, []);

  const scheduleQuery = useCallback(
    (next: string) => {
      cancelPending();
      const trigger = () => {
        if (next.length > 0) void performSearch(next);
        else if (openOnFocus) void performBootstrap();
      };
      if (debounceMs <= 0) trigger();
      else debounceRef.current = setTimeout(trigger, debounceMs);
    },
    [cancelPending, performSearch, performBootstrap, openOnFocus, debounceMs],
  );

  const invalidate = useCallback(() => {
    searchGenRef.current++;
    source.cancel?.();
  }, [source]);

  const resetState = useCallback(() => {
    setResults([]);
    setHasSearched(false);
    setHasError(false);
  }, []);

  const isCurrentGeneration = useCallback(() => resultsGenRef.current === searchGenRef.current, []);

  return {
    results,
    isLoading,
    hasSearched,
    hasError,
    committedQuery,
    lastQueryRef,
    performSearch,
    performBootstrap,
    scheduleQuery,
    cancelPending,
    invalidate,
    resetState,
    isCurrentGeneration,
  };
}
