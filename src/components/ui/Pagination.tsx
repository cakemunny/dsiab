// Copyright (c) Meta Platforms, Inc. and affiliates.
// Portions derived from facebook/astryx packages/core/src/Pagination/Pagination.tsx @ 88c95e4 (MIT, © Meta Platforms)

import { type ReactNode } from "react";
import { CaretLeft, CaretRight } from "@phosphor-icons/react";
import { Button } from "./Button";
import { IconButton } from "./IconButton";
import { Select } from "./Select";
import { useAnnounce } from "./useAnnounce";
import { useListFocus } from "../../hooks/useListFocus";
import { generatePageRange, coercePageSize } from "../../utils/generatePageRange";
import { useResolvedSize } from "../../theme/SizeContext";

/* Pagination ([[pagination-control]] · D22) — standalone page navigation on our substrate. A <nav aria-label> holding a
 * prev IconButton, a variant-driven indicator, and a next IconButton; an optional page-size Select.
 *
 * REUSE (Rule 11): prev/next = our IconButton (ghost); page buttons = our Button (ghost); the page-size
 * picker = our compound Select (Select.Item per option); the polite "Page N of M" announce rides the
 * shared useAnnounce live region. The dots' 1D roving keyboard uses the thin useListFocus hook (the
 * dots-focus DECISION — see useListFocus.ts + [[pagination-control]]). The pure page-range math + the pageSize coercion
 * guard are the LIFTED generatePageRange/coercePageSize (Astryx [[catalog-as-specification]] @ 88c95e4).
 *
 * NORMALIZED from Astryx ([[catalog-as-specification]]): StyleX *Vars → --ds-* (tokens/components.css); themeProps/mergeProps/
 * stylex.props dropped; Astryx Button/Icon/Selector/Text → our Button/IconButton/Select/Radix Text.
 * The useOptimistic/useTransition/changeAction OPTIMISTIC layer is DROPPED (the wave-3 deferral pattern
 * used across the date inputs) — `page` is the single source of truth; optimistic in-flight advance and
 * async changeAction are named deferrals. See DECISIONS [[pagination-control]]. */

export interface PaginationVariantMap {
  pages: true;
  count: true;
  compact: true;
  dots: true;
  none: true;
}

/** Visual variant controlling what appears between the prev/next buttons. */
export type PaginationVariant = keyof PaginationVariantMap;

/** Size of the pagination controls. */
export type PaginationSize = "sm" | "md";

export interface PaginationProps {
  /** Ref forwarded to the root <nav>. */
  ref?: React.Ref<HTMLElement>;

  // --- Core (controlled) ---
  /** Current page number (1-based). Page 1 is the first page. */
  page: number;
  /** Called when the page changes. */
  onChange: (page: number) => void;

  // --- Data shape (provide one) ---
  /** Total number of items — used to compute the page count. Takes precedence over `totalPages`. */
  totalItems?: number;
  /** Total number of pages, when you know the page count but not the item count. */
  totalPages?: number;
  /** Whether more pages exist after the current one (cursor-based pagination, total unknown). */
  hasMore?: boolean;

  // --- Page size ---
  /** Number of items per page. @default 10 */
  pageSize?: number;
  /** Available page-size options. Shows a page-size Select when provided. */
  pageSizeOptions?: number[];
  /** Called when the page size changes. */
  onPageSizeChange?: (pageSize: number) => void;

  // --- Display ---
  /**
   * What appears between prev/next.
   * - `pages`: page-number buttons with ellipsis (default)
   * - `count`: "X–Y of Z" text
   * - `compact`: "Page X of Y" text
   * - `dots`: dot indicators (selection-follows-focus)
   * - `none`: just prev/next
   * @default 'pages'
   */
  variant?: PaginationVariant;
  /** Page buttons shown on each side of the current page (variant `pages` only). @default 1 */
  siblingCount?: number;
  /** Size of the controls. Omit to follow the global uiSize (small by default); set 'sm' or 'md' to pin the control lane. */
  size?: PaginationSize;

  // --- Behavior ---
  /** Whether the whole control is disabled. @default false */
  isDisabled?: boolean;

  // --- Accessibility ---
  /** Accessible label for the navigation landmark. @default 'Pagination' */
  label?: string;

  /** Test id, forwarded to the root <nav>. */
  "data-testid"?: string;
}

/**
 * Standalone pagination controls for navigating pages of content.
 *
 * @example
 * ```tsx
 * <Pagination page={page} onChange={setPage} totalItems={200} pageSize={20} />
 * ```
 */
export function Pagination({
  page,
  onChange,
  totalItems,
  totalPages: totalPagesProp,
  hasMore,
  pageSize: pageSizeProp = 10,
  pageSizeOptions,
  onPageSizeChange,
  variant = "pages",
  siblingCount = 1,
  size,
  isDisabled = false,
  label = "Pagination",
  "data-testid": testId,
  ref,
}: PaginationProps) {
  // Lifted coercion guard — a non-finite pageSize would make Infinity/NaN page counts and crash the
  // dots Array.from({ length }). Finite → floor/clamp≥1; non-finite → default 10.
  const pageSize = coercePageSize(pageSizeProp);

  // Polite page-change announce (navigation-10) — the controls carry no live region, so page
  // transitions were otherwise silent to screen readers. Only user-driven changes announce.
  const announce = useAnnounce();

  // The dots' 1D roving keyboard (horizontal, wrap). It only MOVES focus; the single tab stop is the
  // declarative tabIndex on the active dot and selection follows focus (handleDotsFocus).
  const { listRef: dotsListRef, handleKeyDown: handleDotsKeyDown } =
    useListFocus<HTMLDivElement>({ itemSelector: "button", orientation: "horizontal", wrap: true });

  const computedTotalPages =
    totalPagesProp ?? (totalItems != null ? Math.ceil(totalItems / pageSize) : undefined);

  const hasPrevious = page > 1;
  const hasNext =
    computedTotalPages != null ? page < computedTotalPages : (hasMore ?? false);

  // Empty state — nothing to paginate.
  if (totalItems != null && totalItems <= 0) return null;
  if (computedTotalPages != null && computedTotalPages <= 0) return null;

  const handlePageChange = (newPage: number) => {
    if (isDisabled) return;
    onChange(newPage);
    announce(
      computedTotalPages != null
        ? `Page ${newPage} of ${computedTotalPages}`
        : `Page ${newPage}`,
    );
  };

  // Selection-follows-focus for the dots (APG radiogroup interaction): when focus lands on a dot —
  // via arrow/Home/End, or a click that focuses it — select that dot's page. The current-page dot is
  // the tab stop, so tabbing in is a no-op (next === page).
  const handleDotsFocus = (e: React.FocusEvent) => {
    if (isDisabled) return;
    const dot = (e.target as HTMLElement | null)?.closest<HTMLElement>("button[data-page]");
    if (!dot) return;
    const next = Number(dot.dataset.page);
    if (Number.isFinite(next) && next !== page) handlePageChange(next);
  };

  const handlePrevious = () => {
    if (hasPrevious) handlePageChange(page - 1);
  };
  const handleNext = () => {
    if (hasNext) handlePageChange(page + 1);
  };

  const handlePageSizeChange = (value: string) => {
    const newSize = Number(value);
    onPageSizeChange?.(newSize);
    // A new page size changes what page 1 means — reset to it.
    handlePageChange(1);
  };

  // Item range for the count display.
  const rangeStart = (page - 1) * pageSize + 1;
  const rangeEnd =
    totalItems != null ? Math.min(page * pageSize, totalItems) : page * pageSize;

  // Honor the global uiSize control lane: with no explicit `size`, the toolbar governs (small=1 /
  // medium=2 / large=3), so Pagination scales with the rest of the system instead of pinning "md".
  // An explicit sm|md still wins per-instance.
  const radixSize: "1" | "2" | "3" =
    useResolvedSize<"1" | "2" | "3">("control", size === "sm" ? "1" : size === "md" ? "2" : undefined) ?? "1";

  const renderIndicator = (): ReactNode => {
    switch (variant) {
      case "pages": {
        if (computedTotalPages == null) return null;
        const pageRange = generatePageRange(page, computedTotalPages, siblingCount);
        return pageRange.map((item, index) => {
          if (item === "...") {
            const prev = pageRange[index - 1];
            const nxt = pageRange[index + 1];
            return (
              <span key={`ellipsis-${prev}-${nxt}`} aria-hidden="true" className="rt-ds-pagination__ellipsis">
                …
              </span>
            );
          }
          const isActive = item === page;
          return (
            <Button
              key={item}
              priority="tertiary"
              size={radixSize}
              className="rt-ds-pagination__page"
              aria-label={`Go to page ${item}`}
              aria-current={isActive ? "page" : undefined}
              data-current={isActive ? "" : undefined}
              disabled={isDisabled}
              onClick={() => handlePageChange(item)}
            >
              {item}
            </Button>
          );
        });
      }

      case "count": {
        if (totalItems == null) return null;
        return (
          <span className="rt-ds-pagination__info">
            {`${rangeStart}–${rangeEnd} of ${totalItems}`}
          </span>
        );
      }

      case "compact": {
        if (computedTotalPages == null) return null;
        return (
          <span className="rt-ds-pagination__info">{`Page ${page} of ${computedTotalPages}`}</span>
        );
      }

      case "dots": {
        if (computedTotalPages == null) return null;
        return (
          <div
            ref={dotsListRef}
            className="rt-ds-pagination__dots"
            role="group"
            aria-label="Page indicators"
            onKeyDown={handleDotsKeyDown}
            onFocus={handleDotsFocus}
          >
            {Array.from({ length: computedTotalPages }, (_, i) => {
              const pageNo = i + 1;
              const isActive = pageNo === page;
              return (
                <button
                  key={pageNo}
                  type="button"
                  data-page={pageNo}
                  className="rt-ds-pagination__dot"
                  aria-label={`Go to page ${pageNo}`}
                  aria-current={isActive ? "page" : undefined}
                  // The active dot is the single roving tab stop; the rest are reachable via arrows.
                  tabIndex={isActive ? 0 : -1}
                  // Selection is driven by focus (handleDotsFocus); clicking only needs to focus the
                  // dot, which some browsers (Safari) skip for buttons — so focus it explicitly.
                  onClick={(e) => e.currentTarget.focus()}
                  disabled={isDisabled}
                />
              );
            })}
          </div>
        );
      }

      case "none":
      default:
        return null;
    }
  };

  return (
    <nav
      ref={ref}
      aria-label={label}
      data-testid={testId}
      data-size={radixSize}
      className="rt-ds-pagination"
    >
      {pageSizeOptions != null && pageSizeOptions.length > 0 && (
        <div className="rt-ds-pagination__pagesize">
          <Select
            size={radixSize}
            value={String(pageSize)}
            onValueChange={handlePageSizeChange}
            disabled={isDisabled}
          >
            <Select.Trigger aria-label="Items per page" />
            <Select.Content>
              {pageSizeOptions.map((opt) => (
                <Select.Item key={opt} value={String(opt)}>
                  {opt}
                </Select.Item>
              ))}
            </Select.Content>
          </Select>
        </div>
      )}

      <div className="rt-ds-pagination__controls">
        <IconButton
          priority="tertiary"
          size={radixSize}
          aria-label="Go to previous page"
          disabled={isDisabled || !hasPrevious}
          onClick={handlePrevious}
        >
          <CaretLeft weight="bold" />
        </IconButton>

        {renderIndicator()}

        <IconButton
          priority="tertiary"
          size={radixSize}
          aria-label="Go to next page"
          disabled={isDisabled || !hasNext}
          onClick={handleNext}
        >
          <CaretRight weight="bold" />
        </IconButton>
      </div>
    </nav>
  );
}

Pagination.displayName = "Pagination";
