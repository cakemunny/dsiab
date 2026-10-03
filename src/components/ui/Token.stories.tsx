import { useState, type ReactNode } from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { Box, Code, Flex, Grid } from "@radix-ui/themes";
import { Tag, Hash, User, Check, Funnel } from "@phosphor-icons/react";
import { Token } from "./Token";
import { Badge } from "./Badge";
import { Button } from "./Button";
import {
  AnatomyLegend, Caption, Decision, DoDont, DODONT_LABEL, dotStyle, HexThemeKey, hLine, MeasuredRow,
  MeasuredSpec, NoteRow, Page, PageHeader, PropsLead, type PropDef, PropTable, Rule, Scenario, Section, tick, TokenGroup,
} from "./_storyKit";
import { assertMeasuredRows } from "../../foundations/_assert";
import { ComparisonSection, CHIPS_COMPARISON } from "./_comparisons";

/** The component's definition — one source, referenced by the header of every story on this page. */
const DEFINITION = <>The interactive sibling of <Code>Badge</Code>. The boundary is the body: a chip whose body clicks or navigates is a Token, and a chip whose body only labels is a Badge. Token exists for the one shape Badge structurally forbids — an interactive body that coexists with a remove ✕ — which it solves by making the body and the ✕ siblings inside Badge's own chip skin.</>;

/* ---- helpers ------------------------------------------------------------- */
const variantOf = (b: HTMLElement) =>
  Array.from(b.classList).find((c) => c.startsWith("rt-variant-"))?.replace("rt-variant-", "");
// Count the focusable controls inside a chip (its body when interactive + the remove ✕).
const focusables = (chip: Element) =>
  Array.from(chip.querySelectorAll<HTMLElement>("a[href], button:not([disabled])"));

/* ---- DemoNav: mute navigation in the link specimens (stories only) --------
   A link Token is a REAL <a href>, and in a product it should navigate. On a docs page it must not: the
   Storybook preview document carries `<base target="_parent">`, so an <a> clicked inside a story steers
   the WHOLE window to the bare preview URL — sidebar, toolbar and the story you were reading all gone.
   Every href on this page is placeholder scaffolding standing in for a product route, so the specimens
   swallow the default while keeping the anchor itself untouched: the link semantics the anatomy claims,
   its tab stop, and its ≥24×24 pointer target all stay exactly what the component ships. Same idiom as
   _storyKit's DemoLink, applied at the container because Token renders its own anchor rather than routing
   through a link provider. `display: contents` keeps the guard out of the layout. */
function DemoNav({ children }: { children: ReactNode }) {
  return (
    <div
      style={{ display: "contents" }}
      onClickCapture={(e) => {
        if ((e.target as HTMLElement).closest?.("a[href]")) e.preventDefault();
      }}
    >
      {children}
    </div>
  );
}

/* ---- Live specimens: a removable chip must actually remove ----------------
   A ✕ that never removes anything teaches the wrong thing — the chip below labelled "Looks clickable,
   isn't" is exactly that defect. These two specimens hold real state, so removing a chip removes it and
   a Reset (shown only once something is gone) brings the set back. */
function FilterTokens() {
  const ALL = ["Owner: me", "Status: open", "Label: bug"];
  const [kept, setKept] = useState(ALL);
  const [editing, setEditing] = useState<string | null>(null);
  return (
    <Flex direction="column" gap="2" align="start">
      <Flex gap="2" wrap="wrap" align="center" data-size-lesson="the chip's remove ✕ holds step 1 — it garnishes the chip, it doesn't join the ambient row">
        {kept.map((f) => (
          <Token
            key={f}
            leadingIcon={f === "Owner: me" ? <Funnel weight="bold" /> : undefined}
            onClick={() => setEditing(f)}
            onRemove={() => {
              setKept((k) => k.filter((x) => x !== f));
              setEditing((e) => (e === f ? null : e));
            }}
          >
            {f}
          </Token>
        ))}
        {kept.length < ALL.length && (
          <Button type="button" priority="tertiary" onClick={() => { setKept(ALL); setEditing(null); }}>
            Reset
          </Button>
        )}
      </Flex>
      <Caption>{editing ? `Editing “${editing}” — a real filter would open its editor here.` : kept.length ? "Click a chip to edit it; click its ✕ to drop the filter." : "All filters cleared."}</Caption>
    </Flex>
  );
}

function SelectionTokens() {
  const ALL = ["TypeScript", "React", "CSS", "Radix"];
  const [kept, setKept] = useState(ALL);
  return (
    <Flex gap="2" wrap="wrap" align="center" data-size-lesson="the chip's remove ✕ holds step 1 — it garnishes the chip, it doesn't join the ambient row">
      {kept.map((s) => (
        <Token key={s} onRemove={() => setKept((k) => k.filter((x) => x !== s))}>{s}</Token>
      ))}
      {kept.length < ALL.length && (
        <Button type="button" priority="tertiary" onClick={() => setKept(ALL)}>Reset</Button>
      )}
    </Flex>
  );
}

/* ---- A filter row of toggles ([[token-pressed-state]]) -------------------
   Each Token here is a toggle: `onClick` flips its entry in state and `pressed` reports it back, so the
   body <button> carries `aria-pressed`. A pressed chip shows no glyph, and each label holds its bold width
   at rest, so pressing a filter moves no chip in the row. One filter starts on, so the row always shows
   both states side by side. */
const PRESSED_FILTERS = ["Open", "Bug", "Design", "Docs"];
function PressedFilterTokens() {
  const [on, setOn] = useState<string[]>(["Bug"]);
  return (
    <Flex direction="column" gap="2" align="start">
      <Flex gap="2" wrap="wrap" align="center" role="group" aria-label="Filter issues" data-testid="pressed-filters">
        {PRESSED_FILTERS.map((f) => (
          <Token key={f} pressed={on.includes(f)} onClick={() => setOn((s) => (s.includes(f) ? s.filter((x) => x !== f) : [...s, f]))}>{f}</Token>
        ))}
      </Flex>
      <Caption>{on.length ? `Showing issues tagged ${on.join(", ")}.` : "No filter is on, so every issue shows."}</Caption>
    </Flex>
  );
}

/** Polls `fn` until it returns truthy, or rejects after `timeout` ms (the play waits on a React re-render). */
async function waitFor(fn: () => boolean, timeout = 1500): Promise<void> {
  const start = performance.now();
  while (!fn()) {
    if (performance.now() - start > timeout) throw new Error("waitFor timed out");
    const { promise, resolve } = Promise.withResolvers<void>();
    requestAnimationFrame(() => resolve());
    await promise;
  }
}

/* ---- anatomy diagram (Token-specific) ------------------------------------ */
function AnatomyDiagram() {
  return (
    <Box style={{ overflowX: "auto" }}>
      <Box style={{ position: "relative", width: "100%", minWidth: 360, maxWidth: 620, margin: "0 auto", height: 210, background: "var(--ds-bg-subtle)", borderRadius: "var(--ds-radius-4)", overflow: "hidden" }}>
        <Flex align="center" justify="center" style={{ position: "absolute", inset: 0 }}>
          {/* A clickable, removable chip — the full anatomy: an invisible-button body + a sibling ✕. */}
          <Token
            size="3"
            leadingIcon={<Tag weight="bold" />}
            onClick={() => {}}
            onRemove={() => {}}
            data-size-lesson="anatomy callout geometry — the callouts are placed against this size-3 chip; its remove ✕ holds step 1"
          >
            Design
          </Token>
        </Flex>
        {/* Callouts measured against the size="3" clickable+removable specimen (leading tag · label ·
            trailing ✕ · the container). Approximate — the legend below carries the real detail. */}
        {/* leading icon */}
        <Box style={{ ...dotStyle, left: "calc(50% - 66px)", top: 46 }}>2</Box>
        <Box style={tick({ left: "calc(50% - 56px)", top: 66, height: 22 })} />
        {/* body / label */}
        <Box style={{ ...dotStyle, left: "calc(50% - 18px)", top: 28, transform: "translateX(-50%)" }}>3</Box>
        <Box style={tick({ left: "calc(50% - 18px)", top: 48, height: 40 })} />
        {/* remove ✕ */}
        <Box style={{ ...dotStyle, left: "calc(50% + 42px)", top: 46 }}>4</Box>
        <Box style={tick({ left: "calc(50% + 52px)", top: 66, height: 22 })} />
        {/* container */}
        <Box style={{ ...dotStyle, left: "calc(50% - 135px)", top: 96 }}>1</Box>
        <Box style={hLine({ left: "calc(50% - 125px)", top: 106, width: 71 })} />
      </Box>
    </Box>
  );
}
const ANATOMY_PARTS: [number, string, string][] = [
  [1, "Container", "the pill surface — a real .rt-Badge (surface variant), reused from Badge verbatim, and the same 20/24/28 box whether the body is interactive or inert. Carries data-interactive when the body clicks/navigates, so it takes the hover/press paint and hoists the focus ring. It carries NO target floor of its own: a span isn't what a pointer hits, so the 24×24 lives on the body and the ✕ below."],
  [2, "Leading icon", "optional — identifies the token (a category, tag, or entity). aria-hidden."],
  [3, "Body", "the ONLY net-new piece — an all:unset <a>/<button>/<span> that supplies real link/button semantics and holds the label, with NO skin of its own (the container paints). This is what makes a Token interactive where a Badge can't be."],
  [4, "Remove ✕", "optional — an IconButton inset, reused from Badge (the Remove {label} name + the ghost skin). Its box grows to the 24×24 target floor and gives the growth back as negative margin, so the glyph, the chip and the hover disc are all unmoved. A SIBLING of the body, never nested, so removal coexists with a clickable/link body as valid HTML."],
];

/* ---- Tokens: the borrowed skin + the reused interactive roles, MEASURED -----
   Each colour row names an element and a property, reads it off a real rendered chip, and checks it
   against the token it claims — so a row can disagree with the component. The focus row reads the
   declaration the component's OWN matched rule paints, since :focus-visible needs a keyboard.

   The two hover/press rows stay prose, and the reason is the interesting part: the neutral tint is
   layered as a background-IMAGE over the chip rather than swapped into its background-color, so the
   accent surface underneath survives and is merely darkened. There is no single colour longhand on the
   element for a row to check a token against. */
function TokenTokens() {
  return (
    <Flex direction="column" gap="4">
      <TokenGroup
        label="STATIC CHIP (surface — pixel-identical to Badge's removable chip)"
        blurb="Token reskins nothing at rest — the container IS a Radix Badge (surface variant), so its fill, border and label colour ARE Badge's. Pressed paint is the one exception, measured in the PRESSED group below ([[token-pressed-state]]). Each row is read off the rendered chip, so the table reports what the chip paints."
        specimen={<Token leadingIcon={<Tag weight="bold" />} onRemove={() => {}} data-size-lesson="the chip's remove ✕ holds step 1 — it garnishes the chip, it doesn't join the ambient row">Design</Token>}
      >
        <MeasuredSpec render={() => <Token leadingIcon={<Tag weight="bold" />} onRemove={() => {}}>Design</Token>}>
          <MeasuredRow part="Container fill" token="--accent-surface" select=".rt-ds-token" prop="background-color" />
          <MeasuredRow
            part="Label + icon"
            note="One ink for both — the body is all:unset, so it inherits the container's colour."
            token="--accent-a11"
            select=".rt-ds-token"
            prop="color"
          />
        </MeasuredSpec>
        <NoteRow part="Border (surface)" value="a 1px inset edge, drawn as a box-shadow rather than a border" radix="--accent-a6" />
        <NoteRow part="Shape (radius)" value="full (pill) by default" radix="--radius-full" />
      </TokenGroup>
      <TokenGroup
        label="INTERACTIVE (link + clickable body)"
        blurb="The clickable/link body carries Badge's [data-interactive] paint VERBATIM — the same --ds-* roles, no new tokens. NO link/clickable visual split, NO underline: the bounded surface + hover-deepen IS the affordance."
        specimen={<Token onClick={() => {}}>Owner: me</Token>}
      >
        <MeasuredSpec render={() => <Token onClick={() => {}}>Owner: me</Token>}>
          <MeasuredRow
            part="Focus ring (hoisted)"
            note="Hoisted to the container, because the all:unset body is what actually takes focus. The accent base, with the stack alpha on top, 2px ([[focus-ring]])."
            token="--ds-stroke-focus"
            select=".rt-ds-token[data-interactive]"
            prop="outline-color"
            state="focus-visible"
          />
        </MeasuredSpec>
        <NoteRow part="Fill · hover" value="a neutral tint layered OVER the chip as a background-image, so the accent surface beneath survives and is only darkened" radix="--ds-fill-hover" />
        <NoteRow part="Fill · press" value="the same layered treatment, one step deeper" radix="--ds-fill-press" />
        <NoteRow part="Target floor" value="min 24×24 (border-box)" radix="2.5.8" />
      </TokenGroup>
      <TokenGroup
        label="PRESSED (a clickable body given pressed)"
        blurb="The one paint Token does not borrow from Badge ([[token-pressed-state]]). A pressed toggle takes the look the system gives every pressed toggle: the selected tint under strong ink at weight 600, with no glyph. The label holds its bold width at rest, so the chip keeps one width pressed or not. The fill does not change on hover."
        specimen={<Token onClick={() => {}} pressed data-pressed-specimen="">Bug</Token>}
      >
        <MeasuredSpec render={() => <Token onClick={() => {}} pressed data-pressed-specimen="">Bug</Token>}>
          <MeasuredRow part="Container fill · pressed" token="--ds-fill-selected-subtle" select=".rt-ds-token" prop="background-color" />
          <MeasuredRow
            part="Label ink · pressed"
            note="The label sits in the body, which inherits the container's colour."
            token="--ds-text-strong"
            select=".rt-ds-token"
            prop="color"
          />
          <MeasuredRow part="Label weight · pressed" token="--ds-font-weight-strong" select=".rt-ds-token" prop="font-weight" />
        </MeasuredSpec>
        <NoteRow part="Forced colours · pressed" value="Highlight under HighlightText, and every Token toggle keeps a 1px ButtonBorder edge ([[forced-colours]])" radix="Highlight" />
      </TokenGroup>
    </Flex>
  );
}

/* ========================================================================== */
const meta: Meta<typeof Token> = {
  title: "Components/Content/Token",
  component: Token,
  parameters: {
    controls: { disable: true },
    docs: {
      description: {
        component:
          "**Token** is the interactive sibling of **Badge**. The boundary is one question — *does the body " +
          "do something?* If **yes** (the chip clicks or navigates), it's a Token; if **no** (it only labels), " +
          "it's a Badge. Token exists for the one shape Badge structurally forbids: an interactive body that " +
          "**coexists** with a remove ✕ (a ✕ nested inside a clickable `<button>`/`<a>` is invalid HTML). It " +
          "solves that by making the body and the ✕ valid-HTML **siblings** inside a container that **reuses " +
          "Badge's chip skin verbatim** — the surface fill, the `[data-interactive]` hover/press/focus paint, " +
          "and the inset ✕. The **only** net-new piece is the invisible-button body: an `all:unset` " +
          "`<a>`/`<button>`/`<span>` with the focus ring hoisted to the container. No `tone` axis; semantics " +
          "ride the categorical `color`.",
      },
    },
  },
};
export default meta;
type Story = StoryObj<typeof Token>;

/* ---- Anatomy — the labelled diagram only; the token spec closes Usage ----- */
export const Anatomy: Story = {
  render: (_args, { globals }) => (
    <HexThemeKey.Provider value={`${globals.accent}-${globals.appearance}-${globals.contrast}`}>
      <DemoNav>
      <Page>
        <PageHeader title="Token · Anatomy" standfirst={DEFINITION} />

        <Section title="Anatomy" lead="A clickable, removable chip — the fullest shape. A container reused from Badge, an invisible-button body, and a sibling remove ✕.">
          <AnatomyDiagram />
          <AnatomyLegend parts={ANATOMY_PARTS} />
          <Caption>The body is the token's accessible name when no <Code>aria-label</Code> is set. An icon-only token must carry <Code>aria-label</Code> (or a text <Code>label</Code>).</Caption>
        </Section>

        <Rule />

        <Section title="Three modes — resolved by props" lead="href → a link body. onClick → a clickable body. Neither → a static body (pixel-identical to Badge's removable chip). Link and clickable look identical — the bounded surface is the affordance; only the semantics differ.">
          <Box data-testid="modes">
            <Flex gap="3" align="center" wrap="wrap" data-size-lesson="the chip's remove ✕ holds step 1 — it garnishes the chip, it doesn't join the ambient row">
              <Flex direction="column" gap="1" align="start">
                <Token data-testid="static" leadingIcon={<Tag weight="bold" />} onRemove={() => {}}>Static</Token>
                <Caption>span body · no affordance</Caption>
              </Flex>
              <Flex direction="column" gap="1" align="start">
                <Token data-testid="clickable" onClick={() => {}} onRemove={() => {}}>Clickable</Token>
                <Caption>button body · onClick</Caption>
              </Flex>
              <Flex direction="column" gap="1" align="start">
                <Token data-testid="link" href="#design" onRemove={() => {}}>Link</Token>
                <Caption>anchor body · href</Caption>
              </Flex>
            </Flex>
          </Box>
          <Caption>Every mode renders the remove ✕ as a <strong>sibling</strong> of the body — including the link, so there's never a button nested in an anchor. The link here points at a placeholder route and this page swallows the jump, so clicking it won't navigate away from the docs; in a product it follows its <Code>href</Code> like any anchor.</Caption>
        </Section>

        {/* Test fixture (visually hidden, aria-hidden): an icon-only token with NO accessible name must emit
            the dev warning (WCAG 4.1.2). The play installs a console.warn spy, then mounts. STATIC (no
            onClick/onRemove) so the aria-hidden container holds no focusable element (aria-hidden-focus). */}
        <Box aria-hidden data-testid="a11y-fixture" style={{ position: "absolute", width: 1, height: 1, padding: 0, margin: -1, overflow: "hidden", clipPath: "inset(50%)", whiteSpace: "nowrap", border: 0 }}>
          <Token leadingIcon={<Tag weight="bold" />} />
        </Box>
      </Page>
      </DemoNav>
    </HexThemeKey.Provider>
  ),
  play: async ({ canvasElement, mount }) => {
    // Icon-only token with no accessible name must warn (WCAG 4.1.2). Spy BEFORE mount so the on-mount
    // effect fires inside the spy window (the page renders a visually-hidden nameless icon-only fixture).
    const originalWarn = console.warn;
    const warnings: string[] = [];
    console.warn = (...a: unknown[]) => { warnings.push(String(a[0])); };
    try {
      await mount();
    } finally {
      console.warn = originalWarn;
    }
    if (!warnings.some((m) => m.includes("aria-label")))
      throw new Error("expected an icon-only Token (no accessible name) to warn (WCAG 4.1.2)");

    // --- passive structure reads only (no clicks/focus → no flash on view). ---
    const modes = canvasElement.querySelector('[data-testid="modes"]')!;
    // Every mode's container is a REUSED .rt-Badge surface chip carrying the Token marker.
    for (const id of ["static", "clickable", "link"]) {
      const chip = modes.querySelector<HTMLElement>(`[data-testid="${id}"]`);
      if (!chip) throw new Error(`missing ${id} chip`);
      if (!chip.classList.contains("rt-Badge")) throw new Error(`${id}: container must reuse the .rt-Badge skin`);
      if (variantOf(chip) !== "surface") throw new Error(`${id}: container must be the surface variant (got ${variantOf(chip)})`);
    }
    // Static body is a <span> and carries NO data-interactive (so no hover/press/ring — but the same box:
    // the chip paints its ladder step whichever body it holds, the target floor being the body's, not its).
    const staticChip = modes.querySelector<HTMLElement>('[data-testid="static"]')!;
    if (staticChip.querySelector(".rt-ds-token-body")?.tagName !== "SPAN")
      throw new Error("static body must be a <span>");
    if (staticChip.getAttribute("data-interactive") != null)
      throw new Error("a static chip must NOT carry data-interactive");
    // Clickable body is a real <button>; the container carries data-interactive.
    const clickable = modes.querySelector<HTMLElement>('[data-testid="clickable"]')!;
    if (clickable.querySelector(".rt-ds-token-body")?.tagName !== "BUTTON")
      throw new Error("clickable body must be a real <button>");
    if (clickable.getAttribute("data-interactive") !== "")
      throw new Error("a clickable chip must carry data-interactive");
    // Link body is a real <a href>; NO button nested in the anchor; the ✕ is a SIBLING of the <a>.
    const link = modes.querySelector<HTMLElement>('[data-testid="link"]')!;
    const anchor = link.querySelector<HTMLAnchorElement>("a.rt-ds-token-body");
    if (!anchor || anchor.tagName !== "A") throw new Error("link body must be a real <a>");
    if (anchor.querySelector("button")) throw new Error("the link body must NOT nest the remove button (no button-in-anchor)");
    const removeInLink = link.querySelector<HTMLButtonElement>("button.rt-IconButton");
    if (!removeInLink || removeInLink.parentElement !== anchor.parentElement)
      throw new Error("the remove ✕ must be a SIBLING of the <a> (same parent), not inside it");
    // Exactly TWO focusables in a clickable+removable chip, neither nested inside the other.
    const f = focusables(clickable);
    if (f.length !== 2) throw new Error(`a clickable+removable chip must have exactly 2 focusables; got ${f.length}`);
    if (f[0].contains(f[1]) || f[1].contains(f[0])) throw new Error("the two focusables must not be nested");
    // The focus ring is HOISTED to the container via :has(...:focus-visible) → outline-color longhand, the
    // [[focus-ring]] ring's base layer. The exact var is matched, since --ds-stroke-focus-stack shares its prefix.
    const ringHoisted = Array.from(document.styleSheets).some((sheet) => {
      let rules: CSSRuleList;
      try { rules = sheet.cssRules; } catch { return false; }
      return Array.from(rules).some(
        (r) =>
          r instanceof CSSStyleRule &&
          /\.rt-ds-token\[data-interactive\][^,{]*:has\([^)]*:focus-visible/.test(r.selectorText) &&
          /var\(\s*--ds-stroke-focus\s*[,)]/.test(r.style.outlineColor),
      );
    });
    if (!ringHoisted) throw new Error("the container focus ring is not hoisted via :has(.rt-ds-token-body:focus-visible) with the --ds-stroke-focus outline-color");
  },
};

/* ---- Usage — scenarios, then the closing live token spec ----------------- */
export const Usage: Story = {
  // The DO/DON'T word (success/error step-11 ink on its own tint) measures 4.10 at 12px bold, under axe's
  // 4.5; the colour + the word already carry the meaning, so that row is the documented exception. Scoped
  // to the label itself — the cards' specimens stay fully axe-checked, which "[data-dodont]" did not do.
  parameters: { a11y: { context: { exclude: [DODONT_LABEL] } } },
  render: (_args, { globals }) => (
    <DemoNav>
    <Page>
      <PageHeader title="Token · Usage" standfirst={DEFINITION} />

      <ComparisonSection comparison={CHIPS_COMPARISON} highlight="Token" />

      <Rule />

      <Section title="Token or Badge — pick by whether the chip does something" lead="A chip that only labels is a Badge. A chip you click (a filter you toggle, a tag that navigates, a selection you remove-and-act-on) is a Token.">
        <Grid columns={{ initial: "1", sm: "2" }} gapX="6" gapY="5">
          <Scenario label="TOKEN — REMOVABLE FILTER" caption="Applied filters you can click to edit AND dismiss — a clickable body plus a sibling ✕. This is the shape Badge can't express. These chips are live: try both controls.">
            <FilterTokens />
          </Scenario>
          <Scenario label="TOKEN — ENTITY LINK" caption="A tag or entity chip that navigates to its detail — a link body. No underline: the surface is the affordance. These hrefs are placeholders and this page swallows the jump, so clicking one stays put; in a product it navigates.">
            <Flex gap="2" wrap="wrap">
              <Token leadingIcon={<Hash weight="bold" />} href="#topic">design-system</Token>
              <Token leadingIcon={<User weight="bold" />} href="#user">priya</Token>
            </Flex>
          </Scenario>
        </Grid>
      </Section>

      <Rule />

      <Section title="A filter you toggle" lead={<>Give a clickable Token <Code>pressed</Code> and it becomes a toggle. A pressed chip takes the selected tint and strong ink at a bold weight, so the state never rests on colour alone, and a screen reader announces it as pressed. Each label holds its bold width at rest, so pressing a filter moves no chip in the row.</>}>
        <PressedFilterTokens />
        <Caption>Only a clickable Token takes <Code>pressed</Code>: with <Code>href</Code> or with no <Code>onClick</Code> it is a type error. Omit it on a Token that runs an action, so the body announces no state. A filter Token that is also removable gives one chip two jobs, so keep a toggle row free of ✕s where you can.</Caption>
      </Section>

      <Rule />

      <Section title="A removable selection" lead="Selected values the user can remove — the static token is pixel-identical to Badge's removable chip; reach for a clickable Token only when the body itself should act.">
        <SelectionTokens />
        <Caption>These are <strong>static</strong> tokens (span body): removal via the ✕ only, one tab stop each — the same shape as Badge's chip. A future <Code>Tokenizer</Code> composes tokens like these into a single roving-focus field.</Caption>
      </Section>

      <Rule />

      <Section title="A Token is not a Button" lead="The pill shape and small size keep a token a secondary, in-context control — a filter or a tag, never a page's primary action.">
        <Grid columns={{ initial: "1", sm: "2" }} gap="3">
          <DoDont kind="do" bare note="An interactive token stays a compact, secondary chip — its bounded surface and hover-deepen read as 'clickable' without shouting.">
            <Flex gap="2" data-size-lesson="the chip's remove ✕ holds step 1 — it garnishes the chip, it doesn't join the ambient row"><Token leadingIcon={<Funnel weight="bold" />} onClick={() => {}} onRemove={() => {}}>Owner: me</Token></Flex>
          </DoDont>
          <DoDont kind="dont" bare note="A static chip wired to look clickable but with no real control is a lie — if the body does nothing, it's a Badge. Never fake the affordance.">
            <Flex gap="2"><Badge color="gray">Looks clickable, isn't</Badge></Flex>
          </DoDont>
        </Grid>
        <Caption>Set <Code>color</Code> for a categorical hue; there is <strong>no <Code>tone</Code></strong> — a token carries no destructive valence (the danger tone stays a button/menu concern).</Caption>
      </Section>

      <Rule />

      {/* The closing reference section. The provider is what makes the table live: every measured row
          re-reads its value when this key changes, so an accent/appearance flip re-resolves the spec. */}
      <HexThemeKey.Provider value={`${globals.accent}-${globals.appearance}-${globals.contrast}`}>
        <Section title="Tokens" lead="Read off a rendered chip and checked against the token each row names, so the table can disagree with the component — Token borrows Badge's skin wholesale, and its pressed paint is the one exception ([[token-pressed-state]]).">
          <TokenTokens />
        </Section>
      </HexThemeKey.Provider>
    </Page>
    </DemoNav>
  ),
  play: async ({ canvasElement }) => {
    // Passive: every interactive token's body is a REAL control (never a bare span+onClick), and every
    // removable token exposes a named ✕. The one driven step is the pressed filter row below, which
    // clicks one filter on and back off, so the page settles exactly as it rendered.
    const chips = Array.from(canvasElement.querySelectorAll<HTMLElement>(".rt-ds-token"));
    if (chips.length === 0) throw new Error("no tokens rendered");
    for (const chip of chips) {
      const interactive = chip.getAttribute("data-interactive") === "";
      if (interactive) {
        const body = chip.querySelector<HTMLElement>(".rt-ds-token-body");
        if (!body || (body.tagName !== "BUTTON" && body.tagName !== "A"))
          throw new Error("an interactive token body must be a real <button>/<a>, never a styled span");
      }
      const x = chip.querySelector<HTMLButtonElement>("button.rt-IconButton");
      if (x && !x.getAttribute("aria-label")?.startsWith("Remove"))
        throw new Error(`a remove ✕ must be named "Remove …"; got "${x.getAttribute("aria-label")}"`);
    }

    // The token table's EVIDENCE, asserted at runtime ([[measured-token-rows]]). The focus row reads the declaration the
    // component's own matched rule paints — :focus-visible needs a keyboard, which no script supplies.
    const rows = assertMeasuredRows(canvasElement);
    if (rows.measured !== 6 || rows.unproven !== 0) {
      throw new Error(`expected 6 measured / 0 unproven token rows, got ${rows.measured} / ${rows.unproven}`);
    }

    // [[token-pressed-state]]: a clickable Token WITHOUT `pressed` announces no toggle state at all. The
    // filter row and the pressed specimen in the token table are the only Tokens given `pressed`.
    const plain = chips.filter((c) => !c.closest('[data-testid="pressed-filters"]') && !c.hasAttribute("data-pressed-specimen"));
    const stray = plain.find((c) => c.querySelector(".rt-ds-token-body")?.hasAttribute("aria-pressed"));
    if (stray) throw new Error(`a Token given no \`pressed\` must render no aria-pressed ("${stray.textContent}")`);

    // Each filter body is a toggle: aria-pressed is "true" or "false", and no state draws a glyph. A label
    // is read through the visible text, since the body also holds an aria-hidden copy that reserves its width.
    const group = canvasElement.querySelector<HTMLElement>('[data-testid="pressed-filters"]')!;
    const bodies = Array.from(group.querySelectorAll<HTMLButtonElement>("button.rt-ds-token-body"));
    const labelOf = (b: HTMLElement) => {
      const copy = b.cloneNode(true) as HTMLElement;
      copy.querySelectorAll("[aria-hidden]").forEach((n) => n.remove());
      return copy.textContent ?? "";
    };
    for (const b of bodies) {
      const state = b.getAttribute("aria-pressed");
      if (state !== "true" && state !== "false") throw new Error(`a filter Token must carry aria-pressed; got ${state}`);
      if (b.querySelector("svg")) throw new Error(`"${labelOf(b)}": a filter Token draws no glyph in either state`);
    }

    // Every chip in the row keeps its edges when one filter is pressed and released, so a press moves no tag.
    const filterChips = Array.from(group.querySelectorAll<HTMLElement>(".rt-ds-token"));
    const edges = () => filterChips.map((c) => { const r = c.getBoundingClientRect(); return [r.left, r.top, r.width]; });
    const assertEdges = (rest: number[][], when: string) => {
      const now = edges();
      now.forEach((e, i) => {
        if (e.some((v, k) => Math.abs(v - rest[i][k]) > 0.01))
          throw new Error(`"${labelOf(filterChips[i])}" moved ${when}: [${rest[i].join(", ")}] became [${e.join(", ")}]`);
      });
    };
    const atRest = edges();

    // Click a filter that is off: aria-pressed flips to "true" and the container paints the pressed rule.
    // Each value is read off the chip and compared with the role resolved on a probe in the same theme, so a
    // pressed rule that loses the cascade fails here.
    const target = bodies.find((b) => b.getAttribute("aria-pressed") === "false");
    if (!target) throw new Error("the filter row must render a filter that is off");
    target.click();
    await waitFor(() => target.getAttribute("aria-pressed") === "true");
    assertEdges(atRest, `when "${labelOf(target)}" was pressed`);
    const probe = document.createElement("span");
    probe.style.backgroundColor = "var(--ds-fill-selected-subtle)";
    probe.style.color = "var(--ds-text-strong)";
    probe.style.fontWeight = "var(--ds-font-weight-strong)";
    group.append(probe);
    const want = getComputedStyle(probe);
    const got = getComputedStyle(target.closest<HTMLElement>(".rt-ds-token")!);
    const paint = { fill: [got.backgroundColor, want.backgroundColor], ink: [got.color, want.color], weight: [got.fontWeight, want.fontWeight] };
    probe.remove();
    for (const [what, [have, expected]] of Object.entries(paint))
      if (have !== expected) throw new Error(`pressed Token ${what}: got ${have}, the role resolves to ${expected}`);
    target.click();
    await waitFor(() => target.getAttribute("aria-pressed") === "false");
    assertEdges(atRest, `when "${labelOf(target)}" was released`);
  },
};

/* ---- Props ---------------------------------------------------------- */
const ICON_OPTIONS = ["none", "tag", "hash", "user", "check", "funnel"] as const;
type IconKey = (typeof ICON_OPTIONS)[number];
const ICON_MAP: Record<IconKey, ReactNode> = {
  none: undefined,
  tag: <Tag weight="bold" />,
  hash: <Hash weight="bold" />,
  user: <User weight="bold" />,
  check: <Check weight="bold" />,
  funnel: <Funnel weight="bold" />,
};

const PROPS: PropDef[] = [
  { name: "children / label", type: "ReactNode / string", desc: <>The chip content (the visible label + its accessible name). Use one or the other.</>, source: "Token.tsx" },
  { name: "onClick", type: "(e) => void", desc: <>Makes the body a clickable <Code>&lt;button&gt;</Code>. Mutually exclusive with <Code>href</Code>.</>, source: "Token.tsx" },
  { name: "href", type: "string", desc: <>Makes the body a navigational <Code>&lt;a&gt;</Code>. Mutually exclusive with <Code>onClick</Code>.</>, source: "Token.tsx" },
  { name: "pressed", type: "boolean", desc: <>Only with <Code>onClick</Code> (a type error with <Code>href</Code> or alone). Makes the body a toggle: it renders <Code>aria-pressed</Code>, and while <Code>true</Code> the chip takes the selected tint and strong ink at weight 600, with no glyph. The label holds its bold width in both states, so the chip keeps one width. Omit it for a plain action, which then announces no state.</>, source: "Token.tsx" },
  { name: "onRemove", type: "(e) => void", desc: <>Adds a trailing inset ✕ (a 24×24 target). Removes on click/Enter/Space, and on Backspace/Delete while the body is focused.</>, source: "Token.tsx" },
  { name: "removeLabel", type: "string", def: "Remove {label}", desc: <>Accessible name for the ✕ when the label isn't a plain string.</>, source: "Token.tsx" },
  { name: "color", type: "RadixColor", desc: <>Categorical hue (Badge's palette). There is <strong>no <Code>tone</Code></strong> — a token carries no destructive valence.</>, source: "Token.tsx" },
  { name: "leadingIcon", type: "ReactNode", desc: <>Optional glyph before the label (fixed-width, <Code>aria-hidden</Code>).</>, source: "Token.tsx" },
  { name: "size", type: `"1" | "2" | "3" | "inherit"`, desc: <>Unset → the global <Code>uiSize</Code> text lane (default <Code>small</Code> → <Code>1</Code>).</>, source: "Token.tsx" },
  { name: "disabled", type: "boolean", desc: <>Disables the body AND the ✕; dims via Radix's own disabled skin.</>, source: "Token.tsx" },
];

type PropsArgs = {
  mode: "static" | "clickable" | "link";
  label: string;
  color: "none" | "gray" | "blue" | "green" | "red" | "purple";
  leadIcon: IconKey;
  removable: boolean;
  disabled: boolean;
  pressed: "omitted" | "false" | "true";
  size: "auto" | "1" | "2" | "3" | "inherit";
  onClick: () => void;
  onRemove: () => void;
};

export const Props: StoryObj<PropsArgs> = {
  args: {
    mode: "clickable",
    label: "Design",
    color: "none",
    leadIcon: "tag",
    removable: true,
    disabled: false,
    pressed: "omitted",
    size: "auto",
  },
  argTypes: {
    mode: { control: "inline-radio", options: ["static", "clickable", "link"], description: "static → span body · clickable → button (onClick) · link → anchor (href).", table: { category: "Behavior" } },
    label: { control: "text", description: "The visible label (also the accessible name).", table: { category: "Content" } },
    color: { control: "inline-radio", options: ["none", "gray", "blue", "green", "red", "purple"], description: "Categorical hue (there is no tone axis).", table: { category: "Variant" } },
    leadIcon: { name: "leading icon", control: "select", options: ICON_OPTIONS, table: { category: "Content" } },
    removable: { control: "boolean", description: "Adds the trailing ✕ (a sibling of the body).", table: { category: "Content" } },
    disabled: { control: "boolean", description: "Disable the body AND the ✕.", table: { category: "State" } },
    pressed: { control: "inline-radio", options: ["omitted", "false", "true"], description: "Clickable mode only: omitted → no aria-pressed · false/true → a toggle (true shows the pressed paint, and both states keep the bold label width).", table: { category: "State" } },
    size: { control: "inline-radio", options: ["auto", "1", "2", "3", "inherit"], description: '"auto" tracks the global uiSize toolbar (unset → the text lane); a step pins the chip; "inherit" opts out (Radix default).', table: { category: "Variant" } },
    onClick: { action: "clicked", table: { category: "Events" } },
    onRemove: { action: "removed", table: { category: "Events" } },
  },
  parameters: { controls: { disable: false } },
  render: ({ mode, label, color, leadIcon, removable, disabled, size, pressed, onClick, onRemove }: PropsArgs) => {
    const lead = ICON_MAP[leadIcon];
    // `href` and `onClick` are the XOR discriminant, so pass exactly one at each render site.
    const common = {
      ...(color !== "none" ? { color } : {}),
      leadingIcon: lead,
      disabled,
      size: size === "auto" ? undefined : size,
      ...(removable ? { onRemove } : {}),
    } as const;
    return (
      <DemoNav>
        <Page maxWidth="none">
          <PageHeader title="Token · Props" standfirst={<>{DEFINITION} In <Code>link</Code> mode below the href is a placeholder and this page swallows the jump — the events still land in the <strong>Actions</strong> panel.</>} />
          <Box style={{ padding: "8px 0 2px" }}>
            {mode === "link" ? (
              <Token href="#playground" {...common}>{label}</Token>
            ) : mode === "clickable" ? (
              <Token onClick={onClick} pressed={pressed === "omitted" ? undefined : pressed === "true"} {...common}>{label}</Token>
            ) : (
              <Token {...common}>{label}</Token>
            )}
          </Box>
          <PropsLead />
          <Rule />
          <Section title="Props reference" lead={<>Every prop <Code>Token</Code> adds.</>}>
            <PropTable rows={PROPS} />
          </Section>
        </Page>
      </DemoNav>
    );
  },
};

/* ---- History ------------------------------------------------------------- */
export const History: Story = {
  render: () => (
    <Page>
      <PageHeader title="Token · History" standfirst={DEFINITION} />

      <Section title="Decisions" lead="The rulings this component encodes.">
        <Flex direction="column" gap="3">
          <Decision id="[[token-chip]] · The Badge/Token boundary">
            Token is the <strong>interactive sibling of Badge</strong>. The boundary test: <em>does the body do
            something?</em> <strong>Yes → Token</strong> (clicks / navigates), <strong>No → Badge</strong>
            (labels only). Token covers the one case Badge <strong>structurally forbids</strong> — an interactive
            body coexisting with a remove ✕ (a ✕ nested in a clickable <Code>&lt;button&gt;</Code>/<Code>&lt;a&gt;</Code> is invalid HTML).
          </Decision>
          <Decision id="[[token-chip]] · reuse">
            Token <strong>reskins nothing</strong>. Its container <em>is</em> a <Code>.rt-Badge</Code> (surface
            variant + categorical <Code>color</Code>), so Badge's chip skin, the <Code>[data-interactive]</Code>
            paint (hover/press gradient, the [[focus-ring]] focus ring), and the inset ✕'s ghost skin all apply
            <strong> verbatim</strong>. What Token adds on top is <em>geometry, never paint</em>: the body and
            the ✕ each grow to the 24×24 pointer-target floor and hand the growth straight back as an equal
            negative margin, so the chip still renders pixel-for-pixel as a Badge does. Pressed paint is the one
            exception: a toggle given <Code>pressed</Code> takes the look the system gives every pressed toggle,
            the selected tint under strong ink at weight 600 ([[token-pressed-state]]).
            The <strong>only net-new</strong> is the invisible-button body — a container
            span + an <Code>all:unset</Code> body + a <strong>sibling</strong> ✕ + the focus ring hoisted via
            <Code>:has(:focus-visible)</Code> + <Code>stopPropagation</Code>. <strong>Zero net-new tokens.</strong>
          </Decision>
          <Decision id="[[token-chip]] · sibling-remove">
            The remove ✕ is a <strong>real sibling button</strong> of the body — never nested inside the
            <Code>&lt;a&gt;</Code> or <Code>&lt;button&gt;</Code> (a ✕ nested inside an interactive
            <Code>&lt;a&gt;</Code>/<Code>&lt;button&gt;</Code> is invalid HTML). It sits beside the body in
            <strong> every</strong> mode, so removal coexists with a link cleanly.
          </Decision>
          <Decision id="[[token-chip]] · three modes">
            <Code>href</Code> → a <strong>link</strong> body (<Code>&lt;a&gt;</Code>); <Code>onClick</Code> → a
            <strong> clickable</strong> body (<Code>&lt;button&gt;</Code>); neither → a <strong>static</strong> body
            (<Code>&lt;span&gt;</Code>, pixel-identical to Badge's removable chip). Link and clickable are
            <strong> visually identical</strong> — no underline, no split; only the semantics differ. Keyboard
            removal: the ✕ removes on Enter/Space; <strong>Backspace/Delete on the focused body</strong> removes too.
          </Decision>
          <Decision id="[[token-chip]] · no tone axis">
            <strong>No <Code>tone</Code> axis.</strong> The danger tone is a destructive-<em>action</em> ban, not a
            chip concern — a Token's semantics ride the categorical <Code>color</Code>. Roving single-tab-stop is a
            container concern for the future <Code>Tokenizer</Code>; a bare removable-interactive Token is 2 tab stops.
          </Decision>
          <Decision id="[[token-pressed-state]] · Pressed filter chips">
            A clickable Token takes <Code>pressed</Code> and becomes a <strong>toggle</strong>: the body{" "}
            <Code>&lt;button&gt;</Code> carries <Code>aria-pressed</Code>, so a screen reader announces it as
            pressed, and the attribute is absent when the prop is omitted. <Code>pressed</Code> with{" "}
            <Code>href</Code> or without <Code>onClick</Code> is a type error. A pressed chip paints the pressed
            look the system already gives a toggle, <Code>--ds-fill-selected-subtle</Code> under{" "}
            <Code>--ds-text-strong</Code> at weight 600, and shows <strong>no glyph</strong>. The bolder label
            is the cue beside colour, the way the system's toggle button already works. The label holds its
            bold width at rest through a hidden copy, so pressing a filter moves no chip in the row, chosen on
            2026-10-01 over a check mark that widened the chip ([[token-pressed-state]]). The fill stays put
            on hover, the focus ring is unchanged, a disabled pressed chip keeps the disabled dim, and forced
            colours paint it Highlight under HighlightText, with the 1px edge every Token toggle keeps there
            ([[forced-colours]]).
          </Decision>
        </Flex>
      </Section>
      <Rule />
      <Section title="Changelog" lead="Notable changes, newest first — grows as the component evolves.">
        <Flex direction="column" gap="3">
          <Decision id="0.9.0">
            <Code>pressed</Code> makes a clickable Token a toggle ([[token-pressed-state]]). The body{" "}
            <Code>&lt;button&gt;</Code> carries <Code>aria-pressed</Code>, and a pressed chip takes the selected
            tint under strong ink at weight 600, with no glyph, and its label holds its bold width at rest, so a
            press moves no chip beside it. Under forced colours a pressed chip paints Highlight under
            HighlightText, and every Token toggle keeps a 1px ButtonBorder edge.
          </Decision>
          <Decision id="0.9.0">
            Initial <Code>System/Token</Code> — the interactive chip: a container that reuses Badge's surface
            skin + <Code>[data-interactive]</Code> paint + the inset ✕'s skin verbatim, the net-new
            <Code>all:unset</Code> invisible-button body + sibling ✕ + the <Code>:has(:focus-visible)</Code> ring
            hoist; both hit targets grown to the 24×24 floor on a cancelling negative margin (paint unchanged);
            three modes; Backspace/Delete removal; no tone. Token spec reads live where it borrows Badge's skin.
          </Decision>
        </Flex>
      </Section>
    </Page>
  ),
};
