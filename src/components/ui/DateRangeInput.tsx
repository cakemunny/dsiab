import {
  forwardRef,
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
  type KeyboardEvent,
  type ReactNode,
} from "react";
import * as Popover from "@radix-ui/react-popover";
import { Box, Theme, VisuallyHidden } from "@radix-ui/themes";
import { CalendarBlank, X } from "@phosphor-icons/react";
import { useResolvedSize } from "../../theme/SizeContext";
import {
  Field,
  useOptionalFieldControl,
  useDisabledReason,
  DisabledReasonTooltip,
  DisabledReasonGlyph,
} from "./Field";
import { IconButton } from "./IconButton";
import { Button } from "./Button";
import { Calendar } from "./Calendar";
import type { DateRange, ISODateString } from "../../dates/dateTypes";
import { plainDateFromISO, plainDateToDate, plainDateFormat, DATE_FORMAT_LONG } from "../../dates/plainDate";

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

/* DateRangeInput — a range date picker: a single button trigger opening a DIALOG that hosts a preset
 * sidebar beside a two-month range Calendar ([[date-range-input]]). It is the range sibling of DateInput ([[date-input]]) but takes a
 * DIFFERENT shape at both ends:
 *
 *   • The TRIGGER reuses the MultiSelect/Select `.rt-SelectTrigger` chrome (surface fill + border + the
 *     accent focus ring of [[focus-ring]] for free) — NOT a free-text field: a range is entered by picking, and the
 *     keyboard-first exact-entry alternative is two DateInputs in a FieldGroup (a named deferral below).
 *     A leading `CalendarBlank` glyph identifies it; there is deliberately **NO caret** — a caret signals a
 *     dropdown, but this opens a picking DIALOG (`aria-haspopup="dialog"`, not `listbox`).
 *   • The POPOVER reuses DateInput's mechanism verbatim: `<Theme>`-wrapped `Popover.Content asChild`, the
 *     COMPOUND `.radix-themes.rt-ds-daterange-panel` selector on the pre-bundled `@radix-ui/react-popover`,
 *     Radix's `role="dialog"` KEPT (named "Choose date range"), and `onOpenAutoFocus` moving focus INTO the
 *     grid's roving day so the range calendar is immediately keyboard-operable (WCAG 2.1.1 — the Calendar
 *     uses real roving-tabindex focus, so keeping focus outside would leave the grid inoperable).
 *
 * The PRESET SIDEBAR is a `role="group"` of ghost `Button`s in normal Tab order (NOT a listbox — presets
 * are shortcuts, not the selection surface): the ACTIVE preset (its `getRange()` equals the current value)
 * carries `aria-current="true"` and paints from `--ds-fill-selected-subtle` (a5, the [[calendar-grid]] committed-BAND
 * tier) + `--ds-text-strong` — deliberately NOT `--ds-fill-selected` (a9), which would fight the calendar's
 * own a9 range endpoints in the same dialog; the a5 band tier ties the preset to the RANGE it produces.
 * Clicking a preset drives the Calendar's controlled value + focusDate (so the grid SHOWS the range) and
 * KEEPS THE DIALOG OPEN — a deliberate divergence from DateInput's day-select-closes: a range benefits from
 * confirm/refine (a trailing "Done" button, Escape, or outside-click close it).
 *
 * API normalization (D2): `value?: DateRange` ({start,end} ISO), a required `onValueChange(v | undefined)`
 * (`undefined` = empty — the `null` upstream carries is normalized to `undefined` at this boundary), ISO
 * strings on the wire. Reuses Calendar (range mode, [[calendar-grid]]) / the MultiSelect-trigger chrome / the DateInput
 * popover mechanism / Button / IconButton / Field / D8 ([[disabled-reason]]) / the lifted plainDate formatters — the only
 * earned net-new is the panel + preset-column + active-preset CSS, `isRangeEqual`, and the Intl formatter.
 *
 * DEFERRED (named parks, NOT built): the `changeAction` async-optimistic layer + `isLoading`/Spinner; a
 * live-partial-range echoed into the trigger while picking (would need exposing Calendar's internal anchor —
 * a net-new Calendar affordance; in-progress range lives in the grid preview, [[calendar-grid]]); InputGroup composition;
 * and — the reuse-alternative for keyboard-first EXACT-date range entry — two `DateInput`s in a `FieldGroup`
 * (no bespoke range text-parser).
 */

type Size = "1" | "2" | "3";
type Tone = "error" | "warning" | "success" | "info";
type Validation = { tone: Tone; message: ReactNode };

/** One preset shortcut — a label plus a factory that computes its {start,end} range on demand (so
 *  relative ranges like "Last 7 days" resolve against the current clock each time the dialog opens). */
export interface DateRangePreset {
  label: string;
  getRange: () => DateRange;
}

export interface DateRangeInputProps {
  /** Controlled selected range ({start,end} ISO YYYY-MM-DD). */
  value?: DateRange;
  /** Uncontrolled initial range. */
  defaultValue?: DateRange;
  /** Required. Fires with the committed {start,end} range, or `undefined` when cleared. */
  onValueChange: (value: DateRange | undefined) => void;
  /** Earliest selectable date (ISO); earlier dates are disabled in the calendar. */
  min?: ISODateString;
  /** Latest selectable date (ISO); later dates are disabled in the calendar. */
  max?: ISODateString;
  /** Custom disable predicate — receives an ISO date, returns **true to disable** (forwarded to Calendar). */
  isDateDisabled?: (date: ISODateString) => boolean;
  /** Show 1 or 2 months side by side in the popover. @default 2 */
  numberOfMonths?: 1 | 2;
  /** Shortcut ranges rendered as a preset sidebar (role="group" of Tab-order ghost buttons). */
  presets?: ReadonlyArray<DateRangePreset>;
  /** Greyed hint while empty. @default "Select dates" */
  placeholder?: string;
  /** A trailing clear ✕ (out of the tab order, [[field-family-anatomy]]) + Backspace/Delete parity while a value is set. @default true */
  hasClear?: boolean;
  size?: Size;
  /** Field label — pass none of label / description / validation to keep the control bare. */
  label?: ReactNode;
  /** Optional inline affordance beside the label. */
  info?: ReactNode;
  /** Optional pinned note at the far end of the label row. */
  endSlot?: ReactNode;
  /** Persistent helper line under the trigger — calm guidance that holds in any validation state. */
  description?: ReactNode;
  /** A STANDING validation state (a real problem the user must resolve). */
  validation?: Validation;
  disabled?: boolean;
  /** D8 ([[disabled-reason]]): a non-empty reason SOFT-disables (aria-disabled + reason tooltip + glyph) instead of
   *  natively disabling, so the reason stays perceivable on hover AND keyboard focus. */
  disabledReason?: string;
  width?: number | string;
  /** Accessible name for a BARE trigger (no `label`). One of `label` / `aria-label` / `aria-labelledby`
   *  is required — a nameless control fails WCAG 4.1.2 (a `placeholder` is not a name). */
  "aria-label"?: string;
  "aria-labelledby"?: string;
}

/* ---- helpers ------------------------------------------------------------- */

/** Two ranges are equal when both endpoints match (ISO strings compare directly). Drives the active-preset
 *  `aria-current` — a preset is active iff its `getRange()` equals the committed value. */
export function isRangeEqual(a: DateRange, b: DateRange): boolean {
  return a.start === b.start && a.end === b.end;
}

const formatLongISO = (iso: ISODateString): string => plainDateFormat(plainDateFromISO(iso), DATE_FORMAT_LONG);

/** Smart display format for the trigger — `Intl.DateTimeFormat.formatRange` drops repeated parts
 *  locale-correctly. Same-year drops the year; cross-year keeps it; start==end collapses to a single date;
 *  the separator is a spaced en dash (U+2013). */
function formatRangeDisplay(range: DateRange): string {
  const start = plainDateFromISO(range.start);
  const end = plainDateFromISO(range.end);
  const crossYear = start.year !== end.year;
  const opts: Intl.DateTimeFormatOptions = crossYear
    ? { month: "short", day: "numeric", year: "numeric" }
    : { month: "short", day: "numeric" };
  const dtf = new Intl.DateTimeFormat(undefined, opts);
  const startDate = plainDateToDate(start);
  const endDate = plainDateToDate(end);
  if (range.start === range.end) return dtf.format(startDate);
  if (typeof dtf.formatRange === "function") return dtf.formatRange(startDate, endDate);
  // Fallback for engines without formatRange — compose with the spaced en dash.
  return `${dtf.format(startDate)} – ${dtf.format(endDate)}`;
}

/** Unambiguous full-form readout for the trigger's accessible value — "July 3 to July 10, 2026" — so the
 *  en dash is never mis-announced by a screen reader (the word "to", never the glyph). */
function formatRangeSR(range: DateRange): string {
  const start = plainDateFromISO(range.start);
  const end = plainDateFromISO(range.end);
  if (range.start === range.end) return formatLongISO(range.start);
  const crossYear = start.year !== end.year;
  const startFmt = crossYear
    ? formatLongISO(range.start) // "December 30, 2025"
    : plainDateFormat(start, { month: "long", day: "numeric" }); // "July 3"
  return `${startFmt} to ${formatLongISO(range.end)}`;
}

/** True when either endpoint violates the constraints (the STANDING validation trigger). */
function rangeOutOfBounds(
  range: DateRange,
  min?: ISODateString,
  max?: ISODateString,
  isDateDisabled?: (date: ISODateString) => boolean,
): boolean {
  return [range.start, range.end].some(
    (iso) => (min && iso < min) || (max && iso > max) || Boolean(isDateDisabled?.(iso)),
  );
}

/** Standing-error copy for a committed range that violates min/max (the validation channel). */
function outOfRangeMessage(range: DateRange, min?: ISODateString, max?: ISODateString): string {
  if (min && (range.start < min || range.end < min)) return `Choose dates on or after ${formatLongISO(min)}.`;
  if (max && (range.start > max || range.end > max)) return `Choose dates on or before ${formatLongISO(max)}.`;
  return "Those dates aren’t available.";
}

/* ---- the control body (renders INSIDE Field.Root, reads field aria) ------- */

interface BodyProps {
  resolvedSize: Size;
  value: DateRange | undefined;
  onValueChange: (value: DateRange | undefined) => void;
  min?: ISODateString;
  max?: ISODateString;
  isDateDisabled?: (date: ISODateString) => boolean;
  numberOfMonths: 1 | 2;
  presets?: ReadonlyArray<DateRangePreset>;
  placeholder: string;
  hasClear: boolean;
  disabled?: boolean;
  disabledReason?: string;
  ariaLabel?: string;
  ariaLabelledby?: string;
  forwardedRef?: React.Ref<HTMLButtonElement>;
}

function DateRangeInputBody({
  resolvedSize,
  value,
  onValueChange,
  min,
  max,
  isDateDisabled,
  numberOfMonths,
  presets,
  placeholder,
  hasClear,
  disabled,
  disabledReason,
  ariaLabel,
  ariaLabelledby,
  forwardedRef,
}: BodyProps) {
  const aria = useOptionalFieldControl();
  const dr = useDisabledReason({ disabled, disabledReason });

  const dialogId = useId();
  const triggerRef = useRef<HTMLButtonElement>(null);
  const anchorRef = useRef<HTMLSpanElement>(null);

  const [open, setOpen] = useState(false);
  // Controlled focused day for the popover Calendar — driven so a preset click navigates the grid to the
  // new range's start, and kept in sync as the calendar's own keyboard nav moves the roving day.
  const [focusDate, setFocusDate] = useState<ISODateString | undefined>(value?.start);

  const setTriggerRef = useCallback(
    (node: HTMLButtonElement | null) => {
      triggerRef.current = node;
      if (typeof forwardedRef === "function") forwardedRef(node);
      else if (forwardedRef) (forwardedRef as React.MutableRefObject<HTMLButtonElement | null>).current = node;
    },
    [forwardedRef],
  );

  const openPopover = useCallback(() => {
    if (disabled) return; // soft OR hard: bail ([[disabled-reason]] consumer contract — handlers early-return while soft)
    setFocusDate(value?.start); // land the calendar on the range's start month (undefined ⇒ today)
    setOpen(true);
  }, [disabled, value]);

  const closePopover = useCallback((refocus = true) => {
    setOpen(false);
    if (refocus) triggerRef.current?.focus();
  }, []);

  const handleTriggerClick = useCallback(() => {
    if (disabled) return;
    if (open) closePopover();
    // Opening moves focus INTO the grid via onOpenAutoFocus (so arrow-nav works); do NOT refocus the
    // trigger here or it would yank focus back out of the calendar.
    else openPopover();
  }, [disabled, open, closePopover, openPopover]);

  const handleClear = useCallback(() => {
    if (disabled) return;
    if (value !== undefined) onValueChange(undefined);
    triggerRef.current?.focus();
  }, [disabled, value, onValueChange]);

  // The ✕ is out of the tab order ([[field-family-anatomy]]) — Backspace/Delete on the focused trigger is its keyboard parity.
  const onTriggerKeyDown = useCallback(
    (e: KeyboardEvent<HTMLButtonElement>) => {
      if (disabled) return;
      if (hasClear && value !== undefined && (e.key === "Backspace" || e.key === "Delete")) {
        e.preventDefault();
        handleClear();
      }
    },
    [disabled, hasClear, value, handleClear],
  );

  // A committed range from the calendar (two clicks) fires immediately; the dialog STAYS OPEN (confirm/
  // refine) — Done / Escape / outside-click close it. The clicked endpoint keeps grid focus (Calendar
  // syncs focusDate back via onFocusDateChange), so we do NOT force focusDate here.
  const handleCalendarChange = useCallback(
    (range: DateRange) => {
      onValueChange(range);
    },
    [onValueChange],
  );

  // A preset click commits its range, drives the calendar to show it, and KEEPS THE DIALOG OPEN. Focus
  // stays on the preset button (a controlled focusDate change navigates the VIEW without stealing DOM
  // focus), so aria-current updates announce the active preset while the grid reflects the range.
  const handlePreset = useCallback(
    (range: DateRange) => {
      onValueChange(range);
      setFocusDate(range.start);
    },
    [onValueChange],
  );

  // aria-describedby MERGES the field-level id (validation / description) with the D8 reason id.
  const describedBy =
    [aria?.["aria-describedby"], dr.soft ? dr.reasonId : undefined].filter(Boolean).join(" ") || undefined;
  // aria-invalid comes only from the Field validation channel (no free-text parse ⇒ no ephemeral channel);
  // never set while soft-disabled (a reason is guidance, not an error, [[disabled-reason]]).
  const ariaInvalid = dr.soft ? undefined : aria?.["aria-invalid"];

  // Soft ⇒ aria-disabled only (readOnly is meaningless on a <button>; the reason skin is re-applied via the
  // [data-disabled-reason] wrapper hook in components.css). Hard ⇒ native disabled.
  const disabledAttrs = dr.soft
    ? ({ "aria-disabled": true } as const)
    : dr.hardDisabled
      ? ({ disabled: true } as const)
      : {};

  const glyphSize = resolvedSize === "3" ? 18 : 16;
  const showClear = hasClear && !disabled && value !== undefined;
  const reserveTrailing = showClear || dr.showGlyph;

  // A bare trigger (no field label) is named by aria-label; fold the value into it so a screen reader still
  // announces the current range (aria-label otherwise clobbers the trigger's text content). A LABELLED
  // trigger leaves aria-label undefined so the Field label + the VisuallyHidden full-form both read.
  const buttonAriaLabel = ariaLabel
    ? value !== undefined
      ? `${ariaLabel}, ${formatRangeSR(value)}`
      : ariaLabel
    : undefined;

  return (
    <Popover.Root open={open} onOpenChange={(o) => (o ? openPopover() : closePopover(false))}>
      <Popover.Anchor asChild>
        <span
          ref={anchorRef}
          className="rt-ds-select-affix rt-ds-daterange-affix"
          style={{ position: "relative", display: "block" }}
        >
          <span aria-hidden className="rt-ds-select-lead" style={{ color: "var(--ds-icon-neutral)" }}>
            <CalendarBlank weight="regular" />
          </span>
          <DisabledReasonTooltip {...dr.tooltip}>
            <button
              type="button"
              ref={setTriggerRef}
              className={`rt-reset rt-SelectTrigger rt-r-size-${resolvedSize} rt-variant-surface`}
              data-leading-icon=""
              data-clearable={reserveTrailing ? "" : undefined}
              data-placeholder={value === undefined ? "" : undefined}
              data-state={open ? "open" : "closed"}
              aria-haspopup="dialog"
              aria-expanded={open}
              aria-controls={open ? dialogId : undefined}
              aria-label={buttonAriaLabel}
              aria-labelledby={ariaLabelledby}
              id={aria?.id}
              aria-describedby={describedBy}
              aria-invalid={ariaInvalid}
              {...disabledAttrs}
              onClick={handleTriggerClick}
              onKeyDown={onTriggerKeyDown}
            >
              <span className="rt-SelectTriggerInner">
                {value !== undefined ? (
                  <>
                    <span aria-hidden="true">{formatRangeDisplay(value)}</span>
                    <VisuallyHidden>{formatRangeSR(value)}</VisuallyHidden>
                  </>
                ) : (
                  placeholder
                )}
              </span>
            </button>
          </DisabledReasonTooltip>
          {showClear && (
            <span className="rt-ds-select-clear">
              <IconButton
                inset
                size="1"
                aria-label="Clear dates"
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
            </span>
          )}
          {dr.showGlyph && (
            <span className="rt-ds-select-clear">
              <DisabledReasonGlyph size={glyphSize} />
            </span>
          )}
        </span>
      </Popover.Anchor>
      <Popover.Portal>
        {/* The primitive Popover portals to <body>, OUTSIDE the .radix-themes root, so the Radix token
            scales would not resolve — wrap in Theme (as the Content element, asChild) to re-propagate. We
            KEEP Radix's hardcoded role="dialog" (named "Choose date range") and move focus INTO the grid's
            roving day on open (onOpenAutoFocus) so the range calendar is keyboard-operable (WCAG 2.1.1);
            onCloseAutoFocus is prevented and Escape returns focus to the trigger; interacting with the
            anchor is exempt from outside-dismiss. */}
        <Popover.Content
          asChild
          align="start"
          sideOffset={4}
          onOpenAutoFocus={(e) => {
            e.preventDefault();
            requestAnimationFrame(() =>
              document
                .getElementById(dialogId)
                ?.querySelector<HTMLElement>('button.rt-ds-calendar-day[tabindex="0"]')
                ?.focus(),
            );
          }}
          onCloseAutoFocus={(e) => e.preventDefault()}
          onEscapeKeyDown={() => triggerRef.current?.focus()}
          onInteractOutside={(e) => {
            if (anchorRef.current?.contains(e.target as Node)) e.preventDefault();
          }}
        >
          <Theme
            id={dialogId}
            aria-label="Choose date range"
            className={`rt-ds-daterange-panel rt-r-size-${resolvedSize}`}
          >
            <div className="rt-ds-daterange-layout">
              <div className="rt-ds-daterange-body">
                {presets && presets.length > 0 && (
                  // Presets are plain Tab-order buttons in a role="group" — NOT a listbox (they are
                  // shortcuts, not the selection surface, so no aria-selected/roving). The active preset
                  // carries aria-current="true" (the string, not "date").
                  <div role="group" aria-label="Date range presets" className="rt-ds-daterange-presets">
                    {presets.map((p) => {
                      const range = p.getRange();
                      const active = value != null && isRangeEqual(range, value);
                      return (
                        <Button
                          key={p.label}
                          type="button"
                          priority="tertiary"
                          size={resolvedSize}
                          className="rt-ds-daterange-preset"
                          aria-current={active ? "true" : undefined}
                          onClick={() => handlePreset(range)}
                        >
                          {p.label}
                        </Button>
                      );
                    })}
                  </div>
                )}
                <Calendar
                  mode="range"
                  value={value}
                  onValueChange={handleCalendarChange}
                  min={min}
                  max={max}
                  isDateDisabled={isDateDisabled}
                  numberOfMonths={numberOfMonths}
                  size={resolvedSize}
                  focusDate={focusDate}
                  onFocusDateChange={setFocusDate}
                />
              </div>
              <div className="rt-ds-daterange-footer">
                <Button type="button" priority="secondary" size={resolvedSize} onClick={() => closePopover()}>
                  Done
                </Button>
              </div>
            </div>
          </Theme>
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}

export const DateRangeInput = forwardRef<HTMLButtonElement, DateRangeInputProps>(function DateRangeInput(
  {
    value,
    defaultValue,
    onValueChange,
    min,
    max,
    isDateDisabled,
    numberOfMonths = 2,
    presets,
    placeholder = "Select dates",
    hasClear = true,
    size,
    label,
    info,
    endSlot,
    description,
    validation,
    disabled,
    disabledReason,
    width,
    "aria-label": ariaLabel,
    "aria-labelledby": ariaLabelledby,
  },
  ref,
) {
  const resolvedSize = (useResolvedSize<Size>("control", size) ?? "1") as Size;
  const isControlled = value !== undefined;
  const [internal, setInternal] = useState<DateRange | undefined>(defaultValue);
  const current = isControlled ? value : internal;

  const fire = useCallback(
    (next: DateRange | undefined) => {
      if (!isControlled) setInternal(next);
      onValueChange(next);
    },
    [isControlled, onValueChange],
  );

  // Nameless control = WCAG 4.1.2 failure. Warn in DEV when a bare trigger (no `label`) also has no
  // aria-label / aria-labelledby (a `placeholder` is not an accessible name). Mirrors DateInput.
  useEffect(() => {
    if (DEV_WARN && label == null && ariaLabel == null && ariaLabelledby == null) {
      console.warn(
        "DateRangeInput: a control with no `label` needs `aria-label` or `aria-labelledby` for an accessible name (WCAG 4.1.2).",
      );
    }
  }, [label, ariaLabel, ariaLabelledby]);

  // The STANDING validation channel: a caller-supplied validation, else a committed range whose endpoints
  // fall outside min/max (DateRangeInput synthesizes a corrective message).
  const outOfRange = current !== undefined && rangeOutOfBounds(current, min, max, isDateDisabled);
  const standingValidation: Validation | undefined =
    validation ?? (outOfRange ? { tone: "error", message: outOfRangeMessage(current!, min, max) } : undefined);

  const body = (
    <DateRangeInputBody
      resolvedSize={resolvedSize}
      value={current}
      onValueChange={fire}
      min={min}
      max={max}
      isDateDisabled={isDateDisabled}
      numberOfMonths={numberOfMonths === 1 ? 1 : 2}
      presets={presets}
      placeholder={placeholder}
      hasClear={hasClear}
      disabled={disabled}
      disabledReason={disabledReason}
      ariaLabel={ariaLabel}
      ariaLabelledby={ariaLabelledby}
      forwardedRef={ref}
    />
  );

  // Bare unless it carries a label / validation / description — keeps simple usage untouched.
  const wrapped =
    label == null && standingValidation == null && description == null ? (
      body
    ) : (
      <Field.Root validation={standingValidation} description={description} size={resolvedSize}>
        {label != null && (
          <Field.Label info={info} endSlot={endSlot}>
            {label}
          </Field.Label>
        )}
        {body}
        {description != null && <Field.Description>{description}</Field.Description>}
        <Field.Message />
      </Field.Root>
    );

  return width != null ? <Box style={{ width }}>{wrapped}</Box> : wrapped;
});
