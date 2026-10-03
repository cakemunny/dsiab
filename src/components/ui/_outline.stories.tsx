import { useRef } from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { Outline, type OutlineItem } from "./Outline";

/* Behavioral, spy-DRIVING plays for Outline — kept OUT of the docs stories (System/Outline) so viewing a
   docs page never auto-scrolls a fixture. Hand-rolled (no @storybook/test): a local sleep/waitFor poll,
   native scroll driving (set scrollTop + dispatch a 'scroll' event → the rAF spy recomputes), assertions
   via throw. The deep pick math is covered by useScrollSpy.logic.test.ts (the node lane); here we assert
   the COMPONENT wiring — last-passed, the atBottom guard, click-suppression, controlled-disables-spy,
   aria-current="location", and the DOM-driven build. Underscore-prefixed → registry/category-guard-exempt. */

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
async function waitFor<T>(fn: () => T | null | undefined | false, timeout = 1500): Promise<T> {
  const t0 = performance.now();
  for (;;) {
    const r = fn();
    if (r) return r as T;
    if (performance.now() - t0 > timeout) throw new Error("waitFor: timed out");
    await sleep(20);
  }
}

const SPY_ITEMS: OutlineItem[] = [
  { id: "sec-a", text: "Section A", level: 2 },
  { id: "sec-b", text: "Section B", level: 2 },
  { id: "sec-c", text: "Section C", level: 2 },
];

/** The currently-active entry's target id (the '#…' anchor minus the hash), or null. */
const activeId = (root: ParentNode): string | null =>
  root.querySelector<HTMLElement>('.rt-ds-outline-link[aria-current="location"]')?.getAttribute("href")?.slice(1) ??
  null;

const linkFor = (root: ParentNode, id: string) =>
  root.querySelector<HTMLAnchorElement>(`a.rt-ds-outline-link[href="#${id}"]`);

/** A scroll container (sections A 0–300, B 300–600, C 600–640 — C is deliberately too short to ever reach
 *  its own activation line) beside an Outline wired to it. Section C exercises the atBottom guard. */
function SpyFixture({ testid, controlledActiveId }: { testid: string; controlledActiveId?: string | null }) {
  const scrollRef = useRef<HTMLDivElement>(null);
  return (
    <div>
      <div
        ref={scrollRef}
        data-testid={testid}
        tabIndex={0}
        style={{ height: 150, overflow: "auto", position: "relative", border: "1px solid #8884" }}
      >
        <div style={{ height: 300 }}><div id="sec-a" style={{ margin: 0 }}>Section A body</div></div>
        <div style={{ height: 300 }}><div id="sec-b" style={{ margin: 0 }}>Section B body</div></div>
        <div style={{ height: 40 }}><div id="sec-c" style={{ margin: 0 }}>Section C body</div></div>
      </div>
      <Outline items={SPY_ITEMS} getContainer={() => scrollRef.current} activeId={controlledActiveId} label="Test outline" />
    </div>
  );
}

/** Article of real headings (one missing an id, one explicit) beside a DOM-driven Outline. */
function DomFixture() {
  const ref = useRef<HTMLDivElement>(null);
  return (
    <div>
      <div ref={ref} data-testid="article">
        <h2>Getting started</h2>
        <p>Intro copy.</p>
        <h3>Install</h3>
        <p>Install copy.</p>
        <h2 id="usage-explicit">Usage</h2>
        <p>Usage copy.</p>
      </div>
      <Outline containerRef={ref} label="DOM outline" />
    </div>
  );
}

const meta: Meta<typeof Outline> = {
  title: "_internal/Outline behavior",
  component: Outline,
  parameters: { controls: { disable: true } },
};
export default meta;
type Story = StoryObj<typeof Outline>;

/** Last-passed: scroll so A + B have passed their activation lines but C has not → the LAST passed
 *  heading (B) is active, and it carries aria-current="location". */
export const LastPassedWins: Story = {
  render: () => <SpyFixture testid="scroller-last" />,
  play: async ({ canvasElement }) => {
    const scroller = await waitFor(() => canvasElement.querySelector<HTMLElement>('[data-testid="scroller-last"]'));
    // B's activation line is ~299 (offsetTop 300 − 1); C's is ~599. Scroll past B, short of C.
    scroller.scrollTop = 350;
    scroller.dispatchEvent(new Event("scroll"));
    await waitFor(() => activeId(canvasElement) === "sec-b");

    const active = canvasElement.querySelector<HTMLElement>('.rt-ds-outline-link[aria-current]');
    if (!active) throw new Error("an entry must carry aria-current after the last-passed heading is reached");
    if (active.getAttribute("aria-current") !== "location")
      throw new Error(`active entry must be aria-current="location"; got "${active.getAttribute("aria-current")}"`);
    if (activeId(canvasElement) !== "sec-b")
      throw new Error(`last-passed heading must be Section B; got ${activeId(canvasElement)}`);
  },
};

/** atBottom guard: at the very bottom the LAST entry (C) wins even though C's activation line is never
 *  reached (it's too short) — without the guard, B would stay active at page end. */
export const AtBottomGuard: Story = {
  render: () => <SpyFixture testid="scroller-bottom" />,
  play: async ({ canvasElement }) => {
    const scroller = await waitFor(() => canvasElement.querySelector<HTMLElement>('[data-testid="scroller-bottom"]'));
    const maxScroll = scroller.scrollHeight - scroller.clientHeight;
    // Sanity: C's activation line sits beyond the max scroll, so only the bottom guard can select it.
    if (600 - 1 <= maxScroll) throw new Error("fixture invalid: Section C must be unreachable by normal scroll");
    scroller.scrollTop = maxScroll;
    scroller.dispatchEvent(new Event("scroll"));
    await waitFor(() => activeId(canvasElement) === "sec-c");
    if (activeId(canvasElement) !== "sec-c")
      throw new Error(`at page bottom the last entry (Section C) must win; got ${activeId(canvasElement)}`);
  },
};

/** Click-suppression: clicking an entry pins it (lockActiveId) so the spy doesn't fight the smooth-scroll
 *  — a scroll that would otherwise change the active entry is ignored until 'scrollend' releases the lock. */
export const ClickSuppressesSpy: Story = {
  render: () => <SpyFixture testid="scroller-click" />,
  play: async ({ canvasElement }) => {
    const scroller = await waitFor(() => canvasElement.querySelector<HTMLElement>('[data-testid="scroller-click"]'));
    scroller.scrollTop = 0;
    scroller.dispatchEvent(new Event("scroll"));
    await waitFor(() => activeId(canvasElement) === "sec-a"); // at the top, A is active

    // Click Section C → it locks active immediately, even though the scroll position hasn't reached it.
    // Block the anchor's default fragment navigation (which would reload the vitest page) while still
    // letting React's onClick → lockActiveId fire; preventDefault stops the default action, not propagation.
    const cLink = linkFor(canvasElement, "sec-c");
    if (!cLink) throw new Error("Section C link must render");
    const blockNav = (e: Event) => e.preventDefault();
    canvasElement.addEventListener("click", blockNav, true);
    cLink.click();
    canvasElement.removeEventListener("click", blockNav, true);
    await waitFor(() => activeId(canvasElement) === "sec-c");

    // A scroll back to the top would normally re-activate A — but the lock holds C.
    scroller.scrollTop = 0;
    scroller.dispatchEvent(new Event("scroll"));
    await sleep(80);
    if (activeId(canvasElement) !== "sec-c")
      throw new Error(`click-lock must pin Section C against the spy; got ${activeId(canvasElement)}`);

    // scrollend releases the lock; the spy resumes and re-selects A at the top.
    scroller.dispatchEvent(new Event("scrollend"));
    scroller.scrollTop = 0;
    scroller.dispatchEvent(new Event("scroll"));
    await waitFor(() => activeId(canvasElement) === "sec-a");
    if (activeId(canvasElement) !== "sec-a")
      throw new Error(`after scrollend the spy must resume and select Section A; got ${activeId(canvasElement)}`);
  },
};

/** Controlled activeId disables the spy entirely: the value is used verbatim and a scroll that would
 *  otherwise move the active entry is ignored. Also the explicit aria-current="location" assertion. */
export const ControlledDisablesSpy: Story = {
  render: () => <SpyFixture testid="scroller-controlled" controlledActiveId="sec-b" />,
  play: async ({ canvasElement }) => {
    const scroller = await waitFor(() => canvasElement.querySelector<HTMLElement>('[data-testid="scroller-controlled"]'));
    await waitFor(() => activeId(canvasElement) === "sec-b");

    const active = linkFor(canvasElement, "sec-b");
    if (active?.getAttribute("aria-current") !== "location")
      throw new Error(`controlled active entry must be aria-current="location"; got "${active?.getAttribute("aria-current")}"`);

    // A scroll to the top would activate A if the spy were running — it must NOT (controlled disables it).
    scroller.scrollTop = 0;
    scroller.dispatchEvent(new Event("scroll"));
    await sleep(80);
    if (activeId(canvasElement) !== "sec-b")
      throw new Error(`controlled activeId must disable the spy; got ${activeId(canvasElement)}`);
  },
};

/** DOM-driven mode: the outline is built from the container's headings — texts carried through, a missing
 *  id slugged, an explicit id kept, and level → indentation depth (minLevel-normalized). */
export const DomDrivenBuildsFromHeadings: Story = {
  render: () => <DomFixture />,
  play: async ({ canvasElement }) => {
    const links = await waitFor(() => {
      const found = canvasElement.querySelectorAll<HTMLAnchorElement>("a.rt-ds-outline-link");
      return found.length === 3 ? found : null;
    });
    const texts = Array.from(links).map((l) => l.textContent);
    if (texts.join("|") !== "Getting started|Install|Usage")
      throw new Error(`DOM-driven entries must mirror the headings; got ${texts.join("|")}`);

    // The first heading had no id → a slug was assigned and the anchor resolves to it.
    if (!linkFor(canvasElement, "getting-started"))
      throw new Error("a heading missing an id must be slugged (getting-started)");
    // The explicit id is preserved.
    if (!linkFor(canvasElement, "usage-explicit"))
      throw new Error("an explicit heading id must be preserved (usage-explicit)");

    // level → indentation: minLevel is 2 (h2), so the h3 "Install" indents one step, the h2s zero.
    const installDepth = linkFor(canvasElement, "install")?.closest("li")?.style.getPropertyValue("--ds-outline-depth");
    const startDepth = linkFor(canvasElement, "getting-started")?.closest("li")?.style.getPropertyValue("--ds-outline-depth");
    if (startDepth !== "0")
      throw new Error(`the top-level h2 entry must have indent depth 0; got ${startDepth}`);
    if (installDepth !== "1")
      throw new Error(`the nested h3 entry must indent one step (depth 1); got ${installDepth}`);
  },
};
