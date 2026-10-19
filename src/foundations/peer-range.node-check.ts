/* =============================================================================
   peer-range.node-check.ts — A DECLARED PEER OUTSIDE THE NEED IS REPORTED
   -----------------------------------------------------------------------------
   `dsiab init` used to check only that a peer was LISTED in package.json, so a
   project on React 18 passed. `bin/peer-range.mjs` now answers whether the
   declared range shares a version with the range this package needs: true
   (overlap), false (no version meets both), or null (a tag or a protocol it
   cannot read, which init reports nothing for). This table holds that answer
   for the needs in use, ">=19" and "~3.3.0".
   ============================================================================= */
import { test, expect } from "vitest";
import { admits } from "../../bin/peer-range.mjs";

const CASES: [declared: string, need: string, expected: boolean | null][] = [
  // React and react-dom need >=19.
  ["^18.2.0", ">=19", false],
  ["^18.3.0", ">=19", false],
  ["18.3.1", ">=19", false],
  ["~18", ">=19", false],
  [">=18 <19", ">=19", false],
  ["18.x", ">=19", false],
  ["<=18.3.1", ">=19", false],
  ["^19.0.0", ">=19", true],
  [">=19", ">=19", true],
  ["19.2.0", ">=19", true],
  ["^18 || ^19", ">=19", true],
  [">= 18", ">=19", true],
  ["18.0.0 - 19.1.0", ">=19", true],
  ["^19.0.0-rc.1", ">=19", true],
  ["latest", ">=19", null],
  ["next", ">=19", null],
  ["workspace:*", ">=19", null],
  ["*", ">=19", null],
  ["x", ">=19", null],
  ["", ">=19", null],
  ["file:../react", ">=19", null],
  ["link:../react", ">=19", null],
  ["npm:react@^19", ">=19", null],
  ["github:facebook/react", ">=19", null],
  ["git+https://github.com/facebook/react.git", ">=19", null],
  // Radix Themes needs ~3.3.0, which is [3.3.0, 3.4.0).
  ["~3.2.0", "~3.3.0", false],
  ["^3.2.0", "~3.3.0", true],
  ["~3.3.1", "~3.3.0", true],
  ["3.3.4", "~3.3.0", true],
  ["3.4.0", "~3.3.0", false],
  ["^4.0.0", "~3.3.0", false],
  ["^2.0.0", "~3.3.0", false],
];

test.each(CASES)("declared %j against need %j answers %j", (declared, need, expected) => {
  expect(admits(declared, need)).toBe(expected);
});
