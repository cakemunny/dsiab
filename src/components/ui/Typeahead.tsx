// Copyright (c) Meta Platforms, Inc. and affiliates.
// Portions derived from facebook/astryx packages/core/src/Typeahead/Typeahead.tsx @ 9daca871 (MIT, © Meta Platforms)
// Portions derived from facebook/astryx packages/core/src/Typeahead/BaseTypeahead.tsx @ 9daca871 (MIT, © Meta Platforms)
// Portions derived from facebook/astryx packages/core/src/Typeahead/createStaticSource.ts @ 9daca871 (MIT, © Meta Platforms)

import {
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
  type FocusEvent,
  type KeyboardEvent,
  type ReactNode,
  type Ref,
  type RefObject,
} from "react";
import * as Popover from "@radix-ui/react-popover";
import { Flex, Spinner, Text, Theme, TextField as RadixTextField } from "@radix-ui/themes";
import { MagnifyingGlass, WarningCircle, X } from "@phosphor-icons/react";
import { useResolvedSize } from "../../theme/SizeContext";
import { Field, useOptionalFieldControl } from "./Field";
import { Button } from "./Button";
import { IconButton } from "./IconButton";
import { useAnnounce } from "./useAnnounce";
import { useAsyncSearch, useListboxNavigation } from "./useComboboxEngine";

// Dev-only accessibility warnings, resolved once at module load. A `try` rather than
// `typeof process !== "undefined" && …`: a bundler replaces the LITERAL `process.env.NODE_ENV`
// without defining a `process` global, so the typeof form reads "undefined" and silences the
// warning in exactly the dev build it exists for (measured here: typeof process = "undefined",
// literal replaced with "test"). The catch fires only when NOTHING replaced the literal and no
// `process` exists — the browser bundle that used to throw a ReferenceError — and stays silent.
const DEV_WARN = (() => {
  try {
    return process.env.NODE_ENV !== "production";
  } catch {
    return false;
  }
})();

/* Typeahead — an async, type-to-search ARIA combobox (single select) on the shared Field shell.
 *
 * Ported from Astryx (facebook/astryx `@astryxdesign/core` v0.1.4, commit 9daca871) onto our system
 * (DECISIONS [[catalog-as-specification]]/[[headless-primitives-declared]]). Deltas from the source, per the Wave-1 plan:
 *   • Radix `@radix-ui/react-popover` replaces Astryx's native-popover `usePopover` (so the source's
 *     pointerdown light-dismiss race is NOT carried — it is native-`popover="auto"`-specific; Radix's
 *     controlled `open` + `Popover.Anchor` don't hit it).
 *   • The input rides Radix `TextField.Root`, so the accent-aware `[data-validation]` paint + accent
 *     focus ring + affix slots are reused (never re-implemented) — Rule 11 / DECISIONS [[field-shell]]/[[field-shell-adoption]]/[[focus-ring]].
 *   • The swallowed-error `catch { setResults([]) }` is replaced by a DISTINCT, actionable error state
 *     (errorText + Retry, and Enter re-runs the last query) — a network failure must never read as
 *     "zero matches" (the flagship's headline fix).
 *   • Empty echoes the query ("No results for …") — a muted line, not a nuclear "clear search" button
 *     (editing is the natural recovery in a combobox, and the clear ✕ lives in the affix).
 *   • Token-chip edit mode and the `disabledMessage` tooltip are DEFERRED (named parks — see the plan).
 *   • Size pins OUR default via `useResolvedSize("control")` (small), never Astryx's `md` (R10).
 *
 * LIFTED verbatim-in-spirit (with attribution): the monotonic async-generation guard
 * (searchGenRef/resultsGenRef), the aria-activedescendant keyboard machine ([[one-accent]]), and the singleton
 * live-region announcer ([[one-accent]]).
 *
 * ENGINE EXTRACTION ([[command-palette]]): the async-search pipeline and the roving aria-activedescendant machine now
 * live in `useComboboxEngine.ts` (`useAsyncSearch` + `useListboxNavigation`) so CommandPalette rides the
 * SAME engine. The extraction is behavior-preserving — Typeahead passes NEITHER opt-in delta, so its
 * observable behavior is unchanged (verified by the full play suite + Tokenizer's embedded-mode suite).
 */

type Size = "1" | "2" | "3";
type Validation = { tone: "error" | "warning" | "success" | "info"; message: ReactNode };
// The shape Radix Popover's `virtualRef` measures against — a DOM element already satisfies it, so an
// embedded host's surface ref can anchor the popover without rendering a Popover.Anchor element.
type Measurable = { getBoundingClientRect(): DOMRect };
// The exact attribute subset an embedded host injects onto the input (kept narrow — a broad
// InputHTMLAttributes spread would clobber the explicit `size` / `value` types on TextField.Root).
type EmbeddedControlProps = {
  readOnly?: boolean;
  "aria-disabled"?: boolean | "true" | "false";
  "aria-describedby"?: string;
  "aria-invalid"?: boolean | "true" | "false";
};

/** One option. `id` is REQUIRED in our port (drops Astryx's id-less fallback + its `getKey` util —
 *  our key/selection equality is `id`). `element` is optional custom row content; `renderOption`
 *  overrides it. `auxiliaryData` is the consumer's payload, carried back on `onValueChange`. */
export interface TypeaheadOption<TAux = unknown> {
  id: string;
  label: string;
  element?: ReactNode;
  auxiliaryData?: TAux;
}

/** The async option source — the consumer owns ALL filtering; the component never filters.
 *  `search(query)` returns the matches; `bootstrap()` (optional) seeds the initial list for
 *  `openOnFocus` (falls back to `search("")`); `cancel()` (optional) aborts an in-flight request
 *  when superseded or the panel closes. */
export interface TypeaheadSource<TAux = unknown> {
  search(query: string): Promise<TypeaheadOption<TAux>[]> | TypeaheadOption<TAux>[];
  bootstrap?(): Promise<TypeaheadOption<TAux>[]> | TypeaheadOption<TAux>[];
  cancel?(): void;
}

export interface TypeaheadProps<TAux = unknown> {
  /** The async option source: `{ search(query), bootstrap?(), cancel?() }`. Owns all filtering. */
  source: TypeaheadSource<TAux>;
  /** Controlled selected option (or null). */
  value?: TypeaheadOption<TAux> | null;
  /** Uncontrolled initial selection. */
  defaultValue?: TypeaheadOption<TAux> | null;
  onValueChange?: (value: TypeaheadOption<TAux> | null) => void;
  /** Custom row renderer; overrides `option.element` / `option.label`. */
  renderOption?: (option: TypeaheadOption<TAux>) => ReactNode;
  /** Open the panel (bootstrap / `search("")`) when the input gains focus. @default false */
  openOnFocus?: boolean;
  /** Cap the rendered result count. @default 10 */
  maxItems?: number;
  /** Copy shown after a search returns zero rows (gated on a completed search); `undefined` echoes
   *  the query ("No results for …"). */
  emptyText?: ReactNode;
  /** Copy shown when a search REJECTS — distinct from empty, paired with a Retry affordance. @default "Couldn't load results." */
  errorText?: ReactNode;
  /** A clear ✕ appears while a value/query is present. @default true */
  clearable?: boolean;
  /** Leading identification glyph in the input (mirrors Select's `icon`). `undefined` shows a search
   *  glyph (Typeahead's identity IS search); pass `null` to remove it, or a node to override. */
  icon?: ReactNode;
  /** Placeholder while empty. */
  placeholder?: string;
  size?: Size;
  disabled?: boolean;
  /** Debounce (ms) before firing `source.search`; set 0 for synchronous/local sources. @default 150 */
  debounceMs?: number;
  onOpenChange?: (open: boolean) => void;
  onQueryChange?: (query: string) => void;
  /** Field label — pass none of label/description/validation to keep the control bare. */
  label?: ReactNode;
  info?: ReactNode;
  endSlot?: ReactNode;
  /** Persistent helper line under the input — calm guidance that holds in any validation state. */
  description?: ReactNode;
  validation?: Validation;
  /** Accessible name for a BARE Typeahead (no `label`). One of `label` / `aria-label` /
   *  `aria-labelledby` is required — a nameless combobox fails WCAG 4.1.2 (`placeholder` is not a name). */
  "aria-label"?: string;
  "aria-labelledby"?: string;

  // ── EMBEDDED / TRANSIENT mode (used by Tokenizer B3, [[tokenizer-input]]) ────────────────────────────────────────
  // All default undefined/false → standalone behaviour is untouched. Together they let a host (Tokenizer)
  // drive Typeahead's engine as a TRANSIENT combobox inside the host's OWN Field + surface.
  /** Render the input CHROME-LESS (no own border/background/focus ring — the host paints the surface +
   *  ring) and make selection TRANSIENT: on select, fire `onValueChange` and RESET the query to empty
   *  (the host keeps `value` null and appends its own token). The popover anchors to `anchorRef`. */
  embedded?: boolean;
  /** The external positioning anchor for the popover in `embedded` mode — the host surface (chip row +
   *  input), so the dropdown spans the whole field. Passed as the Popover `virtualRef`. */
  anchorRef?: RefObject<HTMLElement | null>;
  /** Forwarded to the underlying `<input>` — embedded hosts need the node for focus + caret checks. */
  inputRef?: Ref<HTMLInputElement>;
  /** Extra keydown handler on the input, run BEFORE Typeahead's own (embedded hosts intercept
   *  Backspace-on-empty / Shift+Tab). If it calls `preventDefault`, Typeahead's own keydown is skipped. */
  onInputKeyDown?: (e: KeyboardEvent<HTMLInputElement>) => void;
  /** Collapse the input to a focusable sliver (embedded, at a host's cap) — it stays in the tab order. */
  inputCollapsed?: boolean;
  /** Extra attributes merged onto the `<input>` — embedded hosts inject D8 soft-disable
   *  (`readOnly` + `aria-disabled`) and a merged `aria-describedby`. */
  controlProps?: EmbeddedControlProps;
}

/** Create a search source from a static array — the only place client-side filtering lives (the
 *  component itself never filters). Substring match on `label` + optional `keywords`. Ported from
 *  Astryx `createStaticSource` (adapted to our `TypeaheadOption`/`TypeaheadSource`). */
export function createStaticSource<TAux = unknown>(
  items: TypeaheadOption<TAux>[],
  options?: { keywords?: (item: TypeaheadOption<TAux>) => string[] },
): TypeaheadSource<TAux> {
  const getKeywords = options?.keywords;
  return {
    search(query: string) {
      const q = query.toLowerCase().trim();
      if (q === "") return items;
      return items.filter((item) => {
        if (item.label.toLowerCase().includes(q)) return true;
        if (getKeywords) return getKeywords(item).some((kw) => kw.toLowerCase().includes(q));
        return false;
      });
    },
    bootstrap() {
      return items;
    },
  };
}

// The control body — split out from the Root so it renders INSIDE Field.Root and can read the field
// aria (id / aria-describedby / aria-invalid) via useOptionalFieldControl (AGENTS.md gotcha: calling
// it at the top level reads the null outer context, so the wiring never reaches the input).
interface BodyProps<TAux> {
  source: TypeaheadSource<TAux>;
  resolvedSize: Size;
  value: TypeaheadOption<TAux> | null;
  onSelect: (value: TypeaheadOption<TAux> | null) => void;
  renderOption?: (option: TypeaheadOption<TAux>) => ReactNode;
  openOnFocus?: boolean;
  maxItems: number;
  emptyText?: ReactNode;
  errorText?: ReactNode;
  clearable: boolean;
  icon?: ReactNode;
  placeholder?: string;
  disabled?: boolean;
  debounceMs: number;
  onOpenChange?: (open: boolean) => void;
  onQueryChange?: (query: string) => void;
  ariaLabel?: string;
  ariaLabelledby?: string;
  // Embedded/transient mode ([[tokenizer-input]] — Tokenizer)
  embedded?: boolean;
  externalAnchorRef?: RefObject<HTMLElement | null>;
  externalInputRef?: Ref<HTMLInputElement>;
  onInputKeyDown?: (e: KeyboardEvent<HTMLInputElement>) => void;
  inputCollapsed?: boolean;
  controlProps?: EmbeddedControlProps;
}

function TypeaheadBody<TAux>({
  source,
  resolvedSize,
  value,
  onSelect,
  renderOption,
  openOnFocus = false,
  maxItems,
  emptyText,
  errorText,
  clearable,
  icon,
  placeholder,
  disabled,
  debounceMs,
  onOpenChange,
  onQueryChange,
  ariaLabel,
  ariaLabelledby,
  embedded = false,
  externalAnchorRef,
  externalInputRef,
  onInputKeyDown,
  inputCollapsed = false,
  controlProps,
}: BodyProps<TAux>) {
  const aria = useOptionalFieldControl();
  const announce = useAnnounce();
  const popupId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  // The immediate wrapper of the input — the containment reference for blur / outside-dismiss. (In
  // embedded mode the popover POSITIONS against `externalAnchorRef` (the host surface) instead; this
  // wrapper is no longer the Popover.Anchor there, only the focus-containment box.)
  const wrapRef = useRef<HTMLDivElement>(null);

  // Merge the internal input ref with an embedded host's forwarded ref (the host needs the node to
  // focus it, read the caret for Backspace-on-empty, and redirect Tab).
  const setInputRef = useCallback(
    (node: HTMLInputElement | null) => {
      inputRef.current = node;
      if (typeof externalInputRef === "function") externalInputRef(node);
      else if (externalInputRef) (externalInputRef as React.MutableRefObject<HTMLInputElement | null>).current = node;
    },
    [externalInputRef],
  );

  const [query, setQuery] = useState(value?.label ?? "");
  const [open, setOpen] = useState(false);

  const emitOpen = useCallback(
    (next: boolean) => {
      setOpen(next);
      onOpenChange?.(next);
    },
    [onOpenChange],
  );

  // The async pipeline + the roving aria-activedescendant cursor are the shared combobox engine
  // (extracted from THIS file — useComboboxEngine). Both hooks default to this component's prior
  // behavior exactly; the two CommandPalette deltas (optimistic narrowing, committed-query empty text)
  // are opt-in and left OFF here. Two-way dep between them (search moves the cursor on resolve; nav
  // needs the result COUNT) is broken with a ref: nav.setHighlightedIndex is a stable useState setter,
  // reached through setHighlightRef, which is only READ inside async callbacks — after this render's
  // assignment below.
  const setHighlightRef = useRef<(index: number) => void>(() => {});
  const search = useAsyncSearch<TAux>({
    source,
    maxItems,
    debounceMs,
    announce,
    errorText,
    openOnFocus,
    emitOpen,
    setHighlightedIndex: (i) => setHighlightRef.current(i),
  });
  const { results, isLoading, hasSearched, hasError } = search;

  const nav = useListboxNavigation({ itemCount: results.length, listboxId: popupId, isActive: open });
  setHighlightRef.current = nav.setHighlightedIndex;
  const { highlightedIndex, setHighlightedIndex, getItemId } = nav;

  // Keep the input text in sync with an externally-changed selection (controlled `value`). Compare by
  // `id` (our identity key), not object reference — else an inline `value={{…}}` literal that becomes a
  // fresh object on each parent render would reset the query mid-type.
  const prevValueIdRef = useRef(value?.id ?? null);
  useEffect(() => {
    const id = value?.id ?? null;
    if (id !== prevValueIdRef.current) {
      prevValueIdRef.current = id;
      setQuery(value?.label ?? "");
    }
  }, [value]);

  const handleQueryChange = useCallback(
    (next: string) => {
      setQuery(next);
      onQueryChange?.(next);
      search.cancelPending();

      // Cleared to empty (and not an open-on-focus picker): reset and close. Clearing the text also
      // clears the selection so the displayed label can never diverge from the model.
      if (next.length === 0 && !openOnFocus) {
        search.invalidate();
        search.resetState();
        setHighlightedIndex(-1);
        announce(""); // flush any lingering result-count / no-results status
        if (value) onSelect(null);
        emitOpen(false);
        return;
      }

      search.scheduleQuery(next);
    },
    [onQueryChange, openOnFocus, search, value, onSelect, emitOpen, setHighlightedIndex, announce],
  );

  const handleSelect = useCallback(
    (option: TypeaheadOption<TAux>) => {
      search.invalidate(); // invalidate any in-flight search
      search.cancelPending();
      onSelect(option);
      // TRANSIENT (embedded): don't sync the input to the picked label — reset to empty so the host
      // (Tokenizer) can commit its own token and the next one can be typed. Standalone: show the label.
      setQuery(embedded ? "" : option.label);
      search.resetState();
      setHighlightedIndex(-1);
      emitOpen(false);
      inputRef.current?.focus();
    },
    [search, onSelect, emitOpen, embedded, setHighlightedIndex],
  );

  const handleRetry = useCallback(() => {
    void search.performSearch(search.lastQueryRef.current);
    inputRef.current?.focus();
  }, [search]);

  const handleClear = useCallback(() => {
    search.invalidate(); // invalidate any in-flight search
    search.cancelPending();
    onSelect(null);
    setQuery("");
    search.resetState();
    setHighlightedIndex(-1);
    announce("");
    emitOpen(false);
    inputRef.current?.focus();
  }, [search, onSelect, emitOpen, setHighlightedIndex, announce]);

  const handleFocus = useCallback(() => {
    if (disabled) return;
    if (openOnFocus && results.length === 0 && query.length === 0) {
      void search.performBootstrap();
    } else if (
      results.length > 0 &&
      (query.length > 0 || openOnFocus) &&
      search.isCurrentGeneration()
    ) {
      emitOpen(true);
    }
  }, [disabled, openOnFocus, results.length, query.length, search, emitOpen]);

  const handleClose = useCallback(() => {
    // Invalidate any in-flight search so a late resolve (or an aborted request's rejection) can't
    // re-open the just-closed panel, and clear a pending debounce (source.cancel only aborts a
    // request, not the timer).
    search.invalidate();
    search.cancelPending();
    emitOpen(false);
    setHighlightedIndex(-1);
    // Reconcile the input text to the committed selection on abandon: an edited-but-unselected query
    // must never linger while the model still holds the old value — the control would lie about its
    // own state, the exact trust break this component exists to close. Also drop the stale results so
    // a re-focus can't resurface them. With no committed value there's nothing to lie about, so the
    // in-progress search text is left in place for the user to resume.
    if (value && query !== value.label) {
      setQuery(value.label);
      search.resetState();
    }
  }, [search, emitOpen, setHighlightedIndex, value, query]);

  // Keyboard state machine — LIFTED from Astryx BaseTypeahead.handleKeyDown (facebook/astryx
  // @9daca871), adapted to Radix Popover + our error/Retry state ([[catalog-as-specification]] port doctrine). DOM focus NEVER
  // leaves the input; navigation only moves the virtual cursor (aria-activedescendant).
  const handleKeyDown = useCallback(
    (e: KeyboardEvent<HTMLInputElement>) => {
      if (!open) {
        // Closed: ArrowDown opens (if there are cached results or an open-on-focus picker).
        if (e.key === "ArrowDown" && (openOnFocus || query.length > 0)) {
          e.preventDefault();
          if (results.length > 0) {
            emitOpen(true);
            setHighlightedIndex(0);
          } else if (openOnFocus) {
            void search.performBootstrap();
          }
        }
        return;
      }
      // Arrow / Home / End — the shared roving-cursor machine (wrap-around; DOM focus never leaves the
      // input). Enter / Escape stay here (app-specific: select-or-retry, close).
      if (nav.handleNavigationKeyDown(e)) return;
      switch (e.key) {
        case "Enter":
          e.preventDefault();
          if (hasError) handleRetry();
          else if (highlightedIndex >= 0 && highlightedIndex < results.length) handleSelect(results[highlightedIndex]);
          break;
        case "Escape":
          e.preventDefault();
          handleClose();
          break;
        // Tab is left to move focus natively; handleBlur closes the orphaned panel.
      }
    },
    [open, openOnFocus, query.length, results, highlightedIndex, hasError, emitOpen, setHighlightedIndex, search, nav, handleRetry, handleSelect, handleClose],
  );

  // Close when focus leaves the whole field (Tab / programmatic). Radix's outside-dismiss only fires
  // on outside POINTER + Escape; it never sees a keyboard focus-out, since focus lives on the input
  // (outside Content). Selecting a row re-focuses the input, and options preventDefault mousedown, so
  // this only fires on a genuine focus-out (LIFTED from Astryx handleBlur, adapted to Radix).
  const handleBlur = useCallback(
    (e: FocusEvent<HTMLInputElement>) => {
      if (!open) return;
      const next = e.relatedTarget as Node | null;
      if (next && (wrapRef.current?.contains(next) || document.getElementById(popupId)?.contains(next))) return;
      handleClose();
    },
    [open, popupId, handleClose],
  );

  // Leading affix: default the search glyph ON (Typeahead's identity IS search). `null`
  // removes it, any node overrides. Trailing affix state machine: Spinner (loading) → clear ✕ (idle
  // with a value/query). The clear reuses Select's ✕ affordance ([[field-family-anatomy]]): out of tab order, pointerDown
  // preventDefault so it never steals focus; Backspace-to-empty already clears the selection.
  const leadingIcon = icon === undefined ? <MagnifyingGlass weight="regular" aria-hidden /> : icon;
  const showClear = clearable && !disabled && (query.length > 0 || value != null);

  // What the open panel renders — drives BOTH the panel body and aria-controls (which must reference a
  // REAL element, never a dangling id). "loading" fills the refine-from-empty gap where results are
  // empty and a search is in flight, so the panel is never a blank box with a dead aria-controls target.
  const panelContent: "error" | "list" | "loading" | "empty" | null = hasError
    ? "error"
    : results.length > 0
      ? "list"
      : isLoading
        ? "loading"
        : hasSearched
          ? "empty"
          : null;

  // D8 / describedby merge: an embedded host (Tokenizer) injects readOnly / aria-disabled + a reason
  // describedby via controlProps — UNION its describedby with the field's, never clobber it.
  const { "aria-describedby": extraDescribedBy, ...restControlProps } = controlProps ?? {};
  const mergedDescribedBy =
    [aria?.["aria-describedby"], extraDescribedBy].filter(Boolean).join(" ") || undefined;

  const inputEl = (
    <RadixTextField.Root
      ref={setInputRef}
      variant="surface"
      size={resolvedSize}
      role="combobox"
      aria-expanded={open}
      aria-controls={open && panelContent ? popupId : undefined}
      aria-activedescendant={open && highlightedIndex >= 0 ? getItemId(highlightedIndex) : undefined}
      aria-autocomplete="list"
      aria-label={ariaLabel}
      aria-labelledby={ariaLabelledby}
      autoComplete="off"
      placeholder={placeholder}
      value={query}
      disabled={disabled}
      onChange={(e) => handleQueryChange(e.target.value)}
      onFocus={handleFocus}
      onBlur={handleBlur}
      // Embedded hosts intercept Backspace-on-empty / Shift+Tab FIRST; a preventDefault skips ours.
      onKeyDown={(e) => {
        onInputKeyDown?.(e);
        if (e.defaultPrevented) return;
        handleKeyDown(e);
      }}
      className={embedded ? "rt-ds-typeahead-embedded-input" : undefined}
      {...aria}
      {...restControlProps}
      aria-describedby={mergedDescribedBy}
    >
      {leadingIcon != null && (
        <RadixTextField.Slot side="left" style={{ color: "var(--ds-icon-neutral)" }}>
          {leadingIcon}
        </RadixTextField.Slot>
      )}
      {isLoading ? (
        <RadixTextField.Slot side="right">
          {/* Purely visual — the announcer speaks "Searching…"; a born-with-content role=status
              live region here is unreliable (many AT drop it) and would double up. */}
          <span aria-hidden style={{ display: "inline-flex" }}>
            <Spinner />
          </span>
        </RadixTextField.Slot>
      ) : showClear ? (
        <RadixTextField.Slot side="right">
          <IconButton
            inset
            size="1"
            aria-label="Clear"
            tabIndex={-1}
            onPointerDown={(e) => {
              e.preventDefault();
              e.stopPropagation();
            }}
            onClick={(e) => {
              e.stopPropagation();
              handleClear();
            }}
          >
            <X weight="bold" />
          </IconButton>
        </RadixTextField.Slot>
      ) : null}
    </RadixTextField.Root>
  );

  return (
    <Popover.Root open={open} onOpenChange={(o) => (o ? emitOpen(true) : handleClose())}>
      {embedded && externalAnchorRef ? (
        // Embedded: POSITION the popover against the host surface (chip row + input) via a virtual
        // anchor, so the dropdown spans the whole field. The input lives in a plain wrapper that stays
        // the focus-containment box (wrapRef); a data-collapsed sliver keeps it focusable at the cap.
        <>
          <Popover.Anchor virtualRef={externalAnchorRef as RefObject<Measurable>} />
          <div
            ref={wrapRef}
            className="rt-ds-typeahead-anchor"
            data-collapsed={inputCollapsed ? "" : undefined}
            style={{ position: "relative" }}
          >
            {inputEl}
          </div>
        </>
      ) : (
        <Popover.Anchor asChild>
          <div ref={wrapRef} className="rt-ds-typeahead-anchor" style={{ position: "relative", width: "100%" }}>
            {inputEl}
          </div>
        </Popover.Anchor>
      )}
      <Popover.Portal>
        {/* The primitive Popover portals to <body>, OUTSIDE the .radix-themes root, so the Radix token
            scales would not resolve. Wrap in Theme (as the Content element, asChild) to re-propagate the
            theme. Content is hardcoded role="dialog"; we override to role="none" (Astryx's rationale: the
            input keeps focus and the popup's own role=listbox is the exposed semantics, so a dialog would
            misrepresent it) and carry role=listbox on the inner element. Focus stays on the input:
            onOpenAutoFocus/onCloseAutoFocus are prevented, and interacting with the anchor (typing/clicking
            the input) is exempted from outside-dismiss so the panel doesn't self-close. */}
        <Popover.Content
          asChild
          role="none"
          align="start"
          sideOffset={4}
          onOpenAutoFocus={(e) => e.preventDefault()}
          onCloseAutoFocus={(e) => e.preventDefault()}
          onInteractOutside={(e) => {
            // Exempt the anchor from outside-dismiss (embedded: the whole host surface, so a click to
            // refocus the input doesn't self-close; standalone: the input wrapper).
            const anchor = embedded && externalAnchorRef ? externalAnchorRef.current : wrapRef.current;
            if (anchor?.contains(e.target as Node)) e.preventDefault();
          }}
        >
          <Theme className={`rt-ds-typeahead-panel rt-r-size-${resolvedSize}`}>
            {panelContent === "error" ? (
              // Restrained system-failure treatment — error-tone text + a generic alert glyph, NOT the
              // solid/full validation paint (that vocabulary means "your input is wrong"). Retry is a
              // pointer affordance; Enter re-runs the query for keyboard (in-panel buttons are excluded
              // from the Tab sequence — APG). Sits OUTSIDE role=listbox (a listbox's children must be
              // options), so the interactive button never lives inside the listbox.
              <div id={popupId} className="rt-ds-typeahead-status rt-ds-typeahead-error">
                <Flex align="center" gap="2" style={{ minWidth: 0 }}>
                  <WarningCircle size={16} weight="fill" aria-hidden style={{ flexShrink: 0 }} />
                  <Text size={resolvedSize} style={{ color: "inherit", lineHeight: 1.5 }}>
                    {errorText ?? "Couldn't load results."}
                  </Text>
                </Flex>
                <Button priority="tertiary" size={resolvedSize} type="button" tabIndex={-1} onClick={handleRetry}>
                  Try again
                </Button>
              </div>
            ) : panelContent === "list" ? (
              // The listbox exists ONLY when it has option children (axe aria-required-children).
              <div id={popupId} role="listbox" aria-label="Search results" className="rt-ds-typeahead-listbox">
                {results.map((option, i) => (
                  <div
                    key={option.id}
                    id={getItemId(i)}
                    role="option"
                    aria-selected={value?.id === option.id}
                    tabIndex={-1}
                    data-highlighted={i === highlightedIndex ? "" : undefined}
                    className="rt-ds-typeahead-option"
                    // Keep DOM focus on the input (activedescendant model) — a mousedown on the row
                    // would otherwise blur the input.
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => handleSelect(option)}
                    onMouseEnter={() => setHighlightedIndex(i)}
                  >
                    <span className="rt-ds-typeahead-label">
                      {renderOption ? renderOption(option) : (option.element ?? option.label)}
                    </span>
                  </div>
                ))}
              </div>
            ) : panelContent === "loading" ? (
              // Refine-from-empty: a search is in flight with no rows to keep visible. A muted "Searching…"
              // line fills the panel (so it's never a blank box) and carries the id so aria-controls
              // resolves. "No results" is never shown pre-resolve.
              <div id={popupId} className="rt-ds-typeahead-loading">Searching…</div>
            ) : panelContent === "empty" ? (
              // Empty = a muted line that echoes the query, OUTSIDE any listbox (no empty listbox).
              <div id={popupId} className="rt-ds-typeahead-empty">{emptyText ?? <>No results for “{query}”</>}</div>
            ) : null}
          </Theme>
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}

function TypeaheadRoot<TAux = unknown>({
  source,
  value,
  defaultValue,
  onValueChange,
  renderOption,
  openOnFocus,
  maxItems = 10,
  emptyText,
  errorText,
  clearable = true,
  icon,
  placeholder,
  size,
  disabled,
  debounceMs = 150,
  onOpenChange,
  onQueryChange,
  label,
  info,
  endSlot,
  description,
  validation,
  "aria-label": ariaLabel,
  "aria-labelledby": ariaLabelledby,
  embedded,
  anchorRef,
  inputRef,
  onInputKeyDown,
  inputCollapsed,
  controlProps,
}: TypeaheadProps<TAux>) {
  const resolvedSize = (useResolvedSize<Size>("control", size) ?? "1") as Size;
  const [internal, setInternal] = useState<TypeaheadOption<TAux> | null>(defaultValue ?? null);
  const isControlled = value !== undefined;
  const current = isControlled ? value! : internal;
  const onSelect = (next: TypeaheadOption<TAux> | null) => {
    if (!isControlled) setInternal(next);
    onValueChange?.(next);
  };

  // Nameless combobox = WCAG 4.1.2 failure. Warn in DEV when a bare Typeahead (no `label`) also has
  // no aria-label / aria-labelledby (a `placeholder` is not an accessible name). Mirrors TextField.
  // Embedded mode is exempt — the host (Tokenizer) NAMES the input via its own Field.Label + id.
  useEffect(() => {
    if (DEV_WARN && !embedded && label == null && ariaLabel == null && ariaLabelledby == null) {
      console.warn(
        "Typeahead: a field with no `label` needs `aria-label` or `aria-labelledby` for an accessible name (WCAG 4.1.2).",
      );
    }
  }, [label, ariaLabel, ariaLabelledby]);

  const body = (
    <TypeaheadBody
      source={source}
      resolvedSize={resolvedSize}
      value={current}
      onSelect={onSelect}
      renderOption={renderOption}
      openOnFocus={openOnFocus}
      maxItems={maxItems}
      emptyText={emptyText}
      errorText={errorText}
      clearable={clearable}
      icon={icon}
      placeholder={placeholder}
      disabled={disabled}
      debounceMs={debounceMs}
      onOpenChange={onOpenChange}
      onQueryChange={onQueryChange}
      ariaLabel={ariaLabel}
      ariaLabelledby={ariaLabelledby}
      embedded={embedded}
      externalAnchorRef={anchorRef}
      externalInputRef={inputRef}
      onInputKeyDown={onInputKeyDown}
      inputCollapsed={inputCollapsed}
      controlProps={controlProps}
    />
  );

  // Bare unless it carries a label / validation / description — keeps simple usage untouched.
  if (label == null && validation == null && description == null) return body;
  return (
    <Field.Root validation={validation} description={description} size={resolvedSize}>
      {label != null && <Field.Label info={info} endSlot={endSlot}>{label}</Field.Label>}
      {body}
      {description != null && <Field.Description>{description}</Field.Description>}
      <Field.Message />
    </Field.Root>
  );
}

export const Typeahead = TypeaheadRoot;
