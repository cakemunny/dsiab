import type { ReactNode } from "react";
import { Box, Code, Table, Text } from "@radix-ui/themes";
import { Caption, Section } from "./_storyKit";

/* Shared "which one do I reach for?" comparison tables. Confusable components (a Toast vs a Callout vs an
   AlertDialog; a Checkbox vs a Radio) each render the SAME table from their own Usage story, with their
   own column highlighted — so whichever page a user lands on first, they can navigate to the right one.
   One source of truth per cluster → the three+ copies can never drift apart. */

export type Comparison = {
  /** Section title, e.g. "Toast vs. Callout vs. AlertDialog". */
  title: string;
  /** One-line framing — the axes the choice turns on. */
  lead: ReactNode;
  /** The compared components, left→right. A value here must match the `highlight` passed per page. */
  columns: string[];
  /** Each row is one consideration + one cell per column, in `columns` order. */
  rows: { consideration: string; cells: ReactNode[] }[];
  /** The takeaway note under the table (the "if X, reach for Y" rule). */
  footnote?: ReactNode;
};

const HI: React.CSSProperties = { background: "var(--ds-fill-accent-weak)" };
const cellStyle: React.CSSProperties = { verticalAlign: "top" };

/** The bare comparison table. `highlight` is the CURRENT page's component: its column is rendered FIRST
    (immediately after the Consideration header) and tinted, so a reader always sees their own component
    in the anchor position, then the others in their original relative order. `highlight` must be one of
    `comparison.columns`; if it isn't, the columns render in their source order untinted. The source
    `comparison` is never mutated — the reorder is a render-time index list. */
export function ComparisonTable({ comparison, highlight }: { comparison: Comparison; highlight: string }) {
  const hiIdx = comparison.columns.indexOf(highlight);
  // Render order over the column indices: the highlighted column first, then the rest in original order.
  // (hiIdx < 0 → no highlight found → identity order, nothing tinted — the prior behaviour.)
  const order =
    hiIdx < 0
      ? comparison.columns.map((_, i) => i)
      : [hiIdx, ...comparison.columns.map((_, i) => i).filter((i) => i !== hiIdx)];
  return (
    <Box style={{ overflowX: "auto" }}>
      <Table.Root variant="surface" size="1" className="ds-comparison" style={{ minWidth: 560 }}>
        <Table.Header>
          <Table.Row>
            <Table.ColumnHeaderCell>Consideration</Table.ColumnHeaderCell>
            {order.map((idx) => (
              <Table.ColumnHeaderCell key={comparison.columns[idx]} style={idx === hiIdx ? HI : undefined}>{comparison.columns[idx]}</Table.ColumnHeaderCell>
            ))}
          </Table.Row>
        </Table.Header>
        <Table.Body>
          {comparison.rows.map((r) => (
            <Table.Row key={r.consideration}>
              <Table.RowHeaderCell style={{ ...cellStyle, color: "var(--ds-text-weak)" }}>{r.consideration}</Table.RowHeaderCell>
              {order.map((idx) => (
                <Table.Cell key={idx} style={idx === hiIdx ? { ...cellStyle, ...HI } : cellStyle}>
                  <Text size="1" style={{ color: "var(--ds-text-strong)" }}>{r.cells[idx]}</Text>
                </Table.Cell>
              ))}
            </Table.Row>
          ))}
        </Table.Body>
      </Table.Root>
    </Box>
  );
}

/** The full titled section — the framing lead, the table, and the takeaway note. Drop this into any
    member component's Usage story with its own name as `highlight`. */
export function ComparisonSection({ comparison, highlight }: { comparison: Comparison; highlight: string }) {
  return (
    <Section title={comparison.title} lead={comparison.lead}>
      <ComparisonTable comparison={comparison} highlight={highlight} />
      {comparison.footnote && <Caption>{comparison.footnote}</Caption>}
    </Section>
  );
}

/* ---- clusters ------------------------------------------------------------ */

/** Messaging — how long it lives × whether it blocks. Shown on Toast, Callout, AlertDialog, ChatSystemMessage. */
export const MESSAGING_COMPARISON: Comparison = {
  title: "Toast vs. Callout vs. AlertDialog vs. ChatSystemMessage",
  lead: (
    <>
      Four ways to say something to the user, on two axes: how long it lives, and whether it blocks. A toast
      reports what just happened and gets out of the way; a Callout is a standing note in the layout; an
      AlertDialog stops everything to force a decision; a ChatSystemMessage is a line a conversation says about
      itself, inside the transcript.
    </>
  ),
  columns: ["Toast", "Callout", "AlertDialog", "ChatSystemMessage"],
  rows: [
    { consideration: "What it is", cells: ["Transient feedback that floats over content", "A persistent message that sits inline in the page", "A blocking decision the user must resolve", "A line a conversation says about itself, in the transcript"] },
    { consideration: "Lifespan", cells: [<>Auto-hides (~5s); <Code>error</Code> persists</>, "Stays until dismissed or the condition clears", "Modal until the user acts", "Permanent — it is part of the transcript and scrolls with it"] },
    { consideration: "Blocks the user?", cells: ["No — non-modal; work continues", "No — it lives in the layout flow", "Yes — traps focus, dims the page", "No — it is a line of type between two messages"] },
    { consideration: "Carries a choice?", cells: ["At most one Undo", "An optional inline link or action", <>Yes — that&apos;s the point (confirm / cancel)</>, "No — if the reader must act, it is not a system line"] },
    { consideration: "Reach for it when", cells: ["Reporting what just happened", "Surfacing an ongoing state or a standing note", "Gating a consequential, irreversible action", "Marking what changed, who joined, or where one day ends and the next begins"] },
  ],
  footnote: (
    <>
      <strong>Toast</strong> and <strong>AlertDialog</strong> are System components; <strong>Callout</strong> is
      Radix Themes&apos; inline message box. If the user must <em>decide</em>, it is never a toast — reach for an{" "}
      <Code>AlertDialog</Code>. For a persistent, in-context message use a <Code>Callout</Code>. Form errors ride
      the inline <Code>Field</Code> message, never a toast. Inside a conversation a status line is a{" "}
      <Code>ChatSystemMessage</Code>, not a <Code>Callout</Code>: it carries no surface, no tint and no severity,
      because a footnote in a transcript that looks like a warning is a lie. The moment the reader has to{" "}
      <em>act</em> on it, it has stopped being a system line — put a <Code>Callout</Code> in the page instead.
    </>
  ),
};

/** Boolean / choice controls — how many can be on × how the options show × when it takes effect.
    Checkbox, RadioGroup, ToggleButton, Switch. */
export const BOOLEAN_CHOICE_COMPARISON: Comparison = {
  title: "Checkbox vs. RadioGroup vs. ToggleButton vs. Switch",
  lead: (
    <>
      Four controls for a yes/no or a choice — they differ on how many can be on at once, whether the options
      are laid out or the control itself is toggled, and whether the change takes effect now or on submit.
    </>
  ),
  columns: ["Checkbox", "RadioGroup", "ToggleButton", "Switch"],
  rows: [
    { consideration: "What it is", cells: ["An independent on/off box", "One choice from a small, mutually-exclusive set", "A button whose pressed state toggles a mode", "An on/off toggle for a single setting"] },
    { consideration: "How many on at once", cells: ["Any number — each is independent", "Exactly one", <>One per button (or one-of-a-group in a <Code>ToggleButtonGroup</Code>)</>, "One — it's independent, like a checkbox"] },
    { consideration: "Where the options are", cells: ["The label sits beside the box", "All options laid out together", "The control IS the option (an icon/label)", "A label beside the track — no option list"] },
    { consideration: "When it takes effect", cells: ["On submit (it's a form value)", "On submit (it's a form value)", "Immediately (a live mode)", "Immediately (a live setting)"] },
    { consideration: "Reach for it when", cells: ["A standalone yes/no (accept terms), or several independent toggles", "Picking one of a few mutually-exclusive options, all worth showing", "Toggling a format or mode, usually in a toolbar (bold, grid/list)", "Flipping a single setting that applies at once (notifications, dark mode)"] },
  ],
  footnote: (
    <>
      If more than one can be true at once, it is a <strong>Checkbox</strong>, never a radio. If the choices
      are mutually exclusive and few, use a <strong>RadioGroup</strong>. If the control is a mode you press in
      place (a toolbar affordance), use a <strong>ToggleButton</strong>. A <strong>Switch</strong> is the
      checkbox's live cousin — reach for it when the toggle takes effect <em>immediately</em> rather than on a
      form submit. For many options collapsed into a menu, see <Code>Select</Code> / <Code>Typeahead</Code>.
    </>
  ),
};

/** Pick from a set — inline vs cards vs segmented vs many-in-a-menu vs search-to-pick.
    Radio/Checkbox group, RadioCards/CheckboxCards, SegmentedControl, Select/MultiSelect, Typeahead.
    (The two card variants share one column, mirroring the combined group column — RadioCards and
    CheckboxCards pages both highlight "RadioCards / CheckboxCards".) */
export const PICK_FROM_SET_COMPARISON: Comparison = {
  title: "Choosing from a set — inline · cards · segmented · menu · search",
  lead: (
    <>
      Letting the user choose from a set of options — the right control turns on how many options there are,
      how much each option needs to show, and whether the user should see them all or search.
    </>
  ),
  columns: ["Radio / Checkbox group", "RadioCards / CheckboxCards", "SegmentedControl", "Select / MultiSelect", "Typeahead"],
  rows: [
    { consideration: "What it is", cells: ["Every option laid out inline", "The same options as larger, tappable cards", "A flush inline row of options sharing one track", "Options collapsed into a menu", "Search-to-pick from a large set"] },
    { consideration: "How many options", cells: ["A few — all worth showing", "A few — each worth the extra room", "Few (2–5) — they must fit one row", "A known list, too long to show inline", "Many, or fetched async"] },
    { consideration: "Single or multiple", cells: [<>Radio = one · Checkbox = many</>, <>RadioCards = one · CheckboxCards = many</>, "One", <>Select = one · MultiSelect = many</>, <>One (<Code>Tokenizer</Code> for many)</>] },
    { consideration: "Room per option", cells: ["A label (+ optional hint)", "An icon, a title, and a line of description", "A short label only", "A label in a menu row", "A label, matched as you type"] },
    { consideration: "Searchable?", cells: ["No", "No", "No", "No — a short, scannable list", "Yes — type to filter"] },
    { consideration: "Reach for it when", cells: ["Few options and the comparison matters", "Each option needs more than a label — an icon, a description, a price", "Switching a view or mode inline, no search", "A known set too long to lay out inline", "A big or async set the user narrows by typing"] },
  ],
  footnote: (
    <>
      Show the options inline when there are few (<Code>RadioGroup</Code> / <Code>CheckboxGroup</Code>); reach
      for <Code>RadioCards</Code> / <Code>CheckboxCards</Code> when each option earns more room (an icon, a
      description, a price). A <Code>SegmentedControl</Code> switches a <em>value</em> inline among 2–5
      options — for switching a <em>view</em> of one screen, that is <Code>Tabs</Code>. Collapse a longer known
      list into a <Code>Select</Code> / <Code>MultiSelect</Code>; reach for <Code>Typeahead</Code> only when the
      set is large enough that searching beats scanning.
    </>
  ),
};

/** Search surfaces — pick a value vs run a command vs build a filter. Typeahead, CommandPalette, PowerSearch. */
export const SEARCH_SURFACES_COMPARISON: Comparison = {
  title: "Typeahead vs. CommandPalette vs. PowerSearch",
  lead: (
    <>
      All three are type-to-find surfaces — they differ in what a match <em>does</em>: fills a field, runs a
      command, or adds a filter.
    </>
  ),
  columns: ["Typeahead", "CommandPalette", "PowerSearch"],
  rows: [
    { consideration: "What a match does", cells: ["Fills a form field with the picked value", "Runs a command or jumps to a destination", "Adds a filter that narrows a list"] },
    { consideration: "Where it lives", cells: ["Inline in a form, on the Field shell", "A ⌘K modal launcher over the app", "A filter bar above a dataset"] },
    { consideration: "Scope", cells: ["One field's options", "App-wide commands and destinations", "A dataset's filterable fields"] },
    { consideration: "Result", cells: ["A single value", "A one-shot action", "A stack of filter chips (AND)"] },
    { consideration: "Reach for it when", cells: ["Picking one value for a field by searching", "Running one action out of many, fast", "Narrowing a list by combining filters"] },
  ],
  footnote: (
    <>
      If the outcome is a <em>value in a form</em>, it is a <strong>Typeahead</strong>. If it is an
      <em>action or a jump</em>, it is a <strong>CommandPalette</strong>. If the user is <em>building a query</em>
      out of several conditions, it is <strong>PowerSearch</strong>.
    </>
  ),
};

/** Wayfinding surfaces — where a user IS vs where they can GO. TopNav, SideNav, Breadcrumbs, Tabs.
    Shown on each nav sibling's Usage with its own column highlighted (D13). */
export const NAV_SURFACES_COMPARISON: Comparison = {
  title: "TopNav vs. SideNav vs. Breadcrumbs vs. Tabs",
  lead: (
    <>
      Four wayfinding surfaces, on two axes: the <em>scope</em> they move you through (the whole app, a
      section, or one view) and whether they show <em>where you are</em> or <em>where you can go</em>. They
      compose — a shell often carries a TopNav, a SideNav, Breadcrumbs, and Tabs at once.
    </>
  ),
  columns: ["TopNav", "SideNav", "Breadcrumbs", "Tabs"],
  rows: [
    { consideration: "What it is", cells: ["The app's top-level bar of primary destinations", "A vertical rail of primary destinations, often nested", "A trail of the current page's ancestors", "A switch between peer views of one screen"] },
    { consideration: "Scope", cells: ["App-wide", "App-wide (with sub-sections)", "The current location's hierarchy", "One screen's sub-views"] },
    { consideration: "Where / where-to", cells: [<>Where to go (+ current section)</>, <>Where to go (+ current, nested)</>, "Where you are (ancestry)", "Where to switch (peer views)"] },
    { consideration: "Orientation", cells: ["Horizontal", "Vertical (collapsible rail)", "Horizontal trail", "Horizontal or vertical"] },
    { consideration: "Reach for it when", cells: ["A few top-level areas across a wide viewport", "Many destinations / a deep IA that benefits from a persistent rail", "Deep hierarchies where the path back matters", "Splitting one page into a few peer views"] },
  ],
  footnote: (
    <>
      <strong>SideNav</strong> and <strong>TopNav</strong> are the primary app navigation — pick the axis
      that fits the IA (a deep, section-heavy app earns the rail; a shallow one reads better as a top bar);
      a shell can carry both. <strong>Breadcrumbs</strong> report the current page's ancestry, not a set of
      choices. <strong>Tabs</strong> switch between peer views <em>within</em> a screen — they are not
      app navigation. Reserve a <Code>nav</Code> landmark (each labelled) for the wayfinding surfaces.
    </>
  ),
};

/** Menu surfaces — what the floating panel CONTAINS (nav destinations vs commands vs arbitrary content)
    and how it opens. Rendered on TopNav (highlight "TopNav menu"), DropdownMenu and ContextMenu, each with
    its own column highlighted. Popover appears here as a column but does NOT render this table: its own
    page carries FLOATING_INFO instead, since a Popover's confusable siblings are the other surfaces that
    carry information (Tooltip, HoverCard), not the ones that carry commands. */
export const MENU_SURFACES_COMPARISON: Comparison = {
  title: "TopNav menu / mega vs. DropdownMenu vs. ContextMenu vs. Popover",
  lead: (
    <>
      Four floating panels that look similar but carry different <em>content</em> — navigation
      destinations, a list of commands, or arbitrary content — and open in different ways, which decides
      the right semantics.
    </>
  ),
  columns: ["TopNav menu", "DropdownMenu", "ContextMenu", "Popover"],
  rows: [
    { consideration: "What it holds", cells: ["Navigation destinations (links)", "Commands / actions on a target", "Commands / actions on a right-clicked target", "Any content — text, a form, controls"] },
    { consideration: "Semantics", cells: [<>A labelled <Code>nav</Code> of links, <Code>aria-current="page"</Code></>, <><Code>role="menu"</Code> / <Code>menuitem</Code> (commands)</>, <><Code>role="menu"</Code> / <Code>menuitem</Code> — same as DropdownMenu</>, <><Code>role="dialog"</Code> — named content</>] },
    { consideration: "How it opens", cells: ["Hover-intent (150/200ms) + click-latch", "Click / Enter on the trigger", "Right-click / long-press on the target", "Click on the trigger"] },
    { consideration: "Keyboard", cells: ["Arrow roving among the links; Escape closes", "Full menu keyboard (roving, typeahead, Escape)", <><Code>Shift+F10</Code> / the menu key opens; then full menu keyboard</>, "Tab through the content; Escape closes"] },
    { consideration: "Shape", cells: ["A dropdown of links; the mega spans the bar width", "A compact command list from a trigger", "A compact command list at the pointer", "Trigger-anchored, content-sized"] },
    { consideration: "Reach for it when", cells: ["Grouping app destinations under a top-bar section", "Offering actions from a visible trigger (a ⋯ button)", "Offering actions on a right-clicked target (a row, a canvas item)", "Showing supplemental content or a small form"] },
  ],
  footnote: (
    <>
      If the panel is a set of <em>places to go</em>, it is a <strong>TopNav menu</strong> (or a{" "}
      <strong>mega menu</strong> for a wide, grouped set) — a <Code>nav</Code> of links, never{" "}
      <Code>role="menu"</Code>. For <em>things to do</em> to a target, it is a <strong>DropdownMenu</strong>{" "}
      (opened from a visible trigger) or a <strong>ContextMenu</strong> (opened by right-clicking the target
      itself) — same menu semantics, different affordance. A ContextMenu is a secondary path: its actions
      must also be reachable another way, since right-click is easy to miss. For arbitrary content or a small
      form, reach for a <strong>Popover</strong>.
    </>
  ),
};

/** Card-shaped surfaces — four components share the card SHAPE but do different jobs: a container, a
    navigation target, and two form pickers. Shown on Card and ClickableCard only: the two card pickers
    already carry the pick-from-set table, which answers the same question for them. */
export const CARD_SURFACES_COMPARISON: Comparison = {
  title: "Which card-shaped component?",
  lead: (
    <>
      Four components look like a card but answer different questions: is this a <em>container</em> for
      content, a <em>link</em> to somewhere, or a <em>form control</em> the user picks? Choose by the job,
      not the shape.
    </>
  ),
  columns: ["Card", "ClickableCard", "RadioCards", "CheckboxCards"],
  rows: [
    { consideration: "What it is", cells: ["A container grouping one entity's content", "A card whose whole job is navigating somewhere", "A single-select form control shaped like cards", "A multi-select form control shaped like cards"] },
    { consideration: "Interactive?", cells: ["No — it holds content; controls inside it are their own", "Yes — the whole card is one link", "Yes — each card is a radio", "Yes — each card is a checkbox"] },
    { consideration: "Produces a value?", cells: ["No", "No — it navigates", <>Yes — one <Code>string</Code></>, <>Yes — a <Code>string[]</Code></>] },
    { consideration: "How many can be active", cells: ["—", "—", "Exactly one", "Any number"] },
    { consideration: "Nested controls", cells: ["Any — buttons, links, menus", "Allowed, but they must sit above the overlay so they don't navigate", "Avoid — the whole card is the control", "Avoid — the whole card is the control"] },
    { consideration: "Reach for it when", cells: ["Grouping the content of one entity — a summary, a detail panel", "The card IS a link: a heading + a teaser that lead somewhere", "Picking ONE option where each needs an icon, a description, a price", "Picking SEVERAL options that each need that room"] },
  ],
  footnote: (
    <>
      If the user <em>reads</em> it, it is a <strong>Card</strong>. If the whole thing <em>goes</em>{" "}
      somewhere, it is a <strong>ClickableCard</strong> (one link, one tab stop — never a card wrapped in an
      anchor). If it <em>submits a value</em>, it is <strong>RadioCards</strong> (one) or{" "}
      <strong>CheckboxCards</strong> (many) — and if the options only need a label, a plain{" "}
      <Code>RadioGroup</Code> / <Code>CheckboxGroup</Code> is lighter than cards.
    </>
  ),
};

/** Floating info surfaces — which floating panel CARRIES INFORMATION, on what it holds × how it opens ×
    whether it's safe as the SOLE way to reach the content. Shown on Tooltip, Popover, HoverCard (D5). */
export const FLOATING_INFO_COMPARISON: Comparison = {
  title: "Tooltip vs. Popover vs. HoverCard",
  lead: (
    <>
      Three floating surfaces that carry information — they differ on what they hold, how they open, and
      (the decisive axis) whether they are safe as the <em>only</em> way to reach the content.
    </>
  ),
  columns: ["Tooltip", "Popover", "HoverCard"],
  rows: [
    { consideration: "What it holds", cells: ["A terse text hint — a label, a shortcut", "Any content — text, controls, a small form", "A rich preview card — an avatar, a summary"] },
    { consideration: "How it opens", cells: ["Hover or keyboard focus", "Click / Enter on the trigger", "Hover or focus — invisible on touch"] },
    { consideration: "Interactive?", cells: ["No — text only, you can't move into it", "Yes — focusable content, a form", "No — a preview to read, not to operate"] },
    { consideration: "Safe as the only access?", cells: ["No — supplementary; the info must live elsewhere too", "Yes — click-opened and keyboard-reachable, so it can carry primary content", "No — a supplementary preview; the trigger must itself lead to the full content"] },
    { consideration: "Reach for it when", cells: ["Naming an icon control or noting a keyboard shortcut", "Showing supplemental content or a small form on demand", "Previewing a linked entity (a user, a document) on hover"] },
  ],
  footnote: (
    <>
      <strong>Tooltip</strong> and <strong>HoverCard</strong> are <em>supplementary</em> — never the sole
      way to reach information: both vanish on touch (and a tooltip holds no interactive content), so their
      triggers must stand on their own and the full content must be reachable another way. A{" "}
      <strong>Popover</strong> is click-opened and keyboard-reachable, so it alone can carry a form or the
      primary content. Match the surface to the <em>weight</em> of what it holds: a word → Tooltip, a
      preview → HoverCard, real content or controls → Popover.
    </>
  ),
};

/** Chips — a static label vs an interactive/removable chip. Badge (display), Token (interactive). */
export const CHIPS_COMPARISON: Comparison = {
  title: "Badge vs. Token",
  lead: (
    <>
      Two chips that look alike but do different jobs: a Badge is something you <em>read</em>; a Token is
      something you <em>act on</em>.
    </>
  ),
  columns: ["Badge", "Token"],
  rows: [
    { consideration: "What it is", cells: ["A static label or marker", "An interactive, removable chip"] },
    { consideration: "Interactive?", cells: ["No — display only", "Yes — a clickable / navigable body, a remove ✕, or both"] },
    { consideration: "Appearance", cells: ["A flat fill — reads as a label", "A surface edge — a bounded, dismissible token"] },
    { consideration: "Lives in", cells: ["Labels, statuses, counts, categories", "Editing surfaces — Tokenizer, PowerSearch filter chips"] },
    { consideration: "Reach for it when", cells: ["Labelling or categorizing something the user reads", "The user clicks, navigates, or removes the chip"] },
  ],
  footnote: (
    <>
      <strong>Badge</strong> is display-only. The moment a chip is clickable, navigable, or removable it is a
      <strong>Token</strong> — the surface edge is the honest signal that it is a control, not a label. (Badge no
      longer carries a removable or interactive mode; those live on Token.)
    </>
  ),
};

/** Date & Time — the five controls differ on the SHAPE of the value (one date · a span · a date+time · a
    time · an always-visible grid) and on how it's entered. Shown on Calendar, DateInput, DateRangeInput,
    DateTimeInput, TimeInput. */
export const DATE_TIME_COMPARISON: Comparison = {
  title: "Which date & time control?",
  lead: (
    <>
      Five controls for entering a moment in time — the right one turns on the <em>shape</em> of the value
      (a single date, a start → end span, a date and a time, a time alone, or a whole visible grid) and
      whether the user types it or picks it.
    </>
  ),
  columns: ["Calendar", "DateInput", "DateRangeInput", "DateTimeInput", "TimeInput"],
  rows: [
    {
      consideration: "What it is",
      cells: [
        "An always-visible day grid — the grid IS the surface, no field or trigger",
        "A text field for one date, with a calendar as the alternative way in",
        "A field for a span, with presets and a two-month calendar",
        "One field pairing a date and a time under a single label",
        <>A text field for one time of day, stepped by <Code>↑</Code> / <Code>↓</Code></>,
      ],
    },
    {
      consideration: "What the user enters",
      cells: [
        <>One date, or a <strong>start → end</strong> span in range mode</>,
        <>One date</>,
        <>A <strong>start → end</strong> span</>,
        <>A date <strong>and</strong> a time</>,
        <>One time of day</>,
      ],
    },
    {
      consideration: "Type or pick",
      cells: [
        "Click the grid — no typing",
        "Type (free text) or pick from the calendar",
        "Pick presets or exact dates — picking, not typing",
        "Type or pick each part (composes DateInput + TimeInput)",
        <>Type free text (<Code>3pm</Code>, <Code>15:00</Code>) or step with the arrows</>,
      ],
    },
    {
      consideration: "Wire value",
      cells: [
        <>An ISO date, or <Code>{`{ start, end }`}</Code> in range mode</>,
        <>An ISO <Code>YYYY-MM-DD</Code> string</>,
        <><Code>{`{ start, end }`}</Code> ISO strings</>,
        <>One ISO <Code>YYYY-MM-DDTHH:MM</Code></>,
        <>An ISO <Code>HH:MM</Code> string</>,
      ],
    },
    {
      consideration: "Reach for it when",
      cells: [
        "The grid should stay visible with no field — a dashboard picker or inline scheduler",
        "One date, and typing is often faster than picking",
        "A report window, a booking, or a date filter",
        "A single moment — a meeting slot, a reminder, a publish time",
        "A time with no date — an alarm, a daily reminder",
      ],
    },
  ],
  footnote: (
    <>
      Match the control to the <em>shape</em> of the value: one date → <Code>DateInput</Code>; a start → end
      span → <Code>DateRangeInput</Code>; a date and a time → <Code>DateTimeInput</Code>; a time alone →{" "}
      <Code>TimeInput</Code>. Reach for a bare <Code>Calendar</Code> only when the grid should stay
      always-visible with no field or trigger — an inline scheduler or a dashboard picker.
    </>
  ),
};

/** Crediting a source — three components answer three different questions about the same source: do you
    REPRODUCE its words, REFERENCE it, or GO to it? Shown on Blockquote, Citation and Link. (Avatar is
    deliberately absent: it is a PART of an attribution — the portrait beside a name — not an
    alternative to one, so it belongs inside the Blockquote's attribution slot, not in this choice.) */
export const SOURCE_CREDIT_COMPARISON: Comparison = {
  title: "Blockquote vs. Citation vs. Link",
  lead: (
    <>
      Three ways a source shows up in prose. They differ on what the reader gets: the source&apos;s own
      <em> words</em> set apart from your text, a <em>reference marker</em> that backs a claim you made,
      or a <em>route</em> to the source itself. They compose — a quotation&apos;s attribution is often a
      link, and a quoted passage can carry a citation inside it.
    </>
  ),
  columns: ["Blockquote", "Citation", "Link"],
  rows: [
    { consideration: "What it is", cells: ["A quoted passage set apart with an accent rule", "A numbered reference marker to a source", "Inline text that navigates somewhere"] },
    { consideration: "Whose words", cells: ["The source's, reproduced verbatim", "Yours — the marker points at what backs them", "Yours — the text describes the destination"] },
    { consideration: "Where it sits", cells: ["A block in the reading flow", "Inline, at the end of the claim it supports", "Inline, inside a sentence"] },
    { consideration: "Goes somewhere?", cells: ["No — unless you compose a link into its attribution", "When the source has a URL", "Always — that is the whole job"] },
    { consideration: "How the source is named", cells: [<>The <Code>attribution</Code> slot — a name, a role, an Avatar, a link</>, <>An ordinal plus the source title, announced as &ldquo;Citation 3: <em>title</em>&rdquo;</>, "The link text itself"] },
    { consideration: "Reach for it when", cells: ["Reproducing a passage — a testimonial, a policy clause, a review", "Backing a specific claim with a numbered, checkable source", "Pointing the reader at a page they may want to open"] },
  ],
  footnote: (
    <>
      If the reader sees the source&apos;s <em>own words</em>, it is a <strong>Blockquote</strong>, and the
      person or document behind them belongs in its <Code>attribution</Code> — not in a{" "}
      <strong>Citation</strong>. A Citation is a numbered <em>reference marker</em>: it requires an ordinal
      and announces itself as &ldquo;Citation N: title&rdquo;, so a person credited that way is read out as
      a source document. Use it <em>inside</em> a passage where a claim needs backing. When you are simply
      sending the reader somewhere, that is a plain <strong>Link</strong>.
    </>
  ),
};
