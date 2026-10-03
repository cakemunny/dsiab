import type { Meta, StoryObj } from "@storybook/react-vite";
import { type AnchorHTMLAttributes } from "react";
import { Box, Flex, Text } from "@radix-ui/themes";
import { ClickableCard, interactiveLayer } from "./ClickableCard";
import { LinkProvider } from "./Link";

/* Test-only behavior for ClickableCard — the D6 stretched-link contract: the overlay link is the
   provided framework component (useLinkComponent), a click on the card body navigates, a nested
   interactive click does NOT navigate, and there is a single tab stop. Underscore-prefixed → _internal. */

let navCount = 0;
let nestedClicks = 0;

/** A framework Link stand-in: marks itself (data-spy-link) and records navigation instead of leaving the page. */
function SpyLink({ href, children, onClick, ...rest }: { href: string } & AnchorHTMLAttributes<HTMLAnchorElement>) {
  return (
    <a
      {...rest}
      href={href}
      data-spy-link
      onClick={(e) => {
        e.preventDefault();
        navCount += 1;
        onClick?.(e);
      }}
    >
      {children}
    </a>
  );
}

const meta: Meta<typeof ClickableCard> = {
  title: "_internal/ClickableCard behavior",
  component: ClickableCard,
  parameters: { controls: { disable: true } },
};
export default meta;
type Story = StoryObj<typeof ClickableCard>;

/** The stretched-link contract: resolved-component routing, card-body navigation, nested no-navigate, one stop. */
export const StretchedLink: Story = {
  render: () => (
    <Box p="5">
      <LinkProvider component={SpyLink}>
        <ClickableCard href="/design-tokens" title="Design tokens" style={{ maxWidth: 320 }}>
          <Text as="p" size="2" mt="1" style={{ color: "var(--ds-text-weak)" }}>How the semantic roles resolve.</Text>
          <Flex justify="end" mt="3">
            <span style={interactiveLayer}>
              <button
                type="button"
                data-testid="nested"
                onClick={() => {
                  nestedClicks += 1;
                }}
                style={{ font: "inherit", padding: "4px 8px", borderRadius: 6, border: "1px solid var(--ds-stroke-weak)", background: "var(--ds-bg-base)", color: "var(--ds-text-strong)" }}
              >
                Bookmark
              </button>
            </span>
          </Flex>
        </ClickableCard>
      </LinkProvider>
    </Box>
  ),
  play: async ({ canvasElement }) => {
    navCount = 0;
    nestedClicks = 0;

    const link = canvasElement.querySelector<HTMLElement>(".rt-ds-clickable-card-link");
    if (!link) throw new Error("no overlay link rendered");

    // 1. Resolved component: the overlay link IS the provided framework component (useLinkComponent).
    if (!link.hasAttribute("data-spy-link"))
      throw new Error("the overlay link must be the LinkProvider's component (routed through useLinkComponent)");

    // 2. Single tab stop: exactly one overlay link in the card.
    const card = canvasElement.querySelector<HTMLElement>(".rt-ds-clickable-card")!;
    if (card.querySelectorAll(".rt-ds-clickable-card-link").length !== 1)
      throw new Error("a ClickableCard must expose exactly one overlay link (one tab stop)");

    // 3. Card body navigates: a point in the bottom-left corner sits over the link's stretched ::after
    //    (which is absolutely positioned to the card, not the small heading), so hit-testing returns the link.
    const r = card.getBoundingClientRect();
    const hit = document.elementFromPoint(r.left + 8, r.bottom - 8);
    if (hit !== link && !link.contains(hit as Node))
      throw new Error(`a click on the card body must resolve to the overlay link; got <${(hit as HTMLElement)?.tagName?.toLowerCase()} class="${(hit as HTMLElement)?.className}">`);
    link.click();
    if (navCount !== 1) throw new Error(`clicking the card must navigate once; navCount=${navCount}`);

    // 4. Nested interactive does NOT navigate: it sits above the overlay (interactiveLayer).
    const nested = canvasElement.querySelector<HTMLElement>('[data-testid="nested"]')!;
    nested.click();
    if (nestedClicks !== 1) throw new Error("the nested button must fire its own handler");
    if (navCount !== 1) throw new Error(`the nested button click must NOT navigate; navCount rose to ${navCount}`);
  },
};
