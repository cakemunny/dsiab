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
import { AlertDialog as RadixAlertDialog } from "@radix-ui/themes";
import { useResolvedSize } from "../../theme/SizeContext";
import { accentColorProps, type AccentColor } from "../../theme/Provider";
import { useReturnFocus } from "./useReturnFocus";

/* AlertDialog — a modal confirmation for a consequential (often destructive) action. A thin wrapper
 * over Radix Themes' compound AlertDialog: the Content is opaque + elevated by default (a modal panel,
 * [[floating-surface-fill]] — no translucent variant to lock), and its `size` follows the global uiSize control lane (our small
 * default) unless set. No Astryx equivalent — this is the System home for the tone="danger" confirm.
 *
 * The canonical confirm shape (documented in the story, not enforced here so non-destructive confirms
 * still compose): Cancel = <Button priority="secondary">, destructive Action = <Button priority="primary"
 * tone="danger"> — the [[button-priority]]/[[destructive-tone]] both-solid model. Radix's Trigger/Action/Cancel compose a child via asChild,
 * so our <Button> drops straight in. Destructive copy is verb+object ("Delete project"), never "OK" ([[destructive-tone]]).
 * Root/Trigger/Action/Cancel pass through unchanged, and Title passes through with `color` typed to take
 * the oxblood preset ([[part-colour-parity]]). Description registers itself with Content, and
 * Content keeps Radix's `aria-describedby` only while a Description is mounted (Radix #3007). */
type ContentProps = ComponentProps<typeof RadixAlertDialog.Content>;

/* The same registry as Dialog's (see Dialog.tsx): Radix points `aria-describedby` at its description id
 * whether or not a Description renders, so a Title-only confirm referenced an id no element carried.
 * Content passes `aria-describedby={undefined}` (Radix's own opt-out) while no Description is mounted. */
const DescriptionRegistry = createContext<(() => () => void) | null>(null);

function useDescriptionRegistry() {
  const [count, setCount] = useState(0);
  const register = useCallback(() => {
    setCount((c) => c + 1);
    return () => setCount((c) => c - 1);
  }, []);
  return [count > 0, register] as const;
}

/* Same close-focus repair as Dialog, including why the capture rides `onOpenAutoFocus`: Radix returns
 * focus to a registered `AlertDialog.Trigger` and to nothing at all without one, so a confirm driven
 * from an `open` prop would drop focus to <body>. */
function AlertDialogContent({ size, onOpenAutoFocus, onCloseAutoFocus, ...props }: ContentProps) {
  const [hasDescription, registerDescription] = useDescriptionRegistry();
  const resolvedSize = useResolvedSize("control", size) as ContentProps["size"];
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
      <RadixAlertDialog.Content
        size={resolvedSize}
        {...(hasDescription ? {} : { "aria-describedby": undefined })}
        onOpenAutoFocus={handleOpenAutoFocus}
        onCloseAutoFocus={handleCloseAutoFocus}
        {...props}
      />
    </DescriptionRegistry.Provider>
  );
}

type TitleProps = ComponentPropsWithoutRef<typeof RadixAlertDialog.Title>;
type DescriptionProps = ComponentPropsWithoutRef<typeof RadixAlertDialog.Description>;

/** AlertDialog.Title — Radix's Title, with `color` open to Radix's 26 colours and oxblood ([[part-colour-parity]]). */
const AlertDialogTitle = forwardRef<
  ComponentRef<typeof RadixAlertDialog.Title>,
  Omit<TitleProps, "color"> & { color?: AccentColor }
>(function AlertDialogTitle({ color, ...props }, ref) {
  return <RadixAlertDialog.Title ref={ref} {...accentColorProps(color)} {...props} />;
});

/** AlertDialog.Description — Radix's Description, registered with Content so `aria-describedby` is set
 *  only while one is mounted. */
const AlertDialogDescription = forwardRef<
  ComponentRef<typeof RadixAlertDialog.Description>,
  Omit<DescriptionProps, "color"> & { color?: AccentColor }
>(function AlertDialogDescription({ color, ...props }, ref) {
  const register = useContext(DescriptionRegistry);
  useLayoutEffect(() => register?.(), [register]);
  return <RadixAlertDialog.Description ref={ref} {...accentColorProps(color)} {...props} />;
});

export const AlertDialog = {
  Root: RadixAlertDialog.Root,
  Trigger: RadixAlertDialog.Trigger,
  Content: AlertDialogContent,
  Title: AlertDialogTitle,
  Description: AlertDialogDescription,
  Action: RadixAlertDialog.Action,
  Cancel: RadixAlertDialog.Cancel,
};
