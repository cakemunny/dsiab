import { useEffect, useRef, useState } from "react";
import { warnOnce } from "../theme/detectAndWarn";

/* useOverflowStop — the keyboard stop of a scroller that holds only text ([[scroll-area-keyboard-stop]]).
 *
 * A scroll viewport that overflows and holds nothing focusable cannot be reached by keyboard in a browser
 * that gives a scroller no tab stop of its own (WCAG 2.1.1). Chromium 130 and later make such a scroller
 * focusable, and the stop they give it has no role or name. So the viewport takes `tabIndex={0}` while it
 * overflows and holds no link, button or field, unless the caller passed a `tabIndex` of its own. A stop
 * with no accessible name warns once in development (WCAG 4.1.2).
 *
 * ScrollArea and Table call it. ScrollArea owns its viewport and passes the result as a prop. Table finds
 * the viewport Radix renders inside it and writes the attributes itself. */

export const FOCUSABLE =
  'a[href], area[href], button:not([disabled]), input:not([disabled]):not([type="hidden"]), select:not([disabled]), ' +
  'textarea:not([disabled]), iframe, audio[controls], video[controls], summary, [contenteditable]:not([contenteditable="false"]), ' +
  '[tabindex]:not([tabindex="-1"])';

export interface OverflowStopOptions {
  /** The caller's own tabIndex. When set, it wins and no measurement runs. */
  tabIndex?: number;
  /** Whether the viewport has an accessible name. An unnamed stop warns once in development. */
  named: boolean;
  /** The warnOnce key and message for an unnamed stop. */
  warnKey: string;
  warnMessage: string;
}

/** The tabIndex the viewport should carry: the caller's, else 0 while it overflows with text only, else undefined. */
export function useOverflowStop(
  getViewport: () => HTMLElement | null,
  { tabIndex, named, warnKey, warnMessage }: OverflowStopOptions,
): number | undefined {
  const getter = useRef(getViewport);
  getter.current = getViewport;

  const [textOnlyOverflow, setTextOnlyOverflow] = useState(false);
  useEffect(() => {
    const node = getter.current();
    if (!node || tabIndex !== undefined) return;
    const measure = () => {
      const overflows = node.scrollHeight > node.clientHeight || node.scrollWidth > node.clientWidth;
      setTextOnlyOverflow(overflows && !node.querySelector(FOCUSABLE));
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(node);
    if (node.firstElementChild) observer.observe(node.firstElementChild);
    return () => observer.disconnect();
  }, [tabIndex]);

  const stop = tabIndex ?? (textOnlyOverflow ? 0 : undefined);
  useEffect(() => {
    if (stop !== undefined && stop >= 0 && !named) warnOnce(warnKey, warnMessage);
  }, [stop, named, warnKey, warnMessage]);
  return stop;
}
