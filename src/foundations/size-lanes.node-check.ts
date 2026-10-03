/* =============================================================================
   size-lanes.node-check.ts — THE LANE TABLE IS THE SIZE POLICY
   -----------------------------------------------------------------------------
   `LANE_STEPS` in `src/theme/SizeContext.tsx` is the whole of this system's size
   policy: every sized component resolves its Radix step through it. The
   recurring complaint across six recreations was that changing the global size
   did almost nothing, and the cause was always the same shape — something took a
   LITERAL step instead of a lane, so it was inert at every tier.

   Two shipped components did it in their own source, which is the case this
   guard exists for. `ClickableCard.headingSize` defaulted to `"3"`, so a card
   title measured 16px at small, medium AND large. `EmptyState` hardcoded `"2"`
   and `"3"`, which additionally INVERTED at the large tier: a 14px title under a
   16px description ([[chrome-heading-lane]]).

   WHAT THIS GUARD ASSERTS, and what it deliberately leaves alone:

     MONOTONIC  — every lane steps up, or holds, from small to medium to large.
       A lane that goes backwards is the inversion defect at the policy level.
     DISTINCT   — small and large differ on every lane. A lane identical at both
       ends is inert, which is the defect review kept finding.
     OFFSET     — `chromeHeading` is exactly one step above `text`, at every
       tier. That relationship IS the lane's definition ([[chrome-heading-lane]]): a heading inside
       a card is subordinate to a page heading and superior to the body beside
       it. If it drifts, the lane has stopped meaning what its name says.
     SUBORDINATE— `chromeHeading` sits strictly below `heading` at every tier,
       because the whole reason it exists is that the page-title ladder is too
       large inside a small surface.

   IT DOES NOT ASSERT PIXELS. The step-to-px mapping is Radix's, and pinning it
   here would make this guard fail on a vendor upgrade that changed nothing about
   our policy. Pixels are measured where they are rendered, in the story lane.
   ============================================================================= */

import { test, expect } from "vitest";
import { LANE_STEPS_TABLE, type SizeLane, type UISize } from "../theme/SizeContext";

const TIERS: UISize[] = ["small", "medium", "large"];
const LANES: SizeLane[] = ["control", "text", "heading", "chromeHeading", "display", "container"];

const stepOf = (tier: UISize, lane: SizeLane) => Number(LANE_STEPS_TABLE[tier][lane]);

test("every lane steps up, or holds, as the tier grows", () => {
  const backwards: string[] = [];
  for (const lane of LANES) {
    for (let i = 1; i < TIERS.length; i += 1) {
      const prev = stepOf(TIERS[i - 1], lane);
      const next = stepOf(TIERS[i], lane);
      if (next < prev) {
        backwards.push(`${lane}: ${TIERS[i - 1]} is step ${prev} but ${TIERS[i]} is step ${next}`);
      }
    }
  }
  expect(backwards, backwards.join("\n")).toEqual([]);
});

test("no lane is inert between small and large", () => {
  // The recurring report — swapping from small to large left most of the content
  // unchanged — is this defect when it happens at the policy level rather than at a call site.
  const inert = LANES.filter((lane) => stepOf("small", lane) === stepOf("large", lane)).map(
    (lane) => `${lane}: step ${stepOf("small", lane)} at both small and large`,
  );
  expect(inert, inert.join("\n")).toEqual([]);
});

test("chromeHeading is exactly one step above text, at every tier", () => {
  // This offset IS the lane's definition ([[chrome-heading-lane]]), not a coincidence of the current numbers.
  const wrong = TIERS.filter((t) => stepOf(t, "chromeHeading") !== stepOf(t, "text") + 1).map(
    (t) =>
      `${t}: text is step ${stepOf(t, "text")} but chromeHeading is ${stepOf(t, "chromeHeading")}, ` +
      `expected ${stepOf(t, "text") + 1}`,
  );
  expect(wrong, wrong.join("\n")).toEqual([]);
});

test("display stays above the page heading lane", () => {
  // The reason THAT lane exists ([[display-size-lane]]): a hero metric outranks a page title. If display ever fell
  // to the heading lane it would be redundant, and the analytics KPI would be inert again.
  const notSuperior = TIERS.filter((t) => stepOf(t, "display") <= stepOf(t, "heading")).map(
    (t) => `${t}: display is step ${stepOf(t, "display")} against heading ${stepOf(t, "heading")}`,
  );
  expect(notSuperior, notSuperior.join("\n")).toEqual([]);
});

test("chromeHeading stays below the page heading lane", () => {
  // The reason the lane exists: the page-title ladder is too large inside a card or an empty state.
  // If chromeHeading ever reached it, the lane would be redundant and the defect would be back.
  const notSubordinate = TIERS.filter(
    (t) => stepOf(t, "chromeHeading") >= stepOf(t, "heading"),
  ).map(
    (t) =>
      `${t}: chromeHeading is step ${stepOf(t, "chromeHeading")} against heading ${stepOf(t, "heading")}`,
  );
  expect(notSubordinate, notSubordinate.join("\n")).toEqual([]);
});

test("control and text never drift apart", () => {
  // Pre-existing policy, asserted here because nothing else did: a Button and the Text beside it
  // render at the same Radix step, the way raw Radix pairs them.
  const drifted = TIERS.filter((t) => stepOf(t, "control") !== stepOf(t, "text")).map(
    (t) => `${t}: control ${stepOf(t, "control")} against text ${stepOf(t, "text")}`,
  );
  expect(drifted, drifted.join("\n")).toEqual([]);
});
