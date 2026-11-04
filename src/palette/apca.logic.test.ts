/* The runtime APCA port against the reference package ([[apca-runtime-port]]).

   ZERO TOLERANCE. The licence requires the approved constants and the correct
   polarity, and a port that drifts by a rounding step is a different
   algorithm under the same name. So every pair is compared with Object.is,
   not within an epsilon.

   THE GRID. Every grey on every grey (65,536 ordered pairs, both polarities,
   the black soft clamp, the low-delta early return and the low clip), every
   pair of a 6-level colour cube (46,656), and 20,000 seeded random pairs.

   THE GUARD GUARDS ITSELF. A grid that no constant can move proves nothing,
   so the second test changes each constant in turn by 1% and requires the
   grid to catch it. One constant cannot be caught that way, and the reason is
   in the algorithm, not the grid: `deltaYmin` returns 0 for two luminances
   closer than 0.0005, and for any two that close the raw contrast stays under
   `loClip`, which returns 0 anyway. So `apca-port.node-check.ts` reads the
   constant block out of the reference source and compares every value
   directly, there and not here, because reading a file needs Node's types,
   which this lane keeps out of the type gate. */
import { describe, expect, it } from "vitest";
import { APCAcontrast, sRGBtoY } from "apca-w3";
import { SA98G, apcaLc, apcaY, type ApcaConstants } from "./apca";

type RGB = [number, number, number];

function grid(): Array<[RGB, RGB]> {
  const pairs: Array<[RGB, RGB]> = [];
  for (let t = 0; t < 256; t++) for (let b = 0; b < 256; b++) pairs.push([[t, t, t], [b, b, b]]);
  const levels = [0, 51, 102, 153, 204, 255];
  const cube: RGB[] = [];
  for (const r of levels) for (const g of levels) for (const b of levels) cube.push([r, g, b]);
  for (const t of cube) for (const b of cube) pairs.push([t, b]);
  // A fixed linear congruential generator, so the random arm is the same every run.
  let s = 0x2f6e2b1;
  const byte = () => ((s = (Math.imul(s, 1664525) + 1013904223) >>> 0) >>> 24);
  for (let i = 0; i < 20000; i++) pairs.push([[byte(), byte(), byte()], [byte(), byte(), byte()]]);
  return pairs;
}

const PAIRS = grid();

function reference(text: RGB, bg: RGB): number {
  return APCAcontrast(sRGBtoY(text), sRGBtoY(bg)) as number;
}

function disagreements(k: Readonly<ApcaConstants>): number {
  let n = 0;
  for (const [t, b] of PAIRS) if (!Object.is(apcaLc(t, b, k), reference(t, b))) n++;
  return n;
}

describe("the APCA port", () => {
  it(`agrees exactly with apca-w3 on all ${PAIRS.length} pairs, in both polarities`, () => {
    let bow = 0;
    let wob = 0;
    const misses: string[] = [];
    for (const [t, b] of PAIRS) {
      const ours = apcaLc(t, b);
      const theirs = reference(t, b);
      if (!Object.is(ours, theirs)) misses.push(`text ${t} on ${b}: ${ours} vs ${theirs}`);
      if (theirs > 0) bow++;
      if (theirs < 0) wob++;
      if (!Object.is(apcaY(t), sRGBtoY(t))) misses.push(`Y of ${t}`);
    }
    expect(misses.slice(0, 10)).toEqual([]);
    // Both polarities are exercised, so a sign error cannot hide.
    expect(bow).toBeGreaterThan(10000);
    expect(wob).toBeGreaterThan(10000);
  });

  /** Constants whose change no input can show, with the reason. `apca-port.node-check.ts`
   *  compares every constant, these included, with the reference source. */
  const UNOBSERVABLE: Partial<Record<keyof ApcaConstants, string>> = {
    deltaYmin: "below 0.0005 of delta Y the raw contrast is already under loClip, which returns 0",
  };

  it.each((Object.keys(SA98G) as Array<keyof ApcaConstants>).filter((k) => !(k in UNOBSERVABLE)))(
    "catches %s changed by 1%%",
    (key) => {
      const changed = { ...SA98G, [key]: SA98G[key] * 1.01 };
      expect(disagreements(changed)).toBeGreaterThan(0);
    },
  );
});
