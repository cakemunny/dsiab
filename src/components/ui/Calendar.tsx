/* Calendar — single + range date-picker UI, built from scratch on the --ds-* token layer. It WIRES the
 * lifted Astryx date math (src/dates/* + src/hooks/useGridFocus — DECISIONS [[catalog-as-specification]] @ commit 88c95e4) to
 * this system's own markup, tokens, and paint: no Astryx UI (StyleX / their Button/Icon) is ported.
 * The visual channels — selection = the accent TINT (--ds-fill-selected-subtle) under a --ds-text-strong
 * numeral at weight 600, today = a 2px accent bar (a THIRD channel, since fill is selection's and outline
 * is focus's), range = an intensity ramp whose endpoint step is the SAME tint composited over the band's,
 * inset focus ring — are ratified in DECISIONS [[calendar-grid]] (the endpoint step moved off the solid accent-9 fill,
 * which could not carry a numeral at 4.5:1; see the components.css note).
 * D3 a11y: aria-current on today (ADDED by us) + RTL arrow-nav (WIRED into the pre-existing useGridFocus
 * isRtl swap); aria-selected on the gridcell is a faithful port (Astryx's own).
 *
 * VIEW JUMP: the caption title is two disclosure controls — the month opens a 12-month grid, the year a
 * decade-paged year grid, both riding the same useGridFocus roving geometry and the same paint roles as the
 * day cell. They cost zero caption width (see the CSS note); every close path returns focus to the trigger;
 * chevrons and grids both stop at the constraints hook's min/max; and each view change is spoken through the
 * persistent useAnnounce region, because the caption remounts on every flip and cannot host a live region. */
import {
  forwardRef,
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type KeyboardEvent as ReactKeyboardEvent,
  type FocusEvent as ReactFocusEvent,
} from "react";
import { CaretLeft, CaretRight } from "@phosphor-icons/react";
import { Heading } from "./Heading";
import { IconButton } from "./IconButton";
import { useAnnounce } from "./useAnnounce";
import { useResolvedSize } from "../../theme/SizeContext";
import type { DateRange, DayOfWeek, ISODateString } from "../../dates/dateTypes";
import {
  type PlainDate,
  getDaysInMonth,
  plainDateFromISO,
  plainDateToISO,
  plainDateFromDate,
  plainDateToDate,
  plainDateToday,
  plainDateAddDays,
  plainDateIsEqual,
  plainDateMin,
  plainDateMax,
  plainDateGetWeekNumber,
  plainDateFormat,
  DATE_FORMAT_WITH_WEEKDAY,
  DATE_FORMAT_MONTH_YEAR,
} from "../../dates/plainDate";
import { useCalendarDays, type CalendarDay } from "../../dates/useCalendarDays";
import { useCalendarConstraints } from "../../dates/useCalendarConstraints";
import {
  computeDayCellState,
  computeDayNeighborContinuity,
  computeRangeRounding,
  computePreviewRounding,
} from "../../dates/dayCellUtils";
import { useGridFocus } from "../../hooks/useGridFocus";
import { useIsomorphicLayoutEffect } from "../../hooks/useIsomorphicLayoutEffect";

type ControlSize = "1" | "2" | "3";

/* ---- public API ---------------------------------------------------------- */

interface CalendarBaseProps {
  /** Minimum selectable date (ISO YYYY-MM-DD); earlier dates are disabled. */
  min?: ISODateString;
  /** Maximum selectable date (ISO YYYY-MM-DD); later dates are disabled. */
  max?: ISODateString;
  /**
   * Custom disable predicate — receives an ISO date string, returns **true to
   * disable**. NOTE the polarity/arg flip vs the upstream `dateConstraints`
   * (which took a native `Date` and returned true = ALLOWED): this system's
   * public contract is ISO-in / true-means-blocked, composed into
   * {@link useCalendarConstraints} at the boundary.
   */
  isDateDisabled?: (date: ISODateString) => boolean;
  /** First day of the week (0 = Sunday … 6 = Saturday). Default 0. */
  weekStartsOn?: DayOfWeek;
  /** Show 1 or 2 months side by side. Anything not exactly 2 clamps to 1. */
  numberOfMonths?: 1 | 2;
  /** Render adjacent-month spillover days (navigable, dimmed). Default true. */
  hasOutsideDays?: boolean;
  /** Prefix each week row with its ISO week number. Default false. */
  hasWeekNumbers?: boolean;
  /**
   * Which view the calendar opens on — the day grid (default), the 12-month
   * grid, or the decade-paged year grid. Uncontrolled and initial-only: a
   * birth-date field wants to land on the year grid rather than make the user
   * page there, and the docs render both grids at rest from it. Opening on a
   * grid moves no focus, exactly like opening on the day view.
   */
  defaultView?: "day" | "month" | "year";
  /** Controlled focused day (ISO) for the roving tab stop. */
  focusDate?: ISODateString;
  /** Fires when the focused day moves (keyboard nav / month flip). */
  onFocusDateChange?: (date: ISODateString) => void;
  /** Control size lane; unset follows the global uiSize (default small → "1"). */
  size?: ControlSize;
  /** Reading direction; unset is auto-detected from the DOM. */
  dir?: "ltr" | "rtl";
  className?: string;
  style?: CSSProperties;
}

export interface CalendarSingleProps extends CalendarBaseProps {
  mode?: "single";
  /** Controlled selected date (ISO). */
  value?: ISODateString;
  /** Uncontrolled initial selected date (ISO). */
  defaultValue?: ISODateString;
  /** Required. Fires with the selected ISO date. */
  onValueChange: (value: ISODateString) => void;
}

export interface CalendarRangeProps extends CalendarBaseProps {
  mode: "range";
  /** Controlled selected range (ISO start/end). */
  value?: DateRange;
  /** Uncontrolled initial range (ISO start/end). */
  defaultValue?: DateRange;
  /** Required. Fires with the committed {start, end} ISO range. */
  onValueChange: (value: DateRange) => void;
}

export type CalendarProps = CalendarSingleProps | CalendarRangeProps;

/* ---- helpers ------------------------------------------------------------- */

const WEEKDAY_FULL = [
  "Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday",
] as const;

// Heading size for the month caption per control-size lane (kept modest so the
// caption sits with the grid rather than dominating it).
const CAPTION_HEADING_SIZE: Record<ControlSize, "3" | "4" | "5"> = { "1": "3", "2": "4", "3": "5" };

const firstOfMonth = (pd: PlainDate): PlainDate => ({ year: pd.year, month: pd.month, day: 1 });
const monthOrdinal = (pd: PlainDate): number => pd.year * 12 + (pd.month - 1);

// Add n months, clamping the day to the target month's length (Jan 31 + 1 →
// Feb 28/29, never rolling into March like a naive Date.setMonth would).
function addMonthsClamped(pd: PlainDate, n: number): PlainDate {
  const ord = monthOrdinal(pd) + n;
  const year = Math.floor(ord / 12);
  const month = (ord % 12) + 1;
  return { year, month, day: Math.min(pd.day, getDaysInMonth(year, month)) };
}

// Shift viewStart the minimum needed to keep `target` inside the displayed span.
function ensureVisible(viewStart: PlainDate, target: PlainDate, months: number): PlainDate {
  const first = monthOrdinal(viewStart);
  const last = first + (months - 1);
  const t = monthOrdinal(target);
  if (t < first) return firstOfMonth(target);
  if (t > last) return firstOfMonth(addMonthsClamped(target, -(months - 1)));
  return viewStart;
}

function initialAnchor(props: CalendarProps): PlainDate {
  if (props.focusDate) return plainDateFromISO(props.focusDate);
  if (props.mode === "range") {
    const v = props.value ?? props.defaultValue;
    if (v?.start) return plainDateFromISO(v.start);
  } else {
    const v = props.value ?? props.defaultValue;
    if (v) return plainDateFromISO(v);
  }
  return plainDateToday();
}

/* ---- caption (nav chrome + the two view controls) ------------------------ */

/** Which view-jump grid a caption control opens. */
type PickerKind = "month" | "year";

interface CaptionNav {
  label: string;
  direction: -1 | 1;
  disabled: boolean;
  onClick: () => void;
}

interface CalendarCaptionProps {
  /** Only the caption that names a day grid needs an id (`aria-labelledby`). */
  headingId?: string;
  monthDate: PlainDate;
  size: ControlSize;
  isRtl: boolean;
  /** The pane that owns the view controls. A second month's caption is a plain label. */
  interactive: boolean;
  openPicker: PickerKind | null;
  onTogglePicker: (kind: PickerKind) => void;
  prev: CaptionNav | null;
  next: CaptionNav | null;
}

/* The month name and the year are SEPARATE controls: the month opens a 12-month grid,
   the year a paginated year grid. The split is taken from Intl's own formatted parts,
   in locale order — ja-JP writes the year first, so hand-splitting on a space (or
   assuming month-then-year) would put the controls in the wrong order or fuse them.
   The parts are wrapped in place inside the SAME <h2>, so the day grid's
   `aria-labelledby` still resolves to "September 2026". */
function CalendarCaption(props: CalendarCaptionProps) {
  const { headingId, monthDate, size, isRtl, interactive, openPicker, onTogglePicker, prev, next } = props;

  const parts = useMemo(
    () => new Intl.DateTimeFormat(undefined, DATE_FORMAT_MONTH_YEAR).formatToParts(plainDateToDate(monthDate)),
    [monthDate],
  );

  const renderNav = (nav: CaptionNav | null) => {
    if (!nav) return null;
    const pointsLeft = isRtl ? nav.direction === 1 : nav.direction === -1;
    return (
      // The chevron takes the CALENDAR's resolved step, never its own ([[container-size-seeding]]). Left unsized it
      // re-read the ambient tier, so an explicitly-sized calendar seated in a smaller context put a
      // step-1 chevron (24px) beside step-3 day cells (36px) — the seeding seam, inside one component.
      <IconButton size={size} priority="tertiary" aria-label={nav.label} disabled={nav.disabled} onClick={nav.onClick}>
        {pointsLeft ? <CaretLeft /> : <CaretRight />}
      </IconButton>
    );
  };

  return (
    <div className="rt-ds-calendar-caption">
      <span className="rt-ds-calendar-nav-slot">{renderNav(prev)}</span>
      <Heading as="h2" id={headingId} size={CAPTION_HEADING_SIZE[size]} className="rt-ds-calendar-heading">
        {parts.map((part, i) => {
          const kind: PickerKind | null =
            part.type === "month" ? "month" : part.type === "year" ? "year" : null;
          if (!kind || !interactive) return <span key={i}>{part.value}</span>;
          return (
            <button
              key={i}
              type="button"
              className="rt-ds-calendar-caption-btn"
              data-picker-trigger={kind}
              aria-expanded={openPicker === kind}
              // A `title` is the DESCRIPTION here (the button's own text names it), so the
              // <h2> still computes to "September 2026" for the grid's aria-labelledby.
              title={kind === "month" ? "Choose a month" : "Choose a year"}
              onClick={() => onTogglePicker(kind)}
            >
              <span className="rt-ds-calendar-caption-label">{part.value}</span>
            </button>
          );
        })}
      </Heading>
      <span className="rt-ds-calendar-nav-slot">{renderNav(next)}</span>
    </div>
  );
}

/* ---- month / year picker grid -------------------------------------------- */

const PICKER_CELLS = 12;

/* A year page is a decade PLUS one leading and one trailing neighbour — 12 cells, the
   same shape as the 12-month grid, and the two adjacent years are reachable without
   paging. The neighbours are dimmed, reusing the day grid's out-of-month idiom. */
const decadePageStart = (year: number) => Math.floor(year / 10) * 10 - 1;

interface PickerOption {
  key: string;
  label: string;
  /** Set only when it adds to the visible label (a month cell needs its year). */
  ariaLabel?: string;
  year: number;
  /** 1-12 for a month cell; null for a year cell. */
  month: number | null;
  isCurrent: boolean;
  isToday: boolean;
  isOutside: boolean;
  disabled: boolean;
}

interface CalendarPickerProps {
  kind: PickerKind;
  columns: number;
  /** month: the year whose months are listed. year: the anchor year of the decade page. */
  pageYear: number;
  /** The month the day view is showing — the cell that reads as current. */
  current: PlainDate;
  today: PlainDate;
  minDate: PlainDate | null;
  maxDate: PlainDate | null;
  isRtl: boolean;
  onPick: (year: number, month: number | null) => void;
  onPage: (dir: -1 | 1, focusIndex: number | null) => void;
  /** Continue the year sequence past a grid edge, paging to whichever page holds it. */
  onGoToYear: (year: number) => void;
}

function CalendarPicker(props: CalendarPickerProps) {
  const { kind, columns, pageYear, current, today, minDate, maxDate, isRtl, onPick, onPage, onGoToYear } = props;

  const options = useMemo<PickerOption[]>(() => {
    const minOrd = minDate ? monthOrdinal(minDate) : null;
    const maxOrd = maxDate ? monthOrdinal(maxDate) : null;
    if (kind === "month") {
      const short = new Intl.DateTimeFormat(undefined, { month: "short" });
      const long = new Intl.DateTimeFormat(undefined, { month: "long", year: "numeric" });
      return Array.from({ length: PICKER_CELLS }, (_, i) => {
        const at = plainDateToDate({ year: pageYear, month: i + 1, day: 1 });
        const ord = pageYear * 12 + i;
        return {
          key: `${pageYear}-${i + 1}`,
          label: short.format(at),
          ariaLabel: long.format(at),
          year: pageYear,
          month: i + 1,
          isCurrent: pageYear === current.year && i + 1 === current.month,
          isToday: pageYear === today.year && i + 1 === today.month,
          isOutside: false,
          // A month is reachable while ANY of its days is in bounds.
          disabled: (minOrd !== null && ord < minOrd) || (maxOrd !== null && ord > maxOrd),
        };
      });
    }
    const start = decadePageStart(pageYear);
    return Array.from({ length: PICKER_CELLS }, (_, i) => {
      const year = start + i;
      return {
        key: String(year),
        label: String(year),
        year,
        month: null,
        isCurrent: year === current.year,
        isToday: year === today.year,
        isOutside: i === 0 || i === PICKER_CELLS - 1,
        disabled: (!!minDate && year < minDate.year) || (!!maxDate && year > maxDate.year),
      };
    });
  }, [kind, pageYear, current, today, minDate, maxDate]);

  const grid = useGridFocus<HTMLTableElement>({
    columns,
    cellSelector: '[role="gridcell"]',
    isCellFocusable: (cell) => {
      const btn = cell.querySelector("button");
      return !!btn && btn.getAttribute("aria-disabled") !== "true";
    },
    getFocusTarget: (cell) => cell.querySelector("button"),
    hasRovingTabIndex: true,
    isRtl,
    // Both grids page by their parent unit: Page Up/Down jump a DECADE in the year grid
    // and a YEAR in the month grid, holding the grid position across the flip.
    //
    // An edge ARROW continues the sequence in the YEAR grid only: because a year page
    // shows the decade plus a neighbour on each side, consecutive pages overlap by two,
    // so stepping off 2019 must land on 2018 wherever it lives — not on the previous
    // page's last cell (2020, a year LATER, which is what a fixed index would give). A
    // month page has no such overlap — twelve months IS the year, with nothing shared
    // across the boundary — so its edges stop and the chevrons or Page keys carry you.
    onPageUp: () => onPage(-1, focusedIndex()),
    onPageDown: () => onPage(1, focusedIndex()),
    onNavigateBefore:
      kind === "year"
        ? (col, offset) =>
            // offset 1 = a horizontal step off the first cell; otherwise a vertical step
            // off the top row, which continues down the same column.
            onGoToYear(offset === 1 ? options[0].year - 1 : options[col].year - columns)
        : undefined,
    onNavigateAfter:
      kind === "year"
        ? (col, offset) =>
            onGoToYear(
              offset === 1
                ? options[PICKER_CELLS - 1].year + 1
                : options[PICKER_CELLS - columns + col].year + columns,
            )
        : undefined,
  });

  const handleKeyDown = grid.handleKeyDown;

  const rows: PickerOption[][] = [];
  for (let i = 0; i < options.length; i += columns) rows.push(options.slice(i, i + columns));

  const first = options[0];
  const last = options[options.length - 1];
  const gridLabel =
    kind === "month"
      ? `Months in ${pageYear}`
      : `Years ${first.label} to ${last.label}`;

  /* The roving tab stop. The CURRENT cell owns it, but a page you have stepped onto has no
     current cell (paging the month grid to next year leaves nothing selected), and with
     every cell at tabIndex -1 the grid would drop out of the tab order entirely. So fall
     back to the first cell that can take focus. Selection paint stays keyed on `isCurrent`
     — this is where the TAB lands, not what reads as chosen. */
  const rovingKey =
    (options.find((o) => o.isCurrent && !o.disabled) ?? options.find((o) => !o.disabled))?.key;

  return (
    <table
      ref={grid.gridRef}
      role="grid"
      aria-label={gridLabel}
      className="rt-ds-calendar-picker"
      onKeyDown={handleKeyDown}
      onFocus={grid.handleFocus}
    >
      <tbody>
        {rows.map((row, ri) => (
          <tr role="row" key={ri}>
            {row.map((opt, ci) => (
              <td
                key={opt.key}
                role="gridcell"
                className="rt-ds-calendar-picker-cell"
                aria-selected={opt.isCurrent || undefined}
                aria-current={opt.isToday ? "date" : undefined}
              >
                <button
                  type="button"
                  className="rt-ds-calendar-picker-option"
                  data-idx={ri * columns + ci}
                  data-picker-value={opt.key}
                  tabIndex={opt.key === rovingKey ? 0 : -1}
                  aria-label={opt.ariaLabel}
                  aria-disabled={opt.disabled || undefined}
                  data-outside={opt.isOutside || undefined}
                  data-selected={opt.isCurrent || undefined}
                  data-today={opt.isToday || undefined}
                  onClick={() => {
                    if (!opt.disabled) onPick(opt.year, opt.month);
                  }}
                >
                  <span className="rt-ds-calendar-picker-label">{opt.label}</span>
                  {opt.isToday && <span className="rt-ds-calendar-today-bar" aria-hidden="true" />}
                </button>
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
}

// The roving cell a page-step should land on: keep the same grid position across the flip.
function focusedIndex(): number {
  const idx = document.activeElement?.getAttribute?.("data-idx");
  return idx ? Number(idx) : 0;
}

/* ---- one month table (owns its grid keyboard) ---------------------------- */

interface CalendarMonthProps {
  monthDate: PlainDate; // first of the month to render
  weekStartsOn: DayOfWeek;
  hasOutsideDays: boolean;
  hasWeekNumbers: boolean;
  mode: "single" | "range";
  size: ControlSize;
  today: PlainDate;
  isRtl: boolean;
  selectedDate: PlainDate | null;
  rangeStart: PlainDate | null;
  rangeEnd: PlainDate | null;
  previewStart: PlainDate | null;
  previewEnd: PlainDate | null;
  focusDate: PlainDate;
  isDateDisabled: (date: PlainDate) => boolean;
  /** Nav chrome for this pane's caption; null where the pair is split to the sibling pane. */
  prev: CaptionNav | null;
  next: CaptionNav | null;
  /** Only the first pane's caption carries the month/year view controls. */
  interactive: boolean;
  onTogglePicker: (kind: PickerKind) => void;
  onDaySelect: (day: CalendarDay) => void;
  onDayHover: (date: PlainDate | null) => void;
  onFocusDate: (date: PlainDate) => void;
  onPageStep: (dir: -1 | 1) => void;
  onYearStep: (dir: -1 | 1) => void;
  onEdge: (dir: -1 | 1, offset: number) => void;
  onEscape: () => void;
}

function CalendarMonth(props: CalendarMonthProps) {
  const {
    monthDate, weekStartsOn, hasOutsideDays, hasWeekNumbers, mode, size, today, isRtl,
    selectedDate, rangeStart, rangeEnd, previewStart, previewEnd, focusDate, isDateDisabled,
    prev, next, interactive, onTogglePicker, onDaySelect, onDayHover, onFocusDate, onPageStep,
    onYearStep, onEdge, onEscape,
  } = props;

  const { weeks, dayNames } = useCalendarDays({
    year: monthDate.year,
    month: monthDate.month,
    weekStartsOn,
  });
  const captionId = useId();

  const grid = useGridFocus<HTMLTableElement>({
    columns: 7,
    cellSelector: '[role="gridcell"]',
    // Constraint-disabled days carry aria-disabled (not native `disabled`, so
    // they stay in the a11y tree) — treat them as non-focusable for roving.
    // Outside (adjacent-month) days are also skipped: in a two-month view a
    // boundary date renders twice (in-month + as a dimmed spillover), so roving
    // onto the spillover would land focus on the wrong pane's greyed copy;
    // excluding them makes an edge arrow fall through to onNavigateAfter/Before,
    // which flips the month (single) or crosses to the in-month cell (two-month).
    // They stay click-navigable (onClick flips the month).
    isCellFocusable: (cell) => {
      const btn = cell.querySelector("button");
      return (
        !!btn &&
        btn.getAttribute("aria-disabled") !== "true" &&
        btn.getAttribute("data-outside") !== "true"
      );
    },
    getFocusTarget: (cell) => cell.querySelector("button"),
    hasRovingTabIndex: true,
    isRtl,
    onPageUp: () => onPageStep(-1),
    onPageDown: () => onPageStep(1),
    onNavigateBefore: (_col, offset) => onEdge(-1, offset),
    onNavigateAfter: (_col, offset) => onEdge(1, offset),
  });

  // Escape (cancel in-progress range) and Shift+PageUp/Down (year) are handled
  // ahead of the grid — the grid would otherwise treat PageUp/Down as month nav
  // regardless of Shift.
  const handleKeyDown = useCallback(
    (e: ReactKeyboardEvent) => {
      if (e.key === "Escape") {
        onEscape();
        return;
      }
      if ((e.key === "PageUp" || e.key === "PageDown") && e.shiftKey) {
        e.preventDefault();
        onYearStep(e.key === "PageUp" ? -1 : 1);
        return;
      }
      grid.handleKeyDown(e);
    },
    [grid, onEscape, onYearStep],
  );

  // Keep the roving stop synced AND mirror DOM focus back into React state so
  // the declared tabIndex tracks the focused day (never parse the human label —
  // data-date is the machine-readable source).
  const handleFocus = useCallback(
    (e: ReactFocusEvent) => {
      grid.handleFocus(e);
      const iso = (e.target as HTMLElement).getAttribute?.("data-date");
      if (iso) onFocusDate(plainDateFromISO(iso as ISODateString));
    },
    [grid, onFocusDate],
  );

  const renderDay = (day: CalendarDay, dayIndex: number, week: CalendarDay[]) => {
    if (day.isOutside && !hasOutsideDays) {
      return (
        <td
          key={day.iso}
          role="gridcell"
          aria-hidden="true"
          className="rt-ds-calendar-cell rt-ds-calendar-cell--empty"
        />
      );
    }

    const constraintDisabled = isDateDisabled(day.date);
    const state = computeDayCellState({
      date: day.date,
      dayIndex,
      mode,
      selectedDate,
      rangeStart,
      rangeEnd,
      previewStart,
      previewEnd,
      today,
      isDisabled: constraintDisabled,
      isOutside: day.isOutside,
    });

    const rangeActive = state.isInRange || state.isRangeStart || state.isRangeEnd;
    const previewActive = state.isInPreview || state.isPreviewStart || state.isPreviewEnd;

    // A single selected day is a fully rounded chip; a range/preview cell rounds
    // only where the highlight run breaks (endpoints + row edges + neighbour
    // discontinuity), so the band stays continuous between the endpoints.
    let roundStart = state.isSelected;
    let roundEnd = state.isSelected;
    if (rangeActive || previewActive) {
      const neighbors = computeDayNeighborContinuity({
        week,
        dayIndex,
        mode,
        rangeStart,
        rangeEnd,
        previewStart,
        previewEnd,
        isDisabled: isDateDisabled,
      });
      const rounding = rangeActive
        ? computeRangeRounding(state, { prevInRange: neighbors.prevInRange, nextInRange: neighbors.nextInRange })
        : computePreviewRounding(state, { prevInPreview: neighbors.prevInPreview, nextInPreview: neighbors.nextInPreview });
      roundStart = roundStart || rounding.roundLeft;
      roundEnd = roundEnd || rounding.roundRight;
    }

    const isEndpoint =
      state.isSelected || state.isRangeStart || state.isRangeEnd || state.isPreviewStart || state.isPreviewEnd;
    const ariaSelected =
      state.isSelected || state.isRangeStart || state.isRangeEnd || state.isInRange ? true : undefined;
    // The declared roving stop is the in-month focusDate cell only — never an
    // outside spillover copy of it (that lives in the other pane), so a month
    // without focusDate falls back to its first in-month focusable cell.
    const isSeed = plainDateIsEqual(day.date, focusDate) && !constraintDisabled && !day.isOutside;

    return (
      <td
        key={day.iso}
        role="gridcell"
        className="rt-ds-calendar-cell"
        aria-selected={ariaSelected}
        aria-current={state.isToday ? "date" : undefined}
      >
        <button
          type="button"
          data-date={day.iso}
          className="rt-ds-calendar-day"
          tabIndex={isSeed ? 0 : -1}
          aria-label={plainDateFormat(day.date, DATE_FORMAT_WITH_WEEKDAY)}
          aria-disabled={constraintDisabled || undefined}
          data-outside={day.isOutside || undefined}
          data-today={state.isToday || undefined}
          data-selected={state.isSelected || undefined}
          data-range={rangeActive ? (state.isRangeStart ? "start" : state.isRangeEnd ? "end" : "middle") : undefined}
          data-preview={previewActive ? (state.isPreviewStart ? "start" : state.isPreviewEnd ? "end" : "middle") : undefined}
          data-endpoint={isEndpoint || undefined}
          data-round-start={roundStart || undefined}
          data-round-end={roundEnd || undefined}
          onClick={() => onDaySelect(day)}
          onMouseEnter={() => {
            if (!constraintDisabled) onDayHover(day.date);
          }}
        >
          <span className="rt-ds-calendar-day-num">{day.dayNumber}</span>
          {state.isToday && <span className="rt-ds-calendar-today-bar" aria-hidden="true" />}
        </button>
      </td>
    );
  };

  return (
    <div className="rt-ds-calendar-month">
      <CalendarCaption
        headingId={captionId}
        monthDate={monthDate}
        size={size}
        isRtl={isRtl}
        interactive={interactive}
        openPicker={null}
        onTogglePicker={onTogglePicker}
        prev={prev}
        next={next}
      />

      <table
        ref={grid.gridRef}
        role="grid"
        aria-labelledby={captionId}
        className="rt-ds-calendar-grid"
        onKeyDown={handleKeyDown}
        onFocus={handleFocus}
      >
        <thead>
          <tr role="row">
            {hasWeekNumbers && (
              <th role="columnheader" scope="col" className="rt-ds-calendar-weeknum-head">
                <abbr title="Week number" className="rt-ds-calendar-weekday-abbr">Wk</abbr>
              </th>
            )}
            {dayNames.map((dn, i) => (
              <th key={i} role="columnheader" scope="col" className="rt-ds-calendar-weekday">
                <abbr title={WEEKDAY_FULL[(i + weekStartsOn) % 7]} className="rt-ds-calendar-weekday-abbr">
                  {dn}
                </abbr>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {weeks.map((week, wi) => {
            // With outside days hidden, a fully-adjacent-month week would render as a row of empty
            // aria-hidden gridcells — which trips axe's aria-required-children (a role="row" needs a
            // perceivable gridcell). Drop the row entirely; it holds no in-month day and no focusable cell,
            // so the roving grid geometry (7 cols × remaining rows) stays intact.
            if (!hasOutsideDays && week.every((day) => day.isOutside)) return null;
            return (
              <tr role="row" key={wi}>
                {hasWeekNumbers && (
                  <th role="rowheader" scope="row" className="rt-ds-calendar-weeknum">
                    {plainDateGetWeekNumber(week[0].date)}
                  </th>
                )}
                {week.map((day, di) => renderDay(day, di, week))}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

/* ---- Calendar (state + layout) ------------------------------------------- */

export const Calendar = forwardRef<HTMLDivElement, CalendarProps>(function Calendar(props, ref) {
  const {
    min, max, isDateDisabled: isDateDisabledProp, weekStartsOn = 0, numberOfMonths = 1,
    hasOutsideDays = true, hasWeekNumbers = false, size, dir, className, style,
  } = props;

  const mode: "single" | "range" = props.mode === "range" ? "range" : "single";
  const months = numberOfMonths === 2 ? 2 : 1;
  const resolvedSize = useResolvedSize<ControlSize>("control", size) ?? "1";
  const today = useMemo(() => plainDateToday(), []);

  const rootRef = useRef<HTMLDivElement | null>(null);
  const pendingFocus = useRef<ISODateString | null>(null);
  // A pending focus target expressed as a selector — used by the month/year grids, whose
  // cells (and the caption triggers they return to) have no ISO identity.
  const pendingSelector = useRef<string | null>(null);
  const announce = useAnnounce();

  /* --- constraints: compose the public predicate into the lifted hook -------
     The hook's dateConstraints receive a native Date and return true = ALLOWED;
     our public prop receives an ISO string and returns true = DISABLED. Negate
     to bridge the polarity, and convert Date → PlainDate → ISO for the arg. */
  const dateConstraints = useMemo(() => {
    if (!isDateDisabledProp) return undefined;
    return [(date: Date) => !isDateDisabledProp(plainDateToISO(plainDateFromDate(date)))];
  }, [isDateDisabledProp]);
  const { isDateDisabled, minDate, maxDate } = useCalendarConstraints({ min, max, dateConstraints });

  /* --- committed value (controlled or uncontrolled) ------------------------ */
  const isRange = mode === "range";
  const singleControlled = !isRange ? (props as CalendarSingleProps).value : undefined;
  const rangeControlled = isRange ? (props as CalendarRangeProps).value : undefined;
  const [singleUncontrolled, setSingleUncontrolled] = useState<ISODateString | null>(
    () => (!isRange ? ((props as CalendarSingleProps).defaultValue ?? null) : null),
  );
  const [rangeUncontrolled, setRangeUncontrolled] = useState<DateRange | null>(
    () => (isRange ? ((props as CalendarRangeProps).defaultValue ?? null) : null),
  );
  const singleValue = singleControlled !== undefined ? singleControlled : singleUncontrolled;
  const rangeValue = rangeControlled !== undefined ? rangeControlled : rangeUncontrolled;

  /* --- in-progress range selection ----------------------------------------- */
  const [anchor, setAnchor] = useState<PlainDate | null>(null);
  const [hoverDate, setHoverDate] = useState<PlainDate | null>(null);

  /* --- view + focus --------------------------------------------------------- */
  const [viewStart, setViewStart] = useState<PlainDate>(() => firstOfMonth(initialAnchor(props)));
  const [focusDate, setFocusDateState] = useState<PlainDate>(() => initialAnchor(props));

  /* --- month / year view-jump grids ----------------------------------------- */
  const [picker, setPicker] = useState<PickerKind | null>(
    () => (props.defaultView === "month" || props.defaultView === "year" ? props.defaultView : null),
  );
  // The page anchor for BOTH grids: the year the month grid lists, and the year whose
  // decade page the year grid shows. Shared because both grids page — the month grid a
  // year at a time, the year grid a decade — so both need somewhere to hold the page.
  const [pickerYear, setPickerYear] = useState<number>(() => viewStart.year);

  const setFocusDate = useCallback(
    (pd: PlainDate) => {
      setFocusDateState((prev) => (plainDateIsEqual(prev, pd) ? prev : pd));
      props.onFocusDateChange?.(plainDateToISO(pd));
    },
    // onFocusDateChange is stable enough for consumers; re-bind on change only.
    [props.onFocusDateChange],
  );

  // Controlled focusDate → keep internal state in sync.
  const focusDateProp = props.focusDate;
  useEffect(() => {
    if (focusDateProp) setFocusDateState(plainDateFromISO(focusDateProp));
  }, [focusDateProp]);

  // Keep the focused day within the displayed span.
  useEffect(() => {
    setViewStart((vs) => ensureVisible(vs, focusDate, months));
  }, [focusDate, months]);

  // Move both the focused day and (if needed) the view, then steal DOM focus to
  // that day's button after commit — used by keyboard nav + month/year flips,
  // where the target may live in a sibling month or a not-yet-rendered month.
  const moveFocusTo = useCallback(
    (target: PlainDate) => {
      setFocusDate(target);
      setViewStart((vs) => ensureVisible(vs, target, months));
      pendingFocus.current = plainDateToISO(target);
    },
    [months, setFocusDate],
  );

  useIsomorphicLayoutEffect(() => {
    const sel = pendingSelector.current;
    if (sel && rootRef.current) {
      pendingSelector.current = null;
      rootRef.current.querySelector<HTMLElement>(sel)?.focus();
    }
    const iso = pendingFocus.current;
    if (!iso || !rootRef.current) return;
    pendingFocus.current = null;
    // Prefer the in-month cell: in a two-month view the target date can also
    // render as a dimmed spillover in the sibling pane, and querySelector would
    // otherwise return that first DOM match.
    const btn =
      rootRef.current.querySelector<HTMLElement>(`button[data-date="${iso}"]:not([data-outside])`) ??
      rootRef.current.querySelector<HTMLElement>(`button[data-date="${iso}"]`);
    if (btn && btn.getAttribute("aria-disabled") !== "true") btn.focus();
  });

  /* --- selection resolution ------------------------------------------------- */
  const selectedDate = useMemo(
    () => (!isRange && singleValue ? plainDateFromISO(singleValue) : null),
    [isRange, singleValue],
  );
  const { rangeStart, rangeEnd, previewStart, previewEnd } = useMemo(() => {
    if (!isRange) return { rangeStart: null, rangeEnd: null, previewStart: null, previewEnd: null };
    if (anchor) {
      const other = hoverDate ?? anchor;
      return {
        rangeStart: null,
        rangeEnd: null,
        previewStart: plainDateMin(anchor, other),
        previewEnd: plainDateMax(anchor, other),
      };
    }
    if (rangeValue) {
      const a = plainDateFromISO(rangeValue.start);
      const b = plainDateFromISO(rangeValue.end);
      return {
        rangeStart: plainDateMin(a, b),
        rangeEnd: plainDateMax(a, b),
        previewStart: null,
        previewEnd: null,
      };
    }
    return { rangeStart: null, rangeEnd: null, previewStart: null, previewEnd: null };
  }, [isRange, anchor, hoverDate, rangeValue]);

  /* --- interaction handlers ------------------------------------------------- */
  const onDaySelect = useCallback(
    (day: CalendarDay) => {
      if (isDateDisabled(day.date)) return;
      if (day.isOutside) setViewStart(firstOfMonth(day.date));

      if (!isRange) {
        if (singleControlled === undefined) setSingleUncontrolled(day.iso);
        (props as CalendarSingleProps).onValueChange(day.iso);
      } else if (!anchor) {
        setAnchor(day.date);
        setHoverDate(null);
        if (rangeControlled === undefined) setRangeUncontrolled(null);
      } else {
        const s = plainDateMin(anchor, day.date);
        const e = plainDateMax(anchor, day.date);
        const committed: DateRange = { start: plainDateToISO(s), end: plainDateToISO(e) };
        if (rangeControlled === undefined) setRangeUncontrolled(committed);
        (props as CalendarRangeProps).onValueChange(committed);
        setAnchor(null);
        setHoverDate(null);
      }
      setFocusDate(day.date);
    },
    [isDateDisabled, isRange, anchor, singleControlled, rangeControlled, props, setFocusDate],
  );

  const onDayHover = useCallback(
    (pd: PlainDate | null) => {
      if (isRange && anchor) setHoverDate(pd);
    },
    [isRange, anchor],
  );

  const onEscape = useCallback(() => {
    if (isRange && anchor) {
      setAnchor(null);
      setHoverDate(null);
    }
  }, [isRange, anchor]);

  /* --- what the view is showing, as a sentence -----------------------------
     The caption <h2> is keyed by month ordinal, so it is REMOUNTED on every flip —
     an aria-live on it is "born with its content" and screen readers drop it. The
     persistent useAnnounce region is announced through instead, so a pointer flip
     (a chevron, a month/year pick) is spoken even though focus never moves. */
  const viewLabel = useCallback(
    (vs: PlainDate) => {
      const first = plainDateFormat(vs, DATE_FORMAT_MONTH_YEAR);
      if (months === 1) return first;
      return `${first} to ${plainDateFormat(addMonthsClamped(vs, months - 1), DATE_FORMAT_MONTH_YEAR)}`;
    },
    [months],
  );

  /* --- navigation bounds ----------------------------------------------------
     Both chevrons and both grids stop at the constraint hook's min/max, so a click
     can no longer page into a month where every day is disabled. */
  const viewOrd = monthOrdinal(viewStart);
  const minOrd = minDate ? monthOrdinal(minDate) : null;
  const maxOrd = maxDate ? monthOrdinal(maxDate) : null;
  const canStepPrev = minOrd === null || viewOrd - 1 >= minOrd;
  const canStepNext = maxOrd === null || viewOrd + 1 <= maxOrd;
  /* Each grid pages by its own PARENT unit — the day grid steps a month, the month grid
     steps a year, the year grid steps a decade. The month grid used to be the one view
     with no chevrons at all (two empty reserved slots where the arrows sit everywhere
     else), which made "open the months, realise you want next year" a dead end: the only
     way on was to leave for a different grid and come back. Same bound rule as the
     others — a page with nothing selectable on it can't be reached. */
  const pickerPageStep = picker === "year" ? 10 : 1;
  const yearPageStart = picker === "year" ? decadePageStart(pickerYear) : pickerYear;
  const yearPageEnd = picker === "year" ? yearPageStart + PICKER_CELLS - 1 : pickerYear;
  const canPagePrev = !minDate || yearPageStart > minDate.year;
  const canPageNext = !maxDate || yearPageEnd < maxDate.year;

  const onChevron = useCallback(
    (dir: -1 | 1) => {
      const nextView = firstOfMonth(addMonthsClamped(viewStart, dir));
      setViewStart(nextView);
      setFocusDate(addMonthsClamped(focusDate, dir));
      announce(viewLabel(nextView));
    },
    [viewStart, focusDate, setFocusDate, announce, viewLabel],
  );
  const onPageStep = useCallback((dir: -1 | 1) => moveFocusTo(addMonthsClamped(focusDate, dir)), [focusDate, moveFocusTo]);
  const onYearStep = useCallback((dir: -1 | 1) => moveFocusTo(addMonthsClamped(focusDate, dir * 12)), [focusDate, moveFocusTo]);
  const onEdge = useCallback(
    (dir: -1 | 1, offset: number) => moveFocusTo(plainDateAddDays(focusDate, dir * offset)),
    [focusDate, moveFocusTo],
  );

  /* --- picker open / close / commit ----------------------------------------
     A caption control is a DISCLOSURE: it owns the grid it opens (aria-expanded),
     so every close path — Escape, a re-click, and a committed pick — returns focus
     to that same trigger. Landing in the day grid instead would strand the user one
     Shift+Tab away from the sibling control they were about to use, and would make
     "cancelled" and "committed" feel like different components. */
  const triggerSelector = (kind: PickerKind) =>
    `.rt-ds-calendar-caption-btn[data-picker-trigger="${kind}"]`;

  const onTogglePicker = useCallback(
    (kind: PickerKind) => {
      if (picker === kind) {
        setPicker(null);
        pendingSelector.current = triggerSelector(kind);
        return;
      }
      setPicker(kind);
      setPickerYear(viewStart.year);
      pendingSelector.current = ".rt-ds-calendar-picker-option[data-selected]";
    },
    [picker, viewStart.year],
  );

  // Escape is bound to the whole picker PANEL, not just its grid: the decade chevrons
  // are inside the panel but outside the table, and a grid-only handler left Escape
  // dead whenever focus sat on one.
  //
  // stopPropagation keeps the key inside the calendar's own React tree. It canNOT hold
  // back a host popover: Radix's dismiss layer listens on `document` in the CAPTURE
  // phase, so it has already run by the time any handler here is reached. A host that
  // wants Escape to close only the grid reads `data-picker` off the calendar root and
  // preventDefaults its own `onEscapeKeyDown` while it is set.
  const onPickerEscape = useCallback(
    (e: ReactKeyboardEvent) => {
      if (e.key !== "Escape" || !picker) return;
      e.stopPropagation();
      setPicker(null);
      pendingSelector.current = triggerSelector(picker);
    },
    [picker],
  );

  const onPickerGoToYear = useCallback((year: number) => {
    setPickerYear(year);
    pendingSelector.current = `.rt-ds-calendar-picker-option[data-picker-value="${year}"]`;
  }, []);

  const onPickerPage = useCallback(
    (dir: -1 | 1, focusIndex: number | null) => {
      const nextYear = pickerYear + dir * pickerPageStep;
      setPickerYear(nextYear);
      // A chevron click passes null: focus stays on the chevron the user is using.
      if (focusIndex !== null) {
        pendingSelector.current = `.rt-ds-calendar-picker-option[data-idx="${focusIndex}"]`;
      }
      if (picker === "year") {
        const start = decadePageStart(nextYear);
        announce(`Years ${start} to ${start + PICKER_CELLS - 1}`);
      } else {
        // The grid's own name — the same sentence its aria-label carries — so a screen
        // reader hears where the page landed even though focus never moved.
        announce(`Months in ${nextYear}`);
      }
    },
    [pickerYear, pickerPageStep, picker, announce],
  );

  const onPickerPick = useCallback(
    (year: number, month: number | null) => {
      const kind = picker;
      const nextView = firstOfMonth({ year, month: month ?? viewStart.month, day: 1 });
      // Carry the focused day-of-month across the jump so a following Tab lands on the
      // same weekday-of-month the user was on (clamped: Jan 31 → Feb 28).
      setFocusDate(addMonthsClamped(focusDate, monthOrdinal(nextView) - monthOrdinal(viewStart)));
      setViewStart(nextView);
      setPicker(null);
      if (kind) pendingSelector.current = triggerSelector(kind);
      announce(viewLabel(nextView));
    },
    [picker, viewStart, focusDate, setFocusDate, announce, viewLabel],
  );

  /* --- the shared content box -----------------------------------------------
     All three views — the day grid, the 12-month grid, the year grid — must occupy the
     SAME box. They have different column counts (7 narrow / 3-4 wide), so left to size
     themselves they each land on a different width, and the caption centred above them
     travels every time a grid opens. The DAY grid is the canonical sizer: its width is
     measured here and published as --ds-calendar-pane, and components.css sizes the
     view-jump grids (and, in a two-month view, the caption) from that.

     MEASURED rather than written down, because one column has no literal to write: the
     seven day columns come from the size lane, but the week-number column is
     content-sized (a "Wk" abbreviation over one or two digits at the lane's font size).
     With hasWeekNumbers the day body is ~215px against a 196px picker — a 19px jump that
     no hardcoded number could track if the header text or the lane ever changed.

     The published value persists across a picker opening, because the grid it came from
     is unmounted while a picker is up (the effect no-ops rather than clearing it), and a
     picker can only ever be opened from the day view that measured it. A ResizeObserver
     re-publishes when the web font settles or a size / week-number change reflows. */
  useIsomorphicLayoutEffect(() => {
    const root = rootRef.current;
    const grid = root?.querySelector<HTMLElement>(".rt-ds-calendar-grid");
    if (!root || !grid || typeof ResizeObserver === "undefined") return;
    const publish = () => {
      const w = grid.getBoundingClientRect().width;
      if (w > 0) root.style.setProperty("--ds-calendar-pane", `${w}px`);
    };
    publish();
    const ro = new ResizeObserver(publish);
    ro.observe(grid);
    return () => ro.disconnect();
  }, [picker, resolvedSize, months, hasWeekNumbers, weekStartsOn]);

  /* --- RTL detection -------------------------------------------------------- */
  const [detectedRtl, setDetectedRtl] = useState(false);
  useIsomorphicLayoutEffect(() => {
    if (dir) return;
    if (rootRef.current) setDetectedRtl(getComputedStyle(rootRef.current).direction === "rtl");
  }, [dir]);
  const isRtl = dir ? dir === "rtl" : detectedRtl;

  const setRoot = useCallback(
    (node: HTMLDivElement | null) => {
      rootRef.current = node;
      if (typeof ref === "function") ref(node);
      else if (ref) ref.current = node;
    },
    [ref],
  );

  return (
    <div
      ref={setRoot}
      className={["rt-ds-calendar", className].filter(Boolean).join(" ")}
      data-size={resolvedSize}
      data-months={months}
      // Which view-jump grid is open, for a host that needs to know (see onPickerEscape).
      data-picker={picker ?? undefined}
      dir={dir}
      style={style}
      onMouseLeave={() => onDayHover(null)}
    >
      <div className="rt-ds-calendar-months">
        {picker ? (
          /* One grid replaces the whole body — in a two-month view too, so there is never
             a second, differently-anchored copy of the same choice. The caption stays put
             (same controls, same place, same BOX — the --picker modifier holds it to the
             first day pane's width while the grid spans the whole body), which is what
             makes the disclosure read as an expansion of the title rather than a new
             screen. */
          <div className="rt-ds-calendar-month rt-ds-calendar-month--picker" onKeyDown={onPickerEscape}>
            <CalendarCaption
              /* While the MONTH grid is paged, the caption's year follows the page — the twelve
                 cells read "Jan…Dec" and carry no year of their own, so without this the only
                 place a sighted reader could see which year they had paged to was nowhere. The
                 month half keeps the view's own month (nothing has been picked yet); Escape
                 reverts both. The year grid needs no equivalent: its cells ARE years. */
              monthDate={picker === "month" ? { ...viewStart, year: pickerYear } : viewStart}
              size={resolvedSize}
              isRtl={isRtl}
              interactive
              openPicker={picker}
              onTogglePicker={onTogglePicker}
              prev={{
                label: picker === "year" ? "Previous decade" : "Previous year",
                direction: -1,
                disabled: !canPagePrev,
                onClick: () => onPickerPage(-1, null),
              }}
              next={{
                label: picker === "year" ? "Next decade" : "Next year",
                direction: 1,
                disabled: !canPageNext,
                onClick: () => onPickerPage(1, null),
              }}
            />
            <CalendarPicker
              kind={picker}
              columns={months === 2 ? 4 : 3}
              pageYear={pickerYear}
              current={viewStart}
              today={today}
              minDate={minDate}
              maxDate={maxDate}
              isRtl={isRtl}
              onPick={onPickerPick}
              onPage={onPickerPage}
              onGoToYear={onPickerGoToYear}
            />
          </div>
        ) : (
          Array.from({ length: months }, (_, i) => {
            const monthDate = firstOfMonth(addMonthsClamped(viewStart, i));
            return (
              <CalendarMonth
                key={monthOrdinal(monthDate)}
                monthDate={monthDate}
                weekStartsOn={weekStartsOn}
                hasOutsideDays={hasOutsideDays}
                hasWeekNumbers={hasWeekNumbers}
                mode={mode}
                size={resolvedSize}
                today={today}
                isRtl={isRtl}
                selectedDate={selectedDate}
                rangeStart={rangeStart}
                rangeEnd={rangeEnd}
                previewStart={previewStart}
                previewEnd={previewEnd}
                focusDate={focusDate}
                isDateDisabled={isDateDisabled}
                // The nav pair is SPLIT across the two captions (prev on the first pane,
                // next on the last) rather than duplicated; the view controls follow the
                // same logic and live only on the first.
                prev={
                  i === 0
                    ? { label: "Previous month", direction: -1, disabled: !canStepPrev, onClick: () => onChevron(-1) }
                    : null
                }
                next={
                  i === months - 1
                    ? { label: "Next month", direction: 1, disabled: !canStepNext, onClick: () => onChevron(1) }
                    : null
                }
                interactive={i === 0}
                onTogglePicker={onTogglePicker}
                onDaySelect={onDaySelect}
                onDayHover={onDayHover}
                onFocusDate={setFocusDate}
                onPageStep={onPageStep}
                onYearStep={onYearStep}
                onEdge={onEdge}
                onEscape={onEscape}
              />
            );
          })
        )}
      </div>
    </div>
  );
});
