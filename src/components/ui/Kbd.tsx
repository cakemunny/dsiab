import { type ComponentProps } from "react";
import { Kbd as RadixKbd } from "@radix-ui/themes";
import { useResolvedSize } from "../../theme/SizeContext";

type RadixKbdProps = ComponentProps<typeof RadixKbd>;
export interface KbdProps extends Omit<RadixKbdProps, "size"> {
  /** Radix size step, or "inherit" to opt out of the global UI size. */
  size?: RadixKbdProps["size"] | "inherit";
}

/** Keyboard-input token — the visual for a key the user presses. Its size STEP
 *  follows the global `uiSize` (text lane), the same as `Text`/`Heading`; ported
 *  components pin OUR default (small), never Astryx's md (spec R10). The cap does
 *  NOT then render that step's type: Radix shrinks every Kbd optically to 0.8× it,
 *  and `components.css` clamps the result UP to the system's 12px type floor — so
 *  the cap ramp is 12 / 12 / 12.8px across small / medium / large, deliberately a
 *  size below the text beside it. Reuses Radix's own Kbd skin, so it declares no
 *  `--ds-*` roles (like `CheckboxVisual`).
 *
 *  THE VARIANT DEFAULT IS OURS, NOT RADIX'S ([[kbd-default-variant]]). Radix defaults `variant="classic"`,
 *  a raised keycap: six stacked inset shadows plus an outer drop shadow, imitating a
 *  physical key. That is skeuomorphism this system uses nowhere else — §8 spends its
 *  whole elevation budget on three flat rungs and the shadow ladder never fakes a
 *  bevel — so a raised key reads as borrowed from another design language. The default
 *  here is `soft`, which is Radix's OWN flat chip (a `gray-a3` fill, no shadow), so this
 *  changes which existing skin is chosen rather than inventing one. `classic` stays
 *  available for anyone who wants the raised key deliberately. */
export function Kbd({ size, variant = "soft", ...rest }: KbdProps) {
  const resolved = useResolvedSize("text", size);
  return <RadixKbd size={resolved} variant={variant} {...(rest as RadixKbdProps)} />;
}
