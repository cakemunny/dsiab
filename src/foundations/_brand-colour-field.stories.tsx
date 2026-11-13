import { useSyncExternalStore } from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { Box } from "@radix-ui/themes";
import { userEvent } from "@vitest/browser/context";
import { BrandColourField } from "./_brandColourField";
import { parseSeed } from "../palette/parseSeed";
import { storedSeed } from "../palette/storedSeed";
import { parseColor, resolveColor, themeRoot } from "./_assert";

/* THE BRAND COLOUR SETTING ([[brand-colour-setting]]). Underscore-prefixed, so the docs
   guards skip it, grouped under _internal.

   FieldFollowsTheSetting drives the Customize page's field from outside, through a
   store that stands in for Storybook's globals, and holds the four rules:
     - the setting changes elsewhere, and the field shows the stored hex;
     - oklch text applied in the field leaves hex in the setting and the oklch on screen;
     - an `rgba(..., 1)` value shows the parser's refusal on the field, and writes nothing;
     - a clear from outside empties the field, and the field's own Clear clears the setting;
     - Clear sits beside the input box at the box's height, its centre on the box's centre, with
       helper text or an error under the box.

   SettingPaintsTheDocs and NamedAccentReturns set the shared setting directly, as a story
   global, and read the theme root the docs decorator renders: a stored seed paints the
   docs, and with none the named accent is back. */

const meta: Meta = { title: "_internal/Brand colour setting", parameters: { controls: { disable: true } } };
export default meta;
type Story = StoryObj;

/** A one-value store standing in for the `brandSeed` global. */
function createStore(initial: string) {
  let value = initial;
  const listeners = new Set<() => void>();
  return {
    get: () => value,
    set: (next: string) => { value = next; listeners.forEach((l) => l()); },
    subscribe: (l: () => void) => { listeners.add(l); return () => listeners.delete(l); },
  };
}
const store = createStore("");

function Harness() {
  const value = useSyncExternalStore(store.subscribe, store.get);
  return (
    <Box p="4">
      <BrandColourField value={value} onChange={store.set} />
      <output data-testid="setting">{value}</output>
    </Box>
  );
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** Replace the field's text and press Enter, with the keyboard alone. `userEvent.type` clicks with
 *  the real pointer before it types, and the pointer stays where it lands: two pointer-sensitive
 *  stories (a hovered danger Button, a hover-and-Escape Overlay) failed in CI while this story
 *  moved it. The field needs only focus and keys, so it uses only those. */
async function typeAndApply(input: HTMLInputElement, text: string): Promise<void> {
  input.focus();
  input.select();
  await userEvent.keyboard("{Backspace}");
  await userEvent.keyboard(text);
  await userEvent.keyboard("{Enter}");
}
async function settle(): Promise<void> { await sleep(50); }

export const FieldFollowsTheSetting: Story = {
  render: () => <Harness />,
  play: async ({ canvasElement }) => {
    store.set("");
    await settle();
    const input = canvasElement.querySelector<HTMLInputElement>("input")!;
    const fail = (msg: string) => { throw new Error(`[[brand-colour-setting]]: ${msg}`); };
    if (input.value !== "") fail(`with no colour applied the field reads "${input.value}", not empty`);

    // 1. The setting changes elsewhere: the field shows the stored hex.
    store.set("#3b82f6");
    await settle();
    if (input.value !== "#3b82f6") fail(`the setting changed to #3b82f6 and the field reads "${input.value}"`);

    // 2. oklch typed and applied: hex in the setting, the oklch text stays on screen.
    const oklch = "oklch(0.6 0.15 250)";
    const want = storedSeed(oklch);
    if (!want.ok) fail(`${oklch} is not a colour the parser accepts`);
    await typeAndApply(input, oklch);
    await settle();
    if (store.get() !== (want.ok ? want.hex : "")) fail(`applying ${oklch} stored "${store.get()}", not ${want.ok ? want.hex : ""}`);
    if (input.value !== oklch) fail(`after its own apply the field reads "${input.value}", not the text typed`);

    // Clear sits beside the input box: its centre is the box's centre, whatever is under the box.
    const aligned = (when: string) => {
      const clearButton = Array.from(canvasElement.querySelectorAll("button")).find((b) => b.textContent === "Clear");
      const box = canvasElement.querySelector<HTMLElement>(".rt-TextFieldRoot");
      if (!clearButton || !box) fail(`${when}: no Clear button or no input box to align`);
      const a = clearButton!.getBoundingClientRect(), b = box!.getBoundingClientRect();
      const off = Math.abs((a.top + a.bottom) / 2 - (b.top + b.bottom) / 2);
      if (off > 1) fail(`${when}: the Clear button's centre sits ${off.toFixed(1)}px from the input box's centre`);
      if (Math.abs(a.height - b.height) > 1) fail(`${when}: the Clear button is ${a.height.toFixed(1)}px tall and the input box ${b.height.toFixed(1)}px`);
    };
    aligned("with a colour applied");

    // 3. A refused colour: the parser's reason on the field, and the setting untouched.
    const before = store.get();
    const rgba = "rgba(1, 2, 3, 1)";
    const refused = parseSeed(rgba);
    if (refused.ok) fail(`${rgba} is accepted by the parser, so this arm tests nothing`);
    await typeAndApply(input, rgba);
    await settle();
    if (store.get() !== before) fail(`${rgba} changed the setting to "${store.get()}"`);
    const shown = canvasElement.textContent ?? "";
    if (!refused.ok && !shown.includes(refused.reason)) fail(`the field does not show the parser's reason for ${rgba}: "${refused.reason}"`);
    if (input.getAttribute("aria-invalid") !== "true") fail(`the field is not marked invalid for ${rgba}`);
    aligned("with a refusal under the field");

    // 4. A clear from outside empties the field.
    store.set("#00a86b");
    await settle();
    if (input.value !== "#00a86b") fail(`the setting changed to #00a86b and the field reads "${input.value}"`);
    store.set("");
    await settle();
    if (input.value !== "") fail(`the setting was cleared elsewhere and the field reads "${input.value}"`);
    if (input.getAttribute("aria-invalid") === "true") fail("the cleared field is marked invalid");

    // 5. The field's own Clear clears the setting.
    store.set("#ff6b5e");
    await settle();
    const clear = Array.from(canvasElement.querySelectorAll("button")).find((b) => b.textContent === "Clear");
    if (!clear) fail("with a colour applied the field offers no Clear button");
    // A DOM click, not the real pointer: see `typeAndApply`.
    clear!.click();
    await settle();
    if (store.get() !== "" || input.value !== "") fail(`Clear left the setting "${store.get()}" and the field "${input.value}"`);
  },
};

const same = (a: string, b: { r: number; g: number; b: number }) => {
  const x = parseColor(a);
  return Math.abs(x.r - b.r) <= 1 && Math.abs(x.g - b.g) <= 1 && Math.abs(x.b - b.b) <= 1;
};

export const SettingPaintsTheDocs: Story = {
  globals: { brandSeed: "#3b82f6" },
  render: () => <Box data-testid="probe" />,
  play: async ({ canvasElement }) => {
    const root = themeRoot(canvasElement);
    if (root.getAttribute("data-accent-color") !== "ds-custom") {
      throw new Error(`[[brand-colour-setting]]: with brandSeed set, the docs theme carries data-accent-color="${root.getAttribute("data-accent-color")}", not ds-custom`);
    }
    if (!same("#3b82f6", resolveColor(root, "--accent-9"))) throw new Error("[[brand-colour-setting]]: with brandSeed #3b82f6 set, --accent-9 is not the seed");
  },
};

export const NamedAccentReturns: Story = {
  globals: { brandSeed: "", accent: "tomato" },
  render: () => <Box data-testid="probe" />,
  play: async ({ canvasElement }) => {
    const root = themeRoot(canvasElement);
    if (root.getAttribute("data-accent-color") !== "tomato") {
      throw new Error(`[[brand-colour-setting]]: with no brandSeed, the docs theme carries data-accent-color="${root.getAttribute("data-accent-color")}", not the named accent tomato`);
    }
  },
};
