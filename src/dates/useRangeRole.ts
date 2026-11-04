/* useRangeRole — a range calendar that edits ONE end of a shared { start, end } value (Calendar `rangeRole`).
 * The role decides two things, and this module owns both so Calendar.tsx only wires them in:
 *   1. the bounds a role may reach: a start role stops at the value's end, an end role at its start;
 *   2. the value one click writes: that end moves, the other stays, and an empty value becomes a one-day range.
 * The hover preview is the value a click would write, so it reads `applyRangeRole` as well.
 * ISO YYYY-MM-DD strings sort as dates, so the bound comparisons below are plain string comparisons. */

import { useMemo } from "react";
import type { DateRange, ISODateString } from "./dateTypes";
import { DATE_FORMAT_LONG, plainDateFormat, plainDateFromISO } from "./plainDate";

export type RangeRole = "start" | "end";

export interface RangeRoleBounds {
  /** Earliest selectable day: the caller's min, or the other end for an end role. */
  min?: ISODateString;
  /** Latest selectable day: the caller's max, or the other end for a start role. */
  max?: ISODateString;
}

/**
 * Bounds for one role. With no role, the caller's min and max pass through unchanged. The other end bounds the
 * role only while it sits inside the caller's min and max: a value outside them would otherwise cross the two
 * bounds and disable every day, so the caller's bounds win and a click repairs the value.
 */
export function rangeRoleBounds(
  role: RangeRole | undefined,
  value: DateRange | null | undefined,
  min: ISODateString | undefined,
  max: ISODateString | undefined,
): RangeRoleBounds {
  const inside = (iso: ISODateString) => (!min || iso >= min) && (!max || iso <= max);
  if (role === "start" && value?.end && inside(value.end)) return { min, max: value.end };
  if (role === "end" && value?.start && inside(value.start)) return { min: value.start, max };
  return { min, max };
}

/** `rangeRoleBounds`, memoised on the values it reads. */
export function useRangeRole(
  role: RangeRole | undefined,
  value: DateRange | null | undefined,
  min: ISODateString | undefined,
  max: ISODateString | undefined,
): RangeRoleBounds {
  const start = value?.start;
  const end = value?.end;
  return useMemo(
    () => rangeRoleBounds(role, start && end ? { start, end } : undefined, min, max),
    [role, start, end, min, max],
  );
}

/**
 * The value after one click in a role calendar: that role's end moves to `iso`, the other end stays. A click past
 * the other end, which only a value outside the caller's bounds allows, gives a one-day range instead of a
 * reversed one.
 */
export function applyRangeRole(
  role: RangeRole,
  iso: ISODateString,
  current: DateRange | null | undefined,
): DateRange {
  if (role === "start") {
    const end = current?.end;
    return { start: iso, end: end && end >= iso ? end : iso };
  }
  const start = current?.start;
  return { start: start && start <= iso ? start : iso, end: iso };
}

/** "July 9, 2026 to July 15, 2026": the long form a screen reader hears for a committed range. */
export function rangeSentence(range: DateRange): string {
  const start = plainDateFormat(plainDateFromISO(range.start), DATE_FORMAT_LONG);
  const end = plainDateFormat(plainDateFromISO(range.end), DATE_FORMAT_LONG);
  return `${start} to ${end}`;
}
