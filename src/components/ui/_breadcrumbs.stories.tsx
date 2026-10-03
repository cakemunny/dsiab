import type { Meta, StoryObj } from "@storybook/react-vite";
import { Box } from "@radix-ui/themes";
import { Breadcrumbs, BreadcrumbItem } from "./Breadcrumbs";

/* Test-only behavior for Breadcrumbs — kept OUT of the docs stories (System/Breadcrumbs). Underscore-
   prefixed → registry- and story-order-guard-exempt, grouped under _internal. Covers the lifted
   auto-current DOM-scan (aria-current polarity: on the CONTENT element, not the <li>, even for a linked
   last crumb), explicit-isCurrent precedence, the leading aria-hidden separators (hidden on :first-child),
   and the element forms (href → <a>, onClick → <button>, current → <span>). */

async function waitFor<T>(fn: () => T | null | undefined | false, timeout = 1500): Promise<T> {
  const t0 = performance.now();
  for (;;) {
    const v = fn();
    if (v) return v as T;
    if (performance.now() - t0 > timeout) throw new Error("waitFor: timed out");
    await new Promise((r) => requestAnimationFrame(r));
  }
}
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const itemsOf = (root: ParentNode) =>
  Array.from(root.querySelector("ol.rt-ds-breadcrumbs")!.children) as HTMLElement[];

const meta: Meta<typeof Breadcrumbs> = {
  title: "_internal/Breadcrumbs behavior",
  component: Breadcrumbs,
  parameters: { controls: { disable: true } },
};
export default meta;
type Story = StoryObj<typeof Breadcrumbs>;

/** Auto-current: no explicit isCurrent → the LAST crumb's CONTENT element (the <a>, not the <li>) gets
 *  aria-current="page"; earlier crumbs and every <li> stay unmarked. */
export const AutoCurrentOnLastLink: Story = {
  render: () => (
    <Box p="4">
      <Breadcrumbs label="Auto current">
        <BreadcrumbItem href="#a">Alpha</BreadcrumbItem>
        <BreadcrumbItem href="#b">Beta</BreadcrumbItem>
        <BreadcrumbItem href="#c">Gamma</BreadcrumbItem>
      </Breadcrumbs>
    </Box>
  ),
  play: async ({ canvasElement }) => {
    const items = itemsOf(canvasElement);
    // The effect marks the last item's content element after paint.
    const lastLink = await waitFor(() =>
      items[items.length - 1].querySelector<HTMLElement>('a[aria-current="page"]'),
    );
    if (lastLink.tagName !== "A") throw new Error("aria-current must land on the content <a>");
    if (lastLink.getAttribute("href") !== "#c") throw new Error("the current link keeps its href (still navigable)");

    // Polarity: NO <li> carries aria-current.
    for (const li of items)
      if (li.getAttribute("aria-current") != null)
        throw new Error("aria-current must be on the content element, never the <li>");

    // Exactly one marker, and it's the last link.
    const marked = canvasElement.querySelectorAll('[aria-current="page"]');
    if (marked.length !== 1) throw new Error(`exactly one crumb must be current; got ${marked.length}`);
    if (marked[0] !== lastLink) throw new Error("the current marker must be the LAST crumb's content");
  },
};

/** Explicit isCurrent wins: a marked crumb renders a <span aria-current> (no link), and auto-detection
 *  does NOT also mark the last crumb. */
export const ExplicitCurrentPreventsAuto: Story = {
  render: () => (
    <Box p="4">
      <Breadcrumbs label="Explicit current">
        <BreadcrumbItem href="#a">Alpha</BreadcrumbItem>
        <BreadcrumbItem isCurrent>Beta</BreadcrumbItem>
        <BreadcrumbItem href="#c">Gamma</BreadcrumbItem>
      </Breadcrumbs>
    </Box>
  ),
  play: async ({ canvasElement }) => {
    const items = itemsOf(canvasElement);
    // Let the auto-current effect run — it must see the explicit marker and leave the last crumb alone.
    await sleep(30);

    const marked = canvasElement.querySelectorAll('[aria-current="page"]');
    if (marked.length !== 1) throw new Error(`explicit current must be the only marker; got ${marked.length}`);

    // The marked element is a SPAN (the explicit current), inside the middle crumb.
    const current = marked[0] as HTMLElement;
    if (current.tagName !== "SPAN") throw new Error("an explicit current crumb must be a <span>, not a link");
    if (current.closest("li") !== items[1]) throw new Error("the explicit current must be the middle crumb");

    // The last crumb (a link) is NOT auto-marked.
    if (items[2].querySelector('[aria-current="page"]'))
      throw new Error("the last crumb must NOT be auto-marked when an explicit current exists");
  },
};

/** Separators: one LEADING aria-hidden span per crumb, hidden on the first, shown on the rest. */
export const Separators: Story = {
  render: () => (
    <Box p="4">
      <Breadcrumbs label="Separators" separator="/">
        <BreadcrumbItem href="#a">Alpha</BreadcrumbItem>
        <BreadcrumbItem href="#b">Beta</BreadcrumbItem>
        <BreadcrumbItem isCurrent>Gamma</BreadcrumbItem>
      </Breadcrumbs>
    </Box>
  ),
  play: async ({ canvasElement }) => {
    const items = itemsOf(canvasElement);
    const seps = canvasElement.querySelectorAll<HTMLElement>(".rt-ds-breadcrumb-sep");
    if (seps.length !== items.length) throw new Error("every crumb must render its own leading separator");

    // All separators are decorative.
    for (const s of seps)
      if (s.getAttribute("aria-hidden") !== "true") throw new Error("separators must be aria-hidden");

    // The FIRST crumb's separator is hidden; a later one is shown.
    const firstSep = items[0].querySelector<HTMLElement>(".rt-ds-breadcrumb-sep")!;
    if (getComputedStyle(firstSep).display !== "none")
      throw new Error("the first crumb's leading separator must be hidden (display:none)");
    const secondSep = items[1].querySelector<HTMLElement>(".rt-ds-breadcrumb-sep")!;
    if (getComputedStyle(secondSep).display === "none")
      throw new Error("a non-first crumb's separator must be shown");
  },
};

/** Element forms: href → <a href>, onClick-only → <button type=button>, current → <span> (no link). */
export const ElementForms: Story = {
  render: () => (
    <Box p="4">
      <Breadcrumbs label="Forms">
        <BreadcrumbItem data-testid="link" href="#a">Link</BreadcrumbItem>
        <BreadcrumbItem data-testid="btn" onClick={() => {}}>Button</BreadcrumbItem>
        <BreadcrumbItem data-testid="cur" isCurrent>Current</BreadcrumbItem>
      </Breadcrumbs>
    </Box>
  ),
  play: async ({ canvasElement }) => {
    const link = canvasElement.querySelector<HTMLElement>('[data-testid="link"]')!;
    const btn = canvasElement.querySelector<HTMLElement>('[data-testid="btn"]')!;
    const cur = canvasElement.querySelector<HTMLElement>('[data-testid="cur"]')!;

    // href → a real <a href>.
    const a = link.querySelector<HTMLAnchorElement>("a.rt-ds-breadcrumb-link");
    if (!a || a.getAttribute("href") !== "#a") throw new Error("a href crumb must render an <a href>");

    // onClick-only → a reset <button type=button>, no <a>.
    const b = btn.querySelector<HTMLButtonElement>("button.rt-ds-breadcrumb-button");
    if (!b || b.getAttribute("type") !== "button") throw new Error("an onClick-only crumb must be a <button type=button>");
    if (btn.querySelector("a")) throw new Error("an onClick-only crumb must not render an <a>");

    // current → a <span aria-current>, never a link.
    const span = cur.querySelector<HTMLElement>('span[aria-current="page"]');
    if (!span || span.tagName !== "SPAN") throw new Error("the current crumb must be a <span aria-current>");
    if (cur.querySelector("a")) throw new Error("the current crumb must not be a link");
  },
};

/** Structure: a <nav aria-label> wrapping an <ol> of <li> crumbs.
 *  Word-length crumbs, matching every other fixture in this file — a single letter renders an 8px-wide
 *  link, narrow enough to fail the pointer-target floor on BOTH its size and its spacing, which is a
 *  property of the fixture rather than of the component. A crumb is a page name; it is never one glyph. */
export const NavStructure: Story = {
  render: () => (
    <Box p="4">
      <Breadcrumbs label="My trail">
        <BreadcrumbItem href="#a">Alpha</BreadcrumbItem>
        <BreadcrumbItem href="#b">Beta</BreadcrumbItem>
        <BreadcrumbItem isCurrent>Gamma</BreadcrumbItem>
      </Breadcrumbs>
    </Box>
  ),
  play: async ({ canvasElement }) => {
    const nav = canvasElement.querySelector<HTMLElement>("nav.rt-ds-breadcrumbs-nav")!;
    if (nav.getAttribute("aria-label") !== "My trail") throw new Error("the nav must carry the label");
    const ol = nav.querySelector("ol.rt-ds-breadcrumbs");
    if (!ol || ol.tagName !== "OL") throw new Error("the trail must be an <ol>");
    const lis = Array.from(ol.children);
    if (lis.length !== 3 || lis.some((li) => li.tagName !== "LI"))
      throw new Error("each crumb must be a direct <li> child of the <ol>");
  },
};
