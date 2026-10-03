/* APCA (Accessible Perceptual Contrast Algorithm) — perceptual contrast, used as
   the alternative to WCAG 2.x when the system is in APCA contrast mode.

   The math is the apca-w3 package (github.com/Myndex/apca-w3), imported
   unchanged as a development dependency. apca-w3 is Copyright © 2019-2022
   Andrew Somers / Myndex, under its own Limited W3 License, which permits tools
   that check web content against WCAG. This file is only an adapter from the
   system's RGBA shape to that package, and therefore holds none of its code.

   Like the WCAG math and OKLCH hue helpers in _assert.ts, these run only in the
   foundation story tests (offline / verification) — never at component runtime.
   APCA is NOT a legal replacement for WCAG 2.x; it is a more perceptually
   accurate lens. See docs / DECISIONS for the dual-gate decision. */

import { APCAcontrast, sRGBtoY as apcaW3sRGBtoY } from "apca-w3";
import type { RGBA } from "./_assert";

/** Screen luminance Y from sRGB bytes (0-255), by apca-w3's own simple-gamma
    curve — NOT the WCAG piecewise linearisation. */
export function sRGBtoY({ r, g, b }: RGBA): number {
  return apcaW3sRGBtoY([r, g, b]);
}

/** Signed APCA lightness contrast Lc. Positive = dark text on a lighter bg (BoW);
    negative = light text on a darker bg (WoB). Magnitude grows with perceived
    contrast and is perceptually uniform (unlike the WCAG ratio). Asymmetric: the
    two polarities use different exponents, so a flipped pair gives a different
    magnitude, by design. */
export function apcaLc(text: RGBA, bg: RGBA): number {
  // Default `places` (-1) makes apca-w3 return the signed float Lc as a number.
  return APCAcontrast(sRGBtoY(text), sRGBtoY(bg)) as number;
}

/** Perceptual contrast magnitude |Lc| (polarity-independent). */
export function apcaContrast(fg: RGBA, bg: RGBA): number {
  return Math.abs(apcaLc(fg, bg));
}

/* The two candidate on-solid foregrounds the system chooses between. #1c1c1c is
   the crisp near-black settled on for dark-on-fill (beats a tinted brown). */
const WHITE: RGBA = { r: 255, g: 255, b: 255, a: 1 };
const NEAR_BLACK: RGBA = { r: 0x1c, g: 0x1c, b: 0x1c, a: 1 };

/** Which on-solid foreground APCA prefers on `bg` — the one with the higher |Lc|.
    This is where APCA and WCAG can disagree: on a saturated mid-tone fill (e.g.
    orange-9), WCAG's ratio favours dark while APCA — and the eye — favour white. */
export function apcaBestForeground(bg: RGBA): "light" | "dark" {
  return apcaContrast(WHITE, bg) >= apcaContrast(NEAR_BLACK, bg) ? "light" : "dark";
}

/* APCA "bronze" use-levels (Lc). A label on a solid fill owes Lc 60, the large/UI level, beside
   WCAG 4.5:1 ([[text-on-solid-fill-contrast]], ON_FILL in _assert.ts). */
export const APCA_LC = {
  bodyPreferred: 90,
  bodyMin: 75,
  largeUi: 60,
  headline: 45,
  minAnyText: 30,
} as const;
