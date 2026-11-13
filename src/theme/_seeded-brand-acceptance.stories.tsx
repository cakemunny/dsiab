import { flushSync } from "react-dom";
import { createRoot } from "react-dom/client";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { Box, Flex } from "@radix-ui/themes";
import { Provider } from "./Provider";
import { Button } from "../components/ui/Button";
import { assessBrand } from "../palette/assessment";
import { labelOnFill } from "../palette/buttonFill";
import { BLACK_A, WHITE_A } from "../palette/helperLayers";
import { generateBrandScale } from "../palette/generate";
import { parseSeed } from "../palette/parseSeed";
import { contrastRatio, flatten, parseColor, resolveColor, SOLID_TEXT_MIN, type RGBA } from "../foundations/_assert";
import { APCA_LC, apcaContrast } from "../foundations/apca";

/* THE CUSTOM-ACCENT ACCEPTANCE TABLE ([[seeded-brand-writer]], [[seeded-sweep-lane]]).
   Underscore-prefixed, so the docs guards skip it, grouped under _internal.

   The named examples of the custom-accent plan, each measured on a mounted seeded
   Provider, with a real filled Button and a real destructive Button, in light, in
   dark and under an inherited appearance (no class on the theme root, `.dark` on
   an ancestor). Each row holds the values the plan's table states, as literals:
   what a person sees, not what the writer happened to write. Where the plan's
   census and the ruled searches disagreed, the row holds the search's value and
   says so ([[seeded-brand-writer]]).

   The floors on every surface, every neutral and both scrims are the generated-colour
   sweeps' to hold ([[seeded-sweep-lane]]). This table holds the named values.

   Press is read off the painted fill with the generator's own press model
   (`labelOnFill`), because no browser can be made to hold `:active` on a clone,
   and the guards model Radix's press filter nowhere else. Rest and hover are read
   in the browser, with the guards' WCAG and APCA. */

const meta: Meta = { title: "_internal/Seeded brand acceptance", parameters: { controls: { disable: true } } };
export default meta;
type Story = StoryObj;

type Mode = { name: string; appearance: "light" | "dark" | "inherit"; dark: boolean };
const MODES: Mode[] = [
  { name: "light", appearance: "light", dark: false },
  { name: "dark", appearance: "dark", dark: true },
  { name: "inherited dark", appearance: "inherit", dark: true },
];

const NONE = "rgba(0, 0, 0, 0)";
const B = (n: number) => BLACK_A[n - 1]!, W = (n: number) => WHITE_A[n - 1]!;
const step = (seed: string, appearance: "light" | "dark", n: number) => {
  const p = parseSeed(seed);
  if (!p.ok) throw new Error(`${seed} did not parse`);
  return generateBrandScale(p.rgb, appearance).solid[n - 1]!;
};

/** One expected value: a role read off the theme root, or the filled Button's paint. */
type Want = { what: string; read: "button-fill" | "button-ink" | `--${string}`; value: string };
type Row = { seed: string; modes: ("light" | "dark")[]; wants: Want[] };

const ROWS: Row[] = [
  {
    seed: "#fff59d", modes: ["light"], wants: [
      { what: "the filled Button", read: "button-fill", value: "#fff59d" },
      { what: "its label", read: "button-ink", value: "#21201c" },
      { what: "the focus ring's page stack", read: "--accent-ring-stack", value: B(7) },
      { what: "the ring's light-scrim stack", read: "--accent-ring-stack-scrim-light", value: B(9) },
      { what: "the part edge", read: "--accent-part-edge", value: B(7) },
    ],
  },
  {
    // The plan's census put the stroke at step 6; answer K's rule picks step 7, as on dark yellow.
    seed: "#fff59d", modes: ["dark"], wants: [
      { what: "the filled Button", read: "button-fill", value: "#fff59d" },
      { what: "the switch thumb's stroke, step 7", read: "--accent-thumb-stroke", value: step("#fff59d", "dark", 7) },
    ],
  },
  {
    // The plan's census put the dark ring at white-a4; the ruled search on #2b72e5 picks white-a3.
    seed: "#3b82f6", modes: ["light", "dark"], wants: [
      { what: "the indicator", read: "--accent-indicator", value: "#3b82f6" },
      { what: "the filled Button", read: "button-fill", value: "#2b72e5" },
      { what: "its label", read: "button-ink", value: "#ffffff" },
      { what: "the focus ring's base", read: "--ds-stroke-focus", value: "#2b72e5" },
    ],
  },
  { seed: "#3b82f6", modes: ["light"], wants: [{ what: "the focus ring's page stack", read: "--accent-ring-stack", value: NONE }] },
  { seed: "#3b82f6", modes: ["dark"], wants: [{ what: "the focus ring's page stack", read: "--accent-ring-stack", value: W(3) }] },
  {
    seed: "#0b1a3a", modes: ["dark"], wants: [
      { what: "the filled Button", read: "button-fill", value: "#0b1a3a" },
      { what: "the indicator", read: "--accent-indicator", value: "#0b1a3a" },
      { what: "its label", read: "button-ink", value: "#ffffff" },
      { what: "the focus ring's page stack", read: "--accent-ring-stack", value: W(7) },
      { what: "the part edge", read: "--accent-part-edge", value: W(7) },
    ],
  },
  { seed: "#6e56cf", modes: ["light", "dark"], wants: [{ what: "the filled Button", read: "button-fill", value: "#6e56cf" }] },
];

/** The seeds whose destructive Button is held at 4.5:1 and Lc 60 at rest, on hover and on press. */
const DANGER_SEEDS = ["#6e56cf", "#fff59d", "#3b82f6", "#0b1a3a", "#c8102e"];

const same = (a: RGBA, b: RGBA) =>
  (a.a < 0.01 && b.a < 0.01) ||
  (Math.abs(a.a - b.a) <= 0.01 && Math.abs(a.r - b.r) <= 1 && Math.abs(a.g - b.g) <= 1 && Math.abs(a.b - b.b) <= 1);
const show = (c: RGBA) => `rgba(${Math.round(c.r)}, ${Math.round(c.g)}, ${Math.round(c.b)}, ${c.a.toFixed(2)})`;

function Specimen() {
  return (
    <Flex gap="3" p="2">
      <Button priority="primary" data-part="primary">Save</Button>
      <Button priority="primary" tone="danger" data-part="danger">Delete</Button>
    </Flex>
  );
}

/** Mount `seed` in every mode, run `read` on each theme root, and unmount. */
function withSeed(host: HTMLElement, seed: string, read: (theme: HTMLElement, mode: Mode) => void): void {
  const box = document.createElement("div");
  host.appendChild(box);
  const root = createRoot(box);
  try {
    flushSync(() => root.render(
      <>
        {MODES.map((m) => (
          <div key={m.name} className={m.appearance === "inherit" ? "dark" : undefined}>
            <Provider accentColor={{ seed }} appearance={m.appearance}>
              <Box data-mode={m.name}><Specimen /></Box>
            </Provider>
          </div>
        ))}
      </>,
    ));
    for (const m of MODES) read(box.querySelector(`[data-mode="${m.name}"]`)!.closest<HTMLElement>(".radix-themes")!, m);
  } finally {
    root.unmount();
    box.remove();
  }
}

export const NamedExamples: Story = {
  render: () => <Box data-testid="host" />,
  play: async ({ canvasElement }) => {
    const host = canvasElement.querySelector<HTMLElement>('[data-testid="host"]')!;
    const rows: string[] = [];
    let read = 0;
    for (const row of ROWS) {
      withSeed(host, row.seed, (theme, mode) => {
        if (!row.modes.includes(mode.dark ? "dark" : "light")) return;
        const button = theme.querySelector<HTMLElement>('[data-part="primary"]')!;
        // The Button must paint the fill role, or "button-fill" would read some other paint.
        if (!same(parseColor(getComputedStyle(button).backgroundColor), resolveColor(theme, "--ds-fill-accent"))) {
          throw new Error(`${row.seed} ${mode.name}: the filled Button does not paint --ds-fill-accent`);
        }
        for (const w of row.wants) {
          read++;
          const got = w.read === "button-fill" ? parseColor(getComputedStyle(button).backgroundColor)
            : w.read === "button-ink" ? parseColor(getComputedStyle(button).color)
            : resolveColor(theme, w.read);
          if (!same(got, parseColor(w.value))) rows.push(`${row.seed} ${mode.name}: ${w.what} reads ${show(got)}, the table says ${w.value}`);
        }
      });
    }
    // #fff59d's dark text steps 11 and 12 are one colour, and the assessment says so.
    const pale = assessBrand("#fff59d");
    read++;
    if (!pale.ok || pale.assessment.dark.text.distinct) rows.push("#fff59d dark: the assessment does not report steps 11 and 12 as one colour");
    const want = ROWS.reduce((n, r) => n + r.wants.length * MODES.filter((m) => r.modes.includes(m.dark ? "dark" : "light")).length, 0) + 1;
    if (read !== want) throw new Error(`read ${read} values, expected ${want}`);
    if (rows.length) throw new Error(`${rows.length} of ${read} acceptance values differ ([[seeded-brand-writer]]):\n${rows.join("\n")}`);
  },
};

export const DestructiveLabel: Story = {
  render: () => <Box data-testid="host" />,
  play: async ({ canvasElement }) => {
    const host = canvasElement.querySelector<HTMLElement>('[data-testid="host"]')!;
    const rows: string[] = [];
    let read = 0;
    for (const seed of DANGER_SEEDS) {
      const assessed = assessBrand(seed);
      if (!assessed.ok) throw new Error(`${seed}: ${assessed.reason}`);
      withSeed(host, seed, (theme, mode) => {
        const danger = theme.querySelector<HTMLElement>('[data-part="danger"]')!;
        const fill = parseColor(getComputedStyle(danger).backgroundColor);
        const ink = parseColor(getComputedStyle(danger).color);
        const ruled = assessed.assessment[mode.dark ? "dark" : "light"].error;
        const at = `${seed} ${mode.name}`;
        read++;
        if (!same(fill, parseColor(ruled.fill))) rows.push(`${at}: the destructive Button paints ${show(fill)}, not ${ruled.family}'s ruled fill ${ruled.fill}`);
        const hover = flatten(resolveColor(theme, "--ds-fill-error-hover"), fill);
        for (const [state, under] of [["rest", fill], ["hover", hover]] as const) {
          read++;
          const ratio = contrastRatio(ink, under), lc = apcaContrast(ink, under);
          if (ratio < SOLID_TEXT_MIN || lc < APCA_LC.largeUi) rows.push(`${at} ${state}: the label reads ${ratio.toFixed(2)}:1 and Lc ${lc.toFixed(1)}`);
        }
        read++;
        const press = labelOnFill({ r: fill.r, g: fill.g, b: fill.b }, mode.dark ? "dark" : "light").inks.white.press;
        if (press.ratio < SOLID_TEXT_MIN || Math.abs(press.lc) < APCA_LC.largeUi) rows.push(`${at} press: the white label reads ${press.ratio.toFixed(2)}:1 and Lc ${Math.abs(press.lc).toFixed(1)} under Radix's press filter`);
      });
    }
    const want = DANGER_SEEDS.length * MODES.length * 4;
    if (read !== want) throw new Error(`read ${read} values, expected ${want}`);
    if (rows.length) throw new Error(`${rows.length} destructive Button readings fail ([[text-on-solid-fill-contrast]], [[seeded-brand-writer]]):\n${rows.join("\n")}`);
  },
};
