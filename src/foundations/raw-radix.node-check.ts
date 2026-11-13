/* =============================================================================
   raw-radix.node-check.ts — THE SYSTEM'S OWN CODE USES THE SYSTEM'S OWN LAYER
   -----------------------------------------------------------------------------
   [[system-layout-layers]]. This is a design system, so everything built on it, its own pages
   and tests included, uses the layer it defines: a component imports `Button` from the system,
   lays out with the system's `Box`, `Flex` and `Grid`, and re-establishes a theme root through
   `src/theme/ThemeRoot.tsx`. A raw `@radix-ui/themes` import outside the layer that wraps Radix
   skips the size lane, the roles and the guards the wrapper carries, and nothing on the page
   shows it.

   TWO LAYERS, DECIDED BY PATH:

     IMPLEMENTATION  the modules that wrap Radix, so importing it is their job: every
                     non-story file in `src/` whose name does not start with an underscore,
                     outside `src/foundations` and `src/scenarios`.
     BUILT ON IT     everything else: every `*.stories.tsx`, every underscored module (the
                     story kit, the comparisons, the docs-only fields), the test lane in
                     `src/foundations` and the scenario pages in `src/scenarios`. These import
                     the system's modules and never `@radix-ui/themes`.

   A TYPE-ONLY import is not an import of Radix's code, so `import type { … }` and a specifier
   list that holds only `type` names pass. A string that only quotes an import, as `ds-check`'s
   own fixtures do, is not a statement and passes.

   GRANDFATHERED, AND COUNTED. 188 files broke the rule when it was ruled on 2026-11-13. They
   are listed below and move onto the system's layer in the changes that follow. The list only
   shrinks: a listed file that no longer imports raw Radix fails as stale, so the entry is
   deleted in the change that cleans the file, and a file not on the list that imports raw
   Radix fails at once.
   ============================================================================= */
import { readFileSync } from "node:fs";
import { basename } from "node:path";
import { execFileSync } from "node:child_process";
import { expect, test } from "vitest";

const GRANDFATHERED = new Set<string>([
  "src/components/ui/AlertDialog.stories.tsx",
  "src/components/ui/AppShell.stories.tsx",
  "src/components/ui/AspectRatio.stories.tsx",
  "src/components/ui/Avatar.stories.tsx",
  "src/components/ui/AvatarGroup.stories.tsx",
  "src/components/ui/Badge.stories.tsx",
  "src/components/ui/Blockquote.stories.tsx",
  "src/components/ui/Breadcrumbs.stories.tsx",
  "src/components/ui/Button.stories.tsx",
  "src/components/ui/ButtonGroup.stories.tsx",
  "src/components/ui/Calendar.stories.tsx",
  "src/components/ui/Callout.stories.tsx",
  "src/components/ui/Card.stories.tsx",
  "src/components/ui/Carousel.stories.tsx",
  "src/components/ui/ChatComposer.stories.tsx",
  "src/components/ui/ChatLayout.stories.tsx",
  "src/components/ui/ChatMessage.stories.tsx",
  "src/components/ui/ChatMessageList.stories.tsx",
  "src/components/ui/ChatMessageMetadata.stories.tsx",
  "src/components/ui/ChatSystemMessage.stories.tsx",
  "src/components/ui/ChatToolCalls.stories.tsx",
  "src/components/ui/Checkbox.stories.tsx",
  "src/components/ui/CheckboxCards.stories.tsx",
  "src/components/ui/CheckboxGroup.stories.tsx",
  "src/components/ui/Citation.stories.tsx",
  "src/components/ui/ClickableCard.stories.tsx",
  "src/components/ui/Code.stories.tsx",
  "src/components/ui/Collapsible.stories.tsx",
  "src/components/ui/CommandPalette.stories.tsx",
  "src/components/ui/ContextMenu.stories.tsx",
  "src/components/ui/DataList.stories.tsx",
  "src/components/ui/DateInput.stories.tsx",
  "src/components/ui/DateRangeInput.stories.tsx",
  "src/components/ui/DateTimeInput.stories.tsx",
  "src/components/ui/Dialog.stories.tsx",
  "src/components/ui/DragHandle.stories.tsx",
  "src/components/ui/DropdownMenu.stories.tsx",
  "src/components/ui/EmptyState.stories.tsx",
  "src/components/ui/FileInput.stories.tsx",
  "src/components/ui/FormLayout.stories.tsx",
  "src/components/ui/Grid.stories.tsx",
  "src/components/ui/HoverCard.stories.tsx",
  "src/components/ui/IconButton.stories.tsx",
  "src/components/ui/Kbd.stories.tsx",
  "src/components/ui/Layout.stories.tsx",
  "src/components/ui/Lightbox.stories.tsx",
  "src/components/ui/Link.stories.tsx",
  "src/components/ui/List.stories.tsx",
  "src/components/ui/MobileNav.stories.tsx",
  "src/components/ui/MoreMenu.stories.tsx",
  "src/components/ui/MultiSelect.stories.tsx",
  "src/components/ui/NumberInput.stories.tsx",
  "src/components/ui/Outline.stories.tsx",
  "src/components/ui/OverflowList.stories.tsx",
  "src/components/ui/Overlay.stories.tsx",
  "src/components/ui/Pagination.stories.tsx",
  "src/components/ui/Popover.stories.tsx",
  "src/components/ui/PowerSearch.stories.tsx",
  "src/components/ui/Progress.stories.tsx",
  "src/components/ui/RadioCards.stories.tsx",
  "src/components/ui/RadioGroup.stories.tsx",
  "src/components/ui/ResizeHandle.stories.tsx",
  "src/components/ui/ScrollArea.stories.tsx",
  "src/components/ui/Section.stories.tsx",
  "src/components/ui/SegmentedControl.stories.tsx",
  "src/components/ui/Select.stories.tsx",
  "src/components/ui/Separator.stories.tsx",
  "src/components/ui/SideNav.stories.tsx",
  "src/components/ui/Skeleton.stories.tsx",
  "src/components/ui/Slider.stories.tsx",
  "src/components/ui/Spinner.stories.tsx",
  "src/components/ui/StatusDot.stories.tsx",
  "src/components/ui/Switch.stories.tsx",
  "src/components/ui/Table.stories.tsx",
  "src/components/ui/Tabs.stories.tsx",
  "src/components/ui/TextArea.stories.tsx",
  "src/components/ui/TextField.stories.tsx",
  "src/components/ui/Thumbnail.stories.tsx",
  "src/components/ui/TimeInput.stories.tsx",
  "src/components/ui/Timestamp.stories.tsx",
  "src/components/ui/Toast.stories.tsx",
  "src/components/ui/ToggleButton.stories.tsx",
  "src/components/ui/ToggleButtonGroup.stories.tsx",
  "src/components/ui/Token.stories.tsx",
  "src/components/ui/Tokenizer.stories.tsx",
  "src/components/ui/Toolbar.stories.tsx",
  "src/components/ui/Tooltip.stories.tsx",
  "src/components/ui/TopNav.stories.tsx",
  "src/components/ui/TreeList.stories.tsx",
  "src/components/ui/Typeahead.stories.tsx",
  "src/components/ui/VisuallyHidden.stories.tsx",
  "src/components/ui/_alert-dialog.stories.tsx",
  "src/components/ui/_appshell.stories.tsx",
  "src/components/ui/_avatar.stories.tsx",
  "src/components/ui/_breadcrumbs.stories.tsx",
  "src/components/ui/_calendar.stories.tsx",
  "src/components/ui/_callout.stories.tsx",
  "src/components/ui/_card.stories.tsx",
  "src/components/ui/_carousel.stories.tsx",
  "src/components/ui/_chat-composer.stories.tsx",
  "src/components/ui/_chat-layout.stories.tsx",
  "src/components/ui/_chat-message-list.stories.tsx",
  "src/components/ui/_chat-message-metadata.stories.tsx",
  "src/components/ui/_chat-message.stories.tsx",
  "src/components/ui/_chat-system-message.stories.tsx",
  "src/components/ui/_chat-tool-calls.stories.tsx",
  "src/components/ui/_checkbox-cards.stories.tsx",
  "src/components/ui/_citation.stories.tsx",
  "src/components/ui/_clickable-card.stories.tsx",
  "src/components/ui/_collapsible.stories.tsx",
  "src/components/ui/_commandpalette.stories.tsx",
  "src/components/ui/_comparisons.tsx",
  "src/components/ui/_context-menu.stories.tsx",
  "src/components/ui/_dateinput.stories.tsx",
  "src/components/ui/_daterangeinput.stories.tsx",
  "src/components/ui/_datetimeinput.stories.tsx",
  "src/components/ui/_dialog.stories.tsx",
  "src/components/ui/_escape-stack.stories.tsx",
  "src/components/ui/_field.stories.tsx",
  "src/components/ui/_fileinput.stories.tsx",
  "src/components/ui/_focus.stories.tsx",
  "src/components/ui/_forced-colors.stories.tsx",
  "src/components/ui/_form-layout.stories.tsx",
  "src/components/ui/_hovercard.stories.tsx",
  "src/components/ui/_item.stories.tsx",
  "src/components/ui/_list.stories.tsx",
  "src/components/ui/_mobile-nav.stories.tsx",
  "src/components/ui/_more-menu.stories.tsx",
  "src/components/ui/_non-text-contrast.stories.tsx",
  "src/components/ui/_numberinput.stories.tsx",
  "src/components/ui/_overflowlist.stories.tsx",
  "src/components/ui/_overlay.stories.tsx",
  "src/components/ui/_oxblood-parts.stories.tsx",
  "src/components/ui/_pagination.stories.tsx",
  "src/components/ui/_popover.stories.tsx",
  "src/components/ui/_powersearch.stories.tsx",
  "src/components/ui/_press-scale.stories.tsx",
  "src/components/ui/_radio-cards.stories.tsx",
  "src/components/ui/_regressions.stories.tsx",
  "src/components/ui/_scroll-area.stories.tsx",
  "src/components/ui/_segmented-control.stories.tsx",
  "src/components/ui/_sidenav.stories.tsx",
  "src/components/ui/_slider.stories.tsx",
  "src/components/ui/_statusdot.stories.tsx",
  "src/components/ui/_storyKit.tsx",
  "src/components/ui/_switch.stories.tsx",
  "src/components/ui/_table.stories.tsx",
  "src/components/ui/_tabs.stories.tsx",
  "src/components/ui/_tabular-figures.stories.tsx",
  "src/components/ui/_thumbnail.stories.tsx",
  "src/components/ui/_timeinput.stories.tsx",
  "src/components/ui/_timestamp.stories.tsx",
  "src/components/ui/_toast.stories.tsx",
  "src/components/ui/_toggle-button-group.stories.tsx",
  "src/components/ui/_toggle-button.stories.tsx",
  "src/components/ui/_token.stories.tsx",
  "src/components/ui/_tokenizer.stories.tsx",
  "src/components/ui/_toolbar.stories.tsx",
  "src/components/ui/_topnav.stories.tsx",
  "src/components/ui/_treelist.stories.tsx",
  "src/components/ui/_typeahead.stories.tsx",
  "src/foundations/Customize.stories.tsx",
  "src/foundations/Decisions.stories.tsx",
  "src/foundations/Elevation.stories.tsx",
  "src/foundations/Enforcement.stories.tsx",
  "src/foundations/Index.stories.tsx",
  "src/foundations/Motion.stories.tsx",
  "src/foundations/_brand-analysis-timing.stories.tsx",
  "src/foundations/_brand-colour-field.stories.tsx",
  "src/foundations/_brandColourField.tsx",
  "src/foundations/_button-fill-parity.stories.tsx",
  "src/foundations/_helper-layer-parity.stories.tsx",
  "src/foundations/_internal-about.stories.tsx",
  "src/foundations/_surface-table.stories.tsx",
  "src/foundations/oxblood-ssr.node-check.ts",
  "src/scenarios/AgentRun.stories.tsx",
  "src/scenarios/AiAssistant.stories.tsx",
  "src/scenarios/AnalyticsDashboard.stories.tsx",
  "src/scenarios/CodeEditor.stories.tsx",
  "src/scenarios/MailClient.stories.tsx",
  "src/scenarios/ProjectBoard.stories.tsx",
  "src/scenarios/SocialFeed.stories.tsx",
  "src/scenarios/VideoPlatform.stories.tsx",
  "src/scenarios/_composition.stories.tsx",
  "src/theme/_provider-brand.stories.tsx",
  "src/theme/_seeded-brand-acceptance.stories.tsx",
  "src/theme/_seeded-brand-roles.stories.tsx",
  "src/theme/_seeded-brand-text.stories.tsx",
]);

/** A value import or re-export from Radix Themes in `source`: a statement, not a quoted string. */
export function importsRawRadix(source: string): boolean {
  const statement = /(?:^|[\n;])[ \t]*(import|export)\s+(type\s+)?([^;]*?)\s*from\s*["']@radix-ui\/themes["']/g;
  for (const m of source.matchAll(statement)) {
    if (m[2]) continue;
    const list = /\{([^}]*)\}/.exec(m[3] ?? "");
    if (list) {
      const names = list[1]!.split(",").map((s) => s.trim()).filter(Boolean);
      if (names.length && names.every((n) => n.startsWith("type "))) continue;
    }
    return true;
  }
  return false;
}

/** Built on the system, so held to its layer. */
export function isBuiltOnTheSystem(path: string): boolean {
  return path.endsWith(".stories.tsx") || basename(path).startsWith("_")
    || path.startsWith("src/foundations/") || path.startsWith("src/scenarios/");
}

const tracked = execFileSync("git", ["ls-files", "--cached", "--others", "--exclude-standard", "src"], { encoding: "utf8" })
  .split("\n").filter((f) => /\.(ts|tsx)$/.test(f) && f !== "src/foundations/raw-radix.node-check.ts");
const offenders = tracked.filter((f) => isBuiltOnTheSystem(f) && importsRawRadix(readFileSync(f, "utf8")));

test("REVERSE: the detector tells an import from a type import and a quoted string", () => {
  expect(importsRawRadix(`import { Box } from "@radix-ui/themes";`)).toBe(true);
  expect(importsRawRadix(`import { Box, type BoxProps } from '@radix-ui/themes'`)).toBe(true);
  expect(importsRawRadix(`export { Grid } from "@radix-ui/themes";`)).toBe(true);
  expect(importsRawRadix(`import * as R from "@radix-ui/themes";`)).toBe(true);
  expect(importsRawRadix(`import type { BoxProps } from "@radix-ui/themes";`)).toBe(false);
  expect(importsRawRadix(`import { type BoxProps } from "@radix-ui/themes";`)).toBe(false);
  expect(importsRawRadix(`const fixture = "a story that writes import { Box } from @radix-ui/themes";`)).toBe(false);
  expect(isBuiltOnTheSystem("src/components/ui/Button.stories.tsx")).toBe(true);
  expect(isBuiltOnTheSystem("src/components/ui/_storyKit.tsx")).toBe(true);
  expect(isBuiltOnTheSystem("src/components/ui/Button.tsx")).toBe(false);
  expect(isBuiltOnTheSystem("src/theme/ThemeRoot.tsx")).toBe(false);
});

test("no file built on the system imports raw Radix, beyond the grandfathered list", () => {
  const fresh = offenders.filter((f) => !GRANDFATHERED.has(f));
  expect(
    fresh,
    "these files import @radix-ui/themes directly. Import the system's module instead: its component from " +
      "src/components/ui, Box, Flex and Grid from their modules, and Theme from src/theme/ThemeRoot. If the " +
      "system has no layer for the thing you need, surface the gap ([[system-layout-layers]])",
  ).toEqual([]);
});

test("the grandfathered list holds only files that still break the rule", () => {
  const live = new Set(offenders);
  const stale = [...GRANDFATHERED].filter((f) => !live.has(f));
  expect(stale, "these files no longer import raw Radix (or are gone): delete them from GRANDFATHERED").toEqual([]);
});
