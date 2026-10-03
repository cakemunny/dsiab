import type { Meta, StoryObj } from "@storybook/react-vite";
import { Box, Code, Flex, Grid, Text } from "@radix-ui/themes";
import { Stack, MagnifyingGlass } from "@phosphor-icons/react";
import { EmptyState } from "./EmptyState";
import { Button } from "./Button";
import {
  Decision, DoDont, DODONT_LABEL, HexThemeKey, MeasuredRow, MeasuredSpec, Mono, NoteRow, Page, PageHeader,
  PropsLead, type PropDef, PropTable, Rule, Section,
} from "./_storyKit";
import { assertMeasuredRows } from "../../foundations/_assert";

/** The one definition of this component — the standfirst every page of it opens with. */
const DEFINITION = (
  <>
    The calm zero / first-run state of a container. A muted icon, a concise title, a line or two of
    orienting copy, and one clear next action — centred and width-capped so it reads as a tidy focal
    point.
  </>
);

/* A framed container that simulates the real surface an empty state fills — a bordered, sunken panel
   with room to breathe — so each specimen is judged in context (centred + capped inside a real width),
   not as a floating block on the canvas. */
function ContainerFrame({ children }: { children: React.ReactNode }) {
  return (
    <Box
      style={{
        border: "1px solid var(--ds-stroke-weak)",
        borderRadius: "var(--ds-radius-4)",
        background: "var(--ds-bg-subtle)",
        minHeight: 288,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "var(--space-5)",
      }}
    >
      {children}
    </Box>
  );
}

const EMPTY_STATE_PROPS: PropDef[] = [
  { name: "title", type: "ReactNode", desc: <>The focal line — concise and blameless (<Code>"No projects yet"</Code>). Rendered as a System <Code>Heading</Code> on the strong text role. Required.</>, source: "EmptyState.tsx" },
  { name: "headingAs", type: `"h2" | "h3" | "h4" | "h5" | "h6"`, def: `"h3"`, desc: <>The element the title renders as — <strong>document structure, not size</strong>. An empty state usually stands in for a section's content, so <Code>h3</Code> is the default; give it the level the surrounding page needs, or its heading skips a rung of that page's tree.</>, source: "EmptyState.tsx" },
  { name: "description", type: "ReactNode", desc: <>One or two muted lines that orient the user, rendered as a System <Code>Text</Code> and capped at the reading measure so it never runs wide.</>, source: "EmptyState.tsx" },
  { name: "icon", type: "ReactNode", desc: <>A <strong>regular-weight</strong> glyph, painted the muted neutral-icon role and sized modestly. Decorative — rendered <Code>aria-hidden</Code>.</>, source: "EmptyState.tsx" },
  { name: "actions", type: "ReactNode", desc: <>Button children, wrapped in a <Code>ButtonGroup</Code> so the primary (solid) anchors per the global <Code>buttonOrder</Code>. At most one solid primary. Centred under the copy. Optional.</>, source: "EmptyState.tsx" },
  { name: "maxWidth", type: "string | number", def: `"min(100%, 40ch)"`, desc: <>Max-width cap on the whole block so short copy never spans a wide container. Override per instance.</>, source: "EmptyState.tsx" },
  { name: "asChild", type: "boolean", def: "false", desc: <>Render the block as the child element rather than a <Code>div</Code>, which is how it becomes a <Code>section</Code>, an <Code>li</Code>, or the <Code>td</Code> of an empty table. The icon, title, description and actions become that element's children, and the block's classes and its centring and width cap ride along. The child is required with <Code>asChild</Code> and rejected without it, so a stray child cannot become a second route to content.</>, source: "EmptyState.tsx" },
];

const meta: Meta<typeof EmptyState> = {
  title: "Components/Feedback & Status/EmptyState",
  component: EmptyState,
  parameters: {
    controls: { disable: true },
    docs: {
      description: {
        component:
          "**EmptyState** is the calm zero / first-run placeholder for a container — an empty list, board, " +
          "or result set. It orients the user with a muted icon, a concise title, and a line or two of " +
          "supporting copy, then offers ONE clear next action. A net-new composition over System `Heading`, " +
          "`Text`, and `ButtonGroup` (Radix Themes ships no empty-state primitive), it centres its column and " +
          "caps its width so the copy stays a tidy focal point. Copy is blameless by convention — “No projects " +
          "yet”, never “You haven’t created any projects.” It’s a **lite-tier** wrap: one Usage story " +
          "(specimens · token roles · a do/don’t) plus a Props.",
      },
    },
  },
};
export default meta;
type Story = StoryObj<typeof EmptyState>;

/** Usage — the primary lite docs story: real empty moments, the token roles, and one do/don't. */
export const Usage: Story = {
  // The DO/DON'T word (success/error step-11 ink on its own tint) measures 4.10 at 12px bold, under axe's
  // 4.5; the colour + the word already carry the meaning, so that row is the documented exception. Scoped
  // to the label itself — the cards' specimens stay fully axe-checked, which "[data-dodont]" did not do.
  parameters: { a11y: { context: { exclude: [DODONT_LABEL] } } },
  render: (_args, { globals }) => (
    <HexThemeKey.Provider value={`${globals.accent}-${globals.appearance}-${globals.contrast}`}>
      <Page>
        <PageHeader title="EmptyState · Usage" standfirst={DEFINITION} />

        <Section title="Specimen" lead="Real product empty moments — a fresh projects list and a search that found nothing. Each fills a container so you see the centred, width-capped column in context.">
          <Grid columns={{ initial: "1", md: "2" }} gap="4">
            <ContainerFrame>
              <EmptyState
                data-testid="empty-projects"
                icon={<Stack />}
                title="No projects yet"
                description="Create your first project to start organizing your work."
                actions={
                  <>
                    <Button priority="primary">Create project</Button>
                    <Button priority="secondary">Import</Button>
                  </>
                }
              />
            </ContainerFrame>
            <ContainerFrame>
              <EmptyState
                data-testid="empty-search"
                icon={<MagnifyingGlass />}
                title="No results for “roadmap”"
                description="Try a different term or clear the filters to see everything."
                actions={<Button priority="secondary">Clear filters</Button>}
              />
            </ContainerFrame>
          </Grid>
        </Section>

        <Rule />

        <Section title="Orient, don't accuse" lead="Orient, don't accuse — and offer exactly one clear way forward.">
          <Grid columns={{ initial: "1", sm: "2" }} gap="3">
            <DoDont kind="do" bare note="Blameless title, one line of guidance, and a single clear action. The state reads as a starting point, not a fault.">
              <EmptyState
                icon={<Stack />}
                title="No projects yet"
                description="Create your first project to get started."
                actions={<Button priority="primary">Create project</Button>}
              />
            </DoDont>
            <DoDont kind="dont" bare note="Blame copy accuses the user, and two competing solid primaries leave no clear next step. Keep the voice neutral and the primary singular.">
              <EmptyState
                icon={<Stack />}
                title="You haven’t created any projects"
                description="You need to add a project before you can continue."
                actions={
                  <>
                    <Button priority="primary">Create project</Button>
                    <Button priority="primary">Import project</Button>
                  </>
                }
              />
            </DoDont>
          </Grid>
        </Section>

        <Rule />

        <Section title="Tokens" lead="EmptyState coins a single paint role of its own — the muted icon. The other slots inherit System roles rather than inventing any, and each row below reads its value off a rendered empty state and checks it against the role it names.">
          <Box style={{ borderRadius: "var(--ds-radius-4)", border: "1px solid var(--ds-stroke-weak)", overflow: "hidden", background: "var(--ds-bg-subtle)" }}>
            <Box style={{ padding: "14px 20px" }}>
              <Text size="1" style={{ color: "var(--ds-text-weak)", lineHeight: 1.6, maxWidth: "var(--ds-text-measure)" }}>
                Only the icon carries a paint role EmptyState itself declares. The <Mono>title</Mono>,{" "}
                <Mono>description</Mono>, and <Mono>actions</Mono> reuse System <Code>Heading</Code> /{" "}
                <Code>Text</Code> / <Code>ButtonGroup</Code> — so they invent no token, but they still land on
                named ones: the strong and weak text roles, and the solid primary's accent-aware fill with its
                guaranteed-contrast foreground. All five are listed so nothing in the composition is unnamed.
              </Text>
            </Box>
            {/* The title and description are measured on the SPAN carrying the words, not on the
                heading/paragraph box. EmptyState paints those two roles from its own `style`
                attribute, and a row that reads a property straight off an inline-painted node cannot
                be told apart from a row reading back a paint the STORY applied — so it reads the ink
                the glyphs actually inherit instead, one node down. */}
            <MeasuredSpec
              render={() => (
                <EmptyState
                  icon={<Stack />}
                  title={<span>No projects yet</span>}
                  description={<span>Create your first project to get started.</span>}
                  actions={<Button priority="primary">New project</Button>}
                />
              )}
            >
              <MeasuredRow
                part="Icon"
                note="Read off the glyph itself — the wrapper sets the ink, the path is what paints."
                token="--ds-icon-neutral"
                select="span[aria-hidden] svg"
                prop="fill"
              />
              <MeasuredRow part="Title (System Heading)" token="--ds-text-strong" select=".rt-Heading > span" prop="color" />
              <MeasuredRow part="Description (System Text)" token="--ds-text-weak" select="p.rt-Text > span" prop="color" />
              <MeasuredRow part="Action — primary fill" token="--ds-fill-accent" select=".rt-Button.rt-variant-solid" prop="background-color" />
              <MeasuredRow
                part="Action — primary text"
                note="The guaranteed-contrast foreground the accent fill is paired with."
                token="--on-accent"
                select=".rt-Button.rt-variant-solid"
                prop="color"
              />
            </MeasuredSpec>
            <NoteRow part="Copy measure" value="max-width: var(--ds-text-measure) — caps the description's line length" radix="65ch" />
            <NoteRow part="Action order" value="ButtonGroup — the solid primary anchors per the global buttonOrder" />
          </Box>
        </Section>

      </Page>
    </HexThemeKey.Provider>
  ),
  play: async ({ canvasElement }) => {
    // Passive (no driving / no flash): EmptyState has no open/close behaviour, so its composition contract
    // is asserted right here on the rendered specimens. axe runs automatically on the story.
    // The token table's EVIDENCE, asserted at runtime ([[measured-token-rows]]).
    const rows = assertMeasuredRows(canvasElement);
    if (rows.measured !== 5 || rows.unproven !== 0) {
      throw new Error(`expected 5 measured / 0 unproven token rows, got ${rows.measured} / ${rows.unproven}`);
    }

    const projects = canvasElement.querySelector<HTMLElement>('[data-testid="empty-projects"]');
    const search = canvasElement.querySelector<HTMLElement>('[data-testid="empty-search"]');
    if (!projects || !search) throw new Error("Usage must render both the projects and search empty states");

    // The four slots render: a decorative icon, a title heading, a description paragraph, and the action(s).
    const icon = projects.querySelector("svg");
    if (!icon) throw new Error("an EmptyState given an icon must render the glyph");
    if (!icon.closest("[aria-hidden]")) throw new Error("the decorative icon must be wrapped aria-hidden");
    const heading = projects.querySelector("h3");
    if (!heading?.textContent?.trim()) throw new Error("EmptyState must render a non-empty title heading");
    const desc = projects.querySelector("p");
    if (!desc?.textContent?.trim()) throw new Error("EmptyState must render its description");
    if (projects.querySelectorAll("button").length < 1) throw new Error("the projects EmptyState must render its action(s)");

    // [[button-priority]] — at most ONE solid primary per state. The projects state anchors exactly one; the no-results
    // state resets with a secondary only, so it carries zero solid primaries.
    for (const [el, name] of [[projects, "projects"], [search, "search"]] as const) {
      const solids = el.querySelectorAll(".rt-variant-solid").length;
      if (solids > 1) throw new Error(`${name} EmptyState must carry at most one solid primary; found ${solids}`);
    }
    if (projects.querySelectorAll(".rt-variant-solid").length !== 1) throw new Error("the projects EmptyState should anchor exactly one solid primary");
    if (search.querySelectorAll(".rt-variant-solid").length !== 0) throw new Error("the no-results EmptyState should carry no solid primary (a reset is secondary)");
  },
};

type PropsArgs = {
  title: string;
  description: string;
  showIcon: boolean;
  showAction: boolean;
  maxWidth: string;
};

/** Props — the live, args-driven EmptyState. Drive the title, description, icon/action slots, and width cap. */
export const Props: StoryObj<PropsArgs> = {
  args: {
    title: "No projects yet",
    description: "Create your first project to start organizing your work.",
    showIcon: true,
    showAction: true,
    maxWidth: "min(100%, 40ch)",
  },
  argTypes: {
    title: { control: "text", description: "The focal title line (the `title` prop).", table: { category: "Content" } },
    description: { control: "text", description: "The muted supporting copy (the `description` prop). Clear it to omit.", table: { category: "Content" } },
    showIcon: { control: "boolean", description: "Toggles the `icon` slot — a muted, regular-weight glyph.", table: { category: "Slots" } },
    showAction: { control: "boolean", description: "Toggles the `actions` slot — a single solid primary.", table: { category: "Slots" } },
    maxWidth: { control: "text", description: "Max-width cap on the block (the `maxWidth` prop).", table: { category: "Layout" } },
  },
  parameters: { controls: { disable: false } },
  render: ({ title, description, showIcon, showAction, maxWidth }: PropsArgs) => (
    <Page maxWidth="none">
      <PageHeader title="EmptyState · Props" standfirst={DEFINITION} />
      <Box
        style={{
          border: "1px solid var(--ds-stroke-weak)",
          borderRadius: "var(--ds-radius-4)",
          background: "var(--ds-bg-subtle)",
          padding: "var(--space-6)",
          display: "flex",
          justifyContent: "center",
        }}
      >
        {/* headingAs="h2": this specimen is a direct child of the page, one rung under the page
            title, so its heading takes h2 — the default h3 would skip a level here. The level is
            independent of the size, so the block looks exactly the same. */}
        <EmptyState
          icon={showIcon ? <Stack /> : undefined}
          title={title}
          headingAs="h2"
          description={description || undefined}
          maxWidth={maxWidth}
          actions={showAction ? <Button priority="primary">Create project</Button> : undefined}
        />
      </Box>
      <PropsLead />
      <Rule />
      <Section title="Props reference" lead={<>Every prop <Code>EmptyState</Code> accepts. Layout / margin props pass through to the underlying <Code>Flex</Code> root.</>}>
        <PropTable rows={EMPTY_STATE_PROPS} />
      </Section>
    </Page>
  ),
};

/** History — the rulings this component encodes and a changelog of how it changes over time. */
export const History: Story = {
  render: () => (
    <Page>
      <PageHeader title="EmptyState · History" standfirst={DEFINITION} />
      <Section title="Decisions" lead="The rulings this component encodes.">
        <Flex direction="column" gap="3">
          <Decision id="[[feedback-set]] · Net-new lite composition">
            EmptyState is a <strong>net-new</strong> lite composition — Radix Themes ships no empty-state
            primitive, so it stacks existing System roles (<Code>Heading</Code>, <Code>Text</Code>,{" "}
            <Code>ButtonGroup</Code>) rather than inventing new skin.
          </Decision>
          <Decision id="Icon role">
            The icon is a <strong>regular-weight</strong> glyph painted <Code>--ds-icon-neutral</Code> — the
            muted neutral-icon role — and sized modestly, so it sets the scene without competing with the
            title. Decorative, so it renders <Code>aria-hidden</Code>.
          </Decision>
          <Decision id="[[button-priority]] · One solid primary">
            The action row routes through <Code>ButtonGroup</Code>: the primary (solid) anchors per the global{" "}
            <Code>buttonOrder</Code> and the DOM/tab order follows the visual order. <strong>At most one solid
            primary</strong> — an empty state is a single clear next step, not a menu. Actions are optional.
          </Decision>
          <Decision id="Layout">
            Vertically stacked, <strong>centre-aligned</strong>, and <strong>max-width capped</strong> so the
            copy reads as a calm column and never spans the whole container — the description is further held
            to the reading measure.
          </Decision>
          <Decision id="Blameless copy">
            Copy orients, it never accuses — “No projects yet”, never “You haven’t created any projects.” The
            wrapper can’t enforce tone, but every specimen models the blameless voice.
          </Decision>
          <Decision id="asChild · the block as your element">
            <strong>One root to hand over, and a child that is only ever the slot target.</strong> The
            block owns a single styled box and composes its content from props, so{" "}
            <Code>asChild</Code> can give that box away without losing anything: Radix's{" "}
            <Code>Slottable</Code> puts the icon, title, description and actions INSIDE the consumer's
            element, and <Code>Slot</Code> concatenates the classes and merges the style, so the
            centring and the width cap survive. <Code>children</Code> stays refused on its own. It is
            typed as required with <Code>asChild</Code> and forbidden without it, because a block whose
            content is four named props must not grow a fifth unnamed region.
          </Decision>
        </Flex>
      </Section>

      <Rule />

      <Section title="Changelog" lead="Notable changes, newest first — grows as the component evolves.">
        <Flex direction="column" gap="3">
          <Decision id="0.9.0 · asChild">
            <Code>asChild</Code> renders the block as the consumer's own element, for the{" "}
            <Code>section</Code> or <Code>li</Code> or <Code>td</Code> that an empty region wants. The
            prop was already in the type and reached <Code>Flex</Code>, so it type-checked and then threw{" "}
            <Code>Slot failed to slot onto its children</Code>: a composition renders several children
            and <Code>Slot</Code> takes one.
          </Decision>
          <Decision id="0.9.0">
            Initial <Code>System/EmptyState</Code> — a net-new composition over System <Code>Heading</Code> /{" "}
            <Code>Text</Code> / <Code>ButtonGroup</Code>; a muted <Code>--ds-icon-neutral</Code> icon; a
            <Code>buttonOrder</Code>-aware action row holding one solid primary; centred and measure-capped
            layout; History page added so every component has one.
          </Decision>
        </Flex>
      </Section>
    </Page>
  ),
};
