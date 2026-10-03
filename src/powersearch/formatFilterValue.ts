// Copyright (c) Meta Platforms, Inc. and affiliates.
// Portions derived from facebook/astryx packages/core/src/PowerSearch/formatFilterValue.ts @ 88c95e4 (MIT, © Meta Platforms)

/**
 * @file formatFilterValue.ts
 * @input OperatorValue, FilterValue, config
 * @output Formatted display string for a filter value (drives token chips)
 * @position Pure utility; consumed by PowerSearch token rendering
 *
 * LIFTED from Astryx (`packages/core/src/PowerSearch/formatFilterValue.ts`) and made
 * the SINGLE formatter — it collapses upstream's two hand-synced renderers
 * (`formatFilterValue.ts` + the JSX token renderer in `PowerSearch.tsx`) into one
 * (Rule-11 reuse win). Two upstream stubs are fixed here:
 *   - BUG 1 `date_range`: upstream returned the literal string `'date range'`
 *     (formatFilterValue.ts:53-55, duplicated at PowerSearch.tsx:293-294). Now resolves
 *     each endpoint (NOW → "now", ABSOLUTE → formatted date, RELATIVE → "{n} {unit} ago")
 *     and renders "{start} – {end}" (en-dash).
 *   - BUG 2 `date_relative`: upstream rendered the raw machine code ("7d_ago"). Now maps
 *     the code back to its human label ("7 days ago").
 * Absolute-date marshalling reuses our date engine (`src/dates/plainDate`).
 */

import type { OperatorValue, FilterValue, EnumItem, DateTimeRangePart } from "./types";
import type { InternalConfig } from "./useInternalConfig";
import {
  plainDateFromInstant,
  plainDateFormat,
  DATE_FORMAT_SHORT_WITH_YEAR,
} from "../dates/plainDate";

function truncate(str: string, maxLength: number): string {
  if (str.length <= maxLength) {
    return str;
  }
  return str.slice(0, maxLength - 1) + "…";
}

function formatEnumLabel(
  value: string,
  enumValues: ReadonlyArray<EnumItem>,
): string {
  const item = enumValues.find((v) => v.value === value);
  return item?.label ?? value;
}

function formatNumber(value: number, units?: string): string {
  const formatted = new Intl.NumberFormat().format(value);
  return units ? `${formatted} ${units}` : formatted;
}

function formatDateAbsolute(unixSeconds: number, timezoneID?: string): string {
  const options: Intl.DateTimeFormatOptions = {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    ...(timezoneID ? { timeZone: timezoneID } : {}),
  };
  return new Intl.DateTimeFormat(undefined, options).format(unixSeconds * 1000);
}

// FIX BUG 2 — map the stored machine code back to its human label.
// The editor stores `${amount}${unit[0]}_${direction}` (e.g. "7d_ago", "1w_from_now",
// "3m_ago"); upstream `formatRelativeDate` echoed that raw code straight to the chip.
const RELATIVE_CODE_UNITS: Record<string, string> = {
  d: "day",
  w: "week",
  m: "month",
};

function formatRelativeDate(code: string): string {
  const match = /^(\d+)([a-z])_(ago|from_now)$/.exec(code);
  if (!match) {
    // Unrecognized shape — fall back to the raw stored value.
    return code;
  }
  const amount = Number(match[1]);
  const unit = RELATIVE_CODE_UNITS[match[2]];
  if (!unit) {
    return code;
  }
  const noun = amount === 1 ? unit : `${unit}s`;
  const direction = match[3] === "ago" ? "ago" : "from now";
  return `${amount} ${noun} ${direction}`;
}

// FIX BUG 1 — resolve a range endpoint to a human string.
function formatRangeAbsolute(unixSeconds: number, timezoneID?: string): string {
  const tz = timezoneID ?? Intl.DateTimeFormat().resolvedOptions().timeZone;
  const pd = plainDateFromInstant(unixSeconds * 1000, tz);
  return plainDateFormat(pd, DATE_FORMAT_SHORT_WITH_YEAR);
}

function formatRangePart(part: DateTimeRangePart, timezoneID?: string): string {
  switch (part.type) {
    case "NOW":
      return "now";
    case "ABSOLUTE":
      return formatRangeAbsolute(part.unixSeconds, timezoneID);
    case "RELATIVE": {
      if (part.backValue === 0) {
        return "now";
      }
      const noun = part.backValue === 1 ? part.unit : `${part.unit}s`;
      return `${part.backValue} ${noun} ago`;
    }
  }
}

function formatDateRange(
  value: { start: DateTimeRangePart; end: DateTimeRangePart },
  timezoneID?: string,
): string {
  const start = formatRangePart(value.start, timezoneID);
  const end = formatRangePart(value.end, timezoneID);
  return `${start} – ${end}`;
}

export function formatFilterValue(
  _config: InternalConfig,
  operatorValue: OperatorValue,
  filterValue: FilterValue,
  maxLength: number,
  timezoneID?: string,
): string {
  switch (filterValue.type) {
    case "empty":
      return "";

    case "string":
      return truncate(filterValue.value, maxLength);

    case "integer":
      return formatNumber(
        filterValue.value,
        operatorValue.type === "integer" ? operatorValue.units : undefined,
      );

    case "float":
      return formatNumber(
        filterValue.value,
        operatorValue.type === "float" ? operatorValue.units : undefined,
      );

    case "enum":
      if (operatorValue.type === "enum") {
        return truncate(
          formatEnumLabel(filterValue.value, operatorValue.values),
          maxLength,
        );
      }
      return truncate(filterValue.value, maxLength);

    case "string_list": {
      const items = filterValue.value;
      if (items.length === 0) {
        return "";
      }
      if (items.length === 1) {
        return truncate(items[0], maxLength);
      }
      const joined = items.join(", ");
      if (joined.length <= maxLength) {
        return joined;
      }
      return `${items.length} items`;
    }

    case "enum_list": {
      const items = filterValue.value;
      if (items.length === 0) {
        return "";
      }
      if (operatorValue.type === "enum_list") {
        const labels = items.map((v) => formatEnumLabel(v, operatorValue.values));
        if (labels.length === 1) {
          return truncate(labels[0], maxLength);
        }
        const joined = labels.join(", ");
        if (joined.length <= maxLength) {
          return joined;
        }
        return `${labels.length} items`;
      }
      if (items.length === 1) {
        return truncate(items[0], maxLength);
      }
      return `${items.length} items`;
    }

    case "entity_list": {
      const entities = filterValue.value;
      if (entities.length === 0) {
        return "";
      }
      if (entities.length === 1) {
        return truncate(entities[0].label, maxLength);
      }
      const joined = entities.map((e) => e.label).join(", ");
      if (joined.length <= maxLength) {
        return joined;
      }
      return `${entities.length} entities`;
    }

    case "time":
      return filterValue.value;

    case "date_absolute":
      return truncate(
        formatDateAbsolute(filterValue.unixSeconds, timezoneID),
        maxLength,
      );

    // FIX BUG 2 — human label, not the raw "7d_ago" machine code.
    case "date_relative":
      return truncate(formatRelativeDate(filterValue.value), maxLength);

    // FIX BUG 1 — real "{start} – {end}", not the literal string 'date range'.
    case "date_range":
      return truncate(formatDateRange(filterValue.value, timezoneID), maxLength);

    case "custom":
      if (operatorValue.type === "custom") {
        return truncate(operatorValue.getString(filterValue.value), maxLength);
      }
      return filterValue.value;

    case "nested": {
      const count = filterValue.value.length;
      return count === 1 ? "1 filter" : `${count} filters`;
    }

    default:
      return "";
  }
}
