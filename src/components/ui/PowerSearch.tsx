// Copyright (c) Meta Platforms, Inc. and affiliates.
// Portions derived from facebook/astryx packages/core/src/PowerSearch/PowerSearch.tsx @ 88c95e4 (MIT, © Meta Platforms)
// Portions derived from facebook/astryx packages/core/src/PowerSearch/PowerSearchEditPopover.tsx @ 88c95e4 (MIT, © Meta Platforms)

"use client";

import {
  useCallback,
  useEffect,
  useImperativeHandle,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type FocusEvent,
  type KeyboardEvent,
  type ReactNode,
  type Ref,
} from "react";
import * as Popover from "@radix-ui/react-popover";
import { Box, Text, Theme } from "@radix-ui/themes";
import { MagnifyingGlass } from "@phosphor-icons/react";
import { useResolvedSize } from "../../theme/SizeContext";
import {
  Field,
  useDisabledReason,
  DisabledReasonTooltip,
  DisabledReasonGlyph,
} from "./Field";
import { Button } from "./Button";
import { Token } from "./Token";
import { Avatar } from "./Avatar";
import { OverflowList } from "./OverflowList";
import { Select } from "./Select";
import { Typeahead, type TypeaheadOption } from "./Typeahead";
import { useAnnounce } from "./useAnnounce";
import { useInternalConfig, type InternalConfig } from "../../powersearch/useInternalConfig";
import { usePowerSearchSource } from "../../powersearch/usePowerSearchSource";
import { formatFilterValue } from "../../powersearch/formatFilterValue";
import { PowerSearchValueEditor } from "../../powersearch/PowerSearchValueEditor";
import type {
  PowerSearchConfig,
  PowerSearchFilter,
  PartialFilter,
  PowerSearchAuxData,
  PowerSearchChangeType,
  PowerSearchHandle,
  FilterValue,
  PowerSearchComponents,
  PowerSearchEditorProps,
} from "../../powersearch/types";

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

/* PowerSearch — the structured filter bar (B5): each committed filter is a Token chip (field · operator ·
 * bold value); a field pick opens a NON-DIALOG edit popover that builds the filter. The wave-3 capstone.
 *
 * Normalizations (D20):
 *   - ASSEMBLY over reinvention. The chip row + field typeahead is composed from our shipped `Token` +
 *     embedded `Typeahead`, REUSING the `.rt-ds-tokenizer` surface skin verbatim (fill, hairline, the hoisted
 *     accent focus ring of [[focus-ring]], the `[data-validation]` paint, the disabled skin) — see the REUSE note
 *     below. We do NOT drive our `Tokenizer` component: its commit model COMMITS a chip on pick, but a
 *     PowerSearch field pick must OPEN THE EDITOR (not add a bare token) and its chips are clickable (open
 *     the editor) — neither is in Tokenizer's dropdown-only D10 contract, so composing Token + Typeahead
 *     directly (the blueprint's sanctioned fallback) is the honest fit.
 *   - Popover-as-non-dialog: EXACTLY our Typeahead pattern — `Popover.Content role="none"` +
 *     `onOpenAutoFocus`/`onCloseAutoFocus` prevented + `onInteractOutside` exempting the anchor surface —
 *     so focus is ours to place (the editor's first field), the tokenizer stays live, and it's not a modal.
 *   - 2-level Escape: upstream's hand-rolled `escapeStack` (`!e.defaultPrevented` bookkeeping) is DELETED.
 *     Radix's DismissableLayer stack gives it for free — a nested Select/dropdown is the inner layer
 *     (Escape #1 closes it), the edit popover is the outer layer (Escape #2 cancels). Enter-to-save stays
 *     an explicit handler (Radix doesn't own Enter).
 *   - `formatFilterValue` is the ONE renderer (the model layer's single fixed formatter) — upstream's
 *     duplicate `PowerSearchTokenValue` JSX renderer (and its `date range` stub) is gone by construction.
 *   - `disabledMessage` → our shipped D8 `disabledReason` ([[disabled-reason]]); `status` → our `validation`. `menuWidth`
 *     and `maxOperatorMenuItems` were DEAD upstream and are dropped. `nested` is deferred (flat-AND-only).
 *
 * REUSE (Rule 11):
 *   EXISTING — the `.rt-ds-tokenizer` surface (src/tokens/components.css) + its focus-ring/validation/
 *     disabled CSS; `Token` (Token.tsx, [[token-chip]]) for the clickable+removable chip; embedded `Typeahead`
 *     (Typeahead.tsx) for the transient field combobox; `Select` for the field/operator pickers;
 *     `PowerSearchValueEditor` (B5 Step 2) for the value inputs; `Avatar`, `OverflowList`, `Field` +
 *     D8 soft-disable, `useAnnounce`, `formatFilterValue`.
 *   APPLY — the chip row IS a `.rt-ds-tokenizer` surface holding `Token` chips + the embedded Typeahead as
 *     the last flex child (identical structure to Tokenizer), so every surface style is inherited.
 *   NET-NEW — only the edit-popover panel + its 3-cell layout CSS (`.rt-ds-powersearch-*`), justified: a
 *     form popover is a surface neither Tokenizer nor the menu panels provide. ZERO net-new tokens.
 */

type Size = "1" | "2" | "3";
type Validation = { tone: "error" | "warning" | "success" | "info"; message: ReactNode };

export interface PowerSearchProps {
  /** Fields + operators + value types (from `createPowerSearchConfig`). */
  config: PowerSearchConfig;
  /** The active filters (controlled). */
  filters: ReadonlyArray<PowerSearchFilter>;
  /** Fires on add / edit / remove, with the next filters, the change kind, and the affected index. */
  onChange: (
    filters: ReadonlyArray<PowerSearchFilter>,
    changeType: PowerSearchChangeType,
    index: number,
  ) => void;
  /** Field label — names the chip-row group. Pass `aria-label` instead for a bare field. */
  label?: ReactNode;
  /** Accessible name for a BARE field (no `label`). Defaults the group name to "Search". */
  "aria-label"?: string;
  /** Greyed hint while there are no filters. @default "Search…" */
  placeholder?: string;
  /** Prevent adding, editing, or removing filters (chips stay visible, inert). @default false */
  readOnly?: boolean;
  disabled?: boolean;
  /** D8 ([[disabled-reason]]): a non-empty reason SOFT-disables (aria-disabled + readOnly + reason tooltip + glyph) —
   *  use this instead of wrapping a disabled PowerSearch in a Tooltip. */
  disabledReason?: string;
  /** Leading identification glyph at the START of the row. `undefined` → a search glyph; `null` removes it. */
  startIcon?: ReactNode;
  /** Fires when focus enters the field from outside. */
  onFocus?: (e: FocusEvent<HTMLDivElement>) => void;
  /** Fires when focus leaves the field entirely. */
  onBlur?: (e: FocusEvent<HTMLDivElement>) => void;
  /** A STANDING validation state painted on the surface. */
  validation?: Validation;
  /** Optional inline affordance beside the label. */
  info?: ReactNode;
  /** Optional pinned note at the far end of the label row. */
  endSlot?: ReactNode;
  /** Persistent helper line under the surface. */
  description?: ReactNode;
  /** Max character length for a token's formatted value. @default 40 */
  maxTokenLength?: number;
  /** Save-button label in the edit popover. @default "Apply" */
  popoverSaveButtonLabel?: string;
  /** Timezone ID for date formatting (e.g. "America/New_York"). */
  timezoneID?: string;
  /** `'unfocusedInline'` collapses trailing chips into "+N" while blurred; `'none'` (default) always wraps. */
  tokenOverflowBehavior?: "none" | "unfocusedInline";
  /** Content pinned at the end of the row (action buttons, etc.). */
  endContent?: ReactNode;
  /** Result count for the current filters. A number → "N results" (announced politely on change). */
  resultCount?: number | string;
  size?: Size;
  /** Per-type `{Token?, Editor?}` overrides — the load-bearing customization seam. */
  components?: PowerSearchComponents;
  /** Imperative handle: `focusTypeahead()` / `blurTypeahead()`. */
  handleRef?: Ref<PowerSearchHandle>;
  width?: number | string;
  "data-testid"?: string;
  /** Ref to the chip-row group surface. */
  ref?: Ref<HTMLDivElement>;
}

function mergeRefs<T>(...refs: (Ref<T> | undefined)[]): (node: T | null) => void {
  return (node) => {
    for (const ref of refs) {
      if (typeof ref === "function") ref(node);
      else if (ref != null) (ref as React.MutableRefObject<T | null>).current = node;
    }
  };
}

// =============================================================================
// Popover state
// =============================================================================

type PopoverState =
  | { type: "idle" }
  | { type: "adding"; partialFilter: PartialFilter }
  | { type: "editing"; filterIndex: number; partialFilter: PartialFilter };

// =============================================================================
// The default edit-popover body (field / operator selectors + value editor + footer).
// Ported from Astryx PowerSearchEditPopover, minus the deleted escapeStack + the deferred nested editor.
// =============================================================================

function DefaultEditor({
  config,
  filter: initialFilter,
  mode,
  onSave,
  onCancel,
  saveButtonLabel = "Apply",
  isReadOnly = false,
  timezoneID,
  size,
}: Omit<PowerSearchEditorProps, "config"> & { config: InternalConfig; size?: Size }) {
  const [partial, setPartial] = useState<PartialFilter>(initialFilter);
  const valueEditorRef = useRef<HTMLDivElement>(null);

  // Focus the first focusable inside the value editor after mount (the non-dialog focus placement).
  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      valueEditorRef.current
        ?.querySelector<HTMLElement>(
          'input:not([disabled]), button:not([disabled]), textarea:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])',
        )
        ?.focus();
    });
    return () => cancelAnimationFrame(frame);
  }, []);

  const currentOperator = partial.operator
    ? config.getOperator(partial.field, partial.operator)
    : undefined;

  const fieldOptions = useMemo(
    () => config.getVisibleFields().map((f) => ({ value: f.key, label: f.label })),
    [config],
  );
  const operatorOptions = useMemo(
    () => config.getVisibleOperators(partial.field).map((op) => ({ value: op.key, label: op.label })),
    [config, partial.field],
  );

  const handleFieldChange = useCallback(
    (fieldKey: string) => {
      const defOp = config.getDefaultOperator(fieldKey);
      setPartial({ field: fieldKey, operator: defOp?.key, value: undefined });
    },
    [config],
  );

  const handleOperatorChange = useCallback(
    (operatorKey: string) => {
      const newOp = config.getOperator(partial.field, operatorKey);
      const keep = !!newOp && !!currentOperator && newOp.value.type === currentOperator.value.type;
      setPartial((prev) => ({ ...prev, operator: operatorKey, value: keep ? prev.value : undefined }));
    },
    [config, partial.field, currentOperator],
  );

  const handleValueChange = useCallback(
    (value: FilterValue, shouldSave?: boolean) => {
      setPartial((prev) => {
        const updated = { ...prev, value };
        if (shouldSave && updated.field && updated.operator && updated.value) {
          onSave({ field: updated.field, operator: updated.operator, value: updated.value });
        }
        return updated;
      });
    },
    [onSave],
  );

  const handleSave = useCallback(() => {
    if (partial.field && partial.operator && partial.value) {
      onSave({ field: partial.field, operator: partial.operator, value: partial.value });
    }
  }, [partial, onSave]);

  const operatorValue = currentOperator?.value;
  const isEmptyType = operatorValue?.type === "empty";
  const isSaveDisabled = !partial.operator || !partial.value;

  // Boolean (empty) — auto-commit is_true/is_false on mount (no value to enter).
  useEffect(() => {
    if (isEmptyType && partial.field && partial.operator) {
      onSave({ field: partial.field, operator: partial.operator, value: { type: "empty" } });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isEmptyType, partial.field, partial.operator]);

  // Enter saves (Radix doesn't own Enter). Escape is owned by the DismissableLayer (the 2-level stack).
  const handleKeyDown = useCallback(
    (e: KeyboardEvent<HTMLDivElement>) => {
      if (e.key === "Enter" && !isSaveDisabled && !e.defaultPrevented) {
        e.preventDefault();
        handleSave();
      }
    },
    [isSaveDisabled, handleSave],
  );

  const showOperatorSelector = operatorOptions.length > 1 || !isEmptyType;

  return (
    // A named group gives SR users an "editing a filter" context on this non-modal popover (it is
    // deliberately NOT role="dialog" — the field combobox stays live behind it; [[power-search]]).
    <div className="rt-ds-powersearch-editor" role="group" aria-label="Edit filter" onKeyDown={handleKeyDown}>
      <div className="rt-ds-powersearch-editor-row">
        <div className="rt-ds-powersearch-editor-field">
          <Select value={partial.field} onValueChange={handleFieldChange} disabled={isReadOnly} size={size}>
            <Select.Trigger aria-label="Field" />
            <Select.Content>
              {fieldOptions.map((o) => (
                <Select.Item key={o.value} value={o.value}>
                  {o.label}
                </Select.Item>
              ))}
            </Select.Content>
          </Select>
        </div>
        {showOperatorSelector && operatorOptions.length > 0 && (
          <div className="rt-ds-powersearch-editor-op">
            <Select
              value={partial.operator ?? ""}
              onValueChange={handleOperatorChange}
              disabled={isReadOnly}
              size={size}
            >
              <Select.Trigger aria-label="Operator" placeholder="Operator" />
              <Select.Content>
                {operatorOptions.map((o) => (
                  <Select.Item key={o.value} value={o.value}>
                    {o.label}
                  </Select.Item>
                ))}
              </Select.Content>
            </Select>
          </div>
        )}
        {operatorValue && !isEmptyType && (
          <div ref={valueEditorRef} className="rt-ds-powersearch-editor-value">
            <PowerSearchValueEditor
              operatorValue={operatorValue}
              filterValue={partial.value}
              onChange={handleValueChange}
              onEnter={handleSave}
              config={config}
              isDisabled={isReadOnly}
              timezoneID={timezoneID}
              size={size}
            />
          </div>
        )}
      </div>
      {!isEmptyType && (
        <div className="rt-ds-powersearch-editor-footer">
          {!isReadOnly && mode === "edit" ? (
            <Button priority="tertiary" tone="danger" size={size} type="button" onClick={() => onSave(null)}>
              Delete
            </Button>
          ) : (
            <span />
          )}
          <div className="rt-ds-powersearch-editor-actions">
            <Button priority="tertiary" size={size} type="button" onClick={onCancel}>
              Cancel
            </Button>
            <Button priority="primary" size={size} type="button" onClick={handleSave} disabled={isSaveDisabled}>
              {saveButtonLabel}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

// =============================================================================
// PowerSearch
// =============================================================================

export function PowerSearch({
  config: configProp,
  filters,
  onChange,
  label,
  "aria-label": ariaLabelProp,
  placeholder = "Search…",
  readOnly = false,
  disabled = false,
  disabledReason,
  startIcon,
  onFocus,
  onBlur,
  validation,
  info,
  endSlot,
  description,
  maxTokenLength = 40,
  popoverSaveButtonLabel = "Apply",
  timezoneID,
  tokenOverflowBehavior = "none",
  endContent,
  resultCount,
  size,
  components: componentOverrides,
  handleRef,
  width,
  "data-testid": testId,
  ref,
}: PowerSearchProps) {
  const resolvedSize = (useResolvedSize<Size>("control", size) ?? "1") as Size;
  const config = useInternalConfig(configProp);
  const searchSource = usePowerSearchSource(config);
  const announce = useAnnounce();
  const dr = useDisabledReason({ disabled, disabledReason });

  const surfaceRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [popoverState, setPopoverState] = useState<PopoverState>({ type: "idle" });
  const [isFocusedWithin, setIsFocusedWithin] = useState(false);

  const isOpen = popoverState.type !== "idle";
  const canInteract = !readOnly && !dr.hardDisabled && !disabled;
  const groupName = typeof label === "string" ? label : ariaLabelProp ?? "Search";
  const isTruncated =
    !isFocusedWithin && !isOpen && tokenOverflowBehavior === "unfocusedInline" && filters.length > 0;

  useImperativeHandle(handleRef, () => ({
    focusTypeahead() {
      inputRef.current?.focus();
    },
    blurTypeahead() {
      inputRef.current?.blur();
    },
  }));

  // Nameless combobox = WCAG 4.1.2. Warn in DEV when neither `label` nor `aria-label` is present —
  // the same warning every other nameable control in this family carries (TextField, TextArea,
  // Typeahead, Tokenizer, NumberInput, Date/Time/DateRangeInput, CommandPalette). The fallback below
  // means this one is not literally nameless, so the message says what the fallback costs instead of
  // claiming a failure that is not there.
  useEffect(() => {
    if (DEV_WARN && label == null && ariaLabelProp == null) {
      console.warn(
        'PowerSearch: a field with no `label` needs `aria-label` for an accessible name (WCAG 4.1.2). ' +
          'It is falling back to the generic name "Search", which does not say what is being searched.',
      );
    }
  }, [label, ariaLabelProp]);

  // resultCount → announce politely on CHANGE only (skip the initial mount value).
  const prevResult = useRef(resultCount);
  useEffect(() => {
    if (resultCount == null || resultCount === prevResult.current) {
      prevResult.current = resultCount;
      return;
    }
    prevResult.current = resultCount;
    const msg =
      typeof resultCount === "number"
        ? `${new Intl.NumberFormat().format(resultCount)} ${resultCount === 1 ? "result" : "results"}`
        : String(resultCount);
    announce(msg);
  }, [resultCount, announce]);

  const closePopover = useCallback(() => {
    setPopoverState({ type: "idle" });
    // Refocus the field input on abandon (the non-dialog return path).
    requestAnimationFrame(() => inputRef.current?.focus());
  }, []);

  // Field pick from the typeahead → commit immediately (quick-add / boolean) or open the editor.
  const handleFieldPick = useCallback(
    (item: TypeaheadOption<PowerSearchAuxData> | null) => {
      if (!item || !canInteract) return;
      const aux = item.auxiliaryData;
      if (!aux) return;
      const field = config.getField(aux.fieldKey);
      if (!field) return;
      const operator = aux.operatorKey
        ? config.getOperator(aux.fieldKey, aux.operatorKey)
        : config.getDefaultOperator(aux.fieldKey);

      // Quick-add rows already carry a value (content search / "field is value").
      if (aux.filterValue && operator) {
        onChange(
          [...filters, { field: aux.fieldKey, operator: operator.key, value: aux.filterValue }],
          "add",
          filters.length,
        );
        announce(`Added ${field.label} filter`);
        return;
      }
      // Boolean (empty) operators need no editor.
      if (operator?.value.type === "empty") {
        onChange(
          [...filters, { field: aux.fieldKey, operator: operator.key, value: { type: "empty" } }],
          "add",
          filters.length,
        );
        announce(`Added ${field.label} filter`);
        return;
      }
      // Otherwise open the editor to build the value.
      setPopoverState({
        type: "adding",
        partialFilter: { field: aux.fieldKey, operator: operator?.key, value: undefined },
      });
    },
    [canInteract, config, filters, onChange, announce],
  );

  const removeFilter = useCallback(
    (index: number) => {
      if (!canInteract) return;
      const removed = filters[index];
      const field = config.getField(removed.field);
      onChange(
        filters.filter((_, i) => i !== index),
        "remove",
        index,
      );
      announce(`Removed ${field?.label ?? removed.field} filter`);
      requestAnimationFrame(() => inputRef.current?.focus());
    },
    [canInteract, filters, config, onChange, announce],
  );

  const openEdit = useCallback(
    (index: number) => {
      if (!canInteract) return;
      const filter = filters[index];
      if (filter.isReadOnly) return;
      setPopoverState({
        type: "editing",
        filterIndex: index,
        partialFilter: { field: filter.field, operator: filter.operator, value: filter.value },
      });
    },
    [canInteract, filters],
  );

  const handleSave = useCallback(
    (saved: PowerSearchFilter | null) => {
      if (popoverState.type === "adding") {
        if (saved) {
          onChange([...filters, saved], "add", filters.length);
          announce(`Added ${config.getField(saved.field)?.label ?? saved.field} filter`);
        }
      } else if (popoverState.type === "editing") {
        if (saved) {
          const next = [...filters];
          next[popoverState.filterIndex] = saved;
          onChange(next, "edit", popoverState.filterIndex);
        } else {
          onChange(
            filters.filter((_, i) => i !== popoverState.filterIndex),
            "remove",
            popoverState.filterIndex,
          );
        }
      }
      closePopover();
    },
    [popoverState, filters, onChange, announce, config, closePopover],
  );

  // Backspace on the EMPTY input removes the last filter (single-step, refocus input).
  const handleInputKeyDown = useCallback(
    (e: KeyboardEvent<HTMLInputElement>) => {
      if (!canInteract) return;
      if (e.key === "Backspace" && e.currentTarget.value === "" && filters.length > 0) {
        e.preventDefault();
        removeFilter(filters.length - 1);
      }
    },
    [canInteract, filters.length, removeFilter],
  );

  // Sweep each chip's remove ✕ out of the tab order → one tab stop per chip (the clickable body);
  // keyboard removal is Backspace/Delete on the focused body (Token [[token-chip]]). Mirrors Tokenizer ([[tokenizer-input]]).
  useLayoutEffect(() => {
    surfaceRef.current
      ?.querySelectorAll<HTMLElement>("[data-tk-chip] .rt-IconButton")
      .forEach((btn) => btn.setAttribute("tabindex", "-1"));
  }, [filters, isTruncated]);

  // ── Focus plumbing: track focus-within for overflow collapse + fire onFocus/onBlur at the boundary. ──
  const handleFocusCapture = useCallback(
    (e: FocusEvent<HTMLDivElement>) => {
      const fromOutside = !surfaceRef.current?.contains(e.relatedTarget as Node | null);
      setIsFocusedWithin(true);
      if (fromOutside) onFocus?.(e);
    },
    [onFocus],
  );
  const handleBlurCapture = useCallback(
    (e: FocusEvent<HTMLDivElement>) => {
      if (!surfaceRef.current?.contains(e.relatedTarget as Node | null)) {
        setIsFocusedWithin(false);
        onBlur?.(e);
      }
    },
    [onBlur],
  );

  const focusInput = useCallback(() => {
    if (canInteract) inputRef.current?.focus();
  }, [canInteract]);

  // ── Chips. ───────────────────────────────────────────────────────────────
  const chips = filters.map((filter, index) => {
    const field = config.getField(filter.field);
    const operator = config.getOperator(filter.field, filter.operator);
    const interactive = canInteract && !filter.isReadOnly;

    const TokenOverride = operator ? componentOverrides?.[operator.value.type]?.Token : undefined;
    if (TokenOverride && field && operator) {
      return (
        <TokenOverride
          key={`filter-${index}-${filter.field}-${filter.operator}`}
          config={configProp}
          filter={filter}
          field={field}
          operator={operator}
          maxLength={maxTokenLength}
          onClick={interactive ? () => openEdit(index) : undefined}
          onRemove={interactive ? () => removeFilter(index) : undefined}
          isDisabled={disabled}
        />
      );
    }

    const fieldLabel = field?.label ?? filter.field;
    const opLabel = operator?.label ? `: ${operator.label}` : "";
    const chipLabel = `${fieldLabel}${opLabel}`;
    const adjustedMax = Math.max(maxTokenLength - fieldLabel.length - (operator?.label?.length ?? 0), 10);
    const valueStr =
      operator && filter.value.type !== "empty"
        ? formatFilterValue(config, operator.value, filter.value, adjustedMax, timezoneID)
        : "";

    // Single-entity chips show the entity photo as the Token leading icon.
    let leadingIcon: ReactNode | undefined;
    if (
      filter.value.type === "entity_list" &&
      filter.value.value.length === 1 &&
      filter.value.value[0].photo
    ) {
      const entity = filter.value.value[0];
      leadingIcon = <Avatar src={entity.photo} alt={entity.label} fallback={entity.label.slice(0, 1)} size="xs" />;
    }

    return (
      <Token
        key={`filter-${index}-${filter.field}-${filter.operator}`}
        data-tk-chip=""
        size={resolvedSize}
        disabled={disabled}
        leadingIcon={leadingIcon}
        removeLabel={`Remove ${chipLabel}`}
        onClick={interactive ? () => openEdit(index) : undefined}
        onRemove={interactive ? () => removeFilter(index) : undefined}
      >
        {chipLabel}
        {valueStr ? (
          <>
            {" "}
            <span style={{ fontWeight: "var(--font-weight-bold)" }}>{valueStr}</span>
          </>
        ) : null}
      </Token>
    );
  });

  // ── The transient field combobox — embedded Typeahead (chrome-less, anchored to the surface). ──
  const inputControlProps = dr.soft
    ? {
        readOnly: true,
        "aria-disabled": true as const,
        "aria-describedby": dr.reasonId,
        "aria-invalid": undefined,
      }
    : readOnly
      ? { readOnly: true }
      : undefined;

  const embeddedInput = (
    <Typeahead<PowerSearchAuxData>
      embedded
      anchorRef={surfaceRef}
      inputRef={inputRef}
      source={searchSource}
      value={null}
      onValueChange={handleFieldPick}
      openOnFocus
      placeholder={filters.length === 0 ? placeholder : ""}
      icon={null}
      clearable={false}
      size={resolvedSize}
      disabled={dr.hardDisabled}
      controlProps={inputControlProps}
      inputCollapsed={isTruncated}
      onInputKeyDown={handleInputKeyDown}
      debounceMs={0}
      aria-label={label != null ? undefined : groupName}
    />
  );

  const leading =
    startIcon === null
      ? null
      : (
          <span
            aria-hidden
            className="rt-ds-powersearch-lead"
            style={{ display: "inline-flex", flexShrink: 0, color: "var(--ds-icon-neutral)" }}
          >
            {startIcon ?? <MagnifyingGlass weight="regular" />}
          </span>
        );

  const endNode = useMemo<ReactNode>(() => {
    let rc: ReactNode = null;
    if (resultCount != null) {
      const txt =
        typeof resultCount === "number"
          ? `${new Intl.NumberFormat().format(resultCount)} ${resultCount === 1 ? "result" : "results"}`
          : resultCount;
      rc = (
        // `rt-ds-powersearch-count` is the hook the tabular-figures rule targets (components.css):
        // the result count re-renders as filters are added and removed, at the right end of the
        // field, so proportional digits would shift it under a stationary cursor.
        <Text size="1" className="rt-ds-powersearch-count" style={{ color: "var(--ds-text-weak)", whiteSpace: "nowrap" }}>
          {txt}
        </Text>
      );
    }
    if (rc || endContent) {
      return (
        // Layout + the internal gap live in CSS (`.rt-ds-powersearch-end`) so every gap in the field is
        // declared from the same step of the space scale, in one place.
        <span className="rt-ds-powersearch-end">
          {rc}
          {endContent}
        </span>
      );
    }
    return null;
  }, [resultCount, endContent]);

  const surface = (
    <div
      ref={mergeRefs(ref, surfaceRef)}
      role="group"
      aria-label={groupName}
      aria-disabled={disabled || undefined}
      className="rt-ds-tokenizer rt-ds-powersearch"
      data-size={resolvedSize}
      data-disabled={disabled ? "" : undefined}
      data-testid={testId}
      onClick={focusInput}
      onFocusCapture={handleFocusCapture}
      onBlurCapture={handleBlurCapture}
    >
      {leading}
      {isTruncated ? (
        <OverflowList gap={1} collapseFrom="end" behavior="observeParent" label={null}>
          {chips}
        </OverflowList>
      ) : (
        chips
      )}
      {embeddedInput}
      {endNode}
      {dr.soft && (
        <span className="rt-ds-powersearch-reason" style={{ display: "inline-flex", flexShrink: 0 }}>
          <DisabledReasonGlyph size={resolvedSize === "3" ? 18 : 16} />
        </span>
      )}
    </div>
  );

  // ── The edit popover — one Radix Popover.Root anchored to the surface, non-dialog + 2-level Escape. ──
  const EditorOverride = useMemo(() => {
    if (popoverState.type === "idle") return undefined;
    const pf = popoverState.partialFilter;
    if (!pf.field || !pf.operator) return undefined;
    const op = config.getOperator(pf.field, pf.operator);
    return op ? componentOverrides?.[op.value.type]?.Editor : undefined;
  }, [popoverState, config, componentOverrides]);

  const popoverContent = (() => {
    if (popoverState.type === "idle") return null;
    const pf = popoverState.partialFilter;
    const mode = popoverState.type === "editing" ? "edit" : "create";
    const key =
      popoverState.type === "editing"
        ? `edit-${popoverState.filterIndex}-${pf.field}`
        : `add-${pf.field}`;
    if (EditorOverride) {
      return (
        <EditorOverride
          key={key}
          config={configProp}
          filter={pf}
          mode={mode}
          onSave={handleSave}
          onCancel={closePopover}
          saveButtonLabel={popoverSaveButtonLabel}
          isReadOnly={readOnly}
          timezoneID={timezoneID}
        />
      );
    }
    return (
      <DefaultEditor
        key={key}
        config={config}
        filter={pf}
        mode={mode}
        onSave={handleSave}
        onCancel={closePopover}
        saveButtonLabel={popoverSaveButtonLabel}
        isReadOnly={readOnly}
        timezoneID={timezoneID}
        size={resolvedSize}
      />
    );
  })();

  const effectiveDescription = dr.soft ? undefined : description;

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

  return (
    <>
      {width != null ? <Box style={{ width }}>{wrapped}</Box> : wrapped}
      <Popover.Root open={isOpen} onOpenChange={(o) => (o ? undefined : closePopover())}>
        <Popover.Anchor virtualRef={surfaceRef as React.RefObject<{ getBoundingClientRect(): DOMRect }>} />
        <Popover.Portal>
          {/* Non-dialog: role suppressed (the inner form controls carry the semantics), focus is ours to
              place (the editor's first field), and the anchor surface is exempt from outside-dismiss so a
              chip re-click swaps the editor instead of closing it. Escape is the DismissableLayer's — a
              nested Select is the inner layer (Escape #1), this popover the outer (Escape #2 → cancel). */}
          <Popover.Content
            asChild
            role="none"
            align="start"
            side="bottom"
            sideOffset={6}
            onOpenAutoFocus={(e) => e.preventDefault()}
            onCloseAutoFocus={(e) => e.preventDefault()}
            onEscapeKeyDown={() => closePopover()}
            onInteractOutside={(e) => {
              if (surfaceRef.current?.contains(e.target as Node)) e.preventDefault();
            }}
          >
            <Theme className={`rt-ds-powersearch-popover rt-r-size-${resolvedSize}`}>{popoverContent}</Theme>
          </Popover.Content>
        </Popover.Portal>
      </Popover.Root>
    </>
  );
}

PowerSearch.displayName = "PowerSearch";
