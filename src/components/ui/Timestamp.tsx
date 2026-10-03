import { forwardRef, useEffect, useState, type ComponentProps } from "react";
import { Text, Tooltip } from "@radix-ui/themes";
import { useResolvedSize } from "../../theme/SizeContext";
import { accentColorProps, type AccentColor } from "../../theme/Provider";
import {
  parseValue, formatRelative, getLiveInterval, isAbsoluteFormat,
  DEFAULT_AUTO_THRESHOLD, type TimestampFormat,
} from "../../utils/timestampFormat";

export type { TimestampFormat };

type RadixTextProps = ComponentProps<typeof Text>;

export interface TimestampProps
  extends Omit<ComponentProps<"time">, "children" | "color"> {
  /** Ref forwarded to the root `<time>` element. */
  ref?: React.Ref<HTMLTimeElement>;
  /** The date/time to display — a Unix timestamp (seconds or ms, auto-detected) or an ISO 8601 string. */
  value: string | number;
  /**
   * Display format.
   * - `relative` — "2 hours ago", "yesterday", "now" (locale-correct via `Intl.RelativeTimeFormat`)
   * - `auto` — relative for recent times, `date_time` past `autoThreshold`
   * - `date` · `date_time` · `time` — localized absolute (`Intl.DateTimeFormat`)
   * - `system_date` · `system_date_time` · `system_time` — machine format (`2025-03-21 14:51:53`)
   * @default 'auto'
   */
  format?: TimestampFormat;
  /**
   * Threshold (seconds) for `auto` to switch from relative to `date_time`.
   * @default 604800 (7 days)
   */
  autoThreshold?: number;
  /**
   * Show a hover tooltip with the full absolute time. Only applies to the relative format (an absolute
   * format already shows its full value).
   * @default true
   */
  hasTooltip?: boolean;
  /**
   * Append the timezone abbreviation (`date_time` / `time` / `system_date_time` / `system_time`).
   * @default false
   */
  isTimezoneShown?: boolean;
  /**
   * Re-render the relative time on a live interval (ladder: 1s / 30s / 60s / 5min). Only ticks when the
   * effective format is relative.
   * @default false
   */
  isLive?: boolean;
  /** Radix Text size step, or "inherit" to opt out of the global uiSize. Unset → the text lane default. */
  size?: RadixTextProps["size"] | "inherit";
  /** Text colour: Radix's 26 colours or the oxblood preset ([[part-colour-parity]]). @default 'gray' (a muted, supporting tone) */
  color?: AccentColor;
  /** Font weight override. */
  weight?: RadixTextProps["weight"];
}

// Timestamp (D15) — a semantic `<time dateTime={ISO}>` rendered through Radix Text (styled via `asChild`
// so ONE element carries both the machine-readable datetime and the typography — no wrapper span). The
// text lane comes from `useResolvedSize` (the system size mechanism our Text wrapper embodies; Radix Text
// is used directly here because it forwards refs, which a raw Radix Tooltip trigger requires — our thin
// Text wrapper does not). Relative strings are locale-correct via `Intl.RelativeTimeFormat` (the D15 fix,
// in ../../utils/timestampFormat); absolute presets use `Intl.DateTimeFormat`; `system_*` are manual
// machine builders. A hover Tooltip carries the full absolute time in relative mode, and the full string
// is the `aria-label` there too. See DECISIONS [[relative-timestamp]] + the Timestamp block in tokens/components.css.

function pad(n: number): string {
  return String(n).padStart(2, "0");
}

/** The full, human absolute string — for the tooltip + the relative-mode aria-label. */
function fullAbsolute(date: Date): string {
  return new Intl.DateTimeFormat(undefined, {
    year: "numeric", month: "long", day: "numeric",
    hour: "numeric", minute: "2-digit", second: "2-digit", timeZoneName: "short",
  }).format(date);
}

function formatAbsolute(
  date: Date,
  format: Exclude<TimestampFormat, "relative" | "auto">,
  isTimezoneShown: boolean,
): string {
  const tz = isTimezoneShown ? { timeZoneName: "short" as const } : {};
  switch (format) {
    case "date":
      return new Intl.DateTimeFormat(undefined, { year: "numeric", month: "short", day: "numeric" }).format(date);
    case "date_time":
      return new Intl.DateTimeFormat(undefined, { year: "numeric", month: "short", day: "numeric", hour: "numeric", minute: "2-digit", ...tz }).format(date);
    case "time":
      return new Intl.DateTimeFormat(undefined, { hour: "numeric", minute: "2-digit", ...tz }).format(date);
    case "system_date":
      return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
    case "system_date_time":
      return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
    case "system_time":
      return `${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
  }
}

/**
 * Displays a formatted timestamp as human-readable text — a semantic `<time>` with an ISO `datetime`.
 *
 * @example
 * ```tsx
 * <Timestamp value="2026-02-19T17:00:00Z" />          // auto → "2 hours ago"
 * <Timestamp value={1740000000} format="date" />       // "Feb 19, 2025"
 * <Timestamp value={ts} format="relative" isLive />    // ticks live
 * <Timestamp value={ts} format="system_date_time" />   // "2025-02-19 17:00:00"
 * ```
 */
export const Timestamp = forwardRef<HTMLTimeElement, TimestampProps>(function Timestamp(
  {
    value, format = "auto", autoThreshold = DEFAULT_AUTO_THRESHOLD, hasTooltip = true,
    isTimezoneShown = false, isLive = false, size, color = "gray", weight, className, ...rest
  },
  ref,
) {
  const [now, setNow] = useState(() => Date.now());
  const resolvedSize = useResolvedSize<RadixTextProps["size"]>("text", size);

  const date = parseValue(value);
  const isoString = date.toISOString();
  const diffSeconds = Math.round((now - date.getTime()) / 1000);

  const effectiveFormat: TimestampFormat =
    format === "auto" ? (Math.abs(diffSeconds) <= autoThreshold ? "relative" : "date_time") : format;

  const displayText =
    effectiveFormat === "relative"
      ? formatRelative(diffSeconds)
      : isAbsoluteFormat(effectiveFormat)
        ? formatAbsolute(date, effectiveFormat, isTimezoneShown)
        : "";

  const absoluteText = fullAbsolute(date);

  // Live tick — only while the effective format is relative. The interval ladders off the CURRENT
  // distance (re-derived each render as `now` advances), so a fast-moving recent event updates every
  // second and a distant one every 5 minutes.
  useEffect(() => {
    if (!isLive || effectiveFormat !== "relative") return;
    const id = setInterval(() => setNow(Date.now()), getLiveInterval(diffSeconds));
    return () => clearInterval(id);
  }, [isLive, effectiveFormat, diffSeconds]);

  const showTooltip = hasTooltip && effectiveFormat === "relative";

  // Radix Text `asChild` merges the typography onto the <time> itself — one element, machine-readable +
  // styled. In relative mode the full absolute string is the aria-label (an absolute format is already
  // its own full value, so no aria-label there).
  const timeEl = (
    <Text asChild size={resolvedSize} {...accentColorProps(color)} weight={weight}>
      <time
        ref={ref}
        dateTime={isoString}
        aria-label={effectiveFormat === "relative" ? absoluteText : undefined}
        className={["rt-ds-timestamp", className].filter(Boolean).join(" ")}
        {...rest}
      >
        {displayText}
      </time>
    </Text>
  );

  if (showTooltip) {
    return <Tooltip content={absoluteText}>{timeEl}</Tooltip>;
  }
  return timeEl;
});
