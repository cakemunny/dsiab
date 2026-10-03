import {
  Fragment,
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
  type ReactNode,
} from "react";
import { Dialog, Spinner, Flex, Text } from "@radix-ui/themes";
import { MagnifyingGlass, WarningCircle } from "@phosphor-icons/react";
import { useResolvedSize } from "../../theme/SizeContext";
import { useAnnounce } from "./useAnnounce";
import { useReturnFocus } from "./useReturnFocus";
import { useAsyncSearch, useListboxNavigation } from "./useComboboxEngine";
import { groupItems } from "./groupItems";
import { Kbd } from "./Kbd";
import { Button } from "./Button";
import type { TypeaheadOption, TypeaheadSource } from "./Typeahead";
import { SelectionIconWeight } from "./Item";

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

/* CommandPalette — a ⌘K-style search-to-act (or search-to-pick) surface: a top-anchored modal holding a
 * chrome-less search input over a grouped, keyboard-navigable listbox ([[command-palette]]).
 *
 * SHELL: a THIN wrapper over the RAW Radix Themes `Dialog` (the System `Dialog` wrapper is status:planned
 * in registry.json — per the [[component-registry]] agent-gap rule we compose the raw primitive under GUIDELINES conventions,
 * exactly as `AlertDialog.tsx` wraps raw AlertDialog, rather than improvising a `System/Dialog`). Modal
 * enter/exit motion ([[toast-feedback-tier]]) is already bound to `.rt-BaseDialogContent`/`.rt-BaseDialogOverlay` in
 * components.css, so the raw Dialog inherits it — NO per-component motion override (that would
 * double-animate). The Dialog's own overlay scrim is the backdrop (NOT the separate --ds-scrim/Overlay).
 *
 * ENGINE: rides the SAME combobox engine as Typeahead (useComboboxEngine — useAsyncSearch +
 * useListboxNavigation), with the two CommandPalette deltas turned ON: `optimisticNarrow` (client-filter
 * the shown rows while the async source resolves) and `commitQueryWithResults` (the "No commands match X"
 * empty line echoes the COMMITTED query, so it's stable while a no-result search is pending). There is NO
 * letter-jump path (removed in the extraction), so the upstream `hasSearch` wart is gone by construction.
 *
 * Deferrals (named, NOT built): a global ⌘K hotkey (opening stays consumer-controlled via open/onOpenChange),
 * frecency ranking, and nested / sub-command pages.
 */

type Size = "1" | "2" | "3";

// A stable no-op for the engine's `emitOpen` — the Dialog owns visibility, so the surface is always
// "open" from the engine's POV. Module-level so it never changes performSearch's identity.
const NOOP_OPEN = () => {};

export interface CommandPaletteProps<TAux = unknown> {
  /** Whether the palette is open. Opening stays consumer-controlled (no built-in ⌘K hotkey — deferred). */
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** The async option source `{ search(query), bootstrap?(), cancel?() }` — same contract as Typeahead.
   *  `bootstrap()` seeds the resting set shown on open (e.g. Recent / Actions). */
  source: TypeaheadSource<TAux>;

  /** PICKER mode — the selected option id. Omit for a LAUNCHER (no persistent selection). */
  value?: string;
  /** Fires with the picked option's id (picker binding OR launcher command id). */
  onValueChange?: (value: string) => void;
  /** Fires with the full picked option (auxiliaryData carried) — a launcher acts here. */
  onSelect?: (option: TypeaheadOption<TAux>) => void;

  /** Custom per-row content; receives the option + whether it is the selected value (picker mode). A
   *  Phosphor icon in it that sets no `weight` renders solid on the selected row and outline elsewhere ([[selected-row-cue]]). */
  renderItem?: (option: TypeaheadOption<TAux>, isSelected: boolean) => ReactNode;
  /** Copy for a completed search with zero matches; `undefined` echoes the committed query. */
  emptyText?: ReactNode;
  /** Copy shown before any results have loaded / an empty bootstrap. @default "Type to search" */
  emptyBootstrapText?: ReactNode;
  /** Copy shown when a search REJECTS — distinct from empty, paired with Retry. @default "Couldn't load results." */
  errorText?: ReactNode;

  /** Input placeholder. @default "Search commands…" */
  placeholder?: string;
  /** Dialog accessible name. @default "Command palette" */
  label?: string;
  /** Input (combobox) accessible name — there is NO visible label. @default "Search commands" */
  inputLabel?: string;
  /** Listbox accessible name. @default "Commands" */
  listLabel?: string;

  /** The Kbd-hint footer. @default true */
  showFooter?: boolean;
  /** Cap the rendered result count. @default 50 */
  maxItems?: number;
  /** Debounce (ms) before firing `source.search`; 0 filters synchronously. @default 0 */
  debounceMs?: number;
  size?: Size;

  /** Docs/preview mode: render a plain <div> mirroring the dialog's look — NO <dialog>, backdrop,
   *  focus-trap, Escape, scroll-lock; NO input autofocus; NO mount-time highlight auto-scroll. @default false */
  isInline?: boolean;
}

interface PaletteBodyProps<TAux> extends CommandPaletteProps<TAux> {
  resolvedSize: Size;
}

function CommandPaletteBody<TAux>({
  source,
  value,
  onValueChange,
  onSelect,
  renderItem,
  emptyText,
  emptyBootstrapText = "Type to search",
  errorText,
  placeholder = "Search commands…",
  inputLabel = "Search commands",
  listLabel = "Commands",
  showFooter = true,
  maxItems = 50,
  debounceMs = 0,
  isInline = false,
  onOpenChange,
  open,
  resolvedSize,
}: PaletteBodyProps<TAux>) {
  const listId = useId();
  const announce = useAnnounce();
  const inputRef = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState("");
  // The visible spinner mounts only after a 150ms grace (a fast async resolve never flashes it) — the
  // busy flag is immediate for logic (search.isLoading), the MOUNT is delayed.
  const [showSpinner, setShowSpinner] = useState(false);
  // Pointer-vs-keyboard guard: a keyboard-driven scroll can slide the list under a stationary cursor and
  // fire mouseenter WITHOUT a real mousemove, "stealing" the active row. We only honour mouseenter after
  // the pointer has actually MOVED since the last keydown.
  const pointerMovedRef = useRef(false);

  const isPicker = value !== undefined;

  // Bridge (same pattern as Typeahead): useAsyncSearch moves the cursor on resolve via
  // useListboxNavigation's setter, but nav needs the result COUNT (from useAsyncSearch). The setter is a
  // stable useState setter reached through a ref populated just below, after nav is created.
  const setHighlightRef = useRef<(index: number) => void>(() => {});

  const resolveBootstrapHighlight = useCallback(
    // Launcher (no value) opens with NOTHING highlighted (-1) — the first ArrowDown moves to row 0.
    // Picker highlights the preselected value once bootstrap results arrive (else -1 / not-found).
    (shown: TypeaheadOption<TAux>[]) => (value ? shown.findIndex((o) => o.id === value) : -1),
    [value],
  );

  const search = useAsyncSearch<TAux>({
    source,
    maxItems,
    debounceMs,
    announce,
    errorText,
    openOnFocus: true, // an empty query re-shows the bootstrap resting set (never a blank box)
    emitOpen: NOOP_OPEN,
    setHighlightedIndex: (i) => setHighlightRef.current(i),
    optimisticNarrow: true,
    commitQueryWithResults: true,
    resolveBootstrapHighlight,
  });
  const { results, isLoading, hasError, committedQuery } = search;

  // Derive BOTH the render tree AND the flat activedescendant order from ONE groupItems call — kills the
  // upstream dual-invariant where two inline group passes had to agree. `flatGroupIndex[i]` maps a flat
  // row index to its group index (for the group-header scroll).
  const groups = useMemo(() => groupItems(results), [results]);
  const { flatItems, flatGroupIndex } = useMemo(() => {
    const flat: TypeaheadOption<TAux>[] = [];
    const fgi: number[] = [];
    groups.forEach((group, gi) => {
      for (const item of group.items) {
        flat.push(item);
        fgi.push(gi);
      }
    });
    return { flatItems: flat, flatGroupIndex: fgi };
  }, [groups]);

  const hasListbox = !hasError && flatItems.length > 0;

  const nav = useListboxNavigation({
    itemCount: flatItems.length,
    listboxId: listId,
    isActive: hasListbox,
    autoScroll: !isInline,
  });
  setHighlightRef.current = nav.setHighlightedIndex;

  // Bootstrap the resting set on open (modal) / on mount (inline). A ref keeps the effect from
  // re-firing when performBootstrap's identity changes (it depends on source/value).
  const bootstrapRef = useRef(search.performBootstrap);
  bootstrapRef.current = search.performBootstrap;
  useEffect(() => {
    if (open || isInline) void bootstrapRef.current();
  }, [open, isInline]);

  // Delayed spinner (150ms grace) — MOUNT the visible spinner only if still busy after the grace; a
  // sub-150ms resolve cancels it, so a fast search never flashes.
  useEffect(() => {
    if (!isLoading) {
      setShowSpinner(false);
      return;
    }
    const t = setTimeout(() => setShowSpinner(true), 150);
    return () => clearTimeout(t);
  }, [isLoading]);

  const handleClose = useCallback(() => {
    setQuery("");
    search.invalidate();
    search.cancelPending();
    onOpenChange(false);
  }, [search, onOpenChange]);

  const selectItem = useCallback(
    (option: TypeaheadOption<TAux>) => {
      onSelect?.(option);
      onValueChange?.(option.id);
      handleClose();
    },
    [onSelect, onValueChange, handleClose],
  );

  const handleRetry = useCallback(() => {
    void search.performSearch(search.lastQueryRef.current);
    inputRef.current?.focus();
  }, [search]);

  const onInputChange = useCallback(
    (next: string) => {
      setQuery(next);
      search.scheduleQuery(next);
    },
    [search],
  );

  const onInputKeyDown = useCallback(
    (e: KeyboardEvent<HTMLInputElement>) => {
      // Any key press resets the pointer-moved flag — a mouseenter that follows a keyboard scroll (with
      // no real movement) must NOT steal the active row.
      pointerMovedRef.current = false;
      if (nav.handleNavigationKeyDown(e)) return; // Arrow / Home / End — the shared roving-cursor machine
      if (e.key === "Enter") {
        e.preventDefault();
        if (hasError) {
          handleRetry();
          return;
        }
        const idx = nav.highlightedIndex;
        if (idx >= 0 && idx < flatItems.length) selectItem(flatItems[idx]);
      }
      // Escape is LEFT to bubble to Radix Dialog's onOpenChange (no duplicate handler); Space types.
    },
    [nav, hasError, handleRetry, flatItems, selectItem],
  );

  // Scroll the active row's GROUP HEADER into view when the active index crosses into a NEW group (the
  // row itself is auto-scrolled by useListboxNavigation) — so the group context is never lost above the
  // fold. Skipped inline (a docs specimen must not scroll the page).
  const activeGroupRef = useRef(-1);
  useEffect(() => {
    if (isInline) return;
    const idx = nav.highlightedIndex;
    if (idx < 0 || idx >= flatGroupIndex.length) {
      activeGroupRef.current = -1;
      return;
    }
    const gi = flatGroupIndex[idx];
    if (gi === activeGroupRef.current) return;
    activeGroupRef.current = gi;
    document.getElementById(`${listId}-group-${gi}-heading`)?.scrollIntoView?.({ block: "nearest" });
  }, [nav.highlightedIndex, flatGroupIndex, isInline, listId]);

  // Empty-state derivation (uses the COMMITTED query, so it's stable while a no-result search is
  // pending): no committed query → the bootstrap resting copy; a committed query → the "no match" echo.
  const showEmptyBootstrap = committedQuery === "" && flatItems.length === 0 && !hasError;
  const showEmptySearch = committedQuery !== "" && flatItems.length === 0 && !hasError;

  const renderOption = (item: TypeaheadOption<TAux>, index: number) => {
    const selected = isPicker && item.id === value;
    return (
      <div
        key={item.id}
        id={nav.getItemId(index)}
        role="option"
        aria-selected={isPicker ? selected : undefined}
        tabIndex={-1}
        data-highlighted={index === nav.highlightedIndex ? "" : undefined}
        className="rt-ds-cmdk-option"
        // Keep DOM focus on the input (activedescendant model) — a mousedown on the row would blur it.
        onMouseDown={(e) => e.preventDefault()}
        onClick={() => selectItem(item)}
        onMouseEnter={() => {
          if (pointerMovedRef.current) nav.setHighlightedIndex(index);
        }}
      >
        {/* The option draws its icon inside the caller's row content, so the whole label span takes the
            row's selection weight ([[selected-row-cue]]): solid for the picked row, outline for every other one. */}
        <span className="rt-ds-cmdk-option-label">
          <SelectionIconWeight isSelected={selected}>
            {renderItem ? renderItem(item, selected) : (item.element ?? item.label)}
          </SelectionIconWeight>
        </span>
      </div>
    );
  };

  const listbox = (
    <div id={listId} role="listbox" aria-label={listLabel} className="rt-ds-cmdk-listbox">
      {groups.map((group, gi) => {
        const start = flatGroupIndex.indexOf(gi); // first flat index of this group (contiguous)
        const rows = group.items.map((item, j) => renderOption(item, start + j));
        if (group.heading == null) return <Fragment key={`g${gi}`}>{rows}</Fragment>;
        const headingId = `${listId}-group-${gi}-heading`;
        return (
          <div key={`g${gi}`} role="group" aria-labelledby={headingId} className="rt-ds-cmdk-group">
            <div id={headingId} className="rt-ds-cmdk-grouplabel">
              {group.heading}
            </div>
            {rows}
          </div>
        );
      })}
    </div>
  );

  return (
    <>
      <div className="rt-ds-cmdk-inputrow">
        <span className="rt-ds-cmdk-lead" aria-hidden>
          <MagnifyingGlass weight="regular" />
        </span>
        <input
          ref={inputRef}
          type="text"
          role="combobox"
          className="rt-ds-cmdk-input"
          aria-label={inputLabel}
          aria-expanded={hasListbox}
          aria-controls={hasListbox ? listId : undefined}
          aria-activedescendant={nav.activeDescendant}
          aria-autocomplete="list"
          autoComplete="off"
          spellCheck={false}
          placeholder={placeholder}
          value={query}
          onChange={(e) => onInputChange(e.target.value)}
          onKeyDown={onInputKeyDown}
        />
        <span className="rt-ds-cmdk-trail" aria-hidden>
          {/* Purely visual — the announcer speaks "Searching…"; a live-region here would double up. */}
          {showSpinner ? <Spinner /> : null}
        </span>
      </div>
      <div className="rt-ds-cmdk-divider" />

      <div className="rt-ds-cmdk-scroll" onMouseMove={() => (pointerMovedRef.current = true)}>
        {hasError ? (
          // The error panel sits OUTSIDE the listbox (a listbox's children must be options). Restrained
          // system-failure treatment (weak error tint + alert glyph, NOT the solid validation paint);
          // Retry re-runs the query for pointer, Enter re-runs for keyboard (button outside Tab order).
          <div className="rt-ds-cmdk-error">
            <Flex align="center" gap="2" style={{ minWidth: 0 }}>
              <WarningCircle size={16} weight="fill" aria-hidden style={{ flexShrink: 0 }} />
              {/* Rides the palette's RESOLVED step, like the Retry button beside it — a frozen size="2"
                  made the error copy the one line in the panel that ignored the size lane. */}
              <Text size={resolvedSize} style={{ color: "inherit", lineHeight: 1.5 }}>
                {errorText ?? "Couldn't load results."}
              </Text>
            </Flex>
            <Button priority="tertiary" size={resolvedSize} type="button" tabIndex={-1} onClick={handleRetry}>
              Try again
            </Button>
          </div>
        ) : showEmptyBootstrap ? (
          <div className="rt-ds-cmdk-empty">{emptyBootstrapText}</div>
        ) : showEmptySearch ? (
          <div className="rt-ds-cmdk-empty">{emptyText ?? <>No commands match “{committedQuery}”</>}</div>
        ) : (
          listbox
        )}
      </div>

      {showFooter && (
        // The WHOLE footer is aria-hidden — redundant for AT (the combobox roles + the announcer carry
        // operability). A single quiet row of Kbd hints, separated by a hairline.
        <div className="rt-ds-cmdk-footer" aria-hidden>
          <span className="rt-ds-cmdk-hint">
            <Kbd>↑</Kbd>
            <Kbd>↓</Kbd>
            navigate
          </span>
          <span className="rt-ds-cmdk-hint">
            <Kbd>↵</Kbd>
            select
          </span>
          <span className="rt-ds-cmdk-hint">
            <Kbd>Esc</Kbd>
            close
          </span>
        </div>
      )}
    </>
  );
}

/**
 * Command palette root — a ⌘K search-to-act / search-to-pick surface.
 *
 * @example
 * ```tsx
 * <CommandPalette
 *   open={open}
 *   onOpenChange={setOpen}
 *   source={createStaticSource(commands)}
 *   onSelect={(cmd) => run(cmd.id)}
 * />
 * ```
 */
export function CommandPalette<TAux = unknown>(props: CommandPaletteProps<TAux>) {
  const { open, onOpenChange, isInline = false, label = "Command palette", size } = props;
  const resolvedSize = (useResolvedSize<Size>("control", size) ?? "1") as Size;

  // A bare CommandPalette with no accessible input name is a WCAG 4.1.2 failure — mirror Typeahead's
  // nameless-combobox DEV guard (the default inputLabel keeps it named unless a consumer nulls it).
  useEffect(() => {
    if (DEV_WARN && props.inputLabel === "") {
      console.warn(
        "CommandPalette: the search input needs an accessible name (`inputLabel`) for WCAG 4.1.2; a placeholder is not a name.",
      );
    }
  }, [props.inputLabel]);

  // Radix restores close-focus to a `Dialog.Trigger`; a palette opens from `open` and registers none.
  // Called above the `isInline` return so the hook order is stable across both branches.
  const returnFocus = useReturnFocus();

  if (isInline) {
    // Docs/preview: a plain div mirroring the dialog surface — no <dialog>, backdrop, focus-trap,
    // Escape, or scroll-lock; no autofocus; no mount-scroll (handled inside the body).
    return (
      <div className={`rt-ds-commandpalette rt-ds-commandpalette-inline rt-r-size-${resolvedSize}`}>
        <CommandPaletteBody {...props} resolvedSize={resolvedSize} />
      </div>
    );
  }

  return (
    // Escape / outside-click / pick all route through the SAME onOpenChange (no duplicate Escape handler);
    // closing unmounts the body, which resets the query + cancels any in-flight search via its cleanup.
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Content
        align="start"
        size={resolvedSize}
        aria-label={label}
        aria-describedby={undefined}
        className={`rt-ds-commandpalette rt-r-size-${resolvedSize}`}
        onOpenAutoFocus={returnFocus.onOpenAutoFocus}
        onCloseAutoFocus={returnFocus.onCloseAutoFocus}
      >
        <CommandPaletteBody {...props} resolvedSize={resolvedSize} />
      </Dialog.Content>
    </Dialog.Root>
  );
}
