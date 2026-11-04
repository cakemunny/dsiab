import { useState } from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { Box, Flex } from "@radix-ui/themes";
import { Provider, type AccentColor } from "./Provider";
import { Button } from "../components/ui/Button";
import { parseColor } from "../foundations/_assert";

/* Test-only behaviour for nested Providers and a seeded brand ([[nested-brand-ownership]]). Underscore-prefixed,
   so the docs guards skip it, grouped under _internal. A seeded Provider writes its brand on the page root, so a
   nested Provider shares that one place. These plays hold that a Provider never removes values another Provider
   wrote: a fill painted OUTSIDE the inner Provider stays the outer seed after the inner one mounts and after it
   unmounts. Step 9 of a generated scale is the seed exactly, in both appearances, so the swatch reads the seed. */

const OUTER_SEED = "#1a5fb4";
const INNER_SEED = "#0f766e";

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

function NestedBrands({ inner, startShown }: { inner: AccentColor | { seed: string }; startShown: boolean }) {
  const [shown, setShown] = useState(startShown);
  return (
    <Provider accentColor={{ seed: OUTER_SEED }}>
      <Flex direction="column" gap="3" p="4" align="start">
        <Box data-testid="swatch" aria-hidden style={{ width: 48, height: 24, background: "var(--accent-9)" }} />
        <Button data-testid="outer-button">Save</Button>
        <Button data-testid="toggle" onClick={() => setShown((s) => !s)}>
          {shown ? "Remove inner Provider" : "Add inner Provider"}
        </Button>
        {shown && (
          <Provider accentColor={inner}>
            <Box data-testid="inner"><Button>Inner action</Button></Box>
          </Provider>
        )}
      </Flex>
    </Provider>
  );
}

const meta: Meta<typeof NestedBrands> = {
  title: "_internal/Provider brand",
  component: NestedBrands,
  parameters: { controls: { disable: true } },
};
export default meta;
type Story = StoryObj<typeof NestedBrands>;

const same = (a: string, b: string) => {
  const x = parseColor(a), y = parseColor(b);
  return Math.abs(x.r - y.r) <= 1 && Math.abs(x.g - y.g) <= 1 && Math.abs(x.b - y.b) <= 1 && x.a === y.a;
};

function expectFill(canvas: HTMLElement, seed: string, when: string, button?: string): void {
  const swatch = canvas.querySelector<HTMLElement>('[data-testid="swatch"]')!;
  const fill = getComputedStyle(swatch).backgroundColor;
  if (!same(fill, seed)) throw new Error(`${when}: the fill outside the inner Provider reads ${fill}, expected the seed ${seed}`);
  if (button !== undefined) {
    const now = getComputedStyle(canvas.querySelector('[data-testid="outer-button"]')!).backgroundColor;
    if (now !== button) throw new Error(`${when}: the outer Button reads ${now}, it read ${button} before`);
  }
}

async function toggle(canvas: HTMLElement, present: boolean): Promise<void> {
  canvas.querySelector<HTMLButtonElement>('[data-testid="toggle"]')!.click();
  await waitFor(() => !!canvas.querySelector('[data-testid="inner"]') === present);
}

/** An inner Provider with a named accent, mounted with the seeded one, leaves the seed in place, and so does its
 *  unmount. */
export const NamedInsideSeeded: Story = {
  args: { inner: "tomato", startShown: true },
  play: async ({ canvasElement }) => {
    expectFill(canvasElement, OUTER_SEED, "after mount");
    await toggle(canvasElement, false);
    expectFill(canvasElement, OUTER_SEED, "after the inner Provider unmounts");
    const button = getComputedStyle(canvasElement.querySelector('[data-testid="outer-button"]')!).backgroundColor;
    await toggle(canvasElement, true);
    expectFill(canvasElement, OUTER_SEED, "after the inner Provider mounts again", button);
  },
};

/** An inner seeded Provider mounted later writes its own brand on the page root, and its unmount restores the
 *  outer seed instead of leaving none. */
export const SeededInsideSeeded: Story = {
  args: { inner: { seed: INNER_SEED }, startShown: false },
  play: async ({ canvasElement }) => {
    expectFill(canvasElement, OUTER_SEED, "before the inner Provider mounts");
    const button = getComputedStyle(canvasElement.querySelector('[data-testid="outer-button"]')!).backgroundColor;
    await toggle(canvasElement, true);
    const root = getComputedStyle(document.documentElement).getPropertyValue("--ds-brand-9").trim();
    if (!same(root, INNER_SEED)) throw new Error(`the inner seeded Provider did not write its brand: --ds-brand-9 reads ${root}`);
    await toggle(canvasElement, false);
    expectFill(canvasElement, OUTER_SEED, "after the inner seeded Provider unmounts", button);
  },
};
