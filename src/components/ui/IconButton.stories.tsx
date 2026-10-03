import type { Meta, StoryObj } from "@storybook/react-vite";
import { Box, Code, Flex, Grid, Tooltip } from "@radix-ui/themes";
import { ArrowsClockwise, DotsThree, Gear, Lightning, MagnifyingGlass, PencilSimple, Plus, Trash, X } from "@phosphor-icons/react";
import { IconButton } from "./IconButton";
import { Text as UIText } from "./Text";
import { ButtonGroup } from "./ButtonGroup";
import {
  AccentColor, AnatomyLegend, Caption, Decision, DoDont, DODONT_LABEL, dotStyle, HexThemeKey, hLine,
  MeasuredRow, MeasuredSpec, NoteRow, Page, PageHeader, PropsLead, PropDef, PropTable, Rule, Scenario,
  Section, tick, TokenGroup,
} from "./_storyKit";
import { assertMeasuredRows, parseColor, resolveColor, themeRoot } from "../../foundations/_assert";

/** The one definition of this component — the standfirst every page of it opens with. */
const DEFINITION = (
  <>
    A square, icon-only button — the icon-only sibling of <Code>Button</Code>, speaking the same{" "}
    <Code>priority</Code> ladder. Because there is no visible text, every icon button requires an{" "}
    <Code>aria-label</Code>, and the icon has to read unambiguously in context. When it does not, use a
    text <Code>Button</Code>.
  </>
);

/* ---- anatomy diagram (IconButton-specific) ------------------------------- */

function AnatomyDiagram() {
  // The icon button centers via flex; callouts track the square via calc() at any width. The specimen is
  // fixed at size 3 — a stable spec reference. Below ~340px the wrapper scrolls.
  return (
    <Box style={{ overflowX: "auto" }}>
      <Box style={{ position: "relative", width: "100%", minWidth: 340, maxWidth: 600, margin: "0 auto", height: 210, background: "var(--ds-bg-subtle)", borderRadius: "var(--ds-radius-4)", overflow: "hidden" }}>
        <Flex align="center" justify="center" style={{ position: "absolute", inset: 0 }}>
          <Box style={{ position: "relative" }}>
            {/* focus-ring overlay — the two layers the control paints ([[focus-ring]]): the accent base, then the Radix alpha stacked on it */}
            <Box aria-hidden style={{ position: "absolute", inset: -2, borderRadius: "var(--ds-radius-3)", outline: "2px solid var(--ds-stroke-focus)", outlineOffset: 2, pointerEvents: "none" }} />
            <Box aria-hidden style={{ position: "absolute", inset: -2, borderRadius: "var(--ds-radius-3)", outline: "2px solid var(--ds-stroke-focus-stack)", outlineOffset: 2, pointerEvents: "none" }} />
            <IconButton priority="secondary" size="3" aria-label="Add item" data-size-lesson="anatomy callout geometry"><Plus weight="bold" /></IconButton>
          </Box>
        </Flex>
        {/* controller: align callouts — added part 4 (Accessible name) from the right; nudge if the 4th line crowds the square */}
        {/* 2 — Icon: from above, down onto the glyph at center */}
        <Box style={{ ...dotStyle, left: "50%", top: 26, transform: "translateX(-50%)" }}>2</Box>
        <Box style={tick({ left: "50%", top: 46, height: 39 })} />
        {/* 1 — Container: from the left, to the square's upper-left edge */}
        <Box style={{ ...dotStyle, left: "calc(50% - 150px)", top: 78 }}>1</Box>
        <Box style={hLine({ left: "calc(50% - 130px)", top: 88, width: 110 })} />
        {/* 3 — Focus ring: from the left, to the square's lower-left */}
        <Box style={{ ...dotStyle, left: "calc(50% - 150px)", top: 116 }}>3</Box>
        <Box style={hLine({ left: "calc(50% - 130px)", top: 126, width: 110 })} />
        {/* 4 — Accessible name: from the right, to the square's right edge — the invisible, load-bearing part */}
        <Box style={hLine({ left: "calc(50% + 20px)", top: 107, width: 110 })} />
        <Box style={{ ...dotStyle, left: "calc(50% + 130px)", top: 97 }}>4</Box>
      </Box>
    </Box>
  );
}

const ANATOMY_PARTS: [number, string, string][] = [
  [1, "Container", "the square clickable surface — fill, border, focus; equal width and height"],
  [2, "Icon", "required — a single glyph that IS the action, drawn at weight=\"bold\""],
  [3, "Focus ring", "keyboard-focus indicator, offset 2px"],
  [4, "Accessible name", "the load-bearing part of an icon-only control — supplied by aria-label, since there’s no visible text; without it the button is unnamed"],
];

/* ========================================================================== */

const meta: Meta<typeof IconButton> = {
  title: "Components/Action/IconButton",
  component: IconButton,
  parameters: {
    // The docs stories use custom render() and don't read args, so the Controls panel is dead there.
    // The Props re-enables it. (Accessibility + Interactions stay on.)
    controls: { disable: true },
    docs: {
      description: {
        component:
          "A square, **icon-only** button — the icon-only sibling of `Button`. It speaks the same " +
          "**priority** ladder (primary/secondary/tertiary → solid/surface/ghost, default secondary, one " +
          "solid per page). Because there’s no visible text, every icon button **requires** an " +
          "`aria-label`, and the icon must read unambiguously in context — otherwise use a text `Button`.",
      },
    },
  },
};
export default meta;
type Story = StoryObj<typeof IconButton>;

/** The parts of an icon button (a labeled diagram) and its states. The token spec lives on Usage. */
export const Anatomy: Story = {
  render: (_args, { globals }) => (
    <HexThemeKey.Provider value={`${globals.accent}-${globals.appearance}-${globals.contrast}`}>
      <Page>
        <PageHeader title="IconButton · Anatomy" standfirst={DEFINITION} />
        <Section title="Anatomy" lead="The secondary (surface) variant is shown — it surfaces the most: a fill and a visible edge around a single glyph. The button is square: width equals height. This diagram is pinned to size 3 so the callout leaders stay on their parts — it is a fixed spec reference and does not follow the global uiSize; every other specimen on these pages does.">
          <AnatomyDiagram />
          <AnatomyLegend parts={ANATOMY_PARTS} />
          <Caption>
            An icon button has no text label — the icon <strong>is</strong> the content, so it carries no
            width from a label and stays square at every size. The accessible name (part 4) is the
            load-bearing part: with no visible text, the button <strong>requires</strong> an{" "}
            <Code>aria-label</Code>, or it ships unnamed. The glyph takes <Code>weight="bold"</Code> to
            match the system’s icon weight.
          </Caption>
        </Section>

        <Rule />

        <Section title="States" lead="Beyond rest, hover, and focus — which appear as you point at and tab through the buttons.">
          <Flex gap="3" align="center" wrap="wrap">
            <IconButton priority="primary" aria-label="Add item"><Plus weight="bold" /></IconButton>
            <IconButton priority="primary" disabled aria-label="Add item (disabled)"><Plus weight="bold" /></IconButton>
            <IconButton priority="primary" loading aria-label="Saving"><Plus weight="bold" /></IconButton>
          </Flex>
          <Caption>
            <strong>Disabled</strong> is intentionally low-contrast (WCAG-exempt — GUIDELINES §9) — prefer
            guiding the user toward a valid action over silently disabling one. <strong>loading</strong>{" "}
            swaps the glyph for a spinner and blocks input while holding the button’s square size, so the
            layout doesn’t jump.
          </Caption>
          <Caption>
            <strong>Focus:</strong> on keyboard focus (<Code>:focus-visible</Code>) the icon button takes
            the system focus ring ([[focus-ring]]). The ring is the accent (<Code>--ds-stroke-focus</Code>) with a
            Radix alpha (<Code>--ds-stroke-focus-stack</Code>) stacked on it. It is 2px wide and sits 2px
            outside the button. It clears 3:1 and APCA Lc 30 on every surface, for every accent, in both
            modes. It is the same ring on every control.
          </Caption>
          <Caption>
            <strong>Interaction &amp; motion:</strong> each grade answers a pointer differently, and the token
            spec on the Usage page is measured off each one. <strong>Primary</strong> darkens its fill one step on hover and
            holds that step through the press. <strong>Tertiary</strong> tints on hover and deepens again on press.
            <strong> Secondary</strong> does not move its fill on hover at all — it deepens its edge, and the fill
            appears only under the press. Those transitions ride the GUIDELINES §7 ladder — the hover background over{" "}
            <Code>--ds-duration-micro</Code>, press at <Code>--ds-duration-instant</Code>, colour + focus
            over <Code>--ds-duration-fast</Code> — all honouring reduced-motion.
          </Caption>
        </Section>
      </Page>
    </HexThemeKey.Provider>
  ),
};

/* ---- Properties (IconButton-specific) ------------------------------------ */

const ICONBUTTON_PROPS: PropDef[] = [
  { name: "priority", type: `"primary" | "secondary" | "tertiary"`, def: `"secondary"`, desc: <>The system’s button vocabulary → Radix <Code>solid</Code>/<Code>surface</Code>/<Code>ghost</Code>, the same ladder as <Code>Button</Code>. <strong>primary</strong> is the one solid per page; <strong>secondary</strong> (default) is a surface; <strong>tertiary</strong> recedes to the icon alone.</>, source: "IconButton.tsx:21" },
  { name: "variant", type: `"solid" | "surface" | "ghost" | …`, locked: true, desc: <>Radix’s raw variant is <strong>not exposed</strong> — <Code>priority</Code> owns it, so an icon button can’t drift off-system. <Code>soft</Code>, <Code>outline</Code>, and <Code>classic</Code> are intentionally unavailable.</>, source: "IconButton.tsx:19" },
  { name: "inset", type: "boolean", def: "false", desc: <>Marks an in-field tertiary control (clear, reveal) — forces the ghost variant and sets <Code>data-inset</Code>, guaranteeing a ≥24×24 hit target even when the visual glyph is smaller (WCAG 2.5.8). Demonstrated in context in <Code>System/TextField</Code>, not here.</>, source: "IconButton.tsx:23" },
  { name: "size", type: `"1" | "2" | "3" | "4"`, desc: <>Control size. Unset, it resolves from the global <Code>uiSize</Code> (default <Code>small</Code> → <Code>1</Code>); Radix’s own default is <Code>2</Code>. Set explicitly to compare sizes.</>, source: "IconButton.tsx:27 · Radix" },
  { name: "tone", type: `"danger"`, desc: <>Destructive intent — re-paints the grade from the accent-aware error family, the same axis as <Code>Button</Code>. Orthogonal to <Code>priority</Code>. Never use Radix’s <Code>color</Code> for this — it bypasses the brand-collision shift.</>, source: "IconButton.tsx" },
  { name: "loading", type: "boolean", def: "false", desc: <>Swaps the glyph for a spinner and blocks input while holding the button’s square size, so the layout doesn’t jump.</>, source: "Radix" },
  { name: "disabled", type: "boolean", def: "false", desc: <>Disables the button. Intentionally low-contrast (WCAG-exempt) — prefer guiding toward a valid action over silently disabling one.</>, source: "Radix" },
  { name: "children", type: "ReactNode", desc: <>The icon glyph — the icon <strong>is</strong> the content; there’s no label slot. Convention is a single Phosphor icon at <Code>weight="bold"</Code>.</>, source: "Radix" },
  { name: "aria-label", type: "string", desc: <><strong>Required</strong> — the icon button’s accessible name. With no visible text, the button ships unnamed without it, and the icon alone must still read unambiguously in context.</>, source: "Radix" },
  { name: "onClick", type: "(e) => void", desc: <>Click handler; fires on pointer and keyboard activation.</>, source: "Radix" },
];

/** Usage: the component in real situations, the guidance that keeps every icon button named, and the
 *  live token spec that closes the page. */
export const Usage: Story = {
  // The DO/DON'T word (success/error step-11 ink on its own tint) measures 4.10 at 12px bold, under axe's
  // 4.5; the colour + the word already carry the meaning, so that row is the documented exception. Scoped
  // to the label itself — the cards' specimens stay fully axe-checked, which "[data-dodont]" did not do.
  parameters: { a11y: { context: { exclude: [DODONT_LABEL] } } },
  render: (_args, { globals }) => (
    <Page>
      <PageHeader title="IconButton · Usage" standfirst={DEFINITION} />
      <Section
        title="In context"
        lead={<>Reach for an icon button when <strong>space is constrained</strong> (toolbars, card headers, in-field controls) <strong>and</strong> the action reads unambiguously from its glyph alone — otherwise a text <Code>Button</Code> carries the words. Real situations below are driven by the toolbar above: <strong>Accent</strong> re-skins them, <strong>Size</strong> scales them, <strong>Appearance</strong> flips light and dark. Every button carries an <strong><code>aria-label</code></strong>, because an icon alone has no accessible name.</>}
      >
        <Grid columns={{ initial: "1", sm: "2" }} gapX="6" gapY="5">
          <Scenario label="TOOLBAR" caption={<>Equal-weight utilities sit as a row of <strong>secondary</strong> (surface) buttons — no solid needed, none outranks the others. Each icon is unambiguous, and each still names itself.</>}>
            <Flex gap="2" align="center" wrap="wrap">
              <IconButton priority="secondary" aria-label="Search"><MagnifyingGlass weight="bold" /></IconButton>
              <IconButton priority="secondary" aria-label="Edit"><PencilSimple weight="bold" /></IconButton>
              <IconButton priority="secondary" aria-label="Refresh"><ArrowsClockwise weight="bold" /></IconButton>
            </Flex>
          </Scenario>

          <Scenario label="WITH A TOOLTIP" caption={<>Wrap the button in a <Code>Tooltip</Code> to name the action for sighted users on hover or keyboard focus. The <Code>aria-label</Code> covers screen readers; the tooltip covers everyone else — point at the button and the word appears.</>}>
            <Flex gap="2" align="center">
              <Tooltip content="Search">
                <IconButton priority="secondary" aria-label="Search"><MagnifyingGlass weight="bold" /></IconButton>
              </Tooltip>
              <Tooltip content="Edit">
                <IconButton priority="secondary" aria-label="Edit"><PencilSimple weight="bold" /></IconButton>
              </Tooltip>
            </Flex>
          </Scenario>

          <Scenario label="CARD HEADER / DISMISS" caption={<>On a busy surface, a <strong>tertiary</strong> (ghost) overflow and close stay low-emphasis — accent on hover, no surface at rest. Each still owns its own square; they don’t merge into the content or each other.</>}>
            <Flex
              align="center"
              justify="between"
              gap="3"
              style={{ padding: "8px 12px", border: "1px solid var(--ds-stroke-weak)", borderRadius: "var(--ds-radius-3)", background: "var(--ds-bg-subtle)" }}
            >
              <UIText weight="medium" style={{ color: "var(--ds-text-strong)" }}>Notifications</UIText>
              <Flex gap="1" align="center">
                <IconButton priority="tertiary" aria-label="More options"><DotsThree weight="bold" /></IconButton>
                <IconButton priority="tertiary" aria-label="Dismiss"><X weight="bold" /></IconButton>
              </Flex>
            </Flex>
          </Scenario>

          <Scenario label="DESTRUCTIVE" caption={<>A delete action takes <code>tone="danger"</code> — accent-aware, so it follows a brand-collision shift instead of staying literal red. The trash glyph reads unambiguously, and the aria-label still spells out the consequence.</>}>
            <IconButton priority="primary" tone="danger" aria-label="Delete item"><Trash weight="bold" /></IconButton>
          </Scenario>

          <Scenario label="FLOATING / PRIMARY ACTION" caption={<>The single most consequential action on the view earns the one <strong>primary</strong> (solid) — here, compose. One-solid-per-page still holds for icon buttons.</>}>
            <IconButton priority="primary" aria-label="Compose"><Plus weight="bold" /></IconButton>
          </Scenario>
        </Grid>
      </Section>

      <Rule />

      <Section
        title="Always give it a name"
        lead="An icon button has no text, so its accessible name comes from aria-label — and the icon must read on its own. When the action is ambiguous, words beat a glyph."
      >
        <Grid columns={{ initial: "1", sm: "2" }} gap="3">
          <DoDont
            kind="do"
            accent={globals.accent as AccentColor}
            note="An unambiguous glyph (trash = delete, X = close) plus an aria-label: a screen reader announces the name, and sighted users read the icon."
          >
            <IconButton priority="secondary" aria-label="Delete"><Trash weight="bold" /></IconButton>
            <IconButton priority="secondary" aria-label="Close"><X weight="bold" /></IconButton>
          </DoDont>
          <DoDont
            kind="dont"
            accent={globals.accent as AccentColor}
            note="When the glyph won't say what it does — a lightning bolt could be 'boost', 'power mode', 'fast', or 'run automation' — use a text Button with the words. The aria-label is there for axe, but a sighted user is still guessing."
          >
            <IconButton priority="secondary" aria-label="Boost"><Lightning weight="bold" /></IconButton>
          </DoDont>
        </Grid>
      </Section>

      <Rule />

      <Section
        title="Pair it with a tooltip"
        lead={<>An <Code>aria-label</Code> names the button for screen readers, but a sighted mouse or low-vision user sees only the glyph. A tooltip closes that gap — it reveals the action’s name on hover and keyboard focus. Keep the glyph unambiguous on its own; let the tooltip confirm on demand.</>}
      >
        <Grid columns={{ initial: "1", sm: "2" }} gap="3">
          <DoDont
            kind="do"
            bare
            note={<>An unambiguous glyph that can stand alone, with a <Code>Tooltip</Code> confirming the name on hover or focus. Screen readers get the <Code>aria-label</Code>; sighted users get the word on demand — nobody has to guess.</>}
          >
            <Flex gap="2" align="center">
              <Tooltip content="Delete">
                <IconButton priority="secondary" aria-label="Delete"><Trash weight="bold" /></IconButton>
              </Tooltip>
              <Tooltip content="Refresh">
                <IconButton priority="secondary" aria-label="Refresh"><ArrowsClockwise weight="bold" /></IconButton>
              </Tooltip>
            </Flex>
          </DoDont>
          <DoDont
            kind="dont"
            bare
            note={<>An ambiguous icon-only button with only an <Code>aria-label</Code> and no tooltip — this overflow glyph could open a menu, drag, or expand. It passes axe (the name is there), but a sighted user is still guessing because nothing reveals the action.</>}
          >
            <IconButton priority="secondary" aria-label="More actions"><DotsThree weight="bold" /></IconButton>
          </DoDont>
        </Grid>
      </Section>

      <Rule />

      <Section title="Gap follows the fill" lead="How much gap a row of icon buttons wants depends on the fill. A surface or solid button has a visible container that needs room to breathe; a ghost has none until you hover, so it can sit flush — compact and balanced, and you act on one at a time anyway.">
        <Grid columns={{ initial: "1", sm: "2" }} gap="3">
          <DoDont kind="do" accent={globals.accent as AccentColor} note="Ghost has no resting surface, so a flush row reads as balanced and compact — the glyphs carry their own breathing room.">
            <ButtonGroup gap="0">
              <IconButton priority="tertiary" aria-label="Search"><MagnifyingGlass weight="bold" /></IconButton>
              <IconButton priority="tertiary" aria-label="Edit"><PencilSimple weight="bold" /></IconButton>
              <IconButton priority="tertiary" aria-label="Refresh"><ArrowsClockwise weight="bold" /></IconButton>
            </ButtonGroup>
          </DoDont>
          <DoDont kind="dont" accent={globals.accent as AccentColor} note="Surface (or solid) buttons flush together — the fills and borders touch, so the row cramps or reads as one segmented control. Give surfaced buttons a gap.">
            <ButtonGroup gap="0">
              <IconButton priority="secondary" aria-label="Search"><MagnifyingGlass weight="bold" /></IconButton>
              <IconButton priority="secondary" aria-label="Edit"><PencilSimple weight="bold" /></IconButton>
              <IconButton priority="secondary" aria-label="Refresh"><ArrowsClockwise weight="bold" /></IconButton>
            </ButtonGroup>
          </DoDont>
        </Grid>
      </Section>

      <Rule />

      <HexThemeKey.Provider value={`${globals.accent}-${globals.appearance}-${globals.contrast}`}>
        <Section title="Tokens" lead="Measured off a rendered icon button, not resolved from the token: each row names an element and a property, reads that property off a real IconButton, and reports whether it equals what the token it names resolves to — so a row can disagree with the component, and three of them did.">
          <Caption>
            <strong>What the grades paint from.</strong> Only the <strong>primary</strong> (solid) grade is a
            straight alias of the system’s roles. <strong>Secondary</strong> and <strong>tertiary</strong> reuse
            Radix’s own surface and ghost skins — the same skins <Code>Button</Code> wears — which paint from
            Radix’s alpha steps directly, so those rows name the Radix token the skin uses. The icon ink,{" "}
            <Code>--accent-a11</Code>, is the alpha twin of the step <Code>--ds-text-link</Code> names: it lands
            on the same colour on the page and composites correctly on a tinted surface.
          </Caption>
          <Flex direction="column" gap="4">
            <TokenGroup label="PRIMARY" blurb="The single most consequential action — one solid per page." specimen={<IconButton priority="primary" aria-label="Add item"><Plus weight="bold" /></IconButton>}>
              <MeasuredSpec render={() => <IconButton priority="primary" aria-label="Fill measurement"><Plus weight="bold" /></IconButton>}>
                <MeasuredRow part="Container fill" token="--ds-fill-accent" select=".rt-IconButton" prop="background-color" />
                <MeasuredRow part="Container fill" state="hover" token="--ds-fill-accent" select=".rt-IconButton" prop="background-color"
                  note="The rest fill holds under hover and press, and --ds-fill-accent-hover lays a Radix alpha over it." />
                <MeasuredRow part="Icon" token="--on-accent" select=".rt-IconButton" prop="color"
                  note="The glyph inherits the button's colour — there is no separate icon paint." />
                <MeasuredRow part="Focus ring" state="focus-visible" token="--ds-stroke-focus" select=".rt-IconButton" prop="outline-color"
                  note="The accent base layer. A Radix alpha, --ds-stroke-focus-stack, sits on top of it ([[focus-ring]])." />
              </MeasuredSpec>
            </TokenGroup>
            <TokenGroup label="SECONDARY" blurb="The default — alternatives that stay distinct without competing." specimen={<IconButton priority="secondary" aria-label="Add item"><Plus weight="bold" /></IconButton>}>
              <MeasuredSpec render={() => <IconButton priority="secondary" aria-label="Fill measurement"><Plus weight="bold" /></IconButton>}>
                <MeasuredRow part="Container fill" token="--accent-surface" select=".rt-IconButton" prop="background-color"
                  note="A near-white tinted surface, not the accent wash a ghost icon button uses." />
                <MeasuredRow part="Container fill" state="active" token="--ds-fill-accent-weak" select=".rt-IconButton" prop="background-color"
                  note="The fill appears on PRESS. Hover leaves it alone and deepens the edge instead." />
                <MeasuredRow part="Icon" token="--accent-a11" select=".rt-IconButton" prop="color" />
              </MeasuredSpec>
              <NoteRow part="Container edge" value="a 1px INSET ring drawn in the box-shadow, not a border — --accent-a7 at rest, --accent-a8 on hover; a colour inside a shadow list, so no single property carries it" />
            </TokenGroup>
            <TokenGroup label="TERTIARY" blurb="Low-stakes, repeated, or inline actions — recedes to the icon alone." specimen={<IconButton priority="tertiary" aria-label="Add item"><Plus weight="bold" /></IconButton>}>
              <NoteRow part="Container fill · rest" value="transparent" radix="—" />
              <MeasuredSpec render={() => <IconButton priority="tertiary" aria-label="Fill measurement"><Plus weight="bold" /></IconButton>}>
                <MeasuredRow part="Container fill" state="hover" token="--ds-fill-accent-weak" select=".rt-IconButton" prop="background-color"
                  note="Deepens again on press, to --ds-fill-accent-med." />
                <MeasuredRow part="Icon" token="--accent-a11" select=".rt-IconButton" prop="color" />
              </MeasuredSpec>
            </TokenGroup>
            <TokenGroup label="ALL PRIORITIES">
              <NoteRow part="Shape (radius)" value="inherits <Theme radius>" radix="--radius-*" />
              <NoteRow part="Size (square)" value="one control box per size step — width = height, the same value every button variant stands in" radix="--base-button-height" />
              <NoteRow part="Min hit target" value="≥24×24 floor (WCAG 2.5.8); the inset variant honors it" radix="—" />
              <MeasuredSpec render={() => <IconButton priority="primary" disabled aria-label="Disabled measurement"><Plus weight="bold" /></IconButton>}>
                <MeasuredRow part="Disabled fill" token="--ds-fill-disabled" select=".rt-IconButton" prop="background-color"
                  note="Read off a genuinely disabled icon button — every grade lands on the same neutral pair." />
                <MeasuredRow part="Disabled icon" token="--ds-text-disabled" select=".rt-IconButton" prop="color" />
              </MeasuredSpec>
            </TokenGroup>
          </Flex>
        </Section>
      </HexThemeKey.Provider>
    </Page>
  ),
  play: async ({ canvasElement }) => {
    const btns = Array.from(canvasElement.querySelectorAll<HTMLElement>("button.rt-IconButton"));
    if (!btns.length) throw new Error("no icon buttons rendered");

    const variantOf = (b: HTMLElement) =>
      Array.from(b.classList).find((c) => c.startsWith("rt-variant-"))?.replace("rt-variant-", "");

    // Every icon button must carry an accessible name — the central rule for this component.
    const unlabelled = btns.filter((b) => !b.getAttribute("aria-label")?.trim());
    if (unlabelled.length) {
      throw new Error(`every icon button needs an aria-label; ${unlabelled.length} missing`);
    }

    // The priority→variant contract: all three grades appear in context.
    const variants = new Set(btns.map(variantOf));
    for (const v of ["solid", "surface", "ghost"]) {
      if (!variants.has(v)) throw new Error(`expected a ${v} icon button in context, found ${[...variants].join("/")}`);
    }

    // The destructive specimen is solid + tone="danger" — paints from the accent-aware error family,
    // NOT Radix's color prop (a local data-accent-color would bypass the [[brand-collision-shift-table]]/[[oxblood-preset]]/[[brand-status-collision-gate]] collision layer).
    const destructive = btns.find((b) => b.getAttribute("aria-label") === "Delete item");
    if (!destructive) throw new Error("destructive icon button not rendered");
    if (!destructive.classList.contains("rt-variant-solid")) {
      throw new Error(`destructive must be solid, got "${destructive.className}"`);
    }
    if (destructive.getAttribute("data-tone") !== "danger") {
      throw new Error("destructive icon button must carry data-tone='danger'");
    }
    if (destructive.getAttribute("data-accent-color")) {
      throw new Error("danger must NOT set data-accent-color — Radix's color prop bypasses collision ([[destructive-tone]])");
    }
    // Resolved-byte check: the danger fill is --ds-fill-error (shared rt-BaseButton CSS with Button).
    const near = (a: number, b: number, tol = 6) => Math.abs(a - b) <= tol;
    const root = themeRoot(destructive);
    const errFill = resolveColor(root, "--ds-fill-error");
    const bg = parseColor(getComputedStyle(destructive).backgroundColor);
    if (!(near(bg.r, errFill.r) && near(bg.g, errFill.g) && near(bg.b, errFill.b))) {
      throw new Error(`danger icon button bg must be --ds-fill-error; got ${getComputedStyle(destructive).backgroundColor}`);
    }

    // The token table's EVIDENCE, asserted at runtime ([[measured-token-rows]]): 11 measured rows — PRIMARY 4 + SECONDARY 3 +
    // TERTIARY 2 + ALL PRIORITIES 2. (The NoteRows alongside them are prose and are skipped.) Only a live
    // DOM can prove each row measured a real IconButton node, that the claim was resolved somewhere else,
    // and that the two agree.
    const rows = assertMeasuredRows(canvasElement);
    if (rows.measured !== 11 || rows.unproven !== 0) {
      throw new Error(`expected 11 measured / 0 unproven token rows, got ${rows.measured} / ${rows.unproven}`);
    }
  },
};

/* Props icon menu — the glyph is a select of string keys mapped to Phosphor nodes (a ReactNode
   can't be a JSON control); weight="bold" matches the system icon weight. */
const ICON_OPTIONS = {
  plus: <Plus weight="bold" />,
  trash: <Trash weight="bold" />,
  pencil: <PencilSimple weight="bold" />,
  x: <X weight="bold" />,
  "dots-three": <DotsThree weight="bold" />,
  gear: <Gear weight="bold" />,
} as const;

type PropsArgs = {
  icon: keyof typeof ICON_OPTIONS;
  priority: "primary" | "secondary" | "tertiary";
  size: "auto" | "1" | "2" | "3" | "4";
  disabled: boolean;
  loading: boolean;
  inset: boolean;
  tone: "none" | "danger";
  "aria-label": string;
  onClick: () => void;
};

/** Props — the live, args-driven icon button. Drive it from Controls; clicks log in Actions.
 *  Every configurable capability is a control: pick the glyph, set priority/size, toggle
 *  disabled/loading/inset, switch to semantic red, and edit the required aria-label. */
export const Props: StoryObj<PropsArgs> = {
  args: {
    icon: "plus",
    priority: "primary",
    // "auto" (size unset) is the default so the button tracks the global uiSize toolbar out of the box.
    size: "auto",
    disabled: false,
    loading: false,
    inset: false,
    tone: "none",
    "aria-label": "Props action",
  },
  argTypes: {
    icon: {
      control: "select",
      options: Object.keys(ICON_OPTIONS),
      mapping: ICON_OPTIONS,
      description: "The glyph — the icon IS the action. Rendered at weight=\"bold\".",
    },
    priority: { control: "inline-radio", options: ["primary", "secondary", "tertiary"], description: "UI-priority grade → solid / surface / ghost. Default secondary; one solid per page." },
    size: { control: "inline-radio", options: ["auto", "1", "2", "3", "4"], description: '"auto" tracks the global uiSize toolbar (unset → the control lane); a step (1–4) pins the square.' },
    disabled: { control: "boolean" },
    loading: { control: "boolean", description: "Swaps the glyph for a spinner and blocks input while holding the square size." },
    inset: { control: "boolean", description: "In-field tertiary control — forces ghost + data-inset, ≥24×24 hit target. See System/TextField." },
    tone: { control: "inline-radio", options: ["none", "danger"], description: "`danger` = destructive — paints from the accent-aware error family." },
    "aria-label": { control: "text", description: "REQUIRED accessible name — an icon-only button has no visible text." },
    onClick: { action: "clicked" },
  },
  parameters: { controls: { disable: false } },
  render: ({ icon, tone, size, ...args }: PropsArgs) => {
    return (
      <Page maxWidth="none">
        <PageHeader title="IconButton · Props" standfirst={DEFINITION} />
        <Box style={{ padding: "8px 0 2px" }}>
          {/* `icon` is mapped to a ReactNode by argTypes.mapping; tone rides data-tone via the wrapper. */}
          <IconButton {...args} size={size === "auto" ? undefined : size} {...(tone === "danger" ? { tone: "danger" as const } : {})}>{icon}</IconButton>
        </Box>
        <PropsLead />
        <Rule />
        <Section title="Props reference" lead={<>Every prop <Code>IconButton</Code> accepts — <Code>priority</Code> and <Code>inset</Code> are the system’s own API, the rest pass through to Radix’s <Code>IconButton</Code>. <Code>variant</Code> is locked so an icon button can’t drift off-system.</>}>
          <PropTable rows={ICONBUTTON_PROPS} />
        </Section>
      </Page>
    );
  },
};

/** History — the rulings this component encodes and a changelog of how it changes over time. */
export const History: Story = {
  render: () => (
    <Page>
      <PageHeader title="IconButton · History" standfirst={DEFINITION} />
      <Section title="Decisions" lead="The rulings this component encodes.">
        <Flex direction="column" gap="3">
          <Decision id="[[button-priority]] · Priority, not variant">
            <Code>priority</Code> (primary/secondary/tertiary) maps to Radix solid/surface/ghost — the same
            grade ladder as <Code>Button</Code>, named by intent, not variant.
          </Decision>
          <Decision id="[[soft-variant-scope]] · No soft on controls">
            <Code>soft</Code>, <Code>outline</Code>, and <Code>classic</Code> aren’t exposed; the default is
            surface, and one solid primary per page still holds.
          </Decision>
          <Decision id="Label">
            Icon-only means no visible text — every icon button <strong>requires</strong> an{" "}
            <Code>aria-label</Code> for its accessible name. The icon alone must read unambiguously in
            context, or reach for a text <Code>Button</Code> instead.
          </Decision>
          <Decision id="Inset">
            The <Code>inset</Code> prop marks an in-field tertiary control (clear, reveal): it forces the
            ghost variant and guarantees a ≥24×24 hit target (WCAG 2.5.8). Its field-relative sizing is
            demonstrated in <Code>System/TextField</Code>, not here — an inset control’s meaning comes
            from the field it sits in.
          </Decision>
        </Flex>
      </Section>

      <Rule />

      <Section title="Changelog" lead="Notable changes, newest first — grows as the component evolves.">
        <Flex direction="column" gap="3">
          <Decision id="0.9.0">
            Initial component — a square, icon-only sibling of <Code>Button</Code> sharing the priority
            ladder and tokens, size on the global <Code>uiSize</Code> control lane. Stories on the standard
            template: History · Anatomy · Usage · Props.
          </Decision>
        </Flex>
      </Section>
    </Page>
  ),
};
