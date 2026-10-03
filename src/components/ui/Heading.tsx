import { type ComponentProps } from "react";
import { Heading as RadixHeading } from "@radix-ui/themes";
import { useResolvedSize } from "../../theme/SizeContext";
import { accentColorProps, type AccentColor } from "../../theme/Provider";

type RadixHeadingProps = ComponentProps<typeof RadixHeading>;
export interface HeadingProps extends Omit<RadixHeadingProps, "size" | "color"> {
  /** Radix size step, or "inherit" to opt out of the global UI size. */
  size?: RadixHeadingProps["size"] | "inherit";
  /** Radix's 26 colours or the oxblood preset ([[part-colour-parity]]). */
  color?: AccentColor;
}

/** Heading — its default size follows the global `uiSize` (heading lane). */
export function Heading({ size, color, ...rest }: HeadingProps) {
  const resolved = useResolvedSize("heading", size);
  // RadixHeading's props are a discriminated union over `as`; the spread loses
  // the discriminant, so the rest is typed back to the component's own props.
  return <RadixHeading size={resolved} {...accentColorProps(color)} {...(rest as RadixHeadingProps)} />;
}
