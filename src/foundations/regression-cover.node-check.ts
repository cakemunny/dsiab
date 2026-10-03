/* =============================================================================
   regression-cover.node-check.ts — A MEASURED FIX CARRIES A GUARD
   -----------------------------------------------------------------------------
   THE DEFECT THIS EXISTS FOR IS A RULING, NOT A COMPONENT. The first
   status-glyph fix recorded a real geometry bug, stated the measurement that
   proved it, shipped a fix, and the fix did nothing: `min-height: inherit`
   copies the parent's min-height, never the parent's line-height, and
   `align-self: stretch` stretched to a box that was already too short. The
   entry read as authoritative for a day and a half until review looked at the
   same rows again and reported the glyph was still off.
   [[status-glyph-line-box]] replaced it.

   The entry was wrong in a specific, repeatable way: it measured the DEFECT and
   never measured the REMEDY. A before-number is not evidence that an
   after-number changed. Nothing in the repo could have caught that, because the
   only thing watching was a human reading pixels.

   WHAT THIS GUARD ASSERTS. A ruling that states a pixel measurement is a ruling
   that promised a consumer an observable number. Such a ruling must be defended
   by something that can go red: an arm in `_regressions.stories.tsx`, or a
   named check that already covers it. Anything else is a fix on trust.

   THE BACKLOG IS GRANDFATHERED, AND THE NUMBER IS RECORDED so nobody claims a
   clean baseline that never existed. At adoption, 54 rulings older than the
   register stated a measurement and had no arm. Demanding arms for all of them
   in one change would produce one thing only: a wholesale exemption list, which
   teaches every reader that this gate is decorative. This is the same call
   `AGENTS.md` makes for the 400-line file cap — measured at adoption,
   grandfathered, and binding on what you add next.

   So the gate binds rulings from the REGISTER ERA onward: every ruling whose
   `**Ruled.**` date falls on or after ERA_START, 2026-09-18, the day
   [[seam-ownership]] was ruled. It was the first ruling that landed alongside
   `_regressions.stories.tsx`, and [[avatar-shape-perceptibility]] followed it
   a day later. Every new measured ruling from here needs a guard or an
   explicit, reasoned attribution.

   THE ERA WAS A NUMBER AND IS NOW A DATE. Until 2026-10-01 the floor was a
   section code number in two sections. Names carry no number, so the floor
   moved to the date line every entry opens with. The date floor selects the
   rulings the code floor selected, plus [[showcases-and-fixture]], which was
   ruled on the same day and already carries a COVERED_BY row.

   THE ARMS:

     COVERED   — every in-era measured ruling has an arm or a `COVERED_BY` entry.
     ANTI-ROT  — every name `_regressions.stories.tsx` cites as `[[name]]`
       exists in the ledger. A mistyped name defends nothing and reads as
       though it does.
     NO-DRIFT  — `COVERED_BY` never names a ruling that has since grown a real
       arm, and never names one that does not exist. An attribution nobody
       revisits becomes a lie the moment the arm lands.
     REVERSE   — the era filter still selects rulings. If the date line or the
       entry format changes under it, this guard must fail loudly rather than
       pass over an empty set, which is the vacuous-pass failure mode
       `dist-decisions.node-check.ts` documents at length.

   WHAT THIS GUARD CANNOT SEE. An entry whose date line reads "No date
   recorded" falls before the era. Every such entry predates the register, and
   the ledger guard checks the form of the date line but cannot force a date
   onto a new entry. An arm counts as present when the register cites the name
   anywhere, the header prose included, which is how the code form counted too.
   ============================================================================= */

import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { test, expect } from "vitest";

const ROOT = join(import.meta.dirname, "..", "..");
const LEDGER = join(ROOT, "docs", "DECISIONS.md");
const REGISTER = join(ROOT, "src/components/ui/_regressions.stories.tsx");


/** Every `.ts`/`.tsx`/`.css` under `src/`, repo-relative. Hand-rolled rather than `fs.globSync`,
 *  which is still experimental and warns on every guard-lane run. */
function sourceFiles(dir = join(ROOT, "src")): string[] {
  const out: string[] = [];
  for (const e of readdirSync(dir)) {
    const full = join(dir, e);
    if (statSync(full).isDirectory()) out.push(...sourceFiles(full));
    else if (/\.(tsx?|css)$/.test(e)) out.push(relative(ROOT, full));
  }
  return out;
}
/** The day the regression register landed, with [[seam-ownership]]. A ruling whose `**Ruled.**`
 *  date falls on or after it is in the era. Rulings dated earlier, or with no recorded date,
 *  predate the practice and are grandfathered, with the count recorded in the docblock above. */
const ERA_START = "2026-09-18";

/** In-era measured rulings defended by something OTHER than a `_regressions` arm. Each value names
 *  the check that can go red for it. A bare "covered elsewhere" would be worth nothing: the point
 *  of the attribution is that a reader can open the named file and find the assertion. */
const COVERED_BY: Record<string, string> = {
  "resize-handle-seam": "src/components/ui/Layout.stories.tsx — the ResizeHandle IS the seam, asserted beside [[seam-ownership]]'s arm on the same boundary",
  "component-shadowing": "src/foundations/component-shadow.node-check.ts — the shadow itself is the defect, and that guard went red on this exact line before the fix landed",
  "side-nav-section-divider": "src/components/ui/SideNav.stories.tsx — the divided Section is a rendered story state with its own play assertion",
  "token-pressed-state": "src/components/ui/Token.stories.tsx — the Usage play clicks a filter Token and asserts aria-pressed, the check glyph, and the computed fill, ink and weight against the roles resolved on a probe",
  "chrome-heading-lane": "src/foundations/size-lanes.node-check.ts — the chromeHeading lane is asserted as text+1 and as non-inert, which is the whole of [[chrome-heading-lane]]",
  "display-size-lane": "src/foundations/size-lanes.node-check.ts — the display lane is asserted to sit above heading and to step",
  "size-lane-hook": "src/foundations/size-lanes.node-check.ts — the public lane surface is asserted there, and barrel.node-check.ts holds the export",
  "top-nav-bar-height": "src/foundations/size-lanes.node-check.ts — the TopNav bar ladder is a tier-keyed row in the policy table",
  "text-spacing-control-box": "src/components/ui/_control-box.stories.tsx — the text-spacing arm, scoped by TEXT_SPACING_STORIES in boxLaw.ts",
  "showcases-and-fixture": "src/foundations/showcases.node-check.ts and axe-scope.node-check.ts — the showcase register is guarded in both directions",
  "scrim-focus-ring": "src/components/ui/_focus.stories.tsx — ScrimRingContrast sweeps the ring on a real Overlay scrim over media 0 to 255, every accent, both appearances and both scrims. It went red at 1.00:1 with [[scrim-focus-ring]]'s re-point removed, and since [[focus-ring]] it holds the re-pointed stack",
  "forced-colours": "src/components/ui/_forced-colors.stories.tsx, EdgesAndStates: emulates forced colours in both system palettes through cdp(), measures every control edge and state mark against Canvas, and went red on each rule removal",
  "button-focus-ring-offset": "src/components/ui/_focus.stories.tsx, RingGapOutsideEdge: focuses every soft, ghost, outline and surface Button and IconButton at all three steps and reads the computed outline-offset, and went red with the ring-gap rule removed and again with its inset exclusion removed",
  "text-on-solid-fill-contrast": "src/foundations/Colors.stories.tsx, Swatches: assertPairing holds every ON_FILL text pair to 4.5:1 and APCA Lc 60 at rest and on hover across all 27 accents in both appearances, and went red on a reverted cyan pin, a removed orange ink pin and a removed iris hover pin",
  "textless-part-fills": "src/components/ui/_non-text-contrast.stories.tsx, PartsWithoutText: holds the Checkbox, Radio, Tabs, StatusDot, CheckboxCards, Switch track, Slider and Progress paint at 3:1 against the page, the white switch thumb or its stroke at 3:1 against the track, the check and radio dot at 3:1 on their fill, and one shade per colour, across 27 accents in both appearances, and went red on a removed light cyan repoint, a removed thumb-stroke rule, a CheckboxCards outline back on --ds-fill-accent, an emptied dark residual and a passing colour added to the light residual. Also src/components/ui/Code.stories.tsx, Usage: the solid chip paints --ds-fill-accent under a label at 4.5:1 and APCA Lc 60 across 27 accents in both appearances, and went red with the solid rule removed and with its fill moved to --accent-9",
  "part-fill-edge": "src/components/ui/_non-text-contrast.stories.tsx, PartsWithoutText: reads each part's outer pixel, its fill with every 1px inset ring flattened over it and the card's 2px band on ::after, and holds it at 3:1 against the page for the Checkbox, Radio, Tabs, StatusDot, CheckboxCards, Switch track, Slider and Progress across 27 accents in both appearances, with no colour exempt, and went red with light amber's --accent-part-edge value removed from theme.css (8 parts at 1.54 to 2.37:1) and with the CheckboxCards edge rule removed from components.css (the card on all six colours at 1.32 to 2.08:1)",
  "radio-cards-band-edge": "src/components/ui/_non-text-contrast.stories.tsx, PartsWithoutText: reads the selected RadioCards card's 2px band on ::after with every 1px inset ring flattened over it, and holds it at 3:1 against the page and at the Checkbox's shade across 27 accents in both appearances, and went red with the RadioCards selector removed from the [[part-fill-edge]] card rule in components.css (the card on all six colours at 1.32 to 2.08:1)",
  "indicator-mark-edges": "src/components/ui/_non-text-contrast.stories.tsx, PartsWithoutText: renders the real Pagination, Outline and Calendar, the data-ds-reorder-drop pair on a group, and the Analytics dashboard showcase hidden, and holds the current dot, the Outline bar, the today bar, the drop line and its end dot, and the chart line, end point and legend swatch at 3:1 against the page and at the Checkbox's shade across 27 accents in both appearances, and went red with the Pagination selector removed from the [[indicator-mark-edges]] rule in components.css (the dot on all six colours at 1.32 to 2.08:1) and with the chart's edge path narrowed to 1 unit (the line on all 54 themes)",
  "input-focus-ring-offset": "src/components/ui/_focus.stories.tsx, RingGapOutsideEdge: mounts a real TextField (plain and invalid), TextArea, NumberInput, Select, MultiSelect, DateInput, DateRangeInput, TimeInput, Typeahead and ChatComposer, with a Button, Tokenizer and FileInput as the reference, at the small, medium and large tiers, keyboard-focuses each and holds the drawn gap from the carrier's own border, inset box-shadow or fill to the ring's inner edge at 2px within 0.5px on all four sides with the ring unclipped, in both appearances, and went red with the TextArea focus rule set to outline-offset 4px (TextArea at all three tiers, 4.00px on every side, both lanes)",
  "light-scrim-focus-ring": "src/components/ui/_focus.stories.tsx, ScrimRingContrast: keyboard-focuses a real button in a real Overlay scrim, reads every ring layer it paints, flattens them over media 0 to 255, and holds the ring at the button's --ds-fill-accent and at 3:1 on 27 accents in both appearances. It went red with iris removed from the --black-a5 set in theme.css (1.88:1) and with the ::before outline set back to the [[scrim-focus-ring]] ink. [[focus-ring]] supersedes [[light-scrim-focus-ring]]'s rules and the play now holds [[focus-ring]]'s scrim stacks",
  "focus-ring": "src/components/ui/_focus.stories.tsx, FocusRingContrast, EveryRingIsTheStackedAccent, ControlRingsUseAccent and ScrimRingContrast, and src/components/ui/_non-text-contrast.stories.tsx, FocusRingOnParts: hold the ring tokens against 15 surfaces on 27 accents, both appearances and six neutrals, and every ring family as drawn at 2px, the fill underneath and the stack on it, at WCAG 3:1 and APCA Lc 30. They went red with light amber's stack removed from theme.css (1.54:1, Lc 24.3 on the page) and with the TextField ring set back to 1px (every TextField reading 1.00px)",
  "selected-row-cue": "src/components/ui/_item.stories.tsx, SelectionCue: renders Item, List, the SideNav rows, the collapsed rail with a parent trigger, TopNav with a menu trigger, TreeList and the CommandPalette picker, each with one selected row and an unweighted Star, bare and under a solid IconContext, clones them into 27 accents in both appearances, and holds the selected label at --ds-font-weight-strong in --ds-text-strong, every other label at --ds-font-weight-base, the selected icon at Phosphor's fill shape and every other icon at its regular shape. It went red with the label weight removed from the Item rule in components.css (540 labels at 400) and with Item's start slot unwrapped (702 icons at the wrong weight). The ProjectBoard card band sits on a showcase, which [[showcases-and-fixture]] bars from asserting, so its 3.21:1 floor is a hand measurement and nothing re-checks it",
  "mark-on-tint-edge": "src/components/ui/_non-text-contrast.stories.tsx, MarksAndDashesOnTint: renders the real Calendar with today in the middle of a range, the Outline and the Analytics dashboard showcase hidden, clones them into 27 accents, both appearances and six neutrals, and holds the today bar on its band on the page and on the popover panel, the Outline bar on its rail and the chart line on its area on the card, each with --accent-mark-edge flattened on it, at WCAG 3:1 and APCA Lc 30 against the tint and the surface. It went red with dark oxblood's --accent-mark-edge removed from theme.css (48 readings, the today bar at 1.02:1 on its band on the panel), and PartsWithoutText went red with it (the Outline bar and the chart line at 2.08:1 on the page)",
  "drop-target-dash": "src/components/ui/_non-text-contrast.stories.tsx, MarksAndDashesOnTint: renders the DragHandle empty slot and a FileInput held in its drag state, clones them into 27 accents, both appearances and six neutrals, and holds each dash with --accent-dash-stack flattened on it at WCAG 3:1 and APCA Lc 30 against its tint and the page, the subtle recess, a card and a panel, and holds each stack where it is drawn, a 1px dashed outline at -1px on the slot's border and a 1px dashed border on a box the zone's size and radius. It went red with light gray removed from the --black-a6 set in theme.css (96 readings, the slot dash at 1.31:1 on its tint) and with the zone rule removed from components.css (all 324 themes)",
  "neutral-part-stacks": "src/components/ui/_non-text-contrast.stories.tsx, GreyAndWhiteParts: renders the real Pagination dots at sizes 1, 2 and 3, the Slider, the SegmentedControl and the ScrollArea, clones them into 27 accents, both appearances and six neutrals, and holds each dot ring with --neutral-ring-stack, the current dot with --accent-mark-edge, the Slider thumb with --accent-slider-thumb-stack, the selected segment with --neutral-ring-stack and the ScrollArea thumb with --neutral-thumb-stack flattened on it at WCAG 3:1 and APCA Lc 30 against the page, the subtle recess, a card and a panel and against its range, track or lane, and holds every inactive dot's clear centre and the current dot at --ds-space-20 long at the dot's height. It went red with the dark --neutral-ring-stack value removed from theme.css (2,592 readings, every dark dot ring and segment, the segment ring at 1.00:1 against its track on a card) and with the Slider thumb rule removed from components.css (1,560 readings, the thumb at 1.59:1 against its track in light), and _forced-colors.stories.tsx, EdgesAndStates: holds every dot's 1px ring at 3:1 against Canvas and the current dot as a wider filled pill in both system palettes, and went red with the dot rule removed from forced-colors.css (10 readings in each appearance lane)",
  "colour-prop-and-high-contrast": "src/components/ui/_non-text-contrast.stories.tsx, ColourPropAndHighContrast: renders the Checkbox, Radio, Switch, Slider, Progress, Tabs, Tabs.Nav, CheckboxCards and RadioCards once with Radix's color prop and once with highContrast, clones the coloured set under a yellow theme for 26 colours on six neutrals in six light and dark frames ([[dark-override-selectors]]) and the highContrast set under 27 theme colours in both appearances on six neutrals, and holds every edge and card band at 3:1 against the page, the white switch thumb or its stroke at 3:1 against its track, the Slider thumb at 3:1 against its range and its track, each card band at its own checkbox's shade, and each coloured part at the fill, edge and thumb rings of the same part on a theme of its colour. It went red with the part arms removed from the --accent-part-edge table in theme.css (3,564 failures in each appearance lane) and with the color exclusion put back on the Switch track and Slider range rule in components.css (360 failures in each lane, the switch track and slider range at 1.72:1 on light lime)",
  "card-picker-focus-width": "src/components/ui/_non-text-contrast.stories.tsx, FocusRingOnParts: renders a selected and an unselected CheckboxCards card and RadioCards card, clones them into 27 accents in both appearances, keyboard-focuses each, holds every ring layer at 4px on the card itself, and reads the card's paint in 1px bands at rest and focused, holding the focused paint at 3:1 against its own rest paint and against a selected card at rest over at least the 2px strip the 4px ring adds (1,248 px on the 288 by 36 specimen card). It went red in both lanes with the [[card-picker-focus-width]] width rule in components.css set back to 2px, 648 failures in each lane: 324 ring layers at 2px, all 108 selected cards against themselves at rest and all 216 cards against a selected card at rest",
  "tab-panel-focus-clearance": "src/components/ui/_focus.stories.tsx, TabPanelRingClearsList: mounts real Tabs with the panel directly after the list and no wrapper, one panel empty and one with text, at the small, medium and large tiers, keyboard-focuses each panel, reads the ring off every layer it paints and holds each layer's top edge at least 2px below the tab list. It went red in both lanes with the margin rule removed from components.css, 18 findings at -4.00px",
  "part-colour-parity": "src/components/ui/_non-text-contrast.stories.tsx, ColourPropAndHighContrast: adds a solid Button, IconButton and Code chip to the [[colour-prop-and-high-contrast]] parts, sweeps 27 colours with oxblood under a yellow theme in six [[dark-override-selectors]] frames on six neutrals, holds each label at 4.5:1 and each check and radio dot at 3:1 against its fill, and holds each label, fill, check, dot and card tint at the paint of the same part on a theme of its colour. It went red in both lanes with the part arm removed from the teal text-fill pin in theme.css, 450 failures in each lane, and with the part arm removed from the oxblood map in oxblood.css, 864 failures in each lane",
  "status-dot-edges": "src/components/ui/_non-text-contrast.stories.tsx, DotsEdgesAndSelectedRows: renders every StatusDot variant, an Avatar with each status, a List with a static and a clickable selected row that each carry a description, the PartsWithoutText parts and the Analytics dashboard chart card, clones them into 27 accents, both appearances and six neutrals, and holds each dot and each part that stacks --accent-part-edge at WCAG 3:1 and APCA Lc 30 against the page, the subtle recess, a card and a panel, each Avatar dot against its cutout ring, the Progress bar and the Slider range against their track on each surface, and each selected description at 4.5:1 and Lc 60 on its tint. It went red in both lanes with the dark --white-a4 arm removed from the --accent-part-edge table in theme.css, 1,206 failures in each lane, and with the warning edge removed from the StatusDot rule in components.css, 810 failures in each lane",
};

/** In-era rulings that RECORD a defect nobody has fixed yet. These cannot be guarded, and the
 *  reason is worth stating: an arm for an unfixed defect would have to assert that the defect is
 *  still present, which pins current behaviour and goes red the day somebody fixes it. That is
 *  precisely the kind of test this repo deletes on sight.
 *
 *  The category is not a way out. The arm below re-reads each entry and requires it to SAY it is
 *  unfixed, so a ruling cannot be parked here to dodge writing a guard: fix it, and the ledger text
 *  changes, and this gate then demands the arm. */
const RECORDED_GAPS: Record<string, string> = {
  "checkbox-target-size": "the Checkbox pointer-floor breach, awaiting a ruling because the remedy is system-wide",
};

/** In-era rulings whose subject is a COMPOSITION JUDGEMENT about how a page is assembled, not a
 *  contract any component exposes. These genuinely cannot be armed here, and the reason is
 *  structural rather than convenient: [[showcases-and-fixture]] rules that the showcase recreations
 *  assert nothing, so there is no lane that can go red for "this page uses one nesting device per
 *  relationship". The
 *  measurement in such a ruling is EVIDENCE for a judgement, not a promise about an API.
 *
 *  The arm below stops this becoming the drawer everything gets filed in: a ruling listed here may
 *  not be cited by anything under `src/components/`, `src/tokens/` or `src/theme/`. The moment a
 *  component cites it, it IS a component contract, and it needs a real arm instead. */
const COMPOSITION_RULES: Record<string, string> = {
  "nesting-treatments": "one nesting treatment per relationship — a page-composition rule, enforced by review",
  "action-bar": "the pane action bar — a local page construct, not a shipped component",
  "measure-cap-scope": "where a measure cap belongs — a rule about which surfaces take one",
};

/** Every entry: its name, the date on its `**Ruled.**` line (null when none is recorded) and its
 *  text up to the next `### ` or `## ` heading. */
function ledgerEntries(): Map<string, { date: string | null; body: string }> {
  const out = new Map<string, { date: string | null; body: string }>();
  for (const part of readFileSync(LEDGER, "utf8").split(/^(?=#{2,3} )/m)) {
    const m = /^### (\S+)\n([\s\S]*)$/.exec(part);
    if (!m) continue;
    out.set(m[1], { date: /\*\*Ruled\.\*\* (\d{4}-\d{2}-\d{2})\./.exec(m[2])?.[1] ?? null, body: m[2] });
  }
  return out;
}

/** A ruling that states a pixel number promised a consumer an observable geometry. */
function measuredInEra(): string[] {
  const out: string[] = [];
  for (const [name, { date, body }] of ledgerEntries()) {
    if (date === null || date < ERA_START) continue;
    if (/\d+(?:\.\d+)?px/.test(body)) out.push(name);
  }
  return out;
}

/** Every ruling the register cites, in the `[[name]]` form. */
function armedNames(): Set<string> {
  return new Set([...readFileSync(REGISTER, "utf8").matchAll(/\[\[([a-z0-9]+(?:-[a-z0-9]+)+)\]\]/g)].map((m) => m[1]));
}

test("every measured ruling from the register era has a guard", () => {
  const armed = armedNames();
  const naked = measuredInEra().filter(
    (name) =>
      !armed.has(name) &&
      !(name in COVERED_BY) &&
      !(name in RECORDED_GAPS) &&
      !(name in COMPOSITION_RULES),
  );
  expect(
    naked,
    naked.length === 0
      ? ""
      : `these rulings state a pixel measurement and nothing can go red for them:\n` +
          naked.map((name) => `  ${name}`).join("\n") +
          `\n\nAdd an arm to src/components/ui/_regressions.stories.tsx that cites the ruling as ` +
          `[[name]], or name the check that already covers it in COVERED_BY, or list it in ` +
          `RECORDED_GAPS (a defect nobody has fixed) or COMPOSITION_RULES (a page judgement with no ` +
          `component contract). The first status-glyph fix is why this gate exists: it measured the ` +
          `defect, shipped an inert fix, and read as authoritative until a human looked again.`,
  ).toEqual([]);
});

test("a COMPOSITION_RULES entry is not cited by any component", () => {
  // The category's whole claim is that no component exposes this as a contract. The moment one
  // cites it, that claim is false and the ruling needs a real arm.
  const known = ledgerEntries();
  const roots = ["src/components", "src/tokens", "src/theme"];
  const problems: string[] = [];
  for (const name of Object.keys(COMPOSITION_RULES)) {
    if (!known.has(name)) {
      problems.push(`${name} is in COMPOSITION_RULES but not in the ledger`);
      continue;
    }
    const citedBy = sourceFiles()
      .filter((f) => roots.some((r) => f.startsWith(r)))
      .filter((f) => readFileSync(join(ROOT, f), "utf8").includes(`[[${name}]]`));
    if (citedBy.length) {
      problems.push(
        `${name} is filed as a page-composition rule, but these component-layer files cite it as ` +
          `law: ${citedBy.join(", ")}. If a component owes this contract, it needs an arm`,
      );
    }
  }
  expect(problems, problems.join("\n")).toEqual([]);
});

test("every ruling named in the regression register exists in the ledger", () => {
  const known = ledgerEntries();
  const ghosts = [...armedNames()].filter((name) => !known.has(name));
  expect(
    ghosts,
    `the regression register names rulings the ledger does not have: ${ghosts.join(", ")}. A ` +
      `mistyped name defends nothing while reading as though it does`,
  ).toEqual([]);
});

test("a RECORDED_GAPS entry actually says it is unfixed", () => {
  // The escape hatch has to be self-policing, or it becomes the place rulings go to avoid a guard.
  // The ledger text is the evidence: a recorded gap declares itself one.
  const known = ledgerEntries();
  const problems: string[] = [];
  for (const name of Object.keys(RECORDED_GAPS)) {
    const body = known.get(name)?.body;
    if (!body) problems.push(`${name} is in RECORDED_GAPS but not in the ledger`);
    else if (!/NOT FIXED|RECORDED, NOT|not yet fixed/i.test(body)) {
      problems.push(
        `${name} is parked in RECORDED_GAPS but its ledger entry no longer says it is unfixed. If it ` +
          `was fixed, it needs a real arm now`,
      );
    }
  }
  expect(problems, problems.join("\n")).toEqual([]);
});

test("COVERED_BY names no ruling that is stale or already armed", () => {
  const known = ledgerEntries();
  const armed = armedNames();
  const problems: string[] = [];
  for (const name of Object.keys(COVERED_BY)) {
    if (!known.has(name)) problems.push(`${name} is not in the ledger at all`);
    else if (armed.has(name)) {
      problems.push(`${name} now has a real arm in _regressions.stories.tsx, so delete its COVERED_BY row`);
    }
  }
  expect(problems, problems.join("\n")).toEqual([]);
});

test("the era filter still selects rulings", () => {
  // Without this the first arm passes over an empty set the moment the ledger format or the date
  // line moves, and a guard that cannot fail is worse than no guard.
  const inEra = measuredInEra();
  expect(
    inEra.length,
    "no measured ruling was found on or after the era date. Either DECISIONS.md changed shape or " +
      "ERA_START is stale",
  ).toBeGreaterThan(4);
});
