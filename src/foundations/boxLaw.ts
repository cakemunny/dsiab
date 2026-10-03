/* THE BOX LAW — one implementation of the control-box truth, run by two runners.
 *
 * A size step names ONE box. Step 1 = 24px, 2 = 32px, 3 = 40px, 4 = 48px, and the control lane maps
 * the ambient tier small → 1, medium → 2, large → 3. Two families ride a ladder of their own, each
 * because it is not a control standing in a row: a ToggleButtonGroup MEMBER (24 / 24 / 32 — a medium
 * tray holds small buttons, [[toggle-group-box]]) and a NAVIGATION row (32 / 36 / 40 — nav carries more prominence than
 * a standard control, and a collapsed rail rides the same ladder as the expanded rows it replaces,
 * [[nav-row-ladder]]). Under a moved `--scaling` the ladders move with them, but WCAG 2.5.8's 24×24 is an absolute
 * CSS-px minimum that deliberately does NOT scale and WINS below itself:
 *
 *     expected box = max(step px × --scaling, 24)
 *
 * THE TWO RUNNERS, ONE TRUTH.
 *   • `assertBoxLaw` runs from `.storybook/preview.tsx`'s `afterEach` — after EVERY story render, in
 *     both vitest lanes, at whatever tier the run's `uiSize` global says (the suite's own ambient is
 *     `small`). This is the every-run enforcement.
 *   • A periodic census, kept outside this repository, loads THIS FILE, injects it into a Playwright
 *     page, and sweeps the whole Storybook index at all three tiers. That is the deep sweep.
 * Neither runner carries a private copy of a selector, a ladder, or a verdict rule. A number changed
 * here changes both, which is the entire point of the module existing.
 *
 * WHY THE NUMBERS ARE TYPED OUT HERE rather than read from `SizeContext` / the theme: a probe that
 * reads the same table the component reads agrees with it by construction and can never catch a table
 * that moved. Same reasoning as `_control-box.stories.tsx`'s `TIER_BOX_PX` and `_size.stories.tsx`'s
 * `AVATAR_TIER_PX`, which are this file's precedents. Keep them literal.
 *
 * ─────────────────────────────────────────────────────────────────────────────────────────────────
 * THE TWO LAYERS THE GUARD ASSERTS
 *
 * LAYER 1 — everywhere, no story exemptions. Every control root's rendered box must equal the
 * expected box of ITS OWN CLAIMED STEP. This needs no reference to the ambient tier to be wrong: the
 * control disagrees with itself. It is therefore tier-independent by construction — running the suite
 * at `medium` would not change a single layer-1 verdict.
 *
 * LAYER 2 — docs stories only. A control whose CLAIMED step differs from the step the ambient tier
 * asks for is a PIN. A pin is not a box defect; it is a teaching claim, and in a page a reader learns
 * from it must be declared. The declaration is the `data-size-lesson` marker (contract below).
 *
 * A "docs story" is any story that is NOT:
 *   • `_internal/*` — fixtures that mount several tiers side by side ON PURPOSE (the control-box
 *     manifest grid, `_internal/Size`). Every control in them is a pin by design; demanding a marker
 *     would be demanding noise.
 *   • `Foundations/*` — token and scale pages whose specimens exist to show the ladder itself.
 *   • the `Props` export (named `Playground` until 2026-08-04) — arg-driven. Its size is whatever the reader last moved the control to,
 *     so there is no stable claim to declare.
 * These are exemptions by STORY CLASS, not by site: they say "layer 2 does not apply here", never
 * "this particular deviation is fine".
 *
 * ─────────────────────────────────────────────────────────────────────────────────────────────────
 * THE `data-size-lesson` CONTRACT
 *
 *   Attribute:  data-size-lesson="<reason>"
 *   Value:      a non-empty human sentence saying WHY this control is off the ambient tier and what
 *               the reader is meant to take from it. An empty string, or the bare attribute, does not
 *               satisfy the contract — the marker exists to carry the reason, not to silence a test.
 *   Placement:  on the control root itself, or on ANY ancestor. An ancestor covers a whole specimen
 *               block, which is normally what a docs pin is: one `<Flex data-size-lesson="…">` around
 *               the row of three sizes, not a marker per control.
 *   Scope:      it declares a PIN. It does not and cannot excuse a broken box — layer 1 ignores it
 *               entirely. A marker on a control whose box is off its own step still fails.
 *   By rule:    one family needs no marker because the RULE already declares it — an inset affix
 *               (`[data-inset]`) is pinned to step 1 by `IconButton`'s own `inset` prop, so it carries
 *               a built-in reason. See `INSET_AFFIX_REASON`.
 *
 * ─────────────────────────────────────────────────────────────────────────────────────────────────
 * KNOWN DEBT — documented, asserted, never silently skipped
 *
 * `BOX_LAW_EXPECTED_FAILURES` below holds layer-1 sites that do not satisfy the law, each with its
 * measured cause. The assertion stays ON for them: the guard still measures and still PRINTS the
 * number (a console warning naming the site); only the THROW is suppressed. Same posture as
 * `SCALING_EXPECTED_FAILURES` in `_control-box.stories.tsx` and `token-rows.node-check.ts`'s
 * conversion work-list — a failing list checked in is more useful than a deleted one. A key that
 * stops failing is itself reported as STALE and fails the run, so the list cannot rot into a
 * permanent exemption.
 *
 * There is no debt list for layer 2, and there should never be one: `data-size-lesson` already IS the
 * per-site declaration mechanism, and a second one would just be an undocumented version of it.
 *
 * ─────────────────────────────────────────────────────────────────────────────────────────────────
 * THE SEAM, stated rather than hidden
 *
 * `OFF-TIER-UNDECLARED` — a control that declares no step anywhere in the DOM, whose box lands
 * exactly on a ladder rung, just not the ambient one. A DOM probe cannot see React context, so it
 * cannot tell a local `<Provider uiSize>` pin from a control that ignores the tier. The two need
 * OPPOSITE resolutions (declare it vs. fix it), so the guard reports every one of them by name as a
 * warning and does NOT throw. Deciding that class takes a ruling, not a test's guess.
 *
 * ─────────────────────────────────────────────────────────────────────────────────────────────────
 * THE BOUNDARY LAYER 1 IS MEASURED AT — added by [[text-spacing-control-box]], because [[text-spacing-control-box]] contradicts it
 *
 * Layer 1 says a control's box EQUALS its step. [[text-spacing-control-box]] ships `height: auto` in the box law so that a
 * label which wraps GROWS the box instead of escaping the fill, which is the opposite. Both are
 * right, at different text metrics, and the reconciliation is the boundary:
 *
 *   Layer 1 holds at DEFAULT text metrics. It is not a claim about a page a reader has restyled.
 *
 * At default metrics a control's content is always shorter than its step, so `min-height` decides
 * the box and every layer-1 verdict is unchanged — measured before [[text-spacing-control-box]] shipped, across 548
 * `.rt-BaseButton` boxes on 72 docs pages and the 111 controls in `_control-box.stories.tsx`'s two
 * manifest stories: nothing visible moved. Under the WCAG 1.4.12 text-spacing overrides a wrapped
 * label makes the box taller than its step ON PURPOSE, and calling that a box defect would assert
 * the exact failure [[text-spacing-control-box]] fixed.
 *
 * So `TEXT_SPACING_STORIES` names the stories that render under those overrides. Layer 1 still
 * measures them and still PRINTS what it found; only the throw is suppressed, which is the same
 * posture `BOX_LAW_EXPECTED_FAILURES` takes below. The register is a story-CLASS boundary like
 * layer 2's, never a per-site excuse: a story in it may grow a box, and may not break one in any
 * other way, because the growth is still asserted by that story's own `play`.
 */

// The one list of showcase recreations, shared with `axe-scope.node-check.ts` so the two guards
// cannot disagree about which pages [[showcases-and-fixture]] exempts. Deliberately free of `node:` imports: this module
// runs in the browser through preview.tsx's afterEach.
import { isShowcaseStory } from "./showcases";

/* ---------------------------------------------------------------------------------------------- */
/* THE LAW                                                                                          */
/* ---------------------------------------------------------------------------------------------- */

export type Tier = "small" | "medium" | "large";

/** TRUE — box == its claimed step's ladder value, and the claim == what the ambient tier asks for.
 *  PINNED — box == its claimed step, claim != ambient. A declaration, not a defect.
 *  OFF-TIER-UNDECLARED — declares no step; box lands on a rung, but not the ambient one. See the seam.
 *  BROKEN-BOX — box != its OWN claimed step's ladder value. The control disagrees with itself.
 *  MULTI-ROW — the box is off, but the control renders more than one content row. A bar whose chips
 *    wrapped is not "one row inflated"; it is more than one row, and the single-row law says nothing
 *    about it. Measured and reported, never failed. */
export type Verdict = "TRUE" | "PINNED" | "OFF-TIER-UNDECLARED" | "BROKEN-BOX" | "MULTI-ROW";

/** WCAG 2.5.8 / GUIDELINES §9. Absolute CSS px, by design — it does not ride `--scaling`. */
export const TARGET_FLOOR_PX = 24;

/** THE ONE TOLERANCE. Sub-pixel layout means an exact equality test fails on a correct box, so every
 *  runner of this law compares within it — the sweep below, and `assertMenuOptionBox` in `_assert.ts`,
 *  which measures the PORTAL-ONLY option rows this sweep's control-root selectors deliberately do not
 *  reach. 1px, not 0.5: under parallel suite load the browser's layout rounding drifts sub-pixel (a
 *  24px ghost button measured 23.28 once under a 6-worker run and 24.00 in isolation). Every real law
 *  violation the census found measured >= 2px off its step, so this separates measurement noise from
 *  defects without softening the law. A second copy of this number is a second law. */
export const BOX_EQ_TOLERANCE_PX = 1.0;

/** The row ladder: the vendor's own `--space-5` / `--space-6` / `--space-7` at steps 1 / 2 / 3. */
export const ROW_LADDER_PX: Readonly<Record<number, number>> = { 1: 24, 2: 32, 3: 40, 4: 48 };

/** [[toggle-group-box]]: a group's members step DOWN one size — 24-in-32, 32-in-40, floored at step 1 where the two
 *  coincide. Keyed by the GROUP's step, valued as the member's step. */
export const MEMBER_STEP_OF_GROUP_STEP: Readonly<Record<number, number>> = { 1: 1, 2: 1, 3: 2 };

/** THE NAV LADDER ([[nav-row-ladder]]) — 32 / 36 / 40 at steps 1 / 2 / 3.
 *
 *  A navigation row is an ITEM-family row, not a control-lane button: navigation carries more
 *  prominence than a standard control, so a nav row is taller than the control box at the two lower
 *  steps and meets it at the top. These are DERIVED values, not a ladder anyone picked — each is the
 *  row's own line box plus the Item block padding on both sides, which is how `.rt-ds-item` builds a
 *  row and how the CSS builds the rail:
 *
 *      step 1 → --line-height-1 (16) + 2 × --ds-space-8 (8) = 32
 *      step 2 → --line-height-2 (20) + 2 × --ds-space-8 (8) = 36
 *      step 3 → --line-height-3 (24) + 2 × --ds-space-8 (8) = 40
 *
 *  They are written out here as local constants for the same reason every other number in this file
 *  is: a probe that recomputes the component's own derivation agrees with it by construction and can
 *  never catch a derivation that moved. Both terms carry `--scaling`, so the ladder scales like the
 *  row ladder does and `max(…, 24)` still binds under it.
 *
 *  A COLLAPSED rail rides this same ladder — the rail is the same navigation as the rows it replaces,
 *  so it measures what they measure in both states. */
export const NAV_LADDER_PX: Readonly<Record<number, number>> = { 1: 32, 2: 36, 3: 40 };

/** The rules a box can be judged against, and the ladder each one reads. `row` is the default; a
 *  control inside a ToggleButtonGroup is a `member` ([[toggle-group-box]]); a control inside a SideNav is `nav` ([[nav-row-ladder]]). */
export type BoxRule = "row" | "member" | "nav";

const LADDER_OF_RULE: Readonly<Record<BoxRule, Readonly<Record<number, number>>>> = {
  row: ROW_LADDER_PX,
  member: ROW_LADDER_PX,
  nav: NAV_LADDER_PX,
};

/** WHAT PUTS A CONTROL ON THE NAV LADDER — MEMBERSHIP, NOT ANCESTRY.
 *
 *  The nav ladder belongs to the rail's own ROWS, not to everything that happens to be inside a rail. A
 *  rail can legitimately hold ordinary controls — a "New" button in a header slot, a filter field, a
 *  clear ✕ in a row's end slot — and every one of those is a control-lane control standing in a
 *  navigation surface. Judging by ancestry (`closest(".rt-ds-sidenav")`) put all of them on 32 / 36 / 40
 *  and scored a perfectly correct step-1 24px Button as BROKEN-BOX, with a failure message pointing at
 *  the button rather than at the rule. Proven by injection: a plain `<Button size="1">` dropped into a
 *  SideNav failed the guard.
 *
 *  So membership is read off the classes the rail's rows actually carry. `rt-ds-sidenav-row` is stamped
 *  on all four row regimes — the expanded leaf, the expanded parent's disclosure, the collapsed rail
 *  link and the collapsed flyout trigger (`SideNav.tsx`; it is also the selector list the roving-focus
 *  engine ranges over, so the two agree on what a row is). The collapse toggle is a rail member too and
 *  rides the same rung, so it is named here even though a plain `<button>` is not currently a swept
 *  control root — a rule that only covers what happens to be swept today is the same trap in a new
 *  costume.
 *
 *  `matches`, NOT `closest`: the row class sits on the control root itself. `closest` would sweep a
 *  control NESTED IN a row — an end-slot ✕, an inline action — onto the nav ladder, which is the
 *  original defect one level down. A control inside a nav row is still a control.
 *
 *  Ancestry is not consulted at all, which also means a row inside the portaled collapsed FLYOUT (it
 *  renders outside `.rt-ds-sidenav` by construction) is judged on the ladder it belongs to. */
export const NAV_MEMBER_SELECTOR = ".rt-ds-sidenav-row, .rt-ds-sidenav-collapse-btn";

/** The control lane. `uiSize` tier → the step every unsized control in it resolves. */
export const TIER_STEP: Readonly<Record<Tier, number>> = { small: 1, medium: 2, large: 3 };

/** The declared-pin marker. See THE CONTRACT in the header. */
export const SIZE_LESSON_ATTR = "data-size-lesson";

/** AN INSET AFFIX DECLARES ITSELF ([[control-box-per-step]], amended 2026-07-31).
 *
 *  `IconButton`'s `inset` prop decides the STEP as well as the variant: an in-field / in-chip ✕ is a
 *  step-1 24×24 target whatever step the surface around it claims, and the prop stamps `data-inset`.
 *  Every such affix is therefore a PIN by construction the moment the ambient tier is anything but
 *  small — a text field's clear ✕, a Callout's dismiss, the badge and token ✕ of the [[control-box-per-step]] carve-out
 *  family, all of which reach the attribute through the same prop.
 *
 *  Marking each of those sites by hand with `data-size-lesson` would be asking a story to restate a
 *  rule the component already enforces, and the reason written would be the same sentence every time.
 *  So the rule declares them: an inset affix carries this reason built in. It is a DECLARATION, not a
 *  suppression — layer 1 still measures the box against step 1 and still fails if it is off.
 *
 *  The attribute is the hook because it is what the DOM actually exposes: the badge / token carve-outs
 *  are CSS selectors (`.rt-Badge .rt-IconButton[data-inset]`) over this same attribute, not a marker of
 *  their own, so keying on `[data-inset]` covers the whole family with one test. `closest`, not
 *  `matches`, so a wrapper root whose inner control carries the attribute is covered too. */
export const INSET_AFFIX_SELECTOR = "[data-inset]";
export const INSET_AFFIX_REASON = "inset affix — pinned to step 1 by rule, [[control-box-per-step]] carve-outs";

/** CONTROL ROOTS ONLY. An inner element (`.rt-TextFieldInput` and friends) is not a control — it is a
 *  part of one, and it measures the root minus the root's own border. Measuring parts is how a
 *  perfectly on-ladder 32px field gets reported as a 30px defect.
 *
 *  ADD A NEW SINGLE-ROW CONTROL'S ROOT SELECTOR HERE. A control absent from this map is unguarded,
 *  whether or not it happens to be correct today. */
export const CONTROL_ROOT_KINDS: ReadonlyArray<readonly [selector: string, kind: string]> = [
  [".rt-ds-toggle-group", "ToggleGroupRoot"],
  [".rt-ds-powersearch", "PowerSearchBar"],
  [".rt-ds-tokenizer", "Tokenizer"],
  [".rt-ds-cmdk-inputrow", "CmdkInputRow"],
  [".rt-ds-pagination__page", "PaginationPage"],
  [".rt-ds-pagination__ellipsis", "PaginationEllipsis"],
  [".rt-ds-typeahead-anchor", "TypeaheadAnchor"],
  [".rt-ds-dateinput-anchor", "DateInputAnchor"],
  [".rt-ds-fileinput-compact", "FileInputCompact"],
  [".rt-SelectTrigger", "SelectTrigger"],
  [".rt-SegmentedControlRoot", "SegmentedControlRoot"],
  [".rt-TextFieldRoot", "TextFieldRoot"],
  [".rt-BaseButton", "BaseButton"],
];

/** One selector list, derived — never hand-maintained beside the map above. */
export const CONTROL_ROOT_SELECTOR: string = CONTROL_ROOT_KINDS.map((k) => k[0]).join(",");

/** Kind → its root selector, for a reproduce line in a failure message. */
export const KIND_SELECTOR: Readonly<Record<string, string>> = Object.fromEntries(
  CONTROL_ROOT_KINDS.map(([sel, kind]) => [kind, sel]),
);

/** The expectation, in one place: ladders scale, the target floor does not, and the floor wins below
 *  itself. Returns NaN for a step outside the ladder, which the classifier reports rather than hides.
 *  `rule` picks WHICH ladder — the row box (the default) or the nav ladder ([[nav-row-ladder]]). */
export function expectedBox(step: number, scaling = 1, rule: BoxRule = "row"): number {
  const rung = LADDER_OF_RULE[rule][step];
  if (rung === undefined) return Number.NaN;
  return Math.round(Math.max(rung * scaling, TARGET_FLOOR_PX) * 100) / 100;
}

/** `uiSize` tier → ambient step, tolerating an unknown global rather than throwing inside a hook. */
export function ambientStepOf(uiSize: string | undefined): number {
  return TIER_STEP[(uiSize ?? "small") as Tier] ?? TIER_STEP.small;
}

/* ---------------------------------------------------------------------------------------------- */
/* THE MEASUREMENT                                                                                  */
/* ---------------------------------------------------------------------------------------------- */

export interface ControlBoxRecord {
  /** Which control root matched — a key of `KIND_SELECTOR`. */
  kind: string;
  /** The step the control claims, from its own class/attribute or from the control it wraps. */
  claimed: number | null;
  /** Where the claim was read: `self`, `inner control`, `sibling page cell`, or null. */
  claimFrom: string | null;
  /** The step the ambient tier (or, for a group member, the member ladder) asks for. */
  expectStep: number;
  /** `expectedBox(expectStep, scaling)`. */
  expectBox: number;
  /** `expectedBox(claimed, scaling)` — what layer 1 asserts against. Null when nothing is claimed. */
  claimBox: number | null;
  /** `--scaling` resolved ON THIS ELEMENT, so a nested `<Provider scaling>` is honoured per-instance. */
  scaling: number;
  /** Rendered height / width, divided out of any ancestor `transform: scale()`. */
  h: number;
  w: number;
  v: Verdict;
  /** `row`, `member` or `nav` — which ladder the expectation came from. */
  rule: BoxRule;
  /** A short DOM path, for locating the site in a page full of similar controls. */
  path: string;
  /** The `data-size-lesson` reason found on the control or an ancestor, trimmed. Null when absent. */
  lesson: string | null;
  /** How many content rows the control actually presents. Only computed where it matters. */
  rowCount?: number;
  /** The rung an undeclared off-tier box landed on. */
  landsOn?: number;
  /** Cascade facts, captured only for a box that is off its own step. */
  boxSizing?: string;
  minH?: string;
  padBlock?: string;
  border?: string;
  bbh?: string | null;
  variant?: string | null;
  /** The nearest enclosing container that legitimately seeds a size ([[container-size-seeding]]). */
  seed?: { cls: string; step: number | null };
  /** Cumulative ancestor scale, when it is not 1. */
  scale?: number;
  label?: string | null;
  /** For text-field-shaped roots: the inner input's height. Diagnostic only — never asserted. */
  innerH?: number;
}

export interface SweepOptions {
  /** The step the ambient tier asks for — `ambientStepOf(globals.uiSize)`. */
  ambientStep: number;
  /** Where to sweep. Defaults to the whole document, so portalled menus and dialogs are in scope. */
  root?: ParentNode;
}

/** Sweep every visible control ROOT under `root` and classify each against the law.
 *
 *  Self-contained on purpose in one respect: it reads only this module and the DOM. It is the single
 *  measurement both runners execute — the census injects this file into its page and calls exactly
 *  this function, so the deep sweep and the per-story guard cannot disagree. */
export function sweepControlBoxes({ ambientStep, root }: SweepOptions): ControlBoxRecord[] {
  const scope: ParentNode = root ?? document;
  // getComputedStyle is the hot call in this sweep (the ancestor-scale walk revisits the same
  // ancestors for every control). One cache per sweep; never held across renders.
  const csCache = new Map<Element, CSSStyleDeclaration>();
  const cs = (el: Element): CSSStyleDeclaration => {
    let v = csCache.get(el);
    if (!v) {
      v = getComputedStyle(el);
      csCache.set(el, v);
    }
    return v;
  };

  const ownStep = (el: Element): number | null => {
    const m = /(?:^|\s)rt-r-size-(\d)(?:\s|$)/.exec(String(el.className || ""));
    if (m) return +m[1];
    const d = el.getAttribute?.("data-size");
    if (d && /^[1-4]$/.test(d)) return +d;
    return null;
  };

  // A wrapper that declares no step of its own (the Typeahead / DateInput positioning anchors,
  // pagination's ellipsis <span>) is not stepless — it wraps, or stands beside, a control that DOES
  // declare one. Reading the claim off that inner control is what keeps a legitimately pinned wrapper
  // from being scored a box defect.
  const INHERIT: Record<string, (el: Element) => Element | null> = {
    TypeaheadAnchor: (el) => el.querySelector(".rt-TextFieldRoot, .rt-SelectTrigger"),
    DateInputAnchor: (el) => el.querySelector(".rt-TextFieldRoot, .rt-SelectTrigger"),
    PaginationEllipsis: (el) => (el.parentElement ?? el).querySelector(".rt-ds-pagination__page"),
    FileInputCompact: (el) => el.querySelector(".rt-BaseButton, .rt-TextFieldRoot"),
  };
  const stepOf = (el: Element, kind: string): { step: number | null; from: string | null } => {
    const own = ownStep(el);
    if (own != null) return { step: own, from: "self" };
    const pick = INHERIT[kind];
    if (pick) {
      const inner = pick(el);
      const s = inner ? ownStep(inner) : null;
      if (s != null) return { step: s, from: kind === "PaginationEllipsis" ? "sibling page cell" : "inner control" };
    }
    return { step: null, from: null };
  };

  // --scaling is INHERITED, so reading it off the element resolves the nearest enclosing Theme's
  // value — not the outermost one. A story that mounts a nested <Provider scaling> moves the whole
  // ladder under it, and a probe that assumed 1 would score every control in it a defect.
  const scalingOf = (el: Element): number => {
    const v = parseFloat(cs(el).getPropertyValue("--scaling"));
    return Number.isFinite(v) && v > 0 ? v : 1;
  };

  // Cumulative ancestor scale — a specimen inside a transform:scale() wrapper would otherwise report
  // a box it does not lay out at.
  const scaleOf = (el: Element): { sx: number; sy: number } => {
    let n: Element | null = el;
    let sx = 1;
    let sy = 1;
    let d = 0;
    while (n && n.nodeType === 1 && d < 30) {
      const t = cs(n).transform;
      if (t && t !== "none") {
        const m = /matrix\(([^)]+)\)/.exec(t) ?? /matrix3d\(([^)]+)\)/.exec(t);
        if (m) {
          const v = m[1].split(",").map(Number);
          if (v.length === 6) {
            sx *= v[0];
            sy *= v[3];
          } else {
            sx *= v[0];
            sy *= v[5];
          }
        }
      }
      n = n.parentElement;
      d++;
    }
    return { sx: sx || 1, sy: sy || 1 };
  };

  const pathOf = (el: Element): string => {
    const parts: string[] = [];
    let n: Element | null = el;
    let depth = 0;
    while (n && n.nodeType === 1 && depth < 6 && n.id !== "storybook-root") {
      let s = n.tagName.toLowerCase();
      const clsList = String(n.className || "").split(/\s+/).filter(Boolean);
      const key = clsList.filter((c) => /^rt-ds-|^rt-[A-Z]|^rt-r-size-|^rt-variant-/.test(c)).slice(0, 3);
      if (key.length) s += "." + key.join(".");
      const par: Element | null = n.parentElement;
      if (par) {
        const sibs = [...par.children].filter((c) => c.tagName === n!.tagName);
        if (sibs.length > 1) s += `:nth(${sibs.indexOf(n) + 1})`;
      }
      parts.unshift(s);
      n = n.parentElement;
      depth++;
    }
    return parts.join(" > ");
  };

  const visible = (el: Element): boolean => {
    if (!el.isConnected || el.getClientRects().length === 0) return false;
    const s = cs(el);
    if (s.display === "none" || s.visibility === "hidden" || +s.opacity === 0) return false;
    if (el.closest("[hidden]")) return false;
    const r = el.getBoundingClientRect();
    return r.width > 0 && r.height > 0;
  };

  /* HOW MANY CONTENT ROWS does this control actually present?
   *
   * Interval-merge on the children's vertical spans: two children sit in the SAME row if their
   * [top, bottom] ranges overlap at all. Parameter-free on purpose — the census's earlier heuristic
   * banded children by `round(top / 4)` and so counted an icon sitting 3px above its label as a
   * second row, which made a genuinely single-row 28px button look like a wrapped bar. Overlap is
   * the definition of "same visual row" and needs no tolerance constant.
   *
   * A single wrapping child is transparent: descend through it before clustering, or a Tokenizer
   * whose chips live in one inner <div> reports 1 row forever. */
  const contentRows = (el: Element): number => {
    let host: Element = el;
    for (let guard = 0; guard < 4; guard++) {
      const kids = [...host.children].filter((c) => c.getClientRects().length > 0);
      if (kids.length !== 1) break;
      host = kids[0];
    }
    const spans = [...host.children]
      .filter((c) => c.getClientRects().length > 0)
      .map((c) => {
        const r = c.getBoundingClientRect();
        return { top: r.top, bottom: r.bottom };
      })
      .sort((a, b) => a.top - b.top);
    if (spans.length < 2) return 1;
    let rows = 1;
    let bottom = spans[0].bottom;
    for (let i = 1; i < spans.length; i++) {
      if (spans[i].top >= bottom) {
        rows++;
        bottom = spans[i].bottom;
      } else {
        bottom = Math.max(bottom, spans[i].bottom);
      }
    }
    return rows;
  };

  const round2 = (n: number): number => Math.round(n * 100) / 100;
  // The shared tolerance — see BOX_EQ_TOLERANCE_PX for why it is what it is, and who else reads it.
  const eq = (a: number, b: number): boolean => Math.abs(a - b) < BOX_EQ_TOLERANCE_PX;

  const rows: ControlBoxRecord[] = [];
  for (const el of scope.querySelectorAll(CONTROL_ROOT_SELECTOR)) {
    if (!visible(el)) continue;
    let kind = "Unknown";
    for (const [sel, name] of CONTROL_ROOT_KINDS) {
      if (el.matches(sel)) {
        kind = name;
        break;
      }
    }

    const claim = stepOf(el, kind);
    const claimed = claim.step;
    const rect = el.getBoundingClientRect();
    const sc = scaleOf(el);
    const scaling = scalingOf(el);
    const h = round2(rect.height / sc.sy);
    const w = round2(rect.width / sc.sx);

    const grp = el.closest(".rt-ds-toggle-group");
    const isMember = !!grp && grp !== el;
    // A control that IS a nav row is judged on the NAV ladder ([[nav-row-ladder]]) — a rail row is navigation, not a
    // control-lane button, and it rides the same ladder in both collapse states. Membership, never
    // ancestry: see NAV_MEMBER_SELECTOR for why a control merely sitting inside a rail is not a nav row.
    // A group member inside a nav would be a member first (its ladder is the tighter claim), so the
    // member test is asked first and nav only where it did not fire.
    const isNav = !isMember && el.matches(NAV_MEMBER_SELECTOR);
    const rule: BoxRule = isMember ? "member" : isNav ? "nav" : "row";
    const groupStep = isMember ? (stepOf(grp, "ToggleGroupRoot").step ?? ambientStep) : null;
    const expectStep = isMember
      ? (MEMBER_STEP_OF_GROUP_STEP[groupStep as number] ?? MEMBER_STEP_OF_GROUP_STEP[ambientStep] ?? ambientStep)
      : ambientStep;
    const expectBox = expectedBox(expectStep, scaling, rule);
    const claimBox = claimed != null ? expectedBox(claimed, scaling, rule) : null;

    // The nearest enclosing container that legitimately seeds a size ([[container-size-seeding]]) — it explains a pin.
    let seed: ControlBoxRecord["seed"];
    let p: Element | null = el.parentElement;
    let d = 0;
    while (p && d < 14) {
      const ds = p.getAttribute?.("data-size");
      const clsName = String(p.className || "");
      if (
        (ds && /^[1-4]$/.test(ds)) ||
        /rt-ds-toolbar|rt-ds-chat-composer|rt-ds-composer|rt-ds-toggle-group|rt-ds-powersearch|rt-ds-tokenizer|rt-ds-cmdk|rt-ds-pagination|rt-ds-typeahead|rt-ds-dateinput|rt-ds-datetimeinput/.test(
          clsName,
        )
      ) {
        seed = {
          cls: clsName.split(/\s+/).filter((c) => /^rt-ds-/.test(c)).slice(0, 2).join(" ") || p.tagName.toLowerCase(),
          step: ownStep(p),
        };
        break;
      }
      p = p.parentElement;
      d++;
    }

    let v: Verdict;
    let landsOn: number | undefined;
    if (claimed != null) {
      if (claimBox == null || Number.isNaN(claimBox)) v = "BROKEN-BOX";
      else if (!eq(h, claimBox)) v = "BROKEN-BOX";
      else if (claimed !== expectStep) v = "PINNED";
      else v = "TRUE";
    } else if (eq(h, expectBox)) {
      v = "TRUE";
    } else {
      for (const st of [1, 2, 3, 4]) {
        if (eq(h, expectedBox(st, scaling, rule))) {
          landsOn = st;
          break;
        }
      }
      v = landsOn ? "OFF-TIER-UNDECLARED" : "BROKEN-BOX";
    }

    const lessonHost = el.closest(`[${SIZE_LESSON_ATTR}]`);
    const lessonRaw = lessonHost?.getAttribute(SIZE_LESSON_ATTR)?.trim();
    // AN INSET AFFIX DECLARES ITSELF. See INSET_AFFIX_REASON.
    const lesson = lessonRaw ? lessonRaw : el.closest(INSET_AFFIX_SELECTOR) ? INSET_AFFIX_REASON : null;
    const rec: ControlBoxRecord = {
      kind,
      claimed,
      claimFrom: claim.from,
      expectStep,
      expectBox,
      claimBox,
      scaling,
      h,
      w,
      v,
      rule,
      path: pathOf(el),
      lesson,
    };
    if (landsOn) rec.landsOn = landsOn;
    if (seed) rec.seed = seed;
    if (Math.abs(sc.sy - 1) > 0.001) rec.scale = round2(sc.sy);

    if (v === "BROKEN-BOX") {
      // Only here: the row count that decides single-row scope, plus the cascade facts a reader needs
      // to act on the number without re-opening the story.
      rec.rowCount = contentRows(el);
      if (rec.rowCount > 1) rec.v = v = "MULTI-ROW";
      const s2 = cs(el);
      rec.boxSizing = s2.boxSizing;
      rec.minH = s2.minHeight;
      rec.padBlock = `${s2.paddingTop}/${s2.paddingBottom}`;
      rec.border = s2.borderTopWidth;
      rec.bbh = s2.getPropertyValue("--base-button-height").trim() || null;
      const vm = /rt-variant-([a-z]+)/.exec(String(el.className || ""));
      rec.variant = vm ? vm[1] : null;
    }

    const al = el.getAttribute("aria-label");
    rec.label = (al || (el.textContent || "").trim().replace(/\s+/g, " ")).slice(0, 48) || null;
    if (kind === "TextFieldRoot" || kind === "TypeaheadAnchor" || kind === "DateInputAnchor") {
      const inp = el.querySelector("input.rt-TextFieldInput, input, .rt-TextFieldInput");
      if (inp) rec.innerH = round2(inp.getBoundingClientRect().height / sc.sy);
    }
    rows.push(rec);
  }
  return rows;
}

/* ---------------------------------------------------------------------------------------------- */
/* THE STORY CLASSES                                                                                */
/* ---------------------------------------------------------------------------------------------- */

export interface BoxLawStory {
  /** Storybook story id, e.g. `components-typed-entry-textfield--anatomy`. */
  id: string;
  /** Storybook title, e.g. `Components/Typed Entry/TextField`. */
  title: string;
  /** Story display name, e.g. `Anatomy`. */
  name: string;
  /** The run's `uiSize` global. */
  uiSize?: string;
}

/** Does LAYER 2 apply to this story? See THE TWO LAYERS in the header for why each class is out. */
export function isLayer2Story(story: BoxLawStory): boolean {
  const internal = story.title.startsWith("_internal") || story.id.startsWith("internal-");
  const foundations = story.title.startsWith("Foundations") || story.id.startsWith("foundations-");
  const argDriven = story.name === "Props" || story.id.endsWith("--props");
  // SHOWCASE RECREATIONS ([[showcases-and-fixture]]). Layer 2 exists because a control sitting off the ambient tier on a
  // page a reader LEARNS FROM is a teaching claim that must be declared. A recreation teaches
  // nothing about the size ladder: it depicts an application, and an application legitimately mixes
  // steps — a compact action under a comment body beside a full-size subscribe button is the
  // design, not a pin. Demanding `data-size-lesson` on every such control would be demanding noise,
  // which is the same reason `_internal` and `Foundations` are out. Layer 1 still applies in full:
  // a control whose box disagrees with its OWN step is broken here exactly as anywhere else.
  const showcase = isShowcaseStory(story);
  return !internal && !foundations && !argDriven && !showcase;
}

/** Stories that render under a reader's WCAG 1.4.12 text-spacing overrides, where a wrapped label
 *  growing its box is the asserted BEHAVIOUR rather than a defect. See THE BOUNDARY in the header.
 *  Layer 1 still measures and prints for these; it does not throw. */
export const TEXT_SPACING_STORIES: ReadonlyMap<string, string> = new Map([
  [
    "internal-control-box--control-box-under-text-spacing",
    "[[text-spacing-control-box]] — asserts the box GROWS for a wrapped label under the 1.4.12 overrides, which is a taller " +
      "box than the step by design. The growth is asserted by the story's own play.",
  ],
]);

/* ---------------------------------------------------------------------------------------------- */
/* KNOWN DEBT                                                                                       */
/* ---------------------------------------------------------------------------------------------- */

/** The key a debt entry is written against. Deliberately carries the MEASUREMENT: a site whose number
 *  moves is a different fact and must fail loudly rather than inherit an old excuse. */
export function debtKey(storyId: string, rec: ControlBoxRecord): string {
  const expect = rec.claimBox ?? rec.expectBox;
  return `${storyId} :: ${rec.kind} step ${rec.claimed ?? "none"} — expected ${expect}px, measured ${Math.round(rec.h)}px`;
}

/** LAYER-1 KNOWN DEBT. Key → the measured cause. See KNOWN DEBT in the header for the posture: the
 *  guard still measures, still prints; only the throw is suppressed, and a key that stops failing
 *  fails the run as STALE.
 *
 *  Empty is the correct state, and it IS empty. The one entry this list ever carried was the
 *  PowerSearch bar at step 2 under `--scaling: 90%` — 31px measured against a 28.8px step, because
 *  the Token chip standing in it summed an UNSCALED 24px pointer floor with SCALED centring margins
 *  and so agreed with the ladder at scale 1 and nowhere else. It is paid, not re-keyed: the floor no
 *  longer sits on the chip's visual box at all. It lives on the two boxes a pointer actually hits
 *  (the Token body and the remove ✕), each grown to ≥24px on a margin that gives the growth straight
 *  back — so the chip paints its ladder step, the margins are the only other term, and both scale.
 *  Measured after: 28.8px bar / 21.6px chip at 90%, and 32 / 24 at scale 1. The paired entry in
 *  `SCALING_EXPECTED_FAILURES` (`_control-box.stories.tsx`, key `medium / PowerSearch bar`) is gone
 *  in the same change — they were always one debt with two keys. */
export const BOX_LAW_EXPECTED_FAILURES: ReadonlyMap<string, string> = new Map<string, string>([]);

/* ---------------------------------------------------------------------------------------------- */
/* THE GUARD                                                                                        */
/* ---------------------------------------------------------------------------------------------- */

export interface BoxLawAudit {
  records: ControlBoxRecord[];
  /** Layer-1 failures: a box off its own claimed step, with no debt entry. */
  layer1: string[];
  /** Layer-2 failures: an undeclared pin in a docs story. */
  layer2: string[];
  /** Layer-1 deviations covered by `BOX_LAW_EXPECTED_FAILURES` — warned, not thrown. */
  known: string[];
  /** Debt keys for THIS story that no longer match anything — the list has rotted; fails the run. */
  stale: string[];
  /** Undeclared off-tier controls — the documented seam. Warned, never thrown. */
  undeclared: string[];
}

const site = (rec: ControlBoxRecord): string =>
  `${KIND_SELECTOR[rec.kind] ?? rec.kind}  ·  ${rec.label ? `"${rec.label}"  ·  ` : ""}${rec.path}`;

/** The law, spelled from the tables rather than retyped in prose — so a moved ladder moves the
 *  message too. */
const lawSentence = (): string => {
  const row = [1, 2, 3].map((s) => ROW_LADDER_PX[s]).join(" / ");
  const member = [1, 2, 3].map((s) => ROW_LADDER_PX[MEMBER_STEP_OF_GROUP_STEP[s]]).join(" / ");
  const nav = [1, 2, 3].map((s) => NAV_LADDER_PX[s]).join(" / ");
  return (
    `A size step names ONE box — ${row}px at steps 1 / 2 / 3, group members ${member}, ` +
    `navigation rows ${nav}, expected = max(step × --scaling, ${TARGET_FLOOR_PX}).`
  );
};

/** Measure this story's canvas and classify every control against both layers. Pure — it throws
 *  nothing and logs nothing, so it can be unit-driven from a story's own `play`. */
export function auditStory(story: BoxLawStory, root?: ParentNode): BoxLawAudit {
  const ambientStep = ambientStepOf(story.uiSize);
  const records = sweepControlBoxes({ ambientStep, root });
  const audit: BoxLawAudit = { records, layer1: [], layer2: [], known: [], stale: [], undeclared: [] };
  const hit = new Set<string>();
  const layer2Applies = isLayer2Story(story);

  for (const rec of records) {
    if (rec.v === "BROKEN-BOX") {
      const key = debtKey(story.id, rec);
      const reason = BOX_LAW_EXPECTED_FAILURES.get(key);
      const expect = rec.claimBox ?? rec.expectBox;
      const line =
        `${site(rec)}\n` +
        `      claims step ${rec.claimed ?? "none"} → expected ${expect}px${rec.scaling !== 1 ? ` (step × --scaling ${rec.scaling}, floored at ${TARGET_FLOOR_PX})` : ""}, ` +
        `measured ${rec.h}px  [box-sizing: ${rec.boxSizing}, min-height: ${rec.minH}, padding-block: ${rec.padBlock}, border: ${rec.border}]`;
      if (reason !== undefined) {
        hit.add(key);
        audit.known.push(`${line}\n      KNOWN: ${reason}`);
      } else {
        audit.layer1.push(line);
      }
      continue;
    }

    if (rec.v === "PINNED" && layer2Applies && !rec.lesson) {
      audit.layer2.push(
        `${site(rec)}\n` +
          `      claims step ${rec.claimed} (${rec.h}px) where the ambient ${story.uiSize ?? "small"} tier asks for step ${rec.expectStep} (${rec.expectBox}px)` +
          `${rec.rule !== "row" ? ` — ${rec.rule} ladder` : ""}${rec.seed ? `, inside \`${rec.seed.cls}\`` : ""}`,
      );
      continue;
    }

    if (rec.v === "OFF-TIER-UNDECLARED" && layer2Applies) {
      audit.undeclared.push(
        `${site(rec)}\n` +
          `      declares no step; measures ${rec.h}px, which is step ${rec.landsOn} — the ambient tier asks for ${rec.expectBox}px`,
      );
    }
  }

  for (const key of BOX_LAW_EXPECTED_FAILURES.keys()) {
    if (key.startsWith(`${story.id} :: `) && !hit.has(key)) audit.stale.push(key);
  }
  return audit;
}

/** The failure text, or null when the story is clean. Names the story, the selector, the measured
 *  value and the expected one — everything needed to reproduce without re-running the sweep. */
export function formatBoxLawFailure(story: BoxLawStory, audit: BoxLawAudit): string | null {
  if (!audit.layer1.length && !audit.layer2.length && !audit.stale.length) return null;
  const out: string[] = [
    `THE BOX LAW did not hold in \`${story.id}\` (${story.title} / ${story.name}) at uiSize:${story.uiSize ?? "small"}.`,
    lawSentence(),
  ];
  if (audit.layer1.length) {
    out.push(
      ``,
      `LAYER 1 — ${audit.layer1.length} control${audit.layer1.length === 1 ? "" : "s"} whose box is off ITS OWN claimed step:`,
      ...audit.layer1.map((l) => `  • ${l}`),
    );
  }
  if (audit.layer2.length) {
    out.push(
      ``,
      `LAYER 2 — ${audit.layer2.length} UNDECLARED PIN${audit.layer2.length === 1 ? "" : "S"} in a docs story.`,
      `A control off the ambient tier in a page a reader learns from must declare why: put`,
      `\`${SIZE_LESSON_ATTR}="<the lesson>"\` on the control or any ancestor. It is not a suppression —`,
      `layer 1 still applies. If the deviation is not deliberate, fix the size instead of marking it.`,
      ...audit.layer2.map((l) => `  • ${l}`),
    );
  }
  if (audit.stale.length) {
    out.push(
      ``,
      `STALE DEBT — ${audit.stale.length} entr${audit.stale.length === 1 ? "y" : "ies"} in BOX_LAW_EXPECTED_FAILURES no longer match${audit.stale.length === 1 ? "es" : ""} anything. The site is on-law now; delete the entry:`,
      ...audit.stale.map((k) => `  • ${k}`),
    );
  }
  return out.join("\n");
}

/** The every-run enforcement. Called from `.storybook/preview.tsx`'s `afterEach`, after EVERY story
 *  render in both appearance lanes. Warns on known debt and on the undeclared seam; throws on a real
 *  layer-1 or layer-2 failure. */
export function assertBoxLaw(story: BoxLawStory, root?: ParentNode): void {
  const audit = auditStory(story, root);
  if (audit.known.length) {
    // eslint-disable-next-line no-console
    console.warn(
      `BOX LAW — ${audit.known.length} KNOWN deviation(s) in \`${story.id}\`, asserted and tolerated:\n${audit.known.join("\n")}`,
    );
  }
  if (audit.undeclared.length) {
    // eslint-disable-next-line no-console
    console.warn(
      `BOX LAW — ${audit.undeclared.length} control(s) in \`${story.id}\` sit off the ambient tier and declare no step. ` +
        `A DOM probe cannot tell a local <Provider uiSize> pin from a control that ignores the tier, so this warns rather than fails:\n${audit.undeclared.join("\n")}`,
    );
  }
  const message = formatBoxLawFailure(story, audit);
  if (!message) return;

  // THE BOUNDARY (see the header): layer 1 is measured at default text metrics. A story that
  // renders under a reader's 1.4.12 overrides grows its boxes by design, so it is measured and
  // printed rather than thrown. Everything else still throws, including in these stories — the
  // register suppresses the throw, and the story's own `play` is what holds the growth to account.
  const textSpacingReason = TEXT_SPACING_STORIES.get(story.id);
  if (textSpacingReason) {
    // eslint-disable-next-line no-console
    console.warn(
      `BOX LAW — measured but not enforced in \`${story.id}\`: ${textSpacingReason}\n${message}`,
    );
    return;
  }
  throw new Error(message);
}
