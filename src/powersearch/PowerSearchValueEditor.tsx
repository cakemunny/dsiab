// Copyright (c) Meta Platforms, Inc. and affiliates.
// Portions derived from facebook/astryx packages/core/src/PowerSearch/PowerSearchValueEditor.tsx @ 88c95e4 (MIT, © Meta Platforms)

"use client";

/**
 * @file PowerSearchValueEditor.tsx
 * @input OperatorValue + its stored FilterValue + an onChange committer
 * @output The correct OUR input for the operator's value type, wired to commit the right FilterValue shape
 * @position Sub-component; consumed by the edit popover in PowerSearch.tsx
 *
 * B5 Step 2. Normalizations vs upstream:
 *   - Every editor is one of OUR Field-shell inputs (TextField, NumberInput, DateInput, TimeInput,
 *     DateRangeInput, Select, MultiSelect, Tokenizer, Typeahead) — never Astryx's TextInput/Selector.
 *   - Upstream's LOCAL `createStaticSource` copy (PowerSearchValueEditor.tsx:50-62) is COLLAPSED into the
 *     shared one exported from `Typeahead.tsx` (Rule-11 reuse).
 *   - `enum` / `enum_list` → our compound `Select` / `MultiSelect` (D2 option normalization); the two
 *     auto-commit types (`enum`, `date_relative`) fire `onChange(value, shouldSave=true)`.
 *   - `date_absolute` marshals unixSeconds ⇄ ISODateString; `date_range` marshals ABSOLUTE endpoints ⇄
 *     our `DateRange` ISO; `time` rides ISOTimeString.
 *   - `nested` is DEFERRED (D20 flat-AND-only) → renders nothing; `empty` (boolean) has no editor (the
 *     popover auto-commits is_true/is_false).
 */

import { useMemo, type ReactNode } from "react";
import type {
  OperatorValue,
  FilterValue,
  PowerSearchEntity,
  DateTimeRangePart,
} from "./types";
import type { InternalConfig } from "./useInternalConfig";
import type { ISODateString, DateRange } from "../dates/dateTypes";
import type { ISOTimeString } from "../dates/timeParser";
import { TextField } from "../components/ui/TextField";
import { NumberInput } from "../components/ui/NumberInput";
import { DateInput } from "../components/ui/DateInput";
import { TimeInput } from "../components/ui/TimeInput";
import { DateRangeInput } from "../components/ui/DateRangeInput";
import { Select } from "../components/ui/Select";
import { MultiSelect } from "../components/ui/MultiSelect";
import { Tokenizer } from "../components/ui/Tokenizer";
import {
  Typeahead,
  type TypeaheadOption,
  type TypeaheadSource,
} from "../components/ui/Typeahead";

type Size = "1" | "2" | "3";

export interface PowerSearchValueEditorProps {
  operatorValue: OperatorValue;
  filterValue: FilterValue | undefined;
  /** Commit the built FilterValue. `shouldSave` (auto-commit types) closes the popover on the same tick. */
  onChange: (value: FilterValue, shouldSave?: boolean) => void;
  /** Not consumed directly — Enter-to-save is handled at the popover container (Radix doesn't own Enter). */
  onEnter?: () => void;
  config: InternalConfig;
  isDisabled?: boolean;
  timezoneID?: string;
  size?: Size;
}

// =============================================================================
// Marshalling helpers — the model stores unix-seconds / ISO; our inputs speak ISO.
// =============================================================================

// A `date_absolute` filter is a CALENDAR DATE (no time-of-day) stored as unix seconds. We anchor it to
// LOCAL midnight so it round-trips through `formatFilterValue`, which renders in the LOCAL timezone by
// default (`Intl.DateTimeFormat` with no `timeZone`) — UTC midnight would print the PREVIOUS day in any
// negative-offset zone. Both directions use the LOCAL calendar fields so the picked day is the shown day.

/** unix seconds → "YYYY-MM-DD" using the LOCAL calendar date. */
function isoDateFromUnix(unixSeconds: number): ISODateString {
  const d = new Date(unixSeconds * 1000);
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}` as ISODateString;
}

/** "YYYY-MM-DD" → unix seconds at LOCAL midnight (the inverse of `isoDateFromUnix`). */
function unixFromIsoDate(iso: string): number {
  const [y, m, d] = iso.split("-").map(Number);
  return Math.floor(new Date(y, m - 1, d).getTime() / 1000);
}

/** The empty source used when a string_list / entity_list editor has no consumer `searchSource` —
 *  the Tokenizer's `creatable` path is the only way in (free-text tags). */
const EMPTY_SOURCE: TypeaheadSource = { search: () => [], bootstrap: () => [] };

// =============================================================================
// Per-type editors
// =============================================================================

function StringEditor({
  operatorValue,
  filterValue,
  onChange,
  size,
  isDisabled,
}: {
  operatorValue: OperatorValue & { type: "string" };
  filterValue: FilterValue | undefined;
  onChange: (value: FilterValue, shouldSave?: boolean) => void;
  size?: Size;
  isDisabled?: boolean;
}) {
  const current = filterValue?.type === "string" ? filterValue.value : "";

  // A `searchSource` upgrades the plain field to a suggesting Typeahead (#1103) — selecting commits.
  if (operatorValue.searchSource) {
    const selected: TypeaheadOption | null = current ? { id: current, label: current } : null;
    return (
      <Typeahead
        aria-label="Value"
        source={operatorValue.searchSource}
        value={selected}
        onValueChange={(item) =>
          item
            ? onChange({ type: "string", value: item.label }, true)
            : onChange({ type: "string", value: "" })
        }
        placeholder="Search…"
        size={size}
        disabled={isDisabled}
      />
    );
  }

  return (
    <TextField
      aria-label="Value"
      value={current}
      placeholder="Enter value…"
      size={size}
      disabled={isDisabled}
      onChange={(e) => onChange({ type: "string", value: e.target.value })}
    />
  );
}

function StringListEditor({
  operatorValue,
  filterValue,
  onChange,
  size,
  isDisabled,
}: {
  operatorValue: OperatorValue & { type: "string_list" };
  filterValue: FilterValue | undefined;
  onChange: (value: FilterValue) => void;
  size?: Size;
  isDisabled?: boolean;
}) {
  const value: TypeaheadOption[] = useMemo(
    () =>
      filterValue?.type === "string_list"
        ? filterValue.value.map((v) => ({ id: v, label: v }))
        : [],
    [filterValue],
  );

  const source = operatorValue.searchSource ?? EMPTY_SOURCE;
  // Free-text tags: creatable when there's no source, or when arbitrary strings are explicitly allowed.
  const creatable = operatorValue.isArbitraryStringAllowed || !operatorValue.searchSource;

  return (
    <Tokenizer
      aria-label="Values"
      source={source}
      value={value}
      creatable={creatable}
      onValueChange={(items) =>
        onChange({ type: "string_list", value: items.map((i) => i.label) })
      }
      placeholder="Add values…"
      size={size}
      disabled={isDisabled}
      debounceMs={operatorValue.searchSource ? 150 : 0}
    />
  );
}

function IntegerEditor({
  operatorValue,
  filterValue,
  onChange,
  size,
  isDisabled,
}: {
  operatorValue: OperatorValue & { type: "integer" };
  filterValue: FilterValue | undefined;
  onChange: (value: FilterValue) => void;
  size?: Size;
  isDisabled?: boolean;
}) {
  const current = filterValue?.type === "integer" ? filterValue.value : undefined;
  return (
    <NumberInput
      aria-label="Value"
      value={current}
      onValueChange={(value: number) => onChange({ type: "integer", value })}
      min={operatorValue.minValue}
      max={operatorValue.maxValue}
      units={operatorValue.units}
      isIntegerOnly
      placeholder="Enter number…"
      size={size}
      disabled={isDisabled}
    />
  );
}

function FloatEditor({
  operatorValue,
  filterValue,
  onChange,
  size,
  isDisabled,
}: {
  operatorValue: OperatorValue & { type: "float" };
  filterValue: FilterValue | undefined;
  onChange: (value: FilterValue) => void;
  size?: Size;
  isDisabled?: boolean;
}) {
  const current = filterValue?.type === "float" ? filterValue.value : undefined;
  return (
    <NumberInput
      aria-label="Value"
      value={current}
      onValueChange={(value: number) => onChange({ type: "float", value })}
      min={operatorValue.minValue}
      max={operatorValue.maxValue}
      units={operatorValue.units}
      placeholder="Enter number…"
      size={size}
      disabled={isDisabled}
    />
  );
}

function TimeEditor({
  operatorValue,
  filterValue,
  onChange,
  size,
  isDisabled,
}: {
  operatorValue: OperatorValue & { type: "time" };
  filterValue: FilterValue | undefined;
  onChange: (value: FilterValue) => void;
  size?: Size;
  isDisabled?: boolean;
}) {
  const current =
    filterValue?.type === "time" ? (filterValue.value as ISOTimeString) : undefined;
  return (
    <TimeInput
      aria-label="Time"
      value={current}
      onValueChange={(value) => {
        if (value != null) onChange({ type: "time", value });
      }}
      min={operatorValue.minValue as ISOTimeString | undefined}
      max={operatorValue.maxValue as ISOTimeString | undefined}
      size={size}
      disabled={isDisabled}
    />
  );
}

function DateAbsoluteEditor({
  filterValue,
  onChange,
  size,
  isDisabled,
}: {
  operatorValue: OperatorValue & { type: "date_absolute" };
  filterValue: FilterValue | undefined;
  onChange: (value: FilterValue) => void;
  size?: Size;
  isDisabled?: boolean;
}) {
  const current = useMemo(
    () =>
      filterValue?.type === "date_absolute"
        ? isoDateFromUnix(filterValue.unixSeconds)
        : undefined,
    [filterValue],
  );
  return (
    <DateInput
      aria-label="Date"
      value={current}
      onValueChange={(value) => {
        if (value != null) {
          onChange({ type: "date_absolute", unixSeconds: unixFromIsoDate(value) });
        }
      }}
      size={size}
      disabled={isDisabled}
    />
  );
}

function DateRelativeEditor({
  operatorValue,
  filterValue,
  onChange,
  size,
  isDisabled,
}: {
  operatorValue: OperatorValue & { type: "date_relative" };
  filterValue: FilterValue | undefined;
  onChange: (value: FilterValue, shouldSave?: boolean) => void;
  size?: Size;
  isDisabled?: boolean;
}) {
  const current = filterValue?.type === "date_relative" ? filterValue.value : undefined;

  // The N-days/weeks/months option ladder — the machine code `${amount}${unit[0]}_${direction}` is what
  // `formatFilterValue.formatRelativeDate` maps back to a human label ("7d_ago" → "7 days ago").
  const options = useMemo(() => {
    const result: { value: string; label: string }[] = [];
    const units = [
      { unit: "day", plural: "days", amounts: [1, 3, 7, 14, 30] },
      { unit: "week", plural: "weeks", amounts: [1, 2, 4] },
      { unit: "month", plural: "months", amounts: [1, 3, 6, 12] },
    ];
    for (const { unit, plural, amounts } of units) {
      for (const amount of amounts) {
        const noun = amount === 1 ? unit : plural;
        if (operatorValue.isPastAllowed !== false) {
          result.push({ value: `${amount}${unit[0]}_ago`, label: `${amount} ${noun} ago` });
        }
        if (operatorValue.isFutureAllowed !== false) {
          result.push({
            value: `${amount}${unit[0]}_from_now`,
            label: `${amount} ${noun} from now`,
          });
        }
      }
    }
    return result;
  }, [operatorValue.isPastAllowed, operatorValue.isFutureAllowed]);

  return (
    <Select
      value={current ?? ""}
      onValueChange={(value) => onChange({ type: "date_relative", value }, true)}
      size={size}
      disabled={isDisabled}
    >
      <Select.Trigger aria-label="Relative date" placeholder="Select…" />
      <Select.Content>
        {options.map((o) => (
          <Select.Item key={o.value} value={o.value}>
            {o.label}
          </Select.Item>
        ))}
      </Select.Content>
    </Select>
  );
}

function DateRangeEditor({
  filterValue,
  onChange,
  size,
  isDisabled,
}: {
  operatorValue: OperatorValue & { type: "date_range" };
  filterValue: FilterValue | undefined;
  onChange: (value: FilterValue) => void;
  size?: Size;
  isDisabled?: boolean;
}) {
  // Marshal ABSOLUTE endpoints ⇄ our {start,end} ISO range. NOW/RELATIVE endpoints don't round-trip
  // through an absolute picker (they resolve at filter time) — so a range with a non-ABSOLUTE endpoint
  // reads as "unset" here and the user re-picks absolute dates (parity with upstream's two-DateInput
  // editor, collapsed to our single range control).
  const value: DateRange | undefined = useMemo(() => {
    if (filterValue?.type !== "date_range") return undefined;
    const { start, end } = filterValue.value;
    if (start.type !== "ABSOLUTE" || end.type !== "ABSOLUTE") return undefined;
    return {
      start: isoDateFromUnix(start.unixSeconds),
      end: isoDateFromUnix(end.unixSeconds),
    };
  }, [filterValue]);

  return (
    <DateRangeInput
      aria-label="Date range"
      value={value}
      onValueChange={(range) => {
        if (!range) return;
        const start: DateTimeRangePart = {
          type: "ABSOLUTE",
          unixSeconds: unixFromIsoDate(range.start),
        };
        const end: DateTimeRangePart = {
          type: "ABSOLUTE",
          unixSeconds: unixFromIsoDate(range.end),
        };
        onChange({ type: "date_range", value: { start, end } });
      }}
      size={size}
      disabled={isDisabled}
    />
  );
}

function EnumEditor({
  operatorValue,
  filterValue,
  onChange,
  size,
  isDisabled,
}: {
  operatorValue: OperatorValue & { type: "enum" };
  filterValue: FilterValue | undefined;
  onChange: (value: FilterValue, shouldSave?: boolean) => void;
  size?: Size;
  isDisabled?: boolean;
}) {
  const current = filterValue?.type === "enum" ? filterValue.value : undefined;
  return (
    <Select
      value={current ?? ""}
      onValueChange={(value) => onChange({ type: "enum", value }, true)}
      size={size}
      disabled={isDisabled}
    >
      <Select.Trigger aria-label="Value" placeholder="Select…" />
      <Select.Content>
        {operatorValue.values.map((item) => (
          <Select.Item key={item.value} value={item.value}>
            {item.label}
          </Select.Item>
        ))}
      </Select.Content>
    </Select>
  );
}

function EnumListEditor({
  operatorValue,
  filterValue,
  onChange,
  size,
  isDisabled,
}: {
  operatorValue: OperatorValue & { type: "enum_list" };
  filterValue: FilterValue | undefined;
  onChange: (value: FilterValue) => void;
  size?: Size;
  isDisabled?: boolean;
}) {
  const current = useMemo(
    () => (filterValue?.type === "enum_list" ? [...filterValue.value] : []),
    [filterValue],
  );
  return (
    <MultiSelect
      aria-label="Value"
      placeholder="Select values…"
      value={current}
      onValueChange={(vals) => onChange({ type: "enum_list", value: vals })}
      size={size}
      disabled={isDisabled}
    >
      {operatorValue.values.map((item) => (
        <MultiSelect.Option key={item.value} value={item.value}>
          {item.label}
        </MultiSelect.Option>
      ))}
    </MultiSelect>
  );
}

function EntityListEditor({
  operatorValue,
  filterValue,
  onChange,
  size,
  isDisabled,
}: {
  operatorValue: OperatorValue & { type: "entity_list" };
  filterValue: FilterValue | undefined;
  onChange: (value: FilterValue) => void;
  size?: Size;
  isDisabled?: boolean;
}) {
  const source = operatorValue.searchSource ?? EMPTY_SOURCE;

  // Carry each entity's photo in `auxiliaryData` so it round-trips through the tokenizer (#1106).
  const value: TypeaheadOption<{ photo?: string }>[] = useMemo(() => {
    if (filterValue?.type !== "entity_list") return [];
    return filterValue.value.map((entity: PowerSearchEntity) => ({
      id: entity.id,
      label: entity.label,
      auxiliaryData: entity.photo ? { photo: entity.photo } : undefined,
    }));
  }, [filterValue]);

  return (
    <Tokenizer<{ photo?: string }>
      aria-label="Entities"
      source={source as TypeaheadSource<{ photo?: string }>}
      value={value}
      onValueChange={(items) =>
        onChange({
          type: "entity_list",
          value: items.map((item) => {
            const aux = item.auxiliaryData;
            return {
              id: item.id,
              label: item.label,
              ...(aux?.photo ? { photo: aux.photo } : {}),
            };
          }),
        })
      }
      placeholder="Search…"
      size={size}
      disabled={isDisabled}
      debounceMs={operatorValue.searchSource ? 150 : 0}
    />
  );
}

function CustomEditor({
  operatorValue,
  filterValue,
  onChange,
  isDisabled,
}: {
  operatorValue: OperatorValue & { type: "custom" };
  filterValue: FilterValue | undefined;
  onChange: (value: FilterValue) => void;
  isDisabled?: boolean;
}) {
  const current = filterValue?.type === "custom" ? filterValue.value : null;
  const Editor = operatorValue.Editor;
  return (
    <Editor
      isDisabled={isDisabled}
      onChange={(value) => {
        if (value != null) onChange({ type: "custom", value });
      }}
      placeholder="Enter value…"
      value={current}
    />
  );
}

// =============================================================================
// Dispatcher — operator value type → the OUR input that edits it.
// =============================================================================

export function PowerSearchValueEditor({
  operatorValue,
  filterValue,
  onChange,
  isDisabled,
  size,
}: PowerSearchValueEditorProps): ReactNode {
  switch (operatorValue.type) {
    case "empty":
      // Boolean is_true/is_false — no editor; the popover auto-commits {type:'empty'}.
      return null;
    case "string":
      return (
        <StringEditor
          operatorValue={operatorValue}
          filterValue={filterValue}
          onChange={onChange}
          size={size}
          isDisabled={isDisabled}
        />
      );
    case "string_list":
      return (
        <StringListEditor
          operatorValue={operatorValue}
          filterValue={filterValue}
          onChange={onChange}
          size={size}
          isDisabled={isDisabled}
        />
      );
    case "integer":
      return (
        <IntegerEditor
          operatorValue={operatorValue}
          filterValue={filterValue}
          onChange={onChange}
          size={size}
          isDisabled={isDisabled}
        />
      );
    case "float":
      return (
        <FloatEditor
          operatorValue={operatorValue}
          filterValue={filterValue}
          onChange={onChange}
          size={size}
          isDisabled={isDisabled}
        />
      );
    case "time":
      return (
        <TimeEditor
          operatorValue={operatorValue}
          filterValue={filterValue}
          onChange={onChange}
          size={size}
          isDisabled={isDisabled}
        />
      );
    case "date_absolute":
      return (
        <DateAbsoluteEditor
          operatorValue={operatorValue}
          filterValue={filterValue}
          onChange={onChange}
          size={size}
          isDisabled={isDisabled}
        />
      );
    case "date_relative":
      return (
        <DateRelativeEditor
          operatorValue={operatorValue}
          filterValue={filterValue}
          onChange={onChange}
          size={size}
          isDisabled={isDisabled}
        />
      );
    case "date_range":
      return (
        <DateRangeEditor
          operatorValue={operatorValue}
          filterValue={filterValue}
          onChange={onChange}
          size={size}
          isDisabled={isDisabled}
        />
      );
    case "enum":
      return (
        <EnumEditor
          operatorValue={operatorValue}
          filterValue={filterValue}
          onChange={onChange}
          size={size}
          isDisabled={isDisabled}
        />
      );
    case "enum_list":
      return (
        <EnumListEditor
          operatorValue={operatorValue}
          filterValue={filterValue}
          onChange={onChange}
          size={size}
          isDisabled={isDisabled}
        />
      );
    case "entity_list":
      return (
        <EntityListEditor
          operatorValue={operatorValue}
          filterValue={filterValue}
          onChange={onChange}
          size={size}
          isDisabled={isDisabled}
        />
      );
    case "custom":
      return (
        <CustomEditor
          operatorValue={operatorValue}
          filterValue={filterValue}
          onChange={onChange}
          isDisabled={isDisabled}
        />
      );
    case "nested":
      // Deferred (D20 flat-AND-only) — the model treats nested as passthrough.
      return null;
    default:
      return null;
  }
}

PowerSearchValueEditor.displayName = "PowerSearchValueEditor";
