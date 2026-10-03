// Copyright (c) Meta Platforms, Inc. and affiliates.
// Portions derived from facebook/astryx packages/core/src/NumberInput/NumberInput.tsx @ 88c95e4 (MIT, © Meta Platforms)

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
import { Box, Text, TextField as RadixTextField, VisuallyHidden } from "@radix-ui/themes";
import { X } from "@phosphor-icons/react";
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
import { parseNumberInput } from "../../utils/parseNumberInput";

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

/* NumberInput — a native numeric field (`type="number"`) on the shared Field shell.
 *
 * Ported from Astryx (facebook/astryx `@astryxdesign/core`, commit 88c95e4) onto our system
 * (DECISIONS [[catalog-as-specification]], wave-3 D2/D6/D8, [[number-input]]). TimeInput's TWIN ([[time-input]]): the SAME two-channel parse/commit/revert
 * model on the same Field shell — the only difference is where the increment comes from. TimeInput drives
 * it with the lifted `adjustTime`; NumberInput hands it to the BROWSER's native `type="number"` spinner
 * (↑/↓ + the OS stepper give `role="spinbutton"` and `aria-valuemin/max/now` for free), so there is NO
 * custom stepper and NO increment handler here.
 *
 * Shares [[date-input]]/[[time-input]] wholesale (say the deltas so nobody normalizes them apart):
 *   • The input rides Radix `TextField.Root variant="surface"` (accent-aware `[data-validation]` paint +
 *     accent focus ring + affix slots REUSED, not re-built — [[field-shell]]/[[field-shell-adoption]]/[[validation-focus-paint]]/[[focus-ring]]).
 *   • The control body renders INSIDE its self-owned `Field.Root` so it can read the field aria via
 *     `useOptionalFieldControl` (the AGENTS.md gotcha — at the top level it reads the null outer context
 *     and the wiring never reaches the input).
 *   • Parsing is the LIFTED `parseNumberInput` (`src/utils/parseNumberInput.ts`, [[catalog-as-specification]] @ 88c95e4) — never
 *     re-implemented. It REJECTS (never clamps) an out-of-range or malformed number.
 *   • `pendingInput: string | null` (null ⇒ the committed value shown as a string): parse-on-change fires
 *     eagerly when the RAW text resolves to an ALLOWED, DIFFERENT number; commit-on-blur-or-Enter; text that
 *     never resolves SILENTLY reverts. We parse the RAW pending string, NOT `input.valueAsNumber` — a native
 *     `type=number` reports NaN/"" for intermediate `"-"`/`"1."`/`"1e"`, and the pending-string model avoids
 *     those spurious rejects while typing.
 *   • TWO feedback channels that never cross ([[date-input]]): an ephemeral parse/range failure is announced
 *     ASSERTIVELY + flags `aria-invalid` ONLY while the pending text is unresolved — it never enters
 *     `Field.validation`. The validation channel is reserved for STANDING problems: a caller-supplied
 *     `validation`, or a *controlled* `value` the parent forces out of range (the user can't cause it —
 *     reject-revert governs typing, so a typed 99 with max 10 reverts to the last value, it never becomes 10).
 *
 * NumberInput's OWN calls ([[number-input]]):
 *   • Native spinner, NO custom stepper (D6, the reuse gate — a shared touch-friendly stepper is a NAMED
 *     deferral, not a bespoke build). No `Intl.NumberFormat` display either (D6). `inputMode` is `numeric`,
 *     or `decimal` when `step` is fractional.
 *   • `units` renders as a decorative trailing suffix (`aria-hidden` `--ds-text-weak` Text) AND is folded
 *     into `aria-describedby` via a persistent `VisuallyHidden` node (the [[disabled-reason]] reasonId mechanism) so AT hears
 *     "Weight, spin button, 5, kilograms" without the caller duplicating the unit into the label. The label
 *     stays the accessible NAME ([[field-shell]]). A separately-SPOKEN `unitsLabel` is a named deferral (not built).
 *   • PARITY UPGRADE over Astryx: upstream shows a local generic "Invalid number"; ours routes the honest,
 *     range-aware copy through the SHARED assertive announcer (the same channel DateInput/TimeInput use).
 *   • D8 `disabledReason` soft-disable per [[disabled-reason]] — the edit / keydown handlers early-return while soft.
 *   • API normalization (D2): `value?: number`, required `onValueChange`; when `clearable`, the callback
 *     widens to `number | undefined` (`undefined` = empty), else it is `number`-only. `null`-free.
 *
 * DEFERRED (named parks, NOT built): custom +/- stepper buttons + `Intl.NumberFormat` display (D6); the
 * separately-spoken `unitsLabel`; the `changeAction` async-optimistic layer + `isLoading`/Spinner; InputGroup
 * composition. Known native wart (not guarded): a focused `type=number` mutates on scroll-wheel — a shared
 * wheel guard, if wanted, belongs on the primitive, not here.
 */

type Size = "1" | "2" | "3";
type Tone = "error" | "warning" | "success" | "info";
type Validation = { tone: Tone; message: ReactNode };

interface NumberInputBaseProps {
  /** Uncontrolled initial value. */
  defaultValue?: number;
  /** Smallest allowed value — set as the native `min` (→ `aria-valuemin`); values below it are rejected on
   *  commit (reject-not-clamp) and cap the native spinner. */
  min?: number;
  /** Largest allowed value — set as the native `max` (→ `aria-valuemax`); values above it are rejected on
   *  commit (reject-not-clamp) and cap the native spinner. */
  max?: number;
  /** Native spinner step (↑/↓ and the OS stepper). A fractional step switches `inputMode` to `decimal`.
   *  @default 1 */
  step?: number;
  /** Reject any non-integer on commit (also filters what the spinner can land on via `step`). @default false */
  isIntegerOnly?: boolean;
  /** A decorative trailing unit suffix ("kg", "%", "px") — shown `aria-hidden` and folded into
   *  `aria-describedby` so AT announces it without the caller duplicating it into the label. */
  units?: string;
  /** Greyed hint while empty. @default "Enter a number" */
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
   *  NOT flow here — they announce + revert (the two-channel model, [[date-input]]/[[number-input]]). */
  validation?: Validation;
  disabled?: boolean;
  /** D8 ([[disabled-reason]]): a non-empty reason SOFT-disables (aria-disabled + readOnly + reason tooltip + glyph)
   *  instead of natively disabling, so the reason stays perceivable on hover AND keyboard focus. */
  disabledReason?: string;
  width?: number | string;
  /** Accessible name for a BARE NumberInput (no `label`). One of `label` / `aria-label` / `aria-labelledby`
   *  is required — a nameless field fails WCAG 4.1.2 (a `placeholder` is not a name). */
  "aria-label"?: string;
  "aria-labelledby"?: string;
}

/** Discriminated on `clearable` (D2): a clearable field shows a trailing ✕ and its callback accepts
 *  `undefined` (an emptied field); a non-clearable field never emits `undefined` (empty reverts). */
export type NumberInputProps =
  | (NumberInputBaseProps & {
      clearable?: false;
      /** Controlled value. */
      value?: number;
      /** Required. Fires with the committed number. */
      onValueChange: (value: number) => void;
    })
  | (NumberInputBaseProps & {
      clearable: true;
      /** Controlled value. */
      value?: number;
      /** Required. Fires with the committed number, or `undefined` when cleared/emptied. */
      onValueChange: (value: number | undefined) => void;
    });

/** The constraint sentence, shared by both feedback channels. Prefers the from–to form when both bounds
 *  are set, else names the one bound that exists. */
function rangeMessage(min?: number, max?: number): string {
  if (min != null && max != null) return `Enter a number from ${min} to ${max}.`;
  if (min != null) return `Enter a number ${min} or greater.`;
  if (max != null) return `Enter a number ${max} or less.`;
  return "That number isn’t allowed.";
}

/** Standing-error copy for a committed value that violates the constraints (the validation channel). */
function outOfRangeMessage(n: number, min?: number, max?: number): string {
  if (min != null && n < min) return `Enter a number ${min} or greater.`;
  if (max != null && n > max) return `Enter a number ${max} or less.`;
  return "That number isn’t in the allowed range.";
}

/** Honest assertive copy for a raw text that failed to commit — distinguishes genuinely-not-a-number from a
 *  recognized-but-rejected number (out of range, or a decimal under isIntegerOnly). Names the kept value. */
function invalidCommitMessage(
  text: string,
  opts: { min?: number; max?: number; isIntegerOnly?: boolean },
  value: number | undefined,
): string {
  const trimmed = text.trim();
  const kept = value !== undefined ? ` Kept ${value}.` : "";
  const num = Number(trimmed);
  const isNumber = trimmed !== "" && trimmed !== "-" && Number.isFinite(num);
  if (!isNumber) return `That isn’t a number.${kept}`;
  if (opts.isIntegerOnly && !Number.isInteger(num)) return `Enter a whole number.${kept}`;
  // A finite, integer-ok number that still failed to resolve is out of range.
  return `${rangeMessage(opts.min, opts.max)}${kept}`;
}

// The control body — split out from the Root so it renders INSIDE Field.Root and can read the field aria
// (id / aria-describedby / aria-invalid) via useOptionalFieldControl (AGENTS.md gotcha).
interface BodyProps {
  resolvedSize: Size;
  value: number | undefined;
  onValueChange: (value: number | undefined) => void;
  min?: number;
  max?: number;
  step: number;
  isIntegerOnly: boolean;
  units?: string;
  clearable: boolean;
  placeholder: string;
  disabled?: boolean;
  disabledReason?: string;
  ariaLabel?: string;
  ariaLabelledby?: string;
  forwardedRef?: React.Ref<HTMLInputElement>;
}

function NumberInputBody({
  resolvedSize,
  value,
  onValueChange,
  min,
  max,
  step,
  isIntegerOnly,
  units,
  clearable,
  placeholder,
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
  const unitsId = useId();

  const inputRef = useRef<HTMLInputElement>(null);
  // null ⇒ display the committed value as a string; a string ⇒ the user's in-progress raw text.
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

  // Parse freeform text → an ALLOWED number, or null. Reuses the lifted parseNumberInput (reject, never clamp).
  const resolve = useCallback(
    (text: string): number | null => parseNumberInput(text, { min, max, isIntegerOnly }),
    [min, max, isIntegerOnly],
  );

  const displayValue = pendingInput !== null ? pendingInput : value !== undefined ? String(value) : "";

  // Free-text + eager parse: keep the RAW text, and the moment it resolves to an allowed, DIFFERENT number,
  // fire onValueChange ([[number-input]]). Unresolved text flags aria-invalid (the ephemeral channel). This same path
  // serves the native spinner — a ↑/↓ or OS stepper click dispatches an input event with the stepped value.
  const handleChange = useCallback(
    (text: string) => {
      if (disabled) return; // early-return the edit handler when soft ([[disabled-reason]] consumer contract)
      setPendingInput(text);
      if (text.trim() === "") {
        setPendingInvalid(false);
        return;
      }
      const n = resolve(text);
      if (n !== null) {
        setPendingInvalid(false);
        if (n !== value) onValueChange(n);
      } else {
        setPendingInvalid(true);
      }
    },
    [disabled, resolve, value, onValueChange],
  );

  // Commit-on-blur-or-Enter: empty ⇒ clear (only when clearable, else revert); resolves+differs ⇒ fire;
  // THEN pendingInput=null unconditionally, so malformed / out-of-range text SILENTLY reverts to the last
  // committed value (announced assertively — never the validation channel, [[date-input]]/[[number-input]]).
  const commit = useCallback(() => {
    if (pendingInput === null) return;
    const text = pendingInput;
    if (text.trim() === "") {
      // Empty commits `undefined` ONLY when clearable; otherwise the field reverts to its last value.
      if (clearable && value !== undefined) onValueChange(undefined);
    } else {
      const n = resolve(text);
      if (n !== null) {
        if (n !== value) onValueChange(n);
      } else {
        announce(invalidCommitMessage(text, { min, max, isIntegerOnly }, value), "assertive");
      }
    }
    setPendingInput(null);
    setPendingInvalid(false);
  }, [pendingInput, value, clearable, resolve, onValueChange, announce, min, max, isIntegerOnly]);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent<HTMLInputElement>) => {
      if (disabled) return; // early-return the keydown handler when soft ([[disabled-reason]])
      // Enter commits the typed text. ArrowUp/ArrowDown are the NATIVE spinbutton increment — left to the
      // browser (that is the whole point: the increment comes from type=number, not a custom handler).
      if (e.key === "Enter") {
        e.preventDefault();
        commit();
      }
    },
    [disabled, commit],
  );

  const handleClear = useCallback(() => {
    if (disabled) return;
    if (value !== undefined) onValueChange(undefined);
    setPendingInput(null);
    setPendingInvalid(false);
    inputRef.current?.focus();
  }, [disabled, value, onValueChange]);

  // aria-describedby MERGES the field-level id (validation / description) with the D8 reason id and the
  // persistent units id (so AT reads the unit right after the value).
  const describedBy =
    [aria?.["aria-describedby"], soft ? dr.reasonId : undefined, units ? unitsId : undefined]
      .filter(Boolean)
      .join(" ") || undefined;
  // aria-invalid is the UNION of the standing field error and the ephemeral pending-invalid — but NEVER
  // set while soft-disabled (a reason is guidance, not an error, [[disabled-reason]]).
  const ariaInvalid = soft ? undefined : aria?.["aria-invalid"] || pendingInvalid || undefined;

  const glyphSize = resolvedSize === "3" ? 18 : 16;
  const showClear = clearable && !disabled && value !== undefined;
  const inputMode = Number.isInteger(step) ? "numeric" : "decimal";

  return (
    <DisabledReasonTooltip {...dr.tooltip}>
      <RadixTextField.Root
        ref={setInputRef}
        type="number"
        variant="surface"
        size={resolvedSize}
        inputMode={inputMode}
        min={min}
        max={max}
        step={step}
        autoComplete="off"
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
        <RadixTextField.Slot side="right" gap="1">
          {units && (
            <Text size={resolvedSize} aria-hidden style={{ color: "var(--ds-text-weak)" }}>
              {units}
            </Text>
          )}
          {soft ? (
            <DisabledReasonGlyph size={glyphSize} />
          ) : dr.hardDisabled ? null : (
            showClear && (
              <IconButton
                inset
                size="1"
                aria-label="Clear value"
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
      {/* Persistent, visually-hidden unit node — the aria-describedby target (present regardless of the
          visible suffix), so AT hears "…, 5, kilograms" without the caller duplicating the unit. */}
      {units && <VisuallyHidden id={unitsId}>{units}</VisuallyHidden>}
    </DisabledReasonTooltip>
  );
}

export const NumberInput = forwardRef<HTMLInputElement, NumberInputProps>(function NumberInput(props, ref) {
  const {
    value,
    defaultValue,
    onValueChange,
    clearable = false,
    min,
    max,
    step = 1,
    isIntegerOnly = false,
    units,
    placeholder = "Enter a number",
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
  } = props;

  const resolvedSize = (useResolvedSize<Size>("control", size) ?? "1") as Size;
  const isControlled = value !== undefined;
  const [internal, setInternal] = useState<number | undefined>(defaultValue);
  const current = isControlled ? value : internal;

  const fire = useCallback(
    (next: number | undefined) => {
      if (!isControlled) setInternal(next);
      // The union guarantees `undefined` only reaches a clearable caller; the widened internal signature is
      // erased at the public boundary.
      (onValueChange as (v: number | undefined) => void)(next);
    },
    [isControlled, onValueChange],
  );

  // Nameless field = WCAG 4.1.2 failure. Warn in DEV when a bare NumberInput (no `label`) also has no
  // aria-label / aria-labelledby (a `placeholder` is not an accessible name). Mirrors TimeInput / TextField.
  useEffect(() => {
    if (DEV_WARN && label == null && ariaLabel == null && ariaLabelledby == null) {
      console.warn(
        "NumberInput: a field with no `label` needs `aria-label` or `aria-labelledby` for an accessible name (WCAG 4.1.2).",
      );
    }
  }, [label, ariaLabel, ariaLabelledby]);

  // TWO channels ([[date-input]]/[[number-input]]): a caller-supplied validation, else a STANDING out-of-range committed value,
  // surfaces on the Field validation channel. Ephemeral parse failures never reach here. A user cannot
  // cause the out-of-range case (reject-revert governs typing) — only a controlled `value` forced out of
  // range by the parent can, which is the legitimate standing signal.
  const outOfRange =
    current !== undefined && ((min != null && current < min) || (max != null && current > max));
  const standingValidation: Validation | undefined =
    validation ?? (outOfRange ? { tone: "error", message: outOfRangeMessage(current!, min, max) } : undefined);

  const body = (
    <NumberInputBody
      resolvedSize={resolvedSize}
      value={current}
      onValueChange={fire}
      min={min}
      max={max}
      step={step}
      isIntegerOnly={isIntegerOnly}
      units={units}
      clearable={clearable}
      placeholder={placeholder}
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
