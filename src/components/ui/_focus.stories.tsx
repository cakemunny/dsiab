import type { Meta, StoryObj } from "@storybook/react-vite";
import type { ReactNode } from "react";
import { Box, Flex, Text } from "@radix-ui/themes";
import { DotsThree } from "@phosphor-icons/react";
import { Button } from "./Button";
import { IconButton } from "./IconButton";
import { TextField } from "./TextField";
import { TextArea } from "./TextArea";
import { NumberInput } from "./NumberInput";
import { Select } from "./Select";
import { MultiSelect } from "./MultiSelect";
import { DateInput } from "./DateInput";
import { DateRangeInput } from "./DateRangeInput";
import { TimeInput } from "./TimeInput";
import { Typeahead, createStaticSource } from "./Typeahead";
import { ChatComposer } from "./ChatComposer";
import { Tokenizer } from "./Tokenizer";
import { FileInput } from "./FileInput";
import { Token } from "./Token";
import { List, ListItem } from "./List";
import { Collapsible } from "./Collapsible";
import { Link } from "./Link";
import { Tabs } from "./Tabs";
import { ScrollArea } from "./ScrollArea";
import { Card } from "./Card";
import { ClickableCard } from "./ClickableCard";
import { Calendar } from "./Calendar";
import { Thumbnail } from "./Thumbnail";
import { ResizeHandle } from "./ResizeHandle";
import { useResizable } from "../../hooks/useResizable";
import { SizeContext, type UISize } from "../../theme/SizeContext";
import { apcaContrast } from "../../foundations/apca";
import {
  ALL_ACCENTS,
  FOCUS_RING,
  FOCUS_SURFACES,
  NEUTRALS,
  assertNoEmpty,
  checkDrawnRing,
  contrastRatio,
  cssVarColour,
  flatten,
  luminance,
  parseColor,
  readDrawnRing,
  surfaceColour,
  themeRoot,
  tokenRing,
  withAccent,
  type DrawnRing,
  type RGBA,
} from "../../foundations/_assert";

// axe off for the suite: every story here but RingGapOutsideEdge and TabPanelRingClearsList renders a
// bare probe or a specimen that the play clones and measures off-screen, so there is no rendered surface
// for axe to have an opinion about. The contrast this file exists to prove is asserted directly, and
// harder than axe would (3:1 and APCA Lc 30 across every accent x both appearances x every surface a
// ring sits on).
// Measured clean with the carve-out lifted, both appearances — this is a no-surface exemption, not a
// suppression. RingGapOutsideEdge and TabPanelRingClearsList mount real controls, so each turns axe back
// on for itself.
const meta: Meta = { title: "_internal/Focus", parameters: { a11y: { test: "off" } } };
export default meta;
type Story = StoryObj;

// [[focus-ring]]. EVERY FOCUS RING IS ONE RING: the accent fill (--ds-stroke-focus, which is --ds-fill-accent,
// the button's own fill) with one Radix black or white alpha (--ds-stroke-focus-stack) stacked on it,
// 2px wide. It replaced the old neutral gray-12 hairline, the nine Radix accent-8 rings and the two [[scrim-focus-ring]] /
// [[light-scrim-focus-ring]] scrim rings. theme.css picks each colour's stack as the lightest step that clears WCAG 3:1 AND
// APCA Lc 30 against every surface a ring sits on (FOCUS_SURFACES, _assert.ts).
//
// The plays below hold that at three levels. RingTokensResolve and FocusRingContrast hold the TOKENS
// on detached clones, every accent, both appearances, all six neutrals. EveryRingIsTheStackedAccent
// holds the rings AS DRAWN on real controls, reading each layer the page paints. ScrimRingContrast
// holds the two scrims over every media value. The Radix-ringed parts without text (Checkbox, Radio,
// Switch, Slider, Tabs, SegmentedControl, the card pickers, the Pagination dot) are held as drawn by
// _internal/Non-text contrast → FocusRingOnParts.
//
// BOTH POLARITIES are read off DETACHED CLONES carrying an explicit appearance class, never off the
// live root. The suite runs in a dark lane as well as a light one (vitest.config.ts), so a check that
// reads the ambient root is only testing whichever lane it happens to be in.

/** A detached clone of the theme root, off-screen, pinned to one appearance. */
function themeProbe(root: HTMLElement, appearance: "light" | "dark"): HTMLElement {
  const probe = document.createElement("div");
  for (const a of Array.from(root.attributes)) probe.setAttribute(a.name, a.value);
  probe.classList.remove("light", "light-theme", "dark", "dark-theme");
  probe.classList.add(appearance);
  probe.style.cssText = "position:fixed;left:-9999px;top:0;width:320px";
  document.body.appendChild(probe);
  return probe;
}

const rgb = (c: RGBA) => `rgb(${Math.round(c.r)},${Math.round(c.g)},${Math.round(c.b)})`;

export const RingTokensResolve: Story = {
  render: () => <Box data-testid="probe" />,
  play: async ({ canvasElement }) => {
    const root = themeRoot(canvasElement);
    const wrong: string[] = [];
    let cells = 0;
    for (const appearance of ["light", "dark"] as const) {
      const probe = themeProbe(root, appearance);
      try {
        // The old hairline token is gone ([[focus-ring]]). A var() still pointing at it would resolve to nothing.
        if (getComputedStyle(probe).getPropertyValue("--ds-stroke-focus-hairline").trim() !== "") {
          wrong.push(`${appearance}: --ds-stroke-focus-hairline still resolves; [[focus-ring]] deleted it`);
        }
        for (const accent of ALL_ACCENTS) {
          const restore = withAccent(probe, accent);
          try {
            for (const neutral of NEUTRALS) {
              probe.setAttribute("data-gray-color", neutral);
              const where = `${appearance}/${accent}/${neutral}`;
              const base = cssVarColour(probe, FOCUS_RING.base);
              const fill = cssVarColour(probe, FOCUS_RING.fill);
              const stack = cssVarColour(probe, FOCUS_RING.stack);
              cells += 1;
              if (base.a < 0.99 || [base.r - fill.r, base.g - fill.g, base.b - fill.b].some((d) => Math.abs(d) > 1)) {
                wrong.push(`${where}: ${FOCUS_RING.base} is ${rgb(base)}, not ${FOCUS_RING.fill} ${rgb(fill)}`);
              }
              // The stack darkens on a light page and lightens on a dark one, and nothing else.
              const ink = appearance === "light" ? 0 : 255;
              if (stack.a > 0 && [stack.r, stack.g, stack.b].some((v) => v !== ink)) {
                wrong.push(`${where}: the stack is ${rgb(stack)} at ${stack.a.toFixed(2)}, not a ${appearance === "light" ? "black" : "white"} alpha`);
              }
            }
          } finally {
            restore();
          }
        }
      } finally {
        probe.remove();
      }
    }
    if (cells !== 2 * ALL_ACCENTS.length * NEUTRALS.length) throw new Error(`read ${cells} cells, expected ${2 * ALL_ACCENTS.length * NEUTRALS.length}`);
    if (wrong.length) throw new Error(`the focus ring tokens are wrong ([[focus-ring]]):\n  ${wrong.join("\n  ")}`);
  },
};

// The ring as the tokens describe it, the stack flattened on the fill, against every surface a ring
// sits on (each flattened bottom first), on every accent x both appearances x all six neutrals, at
// WCAG 3:1 AND APCA Lc 30. No carve-out. sRGB-gated like the Colors matrix: on a P3 display the hard
// assert runs headless/CI only.
export const FocusRingContrast: Story = {
  render: () => <Box data-testid="probe" />,
  play: async ({ canvasElement }) => {
    const root = themeRoot(canvasElement);
    const sRGB = !window.matchMedia?.("(color-gamut: p3)")?.matches;
    // A missing token would resolve to "" and spuriously pass. Fail cleanly instead.
    assertNoEmpty(root, [FOCUS_RING.base, FOCUS_RING.stack, ...new Set(FOCUS_SURFACES.flatMap((s) => s.layers))]);

    const below: string[] = [];
    let cells = 0;
    for (const appearance of ["light", "dark"] as const) {
      const probe = themeProbe(root, appearance);
      try {
        for (const accent of ALL_ACCENTS) {
          const restore = withAccent(probe, accent);
          try {
            for (const neutral of NEUTRALS) {
              probe.setAttribute("data-gray-color", neutral);
              const ring = tokenRing(probe);
              for (const surface of FOCUS_SURFACES) {
                const under = surfaceColour(probe, surface);
                const ratio = contrastRatio(ring, under);
                const lc = apcaContrast(ring, under);
                cells += 1;
                if (ratio < FOCUS_RING.min || lc < FOCUS_RING.minLc) {
                  below.push(`${appearance}/${accent}/${neutral} on the ${surface.name}: ${ratio.toFixed(2)}:1, Lc ${lc.toFixed(1)} (ring ${rgb(ring)})`);
                }
              }
            }
          } finally {
            restore();
          }
        }
      } finally {
        probe.remove();
      }
    }
    const expected = 2 * ALL_ACCENTS.length * NEUTRALS.length * FOCUS_SURFACES.length;
    if (cells !== expected) throw new Error(`measured ${cells} cells, expected ${expected}`);
    if (!sRGB) {
      console.info("[Focus] P3 display — ring contrast assert enforced headless/CI only.");
      return;
    }
    if (below.length) {
      throw new Error(
        `focus ring below WCAG ${FOCUS_RING.min}:1 or APCA Lc ${FOCUS_RING.minLc} ([[focus-ring]]: each colour's --ds-stroke-focus-stack in theme.css is the lightest step that clears every surface):\n  ${below.join("\n  ")}`,
      );
    }
  },
};

// THE RING ON A SCRIM ([[scrim-focus-ring]], [[light-scrim-focus-ring]], now [[focus-ring]]). A scrim is not the page: both veils keep their colour in
// either appearance and the media under them is unknown, so Overlay re-points the ring's stack on each
// scrim to the step measured for that veil (theme.css). The base stays the button's fill. This play
// focuses a real control inside a real `.rt-ds-overlay-scrim` in a detached theme-root clone, reads
// every layer the ring paints, holds it to [[focus-ring]] (2px, the fill underneath, the stack on it), and sweeps
// the flattened ring over media 0 to 255 in one-step greys, both scrims, 27 accents, both appearances.
//
// THE SWEEP IS THE POINT. The first measurement of [[scrim-focus-ring]]'s defect checked white and black media only and
// reported 2.84:1 as the worst case, when a ring does worst at the CROSSOVER, where it vanishes.
// A photograph at any pixel composites to one of these lightness values, and contrast here depends on
// lightness alone. The veil is read off the scrim's computed background, which also proves the rule
// matched: an unmatched probe is transparent, and a mangled `data-scrim` resolves the other veil.
export const ScrimRingContrast: Story = {
  render: () => <Box data-testid="probe" />,
  play: async ({ canvasElement }) => {
    const root = themeRoot(canvasElement);
    const sRGB = !window.matchMedia?.("(color-gamut: p3)")?.matches;
    const probe = document.createElement("div");
    for (const a of Array.from(root.attributes)) probe.setAttribute(a.name, a.value);
    probe.style.cssText = "position:fixed;left:-9999px;top:0;width:320px";
    const scrim = document.createElement("div");
    scrim.className = "rt-ds-overlay-scrim";
    const control = document.createElement("button");
    control.className = "rt-reset rt-BaseButton rt-r-size-2 rt-variant-surface rt-IconButton";
    control.setAttribute("aria-label", "probe");
    scrim.appendChild(control);
    probe.appendChild(scrim);
    document.body.appendChild(probe);

    const belowMin: string[] = [];
    const wrongRing: string[] = [];
    let cells = 0;
    try {
      for (const appearance of ["light", "dark"] as const) {
        probe.classList.remove("light", "light-theme", "dark", "dark-theme");
        probe.classList.add(appearance);
        for (const accent of ALL_ACCENTS) {
          const restore = withAccent(probe, accent);
          try {
            for (const tint of ["dark", "light"] as const) {
              const where = `${appearance}/${accent} on the ${tint} scrim`;
              scrim.setAttribute("data-scrim", tint);
              const veil = parseColor(getComputedStyle(scrim).backgroundColor);
              if (veil.a === 0) {
                throw new Error(`${where}: the probe scrim is transparent, so Overlay's rule never matched it. Nothing below would be measuring a scrim.`);
              }
              if ((luminance(veil) > 0.5) !== (tint === "light")) {
                throw new Error(`${where}: asked for the ${tint} scrim and resolved the other veil, rgba(${veil.r},${veil.g},${veil.b},${veil.a.toFixed(2)}). The probe is not reaching the rule it claims to test.`);
              }
              control.focus({ focusVisible: true, preventScroll: true } as FocusOptions);
              let ring;
              try {
                if (!control.matches(":focus-visible")) throw new Error(`${where}: focus({ focusVisible: true }) did not reach :focus-visible, so no ring was measured`);
                const drawn = readDrawnRing(control, scrim);
                if (!drawn) throw new Error(`${where}: the focused control draws no ring`);
                ring = checkDrawnRing(drawn);
              } finally {
                control.blur();
              }
              for (const p of ring.problems) wrongRing.push(`${where}: ${p}`);
              let worst = Infinity;
              let worstLc = Infinity;
              let at = 0;
              for (let m = 0; m <= 255; m++) {
                const media = flatten(veil, { r: m, g: m, b: m, a: 1 });
                const ratio = contrastRatio(ring.colour, media);
                const lc = apcaContrast(ring.colour, media);
                if (ratio < worst) { worst = ratio; at = m; }
                worstLc = Math.min(worstLc, lc);
              }
              cells += 1;
              if (worst < FOCUS_RING.min || worstLc < FOCUS_RING.minLc) {
                const hex = `#${at.toString(16).padStart(2, "0").repeat(3)}`;
                belowMin.push(`${where}: ${worst.toFixed(2)}:1 over media ${hex}, Lc ${worstLc.toFixed(1)} at worst, ring ${rgb(ring.colour)}`);
              }
            }
          } finally {
            restore();
          }
        }
      }
    } finally {
      probe.remove();
    }

    if (cells !== 2 * ALL_ACCENTS.length * 2) throw new Error(`swept ${cells} cells, expected ${2 * ALL_ACCENTS.length * 2}`);
    if (wrongRing.length) throw new Error(`the focus ring on a scrim is not the [[focus-ring]] ring:\n  ${wrongRing.sort().join("\n  ")}`);
    if (!sRGB) {
      console.info("[Focus] P3 display — scrim ring assert enforced headless/CI only.");
      return;
    }
    if (belowMin.length) {
      throw new Error(
        `focus ring on a scrim below WCAG ${FOCUS_RING.min}:1 or APCA Lc ${FOCUS_RING.minLc} at some media value ([[focus-ring]]: Overlay re-points --ds-stroke-focus-stack to --accent-ring-stack-scrim or --accent-ring-stack-scrim-light):\n  ${belowMin.sort().join("\n  ")}`,
      );
    }
  },
};

// The base colour and width are declared on each carrier's own rule, which is also the whole ring under
// forced colours. `:focus-visible` needs keyboard modality, so this proves the WIRING at the stylesheet
// level: each registered carrier has a focus rule whose outline-color is exactly --ds-stroke-focus (the
// base, never the stack alone), and no rule anywhere that paints either ring token sets a width other
// than 2px. The drawn result is proven by EveryRingIsTheStackedAccent below.
const RING_CARRIERS = [
  ".rt-BaseButton", ".rt-CheckboxRoot", ".rt-CheckboxGroupItemCheckbox", ".rt-BaseRadioRoot", ".rt-SwitchRoot",
  ".rt-SliderThumb", ".rt-TextFieldRoot", ".rt-TextAreaRoot", ".rt-SelectTrigger", ".rt-SegmentedControlItem",
  ".rt-TabsContent", ".rt-BaseTabListTriggerInner", ".rt-ScrollAreaViewportFocusRing", ".rt-Card",
  ".rt-CheckboxCardsItem", ".rt-RadioCardsItem", ".rt-Link", ".rt-BaseMenuItem", ".rt-SelectItem",
] as const;

export const ControlRingsUseAccent: Story = {
  render: () => <Box data-testid="probe" />,
  play: async () => {
    const covered = new Set<string>();
    const wideRules: string[] = [];
    const walk = function* (rules: CSSRuleList): Generator<CSSStyleRule> {
      for (const r of Array.from(rules)) {
        if (r instanceof CSSStyleRule) yield r;
        if ("cssRules" in r && (r as CSSGroupingRule).cssRules) yield* walk((r as CSSGroupingRule).cssRules);
      }
    };
    for (const sheet of Array.from(document.styleSheets)) {
      let rules: CSSRuleList;
      try {
        rules = sheet.cssRules;
      } catch {
        continue; // cross-origin sheet — skip
      }
      for (const r of walk(rules)) {
        const colour = r.style.outlineColor;
        const width = r.style.outlineWidth;
        if (/--ds-stroke-focus\b/.test(colour) && width && width !== "inherit" && width !== `${FOCUS_RING.widthPx}px`) {
          wideRules.push(`${r.selectorText} { outline-width: ${width} }`);
        }
        if (colour !== `var(${FOCUS_RING.base})`) continue;
        if (!/:focus|\[data-highlighted\]/.test(r.selectorText)) continue;
        for (const c of RING_CARRIERS) if (r.selectorText.includes(c)) covered.add(c);
      }
    }
    const missing = RING_CARRIERS.filter((c) => !covered.has(c));
    const problems = [
      ...missing.map((c) => `${c}: no focus rule sets outline-color: var(${FOCUS_RING.base})`),
      ...wideRules.map((r) => `a ring rule is not ${FOCUS_RING.widthPx}px wide: ${r}`),
    ];
    if (problems.length) throw new Error(`focus ring wiring broken ([[focus-ring]]):\n  ${problems.join("\n  ")}`);
  },
};

// [[button-focus-ring-offset]], the ring GAP. Radix rings solid and classic buttons 2px OUTSIDE the edge but soft, ghost, outline
// and surface at -1px, straddling the edge, where on a light face the ring read as a border at 1.4-1.6:1
// rather than as focus. components.css now gives every standalone non-solid Button and IconButton a 2px
// offset, and leaves an in-field button (`[data-inset]`) on Radix's inset ring so it stays inside the
// input. This proves the ring's PLACE from the cascade: each probe is really focused with
// `focusVisible: true`, so the computed outline-offset is whatever wins, component rules included.
//
// The button probes carry Radix's own class shape (the ScrimRingContrast pattern), in a detached,
// off-screen theme-root clone. Every size step is swept because the ghost step-1 target floor is its own
// rule, and a variant that lost the gap only at one step would pass at the default.
//
// [[input-focus-ring-offset]], ONE GAP FOR EVERY CONTROL. The second half mounts a REAL control of every input family, plus a
// Button, a Tokenizer and a FileInput as the reference, at every uiSize tier (SizeContext, the path each
// component's own size resolves through), focuses it the way a keyboard would, and measures the DRAWN
// gap: from the outer edge of the line the reader sees (the ring carrier's own border, inset box-shadow,
// outer spread shadow or fill) to the ring's inner edge. That is the distance on screen, not
// outline-offset: an inset box-shadow paints inside the padding edge, so a transparent border under it
// widens the gap the offset does not report, and an outer spread shadow narrows it. Every cell must read
// 2px within 0.5px on all four sides, with the ring unclipped by any ancestor. Since [[focus-ring]] the ring's two
// layers are the carrier's pseudo-elements over the carrier's own outline geometry, so the carrier is
// the box readDrawnRing finds and the offset is its own.
const RING_GAP_PX = 2;
const RING_GAP_TOLERANCE_PX = 0.5;
const RING_TIERS: readonly UISize[] = ["small", "medium", "large"];
const RING_SOURCE = createStaticSource([{ id: "0", label: "Apple" }, { id: "1", label: "Banana" }]);
const ringNoop = () => {};
// `focus` names the element the keyboard lands on. The ring carrier is found from it, never named here,
// so a rule that moves the ring to a different box is measured where it now draws.
const RING_CASES: readonly { name: string; focus: string; node: ReactNode }[] = [
  { name: "Button", focus: "button", node: <Button>Save</Button> },
  { name: "TextField", focus: "input", node: <TextField label="Name" defaultValue="Ada Lovelace" /> },
  {
    name: "TextField invalid",
    focus: "input",
    node: <TextField label="Email" defaultValue="ada@@example" validation={{ tone: "error", message: "Enter a valid email." }} />,
  },
  { name: "TextArea", focus: "textarea", node: <TextArea label="Notes" defaultValue="Ship on Friday." /> },
  { name: "NumberInput", focus: "input", node: <NumberInput label="Quantity" defaultValue={3} onValueChange={ringNoop} /> },
  {
    name: "Select",
    focus: ".rt-SelectTrigger",
    node: (
      <Select label="Plan" defaultValue="pro">
        <Select.Trigger />
        <Select.Content>
          <Select.Item value="pro">Pro</Select.Item>
        </Select.Content>
      </Select>
    ),
  },
  {
    name: "MultiSelect",
    focus: "button",
    node: (
      <MultiSelect label="Regions" defaultValue={["eu"]}>
        <MultiSelect.Option value="eu">Europe</MultiSelect.Option>
      </MultiSelect>
    ),
  },
  { name: "DateInput", focus: "input", node: <DateInput label="Due date" onValueChange={ringNoop} /> },
  { name: "DateRangeInput", focus: "button", node: <DateRangeInput label="Report window" onValueChange={ringNoop} /> },
  { name: "TimeInput", focus: "input", node: <TimeInput label="Start time" onValueChange={ringNoop} /> },
  { name: "Typeahead", focus: "input", node: <Typeahead label="Fruit" source={RING_SOURCE} debounceMs={0} /> },
  { name: "ChatComposer", focus: "textarea", node: <ChatComposer label="Message" onSubmit={ringNoop} /> },
  { name: "Tokenizer", focus: "input", node: <Tokenizer label="Fruit list" source={RING_SOURCE} value={[]} onValueChange={ringNoop} /> },
  { name: "FileInput", focus: "input[type=file]", node: <FileInput label="Attachment" onValueChange={ringNoop} /> },
];

type Side = "top" | "right" | "bottom" | "left";
const SIDES: readonly Side[] = ["top", "right", "bottom", "left"];

/** Split a computed box-shadow list into layers: colour alpha, spread, inset. */
function shadowLayers(value: string): { alpha: number; spread: number; inset: boolean }[] {
  if (value === "none") return [];
  const layers: string[] = [];
  let depth = 0;
  let start = 0;
  for (let i = 0; i < value.length; i += 1) {
    if (value[i] === "(") depth += 1;
    else if (value[i] === ")") depth -= 1;
    else if (value[i] === "," && depth === 0) {
      layers.push(value.slice(start, i));
      start = i + 1;
    }
  }
  layers.push(value.slice(start));
  return layers.map((layer) => {
    const colour = layer.match(/[a-z-]+\([^)]*\)|transparent/)?.[0] ?? "transparent";
    const lengths = layer.replace(colour, "").match(/-?[\d.]+px/g)?.map(parseFloat) ?? [];
    return { alpha: parseColor(colour).a, spread: lengths[3] ?? 0, inset: /\binset\b/.test(layer) };
  });
}

/** How far inside the border box the visible edge sits on one side (negative = outside), or null when
 *  the element paints no edge there. The outermost painted line wins. */
function edgeInset(cs: CSSStyleDeclaration, side: Side): number | null {
  const border = parseFloat(cs.getPropertyValue(`border-${side}-width`)) || 0;
  const insets: number[] = [];
  if (border > 0 && parseColor(cs.getPropertyValue(`border-${side}-color`)).a > 0) insets.push(0);
  for (const s of shadowLayers(cs.boxShadow)) {
    if (s.alpha <= 0 || s.spread <= 0) continue;
    insets.push(s.inset ? border : -s.spread);
  }
  if (parseColor(cs.backgroundColor).a > 0) insets.push(cs.backgroundClip === "border-box" ? 0 : border);
  return insets.length ? Math.min(...insets) : null;
}

export const RingGapOutsideEdge: Story = {
  parameters: { a11y: { test: "error" } },
  render: () => (
    <Flex direction="column" gap="6" p="4" data-testid="ring-gap">
      {RING_TIERS.map((tier) => (
        <SizeContext.Provider key={tier} value={tier}>
          <Flex wrap="wrap" gap="5" data-ring-tier={tier}>
            {RING_CASES.map((c) => (
              <Box key={c.name} data-ring-case={c.name} style={{ width: 260 }}>
                {c.node}
              </Box>
            ))}
          </Flex>
        </SizeContext.Provider>
      ))}
    </Flex>
  ),
  play: async ({ canvasElement }) => {
    const root = themeRoot(canvasElement);
    const probe = document.createElement("div");
    for (const a of Array.from(root.attributes)) probe.setAttribute(a.name, a.value);
    probe.style.cssText = "position:fixed;left:-9999px;top:0;width:640px";
    document.body.appendChild(probe);

    const make = (kind: "Button" | "IconButton", variant: string, size: string, inset = false) => {
      const b = document.createElement("button");
      b.className = `rt-reset rt-BaseButton rt-r-size-${size} rt-variant-${variant} rt-${kind}`;
      b.setAttribute("aria-label", `${kind} ${variant} ${size}${inset ? " inset" : ""}`);
      if (inset) b.setAttribute("data-inset", "true");
      probe.appendChild(b);
      return b;
    };
    const ringOf = (b: HTMLButtonElement) => {
      b.focus({ focusVisible: true } as FocusOptions);
      if (!b.matches(":focus-visible")) {
        throw new Error(`${b.getAttribute("aria-label")}: focus({ focusVisible: true }) did not reach :focus-visible, so no ring was measured`);
      }
      const cs = getComputedStyle(b);
      const ring = { style: cs.outlineStyle, offset: parseFloat(cs.outlineOffset), raw: cs.outlineOffset };
      b.blur();
      return ring;
    };

    const lost: string[] = [];
    let cells = 0;
    try {
      for (const kind of ["Button", "IconButton"] as const) {
        for (const variant of ["soft", "ghost", "outline", "surface"]) {
          for (const size of ["1", "2", "3"]) {
            const ring = ringOf(make(kind, variant, size));
            cells += 1;
            if (ring.style === "none" || !(ring.offset >= 2)) {
              lost.push(`${kind} ${variant} size ${size}: outline ${ring.style} at offset ${ring.raw}`);
            }
          }
        }
      }
      const inset = ringOf(make("IconButton", "ghost", "1", true));
      if (inset.style === "none" || inset.offset >= 2) {
        lost.push(`the inset IconButton (in-field ✕): outline ${inset.style} at offset ${inset.raw}, where it must keep Radix's inset ring inside the input`);
      }
    } finally {
      probe.remove();
    }

    if (cells !== 2 * 4 * 3) throw new Error(`measured ${cells} standalone buttons, expected ${2 * 4 * 3}`);
    if (lost.length) {
      throw new Error(
        `focus ring gap lost ([[button-focus-ring-offset]]: every standalone button rings at least 2px outside its edge, and an inset one keeps its ring inside the field):\n  ${lost.join("\n  ")}`,
      );
    }

    // [[input-focus-ring-offset]] — the drawn gap on every real control, every tier.
    const off: string[] = [];
    let measured = 0;
    for (const tier of RING_TIERS) {
      for (const c of RING_CASES) {
        const where = `${c.name} at uiSize ${tier}`;
        const cell = canvasElement.querySelector<HTMLElement>(`[data-ring-tier="${tier}"] [data-ring-case="${c.name}"]`);
        const target = cell?.querySelector<HTMLElement>(c.focus);
        if (!cell || !target) {
          off.push(`${where}: no \`${c.focus}\` rendered to focus`);
          continue;
        }
        target.focus({ focusVisible: true } as FocusOptions);
        try {
          if (!target.matches(":focus-visible")) {
            off.push(`${where}: keyboard focus did not reach :focus-visible, so no ring was measured`);
            continue;
          }
          const carrier = readDrawnRing(target, cell)?.carrier;
          if (!carrier) {
            off.push(`${where}: no element between the focused control and its cell draws a focus ring`);
            continue;
          }
          const cs = getComputedStyle(carrier);
          const offset = parseFloat(cs.outlineOffset);
          const ringWidth = parseFloat(cs.outlineWidth);
          const box = carrier.getBoundingClientRect();
          const sign: Record<Side, number> = { top: 1, right: -1, bottom: -1, left: 1 };
          const gaps: string[] = [];
          for (const side of SIDES) {
            const inset = edgeInset(cs, side);
            if (inset === null) {
              gaps.push(`${side}: the ring carrier paints no edge to measure from`);
              continue;
            }
            // Positions along the axis, measured outward from the border box: the ring's inner edge sits
            // `offset` beyond it, the visible edge `inset` within it.
            const ringInner = box[side] - sign[side] * offset;
            const visible = box[side] + sign[side] * inset;
            const gap = sign[side] * (visible - ringInner);
            if (Math.abs(gap - RING_GAP_PX) > RING_GAP_TOLERANCE_PX) gaps.push(`${side} ${gap.toFixed(2)}px`);
          }
          measured += 1;
          // The ring has to reach the screen: no clipping ancestor may cut its outer edge.
          const reach = offset + ringWidth;
          for (let a = carrier.parentElement; a && a !== canvasElement; a = a.parentElement) {
            const acs = getComputedStyle(a);
            if (acs.overflowX === "visible" && acs.overflowY === "visible") continue;
            const r = a.getBoundingClientRect();
            if (box.left - reach < r.left || box.top - reach < r.top || box.right + reach > r.right || box.bottom + reach > r.bottom) {
              gaps.push(`ring clipped by <${a.tagName.toLowerCase()} class="${a.className}">`);
              break;
            }
          }
          if (gaps.length) off.push(`${where} (ring on .${carrier.className.split(" ").join(".")}, outline-offset ${cs.outlineOffset}): ${gaps.join(", ")}`);
        } finally {
          target.blur();
        }
      }
    }
    if (off.length) {
      throw new Error(
        `focus ring gap off ([[input-focus-ring-offset]]: every focused control draws its ring ${RING_GAP_PX}px ± ${RING_GAP_TOLERANCE_PX}px outside the edge the reader sees, the same gap as a button):\n  ${off.join("\n  ")}`,
      );
    }
    const expected = RING_TIERS.length * RING_CASES.length;
    if (measured !== expected) throw new Error(`measured ${measured} focused controls, expected ${expected}`);
  },
};

// [[tab-panel-focus-clearance]], THE PANEL RING CLEARS THE TAB LIST. The tab panel rings 2px outside its edge ([[input-focus-ring-offset]]), so a panel
// flush under the list drew the ring's top band over the list's own underline. Tabs now owns a 16px gap
// above every panel (components.css). This mounts real Tabs with the panel directly after the list and
// no wrapper, one panel empty and one with text, at every uiSize tier. It focuses each panel with
// keyboard modality and reads the ring off every layer it paints ([[focus-ring]] draws it on ::before and ::after
// outlines). The top edge of each layer must lie at least 2px below the bottom of the tab list.
const PANEL_RING_CLEARANCE_PX = 2;
const PANEL_RING_CASES: readonly { name: string; node: (tier: UISize) => ReactNode }[] = [
  {
    name: "empty panel",
    node: (tier) => (
      <Tabs.Root defaultValue="a">
        <Tabs.List aria-label={`Empty panel tabs ${tier}`}>
          <Tabs.Trigger value="a">Active</Tabs.Trigger>
          <Tabs.Trigger value="b">Other</Tabs.Trigger>
        </Tabs.List>
        <Tabs.Content value="a" forceMount />
        <Tabs.Content value="b" forceMount />
      </Tabs.Root>
    ),
  },
  {
    name: "text panel",
    node: (tier) => (
      <Tabs.Root defaultValue="a">
        <Tabs.List aria-label={`Text panel tabs ${tier}`}>
          <Tabs.Trigger value="a">Active</Tabs.Trigger>
          <Tabs.Trigger value="b">Other</Tabs.Trigger>
        </Tabs.List>
        <Tabs.Content value="a"><Text size="2">Panel text</Text></Tabs.Content>
        <Tabs.Content value="b"><Text size="2">Other text</Text></Tabs.Content>
      </Tabs.Root>
    ),
  },
];

/** The top edge of each painted ring layer on screen, px, read off the box that paints the layer. A
 *  layer rings its box symmetrically, so its top edge is the box centre less half the ring's height. */
function ringLayerTops(ring: DrawnRing): { layer: string; top: number }[] {
  const rect = ring.carrier.getBoundingClientRect();
  const border = parseFloat(getComputedStyle(ring.carrier).borderTopWidth);
  return ring.layers.map((l) => {
    const pcs = l.on === "own" ? null : getComputedStyle(ring.carrier, l.on);
    const boxTop = pcs ? rect.top + border + parseFloat(pcs.top) : rect.top;
    const height = pcs ? parseFloat(pcs.height) : rect.height;
    return { layer: `${l.on} ${l.kind}`, top: boxTop + height / 2 - l.outer[1] / 2 };
  });
}

export const TabPanelRingClearsList: Story = {
  parameters: { a11y: { test: "error" } },
  render: () => (
    <Flex direction="column" gap="6" p="4" data-testid="panel-ring">
      {RING_TIERS.map((tier) => (
        <SizeContext.Provider key={tier} value={tier}>
          <Flex wrap="wrap" gap="6" data-panel-tier={tier}>
            {PANEL_RING_CASES.map((c) => (
              <Box key={c.name} data-panel-case={c.name} style={{ width: 260 }}>
                {c.node(tier)}
              </Box>
            ))}
          </Flex>
        </SizeContext.Provider>
      ))}
    </Flex>
  ),
  play: async ({ canvasElement }) => {
    const off: string[] = [];
    let measured = 0;
    for (const tier of RING_TIERS) {
      for (const c of PANEL_RING_CASES) {
        const where = `${c.name} at uiSize ${tier}`;
        const cell = canvasElement.querySelector<HTMLElement>(`[data-panel-tier="${tier}"] [data-panel-case="${c.name}"]`);
        const list = cell?.querySelector<HTMLElement>(".rt-TabsList");
        const panel = cell?.querySelector<HTMLElement>('.rt-TabsContent[data-state="active"]');
        if (!cell || !list || !panel) {
          off.push(`${where}: no tab list and active panel rendered`);
          continue;
        }
        if (list.nextElementSibling !== panel) {
          off.push(`${where}: the active panel is not the next element after the tab list, so a wrapper or a sibling supplies the space`);
          continue;
        }
        panel.focus({ focusVisible: true } as FocusOptions);
        try {
          if (!panel.matches(":focus-visible")) {
            off.push(`${where}: keyboard focus did not reach :focus-visible, so no ring was measured`);
            continue;
          }
          const ring = readDrawnRing(panel, cell);
          if (!ring || ring.carrier !== panel) {
            off.push(`${where}: the focused panel paints no ring of its own`);
            continue;
          }
          const listBottom = list.getBoundingClientRect().bottom;
          for (const { layer, top } of ringLayerTops(ring)) {
            const clearance = top - listBottom;
            if (!Number.isFinite(clearance)) off.push(`${where}: the ${layer} has no box to measure`);
            else if (clearance < PANEL_RING_CLEARANCE_PX - 0.01) off.push(`${where}: the ${layer} top edge lies ${clearance.toFixed(2)}px below the tab list`);
          }
          measured += 1;
        } finally {
          panel.blur();
        }
      }
    }
    if (off.length) {
      throw new Error(
        `tab panel ring reaches the tab list ([[tab-panel-focus-clearance]]: Tabs owns a 16px gap above the panel, so the ring's top edge lies at least ${PANEL_RING_CLEARANCE_PX}px below the list):\n  ${off.join("\n  ")}`,
      );
    }
    const expected = RING_TIERS.length * PANEL_RING_CASES.length;
    if (measured !== expected) throw new Error(`measured ${measured} focused panels, expected ${expected}`);
  },
};

// [[focus-ring]], EVERY RING AS DRAWN. One real control of every ring family the system draws outside the Radix
// parts (those are FocusRingOnParts in _non-text-contrast.stories.tsx), and one of every mechanism the
// ring uses: two pseudo outlines over a carrier's own box (outset and inset, with and without a real
// border, hoisted to a field root, a chip, a row, a card), inset box-shadows on a chip or card layer, a
// grab zone, a caption chip, the Thumbnail root, and the highlighted menu and Select rows. The play
// clones the specimen into a fresh theme for each of the 27 accents in each appearance (a theme
// re-pointed in place starts transitions, and a read mid-transition reports the colour it left),
// focuses each control with keyboard modality, reads every layer its ring paints, and holds:
//   1. every painted layer 2px wide, and every layer ringing the same outer box;
//   2. the bottom layer the button's own fill, --ds-fill-accent;
//   3. the layers together the stack flattened on that fill, so no family drops the stack;
//   4. that flattened ring at WCAG 3:1 and APCA Lc 30 against every surface a ring sits on.
// A row is highlighted, not focused, so its probe carries Radix's `data-highlighted` as markup.
function RingResizeSpecimen() {
  const rz = useResizable({ orientation: "vertical", defaultSize: 120, minSizePx: 60, maxSizePx: 200, "aria-label": "Resize the panel" });
  return (
    <div style={{ display: "flex", width: 280, height: 60 }}>
      <div style={{ width: rz.size, flexShrink: 0 }} />
      <ResizeHandle separatorProps={rz.separatorProps} onDragStart={rz.onDragStart} />
      <div style={{ flex: 1 }} />
    </div>
  );
}

const RING_FAMILIES: readonly { name: string; focus?: string; highlight?: string; node: ReactNode }[] = [
  { name: "Button solid", focus: "button", node: <Button priority="primary">Save</Button> },
  { name: "Button surface", focus: "button", node: <Button>Cancel</Button> },
  { name: "IconButton ghost", focus: "button", node: <IconButton priority="tertiary" aria-label="More actions"><DotsThree weight="bold" /></IconButton> },
  { name: "TextField", focus: "input", node: <TextField aria-label="Workspace" defaultValue="Acme" /> },
  { name: "TextArea", focus: "textarea", node: <TextArea aria-label="Notes" defaultValue="Ship on Friday." /> },
  {
    name: "Select trigger",
    focus: ".rt-SelectTrigger",
    node: (
      <Select aria-label="Plan" defaultValue="pro">
        <Select.Trigger />
        <Select.Content>
          <Select.Item value="pro">Pro</Select.Item>
        </Select.Content>
      </Select>
    ),
  },
  { name: "FileInput dropzone", focus: "input[type=file]", node: <FileInput label="Attachment" onValueChange={ringNoop} /> },
  { name: "ChatComposer dock", focus: "textarea", node: <ChatComposer label="Message" onSubmit={ringNoop} /> },
  { name: "Tokenizer", focus: "input", node: <Tokenizer label="Fruit list" source={RING_SOURCE} value={[]} onValueChange={ringNoop} /> },
  { name: "Token", focus: ".rt-ds-token-body", node: <Token onClick={ringNoop}>Design</Token> },
  { name: "List row", focus: ".rt-ds-item-body", node: <List><ListItem label="Docs" onClick={ringNoop} /></List> },
  { name: "Collapsible trigger", focus: ".rt-ds-collapsible-trigger", node: <Collapsible trigger="Advanced settings"><Text size="2">Region.</Text></Collapsible> },
  { name: "Link", focus: "a", node: <Text size="2"><Link href="#ring-link">Read the guide</Link></Text> },
  {
    name: "Tabs panel",
    focus: ".rt-TabsContent",
    node: (
      <Tabs.Root defaultValue="a">
        <Tabs.List aria-label="Sections">
          <Tabs.Trigger value="a">Overview</Tabs.Trigger>
        </Tabs.List>
        <Tabs.Content value="a"><Text size="2">Panel</Text></Tabs.Content>
      </Tabs.Root>
    ),
  },
  {
    name: "ScrollArea",
    focus: ".rt-ScrollAreaViewport",
    node: (
      <ScrollArea tabIndex={0} role="region" aria-label="Log" type="always" scrollbars="vertical" style={{ height: 60 }}>
        <Box p="2" style={{ height: 160 }}><Text size="2">Line</Text></Box>
      </ScrollArea>
    ),
  },
  {
    name: "Card as a link",
    focus: "a",
    node: (
      <Card asChild>
        <a href="#ring-card">Project settings</a>
      </Card>
    ),
  },
  { name: "ClickableCard", focus: ".rt-ds-clickable-card-link", node: <ClickableCard href="#ring-clickable" title="Design tokens" /> },
  { name: "Calendar day", focus: ".rt-ds-calendar-day:not([data-outside])", node: <Calendar mode="single" onValueChange={ringNoop} /> },
  { name: "Calendar caption", focus: ".rt-ds-calendar-caption-btn", node: <Calendar mode="single" onValueChange={ringNoop} /> },
  { name: "Thumbnail", focus: ".rt-ds-thumbnail-open", node: <Thumbnail alt="Photo" label="photo.jpg" onClick={ringNoop} /> },
  { name: "ResizeHandle", focus: ".rt-ds-resize-handle", node: <RingResizeSpecimen /> },
  {
    name: "Menu row",
    highlight: ".rt-BaseMenuItem",
    node: (
      <div className="rt-BaseMenuContent rt-r-size-2" style={{ width: 160 }}>
        <div className="rt-BaseMenuItem" data-highlighted="">Rename</div>
      </div>
    ),
  },
  {
    name: "Select row",
    highlight: ".rt-SelectItem",
    node: (
      <div className="radix-themes rt-SelectContent rt-r-size-2" style={{ width: 160 }}>
        <div className="rt-SelectItem" data-highlighted="">Pro</div>
      </div>
    ),
  },
];

export const EveryRingIsTheStackedAccent: Story = {
  render: () => (
    <Flex data-testid="rings" direction="column" gap="4" p="4" style={{ width: 360 }}>
      {RING_FAMILIES.map((f) => (
        <Box key={f.name} data-ring-family={f.name}>
          {f.node}
        </Box>
      ))}
    </Flex>
  ),
  play: async ({ canvasElement }) => {
    const specimen = canvasElement.querySelector<HTMLElement>('[data-testid="rings"]');
    if (!specimen) throw new Error("the ring specimen did not render");
    const root = themeRoot(canvasElement);
    const sRGB = !window.matchMedia?.("(color-gamut: p3)")?.matches;
    const host = document.createElement("div");
    host.style.cssText = "position:fixed;left:-9999px;top:0";
    document.body.appendChild(host);
    const wrong: string[] = [];
    const below: string[] = [];
    let read = 0;
    try {
      for (const appearance of ["light", "dark"] as const) {
        for (const accent of ALL_ACCENTS) {
          host.replaceChildren();
          const theme = document.createElement("div");
          for (const a of Array.from(root.attributes)) {
            if (a.name !== "class" && a.name !== "style") theme.setAttribute(a.name, a.value);
          }
          theme.className = `radix-themes ${appearance}`;
          theme.setAttribute("data-accent-color", accent);
          theme.appendChild(specimen.cloneNode(true));
          host.appendChild(theme);
          // The Select row probe is its own theme root (Radix renders the class onto the panel), so it
          // takes every attribute the theme carries, as Radix's portal does: the accent, the appearance
          // and the neutral, which the gray accent's fill is pinned by ([[text-on-solid-fill-contrast]]).
          for (const inner of Array.from(theme.querySelectorAll<HTMLElement>(".radix-themes"))) {
            for (const a of Array.from(theme.attributes)) {
              if (a.name !== "class" && a.name !== "style") inner.setAttribute(a.name, a.value);
            }
            inner.classList.add(appearance);
          }
          for (const family of RING_FAMILIES) {
            const where = `${appearance}/${accent} ${family.name}`;
            const cell = theme.querySelector<HTMLElement>(`[data-ring-family="${family.name}"]`);
            const target = cell?.querySelector<HTMLElement>(family.focus ?? family.highlight ?? "");
            if (!cell || !target) {
              wrong.push(`${where}: nothing matched ${family.focus ?? family.highlight}`);
              continue;
            }
            if (family.focus) target.focus({ focusVisible: true, preventScroll: true } as FocusOptions);
            try {
              if (family.focus && !target.matches(":focus-visible")) {
                wrong.push(`${where}: keyboard focus did not reach :focus-visible, so no ring was measured`);
                continue;
              }
              for (const animation of document.getAnimations()) animation.finish();
              const drawn = readDrawnRing(target, cell);
              if (!drawn) {
                wrong.push(`${where}: no box between the control and its cell draws a ring`);
                continue;
              }
              const { problems, colour } = checkDrawnRing(drawn);
              read += 1;
              for (const p of problems) wrong.push(`${where}: ${p}`);
              for (const surface of FOCUS_SURFACES) {
                const under = surfaceColour(drawn.carrier, surface);
                const ratio = contrastRatio(colour, under);
                const lc = apcaContrast(colour, under);
                if (ratio < FOCUS_RING.min || lc < FOCUS_RING.minLc) {
                  below.push(`${where} on the ${surface.name}: ${ratio.toFixed(2)}:1, Lc ${lc.toFixed(1)} (ring ${rgb(colour)})`);
                }
              }
            } finally {
              target.blur();
            }
          }
        }
      }
    } finally {
      host.remove();
    }
    const expected = 2 * ALL_ACCENTS.length * RING_FAMILIES.length;
    if (wrong.length) throw new Error(`a focus ring is not the [[focus-ring]] ring as drawn:\n  ${wrong.join("\n  ")}`);
    if (read !== expected) throw new Error(`read ${read} rings, expected ${expected}`);
    if (!sRGB) {
      console.info("[Focus] P3 display — drawn ring contrast assert enforced headless/CI only.");
      return;
    }
    if (below.length) {
      throw new Error(`a drawn focus ring below WCAG ${FOCUS_RING.min}:1 or APCA Lc ${FOCUS_RING.minLc} ([[focus-ring]]):\n  ${below.join("\n  ")}`);
    }
  },
};
