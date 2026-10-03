import {
  createContext,
  forwardRef,
  useCallback,
  useContext,
  useLayoutEffect,
  useState,
  type ComponentProps,
  type ComponentPropsWithoutRef,
  type ComponentRef,
} from "react";
import { Dialog as RadixDialog } from "@radix-ui/themes";
import { useResolvedSize } from "../../theme/SizeContext";
import { accentColorProps, type AccentColor } from "../../theme/Provider";
import { ButtonGroup, type ButtonGroupProps } from "./ButtonGroup";
import { useReturnFocus } from "./useReturnFocus";

/* Dialog — the standard modal: a titled panel over a dimmed page for a focused task or a short flow.
 * A thin wrapper over Radix Themes' compound Dialog. The Content is the opaque, elevated modal panel
 * (Radix ships no translucent Dialog variant — [[floating-surface-fill]]) and rides the container size lane (small → 2 …)
 * unless set: a standard content dialog reads a step more spacious than a terse confirm (AlertDialog,
 * which rides the control lane). Modal-tier motion — emphasis-in / fast-out on the panel and the scrim
 * fade on the overlay — is already bound to the shared `.rt-BaseDialogContent` / `.rt-BaseDialogOverlay`
 * base classes, so this wrap adds ZERO motion CSS and cannot drift from the other dialog surfaces.
 *
 * `Dialog.Footer` renders a `ButtonGroup` wired to the global `buttonOrder` — the primary (solid) action
 * anchors per the system order and the DOM/tab order follows the visual order, exactly like a confirm's
 * actions (a System wrapper wires EVERY system-parameterized behavior, not just tokens). One solid
 * primary per dialog ([[button-priority]]). A destructive confirm is AlertDialog's job — Dialog exposes no `tone`, and its
 * Usage cross-links the pair.
 *
 * Title is required. Radix wires `aria-labelledby` to it, and react-dialog 1.1.17 does not warn when it is
 * absent, so the docs carry that rule. Description is optional. It registers itself with Content, and
 * Content keeps Radix's `aria-describedby` only while a Description is mounted (Radix #3007).
 * Root / Trigger / Close pass through unchanged, and Title passes through with `color` typed to take the
 * oxblood preset ([[part-colour-parity]]). `onOpenAutoFocus` /
 * `onCloseAutoFocus` flow through Content for focus steering (typed by Radix's Content props).
 * Content also supplies a DEFAULT `onCloseAutoFocus` that returns focus to whatever opened the dialog
 * ([[focus-return-on-close]]) — Radix returns it only to a registered `Dialog.Trigger`, so a dialog driven from `open` used to
 * drop focus to <body>. A consumer handler still runs first and still wins by preventing the default.
 *
 * The three specialized raw-Dialog consumers (CommandPalette, Lightbox, MobileNav) deliberately KEEP the
 * raw Radix Themes Dialog — they skin their own content, animate their own tiers, and steer their own
 * open-focus; they share this file's close-focus repair through the same `useReturnFocus` hook. System
 * Dialog serves the standard title / description / body / footer modal; the non-swap is intentional,
 * not an oversight. */
type ContentProps = ComponentProps<typeof RadixDialog.Content>;

/* Radix points Content's `aria-describedby` at its description id whether or not a Description ever
 * renders (Radix #3007), so a dialog with a Title alone referenced an id no element carried. Description
 * registers here, and Content passes `aria-describedby={undefined}` (Radix's own opt-out) while none is
 * mounted. The layout effect registers before paint and before the open auto-focus, so assistive tech
 * meets the dialog with its final attributes. */
const DescriptionRegistry = createContext<(() => () => void) | null>(null);

function useDescriptionRegistry() {
  const [count, setCount] = useState(0);
  const register = useCallback(() => {
    setCount((c) => c + 1);
    return () => setCount((c) => c - 1);
  }, []);
  return [count > 0, register] as const;
}

/* This wrapper renders whenever its parent does, open or not — Radix gates the DOM below it — so the
 * opener is captured from `onOpenAutoFocus`, which fires while activeElement is still the opener, and
 * never from a mount effect. The capture goes FIRST so a consumer handler that moves focus cannot
 * overwrite it; the restore goes LAST so a consumer handler that prevents the default still wins. */
function DialogContent({ size, onOpenAutoFocus, onCloseAutoFocus, ...props }: ContentProps) {
  const [hasDescription, registerDescription] = useDescriptionRegistry();
  const resolvedSize = useResolvedSize("container", size) as ContentProps["size"];
  const returnFocus = useReturnFocus();
  const handleOpenAutoFocus = (event: Event) => {
    returnFocus.onOpenAutoFocus(event);
    onOpenAutoFocus?.(event);
  };
  const handleCloseAutoFocus = (event: Event) => {
    onCloseAutoFocus?.(event);
    if (!event.defaultPrevented) returnFocus.onCloseAutoFocus(event);
  };
  return (
    <DescriptionRegistry.Provider value={registerDescription}>
      <RadixDialog.Content
        size={resolvedSize}
        {...(hasDescription ? {} : { "aria-describedby": undefined })}
        onOpenAutoFocus={handleOpenAutoFocus}
        onCloseAutoFocus={handleCloseAutoFocus}
        {...props}
      />
    </DescriptionRegistry.Provider>
  );
}

type TitleProps = ComponentPropsWithoutRef<typeof RadixDialog.Title>;
type DescriptionProps = ComponentPropsWithoutRef<typeof RadixDialog.Description>;

/** Dialog.Title — Radix's Title, with `color` open to Radix's 26 colours and oxblood ([[part-colour-parity]]). */
const DialogTitle = forwardRef<
  ComponentRef<typeof RadixDialog.Title>,
  Omit<TitleProps, "color"> & { color?: AccentColor }
>(function DialogTitle({ color, ...props }, ref) {
  return <RadixDialog.Title ref={ref} {...accentColorProps(color)} {...props} />;
});

/** Dialog.Description — Radix's Description, registered with Content so `aria-describedby` is set only
 *  while one is mounted. */
const DialogDescription = forwardRef<
  ComponentRef<typeof RadixDialog.Description>,
  Omit<DescriptionProps, "color"> & { color?: AccentColor }
>(function DialogDescription({ color, ...props }, ref) {
  const register = useContext(DescriptionRegistry);
  useLayoutEffect(() => register?.(), [register]);
  return <RadixDialog.Description ref={ref} {...accentColorProps(color)} {...props} />;
});

/** Dialog.Footer — the modal's action row. A `ButtonGroup` (so the primary anchors per the global
 *  `buttonOrder`, and the DOM/tab order follows the visual order) with the standard modal top gap.
 *  Override any ButtonGroup / Flex prop — `order`, `justify`, `mt`, `gap`, … */
function DialogFooter({ mt = "4", children, ...props }: ButtonGroupProps) {
  return (
    <ButtonGroup mt={mt} {...props}>
      {children}
    </ButtonGroup>
  );
}

export const Dialog = {
  Root: RadixDialog.Root,
  Trigger: RadixDialog.Trigger,
  Content: DialogContent,
  Title: DialogTitle,
  Description: DialogDescription,
  Close: RadixDialog.Close,
  Footer: DialogFooter,
};
