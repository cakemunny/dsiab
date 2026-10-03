// Copyright (c) Meta Platforms, Inc. and affiliates.
// Portions derived from facebook/astryx packages/core/src/DateTimeInput/DateTimeInput.tsx @ 88c95e4 (MIT, © Meta Platforms)

import { forwardRef, useEffect, useState, type ReactNode } from "react";
import { Box } from "@radix-ui/themes";
import { useResolvedSize } from "../../theme/SizeContext";
import { FieldGroup, useFieldGroupControl } from "./Field";
import { DateInput } from "./DateInput";
import { TimeInput } from "./TimeInput";
import type { ISODateString } from "../../dates/dateTypes";
import { plainDateFromISO, plainDateFormat, DATE_FORMAT_LONG, DATE_FORMAT_SHORT } from "../../dates/plainDate";
import {
  type ISOTimeString,
  compareTime,
  formatDisplayTime12h,
  formatDisplayTime24h,
  formatISOTime,
} from "../../dates/timeParser";

/* DateTimeInput — a date AND a time under one group label, on the shared FieldGroup shell.
 *
 * Ported from Astryx (facebook/astryx `@astryxdesign/core` v0.1.4, commit 88c95e4) onto our system
 * (DECISIONS [[catalog-as-specification]], wave-3 [[light-and-dark-token-set]], [[date-time-input]]). It is a COMPOSITE (a GROUP of two sub-controls), NOT a single Field:
 * it EMBEDS the already-shipped `DateInput` ([[date-input]]) + `TimeInput` ([[time-input]]) in their BARE mode (no own label /
 * description / validation) inside a `FieldGroup.Root`, so the pair reads as one named group. Zero date/time
 * math is re-implemented here — split/combine at the `'T'` is the only new logic; parsing, formatting,
 * range/compare, the two-channel ephemeral feedback, and D8 soft-disable all come from the two children.
 *
 * WHY a FieldGroup composite, not a single Field ([[date-time-input]]):
 *   • Two sub-controls, not one — the name is a group LABEL (`FieldGroup.Label` → `aria-labelledby` on a
 *     `role="group"`), not a `<label htmlFor>` that would target a single control.
 *   • Each bare child carries its OWN `aria-label` ("Date" / the `timeLabel`) so the two inner inputs have
 *     DISTINCT accessible names + DISTINCT ids — no duplicate-id collision.
 *   • The duplicate-id dodge: a bare child renders its body at the top level (no self-owned `Field.Root`),
 *     and `useOptionalFieldControl` reads `FieldCtx`. Under a `FieldGroupCtx` there is NO `FieldCtx`, so it
 *     returns null — the children never try to adopt a shared field id. (Verified in the behavior suite.)
 *
 * TWO-TIER feedback:
 *   • Each embedded input keeps its OWN LOCAL ephemeral channel (assertive revert + aria-invalid-while-
 *     pending — [[date-input]]/[[time-input]]). The composite error is NEVER passed down as a sub-field `validation` prop (it
 *     would double-render).
 *   • The COMPOSITE STANDING problem (the combined value out of min/max, or a caller `validation`) surfaces
 *     ONCE via `FieldGroup.Message` (role="alert" on appearance) + the group's composite `aria-invalid`.
 *   • The proactive clamp HINT (the active time window on a boundary date) rides `FieldGroup.Description` as
 *     weak-neutral GUIDANCE — it never trips aria-invalid or the validation channel ([[disabled-reason]] guidance-not-error).
 *
 * The conditional time-clamp (the crux): the embedded TimeInput's effective min/max bite ONLY when the
 * selected date equals the boundary date (`timeMin = minTime iff selectedDate === minDate`; same for max).
 * When the date is strictly between the bounds, time is unconstrained. On a date change we re-clamp: landing
 * on minDate earlier than minTime SNAPS UP, on maxDate later than maxTime SNAPS DOWN (a silent snap, not an
 * error); and picking a date onto an EMPTY time auto-seeds the current wall-clock time, so a date selection
 * always combines with a time (never emits a date-only value).
 *
 * DEFERRED (named parks, NOT built): the `changeAction`/`isLoading` async-optimistic layer; InputGroup
 * composition; the fuller FieldGroup-message-describedby-INTO-subfields wiring (we ship the minimal
 * role="alert" + composite aria-invalid path).
 */

type Size = "1" | "2" | "3";
type Tone = "error" | "warning" | "success" | "info";
type Validation = { tone: Tone; message: ReactNode };
type HourFormat = "12h" | "24h";

/** ISO 8601 date-time string `YYYY-MM-DDTHH:MM[:SS]` — the composite wire value (date + time, joined at T). */
export type ISODateTimeString = string & { readonly __brand: "ISODateTimeString" };

/** Split a composite ISO value at the `'T'`. A `'T'`-less string is a bare date → `{ date, time: undefined }`. */
export function splitDateTime(v: ISODateTimeString | undefined): {
  date: ISODateString | undefined;
  time: ISOTimeString | undefined;
} {
  if (v == null) return { date: undefined, time: undefined };
  const i = v.indexOf("T");
  if (i === -1) return { date: (v || undefined) as ISODateString | undefined, time: undefined };
  const date = v.slice(0, i);
  const time = v.slice(i + 1);
  return {
    date: (date || undefined) as ISODateString | undefined,
    time: (time || undefined) as ISOTimeString | undefined,
  };
}

/** Combine a date + time into a composite ISO value. BOTH are required — a missing half yields `undefined`. */
export function combineDateTime(
  date: ISODateString | undefined,
  time: ISOTimeString | undefined,
): ISODateTimeString | undefined {
  if (!date || !time) return undefined;
  return `${date}T${time}` as ISODateTimeString;
}

function formatDisplayTime(iso: ISOTimeString, hourFormat: HourFormat, hasSeconds: boolean): string {
  return hourFormat === "24h" ? formatDisplayTime24h(iso, hasSeconds) : formatDisplayTime12h(iso, hasSeconds);
}

/** Human form of a composite bound for a standing message, e.g. "July 3, 2026 at 9:00 AM". */
function formatDateTime(v: ISODateTimeString, hourFormat: HourFormat, hasSeconds: boolean): string {
  const { date, time } = splitDateTime(v);
  const d = date ? plainDateFormat(plainDateFromISO(date), DATE_FORMAT_LONG) : "";
  const t = time ? formatDisplayTime(time, hourFormat, hasSeconds) : "";
  return t ? `${d} at ${t}` : d;
}

// Date-then-time compare against a bound. A date-only bound (no time) allows ANY time on the boundary date.
function combinedBeforeMin(combined: ISODateTimeString, min: ISODateTimeString | undefined): boolean {
  if (!min) return false;
  const c = splitDateTime(combined);
  const m = splitDateTime(min);
  if (!c.date || !m.date) return false;
  if (c.date < m.date) return true;
  if (c.date > m.date) return false;
  if (!m.time || !c.time) return false; // date-only lower bound → satisfied by any time on the date
  return compareTime(c.time, m.time) < 0;
}
function combinedAfterMax(combined: ISODateTimeString, max: ISODateTimeString | undefined): boolean {
  if (!max) return false;
  const c = splitDateTime(combined);
  const m = splitDateTime(max);
  if (!c.date || !m.date) return false;
  if (c.date > m.date) return true;
  if (c.date < m.date) return false;
  if (!m.time || !c.time) return false; // date-only upper bound → satisfied by any time on the date
  return compareTime(c.time, m.time) > 0;
}

export interface DateTimeInputProps {
  /** Controlled combined value — an ISO `YYYY-MM-DDTHH:MM[:SS]` string. `undefined` = empty. */
  value?: ISODateTimeString;
  /** Uncontrolled initial combined value (ISO). */
  defaultValue?: ISODateTimeString;
  /** Required. Fires with the combined ISO value (both halves present), or `undefined`. */
  onValueChange: (value: ISODateTimeString | undefined) => void;
  /** Earliest allowed instant (ISO date-time, or a bare date for a whole-day lower bound). */
  min?: ISODateTimeString;
  /** Latest allowed instant (ISO date-time, or a bare date for a whole-day upper bound). */
  max?: ISODateTimeString;
  /** Custom day-disable predicate forwarded to the embedded DateInput/Calendar (true = disabled). */
  isDateDisabled?: (date: ISODateString) => boolean;
  /** Include seconds in the time half (parse / display / increment). @default false */
  hasSeconds?: boolean;
  /** Display format for the time half. @default "12h" */
  hourFormat?: HourFormat;
  size?: Size;
  /** Required group name (rendered as the FieldGroup label, referenced by the group's aria-labelledby). */
  label: ReactNode;
  /** Optional inline affordance beside the group label (a tip icon / helper toggle). */
  info?: ReactNode;
  /** Optional pinned note at the far end of the label row. */
  endSlot?: ReactNode;
  /** Persistent helper line under the group. The proactive time-window HINT (on a boundary date) takes
   *  its place — the hint is guidance, weak-neutral, never an error. */
  description?: ReactNode;
  /** The COMPOSITE STANDING validation (a real problem the user must resolve). Sub-field ephemeral parse
   *  failures do NOT flow here — they announce + revert locally ([[date-input]]/[[time-input]]). */
  validation?: Validation;
  /** The embedded time field's accessible name. @default "Time" */
  timeLabel?: string;
  disabled?: boolean;
  /** D8 ([[disabled-reason]]): a non-empty reason SOFT-disables BOTH sub-fields (aria-disabled + readOnly + reason tooltip
   *  + glyph) instead of natively disabling, so the reason stays perceivable on hover AND keyboard focus. */
  disabledReason?: string;
  width?: number | string;
}

interface BodyProps {
  resolvedSize: Size;
  date: ISODateString | undefined;
  time: ISOTimeString | undefined;
  onDateChange: (date: ISODateString | undefined) => void;
  onTimeChange: (time: ISOTimeString | undefined) => void;
  minDate?: ISODateString;
  maxDate?: ISODateString;
  timeMin?: ISOTimeString;
  timeMax?: ISOTimeString;
  isDateDisabled?: (date: ISODateString) => boolean;
  hasSeconds: boolean;
  hourFormat: HourFormat;
  timeLabel: string;
  disabled?: boolean;
  disabledReason?: string;
  compositeInvalid: boolean;
  forwardedRef?: React.Ref<HTMLInputElement>;
}

// The group body — split out from the Root so it renders INSIDE FieldGroup.Root and can read the group aria
// (aria-labelledby / aria-describedby) via useFieldGroupControl. The composite aria-invalid is added on top:
// FieldGroup deliberately omits it for CheckboxGroup/RadioGroup (over-announces on N items), but a two-field
// date-time composite is small enough that a single group-level invalid is the minimal correct signal ([[date-time-input]]).
function DateTimeInputBody({
  resolvedSize,
  date,
  time,
  onDateChange,
  onTimeChange,
  minDate,
  maxDate,
  timeMin,
  timeMax,
  isDateDisabled,
  hasSeconds,
  hourFormat,
  timeLabel,
  disabled,
  disabledReason,
  compositeInvalid,
  forwardedRef,
}: BodyProps) {
  const groupAria = useFieldGroupControl();
  return (
    <div
      role="group"
      className="rt-ds-datetimeinput-group"
      {...groupAria}
      aria-invalid={compositeInvalid || undefined}
    >
      <div className="rt-ds-datetimeinput-row">
        <div className="rt-ds-datetimeinput-date">
          <DateInput
            ref={forwardedRef}
            aria-label="Date"
            value={date}
            onValueChange={onDateChange}
            min={minDate}
            max={maxDate}
            isDateDisabled={isDateDisabled}
            size={resolvedSize}
            disabled={disabled}
            disabledReason={disabledReason}
          />
        </div>
        <div className="rt-ds-datetimeinput-time">
          <TimeInput
            aria-label={timeLabel}
            value={time}
            onValueChange={onTimeChange}
            min={timeMin}
            max={timeMax}
            hasSeconds={hasSeconds}
            hourFormat={hourFormat}
            size={resolvedSize}
            disabled={disabled}
            disabledReason={disabledReason}
          />
        </div>
      </div>
    </div>
  );
}

export const DateTimeInput = forwardRef<HTMLInputElement, DateTimeInputProps>(function DateTimeInput(
  {
    value,
    defaultValue,
    onValueChange,
    min,
    max,
    isDateDisabled,
    hasSeconds = false,
    hourFormat = "12h",
    size,
    label,
    info,
    endSlot,
    description,
    validation,
    timeLabel = "Time",
    disabled,
    disabledReason,
    width,
  },
  ref,
) {
  const resolvedSize = (useResolvedSize<Size>("control", size) ?? "1") as Size;
  const isControlled = value !== undefined;

  // Internal buffer of the two halves. Held SEPARATELY from the combined wire value so a time typed before a
  // date (combine → undefined) still shows in the field. Seeded from the controlled value / defaultValue.
  const [buf, setBuf] = useState<{ date: ISODateString | undefined; time: ISOTimeString | undefined }>(() =>
    splitDateTime(isControlled ? value : defaultValue),
  );

  // Reconcile with an externally-changed controlled value (only when it names a real combined value that
  // differs from our current emission — our own emissions echo back equal, so this never loops on well-formed
  // ISO). `value === undefined` in controlled mode = empty and is left to the buffer, per the sibling convention.
  const emitted = combineDateTime(buf.date, buf.time);
  useEffect(() => {
    if (isControlled && value !== undefined && value !== emitted) setBuf(splitDateTime(value));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  const { date: minDate, time: minTime } = splitDateTime(min);
  const { date: maxDate, time: maxTime } = splitDateTime(max);

  // The conditional clamp: the time bound bites ONLY on the matching boundary date.
  const onMinBoundary = Boolean(minTime && minDate && buf.date === minDate);
  const onMaxBoundary = Boolean(maxTime && maxDate && buf.date === maxDate);
  const timeMin = onMinBoundary ? minTime : undefined;
  const timeMax = onMaxBoundary ? maxTime : undefined;

  const seedNow = (): ISOTimeString => {
    const now = new Date();
    return formatISOTime({ hour: now.getHours(), minute: now.getMinutes(), second: now.getSeconds() }, hasSeconds);
  };

  // Snap a time into the window of a specific date (silent — never an error): up onto minTime, down onto maxTime.
  const snapToBoundary = (t: ISOTimeString, d: ISODateString): ISOTimeString => {
    if (minTime && minDate && d === minDate && compareTime(t, minTime) < 0) return minTime;
    if (maxTime && maxDate && d === maxDate && compareTime(t, maxTime) > 0) return maxTime;
    return t;
  };

  const commit = (next: { date: ISODateString | undefined; time: ISOTimeString | undefined }) => {
    setBuf(next);
    onValueChange(combineDateTime(next.date, next.time));
  };

  const handleDateChange = (nextDate: ISODateString | undefined) => {
    if (nextDate === undefined) {
      // Date cleared → the combined value drops to undefined; the time half is kept in the buffer.
      commit({ date: undefined, time: buf.time });
      return;
    }
    // Auto-seed "now" onto an empty time so a date pick always combines with a time, then snap into the window.
    const seeded = buf.time ?? seedNow();
    commit({ date: nextDate, time: snapToBoundary(seeded, nextDate) });
  };

  const handleTimeChange = (nextTime: ISOTimeString | undefined) => {
    commit({ date: buf.date, time: nextTime });
  };

  // The proactive window HINT (guidance, not error) — only on a boundary date.
  let hint: ReactNode | undefined;
  if (buf.date && (onMinBoundary || onMaxBoundary)) {
    const day = plainDateFormat(plainDateFromISO(buf.date), DATE_FORMAT_SHORT);
    if (onMinBoundary && onMaxBoundary) {
      hint = `On ${day}, ${formatDisplayTime(minTime!, hourFormat, hasSeconds)}–${formatDisplayTime(maxTime!, hourFormat, hasSeconds)}.`;
    } else if (onMinBoundary) {
      hint = `On ${day}, times from ${formatDisplayTime(minTime!, hourFormat, hasSeconds)} are available.`;
    } else {
      hint = `On ${day}, times until ${formatDisplayTime(maxTime!, hourFormat, hasSeconds)} are available.`;
    }
  }
  const effectiveDescription = hint ?? description;

  // The COMPOSITE STANDING channel: a caller validation, else a combined value out of min/max. Sub-field
  // ephemeral parse failures never reach here (they announce + revert locally, [[date-input]]/[[time-input]]).
  const combined = combineDateTime(buf.date, buf.time);
  const outOfRange =
    combined !== undefined && (combinedBeforeMin(combined, min) || combinedAfterMax(combined, max));
  const compositeStanding: Validation | undefined =
    validation ??
    (outOfRange
      ? {
          tone: "error",
          message: combinedBeforeMin(combined!, min)
            ? `Choose a date and time on or after ${formatDateTime(min!, hourFormat, hasSeconds)}.`
            : `Choose a date and time on or before ${formatDateTime(max!, hourFormat, hasSeconds)}.`,
        }
      : undefined);

  const wrapped = (
    <FieldGroup.Root validation={compositeStanding} description={effectiveDescription} size={resolvedSize}>
      <FieldGroup.Label info={info} endSlot={endSlot}>
        {label}
      </FieldGroup.Label>
      <DateTimeInputBody
        resolvedSize={resolvedSize}
        date={buf.date}
        time={buf.time}
        onDateChange={handleDateChange}
        onTimeChange={handleTimeChange}
        minDate={minDate}
        maxDate={maxDate}
        timeMin={timeMin}
        timeMax={timeMax}
        isDateDisabled={isDateDisabled}
        hasSeconds={hasSeconds}
        hourFormat={hourFormat}
        timeLabel={timeLabel}
        disabled={disabled}
        disabledReason={disabledReason}
        compositeInvalid={compositeStanding?.tone === "error"}
        forwardedRef={ref}
      />
      {effectiveDescription != null && <FieldGroup.Description>{effectiveDescription}</FieldGroup.Description>}
      <FieldGroup.Message />
    </FieldGroup.Root>
  );

  return width != null ? <Box style={{ width }}>{wrapped}</Box> : wrapped;
});
