import { type ComponentProps } from "react";
import { useResolvedSize } from "../../theme/SizeContext";

type Size = "1" | "2" | "3";

export interface CheckboxVisualProps extends Omit<ComponentProps<"span">, "children"> {
  /** Whether the box reads as checked (accent fill + check) or empty. */
  checked: boolean;
  /** Dims the box to the disabled treatment (no interactivity either way). */
  disabled?: boolean;
  /** Control size step; resolves from the global uiSize when unset (default small → 1). */
  size?: Size;
}

/**
 * A PRESENTATIONAL checkbox — the *look* of the system `Checkbox` (box · accent-9 checked fill ·
 * white --on-accent check · size scale · disabled token) with NO interactivity. It renders a plain
 * `<span>` carrying Radix's own BaseCheckbox classes, so the skin is sourced from the same CSS as the
 * real `Checkbox` and can never drift; only the disabled state — which Radix keys off the `:disabled`
 * form pseudo — is mirrored via `[data-disabled]` in `components.css`.
 *
 * It is `aria-hidden` and holds no role/state: the consumer owns selection (a listbox option's
 * `aria-selected`). This is the indicator used by `MultiSelect` rows — a `role="option"` must never
 * contain an interactive widget, so the real `<Checkbox>` is never mounted inside a row.
 */
export function CheckboxVisual({ checked, disabled, size, className, ...rest }: CheckboxVisualProps) {
  const resolved = useResolvedSize<Size>("control", size) ?? "1";
  const classes = [
    "rt-reset",
    "rt-BaseCheckboxRoot",
    "rt-CheckboxRoot",
    "rt-ds-checkbox-visual",
    `rt-r-size-${resolved}`,
    "rt-variant-surface",
    className,
  ]
    .filter(Boolean)
    .join(" ");
  return (
    <span
      aria-hidden="true"
      className={classes}
      data-state={checked ? "checked" : "unchecked"}
      data-disabled={disabled ? "" : undefined}
      {...rest}
    >
      {checked && (
        // The exact Radix ThickCheckIcon (extracted from a rendered Checkbox) so the glyph matches.
        <svg
          width="9"
          height="9"
          viewBox="0 0 9 9"
          fill="currentcolor"
          xmlns="http://www.w3.org/2000/svg"
          data-state="checked"
          className="rt-BaseCheckboxIndicator rt-CheckboxIndicator"
          style={{ pointerEvents: "none" }}
        >
          <path
            fillRule="evenodd"
            clipRule="evenodd"
            d="M8.53547 0.62293C8.88226 0.849446 8.97976 1.3142 8.75325 1.66099L4.5083 8.1599C4.38833 8.34356 4.19397 8.4655 3.9764 8.49358C3.75883 8.52167 3.53987 8.45309 3.3772 8.30591L0.616113 5.80777C0.308959 5.52987 0.285246 5.05559 0.563148 4.74844C0.84105 4.44128 1.31533 4.41757 1.62249 4.69547L3.73256 6.60459L7.49741 0.840706C7.72393 0.493916 8.18868 0.396414 8.53547 0.62293Z"
          />
        </svg>
      )}
    </span>
  );
}
