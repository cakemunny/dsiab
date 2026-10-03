/* =============================================================================
   _press-scale.stories.tsx — PRESS-SCALE A/B FIXTURE (decision aid, disposable)
   -----------------------------------------------------------------------------
   Whether buttons adopt a scale(0.96) press "squish" is an open ruling
   (polish-rules plan §Pending). This fixture exists to be PRESSED, not read:
   identical controls with and without the squish, plus a preview of the two
   proposed carve-outs (flush ButtonGroup clusters and in-field inset controls
   would NOT squish even if adopted).

   Self-contained: the squish CSS is scoped to [data-press-demo="scale"] inside
   this story only — no tokens, no components.css changes. Delete the file (and
   this branch) once the ruling lands either way.
   ============================================================================= */
import type { Meta, StoryObj } from "@storybook/react-vite";
import { Flex, Text, TextField } from "@radix-ui/themes";
import { MagnifyingGlass, Star, Trash, X } from "@phosphor-icons/react";
import { Button } from "./Button";
import { IconButton } from "./IconButton";
import { ButtonGroup } from "./ButtonGroup";

const meta: Meta = {
  title: "_internal/PressScale A-B",
  parameters: { controls: { disable: true } },
};
export default meta;
type Story = StoryObj;

// Scoped squish: transform-based (no reflow), interruptible transition,
// collapses under reduced motion. 0.96 per the ruleset under discussion.
const DEMO_CSS = `
  [data-press-demo="scale"] .rt-BaseButton {
    transition-property: transform, background-color;
    transition-duration: var(--ds-duration-micro);
    transition-timing-function: var(--ds-ease-standard);
  }
  [data-press-demo="scale"] .rt-BaseButton:active:not([data-disabled]) {
    transform: scale(0.96);
  }
  @media (prefers-reduced-motion: reduce) {
    [data-press-demo="scale"] .rt-BaseButton { transition-duration: 0.01ms; }
    [data-press-demo="scale"] .rt-BaseButton:active { transform: none; }
  }
`;

function Lane({ label, demo, note }: { label: string; demo?: boolean; note: string }) {
  return (
    <Flex direction="column" gap="2" data-press-demo={demo ? "scale" : undefined}>
      <Text size="2" weight="bold">{label}</Text>
      <Flex gap="3" align="center">
        <Button priority="primary">Save changes</Button>
        <Button>Duplicate</Button>
        <Button priority="tertiary">Cancel</Button>
        <Button tone="danger">Delete project</Button>
        <IconButton aria-label="Favorite"><Star /></IconButton>
        <IconButton priority="tertiary" aria-label="Delete item"><Trash /></IconButton>
      </Flex>
      <Text size="1" color="gray" style={{ maxWidth: "62ch" }}>{note}</Text>
    </Flex>
  );
}

/** Press and HOLD each button — that's the whole test. Top lane squishes to 96%,
 *  bottom lane is today's behavior (fill-step only). The carve-out section shows
 *  what would stay squish-free even if adopted. */
export const PressAndHold: Story = {
  render: () => (
    <Flex direction="column" gap="6" p="5" style={{ maxWidth: 720 }}>
      <style>{DEMO_CSS}</style>
      <Lane
        label="A — with squish (scale 0.96 on press)"
        demo
        note="Press and hold: the button depresses like a physical key, on top of the existing darker press fill. Springs back on release; interruptible mid-press."
      />
      <Lane
        label="B — without (current system)"
        note="Press and hold: the background steps darker (the current press signal). No shrink."
      />
      <Flex direction="column" gap="2">
        <Text size="2" weight="bold">Carve-outs — these would NOT squish even if adopted</Text>
        <Flex gap="5" align="center">
          <ButtonGroup>
            <Button>Back</Button>
            <Button priority="primary">Continue</Button>
          </ButtonGroup>
          <TextField.Root placeholder="Search projects" style={{ width: 220 }}>
            <TextField.Slot side="left"><MagnifyingGlass /></TextField.Slot>
            <TextField.Slot>
              <IconButton inset aria-label="Clear search"><X /></IconButton>
            </TextField.Slot>
          </TextField.Root>
        </Flex>
        <Text size="1" color="gray" style={{ maxWidth: "62ch" }}>
          Flush clusters would jiggle against their neighbours, and an in-field control
          squishing reads as the whole field wobbling — both stay fill-only.
        </Text>
      </Flex>
    </Flex>
  ),
};
