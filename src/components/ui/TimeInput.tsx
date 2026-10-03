// Copyright (c) Meta Platforms, Inc. and affiliates.
// Portions derived from facebook/astryx packages/core/src/TimeInput/TimeInput.tsx @ 88c95e4 (MIT, © Meta Platforms)

import {
  forwardRef,
  useCallback,
  useEffect,
  useRef,
  useState,
  type KeyboardEvent,
  type ReactNode,
} from "react";
import { Box, TextField as RadixTextField } from "@radix-ui/themes";
import { Clock, X } from "@phosphor-icons/react";
import { useResolvedSize } from "../../theme/SizeContext";
import {
  Field,
  useOptionalFieldControl,
  useDisabledReason,
  DisabledReasonTooltip,
  DisabledReasonGlyph,
} from "./Field";
import { IconButton } from "./IconButton";
import { useAnnounce } from "./useAnnounce";
import {
  type ISOTimeString,
  parseTimeInput,
  adjustTime,
  isTimeInRange,
  compareTime,
  formatDisplayTime12h,
  formatDisplayTime24h,
  formatISOTime,
} from "../../dates/timeParser";

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

/* TimeInput — a free-text time field with keyboard (ArrowUp/Down) increment, on the shared Field shell.
 *
 * Ported from Astryx (facebook/astryx `@astryxdesign/core` v0.1.4, commit 88c95e4) onto our system
 * (DECISIONS [[catalog-as-specification]], wave-3 D2/D8, [[time-input]]). A DateInput sibling MINUS the popover: same shell, same parse/commit
 * model, same two feedback channels — but there is no picking surface, so no combobox wiring and no
 * `role="dialog"`. The input stays a PLAIN text field (deliberately NOT `role="spinbutton"`, [[time-input]]): it is
 * free-text-first, and spinbutton implies a constrained numeric/segmented widget we didn't adopt.
 *
 * Mirrors DateInput exactly where they share behavior (say the deltas so nobody normalizes them apart):
 *   • The input rides Radix `TextField.Root variant="surface"` (accent-aware `[data-validation]` paint +
 *     accent focus ring + affix slots REUSED, not re-built — [[field-shell]]/[[field-shell-adoption]]/[[validation-focus-paint]]/[[focus-ring]]).
 *   • The control body renders INSIDE its self-owned `Field.Root` so it can read the field aria via
 *     `useOptionalFieldControl` (the AGENTS.md gotcha — at the top level it reads the null outer context
 *     and the wiring never reaches the input).
 *   • Parsing is the LIFTED `parseTimeInput` (`src/dates/timeParser.ts`, [[catalog-as-specification]] @ 88c95e4) — never re-implemented;
 *     `adjustTime` (O(1) midnight-wrap, non-finite-guarded) drives the increment; `isTimeInRange` clamps it.
 *   • `pendingInput: string | null` (null ⇒ the FORMATTED committed value): parse-on-change fires eagerly when
 *     it resolves to an ALLOWED, DIFFERENT time; commit-on-blur-or-Enter; unrecognized text SILENTLY reverts.
 *   • TWO feedback channels that never cross ([[date-input]], shared): an ephemeral parse failure is announced
 *     assertively + flags `aria-invalid` ONLY while the pending text is unresolved — it never enters
 *     `Field.validation`. The validation channel is reserved for STANDING problems (a committed value out of
 *     min/max, or a caller-supplied `validation`).
 *
 * TimeInput's OWN behavior ([[time-input]]):
 *   • ArrowUp/ArrowDown increment IN PLACE by `increment` minutes (`adjustTime`, midnight wrap); when the field
 *     is empty the base seeds from the current wall-clock time (`new Date()` read here, not in `adjustTime`);
 *     the step fires only if it stays in min/max. Each step is announced POLITELY (an arrow silently mutating
 *     a plain text input is invisible to a screen reader).
 *   • PARITY UPGRADE over upstream: Astryx's TimeInput only GREYS invalid text — it has neither the assertive
 *     announcement nor `aria-invalid`. Ours gives it the SAME invalid feedback DateInput has, deliberately.
 *   • No visible +/- stepper buttons — the same call NumberInput's D6 made (native model, no custom stepper);
 *     a TimeInput-only stepper would fragment the system. A shared touch-friendly stepper primitive is a
 *     named deferral, alongside `changeAction` async-optimistic and InputGroup composition.
 *   • D8 `disabledReason` soft-disable is wired per [[disabled-reason]]; the edit / keydown / step handlers early-return while soft.
 *   • API normalization (D2): `value?: ISOTimeString`, required `onValueChange(v | undefined)`, `null`-free
 *     (`undefined` = empty), ISO strings on the wire.
 */

type Size = "1" | "2" | "3";
type Tone = "error" | "warning" | "success" | "info";
type Validation = { tone: Tone; message: ReactNode };
type HourFormat = "12h" | "24h";

export interface TimeInputProps {
  /** Controlled selected time (ISO HH:MM or HH:MM:SS, 24-hour). */
  value?: ISOTimeString;
  /** Uncontrolled initial time (ISO). */
  defaultValue?: ISOTimeString;
  /** Required. Fires with the committed ISO time, or `undefined` when cleared. */
  onValueChange: (value: ISOTimeString | undefined) => void;
  /** Earliest allowed time (ISO); earlier times are rejected on commit and clamp the increment. */
  min?: ISOTimeString;
  /** Latest allowed time (ISO); later times are rejected on commit and clamp the increment. */
  max?: ISOTimeString;
  /** Include seconds in parsing / display / increment. @default false */
  hasSeconds?: boolean;
  /** Display format for the committed value. @default "12h" */
  hourFormat?: HourFormat;
  /** ArrowUp/Down step, in minutes. @default 1 */
  increment?: number;
  /** A trailing clear ✕ (out of the tab order, [[field-family-anatomy]]) appears while a value is set. @default false */
  hasClear?: boolean;
  /** Focus the input on mount. (Undocumented upstream — we document it.) @default false */
  hasAutoFocus?: boolean;
  /** Greyed hint while empty. @default "Select a time" */
  placeholder?: string;
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
   *  NOT flow here — they announce + revert (the two-channel model, [[date-input]]/[[time-input]]). */
  validation?: Validation;
  disabled?: boolean;
  /** D8 ([[disabled-reason]]): a non-empty reason SOFT-disables (aria-disabled + readOnly + reason tooltip + glyph)
   *  instead of natively disabling, so the reason stays perceivable on hover AND keyboard focus. */
  disabledReason?: string;
  width?: number | string;
  /** Accessible name for a BARE TimeInput (no `label`). One of `label` / `aria-label` / `aria-labelledby`
   *  is required — a nameless field fails WCAG 4.1.2 (a `placeholder` is not a name). */
  "aria-label"?: string;
  "aria-labelledby"?: string;
}

/** Format a committed ISO time for display / announcements, per `hourFormat`. */
function formatDisplay(iso: ISOTimeString, hourFormat: HourFormat, hasSeconds: boolean): string {
  return hourFormat === "24h" ? formatDisplayTime24h(iso, hasSeconds) : formatDisplayTime12h(iso, hasSeconds);
}

/** Standing-error copy for a committed value that violates the constraints (the validation channel). */
function outOfRangeMessage(
  iso: ISOTimeString,
  min: ISOTimeString | undefined,
  max: ISOTimeString | undefined,
  hourFormat: HourFormat,
  hasSeconds: boolean,
): string {
  if (min && compareTime(iso, min) < 0) return `Choose a time at or after ${formatDisplay(min, hourFormat, hasSeconds)}.`;
  if (max && compareTime(iso, max) > 0) return `Choose a time at or before ${formatDisplay(max, hourFormat, hasSeconds)}.`;
  return "That time isn’t available.";
}

// The control body — split out from the Root so it renders INSIDE Field.Root and can read the field aria
// (id / aria-describedby / aria-invalid) via useOptionalFieldControl (AGENTS.md gotcha).
interface BodyProps {
  resolvedSize: Size;
  value: ISOTimeString | undefined;
  onValueChange: (value: ISOTimeString | undefined) => void;
  min?: ISOTimeString;
  max?: ISOTimeString;
  hasSeconds: boolean;
  hourFormat: HourFormat;
  increment: number;
  placeholder: string;
  hasClear: boolean;
  hasAutoFocus: boolean;
  disabled?: boolean;
  disabledReason?: string;
  ariaLabel?: string;
  ariaLabelledby?: string;
  forwardedRef?: React.Ref<HTMLInputElement>;
}

function TimeInputBody({
  resolvedSize,
  value,
  onValueChange,
  min,
  max,
  hasSeconds,
  hourFormat,
  increment,
  placeholder,
  hasClear,
  hasAutoFocus,
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

  const inputRef = useRef<HTMLInputElement>(null);
  // null ⇒ display the FORMATTED committed value; a string ⇒ the user's in-progress raw text.
  const [pendingInput, setPendingInput] = useState<string | null>(null);
  // aria-invalid WHILE the pending text is unresolved (unparseable OR out of range). Clears on revert/commit.
  const [pendingInvalid, setPendingInvalid] = useState(false);

  // Merge the internal input ref with the forwarded ref.
  const setInputRef = useCallback(
    (node: HTMLInputElement | null) => {
      inputRef.current = node;
      if (typeof forwardedRef === "function") forwardedRef(node);
      else if (forwardedRef) (forwardedRef as React.MutableRefObject<HTMLInputElement | null>).current = node;
    },
    [forwardedRef],
  );

  // Parse freeform text → an ALLOWED, committable ISO time, or null. Reuses the lifted parseTimeInput.
  const resolve = useCallback(
    (text: string): ISOTimeString | null => {
      const iso = parseTimeInput(text, hasSeconds);
      if (!iso) return null;
      return isTimeInRange(iso, min, max) ? iso : null;
    },
    [hasSeconds, min, max],
  );

  const displayValue =
    pendingInput !== null ? pendingInput : value ? formatDisplay(value, hourFormat, hasSeconds) : "";

  // Free-text + eager parse: keep the raw text, and the moment it resolves to an allowed, DIFFERENT time,
  // fire onValueChange ([[time-input]]). Unresolved text flags aria-invalid (the ephemeral channel).
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
        // Reverts either way (never the validation channel, [[date-input]]/[[time-input]]), but the announcement is HONEST about
        // WHICH: a recognized-but-out-of-range time names the bound (reusing the standing-validation copy),
        // genuinely unparseable text says so — the same time shouldn't get two contradictory feedbacks.
        const parsed = parseTimeInput(text, hasSeconds);
        const kept = value ? ` Kept ${formatDisplay(value, hourFormat, hasSeconds)}.` : "";
        const msg = parsed
          ? outOfRangeMessage(parsed, min, max, hourFormat, hasSeconds) + kept
          : `Didn’t recognize that time.${kept}`;
        announce(msg, "assertive");
      }
    }
    setPendingInput(null);
    setPendingInvalid(false);
  }, [pendingInput, value, resolve, onValueChange, announce, hasSeconds, hourFormat, min, max]);

  // ArrowUp/Down in-place increment ([[time-input]]). The base is the committed value, or — when the field is empty —
  // the current wall-clock time (read HERE, never inside adjustTime). The step fires only if it stays in
  // min/max (clamped at the bound), and is announced POLITELY (an arrow mutating a plain text input is
  // invisible to a screen reader). Midnight wrap comes from adjustTime's double-modulo.
  const step = useCallback(
    (deltaMinutes: number) => {
      if (disabled) return; // early-return the step handler when soft ([[disabled-reason]])
      const now = new Date();
      const seed = formatISOTime(
        { hour: now.getHours(), minute: now.getMinutes(), second: now.getSeconds() },
        hasSeconds,
      );
      const base = value ?? seed;
      const next = adjustTime(base, deltaMinutes, hasSeconds);
      if (!isTimeInRange(next, min, max)) return; // clamped by min/max — no-op at the bound
      if (next !== value) onValueChange(next);
      // The committed value now drives the display; drop any in-progress raw text.
      setPendingInput(null);
      setPendingInvalid(false);
      announce(formatDisplay(next, hourFormat, hasSeconds), "polite");
    },
    [disabled, value, hasSeconds, min, max, onValueChange, announce, hourFormat],
  );

  const handleKeyDown = useCallback(
    (e: KeyboardEvent<HTMLInputElement>) => {
      if (disabled) return; // early-return the keydown handler when soft ([[disabled-reason]])
      if (e.key === "Enter") {
        e.preventDefault();
        commit();
        return;
      }
      if (e.key === "ArrowUp") {
        e.preventDefault();
        step(increment);
        return;
      }
      if (e.key === "ArrowDown") {
        e.preventDefault();
        step(-increment);
      }
    },
    [disabled, commit, step, increment],
  );

  const handleClear = useCallback(() => {
    if (disabled) return;
    if (value !== undefined) onValueChange(undefined);
    setPendingInput(null);
    setPendingInvalid(false);
    inputRef.current?.focus();
  }, [disabled, value, onValueChange]);

  // aria-describedby MERGES the field-level id (validation / description) with the D8 reason id.
  const describedBy =
    [aria?.["aria-describedby"], soft ? dr.reasonId : undefined].filter(Boolean).join(" ") || undefined;
  // aria-invalid is the UNION of the standing field error and the ephemeral pending-invalid — but NEVER
  // set while soft-disabled (a reason is guidance, not an error, [[disabled-reason]]).
  const ariaInvalid = soft ? undefined : aria?.["aria-invalid"] || pendingInvalid || undefined;

  const glyphSize = resolvedSize === "3" ? 18 : 16;
  const showClear = hasClear && !disabled && value !== undefined;

  return (
    <DisabledReasonTooltip {...dr.tooltip}>
      <RadixTextField.Root
        ref={setInputRef}
        variant="surface"
        size={resolvedSize}
        autoComplete="off"
        autoFocus={hasAutoFocus}
        aria-label={ariaLabel}
        aria-labelledby={ariaLabelledby}
        placeholder={placeholder}
        value={displayValue}
        onChange={(e) => handleChange(e.target.value)}
        onKeyDown={handleKeyDown}
        onBlur={commit}
        id={aria?.id}
        {...dr.controlProps}
        aria-describedby={describedBy}
        aria-invalid={ariaInvalid}
      >
        {/* Leading clock glyph — a decorative field identifier (aria-hidden; the label carries the name). */}
        <RadixTextField.Slot side="left">
          <Clock weight="regular" color="var(--ds-icon-neutral)" aria-hidden />
        </RadixTextField.Slot>
        <RadixTextField.Slot side="right" gap="1">
          {soft ? (
            <DisabledReasonGlyph size={glyphSize} />
          ) : dr.hardDisabled ? null : (
            showClear && (
              <IconButton
                inset
                size="1"
                aria-label="Clear time"
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
            )
          )}
        </RadixTextField.Slot>
      </RadixTextField.Root>
    </DisabledReasonTooltip>
  );
}

export const TimeInput = forwardRef<HTMLInputElement, TimeInputProps>(function TimeInput(
  {
    value,
    defaultValue,
    onValueChange,
    min,
    max,
    hasSeconds = false,
    hourFormat = "12h",
    increment = 1,
    hasClear = false,
    hasAutoFocus = false,
    placeholder = "Select a time",
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
  const [internal, setInternal] = useState<ISOTimeString | undefined>(defaultValue);
  const current = isControlled ? value : internal;

  const fire = useCallback(
    (next: ISOTimeString | undefined) => {
      if (!isControlled) setInternal(next);
      onValueChange(next);
    },
    [isControlled, onValueChange],
  );

  // Nameless field = WCAG 4.1.2 failure. Warn in DEV when a bare TimeInput (no `label`) also has no
  // aria-label / aria-labelledby (a `placeholder` is not an accessible name). Mirrors DateInput / TextField.
  useEffect(() => {
    if (DEV_WARN && label == null && ariaLabel == null && ariaLabelledby == null) {
      console.warn(
        "TimeInput: a field with no `label` needs `aria-label` or `aria-labelledby` for an accessible name (WCAG 4.1.2).",
      );
    }
  }, [label, ariaLabel, ariaLabelledby]);

  // TWO channels ([[date-input]]/[[time-input]]): a caller-supplied validation, else a STANDING out-of-range committed value,
  // surfaces on the Field validation channel. Ephemeral parse failures never reach here.
  const outOfRange = current !== undefined && !isTimeInRange(current, min, max);
  const standingValidation: Validation | undefined =
    validation ??
    (outOfRange ? { tone: "error", message: outOfRangeMessage(current!, min, max, hourFormat, hasSeconds) } : undefined);

  const body = (
    <TimeInputBody
      resolvedSize={resolvedSize}
      value={current}
      onValueChange={fire}
      min={min}
      max={max}
      hasSeconds={hasSeconds}
      hourFormat={hourFormat}
      increment={increment}
      placeholder={placeholder}
      hasClear={hasClear}
      hasAutoFocus={hasAutoFocus}
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
