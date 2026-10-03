import {
  Children,
  createContext,
  isValidElement,
  useContext,
  useId,
  useMemo,
  useRef,
  useState,
  type ComponentProps,
  type KeyboardEvent,
  type ReactNode,
} from "react";
import * as Popover from "@radix-ui/react-popover";
import { Theme, Text } from "@radix-ui/themes";
import { X } from "@phosphor-icons/react";
import { useResolvedSize } from "../../theme/SizeContext";
import { Field, useOptionalFieldControl } from "./Field";
import { IconButton } from "./IconButton";
import { Button } from "./Button";
import { CheckboxVisual } from "./CheckboxVisual";

type Size = "1" | "2" | "3";
type Validation = { tone: "error" | "warning" | "success" | "info"; message: ReactNode };

/**
 * MultiSelect — a multi-selectable listbox on the shared `Field` chrome. It is a SEPARATE component
 * from `Select` (Radix Select is single-value only): a custom listbox built on `@radix-ui/react-popover`
 * for positioning/portal/dismiss, with a hand-rolled roving-tabindex keyboard. They read as siblings —
 * same surface trigger (the `.rt-SelectTrigger` chrome, caret, accent focus ring), size scale, clear ✕,
 * disabled dimming, and tokens — but the multiplicity signals diverge: the trigger shows an adaptive
 * **count** (0 → placeholder · 1 → the item label · 2+ → "N selected") and each menu row carries a
 * presentational **checkbox** ({@link CheckboxVisual}) instead of the single-select's solid accent row.
 *
 * A11y: APG multi-selectable **listbox**. The trigger is a `<button aria-haspopup="listbox" aria-expanded>`
 * (one tab stop); the panel is `role="listbox" aria-multiselectable="true"` with `role="option"
 * aria-selected` children. The checkbox is `aria-hidden` — `aria-selected` is the source of truth; the
 * real interactive `Checkbox` is never mounted in a row. The full row is the toggle target.
 *
 * Commit model: live-apply. Each toggle commits to `value: string[]` immediately (the count stays live)
 * and the panel stays open; Escape / Tab / outside-click close without reverting (no buffer).
 *
 * @example
 * <MultiSelect label="Countries" placeholder="Select countries…" clearable value={v} onValueChange={setV}>
 *   <MultiSelect.Option value="us">United States</MultiSelect.Option>
 *   <MultiSelect.Option value="ca">Canada</MultiSelect.Option>
 * </MultiSelect>
 */
export interface MultiSelectProps {
  /** Controlled selected values. */
  value?: string[];
  /** Uncontrolled initial selected values. */
  defaultValue?: string[];
  onValueChange?: (value: string[]) => void;
  /** Trigger text while nothing is selected (a greyed hint, not a label). */
  placeholder?: ReactNode;
  /** Override the 2+ count display (default `"${n} selected"`). */
  countLabel?: (n: number) => ReactNode;
  /** When set, a clear ✕ appears while ≥1 value is selected and clears all (Backspace/Delete parity). */
  clearable?: boolean;
  /** Opt-in: a header above the list (outside the listbox) with Select all ⇄ Deselect all, a
   *  "N of M selected" status, and a lighter Clear. Off by default — reach for it on long lists where
   *  bulk-selecting all/most is a real task. The Ctrl/Cmd+A keyboard select-all works regardless. */
  selectAll?: boolean;
  /** Open the panel on mount (uncontrolled) — used by docs to show the open listbox. */
  defaultOpen?: boolean;
  size?: Size;
  disabled?: boolean;
  /** Field label — pass none of label/description/validation to keep the control bare. */
  label?: ReactNode;
  /** Accessible name for the trigger when there is no visible `label` (e.g. a bare MultiSelect embedded
   *  in another control's popover). Opt-in: when omitted the trigger stays content-named as before. */
  "aria-label"?: string;
  info?: ReactNode;
  endSlot?: ReactNode;
  /** Persistent helper line under the trigger — calm guidance that holds in any validation state. */
  description?: ReactNode;
  validation?: Validation;
  children: ReactNode;
}

type Ctx = {
  value: string[];
  toggle: (v: string) => void;
  size: Size;
  activeValue: string | null;
  setActiveValue: (v: string | null) => void;
};
const MultiSelectCtx = createContext<Ctx | null>(null);
const useMS = () => {
  const ctx = useContext(MultiSelectCtx);
  if (!ctx) throw new Error("MultiSelect.* must be used inside <MultiSelect>");
  return ctx;
};

// Names a Group's heading so the option group is labelled (aria-labelledby) by its Label.
const GroupLabelCtx = createContext<string | null>(null);

/** One option row: a presentational checkbox + the label. The full row is the toggle target. */
interface OptionProps {
  value: string;
  disabled?: boolean;
  children: ReactNode;
}
function MultiSelectOption({ value, disabled, children }: OptionProps) {
  const { value: selectedValues, toggle, size, activeValue, setActiveValue } = useMS();
  const selected = selectedValues.includes(value);
  const isActive = activeValue === value;
  return (
    <div
      role="option"
      aria-selected={selected}
      aria-disabled={disabled || undefined}
      data-value={value}
      data-active={isActive ? "" : undefined}
      tabIndex={isActive ? 0 : -1}
      className="rt-reset rt-ds-multiselect-option"
      onClick={() => { if (!disabled) toggle(value); }}
      onMouseEnter={() => { if (!disabled) setActiveValue(value); }}
    >
      <CheckboxVisual checked={selected} disabled={disabled} size={size} />
      <span className="rt-ds-multiselect-label">{children}</span>
    </div>
  );
}

/** Clusters related options under a heading; pair with a MultiSelect.Label. */
function MultiSelectGroup({ children }: { children: ReactNode }) {
  const labelId = useId();
  return (
    <GroupLabelCtx.Provider value={labelId}>
      <div role="group" aria-labelledby={labelId} className="rt-ds-multiselect-group">
        {children}
      </div>
    </GroupLabelCtx.Provider>
  );
}

/** A non-selectable group heading (--ds-text-weak). */
function MultiSelectLabel({ children }: { children: ReactNode }) {
  const id = useContext(GroupLabelCtx);
  return <div id={id ?? undefined} className="rt-ds-multiselect-grouplabel">{children}</div>;
}

/** A 1px rule between groups (--ds-stroke-weak). Decorative. */
function MultiSelectSeparator() {
  return <div aria-hidden className="rt-ds-multiselect-separator" />;
}

/** A muted, non-focusable "no options" line — render it as the only child when the list is empty. */
function MultiSelectEmpty({ children = "No options", ...props }: ComponentProps<"div">) {
  return <div className="rt-ds-multiselect-empty" {...props}>{children}</div>;
}

// Recursively collect Option metadata (in source order) for the trigger display (count + 1 → label)
// and the select-all header (enabled count + values).
type OptMeta = { value: string; node: ReactNode; disabled: boolean };
function collectOptions(children: ReactNode, acc: OptMeta[]) {
  Children.forEach(children, (child) => {
    if (!isValidElement(child)) return;
    if (child.type === MultiSelectOption) {
      const props = child.props as OptionProps;
      acc.push({ value: props.value, node: props.children, disabled: !!props.disabled });
    } else {
      const props = child.props as { children?: ReactNode };
      if (props?.children) collectOptions(props.children, acc);
    }
  });
}

const Caret = () => (
  // The exact Radix Select chevron, so the multi trigger's caret matches the single Select's.
  <svg width="9" height="9" viewBox="0 0 9 9" fill="currentcolor" xmlns="http://www.w3.org/2000/svg" className="rt-SelectIcon" aria-hidden="true">
    <path d="M0.135232 3.15803C0.324102 2.95657 0.640521 2.94637 0.841971 3.13523L4.5 6.56464L8.158 3.13523C8.3595 2.94637 8.6759 2.95657 8.8648 3.15803C9.0536 3.35949 9.0434 3.67591 8.842 3.86477L4.84197 7.6148C4.64964 7.7951 4.35036 7.7951 4.15803 7.6148L0.158031 3.86477C-0.0434285 3.67591 -0.0536285 3.35949 0.135232 3.15803Z" />
  </svg>
);

// The control body — the popover trigger + listbox. Split out from the Root so it renders INSIDE
// Field.Root and can read the field aria (id / aria-describedby / aria-invalid) via the Field context.
interface BodyProps {
  current: string[];
  commit: (next: string[]) => void;
  resolvedSize: Size;
  placeholder?: ReactNode;
  countLabel?: (n: number) => ReactNode;
  clearable?: boolean;
  selectAll?: boolean;
  defaultOpen?: boolean;
  disabled?: boolean;
  label?: ReactNode;
  ariaLabel?: string;
  children: ReactNode;
}

function MultiSelectBody({
  current, commit, resolvedSize, placeholder, countLabel, clearable, selectAll, defaultOpen, disabled, label, ariaLabel: ariaLabelProp, children,
}: BodyProps) {
  const aria = useOptionalFieldControl();
  const listboxId = useId();
  const toggle = (v: string) =>
    commit(current.includes(v) ? current.filter((x) => x !== v) : [...current, v]);
  const clearAll = () => commit([]);

  const [open, setOpen] = useState(defaultOpen ?? false);
  const [activeValue, setActiveValue] = useState<string | null>(null);
  const listboxRef = useRef<HTMLDivElement>(null);
  const typeahead = useRef<{ buffer: string; timer: number | null }>({ buffer: "", timer: null });

  const options = useMemo(() => { const acc: OptMeta[] = []; collectOptions(children, acc); return acc; }, [children]);
  const count = current.length;
  const showClear = !!clearable && count > 0 && !disabled;

  // Select-all targets the ENABLED options (disabled are never togglable). Shared by the header button
  // and the Ctrl/Cmd+A shortcut: toggle to all-selected, or back to none when already all-selected.
  const enabledValues = useMemo(() => options.filter((o) => !o.disabled).map((o) => o.value), [options]);
  const totalEnabled = enabledValues.length;
  const allSelected = totalEnabled > 0 && enabledValues.every((v) => current.includes(v));
  const toggleAll = () =>
    commit(allSelected ? current.filter((v) => !enabledValues.includes(v)) : Array.from(new Set([...current, ...enabledValues])));

  // Adaptive count: 0 → placeholder · 1 → the item label · 2+ → "N selected".
  const single = count === 1 ? options.find((o) => o.value === current[0]) : undefined;
  const display: ReactNode =
    count === 0 ? (placeholder ?? "Select…")
    : count === 1 ? (single ? single.node : "1 selected")
    : (countLabel ? countLabel(count) : `${count} selected`);

  const ariaLabel =
    ariaLabelProp ??
    (typeof label === "string" ? label
    : typeof placeholder === "string" ? placeholder
    : "Options");

  // ---- roving-tabindex keyboard over the live DOM options -------------------
  const optionEls = () => Array.from(listboxRef.current?.querySelectorAll<HTMLElement>('[role="option"]') ?? []);
  const enabledEls = () => optionEls().filter((el) => el.getAttribute("aria-disabled") !== "true");
  const valOf = (el: HTMLElement) => el.dataset.value as string;
  const focusEl = (el: HTMLElement | undefined) => { if (el) { setActiveValue(valOf(el)); el.focus(); } };

  const focusInitial = () => {
    const list = enabledEls();
    const sel = list.find((el) => current.includes(valOf(el)));
    focusEl(sel ?? list[0]);
  };

  const runTypeahead = (char: string) => {
    const t = typeahead.current;
    if (t.timer) window.clearTimeout(t.timer);
    t.buffer += char.toLowerCase();
    t.timer = window.setTimeout(() => { t.buffer = ""; t.timer = null; }, 500);
    const list = enabledEls();
    if (!list.length) return;
    const curIdx = Math.max(0, list.findIndex((el) => valOf(el) === activeValue));
    const ordered = [...list.slice(curIdx + 1), ...list.slice(0, curIdx + 1)];
    const match = ordered.find((el) => (el.textContent ?? "").trim().toLowerCase().startsWith(t.buffer));
    if (match) focusEl(match);
  };

  const onListKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    const list = enabledEls();
    if (!list.length) return;
    const curIdx = list.findIndex((el) => valOf(el) === activeValue);
    const key = e.key;

    if ((e.metaKey || e.ctrlKey) && (key === "a" || key === "A")) {
      e.preventDefault();
      toggleAll();
      return;
    }
    switch (key) {
      case "ArrowDown": {
        e.preventDefault();
        const next = list[Math.min(curIdx + 1, list.length - 1)] ?? list[0];
        focusEl(next);
        if (e.shiftKey && next && !current.includes(valOf(next))) toggle(valOf(next));
        break;
      }
      case "ArrowUp": {
        e.preventDefault();
        const prev = list[Math.max(curIdx - 1, 0)] ?? list[list.length - 1];
        focusEl(prev);
        if (e.shiftKey && prev && !current.includes(valOf(prev))) toggle(valOf(prev));
        break;
      }
      case "Home": e.preventDefault(); focusEl(list[0]); break;
      case "End": e.preventDefault(); focusEl(list[list.length - 1]); break;
      case "Enter":
      case " ":
        // Enter must preventDefault so it never submits a surrounding form (the panel stays open).
        e.preventDefault();
        if (activeValue != null) toggle(activeValue);
        break;
      case "Escape": e.preventDefault(); setOpen(false); break;
      // Forward Tab closes (spec). When the select-all header is present, Shift+Tab is allowed to fall
      // through so keyboard users can reach the header's Select-all / Clear buttons (they sit before the
      // listbox in the DOM); otherwise Shift+Tab closes too.
      case "Tab": if (selectAll && e.shiftKey) break; setOpen(false); break;
      default:
        if (key.length === 1 && !e.metaKey && !e.ctrlKey && !e.altKey) runTypeahead(key);
    }
  };

  // Closed-trigger keys: ↑/↓ open; Backspace/Delete clear a clearable selection (the ✕ keyboard parity).
  const onTriggerKeyDown = (e: KeyboardEvent<HTMLButtonElement>) => {
    if (!open && (e.key === "ArrowDown" || e.key === "ArrowUp")) { e.preventDefault(); setOpen(true); return; }
    if (clearable && count > 0 && (e.key === "Backspace" || e.key === "Delete")) { e.preventDefault(); clearAll(); }
  };

  const trigger = (
    <span className="rt-ds-select-affix" style={{ position: "relative", display: "block" }}>
      <Popover.Trigger asChild>
        <button
          type="button"
          className={`rt-reset rt-SelectTrigger rt-r-size-${resolvedSize} rt-variant-surface`}
          aria-haspopup="listbox"
          aria-expanded={open}
          aria-controls={open ? listboxId : undefined}
          data-state={open ? "open" : "closed"}
          data-placeholder={count === 0 ? "" : undefined}
          data-clearable={showClear ? "" : undefined}
          disabled={disabled}
          onKeyDown={onTriggerKeyDown}
          {...aria}
          // Opt-in accessible name for a bare (no visible label) trigger; omitted → content-named as before.
          aria-label={label == null ? ariaLabelProp : undefined}
        >
          {/* `rt-SelectTriggerInner` is Radix's own value box and is SHARED with Select and
              DateRangeInput; the second class is the MultiSelect-only hook the tabular-figures rule
              targets (components.css), so those two components are not restyled as a side effect. */}
          <span className="rt-SelectTriggerInner rt-ds-multiselect-trigger-text">{display}</span>
          <Caret />
        </button>
      </Popover.Trigger>
      {showClear && (
        <span className="rt-ds-select-clear">
          <IconButton
            inset
            size="1"
            aria-label="Clear selection"
            tabIndex={-1}
            onPointerDown={(e) => { e.preventDefault(); e.stopPropagation(); }}
            onClick={(e) => { e.stopPropagation(); clearAll(); }}
          >
            <X weight="bold" />
          </IconButton>
        </span>
      )}
    </span>
  );

  return (
    <MultiSelectCtx.Provider value={{ value: current, toggle, size: resolvedSize, activeValue, setActiveValue }}>
      <Popover.Root open={open} onOpenChange={setOpen}>
        {trigger}
        <Popover.Portal>
          {/* The primitive Popover portals to <body>, OUTSIDE the Storybook/app .radix-themes root, so
              the Radix token scales (scaling, space, accent) would not resolve. Wrap in Theme (as the
              Content element) to re-propagate the inherited theme into the portal — the same thing Radix
              Themes' own Select and Popover portals do. The Popover content is a role=dialog wrapper, so
              name it (aria-label) and carry the role=listbox on the inner element. */}
          <Popover.Content
            asChild
            align="start"
            sideOffset={4}
            aria-label={ariaLabel}
            onOpenAutoFocus={(e) => { e.preventDefault(); focusInitial(); }}
          >
            <Theme className={`rt-ds-multiselect-panel rt-r-size-${resolvedSize}`}>
              {selectAll && (
                // Bulk controls live OUTSIDE role=listbox (a listbox's children must be options). The
                // status is an aria-live region so the running count is announced as selections change.
                <div className="rt-ds-multiselect-header">
                  <Button priority="secondary" size={resolvedSize} type="button" onClick={toggleAll}>
                    {allSelected ? `Deselect all (${totalEnabled})` : `Select all (${totalEnabled})`}
                  </Button>
                  <span className="rt-ds-multiselect-status">
                    <Text as="span" size="1" role="status" aria-live="polite" style={{ color: "var(--ds-text-weak)" }}>
                      {count} of {totalEnabled} selected
                    </Text>
                    {count > 0 && (
                      <Button priority="tertiary" color="gray" size={resolvedSize} type="button" onClick={clearAll}>
                        Clear
                      </Button>
                    )}
                  </span>
                </div>
              )}
              <div
                ref={listboxRef}
                id={listboxId}
                role="listbox"
                aria-multiselectable="true"
                aria-label={ariaLabel}
                className="rt-ds-multiselect-listbox"
                onKeyDown={onListKeyDown}
              >
                {children}
              </div>
            </Theme>
          </Popover.Content>
        </Popover.Portal>
      </Popover.Root>
    </MultiSelectCtx.Provider>
  );
}

function MultiSelectRoot({
  value, defaultValue, onValueChange, placeholder, countLabel, clearable, selectAll, defaultOpen,
  size, disabled, label, info, endSlot, description, validation, "aria-label": ariaLabelProp, children,
}: MultiSelectProps) {
  const resolvedSize = (useResolvedSize<Size>("control", size) ?? "1") as Size;
  const [internal, setInternal] = useState<string[]>(defaultValue ?? []);
  const isControlled = value !== undefined;
  const current = isControlled ? value : internal;
  const commit = (next: string[]) => { if (!isControlled) setInternal(next); onValueChange?.(next); };

  const body = (
    <MultiSelectBody
      current={current}
      commit={commit}
      resolvedSize={resolvedSize}
      placeholder={placeholder}
      countLabel={countLabel}
      clearable={clearable}
      selectAll={selectAll}
      defaultOpen={defaultOpen}
      disabled={disabled}
      label={label}
      ariaLabel={ariaLabelProp}
    >
      {children}
    </MultiSelectBody>
  );

  // Bare unless it carries a label / validation / description — keeps simple usage untouched.
  if (label == null && validation == null && description == null) return body;
  return (
    <Field.Root validation={validation} description={description} size={resolvedSize}>
      {label != null && <Field.Label info={info} endSlot={endSlot}>{label}</Field.Label>}
      {body}
      {description != null && <Field.Description>{description}</Field.Description>}
      <Field.Message />
    </Field.Root>
  );
}

export const MultiSelect = Object.assign(MultiSelectRoot, {
  Option: MultiSelectOption,
  Group: MultiSelectGroup,
  Label: MultiSelectLabel,
  Separator: MultiSelectSeparator,
  Empty: MultiSelectEmpty,
});
