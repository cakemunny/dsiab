import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
  type ReactNode,
  type Ref,
} from "react";
import { Box } from "@radix-ui/themes";
import { Plus } from "@phosphor-icons/react";
import { useResolvedSize } from "../../theme/SizeContext";
import {
  Field,
  useDisabledReason,
  DisabledReasonTooltip,
  DisabledReasonGlyph,
} from "./Field";
import { Token } from "./Token";
import { OverflowList } from "./OverflowList";
import { Typeahead, type TypeaheadOption, type TypeaheadSource } from "./Typeahead";
import { useAnnounce } from "./useAnnounce";

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

/* Tokenizer — a multi-token input: committed Token chips + a transient type-to-search combobox, on the
 * shared Field shell. The D10 dropdown-only model (DECISIONS [[tokenizer-input]]).
 *
 * Almost entirely ASSEMBLY of shipped parts: it embeds the **Typeahead** engine (B1/flagship) in a new
 * TRANSIENT/embedded mode (the input renders chrome-less, selecting fires the host callback + resets the
 * query — `value` stays null), lays out committed **Token** chips (B1) in a wrapping `role="group"`
 * surface, collapses them with **OverflowList** (B2) when `unfocusedInline`, rides **Field** + the D8/[[disabled-reason]]
 * soft-disable affordance, and speaks through the singleton **useAnnounce**. The chip-row surface + its
 * `:has(input:focus-visible)` focus-ring hoist is the ONE earned net-new piece (zero net-new tokens).
 *
 * THE MODEL (the deliberate, safe divergence from a free-text tag input): tokens are created ONLY through
 * the dropdown. With `creatable`, a `Create "{query}"` row is synthesized and committed by PICKING it —
 * there is NO free-text Enter/comma/blur/paste commit (those are named deferrals). The tradeoff is real
 * and worth naming: a tag input usually commits on Enter, so a user will press Enter and get nothing back.
 * What that buys is that every committed token is a real, deduped, validatable item rather than whatever
 * happened to be in the box.
 *
 * DEFERRED (named, not built): free-text/comma/paste-split/blur commit; the token-chip EDIT mode (the D10
 * ruled flag — chips stay removable-only, Enter-on-chip unbound); `unfocusedLayer` overflow (needs a Layer
 * top-layer primitive we don't have); `changeAction`/`InputGroup`; drag-to-reorder (upstream's phantom
 * `'reorder'` change type, which it declares + documents but never emits — dropped from our union).
 */

type Size = "1" | "2" | "3";
type Tone = "error" | "warning" | "success" | "info";
type Validation = { tone: Tone; message: ReactNode };

/** The change metadata handed to `onValueChange`. Upstream's phantom `'reorder'` is dropped (never emitted). */
export interface TokenizerChange<TAux = unknown> {
  item: TypeaheadOption<TAux>;
  type: "add" | "create" | "remove";
}

export interface TokenizerProps<TAux = unknown> {
  /** The committed tokens (controlled). */
  value: TypeaheadOption<TAux>[];
  /** Fires on every add / create / remove, with the next tokens + which item changed and how. */
  onValueChange: (items: TypeaheadOption<TAux>[], change: TokenizerChange<TAux>) => void;
  /** The search source — the SAME `TypeaheadSource` the embedded Typeahead consumes; owns all filtering. */
  source: TypeaheadSource<TAux>;
  /** Opt-in free-token creation THROUGH THE DROPDOWN: a `Create "{query}"` row is synthesized and
   *  committed by picking it. Default FALSE — the safe DS default (no accidental junk tokens). */
  creatable?: boolean;
  /** Cap the number of tokens. At the cap the input collapses to a focusable sliver, the dropdown is
   *  suppressed, and a calm "Maximum {n} tags" hint shows in the Field description (guidance, not error). */
  maxEntries?: number;
  /** `'unfocusedInline'` collapses trailing chips into OverflowList's "+N" while BLURRED and expands to
   *  full wrapping rows on FOCUS. Blurred, the field is a summary of what was chosen and should cost one
   *  row. Focused, it is the workspace and every chip has to be reachable. `'none'` (default) always wraps. */
  tokenOverflowBehavior?: "none" | "unfocusedInline";
  /** When set, a hidden `<input name={htmlName} value={item.id}>` is rendered per token for form
   *  participation (disabled ones are excluded from FormData). */
  htmlName?: string;
  /** Field label — also names the `role="group"` surface. Pass `aria-label` instead for a bare field. */
  label?: ReactNode;
  /** Optional inline affordance beside the label (a tip icon / helper toggle). */
  info?: ReactNode;
  /** Optional pinned note at the far end of the label row. */
  endSlot?: ReactNode;
  /** Persistent helper line under the surface — calm guidance that holds in any validation state. */
  description?: ReactNode;
  /** A STANDING validation state (a real problem the user must resolve). */
  validation?: Validation;
  disabled?: boolean;
  /** D8 ([[disabled-reason]]): a non-empty reason SOFT-disables (aria-disabled + readOnly + reason tooltip + glyph)
   *  instead of natively disabling, so the reason stays perceivable on hover AND keyboard focus. */
  disabledReason?: string;
  /** Greyed hint while EMPTY (no tokens). Names the mechanism — "Search to add…", never "press Enter". */
  placeholder?: string;
  size?: Size;
  /** Debounce (ms) before firing `source.search`; set 0 for synchronous/local sources. @default 150 */
  debounceMs?: number;
  width?: number | string;
  /** Accessible name for a BARE Tokenizer (no `label`). One of `label` / `aria-label` is required. */
  "aria-label"?: string;
  "data-testid"?: string;
  /** Ref to the `role="group"` surface. */
  ref?: Ref<HTMLDivElement>;
}

// Sentinel id prefix marking a synthesized "Create X" row apart from a real search result.
const CREATE_PREFIX = "__ds_tokenizer_create__";

// The embedded Typeahead's visible-row cap. Pinned here (not left to Typeahead's default) so the
// `Create "X"` sentinel — appended LAST — can never be pushed past the slice and silently vanish
// when a short query matches this many real rows. `filteredSource` reserves the final slot for it.
const EMBEDDED_MAX_ITEMS = 10;

/** A search source that returns nothing — swapped in at `maxEntries` so the dropdown never opens. */
const EMPTY_SOURCE: TypeaheadSource<never> = { search: () => [], bootstrap: () => [] };

function mergeRefs<T>(...refs: (Ref<T> | undefined)[]): (node: T | null) => void {
  return (node) => {
    for (const ref of refs) {
      if (typeof ref === "function") ref(node);
      else if (ref != null) (ref as React.MutableRefObject<T | null>).current = node;
    }
  };
}

export function Tokenizer<TAux = unknown>({
  value,
  onValueChange,
  source,
  creatable = false,
  maxEntries,
  tokenOverflowBehavior = "none",
  htmlName,
  label,
  info,
  endSlot,
  description,
  validation,
  disabled = false,
  disabledReason,
  placeholder = "Search to add…",
  size,
  debounceMs,
  width,
  "aria-label": ariaLabelProp,
  "data-testid": testId,
  ref,
}: TokenizerProps<TAux>) {
  const resolvedSize = (useResolvedSize<Size>("control", size) ?? "1") as Size;
  const announce = useAnnounce();
  const dr = useDisabledReason({ disabled, disabledReason });

  const surfaceRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  // Focus target to apply AFTER a removal re-renders (controlled value change): the input, or a chip index.
  const pendingFocus = useRef<{ type: "input" } | { type: "chip"; index: number } | null>(null);

  const [isFocusedWithin, setIsFocusedWithin] = useState(false);

  const isAtMax = maxEntries != null && value.length >= maxEntries;
  const capActive = isAtMax && !disabled;
  // `unfocusedInline`: collapse to one line ("+N") while blurred; expand to full rows on focus.
  const isTruncated = !isFocusedWithin && tokenOverflowBehavior === "unfocusedInline" && value.length > 0;

  const groupName = typeof label === "string" ? label : ariaLabelProp;
  const glyphSize = resolvedSize === "3" ? 18 : 16;

  // Nameless combobox = WCAG 4.1.2. Warn in DEV when neither label nor aria-label is present.
  useEffect(() => {
    if (DEV_WARN && label == null && ariaLabelProp == null) {
      console.warn("Tokenizer: needs `label` or `aria-label` for an accessible name (WCAG 4.1.2).");
    }
  }, [label, ariaLabelProp]);

  // Announce the cap ONCE (politely) when it is reached; re-arm when it drops back below.
  const capAnnouncedRef = useRef(false);
  useEffect(() => {
    if (capActive && !capAnnouncedRef.current) {
      capAnnouncedRef.current = true;
      announce(`Maximum ${maxEntries} tags`);
    } else if (!capActive) {
      capAnnouncedRef.current = false;
    }
  }, [capActive, maxEntries, announce]);

  // ── Three-layer dedupe, layers 1 + 2: selected items never appear in the menu, and no "Create X" for a
  // value already selected or matching a result label. (Layer 3 — the commit-time guard — is in handleAdd.)
  const selectedIds = useMemo(() => new Set(value.map((v) => v.id)), [value]);
  const selectedLabels = useMemo(() => new Set(value.map((v) => v.label.toLowerCase())), [value]);

  const filteredSource = useMemo<TypeaheadSource<TAux>>(
    () => ({
      async search(query) {
        const results = await source.search(query);
        const filtered = results.filter((r) => !selectedIds.has(r.id)); // (1) selected never re-listed
        const trimmed = query.trim();
        if (creatable && trimmed) {
          const lower = trimmed.toLowerCase();
          const dupe =
            selectedLabels.has(lower) || // (2a) already a token
            selectedIds.has(trimmed) ||
            filtered.some((r) => r.label.toLowerCase() === lower); // (2b) already a real match
          if (!dupe) {
            // Reserve the final visible slot for the sentinel: Typeahead slices to EMBEDDED_MAX_ITEMS,
            // so once real matches fill the list the Create row (appended LAST) would be sliced off and
            // the create affordance would vanish silently. Trim real matches to leave room.
            if (filtered.length >= EMBEDDED_MAX_ITEMS) filtered.length = EMBEDDED_MAX_ITEMS - 1;
            // Appended LAST: while real matches exist, index 0 (a real match) is auto-highlighted, so
            // Enter picks the match — NOT this. With zero real matches it becomes index 0, so Enter-on-a-
            // new-value commits it (the intuitive path). The `Create "X"` label is matched by the tests.
            filtered.push({ id: CREATE_PREFIX + trimmed, label: `Create "${trimmed}"` } as TypeaheadOption<TAux>);
          }
        }
        return filtered;
      },
      bootstrap: source.bootstrap
        ? async () => (await source.bootstrap!()).filter((r) => !selectedIds.has(r.id))
        : undefined,
      cancel: source.cancel ? () => source.cancel!() : undefined,
    }),
    [source, selectedIds, selectedLabels, creatable],
  );

  const isCreateItem = (opt: TypeaheadOption<TAux>) =>
    typeof opt.id === "string" && opt.id.startsWith(CREATE_PREFIX);

  const renderOption = useCallback(
    (opt: TypeaheadOption<TAux>): ReactNode =>
      isCreateItem(opt) ? (
        <span className="rt-ds-tokenizer-create-row">
          <Plus weight="bold" aria-hidden />
          <span>{opt.label}</span>
        </span>
      ) : (
        opt.element ?? opt.label
      ),
    [],
  );

  // ── Commit (add / create) — the transient Typeahead hands the picked item here. -----------------------
  const handleAdd = useCallback(
    (item: TypeaheadOption<TAux> | null) => {
      if (!item || capActive) return;
      if (typeof item.id === "string" && item.id.startsWith(CREATE_PREFIX)) {
        const created = item.id.slice(CREATE_PREFIX.length);
        // Layer 3 (commit-time guard) for creation.
        if (selectedIds.has(created) || value.some((v) => v.label.toLowerCase() === created.toLowerCase())) return;
        const realItem = { id: created, label: created } as TypeaheadOption<TAux>;
        onValueChange([...value, realItem], { item: realItem, type: "create" });
        announce(`Added ${created}`);
        return;
      }
      if (selectedIds.has(item.id)) return; // Layer 3 (commit-time guard) for a real pick
      onValueChange([...value, item], { item, type: "add" });
      announce(`Added ${item.label}`);
    },
    [value, onValueChange, capActive, selectedIds, announce],
  );

  // ── Removal — value update + polite announce + scheduled post-removal focus. --------------------------
  const chipEls = useCallback(
    () =>
      Array.from(surfaceRef.current?.querySelectorAll<HTMLElement>("[data-tk-chip]") ?? []).filter(
        (el) => !el.closest("[inert]"), // never the OverflowList measurement copy
      ),
    [],
  );
  // Focusing a chip is an INTERNAL move — set this so the Tab capture-redirect (below) doesn't mistake
  // it for focus arriving from outside. (After removing a focused chip, its focus falls to <body>, so the
  // programmatic re-focus would otherwise arrive with a null relatedTarget and get bounced to the input.)
  const suppressRedirect = useRef(false);
  const focusChipEl = useCallback((el: HTMLElement | undefined) => {
    if (!el) return false;
    suppressRedirect.current = true;
    el.focus(); // focusin fires synchronously, so the guard is read + honoured before we reset it
    suppressRedirect.current = false;
    return true;
  }, []);
  const focusChip = useCallback((i: number) => focusChipEl(chipEls()[i]), [chipEls, focusChipEl]);

  const removeItem = useCallback(
    (item: TypeaheadOption<TAux>, from: "input" | "chip" | "pointer", index?: number) => {
      if (disabled) return;
      const next = value.filter((v) => v.id !== item.id);
      // Post-removal focus: a keyboard chip removal keeps focus in the row
      // (next → prev → input); every other path returns to the input.
      pendingFocus.current = from === "chip" && index != null ? { type: "chip", index } : { type: "input" };
      onValueChange(next, { item, type: "remove" });
      announce(`Removed ${item.label}, ${next.length} remaining`);
    },
    [disabled, value, onValueChange, announce],
  );

  // Apply the scheduled focus once the removal has re-rendered the row.
  useLayoutEffect(() => {
    const pending = pendingFocus.current;
    if (!pending) return;
    pendingFocus.current = null;
    if (pending.type === "input") {
      inputRef.current?.focus();
      return;
    }
    const chips = chipEls();
    const target = chips[pending.index] ?? chips[chips.length - 1]; // next → else previous
    if (!focusChipEl(target)) inputRef.current?.focus(); // → else the input (last chip removed)
  }, [value, chipEls, focusChipEl]);

  // The chip ✕ is a POINTER target, not its own tab stop — Token makes it a real button, so sweep every
  // chip's remove button out of the tab order (roving reaches the CHIP, one stop per chip; [[tokenizer-input]]).
  useLayoutEffect(() => {
    surfaceRef.current
      ?.querySelectorAll<HTMLElement>("[data-tk-chip] .rt-IconButton")
      .forEach((btn) => btn.setAttribute("tabindex", "-1"));
  }, [value, isTruncated]);

  // ── Keyboard: the input intercepts Backspace-on-empty + Shift+Tab-to-chips FIRST (before Typeahead). --
  const handleInputKeyDown = useCallback(
    (e: KeyboardEvent<HTMLInputElement>) => {
      if (disabled) return;
      if (e.key === "Backspace" && e.currentTarget.value === "" && value.length > 0) {
        e.preventDefault();
        removeItem(value[value.length - 1], "input"); // remove LAST + refocus input (single-step)
        return;
      }
      // Shift+Tab from the input reaches the chips (they are OUT of the linear Tab sequence).
      if (e.key === "Tab" && e.shiftKey && value.length > 0) {
        e.preventDefault();
        focusChip(value.length - 1); // land on the last chip (adjacent to the input)
      }
    },
    [disabled, value, removeItem, focusChip],
  );

  // Arrow Left/Right + Home/End rove chip-to-chip; Backspace/Delete removes the focused chip.
  const handleChipKeyDown = useCallback(
    (e: KeyboardEvent<HTMLElement>, i: number) => {
      const count = value.length;
      switch (e.key) {
        case "ArrowLeft":
          e.preventDefault();
          focusChip(Math.max(0, i - 1));
          break;
        case "ArrowRight":
          e.preventDefault();
          focusChip(Math.min(count - 1, i + 1));
          break;
        case "Home":
          e.preventDefault();
          focusChip(0);
          break;
        case "End":
          e.preventDefault();
          focusChip(count - 1);
          break;
        case "Backspace":
        case "Delete":
          e.preventDefault();
          removeItem(value[i], "chip", i);
          break;
        // Enter-on-chip is deliberately UNBOUND (the D10 chip-edit mode is a named deferral).
      }
    },
    [value, focusChip, removeItem],
  );

  // ── Focus / click plumbing. ---------------------------------------------------------------------------
  const focusInput = useCallback(() => {
    if (!disabled) inputRef.current?.focus();
  }, [disabled]);

  const handleFocusCapture = useCallback(
    (e: React.FocusEvent<HTMLDivElement>) => {
      setIsFocusedWithin(true);
      if (suppressRedirect.current) return; // an internal programmatic chip focus — never redirect it
      const fromOutside = !surfaceRef.current?.contains(e.relatedTarget as Node | null);
      // Tab capture-redirect: focus entering from OUTSIDE lands on the input (the one forward tab stop),
      // never a chip — so the user doesn't tab through every remove button. (Focus moving WITHIN the
      // surface — Shift+Tab to a chip, arrow roving — is guarded above.)
      if (fromOutside && !disabled && e.target !== inputRef.current) inputRef.current?.focus();
    },
    [disabled],
  );
  const handleBlurCapture = useCallback((e: React.FocusEvent<HTMLDivElement>) => {
    if (!surfaceRef.current?.contains(e.relatedTarget as Node | null)) setIsFocusedWithin(false);
  }, []);

  // ── D8 soft-disable / cap → the input's control props (readOnly / aria-disabled + reason describedby). -
  const inputControlProps = dr.soft
    ? { readOnly: true, "aria-disabled": true as const, "aria-describedby": dr.reasonId, "aria-invalid": undefined }
    : capActive
      ? { readOnly: true }
      : undefined;

  // ── Chips. --------------------------------------------------------------------------------------------
  const chips = value.map((item, i) => (
    <Token
      key={item.id}
      label={item.label}
      size={resolvedSize}
      disabled={disabled}
      onRemove={disabled ? undefined : () => removeItem(item, "pointer")}
      tabIndex={-1}
      data-tk-chip=""
      onKeyDown={(e: KeyboardEvent<HTMLElement>) => handleChipKeyDown(e, i)}
    />
  ));

  const embeddedInput = (
    <Typeahead<TAux>
      embedded
      anchorRef={surfaceRef}
      inputRef={inputRef}
      source={capActive ? (EMPTY_SOURCE as TypeaheadSource<TAux>) : filteredSource}
      value={null}
      onValueChange={handleAdd}
      renderOption={renderOption}
      placeholder={value.length === 0 ? placeholder : ""}
      icon={null}
      clearable={false}
      size={resolvedSize}
      disabled={dr.hardDisabled}
      controlProps={inputControlProps}
      inputCollapsed={capActive || isTruncated}
      onInputKeyDown={handleInputKeyDown}
      maxItems={EMBEDDED_MAX_ITEMS}
      debounceMs={debounceMs}
      aria-label={label != null ? undefined : ariaLabelProp}
    />
  );

  const surface = (
    <div
      ref={mergeRefs(ref, surfaceRef)}
      role="group"
      aria-label={groupName}
      // aria-disabled on the group marks the whole control inactive — accurate for both hard + soft
      // disable, and it lets AT (and axe) treat the intentionally-dimmed chip text as inactive-component
      // text (WCAG 1.4.3 exempt), not a contrast failure.
      aria-disabled={disabled || undefined}
      className="rt-ds-tokenizer"
      data-size={resolvedSize}
      data-disabled={disabled ? "" : undefined}
      data-testid={testId}
      onClick={focusInput}
      onFocusCapture={handleFocusCapture}
      onBlurCapture={handleBlurCapture}
    >
      {isTruncated ? (
        <OverflowList gap={1} collapseFrom="end" behavior="observeParent" label={null}>
          {chips}
        </OverflowList>
      ) : (
        chips
      )}
      {embeddedInput}
      {htmlName != null &&
        value.map((item) => (
          // Disabled native controls are excluded from form submission — mirror that for hard-disable.
          <input key={item.id} type="hidden" name={htmlName} value={item.id} disabled={dr.hardDisabled} />
        ))}
      {dr.soft && (
        <span className="rt-ds-tokenizer-reason" style={{ display: "inline-flex", flexShrink: 0 }}>
          <DisabledReasonGlyph size={glyphSize} />
        </span>
      )}
    </div>
  );

  // At the cap the description carries a CALM hint (guidance, not validation) — folded into
  // aria-describedby via the Field so AT hears it too.
  const effectiveDescription = capActive ? `Maximum ${maxEntries} tags` : description;

  const wrapped = (
    <Field.Root validation={validation} description={effectiveDescription} size={resolvedSize}>
      {label != null && (
        <Field.Label info={info} endSlot={endSlot}>
          {label}
        </Field.Label>
      )}
      <DisabledReasonTooltip {...dr.tooltip}>{surface}</DisabledReasonTooltip>
      {effectiveDescription != null && <Field.Description>{effectiveDescription}</Field.Description>}
      <Field.Message />
    </Field.Root>
  );

  return width != null ? <Box style={{ width }}>{wrapped}</Box> : wrapped;
}

Tokenizer.displayName = "Tokenizer";
