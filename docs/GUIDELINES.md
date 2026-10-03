# Design Language

How to *use* the system. The token CSS is the source of truth for values; this is the
qualitative layer — voice, the alpha-vs-solid philosophy, the variant ladder, icon usage,
state, motion, elevation, and accessibility. See `DECISIONS.md` for the rulings behind these
(`node_modules/dsiab/dist/DECISIONS.md` when you installed the package, the package subpath `dsiab/DECISIONS.md`).

**Scope:** responsive web, pointer and touch input. Touch hit-area accommodation is ruled but **not shipped**
(§9). Native-app chrome is out of scope.

## 1. Voice & tone
Plain, technical, declarative — describe what a thing does, not how to feel. No exclamation points.
- Lowercase single-word prop values: `solid` `soft` `surface` `outline` `ghost`; sizes `1`–`4`; radii `none` `small` `medium` `large` `full`. **`classic` is excluded.**
- Sentence case for headings ("Get started"); title case for product names.
- Second person ("You can override…"). No emoji in product chrome — status is colour + icon, never emoji.
- Numerals as digits ("12 results"). Verbs on buttons ("Save changes", "Add member").
- Empty states: encouraging but spare. Blameless ("No projects yet", never "You haven't created any projects"), one focal line, and at most one next step. An empty container is a beginning, not a failure, so it neither apologises nor celebrates.

## 2. Colour — alpha vs solid (the layering rule)
**Alpha (`-a*`) for everything *inside* a container.** It tints whatever's beneath, so nested layers compose as a clean intensity gradient. Correctly alpha in [`semantic.css`](https://github.com/cakemunny/dsiab/blob/main/src/tokens/semantic.css): `--ds-fill-weaker/weak/hover/press` (gray-a2/a3/a4/a5), `--ds-fill-accent-med/-weak`, `--ds-fill-selected-subtle`, all `*-weak` strokes, status `*-weak` fills.

**Solid only at backstops:** `--ds-bg-base` (page); **every floating surface** — modal, dialog, popover, dropdown, menu, tooltip, toast — MUST be opaque (`--ds-bg-overlay` / `--ds-bg-raised`); final-ink solids (`--ds-fill-accent`, `--ds-fill-{state}`, `--ds-fill-strong`); the scrim (`--ds-scrim`). *A floating surface with no opaque backstop bleeds through.*

A final-ink mark that carries no text paints `--accent-indicator` in place of `--ds-fill-accent` ([[textless-part-fills]]). The focus ring paints `--ds-fill-accent` instead, with a Radix alpha stacked on it, because it frames a control in the button's own colour ([[focus-ring]]).

Role ramp: 1–2 bg · 3–5 component bg · 6–8 borders · 9–10 solid · 11–12 text.

**Brand-aware semantics (collision avoidance, on by default).** Semantics default to fixed hues (error red, warning amber, success green, info cyan). When your brand `accentColor` is hue-close to one of them they'd read as the same colour — so the system automatically shifts **only the colliding family** to a non-colliding Radix scale (e.g. an amber brand moves warning→orange; a green brand moves success→lime), keyed off Radix's `data-accent-color` attribute. It's hands-off: pick any accent and the four semantics stay visually distinct, verified per accent — **brand↔semantic** by a perceptual gate (too close only when ΔE-OK < 0.135 *and* hue < 40°, so it catches hue-apart-but-perceptually-close pairs like teal/cyan that a hue-only check missed), **semantic↔semantic** by the same gate (so e.g. oxblood error stays distinct from an orange warning despite a 16° hue gap, separating by lightness), with colour-not-alone as the backstop. To **override** a specific family, layer your own `--<family>-*` declarations after the system sheet at matching-or-higher specificity (e.g. `.radix-themes[data-accent-color="amber"] { --warning-9: … }` loaded later); only that family moves — the rest keep the auto-shift. The red family (red / ruby / crimson / tomato) is too crowded to separate error inside Radix's named reds, so it routes error to **oxblood** — a 27th *custom* deep-red preset (ΔE-OK 0.21 distinct, by lightness) that's also selectable as a brand from the Accent toolbar. An oxblood brand keeps a normal red error (no collision). White on oxblood-9 reads 9.1:1 / APCA Lc 94 and its error text clears 12.3:1 — above the floors. Interim patch ahead of the full custom-palette generator.

## 3. Typography
Inter (body+heading), Menlo (code). Weights: a deliberate **three** — **400 Base**, **600 Strong** (the UI workhorse for buttons/emphasised labels/headers/menu selection), **700 Strongest** — *not* the common regular+bold two; 600 is the calm UI voice between plain body and full bold, which two weights can't cover without going shouty (700) or flat (400) (DECISIONS [[type-and-target-density]]). Emphasis = italic. **`<Em>` / `<Quote>` = Times serif italic** (`--ds-font-em` / `--ds-font-quote`) — the one intentional typeface contrast. Tracking rides Radix's per-size letter-spacing.

**Alignment.** Reading text is left-aligned — start-relative, so it follows text direction (RTL flips it). Don't justify body copy: forced spacing opens uneven vertical "rivers" and frays the ragged-right edge the eye tracks back to find the next line. Centre only a short heading or a single line, never a paragraph. Pick **one** alignment per block — mixing left- and centre-aligned text in the same group leaves the eye no stable return edge.

**Line-height.** Body and UI text uses the token-aligned Radix ramp — Small 14/20 (**1.43**), Medium 16/24 (**1.5**) — snapped to the size tokens, not tuned to a fixed 1.5 ratio with off-scale line-heights. A 1.5 ratio is a floor for *reading* prose, which sits at Medium and up; dense UI text at 1.43 is intentional. (DECISIONS [[type-and-target-density]].)

**Reading measure.** Prose is constrained to `--ds-text-measure` (`65ch`) — the typographic sweet spot (~65 characters, comfortable range 45–80) where eye-saccade rhythm settles and return-sweep errors are minimal. Below ~45 chars the eye never settles into the line; above ~80 it loses its place on the return sweep. Apply `max-width: var(--ds-text-measure)` to anything read left-to-right as continuous text — body copy, documentation prose, callout / empty-state copy. Do **not** apply it to grids, tables, swatch walls, or side-by-side layouts: visual/data content is scanned spatially and benefits from the room. When prose sits above a full-width component, constrain the prose element, not the section.

**Figures.** A number that updates **in place** is set in tabular figures (`font-variant-numeric: tabular-nums`) — a character counter, a running count, a result total, a page range, a live timestamp, a field value under a stepper, a `+N` overflow chip. Inter's default figures are proportional, so a "1" is narrower than a "4": as the value changes the string re-measures, and whatever is anchored to it — a Clear button, a stepper, the arrow beside a page range — steps sideways under a cursor that never moved. Tabular figures put every digit on one advance width, so the string holds still. Be exact about what that buys: it fixes the width **per digit**, not per string. A value that gains a digit (9 → 10) still widens, and should — reserve the space (a `min-width`) if that jump matters. It is for numbers that CHANGE, not for every number: a static figure inside a sentence reads better in the proportional figures the type was drawn with, and a column of static numbers wants right-alignment as well (`Table`'s `numeric` sets both).

**Figures: where the rule goes.** In [`components.css`](https://github.com/cakemunny/dsiab/blob/main/src/tokens/components.css), never inline in a component, where it cannot be read back as the component's own paint and is invisible to the adopter guard. The constraint on *which* selector is that the declaration must REACH the element that paints the digits. `font-variant-numeric` is inherited, so both shapes are legitimate: on the painting element itself (Pagination's info row, the TextArea counter), or on a **container** it inherits from, which is the right shape for a slot that accepts arbitrary content, since the slot can carry the rule while the content it holds cannot be known in advance (`.rt-ds-chat-meta-timestamp`, `.rt-ds-multiselect-status`, AvatarGroup's counter fallback all do this). What does *not* reach is an ancestor whose descendant resets the property back to `normal`. Every such rule registers in `TABULAR_SITES` (`src/components/ui/_tabular-figures.stories.tsx`), which fails the suite three ways: when a registered site loses its declaration, when the value no longer **resolves** to `tabular-nums` on the rendered element (the arm that catches a declaration that is present but outranked, because it mounts the real components), and when a new rule takes the property unregistered. So there is no hand-kept adopter list to go stale.

**Figures: the three places inline `fontVariantNumeric` is still right.** Outside [`components.css`](https://github.com/cakemunny/dsiab/blob/main/src/tokens/components.css) the property is written inline in exactly three situations, and nowhere else. **(1) A specimen or probe whose subject IS the property.** The Figures page sets both values side by side, and its play sets them on a measuring span. Showing or measuring a difference means writing both. **(2) A table of measured numbers.** The contrast fixtures set it on the ratio columns so the decimals line up under each other. **(3) A number a CALLER composes into a slot the system does not own.** A docs story is a caller like any app, and where the system ships no element to hold the figure there is nothing for a rule in `components.css` to select. `Slider`'s label-row readout is today's only instance (`Slider.stories.tsx`). `DataList.Value` is the same shape and is why that component's numeric treatment is deferred. Case 3 is a **gap marker, not a licence**: each instance names the missing mechanism in a comment beside it, and it disappears the day the ruling lands and the rule moves into `components.css` and the manifest. What is never right: a component's own paint written inline, or a docs page hand-rolling a system component and styling the copy. A specimen renders the real thing and uses the real prop (`Table`'s `numeric`).

**Text smoothing — already handled at the root; do not re-solve it.** The substrate declares `-webkit-font-smoothing: antialiased` and `-moz-osx-font-smoothing: grayscale` on `.radix-themes` itself, so every surface inside the theme inherits it and no component has to ask. Nothing in this system re-declares either property, and nothing should: a second declaration further down can only repeat the root or fight it. When type reads too heavy or too light, the levers are weight, size and colour — the smoothing mode is already set.

**A heading inside chrome is not a page title, and takes its own lane.** `SizeContext` resolves six
lanes (`control`, `text`, `heading`, `chromeHeading`, `display`, `container`). Two of them are headings, and picking the wrong one is the most common size defect in this
system. The `heading` lane (5/6/7 → 20/24/28px) is a PAGE title. A card title, an empty state's
focal line, a panel header: those take **`chromeHeading`** (2/3/4 → 14/16/18px), which is the text
lane plus one step, so it stays subordinate to a page heading and superior to the body beside it.

The lane exists because the page ladder is measurably wrong at that scale. Measured on a 264px
kanban column, moving card titles onto the `heading` lane took four cards from 174/156/188/156px to
336/264/296/228px — one card filling a third of the viewport. Components dodged that by pinning a
literal step, which is worse: a literal is inert, so `ClickableCard` rendered its title at 16px at
*every* tier, and `EmptyState` inverted at large with a 14px title under a 16px description ([[chrome-heading-lane]]).

**So never pin a literal step to escape the wrong lane; take the right lane.** Deleting a pin
without choosing a lane is the other half of the same mistake — an unpinned `Heading` inside a card
takes the page ladder and blows the layout up. [`size-lanes.node-check.ts`](https://github.com/cakemunny/dsiab/blob/main/src/foundations/size-lanes.node-check.ts) holds the policy: every
lane steps, none is inert between small and large, and `chromeHeading` stays exactly one step above
`text` and strictly below `heading`.

## 4. Iconography (Phosphor)
Token weight axis is 2-step: base `regular`, emphasis `fill`. Icon size = the paired text role's line-height (`--ds-icon-*`). Colour is `currentColor` — `--ds-icon-neutral` (gray-11) or the parent's state; on solid fills use `--on-*`; in `<Contrast>` the default `--ds-icon-neutral` flips with the section. Fuller usage *guidance* (not tokens): bold in primary CTAs, fill for status/selected, duotone sparingly for empty states, thin/light only ≥48px; ~0.85–0.9 opacity on solid fills. Phosphor is source of truth; missing glyph → Lucide at stroke 1.5, flagged.

**Optical alignment — fix the artwork first; then a nudge, and never more than 1px.** Geometric centring is arithmetic, optical centring is what the eye reads, and the two disagree whenever a glyph's visual mass sits somewhere other than the middle of its box. The first fix is the SVG: a glyph padded unevenly inside its own `viewBox` is corrected there, once, for every use of it. Where the artwork is right and the placement still reads off-centre, a `margin` or `padding` nudge of **≤1px** is sanctioned — written at the use site with its reason beside it, never tokenised and never larger, because past a pixel the problem is a layout one wearing an optical disguise. Two recurring suspects: an icon inside a button, where a glyph sits beside a label on one side only, and asymmetric glyphs — a play triangle, a chevron, a magnifier with a handle — whose weight leans away from their geometric middle.

**Optical WEIGHT is a separate axis from stroke weight, and a few glyphs need a step up.** Phosphor's
`regular` is one stroke weight, not one perceived weight: a glyph made of small disconnected marks
carries far less ink than one made of continuous strokes. In a row of icon-only buttons the light
one reads as disabled, or as nothing at all. The recurring offender is the three-dots overflow
glyph, which is why **`MoreMenu` ships `DotsThreeVertical weight="bold"`** rather than leaving it at
`regular` — and why an overflow menu should BE a `MoreMenu` rather than a hand-rolled `IconButton`
around the same glyph ([[optical-icon-weight]]). The same applies to any sparse glyph you place
beside dense ones: `DotsThree`, `DotsSixVertical`, `Minus`, and single small marks. Judge the row,
not the glyph, and step the sparse one to `bold` until the row reads evenly.

## 5. Action emphasis — the priority ladder
`Button` / `IconButton` expose a **`priority`** prop (the UI-priority grade), not a raw variant:
| Priority | Radix variant | Use |
|---|---|---|
| `primary` | `solid` | the single most-consequential action |
| `secondary` (default) | `surface` | alternatives — Cancel, Back, Export |
| `tertiary` | `ghost` | low-stakes / repeated / utility |

**One solid primary per page** — `primary` is opt-in (default is `secondary`) so a solid is always deliberate. Exceptions: destructive+safe → safe `primary`, destructive `solid` red; equal-weight → both `secondary`; paired commit → only the commit `primary`.

**Destructive actions — `tone="danger"` ([[destructive-tone]]).** Cross the priority ladder with `tone="danger"` for destructive intent: danger-solid for the confirm-dialog moment, danger-surface/ghost for in-context delete actions. Never `color="red"` — it bypasses the brand-collision shift. Labels carry verb + object ("Delete project"), and destructive icon buttons keep a leading glyph so colour is never the only cue.

## 5a. Variant policy — soft is for display, not inputs
**Interactive / input components use `surface`** (TextField, TextArea, Select, Checkbox, CheckboxGroup, RadioGroup, and Button-secondary). Surface stands distinct from the parent (border + fill) so the control is identifiable and separated from the background, with hover feedback. **`soft` is never used on inputs or interactive controls** — it's flat/tinted and doesn't separate from the bg. `soft` is allowed only on **display-only / decorative** UI (Badge, Callout, etc.). `outline` and `classic` are not used anywhere. A floating surface (Select content, popovers, menus) is **`solid`** — opaque, per the layering rule (§2).

## 6. State & interaction
Hover: bump one step (`--ds-fill-accent-hover`) or neutral `--ds-fill-hover`. Press: `--ds-fill-press`. Selected: `--ds-fill-selected` / `--ds-fill-selected-subtle`. Disabled: `--ds-text-disabled` / `--ds-fill-disabled` (low-contrast by design, WCAG-exempt). Focus: see §9.

A selected row in a list, a nav or a picker also sets its label at `--ds-font-weight-strong` in `--ds-text-strong` and draws its icon solid, and every other row keeps a regular label and an outline icon ([[selected-row-cue]]). Item and the rows built on it supply the icon weight, so pass no `weight` to a row icon. A card has no single label, so a selected card takes the [[part-fill-edge]] band instead.

## 7. Motion ([`motion.css`](https://github.com/cakemunny/dsiab/blob/main/src/tokens/motion.css))
Motion communicates state change — it never decorates. Subdued by default: no bounce, spring overshoot, or parallax. Animate to show that something appeared, left, expanded, or responded to a press; if nothing changed state, nothing moves.

**Duration ladder** — intent-named, prefer the shortest tier that reads:

| token | ms | role |
| --- | --- | --- |
| `--ds-duration-instant` | 40 | press / active feedback |
| `--ds-duration-micro` | 80 | switch / segmented thumb travel, hover backgrounds |
| `--ds-duration-fast` | 120 | colour / in-place changes; tooltip in; dismissal gestures |
| `--ds-duration-overlay` | 150 | popper tier in — menu, popover, flyout |
| `--ds-duration-moderate` | 180 | modal tier in; tooltip out |
| `--ds-duration-emphasis` | 260 | popper tier out |
| `--ds-duration-expressive` | 320 | modal tier out — `Dialog`/`AlertDialog` and their backdrop, `Toast`, the `MobileNav` drawer |
| `--ds-duration-advanced` | 400 | complex multi-element orchestration — **no shipped consumer yet** |

**Easing — fast in, slow out ([[motion-retiming]]).** Entrances decelerate in quickly (answer the intent); exits depart on the standard curve at a LONGER duration (leave readably, don't flee).

| token | curve | use |
| --- | --- | --- |
| `--ds-ease-standard` | `cubic-bezier(0.2,0,0,1)` | in-place change (colour, fill, transform on a persistent element) — and `[data-state="closed"]` departures ([[motion-retiming]]) |
| `--ds-ease-entry` | `cubic-bezier(0.10,0,0,1)` | open / state-change (`[data-state="open"]`) |
| `--ds-ease-exit` | `cubic-bezier(0.30,0,1,0.80)` | snaps — three sites in all: the `Toast` swipe-out and swipe snap-back, plus the `Overlay` scrim's in-place hide fade. No longer the default close curve ([[motion-retiming]]) |
| `--ds-ease-linear` | `cubic-bezier(0,0,1,1)` | opacity- or colour-only fades |

[[motion-retiming]]'s own sentence scopes the exit curve to dismissal *gestures*; the scrim's hide fade is a third, non-gesture site that ships today — the divergence is recorded here and queued for a ruling, not resolved.

**An enter fires on open or state-change — never on mount.** Nothing animates in on page load: a surface already on screen when the page paints is simply *there*, and the entrance curves belong to things that arrive because something happened. `SideNav` implements this literally — its group animation sits behind a `data-animate` attribute the first paint does not carry. **One shipped surface still escapes the rule, named here rather than hidden:** a `TreeList` seeded with `isExpanded` runs its child-row reveal (`ds-tree-reveal`) at first paint. A deviation awaiting a ruling, not a licence for a second.

**Stagger — one documented gap, and it is the intra-list one.** Items entering *within a list* step by `--ds-stagger-step` (24ms) apart. That is the whole of the system's stagger guidance: the token has **no shipped component consumer yet** — only the Motion foundation page demonstrates it. Anything coarser (sections, paragraphs, words) is deliberately undocumented, and the first real consumer brings both the question and its value with it. The silence is a decision, not an omission.

**What is NOT in the system.** No spring/physics tokens, no overshoot or anticipation curves, no parallax, no looping decorative motion, no per-component bespoke durations. Five ambient loops run in the component layer and only **two** are authored here — see *Ambient loops* below; nothing else in that layer loops. (Storybook's own pages run a handful of demo loops to show motion standing still — documentation, not shipped UI.) If a need isn't covered by the ladder, escalate the decision — don't invent a token inline.
- **Scroll-position animation is exempt — it paints nothing** ([[scroll-position-animation]]). This section governs `transition` and `@keyframes` on painted elements; a frame-loop integrator driving `scrollTop` moves a viewport and paints nothing of its own, so the no-spring line does not reach it. The exemption is bounded: reduced motion short-circuits it to an instant jump, and no `--ds-*` token is minted for the constants (they are named module constants, documented at their use site). The chat transcript's bottom-pinning spring is the one instance.

**Animatable properties** — stay on the compositor:

| | properties |
| --- | --- |
| do | `opacity`, `transform` (translate / scale) |
| avoid | `box-shadow`, `background-color`, `color` (paint-only; fine for short fades, never for large surfaces) |
| never | `width`, `height`, `top`/`left`, `margin` (layout thrash) — **exception:** accordion/collapsible height via `var(--radix-accordion-content-height)` / `var(--radix-collapsible-content-height)` |

**A transition names its properties.** `transition: all` is banned — guard-enforced. A wildcard transition animates whatever happens to change, layout included, and silently absorbs every property a later edit adds to the rule; list the properties you mean.

**`will-change`** is restricted to compositor properties (`transform`, `opacity`, `filter`) plus `auto`, the reset value — guard-enforced. Declare it only where a measured, JS-driven transform runs on a specific element (the Outline indicator's sliding bar is the one instance); never as a blanket hint.

**Ambient loops (the exception), and who owns them.** A loop's period is intrinsic to the loop rather than a UI transition, so the two authored loops carry literal durations instead of ladder tokens: the `StatusDot` live pulse at 2s, and `ChatMessageMetadata`'s send-status glyph at 1.5s (the message row breathes while it sends, and `ChatComposer` animates nothing). Each declares its own `prefers-reduced-motion` silence, because the ladder's clamp only reaches values that came from the ladder. **The skeleton pulse is not ours.** No keyframe here declares it and no `--ds-*` duration drives it: it is Radix Themes' own animation, shipped, like `Spinner`'s leaf fade and `Progress`'s indeterminate sweep, with no reduced-motion guard at all. [`components.css`](https://github.com/cakemunny/dsiab/blob/main/src/tokens/components.css) silences all three. The `Skeleton` line is the single sanctioned `!important` in that file, because Radix declares its pulse on a bare class with `!important` and specificity alone cannot reach it ([[feedback-set]]).

**Reduced motion.** Honored in the token file, not left to consumers.
- safe: collapsing all durations to ~0 (built in) — instant state changes, no animation, layout intact.
- risky: animations whose *end* triggers logic. Radix suspends unmount until `animationend`; if the duration were `0` the event might not fire, so durations collapse to `0.01ms`, not `0`.
- repudiate: removing the animation entirely at the component layer, or gating motion behind JS. Don't — the token file already neutralizes motion; duplicating that risks a state that never unmounts.

**Radix integration.** Radix Primitives animate via CSS `@keyframes` keyed on `[data-state]` / `[data-side]`.
- **Use `animation` (keyframes), not `transition`, for exits.** Radix Presence keys unmount off `animationend`; a `transition` on `[data-state="closed"]` pops the element out with no exit animation.
- **A keyframed open/close RESTARTS on interruption — it does not reverse.** A CSS animation begins at its own `from`, not at the value an interrupted run had reached: toggle a collapsible mid-open and the close replays from the full measured height rather than from the height it actually had. That jump is the price of keying unmount off `animationend`, not a choice — and it is why keyframes stay on the open/close lifecycle. An in-place change belongs on `transition`, which *does* interpolate from wherever the element currently is.
- **Scale from the trigger:** `transform-origin: var(--radix-<component>-content-transform-origin)` (e.g. `--radix-popover-content-transform-origin`).
- **Animate height only via the Radix var:** `var(--radix-accordion-content-height)` — the one sanctioned layout animation.
- **Reduced motion is `0.01ms`, never `0`,** so `animationend` still fires.

## 8. Elevation ([`shadow.css`](https://github.com/cakemunny/dsiab/blob/main/src/tokens/shadow.css))
**One ladder, two expressions.** Elevation displaces a surface relative to the overhead light: **up** moves toward the light — a lighter surface in dark, a deeper drop shadow in light; **down** moves into shadow — a *darker* surface in **both** modes, with an inset bevel carving the edge. Shadows do **not** vanish in dark — Radix ships deepened dark `--shadow-*` variants, so dark elevation is a lighter surface *and* a kept shadow.

Five levels, the same set in both modes:

| Level | Surface | Shadow |
| --- | --- | --- |
| Sunken | `--ds-bg-sunken` (gray-2 light · `black-a6` dark — below base) | `--ds-shadow-inset` |
| Base | `--ds-bg-base` | none |
| Raised | `--ds-bg-raised` | `--ds-shadow-2` |
| Overlay | `--ds-bg-overlay` | `--ds-shadow-overlay` (= `--ds-shadow-5`) |
| Modal | `--ds-bg-overlay` | `--ds-shadow-6` |

`--ds-shadow-1..6` (etched composite, 1px alpha ring + layered drops) are the **palette** the levels draw from — `-1` is the inset ring, `-3` is raised-on-hover. `--ds-shadow-inset` is the recess bevel: shadowed top, light-catching bottom, with an identifiable rim (a dark-on-dark edge would vanish in dark). **Hover lifts the shadow, never the y-position.**

**Concentric radius.** Nested rounded surfaces derive the inner radius from the outer: `inner = max(0, outer − padding)`. Never reuse the outer radius inside itself — a nested equal radius reads as a misregistered corner.

**Shadows complement boundaries — they never replace one.** Elevation is expressed with the `--ds-shadow-*` recipe above and nothing else: hover **lifts one level**, it does not invent a bespoke shadow, and [[elevation-model]] is what assigns the six steps to the five levels. What that recipe cannot do is carry an accessibility-relevant boundary. Its ring is a single-digit-percent alpha — `--gray-a3` resolves to `#0000000f` (~6%) in light and `#ffffff12` (~7%) in dark — nowhere near the 3:1 that non-text contrast (1.4.11) asks of an edge that identifies a control or its state. So any boundary that must be *visible* keeps an opaque `--ds-stroke-*`, and the shadow is depth laid on top of it: a card can lose its shadow and still read as a card; a control that loses its stroke has lost its outline.

**Stacking order is the neighbouring axis, named separately ([`stacking.css`](https://github.com/cakemunny/dsiab/blob/main/src/tokens/stacking.css)).** Three rungs order
surfaces against *other* components: `--ds-z-skip-link` (10), `--ds-z-panel` (50 — the portaled
floating surfaces) and `--ds-z-toast` (60, above an open panel). They live in their own file rather
than here because a skip-link casts no shadow: elevation and paint order are different axes.
**The gaps are yours:** app chrome at 11–49, anything that must clear our panels at 51–59, anything
above 60. Ordering *inside* one component — the `0`/`1`/`2` that stacks a chip under its own label —
stays a raw number on purpose: it means nothing outside that component, and a token name would claim
it did. **All three rungs take effect**, verified in a browser: set a plane at `z-index: 20` under an
open menu and the menu stays above it; lower `--ds-z-panel` below 20 before opening and it goes under.
The panel rung reaches the screen by an indirect route — Radix copies the panel's computed `z-index`
onto the portal wrapper it positions, at mount — so the value is captured when a panel *opens*, and
changing the token under an already-open panel does not move it. [[stacking-ladder]] rules the ladder and carries the
mechanism.

## 8a. Seams — a boundary is drawn once

A seam is the hairline between two regions of a screen: a rail against content, content against an
inspector, a header against a body. Several things in this system paint one, all from the same
`--ds-stroke-weak`, and nothing stops two of them landing on the same boundary. When that happens you
get two hairlines a pixel apart, which reads as a heavy or blurred border rather than as a mistake,
so it survives review. **Exactly one thing may draw any given seam** ([[seam-ownership]]).

**Who already owns a seam, so you do not add a second.**

| The seam between | Is drawn by | So do NOT also add |
|---|---|---|
| Two `Layout` areas | `Layout`'s own divider (`hasDividers`) | a `Separator`, or a border on either area |
| A resizable `Layout.Panel` and its neighbour | the panel's `ResizeHandle`, which *is* the hairline | anything — `Layout` already suppresses its divider here |
| `SideNav` and the content beside it | `SideNav`'s own trailing border | a border on the content's leading edge |
| Two plain regions you laid out yourself | whichever one you choose | the other one |

That last row is the only case with a choice, and the rule is just to make it once. Put the border on
one side and leave the other bare, the way the right rail owns its `borderLeft` in the social-feed
recreation while the feed column beside it declares nothing.

**A scroll gutter is not a seam, and should not sit on one.** A `ScrollArea`'s track is about 4px of
visible chrome pinned to the scroll root's edge. Flush against a divider it reads as a second rule.
Give the scrolling region's **parent** an inline-end inset so the gutter clears the boundary; padding
the `ScrollArea` itself barely moves it, because Radix pins the scrollbar to the root.

## 8b. Narrowing — what a container does as it gets smaller

A resizable panel, a rail, a column: all of them end up narrower than the author pictured, and what
happens then is a design decision rather than a default to inherit.

**A horizontal scrollbar is a defect unless it is deliberate.** If content reflows down to some width
and then hands the reader a sideways scroll, the reflow bought nothing. Give the container a real
minimum width and make the content work down to it. The deliberate exceptions are narrow and
recognisable: a code surface where a long line must not wrap, a data table that genuinely needs
two-dimensional layout, a horizontally scrolling shelf that IS the widget. Everything else that
scrolls sideways is telling you something inside it refuses to shrink.

**Truncate labels; reflow prose.** The split is by content kind, not by container:

| Content | As the container narrows |
|---|---|
| A title, nav row, list item, tab, breadcrumb, filename | **Truncate** to one line with an ellipsis |
| A paragraph, message body, description, help line | **Reflow** naturally, as many lines as it needs |

A single-line label that wraps does not merely look wrong, it drives the layout: its min-content
width is its longest unbreakable word, so one long filename can set the minimum width of an entire
panel, and that is usually why the horizontal scrollbar appeared. `Item` already truncates a STRING
label to one line by default; a label passed as a node opts out of that, which is worth knowing
before wondering why one row behaves unlike its neighbour. Hand-composed rows need `min-width: 0` on
the flex child as well as the overflow and ellipsis, because a flex item will not shrink below its
content without it.

**Where truncation hides something, give it back.** The 1.4.12 ellipsis allowance in §9 holds only
when a mechanism reveals the full text: a `Tooltip`, a `title`, or a destination that carries it.

## 8c. Surfaces are opaque, and alpha is spent deliberately

**A surface that content can scroll behind is a defect.** Radix ships `panelBackground="translucent"`
by default, which makes every Card, panel and menu a 3.5% wash. `Provider` overrides it to `solid`
([[panel-background]]), and nothing in this system should put it back without a reason it can defend. The symptom is
distinctive and easy to misread: a lighter band at the edges of a scroll container that moves and
flickers as content passes beneath, **visible only in dark appearance**, because a light wash over
near-black is obvious and over white is invisible.

Dark-only is the diagnostic. If an artefact appears in one appearance and not the other, suspect an
alpha compositing over a surface whose luminance flipped, and measure the composite rather than
reading the declaration.

**Where alpha IS the point, it carries an obligation in both directions.** `--ds-scrim` is the clear
case: it must be dark enough that text on it clears 4.5:1 over unknown media, and light enough that
the media survives. Measured: at 0.60 white text over worst-case white media reads 5.74:1; at 0.90 it
reads 17.49:1 and the photograph underneath is gone. One value serves both appearances ([[scrim-value]]) —
black alpha is black in either, so an appearance override is a choice and needs a reason.

**A token that composites is measured composited.** Rastering `rgba(0, 0, 47, 0.15)` as though it
were opaque overstates its contrast by an order of magnitude. Composite it over the surface behind
it first. [`src/foundations/_assert.ts`](https://github.com/cakemunny/dsiab/blob/main/src/foundations/_assert.ts) does this correctly, and hand-rolled probes routinely do not.

## 9. Accessibility — WCAG 2.2 AA
Built into the tokens and verified continuously (contrast assertions + axe).
- **Text contrast (1.4.3)** ≥ 4.5:1 for body text, labels, and `--on-*` text on a solid fill, which also reaches APCA Lc 60 (below). Large headings ≥ 3:1. **Exempt:** `--ds-text-disabled`, and **placeholder text**, which is hint text rather than the control's identity, since the field is identified by its surface border.
- **How contrast is kept ([[contrast-by-alpha-stacking]]).** When a colour falls short of its floor, stack on its own colour the lightest Radix black or white alpha that clears it. A part without text clears WCAG 3:1 and APCA Lc 30. The one exception is a large fill that carries text, which moves to the colour's own deeper step ([[text-on-solid-fill-contrast]]).
- **Open gap: link, warning and success text in light ([[secondary-text-contrast-gap]]).** They use step 11 and read 4.26 to 4.50:1 on some colours, most often on `--ds-bg-subtle`, where warning text falls short on every colour. Dark mode clears. Step 12 would clear but read like primary text, so this waits for generated tokens.
- **Text on a solid fill → 4.5:1 and APCA Lc 60, at rest and on hover ([[text-on-solid-fill-contrast]]).** Radix's step 9 is a component background and makes no text promise, and white on it measures 3.0 to 3.9:1 on most scales. The fill that carries text is `--ds-fill-accent` / `--ds-fill-error` and their `-hover` roles: steps 9 and 10 where those pass, and the colour's own light step 11 where they do not, the same value in both appearances. On hover and press the rest fill stays and a Radix alpha is stacked over it ([[interaction-state-alphas]]): `--black-a2` under a white label, `--white-a4` under a dark one. Put text on a solid colour by painting from these roles and their `--on-*` ink, never from a raw step 9. The status solids (`--ds-fill-warning`, `-success`, `-info`) carry glyphs rather than text and are held to the 3:1 non-text floor, so text on them is not covered. Solid `Code` paints the same pair, and a linked chip takes the same hover overlay ([[textless-part-fills]]).
- **Parts without text → 3:1 against the page, one shade with their buttons in light ([[textless-part-fills]]).** A checkbox or radio fill, a switch track, a slider range, a progress bar, a tab underline, a status dot and a selected outline paint Radix's `--accent-indicator` / `--accent-track`, never `--ds-fill-accent`, which is the fill that carries text. [`theme.css`](https://github.com/cakemunny/dsiab/blob/main/src/tokens/theme.css) points both at the text fill in light on the colours [[text-on-solid-fill-contrast]] deepens, and keeps Radix's step 9 in dark. A glyph on one of these fills (a check, a radio dot) owes 3:1 on that fill. **Where the fill itself reads under 3:1 or APCA Lc 30, the part stacks a 1px edge on it ([[part-fill-edge]], [[status-dot-edges]]).** On light amber, lime, mint, sky and yellow and on dark gray, pink, plum, purple, violet, iris, indigo and oxblood, every one of these parts paints `--accent-part-edge` as the top 1px inset ring over its own fill, the lightest Radix alpha whose stack clears both floors against the page, the subtle recess, a card and a panel, and against the track under a progress bar or a slider range. Every other colour paints nothing there. A selected CheckboxCards or RadioCards card keeps its 2px band where it sits, with the edge on the band's outer 1px ([[radio-cards-band-edge]]). Any other mark that paints `--accent-indicator` stacks the same edge: the Calendar today bar outside a range, the DragHandle drop line and its end dot, and a chart point or legend swatch drawn in the accent ([[indicator-mark-edges]]). A mark that sits on a tint takes its own step instead ([[mark-on-tint-edge]], below), and so does the current Pagination dot ([[neutral-part-stacks]], below). A part given `color` or `highContrast` takes the same edge ([[colour-prop-and-high-contrast]], below), and the `soft` variant is not covered.
- **A mark on a tint, and a dashed drop edge → 3:1 and APCA Lc 30 against the tint and the surface ([[mark-on-tint-edge]], [[drop-target-dash]]).** A mark that sits on a tint owes its floors against the tint as well as the page: the Calendar today bar inside a range, the Outline bar on its rail and a chart line on its area fill. Each stacks `--accent-mark-edge` in place of `--accent-part-edge`, the lightest Radix alpha whose stack clears both floors against the tint and the surface, and the today bar is held on the popover panel as well as the page. A chart line takes it as a second path in `--accent-mark-edge` along the same path at the same width. The dashed edge a drop target shows during a drag, on the DragHandle empty slot and the FileInput drop zone, keeps accent step 7 and lays a second 1px dash in `--accent-dash-stack` on it, dash for dash, which clears both floors against the tint and the page, the subtle recess, a card and a panel. A new dashed drop edge stacks the same variable the same way.
- **A grey or white part → 3:1 and APCA Lc 30 against every surface and neighbour ([[neutral-part-stacks]]).** An inactive Pagination dot is a 1px ring with a clear centre, `--ds-fill-press` with `--neutral-ring-stack` stacked on it, and the current dot is a `--ds-space-20` pill in `--accent-indicator` with `--accent-mark-edge` as its edge, so the current page differs by shape as well as colour. The Slider thumb stacks `--accent-slider-thumb-stack` on its ring, the selected SegmentedControl segment stacks `--neutral-ring-stack` on its ring, and the ScrollArea thumb stacks `--neutral-thumb-stack` on its fill. Each is the lightest Radix alpha whose stack clears both floors against the page, the subtle recess, a card and a panel and against the part's neighbours: the thumb's range and track, the segment's track and the scroll thumb's lane. A Slider given `color` or `highContrast` takes the same stack ([[colour-prop-and-high-contrast]], below), and the classic and soft variants are not covered.
- **A status dot and the description on a selected row ([[status-dot-edges]]).** A warning, success or error StatusDot, the Avatar status dot with it, stacks `--warning-dot-edge`, `--success-dot-edge` or `--error-dot-edge` as a 1px inset ring on its fill, the lightest Radix alpha whose stack clears WCAG 3:1 and APCA Lc 30 against the page, the subtle recess, a card and a panel, keyed on the brand because the status families shift with it. A new part that paints a status fill and carries no text stacks the same edge, as the CodeEditor change bar does. A selected Item row sets its description in `--ds-text-strong` on the `--ds-fill-selected-subtle` tint, 4.5:1 and Lc 60 or more, and the tint stays the one Select, the CommandPalette and the current Pagination page share.
- **The switch thumb stays white ([[textless-part-fills]]).** Where a white thumb falls under 3:1 against its track, its 1px ring paints `--accent-thumb-stroke`, the lightest step of the same colour that clears 3:1. Never recolour the thumb. A switch given `color` or `highContrast` takes the same stroke ([[colour-prop-and-high-contrast]], below), and the Switch does not offer `soft`.
- **A part given its own colour or `highContrast` → the same edge, stroke, band and stack as the default part ([[colour-prop-and-high-contrast]]).** Radix's `color` prop writes `data-accent-color` on the part, and every table in [`theme.css`](https://github.com/cakemunny/dsiab/blob/main/src/tokens/theme.css) that the parts read also names a part that sets its own colour, in both appearances and in both [[dark-override-selectors]] shapes, so a Checkbox, Radio, Switch, Slider, Progress, tab line or card picker given `color` paints what the same part paints on a theme of that colour. A `highContrast` part takes the same rules, and a `highContrast` card band paints `--accent-12`, the shade of its own checkbox. Switch, Slider and Progress do not offer `soft`, Progress included past [[soft-variant-scope]]: its pale fill read as low as 1.24:1 against the page, and `variant="soft"` is a type error ([[published-aschild-props]]). Oxblood reaches a part only through its theme, since Radix's `color` prop does not list it.
- **A focused card picker rings 4px, selected or not ([[card-picker-focus-width]]).** A CheckboxCards or RadioCards card rings 4px on its edge, twice the width of every other ring, because a selected card rests with a 2px band that the 2px ring matched. The 2px strip inside the band is what tells a focused card from a selected one, on every colour and in forced colours. Every other ring stays 2px, and the ring keeps the page's accent.
- **The tab panel sits 16px below its tab list, and the ring clears the list by 12px ([[tab-panel-focus-clearance]]).** Tabs owns the gap, so place `Tabs.Content` directly after `Tabs.List` with no spacer. A wrapper with its own top space doubles the gap. To remove or change it, give the panel its own `mt`.
- **A part given any colour, oxblood included, paints what the same part paints on a page of that colour ([[part-colour-parity]]).** Type a wrapper's `color` with `AccentColor`, and write it through `accentColorProps` from `theme/Provider`, spread ahead of the caller's props, because Radix drops oxblood from its own `color` prop. A new accent value in [`theme.css`](https://github.com/cakemunny/dsiab/blob/main/src/tokens/theme.css) or `semantic.css` names the part beside the theme root, as [[colour-prop-and-high-contrast]] and [[part-colour-parity]] do, and the focus ring stays on the root, so a coloured part rings in the page's accent.
- **Warning fill takes a dark foreground** (`--on-warning`, near-black). Amber-9 is light in both appearances, so the label stays dark. The one exception is the `apca` contrast mode on the gold, amber, yellow and lime brands, where warning shifts to orange-9 and its label turns white in the light appearance ([[apca-contrast-mode]]).
- **Use of colour (1.4.1):** status = colour + icon/text, never colour alone.
- **Reduced motion (2.3.3):** honoured in [`motion.css`](https://github.com/cakemunny/dsiab/blob/main/src/tokens/motion.css).
- **Focus visible (2.4.7) & non-text contrast (1.4.11):** one ring, system-wide, the same on every control (DECISIONS **[[focus-ring]]**, which superseded the first neutral focus ring, a gray-12 hairline). It is the accent fill, `--ds-stroke-focus` (the button's own `--ds-fill-accent`), with one Radix black or white alpha, `--ds-stroke-focus-stack`, stacked on it, 2px wide, and 4px on a CheckboxCards or RadioCards card, where a selected card rests with a 2px band (**[[card-picker-focus-width]]**). The stack is the lightest step that clears WCAG 3:1 and APCA Lc 30 against every surface a ring sits on, on 27 colours in both appearances ([`theme.css`](https://github.com/cakemunny/dsiab/blob/main/src/tokens/theme.css)). It sits 2px outside a control, the same gap on a button and an input (DECISIONS **[[button-focus-ring-offset]]**, **[[input-focus-ring-offset]]**, measured by *RingGapOutsideEdge*), and 2px inside where it sat inside: the Tabs trigger, the SegmentedControl item, the cards, a ScrollArea viewport, the highlighted menu and Select rows and a button inside a field. On `Overlay`'s scrims the ring keeps its base and takes a stack measured for that veil. Under forced colours it is a 2px `Highlight` outline, 4px on a card picker. Paint a ring of your own the same way: set `outline-width: 2px`, `outline-style: solid` and `outline-color: var(--ds-stroke-focus)` on the element, and draw `--ds-stroke-focus-stack` on top in the same geometry, never either layer alone. Held by `_internal/Focus` and `_internal/Non-text contrast` → *FocusRingOnParts*.
- **Target size (2.5.8)** ≥ 24×24, incl. compact size-1 — the AA floor **and** the right *cursor* target for a pointer-first product. The larger **44–48px** guideline (AAA 2.5.5 / Apple HIG / Material) is the *touch* target: 24×24 stands as the **pointer floor**, and under `pointer: coarse` the ruling is that small controls extend **invisible hit areas to ≥44×44** (visible geometry unchanged). That accommodation is **deferred, not dropped** — until it lands, the shipped behavior is the 24×24 floor everywhere.
- **Focus order (2.4.3) — closing a modal surface returns focus to whatever opened it.** Radix returns it only to a registered `Trigger`; a surface driven from an `open` prop registers none, and Radix's own handler cancels the focus scope's restore without replacing it, so focus falls to `<body>`. Every modal surface here (**Dialog / AlertDialog / Lightbox / CommandPalette / MobileNav**) supplies the restore itself (DECISIONS **[[focus-return-on-close]]**), so this holds whether you use the exported `Trigger` or hold `open` yourself.
- **A disabled control must still read as disabled without a cursor.** `cursor: not-allowed` reaches nobody on touch and nobody on a keyboard. Any component rule that paints a control outranks Radix's `[data-disabled]` skin, so it has to carry its own disabled arm — repaint from `--ds-{text,icon}-disabled`, or dim the control (DECISIONS **[[disabled-paint-arm]]**). Those two roles are the system's deliberate low-contrast exception and are exempt from the ratio floors.
- **Lean on Radix primitives** for keyboard nav, roles and names. The rule is do not break them. Where a primitive does less than it appears to, this layer fills the gap and names it: close-focus above (**[[focus-return-on-close]]**), the toast rail under a modal (**[[toast-under-modal]]**), the dialog description reference (**[[dialog-describedby]]**), Select option position (**[[select-option-numbering]]**), the menu click a screen reader sends (**[[dropdown-assistive-click]]**) and the text-only scroller stop (**[[scroll-area-keyboard-stop]]**).
- **Focus not obscured (2.4.11).** The system ships **no sticky and no fixed page chrome**: `AppShell`'s header is an in-flow `Layout.Header`, and `position: sticky` appears nowhere in `src/`. The only non-modal fixed layer is the `Toast` viewport, which is corner-anchored and not full-width; modal surfaces take focus with them and pass by construction. **The obligation this hands you:** `AppShell` publishes `--ds-appshell-header-height` precisely so you *can* make the header sticky. If you do, pair it with `scroll-padding-top` on your scroll container (W3C technique C43), or a keyboard user tabbing down the page will land under your own header.
- **Content on hover or focus (1.4.13).** Tooltip, HoverCard, menu submenus and the `TopNav` flyouts are all dismissible with Escape, hoverable (the pointer can travel onto the panel without it closing) and persistent. The first three inherit it from Radix; `TopNav` hand-wires the same three properties. **One known gap:** `Overlay`'s hover scrim is a CSS-only reveal with no Escape path, ruled in **[[overlay-dismissible-gap]]**.
- **Pointer criteria (2.5.7, 2.5.1, 2.5.4).** The distinction that decides these, because it is the one people get wrong: **a keyboard equivalent satisfies 2.1.1 and never 2.5.7.** 2.5.7 asks for a *single-pointer* alternative to a drag. `Slider` passes because clicking the track sets the value, `ScrollArea` and `Carousel` because the scrolling is the user agent's, `Toast` because a Dismiss button sits beside the swipe. **Two known gaps**, both ruled in **[[dragging-movement-gaps]]**: `ResizeHandle` and `Lightbox` pan. Nothing in the system reads device motion, so 2.5.4 is an application concern.
- **Timing (2.2.1).** `Toast` disables Radix's own timer and runs its own, which pauses on hover, on focus and on window blur, clamps a resume to at least 1000ms, defaults the error tone to never auto-hiding, and accepts `autoHide: false` to turn it off entirely. `Carousel` has no autoplay by design, so 2.2.2 never bites.
- **The form error contract (3.3.1, 3.3.2, 3.3.3).** Ruled in **[[form-error-contract]]**. A `validation` message is programmatically associated (`aria-describedby` plus `aria-invalid`), `role="alert"` is reserved for the error tone, and the glyph beside it is `aria-hidden` so the *words* carry the meaning. `NumberInput`, `DateInput` and `TimeInput` generate corrective copy naming what would be accepted, which is 3.3.3 proper rather than mere identification; where you author the message yourself the obligation transfers to you.
- **Text spacing (1.4.12).** Ruled in **[[text-spacing-control-box]]**. A control box is a FLOOR, not a fixed height: a label
  that wraps under a reader's spacing overrides grows its box rather than escaping the fill. A guard
  holds it (`_internal/Control box` → *ControlBoxUnderTextSpacing*). Buttons are measured; the remaining single-line controls clear the test by arithmetic, not by assertion.
- **A toast raised under a modal stays readable (4.1.2).** A modal layer hides everything outside itself with `aria-hidden`. The `Toast` rail carries `aria-live="off"`, which that hiding skips, so a screen-reader user can reach a toast's action while a modal is open (DECISIONS **[[toast-under-modal]]**, Radix #4115). **One known gap:** a toast raised before the modal opened paints above the scrim but cannot be clicked, because Radix blocks pointer input on layers older than the modal.
- **A dialog's description reference always resolves (4.1.2).** Radix points `aria-describedby` at a description id even when no Description renders. `Dialog` and `AlertDialog` keep the attribute only while a `Description` is mounted, so a Title-only dialog carries no broken reference (DECISIONS **[[dialog-describedby]]**, Radix #3007). axe reports this case as needs-review rather than a violation, so a guard play holds it.
- **Option position (1.3.1).** Radix sets no `aria-posinset` or `aria-setsize` on Select options, so `Select.Content` numbers the open listbox itself in DOM order, and an option that carries its own numbering keeps it (DECISIONS **[[select-option-numbering]]**). Held by the `Menu states` play.
- **Menus open on the click a screen reader sends (2.1.1, 4.1.2).** VoiceOver's modifier key (VO) plus Space in Safari and Firefox and NonVisual Desktop Access (NVDA)'s browse-mode Enter reach a menu button as a click with no pointerdown, which Radix's menu trigger ignores. `DropdownMenu` and `MoreMenu` open on that click exactly once, and a pointer press still opens them once (DECISIONS **[[dropdown-assistive-click]]**). Held by `_internal/DropdownMenu behavior` and `_internal/MoreMenu behavior` → *AssistiveClick*.
- **A scroller that holds only text is a named keyboard stop (2.1.1, 4.1.2).** `ScrollArea` gives an overflowing viewport with nothing focusable inside `tabIndex={0}`, gives a viewport named by `aria-label` or `aria-labelledby` `role="region"`, and warns in development when the stop has no name. The name is still yours to give (DECISIONS **[[scroll-area-keyboard-stop]]**). Held by `_internal/ScrollArea behavior` → *TextOnlyStop*.
- **Forced colours (Windows contrast themes).** Ruled in **[[forced-colours]]**. Under `forced-colors: active` every boxed control, field and toggle keeps a 1px edge in the reader's `ButtonBorder`, checked, on and selected states paint `Highlight` with a `HighlightText` mark, disabled edges paint `GrayText`, and the focus ring stays an outline. A guard holds it (`_internal/Forced colors` → *EdgesAndStates*), which turns forced colours on in the light and dark system palettes and measures every edge at 3:1 or more against Canvas. Tertiary and ghost controls stay edgeless at rest, as they are outside forced colours. **Not covered:** Tokenizer, SegmentedControl, Slider, CheckboxCards, RadioCards, Card and a pressed ToggleButton or ToggleButtonGroup item still draw their edge with box-shadow, so under forced colours they lose it.
- **Not ours, stated so you stop looking:** 3.3.4 error prevention, 3.3.7 redundant entry, 3.3.8 accessible authentication, 2.4.5 multiple ways, 3.2.3 consistent navigation and 3.2.6 consistent help are all process-, page- or site-level and cannot be satisfied by a component library. The one thing worth asserting about 3.3.8 is negative and useful: nothing here blocks paste or intercepts autofill, so a password manager works.

### What this claim covers, and what it does not

The claim above is a promise to whoever installs this, so its edges are stated rather than left to be
assumed. Ruled in DECISIONS **[[wcag-claim-scope]]**.

**Verified continuously.** axe runs on every story in two appearance lanes, light and dark, with the
registered opt-outs listed on Foundations → Enforcement. The contrast floors in this section are
asserted from the rendered element rather than from a table, and colours are rasterized before
comparison because a wide-gamut display reports `color(display-p3 …)`. Forced colours are emulated in both system palettes, and every control edge and state is measured against Canvas (**[[forced-colours]]**).

**Four things are NOT verified, and each one is a real gap.**

1. **No assistive technology has been driven over this system.** Every role, name and announcement
   rests on the underlying primitive plus axe, and axe cannot hear anything. Treat the screen-reader
   behaviour as unproven, not as broken.
2. **No suite sweeps the accent axis.** A story renders at one point in the globals space, so the
   suite sweeps appearance and leaves the accent at its default. That is a deliberate cost. The Colors play sweeps the text floors across all 27 accents at the token layer, but no rendered component is swept.
3. **Text on a SOFT semantic fill sits just under the strict 4.5 at light appearance.** Measured:
   error 4.43, info 4.15, warning 4.14, success 4.10. In dark appearance all four clear comfortably
   (7.7 to 10.4). On the page background rather than the tint all four clear in light too, so the cost
   is the weak fill itself, roughly 0.4 ratio points. No large-text provision covers it: a `Badge` is 12px at weight 500 and `Callout` body text is 14px at weight 400, and neither is large text.
   It is a measured exception rather than a conformance
   claim, and it is ruled that way in DECISIONS **[[soft-fill-text-exception]]**. The strict axe rule is scoped off on those
   specimens, carrying these numbers as the reason.
4. **Nothing has ever been rendered at 320px.** The 1.4.10 reflow argument reads as sound from the
   CSS: the desktop rail is hidden below the `md` breakpoint rather than squeezed, the mobile drawer
   is capped at `min(100vw, …)`, and every fixed pixel floor in the token layer is wrapped in `min()`
   against the viewport. But the story suite configures no viewport and has never rendered a
   narrow one, so this is a reading rather than an observation. Same shape as item 2.

## 10. Customizing the system
The system is one small set of variables with everything else derived from them. That is what makes it customizable, and it is also what bounds the customization: turn a knob the system reads and every rule re-derives around it; hard-set a value the system *computes* and you have swapped a derivation for a constant, which is where things start disagreeing with each other.

**What you set — `Provider` props.** One place, at the root of your app. `Provider` consumes the first block and forwards every other `Theme` prop through.

| Prop | Default | What it moves |
| --- | --- | --- |
| `appearance` | `light` | Light or dark. Every token carries both; nothing is authored per mode at the call site. |
| `accentColor` | `iris` | The brand scale — Radix's 26, plus the system's `oxblood` preset. Colliding semantic families shift away from it automatically (§2). |
| `grayColor` | `auto` | The neutral. `auto` pairs it to the accent. |
| `radius` | `medium` | The corner ladder every surface and control derives from. |
| `uiSize` | `small` | The density tier — `small` / `medium` / `large`. Picks the size **step** each of the six lanes renders at: control and text share a step (1 / 2 / 3), a heading inside chrome sits one above them (2 / 3 / 4), a page heading rides higher (5 / 6 / 7), a display figure higher still (7 / 8 / 9), and surfaces sit one above the control lane (2 / 3 / 4). It does not touch `scaling`. |
| `contrast` | `wcag` | `wcag` or `apca`, written to `data-contrast` on the theme root. It changes one thing only: the label on a solid warning fill on the gold, amber, yellow and lime brands in the light appearance, where one ink cannot clear both WCAG 4.5:1 and APCA Lc 60 in the warning's own orange ([[apca-contrast-mode]]). |
| `typefaces` | unset | Heading, body and code faces. A roster name uses a face the package ships, and `{ stack }` takes any CSS font stack and loads nothing for it. Unset writes nothing, so the defaults hold: Inter, and Menlo for code. An unset heading follows the body face. |
| `buttonOrder` | `primary-first` | Which end of a cluster the solid action anchors, and the alignment derived from that anchor. |
| `scaling` | `100%` | `90%` – `110%`. Multiplies the space, font-size and line-height scales at once, so the whole system — control boxes included — grows or shrinks together. |

**What you set — the token layer.** Two sanctioned seams, both "declare it after the system sheet, at matching-or-higher specificity, scoped to `.radix-themes` or tighter":
- **A semantic family** — `--error-*` / `--warning-*` / `--success-*` / `--info-*`. Overriding one family moves only that family; the rest keep the automatic collision shift (§2).
- **A `--ds-*` semantic token** — the vocabulary every component paints from. Redeclare the role and every component using it follows, because they read the role rather than a scale.

**The promise.** The system's laws — one box per size step *within a family*, control and text sharing a step, semantics staying distinct from the brand — hold under every knob above **by construction**, not because each component remembers to honour them. There is one source for each: the control box *is* the vendor's space ladder, which is what `scaling` multiplies; the lane step comes from one shared table, which is what `uiSize` indexes; the semantic families key off the accent attribute Radix already sets. Nothing re-implements a ladder locally, so nothing can fall off one.

**Three ladders, not one — and a component belongs to exactly one.** A step still names one box; which box depends on the family, because a control standing in a row, a member inside a segmented tray and a navigation row are not the same object.

| Family | Steps 1 / 2 / 3 | Who is on it | Where it is measured |
| --- | --- | --- | --- |
| **Row** — the default | 24 / 32 / 40 | Every single-row control: buttons, fields, selects, pagination cells, the typed-entry anchors | `_internal/Control box`, at all three tiers **and** under `scaling: 90%` |
| **Group member** ([[toggle-group-box]]) | 24 / 24 / 32 | A `ToggleButtonGroup` member — the tray resolves a step and seeds its members one step down, floored where the two coincide | `_internal/Control box`, through the group's own manifest rows |
| **Nav** ([[nav-row-ladder]]) | 32 / 36 / 40 | A `SideNav` row, collapsed rail and expanded alike — navigation carries more prominence than a standard control, so a nav row is an `Item`-family row (its line box + `2 × --ds-space-8`) rather than a control-lane button | `_internal/SideNav behavior` → *NavLadderTracksBothStates* (both regimes, all three tiers) and *NavLadderUnderScaling* (the same fixture under `scaling: 90%`) |

All three ladders ride `scaling` — each rung is a scaled term, so `90%` moves the whole family together — and all three carry the same pointer floor (below). The `controlBox` field in this repository's root `registry.json` is where a component declares which family it is in (`"row"` / `"nav"` / `"composite"` / `"exempt"`), and the node lane fails if a ported component declares nothing, if a `"row"` entry is missing from the control-box manifest, or if a `"nav"` entry is not covered by the nav-ladder guard. The package roster, `dsiab/registry.json`, leaves the field out, because only this repository's guards read it. Registration is a field, not a habit. `_internal/Size` separately checks the *lane* step — which size step each wrapper resolves from `uiSize` — at all three tiers.

**What is off contract.** No promise attaches to any of this, the guards do not cover it, and a version bump can move it under you:
- **Vendor internals** — `--base-button-height`, `--text-field-height`, `--select-trigger-height`, `--space-*`, `--font-size-*`. These are the terms the laws are *written in*. Redeclare one and the ladder stops agreeing with itself: you get a text field that no longer lines up with the button beside it, at one step only, in one place. Reach for `scaling` instead — it moves all of them at once, which is the whole difference.
- **Component-scoped variables and private ladders** — anything declared inside a component's own rule rather than in the token files. It is implementation, it is not named in this document, and it changes without notice.
- **Restyling by selector** — `.rt-Button { height: … }` and friends. The guards measure the components; they cannot see your override, so nothing you break this way will be caught before your users see it.

**The one documented collision — the 24px target floor does not scale, and the floor wins.** The ≥ 24×24 pointer target (§9) is a real-world size, so it is a literal `24px` and it deliberately does **not** move with `scaling`. Below `100%` a ladder and the floor can disagree, and the box law resolves it the same way in every family: a box is declared as `max(step × scaling, 24px)`, and the floor wins where it binds.

Which families it actually binds, at `scaling: 90%`:
- **Row** — a step-1 control holds 24px instead of dropping to the scaled 21.6, every control in the row together, ghost and solid alike. Steps 2 and 3 scale cleanly (28.8 / 36); they never cross the floor.
- **Group member** — the same collision one tier further in, since a member's box *is* a row rung (24 / 24 / 32).
- **Nav** — never binds. The lowest nav rung is 32, which scales to 28.8, so the whole ladder stays above 24 and the three rungs scale cleanly to **28.8 / 32.4 / 36**.

The consequence to know: below `100%`, the small tier's *controls* stop shrinking at 24px while text, spacing and the nav rows keep scaling — that compression is the floor doing its job, not a bug. Both guards measure exactly this contract at `90%`: `_internal/Control box` (the scaling story) for the row and member ladders, `_internal/SideNav behavior` → *NavLadderUnderScaling* for the nav ladder.

### The composition seam: `asChild`, and what it costs ([[aschild-or-type-error]], [[aschild-handover-warning]])

The knobs above change what a component *looks* like. `asChild` changes what element it *is*: the component renders your element instead of its own, keeping its behaviour, its classes and its layout. Use it when the semantics are wrong for your document and nothing else can fix that. A card that must be an `li`, an empty region that must be the `td` of an empty table, a toolbar that must be a `nav`. It exists so that needing one different tag is not a reason to take your own copy of the component.

**It is not offered everywhere, and the reason is structural rather than editorial.** A component can hand over its element only when it has exactly one root element to hand over and handing it over preserves the contract. A component that renders a portal, or several elements at its root, or that spends its `children` on a label it owns, has nothing to give you. Those refuse **in the type**, so you find out at compile time. No component crashes for being asked.

**What you take on when you use it.** The child's props win. `className` is concatenated and `style` and event handlers are merged, so the paint, the spacing and the seam hairlines survive, but every other prop you set on your element **replaces** the component's, including `role`, `tabIndex` and `aria-*`. Swap a control for a `div` and you have a control that Tab cannot reach and a screen reader cannot name. Set your own `role` on a toolbar and the toolbar role is gone. Nothing about the rendered page shows any of this, which is why the system warns in development rather than trusting it to be noticed, and why `npx ds-check` fails on the clearest cases in your own source. The accessibility claim in §9 covers the components as they ship. Past this seam it is yours.

**One thing the checks cannot see.** If your child is a component rather than an element, neither the development warning nor `ds-check` can tell what it renders, and both stay silent rather than guess. `<Button asChild><MyLink /></Button>` where `MyLink` renders a `div` is unguarded. Keep the element itself at the seam wherever you can.

**The copy is the last resort, and it is manual.** When neither the props nor `asChild` can express what you need, surface the gap first. If you still need your own version, copy `src/components/ui/<Name>.tsx` from the GitHub release tag that matches your installed version, and own it from then on. The copy receives no fixes from later releases, and the guarantees in this document stop at its edge.
