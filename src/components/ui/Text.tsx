import { type ComponentProps } from "react";
import { Text as RadixText } from "@radix-ui/themes";
import { useResolvedSize } from "../../theme/SizeContext";
import { accentColorProps, type AccentColor } from "../../theme/Provider";

type RadixTextProps = ComponentProps<typeof RadixText>;

/** Radix types Text as a union over `as` (span | div | label | p). `Omit` does
 * not distribute over a union — it keeps only the keys every arm shares, which
 * silently drops the per-element attributes (`htmlFor` on the label arm).
 * Distributing preserves each arm intact. See [[text-element-attributes]]. */
type DistributiveOmit<T, K extends PropertyKey> = T extends unknown ? Omit<T, K> : never;

export type TextProps = DistributiveOmit<RadixTextProps, "size" | "color"> & {
  /** Radix size step, or "inherit" to opt out of the global UI size. */
  size?: RadixTextProps["size"] | "inherit";
  /** Radix's 26 colours or the oxblood preset ([[part-colour-parity]]). */
  color?: AccentColor;
};

/** Body text — its default size follows the global `uiSize` (text lane). */
export function Text({ size, color, ...rest }: TextProps) {
  const resolved = useResolvedSize("text", size);
  // `rest` is the distributed union minus `size`; re-applying `size` collapses
  // the discriminant at the call site, so the spread is cast back to the
  // component's own props. TextProps itself keeps each `as` arm intact.
  return <RadixText size={resolved} {...accentColorProps(color)} {...(rest as RadixTextProps)} />;
}
