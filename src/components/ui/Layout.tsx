// Copyright (c) Meta Platforms, Inc. and affiliates.
// Portions derived from facebook/astryx packages/core/src/Layout/Layout.tsx @ d7c9a39b (MIT, © Meta Platforms)
//
// The page-shell slot-context architecture (Area / Slots / Divider
// contexts, divider resolution between adjacent areas, slot-aware padding), LIFTED under the port
// doctrine (DECISIONS [[catalog-as-specification]]). D8 fixes carried here (upstream warts NOT reproduced):
//   1. `Layout` silently DROPS `...rest` + `data-testid` — ours FORWARDS them on the root (D12).
//   2. `contentWidth` / `padding` / `defaultHasDividers` are real API upstream's docs HIDE — ours
//      documents them (their "flex wrapping" description is fiction: this is a structured slot grid).
//   3. Landmark roles stay OPT-IN on the slots (never auto-emitted — a nested Layout must not stamp
//      two banners/contentinfos); `main` is owned by AppShell, not emitted here.
//   4. Upstream registered each slot via a mount effect (client-only, races SSR divider placement).
//      Ours resolves the layout SYNCHRONOUSLY from a children scan — SSR-complete, no effect, no
//      hydration flash; slots self-identify via a static slot marker and share one LayoutContext.

import {
  createContext,
  useContext,
  useMemo,
  type CSSProperties,
  type ComponentPropsWithoutRef,
  type ReactElement,
  type ReactNode,
  type Ref,
} from "react";
import { Children, isValidElement } from "react";
import { Separator } from "./Separator";
import { ResizeHandle } from "./ResizeHandle";
import { useResizable, type UseResizableOptions } from "../../hooks/useResizable";

/* -------------------------------------------------------------------------- */
/* Shared config + slot marker                                                */
/* -------------------------------------------------------------------------- */

/** Padding scale for slot-aware inner spacing — a capped Radix-like step ("4" = 16px, the default). */
export type LayoutPadding = "0" | "1" | "2" | "3" | "4" | "5" | "6";

type SlotKind = "header" | "footer" | "panel" | "content";

/** A slot component carries a static marker so the Layout can classify children without a mount-time
 *  registration effect (the SSR-safe replacement for upstream's per-instance context registration). */
type SlotMarker = { __dsLayoutSlot?: SlotKind };

/** Attach the static slot marker (+ a displayName) to a slot component, returning it unchanged. */
function markSlot<T extends (...args: never[]) => ReactElement | null>(fn: T, kind: SlotKind, name: string): T {
  (fn as unknown as SlotMarker).__dsLayoutSlot = kind;
  (fn as unknown as { displayName?: string }).displayName = name;
  return fn;
}

/** The shared slot context — the resolved layout config every slot can read. Today `contentWidth` is
 *  the only value a slot needs at render (LayoutContent constrains its measure with it); `padding` and
 *  `defaultHasDividers` are resolved by the Layout root itself, and travel here so the context is the
 *  single source of truth for the whole slot family. */
interface LayoutContextValue {
  contentWidth?: number | string;
  padding: LayoutPadding;
  defaultHasDividers: boolean;
}
const LayoutContext = createContext<LayoutContextValue | null>(null);

function slotKindOf(child: ReactNode): SlotKind | undefined {
  if (!isValidElement(child)) return undefined;
  return (child.type as unknown as SlotMarker)?.__dsLayoutSlot;
}

/* -------------------------------------------------------------------------- */
/* Slot components                                                            */
/* -------------------------------------------------------------------------- */

/** Common props every slot forwards honestly (D12 — never accept-and-discard). */
interface SlotBaseProps extends Omit<ComponentPropsWithoutRef<"div">, "children"> {
  children?: ReactNode;
  /** Ref forwarded to the slot's root element. */
  ref?: Ref<HTMLDivElement>;
  /**
   * Override `defaultHasDividers` for the rule between this slot and its neighbouring area — header:
   * the rule below it; footer: the rule above it; panel: the rule after it (toward content / the next
   * panel). Omit to inherit the Layout's `defaultHasDividers`.
   */
  hasDivider?: boolean;
  /**
   * Expose this slot's ARIA landmark role — OPT-IN, off by default. Header ⇒ `banner`, footer ⇒
   * `contentinfo`, panel ⇒ `complementary`. Never auto-emitted: a Layout can be nested and multiple
   * `banner`/`contentinfo`/`complementary` landmarks are invalid, so the author opts in exactly once.
   * `main` is intentionally not offered here — AppShell owns the single `main` landmark.
   */
  landmark?: boolean;
  /** Test id, forwarded to the slot root. */
  "data-testid"?: string;
}

/** Render a plain-container slot: a generic `<div>` by default (no implicit landmark), plus its
 *  optional opt-in role. `hasDivider` is consumed by the Layout parent, not rendered, so it's stripped. */
function makeSlotElement(
  area: SlotKind,
  landmarkRole: string | undefined,
  { children, landmark, hasDivider: _hasDivider, className, role, ...rest }: SlotBaseProps,
) {
  return (
    <div
      {...rest}
      // An explicit author role wins; otherwise the opt-in landmark supplies one (never auto-emitted).
      role={role ?? (landmark ? landmarkRole : undefined)}
      data-ds-layout-area={area}
      className={className ? `rt-ds-layout-area ${className}` : "rt-ds-layout-area"}
    >
      {children}
    </div>
  );
}

export type LayoutHeaderProps = SlotBaseProps;
/** The top chrome bar (title, global actions). `landmark` ⇒ `role="banner"`. */
export const LayoutHeader = markSlot(
  (props: LayoutHeaderProps) => makeSlotElement("header", "banner", props),
  "header",
  "LayoutHeader",
);

export type LayoutFooterProps = SlotBaseProps;
/** The bottom chrome bar (status, meta, secondary actions). `landmark` ⇒ `role="contentinfo"`. */
export const LayoutFooter = markSlot(
  (props: LayoutFooterProps) => makeSlotElement("footer", "contentinfo", props),
  "footer",
  "LayoutFooter",
);

export type LayoutContentProps = SlotBaseProps;
/** The primary reading area — fills the remaining measure. Constrained + centred by the Layout's
 *  `contentWidth` when set. This slot is NOT a landmark here (`main` is AppShell's; `landmark` is
 *  a no-op on Content and omitted from its role map).
 *
 *  **Floor the measure with `--ds-layout-content-min`.** The panel is `flex: 0 0 auto` (a rail that
 *  narrows with the window stops being a rail), so content is the only flexible region — with no
 *  floor it absorbs every pixel a shrinking viewport takes and crushes *silently*: no scrollbar
 *  appears, text wraps to one character per line, and below the panel's own width there is nothing
 *  left at all. The floor is opt-in and defaults to `0`, so no existing shell changes:
 *
 *  ```tsx
 *  <Layout style={{ "--ds-layout-content-min": "320px" } as CSSProperties}>…</Layout>
 *  ```
 *
 *  Any shell that renders standalone should set it. A responsive shell that swaps the panel for a
 *  drawer at narrow widths (AppShell's job, not Layout's) is the better answer wherever it applies. */
export const LayoutContent = markSlot(function LayoutContent({
  children,
  landmark: _landmark,
  hasDivider: _hasDivider,
  className,
  role,
  ...rest
}: LayoutContentProps) {
  const ctx = useContext(LayoutContext);
  const inner: CSSProperties | undefined =
    ctx?.contentWidth != null
      ? { maxWidth: ctx.contentWidth, marginInline: "auto", width: "100%" }
      : undefined;
  return (
    <div
      {...rest}
      role={role}
      data-ds-layout-area="content"
      className={className ? `rt-ds-layout-area ${className}` : "rt-ds-layout-area"}
    >
      {inner ? (
        <div className="rt-ds-layout-content-inner" style={inner}>
          {children}
        </div>
      ) : (
        children
      )}
    </div>
  );
}, "content", "LayoutContent");

/* ---- Panel (with the optional resizable mode) ----------------------------- */

export interface LayoutPanelProps extends SlotBaseProps {
  /**
   * Make the panel user-resizable. `true` uses sensible defaults; an options object forwards to the
   * shared `useResizable` engine (WAI window-splitter contract). The panel renders a `ResizeHandle`
   * on its content-facing edge and follows the engine's live size — SSR-safe (the engine keeps every
   * browser API inside effects). When resizable, the Layout does NOT also draw a divider here: the
   * handle IS the seam.
   */
  resizable?: boolean | LayoutResizableOptions;
  /**
   * Which edge the panel is docked to. `"start"` (default) docks it to the inline-start; the handle
   * sits on its trailing edge. `"end"` docks it inline-end with the handle on its leading edge.
   */
  side?: "start" | "end";
}

/** The subset of the resize engine's options a resizable panel exposes (orientation is fixed vertical —
 *  a page panel resizes width). All optional — sensible defaults fill any gap. */
export type LayoutResizableOptions = Partial<Omit<UseResizableOptions, "orientation" | "side">>;

const RESIZABLE_DEFAULTS = { defaultSize: 280, minSizePx: 200, maxSizePx: 480 };

/** A resizable panel — owns its `useResizable` call (never in a `.map()`, per D5 fix #3) and renders the
 *  `ResizeHandle` on its content-facing edge. Split out so the hook is unconditional (rules-of-hooks). */
function ResizablePanel({
  resizable,
  side = "start",
  children,
  landmark,
  hasDivider: _hasDivider,
  className,
  style,
  role,
  ...rest
}: LayoutPanelProps) {
  const opts: LayoutResizableOptions = typeof resizable === "object" ? resizable : {};
  const rz = useResizable({
    ...RESIZABLE_DEFAULTS,
    ...opts,
    orientation: "vertical",
    side,
    "aria-label": opts["aria-label"] ?? "Resize panel",
  });
  const width = rz.isCollapsed ? 0 : rz.size;
  const panel = (
    <div
      {...rest}
      role={role ?? (landmark ? "complementary" : undefined)}
      data-ds-layout-area="panel"
      data-resizable=""
      // A collapsed panel is 0px wide with clipped content — its descendants must also leave the tab order
      // and the a11y tree, else keyboard focus lands in invisible content. `inert` (React 19) removes them
      // from focus + pointer + AT; aria-hidden covers the panel's own landmark exposure.
      inert={rz.isCollapsed || undefined}
      aria-hidden={rz.isCollapsed || undefined}
      className={className ? `rt-ds-layout-area ${className}` : "rt-ds-layout-area"}
      style={{ ...style, width, flexShrink: 0, overflow: "hidden" }}
    >
      {children}
    </div>
  );
  const handle = (
    <ResizeHandle
      key="handle"
      separatorProps={rz.separatorProps}
      onDragStart={rz.onDragStart}
      aria-label={opts["aria-label"] ?? "Resize panel"}
    />
  );
  // The handle sits on the content-facing edge: trailing for a start-docked panel, leading for end.
  return side === "end" ? (
    <>
      {handle}
      {panel}
    </>
  ) : (
    <>
      {panel}
      {handle}
    </>
  );
}

/** A side panel / rail — a sidebar, inspector, or aside beside the content. `landmark` ⇒
 *  `role="complementary"`. Pass `resizable` to make it user-resizable on the shared engine. */
export const LayoutPanel = markSlot(function LayoutPanel(props: LayoutPanelProps) {
  if (props.resizable) return <ResizablePanel {...props} />;
  // Strip the panel-only props so they never leak onto the DOM (`resizable`/`side` aren't DOM attrs).
  const { resizable: _resizable, side: _side, ...slotProps } = props;
  return makeSlotElement("panel", "complementary", slotProps);
}, "panel", "LayoutPanel");

/* -------------------------------------------------------------------------- */
/* Layout root                                                                */
/* -------------------------------------------------------------------------- */

export interface LayoutProps extends Omit<ComponentPropsWithoutRef<"div">, "children"> {
  /** Slot children — `Layout.Header`, `Layout.Panel`, `Layout.Content`, `Layout.Footer` in any order. */
  children: ReactNode;
  /** Ref forwarded to the root `<div>`. */
  ref?: Ref<HTMLDivElement>;
  /**
   * Cap + centre the content measure (`Layout.Content`). A number is px; a string is any CSS length
   * (e.g. `"72ch"`). Omit for a full-bleed content area. (Real API — upstream ships it undocumented.)
   */
  contentWidth?: number | string;
  /**
   * Slot-aware inner padding, on the `--ds-space` scale (`"4"` = 16px, default). Applied per slot:
   * header/footer get inline + block padding, content + panel get full padding. (Real API — upstream
   * ships it undocumented.)
   */
  padding?: LayoutPadding;
  /**
   * Draw a hairline rule between adjacent areas (header↔body, body↔footer, panel↔content). Each slot
   * can override its own boundary via `hasDivider`. (Real API — upstream ships it undocumented.)
   */
  defaultHasDividers?: boolean;
  /** Test id, forwarded to the root. */
  "data-testid"?: string;
}

/** Resolve a boundary's divider: the controlling slot's `hasDivider` wins, else the Layout default. */
const dividerBetween = (controller: ReactNode, dflt: boolean): boolean => {
  const override = isValidElement<SlotBaseProps>(controller) ? controller.props.hasDivider : undefined;
  return override ?? dflt;
};

const HDivider = () => (
  <Separator
    decorative
    size="4"
    orientation="horizontal"
    className="rt-ds-layout-divider"
    data-ds-layout-divider="horizontal"
  />
);
const VDivider = () => (
  <Separator
    decorative
    size="4"
    orientation="vertical"
    className="rt-ds-layout-divider"
    data-ds-layout-divider="vertical"
  />
);

/**
 * Layout — the page-shell composition primitive. A structured slot grid: an optional header on top, an
 * optional footer on the bottom, and a middle row of panel(s) + content. Compose it from the slot
 * children (in any order — the Layout arranges them):
 *
 * ```tsx
 * <Layout defaultHasDividers contentWidth={880} data-testid="app">
 *   <Layout.Header landmark>…</Layout.Header>
 *   <Layout.Panel resizable landmark>…</Layout.Panel>
 *   <Layout.Content>…</Layout.Content>
 *   <Layout.Footer>…</Layout.Footer>
 * </Layout>
 * ```
 *
 * Not a flex-wrapping box (upstream's docs mislead) — a deterministic header / [panel · content] /
 * footer shell with resolved dividers and slot-aware padding.
 */
export function Layout({
  children,
  contentWidth,
  padding = "4",
  defaultHasDividers = false,
  className,
  "data-testid": testId,
  ...rest
}: LayoutProps) {
  // Classify the direct children into slots. Header/footer are pulled to the ends; everything else
  // (panels, content, and any incidental children) keeps author order in the middle body row.
  let header: ReactNode = null;
  let footer: ReactNode = null;
  const body: ReactNode[] = [];
  for (const child of Children.toArray(children)) {
    const kind = slotKindOf(child);
    if (kind === "header") header = child;
    else if (kind === "footer") footer = child;
    else body.push(child);
  }

  const hasBody = body.length > 0;

  // Body row: interleave the panel/content areas with the resolved vertical rules.
  //
  // A resizable panel renders its OWN `ResizeHandle` as the seam, and that handle paints the same
  // `--ds-stroke-weak` hairline a divider does. So exactly one of them may draw at any boundary.
  //
  // The first version of this only looked FORWARD — it suppressed the divider that would follow a
  // resizable panel — which is right for a start-docked panel and wrong for an end-docked one. An
  // end-docked panel puts its handle on its LEADING edge (see the `side === "end"` branch above),
  // so the doubled rule was emitted by the PREVIOUS sibling and nothing suppressed it. The result
  // was two hairlines a pixel apart on every layout with a right-hand resizable panel. Found by
  // eye on three showcase recreations at once, then measured.
  //
  // So ownership is resolved from BOTH sides of each boundary: a start-docked resizable panel owns
  // the boundary after it, an end-docked one owns the boundary before it.
  const ownsItsTrailingEdge = (c: ReactNode): boolean =>
    slotKindOf(c) === "panel" &&
    isValidElement<LayoutPanelProps>(c) &&
    Boolean(c.props.resizable) &&
    (c.props.side ?? "start") !== "end";
  const ownsItsLeadingEdge = (c: ReactNode): boolean =>
    slotKindOf(c) === "panel" &&
    isValidElement<LayoutPanelProps>(c) &&
    Boolean(c.props.resizable) &&
    (c.props.side ?? "start") === "end";

  const bodyRow: ReactNode[] = [];
  body.forEach((child, i) => {
    bodyRow.push(child);
    if (i === body.length - 1) return;
    const seamOwnedByHandle = ownsItsTrailingEdge(child) || ownsItsLeadingEdge(body[i + 1]);
    if (!seamOwnedByHandle && dividerBetween(child, defaultHasDividers)) {
      bodyRow.push(<VDivider key={`vd-${i}`} />);
    }
  });

  // Vertical stack: header · [horizontal rule] · body · [horizontal rule] · footer. The header controls
  // its own trailing rule; the footer controls its own leading rule.
  const stack: ReactNode[] = [];
  if (header) {
    stack.push(header);
    if ((hasBody || footer) && dividerBetween(header, defaultHasDividers)) {
      stack.push(<HDivider key="hd-header" />);
    }
  }
  if (hasBody) {
    stack.push(
      <div key="body" className="rt-ds-layout-body" data-ds-layout-body="">
        {bodyRow}
      </div>,
    );
  }
  if (footer) {
    if ((hasBody || header) && dividerBetween(footer, defaultHasDividers)) {
      stack.push(<HDivider key="hd-footer" />);
    }
    stack.push(footer);
  }

  const ctx = useMemo<LayoutContextValue>(
    () => ({ contentWidth, padding, defaultHasDividers }),
    [contentWidth, padding, defaultHasDividers],
  );

  return (
    <LayoutContext.Provider value={ctx}>
      <div
        {...rest}
        data-testid={testId}
        data-ds-layout=""
        data-padding={padding}
        className={className ? `rt-ds-layout ${className}` : "rt-ds-layout"}
      >
        {stack}
      </div>
    </LayoutContext.Provider>
  );
}
Layout.displayName = "Layout";

// Namespace access (`Layout.Header` …) alongside the named exports — use either.
Layout.Header = LayoutHeader;
Layout.Footer = LayoutFooter;
Layout.Panel = LayoutPanel;
Layout.Content = LayoutContent;
