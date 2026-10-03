import type { Meta, StoryObj } from "@storybook/react-vite";
import { Flex } from "@radix-ui/themes";
import { TextAlignLeft, TextAlignCenter, TextAlignRight } from "@phosphor-icons/react";
import { ToggleButtonGroup } from "./ToggleButtonGroup";
import { toHex } from "./_storyKit";

/* Test-only behavior for ToggleButtonGroup — kept OUT of the docs stories (System/ToggleButtonGroup) so
   viewing a docs page doesn't drive the group (the plays click and arrow-navigate → a data-state flip and
   a focus move on view). Underscore-prefixed file → registry-guard-exempt, grouped under _internal. */

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
function tokenHex(el: Element, name: string): string {
  const probe = document.createElement("span");
  el.appendChild(probe);
  probe.style.color = `var(${name})`;
  const hex = toHex(getComputedStyle(probe).color);
  probe.remove();
  return hex;
}

const meta: Meta<typeof ToggleButtonGroup.Root> = {
  title: "_internal/ToggleButtonGroup behavior",
  component: ToggleButtonGroup.Root,
  parameters: { controls: { disable: true } },
};
export default meta;
type Story = StoryObj<typeof ToggleButtonGroup.Root>;

const ITEMS = [
  { value: "left", label: "Left" },
  { value: "center", label: "Center" },
  { value: "right", label: "Right" },
];

/** [[toggle-button-group]] roving tabindex (one tab stop + arrow nav) + single-mode re-click-to-empty + the shared [[toggle-button]] pressed
 *  paint + the reserved-bold-width no-reflow guard. */
export const Roving: Story = {
  render: () => (
    <Flex p="4">
      <ToggleButtonGroup.Root type="single" defaultValue="left" label="Text alignment" data-testid="grp">
        {ITEMS.map((it) => (
          <ToggleButtonGroup.Item key={it.value} value={it.value}>{it.label}</ToggleButtonGroup.Item>
        ))}
      </ToggleButtonGroup.Root>
    </Flex>
  ),
  play: async ({ canvasElement }) => {
    // Settle the web font before any width read (a fallback font has wider metrics than Inter, so a
    // mid-swap measurement would compare mismatched metrics and read as a false reflow).
    await document.fonts.ready;
    const group = canvasElement.querySelector<HTMLElement>('[data-testid="grp"]');
    if (!group) throw new Error("behavior story must render the group");
    if (group.getAttribute("role") !== "radiogroup")
      throw new Error(`type="single" group must be a radiogroup; got role=${group.getAttribute("role")}`);
    const buttons = [...group.querySelectorAll<HTMLButtonElement>("button")];
    if (buttons.length !== 3) throw new Error(`expected 3 items; got ${buttons.length}`);
    const [left, center] = buttons;
    const selectedHex = tokenHex(group, "--ds-fill-selected-subtle");

    // (1) ONE tab stop for the whole group (the [[toggle-button-group]] upgrade): the group container carries the single tab
    //     stop (tabindex 0) and every item is -1 at rest — Tab reaches the group ONCE, then Arrow/Home/End
    //     move a roving focus within it, instead of a separate tab stop per button.
    if (group.tabIndex !== 0)
      throw new Error(`the group must be the single tab stop (tabindex 0); got ${group.tabIndex}`);
    if (buttons.some((b) => b.tabIndex !== -1))
      throw new Error(`every item must be tabindex=-1 at rest (roving); got ${buttons.map((b) => b.tabIndex).join(",")}`);

    // (2) the selected item paints the shared --ds-fill-selected-subtle — proves Task 3's [[toggle-button]] ghost
    //     [data-state="on"] rule catches a GROUP item for free (no new CSS).
    if (left.getAttribute("data-state") !== "on")
      throw new Error("the defaultValue item must carry data-state='on'");
    const leftBg = toHex(getComputedStyle(left).backgroundColor);
    if (leftBg !== selectedHex)
      throw new Error(`selected group item must resolve --ds-fill-selected-subtle; got ${leftBg} vs ${selectedHex}`);

    // baseline width of an unselected item (weight ~500) for the reflow guard below.
    const centerOff = center.offsetWidth;

    // (3) Arrow keys move the roving focus ([[toggle-button-group]]). Focus the tab stop, ArrowRight → next item, ArrowLeft → back.
    left.focus();
    if (document.activeElement !== left) throw new Error("focusing the tab stop should land on the first item");
    left.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowRight", bubbles: true }));
    await sleep(0);
    if (document.activeElement !== center)
      throw new Error("ArrowRight must move the roving focus to the next item");
    center.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowLeft", bubbles: true }));
    await sleep(0);
    if (document.activeElement !== left)
      throw new Error("ArrowLeft must move the roving focus back to the previous item");

    // (4) single-mode re-click deselects to empty: clicking the currently-selected item clears the value.
    left.click();
    await sleep(0);
    if (group.querySelector('[data-state="on"]'))
      throw new Error("re-clicking the selected item in type='single' must clear the value (no item stays on)");
    if (toHex(getComputedStyle(left).backgroundColor) === selectedHex)
      throw new Error("a deselected item must not paint the selected fill");

    // reflow guard: selecting Center bolds it to 600, but the reserved bold width means offsetWidth is stable.
    center.click();
    await sleep(0);
    if (center.getAttribute("data-state") !== "on")
      throw new Error("clicking an unselected item in type='single' must select it");
    const centerOn = center.offsetWidth;
    if (centerOn !== centerOff)
      throw new Error(`selecting must not change item width (bold width reserved); off=${centerOff}px on=${centerOn}px`);
  },
};

/** WCAG 1.4.1 — an ICON-ONLY item's selected state must differ from its unselected siblings by something
 *  other than COLOUR. This is the shape the component is used in almost everywhere (alignment,
 *  formatting), and it is exactly where the shared pressed paint's non-colour cue evaporates: that rule
 *  bolds the LABEL to 600, and an icon-only item has zero text characters for the weight to act on — the
 *  computed weight flips 400→600 on a span with nothing in it. Left alone, the ONLY difference between a
 *  selected and an unselected item is the background fill and its 1px edge.
 *
 *  So this suite refuses to read the weight at all. It first proves the items really are text-free (the
 *  premise), then enumerates the signals that survive with the hue removed — a swapped glyph, or a
 *  weighted label with actual text in it — and requires at least one. The pressed edge does not count.
 *  Like the fill, it is a colour difference: a 1px accent ring measured under 3:1 against the fill and
 *  the tray. What supplies the signal here is `pressedIcon`: drop that prop from the render below and
 *  this fails, naming the fill and its edge as the only difference it could find.
 *
 *  The glyph is read from the RENDERED svg only. Both faces are in the DOM at all times (an Item can't
 *  read the group's value, so the CSS picks one off `data-state`) — a plain querySelectorAll would join
 *  both faces' path data in both states and report "identical", passing a broken component. */
export const IconOnlySelectionIsNotColourAlone: Story = {
  render: () => (
    <Flex p="4">
      <ToggleButtonGroup.Root type="single" defaultValue="left" label="Text alignment" data-testid="icons">
        <ToggleButtonGroup.Item value="left" aria-label="Align left" pressedIcon={<TextAlignLeft weight="bold" />}>
          <TextAlignLeft />
        </ToggleButtonGroup.Item>
        <ToggleButtonGroup.Item value="center" aria-label="Align center" pressedIcon={<TextAlignCenter weight="bold" />}>
          <TextAlignCenter />
        </ToggleButtonGroup.Item>
        <ToggleButtonGroup.Item value="right" aria-label="Align right" pressedIcon={<TextAlignRight weight="bold" />}>
          <TextAlignRight />
        </ToggleButtonGroup.Item>
      </ToggleButtonGroup.Root>
    </Flex>
  ),
  play: async ({ canvasElement }) => {
    const group = canvasElement.querySelector<HTMLElement>('[data-testid="icons"]');
    if (!group) throw new Error("behavior story must render the icon-only group");
    const buttons = [...group.querySelectorAll<HTMLButtonElement>("button")];
    // ONE item, read in BOTH of its states. Comparing the selected item against a *different* sibling
    // would compare two different icons and "prove" a glyph difference that is just the two options
    // being two options — the reader can't tell selection from that.
    const item = buttons[1];
    if (!item) throw new Error("the specimen must render at least two items");
    if (item.getAttribute("data-state") !== "off")
      throw new Error("the measured item must start unselected (another item holds the defaultValue)");

    const label = item.querySelector<HTMLElement>("[data-ds-toggle-label]");
    if (!label) throw new Error("an item must render a visible label span");
    // The premise. If a future edit gives these items text, the weight cue is live again and this suite is
    // measuring the wrong thing — so say that out loud rather than pass for the wrong reason.
    const text = () => (label.textContent ?? "").trim();
    if (text() !== "")
      throw new Error(`this suite must measure an ICON-ONLY item — it rendered text ("${text()}")`);

    // ---- the candidate non-colour signals -------------------------------------------------------
    // (a) the glyph itself: different path data = a different mark, readable with no colour at all.
    //     Only the PAINTED svg counts — a face hidden by `display:none` has no box, so filtering on a
    //     zero-width client rect is the same question as "what does the eye see".
    const glyph = () =>
      [...label.querySelectorAll<SVGSVGElement>("svg")]
        .filter((svg) => svg.getBoundingClientRect().width > 0)
        .flatMap((svg) => [...svg.querySelectorAll("path")].map((p) => p.getAttribute("d")))
        .join("|");
    // The pressed EDGE is not a signal. The shared pressed paint draws a 1px --ds-stroke-accent-weak ring
    // on every selected item, so counting it would pass an item with no glyph swap. Measured on
    // 2026-10-02, it is 1.48:1 against the fill in light and 1.64:1 in dark, a colour difference like the
    // fill itself and not a shape a reader can rely on with the hue removed.
    // (b) the label weight — only counts when there is text for it to act on, which the premise above
    //     already ruled out here. Kept in the list so a text-bearing variant is covered by the same rule.
    const weight = () => Number(getComputedStyle(label).fontWeight);
    const bg = () => getComputedStyle(item).backgroundColor;

    const before = { glyph: glyph(), weight: weight(), bg: bg() };
    if (before.glyph === "")
      throw new Error("no glyph is being painted at rest — the suite would be comparing two empty strings");

    item.click();
    await sleep(0);
    if (item.getAttribute("data-state") !== "on")
      throw new Error("clicking an unselected item must select it");
    const after = { glyph: glyph(), weight: weight(), bg: bg() };

    if (after.bg === before.bg)
      throw new Error(`the selected item must repaint at all; background stayed ${after.bg}`);

    const glyphDiffers = after.glyph !== "" && after.glyph !== before.glyph;
    const weightDiffers = text() !== "" && after.weight !== before.weight;

    if (!glyphDiffers && !weightDiffers)
      throw new Error(
        "an icon-only selected item is distinguished by COLOUR ALONE (WCAG 1.4.1) — " +
          `background ${before.bg} → ${after.bg} and the pressed edge are the only difference. ` +
          "glyph identical; " +
          `label weight ${before.weight} → ${after.weight} on ${text().length} text characters, so it is inert`,
      );

    // The swapped-out face must be gone from the ACCESSIBILITY TREE, not merely invisible: two faces are
    // always in the DOM, and hiding one with opacity/visibility:hidden would leave a screen reader
    // announcing both. display:none is the only one of the three that prunes the subtree.
    const hidden = item.querySelector<HTMLElement>('[data-ds-toggle-label] [data-ds-toggle-face="off"]');
    if (!hidden) throw new Error("the selected item must still declare its rest face (the swap is CSS, not a remount)");
    const display = getComputedStyle(hidden).display;
    if (display !== "none")
      throw new Error(
        `the swapped-out face must be display:none so it leaves the accessibility tree; got display:${display}`,
      );
  },
};

/** type="multiple" — a toolbar of independent toggles; two can be on at once, each an aria-pressed button. */
export const Multiple: Story = {
  render: () => (
    <Flex p="4">
      <ToggleButtonGroup.Root type="multiple" defaultValue={["bold"]} label="Text formatting" data-testid="multi">
        <ToggleButtonGroup.Item value="bold">Bold</ToggleButtonGroup.Item>
        <ToggleButtonGroup.Item value="italic">Italic</ToggleButtonGroup.Item>
        <ToggleButtonGroup.Item value="underline">Underline</ToggleButtonGroup.Item>
      </ToggleButtonGroup.Root>
    </Flex>
  ),
  play: async ({ canvasElement }) => {
    const group = canvasElement.querySelector<HTMLElement>('[data-testid="multi"]');
    if (!group) throw new Error("behavior story must render the multiple group");
    if (group.getAttribute("role") !== "toolbar")
      throw new Error(`type="multiple" group must be a toolbar; got role=${group.getAttribute("role")}`);
    const buttons = [...group.querySelectorAll<HTMLButtonElement>("button")];
    const [bold, italic] = buttons;
    if (bold.getAttribute("aria-pressed") !== "true")
      throw new Error("the defaultValue item must be aria-pressed='true'");
    // a second item can be pressed WITHOUT clearing the first (independent toggles).
    italic.click();
    await sleep(0);
    if (bold.getAttribute("aria-pressed") !== "true" || italic.getAttribute("aria-pressed") !== "true")
      throw new Error("type='multiple' must allow more than one item pressed at once");
  },
};
