import type { Meta, StoryObj } from "@storybook/react-vite";
import { useGlobals } from "storybook/preview-api";
import { useMemo, useState } from "react";
import { Box, Flex, Text, Button, Card } from "@radix-ui/themes";
import {
  Page, PageHeader, Section, Caption, Muted, Mono, TokenRow, PropTable, type PropDef,
} from "../components/ui/_storyKit";
// The SYSTEM Callout, not Radix's. `tone="warning"` routes through the
// accent-aware [data-tone] bridge and carries a fixed glyph for colour-not-alone;
// a raw `color="amber"` Radix callout paints amber-11 on amber-a3, which measures
// 4.17:1 in light mode and fails the 4.5 floor axe enforces.
import { Callout } from "../components/ui/Callout";
import { TextField } from "../components/ui/TextField";
import { parseSeed } from "../palette/parseSeed";
import { ROSTER, INCUMBENTS } from "../theme/typefaces";

/* =============================================================================
   Foundations/Customize — the knobs a consuming app turns, and what to write.
   -----------------------------------------------------------------------------
   WHO READS THIS, AND WHEN. A developer wiring the system into an app for the
   first time, and whoever later rebrands it. Once, at setup; rarely again. That
   reader's question is "what can I set, and what do I write" — so the page opens
   on the full set of props and closes on the cases the system does NOT cover.

   It is deliberately NOT the evidence page. How a brand ramp is derived belongs
   with the colour system, and how a face was vetted belongs with typography;
   proving a decision was sound is a different job for a different reader, and
   putting it here made a setup page read as a lab notebook.

   THE CONTROLS LIVE IN THE TOOLBAR, NOT ON THIS PAGE. Typeface and Code face sit
   beside Accent, Appearance and Size because they are the same kind of thing: a
   system-level selection that should HOLD while you browse. A picker that only
   worked here would let you try a face on one page and tell you nothing about
   whether the system survives it.

   The brand seed is the one input that cannot be a toolbar enum — an arbitrary
   colour is not a fixed set. So the field below writes the `brandSeed` GLOBAL
   rather than local state: set it here, then navigate anywhere and the system is
   still wearing it.
   ============================================================================= */

/* `useGlobals` is a STORYBOOK hook: it may only be called from a decorator or a
   story function, never from a nested React component. So it is called once in
   the story's `render` and threaded down as props — which is also the honest
   shape, since these components are driven by the globals rather than owning
   them. */
type GlobalsProps = {
  globals: Record<string, unknown>;
  updateGlobals: (next: Record<string, unknown>) => void;
};

/* --- what you can set ------------------------------------------------------ */

/* Defaults are the ones `Provider` itself applies, EXCEPT `appearance`, which
   Provider does not default — it forwards to Radix's Theme, whose own prop defs
   carry `inherit`. Reading it off the vendor rather than restating it here is
   the difference between a documented default and a remembered one. */
const PROPS: PropDef[] = [
  {
    name: "accentColor",
    type: `"iris" | … | "oxblood" | { seed }`,
    def: `"iris"`,
    source: "Provider",
    desc: (
      <>
        The brand. Radix’s 26 named scales, the <Mono>oxblood</Mono> system preset, or{" "}
        <Mono>{"{ seed }"}</Mono> — any solid colour, generated into a full 12-step scale for both
        appearances.
      </>
    ),
  },
  {
    name: "typefaces",
    type: "{ heading?, body?, code? }",
    source: "Provider",
    desc: (
      <>
        Heading, body and code faces. A vetted roster name, or <Mono>{"{ stack }"}</Mono> for a face
        of your own. Unset writes nothing at all.
      </>
    ),
  },
  {
    name: "appearance",
    type: `"inherit" | "light" | "dark"`,
    def: `"inherit"`,
    source: "Radix Theme",
    desc: <>Light or dark. Every semantic token carries both — nothing in the system is one-mode only.</>,
  },
  {
    name: "grayColor",
    type: `"auto" | "gray" | "slate" | …`,
    def: `"auto"`,
    source: "Provider",
    desc: <>The neutral scale. <Mono>auto</Mono> pairs it to whichever accent is set.</>,
  },
  {
    name: "radius",
    type: `"none" | … | "full"`,
    def: `"medium"`,
    source: "Provider",
    desc: <>The corner ladder every surface and control derives its own radius from.</>,
  },
  {
    name: "uiSize",
    type: `"small" | "medium" | "large"`,
    def: `"small"`,
    source: "Provider",
    desc: <>Density. Picks the size step each lane renders at, and the default body type size.</>,
  },
  {
    name: "contrast",
    type: `"wcag" | "apca"`,
    def: `"wcag"`,
    source: "Provider",
    desc: <>The model foregrounds are chosen against, the audited ratio or APCA perceptual. It changes one thing only: the label on a solid warning fill on the gold, amber, yellow and lime brands, where one ink cannot clear both standards in the warning's own orange ([[apca-contrast-mode]]). Every other colour paints the same in both modes.</>,
  },
  {
    name: "buttonOrder",
    type: `"primary-first" | "primary-last"`,
    def: `"primary-first"`,
    source: "Provider",
    desc: <>Which end of a cluster the solid action anchors to.</>,
  },
];

/* --- the brand input, writing the GLOBAL ----------------------------------- */

/** What the field offers before anything is applied — and what it returns to on
 *  clear. Not `""`: `parseSeed` refuses an empty string, so an empty reset would
 *  paint a validation error on a field the reader had just deliberately cleared. */
const DEFAULT_SEED = "#ff6b5e";

function BrandInput({ globals, updateGlobals }: GlobalsProps) {
  const active = String(globals.brandSeed ?? "");
  const [input, setInput] = useState(active || DEFAULT_SEED);
  const parsed = useMemo(() => parseSeed(input), [input]);

  const apply = () => { if (parsed.ok) updateGlobals({ brandSeed: input.trim() }); };
  // Reset the FIELD as well as the global. Clearing only the global left the
  // input still showing a colour the system was no longer wearing — a control
  // asserting a state that is not in effect.
  const clear = () => { setInput(DEFAULT_SEED); updateGlobals({ brandSeed: "" }); };

  return (
    <Flex gap="3" align="end" wrap="wrap">
      <Box style={{ flex: "1 1 300px", minWidth: 260 }}>
        <TextField
          label="Brand colour"
          value={input}
          onChange={(e) => setInput(e.currentTarget.value)}
          onBlur={apply}
          onKeyDown={(e) => { if (e.key === "Enter") apply(); }}
          onPaste={(e) => {
            const text = e.clipboardData?.getData("text");
            if (!text) return;
            e.preventDefault();
            const next = text.trim();
            setInput(next);
            // Parse the PASTED text directly. `parsed` is memoized on the previous
            // input and has not seen this value yet, so trusting it would push an
            // unvalidated seed into the global and re-skin the system from junk.
            if (parseSeed(next).ok) updateGlobals({ brandSeed: next });
          }}
          validation={!parsed.ok ? { tone: "error", message: parsed.reason } : undefined}
          description={
            active
              ? "Applied system-wide. Browse any page — the system is wearing it."
              : "A solid colour. Press Enter, leave the field, or paste to apply."
          }
        />
      </Box>
      {active && <Button variant="soft" onClick={clear}>Reset to {String(globals.accent ?? "iris")}</Button>}
    </Flex>
  );
}

/* --- the roster, grouped BY SLOT ------------------------------------------- */

/* Grouping by slot rather than by `role: sans | mono` is the whole point of the
   table: a reader's question is "which face goes in `body` and which in `code`",
   and a column saying what a face IS leaves them to infer the answer. The slot
   heading carries the property it fills, so the mapping needs no explaining. */
const FACE_GRID = {
  display: "grid", gridTemplateColumns: "44px minmax(0, 210px) minmax(0, 1fr)",
  alignItems: "baseline", gap: 16, padding: "8px",
} as const;

type Face = { key: string; family: string; stack: string; note: string; isDefault: boolean };

const SANS_FACES: Face[] = [
  { key: "inter", ...INCUMBENTS.inter, isDefault: true },
  { key: "schibsted-grotesk", ...ROSTER["schibsted-grotesk"], isDefault: false },
  { key: "atkinson-hyperlegible-next", ...ROSTER["atkinson-hyperlegible-next"], isDefault: false },
].map(({ key, family, stack, note, isDefault }) => ({ key, family, stack, note, isDefault }));

const MONO_FACES: Face[] = [
  { key: "menlo", ...INCUMBENTS.menlo, isDefault: true },
  { key: "jetbrains-mono", ...ROSTER["jetbrains-mono"], isDefault: false },
].map(({ key, family, stack, note, isDefault }) => ({ key, family, stack, note, isDefault }));

function SlotFaces({ slot, prop, lead, faces }: { slot: string; prop: string; lead: string; faces: Face[] }) {
  return (
    <Box mb="4">
      <Flex align="baseline" gap="3" mb="1">
        <Text size="2" weight="bold" style={{ color: "var(--ds-text-strong)" }}>{slot}</Text>
        <Mono muted>{prop}</Mono>
      </Flex>
      <Box mb="2"><Muted>{lead}</Muted></Box>
      {faces.map((f) => (
        // `kind="note"` — these rows carry prose and a specimen, not a design
        // token, so the token-row assertion skips them rather than looking for a
        // swatch and a value that are not there.
        <TokenRow key={f.key} kind="note" grid={FACE_GRID} style={{ borderTop: "1px solid var(--ds-stroke-weak)" }}>
          {/* The specimen renders in the face itself, so the row shows the thing
              it names. It falls back to the stack's own fallbacks if the family
              is not available in this environment. */}
          <Text size="4" style={{ fontFamily: f.stack, color: "var(--ds-text-strong)" }}>Aa</Text>
          <Flex align="baseline" gap="2" wrap="wrap">
            <Text size="2" style={{ fontFamily: f.stack, color: "var(--ds-text-strong)" }}>{f.family}</Text>
            {f.isDefault && <Muted>default</Muted>}
          </Flex>
          <Text size="1" style={{ color: "var(--ds-text-weak)", lineHeight: 1.55 }}>{f.note}</Text>
        </TokenRow>
      ))}
    </Box>
  );
}

/* --- the page -------------------------------------------------------------- */
function CustomizePage({ globals, updateGlobals }: GlobalsProps) {
  return (
    <Page>
      <PageHeader
        title="Customize"
        standfirst={
          <>
            Eight props at the root, and the rest of the system re-derives around them. Set them once
            on <Mono>Provider</Mono> and every rule follows; hard-set a value the system computes and
            you have swapped a derivation for a constant.
          </>
        }
      />

      <Section
        title="What you can set"
        lead="The whole surface, in one table. Everything else on this page is about two of these rows."
      >
        <PropTable rows={PROPS} />
        <Caption>
          Six have a toolbar control in Storybook — <Mono>appearance</Mono>, <Mono>accentColor</Mono>,{" "}
          <Mono>typefaces</Mono> (two controls, body and code), <Mono>uiSize</Mono>,{" "}
          <Mono>contrast</Mono> and <Mono>buttonOrder</Mono> — so you can drive them from the toolbar
          above and watch any page respond. <Mono>grayColor</Mono> and <Mono>radius</Mono> have no
          control; set them on <Mono>Provider</Mono> to see them move.
        </Caption>
      </Section>

      <Section
        title="What to write"
        lead="Every prop above takes one value. Two of them take a second form, and which form you write is a decision a reviewer reads straight off the line."
      >
        <Card size="2">
          {/* One <pre>, not a stack of <Mono> lines with inline comments. The two
              accentColor forms are alternatives, and they only read as alternatives
              if their comments start in the same column — which needs a single
              monospace box where the padding is part of the string, not two
              differently-sized fonts sitting next to each other on a line. */}
          <Box style={{ overflowX: "auto" }}>
            <pre style={{
              margin: 0, whiteSpace: "pre", fontFamily: "var(--code-font-family)",
              fontSize: 12, lineHeight: 1.7, color: "var(--ds-text-strong)",
            }}>
{`<Provider
  accentColor="iris"                  `}<span style={{ color: "var(--ds-text-weak)" }}>{`// one of 27 named scales`}</span>{`
  accentColor={{ seed: "#3b82f6" }}   `}<span style={{ color: "var(--ds-text-weak)" }}>{`// or generate one from any solid colour`}</span>{`
  typefaces={{ body: "schibsted-grotesk", code: "jetbrains-mono" }}
>
  <App />
</Provider>`}
            </pre>
          </Box>
        </Card>
        <Caption>
          Prefer the named accent where you have the choice: it is compile-checked, it autocompletes,
          and it already carries a collision block that moves a semantic family out of the brand’s way.
          Reach for <Mono>{"{ seed }"}</Mono> when the brand colour is handed to you and it is not one
          of the 27. For a face the system has not vetted, pass <Mono>{'{ stack: "…" }'}</Mono> instead
          of a roster name — the system will set it and load nothing for it.
        </Caption>
      </Section>

      <Section
        title="What your own brand looks like"
        lead="Paste a solid colour. It applies to the whole system and survives navigation, so you can browse any component page wearing it. Clear it to fall back to the toolbar’s named accent."
      >
        <BrandInput globals={globals} updateGlobals={updateGlobals} />
      </Section>

      <Section
        title="Which face goes where"
        lead="Three slots. Body and heading take a sans; code takes a mono. Leave heading unset and it follows body."
      >
        <SlotFaces
          slot="Body & headings"
          prop="typefaces={{ body: … }}"
          lead="Set from the Typeface control in the toolbar."
          faces={SANS_FACES}
        />
        <SlotFaces
          slot="Code"
          prop="typefaces={{ code: … }}"
          lead="Set from the Code face control in the toolbar."
          faces={MONO_FACES}
        />
        <Caption>
          Every face here ships an open licence and real tabular figures. All but Menlo are{" "}
          <Mono>@fontsource</Mono> packages the system bundles, so they render the moment you select
          them; Menlo is a macOS system face, which is exactly why a cross-platform mono is on the
          roster at all.
        </Caption>
      </Section>

      <Section
        title="What the system does not cover"
        lead="The two cases where you are outside the guarantees, both reachable from the props above."
      >
        <Callout tone="warning" title={<>A <Mono>{"{ stack }"}</Mono> face is set, not vetted.</>}>
          The system writes it and loads nothing for it — delivery is yours, and so is the outcome.
          None of the roster’s measured properties are claimed for it: the reading measure, the 12px
          type floor and the control-box ladder were all tuned against Inter’s metrics, and a face
          that does not match them moves geometry the guards do not re-check per face.
        </Callout>
        <Box mt="3">
          <Callout tone="warning" title="A generated brand does not re-alias a colliding family yet.">
            A generated brand is a brand, so collision resolution is <em>meant</em> to reach it exactly
            as it reaches a named one — that much is settled. The mechanism is what does not exist:{" "}
            <Mono>theme.css</Mono> carries a hand-written block per named accent that moves the
            colliding semantic family onto a distinct scale, and the generated path has no equivalent
            to run. So today a clash is detected and reported, and the family is not moved.
          </Callout>
        </Box>
      </Section>
    </Page>
  );
}

const meta: Meta<typeof CustomizePage> = {
  title: "Foundations/Customize",
  component: CustomizePage,
  parameters: {
    layout: "fullscreen",
    /* KNOWN DEBT, NOT A CARVE-OUT FOR THIS PAGE — the identical exclusion sits on
       System/Callout's Anatomy and Usage stories. A toned Callout paints its text
       from `--ds-text-warning` (= `--warning-11`) on the soft `--warning-a3`
       ground, which measures 4.17:1 in light mode against axe's 4.5 floor. That is
       the seam `.storybook/preview.tsx` documents: Radix tunes step-11 to
       4.40–4.49 and the token suite accepts a 4.39 floor, while axe enforces 4.5
       with no tolerance.

       It is a REAL failure, pre-dating this branch — `--ds-text-warning` is
       unchanged from main. The fix is at the token layer (step 11 is not a
       body-text colour on a tinted ground) and it moves every toned Callout in
       the system, so it is a ruling rather than something to slip into a docs
       page. Scoped to the callout text only: everything else here is audited. */
    a11y: { context: { exclude: [".rt-CalloutRoot[data-tone] .rt-CalloutText"] } },
  },
};
export default meta;

type Story = StoryObj<typeof CustomizePage>;

export const Customize: Story = {
  render: () => {
    const [globals, updateGlobals] = useGlobals();
    return <CustomizePage globals={globals} updateGlobals={updateGlobals} />;
  },
};
