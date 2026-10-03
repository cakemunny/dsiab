import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";
import type { CSSProperties, ReactNode } from "react";
import { Box, Flex } from "@radix-ui/themes";
import {
  ArrowClockwise,
  CheckCircle,
  Circle,
  Copy,
  FileCode,
  Pause,
  SkipForward,
  Stop,
  XCircle,
} from "@phosphor-icons/react";
import { Badge } from "../components/ui/Badge";
import { Button } from "../components/ui/Button";
import { Callout } from "../components/ui/Callout";
import { Card } from "../components/ui/Card";
import { ChatToolCalls, type ChatToolCallItem } from "../components/ui/ChatToolCalls";
import { Code } from "../components/ui/Code";
import { Collapsible } from "../components/ui/Collapsible";
import { DataList } from "../components/ui/DataList";
import { Heading, type HeadingProps } from "../components/ui/Heading";
import { IconButton } from "../components/ui/IconButton";
import { Kbd } from "../components/ui/Kbd";
import { Layout } from "../components/ui/Layout";
import { List, ListItem } from "../components/ui/List";
import { NumberInput } from "../components/ui/NumberInput";
import { Progress } from "../components/ui/Progress";
import { ScrollArea } from "../components/ui/ScrollArea";
import { Separator } from "../components/ui/Separator";
import { Spinner } from "../components/ui/Spinner";
import { StatusDot } from "../components/ui/StatusDot";
import { Switch } from "../components/ui/Switch";
import { Text } from "../components/ui/Text";
import { Timestamp } from "../components/ui/Timestamp";
import { Tooltip } from "../components/ui/Tooltip";
import { TreeList, type TreeListItemData } from "../components/ui/TreeList";
import { useResolvedSize } from "../theme/SizeContext";

/* Agent run — a recreation of the run view a long-running autonomous agent renders while it works
   through a plan. No traditional analogue: the screen has to hold a plan whose steps are in four
   different states at once, the trace of what the current step actually did, and the meter that says
   what the run is costing. It is drawn AT REST — a run frozen mid-flight, not an animation. */

const ELAPSED_MS = 18 * 60_000 + 42_000;
/** Derived at module load so the relative timestamp reads "18 minutes ago" on every open. */
const STARTED_AT = new Date(Date.now() - ELAPSED_MS).toISOString();

const weak: CSSProperties = { color: "var(--ds-text-weak)" };
const tabular: CSSProperties = { fontVariantNumeric: "tabular-nums" };

/* ---- fixtures -------------------------------------------------------------- */

const GREP_OUTPUT = `services/billing/adapters/charge.ts:41   const res = await legacyCharge(intent, { idempotencyKey });
services/billing/adapters/charge.ts:88   return legacyCharge(retryIntent, opts);
services/checkout/session.ts:212         await legacyCharge(session.intent);
3 files, 14 matches`;

const DIFF_OUTPUT = `- const res = await legacyCharge(intent, { idempotencyKey });
+ const res = await gateway.chargeIntent(intent, {
+   idempotencyKey,
+   captureMode: "automatic",
+ });`;

const FAILURE_OUTPUT = `FAIL  services/billing/refunds.contract.test.ts
  ● refunds › settles a partial refund against a captured charge

    expected status 201, received 409
      at RefundAdapter.submit (services/billing/adapters/refund.ts:74:11)
      at Object.<anonymous> (services/billing/refunds.contract.test.ts:38:5)

  Tests: 1 failed, 11 passed, 12 total   Time: 42.81s`;

const ACTIVE_CALLS: ChatToolCallItem[] = [
  { name: "read_file", status: "complete", node: "vm-04", duration: "96ms", target: "services/billing/adapters/charge.ts" },
  { name: "grep", status: "complete", duration: "310ms", target: '"legacyCharge(" in services/', resultDetail: <Output>{GREP_OUTPUT}</Output> },
  {
    name: "edit_file", status: "complete", node: "vm-04", duration: "1.4s", additions: 64, deletions: 38,
    target: "services/billing/adapters/charge.ts", resultDetail: <Output>{DIFF_OUTPUT}</Output>,
  },
  { name: "run_shell", status: "running", node: "vm-04", target: "npm run test -- charge-adapter" },
];

const FAILED_CALLS: ChatToolCallItem[] = [
  {
    name: "run_shell", status: "complete", node: "vm-04", duration: "42.8s",
    target: "npm run test -- refunds.contract",
  },
  {
    name: "call_api", status: "error", node: "sandbox-net", duration: "3.1s", target: "POST /v2/refunds",
    errorMessage:
      "The gateway stub answered 409 Conflict: refund_id ref_9f22ab is already settled. Two retries, then the step stopped.",
  },
];

const INVENTORY_CALLS: ChatToolCallItem[] = [
  { name: "list_directory", status: "complete", target: "services/", duration: "44ms" },
  { name: "grep", status: "complete", target: '"@payments/legacy-sdk"', duration: "260ms" },
  { name: "write_file", status: "complete", node: "vm-04", target: "notes/call-sites.md", additions: 31, duration: "120ms" },
];

/* ---- shared bits ----------------------------------------------------------- */

/** A command transcript or diff. `Code` is the system's inline chip, so the neutral panel around it
    is plain paint from the fill / stroke roles — there is no CodeBlock in the roster (out of scope). */
function Output({ children }: { children: string }) {
  return (
    <Box
      style={{
        background: "var(--ds-fill-weak)",
        border: "1px solid var(--ds-stroke-weak)",
        borderRadius: "var(--ds-radius-2)",
        padding: "var(--ds-space-12)",
      }}
    >
      {/* No `size`: a transcript is body text and rides the text lane with everything else. */}
      <Code
        variant="ghost"
        style={{ display: "block", whiteSpace: "pre-wrap", color: "var(--ds-text-strong)" }}
      >
        {children}
      </Code>
    </Box>
  );
}

type StepState = "done" | "running" | "failed" | "pending";

/** What each glyph means, in words. A completed or queued row states its state in SHAPE alone — the
    trailing slot there carries a duration, not a status — so the hint is the only place the name is
    written. Hover-only by design: the rows are a roving-tabindex tree, and a focusable span inside a
    row would insert a tab stop into a keyboard model the tree owns. */
const STATE_HINT: Record<StepState, string> = {
  done: "Complete",
  running: "Running now",
  failed: "Failed — the run is holding here",
  pending: "Queued",
};

/** The state glyph differs by SHAPE as well as by colour — a tick, a spinner, a cross, a hollow ring
    — so the four states survive a greyscale print (WCAG 1.4.1). Colour comes from the semantic icon
    roles, never a Radix red/green step. */
function glyph(state: StepState): ReactNode {
  const mark =
    state === "done" ? (
      <CheckCircle weight="fill" aria-hidden style={{ color: "var(--ds-icon-success)" }} />
    ) : state === "running" ? (
      <Spinner />
    ) : state === "failed" ? (
      <XCircle weight="fill" aria-hidden style={{ color: "var(--ds-icon-error)" }} />
    ) : (
      <Circle aria-hidden style={{ color: "var(--ds-icon-disabled)" }} />
    );
  return (
    <Tooltip content={STATE_HINT[state]}>
      <span style={{ display: "inline-flex" }}>{mark}</span>
    </Tooltip>
  );
}

/** The supporting line every region uses: weak ink, and tabular figures for anything that counts.
    No `size`: the text lane floors at 12px, so the secondary tier is carried by COLOUR, never by a
    smaller step — the same rule the tool-call log's own "Queued" word follows. */
function Meta({ children, numeric }: { children: ReactNode; numeric?: boolean }) {
  return <Text style={numeric ? { ...weak, ...tabular } : weak}>{children}</Text>;
}

/** A heading that titles a SURFACE — a card, the rail, a section of the scroll column — rather than
    the page. Radix's `heading` lane is the page-title ladder (5/6/7 → 20/24/28px) and is wrong at
    this scale, so these ride `chromeHeading` ([[chrome-heading-lane]]): text + 1 step, 14/16/18px across the tiers.
    Reading the lane is what a literal `size="3"` could not do — that pinned every one of them to
    16px, level with body text once the tier reached large. */
function ChromeHeading({ as, children }: { as: "h2" | "h3"; children: ReactNode }) {
  const size = useResolvedSize<HeadingProps["size"]>("chromeHeading", undefined);
  return (
    <Heading as={as} size={size}>
      {children}
    </Heading>
  );
}

function trailing(state: StepState, duration?: string): ReactNode {
  if (state === "running") return <Badge tone="info">Running</Badge>;
  if (state === "failed") return <Badge tone="error">Failed</Badge>;
  if (state === "pending") return <Meta>Queued</Meta>;
  return <Meta numeric>{duration}</Meta>;
}

function step(
  id: string,
  state: StepState,
  label: string,
  duration?: string,
  children?: TreeListItemData[],
): TreeListItemData {
  return {
    id,
    label,
    startContent: glyph(state),
    endContent: trailing(state, duration),
    children,
    isExpanded: children != null && state !== "done",
  };
}

const PLAN: TreeListItemData[] = [
  step("s1", "done", "Read the migration brief and pin the gateway SDK version", "1m 04s"),
  step("s2", "done", "Inventory every legacy call site", "2m 18s", [
    step("s2a", "done", "services/billing — 14 call sites", "48s"),
    step("s2b", "done", "services/checkout — 6 call sites", "31s"),
    step("s2c", "done", "workers/reconciliation — 3 call sites", "19s"),
  ]),
  step("s3", "done", "Write the adapter contract and its fixtures", "3m 51s"),
  step("s4", "done", "Port the capture path and its snapshot", "4m 06s"),
  step("s5", "running", "Rewrite the charge adapter and run its suite", undefined, [
    step("s5a", "done", "Replace legacyCharge with gateway.chargeIntent", "1m 12s"),
    step("s5b", "running", "Run the charge adapter suite"),
    step("s5c", "pending", "Refresh the adapter snapshot"),
  ]),
  step("s6", "failed", "Bring the refunds contract suite back green", undefined, [
    step("s6a", "done", "Port the refund path", "2m 02s"),
    step("s6b", "failed", "Run the refunds contract suite"),
  ]),
  step("s7", "pending", "Update the reconciliation worker"),
  step("s8", "pending", "Regenerate the SDK type declarations"),
  step("s9", "pending", "Open a pull request with the migration notes"),
];

/* Rail-sized paths: the files panel is a 340px rail, so the repo-relative tail is what it shows. */
const ARTIFACTS = [
  { path: "billing/adapters/charge.ts", diff: "+64 −38" },
  { path: "billing/adapters/refund.ts", diff: "+41 −29" },
  { path: "checkout/session.ts", diff: "+12 −9" },
  { path: "notes/call-sites.md", diff: "+31" },
];

/** The run's meter. `numeric` puts a value that updates in place into tabular figures. No `size` on
    any value: the DataList below resolves the tier once and every value rides it. */
const META_ROWS: { label: string; value: ReactNode; numeric?: boolean }[] = [
  { label: "Model", value: <Code variant="ghost">orion-3.5-large</Code> },
  {
    label: "Sandbox",
    value: (
      <Flex align="center" gap="2">
        <StatusDot variant="success" label="Sandbox healthy" />
        <Text>ephemeral-vm-04</Text>
      </Flex>
    ),
  },
  // The branch keeps no `truncate` of its own: the list declares `overflow="truncate"` and every row
  // obeys it, which is what stopped this rail showing an ellipsis here and a wrap two rows above.
  { label: "Branch", value: <Code variant="ghost">agent/billing-sdk-migration</Code> },
  { label: "Duration", value: "18m 42s", numeric: true },
  // The LIMIT belongs to the control that sets it (Run settings, below), so this row reports only what
  // the run has spent against it — the number has one owner, and the rail never states it twice.
  { label: "Retries", value: "2 used", numeric: true },
  { label: "Spend", value: "$1.84 of $5.00", numeric: true },
];

/* ---- regions --------------------------------------------------------------- */

function RunHeader() {
  return (
    <Flex direction="column" gap="3">
      <Flex align="start" justify="between" gap="4" wrap="wrap">
        <Flex direction="column" gap="2">
          {/* The page's one h1, so it takes the heading lane whole (5/6/7 → 20/24/28px). */}
          <Heading as="h1">
            Migrate the billing service off the deprecated payments SDK
          </Heading>
          <Flex align="center" gap="3" wrap="wrap">
            <Flex align="center" gap="2">
              <StatusDot variant="accent" label="Run in progress" isPulsing />
              <Text weight="medium">
                Working
              </Text>
            </Flex>
            <Text style={weak}>Step 5 of 9</Text>
            <Text style={{ ...weak, ...tabular }}>00:18:42 elapsed</Text>
            <Text style={weak}>started <Timestamp value={STARTED_AT} /></Text>
            {/* The run id is the string every other tool in the loop asks for, so it carries the one
                icon-only action on this screen. Icon-only means the name lives in `aria-label`, and
                the Tooltip states it on hover AND on keyboard focus — the button is a real tab stop. */}
            <Flex align="center" gap="1">
              <Code variant="ghost">run_8f31c2</Code>
              <Tooltip content="Copy run ID">
                <IconButton priority="tertiary" aria-label="Copy run ID">
                  <Copy aria-hidden />
                </IconButton>
              </Tooltip>
            </Flex>
          </Flex>
        </Flex>
        <Flex align="center" gap="2">
          <Button priority="secondary">
            <Pause weight="fill" aria-hidden />
            Pause
          </Button>
          <Button priority="secondary" tone="danger">
            <Stop weight="fill" aria-hidden />
            Stop run
          </Button>
        </Flex>
      </Flex>
      <Flex align="center" gap="3">
        <Progress value={52} max={100} style={{ flex: "1 1 auto" }} aria-label="Run progress" />
        <Meta numeric>52%</Meta>
      </Flex>
    </Flex>
  );
}

function ActiveStep() {
  return (
    <Card variant="outlined">
      <Flex direction="column" gap="3">
        <Flex align="center" justify="between" gap="3" wrap="wrap">
          <Flex align="center" gap="2">
            <Spinner />
            <ChromeHeading as="h3">
              Step 5 · Rewrite the charge adapter and run its suite
            </ChromeHeading>
          </Flex>
          <Meta numeric>2m 41s in this step</Meta>
        </Flex>
        <Text style={weak}>
          The suite is running against the ephemeral gateway stub. Capture mode moved to automatic, so
          the snapshot refresh is queued behind it.
        </Text>
        <ChatToolCalls calls={ACTIVE_CALLS} defaultOpen />
      </Flex>
    </Card>
  );
}

function FailedStep() {
  return (
    <Card variant="outlined">
      <Flex direction="column" gap="3">
        <Flex align="center" justify="between" gap="3" wrap="wrap">
          <Flex align="center" gap="2">
            <XCircle weight="fill" aria-hidden style={{ color: "var(--ds-icon-error)" }} />
            <ChromeHeading as="h3">
              Step 6 · Bring the refunds contract suite back green
            </ChromeHeading>
          </Flex>
          <Meta numeric>stopped after 45s</Meta>
        </Flex>
        <Callout
          tone="error"
          urgency="attention"
          title="The refunds contract suite is red"
          actions={
            <>
              <Button priority="secondary">
                <ArrowClockwise aria-hidden />
                Retry step
              </Button>
              <Button priority="tertiary">
                <SkipForward aria-hidden />
                Skip and continue
              </Button>
            </>
          }
        >
          1 of 12 contract tests failed: settling a partial refund against a captured charge answered
          409 Conflict. The run held here rather than opening a pull request on a red suite.
        </Callout>
        <ChatToolCalls calls={FAILED_CALLS} defaultOpen />
        <Output>{FAILURE_OUTPUT}</Output>
      </Flex>
    </Card>
  );
}

/** A settings row: the label LEADS and the switch sits at the row's trailing edge (the shape
    Switch.stories rules, resolved against the writing direction so RTL mirrors for free). */
function SettingRow({
  id,
  label,
  description,
  defaultChecked,
}: {
  id: string;
  label: string;
  description: string;
  defaultChecked?: boolean;
}) {
  return (
    <Flex align="center" justify="between" gap="3">
      <Flex direction="column" gap="1" style={{ minWidth: 0 }}>
        <Text as="label" htmlFor={id} style={{ color: "var(--ds-text-strong)" }}>
          {label}
        </Text>
        <Meta>{description}</Meta>
      </Flex>
      <Switch id={id} defaultChecked={defaultChecked} style={{ flexShrink: 0 }} />
    </Flex>
  );
}

function RunMeta() {
  const [retryLimit, setRetryLimit] = useState(5);
  return (
    <Flex direction="column" gap="4">
      <ChromeHeading as="h2">Run details</ChromeHeading>
      {/* No `size`: the spec sheet rides the control lane, so the whole rail answers the tier.
          `overflow` is the rail's ONE rule for a value too wide for its column ([[data-list-overflow]]). A run rail is
          scanned down rather than read across, so every row holds one line and the full string stays
          reachable through the title the component derives. Narrow the rail past the stack threshold
          and the container query gives each value the panel's whole width instead. */}
      <DataList.Root labelGap="4" overflow="truncate">
        {META_ROWS.map((row) => (
          <DataList.Item key={row.label}>
            <DataList.Label>{row.label}</DataList.Label>
            <DataList.Value style={row.numeric ? tabular : undefined}>{row.value}</DataList.Value>
          </DataList.Item>
        ))}
      </DataList.Root>

      <Separator size="4" />

      {/* The two switches are the live policy this run is executing under, which is why they belong
          on the run view and not only on the form that started it: the screen shows a step that
          failed while another kept going, and this is where that is decided. */}
      <Flex direction="column" gap="3">
        <Text weight="medium">
          Run settings
        </Text>
        <SettingRow
          id="auto-approve"
          label="Auto-approve tool calls"
          description="Writes outside the workspace still ask."
          defaultChecked
        />
        <SettingRow
          id="stop-on-failure"
          label="Stop on first failure"
          description="Halt every remaining step when one fails."
        />
        {/* A FIELD, not a stray box. No `size` (it rides the control lane with the switches above
            it) and no `width` cap: the old 96px cap held the whole field shell, which is what kept
            the description out and left a 24px box floating in a 340px rail at every tier. Full
            column width is the rail's own field shape, `units` gives the number its noun, and the
            description carries the rule the DataList's "Retries" row reports against. */}
        <NumberInput
          label="Retry limit"
          description="Per step. The run holds when a step spends them all."
          units="attempts"
          value={retryLimit}
          onValueChange={setRetryLimit}
          min={0}
          max={10}
          step={1}
          isIntegerOnly
        />
      </Flex>

      <Separator size="4" />

      <Flex direction="column" gap="2">
        <Flex align="center" justify="between">
          <Text weight="medium">
            Context window
          </Text>
          <Meta numeric>69%</Meta>
        </Flex>
        <Progress value={69} max={100} aria-label="Context window used" />
        <Flex align="center" justify="between" gap="2">
          <Meta numeric>138,204 / 200,000</Meta>
          <Meta numeric>9,264 this step</Meta>
        </Flex>
      </Flex>

      <Separator size="4" />

      <List
        density="compact"
        header={
          <Text weight="medium">
            Files touched
          </Text>
        }
      >
        {/* Two declarations, two different jobs, both required by §8b.

            `display: block` is what makes `truncate` real. `Code` is an INLINE box and
            `overflow: hidden` does not apply to one, so at the large tier the path rendered 235px
            wide inside a 200px label column and ran 27px under the diff counts.

            `contain: inline-size` is what stops the path DRIVING the rail. A nowrap string's
            min-content is the whole string, and `Item` only turns its label span into a scroll
            container for a STRING label — a composed node is left alone by ruling, so the node has
            to collapse its own intrinsic width. Without it the rail's content measured 348.3px
            inside a 340px panel and the ScrollArea clipped the last 8.3px ([[container-narrowing]] is the same
            failure). `title` gives the ellipsed tail back. */}
        {ARTIFACTS.map((a) => (
          <ListItem
            key={a.path}
            startContent={<FileCode aria-hidden style={{ color: "var(--ds-icon-neutral)" }} />}
            label={
              <Code
                variant="ghost"
                truncate
                title={a.path}
                style={{ display: "block", contain: "inline-size" }}
              >
                {a.path}
              </Code>
            }
            endContent={<Meta numeric>{a.diff}</Meta>}
          />
        ))}
      </List>
    </Flex>
  );
}

function AgentRunScreen() {
  return (
    <Layout
      defaultHasDividers
      style={{ height: "100vh", "--ds-layout-content-min": "420px" } as CSSProperties}
    >
      <Layout.Header landmark>
        <RunHeader />
      </Layout.Header>

      {/* `paddingRight` on the Content, not on the ScrollArea's own child: the scrollbar is pinned
          to the ScrollArea root's edge, so insetting the ROOT is what moves the gutter. Without it
          the 4px scroll track sits flush against the panel's resize seam and the two read as a
          doubled border. A scroll gutter is not a seam; keep it clear of one. */}
      <Layout.Content style={{ padding: 0, paddingRight: "var(--ds-space-2)", minHeight: 0 }}>
        <ScrollArea type="auto" scrollbars="vertical" style={{ height: "100%" }}>
          <Flex direction="column" gap="5" p="5">
            <Flex direction="column" gap="3">
              <Flex align="center" justify="between" gap="3" wrap="wrap">
                <ChromeHeading as="h2">Plan</ChromeHeading>
                <Meta>4 complete · 1 running · 1 failed · 3 queued</Meta>
              </Flex>
              <TreeList items={PLAN} density="balanced" />
            </Flex>

            <Separator size="4" />

            <ActiveStep />
            <FailedStep />

            <Separator size="4" />

            <Collapsible
              trigger={
                <Flex align="center" gap="2">
                  <CheckCircle weight="fill" aria-hidden style={{ color: "var(--ds-icon-success)" }} />
                  <Text weight="medium">Step 2 · Inventory every legacy call site</Text>
                  <Badge tone="success">Complete</Badge>
                  <Meta numeric>2m 18s</Meta>
                </Flex>
              }
            >
              <ChatToolCalls calls={INVENTORY_CALLS} />
            </Collapsible>
          </Flex>
        </ScrollArea>
      </Layout.Content>

      <Layout.Panel
        landmark
        side="end"
        style={{ padding: 0 }}
        resizable={{
          defaultSize: 340,
          minSizePx: 280,
          maxSizePx: 460,
          "aria-label": "Resize run details",
        }}
      >
        <ScrollArea type="auto" scrollbars="vertical" style={{ height: "100%" }}>
          <Box p="4">
            <RunMeta />
          </Box>
        </ScrollArea>
      </Layout.Panel>

      <Layout.Footer>
        <Flex align="center" justify="between" gap="3" wrap="wrap">
          <Flex align="center" gap="2">
            <StatusDot variant="success" label="Streaming" />
            <Meta>
              Streaming from ephemeral-vm-04 · shell writes outside the workspace need approval
            </Meta>
          </Flex>
          <Meta>
            Press <Kbd>⌘</Kbd> <Kbd>.</Kbd> to interrupt the current step
          </Meta>
        </Flex>
      </Layout.Footer>
    </Layout>
  );
}

const meta: Meta = {
  title: "UI examples/Agent run",
  parameters: {
    layout: "fullscreen",
    // Showcase pages assert nothing and are registered as fully axe-off in
    // src/foundations/axe-scope.node-check.ts under ruling [[showcases-and-fixture]]. They are visual
    // references, not evidence. The composition fixture carries the axe role.
    a11y: { test: "off" },
  },
};
export default meta;
type Story = StoryObj;

export const Screen: Story = { name: "Agent run", render: () => <AgentRunScreen /> };
