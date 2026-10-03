import { useState } from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { Box } from "@radix-ui/themes";
import { IconButton } from "./IconButton";
import { Paperclip } from "@phosphor-icons/react";
import { ChatComposer } from "./ChatComposer";

/* Test-only behavior for ChatComposer. Everything that DRIVES the component lives here — the docs
   pages are static on view, so a play that types, submits, focuses or grows the box belongs in this
   file. Underscore-prefixed → _internal, and exempt from the story guards.

   Plays are hand-rolled (no @storybook/test): native driving, assertions by throw. */

/** Let React commit the state an event just queued. A handler dispatched outside `act` flushes on
 *  the next task, so reading the DOM synchronously after a dispatch reads the PREVIOUS render. */
const tick = (ms = 0) => new Promise((r) => setTimeout(r, ms));

/** Type into a React-controlled textarea the way the browser does: set the value through the
 *  NATIVE setter (React patches the instance one, and writing `el.value` directly is invisible to
 *  it) and fire the input event React actually listens for. This is the real onChange path — not a
 *  call into the component's own handler. */
function typeInto(el: HTMLTextAreaElement, text: string): void {
  const setter = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, "value")?.set;
  if (!setter) throw new Error("no native value setter on HTMLTextAreaElement");
  setter.call(el, text);
  el.dispatchEvent(new Event("input", { bubbles: true }));
}

/** A real key event on the real node. Returns the event so a play can read `defaultPrevented` —
 *  which is how "Shift+Enter is left to the platform" is proven without a trusted keypress. */
function pressKey(el: HTMLElement, key: string, init: KeyboardEventInit = {}): KeyboardEvent {
  const event = new KeyboardEvent("keydown", { key, bubbles: true, cancelable: true, ...init });
  el.dispatchEvent(event);
  return event;
}

const inputOf = (root: HTMLElement) => {
  const el = root.querySelector<HTMLTextAreaElement>(".rt-ds-chat-composer .rt-TextAreaInput");
  if (!el) throw new Error("no composer textarea rendered");
  return el;
};

const lines = (n: number) => Array.from({ length: n }, (_, i) => `line ${i + 1}`).join("\n");

const meta: Meta<typeof ChatComposer> = {
  title: "_internal/ChatComposer behavior",
  component: ChatComposer,
  parameters: { controls: { disable: true } },
};
export default meta;
type Story = StoryObj<typeof ChatComposer>;

/** AUTOGROW. The box grows with its content and stops at eight lines, after which it scrolls.
 *  Every number here is derived from the element's OWN measured line-height, so the assertion
 *  holds at any type scale rather than pinning the pixel heights this theme happens to produce. */
export const AutogrowGrowsThenCaps: Story = {
  render: () => (
    <Box p="5" style={{ maxWidth: 520 }}>
      <ChatComposer onSubmit={() => {}} label="Message" />
    </Box>
  ),
  play: async ({ canvasElement }) => {
    const input = inputOf(canvasElement);
    const lineHeight = Number.parseFloat(getComputedStyle(input).lineHeight);
    if (!Number.isFinite(lineHeight) || lineHeight <= 0)
      throw new Error(`the cap is computed from line-height; it read as “${getComputedStyle(input).lineHeight}”`);

    const at = async (n: number) => {
      typeInto(input, lines(n));
      await tick();
      return { height: input.getBoundingClientRect().height, overflow: getComputedStyle(input).overflowY };
    };

    const one = await at(1);
    const four = await at(4);
    const eight = await at(8);
    const twelve = await at(12);

    // It grows.
    if (!(four.height > one.height))
      throw new Error(`four lines must be taller than one; got ${four.height} vs ${one.height}`);
    if (!(eight.height > four.height))
      throw new Error(`eight lines must be taller than four; got ${eight.height} vs ${four.height}`);

    // Each step is worth about one line — the growth tracks the content, not an arbitrary ramp.
    const perLine = (four.height - one.height) / 3;
    if (Math.abs(perLine - lineHeight) > 1.5)
      throw new Error(`each line must add about one line-height (${lineHeight}px); it added ${perLine.toFixed(2)}px`);

    // …and it STOPS. Twelve lines is the same height as eight.
    if (Math.abs(twelve.height - eight.height) > 1)
      throw new Error(`the box must cap at eight lines; eight = ${eight.height}px, twelve = ${twelve.height}px`);

    // The cap itself is eight line-heights plus the box's own padding and borders.
    const cs = getComputedStyle(input);
    const chrome =
      Number.parseFloat(cs.paddingBlockStart) + Number.parseFloat(cs.paddingBlockEnd) +
      Number.parseFloat(cs.borderBlockStartWidth) + Number.parseFloat(cs.borderBlockEndWidth);
    const expected = 8 * lineHeight + chrome;
    if (Math.abs(eight.height - expected) > 1.5)
      throw new Error(`the cap must be 8 × line-height + padding + borders (${expected.toFixed(2)}px); measured ${eight.height}px`);

    // Under the cap the box must not scroll — a scrollbar on a box that could have grown is the
    // defect this whole mechanism exists to avoid.
    if (four.overflow !== "hidden")
      throw new Error(`under the cap the textarea must not scroll; overflow-y is “${four.overflow}”`);
    if (twelve.overflow !== "auto")
      throw new Error(`past the cap the textarea must scroll; overflow-y is “${twelve.overflow}”`);
    if (!(input.scrollHeight > input.clientHeight + 1))
      throw new Error("past the cap there must be content out of view to scroll to");
  },
};

/** ENTER SENDS, and it sends the TRIMMED value and clears the box. Driven with a real key event
 *  on the real textarea — never by reaching into the component's handler. */
export const EnterSubmitsAndClears: Story = {
  render: function EnterSubmits() {
    const [sent, setSent] = useState<string[]>([]);
    return (
      <Box p="5" style={{ maxWidth: 520 }}>
        <ChatComposer onSubmit={(v) => setSent((s) => [...s, v])} label="Message" />
        <div data-testid="sent">{JSON.stringify(sent)}</div>
      </Box>
    );
  },
  play: async ({ canvasElement }) => {
    const input = inputOf(canvasElement);
    const sent = () => canvasElement.querySelector<HTMLElement>('[data-testid="sent"]')!.textContent;

    typeInto(input, "  switch the accent to teal  ");
    await tick();

    const event = pressKey(input, "Enter");
    await tick();

    if (!event.defaultPrevented)
      throw new Error("Enter must be consumed by the composer, or the browser also inserts a newline");
    if (sent() !== JSON.stringify(["switch the accent to teal"]))
      throw new Error(`Enter must submit the TRIMMED value; onSubmit saw ${sent()}`);
    if (input.value !== "")
      throw new Error(`sending must clear the box; it still holds “${input.value}”`);
  },
};

/** SHIFT+ENTER is the platform's key, not ours: the composer must not submit, and must not
 *  consume the event — leaving the browser to insert the newline it always would. */
export const ShiftEnterDoesNotSubmit: Story = {
  render: function ShiftEnter() {
    const [count, setCount] = useState(0);
    return (
      <Box p="5" style={{ maxWidth: 520 }}>
        <ChatComposer onSubmit={() => setCount((c) => c + 1)} label="Message" />
        <div data-testid="count">{count}</div>
      </Box>
    );
  },
  play: async ({ canvasElement }) => {
    const input = inputOf(canvasElement);
    const count = () => canvasElement.querySelector<HTMLElement>('[data-testid="count"]')!.textContent;

    typeInto(input, "first line");
    await tick();

    const event = pressKey(input, "Enter", { shiftKey: true });
    await tick();

    if (count() !== "0") throw new Error(`Shift+Enter must not submit; onSubmit fired ${count()} time(s)`);
    if (event.defaultPrevented)
      throw new Error("Shift+Enter must be left to the browser — preventing it removes the newline");
    if (input.value !== "first line")
      throw new Error(`Shift+Enter must not clear the box; it holds “${input.value}”`);
  },
};

/** NOTHING TO SEND IS A NO-OP. Not an empty message, not a clear, and not a newline either — the
 *  key is still consumed, so "Enter does nothing" cannot quietly mean "Enter adds a blank line". */
export const WhitespaceOnlyEnterDoesNothing: Story = {
  render: function Whitespace() {
    const [count, setCount] = useState(0);
    return (
      <Box p="5" style={{ maxWidth: 520 }}>
        <ChatComposer onSubmit={() => setCount((c) => c + 1)} label="Message" />
        <div data-testid="count">{count}</div>
      </Box>
    );
  },
  play: async ({ canvasElement }) => {
    const input = inputOf(canvasElement);
    const count = () => canvasElement.querySelector<HTMLElement>('[data-testid="count"]')!.textContent;

    typeInto(input, "   \t  ");
    await tick();

    const event = pressKey(input, "Enter");
    await tick();

    if (count() !== "0") throw new Error(`a whitespace-only value must not submit; onSubmit fired ${count()} time(s)`);
    if (input.value !== "   \t  ")
      throw new Error(`a no-op must not clear the box; it holds “${input.value}”`);
    if (!event.defaultPrevented)
      throw new Error("Enter must still be consumed, or a no-op silently becomes a newline");

    // And the send control agrees with the keyboard: there is nothing to send.
    const send = canvasElement.querySelector<HTMLButtonElement>('.rt-ds-chat-composer-send[data-mode="send"]')!;
    if (!send.disabled) throw new Error("with nothing to send the send control must be disabled");
  },
};

/** THE SEND CONTROL gates on the same rule the keyboard does, and sends through a real click. */
export const SendControlGating: Story = {
  render: function Gating() {
    const [sent, setSent] = useState<string[]>([]);
    return (
      <Box p="5" style={{ maxWidth: 520 }}>
        <ChatComposer onSubmit={(v) => setSent((s) => [...s, v])} label="Message" />
        <div data-testid="sent">{JSON.stringify(sent)}</div>
      </Box>
    );
  },
  play: async ({ canvasElement }) => {
    const input = inputOf(canvasElement);
    const send = () => canvasElement.querySelector<HTMLButtonElement>('.rt-ds-chat-composer-send[data-mode="send"]')!;
    const sent = () => canvasElement.querySelector<HTMLElement>('[data-testid="sent"]')!.textContent;

    if (!send().disabled) throw new Error("an empty composer must render a disabled send control");
    if (!send().getAttribute("aria-label"))
      throw new Error("the send control is icon-only and must carry an accessible name");

    typeInto(input, "measure the contrast");
    await tick();
    if (send().disabled) throw new Error("with something to send the control must become enabled");

    send().click();
    await tick();
    if (sent() !== JSON.stringify(["measure the contrast"]))
      throw new Error(`clicking send must submit; onSubmit saw ${sent()}`);
    if (input.value !== "") throw new Error("clicking send must clear the box");
  },
};

/** THE SEND → STOP SWAP. One control in the DOM at a time, each with its own accessible name, and
 *  stop stays live even while the rest of the composer is off — the only thing left to do while a
 *  response is generating is to end it. */
export const StopSwap: Story = {
  render: function Swap() {
    const [stops, setStops] = useState(0);
    return (
      <Box p="5" style={{ maxWidth: 520 }}>
        <div data-testid="live">
          <ChatComposer onSubmit={() => {}} label="Message" isStopShown onStop={() => setStops((s) => s + 1)} />
        </div>
        <div data-testid="off">
          <ChatComposer onSubmit={() => {}} label="Message" isStopShown disabled onStop={() => setStops((s) => s + 1)} />
        </div>
        <div data-testid="stops">{stops}</div>
      </Box>
    );
  },
  play: async ({ canvasElement }) => {
    const at = (id: string) => canvasElement.querySelector<HTMLElement>(`[data-testid="${id}"]`)!;
    const stops = () => at("stops").textContent;

    const stop = at("live").querySelector<HTMLButtonElement>('.rt-ds-chat-composer-send[data-mode="stop"]');
    if (!stop) throw new Error("isStopShown must render the stop control");
    if (at("live").querySelector('[data-mode="send"]'))
      throw new Error("send and stop must never both be in the DOM — that is two tab stops for one slot");
    const name = stop.getAttribute("aria-label");
    if (!name || name === "Send message")
      throw new Error(`the stop control needs its own accessible name; got “${name}”`);

    stop.click();
    await tick();
    if (stops() !== "1") throw new Error(`clicking stop must call onStop; it fired ${stops()} time(s)`);

    // A disabled composer still lets the reader stop a response that is already running.
    const offStop = at("off").querySelector<HTMLButtonElement>('.rt-ds-chat-composer-send[data-mode="stop"]')!;
    if (offStop.disabled) throw new Error("the stop control must stay live while the composer is disabled");
    const offInput = at("off").querySelector<HTMLTextAreaElement>(".rt-TextAreaInput")!;
    if (!offInput.disabled) throw new Error("a disabled composer must disable its input");
  },
};

/** THE RING HOISTS TO THE DOCK. One ring around the whole surface, and none on the field inside —
 *  two nested rings would read as two controls. */
export const FocusRingHoistsToTheDock: Story = {
  render: () => (
    <Box p="5" style={{ maxWidth: 520 }}>
      <ChatComposer onSubmit={() => {}} label="Message" />
    </Box>
  ),
  play: async ({ canvasElement }) => {
    const input = inputOf(canvasElement);
    const dock = canvasElement.querySelector<HTMLElement>(".rt-ds-chat-composer-dock")!;
    const fieldRoot = canvasElement.querySelector<HTMLElement>(".rt-ds-chat-composer .rt-TextAreaRoot")!;

    // At rest neither box draws a ring.
    if (getComputedStyle(dock).outlineStyle !== "none")
      throw new Error(`an unfocused dock must draw no ring; outline-style is “${getComputedStyle(dock).outlineStyle}”`);

    input.focus();
    await tick();
    if (document.activeElement !== input) throw new Error("the textarea did not take focus");

    const ring = getComputedStyle(dock);
    if (ring.outlineStyle !== "solid")
      throw new Error(`the focused dock must draw the ring; outline-style is “${ring.outlineStyle}”`);
    if (ring.outlineWidth !== "2px")
      throw new Error(`the ring is 2px wide ([[focus-ring]]); it measured ${ring.outlineWidth}`);
    if (ring.outlineOffset !== "2px")
      throw new Error(`the ring sits 2px off the box ([[input-focus-ring-offset]]); the offset measured ${ring.outlineOffset}`);
    // The dock's own outline is the geometry. The two layers paint on its pseudos ([[focus-ring]]): the accent
    // base on ::before and the Radix alpha stacked on ::after, each 2px, each resolved live.
    const layers: [string, string][] = [["::before", "--ds-stroke-focus"], ["::after", "--ds-stroke-focus-stack"]];
    for (const [pseudo, token] of layers) {
      const probe = document.createElement("span");
      probe.style.setProperty("outline-color", `var(${token})`);
      dock.appendChild(probe);
      const expected = getComputedStyle(probe).outlineColor;
      probe.remove();
      const layer = getComputedStyle(dock, pseudo);
      if (layer.outlineStyle !== "solid" || layer.outlineWidth !== "2px")
        throw new Error(`the ring's ${pseudo} layer must be a 2px solid outline; it is ${layer.outlineWidth} ${layer.outlineStyle}`);
      if (layer.outlineColor !== expected)
        throw new Error(`the ring's ${pseudo} layer must ink from ${token} (${expected}); it measured ${layer.outlineColor}`);
    }

    // …and the field inside draws NOTHING: no ring of its own and no second border.
    const inner = getComputedStyle(fieldRoot);
    if (inner.outlineStyle !== "none")
      throw new Error(`the inner field must be de-skinned; its outline-style is “${inner.outlineStyle}”`);
    if (inner.boxShadow !== "none")
      throw new Error(`the inner field must draw no edge; its box-shadow is “${inner.boxShadow}”`);
  },
};

/** CLICKING THE DOCK'S WHITESPACE focuses the input; clicking something that already does
 *  something does not have its press stolen. */
export const ClickToFocusSkipsControls: Story = {
  render: function ClickToFocus() {
    const [attached, setAttached] = useState(0);
    return (
      <Box p="5" style={{ maxWidth: 520 }}>
        <ChatComposer
          onSubmit={() => {}}
          label="Message"
          actions={
            <IconButton
              type="button"
              priority="tertiary"
              aria-label="Attach a file"
              data-testid="attach"
              onClick={() => setAttached((n) => n + 1)}
            >
              <Paperclip aria-hidden />
            </IconButton>
          }
        />
        <div data-testid="attached">{attached}</div>
      </Box>
    );
  },
  play: async ({ canvasElement }) => {
    const input = inputOf(canvasElement);
    const actions = canvasElement.querySelector<HTMLElement>(".rt-ds-chat-composer-actions")!;
    const attach = canvasElement.querySelector<HTMLButtonElement>('[data-testid="attach"]')!;
    const attached = () => canvasElement.querySelector<HTMLElement>('[data-testid="attached"]')!.textContent;

    // Empty space in the action row is dock whitespace: the press lands on the input.
    input.blur();
    actions.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    await tick();
    if (document.activeElement !== input)
      throw new Error("clicking the dock's whitespace must focus the input");

    // A press on a real control keeps its own meaning and does not move focus to the input.
    input.blur();
    attach.click();
    await tick();
    if (attached() !== "1") throw new Error(`the attach control must still fire; it fired ${attached()} time(s)`);
    if (document.activeElement === input)
      throw new Error("a press on a control must not be stolen and turned into a focus of the input");
  },
};

/** CONTROLLED AND UNCONTROLLED both work, and a controlled composer never writes to itself: the
 *  clear on send is an `onChange("")` its owner applies. */
export const ControlledAndUncontrolled: Story = {
  render: function Both() {
    const [value, setValue] = useState("read the tokens");
    const [sent, setSent] = useState<string[]>([]);
    return (
      <Box p="5" style={{ maxWidth: 520 }}>
        <div data-testid="controlled">
          <ChatComposer
            label="Controlled message"
            value={value}
            onChange={setValue}
            onSubmit={(v) => setSent((s) => [...s, v])}
          />
        </div>
        <div data-testid="uncontrolled">
          <ChatComposer label="Uncontrolled message" defaultValue="apply the accent" onSubmit={() => {}} />
        </div>
        <div data-testid="sent">{JSON.stringify(sent)}</div>
      </Box>
    );
  },
  play: async ({ canvasElement }) => {
    const at = (id: string) => canvasElement.querySelector<HTMLElement>(`[data-testid="${id}"]`)!;
    const controlled = at("controlled").querySelector<HTMLTextAreaElement>(".rt-TextAreaInput")!;
    const uncontrolled = at("uncontrolled").querySelector<HTMLTextAreaElement>(".rt-TextAreaInput")!;
    // Read through a call, not a property access: a literal comparison narrows `el.value` to that
    // literal for the rest of the block, and the NEXT comparison is then a compile error rather
    // than a check. The value genuinely changes underneath — the type has to be re-widened.
    const valueOf = (el: HTMLTextAreaElement): string => el.value;

    if (valueOf(controlled) !== "read the tokens")
      throw new Error(`a controlled composer must render its owner's value; it holds “${valueOf(controlled)}”`);
    if (valueOf(uncontrolled) !== "apply the accent")
      throw new Error(`defaultValue must seed an uncontrolled composer; it holds “${valueOf(uncontrolled)}”`);

    typeInto(controlled, "read the tokens twice");
    await tick();
    if (valueOf(controlled) !== "read the tokens twice")
      throw new Error("a controlled composer must follow its owner through onChange");

    pressKey(controlled, "Enter");
    await tick();
    if (at("sent").textContent !== JSON.stringify(["read the tokens twice"]))
      throw new Error(`the controlled composer must submit its own value; onSubmit saw ${at("sent").textContent}`);
    if (valueOf(controlled) !== "")
      throw new Error("sending must round-trip an empty value back through onChange");

    // The two instances stay independent — one composer's send does not clear the other's draft.
    if (valueOf(uncontrolled) !== "apply the accent")
      throw new Error("sending in one composer must not touch another's draft");
  },
};

/** THE STATUS REGION. An error is announced assertively, a warning politely, and the message is
 *  wired to the input rather than floating beside it. */
export const StatusRegionRoles: Story = {
  render: () => (
    <Box p="5" style={{ maxWidth: 520 }}>
      <div data-testid="error">
        <ChatComposer
          onSubmit={() => {}}
          label="Message with an error"
          status={{ tone: "error", message: "That message could not be sent." }}
        />
      </div>
      <div data-testid="warning">
        <ChatComposer
          onSubmit={() => {}}
          label="Message with a warning"
          status={{ tone: "warning", message: "You are near the context limit." }}
        />
      </div>
    </Box>
  ),
  play: async ({ canvasElement }) => {
    const at = (id: string) => canvasElement.querySelector<HTMLElement>(`[data-testid="${id}"]`)!;

    for (const [id, role] of [["error", "alert"], ["warning", "status"]] as const) {
      const region = at(id).querySelector<HTMLElement>(".rt-ds-chat-composer > [data-field-part='message']");
      if (!region) throw new Error(`the ${id} tone must render a status region`);
      if (region.getAttribute("role") !== role)
        throw new Error(`the ${id} tone must take role="${role}"; got “${region.getAttribute("role")}”`);
      if (region.getClientRects().length === 0)
        throw new Error(`the ${id} message must be visible, not only announced`);

      // The input points at the message, so a reader who tabs back into the box hears why it failed.
      const input = at(id).querySelector<HTMLTextAreaElement>(".rt-TextAreaInput")!;
      if (input.getAttribute("aria-describedby") !== region.id)
        throw new Error(`the input must describe itself with the status message; got “${input.getAttribute("aria-describedby")}”`);
    }

    // Only the error tone marks the field invalid — a warning is not a validation failure.
    const errorInput = at("error").querySelector<HTMLTextAreaElement>(".rt-TextAreaInput")!;
    const warnInput = at("warning").querySelector<HTMLTextAreaElement>(".rt-TextAreaInput")!;
    if (errorInput.getAttribute("aria-invalid") !== "true")
      throw new Error("an error status must set aria-invalid on the input");
    if (warnInput.hasAttribute("aria-invalid"))
      throw new Error("a warning must NOT mark the input invalid — it is guidance, not a failure");
  },
};

/** [[container-size-seeding]] — the composer SEEDS its resolved step to its slot. An unsized control handed to `actions`
 *  comes out at the size of the send control beside it; a control that names a size still wins.
 *
 *  The fixture sets the composer's size explicitly, which is the whole point: `size` is what makes
 *  the composer's step differ from the ambient tier the slot content would otherwise resolve. It
 *  reads the STEP each control resolved rather than a pixel height, so the assertion holds at any
 *  scaling and does not restate Radix's ghost-vs-solid box treatment. */
export const SlotSizeSeeding: Story = {
  render: () => (
    <Box p="5" style={{ maxWidth: 560 }}>
      {(["1", "2", "3"] as const).map((step) => (
        <div key={step} data-testid={`seed-${step}`} style={{ marginBottom: 16 }}>
          <ChatComposer
            onSubmit={() => {}}
            label={`Message at step ${step}`}
            size={step}
            actions={
              <>
                <IconButton type="button" priority="tertiary" aria-label="Attach a file">
                  <Paperclip aria-hidden />
                </IconButton>
                <IconButton
                  type="button"
                  priority="tertiary"
                  size="1"
                  data-pinned=""
                  aria-label="Pinned to step one"
                >
                  <Paperclip aria-hidden />
                </IconButton>
              </>
            }
          />
        </div>
      ))}
    </Box>
  ),
  play: async ({ canvasElement }) => {
    const step = (el: Element) => (el.className.match(/rt-r-size-(\d)/) ?? [])[1];

    for (const want of ["1", "2", "3"]) {
      const host = canvasElement.querySelector<HTMLElement>(`[data-testid="seed-${want}"]`)!;
      const send = host.querySelector<HTMLElement>(".rt-ds-chat-composer-send")!;
      const unsized = host.querySelector<HTMLElement>(".rt-ds-chat-composer-actions-lead button:not([data-pinned])")!;
      const pinned = host.querySelector<HTMLElement>("[data-pinned]")!;

      if (step(send) !== want)
        throw new Error(`the send control must take the composer's own step (${want}); it took ${step(send)}`);
      // The seam this ruling closes: slot content used to resolve the AMBIENT tier, so an attach
      // button sat at step 1 beside a step-3 send in the same row.
      if (step(unsized) !== want)
        throw new Error(
          `an unsized control in the actions slot must resolve the composer's step (${want}); it resolved ${step(unsized)}`,
        );
      // …and seeding is a default, not an override.
      if (step(pinned) !== "1")
        throw new Error(`a control with an explicit size must keep it; it resolved ${step(pinned)}`);

      // Both controls in the row share a centre line — which is what the reader actually sees.
      const centre = (el: Element) => {
        const box = el.getBoundingClientRect();
        return (box.top + box.bottom) / 2;
      };
      if (Math.abs(centre(unsized) - centre(send)) > 0.5)
        throw new Error("the actions and the send control must sit on one centre line");
    }
  },
};
