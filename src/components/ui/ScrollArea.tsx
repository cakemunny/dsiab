import { forwardRef, useCallback, useRef, type ComponentPropsWithoutRef, type ElementRef } from "react";
import { ScrollArea as RadixScrollArea } from "@radix-ui/themes";
import { useResolvedSize } from "../../theme/SizeContext";
import { useOverflowStop } from "../../hooks/useOverflowStop";

/* ScrollArea — a custom-scrollbar scroll container for a BOUNDED region that holds more content than
 * fits (a fixed-height list, a message log, a wide row of cards). A THIN wrap over Radix Themes'
 * ScrollArea: it swaps the native scrollbar for an overlay one it draws itself and passes everything
 * else straight through. You give it (or its child) a fixed height / maxHeight — or width for a
 * horizontal bar — and the overflow scrolls under the custom scrollbar.
 *
 * SIZE LANE — the SCROLLBAR THICKNESS rides the CONTROL lane, not the container lane. ScrollArea's
 * `size` range is only 1–3 (1 = thin … 3 = chunky), so the control lane maps small → 1 / medium → 2 /
 * large → 3 and every tier lands on a valid step. The container lane (the surface scale Dialog / Card
 * ride) tops out at large → "4", which is OUT OF RANGE for ScrollArea. Radix does NOT drop an
 * out-of-range enum — `extractProps` (@radix-ui/themes/dist/esm/helpers/extract-props.js) substitutes the
 * prop's own `default`, and ScrollArea's default is "1", so a container-lane `large` would silently render
 * the THINNEST scrollbar: the exact opposite of what it asked for, with nothing in the DOM to show a size
 * was ignored. Hence the deliberate deviation from the container surface it lives on: the scrollbar is a
 * control-scale accent riding a surface, not a container-scale surface in its own right. An explicit
 * `size` still wins.
 *
 * Scrollbar colours reuse Radix's OWN gray-alpha skin — the thumb paints `--gray-a8` (`--gray-a9` on
 * hover), the neutral overlay-scrollbar treatment — so this wrap declares no `--ds-*` roles of its own
 * (the Separator / AspectRatio precedent: borrow the Radix skin where it already matches the system's
 * neutral stroke). Since [[neutral-part-stacks]] components.css stacks `--neutral-thumb-stack` (theme.css) on the thumb as a
 * gradient layer, so the thumb clears WCAG 3:1 and APCA Lc 30 against its lane and the surface.
 *
 * `type` (auto | always | hover | scroll), `scrollbars` (vertical | horizontal | both), `size` (1–3),
 * `radius`, and every layout / `data-*` / `aria-*` prop pass straight through to Radix.
 *
 * A SCROLLER THAT HOLDS ONLY TEXT IS A NAMED KEYBOARD STOP ([[chat-log-scroller]]'s three, applied by default). Radix
 * routes rest props and the ref onto the VIEWPORT, the node that scrolls, and puts no tab stop, role or
 * name on it. Chromium 130 and later make such a scroller focusable on their own, and the stop they
 * give it is a generic node with no role of its own. A browser without that behaviour gives no stop at
 * all, and then the text below the fold cannot be reached by keyboard (WCAG 2.1.1). So, after mount and
 * on every resize, a viewport that overflows and holds nothing focusable takes `tabIndex={0}`, unless the
 * caller passed a `tabIndex` of its own. A viewport given `aria-label` or `aria-labelledby` takes
 * `role="region"`, a role that carries a name, unless the caller passed a `role`. A focusable viewport
 * with no name warns once in development (WCAG 4.1.2). A scroller that holds a link, a button or a field
 * is reached through those and keeps no stop of its own. The measurement lives in `hooks/useOverflowStop.ts`,
 * which Table shares. */
export type ScrollAreaProps = ComponentPropsWithoutRef<typeof RadixScrollArea>;

const UNNAMED_SCROLLER_MESSAGE =
  "a ScrollArea is a keyboard stop with no accessible name, so a screen reader lands on it and announces " +
  "nothing. Pass aria-label or aria-labelledby, which also gives it role=\"region\" (WCAG 4.1.2).";

export const ScrollArea = forwardRef<ElementRef<typeof RadixScrollArea>, ScrollAreaProps>(
  function ScrollArea({ size, tabIndex, role, ...props }, ref) {
    const resolvedSize = useResolvedSize("control", size) as ScrollAreaProps["size"];
    const viewport = useRef<HTMLDivElement | null>(null);
    const setViewport = useCallback(
      (node: HTMLDivElement | null) => {
        viewport.current = node;
        if (typeof ref === "function") ref(node);
        else if (ref) ref.current = node;
      },
      [ref],
    );

    const named = Boolean(props["aria-label"] || props["aria-labelledby"]);
    const stop = useOverflowStop(() => viewport.current, {
      tabIndex,
      named,
      warnKey: "scroll-area-unnamed",
      warnMessage: UNNAMED_SCROLLER_MESSAGE,
    });

    return (
      <RadixScrollArea
        ref={setViewport}
        size={resolvedSize}
        tabIndex={stop}
        role={role ?? (named ? "region" : undefined)}
        {...props}
      />
    );
  },
);
