import { useId, useState } from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { Box, Flex } from "@radix-ui/themes";
import { FunnelSimple, Plus, TrashSimple } from "@phosphor-icons/react";
import { Text } from "../components/ui/Text";
import { Heading } from "../components/ui/Heading";
import { Button } from "../components/ui/Button";
import { ButtonGroup } from "../components/ui/ButtonGroup";
import { Badge } from "../components/ui/Badge";
import { Callout } from "../components/ui/Callout";
import { Card } from "../components/ui/Card";
import { Checkbox } from "../components/ui/Checkbox";
import { Collapsible } from "../components/ui/Collapsible";
import { DataList } from "../components/ui/DataList";
import { DateInput } from "../components/ui/DateInput";
import { Dialog } from "../components/ui/Dialog";
import { AlertDialog } from "../components/ui/AlertDialog";
import { DropdownMenu } from "../components/ui/DropdownMenu";
import { Link } from "../components/ui/Link";
import { MoreMenu } from "../components/ui/MoreMenu";
import { MultiSelect } from "../components/ui/MultiSelect";
import { Pagination } from "../components/ui/Pagination";
import { Popover } from "../components/ui/Popover";
import { Select } from "../components/ui/Select";
import { Separator } from "../components/ui/Separator";
import { StatusDot } from "../components/ui/StatusDot";
import { Table } from "../components/ui/Table";
import { Tabs } from "../components/ui/Tabs";
import { TextField } from "../components/ui/TextField";
import { Timestamp } from "../components/ui/Timestamp";
import { Token } from "../components/ui/Token";
import { ToastProvider, ToastViewport, useToast } from "../components/ui/Toast";
import type { ISODateString } from "../dates/dateTypes";

/* _internal/Composition — the composition PROBE, and the only page-level structural check the
 * system has left ([[showcases-and-fixture]]).
 *
 * WHAT IT REPLACES, AND WHAT IT DELIBERATELY DOES NOT. Six scenario pages carried this role until
 * 2026-09-18 and were rejected as showcases, because a probe wants the three things a showcase
 * cannot have: maximum density, minimum setup, and self-driving interaction. The eight recreations
 * now carry the showcase job and assert nothing. This file carries the assertions, and NOTHING here
 * is written to be read as documentation. It is underscore-prefixed so a reader never lands on it.
 *
 * SO THE `play` IS CORRECT HERE, and it is the one file in the directory where that is true. Axe
 * cannot inspect a panel that never opened, and every unique finding this suite produced in fifteen
 * days came out of an OPEN portal: one unnamed `Popover` panel, which became ruling [[popover-accessible-name]] and is now a
 * compile error. No unit story caught it. The play exists to put those panels on screen.
 *
 * THE CROSSINGS IT CARRIES, each one a place a component meets another in a way its own page never
 * exercises:
 *
 *   1. A `MultiSelect` inside a `Popover`. A portal inside a portal, where the failure is silent:
 *      the inner panel leaves the theme root, every --ds-* resolves to the empty string, and the
 *      result merely looks slightly wrong. The panel's accessible name is asserted here too, which
 *      is the exact defect that became [[popover-accessible-name]].
 *   2. A `Dialog` holding a `TextField` in its error `validation` state, a `Select`, and a
 *      `DateInput` whose calendar portals OUT of the dialog. Two halves fail differently: the
 *      portal can lose the theme, and the focus trap can refuse the calendar, which makes the
 *      picker keyboard-dead while looking correct.
 *   3. A `DropdownMenu` with a SUBMENU, inside a `Table` row. Two nested menu layers launched from
 *      a cell, plus the destructive item's isolation contract.
 *   4. An `AlertDialog` opened from that destructive row action, driven by state rather than by a
 *      `Trigger`, gating its action on a typed confirmation. The input keeps its own field chrome
 *      inside the trap, which is the half a trap regression breaks silently.
 *   5. A `Toast` fired in the same tick a `Collapsible` expands. Both own timing-sensitive
 *      behaviour and neither knows about the other; the toast reaching a LIVE REGION is invisible
 *      on screen and total for anyone listening.
 *   6. `Tabs` + `Table` + `Pagination` in one tree: a data table and its navigation inside a
 *      tabpanel, which is where most internal tools put them and where no unit story puts them.
 *
 * WHAT THE FINAL STATE IS FOR. The play closes the two modals after asserting them and leaves the
 * NON-MODAL surfaces open, because a modal aria-hides the page behind it and axe would then scan
 * the dialog instead of the screen. What axe sees at the end is the full page plus an open popover,
 * an open listbox two portals deep, and a live toast. */

type RunTone = "success" | "error" | "warning";

const RUNS: { id: string; service: string; status: string; tone: RunTone; owner: string; duration: string }[] = [
  { id: "BLD-2481", service: "checkout-api", status: "Passed", tone: "success", owner: "R. Okafor", duration: "4m 12s" },
  { id: "BLD-2480", service: "search-indexer", status: "Failed", tone: "error", owner: "M. Halvorsen", duration: "1m 03s" },
  { id: "BLD-2479", service: "web-client", status: "Queued", tone: "warning", owner: "J. Aberash", duration: "pending" },
];

/* CROSSING 1. The filter panel holds a MultiSelect, which opens a portal of its own. The panel is
   named by pointing at its own visible heading rather than repeating the words in an aria-label,
   which is the route [[popover-accessible-name]] added alongside aria-label. */
function FilterPopover() {
  const panelTitleId = useId();
  return (
    // The Box is load-bearing. Popover.Trigger composes via asChild, so without it the Button is a
    // direct child of the column flex above and stretches to the full width of the panel, reading
    // as a bar rather than an action.
    <Box>
      <Popover.Root>
        <Popover.Trigger>
          <Button priority="secondary" data-probe="open-filters">
            <FunnelSimple />
            Filters
          </Button>
        </Popover.Trigger>
        <Popover.Content width="320px" data-probe="filter-panel" aria-labelledby={panelTitleId}>
          <Flex direction="column" gap="3">
            <Text id={panelTitleId} size="2" weight="medium">Narrow the queue</Text>
            {/* MultiSelect does not share Select's compound shape: it renders its own trigger and
                panel and takes Options as direct children, because it owns the portalled popover
                recipe rather than exposing it. */}
            <MultiSelect
              label="Service"
              description="Leave empty to show every service."
              defaultValue={["checkout-api"]}
            >
              <MultiSelect.Option value="checkout-api">checkout-api</MultiSelect.Option>
              <MultiSelect.Option value="search-indexer">search-indexer</MultiSelect.Option>
              <MultiSelect.Option value="web-client">web-client</MultiSelect.Option>
            </MultiSelect>
            <Checkbox defaultChecked label="Failed runs only" />
          </Flex>
        </Popover.Content>
      </Popover.Root>
    </Box>
  );
}

/* CROSSING 2. Everything in this dialog is a field-bearing control inside a portal and a focus
   trap, and the date picker opens a second portal out of the first. */
function ReviewDialog() {
  // DateInput is CONTROLLED ONLY: onValueChange is required and there is no uncontrolled mode, so
  // the consumer always holds the value. The type is branded, so `string` is a compile error.
  const [date, setDate] = useState<ISODateString | undefined>();

  return (
    <Dialog.Root>
      <Dialog.Trigger>
        <Button priority="primary" data-probe="open-review">
          <Plus />
          Schedule a review
        </Button>
      </Dialog.Trigger>
      <Dialog.Content data-probe="review-dialog">
        <Dialog.Title>Schedule a release review</Dialog.Title>
        <Dialog.Description size="2">
          Everyone named here receives the build log and the rollback plan an hour beforehand.
        </Dialog.Description>

        <Flex direction="column" gap="4" mt="4">
          {/* A validation message REPLACES the description and never stacks with it, so this field
              carries the error alone. The shell is the input's own; there is no supported way to
              hand-roll it, and no reason to. */}
          <TextField
            label="Review title"
            validation={{ tone: "error", message: "A review needs a title before it can be scheduled." }}
            placeholder="Checkout API, week 38"
            data-probe="review-title"
          />
          <Select
            label="Reviewer group"
            description="They are paged if the review is missed."
            defaultValue="platform"
          >
            <Select.Trigger />
            <Select.Content>
              <Select.Item value="platform">Platform on-call</Select.Item>
              <Select.Item value="payments">Payments guild</Select.Item>
              <Select.Item value="sre">Reliability</Select.Item>
            </Select.Content>
          </Select>
          {/* The probe goes on a wrapper, not the input: DateInputProps is a CLOSED interface that
              spreads no rest, so a data-* passed to it compiles and vanishes at runtime. */}
          <Box data-probe="review-date">
            <DateInput
              label="Review date"
              description="Type it, or pick from the calendar."
              hasClear
              value={date}
              onValueChange={setDate}
            />
          </Box>
        </Flex>

        <Dialog.Footer>
          <Dialog.Close>
            <Button priority="secondary" data-probe="close-review">Cancel</Button>
          </Dialog.Close>
          <Button priority="primary">Schedule</Button>
        </Dialog.Footer>
      </Dialog.Content>
    </Dialog.Root>
  );
}

/* CROSSINGS 3 and 4. The row menu nests a submenu, and its destructive item drives a confirm that
   registers NO trigger: it opens from state, which is exactly the case [[focus-return-on-close]]'s return-focus repair
   exists for. The confirm's action is gated on a TextField living inside the trap. */
function RunTable({ onRollback }: { onRollback: (id: string) => void }) {
  return (
    <Table.Root>
      <Table.Header>
        <Table.Row>
          <Table.ColumnHeaderCell>Build</Table.ColumnHeaderCell>
          <Table.ColumnHeaderCell>Service</Table.ColumnHeaderCell>
          <Table.ColumnHeaderCell>Status</Table.ColumnHeaderCell>
          <Table.ColumnHeaderCell>Owner</Table.ColumnHeaderCell>
          <Table.ColumnHeaderCell numeric>Duration</Table.ColumnHeaderCell>
          <Table.ColumnHeaderCell>
            {/* A header over an actions column names the column without labelling anything the
                reader can act on, so it stays visible rather than becoming a hidden string. */}
            Actions
          </Table.ColumnHeaderCell>
        </Table.Row>
      </Table.Header>
      <Table.Body>
        {RUNS.map((run) => (
          <Table.Row key={run.id}>
            <Table.Cell><Link href={`#${run.id}`}>{run.id}</Link></Table.Cell>
            <Table.Cell>{run.service}</Table.Cell>
            <Table.Cell><Badge tone={run.tone}>{run.status}</Badge></Table.Cell>
            <Table.Cell>{run.owner}</Table.Cell>
            <Table.Cell numeric>{run.duration}</Table.Cell>
            <Table.Cell>
              <MoreMenu label={`Actions for ${run.id}`} contentProps={{ align: "end" }}>
                <DropdownMenu.Item>View log</DropdownMenu.Item>
                <DropdownMenu.Item>Re-run</DropdownMenu.Item>
                <DropdownMenu.Sub>
                  <DropdownMenu.SubTrigger>Promote to</DropdownMenu.SubTrigger>
                  <DropdownMenu.SubContent>
                    <DropdownMenu.Item>Staging</DropdownMenu.Item>
                    <DropdownMenu.Item>Canary</DropdownMenu.Item>
                    <DropdownMenu.Item disabled>Production</DropdownMenu.Item>
                  </DropdownMenu.SubContent>
                </DropdownMenu.Sub>
                {/* The destructive item's contract: isolated below a Separator, with a leading
                    glyph and a verb label, so colour is never the only cue. `tone="danger"`, never
                    Radix's `color`, which would bypass the collision layer. */}
                <DropdownMenu.Separator />
                <DropdownMenu.Item tone="danger" onSelect={() => onRollback(run.id)}>
                  <TrashSimple />
                  Roll back {run.id}
                </DropdownMenu.Item>
              </MoreMenu>
            </Table.Cell>
          </Table.Row>
        ))}
      </Table.Body>
    </Table.Root>
  );
}

function RollbackConfirm({
  runId,
  typed,
  onTyped,
  onClose,
}: {
  runId: string | null;
  typed: string;
  onTyped: (value: string) => void;
  onClose: () => void;
}) {
  const matches = runId != null && typed === runId;
  return (
    <AlertDialog.Root open={runId != null} onOpenChange={(open) => { if (!open) onClose(); }}>
      <AlertDialog.Content maxWidth="460px" data-probe="rollback-confirm">
        <AlertDialog.Title>Roll back {runId}?</AlertDialog.Title>
        <AlertDialog.Description size="2">
          This redeploys the previous build to every region and cancels the two runs queued behind
          it. It cannot be undone from here.
        </AlertDialog.Description>

        <Box mt="3">
          <Callout tone="error" urgency="passive">
            Traffic shifts as soon as the previous build reports healthy, usually within 90 seconds.
          </Callout>
        </Box>

        <Box mt="4">
          <TextField
            label="Type the build number to confirm"
            description={<>Enter <strong>{runId}</strong> exactly.</>}
            value={typed}
            onChange={(e) => onTyped(e.currentTarget.value)}
            placeholder={runId ?? ""}
            data-probe="confirm-input"
          />
        </Box>

        <ButtonGroup mt="4">
          <AlertDialog.Cancel>
            <Button priority="secondary" data-probe="cancel-rollback">Keep this build</Button>
          </AlertDialog.Cancel>
          <AlertDialog.Action>
            <Button priority="primary" tone="danger" disabled={!matches} data-probe="confirm-rollback">
              Roll back
            </Button>
          </AlertDialog.Action>
        </ButtonGroup>
      </AlertDialog.Content>
    </AlertDialog.Root>
  );
}

/* CROSSING 5. The announcement and the disclosure fire in the same tick. */
function RollbackPlan({ expanded, onExpandedChange }: { expanded: boolean; onExpandedChange: (open: boolean) => void }) {
  return (
    <Collapsible
      open={expanded}
      onOpenChange={onExpandedChange}
      trigger={<Text size="2" weight="medium">Rollback plan for search-indexer</Text>}
    >
      <Flex direction="column" gap="2" pt="2" data-probe="plan-body">
        <Text size="2" style={{ color: "var(--ds-text-weak)" }}>
          Three steps, each reversible until traffic shifts.
        </Text>
        <Flex gap="2" wrap="wrap">
          <Token>drain queue</Token>
          <Token>redeploy 2478</Token>
          <Token>replay dead letters</Token>
        </Flex>
      </Flex>
    </Collapsible>
  );
}

function ActivityPanel() {
  return (
    <Flex direction="column" gap="3">
      <Card>
        <DataList.Root>
          <DataList.Item>
            <DataList.Label>Median run</DataList.Label>
            <DataList.Value>3m 48s</DataList.Value>
          </DataList.Item>
          <DataList.Item>
            <DataList.Label>Failures this week</DataList.Label>
            <DataList.Value>4 of 61</DataList.Value>
          </DataList.Item>
          <DataList.Item>
            <DataList.Label>Last deploy</DataList.Label>
            <DataList.Value><Timestamp value="2026-09-18T09:14:00Z" /></DataList.Value>
          </DataList.Item>
        </DataList.Root>
      </Card>
      <Flex align="center" gap="2">
        <StatusDot variant="warning" label="Degraded" />
        <Text size="2" style={{ color: "var(--ds-text-weak)" }}>
          The search index is rebuilding, so queue times are longer than usual.
        </Text>
      </Flex>
    </Flex>
  );
}

function CompositionFixture() {
  const toast = useToast();
  const [page, setPage] = useState(1);
  const [expanded, setExpanded] = useState(false);
  const [rollingBack, setRollingBack] = useState<string | null>(null);
  const [typed, setTyped] = useState("");

  return (
    <Flex direction="column" gap="4" p="4">
      <Flex align="center" justify="between" wrap="wrap" gap="3">
        <Flex direction="column" gap="1">
          <Heading as="h2" size="5">Deploy queue</Heading>
          <Flex align="center" gap="2">
            <Text size="2" style={{ color: "var(--ds-text-weak)" }}>orbit-production</Text>
            <Badge tone="warning">1 failed</Badge>
          </Flex>
        </Flex>
        <ReviewDialog />
      </Flex>

      <Tabs.Root defaultValue="queue">
        <Tabs.List aria-label="Deploy queue views">
          <Tabs.Trigger value="queue">Runs</Tabs.Trigger>
          <Tabs.Trigger value="activity">Activity</Tabs.Trigger>
        </Tabs.List>

        <Tabs.Content value="queue">
          <Flex direction="column" gap="4">
            <FilterPopover />
            <RunTable onRollback={(id) => { setTyped(""); setRollingBack(id); }} />
            <Pagination page={page} onChange={setPage} totalItems={61} pageSize={3} />
            <Separator size="4" />
            <RollbackPlan expanded={expanded} onExpandedChange={setExpanded} />
            <Box>
              <Button
                priority="secondary"
                data-probe="announce"
                onClick={() => {
                  setExpanded(true);
                  toast({
                    body: "Rollback queued for BLD-2480.",
                    tone: "success",
                    // Held open so axe inspects a live toast rather than an empty viewport.
                    autoHide: false,
                    action: { label: "Undo", altText: "Undo the queued rollback", onClick: () => {} },
                  });
                }}
              >
                Queue rollback and announce
              </Button>
            </Box>
          </Flex>
        </Tabs.Content>

        <Tabs.Content value="activity">
          <ActivityPanel />
        </Tabs.Content>
      </Tabs.Root>

      <RollbackConfirm
        runId={rollingBack}
        typed={typed}
        onTyped={setTyped}
        onClose={() => { setRollingBack(null); setTyped(""); }}
      />
    </Flex>
  );
}

const meta: Meta = {
  title: "_internal/Composition",
  parameters: {
    // CARVE-OUT, CITED ([[scenario-axe-carve-outs]], narrowed by [[showcases-and-fixture]]). `color-contrast` alone, and every other axe rule
    // stays on, because structure is what this fixture is here to find. The values scoped off are
    // token-level and already ruled: soft semantic fills at 4.10 to 4.43 ([[soft-fill-text-exception]]), white on error-9 at
    // 3.91 (the retired 3:1 floor for text on a solid fill, which [[text-on-solid-fill-contrast]] replaced), the solid accent at 2.58 on dark hover ([[wcag-claim-scope]]). Registered in
    // src/foundations/axe-scope.node-check.ts, which fails a citation that resolves to no entry.
    a11y: { config: { rules: [{ id: "color-contrast", enabled: false }] } },
  },
};
export default meta;
type Story = StoryObj;

export const Screen: Story = {
  render: () => (
    <ToastProvider>
      <CompositionFixture />
      {/* The viewport is not optional and its absence is silent: ToastProvider alone gives a
          working useToast() that fires, resolves and dismisses, and renders nothing at all. */}
      <ToastViewport position="bottom-end" />
    </ToastProvider>
  ),

  play: async ({ canvasElement }) => {
    const wait = async (predicate: () => boolean, what: string) => {
      for (let i = 0; i < 240; i++) {
        if (predicate()) return;
        const nextFrame = Promise.withResolvers<void>();
        requestAnimationFrame(() => nextFrame.resolve());
        await nextFrame.promise;
      }
      throw new Error(`timed out waiting for ${what}`);
    };
    const accentOf = (el: Element) => getComputedStyle(el).getPropertyValue("--ds-fill-accent").trim();
    const probe = <T extends HTMLElement>(root: ParentNode, selector: string, what: string): T => {
      const el = root.querySelector<T>(selector);
      if (!el) throw new Error(`${what} is not in the tree`);
      return el;
    };

    // ---- CROSSING 5: a live-region announcement while a neighbour is mid-animation -------------
    probe<HTMLButtonElement>(canvasElement, '[data-probe="announce"]', "the announce trigger").click();

    // The toast portals to a viewport-fixed region OUTSIDE the canvas, and it is not the only live
    // region on the page (the date input ships its own), so it is found by its TEXT, not by being
    // the first match. A toast that renders but lands in no live region is silent to a screen
    // reader while looking perfectly correct.
    const liveWithToast = () =>
      [...document.querySelectorAll<HTMLElement>('[role="status"], [role="alert"], [aria-live]')]
        .find((el) => (el.textContent ?? "").includes("Rollback queued for BLD-2480"));
    await wait(() => Boolean(liveWithToast()), "the toast to reach a live region carrying its text");
    if (liveWithToast()!.closest('[aria-hidden="true"]')) {
      throw new Error("the toast landed inside an aria-hidden subtree, so nothing announces");
    }
    const plan = probe(canvasElement, '[data-probe="plan-body"]', "the rollback plan body");
    await wait(
      () => Boolean(plan.closest('[data-state="open"]')),
      "the collapsible to report an open state after the toast fired in the same tick",
    );

    // ---- CROSSING 3: a submenu inside a table row ---------------------------------------------
    // A menu trigger opens on pointerdown or on a key, NEVER on a bare click: Radix reads
    // `onPointerDown` for the mouse, and element.click() dispatches neither. ArrowDown is the
    // keyboard route and is what a keyboard user actually does.
    const rowTrigger = probe(canvasElement, 'button[aria-label="Actions for BLD-2480"]', "the row menu trigger");
    rowTrigger.focus();
    rowTrigger.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowDown", bubbles: true }));
    await wait(() => Boolean(document.querySelector('[role="menu"]')), "the row menu to portal in");

    const subTrigger = probe(document, '[role="menuitem"][aria-haspopup="menu"]', "the submenu trigger");
    subTrigger.click();
    await wait(
      () => document.querySelectorAll('[role="menu"]').length >= 2,
      "the submenu to portal in beside its parent menu",
    );
    if (subTrigger.getAttribute("aria-expanded") !== "true") {
      throw new Error("the submenu opened without its trigger reporting aria-expanded=true");
    }
    // Two menu layers deep, both portalled out of the table. A portal that lost the theme root
    // still renders; its custom properties resolve to the empty string and it paints from document
    // defaults, which is indistinguishable from correct on a white page.
    const menus = [...document.querySelectorAll<HTMLElement>('[role="menu"]')];
    const rootMenuAccent = accentOf(menus[0]);
    if (!rootMenuAccent) throw new Error("the row menu resolves --ds-fill-accent to empty, so it lost the theme root");
    if (accentOf(menus[1]) !== rootMenuAccent) {
      throw new Error(
        `the submenu resolves --ds-fill-accent to ${accentOf(menus[1]) || "(empty)"} while its parent ` +
          `menu resolves ${rootMenuAccent}, so the two layers are not on the same theme`,
      );
    }

    /* Peel the submenu ALONE. `ArrowLeft` is the key that does this, and Escape is not: Radix
       routes Escape through the DismissableLayer and closes the WHOLE menu tree, which leaves no
       parent to drive the destructive item from (measured here: two open menus went straight to
       zero). The key must also arrive INSIDE the submenu, because Radix gates the close on
       `currentTarget.contains(event.target)`. */
    menus[1].dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowLeft", bubbles: true }));
    await wait(
      () => document.querySelectorAll('[role="menu"]').length === 1,
      "the submenu alone to close, leaving its parent menu open",
    );

    // ---- CROSSING 4: a confirm opened from state, gating on a field inside its trap ------------
    probe(document, '[role="menuitem"][data-tone="danger"]', "the destructive row item").click();
    await wait(
      () => Boolean(document.querySelector('[data-probe="rollback-confirm"]')),
      "the rollback confirm to portal in from the row menu",
    );
    const confirmPanel = probe(document, '[data-probe="rollback-confirm"]', "the rollback confirm");
    if (confirmPanel.getAttribute("role") !== "alertdialog") {
      throw new Error(`the confirm reports role="${confirmPanel.getAttribute("role")}" rather than alertdialog`);
    }

    const confirmInput = probe<HTMLInputElement>(document, '[data-probe="confirm-input"]', "the confirmation input");
    const action = () => probe<HTMLButtonElement>(document, '[data-probe="confirm-rollback"]', "the destructive action");
    if (!action().disabled) throw new Error("the destructive action must start disabled");

    // React tracks an input's value on the DOM node, so assigning `.value` is not seen. The native
    // setter plus a bubbled input event is what a real keystroke produces.
    const setValue = (el: HTMLInputElement, value: string) => {
      const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")!.set!;
      setter.call(el, value);
      el.dispatchEvent(new Event("input", { bubbles: true }));
    };
    setValue(confirmInput, "BLD-2408");
    await wait(() => confirmInput.value === "BLD-2408", "the near-miss value to land");
    if (!action().disabled) throw new Error("a near-miss build number must leave the action disabled");
    setValue(confirmInput, "BLD-2480");
    await wait(() => !action().disabled, "the action to enable on an exact match");

    // The field kept its own chrome inside the trap, which is the half a trap regression breaks
    // silently: the description is still associated, and its target is still in the document.
    const describedBy = confirmInput.getAttribute("aria-describedby");
    if (!describedBy) throw new Error("the confirmation field lost its description inside the confirm");
    if (!document.getElementById(describedBy)) {
      throw new Error(`aria-describedby points at ${describedBy}, which is not in the document`);
    }

    probe(document, '[data-probe="cancel-rollback"]', "the confirm's cancel").click();
    await wait(() => !document.querySelector('[data-probe="rollback-confirm"]'), "the confirm to close");

    // ---- CROSSING 2: a calendar portalling out of a dialog's focus trap ------------------------
    probe(canvasElement, '[data-probe="open-review"]', "the review dialog trigger").click();
    await wait(() => Boolean(document.querySelector('[data-probe="review-dialog"]')), "the review dialog to portal in");
    const dialog = probe(document, '[data-probe="review-dialog"]', "the review dialog");
    const dialogAccent = accentOf(dialog);
    if (!dialogAccent) throw new Error("the dialog resolves --ds-fill-accent to empty, so it lost the theme root");

    // The error field: aria-invalid set from the tone, and the message associated and present.
    const title = probe<HTMLInputElement>(dialog, '[data-probe="review-title"]', "the review title field");
    if (title.getAttribute("aria-invalid") !== "true") {
      throw new Error("the field carries an error validation but no aria-invalid inside the dialog");
    }
    const messageId = title.getAttribute("aria-describedby");
    const message = messageId ? document.getElementById(messageId) : null;
    if (!message || !(message.textContent ?? "").includes("needs a title")) {
      throw new Error("the validation message is not associated with the field inside the dialog");
    }

    // The Select keeps its field chrome too: a label element pointing at the trigger by id.
    const selectTrigger = probe(dialog, 'button[role="combobox"]', "the reviewer-group trigger");
    if (!selectTrigger.id || !dialog.querySelector(`label[for="${selectTrigger.id}"]`)) {
      throw new Error("the Select's label is not associated with its trigger inside the dialog");
    }

    probe(dialog, '[data-probe="review-date"] button[aria-label="Choose date"]', "the calendar trigger").click();
    await wait(() => Boolean(document.querySelector('[role="grid"]')), "the calendar to portal out of the dialog");
    const grid = probe(document, '[role="grid"]', "the calendar grid");
    if (accentOf(grid) !== dialogAccent) {
      throw new Error(
        `the calendar resolves --ds-fill-accent to ${accentOf(grid) || "(empty)"} while the dialog resolves ` +
          `${dialogAccent}, so the nested portal is on a different theme`,
      );
    }
    // The other half, which a look cannot catch: a trap that does not recognise the calendar pulls
    // focus straight back and the picker is keyboard-dead while looking entirely correct.
    await wait(
      () => grid.contains(document.activeElement) || Boolean(grid.querySelector('[tabindex="0"]')),
      "focus or a roving tab stop to land inside the calendar rather than be pulled back",
    );

    // Escape rides the DismissableLayer stack, which listens on the document, so it is dispatched
    // there rather than on a focused node. One press peels the calendar only.
    document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
    await wait(() => !document.querySelector('[role="grid"]'), "the calendar to dismiss without taking the dialog");
    if (!document.querySelector('[data-probe="review-dialog"]')) {
      throw new Error("one Escape closed the dialog as well as the calendar, so the layer stack collapsed");
    }
    document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
    await wait(() => !document.querySelector('[data-probe="review-dialog"]'), "the dialog to dismiss");

    // ---- CROSSING 1: a portal inside a portal, left OPEN for axe -------------------------------
    probe(canvasElement, '[data-probe="open-filters"]', "the filters trigger").click();
    await wait(() => Boolean(document.querySelector('[data-probe="filter-panel"]')), "the filter popover to portal in");
    const panel = probe(document, '[data-probe="filter-panel"]', "the filter panel");

    // THE [[popover-accessible-name]] CATCH, asserted rather than left to axe. Radix hardcodes role="dialog" on the panel,
    // so an unnamed one announces "dialog" and nothing else. The name may come from either route;
    // what matters is that it RESOLVES to text.
    const labelledBy = panel.getAttribute("aria-labelledby");
    const panelName = panel.getAttribute("aria-label") ?? (labelledBy ? document.getElementById(labelledBy)?.textContent : null);
    if (!panelName || !panelName.trim()) {
      throw new Error("the popover panel is a role=dialog with no accessible name (WCAG 4.1.2, [[popover-accessible-name]])");
    }
    const panelAccent = accentOf(panel);
    if (!panelAccent) throw new Error("the popover panel resolves --ds-fill-accent to empty, so it lost the theme root");

    probe(panel, 'button[aria-haspopup="listbox"]', "the MultiSelect trigger inside the panel").click();
    await wait(
      () => Boolean(document.querySelector('[role="listbox"]')),
      "the listbox to portal in from inside the popover",
    );
    const listbox = probe(document, '[role="listbox"]', "the listbox");
    if (!(listbox.getAttribute("aria-label") ?? "").trim()) {
      throw new Error("the listbox two portals deep carries no accessible name");
    }
    if (accentOf(listbox) !== panelAccent) {
      throw new Error(
        `the nested listbox resolves --ds-fill-accent to ${accentOf(listbox) || "(empty)"} while its parent ` +
          `panel resolves ${panelAccent}, so the two portals are not on the same theme`,
      );
    }
    // Left open deliberately. Both surfaces are non-modal, so nothing behind them is aria-hidden
    // and axe scans the whole screen plus both panels plus the live toast.
  },
};
