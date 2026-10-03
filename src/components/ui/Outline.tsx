import { useEffect, useMemo, useRef, useState, type CSSProperties, type RefObject } from "react";
import { useScrollSpy } from "../../hooks/useScrollSpy";
import { useOutlineFromDOM, type OutlineItem } from "../../hooks/useOutlineFromDOM";
import { truncationStyle } from "../../utils/truncation";
import { useLinkComponent } from "./Link";
import { useResolvedSize } from "../../theme/SizeContext";

/* Outline (D6) — a scroll-spy table of contents: a labelled `<nav>` wrapping a `<ul>` of in-page
 * links, one per heading, with a JS-measured indicator bar that slides to the active entry.
 *
 * Two sources for the entries:
 *   1. EXPLICIT — pass `items={[{ id, text, level }]}` (you own the list).
 *   2. DOM-DRIVEN — pass `containerRef` and the list is built from the container's headings via
 *      useOutlineFromDOM (h1–h6 / [data-outline-heading], re-scanned on a MutationObserver). Each
 *      heading missing an id is given a slug so the anchor links resolve.
 *
 * The active entry is driven by useScrollSpy (a passive scroll listener + rAF — the active id is the
 * LAST heading whose top has passed its activation line, with the atBottom / top-edge guards). Clicking
 * an entry pins it active until the smooth-scroll settles (lockActiveId), so the spy doesn't fight the
 * animation. Passing a controlled `activeId` (including null) DISABLES the spy and you own the state.
 *
 * The active entry carries `aria-current="location"` — the ARIA value for the current location within a
 * set (an upgrade over the nonstandard `"true"`).
 *
 * The sliding indicator is JS-measured: an effect reads the active link's box relative to the track and
 * positions an absolute bar (transform + height). CSS anchor positioning is a named deferral. Under
 * prefers-reduced-motion the bar snaps — the transition rides the --ds-duration-* tokens, which the
 * motion layer clamps to ~0ms (with a belt-and-braces `transition: none` in the override CSS).
 *
 * Flat list: `level` drives indentation only (no nested <ul>). Paints from --ds-* (tokens/components.css);
 * scoped .radix-themes; no !important; zero net-new tokens (D14). SSR-safe: the scan + the measurement
 * both run in effects, so the server renders the list markup with the indicator hidden and the client
 * positions it after mount. Links route through useLinkComponent — inside a <LinkProvider component={…}>
 * every entry uses the app's framework link; with no provider they are plain in-page `#anchor`s. */

export type { OutlineItem };

export interface OutlineProps {
  /**
   * Explicit TOC entries, in document order. Mutually exclusive with `containerRef` (if both are
   * given, `items` wins). Each `level` (1–6) drives indentation only.
   */
  items?: OutlineItem[];
  /**
   * DOM-driven mode: a ref to the content container. The outline is built from the container's headings
   * (and re-scanned as they change). Ignored when `items` is provided.
   */
  containerRef?: RefObject<HTMLElement | null>;
  /**
   * Controlled active id. When provided (including `null`), the internal scroll-spy is DISABLED and this
   * value is used verbatim — you own the active state.
   */
  activeId?: string | null;
  /** Accessible name for the `<nav>` landmark (distinct per page — several nav landmarks need names). @default 'On this page' */
  label?: string;
  /**
   * Max lines before an entry truncates. `1` ellipsises, `n > 1` line-clamps.
   *
   * Defaults to **1**, because an outline entry is a NAV ROW and §8b rules that a nav row truncates
   * while prose reflows. An entry that wraps sets its own min-content width from its longest
   * unbreakable symbol name, so a single long entry widens the whole rail — which is the defect
   * this default closes ([[per-component-line-budget]]). Raise it where entries are genuinely long headings and the rail is
   * wide enough to carry them.
   *
   * Same vocabulary as `Item`'s `labelLines`, and the same implementation
   * (`src/utils/truncation.ts`), so `1` means the same thing in both.
   * @default 1
   */
  labelLines?: number;
  /** The scroll container the spy observes. Defaults to the document / window scroll. */
  getContainer?: () => HTMLElement | null;
  /** Test id, forwarded to the root `<nav>`. */
  "data-testid"?: string;
}

/**
 * A scroll-spy table of contents. Give it `items` or a `containerRef`; it highlights the section you're
 * reading and slides an indicator bar to it.
 *
 * @example
 * ```tsx
 * // Explicit entries
 * <Outline items={[{ id: "intro", text: "Introduction", level: 2 }]} />
 *
 * // DOM-driven — built from the article's headings
 * const articleRef = useRef<HTMLElement>(null);
 * <article ref={articleRef}>…</article>
 * <Outline containerRef={articleRef} />
 * ```
 */
export function Outline({
  items,
  containerRef,
  activeId: controlledActiveId,
  label = "On this page",
  labelLines = 1,
  getContainer,
  "data-testid": testId,
}: OutlineProps) {
  const LinkComp = useLinkComponent();
  // The TOC rides the global text lane like the rest of the nav family (Breadcrumbs' shape) —
  // ambient only, no per-instance size prop.
  const size = useResolvedSize("text", undefined);

  // DOM-driven source. Called unconditionally (hooks rule); when `items` is supplied it reads a null
  // fallback ref and returns [], so the scan does no work and `items` wins.
  const fallbackRef = useRef<HTMLElement>(null);
  const domItems = useOutlineFromDOM(items ? fallbackRef : (containerRef ?? fallbackRef));
  const resolvedItems = items ?? domItems;

  const ids = useMemo(() => resolvedItems.map((i) => i.id), [resolvedItems]);
  const minLevel = useMemo(
    () => (resolvedItems.length ? Math.min(...resolvedItems.map((i) => i.level)) : 1),
    [resolvedItems],
  );

  // Pass-through: `controlledActiveId === undefined` ⇒ the spy runs; a string/null ⇒ the spy is off.
  const { activeId, lockActiveId } = useScrollSpy({ ids, activeId: controlledActiveId, getContainer });

  const trackRef = useRef<HTMLDivElement>(null);
  const [indicator, setIndicator] = useState<{ top: number; height: number; visible: boolean }>({
    top: 0,
    height: 0,
    visible: false,
  });
  // Suppress the slide transition on the first positioning (so the bar appears in place, never sweeps
  // in from the top). Flipped on after the first paint.
  const [ready, setReady] = useState(false);

  // Measure the active entry's box relative to the track and position the bar. Runs in an effect (never
  // during render) → SSR-safe. Re-runs on active change, on the item set changing, and on resize.
  useEffect(() => {
    const measure = () => {
      const track = trackRef.current;
      if (!track) return;
      const link = track.querySelector<HTMLElement>('[aria-current="location"]');
      if (!link) {
        setIndicator((prev) => (prev.visible ? { ...prev, visible: false } : prev));
        return;
      }
      const linkRect = link.getBoundingClientRect();
      const trackRect = track.getBoundingClientRect();
      const top = linkRect.top - trackRect.top;
      const height = linkRect.height;
      setIndicator((prev) =>
        prev.visible && prev.top === top && prev.height === height ? prev : { top, height, visible: true },
      );
    };
    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, [activeId, ids]);

  useEffect(() => {
    const frame = requestAnimationFrame(() => setReady(true));
    return () => cancelAnimationFrame(frame);
  }, []);

  const indicatorStyle: CSSProperties = {
    transform: `translateY(${indicator.top}px)`,
    height: indicator.height,
  };

  return (
    <nav aria-label={label} data-testid={testId} className="rt-ds-outline" data-size={size}>
      <div ref={trackRef} className="rt-ds-outline-track">
        <span
          aria-hidden="true"
          className="rt-ds-outline-indicator"
          data-visible={indicator.visible ? "" : undefined}
          data-ready={ready ? "" : undefined}
          style={indicatorStyle}
        />
        <ul className="rt-ds-outline-list">
          {resolvedItems.map((item) => {
            const isActive = item.id === activeId;
            return (
              <li
                key={item.id}
                className="rt-ds-outline-item"
                style={{ "--ds-outline-depth": item.level - minLevel } as CSSProperties}
              >
                <LinkComp
                  href={`#${item.id}`}
                  className="rt-ds-outline-link"
                  aria-current={isActive ? "location" : undefined}
                  onClick={() => lockActiveId(item.id)}
                  // `item.text` is always a string on this component, so the shared helper's
                  // string default (one line) is the right one and `labelLines` overrides it.
                  style={truncationStyle(labelLines, true)}
                  title={item.text}
                >
                  {item.text}
                </LinkComp>
              </li>
            );
          })}
        </ul>
      </div>
    </nav>
  );
}
Outline.displayName = "Outline";
