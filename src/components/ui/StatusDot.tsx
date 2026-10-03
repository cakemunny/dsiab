import { forwardRef, type ComponentPropsWithoutRef } from "react";
import { Tooltip } from "./Tooltip";
import { useResolvedSize } from "../../theme/SizeContext";

// StatusDot (D21) — a semantic status indicator: a non-focusable <span role="img"> whose
// colour paints from the ACCENT-AWARE --ds-fill-* family (success/warning/error), --accent-indicator for accent ([[textless-part-fills]]), and a neutral
// gray, so it follows brand-collision shifts (R1) rather than a fixed Radix scale. `isPulsing` adds a
// 2s opacity breathe that a `prefers-reduced-motion: reduce` media query silences. An optional `tooltip`
// wraps the dot in the System Tooltip (the same wrap Field.tsx composes for its info / disabled-reason
// tooltip, DECISIONS [[tooltip-wrap]]). The dot tracks the global TEXT lane (8/10/12px for small/medium/large) so it
// stays proportional to the label beside it — amending [[status-dot]]'s original fixed-8px rule. See DECISIONS [[status-dot]]
// + the StatusDot block in tokens/components.css.

export type StatusDotVariant = "success" | "warning" | "error" | "accent" | "neutral";

export interface StatusDotProps
  extends Omit<ComponentPropsWithoutRef<"span">, "children" | "color"> {
  /** Ref forwarded to the root <span>. */
  ref?: React.Ref<HTMLSpanElement>;
  /** The semantic colour variant. Accent-aware — follows the brand's collision shift. */
  variant: StatusDotVariant;
  /** Accessible label describing the status. Required — it IS the dot's accessible name (WCAG 1.1.1). */
  label: string;
  /**
   * Whether the dot pulses to indicate live activity. Respects `prefers-reduced-motion: reduce`.
   * @default false
   */
  isPulsing?: boolean;
  /** Optional hover tooltip explaining the status. When omitted, no tooltip is rendered. */
  tooltip?: string;
}

/**
 * A small coloured dot indicator for status (online/offline, severity, live/idle).
 *
 * Sized on the global text lane (8/10/12px). Renders as a non-focusable `<span>` with `role="img"` +
 * `aria-label`. Paint is accent-aware (`--ds-fill-*`, and `--accent-indicator` for accent), so a variant tracks the selected brand's
 * collision-shifted family.
 *
 * @example
 * ```tsx
 * <StatusDot variant="success" label="Online" />
 * <StatusDot variant="error" label="Offline" />
 * <StatusDot variant="success" label="Live" isPulsing />
 * <StatusDot variant="warning" label="Degraded" tooltip="Some systems slow" />
 * ```
 */
export const StatusDot = forwardRef<HTMLSpanElement, StatusDotProps>(function StatusDot(
  { variant, label, isPulsing = false, tooltip, className, ...rest },
  ref,
) {
  // The dot pairs with a text label, so it tracks the global text lane (8 / 10 / 12px for
  // small / medium / large) rather than staying a fixed 8px that reads small beside large text.
  const size = useResolvedSize("text", undefined);
  const dot = (
    <span
      ref={ref}
      role="img"
      aria-label={label}
      className={["rt-ds-statusdot", className].filter(Boolean).join(" ")}
      data-variant={variant}
      data-size={size}
      data-pulsing={isPulsing ? "" : undefined}
      {...rest}
    />
  );

  if (tooltip) {
    return <Tooltip content={tooltip}>{dot}</Tooltip>;
  }
  return dot;
});
