import type { Preview } from "@storybook/react-vite";
import { Provider, type ProviderProps } from "../src/theme/Provider";
import { assertBoxLaw } from "../src/foundations/boxLaw";

/* WHAT THE AXE GATE ACTUALLY COVERS — read this before trusting a green run.

   addon-a11y runs axe after EVERY story renders (no `play` required) and `parameters.a11y.test
   = "error"` below turns any violation into a FAILED vitest test. That part is airtight.

   What it cannot be is exhaustive: a story renders at ONE point in the globals space per run,
   and the Storybook a11y panel renders at whatever the READER's toolbar says. Anything that
   only misbehaves at some other point is invisible to the suite while being plainly visible in
   the panel — a green suite is not a claim about the whole space.

   - APPEARANCE is swept: the suite runs twice, light and dark, driven by VITE_SB_APPEARANCE
     (see vitest.config.ts). Both lanes are gates; neither is optional.
   - ACCENT is NOT swept, and cannot be here: 27 brands x 581 stories is not a runnable gate.
     It is covered one level down instead — Foundations/Colors "Swatches" asserts the --ds-*
     role pairings across all 27 accents x both appearances. NOTE THE SEAM: that check holds
     accent-11 text roles (--ds-text-link / -warning / -success) to a 4.39 floor, because
     Radix's tuned step-11 lands at 4.40-4.49 against a near-white page for the light-scale
     brands (see DECISIONS [[warning-text-tolerance]]/[[brand-collision-shift-table]] for why that was accepted). axe enforces the 4.5 line with no
     such tolerance. So a light-scale brand CAN show a serious color-contrast violation in the
     panel on text the token suite passes — by design, not by defect. Same seam applies to
     Radix's own accent-tinted skins (the soft <Code> chip is accent-11 on accent-a3).
   - uiSize / contrast / buttonOrder are not swept either; they change layout and polarity, not
     the paint roles, and no lane exists for them.

   Widening a lane is cheap to write and expensive to run. Before adding one, check the axis
   actually changes what axe sees. */
const GATE_APPEARANCE = ((import.meta as unknown as { env?: Record<string, string> }).env
  ?.VITE_SB_APPEARANCE ?? "light") as ProviderProps["appearance"];

const preview: Preview = {
  globalTypes: {
    appearance: {
      description: "Light / dark appearance",
      defaultValue: "light",
      toolbar: { title: "Appearance", icon: "sun", items: ["light", "dark"], dynamicTitle: true },
    },
    accent: {
      description: "Accent (brand) colour — proves the role layer is brand-agnostic",
      defaultValue: "iris",
      toolbar: {
        title: "Accent",
        icon: "paintbrush",
        items: ["gray", "gold", "bronze", "brown", "yellow", "amber", "orange", "tomato", "red", "ruby", "crimson", "pink", "plum", "purple", "violet", "iris", "indigo", "blue", "cyan", "teal", "jade", "green", "grass", "lime", "mint", "sky", "oxblood"],
        dynamicTitle: true,
      },
    },
    contrast: {
      description: "Contrast model: WCAG ratio or APCA perceptual. It changes only the warning label on gold, amber, yellow and lime brands ([[apca-contrast-mode]])",
      defaultValue: "wcag",
      toolbar: { title: "Contrast", icon: "contrast", items: ["wcag", "apca"], dynamicTitle: true },
    },
    uiSize: {
      description: "Global UI size — presets the default Radix size per lane + body type size",
      defaultValue: "small",
      toolbar: { title: "Size", icon: "ruler", items: ["small", "medium", "large"], dynamicTitle: true },
    },
    buttonOrder: {
      description: "Where the primary (solid) action anchors in a ButtonGroup — left or right",
      defaultValue: "primary-first",
      toolbar: { title: "Btn order", icon: "transfer", items: ["primary-first", "primary-last"], dynamicTitle: true },
    },
    /* The typefaces sit HERE, beside accent and size, because they are the same
       kind of thing: a system-level selection that should hold while you browse,
       not a control that only exists on the page documenting it. Set a face once
       and every component page renders in it — which is the only way to find out
       whether the system actually survives the swap.

       Every option NAMES THE FACE. "Default" told a reader nothing and hid the
       one thing they need to compare against — the incumbent is Inter, and the
       code lane is Menlo, so those are what the menu says. */
    typeface: {
      description: "Body + heading typeface",
      defaultValue: "inter",
      toolbar: {
        title: "Typeface",
        // Icon names come from @storybook/icons' fixed set — an unrecognised one
        // is not ignored, it renders through Storybook's deprecated `Icons`
        // shim and warns "unknown prop (<name>)" on EVERY manager render.
        // "text" and "code" are not in that set; "type" and "markup" are.
        icon: "type",
        items: [
          { value: "inter", title: "Inter" },
          { value: "schibsted-grotesk", title: "Schibsted Grotesk" },
          { value: "atkinson-hyperlegible-next", title: "Atkinson Hyperlegible Next" },
        ],
        dynamicTitle: true,
      },
    },
    codeface: {
      description: "Monospace typeface for code and figures",
      defaultValue: "menlo",
      toolbar: {
        title: "Code face",
        icon: "markup",
        items: [
          { value: "menlo", title: "Menlo" },
          { value: "jetbrains-mono", title: "JetBrains Mono" },
        ],
        dynamicTitle: true,
      },
    },
    /* No toolbar: an arbitrary colour cannot be a fixed enum. Customize
       writes it, and because it is a GLOBAL rather than page state it survives
       navigation — paste a brand there, then browse the system wearing it. */
    brandSeed: { description: "Generated brand seed (set on Customize)", defaultValue: "" },
  },
  // `appearance` is the one global the gate sweeps — GATE_APPEARANCE is "light" in the browser
  // and in the light vitest lane, "dark" in the dark lane. The toolbar still overrides it live.
  initialGlobals: { appearance: GATE_APPEARANCE, accent: "iris", contrast: "wcag", uiSize: "small", buttonOrder: "primary-first", typeface: "inter", codeface: "menlo", brandSeed: "" },
  // axe failures fail the Vitest run. Individual fixture stories (e.g. the [[registry-module-paths]]
  // fail-loud probe) override this with parameters.a11y.test = "off".
  parameters: {
    a11y: {
      test: "error",
      // TARGET SIZE (WCAG 2.2 AA, SC 2.5.8) — opted IN here, for both lanes.
      //
      // axe-core ships this rule OFF: its own rule table carries `id:"target-size" … enabled:!1`,
      // and addon-a11y re-enables nothing (its DISABLED_RULES list is ["region"] and only ever
      // subtracts). So without this line the 24px-target floor the system asserts elsewhere is
      // asserted by NOTHING at runtime — not in the panel, not in the vitest run. Verified against
      // the vendored source: with no opt-in, "target-size" appears in no result bucket at all —
      // not violations, not incomplete, not passes, not even inapplicable.
      //
      // WHY `options.rules` (an object) AND NOT `config.rules` (an array): both switch the rule on,
      // but Storybook merges parameters as objects and REPLACES arrays. Ten pages — five of them
      // System (AppShell, Avatar, CommandPalette, MultiSelect, Select) — already set their own
      // `a11y.config.rules` array for unrelated carve-outs; an array here would be thrown away
      // wholesale on those pages and the rule would silently not run on exactly the dense,
      // control-heavy stories that most need it. An object deep-merges, so it survives — confirmed
      // by reading the resolved parameters back off a story that overrides `config.rules`.
      // addon-a11y forwards this straight to `axe.run(context, options)`.
      //
      // Expect INCOMPLETES as well as violations. axe reports "incomplete" when it cannot resolve
      // a target's true actionable area by itself — most often `tabindex="-1"` controls inside a
      // roving-tabindex collection ("Is this a target?") and overlapping targets. Those are a
      // question addressed to us, not noise: resolve each by hit-testing the rendered pixels
      // (a 2D elementFromPoint grid), because a control's actionable area is frequently NOT its
      // box — padding and transparent ::after hit extenders move it. Never blanket-disable the
      // rule or bulk-suppress the incompletes; that reinstates exactly the blind spot above.
      //
      // THE SCAN CONTEXT ALREADY INCLUDES PORTALS, AND THE MENU-TRIGGER INCOMPLETE IS NOT ABOUT SCOPE.
      // Written down because the obvious theory is wrong and costs an afternoon each time. On an OPEN
      // DropdownMenu the panel reports `aria-valid-attr-value` CRITICAL incomplete on the trigger:
      // "Unable to determine if aria-controls referenced ID exists on the page while using aria-haspopup".
      // The menu content is portaled to a body-level container, so it reads like the referenced node is
      // outside the scanned tree. It is not, on either count:
      //
      //   (1) addon-a11y builds `{ include: document.body, exclude: [".sb-wrapper", "#storybook-docs",
      //       "#storybook-highlights-root"] }`, and a story's `parameters.a11y.context` carrying only
      //       `exclude` (like the one below) merely APPENDS to that list — `include` stays document.body.
      //       Portaled panels are therefore already scanned, and measurably so: with the menu open, 58 of
      //       162 passing nodes on DropdownMenu Playground sit inside the portal (56 of 90 on ContextMenu,
      //       57 of 116 on MoreMenu). Real findings do come out of them — a `region` hit inside the panel
      //       was among the results before that rule's default disable was applied.
      //   (2) The reference RESOLVES. Live on the open menu: `document.getElementById(aria-controls)`
      //       returns a node with `role="menu"` that is the very menu the trigger opened. axe still
      //       reports incomplete because `aria-valid-attr-value`'s `aria-controls` pre-check is
      //       unconditional — if the element carries `aria-haspopup` with anything but `false`, it sets
      //       messageKey `controlsWithinPopup` and returns `hasPopup === false`, so the attribute is never
      //       validated. No context can satisfy that: adding the portal container to `include` explicitly
      //       leaves the incomplete byte-identical (tested), and it appears on DropdownMenu but not on
      //       ContextMenu, whose trigger carries neither attribute.
      //
      // So it is a permanent, resolved-in-our-favour review flag on vendor markup, not a defect and not a
      // coverage gap. Do NOT widen `context.include` for it (nothing to widen), and do NOT exclude the
      // rule or the trigger (that would drop every OTHER aria value check on our own controls).
      //
      // GLYPH-ONLY TEXT (Kbd caps, arrow <Code> chips) — axe's colour-contrast check ABSTAINS on it
      // by default, and this line turns the abstention off so it MEASURES instead. Nothing is excluded
      // or suppressed here; the rule gets stricter, not looser.
      //
      // The default is `ignoreUnicode: true`, and the check's very first branch is
      // `if (ignoreUnicode && textIsEmojis(visibleText)) { this.data({messageKey:"nonBmp"}); return
      // undefined; }` — undefined being INCOMPLETE. `textIsEmojis` is true when every visible character
      // is non-BMP-ish, which axe's own regex takes to include the arrow (U+2190–U+21FF) and misc-technical
      // (U+2300–U+23FF) blocks. That is exactly a key cap: ⌘ ⌥ ⇧ ↑ ↓ ← →. So a cap reading `Esc` or `K`
      // was measured and a cap reading `⌘` was not — the abstention tracked the GLYPH, not the paint.
      // Measured across all 684 stories, both lanes: 112 nodes on 36 stories (87 classic .rt-Kbd caps,
      // 19 soft .rt-Code chips, 6 other glyph-only spans) came back incomplete for this reason alone.
      // This is the report "the keyboard story pages are inconclusive on colour contrast" — a Keyboard
      // section is dense with caps, so it is where the abstention is most visible.
      //
      // With it off, all 112 move from `incomplete` to `passes` carrying a real ratio (the classic cap
      // measures 15.98:1 light / 16.24:1 dark; the accent-tinted arrow <Code> chips 5.58–7.63:1), every
      // other incomplete cause is byte-identical, and NO node turned into a violation in either lane.
      //
      // WHAT THIS LINE STILL DOES NOT BUY, so nobody reads more into it than it earns: axe has a SECOND
      // abstention behind this one. When the ratio fails AND the text is not "human interpretable" —
      // `isHumanInterpretable` counts any single character as uninterpretable — the result is incomplete
      // `shortTextContent`, not a violation. Falsified live: repaint every cap to `--gray-7` and the
      // multi-character caps (`Esc`, `Enter`) fail at 1.52:1 as they should, while the single-glyph ⌘ ↑ ↓
      // caps come back `{"shortTextContent": 4}` — inconclusive again, and an incomplete cannot fail a run.
      // So this line makes the caps CONCLUSIVE at their real values; it does not make them GATED.
      // The gate is the measured play on Components/Content/Kbd's Usage story, which composites the cap and
      // asserts 4.5 against an independent literal — that is what actually goes red on a broken cap
      // (falsified: 1.86:1 light / 3.01:1 dark). Kbd is the covering layer for the whole family, because
      // every cap in the library — all 20-odd Keyboard sections, via `_storyKit`'s KeyRow — is that one
      // component wearing that one skin. Do not delete that play on the grounds that "axe covers it".
      //
      // MUST be `options.checks` (run-time) and NEVER `config.checks` (configure-time). Both appear to
      // work and only one is safe. `Check.prototype.getOptions` DEEP-MERGES the run-time argument into
      // the check's defaults, but `Check.prototype.configure` does `this.options =
      // normalizeOptions(spec.options)` — a wholesale REPLACE that drops `contrastRatio`, `boldValue`
      // and `largeTextPt` along with everything else, leaving the check no thresholds to judge against.
      // Verified live on one harness across all 684 stories, so both sides are like for like: routed
      // through `config.checks` the same one-liner takes the library from 571 incompletes and 133
      // colour-contrast violations to 637 blanket "(default)" incompletes and ZERO violations — every
      // real contrast failure in the library silently vanishes. That is the false-green; this is not it.
      // (That 133 is the harness's own count, which does not replay every story's carve-outs, so it is
      // not the suite's number — the point is that it goes to zero, not what it starts at.)
      options: {
        rules: { "target-size": { enabled: true } },
        checks: { "color-contrast": { options: { ignoreUnicode: false } } },
      },
      // The one carve-out the whole system shares: the DO/DON'T word on a do/don't card, which is
      // semantic step-11 ink on its own step-3 tint and measures 4.10 at 12px bold. Set here so a page
      // with no a11y parameters of its own still gets it.
      //
      // NOTE FOR ANY PAGE THAT SETS ITS OWN `context.exclude`: Storybook merges parameters as objects
      // but REPLACES arrays, so your array wins outright and this default disappears. List
      // DODONT_LABEL (from _storyKit) in your own array — every page in the system that needs it does.
      //
      // Never widen this to "[data-dodont]". `context.exclude` drops the element from EVERY axe rule,
      // not just the one you meant, and the wide selector was measurably hiding real defects — a
      // critical dangling aria-controls on Tabs' do/don't tablists, among others.
      context: { exclude: ["[data-dodont-label]"] },
    },
    // Sidebar order ([[sidebar-order]]): Index, Foundations, Components, UI examples, then `_internal`.
    // Foundations opens on Customize, Changelog and Decisions, then the topics. Components is
    // subgrouped into 12 categories. UI examples holds the eight recreations. `_internal` holds the
    // test-only behaviour fixtures and comes LAST, collapsed by manager.ts, so nothing a reader
    // should not copy sits among the components. A new Components/* story MUST add itself to
    // STORY_CATEGORIES in src/foundations/storyCategories.ts AND to the literal array below, in the
    // same commit. src/foundations/story-category.node-check.ts fails loudly if the former is
    // missing, and src/foundations/story-category-order.node-check.ts fails loudly if this array
    // drifts out of sync with STORY_CATEGORIES. This MUST be a plain literal, not a computed
    // expression: Storybook statically parses this file's AST to build the story index and cannot
    // evaluate a CallExpression here (confirmed live — `Object.entries(...).flatMap(...)` crashed the
    // dev server with "Unknown node type CallExpression"). Per-story order within a component
    // (History-first, Playground-last) is enforced separately by
    // src/foundations/story-order.node-check.ts, NOT by storySort — that inner nesting was found
    // unreliable, which is why that guard exists.
    options: {
      storySort: {
        order: [
          // Index is the only ROOT-LEVEL page: it is the front door OF the system rather than a
          // topic within it, so it opens the sidebar above every group. Customize is a
          // foundation and leads that group — the knobs come before the topics they affect.
          "Index",
          "Foundations", ["Customize", "Changelog", "Decisions", "Spacing & radius", "Typography", "Icons", "Colors", "Elevation", "Motion", "Enforcement"],
          "Components", [
            "Action", ["Button", "IconButton", "ButtonGroup", "ToggleButton", "ToggleButtonGroup", "DropdownMenu", "ContextMenu", "MoreMenu", "Toolbar", "DragHandle"],
            "Chat", ["ChatLayout", "ChatMessageList", "ChatMessage", "ChatMessageMetadata", "ChatSystemMessage", "ChatToolCalls", "ChatComposer"],
            "Choice", ["Checkbox", "CheckboxGroup", "CheckboxCards", "RadioGroup", "RadioCards", "SegmentedControl", "Slider", "Switch", "Select", "MultiSelect"],
            "Container", ["AspectRatio", "Card", "Carousel", "ClickableCard", "Collapsible", "Grid", "Overlay", "ScrollArea", "Section", "Tabs"],
            "Content", ["Avatar", "AvatarGroup", "Blockquote", "Citation", "Code", "DataList", "Kbd", "Link", "Thumbnail", "Timestamp", "Token", "VisuallyHidden"],
            "Date & Time", ["Calendar", "DateInput", "DateRangeInput", "DateTimeInput", "TimeInput"],
            "Feedback & Status", ["Badge", "Callout", "EmptyState", "Progress", "Skeleton", "Spinner", "StatusDot", "Toast", "Tooltip"],
            "Layout", ["AppShell", "Layout", "FormLayout", "Separator", "ResizeHandle"],
            "Modals & Popovers", ["AlertDialog", "CommandPalette", "Dialog", "HoverCard", "Lightbox", "Popover"],
            "Navigation", ["Breadcrumbs", "MobileNav", "Outline", "Pagination", "SideNav", "TopNav"],
            "Table & List", ["List", "OverflowList", "Table", "TreeList"],
            "Typed Entry", ["TextField", "TextArea", "NumberInput", "FileInput", "PowerSearch", "Typeahead", "Tokenizer"],
          ],
          // The eight RECREATIONS, one leaf each, after the component reference ([[sidebar-order]], amending
          // [[showcases-and-fixture]]'s root placement). A reader meets the parts first, then screens that put them
          // together. Each file names its one story after its title, so Storybook hoists it to a
          // single leaf rather than a folder with a "Screen" inside. Order is by paradigm — the
          // three AI-native screens lead, because they are the ones a component reference cannot
          // teach you. src/foundations/showcases.node-check.ts holds this array to SHOWCASES.
          "UI examples", [
            "Code editor", "AI assistant", "Agent run", "Video platform", "Social feed", "Mail client",
            "Analytics dashboard", "Project board",
          ],
          // The About page opens `_internal`, so the one thing a reader sees on expanding it says
          // what the fixtures are and where to go instead.
          "_internal", ["About this section"],
        ],
      },
    },
  },
  /* THE BOX LAW, on every story, forever — the second per-story gate beside axe.
     addon-a11y earns its coverage by hooking `afterEach` at the PROJECT level: one hook, every story,
     `play` or no `play`. Geometry gets the same treatment here rather than a fixture that has to be
     remembered. `src/foundations/boxLaw.ts` holds the whole truth (ladders, control-root selectors,
     `max(step × --scaling, 24)`, the classifier, the `data-size-lesson` contract, the known-debt list)
     and a periodic three-tier census, kept outside this repository, injects that SAME file into its
     Playwright sweep, so the every-run guard and the deep census cannot drift apart.

     Layer 1 (box == its own claimed step) runs everywhere; layer 2 (a pin off the ambient tier must
     carry `data-size-lesson`) runs on docs stories only. Both are documented in that file's header —
     read it before adding an exemption, and prefer fixing the size to marking it.

     `viewMode === "story"` for the same reason addon-a11y uses it: the docs page renders every story
     of a component at once, so a failure there would name the page and not the story. */
  afterEach: async (ctx) => {
    if (ctx.viewMode !== "story") return;
    assertBoxLaw({
      id: ctx.id,
      title: ctx.title,
      name: ctx.name,
      uiSize: String(ctx.globals.uiSize ?? "small"),
    });
  },
  decorators: [
    (Story, ctx) => {
      const seed = String(ctx.globals.brandSeed ?? "");
      // `inter` and `menlo` ARE the system defaults, so selecting them writes no
      // property at all and every var() falls through — identical to a system
      // with no typeface prop. They are named rather than called "default"
      // because a reader comparing faces needs to know what they are comparing to.
      const face = String(ctx.globals.typeface ?? "inter");
      const mono = String(ctx.globals.codeface ?? "menlo");
      const typefaces =
        face === "inter" && mono === "menlo"
          ? undefined
          : {
              ...(face === "inter" ? {} : { body: face as never }),
              ...(mono === "menlo" ? {} : { code: mono as never }),
            };
      return (
        <Provider
          appearance={ctx.globals.appearance as ProviderProps["appearance"]}
          // A seed set on Customize wins over the named accent, so the
          // generated brand persists as you navigate the system.
          accentColor={seed ? { seed } : (ctx.globals.accent as ProviderProps["accentColor"])}
          typefaces={typefaces}
          contrast={ctx.globals.contrast as ProviderProps["contrast"]}
          uiSize={ctx.globals.uiSize as ProviderProps["uiSize"]}
          buttonOrder={ctx.globals.buttonOrder as ProviderProps["buttonOrder"]}
        >
          <Story />
        </Provider>
      );
    },
  ],
};
export default preview;
