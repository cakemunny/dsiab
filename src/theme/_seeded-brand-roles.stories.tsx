import { flushSync } from "react-dom";
import { createRoot } from "react-dom/client";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { Box } from "@radix-ui/themes";
import { Provider } from "./Provider";
import { customBrandProperties } from "./customBrand";
import { assessBrand } from "../palette/assessment";
import { parseSeed } from "../palette/parseSeed";
import { parseColor, resolveColor, type RGBA } from "../foundations/_assert";

/* THE ROLES A SEEDED BRAND PAINTS ([[seeded-brand-writer]]). Underscore-prefixed, so the docs guards
   skip it, grouped under _internal.

   For each seed in the acceptance table, a seeded Provider is mounted in light, in dark, and in an
   inherited dark appearance (no class on the theme root, `.dark` on an ancestor), and a fourth in
   light under the APCA contrast mode. On each theme root the play reads the colour every routed
   role paints, and holds it to the value the writer wrote for that appearance:

     the filled button       --accent-solid and --on-accent, which must also be the fill and the
                             ink the assessment reports
     the error fill          --error-solid
     the eleven layers       --accent-ring-stack and its two scrim stacks, --accent-part-edge,
                             --accent-thumb-stroke, --accent-mark-edge, --accent-dash-stack,
                             --accent-slider-thumb-stack and the three dot edges
     the APCA glyph ink      --accent-contrast, under data-contrast="apca" in light

   It proves the routing through `custom-brand.css`, `theme.css` and `contrast.css`. Whether each
   layer then clears its surfaces is the sweeps' question, not this play's. */

const SEEDS = ["#fff59d", "#3b82f6", "#0b1a3a", "#6e56cf", "#ff6b5e", "#ff8c00", "#c8102e", "#00a86b"];

/** Each routed role and the key the writer stores it under. */
const ROLES: [string, string][] = [
  ["--accent-solid", "solid"],
  ["--on-accent", "on-solid"],
  ["--accent-ring-stack", "ring-stack"],
  ["--accent-ring-stack-scrim", "ring-stack-scrim"],
  ["--accent-ring-stack-scrim-light", "ring-stack-scrim-light"],
  ["--accent-part-edge", "part-edge"],
  ["--accent-thumb-stroke", "thumb-stroke"],
  ["--accent-mark-edge", "mark-edge"],
  ["--accent-dash-stack", "dash-stack"],
  ["--accent-slider-thumb-stack", "slider-thumb-stack"],
  ["--warning-dot-edge", "warning-dot-edge"],
  ["--success-dot-edge", "success-dot-edge"],
  ["--error-dot-edge", "error-dot-edge"],
];

const meta: Meta = { title: "_internal/Seeded brand roles", parameters: { controls: { disable: true } } };
export default meta;
type Story = StoryObj;

function samePaint(a: RGBA, b: RGBA): boolean {
  if (a.a < 0.01 && b.a < 0.01) return true;
  return Math.abs(a.a - b.a) <= 0.01 && Math.abs(a.r - b.r) <= 1 && Math.abs(a.g - b.g) <= 1 && Math.abs(a.b - b.b) <= 1;
}
const show = (c: RGBA) => `rgba(${Math.round(c.r)}, ${Math.round(c.g)}, ${Math.round(c.b)}, ${c.a.toFixed(3)})`;

type Mode = { name: string; appearance: "light" | "dark" | "inherit"; dark: boolean; apca?: boolean };
const MODES: Mode[] = [
  { name: "light", appearance: "light", dark: false },
  { name: "dark", appearance: "dark", dark: true },
  { name: "inherited dark", appearance: "inherit", dark: true },
  { name: "light, APCA", appearance: "light", dark: false, apca: true },
];

export const EveryRoleReachesTheTheme: Story = {
  render: () => <Box data-testid="host" />,
  play: async ({ canvasElement }) => {
    const rows: string[] = [];
    let read = 0;
    for (const seed of SEEDS) {
      const parsed = parseSeed(seed);
      const assessed = assessBrand(seed);
      if (!parsed.ok || !assessed.ok) throw new Error(`${seed}: refused`);
      const props = customBrandProperties(parsed.rgb);
      const host = document.createElement("div");
      canvasElement.appendChild(host);
      const root = createRoot(host);
      try {
        flushSync(() => root.render(
          <>
            {MODES.map((m) => (
              <div key={m.name} className={m.appearance === "inherit" ? "dark" : undefined}>
                <Provider accentColor={{ seed }} appearance={m.appearance} contrast={m.apca ? "apca" : "wcag"}>
                  <Box data-mode={m.name} />
                </Provider>
              </div>
            ))}
          </>,
        ));
        for (const m of MODES) {
          const theme = host.querySelector(`[data-mode="${m.name}"]`)!.closest<HTMLElement>(".radix-themes")!;
          const prefix = m.dark ? "--ds-brand-dark" : "--ds-brand";
          const want: [string, string][] = ROLES.map(([token, key]) => [token, props[`${prefix}-${key}`]!]);
          want.push(["--error-solid", props["--ds-brand-error-solid"]!]);
          if (m.apca) want.push(["--accent-contrast", props["--ds-brand-apca-contrast"]!]);
          for (const [token, value] of want) {
            read++;
            const painted = resolveColor(theme, token);
            if (!samePaint(painted, parseColor(value))) rows.push(`${seed} ${m.name} ${token}: paints ${show(painted)}, the writer wrote ${value}`);
          }
          // The filled button the theme paints is the one the assessment reports.
          const button = assessed.assessment[m.dark ? "dark" : "light"].button;
          if (!samePaint(resolveColor(theme, "--accent-solid"), parseColor(button.fill))) {
            rows.push(`${seed} ${m.name}: --accent-solid is not the assessment's ${button.fill}`);
          }
          if (!samePaint(resolveColor(theme, "--accent-9"), parseColor(seed))) rows.push(`${seed} ${m.name}: --accent-9 is not the seed`);
        }
      } finally {
        root.unmount();
        host.remove();
      }
    }
    const want = SEEDS.length * (MODES.length * (ROLES.length + 1) + 1);
    if (read !== want) throw new Error(`read ${read} roles, expected ${want}`);
    if (rows.length) throw new Error(`${rows.length} of ${read} roles differ from what the writer wrote ([[seeded-brand-writer]]):\n${rows.join("\n")}`);
  },
};
