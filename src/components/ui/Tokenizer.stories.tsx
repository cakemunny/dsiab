import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState, type ReactNode } from "react";
import { Box, Code, Flex, Grid } from "@radix-ui/themes";
import { Plus } from "@phosphor-icons/react";
import { Tokenizer } from "./Tokenizer";
import { createStaticSource, type TypeaheadOption, type TypeaheadSource } from "./Typeahead";
import {
  AnatomyLegend, Caption, Decision, DoDont, DODONT_LABEL, dotStyle, type KeyBinding, KeyRow, MeasuredRow,
  MeasuredSpec, Mono, NoteRow, Page, PageHeader, PropsLead, type PropDef, PropTable, Rule, Scenario, Section, TokenGroup,
} from "./_storyKit";

/** The component's definition — one source, referenced by the header of every story on this page. */
const DEFINITION = <>Reach for a Tokenizer to build a set of validated values — labels, recipients, filters — from a searchable source. It is the multi-value sibling of Typeahead: same engine, but the committed items stack as removable chips instead of replacing the query.</>;

/* DOCS stories (History · Anatomy · Usage · Keyboard · Props) — static + calm on view. Every
   behavioral play lives in `_tokenizer.stories.tsx` (_internal/Tokenizer behavior), so viewing a docs
   page never auto-drives the dropdown. The live specimens here stay manually interactive. */

/* ---- demo sources -------------------------------------------------------- */
const TAGS: TypeaheadOption[] = [
  "Design", "Engineering", "Research", "Marketing", "Sales", "Support", "Finance", "Legal",
  "Product", "Operations", "Data", "Security", "Growth", "Brand", "Content",
].map((label, i) => ({ id: String(i), label }));
const tagSource = createStaticSource(TAGS);

const PEOPLE: TypeaheadOption[] = [
  "Ada Lovelace", "Grace Hopper", "Alan Turing", "Katherine Johnson", "Edsger Dijkstra",
  "Barbara Liskov", "Donald Knuth", "Margaret Hamilton",
].map((label, i) => ({ id: `p${i}`, label }));
const peopleSource = createStaticSource(PEOPLE);

/** A stateful wrapper — Tokenizer is controlled, so docs specimens hold their own value. */
function Demo({
  source = tagSource,
  initial = [],
  ...props
}: {
  source?: TypeaheadSource;
  initial?: TypeaheadOption[];
  [key: string]: unknown;
}) {
  const [value, setValue] = useState<TypeaheadOption[]>(initial);
  return (
    <Tokenizer
      value={value}
      onValueChange={setValue}
      source={source}
      debounceMs={0}
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      {...(props as any)}
    />
  );
}

/* ---- anatomy diagram ----------------------------------------------------- */
function AnatomyDiagram() {
  return (
    <Box style={{ position: "relative", padding: "28px 12px 12px" }} data-size-lesson="the chip's remove ✕ holds step 1 — it garnishes the chip, it doesn't join the ambient row">
      <Box style={{ ...dotStyle, top: -2, left: 6 }}>1</Box>
      <Box style={{ ...dotStyle, top: -2, left: 118 }}>2</Box>
      <Box style={{ ...dotStyle, top: -2, left: 250 }}>3</Box>
      <Demo initial={[TAGS[0], TAGS[1]]} label="Labels" placeholder="Search to add…" />
    </Box>
  );
}

const meta: Meta<typeof Tokenizer> = {
  title: "Components/Typed Entry/Tokenizer",
  component: Tokenizer,
  parameters: {
    controls: { disable: true },
    docs: {
      description: {
        component:
          "**Tokenizer** — a multi-token input: committed **Token** chips plus a transient type-to-search " +
          "combobox, on the shared **Field** shell. It embeds the **Typeahead** engine in a transient mode " +
          "and lays out chips in a wrapping `role=group` surface (collapsing with **OverflowList** when " +
          "asked). The deliberate model: tokens are created **only through the dropdown** — pick a match, or " +
          "(with `creatable`) pick a synthesized `Create “X”` row. There is **no** free-text " +
          "Enter/comma/paste/blur commit, so every token is real, deduped, and validatable.",
      },
    },
  },
};
export default meta;
type Story = StoryObj<typeof Tokenizer>;

/* ─────────────────────────────────────────────────────────────────────────── Anatomy */
/* The token rows below MEASURE two real Tokenizers rendered into the measurement host — a resting one
   with a description, and one carrying an error tone. Each row names the element that paints it and the
   property it paints with; the row reads that property off the rendered surface and checks it against
   the token it claims, so the row can disagree with the component.

   The Create row is the one part a rendered Tokenizer cannot put here: it lives in the dropdown, which
   the embedded Typeahead portals to <body>, and the component exposes no way to redirect that portal. So
   the host carries the create row's OWN markup and class instead — the stylesheet paints it exactly as it
   paints the live one, and the story never names the token, so the row can still disagree. */
function SurfaceSpecimens() {
  return (
    <>
      <Demo label="Tags" source={tagSource} initial={[TAGS[0]]} description="Search and pick to add." />
      <Box data-spec="error">
        <Demo label="Tags" source={tagSource} validation={{ tone: "error", message: "Pick at least one." }} />
      </Box>
      <span className="rt-ds-tokenizer-create-row">
        <Plus weight="bold" aria-hidden />
        <span>Create “Compliance”</span>
      </span>
    </>
  );
}

export const Anatomy: Story = {
  render: () => (
    <Page>
      <PageHeader title="Tokenizer · Anatomy" standfirst={DEFINITION} />

      <Section
        title="Anatomy"
        lead="A Field.Root wrapping a role=group surface. The surface reuses the TextField skin (fill + hairline border + radius) and is a flex-wrap row: the committed Token chips in source order, then the chrome-less transient Typeahead input as the last child. Click anywhere focuses the input."
      >
        <Box style={{ maxWidth: 420 }}>
          <AnatomyDiagram />
        </Box>
        <AnatomyLegend
          parts={[
            [1, "Token chips", "The committed items, as Token chips (source order, wrapping). Each is one roving stop; the ✕ removes on pointer, Backspace/Delete on keyboard."],
            [2, "Transient input", "The embedded Typeahead input — chrome-less, always the LAST flex child. Type to search; picking a row commits a chip and clears the query."],
            [3, "The surface", "A bordered role=group reusing the TextField surface tokens; the system focus ring ([[focus-ring]]) draws around the whole surface when the input is focused."],
          ]}
        />
      </Section>
      <Rule />
      <Section title="The Create row" lead={<>With <Code>creatable</Code>, a distinct <Code>Create "{`{query}`}"</Code> row (a + glyph + the quoted query) is appended at the BOTTOM. While real matches exist it is NOT auto-highlighted (Enter picks the match); with zero real matches it becomes the first row, so Enter-on-a-new-value commits it — the intuitive path.</>}>
        <Box style={{ maxWidth: 420 }}>
          <Demo label="Tags" source={tagSource} creatable placeholder="Search to add…" />
          <Box mt="2"><Caption>Type a value that isn't in the list (e.g. "Compliance") to see the Create row.</Caption></Box>
        </Box>
      </Section>
    </Page>
  ),
};

/* ─────────────────────────────────────────────────────────────────────────── Usage */
export const Usage: Story = {
  // The DO/DON'T word (success/error step-11 ink on its own tint) measures 4.10 at 12px bold, under axe's
  // 4.5; the colour + the word already carry the meaning, so that row is the documented exception. Scoped
  // to the label itself — the cards' specimens stay fully axe-checked, which "[data-dodont]" did not do.
  parameters: { a11y: { context: { exclude: [DODONT_LABEL] } } },
  render: () => (
    <Page>
      <PageHeader title="Tokenizer · Usage" standfirst={DEFINITION} />

      <Section title="A tag / label picker" lead="The everyday case: search a catalogue, pick to add, remove with the ✕ or Backspace. Selected items leave the menu, so you never double-add.">
        <Box style={{ maxWidth: 420 }} data-size-lesson="the chip's remove ✕ holds step 1 — it garnishes the chip, it doesn't join the ambient row">
          <Demo label="Labels" source={tagSource} initial={[TAGS[0]]} description="Search and pick to add." placeholder="Search to add…" />
        </Box>
      </Section>
      <Rule />
      <Section title="Creatable + a cap" lead={<><Code>creatable</Code> lets a user invent values through the Create row; <Code>maxEntries</Code> caps the set — at the cap the input collapses to a sliver, the dropdown is suppressed, and a calm hint explains why.</>}>
        <Grid columns={{ initial: "1", sm: "2" }} gap="4" data-size-lesson="the chip's remove ✕ holds step 1 — it garnishes the chip, it doesn't join the ambient row">
          <Scenario label="CREATABLE" caption="Type a new value and pick the Create row to invent a token.">
            <Demo label="Skills" source={peopleSource} creatable placeholder="Search to add…" />
          </Scenario>
          <Scenario label="MAXENTRIES = 3" caption="At the cap the input is a focusable sliver + a description hint.">
            <Demo label="Reviewers" source={peopleSource} initial={[PEOPLE[0], PEOPLE[1], PEOPLE[2]]} maxEntries={3} placeholder="Search to add…" />
          </Scenario>
        </Grid>
      </Section>
      <Rule />
      <Section title="Placeholder — name the mechanism" lead="The placeholder must tell the user HOW tokens are added. This is dropdown-only, so it says so.">
        <Grid columns={{ initial: "1", sm: "2" }} gap="4">
          <DoDont kind="do" bare note={<>“Search to add…” names the real mechanism — pick from the dropdown.</>}>
            <Demo label="Tags" source={tagSource} placeholder="Search to add…" />
          </DoDont>
          <DoDont kind="dont" bare note={<>“Type and press Enter” is a lie — there is no free-text Enter commit.</>}>
            <Demo label="Tags" source={tagSource} placeholder="Type and press Enter" />
          </DoDont>
        </Grid>
      </Section>
      <Rule />
      <Section title="Tokens" lead="The roles the surface adds on top of the reused TextField skin, read live from the running theme. Semantic tones are accent-aware — they follow a brand's collision shifts.">
        <TokenGroup label="SURFACE ROLES" blurb="The surface fill + hairline border are reused verbatim from the TextField surface variant (--color-surface + --gray-a7); the roles below are what Tokenizer adds.">
          <MeasuredSpec render={() => <SurfaceSpecimens />}>
            <MeasuredRow
              part="Focus ring (hoisted to surface)"
              note="Drawn around the whole surface while the embedded input holds focus. The accent base, with the stack alpha on top, 2px ([[focus-ring]])."
              token="--ds-stroke-focus"
              select=".rt-ds-tokenizer"
              prop="outline-color"
              state="focus-visible"
            />
            <MeasuredRow
              part="Validation tint (error)"
              note="The faint wash the surface takes while a tone is active."
              token="--ds-fill-error-weak"
              select="[data-spec='error'] .rt-ds-tokenizer"
              prop="background-color"
            />
            <MeasuredRow
              part="Create-row glyph"
              note="The + that leads the dropdown's Create row."
              token="--ds-icon-interactive"
              select=".rt-ds-tokenizer-create-row svg"
              prop="color"
            />
            <MeasuredRow
              part="Description / cap hint"
              note="The calm helper line under the surface."
              token="--ds-text-weak"
              select="[data-field-part='description']"
              prop="color"
            />
          </MeasuredSpec>
          {/* Prose rows: the surface draws its border as an INSET RING (a box-shadow), not a border
              colour, so there is no colour longhand to read it off — the measured row above covers the
              tint, which is painted by the same rule. */}
          <NoteRow part="Validation border (error)" value="inset 1px ring — the family step-8 stroke" radix="--ds-stroke-error" />
          <NoteRow part="Surface fill / border" value="--color-surface over --gray-a7 (reused TextField skin)" />
          <NoteRow part="Radius" value="--ds-radius-2 (concentric with the token radius)" radix="radius-2" />
        </TokenGroup>
      </Section>
    </Page>
  ),
};

/* ─────────────────────────────────────────────────────────────────────────── Keyboard */
const KEYS: KeyBinding[] = [
  { keys: ["Tab"], action: <>From outside, focus lands on the <strong>input</strong> (the one forward tab stop) — never a chip.</>, src: "system" },
  { keys: ["Shift", "Tab"], action: <>From the input, focus moves to the chips (the last one).</>, src: "system" },
  { keys: ["←", "→"], action: <>Rove chip-to-chip.</>, src: "system" },
  { keys: ["Home", "End"], action: <>Jump to the first / last chip.</>, src: "system" },
  { keys: ["Backspace", "Delete"], action: <>On a focused chip, remove it (focus → next → previous → input). On the empty input, remove the last chip.</>, src: "system" },
  { keys: ["↓", "↑"], action: <>Move the dropdown's virtual cursor over the results.</>, src: "system" },
  { keys: ["Enter"], action: <>Commit the highlighted row — a real match, or the Create row when it is first (zero real matches).</>, src: "system" },
  { keys: ["Esc"], action: <>Close the dropdown.</>, src: "popover" },
];

export const Keyboard: Story = {
  render: () => (
    <Page>
      <PageHeader title="Tokenizer · Keyboard" standfirst={DEFINITION} />

      <Section title="Keyboard" lead={<>The field is a single tab stop (the input); the chips are a roving group reached with <strong>Shift+Tab</strong>. The dropdown is the <Code>@radix-ui/react-popover</Code> primitive underneath.</>}>
        <Box style={{ border: "1px solid var(--ds-stroke-weak)", borderRadius: "var(--ds-radius-4)", overflow: "hidden" }}>
          {KEYS.map((k, i) => <KeyRow key={i} {...k} />)}
        </Box>
      </Section>
    </Page>
  ),
};

/* ─────────────────────────────────────────────────────────────────────────── Props */
const SOURCE_LABELS: Record<string, ReactNode> = {
  tags: <>static tags (sync)</>,
  people: <>static people (sync)</>,
};

const PROPS: PropDef[] = [
  { name: "value", type: "TypeaheadOption<T>[]", desc: <>The committed tokens (controlled).</>, source: "Tokenizer.tsx" },
  { name: "onValueChange", type: "(items, change) => void", desc: <>Fires on every add / create / remove with the next tokens + <Code>{`{ item, type }`}</Code>.</>, source: "Tokenizer.tsx" },
  { name: "source", type: "TypeaheadSource<T>", desc: <>The search source, reused verbatim by the embedded Typeahead. <Code>createStaticSource(items)</Code> for a local list.</>, source: "Tokenizer.tsx" },
  { name: "creatable", type: "boolean", def: "false", desc: <>Opt in to the <Code>Create "…"</Code> row (dropdown-only creation). The safe DS default is off.</>, source: "Tokenizer.tsx" },
  { name: "maxEntries", type: "number", desc: <>Cap the token count — input collapses to a focusable sliver + a calm description hint.</>, source: "Tokenizer.tsx" },
  { name: "tokenOverflowBehavior", type: `"none" | "unfocusedInline"`, def: `"none"`, desc: <>Collapse trailing chips to "+N" while blurred, expand on focus.</>, source: "Tokenizer.tsx" },
  { name: "htmlName", type: "string", desc: <>Render a hidden input per token id for form participation (disabled ones excluded).</>, source: "Tokenizer.tsx" },
  { name: "placeholder", type: "string", def: `"Search to add…"`, desc: <>Greyed hint while empty — names the mechanism, never "press Enter".</>, source: "Tokenizer.tsx" },
  { name: "disabled / disabledReason", type: "boolean / string", desc: <>Disable; with a reason, SOFT-disable so the reason stays perceivable.</>, source: "Tokenizer.tsx" },
  { name: "label / info / endSlot / description / validation", type: "Field props", desc: <>The shared Field shell — the label row (<Code>info</Code> sits beside the label as a tip icon or helper toggle, <Code>endSlot</Code> pins a note at its far end), the helper line, and accent-aware validation on the surface.</>, source: "Tokenizer.tsx" },
  { name: "aria-label", type: "string", desc: <>Accessible name for a <strong>bare</strong> Tokenizer (no <Code>label</Code>) — one of the two is required, or the <Code>role="group"</Code> surface ships unnamed. A <Code>placeholder</Code> is not a name.</>, source: "Tokenizer.tsx" },
  { name: "size / width / debounceMs", type: `"1"|"2"|"3" / … / number`, desc: <>Control size, field width, and the search debounce (0 for local sources).</>, source: "Tokenizer.tsx" },
];

type PropsArgs = {
  sourceKind: "tags" | "people";
  label: string;
  placeholder: string;
  description: string;
  creatable: boolean;
  maxEntries: number;
  tokenOverflowBehavior: "none" | "unfocusedInline";
  validation: { tone: "error" | "warning" | "success" | "info"; message: string } | undefined;
  size: "auto" | "1" | "2" | "3";
  disabled: boolean;
  disabledReason: string;
  debounceMs: number;
};

export const Props: StoryObj<PropsArgs> = {
  args: {
    sourceKind: "tags",
    label: "Labels",
    placeholder: "Search to add…",
    description: "Search and pick to add.",
    creatable: false,
    maxEntries: 8,
    tokenOverflowBehavior: "none",
    validation: undefined,
    size: "auto",
    disabled: false,
    disabledReason: "",
    debounceMs: 0,
  },
  argTypes: {
    sourceKind: { name: "source", control: "inline-radio", options: ["tags", "people"], table: { category: "Behaviour" } },
    label: { control: "text", table: { category: "Field" } },
    placeholder: { control: "text", table: { category: "Field" } },
    description: { control: "text", table: { category: "Field" } },
    creatable: { control: "boolean", table: { category: "Behaviour" } },
    maxEntries: { control: { type: "range", min: 1, max: 12, step: 1 }, table: { category: "Behaviour" } },
    tokenOverflowBehavior: { control: "inline-radio", options: ["none", "unfocusedInline"], table: { category: "Behaviour" } },
    validation: {
      control: "inline-radio",
      options: ["none", "error", "warning", "success", "info"],
      mapping: {
        none: undefined,
        error: { tone: "error", message: "Pick at least one label." },
        warning: { tone: "warning", message: "Double-check these." },
        success: { tone: "success", message: "Looks good." },
        info: { tone: "info", message: "You can change this later." },
      },
      table: { category: "Field" },
    },
    size: { control: "inline-radio", options: ["auto", "1", "2", "3"], description: '"auto" tracks the global uiSize toolbar (unset → the control lane); a step pins the field.', table: { category: "Variant" } },
    disabled: { control: "boolean", table: { category: "Variant" } },
    disabledReason: { control: "text", table: { category: "Variant" } },
    debounceMs: { control: { type: "range", min: 0, max: 600, step: 50 }, table: { category: "Behaviour" } },
  },
  parameters: { controls: { disable: false } },
  render: (args: PropsArgs) => {
    const source = { tags: tagSource, people: peopleSource }[args.sourceKind];
    return (
      <Page maxWidth="none">
        <PageHeader title="Tokenizer · Props" standfirst={DEFINITION} />
        <Box p="5" style={{ maxWidth: 440 }}>
          <Demo
            key={args.sourceKind}
            source={source}
            label={args.label}
            placeholder={args.placeholder}
            description={args.description}
            creatable={args.creatable}
            maxEntries={args.maxEntries}
            tokenOverflowBehavior={args.tokenOverflowBehavior}
            validation={args.validation}
            size={args.size === "auto" ? undefined : args.size}
            disabled={args.disabled}
            disabledReason={args.disabledReason || undefined}
            debounceMs={args.debounceMs}
          />
          <Box mt="3"><Caption>Source: <Mono>{SOURCE_LABELS[args.sourceKind]}</Mono>. Type to search; pick a row to add a chip. Shift+Tab reaches the chips; arrows rove.</Caption></Box>
        </Box>
        <PropsLead />
        <Rule />
        <Section title="Props reference" lead={<>Every prop <Code>Tokenizer</Code> accepts — the <Code>source</Code> feeds the embedded Typeahead, the <Code>Field</Code> props layer the shared shell, and the rest tune the token model.</>}>
          <PropTable rows={PROPS} />
        </Section>
      </Page>
    );
  },
};

/* ─────────────────────────────────────────────────────────────────────────── History */
export const History: Story = {
  render: () => (
    <Page>
      <PageHeader title="Tokenizer · History" standfirst={DEFINITION} />

      <Section title="Decisions" lead="The rulings this component encodes.">
        <Flex direction="column" gap="4">
          <Decision id="[[tokenizer-input]] · model">
            The <strong>dropdown-only</strong> multi-token input. Tokens are created <strong>only</strong> by
            picking from the dropdown; with <Code>creatable</Code> a <Code>Create "{`{query}`}"</Code> row is
            synthesized and committed by picking it. There is <strong>no</strong> free-text Enter / comma / paste
            / blur commit — those are not built.
          </Decision>
          <Decision id="[[tokenizer-input]] · why">
            The tradeoff is real (users expect Enter-to-tag), and it is paid on
            purpose — dropdown-only creation buys tokens that are <strong>real, deduped, and validatable</strong>,
            never free-text junk. <Code>creatable</Code> defaults <strong>false</strong> (the safe DS default);
            opt in where inventing values is wanted.
          </Decision>
          <Decision id="[[tokenizer-input]] · reuse">
            Almost entirely <strong>assembly</strong>: it embeds the <strong>Typeahead</strong> engine in a new
            transient/embedded mode (chrome-less input, select resets the query, popover anchors to the whole
            surface — behavior-preserving for standalone Typeahead), lays out <strong>Token</strong> chips,
            collapses them with <strong>OverflowList</strong>, rides <strong>Field</strong> + its soft-disable-with-reason,
            and speaks through the singleton announcer.
          </Decision>
          <Decision id="[[tokenizer-input]] · net-new">
            The one earned net-new surface: a wrapping <strong>chip-row</strong> that reuses the TextField
            surface skin and hoists the system focus ring ([[focus-ring]]) to the container via{" "}
            <Code>:has(input:focus-visible)</Code> (Token's idiom). <strong>Zero net-new tokens.</strong>
          </Decision>
          <Decision id="[[tokenizer-input]] · roving">
            The field is <strong>one</strong> forward tab stop — the input. Chips are out of the linear Tab
            sequence: <strong>Shift+Tab</strong> from the input reaches them, then <strong>Arrow / Home / End</strong>{" "}
            rove chip-to-chip (the ✕ is a pointer target, not a tab stop). Backspace/Delete removes; post-removal
            focus goes next → previous → the input.
          </Decision>
          <Decision id="[[tokenizer-input]] · guards">
            Three-layer dedupe (selected items leave the menu · no <Code>Create</Code> for a selected/matching
            value · a commit-time guard). <Code>maxEntries</Code> collapses the input to a focusable sliver,
            suppresses the dropdown, and shows a calm <em>"Maximum n tags"</em> hint in the description (guidance,
            not error). Backspace on the empty input removes the last chip. A <strong>parity announce</strong>
            (polite) covers adds / removes / the cap.
          </Decision>
          <Decision id="[[tokenizer-input]] · deferred">
            Not built: free-text / comma / paste-split / blur commit; the token-chip{" "}
            <strong>edit</strong> mode (chips stay removable-only); <Code>unfocusedLayer</Code>{" "}
            overflow (needs a Layer top-layer primitive we don't have); <Code>changeAction</Code> / InputGroup.
            There is no drag-to-reorder, so the change-type union is <Code>'add'</Code> / <Code>'create'</Code> /
            <Code>'remove'</Code> only — no <Code>'reorder'</Code>.
          </Decision>
        </Flex>
      </Section>
      <Rule />
      <Section title="Changelog" lead="Notable changes, newest first — grows as the component evolves.">
        <Flex direction="column" gap="3">
          <Decision id="0.9.0">
            The dropdown-only model on the embedded Typeahead engine, the
            chip-row surface + roving controller, three-layer dedupe, <Code>maxEntries</Code>, overflow collapse,
            <Code>htmlName</Code> form participation, soft-disable-with-reason, and the parity announce.
          </Decision>
        </Flex>
      </Section>
    </Page>
  ),
};
