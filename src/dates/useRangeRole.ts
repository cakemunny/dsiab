/* useRangeRole — a range calendar that edits ONE end of a shared { start, end } value (Calendar `rangeRole`).
 * The role decides three things, and this module owns all three so Calendar.tsx only wires them in:
 *   1. the bounds a role may reach: a start role stops at the value's end, an end role at its start;
 *   2. the other end, which a hover previews the band back to;
 *   3. the value one click writes: that end moves, the other stays, and an empty value becomes a one-day range.
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
  /** The end this role does not edit: the value's end for a start role, its start for an end role. */
  otherEnd?: ISODateString;
}

/** Bounds and the other end for one role. With no role, the caller's min and max pass through unchanged. */
export function useRangeRole(
  role: RangeRole | undefined,
  value: DateRange | null | undefined,
  min: ISODateString | undefined,
  max: ISODateString | undefined,
): RangeRoleBounds {
  const start = value?.start;
  const end = value?.end;
  return useMemo<RangeRoleBounds>(() => {
    if (role === "start") {
      const bound = end && (!max || end < max) ? end : max;
      return { min, max: bound, otherEnd: end };
    }
    if (role === "end") {
      const bound = start && (!min || start > min) ? start : min;
      return { min: bound, max, otherEnd: start };
    }
    return { min, max };
  }, [role, start, end, min, max]);
}

/** The value after one click in a role calendar: that role's end moves to `iso`, the other end stays. */
export function applyRangeRole(
  role: RangeRole,
  iso: ISODateString,
  current: DateRange | null | undefined,
): DateRange {
  if (role === "start") return { start: iso, end: current?.end ?? iso };
  return { start: current?.start ?? iso, end: iso };
}

/** "July 9, 2026 to July 15, 2026": the long form a screen reader hears for a committed range. */
export function rangeSentence(range: DateRange): string {
  const start = plainDateFormat(plainDateFromISO(range.start), DATE_FORMAT_LONG);
  const end = plainDateFormat(plainDateFromISO(range.end), DATE_FORMAT_LONG);
  return `${start} to ${end}`;
}
