import { createContext, useContext } from "react";
import { ProviderPresenceContext, warnOnce, NO_PROVIDER_MESSAGE } from "./detectAndWarn";

export type UISize = "small" | "medium" | "large";
export type SizeLane = "control" | "text" | "heading" | "chromeHeading" | "display" | "container";

// uiSize maps each lane to a Radix size step. control and text share the SAME
// step at every tier, so a Button and the Text beside it render at the same
// Radix size — the way raw Radix pairs them (a step-2 Button and step-2 Text are
// both 14px). They must never be offset from each other. Headings are
// intentionally larger via their own higher steps.
//
// chromeHeading is a heading INSIDE a small surface — a card title, an empty
// state's focal line, a panel header. The `heading` lane is a PAGE title ladder
// (20/24/28px) and is simply wrong at that scale: measured on a 264px kanban
// column, moving card titles onto it took four cards from 174/156/188/156px to
// 336/264/296/228px, one filling a third of the viewport. Components therefore
// pinned a literal step to escape it — `ClickableCard.headingSize` defaulted to
// "3" and `EmptyState`'s ladder hardcoded "2"/"3" — and a literal step is
// tier-inert, so a card title measured 16px at small, medium AND large. Worse,
// EmptyState's literal put its title at 14px UNDER a 16px description at the
// large tier: a component inverting its own hierarchy ([[chrome-heading-lane]]).
// So the lane is text + 1 step. It steps with the tier, stays subordinate to a
// page heading, and at `small` is byte-identical to the literals it replaces,
// which is what makes the change safe to land on shipped components. The +1
// offset is the same device `CONTROL_MEMBER_STEP` already uses within a lane ([[toggle-group-box]]).
//
// container is the surface lane — Radix's container-size scale (Dialog / Card /
// ScrollArea scrollbar), which tunes a surface's padding + radius rather than a
// control's height/type. It sits one step ABOVE the control lane at every tier
// (small → 2, not 1): a surface reads more spacious than a control at the same
// global size, and a standard content dialog is deliberately roomier than a
// terse confirm (AlertDialog rides the control lane). An explicit size still wins.
// display is the rung ABOVE a page heading: a dashboard KPI, a hero statistic,
// a number that IS the content rather than a label for it. The system had no
// such rung, so the analytics recreation pinned `size="7"` and its most
// prominent element went inert — 28px at every tier while the tile around it
// grew from 178px to 210px ([[display-size-lane]]). The lane takes Radix's own display ramp
// (7/8/9 = 28/35/60) rather than inventing one; `small` is 7, which is exactly
// what the pin rendered, so adopting the lane costs nothing at the default tier
// and the ramp only opens up above it. A 60px figure at `large` is deliberate:
// the large tier exists to make things larger, and a hero metric is the element
// with the most licence to take it.
const LANE_STEPS: Record<UISize, Record<SizeLane, string>> = {
  small: { control: "1", text: "1", heading: "5", chromeHeading: "2", display: "7", container: "2" },
  medium: { control: "2", text: "2", heading: "6", chromeHeading: "3", display: "8", container: "3" },
  large: { control: "3", text: "3", heading: "7", chromeHeading: "4", display: "9", container: "4" },
};

/**
 * Resolve a lane to its Radix size step for the active global tier. **The public half of the size
 * system** ([[size-lane-hook]]).
 *
 * Every sized component in here resolves a lane internally, but that resolution was private, so
 * anything HAND-COMPOSED — by a consumer, or by our own showcase pages — had no way to participate
 * in `uiSize` and was stuck on a literal step. A literal cannot move, so the composition went
 * tier-inert while the components around it grew. That is the single most common size defect this
 * system has produced, and it was unfixable from outside until this was exported.
 *
 * ```tsx
 * // A heading inside a card you composed yourself.
 * <Heading size={useSizeLane("chromeHeading")}>{title}</Heading>
 * ```
 *
 * Pick the lane by what the thing IS, not by the size you want today:
 * `control` and `text` share a step and pair a control with the text beside it; `chromeHeading` is
 * a heading inside a card or panel; `heading` is a page title; `display` is a hero metric;
 * `container` tunes a surface's padding and radius. `GUIDELINES.md` §3 has the reasoning.
 *
 * Read-only by design. There is no exported setter: the tier is `Provider`'s to own, and a
 * component that could change it for its subtree would make the global size unpredictable.
 */
export function useSizeLane(lane: SizeLane): string {
  return LANE_STEPS[useContext(SizeContext)][lane];
}

/** Exposed for tests — the size policy table. */
export const LANE_STEPS_TABLE = LANE_STEPS;

export const SizeContext = createContext<UISize>("small");
export const useUISize = () => useContext(SizeContext);

/**
 * The inverse of `LANE_STEPS[tier].control` — the map a container uses to SEED its own size back
 * into the tree ([[container-size-seeding]]).
 *
 * A container that takes its own `size` prop resolves a step that the tree around it knows nothing
 * about; anything handed to one of its SLOTS resolves the ambient tier instead, and the two land in
 * the same row at different sizes. Wrapping the container's subtree in
 * `<SizeContext.Provider value={CONTROL_STEP_TO_UISIZE[step]}>` closes that: unsized slot content
 * resolves the container's step, and an explicitly-sized child still wins, because an explicit size
 * is checked before the context is ever read (`useResolvedSize`).
 *
 * Shared rather than copied: `Toolbar` and `ChatComposer` both seed, and two private copies of one
 * inverse is how the two drift apart.
 */
export const CONTROL_STEP_TO_UISIZE: Record<"1" | "2" | "3", UISize> = {
  "1": "small",
  "2": "medium",
  "3": "large",
};

/**
 * The member ramp — one step DOWN, floored at step 1 ([[toggle-group-box]]): a composite that owns the step box
 * (ToggleButtonGroup's tray) seeds its members the step below, so a medium tray holds small buttons.
 * Lives here beside the avatar ramps for the same reason AVATAR_PORTRAIT_TIER does: a second ladder
 * within a lane is system policy, and a private copy in a component is how two of them drift ([[container-size-seeding]]).
 * Exposed for tests and docs.
 */
export const CONTROL_MEMBER_STEP: Record<"1" | "2" | "3", "1" | "2"> = {
  "1": "1",
  "2": "1",
  "3": "2",
};

/**
 * Resolve the Radix `size` step for a lane, honoring an explicit per-instance size.
 *   - explicit step (or responsive object) → returned untouched (wins)
 *   - "inherit" → undefined (render with NO size prop: cascade / Radix default)
 *   - undefined → the lane's step for the active global uiSize
 * Generic over the component's size type so call sites keep their narrow public type.
 */
export function useResolvedSize<S>(lane: SizeLane, explicit: S | "inherit" | undefined): S | undefined {
  const tier = useContext(SizeContext);
  // The one seam every sized component already passes through — 74 of them — which is why the
  // missing-Provider check lives here rather than in each component. `SizeContext` cannot answer
  // the question itself: its default is a real tier, indistinguishable from a Provider that set it.
  // Read unconditionally: a hook behind `DEV_WARN` would make hook order depend on the build.
  const insideProvider = useContext(ProviderPresenceContext);
  if (!insideProvider) warnOnce("no-provider", NO_PROVIDER_MESSAGE);
  if (explicit === "inherit") return undefined;
  if (explicit != null) return explicit as S;
  return LANE_STEPS[tier][lane] as S;
}

/* ---- Avatar size (a line-height ladder, not Radix steps) ------------------ */
export type AvatarSize = "xs" | "sm" | "md" | "lg" | "xl";

/**
 * Which rung of the ladder an unsized avatar takes. The avatar ramp is a line-height ladder (see
 * components.css / icons.css), so the values are t-shirt names, not Radix size steps — parallel to
 * LANE_STEPS but intentionally SEPARATE from it, so the control==text step invariant stays untouched.
 *
 * There are TWO ramps because an avatar does two different jobs:
 *
 *   inline   — the beside-text ladder: 16 / 20 / 24. The disc sits on a line of copy (an author beside
 *              a timestamp, a row's owner cell) and must not out-measure the text it rides with, so
 *              the rung is the text leading at that tier. This is the default.
 *   portrait — the identity ladder: 24 / 30 / 40. When the avatar IS the content rather than a glyph
 *              on a line — an overlapped identity stack (AvatarGroup), a chat header, a profile
 *              tile — the face has to be legible AS a face. At the inline rungs a stack of 16px discs
 *              overlapped by 40% leaves ~10px of each person showing, which reads as texture, not as
 *              people. A portrait is not an inline glyph, so it does not ride the inline ladder.
 *
 * A component picks its ramp; an explicit per-instance size still wins over both.
 */
const AVATAR_TIER: Record<UISize, AvatarSize> = {
  small: "xs",
  medium: "sm",
  large: "md",
};

const AVATAR_PORTRAIT_TIER: Record<UISize, AvatarSize> = {
  small: "md",
  medium: "lg",
  large: "xl",
};

/** The ramp an avatar-hosting component sizes off — see AVATAR_TIER. */
export type AvatarRamp = "inline" | "portrait";

/** Exposed for tests — the avatar size policy table (inline / beside-text ramp). */
export const AVATAR_TIER_TABLE = AVATAR_TIER;

/** Exposed for tests — the avatar size policy table for identity/portrait contexts. */
export const AVATAR_PORTRAIT_TIER_TABLE = AVATAR_PORTRAIT_TIER;

const AVATAR_RAMPS: Record<AvatarRamp, Record<UISize, AvatarSize>> = {
  inline: AVATAR_TIER,
  portrait: AVATAR_PORTRAIT_TIER,
};

/**
 * Resolve an Avatar's size, honoring an explicit per-instance value.
 *   - a t-shirt name ("xs".."xl") or a raw number → returned untouched (wins)
 *   - "inherit" → undefined (no DS sizing; Radix's own default box governs)
 *   - undefined → the ramp's ladder step for the active global uiSize
 * `ramp` selects which ladder the tier reads from: "inline" (default, beside-text) or "portrait"
 * (identity stacks and headers, where the face carries the meaning).
 */
export function useResolvedAvatarSize(
  explicit: AvatarSize | number | "inherit" | undefined,
  ramp: AvatarRamp = "inline",
): AvatarSize | number | undefined {
  const tier = useContext(SizeContext);
  if (explicit === "inherit") return undefined;
  if (explicit != null) return explicit;
  return AVATAR_RAMPS[ramp][tier];
}
