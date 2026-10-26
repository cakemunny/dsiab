import type { Meta, StoryObj } from "@storybook/react-vite";
import { Box, Flex } from "@radix-ui/themes";
import { Table } from "./Table";

/* Test-only behaviour for Table, kept out of the docs stories (Components/Data/Table).
   Underscore-prefixed file, so it is registry-guard-exempt and grouped under _internal.

   What this guards: A TABLE THAT OVERFLOWS IS ONE NAMED KEYBOARD STOP ([[scroll-area-keyboard-stop]], applied to
   Table). Radix renders its own ScrollArea inside the table root and puts no tab stop on the viewport, so
   a table whose columns outrun the container cannot be scrolled by keyboard in a browser that gives a
   scroller no stop of its own. The system gives that viewport tabindex="0", and a named table's viewport
   also takes role="region" and an aria-labelledby that points at the caption. An unnamed table gets the
   stop with no role, as an unnamed ScrollArea does. A table that fits and a table that holds a link take no
   stop. A caller's tabIndex goes on the viewport, never on the root, because focus on the root cannot
   scroll the table, so the table keeps one stop. */

const COLUMNS = ["Region", "Quarter", "Revenue", "Margin", "Headcount", "Churn", "Pipeline", "Forecast"];
const WIDE = { width: 260 };

function Rows({ link = false }: { link?: boolean }) {
  return (
    <>
      <Table.Header>
        <Table.Row>
          {COLUMNS.map((c) => <Table.ColumnHeaderCell key={c} style={{ whiteSpace: "nowrap" }}>{c}</Table.ColumnHeaderCell>)}
        </Table.Row>
      </Table.Header>
      <Table.Body>
        <Table.Row>
          {COLUMNS.map((c, i) => (
            <Table.Cell key={c} style={{ whiteSpace: "nowrap" }}>
              {link && i === 0 ? <a href="#region">North America</a> : `${c} value for this row`}
            </Table.Cell>
          ))}
        </Table.Row>
      </Table.Body>
    </>
  );
}

const meta: Meta<typeof Table.Root> = {
  title: "_internal/Table behavior",
  parameters: { controls: { disable: true } },
};
export default meta;
type Story = StoryObj<typeof Table.Root>;

const viewportOf = (root: HTMLElement, id: string) =>
  root.querySelector<HTMLElement>(`[data-testid="${id}"] .rt-ScrollAreaViewport`)!;
const waitFrames = () => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));

export const OverflowStop: Story = {
  render: () => (
    <Flex direction="column" gap="5" p="4">
      <Box style={WIDE}>
        <Table.Root data-testid="overflowing" caption="Quarterly results by region"><Rows /></Table.Root>
      </Box>
      <Box style={{ width: 2000 }}>
        <Table.Root data-testid="fitting" aria-label="Quarterly results, fitting"><Rows /></Table.Root>
      </Box>
      <Box style={WIDE}>
        <Table.Root data-testid="with-link" aria-label="Quarterly results with a link"><Rows link /></Table.Root>
      </Box>
      <Box style={WIDE}>
        <Table.Root data-testid="unnamed"><Rows /></Table.Root>
      </Box>
      <Box style={WIDE}>
        <Table.Root data-testid="caller-tabindex" aria-label="Quarterly results, caller stop" tabIndex={0}><Rows /></Table.Root>
      </Box>
    </Flex>
  ),
  play: async ({ canvasElement }) => {
    await waitFrames();

    // Overflowing, text only, named by a visible caption: one named stop on the viewport.
    const over = viewportOf(canvasElement, "overflowing");
    if (!(over.scrollWidth > over.clientWidth)) throw new Error("precondition: the narrow table must overflow its container");
    if (over.getAttribute("tabindex") !== "0") throw new Error(`an overflowing table must be a keyboard stop; tabindex is ${over.getAttribute("tabindex")}`);
    if (over.getAttribute("role") !== "region") throw new Error(`an overflowing table's stop must carry role="region"; got ${over.getAttribute("role")}`);
    const labelId = over.getAttribute("aria-labelledby");
    const label = labelId ? document.getElementById(labelId) : null;
    if (label?.tagName !== "CAPTION" || label.textContent !== "Quarterly results by region")
      throw new Error(`the stop must be named by the table's caption; aria-labelledby="${labelId}" resolves to ${label ? `<${label.tagName.toLowerCase()}> "${label.textContent}"` : "nothing"}`);

    // Fitting: no stop at all.
    const fit = viewportOf(canvasElement, "fitting");
    if (fit.scrollWidth > fit.clientWidth) throw new Error("precondition: the wide table must fit its container");
    if (fit.hasAttribute("tabindex") || fit.hasAttribute("role")) throw new Error("a table that fits must take no keyboard stop");

    // Holding a link: the link is the way in, so the viewport takes no stop.
    const linked = viewportOf(canvasElement, "with-link");
    if (linked.hasAttribute("tabindex")) throw new Error("a table that holds a link must take no stop of its own");

    // Unnamed: the stop, with no region role and no aria-labelledby, because a region with no name is noise.
    const unnamed = viewportOf(canvasElement, "unnamed");
    if (unnamed.getAttribute("tabindex") !== "0") throw new Error("an unnamed overflowing table must still be a keyboard stop");
    if (unnamed.hasAttribute("role") || unnamed.hasAttribute("aria-labelledby"))
      throw new Error(`an unnamed table's stop must carry no region role and no aria-labelledby; got role=${unnamed.getAttribute("role")} aria-labelledby=${unnamed.getAttribute("aria-labelledby")}`);

    // A caller's tabIndex goes on the viewport that scrolls, never on the root, so the table keeps one named stop.
    const callerRoot = canvasElement.querySelector<HTMLElement>('[data-testid="caller-tabindex"]')!;
    if (callerRoot.hasAttribute("tabindex")) throw new Error(`a caller's tabIndex must not land on the root, which cannot scroll; got tabindex=${callerRoot.getAttribute("tabindex")}`);
    const caller = viewportOf(canvasElement, "caller-tabindex");
    if (caller.getAttribute("tabindex") !== "0" || caller.getAttribute("role") !== "region")
      throw new Error(`the caller's tabIndex must land on the named viewport; got tabindex=${caller.getAttribute("tabindex")} role=${caller.getAttribute("role")}`);
  },
};

/* The stop follows the overflow, not the first render. The container widens until the table fits, so the
   stop must go, then narrows again, so the stop must come back. This is the upstream rule for a scroller:
   it joins the tab order only while it has something to scroll. */
export const StopFollowsOverflow: Story = {
  render: () => (
    <Box p="4" data-testid="frame" style={WIDE}>
      <Table.Root data-testid="resizing" aria-label="Quarterly results, resizing"><Rows /></Table.Root>
    </Box>
  ),
  play: async ({ canvasElement }) => {
    const frame = canvasElement.querySelector<HTMLElement>('[data-testid="frame"]')!;
    const viewport = viewportOf(canvasElement, "resizing");
    const settle = async (want: string | null) => {
      const t0 = performance.now();
      while (viewport.getAttribute("tabindex") !== want && performance.now() - t0 < 1500) await waitFrames();
      return viewport.getAttribute("tabindex");
    };

    if (!(viewport.scrollWidth > viewport.clientWidth)) throw new Error("precondition: the narrow table must overflow its container");
    if ((await settle("0")) !== "0") throw new Error("a table that overflows must be a keyboard stop");

    frame.style.width = "2000px";
    const wide = await settle(null);
    if (viewport.scrollWidth > viewport.clientWidth) throw new Error("precondition: the widened table must fit its container");
    if (wide !== null) throw new Error(`a table that stops overflowing must leave the tab order; tabindex is ${wide}`);

    frame.style.width = `${WIDE.width}px`;
    if ((await settle("0")) !== "0") throw new Error("a table that overflows again must take its keyboard stop back");
  },
};
