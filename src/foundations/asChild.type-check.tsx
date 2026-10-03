/* =============================================================================
   asChild.type-check.tsx — COMPILE-TIME ASSERTIONS FOR THE asChild SEAM
   -----------------------------------------------------------------------------
   Sibling of Text.type-check.tsx, same lane and same rules: there is no runtime
   here and no test runner, `tsc --noEmit` passing IS the green, and each
   `@ts-expect-error` is an assertion that INVERTS. If one of the refusals below
   ever stops being a type error, the build fails.

   WHAT IT DEFENDS, and why prose could not. On 2026-09-21 a compiled type probe
   plus two render passes found eight published names that THREW when `asChild`
   was passed with a single element child, because the prop reached a Radix
   `Slot` that had several children to choose from. Five of them are the names
   below. Two answers were possible per name and both are recorded here:

     TOOLBAR ROOT SUPPORTS THE SEAM. Its content is the start / center / end
     slots, so `children` was free to become the slot target. The prop and the
     child move together, and the two halves of that union are what the last two
     assertions hold: `asChild` with no child renders nothing, and a child with
     no `asChild` would be a fourth region nothing positions.

     BADGE, TOKEN, CLICKABLE CARD AND COLLAPSIBLE REFUSE. Each renders more than
     one child into its own root and each already spends `children` on its label
     or its body, so there is no element to hand over. The refusal was already
     the intent — [[badge-scope]] removed Badge's interactive body, [[token-chip]] made Token's remove
     control a SIBLING of its body, D6 needs ClickableCard's own box to carry the
     stretched-link overlay — but it was expressed only as an absence, and an
     absent prop is still reachable from untyped JavaScript or a spread. Each now
     declares `asChild?: never`, which is what these assertions read.

   THE SECOND ROUND, 2026-09-21, WAS QUIETER AND WORSE. Six more names carried
   `asChild` in their published props and did NOT crash: the prop reached one
   element or another and the page still rendered, so nothing ever complained.
   Four of the six are below. Each was server-rendered before it was refused,
   and in every case the root element the component exists to be was GONE:

     CALLOUT loses `rt-CalloutRoot` entirely, because Radix's Callout.Root puts
     its children inside a size Context.Provider and the Slot clones THAT. The
     tone paint, the urgency border and the error `role="alert"` go with the div,
     and the icon, title, actions and dismiss control spill into the parent.

     DRAG HANDLE, MOBILE NAV TOGGLE AND TOGGLE BUTTON each emitted no `<button>`
     at all. The prop rode their rest spread down to the IconButton or Button
     underneath and slotted an inner element: an `<svg>` for the first two, the
     layout `<span>` for the third, each wearing the button's classes and the
     button's ARIA. A glyph with an `aria-label`, or a span with `aria-pressed`,
     is a control no keyboard reaches and no screen reader operates.

   None of the four has an element to give: all three of the button-rooted ones
   already omit or reserve `children`, and Callout spends `children` on its body.

   EXCLUDED FROM THE PUBLISHED BUILD via tsconfig.build.json, through the same
   `type-check.tsx` exclusion the Text file rides. It is deliberately NOT named
   with a `test.tsx` suffix: vitest sets no explicit `test.include`, so its default
   glob would collect this file into both browser projects and fail with "no test
   suite found". It contains types, not tests.
   ============================================================================= */
import { Badge } from "../components/ui/Badge";
import { ClickableCard } from "../components/ui/ClickableCard";
import { Collapsible } from "../components/ui/Collapsible";
import { Toolbar } from "../components/ui/Toolbar";
import { Token } from "../components/ui/Token";
import { Callout } from "../components/ui/Callout";
import { DragHandle } from "../components/ui/DragHandle";
import { MobileNavToggle } from "../components/ui/MobileNav";
import { ToggleButton } from "../components/ui/ToggleButton";

/* ---- MUST COMPILE — the ordinary use of each name, and the one supported seam ---- */

/** The toolbar as every shipped story writes it: regions in, no children. */
export const toolbarPlain = <Toolbar.Root aria-label="Formatting" start={<b>B</b>} />;

/** The seam: the consumer's element becomes the toolbar, the regions render inside it. */
export const toolbarAsChild = (
  <Toolbar.Root asChild aria-label="Formatting" start={<b>B</b>}>
    <nav />
  </Toolbar.Root>
);

/** The eight refusals, used as they are meant to be used. */
export const badgePlain = <Badge tone="success">Live</Badge>;
export const tokenPlain = <Token label="alpha" onRemove={() => {}} />;
export const cardPlain = <ClickableCard href="/a" title="Card">teaser</ClickableCard>;
export const collapsiblePlain = <Collapsible trigger="Details">body</Collapsible>;
export const calloutPlain = <Callout tone="error">Could not save.</Callout>;
export const dragHandlePlain = <DragHandle label="Reorder Full name" />;
export const mobileNavTogglePlain = <MobileNavToggle />;
export const toggleButtonPlain = <ToggleButton label="Bold">B</ToggleButton>;

/* ---- MUST NOT COMPILE — the refusals, and the toolbar union's two halves ---- */

// @ts-expect-error -- Badge is a display marker ([[badge-scope]]); asChild reached its removed interactive body
export const badgeRefusesAsChild = <Badge asChild><span>Live</span></Badge>;

// @ts-expect-error -- a Token is a body plus a sibling remove control ([[token-chip]]), never one element
export const tokenRefusesAsChild = <Token asChild label="alpha" />;

// @ts-expect-error -- the stretched-link overlay (D6) needs the card's own box to be the root
export const cardRefusesAsChild = <ClickableCard asChild href="/a" title="Card" />;

// @ts-expect-error -- a disclosure is a trigger plus a content region, and children is the body
export const collapsibleRefusesAsChild = <Collapsible asChild trigger="Details">body</Collapsible>;

// @ts-expect-error -- asChild with no child renders nothing at all, so the child is required
export const toolbarAsChildNeedsAChild = <Toolbar.Root asChild start={<b>B</b>} />;

// @ts-expect-error -- a child without asChild would be a fourth region nothing positions
export const toolbarChildNeedsAsChild = <Toolbar.Root start={<b>B</b>}><nav /></Toolbar.Root>;

// @ts-expect-error -- the Slot clones Radix's size Provider, so rt-CalloutRoot and the tone paint vanish
export const calloutRefusesAsChild = <Callout asChild tone="error">Could not save.</Callout>;

// @ts-expect-error -- the prop slotted the glyph, leaving an svg where the grip's button had been
export const dragHandleRefusesAsChild = <DragHandle asChild label="Reorder Full name" />;

// @ts-expect-error -- same shape: an svg carrying aria-expanded, and a drawer no keyboard can open
export const mobileNavToggleRefusesAsChild = <MobileNavToggle asChild />;

// @ts-expect-error -- children is the label and is rendered twice for width, so there is no slot target
export const toggleButtonRefusesAsChild = <ToggleButton asChild label="Bold" />;
