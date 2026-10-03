/* =============================================================================
   prior-art.node-check.ts — A NEW COMPONENT NAMES WHAT IT LEARNED FROM
   -----------------------------------------------------------------------------
   THE GAP THIS CLOSES was found in review, not by a test. A reorder
   capability was designed here from first principles plus the WCAG criteria,
   and shipped, without anybody checking how Atlassian, dnd-kit, React Aria,
   Carbon or Fluent solve the same problem. The report found the drag-and-drop
   pattern broken and asked what research into how other design systems apply
   it had been done. The answer was none. The ruling that followed names the gap
   as a large one: for any new component or large component edit, researching
   other design systems is a requirement.

   IT IS THE SAME FAILURE AS BUILDING A COMPONENT THAT ALREADY EXISTS, one level
   up. `CLAUDE.md` already says reuse before you invent, and treats repetition of
   an existing asset as consistency rather than laziness. That rule was written
   about assets inside THIS repository. The same argument applies to solved
   problems outside it: a pattern every mature system has converged on is prior
   art, and re-deriving it privately produces something subtly off in ways no
   amount of internal review catches, because everyone reviewing it shares the
   same blind spot. A reader who has used other tools feels the difference
   immediately, which is exactly how this was caught.

   WHAT THIS GUARD ASSERTS. Every registry entry added from now on carries a
   `priorArt` field: what was studied, and what was adopted or deliberately
   rejected. It must name at least two distinct sources and cite at least one
   URL, because "we looked at some other systems" is not evidence and cannot be
   checked by the next reader.

   WHAT IT DELIBERATELY DOES NOT ASSERT. Whether the research was any good. That
   is a review obligation and always will be. This guard makes the claim EXIST
   and be specific enough to audit, which is the mechanical half.

   THE BACKLOG IS GRANDFATHERED, AND COUNTED, so nobody claims a clean baseline
   that never existed: 107 entries predate the rule and are listed below. This is
   the same call `CLAUDE.md` makes for the 400-line file cap and
   `regression-cover.node-check.ts` makes for measured rulings. Do not
   retro-document the 107 because this file exists. Add `priorArt` to one when
   you next make a substantial change to it, which is the second half of the
   rule: ANY NEW COMPONENT OR LARGE COMPONENT EDIT.
   ============================================================================= */

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { test, expect } from "vitest";

const ROOT = join(import.meta.dirname, "..", "..");

interface Entry { name: string; status: string; priorArt?: string }

/** Entries that predate the rule, recorded at adoption on 2026-09-20. */
const GRANDFATHERED = new Set<string>([
  "AlertDialog", "AppShell", "AspectRatio", "Avatar", "AvatarGroup", "Badge", "Blockquote",
  "Breadcrumbs", "Button", "ButtonGroup", "Calendar", "Callout", "Card", "Carousel",
  "ChatComposer", "ChatLayout", "ChatMessage", "ChatMessageList", "ChatMessageMetadata",
  "ChatSystemMessage", "ChatToolCalls", "Checkbox", "CheckboxCards", "CheckboxGroup", "Citation",
  "ClickableCard", "Code", "CodeBlock", "Collapsible", "CommandPalette", "ContextMenu",
  "DataList", "DateInput", "DateRangeInput", "DateTimeInput", "Dialog", "DropdownMenu",
  "EmptyState", "Field", "FileInput", "FormLayout", "Grid", "Heading", "HoverCard", "Icon",
  "IconButton", "Kbd", "Layout", "Lightbox", "Link", "List", "Markdown", "MobileNav", "MoreMenu",
  "MultiSelect", "NumberInput", "Outline", "OverflowList", "Overlay", "Pagination", "Popover",
  "PowerSearch", "Progress", "RadioCards", "RadioGroup", "ResizeHandle", "ScrollArea", "Section",
  "SegmentedControl", "Select", "Separator", "SideNav", "Skeleton", "Slider", "Spinner",
  "StatusDot", "Switch", "Table", "Tabs", "Text", "TextArea", "TextField", "Thumbnail",
  "TimeInput", "Timestamp", "Toast", "ToggleButton", "ToggleButtonGroup", "Token", "Tokenizer",
  "Toolbar", "Tooltip", "TopNav", "TopNavHeading", "TopNavItem", "TopNavMegaMenu",
  "TopNavMegaMenuFeaturedCard", "TopNavMegaMenuItem", "TopNavMenu", "TreeList", "Typeahead",
  "TypeaheadItem", "VisuallyHidden", "useAnnounce", "useLightbox", "useMediaQuery",
  "useSizeLane"
]);

function registry(): Entry[] {
  return JSON.parse(readFileSync(join(ROOT, "registry.json"), "utf8")) as Entry[];
}

/** Two distinct named sources and at least one citable URL. */
function isSubstantive(claim: string): { ok: boolean; why: string } {
  if (!claim.trim()) return { ok: false, why: "it is empty" };
  const urls = claim.match(/https?:\/\/\S+/g) ?? [];
  if (urls.length === 0) return { ok: false, why: "it cites no URL, so the next reader cannot check it" };
  // Sources are separated by a semicolon or a comma in the prose; require two distinct named ones.
  const named = claim
    .split(/[;\n]/)
    .map((s) => s.trim())
    .filter((s) => s.length > 12);
  if (named.length < 2) {
    return { ok: false, why: `it names ${named.length} source, and the rule asks for at least two` };
  }
  return { ok: true, why: "" };
}

test("a registry entry added after 2026-09-20 records its prior art", () => {
  const missing = registry()
    .filter((e) => e.status === "ported" && !GRANDFATHERED.has(e.name))
    .filter((e) => !isSubstantive(e.priorArt ?? "").ok)
    .map((e) => {
      const why = isSubstantive(e.priorArt ?? "").why;
      return (
        `${e.name}: priorArt ${why}. Name what you studied and what you took or rejected, with a ` +
        `URL. A pattern other systems have converged on is prior art, and re-deriving it privately ` +
        `produces something subtly wrong that internal review cannot see`
      );
    });
  expect(missing, missing.join("\n\n")).toEqual([]);
});

test("the grandfathered list still matches the registry it was taken from", () => {
  // A stale list is how this gate quietly stops applying: a rename would drop an entry out of the
  // set and silently exempt nothing, or worse, exempt a brand new component that reused the name.
  const names = new Set(registry().map((e) => e.name));
  const ghosts = [...GRANDFATHERED].filter((n) => !names.has(n));
  expect(
    ghosts,
    `GRANDFATHERED names entries the registry no longer has: ${ghosts.join(", ")}. If one was ` +
      `renamed, it is a substantial edit, so it needs a priorArt line rather than a renamed exemption`,
  ).toEqual([]);
});

test("the gate still has something to check", () => {
  // Without this the first arm passes over an empty set the moment the registry shape changes.
  const eligible = registry().filter((e) => e.status === "ported" && !GRANDFATHERED.has(e.name));
  const ported = registry().filter((e) => e.status === "ported");
  expect(ported.length, "no ported entries were read out of registry.json").toBeGreaterThan(50);
  // Eligible may legitimately be empty before the next component lands, but the grandfathered set
  // must still be doing work, or the filter above has broken.
  expect(
    GRANDFATHERED.size,
    "the grandfathered set is empty, so every entry is being treated as new",
  ).toBeGreaterThan(50);
  expect(eligible.length + GRANDFATHERED.size).toBeGreaterThanOrEqual(ported.length);
});
