import { useMemo, useState, type ComponentType } from "react";
import { Bell, House, Star } from "@phosphor-icons/react";
import * as Phosphor from "@phosphor-icons/react";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { Contrast } from "../theme/Contrast";
import { resolve, themeRoot } from "./_assert";
import { Page, PageHeader, Section } from "../components/ui/_storyKit";

// icon size token -> paired text leading it must equal
const PAIRS: [string, string, string][] = [
  ["--ds-icon-xs", "--ds-text-xs-leading", "XS"],
  ["--ds-icon-sm", "--ds-text-sm-leading", "Small"],
  ["--ds-icon-md", "--ds-text-md-leading", "Medium"],
  ["--ds-icon-h5", "--ds-text-h5-leading", "H5"],
  ["--ds-icon-h4", "--ds-text-h4-leading", "H4"],
  ["--ds-icon-h3", "--ds-text-h3-leading", "H3"],
];

function Icons() {
  return (
    <Page maxWidth="none">
      <PageHeader
        title="Icons · Sizes"
        standfirst="Icons align to text automatically — the icon box matches the line-height of the text beside it, so nothing needs nudging. Regular weight for most things, fill for emphasis; colour inherits from the surrounding text."
      />
      <Section title="Sized to the text beside it">
        <section style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          {PAIRS.map(([icon, , label]) => (
            <div key={icon} style={{ display: "flex", alignItems: "center", gap: 14, padding: "4px 0", borderBottom: "1px solid var(--ds-stroke-weak)" }}>
              <div style={{ width: 70, flexShrink: 0, fontFamily: "var(--code-font-family)", fontSize: 11, color: "var(--ds-text-weak)" }}>{label}</div>
              <span style={{ fontSize: `var(${icon})`, color: "var(--ds-icon-neutral)", display: "flex", flexShrink: 0 }}><House /></span>
              <span style={{ fontSize: `var(${icon.replace("--ds-icon-", "--ds-text-")}` + "-size)" as string, lineHeight: `var(${icon})`, color: "var(--ds-text-strong)" }}>
                Lines up with the text — no nudging needed
              </span>
            </div>
          ))}
        </section>
      </Section>

      <Section title="Weight — regular by default, fill for emphasis">
        <div style={{ display: "flex", gap: 24, alignItems: "center", fontSize: "var(--ds-icon-h3)" }}>
          <span style={{ color: "var(--ds-icon-neutral)", display: "flex" }}><Star weight="regular" /></span>
          <span style={{ color: "var(--ds-icon-interactive)", display: "flex" }}><Star weight="fill" /></span>
          <div style={{ display: "flex", gap: 12, alignItems: "center", padding: "8px 16px", borderRadius: "var(--ds-radius-3)", background: "var(--ds-fill-accent)", color: "var(--on-accent)", fontSize: "var(--ds-icon-md)" }}>
            <Bell weight="fill" /><span style={{ font: "600 15px var(--default-font-family)" }}>On accent fill</span>
          </div>
        </div>
      </Section>

      <Section title="Inside a Contrast section">
        <Contrast>
          <div style={{ background: "var(--ds-bg-base)", color: "var(--ds-text-strong)", padding: 16, borderRadius: "var(--ds-radius-4)", display: "flex", gap: 12, alignItems: "center", fontSize: "var(--ds-icon-md)" }}>
            <span style={{ color: "var(--ds-icon-neutral)", display: "flex" }}><House /></span>
            <span style={{ font: "400 15px var(--default-font-family)" }}>The neutral icon flips along with the section</span>
          </div>
        </Contrast>
      </Section>
    </Page>
  );
}

/* ---- searchable gallery of the full Phosphor set ------------------------- */
const NON_ICONS = new Set(["IconBase", "SSRBase"]);
const seenIcon = new Set<unknown>();
const ICON_ENTRIES = (Object.entries(Phosphor) as [string, unknown][])
  .filter(
    ([name, C]) =>
      !NON_ICONS.has(name) &&
      !!C &&
      typeof C === "object" &&
      (C as { $$typeof?: symbol }).$$typeof === Symbol.for("react.forward_ref"),
  )
  .sort((a, b) => a[0].localeCompare(b[0]))
  // Phosphor exports each glyph twice (e.g. `Acorn` + `AcornIcon`) — keep one tile per glyph (the plain name sorts first).
  .filter(([, C]) => (seenIcon.has(C) ? false : (seenIcon.add(C), true))) as [string, ComponentType<{ size?: number }>][];

function IconGallery() {
  const [q, setQ] = useState("");
  const filtered = useMemo(() => {
    const query = q.trim().toLowerCase();
    return query ? ICON_ENTRIES.filter(([name]) => name.toLowerCase().includes(query)) : ICON_ENTRIES;
  }, [q]);
  return (
    <Page maxWidth="none">
      <PageHeader
        title="Icons · Gallery"
        standfirst={
          <>
            The full Phosphor set (<span style={{ fontFamily: "var(--code-font-family)" }}>@phosphor-icons/react</span>),
            searchable. Every glyph the system can render is on this page, and each tile is labelled
            with the name you import it by. Search to narrow.
          </>
        }
      />
      <Section title="Gallery">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder={`Search ${ICON_ENTRIES.length} icons…`}
          aria-label="Search icons"
          style={{ width: "100%", maxWidth: 360, padding: "8px 12px", marginBottom: 14, borderRadius: "var(--ds-radius-3)", border: "1px solid var(--ds-stroke-strong)", background: "var(--ds-bg-subtle)", color: "var(--ds-text-strong)", font: "400 14px var(--default-font-family)" }}
        />
        <div style={{ fontSize: 11, color: "var(--ds-text-weak)", fontFamily: "var(--code-font-family)", marginBottom: 12 }}>{filtered.length} shown</div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(96px, 1fr))", gap: 4 }}>
          {filtered.map(([name, Icon]) => (
            <div key={name} title={name} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8, padding: "14px 4px", borderRadius: "var(--ds-radius-3)" }}>
              <span style={{ fontSize: "var(--ds-icon-h4)", color: "var(--ds-icon-neutral)", display: "flex" }}><Icon /></span>
              <span style={{ fontSize: 10, color: "var(--ds-text-weak)", textAlign: "center", maxWidth: "100%", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{name}</span>
            </div>
          ))}
        </div>
      </Section>
    </Page>
  );
}

const meta: Meta<typeof Icons> = {
  title: "Foundations/Icons",
  component: Icons,
  parameters: {
    docs: {
      description: {
        component:
          "Icons are Phosphor, sized to the text they sit beside — the box matches the line-height, " +
          "so they drop in without fiddling. Two weights do the work: regular for almost everything, " +
          "fill for emphasis and selected states. Colour comes from `currentColor`, so an icon takes " +
          "on whatever surrounds it — including flipping inside a Contrast section.",
      },
    },
  },
};
export default meta;
type Story = StoryObj<typeof Icons>;

export const Sizes: Story = {
  play: async ({ canvasElement }) => {
    const root = themeRoot(canvasElement);
    for (const [icon, leading, label] of PAIRS) {
      const i = resolve(root, icon);
      const l = resolve(root, leading);
      if (!i) throw new Error(`${icon} unmapped`);
      if (i !== l) throw new Error(`${label}: ${icon} (${i}) != paired ${leading} (${l})`);
    }
    // weight tokens are quoted strings -> consumed via getComputedStyle + strip quotes
    const base = resolve(root, "--ds-icon-weight-base").replace(/"/g, "");
    const emph = resolve(root, "--ds-icon-weight-emphasis").replace(/"/g, "");
    if (base !== "regular" || emph !== "fill") {
      throw new Error(`icon weight tokens wrong: base=${base} emphasis=${emph}`);
    }
  },
};

/** The full Phosphor set — searchable, for picking an icon. */
export const Gallery: Story = {
  render: () => <IconGallery />,
  // ~1500 icons: the per-tile axe sweep is heavy and these decorative glyphs aren't the concern here.
  parameters: { a11y: { test: "off" } },
};
