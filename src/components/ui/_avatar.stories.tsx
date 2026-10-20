import type { Meta, StoryObj } from "@storybook/react-vite";
import { Flex } from "@radix-ui/themes";
import { Robot } from "@phosphor-icons/react";
import { Avatar } from "./Avatar";
import { AvatarGroup } from "./AvatarGroup";
import { ChatMessage } from "./ChatMessage";

/* Test-only behaviour for Avatar, kept out of the docs page. Underscore-prefixed file, so the registry guard
   exempts it and it groups under _internal. */

const meta: Meta = { title: "_internal/Avatar behavior", parameters: { controls: { disable: true } } };
export default meta;
type Story = StoryObj;

/** [[avatar-initials-floor]]: an avatar with no size sits in a 16 / 20 / 24px box, where two initials would
 *  render under 12px, so a string fallback shows an icon, a person on a round avatar and a building on an
 *  entity, and keeps its text for a screen reader. An explicit size, a node fallback, an AvatarGroup member
 *  and a chat avatar keep what they had. */
export const InitialsFloor: Story = {
  render: () => (
    <Flex direction="column" gap="3" p="4">
      <span data-testid="unsized"><Avatar fallback="AO" /></span>
      <span data-testid="unsized-status"><Avatar fallback="MF" status="online" /></span>
      <span data-testid="explicit"><Avatar size="xs" fallback="PR" /></span>
      <span data-testid="inherit"><Avatar size="inherit" fallback="IN" /></span>
      <span data-testid="node"><Avatar fallback={<Robot />} /></span>
      <span data-testid="entity"><Avatar radius="medium" fallback="OR" /></span>
      <div data-testid="chat">
        <ChatMessage sender="assistant" name="Ada" avatar={<Avatar fallback="AI" />}>Hello.</ChatMessage>
      </div>
      <span data-testid="group">
        <AvatarGroup label="2 members">
          <Avatar fallback="JL" />
          <Avatar fallback="HW" />
        </AvatarGroup>
      </span>
    </Flex>
  ),
  play: async ({ canvasElement }) => {
    const part = (id: string) => canvasElement.querySelector<HTMLElement>(`[data-testid="${id}"]`)!;
    const icon = (id: string) => part(id).querySelectorAll(".rt-ds-avatar-icon").length;

    for (const [id, initials] of [["unsized", "AO"], ["unsized-status", "MF"]] as const) {
      if (icon(id) !== 1) throw new Error(`${id}: an avatar with no size must show the person icon in place of 7px initials`);
      const fallback = part(id).querySelector<HTMLElement>(".rt-AvatarFallback")!;
      const text = Array.from(fallback.querySelectorAll<HTMLElement>("span")).find((el) => el.textContent === initials);
      if (!text) throw new Error(`${id}: the initials must stay in the fallback as text`);
      const r = text.getBoundingClientRect();
      if (r.width > 1 || r.height > 1) throw new Error(`${id}: the initials must be visually hidden; they paint ${r.width}x${r.height}px`);
      if (part(id).querySelector(".rt-ds-avatar-icon")!.getAttribute("aria-hidden") !== "true") throw new Error(`${id}: the icon must be hidden from assistive technology`);
      const glyph = part(id).querySelector(".rt-ds-avatar-icon")!.getBoundingClientRect();
      const box = part(id).querySelector(".rt-AvatarRoot")!.getBoundingClientRect();
      if (Math.abs(glyph.width - box.width * 0.7) > 0.5) throw new Error(`${id}: the icon must be 0.7 of its box; got ${glyph.width}px in ${box.width}px`);
    }
    if (icon("explicit") !== 0 || !part("explicit").textContent?.includes("PR")) throw new Error("an explicit size keeps its initials");
    if (icon("node") !== 0) throw new Error("a node fallback is the caller's and stays as given");
    if (icon("entity") !== 1) throw new Error("a rounded-square entity avatar with no size shows the building icon");
    const glyph = (id: string) => part(id).querySelector(".rt-ds-avatar-icon")?.outerHTML ?? "";
    if (glyph("entity") === glyph("unsized")) throw new Error("the entity icon must be a building, not the person icon");
    if (!part("entity").textContent?.includes("OR")) throw new Error("the entity's initials must stay as hidden text");
    if (icon("chat") !== 0 || !part("chat").textContent?.includes("AI")) throw new Error("a chat avatar sits in a 30px slot and keeps its initials");
    if (icon("group") !== 0 || !part("group").textContent?.includes("JL")) throw new Error("an AvatarGroup member keeps its initials");
    // [[avatar-group-seam]]: the initials sit in a trimmed span, which makes the fallback a node and drops Radix's
    // letter-count size class, so the span re-applies the root's two-letter size: 0.44 of the box on a system
    // avatar, and Radix's own size on `size="inherit"`.
    for (const id of ["explicit", "inherit", "chat", "group"]) {
      const span = part(id).querySelector<HTMLElement>(".rt-ds-avatar-initials")!;
      const root = span.closest<HTMLElement>(".rt-AvatarRoot")!;
      const probe = document.createElement("span");
      probe.style.fontSize = "var(--avatar-fallback-two-letters-font-size)";
      root.appendChild(probe);
      const want = parseFloat(getComputedStyle(probe).fontSize);
      probe.remove();
      const size = parseFloat(getComputedStyle(span).fontSize);
      if (Math.abs(size - want) > 0.05) throw new Error(`${id}: two initials must take the root's two-letter size, ${want}px; got ${size}px`);
    }
    // [[avatar-group-seam]]: a grouped disc draws no ring of its own, and the initials span is trimmed to the
    // capitals so the flex centring centres the letters (where the engine supports text-box).
    for (const root of part("group").querySelectorAll<HTMLElement>(".rt-AvatarRoot")) {
      if (getComputedStyle(root).boxShadow !== "none") throw new Error(`a grouped disc must draw no ring; got ${getComputedStyle(root).boxShadow}`);
    }
    if (CSS.supports("text-box", "trim-both cap alphabetic")) {
      const trim = getComputedStyle(part("group").querySelector(".rt-ds-avatar-initials")!).getPropertyValue("text-box-trim");
      if (trim !== "trim-both") throw new Error(`the initials span must be trimmed to its capitals; got text-box-trim ${trim}`);
    }
    const ratio = (id: string) => parseFloat(getComputedStyle(part(id).querySelector(".rt-ds-avatar-initials")!).fontSize) / part(id).querySelector(".rt-AvatarRoot")!.getBoundingClientRect().width;
    if (Math.abs(ratio("explicit") - 0.44) > 0.005) throw new Error(`a system avatar's two initials must be 0.44 of the box; got ${ratio("explicit")}`);
  },
};
