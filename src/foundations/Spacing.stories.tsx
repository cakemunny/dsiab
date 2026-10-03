import { useEffect, useRef, useState } from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { resolve, themeRoot } from "./_assert";
import { Page, PageHeader, Section } from "../components/ui/_storyKit";

const SPACE = ["0", "2", "4", "8", "12", "16", "20", "24", "32", "40", "48", "56", "64", "80", "96", "128"];
const RADIUS = [
  { token: "--ds-radius-1", label: "1" }, { token: "--ds-radius-2", label: "2" },
  { token: "--ds-radius-3", label: "3" }, { token: "--ds-radius-4", label: "4" },
  { token: "--ds-radius-5", label: "5" }, { token: "--ds-radius-6", label: "6" },
  { token: "--ds-radius-full", label: "full" },
];

function SpaceBar({ step }: { step: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const [px, setPx] = useState("");
  // Measure at 100× and divide: a large element aligns to the device-pixel grid,
  // so the reported value is free of the sub-pixel snapping that makes a 2px box
  // read as "1.98864px" on a scaled / Retina display.
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const probe = document.createElement("div");
    probe.style.cssText = `position:absolute;visibility:hidden;width:calc(var(--ds-space-${step}) * 100)`;
    el.parentElement?.appendChild(probe);
    const v = parseFloat(getComputedStyle(probe).width) / 100;
    probe.remove();
    setPx(Number.isInteger(v) ? `${v}px` : `${Math.round(v * 100) / 100}px`);
  }, [step]);
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 16, padding: "3px 0" }}>
      <div style={{ width: 70, flexShrink: 0, fontFamily: "var(--code-font-family)", fontSize: 12, color: "var(--ds-text-weak)" }}>space-{step}</div>
      <div ref={ref} style={{ width: `var(--ds-space-${step})`, height: 16, background: "var(--ds-fill-accent)", borderRadius: 2, flexShrink: 0 }} />
      <div style={{ fontFamily: "var(--code-font-family)", fontSize: 11, color: "var(--ds-text-weak)" }}>{px}</div>
    </div>
  );
}

function Spacing() {
  return (
    <Page maxWidth="none">
      <PageHeader
        title="Spacing & radius · Scale"
        standfirst="Spacing tokens are named by their pixel value — 16 means 16px, nothing to decode. Radius is a single brand-level dial: one setting carries every corner from sharp to pill-soft."
      />
      <Section title="Spacing — named by value, 0 to 128">
        <div>{SPACE.map((s) => <SpaceBar key={s} step={s} />)}</div>
      </Section>
      <Section title="Radius — one dial, sharp to soft">
        <div style={{ display: "flex", gap: 16 }}>
          {RADIUS.map((r) => (
            <div key={r.label} style={{ display: "flex", flexDirection: "column", gap: 6, alignItems: "center" }}>
              <div style={{ width: 64, height: 64, background: "var(--ds-fill-accent-weak)", border: "1px solid var(--ds-stroke-accent)", borderRadius: `var(${r.token})` }} />
              <div style={{ fontFamily: "var(--code-font-family)", fontSize: 11, color: "var(--ds-text-weak)" }}>{r.label}</div>
            </div>
          ))}
        </div>
      </Section>
    </Page>
  );
}

const meta: Meta<typeof Spacing> = {
  title: "Foundations/Spacing & radius",
  component: Spacing,
  parameters: {
    docs: {
      description: {
        component:
          "Spacing is named by its value, not a t-shirt size — `--ds-space-16` is 16px, nothing " +
          "to decode. The core steps (4–64) line up one-to-one with Radix's own scale, so our " +
          "components and Radix's breathe the same way; a handful of extra steps (2, 20, 56, 80, " +
          "96, 128) fill the gaps. Radius is a per-brand dial: one `<Theme radius>` setting carries " +
          "the whole UI from sharp to soft.",
      },
    },
  },
};
export default meta;
type Story = StoryObj<typeof Spacing>;

/** Every spacing step in order, then the radius scale. The check confirms the
    ramp resolves to real pixels and never goes backwards. */
export const Scale: Story = {
  play: async ({ canvasElement }) => {
    const root = themeRoot(canvasElement);
    const probe = document.createElement("div");
    root.appendChild(probe);
    let prev = -1;
    for (const s of SPACE) {
      probe.style.width = `var(--ds-space-${s})`;
      const px = parseFloat(getComputedStyle(probe).width);
      if (Number.isNaN(px)) throw new Error(`--ds-space-${s} did not resolve to px`);
      if (px < prev) throw new Error(`--ds-space-${s} (${px}px) is not >= previous (${prev}px) — scale not ascending`);
      prev = px;
    }
    probe.remove();
    // Radius "full" is a pill — maximally round, independent of the brand radius
    // dial (steps 1–6 scale with <Theme radius>; full does not). Must not be 0.
    const full = resolve(root, "--ds-radius-full");
    if (!(parseFloat(full) >= 999)) {
      throw new Error(`--ds-radius-full ("${full}") is not a pill value (expected >= 999px)`);
    }
  },
};
