import { type ReactNode } from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { Box, Code, Flex, Grid, Text } from "@radix-ui/themes";
import { AlertDialog } from "./AlertDialog";
import { Button } from "./Button";
import { ButtonGroup } from "./ButtonGroup";
import {
  Decision, DoDont, DODONT_LABEL, HexThemeKey, MeasuredRow, MeasuredSpec, Mono, NoteRow, Page, PageHeader,
  PropsLead, type PropDef, PropTable, Rule, Section,
} from "./_storyKit";
import { awaitMeasuredRows } from "../../foundations/_assert";
import { ComparisonSection, MESSAGING_COMPARISON } from "./_comparisons";

/* AlertDialog reuses Radix's own modal-panel skin (opaque surface + overlay), so its only System-owned
   paint is the destructive Action — the tone="danger" button.

   Both rows below are MEASURED: each names an element and a property, reads that property off a rendered
   destructive Action, and checks it against the token it claims — so a row can disagree with the
   component. The reused panel surface stays a note: it is a structural fact about which skin the wrap
   inherits, not a colour claim of its own. */

function DangerActionSpec() {
  return (
    <Box style={{ borderRadius: "var(--ds-radius-4)", border: "1px solid var(--ds-stroke-weak)", overflow: "hidden", background: "var(--ds-bg-subtle)" }}>
      <Flex align="center" gap="3" style={{ padding: "20px" }}>
        <Box style={{ flexShrink: 0 }}><Button priority="primary" tone="danger">Delete project</Button></Box>
        <Text size="1" style={{ color: "var(--ds-text-weak)" }}>
          The confirm Action paints from the accent-aware <Mono>--ds-fill-error</Mono> family, so it tracks
          the brand collision shift rather than a fixed red. Both rows are read off a rendered destructive
          Action, so they report what the button paints rather than what the tokens say. The dialog surface
          itself reuses Radix's solid modal skin.
        </Text>
      </Flex>
      <MeasuredSpec render={() => <Button priority="primary" tone="danger">Delete project</Button>}>
        <MeasuredRow
          part="Action fill (solid danger)"
          note="The one solid, destructive confirm."
          token="--ds-fill-error"
          select='.rt-BaseButton[data-tone="danger"]'
          prop="background-color"
        />
        <MeasuredRow
          part="Action text"
          token="--on-error"
          select='.rt-BaseButton[data-tone="danger"]'
          prop="color"
        />
      </MeasuredSpec>
      <NoteRow part="Dialog surface" value="Radix solid modal panel + overlay (reused skin) — opaque" />
    </Box>
  );
}

const PROPS: PropDef[] = [
  { name: "AlertDialog.Content — size", type: `"1" | "2" | "3" | "4"`, desc: <>Radix Content size. Unset, it follows the global <Code>uiSize</Code> control lane (default <Code>small</Code> → <Code>1</Code>).</>, source: "AlertDialog.tsx" },
  { name: "Root / Trigger / Action / Cancel", type: "compound parts", desc: <>Pass through to Radix. Trigger/Action/Cancel compose a child via <Code>asChild</Code>, so a System <Code>Button</Code> drops straight in.</>, source: "Radix" },
];

/** The one definition of this component — the standfirst every page of it opens with. */
const DEFINITION = <>A modal confirmation for a consequential action.</>;

const meta: Meta<typeof AlertDialog.Root> = {
  title: "Components/Modals & Popovers/AlertDialog",
  component: AlertDialog.Root,
  parameters: {
    controls: { disable: true },
    docs: {
      description: {
        component:
          "**AlertDialog** is a modal confirmation for a consequential, usually destructive action. " +
          "It wraps Radix's compound AlertDialog with an opaque, elevated Content on the uiSize control " +
          "lane. It is the System home for the `tone=\"danger\"` confirm: Cancel is `priority=\"secondary\"`, " +
          "the destructive Action is `<Button priority=\"primary\" tone=\"danger\">` (the both-solid model).",
      },
    },
  },
};
export default meta;
type Story = StoryObj<typeof AlertDialog.Root>;

/** The confirm specimen reused by the Usage story + the play. */
function ConfirmDemo() {
  return (
    <AlertDialog.Root>
      <AlertDialog.Trigger>
        <Button priority="secondary">Delete project…</Button>
      </AlertDialog.Trigger>
      <AlertDialog.Content maxWidth="440px">
        <AlertDialog.Title>Delete project?</AlertDialog.Title>
        <AlertDialog.Description size="2">
          This permanently deletes <strong>Orbit</strong> and its 84 files. This can’t be undone.
        </AlertDialog.Description>
        {/* ButtonGroup anchors the primary (the danger Action) per the system buttonOrder — respects
            the Btn-order toolbar / Provider. It sees the primary through AlertDialog.Action. */}
        <ButtonGroup mt="4">
          <AlertDialog.Cancel>
            <Button priority="secondary">Cancel</Button>
          </AlertDialog.Cancel>
          <AlertDialog.Action>
            <Button priority="primary" tone="danger">Delete project</Button>
          </AlertDialog.Action>
        </ButtonGroup>
      </AlertDialog.Content>
    </AlertDialog.Root>
  );
}

/** Usage — the confirm specimen, the live token spec, and one do/don't. */
export const Usage: Story = {
  // Scoped exceptions on this docs story only (Props keeps full axe); the rest of the page IS
  // checked. The DO/DON'T word alone — not the whole card, which is what "[data-dodont]" used to do,
  // so the card specimens are now covered — plus the solid danger "Delete project" button. It entered
  // at white on the red-9 fill #e5484d, 3.91 in both appearances, under the retired 3:1 floor for text
  // on a solid fill. [[text-on-solid-fill-contrast]] replaced that floor with 4.5:1 and APCA Lc 60 and
  // moved the danger fill to --error-solid, and no current ruling excuses this button.
  parameters: { a11y: { context: { exclude: [DODONT_LABEL, ".rt-Button[data-tone='danger']"] } } },
  render: (_args, { globals }) => (
    <HexThemeKey.Provider value={`${globals.accent}-${globals.appearance}-${globals.contrast}`}>
      <Page>
        <PageHeader
          title="AlertDialog · Usage"
          standfirst={<>{DEFINITION} Click the trigger to open the destructive confirm — <Kbd>Esc</Kbd> or Cancel dismisses.</>}
        />
        <Section title="Specimen" lead="The canonical destructive confirm — an in-context danger trigger opening a both-solid confirm.">
          <ConfirmDemo />
        </Section>
        <Rule />
        <ComparisonSection comparison={MESSAGING_COMPARISON} highlight="AlertDialog" />
        <Rule />
        <Section title="Name the action and its object" lead="A destructive confirm names the action and its object, and pairs a calm Cancel with a solid-danger Action.">
          <Grid columns={{ initial: "1", sm: "2" }} gap="3">
            <DoDont kind="do" bare note="Verb + object label, Cancel secondary, Action solid-danger — the reader knows exactly what will happen. Ordered by the system buttonOrder (ButtonGroup).">
              <ButtonGroup>
                <Button priority="secondary">Cancel</Button>
                <Button priority="primary" tone="danger">Delete project</Button>
              </ButtonGroup>
            </DoDont>
            <DoDont kind="dont" bare note="“OK / Cancel” hides the stakes, and a plain accent primary doesn't read as destructive.">
              <ButtonGroup>
                <Button priority="secondary">Cancel</Button>
                <Button priority="primary">OK</Button>
              </ButtonGroup>
            </DoDont>
          </Grid>
        </Section>
        <Rule />
        <Section title="Tokens" lead="Each row is measured off a rendered destructive Action and checked against the token it names, so the table reports what the button paints. The dialog surface reuses Radix's modal skin; the System-owned paint is the Action.">
          <DangerActionSpec />
        </Section>
      </Page>
    </HexThemeKey.Provider>
  ),
  // The only play here is PASSIVE: viewing this story must not open/close the modal (the flicker). The
  // confirm behavior (open · focus · danger-fill hex · buttonOrder · Escape) lives in _internal/AlertDialog.
  play: async ({ canvasElement }) => {
    // The token table's EVIDENCE, asserted at runtime — each row read a REAL rendered Action, not a probe.
    // `awaitMeasuredRows` blocks until every row has recorded its evidence (a row whose element
    // mounts late retries for up to 60 frames before it reports), then runs the identical assertions.
    const rows = await awaitMeasuredRows(canvasElement);
    if (rows.measured !== 2 || rows.unproven !== 0) {
      throw new Error(`expected 2 measured / 0 unproven token rows, got ${rows.measured} / ${rows.unproven}`);
    }
  },
};

type PropsArgs = { size: "auto" | "1" | "2" | "3" | "4"; actionLabel: string };

/** Props — drive the Content size and the action label; full axe. */
export const Props: StoryObj<PropsArgs> = {
  // "auto" (size unset) is the default so the dialog tracks the global uiSize toolbar out of the box.
  args: { size: "auto", actionLabel: "Delete project" },
  argTypes: {
    size: { control: "inline-radio", options: ["auto", "1", "2", "3", "4"], description: '"auto" tracks the global uiSize toolbar (unset); a step pins the Content size.', table: { category: "Variant" } },
    actionLabel: { control: "text", description: "The destructive Action label — verb + object.", table: { category: "Content" } },
  },
  parameters: { controls: { disable: false } },
  render: ({ size, actionLabel }: PropsArgs) => (
    <Page maxWidth="none">
      <PageHeader title="AlertDialog · Props" standfirst={DEFINITION} />
      <Box style={{ padding: "8px 0 2px" }}>
        <AlertDialog.Root>
          <AlertDialog.Trigger>
            <Button priority="secondary">{actionLabel}…</Button>
          </AlertDialog.Trigger>
          <AlertDialog.Content size={size === "auto" ? undefined : size} maxWidth="440px">
            <AlertDialog.Title>{actionLabel}?</AlertDialog.Title>
            <AlertDialog.Description size="2">This action can’t be undone.</AlertDialog.Description>
            <ButtonGroup mt="4">
              <AlertDialog.Cancel><Button priority="secondary">Cancel</Button></AlertDialog.Cancel>
              <AlertDialog.Action><Button priority="primary" tone="danger">{actionLabel}</Button></AlertDialog.Action>
            </ButtonGroup>
          </AlertDialog.Content>
        </AlertDialog.Root>
      </Box>
      <PropsLead />
      <Rule />
      <Section title="Props reference" lead={<>Every prop <Code>AlertDialog</Code> adds or forwards.</>}>
        <PropTable rows={PROPS} />
      </Section>
    </Page>
  ),
};

// A tiny inline Kbd for the standfirst (the shared kit Kbd is for key tables).
function Kbd({ children }: { children: ReactNode }) {
  return <Code variant="soft">{children}</Code>;
}

/** History — the rulings this component encodes. */
export const History: Story = {
  render: () => (
    <Page>
      <PageHeader title="AlertDialog · History" standfirst={DEFINITION} />
      <Section title="Decisions" lead="The rulings this component encodes.">
        <Flex direction="column" gap="3">
          <Decision id="[[catalog-as-specification]] · Wrapped Radix component">A wrapped Radix Themes component — the Radix name wins; built on the Radix substrate + our <Code>--ds-*</Code> layer, not a from-scratch modal.</Decision>
          <Decision id="[[button-priority]] · Both-solid destructive confirm">The canonical destructive confirm: Cancel = <Code>priority="secondary"</Code>, Action = <Code>{`<Button priority="primary" tone="danger">`}</Code> — the both-solid model. A danger solid doesn't spend the one-solid-primary budget. Destructive copy is verb+object (“Delete project”), never “OK”.</Decision>
          <Decision id="[[floating-surface-fill]] · Opaque modal panel">Content is an opaque, elevated modal panel (Radix's solid dialog skin) — no translucent variant is exposed.</Decision>
          <Decision id="uiSize · R10 · Global control lane">Content <Code>size</Code> follows the global control lane (our small default) unless set.</Decision>
        </Flex>
      </Section>
      <Rule />
      <Section title="Changelog" lead="Newest first.">
        <Decision id="0.9.0">Initial <Code>System/AlertDialog</Code> — the first <Code>tone="danger"</Code> consumer of the wrap line; lite spine.</Decision>
      </Section>
    </Page>
  ),
};
