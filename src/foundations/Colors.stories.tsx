import { useContext, useEffect, useLayoutEffect, useRef, useState } from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { Butterfly, Check } from "@phosphor-icons/react";
import semanticCss from "../tokens/semantic.css?raw";
import themeCss from "../tokens/theme.css?raw";
import { Contrast } from "../theme/Contrast";
import {
  ALL_ACCENTS, ALL_DS_ROLES, DS_ROLES, EXEMPT, ON_FILL, ON_TOKENS, SEMANTIC_DEFAULT,
  TEXT_ON_BG, assertNoEmpty, assertPairing, deltaEOK, expectedScales, hueDistance, luminance,
  oklab, oklchHue, resolve, resolveColor, themeRoot, tooClose, withAccent,
} from "./_assert";
import type { SemFamily } from "./_assert";
import { apcaBestForeground } from "./apca";
import { HexThemeKey, HexValue, Mono, Page, PageHeader, Section, SWATCH_GRID, TokenRow } from "../components/ui/_storyKit";

// How each family's swatch previews its token (see Specimen).
type Kind = "bg" | "text" | "icon" | "fill" | "stroke";
const KIND: Record<keyof typeof DS_ROLES, Kind> = {
  background: "bg", text: "text", icon: "icon", fill: "fill", stroke: "stroke",
};

// Presentation-only grouping: an emphasis ramp (weak -> strong) within each group,
// on a consistent spine — Neutral -> Interactive(Accent) -> Status[error, warning,
// success, info] — plus a family-specific group where the family has one. Keyed to
// the SAME token strings as DS_ROLES (the inventory the WCAG matrix asserts against),
// so this can't change membership; the Swatches play test asserts GROUPS == DS_ROLES
// per family, fail-loud, so a regroup can never orphan a token off the wall.
type Group = { label: string; tokens: string[] };
const GROUPS: Record<keyof typeof DS_ROLES, Group[]> = {
  background: [
    { label: "Surfaces", tokens: ["--ds-bg-base", "--ds-bg-subtle", "--ds-bg-sunken", "--ds-bg-raised", "--ds-bg-overlay"] },
    { label: "Attention & inverse", tokens: ["--ds-bg-high-contrast", "--ds-bg-inverse"] },
  ],
  text: [
    { label: "Neutral", tokens: ["--ds-text-strong", "--ds-text-weak", "--ds-text-disabled"] },
    { label: "Interactive", tokens: ["--ds-text-link"] },
    { label: "Status", tokens: ["--ds-text-error", "--ds-text-warning", "--ds-text-success", "--ds-text-info"] },
  ],
  icon: [
    { label: "Neutral", tokens: ["--ds-icon-neutral", "--ds-icon-disabled"] },
    { label: "Interactive", tokens: ["--ds-icon-interactive"] },
    { label: "Status", tokens: ["--ds-icon-error", "--ds-icon-warning", "--ds-icon-success", "--ds-icon-info"] },
  ],
  fill: [
    { label: "Neutral", tokens: ["--ds-fill-weaker", "--ds-fill-weak", "--ds-fill-hover", "--ds-fill-press", "--ds-fill-medium", "--ds-fill-strong", "--ds-fill-disabled"] },
    { label: "Accent", tokens: ["--ds-fill-accent-weak", "--ds-fill-accent-med", "--ds-fill-accent-hover", "--ds-fill-accent", "--ds-fill-selected-subtle", "--ds-fill-selected"] },
    { label: "Status", tokens: ["--ds-fill-error-weak", "--ds-fill-error", "--ds-fill-error-hover", "--ds-fill-warning-weak", "--ds-fill-warning", "--ds-fill-success-weak", "--ds-fill-success", "--ds-fill-info-weak", "--ds-fill-info"] },
    { label: "Scrim", tokens: ["--ds-scrim", "--ds-scrim-light", "--ds-on-scrim", "--ds-on-scrim-light"] },
  ],
  stroke: [
    { label: "Neutral", tokens: ["--ds-stroke-weak", "--ds-stroke-strong", "--ds-stroke-disabled"] },
    { label: "Interactive & focus", tokens: ["--ds-stroke-accent-weak", "--ds-stroke-accent", "--ds-stroke-focus", "--ds-stroke-focus-stack", "--ds-stroke-selected"] },
    { label: "Status", tokens: ["--ds-stroke-error-weak", "--ds-stroke-error", "--ds-stroke-warning-weak", "--ds-stroke-warning", "--ds-stroke-success-weak", "--ds-stroke-success", "--ds-stroke-info-weak", "--ds-stroke-info"] },
  ],
};

// Radix alias each role maps to, parsed from semantic.css (?raw) base block — e.g.
// --ds-fill-accent -> "accent-9". Mode-dependent roles (raised/overlay/scrim) show
// their light-mode mapping; the hex resolves live for the active mode.
const semanticBase = semanticCss.slice(0, semanticCss.search(/:where\(\.dark/));
function aliasOf(token: string): string {
  const m = semanticBase.match(new RegExp(`${token}\\s*:\\s*([^;]+);`));
  if (!m) return "";
  const v = m[1].trim();
  return v.match(/var\(\s*--([\w-]+)\s*\)/)?.[1] ?? v;
}

// Any computed colour (rgb / oklch / color(display-p3 …)) -> a stable sRGB hex via a
// canvas — robust across displays, where getComputedStyle alone serves display-p3 on
// a P3 screen. Alpha tokens come back as 8-digit #rrggbbaa. (Same approach as
// _storyKit's toHex; here it's also what makes the resolved value human-readable.)
function toHex(color: string): string {
  const ctx = document.createElement("canvas").getContext("2d", { willReadFrequently: true });
  if (!ctx) return color;
  // Rasterise one pixel and read it back: the canvas backing store is sRGB, so this
  // converts any input gamut (rgb / oklch / color(display-p3 …)) to real sRGB bytes.
  // Robust on P3 displays — reading fillStyle back would just echo display-p3.
  ctx.clearRect(0, 0, 1, 1);
  ctx.fillStyle = color;
  ctx.fillRect(0, 0, 1, 1);
  const [r, g, b, a] = ctx.getImageData(0, 0, 1, 1).data;
  const h = (n: number) => n.toString(16).padStart(2, "0");
  return a === 255 ? `#${h(r)}${h(g)}${h(b)}` : `#${h(r)}${h(g)}${h(b)}${h(a)}`;
}

// Short note distinguishing the two stacking layers most likely to be conflated.
const DESC: Partial<Record<keyof typeof DS_ROLES, string>> = {
  background:
    "Surfaces you build on: page, recessed wells, raised cards, floating overlays. They form an elevation stack and are mostly opaque — a floating surface that's translucent bleeds the layer beneath through.",
  fill:
    "Colour inside a component: a button body, a selected row, a status chip. Fills sit on top of a background and are mostly alpha, so one fill token works on any surface without adjustment. Quick rule: if it's a container, use a Background; if it's a control sitting on that container, use a Fill.",
};

// Status families remap per accent (collision avoidance). For a status token, the
// alias the page shows is the IN-EFFECT Radix scale (e.g. amber brand -> error
// resolves to ruby, so --ds-fill-error reads "ruby-9", not the static "error-9").
// Non-status tokens keep their static alias.
const STATUS = ["error", "warning", "success", "info"] as const;
function statusFamily(name: string): SemFamily | null {
  return (name.match(/-(error|warning|success|info)(?:-weak)?$/)?.[1] as SemFamily) ?? null;
}
// The fills that carry text route through a family-layer role in theme.css ([[text-on-solid-fill-contrast]]), which an
// accent's block may pin to a literal. Follow that one hop, so the alias names the step in effect
// for the accent, or says the value is a pin (the hex column shows which).
const themeSource = themeCss.replace(/\/\*[\s\S]*?\*\//g, "");
const themeBase = themeSource.match(/\n\.radix-themes \{([^}]*)\}/)?.[1] ?? "";
function solidAlias(prop: string, accent: string): string {
  // A colour can own more than one block since [[part-colour-parity]] moved the text-fill pins into a table of their
  // own, so the reader takes the first block for the colour that declares the prop.
  const declared = new RegExp(`--${prop}\\s*:\\s*([^;]+);`);
  const blocks = themeSource.matchAll(new RegExp(`\\n\\.radix-themes\\[data-accent-color="${accent}"\\][^{]*\\{([^}]*)\\}`, "g"));
  const own = [...blocks].map((m) => m[1].match(declared)).find((m) => m);
  const value = (own ?? themeBase.match(declared))?.[1].trim() ?? "";
  return value.match(/^var\(\s*--([\w-]+)\s*\)$/)?.[1] ?? `${prop} · pinned`;
}
// The hover roles on a solid fill are not fills of their own ([[text-on-solid-fill-contrast]]). Each is a Radix alpha laid
// over the rest fill, black under a white label, and semantic.css keys the white one to the
// accents whose label is dark. Read that accent-keyed block where it names the accent.
const semanticKeyed = [...semanticBase.replace(/\/\*[\s\S]*?\*\//g, "").matchAll(/\n\.radix-themes:where\(([^)]*)\)\s*\{([^}]*)\}/g)];
function overlayAlias(name: string, accent: string): string {
  const keyed = semanticKeyed.find((m) => m[1].includes(`[data-accent-color="${accent}"]`));
  const v = keyed?.[2].match(new RegExp(`${name}\\s*:\\s*var\\(\\s*--([\\w-]+)\\s*\\)`))?.[1] ?? aliasOf(name);
  return `${v} · overlay`;
}
function dynamicAlias(name: string, accent: string): string {
  if (/^--ds-fill-(accent|error)-hover$/.test(name)) return overlayAlias(name, accent);
  const direct = aliasOf(name);
  const a = /^(accent|error)-solid$/.test(direct) ? solidAlias(direct, accent) : direct;
  const fam = STATUS.find((f) => new RegExp(`^${f}-a?\\d+$`).test(a));
  return fam ? `${expectedScales(accent)[fam]}-${a.slice(fam.length + 1)}` : a;
}

const CHIP = { width: 40, height: 28, flexShrink: 0, borderRadius: "var(--ds-radius-2)" } as const;

/** Previews a token the way it's actually used: a fill is filled, a stroke is a
    border, an icon is a tinted glyph, text is tinted type. */
function Specimen({ name, kind }: { name: string; kind: Kind }) {
  if (kind === "stroke") {
    // The token IS the border — transparent fill, 2px so subtle alpha strokes read.
    return <div style={{ ...CHIP, background: "transparent", border: `2px solid var(${name})` }} />;
  }
  if (kind === "icon") {
    return (
      <div style={{ ...CHIP, border: "1px solid var(--ds-stroke-weak)", background: "var(--ds-bg-base)", color: `var(${name})`, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <Butterfly size={18} weight="fill" />
      </div>
    );
  }
  if (kind === "text") {
    return (
      <div style={{ ...CHIP, border: "1px solid var(--ds-stroke-weak)", background: "var(--ds-bg-base)", color: `var(${name})`, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, fontSize: 14 }}>Aa</div>
    );
  }
  // bg | fill — a filled chip; the border keeps light / alpha fills visible on the card.
  return <div style={{ ...CHIP, border: "1px solid var(--ds-stroke-weak)", background: `var(${name})` }} />;
}

function Swatch({ name, kind, accent }: { name: string; kind: Kind; accent: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const [hex, setHex] = useState("");
  useEffect(() => {
    const root = ref.current?.closest(".radix-themes") ?? document.querySelector(".radix-themes");
    const v = root ? getComputedStyle(root).getPropertyValue(name).trim() : "";
    setHex(v ? toHex(v) : "");
  }, [name, accent]); // re-read on brand change — status families remap per accent
  const empty = hex === "";
  const alias = dynamicAlias(name, accent);
  const mono = { fontFamily: "var(--code-font-family)" } as const;
  // A shifted family carries one inline note, on its solid fill row.
  const fam = statusFamily(name);
  const note =
    fam && name === `--ds-fill-${fam}` && expectedScales(accent)[fam] !== SEMANTIC_DEFAULT[fam]
      ? `↳ shifted off ${SEMANTIC_DEFAULT[fam]} to stay distinct under the ${accent} brand`
      : null;
  return (
    // The row renders on the SHARED token-row primitive (_storyKit's TokenRow at the
    // SWATCH_GRID density) rather than a locally-declared four-column grid — one
    // definition of "specimen · token · alias · value", so the wall and the per-component
    // spec cards can't drift apart, and every row carries data-token-row for the runtime
    // shape assertion. The empty/unmapped alarm is this page's own concern, passed as
    // style. (`ref` moved to the wrapper: it only finds the .radix-themes ancestor, which
    // is the same element either way.)
    <div ref={ref}>
      <TokenRow
        grid={SWATCH_GRID}
        style={{
          outline: empty ? "2px solid red" : "none",
          background: empty ? "rgba(255,0,0,0.08)" : "transparent",
        }}
      >
        <Specimen name={name} kind={kind} />
        <code style={{ ...mono, fontSize: 12, color: "var(--ds-text-strong)", overflow: "hidden", textOverflow: "ellipsis" }}>
          {name}
        </code>
        <code style={{ ...mono, fontSize: 11, color: "var(--ds-text-weak)" }}>{alias}</code>
        <code style={{ ...mono, fontSize: 11, color: empty ? "red" : "var(--ds-text-weak)" }}>
          {empty ? "⚠ UNMAPPED" : hex}
        </code>
      </TokenRow>
      {note && (
        <div style={{ ...mono, fontSize: 11, fontStyle: "italic", color: "var(--ds-text-weak)", padding: "0 8px 4px 62px" }}>
          {note}
        </div>
      )}
    </div>
  );
}

// Composites an alpha token `depth` times over `base`, live — so the stacked effective colour
// re-resolves on every brand/appearance flip (P3-safe via the 1x1 canvas, like _storyKit.toHex).
function StackHex({ alpha, depth, base }: { alpha: string; depth: number; base: string }) {
  const aRef = useRef<HTMLSpanElement>(null);
  const bRef = useRef<HTMLSpanElement>(null);
  const [hex, setHex] = useState("");
  const key = useContext(HexThemeKey);
  useLayoutEffect(() => {
    const ctx = document.createElement("canvas").getContext("2d", { willReadFrequently: true });
    if (!ctx || !aRef.current || !bRef.current) return;
    ctx.fillStyle = getComputedStyle(bRef.current).color;
    ctx.fillRect(0, 0, 1, 1);
    const a = getComputedStyle(aRef.current).color;
    for (let i = 0; i < depth; i++) { ctx.fillStyle = a; ctx.fillRect(0, 0, 1, 1); }
    const [r, g, b] = ctx.getImageData(0, 0, 1, 1).data;
    const h = (n: number) => n.toString(16).padStart(2, "0");
    setHex(`#${h(r)}${h(g)}${h(b)}`);
  }, [key, alpha, depth, base]);
  return (
    <Mono muted>
      <span ref={aRef} aria-hidden style={{ color: `var(${alpha})`, position: "absolute", width: 0, height: 0, overflow: "hidden" }} />
      <span ref={bRef} aria-hidden style={{ color: `var(${base})`, position: "absolute", width: 0, height: 0, overflow: "hidden" }} />
      {hex || "—"}
    </Mono>
  );
}

// The accent + semantic roles in the overlay strip (each a soft section with a soft badge).
const OVERLAY_ROLES: { key: string; label: string }[] = [
  { key: "accent", label: "Featured" },
  { key: "error", label: "Error" },
  { key: "warning", label: "Warning" },
  { key: "success", label: "Success" },
  { key: "info", label: "Info" },
];

function ColorRoles({ accent = "iris", appearance = "light" }: { accent?: string; appearance?: string }) {
  return (
    <Page maxWidth="none">
      <PageHeader
        title="Colors · Swatches"
        standfirst="The system's colour vocabulary in one place — every role shown as the thing it actually is: a background, a text colour, an icon tint, a fill, a stroke. Switch the Accent or Appearance toolbar and the whole wall re-skins; nothing here is hard-coded."
      />
      <Section title="Text & icons on a solid fill">
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {[
            ["--ds-fill-accent", "--on-accent", "Accent"],
            ["--ds-fill-error", "--on-error", "Error"],
            ["--ds-fill-warning", "--on-warning", "Warning"],
            ["--ds-fill-success", "--on-success", "Success"],
            ["--ds-fill-info", "--on-info", "Info"],
          ].map(([bg, fg, label]) => (
            <div key={label} style={{ background: `var(${bg})`, color: `var(${fg})`, padding: "10px 16px", borderRadius: "var(--ds-radius-3)", fontWeight: 600 }}>
              {label}
            </div>
          ))}
        </div>
      </Section>
      <Section
        title="Contrast & accessibility"
        lead={<>All text stays legible regardless of brand or mode: WCAG AA 4.5:1 for text, and a label on a solid fill also reaches APCA Lc 60, at rest and on hover. APCA is also available as an opt-in lens through the toolbar. Status is never colour alone — always colour <em>and</em> an icon. Flip the Appearance toolbar; the block below inverts with it.</>}
      >
        <div style={{ maxWidth: "var(--ds-text-measure)" }}>
          <Contrast>
            <div style={{ background: "var(--ds-bg-base)", color: "var(--ds-text-strong)", padding: 16, borderRadius: "var(--ds-radius-4)" }}>
              Same default roles as everywhere else — but this block renders at the opposite
              appearance. Flip the Appearance toolbar and watch it invert along with the mode.
            </div>
          </Contrast>
        </div>
      </Section>
      <Section title="Alpha compounds when stacked">
        <HexThemeKey.Provider value={`${accent}-${appearance}`}>
          <p style={{ font: "400 14px/21px var(--default-font-family)", color: "var(--ds-text-weak)", maxWidth: "var(--ds-text-measure)", margin: "0 0 16px" }}>
            Stack surfaces with the same alpha token and each layer <strong style={{ color: "var(--ds-text-strong)", fontWeight: 600 }}>deepens</strong> — the nested tint compounds, so Background, Card, and Badge each read as a distinct surface without a border. The opaque{" "}
            <span style={{ fontFamily: "var(--code-font-family)" }}>--gray-3</span> renders as one fixed value no matter how deep — a solid block with no visible separation. No borders: the tint alone separates layers, and each level shows its resolved value.
          </p>
          <div style={{ display: "flex", gap: 32, flexWrap: "wrap", alignItems: "flex-start" }}>
            <div style={{ display: "flex", flexDirection: "column", gap: 10, width: 320 }}>
              <div style={{ font: "700 11px var(--code-font-family)", color: "var(--ds-text-success)" }}>ALPHA · --gray-a3 every level → stacks</div>
              <div style={{ background: "var(--gray-a3)", borderRadius: "var(--ds-radius-4)", padding: 20 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 10 }}>
                  <span style={{ font: "600 14px var(--default-font-family)" }}>1. Background</span>
                  <StackHex alpha="--gray-a3" depth={1} base="--ds-bg-base" />
                </div>
                <div style={{ background: "var(--gray-a3)", borderRadius: "var(--ds-radius-3)", padding: 18 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 10 }}>
                    <span style={{ font: "600 14px var(--default-font-family)" }}>2. Card</span>
                    <StackHex alpha="--gray-a3" depth={2} base="--ds-bg-base" />
                  </div>
                  <div style={{ display: "inline-flex", alignItems: "center", gap: 7, background: "var(--gray-a3)", borderRadius: "var(--ds-radius-2)", padding: "7px 12px" }}>
                    <Check size={13} weight="bold" />
                    <span style={{ font: "600 13px var(--default-font-family)" }}>3. Badge</span>
                    <StackHex alpha="--gray-a3" depth={3} base="--ds-bg-base" />
                  </div>
                </div>
              </div>
              <div style={{ font: "400 12px var(--default-font-family)", color: "var(--ds-text-weak)" }}>same token · 3 distinct surfaces</div>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 10, width: 320 }}>
              <div style={{ font: "700 11px var(--code-font-family)", color: "var(--ds-text-error)" }}>OPAQUE · --gray-3 every level → flat block</div>
              <div style={{ background: "var(--gray-3)", borderRadius: "var(--ds-radius-4)", padding: 20 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 10 }}>
                  <span style={{ font: "600 14px var(--default-font-family)" }}>1. Background</span>
                  <HexValue token="--gray-3" />
                </div>
                <div style={{ background: "var(--gray-3)", borderRadius: "var(--ds-radius-3)", padding: 18 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 10 }}>
                    <span style={{ font: "600 14px var(--default-font-family)" }}>2. Card</span>
                    <HexValue token="--gray-3" />
                  </div>
                  <div style={{ display: "inline-flex", alignItems: "center", gap: 7, background: "var(--gray-3)", borderRadius: "var(--ds-radius-2)", padding: "7px 12px" }}>
                    <Check size={13} weight="bold" />
                    <span style={{ font: "600 13px var(--default-font-family)" }}>3. Badge</span>
                    <HexValue token="--gray-3" />
                  </div>
                </div>
              </div>
              <div style={{ font: "400 12px var(--default-font-family)", color: "var(--ds-text-weak)" }}>same token · 1 block, no separation</div>
            </div>
          </div>
          <div style={{ marginTop: 24 }}>
            <div style={{ font: "700 11px var(--code-font-family)", color: "var(--ds-text-weak)", letterSpacing: "0.05em", textTransform: "uppercase", marginBottom: 12 }}>
              Semantic overlays — a soft badge on an inline section, both the same {"--<role>-a3"}
            </div>
            <div style={{ display: "flex", gap: 14, flexWrap: "wrap" }}>
              {OVERLAY_ROLES.map(({ key, label }) => (
                <div key={key} style={{ display: "flex", flexDirection: "column", gap: 8, minWidth: 184, flex: "1 1 184px" }}>
                  <div style={{ font: "700 10px var(--code-font-family)", letterSpacing: "0.04em", textTransform: "uppercase", color: `var(--${key}-11)` }}>{key} · --{key}-a3</div>
                  <div style={{ background: `var(--${key}-a3)`, borderRadius: "var(--ds-radius-4)", padding: 14, display: "flex", flexDirection: "column", gap: 9 }}>
                    <div style={{ display: "inline-flex", alignSelf: "flex-start", alignItems: "center", gap: 6, background: `var(--${key}-a3)`, borderRadius: "var(--ds-radius-2)", padding: "4px 10px" }}>
                      <span style={{ width: 7, height: 7, borderRadius: 9999, background: `var(--${key}-9)` }} />
                      <span style={{ font: "600 13px var(--default-font-family)", color: `var(--${key}-11)` }}>{label}</span>
                    </div>
                    <div style={{ font: "400 11px var(--default-font-family)", color: `var(--${key}-11)`, opacity: 0.9 }}>
                      section <StackHex alpha={`--${key}-a3`} depth={1} base="--ds-bg-base" /> · badge <StackHex alpha={`--${key}-a3`} depth={2} base="--ds-bg-base" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </HexThemeKey.Provider>
      </Section>
      {(Object.keys(GROUPS) as (keyof typeof GROUPS)[]).map((family) => (
        <Section key={family} title={family.charAt(0).toUpperCase() + family.slice(1)} lead={DESC[family]}>
          {GROUPS[family].map((g) => (
            <div key={g.label} style={{ marginBottom: 14 }}>
              <div style={{ fontFamily: "var(--code-font-family)", fontSize: 10, letterSpacing: "0.07em", textTransform: "uppercase", color: "var(--ds-text-weak)", marginBottom: 4, paddingLeft: 8 }}>
                {g.label}
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(480px, 1fr))", columnGap: 28 }}>
                {g.tokens.map((n) => <Swatch key={n} name={n} kind={KIND[family]} accent={accent} />)}
              </div>
            </div>
          ))}
        </Section>
      ))}
    </Page>
  );
}

const meta: Meta<typeof ColorRoles> = {
  title: "Foundations/Colors",
  component: ColorRoles,
  render: (_args, ctx) => <ColorRoles accent={ctx.globals.accent as string} appearance={ctx.globals.appearance as string} />,
  // This file renders raw colour-token SPECIMENS — including intentionally
  // low-contrast ones (disabled = exempt) and solid-fill chips. axe's
  // color-contrast rule is a false positive on a swatch wall, so it's scoped off
  // here; real contrast is verified by the assertion matrix (assertPairing).
  // Every other axe rule stays active.
  parameters: {
    a11y: { config: { rules: [{ id: "color-contrast", enabled: false }] } },
    docs: {
      description: {
        component:
          "Every `--ds-*` role as a swatch with its resolved value — what each one actually is, " +
          "grouped by the job it does: backgrounds, text, icons, fills, strokes. Each maps onto a " +
          "step of Radix's 1–12 scale, so swapping the Accent or Appearance toolbar re-skins the " +
          "whole wall — nothing here is hard-coded. The Accent list includes oxblood, a 27th custom " +
          "deep-red preset (not a Radix scale) that the red family — red / ruby / crimson / tomato — " +
          "routes its error to, so a red brand's error reads as a distinct deep red instead of a " +
          "near-identical crimson; pick oxblood to view it as a brand (it keeps a normal red error). " +
          "Collision avoidance is perceptual — a brand and a semantic re-route only when close in BOTH " +
          "ΔE-OK and hue, so e.g. a teal brand's info moves to indigo and success to lime, a pink brand's " +
          "error to oxblood (semantic↔semantic stays on hue + colour-not-alone).",
      },
    },
  },
};
export default meta;
type Story = StoryObj<typeof ColorRoles>;

/** The full set of roles at the current toolbar settings. If any role fails to
    resolve, its swatch turns red on the spot — so gaps are impossible to miss. */
export const Swatches: Story = {
  play: async ({ canvasElement }) => {
    const root = themeRoot(canvasElement);
    assertNoEmpty(root, ALL_DS_ROLES);
    // The presentation GROUPS must cover exactly DS_ROLES per family — the regroup
    // can't silently orphan or duplicate a token off the wall.
    for (const family of Object.keys(GROUPS) as (keyof typeof GROUPS)[]) {
      const grouped = GROUPS[family].flatMap((g) => g.tokens);
      const set = new Set(grouped);
      const expected = DS_ROLES[family];
      const missing = expected.filter((t) => !set.has(t));
      if (grouped.length !== set.size || set.size !== expected.length || missing.length) {
        throw new Error(`GROUPS.${family} != DS_ROLES.${family} (missing / dupe: ${missing.join(", ") || "count mismatch"})`);
      }
    }

    // Self-verifying doc: the dynamic alias reflects the per-accent shift the page
    // renders (the inline note rides the same expectedScales check). Amber is the
    // worked case — error→oxblood (clears the orange warning), warning→orange, success unchanged.
    if (dynamicAlias("--ds-fill-error", "amber") !== "oxblood-9") throw new Error("doc: amber error alias should read oxblood-9");
    if (dynamicAlias("--ds-fill-warning", "amber") !== "orange-9") throw new Error("doc: amber warning alias should read orange-9");
    if (dynamicAlias("--ds-fill-success", "amber") !== "green-9") throw new Error("doc: amber success alias should stay green-9");
    // The fills that carry text follow the one hop into theme.css ([[text-on-solid-fill-contrast]]): the step in effect, or a
    // pin. Their hover roles read as the overlay they are, with the polarity semantic.css keys.
    const solidDoc: [string, string, string][] = [
      ["--ds-fill-accent", "iris", "accent-9"],
      ["--ds-fill-accent", "cyan", "accent-solid · pinned"],
      ["--ds-fill-error", "iris", "error-solid · pinned"],
      ["--ds-fill-accent-hover", "iris", "black-a2 · overlay"],
      ["--ds-fill-accent-hover", "amber", "white-a4 · overlay"],
      ["--ds-fill-error-hover", "amber", "black-a2 · overlay"],
    ];
    for (const [name, accent, want] of solidDoc) {
      const got = dynamicAlias(name, accent);
      if (got !== want) throw new Error(`doc: ${accent} ${name} alias should read "${want}", reads "${got}"`);
    }

    // Full WCAG + collision matrix — every Radix accent under BOTH appearances. Run on a
    // hidden, detached clone of the theme root so the visible page never flickers and the
    // live toolbar state is never touched (a play on this page would otherwise mutate it).
    // WCAG ratios are sRGB-defined; on a P3 display getComputedStyle hands back Radix's P3
    // variants (which map to slightly lower sRGB contrast) and the sRGB fallback can't be
    // read back — so the ratio checks run only in an sRGB context (CI / headless). The
    // collision + hue checks are gamut-robust and always run. See DECISIONS [[srgb-contrast-checks]].
    const sRGB = !window.matchMedia?.("(color-gamut: p3)")?.matches;
    if (!sRGB) console.info("[Foundations/Colors] P3 display — sRGB WCAG ratios are enforced in CI only; collision + hue checks still run here.");
    const probe = document.createElement("div");
    for (const a of Array.from(root.attributes)) probe.setAttribute(a.name, a.value);
    probe.style.cssText = "position:fixed;left:-9999px;top:0;width:640px";
    document.body.appendChild(probe);
    const fails: string[] = [];
    try {
      for (const appearance of ["light", "dark"] as const) {
        probe.classList.toggle("dark", appearance === "dark");
        fails.push(...colourMatrixFails(probe, sRGB));
        // APCA foreground drift guard runs light-mode only (Phase 1).
        if (appearance === "light") fails.push(...apcaForegroundFails(probe));
      }
    } finally {
      probe.remove();
    }
    if (fails.length) throw new Error(`Colour matrix failures:\n  ${fails.join("\n  ")}`);
  },
};

/** Per-appearance WCAG + collision checks across all 26 Radix accents, returned as a
    failure list. The single Swatches play calls this under both appearances — it's the
    only Colors story now, no separate matrix pages. Expected scales come from
    COLLISION_TABLE so the test and the CSS blocks can't drift. */
const SEMANTIC_FILL: Record<SemFamily, { fill: string; on: string }> = {
  error: { fill: "--ds-fill-error", on: "--on-error" },
  warning: { fill: "--ds-fill-warning", on: "--on-warning" },
  success: { fill: "--ds-fill-success", on: "--on-success" },
  info: { fill: "--ds-fill-info", on: "--on-info" },
};

// Pairings whose colour depends on the accent (status text/link + on-fill); the
// neutral ones (text-strong/weak on bg) are accent-independent, checked once.
const accentDependent = (p: { fg: string }) => /--ds-text-(link|error|warning|success|info)/.test(p.fg);

function colourMatrixFails(root: HTMLElement, checkContrast = true): string[] {
  assertNoEmpty(root, [...ALL_DS_ROLES, ...ON_TOKENS, ...EXEMPT]);
  if (checkContrast) for (const p of TEXT_ON_BG.filter((p) => !accentDependent(p))) assertPairing(root, p.fg, p.bg, p.min);

  const families = Object.keys(SEMANTIC_FILL) as SemFamily[];
  const fails: string[] = [];
  for (const accent of ALL_ACCENTS) {
    const restore = withAccent(root, accent);
    try {
      const scales = expectedScales(accent);
      // Drift guard: live --<family>-9 must resolve to the scale the table predicts.
      for (const fam of families) {
        if (hueDistance(oklchHue(root, `var(--${fam}-9)`), oklchHue(root, `var(--${scales[fam]}-9)`)) > 1) {
          fails.push(`[${accent}] ${fam}-9 != ${scales[fam]} — CSS/table drift`);
        }
      }
      // No collision under the perceptual gate (ΔE-OK AND hue) — brand↔semantic AND
      // semantic↔semantic alike. Hue alone missed hue-apart-but-close pairs (teal/cyan),
      // and the ΔE axis catches lightness-only separation a hue gate can't see (oxblood
      // error vs orange warning: 16deg hue but ΔE-OK 0.28). gray is neutral (~0 chroma) so
      // its hue is meaningless — skip its brand check (it reads distinct by chroma).
      const brandHue = oklchHue(root, "var(--accent-9)");
      const brandLab = oklab(root, "var(--accent-9)");
      const sem = Object.fromEntries(families.map((f) => [f, oklchHue(root, `var(--${f}-9)`)])) as Record<SemFamily, number>;
      const semLabs = Object.fromEntries(families.map((f) => [f, oklab(root, `var(--${f}-9)`)])) as Record<SemFamily, [number, number, number]>;
      if (accent !== "gray") {
        for (const fam of families) {
          if (tooClose(brandLab, brandHue, semLabs[fam], sem[fam])) {
            fails.push(`[${accent}] brand vs ${fam} too close: ΔE-OK ${deltaEOK(brandLab, semLabs[fam]).toFixed(3)} & hue ${hueDistance(brandHue, sem[fam]).toFixed(1)}deg (via ${scales[fam]})`);
          }
        }
      }
      for (let i = 0; i < families.length; i++) {
        for (let j = i + 1; j < families.length; j++) {
          const a = families[i], b = families[j];
          if (tooClose(semLabs[a], sem[a], semLabs[b], sem[b])) {
            fails.push(`[${accent}] ${a} vs ${b} too close: ΔE-OK ${deltaEOK(semLabs[a], semLabs[b]).toFixed(3)} & hue ${hueDistance(sem[a], sem[b]).toFixed(1)}deg`);
          }
        }
      }
      // Accent-dependent WCAG: on-fill (3.0) + status/link text on bg.
      if (checkContrast) for (const p of [...ON_FILL, ...TEXT_ON_BG.filter(accentDependent)]) {
        try { assertPairing(root, p.fg, p.bg, p.min); } catch (e) { fails.push(`[${accent}] ${(e as Error).message}`); }
      }
    } finally {
      restore();
    }
  }
  return fails;
}

/** Every on-SOLID fill + the foreground that sits on it. APCA mode must choose
    each foreground by Lc, so each pair is drift-guarded below. The fill resolves
    to its IN-EFFECT scale per accent (collision shifts included), so e.g. a
    yellow brand's --warning-9 is orange-9 and its --warning-contrast must follow
    APCA on orange, exactly like an orange accent's --accent-contrast. */
const APCA_ON_SOLID: [string, string][] = [
  ["--accent-9", "--accent-contrast"],
  ["--error-9", "--error-contrast"],
  ["--warning-9", "--warning-contrast"],
  ["--success-9", "--success-contrast"],
  ["--info-9", "--info-contrast"],
];

/** APCA contrast-mode drift guard. With data-contrast="apca", every on-solid
    foreground must match the polarity APCA prefers on its fill (apcaBestForeground)
    — exactly what tokens/contrast.css overrides. So the override layer and the live
    APCA computation can't drift, the same guarantee COLLISION_TABLE has. Light mode
    (Phase 1); dark-mode foreground is Phase 2 (see tokens/contrast.css). */
function apcaForegroundFails(root: HTMLElement): string[] {
  const fails: string[] = [];
  const prev = root.getAttribute("data-contrast");
  root.setAttribute("data-contrast", "apca");
  try {
    for (const accent of ALL_ACCENTS) {
      const restore = withAccent(root, accent);
      try {
        for (const [fillVar, fgVar] of APCA_ON_SOLID) {
          const want = apcaBestForeground(resolveColor(root, fillVar)); // APCA's polarity
          const got = luminance(resolveColor(root, fgVar)) > 0.5 ? "light" : "dark"; // served
          if (want !== got) {
            fails.push(`[${accent}] apca ${fgVar} is ${got}; APCA prefers ${want} on ${fillVar}`);
          }
        }
      } finally {
        restore();
      }
    }
  } finally {
    if (prev == null) root.removeAttribute("data-contrast");
    else root.setAttribute("data-contrast", prev);
  }
  return fails;
}

/** Fixture: an intentionally-unmapped role must trip the fail-loud path.
    Opts OUT of the axe gate — it renders a deliberate error state.

    `!dev` REMOVES IT FROM THE READER'S SIDEBAR, and it is what makes the page-header guard's own
    exemption note true: that note calls this "not a page a reader can land on", which was false while
    the story shipped as a clickable leaf under Foundations/Colors. `!dev` subtracts the sidebar tag
    only — the `test` tag is untouched, so the vitest browser lane still collects and runs this play in
    both appearance lanes (verified before and after the tag: 2 story specs, 4 tests, "Fail Loud Probe"
    named in both). Hiding a story from the sidebar and excusing it from a guard are the same claim
    here, so they land together. */
export const FailLoudProbe: Story = {
  tags: ["!dev"],
  parameters: { a11y: { test: "off" } },
  render: () => (
    <div className="radix-themes" style={{ padding: 16 }}>
      <Swatch name="--ds-__probe-unmapped" kind="fill" accent="iris" />
    </div>
  ),
  play: async ({ canvasElement }) => {
    const root = themeRoot(canvasElement);
    if (resolve(root, "--ds-__probe-unmapped") !== "") {
      throw new Error("Probe unexpectedly resolved — negative test invalid");
    }
    let threw = false;
    try {
      assertNoEmpty(root, ["--ds-__probe-unmapped"]);
    } catch {
      threw = true;
    }
    if (!threw) throw new Error("assertNoEmpty did not fire on an unmapped role");
  },
};
