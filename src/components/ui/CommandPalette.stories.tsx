import type { Meta, StoryObj } from "@storybook/react-vite";
import { useEffect, useLayoutEffect, useRef, useState, type ComponentType, type RefObject } from "react";
import { Box, Code, Flex, Grid, Text } from "@radix-ui/themes";
import {
  ArrowRight,
  FilePlus,
  FloppyDisk,
  FolderPlus,
  Gear,
  MagnifyingGlass,
  Moon,
  Sidebar,
  TextAa,
  WarningCircle,
} from "@phosphor-icons/react";
import { CommandPalette } from "./CommandPalette";
import { useResolvedSize } from "../../theme/SizeContext";
import { createStaticSource, type TypeaheadOption, type TypeaheadSource } from "./Typeahead";
import { Button } from "./Button";
import {
  AnatomyLegend,
  Caption,
  Decision,
  DoDont, DODONT_LABEL,
  dotStyle,
  HexThemeKey,
  hLine,
  type KeyBinding,
  KeyRow,
  MeasuredRow,
  MeasuredSpec,
  Mono,
  Muted,
  NoteRow,
  Page,
  PageHeader,
  PropsLead,
  type PropDef,
  PropTable,
  Rule,
  Scenario,
  Section,
  TokenGroup,
} from "./_storyKit";
import { awaitMeasuredRows } from "../../foundations/_assert";

/** The one definition of this component — the standfirst every page of it opens with. */
const DEFINITION = (
  <>
    Reach for a CommandPalette when a user needs to <strong>find and run</strong> one action out of many
    — commands, pages, entities — faster than a menu can offer. It owns the search pipeline (debounce,
    cancel, the stale-response guard, optimistic narrowing) and the grouped keyboard surface; the
    consumer owns the <Code>source</Code> and what a pick <em>does</em>.
  </>
);
import { ComparisonSection, SEARCH_SURFACES_COMPARISON } from "./_comparisons";

/* DOCS stories (History · Anatomy · Usage · Keyboard · Props) — static and calm on
   view. Every specimen uses `isInline` (a plain bounded box — no <dialog>, no backdrop, no autofocus, no
   mount-scroll), so viewing a docs page never opens a modal or steals focus. All behavioral plays (which
   flash the UI) live in `_commandpalette.stories.tsx` (_internal/CommandPalette behavior). */

/* ---- demo command source ------------------------------------------------- */
/* The icon states no weight: the option supplies it ([[selected-row-cue]]), solid on the picked row and outline elsewhere. */
const withIcon = (label: string, Icon: ComponentType<{ size?: number }>) => (
  <Flex align="center" gap="2" style={{ minWidth: 0 }}>
    <Icon size={16} />
    <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{label}</span>
  </Flex>
);

const cmd = (
  id: string,
  label: string,
  group: string,
  Icon: ComponentType<{ size?: number }>,
): TypeaheadOption => ({ id, label, element: withIcon(label, Icon), auxiliaryData: { group } });

const COMMANDS: TypeaheadOption[] = [
  cmd("new-file", "New File", "Actions", FilePlus),
  cmd("new-folder", "New Folder", "Actions", FolderPlus),
  cmd("save-all", "Save All", "Actions", FloppyDisk),
  cmd("toggle-theme", "Toggle Dark Mode", "Preferences", Moon),
  cmd("toggle-sidebar", "Toggle Sidebar", "Preferences", Sidebar),
  cmd("settings", "Open Settings", "Preferences", Gear),
  cmd("go-to-file", "Go to File…", "Navigation", ArrowRight),
  cmd("go-to-symbol", "Go to Symbol…", "Navigation", TextAa),
  cmd("go-to-line", "Go to Line…", "Navigation", ArrowRight),
];

const commandSource = createStaticSource(COMMANDS);

// An async source (~450 ms) — the Props loading demo.
const asyncSource: TypeaheadSource = {
  search: async (q) => {
    await new Promise((r) => setTimeout(r, 450));
    const ql = q.toLowerCase().trim();
    return ql ? COMMANDS.filter((c) => c.label.toLowerCase().includes(ql)) : COMMANDS;
  },
  bootstrap: async () => {
    await new Promise((r) => setTimeout(r, 450));
    return COMMANDS;
  },
};
const emptySource: TypeaheadSource = { search: () => Promise.resolve([]), bootstrap: () => Promise.resolve([]) };
const errorSource: TypeaheadSource = {
  search: async () => {
    throw new Error("network boom");
  },
  bootstrap: async () => {
    throw new Error("network boom");
  },
};

/* A calm inline specimen — a bounded box, never a modal. */
function InlinePalette(props: Partial<React.ComponentProps<typeof CommandPalette>> = {}) {
  return (
    <Box style={{ maxWidth: 480 }}>
      <CommandPalette open isInline source={commandSource} onOpenChange={() => {}} {...props} />
    </Box>
  );
}

/* The token spec's measurement surface. Two REAL palettes render into the measurement host: one
   picker-mode palette (its listbox carries the option, group-heading, active and selected rows) and one
   whose source REJECTS (the error row). Both bootstrap asynchronously, so the rows wait for the last
   part to arrive — this gates only WHEN they read, never WHAT they read. */
function WhenPresent({ within, select, children }: { within: RefObject<HTMLElement | null>; select: string; children: React.ReactNode }) {
  const [ready, setReady] = useState(false);
  // useEffect, not useLayoutEffect: a parent's ref is attached AFTER its children's layout effects run.
  useEffect(() => {
    const root = within.current;
    if (!root) return;
    if (root.querySelector(select)) { setReady(true); return; }
    const observer = new MutationObserver(() => {
      if (root.querySelector(select)) { setReady(true); observer.disconnect(); }
    });
    observer.observe(root, { childList: true, subtree: true });
    return () => observer.disconnect();
  }, [within, select]);
  return ready ? <>{children}</> : null;
}

/* A picker opens with its cursor ON the preselected row, where the neutral highlight deliberately wins —
   so the muted-accent SELECTED tint has nothing to paint until the cursor moves off. Moving it is a
   keystroke, not a prop, so this presses the real ArrowDown on the palette's own input, once, as soon as
   the bootstrapped list has arrived. The tint the row then reads is the one a reader sees after their
   first arrow key; nothing about it is arranged by the story. */
function ArrowOffTheSelectedRow({ children }: { children: React.ReactNode }) {
  const box = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const root = box.current;
    if (!root) return;
    let done = false;
    const press = () => {
      if (done) return;
      const seated = root.querySelector('.rt-ds-cmdk-option[aria-selected="true"][data-highlighted]');
      const input = root.querySelector<HTMLInputElement>(".rt-ds-cmdk-input");
      if (!seated || !input) return;
      done = true;
      input.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowDown", bubbles: true }));
      observer.disconnect();
    };
    const observer = new MutationObserver(press);
    observer.observe(root, { childList: true, subtree: true, attributes: true });
    press();
    return () => observer.disconnect();
  }, []);
  return <div ref={box}>{children}</div>;
}

function PaletteMeasurements() {
  const wrap = useRef<HTMLDivElement>(null);
  return (
    <Flex direction="column" gap="4">
      <TokenGroup label="SURFACE" blurb="The top-anchored panel — the same opaque overlay as every other floating surface, and the same rule paints the inline preview the rows below are read off. Modal motion is inherited from the shared Dialog binding.">
        <div ref={wrap}>
          <MeasuredSpec
            render={() => (
              <>
                <ArrowOffTheSelectedRow>
                  <CommandPalette open isInline source={commandSource} value="go-to-line" onOpenChange={() => {}} label="Palette paint measurement" />
                </ArrowOffTheSelectedRow>
                <CommandPalette open isInline source={errorSource} onOpenChange={() => {}} label="Palette error measurement" />
              </>
            )}
          >
            <WhenPresent within={wrap} select=".rt-ds-cmdk-error">
              <MeasuredRow
                part="Panel surface"
                note="Opaque, so the page behind never shows through the results."
                token="--ds-bg-overlay"
                select=".rt-ds-commandpalette"
                prop="background-color"
              />
              <MeasuredRow
                part="Hairline / footer rule"
                note="Separates the input row from the results, and the results from the hint footer."
                token="--ds-stroke-weak"
                select=".rt-ds-cmdk-divider"
                prop="background-color"
              />
              <MeasuredRow
                part="Option text"
                token="--ds-text-strong"
                select=".rt-ds-cmdk-option"
                prop="color"
              />
              <MeasuredRow
                part="Group heading"
                note="The quiet label above each group of rows."
                token="--ds-text-weak"
                select=".rt-ds-cmdk-grouplabel"
                prop="color"
              />
              <MeasuredRow
                part="Active row"
                note="The neutral cursor — pointer or keyboard, one vocabulary."
                token="--ds-fill-hover"
                select=".rt-ds-cmdk-option[data-highlighted]"
                prop="background-color"
              />
              <MeasuredRow
                part="Selected row (picker)"
                note="A muted-accent tint, only in picker mode — and only once the cursor moves OFF it: the palette opens with the cursor on the selected row, where the neutral highlight deliberately wins. The measured palette has had one ArrowDown pressed on it, which is exactly when a reader first sees this."
                token="--ds-fill-selected-subtle"
                select='.rt-ds-cmdk-option[aria-selected="true"]:not([data-highlighted])'
                prop="background-color"
              />
              <MeasuredRow
                part="Error row · text + glyph"
                note="Error tone, restrained — the row sits OUTSIDE the listbox."
                token="--ds-text-error"
                select=".rt-ds-cmdk-error"
                prop="color"
              />
              <MeasuredRow
                part="Error row · tint"
                token="--ds-fill-error-weak"
                select=".rt-ds-cmdk-error"
                prop="background-color"
              />
            </WhenPresent>
          </MeasuredSpec>
        </div>
        <NoteRow part="Elevation" value="--ds-shadow-overlay — a hairline ring plus a drop shadow" />
        <NoteRow part="Radius" value="--ds-radius-3" />
      </TokenGroup>
    </Flex>
  );
}

/* A STATIC state panel (plain divs on the real CSS classes) — the honest way to show the empty / error
   states without a live scrollable listbox (mirrors Typeahead's PanelSpecimen; keeps docs axe-clean). */
function StatePanel({ children }: { children: React.ReactNode }) {
  // The step the LIVE palette resolves for the reader's tier — the same call CommandPalette makes
  // internally. Hardcoding rt-r-size-1 froze these state panels at the small step while the live
  // specimen beside them moved with uiSize, so the two disagreed on every tier but small.
  const panelSize = useResolvedSize<string>("control", undefined) ?? "1";
  return (
    <Box className={`rt-ds-commandpalette rt-ds-commandpalette-inline rt-r-size-${panelSize}`} style={{ maxWidth: 360, maxHeight: "none" }}>
      {children}
    </Box>
  );
}

/* The static ERROR row. Both its copy and its Retry ride the palette's RESOLVED step — the same call
   CommandPalette makes for the live row's <Text> and <Button> — so the mirror and the component agree on
   every tier. Freezing either at "2" makes this panel a lie at small and large. */
function ErrorRowSpecimen() {
  const size = useResolvedSize<"1" | "2" | "3">("control", undefined) ?? "1";
  return (
    <div className="rt-ds-cmdk-error">
      <Flex align="center" gap="2" style={{ minWidth: 0 }}>
        <WarningCircle size={16} weight="fill" aria-hidden style={{ flexShrink: 0 }} />
        <Text size={size} style={{ color: "inherit", lineHeight: 1.5 }}>Couldn’t load results.</Text>
      </Flex>
      <Text size={size} style={{ color: "var(--ds-text-weak)", whiteSpace: "nowrap" }}>Try again</Text>
    </div>
  );
}

// A live isInline palette persistently shows its listbox, which trips axe's scrollable-region-focusable —
// a FALSE POSITIVE for the ARIA combobox pattern (the input's arrow keys move the active option AND
// auto-scroll the listbox, so keyboard access IS provided per APG). Scoped off for the specimen stories.
const CMDK_A11Y = { rules: [{ id: "scrollable-region-focusable", enabled: false }] };

/* ========================================================================== */

const meta: Meta<typeof CommandPalette> = {
  title: "Components/Modals & Popovers/CommandPalette",
  component: CommandPalette,
  parameters: {
    controls: { disable: true },
    docs: {
      description: {
        component:
          "**CommandPalette** — a ⌘K search-to-act (or search-to-pick) surface: a top-anchored modal " +
          "holding a chrome-less search input over a grouped, keyboard-navigable listbox. It rides the " +
          "SAME combobox engine as **Typeahead** (extracted to `useComboboxEngine`), turning on two " +
          "deltas — optimistic substring narrowing and a committed-query empty line. The shell is the RAW " +
          "Radix Themes `Dialog` (the System `Dialog` wrapper is not yet available), inheriting the shared " +
          "modal motion for free.",
      },
    },
  },
};
export default meta;
type Story = StoryObj<typeof CommandPalette>;

/* ---- anatomy diagram ------------------------------------------------------
   The palette's parts are STACKED — input row, hairline, grouped listbox, footer — so the callouts sit
   in the gutters either side and run a leader line into the part they name. TWO gutters, because a
   single one collapses: the input and its trailing slot share one vertical midpoint, and so do the
   active row and its neighbours. Parts on the row's right edge (the trailing slot) and the row the
   cursor sits on are pushed to the RIGHT gutter; the input is anchored to its own TOP edge rather than
   to a centre it shares with the slot beside it.

   Every y is MEASURED off the live specimen. Row height, group padding and the type step all move with
   the control lane, so a literal offset would be right on exactly one tier and wrong on the other two. */

/* Frame geometry. The gutter is set as a PROPORTION of the specimen, the way the house diagrams are:
   TreeList runs 56 beside a 320px specimen (17.5%) and ChatComposer 60 beside 520 (11.5%). This panel
   is 440 wide, so the 60 it used to carry was 13.6% — the tightest of the three against the widest,
   heaviest specimen (an opaque, shadowed surface, and SEVEN callouts rather than five). Measured, the
   dots sat 40px off the panel with 34px leaders and read as pinned ONTO it. 80 is TreeList's proportion
   at this measure (18.2%): dots 60px clear, leaders 54px.

   paddingBottom exists because callout 7 anchors the FOOTER — the last thing in the panel — so its dot
   lands 9px above the specimen's bottom edge and, with the legend 12px under that, the diagram ran
   straight into its own key. TreeList's last dot clears its frame bottom by 51px; 32 here buys 41. */
const DIAGRAM_GUTTER = 80;
const DIAGRAM_FRAME_W = 440;
const DIAGRAM_PAD_BOTTOM = 32;

/* A FOUR-command source (two groups of two) rather than the nine-command demo set: the inline surface
   caps at 380px and the full set overflows that at the large tier, and a pin measured on a row that has
   scrolled out of the box lands on a pixel the reader cannot see. */
const DIAGRAM_COMMANDS: TypeaheadOption[] = [
  cmd("new-file", "New File", "Actions", FilePlus),
  cmd("save-all", "Save All", "Actions", FloppyDisk),
  cmd("toggle-theme", "Toggle Dark Mode", "Preferences", Moon),
  cmd("settings", "Open Settings", "Preferences", Gear),
];
const diagramSource = createStaticSource(DIAGRAM_COMMANDS);

/** [callout number, selector, where on the element to anchor, which gutter].
 *
 *  The group heading is pinned on the SECOND group and the resting option on the FIRST, so the five
 *  left-gutter callouts spread down the panel instead of stacking three dots inside one 40px band.
 *  Numbers run top-to-bottom, so the legend reads in the order the eye travels. */
const PINS: [number, string, "top" | "center", "left" | "right"][] = [
  [1, ".rt-ds-cmdk-input", "top", "left"],
  [2, ".rt-ds-cmdk-trail", "center", "right"],
  [3, ".rt-ds-cmdk-divider", "center", "left"],
  [4, ".rt-ds-cmdk-option:not([data-highlighted])", "center", "left"],
  [5, ".rt-ds-cmdk-group + .rt-ds-cmdk-group .rt-ds-cmdk-grouplabel", "center", "left"],
  [6, ".rt-ds-cmdk-option[data-highlighted]", "center", "right"],
  [7, ".rt-ds-cmdk-footer", "center", "left"],
];

function AnatomyDiagram() {
  const frame = useRef<HTMLDivElement>(null);
  const specimen = useRef<HTMLDivElement>(null);
  const [pins, setPins] = useState<Record<number, number>>({});

  useLayoutEffect(() => {
    const f = frame.current;
    const s = specimen.current;
    if (!f || !s) return;
    const measure = () => {
      const top = f.getBoundingClientRect().top;
      const next: Record<number, number> = {};
      for (const [n, sel, anchor] of PINS) {
        const el = s.querySelector<HTMLElement>(sel);
        if (!el) continue;
        const box = el.getBoundingClientRect();
        next[n] = Math.round(box.top + (anchor === "top" ? 0 : box.height / 2) - top);
      }
      setPins(next);
    };
    measure();
    // The rows arrive from an async bootstrap, so the first measure runs on an empty panel — the
    // observer re-measures the moment the listbox (and with it the seated cursor row) lands, and again
    // on every size-toolbar flip.
    let raf = 0;
    const ro = new ResizeObserver(() => { cancelAnimationFrame(raf); raf = requestAnimationFrame(measure); });
    ro.observe(f);
    ro.observe(s);
    return () => { cancelAnimationFrame(raf); ro.disconnect(); };
  }, []);

  return (
    <Box style={{ overflowX: "auto" }}>
      <Box
        ref={frame}
        /* paddingTop: callout 1 is anchored to the input's TOP edge, so without a band above the
           specimen its dot is drawn half outside the frame and clipped.
           margin auto: the frame is a fixed measure inside a much wider docs column — centred, it reads
           as a diagram; flush left it read as a small thing stranded beside empty space. Auto margins
           collapse to 0 when the column is narrower than the frame, so the scroller still works. */
        style={{
          position: "relative", width: DIAGRAM_FRAME_W + DIAGRAM_GUTTER * 2, margin: "0 auto",
          paddingLeft: DIAGRAM_GUTTER, paddingRight: DIAGRAM_GUTTER,
          paddingTop: 16, paddingBottom: DIAGRAM_PAD_BOTTOM,
        }}
      >
        <Box ref={specimen} style={{ width: DIAGRAM_FRAME_W }}>
          {/* The SAME inline surface every other specimen on this page uses — a picker (`value`), which
              is what seats the cursor on a row at open, so callout 6 has a real active row to name. */}
          <CommandPalette
            open
            isInline
            source={diagramSource}
            value="toggle-theme"
            onValueChange={() => {}}
            onOpenChange={() => {}}
            label="Palette anatomy specimen"
          />
        </Box>

        {PINS.map(([n, , , side]) => {
          const y = pins[n];
          if (y == null) return null;
          const right = side === "right";
          return (
            <Box key={n}>
              <Box style={{ ...dotStyle, left: right ? DIAGRAM_GUTTER + DIAGRAM_FRAME_W + DIAGRAM_GUTTER - 20 : 0, top: y - 10 }}>{n}</Box>
              <Box
                style={hLine(
                  right
                    ? { left: DIAGRAM_GUTTER + DIAGRAM_FRAME_W + 4, top: y, width: DIAGRAM_GUTTER - 26 }
                    : { left: 22, top: y, width: DIAGRAM_GUTTER - 26 },
                )}
              />
            </Box>
          );
        })}
      </Box>
    </Box>
  );
}

const ANATOMY_PARTS: [number, string, string][] = [
  [1, "Search input", "a chrome-less combobox pinned at top with a leading magnifier — no visible label (named via aria-label); typing filters the source"],
  [2, "Trailing slot", "reserved at the row's right edge; a Spinner mounts here while a search is in flight, and only after a 150ms grace so a fast resolve never flashes it"],
  [3, "Hairline", "a 1px --ds-stroke-weak rule separating the input from the results"],
  [4, "Option (rest)", "a selectable command row — the whole row is the click target"],
  [5, "Group heading", "a quiet weak label naming a role=group; visual only — headings are never options, so arrows flow straight across them"],
  [6, "Active row", "the pointer or keyboard active-descendant — the neutral --ds-fill-hover layer, reused from Select / MultiSelect. Here it is seated on the picker's preselected command, which is where a palette opens its cursor"],
  [7, "Footer", "a quiet Kbd-hint row (↑↓ navigate · ↵ select · Esc close), marked aria-hidden (redundant for AT)"],
];

/** Anatomy — the labelled parts of the palette and its empty / error states. The live token spec closes
 *  the Usage page. */
export const Anatomy: Story = {
  parameters: { a11y: { config: CMDK_A11Y } },
  render: () => (
    <Page>
      <PageHeader title="CommandPalette · Anatomy" standfirst={DEFINITION} />
      <Section title="Anatomy" lead="A top-anchored opaque panel: a chrome-less search input pinned at top, a hairline, a scrollable grouped listbox, and an aria-hidden Kbd-hint footer. The numbered callouts label a real, working palette rather than a picture of one — their positions are measured live, so each dot stays on its part when the toolbar above resizes the panel.">
        <AnatomyDiagram />
        <AnatomyLegend parts={ANATOMY_PARTS} />
        <Caption>
          The panel paints the surface, not its parts: the input draws no border, fill or ring of its
          own, and the rows carry only a highlight — so the reader sees one box, not a box of boxes.
        </Caption>
      </Section>

      <Rule />

      <Section title="States" lead="Empty-on-open shows the bootstrap resting set (never a blank box). A no-match search echoes the committed query on a quiet line — editing is the recovery, no clear button. A REJECTED search gets its own error row + Retry, OUTSIDE the listbox — never disguised as empty. The specimens below use the real system tokens and follow the toolbar accent.">
        <Grid columns={{ initial: "1", sm: "2" }} gapX="6" gapY="4" align="start">
          <Flex direction="column" gap="2">
            <Text size="1" weight="bold" style={{ color: "var(--ds-text-weak)", letterSpacing: "0.06em" }}>EMPTY — echoes the query</Text>
            <StatePanel><div className="rt-ds-cmdk-empty">No commands match “xyzzy”</div></StatePanel>
            <Caption>A completed no-match search echoes the committed query — editing is the recovery, no blunt reset.</Caption>
          </Flex>
          <Flex direction="column" gap="2">
            <Text size="1" weight="bold" style={{ color: "var(--ds-text-weak)", letterSpacing: "0.06em" }}>ERROR — distinct + retry</Text>
            <StatePanel><ErrorRowSpecimen /></StatePanel>
            <Caption>A rejected search surfaces a restrained error row + Retry (Enter re-runs) — not “no results”.</Caption>
          </Flex>
        </Grid>
      </Section>
    </Page>
  ),
};

/** Usage — when to reach for a CommandPalette, the rules that keep it honest, and the live token spec
 *  that closes the page. */
export const Usage: Story = {
  // Two scoped carve-outs, both by name:
  //  • DODONT_LABEL — the DO/DON'T word alone (step-11 ink on its own step-3 tint, 4.10 at 12px bold).
  //    The specimens inside the cards stay checked; the old "[data-dodont]" excused the whole card.
  //  • scrollable-region-focusable — fires on .rt-ds-cmdk-scroll, the result list, which scrolls but is
  //    not itself tabbable. That is the pattern, not a defect: a command palette keeps DOM focus in the
  //    input and drives the list with aria-activedescendant, so the list must NOT take a tab stop.
  //    Keyboard reachability is covered by the Keyboard story instead.
  parameters: { a11y: { context: { exclude: [DODONT_LABEL] }, config: { rules: [{ id: "scrollable-region-focusable", enabled: false }] } } },
  render: (_args, { globals }) => (
    <HexThemeKey.Provider value={`${globals.accent}-${globals.appearance}-${globals.contrast}`}>
    <Page>
      <PageHeader title="CommandPalette · Usage" standfirst={DEFINITION} />

      <ComparisonSection comparison={SEARCH_SURFACES_COMPARISON} highlight="CommandPalette" />

      <Rule />

      <Section title="CommandPalette vs. its neighbours" lead="Pick the surface that matches the shape of the task.">
        <Grid columns={{ initial: "1", sm: "2" }} gapX="6" gapY="4">
          <Scenario label="COMMAND PALETTE" caption={<>Search-to-<strong>act</strong> across MANY commands / destinations — a ⌘K launcher. Opens over the app, grouped, keyboard-first.</>}>
            <InlinePalette />
          </Scenario>
          <Scenario label="TYPEAHEAD" caption={<>Pick <strong>one</strong> value into a <strong>form field</strong> by searching — an assignee, a repo. Inline, rides the Field shell.</>}>
            <Box style={{ paddingTop: 4 }}><Muted>a labelled field with a value — not a modal launcher</Muted></Box>
          </Scenario>
          <Scenario label="SELECT / MULTISELECT" caption={<>A short, <strong>fixed</strong> list (single or many) — no search, no modal. Use <Code>Select</Code> / <Code>MultiSelect</Code>.</>}>
            <Box style={{ paddingTop: 4 }}><Muted>country · status · tags — known and few</Muted></Box>
          </Scenario>
          <Scenario label="DROPDOWN MENU" caption={<>A handful of <strong>actions</strong> off a trigger — no search. Use <Code>DropdownMenu</Code>.</>}>
            <Box style={{ paddingTop: 4 }}><Muted>row actions, a kebab menu — small and contextual</Muted></Box>
          </Scenario>
        </Grid>
      </Section>

      <Rule />

      <Section title="A failure is not an empty list" lead="Like Typeahead, the palette refuses to collapse a rejected search into “nothing found”. A network failure gets its own error-tone row + a Retry (Enter re-runs); an empty search echoes the query so the user edits rather than resets.">
        <Grid columns={{ initial: "1", sm: "2" }} gap="3">
          <DoDont kind="do" bare note="Open into the bootstrap resting set (Recent / Actions), and keep the empty / error states distinct — the user always knows whether the system read them, found nothing, or failed.">
            <InlinePalette />
          </DoDont>
          <DoDont kind="dont" bare note="Opening to a blank box, or swallowing an error into “No results”, leaves the user re-typing a query that will never work — the exact lie the engine exists to close.">
            <InlinePalette source={errorSource} />
          </DoDont>
        </Grid>
        <Caption>The footer is marked <Mono>aria-hidden</Mono> — the combobox roles and the live-region announcer carry operability for assistive tech, so the visual Kbd hints never double up.</Caption>
      </Section>

      <Rule />

      {/* The token spec CLOSES this page — the reference a reader drops to after the guidance, not
          something they wade through on the way to it. */}
      <Section title="Tokens" lead="The palette's real --ds-* roles, measured off two live palettes — a picker-mode one for the surface and listbox rows, and one whose search rejects for the error row. Every floating surface (Typeahead / Select / MultiSelect / DateInput) shares this opaque overlay treatment.">
        <PaletteMeasurements />
      </Section>
    </Page>
    </HexThemeKey.Provider>
  ),
  play: async ({ canvasElement }) => {
    // The token table's EVIDENCE, asserted at runtime — every row read a REAL palette (the picker one
    // for the surface + listbox, the rejecting one for the error row), never a probe. The picker has one
    // ArrowDown pressed on it so the selected-row tint exists to be read. `awaitMeasuredRows` waits for
    // every row to record its evidence; the rows themselves wait for the async bootstrap.
    const rows = await awaitMeasuredRows(canvasElement);
    if (rows.measured !== 8 || rows.unproven !== 0) {
      throw new Error(`expected 8 measured / 0 unproven token rows, got ${rows.measured} / ${rows.unproven}`);
    }
  },
};

/* ---- keyboard ------------------------------------------------------------ */

const KEYS: KeyBinding[] = [
  { keys: ["A–Z 0–9"], action: <>Type to <strong>filter</strong> the source (debounced); results narrow optimistically while an async source resolves.</>, src: "system" },
  { keys: ["↓", "↑"], action: <>Move the active row down / up with <strong>wrap-around</strong>, flowing <strong>continuously across group boundaries</strong>. DOM focus never leaves the input — only <Code>aria-activedescendant</Code> moves.</>, src: "system" },
  { keys: ["Home", "End"], action: "Jump the active row to the first / last command.", src: "system" },
  { keys: ["Enter"], action: <>Run the active command (fires <Code>onSelect</Code> / <Code>onValueChange</Code> and closes) — <strong>or</strong> re-run the query when the panel is in the error state.</>, src: "system" },
  { keys: ["Esc"], action: <>Close the palette (handled by the Dialog’s own dismiss — no duplicate handler).</>, src: "system" },
];

/** Keyboard — the complete key → action contract. */
export const Keyboard: Story = {
  parameters: { a11y: { config: CMDK_A11Y } },
  render: () => (
    <Page>
      <PageHeader title="CommandPalette · Keyboard" standfirst={DEFINITION} />
      <Section title="Keyboard" lead={<>The full key → action contract. This is an <strong>aria-activedescendant</strong> combobox inside a modal dialog: DOM focus stays on the search input, and the arrows move a virtual cursor over the grouped options — crossing group headings as if they weren’t there.</>}>
        <Box style={{ maxWidth: 480 }}>
          <InlinePalette />
        </Box>
        <Flex direction="column" gap="4">
          <TokenGroup label="SEARCH · NAVIGATE · ACT">
            {KEYS.map((b) => <KeyRow key={b.keys.join("+")} {...b} />)}
          </TokenGroup>
        </Flex>
        <Caption><strong>Pointer</strong> — hovering a row moves the highlight (guarded so a keyboard scroll under a stationary cursor never steals the row); clicking runs the command. A completed search announces its outcome through a polite live region.</Caption>
      </Section>
    </Page>
  ),
};

/* ---- properties ---------------------------------------------------------- */

const PROPS: PropDef[] = [
  { name: "open / onOpenChange", type: "boolean / (o) => void", desc: <>Controlled visibility. Opening stays consumer-owned — there is no built-in ⌘K hotkey (deferred).</>, source: "CommandPalette.tsx" },
  { name: "source", type: "TypeaheadSource<T>", desc: <><Code>{`{ search(query), bootstrap?(), cancel?() }`}</Code> — the same contract as Typeahead. <Code>bootstrap()</Code> seeds the resting set shown on open.</>, source: "CommandPalette.tsx" },
  { name: "value", type: "string", desc: <>PICKER mode — the selected option id (the matching row gets <Code>aria-selected</Code> + a muted-accent paint). Omit for a LAUNCHER (no persistent selection).</>, source: "CommandPalette.tsx" },
  { name: "onValueChange", type: "(value: string) => void", desc: <>Fires with the picked option’s id.</>, source: "CommandPalette.tsx" },
  { name: "onSelect", type: "(option: T) => void", desc: <>Fires with the full picked option (auxiliaryData carried) — a launcher acts here.</>, source: "CommandPalette.tsx" },
  { name: "renderItem", type: "(o, isSelected) => ReactNode", desc: <>Custom per-row content; grouping is preserved. Omitted, renders <Code>option.element</Code> / <Code>option.label</Code>.</>, source: "CommandPalette.tsx" },
  { name: "emptyText / emptyBootstrapText", type: "ReactNode", desc: <>No-match copy (<Code>undefined</Code> echoes the committed query) and the pre-results / empty-bootstrap copy.</>, source: "CommandPalette.tsx" },
  { name: "errorText", type: "ReactNode", def: `"Couldn't load results."`, desc: <>The distinct error copy, shown with Retry when a search rejects.</>, source: "CommandPalette.tsx" },
  { name: "placeholder", type: "string", def: `"Search commands…"`, desc: <>The input placeholder — name the object, not “Search”.</>, source: "CommandPalette.tsx" },
  { name: "label / inputLabel / listLabel", type: "string", desc: <>Accessible names for the dialog, the combobox input (no visible label), and the listbox.</>, source: "CommandPalette.tsx" },
  { name: "showFooter", type: "boolean", def: "true", desc: <>The aria-hidden Kbd-hint footer.</>, source: "CommandPalette.tsx" },
  { name: "maxItems", type: "number", def: "50", desc: <>Cap the rendered result count.</>, source: "CommandPalette.tsx" },
  { name: "debounceMs", type: "number", def: "0", desc: <>Delay before firing <Code>source.search</Code>. <Code>0</Code> filters synchronously.</>, source: "CommandPalette.tsx" },
  { name: "size", type: `"1" | "2" | "3"`, def: `"1"`, desc: <>Control size; unset, resolves from the global <Code>uiSize</Code> control lane (default small → 1).</>, source: "CommandPalette.tsx" },
  { name: "isInline", type: "boolean", def: "false", desc: <>Docs/preview mode — a plain bounded box (no dialog, backdrop, trap, autofocus, or mount-scroll).</>, source: "CommandPalette.tsx" },
];

/* ---- playground ---------------------------------------------------------- */

const SOURCE_LABELS: Record<string, string> = {
  static: "static commands (sync)",
  async: "async (~450 ms)",
  error: "always errors",
  empty: "empty results",
};

type PropsArgs = {
  sourceKind: "static" | "async" | "error" | "empty";
  isInline: boolean;
  showFooter: boolean;
  pickerValue: string;
  size: "auto" | "1" | "2" | "3";
  placeholder: string;
  debounceMs: number;
  maxItems: number;
};

/** Props — the live, args-driven palette. Swap the source, toggle inline / footer / picker value,
 *  and drive every prop from Controls. */
export const Props: StoryObj<PropsArgs> = {
  args: {
    sourceKind: "static",
    isInline: false,
    showFooter: true,
    pickerValue: "none",
    // "auto" (size unset) is the default so the palette tracks the global uiSize toolbar out of the box.
    size: "auto",
    placeholder: "Search commands…",
    debounceMs: 0,
    maxItems: 50,
  },
  argTypes: {
    sourceKind: { name: "source", control: "inline-radio", options: ["static", "async", "error", "empty"], table: { category: "Behaviour" } },
    isInline: { control: "boolean", table: { category: "Mode" } },
    showFooter: { control: "boolean", table: { category: "Mode" } },
    pickerValue: {
      name: "value (picker)",
      control: "inline-radio",
      options: ["none", "new-file", "toggle-theme", "go-to-file"],
      table: { category: "Behaviour" },
    },
    size: { control: "inline-radio", options: ["auto", "1", "2", "3"], description: '"auto" tracks the global uiSize toolbar (unset); a step pins it.', table: { category: "Variant" } },
    placeholder: { control: "text", table: { category: "Field" } },
    debounceMs: { control: { type: "range", min: 0, max: 600, step: 50 }, table: { category: "Behaviour" } },
    maxItems: { control: { type: "range", min: 1, max: 50, step: 1 }, table: { category: "Behaviour" } },
  },
  parameters: { controls: { disable: false } },
  render: (args: PropsArgs) => {
    const [open, setOpen] = useState(false);
    const source = { static: commandSource, async: asyncSource, error: errorSource, empty: emptySource }[args.sourceKind];
    const value = args.pickerValue === "none" ? undefined : args.pickerValue;
    const palette = (
      <CommandPalette
        key={`${args.sourceKind}-${args.isInline}`}
        open={args.isInline ? true : open}
        onOpenChange={setOpen}
        source={source}
        value={value}
        onValueChange={() => {}}
        showFooter={args.showFooter}
        size={args.size === "auto" ? undefined : args.size}
        placeholder={args.placeholder}
        debounceMs={args.debounceMs}
        maxItems={args.maxItems}
        isInline={args.isInline}
      />
    );
    return (
      <Page maxWidth="none">
        <PageHeader title="CommandPalette · Props" standfirst={DEFINITION} />
        <Box p="5">
          {args.isInline ? (
            <Box style={{ maxWidth: 520 }}>{palette}</Box>
          ) : (
            <>
              <Button onClick={() => setOpen(true)}>
                <MagnifyingGlass weight="bold" /> Open command palette
              </Button>
              {palette}
            </>
          )}
          <Box mt="3">
            <Caption>
              Source: <Mono>{SOURCE_LABELS[args.sourceKind]}</Mono>
              {value ? <> · picker value <Mono>{value}</Mono></> : <> · launcher (no value)</>}.{" "}
              {args.isInline ? "Inline preview." : "Click to open the modal; type to filter, arrow across groups, Enter to run, Esc to close."}
            </Caption>
          </Box>
        </Box>
        <PropsLead />
        <Rule />
        <Section title="Props reference" lead={<>Every prop <Code>CommandPalette</Code> accepts — the <Code>source</Code> owns filtering, <Code>value</Code> / <Code>onValueChange</Code> add picker mode, and the rest tune the surface.</>}>
          <PropTable rows={PROPS} />
        </Section>
      </Page>
    );
  },
};

/** History — the rulings this component encodes and a changelog of how it changes over time. */
export const History: Story = {
  render: () => (
    <Page>
      <PageHeader title="CommandPalette · History" standfirst={DEFINITION} />
      <Section title="Decisions" lead="The rulings this component encodes.">
        <Flex direction="column" gap="3">
          <Decision id="[[command-palette]] · engine">
            <strong>One engine, two surfaces.</strong> The async pipeline and the roving
            aria-activedescendant machine are extracted from the flagship <Code>Typeahead</Code> into{" "}
            <Code>useComboboxEngine</Code> (<Code>useAsyncSearch</Code> + <Code>useListboxNavigation</Code>),
            so CommandPalette and Typeahead share ONE combobox brain. The extraction is behavior-preserving —
            Typeahead passes neither delta, so its behavior is unchanged.
          </Decision>
          <Decision id="[[command-palette]] · deltas">
            Two engine deltas are turned ON here (opt-in, off for Typeahead): <strong>optimistic
            narrowing</strong> (client-filter the shown rows while the async source resolves) and{" "}
            <strong>committed-query empty text</strong> (“No commands match …” echoes the COMMITTED query, so
            it holds steady while a no-result search is pending). There is <strong>no letter-jump</strong>
            path — typing in the search field is the only way to narrow.
          </Decision>
          <Decision id="[[command-palette]] · shell">
            The shell is the <strong>raw Radix Themes <Code>Dialog</Code></strong> — the System{" "}
            <Code>Dialog</Code> wrapper is <Code>status:"planned"</Code> in the registry, so we compose the
            raw Radix primitive directly (a thin wrap, like <Code>AlertDialog</Code>) rather than improvise a{" "}
            <Code>System/Dialog</Code>. Modal enter/exit motion is
            inherited from the shared <Code>.rt-BaseDialogContent</Code> binding — no per-component override.
          </Decision>
          <Decision id="[[command-palette]] · groups">
            The <strong>flat activedescendant order AND the render tree</strong> derive from ONE{" "}
            <Code>groupItems</Code> call, so the two can never disagree. Group headings are visual only
            (a <Code>role="group"</Code> with an <Code>aria-labelledby</Code> heading) — never options — so
            arrows flow continuously across group boundaries.
          </Decision>
          <Decision id="[[command-palette]] · launcher/picker">
            A launcher has <strong>no persistent value</strong> — no option is <Code>aria-selected</Code>. As
            an optional picker (<Code>value</Code> + <Code>onValueChange</Code>), the matching option gets{" "}
            <Code>aria-selected</Code> + a muted-accent paint. A <strong>150ms delayed spinner</strong> keeps
            a fast (&lt;150ms) resolve from flashing the trailing slot.
          </Decision>
        </Flex>
      </Section>

      <Rule />

      <Section title="Changelog" lead="Notable changes, newest first — grows as the component evolves.">
        <Flex direction="column" gap="3">
          <Decision id="0.9.0">
            Initial <Code>System/CommandPalette</Code> — the ⌘K surface on the extracted combobox engine:
            top-anchored raw-Dialog shell, chrome-less search input, grouped listbox with cross-group arrow
            flow, optimistic narrowing, committed-query empty line, distinct retryable error, a 150ms delayed
            spinner, an aria-hidden Kbd-hint footer, and an <Code>isInline</Code> docs mode. Stories:
            History · Anatomy · Usage · Keyboard · Props.
          </Decision>
          <Decision id="Deferred">
            <strong>Global ⌘K hotkey</strong> (opening stays consumer-controlled via <Code>open</Code> /{" "}
            <Code>onOpenChange</Code>), <strong>frecency ranking</strong>, and <strong>nested / sub-command
            pages</strong> — named parks, revisited when a consumer needs them.
          </Decision>
        </Flex>
      </Section>
    </Page>
  ),
};
