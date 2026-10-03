import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";
import { Box, TextField } from "@radix-ui/themes";
import { Dialog } from "./Dialog";
import { Button } from "./Button";

/* Test-only behavior for Dialog — kept OUT of the docs stories (System/Dialog) so viewing a docs page
   never opens + Escape-closes the modal on view (Storybook runs a story's play on view — that was the
   flicker). Underscore-prefixed file → guard-exempt, grouped under _internal. */

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

const meta: Meta<typeof Dialog.Root> = {
  title: "_internal/Dialog behavior",
  component: Dialog.Root,
  parameters: { controls: { disable: true } },
};
export default meta;
type Story = StoryObj<typeof Dialog.Root>;

function RenameDialog() {
  return (
    <Dialog.Root>
      <Dialog.Trigger>
        <Button priority="secondary">Rename project…</Button>
      </Dialog.Trigger>
      <Dialog.Content maxWidth="440px">
        {/* No header X — Cancel's whole job is to close, so it IS this dialog's dismissal
            ([[modal-dismissal]]: exactly one labelled dismissal; the X appears only when nothing in the Footer closes). */}
        <Dialog.Title>Rename project</Dialog.Title>
        <Dialog.Description size="2">Give the project a clear, memorable name.</Dialog.Description>
        <Box mt="3"><TextField.Root defaultValue="Orbit" aria-label="Project name" /></Box>
        <Dialog.Footer>
          <Dialog.Close><Button priority="secondary">Cancel</Button></Dialog.Close>
          <Dialog.Close><Button priority="primary">Save changes</Button></Dialog.Close>
        </Dialog.Footer>
      </Dialog.Content>
    </Dialog.Root>
  );
}

/** The modal contract: opens, focus lands inside, the Content rides the container size lane (small → 2),
 *  the Footer anchors the primary first (default buttonOrder), and Escape dismisses + returns focus. */
export const Behavior: Story = {
  render: () => (
    <Box p="5">
      <RenameDialog />
    </Box>
  ),
  play: async ({ canvasElement }) => {
    const trigger = canvasElement.querySelector<HTMLElement>('button[aria-haspopup="dialog"]');
    if (!trigger) throw new Error("the trigger must carry aria-haspopup=\"dialog\"");
    trigger.click();

    // Radix portals the panel to <body> with role="dialog".
    const dialog = await waitFor(() => document.querySelector<HTMLElement>('[role="dialog"]'));
    if (!dialog.contains(document.activeElement)) throw new Error("focus must land inside the open dialog");

    // Container size lane: at the default uiSize="small", Content resolves to Radix size 2 (rt-r-size-2)
    // — a step above the control lane, so the standard modal is roomier than a confirm.
    const content = dialog.classList.contains("rt-DialogContent") ? dialog : dialog.querySelector<HTMLElement>(".rt-DialogContent");
    if (!content?.classList.contains("rt-r-size-2"))
      throw new Error(`Dialog.Content must ride the container lane (small → size 2 → rt-r-size-2); got "${content?.className}"`);

    // buttonOrder: default primary-first anchors the solid primary FIRST in DOM (tab) order. .rt-Button
    // selects the two text Buttons — this dialog has no header X to exclude, because its Cancel is
    // already the one labelled dismissal.
    const footerLabels = [...dialog.querySelectorAll(".rt-Button")].map((b) => b.textContent);
    if (footerLabels[0] !== "Save changes")
      throw new Error(`primary-first: the solid primary should be first; got ${footerLabels.join(" | ")}`);

    // Escape closes and returns focus to the trigger.
    document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
    await waitFor(() => !document.querySelector('[role="dialog"]'));
    // Radix restores focus a tick AFTER the panel unmounts, so asserting activeElement the instant the
    // dialog disappears is a race (it flaked under a loaded parallel run). Wait for the restoration itself.
    await waitFor(() => document.activeElement === trigger);
  },
};

/* The same dialog opened WITHOUT a `Dialog.Trigger` — the shape a consumer writes when the opener is a
   menu item, a keyboard shortcut, or a row action, and `open` lives in their own state. */
function OpenPropDialog() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button priority="secondary" data-testid="open-prop-trigger" onClick={() => setOpen(true)}>
        Rename project…
      </Button>
      <Dialog.Root open={open} onOpenChange={setOpen}>
        <Dialog.Content maxWidth="440px">
          <Dialog.Title>Rename project</Dialog.Title>
          <Dialog.Description size="2">Give the project a clear, memorable name.</Dialog.Description>
          <Box mt="3"><TextField.Root defaultValue="Orbit" aria-label="Project name" /></Box>
          <Dialog.Footer>
            <Dialog.Close><Button priority="secondary">Cancel</Button></Dialog.Close>
          </Dialog.Footer>
        </Dialog.Content>
      </Dialog.Root>
    </>
  );
}

/** Closing returns focus to the opener even when no `Dialog.Trigger` registered it ([[focus-return-on-close]]).
 *
 *  Radix's modal Content cancels the focus scope's own restore and focuses `triggerRef` instead. Drive
 *  the dialog from `open` and that ref is null, so the cancel stands and focus falls to <body>.
 *  `Behavior` above cannot catch this: it uses a `Dialog.Trigger`, the one case Radix already handles. */
export const RestoresFocusWithoutTrigger: Story = {
  render: () => (
    <Box p="5">
      <OpenPropDialog />
    </Box>
  ),
  play: async ({ canvasElement }) => {
    const trigger = canvasElement.querySelector<HTMLElement>('[data-testid="open-prop-trigger"]')!;
    if (trigger.getAttribute("aria-haspopup") === "dialog")
      throw new Error("this story must NOT use Dialog.Trigger — it covers the open-prop path");
    trigger.focus();
    trigger.click();
    await waitFor(() => document.querySelector('[role="dialog"]'));
    await waitFor(() => document.activeElement !== trigger);

    document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
    await waitFor(() => !document.querySelector('[role="dialog"]'));
    await waitFor(() => document.activeElement === trigger, 1500).catch(() => {
      const a = document.activeElement as HTMLElement;
      throw new Error(`closing must return focus to the opener; it went to <${a.tagName.toLowerCase()}>`);
    });
  },
};

/* A dialog whose Description a button inside it mounts and unmounts, so one open dialog walks through
   the Title-only shape, the described shape, and back. */
function TogglingDescriptionDialog() {
  const [described, setDescribed] = useState(false);
  return (
    <Dialog.Root>
      <Dialog.Trigger>
        <Button priority="secondary">Rename project…</Button>
      </Dialog.Trigger>
      <Dialog.Content maxWidth="440px">
        <Dialog.Title>Rename project</Dialog.Title>
        {described && <Dialog.Description size="2">Give the project a clear, memorable name.</Dialog.Description>}
        <Dialog.Footer>
          <Button priority="secondary" data-testid="toggle-description" onClick={() => setDescribed((d) => !d)}>
            Toggle description
          </Button>
        </Dialog.Footer>
      </Dialog.Content>
    </Dialog.Root>
  );
}

/** `aria-describedby` never dangles (Radix #3007). Radix points it at its description id whether or not a
 *  Description renders, so a Title-only dialog referenced an id no element carried. axe files that under
 *  "needs review" rather than a violation, so the a11y lane alone cannot catch it. The attribute must be
 *  absent or resolve to an element: absent with no Description, the Description itself with one, and
 *  absent again once it unmounts. */
export const DescribedbyResolves: Story = {
  render: () => (
    <Box p="5">
      <TogglingDescriptionDialog />
    </Box>
  ),
  play: async ({ canvasElement }) => {
    const dangling = (dialog: HTMLElement) => {
      const id = dialog.getAttribute("aria-describedby");
      return id != null && !document.getElementById(id) ? id : null;
    };
    canvasElement.querySelector<HTMLElement>('button[aria-haspopup="dialog"]')!.click();
    const dialog = await waitFor(() => document.querySelector<HTMLElement>('[role="dialog"]'));
    await waitFor(() => dialog.contains(document.activeElement));
    const bad = dangling(dialog);
    if (bad) throw new Error(`a Title-only dialog must not reference a missing description: aria-describedby="${bad}" resolves to no element (Radix #3007)`);

    const toggle = dialog.querySelector<HTMLElement>('[data-testid="toggle-description"]')!;
    toggle.click();
    const target = await waitFor(() => {
      const id = dialog.getAttribute("aria-describedby");
      return id ? document.getElementById(id) : null;
    }).catch(() => {
      throw new Error(`a mounted Description must be wired: aria-describedby="${dialog.getAttribute("aria-describedby")}" does not resolve`);
    });
    if (target.textContent !== "Give the project a clear, memorable name.")
      throw new Error(`aria-describedby must point at the Description; it points at "${target.textContent}"`);

    toggle.click();
    await waitFor(() => !target.isConnected);
    const after = dangling(dialog);
    if (after) throw new Error(`once the Description unmounts, aria-describedby="${after}" must not stay behind`);
  },
};
