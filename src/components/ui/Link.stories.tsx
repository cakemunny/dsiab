import type { Meta, StoryObj } from "@storybook/react-vite";
import { Box, Code, Flex, Grid, Text } from "@radix-ui/themes";
import { Link } from "./Link";
import {
  type AccentColor, Decision, DoDont, DODONT_LABEL, HexThemeKey, LiteTokenSpec, MeasuredRow, MeasuredSpec,
  Mono, Page, PageHeader, PropsLead, type PropDef, PropTable, Rule, Section, toHex,
} from "./_storyKit";
import { assertMeasuredRows } from "../../foundations/_assert";

/* Link reuses Radix Themes' own Link skin, so it declares no paint role of its own. It has ≤1 paint
   token, so the token spec uses the low-token shape: one binding row + a one-line reuse rationale. The
   reused underline skin and the [[focus-ring]] focus ring are documented in History, not as extra token rows.

   MEASURED ([[measured-token-rows]]), and the measurement corrected the claim. The row it replaces resolved
   --ds-text-link and printed that back, so it could only ever agree. Reading `color` off a rendered
   link says otherwise: Radix paints the accent's ALPHA step-11 (--accent-a11), not the solid step-11
   that --ds-text-link aliases. The two are the same ink where it matters — --accent-a11 composited on
   the page background is exactly --accent-11 — but they are not the same value, and over a tinted
   surface a link stays translucent. So the row now names the token the skin actually paints from. */

function LinkSpec() {
  return (
    <LiteTokenSpec
      rationale={
        <>
          Link reuses Radix's Link skin, which paints the accent's <em>alpha</em> step-11 —{" "}
          <Mono>--accent-a11</Mono>. Composited on the page background that is exactly{" "}
          <Mono>--accent-11</Mono>, the step <Mono>--ds-text-link</Mono> aliases, so an inline link reads
          as the system's link ink; over a tinted surface it stays translucent and takes a little of the
          tint. Either way the wrap declares no parallel colour and tracks the brand collision shift for
          free.
        </>
      }
    >
      <MeasuredSpec render={() => <Link href="#measurement">Link</Link>}>
        <MeasuredRow
          part="Link text"
          note="The alpha step the reused skin paints from; on the page it composites to --ds-text-link."
          token="--accent-a11"
          select="a.rt-Link"
          prop="color"
        />
      </MeasuredSpec>
    </LiteTokenSpec>
  );
}

/* A read-only usage snippet — the router-adapter seam, documented (never a live next/react-router import). */
const ROUTER_ADAPTER_SNIPPET = `import { LinkProvider } from "@/components/ui/Link";
import NextLink from "next/link";

// Wrap the app ONCE. Every System nav row with an href — SideNav, TopNav,
// Breadcrumbs, or a bare <Item href> — now routes through Next's client Link
// instead of a full-page reload. Drop the provider and each is a plain <a>.
<LinkProvider component={NextLink}>
  <AppShell>{children}</AppShell>
</LinkProvider>`;

function CodeBlock({ children }: { children: string }) {
  return (
    <Box style={{ borderRadius: "var(--ds-radius-4)", border: "1px solid var(--ds-stroke-weak)", background: "var(--ds-bg-subtle)", padding: "16px 20px", overflowX: "auto" }}>
      <pre style={{ margin: 0, whiteSpace: "pre", fontFamily: "var(--code-font-family)", fontSize: 12, lineHeight: 1.6, color: "var(--ds-text-strong)" }}>{children}</pre>
    </Box>
  );
}

/* ---- Properties ---------------------------------------------------------- */

const LINK_PROPS: PropDef[] = [
  { name: "children", type: "ReactNode", desc: <>The link text — <strong>describe the destination</strong> so it reads on its own (out of context, in a screen-reader link list).</>, source: "Radix" },
  { name: "href", type: "string", desc: <>The destination URL. Standard anchor attributes (<Code>target</Code>, <Code>rel</Code>, <Code>download</Code>…) pass through.</>, source: "a" },
  { name: "size", type: `"1"–"9"`, desc: <>Radix size step. <strong>Unset it inherits the surrounding text size</strong> — the right default for an inline link; set it only for a standalone link that needs its own scale.</>, source: "Radix" },
  { name: "weight", type: `"regular" | "medium" | "bold"`, def: `"regular"`, desc: <>Font weight on the system's 3-step ramp (<Code>light</Code> also passes through but is off-ramp).</>, source: "Radix" },
  { name: "underline", type: `"always" | "auto" | "hover" | "none"`, def: `"always"`, desc: <>Defaults to <Code>always</Code> — a persistent underline so an inline link is distinguishable at rest (Radix's <Code>auto</Code> only underlines on hover, which fails the <Code>link-in-text-block</Code> a11y rule). Force <Code>auto</Code>/<Code>hover</Code>/<Code>none</Code> for a standalone link.</>, source: "Radix" },
];

/* ========================================================================== */

/** The one definition of this component — the standfirst every page of it opens with. */
const DEFINITION = <>A text link — the accent-coloured, underlined anchor for navigating or referencing a destination. Its ink is Radix's own <Mono>--accent-a11</Mono>, which on the page composites to the <Mono>--ds-text-link</Mono> value, and nav rows can route it through a framework Link via <Mono>LinkProvider</Mono>.</>;

const meta: Meta<typeof Link> = {
  title: "Components/Content/Link",
  component: Link,
  parameters: {
    // Docs stories use custom render() and don't read args, so Controls is dead there — hidden by
    // default; the Props re-enables it. (Accessibility + Interactions stay on.)
    controls: { disable: true },
    docs: {
      description: {
        component:
          "**Link** is the System text link — a thin wrapper over Radix's `Link` that reuses its ink " +
          "wholesale (the accent's alpha step-11, which on the page composites to the `--ds-text-link` " +
          "value), defaults to a persistent underline so an " +
          "inline link stays distinguishable, and swaps Radix's accent-8 focus outline for the system " +
          "focus ring ([[focus-ring]]). The same module ships **`LinkProvider` / `useLinkComponent`**, " +
          "the pluggable-Link seam: wrap the app once and every System nav row routes through a framework " +
          "`Link` (Next / React Router) instead of a full-page `<a>`. It's the **lite docs tier**: one " +
          "Usage (specimen · live token spec · router adapter · do/don't) plus a Props.",
      },
    },
  },
};
export default meta;
type Story = StoryObj<typeof Link>;

/** Usage — the primary lite docs story: specimen, live token spec, the router adapter, and a do/don't. */
export const Usage: Story = {
  // The DO/DON'T word (success/error step-11 ink on its own tint) measures 4.10 at 12px bold, under axe's
  // 4.5; the colour + the word already carry the meaning, so that row is the documented exception. Scoped
  // to the label itself — the cards' specimens stay fully axe-checked, which "[data-dodont]" did not do.
  parameters: { a11y: { context: { exclude: [DODONT_LABEL] } } },
  render: (_args, { globals }) => (
    <HexThemeKey.Provider value={`${globals.accent}-${globals.appearance}-${globals.contrast}`}>
      <Page>
        <PageHeader title="Link · Usage" standfirst={DEFINITION} />

        <Section title="Specimen" lead="A standalone link, and a link inline in a sentence — where the underline earns its keep.">
          <Flex direction="column" gap="3">
            <Link href="#">View the release notes</Link>
            <Text size="3" style={{ color: "var(--ds-text-strong)", lineHeight: 1.6, maxWidth: "var(--ds-text-measure)" }}>
              Tokens follow the brand collision shift — see the <Link href="#">token naming guide</Link> for
              how a role like <Code>--ds-text-link</Code> resolves per accent.
            </Text>
          </Flex>
        </Section>

        <Rule />

        <Section title="Routing adapter" lead="The System Link is a plain anchor; nav rows become client-side routes by wrapping the app in a LinkProvider that supplies a framework Link. No provider ⇒ a full-page <a>, so it's opt-in.">
          <CodeBlock>{ROUTER_ADAPTER_SNIPPET}</CodeBlock>
        </Section>

        <Rule />

        <Section title="Link text names the destination" lead="Link text should name the destination — it's read on its own in screen-reader link lists and works out of context.">
          <Grid columns={{ initial: "1", sm: "2" }} gap="3">
            <DoDont kind="do" bare accent={globals.accent as AccentColor} note="Descriptive text names where the link goes — it reads on its own, out of context.">
              <Text size="2" style={{ color: "var(--ds-text-strong)", lineHeight: 1.6 }}>
                Read the <Link href="#">token naming guide</Link> before adding a role.
              </Text>
            </DoDont>
            <DoDont kind="dont" bare accent={globals.accent as AccentColor} note="“Click here” and a bare URL carry no meaning out of context and read poorly aloud.">
              <Text size="2" style={{ color: "var(--ds-text-strong)", lineHeight: 1.6 }}>
                To learn more, <Link href="#">click here</Link>, or visit{" "}
                <Link href="#">https://example.com/docs/tokens/naming</Link>.
              </Text>
            </DoDont>
          </Grid>
        </Section>

        <Rule />

        <Section title="Tokens" lead="Read off a rendered link and checked against the token the row names. Link reuses Radix's skin wholesale — the ink, the underline and the visited treatment all come from it; the one system override is the focus ring.">
          <LinkSpec />
        </Section>
      </Page>
    </HexThemeKey.Provider>
  ),
  play: async ({ canvasElement }) => {
    // The token table's EVIDENCE, asserted at runtime ([[measured-token-rows]]): the row read `color` off a rendered
    // link and resolved --accent-a11 on a different node, and the two agree. This row is the reason the
    // page no longer claims --ds-text-link: measured, the ink is the ALPHA step, not the solid one.
    const rows = assertMeasuredRows(canvasElement);
    if (rows.measured !== 1 || rows.unproven !== 0) {
      throw new Error(`expected 1 measured / 0 unproven token rows, got ${rows.measured} / ${rows.unproven}`);
    }

    // The specimen renders a real Radix <a class="rt-Link"> — the skin this component reuses.
    const link = canvasElement.querySelector<HTMLAnchorElement>("a.rt-Link");
    if (!link) throw new Error("System Link must render a Radix <a class='rt-Link'>");
    // Reused skin: the link paints with the accent link ink, NOT neutral body text.
    const strong = document.createElement("span");
    strong.style.cssText = "color: var(--ds-text-strong); position: absolute; opacity: 0";
    canvasElement.appendChild(strong);
    const linkHex = toHex(getComputedStyle(link).color);
    const strongHex = toHex(getComputedStyle(strong).color);
    strong.remove();
    if (linkHex === strongHex) throw new Error(`Link must paint with the accent link colour, not body text (both ${linkHex})`);
    // axe runs automatically on the story.
  },
};

type PropsArgs = {
  children: string;
  size: "1" | "2" | "3" | "4" | "5" | "6" | "7" | "8" | "9";
  weight: "regular" | "medium" | "bold";
  underline: "auto" | "always" | "hover" | "none";
};

/** Props — the live, args-driven Link, shown standalone so every underline option is valid. Full axe. */
export const Props: StoryObj<PropsArgs> = {
  args: { children: "the release notes", size: "3", weight: "regular", underline: "always" },
  argTypes: {
    children: { control: "text", description: "The link text — describe the destination.", table: { category: "Content" } },
    size: { control: "select", options: ["1", "2", "3", "4", "5", "6", "7", "8", "9"], description: "Radix size step. Unset, an inline link inherits the surrounding text size.", table: { category: "Variant" } },
    weight: { control: "inline-radio", options: ["regular", "medium", "bold"], description: "Font weight on the system's 3-step ramp.", table: { category: "Variant" } },
    underline: { control: "inline-radio", options: ["always", "auto", "hover", "none"], description: "Underline behaviour — always is the accessible default; auto/hover underline only on hover.", table: { category: "Variant" } },
  },
  // re-enable Controls here (disabled at the meta level for the curated docs stories)
  parameters: { controls: { disable: false } },
  render: ({ children, size, weight, underline }: PropsArgs) => (
    <Page maxWidth="none">
      <PageHeader
        title="Link · Props"
        standfirst={<>{DEFINITION} The link below stands on its own; a link set inside a sentence should keep the <strong>always</strong> underline default.</>}
      />
      <Box style={{ padding: "8px 0 2px" }}>
        <Link size={size} weight={weight} underline={underline} href="#">{children}</Link>
      </Box>
      <PropsLead />
      <Rule />
      <Section title="Props reference" lead={<>Every prop <Code>Link</Code> documents — <Code>size</Code>/<Code>weight</Code>/<Code>underline</Code> pass through to Radix's <Code>Link</Code>.</>}>
        <PropTable rows={LINK_PROPS} />
      </Section>
    </Page>
  ),
};

/** History — the rulings this component encodes and a changelog. Required on every component. */
export const History: Story = {
  render: () => (
    <Page>
      <PageHeader title="Link · History" standfirst={DEFINITION} />
      <Section title="Decisions" lead="The rulings this component encodes.">
        <Flex direction="column" gap="3">
          <Decision id="[[catalog-as-specification]] · Wrapped Radix component">
            Link is a <strong>wrapped</strong> Radix Themes component, so the Radix name wins — built on
            the Radix substrate + our <Code>--ds-*</Code> layer, not a from-scratch anchor.
          </Decision>
          <Decision id="Tokens · the reused link ink">
            The text colour <strong>reuses Radix's Link skin</strong>, which paints the accent's{" "}
            <em>alpha</em> step-11 (<Code>--accent-a11</Code>). Composited on the page background that is
            exactly <Code>--accent-11</Code>, the step <Code>--ds-text-link</Code> aliases — so an inline
            link reads as the system's link ink; over a tinted surface it stays translucent. No parallel
            colour is declared either way, so the link tracks the brand collision shift for free (the
            token spec measures it off a rendered link).
          </Decision>
          <Decision id="[[focus-ring]] · Focus ring">
            Radix draws its focus ring with <Code>--focus-8</Code> (accent-8, under the 3:1 of WCAG
            1.4.11). The System Link wears the system ring instead. The base is the accent fill,{" "}
            <Code>--ds-stroke-focus</Code>. A Radix alpha, <Code>--ds-stroke-focus-stack</Code>, sits on top
            and deepens it past 3:1 and APCA Lc 30. It is 2px wide and 2px out, the same on every control.
            It replaces the first neutral focus ring, a 1px hairline.
          </Decision>
          <Decision id="Underline · a11y">
            Default <Code>underline="always"</Code>. Radix's own default (<Code>auto</Code>) underlines
            only on hover, leaving an inline link with no rest-state distinction — and accent-11 vs body
            text is under 3:1, so axe's <Code>link-in-text-block</Code> rightly fails. A{" "}
            <strong>persistent underline</strong> is the accessible default; callers can still force{" "}
            <Code>auto</Code>/<Code>hover</Code>/<Code>none</Code> for standalone links.
          </Decision>
          <Decision id="LinkProvider">
            The <strong>pluggable-Link seam</strong>: <Code>LinkProvider component={"{"}NextLink{"}"}</Code>{" "}
            supplies the app's framework Link, and <Code>useLinkComponent()</Code> reads it — defaulting to
            the native <Code>{"<a>"}</Code> tag when no provider is present. This lets nav route client-side
            with zero config out of the box.
          </Decision>
          <Decision id="Item routing">
            The shared <Code>Item</Code> row primitive renders its <Code>href</Code> body through{" "}
            <Code>useLinkComponent()</Code> (an explicit <Code>linkComponent</Code> prop wins, else the
            ambient provider, else a native <Code>{"<a>"}</Code>) — so SideNav / TopNav / Breadcrumbs rows
            route through the app's Link <strong>without re-anatomizing the row</strong>, and every existing
            consumer is byte-for-byte unchanged.
          </Decision>
        </Flex>
      </Section>

      <Rule />

      <Section title="Changelog" lead="Notable changes, newest first — grows as the component evolves.">
        <Flex direction="column" gap="3">
          <Decision id="0.9.0">
            Initial <Code>System/Link</Code> — Radix Link wrapped on its own reused ink, a
            persistent-underline default and the system focus ring ([[focus-ring]]); the{" "}
            <Code>LinkProvider</Code>/<Code>useLinkComponent</Code> router adapter; and the <Code>Item</Code>{" "}
            amendment routing every nav <Code>href</Code> body through the pluggable Link (default native{" "}
            <Code>{"<a>"}</Code>).
          </Decision>
        </Flex>
      </Section>
    </Page>
  ),
};
