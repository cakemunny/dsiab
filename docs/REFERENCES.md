# References

Every outside source consulted while building this system, what was adopted or rejected from each,
and which component or ruling it informed.

## Read this before you research, not after

**This file is an input, not an archive.** Before studying prior art for a new component or a large
change, look here first. If the question has been answered already, the answer is recorded with a
verdict, and repeating the research wastes the time and risks reaching a different conclusion from
the same sources, which is how two parts of one system end up disagreeing.

Three ways to use it:

- **Starting a component.** Scan the sections for the interaction you are building. Reorder, focus,
  contrast and overlay questions have been researched once already.
- **Questioning a decision.** Follow the source and check whether the conclusion recorded here
  still holds. A source that has since changed its own guidance is worth knowing about.
- **Finding the argument.** The row says what was adopted or rejected. The reasoning lives in the
  ruling named beside it in `DECISIONS.md`.

If the research genuinely has not been done, do it, and add what you find here in the same change.
A source consulted and not recorded is research the next person pays for twice.

## Why the sources are not in the documentation

The documentation does not cite. A page describing a component explains that component, in terms of
what it does, and never sends a reader elsewhere to understand it. Deferring is the failure mode
that rule exists to prevent: a baseline meant to be read, configured and owned by whoever installs
it cannot depend on a reader following a link to a system they do not use.

Research still has to happen, and it has to be checkable. A pattern that every mature system has
already converged on is prior art, and re-deriving one privately produces something subtly wrong in
ways internal review cannot catch, because everyone reviewing shares the same blind spot. So the
sources live here, separately, as a lookup. The rule requiring the research is recorded as **[[prior-art-required]]**
and enforced by a repository guard through the `priorArt` field on each
registry entry, with a second guard holding this file and that field in
step with each other.

**A reference is not an authority.** Several entries below were read and then deliberately
rejected, and the rejection is as much a part of the record as the adoption. Where a decision
diverges from what a source recommends, the divergence is argued in `DECISIONS.md` on its own terms.

## How to add one

Record the source when the work happens rather than afterwards. An entry needs the source, a URL,
what it informed, and one line on what was adopted or rejected. Add the same URL to the `priorArt`
field of the registry entry it informed, or name the ruling it informed in the row when the source
shaped the token layer or a policy rather than any one component.

---

## Drag and drop, reorder ([[reorder-capability]], [[reorder-single-pointer-path]])

| Source | What it informed |
|---|---|
| [Atlassian, Pragmatic drag and drop, design guidelines](https://atlassian.design/components/pragmatic-drag-and-drop/design-guidelines) | ADOPTED: a draggable entity is dragged whole, and a handle belongs to an entity that contains other interactive parts. ADOPTED: the 24x24 floor when a handle is the only draggable region. ADOPTED: a card on a board is implied draggable and carries no grip icon. |
| [Atlassian, closest-edge element adapter](https://atlassian.design/components/pragmatic-drag-and-drop/core-package/adapters/element/about) | ADOPTED: an edge-based hit test rather than a bare midpoint split, so the pending position does not flicker under a moving hand. |
| [Atlassian, react-drop-indicator](https://atlassian.design/components/pragmatic-drag-and-drop/optional-packages/react-drop-indicator/) | ADOPTED: an insertion mark belongs in the gap and reads as a caret with a terminus, never as a border on the item it sits beside. |
| [react-beautiful-dnd, screen reader guide](https://github.com/atlassian/react-beautiful-dnd/blob/master/docs/guides/screen-reader.md) | ADOPTED: the Space to lift, arrows to move, Space to drop, Escape to cancel key map. ADOPTED: announcements state a POSITION rather than an index. |
| [react-beautiful-dnd, preset styles](https://github.com/atlassian/react-beautiful-dnd/blob/master/docs/guides/preset-styles.md) | ADOPTED: the 5px movement threshold before a press becomes a drag, and suppression of the click a drag leaves behind. |
| [dnd-kit, accessibility guide](https://dndkit.com/legacy/guides/accessibility) | ADOPTED: the headless prop-getter shape, and one live region owned by the capability rather than by each consumer. |
| [dnd-kit, KeyboardSensor](https://github.com/clauderic/dnd-kit/blob/master/packages/core/src/sensors/keyboard/KeyboardSensor.ts) | ADOPTED: once an activator node is registered, a keypress elsewhere on the item does not lift it. |
| [dnd-kit, DragOverlay](https://github.com/clauderic/dnd-kit/blob/master/packages/core/src/components/DragOverlay/DragOverlay.tsx) | READ and NOT adopted: a following overlay layer. The minimal pattern keeps the held item in its slot as a ghost instead. |
| [React Aria, drag and drop](https://react-aria.adobe.com/dnd) | ADOPTED: an explicit drag affordance resolves conflicting interactions such as selection. REJECTED: its Enter to lift and Tab between drop targets model, because Tab as a drop key collides with the tab order a board already depends on. |
| [IBM Carbon, table row reordering](https://github.com/carbon-design-system/tanstack-carbon/issues/85) | READ as context only. It is an open design proposal rather than a released component, so it is recorded and not treated as precedent. |
| [Pencil and Paper, drag and drop UX](https://www.pencilandpaper.io/articles/ux-pattern-drag-and-drop) | ADOPTED: the minimal reorder pattern, a ghost that holds its slot plus a separate mark for the landing position. REJECTED: the maximal pattern, on its own stated disadvantage that aborting becomes unclear, which would undercut the Escape-to-cancel contract. |
| [WCAG 2.2, Understanding SC 2.5.7 Dragging Movements](https://www.w3.org/WAI/WCAG22/Understanding/dragging-movements.html) | The normative reason the single-pointer route exists, and the source of the rule that a keyboard equivalent does NOT discharge 2.5.7. |
| [ARIA in HTML](https://www.w3.org/TR/html-aria/) | `aria-grabbed` and `aria-dropeffect` are deprecated with no replacement, which is why drag state is carried by the accessible name and live announcements. |

## Colour and contrast ([[oxblood-preset]], [[brand-status-collision-gate]])

Not every source informs a component. These two informed the token layer, so they are attached to
the rulings they shaped rather than to a registry entry.

| Source | What it informed |
|---|---|
| [APCA](https://github.com/Myndex/apca-w3) | ADOPTED: the perceptual contrast model behind the on-solid ink decisions and the white-flip set ([[oxblood-preset]], [[brand-status-collision-gate]]). |
| [Radix colour generator](https://github.com/radix-ui/website/blob/main/components/generate-radix-colors.tsx) | ADOPTED: the scale-generation approach a custom brand seed is fitted to ([[brand-status-collision-gate]]). |
| [Björn Ottosson, A perceptual color space for image processing](https://bottosson.github.io/posts/oklab/) | [[brand-status-collision-gate]]. ADOPTED: Oklab as the space of the collision gate, its hue angle for the hue test and the straight-line distance in it as the perceptual difference (ΔE-OK). ADOPTED: the linear sRGB to Oklab matrices the post publishes, stated in the system's own palette code rather than imported. |

## Governance and process ([[governance-model]])

| Source | What it informed |
|---|---|
| [Brad Frost, A Design System Governance Process](https://bradfrost.com/blog/post/a-design-system-governance-process/) | ADOPTED: the principle that governance exists to stop entropy, that a model must fit the organisation rather than be copied, and that user frustration is the signal to revisit it. ADOPTED, translated, in three places. The snowflake-versus-system decision here is the surface-the-gap rule plus a manual copy of `src/components/ui/<Name>.tsx` from the release tag on GitHub, which the consumer owns from then on, rather than a conversation between two teams. The pre-release trial in a real application here is `npm run test:publish`. The internal review battery here is the guard lanes, because a review depending on somebody remembering to look is what an unattended agent skips. REJECTED as inapplicable: every step whose mechanism is a conversation between a design system team and a product team, because this project has no second team and the consumer is unknown and absent, so each such step has to become an artefact or it does not happen. It also named three real gaps: no release cadence, no support or intake channel, and no cross-browser testing ([[governance-model]]). |

## The composition seam, asChild ([[measured-surface-census]], [[aschild-or-type-error]], [[aschild-handover-warning]])

| Source | What it informed |
|---|---|
| [Radix, Slot](https://github.com/radix-ui/primitives/blob/main/packages/react/slot/src/slot.tsx) | The normative mechanism, read rather than assumed. `mergeProps` concatenates `className`, shallow-merges `style`, chains event handlers, and returns `{ ...slotProps, ...overrideProps }` with `overrideProps` from the CHILD. ADOPTED as the whole basis of the seam: it is why a component's paint and seam hairlines survive the swap, and equally why a consumer's `role` silently beats the system's ([[aschild-handover-warning]]). A refusal reason that contradicts this file is a reason that was never checked. |
| [Radix, Composition guide](https://www.radix-ui.com/primitives/docs/guides/composition) | ADOPTED: `asChild` as the single composition verb, and `Slottable` as the answer for a component whose own content must land inside the consumer's element ([[aschild-or-type-error]]). |
| [Radix, Slot usage with nested children (issue 1825)](https://github.com/radix-ui/primitives/issues/1825) | READ, and it is the crash class [[aschild-or-type-error]] fixed, reported by other people since 2022. A component that renders several children into `Slot` throws `React.Children.only expected to receive a single React element child`, and `Slottable` is the remedy. ADOPTED with its stated limit: `Slottable` resolves ONE level deep, so a component that wraps its slot target in its own element cannot use it as-is, which a maintainer confirms would need recursive parsing of children. Every component repaired here keeps the slot target at the top level for that reason. |
| [Material UI, the component and slots API](https://mui.com/material-ui/integrations/routing/#component-prop) | READ and NOT adopted: a `component` prop taking an element TYPE. It cannot carry the consumer's own props or ref through, so the merge question this system has to answer never arises there, and the a11y hazard [[aschild-handover-warning]] records is invisible in that shape. |
| [Ariakit, Composition](https://ariakit.com/guide/composition) | READ and NOT adopted as a second verb: passing a rendered ELEMENT through a `render` prop, which avoids the `Children.only` crash class entirely because the target arrives as a prop rather than as children. REJECTED for this system on consistency, since 28 names already forward `asChild` through Radix and a second composition verb beside it would be the drift the system exists to prevent. **The important finding is the opposite of a difference:** its merge rule is the same as Radix's, `style`, `className`, `ref` and event props merge automatically and every other prop defined on the rendered element OVERRIDES the component's. So the hazard [[aschild-handover-warning]] records is not a Radix quirk to be designed around, it is what handing over an element means in every such API, which is why the answer is a warning rather than a different mechanism. |
| [WAI-ARIA Authoring Practices, Toolbar](https://www.w3.org/WAI/ARIA/apg/patterns/toolbar/) | The contract `Toolbar.Root` must keep across the seam, and the reason its detector names `role="toolbar"` specifically ([[aschild-or-type-error]], [[aschild-handover-warning]]). |
| [WCAG 2.2, Understanding SC 4.1.2 Name, Role, Value](https://www.w3.org/WAI/WCAG22/Understanding/name-role-value.html) | The normative reason a silently dropped `role` is a conformance failure rather than a style question, which is what makes [[aschild-handover-warning]] a warning rather than a note in a document. |

## Public behaviour hooks ([[internal-hooks]])

Whether this system publishes the focus and overflow hooks its components run on. The sources split
into two camps, and the split is the finding: libraries whose product is the behaviour publish these
primitives, and styled systems built on primitives keep them inside. None of these sources informs a
component, so each row names the ruling it informed.

| Source | What it informed |
|---|---|
| [React Aria, useGridList](https://react-aria.adobe.com/GridList/useGridList) | READ and NOT adopted as a surface ([[internal-hooks]]). A collection-aware grid hook, with keys, selection and list state, published by a library whose product is behaviour. It is where a consumer building a grid of their own is better served than by `useGridFocus`, a DOM-query helper shaped by one calendar. |
| [React Aria, FocusScope and useFocusManager](https://react-aria.adobe.com/FocusScope) | READ and NOT adopted as a surface ([[internal-hooks]]). Low-level next and previous focus moves, which its own docs use to build an arrow-key toolbar. The same need `useListFocus` meets inside this system, answered by a library that documents and tests it as a product. |
| [Floating UI, useListNavigation](https://floating-ui.com/docs/useListNavigation) | READ and NOT adopted as a surface ([[internal-hooks]]). List navigation tied to a floating element, with options for grid columns, looping, right-to-left and disabled indices. Its `rtl` option is the one `useListFocus` lacks, which is part of why ours stays unpublished. |
| [Floating UI, Composite](https://floating-ui.com/docs/Composite) | READ and NOT adopted as a surface ([[internal-hooks]]). The same navigation for lists and grids outside a floating element. It is the mature public form of what `useGridFocus` and `useListFocus` do privately here. |
| [Ariakit, Composite](https://ariakit.com/components/composite) | READ and NOT adopted as a surface ([[internal-hooks]]). A composite store with rows, items and typeahead, published by a behaviour library. A consumer building a composite widget is pointed at libraries of this kind rather than at an internal of ours. |
| [Radix, react-roving-focus readme](https://github.com/radix-ui/primitives/blob/main/packages/react/roving-focus/README.md) | ADOPTED as precedent ([[internal-hooks]]). Radix keeps `RovingFocusGroup` inside: the package readme calls it "an internal utility, not intended for public usage", and the `radix-ui` umbrella package does not re-export it. A styled layer on Radix draws the same line. |
| [Zag, utilities](https://github.com/chakra-ui/zag/tree/main/website/data/utilities) | ADOPTED as precedent ([[internal-hooks]]). Zag documents three utilities, async-list, focus-trap and hotkeys, and no roving-focus utility. |
| [Ark UI, utilities](https://github.com/chakra-ui/ark/tree/main/website/src/content/pages/utilities) | ADOPTED as precedent ([[internal-hooks]]). Ark's documented utilities include a focus trap and no roving-focus utility, so a styled system on a primitive layer keeps this behaviour inside its components. |
| [Astryx, hooks index](https://raw.githubusercontent.com/facebook/astryx/main/packages/core/src/hooks/index.ts) | REJECTED as precedent ([[internal-hooks]]). The upstream several of these hooks were lifted from publishes its hooks from one index, `useGridFocus`, `useListFocus`, `useTreeFocus`, `useOverflow` and `useScrollOverflow` among them. That is the export-everything position, and this system ships a name only when a consumer need is shown. |
| [Astryx, useListFocus](https://raw.githubusercontent.com/facebook/astryx/main/packages/core/src/hooks/useListFocus.ts) | READ, and it is a reason `useListFocus` stays unpublished ([[internal-hooks]]). A different contract under the same name: a vertical default, a `[role="menuitem"]` default selector, boundary scoping for nested lists, Escape handling, optional roving tabindex, a caret guard and automatic right-to-left detection. A reader who knows one would misuse the other. |

## Assistive-technology gaps in Radix primitives ([[toast-under-modal]], [[dialog-describedby]], [[select-option-numbering]], [[dropdown-assistive-click]], [[scroll-area-keyboard-stop]])

| Source | What it informed |
|---|---|
| [Radix, Select announces the wrong count in VoiceOver with Chrome (issue 3962)](https://github.com/radix-ui/primitives/issues/3962) | ADOPTED: the finding that Select options carry no `aria-posinset` or `aria-setsize`, and that VoiceOver with Chrome then announces a wrong total or none. Select numbers its own options ([[select-option-numbering]]). |
| [Radix, the first Select option announces nothing (issue 4110)](https://github.com/radix-ui/primitives/issues/4110) | ADOPTED: writing the attributes to the DOM before paint rather than through a state round-trip, the timing the thread names as the cause of the silent first option ([[select-option-numbering]]). |
| [Radix, announce option position and total (PR 4109)](https://github.com/radix-ui/primitives/pull/4109) | READ and NOT adopted in one respect. Its count restarts inside each group, while [[select-option-numbering]] numbers the whole listbox in DOM order. Still open upstream, so the system's numbering can retire once Radix ships its own. |
| [Radix, VoiceOver cannot open a dropdown menu in Firefox and Safari (issue 1963)](https://github.com/radix-ui/primitives/issues/1963) | ADOPTED: the finding that the VoiceOver modifier key (VO)+Space reaches the trigger as a click, which Radix's menu trigger ignores. REJECTED: the posted workaround that synthesises a pointerdown from every click, because a pointer press would then toggle twice ([[dropdown-assistive-click]]). |
| [Radix, NonVisual Desktop Access (NVDA) prevents toggling a dropdown menu (issue 2700)](https://github.com/radix-ui/primitives/issues/2700) | ADOPTED: answering the click itself, the fix the issue suggests and the shape of Radix's own Dialog trigger ([[dropdown-assistive-click]]). |
| [Chrome, keyboard-focusable scrollers](https://developer.chrome.com/blog/keyboard-focusable-scrollers) | ADOPTED: the finding that Chromium 130 and later make a scroller with no focusable children a tab stop on their own, and that other engines give it none. It is why ScrollArea adds the stop itself rather than relying on the browser ([[scroll-area-keyboard-stop]]). |
| [axe, scrollable-region-focusable](https://dequeuniversity.com/rules/axe/4.12/scrollable-region-focusable) | ADOPTED: its pass condition, focusable or holding focusable content, as the test for when ScrollArea adds a stop ([[scroll-area-keyboard-stop]]). |
| [Radix, Toast viewport enters Dialog's aria-hidden subtree (issue 4115)](https://github.com/radix-ui/primitives/issues/4115) | READ, and it is the defect [[toast-under-modal]] fixes for screen readers. Reproduced here on react-toast 1.2.17 with one difference: in this system the toast is not pointer-interactive under the modal either, because the Provider's root Theme caps its z-index. That half landed through a body portal ([[toast-under-modal]]). A toast raised before the modal opened still takes no pointer input. |
| [Radix, keep viewport out of modal layers' aria-hidden subtree (PR 4127)](https://github.com/radix-ui/primitives/pull/4127) | ADOPTED: `aria-live="off"` on the viewport so `hideOthers` skips it ([[toast-under-modal]]). The PR sets it on the region wrapper. Ours sits on the `ol`, the element the viewport's props reach, and aria-hidden keeps its ancestors too. Drop ours once a react-toast release ships the PR. |
| [Radix, Dialog content points to a non-existent aria-describedby id (issue 3007)](https://github.com/radix-ui/primitives/issues/3007) | ADOPTED the fix the issue asks for, applied in the wrapper: the attribute is present only while a Description is mounted ([[dialog-describedby]]). REJECTED asking each consumer to pass `aria-describedby={undefined}`, which the issue itself calls easy to miss. |

## Windows forced colours ([[forced-colours]])

| Source | What it informed |
|---|---|
| [MDN Web Docs (MDN), forced-colors](https://developer.mozilla.org/en-US/docs/Web/CSS/@media/forced-colors) | [[forced-colours]]. ADOPTED: use a border instead of box-shadow, which is forced to none, and a system colour is used as written instead of being forced. REJECTED: a separate forced-colours design, so text and surface roles are left to the browser and only edges and state marks are restored. |
| [CSS Color Adjust 1, section 3 Forced Color Palettes](https://www.w3.org/TR/css-color-adjust-1/#forced) | [[forced-colours]]. The normative mechanism, read rather than assumed: a non-system colour is forced to a system colour, box-shadow computes to none, background-image computes to none without a url(), and a forced background keeps its alpha. ADOPTED as the reason every edge and mark in forced-colors.css is a real border or a system-colour fill. |

## Text on a solid fill ([[text-on-solid-fill-contrast]])

| Source | What it informed |
|---|---|
| [Radix Colors, Understanding the scale](https://www.radix-ui.com/colors/docs/palette-composition/understanding-the-scale) | [[text-on-solid-fill-contrast]]. ADOPTED: step 9 is the solid background and step 10 its hover, and steps 11 and 12 are the text steps, which is why a deepened text fill takes step 11. REJECTED: step 12 as that fill's hover, because it turned near-black, so hover stacks a Radix alpha instead ([[interaction-state-alphas]]). READ: most step 9 colours are designed for white text, and sky, mint, lime, yellow and amber for dark text, which matches the five accents whose dark ink passes unchanged. |
| [WCAG 2.2, Understanding SC 1.4.3 Contrast (Minimum)](https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum.html) | [[text-on-solid-fill-contrast]]. The normative 4.5:1 floor, and the large-text definition that a 12px weight-500 button label does not meet, which is why the earlier 3:1 floor for text on a solid fill never applied. |
| [APCA](https://github.com/Myndex/apca-w3) | [[text-on-solid-fill-contrast]]. ADOPTED: Lc 60 (`APCA_LC.largeUi`) as the second floor for a label on a solid fill, and the finding that the dark ink on orange-9 reads Lc 45.8 although WCAG passes it at 5.49. |
| [Radix Themes, base-button.css](https://raw.githubusercontent.com/radix-ui/themes/main/packages/radix-ui-themes/src/components/_internal/base-button.css) | [[text-on-solid-fill-contrast]]. READ: the solid variant paints `--accent-9` under `--accent-contrast`, hover, open and press take `--accent-10`, and press adds `--base-button-solid-active-filter`. ADOPTED: press and open share the hover treatment, as Radix does. REJECTED: switching to `--accent-10` on hover, replaced by a Radix alpha stacked over the rest fill ([[interaction-state-alphas]]). The system rule leaves high contrast, disabled, and a button given `color` on Radix's paint. |

## Parts without text ([[textless-part-fills]])

| Source | What it informed |
|---|---|
| [WCAG 2.2, Understanding SC 1.4.11 Non-text Contrast](https://www.w3.org/WAI/WCAG22/Understanding/non-text-contrast.html) | [[textless-part-fills]]. The 3:1 floor for a part without text and the state it shows, against the colour beside it. That is why a checkbox fill is read against the page, a switch thumb against its track, and a check against its fill. |
| [Radix Themes, switch.css](https://raw.githubusercontent.com/radix-ui/themes/main/packages/radix-ui-themes/src/components/switch.css) | [[textless-part-fills]]. ADOPTED: the white thumb and its 1px `--accent-a4` ring under `--black-a1`, restated with only the ring colour moved, so the fix is Radix's own stroke made stronger. READ: the dark light-scale tracks are a `color-mix` of steps 8 and 9, and no dark alpha step separates a white thumb from them. |
| [Radix Colors, Understanding the scale](https://www.radix-ui.com/colors/docs/palette-composition/understanding-the-scale) | [[textless-part-fills]]. ADOPTED: steps 6 to 8 are the border steps, which is where the dark thumb stroke lands (step 7, and step 6 on orange). READ: an alpha step composites to its solid step over the page of its own appearance, so a dark alpha laid over a light track stays light. |
| [Radix Themes, code.css](https://raw.githubusercontent.com/radix-ui/themes/main/packages/radix-ui-themes/src/components/code.css) | [[textless-part-fills]]. READ: the solid chip paints `--accent-a9` under `--accent-contrast` and hovers a linked chip to `--accent-10`. REJECTED: both, for the [[text-on-solid-fill-contrast]] text fill and the [[interaction-state-alphas]] overlay. |

## Parts without text on light colours ([[part-fill-edge]])

| Source | What it informed |
|---|---|
| [WCAG 2.2, Understanding SC 1.4.11 Non-text Contrast](https://www.w3.org/WAI/WCAG22/Understanding/non-text-contrast.html) | [[part-fill-edge]]. READ: a part can meet the 3:1 floor with its boundary rather than its whole fill. That is why a 1px edge that clears 3:1 against the page is enough, and why the guard reads the part's outer pixel. |
| [Radix Themes, slider.css](https://raw.githubusercontent.com/radix-ui/themes/main/packages/radix-ui-themes/src/components/slider.css) | [[part-fill-edge]]. ADOPTED: the range's own 1px inset hairline, `inset 0 0 0 1px var(--gray-a5)` on surface and three stacked 1px rings on classic, as the shape of the edge. The edge is one more ring, listed first so it paints on top ([[interaction-state-alphas]]), and Radix's rings stay under it. |
| [Radix Themes, switch.css](https://raw.githubusercontent.com/radix-ui/themes/main/packages/radix-ui-themes/src/components/switch.css) | [[part-fill-edge]]. ADOPTED: the checked track's `inset 0 0 0 1px var(--gray-a5)` ring on surface and its four classic layers, restated under the edge. |
| [Radix Themes, base-card.css](https://raw.githubusercontent.com/radix-ui/themes/main/packages/radix-ui-themes/src/components/_internal/base-card.css) | [[part-fill-edge]]. READ: the card's `::after` sits 1px inside the card and carries the border ring as an outer box-shadow, and the selected outline on it paints above that shadow, so no ring can stack on the outline. ADOPTED: outside forced colours `::after` moves to the card's edge and paints the same 2px band as an inset ring, so the band stays where the outline put it. REJECTED: an outer ring beside an inner ring, which left a light seam on the rounded corner where the two met. |
| [CSS 2.2, Appendix E, Elaborate description of Stacking Contexts](https://www.w3.org/TR/CSS22/zindex.html) | [[part-fill-edge]]. READ: the order lets a browser paint an element's outline at one of two points. Measured in Chromium, the card item's own outline painted under its positioned `::after`. REJECTED as a result: the item's outline as the edge. |
| [Radix Themes, radio-cards.css](https://raw.githubusercontent.com/radix-ui/themes/main/packages/radix-ui-themes/src/components/radio-cards.css) | [[radio-cards-band-edge]]. READ: a checked card paints `outline: 2px solid var(--accent-indicator)` on `::after` at `outline-offset: -1px`, the band [[part-fill-edge]] restates for CheckboxCards, with `--accent-12` under `highContrast`, `--focus-10` on a focused checked card and `--gray-8` on a disabled one. ADOPTED: the [[part-fill-edge]] band, a 2px inset ring on `::after` with the edge on its outer 1px. REJECTED: the edge on a focused, disabled or high-contrast card, which keeps Radix's outline. |
| [SVG 2, Rendering Model, Painting order](https://www.w3.org/TR/SVG2/render.html#PaintersModel) | [[indicator-mark-edges]]. READ: a later element in document order paints over an earlier one. ADOPTED: the chart line's edge as a second path in `--accent-part-edge` drawn after the line, along the same path at the same width, the SVG form of an inset ring listed first. REJECTED: a stroke `color-mix` of the fill and the edge, a second paint recipe beside the stacked alpha every other part uses. |
| [CSS Color Adjustment 1, section 3.1, Properties Affected by Forced Colors Mode](https://www.w3.org/TR/css-color-adjust-1/#forced-colors-properties) | [[indicator-mark-edges]]. READ: the spec lists `fill` and `stroke` among the forced properties, and forced colours compute `box-shadow` to none. Measured in Chromium under emulated forced colours, the five CSS marks lose the edge with their shadow, while the chart's SVG strokes keep their authored colours, so its edge path still paints on the six colours. |

## The focus ring on the light scrim ([[light-scrim-focus-ring]])

| Source | What it informed |
|---|---|
| [CSS Basic User Interface 4, Outline properties](https://www.w3.org/TR/css-ui-4/#outline-props) | [[light-scrim-focus-ring]]. READ: an outline follows the shape of the border box, outset by `outline-offset`, and one outline paints one colour. ADOPTED: two outlines, on `::before` and `::after` over the button's box, each with the button's radius, width, style and offset inherited, so both draw the current ring's shape and the stack lands on the fill pixel for pixel. |
| [CSS Backgrounds 3, Shadow shape](https://www.w3.org/TR/css-backgrounds-3/#shadow-shape) | [[light-scrim-focus-ring]]. READ: an inset shadow's inner corner is the border radius less the spread. REJECTED: layered inset shadows on a pseudo 4px outside the button, the shape the review page drew, because the pseudo then needs the button's radius plus 4px, and CSS cannot add to an inherited radius. With the button's own radius the shadow ring differed from the outline at every corner. |
| [CSS 2.2, Appendix E, Elaborate description of Stacking Contexts](https://www.w3.org/TR/CSS22/zindex.html) | [[light-scrim-focus-ring]]. READ: positioned descendants with `z-index: auto` paint in tree order, and the order lets a browser paint an element's own outline at one of two points. [[part-fill-edge]] measured Chromium painting it under a positioned pseudo. ADOPTED: the fill on `::before` and the stack on `::after`, siblings in tree order, so the stack sits on top whatever an engine does with the button's own outline. REJECTED: the fill on the button's own outline. |

## The focus ring ([[focus-ring]])

| Source | What it informed |
|---|---|
| [Radix Themes, base-card.css](https://raw.githubusercontent.com/radix-ui/themes/main/packages/radix-ui-themes/src/components/_internal/base-card.css) | [[focus-ring]]. READ: a card clips its content with `overflow: hidden` and `contain: paint`, fills on `::before` and borders on `::after`, so no pseudo outline can reach outside it. ADOPTED: every card ring inside its edge at -2px, drawn as two inset box-shadows on `::after`, the stack listed first. REJECTED: ClickableCard's ring outside its edge, which could only paint one layer. |
| [Radix Themes, base-radio.css](https://raw.githubusercontent.com/radix-ui/themes/main/packages/radix-ui-themes/src/components/_internal/base-radio.css) | [[focus-ring]]. READ: `::before` is the radio's circle and ring, and `::after` is its dot, the radio's full size scaled 0.4, painted on every radio and hidden by `content` until checked. ADOPTED: the stack as the dot's outline, 5px wide at an offset of 0.75 of the size plus 5px, which the scale brings onto the `::before` ring, with the dot's fill hidden on an unchecked radio. REJECTED: a new element inside the radio, which the component surface does not render. |
| [Radix Themes, slider.css](https://raw.githubusercontent.com/radix-ui/themes/main/packages/radix-ui-themes/src/components/slider.css) | [[focus-ring]]. READ: the thumb rings with box-shadows on `::after`, a 3px `--accent-3` band under a 2px `--focus-8` ring, and forced colours compute box-shadow to none. ADOPTED: the ring as outlines 2px outside the visible thumb, the base on the `::before` hit extender moved to the thumb's box while keyboard focus lasts. REJECTED: a shadow ring, which cannot leave a gap. |
| [Radix Themes, scroll-area.css](https://raw.githubusercontent.com/radix-ui/themes/main/packages/radix-ui-themes/src/components/scroll-area.css) | [[focus-ring]]. READ: the viewport rings through a sibling `.rt-ScrollAreaViewportFocusRing` at -2px, and a browser that makes a scroller focusable adds its own outline on the viewport. ADOPTED: the system ring on that sibling, and the viewport's own outline dropped for every ScrollArea. |
| [APCA, bronze simple mode](https://git.apcacontrast.com/documentation/APCA_in_a_Nutshell.html) | [[focus-ring]]. READ: Lc 30 is the floor for any non-text element a reader must see. ADOPTED: Lc 30 beside WCAG 3:1 as the second floor every stack step clears. |

## The card picker focus ring ([[card-picker-focus-width]])

| Source | What it informed |
|---|---|
| [Radix Themes, radio-cards.css](https://raw.githubusercontent.com/radix-ui/themes/main/packages/radix-ui-themes/src/components/radio-cards.css) | [[card-picker-focus-width]]. READ: a focused card paints `outline: 2px solid var(--focus-8)` on `::after`, the place and width of the selected outline, and a focused checked card changes only that outline's colour to `--focus-10` and lays a `--focus-a3` tint on `::before`. REJECTED: that colour change, because a focused selected card then differs from a selected card at rest by colour alone, and the system ring keeps one colour on every control. ADOPTED: the finding that focus and selection share one pseudo and one place on the card, which is why the ring differs by width. |
| [Carbon, tile styles](https://raw.githubusercontent.com/carbon-design-system/carbon/main/packages/styles/scss/components/tile/_tile.scss) | [[card-picker-focus-width]]. READ: a selected selectable tile takes a 1px border in `$layer-selected-inverse` and shows a checkmark, and a focused tile takes the `outline` focus style, `outline: 2px solid $focus` at `outline-offset: -2px` (the [focus-outline mixin](https://raw.githubusercontent.com/carbon-design-system/carbon/main/packages/styles/scss/utilities/_focus-outline.scss)), so the focus ring inside the edge is twice the width of the selected border. ADOPTED: focus inside the tile's edge and wider than the selection mark, so width alone tells the two states apart. REJECTED: a focus colour apart from the selection colour, because [[part-colour-parity]] keeps one focus colour for every part. |
| [U.S. Web Design System (USWDS), settings](https://designsystem.digital.gov/documentation/settings/) | [[card-picker-focus-width]]. READ: the focus outline defaults to `$theme-focus-width: 0.5` units, which is 4px, on every control, and the [checkbox tile](https://raw.githubusercontent.com/uswds/uswds/develop/packages/usa-checkbox/src/styles/_usa-checkbox.scss) rings the small box inside the tile rather than the tile. ADOPTED: 4px as a published focus width. REJECTED: 4px on every control, because only the card pickers draw focus where a 2px selection band already paints, and the ring on the small box, because the whole card is the target here. |

## The space between the tab list and the panel ([[tab-panel-focus-clearance]])

| Source | What it informed |
|---|---|
| [React Aria, Tabs](https://react-aria.adobe.com/Tabs) | [[tab-panel-focus-clearance]]. READ: the starter styles lay the tabs out as a column with `gap: var(--spacing-2)` between the TabList and the TabPanels, pad each TabPanel with `var(--spacing-3)`, and draw the panel's focus ring as a 2px outline at offset 0, inside that padding. ADOPTED: the component owns the space between the list and the panel, so the ring cannot reach the list. |
| [Radix Themes, Tabs](https://www.radix-ui.com/themes/docs/components/tabs) | [[tab-panel-focus-clearance]]. READ: the documented example wraps every `Tabs.Content` in a `Box pt="3"`, so the space comes from the consumer, and Radix's `.rt-TabsContent` rule sets no margin. REJECTED: space left to the consumer, because a panel placed flush under the list draws its focus ring over the underline. |

## A part given its own colour ([[part-colour-parity]])

| Source | What it informed |
|---|---|
| [Radix Themes, color.prop.ts](https://github.com/radix-ui/themes/blob/main/packages/radix-ui-themes/src/props/color.prop.ts) | [[part-colour-parity]]. READ: the `color` prop of every part is an enum of the 26 accent colours, and a part writes it as `data-accent-color`, where a bare `[data-accent-color]` rule maps that colour's scale onto the part. ADOPTED: the 26 as the base of `AccentColor`, and `data-accent-color` as the one hook every value and fix on a part keys on, oxblood included. |
| [Radix Themes, extract-props.ts](https://github.com/radix-ui/themes/blob/main/packages/radix-ui-themes/src/helpers/extract-props.ts) | [[part-colour-parity]]. READ: `extractProps` replaces an enum value outside its list with the prop's default, so a cast `color="oxblood"` never reaches the DOM. REJECTED: a runtime push of oxblood onto the Radix colour list, because the package does not export that list and the change would stay invisible at every call site. ADOPTED: a helper beside the type that writes `data-accent-color="oxblood"` on the element Radix writes the other 26 on. |

## What opens a tab ([[tabs-open-on-navigation]])

| Source | What it informed |
|---|---|
| [WAI-ARIA Authoring Practices, Tabs with automatic activation](https://www.w3.org/WAI/ARIA/apg/patterns/tabs/examples/tabs-automatic/) | [[tabs-open-on-navigation]]. READ: the example script opens a tab in its keydown handler for ArrowLeft, ArrowRight, Home and End, and in its click handler, and it registers no focus listener. ADOPTED: an arrow key, Home, End or a click opens a tab, and a focus that no key moved opens nothing. |
| [Radix, Tabs automatic activation and screen readers (issue 1047)](https://github.com/radix-ui/primitives/issues/1047) | [[tabs-open-on-navigation]]. READ, and it is the defect [[tabs-open-on-navigation]] fixes: Radix's automatic mode opens a tab on every focus event, so a VoiceOver cursor that moves keyboard focus opens each tab it reads. REJECTED: manual activation as the default, because it costs every sighted keyboard user an extra key per tab. A click with no pointer press opened nothing in either Radix mode, and the wrap's click handler opens its tab in both. |

## How a ruling is written ([[ruling-shape]])

These sources shaped the ledger itself rather than a component, so each row names [[ruling-shape]].

| Source | What it informed |
|---|---|
| [Michael Nygard, Documenting Architecture Decisions](https://cognitect.com/blog/2011/11/15/documenting-architecture-decisions) | [[ruling-shape]]. ADOPTED: a short record in a few parts, identifiers that are never reused, and a reversed decision kept and marked as superseded, which is why every ruling keeps a permanent name ([[ruling-names-and-tags]]), the Status part names every later ruling that amends or replaces a ruling and the Evidence part keeps every earlier version. REJECTED: one file per decision, because the ledger keeps every ruling in one file under five sections. READ and NOT adopted: the Context and Consequences parts, because a ruling here states the decision first and carries its context in the Why and Changed from parts. REJECTED: prose with no bullets, because parallel items read more clearly as a short list. |
| [MADR, Markdown Architectural Decision Records](https://adr.github.io/madr/) | [[ruling-shape]]. ADOPTED: decision records in Markdown inside the repository. READ and NOT adopted: categories that number their records within each category, because a ruling carries a permanent name instead ([[ruling-names-and-tags]]). READ and NOT adopted: a Considered Options section and a Pros and Cons section in every record, because research and prior art reach a ruling through its rows in this file. REJECTED: the decision-makers field that lists people by name, because a ruling attributes guidance to the maintainer and names no person. |
| [Olaf Zimmermann, How to create Architectural Decision Records and how not to](https://ozimmer.ch/practices/2023/04/03/ADRCreation.html) | [[ruling-shape]]. ADOPTED: a record as an executive summary of what was chosen and why, and the remedy for the Mega-ADR, detail moved to a separate place, which is why measurements, test results and history sit in the hidden Evidence part. ADOPTED: links or bibliographic references in place of background text in the record, the role of the rows in this file. REJECTED: decision makers identified by name, because guidance is attributed to the maintainer with no name. READ and NOT adopted: the journal voice Zimmermann prefers to a commanding one, because a ruling here binds the code, so its headline states the rule. |
| [Diátaxis, Reference](https://diataxis.fr/reference/) | [[ruling-shape]]. ADOPTED: reference as austere, neutral description that a reader consults, in standard patterns that follow the structure of the thing described, which is why every ruling takes the same parts in the same order under the section it belongs to. ADOPTED: description kept apart from explanation, which is why the visible ruling states the rule and the Evidence part holds the measurements and history behind it. |

## The substrate and its theme ([[radix-themes-substrate]], [[brand-props-on-provider]], [[one-accent]], [[status-colour-defaults]], [[light-and-dark-token-set]], [[content-on-solid-fills]])

| Source | What it informed |
|---|---|
| [Radix Themes, Getting started](https://www.radix-ui.com/themes/docs/overview/getting-started) | [[radix-themes-substrate]]. ADOPTED: Radix Themes as the styled base, installed as `@radix-ui/themes` with its stylesheet and a root `Theme`. REJECTED: a separate import of the Radix stylesheet in each app, because the package stylesheet bundles it, and a `Theme` written in each app, because `Provider` renders it. |
| [Radix Themes, Theme](https://www.radix-ui.com/themes/docs/components/theme) | [[brand-props-on-provider]], [[light-and-dark-token-set]], [[content-on-solid-fills]]. ADOPTED: `accentColor`, `grayColor` and `radius` as props on one root, which `Provider` passes to the `Theme` it renders, with Radix's `auto` grey and `medium` radius as the defaults ([[brand-props-on-provider]]). REJECTED: Radix's `indigo` default accent, because `Provider` defaults to `iris`. ADOPTED: a nested `Theme` that changes the configuration of one subtree, which is how `Contrast` renders a section in the opposite appearance ([[content-on-solid-fills]]). READ: `appearance` defaults to `inherit`, the case for which [[dark-override-selectors]] requires a second dark selector ([[light-and-dark-token-set]]). |
| [Radix Themes, Color](https://www.radix-ui.com/themes/docs/theme/color) | [[brand-props-on-provider]], [[one-accent]], [[content-on-solid-fills]]. ADOPTED: the accent as the colour of primary buttons, links and other interactive elements, set once through `accentColor` on the root from 26 named accents ([[brand-props-on-provider]], [[one-accent]]). ADOPTED: the `color` prop that gives a single part another accent ([[one-accent]]). ADOPTED: `--accent-contrast`, the step for content on a solid accent fill, which `--on-accent` reads ([[content-on-solid-fills]]). REJECTED: a focus colour that follows the `color` of a part, because every focus ring keeps the page accent ([[part-colour-parity]]). |
| [Radix Themes, Dark mode](https://www.radix-ui.com/themes/docs/theme/dark-mode) | [[light-and-dark-token-set]]. ADOPTED: light and dark as the `appearance` of one theme, switched by the `light`, `light-theme`, `dark` and `dark-theme` class names, so each `--ds-*` role declared on `.radix-themes` resolves again when the class changes. READ: a class on the page root can set the appearance, which is why every dark override carries the second selector [[dark-override-selectors]] requires. |
| [Radix Colors, Scales](https://www.radix-ui.com/colors/docs/palette-composition/scales) | [[status-colour-defaults]], [[light-and-dark-token-set]]. ADOPTED: the `red`, `amber`, `green` and `cyan` scales as the default error, warning, success and info families ([[status-colour-defaults]]). ADOPTED: a light and a dark variant of every scale under the same step names, so one role that reads a step serves both appearances ([[light-and-dark-token-set]]). |

## Component sources, icons and primitives ([[one-scoped-stylesheet]], [[catalog-as-specification]], [[headless-primitives-declared]], [[token-chip]])

| Source | What it informed |
|---|---|
| [Phosphor Icons for React](https://github.com/phosphor-icons/react) | [[one-scoped-stylesheet]]. ADOPTED: Phosphor glyphs imported as React components from `@phosphor-icons/react`. ADOPTED: `IconContext`, which sets the `fill` weight on the icon of a selected row ([[selected-row-cue]]). READ: six weights, `thin`, `light`, `regular`, `bold`, `fill` and `duotone`, of which the token layer names `regular` and `fill` ([[icon-weight-axis]]). |
| [Astryx](https://github.com/facebook/astryx) | [[catalog-as-specification]]. ADOPTED: the catalog, the API and the behaviour of a component as a specification a component here may follow, and its MIT-licensed code reused under a copyright line and a notice per source file. REJECTED: its StyleX styling and its themes, because every component here paints from Radix Themes and the `--ds-*` roles. REJECTED: an Astryx name where Radix Themes has its own, so `Callout`, `Separator` and `DataList` keep the Radix names. |
| [Astryx, Token](https://github.com/facebook/astryx/blob/main/packages/core/src/Token/Token.tsx) | [[token-chip]]. ADOPTED: one chip whose body follows its props, a link for `href`, an invisible button for `onClick` and plain text otherwise, with the remove button beside the body and named from the label. READ: on the main branch on 2026-10-01 a linked chip with a remove button keeps the button outside the link, the valid markup [[token-chip]] requires. REJECTED: its StyleX skin and colour map, because Token renders the Radix Badge surface skin. READ and NOT adopted: `isLabelHidden`, `endContent` and `description`. |
| [Radix Primitives, Introduction](https://www.radix-ui.com/primitives/docs/overview/introduction) | [[headless-primitives-declared]]. ADOPTED: primitives as an unstyled, accessible base layer with one package per primitive. READ: Radix recommends the `radix-ui` package, and advises updating every Radix package together when primitives install one by one, so shared dependencies do not duplicate. ADOPTED: every `@radix-ui/react-*` primitive a component imports declared by its own name in `package.json` `dependencies` and pre-bundled in the docs and the tests, so all of them share one copy of React. REJECTED: an import of a primitive that only `radix-ui` installs, because a dependency that arrives only through another package breaks without warning when that package changes how it installs. |

## A pressed Token ([[token-pressed-state]])

| Source | What it informed |
|---|---|
| [Material Web, filter chip](https://github.com/material-components/material-web/blob/main/chips/internal/filter-chip.ts) | [[token-pressed-state]]. READ: the source and the [chip documentation](https://github.com/material-components/material-web/blob/main/docs/components/chip.md) on 2026-10-01. The primary action of a filter chip is a `<button>` with `aria-pressed`, the remove control is a second button named from the label, and a selected chip shows a leading check mark marked `aria-hidden` on a tinted container. ADOPTED: `aria-pressed` on the body button with the remove button beside it, the markup Token already had. REJECTED: the leading check mark, because it widens a pressed chip and moves every chip after it in the row. REJECTED: the chip set as a toolbar with roving focus, because a Token owns no group and the Toolbar component owns roving focus in this system. REJECTED: the checkbox role, because the toggle button pattern pairs `aria-pressed` with the button role. |
| [Astryx, ToggleButton](https://github.com/facebook/astryx/blob/main/packages/core/src/ToggleButton/ToggleButton.tsx) | [[token-pressed-state]]. READ: on the main branch on 2026-10-01 a pressed ToggleButton sets its label in semibold, and a hidden duplicate of the label in semibold reserves the wider width, so a press causes no layout shift. The ToggleButton of this system takes the same technique. ADOPTED: a hidden `aria-hidden` duplicate of the label at `--ds-font-weight-strong`, stacked with the visible label, so a Token given `pressed` keeps one width in both states and a press moves no chip in the row. REJECTED: the duplicate as a zero-height block under the label, because one grid cell that holds both copies centres the label in the chip, as the ToggleButton of this system does. |
| [React Aria, ToggleButton](https://react-aria.adobe.com/ToggleButton) | [[token-pressed-state]]. READ: ToggleButton is a button with `aria-pressed`. [React Aria TagGroup](https://react-aria.adobe.com/TagGroup) is a grid of rows with a single or multiple selection mode, and a selected tag swaps to a solid tint and paints `Highlight` under `HighlightText` in forced colours, with no glyph and no change of weight. ADOPTED: a button with `aria-pressed` for a single toggle. ADOPTED: the `Highlight` and `HighlightText` pair for a pressed Token under forced colours. REJECTED: the grid and its selection model, because a Token has no group to own one and `aria-selected` is not valid on a button. REJECTED: a selected fill as the only cue, because colour alone cannot carry a state. |
| [WAI-ARIA Authoring Practices, Button pattern](https://www.w3.org/WAI/ARIA/apg/patterns/button/) | [[token-pressed-state]]. READ: a toggle button is a button with `aria-pressed` set to true or false, its label must not change when the state changes, and Space and Enter toggle it with focus kept on the button. ADOPTED: `aria-pressed` on the body button with a stable label, rendered only when `pressed` is given and never on a link or a static body. REJECTED: the `mixed` value, because a filter has no partial state. |
| [Carbon, SelectableTag](https://raw.githubusercontent.com/carbon-design-system/carbon/main/packages/react/src/components/Tag/SelectableTag.tsx) | [[token-pressed-state]]. READ: the source renders a `<button>` with `aria-pressed`. The [tag usage page](https://carbondesignsystem.com/components/tag/usage/), updated on 30 September 2026, paints a selected tag in an inverse fill that stays the same on hover, with no glyph, offers selectable tags in no category colour, and advises against a tag with more than one function. ADOPTED: each tag as its own tab stop, and a pressed fill that does not change on hover. ADOPTED: the advice against two functions on one tag, as the caution on the Token page against a pressed Token that is also removable. REJECTED: the inverse fill, because the subtle tint under strong ink is the measured pressed paint here. REJECTED: the loss of the category colour, because a pressed Token keeps the tint of its `color`. |

## The install warning ([[missing-provider-warning]])

| Source | What it informed |
|---|---|
| [CSS Custom Properties for Cascading Variables Level 1, Guaranteed-invalid values](https://drafts.csswg.org/css-variables-1/#guaranteed-invalid) | [[missing-provider-warning]]. READ: a custom property with no declaration holds the guaranteed-invalid value, which serializes as the empty string and makes any property that references it invalid at computed-value time. ADOPTED: an empty `--ds-fill-accent` on `.radix-themes` as the sign of an absent stylesheet, and the same rule as the reason every `calc()` fails without the attributes `Provider` writes. |
