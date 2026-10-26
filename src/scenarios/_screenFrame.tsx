import type { Decorator } from "@storybook/react-vite";

/* The frame around every UI example screen. A screen is laid out as a desktop app, so on a phone it is
   wider than the viewport. The frame takes the viewport's size and scrolls the screen inside itself, so
   the docs page never scrolls sideways. On a desktop the screen fits, and the frame changes nothing. */
export const screenFrame: Decorator = (Story) => (
  <div style={{ width: "100%", height: "100vh", overflow: "auto" }}>
    <Story />
  </div>
);
