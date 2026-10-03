import { useId, useState, type CSSProperties } from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { Box, Flex } from "@radix-ui/themes";
import {
  Archive, ArrowDown, ArrowRight, ArrowUp, ArrowsDownUp, CalendarBlank, ChatCircle, Copy,
  Equals, EyeSlash, Funnel, Kanban, LinkSimple, ListDashes, PencilSimple, Plus,
  Prohibit, SlidersHorizontal, Tag, Tray, Trash, WarningDiamond, X,
} from "@phosphor-icons/react";
import { Avatar } from "../components/ui/Avatar";
import { AvatarGroup } from "../components/ui/AvatarGroup";
import { Badge, type BadgeTone } from "../components/ui/Badge";
import { Breadcrumbs, BreadcrumbItem } from "../components/ui/Breadcrumbs";
import { Button } from "../components/ui/Button";
import { Card } from "../components/ui/Card";
import { CheckboxCards } from "../components/ui/CheckboxCards";
import { CheckboxGroup } from "../components/ui/CheckboxGroup";
import { ClickableCard, interactiveLayer } from "../components/ui/ClickableCard";
import { ContextMenu } from "../components/ui/ContextMenu";
import { DataList } from "../components/ui/DataList";
import { DropdownMenu } from "../components/ui/DropdownMenu";
import { useReorder, type UseReorderReturn } from "../hooks/useReorder";
import { EmptyState } from "../components/ui/EmptyState";
import { Heading, type HeadingProps } from "../components/ui/Heading";
import { IconButton } from "../components/ui/IconButton";
import { MoreMenu } from "../components/ui/MoreMenu";
import { MultiSelect } from "../components/ui/MultiSelect";
import { OverflowList } from "../components/ui/OverflowList";
import { PowerSearch } from "../components/ui/PowerSearch";
import { Progress } from "../components/ui/Progress";
import { RadioGroup } from "../components/ui/RadioGroup";
import { ScrollArea } from "../components/ui/ScrollArea";
import { SegmentedControl } from "../components/ui/SegmentedControl";
import { Separator } from "../components/ui/Separator";
import { Skeleton } from "../components/ui/Skeleton";
import { StatusDot, type StatusDotVariant } from "../components/ui/StatusDot";
import { Switch } from "../components/ui/Switch";
import { Text } from "../components/ui/Text";
import { TextArea } from "../components/ui/TextArea";
import { Timestamp } from "../components/ui/Timestamp";
import { Tooltip } from "../components/ui/Tooltip";
import { createPowerSearchConfig } from "../powersearch/usePowerSearchConfig";
import type { PowerSearchFilter } from "../powersearch/types";
import { useResolvedSize } from "../theme/SizeContext";

/* Project board — a generic recreation of the kanban issue tracker every software team recognises:
 * a filter rail, a filter bar, four status columns of draggable cards, and a detail panel for the
 * selected issue. It is a VISUAL reference rendered AT REST — no play function, every menu closed —
 * so the reader judges the system's components against a layout they already know.
 *
 * Drag ordering is DEPICTED, never implemented: each card carries a grip glyph because a real board
 * has one, but pointer-drag reordering (and the `ResizeHandle` that would size the detail panel) is
 * out of scope for a static showcase. The canvas scrolls HORIZONTALLY across fixed-width columns —
 * what a real board does once a rail and a detail panel have taken their share of the width.
 */

/* A tiny portrait as an inline SVG data URI — no binary assets, no network.
 *
 * The baseline is `y="50%" dy=".36em"`, not the `y="58%"` this started as. A BASELINE is not a
 * centre: capitals sit entirely above it, so centring the baseline drives the ink upward by half
 * the cap height. Rasterized at 4× and measured row-by-row, `58%` put the initials 4.38 SVG units
 * above the 64-unit box centre — 2.73px high on the 40px disc the large tier renders, 1.64px on
 * the 24px disc at small. `.36em` is half the measured cap height of this face (18.65/26 = .717em
 * at font-size 26), and lands the ink 0.13 units / 0.08px off centre. `dominant-baseline="central"`
 * was measured too and is 0.38 units off — it centres the em box, not the capitals.
 */
const face = (bg: string, initials: string) =>
  `data:image/svg+xml;utf8,${encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64">
       <rect width="64" height="64" fill="${bg}"/>
       <text x="50%" y="50%" dy=".36em" font-family="sans-serif" font-size="26"
             fill="rgba(255,255,255,.92)" text-anchor="middle">${initials}</text>
     </svg>`,
  )}`;

type Person = { id: string; name: string; initials: string; photo: string };

const PEOPLE: Record<string, Person> = {
  mw: { id: "mw", name: "Mara Whitfield", initials: "MW", photo: face("#5c63d8", "MW") },
  rk: { id: "rk", name: "Rafa Kessler", initials: "RK", photo: face("#1f8f7a", "RK") },
  jm: { id: "jm", name: "June Mbeki", initials: "JM", photo: face("#b2584f", "JM") },
  to: { id: "to", name: "Tomas Oyelaran", initials: "TO", photo: face("#7a5ba8", "TO") },
  as: { id: "as", name: "Aina Sorensen", initials: "AS", photo: face("#3f6fa8", "AS") },
};

type Priority = "urgent" | "high" | "medium" | "low";

const PRIORITY: Record<Priority, { label: string; icon: typeof ArrowUp; color: string }> = {
  urgent: { label: "Urgent", icon: WarningDiamond, color: "var(--ds-icon-error)" },
  high: { label: "High", icon: ArrowUp, color: "var(--ds-icon-warning)" },
  medium: { label: "Medium", icon: Equals, color: "var(--ds-icon-neutral)" },
  low: { label: "Low", icon: ArrowDown, color: "var(--ds-icon-neutral)" },
};

type Issue = {
  key: string;
  title: string;
  labels: { text: string; tone?: BadgeTone }[];
  priority: Priority;
  assignee: Person;
  comments: number;
  subtasks?: { done: number; total: number };
  blockedBy?: string;
  selected?: boolean;
};

type Column = {
  name: string;
  dot: StatusDotVariant;
  dotLabel: string;
  issues: Issue[];
  /** Zero-state copy. Only a column that can legitimately stand empty mid-sprint carries it. */
  empty?: { title: string; description: string };
  /** Placeholder cards held while this column's tail is still being fetched. */
  loading?: number;
};

const BOARD: Column[] = [
  {
    name: "Backlog",
    dot: "neutral",
    dotLabel: "Not started",
    // A long backlog pages in as it is scrolled, so its tail is still on the wire.
    loading: 2,
    issues: [
      { key: "PLT-461", title: "Cache warm-up runs before the schema migration finishes", labels: [{ text: "platform" }], priority: "medium", assignee: PEOPLE.jm, comments: 2 },
      { key: "PLT-457", title: "Keyboard shortcut for switching workspaces", labels: [{ text: "frontend" }, { text: "starter task" }], priority: "low", assignee: PEOPLE.rk, comments: 0 },
      { key: "PLT-452", title: "Audit log export times out past ninety days", labels: [{ text: "backend" }, { text: "platform" }, { text: "observability" }], priority: "high", assignee: PEOPLE.to, comments: 4, subtasks: { done: 0, total: 3 } },
      { key: "PLT-448", title: "Write the token rotation runbook", labels: [{ text: "docs" }], priority: "low", assignee: PEOPLE.as, comments: 1 },
    ],
  },
  {
    name: "In progress",
    dot: "accent",
    dotLabel: "Active",
    issues: [
      // Six labels on a 264px card: the row overflows, so OverflowList collapses the tail to "+N".
      { key: "PLT-418", title: "Refresh the auth token before the socket reconnects", labels: [{ text: "auth" }, { text: "platform" }, { text: "security" }, { text: "sockets" }, { text: "needs QA" }, { text: "reliability" }], priority: "high", assignee: PEOPLE.mw, comments: 9, subtasks: { done: 4, total: 5 }, selected: true },
      { key: "PLT-431", title: "Session cookie is dropped on the second redirect hop", labels: [{ text: "auth" }, { text: "regression", tone: "error" }], priority: "urgent", assignee: PEOPLE.mw, comments: 7, subtasks: { done: 2, total: 5 } },
      { key: "PLT-427", title: "Bulk assign from the board context menu", labels: [{ text: "frontend" }], priority: "medium", assignee: PEOPLE.rk, comments: 3, subtasks: { done: 3, total: 4 } },
      { key: "PLT-419", title: "Rate limiter counts a retry twice", labels: [{ text: "backend" }], priority: "high", assignee: PEOPLE.jm, comments: 5, blockedBy: "PLT-402" },
    ],
  },
  {
    // Mid-sprint, everything in flight is still in flight: this is the column that stands empty,
    // and an empty kanban column is the archetypal home of the system's EmptyState.
    name: "In review",
    dot: "warning",
    dotLabel: "Awaiting review",
    issues: [],
    empty: {
      title: "Nothing in review",
      description: "Cards land here when their author asks for a second pair of eyes.",
    },
  },
  {
    name: "Done",
    dot: "success",
    dotLabel: "Complete",
    issues: [
      { key: "PLT-399", title: "Restore card ordering after a failed save", labels: [{ text: "frontend" }], priority: "high", assignee: PEOPLE.rk, comments: 6, subtasks: { done: 4, total: 4 } },
      { key: "PLT-390", title: "Upgrade the queue driver to 4.2", labels: [{ text: "backend" }, { text: "infra" }, { text: "chore" }], priority: "medium", assignee: PEOPLE.jm, comments: 0 },
      { key: "PLT-408", title: "Trim the board payload to the visible columns", labels: [{ text: "performance" }], priority: "medium", assignee: PEOPLE.to, comments: 1 },
      { key: "PLT-412", title: "Empty state for an archived sprint", labels: [{ text: "frontend" }, { text: "design" }], priority: "medium", assignee: PEOPLE.as, comments: 2 },
    ],
  },
];

/* ---- the filter bar's structured-search config ---- */
const SEARCH = createPowerSearchConfig([
  { key: "title", type: "string", label: "Title" },
  {
    key: "label", type: "enum", label: "Label",
    enumValues: [
      { value: "auth", label: "auth" }, { value: "backend", label: "backend" },
      { value: "frontend", label: "frontend" }, { value: "platform", label: "platform" },
    ],
  },
  {
    key: "priority", type: "enum", label: "Priority",
    enumValues: [
      { value: "urgent", label: "Urgent" }, { value: "high", label: "High" },
      { value: "medium", label: "Medium" }, { value: "low", label: "Low" },
    ],
  },
  { key: "points", type: "number", label: "Estimate" },
  { key: "updated", type: "date", label: "Updated" },
] as const);

/* One chip, not two: the label vocabulary is picked in the rail now, so a second label filter here
 * would be the same control twice. */
const START_FILTERS: PowerSearchFilter[] = [
  { field: "title", operator: "contains", value: { type: "string", value: "token" } },
];

/** Minutes ago as an ISO string — the activity feed reads as a live thread without a fixed date. */
const ago = (minutes: number) => new Date(Date.now() - minutes * 60_000).toISOString();

const ACTIVITY = [
  { id: "a1", who: PEOPLE.rk, what: "picked this up out of the backlog", at: ago(34) },
  { id: "a2", who: PEOPLE.as, what: "flagged the retry budget as unbounded", at: ago(96) },
  { id: "a3", who: PEOPLE.mw, what: "linked PLT-402 as a blocker of PLT-419", at: ago(280) },
  { id: "a4", who: PEOPLE.jm, what: "changed the estimate from 3 to 5 points", at: ago(1_420) },
];

/* Every issue on the board, by key. `useReorder` moves IDS, which is what lets the hook stay
 * ignorant of what it is reordering, so the page needs one place to turn a key back into its
 * issue when it renders and when it names one in an announcement. */
const ISSUES_BY_KEY: Record<string, Issue> = Object.fromEntries(
  BOARD.flatMap((c) => c.issues).map((i) => [i.key, i]),
);

function PriorityMark({ priority }: { priority: Priority }) {
  const { label, icon: Glyph, color } = PRIORITY[priority];
  // Shape carries the meaning as well as colour (WCAG 1.4.1): four distinct glyphs, one per grade.
  // No `size`: Phosphor defaults to 1em (icons.css), so the mark measures whatever the row it sits
  // in measures. Every caller below puts it inside a `Text`, which is what puts that row on the
  // text lane — so the glyph steps with the tier instead of freezing at a pixel count.
  return (
    <span role="img" aria-label={`Priority: ${label}`} style={{ display: "inline-flex" }}>
      <Glyph weight="bold" color={color} aria-hidden />
    </span>
  );
}

function CardMenu({ issue }: { issue: Issue }) {
  return (
    <ContextMenu.Content aria-label={`${issue.key} actions`}>
      <ContextMenu.Item><PencilSimple /> Rename</ContextMenu.Item>
      <ContextMenu.Item><ArrowRight /> Move to column</ContextMenu.Item>
      <ContextMenu.Item><Tag /> Edit labels</ContextMenu.Item>
      <ContextMenu.Item><LinkSimple /> Copy link</ContextMenu.Item>
      <ContextMenu.Separator />
      <ContextMenu.Item tone="danger"><Trash /> Delete issue</ContextMenu.Item>
    </ContextMenu.Content>
  );
}

function IssueCard({ issue, reorder }: { issue: Issue; reorder: UseReorderReturn }) {
  const pct = issue.subtasks ? Math.round((issue.subtasks.done / issue.subtasks.total) * 100) : 0;
  return (
    <ContextMenu.Root>
      <ContextMenu.Trigger>
        {/* THE CARD IS THE DRAG SOURCE. No grip. Ruled after review of the first cut: on a board
            the whole card is the drag source. A card needs no grip to say it can be moved:
            the board is a rearranging surface and the card is the unit that rearranges, so the
            context is the affordance. The first cut hung a
            DragHandle beside each card in a flex row, which pushed every card 36px right of its own
            column header and left a ragged gutter of floating grips down each column.

            So `getItemProps` goes straight onto the ClickableCard and the card is once again the
            direct child of the column's flex at full column width. It is the drag source, the
            keyboard route and, while something is lifted, a destination a single click can place
            into.

            WHAT THE STRETCHED LINK DOES TO A DRAG, since this is the case the capability was
            rebuilt for: ClickableCard paints an `::after` overlay from its link across the whole
            card, so every press and every hit test lands on the anchor rather than on the card box.
            Neither route minds. The pointer route reads `closest("[data-ds-reorder-item]")` from
            whatever it hits, which walks straight back up to this card, and the drag is separated
            from a navigation by the 5px threshold plus the capture-phase click blocker. The
            keyboard route rides the same overlay: the link is the card's only tab stop, Space on it
            lifts because an anchor does nothing with Space, and Enter still follows the href. */}
        <ClickableCard
          {...reorder.getItemProps(issue.key)}
          // No `headingSize`: since [[chrome-heading-lane]] a card title rides the chromeHeading lane (14/16/18), which
          // is what this used to pin by hand at "2". Small is unchanged; medium and large now step.
          href={`#${issue.key}`} title={issue.title} headingAs="h3"
          // NO LIFTED BRANCH HERE ANY MORE. The page used to tint a held card --ds-fill-press by
          // hand, which was the whole of the drag feedback and read as "pressed" rather than "picked
          // up". The ghost, the dashed placeholder edge and the drop indicator are the library's now
          // (tokens/components.css, off the attributes getItemProps writes), so a board adopts the
          // whole of the minimal pattern by spreading the getter it already spreads. Selection is
          // still the page's: it is board state, not reorder state. A card has no single label to set
          // bold, so the selected card takes the [[part-fill-edge]] card band ([[selected-row-cue]]): 2px of --accent-indicator flush
          // with its edge, with --accent-part-edge stacked on the outer 1px. The band rides the layer
          // that draws the card's edge, Radix's ::after, through the variable that layer paints, because
          // the card root is a stacking context (Radix's `contain: paint`) and its opaque ::before panel
          // covers anything the root paints itself. ::after sits 1px inside the card, so a 1px outer ring
          // takes the card's outer pixel and a 1px inset ring the pixel inside it, and the band replaces
          // the card's --gray-a5 edge ring, as [[part-fill-edge]]'s does.
          style={
            issue.selected
              ? ({
                  background: "var(--ds-fill-selected-subtle)",
                  "--base-card-surface-box-shadow":
                    "0 0 0 1px var(--accent-part-edge), 0 0 0 1px var(--accent-indicator), inset 0 0 0 1px var(--accent-indicator)",
                } as CSSProperties)
              : undefined
          }
        >
          <Flex direction="column" gap="2" mt="2">
            {/* A card is as wide as its column, and a well-labelled issue outgrows that in a hurry.
                OverflowList measures the row and collapses the tail into its "+N" count, so the
                label strip stays exactly one line however many labels the issue carries. */}
            <OverflowList gap={1} label={`${issue.key} labels`}>
              {issue.labels.map((l) => (
                <Badge key={l.text} tone={l.tone}>{l.text}</Badge>
              ))}
            </OverflowList>

            {issue.blockedBy && (
              // The row IS a Text, so the glyph's 1em default and the copy read the same step.
              <Text asChild style={{ color: "var(--ds-text-error)" }}>
                <Flex align="center" gap="1">
                  <Prohibit weight="bold" color="var(--ds-icon-error)" aria-hidden />
                  Blocked by {issue.blockedBy}
                </Flex>
              </Text>
            )}

            {issue.subtasks && (
              <Flex align="center" gap="2">
                <Progress
                  value={pct} max={100} style={{ flex: 1 }}
                  aria-label={`Subtasks: ${issue.subtasks.done} of ${issue.subtasks.total} done`}
                />
                <Text style={{ color: "var(--ds-text-weak)" }}>{issue.subtasks.done}/{issue.subtasks.total}</Text>
              </Flex>
            )}

            <Flex align="center" justify="between" gap="2">
              {/* The meta row IS a Text. That is the whole mechanism: the row resolves the text lane
                  once, and Phosphor's 1em default (icons.css) then sizes the grip, the priority mark
                  and the comment glyph off that same step — so the row moves as one when the tier
                  moves, instead of type stepping while frozen 13px glyphs sit beside it. */}
              <Text asChild style={{ color: "var(--ds-text-weak)" }}>
                <Flex align="center" gap="2" style={{ minWidth: 0 }}>
                  {/* NO GRIP GLYPH HERE, deliberately. An always-visible grip earns its width on an
                      entity whose movability is not otherwise legible. A card on a board is not that
                      entity: the whole card drags and the board already says so.
                      A decorative six-dot mark here was worse than nothing, because
                      it reads as the handle while being aria-hidden and inert, which teaches a
                      pointer user to aim at the one part of the card that is not special and tells
                      an assistive-technology user nothing at all. */}
                  {issue.key}
                  <PriorityMark priority={issue.priority} />
                  {issue.comments > 0 && (
                    <Flex align="center" gap="1">
                      <ChatCircle color="var(--ds-icon-neutral)" aria-hidden />
                      {issue.comments}
                    </Flex>
                  )}
                </Flex>
              </Text>
              {/* The tooltip is where the full name lives, and the `alt` carries it for anyone who
                  never hovers. Two details are load-bearing: the span is the trigger because Radix's
                  Avatar routes an unrecognised prop onto an inner <img> that a src-less avatar never
                  mounts, and `interactiveLayer` lifts it above the card's stretched-link overlay so
                  the hover reaches it at all. No `size`: the disc rides the beside-text avatar ramp
                  (16 / 20 / 24), which is the ladder for a face sitting on a line of copy. */}
              <Tooltip content={issue.assignee.name}>
                <span style={{ display: "inline-flex", ...interactiveLayer }}>
                  <Avatar src={issue.assignee.photo} alt={issue.assignee.name} fallback={issue.assignee.initials} />
                </span>
              </Tooltip>
            </Flex>
          </Flex>
        </ClickableCard>
      </ContextMenu.Trigger>
      <CardMenu issue={issue} />
    </ContextMenu.Root>
  );
}

/* A board column keeps its card width and lets the canvas scroll; it never squeezes. The number is
 * declared ONCE and applied twice on purpose: the column box, and the content inside its ScrollArea.
 * Radix sizes a ScrollArea's content box to `fit-content`, and OverflowList's row is `nowrap` — so
 * without a definite width on that content, one heavily-labelled card would widen its whole column. */
const COLUMN_WIDTH = 264;

/** A card that has not arrived yet. Radix's Skeleton sizes itself to whatever it wraps, so mirroring
 *  the real card's own elements — title lines, a label, the meta row — reserves the right box and
 *  nothing jumps when the fetch lands. The title lines therefore read the SAME lane the real title
 *  reads (chromeHeading, [[chrome-heading-lane]]) rather than a literal step — a skeleton pinned at 14px would reserve
 *  the wrong box the moment the tier moved, which is the whole thing it exists to prevent. */
function LoadingCard() {
  const titleStep = useResolvedSize<HeadingProps["size"]>("chromeHeading", undefined);
  return (
    <Card>
      <Flex direction="column" gap="2">
        <Skeleton><Text size={titleStep} weight="medium">An issue title that has not</Text></Skeleton>
        <Skeleton><Text size={titleStep} weight="medium">arrived yet</Text></Skeleton>
        <Flex gap="1" mt="1">
          <Skeleton><Badge>backend</Badge></Skeleton>
          <Skeleton><Badge>infra</Badge></Skeleton>
        </Flex>
        <Flex align="center" justify="between" gap="2" mt="1">
          <Skeleton><Text>PLT-000</Text></Skeleton>
          <Skeleton><Avatar fallback="––" /></Skeleton>
        </Flex>
      </Flex>
    </Card>
  );
}

function BoardColumn({
  column,
  issueKeys,
  reorder,
}: {
  column: Column;
  issueKeys: readonly string[];
  reorder: UseReorderReturn;
}) {
  // A column header is chrome inside a 264px lane, not a page title: chromeHeading ([[chrome-heading-lane]]).
  const columnHeading = useResolvedSize<HeadingProps["size"]>("chromeHeading", undefined);
  return (
    // gap="0" and the padding moved INSIDE the scroller below. The column still reads 12px between
    // its header and its first card, but those 12px now belong to the reorder group, which is what
    // gives the drop indicator somewhere to sit at the top of the list (see the ScrollArea note).
    <Flex direction="column" gap="0" style={{ width: COLUMN_WIDTH, flexShrink: 0, minHeight: 0 }}>
      <Flex align="center" justify="between" gap="2" px="1">
        <Flex align="center" gap="2" style={{ minWidth: 0 }}>
          <StatusDot variant={column.dot} label={column.dotLabel} />
          {/* An h2 per column, so each card's h3 title nests under a real heading rather than
              floating at a skipped level. Radix Heading defaults to h1 — `as` is not optional. */}
          <Heading as="h2" size={columnHeading} truncate>{column.name}</Heading>
          {/* The COMMITTED count, which is what the minimal pattern asks for: a number that ticked
              up and down as you arrowed would be claiming a move that has not happened, and the
              drop indicator is what answers "where am I putting this" now. It changes once, on the
              drop, which is also when onReorder fires. */}
          <Badge>{issueKeys.length}</Badge>
        </Flex>
        <Flex align="center" gap="1">
          {/* Icon-only, so the name assistive tech hears is worth showing a pointer user too. */}
          <Tooltip content={`Add an issue to ${column.name}`}>
            <IconButton priority="tertiary" aria-label={`Add an issue to ${column.name}`}>
              <Plus weight="bold" />
            </IconButton>
          </Tooltip>
          <MoreMenu label={`${column.name} column actions`} contentProps={{ align: "end" }}>
            <DropdownMenu.Item><Plus /> Add issue</DropdownMenu.Item>
            <DropdownMenu.Item><ArrowsDownUp /> Sort by priority</DropdownMenu.Item>
            <DropdownMenu.Item><EyeSlash /> Hide column</DropdownMenu.Item>
            <DropdownMenu.Separator />
            <DropdownMenu.Item tone="danger"><Archive /> Archive every issue</DropdownMenu.Item>
          </MoreMenu>
        </Flex>
      </Flex>
      <ScrollArea type="auto" scrollbars="vertical" style={{ flex: 1, minHeight: 0 }}>
        {/* The column IS the reorder group. `getGroupProps` is what makes it a drop destination:
            without it the click and keyboard routes still work and only the pointer drag is lost,
            which is a quiet failure worth knowing about.

            THE PADDING IS LOAD-BEARING NOW. The drop indicator is centred in the gap it points at,
            and the two gaps a list does not have are the one above its first card and the one
            below its last. pt/pb of --ds-space-12 — the same step as the row gap — give the mark
            those two, so the first and last slots read exactly like every slot between them
            instead of being clamped against the scroller's edge. pr is the scrollbar gutter and
            predates this. */}
        <Flex
          direction="column"
          gap="3"
          pt="3"
          pr="2"
          pb="3"
          style={{ width: COLUMN_WIDTH }}
          {...reorder.getGroupProps(column.name)}
        >
          {column.empty && issueKeys.length === 0 ? (
            // size="1" because this sits in a 264px column, not on a page. At the default the
            // title rendered on the ambient heading lane and outranked the column's own h2,
            // inverting the hierarchy the heading levels declare ([[empty-state-size]]). The step is no longer
            // inert: since [[chrome-heading-lane]] steps 1 and 2 read the chromeHeading lane, so this title now
            // tracks the tier at 14/16/18 like the column heading above it.
            <EmptyState size="1" icon={<Tray />} title={column.empty.title} description={column.empty.description} />
          ) : (
            issueKeys.map((key) => {
              const issue = ISSUES_BY_KEY[key];
              return issue ? <IssueCard key={key} issue={issue} reorder={reorder} /> : null;
            })
          )}
          {Array.from({ length: column.loading ?? 0 }, (_, i) => <LoadingCard key={`loading-${i}`} />)}
        </Flex>
      </ScrollArea>
    </Flex>
  );
}

/* The rail — board CHROME, not a form. Each picker is the shape its data deserves: labels are a short
 * fixed vocabulary, so they list as plain checkboxes; the four priority grades each earn a glyph, so
 * they get the chunky card picker; "group by" is one-of-three, so it is radio; and a display setting
 * that takes effect immediately is a Switch. None of these roots renders a label of its own (the
 * FieldGroup shell that would supply one is unexported by ruling [[group-validation]]), so each is named by the small
 * heading above it through `aria-labelledby`.
 *
 * The rail owns the hairline on its right; the canvas beside it stays bare — one seam, one owner. */
function BoardFilters() {
  const uid = useId();
  // The rail's two section headers are chrome inside a 216px column, so they take the chromeHeading
  // lane (14/16/18, [[chrome-heading-lane]]). The page heading lane would put a 28px "Filters" over 16px controls.
  const railHeading = useResolvedSize<HeadingProps["size"]>("chromeHeading", undefined);
  const priorityId = `${uid}-priority`;
  const labelsId = `${uid}-labels`;
  const groupId = `${uid}-group`;
  const subtasksId = `${uid}-subtasks`;
  const compactId = `${uid}-compact`;

  return (
    <Flex
      direction="column" gap="3" px="3" pt="3"
      style={{
        width: 216, flexShrink: 0, minHeight: 0,
        borderRight: "1px solid var(--ds-stroke-weak)", background: "var(--ds-bg-subtle)",
      }}
    >
      {/* The glyph carries no `size`, so Phosphor's 1em default reads the heading's own font-size —
          icon and words step together instead of a frozen 14px mark beside type that moves. Putting
          it INSIDE the heading is what gives it that context; a sibling in a plain Flex would
          inherit the 16px root instead. It is aria-hidden, so the accessible name is unchanged. */}
      <Heading as="h2" size={railHeading} style={{ display: "flex", alignItems: "center", gap: "var(--ds-space-8)" }}>
        <Funnel color="var(--ds-icon-neutral)" aria-hidden />
        Filters
      </Heading>

      {/* The scrolling region is inset by the rail's own padding, so its gutter never lands on the
          hairline the rail draws. */}
      <ScrollArea type="auto" scrollbars="vertical" style={{ flex: 1, minHeight: 0 }}>
        <Flex direction="column" gap="4" pr="2" pb="3">
          <Flex direction="column" gap="2">
            <Text id={priorityId} weight="medium" style={{ color: "var(--ds-text-weak)" }}>Priority</Text>
            <CheckboxCards.Root
              columns="1" gap="1" defaultValue={["urgent", "high"]} aria-labelledby={priorityId}
            >
              {(Object.keys(PRIORITY) as Priority[]).map((p) => {
                const { label, icon: Glyph, color } = PRIORITY[p];
                return (
                  <CheckboxCards.Item key={p} value={p}>
                    {/* The item resolves the control lane and sets its own font-size, so the glyph's
                        1em default and the unsized label both read that step — one size decision per
                        row, taken by the control, not three pinned by hand. */}
                    <Flex align="center" gap="2" style={{ minWidth: 0 }}>
                      <Glyph weight="bold" color={color} aria-hidden style={{ flexShrink: 0 }} />
                      <Text truncate>{label}</Text>
                    </Flex>
                  </CheckboxCards.Item>
                );
              })}
            </CheckboxCards.Root>
          </Flex>

          <Flex direction="column" gap="2">
            <Text id={labelsId} weight="medium" style={{ color: "var(--ds-text-weak)" }}>Labels</Text>
            <CheckboxGroup defaultValue={["auth", "platform"]} aria-labelledby={labelsId}>
              {["auth", "backend", "frontend", "platform", "design", "docs"].map((l) => (
                <CheckboxGroup.Item key={l} value={l}>{l}</CheckboxGroup.Item>
              ))}
            </CheckboxGroup>
          </Flex>

          {/* Same construction as the `Filters` header above. */}
          <Heading as="h2" size={railHeading} mt="2" style={{ display: "flex", alignItems: "center", gap: "var(--ds-space-8)" }}>
            <SlidersHorizontal color="var(--ds-icon-neutral)" aria-hidden />
            Display
          </Heading>

          <Flex direction="column" gap="2">
            <Text id={groupId} weight="medium" style={{ color: "var(--ds-text-weak)" }}>Group by</Text>
            <RadioGroup defaultValue="status" aria-labelledby={groupId}>
              <RadioGroup.Item value="status">Status</RadioGroup.Item>
              <RadioGroup.Item value="assignee">Assignee</RadioGroup.Item>
              <RadioGroup.Item value="priority">Priority</RadioGroup.Item>
            </RadioGroup>
          </Flex>

          <Flex direction="column" gap="3">
            {/* A Switch is the control for a setting that takes hold the moment it is flipped — no
                Apply, no form. It carries no label of its own, so the row's Text names it. */}
            <Flex align="center" justify="between" gap="3">
              <Text id={subtasksId}>Show sub-tasks</Text>
              <Switch defaultChecked aria-labelledby={subtasksId} />
            </Flex>
            <Flex align="center" justify="between" gap="3">
              <Text id={compactId}>Compact cards</Text>
              <Switch aria-labelledby={compactId} />
            </Flex>
          </Flex>
        </Flex>
      </ScrollArea>
    </Flex>
  );
}

function BoardToolbar() {
  const [view, setView] = useState("board");
  const [filters, setFilters] = useState<ReadonlyArray<PowerSearchFilter>>(START_FILTERS);

  return (
    <Box px="4" py="3" style={{ borderBottom: "1px solid var(--ds-stroke-weak)", background: "var(--ds-bg-base)" }}>
      <Flex align="center" justify="between" gap="3" wrap="wrap">
        <Breadcrumbs label="Project location">
          <BreadcrumbItem href="#workspace">Harbourline workspace</BreadcrumbItem>
          <BreadcrumbItem href="#platform">Platform</BreadcrumbItem>
          <BreadcrumbItem isCurrent>Sprint 24</BreadcrumbItem>
        </Breadcrumbs>
        <Flex align="center" gap="3">
          <AvatarGroup max={4} label="5 people on this board">
            {Object.values(PEOPLE).map((p) => (
              <Avatar key={p.id} src={p.photo} alt={p.name} fallback={p.initials} />
            ))}
          </AvatarGroup>
          <Button priority="primary"><Plus weight="bold" /> New issue</Button>
          <MoreMenu label="Board actions" contentProps={{ align: "end" }}>
            <DropdownMenu.Item><Copy /> Duplicate board</DropdownMenu.Item>
            <DropdownMenu.Item><CalendarBlank /> Close sprint</DropdownMenu.Item>
            <DropdownMenu.Separator />
            <DropdownMenu.Item tone="danger"><Trash /> Delete board</DropdownMenu.Item>
          </MoreMenu>
        </Flex>
      </Flex>

      <Flex align="center" gap="3" wrap="wrap" mt="3">
        <SegmentedControl.Root value={view} onValueChange={setView} aria-label="Sprint view">
          <SegmentedControl.Item value="board" startContent={<Kanban />}>Board</SegmentedControl.Item>
          <SegmentedControl.Item value="list" startContent={<ListDashes />}>List</SegmentedControl.Item>
          <SegmentedControl.Item value="timeline" startContent={<CalendarBlank />}>Timeline</SegmentedControl.Item>
        </SegmentedControl.Root>
        {/* The MultiSelect trigger fills its container by design, so each filter gets a fixed
            slot here — a toolbar filter is a control among controls, not a full-width field. */}
        <Box style={{ width: 200 }}>
          <MultiSelect aria-label="Filter by assignee" placeholder="Assignee" defaultValue={["mw"]} clearable>
            {Object.values(PEOPLE).map((p) => (
              <MultiSelect.Option key={p.id} value={p.id}>{p.name}</MultiSelect.Option>
            ))}
          </MultiSelect>
        </Box>
        <Box style={{ flex: 1, minWidth: 280 }}>
          <PowerSearch
            config={SEARCH.config} filters={filters} onChange={(next) => setFilters(next)}
            aria-label="Filter issues" placeholder="Filter issues" resultCount={12} width="100%"
          />
        </Box>
      </Flex>
    </Box>
  );
}

function IssueDetail() {
  const issue = BOARD[1].issues[0];
  // "Activity" is a section header inside the panel — chrome, so chromeHeading ([[chrome-heading-lane]]). The panel's
  // own title above it is deliberately NOT on this lane: see the comment at its call site.
  const sectionHeading = useResolvedSize<HeadingProps["size"]>("chromeHeading", undefined);
  return (
    <Flex
      direction="column"
      style={{ width: 400, flexShrink: 0, minHeight: 0, borderLeft: "1px solid var(--ds-stroke-weak)", background: "var(--ds-bg-subtle)" }}
    >
      <Flex align="center" justify="between" gap="2" px="4" py="3" style={{ borderBottom: "1px solid var(--ds-stroke-weak)" }}>
        <Flex align="center" gap="2">
          <Text style={{ color: "var(--ds-text-weak)" }}>{issue.key}</Text>
          <Badge tone="info">In progress</Badge>
        </Flex>
        <Flex align="center" gap="1">
          <MoreMenu label="Issue actions" contentProps={{ align: "end" }}>
            <DropdownMenu.Item><LinkSimple /> Copy link</DropdownMenu.Item>
            <DropdownMenu.Item><Copy /> Duplicate issue</DropdownMenu.Item>
            <DropdownMenu.Separator />
            <DropdownMenu.Item tone="danger"><Trash /> Delete issue</DropdownMenu.Item>
          </MoreMenu>
          <Tooltip content="Close details">
            <IconButton priority="tertiary" aria-label="Close issue details"><X /></IconButton>
          </Tooltip>
        </Flex>
      </Flex>

      <ScrollArea type="auto" scrollbars="vertical" style={{ flex: 1, minHeight: 0 }}>
        <Flex direction="column" gap="4" p="4">
          {/* The one heading on this screen that is NOT chrome. It is the subject title of a 400px
              view, so it takes the page heading lane (20/24/28) rather than chromeHeading — which
              would render it at 14px, level with the "Activity" header nested inside it and with
              every card title on the canvas. Measured in this panel: 2 lines at small and medium,
              3 at large, and the panel scrolls, so nothing is clipped. Small moves 18px -> 20px;
              that is the lane, not a pin. */}
          <Heading as="h2">{issue.title}</Heading>
          {/* A genuine prose body — the one place the reading measure belongs on this screen. */}
          <Text style={{ color: "var(--ds-text-weak)", maxWidth: "var(--ds-text-measure)" }}>
            The socket client reconnects with whatever token it held when the connection dropped, so a
            session that expires mid-stream reconnects once and then fails silently. Refresh ahead of the
            handshake and fall back to a full re-auth when the refresh itself is rejected.
          </Text>

          <DataList.Root labelGap="4">
            {[
              { label: "Status", value: <Badge tone="info">In progress</Badge> },
              {
                label: "Assignee",
                value: (
                  <Flex align="center" gap="2">
                    <Avatar src={issue.assignee.photo} alt="" fallback={issue.assignee.initials} />
                    <Text>{issue.assignee.name}</Text>
                  </Flex>
                ),
              },
              {
                label: "Priority",
                value: (
                  // The row is a Text so the priority glyph's 1em default reads the same step as
                  // the word beside it, exactly as it does on a card.
                  <Text asChild>
                    <Flex align="center" gap="2">
                      <PriorityMark priority={issue.priority} />
                      {PRIORITY[issue.priority].label}
                    </Flex>
                  </Text>
                ),
              },
              { label: "Sprint", value: <Text>Sprint 24, ends Friday</Text> },
              { label: "Estimate", value: <Text>5 points</Text> },
            ].map((row) => (
              <DataList.Item key={row.label}>
                <DataList.Label>{row.label}</DataList.Label>
                <DataList.Value>{row.value}</DataList.Value>
              </DataList.Item>
            ))}
          </DataList.Root>

          <Separator size="4" />

          <Flex direction="column" gap="3">
            <Heading as="h3" size={sectionHeading}>Activity</Heading>
            {ACTIVITY.map((entry) => (
              <Flex key={entry.id} align="start" gap="2">
                <Avatar src={entry.who.photo} alt="" fallback={entry.who.initials} />
                <Flex direction="column" gap="1" style={{ minWidth: 0 }}>
                  <Text>
                    <Text weight="medium" style={{ color: "var(--ds-text-strong)" }}>{entry.who.name}</Text>{" "}
                    {entry.what}
                  </Text>
                  <Timestamp value={entry.at} format="relative" />
                </Flex>
              </Flex>
            ))}
          </Flex>

          <Flex direction="column" gap="2">
            <TextArea label="Add a comment" placeholder="Leave a note for the reviewer" rows={3} maxLength={1000} />
            <Flex justify="end">
              <Button>Comment</Button>
            </Flex>
          </Flex>
        </Flex>
      </ScrollArea>
    </Flex>
  );
}

/* THE BOARD IS DRIVEN BY THE LIBRARY'S REORDER CAPABILITY ([[reorder-capability]]), NOT BY BOARD-SPECIFIC CODE.
 *
 * Review of the page found the board was expected to offer drag and drop and the interface did
 * not give it. The same ruling settled where the behaviour belongs, which is why there
 * is no drag logic in this file at all: the interaction lives in the library, because it
 * could be leveraged by any number of other components. So the page owns the DATA and the hook
 * owns the BEHAVIOUR. `useReorder` holds the order across all four columns, the page reads
 * `groups` back to render, and every pointer, keyboard and single-click route comes from the
 * prop-getters. Moving a card between columns is the cross-group case the hook was built for.
 *
 * `itemLabel` matters more than it looks: it is what turns an id into "Restore the nightly
 * contract run" in the live announcements and in each handle's accessible name. Without it a
 * screen-reader user hears an opaque key ([[reorder-single-pointer-path]]). */
function ProjectBoardScreen() {
  const reorder = useReorder({
    defaultGroups: BOARD.map((c) => ({ id: c.name, items: c.issues.map((i) => i.key) })),
    itemLabel: (id) => ISSUES_BY_KEY[id]?.title ?? id,
  });
  const instructions = reorder.getInstructionsProps();
  return (
    <Flex direction="column" style={{ height: "100vh", background: "var(--ds-bg-base)" }}>
      <BoardToolbar />
      {/* One hidden key map for the whole board, named by every handle's aria-describedby. */}
      <span {...instructions}>{reorder.instructions}</span>
      <Flex style={{ flex: 1, minHeight: 0 }}>
        <BoardFilters />
        {/* Fixed-width columns on a horizontally scrolling canvas — a board keeps its card width and
            lets the canvas run off the edge, rather than squeezing four columns into what is left. */}
        <Box style={{ flex: 1, minWidth: 0 }}>
          <ScrollArea type="auto" scrollbars="horizontal" style={{ height: "100%" }}>
            {/* KNOWN, 11px: a horizontally scrolling ScrollArea reserves its scrollbar gutter
                INSIDE the viewport, so the viewport is 11px shorter than the root and the
                columns' natural height overruns it by exactly that. Removing this height was
                tried and measured as a no-op — the overrun is the columns' own content, not this
                declaration — so the honest fix is bounding the column height, which is a layout
                change rather than a tweak. Cosmetic at the bottom edge; left recorded. */}
            <Box style={{ height: "100%" }}>
              <Flex gap="4" p="4" align="stretch" style={{ height: "100%" }}>
                {BOARD.map((column) => (
                  <BoardColumn
                    key={column.name}
                    column={column}
                    issueKeys={reorder.groups.find((g) => g.id === column.name)?.items ?? []}
                    reorder={reorder}
                  />
                ))}
              </Flex>
            </Box>
          </ScrollArea>
        </Box>
        <IssueDetail />
      </Flex>
    </Flex>
  );
}

const meta: Meta = {
  title: "UI examples/Project board",
  parameters: {
    layout: "fullscreen",
    // Showcase pages assert nothing and are registered as fully axe-off in
    // src/foundations/axe-scope.node-check.ts under ruling [[showcases-and-fixture]]. They are visual
    // references, not evidence. The composition fixture carries the axe role.
    a11y: { test: "off" },
  },
};
export default meta;
type Story = StoryObj;

export const Screen: Story = { name: "Project board", render: () => <ProjectBoardScreen /> };
