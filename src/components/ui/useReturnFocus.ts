import { useCallback, useMemo, useRef } from "react";

/* useReturnFocus — send focus back to whatever held it before a modal surface opened ([[focus-return-on-close]]).
 *
 * Radix's modal `Dialog.Content` does NOT restore focus to the previously-focused element. It cancels
 * the focus scope's own restore and focuses the registered trigger instead:
 *
 *     onCloseAutoFocus: composeEventHandlers(props.onCloseAutoFocus, (event) => {
 *       event.preventDefault();
 *       context.triggerRef.current?.focus();
 *     })
 *
 * `triggerRef` is populated by `Dialog.Trigger`. A surface opened from an `open` prop registers no
 * trigger, so `triggerRef.current` is null, the `preventDefault` still runs, and focus lands on
 * `<body>`. Keyboard and screen-reader users lose their place in the page (WCAG 2.4.3 Focus Order).
 *
 * WHERE THE CAPTURE HAPPENS, and why it is not an effect. Radix dispatches `onOpenAutoFocus` and moves
 * focus into the panel only if that event was not default-prevented, so the handler runs while
 * `document.activeElement` is still the opener. That is the one point that is correct for every caller.
 *
 * A layout effect keyed on an `isOpen` flag looks equivalent and is not. It works where the component
 * holding the flag stays mounted, and it silently captures nothing in a `Content` WRAPPER: React renders
 * `<Dialog.Content>` as a child of `Dialog.Root` whether or not the dialog is open — the gating happens
 * inside Radix, below the wrapper — so the wrapper mounts with the page, its effect reads `<body>`, and
 * it never runs again. That is not a hypothesis; it is what `RestoresFocusWithoutTrigger` reported when
 * this hook was written that way.
 *
 * WHY THE CLOSE HANDLER CAN DECLINE: `composeEventHandlers` calls the handler passed through props first
 * and skips Radix's own only when the event was default-prevented. Returning without preventing leaves
 * Radix's behaviour exactly as it was, which is what should happen when the opener has been unmounted
 * while the surface was open. */

export interface ReturnFocusHandlers {
  /** Capture only. It never prevents the default, so Radix still steers initial focus. */
  onOpenAutoFocus: (event: Event) => void;
  /** Pass to `Dialog.Content` / `AlertDialog.Content`. */
  onCloseAutoFocus: (event: Event) => void;
}

/** Both halves of the close-focus repair. Spread onto the modal content, or compose with your own. */
export function useReturnFocus(): ReturnFocusHandlers {
  const opener = useRef<HTMLElement | null>(null);

  const onOpenAutoFocus = useCallback(() => {
    const active = document.activeElement;
    // document.body is the "nothing was focused" reading, not an element worth returning to.
    opener.current = active instanceof HTMLElement && active !== document.body ? active : null;
  }, []);

  const onCloseAutoFocus = useCallback((event: Event) => {
    const element = opener.current;
    opener.current = null;
    if (!element || !element.isConnected) return;
    event.preventDefault();
    element.focus({ preventScroll: true });
  }, []);

  return useMemo(() => ({ onOpenAutoFocus, onCloseAutoFocus }), [onOpenAutoFocus, onCloseAutoFocus]);
}
