// The Lightbox pan keypad and its keys. Internal to Lightbox, which is its only caller.
import { useEffect, useState } from "react";
import { ArrowDown, ArrowLeft, ArrowRight, ArrowUp } from "@phosphor-icons/react";
import { IconButton } from "./IconButton";
import { Kbd } from "./Kbd";

/* PAN WITHOUT A DRAG (WCAG 2.5.7 and 2.1.1, [[dragging-movement-gaps]]). While an image is zoomed, a keypad in
 * the bottom-left corner pans it one step per press, and W, A, S and D do the same from the keyboard. The arrow
 * keys keep paging the gallery. The keys match by physical position (`KeyboardEvent.code`), so the same four
 * keys pan on any layout, and each keycap shows the user's own letter where the browser reports the layout.
 * A key at the edge it moves toward is disabled. The letters work only while focus is inside the open viewer,
 * which is the "active only on focus" exception of WCAG 2.1.4. */

export type PanDirection = "up" | "left" | "down" | "right";

// Keyboard order, so the tab order reads the way the keys sit: W, then A S D.
export const PAN_KEYS = [
  { dir: "up", code: "KeyW", label: "Pan up", Icon: ArrowUp },
  { dir: "left", code: "KeyA", label: "Pan left", Icon: ArrowLeft },
  { dir: "down", code: "KeyS", label: "Pan down", Icon: ArrowDown },
  { dir: "right", code: "KeyD", label: "Pan right", Icon: ArrowRight },
] as const;

const DEFAULT_LETTERS: Record<PanDirection, string> = { up: "W", left: "A", down: "S", right: "D" };

// Each press moves a quarter of the distance from the centre to an edge, so four presses reach any edge.
export const PAN_STEPS_TO_EDGE = 4;

// The Keyboard Map API (Chromium) reports the character each physical key types on the user's layout.
type LayoutMapNavigator = Navigator & { keyboard?: { getLayoutMap?: () => Promise<Map<string, string>> } };

export function useLayoutLetters(active: boolean) {
  const [letters, setLetters] = useState(DEFAULT_LETTERS);
  useEffect(() => {
    if (!active || typeof navigator === "undefined") return;
    let live = true;
    (navigator as LayoutMapNavigator).keyboard
      ?.getLayoutMap?.()
      .then((map) => {
        if (!live) return;
        const read = (code: string, fallback: string) => map.get(code)?.toUpperCase() || fallback;
        setLetters({ up: read("KeyW", "W"), left: read("KeyA", "A"), down: read("KeyS", "S"), right: read("KeyD", "D") });
      })
      .catch(() => {
        // A browser can refuse the layout (for example inside a cross-origin frame). The default letters stay.
      });
    return () => {
      live = false;
    };
  }, [active]);
  return letters;
}

export interface LightboxPanPadProps {
  /** The letter each key shows, from the user's keyboard layout. */
  letters: Record<PanDirection, string>;
  /** A key whose edge the image already reaches is disabled. */
  atEdge: Record<PanDirection, boolean>;
  onPan: (dir: PanDirection) => void;
}

/** The pan keypad: four keycaps in the inverted-T of a keyboard, each naming its action and its letter. */
export function LightboxPanPad({ letters, atEdge, onPan }: LightboxPanPadProps) {
  return (
    <div className="rt-ds-lightbox-pan" role="group" aria-label="Pan the image">
      {PAN_KEYS.map(({ dir, label, Icon }) => (
        <IconButton
          key={dir}
          size="3"
          priority="tertiary"
          aria-label={label}
          aria-keyshortcuts={letters[dir]}
          className="rt-ds-lightbox-control rt-ds-lightbox-key"
          data-dir={dir}
          // aria-disabled, not disabled: a key that reaches its edge while focused keeps focus. A disabled button
          // loses it, and focus would drop to <body>. data-disabled carries the system's disabled paint.
          aria-disabled={atEdge[dir] || undefined}
          data-disabled={atEdge[dir] ? "" : undefined}
          onClick={() => {
            if (!atEdge[dir]) onPan(dir);
          }}
        >
          <Icon weight="bold" aria-hidden />
          <Kbd size="1" aria-hidden>
            {letters[dir]}
          </Kbd>
        </IconButton>
      ))}
    </div>
  );
}
