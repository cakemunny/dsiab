import type { Meta, StoryObj } from "@storybook/react-vite";
import { Flex } from "@radix-ui/themes";
import { PencilSimple, Copy, Trash } from "@phosphor-icons/react";
import { Provider } from "../../theme/Provider";
import { type UISize } from "../../theme/SizeContext";
import { MoreMenu } from "./MoreMenu";
import { DropdownMenu } from "./DropdownMenu";

/* Test-only behavior for MoreMenu — kept OUT of the docs stories (System/MoreMenu) so viewing a docs page
   doesn't open and dismiss the overflow menu on view (Storybook runs a story's play on view — the portal
   would flash). Underscore-prefixed file → registry-guard-exempt, grouped under _internal.

   What these guard:
   1. the trigger's TARGET SIZE — the ghost step-1 icon-button is 22px on Radix's own sizing, under the
      24×24 pointer-target minimum (WCAG 2.5.8); the floor is held in components.css for the variant, and
      this measures the rendered box rather than trusting the declaration;
   2. the SIZE LANE — the trigger rides the full control lane while the menu rides that lane clamped to the
      two steps a Radix menu Content accepts. Handed an out-of-range step, Radix substitutes its own
      default silently, so only a rendered-class assertion catches a broken lane. */

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

/** The size step off an element's `rt-r-size-N` class — what Radix actually rendered, not what we passed. */
function sizeStep(el: Element): string | undefined {
  return el.className.match(/rt-r-size-(\d)/)?.[1];
}

const TIERS: UISize[] = ["small", "medium", "large"];

/** One default MoreMenu per global size tier — no `size`, so each part resolves its own lane.
 *  `modal={false}`: the test opens menus in sequence, and a modal menu leaves the body pointer-locked
 *  between the open and the Escape. */
function Tiers() {
  return (
    <Flex gap="6" align="center" p="4">
      {TIERS.map((tier) => (
        <Provider key={tier} uiSize={tier}>
          <MoreMenu label={`More actions ${tier}`} modal={false}>
            <DropdownMenu.Item><PencilSimple /> Rename</DropdownMenu.Item>
            <DropdownMenu.Item><Copy /> Duplicate</DropdownMenu.Item>
            <DropdownMenu.Separator />
            <DropdownMenu.Item tone="danger"><Trash /> Delete project</DropdownMenu.Item>
          </MoreMenu>
        </Provider>
      ))}
    </Flex>
  );
}

const meta: Meta<typeof MoreMenu> = {
  title: "_internal/MoreMenu behavior",
  component: MoreMenu,
  parameters: { controls: { disable: true } },
};
export default meta;
type Story = StoryObj<typeof MoreMenu>;

/** The ⋯ trigger clears the 24×24 pointer-target minimum at every tier — including uiSize small, where it
 *  is the ghost step-1 button Radix sizes to 22px — and the glyph stays centred at its own size (the BOX
 *  grows to the floor, the icon is not scaled to fill it). */
export const TriggerTargetSize: Story = {
  render: () => <Tiers />,
  play: async ({ canvasElement }) => {
    for (const tier of TIERS) {
      const btn = canvasElement.querySelector<HTMLElement>(`button[aria-label="More actions ${tier}"]`);
      if (!btn) throw new Error(`the ${tier} trigger must render`);

      // Measured geometry, not getComputedStyle: the declaration can say 24 while the painted box is 22.
      const r = btn.getBoundingClientRect();
      if (r.width < 24 || r.height < 24)
        throw new Error(`the ${tier} trigger must be at least 24x24 (WCAG 2.5.8); got ${r.width}x${r.height}`);

      const glyph = btn.querySelector("svg")?.getBoundingClientRect();
      if (!glyph) throw new Error(`the ${tier} trigger must render its three-dots glyph`);
      if (glyph.width > r.width || glyph.height > r.height)
        throw new Error(`the ${tier} glyph must sit INSIDE the target box; got ${glyph.width}x${glyph.height} in ${r.width}x${r.height}`);
      const dx = Math.abs(glyph.x + glyph.width / 2 - (r.x + r.width / 2));
      const dy = Math.abs(glyph.y + glyph.height / 2 - (r.y + r.height / 2));
      if (dx > 0.5 || dy > 0.5)
        throw new Error(`the ${tier} glyph must stay centred in the grown box; off by ${dx}x${dy}px`);
    }
  },
};

/** The two lanes: the trigger takes the control lane (1 / 2 / 3), the menu that lane CLAMPED to the two
 *  steps a menu panel has (1 / 2 / 2). Opened by the real affordance — a click on the ⋯ button. */
export const SizeLane: Story = {
  render: () => <Tiers />,
  play: async ({ canvasElement }) => {
    const EXPECTED: Record<UISize, { trigger: string; menu: string }> = {
      small: { trigger: "1", menu: "1" },
      medium: { trigger: "2", menu: "2" },
      large: { trigger: "3", menu: "2" },
    };

    for (const tier of TIERS) {
      const btn = canvasElement.querySelector<HTMLElement>(`button[aria-label="More actions ${tier}"]`);
      if (!btn) throw new Error(`the ${tier} trigger must render`);
      const want = EXPECTED[tier];

      if (sizeStep(btn) !== want.trigger)
        throw new Error(`the ${tier} trigger must ride the control lane (step ${want.trigger}); got "${btn.className}"`);

      // The real affordance for a pointer: Radix's menu trigger opens on POINTERDOWN. (A bare click opens
      // it too since the Radix #1963 fix, and AssistiveClick below covers that path.)
      btn.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true, cancelable: true, button: 0, pointerType: "mouse" }));
      const menu = await waitFor(() => document.querySelector<HTMLElement>('[role="menu"]'));
      const got = sizeStep(menu);
      if (got !== want.menu)
        throw new Error(`the ${tier} menu must render step ${want.menu} (the clamped lane); got ${got ?? "no size class"}`);

      document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
      await waitFor(() => !document.querySelector('[role="menu"]'));
    }
  },
};

/* THE CLICK ASSISTIVE TECHNOLOGY SENDS (Radix #1963, #2700). MoreMenu composes DropdownMenu, so it
   inherits the click-to-toggle path with no code of its own. VoiceOver's VO+Space in Safari and
   Firefox and NVDA's browse-mode Enter send a click with no pointerdown before it, which used to leave
   the ⋯ menu closed. Every path below must open it exactly once. The full reasoning and the same
   table for the bare DropdownMenu live in _dropdown-menu.stories.tsx. The menu is modal, the default. */
const openChanges: boolean[] = [];

export const AssistiveClick: Story = {
  render: () => (
    <MoreMenu label="More actions" onOpenChange={(open) => { openChanges.push(open); }}>
      <DropdownMenu.Item><PencilSimple /> Rename</DropdownMenu.Item>
      <DropdownMenu.Item><Copy /> Duplicate</DropdownMenu.Item>
    </MoreMenu>
  ),
  play: async ({ canvasElement }) => {
    const trigger = canvasElement.querySelector<HTMLElement>('button[aria-label="More actions"]');
    if (!trigger) throw new Error("the ⋯ trigger must render");
    const bareClick = () => trigger.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true, detail: 0 }));
    const mousePress = () => {
      const init: PointerEventInit = { bubbles: true, cancelable: true, button: 0, pointerId: 1, pointerType: "mouse", isPrimary: true };
      trigger.dispatchEvent(new PointerEvent("pointerdown", init));
      trigger.dispatchEvent(new PointerEvent("pointerup", init));
      trigger.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true, detail: 1, button: 0 }));
    };
    const press = (key: string) => {
      trigger.focus();
      const down = new KeyboardEvent("keydown", { key, bubbles: true, cancelable: true });
      trigger.dispatchEvent(down);
      // A browser clicks a button on an Enter or Space whose keydown was not prevented.
      if (!down.defaultPrevented) bareClick();
      trigger.dispatchEvent(new KeyboardEvent("keyup", { key, bubbles: true, cancelable: true }));
    };
    const settleThenExpect = async (how: string, want: string) => {
      // Long enough for a second, unwanted toggle to land, and for the gesture mark to clear.
      await sleep(60);
      const open = document.querySelectorAll('[role="menu"][data-state="open"]').length;
      const expanded = trigger.getAttribute("aria-expanded");
      if (openChanges.join() !== want || open !== 1 || expanded !== "true")
        throw new Error(
          `${how} must open the ⋯ menu exactly once (Radix #1963): onOpenChange saw [${openChanges.join()}], want [${want}], ` +
          `${open} open menu(s), aria-expanded=${expanded}`,
        );
    };
    const close = async () => {
      document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
      await waitFor(() => !document.querySelector('[role="menu"]'), 3000);
    };

    const paths: [string, () => void][] = [
      ["a bare click (detail 0, no pointerdown)", bareClick],
      ["element.click()", () => trigger.click()],
      ["a mouse press", mousePress],
      ["Enter", () => press("Enter")],
      ["Space", () => press(" ")],
    ];
    for (const [how, act] of paths) {
      openChanges.length = 0;
      act();
      await settleThenExpect(how, "true");
      await close();
    }

    // A mouse open, then Escape, then a bare click reopens it.
    openChanges.length = 0;
    mousePress();
    await sleep(60);
    await close();
    bareClick();
    await settleThenExpect("a bare click after a mouse open and Escape", "true,false,true");
    await close();
  },
};
