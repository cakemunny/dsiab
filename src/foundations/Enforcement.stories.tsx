import type { Meta, StoryObj } from "@storybook/react-vite";
import type { ReactNode } from "react";
import { Box, Flex, Grid, Text } from "@radix-ui/themes";
import { ON_FILL, SOLID_TEXT_MIN, SOLID_TEXT_MIN_LC, resolve, resolveColor, themeRoot } from "./_assert";
import { Table } from "../components/ui/Table";
import { Page, PageHeader, Section, Rule, Caption, Mono, linkRulings } from "../components/ui/_storyKit";

/* THE CONTRACT. This page answers one binary question for its reader — human or agent authoring
   against the system: "can I lean on this rule without checking?" That makes every row the same
   shape, and the third column a repeated MECHANISM NAME rather than prose, so the column is
   comparable at a glance. Every caveat is stated ONCE, in its mechanism's paragraph above the
   tables, never five times in five registers inside cells.

   The mechanism set is closed and derived from the code, not from memory:
     · loose-values.node-check.ts        the source guard (5 rules, 2 scopes)
     · _assert.ts + Colors / _focus       the 27-accent sweep plays
     · _tabular-figures + _focus          the registered-selector manifests
     · .storybook/preview.tsx             axe (a11y.test = "error") on every story bar 18
 *                                         registered opt-outs (axe-scope.node-check.ts AXE_EXEMPT)
     · boxLaw.ts via preview's afterEach  the per-story box law
     · the token layer itself             by construction

   SCOPE IS PART OF THE CLAIM. A guard this page overstates is a fresh doc-lie, so every row
   carries its own reach — derived from the guard source, not from the prose that was here. */

/* ---- mechanisms ---------------------------------------------------------- */

const Mechanism = ({ name, where, children }: { name: string; where: string; children: ReactNode }) => (
  <Flex direction="column" gap="1">
    <Flex align="baseline" gap="3" wrap="wrap">
      <Text size="2" weight="bold" style={{ color: "var(--ds-text-strong)" }}>{name}</Text>
      <Mono muted>{where}</Mono>
    </Flex>
    <Caption>{children}</Caption>
  </Flex>
);

/* The closed set. `name` is the literal string the table's third column repeats — the union type
   below makes a row citing a mechanism that isn't here a COMPILE error, so the column and these
   paragraphs cannot drift apart. Ordered by how many rows each one carries. */
const MECHANISMS = [
  {
    name: "no-loose-values guard",
    where: "loose-values.node-check.ts",
    body: (
      <>
        A source scan that runs in Node ahead of the browser suite (<Mono muted>npm run test:tokens</Mono>, and again
        as the pretest hook). Five rules — font weight, raw hex, spacing, <Mono muted>transition: all</Mono>, and the{" "}
        <Mono muted>will-change</Mono> allowlist. Two reach limits, because a directory named as in-scope is not the
        same claim as a file being read: it opens <Mono muted>.tsx</Mono> and <Mono muted>.css</Mono> ONLY, so a{" "}
        <Mono muted>.ts</Mono> file is invisible to every rule, and a value assembled inside a template literal
        escapes the two motion rules. A failing site may be listed as known debt — still scanned, still
        printed, only the failure suppressed — and a debt entry that stops matching fails the run, so the
        list cannot rot into a permanent exemption.
      </>
    ),
  },
  {
    name: "accent sweep play",
    where: "_assert.ts · Colors · the focus fixture",
    body: (
      <>
        A <Mono muted>play</Mono> function that clones the theme root off-screen and walks all 27 brand accents
        against both appearances, so a colour rule is proved across the whole brand space rather than at
        whichever accent the story happened to render. Colours are rasterised before they are compared, so a
        wide-gamut monitor cannot flatter a ratio. One limit: WCAG ratios are defined in sRGB, so on a P3
        display the ratio assertions are enforced headless and in CI — the collision and hue checks still run
        everywhere.
      </>
    ),
  },
  {
    name: "registered-selector manifest",
    where: "_tabular-figures · _focus",
    body: (
      <>
        A roster of selectors checked in beside the rule and asserted against the live stylesheets. The
        strongest version carries three arms: every registered selector still declares the property; the
        property still RESOLVES on the real component mounted; and nothing declares it without an entry, so
        an adopter cannot join silently. Its reach is exactly its roster — a site nobody registers is held by
        nothing until someone adds it. That is the trade a manifest makes: it proves what it lists, and says
        nothing about what it does not.
      </>
    ),
  },
  {
    name: "axe, every story",
    where: ".storybook/preview.tsx",
    body: (
      <>
        axe runs after a story renders — <Mono muted>play</Mono> or no <Mono muted>play</Mono> — and a violation fails
        the build. Not literally every story: seven files switch it off wholesale, exempting <strong>18</strong>{" "}
        — the four <Mono muted>_internal</Mono> geometry and focus fixtures, whose bare specimens trip label
        rules nothing is asserting there, plus the icon gallery, the elevation swatches and the fail-loud
        probe. That set is registered in <Mono muted>AXE_EXEMPT</Mono> and a guard fails if a file joins it
        unregistered, leaves it, or if a meta-level exemption silently grows. The suite runs twice, light and
        dark. It does NOT sweep the brand: every story is scanned
        at the default accent only. Two limits worth knowing before you lean on it. axe returns{" "}
        <em>incomplete</em> when it cannot resolve a target's real actionable area, and an incomplete cannot
        fail a run. And it holds text to a flat 4.5:1 with no tolerance — stricter than the 4.39 floor the
        accent sweep accepts — so a light-scale brand can show a real contrast violation in the panel on text
        the token suite passes. Two checks are switched ON here that axe does not ship on: the 24×24
        target-size rule, and contrast measurement of glyph-only text.
      </>
    ),
  },
  {
    name: "per-story box law",
    where: "boxLaw.ts, via preview's afterEach",
    body: (
      <>
        After every story, every control root is measured: its box must equal the box its own size step names
        — <Mono muted>max(step px × --scaling, 24)</Mono> — on one of three ladders. One implementation, two
        runners; the same file drives a periodic sweep across all three size tiers, so the every-run guard and
        the deep sweep cannot disagree. Two classes it reports without failing: a control that declares no
        step anywhere in the DOM (a DOM probe cannot see React context, and “declare it” and “fix it” need
        opposite answers), and a control whose content wrapped onto a second row, which a single-row law says
        nothing about.
      </>
    ),
  },
  {
    name: "by construction",
    where: "the token layer",
    body: (
      <>
        No test, because there is nothing to violate. <Mono muted>--ds-text-strong</Mono> is <Mono muted>var(--gray-12)</Mono>{" "}
        — a reference to a scale step, never a literal — so “no pure black” cannot be broken by editing a
        component. The strongest form of enforcement and the rarest: it reaches only the rules a value can
        encode completely.
      </>
    ),
  },
] as const;

type MechName = (typeof MECHANISMS)[number]["name"];

/* ---- the contract rows --------------------------------------------------- */

/** A guaranteed rule: a machine refuses the violation. `scope` is where that refusal stops. */
type Guaranteed = { constraint: string; encoded: string; mech: MechName; scope: string };

const GUARANTEED: Guaranteed[] = [
  { constraint: "Spacing snaps to the scale", encoded: "--ds-space-4 … -128", mech: "no-loose-values guard", scope: "component layer · .tsx + .css · stories exempt" },
  { constraint: "Three font weights only", encoded: "400 · 600 · 700", mech: "no-loose-values guard", scope: "component layer · .tsx + .css · stories exempt" },
  { constraint: "No raw hex in a component", encoded: "--ds-* · Radix scale steps", mech: "no-loose-values guard", scope: "component layer · stories + token files exempt" },
  { constraint: "Transitions name their properties", encoded: "transition: <property>", mech: "no-loose-values guard", scope: "+ token, theme and search layers · .tsx + .css" },
  { constraint: "will-change stays on the compositor", encoded: "transform, opacity, filter, auto", mech: "no-loose-values guard", scope: "+ token, theme and search layers · .tsx + .css" },
  { constraint: "Text on a neutral surface ≥ 4.5:1", encoded: "--ds-text-strong", mech: "accent sweep play", scope: "7 role pairs · 27 accents × 2 appearances" },
  { constraint: "Link, warning, success text ≥ 4.39:1", encoded: "--ds-text-link", mech: "accent sweep play", scope: "3 accent-11 roles · 27 accents × 2 appearances" },
  { constraint: `Text on a solid fill ≥ ${SOLID_TEXT_MIN}:1 and APCA Lc ${SOLID_TEXT_MIN_LC}`, encoded: "--ds-fill-accent · --on-accent", mech: "accent sweep play", scope: `${ON_FILL.filter((p) => p.minLc !== undefined).length} text pairs (accent and error, rest and hover) · 27 accents × 2 appearances` },
  { constraint: "A glyph on a status solid ≥ 3:1", encoded: "--on-warning", mech: "accent sweep play", scope: `${ON_FILL.filter((p) => p.minLc === undefined).length} status solids (warning, success, info) · 27 accents × 2 appearances · text on them is not covered` },
  { constraint: "Brand and semantic never collide", encoded: "--accent-9 vs --error-9", mech: "accent sweep play", scope: "step 9 only · the 27 NAMED accents × 2 appearances — a seeded brand is chosen at runtime ([[seeded-brand-collisions]]) and swept in the node lane, not here" },
  { constraint: "The focus ring clears 3:1 and APCA Lc 30", encoded: "--ds-stroke-focus + --ds-stroke-focus-stack", mech: "accent sweep play", scope: "the page, cards, tracks, tints and both scrims · 27 accents × 2 appearances" },
  { constraint: "Controls ride the system ring", encoded: "outline-color @ :focus-visible", mech: "registered-selector manifest", scope: "the registered control selectors · read off the stylesheet" },
  { constraint: "In-place figures stay tabular", encoded: "font-variant-numeric", mech: "registered-selector manifest", scope: "the registered selectors · both directions" },
  { constraint: "Pointer targets are ≥ 24×24", encoded: "WCAG 2.2 SC 2.5.8", mech: "axe, every story", scope: "every story bar 18 registered opt-outs · 2 appearances · default accent" },
  { constraint: "A control's box equals its step", encoded: "max(step px × --scaling, 24)", mech: "per-story box law", scope: "every story · control roots · single-row only" },
  { constraint: "No pure-black text", encoded: "--ds-text-strong", mech: "by construction", scope: "everywhere --ds-text-strong paints" },
];

/** A documented rule: real, considered, and held by an author in review — no machine sees it. */
type Documented = { constraint: string; stated: string; scope: string };

const DOCUMENTED: Documented[] = [
  { constraint: "Body line-height stays token-aligned", stated: "GUIDELINES §3 · [[type-and-target-density]]", scope: "Small 1.43, Medium 1.5 — reading prose sits at Medium and up" },
  { constraint: "Sentence case for headings", stated: "GUIDELINES §1", scope: "headings and labels — product names keep title case" },
  { constraint: "One alignment per block", stated: "GUIDELINES §3", scope: "reading text is start-relative, never justified" },
  { constraint: "Colour never carries meaning alone", stated: "GUIDELINES §9 · WCAG 1.4.1", scope: "per component — Callout's fixed per-tone glyph holds by construction" },
];

/* ---- table rendering ----------------------------------------------------- */

/* A real <table>: header cells associate the columns and each row leads with a <th scope="row">, so
   the contract is navigable by column rather than arriving as a flat run of text. The div grid this
   replaced rendered neither. `overflowX: auto` on the wrapper is the ComparisonTable idiom — the
   table scrolls inside its own band rather than pushing the page sideways. */
const TableBand = ({ minWidth, children }: { minWidth: number; children: ReactNode }) => (
  <Box style={{ overflowX: "auto" }}>
    {/* size="1" pinned, like the kit's own PropTable and ComparisonTable — this is documentation
        chrome, not a specimen of Table. Left on the ambient lane it grew with the size toolbar and
        cells re-wrapped: measured at `large`, row heights ran 50 / 72 / 76px, which puts visual
        weight back on the wordiest row — the exact defect this page was rebuilt to remove. */}
    <Table.Root variant="surface" size="1" style={{ minWidth }}>{children}</Table.Root>
  </Box>
);

const Strong = ({ children }: { children: ReactNode }) => (
  <span style={{ color: "var(--ds-text-strong)" }}>{children}</span>
);
const Weak = ({ children }: { children: ReactNode }) => (
  <span style={{ color: "var(--ds-text-weak)" }}>{linkRulings(children)}</span>
);

const GuaranteedTable = () => (
  <TableBand minWidth={760}>
    <Table.Header>
      <Table.Row>
        <Table.ColumnHeaderCell style={{ width: "24%" }}>Constraint</Table.ColumnHeaderCell>
        <Table.ColumnHeaderCell style={{ width: "26%" }}>Encoded as</Table.ColumnHeaderCell>
        <Table.ColumnHeaderCell style={{ width: "20%" }}>Mechanism</Table.ColumnHeaderCell>
        <Table.ColumnHeaderCell style={{ width: "31%" }}>Scope</Table.ColumnHeaderCell>
      </Table.Row>
    </Table.Header>
    <Table.Body>
      {GUARANTEED.map((r) => (
        <Table.Row key={r.constraint}>
          <Table.RowHeaderCell><Strong>{r.constraint}</Strong></Table.RowHeaderCell>
          <Table.Cell><Mono muted>{r.encoded}</Mono></Table.Cell>
          <Table.Cell><Strong>{r.mech}</Strong></Table.Cell>
          <Table.Cell><Weak>{r.scope}</Weak></Table.Cell>
        </Table.Row>
      ))}
    </Table.Body>
  </TableBand>
);

const DocumentedTable = () => (
  <TableBand minWidth={620}>
    <Table.Header>
      <Table.Row>
        <Table.ColumnHeaderCell style={{ width: "31%" }}>Constraint</Table.ColumnHeaderCell>
        <Table.ColumnHeaderCell style={{ width: "24%" }}>Stated in</Table.ColumnHeaderCell>
        <Table.ColumnHeaderCell style={{ width: "45%" }}>Scope</Table.ColumnHeaderCell>
      </Table.Row>
    </Table.Header>
    <Table.Body>
      {DOCUMENTED.map((r) => (
        <Table.Row key={r.constraint}>
          <Table.RowHeaderCell><Strong>{r.constraint}</Strong></Table.RowHeaderCell>
          <Table.Cell><Mono muted>{linkRulings(r.stated)}</Mono></Table.Cell>
          <Table.Cell><Weak>{r.scope}</Weak></Table.Cell>
        </Table.Row>
      ))}
    </Table.Body>
  </TableBand>
);

/* ---- the page ------------------------------------------------------------ */

function Enforcement() {
  return (
    <Page>
      <PageHeader
        title="Enforcement · Contract"
        standfirst="One question, answered per rule: can you lean on this without checking? A rule is guaranteed when a machine refuses the violation — so each one names the mechanism that refuses it and the reach that mechanism actually has, because a guarantee whose edge you cannot see is not one. Everything else is documented: real rules, held by people."
      />

      <Section
        title="The mechanisms"
        lead="Six things enforce a rule in this system, and every row below names one of them. What each covers — and where each stops — is stated here, once, so the tables can stay one line to a row."
      >
        {/* Two-up: six paragraphs stacked one-up ran to the 65ch reading measure and left the band
            ending 500px short of the tables below. Two columns put the band on the same right edge,
            and show the set as a set. Collapses to one column under the sm breakpoint. */}
        <Grid columns={{ initial: "1", sm: "2" }} gapX="6" gapY="5">
          {MECHANISMS.map((m) => (
            <Mechanism key={m.name} name={m.name} where={m.where}>{m.body}</Mechanism>
          ))}
        </Grid>
      </Section>

      <Rule />

      <Section
        title="Guaranteed"
        lead="A machine refuses the violation: an author — or an agent authoring against the system — cannot ship one of these without a red build. Read the mechanism, then read the scope; the scope is the half that tells you where the guarantee ends."
      >
        <GuaranteedTable />
        <Caption>
          The target-size row is the <strong style={{ color: "var(--ds-text-strong)" }}>cursor</strong> floor.
          The coarse-pointer extension — invisible ≥44×44 hit areas under <Mono muted>pointer: coarse</Mono>, visible
          geometry unchanged — is ruled and not shipped, so 24×24 is what holds under a finger too.
        </Caption>
      </Section>

      <Rule />

      <Section
        title="Documented"
        lead="Considered rules with no machine behind them — held by author discipline in review. Some are irreducibly judgment; some are bakeable in principle and not yet baked. Treat them as binding and verify them yourself."
      >
        <DocumentedTable />
      </Section>

      <Rule />

      <Section title="Where the reasoning lives">
        <Caption>
          Every rule above traces to a ruling. <strong style={{ color: "var(--ds-text-strong)" }}>Foundations → Decisions</strong>{" "}
          reads the ledger live and groups every entry by theme, so the reasoning is one page away and cannot
          go stale behind a copy of it.
        </Caption>
      </Section>
    </Page>
  );
}

const meta: Meta<typeof Enforcement> = {
  title: "Foundations/Enforcement",
  component: Enforcement,
  parameters: {
    docs: {
      description: {
        component:
          "The contract: what the system mechanically guarantees versus what it documents. Six mechanisms " +
          "carry every guarantee, each stated once with its reach and its limits; each row then names the " +
          "mechanism that holds it and the scope that mechanism actually covers — so anyone authoring " +
          "against the system can tell, at a glance, what is safe to lean on without checking.",
      },
    },
  },
};
export default meta;
type Story = StoryObj<typeof Enforcement>;

/* SELF-SYNCING. The token names are read back OUT of the rows the page renders, so a new row extends
   this check for free and the page cannot cite a token that doesn't resolve. Wildcards (`--ds-*`) are
   an expression rather than a name and are skipped by the `*` filter, not by a hand-kept list. The
   page also asserts the one rule it claims needs no test — text-strong is never pure black — and its
   own structure, because "a real <table>" is the accessibility claim this rebuild rests on. */
const TOKEN_RE = /--[a-z0-9-]+\*?/g;
const CITED_TOKENS = [
  ...new Set(
    GUARANTEED.flatMap((r) => [...r.encoded.matchAll(TOKEN_RE)].map((m) => m[0])).filter((t) => !t.includes("*")),
  ),
];

export const Contract: Story = {
  play: async ({ canvasElement }) => {
    const root = themeRoot(canvasElement);

    const unresolved = CITED_TOKENS.filter((t) => resolve(root, t) === "");
    if (unresolved.length) {
      throw new Error(`Enforcement cites tokens that don't resolve: ${unresolved.join(", ")}`);
    }

    const strong = resolveColor(root, "--ds-text-strong");
    if (strong.r === 0 && strong.g === 0 && strong.b === 0) {
      throw new Error("--ds-text-strong resolved to pure black (#000) — the 'no pure-black text' row is a lie");
    }

    // Real tables, not div grids: two of them, with the row counts the data declares and a
    // <th scope="row"> leading every row — the column association a reader navigating by column needs.
    const tables = canvasElement.querySelectorAll("table");
    if (tables.length !== 2) {
      throw new Error(`Expected 2 <table> elements (Guaranteed + Documented), found ${tables.length}`);
    }
    const counts = [...tables].map((t) => t.querySelectorAll("tbody tr").length);
    if (counts[0] !== GUARANTEED.length || counts[1] !== DOCUMENTED.length) {
      throw new Error(
        `Rendered rows (${counts.join(", ")}) don't match the contract data (${GUARANTEED.length}, ${DOCUMENTED.length})`,
      );
    }
    const headless = [...canvasElement.querySelectorAll("tbody tr")].filter(
      (tr) => tr.firstElementChild?.tagName !== "TH",
    );
    if (headless.length) {
      throw new Error(`${headless.length} contract row(s) don't lead with a row header cell`);
    }
  },
};
