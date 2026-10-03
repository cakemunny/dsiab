import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";
import { Box } from "@radix-ui/themes";
import { AlertDialog } from "./AlertDialog";
import { Button } from "./Button";
import { ButtonGroup } from "./ButtonGroup";
import { toHex } from "./_storyKit";

/* Test-only behavior for AlertDialog — kept OUT of the docs stories (System/AlertDialog) so viewing a
   docs page never opens + Escape-closes the modal on view (Storybook runs a story's play on view — that
   was the flicker). Underscore-prefixed file → registry-guard-exempt, grouped under _internal. */

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

const meta: Meta<typeof AlertDialog.Root> = {
  title: "_internal/AlertDialog behavior",
  component: AlertDialog.Root,
  parameters: { controls: { disable: true } },
};
export default meta;
type Story = StoryObj<typeof AlertDialog.Root>;

/** The destructive confirm contract: opens, focus lands inside, the danger Action resolves
 *  --ds-fill-error, buttonOrder anchors the primary first (default), and Escape dismisses. */
export const Confirm: Story = {
  // The open dialog's solid-danger Action entered this exclusion at white on the red-9 fill #e5484d,
  // 3.91, under the retired 3:1 floor for text on a solid fill. [[text-on-solid-fill-contrast]] replaced
  // that floor with 4.5:1 and APCA Lc 60 and moved the danger fill to --error-solid, and no current
  // ruling excuses this button. Excluded as an ELEMENT now
  // rather than switching color-contrast off for the whole fixture: the dialog's title, description and
  // Cancel button are contrast-checked again, which the rule-wide disable prevented.
  parameters: { a11y: { context: { exclude: [".rt-Button[data-tone='danger']"] } } },
  render: () => (
    <Box p="5">
      <AlertDialog.Root>
        <AlertDialog.Trigger>
          <Button priority="secondary">Delete project…</Button>
        </AlertDialog.Trigger>
        <AlertDialog.Content maxWidth="440px">
          <AlertDialog.Title>Delete project?</AlertDialog.Title>
          <AlertDialog.Description size="2">This permanently deletes Orbit. This can’t be undone.</AlertDialog.Description>
          <ButtonGroup mt="4">
            <AlertDialog.Cancel><Button priority="secondary">Cancel</Button></AlertDialog.Cancel>
            <AlertDialog.Action><Button priority="primary" tone="danger">Delete project</Button></AlertDialog.Action>
          </ButtonGroup>
        </AlertDialog.Content>
      </AlertDialog.Root>
    </Box>
  ),
  play: async ({ canvasElement }) => {
    const trigger = canvasElement.querySelector<HTMLElement>('button[aria-haspopup="dialog"]')!;
    trigger.click();
    // Radix portals the dialog to <body> with role="alertdialog".
    const dialog = await waitFor(() => document.querySelector<HTMLElement>('[role="alertdialog"]'));
    if (!dialog.contains(document.activeElement)) throw new Error("focus must land inside the open alert dialog");
    // The solid danger Action paints from --ds-fill-error (accent-aware, by resolved hex).
    const action = dialog.querySelector<HTMLElement>('.rt-variant-solid[data-tone="danger"]');
    if (!action) throw new Error("the confirm must offer a solid tone=danger Action");
    const actionHex = toHex(getComputedStyle(action).backgroundColor);
    const probe = document.createElement("span");
    action.appendChild(probe);
    probe.style.color = "var(--ds-fill-error)";
    const tokenHex = toHex(getComputedStyle(probe).color);
    probe.remove();
    if (actionHex !== tokenHex)
      throw new Error(`danger Action fill must resolve --ds-fill-error; got ${actionHex} vs ${tokenHex}`);
    // buttonOrder: default primary-first anchors the danger Action first in DOM (tab) order.
    const labels = [...dialog.querySelectorAll("button")].map((b) => b.textContent);
    if (labels[0] !== "Delete project")
      throw new Error(`primary-first: the danger Action should be first; got ${labels.join(" | ")}`);
    document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
    await waitFor(() => !document.querySelector('[role="alertdialog"]'));
  },
};

/* A confirm whose Description a button inside it mounts and unmounts, so one open confirm walks through
   the Title-only shape, the described shape, and back. */
function TogglingDescriptionConfirm() {
  const [described, setDescribed] = useState(false);
  return (
    <AlertDialog.Root>
      <AlertDialog.Trigger>
        <Button priority="secondary">Archive project…</Button>
      </AlertDialog.Trigger>
      <AlertDialog.Content maxWidth="440px">
        <AlertDialog.Title>Archive project?</AlertDialog.Title>
        {described && <AlertDialog.Description size="2">Archived projects stay readable.</AlertDialog.Description>}
        <ButtonGroup mt="4">
          <AlertDialog.Cancel><Button priority="secondary">Cancel</Button></AlertDialog.Cancel>
          <Button priority="secondary" data-testid="toggle-description" onClick={() => setDescribed((d) => !d)}>
            Toggle description
          </Button>
        </ButtonGroup>
      </AlertDialog.Content>
    </AlertDialog.Root>
  );
}

/** `aria-describedby` never dangles (Radix #3007). Radix points it at its description id whether or not a
 *  Description renders, so a Title-only confirm referenced an id no element carried. axe files that under
 *  "needs review" rather than a violation, so the a11y lane alone cannot catch it. The attribute must be
 *  absent or resolve to an element: absent with no Description, the Description itself with one, and
 *  absent again once it unmounts. */
export const DescribedbyResolves: Story = {
  render: () => (
    <Box p="5">
      <TogglingDescriptionConfirm />
    </Box>
  ),
  play: async ({ canvasElement }) => {
    const dangling = (dialog: HTMLElement) => {
      const id = dialog.getAttribute("aria-describedby");
      return id != null && !document.getElementById(id) ? id : null;
    };
    canvasElement.querySelector<HTMLElement>('button[aria-haspopup="dialog"]')!.click();
    const dialog = await waitFor(() => document.querySelector<HTMLElement>('[role="alertdialog"]'));
    await waitFor(() => dialog.contains(document.activeElement));
    const bad = dangling(dialog);
    if (bad) throw new Error(`a Title-only confirm must not reference a missing description: aria-describedby="${bad}" resolves to no element (Radix #3007)`);

    const toggle = dialog.querySelector<HTMLElement>('[data-testid="toggle-description"]')!;
    toggle.click();
    const target = await waitFor(() => {
      const id = dialog.getAttribute("aria-describedby");
      return id ? document.getElementById(id) : null;
    }).catch(() => {
      throw new Error(`a mounted Description must be wired: aria-describedby="${dialog.getAttribute("aria-describedby")}" does not resolve`);
    });
    if (target.textContent !== "Archived projects stay readable.")
      throw new Error(`aria-describedby must point at the Description; it points at "${target.textContent}"`);

    toggle.click();
    await waitFor(() => !target.isConnected);
    const after = dangling(dialog);
    if (after) throw new Error(`once the Description unmounts, aria-describedby="${after}" must not stay behind`);
  },
};
