import {
  Children, forwardRef, isValidElement, useEffect,
  type ComponentProps, type ElementRef, type KeyboardEvent, type MouseEvent, type ReactElement, type ReactNode,
} from "react";
import { Badge as RadixBadge } from "@radix-ui/themes";
import { X } from "@phosphor-icons/react";
import { useResolvedSize } from "../../theme/SizeContext";
import { accentColorProps, type AccentColor } from "../../theme/Provider";
import { IconButton } from "./IconButton";

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

type RadixBadgeProps = ComponentProps<typeof RadixBadge>;
type TokenRef = ElementRef<typeof RadixBadge>;

/** The remove callback receives a mouse event (✕ click) or a keyboard event (Backspace/Delete on the body). */
export type TokenRemoveEvent = MouseEvent<HTMLButtonElement> | KeyboardEvent<HTMLElement>;

// Token is the INTERACTIVE sibling of Badge (D9). Where Badge is a display/labeling chip, Token has an
// interactive BODY (click / navigate) that COEXISTS with a remove ✕ — the case Badge structurally forbids
// (`onRemove` + `asChild` can't combine, because a ✕ nested inside an interactive <button>/<a> is invalid
// HTML). Token solves it by making the body and the ✕ valid-HTML SIBLINGS inside a container:
//   <span.rt-Badge>  ← the surface chip skin, REUSED from Badge verbatim (variant + categorical color)
//     <body>         ← an `all:unset` <a>/<button>/<span> (the ONLY net-new piece)
//     <IconButton✕>  ← a SIBLING of the body (never nested), REUSED from Badge (inset + Remove {label})
// The focus ring is HOISTED to the container via `:has(.rt-ds-token-body:focus-visible)` because the body
// is `all:unset` with `outline:none`. See DECISIONS [[token-chip]] + the Token block in tokens/components.css.
//
// A clickable Token can also be a TOGGLE ([[token-pressed-state]]): `pressed` puts `aria-pressed` on the
// body <button>. The paint (selected tint, strong ink, weight 600) is keyed on that attribute in
// components.css, so the attribute and the look cannot disagree. A toggle shows no glyph: the label
// reserves its bold width in both states (see LABEL_GRID below), so pressing it moves no chip beside it.
// Only the button body takes it: APG ties `aria-pressed` to role button, so a link or a static body never does.

interface TokenBaseProps
  extends Omit<RadixBadgeProps, "variant" | "asChild" | "size" | "onClick" | "children" | "color"> {
  /** A categorical colour: Radix's 26 colours or the oxblood preset ([[part-colour-parity]]). */
  color?: AccentColor;
  /** The chip content (the visible label). Use this OR `label`. */
  children?: ReactNode;
  /** Convenience string label — an alternative to `children` (also the source for `Remove {label}`). */
  label?: string;
  /** Size step; unset → the global uiSize text lane (default small → `1`). `"inherit"` = no size prop. */
  size?: RadixBadgeProps["size"] | "inherit";
  /** Optional identification glyph before the label (fixed-width slot, `aria-hidden`). */
  leadingIcon?: ReactNode;
  /** Adds a trailing inset ✕ (a 24×24 target) that removes the chip. Coexists with a clickable/link body. */
  onRemove?: (e: TokenRemoveEvent) => void;
  /** Accessible name for the ✕ when the label isn't a plain string. Default `Remove {label}`. */
  removeLabel?: string;
  /** Disables the whole chip — the body AND the ✕. Reuses Radix's own disabled skin to dim it. */
  disabled?: boolean;
  /** Refused, per [[badge-scope]]/[[token-chip]]: the chip's body mode is `href` / `onClick` / neither, and the ✕ is its
   *  SIBLING, so a Token always renders more than one child into the chip surface. Declared rather
   *  than merely omitted so the refusal is a type error a reader can see, and destructured away in
   *  the body so a spread from untyped JavaScript is IGNORED instead of reaching Radix's `Slot`. */
  asChild?: never;
}

// The body is exactly ONE of three modes, resolved by props — enforced as a compile-time XOR so `onClick`
// and `href` can never be passed together:
//   href    → a link body  (<a>)          — navigational
//   onClick → a button body (<button>)    — clickable, and the only mode that takes `pressed`
//   neither → a static body (<span>)      — a plain, pixel-identical-to-Badge removable/display chip
// `pressed` lives on its own arm that REQUIRES `onClick`, so `pressed` with `href`, or with no `onClick`,
// is a type error rather than an `aria-pressed` on an element that cannot toggle.
export type TokenProps = TokenBaseProps &
  (
    | {
        href?: undefined;
        onClick: (e: MouseEvent<HTMLButtonElement>) => void;
        /** Makes the clickable body a toggle: renders `aria-pressed`, and while true the pressed paint
         *  ([[token-pressed-state]]). The label holds its bold width in both states. Omit it for a plain action. */
        pressed?: boolean;
      }
    | { href?: undefined; onClick?: (e: MouseEvent<HTMLButtonElement>) => void; pressed?: undefined }
    | { href: string; onClick?: never; pressed?: never }
  );

const affixStyle = { display: "inline-flex", alignItems: "center", flexShrink: 0 } as const;

// A toggle's label reserves its BOLD width in both states, the ToggleButton technique: a hidden,
// aria-hidden duplicate at `--ds-font-weight-strong` is stacked in the SAME grid cell as the visible
// label, whose weight follows `aria-pressed` through the container paint in components.css. The cell
// sizes to the wider child, which is always the bold duplicate, so pressing a filter never changes the
// chip's width and never moves the chips after it. A Token given no `pressed` renders its label bare.
const LABEL_GRID = { display: "inline-grid", justifyItems: "center", verticalAlign: "top" } as const;
const LABEL_CELL = { gridArea: "1 / 1" } as const;
const LABEL_RESERVE = { ...LABEL_CELL, visibility: "hidden", fontWeight: "var(--ds-font-weight-strong)" } as const;

/** True when children include any non-empty text (string/number) descendant — the visible label. */
function hasVisibleText(children: ReactNode): boolean {
  let found = false;
  Children.forEach(children, (c) => {
    if (typeof c === "string" && c.trim() !== "") found = true;
    else if (typeof c === "number") found = true;
    else if (isValidElement(c)) {
      const el = c as ReactElement<{ children?: ReactNode }>;
      if (hasVisibleText(el.props.children)) found = true;
    }
  });
  return found;
}

export const Token = forwardRef<TokenRef, TokenProps>(function Token(props, ref) {
  const {
    children, label, color, size, leadingIcon, onRemove, removeLabel, disabled,
    radius = "full", className, href, onClick, pressed, asChild: _refusedAsChild, ...rest
  } = props as TokenBaseProps & {
    radius?: RadixBadgeProps["radius"];
    href?: string;
    onClick?: (e: MouseEvent<HTMLButtonElement>) => void;
    pressed?: boolean;
  };

  const resolvedSize = useResolvedSize<RadixBadgeProps["size"]>("text", size);

  // Mode is resolved from href/onClick presence (NOT disabled — a disabled link still renders an <a>).
  // `interactive` gates only the PAINT (24px floor + hover/press + cursor:pointer + the ring hoist): a
  // disabled interactive chip drops the affordance and gets Radix's disabled dim instead.
  const mode: "link" | "clickable" | "static" =
    href != null ? "link" : onClick != null ? "clickable" : "static";
  const interactive = mode !== "static" && !disabled;
  const removable = onRemove != null;

  const content = children ?? label;
  const labelString = typeof children === "string" ? children : label;
  const removeName = removeLabel ?? (labelString ? `Remove ${labelString}` : "Remove");

  const ariaLabel = (rest as Record<string, unknown>)["aria-label"];
  useEffect(() => {
    if (!DEV_WARN) return;
    const hasText = hasVisibleText(content) || (typeof label === "string" && label.trim() !== "");
    if (!hasText && leadingIcon != null && ariaLabel == null) {
      console.warn("Token: an icon-only token needs `aria-label` (or a text `label`) for an accessible name (WCAG 4.1.2).");
    }
  }, [content, label, leadingIcon, ariaLabel]);

  // Backspace/Delete on the focused BODY removes the chip: the keys that delete the character under the
  // caret in a text field delete the whole chip when the chip is what holds focus. No-op when the chip
  // isn't removable or is disabled. Only the interactive (focusable) bodies carry it; a static <span> body
  // can't receive focus, so its only remove path is the ✕.
  const onBodyKeyDown = (e: KeyboardEvent<HTMLElement>) => {
    if (removable && !disabled && (e.key === "Backspace" || e.key === "Delete")) {
      e.preventDefault();
      onRemove?.(e);
    }
  };

  const lead = leadingIcon != null ? <span aria-hidden style={affixStyle}>{leadingIcon}</span> : null;

  let body: ReactNode;
  if (mode === "link") {
    body = (
      <a
        className="rt-ds-token-body"
        href={href}
        aria-disabled={disabled || undefined}
        onClick={disabled ? (e) => e.preventDefault() : undefined}
        onKeyDown={onBodyKeyDown}
      >
        {content}
      </a>
    );
  } else if (mode === "clickable") {
    // `aria-pressed` is rendered only when `pressed` is given (React drops an undefined attribute), so a
    // plain action button never announces a toggle state, and only a toggle reserves its bold width.
    body = (
      <button
        type="button"
        className="rt-ds-token-body"
        disabled={disabled}
        aria-pressed={pressed}
        onClick={onClick}
        onKeyDown={onBodyKeyDown}
      >
        {pressed === undefined ? content : (
          <span style={LABEL_GRID}>
            <span aria-hidden data-ds-token-reserve="" style={LABEL_RESERVE}>{content}</span>
            <span style={LABEL_CELL}>{content}</span>
          </span>
        )}
      </button>
    );
  } else {
    body = <span className="rt-ds-token-body">{content}</span>;
  }

  // The remove ✕ is a SIBLING of the body (never nested → valid HTML in every mode, including href).
  // Reuses Badge's inset ✕ skin: the ghost paint + `Remove {label}` name come free from the
  // `.rt-Badge .rt-IconButton[data-inset]` CSS; the Token block then grows its BOX to the 24×24 pointer
  // target on a cancelling negative margin (paint and layout unchanged — see components.css, Token (4),
  // which also explains why a pseudo-element hit extender can't do this job). `stopPropagation` is
  // defensive (the ✕ is a sibling,
  // so a body onClick never fires from a ✕ click regardless). `disabled` dims it via Radix's own skin.
  const remove = removable ? (
    <IconButton
      inset
      size="1"
      aria-label={removeName}
      disabled={disabled}
      onClick={(e) => {
        e.stopPropagation();
        onRemove?.(e);
      }}
    >
      <X weight="bold" />
    </IconButton>
  ) : null;

  return (
    <RadixBadge
      ref={ref}
      className={["rt-ds-token", className].filter(Boolean).join(" ")}
      variant="surface"
      {...accentColorProps(color)}
      size={resolvedSize}
      radius={radius}
      data-interactive={interactive ? "" : undefined}
      data-disabled={disabled ? "" : undefined}
      {...rest}
    >
      {lead}
      {body}
      {remove}
    </RadixBadge>
  );
});
