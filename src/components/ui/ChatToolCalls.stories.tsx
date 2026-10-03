import { useLayoutEffect, useRef, useState } from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { Box, Code, Flex, Grid, Text } from "@radix-ui/themes";
import { ChatToolCalls, type ChatToolCallItem, type ChatToolCallStatus } from "./ChatToolCalls";
import {
  AnatomyLegend, Caption, Decision, DoDont, DODONT_LABEL, dotStyle, HexThemeKey, hLine, MeasuredRow, MeasuredSpec,
  Mono, Page, PageHeader, PropsLead, type PropDef, PropTable, Rule, Scenario, Section, tick,
} from "./_storyKit";
import { awaitMeasuredRows } from "../../foundations/_assert";

/** The one definition of this component — the standfirst every page of it opens with. */
const DEFINITION = (
  <>
    What an assistant actually did during a turn: one row per tool call, with the state, the target, and how
    long it took. A single call renders as a bare row; from the second on, the list folds behind one summary
    line showing the latest call, closed by default, so a long turn never buries the answer under its own
    working. It belongs inside an assistant message.
  </>
);

/* ChatToolCalls documents an ACTIVITY LOG, so every specimen below is a plausible slice of a real
   assistant turn working on this system — read the tokens, measure the contrast, write the theme —
   rather than foo/bar. The one deliberately broken specimen is the DON'T, and it is broken in the way
   the API actually lets you break it (a failed call shipped without a status). */

/* ---- fixtures ------------------------------------------------------------- */

const DIFF_SAMPLE = `- --ds-fill-accent: var(--accent-9);
+ --ds-fill-accent: var(--accent-9);
+ --ds-fill-accent-hover: var(--accent-10);`;

/** A completed edit with every optional field filled — the row the anatomy diagram pins. */
const ANATOMY_CALL: ChatToolCallItem = {
  name: "edit_file",
  status: "complete",
  node: "local",
  target: "src/tokens/semantic.css",
  additions: 12,
  deletions: 3,
  duration: "340ms",
  resultDetail: (
    <pre style={{ margin: 0, whiteSpace: "pre-wrap", fontFamily: "var(--code-font-family)", fontSize: 12, lineHeight: 1.6 }}>
      {DIFF_SAMPLE}
    </pre>
  ),
};

const ANATOMY_GROUP: ChatToolCallItem[] = [
  { name: "read_tokens", target: "src/tokens/semantic.css", duration: "88ms" },
  { name: "measure_contrast", target: "--ds-text-weak on --ds-fill-accent-weak", duration: "1.1s" },
  { name: "apply_accent", status: "running", target: "teal" },
];

/** The measurement fixture: one instance carrying all four states, a diff pair, a failure reason
    and an expandable row, so every row below reads off a REAL rendered part. */
const SPEC_CALLS: ChatToolCallItem[] = [
  {
    name: "edit_file",
    status: "complete",
    node: "local",
    target: "src/tokens/semantic.css",
    additions: 12,
    deletions: 3,
    duration: "340ms",
    resultDetail: <Text size="1">3 lines changed.</Text>,
  },
  { name: "measure_contrast", status: "running", target: "--ds-text-weak" },
  { name: "apply_accent", status: "pending", target: "teal" },
  {
    name: "write_theme",
    status: "error",
    target: "src/tokens/theme.css",
    errorMessage: "Permission denied — the file is read-only in this sandbox.",
  },
];

/* ---- anatomy diagram ------------------------------------------------------
   The parts of a tool-call row sit SIDE BY SIDE, so the callouts hang above the
   row on two tiers and drop a tick onto the part they name. Positions are
   MEASURED off the live specimen rather than hard-coded: the row is real, its
   widths are content-driven, and the text lane moves them the moment the size
   toolbar changes. The group summary gets a left-gutter leader instead, because
   it is a whole row rather than a part of one. */

const PIN_BAND = 76;
const ROW_W = 560;
const GUTTER = 76;

/** [callout number, CSS selector inside the row specimen] */
const ROW_PINS: [number, string][] = [
  [1, ".rt-ds-chat-toolcalls-status"],
  [2, ".rt-ds-chat-toolcalls-name"],
  [3, ".rt-ds-chat-toolcalls-node"],
  [4, ".rt-ds-chat-toolcalls-target"],
  [5, ".rt-ds-chat-toolcalls-stats"],
  [6, ".rt-ds-chat-toolcalls-duration"],
  [7, ".rt-ds-chat-toolcalls-caret"],
];

function AnatomyDiagram() {
  const frame = useRef<HTMLDivElement>(null);
  const rowBox = useRef<HTMLDivElement>(null);
  const [pins, setPins] = useState<Record<number, number>>({});

  useLayoutEffect(() => {
    const f = frame.current;
    const r = rowBox.current;
    if (!f || !r) return;
    const measure = () => {
      const left = f.getBoundingClientRect().left;
      const next: Record<number, number> = {};
      for (const [n, sel] of ROW_PINS) {
        const el = r.querySelector<HTMLElement>(sel);
        if (!el) continue;
        const box = el.getBoundingClientRect();
        next[n] = Math.round(box.left + box.width / 2 - left);
      }
      setPins(next);
    };
    measure();
    let raf = 0;
    const ro = new ResizeObserver(() => { cancelAnimationFrame(raf); raf = requestAnimationFrame(measure); });
    ro.observe(f);
    return () => { cancelAnimationFrame(raf); ro.disconnect(); };
  }, []);

  return (
    <Box style={{ overflowX: "auto" }}>
      <Box ref={frame} style={{ position: "relative", width: ROW_W + GUTTER, paddingTop: PIN_BAND, paddingLeft: GUTTER }}>
        {/* The pinned row: one completed edit with every optional field present. */}
        <Box ref={rowBox} style={{ width: ROW_W }}>
          <ChatToolCalls calls={[ANATOMY_CALL]} />
        </Box>

        {ROW_PINS.map(([n], i) => {
          const x = pins[n];
          if (x == null) return null;
          const top = i % 2 === 0 ? 4 : 38;
          return (
            <Box key={n}>
              <Box style={{ ...dotStyle, left: x - 10, top }}>{n}</Box>
              <Box style={tick({ left: x, top: top + 20, height: PIN_BAND - top - 20 })} />
            </Box>
          );
        })}

        {/* The group summary — a whole row, so it takes a gutter leader rather than a tick. */}
        <Box mt="4" style={{ width: ROW_W }}>
          <ChatToolCalls calls={ANATOMY_GROUP} />
        </Box>
        <Box style={{ ...dotStyle, left: 0, top: PIN_BAND + 52 }}>8</Box>
        <Box style={hLine({ left: 22, top: PIN_BAND + 62, width: GUTTER - 22 })} />
      </Box>
    </Box>
  );
}

const ANATOMY_PARTS: [number, string, string][] = [
  [1, "Status indicator", "the state of this call, told by SHAPE first — a clock, a spinner, a check, a cross — with the role colour as the second signal. Queued also shows its word, because a lone clock reads as a duration rather than as “not started yet”."],
  [2, "Tool name", "what ran, set in monospace. The subject of the row, so it takes the strong text role and shrinks last."],
  [3, "Node chip", "optional — the sandbox or environment the call ran in. A display chip, never a control."],
  [4, "Target", "optional — what the tool acted on: a file path, a shell command, a search query. The longest and the most inferable part, so it is the first thing to give up width."],
  [5, "Diff stats", "optional — lines added and removed, plus any free-form trailing metadata. Never shrinks."],
  [6, "Duration", "optional — how long the call took, shown once it completes. Tabular figures, so a slow call is visible as a shape down the column."],
  [7, "Result disclosure", "present only when the call carries a result. The whole row becomes one real button: activating it reveals the output underneath."],
  [8, "Group summary", "from the second call on, the list folds behind one line showing the LATEST call — its state and its name — plus how many there are in total. Closed by default."],
];

/* ---- token spec ----------------------------------------------------------- */

function ToolCallsSpec() {
  return (
    <MeasuredSpec render={() => <ChatToolCalls calls={SPEC_CALLS} defaultOpen />}>
      <MeasuredRow
        part="Tool name"
        note="The subject of the row — the strong text role, the same one an Item label takes."
        token="--ds-text-strong"
        select=".rt-ds-chat-toolcalls-name"
        prop="color"
      />
      <MeasuredRow
        part="Target"
        note="Supporting detail beside the name, carried by colour rather than by a smaller step."
        token="--ds-text-weak"
        select=".rt-ds-chat-toolcalls-target"
        prop="color"
      />
      <MeasuredRow
        part="Trailing rail"
        note="The stats + duration column at the end of the row."
        token="--ds-text-weak"
        select=".rt-ds-chat-toolcalls-meta"
        prop="color"
      />
      <MeasuredRow
        part="Queued glyph"
        note="The clock, and the word beside it."
        token="--ds-icon-neutral"
        select='.rt-ds-chat-toolcalls-status[data-status="pending"]'
        prop="color"
      />
      <MeasuredRow
        part="Running glyph"
        note="The spinner inks from currentColor, so this role is what it takes."
        token="--ds-icon-interactive"
        select='.rt-ds-chat-toolcalls-status[data-status="running"]'
        prop="color"
      />
      <MeasuredRow
        part="Complete glyph"
        note="The check on a finished call."
        token="--ds-icon-success"
        select='.rt-ds-chat-toolcalls-status[data-status="complete"]'
        prop="color"
      />
      <MeasuredRow
        part="Failed glyph"
        note="The cross on a call that did not finish."
        token="--ds-icon-error"
        select='.rt-ds-chat-toolcalls-status[data-status="error"]'
        prop="color"
      />
      <MeasuredRow
        part="Failure reason"
        note="The visible sentence under a failed row."
        token="--ds-text-error"
        select=".rt-ds-chat-toolcalls-error"
        prop="color"
      />
      <MeasuredRow
        part="Lines added"
        note="The + count on an edit. Its counterpart takes the error role."
        token="--ds-text-success"
        select=".rt-ds-chat-toolcalls-additions"
        prop="color"
      />
      <MeasuredRow
        part="Row hover fill"
        state="hover"
        note="Only a row that can be opened tints — the tint IS the affordance."
        token="--ds-fill-hover"
        select=".rt-ds-chat-toolcalls-toggle"
        prop="background-color"
      />
      <MeasuredRow
        part="Focus ring"
        state="focus-visible"
        note="The accent base of the one ring every control shares. A Radix alpha, --ds-stroke-focus-stack, sits on top of it, 2px wide ([[focus-ring]])."
        token="--ds-stroke-focus"
        select=".rt-ds-chat-toolcalls-toggle"
        prop="outline-color"
      />
    </MeasuredSpec>
  );
}
const SPEC_ROWS = 11;

/* ---- specimens ------------------------------------------------------------ */

/** A turn's worth of work: three calls, one of which failed. */
const TURN: ChatToolCallItem[] = [
  { name: "read_tokens", target: "src/tokens/semantic.css", duration: "88ms", node: "local" },
  { name: "measure_contrast", target: "--ds-text-weak on the tinted bubble", duration: "1.1s" },
  {
    name: "write_theme",
    status: "error",
    target: "src/tokens/theme.css",
    errorMessage: "Permission denied — the file is read-only in this sandbox.",
  },
];

const NARROW: ChatToolCallItem[] = [
  {
    name: "search_symbols",
    target: "src/components/ui/ChatToolCalls.stories.tsx",
    duration: "240ms",
  },
];

const PROPS: PropDef[] = [
  { name: "calls", type: "ChatToolCallItem[]", desc: <>The calls to display, oldest last. One call renders as a bare row; two or more fold behind a summary. An <strong>empty array renders nothing at all</strong> — an empty shell would claim a turn used tools when it did not.</>, source: "ChatToolCalls.tsx" },
  { name: "open", type: "boolean", desc: <>Controlled disclosure state for the group summary. Pair it with <Code>onOpenChange</Code>. Ignored when there is only one call, which has no summary.</>, source: "Collapsible" },
  { name: "defaultOpen", type: "boolean", def: "false", desc: <>Uncontrolled initial disclosure state. <strong>Closed by default</strong> — a long turn should not bury its own answer.</>, source: "Collapsible" },
  { name: "onOpenChange", type: "(open: boolean) => void", desc: <>Fired when the group summary opens or closes.</>, source: "Collapsible" },
  { name: "className", type: "string", desc: <>Merged onto the root element.</>, source: "ChatToolCalls.tsx" },
  { name: "style", type: "CSSProperties", desc: <>Inline styles on the root element.</>, source: "ChatToolCalls.tsx" },
];

const ITEM_PROPS: PropDef[] = [
  { name: "name", type: "string", desc: <>The tool or function that ran, set in monospace. Required.</>, source: "ChatToolCallItem" },
  { name: "status", type: `"pending" | "running" | "complete" | "error"`, def: `"complete"`, desc: <>Execution state. Always set it: the default reads as finished, which is wrong for anything queued, in flight, or failed.</>, source: "ChatToolCallItem" },
  { name: "target", type: "string", desc: <>What the tool acted on — a file path, a command, a query. Include it on every call; a name alone rarely says enough.</>, source: "ChatToolCallItem" },
  { name: "duration", type: "string", desc: <>Elapsed time, already formatted (<Code>"1.2s"</Code>, <Code>"340ms"</Code>). Shown once the call completes.</>, source: "ChatToolCallItem" },
  { name: "node", type: "string", desc: <>Sandbox or environment the call ran in, shown as a chip.</>, source: "ChatToolCallItem" },
  { name: "additions", type: "number", desc: <>Lines added by an edit, shown with a leading <Code>+</Code> in the success role.</>, source: "ChatToolCallItem" },
  { name: "deletions", type: "number", desc: <>Lines removed by an edit, shown with a leading <Code>-</Code> in the error role.</>, source: "ChatToolCallItem" },
  { name: "stats", type: "ReactNode", desc: <>Any further trailing metadata, beside the diff counts.</>, source: "ChatToolCallItem" },
  { name: "errorMessage", type: "string", desc: <>Why the call failed. Rendered as <strong>visible text</strong> under the row when the status is <Code>error</Code> — never hidden in a tooltip.</>, source: "ChatToolCallItem" },
  { name: "resultDetail", type: "ReactNode", desc: <>Output to reveal under the row — a diff, a transcript, a JSON result. Its presence is what turns the row into a real button.</>, source: "ChatToolCallItem" },
  { name: "key", type: "string", desc: <>Stable React key. Derived from the row's own metadata when omitted; set it explicitly while a turn is streaming so finished rows are not re-mounted.</>, source: "ChatToolCallItem" },
];

const meta: Meta<typeof ChatToolCalls> = {
  title: "Components/Chat/ChatToolCalls",
  component: ChatToolCalls,
  parameters: {
    controls: { disable: true },
    docs: {
      description: {
        component:
          "**ChatToolCalls** shows what an assistant actually DID during a turn — one row per tool " +
          "invocation, with the state, the target, and how long it took. A single call renders as a bare " +
          "row; from the second call on the list folds behind one summary line showing the latest call, " +
          "closed by default, so a long turn never buries the answer underneath its own working. " +
          "It belongs inside an assistant message, not as standalone page furniture.",
      },
    },
  },
};
export default meta;
type Story = StoryObj<typeof ChatToolCalls>;

/** Anatomy — the labelled parts and the four states. The token spec closes Usage. */
export const Anatomy: Story = {
  render: () => (
    <Page maxWidth={900}>
      <PageHeader title="ChatToolCalls · Anatomy" standfirst={DEFINITION} />
      <Section
        title="The parts"
        lead="A tool call is one dense line: what state it is in, what ran, what it ran against, and what it cost. Everything except the state and the name is optional, but the ORDER is fixed, so a column of calls stays scannable. The numbered callouts are pinned onto a live row; the legend spells each one out."
      >
        <AnatomyDiagram />
        <AnatomyLegend parts={ANATOMY_PARTS} />
        <Caption>
          The row is a <strong>record</strong>, not a control panel: it says what happened. The only
          thing it lets you do is unfold a result you asked to see.
        </Caption>
      </Section>

      <Rule />

      <Section
        title="The four states"
        lead="Each state is told apart by SHAPE before colour, so the log survives a greyscale print, a colour-vision difference, and a dark theme. Queued carries its word because a clock on its own reads as a duration."
      >
        <Grid columns={{ initial: "1", sm: "2" }} gap="4">
          <Scenario label="QUEUED" caption={<>Accepted but not started. The clock plus the word — never the glyph alone.</>}>
            <ChatToolCalls calls={[{ name: "apply_accent", status: "pending", target: "teal" }]} />
          </Scenario>
          <Scenario label="RUNNING" caption={<>In flight. The spinner is the only moving thing in the row, so it reads as activity.</>}>
            <ChatToolCalls calls={[{ name: "measure_contrast", status: "running", target: "--ds-text-weak" }]} />
          </Scenario>
          <Scenario label="COMPLETE" caption={<>Finished. Only a completed call shows a duration — a time on a running row would be a half-truth.</>}>
            <ChatToolCalls calls={[{ name: "read_tokens", target: "src/tokens/semantic.css", duration: "88ms" }]} />
          </Scenario>
          <Scenario label="FAILED" caption={<>Did not finish, and says why on the next line rather than in a tooltip.</>}>
            <ChatToolCalls
              calls={[{
                name: "write_theme",
                status: "error",
                target: "src/tokens/theme.css",
                errorMessage: "Permission denied — the file is read-only in this sandbox.",
              }]}
            />
          </Scenario>
        </Grid>
      </Section>
    </Page>
  ),
};

/** Usage — where the log belongs, how it behaves under pressure, the one way it is commonly wrong,
 *  and the live token spec that closes the page. */
export const Usage: Story = {
  parameters: { a11y: { context: { exclude: [DODONT_LABEL] } } },
  render: (_args, { globals }) => (
    <Page maxWidth={900}>
      <PageHeader title="ChatToolCalls · Usage" standfirst={DEFINITION} />
      <Section
        title="Inside an assistant turn"
        lead="The log sits above the answer, inside the assistant's own message — it is the working, not a separate panel. Collapsed, it is one line; the reader opens it only if the answer prompts a question."
      >
        <Box style={{ maxWidth: 560 }}>
          <ChatToolCalls calls={TURN} />
          <Text as="p" size="2" mt="3" style={{ color: "var(--ds-text-strong)", lineHeight: 1.6 }}>
            I read the current token file and measured the metadata role against the tinted bubble — its
            worst accent clears the floor at 4.73. I could not write the theme file, so the accent change
            is not applied yet.
          </Text>
        </Box>
        <Caption>
          The failed call is <strong>visible from the collapsed state</strong>, because the summary shows
          the latest call. A reader never has to open the log to discover something went wrong.
        </Caption>
      </Section>

      <Rule />

      <Section
        title="Open, when the reader asks for it"
        lead="Expanded, every call gets its own row with its full metadata. A row that carries a result becomes a button; the rest are inert text."
      >
        <Box style={{ maxWidth: 560 }}>
          <ChatToolCalls defaultOpen calls={SPEC_CALLS} />
        </Box>
        <Caption>
          The first row here carries a <Code>resultDetail</Code>: it tints on hover, takes the focus ring,
          and unfolds its output underneath when activated.
        </Caption>
      </Section>

      <Rule />

      <Section
        title="Under width pressure"
        lead="A chat column is narrow, and a file path is long. When the row runs out of room the target gives up width first, the tool name holds on to at least four characters, and the duration does not move — the two things a reader scans for stay legible at any width."
      >
        <Flex direction="column" gap="4">
          <Scenario label="ROOMY · 560px" caption="Everything fits: name, path and duration all read in full.">
            <Box style={{ width: 560, maxWidth: "100%" }}>
              <ChatToolCalls calls={NARROW} />
            </Box>
          </Scenario>
          <Scenario label="TIGHT · 220px" caption="The path collapses almost to nothing, the name keeps most of its characters, and the duration is untouched — the two things worth scanning survive.">
            <Box style={{ width: 220, maxWidth: "100%" }}>
              <ChatToolCalls calls={NARROW} />
            </Box>
          </Scenario>
        </Flex>
      </Section>

      <Rule />

      <Section
        title="Always set the status"
        lead="This is the mistake the API makes easy: status defaults to complete, so a call that failed — or one still in flight — renders with a check beside it and a duration that never happened. The reader is told the work succeeded."
      >
        <Grid columns={{ initial: "1", sm: "2" }} gap="3">
          <DoDont kind="do" bare note="The failure carries its state and its reason, so the reader can see what to do next.">
            <Box style={{ width: "100%" }}>
              <ChatToolCalls
                calls={[{
                  name: "write_theme",
                  status: "error",
                  target: "src/tokens/theme.css",
                  errorMessage: "Permission denied — the file is read-only in this sandbox.",
                }]}
              />
            </Box>
          </DoDont>
          <DoDont kind="dont" bare note="The same failed call with the status left off. It renders as finished, and the log lies.">
            <Box style={{ width: "100%" }}>
              <ChatToolCalls calls={[{ name: "write_theme", target: "src/tokens/theme.css", duration: "12ms" }]} />
            </Box>
          </DoDont>
        </Grid>
        <Caption>
          Two more habits worth keeping: give every call a <Code>target</Code> (a bare tool name rarely
          says enough), and set an explicit <Code>key</Code> while a turn is streaming so finished rows are
          not re-mounted as new ones arrive.
        </Caption>
      </Section>

      <Rule />

      {/* The closing reference section. The provider is what makes the table live: every measured row
          re-reads its value when this key changes, so an accent/appearance flip re-resolves the spec. */}
      <HexThemeKey.Provider value={`${globals.accent}-${globals.appearance}-${globals.contrast}`}>
        <Section
          title="Tokens"
          lead="Every row below is read off a rendered instance carrying all four states and checked against the token it names, so the table reports what the component paints rather than what the tokens say. Zero net-new tokens: the states reuse the icon roles, the text reuses the text roles, and the hover and focus paints are the ones every row-shaped control in the system shares."
        >
          <ToolCallsSpec />
          <Caption>
            The four state colours are the semantic <Mono>--ds-icon-*</Mono> roles, so they follow a brand
            accent's collision shift instead of pinning a fixed green and red.
          </Caption>
        </Section>
      </HexThemeKey.Provider>
    </Page>
  ),
  play: async ({ canvasElement }) => {
    // The token table's EVIDENCE, asserted at runtime — each row read a REAL rendered part of a real
    // instance (the four state glyphs, the failure sentence, the hover and focus paints), never a probe
    // this story painted. `rows: N` is the exact form: the instance mounts a collapsible body, so an
    // "at least one row" floor could be satisfied by a table that had not filled in yet.
    const rows = await awaitMeasuredRows(canvasElement, { rows: SPEC_ROWS });
    if (rows.measured !== SPEC_ROWS || rows.unproven !== 0) {
      throw new Error(`expected ${SPEC_ROWS} measured / 0 unproven token rows, got ${rows.measured} / ${rows.unproven}`);
    }
  },
};

/* ---- Props ----------------------------------------------------------- */

type PropsArgs = {
  count: number;
  status: ChatToolCallStatus;
  disclosure: "uncontrolled" | "open" | "closed";
  defaultOpen: boolean;
  target: string;
  node: string;
  duration: string;
  additions: number;
  deletions: number;
  errorMessage: string;
  resultDetail: boolean;
};

const NAMES = ["read_tokens", "measure_contrast", "apply_accent", "write_theme", "run_tests"];

/** Props — the live, args-driven log. Every capability is a control. */
export const Props: StoryObj<PropsArgs> = {
  args: {
    count: 3,
    status: "error",
    disclosure: "uncontrolled",
    defaultOpen: false,
    target: "src/tokens/theme.css",
    node: "local",
    duration: "340ms",
    additions: 12,
    deletions: 3,
    errorMessage: "Permission denied — the file is read-only in this sandbox.",
    resultDetail: true,
  },
  argTypes: {
    count: { control: { type: "range", min: 0, max: 5, step: 1 }, description: "How many calls to render. 0 renders nothing at all; 1 renders a bare row with no group chrome.", table: { category: "Data" } },
    status: { control: "inline-radio", options: ["pending", "running", "complete", "error"], description: "The state of the LAST call — the one the collapsed summary shows.", table: { category: "Data" } },
    target: { control: "text", description: "What the last call acted on. Empty hides the target.", table: { category: "Data" } },
    node: { control: "text", description: "Sandbox chip on the last call. Empty hides the chip.", table: { category: "Data" } },
    duration: { control: "text", description: "Elapsed time on the last call. Only shown when its status is complete.", table: { category: "Data" } },
    additions: { control: { type: "number" }, description: "Lines added by the last call. Negative hides the count.", table: { category: "Data" } },
    deletions: { control: { type: "number" }, description: "Lines removed by the last call. Negative hides the count.", table: { category: "Data" } },
    errorMessage: { control: "text", description: "Why the last call failed. Rendered as visible text when its status is error.", table: { category: "Data" } },
    resultDetail: { control: "boolean", description: "Give the last call a result to unfold. The row becomes a real button when it has one.", table: { category: "Data" } },
    disclosure: { control: "inline-radio", options: ["uncontrolled", "open", "closed"], description: "Drive the group from outside (open) or leave it to manage itself (uncontrolled).", table: { category: "Disclosure" } },
    defaultOpen: { control: "boolean", description: "Initial state while uncontrolled. False is the default.", table: { category: "Disclosure" } },
  },
  parameters: { controls: { disable: false } },
  render: (args: PropsArgs) => {
    const { count, status, disclosure, defaultOpen, target, node, duration, additions, deletions, errorMessage, resultDetail } = args;
    const calls: ChatToolCallItem[] = Array.from({ length: Math.max(0, count) }, (_, i) => {
      const last = i === Math.max(0, count) - 1;
      if (!last) {
        return { name: NAMES[i % NAMES.length], target: "src/tokens/semantic.css", duration: "88ms" };
      }
      return {
        name: NAMES[i % NAMES.length],
        status,
        target: target || undefined,
        node: node || undefined,
        duration: duration || undefined,
        additions: additions >= 0 ? additions : undefined,
        deletions: deletions >= 0 ? deletions : undefined,
        errorMessage: errorMessage || undefined,
        resultDetail: resultDetail ? <Text size="1">The tool's output would render here.</Text> : undefined,
      };
    });
    return (
      <Page maxWidth="none">
        <PageHeader title="ChatToolCalls · Props" standfirst={DEFINITION} />
        <Box style={{ padding: "16px 0 8px", maxWidth: 560 }}>
          <ChatToolCalls
            calls={calls}
            defaultOpen={defaultOpen}
            open={disclosure === "uncontrolled" ? undefined : disclosure === "open"}
          />
        </Box>
        <PropsLead />
        <Rule />
        <Section title="Props reference" lead={<>Every prop <Code>ChatToolCalls</Code> accepts. The disclosure props pass straight through to <Code>Collapsible</Code>, so a group behaves exactly like every other disclosure in the system.</>}>
          <PropTable rows={PROPS} />
        </Section>
        <Section title="Call fields" lead={<>The shape of one entry in <Code>calls</Code>. Only <Code>name</Code> is required, but <Code>status</Code> and <Code>target</Code> should be treated as required in practice.</>}>
          <PropTable rows={ITEM_PROPS} />
        </Section>
      </Page>
    );
  },
};

/** History — the rulings this component encodes and a changelog of how it changes over time. */
export const History: Story = {
  render: () => (
    <Page>
      <PageHeader title="ChatToolCalls · History" standfirst={DEFINITION} />
      <Section title="Decisions" lead="The rulings this component encodes.">
        <Flex direction="column" gap="3">
          <Decision id="[[chat-tool-log]] · Built from parts that already ship">
            Every row is the shared row primitive at <Code>density="compact"</Code>, the group disclosure
            is <Code>Collapsible</Code>, the chips are <Code>Badge</Code>, the working state is{" "}
            <Code>Spinner</Code>, and the tool name is <Code>Code</Code>. No row chrome was invented: the
            keyboard behaviour, the <Code>aria-expanded</Code> wiring, the chevron rotation and the
            reduced-motion silence all come from those parts rather than being written again here.
          </Decision>
          <Decision id="[[chat-tool-log]] · Closed by default, and one call is just a row">
            The group starts <strong>collapsed</strong>. A turn's answer is the point; its working is
            available on request. A single call renders with <strong>no group chrome at all</strong> — a
            disclosure that hides one row hides nothing — and an empty <Code>calls</Code> array renders{" "}
            <strong>nothing</strong> rather than an empty shell.
          </Decision>
          <Decision id="[[chat-tool-log]] · The summary shows the latest call">
            Collapsed, the summary line carries the newest call's state and name, not a generic glyph and
            a count. Someone watching a turn unfold wants to know what is happening now; the count rides
            along in a chip.
          </Decision>
          <Decision id="[[chat-tool-log]] · Truncation has a priority order">
            When the row runs out of room the <strong>target</strong> gives up width roughly ten times
            faster than the tool name, the name never shrinks past four characters, and the duration and
            diff counts <strong>never shrink at all</strong>. Those two are what a reader scans a
            collapsed log for; a file path is the most inferable thing on the line.
          </Decision>
          <Decision id="[[chat-tool-log]] · Real buttons, not divs with a role">
            Both disclosures — the group summary and an expandable row — are genuine{" "}
            <Code>&lt;button&gt;</Code> elements. An expandable row renders its content as phrasing
            content inside that button, so the whole row is one keyboard-operable control with a real
            accessible name rather than a <Code>div</Code> wearing <Code>role="button"</Code>.
          </Decision>
          <Decision id="[[chat-tool-log]] · No hidden tab stops">
            A closed group <strong>unmounts</strong> its rows. There is nothing focusable inside a
            collapsed list to tab into, so no <Code>inert</Code> and no force-mounting is needed — the
            substrate makes the problem impossible rather than patching it.
          </Decision>
          <Decision id="[[chat-tool-log]] · Queued and running are different states">
            <Code>pending</Code> shows a clock <em>and the word “Queued”</em>; <Code>running</Code> shows
            the spinner. Rendering the same spinner for both makes a call that has not started look like
            one that is working. A glyph the reader has to decode is not a state, and colour is never the
            only signal: the four states differ by shape first.
          </Decision>
          <Decision id="[[chat-tool-log]] · A failure says why, visibly">
            <Code>errorMessage</Code> renders as text under the row. Hiding the reason in a{" "}
            <Code>title</Code> attribute makes it unreachable by touch and by most assistive technology,
            which is exactly the audience that needs it.
          </Decision>
        </Flex>
      </Section>

      <Rule />

      <Section title="Changelog" lead="Notable changes, newest first — grows as the component evolves.">
        <Flex direction="column" gap="3">
          <Decision id="0.9.0">
            Initial <Code>System/Chat/ChatToolCalls</Code> — the row primitive and{" "}
            <Code>Collapsible</Code> carry the anatomy and the disclosure; both disclosures are real
            buttons; queued is told apart from running; a failure reason renders as visible text.
          </Decision>
        </Flex>
      </Section>
    </Page>
  ),
};
