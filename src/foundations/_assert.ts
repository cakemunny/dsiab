/* Shared assertion helpers for the foundation stories' browser tests.
   These run in a real browser (Vitest browser mode) so getComputedStyle can
   resolve --ds-* against a live .radix-themes element. */

import { ambientStepOf, expectedBox, BOX_EQ_TOLERANCE_PX, ROW_LADDER_PX } from "./boxLaw";
import { APCA_LC, apcaContrast } from "./apca";

export interface RGBA {
  r: number;
  g: number;
  b: number;
  a: number;
}

/** Nearest .radix-themes ancestor/self of the rendered story canvas. */
export function themeRoot(from: Element = document.body): HTMLElement {
  const el = from.closest(".radix-themes") ?? document.querySelector(".radix-themes");
  if (!el) throw new Error("No .radix-themes element found in the story DOM");
  return el as HTMLElement;
}

/** Resolve a CSS custom property to its computed string value. */
export function resolve(el: Element, varName: string): string {
  return getComputedStyle(el).getPropertyValue(varName).trim();
}

/** Throw listing any role that resolves to an empty string (unmapped / drift). */
export function assertNoEmpty(el: Element, names: string[]): void {
  const empty = names.filter((n) => resolve(el, n) === "");
  if (empty.length) {
    throw new Error(`Unmapped --ds-* roles (resolved to ""): ${empty.join(", ")}`);
  }
}

/* ---------------------------------------------------------------------------------------------- */
/* THE OPEN-STATE ROW BOX                                                                           */
/* ---------------------------------------------------------------------------------------------- */

/** THE GUARD `_control-box.stories.tsx` PROMISES. That fixture mounts REST state only, so it excludes
 *  "anything that only exists inside an opened portal (a Select's menu row, a Typeahead option, the
 *  PowerSearch edit popover)" and says the open-state geometry "is guarded on each component's own
 *  behavior suite". This is that guard. Before it existed the sentence was a claim with nothing behind
 *  it: `boxLaw`'s `CONTROL_ROOT_KINDS` names control ROOTS, and a menu option row is not one, so a
 *  portal-only row was measured by neither runner.
 *
 *  ONE LADDER, NOT A SECOND COPY. The expectation comes from `expectedBox()` and `ROW_LADDER_PX` in
 *  `boxLaw.ts` — the same table the per-story `afterEach` and the deep census read. Nothing here
 *  retypes 24 / 32 / 40, and the `max(step × --scaling, 24)` floor arrives with the function.
 *
 *  AMBIENT, NOT FORCED. The step comes from the tier the play is actually running at (`globals.uiSize`)
 *  and `--scaling` is read off the rendered row, so the probe never sets the condition it measures.
 *  The rows portal to `<body>`, hence a `document` default rather than the story canvas.
 *
 *  @param selector  the option row's own class, e.g. `.rt-ds-cmdk-option`
 *  @param uiSize    the run's ambient tier — pass `globals.uiSize` from the play context
 *  @returns the step asserted, the expected box, and every measured height (for a caller's own log) */
export function assertMenuOptionBox(opts: {
  selector: string;
  uiSize: string | undefined;
  root?: ParentNode;
  /** Names the component in the failure message. */
  label: string;
  /** Guards against asserting on an empty set — a panel that failed to open would otherwise pass. */
  minRows?: number;
}): { step: number; expected: number; measured: number[] } {
  const { selector, uiSize, root = document, label, minRows = 1 } = opts;
  const rows = [...root.querySelectorAll<HTMLElement>(selector)].filter(
    (el) => el.getClientRects().length > 0 && el.getBoundingClientRect().height > 0,
  );
  if (rows.length < minRows) {
    throw new Error(
      `${label}: the open-state box guard found ${rows.length} visible \`${selector}\` row(s), expected at least ` +
        `${minRows}. An assertion over an empty set is a green that means nothing — open the panel first.`,
    );
  }

  const step = ambientStepOf(uiSize);
  const scalingOf = (el: Element): number => {
    const v = parseFloat(getComputedStyle(el).getPropertyValue("--scaling"));
    return Number.isFinite(v) && v > 0 ? v : 1;
  };

  const measured: number[] = [];
  const bad: string[] = [];
  for (const el of rows) {
    // Border-box height: `getBoundingClientRect` is what the box law measures everywhere else, and it
    // is what a pointer target actually is. `getComputedStyle().height` would report the content box
    // under a `content-box` sizing and quietly agree with a wrong rule.
    const h = Math.round(el.getBoundingClientRect().height * 100) / 100;
    measured.push(h);
    const expect = expectedBox(step, scalingOf(el));
    if (Math.abs(h - expect) >= BOX_EQ_TOLERANCE_PX) {
      const cs = getComputedStyle(el);
      bad.push(
        `      "${(el.textContent || "").trim().slice(0, 32)}" — measured ${h}px, expected ${expect}px ` +
          `[box-sizing: ${cs.boxSizing}, min-height: ${cs.minHeight}, padding-block: ${cs.paddingTop}/${cs.paddingBottom}]`,
      );
    }
  }

  const expected = expectedBox(step, scalingOf(rows[0]));
  if (bad.length) {
    throw new Error(
      `${label}: THE BOX LAW did not hold on the OPEN panel's option rows at uiSize:${uiSize ?? "small"}.\n` +
        `A size step names ONE box — ${[1, 2, 3].map((s) => ROW_LADDER_PX[s]).join(" / ")}px at steps 1 / 2 / 3, ` +
        `expected = max(step × --scaling, 24). Step ${step} → ${expected}px.\n` +
        `${bad.length} of ${rows.length} \`${selector}\` row(s) off:\n${bad.join("\n")}`,
    );
  }
  return { step, expected, measured };
}

let _swatchCtx: CanvasRenderingContext2D | null = null;

/** Parse any computed colour string into sRGB RGBA by rasterising on an sRGB 2d canvas.
    Rasterising (rather than regex-parsing rgb()) means a wide-gamut display — where
    getComputedStyle returns `color(display-p3 …)` — yields the sRGB bytes WCAG math
    expects, identical to a non-P3 context, instead of throwing. getImageData on a 2d
    canvas is sRGB and non-premultiplied (straight alpha), which is what flatten() wants.
    Accepts rgb()/rgba()/hsl()/color(display-p3 …)/named — anything fillStyle takes. */
export function parseColor(input: string): RGBA {
  if (!_swatchCtx) {
    const canvas = document.createElement("canvas");
    canvas.width = 1;
    canvas.height = 1;
    _swatchCtx = canvas.getContext("2d", { willReadFrequently: true });
    if (!_swatchCtx) throw new Error("2d canvas context unavailable for colour parsing");
  }
  const ctx = _swatchCtx;
  ctx.clearRect(0, 0, 1, 1);
  ctx.fillStyle = "#000"; // reset, so invalid input stays #000 rather than reusing the last
  ctx.fillStyle = input;
  ctx.fillRect(0, 0, 1, 1);
  const [r, g, b, a] = ctx.getImageData(0, 0, 1, 1).data;
  return { r, g, b, a: a / 255 };
}

/** Resolve a CSS var to a colour, as it computes on `el`. */
export function resolveColor(el: Element, varName: string): RGBA {
  const probe = document.createElement("span");
  probe.style.color = `var(${varName})`;
  el.appendChild(probe);
  const c = getComputedStyle(probe).color;
  probe.remove();
  return parseColor(c);
}

/** Composite a (possibly translucent) foreground over an opaque backdrop. */
export function flatten(fg: RGBA, bg: RGBA): RGBA {
  const a = fg.a;
  return {
    r: fg.r * a + bg.r * (1 - a),
    g: fg.g * a + bg.g * (1 - a),
    b: fg.b * a + bg.b * (1 - a),
    a: 1,
  };
}

function channel(c: number): number {
  const s = c / 255;
  return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
}

export function luminance({ r, g, b }: RGBA): number {
  return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
}

/** WCAG contrast ratio of foreground over background (alpha flattened). */
export function contrastRatio(fg: RGBA, bg: RGBA): number {
  const f = flatten(fg, bg);
  const L1 = luminance(f);
  const L2 = luminance(bg);
  const [hi, lo] = L1 >= L2 ? [L1, L2] : [L2, L1];
  return (hi + 0.05) / (lo + 0.05);
}

/** Assert a fg/bg token pairing meets a minimum ratio on `el`, and a minimum APCA |Lc| as well
 *  when the pairing carries one. `minLc` defaults to the floor ON_FILL registers for the pair, so
 *  text on a solid fill is held to both ([[text-on-solid-fill-contrast]]) wherever it is asserted. A `bg` that ON_FILL
 *  registers as an overlay is measured where it paints, composited over the fill it layers on,
 *  so a hover is judged on the colour the eye sees and never on a bare veil, and the overlay
 *  must raise the label's contrast over that fill, never lower it. Returns the ratio. */
export function assertPairing(
  el: Element, fgVar: string, bgVar: string, min: number,
  minLc: number | undefined = PAIRING_MIN_LC[`${fgVar}|${bgVar}`],
): number {
  const fg = resolveColor(el, fgVar);
  const under = PAIRING_LAYERED_ON[`${fgVar}|${bgVar}`];
  const base = under ? resolveColor(el, under) : undefined;
  const bg = base ? flatten(resolveColor(el, bgVar), base) : resolveColor(el, bgVar);
  const bgName = under ? `${bgVar} over ${under}` : bgVar;
  const rgb = (c: RGBA) => `rgba(${c.r.toFixed(0)},${c.g.toFixed(0)},${c.b.toFixed(0)},${c.a})`;
  // A veil measured alone reads as its opaque colour, which is how a failing hover would pass.
  if (bg.a < 1) {
    throw new Error(
      `${bgName} is translucent [bg=${rgb(bg)}], so its contrast depends on the fill beneath it. ` +
        `Register that fill as the pairing's layeredOn ([[text-on-solid-fill-contrast]])`,
    );
  }
  const ratio = contrastRatio(fg, bg);
  if (ratio < min) {
    throw new Error(
      `Contrast ${fgVar} on ${bgName} = ${ratio.toFixed(2)}:1, below ${min}:1` +
        ` [fg=${rgb(fg)} bg=${rgb(bg)}]`,
    );
  }
  if (minLc !== undefined) {
    const lc = apcaContrast(flatten(fg, bg), bg);
    if (lc < minLc) {
      throw new Error(
        `APCA ${fgVar} on ${bgName} = Lc ${lc.toFixed(1)}, below Lc ${minLc} ([[text-on-solid-fill-contrast]])` +
          ` [fg=${rgb(fg)} bg=${rgb(bg)}]`,
      );
    }
  }
  // The overlay's polarity follows the ink. Both polarities can clear the floors on a light fill,
  // so only this arm catches a black veil darkening a fill toward its dark label.
  if (base && ratio < contrastRatio(fg, base)) {
    throw new Error(
      `${bgVar} lowers ${fgVar} on ${under} from ${contrastRatio(fg, base).toFixed(2)} to ${ratio.toFixed(2)}:1. ` +
        `The hover overlay must follow the ink, black under a white label and white under a dark one ([[text-on-solid-fill-contrast]])`,
    );
  }
  return ratio;
}

/* ===========================================================================
   TOKEN-ROW SHAPE — the runtime half of the [[token-row-shape]] guard
   ---------------------------------------------------------------------------
   `token-rows.node-check.ts` reads the SOURCE and can prove a row names a token.
   It cannot prove the name is TRUE — that the token in the link-coloured column
   is the one actually painting the swatch — because that only exists once the
   theme has resolved in a real DOM. That gap is where a doc-lie hides: a row can
   name an overlay token beside a surface painted by a different one and pass
   every static check, every type check and axe.

   So this is the browser-side complement, called from a `play`. For every
   `[data-token-row="colour"]` in the given subtree it asserts:

     (a) the row NAMES a token — a `--custom-property` (or one of the literal
         paints a vendor hardcodes, LITERAL_PAINTS, where there is no token to
         name and saying so is the honest answer);
     (b) the NAME comes before the VALUE in reading order — the token is the
         row's subject, the hex is the footnote proving it resolved ([[token-row-shape]]);
     (c) the value is painted in the MUTED ink (`--ds-text-weak`), not the
         emphasised link ink (`--ds-text-link`) the token name owns. This is the
         defect that started the cleanup: a hex wearing the token's emphasis.

   It measures the row AS RENDERED and sets nothing — no forced colours, no
   injected markup — so it cannot pass by having supplied its own answer.
   =========================================================================== */

/** Colours a vendor hardcodes as a keyword, where there is no token to name
 *  (Radix's slider thumb face is literally `background-color: white`). */
export const LITERAL_PAINTS = ["white", "black", "transparent", "currentcolor"];

/** The deepest element whose own text starts the first `#rrggbb` run in `row`. */
function hexBearer(row: Element): { el: Element; index: number } | null {
  const walker = document.createTreeWalker(row, NodeFilter.SHOW_TEXT);
  let offset = 0;
  for (let n = walker.nextNode(); n; n = walker.nextNode()) {
    const text = n.nodeValue ?? "";
    const m = text.match(/#[0-9a-f]{3,8}\b/i);
    if (m && n.parentElement) return { el: n.parentElement, index: offset + m.index! };
    offset += text.length;
  }
  return null;
}

/** Assert the [[token-row-shape]] row shape across every colour row under `root`. Returns the
 *  number of rows checked — assert it against what the story renders, so a
 *  selector that silently matches nothing can't read as a pass. */
export function assertTokenRowShape(root: Element): number {
  const rows = Array.from(root.querySelectorAll('[data-token-row="colour"]'));
  const same = (a: RGBA, b: RGBA) =>
    Math.abs(a.r - b.r) <= 2 && Math.abs(a.g - b.g) <= 2 && Math.abs(a.b - b.b) <= 2;

  rows.forEach((row, i) => {
    // Resolve the reference inks against the ROW, not the caller's element: a story's
    // `canvasElement` can sit OUTSIDE `.radix-themes` (where `--ds-*` resolves to
    // nothing and the probe reads the inherited colour instead), and a specimen may
    // sit under a nested <Theme>. The row is always inside whichever theme paints it.
    const weak = resolveColor(row, "--ds-text-weak");
    const link = resolveColor(row, "--ds-text-link");
    const text = (row.textContent ?? "").trim();
    const where = `token row ${i + 1}/${rows.length} ("${text.slice(0, 70)}")`;

    // (a) the row names its token.
    const tokenAt = text.search(/--[a-z][\w-]*/i);
    const literalAt = LITERAL_PAINTS.map((k) => text.toLowerCase().indexOf(k)).filter((n) => n >= 0);
    const nameAt = tokenAt >= 0 ? tokenAt : literalAt.length ? Math.min(...literalAt) : -1;
    if (nameAt < 0) {
      throw new Error(`${where}: shows a swatch but names no token — a colour with no source documents nothing ([[token-row-shape]])`);
    }

    // (b) the name precedes the value.
    const hex = hexBearer(row);
    if (hex && nameAt > hex.index) {
      throw new Error(`${where}: the resolved value comes BEFORE the token name — the name is the subject, the value the footnote ([[token-row-shape]])`);
    }

    // (c) the value carries the muted ink, not the token's link ink.
    if (hex) {
      const ink = parseColor(getComputedStyle(hex.el).color);
      if (same(ink, link) && !same(weak, link)) {
        throw new Error(`${where}: the resolved value is painted --ds-text-link — that emphasis belongs to the token name; the value is --ds-text-weak ([[token-row-shape]])`);
      }
      if (!same(ink, weak)) {
        const s = (c: RGBA) => `rgb(${c.r.toFixed(0)},${c.g.toFixed(0)},${c.b.toFixed(0)})`;
        throw new Error(`${where}: the resolved value is ${s(ink)}, expected --ds-text-weak ${s(weak)} ([[token-row-shape]])`);
      }
    }
  });
  return rows.length;
}

/* ===========================================================================
   MEASURED TOKEN ROWS — the runtime half of the [[measured-token-rows]] guard
   ---------------------------------------------------------------------------
   The static guard (`token-rows.node-check.ts`) can prove a row is a
   `MeasuredRow` and hands in no value. It cannot prove the row actually
   MEASURED something: whether `select` found a real rendered node, whether
   that node is a component or a probe the story painted, and — the specific
   defect this rule exists to kill — whether the value and the claim came off
   the SAME element, which is how a row ends up agreeing with itself.

   `MeasuredRow` attaches its evidence to the row node (`getRowEvidence`), so
   this reads what the row actually did rather than what it rendered:

     (a) the row measured at all — evidence present;
     (b) `measuredNode` was a real element IN THE DOCUMENT WHEN IT WAS READ.
         Not "is in the document now": a modal panel is mounted, measured and
         unmounted again, because leaving one mounted takes the page with it
         (scroll lock + aria-hidden on every sibling). The row stamps
         `connectedAtRead` from `isConnected` at the instant of the read, and
         that is what is checked — so a node that was never in the document is
         still rejected, and an honestly-torn-down one is not;
     (c) `measuredNode` is not the kit's own probe, and carries NO inline
         style for the property read — if the story painted it, the row is
         reading the story back, not the component;
     (d) `probeNode !== measuredNode` — the claim was resolved somewhere the
         measurement did not come from. THE circular-row check;
     (e) the measured value matches the claimed token. A row that renders
         "differs" to the reader also fails the suite.

   Rows that could not be measured (`[data-token-row="unproven"]`) are checked
   for the opposite property: they must carry a reason and must NOT carry a
   resolved value. An honest limit is allowed; a quiet resolution is not.

   It sets nothing it then reads back — it only inspects what the row recorded.
   =========================================================================== */

/** Mirrors `RowEvidence` in `_storyKit.tsx`. Declared locally so the browser-test helpers stay
 *  free of a story-kit import (and so a shape drift shows up here as a type error). */
export interface MeasuredEvidence {
  token: string;
  prop: string;
  select: string;
  pseudo?: string;
  state?: string;
  measuredNode: Element | null;
  /** Was `measuredNode` in the document when the row read it? Stamped by the kit at read time. */
  connectedAtRead: boolean;
  probeNode: Element | null;
  source: string;
  measured: string;
  expected: string;
  bound: boolean;
  reason: string;
  /** `"value"` compared the whole property; `"shadow-colour"` compared a colour token that sits
   *  INSIDE a `box-shadow` (an inset hairline), which proves the colour and not the geometry. */
  compared?: "value" | "shadow-colour";
  /** The shadow minus its colour, recorded by a `shadow-colour` row. */
  geometry?: string;
}

/** Properties a row is allowed to have read; mirrors the kit's colour test. */
const INLINE_SHORTHANDS: Record<string, string[]> = {
  "background-color": ["background"],
  "outline-color": ["outline"],
  "border-top-color": ["border-top", "border-color", "border"],
  "border-bottom-color": ["border-bottom", "border-color", "border"],
  "border-left-color": ["border-left", "border-color", "border"],
  "border-right-color": ["border-right", "border-color", "border"],
};

function evidenceOf(row: Element): MeasuredEvidence | undefined {
  return (row as Element & { __dsRowEvidence?: MeasuredEvidence }).__dsRowEvidence;
}

/** Assert every measured token row under `root` proved what it claims. Returns the counts, so a
 *  play can assert them against what the story renders — a selector that silently matches nothing
 *  must never read as a pass. */
const ROW_SELECTOR = '[data-token-row="measured"], [data-token-row="unproven"]';

/** Wait until every measured row under `root` has recorded its evidence, then assert.
 *
 *  A row reads in a layout effect and RE-reads on a later frame when what it needs arrived late — a
 *  portaled panel that mounts a frame behind, a part the component builds asynchronously, a `var()`
 *  a frame short of substituting. A `play` that calls the synchronous form the instant the story
 *  renders can therefore land between the two, and fail with "recorded no evidence" on timing alone.
 *  That is a flaky gate, which is its own kind of untrustworthy: it teaches the reader that red does
 *  not mean broken. So the waiting lives here, once, rather than as a poll copied into each play.
 *
 *  It also waits for any MOUNT · MEASURE · UNMOUNT cycle on the page to finish (`MeasuredSpec
 *  transient`, which hosts a modal surface for the few frames of the read). Until that closes the
 *  document is scroll-locked and half aria-hidden by Radix, so a `play` that asserted scrolling,
 *  focus or "nothing is portaled" before it would be asserting against a page mid-measurement.
 *
 *  It waits for evidence to EXIST; it never waits for evidence to be good. Every assertion below is
 *  unchanged, and a row that records a false claim fails exactly as fast as it did before. */
const CYCLE_SELECTOR = '[data-measure-cycle="arming"], [data-measure-cycle="reading"]';

export async function awaitMeasuredRows(
  root: Element,
  { timeout = 6000, rows: expected }: { timeout?: number; rows?: number } = {},
): Promise<{ measured: number; unproven: number }> {
  const deadline = Date.now() + timeout;
  let frames = 0;
  for (;;) {
    const rows = Array.from(root.querySelectorAll(ROW_SELECTOR));
    const pending = rows.filter((r) => !evidenceOf(r));
    const cycling = root.querySelectorAll(CYCLE_SELECTOR).length;
    /* WAIT FOR THE TABLE TO EXIST, not just for the rows that happen to be there yet. A table can be
     * gated on something asynchronous (a Toast the engine has not spawned, a ScrollArea thumb that
     * takes seven frames), and at the instant the story renders it has NO rows at all — so a check
     * that only asks "does every row I can see have evidence?" is trivially satisfied by an empty
     * table and returns 0/0. `rows` names how many the story declares and is the exact form; without
     * it the floor is one, because every caller here is asserting on a table it expects to exist. */
    const short = expected === undefined ? rows.length === 0 : rows.length !== expected;
    if (!short && !pending.length && !cycling) break;
    /* WAITING IS BOUNDED, AND SAYS WHAT IT WAITED FOR. A helper that waits forever for a row that will
     * never arrive is worse than the synchronous form it replaced: the suite hangs instead of failing,
     * and nobody learns which row is broken. So the deadline names the rows still silent. */
    if (Date.now() > deadline) {
      const named = pending
        .slice(0, 4)
        .map((r) => `“${(r.textContent ?? "").trim().slice(0, 50)}”`)
        .join(", ");
      if (cycling) {
        throw new Error(
          `${cycling} measurement host(s) were still mounted after ${timeout}ms / ${frames} frames — the ` +
          `mount · measure · unmount cycle never closed, so the page is still scroll-locked ([[measured-token-rows]])`,
        );
      }
      if (short) {
        throw new Error(
          `waited ${timeout}ms / ${frames} frames and the token table still has ${rows.length} row(s)` +
          `${expected === undefined ? " — none at all, so there was nothing to prove" : `, not the ${expected} this story declares`} ([[measured-token-rows]])`,
        );
      }
      throw new Error(
        `waited ${timeout}ms / ${frames} frames and ${pending.length} of ${rows.length} token rows never ` +
        `recorded evidence: ${named}${pending.length > 4 ? ", …" : ""} — each rendered as a measured row ` +
        `and never measured anything ([[measured-token-rows]])`,
      );
    }
    frames += 1;
    await new Promise((r) => requestAnimationFrame(() => r(null)));
  }
  return assertMeasuredRows(root);
}

export function assertMeasuredRows(root: Element): { measured: number; unproven: number } {
  const rows = Array.from(root.querySelectorAll(ROW_SELECTOR));
  let measured = 0;
  let unproven = 0;

  rows.forEach((row, i) => {
    const text = (row.textContent ?? "").trim().slice(0, 70);
    const where = `token row ${i + 1}/${rows.length} ("${text}")`;
    const ev = evidenceOf(row);
    if (!ev) {
      throw new Error(
        `${where}: rendered as a measured row but recorded no evidence — it never measured anything, ` +
        `or the play read before it finished. Use \`await awaitMeasuredRows(root)\` if the story has a ` +
        `part that mounts late ([[measured-token-rows]])`,
      );
    }

    if (row.getAttribute("data-token-row") === "unproven") {
      unproven += 1;
      if (!ev.reason) throw new Error(`${where}: unproven with no reason — a row that cannot measure must say what it cannot prove ([[measured-token-rows]])`);
      if (ev.measured || ev.expected) {
        throw new Error(`${where}: unproven yet carries a value (“${ev.measured || ev.expected}”) — an unmeasurable row must not fall back to resolving its token ([[measured-token-rows]])`);
      }
      return;
    }

    measured += 1;
    const node = ev.measuredNode;
    if (!node) throw new Error(`${where}: no measured element — “${ev.select}” matched nothing ([[measured-token-rows]])`);
    /* (b) the row read something that was really IN THE DOCUMENT.
     *
     * This used to ask `node.isConnected` — is it in the document NOW. That question has the wrong
     * tense for a surface that can only be measured while it is mounted: a modal panel is mounted,
     * read, and unmounted again (see `MeasuredSpec transient`), so by the time anything checks, the
     * node is detached ON PURPOSE and a live check would reject every honest modal row.
     *
     * The property the check exists to protect is unchanged, and is what is asserted here: a row may
     * not measure a node that was never in the document. `connectedAtRead` is stamped by the kit
     * inside `measure()`, from `isConnected`, at the instant of the read — a node built in a detached
     * fragment reads `false` there and still fails, and there is no prop a story can pass to set it. */
    if (!ev.connectedAtRead) {
      throw new Error(
        `${where}: the measured element “${ev.select}” was NOT in the document when it was read — ` +
        `a row may only measure a node that is really rendered${node.isConnected ? "" : " (it is detached now, too)"} ([[measured-token-rows]])`,
      );
    }

    // (c) the measured node is a component, not something the story painted.
    if (node.hasAttribute("data-ds-token-probe")) {
      throw new Error(`${where}: “${ev.select}” selected a probe — read the value off the element that PAINTS it ([[measured-token-rows]])`);
    }
    const inline = (node as HTMLElement).style;
    const painted = [ev.prop, ...(INLINE_SHORTHANDS[ev.prop] ?? [])].find((p) => inline?.getPropertyValue(p));
    if (painted) {
      throw new Error(
        `${where}: the measured element carries an inline \`${painted}\` (“${inline.getPropertyValue(painted)}”) — ` +
        `the row is reading back a paint the story applied, not the component's own ([[measured-token-rows]])`,
      );
    }

    // (d) THE circular-row check: the claim was not resolved on the node measured.
    if (!ev.probeNode) throw new Error(`${where}: the claimed token “${ev.token}” was never resolved — nothing to compare against ([[measured-token-rows]])`);
    if (ev.probeNode === node) {
      throw new Error(`${where}: the value and the claim were both read off the SAME element — a row that resolves the token it claims cannot disagree with the component ([[measured-token-rows]])`);
    }

    // (e) a shadow-colour row really did parse a shadow. Without this, a row that fell into the
    // colour comparison because the property was empty would still read as proof of a hairline.
    if (ev.compared === "shadow-colour" && !ev.geometry) {
      throw new Error(`${where}: recorded a shadow-colour comparison but no shadow geometry — it never parsed a shadow ([[measured-token-rows]])`);
    }

    // (f) the component paints what the row says it paints.
    if (!ev.bound) {
      throw new Error(
        `${where}: ${ev.prop}${ev.state ? ` :${ev.state}` : ""} on “${ev.select}” measures ${ev.measured}, ` +
        `but ${ev.token} resolves to ${ev.expected || "nothing"} — the row's claim is false ([[measured-token-rows]])`,
      );
    }
  });

  return { measured, unproven };
}

/* ---- Canonical --ds-* role inventory (grouped) ---------------------------- */
export const DS_ROLES = {
  background: [
    "--ds-bg-base", "--ds-bg-subtle", "--ds-bg-sunken", "--ds-bg-raised",
    "--ds-bg-overlay", "--ds-bg-high-contrast", "--ds-bg-inverse",
  ],
  text: [
    "--ds-text-strong", "--ds-text-weak", "--ds-text-link", "--ds-text-disabled",
    "--ds-text-error", "--ds-text-warning", "--ds-text-success", "--ds-text-info",
  ],
  icon: [
    "--ds-icon-neutral", "--ds-icon-interactive", "--ds-icon-disabled",
    "--ds-icon-error", "--ds-icon-warning", "--ds-icon-success", "--ds-icon-info",
  ],
  fill: [
    "--ds-fill-weaker", "--ds-fill-weak", "--ds-fill-hover", "--ds-fill-press", "--ds-fill-medium",
    "--ds-fill-strong", "--ds-fill-disabled", "--ds-fill-accent", "--ds-fill-accent-hover",
    "--ds-fill-accent-med", "--ds-fill-accent-weak", "--ds-fill-selected",
    "--ds-fill-selected-subtle", "--ds-fill-error", "--ds-fill-error-weak",
    "--ds-fill-error-hover",
    "--ds-fill-warning", "--ds-fill-warning-weak", "--ds-fill-success",
    "--ds-fill-success-weak", "--ds-fill-info", "--ds-fill-info-weak",
    // The scrims and the foregrounds that pair with them ([[scrim-foreground-tokens]]). The on-* pair are inks
    // rather than fills, but they live in this family so the colour wall shows a veil
    // beside the colour that goes on it — reading one without the other is how the
    // 1.00:1 pairing happened in the first place.
    "--ds-scrim", "--ds-scrim-light", "--ds-on-scrim", "--ds-on-scrim-light",
  ],
  stroke: [
    "--ds-stroke-weak", "--ds-stroke-strong", "--ds-stroke-focus", "--ds-stroke-focus-stack",
    "--ds-stroke-selected",
    "--ds-stroke-disabled", "--ds-stroke-accent", "--ds-stroke-accent-weak",
    "--ds-stroke-error", "--ds-stroke-error-weak", "--ds-stroke-warning",
    "--ds-stroke-warning-weak", "--ds-stroke-success", "--ds-stroke-success-weak",
    "--ds-stroke-info", "--ds-stroke-info-weak",
  ],
} as const;

export const ALL_DS_ROLES: string[] = Object.values(DS_ROLES).flat();

/* ---- Intended contrast pairings (WCAG 2.2 AA) ----------------------------- */
export interface Pairing {
  name: string;
  fg: string;
  bg: string;
  min: number;
  /** Minimum APCA |Lc|, asserted beside `min` when present ([[text-on-solid-fill-contrast]]). */
  minLc?: number;
  /** The opaque fill a translucent `bg` is painted over. The pair is then measured on the
   *  composite, which is the colour on screen ([[text-on-solid-fill-contrast]]: the hover overlay on a solid fill). */
  layeredOn?: string;
}

// Text roles (step 11/12) on neutral backgrounds — AA normal text 4.5.
export const TEXT_ON_BG: Pairing[] = [
  { name: "text-strong/bg-base", fg: "--ds-text-strong", bg: "--ds-bg-base", min: 4.5 },
  { name: "text-strong/bg-subtle", fg: "--ds-text-strong", bg: "--ds-bg-subtle", min: 4.5 },
  { name: "text-strong/bg-raised", fg: "--ds-text-strong", bg: "--ds-bg-raised", min: 4.5 },
  { name: "text-weak/bg-base", fg: "--ds-text-weak", bg: "--ds-bg-base", min: 4.5 },
  { name: "text-weak/bg-subtle", fg: "--ds-text-weak", bg: "--ds-bg-subtle", min: 4.5 },
  // accent-11 link: light-scale brands (orange 4.43, teal 4.48, yellow 4.49) land a hair
  // under 4.5 — the Radix tuned-step-11 reality already accepted for status text ([[brand-collision-shift-table]]/[[warning-text-tolerance]]).
  { name: "text-link/bg-base", fg: "--ds-text-link", bg: "--ds-bg-base", min: 4.39 },
  { name: "text-error/bg-base", fg: "--ds-text-error", bg: "--ds-bg-base", min: 4.5 },
  // Radix's step-11 is its tuned accessible-text step; several scales land a hair
  // under 4.5 on a near-white bg: amber-11 4.49 ([[warning-text-tolerance]]), and — once the collision
  // feature can route warning text through them — orange-11 4.40 and yellow-11
  // 4.454. Floor at 4.39 covers the Radix step-11 reality (extends [[warning-text-tolerance]] to the
  // shifted warning scales). The headline collision gate is the solid-fill check
  // (ON_FILL and ON_STATUS_FILL), which is independent and clears for every accent.
  { name: "text-warning/bg-base", fg: "--ds-text-warning", bg: "--ds-bg-base", min: 4.39 },
  // success can shift to teal (teal-11 4.45) or lime (4.68) under a green-ish
  // brand; both are Radix step-11. Same 4.39 floor as warning, for the same reason.
  { name: "text-success/bg-base", fg: "--ds-text-success", bg: "--ds-bg-base", min: 4.39 },
  { name: "text-info/bg-base", fg: "--ds-text-info", bg: "--ds-bg-base", min: 4.5 },
];

// --on-* content on the solid fills, swept per accent and per appearance by the Colors play.
//
// TEXT ([[text-on-solid-fill-contrast]]). A label on a solid fill owes WCAG 4.5:1 AND APCA Lc 60 (APCA_LC.largeUi)
// against its ink, at rest and on hover, in both appearances. This replaces the earlier AA 3.0
// large/bold floor: a button label is 12px at 500 in the default lane, so it was never large
// text. The fills that carry text are the accent and error solids, which theme.css deepens
// per accent wherever step 9 cannot reach the floor. Their hover is an alpha overlay laid over
// the rest fill (semantic.css), so the hover pair is measured on that composite.
//
// GLYPHS. The status solids carry no text. No shipped component puts a label on
// --ds-fill-warning, -success or -info (they paint status dots, change bars and marks), so
// their ink is held to the 3.0 non-text floor (WCAG 1.4.11), and text on one of them is NOT
// covered until that fill adopts the [[text-on-solid-fill-contrast]] role. Includes the amber trap: --on-warning MUST be
// dark (amber-12). Info (white on cyan-9) is the razor-margin pairing at 3.003.
export const SOLID_TEXT_MIN = 4.5;
export const SOLID_TEXT_MIN_LC = APCA_LC.largeUi;
export const ON_FILL: Pairing[] = [
  { name: "on-accent/fill-accent", fg: "--on-accent", bg: "--ds-fill-accent", min: SOLID_TEXT_MIN, minLc: SOLID_TEXT_MIN_LC },
  { name: "on-accent/fill-accent-hover", fg: "--on-accent", bg: "--ds-fill-accent-hover", layeredOn: "--ds-fill-accent", min: SOLID_TEXT_MIN, minLc: SOLID_TEXT_MIN_LC },
  { name: "on-error/fill-error", fg: "--on-error", bg: "--ds-fill-error", min: SOLID_TEXT_MIN, minLc: SOLID_TEXT_MIN_LC },
  { name: "on-error/fill-error-hover", fg: "--on-error", bg: "--ds-fill-error-hover", layeredOn: "--ds-fill-error", min: SOLID_TEXT_MIN, minLc: SOLID_TEXT_MIN_LC },
  { name: "on-warning/fill-warning (TRAP: must be dark)", fg: "--on-warning", bg: "--ds-fill-warning", min: 3.0 },
  { name: "on-success/fill-success", fg: "--on-success", bg: "--ds-fill-success", min: 3.0 },
  { name: "on-info/fill-info", fg: "--on-info", bg: "--ds-fill-info", min: 3.0 },
];

/** The APCA floor a registered pairing carries, keyed `fg|bg`. `assertPairing` reads it as the
 *  default, so a text fill is held to Lc 60 at every call site that asserts it, including the
 *  ones that pass only the WCAG floor. */
const PAIRING_MIN_LC: Record<string, number> = Object.fromEntries(
  ON_FILL.flatMap((p) => (p.minLc === undefined ? [] : [[`${p.fg}|${p.bg}`, p.minLc]])),
);

/** The fill a registered overlay pairing is composited over, keyed `fg|bg`. `assertPairing`
 *  reads it the same way as the Lc floor, so every call site measures a hover where it paints. */
const PAIRING_LAYERED_ON: Record<string, string> = Object.fromEntries(
  ON_FILL.flatMap((p) => (p.layeredOn === undefined ? [] : [[`${p.fg}|${p.bg}`, p.layeredOn]])),
);

// The on-solid foregrounds. Not in DS_ROLES (which is bg/text/icon/fill/stroke), so
// add them to the empty-token check explicitly — an empty --on-* would otherwise only
// surface as a downstream contrast/parse failure, not a clean "Unmapped" message.
export const ON_TOKENS = ["--on-accent", "--on-error", "--on-warning", "--on-success", "--on-info"];

// Non-text contrast (WCAG 1.4.11) is scoped to UI COMPONENTS and STATES, not raw
// border tokens. Radix's gray-a8 borders are subtle by design and conformant in
// context (components also carry bg/label/shadow as identifiers); asserting 3:1 on
// the bare token is a misapplication. Generic component-border contrast is verified
// per-component in Phase 2. The one non-text token we DO assert now is the focus ring
// (a specific indicator concern) — see FOCUS_RING below.
export const NON_TEXT: Pairing[] = [];

// Focus ring — WCAG non-text contrast and focus visibility (1.4.11 / 2.4.7; [[focus-criterion-numbers]] corrected an
// earlier "2.4.11" here, which is Focus Not Obscured, a different criterion). [[focus-ring]]: ONE ring on
// every focused control, every highlighted menu row and both scrims, 2px wide, in two layers: the
// accent fill (--ds-stroke-focus, which IS --ds-fill-accent, the button's own fill) underneath and
// one Radix black or white alpha (--ds-stroke-focus-stack) on top. The flattened ring owes WCAG
// 3:1 AND APCA Lc 30 against every surface a ring sits on (FOCUS_SURFACES), on 27 accents, both
// appearances and the six neutrals. theme.css picks the stack as the lightest step that clears.
// _internal/Focus `FocusRingContrast` holds the tokens, `EveryRingIsTheStackedAccent` and
// _internal/Non-text contrast `FocusRingOnParts` hold the rings as drawn, and `ScrimRingContrast`
// holds the two scrims, whose stack Overlay re-points, over media 0 to 255. [[card-picker-focus-width]] widens the ring
// on a CheckboxCards or RadioCards card to 4px, so a focused card differs from a selected card at
// rest, whose band is 2px. `ringWidthFor` names the width each carrier owes.
export const FOCUS_RING = {
  base: "--ds-stroke-focus",
  stack: "--ds-stroke-focus-stack",
  /** The base must BE this role: the ring is the button's own colour ([[text-on-solid-fill-contrast]], [[focus-ring]]). */
  fill: "--ds-fill-accent",
  widthPx: 2,
  /** The ring on a CheckboxCards or RadioCards card ([[card-picker-focus-width]]). */
  cardPickerWidthPx: 4,
  min: 3.0,
  minLc: APCA_LC.minAnyText,
} as const;

/** The carriers [[card-picker-focus-width]] rings at `cardPickerWidthPx`. */
export const CARD_PICKER_CARRIERS = ".rt-CheckboxCardsItem, .rt-RadioCardsItem";

/** The width a focus ring on `carrier` owes: 4px on a card picker ([[card-picker-focus-width]]), 2px everywhere else ([[focus-ring]]). */
export function ringWidthFor(carrier: Element): number {
  return carrier.matches(CARD_PICKER_CARRIERS) ? FOCUS_RING.cardPickerWidthPx : FOCUS_RING.widthPx;
}
export const LIGHT_SCALE_ACCENTS = ["amber", "sky", "yellow", "lime", "mint"];

/** Radix's six neutrals. The gray accent's fill is pinned per neutral ([[text-on-solid-fill-contrast]]), so a sweep covers all six. */
export const NEUTRALS = ["gray", "mauve", "slate", "sage", "olive", "sand"] as const;

/** A surface a ring sits on, as the layers that paint it, bottom first. */
export interface FocusSurface {
  name: string;
  layers: readonly string[];
}

// Every surface a focus ring sits on ("adjacent colour, not just the page"): the page and its
// recesses, a card, a menu panel, a track on the page and on a card, the highlighted menu row the
// ring edges, the four validation tints a field wears, and the accent tints a selected card, a
// hovered tab and a selected calendar day put under an inset ring. theme.css measures the stack
// against exactly this list.
export const FOCUS_SURFACES: readonly FocusSurface[] = [
  { name: "page", layers: ["--ds-bg-base"] },
  { name: "subtle", layers: ["--ds-bg-base", "--ds-bg-subtle"] },
  { name: "sunken", layers: ["--ds-bg-base", "--ds-bg-sunken"] },
  { name: "card", layers: ["--ds-bg-base", "--ds-bg-raised"] },
  { name: "panel", layers: ["--ds-bg-base", "--ds-bg-overlay"] },
  { name: "track", layers: ["--ds-bg-base", "--ds-fill-weak"] },
  { name: "track on a card", layers: ["--ds-bg-base", "--ds-bg-raised", "--ds-fill-weak"] },
  { name: "highlighted row", layers: ["--ds-bg-base", "--ds-bg-overlay", "--ds-fill-hover"] },
  { name: "error tint", layers: ["--ds-bg-base", "--ds-fill-error-weak"] },
  { name: "warning tint", layers: ["--ds-bg-base", "--ds-fill-warning-weak"] },
  { name: "success tint", layers: ["--ds-bg-base", "--ds-fill-success-weak"] },
  { name: "info tint", layers: ["--ds-bg-base", "--ds-fill-info-weak"] },
  { name: "accent tint", layers: ["--ds-bg-base", "--ds-fill-accent-weak"] },
  { name: "accent tint on a card", layers: ["--ds-bg-base", "--ds-bg-raised", "--ds-fill-accent-weak"] },
  { name: "selected tint", layers: ["--ds-bg-base", "--ds-fill-selected-subtle"] },
];

/** A custom property's colour as it computes on `el`, read without touching the DOM (so a focused
 *  control keeps its focus). */
export function cssVarColour(el: Element, name: string): RGBA {
  return parseColor(getComputedStyle(el).getPropertyValue(name).trim() || "transparent");
}

/** A surface as it paints: its layers flattened bottom first. */
export function surfaceColour(el: Element, surface: FocusSurface): RGBA {
  return surface.layers.reduce<RGBA | null>((under, name) => {
    const c = cssVarColour(el, name);
    return under ? flatten(c, under) : c.a < 1 ? flatten(c, cssVarColour(el, "--ds-bg-base")) : c;
  }, null) as RGBA;
}

/** The ring the tokens describe on `el`: the stack flattened over the base. */
export function tokenRing(el: Element): RGBA {
  return flatten(cssVarColour(el, FOCUS_RING.stack), cssVarColour(el, FOCUS_RING.base));
}

/** One painted layer of a drawn focus ring. */
export interface RingLayer {
  /** The box that paints it: the carrier itself or one of its pseudo-elements. */
  on: "own" | "::before" | "::after";
  kind: "outline" | "inset-shadow";
  colour: RGBA;
  /** Width on screen, px: an outline's width, or a shadow's spread, times its box's scale. */
  width: number;
  /** The ring's outer box on screen, px. */
  outer: [number, number];
}

/** A focus ring as the page draws it: the box that carries it and its painted layers, bottom first. */
export interface DrawnRing {
  carrier: HTMLElement;
  layers: RingLayer[];
}

function splitLayers(list: string): string[] {
  const out: string[] = [];
  let depth = 0;
  let cur = "";
  for (const ch of list) {
    if (ch === "(") depth += 1;
    if (ch === ")") depth -= 1;
    if (ch === "," && depth === 0) {
      out.push(cur.trim());
      cur = "";
    } else cur += ch;
  }
  if (cur.trim()) out.push(cur.trim());
  return out;
}

/** The painted ring layers on one box, bottom first: its own outline, then ::before's, then the
 *  inset shadows ::after lists (last listed paints lowest), then ::after's outline. Siblings paint in
 *  tree order and an element paints its outline above its own shadows. A layer counts only if it
 *  paints something. Only ::after's inset shadows at least as wide as the [[focus-ring]] ring are ring layers:
 *  a 1px inset shadow is a control's own border or the [[part-fill-edge]] part edge. The width a layer owes is
 *  `checkDrawnRing`'s concern, so a card picker ring drawn at 2px reads as a 2px layer there. */
function ringLayersOn(el: HTMLElement): RingLayer[] {
  const out: RingLayer[] = [];
  const rect = el.getBoundingClientRect();
  for (const on of ["own", "::before", "::after"] as const) {
    const cs = getComputedStyle(el, on === "own" ? null : on);
    if (on !== "own" && cs.content === "none") continue;
    const scale = on === "own" ? 1 : parseFloat(cs.transform.match(/^matrix\(([^,]+)/)?.[1] ?? "1");
    const w = on === "own" ? rect.width : parseFloat(cs.width);
    const h = on === "own" ? rect.height : parseFloat(cs.height);
    if (on === "::after" && cs.boxShadow !== "none") {
      for (const layer of splitLayers(cs.boxShadow).reverse()) {
        if (!/\binset\b/.test(layer)) continue;
        const colour = layer.match(/^[a-z-]+\([^)]*\)|^#[0-9a-f]+|^transparent/i)?.[0];
        if (!colour) continue;
        const [x, y, blur, spread] = layer.slice(colour.length).replace("inset", "").trim().split(/\s+/).map(parseFloat);
        const c = parseColor(colour);
        if (x !== 0 || y !== 0 || blur !== 0 || spread < FOCUS_RING.widthPx || c.a === 0) continue;
        out.push({ on, kind: "inset-shadow", colour: c, width: spread * scale, outer: [w * scale, h * scale] });
      }
    }
    const width = parseFloat(cs.outlineWidth);
    const colour = parseColor(cs.outlineColor);
    if (cs.outlineStyle === "none" || !(width > 0) || colour.a === 0) continue;
    const reach = 2 * (parseFloat(cs.outlineOffset) + width);
    out.push({ on, kind: "outline", colour, width: width * scale, outer: [(w + reach) * scale, (h + reach) * scale] });
  }
  return out;
}

/** Read the focus ring a keyboard-focused control draws. The carrier is the nearest box, from the
 *  focused element outward, that paints a ring layer: the element, the overlay ring element Radix
 *  puts beside a ScrollArea viewport, the inner label box a Tabs trigger rings, an ancestor that
 *  hoists the ring (a field root, a Token, an Item, a card, a Thumbnail). A clip-hidden box (the
 *  FileInput's native input keeps the UA outline in its computed style and paints none of it) is
 *  passed over. `stop` bounds the walk. Returns null when nothing between them paints a ring. */
export function readDrawnRing(focused: HTMLElement, stop: Element | null = null): DrawnRing | null {
  const candidates: HTMLElement[] = [];
  const beside = focused.nextElementSibling;
  const inner = focused.querySelector<HTMLElement>(":scope > .rt-BaseTabListTriggerInner");
  for (let el: HTMLElement | null = focused, depth = 0; el && el !== stop && depth < 6; el = el.parentElement, depth += 1) {
    candidates.push(el);
    if (el === focused) {
      if (inner) candidates.push(inner);
      if (beside instanceof HTMLElement && beside.classList.contains("rt-ScrollAreaViewportFocusRing")) candidates.push(beside);
    }
  }
  for (const el of candidates) {
    const cs = getComputedStyle(el);
    const r = el.getBoundingClientRect();
    if (cs.clip !== "auto" || (r.width <= 1 && r.height <= 1)) continue;
    const layers = ringLayersOn(el);
    if (layers.length) return { carrier: el, layers };
  }
  return null;
}

/** Hold a drawn ring to [[focus-ring]]. Returns what is wrong, empty when the ring is right, plus the ring's
 *  flattened colour for the caller's contrast checks: every layer at the carrier's width (2px, and
 *  4px on a card picker under [[card-picker-focus-width]]), every layer on the same outer box, the bottom layer the
 *  button's own fill, and the layers together the stack flattened on that fill. */
export function checkDrawnRing(ring: DrawnRing): { problems: string[]; colour: RGBA } {
  const problems: string[] = [];
  const { carrier, layers } = ring;
  const rgb = (c: RGBA) => `rgb(${Math.round(c.r)},${Math.round(c.g)},${Math.round(c.b)})`;
  const near = (a: RGBA, b: RGBA) => Math.abs(a.r - b.r) <= 1.5 && Math.abs(a.g - b.g) <= 1.5 && Math.abs(a.b - b.b) <= 1.5;
  const widthPx = ringWidthFor(carrier);
  for (const l of layers) {
    if (Math.abs(l.width - widthPx) > 0.25) problems.push(`the ${l.on} ${l.kind} is ${l.width.toFixed(2)}px wide, not ${widthPx}px`);
  }
  const [w0, h0] = layers[0].outer;
  for (const l of layers.slice(1)) {
    if (Math.abs(l.outer[0] - w0) > 0.5 || Math.abs(l.outer[1] - h0) > 0.5) {
      problems.push(`the ${l.on} ${l.kind} rings a ${l.outer[0].toFixed(1)}x${l.outer[1].toFixed(1)} box and the ${layers[0].on} ${layers[0].kind} a ${w0.toFixed(1)}x${h0.toFixed(1)} one, so the layers do not coincide`);
    }
  }
  const fill = cssVarColour(carrier, FOCUS_RING.fill);
  const base = cssVarColour(carrier, FOCUS_RING.base);
  if (!near(base, fill)) problems.push(`${FOCUS_RING.base} is ${rgb(base)}, not the button's fill ${FOCUS_RING.fill} ${rgb(fill)}`);
  if (layers[0].colour.a < 0.99 || !near(layers[0].colour, fill)) {
    problems.push(`the bottom layer (${layers[0].on} ${layers[0].kind}) paints rgba(${rgb(layers[0].colour).slice(4, -1)},${layers[0].colour.a.toFixed(2)}), not the fill ${rgb(fill)}`);
  }
  const colour = layers.reduce<RGBA | null>((under, l) => (under ? flatten(l.colour, under) : l.colour), null) as RGBA;
  const want = tokenRing(carrier);
  if (!near(colour, want)) problems.push(`the layers flatten to ${rgb(colour)}, where the stack on the fill is ${rgb(want)}`);
  return { problems, colour };
}

// Exempt: intentionally low-contrast by design (disabled).
export const EXEMPT = ["--ds-text-disabled", "--ds-icon-disabled"];

/* ===========================================================================
   BRAND -> SEMANTIC COLLISION AVOIDANCE — shared table + OKLCH hue helpers
   ---------------------------------------------------------------------------
   theme.css re-aliases a colliding semantic family per accent via
   .radix-themes[data-accent-color="<accent>"] blocks. THIS table is the single
   source of truth those blocks were generated from; the cross-accent story test
   (Colors.stories.tsx) derives its expected scales from here, so CSS and test
   cannot drift. Accents absent from the table keep the base mapping (they
   already clear >= 30deg). See theme.css collision section + DECISIONS [[brand-collision-shift-table]].
   =========================================================================== */

export type SemFamily = "error" | "warning" | "success" | "info";

/** Base (un-shifted) semantic -> Radix scale, mirroring theme.css's base block. */
export const SEMANTIC_DEFAULT: Record<SemFamily, string> = {
  error: "red",
  warning: "amber",
  success: "green",
  info: "cyan",
};

/** Per-accent overrides: which family shifts to which scale to avoid collision.
    Exactly mirrors the 17 blocks in theme.css (derived by OKLCH hue-distance
    optimisation). Accents not present here need no block. */
export const COLLISION_TABLE: Record<string, Partial<Record<SemFamily, string>>> = {
  gold: { error: "oxblood", warning: "orange" },
  bronze: { error: "ruby" },
  brown: { warning: "yellow" },
  yellow: { error: "oxblood", warning: "orange" },
  amber: { error: "oxblood", warning: "orange" },
  orange: { error: "oxblood" }, // was ruby — orange↔ruby ΔE-OK 0.12; oxblood clears at 0.28
  // Red family + pink → oxblood (deep red; named reds sit ~0.07 apart, oxblood 0.21+).
  tomato: { error: "oxblood" },
  red: { error: "oxblood" },
  ruby: { error: "oxblood" },
  crimson: { error: "oxblood" },
  pink: { error: "oxblood" }, // magenta brand; bright red read too close (ΔE-OK 0.13)
  // Cyan/teal/blue cluster → indigo/iris for info — a hue-distinct blue, not a lighter cyan.
  cyan: { info: "indigo" }, // was blue — cyan↔blue ΔE-OK 0.11; indigo 0.18
  sky: { info: "blue" },
  blue: { info: "iris" }, // blue IS the info hue; iris the only clear option (0.14)
  teal: { success: "lime", info: "indigo" }, // collides on BOTH (the teal↔grass swap + cyan)
  jade: { success: "lime" },
  green: { success: "lime" },
  grass: { success: "lime" }, // was teal — the other half of the swap
  mint: { success: "grass" },
  lime: { error: "oxblood", warning: "orange" }, // warning→orange (amber too close, 0.13→0.31);
  // error→oxblood so it stays clear of the orange warning. gold/yellow/amber/lime all do this:
  // warning→orange would otherwise sit ~ΔE-OK 0.10 from a ruby/red error (both warm).
};

/** Every Radix accent scale Radix exposes as a brand (the 26 named accents). */
export const ALL_ACCENTS = [
  "gray", "gold", "bronze", "brown", "yellow", "amber", "orange", "tomato",
  "red", "ruby", "crimson", "pink", "plum", "purple", "violet", "iris",
  "indigo", "blue", "cyan", "teal", "jade", "green", "grass", "lime", "mint", "sky",
  "oxblood", // 27th — custom deep-red preset scale (src/tokens/oxblood.css)
] as const;

/** The expected semantic->scale map for an accent (defaults + any shift). */
export function expectedScales(accent: string): Record<SemFamily, string> {
  return { ...SEMANTIC_DEFAULT, ...(COLLISION_TABLE[accent] ?? {}) };
}

/** The perceptual collision gate — used for BOTH brand↔semantic and semantic↔semantic.
    A pair is "too close" only when BOTH the perceptual distance and the hue gap are low,
    so it clears on either axis. Calibrated from observed calls: green/cyan reads fine at
    ΔE-OK 0.137 (hue 64deg) and amber/orange at 0.20 (hue 39deg), but pink/red collides at
    0.128 (hue 37deg) and teal/cyan at 0.081 (hue 40deg). The ΔE axis also catches
    lightness-only separation a hue gate can't see — oxblood error vs orange warning sit
    16deg apart in hue but ΔE-OK 0.28. ΔE-OK ~0.10 ≈ CIEDE2000 ΔE 5. Replaces the old
    hue-only 18deg gate. */
export const MIN_BRAND_DELTA_E = 0.135;
export const MIN_BRAND_HUE = 40;

/** True when two colours collide under the perceptual gate (either axis clears them). */
export function tooClose(
  aLab: [number, number, number], aHue: number,
  bLab: [number, number, number], bHue: number,
): boolean {
  return deltaEOK(aLab, bLab) < MIN_BRAND_DELTA_E && hueDistance(aHue, bHue) < MIN_BRAND_HUE;
}

/* ---- OKLCH hue, from sRGB bytes read off a 1x1 canvas (handles display-p3) -- */
function srgbBytes(el: Element, input: string): RGBA {
  const ctx = document.createElement("canvas").getContext("2d", { willReadFrequently: true });
  if (!ctx) throw new Error("No 2d canvas context for sRGB readback");
  // Resolve the var/colour string as it computes on `el`, then rasterise one
  // pixel: the canvas backing store is sRGB, so this yields real sRGB bytes even
  // when getComputedStyle would serve display-p3 on a P3 display.
  const probe = document.createElement("span");
  probe.style.color = input;
  el.appendChild(probe);
  const c = getComputedStyle(probe).color;
  probe.remove();
  ctx.clearRect(0, 0, 1, 1);
  ctx.fillStyle = c;
  ctx.fillRect(0, 0, 1, 1);
  const [r, g, b, a] = ctx.getImageData(0, 0, 1, 1).data;
  return { r, g, b, a: a / 255 };
}

function linearise(c: number): number {
  const s = c / 255;
  return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
}

/** OKLab [L, a, b] of a CSS colour/var, as it computes on `el` (P3-safe via the
    1x1-canvas readback). The shared basis for hue and perceptual-distance checks. */
export function oklab(el: Element, input: string): [number, number, number] {
  const { r, g, b } = srgbBytes(el, input);
  const lr = linearise(r), lg = linearise(g), lb = linearise(b);
  const l = 0.4122214708 * lr + 0.5363325363 * lg + 0.0514459929 * lb;
  const m = 0.2119034982 * lr + 0.6806995451 * lg + 0.1073969566 * lb;
  const s = 0.0883024619 * lr + 0.2817188376 * lg + 0.6299787005 * lb;
  const l_ = Math.cbrt(l), m_ = Math.cbrt(m), s_ = Math.cbrt(s);
  return [
    0.2104542553 * l_ + 0.7936177850 * m_ - 0.0040720468 * s_,
    1.9779984951 * l_ - 2.4285922050 * m_ + 0.4505937099 * s_,
    0.0259040371 * l_ + 0.7827717662 * m_ - 0.8086757660 * s_,
  ];
}

/** OKLCH hue (deg, 0-360) of a CSS colour/var, as it computes on `el`. */
export function oklchHue(el: Element, input: string): number {
  const [, A, B] = oklab(el, input);
  let h = (Math.atan2(B, A) * 180) / Math.PI;
  if (h < 0) h += 360;
  return h;
}

/** Euclidean ΔE in OKLab (perceptual distance — L + a + b). ~0.10 ≈ CIEDE2000 ΔE 5. */
export function deltaEOK(a: [number, number, number], b: [number, number, number]): number {
  return Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);
}

/** Smallest angular distance between two hues (deg, 0-180). */
export function hueDistance(a: number, b: number): number {
  const d = Math.abs(a - b) % 360;
  return d > 180 ? 360 - d : d;
}

/** Set data-accent-color on the theme root and return a restore fn. Radix's
    [data-accent-color] rule remaps --accent-* and our blocks remap the
    semantics — synchronously, so the caller can read getComputedStyle right
    after with no await. */
export function withAccent(root: HTMLElement, accent: string): () => void {
  const prev = root.getAttribute("data-accent-color");
  root.setAttribute("data-accent-color", accent);
  return () => {
    if (prev == null) root.removeAttribute("data-accent-color");
    else root.setAttribute("data-accent-color", prev);
  };
}
