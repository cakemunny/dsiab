import type { Meta, StoryObj } from "@storybook/react-vite";
import { Box, Text } from "@radix-ui/themes";
import { ChatToolCalls, type ChatToolCallItem } from "./ChatToolCalls";

/* Test-only behavior for ChatToolCalls. Everything that DRIVES the component lives here — the docs
   pages are static on view, so a play that opens a disclosure or measures a truncation belongs in
   this file. Underscore-prefixed → _internal, and exempt from the story guards. */

/** Let React commit the state a real click just queued. A click handler outside `act` flushes on the
 *  next task, so reading the DOM synchronously after `.click()` reads the PREVIOUS render. */
const tick = (ms = 0) => new Promise((r) => setTimeout(r, ms));

/** Anything the browser will put a tab stop on. */
const FOCUSABLE =
  'a[href], button, input, select, textarea, [tabindex]:not([tabindex="-1"]), [contenteditable="true"]';

const GROUP: ChatToolCallItem[] = [
  { name: "read_tokens", target: "src/tokens/semantic.css", duration: "88ms" },
  { name: "measure_contrast", target: "--ds-text-weak", duration: "1.1s", resultDetail: <Text size="1">4.73 : 1</Text> },
  { name: "apply_accent", status: "running", target: "teal" },
];

const meta: Meta<typeof ChatToolCalls> = {
  title: "_internal/ChatToolCalls behavior",
  component: ChatToolCalls,
  parameters: { controls: { disable: true } },
};
export default meta;
type Story = StoryObj<typeof ChatToolCalls>;

/** [[chat-tool-log]] — a collapsed group has NO focusable descendants. Nothing is opened; the closed body is
 *  unmounted by the substrate, so there is no hidden tab stop to reach with the keyboard. */
export const CollapsedHasNoTabStops: Story = {
  render: () => (
    <Box p="5" style={{ maxWidth: 520 }}>
      <ChatToolCalls calls={GROUP} />
    </Box>
  ),
  play: async ({ canvasElement }) => {
    const root = canvasElement.querySelector<HTMLElement>(".rt-ds-chat-toolcalls");
    if (!root) throw new Error("no ChatToolCalls root rendered");

    // The group is CLOSED on arrival — no `defaultOpen`, and the substrate's own default is closed.
    const trigger = root.querySelector<HTMLElement>(".rt-ds-collapsible-trigger");
    if (!trigger) throw new Error("no group summary trigger rendered");
    if (trigger.getAttribute("aria-expanded") !== "false")
      throw new Error(`the group must start collapsed; aria-expanded=${trigger.getAttribute("aria-expanded")}`);

    // Nothing focusable inside the collapsed body, and no rows at all — not "focusable but inert".
    const body = root.querySelector<HTMLElement>(".rt-ds-collapsible-content");
    if (!body) throw new Error("no collapsible content element rendered");
    const hidden = body.querySelectorAll(FOCUSABLE);
    if (hidden.length !== 0)
      throw new Error(`a collapsed group must have ZERO focusable descendants; found ${hidden.length}`);
    const rows = body.querySelectorAll(".rt-ds-chat-toolcalls-row");
    if (rows.length !== 0)
      throw new Error(`a collapsed group must unmount its rows; found ${rows.length} still in the DOM`);

    // Exactly one tab stop in the whole component: the summary trigger itself.
    const stops = root.querySelectorAll(FOCUSABLE);
    if (stops.length !== 1 || stops[0] !== trigger)
      throw new Error(`a collapsed group must expose exactly one tab stop (the summary); found ${stops.length}`);
  },
};

/** The group disclosure, driven through the REAL trigger: rows mount on open and unmount on close. */
export const GroupDisclosure: Story = {
  render: () => (
    <Box p="5" style={{ maxWidth: 520 }}>
      <ChatToolCalls calls={GROUP} />
    </Box>
  ),
  play: async ({ canvasElement }) => {
    const root = canvasElement.querySelector<HTMLElement>(".rt-ds-chat-toolcalls")!;
    const trigger = root.querySelector<HTMLElement>(".rt-ds-collapsible-trigger")!;

    // Collapsed, the summary names the LATEST call — the one a reader watching the turn cares about.
    if (!/apply_accent/.test(trigger.textContent ?? ""))
      throw new Error(`the summary must show the latest call's name; got “${trigger.textContent}”`);
    if (!/3 calls/.test(trigger.textContent ?? ""))
      throw new Error(`the summary must show the call count; got “${trigger.textContent}”`);

    trigger.click();
    await tick(260);
    if (trigger.getAttribute("aria-expanded") !== "true")
      throw new Error("clicking the summary must expand the group");
    const open = root.querySelectorAll(".rt-ds-chat-toolcalls-row");
    if (open.length !== GROUP.length)
      throw new Error(`expanding must mount one row per call; got ${open.length} of ${GROUP.length}`);

    trigger.click();
    await tick(400);
    if (root.querySelectorAll(".rt-ds-chat-toolcalls-row").length !== 0)
      throw new Error("collapsing must unmount the rows again");
  },
};

/** [[chat-tool-log]] / [[chat-tool-log]] — a row carrying a result is a REAL <button> that unfolds its output, and a failed
 *  row prints its reason as visible text rather than hiding it in a title attribute. */
export const RowDetailDisclosure: Story = {
  render: () => (
    <Box p="5" style={{ maxWidth: 520 }}>
      <ChatToolCalls
        calls={[{
          name: "measure_contrast",
          status: "error",
          target: "--ds-text-weak",
          errorMessage: "The probe never resolved.",
          resultDetail: <Text size="1" data-testid="detail">measured 3.78 against a floor of 4.5</Text>,
        }]}
      />
    </Box>
  ),
  play: async ({ canvasElement }) => {
    const root = canvasElement.querySelector<HTMLElement>(".rt-ds-chat-toolcalls")!;

    const toggle = root.querySelector<HTMLElement>(".rt-ds-chat-toolcalls-toggle");
    if (!toggle) throw new Error("a row with a result must render a disclosure control");
    if (toggle.tagName !== "BUTTON")
      throw new Error(`the row disclosure must be a real <button>; got <${toggle.tagName.toLowerCase()}>`);
    if (toggle.getAttribute("role") === "button")
      throw new Error("the row must not carry role=button — it is a button");

    // Its accessible name comes from the row itself, so it is never an unnamed control.
    if (!/measure_contrast/.test(toggle.textContent ?? ""))
      throw new Error(`the row button must be named by its own content; got “${toggle.textContent}”`);

    // Closed: aria-expanded false, and NO aria-controls (pointing at an unmounted id is invalid).
    if (toggle.getAttribute("aria-expanded") !== "false") throw new Error("the row must start closed");
    if (toggle.hasAttribute("aria-controls"))
      throw new Error("a closed row must not reference a panel that does not exist");

    // [[chat-tool-log]]: the failure reason is REAL text in the row, not a title attribute.
    const reason = root.querySelector<HTMLElement>(".rt-ds-chat-toolcalls-error");
    if (!reason) throw new Error("a failed call must render its reason as visible text");
    if (reason.getClientRects().length === 0)
      throw new Error("the failure reason must be visible, not clipped out of the layout");
    if (root.querySelector("[title]")) throw new Error("the reason must not be hidden in a title attribute");

    toggle.click();
    await tick();
    if (toggle.getAttribute("aria-expanded") !== "true") throw new Error("activating the row must open it");
    const id = toggle.getAttribute("aria-controls");
    if (!id) throw new Error("an open row must point aria-controls at its panel");
    const panel = root.querySelector(`#${CSS.escape(id)}`);
    if (!panel) throw new Error(`aria-controls=${id} must name a mounted element`);
    if (!panel.querySelector('[data-testid="detail"]')) throw new Error("the panel must render resultDetail");

    toggle.click();
    await tick();
    if (root.querySelector(".rt-ds-chat-toolcalls-detail")) throw new Error("activating again must close the panel");
  },
};

/** A single call is a bare row: no summary, no disclosure, nothing to open. An empty array renders
 *  nothing at all rather than an empty shell. */
export const SingleAndEmpty: Story = {
  render: () => (
    <Box p="5" style={{ maxWidth: 520 }}>
      <Box data-testid="one"><ChatToolCalls calls={[{ name: "read_tokens", target: "src/tokens/semantic.css", duration: "88ms" }]} /></Box>
      <Box data-testid="none"><ChatToolCalls calls={[]} /></Box>
    </Box>
  ),
  play: async ({ canvasElement }) => {
    const one = canvasElement.querySelector<HTMLElement>('[data-testid="one"]')!;
    if (one.querySelector(".rt-ds-collapsible"))
      throw new Error("a single call must render with NO group chrome");
    if (one.querySelectorAll(".rt-ds-chat-toolcalls-row").length !== 1)
      throw new Error("a single call must render exactly one row");
    if (one.querySelectorAll(FOCUSABLE).length !== 0)
      throw new Error("a single call with no result must expose no tab stop");

    const none = canvasElement.querySelector<HTMLElement>('[data-testid="none"]')!;
    if (none.querySelector(".rt-ds-chat-toolcalls"))
      throw new Error("an empty calls array must render nothing at all");
  },
};

/** [[chat-tool-log]] — queued and running are told apart WITHOUT colour: only running spins, and only queued
 *  carries a visible word. Every state also contributes its word to the row's text. */
export const StatesAreDistinguishable: Story = {
  render: () => (
    <Box p="5" style={{ maxWidth: 520 }}>
      <Box data-testid="pending"><ChatToolCalls calls={[{ name: "apply_accent", status: "pending" }]} /></Box>
      <Box data-testid="running"><ChatToolCalls calls={[{ name: "apply_accent", status: "running" }]} /></Box>
      <Box data-testid="complete"><ChatToolCalls calls={[{ name: "apply_accent", status: "complete" }]} /></Box>
      <Box data-testid="error"><ChatToolCalls calls={[{ name: "apply_accent", status: "error" }]} /></Box>
    </Box>
  ),
  play: async ({ canvasElement }) => {
    const at = (id: string) => canvasElement.querySelector<HTMLElement>(`[data-testid="${id}"]`)!;

    // Only `running` spins. The reference shape this replaces spun for both, which made a call that
    // had not started look like one that was working.
    if (at("running").querySelectorAll(".rt-Spinner").length !== 1)
      throw new Error("a running call must render the spinner");
    if (at("pending").querySelector(".rt-Spinner"))
      throw new Error("a queued call must NOT render a spinner — it is not working yet");

    // And `pending` says so in words a reader can see, not just a glyph they have to decode.
    const label = at("pending").querySelector<HTMLElement>(".rt-ds-chat-toolcalls-statuslabel");
    if (!label) throw new Error("a queued call must carry a visible state label");
    if (label.textContent !== "Queued") throw new Error(`expected the visible word “Queued”; got “${label.textContent}”`);
    if (label.getClientRects().length === 0) throw new Error("the queued label must actually be visible");

    // Each state contributes its word to the row's text, so the log is legible without colour.
    for (const [id, word] of [["running", "Running"], ["complete", "Done"], ["error", "Failed"]] as const) {
      if (!(at(id).textContent ?? "").includes(word))
        throw new Error(`the ${id} row must name its state (“${word}”); got “${at(id).textContent}”`);
    }

    // The four glyph colours are four DIFFERENT roles — colour is a second signal, never the only one,
    // but it still must not collapse to one hue.
    const inks = new Set(
      ["pending", "running", "complete", "error"].map((id) =>
        getComputedStyle(at(id).querySelector<HTMLElement>(".rt-ds-chat-toolcalls-status")!).color,
      ),
    );
    if (inks.size !== 4) throw new Error(`the four states must ink from four distinct roles; got ${inks.size}`);
  },
};

/** The truncation ladder: the target gives up width, the name holds on, the duration never moves. */
export const TruncationLadder: Story = {
  render: () => (
    <Box p="5">
      <Box data-testid="roomy" style={{ width: 560 }}>
        <ChatToolCalls calls={[{ name: "search_symbols", target: "src/components/ui/ChatToolCalls.stories.tsx", duration: "240ms" }]} />
      </Box>
      <Box data-testid="tight" style={{ width: 220 }}>
        <ChatToolCalls calls={[{ name: "search_symbols", target: "src/components/ui/ChatToolCalls.stories.tsx", duration: "240ms" }]} />
      </Box>
    </Box>
  ),
  play: async ({ canvasElement }) => {
    const part = (frame: string, cls: string) =>
      canvasElement.querySelector<HTMLElement>(`[data-testid="${frame}"] .rt-ds-chat-toolcalls-${cls}`)!;

    const roomyTarget = part("roomy", "target");
    if (roomyTarget.scrollWidth > roomyTarget.clientWidth + 1)
      throw new Error("at 560px nothing should be truncated — the fixture is not proving anything");

    const name = part("tight", "name");
    const target = part("tight", "target");
    const duration = part("tight", "duration");

    // The target absorbs the shrink…
    const targetLost = target.scrollWidth - target.clientWidth;
    if (targetLost <= 0) throw new Error("at 220px the target must be the part that truncates");
    // …far more than the name does, which is the ladder (flex-shrink 10 vs 1).
    const nameLost = name.scrollWidth - name.clientWidth;
    if (!(targetLost > nameLost))
      throw new Error(`the target must give up more width than the name; target lost ${targetLost}px, name lost ${nameLost}px`);
    // …and the name never falls below its 4ch floor.
    if (name.clientWidth < 20)
      throw new Error(`the tool name must keep at least ~4 characters; it is ${name.clientWidth}px wide`);
    // …while the duration does not shrink at all.
    if (duration.scrollWidth > duration.clientWidth + 1)
      throw new Error(`the duration must never shrink; it lost ${duration.scrollWidth - duration.clientWidth}px`);
  },
};
