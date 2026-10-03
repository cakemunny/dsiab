import type { Meta, StoryObj } from "@storybook/react-vite";
import { Box, Flex, Text } from "@radix-ui/themes";
import { Citation } from "./Citation";

/* Test-only behavior for Citation — kept OUT of the docs stories (System/Citation). Underscore-prefixed
   file → registry- and story-order-guard-exempt, grouped under _internal. Covers the linked-vs-unlinked
   role POLARITY (doc-noteref on links only — the axe trap), the aria-label naming, the label-pill
   ellipsis truncation, and the number badge's superscript/circle geometry. */

const meta: Meta<typeof Citation> = {
  title: "_internal/Citation behavior",
  component: Citation,
  parameters: { controls: { disable: true } },
};
export default meta;
type Story = StoryObj<typeof Citation>;

/** Role polarity: a linked citation is an <a role="doc-noteref"> (new tab, noopener); an unlinked one is a
 *  plain <span> with NO role (doc-noteref on a span trips axe aria-allowed-role). */
export const RolePolarity: Story = {
  render: () => (
    <Flex gap="4" p="4" wrap="wrap">
      <Citation data-testid="linked" number={1} source={{ title: "Linked", url: "https://example.com" }} />
      <Citation data-testid="unlinked" number={2} source={{ title: "Unlinked" }} />
      <Citation data-testid="linked-num" number={3} variant="number" source={{ title: "Num", url: "https://example.com" }} />
      <Citation data-testid="unlinked-num" number={4} variant="number" source={{ title: "Num" }} />
    </Flex>
  ),
  play: async ({ canvasElement }) => {
    const linked = canvasElement.querySelector<HTMLElement>('[data-testid="linked"]')!;
    const unlinked = canvasElement.querySelector<HTMLElement>('[data-testid="unlinked"]')!;
    const linkedNum = canvasElement.querySelector<HTMLElement>('[data-testid="linked-num"]')!;
    const unlinkedNum = canvasElement.querySelector<HTMLElement>('[data-testid="unlinked-num"]')!;

    // Linked label → <a role="doc-noteref"> with a new-tab, safe-rel target.
    if (linked.tagName !== "A") throw new Error("a linked citation must render an <a>");
    if (linked.getAttribute("role") !== "doc-noteref") throw new Error('a linked citation must carry role="doc-noteref"');
    if (linked.getAttribute("target") !== "_blank") throw new Error('a linked citation must open in a new tab (target="_blank")');
    if (linked.getAttribute("rel") !== "noopener noreferrer") throw new Error('a linked citation must set rel="noopener noreferrer"');
    if (linked.getAttribute("data-linked") !== "") throw new Error("a linked citation must carry data-linked");

    // Unlinked label → <span> with NO role (the axe-correct polarity).
    if (unlinked.tagName !== "SPAN") throw new Error("an unlinked citation must render a <span>");
    if (unlinked.getAttribute("role") != null) throw new Error("an unlinked citation (span) must NOT carry role=doc-noteref (axe aria-allowed-role)");
    if (unlinked.hasAttribute("href")) throw new Error("an unlinked citation must not have an href");
    if (unlinked.getAttribute("data-linked") != null) throw new Error("an unlinked citation must NOT carry data-linked");

    // The polarity holds for the number variant too.
    if (linkedNum.tagName !== "A" || linkedNum.getAttribute("role") !== "doc-noteref")
      throw new Error("a linked number citation must be <a role=doc-noteref>");
    if (unlinkedNum.tagName !== "SPAN" || unlinkedNum.getAttribute("role") != null)
      throw new Error("an unlinked number citation must be a <span> with no role");
  },
};

/** Accessible name: `Citation {n}: {title}`; when there's no title it falls back to the number. */
export const AriaLabel: Story = {
  render: () => (
    <Flex gap="4" p="4">
      <Citation data-testid="titled" number={7} source={{ title: "Radix Themes", url: "https://example.com" }} />
      <Citation data-testid="untitled" number={5} source={{}} />
    </Flex>
  ),
  play: async ({ canvasElement }) => {
    const titled = canvasElement.querySelector<HTMLElement>('[data-testid="titled"]')!;
    const untitled = canvasElement.querySelector<HTMLElement>('[data-testid="untitled"]')!;
    if (titled.getAttribute("aria-label") !== "Citation 7: Radix Themes")
      throw new Error(`titled aria-label wrong; got "${titled.getAttribute("aria-label")}"`);
    // No title → the title falls back to the number in BOTH the label and the aria-label.
    if (untitled.getAttribute("aria-label") !== "Citation 5: 5")
      throw new Error(`untitled aria-label must fall back to the number; got "${untitled.getAttribute("aria-label")}"`);
    if ((untitled.querySelector(".rt-ds-citation__label")?.textContent ?? "") !== "5")
      throw new Error("an untitled label pill must show the number as its text");
  },
};

/** Truncation: the label pill caps its width and ellipsis-truncates a long title. */
export const Truncation: Story = {
  render: () => (
    <Box p="4" style={{ width: 600 }}>
      <Citation
        data-testid="long"
        number={1}
        source={{ title: "An extremely long source title that will certainly exceed the fifteen em pill cap and must ellipsis-truncate", url: "https://example.com" }}
      />
    </Box>
  ),
  play: async ({ canvasElement }) => {
    const pill = canvasElement.querySelector<HTMLElement>('[data-testid="long"]')!;
    const label = pill.querySelector<HTMLElement>(".rt-ds-citation__label")!;

    // The pill is width-capped (max-width resolves to a px value, not "none").
    const maxW = getComputedStyle(pill).maxWidth;
    if (maxW === "none" || !/\d/.test(maxW)) throw new Error(`the pill must be width-capped; max-width="${maxW}"`);
    // The title span is set to ellipsis-truncate...
    const cs = getComputedStyle(label);
    if (cs.textOverflow !== "ellipsis") throw new Error(`the title must ellipsis; text-overflow="${cs.textOverflow}"`);
    if (cs.whiteSpace !== "nowrap") throw new Error(`the title must be nowrap; white-space="${cs.whiteSpace}"`);
    // ...and actually IS truncated (the full text is wider than the rendered box).
    if (label.scrollWidth <= label.clientWidth)
      throw new Error(`the long title must overflow its box (scrollWidth ${label.scrollWidth} > clientWidth ${label.clientWidth})`);
  },
};

/** Number badge geometry: superscript-aligned, full-radius, and square (a circle) for a single digit. */
export const NumberBadge: Story = {
  render: () => (
    <Flex gap="4" p="4" align="center">
      <Text size="3">ref<Citation data-testid="badge" number={1} variant="number" source={{ title: "Source", url: "https://example.com" }} /></Text>
    </Flex>
  ),
  play: async ({ canvasElement }) => {
    const badge = canvasElement.querySelector<HTMLElement>('[data-testid="badge"]')!;
    const cs = getComputedStyle(badge);
    if (cs.verticalAlign !== "super") throw new Error(`the number badge must be vertical-align: super; got "${cs.verticalAlign}"`);
    // radius: full → a very large px (a circle on a square box), not a small element radius.
    const radius = parseFloat(cs.borderTopLeftRadius);
    if (!(radius >= 100)) throw new Error(`the badge must use the full radius (a circle); got border-radius ${cs.borderTopLeftRadius}`);
    // A single-digit badge is square → a circle (width ≈ height within a rounding px).
    const r = badge.getBoundingClientRect();
    if (Math.abs(r.width - r.height) > 1.5)
      throw new Error(`a single-digit badge must be square (a circle); got ${r.width.toFixed(1)}×${r.height.toFixed(1)}`);
    if ((badge.textContent ?? "") !== "1") throw new Error("the badge must render its number");
  },
};
