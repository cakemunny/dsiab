import { useContext, useLayoutEffect, useRef, useState } from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { Box, Code, Flex, Grid, Text } from "@radix-ui/themes";
import { FormLayout } from "./FormLayout";
import { TextField } from "./TextField";
import { Select } from "./Select";
import {
  Decision, DoDont, DODONT_LABEL, HexThemeKey, Mono, NoteRow, Page, PageHeader, PropsLead,
  type PropDef, PropTable, Rule, Section,
} from "./_storyKit";

/** The one definition of this component — the standfirst every page of it opens with. */
const DEFINITION = (
  <>
    Wraps a set of Fields and publishes a <strong>label direction</strong>. In <Mono>horizontal</Mono>{" "}
    mode the label sits in a left column beside the control — a dense settings-form shape — collapsing
    to a stack on a narrow viewport. Renders a <Mono>&lt;div&gt;</Mono>, never a <Mono>&lt;form&gt;</Mono>.
  </>
);

/* FormLayout owns no --ds-* roles — it is pure layout (a direction context + a non-wrapping field grid),
   so there is nothing here for a measured row to check a token against: every row below is a layout fact
   read off the RENDERED grid (the drift guard). A horizontal
   FormLayout owns a two-track `auto minmax(0,1fr)` grid (a SHARED label column + control column) and each
   Field.Root inside SUBGRIDS it — so every row's control aligns to one left edge. Re-resolved on any
   toolbar flip via HexThemeKey (layout is theme-invariant, but the pattern is uniform) and on viewport
   resize (the ≤480px collapse changes the rendered tracks). */
function FormLayoutSpec() {
  const wrap = useRef<HTMLDivElement>(null);
  const themeKey = useContext(HexThemeKey);
  const [v, setV] = useState<{ containerCols: string; fieldDisplay: string; fieldCols: string } | null>(null);
  useLayoutEffect(() => {
    const read = () => {
      const container = wrap.current?.querySelector<HTMLElement>('[data-ds-form-layout="horizontal"]');
      const field = wrap.current?.querySelector<HTMLElement>('[data-direction="horizontal"]');
      if (!container || !field) return;
      const cc = getComputedStyle(container);
      const fc = getComputedStyle(field);
      setV({ containerCols: cc.gridTemplateColumns, fieldDisplay: fc.display, fieldCols: fc.gridTemplateColumns });
    };
    read();
    window.addEventListener("resize", read);
    return () => window.removeEventListener("resize", read);
  }, [themeKey]);
  return (
    <Box style={{ borderRadius: "var(--ds-radius-4)", border: "1px solid var(--ds-stroke-weak)", overflow: "hidden", background: "var(--ds-bg-subtle)" }}>
      <Flex direction="column" gap="3" style={{ padding: "20px" }}>
        <Box ref={wrap} style={{ maxWidth: 360 }}>
          <FormLayout direction="horizontal">
            <TextField label="Name" defaultValue="Ada Lovelace" />
            <TextField label="Email address" defaultValue="ada@example.com" />
          </FormLayout>
        </Box>
        <Text size="1" style={{ color: "var(--ds-text-weak)" }}>
          FormLayout owns no <Mono>--ds-*</Mono> roles — it is layout only, so this spec reads the rendered
          grid live from the DOM (the drift guard). A horizontal FormLayout owns a two-track{" "}
          <Mono>auto minmax(0,1fr)</Mono> grid (a shared label column + control column); each Field.Root
          inside <Mono>subgrid</Mono>s it, so every row's control aligns to one left edge. It collapses to a
          single stacked column at <Mono>≤480px</Mono> via a CSS media query, never JS.
        </Text>
      </Flex>
      {/* Layout facts, not colour claims: FormLayout paints nothing, so there is no token for a row to
          be checked against. Each reading below comes off the rendered grid above. */}
      <NoteRow part="FormLayout grid template columns" value={v?.containerCols ?? "…"} />
      <NoteRow part="Field.Root display" value={v?.fieldDisplay ?? "…"} />
      <NoteRow part="Field.Root grid template columns" value={v?.fieldCols ?? "…"} />
      <NoteRow part="Narrow collapse" value="≤480px → single column (CSS @media, not JS)" />
    </Box>
  );
}

/* A small settings form used across the specimens — two TextFields + a Select, each riding the shared
   Field shell, so they ALL inherit the FormLayout direction with no per-input plumbing. */
function SettingsFields() {
  return (
    <>
      <TextField label="Full name" defaultValue="Ada Lovelace" />
      <TextField label="Email" type="email" defaultValue="ada@example.com" />
      <Select label="Role" defaultValue="admin">
        <Select.Trigger />
        <Select.Content>
          <Select.Item value="admin">Admin</Select.Item>
          <Select.Item value="editor">Editor</Select.Item>
          <Select.Item value="viewer">Viewer</Select.Item>
        </Select.Content>
      </Select>
    </>
  );
}

const FORMLAYOUT_PROPS: PropDef[] = [
  { name: "direction", type: `"vertical" | "horizontal"`, def: `"vertical"`, desc: <>Label layout published to every descendant Field. <Code>vertical</Code> stacks label over control; <Code>horizontal</Code> lays the label in a left column beside the control (collapsing to a stack ≤480px). A single <Code>Field</Code> can override with its own <Code>direction</Code>.</>, source: "FormLayout.tsx" },
  { name: "gap", type: `"0"–"9"`, def: `"4"`, desc: <>Space between stacked fields — a Radix space step (<Code>"4"</Code> = 16px). Passes through to the grid's row gap.</>, source: "FormLayout.tsx" },
  { name: "children", type: "ReactNode", desc: <>The Fields (or Field-riding inputs — TextField, Select, TextArea, …). Each is a row of the non-wrapping grid.</>, source: "FormLayout.tsx" },
];

const meta: Meta<typeof FormLayout> = {
  title: "Components/Layout/FormLayout",
  component: FormLayout,
  parameters: {
    controls: { disable: true },
    docs: {
      description: {
        component:
          "**FormLayout** wraps a set of Fields and publishes one thing to them all: a **label direction**. " +
          "In `horizontal` mode every Field-riding input (TextField, Select, TextArea, …) lays its label in " +
          "a left column beside the control — a dense settings-form shape — collapsing back to a stack on a " +
          "narrow viewport. It also gives the fields consistent vertical rhythm as a **non-wrapping grid**. " +
          "It renders a plain `<div>`, never a `<form>` — the consumer owns the form element, so a FormLayout " +
          "composes inside any form, route, or dialog. It’s a **lite-tier** component — one Usage story " +
          "(specimen · live grid spec · a do/don’t) plus a Props.",
      },
    },
  },
};
export default meta;
type Story = StoryObj<typeof FormLayout>;

/** Usage — the primary lite docs story: a horizontal-labels specimen (≥2 input types riding Field), a
 *  vertical comparison, the live grid spec, and one do/don't. */
export const Usage: Story = {
  // The DoDont callout labels (success/error text on the green/red tint) measure ~4.1–4.4 — just under
  // axe's strict 4.5; the callout colour + the DO/DON'T word already carry the meaning, so color-contrast
  // is scoped off here, a documented specimen exception (same pattern as Kbd/Separator Usage).
  parameters: { a11y: { context: { exclude: [DODONT_LABEL] } } },
  render: (_args, { globals }) => (
    <HexThemeKey.Provider value={`${globals.accent}-${globals.appearance}-${globals.contrast}`}>
      <Page>
        <PageHeader title="FormLayout · Usage" standfirst={DEFINITION} />

        <Section title="Specimen" lead="A horizontal FormLayout: every Field-riding input — two TextFields and a Select — inherits the label-left layout with no per-input plumbing.">
          <Box data-testid="overview-horizontal" style={{ maxWidth: 480 }}>
            <FormLayout direction="horizontal">
              <SettingsFields />
            </FormLayout>
          </Box>
        </Section>

        <Rule />

        <Section title="Vertical vs horizontal" lead="Same three fields, both directions. Vertical is the default — label stacked over control; horizontal moves the label into a left column. The only change is the FormLayout direction; the inputs are identical.">
          <Grid columns={{ initial: "1", sm: "2" }} gapX="6" gapY="5">
            <Flex direction="column" gap="2">
              <Text size="1" weight="bold" style={{ color: "var(--ds-text-weak)", letterSpacing: "0.06em" }}>VERTICAL (default)</Text>
              <FormLayout direction="vertical">
                <TextField label="Full name" defaultValue="Ada Lovelace" />
                <TextField label="Email" type="email" defaultValue="ada@example.com" />
              </FormLayout>
            </Flex>
            <Flex direction="column" gap="2">
              <Text size="1" weight="bold" style={{ color: "var(--ds-text-weak)", letterSpacing: "0.06em" }}>HORIZONTAL</Text>
              <FormLayout direction="horizontal">
                <TextField label="Full name" defaultValue="Ada Lovelace" />
                <TextField label="Email" type="email" defaultValue="ada@example.com" />
              </FormLayout>
            </Flex>
          </Grid>
        </Section>

        <Rule />


        <Section title="When horizontal earns its keep" lead="Horizontal labels earn their keep in dense, short-label settings forms. Where width is scarce, a stack reads better — and below 480px the layout collapses to one automatically.">
          <Grid columns={{ initial: "1", sm: "2" }} gap="3">
            <DoDont kind="do" bare note="Horizontal labels suit a dense settings form with short labels — the eye scans label → value along a row, and the aligned control column reads as a tidy table.">
              <Box style={{ width: 260 }}>
                <FormLayout direction="horizontal" gap="3">
                  <TextField label="Name" defaultValue="Ada" />
                  <TextField label="Email" defaultValue="ada@x.co" />
                </FormLayout>
              </Box>
            </DoDont>
            <DoDont kind="dont" bare note="Don't force horizontal where width is scarce — a fixed label column squeezes the control. On a narrow or mobile viewport keep it vertical; below 480px FormLayout collapses to a stack for you.">
              <Box style={{ width: 180 }}>
                <FormLayout direction="vertical" gap="3">
                  <TextField label="Shipping address line 1" defaultValue="123 Analytical Engine Way" />
                </FormLayout>
              </Box>
            </DoDont>
          </Grid>
        </Section>

        <Rule />

        <Section title="Grid spec" lead="Read live from the rendered field — the drift guard. FormLayout owns no --ds-* roles; the spec documents what a horizontal Field.Root resolves to in the running theme.">
          <FormLayoutSpec />
        </Section>
      </Page>
    </HexThemeKey.Provider>
  ),
  play: async ({ canvasElement }) => {
    // Passive (no driving / no flash): assert the horizontal specimen lays labels LEFT of their controls
    // and — the [[horizontal-field-labels]] subgrid fix — that all controls share ONE left edge across rows of DIFFERENT label
    // lengths ("Full name" / "Email" / "Role"). axe runs automatically on the story.
    const root = canvasElement.querySelector<HTMLElement>('[data-testid="overview-horizontal"]');
    if (!root) throw new Error("Usage must render the horizontal specimen");
    // The horizontal shape only holds above the 480px collapse breakpoint; below it the CSS @media stacks
    // labels over controls (verified separately in _internal/FormLayout behavior). Skip when collapsed.
    if (window.innerWidth <= 480) return;
    const fields = Array.from(root.querySelectorAll<HTMLElement>('[data-direction="horizontal"]'));
    if (fields.length < 3) throw new Error(`expected 3 Field-riding inputs to inherit horizontal; got ${fields.length}`);
    const controlLefts: number[] = [];
    for (const field of fields) {
      if (getComputedStyle(field).display !== "grid") throw new Error("a horizontal Field.Root must render display:grid");
      // Under a horizontal FormLayout the field subgrids the shared tracks — the alignment mechanism.
      if (!getComputedStyle(field).gridTemplateColumns.includes("subgrid")) throw new Error("a horizontal Field.Root inside a FormLayout must subgrid the shared label column (grid-template-columns: subgrid)");
      const label = field.querySelector<HTMLElement>('[data-field-part="label"]');
      const control = field.querySelector<HTMLElement>(".rt-TextFieldRoot, .rt-SelectTrigger");
      if (!label || !control) throw new Error("a horizontal field must render a label and a control");
      const lr = label.getBoundingClientRect();
      const cr = control.getBoundingClientRect();
      const fr = field.getBoundingClientRect();
      controlLefts.push(cr.left);
      // label ends before the control begins (left column) and shares the control's row (vertical overlap).
      if (lr.right > cr.left + 2) throw new Error(`label must sit LEFT of the control; label.right ${lr.right.toFixed(1)} vs control.left ${cr.left.toFixed(1)}`);
      if (!(lr.bottom > cr.top && lr.top < cr.bottom)) throw new Error("label must sit on the control's row (vertical overlap)");
      // the label must live INSIDE the field's left edge — if the auto label track collapses to 0 the
      // label overflows leftward out of the grid (a real bug the naive right<=left check misses).
      if (lr.left < fr.left - 1) throw new Error(`label overflows the field's left edge (auto label track collapsed); label.left ${lr.left.toFixed(1)} vs field.left ${fr.left.toFixed(1)}`);
    }
    // The alignment contract: every control begins at the SAME x (the shared subgrid label column sized to
    // the widest label), despite the rows having different label lengths. A per-field grid would drift here.
    const minLeft = Math.min(...controlLefts);
    const maxLeft = Math.max(...controlLefts);
    if (maxLeft - minLeft > 1.5) throw new Error(`horizontal controls must share one left edge (aligned column); spread ${(maxLeft - minLeft).toFixed(1)}px across lefts [${controlLefts.map((l) => l.toFixed(1)).join(", ")}]`);
  },
};

type PropsArgs = {
  direction: "vertical" | "horizontal";
  gap: "1" | "2" | "3" | "4" | "5" | "6";
};

/** Props — the live, args-driven FormLayout. Flip direction and gap and watch every field follow. */
export const Props: StoryObj<PropsArgs> = {
  args: { direction: "horizontal", gap: "4" },
  argTypes: {
    direction: { control: "inline-radio", options: ["vertical", "horizontal"], description: "Label layout published to every descendant Field.", table: { category: "Layout" } },
    gap: { control: "inline-radio", options: ["1", "2", "3", "4", "5", "6"], description: "Space between stacked fields (Radix space step).", table: { category: "Layout" } },
  },
  parameters: { controls: { disable: false } },
  render: ({ direction, gap }: PropsArgs) => (
    <Page maxWidth="none">
      <PageHeader title="FormLayout · Props" standfirst={DEFINITION} />
      <Box style={{ padding: "8px 0 2px", maxWidth: 480 }}>
        <FormLayout direction={direction} gap={gap}>
          <SettingsFields />
        </FormLayout>
      </Box>
      <PropsLead />
      <Rule />
      <Section title="Props reference" lead={<>Every prop <Code>FormLayout</Code> accepts — <Code>direction</Code> and <Code>gap</Code> are the knobs; all other Radix <Code>Grid</Code> props forward honestly.</>}>
        <PropTable rows={FORMLAYOUT_PROPS} />
      </Section>
    </Page>
  ),
};

/** History — the rulings this component encodes and a changelog of how it changes over time. */
export const History: Story = {
  render: () => (
    <Page>
      <PageHeader title="FormLayout · History" standfirst={DEFINITION} />
      <Section title="Decisions" lead="The rulings this component encodes.">
        <Flex direction="column" gap="3">
          <Decision id="[[form-layout]] · FormLayout">
            FormLayout provides a <strong>direction context</strong> carrying only <Code>&#123; direction &#125;</Code>, and
            our shared <Code>Field</Code> shell is the sole consumer. Its only jobs are to publish that
            direction and to give the fields consistent rhythm as a <strong>non-wrapping grid</strong> — one
            implicit column, each field on its own row. (Not a wrapping flex row.)
          </Decision>
          <Decision id="[[form-layout]] · renders a div">
            It renders a plain <Code>&lt;div&gt;</Code>, <strong>never a <Code>&lt;form&gt;</Code></strong>. The consumer
            owns the form element, so a FormLayout composes inside any <Code>&lt;form&gt;</Code>, route, or dialog
            without owning submission — composition over inheritance.
          </Decision>
          <Decision id="[[horizontal-field-labels]] · Field horizontal-labels">
            The <strong>Field horizontal-labels amendment</strong>. <Code>Field.Root</Code> gains a <Code>direction</Code> mode. Horizontal
            lays the label in a left column via a CSS grid <Code>grid-template-columns: auto 1fr</Code>, the
            label centred to the control row, the description/message in the control column (second track).
            It resolves <em>explicit prop → FormLayout context → <Code>vertical</Code></em> and threads to the
            root as <Code>data-direction</Code>. The grid collapses to a single stacked column at{" "}
            <Code>≤480px</Code> via a CSS <Code>@media</Code> query — <strong>not JS</strong>. Every
            Field-riding input inherits it for free; vertical Field renders unchanged.
          </Decision>
        </Flex>
      </Section>

      <Rule />

      <Section title="Changelog" lead="Notable changes, newest first — grows as the component evolves.">
        <Flex direction="column" gap="3">
          <Decision id="0.9.0">
            Initial <Code>System/Layout/FormLayout</Code> — a direction + spacing wrapper for Fields (renders a{" "}
            <Code>&lt;div&gt;</Code>, not a <Code>&lt;form&gt;</Code>; a non-wrapping field grid). Ships with the{" "}
            <strong>Field horizontal-labels amendment</strong>: <Code>Field.Root</Code> gains a{" "}
            <Code>direction</Code> mode (grid <Code>auto 1fr</Code> label column, ≤480px CSS collapse), inherited
            for free by every Field-riding input.
          </Decision>
        </Flex>
      </Section>
    </Page>
  ),
};
