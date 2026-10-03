import type { Meta, StoryObj } from "@storybook/react-vite";
import { Box, Code, Flex, Grid, Text } from "@radix-ui/themes";
import { BookmarkSimple, ArrowUpRight } from "@phosphor-icons/react";
import { ClickableCard, interactiveLayer } from "./ClickableCard";
import { IconButton } from "./IconButton";
import { LinkProvider } from "./Link";
import {
  Caption, Decision, DemoLink, DoDont, DODONT_LABEL, HexThemeKey, MeasuredRow, MeasuredSpec, Mono, NoteRow,
  Page, PageHeader, PropsLead, type PropDef, PropTable, Rule, Section,
} from "./_storyKit";
import { awaitMeasuredRows } from "../../foundations/_assert";
import { ComparisonSection, CARD_SURFACES_COMPARISON } from "./_comparisons";

/** The one definition of this component — the standfirst every page of it opens with. */
const DEFINITION = (
  <>
    A card whose whole job is navigation — a heading + a teaser that link somewhere. Click anywhere on
    the card; a single tab stop; the heading is the accessible name.
  </>
);

/* ClickableCard layers the stretched-link pattern on Card. Its only System-owned CSS is the overlay
   (::after), the hover wash and the system focus ring ([[focus-ring]]) on the card box — the rest is Card's reused
   Radix skin. It coins no NEW --ds-* role, but "no new role" is not "no token": each paint it applies is
   an existing role, so the spec MEASURES them off a rendered card rather than describing them in prose.

   Two of the three values exist only while a pseudo-state is active, and no script can synthesise a real
   hover or a keyboard focus — so those rows read the declaration the component's OWN stylesheet will
   paint for that state (media conditions honoured, so the hover fill is reported as what it is: only
   under a pointer that can hover) and resolve it on the rendered card. Each row still compares two
   independently-sourced expressions, so it can disagree. Only the focus geometry (2px / -2px, no colour)
   stays a note. */

/* A navigation card: a heading + a one-line teaser that links somewhere. Wrapped by the caller in a
   LinkProvider(DemoLink) so the specimen never navigates the iframe. */
function DocCard({ href, title, teaser, bookmark }: { href: string; title: string; teaser: string; bookmark?: boolean }) {
  return (
    <ClickableCard href={href} title={title} style={{ maxWidth: 320 }}>
      <Text as="p" size="2" mt="1" style={{ color: "var(--ds-text-weak)", lineHeight: 1.5 }}>{teaser}</Text>
      <Flex align="center" justify="between" mt="3">
        <Flex align="center" gap="1" style={{ color: "var(--ds-text-link)" }}>
          <Text size="1" weight="bold">Read the guide</Text>
          <ArrowUpRight size={14} />
        </Flex>
        {bookmark && (
          // A nested interactive: it sits ABOVE the stretched-link overlay (interactiveLayer) so it stays
          // independently clickable and does NOT trigger the card's navigation.
          <span style={interactiveLayer}>
            <IconButton priority="tertiary" aria-label="Bookmark this guide">
              <BookmarkSimple />
            </IconButton>
          </span>
        )}
      </Flex>
    </ClickableCard>
  );
}

const PROPS: PropDef[] = [
  { name: "href", type: "string", def: "— (required)", desc: <>Where the card navigates. Routed through <Code>useLinkComponent()</Code> — an app's framework Link when a <Code>LinkProvider</Code> is present, a plain <Code>{`<a>`}</Code> otherwise.</>, source: "ClickableCard.tsx" },
  { name: "title", type: "ReactNode", def: "— (required)", desc: <>The heading, wrapped by the overlay link — so it is the whole card's accessible name (name from content).</>, source: "ClickableCard.tsx" },
  { name: "children", type: "ReactNode", desc: <>The teaser / body below the heading. Keep it short and non-selectable — the overlay eats text selection.</>, source: "ClickableCard.tsx" },
  { name: "headingAs / headingSize", type: `"h2"–"h6" / "1"–"9"`, def: `"h3" / the chromeHeading lane`, desc: <>The heading element (document structure) and its size. Unset, the size rides the <Code>chromeHeading</Code> lane (text + 1), so a card title steps with the global size instead of sitting at one step forever ([[chrome-heading-lane]]).</>, source: "ClickableCard.tsx" },
  { name: "size / variant", type: "Card props", desc: <>Pass through to the underlying <Code>Card</Code> — <Code>size</Code> rides the container lane; <Code>variant</Code> is <Code>outlined</Code> (default) / <Code>elevated</Code> / <Code>filled</Code>.</>, source: "Card" },
  { name: "linkProps", type: "anchor attrs", desc: <>Extra attributes for the overlay link — <Code>target</Code>, <Code>rel</Code>, <Code>onClick</Code>. <Code>href</Code> comes from the prop above.</>, source: "ClickableCard.tsx" },
];

const meta: Meta<typeof ClickableCard> = {
  title: "Components/Container/ClickableCard",
  component: ClickableCard,
  parameters: {
    controls: { disable: true },
    docs: {
      description: {
        component:
          "**ClickableCard** is a Card whose whole job is navigation — a heading and a teaser that link " +
          "somewhere. It uses the stretched-link pattern: an overlay wrapping the heading covers the whole " +
          "card, so a click anywhere follows the link, with a single tab stop and one accessible name (the " +
          "heading). Hover washes the card `--ds-fill-hover`; keyboard focus draws the system focus " +
          "ring ([[focus-ring]]) on the card box. It routes through `useLinkComponent()`. For a card that carries " +
          "selectable content, use a plain **Card** " +
          "with an explicit link instead — the overlay eats text selection.",
      },
    },
  },
};
export default meta;
type Story = StoryObj<typeof ClickableCard>;

/** Usage — the primary lite docs story: navigation cards, the interaction spec, and one do/don't. */
export const Usage: Story = {
  parameters: { a11y: { context: { exclude: [DODONT_LABEL] } } },
  // HexThemeKey keys the token rows on the toolbar state, so every live hex in the Tokens section
  // re-resolves when the accent / appearance / contrast is flipped instead of freezing at mount.
  render: (_args, { globals }) => (
    <HexThemeKey.Provider value={`${globals.accent}-${globals.appearance}-${globals.contrast}`}>
    <Page>
      <PageHeader title="ClickableCard · Usage" standfirst={DEFINITION} />

      <Section title="Specimen" lead="Navigation cards — a heading and a one-line teaser that lead somewhere. Hover to see the wash; Tab to see the focus ring on the card box. The second card carries a nested bookmark that stays independently clickable.">
        <LinkProvider component={DemoLink}>
          <Grid columns={{ initial: "1", sm: "2" }} gap="4">
            <DocCard href="/docs/tokens" title="Design tokens" teaser="How the semantic --ds-* roles resolve against the active brand, and why components never hardcode a colour." />
            <DocCard href="/docs/components" title="Component API" teaser="The wrapped Radix Themes surface, the size lanes, and the props each System component adds." bookmark />
          </Grid>
        </LinkProvider>
        <Caption>Both cards route through the provided framework Link. Clicking the bookmark toggles the bookmark — it does not navigate.</Caption>
      </Section>

      <Rule />

      <ComparisonSection comparison={CARD_SURFACES_COMPARISON} highlight="ClickableCard" />

      <Rule />

      <Section title="What belongs inside a clickable card" lead="A ClickableCard is a link that happens to be a card — reserve it for content whose whole job is to be navigated to.">
        <Grid columns={{ initial: "1", sm: "2" }} gap="3">
          <DoDont kind="do" bare note="A heading + a short teaser that lead somewhere. The whole card is the target; a nested action (bookmark) opts above the overlay.">
            <LinkProvider component={DemoLink}>
              <DocCard href="/x" title="Weekly report" teaser="Last week across your projects — what shipped, what slipped." bookmark />
            </LinkProvider>
          </DoDont>
          <DoDont kind="dont" bare note="Don't put selectable or copyable content (an API key, a long paragraph, a code block) in a ClickableCard — the overlay eats selection. Use a plain Card with an explicit link.">
            <LinkProvider component={DemoLink}>
              <DocCard href="/y" title="API key" teaser="sk_live_9f2a…  (you can't select this — the overlay swallows it)" />
            </LinkProvider>
          </DoDont>
        </Grid>
      </Section>

      <Rule />

      <Section title="Tokens" lead="Every paint ClickableCard applies is an existing system role — it invents no token of its own. Each row names the element and the property that paints it, reads that off a rendered card, and checks it against the role it claims.">
        <Box style={{ borderRadius: "var(--ds-radius-4)", border: "1px solid var(--ds-stroke-weak)", overflow: "hidden", background: "var(--ds-bg-subtle)" }}>
          <Box style={{ padding: "14px 20px" }}>
            <Text size="1" style={{ color: "var(--ds-text-weak)", lineHeight: 1.6, maxWidth: "var(--ds-text-measure)" }}>
              The card surface is Card's reused Radix skin — the translucent{" "}
              <Mono>--color-panel</Mono>, over which the two interaction paints land: the neutral hover wash
              (inside <Mono>@media (hover: hover)</Mono>, so a touch device never sticks in a hovered state)
              and the system focus ring ([[focus-ring]]) on the card box. Both are existing system roles, so ClickableCard
              declares no new <Mono>--ds-*</Mono> role.
            </Text>
          </Box>
          <MeasuredSpec
            render={() => (
              <LinkProvider component={DemoLink}>
                <ClickableCard href="/measurement" title="Measurement">
                  <Text as="p" size="2">measurement</Text>
                </ClickableCard>
              </LinkProvider>
            )}
          >
            <MeasuredRow
              part="Hover wash"
              note="Only under a pointer that can hover — the rule sits inside @media (hover: hover), so a touch device never sticks in a hovered state."
              token="--ds-fill-hover"
              select=".rt-ds-clickable-card"
              prop="background-color"
              state="hover"
            />
            <MeasuredRow
              part="Focus ring (card box)"
              note="Hoisted onto the card from the stretched link inside it, so the whole target shows the ring. This is the accent base. A Radix alpha, --ds-stroke-focus-stack, sits on top of it ([[focus-ring]])."
              token="--ds-stroke-focus"
              select=".rt-ds-clickable-card"
              prop="outline-color"
              state="focus-visible"
            />
            <MeasuredRow
              part="Card surface"
              note="Card's reused Radix skin, painted on the card's ::before."
              token="--color-panel"
              select=".rt-ds-clickable-card"
              prop="background-color"
              pseudo="::before"
            />
          </MeasuredSpec>
          <NoteRow part="Focus ring geometry" value="2px solid, outline-offset -2px: inside the card edge, because the card clips its content ([[focus-ring]])" radix="outline" />
        </Box>
      </Section>
    </Page>
    </HexThemeKey.Provider>
  ),
  play: async ({ canvasElement }) => {
    // The token table's EVIDENCE, asserted at runtime — each row read a REAL rendered ClickableCard.
    // `awaitMeasuredRows` blocks until every row has recorded its evidence (a row whose element
    // mounts late retries for up to 60 frames before it reports), then runs the identical assertions.
    const rows = await awaitMeasuredRows(canvasElement);
    if (rows.measured !== 3 || rows.unproven !== 0) {
      throw new Error(`expected 3 measured / 0 unproven token rows, got ${rows.measured} / ${rows.unproven}`);
    }

    // Passive (no navigation driven): confirm the stretched-link structure is wired — one overlay link per
    // card, the ::after covers the box, and the heading is the accessible name. Driving lives in _internal.
    const link = canvasElement.querySelector<HTMLElement>(".rt-ds-clickable-card-link");
    if (!link) throw new Error("Usage must render a ClickableCard overlay link");
    if (!link.textContent?.trim()) throw new Error("the overlay link must wrap the heading text (name from content)");
    const after = getComputedStyle(link, "::after");
    if (after.position !== "absolute") throw new Error(`the overlay ::after must be position:absolute to stretch; got ${after.position}`);
    // Single tab stop per card: exactly one overlay link inside each clickable card.
    for (const card of canvasElement.querySelectorAll(".rt-ds-clickable-card")) {
      const links = card.querySelectorAll(".rt-ds-clickable-card-link");
      if (links.length !== 1) throw new Error(`a ClickableCard must have exactly one overlay link (one tab stop); got ${links.length}`);
    }
  },
};

type PropsArgs = {
  variant: "outlined" | "elevated" | "filled";
  size: "auto" | "1" | "2" | "3" | "4" | "5";
  bookmark: boolean;
};

/** Props — drive the card skin, the size, and whether a nested action shows. */
export const Props: StoryObj<PropsArgs> = {
  // "auto" (size unset) is the default so the card tracks the global uiSize toolbar out of the box.
  args: { variant: "outlined", size: "auto", bookmark: true },
  argTypes: {
    variant: { control: "inline-radio", options: ["outlined", "elevated", "filled"], description: "The underlying Card skin — an edge, a lift, or a tonal fill.", table: { category: "Variant" } },
    size: { control: "inline-radio", options: ["auto", "1", "2", "3", "4", "5"], description: '"auto" tracks the global uiSize toolbar (unset, container lane); a step pins the card size.', table: { category: "Variant" } },
    bookmark: { control: "boolean", description: "Show a nested bookmark action (stays independently clickable).", table: { category: "Content" } },
  },
  parameters: { controls: { disable: false } },
  render: ({ variant, size, bookmark }: PropsArgs) => (
    <Page maxWidth="none">
      <PageHeader title="ClickableCard · Props" standfirst={DEFINITION} />
      <Box style={{ padding: "16px 0 8px", maxWidth: 360 }}>
        <LinkProvider component={DemoLink}>
          {/* headingAs="h2": this specimen is a direct child of the page, one rung under the page
              title, so its heading takes h2 — the default h3 would skip a level here. headingSize is
              unchanged, so the card looks exactly the same; level and size are separate props. */}
          <ClickableCard href="/docs/tokens" title="Design tokens" variant={variant} size={size === "auto" ? undefined : size} headingAs="h2" headingSize="3">
            <Text as="p" size="2" mt="1" style={{ color: "var(--ds-text-weak)", lineHeight: 1.5 }}>
              How the semantic roles resolve against the active brand — click anywhere on the card.
            </Text>
            {bookmark && (
              <Flex justify="end" mt="3">
                <span style={interactiveLayer}>
                  <IconButton priority="tertiary" aria-label="Bookmark"><BookmarkSimple /></IconButton>
                </span>
              </Flex>
            )}
          </ClickableCard>
        </LinkProvider>
      </Box>
      <PropsLead />
      <Rule />
      <Section title="Props reference" lead={<>Every prop <Code>ClickableCard</Code> adds, plus the <Code>Card</Code> props it forwards.</>}>
        <PropTable rows={PROPS} />
      </Section>
    </Page>
  ),
};

/** History — the rulings this component encodes and a changelog of how it changes over time. */
export const History: Story = {
  render: () => (
    <Page>
      <PageHeader title="ClickableCard · History" standfirst={DEFINITION} />
      <Section title="Decisions" lead="The rulings this component encodes.">
        <Flex direction="column" gap="3">
          <Decision id="Built on Card">
            A stretched-link build layered on <Code>Card</Code> — it inherits Card's container-lane size and
            reused skin, and adds only the navigation behaviour on top.
          </Decision>
          <Decision id="Stretched link">
            <strong>The overlay link wraps the heading text; its <Code>::after</Code> covers the whole card</strong>,
            so a pointer click anywhere navigates while there is a <strong>single tab stop</strong> (the link)
            and one accessible name (the heading — name from content, no <Code>aria-labelledby</Code> indirection).
            Nested interactives sit ABOVE the overlay (<Code>position: relative; z-index</Code> — the exported{" "}
            <Code>interactiveLayer</Code>) and stay independently clickable.
          </Decision>
          <Decision id="[[link-and-link-provider]] · Link routing">
            The link routes through <Code>useLinkComponent()</Code> — an app's framework Link when a{" "}
            <Code>LinkProvider</Code> is present, a plain <Code>{`<a>`}</Code> otherwise.
          </Decision>
          <Decision id="[[focus-ring]] · hover + focus">
            Hover washes the card with the neutral <Code>--ds-fill-hover</Code>. Keyboard focus draws the
            system focus ring ([[focus-ring]]) on the CARD box: the accent with a stacked Radix alpha, 2px wide, inside
            the card edge. The link's own ring is suppressed, because the visible ring belongs to the card.
          </Decision>
          <Decision id="Navigation only">
            The overlay eats text selection, so ClickableCard is <strong>only</strong> for cards whose whole job
            is navigation (a heading + a short teaser). Never put selectable / copyable content in one — reach
            for a plain <Code>Card</Code> with an explicit link instead.
          </Decision>
        </Flex>
      </Section>

      <Rule />

      <Section title="Changelog" lead="Notable changes, newest first — grows as the component evolves.">
        <Flex direction="column" gap="3">
          <Decision id="0.9.0">
            The card's focus ring moves to the system ring ([[focus-ring]]): the accent (<Code>--ds-stroke-focus</Code>)
            with a Radix alpha (<Code>--ds-stroke-focus-stack</Code>) stacked on it, 2px wide. It now sits
            inside the card edge at -2px, as every card ring does, where it sat 2px outside before.
          </Decision>
          <Decision id="0.9.0">
            Initial <Code>System/ClickableCard</Code> — the stretched-link build on <Code>Card</Code>: overlay
            link (single tab stop, name from content), the neutral hover wash + the neutral focus hairline on
            the card box, and routing through <Code>useLinkComponent()</Code>. History page added so every
            component, stubs included, has one.
          </Decision>
        </Flex>
      </Section>
    </Page>
  ),
};
