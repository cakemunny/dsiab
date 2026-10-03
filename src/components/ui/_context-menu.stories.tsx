import type { Meta, StoryObj } from "@storybook/react-vite";
import { Box, Text } from "@radix-ui/themes";
import { File, PencilSimple, Copy, Trash } from "@phosphor-icons/react";
import { ContextMenu } from "./ContextMenu";
import { toHex } from "./_storyKit";

/* Test-only behavior for ContextMenu — kept OUT of the docs stories (System/ContextMenu) so viewing a
   docs page doesn't right-click-open + Escape-close the menu on view (Storybook runs a story's play on
   view — the open/close would flash the danger row). Underscore-prefixed file → registry-guard-exempt,
   grouped under _internal. */

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
function tokenHex(el: Element, name: string): string {
  const probe = document.createElement("span");
  el.appendChild(probe);
  probe.style.color = `var(${name})`;
  const hex = toHex(getComputedStyle(probe).color);
  probe.remove();
  return hex;
}

const meta: Meta<typeof ContextMenu.Root> = {
  title: "_internal/ContextMenu behavior",
  component: ContextMenu.Root,
  parameters: { controls: { disable: true } },
};
export default meta;
type Story = StoryObj<typeof ContextMenu.Root>;

/** The right-click contract: a `contextmenu` event opens the menu; the [[destructive-tone]] danger item is error text at
 *  rest and a weak error tint on highlight (a disabled danger item greys out instead); menu keyboard
 *  roving works; Escape dismisses. */
export const Behavior: Story = {
  render: () => (
    <Box p="6">
      <ContextMenu.Root modal={false}>
        <ContextMenu.Trigger>
          <Box
            data-testid="ctx-target"
            style={{
              display: "inline-flex", alignItems: "center", gap: "var(--space-3)",
              padding: "var(--space-3) var(--space-4)", cursor: "context-menu",
              background: "var(--ds-bg-subtle)", border: "1px solid var(--ds-stroke-weak)",
              borderRadius: "var(--ds-radius-4)",
            }}
          >
            <File size={22} weight="duotone" color="var(--ds-text-weak)" />
            <Text size="2" weight="medium" style={{ color: "var(--ds-text-strong)" }}>Orbit brief.pdf</Text>
          </Box>
        </ContextMenu.Trigger>
        <ContextMenu.Content>
          <ContextMenu.Item><PencilSimple /> Rename</ContextMenu.Item>
          <ContextMenu.Item><Copy /> Duplicate</ContextMenu.Item>
          <ContextMenu.Separator />
          <ContextMenu.Item tone="danger"><Trash /> Delete file</ContextMenu.Item>
          <ContextMenu.Item tone="danger" disabled><Trash /> Delete workspace</ContextMenu.Item>
        </ContextMenu.Content>
      </ContextMenu.Root>
    </Box>
  ),
  play: async ({ canvasElement }) => {
    const target = canvasElement.querySelector<HTMLElement>('[data-testid="ctx-target"]');
    if (!target) throw new Error("the right-click target must render");

    // Open by the REAL affordance — a right-click (contextmenu) on the target, positioned at its centre.
    const rect = target.getBoundingClientRect();
    target.dispatchEvent(new MouseEvent("contextmenu", {
      bubbles: true, cancelable: true, clientX: rect.left + rect.width / 2, clientY: rect.top + rect.height / 2,
    }));

    // Radix portals the panel to <body> with role="menu" — the same command-menu semantics as DropdownMenu.
    const menu = await waitFor(() => document.querySelector<HTMLElement>('[role="menu"]'));
    const errHex = tokenHex(menu, "--ds-text-error");
    const weakHex = tokenHex(menu, "--ds-fill-error-weak");

    // The enabled danger item is error text at rest (the shared .rt-BaseMenuItem [[destructive-tone]] rule reaches it).
    const del = menu.querySelector<HTMLElement>('[data-tone="danger"]:not([data-disabled])');
    if (!del) throw new Error("menu must render an enabled danger item");
    if (toHex(getComputedStyle(del).color) !== errHex)
      throw new Error(`danger item text must resolve --ds-text-error; got ${toHex(getComputedStyle(del).color)} vs ${errHex}`);

    // On highlight it gains the weak error tint (test the [[destructive-tone]] paint deterministically).
    del.setAttribute("data-highlighted", "");
    await sleep(0);
    if (toHex(getComputedStyle(del).backgroundColor) !== weakHex)
      throw new Error(`highlighted danger item must resolve --ds-fill-error-weak; got ${toHex(getComputedStyle(del).backgroundColor)} vs ${weakHex}`);
    del.removeAttribute("data-highlighted");

    // A disabled danger item keeps Radix's dimmed treatment — NOT the error colour.
    const disabled = menu.querySelector<HTMLElement>('[data-tone="danger"][data-disabled]');
    if (!disabled) throw new Error("menu must render a disabled danger item");
    if (toHex(getComputedStyle(disabled).color) === errHex)
      throw new Error("a disabled danger item must grey out, not paint error");

    // Menu keyboard: ArrowDown roves onto a menuitem (Radix sets data-highlighted as focus moves).
    menu.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowDown", bubbles: true }));
    const highlighted = await waitFor(() => document.querySelector<HTMLElement>('[role="menuitem"][data-highlighted]'));
    if (!highlighted) throw new Error("ArrowDown must rove onto a menu item");

    // Escape dismisses.
    document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
    await waitFor(() => !document.querySelector('[role="menu"]'));
  },
};
