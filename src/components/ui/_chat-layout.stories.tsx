import { useLayoutEffect, useRef, useState } from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { Box, Flex } from "@radix-ui/themes";
import { Button } from "./Button";
import { ChatComposer } from "./ChatComposer";
import { ChatLayout, type ChatLayoutHandle } from "./ChatLayout";
import { ChatMessage } from "./ChatMessage";

/* =============================================================================
   Test-only behavior for ChatLayout — and, through it, the FIRST runtime exercise
   of both scroll engines. Their arithmetic has node-lane coverage; the listeners,
   the rAF spring, the `scrollend` fallback timer, the reduced-motion jump and the
   resize wiring have only ever run here.

   Everything that DRIVES the layout lives in this file: the docs pages are static
   on view, and a play that scrolls, springs or streams would flash the UI every
   time a reader opened one. Underscore-prefixed → _internal, exempt from the
   story guards.

   HOW LOCK STATE IS OBSERVED. The engine's lock is not an attribute and should
   not become one, so every play below reads it through BEHAVIOUR: locked means a
   new message pulls the view down with it, unlocked means the view stays put and
   the control relabels. That is what a reader can see, and it fails for the same
   reasons a reader would notice.
   ============================================================================= */

/** A promise-based poll — the idiom the other _internal suites use (no @storybook/test dep). */
async function waitFor<T>(fn: () => T | null | undefined | false, timeout = 4000): Promise<T> {
  const t0 = performance.now();
  for (;;) {
    const v = fn();
    if (v) return v;
    if (performance.now() - t0 > timeout) throw new Error("waitFor: timed out");
    await new Promise((r) => setTimeout(r, 16));
  }
}

/** One animation frame, awaited. */
const frame = () => new Promise<void>((r) => requestAnimationFrame(() => r()));

const LONG =
  "Switching the accent to teal moves every accent-aware role at once, so the only thing worth " +
  "checking by hand is where a tint meets text. I measured the three that matter and all of them " +
  "clear the floor in both light and dark.";

const composer = <ChatComposer onSubmit={() => {}} label="Message" />;

/* ---- the harness ----------------------------------------------------------
   A real ChatLayout with a growing transcript and two controls beside it: one
   that appends a turn (the streaming pump's input) and one that calls the
   imperative handle. `Recorder` wraps it so a play can read every scroll position
   the viewport passed through — the only way to tell a SNAP from a SPRING after
   the fact. Its layout effect runs after the layout's own, but the first-paint
   scroll is scheduled in a frame callback, so the listener is always in place
   before anything moves. */

type Samples = number[];

function readSamples(root: Element): Samples {
  return ((root as Element & { __dsSamples?: Samples }).__dsSamples ?? []) as Samples;
}

function Harness({
  turns = 8, height = 220, spacer = 0, handleRef,
}: {
  turns?: number;
  height?: number;
  /** Extra transcript height, for a scroll long enough that the spring outruns the fallback timer. */
  spacer?: number;
  handleRef?: { current: ChatLayoutHandle | null };
}) {
  const box = useRef<HTMLDivElement>(null);
  const [extra, setExtra] = useState(0);

  useLayoutEffect(() => {
    const viewport = box.current?.querySelector<HTMLElement>(".rt-ScrollAreaViewport");
    const host = box.current;
    if (!viewport || !host) return;
    const samples: Samples = [];
    (host as Element & { __dsSamples?: Samples }).__dsSamples = samples;
    const onScroll = () => samples.push(viewport.scrollTop);
    viewport.addEventListener("scroll", onScroll, { passive: true });
    return () => viewport.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <Flex direction="column" gap="3" p="4">
      <Flex gap="2">
        <Button data-testid="add" onClick={() => setExtra((n) => n + 1)}>Add message</Button>
        <Button
          data-testid="handle"
          priority="secondary"
          onClick={() => handleRef?.current?.scrollToBottom()}
        >
          Call scrollToBottom
        </Button>
      </Flex>
      <Box ref={box} data-testid="host" style={{ width: 460 }}>
        <ChatLayout
          ref={handleRef}
          label="Conversation with the assistant"
          composer={composer}
          style={{ height }}
        >
          {spacer > 0 && <Box data-testid="spacer" style={{ height: spacer, flexShrink: 0 }} />}
          {Array.from({ length: turns + extra }, (_, i) => (
            <ChatMessage key={i} sender={i % 2 === 0 ? "user" : "assistant"}>
              {i % 2 === 0 ? `Question number ${i + 1}.` : LONG}
            </ChatMessage>
          ))}
        </ChatLayout>
      </Box>
    </Flex>
  );
}

/** The scrolling node — which is also the log region, and the node both engines are attached to. */
const viewportOf = (canvasElement: HTMLElement) =>
  canvasElement.querySelector<HTMLElement>(".rt-ds-chat-layout .rt-ScrollAreaViewport")!;

const maxScroll = (el: HTMLElement) => Math.max(0, el.scrollHeight - el.clientHeight);
/** Within a pixel of the bottom edge. `scrollHeight` and `clientHeight` are rounded to integers while
 *  `scrollTop` is fractional, so "at the bottom" can never be an equality. */
const atBottom = (el: HTMLElement) => maxScroll(el) - el.scrollTop <= 1.5;

/** `atBottom`, with the numbers in the failure — a bare timeout says nothing about WHY. */
async function waitForBottom(el: HTMLElement, timeout = 4000): Promise<void> {
  const t0 = performance.now();
  for (;;) {
    if (atBottom(el)) return;
    if (performance.now() - t0 > timeout) {
      // The distance the engine stopped short of, AND the distance the browser would have allowed —
      // a spring that stalls and a scroller that cannot go further are different findings.
      const rested = el.scrollTop;
      el.scrollTop = 1e7;
      const reachable = el.scrollTop;
      el.scrollTop = rested;
      throw new Error(
        `the transcript never reached its bottom edge: scrollTop ${rested.toFixed(1)} of ` +
        `${maxScroll(el)} (scrollHeight ${el.scrollHeight}, clientHeight ${el.clientHeight}, ` +
        `browser clamps at ${reachable.toFixed(1)})`,
      );
    }
    await new Promise((r) => setTimeout(r, 16));
  }
}

const controlIn = (canvasElement: HTMLElement) =>
  canvasElement.querySelector<HTMLElement>(".rt-ds-chat-layout-scroll-control");

const press = (canvasElement: HTMLElement, id: string) =>
  canvasElement.querySelector<HTMLButtonElement>(`[data-testid="${id}"]`)!.click();

const meta: Meta<typeof ChatLayout> = {
  title: "_internal/ChatLayout behavior",
  component: ChatLayout,
  parameters: { controls: { disable: true } },
};
export default meta;
type Story = StoryObj<typeof ChatLayout>;

/** A transcript never scrolls itself into view. The first paint lands at the bottom edge with NO
 *  animation — proven from the scroll positions the viewport actually passed through, not from the
 *  final one: a spring and a snap both END at the bottom, and only the samples tell them apart. */
export const FirstPaintSnapsToTheBottom: Story = {
  render: () => <Harness />,
  play: async ({ canvasElement }) => {
    const viewport = viewportOf(canvasElement);
    const host = canvasElement.querySelector<HTMLElement>('[data-testid="host"]')!;

    await waitFor(() => viewport.scrollHeight > viewport.clientHeight + 8);
    await waitForBottom(viewport);

    // A spring from the top of this transcript takes tens of frames and therefore tens of scroll
    // events. The snap is one write, so it is at most a couple.
    const samples = readSamples(host);
    if (samples.length > 3)
      throw new Error(
        `the first paint must SNAP to the bottom, not animate to it; the viewport passed through ` +
        `${samples.length} scroll positions (${samples.slice(0, 5).map(Math.round).join(", ")}…)`,
      );
    if (samples.length && Math.abs(samples[samples.length - 1] - maxScroll(viewport)) > 1)
      throw new Error(`the snap must land ON the bottom edge; it landed at ${samples[samples.length - 1]}`);

    // Nothing to scroll back TO means nothing to offer, so no control on first paint.
    if (controlIn(canvasElement))
      throw new Error("a transcript already at its bottom must not offer a scroll-to-latest control");
  },
};

/** Any upward scroll releases the follow lock. Read behaviourally: once released, a new message must
 *  NOT pull the view down — which is the whole reason the lock exists. */
export const ScrollingUpUnlocks: Story = {
  render: () => <Harness />,
  play: async ({ canvasElement }) => {
    const viewport = viewportOf(canvasElement);
    await waitFor(() => viewport.scrollHeight > viewport.clientHeight + 120);
    await waitForBottom(viewport);

    // A scrollbar drag, a PageUp and a wheel all arrive as this: the position moved up. The engine
    // reads direction off the position rather than off the device, so this is the real signal.
    viewport.scrollTop = 0;
    await waitFor(() => controlIn(canvasElement));

    const before = viewport.scrollTop;
    press(canvasElement, "add");
    // Long enough for the resize observer to fire, the spring to run and settle if it were going to.
    await new Promise((r) => setTimeout(r, 600));

    if (Math.abs(viewport.scrollTop - before) > 8)
      throw new Error(
        `an unlocked transcript must stay where the reader left it; it moved from ${before} to ${viewport.scrollTop}`,
      );
    if (atBottom(viewport)) throw new Error("an unlocked transcript must not be dragged back to the bottom");
  },
};

/** While locked, the transcript follows its own growth: a message arriving pulls the view down with
 *  it. This is the streaming pump — the resize observer's callback into the scroll engine. */
export const GrowthWhileLockedFollows: Story = {
  render: () => <Harness />,
  play: async ({ canvasElement }) => {
    const viewport = viewportOf(canvasElement);
    await waitFor(() => viewport.scrollHeight > viewport.clientHeight + 8);
    await waitForBottom(viewport);

    const heightBefore = viewport.scrollHeight;
    press(canvasElement, "add");
    await waitFor(() => viewport.scrollHeight > heightBefore + 8);
    await waitForBottom(viewport);

    // …and it stays offering nothing, because the reader is already looking at the newest message.
    if (controlIn(canvasElement))
      throw new Error("a locked transcript that followed its own growth has nothing to scroll to");
  },
};

/** Growth while the reader is away is a different event, and it gets a different control: the round
 *  icon becomes a labelled pill. Two elements, ONE of them in the DOM — so there is one tab stop and
 *  no half-rendered label mid-swap. */
export const GrowthWhileUnlockedRelabelsTheControl: Story = {
  render: () => <Harness />,
  play: async ({ canvasElement }) => {
    const viewport = viewportOf(canvasElement);
    await waitFor(() => viewport.scrollHeight > viewport.clientHeight + 120);
    await waitForBottom(viewport);

    viewport.scrollTop = 0;
    const idle = await waitFor(() => controlIn(canvasElement));
    if (idle.dataset.mode !== "idle")
      throw new Error(`away from the bottom with nothing new, the control rests in its idle state; got “${idle.dataset.mode}”`);
    if (idle.getAttribute("aria-label") !== "Scroll to latest")
      throw new Error(`the idle control carries its accessible name; got “${idle.getAttribute("aria-label")}”`);

    press(canvasElement, "add");
    const pill = await waitFor(() => {
      const c = controlIn(canvasElement);
      return c && c.dataset.mode === "new-messages" ? c : null;
    });

    // The label is VISIBLE, not an accessible name on a bare arrow: "there is something new down
    // there" is a message an icon cannot carry.
    if (!/New messages/.test(pill.textContent ?? ""))
      throw new Error(`the new-messages state must show its label; the control reads “${pill.textContent}”`);
    if (canvasElement.querySelectorAll(".rt-ds-chat-layout-scroll-control").length !== 1)
      throw new Error("exactly one scroll control may be in the DOM — two would be two tab stops");
  },
};

/** Pressing the control springs the transcript down and re-takes the lock. Both halves are asserted:
 *  a JUMP would also end at the bottom, so the play checks that the position is still high one tick
 *  after the press and that it passed through a run of intermediate positions on the way. */
export const TheControlSpringsAndRelocks: Story = {
  render: () => <Harness />,
  play: async ({ canvasElement }) => {
    const viewport = viewportOf(canvasElement);
    await waitFor(() => viewport.scrollHeight > viewport.clientHeight + 160);
    await waitForBottom(viewport);

    viewport.scrollTop = 0;
    const control = await waitFor(() => controlIn(canvasElement));

    const target = maxScroll(viewport);
    control.click(); // the REAL control, not the hook behind it

    if (viewport.scrollTop > target / 2)
      throw new Error(
        `the press must start a spring, not a jump; scrollTop went straight to ${viewport.scrollTop} of ${target}`,
      );

    // Sample the flight itself. A spring produces a monotonic run of distinct positions.
    const seen: number[] = [];
    for (let i = 0; i < 90 && !atBottom(viewport); i++) {
      await frame();
      seen.push(viewport.scrollTop);
    }
    const distinct = new Set(seen.map((v) => Math.round(v))).size;
    if (distinct < 3)
      throw new Error(`a spring passes through intermediate positions; only ${distinct} distinct ones were seen`);

    await waitForBottom(viewport);
    await waitFor(() => !controlIn(canvasElement));

    // …and it RE-LOCKED: the next message pulls the view down again.
    const heightBefore = viewport.scrollHeight;
    press(canvasElement, "add");
    await waitFor(() => viewport.scrollHeight > heightBefore + 8);
    await waitForBottom(viewport);
  },
};

/* ---- the `scrollend` backstop ---------------------------------------------
   The engine re-takes the lock decision when a programmatic scroll settles, and
   it learns that a scroll settled from `scrollend`. Not every engine fires that
   event, so a 1200ms timer is armed alongside every programmatic scroll.

   To exercise the timer, the event has to be gone BEFORE the engine subscribes —
   so this story gates the mount behind a press: the handler drops `scrollend`
   subscriptions, instruments the timer, and only then mounts the layout. The play
   restores both. Nothing about the engine is stubbed; only the browser's event
   and the clock's bookkeeping are observed. */

/** One armed backstop, and what became of it. Per-timer rather than per-count: the run before the
 *  case under test arms and disarms its own, and a bare tally cannot tell them apart. */
type Backstop = { id: number; cleared: boolean; fired: boolean };

let spy: Backstop[] = [];
let restore: (() => void) | null = null;

const FALLBACK_MS = 1200;

function instrument() {
  spy = [];
  const realAdd = EventTarget.prototype.addEventListener;
  const realSet = window.setTimeout;
  const realClear = window.clearTimeout;

  // 1. The browser's `scrollend` never reaches the engine — the case the timer exists for.
  EventTarget.prototype.addEventListener = function patched(
    this: EventTarget, type: string, ...args: unknown[]
  ) {
    if (type === "scrollend") return;
    return (realAdd as (this: EventTarget, t: string, ...a: unknown[]) => void).call(this, type, ...args);
  } as typeof EventTarget.prototype.addEventListener;

  // 2. The 1200ms timer is counted, and its callback wrapped so its FIRING is observable — the
  //    thing that has to be proven is that the path ran, not that a timer id existed.
  (window as Window & typeof globalThis).setTimeout = ((
    handler: TimerHandler, timeout?: number, ...rest: unknown[]
  ) => {
    if (timeout === FALLBACK_MS && typeof handler === "function") {
      const record: Backstop = { id: 0, cleared: false, fired: false };
      record.id = realSet(() => {
        record.fired = true;
        (handler as () => void)();
      }, timeout, ...rest) as unknown as number;
      spy.push(record);
      return record.id;
    }
    return realSet(handler, timeout, ...(rest as [])) as unknown as number;
  }) as typeof window.setTimeout;

  (window as Window & typeof globalThis).clearTimeout = ((id?: number) => {
    const record = spy.find((r) => r.id === id);
    if (record) record.cleared = true;
    return realClear(id);
  }) as typeof window.clearTimeout;

  restore = () => {
    EventTarget.prototype.addEventListener = realAdd;
    (window as Window & typeof globalThis).setTimeout = realSet;
    (window as Window & typeof globalThis).clearTimeout = realClear;
    restore = null;
  };
}

/** With `scrollend` suppressed, the 1200ms backstop is what carries the re-lock decision of a
 *  programmatic scroll. The transcript here is deliberately enormous, so the spring is still in
 *  flight when the timer comes due — otherwise the spring settles first and disarms it, and the
 *  path under test never runs. */
export const TheFallbackTimerCoversAMissingScrollEnd: Story = {
  render: function FallbackHarness() {
    const [mounted, setMounted] = useState(false);
    useLayoutEffect(() => () => restore?.(), []);
    return (
      <Flex direction="column" gap="3" p="4">
        <Button
          data-testid="mount"
          onClick={() => {
            instrument();
            setMounted(true);
          }}
        >
          Mount without scrollend
        </Button>
        {mounted && <Harness turns={4} height={200} spacer={30000} />}
      </Flex>
    );
  },
  play: async ({ canvasElement }) => {
    try {
      press(canvasElement, "mount");
      const viewport = await waitFor(() => viewportOf(canvasElement));
      await waitFor(() => viewport.scrollHeight > viewport.clientHeight + 10000);
      await waitForBottom(viewport);

      // Everything the mount armed and disarmed is bookkeeping from before the case under test.
      spy = [];

      viewport.scrollTop = 0;
      const control = await waitFor(() => controlIn(canvasElement));

      const t0 = performance.now();
      control.click();

      if (spy.length !== 1)
        throw new Error(`a programmatic scroll must arm exactly one ${FALLBACK_MS}ms backstop; it armed ${spy.length}`);
      const backstop = spy[0];

      // It has to come due BEFORE the spring settles, or nothing was covered.
      await waitFor(() => backstop.fired, 3000);
      const elapsed = performance.now() - t0;
      if (atBottom(viewport))
        throw new Error("the spring settled before the backstop fired — this scroll was too short to exercise it");
      if (elapsed < FALLBACK_MS - 50 || elapsed > FALLBACK_MS + 600)
        throw new Error(`the backstop must come due at ~${FALLBACK_MS}ms; it fired after ${Math.round(elapsed)}ms`);
      if (backstop.cleared)
        throw new Error("nothing may disarm the backstop while the scroll it covers is still running");

      // And with no `scrollend` anywhere, the transcript still ends up locked at the bottom.
      await waitForBottom(viewport, 5000);
      await waitFor(() => !controlIn(canvasElement));
      const heightBefore = viewport.scrollHeight;
      press(canvasElement, "add");
      await waitFor(() => viewport.scrollHeight > heightBefore + 8);
      await waitForBottom(viewport);
    } finally {
      restore?.();
    }
  },
};

/* ---- reduced motion -------------------------------------------------------
   The engine reads the preference live, through the repo's own media-query
   subscription, so a story can express "this reader asked for less motion" by
   answering that query differently and re-rendering. Only the preference is
   simulated; the branch taken is the shipped one. */

let restoreMedia: (() => void) | null = null;

function preferReducedMotion() {
  const real = window.matchMedia.bind(window);
  window.matchMedia = ((query: string) =>
    /prefers-reduced-motion/.test(query)
      ? ({
          matches: true, media: query, onchange: null,
          addEventListener: () => {}, removeEventListener: () => {},
          addListener: () => {}, removeListener: () => {},
          dispatchEvent: () => false,
        } as MediaQueryList)
      : real(query)) as typeof window.matchMedia;
  restoreMedia = () => {
    window.matchMedia = real;
    restoreMedia = null;
  };
}

/** `prefers-reduced-motion: reduce` replaces the spring with a single jump. The assertion is the
 *  sharpest one available: the press handler runs synchronously, so the jump has ALREADY happened
 *  when `click()` returns — where the spring would still be at the top waiting for its first frame. */
export const ReducedMotionJumps: Story = {
  render: function ReducedHarness() {
    const [, bump] = useState(0);
    useLayoutEffect(() => () => restoreMedia?.(), []);
    return (
      <Flex direction="column" gap="3" p="4">
        <Button
          data-testid="reduce"
          onClick={() => {
            preferReducedMotion();
            bump((n) => n + 1);
          }}
        >
          Prefer reduced motion
        </Button>
        <Harness />
      </Flex>
    );
  },
  play: async ({ canvasElement }) => {
    try {
      const viewport = viewportOf(canvasElement);
      await waitFor(() => viewport.scrollHeight > viewport.clientHeight + 160);
      await waitForBottom(viewport);

      viewport.scrollTop = 0;
      await waitFor(() => controlIn(canvasElement));

      press(canvasElement, "reduce");
      await frame(); // the layout re-reads the preference on its next render

      const control = await waitFor(() => controlIn(canvasElement));
      const target = maxScroll(viewport);
      control.click();

      if (Math.abs(viewport.scrollTop - target) > 1)
        throw new Error(
          `under reduced motion the press must land the transcript on the bottom edge immediately; ` +
          `scrollTop is ${Math.round(viewport.scrollTop)} of ${Math.round(target)}`,
        );

      // …and no spring is left running behind it: the position holds across the next frames.
      await frame();
      await frame();
      if (Math.abs(viewport.scrollTop - maxScroll(viewport)) > 1)
        throw new Error("a jump must be the whole movement — nothing may animate after it");
    } finally {
      restoreMedia?.();
    }
  },
};

/** [[chat-layout-assembly]] — the imperative handle scrolls AND re-locks, even though the reader had scrolled away. A
 *  handle that quietly declined here would be a control that lies: the consumer asked for the
 *  bottom. Driven through a real call site, the way a product's "jump to latest" would. */
export const TheHandleScrollsAndRelocks: Story = {
  render: function HandleHarness() {
    const handle = useRef<ChatLayoutHandle | null>(null);
    return <Harness handleRef={handle} />;
  },
  play: async ({ canvasElement }) => {
    const viewport = viewportOf(canvasElement);
    await waitFor(() => viewport.scrollHeight > viewport.clientHeight + 160);
    await waitForBottom(viewport);

    viewport.scrollTop = 0;
    await waitFor(() => controlIn(canvasElement));
    const away = viewport.scrollTop;

    press(canvasElement, "handle");
    await waitForBottom(viewport);
    if (away === viewport.scrollTop)
      throw new Error("scrollToBottom() must move a transcript the reader had scrolled away from");

    // RE-LOCKED, not merely moved: the next message follows on its own.
    await waitFor(() => !controlIn(canvasElement));
    const heightBefore = viewport.scrollHeight;
    press(canvasElement, "add");
    await waitFor(() => viewport.scrollHeight > heightBefore + 8);
    await waitForBottom(viewport);
  },
};

/** The empty conversation, and the seam between the two states: with no children the log shows its
 *  empty slot and the dock still holds the composer, and the moment a message lands the slot gives
 *  way to the transcript the engines observe. */
export const EmptyThenFirstMessage: Story = {
  render: function EmptyHarness() {
    const [sent, setSent] = useState(false);
    return (
      <Flex direction="column" gap="3" p="4">
        <Button data-testid="send" onClick={() => setSent(true)}>Send the first message</Button>
        <Box style={{ width: 420 }}>
          <ChatLayout
            label="New conversation"
            composer={composer}
            emptyState={<Box data-testid="empty">No messages yet</Box>}
            style={{ height: 240 }}
          >
            {sent ? <ChatMessage sender="user">Switch the accent to teal.</ChatMessage> : null}
          </ChatLayout>
        </Box>
      </Flex>
    );
  },
  play: async ({ canvasElement }) => {
    if (!canvasElement.querySelector('[data-testid="empty"]'))
      throw new Error("an empty conversation must show the empty-state slot");
    if (canvasElement.querySelector(".rt-ds-chat-layout-content"))
      throw new Error("an empty conversation must not render a transcript wrapper — it would suppress the slot");
    if (!canvasElement.querySelector(".rt-ds-chat-layout-dock textarea"))
      throw new Error("the dock holds the composer whether or not there is a conversation");

    press(canvasElement, "send");
    await waitFor(() => canvasElement.querySelector(".rt-ds-chat-layout-content"));
    if (canvasElement.querySelector('[data-testid="empty"]'))
      throw new Error("the empty slot must give way to the transcript");
    // The stamp both engines query has to be inside the observed element, or nothing is detected.
    const stamped = canvasElement.querySelectorAll(".rt-ds-chat-layout-content [data-ds-chat-message]");
    if (stamped.length !== 1)
      throw new Error(`the transcript wrapper must contain the stamped message; found ${stamped.length}`);
  },
};

/** Activating the scroll control UNMOUNTS it — it only exists while the reader is away from the
 *  bottom. So the press has to hand focus somewhere, or the browser resolves it to `<body>` and a
 *  keyboard reader's next Tab restarts at the top of the document, having lost the transcript. Focus
 *  goes to the log, which is a tab stop and is what they are now looking at. This regressed once
 *  because nothing covered it. */
export const ActivatingTheControlKeepsFocus: Story = {
  render: () => <Harness />,
  play: async ({ canvasElement }) => {
    const viewport = viewportOf(canvasElement);
    await waitFor(() => viewport.scrollHeight > viewport.clientHeight + 120);
    await waitForBottom(viewport);

    viewport.scrollTop = 0;
    const control = await waitFor(() => controlIn(canvasElement));
    control.focus();
    if (canvasElement.ownerDocument.activeElement !== control)
      throw new Error("the control must be focusable before this proves anything about losing focus");

    control.click();
    // The control leaves as soon as the engine reports the bottom is taken.
    await waitFor(() => !controlIn(canvasElement));
    await new Promise((r) => setTimeout(r, 250));

    const landed = canvasElement.ownerDocument.activeElement;
    if (landed === canvasElement.ownerDocument.body)
      throw new Error("focus fell to <body> when the control unmounted — the reader has lost their place");
    if (landed !== viewport)
      throw new Error(
        `focus must move to the log when the control that had it goes away; landed on <${landed?.tagName.toLowerCase()} role="${landed?.getAttribute("role")}">`,
      );
  },
};

/** Review regression — pressing the control dismisses it for the WHOLE flight. Each spring frame
 *  fires a scroll event; recomputing visibility from those frames re-mounted the idle icon a beat
 *  after the press dismissed the pill. Locked programmatic motion must never resurrect the control. */
export const TheControlStaysGoneDuringTheFlight: Story = {
  render: () => <Harness spacer={8000} />,
  play: async ({ canvasElement }) => {
    const viewport = viewportOf(canvasElement);
    await waitFor(() => viewport.scrollHeight > viewport.clientHeight + 8000);
    await waitForBottom(viewport);

    viewport.scrollTop = 0;
    const control = await waitFor(() => controlIn(canvasElement));
    control.click();

    // The click's own dismissal takes a React render to reach the DOM — let that flush first.
    await waitFor(() => !controlIn(canvasElement));

    // Then sample EVERY frame of the flight — the defect re-mounted the control within a frame or two.
    for (let i = 0; i < 600 && !atBottom(viewport); i++) {
      if (controlIn(canvasElement))
        throw new Error(
          `the control re-mounted mid-flight (frame ${i}, scrollTop ${Math.round(viewport.scrollTop)})`,
        );
      await frame();
    }
    await waitForBottom(viewport, 8000);
    if (controlIn(canvasElement)) throw new Error("the control must stay gone once the flight lands");
  },
};

/** The third leg of the backstop's contract, named by the plan and previously unasserted: a user
 *  gesture mid-flight clears the armed timer WITHOUT re-locking — the re-lock must never win against
 *  an active reader. `scrollend` is suppressed exactly as above, so nothing else could clear it. */
export const AGestureDisarmsTheBackstopWithoutRelocking: Story = {
  render: function GestureHarness() {
    const [mounted, setMounted] = useState(false);
    useLayoutEffect(() => () => restore?.(), []);
    return (
      <Flex direction="column" gap="3" p="4">
        <Button
          data-testid="mount"
          onClick={() => {
            instrument();
            setMounted(true);
          }}
        >
          Mount without scrollend
        </Button>
        {mounted && <Harness turns={4} height={200} spacer={30000} />}
      </Flex>
    );
  },
  play: async ({ canvasElement }) => {
    try {
      press(canvasElement, "mount");
      const viewport = await waitFor(() => viewportOf(canvasElement));
      await waitFor(() => viewport.scrollHeight > viewport.clientHeight + 10000);
      await waitForBottom(viewport);
      spy = [];

      viewport.scrollTop = 0;
      const control = await waitFor(() => controlIn(canvasElement));
      control.click();
      if (spy.length !== 1)
        throw new Error(`a programmatic scroll must arm exactly one backstop; it armed ${spy.length}`);
      const backstop = spy[0];

      // Mid-flight, the reader rolls the wheel upward.
      await frame();
      await frame();
      viewport.dispatchEvent(new WheelEvent("wheel", { deltaY: -40, bubbles: true }));

      await waitFor(() => backstop.cleared);
      if (backstop.fired) throw new Error("the backstop fired despite the gesture that cleared it");

      // And WITHOUT re-locking: a new message must leave the view where the reader is.
      await new Promise((r) => setTimeout(r, 250));
      const before = viewport.scrollTop;
      press(canvasElement, "add");
      await new Promise((r) => setTimeout(r, 600));
      if (Math.abs(viewport.scrollTop - before) > 8)
        throw new Error(
          `the gesture must leave the transcript unlocked; it moved from ${before} to ${viewport.scrollTop}`,
        );
      if (atBottom(viewport)) throw new Error("an unlocked transcript must not be dragged to the bottom");
    } finally {
      restore?.();
    }
  },
};
