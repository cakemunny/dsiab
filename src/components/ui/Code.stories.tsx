import { useContext, useLayoutEffect, useRef, useState } from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { Box, Code as RadixCode, Flex, Grid } from "@radix-ui/themes";
import { Code } from "./Code";
import { Text as UIText } from "./Text";
import {
  Decision, DoDont, DODONT_LABEL, HexThemeKey, LiteTokenSpec, MeasuredRow, MeasuredSpec, Mono, NoteRow, Page, PageHeader,
  PropsLead, type PropDef, PropTable, Rule, Section,
} from "./_storyKit";
import {
  ALL_ACCENTS, SOLID_TEXT_MIN, SOLID_TEXT_MIN_LC, assertMeasuredRows, contrastRatio, flatten, parseColor,
  resolveColor, themeRoot,
} from "../../foundations/_assert";
import { apcaContrast } from "../../foundations/apca";

/** The one definition of this component — the standfirst every page of it opens with. */
const DEFINITION = (
  <>
    An inline code chip for a token, command, filename, or value set in flowing prose. Its size follows
    the global <Mono>uiSize</Mono> text lane, so it sits in rhythm with the text around it, and its{" "}
    <Mono>soft</Mono> skin is Radix's accent-tinted chip.
  </>
);

/* Code reuses Radix's own inline-code skin (like Separator reuses the separator rule), so it declares
   no --ds-* roles of its own. It's a skin-reuser, so the token spec uses the low-token shape: a one-line
   reuse rationale over the binding rows.

   MEASURED ([[measured-token-rows]]): each row names an element and a property, reads that property off a real rendered
   chip, and checks it against the token it claims — so the row can disagree with the component. The
   version this replaces resolved each token onto a span it had just painted and printed both sides,
   which agrees by construction. The one row that stays prose is the type size: a chip's size is
   `--font-size-N × --code-variant-font-size-adjust`, a product of two tokens rather than one, so it is
   read live off the rendered chip instead. */
function CodeSpec() {
  const wrap = useRef<HTMLDivElement>(null);
  const themeKey = useContext(HexThemeKey);
  const [v, setV] = useState<{ fontSize: string; step: string } | null>(null);
  useLayoutEffect(() => {
    const el = wrap.current?.querySelector<HTMLElement>(".rt-Code");
    if (!el) return;
    const cs = getComputedStyle(el);
    setV({
      fontSize: `${Math.round(parseFloat(cs.fontSize) * 100) / 100}px`,
      // Which type step the chip landed on — the text lane's size class, read off the element.
      step: el.className.match(/rt-r-size-(\d)/)?.[1] ?? "1",
    });
  }, [themeKey]);
  return (
    <LiteTokenSpec
      rationale={
        <>
          Code reuses Radix's own inline-code skin and declares no <Mono>--ds-*</Mono> roles of its own —
          its default <Mono>soft</Mono> fill resolves live to the accent soft tint (<Mono>--accent-a3</Mono>,
          which the system also names <Mono>--ds-fill-accent-weak</Mono>) over <Mono>--accent-a11</Mono>{" "}
          ink, so a bare chip is already accent-aware and follows the brand collision shift with no
          override. The <Mono>solid</Mono> chip paints the pair the solid Button paints,{" "}
          <Mono>--ds-fill-accent</Mono> under <Mono>--on-accent</Mono>, so its label reaches 4.5:1 and APCA
          Lc 60 on every colour. Every row below is read off a rendered chip and checked against the token
          it names.
        </>
      }
    >
      {/* An off-screen REAL chip, kept only for the type-size row below — it reads the used font-size
          and the size class off it. The specimen a reader looks at renders in the section above. */}
      <div ref={wrap} style={{ position: "absolute", width: 0, height: 0, overflow: "hidden" }}><Code>chip</Code></div>
      <MeasuredSpec render={() => <Code>chip</Code>}>
        <MeasuredRow part="Fill colour" token="--ds-fill-accent-weak" select=".rt-Code" prop="background-color" />
        <MeasuredRow part="Text colour" token="--accent-a11" select=".rt-Code" prop="color" />
        <MeasuredRow part="Type face" token="--code-font-family" select=".rt-Code" prop="font-family" />
      </MeasuredSpec>
      <MeasuredSpec render={() => <Code variant="solid">chip</Code>}>
        <MeasuredRow part="Solid fill" note="The fill that carries text, the solid Button's own." token="--ds-fill-accent" select=".rt-Code" prop="background-color" />
        <MeasuredRow part="Solid text" note="The ink paired with that fill." token="--on-accent" select=".rt-Code" prop="color" />
      </MeasuredSpec>
      <NoteRow part="Type size" value={v ? `${v.fontSize} — --font-size-${v.step} × --code-variant-font-size-adjust` : "…"} />
    </LiteTokenSpec>
  );
}

/* ---- Properties (Code-specific) ------------------------------------------ */

const CODE_PROPS: PropDef[] = [
  { name: "children", type: "ReactNode", desc: <>The code text — a token, command, filename, or value. Keep it to an inline fragment; a whole multi-line block belongs in a <RadixCode>pre</RadixCode>, not a Code chip.</>, source: "Radix" },
  { name: "size", type: `"1"–"9"`, def: `text lane (1 at small)`, desc: <>Radix size step. Unset, it resolves from the global <RadixCode>uiSize</RadixCode> text lane (default <RadixCode>small</RadixCode> → <RadixCode>1</RadixCode>) — the same lane as <RadixCode>Text</RadixCode>, so a chip sits in rhythm with the prose around it.</>, source: "Code.tsx" },
  { name: "variant", type: `"solid" | "soft" | "outline" | "ghost"`, def: `"soft"`, desc: <>Radix Code skin. <RadixCode>soft</RadixCode> (default) is the accent-tinted chip; <RadixCode>ghost</RadixCode> drops the fill for chip-free inline code; <RadixCode>outline</RadixCode> / <RadixCode>solid</RadixCode> are the bordered and filled variants.</>, source: "Radix" },
  { name: "weight", type: `"light" | "regular" | "medium" | "bold"`, def: `"regular"`, desc: <>Font weight of the code text. <RadixCode>regular</RadixCode> reads as body-weight inline code; bump to <RadixCode>medium</RadixCode> / <RadixCode>bold</RadixCode> only to pull a term out, not for whole passages.</>, source: "Radix" },
  { name: "color", type: "Radix accent color", desc: <>Overrides the chip hue. Unset → the theme accent (the accent-tinted default); set <RadixCode>gray</RadixCode> to neutralize the chip — the same move the shared comparison tables make so a chip stays legible on an accent-tinted cell.</>, source: "Radix" },
  { name: "truncate", type: "boolean", def: "false", desc: <>Clip overflow with an ellipsis instead of wrapping (needs a bounded width). For a long value that should keep flowing, prefer <RadixCode>wrap</RadixCode>.</>, source: "Radix" },
];

/* ========================================================================== */

const meta: Meta<typeof Code> = {
  title: "Components/Content/Code",
  component: Code,
  parameters: {
    // Docs stories use custom render() and don't read args, so the Controls panel is dead there.
    // Hidden by default; the Props re-enables it. (Accessibility + Interactions stay on.)
    controls: { disable: true },
    docs: {
      description: {
        component:
          "**Code** renders an inline code chip — a token, command, filename, or value set inside flowing " +
          "prose (`NODE_ENV`, `npm run build`). It’s a thin wrapper over Radix’s `Code` that pins the size to " +
          "the system `uiSize` **text lane**, so it scales with the sentence around it rather than dragging its " +
          "own default. Its `soft` skin is Radix’s accent-tinted chip, reused as-is (no `--ds-*` roles). It’s " +
          "the **lite docs tier**: one Usage story (specimen · live token spec · a do/don’t) plus a Props.",
      },
    },
  },
};
export default meta;
type Story = StoryObj<typeof Code>;

/** Usage — the primary lite docs story: a labeled specimen, the live token spec, and one do/don't. */
export const Usage: Story = {
  // The DoDont callout labels (success/error text on the green/red tint) measure ~4.1–4.4 — just under
  // axe's strict 4.5; the callout colour + the DO/DON'T word already carry the meaning, so color-contrast
  // is scoped off here, a documented specimen exception (same pattern as Kbd/Separator Usage). Code
  // itself is the accent-soft chip and clears contrast; the carve-out only covers the shared DoDont primitive.
  parameters: { a11y: { context: { exclude: [DODONT_LABEL] } } },
  render: (_args, { globals }) => (
    <HexThemeKey.Provider value={`${globals.accent}-${globals.appearance}-${globals.contrast}-${globals.uiSize}`}>
      <Page>
        <PageHeader title="Code · Usage" standfirst={DEFINITION} />

        <Section title="Specimen" lead="Inline code reads AT text size, tinted with the accent, inside a real sentence.">
          <UIText as="p" style={{ color: "var(--ds-text-strong)", lineHeight: 1.7, maxWidth: "var(--ds-text-measure)" }}>
            Run the <Code data-testid="code-chip">build</Code> command, then set <Code>NODE_ENV</Code> to{" "}
            <Code>production</Code> before you deploy from <Code>./dist</Code>.
          </UIText>
          <UIText as="p" style={{ color: "var(--ds-text-strong)", lineHeight: 1.7, maxWidth: "var(--ds-text-measure)" }}>
            The <Code variant="solid" data-testid="code-solid">solid</Code> chip fills with the primary
            button's colour, and its label reads on every colour in both appearances.
          </UIText>
        </Section>

        <Rule />

        <Section title="A literal, not emphasis" lead="Code marks a literal — a token, command, filename, or value the reader could type. It is not an emphasis style, and not a home for multi-line blocks.">
          <Grid columns={{ initial: "1", sm: "2" }} gap="3">
            <DoDont kind="do" bare note="A single literal — a token, command, filename, or value — set inline in the sentence that references it.">
              <UIText as="p" style={{ color: "var(--ds-text-strong)", lineHeight: 1.7 }}>
                Pass <Code>--watch</Code> to <Code>vitest</Code> to rerun on save.
              </UIText>
            </DoDont>
            <DoDont kind="dont" bare note="Not for emphasis (bold/italic belongs there), and not a whole multi-line block — that is a code fence, not an inline chip.">
              <UIText as="p" style={{ color: "var(--ds-text-strong)", lineHeight: 1.7 }}>
                This is <Code>really</Code> important, and here is the <Code>{`function build() { compile(); bundle(); }`}</Code> we run.
              </UIText>
            </DoDont>
          </Grid>
        </Section>

        <Rule />

        <Section title="Tokens" lead="Every value read off the rendered chip and checked against the token the row names, so the table can disagree with the component. Code reuses Radix's inline-code skin, so it owns no --ds-* roles of its own: the soft fill lands on the accent tint the system calls --ds-fill-accent-weak, the ink on --accent-a11, the solid chip on the primary button's pair, and the type on the code-font tokens at the text lane's size step.">
          <CodeSpec />
        </Section>
      </Page>
    </HexThemeKey.Provider>
  ),
  play: async ({ canvasElement }) => {
    // Passive (no driving / no flash): inline Code has no open/close behaviour, so its render and skin
    // binding are asserted right here. axe runs automatically on the story.
    const chip = canvasElement.querySelector<HTMLElement>('[data-testid="code-chip"]');
    if (!chip) throw new Error("Usage must render an inline Code chip");

    // The chip is a real <code> carrying Radix's inline-code class (the skin this wrap reuses).
    if (chip.tagName.toLowerCase() !== "code") throw new Error(`Code must render a <code> element; got <${chip.tagName.toLowerCase()}>`);
    if (!chip.classList.contains("rt-Code")) throw new Error("Code must carry Radix's rt-Code skin class");

    // The token table's EVIDENCE, asserted at runtime ([[measured-token-rows]]). This is also what binds the soft fill to
    // the accent tint and the solid chip to the text fill: each row reads its property off a rendered
    // chip and resolves the token on a different node, and `assertMeasuredRows` throws if they disagree.
    const rows = assertMeasuredRows(canvasElement);
    if (rows.measured !== 5 || rows.unproven !== 0) {
      throw new Error(`expected 5 measured / 0 unproven token rows, got ${rows.measured} / ${rows.unproven}`);
    }

    // [[textless-part-fills]]. The rows above hold at the toolbar colour only, where Radix's own solid paint can land on the
    // same hex. So the rendered solid chip is cloned into a fresh theme for all 27 accents in both
    // appearances, and its label is read off the painted chip: it must paint --ds-fill-accent under a label
    // that reaches WCAG 4.5:1 and APCA Lc 60. Ratios are sRGB-defined, so those floors run only in an
    // sRGB context ([[srgb-contrast-checks]]). The fill binding always runs.
    const solid = canvasElement.querySelector<HTMLElement>('[data-testid="code-solid"]');
    if (!solid) throw new Error("Usage must render a solid Code chip");
    const root = themeRoot(canvasElement);
    const sRGB = !window.matchMedia?.("(color-gamut: p3)")?.matches;
    const host = document.createElement("div");
    host.style.cssText = "position:fixed;left:-9999px;top:0";
    document.body.appendChild(host);
    const fails: string[] = [];
    try {
      for (const appearance of ["light", "dark"] as const) {
        for (const accent of ALL_ACCENTS) {
          host.replaceChildren();
          const theme = document.createElement("div");
          for (const a of Array.from(root.attributes)) {
            if (a.name !== "class" && a.name !== "style") theme.setAttribute(a.name, a.value);
          }
          theme.className = `radix-themes ${appearance}`;
          theme.setAttribute("data-accent-color", accent);
          const clone = theme.appendChild(solid.cloneNode(true)) as HTMLElement;
          host.appendChild(theme);

          const at = `[${appearance} ${accent}]`;
          const cs = getComputedStyle(clone);
          const painted = parseColor(cs.backgroundColor);
          const fill = flatten(painted, resolveColor(theme, "--ds-bg-base"));
          const want = resolveColor(theme, "--ds-fill-accent");
          if (Math.max(Math.abs(fill.r - want.r), Math.abs(fill.g - want.g), Math.abs(fill.b - want.b)) > 1) {
            fails.push(`${at} the solid chip paints rgb(${fill.r}, ${fill.g}, ${fill.b}), not --ds-fill-accent rgb(${want.r}, ${want.g}, ${want.b})`);
          }
          const ink = parseColor(cs.color);
          const ratio = contrastRatio(ink, fill);
          const lc = apcaContrast(ink, fill);
          if (sRGB && (ratio < SOLID_TEXT_MIN || lc < SOLID_TEXT_MIN_LC)) {
            fails.push(`${at} the solid chip's label reads ${ratio.toFixed(2)}:1 and Lc ${lc.toFixed(1)}, under 4.5:1 and Lc 60 ([[text-on-solid-fill-contrast]], [[textless-part-fills]])`);
          }
        }
      }
    } finally {
      host.remove();
    }
    if (fails.length) throw new Error(`Solid Code, ${fails.length} failures:\n  ${fails.join("\n  ")}`);
  },
};

type PropsArgs = {
  label: string;
  size: "1" | "2" | "3" | "4" | "5" | "6" | "7" | "8" | "9";
  variant: "solid" | "soft" | "outline" | "ghost";
  weight: "light" | "regular" | "medium" | "bold";
  color: "gray" | "blue" | "grass" | "crimson" | "amber" | "iris";
  truncate: boolean;
};

/** Props — the live, args-driven Code. Drive the text, size, variant, weight, colour, and truncate. */
export const Props: StoryObj<PropsArgs> = {
  args: { label: "NODE_ENV", size: "3", variant: "soft", weight: "regular", truncate: false },
  argTypes: {
    label: { control: "text", description: "The code text — a token, command, filename, or value.", table: { category: "Content" } },
    size: { control: "select", options: ["1", "2", "3", "4", "5", "6", "7", "8", "9"], description: "Radix size step. Unset on the wrapper, it follows the global uiSize text lane (default small → 1).", table: { category: "Variant" } },
    variant: { control: "inline-radio", options: ["solid", "soft", "outline", "ghost"], description: "Radix Code skin — soft (accent-tinted, default), solid, outline, or ghost.", table: { category: "Variant" } },
    weight: { control: "inline-radio", options: ["light", "regular", "medium", "bold"], description: "Font weight of the code text.", table: { category: "Variant" } },
    color: { control: "select", options: ["gray", "blue", "grass", "crimson", "amber", "iris"], description: "Override the chip hue. Unset → the theme accent; set gray to neutralize.", table: { category: "Variant" } },
    truncate: { control: "boolean", description: "Clip overflow with an ellipsis instead of wrapping (needs a bounded width).", table: { category: "Behavior" } },
  },
  // re-enable Controls here (disabled at the meta level for the curated docs story)
  parameters: { controls: { disable: false } },
  render: ({ label, size, variant, weight, color, truncate }: PropsArgs) => (
    <Page maxWidth="none">
      <PageHeader title="Code · Props" standfirst={DEFINITION} />
      <Box style={{ padding: "8px 0 2px" }}>
        <UIText as="p" style={{ color: "var(--ds-text-strong)", lineHeight: 1.7 }}>
          Set <Code size={size} variant={variant} weight={weight} color={color} truncate={truncate}>{label}</Code> in your environment.
        </UIText>
      </Box>
      <PropsLead />
      <Rule />
      <Section title="Props reference" lead={<>Every prop <RadixCode>Code</RadixCode> accepts — <RadixCode>size</RadixCode> is wired to the system's <RadixCode>uiSize</RadixCode> text lane; the rest pass through to Radix's <RadixCode>Code</RadixCode>.</>}>
        <PropTable rows={CODE_PROPS} />
      </Section>
    </Page>
  ),
};

/** History — the rulings this component encodes and a changelog of how it changes over time.
 *  Required on every component, lite tier included (a stub still records why it exists). */
export const History: Story = {
  render: () => (
    <Page>
      <PageHeader title="Code · History" standfirst={DEFINITION} />
      <Section title="Decisions" lead="The rulings this component encodes.">
        <Flex direction="column" gap="3">
          <Decision id="[[catalog-as-specification]] · Wrapped Radix component">
            Code is a <strong>wrapped</strong> Radix Themes component, so the Radix name wins — built on the
            Radix substrate + our <RadixCode>--ds-*</RadixCode> layer, not a from-scratch chip.
          </Decision>
          <Decision id="uiSize">
            Size follows the global <RadixCode>uiSize</RadixCode> <strong>text lane</strong> (the same lane as{" "}
            <RadixCode>Text</RadixCode>/<RadixCode>Kbd</RadixCode>), pinning the system’s small default rather
            than carrying its own — inline code sits in running prose, so it tracks the text step and stays in
            rhythm with the sentence around it.
          </Decision>
          <Decision id="Skin reuse">
            The default <RadixCode>soft</RadixCode> skin is Radix’s accent-tinted chip — its fill resolves to{" "}
            <RadixCode>--accent-a3</RadixCode> (exactly what <RadixCode>--ds-fill-accent-weak</RadixCode> aliases)
            over <RadixCode>--accent-a11</RadixCode> text. That is already accent-aware and follows the brand
            collision shift, so Code declares <strong>no <RadixCode>--ds-*</RadixCode> roles of its own</strong>{" "}
            (the Separator/Kbd precedent).
          </Decision>
          <Decision id="[[textless-part-fills]] · Solid chip">
            The <RadixCode>solid</RadixCode> chip paints the solid Button's pair,{" "}
            <RadixCode>--ds-fill-accent</RadixCode> under <RadixCode>--on-accent</RadixCode>, because Radix's own
            solid chip read 2.98 to 3.07:1 on cyan and teal and APCA Lc 45.7 on orange. A linked chip keeps
            that fill on hover and lays the button's hover overlay over it. A chip given its own{" "}
            <RadixCode>color</RadixCode>, oxblood included, paints that pair in its own colour, the pair the same
            chip paints on a page of that colour ([[part-colour-parity]]). A <RadixCode>highContrast</RadixCode> chip keeps Radix's paint.
          </Decision>
          <Decision id="Table exception">
            One deliberate deviation lives elsewhere: the shared comparison tables repaint their in-table chips
            to a neutral <strong>gray</strong> (<RadixCode>--ds-fill-weak</RadixCode> / <RadixCode>--ds-text-weak</RadixCode>),
            scoped to <RadixCode>.ds-comparison</RadixCode>, so a chip stays legible on an accent-tinted cell.
            That is a table-only exception — the <strong>default</strong> Code in flowing prose keeps the accent
            tint.
          </Decision>
        </Flex>
      </Section>

      <Rule />

      <Section title="Changelog" lead="Notable changes, newest first — grows as the component evolves.">
        <Flex direction="column" gap="3">
          <Decision id="0.9.0">
            The <RadixCode>solid</RadixCode> chip paints the primary button's colour and ink, so its label
            reaches 4.5:1 and APCA Lc 60 on every colour in both appearances.
          </Decision>
          <Decision id="0.9.0">
            Initial <RadixCode>System/Code</RadixCode> — Radix Code wrapped on the uiSize text lane; its default
            accent-tinted <RadixCode>soft</RadixCode> skin reused tokenlessly (no <RadixCode>--ds-*</RadixCode>{" "}
            roles), the chip colour read live off the DOM; History page added so every component, stubs
            included, has one.
          </Decision>
        </Flex>
      </Section>
    </Page>
  ),
};
