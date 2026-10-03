/* =============================================================================
   _tabular-figures.stories.tsx — THE TABULAR-FIGURES ADOPTER MANIFEST
   -----------------------------------------------------------------------------
   GUIDELINES §3 states one law: a number that updates IN PLACE is set in tabular
   figures. `components.css` carries that law as a set of `font-variant-numeric:
   tabular-nums` declarations. This file is the roster of those declarations, and
   the three plays below hold the roster, the shipped CSS, and the rendered DOM to
   each other.

   BE EXACT ABOUT WHAT A GREEN HERE MEANS. The law fails in three different ways
   and each way needs its own arm — a green in one is not a green in another:

     • DECLARATION — EVERY registered selector, by `EverySiteDeclares` and
       `NoUnregisteredAdopter`. They walk `document.styleSheets` and read the
       DECLARATION off a `CSSStyleRule`; nothing is mounted. Forward: a deletion,
       a rename, or a demotion into a media query at any site goes red. Reverse: a
       rule that takes the property without registering here goes red. Together
       they make this table the adopter list rather than a copy of one — a prose
       roster in a doc needs editing on every future adoption and silently rots
       when nobody does; this one goes red.

     • EFFECTIVE VALUE — EVERY registered selector, by
       `EverySiteResolvesTabular`. It MOUNTS the real components and reads
       `getComputedStyle(el).fontVariantNumeric` off the element that actually
       holds the ink. This is the arm that catches a declaration which is PRESENT
       but OUTRANKED. That is not hypothetical: the AvatarGroup counter rule
       ~40 lines below its own note in `components.css` records losing its paint
       to a higher-specificity Radix rule that sat earlier in the file, with
       nothing failing. A declaration arm alone would have stayed green through
       that incident; appending
         `.radix-themes .rt-ds-powersearch-count.rt-ds-powersearch-count
            { font-variant-numeric: normal; }`
       to `components.css` was verified to leave the two declaration arms fully
       green, and to fail this one. Where the registered selector is a CONTAINER
       that declares for arbitrary slot content, the probe follows the INK into
       the descendant — inheritance is the intended shape there (GUIDELINES §3),
       so the assertion has to land where the digits are drawn, not on the slot.

     • PAINTED INK — TWO sites only, and by NEITHER kind of arm here. Both live
       where their specimen does, and both measure real glyph advance with
       `document.createRange()` rather than reading a computed style:
         · `TabularInfo` (`_pagination.stories.tsx`) flips the pager from
           "11–20 of 250" to "21–30 of 250" and asserts the two measure the same
           — the IN-PLACE case, the one the law is actually about.
         · `Usage` (`Table.stories.tsx`) asserts two equal-length amounts in one
           column measure the same — the column case.
       Those two are the only assertions in the system that prove the FONT really
       has tabular figures rather than that a CSS property resolved. NOTHING IN
       THIS FILE MEASURES A PIXEL. Read the three arms exactly as written: every
       registered selector DECLARED, every registered selector RESOLVED on the
       rendered element, and precisely two measured as INK. The roster's live
       length is rendered on the `Roster` page rather than typed here, so no
       number in this comment can go stale against it.

   NOT EFFECTIVELY CHECKED: none. Every registered selector is reachable in the
   `Specimens` render, INCLUDING Slider's hidden sizer — `visibility: hidden` is
   still laid out and still has a computed style, which is exactly the property
   that entry exists to keep equal to the input it measures for. If a future site
   cannot be mounted, list it here with its reason AND report it by name in
   `EverySiteResolvesTabular`'s message; a silent skip is the failure mode this
   header exists to prevent.

   The rule-scan idiom is the one `_statusdot.stories.tsx` / `_carousel.stories.tsx`
   established (walk `document.styleSheets`, skip a sheet whose `cssRules` throws
   cross-origin). `_storyKit`'s own `liveRules` helper is module-private and not
   exported, so — like both of those files — the walk is local.

   Underscore-prefixed → the `_internal` group, exempt from the story-order /
   story-category / page-header / registry node-guards, same as every fixture
   here. The specimens carry NO pinned `size`, so every control resolves the
   ambient tier and the per-story box law reads them at their own step.
   ============================================================================= */
import { useState } from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { Box, Flex, Text } from "@radix-ui/themes";
import { Avatar } from "./Avatar";
import { AvatarGroup } from "./AvatarGroup";
import { Badge } from "./Badge";
import { Button } from "./Button";
import { ChatMessageMetadata } from "./ChatMessageMetadata";
import { ChatToolCalls } from "./ChatToolCalls";
import { Lightbox } from "./Lightbox";
import { MultiSelect } from "./MultiSelect";
import { NumberInput } from "./NumberInput";
import { Pagination } from "./Pagination";
import { PowerSearch } from "./PowerSearch";
import { Slider } from "./Slider";
import { Table } from "./Table";
import { TextArea } from "./TextArea";
import { Timestamp } from "./Timestamp";
import { createPowerSearchConfig } from "../../powersearch/usePowerSearchConfig";

const PROP = "font-variant-numeric";
const VALUE = /\btabular-nums\b/;

/** One registered adopter of the tabular-figures law.
 *
 *  `selector` must equal the browser's own serialization of that comma-part of the shipped rule —
 *  `CSSStyleRule.selectorText` normalizes spacing and quotes (`[type="number"]` keeps its double
 *  quotes), and both declaration plays compare against that normalized form so a reformat of
 *  `components.css` can't drift the table without failing it. */
interface TabularSite {
  /** The exact selector part, as `selectorText` serializes it. */
  selector: string;
  /** The component and the slot — what a failure line has to name for the reader to find it. */
  site: string;
  /** Which number moves under a box that does not, in one line. */
  why: string;
  /** Set when the selector is a CONTAINER rather than the element that paints the digits: the
   *  content of the slot inherits the declaration. Names what is expected to inherit. */
  inheritedBy?: string;
  /** THE EFFECTIVE ARM'S PROBE — a selector, resolved against the whole document (portalled panels and
   *  the Lightbox dialog render outside the canvas), for the element that actually holds this site's
   *  INK inside `Specimens`. For a container entry this is deliberately a DESCENDANT with no rule of
   *  its own, so the assertion proves the inheritance the container shape depends on rather than
   *  re-reading the declaration one element up. Every entry has one; see the header. */
  paints: string;
}

/* -----------------------------------------------------------------------------
   THE ROSTER. Ordered as the declarations appear in `components.css`.
   A new adopter is added here in the SAME commit as its rule, or
   `NoUnregisteredAdopter` fails.
   -------------------------------------------------------------------------- */
const TABULAR_SITES: TabularSite[] = [
  {
    selector: '.radix-themes .rt-TextFieldInput[type="number"]',
    site: "Numeric field value (NumberInput, and Slider's paired input)",
    why: "the value moves a whole digit at a time under the stepper and the ↑/↓ keys",
    paints: 'input.rt-TextFieldInput[type="number"]',
  },
  {
    selector: ".radix-themes .rt-ds-textarea-count",
    site: "TextArea · showCount counter",
    why: "it re-renders on every keystroke, flush right in the support row",
    paints: ".rt-ds-textarea-count",
  },
  {
    selector: ".radix-themes .rt-ds-multiselect-status",
    site: "MultiSelect · panel “N of M selected”",
    why: "it sits directly left of Clear — a width change moves a button the user did not aim at",
    inheritedBy: "the count text inside the status row",
    // The status row's own child Text carries `role="status"` and no figure rule of its own.
    paints: '.rt-ds-multiselect-status [role="status"]',
  },
  {
    selector: ".radix-themes .rt-ds-multiselect-trigger-text",
    site: "MultiSelect · trigger “N selected”",
    why: "the trigger's own value text changes from two selections up",
    paints: ".rt-ds-multiselect-trigger-text",
  },
  {
    selector: ".radix-themes .rt-Badge",
    site: "Badge — the blanket (covers OverflowList's “+N” and ChatToolCalls' count badge)",
    why: "Badge exposes no counter API, so the treatment is a blanket; it costs nothing on non-digits",
    inheritedBy: "Token chips, whose container IS a .rt-Badge",
    paints: ".rt-Badge",
  },
  {
    selector: ".radix-themes .rt-AvatarRoot.rt-ds-avatar-count .rt-AvatarFallback",
    site: "AvatarGroup · “+N” overflow counter",
    why: "the disc's diameter never changes as people are added or removed, so the glyphs must not either",
    inheritedBy: "the fallback's “+N” node (a node, not a plain string)",
    // The decorative "+N" span inside the fallback — the announced "N more" is visually hidden, so the
    // aria-hidden node is the one that draws.
    paints: '.rt-ds-avatar-count .rt-AvatarFallback > span[aria-hidden="true"]',
  },
  {
    selector: ".radix-themes .rt-TableCell[data-numeric]",
    site: "Table · numeric column cells (the `numeric` prop)",
    why: "a column of amounts lines up digit for digit instead of drifting by the width of a “1”",
    paints: ".rt-TableCell[data-numeric]",
  },
  {
    selector: ".radix-themes .rt-TableColumnHeaderCell[data-numeric]",
    site: "Table · numeric column header (the `numeric` prop)",
    why: "the header rides the same column treatment as its cells",
    paints: ".rt-TableColumnHeaderCell[data-numeric]",
  },
  {
    selector: ".radix-themes .rt-ds-timestamp",
    site: "Timestamp",
    why: "a live relative tick (“in 5 seconds” → “in 4 seconds”) must not reflow ([[relative-timestamp]])",
    paints: ".rt-ds-timestamp",
  },
  {
    selector: ".radix-themes .rt-ds-pagination__page",
    site: "Pagination · page buttons",
    why: "the window slides, so the same button shows 7, then 8, then 9",
    paints: ".rt-ds-pagination__page",
  },
  {
    selector: ".radix-themes .rt-ds-pagination__info",
    site: "Pagination · count info row",
    why: "“11–20 of 250” → “21–30 of 250” under a stationary pair of arrows",
    paints: ".rt-ds-pagination__info",
  },
  {
    selector: ".radix-themes .rt-ds-lightbox-counter",
    site: "Lightbox · “N of M” counter",
    why: "it counts through the set while the chrome around it holds still",
    paints: ".rt-ds-lightbox-counter",
  },
  {
    selector: ".radix-themes .rt-ds-powersearch-count",
    site: "PowerSearch · result count",
    why: "it re-reads on every chip added, edited or removed, at the end of the row",
    paints: ".rt-ds-powersearch-count",
  },
  {
    selector: ".radix-themes .rt-ds-slider-mark-label",
    site: "Slider · mark labels",
    why: "a row of mark labels visibly jitters during a drag without it",
    paints: ".rt-ds-slider-mark-label",
  },
  {
    selector: ".radix-themes .rt-ds-slider-input .rt-ds-slider-input-sizer",
    site: "Slider · the hidden measuring stand-in",
    why:
      "the ONE entry that paints nothing — it is `visibility: hidden`. It is registered because it " +
      "must be laid out by the SAME metrics as the input it sizes, and the input takes the numeric-field " +
      "rule above; if the two ever disagree the measured box stops fitting the value ([[slider-composition]] amendment)",
    // Hidden, but laid out and styled — which is the whole point: its computed value is what has to
    // stay equal to the input's, and `getComputedStyle` reads it exactly as the layout engine did.
    paints: ".rt-ds-slider-input .rt-ds-slider-input-sizer",
  },
  {
    selector: ".radix-themes .rt-ds-chat-toolcalls-additions",
    site: "ChatToolCalls · “+N” additions",
    why: "the diff counts stream in as a call reports, on the same rail as the durations",
    paints: ".rt-ds-chat-toolcalls-additions",
  },
  {
    selector: ".radix-themes .rt-ds-chat-toolcalls-deletions",
    site: "ChatToolCalls · “−N” deletions",
    why: "the diff counts stream in as a call reports, on the same rail as the durations",
    paints: ".rt-ds-chat-toolcalls-deletions",
  },
  {
    selector: ".radix-themes .rt-ds-chat-toolcalls-duration",
    site: "ChatToolCalls · durations",
    why: "durations line up column-wise across rows, so a slow call is visible by shape",
    paints: ".rt-ds-chat-toolcalls-duration",
  },
  {
    selector: ".radix-themes .rt-ds-chat-meta-timestamp",
    site: "ChatMessageMetadata · timestamp slot",
    why: "a live relative time ticks in place under a stationary transcript",
    inheritedBy: "a plain string passed into the slot (the slot carries the rule, its content inherits)",
    // The specimen passes a BARE <span> into the slot — an element with no rule of its own, so a green
    // here is inheritance reaching arbitrary content, which is what the container shape promises.
    paints: ".rt-ds-chat-meta-timestamp > span",
  },
];

/* -----------------------------------------------------------------------------
   The scan
   -------------------------------------------------------------------------- */

/** Split a `selectorText` on its TOP-LEVEL commas only. The commas inside `:where(a, b)` and inside
 *  an attribute value belong to the part they sit in — cutting there produces fragments that match
 *  nothing, which is the same silent miss this guard exists to stop, one step earlier. */
function splitTopLevel(selectorText: string): string[] {
  const parts: string[] = [];
  let depth = 0;
  let quote = "";
  let start = 0;
  for (let i = 0; i < selectorText.length; i += 1) {
    const c = selectorText[i];
    if (quote) {
      if (c === "\\") i += 1;
      else if (c === quote) quote = "";
    } else if (c === '"' || c === "'") quote = c;
    else if (c === "(" || c === "[") depth += 1;
    else if (c === ")" || c === "]") depth -= 1;
    else if (c === "," && depth === 0) {
      parts.push(selectorText.slice(start, i).trim());
      start = i + 1;
    }
  }
  parts.push(selectorText.slice(start).trim());
  return parts.filter(Boolean);
}

/** Every selector part in the document that declares `font-variant-numeric: tabular-nums`,
 *  UNCONDITIONALLY.
 *
 *  Conditional groups are walked but recorded as conditional: a declaration parked inside
 *  `@media (min-width: …)` or `@supports (…)` is not the system's paint for everyone, and a manifest
 *  that accepted one would report a green for a site that is dark at most viewports. `@layer` and
 *  `@scope` are grouping rules WITHOUT a condition, so they are transparent here. */
function scanTabularParts(): { unconditional: Map<string, string>; conditional: Map<string, string> } {
  const unconditional = new Map<string, string>();
  const conditional = new Map<string, string>();
  const visit = (rules: CSSRuleList | undefined, gated: boolean) => {
    for (const rule of Array.from(rules ?? [])) {
      if (rule instanceof CSSImportRule) {
        try { visit(rule.styleSheet?.cssRules, gated); } catch { /* cross-origin sheet */ }
        continue;
      }
      const conditioned = gated || rule instanceof CSSMediaRule || rule instanceof CSSSupportsRule;
      if (rule instanceof CSSStyleRule && VALUE.test(rule.style.getPropertyValue(PROP))) {
        for (const part of splitTopLevel(rule.selectorText)) {
          (conditioned ? conditional : unconditional).set(part, rule.selectorText);
        }
      }
      if (rule instanceof CSSGroupingRule) visit(rule.cssRules, conditioned);
    }
  };
  for (const sheet of Array.from(document.styleSheets)) {
    try { visit(sheet.cssRules, false); } catch { /* cross-origin sheet */ }
  }
  return { unconditional, conditional };
}

/* -----------------------------------------------------------------------------
   The roster page (the two declaration plays render this; the assertions are in the plays)
   -------------------------------------------------------------------------- */

function Roster() {
  return (
    <Box p="4" style={{ maxWidth: 900 }}>
      <Text as="p" size="2" style={{ color: "var(--ds-text-weak)", marginBottom: 12 }}>
        {TABULAR_SITES.length} registered selectors carry <code>{PROP}: tabular-nums</code>. Presence is
        asserted here both ways, and the resolved value is asserted on every one of them by{" "}
        <code>EverySiteResolvesTabular</code>, which mounts the real components. Painted ink is measured
        at two of them only — <code>TabularInfo</code> in <code>_pagination.stories.tsx</code> (an
        in-place flip) and <code>Usage</code> in <code>Table.stories.tsx</code> (a column of
        equal-length amounts).
      </Text>
      {TABULAR_SITES.map((s) => (
        <Box key={s.selector} style={{ padding: "6px 0", borderTop: "1px solid var(--ds-stroke-weak)" }}>
          <Text as="p" size="1" style={{ fontFamily: "var(--code-font-family)", color: "var(--ds-text-strong)" }}>
            {s.selector}
          </Text>
          <Text as="p" size="1" style={{ color: "var(--ds-text-weak)" }}>
            {s.site} — {s.why}
            {s.inheritedBy ? ` · inherited by ${s.inheritedBy}` : ""}
          </Text>
        </Box>
      ))}
    </Box>
  );
}

/* -----------------------------------------------------------------------------
   The specimen grid — the REAL components, one per painting site
   -----------------------------------------------------------------------------
   Every site in the roster is reachable from this render. The components are imported and mounted, not
   imitated: a hand-rolled stand-in would carry the class without carrying the component's own cascade,
   which is precisely the thing under test. Nothing here pins a `size`, so each control resolves the
   ambient tier and the per-story box law reads it at its own step.
   -------------------------------------------------------------------------- */

const noop = () => {};

const SEARCH_CONFIG = createPowerSearchConfig([
  { key: "title", type: "string", label: "Title" },
] as const);

const GALLERY = [1, 2, 3].map((n) => ({
  // Inline data URI → deterministic, no network.
  src:
    "data:image/svg+xml," +
    encodeURIComponent(
      `<svg xmlns='http://www.w3.org/2000/svg' width='400' height='300'>` +
        `<rect width='400' height='300' fill='#6d78ff'/>` +
        `<text x='200' y='170' font-family='sans-serif' font-size='64' fill='white' text-anchor='middle'>${n}</text></svg>`,
    ),
  alt: `Frame ${n}`,
}));

const TOOL_CALLS = [
  { name: "edit_file", target: "src/tokens/components.css", duration: "1.2s", additions: 14, deletions: 3 },
  { name: "read_file", target: "GUIDELINES.md", duration: "0.4s" },
];

function Specimens() {
  const [page, setPage] = useState(2);
  const [amount, setAmount] = useState(12);
  const [level, setLevel] = useState([40]);
  const [galleryOpen, setGalleryOpen] = useState(false);

  return (
    <Box p="4">
      <Flex direction="column" gap="5" style={{ maxWidth: 640 }}>
        <NumberInput label="Quantity" value={amount} onValueChange={setAmount} />

        <TextArea label="Summary" showCount maxLength={280} defaultValue="Ten characters." />

        {/* defaultOpen + selectAll mount BOTH multiselect sites at once: the trigger's "N selected" and
            the panel header's "N of M selected" status (which renders in a portal). */}
        <MultiSelect label="Regions" defaultValue={["eu", "us"]} defaultOpen selectAll onValueChange={noop}>
          <MultiSelect.Option value="eu">Europe</MultiSelect.Option>
          <MultiSelect.Option value="us">United States</MultiSelect.Option>
          <MultiSelect.Option value="apac">Asia Pacific</MultiSelect.Option>
        </MultiSelect>

        <Flex gap="3" align="center">
          <Badge>+12</Badge>
          <AvatarGroup max={2} label="5 people on this project">
            {["AB", "CD", "EF", "GH", "IJ"].map((i) => <Avatar key={i} fallback={i} />)}
          </AvatarGroup>
          <Timestamp value="2026-07-29T14:29:00Z" format="time" />
        </Flex>

        <Table.Root>
          <Table.Header>
            <Table.Row>
              <Table.ColumnHeaderCell>Plan</Table.ColumnHeaderCell>
              <Table.ColumnHeaderCell numeric>Seats</Table.ColumnHeaderCell>
            </Table.Row>
          </Table.Header>
          <Table.Body>
            <Table.Row>
              <Table.RowHeaderCell>Team</Table.RowHeaderCell>
              <Table.Cell numeric>1,140</Table.Cell>
            </Table.Row>
          </Table.Body>
        </Table.Root>

        {/* `variant="count"` renders the "X–Y of Z" info row; the page BUTTONS come from the default
            `pages` variant, so both pagination sites need both pagers. */}
        <Pagination page={page} onChange={setPage} totalItems={250} label="Results" />
        <Pagination page={page} onChange={setPage} totalItems={250} variant="count" label="Results, counted" />

        <PowerSearch config={SEARCH_CONFIG.config} filters={[]} onChange={noop} aria-label="Search issues" resultCount={1284} />

        {/* marks → the mark labels; showInput → the paired numeric field AND its hidden sizer. `step` is
            a number, so the two are not mutually exclusive (snap-to-marks is `step={null}`). */}
        <Slider
          aria-label="Level"
          value={level}
          onValueChange={setLevel}
          showInput
          step={20}
          marks={[{ value: 0, label: "0" }, { value: 50, label: "50" }, { value: 100, label: "100" }]}
        />

        {/* `defaultOpen` — two calls render as a COLLAPSED group summary, and the diff counts and
            durations live on the rows inside it. Without this the three ChatToolCalls probes match
            nothing, which the play reports as a failure rather than passing over. */}
        <ChatToolCalls calls={TOOL_CALLS} defaultOpen />

        {/* A BARE span in the timestamp slot: no rule of its own, so a green on it is the slot's
            declaration inheriting into arbitrary content — the shape the container entry promises. */}
        <ChatMessageMetadata sender="assistant" status="delivered" timestamp={<span>14:29</span>} />

        <Box>
          <Button onClick={() => setGalleryOpen(true)}>Open gallery</Button>
        </Box>
        <Lightbox isOpen={galleryOpen} onOpenChange={setGalleryOpen} media={GALLERY} defaultIndex={1} />
      </Flex>
    </Box>
  );
}

/* -----------------------------------------------------------------------------
   The plays
   -------------------------------------------------------------------------- */

const meta: Meta = {
  title: "_internal/TabularFigures",
  parameters: { controls: { disable: true } },
  render: () => <Roster />,
};
export default meta;
type Story = StoryObj;

async function waitFor<T>(fn: () => T | null | undefined | false, timeout = 3000): Promise<T> {
  const t0 = performance.now();
  for (;;) {
    const v = fn();
    if (v) return v as T;
    if (performance.now() - t0 > timeout) throw new Error("waitFor: timed out");
    await new Promise((r) => requestAnimationFrame(r));
  }
}

/** FORWARD (declaration): every registered selector still declares the property, unconditionally.
 *  Catches a deletion, a rename, or a declaration demoted into a media query. It does NOT catch a
 *  declaration that is present and outranked — `EverySiteResolvesTabular` below is the arm for that. */
export const EverySiteDeclares: Story = {
  play: async () => {
    const { unconditional, conditional } = scanTabularParts();
    const missing: string[] = [];
    for (const s of TABULAR_SITES) {
      if (unconditional.has(s.selector)) continue;
      missing.push(
        conditional.has(s.selector)
          ? `${s.selector} (${s.site}) — declared, but only inside a conditional group ` +
            `("${conditional.get(s.selector)}"): the law is unconditional`
          : `${s.selector} (${s.site}) — no rule declares ${PROP}: tabular-nums. ${s.why}`,
      );
    }
    if (missing.length) {
      throw new Error(
        `${missing.length} of ${TABULAR_SITES.length} registered tabular-figures sites lost their ` +
        `declaration (GUIDELINES §3):\n  · ${missing.join("\n  · ")}`,
      );
    }
  },
};

/** EFFECTIVE VALUE: every registered site, mounted for real, RESOLVES to tabular figures on the element
 *  that holds its ink.
 *
 *  This is the arm that reads the cascade rather than the stylesheet. A rule that is present but
 *  outranked — by a later rule, a more specific one, or a vendor reset — passes both declaration arms
 *  and fails here. `components.css` records exactly that incident on the AvatarGroup counter, where the
 *  rule was live, correct, and silently beaten by a (0,4,0) Radix rule earlier in the file.
 *
 *  Probes resolve against `document`, not the canvas: MultiSelect's panel and the Lightbox dialog both
 *  render through portals, outside `canvasElement`. Every element matching a probe is asserted, not just
 *  the first — a site with two instances on the page must hold at both. A probe matching NOTHING is a
 *  failure too: an unmounted specimen would otherwise report a green for a site nobody looked at. */
export const EverySiteResolvesTabular: Story = {
  render: () => <Specimens />,
  play: async ({ canvasElement }) => {
    // The Lightbox counter only exists while the dialog is open. Drive the REAL control, not a state
    // shortcut, so the assertion sees the same tree a user would.
    const open = await waitFor(() =>
      Array.from(canvasElement.querySelectorAll<HTMLButtonElement>("button")).find(
        (b) => b.textContent?.trim() === "Open gallery",
      ),
    );
    open.click();
    await waitFor(() => document.querySelector(".rt-ds-lightbox-counter"));

    const failures: string[] = [];
    for (const s of TABULAR_SITES) {
      const els = Array.from(document.querySelectorAll<HTMLElement>(s.paints));
      if (els.length === 0) {
        failures.push(
          `${s.site} — the probe \`${s.paints}\` matched NOTHING. The specimen for ` +
          `${s.selector} did not mount, so nothing was checked.`,
        );
        continue;
      }
      els.forEach((el, i) => {
        const resolved = getComputedStyle(el).fontVariantNumeric;
        if (VALUE.test(resolved)) return;
        failures.push(
          `${s.site} — \`${s.paints}\`${els.length > 1 ? ` [${i + 1}/${els.length}]` : ""} resolves ` +
          `${PROP}: "${resolved}", not tabular-nums. Either ${s.selector} no longer declares it, or it ` +
          `declares it and is outranked before the value reaches the ink. ${s.why}`,
        );
      });
    }

    // Close the dialog through its own control so the story does not end with a focus-trapping overlay
    // over the specimen grid (axe and the box law both run after this play).
    document.querySelector<HTMLButtonElement>('.rt-ds-lightbox [aria-label="Close"]')?.click();
    await waitFor(() => document.querySelector(".rt-ds-lightbox-counter") === null);

    if (failures.length) {
      throw new Error(
        `${failures.length} tabular-figures site(s) do not RESOLVE to tabular figures on the rendered ` +
        `element, out of ${TABULAR_SITES.length} registered (GUIDELINES §3). A declaration arm cannot ` +
        `see this class of failure:\n  · ${failures.join("\n  · ")}`,
      );
    }
  },
};

/** REVERSE (anti-rot): nothing takes the property without registering.
 *
 *  SCOPE — the arm covers every SYSTEM selector, prefixed or not. It used to inspect only parts starting
 *  `.radix-themes`, which left a hole: a future rule written `.rt-ds-something { font-variant-numeric:
 *  tabular-nums }` — no `.radix-themes` prefix — shipped unregistered and green. Verified: appending
 *  `.rt-ds-fake-unprefixed { font-variant-numeric: tabular-nums; }` to `components.css` left the whole
 *  suite passing. A part now counts as ours when it is `.radix-themes`-scoped OR mentions any `.rt-*`
 *  class at all, which is the naming convention the system and Radix share.
 *
 *  WHAT IS DELIBERATELY OUT — the vendor's own declarations, and only by VALUE. Radix's `.rt-reset`
 *  rules apply `all: unset` to inputs and controls, which the CSSOM expands into every longhand,
 *  `font-variant-numeric: unset` among them. `unset` is not `tabular-nums`, so the scan never records
 *  those parts in the first place — no name-based vendor exemption exists here, and none should: a
 *  vendor rule that really did claim tabular figures on our surface is something we want to know about.
 *  Story-local demo CSS is excluded by carrying no `.rt-` class. */
export const NoUnregisteredAdopter: Story = {
  play: async () => {
    const registered = new Set(TABULAR_SITES.map((s) => s.selector));
    const { unconditional, conditional } = scanTabularParts();
    const strays: string[] = [];
    for (const [part, full] of [...unconditional, ...conditional]) {
      // Ours: theme-scoped, or naming an `.rt-*` class anywhere in the part.
      if (!part.startsWith(".radix-themes") && !/\.rt-[\w-]/.test(part)) continue;
      if (registered.has(part)) continue;
      strays.push(`${part}   (in rule "${full}")`);
    }
    if (strays.length) {
      throw new Error(
        `${strays.length} selector(s) declare ${PROP}: tabular-nums without an entry in TABULAR_SITES ` +
        `(_tabular-figures.stories.tsx). Register each one — with the site it serves, which number ` +
        `moves under a box that does not, and the probe the effective arm reads its ink from — so this ` +
        `table stays the adopter list rather than a copy of one:\n  · ${strays.join("\n  · ")}`,
      );
    }
  },
};
