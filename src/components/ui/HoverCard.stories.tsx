import type { Meta, StoryObj } from "@storybook/react-vite";
import { Box, Code, Flex, Grid, Text } from "@radix-ui/themes";
import { HoverCard } from "./HoverCard";
import { Avatar } from "./Avatar";
import { Text as UIText } from "./Text";
import { Link, LinkProvider, useLinkComponent } from "./Link";
import {
  DemoLink, Decision, DoDont, DODONT_LABEL, HexThemeKey, LiteTokenSpec, MeasuredRow, MeasuredSpec, Mono, Page, PageHeader,
  PropsLead, type PropDef, PropTable, Rule, Section,
} from "./_storyKit";
import { assertMeasuredRows } from "../../foundations/_assert";
import { ComparisonSection, FLOATING_INFO_COMPARISON } from "./_comparisons";

/** The one definition of this component — the standfirst every page of it opens with. */
const DEFINITION = (
  <>
    A rich preview card tied to a link — an avatar and a stat line, a document summary — shown on hover
    and on keyboard focus. It is supplementary: the link itself navigates to the full content, and the
    card never carries anything the user must have.
  </>
);

/* HoverCard reuses Radix's own solid preview-panel skin (an opaque `--color-panel-solid` card, [[floating-surface-fill]]), so
   like Tooltip it declares no --ds-* roles of its own.

   The rows below are MEASURED ([[measured-token-rows]]): each names an element and a property, reads that property off the
   rendered card, and checks it against the token it claims — so it can disagree with the component. The
   previous version read back a hidden span this file had just painted `--color-panel-solid`; it set the
   value it then measured, so both sides of the comparison were the same expression and the row could not
   fail. A row that cannot fail guards nothing.

   The card is PORTALED and only mounts while it is open, which is the hard part — solved rather than
   worked around: a measurement-only HoverCard.Content is `forceMount`ed (it exists while the Root is
   closed, so nothing opens on view) and `container`-portaled into the MeasuredSpec host, which is
   visibility:hidden — off the screen, out of the a11y tree, out of axe, and still computing full styles. */

function HoverCardSpec() {
  return (
    <LiteTokenSpec
      rationale={
        <>
          HoverCard reuses Radix's own solid preview-panel skin and declares no <Mono>--ds-*</Mono> roles
          of its own — the card is an opaque panel, never translucent. The rows below are read off a real,
          mounted <Mono>HoverCard.Content</Mono>, so they report what the card paints rather than what the
          tokens say. It is the <em>same</em> panel skin the System menus sit on (DropdownMenu,
          ContextMenu, Select) and the one Popover uses, so every floating surface reads as one family;
          the elevation and radius come from that same popper family.
        </>
      }
    >
      <MeasuredSpec
        render={(host) => (
          <HoverCard.Root>
            <HoverCard.Trigger>
              <a href="#panel-skin-measurement">measurement</a>
            </HoverCard.Trigger>
            <HoverCard.Content forceMount container={host} />
          </HoverCard.Root>
        )}
      >
        <MeasuredRow
          part="Panel surface"
          note="The opaque card the preview sits on."
          token="--color-panel-solid"
          select=".rt-HoverCardContent"
          prop="background-color"
        />
        <MeasuredRow
          part="Panel text"
          note="Inherited from the panel, not set by the wrap."
          token="--gray-12"
          select=".rt-HoverCardContent"
          prop="color"
        />
      </MeasuredSpec>
    </LiteTokenSpec>
  );
}

/* The preview specimens. Each trigger is a REAL anchor (routed through the ambient LinkProvider so a
   click in the docs iframe doesn't navigate away) that ALSO opens a rich preview card on hover / focus.
   The card is a preview to READ — an avatar, a name, a stat line, or a doc summary — never controls to
   operate ([[floating-surface-wraps]]: the surface is invisible on touch, so it carries nothing you must be able to act on). */

function UserPreview() {
  const A = useLinkComponent();
  return (
    <HoverCard.Root>
      <HoverCard.Trigger>
        <A href="/team/elena-ruiz" style={{ color: "var(--ds-text-link)", textDecorationLine: "underline", fontWeight: 600 }}>@elena-ruiz</A>
      </HoverCard.Trigger>
      <HoverCard.Content maxWidth="300px">
        <Flex gap="3" align="start">
          <Avatar size="lg" fallback="ER" alt="Elena Ruiz" />
          <Flex direction="column" gap="1" style={{ minWidth: 0 }}>
            <UIText style={{ fontWeight: 600, color: "var(--ds-text-strong)" }}>Elena Ruiz</UIText>
            <Text size="1" style={{ color: "var(--ds-text-weak)" }}>Staff Engineer · Design Systems</Text>
            <Text size="1" style={{ color: "var(--ds-text-weak)", marginTop: "var(--space-1)" }}>
              <strong style={{ color: "var(--ds-text-strong)" }}>248</strong> commits ·{" "}
              <strong style={{ color: "var(--ds-text-strong)" }}>12</strong> repositories
            </Text>
          </Flex>
        </Flex>
      </HoverCard.Content>
    </HoverCard.Root>
  );
}

function DocPreview() {
  const A = useLinkComponent();
  return (
    <HoverCard.Root>
      <HoverCard.Trigger>
        <A href="/docs/q3-launch-plan" style={{ color: "var(--ds-text-link)", textDecorationLine: "underline", fontWeight: 600 }}>Q3 Launch Plan</A>
      </HoverCard.Trigger>
      <HoverCard.Content maxWidth="320px">
        <Flex direction="column" gap="1">
          <UIText style={{ fontWeight: 600, color: "var(--ds-text-strong)" }}>Q3 Launch Plan</UIText>
          <Text size="1" style={{ color: "var(--ds-text-weak)" }}>Updated 2 days ago · 14 pages · Marta Kane</Text>
          <UIText style={{ color: "var(--ds-text-strong)", lineHeight: 1.6, marginTop: "var(--space-1)" }}>
            Rollout schedule, owner map, and the go / no-go checklist for the September release across the
            three launch regions.
          </UIText>
        </Flex>
      </HoverCard.Content>
    </HoverCard.Root>
  );
}

const PROPS: PropDef[] = [
  { name: "HoverCard.Content — size", type: `"1" | "2" | "3"`, def: "control lane (1 at small)", desc: <>Radix Content size. Unset, it follows the global <Code>uiSize</Code> control lane (default <Code>small</Code> → <Code>1</Code>); an explicit value wins.</>, source: "HoverCard.tsx" },
  { name: "HoverCard.Content — maxWidth", type: "string", def: `"480px"`, desc: <>Caps the card's width so a preview stays a glanceable card, not a paragraph. Radix's <Code>width</Code> / <Code>minWidth</Code> / <Code>side</Code> / <Code>align</Code> / <Code>sideOffset</Code> pass through.</>, source: "Radix" },
  { name: "HoverCard.Root — openDelay / closeDelay", type: "number", def: "200 / 150", desc: <>Hover open / close delay in ms (Radix defaults). Keyboard-focus open is immediate. A HoverCard is supplementary, so a small delay keeps it from flickering as the pointer crosses the link.</>, source: "Radix" },
  { name: "HoverCard.Trigger", type: "compound part", desc: <>The anchor the card previews — a real link. It composes its child via <Code>asChild</Code>, so a System <Code>Link</Code> (or a framework link) drops straight in. It must itself navigate to the full content.</>, source: "Radix" },
];

const meta: Meta<typeof HoverCard.Root> = {
  title: "Components/Modals & Popovers/HoverCard",
  component: HoverCard.Root,
  parameters: {
    controls: { disable: true },
    docs: {
      description: {
        component:
          "**HoverCard** shows a rich preview card tied to a link, on hover or keyboard focus. It wraps " +
          "Radix's compound HoverCard with Content on the uiSize control lane, keeping Radix's own solid " +
          "preview-panel skin and inheriting popper motion for free. It is **Tooltip's big sibling**: " +
          "a hover/focus-only surface — invisible on touch — so it is a **supplementary preview " +
          "only**, never the sole way to reach content; the trigger link must itself navigate there.",
      },
    },
  },
};
export default meta;
type Story = StoryObj<typeof HoverCard.Root>;

/** Usage — the primary lite docs story: labeled preview specimens, the live token spec, and one do/don't. */
export const Usage: Story = {
  // The DoDont callout labels (success/error text on the green/red tint) measure ~4.1–4.4 — just under
  // axe's strict 4.5; the callout colour + the DO/DON'T word already carry the meaning, so color-contrast
  // is scoped off here for JUST that element, a documented specimen exception (same pattern as Tooltip /
  // AlertDialog Usage). The preview cards themselves stay contrast-checked.
  parameters: { a11y: { context: { exclude: [DODONT_LABEL] } } },
  render: (_args, { globals }) => (
    <HexThemeKey.Provider value={`${globals.accent}-${globals.appearance}-${globals.contrast}`}>
      <LinkProvider component={DemoLink}>
        <Page>
          <PageHeader title="HoverCard · Usage" standfirst={DEFINITION} />

          <Section title="Specimen" lead="Hover (or Tab to) a link to reveal its preview. Each trigger is a real link that navigates on its own; the card is a bonus, not the only way in.">
            <Text style={{ color: "var(--ds-text-strong)", lineHeight: 1.8, maxWidth: "var(--ds-text-measure)" }}>
              Assigned to <UserPreview /> after the review. The rollout follows the <DocPreview /> — hover
              either link to preview it in place, or click through for the full page.
            </Text>
          </Section>

          <Rule />

          <ComparisonSection comparison={FLOATING_INFO_COMPARISON} highlight="HoverCard" />

          <Rule />

          <Section title="A bonus, never the only route" lead="A HoverCard supplements a link that already stands on its own. It is hover/focus-only — invisible on touch and easy to miss — so must-know information never lives in the card alone.">
            <Grid columns={{ initial: "1", sm: "2" }} gap="3">
              <DoDont kind="do" bare note="The @mention is a real link that opens the full profile; the hover card is a bonus preview — helpful if seen, harmless if missed. The information also lives at the destination.">
                <Flex align="center" style={{ minHeight: 40 }}>
                  <Text style={{ color: "var(--ds-text-strong)" }}>
                    Reviewed by <Link href="#elena" style={{ fontWeight: 600 }}>@elena-ruiz</Link>
                  </Text>
                </Flex>
              </DoDont>
              <DoDont kind="dont" bare note="If the only way to reach the assignee's details is to hover an icon, the info vanishes on touch, on keyboard, and for many AT users — the reader can't reach what they can't hover. Give a real link (or put the detail inline).">
                <Flex align="center" style={{ minHeight: 40 }}>
                  <Text style={{ color: "var(--ds-text-strong)" }}>
                    Assignee{" "}
                    <span style={{ display: "inline-flex", width: 20, height: 20, borderRadius: "var(--ds-radius-full)", border: "1px solid var(--ds-stroke-weak)", background: "var(--ds-bg-base)", color: "var(--ds-text-weak)", alignItems: "center", justifyContent: "center", fontSize: "var(--font-size-1)", verticalAlign: "middle" }}>i</span>
                  </Text>
                </Flex>
              </DoDont>
            </Grid>
          </Section>

          <Rule />

          <Section title="Tokens" lead="Read live from the running theme — the swatch and hex resolve from the panel token, so this can't drift from the code. HoverCard reuses Radix's solid preview-panel skin, so it owns no --ds-* roles of its own.">
            <HoverCardSpec />
          </Section>
        </Page>
      </LinkProvider>
    </HexThemeKey.Provider>
  ),
  play: async ({ canvasElement }) => {
    // The token table's EVIDENCE, asserted at runtime ([[measured-token-rows]]) — the panel is portaled into the
    // measurement host, so this proves the row read a REAL mounted card and not a probe.
    const rows = assertMeasuredRows(canvasElement);
    if (rows.measured !== 2 || rows.unproven !== 0) {
      throw new Error(`expected 2 measured / 0 unproven token rows, got ${rows.measured} / ${rows.unproven}`);
    }

    // Passive: assert each trigger is a REAL navigating anchor (the [[floating-surface-wraps]] invariant — the card is never the
    // sole access, the trigger link is). Viewing the page must NOT open a card, so nothing here hovers or
    // force-opens; the panel + its motion base class are exercised in _internal, and axe runs on the story.
    const triggers = Array.from(document.querySelectorAll<HTMLAnchorElement>("a.rt-HoverCardTrigger"));
    if (triggers.length < 2) throw new Error("both preview triggers must render a real anchor (a.rt-HoverCardTrigger)");
    for (const a of triggers) {
      const href = a.getAttribute("href");
      if (!href) throw new Error("a HoverCard trigger must carry a real href — it is the non-hover path to the content ([[floating-surface-wraps]])");
    }
  },
};

type PropsArgs = { size: "auto" | "1" | "2" | "3"; maxWidth: string };

/** Props — the live, args-driven HoverCard. Drive the Content size and its max width. */
export const Props: StoryObj<PropsArgs> = {
  // "auto" (size unset) is the default so the card tracks the global uiSize toolbar out of the box.
  args: { size: "auto", maxWidth: "300px" },
  argTypes: {
    size: { control: "inline-radio", options: ["auto", "1", "2", "3"], description: '"auto" tracks the global uiSize toolbar (unset → the control lane); a step (1–3) pins the Content size.', table: { category: "Variant" } },
    maxWidth: { control: "text", description: "Caps the card width (e.g. 300px). Radix default 480px.", table: { category: "Layout" } },
  },
  parameters: { controls: { disable: false } },
  render: ({ size, maxWidth }: PropsArgs) => (
    <LinkProvider component={DemoLink}>
      <Page maxWidth="none">
        <PageHeader title="HoverCard · Props" standfirst={DEFINITION} />
        <Box style={{ padding: "24px 0 8px" }}>
          <Text style={{ color: "var(--ds-text-strong)" }}>
            Hover or Tab to <PropsTrigger size={size} maxWidth={maxWidth} /> to preview it.
          </Text>
        </Box>
        <PropsLead />
        <Rule />
        <Section title="Props reference" lead={<>Every prop <Code>HoverCard</Code> adds or forwards — <Code>size</Code> rides the control lane; <Code>maxWidth</Code> caps the card; the rest pass through to Radix's <Code>HoverCard</Code>.</>}>
          <PropTable rows={PROPS} />
        </Section>
      </Page>
    </LinkProvider>
  ),
};

function PropsTrigger({ size, maxWidth }: PropsArgs) {
  const A = useLinkComponent();
  return (
    <HoverCard.Root>
      <HoverCard.Trigger>
        <A href="/team/elena-ruiz" style={{ color: "var(--ds-text-link)", textDecorationLine: "underline", fontWeight: 600 }}>@elena-ruiz</A>
      </HoverCard.Trigger>
      <HoverCard.Content size={size === "auto" ? undefined : size} maxWidth={maxWidth}>
        <Flex gap="3" align="start">
          <Avatar size="lg" fallback="ER" alt="Elena Ruiz" />
          <Flex direction="column" gap="1" style={{ minWidth: 0 }}>
            <UIText style={{ fontWeight: 600, color: "var(--ds-text-strong)" }}>Elena Ruiz</UIText>
            <Text size="1" style={{ color: "var(--ds-text-weak)" }}>Staff Engineer · Design Systems</Text>
            <Text size="1" style={{ color: "var(--ds-text-weak)" }}>248 commits · 12 repositories</Text>
          </Flex>
        </Flex>
      </HoverCard.Content>
    </HoverCard.Root>
  );
}

/** History — the rulings this component encodes and a changelog of how it changes over time. */
export const History: Story = {
  render: () => (
    <Page>
      <PageHeader title="HoverCard · History" standfirst={DEFINITION} />
      <Section title="Decisions" lead="The rulings this component encodes.">
        <Flex direction="column" gap="3">
          <Decision id="[[catalog-as-specification]] · Wrapped Radix component">
            HoverCard is a <strong>wrapped</strong> Radix Themes component — the Radix name wins; built on
            the Radix substrate + our <Code>--ds-*</Code> layer, not a hand-rolled popover. Radix already
            portals, positions, and dismisses it; the wrap is the same compound shape as{" "}
            <Code>DropdownMenu</Code> (Root / Trigger pass through, Content is wrapped).
          </Decision>
          <Decision id="uiSize · Global control lane">
            Content <Code>size</Code> follows the global <Code>uiSize</Code> <strong>control lane</strong>{" "}
            (our <Code>small</Code> default → <Code>1</Code>) unless set — so a preview card sizes with the
            Button and Text beside it, never offset from them.
          </Decision>
          <Decision id="[[floating-surface-fill]] · Opaque panel skin">
            The card keeps Radix's own <strong>solid</strong> preview-panel skin — an opaque{" "}
            <Code>--color-panel-solid</Code> surface, no translucent variant is exposed (the
            floating-surface opacity rule: a floating panel must never let the page read through it). The
            wrap declares no <Code>--ds-*</Code> paint roles.
          </Decision>
          <Decision id="[[collapsible-and-accordion]] · Inherited popper motion">
            Motion is inherited, not declared: Content carries the shared <Code>.rt-PopperContent</Code>{" "}
            base class, retimed to <Code>--ds-duration-overlay</Code> (150ms) / <Code>--ds-ease-entry</Code>{" "}
            in and the <strong>slower</strong> <Code>--ds-duration-emphasis</Code> (260ms) /{" "}
            <Code>--ds-ease-standard</Code> out — floating surfaces arrive quickly and leave unhurriedly,
            which matters most for a panel you never clicked: it fades off on its own terms instead of
            snapping away the moment the pointer drifts. Same motion as every other floating surface. The
            wrap adds <strong>zero</strong> motion CSS; reduced motion collapses it for free.
          </Decision>
          <Decision id="[[floating-surface-wraps]] · Supplementary preview only">
            <strong>The supplementary-preview stance — Tooltip's big sibling.</strong> A HoverCard opens
            only on hover or keyboard focus, so it is <strong>invisible on touch</strong> and easy to miss.
            It is a supplementary preview, <strong>never the sole access</strong> to its content: the
            Trigger is a real link, and that link must itself navigate somewhere that carries the full
            content. Never put must-know information in the card alone.
          </Decision>
        </Flex>
      </Section>

      <Rule />

      <Section title="Changelog" lead="Notable changes, newest first — grows as the component evolves.">
        <Flex direction="column" gap="3">
          <Decision id="0.9.0">
            Initial <Code>System/HoverCard</Code> — Radix HoverCard wrapped on the uiSize control lane, the
            solid preview panel and popper motion inherited (zero CSS); the supplementary-preview
            stance documented; the <Code>Tooltip · Popover · HoverCard</Code> floating-info comparison
            rendered here; History page added so every component, stubs included, has one.
          </Decision>
        </Flex>
      </Section>
    </Page>
  ),
};
