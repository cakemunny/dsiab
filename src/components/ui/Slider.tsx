import {
  forwardRef,
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type KeyboardEvent as ReactKeyboardEvent,
  type ReactNode,
} from "react";
import { Slider as SliderPrimitive } from "radix-ui";
import { Text, TextField, VisuallyHidden } from "@radix-ui/themes";
import { useResolvedSize } from "../../theme/SizeContext";
import { useOptionalFieldControl, useOptionalFieldLabelId } from "./Field";
import { useAnnounce } from "./useAnnounce";

/* Slider — pick a value, or a start→end range, along a scale.
 *
 * ARCHITECTURE — the primitive, wearing Radix Themes' skin (the CheckboxVisual precedent).
 * Radix Themes' `Slider` accepts NO children: its type omits `children` and it hardcodes
 * `Root > Track > Range` + one `Thumb` per value. That closed shape makes detent marks, per-thumb ARIA
 * and a paired numeric field structurally impossible. So this composes the RAW
 * `radix-ui` `Slider.Root/Track/Range/Thumb` primitive — the exact primitive Radix Themes itself renders —
 * while wearing Radix Themes' OWN class names (`rt-SliderRoot` / `rt-SliderTrack` / `rt-SliderRange` /
 * `rt-SliderThumb` + `rt-r-size-N` + `rt-variant-*` + `rt-high-contrast`, with `data-accent-color` /
 * `data-radius`). The skin is therefore sourced from the SAME stylesheet as the stock component and
 * cannot drift — the same trick `CheckboxVisual` uses to wear the Checkbox's box. Everything net-new
 * (marks, the numeric field, the ARIA upgrades) is additive on top; the track/range/thumb paint is
 * untouched, so the filled range still resolves `--accent-track`, the shade every part without text
 * paints ([[textless-part-fills]]), and follows a brand's collision shift with no override.
 *
 * WHAT IT ADDS OVER THE STOCK COMPONENT
 *   • MARKS / DETENTS — a tick (and optional label) per mark, positioned with RADIX'S OWN thumb-offset
 *     math (`thumbInBoundsOffset`, replicated verbatim below). Naive `left: X%` drifts visibly at both
 *     ends because Radix insets each thumb by half its width so its CENTRE stays on the track; a mark
 *     positioned by raw percentage would sit half a thumb away from the thumb it is meant to mark. That
 *     offset is then resolved to pixels and snapped to the DEVICE-pixel grid — a 1px tick straddling two
 *     physical columns renders at roughly half the contrast it was painted with — and the thumb is nudged
 *     by the same correction, so the two stay locked (see `stopAt`).
 *     The mark layer is `aria-hidden` + `pointer-events: none` — the information reaches AT through
 *     `aria-valuetext`, not through decorative geometry.
 *   • `step={null}` — snap to the nearest MARK instead of a fixed grid (irregular detents). Keyboard
 *     stepping is taken over in that mode (arrows walk mark-to-mark; Radix's fixed ±step would land
 *     between detents and snap straight back, i.e. never move).
 *   • A PAIRED NUMERIC FIELD (`showInput`) that both reports and edits the value, so nobody has to
 *     pixel-hunt a thumb for an exact number.
 *   • ARIA the primitive does not emit: `aria-valuetext` (none at all upstream — detents are otherwise
 *     inaudible), per-thumb names, and per-thumb `aria-valuemin`/`aria-valuemax` constrained by the
 *     neighbouring thumb, which the APG multi-thumb pattern requires and Radix does not do (it reports
 *     the GLOBAL min/max on every thumb).
 *
 * SIZE rides the CONTROL lane (`useResolvedSize("control", size)`) — an unset `size` follows the global
 * `uiSize` (default small → step 1); an explicit step still wins; `"inherit"` opts out to the Radix
 * default (see RADIX_DEFAULT_SIZE — this root is hand-rolled, so the opt-out cannot be "no class").
 */

type Size = "1" | "2" | "3";

/* What Radix Themes' own Slider renders when it is given no `size` prop — `sliderPropDefs.size.default`
   is "2" (@radix-ui/themes/dist/esm/components/slider.props.js). This root is hand-rolled from Radix's
   class contract rather than delegated to its component, so `size="inherit"` — "opt out of the DS size
   lane, take the vendor default" — has to be spelled out here instead of falling out of passing
   `size={undefined}` down (the Text.tsx / Timestamp.tsx path).
   Emitting NO `rt-r-size-*` class is NOT the opt-out: every dimension in the slider hangs off
   `--slider-track-size`, which only a size class defines. Measured with the class stripped from a live
   root: the track collapses to 415x0 and the thumb to 0x0. */
const RADIX_DEFAULT_SIZE: Size = "2";
/* `soft` is not offered: its pale range read 1.40:1 against the light page on yellow, and a slider given
   it is a type error ([[colour-prop-and-high-contrast]], [[published-aschild-props]]). */
type Variant = "surface" | "classic";
type Radius = "none" | "small" | "medium" | "large" | "full";

/** One detent on the scale: a value, and optionally a label rendered beneath its tick. */
export type SliderMark = { value: number; label?: ReactNode };

export interface SliderProps {
  /** Lower bound of the scale — the value at the track's start edge. @default 0 */
  min?: number;
  /** Upper bound of the scale — the value at the track's end edge. @default 100 */
  max?: number;
  /** Snap granularity + the arrow-key increment. `null` snaps to the nearest `marks` entry instead of a
   *  fixed grid — `null` with no `marks` is a misuse (the slider could never move) and logs an error.
   *  @default 1 */
  step?: number | null;
  /** Controlled position — one entry per thumb (`[n]` is a single value, `[lo, hi]` a range). */
  value?: number[];
  /** Uncontrolled initial position; its length fixes the thumb count. @default [min] */
  defaultValue?: number[];
  /** Fires on every change while dragging or key-stepping — pair with `value` to drive a live readout. */
  onValueChange?: (value: number[]) => void;
  /** Fires ONCE the interaction settles (pointer release / key up) — the hook for a save or a refetch,
   *  so a drag doesn't fire one request per frame. */
  onValueCommit?: (value: number[]) => void;
  /** Detents. An array places a tick per entry (with an optional label); `true` places an unlabelled
   *  tick at every `step`. Marks outside `[min, max]` are dropped; over 500 marks are refused. */
  marks?: SliderMark[] | true;
  /** Pair the track with an editable numeric field per bound, so a value can be TYPED, not only dragged.
   *  Suppressed (with the track rendered alone) when `step={null}`, when vertical, or above two thumbs.
   *  @default false */
  showInput?: boolean;
  /** Where the paired fields sit. `"flank"` puts a range's fields on either side of the track
   *  (`min │ track │ max`); `"end"` puts them both after it. A single-value slider always reads
   *  `track │ field`. @default "flank" */
  inputPosition?: "flank" | "end";
  /** Minimum gap between two thumbs, counted in `step`s. Radix BLOCKS a move that would violate it (the
   *  thumb stops); it does not push the neighbour along. @default 0 */
  minStepsBetweenThumbs?: number;
  /** Accessible name per thumb, in value order. Defaults to `Minimum` / `Maximum` for a two-thumb range.
   *  Each is announced together with the field label ("Minimum, Price"). */
  thumbLabels?: string[];
  /** Formats a value for the mark labels, the spoken `aria-valuetext`, and the paired field's affixes
   *  (a `"72%"` format renders a `%` suffix inside the field; the box itself stays a raw number editor). */
  formatValue?: (value: number) => string;
  /** Inert + dimmed; thumbs leave the tab order and the paired fields disable with them. */
  disabled?: boolean;
  /** Control size step (track + thumb scale). Unset follows the global `uiSize` control lane;
   *  `"inherit"` opts out of the lane entirely and renders at Radix's own default step. */
  size?: Size | "inherit";
  /** Track direction. A vertical slider needs a parent with height, and suppresses the paired field. */
  orientation?: "horizontal" | "vertical";
  /** Flip the scale so `min` sits at the end edge. @default false */
  inverted?: boolean;
  /** Radix track/range treatment. `soft` is not offered ([[colour-prop-and-high-contrast]]). @default "surface" */
  variant?: Variant;
  /** Raises the filled range's contrast against the page. */
  highContrast?: boolean;
  /** Accent override for the filled range; unset, it paints the running brand accent. */
  color?: string;
  /** Track + thumb corner radius; unset, it inherits the theme radius. */
  radius?: Radius;
  /** Accessible name when the slider is not inside a `Field.Root` with a `Field.Label`. */
  "aria-label"?: string;
  /** Accessible name by reference — wins over the ambient Field label. */
  "aria-labelledby"?: string;
  className?: string;
  style?: CSSProperties;
  id?: string;
}

/* ---- scale maths ---------------------------------------------------------- */

const MAX_MARKS = 500;

const clamp = (n: number, lo: number, hi: number) => Math.min(Math.max(n, lo), hi);

/** Decimal places in a number literal — used to round step arithmetic back off the float error. */
function decimalsOf(n: number): number {
  if (!Number.isFinite(n)) return 0;
  const s = String(n);
  const dot = s.indexOf(".");
  return dot < 0 ? 0 : s.length - dot - 1;
}

function snapToStep(n: number, min: number, max: number, step: number): number {
  if (!(step > 0)) return clamp(n, min, max);
  const places = Math.min(Math.max(decimalsOf(step), decimalsOf(min)) + 2, 12);
  const stepped = Number((min + Math.round((n - min) / step) * step).toFixed(places));
  return clamp(stepped, min, max);
}

function nearestOf(n: number, candidates: number[]): number {
  let best = candidates[0];
  let bestDistance = Infinity;
  for (const c of candidates) {
    const d = Math.abs(c - n);
    if (d < bestDistance) {
      bestDistance = d;
      best = c;
    }
  }
  return best;
}

function percentOf(value: number, min: number, max: number): number {
  const span = max - min;
  return span <= 0 ? 0 : clamp(((value - min) / span) * 100, 0, 100);
}

/* Radix's OWN `getThumbInBoundsOffset`, replicated verbatim (@radix-ui/react-slider). Radix nudges each
   thumb inward by half its width at the extremes so the thumb's CENTRE lands on the track end rather than
   its edge overhanging — the thumb sits at `calc(<percent>% + <thisOffset>px)` from the start edge. Marks
   MUST use the same offset or they drift by half a thumb at 0% and 100% (the exact defect naive
   `left: X%` positioning produces). */
function thumbInBoundsOffset(size: number, percent: number, direction: number): number {
  const half = size / 2;
  const offset = (percent / 50) * half;
  return (half - offset * direction) * direction;
}

/** The measured track, in the terms the shared positioning function needs: its length along the scale
 *  axis, the sub-device-pixel PHASE of its start edge, and the physical pixel grid in force. */
type TrackGeometry = { length: number; phase: number; dpr: number };

/* ---- the paired numeric field -------------------------------------------- */

/** Split a formatted value into the affixes around its raw digits, so `"72%"` renders as a `72` box with
 *  a `%` suffix and `"$40"` as a `$` prefix. A format that rewrites the digits themselves (grouped
 *  thousands) yields no affixes — the box then simply shows the raw number. */
function affixesOf(format: ((v: number) => string) | undefined, value: number) {
  if (!format) return { prefix: "", suffix: "" };
  const raw = String(value);
  const formatted = format(value);
  const at = formatted.indexOf(raw);
  if (at < 0) return { prefix: "", suffix: "" };
  return { prefix: formatted.slice(0, at), suffix: formatted.slice(at + raw.length) };
}

/* ---- sizing the box: measure the type, don't model it --------------------- */

/** Every string the box can be asked to hold at full width, one per line — the text a hidden stand-in
 *  carries so the BROWSER measures the box's width in the box's own type (see `SliderInput` below).
 *
 *  The lines are the two bounds as the box displays them, plus one same-length all-one-digit shape per
 *  digit. The shapes matter only where figures are NOT uniform width: `font-variant-numeric: tabular-nums`
 *  asks for uniform figures and a font that carries them renders every shape identically (measured in the
 *  running family: all ten three-digit shapes come to 23.438px, and so does "-50"), but a font WITHOUT
 *  tabular figures spreads them badly (14.7px for "111" against 23.4px for "444" at the same size), and
 *  only the widest shape is then a safe bound. So the shapes cost exactly nothing while the figures are
 *  tabular, and save the last digit the moment they aren't. */
function widestSample(min: number, max: number, step: number | null): string {
  const decimals = typeof step === "number" ? clamp(decimalsOf(step), 0, 20) : 0;
  const text = (n: number) =>
    Number.isFinite(n) ? (n < 0 ? "-" : "") + Math.abs(n).toFixed(decimals) : "0";
  const lo = text(min);
  const hi = text(max);
  const longest = hi.length >= lo.length ? hi : lo;
  const lines = new Set([lo, hi]);
  for (let d = 0; d <= 9; d += 1) lines.add(longest.replace(/\d/g, String(d)));
  return [...lines].join("\n");
}

interface SliderInputProps {
  value: number;
  /** Effective lower bound for THIS field — `min`, or the neighbouring thumb plus the required gap. */
  lo: number;
  /** Effective upper bound for THIS field — `max`, or the neighbouring thumb minus the required gap. */
  hi: number;
  step: number;
  /** Characters in the widest value the scale can hold — digits, decimal point and sign, no affix. Only
   *  a pre-measurement fallback; the rendered width comes from `sample`. */
  chars: number;
  /** The widest strings the scale can display, newline-separated — measured, not counted. */
  sample: string;
  size: Size;
  disabled?: boolean;
  label: string;
  labelledBy?: string;
  format?: (v: number) => string;
  onCommit: (n: number) => void;
}

/* The editable value box. Typing is FREE while focused (the box shows what was typed and the thumb does
   not move); a valid, in-range, on-step number commits LIVE per keystroke; blur and Enter commit.
   Out of range CLAMPS to the bound and then snaps to step — announced assertively, never silently.
   Unparseable or empty REVERTS to the last committed value, also announced.
   Neither correction touches `Field.validation`: that channel is for STANDING problems, and a corrected
   keystroke is an ephemeral one (the two-channel model the Field family shares).
   It renders Radix `TextField.Root` DIRECTLY rather than our `NumberInput`, because NumberInput owns its
   own `Field.Root` — nesting it would grow a second label/description/message tree inside this field. */
function SliderInput({
  value, lo, hi, step, chars, sample, size, disabled, label, labelledBy, format, onCommit,
}: SliderInputProps) {
  const announce = useAnnounce();
  const [pending, setPending] = useState<string | null>(null);
  const [invalid, setInvalid] = useState(false);
  const { prefix, suffix } = affixesOf(format, value);
  const fmt = useCallback((n: number) => (format ? format(n) : String(n)), [format]);

  const display = pending ?? String(value);

  /* THE WIDTH IS MEASURED, NOT MODELLED. The stand-in rendered below is a child of this box's own root,
     so it inherits the exact family, size and letter-spacing the input paints with (the CSS restates the
     weight and style the input's reset pins, plus the tabular figures) — the browser lays out the widest
     strings the scale can hold and we read the result back. A width derived from a per-digit constant is
     only ever right for the one font it was tuned against; a measured width is right for whichever font
     is actually running.

     Re-measured whenever the stand-in's own box changes, which is every reason the width could move: a
     family swap, a size-lane change, a scaling retune, a letter-spacing change. The layout-effect read
     covers the first paint and a change of scale (`sample`) synchronously, so the box is never briefly
     the wrong width; `fonts.ready` covers a webfont that lands after first paint and re-cuts every
     advance in the box. */
  const sizerRef = useRef<HTMLSpanElement | null>(null);
  const [textWidth, setTextWidth] = useState<number | null>(null);
  useLayoutEffect(() => {
    const sizer = sizerRef.current;
    if (!sizer) return;
    const read = () => {
      const w = sizer.getBoundingClientRect().width;
      // Whole pixels, rounded UP: the box is laid out on the pixel grid, and rounding a fractional text
      // width DOWN is exactly how the last glyph loses its final column.
      if (w > 0) setTextWidth(Math.ceil(w));
    };
    read();
    const ro = new ResizeObserver(read);
    ro.observe(sizer);
    let live = true;
    void document.fonts?.ready.then(() => {
      if (live) read();
    });
    return () => {
      live = false;
      ro.disconnect();
    };
  }, [sample]);

  const handleChange = (text: string) => {
    if (disabled) return;
    setPending(text);
    const trimmed = text.trim();
    if (trimmed === "") {
      setInvalid(false);
      return;
    }
    const n = Number(trimmed);
    if (!Number.isFinite(n) || n < lo || n > hi) {
      setInvalid(true);
      return;
    }
    setInvalid(false);
    // Commit live only when the typed number is ALREADY on the grid — an off-step keystroke is still
    // in flight ("7" on the way to "75"), so the thumb waits for the commit that snaps it.
    if (snapToStep(n, lo, hi, step) === n && n !== value) onCommit(n);
  };

  const commit = () => {
    if (pending === null) return;
    const text = pending.trim();
    setPending(null);
    setInvalid(false);
    if (text === "") {
      announce(`Value can’t be empty. Kept ${fmt(value)}.`, "assertive");
      return;
    }
    const n = Number(text);
    if (!Number.isFinite(n)) {
      announce(`That isn’t a number. Kept ${fmt(value)}.`, "assertive");
      return;
    }
    const corrected = snapToStep(clamp(n, lo, hi), lo, hi, step);
    if (corrected !== value) onCommit(corrected);
    // A silent clamp is the thing to avoid: the box would just show a different number than was typed.
    if (corrected !== n) announce(`${text} was corrected to ${fmt(corrected)}.`, "assertive");
  };

  return (
    <TextField.Root
      className="rt-ds-slider-input"
      type="number"
      variant="surface"
      size={size}
      inputMode={Number.isInteger(step) ? "numeric" : "decimal"}
      autoComplete="off"
      min={lo}
      max={hi}
      step={step}
      disabled={disabled}
      value={display}
      onChange={(e) => handleChange(e.target.value)}
      onKeyDown={(e) => {
        if (e.key === "Enter") {
          e.preventDefault();
          commit();
        }
      }}
      onBlur={commit}
      aria-label={labelledBy ? undefined : label}
      aria-labelledby={labelledBy}
      aria-valuetext={format ? fmt(value) : undefined}
      aria-invalid={invalid || undefined}
      // Digits sit BESIDE their affix — leaning on the prefix when there is one, on the trailing edge
      // otherwise — so "$ 250" and "72 %" read as one token instead of a number marooned across the box.
      // Measured gap: one space step (4px), the affix slot's own inner padding; the CSS drops the INPUT's
      // padding on whichever side a slot occupies, so the two never double up on inset.
      data-align={prefix ? "start" : "end"}
      // The digits only — the affix slots size themselves, and counting them here as extra characters
      // under-measured them badly enough to truncate the value at the bound. `chars` is the pre-paint
      // fallback the CSS falls back to; `--ds-slider-input-text` is the measured truth.
      style={
        {
          "--ds-slider-input-chars": chars,
          ...(textWidth !== null ? { "--ds-slider-input-text": `${textWidth}px` } : null),
        } as CSSProperties
      }
    >
      {/* The measuring stand-in — hidden, out of flow, and out of the a11y tree. */}
      <span className="rt-ds-slider-input-sizer" ref={sizerRef} aria-hidden="true">
        {sample}
      </span>
      {prefix ? (
        <TextField.Slot side="left" gap="1">
          <Text size={size} aria-hidden style={{ color: "var(--ds-text-weak)" }}>{prefix}</Text>
        </TextField.Slot>
      ) : null}
      {suffix ? (
        <TextField.Slot side="right" gap="1">
          <Text size={size} aria-hidden style={{ color: "var(--ds-text-weak)" }}>{suffix}</Text>
        </TextField.Slot>
      ) : null}
    </TextField.Root>
  );
}

/* ---- the component -------------------------------------------------------- */

const INCREASE_KEYS = new Set(["ArrowRight", "ArrowUp"]);
const DECREASE_KEYS = new Set(["ArrowLeft", "ArrowDown"]);

export const Slider = forwardRef<HTMLSpanElement, SliderProps>(function Slider(
  {
    min = 0,
    max = 100,
    step = 1,
    value,
    defaultValue,
    onValueChange,
    onValueCommit,
    marks,
    showInput = false,
    inputPosition = "flank",
    minStepsBetweenThumbs = 0,
    thumbLabels,
    formatValue,
    disabled,
    size,
    orientation = "horizontal",
    inverted = false,
    variant = "surface",
    highContrast,
    color,
    radius,
    className,
    style,
    id,
    "aria-label": ariaLabel,
    "aria-labelledby": ariaLabelledBy,
  },
  ref,
) {
  // `?? "1"` here used to swallow the advertised opt-out: useResolvedSize returns undefined for
  // "inherit", and back-filling it with the small lane's step made `size="inherit"` render exactly like
  // `size="1"`. Resolve and back-fill are two different jobs — the lane resolution stays honest, and the
  // undefined case falls through to the VENDOR default one line down, not to a lane step.
  const resolvedSize = useResolvedSize<Size>("control", size);
  const effectiveSize: Size = resolvedSize ?? RADIX_DEFAULT_SIZE;
  const fieldAria = useOptionalFieldControl();
  const fieldLabelId = useOptionalFieldLabelId();
  const baseId = useId();

  const vertical = orientation === "vertical";
  // Radix's own edge/direction pair — mark positions must resolve against the SAME edge the thumb does.
  const startEdge = vertical ? (inverted ? "top" : "bottom") : inverted ? "right" : "left";
  const direction = inverted ? -1 : 1;

  /* -- value state -------------------------------------------------------- */
  const isControlled = value !== undefined;
  const [internal, setInternal] = useState<number[]>(() => defaultValue ?? [min]);
  const values = isControlled ? value : internal;
  const thumbCount = values.length;

  /* -- marks -------------------------------------------------------------- */
  const markList = useMemo<SliderMark[]>(() => {
    if (!marks) return [];
    let list: SliderMark[];
    if (marks === true) {
      if (step == null || !(step > 0)) return [];
      const count = Math.floor((max - min) / step) + 1;
      if (count > MAX_MARKS) {
        console.error(
          `Slider: marks={true} would place ${count} ticks (max ${MAX_MARKS}). Rendering none — widen \`step\` or pass an explicit \`marks\` array.`,
        );
        return [];
      }
      list = Array.from({ length: count }, (_, i) => ({ value: snapToStep(min + i * step, min, max, step) }));
    } else {
      if (marks.length > MAX_MARKS) {
        console.error(
          `Slider: ${marks.length} marks exceeds the ${MAX_MARKS} cap. Rendering none — a tick per pixel is noise, not a detent.`,
        );
        return [];
      }
      list = marks;
    }
    return list
      .filter((m) => Number.isFinite(m.value) && m.value >= min && m.value <= max)
      .sort((a, b) => a.value - b.value);
  }, [marks, min, max, step]);

  const markValues = useMemo(() => markList.map((m) => m.value), [markList]);
  const snapsToMarks = step === null;
  const hasMarkLabels = markList.some((m) => m.label != null);

  useEffect(() => {
    if (snapsToMarks && markValues.length === 0) {
      console.error(
        "Slider: `step={null}` snaps to the nearest mark, but no `marks` were given — the thumb has nowhere to land. Pass `marks`, or give `step` a number.",
      );
    }
  }, [snapsToMarks, markValues.length]);

  // The primitive needs a NUMBER step. In snap-to-marks mode it drives a fine drag resolution and the
  // snap happens on the way out; keyboard stepping is taken over below (see handleKeyDown).
  const primitiveStep = snapsToMarks ? (max - min) / 1000 || 1 : step;

  const snap = useCallback(
    (n: number) => {
      if (snapsToMarks) return markValues.length ? nearestOf(n, markValues) : clamp(n, min, max);
      return snapToStep(n, min, max, step);
    },
    [snapsToMarks, markValues, min, max, step],
  );

  /* -- change plumbing ---------------------------------------------------- */
  const same = (a: number[], b: number[]) => a.length === b.length && a.every((n, i) => n === b[i]);

  const emit = useCallback(
    (next: number[], commit: boolean) => {
      const snapped = snapsToMarks ? next.map(snap) : next;
      if (!isControlled) setInternal((prev) => (same(prev, snapped) ? prev : snapped));
      if (!same(values, snapped)) onValueChange?.(snapped);
      if (commit) onValueCommit?.(snapped);
    },
    [snapsToMarks, snap, isControlled, values, onValueChange, onValueCommit],
  );

  /* -- keyboard, in snap-to-marks mode ------------------------------------ */
  // Radix always steps by a fixed ±step. With irregular detents that lands BETWEEN marks and our snap
  // pulls it straight back to where it started, so the arrows would appear dead. We intercept instead;
  // `preventDefault` stops Radix's own handler (it composes with checkForDefaultPrevented).
  const activeIndex = useRef(0);
  const handleKeyDown = (e: ReactKeyboardEvent<HTMLSpanElement>) => {
    if (!snapsToMarks || markValues.length === 0 || disabled) return;
    const i = Math.min(activeIndex.current, thumbCount - 1);
    const current = values[i];
    const forward = INCREASE_KEYS.has(e.key) || e.key === "PageUp";
    const back = DECREASE_KEYS.has(e.key) || e.key === "PageDown";
    let target: number | undefined;
    if (e.key === "Home") target = markValues[0];
    else if (e.key === "End") target = markValues[markValues.length - 1];
    else if (forward || back) {
      const stride = e.key === "PageUp" || e.key === "PageDown" || e.shiftKey ? 10 : 1;
      const here = markValues.indexOf(nearestOf(current, markValues));
      const next = clamp(here + (forward ? stride : -stride), 0, markValues.length - 1);
      target = markValues[next];
    }
    if (target === undefined) return;
    e.preventDefault();
    const next = values.slice();
    next[i] = target;
    next.sort((a, b) => a - b);
    emit(next, true);
  };

  /* -- geometry ----------------------------------------------------------- */
  const rootRef = useRef<HTMLSpanElement | null>(null);
  const setRefs = useCallback(
    (node: HTMLSpanElement | null) => {
      rootRef.current = node;
      if (typeof ref === "function") ref(node);
      else if (ref) (ref as { current: HTMLSpanElement | null }).current = node;
    },
    [ref],
  );

  // Radix measures the thumb with a ResizeObserver to compute its inset; the mark layer reads the same
  // box so the two can never disagree (a hardcoded thumb size would drift on a size/scaling change). The
  // same pass measures the TRACK, because an offset has to be resolved to real pixels before it can be
  // snapped to the physical pixel grid — see `stopAt` below.
  const [thumbSize, setThumbSize] = useState(0);
  const [track, setTrack] = useState<TrackGeometry | null>(null);
  useLayoutEffect(() => {
    const root = rootRef.current;
    if (!root || markList.length === 0) return;
    const thumb = root.querySelector<HTMLElement>('[role="slider"]');
    if (!thumb) return;
    const read = () => {
      setThumbSize(vertical ? thumb.offsetHeight : thumb.offsetWidth);
      const box = root.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;
      const length = vertical ? box.height : box.width;
      // The track's own start edge rarely lands on a whole device pixel (a centred column, a fractional
      // gap, a scaled root), so snapping a bare offset would snap it against the wrong grid. Only the
      // sub-pixel PHASE of that edge is kept — a plain viewport coordinate would go stale on scroll.
      const anchor = vertical
        ? startEdge === "top"
          ? box.top
          : box.bottom
        : startEdge === "left"
          ? box.left
          : box.right;
      const phase = anchor - Math.round(anchor * dpr) / dpr;
      setTrack((prev) =>
        prev && prev.length === length && prev.phase === phase && prev.dpr === dpr
          ? prev
          : { length, phase, dpr },
      );
    };
    read();
    const ro = new ResizeObserver(read);
    ro.observe(thumb);
    ro.observe(root);
    // Moving the window to a display of a different density changes the grid under an unchanged layout.
    const density = window.matchMedia(`(resolution: ${window.devicePixelRatio || 1}dppx)`);
    density.addEventListener("change", read);
    return () => {
      ro.disconnect();
      density.removeEventListener("change", read);
    };
  }, [vertical, effectiveSize, markList.length, startEdge]);

  // +1 where a growing offset travels WITH the axis (left / top edges), -1 where it travels against it.
  const axisSign = startEdge === "left" || startEdge === "top" ? 1 : -1;

  /* How far a stop's CENTRE sits from the start edge, over and above its share of the track. Radix's thumb
     transform is `translateX(-50%)` / `translateY(50%)` unconditionally, and each mirrors the START edge
     only while the scale runs the usual way. On an INVERTED scale the start edge flips (right / top) but
     the transform does not, so it carries the thumb a further whole thumb-width along the offset axis —
     measured at 10px on a size-1 track. Radix's thumb still lands correctly on the value; it is the naive
     reading of its `calc()` that comes up a thumb short, and a mark positioned from that expression alone
     inherited the error (measured: every tick a thumb-width off its thumb, and unevenly spaced besides,
     because the old centring also fed each label's width back into where its tick landed). */
  const centreOffset = (p: number) =>
    (thumbSize ? thumbInBoundsOffset(thumbSize, p, direction) : 0) + (inverted ? thumbSize : 0);

  /* THE ONE POSITIONING FUNCTION. A tick and the thumb that parks on it both read it, so the two cannot
     drift apart. `raw` is Radix's own offset resolved against the measured track; `edge` is the 1px tick's
     LEADING edge snapped onto the device-pixel grid; `centre` is the line the thumb is then asked to match.

     Why snap: a 1px box at a fractional offset is antialiased across two physical columns, each painted at
     part strength, so the pair reads far lighter than the colour it was given. Sampled off the rendered
     pixels on a 1x display before this, the ticks came out between 1.95:1 and 2.98:1 against the page
     where the same colour on the grid renders 3.27:1 — barely half the contrast a non-text UI component
     owes under WCAG 1.4.11, lost entirely to geometry. Raising the token instead would have needed roughly
     5.5:1 at full strength to survive the smear, which reads as a fence rather than a detent. */
  const stopAt = (v: number) => {
    if (!track || track.length <= 0) return null;
    const p = percentOf(v, min, max);
    const raw = (p / 100) * track.length + centreOffset(p);
    const rendered = track.phase + axisSign * (raw - 0.5);
    const edge = axisSign * (Math.round(rendered * track.dpr) / track.dpr - track.phase);
    return { raw, edge, centre: edge + 0.5 };
  };

  const markStyle = (v: number): CSSProperties => {
    const stop = stopAt(v);
    if (stop) return { [startEdge]: `${stop.edge}px` } as CSSProperties;
    // First paint, before the track has been measured: Radix's own expression, less the half pixel that
    // turns a centre line into the 1px tick's leading edge.
    const p = percentOf(v, min, max);
    return { [startEdge]: `calc(${p}% + ${centreOffset(p) - 0.5}px)` } as CSSProperties;
  };

  /* The thumb rides the SAME function, so "a thumb parked on a stop sits exactly on its tick" survives the
     snap. Radix positions it from its own `calc()` on a wrapper element we don't own, so the correction is
     applied to the thumb itself as a RELATIVE offset: relative positioning leaves the wrapper's layout
     untouched, creates no stacking context (the thumb's `::before` hit area still paints behind), and
     makes the thumb the containing block for its own `::before` / `::after` — whose boxes are congruent
     with the wrapper's, so the hit area and the visible face travel with it and nothing else moves. */
  const thumbStyle = (v: number): CSSProperties | undefined => {
    const stop = stopAt(v);
    if (!stop) return undefined;
    return {
      position: "relative",
      [vertical ? "top" : "left"]: `${axisSign * (stop.centre - stop.raw)}px`,
    } as CSSProperties;
  };

  /* -- naming ------------------------------------------------------------- */
  // A `role="slider"` thumb is a span, so `Field.Label`'s `htmlFor` cannot name it — it needs
  // aria-labelledby. An explicit aria-labelledby wins; otherwise the ambient Field label supplies it.
  const groupLabelledBy = ariaLabelledBy ?? fieldLabelId ?? undefined;
  const thumbName = (i: number) =>
    thumbLabels?.[i] ?? (thumbCount === 2 ? ["Minimum", "Maximum"][i] : thumbCount > 2 ? `Value ${i + 1} of ${thumbCount}` : undefined);

  // aria-labelledby REPLACES aria-label in the accessible-name computation, so a thumb that must announce
  // BOTH its own role in the range and the field's subject ("Minimum, Price") references two ids: a
  // hidden name node of its own, then the label. With no label to reference, the two collapse into one
  // aria-label instead.
  const thumbNameId = (i: number) => `${baseId}-thumb-${i}`;
  const thumbLabelledBy = (i: number) => {
    if (!groupLabelledBy) return undefined;
    return thumbName(i) ? `${thumbNameId(i)} ${groupLabelledBy}` : groupLabelledBy;
  };
  // Radix leaves a SINGLE thumb nameless outright — the accessible name has to be forwarded onto it or
  // the control fails WCAG 4.1.2 (axe: "ARIA input field name"). This preserves that forwarding.
  const thumbAriaLabel = (i: number) => {
    if (groupLabelledBy) return undefined;
    const name = thumbName(i);
    if (name && ariaLabel) return `${name}, ${ariaLabel}`;
    return name ?? ariaLabel;
  };

  const valueText = (v: number): string | undefined => {
    const onMark = markList.find((m) => m.value === v && m.label != null);
    if (onMark && typeof onMark.label === "string") return onMark.label;
    return formatValue ? formatValue(v) : undefined;
  };

  /* -- the paired numeric field ------------------------------------------- */
  // Gating mirrors what the control can honestly support: a typed number has no meaning against
  // irregular detents, a vertical track has no flank to sit in, and past two thumbs there is no
  // "min/max" pair to label the boxes with.
  const inputsShown = showInput && !snapsToMarks && !vertical && thumbCount <= 2;
  const gap = minStepsBetweenThumbs * (typeof step === "number" ? step : 0);
  const boundsFor = (i: number) => ({
    lo: i === 0 ? min : values[i - 1] + gap,
    hi: i === thumbCount - 1 ? max : values[i + 1] - gap,
  });
  // The box is sized for the WIDEST value the scale can legally hold, so it never resizes as the value
  // grows (a jumping box under a drag reads as a glitch) and never truncates at the bound. It is sized
  // from the SCALE, not from the live neighbour-constrained bounds, or a drag would resize it.
  // `inputSample` is the text that gets measured (see `widestSample`); `inputChars` is only the count the
  // CSS falls back to before the first measurement lands. Affixes are in neither: each rides its own
  // slot, which sizes itself.
  const inputSample = useMemo(() => widestSample(min, max, step), [min, max, step]);
  const inputChars = useMemo(
    () => Math.max(...inputSample.split("\n").map((line) => line.length), 1),
    [inputSample],
  );

  const setThumbValue = (i: number, n: number) => {
    const next = values.slice();
    next[i] = n;
    next.sort((a, b) => a - b);
    emit(next, true);
  };

  const renderInput = (i: number) => {
    const { lo, hi } = boundsFor(i);
    return (
      <SliderInput
        key={i}
        value={values[i]}
        lo={lo}
        hi={hi}
        step={typeof step === "number" ? step : 1}
        chars={inputChars}
        sample={inputSample}
        size={effectiveSize}
        disabled={disabled}
        label={thumbAriaLabel(i) ?? "Value"}
        labelledBy={thumbLabelledBy(i)}
        format={formatValue}
        onCommit={(n) => setThumbValue(i, n)}
      />
    );
  };

  /* -- render ------------------------------------------------------------- */
  const rootClasses = [
    "rt-SliderRoot",
    `rt-r-size-${effectiveSize}`,
    `rt-variant-${variant}`,
    highContrast ? "rt-high-contrast" : null,
    className,
  ]
    .filter(Boolean)
    .join(" ");

  const root = (
    <SliderPrimitive.Root
      ref={setRefs}
      id={id ?? fieldAria?.id}
      className={rootClasses}
      style={style}
      data-accent-color={color}
      data-radius={radius}
      min={min}
      max={max}
      step={primitiveStep}
      value={values}
      onValueChange={(v) => emit(v, false)}
      onValueCommit={(v) => emit(v, true)}
      minStepsBetweenThumbs={minStepsBetweenThumbs}
      orientation={orientation}
      inverted={inverted}
      disabled={disabled}
      onKeyDown={handleKeyDown}
      aria-label={groupLabelledBy ? undefined : ariaLabel}
      aria-labelledby={groupLabelledBy}
    >
      <SliderPrimitive.Track className="rt-SliderTrack">
        <SliderPrimitive.Range
          className={highContrast ? "rt-SliderRange rt-high-contrast" : "rt-SliderRange"}
          data-inverted={inverted ? "" : undefined}
        />
      </SliderPrimitive.Track>
      {values.map((v, i) => {
        const { lo, hi } = boundsFor(i);
        return (
          <SliderPrimitive.Thumb
            key={i}
            className="rt-SliderThumb"
            style={thumbStyle(v)}
            onFocus={() => {
              activeIndex.current = i;
            }}
            // APG's multi-thumb rule: a dependent slider reports the NEIGHBOUR as its bound, not the
            // global one. Radix reports min/max on every thumb, which tells AT the lower thumb can
            // travel past the upper one.
            aria-valuemin={lo}
            aria-valuemax={hi}
            aria-valuetext={valueText(v)}
            aria-label={thumbAriaLabel(i)}
            aria-labelledby={thumbLabelledBy(i)}
            aria-describedby={fieldAria?.["aria-describedby"]}
            aria-invalid={fieldAria?.["aria-invalid"]}
          />
        );
      })}
      {/* The per-thumb name nodes live OUTSIDE the thumbs: `role="slider"` declares its children
          presentational, so a name node nested inside one is not reliably exposed. */}
      {groupLabelledBy
        ? values.map((_, i) =>
            thumbName(i) ? (
              <VisuallyHidden key={`name-${i}`} id={thumbNameId(i)}>{thumbName(i)}</VisuallyHidden>
            ) : null,
          )
        : null}
    </SliderPrimitive.Root>
  );

  // No marks and no fields ⇒ render the bare Root, byte-identical in shape to the stock component, so
  // nothing about an existing plain slider (vertical included) changes.
  if (markList.length === 0 && !inputsShown) return root;

  const stack = (
    <span className="rt-ds-slider-stack" data-orientation={orientation}>
      {root}
      {markList.length > 0 ? (
        <span
          className="rt-ds-slider-marks"
          data-orientation={orientation}
          data-labelled={hasMarkLabels ? "" : undefined}
          aria-hidden="true"
        >
          {markList.map((m) => (
            <span key={m.value} className="rt-ds-slider-mark" style={markStyle(m.value)}>
              <span className="rt-ds-slider-tick" />
              {m.label != null ? <span className="rt-ds-slider-mark-label">{m.label}</span> : null}
            </span>
          ))}
        </span>
      ) : null}
    </span>
  );

  if (!inputsShown) return stack;

  const flank = inputPosition === "flank" && thumbCount === 2;
  return (
    <span
      className="rt-ds-slider-field"
      data-orientation={orientation}
      role={thumbCount > 1 ? "group" : undefined}
      aria-labelledby={thumbCount > 1 ? groupLabelledBy : undefined}
      aria-label={thumbCount > 1 && !groupLabelledBy ? ariaLabel : undefined}
    >
      {flank ? renderInput(0) : null}
      {stack}
      {flank ? renderInput(1) : values.map((_, i) => renderInput(i))}
    </span>
  );
});
