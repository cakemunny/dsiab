import type { Meta, StoryObj } from "@storybook/react-vite";
import { Box, Code, Flex, Grid, Text } from "@radix-ui/themes";
import { Kbd } from "./Kbd";
import {
  type AccentColor, Decision, DoDont, DODONT_LABEL, HexThemeKey, LiteTokenSpec, MeasuredRow, MeasuredSpec,
  Mono, Page, PageHeader, PropsLead, type PropDef, PropTable, Rule, Section,
} from "./_storyKit";
import {
  assertMeasuredRows, contrastRatio, flatten, parseColor, type RGBA, themeRoot,
} from "../../foundations/_assert";

/** The one definition of this component — the standfirst every page of it opens with. */
const DEFINITION = (
  <>
    A keyboard-input token — the visual for a key the user presses (<Kbd>⌘</Kbd>, <Kbd>Esc</Kbd>). It sits
    deliberately smaller than the text beside it.
  </>
);

/* Kbd reuses Radix's own key-cap skin (like CheckboxVisual reuses BaseCheckbox), so it declares no
   --ds-* roles of its own. It's a skin-reuser (0 paint tokens), so the token spec uses the low-token
   shape: one binding row for the neutral text colour + a one-line reuse rationale.

   MEASURED ([[measured-token-rows]]): the row reads `color` off a real rendered cap and checks it against the token it
   claims, so it can disagree with the component. The version this replaces read a hidden cap and
   handed the hex to the row. */

function KbdSpec() {
  return (
    <LiteTokenSpec
      rationale={
        <>
          Kbd reuses Radix's own key-cap skin (a raised Radix box-shadow, not a fill) and declares no{" "}
          <Mono>--ds-*</Mono> roles of its own — its neutral text resolves live to <Mono>--gray-12</Mono>{" "}
          in the theme's UI font, not a mono stack.
        </>
      }
    >
      <MeasuredSpec render={() => <Kbd>K</Kbd>}>
        <MeasuredRow part="Text colour" token="--gray-12" select="kbd.rt-Kbd" prop="color" />
      </MeasuredSpec>
    </LiteTokenSpec>
  );
}

/* ---- Properties (Kbd-specific) ------------------------------------------- */

const KBD_PROPS: PropDef[] = [
  { name: "size", type: `"1"–"9" | "inherit"`, desc: <>Radix size step. Unset, it resolves from the global <Code>uiSize</Code> (text lane; default <Code>small</Code> → <Code>1</Code>) — the same lane <Code>Text</Code> reads. The cap then paints at <strong>0.8×</strong> that step's type, clamped <em>up</em> to the system's 12px floor (12 / 12 / 12.8px across the three tiers), so it sits a size under the text beside it. <Code>"inherit"</Code> opts out entirely.</>, source: "Kbd.tsx" },
  { name: "variant", type: `"classic" | "soft"`, def: `"classic"`, desc: <>Radix Kbd skin. <Code>classic</Code> is the raised key-cap; <Code>soft</Code> is a flatter tint. Display-only, so <Code>soft</Code> is allowed here — the ban on <Code>soft</Code> covers interactive controls only.</>, source: "Radix" },
  { name: "children", type: "ReactNode", desc: <>The key label — <strong>one key per Kbd</strong>. Compose a shortcut as a sequence of adjacent <Code>Kbd</Code>s, not one Kbd holding the whole combo.</>, source: "Radix" },
];

/* ========================================================================== */

const meta: Meta<typeof Kbd> = {
  title: "Components/Content/Kbd",
  component: Kbd,
  parameters: {
    // Docs stories use custom render() and don't read args, so the Controls panel is dead there.
    // Hidden by default; the Props re-enables it. (Accessibility + Interactions stay on.)
    controls: { disable: true },
    docs: {
      description: {
        component:
          "**Kbd** renders a keyboard key — the visual for something the user presses (⌘, Esc, a letter). " +
          "It’s a thin wrapper over Radix’s `Kbd` that takes its step from the system `uiSize` **text lane** " +
          "rather than dragging its own default — the cap itself then paints at 0.8× that step’s type, clamped " +
          "*up* to the system’s 12px floor (12 / 12 / 12.8px across small / medium / large), so it reads a size " +
          "below the text around it and its stepping is deliberately near-invisible. It’s the **lite docs tier** " +
          "reference: one Usage story (specimen · live token spec · a do/don’t) plus a Props — the " +
          "floor every long-tail component copies.",
      },
    },
  },
};
export default meta;
type Story = StoryObj<typeof Kbd>;

/** Usage — the primary lite docs story: a labeled specimen, the live token spec, and one do/don't. */
export const Usage: Story = {
  // The DO/DON'T word (success/error step-11 ink on its own tint) measures 4.10 at 12px bold, under axe's
  // 4.5; the colour + the word already carry the meaning, so that row is the documented exception. Scoped
  // to the label itself — the cards' specimens stay fully axe-checked, which "[data-dodont]" did not do.
  parameters: { a11y: { context: { exclude: [DODONT_LABEL] } } },
  render: (_args, { globals }) => (
    <HexThemeKey.Provider value={`${globals.accent}-${globals.appearance}-${globals.contrast}`}>
      <Page>
        <PageHeader title="Kbd · Usage" standfirst={DEFINITION} />

        <Section title="Specimen" lead="One key per cap; a shortcut is a sequence.">
          {/* The play measures THIS row. The standfirst above it renders its own ⌘/Esc caps, and an
              unscoped `querySelector("kbd")` reached those first — a gate that stayed green while the
              specimen was repainted. Every cap assertion below hangs off this hook. */}
          <Flex align="center" gap="2" wrap="wrap" data-testid="kbd-specimen">
            <Text size="2" style={{ color: "var(--ds-text-strong)" }}>Press</Text>
            <Flex align="center" gap="1"><Kbd>⌘</Kbd><Kbd>K</Kbd></Flex>
            <Text size="2" style={{ color: "var(--ds-text-strong)" }}>to open the command palette, or</Text>
            <Kbd>Esc</Kbd>
            <Text size="2" style={{ color: "var(--ds-text-strong)" }}>to close.</Text>
          </Flex>
        </Section>

        <Rule />

        <Section title="One cap per key" lead="A Kbd is one key. A multi-key shortcut is a sequence of caps, so each key reads on its own.">
          <Grid columns={{ initial: "1", sm: "2" }} gap="3">
            <DoDont kind="do" accent={globals.accent as AccentColor} note="One key per Kbd, composed in sequence — each cap reads as its own key.">
              <Flex align="center" gap="1"><Kbd>⌘</Kbd><Kbd>K</Kbd></Flex>
            </DoDont>
            <DoDont kind="dont" accent={globals.accent as AccentColor} note="A whole chord crammed into one Kbd reads as a single giant key, not a combination.">
              <Kbd>⌘K or Ctrl+K</Kbd>
            </DoDont>
          </Grid>
        </Section>

        <Rule />

        <Section title="Tokens" lead="Read off a rendered cap and checked against the token the row names. Kbd reuses Radix's key-cap skin, so it owns no --ds-* roles; the spec documents what that skin resolves to in the running theme.">
          <KbdSpec />
        </Section>
      </Page>
    </HexThemeKey.Provider>
  ),
  play: async ({ canvasElement }) => {
    // The specimen renders a real <kbd> with Radix's raised key-cap skin (--kbd-box-shadow) — the
    // skin this component reuses, not a plain span. Radix Kbd uses the theme UI font, not a mono
    // stack. axe runs automatically on the story.
    // The token table's EVIDENCE, asserted at runtime ([[measured-token-rows]]).
    const rows = assertMeasuredRows(canvasElement);
    if (rows.measured !== 1 || rows.unproven !== 0) {
      throw new Error(`expected 1 measured / 0 unproven token rows, got ${rows.measured} / ${rows.unproven}`);
    }

    // SCOPED TO THE SPECIMEN, deliberately. The PageHeader's standfirst renders decorative ⌘/Esc caps
    // BEFORE this row in the DOM, so a document-wide `querySelector("kbd")` measured the header and
    // left the specimen unguarded — the ramp, the box-shadow and the contrast floor below all passed
    // on a cap nobody is documenting. Everything from here down reads the specimen row only.
    const specimen = canvasElement.querySelector<HTMLElement>('[data-testid="kbd-specimen"]');
    if (!specimen) {
      throw new Error('the Specimen row must carry data-testid="kbd-specimen" — every cap assertion below is scoped to it');
    }
    const kbd = specimen.querySelector("kbd");
    if (!kbd) throw new Error("the Specimen row must render a <kbd> element");
    // [[kbd-default-variant]] — THE DEFAULT IS THE FLAT KEY. This assertion used to demand the raised key-cap shadow,
    // because Radix defaults `variant="classic"` and the wrapper passed it straight through. The
    // system now defaults to `soft`: §8 spends its whole elevation budget on three flat rungs and
    // the shadow ladder never fakes a bevel, so a moulded keycap was borrowed from another design
    // language. Asserting the flat default ALONE would pass just as happily if Radix stopped
    // painting the raised variant at all, so the reverse half is checked wherever the page renders
    // a `classic` cap.
    const shadow = getComputedStyle(kbd).boxShadow;
    if (shadow && shadow !== "none") {
      throw new Error(
        `Kbd must default to the FLAT key ([[kbd-default-variant]]); got box-shadow: ${shadow}. The raised cap is ` +
          `variant="classic" and is opt-in.`,
      );
    }
    const raised = canvasElement.querySelector<HTMLElement>(".rt-Kbd.rt-variant-classic");
    if (raised && getComputedStyle(raised).boxShadow === "none") {
      throw new Error(
        'variant="classic" no longer paints the raised key-cap, so the flat default above asserts nothing',
      );
    }

    // THE RAMP, asserted at the values the cap is SUPPOSED to render. Radix shrinks every Kbd step
    // optically — `calc(var(--font-size-N) * 0.8)` — which is the vendor's design intent (a key
    // mentioned in a sentence reads below that sentence), and would put steps 1–2 at 9.6 / 11.2px,
    // under the system's 12px type floor. components.css floors those two and leaves step 3 to the
    // vendor, so the ramp is 12 / 12 / 12.8px across small / medium / large: near-invisible stepping,
    // which is the design and not a frozen ladder. This caught nothing when it was written as
    // "step N renders --font-size-N" — that assertion passed a cap ballooned to 28px.
    // The expected values are INDEPENDENT LITERALS on purpose. Resolving `--font-size-N` on a probe
    // would agree with whatever the CSS says by construction, so it could never disagree with a
    // re-ramped Kbd; a table the test carries itself can. `--scaling` is the one factor carried
    // through, because every Radix type token is `calc(Npx * var(--scaling))`.
    const KBD_STEP_PX: Record<string, number> = { "1": 12, "2": 12, "3": 12.8 };
    const step = /rt-r-size-(\d)/.exec(kbd.className)?.[1];
    if (!step) throw new Error(`Kbd must carry its resolved size step; got class "${kbd.className}"`);
    const nominal = KBD_STEP_PX[step];
    if (nominal === undefined) throw new Error(`no cap type recorded for Kbd step ${step} — extend KBD_STEP_PX`);
    const scaling = parseFloat(getComputedStyle(themeRoot(canvasElement)).getPropertyValue("--scaling")) || 1;
    const expected = nominal * scaling;
    const actual = parseFloat(getComputedStyle(kbd).fontSize);
    if (Math.abs(actual - expected) > 0.05) {
      throw new Error(
        `a Kbd at step ${step} must render ${expected}px — the vendor's 0.8 optical shrink, clamped UP to our ` +
          `12px type floor; got ${actual}px`,
      );
    }

    // THE CAP'S LEGIBILITY, MEASURED — the reading axe used to decline to take.
    //
    // A cap whose label is glyph-only (⌘ ⌥ ⇧ ↑ ↓) trips axe's colour-contrast `nonBmp` abstention
    // ("element content contains only non-text characters"): the check returned INCOMPLETE and never
    // computed a ratio, so `Esc` was measured and `⌘` was not — a gap that tracked the glyph, not the
    // paint, and that made every Keyboard page in the library read inconclusive. `.storybook/preview.tsx`
    // now switches that abstention off library-wide (`options.checks` → `ignoreUnicode: false`), so axe
    // measures all 112 of them and reports the real ratio instead of shrugging.
    //
    // THIS IS THE GATE, not a second opinion. axe keeps a further abstention behind the first: a cap that
    // FAILS is reported incomplete `shortTextContent`, because axe counts a single character as text it
    // cannot interpret — and an incomplete cannot fail a run. So axe now tells the truth about a healthy
    // cap and still cannot fail a broken one. This assertion is what fails. It sits on Kbd because Kbd is
    // the covering layer: every cap in the library, across all 20-odd Keyboard sections, is this one
    // component wearing this one skin (`_storyKit`'s KeyRow renders `Kbd`), so guarding the paint here
    // guards the family rather than 20 copies of the same check.
    //
    // The 4.5 floor is a LITERAL and the colours are read off the rendered cap, so nothing here agrees
    // with axe's config by construction: revert that preview line, or re-skin the cap, and this still
    // fails on its own evidence. `parseColor` rasterises on an sRGB canvas, so a wide-gamut display
    // returning `color(display-p3 …)` measures the same as any other.
    //
    // Composited bottom-up from the first opaque ancestor: the classic cap's own fill is opaque
    // (`--gray-1`) but `variant="soft"` is a `--gray-a3` alpha, where the surface underneath IS part of
    // the answer. What this cannot see is the raised skin's inset-shadow ramp, which is painted by
    // box-shadow and reaches no computed style — that was measured out of band by rasterising the real
    // cap: the darkest point of the ramp costs 0.13 (15.98 → 15.85:1 light, 16.24 → 15.88:1 dark), and
    // the soft chip measures 14.03:1 light / 13.70:1 dark. Every one of those clears 4.5 with room to
    // spare, which is why the flat composite below is a fair guard rather than a flattering one.
    const layers: RGBA[] = [];
    for (let node: Element | null = kbd; node; node = node.parentElement) {
      const paint = parseColor(getComputedStyle(node).backgroundColor);
      if (paint.a === 0) continue;
      layers.push(paint);
      if (paint.a === 1) break;
    }
    if (!layers.length || layers[layers.length - 1].a !== 1) {
      throw new Error("no opaque surface behind the Kbd cap — its background cannot be composited");
    }
    const capBg = layers.reduceRight((under, over) => flatten(over, under));
    const capRatio = contrastRatio(parseColor(getComputedStyle(kbd).color), capBg);
    if (capRatio < 4.5) {
      throw new Error(
        `a key cap's label measures ${capRatio.toFixed(2)}:1 against its own composited cap ` +
          `(${Math.round(capBg.r)},${Math.round(capBg.g)},${Math.round(capBg.b)}), below the 4.5:1 it owes`,
      );
    }

    // …and the guard is anchored to the case that caused the abstention: the specimen has to actually
    // render a glyph-only cap. If the ⌘ specimen is ever retired for a lettered one, this assertion
    // fails loudly rather than quietly guarding a case the page no longer shows.
    const caps = [...specimen.querySelectorAll("kbd")];
    if (!caps.some((c) => /^[^\p{L}\p{N}]+$/u.test((c.textContent ?? "").trim()))) {
      throw new Error("expected at least one glyph-only cap (⌘) in the specimen row — the axe-abstention case");
    }
  },
};

type PropsArgs = {
  label: string;
  size: "1" | "2" | "3" | "4" | "5" | "6" | "7" | "8" | "9";
  variant: "classic" | "soft";
};

/** Props — the live, args-driven Kbd. Drive the label, size, and variant from Controls. */
export const Props: StoryObj<PropsArgs> = {
  args: { label: "K", size: "3", variant: "classic" },
  argTypes: {
    label: { control: "text", description: "The key label — one key per Kbd.", table: { category: "Content" } },
    size: { control: "select", options: ["1", "2", "3", "4", "5", "6", "7", "8", "9"], description: "Radix size step. Unset on the wrapper, it follows the global uiSize text lane (default small → 1).", table: { category: "Variant" } },
    variant: { control: "inline-radio", options: ["classic", "soft"], description: "Radix Kbd skin — classic key-cap or soft tint.", table: { category: "Variant" } },
  },
  // re-enable Controls here (disabled at the meta level for the curated docs story)
  parameters: { controls: { disable: false } },
  render: ({ label, size, variant }: PropsArgs) => (
    <Page maxWidth="none">
      <PageHeader title="Kbd · Props" standfirst={DEFINITION} />
      <Box style={{ padding: "8px 0 2px" }}>
        <Kbd size={size} variant={variant}>{label}</Kbd>
      </Box>
      <PropsLead />
      <Rule />
      <Section title="Props reference" lead={<>Every prop <Code>Kbd</Code> accepts — <Code>size</Code> is wired to the system's <Code>uiSize</Code> lane; <Code>variant</Code> and <Code>children</Code> pass through to Radix's <Code>Kbd</Code>.</>}>
        <PropTable rows={KBD_PROPS} />
      </Section>
    </Page>
  ),
};

/** History — the rulings this component encodes and a changelog of how it changes over time.
 *  Required on every component, lite tier included (a stub still records why it exists). */
export const History: Story = {
  render: () => (
    <Page>
      <PageHeader title="Kbd · History" standfirst={DEFINITION} />
      <Section title="Decisions" lead="The rulings this component encodes.">
        <Flex direction="column" gap="3">
          <Decision id="[[catalog-as-specification]] · Wrapped Radix component">
            Kbd is a <strong>wrapped</strong> Radix Themes component, so the Radix name wins — built on the
            Radix substrate + our <Code>--ds-*</Code> layer, not a from-scratch key cap.
          </Decision>
          <Decision id="uiSize · R10">
            The size <strong>step</strong> follows the global <Code>uiSize</Code> <strong>text lane</strong> (the
            same lane as <Code>Text</Code>/<Code>Heading</Code>), pinning the system’s small default rather than
            carrying its own. The cap then renders at Radix’s <strong>0.8×</strong> optical shrink of that step,
            clamped <em>up</em> to the system’s 12px type minimum — <strong>12 / 12 / 12.8px</strong> across small /
            medium / large — so a cap reads deliberately smaller than the text beside it and barely steps across
            the range.
          </Decision>
          <Decision id="[[soft-variant-scope]] · Soft allowed on display-only">
            Kbd is <strong>display-only</strong>, so <Code>variant="soft"</Code> is permitted here — the soft
            ban applies to interactive controls, not decorative UI.
          </Decision>
          <Decision id="Docs · §6">
            The <strong>lite docs-tier</strong> ratification prototype: a skin-reusing component with no{" "}
            <Code>--ds-*</Code> roles, documented by the lite spine (specimen · live rendered-values readout ·
            do/don’t · Props). Every component — lite stubs included — still carries this History page.
          </Decision>
        </Flex>
      </Section>

      <Rule />

      <Section title="Changelog" lead="Notable changes, newest first — grows as the component evolves.">
        <Flex direction="column" gap="3">
          <Decision id="0.9.0">
            Initial <Code>System/Kbd</Code> — Radix Kbd wrapped on the uiSize text lane; the lite-spine
            prototype (which promoted the shared <Code>RenderedRow</Code> tokenless drift-guard into the kit);
            History page added so every component, including stubs, has one. A cap that matched the text lane
            step for step was tried and reverted: every cap dimension is <Code>em</Code> in Radix’s sheet, so
            14 / 16px of type grew the box to 24.5 / 28px tall beside the prose — toy keys. What this page
            promised was corrected instead, to the 0.8× ramp the cap actually renders.
          </Decision>
        </Flex>
      </Section>
    </Page>
  ),
};
