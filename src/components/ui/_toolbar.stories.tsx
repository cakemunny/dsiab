import type { Meta, StoryObj } from "@storybook/react-vite";
import { Box } from "@radix-ui/themes";
import { TextB, TextItalic, TextUnderline, ArrowUUpLeft, ArrowUUpRight } from "@phosphor-icons/react";
import { Toolbar } from "./Toolbar";
import { Button } from "./Button";
import { IconButton } from "./IconButton";

/* Test-only behavior for Toolbar — kept OUT of the docs stories (System/Toolbar) so viewing a docs page
   doesn't drive focus (the plays move the roving focus between items → a visible focus walk on view).
   Underscore-prefixed file → registry-guard-exempt, grouped under _internal. */

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

const meta: Meta<typeof Toolbar.Root> = {
  title: "_internal/Toolbar behavior",
  component: Toolbar.Root,
  parameters: { controls: { disable: true } },
};
export default meta;
type Story = StoryObj<typeof Toolbar.Root>;

// A mixed cluster: a text Button AND two IconButtons, each a roving toolbar item via `Toolbar.Button asChild`.
// The IconButtons are the load-bearing part of the forwardRef proof — the roving collection can only move
// focus onto them if IconButton forwards its ref to the DOM node.
function MixedItems() {
  return (
    <>
      <Toolbar.Button asChild>
        <Button priority="secondary">Bold</Button>
      </Toolbar.Button>
      <Toolbar.Button asChild>
        <IconButton priority="tertiary" aria-label="Undo">
          <ArrowUUpLeft />
        </IconButton>
      </Toolbar.Button>
      <Toolbar.Button asChild>
        <IconButton priority="tertiary" aria-label="Redo">
          <ArrowUUpRight />
        </IconButton>
      </Toolbar.Button>
    </>
  );
}

/** Single tab stop across MIXED children + arrow-nav moves focus ACROSS IconButton items (the IconButton
 *  forwardRef proof) + role="toolbar" has an accessible name. */
export const SingleTabStop: Story = {
  render: () => (
    <Box p="4">
      <Toolbar.Root aria-label="Text formatting" data-testid="tb" start={<MixedItems />} />
    </Box>
  ),
  play: async ({ canvasElement }) => {
    const toolbar = canvasElement.querySelector<HTMLElement>('[data-testid="tb"]');
    if (!toolbar) throw new Error("behavior story must render the toolbar");

    // (a) role + accessible name.
    if (toolbar.getAttribute("role") !== "toolbar")
      throw new Error(`the container must be role="toolbar"; got ${toolbar.getAttribute("role")}`);
    if (!toolbar.getAttribute("aria-label"))
      throw new Error("the toolbar must carry an accessible name (aria-label)");

    const items = [...toolbar.querySelectorAll<HTMLButtonElement>("button")];
    if (items.length !== 3) throw new Error(`expected 3 roving items; got ${items.length}`);
    const [bold, undo, redo] = items;

    // (b) ONE tab stop for the whole toolbar: the role="toolbar" container carries tabindex 0 and every item
    //     is -1 at rest — Tab reaches the toolbar ONCE, then Arrow/Home/End move a roving focus within it.
    if (toolbar.tabIndex !== 0)
      throw new Error(`the toolbar must be the single tab stop (tabindex 0); got ${toolbar.tabIndex}`);
    if (items.some((b) => b.tabIndex !== -1))
      throw new Error(`every item must be tabindex=-1 at rest (roving); got ${items.map((b) => b.tabIndex).join(",")}`);

    // (c) horizontal arrow-nav crosses the mixed children. ArrowRight: Button → IconButton(undo) →
    //     IconButton(redo). Landing focus on an IconButton is only possible because IconButton forwards its
    //     ref — a plain function component drops it and the roving collection can't focus the node.
    bold.focus();
    if (document.activeElement !== bold) throw new Error("focusing the first item should land on the Bold button");
    bold.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowRight", bubbles: true }));
    await sleep(0);
    if (document.activeElement !== undo)
      throw new Error("ArrowRight must move roving focus onto the first IconButton (undo) — the forwardRef proof");
    undo.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowRight", bubbles: true }));
    await sleep(0);
    if (document.activeElement !== redo)
      throw new Error("ArrowRight must move roving focus onto the second IconButton (redo)");
    redo.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowLeft", bubbles: true }));
    await sleep(0);
    if (document.activeElement !== undo)
      throw new Error("ArrowLeft must move roving focus back to the previous IconButton (undo)");
  },
};

/** Orientation flips the arrow axis: vertical → ArrowDown/Up move; the horizontal ArrowRight does NOT. */
export const Vertical: Story = {
  render: () => (
    <Box p="4">
      <Toolbar.Root
        aria-label="Text formatting"
        orientation="vertical"
        data-testid="tbv"
        start={
          <>
            <Toolbar.Button asChild>
              <IconButton priority="tertiary" aria-label="Bold"><TextB /></IconButton>
            </Toolbar.Button>
            <Toolbar.Button asChild>
              <IconButton priority="tertiary" aria-label="Italic"><TextItalic /></IconButton>
            </Toolbar.Button>
            <Toolbar.Button asChild>
              <IconButton priority="tertiary" aria-label="Underline"><TextUnderline /></IconButton>
            </Toolbar.Button>
          </>
        }
      />
    </Box>
  ),
  play: async ({ canvasElement }) => {
    const toolbar = canvasElement.querySelector<HTMLElement>('[data-testid="tbv"]');
    if (!toolbar) throw new Error("behavior story must render the vertical toolbar");
    if (toolbar.getAttribute("aria-orientation") !== "vertical")
      throw new Error(`a vertical toolbar must set aria-orientation="vertical"; got ${toolbar.getAttribute("aria-orientation")}`);
    const items = [...toolbar.querySelectorAll<HTMLButtonElement>("button")];
    const [bold, italic] = items;

    // ArrowDown moves along the vertical axis.
    bold.focus();
    bold.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowDown", bubbles: true }));
    await sleep(0);
    if (document.activeElement !== italic)
      throw new Error("ArrowDown must move roving focus in a vertical toolbar");

    // ArrowRight is the WRONG axis for a vertical toolbar — focus must NOT move.
    italic.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowRight", bubbles: true }));
    await sleep(0);
    if (document.activeElement !== italic)
      throw new Error("ArrowRight must NOT move focus in a vertical toolbar (wrong axis)");

    // ArrowUp moves back.
    italic.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowUp", bubbles: true }));
    await sleep(0);
    if (document.activeElement !== bold)
      throw new Error("ArrowUp must move roving focus back in a vertical toolbar");
  },
};
