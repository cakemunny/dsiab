import { useState, type CSSProperties, type ReactNode } from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { Box, Flex } from "@radix-ui/themes";
import {
  Archive,
  ArrowBendDoubleUpRight,
  ArrowBendUpLeft,
  ArrowClockwise,
  CaretDown,
  CaretUp,
  EnvelopeOpen,
  FileDashed,
  FilePdf,
  FolderOpen,
  Gear,
  ImageSquare,
  Minus,
  PaperPlaneTilt,
  Paperclip,
  PencilSimple,
  Sparkle,
  Star,
  Trash,
  Tray,
  WarningOctagon,
  X,
} from "@phosphor-icons/react";
import { AppShell } from "../components/ui/AppShell";
import { Avatar } from "../components/ui/Avatar";
import { Badge } from "../components/ui/Badge";
import { Blockquote } from "../components/ui/Blockquote";
import { Button } from "../components/ui/Button";
import { ButtonGroup } from "../components/ui/ButtonGroup";
import { Checkbox } from "../components/ui/Checkbox";
import { Collapsible } from "../components/ui/Collapsible";
import { DropdownMenu } from "../components/ui/DropdownMenu";
import { FileInput } from "../components/ui/FileInput";
import { FormLayout } from "../components/ui/FormLayout";
import { Heading } from "../components/ui/Heading";
import { HoverCard } from "../components/ui/HoverCard";
import { IconButton } from "../components/ui/IconButton";
import { Layout } from "../components/ui/Layout";
import { Link } from "../components/ui/Link";
import { MoreMenu } from "../components/ui/MoreMenu";
import { OverflowList } from "../components/ui/OverflowList";
import { Pagination } from "../components/ui/Pagination";
import { PowerSearch } from "../components/ui/PowerSearch";
import { ScrollArea } from "../components/ui/ScrollArea";
import { Separator } from "../components/ui/Separator";
import { SideNav } from "../components/ui/SideNav";
import { Skeleton } from "../components/ui/Skeleton";
import { Table } from "../components/ui/Table";
import { Text } from "../components/ui/Text";
import { TextArea } from "../components/ui/TextArea";
import { TextField } from "../components/ui/TextField";
import { TimeInput } from "../components/ui/TimeInput";
import { Timestamp } from "../components/ui/Timestamp";
import { Token } from "../components/ui/Token";
import { Toolbar } from "../components/ui/Toolbar";
import { Tooltip } from "../components/ui/Tooltip";
import { VisuallyHidden } from "../components/ui/VisuallyHidden";
import { createPowerSearchConfig } from "../powersearch/usePowerSearchConfig";
import type { PowerSearchFilter } from "../powersearch/types";
import { createISOTimeString, type ISOTimeString } from "../dates/timeParser";
import { CONTROL_MEMBER_STEP, useSizeLane } from "../theme/SizeContext";

/* A generic web mail client, at rest. The system's own AppShell carries it — top bar in the header
 * slot, folder rail in the panel slot, and the two work panes in the guaranteed `main` — with a
 * message list built on Table and a reading pane carrying the modern affordance: a generated thread
 * summary, folded away behind one row. A draft is docked under the thread it answers, the way every
 * webmail docks a reply, and it REPLACES the thread's own action bar while it is open ([[action-bar-states]]).
 * Nothing opens itself; every menu, tooltip and card here is closed.
 *
 * AppShell's `main` is a PADDED reading surface (`--ds-space-24` on all four sides, with no prop to
 * unset it) and does not stretch to the shell, so the full-height body sizes itself off the one
 * runtime var the shell publishes for exactly this — documented with a 0px fallback — less that
 * gutter. The gutter is what turns the two panes into the floating work surface below. */

const HAIRLINE = "1px solid var(--ds-stroke-weak)";
const WEAK = { color: "var(--ds-text-weak)" } as const;
// The shell's `main` is flush here (`gutter="0"`), so the body is the viewport less the header the
// shell publishes at runtime — no gutter term, because there is no gutter to subtract.
const BODY_HEIGHT = "calc(100vh - var(--ds-appshell-header-height, 0px))";
// One-line clamp for a list row. Not `Text truncate`: that sets `white-space: nowrap`, which raises the
// cell's min-content width to the whole string and forces the auto-layout table wider than its pane.
const CLAMP = {
  display: "-webkit-box",
  WebkitLineClamp: 1,
  WebkitBoxOrient: "vertical",
  overflow: "hidden",
} as const;
// A list row is ONE line at every tier, so its cells centre on that line. Radix sets `vertical-align:
// top` on the table and `inherit` on the rows and cells, so this one declaration on the row re-aims all
// of them — and it is what keeps the checkbox, the star, the clip and the timestamp on one axis.
const ROW_ALIGN = { verticalAlign: "middle" } as const;
// The two short columns hold their line and take only the width their own content needs (§8b: a
// single-line label truncates or holds — it never reflows). `width: 1%` is the auto-table idiom for
// "shrink to content"; `nowrap` is what stops the received column breaking "40 minutes ago" in two at
// the large tier, which is what grew the whole row to two lines.
const HOLD = { whiteSpace: "nowrap", width: "1%" } as const;
// The sender's floor, in `ch` so it is a number of CHARACTERS rather than a number of pixels: 16
// characters of the pane's own type at whatever size the tier resolves, which is what the longest
// name in this folder measures ("Tomas Lindqvist", 123px of a 131px box at large). A px floor would
// show 16 characters at small and 10 at large, which is how "Priya Raghavan" became "Priya…".
const SENDER = { minWidth: "16ch" } as const;
// The attachment slot, one glyph wide (`1em` rides the cell's type), held whether or not the message
// has an attachment so every received time starts on the same x.
const CLIP_SLOT = { width: "1em", flexShrink: 0, lineHeight: 0 } as const;
// DENSITY. A scanning row's height is DERIVED, never chosen: the tallest thing on the row plus one
// density step. The system already names that step — `Item` ships a compact / balanced / spacious
// ladder at 4 / 8 / 12px of block padding, orthogonal to the type lane, so density and size stay
// separate axes. `Table` has no equivalent prop, so the compact rung is applied to the cells here,
// and only on the block axis: the inline padding is the column rhythm rather than the density, so
// it stays on Radix's own per-step ladder and keeps riding the tier.
//
// Radix also ships a FIXED row floor — `--table-cell-min-height`, 36 / 44 / 48px per size step —
// and a floor is a picked number, which is the thing a derived row height has to switch off. With
// it at 0 the row is exactly its content plus the density step: 32 / 32 / 40 here, where the
// binding constraint at small and medium is the 24px pointer floor under the star rather than the
// line box. The two custom properties are Radix's own hooks on the Root, so no `!important` and no
// rule in `components.css` is involved.
const DENSE = { paddingBlock: "var(--ds-space-4)" } as const;
const DERIVED_ROW_HEIGHT = { "--table-cell-min-height": "0" } as CSSProperties;
const CELL_CONTROLS = { ...HOLD, ...DENSE } as const;
const CELL_SENDER = { ...SENDER, ...DENSE } as const;
const CELL_RECEIVED = { ...HOLD, ...DENSE } as const;
// The pane action bar. The page has exactly ONE of these on screen at a time ([[action-bar-states]]): the thread's
// Reply and Forward row when no draft is open, the draft's own commit row when one is. It is a
// `ButtonGroup` — the channel every action row in this system runs through (Dialog.Footer,
// EmptyState, Toast), and the only one that honours the global `buttonOrder` — carrying the bar's
// own chrome, so the row sits flush at the foot of its surface, spans its full width, and is
// separated from the content by one hairline rather than by a band of empty space. `Toolbar` is the
// wrong construct here: it is a roving-focus cluster of tools ([[toolbar-slots]]), and Send is a commit, not a
// tool.
const ACTION_BAR = { flexShrink: 0, borderTop: HAIRLINE, background: "var(--ds-bg-raised)" } as const;

function PaneActions({ children }: { children: ReactNode }) {
  return (
    <ButtonGroup px="5" py="3" style={ACTION_BAR}>
      {children}
    </ButtonGroup>
  );
}

/* ROW AFFORDANCES. The row is the composite that owns the step box, so the controls INSIDE it take
 * the member step — one step down, floored at 1 ([[toggle-group-box]]'s `CONTROL_MEMBER_STEP`, the same ramp
 * ToggleButtonGroup seeds its buttons from). A full control-lane IconButton is a 32px box at medium
 * and 40 at large, which is what made the row taller than anything on it; the member step is
 * 24 / 24 / 32, still at or above the 24x24 pointer floor (GUIDELINES §9). The Checkbox is
 * deliberately NOT stepped down: it is already under that floor at every tier, and shrinking it
 * further would widen a defect rather than dodge it. */

const portrait = (from: string, to: string, initials: string) =>
  `data:image/svg+xml;utf8,${encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="160" height="160">
       <defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
         <stop offset="0" stop-color="${from}"/><stop offset="1" stop-color="${to}"/>
       </linearGradient></defs>
       <rect width="160" height="160" fill="url(#g)"/>
       <text x="50%" y="58%" font-family="sans-serif" font-size="64" font-weight="600"
             fill="rgba(255,255,255,.88)" text-anchor="middle">${initials}</text>
     </svg>`,
  )}`;

const PRIYA = portrait("#5b6cff", "#9f7bff", "PR");
const ME = portrait("#2fa98a", "#4fc9d8", "JD");

const MIN = 60_000;
const HOUR = 60 * MIN;
const DAY = 24 * HOUR;
const NOW = Date.now();

interface Message {
  id: string;
  sender: string;
  subject: string;
  snippet: string;
  at: number;
  unread: boolean;
  attachment: boolean;
}

const MESSAGES: Message[] = [
  { id: "m1", sender: "Priya Raghavan", at: NOW - 40 * MIN, unread: true, attachment: true,
    subject: "Re: Q3 brand refresh: colour tokens signed off",
    snippet: "Ran the contrast pass over the new accent ramp. Every pairing clears 4.5:1 except the disabled state." },
  { id: "m2", sender: "Marcus Feld", at: NOW - 2 * HOUR, unread: false, attachment: false,
    subject: "Deployment window moved to Thursday 23:00",
    snippet: "Ops want another day of soak time on staging, so the cutover slips by twenty four hours." },
  { id: "m3", sender: "Hana Okafor", at: NOW - 5 * HOUR, unread: true, attachment: true,
    subject: "Invoice 2026-0412 is ready for approval",
    snippet: "Two line items changed since the draft you saw on Monday. The totals are on the second page." },
  { id: "m4", sender: "Design review", at: NOW - DAY, unread: true, attachment: false,
    subject: "3 new comments on the rail spacing thread",
    snippet: "Lucia replied about the 240px rail and whether the collapsed rung should keep its label." },
  { id: "m5", sender: "Tomas Lindqvist", at: NOW - DAY - 3 * HOUR, unread: false, attachment: true,
    subject: "Notes from the accessibility audit",
    snippet: "Focus order through the reading pane is fine. The star control still needs an accessible name." },
  { id: "m6", sender: "Amara Bello", at: NOW - 2 * DAY, unread: false, attachment: false,
    subject: "Lunch on Thursday?",
    snippet: "There is a new place two streets from the studio that does a very decent lentil soup." },
  { id: "m7", sender: "Recruiting", at: NOW - 3 * DAY, unread: true, attachment: true,
    subject: "Candidate packet: senior motion designer",
    snippet: "Portfolio, references and the take-home brief are attached ahead of Friday's panel." },
  { id: "m8", sender: "Wei Chen", at: NOW - 4 * DAY, unread: false, attachment: false,
    subject: "Re: the typography ladder",
    snippet: "Agreed on dropping the 13px step. I will update the spec and re-run the samples this week." },
];

// The thread's recipient list — longer than the reading pane can seat, which is the ordinary case in
// mail and the reason the header line collapses rather than wraps.
const RECIPIENTS = [
  "me",
  "design-systems",
  "Marcus Feld",
  "Lucia Moreau",
  "brand-council",
  "Tomas Lindqvist",
  "Hana Okafor",
];

const MAIL_SEARCH = createPowerSearchConfig([
  { key: "from", type: "string", label: "From" },
  { key: "to", type: "string", label: "To" },
  { key: "subject", type: "string", label: "Subject" },
  { key: "folder", type: "enum", label: "Folder",
    enumValues: [{ value: "inbox", label: "Inbox" }, { value: "archive", label: "Archive" }, { value: "sent", label: "Sent" }] },
  { key: "received", type: "date", label: "Received" },
  { key: "attachment", type: "boolean", label: "Has attachment" },
] as const);

const INITIAL_FILTERS: PowerSearchFilter[] = [
  { field: "folder", operator: "is", value: { type: "enum", value: "inbox" } },
  { field: "attachment", operator: "is_true", value: { type: "empty" } },
];

/* ---- top bar -------------------------------------------------------------- */

function TopBar() {
  const [filters, setFilters] = useState<ReadonlyArray<PowerSearchFilter>>(INITIAL_FILTERS);
  return (
    // The shell's header slot already paints the raised chrome surface; this bar owns only the seam
    // under it (AppShell wires Layout's own divider to the footer boundary, not this one).
    <Flex align="center" gap="4" px="4" py="2" style={{ borderBottom: HAIRLINE, flexShrink: 0 }}>
      {/* Sized in `em`, so the brand mark rides the tier with the type beside it. A px glyph is a pin
          the Size control cannot move: this was a flat 22px at every tier, and is now 17.5 / 20 / 22.5.
          No fixed 240 on the lockup either — the rail it used to match is resizable now, so a hardcoded
          rail width here would be a lie the moment the handle moves. */}
      <Flex align="center" gap="2" style={{ flexShrink: 0 }}>
        <Tray size="1.25em" aria-hidden style={{ color: "var(--ds-icon-interactive)" }} />
        <Text weight="bold">Mail</Text>
      </Flex>
      <Box style={{ flex: "1 1 auto", minWidth: 0 }}>
        <PowerSearch
          config={MAIL_SEARCH.config}
          filters={filters}
          onChange={setFilters}
          aria-label="Search mail"
          placeholder="Search mail…"
          resultCount={124}
          width="100%"
        />
      </Box>
      <Flex align="center" gap="3" style={{ flexShrink: 0 }}>
        <IconButton priority="tertiary" aria-label="Settings"><Gear /></IconButton>
        <Avatar src={ME} alt="" fallback="JD" status="online" />
      </Flex>
    </Flex>
  );
}

/* ---- folder rail ---------------------------------------------------------- */

function Rail() {
  return (
    // The rail sits in a resizable `Layout.Panel`, whose `ResizeHandle` IS the seam (GUIDELINES §8a) —
    // so the rail drops its own inline-end rule rather than drawing a second hairline beside it, and
    // fills the width the handle gives it instead of holding its own 240.
    <SideNav aria-label="Mailboxes" style={{ width: "100%", borderInlineEnd: "none" }}>
      <Box px="2" pt="2" pb="1">
        <Button priority="primary" style={{ width: "100%" }}><PencilSimple weight="bold" aria-hidden /> Compose</Button>
      </Box>
      <SideNav.Section>
        <SideNav.Item label="Inbox" icon={<Tray />} href="#inbox" isSelected endContent={<Badge>12</Badge>} />
        <SideNav.Item label="Starred" icon={<Star />} href="#starred" />
        <SideNav.Item label="Sent" icon={<PaperPlaneTilt />} href="#sent" />
        <SideNav.Item label="Drafts" icon={<FileDashed />} href="#drafts" endContent={<Badge>3</Badge>} />
        <SideNav.Item label="Archive" icon={<Archive />} href="#archive" />
        <SideNav.Item label="Spam" icon={<WarningOctagon />} href="#spam" endContent={<Badge>48</Badge>} />
        <SideNav.Item label="Trash" icon={<Trash />} href="#trash" />
      </SideNav.Section>
      <SideNav.Section>
        <SideNav.Heading>Labels</SideNav.Heading>
        <SideNav.Item label="Brand refresh" icon={<FolderOpen />} href="#brand" />
        <SideNav.Item label="Invoices" icon={<FolderOpen />} href="#invoices" />
        <SideNav.Item label="Recruiting" icon={<FolderOpen />} href="#recruiting" />
        <SideNav.Item label="Travel" icon={<FolderOpen />} href="#travel" />
      </SideNav.Section>
    </SideNav>
  );
}

/* ---- message list --------------------------------------------------------- */

function MessageRow({
  message,
  isSelected,
  isStarred,
  onSelect,
  onStar,
}: {
  message: Message;
  isSelected: boolean;
  isStarred: boolean;
  onSelect: (id: string) => void;
  onStar: (id: string) => void;
}) {
  const heavy = message.unread ? "bold" : "regular";
  const controlSize = CONTROL_MEMBER_STEP[useSizeLane("control") as "1" | "2" | "3"];
  return (
    <Table.Row style={isSelected ? { ...ROW_ALIGN, background: "var(--ds-fill-selected-subtle)" } : ROW_ALIGN}>
      {/* The row's two controls share ONE cell. A second cell costs a second set of the table's own
          inline padding — 32px at the large tier — to separate two controls that read as one group,
          and that padding comes straight out of the subject. A Flex, not the bare controls: a lone
          Checkbox in a cell sits in a LINE box and rides its baseline, which left it 2px above the
          axis every other cell centres on (measured at medium: 168 against the row's 170). */}
      <Table.Cell style={CELL_CONTROLS}>
        <Flex align="center" gap="1">
          <Checkbox checked={isSelected} onCheckedChange={() => onSelect(message.id)} aria-label={`Select ${message.subject}`} />
          <IconButton
            size={controlSize}
            priority="tertiary"
            aria-label={isStarred ? `Unstar ${message.subject}` : `Star ${message.subject}`}
            aria-pressed={isStarred}
            onClick={() => onStar(message.id)}
          >
            <Star
              weight={isStarred ? "fill" : "regular"}
              style={{ color: isStarred ? "var(--ds-icon-interactive)" : "var(--ds-icon-neutral)" }}
            />
          </IconButton>
        </Flex>
      </Table.Cell>
      {/* The sender keeps a floor measured in `ch`, so it holds the same NUMBER of characters at every
          tier instead of collapsing to one word: the auto table splits the free width in proportion to
          each column's own content, and the subject's content is long enough to starve the sender
          without it. Both prose columns clamp to one line rather than wrapping. */}
      <Table.Cell style={CELL_SENDER}>
        <Box style={CLAMP}>
          <Text weight={heavy}>{message.sender}</Text>
        </Box>
      </Table.Cell>
      <Table.Cell style={DENSE}>
        <Box style={CLAMP}>
          <Text weight={heavy}>{message.subject}</Text>{" "}
          <Text style={WEAK}>{message.snippet}</Text>
        </Box>
      </Table.Cell>
      {/* The clip rides WITH the received time rather than owning a column of its own, and keeps a
          1em slot whether or not this message has an attachment — so the times all start on the same
          x, and the indicator costs one glyph instead of one cell's padding. */}
      <Table.Cell style={CELL_RECEIVED}>
        <Flex align="center" gap="2">
          <Box style={CLIP_SLOT}>
            {message.attachment && (
              <>
                <Paperclip aria-hidden style={{ color: "var(--ds-icon-neutral)", display: "block" }} />
                <VisuallyHidden>Has attachment</VisuallyHidden>
              </>
            )}
          </Box>
          <Timestamp value={new Date(message.at).toISOString()} weight={message.unread ? "bold" : undefined} />
        </Flex>
      </Table.Cell>
    </Table.Row>
  );
}

/* The tail of a folder that is still fetching: the row a message is about to occupy, held open by
 * Skeletons sized to the very thing they stand in for — the row's two controls included, because the
 * star's control box is what sets a row's height and a placeholder without it landed 16px short at the
 * large tier. Radix sizes a Skeleton to its child and takes the child out of the a11y tree, so these
 * are the real controls' shapes without their semantics. */
function LoadingRow({ sender, subject }: { sender: string; subject: string }) {
  const controlSize = CONTROL_MEMBER_STEP[useSizeLane("control") as "1" | "2" | "3"];
  return (
    <Table.Row style={ROW_ALIGN}>
      <Table.Cell style={CELL_CONTROLS}>
        <Flex align="center" gap="1">
          <Skeleton><Checkbox /></Skeleton>
          <Skeleton>
            <IconButton size={controlSize} priority="tertiary"><Star /></IconButton>
          </Skeleton>
        </Flex>
      </Table.Cell>
      <Table.Cell style={CELL_SENDER}>
        <Box style={CLAMP}>
          <Skeleton><Text>{sender}</Text></Skeleton>
        </Box>
      </Table.Cell>
      <Table.Cell style={DENSE}>
        <Box style={CLAMP}>
          <Skeleton><Text>{subject}</Text></Skeleton>
        </Box>
      </Table.Cell>
      <Table.Cell style={CELL_RECEIVED}>
        <Flex align="center" gap="2">
          <Box style={CLIP_SLOT} />
          <Skeleton><Text>00:00</Text></Skeleton>
        </Flex>
      </Table.Cell>
    </Table.Row>
  );
}

function BulkBar({
  count,
  allSelected,
  onToggleAll,
}: {
  count: number;
  allSelected: boolean | "indeterminate";
  onToggleAll: () => void;
}) {
  const [page, setPage] = useState(1);
  return (
    <Flex align="center" gap="3" px="3" py="2" style={{ borderBottom: HAIRLINE, background: "var(--ds-bg-raised)", flexShrink: 0 }}>
      <Checkbox checked={allSelected} onCheckedChange={onToggleAll} aria-label="Select all messages" />
      {/* No `size`: the toolbar resolves the tier and SEEDS it to every control in its slots ([[container-size-seeding]]), so
          the bulk actions are 24 / 32 / 40px boxes with 12 / 14 / 16px glyphs. It was pinned to "1",
          which held every glyph in this bar at 12px however large the Size control was set. */}
      <Toolbar.Root
        dividers
        aria-label="Message actions"
        start={
          <>
            <>
              <Tooltip content="Archive (E)">
                <Toolbar.Button asChild>
                  <IconButton priority="tertiary" aria-label="Archive selected"><Archive /></IconButton>
                </Toolbar.Button>
              </Tooltip>
              <Tooltip content="Delete (Del)">
                <Toolbar.Button asChild>
                  <IconButton priority="tertiary" tone="danger" aria-label="Delete selected"><Trash /></IconButton>
                </Toolbar.Button>
              </Tooltip>
              <Tooltip content="Mark as read (Shift R)">
                <Toolbar.Button asChild>
                  <IconButton priority="tertiary" aria-label="Mark selected as read"><EnvelopeOpen /></IconButton>
                </Toolbar.Button>
              </Tooltip>
            </>
            <DropdownMenu.Root>
              <DropdownMenu.Trigger>
                <Button priority="tertiary">Move to <CaretDown weight="bold" aria-hidden /></Button>
              </DropdownMenu.Trigger>
              <DropdownMenu.Content>
                <DropdownMenu.Label>Move to folder</DropdownMenu.Label>
                <DropdownMenu.Item>Brand refresh</DropdownMenu.Item>
                <DropdownMenu.Item>Invoices</DropdownMenu.Item>
                <DropdownMenu.Item>Recruiting</DropdownMenu.Item>
                <DropdownMenu.Item>Travel</DropdownMenu.Item>
                <DropdownMenu.Separator />
                <DropdownMenu.Item tone="danger">Spam</DropdownMenu.Item>
              </DropdownMenu.Content>
            </DropdownMenu.Root>
          </>
        }
        end={
          <Tooltip content="Refresh (R)">
            <Toolbar.Button asChild>
              <IconButton priority="tertiary" aria-label="Refresh"><ArrowClockwise /></IconButton>
            </Toolbar.Button>
          </Tooltip>
        }
      />
      <Text style={{ ...WEAK, flexShrink: 0, whiteSpace: "nowrap" }}>{count} selected</Text>
      <Box style={{ marginInlineStart: "auto", flexShrink: 0 }}>
        <Pagination page={page} onChange={setPage} totalItems={124} pageSize={25} variant="count" />
      </Box>
    </Flex>
  );
}

function ListPane() {
  const [selected, setSelected] = useState<string[]>(["m1", "m3"]);
  const [starred, setStarred] = useState<string[]>(["m1", "m4"]);

  const allSelected: boolean | "indeterminate" =
    selected.length === MESSAGES.length ? true : selected.length > 0 ? "indeterminate" : false;

  return (
    // The panel around this pane owns its width and its seam — the pane fills it and draws neither.
    <Flex direction="column" style={{ height: "100%", minWidth: 0, background: "var(--ds-bg-base)" }}>
      <BulkBar
        count={selected.length}
        allSelected={allSelected}
        onToggleAll={() => setSelected(selected.length === MESSAGES.length ? [] : MESSAGES.map((m) => m.id))}
      />
      <ScrollArea type="auto" scrollbars="vertical" style={{ flex: "1 1 0", minHeight: 0 }}>
        {/* No `size`: the table rides the control lane with everything else in the pane, so the cell
            type is 12 / 14 / 16px. It was pinned to "1", which is most of why the large tier looked
            like the small one. The row HEIGHT no longer comes from that step — see DENSITY above. */}
        <Table.Root variant="ghost" style={DERIVED_ROW_HEIGHT}>
          <Table.Header>
            <Table.Row>
              <Table.ColumnHeaderCell style={CELL_CONTROLS}><VisuallyHidden>Select and star</VisuallyHidden></Table.ColumnHeaderCell>
              <Table.ColumnHeaderCell style={CELL_SENDER}>From</Table.ColumnHeaderCell>
              <Table.ColumnHeaderCell style={DENSE}>Subject</Table.ColumnHeaderCell>
              <Table.ColumnHeaderCell style={CELL_RECEIVED}>Received</Table.ColumnHeaderCell>
            </Table.Row>
          </Table.Header>
          <Table.Body>
            {MESSAGES.map((m) => (
              <MessageRow
                key={m.id}
                message={m}
                isSelected={selected.includes(m.id)}
                isStarred={starred.includes(m.id)}
                onSelect={(id) => setSelected((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]))}
                onStar={(id) => setStarred((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]))}
              />
            ))}
            <LoadingRow sender="Amelia Hartwell" subject="Waiting on the rest of this folder to arrive from the server" />
            <LoadingRow sender="Operations" subject="One more on the way" />
          </Table.Body>
        </Table.Root>
      </ScrollArea>
    </Flex>
  );
}

/* ---- reading pane --------------------------------------------------------- */

/* THE GENERATED SUMMARY, DEMOTED. It used to be a `Callout tone="info" urgency="attention"`: a
 * filled, bordered, permanently expanded block that put a machine written paragraph above the
 * message itself in both position and contrast. A summary is a shortcut into the mail, never a peer
 * of it, so it is a `Collapsible` now, closed at rest by that component's own D4 default, with the
 * two sentences one click away. The `Generated` Badge went with it. The word survives as small
 * print inside the trigger, which is one painted chip fewer on a surface that had too many. */
function ThreadSummary() {
  return (
    <Collapsible
      trigger={
        <Flex align="center" gap="2" style={{ minWidth: 0 }}>
          <Sparkle weight="fill" aria-hidden style={{ color: "var(--ds-icon-info)" }} />
          <Text>Thread summary</Text>
          <Text size="1" style={WEAK}>Generated</Text>
        </Flex>
      }
    >
      <Text as="p">
        Priya signed off the accent ramp after a full contrast pass. Only the disabled state still
        falls under 4.5:1 against the raised surface, and she needs a decision on that token by
        Friday so the release notes can ship with the theme update.
      </Text>
    </Collapsible>
  );
}

function SenderLine() {
  return (
    <Flex align="center" gap="3" wrap="wrap">
      {/* PINNED on purpose: this is the thread's identity portrait, and an unsized Avatar rides the
          beside-text ramp (16 / 20 / 24) — a favicon beside a message header. `lg` (30) is the portrait
          rung, and a standalone Avatar exposes no way to ASK for the portrait ramp the way AvatarGroup
          does, so pinning the rung is the only route to one. */}
      <Avatar size="lg" src={PRIYA} alt="" fallback="PR" />
      <Flex direction="column" style={{ flex: "1 1 0", minWidth: 0 }}>
        <Flex align="center" gap="2" style={{ minWidth: 0 }}>
          <HoverCard.Root>
            <HoverCard.Trigger>
              <Link href="#sender" underline="hover" weight="bold" style={{ flexShrink: 0 }}>Priya Raghavan</Link>
            </HoverCard.Trigger>
            <HoverCard.Content maxWidth="320px" aria-label="About Priya Raghavan">
              <Flex gap="3">
                <Avatar size="xl" src={PRIYA} alt="" fallback="PR" />
                <Flex direction="column" gap="1">
                  <Text weight="bold">Priya Raghavan</Text>
                  {/* The card's own internal hierarchy: two subordinate lines under a bold name, in a
                      floating surface that sizes itself and is closed at rest. */}
                  <Text size="1" style={WEAK}>Principal designer · Brand systems</Text>
                  <Text size="1" style={WEAK}>priya.raghavan@example.internal</Text>
                </Flex>
              </Flex>
            </HoverCard.Content>
          </HoverCard.Root>
          {/* Subordinate to the name it follows, and the pair is the identity line's own hierarchy —
              the address is small print beside a bold link, not a peer of it. */}
          <Text size="1" truncate style={WEAK}>priya.raghavan@example.internal</Text>
        </Flex>
        {/* THE RECIPIENT LINE, DEMOTED FROM CHIPS TO TEXT. Every name used to render as a bordered
            `Token`, so seven recipients painted seven boxes and a filled `+N` Badge across a header
            that already carries a portrait, a name, an address and a timestamp. A chip is an OBJECT
            you can act on, and these names are metadata you only read, so the borders were claiming
            an affordance that is not there. The names are plain weak text now, comma separated.
            `OverflowList` stays, because the measuring engine is the part worth keeping: the line in
            mail is always longer than the pane, and the list still drops the names that do not fit
            into a "+N" count, which it renders as text here rather than as a Badge. It reads the
            width off the BOX it sits in (`observeParent`), not off itself: a shrink-to-fit flex item
            measuring its own width would converge on its narrowest state, because dropping an item
            narrows the very box being measured. */}
        <Flex align="center" gap="2" style={{ minWidth: 0 }}>
          <Text style={{ ...WEAK, flexShrink: 0 }}>to</Text>
          <Box style={{ flex: "1 1 0", minWidth: 0 }}>
            <OverflowList
              gap={1}
              minVisibleItems={1}
              label="Recipients"
              behavior="observeParent"
              /* The count follows the names down to plain text. The announcement rides a real
                 visually hidden child rather than an `aria-label` alone, for the reason the
                 component's own default renderer documents: a bare span is name-prohibited, so an
                 AT is entitled to read the glyph and announce "plus four". */
              overflowRenderer={(items) => (
                <Text style={WEAK}>
                  <span aria-hidden>+{items.length}</span>
                  <VisuallyHidden>{items.length} more</VisuallyHidden>
                </Text>
              )}
            >
              {RECIPIENTS.map((name, index) => (
                <Text key={name} style={WEAK}>
                  {index < RECIPIENTS.length - 1 ? `${name},` : name}
                </Text>
              ))}
            </OverflowList>
          </Box>
        </Flex>
      </Flex>
      <Box style={{ marginInlineStart: "auto" }}>
        <Timestamp value={new Date(NOW - 40 * MIN).toISOString()} format="date_time" />
      </Box>
    </Flex>
  );
}

/* THE STATE RULE (DECISIONS [[action-bar-states]]). The thread's action bar and the reply composer are two STATES of
 * one region at the foot of the reading pane, never two things stacked. Opening a reply REMOVES the
 * Reply and Forward bar, because a button that starts a job has nothing left to offer once the job
 * is under way, and the draft brings its own commit row with it. Closing or minimising the draft
 * brings the bar back. Exactly one commit row is on screen in every state. */
type DraftState = "closed" | "open" | "minimised";

function ReadingPane() {
  // Open by default, because the draft is the richer half of this fixture and the thread stays
  // readable behind it now that the composer has been cut back to a header, a recipient line, a
  // message and one commit row. Discard returns the page to its resting state, Reply reopens it,
  // and minimise reaches the third.
  const [draft, setDraft] = useState<DraftState>("open");
  return (
    <Flex direction="column" style={{ height: "100%", minWidth: 0, background: "var(--ds-bg-base)" }}>
      <Flex align="center" justify="between" gap="3" px="5" py="2" style={{ borderBottom: HAIRLINE, background: "var(--ds-bg-raised)", flexShrink: 0 }}>
        <Flex align="center" gap="2">
          <Badge>Inbox</Badge>
          <Badge tone="info">Brand refresh</Badge>
        </Flex>
        <Flex align="center" gap="2">
          <IconButton priority="tertiary" aria-label="Archive this message"><Archive /></IconButton>
          <IconButton priority="tertiary" tone="danger" aria-label="Delete this message"><Trash /></IconButton>
        </Flex>
      </Flex>

      <ScrollArea type="auto" scrollbars="vertical" style={{ flex: "1 1 0", minHeight: 0 }}>
        <Flex direction="column" gap="4" px="5" py="4">
          <Heading as="h2">Re: Q3 brand refresh: colour tokens signed off</Heading>
          <SenderLine />
          <Separator size="4" />
          <ThreadSummary />

          {/* NO measure cap here, deliberately. A measure cap belongs to EDITORIAL prose whose width
              the reader does not set — documentation, a marketing column, an empty state. This body
              sits in a reading pane the USER resizes, so the measure is already their choice, and a
              65ch cap would overrule it: at 1920 the pane is 990px of content box and the cap held
              the text to 656, leaving 358px of empty pane beside every line. The reader who wants a
              shorter line drags the handle. `--ds-text-measure` stays wherever no handle exists. */}
          <Flex direction="column" gap="3">
            <Text as="p">
              Morning both. I finished the contrast pass over the revised accent ramp last night and the
              results are good: every text and fill pairing we ship clears 4.5:1 on both the base and the
              raised surface, including the two steps we were nervous about.
            </Text>
            <Text as="p">
              The one exception is the disabled state. On the raised surface it measures 3.9:1, which is
              fine for a non-interactive label but not for the disabled control text we use it on. I have
              attached the full table plus a side by side of the two candidate fixes.
            </Text>
            <Text as="p">
              Could one of you pick a direction before Friday? Whichever we choose needs to land in the
              same release as the theme update, otherwise the release notes contradict the built tokens.
            </Text>
            <Text as="p">Thanks, Priya</Text>

            {/* THE QUOTED PRIOR MESSAGE. `Blockquote` is for a passage quoted INSIDE prose, which is
                exactly what a reply trail is, and it is the one place on these eight recreations
                where that relationship occurs. It is deliberately NOT the device used for an
                embedded post on the social feed: [[nesting-treatments]] rules that containment gets a bordered
                surface and only same-thread continuation gets a rule down the side. A reply trail
                is continuation, so the rule is correct here and wrong there. */}
            <Blockquote>
              Before you finalise anything, please check the disabled token against the raised
              surface as well as the base. We were caught by that pairing last quarter and the
              release notes had to be reissued.
            </Blockquote>
          </Flex>

          <Flex align="center" gap="2" wrap="wrap">
            <Text style={WEAK}>2 attachments</Text>
            <Token href="#attachment-1" leadingIcon={<FilePdf />} label="accent-ramp-contrast.pdf" />
            <Token href="#attachment-2" leadingIcon={<ImageSquare />} label="disabled-state-compare.png" />
          </Flex>
        </Flex>
      </ScrollArea>

      {/* ONE COMMIT ROW, NEVER TWO. This is [[action-bar-states]] in code. The region at the foot of the reading pane
          resolves to the draft's commit row while a draft is open, and to the thread's Reply and
          Forward row every other time. The revision before this one rendered both at once, which
          asked the reader to pick between two competing solid buttons stacked one above the other.
          A minimised draft keeps its dock ABOVE the thread's bar, so the bar stays flush at the foot
          of the surface it acts on. */}
      {draft === "open" ? (
        <ReplyDraft onMinimise={() => setDraft("minimised")} onDiscard={() => setDraft("closed")} />
      ) : (
        <>
          {draft === "minimised" && (
            <DraftDock onRestore={() => setDraft("open")} onDiscard={() => setDraft("closed")} />
          )}
          <PaneActions>
            <Button priority="primary" onClick={() => setDraft("open")}>
              <ArrowBendUpLeft weight="bold" aria-hidden /> Reply
            </Button>
            <Button priority="secondary"><ArrowBendDoubleUpRight weight="bold" aria-hidden /> Forward</Button>
          </PaneActions>
        </>
      )}
    </Flex>
  );
}

/* ---- docked reply --------------------------------------------------------- */

/* The draft's title row, shared by the open panel and the collapsed dock, so the two states are one
 * object at two sizes rather than two lookalikes that drift apart. */
function DraftHeader({
  collapsed,
  onToggle,
  onDiscard,
}: {
  collapsed: boolean;
  onToggle: () => void;
  onDiscard: () => void;
}) {
  return (
    <Flex align="center" justify="between" gap="2">
      <Text weight="bold">Reply to Priya Raghavan</Text>
      <Flex align="center" gap="1">
        <IconButton
          priority="tertiary"
          aria-label={collapsed ? "Expand this reply" : "Minimise this reply"}
          aria-expanded={!collapsed}
          onClick={onToggle}
        >
          {collapsed ? <CaretUp weight="bold" /> : <Minus weight="bold" />}
        </IconButton>
        <IconButton priority="tertiary" aria-label="Discard this reply" onClick={onDiscard}><X /></IconButton>
      </Flex>
    </Flex>
  );
}

/* The minimised draft. It holds its place at the foot of the pane and keeps its two controls, and it
 * hands the commit row back to the thread, which is the half of [[action-bar-states]] a disabled bar would miss. */
function DraftDock({ onRestore, onDiscard }: { onRestore: () => void; onDiscard: () => void }) {
  return (
    <Box asChild px="5" py="2">
      <section
        aria-label="Minimised reply to Priya Raghavan"
        style={{ flexShrink: 0, borderTop: HAIRLINE, background: "var(--ds-bg-raised)" }}
      >
        <DraftHeader collapsed onToggle={onRestore} onDiscard={onDiscard} />
      </section>
    </Box>
  );
}

/* The draft docked under the thread it answers, the arrangement every webmail reaches for instead of
 * a modal, because you keep reading what you are replying to. What it shows AT REST is the part that
 * changed. The rule it follows now is the one every real client follows: a reply opens with the
 * message and nothing else, and each further choice waits until it is asked for.
 *
 * REMOVED. The `Schedule send` Switch, which sat permanently on beside a permanently expanded
 * `Send at` TimeInput: two controls, always visible, for a decision almost no reply makes. `Save
 * draft` left the commit row, because a second button beside Send reads as a second commit and is
 * not one.
 *
 * DEMOTED, NOT DELETED. Scheduling is an item in the commit row's overflow menu, and the TimeInput
 * appears only after that item is chosen. The `To` field opens as a line of text with an Edit
 * control beside it rather than as a filled input, because replying to one person does not need a
 * text box until you want to change who it goes to. Attachments live behind the paperclip in the
 * commit row, the affordance every mail client uses, and the draft starts with nothing attached:
 * the empty picker, its Choose files button and its clear-all control were three controls standing
 * by for a file that was not coming. The thread above still shows two real attachments, so the page
 * has not lost that state.
 *
 * KEPT. A header, the message, and one commit row. The section paints the chrome surface and carries
 * the seam above it. The padding sits on its two children rather than on the section, because the
 * commit row has to reach both edges. */
function ReplyDraft({ onMinimise, onDiscard }: { onMinimise: () => void; onDiscard: () => void }) {
  const [attachments, setAttachments] = useState<File | File[] | undefined>(undefined);
  const [showAttachments, setShowAttachments] = useState(false);
  const [editRecipients, setEditRecipients] = useState(false);
  const [isScheduled, setIsScheduled] = useState(false);
  // `ISOTimeString` is a branded type, so a bare literal does not satisfy it. The sibling stories
  // reach for `as ISOTimeString`. `createISOTimeString` is the validated route and costs nothing here.
  const [sendAt, setSendAt] = useState<ISOTimeString | undefined>(
    () => createISOTimeString("08:30") ?? undefined,
  );

  return (
    <Flex
      asChild
      direction="column"
      style={{ flexShrink: 0, borderTop: HAIRLINE, background: "var(--ds-bg-raised)" }}
    >
      <section aria-label="Reply to Priya Raghavan">
        <Flex direction="column" gap="3" px="5" py="3">
          <DraftHeader collapsed={false} onToggle={onMinimise} onDiscard={onDiscard} />

          <FormLayout gap="3">
            {editRecipients ? (
              <TextField label="To" defaultValue="priya.raghavan@example.internal" />
            ) : (
              <Flex align="center" gap="2" style={{ minWidth: 0 }}>
                <Text style={{ ...WEAK, flexShrink: 0 }}>To</Text>
                <Text truncate>priya.raghavan@example.internal</Text>
                <Button priority="tertiary" aria-label="Edit recipients" onClick={() => setEditRecipients(true)}>
                  Edit
                </Button>
              </Flex>
            )}
            {/* No visible label. The panel says what it is in its own heading, and a `Message` label
                over the only text box in a reply is a word that carries nothing. The accessible name
                rides `aria-label`, which is the route the component documents for exactly this. */}
            <TextArea
              aria-label="Message"
              rows={3}
              defaultValue="Taking the darker disabled token — it clears on both surfaces. I'll land it with the theme update so the release notes stay true."
            />
            {showAttachments && (
              <FileInput
                label="Attachments"
                mode="input"
                isMultiple
                accept=".pdf,.png"
                maxSize={10 * 1024 * 1024}
                value={attachments}
                onValueChange={setAttachments}
                width="100%"
              />
            )}
            {isScheduled && (
              <TimeInput
                label="Send at"
                value={sendAt}
                onValueChange={setSendAt}
                increment={15}
                endSlot={<Text style={WEAK}>Tomorrow</Text>}
                width={180}
              />
            )}
          </FormLayout>
        </Flex>

        {/* The one commit row on screen while the draft is open. Send anchors per the global
            `buttonOrder` and the cluster's alignment follows it there. The paperclip and the
            overflow menu are not commits, so they never anchor: `ButtonGroup` moves the solid child
            and leaves everything else in the author's order around it. */}
        <PaneActions>
          <Button priority="primary">
            <PaperPlaneTilt weight="bold" aria-hidden /> {isScheduled ? "Schedule send" : "Send"}
          </Button>
          <Tooltip content="Attach files">
            <IconButton
              priority="tertiary"
              aria-label="Attach files"
              aria-expanded={showAttachments}
              onClick={() => setShowAttachments((open) => !open)}
            >
              <Paperclip />
            </IconButton>
          </Tooltip>
          <MoreMenu label="More reply options" contentProps={{ align: "start", side: "top" }}>
            <DropdownMenu.Item onSelect={() => setIsScheduled((on) => !on)}>
              {isScheduled ? "Send now instead" : "Schedule send…"}
            </DropdownMenu.Item>
            <DropdownMenu.Item>Save draft</DropdownMenu.Item>
          </MoreMenu>
        </PaneActions>
      </section>
    </Flex>
  );
}

/* ---- screen --------------------------------------------------------------- */

/* Three panes, three regions the user can resize. The rail is NOT in AppShell's `sideNav` slot: that
 * slot renders a plain `Layout.Panel` and the shell exposes no route to `resizable`, so the page owns
 * its own Layout inside the shell's `main` and keeps the shell for what only it can give — the header,
 * the single `main` landmark, and the skip link.
 *
 * `gutter="0"` makes `main` flush. The panes ARE the work surface, so the inset container that used to
 * sit inside the already-padded content area — a rounded, bordered card holding two panes 24px in from
 * every edge — is gone, and the panes meet the window.
 *
 * Every seam is drawn once (§8a): each resizable panel renders its own `ResizeHandle` and the Layout
 * suppresses the divider at a handled boundary, so no pane carries an inline-end rule of its own.
 *
 * The bounds are measured, not picked. The message row's own min-content at the LARGE tier is 536px
 * (96 for the control pair, 178 for the clip + received time, the sender's 16-character floor, and a
 * word of subject), so the list's floor is 540 — below that the row would be clipped rather than
 * truncated. The three minima plus the two 1px handles total 1122px; the default layout needs 1262
 * before the reading pane hits its floor, and both panels dragged to their maximum need 1382 — all
 * three inside the 1440 this was measured at. Narrower than that and the body row overflows rather
 * than crushing the reading pane silently, which is what `--ds-layout-content-min` is documented to
 * do. */
function MailScreen() {
  return (
    <AppShell
      mainLabel="Inbox"
      variant="subtle"
      // Pinned to the desktop regime: three panes IS the archetype, and the drawer must never be the
      // thing this page is caught doing. The rail stays the rail at every width.
      mobileNav={false}
      topNav={<TopBar />}
      gutter="0"
      // The shell is content-height by itself, so the viewport height is the consumer's to declare.
      style={{ height: "100vh" }}
    >
      <Layout
        padding="0"
        // The reading pane is the only region that flexes, so it carries the documented floor that
        // stops it being crushed silently as the other two grow.
        style={{ height: BODY_HEIGHT, "--ds-layout-content-min": "380px" } as CSSProperties}
      >
        <Layout.Panel
          resizable={{ defaultSize: 240, minSizePx: 200, maxSizePx: 300, "aria-label": "Resize the mailbox rail" }}
        >
          <Rail />
        </Layout.Panel>

        <Layout.Panel
          resizable={{ defaultSize: 640, minSizePx: 540, maxSizePx: 700, "aria-label": "Resize the message list" }}
        >
          <ListPane />
        </Layout.Panel>

        <Layout.Content>
          <ReadingPane />
        </Layout.Content>
      </Layout>
    </AppShell>
  );
}

const meta: Meta = {
  title: "UI examples/Mail client",
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

export const Screen: Story = { name: "Mail client", render: () => <MailScreen /> };
