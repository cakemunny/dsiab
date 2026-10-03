import { useCallback, useEffect, useInsertionEffect, useMemo, type ReactNode, type Ref, type RefCallback } from "react";
import { Theme, type ThemeProps } from "@radix-ui/themes";
import { SizeContext, type UISize } from "./SizeContext";
import { ButtonOrderContext, type ButtonOrder } from "./ButtonOrderContext";
import {
  CUSTOM_ACCENT, type CustomBrand, isCustomBrand,
  customBrandProperties, clearCustomBrand,
} from "./customBrand";
import { applyTypefaces, clearTypefaces, type TypefaceSet } from "./typefaces";
import { parseSeed } from "../palette/parseSeed";
import "../tokens/index.css";
import {
  ProviderPresenceContext, warnOnce, tokenLayerResolved, NO_STYLESHEET_MESSAGE,
} from "./detectAndWarn";

/**
 * Contrast model the system measures against.
 * - `wcag` (default): WCAG 2.x ratio — the audited compliance gate.
 * - `apca`: APCA perceptual contrast — re-chooses on-solid foregrounds by Lc
 *   (see tokens/contrast.css). More accurate to the eye, but technically below
 *   the WCAG number on the cases where the two disagree, so opt-in only.
 */
export type ContrastMode = "wcag" | "apca";

/** Radix's 26 accent colours, the values Radix's own `color` prop accepts. */
type RadixAccentColor = NonNullable<ThemeProps["accentColor"]>;

/**
 * A named colour: Radix's 26 accent colours plus the `oxblood` system preset ([[part-colour-parity]]). One type for
 * `Provider`'s named `accentColor` and for the `color` prop of every wrapper that takes one, so a
 * part takes every colour a page takes and paints what the same part paints on a page of that
 * colour.
 */
export type AccentColor = RadixAccentColor | "oxblood";

/**
 * The props that give a part its own colour ([[part-colour-parity]]). Radix keeps its `color` prop to its own 26
 * values and replaces any other value with its default before it writes `data-accent-color`, so a
 * part given `oxblood` would paint its theme's colour. This returns Radix's own `color` for the 26,
 * and for oxblood the `data-accent-color` attribute Radix writes for the other 26, which
 * oxblood.css maps onto the part. Spread it ahead of the caller's props, so an explicit
 * `data-accent-color` from the caller still wins.
 */
export function accentColorProps(color: AccentColor | undefined): { color?: RadixAccentColor; "data-accent-color"?: "oxblood" } {
  return color === "oxblood" ? { "data-accent-color": "oxblood" } : { color };
}

/**
 * The ref form of `accentColorProps`, for a part whose own props never reach the element Radix
 * writes `data-accent-color` on, or reach it ahead of Radix's value, which then replaces them
 * ([[part-colour-parity]]). It passes the node to the caller's `forwarded` ref, and for oxblood it writes the
 * attribute on the element `target` returns for that node, where that element carries no colour of
 * its own. It removes the attribute when the colour changes or the part unmounts. `target` must be
 * a stable function. A server render paints the theme's colour on such a part until the page
 * hydrates.
 */
export function useAccentColorRef<T extends Element>(
  color: AccentColor | undefined,
  forwarded?: Ref<T>,
  target: (node: T) => Element | null = (node) => node,
): RefCallback<T> {
  return useCallback(
    (node: T | null) => {
      if (!node) return;
      const undo = typeof forwarded === "function" ? forwarded(node) : forwarded ? void (forwarded.current = node) : undefined;
      let el = color === "oxblood" ? target(node) : null;
      if (el?.getAttribute("data-accent-color")) el = null;
      el?.setAttribute("data-accent-color", "oxblood");
      return () => {
        if (typeof undo === "function") undo();
        else if (typeof forwarded === "function") forwarded(null);
        else if (forwarded) forwarded.current = null;
        if (el?.getAttribute("data-accent-color") === "oxblood") el.removeAttribute("data-accent-color");
      };
    },
    // `target` stays out of the list: the contract above makes it a stable module-level function.
    [color, forwarded],
  );
}

export interface ProviderProps extends Omit<ThemeProps, "accentColor"> {
  children: ReactNode;
  /**
   * Brand accent. Radix's 26 named scales, plus the `oxblood` system preset — a
   * custom deep-red scale (tokens/oxblood.css) that the red family routes its
   * error to. Written to `data-accent-color`, which the CSS maps onto `--accent-*`.
   *
   * Also accepts `{ seed }` — a colour value the system generates a full 12-step
   * scale from, for both appearances. The seed must be a SOLID colour (`#rgb`,
   * `#rrggbb`, `rgb()`, `hsl()`, or an in-gamut `oklch()`); alpha is refused,
   * because a brand scale generates its own alpha ramp. An unparseable seed
   * falls back to the previous named accent rather than rendering a blank page.
   *
   * The union stays closed on the named side on purpose: the 27 literals keep
   * autocomplete and compile-time safety, and the custom path has to be asked
   * for in a shape a reviewer can see at the call site.
   */
  accentColor?: AccentColor | CustomBrand;
  /**
   * Heading, body and code typefaces.
   *
   * A bare string is a ROSTER face: the system owns its stack, has measured it,
   * and SHIPS ITS FILES. `tokens/index.css` carries 24 `@fontsource` imports and
   * the build emits them into `dist/assets`, so setting a roster face renders
   * with no further step from the consuming app. That bundling is unconditional
   * — every consumer downloads all four families whether they use one or none,
   * which `tokens/index.css` names as the open packaging question.
   *
   * `{ stack }` is any CSS font stack. The system writes it and LOADS NOTHING
   * for it — delivery is yours, and so is the outcome.
   *
   * Unset writes no property at all, so every `var()` falls through to the
   * defaults: Inter, bundled the same way, and Menlo for code, which is a system
   * face and the one roster entry the system does not ship.
   */
  typefaces?: TypefaceSet;
  /**
   * Global UI size tier. Presets the default Radix `size` every wrapped
   * component uses (per size lane) plus the default body type size. An explicit
   * per-instance `size` always wins; `size="inherit"` opts a component out.
   */
  uiSize?: UISize;
  /** Contrast model (default `wcag`). Sets `data-contrast` on the theme root. It changes one thing only:
   *  the label on a solid warning fill on the gold, amber, yellow and lime brands, where one ink cannot
   *  clear both WCAG 4.5:1 and APCA Lc 60 in the warning's own orange ([[apca-contrast-mode]]). */
  contrast?: ContrastMode;
  /**
   * Where the primary action anchors in a `ButtonGroup` — `primary-first` (left,
   * the default) or `primary-last` (right). A per-`ButtonGroup` `order` prop overrides it.
   */
  buttonOrder?: ButtonOrder;
}

/**
 * System Theme wrapper. Sets the design-system defaults (auto-paired neutral,
 * iris accent, medium radius) and forwards any override so a consuming app can
 * set its brand in one place. Imports the full token layer.
 */
export function Provider({
  accentColor = "iris",
  grayColor = "auto",
  radius = "medium",
  uiSize = "small",
  contrast = "wcag",
  buttonOrder = "primary-first",
  typefaces,
  children,
  ...rest
}: ProviderProps) {
  // Keyed on the SEED STRING, never on the object. `{ seed: "#ff6b5e" }` written
  // inline in JSX is a new object every render, so keying on identity would
  // regenerate ~112 properties and rewrite them on each pass.
  const custom = isCustomBrand(accentColor) ? accentColor.seed : null;
  const brandProps = useMemo(() => {
    if (custom === null) return null;
    const parsed = parseSeed(custom);
    return parsed.ok ? customBrandProperties(parsed.rgb) : null;
  }, [custom]);

  // A seed that was supplied but could not be parsed falls back to the previous
  // valid accent rather than setting an attribute whose values do not resolve —
  // which would paint transparent fills over inherited text, a failure that is
  // only partly visible.
  const accentAttr: ThemeProps["accentColor"] =
    brandProps ? (CUSTOM_ACCENT as ThemeProps["accentColor"])
    : isCustomBrand(accentColor) ? ("iris" as ThemeProps["accentColor"])
    : (accentColor as ThemeProps["accentColor"]);

  // useInsertionEffect: client-only by design, and never a side effect in render
  // (which breaks streaming SSR and double-fires under StrictMode). First paint
  // on the server therefore uses the previous accent and the default faces; a
  // consuming app that wants no flash sets the same properties on `<html style>`
  // server-side, which this mechanism makes possible and an injected stylesheet
  // would not.
  useInsertionEffect(() => {
    const root = document.documentElement;
    if (!brandProps) {
      clearCustomBrand(root);
      return;
    }
    for (const [k, v] of Object.entries(brandProps)) root.style.setProperty(k, v);
    return () => clearCustomBrand(root);
  }, [brandProps]);

  useInsertionEffect(() => {
    const root = document.documentElement;
    applyTypefaces(root, typefaces);
    return () => clearTypefaces(root);
  }, [typefaces?.heading, typefaces?.body, typefaces?.code]);

  // THE STYLESHEET CANARY. `useEffect`, not `useInsertionEffect`: this has to run AFTER the sheet
  // would have been applied, and it must never run during SSR. The whole `--ds-*` role layer is
  // declared on `.radix-themes`, so one role answers the question — and it is the same property the
  // publish acceptance test reads, which keeps both checks pointed at one fact. Queried from the
  // document rather than a ref because `Theme` owns the element that carries the class.
  useEffect(() => {
    const root = document.querySelector(".radix-themes");
    if (root && !tokenLayerResolved(root)) warnOnce("no-stylesheet", NO_STYLESHEET_MESSAGE);
  }, []);

  return (
    <ProviderPresenceContext.Provider value={true}>
    <SizeContext.Provider value={uiSize}>
      <ButtonOrderContext.Provider value={buttonOrder}>
        <Theme
          accentColor={accentAttr}
          grayColor={grayColor}
          radius={radius}
          // PANELS ARE SOLID ([[panel-background]]). Radix defaults `panelBackground="translucent"`, which resolves
          // `--color-panel` to an alpha wash — measured `#d8f4f609` in dark, a 3.5% white over the
          // page. Every Card, panel and menu surface is then see-through, so content scrolling
          // BENEATH one smears through it: a lighter band at a scroll container's edges that moves
          // and flickers as the content passes. Far more visible in dark, where a light wash over a
          // near-black page has nowhere to hide.
          // It also contradicted our own token layer, which already says a raised surface is SOLID
          // (`--ds-bg-raised: var(--gray-2)`), so the system was describing one thing and rendering
          // another. `rest` spreads after this, so a consumer who genuinely wants the translucent
          // look can still pass `panelBackground="translucent"` and get it.
          panelBackground="solid"
          data-ui-size={uiSize}
          data-contrast={contrast}
          {...rest}
        >
          {children}
        </Theme>
      </ButtonOrderContext.Provider>
    </SizeContext.Provider>
    </ProviderPresenceContext.Provider>
  );
}
