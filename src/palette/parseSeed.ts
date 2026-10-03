/* =============================================================================
   parseSeed.ts — THE ACCEPTED INPUT GRAMMAR, and nothing else
   -----------------------------------------------------------------------------
   Turns a pasted colour value into an sRGB triple, or refuses it with a reason.

   THE GRAMMAR (stated once here; the plan, the docs and the acceptance test all
   quote THIS list):
       #rgb  #rrggbb
       rgb(...)  rgba(...)   — three channels only
       hsl(...)  hsla(...)   — three components only
       oklch(...)            — accepted ONLY when the value resolves inside sRGB
   Everything else is refused, naming these forms.

   A SEED CARRIES NO ALPHA CHANNEL — ruled 2026-08-05. A brand scale
   generates its OWN alpha ramp (a1-a12) by compositing the solid over white and
   black, so an alpha on the seed has nothing to mean. The refusal is on the
   SYNTAX, not the value: `#rrggbbaa` is refused even when the alpha is `ff`,
   because "a seed has no alpha channel" is a rule a consumer can act on, whereas
   "a seed's alpha must be opaque" invites them to compute one.

   The earlier design accepted alpha and reported it as ignored. It was withdrawn
   for a concrete reason: this system's own tokens are 8-digit hex —
   `--oxblood-a1: #db290507` is a 3% wash — so the value most likely to be pasted
   by mistake is exactly the one that would have generated a bright red brand from
   a barely-visible tint.

   WHY ONE ARITHMETIC PARSER AND NOT A BROWSER LANE + A NODE LANE
   --------------------------------------------------------------
   The plan proposed using the canvas 2D context as the browser-side parser ("it
   IS a conforming CSS colour parser, and the repo already uses the trick"), with
   an explicit parser only for Node. Measured in the same headless Chrome the
   suite runs (2026-08-04), that is wrong three ways:

     1. `ctx.fillStyle = "oklch(0.7 0.3 150)"` rasterises to [0, 203, 0] — Chrome
        SILENTLY GAMUT-CLAMPS. The out-of-gamut seed we are required to refuse is
        exactly the one the canvas destroys the evidence for.
     2. `#ff6b5eaa` rasterises to [255, 106, 94] where `#ff6b5e` gives
        [255, 107, 94]. Reading back an alpha colour composites it and CORRUPTS
        the RGB — so the one format the report named first is the one the canvas
        cannot round-trip.
     3. `transparent`, `rebeccapurple`, `lab(...)` and `color(display-p3 ...)` all
        parse happily, so parse-success can never be the gate. The grammar match
        has to run first regardless.

   With the canvas providing neither validation nor accurate extraction, a second
   lane buys nothing and costs a cross-lane agreement tolerance the system does
   not specify. One implementation, both environments, no DOM.

   (This does NOT reopen the `_assert.ts` duplication argument in `oklch.ts`. That
   one is producer-vs-verifier. This is one producer-side parser used by both the
   CLI and the runtime — the same code doing the same job in two places.)
   ============================================================================= */
import { type RGB, type LCH, inSrgbGamut, oklchToOklab, oklabToSrgb } from "./oklch";

export type ParseOk = {
  ok: true;
  rgb: RGB;
};
export type ParseErr = { ok: false; reason: string };
export type ParseResult = ParseOk | ParseErr;

const ACCEPTED = "#rgb, #rrggbb, rgb(), hsl(), or an in-gamut oklch()";

/** The reason an alpha channel is refused rather than ignored. Ruled
 *  2026-08-05: **a brand seed is a solid colour.** */
const NO_ALPHA =
  "a brand seed must be a solid colour — a brand scale generates its own alpha " +
  "ramp (a1–a12), so an alpha channel on the seed has no meaning. Paste the " +
  "opaque value.";

const refuse = (reason: string): ParseErr => ({ ok: false, reason });

/* --- number helpers -------------------------------------------------------- */

/** A CSS <number> or <percentage> resolved against `full`. Returns null on junk.
 *  A BARE NUMBER IS RETURNED AS-IS — correct for rgb() (0-255) and oklch()
 *  (L is 0-1, C is 0-0.4). It is WRONG for hsl()'s saturation and lightness:
 *  see `percentageSlot` below. */
function scalar(tok: string, full: number): number | null {
  const t = tok.trim();
  if (!t) return null;
  const pct = t.endsWith("%");
  const digits = pct ? t.slice(0, -1).trim() : t;
  // `Number("")` is 0, so a lone "%" would parse as zero rather than as junk.
  if (!digits) return null;
  const n = Number(digits);
  if (!Number.isFinite(n)) return null;
  return pct ? (n / 100) * full : n;
}

/** A slot where CSS Color 4 says a bare <number> MEANS a percentage — hsl()'s
 *  saturation and lightness. `hsl(0 100 50)` is legal and is pure red.
 *
 *  This existed as `scalar(tok, 1)` and was a live wrong-colour bug: a bare `100`
 *  came back as 100, clamped to 1.0, so `hsl(0 100 50)` returned WHITE where
 *  Chrome returns [255,0,0], and `hsl(210 50 40)` returned white where Chrome
 *  returns [51,102,153]. Accepted, no refusal, no flag — exactly the failure this
 *  file's header says it exists to prevent. It survived the Chrome cross-check
 *  because every hsl row in that table used the percentage form, so the bare-number
 *  branch was never sampled. Both forms are pinned now. */
function percentageSlot(tok: string): number | null {
  const t = tok.trim();
  if (!t) return null;
  const digits = t.endsWith("%") ? t.slice(0, -1).trim() : t;
  if (!digits) return null; // a lone "%" — `Number("")` is 0, not junk
  const n = Number(digits);
  if (!Number.isFinite(n)) return null;
  return n / 100;
}

/** A CSS <angle>: bare number (degrees), or deg / rad / grad / turn.
 *  Shared by hsl() and oklch() so the two cannot drift — `hsl(0.5turn 100 50)`
 *  and `hsl(180 100 50)` are the same colour and must parse the same way. */
function hueDegrees(tok: string): number | null {
  const t = tok.trim();
  if (!t) return null;
  const m = /^([+-]?(?:\d+\.?\d*|\.\d+)(?:e[+-]?\d+)?)(deg|rad|grad|turn)?$/i.exec(t);
  if (!m) return null;
  const n = Number(m[1]);
  if (!Number.isFinite(n)) return null;
  switch ((m[2] ?? "deg").toLowerCase()) {
    case "rad": return (n * 180) / Math.PI;
    case "grad": return n * 0.9;
    case "turn": return n * 360;
    default: return n;
  }
}

const clampByte = (n: number) => Math.max(0, Math.min(255, Math.round(n)));

/** Split `fn(a b c / d)` (modern) or `fn(a, b, c, d)` (legacy) into tokens.
 *
 *  CSS does NOT permit mixing the two, and a fourth SPACE-separated channel with
 *  no slash is invalid — `rgb(255 107 94 0.5)` is rejected by Chrome (measured).
 *  An earlier version split on `/[\s,]+/` and accepted both, which made the
 *  grammar comment claim a list the code did not hold to. Returns null on a form
 *  CSS would reject, so the caller refuses rather than guessing. */
function args(body: string): { parts: string[]; alpha: string | null } | null {
  const slash = body.split("/");
  if (slash.length > 2) return null;
  const head = slash[0]!.trim();
  const alpha = slash.length === 2 ? slash[1]!.trim() : null;
  if (slash.length === 2 && !alpha) return null; // "a b c /" with nothing after
  if (!head) return null;

  const commaForm = head.includes(",");
  const spaceForm = /\s/.test(head);
  if (commaForm && spaceForm && !/,\s/.test(head.replace(/\s*,\s*/g, ", "))) return null;

  if (commaForm) {
    // Legacy: commas only. Whitespace around them is fine; between them is not.
    const parts = head.split(",").map((p) => p.trim());
    if (parts.some((p) => !p || /\s/.test(p))) return null;
    if (parts.length === 4) {
      if (alpha !== null) return null; // both a 4th channel and a slash alpha
      return { parts: parts.slice(0, 3), alpha: parts[3]! };
    }
    return { parts, alpha };
  }

  // Modern: whitespace only, alpha exclusively behind the slash.
  const parts = head.split(/\s+/).filter(Boolean);
  if (parts.length === 4) return null; // `rgb(255 107 94 0.5)` — invalid CSS
  return { parts, alpha };
}

/** An alpha channel is not part of the seed grammar at all — its mere PRESENCE is
 *  a refusal, whatever its value. See NO_ALPHA. */
const hasAlpha = (tok: string | null) => tok !== null;

/* --- the grammar ----------------------------------------------------------- */

const HEX = /^#([0-9a-f]{3,8})$/i;

function parseHex(input: string): ParseResult | null {
  const m = HEX.exec(input);
  if (!m) return null;
  const h = m[1];
  // 4- and 8-digit hex carry an alpha channel, so they are refused OUTRIGHT —
  // including #rrggbbff. The rule is "a seed has no alpha channel", not "a seed's
  // alpha must be opaque"; one is a property of the value, the other of the
  // syntax, and only the second gives a message a consumer can act on.
  if (h.length === 4 || h.length === 8) return refuse(NO_ALPHA);
  if (h.length !== 3 && h.length !== 6) {
    return refuse(`"${input}" is not a valid hex colour — use ${ACCEPTED}`);
  }
  const short = h.length === 3;
  const pick = (i: number) =>
    short ? parseInt(h[i] + h[i], 16) : parseInt(h.slice(i * 2, i * 2 + 2), 16);
  return { ok: true, rgb: { r: pick(0), g: pick(1), b: pick(2) } };
}

function parseRgb(body: string): ParseResult {
  const a = args(body);
  if (!a) return refuse(`rgb() has a malformed argument list — use ${ACCEPTED}`);
  const { parts, alpha } = a;
  if (parts.length !== 3) return refuse(`rgb() needs three channels — use ${ACCEPTED}`);
  if (hasAlpha(alpha)) return refuse(NO_ALPHA);
  const ch = parts.map((p) => scalar(p, 255));
  if (ch.some((v) => v === null)) return refuse(`rgb() has a non-numeric channel — use ${ACCEPTED}`);
  return {
    ok: true,
    rgb: { r: clampByte(ch[0]!), g: clampByte(ch[1]!), b: clampByte(ch[2]!) },
  };
}

function parseHsl(body: string): ParseResult {
  const a = args(body);
  if (!a) return refuse(`hsl() has a malformed argument list — use ${ACCEPTED}`);
  const { parts, alpha } = a;
  if (parts.length !== 3) return refuse(`hsl() needs hue, saturation, lightness — use ${ACCEPTED}`);
  if (hasAlpha(alpha)) return refuse(NO_ALPHA);
  const h = hueDegrees(parts[0]!);
  const s = percentageSlot(parts[1]!);
  const l = percentageSlot(parts[2]!);
  if (h === null || s === null || l === null) {
    return refuse(`hsl() has a non-numeric component — use ${ACCEPTED}`);
  }

  const sc = Math.max(0, Math.min(1, s));
  const lc = Math.max(0, Math.min(1, l));
  const c = (1 - Math.abs(2 * lc - 1)) * sc;
  const hp = (((h % 360) + 360) % 360) / 60;
  const x = c * (1 - Math.abs((hp % 2) - 1));
  const [r1, g1, b1] =
    hp < 1 ? [c, x, 0] : hp < 2 ? [x, c, 0] : hp < 3 ? [0, c, x]
    : hp < 4 ? [0, x, c] : hp < 5 ? [x, 0, c] : [c, 0, x];
  const m = lc - c / 2;
  return {
    ok: true,
    rgb: { r: clampByte((r1 + m) * 255), g: clampByte((g1 + m) * 255), b: clampByte((b1 + m) * 255) },
  };
}

function parseOklch(body: string): ParseResult {
  const a = args(body);
  if (!a) return refuse(`oklch() has a malformed argument list — use ${ACCEPTED}`);
  const { parts, alpha } = a;
  if (parts.length !== 3) return refuse(`oklch() needs lightness, chroma, hue — use ${ACCEPTED}`);
  const L = scalar(parts[0]!, 1);
  const C = scalar(parts[1]!, 0.4); // CSS: 100% of the chroma reference is 0.4
  if (hasAlpha(alpha)) return refuse(NO_ALPHA);
  const h = hueDegrees(parts[2]!);
  if (L === null || C === null || h === null) {
    return refuse(`oklch() has a non-numeric component — use ${ACCEPTED}`);
  }

  const lch: LCH = { L, C, h };
  // The in-gamut test is ARITHMETIC, not delegated to the browser: measured, Chrome
  // rasterises an out-of-gamut oklch() to a clamped pixel with no signal that it did.
  if (!inSrgbGamut(oklchToOklab(lch))) {
    // `oklch.ts` DOES ship a gamut-mapping method (`gamutClamp`), and that is not a
    // contradiction: a SEED is what the consumer typed and must not move, so it is
    // refused; a GENERATED RAMP STEP is the system's own output and has to land
    // somewhere renderable, so it is clamped. Same policy, two different things.
    return refuse(
      `oklch(${L} ${C} ${h}) is outside sRGB. The system does not yet specify a gamut-mapping ` +
      `method, so mapping it here would silently ship a different colour than you pasted. ` +
      `Use an in-gamut value.`,
    );
  }
  return { ok: true, rgb: oklabToSrgb(oklchToOklab(lch)) };
}

/* --- the entry point ------------------------------------------------------- */

/**
 * Parse a pasted brand seed.
 *
 * Refuses anything outside the grammar above — INCLUDING values that are perfectly
 * valid CSS. `transparent`, `rebeccapurple`, `lab()`, `color(display-p3 ...)` and
 * `currentColor` all parse in a browser; they are refused here because a
 * context-dependent keyword has no fixed value, and a wide-gamut syntax would be
 * silently mapped into sRGB by an unruled method. That is why the grammar match is
 * the gate and "did it parse?" never is.
 */
/** Pure white and pure black carry no hue and no chroma, so there is no ramp to
 *  build around them — every one of the twelve steps would be the same neutral.
 *  Refused at the door rather than allowed to produce a degenerate scale. */
function refuseIfColourless(rgb: RGB): ParseErr | null {
  const white = rgb.r === 255 && rgb.g === 255 && rgb.b === 255;
  const black = rgb.r === 0 && rgb.g === 0 && rgb.b === 0;
  if (!white && !black) return null;
  return refuse(
    `${white ? "White" : "Black"} has no hue to build a scale from — every step would be the same ` +
    `neutral. Paste a colour with some saturation; the system's own greys are already available ` +
    `through the neutral scale.`,
  );
}

export function parseSeed(input: unknown): ParseResult {
  const result = parseSeedInner(input);
  if (!result.ok) return result;
  return refuseIfColourless(result.rgb) ?? result;
}

function parseSeedInner(input: unknown): ParseResult {
  if (typeof input !== "string") return refuse(`a brand seed must be a string — use ${ACCEPTED}`);
  const v = input.trim().toLowerCase();
  if (!v) return refuse(`empty seed — use ${ACCEPTED}`);

  if (v.startsWith("#")) return parseHex(v) ?? refuse(`"${input}" is not a valid hex colour — use ${ACCEPTED}`);

  const fn = /^([a-z]+)\((.*)\)$/s.exec(v);
  if (fn) {
    const [, name, body] = fn;
    switch (name) {
      case "rgb":
      case "rgba":
        return parseRgb(body!);
      case "hsl":
      case "hsla":
        return parseHsl(body!);
      case "oklch":
        return parseOklch(body!);
      default:
        return refuse(`${name}() is not an accepted seed syntax — use ${ACCEPTED}`);
    }
  }

  return refuse(`"${input}" is not an accepted seed syntax — use ${ACCEPTED}`);
}
