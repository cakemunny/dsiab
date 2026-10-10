import type { Meta, StoryObj } from "@storybook/react-vite";
import { Box, Flex } from "@radix-ui/themes";
import { Table } from "./Table";

/* Test-only behaviour for Table, kept out of the docs stories (Components/Data/Table).
   Underscore-prefixed file, so it is registry-guard-exempt and grouped under _internal.

   What this guards: A TABLE THAT OVERFLOWS IS ONE NAMED KEYBOARD STOP ([[scroll-area-keyboard-stop]], applied to
   Table). Radix renders its own ScrollArea inside the table root and puts no tab stop on the viewport, so
   a table whose columns outrun the container cannot be scrolled by keyboard in a browser that gives a
   scroller no stop of its own. The system gives that viewport tabindex="0", role="region" and an
   aria-labelledby that points at the caption. A table that fits and a table that holds a link take no
   stop. A caller's tabIndex stays on the root, and the viewport still takes its stop, because focus on
   the root cannot scroll the table. */

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

    // A caller's tabIndex lands on the root, which cannot scroll the table. The root keeps it, and the viewport
    // that scrolls still takes its own stop.
    const callerRoot = canvasElement.querySelector<HTMLElement>('[data-testid="caller-tabindex"]')!;
    if (callerRoot.getAttribute("tabindex") !== "0") throw new Error(`a caller's tabIndex must stay on the root; got ${callerRoot.getAttribute("tabindex")}`);
    const caller = viewportOf(canvasElement, "caller-tabindex");
    if (caller.getAttribute("tabindex") !== "0") throw new Error("the overflowing viewport must still be a keyboard stop when the root carries the caller's tabIndex");
  },
};
