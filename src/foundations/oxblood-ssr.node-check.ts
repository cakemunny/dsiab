/* =============================================================================
   oxblood-ssr.node-check.ts — A PART GIVEN OXBLOOD CARRIES IT IN A SERVER RENDER
   -----------------------------------------------------------------------------
   Radix writes `data-accent-color` on each part itself, after the props a wrapper passes, so a wrapper
   that passes oxblood as a prop sees it replaced. The browser path sets the attribute through a ref
   ([[part-colour-parity]]), and a ref does not run in a server render, so until the page hydrated these
   parts painted the page accent. Link renders its own anchor through Radix's `asChild` for oxblood, and
   TextField and TextArea put the attribute on their inner field, which a `:has()` arm in oxblood.css
   reads from the root. DataList.Label stays a recorded limit: its Radix label has no `asChild` and no
   inner element that takes our props.
   ============================================================================= */
import { createElement } from "react";
import { renderToString } from "react-dom/server";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { test, expect } from "vitest";
import { Theme } from "@radix-ui/themes";
import { Link } from "../components/ui/Link";
import { TextField } from "../components/ui/TextField";
import { TextArea } from "../components/ui/TextArea";

const render = (node: Parameters<typeof createElement>[0], props: Record<string, unknown>) =>
  renderToString(createElement(Theme, null, createElement(node, props)));

test("Link with oxblood carries the attribute on its anchor in a server render", () => {
  const html = render(Link, { color: "oxblood", href: "#x", children: "Docs" });
  expect(html).toMatch(/<a[^>]*data-accent-color="oxblood"[^>]*>Docs<\/a>/);
  expect(html).toMatch(/<a[^>]*class="[^"]*rt-Link/);
});

test("TextField and TextArea with oxblood carry the attribute on the inner field in a server render", () => {
  expect(render(TextField, { color: "oxblood", "aria-label": "Name" })).toMatch(/<input[^>]*data-accent-color="oxblood"/);
  expect(render(TextArea, { color: "oxblood", "aria-label": "Notes" })).toMatch(/<textarea[^>]*data-accent-color="oxblood"/);
});

test("oxblood.css maps the accent onto a field root whose inner field carries oxblood", () => {
  const css = readFileSync(join(process.cwd(), "src/tokens/oxblood.css"), "utf8");
  expect(css).toContain('.rt-TextFieldRoot:has(> .rt-TextFieldInput[data-accent-color="oxblood"])');
  expect(css).toContain('.rt-TextAreaRoot:has(> .rt-TextAreaInput[data-accent-color="oxblood"])');
});

test("a part with another colour carries no oxblood attribute", () => {
  expect(render(Link, { color: "green", href: "#x", children: "Docs" })).not.toContain('data-accent-color="oxblood"');
  expect(render(TextField, { color: "green", "aria-label": "Name" })).not.toContain('data-accent-color="oxblood"');
});
