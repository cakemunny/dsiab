import { useEffect, type ComponentProps } from "react";
import { Popover as RadixPopover } from "@radix-ui/themes";
import * as PopoverPrimitive from "@radix-ui/react-popover";
import { useResolvedSize } from "../../theme/SizeContext";
import { DEV_WARN } from "../../theme/detectAndWarn";

/* Popover — a click-opened floating panel that holds ANY content (text, controls, a small form); it is
 * a labelled `role="dialog"`, not a menu. A thin wrapper over Radix Themes' compound Popover: Content
 * rides the uiSize control lane (its size follows the global small default unless set) and Root, Trigger
 * and Close, plus the anchor/arrow positioning props on Content, pass through unchanged. Anchor is the
 * one part that does NOT come from Radix Themes, for the reason directly below.
 *
 * ANCHOR COMES FROM THE PRIMITIVE, BECAUSE THE THEMES WRAPPER ERASES ITS CHILDREN. Radix Themes writes
 * its Anchor as `({ children, ...rest }, ref) => <Primitive.Anchor {...rest} ref={ref} />`, so `children`
 * is destructured off and never passed on. Measured at 51bfa0b by server render: a plain
 * `<Popover.Anchor><Row /></Popover.Anchor>` is an empty `<div>` and the same anchor with `asChild` is
 * NOTHING AT ALL. The consumer's markup disappears with no error, no warning and no type failure, and
 * `asChild` is in the published type, so a clean compile reaches it. That is the [[aschild-or-type-error]] rule pointed the
 * quiet way: the type says yes and the runtime says no.
 *
 * `@radix-ui/react-popover` is the same module Radix Themes itself imports, checked by identity rather
 * than by reading: `radix-ui`'s `Popover.Root` and `@radix-ui/react-popover`'s `Root` are the SAME
 * function object, so the primitive Anchor reads the one popover context Root publishes and nothing is
 * scoped twice. Binding Anchor to it restores exactly what Radix would have honoured, and nothing else
 * about the part changes: the Themes wrapper added no class, no prop mapping and no default.
 *
 * THE NEED IS ALREADY DEMONSTRATED FOUR TIMES INSIDE THIS REPO. DateInput, DateRangeInput, Typeahead and
 * TopNav all pin the panel to a whole field wrapper while the trigger sits inside it, and all four reach
 * PAST this wrapper to the raw primitive to get an anchor that keeps its children. A consumer has no
 * such escape: the raw primitive is not published, so the published Anchor was the only one they had.
 *
 * THE NAME IS REQUIRED, IN THE TYPE ([[chat-log-scroller]]'s precedent, applied here by [[popover-accessible-name]]). Radix hardcodes
 * `role="dialog"` on the panel, and a dialog with no accessible name is a WCAG 4.1.2 failure — a screen
 * reader announces "dialog" and nothing else. This docblock claimed "a labelled role=dialog" for a
 * panel nothing obliged anyone to label, and a composition scenario found the gap by rendering one.
 * So `aria-label` or `aria-labelledby` is now a compile error to omit, and the runtime check below
 * catches the empty string a template literal hands over.
 *
 * NOT the same question as the non-dialog pattern. Typeahead and PowerSearch build on the RAW
 * `@radix-ui/react-popover` and suppress the role outright (`role="none"`), because there the inner
 * form controls carry the semantics. Those never reach this wrapper, and they should not be named.
 *
 * Motion is inherited, not declared. The panel carries the shared `.rt-PopperContent` base class, which
 * components.css already binds to the POPPER tier — in on --ds-duration-overlay/--ds-ease-entry, out on
 * the LONGER --ds-duration-emphasis/--ds-ease-standard (fast-in / slow-out, [[motion-retiming]]) — the one overlay-motion
 * scale every floating surface opens with, so this wrap adds ZERO motion CSS. It reuses Radix's own
 * solid panel skin (an opaque --color-panel-solid surface with an elevation shadow), so it declares
 * no --ds-* paint roles of its own. */
type RadixContentProps = ComponentProps<typeof RadixPopover.Content>;

/** One of the two naming routes is required. Both are allowed — a panel may carry a visible heading
 *  AND an explicit label — but neither being present is the case this type exists to reject. */
type NamedProps =
  | { "aria-label": string; "aria-labelledby"?: string }
  | { "aria-labelledby": string; "aria-label"?: string };

export type PopoverContentProps = Omit<RadixContentProps, "aria-label" | "aria-labelledby"> & NamedProps;

function PopoverContent({ size, ...props }: PopoverContentProps) {
  const resolvedSize = useResolvedSize("control", size) as RadixContentProps["size"];

  const label = (props as Record<string, unknown>)["aria-label"];
  const labelledBy = (props as Record<string, unknown>)["aria-labelledby"];
  useEffect(() => {
    if (!DEV_WARN) return;
    const named =
      (typeof label === "string" && label.trim() !== "") ||
      (typeof labelledBy === "string" && labelledBy.trim() !== "");
    if (!named) {
      console.warn(
        "Popover.Content: the panel is a role=\"dialog\" and needs an accessible name, but its " +
          "`aria-label`/`aria-labelledby` is empty. A screen reader announces \"dialog\" and nothing " +
          "else (WCAG 4.1.2). The type requires one of them; this is the empty string getting past it.",
      );
    }
  }, [label, labelledBy]);

  return <RadixPopover.Content size={resolvedSize} {...(props as RadixContentProps)} />;
}

export const Popover = {
  Root: RadixPopover.Root,
  Trigger: RadixPopover.Trigger,
  Content: PopoverContent,
  Close: RadixPopover.Close,
  // The primitive, not Radix Themes' wrapper: see ANCHOR COMES FROM THE PRIMITIVE above.
  Anchor: PopoverPrimitive.Anchor,
};
