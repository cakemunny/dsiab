import { useState } from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { Box, Theme } from "@radix-ui/themes";
import { Slider } from "./Slider";
import { Field } from "./Field";

/* Test-only behavior for Slider — kept OUT of the docs stories (System/Choice/Slider) so viewing a docs
   page never drives the control on view (Storybook runs a story's play on view). Underscore-prefixed
   file → guard-exempt, grouped under _internal. */

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
async function waitFor<T>(fn: () => T | null | undefined | false, timeout = 1500): Promise<T> {
  const t0 = performance.now();
  for (;;) {
    const r = fn();
    if (r) return r as T;
    if (performance.now() - t0 > timeout) throw new Error("waitFor: timed out");
    await sleep(20);
  }
}

/** Drive a controlled React input the way a keyboard does: set the value through the native setter (so
 *  React's value tracker sees a change) and dispatch a bubbling input event. */
function typeInto(input: HTMLInputElement, text: string) {
  const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value")?.set;
  if (!setter) throw new Error("HTMLInputElement value setter unavailable");
  setter.call(input, text);
  input.dispatchEvent(new Event("input", { bubbles: true }));
}

const pressEnter = (el: HTMLElement) =>
  el.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", bubbles: true }));

const meta: Meta<typeof Slider> = {
  title: "_internal/Slider behavior",
  component: Slider,
  parameters: { controls: { disable: true } },
};
export default meta;
type Story = StoryObj<typeof Slider>;

const STEP = 5;
const START = 40;

/** (a) Keyboard stepping: focus the thumb, then ArrowRight / ArrowLeft move aria-valuenow by exactly
 *  `step`. The keydown handler lives on the Slider root, so a bubbling keydown from the focused thumb
 *  drives it — the same path a real key press takes. */
export const KeyboardSteps: Story = {
  render: () => (
    <Box p="5">
      <Box style={{ width: 320 }}>
        <Slider defaultValue={[START]} step={STEP} min={0} max={100} aria-label="Keyboard step probe" />
      </Box>
    </Box>
  ),
  play: async ({ canvasElement }) => {
    const thumb = canvasElement.querySelector<HTMLElement>('[role="slider"]');
    if (!thumb) throw new Error('the slider thumb must carry role="slider"');

    const now = () => Number(thumb.getAttribute("aria-valuenow"));
    if (now() !== START) throw new Error(`the thumb must start at ${START}; got ${now()}`);

    thumb.focus();
    if (document.activeElement !== thumb) throw new Error("Tab/focus must land on the thumb");

    thumb.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowRight", bubbles: true }));
    await waitFor(() => now() === START + STEP);

    thumb.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowLeft", bubbles: true }));
    await waitFor(() => now() === START);

    thumb.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowRight", bubbles: true }));
    await waitFor(() => now() === START + STEP);
  },
};

function TypedValue() {
  const [value, setValue] = useState([20]);
  return (
    <Box p="5" style={{ width: 380 }}>
      <Field.Root>
        <Field.Label>Opacity</Field.Label>
        <Slider value={value} onValueChange={setValue} showInput min={0} max={100} step={1} />
      </Field.Root>
    </Box>
  );
}

/** (b) Typing a value in the paired numeric box MOVES the thumb — the whole point of the pairing. */
export const TypedInputMovesThumb: Story = {
  render: () => <TypedValue />,
  play: async ({ canvasElement }) => {
    const thumb = canvasElement.querySelector<HTMLElement>('[role="slider"]');
    const input = canvasElement.querySelector<HTMLInputElement>(".rt-ds-slider-input input");
    if (!thumb) throw new Error('the slider thumb must carry role="slider"');
    if (!input) throw new Error("showInput must render a paired numeric box");

    const now = () => Number(thumb.getAttribute("aria-valuenow"));
    if (now() !== 20) throw new Error(`the thumb must start at 20; got ${now()}`);
    if (input.value !== "20") throw new Error(`the box must report the value; got "${input.value}"`);

    // A valid, in-range, on-step number commits live per keystroke.
    input.focus();
    typeInto(input, "63");
    await waitFor(() => now() === 63);
    await waitFor(() => input.value === "63");
  },
};

/** (c) A typed value beyond the bound CLAMPS to it on commit (the documented divergence from the number
 *  field's reject-never-clamp rule — a slider's bounds are visible, so typing past the end does what
 *  dragging past the end does). */
export const TypedValueClamps: Story = {
  render: () => <TypedValue />,
  play: async ({ canvasElement }) => {
    const thumb = canvasElement.querySelector<HTMLElement>('[role="slider"]');
    const input = canvasElement.querySelector<HTMLInputElement>(".rt-ds-slider-input input");
    if (!thumb || !input) throw new Error("the specimen must render a thumb and a paired numeric box");
    const now = () => Number(thumb.getAttribute("aria-valuenow"));

    input.focus();
    typeInto(input, "150");
    // While the typed text is out of range the thumb has NOT moved and the box flags itself invalid.
    await waitFor(() => input.getAttribute("aria-invalid") === "true");
    if (now() === 150) throw new Error("an out-of-range typed value must not move the thumb before commit");

    pressEnter(input);
    // Commit clamps to max, and the box shows the corrected value.
    await waitFor(() => now() === 100);
    await waitFor(() => input.value === "100");
    if (input.hasAttribute("aria-invalid")) throw new Error("aria-invalid must clear once the value commits");

    // The correction is announced assertively — never silent.
    const live = document.querySelector<HTMLElement>('[data-ds-live-region="assertive"]');
    if (!live) throw new Error("the clamp must announce through the assertive live region");
    await waitFor(() => live.textContent?.includes("100"));
    if (!live.textContent?.includes("150")) {
      throw new Error(`the announcement must name what was typed; got "${live.textContent}"`);
    }
  },
};

const SNAP_MARKS = [
  { value: 320, label: "Thumb" },
  { value: 640, label: "Small" },
  { value: 1024, label: "Web" },
  { value: 1600, label: "Large" },
  { value: 2048, label: "Print" },
];

function SnapToMarks() {
  const [value, setValue] = useState([1024]);
  return (
    <Box p="5" style={{ width: 400 }}>
      <Slider
        value={value}
        onValueChange={setValue}
        min={320}
        max={2048}
        step={null}
        marks={SNAP_MARKS}
        aria-label="Export width"
      />
    </Box>
  );
}

/** (d) step={null} snaps to the nearest MARK: the arrow keys walk stop to stop rather than by a fixed
 *  amount (which, against irregular detents, would snap straight back and read as a dead control). */
export const SnapsToMarks: Story = {
  render: () => <SnapToMarks />,
  play: async ({ canvasElement }) => {
    const thumb = canvasElement.querySelector<HTMLElement>('[role="slider"]');
    if (!thumb) throw new Error('the slider thumb must carry role="slider"');
    const now = () => Number(thumb.getAttribute("aria-valuenow"));
    if (now() !== 1024) throw new Error(`the thumb must start on the 1024 mark; got ${now()}`);

    // The mark layer is decorative: hidden from AT and inert to the pointer.
    const marks = canvasElement.querySelector<HTMLElement>(".rt-ds-slider-marks");
    if (!marks) throw new Error("marks must render a tick layer");
    if (marks.getAttribute("aria-hidden") !== "true") throw new Error("the mark layer must be aria-hidden");
    if (getComputedStyle(marks).pointerEvents !== "none") throw new Error("the mark layer must not take pointer events");
    if (marks.querySelectorAll(".rt-ds-slider-tick").length !== SNAP_MARKS.length) {
      throw new Error("one tick per mark");
    }

    thumb.focus();
    // One stop forward: 1024 → 1600, NOT 1025.
    thumb.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowRight", bubbles: true }));
    await waitFor(() => now() === 1600);
    // The detent's name is what AT hears, not the raw number.
    if (thumb.getAttribute("aria-valuetext") !== "Large") {
      throw new Error(`aria-valuetext must carry the mark label; got "${thumb.getAttribute("aria-valuetext")}"`);
    }
    // One stop back.
    thumb.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowLeft", bubbles: true }));
    await waitFor(() => now() === 1024);
    // End jumps to the last stop.
    thumb.dispatchEvent(new KeyboardEvent("keydown", { key: "End", bubbles: true }));
    await waitFor(() => now() === 2048);
  },
};

function PriceRange() {
  const [value, setValue] = useState([250, 750]);
  return (
    <Box p="5" style={{ width: 460 }}>
      <Field.Root>
        <Field.Label>Price</Field.Label>
        <Slider value={value} onValueChange={setValue} min={0} max={1000} step={10} showInput />
      </Field.Root>
    </Box>
  );
}

/** (e) A range names each thumb AND constrains each thumb's reported bounds to its neighbour — the
 *  multi-thumb pattern the primitive does not implement (it reports the global min/max on both). */
export const RangeAria: Story = {
  render: () => <PriceRange />,
  play: async ({ canvasElement }) => {
    const thumbs = canvasElement.querySelectorAll<HTMLElement>('[role="slider"]');
    if (thumbs.length !== 2) throw new Error(`a two-entry value must render two thumbs; got ${thumbs.length}`);
    const [lo, hi] = Array.from(thumbs);

    // Each thumb is named "<its own role>, <the field label>" via two referenced ids.
    for (const [thumb, name] of [[lo, "Minimum"], [hi, "Maximum"]] as const) {
      const ids = (thumb.getAttribute("aria-labelledby") ?? "").split(" ").filter(Boolean);
      if (ids.length !== 2) throw new Error(`${name} thumb must be labelled by its own name AND the field label`);
      const text = ids.map((id) => document.getElementById(id)?.textContent ?? "").join(" ");
      if (!text.includes(name)) throw new Error(`the thumb must announce "${name}"; resolved to "${text}"`);
      if (!text.includes("Price")) throw new Error(`the thumb must announce the field label; resolved to "${text}"`);
    }

    // Neighbour-constrained bounds: the low thumb's ceiling is the high value, and vice versa.
    if (lo.getAttribute("aria-valuemax") !== "750") {
      throw new Error(`the low thumb's aria-valuemax must be the high value; got ${lo.getAttribute("aria-valuemax")}`);
    }
    if (hi.getAttribute("aria-valuemin") !== "250") {
      throw new Error(`the high thumb's aria-valuemin must be the low value; got ${hi.getAttribute("aria-valuemin")}`);
    }
    if (lo.getAttribute("aria-valuemin") !== "0" || hi.getAttribute("aria-valuemax") !== "1000") {
      throw new Error("the outer bounds must stay the scale's own min/max");
    }

    // The pair announces as one control.
    const group = canvasElement.querySelector<HTMLElement>('.rt-ds-slider-field[role="group"]');
    if (!group) throw new Error("a range must carry role=group so the two thumbs announce as one control");

    // Moving the high thumb re-constrains the low thumb's ceiling — the bounds are live, not static.
    hi.focus();
    hi.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowLeft", bubbles: true }));
    await waitFor(() => hi.getAttribute("aria-valuenow") === "740");
    await waitFor(() => lo.getAttribute("aria-valuemax") === "740");

    // And each box is bounded by its neighbour too, mirrored into the native attributes.
    const inputs = canvasElement.querySelectorAll<HTMLInputElement>(".rt-ds-slider-input input");
    if (inputs.length !== 2) throw new Error(`a range must render two value boxes; got ${inputs.length}`);
    if (inputs[0].max !== "740") throw new Error(`the low box's native max must mirror the neighbour; got ${inputs[0].max}`);
    if (inputs[1].min !== "250") throw new Error(`the high box's native min must mirror the neighbour; got ${inputs[1].min}`);
  },
};

const VERTICAL_MARKS = [
  { value: 0, label: "Cold" },
  { value: 50, label: "Warm" },
  { value: 100, label: "Hot" },
];

/** (f) Vertical: the mark layer resolves against the SAME edge the thumb does (bottom, not left), so a
 *  tick and the thumb resting on it share a centre line in both orientations. */
export const VerticalMarks: Story = {
  render: () => (
    <Box p="5" style={{ height: 260 }}>
      <Slider
        defaultValue={[50]}
        orientation="vertical"
        step={50}
        marks={VERTICAL_MARKS}
        aria-label="Vertical detents"
      />
    </Box>
  ),
  play: async ({ canvasElement }) => {
    const thumb = canvasElement.querySelector<HTMLElement>('[role="slider"]');
    const ticks = [...canvasElement.querySelectorAll<HTMLElement>(".rt-ds-slider-tick")];
    if (!thumb) throw new Error('the slider thumb must carry role="slider"');
    if (ticks.length !== VERTICAL_MARKS.length) throw new Error(`one tick per mark; got ${ticks.length}`);
    if (thumb.getAttribute("aria-orientation") !== "vertical") throw new Error("the thumb must report a vertical orientation");

    const centreY = (el: Element) => {
      const r = el.getBoundingClientRect();
      return r.top + r.height / 2;
    };
    const aligned = (a: number, b: number) => Math.abs(a - b) < 0.5;

    thumb.focus();
    // End → max, which sits at the TOP of a vertical track: it must land on the last tick.
    thumb.dispatchEvent(new KeyboardEvent("keydown", { key: "End", bubbles: true }));
    await waitFor(() => thumb.getAttribute("aria-valuenow") === "100");
    await waitFor(() => aligned(centreY(thumb), centreY(ticks[ticks.length - 1])));

    // Home → min, at the bottom: the first tick.
    thumb.dispatchEvent(new KeyboardEvent("keydown", { key: "Home", bubbles: true }));
    await waitFor(() => thumb.getAttribute("aria-valuenow") === "0");
    await waitFor(() => aligned(centreY(thumb), centreY(ticks[0])));
  },
};

/** (g) minStepsBetweenThumbs BLOCKS the move rather than pushing the neighbour — worth pinning, because
 *  the push behaviour is what some other slider libraries do and the two feel completely different. */
export const GapBlocksNotPushes: Story = {
  render: () => {
    const Demo = () => {
      const [value, setValue] = useState([40, 60]);
      return (
        <Box p="5" style={{ width: 400 }}>
          <Slider value={value} onValueChange={setValue} step={1} minStepsBetweenThumbs={20} aria-label="Gap probe" />
        </Box>
      );
    };
    return <Demo />;
  },
  play: async ({ canvasElement }) => {
    const [lo, hi] = [...canvasElement.querySelectorAll<HTMLElement>('[role="slider"]')];
    if (!lo || !hi) throw new Error("a two-entry value must render two thumbs");
    const at = (t: HTMLElement) => Number(t.getAttribute("aria-valuenow"));
    if (at(lo) !== 40 || at(hi) !== 60) throw new Error(`the pair must start 40/60; got ${at(lo)}/${at(hi)}`);

    lo.focus();
    // The gap is already at its minimum (20), so the next step forward is refused outright.
    lo.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowRight", bubbles: true }));
    await sleep(80);
    if (at(lo) !== 40) throw new Error(`a blocked move must leave the thumb where it was; got ${at(lo)}`);
    if (at(hi) !== 60) throw new Error(`a blocked move must NOT push the neighbour; got ${at(hi)}`);

    // Moving away from the neighbour is still free.
    lo.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowLeft", bubbles: true }));
    await waitFor(() => at(lo) === 39);
  },
};

/* The paired box is sized from the SCALE, not the current value — so it never resizes as the value grows
   and never truncates at the bound. That width is MEASURED in the box's own type (a hidden stand-in
   carrying the widest strings the scale can hold; the browser lays them out, the component reads the
   result back), which is what lets this guard cover more than the one family it was written against.
   Each case renders its box already sitting on the widest value its scale can legally hold, and the play
   asserts the text is not clipped. The matrix runs every scale across all three size lanes; a second
   pass re-runs it under deliberately different type — a serif, a wide monospace, a re-scaled theme —
   which is exactly the change a computed per-digit width could not survive. */

type FitEnv = "system" | "serif" | "mono" | "scaled";

const ENV_FAMILY: Record<"serif" | "mono", string> = {
  serif: 'Georgia, "Times New Roman", serif',
  mono: '"Courier New", Courier, monospace',
};

/** Puts one case's box in a different type environment WITHOUT touching anything outside itself: a
 *  family swap rides `--default-font-family` (the variable the field root resolves its family from) and a
 *  scale change rides a nested Theme, which re-derives every font-size and space step for its own
 *  subtree. Both are scoped to this element — nothing leaks into the next case, or into the page. */
function FitCase({
  name,
  env = "system",
  widest,
  children,
}: {
  name: string;
  env?: FitEnv;
  widest: string[];
  children: React.ReactNode;
}) {
  const body = (
    <div
      data-fit-case={name}
      data-fit-env={env}
      data-fit-widest={widest.join(",")}
      style={env === "serif" || env === "mono" ? ({ "--default-font-family": ENV_FAMILY[env] } as React.CSSProperties) : undefined}
    >
      <Field.Root>
        <Field.Label>{name}</Field.Label>
        {children}
      </Field.Root>
    </div>
  );
  return env === "scaled" ? (
    <Theme scaling="110%" hasBackground={false}>{body}</Theme>
  ) : (
    body
  );
}

/** The scales the box has to hold, each one already resting on the widest value it can legally show. */
const FIT_RANGES: {
  name: string;
  widest: string[];
  props: Partial<Parameters<typeof Slider>[0]>;
}[] = [
  { name: "0–100", widest: ["100"], props: { min: 0, max: 100, step: 1, defaultValue: [100] } },
  { name: "0–100 %", widest: ["100"], props: { min: 0, max: 100, step: 1, defaultValue: [100], formatValue: (v: number) => `${v}%` } },
  { name: "0–1000", widest: ["1000"], props: { min: 0, max: 1000, step: 1, defaultValue: [1000] } },
  { name: "$0–1000", widest: ["1000"], props: { min: 0, max: 1000, step: 1, defaultValue: [1000], formatValue: (v: number) => `$${v}` } },
  { name: "0–1 by 0.01", widest: ["0.99"], props: { min: 0, max: 1, step: 0.01, defaultValue: [0.99] } },
  { name: "-50–50", widest: ["-50"], props: { min: -50, max: 50, step: 1, defaultValue: [-50] } },
];

const FIT_LANES = ["1", "2", "3"] as const;
const FIT_ENVS: FitEnv[] = ["serif", "mono", "scaled"];

/** (h) The paired box FITS the widest value its scale can legally hold — the regression guard on the
 *  box's width. Every case is rendered already sitting on that value, and the play asserts the text is
 *  not clipped (`scrollWidth <= clientWidth`); a box one character too narrow truncates the value at the
 *  very moment the reader most needs to read it.
 *
 *  The guard runs in both directions, because both directions are defects:
 *    • TOO NARROW → clipping, asserted per case (and the assertion is itself proved live at the end of
 *      the play, by starving one box a whole character and requiring the check to fire — a fit check
 *      that cannot fail guards nothing).
 *    • TOO WIDE → dead space. The box must hug its widest value, not be padded out just in case, so each
 *      one is also held to a ceiling a few pixels above the text it carries. */
export const InputFitsItsBound: Story = {
  render: () => (
    <Box p="5" style={{ display: "flex", flexDirection: "column", gap: 20, width: 520 }}>
      {FIT_LANES.map((lane) =>
        FIT_RANGES.map(({ name, widest, props }) => (
          <FitCase key={`${lane}-${name}`} name={`${name} · size ${lane}`} widest={widest}>
            <Slider showInput size={lane} {...props} />
          </FitCase>
        )),
      )}
      {FIT_ENVS.map((env) =>
        FIT_RANGES.map(({ name, widest, props }) => (
          <FitCase key={`${env}-${name}`} name={`${name} · ${env}`} env={env} widest={widest}>
            <Slider showInput size="2" {...props} />
          </FitCase>
        )),
      )}
      {(["flank", "end"] as const).map((position) => (
        <FitCase key={position} name={`range · ${position}`} widest={["-1000", "1000"]}>
          <Slider
            showInput
            inputPosition={position}
            min={-1000}
            max={1000}
            step={1}
            defaultValue={[-1000, 1000]}
          />
        </FitCase>
      ))}
    </Box>
  ),
  play: async ({ canvasElement }) => {
    const cases = [...canvasElement.querySelectorAll<HTMLElement>("[data-fit-case]")];
    const expected = FIT_LANES.length * FIT_RANGES.length + FIT_ENVS.length * FIT_RANGES.length + 2;
    if (cases.length !== expected) {
      throw new Error(`the matrix must render ${expected} cases; got ${cases.length}`);
    }

    for (const scope of cases) {
      const name = scope.getAttribute("data-fit-case");
      const widest = (scope.getAttribute("data-fit-widest") ?? "").split(",");
      const inputs = [...scope.querySelectorAll<HTMLInputElement>(".rt-ds-slider-input input")];
      if (inputs.length !== widest.length) {
        throw new Error(`${name}: expected ${widest.length} paired box(es); got ${inputs.length}`);
      }

      for (const [i, input] of inputs.entries()) {
        // The box is already resting on the widest value its scale can hold — no typing needed, and no
        // resize to wait out, because the width is fixed to the scale rather than to the value.
        if (input.value !== widest[i]) {
          throw new Error(`${name}: box ${i} must rest on "${widest[i]}"; got "${input.value}"`);
        }
        if (input.scrollWidth > input.clientWidth) {
          throw new Error(
            `${name}: the box clips its widest legal value "${widest[i]}" — ` +
              `scrollWidth ${input.scrollWidth} > clientWidth ${input.clientWidth}`,
          );
        }
        // And the other way: a box padded out "just in case" is the defect this width replaced. The
        // ceiling is the box's own inset plus a few pixels of rounding — loose enough that no font can
        // trip it, tight enough that a re-introduced per-character budget would.
        const style = getComputedStyle(input);
        const inset = parseFloat(style.paddingLeft) + parseFloat(style.paddingRight);
        const sizer = scope.querySelectorAll<HTMLElement>(".rt-ds-slider-input-sizer")[i];
        if (!sizer) throw new Error(`${name}: the box must render its measuring stand-in`);
        const text = sizer.getBoundingClientRect().width;
        const content = parseFloat(style.width) - inset;
        if (content > text + 4) {
          throw new Error(
            `${name}: the box is padded ${(content - text).toFixed(2)}px past its widest value ` +
              `(${content.toFixed(2)}px of room for ${text.toFixed(2)}px of text)`,
          );
        }
      }
    }

    // Prove the fit check can still fail. Starve the first box a whole character and it must report
    // clipping; if it doesn't, every "fits" above was vacuous.
    const probe = cases[0].querySelector<HTMLInputElement>(".rt-ds-slider-input input");
    const probeSizer = cases[0].querySelector<HTMLElement>(".rt-ds-slider-input-sizer");
    if (!probe || !probeSizer) throw new Error("the first case must render a box and its stand-in");
    const chars = Math.max(...(probeSizer.textContent ?? "0").split("\n").map((l) => l.length), 1);
    const oneChar = probeSizer.getBoundingClientRect().width / chars;
    const full = parseFloat(getComputedStyle(probe).width);
    probe.style.width = `${full - oneChar}px`;
    const starved = probe.scrollWidth > probe.clientWidth;
    probe.style.width = "";
    if (!starved) {
      throw new Error(
        "the fit check is vacuous: a box starved a whole character still reported scrollWidth " +
          `${probe.scrollWidth} <= clientWidth ${probe.clientWidth}`,
      );
    }
  },
};
