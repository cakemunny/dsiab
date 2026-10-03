// Copyright (c) Meta Platforms, Inc. and affiliates.
// Portions derived from facebook/astryx packages/core/src/DateInput/DateInput.tsx @ 88c95e4 (MIT, © Meta Platforms)

import {
  forwardRef,
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
  type FocusEvent,
  type KeyboardEvent,
  type ReactNode,
} from "react";
import * as Popover from "@radix-ui/react-popover";
import { Box, Theme, TextField as RadixTextField } from "@radix-ui/themes";
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
import { Calendar } from "./Calendar";
import { useAnnounce } from "./useAnnounce";
import type { ISODateString } from "../../dates/dateTypes";
import { parseDateInput } from "../../dates/dateParser";
import {
  plainDateFromISO,
  plainDateToISO,
  plainDateFormat,
  DATE_FORMAT_LONG,
} from "../../dates/plainDate";

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

/* DateInput — a free-text date field with a calendar-dialog popover, on the shared Field shell.
 *
 * Ported from Astryx (facebook/astryx `@astryxdesign/core` v0.1.4, commit 88c95e4) onto our system
 * (DECISIONS [[catalog-as-specification]], wave-3 D2/D5/D8, [[date-input]]). A Typeahead sibling: the input rides Radix `TextField.Root`
 * (so the accent-aware `[data-validation]` paint + accent focus ring + affix slots are REUSED, not
 * re-built — [[field-shell]]/[[field-shell-adoption]]/[[validation-focus-paint]]/[[focus-ring]]), the control body renders INSIDE its self-owned `Field.Root` so it can read
 * the field aria via `useOptionalFieldControl` (the AGENTS.md gotcha — at the top level it reads the
 * null outer context and the wiring never reaches the input), and the popover is `<Theme>`-wrapped with
 * the COMPOUND `.radix-themes.rt-ds-dateinput-panel` selector on the pre-bundled `@radix-ui/react-popover`.
 *
 * DELTAS from the source / the deliberate divergences (say them so nobody normalizes them back):
 *   • Parsing is the LIFTED `parseDateInput` (src/dates/*, [[catalog-as-specification]] @ 88c95e4) — never re-implemented.
 *   • The popover KEEPS Radix's `role="dialog"` (named "Choose date") — the OPPOSITE call from
 *     Typeahead's `role="listbox"` override (D5): a whole picking surface is genuinely dialog content.
 *   • The trailing calendar `IconButton` is a REAL tab stop (tabbable, NOT `tabIndex={-1}` like the
 *     Select/Typeahead clear ✕) — it opens a whole picking surface, so it earns a place in the tab order.
 *   • Opening the popover (ArrowDown / Alt+ArrowDown / the button) moves focus INTO the grid's roving day
 *     — the Calendar uses real roving-tabindex focus, so keeping focus in the input would leave the grid
 *     keyboard-inoperable (WCAG 2.1.1); Escape + day-select return focus to the input.
 *   • TWO feedback channels that never cross ([[date-input]]): an ephemeral parse failure that reverts is
 *     announced assertively + flags `aria-invalid` ONLY while the pending text is unresolved — it never
 *     enters `Field.validation` (a red border on a reverted-to-valid field would lie). The real
 *     validation channel is reserved for STANDING problems (a committed value out of min/max, or a
 *     caller-supplied `validation`).
 *   • API normalization (D2): `value?: ISODateString`, required `onValueChange(v | undefined)`, `null`-free
 *     (`undefined` = empty), ISO strings on the wire, `PlainDate` kept internal.
 *
 * DEFERRED (named parks, NOT built): the `changeAction` async-optimistic layer + `isLoading`/Spinner
 * (react-server-action optimistic UI — beyond the port boundary), and InputGroup composition (InputGroup
 * not ported). D8 `disabledReason` soft-disable is wired per [[disabled-reason]].
 */

type Size = "1" | "2" | "3";
type Tone = "error" | "warning" | "success" | "info";
type Validation = { tone: Tone; message: ReactNode };

export interface DateInputProps {
  /** Controlled selected date (ISO YYYY-MM-DD). */
  value?: ISODateString;
  /** Uncontrolled initial date (ISO). */
  defaultValue?: ISODateString;
  /** Required. Fires with the committed ISO date, or `undefined` when cleared. */
  onValueChange: (value: ISODateString | undefined) => void;
  /** Earliest selectable date (ISO); earlier dates are disabled in the calendar and rejected on commit. */
  min?: ISODateString;
  /** Latest selectable date (ISO); later dates are disabled in the calendar and rejected on commit. */
  max?: ISODateString;
  /** Custom disable predicate — receives an ISO date, returns **true to disable** (forwarded to Calendar,
   *  which bridges the polarity at its `useCalendarConstraints` boundary). */
  isDateDisabled?: (date: ISODateString) => boolean;
  /** Show 1 or 2 months side by side in the popover. @default 1 */
  numberOfMonths?: 1 | 2;
  /** Greyed hint while empty. @default "Select a date" */
  placeholder?: string;
  /** A trailing clear ✕ (out of the tab order, [[field-family-anatomy]]) appears while a value is set. @default false */
  hasClear?: boolean;
  size?: Size;
  /** Field label — pass none of label / description / validation to keep the control bare. */
  label?: ReactNode;
  /** Optional inline affordance beside the label (a tip icon / helper toggle). */
  info?: ReactNode;
  /** Optional pinned note at the far end of the label row. */
  endSlot?: ReactNode;
  /** Persistent helper line under the input — calm guidance that holds in any validation state. */
  description?: ReactNode;
  /** A STANDING validation state (a real problem the user must resolve). Ephemeral parse failures do
   *  NOT flow here — they announce + revert (the two-channel model, [[date-input]]). */
  validation?: Validation;
  disabled?: boolean;
  /** D8 ([[disabled-reason]]): a non-empty reason SOFT-disables (aria-disabled + readOnly + reason tooltip + glyph)
   *  instead of natively disabling, so the reason stays perceivable on hover AND keyboard focus. */
  disabledReason?: string;
  width?: number | string;
  /** Accessible name for a BARE DateInput (no `label`). One of `label` / `aria-label` / `aria-labelledby`
   *  is required — a nameless combobox fails WCAG 4.1.2 (a `placeholder` is not a name). */
  "aria-label"?: string;
  "aria-labelledby"?: string;
}

/** Format a committed ISO date for display / announcements — e.g. "May 21, 2026". */
function formatISO(iso: ISODateString): string {
  return plainDateFormat(plainDateFromISO(iso), DATE_FORMAT_LONG);
}

// The control body — split out from the Root so it renders INSIDE Field.Root and can read the field
// aria (id / aria-describedby / aria-invalid) via useOptionalFieldControl (AGENTS.md gotcha).
interface BodyProps {
  resolvedSize: Size;
  value: ISODateString | undefined;
  onValueChange: (value: ISODateString | undefined) => void;
  min?: ISODateString;
  max?: ISODateString;
  isDateDisabled?: (date: ISODateString) => boolean;
  numberOfMonths?: 1 | 2;
  placeholder: string;
  hasClear: boolean;
  disabled?: boolean;
  disabledReason?: string;
  ariaLabel?: string;
  ariaLabelledby?: string;
  forwardedRef?: React.Ref<HTMLInputElement>;
}

function DateInputBody({
  resolvedSize,
  value,
  onValueChange,
  min,
  max,
  isDateDisabled,
  numberOfMonths,
  placeholder,
  hasClear,
  disabled,
  disabledReason,
  ariaLabel,
  ariaLabelledby,
  forwardedRef,
}: BodyProps) {
  const aria = useOptionalFieldControl();
  const announce = useAnnounce();
  const dr = useDisabledReason({ disabled, disabledReason });
  const soft = dr.soft;

  const dialogId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const anchorRef = useRef<HTMLDivElement>(null);

  const [open, setOpen] = useState(false);
  // null ⇒ display the FORMATTED committed value; a string ⇒ the user's in-progress raw text.
  const [pendingInput, setPendingInput] = useState<string | null>(null);
  // aria-invalid WHILE the pending text is unresolved (unparseable OR out of range). Clears on revert.
  const [pendingInvalid, setPendingInvalid] = useState(false);
  // Controlled focused day for the popover Calendar — driven when the user types a parseable date, and
  // kept in sync as the calendar's own keyboard nav moves the roving day.
  const [focusDate, setFocusDate] = useState<ISODateString | undefined>(value);

  // Merge the internal input ref with the forwarded ref.
  const setInputRef = useCallback(
    (node: HTMLInputElement | null) => {
      inputRef.current = node;
      if (typeof forwardedRef === "function") forwardedRef(node);
      else if (forwardedRef) (forwardedRef as React.MutableRefObject<HTMLInputElement | null>).current = node;
    },
    [forwardedRef],
  );

  const isAllowed = useCallback(
    (iso: ISODateString): boolean => {
      if (min && iso < min) return false; // ISO YYYY-MM-DD strings order lexicographically
      if (max && iso > max) return false;
      if (isDateDisabled?.(iso)) return false;
      return true;
    },
    [min, max, isDateDisabled],
  );

  // Parse freeform text → an ALLOWED, committable ISO date, or null. Reuses the lifted parseDateInput.
  const resolve = useCallback(
    (text: string): ISODateString | null => {
      const pd = parseDateInput(text);
      if (!pd) return null;
      const iso = plainDateToISO(pd);
      return isAllowed(iso) ? iso : null;
    },
    [isAllowed],
  );

  const emitOpen = useCallback((next: boolean) => setOpen(next), []);

  const openPopover = useCallback(() => {
    if (disabled) return;
    if (value) setFocusDate(value); // land the calendar on the committed month
    emitOpen(true);
  }, [disabled, value, emitOpen]);

  const displayValue = pendingInput !== null ? pendingInput : value ? formatISO(value) : "";

  // Free-text + eager parse: keep the raw text, and the moment it resolves to an allowed, DIFFERENT date,
  // fire onValueChange AND drive the popover Calendar to that month ([[date-input]]). Unresolved text flags aria-invalid.
  const handleChange = useCallback(
    (text: string) => {
      if (disabled) return; // early-return the edit handler when soft ([[disabled-reason]] consumer contract)
      setPendingInput(text);
      if (text.trim() === "") {
        setPendingInvalid(false);
        return;
      }
      const iso = resolve(text);
      if (iso) {
        setPendingInvalid(false);
        setFocusDate(iso);
        if (iso !== value) onValueChange(iso);
      } else {
        setPendingInvalid(true);
      }
    },
    [disabled, resolve, value, onValueChange],
  );

  // Commit-on-blur-or-Enter: empty ⇒ clear; resolves+differs ⇒ fire; THEN pendingInput=null
  // unconditionally, so invalid text SILENTLY reverts to the last formatted value (announced assertively).
  const commit = useCallback(() => {
    if (pendingInput === null) return;
    const text = pendingInput;
    if (text.trim() === "") {
      if (value !== undefined) onValueChange(undefined);
    } else {
      const iso = resolve(text);
      if (iso) {
        if (iso !== value) onValueChange(iso);
      } else {
        // Reverts either way (never the validation channel, [[date-input]]), but the announcement is HONEST about
        // WHICH: a recognized-but-out-of-range date names the bound (reusing the standing-validation copy),
        // genuinely unparseable text says so — the same date shouldn't get two contradictory feedbacks.
        const pd = parseDateInput(text);
        const kept = value ? ` Kept ${formatISO(value)}.` : "";
        const msg = pd
          ? (outOfRangeMessage(plainDateToISO(pd), min, max) || "That date isn't available.") + kept
          : `Didn't recognize that date.${kept}`;
        announce(msg, "assertive");
      }
    }
    setPendingInput(null);
    setPendingInvalid(false);
  }, [pendingInput, value, resolve, onValueChange, announce, min, max]);

  const closePopover = useCallback(
    (refocus = true) => {
      emitOpen(false);
      if (refocus) inputRef.current?.focus();
    },
    [emitOpen],
  );

  const handleKeyDown = useCallback(
    (e: KeyboardEvent<HTMLInputElement>) => {
      if (disabled) return; // early-return the keydown handler when soft ([[disabled-reason]])
      if (e.key === "Escape") {
        if (open) {
          e.preventDefault();
          closePopover();
        }
        return;
      }
      if (e.key === "Enter") {
        e.preventDefault();
        commit();
        return;
      }
      // ArrowDown OR Alt+ArrowDown while closed opens the picker AND moves focus into the calendar grid
      // (onOpenAutoFocus focuses the roving day) so the grid is immediately keyboard-operable — the APG
      // date-picker-dialog behavior. Escape / select return focus to the input.
      if (e.key === "ArrowDown" && !open) {
        e.preventDefault();
        openPopover();
      }
    },
    [disabled, open, closePopover, commit, openPopover],
  );

  const handleBlur = useCallback(
    (e: FocusEvent<HTMLInputElement>) => {
      const next = e.relatedTarget as Node | null;
      // Focus staying within the field (the calendar button) or moving into the popover dialog is NOT a
      // commit — the user is still interacting.
      if (next && (anchorRef.current?.contains(next) || document.getElementById(dialogId)?.contains(next))) return;
      commit();
      if (open) emitOpen(false); // focus already left — close WITHOUT yanking it back
    },
    [dialogId, commit, open, emitOpen],
  );

  const handleToggle = useCallback(() => {
    if (disabled) return;
    if (open) closePopover();
    // Opening moves focus into the grid via the popover's onOpenAutoFocus (so arrow-nav works); do NOT
    // re-focus the input here or it would yank focus back out of the calendar.
    else openPopover();
  }, [disabled, open, closePopover, openPopover]);

  const handleClear = useCallback(() => {
    if (disabled) return;
    if (value !== undefined) onValueChange(undefined);
    setPendingInput(null);
    setPendingInvalid(false);
    inputRef.current?.focus();
  }, [disabled, value, onValueChange]);

  // A day selected in the calendar commits + closes + refocuses the input.
  const handleCalendarSelect = useCallback(
    (iso: ISODateString) => {
      if (iso !== value) onValueChange(iso);
      setPendingInput(null);
      setPendingInvalid(false);
      setFocusDate(iso);
      emitOpen(false);
      inputRef.current?.focus();
    },
    [value, onValueChange, emitOpen],
  );

  // aria-describedby MERGES the field-level id (validation / description) with the D8 reason id.
  const describedBy =
    [aria?.["aria-describedby"], soft ? dr.reasonId : undefined].filter(Boolean).join(" ") || undefined;
  // aria-invalid is the UNION of the standing field error and the ephemeral pending-invalid — but NEVER
  // set while soft-disabled (a reason is guidance, not an error, [[disabled-reason]]).
  const ariaInvalid = soft ? undefined : aria?.["aria-invalid"] || pendingInvalid || undefined;

  const glyphSize = resolvedSize === "3" ? 18 : 16;
  const showClear = hasClear && !disabled && value !== undefined;

  return (
    <Popover.Root open={open} onOpenChange={(o) => (o ? openPopover() : emitOpen(false))}>
      <Popover.Anchor asChild>
        <div ref={anchorRef} className="rt-ds-dateinput-anchor" style={{ position: "relative", width: "100%" }}>
          <DisabledReasonTooltip {...dr.tooltip}>
            <RadixTextField.Root
              ref={setInputRef}
              variant="surface"
              size={resolvedSize}
              role="combobox"
              aria-haspopup="dialog"
              aria-expanded={open}
              aria-controls={open ? dialogId : undefined}
              aria-autocomplete="none"
              autoComplete="off"
              aria-label={ariaLabel}
              aria-labelledby={ariaLabelledby}
              placeholder={placeholder}
              value={displayValue}
              onChange={(e) => handleChange(e.target.value)}
              onKeyDown={handleKeyDown}
              onBlur={handleBlur}
              id={aria?.id}
              {...dr.controlProps}
              aria-describedby={describedBy}
              aria-invalid={ariaInvalid}
            >
              <RadixTextField.Slot side="right" gap="1">
                {soft ? (
                  <DisabledReasonGlyph size={glyphSize} />
                ) : dr.hardDisabled ? null : (
                  <>
                    {showClear && (
                      <IconButton
                        inset
                        size="1"
                        aria-label="Clear date"
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
                    )}
                    <IconButton
                      inset
                      size="1"
                      aria-label="Choose date"
                      aria-haspopup="dialog"
                      aria-expanded={open}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleToggle();
                      }}
                    >
                      <CalendarBlank weight="regular" color="var(--ds-icon-neutral)" />
                    </IconButton>
                  </>
                )}
              </RadixTextField.Slot>
            </RadixTextField.Root>
          </DisabledReasonTooltip>
        </div>
      </Popover.Anchor>
      <Popover.Portal>
        {/* The primitive Popover portals to <body>, OUTSIDE the .radix-themes root, so the Radix token
            scales would not resolve — wrap in Theme (as the Content element, asChild) to re-propagate. We
            KEEP Radix's hardcoded role="dialog" (the deliberate OPPOSITE of Typeahead's listbox override,
            D5 — a calendar is genuinely a picking dialog) and name it "Choose date". Opening moves focus
            INTO the grid's roving day (onOpenAutoFocus) so the calendar is keyboard-operable; onCloseAutoFocus
            is prevented and Escape + day-select return focus to the input explicitly; interacting with the
            anchor is exempt from outside-dismiss. */}
        <Popover.Content
          asChild
          align="start"
          sideOffset={4}
          onOpenAutoFocus={(e) => {
            // Move focus INTO the grid (the roving seed/selected day) so arrows / Enter / Escape operate
            // the calendar. The Calendar uses roving tabindex (real DOM focus), so keeping focus in the
            // input would leave the grid keyboard-INOPERABLE (WCAG 2.1.1) — the APG date-picker-dialog
            // behavior. Focus returns to the input on select (handleCalendarSelect), Escape, and close.
            e.preventDefault();
            requestAnimationFrame(() =>
              document
                .getElementById(dialogId)
                ?.querySelector<HTMLElement>('button.rt-ds-calendar-day[tabindex="0"]')
                ?.focus(),
            );
          }}
          onCloseAutoFocus={(e) => e.preventDefault()}
          onEscapeKeyDown={() => inputRef.current?.focus()}
          onInteractOutside={(e) => {
            if (anchorRef.current?.contains(e.target as Node)) e.preventDefault();
          }}
        >
          <Theme id={dialogId} aria-label="Choose date" className={`rt-ds-dateinput-panel rt-r-size-${resolvedSize}`}>
            <Calendar
              mode="single"
              value={value}
              onValueChange={handleCalendarSelect}
              min={min}
              max={max}
              isDateDisabled={isDateDisabled}
              numberOfMonths={numberOfMonths}
              size={resolvedSize}
              focusDate={focusDate}
              onFocusDateChange={setFocusDate}
            />
          </Theme>
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}

/** Standing-error copy for a committed value that violates the constraints (the validation channel). */
function outOfRangeMessage(iso: ISODateString, min?: ISODateString, max?: ISODateString): string {
  if (min && iso < min) return `Choose a date on or after ${formatISO(min)}.`;
  if (max && iso > max) return `Choose a date on or before ${formatISO(max)}.`;
  return "That date isn’t available.";
}

export const DateInput = forwardRef<HTMLInputElement, DateInputProps>(function DateInput(
  {
    value,
    defaultValue,
    onValueChange,
    min,
    max,
    isDateDisabled,
    numberOfMonths,
    placeholder = "Select a date",
    hasClear = false,
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
  const [internal, setInternal] = useState<ISODateString | undefined>(defaultValue);
  const current = isControlled ? value : internal;

  const fire = useCallback(
    (next: ISODateString | undefined) => {
      if (!isControlled) setInternal(next);
      onValueChange(next);
    },
    [isControlled, onValueChange],
  );

  // Nameless combobox = WCAG 4.1.2 failure. Warn in DEV when a bare DateInput (no `label`) also has no
  // aria-label / aria-labelledby (a `placeholder` is not an accessible name). Mirrors Typeahead / TextField.
  useEffect(() => {
    if (DEV_WARN && label == null && ariaLabel == null && ariaLabelledby == null) {
      console.warn(
        "DateInput: a field with no `label` needs `aria-label` or `aria-labelledby` for an accessible name (WCAG 4.1.2).",
      );
    }
  }, [label, ariaLabel, ariaLabelledby]);

  // TWO channels ([[date-input]]): a caller-supplied validation, else a STANDING out-of-range committed value,
  // surfaces on the Field validation channel. Ephemeral parse failures never reach here.
  const outOfRange =
    current !== undefined &&
    ((min && current < min) || (max && current > max) || Boolean(isDateDisabled?.(current)));
  const standingValidation: Validation | undefined =
    validation ?? (outOfRange ? { tone: "error", message: outOfRangeMessage(current!, min, max) } : undefined);

  const body = (
    <DateInputBody
      resolvedSize={resolvedSize}
      value={current}
      onValueChange={fire}
      min={min}
      max={max}
      isDateDisabled={isDateDisabled}
      numberOfMonths={numberOfMonths}
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
