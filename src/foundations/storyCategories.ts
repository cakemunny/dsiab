/* =============================================================================
   storyCategories.ts — SINGLE SOURCE OF TRUTH for the Components/* nav taxonomy
   -----------------------------------------------------------------------------
   story-category.node-check.ts imports this map. .storybook/preview.tsx keeps
   a hand-written storySort literal (Storybook statically parses that file's
   AST and can't evaluate an import from here) — story-category-order.node-
   check.ts guards that literal against drift from this map instead. Add a new
   Components/* component to STORY_CATEGORIES in the same commit as its story file
   — the guard fails loudly if a story exists with no entry here.

   Member order within a category: importance-first where one component is the
   clear flagship/entry-point (e.g. Action leads with Button); alphabetical
   otherwise. Keep whichever convention a category already uses.
   ============================================================================= */
export const STORY_CATEGORIES: Record<string, string[]> = {
  // `DragHandle` sits here rather than beside `ResizeHandle` in Layout, and the distinction is what
  // each one moves: a resize handle changes layout GEOMETRY, a drag handle changes content ORDER.
  // It is a control you activate, which is what this category collects.
  Action: ["Button", "IconButton", "ButtonGroup", "ToggleButton", "ToggleButtonGroup", "DropdownMenu", "ContextMenu", "MoreMenu", "Toolbar", "DragHandle"],
  Chat: ["ChatLayout", "ChatMessageList", "ChatMessage", "ChatMessageMetadata", "ChatSystemMessage", "ChatToolCalls", "ChatComposer"],
  Choice: ["Checkbox", "CheckboxGroup", "CheckboxCards", "RadioGroup", "RadioCards", "SegmentedControl", "Slider", "Switch", "Select", "MultiSelect"],
  Container: ["AspectRatio", "Card", "Carousel", "ClickableCard", "Collapsible", "Grid", "Overlay", "ScrollArea", "Section", "Tabs"],
  Content: ["Avatar", "AvatarGroup", "Blockquote", "Citation", "Code", "DataList", "Kbd", "Link", "Thumbnail", "Timestamp", "Token", "VisuallyHidden"],
  "Date & Time": ["Calendar", "DateInput", "DateRangeInput", "DateTimeInput", "TimeInput"],
  "Feedback & Status": ["Badge", "Callout", "EmptyState", "Progress", "Skeleton", "Spinner", "StatusDot", "Toast", "Tooltip"],
  Layout: ["AppShell", "Layout", "FormLayout", "Separator", "ResizeHandle"],
  "Modals & Popovers": ["AlertDialog", "CommandPalette", "Dialog", "HoverCard", "Lightbox", "Popover"],
  Navigation: ["Breadcrumbs", "MobileNav", "Outline", "Pagination", "SideNav", "TopNav"],
  "Table & List": ["List", "OverflowList", "Table", "TreeList"],
  "Typed Entry": ["TextField", "TextArea", "NumberInput", "FileInput", "PowerSearch", "Typeahead", "Tokenizer"],
};

/** Flat reverse lookup: component name -> its category name. */
export const CATEGORY_OF: Record<string, string> = Object.fromEntries(
  Object.entries(STORY_CATEGORIES).flatMap(([category, names]) => names.map((name) => [name, category])),
);
