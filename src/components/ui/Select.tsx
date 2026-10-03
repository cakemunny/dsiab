import { createContext, useCallback, useContext, useRef, useState, type ComponentProps, type KeyboardEvent, type ReactNode } from "react";
import { Select as RadixSelect } from "@radix-ui/themes";
import { X } from "@phosphor-icons/react";
import { useResolvedSize } from "../../theme/SizeContext";
import { accentColorProps, type AccentColor } from "../../theme/Provider";
import { Field, useOptionalFieldControl } from "./Field";
import { IconButton } from "./IconButton";

type TriggerProps = ComponentProps<typeof RadixSelect.Trigger>;
type ContentProps = ComponentProps<typeof RadixSelect.Content>;
type RootProps = ComponentProps<typeof RadixSelect.Root>;
type Validation = { tone: "error" | "warning" | "success" | "info"; message: ReactNode };

/**
 * Select.Trigger locked to `variant="surface"`; Select.Content locked to `variant="solid"` (opaque).
 * `soft`, `ghost`, `classic` are not exposed.
 *
 * Pass `label`/`description`/`validation` to the root to render the Select as a Field (label above the
 * trigger, accent-aware validation on the trigger, message below) — mirrors TextField. Without them the
 * `<Select>` stays bare. The trigger composes `[leading icon] · value/placeholder · [clear ✕] · caret`:
 * pass `icon` to `Select.Trigger` for a leading identification glyph, and `clearable` to the root for a
 * persistent clear ✕ that shows while a value is selected. Item/Group/Label/Separator are passthroughs.
 */
export interface SelectRootProps extends RootProps {
  label?: ReactNode;
  info?: ReactNode;
  endSlot?: ReactNode;
  /** Persistent helper line under the field — calm guidance that holds in any validation state. */
  description?: ReactNode;
  validation?: Validation;
  /** When set, a clear ✕ appears in the trigger while a value is selected, resetting to the placeholder. */
  clearable?: boolean;
}

interface TriggerOwnProps extends Omit<TriggerProps, "variant" | "color"> {
  /** Radix's 26 colours or the oxblood preset ([[part-colour-parity]]). */
  color?: AccentColor;
  /** Optional leading identification glyph at the start of the trigger (a category / flag / type icon). */
  icon?: ReactNode;
}

// Lets the Trigger (which owns its position) render the clear overlay using the Root's value state.
type ClearCtx = { hasValue: boolean; onClear: () => void };
const SelectClearContext = createContext<ClearCtx | null>(null);

// Radix Select.Trigger has no slots, so the leading icon (non-interactive) and the clear button overlay
// the trigger; CSS adds left/right padding so the value never runs under them.
const SelectTrigger = ({ icon, color, ...props }: TriggerOwnProps) => {
  const aria = useOptionalFieldControl();
  const clear = useContext(SelectClearContext);
  const showClear = !!clear?.hasValue;
  // Keyboard parity for the clear ✕ (which is out of the tab order, [[field-family-anatomy]]): with the closed trigger
  // focused, Backspace/Delete resets an optional (clearable) value to the placeholder. Satisfies
  // WCAG 2.1.1 — the ✕ is functionality, so it needs a keyboard equivalent — and matches react-select
  // and Ant `allowClear`. Backspace/Delete are neither Radix open keys nor type-ahead characters, so
  // this doesn't collide with the primitive, and it composes with any passed handler.
  const handleKeyDown = (e: KeyboardEvent<HTMLButtonElement>) => {
    props.onKeyDown?.(e);
    if (!e.defaultPrevented && clear?.hasValue && (e.key === "Backspace" || e.key === "Delete")) {
      e.preventDefault();
      clear.onClear();
    }
  };
  const trigger = (
    <RadixSelect.Trigger
      variant="surface"
      data-leading-icon={icon ? "" : undefined}
      data-clearable={showClear ? "" : undefined}
      {...aria}
      {...accentColorProps(color)}
      {...props}
      onKeyDown={handleKeyDown}
    />
  );
  if (!icon && !showClear) return trigger;
  return (
    <span className="rt-ds-select-affix" style={{ position: "relative", display: "block" }}>
      {icon && (
        <span aria-hidden className="rt-ds-select-lead" style={{ color: "var(--ds-icon-neutral)" }}>
          {icon}
        </span>
      )}
      {trigger}
      {showClear && (
        <span className="rt-ds-select-clear">
          <IconButton
            inset
            size="1"
            aria-label="Clear selection"
            tabIndex={-1}
            // pointerDown.preventDefault keeps the trigger from opening before the click clears it.
            onPointerDown={(e) => { e.preventDefault(); e.stopPropagation(); }}
            onClick={(e) => { e.stopPropagation(); clear?.onClear(); }}
          >
            <X weight="bold" />
          </IconButton>
        </span>
      )}
    </span>
  );
};

// EVERY OPTION SAYS WHERE IT SITS (Radix #3962, #4110).
//
// Radix's listbox wraps each option in three layers of divs, and it sets no `aria-posinset` or
// `aria-setsize`. The two issues report that VoiceOver with Chrome then announces an option with no
// position and no count. So the open listbox numbers its own options in DOM order, the way a flat
// listbox is counted, and renumbers them whenever its items change. An option that carries its own
// numbering keeps it, which leaves room for a list that renders only part of a longer set.
//
// The listbox node exists only while the menu is open, so the numbering hangs off its ref. React
// calls a ref in the same commit phase as a layout effect, each time the node mounts, so the numbers
// land before the first paint of the open menu.
const OPTION = '[role="option"]';
const numberedByUs = new WeakSet<Element>();

function numberOptions(listbox: HTMLElement) {
  const options = listbox.querySelectorAll(OPTION);
  const size = String(options.length);
  options.forEach((option, i) => {
    const ownNumbering = option.hasAttribute("aria-posinset") || option.hasAttribute("aria-setsize");
    if (ownNumbering && !numberedByUs.has(option)) return;
    numberedByUs.add(option);
    option.setAttribute("aria-posinset", String(i + 1));
    option.setAttribute("aria-setsize", size);
  });
}

// THE LISTBOX IS ANCHORED TO ITS CONTROL ([[select-anchoring]]).
//
// Radix's Select defaults to `position="item-aligned"`, which floats the panel so the SELECTED
// option lands on top of the trigger. Measured on the analytics dashboard: the panel covered its
// own trigger (4px above it), sat 20px to its right, and rendered 170px wide against a 190px
// trigger. Three separate ways of saying the control and its options are not the same object.
//
// `popper` is the behaviour every other floating surface in this system already has — Dialog,
// Popover, DropdownMenu and the rest are popper-positioned by construction, so Select was the one
// exception rather than the rule. Locked here, not left to the caller, for the same reason
// `variant="solid"` is locked: an unanchored listbox is a defect, not a taste.
//
// THE WIDTH FLOOR COMES FREE, AND WRITING IT AGAIN WOULD HAVE BEEN DEAD WEIGHT. The first version
// of this fix also set `min-width: var(--radix-select-trigger-width)` inline. Probing it proved the
// line did nothing: Radix's own stylesheet already carries that exact declaration under
// `.rt-SelectContent:where([data-side])`, and `[data-side]` is present only when the content is
// popper-positioned. So the narrow panel was never a second bug needing a second fix — it was the
// same one bug, because item-aligned content has no `data-side` and therefore never matched the
// rule that would have floored it. One switch repairs all three symptoms. This is the repo's
// standing rule about overrides: probe the cascade before adding one, because most of the time the
// existing selector already wins.
const SelectContent = ({ ref, color, ...props }: Omit<ContentProps, "variant" | "color"> & { color?: AccentColor }) => {
  const observer = useRef<MutationObserver | null>(null);
  const attach = useCallback(
    (node: HTMLDivElement | null) => {
      observer.current?.disconnect();
      observer.current = null;
      if (node) {
        numberOptions(node);
        observer.current = new MutationObserver(() => numberOptions(node));
        observer.current.observe(node, { childList: true, subtree: true });
      }
      if (typeof ref === "function") ref(node);
      else if (ref) ref.current = node;
    },
    [ref],
  );
  return <RadixSelect.Content variant="solid" position="popper" sideOffset={4} {...accentColorProps(color)} {...props} ref={attach} />;
};

const SelectRoot = ({ label, info, endSlot, description, validation, size, clearable, value, defaultValue, onValueChange, children, ...rest }: SelectRootProps) => {
  const resolvedSize = useResolvedSize("control", size);
  // When clearable, manage the value so the clear button can reset it and the trigger knows hasValue.
  const [internal, setInternal] = useState<string | undefined>(defaultValue);
  const isControlled = value !== undefined;
  const current = isControlled ? value : internal;
  const handleChange = (v: string) => { if (!isControlled) setInternal(v); onValueChange?.(v); };

  const valueProps = clearable
    ? { value: current ?? "", onValueChange: handleChange }
    : { value, defaultValue, onValueChange };

  const root = <RadixSelect.Root size={resolvedSize} {...valueProps} {...rest}>{children}</RadixSelect.Root>;
  const withClear = clearable ? (
    <SelectClearContext.Provider value={{ hasValue: !!current, onClear: () => handleChange("") }}>
      {root}
    </SelectClearContext.Provider>
  ) : root;

  // Bare unless it carries a label / validation / description — keeps simple `<Select>` usage untouched.
  if (label == null && validation == null && description == null) return withClear;
  return (
    <Field.Root validation={validation} description={description} size={resolvedSize}>
      {label != null && <Field.Label info={info} endSlot={endSlot}>{label}</Field.Label>}
      {withClear}
      {description != null && <Field.Description>{description}</Field.Description>}
      <Field.Message />
    </Field.Root>
  );
};

// A muted "no options" line — render inside Select.Content when the option list is empty (a static
// select can't filter, so emptiness is the consumer's to signal). It is a plain text node, not a
// Select.Item, so roving focus skips it (never selectable) — but it stays in the accessibility tree
// so a screen reader announces the empty menu, rather than opening to silence. Padding/size track a rest item.
const SelectEmpty = ({ children = "No options", ...props }: ComponentProps<"div">) => (
  <div style={{ padding: "var(--space-2)", color: "var(--ds-text-weak)", fontSize: "var(--font-size-2)" }} {...props}>
    {children}
  </div>
);

export const Select = Object.assign(SelectRoot, {
  // `Select` IS the root — `<Select>` is the canonical form here. `Root` is the SAME component under
  // its Radix name, so a snippet copied from the Radix Themes docs (`<Select.Root>`) resolves instead
  // of throwing "Element type is invalid". Same alias shape as `Tabs.Nav.Root` (Tabs.tsx).
  Root: SelectRoot,
  Trigger: SelectTrigger,
  Content: SelectContent,
  Item: RadixSelect.Item,
  Group: RadixSelect.Group,
  Label: RadixSelect.Label,
  Separator: RadixSelect.Separator,
  Empty: SelectEmpty,
});
