/* =============================================================================
   apca.ts — APCA LIGHTNESS CONTRAST, PORTED FOR RUNTIME USE
   -----------------------------------------------------------------------------
   This file includes material derived from apca-w3 0.1.9
   (https://github.com/Myndex/apca-w3), src/apca-w3.js, functions `sRGBtoY`
   and `APCAcontrast`, APCA base algorithm 0.0.98G-4g.
   Copyright © 2019-2022 by Andrew Somers and/or Myndex. All Rights Reserved.
   Licensed under the apca-w3 "W3 License for Compliant Code Only" and the
   W3C Software and Document Notice and License, both reproduced in
   THIRD-PARTY-NOTICES, section 8. Licensed for predicting the contrast of web
   content in support of the WCAG accessibility guidelines only.

   Changes from the original: translated from JavaScript to TypeScript, the two
   functions only. The constants and the order of every operation are the
   original's, unchanged, which the licence requires and `apca.logic.test.ts`
   proves by exact agreement with the installed reference package. The
   optional string outputs (`places` >= 0) are not ported: this function always
   returns the signed number the reference returns for its default `places`.
   The constants can be passed in, which exists only so the agreement test can
   show that changing any one of them is caught.

   WHY A PORT AND NOT THE PACKAGE. The reference package is a development
   dependency, used by the test lane (`src/foundations/apca.ts`) to measure.
   The generator and the published assessment need APCA at runtime, and the
   code that picks a colour must not check itself, so the system carries its
   own copy and the guards keep measuring with the reference
   ([[apca-runtime-port]]).

   Pure arithmetic. No DOM, no dependency, no import from the test lane.
   ============================================================================= */

/** The apca-w3 release this calculation follows. */
export const APCA_W3_VERSION = "0.1.9";

/** The APCA base algorithm and constant set this calculation implements. */
export const APCA_ALGORITHM = "0.0.98G-4g";

/** APCA 0.0.98G-4g, W3-compatible constants, as named in the reference. */
export interface ApcaConstants {
  mainTRC: number;
  sRco: number;
  sGco: number;
  sBco: number;
  normBG: number;
  normTXT: number;
  revTXT: number;
  revBG: number;
  blkThrs: number;
  blkClmp: number;
  scaleBoW: number;
  scaleWoB: number;
  loBoWoffset: number;
  loWoBoffset: number;
  deltaYmin: number;
  loClip: number;
}

export const SA98G: Readonly<ApcaConstants> = Object.freeze({
  mainTRC: 2.4,
  sRco: 0.2126729,
  sGco: 0.7151522,
  sBco: 0.072175,
  normBG: 0.56,
  normTXT: 0.57,
  revTXT: 0.62,
  revBG: 0.65,
  blkThrs: 0.022,
  blkClmp: 1.414,
  scaleBoW: 1.14,
  scaleWoB: 1.14,
  loBoWoffset: 0.027,
  loWoBoffset: 0.027,
  deltaYmin: 0.0005,
  loClip: 0.1,
});

/** Screen luminance Y from sRGB bytes (0 to 255), by APCA's simple 2.4 exponent. */
export function apcaY(rgb: readonly [number, number, number], k: Readonly<ApcaConstants> = SA98G): number {
  const simpleExp = (chan: number) => Math.pow(chan / 255.0, k.mainTRC);
  return k.sRco * simpleExp(rgb[0]) + k.sGco * simpleExp(rgb[1]) + k.sBco * simpleExp(rgb[2]);
}

/** Signed APCA lightness contrast Lc of text luminance `txtY` on background luminance `bgY`.
 *  Positive is dark text on a lighter background, negative is light text on a darker one.
 *  The order of the arguments is the polarity: do not swap them. Out-of-range input
 *  returns 0, as the reference does. */
export function apcaLcFromY(txtY: number, bgY: number, k: Readonly<ApcaConstants> = SA98G): number {
  const icp = [0.0, 1.1];
  if (isNaN(txtY) || isNaN(bgY) || Math.min(txtY, bgY) < icp[0]! || Math.max(txtY, bgY) > icp[1]!) {
    return 0.0;
  }

  let SAPC = 0.0;
  let outputContrast = 0.0;

  // Soft clamp near black.
  txtY = txtY > k.blkThrs ? txtY : txtY + Math.pow(k.blkThrs - txtY, k.blkClmp);
  bgY = bgY > k.blkThrs ? bgY : bgY + Math.pow(k.blkThrs - bgY, k.blkClmp);

  // Return 0 early for extremely low delta Y.
  if (Math.abs(bgY - txtY) < k.deltaYmin) return 0.0;

  if (bgY > txtY) {
    // Normal polarity, dark text on a light background.
    SAPC = (Math.pow(bgY, k.normBG) - Math.pow(txtY, k.normTXT)) * k.scaleBoW;
    outputContrast = SAPC < k.loClip ? 0.0 : SAPC - k.loBoWoffset;
  } else {
    // Reverse polarity, light text on a dark background, always negative.
    SAPC = (Math.pow(bgY, k.revBG) - Math.pow(txtY, k.revTXT)) * k.scaleWoB;
    outputContrast = SAPC > -k.loClip ? 0.0 : SAPC + k.loWoBoffset;
  }

  return outputContrast * 100.0;
}

/** Signed APCA Lc of sRGB `text` on sRGB `bg`, both as bytes (0 to 255). */
export function apcaLc(
  text: readonly [number, number, number],
  bg: readonly [number, number, number],
  k: Readonly<ApcaConstants> = SA98G,
): number {
  return apcaLcFromY(apcaY(text, k), apcaY(bg, k), k);
}
