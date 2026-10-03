// Copyright (c) Meta Platforms, Inc. and affiliates.
// Portions derived from facebook/astryx packages/core/src/TreeList/TreeList.tsx @ 88c95e4 (MIT, © Meta Platforms)
// Portions derived from facebook/astryx packages/core/src/TreeList/TreeListItem.tsx @ 88c95e4 (MIT, © Meta Platforms)

import {
  forwardRef,
  useCallback,
  useId,
  useMemo,
  useState,
  type CSSProperties,
  type MouseEvent,
  type ReactNode,
} from "react";
import { CaretRight } from "@phosphor-icons/react";
import { Item } from "./Item";
import { useTreeFocus, collectExpandedKeys, findInitialTabbableId } from "../../hooks/useTreeFocus";

/* =============================================================================
 * TreeList — the data-driven WAI-ARIA tree (System/TreeList, [[tree-list]] / D12)
 * -----------------------------------------------------------------------------
 * A `<ul role="tree">` of `<li role="treeitem">` rows. Each row COMPOSES the
 * shared _internal `Item` primitive ([[item-row-primitive]] / D13) `as="li" role="treeitem"` for its
 * anatomy (chevron marker · startContent · label(+description) · endContent) and
 * the no-nested-interactives guard; TreeList adds the full APG tree wiring —
 * `aria-level`/`-posinset`/`-setsize`/`-expanded`, roving `tabIndex` — and the
 * keyboard model via the lifted `useTreeFocus` hook.
 *
 * VISIBLE rows are rendered FLAT (every visible treeitem is a direct child of the
 * tree `<ul>`, depth carried by `aria-level` + a per-row indent) — collapsed
 * subtrees are simply not rendered, which is exactly the "visible items in DOM
 * order" list `useTreeFocus` queries, and keeps each row's focus ring / selection
 * tint scoped to its OWN row (no subtree bleed). axe-clean: a treeitem directly
 * under `role="tree"` satisfies the required-parent rule; `aria-level` conveys depth.
 *
 * TWO upgrades over Astryx (D12): (1) CONTROLLED expansion (`expanded` /
 * `onExpandedChange`; upstream is uncontrolled-only), and (2) `aria-selected="false"`
 * on unselected SELECTABLE rows (upstream emits it only when selected) — via the
 * additive `Item.ariaSelected` tri-state. Normalized from Astryx `TreeList`/
 * `TreeListItem`/`useTreeFocus` ([[catalog-as-specification]] @ 88c95e4): StyleX `*Vars` → `--ds-*` (a
 * `.radix-themes`-scoped block in tokens/components.css), `getIcon('chevronRight')`
 * → Phosphor `CaretRight`, the StyleX focus-ring `when.ancestor(:focus-visible)` →
 * an `:focus-visible` scoped selector, the `TreeListBranches` guide-lines DEFERRED
 * as pure decoration (indentation + `aria-level` carry the hierarchy). Zero
 * net-new tokens, no `!important`.
 * ============================================================================= */

export type TreeListDensity = "compact" | "balanced" | "spacious";

/** Recursive item configuration for TreeList. Structurally extends the hook's TreeNodeLike. */
export interface TreeListItemData {
  /** Unique id — React key + expansion / roving tracking. */
  id: string;
  /** Primary label. */
  label: ReactNode;
  /** Secondary description below the label. */
  description?: string;
  /** Content before the label (icon, avatar, checkbox). */
  startContent?: ReactNode;
  /** Content after the label (badge, action button). */
  endContent?: ReactNode;
  /** Nested children. When present (non-empty), the row renders an expand/collapse chevron. */
  children?: TreeListItemData[];
  /** Click handler — makes the row activate this callback (row-level, keyboard-forwarded). */
  onClick?: (e: MouseEvent) => void;
  /** URL — renders a real inner anchor so the row navigates (and Enter/Space activates it). */
  href?: string;
  /** Link target. Only with href. */
  target?: "_blank" | "_self";
  /** Disabled — skipped by the keyboard model, dimmed, kept in the a11y tree. */
  isDisabled?: boolean;
  /**
   * Selection. PRESENCE of this key marks the row SELECTABLE → it emits
   * `aria-selected="true" | "false"`. Omit it for a pure-navigation row (no
   * `aria-selected` at all). @see Item.ariaSelected
   */
  isSelected?: boolean;
  /** Whether the row is initially expanded (only meaningful with children). Uncontrolled seed. */
  isExpanded?: boolean;
}

export interface TreeListProps {
  /** Ref forwarded to the root element. */
  ref?: React.Ref<HTMLDivElement>;
  /** Tree items as a recursive data structure. */
  items: TreeListItemData[];
  /** Row spacing density. @default 'balanced' */
  density?: TreeListDensity;
  /** Header above the tree, associated via aria-labelledby. */
  header?: ReactNode;
  /**
   * CONTROLLED expansion — the exact set of expanded ids (D12; upstream is
   * uncontrolled-only). When provided, TreeList reads expansion from here and
   * reports every toggle through {@link onExpandedChange}; omit BOTH to run
   * uncontrolled (seeded from `isExpanded` in the data + internal toggles).
   */
  expanded?: string[];
  /** Called with the next expanded-id set whenever a row is toggled (controlled mode). */
  onExpandedChange?: (expandedIds: string[]) => void;
  className?: string;
  style?: CSSProperties;
  "data-testid"?: string;
}

// =============================================================================
// TreeListItem (internal — one <li role="treeitem"> row, composing Item)
// =============================================================================

interface TreeListItemInternalProps {
  item: TreeListItemData;
  hasChildren: boolean;
  isExpanded: boolean;
  nestedLevel: number;
  posInSet: number;
  setSize: number;
  density: TreeListDensity;
  onToggle: (id: string) => void;
  isTabbable: boolean;
}

function TreeListItem({
  item,
  hasChildren,
  isExpanded,
  nestedLevel,
  posInSet,
  setSize,
  density,
  onToggle,
  isTabbable,
}: TreeListItemInternalProps) {
  const { id, label, description, startContent, endContent, onClick, href, target } = item;
  const isDisabled = item.isDisabled === true;

  // Interaction shape (href wins if both are given).
  const isLinkRow = href != null;
  const isClickRow = onClick != null && !isLinkRow;
  const hasOwnAction = isLinkRow || isClickRow;

  // PRESENCE of isSelected in the data = the row participates in selection → emit the aria tri-state.
  const selectable = item.isSelected !== undefined;

  const handleChevron = useCallback(
    (e: MouseEvent) => {
      e.stopPropagation();
      onToggle(id);
    },
    [onToggle, id],
  );

  // What Item receives as onClick:
  //  · a real click row  → item.onClick (Item renders an inner <button>; Enter/Space forwards here)
  //  · a parent w/o own action → toggle expansion on a row click (Item plain span + root container handler)
  //  · otherwise → none.
  const itemOnClick = isClickRow
    ? onClick
    : !hasOwnAction && hasChildren
      ? (_e: MouseEvent) => onToggle(id)
      : undefined;
  // Give href/onClick rows a REAL inner control (tabbed out of at -1; the row owns the tab stop).
  const bodyTabIndex = hasOwnAction ? -1 : undefined;

  const chevron = hasChildren ? (
    <button
      type="button"
      className="rt-ds-tree-chevron"
      aria-label="Toggle children"
      aria-expanded={isExpanded}
      data-state={isExpanded ? "open" : "closed"}
      disabled={isDisabled}
      // The roving tab stop is the row; the chevron is not a separate stop. Row Enter/Space forwards here.
      tabIndex={-1}
      onClick={handleChevron}
    >
      <CaretRight weight="bold" aria-hidden />
    </button>
  ) : (
    // A chevron-width spacer so leaf labels align under their expandable siblings.
    <span className="rt-ds-tree-spacer" aria-hidden />
  );

  return (
    <Item
      as="li"
      role="treeitem"
      className="rt-ds-treeitem"
      marker={chevron}
      startContent={startContent}
      label={label}
      description={description}
      endContent={endContent}
      density={density}
      onClick={itemOnClick}
      href={isLinkRow ? href : undefined}
      target={target}
      bodyTabIndex={bodyTabIndex}
      isSelected={item.isSelected === true}
      isDisabled={isDisabled}
      ariaSelected={selectable ? item.isSelected === true : undefined}
      tabIndex={isDisabled ? -1 : isTabbable ? 0 : -1}
      // Name the treeitem from its LABEL — otherwise name-from-content folds in the chevron button's
      // "Toggle children" text (a parent would announce "Toggle children src"). aria-label = the exact
      // visible string, so WCAG 2.5.3 (Label in Name) holds. ReactNode labels keep name-from-content.
      aria-label={typeof label === "string" ? label : undefined}
      aria-level={nestedLevel + 1}
      aria-posinset={posInSet}
      aria-setsize={setSize}
      aria-expanded={hasChildren ? isExpanded : undefined}
      data-tree-id={id}
      data-tree-level={nestedLevel + 1}
      data-tree-disabled={isDisabled || undefined}
      // Per-row indent (absolute, not cumulative — every row is a flat sibling of the tree <ul>).
      style={{ ["--ds-tree-depth" as string]: nestedLevel } as CSSProperties}
    />
  );
}

// =============================================================================
// TreeList
// =============================================================================

export const TreeList = forwardRef<HTMLDivElement, TreeListProps>(function TreeList(
  { items, density = "balanced", header, expanded, onExpandedChange, className, style, "data-testid": testId },
  ref,
) {
  const headerId = useId();

  // Expanded ids seeded from the data (recomputed when items change).
  const expandedFromProps = useMemo(() => new Set(collectExpandedKeys(items)), [items]);
  // Uncontrolled overrides: only ids the user has explicitly toggled.
  const [override, setOverride] = useState<Map<string, boolean>>(() => new Map());
  // Controlled source of truth (D12) — non-null iff the `expanded` prop is provided.
  const controlledSet = useMemo(() => (expanded != null ? new Set(expanded) : null), [expanded]);

  const isExpandedId = useCallback(
    (nodeId: string): boolean => {
      if (controlledSet != null) return controlledSet.has(nodeId);
      return override.has(nodeId) ? override.get(nodeId) === true : expandedFromProps.has(nodeId);
    },
    [controlledSet, override, expandedFromProps],
  );

  const handleToggle = useCallback(
    (nodeId: string) => {
      if (controlledSet != null) {
        const next = new Set(controlledSet);
        if (next.has(nodeId)) next.delete(nodeId);
        else next.add(nodeId);
        onExpandedChange?.(Array.from(next));
        return;
      }
      setOverride((prev) => {
        const next = new Map(prev);
        const current = prev.has(nodeId) ? prev.get(nodeId) === true : expandedFromProps.has(nodeId);
        next.set(nodeId, !current);
        return next;
      });
    },
    [controlledSet, onExpandedChange, expandedFromProps],
  );

  // Roving-tabindex seed — the hook owns the stop after mount (preserving this seeded tabindex=0).
  const initialTabbableId = useMemo(() => findInitialTabbableId(items), [items]);

  // Enter/Space activation: click the row's OWN inner action (link/button), scoped to this treeitem so
  // focus never leaks into a descendant row's control. Returns true when handled (the hook then does
  // NOT also toggle); false lets the hook fall back to an expansion toggle for a parent.
  const activateItem = useCallback((current: HTMLElement): boolean => {
    const candidates = current.querySelectorAll<HTMLElement>(
      'a[href], button:not([aria-label="Toggle children"])',
    );
    for (const candidate of candidates) {
      if (candidate.closest('[role="treeitem"]') === current) {
        candidate.click();
        return true;
      }
    }
    return false;
  }, []);

  const { treeRef, handleKeyDown, handleFocus } = useTreeFocus<HTMLUListElement>({
    onToggleExpand: handleToggle,
    onActivate: activateItem,
    hasRovingTabIndex: true,
  });

  // Flatten the VISIBLE tree into DOM order: a node, immediately followed by its children when expanded.
  const renderItems = (list: TreeListItemData[], nestedLevel: number): ReactNode[] => {
    const out: ReactNode[] = [];
    list.forEach((item, index) => {
      const hasChildren = item.children != null && item.children.length > 0;
      const isExpanded = hasChildren && isExpandedId(item.id);
      out.push(
        <TreeListItem
          key={item.id}
          item={item}
          hasChildren={hasChildren}
          isExpanded={isExpanded}
          nestedLevel={nestedLevel}
          posInSet={index + 1}
          setSize={list.length}
          density={density}
          onToggle={handleToggle}
          isTabbable={item.id === initialTabbableId}
        />,
      );
      if (isExpanded && item.children != null) {
        out.push(...renderItems(item.children, nestedLevel + 1));
      }
    });
    return out;
  };

  return (
    <div
      ref={ref}
      data-testid={testId}
      className={["rt-ds-tree", className].filter(Boolean).join(" ")}
      style={style}
    >
      {header != null && (
        <div id={headerId} className="rt-ds-tree-header">
          {header}
        </div>
      )}
      <ul
        ref={treeRef}
        role="tree"
        aria-labelledby={header != null ? headerId : undefined}
        className="rt-ds-tree-list"
        onKeyDown={handleKeyDown}
        onFocus={handleFocus}
      >
        {renderItems(items, 0)}
      </ul>
    </div>
  );
});
