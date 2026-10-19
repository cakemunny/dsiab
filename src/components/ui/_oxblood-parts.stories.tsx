import type { Meta, StoryObj } from "@storybook/react-vite";
import { Box } from "@radix-ui/themes";
import { Link } from "./Link";
import { TextField } from "./TextField";

/* Test-only behaviour for a part given oxblood ([[part-colour-parity]]). Underscore-prefixed, so the registry and
   story-order guards skip it, grouped under _internal. oxblood-ssr.node-check.ts holds the server markup. These
   plays hold what the browser paints from it. */

const meta: Meta<typeof Link> = {
  title: "_internal/Oxblood parts",
  component: Link,
  parameters: { controls: { disable: true } },
};
export default meta;
type Story = StoryObj<typeof Link>;

/** A Link given oxblood keeps Radix's link skin and paints the oxblood scale, and a TextField root whose own
 *  attribute is not yet set, as in a server render, still maps the accent from its inner field. */
export const OxbloodLinkAndField: Story = {
  render: () => (
    <Box p="4" style={{ display: "grid", gap: 16, maxWidth: 320 }}>
      <p>
        Read <Link href="#a" data-testid="plain">the notes</Link> or <Link href="#b" color="oxblood" data-testid="oxblood">the release</Link>.
      </p>
      <Box data-testid="field">
        <TextField color="oxblood" aria-label="Name" />
      </Box>
    </Box>
  ),
  play: async ({ canvasElement }) => {
    const plain = canvasElement.querySelector<HTMLAnchorElement>('[data-testid="plain"]')!;
    const ox = canvasElement.querySelector<HTMLAnchorElement>('[data-testid="oxblood"]')!;
    if (ox.tagName !== "A" || !ox.classList.contains("rt-Link")) throw new Error("an oxblood Link must render Radix's link anchor");
    if (ox.getAttribute("data-accent-color") !== "oxblood") throw new Error("an oxblood Link must carry data-accent-color on its anchor");
    if (ox.getAttribute("href") !== "#b") throw new Error("an oxblood Link must keep its href");
    if (getComputedStyle(ox).textDecorationLine !== "underline") throw new Error("an oxblood Link must keep its underline");
    if (getComputedStyle(ox).color === getComputedStyle(plain).color) throw new Error("an oxblood Link must paint a colour other than the page accent");
    const oxblood9 = getComputedStyle(ox).getPropertyValue("--oxblood-9").trim();
    if (getComputedStyle(ox).getPropertyValue("--accent-9").trim() !== oxblood9) throw new Error("an oxblood Link must map --accent-9 to --oxblood-9");

    const root = canvasElement.querySelector<HTMLElement>('[data-testid="field"] .rt-TextFieldRoot')!;
    root.removeAttribute("data-accent-color");
    if (getComputedStyle(root).getPropertyValue("--accent-9").trim() !== oxblood9)
      throw new Error("a TextField root must map the oxblood accent from its inner field before its own attribute is set");
  },
};
