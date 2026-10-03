import { useEffect, useRef, useState, type ReactNode, type RefObject } from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { Box, Code, Flex, Grid, Text } from "@radix-ui/themes";
import { X, Star } from "@phosphor-icons/react";
import { VisuallyHidden } from "./VisuallyHidden";
import { Button } from "./Button";
import { IconButton } from "./IconButton";
import {
  Caption, Decision, DoDont, DODONT_LABEL, LiteTokenSpec, Mono, NoteRow, Page, PageHeader, PropsLead,
  type PropDef, PropTable, Rule, Scenario, Section,
} from "./_storyKit";

/** The component's definition — one source, referenced by the header of every story on this page. */
const DEFINITION = <>VisuallyHidden holds text in the accessibility tree while taking it out of the visual layout — the one thing <Code>display: none</Code> and <Code>visibility: hidden</Code> cannot do, because they hide it from everyone. Some things have to be said without being shown: a close button that is only an ✕, a rating that is only stars, where a screen reader otherwise finds nothing to read.</>;

/* VisuallyHidden is pure a11y plumbing — it declares no --ds-* paint roles and rides no size lane, so its
   Tokens section says so outright (and reads the clip geometry it DOES own live off the DOM) rather than
   being dropped. The page's job is to make the WHY legible to someone who has never used a screen reader:
   the three ways to take text off the screen are rendered side by side and MEASURED, so the reader can see
   for themselves that display:none and visibility:hidden also delete the text from the accessibility tree
   while the clip keeps it — and the announcement reveal prints the exact strings, read off the specimens,
   that assistive tech would read out. Nothing on this page asks to be taken on trust. */

/* The text an assistive technology would announce for `el`: its rendered text with the branches an AT
   never reaches removed — anything aria-hidden, display:none, or visibility:hidden. That is the text half
   of the accessible-name computation, and it is exactly what an icon-only button leans on. (An explicit
   aria-label would win over all of it; none of the specimens here use one, which is the point.) */
function announcedText(el: Element): string {
  let out = "";
  for (const node of Array.from(el.childNodes)) {
    if (node.nodeType === Node.TEXT_NODE) {
      out += node.textContent ?? "";
      continue;
    }
    if (!(node instanceof HTMLElement)) continue;
    if (node.getAttribute("aria-hidden") === "true") continue;
    const cs = getComputedStyle(node);
    if (cs.display === "none" || cs.visibility === "hidden") continue;
    out += announcedText(node);
  }
  return out.replace(/\s+/g, " ").trim();
}

/* Read-out row for a rating: five star glyphs (aria-hidden decoration) with the real meaning carried by a
   VisuallyHidden phrase — the textbook "announce the context the layout conveys visually" case. Sighted
   users read the stars; a screen reader hears the sentence. */
function StarRating({ value, of }: { value: number; of: number }) {
  return (
    <Flex align="center" gap="1">
      <Flex align="center" gap="1" aria-hidden>
        {Array.from({ length: of }, (_, i) => (
          <Star
            key={i}
            weight={i < value ? "fill" : "regular"}
            size={18}
            color={i < value ? "var(--ds-text-link)" : "var(--ds-text-weak)"}
          />
        ))}
      </Flex>
      <VisuallyHidden data-testid="vh-rating-label" data-vh-announce="Star rating">{`Rated ${value} out of ${of} stars`}</VisuallyHidden>
    </Flex>
  );
}

/* ---- 1. the problem, measured -------------------------------------------------
   The same sentence taken off the screen three different ways. Each card shows the SAME content twice, on
   the two channels the page is actually about: what a sighted reader sees, and what a screen reader reads.
   Everything on both sides is read off the rendered element — the box from getBoundingClientRect, the
   verdict from the element's own resolved display/visibility (the two properties that, by definition, drop
   a node from the tree), and the transcript from announcedText() walking the specimen itself.

   WHY THE TRANSCRIPT IS THE POINT OF THE CARD. The first and third specimens are visually IDENTICAL — the
   text is simply gone from both — and they are the two that differ on the only axis this page is about.
   Without a second channel rendered, the whole subject sits in a verdict line the reader has to take on
   trust. With it, the difference is a string you can read: cards 1 and 2 both announce "Done. Undo?", card
   3 announces the sentence in between. That is also why all three stay: display:none is the technique
   people actually reach for, and "you cannot tell these two apart by looking, but a screen reader can" is
   the lesson — which needs both twins on the page to land. */
const SAMPLE = "3 files moved to Archive";

/* The micro-label above each channel — the same treatment Scenario uses for its label, so the two boxes
   read as a labelled pair rather than as two unrelated frames. */
function ChannelLabel({ children }: { children: ReactNode }) {
  return (
    <Text size="1" weight="bold" style={{ color: "var(--ds-text-weak)", letterSpacing: "0.06em" }}>
      {children}
    </Text>
  );
}

type Method = "none" | "visibility" | "clip";

const METHOD_LABEL: Record<Method, string> = {
  none: "display: none",
  visibility: "visibility: hidden",
  clip: "VisuallyHidden",
};

function HidingCard({ method, testId }: { method: Method; testId: string }) {
  const wrap = useRef<HTMLDivElement>(null);
  const [read, setRead] = useState<{ w: number; h: number; announced: boolean; transcript: string } | null>(null);
  useEffect(() => {
    const el = wrap.current?.querySelector<HTMLElement>("[data-probe]");
    if (!el) return;
    // Measured twice, not once: the reserved box depends on font metrics, and the webfont lands after
    // first paint, so a single read would print a width that no longer matches the box on screen. (A
    // ResizeObserver is no help here — the sample is an inline span, which it does not observe.)
    let live = true;
    const measure = () => {
      if (!live || !wrap.current) return;
      const r = el.getBoundingClientRect();
      const cs = getComputedStyle(el);
      setRead({
        w: Math.round(r.width * 10) / 10,
        h: Math.round(r.height * 10) / 10,
        announced: cs.display !== "none" && cs.visibility !== "hidden",
        // The transcript is COMPUTED from this card's own specimen, not written beside it: the same walk
        // the accessible-name computation does, dropping the branches an assistive technology never
        // reaches. Hand-typing these three strings would make the page's whole claim unfalsifiable.
        transcript: announcedText(wrap.current),
      });
    };
    measure();
    document.fonts?.ready.then(measure);
    return () => {
      live = false;
    };
  }, []);
  // Present → split so the recovered sentence can be marked in the transcript; absent → one plain run.
  const spoken = read ? read.transcript.split(SAMPLE) : null;
  const good = method === "clip";
  return (
    <Flex
      direction="column"
      gap="3"
      data-testid={testId}
      style={{
        padding: "var(--space-3)",
        borderRadius: "var(--ds-radius-3)",
        border: `1px solid ${good ? "var(--ds-stroke-accent-weak)" : "var(--ds-stroke-weak)"}`,
        // The accent EDGE marks the method that works; the surface stays the neutral --ds-bg-subtle for
        // every card. An accent-tinted fill here dropped the 12px bold success/error status line below
        // AA (measured 4.09 on --ds-fill-accent-weak) — the semantic colour needs the neutral surface.
        background: "var(--ds-bg-subtle)",
      }}
    >
      <Text size="1" weight="bold" style={{ color: "var(--ds-text-strong)", fontFamily: "var(--code-font-family)" }}>
        {METHOD_LABEL[method]}
      </Text>

      {/* CHANNEL 1 — the screen. The sentence, hidden that way, set BETWEEN two visible words so a
          reserved gap is visible. */}
      <Flex direction="column" gap="1">
        <ChannelLabel>ON SCREEN</ChannelLabel>
        <Box ref={wrap} style={{ padding: "var(--space-2)", borderRadius: "var(--ds-radius-2)", background: "var(--ds-bg-base)", border: "1px solid var(--ds-stroke-weak)" }}>
          <Text size="1" style={{ color: "var(--ds-text-strong)" }}>
            Done.{" "}
            {method === "none" ? (
              <span data-probe style={{ display: "none" }}>{SAMPLE}</span>
            ) : method === "visibility" ? (
              <span data-probe style={{ visibility: "hidden" }}>{SAMPLE}</span>
            ) : (
              <VisuallyHidden data-probe>{SAMPLE}</VisuallyHidden>
            )}{" "}
            Undo?
          </Text>
        </Box>
      </Flex>

      {/* CHANNEL 2 — the ear. The same specimen, transcribed: the invisible axis, made readable. Framed
          identically to the box above so the pair reads as one content shown two ways. */}
      <Flex direction="column" gap="1">
        <ChannelLabel>SCREEN READER READS</ChannelLabel>
        <Box
          data-testid={`${testId}-transcript`}
          style={{ padding: "var(--space-2)", borderRadius: "var(--ds-radius-2)", background: "var(--ds-bg-base)", border: "1px solid var(--ds-stroke-weak)" }}
        >
          <Text size="1" style={{ color: "var(--ds-text-strong)", fontFamily: "var(--code-font-family)" }}>
            {spoken === null ? (
              "…"
            ) : (
              <>
                “{spoken[0]}
                {spoken.length > 1 && (
                  /* The sentence the clip technique keeps. Marked with the accent tint so the one card
                     that recovers it is findable at a glance; the quoted string carries the meaning on
                     its own, so the tint is emphasis, never the only cue. */
                  <span style={{ background: "var(--ds-fill-accent-weak)", borderRadius: "var(--ds-radius-1)", padding: "0 2px" }}>{SAMPLE}</span>
                )}
                {spoken.length > 1 ? spoken[1] : ""}”
              </>
            )}
          </Text>
        </Box>
      </Flex>

      <Flex direction="column" gap="1">
        <Text size="1" style={{ color: "var(--ds-text-weak)", fontFamily: "var(--code-font-family)" }}>
          occupies {read ? `${read.w} × ${read.h}px` : "…"}
        </Text>
        {/* The ✓ / ✗ glyph carries the verdict, not colour: the semantic success/error roles are tuned for
            body text and land at ~4.45 at this 12px bold size — under AA — so the status line uses the
            strong text role and the glyph does the signalling (colour is never the only cue). */}
        <Text size="1" weight="bold" style={{ color: "var(--ds-text-strong)" }}>
          {read ? (read.announced ? "announced ✓" : "not announced ✗") : "…"}
        </Text>
      </Flex>
    </Flex>
  );
}

/* ---- 2. the accessible name, computed live ------------------------------------
   Two identical-looking icon buttons; one carries a hidden label, one doesn't. The name printed under
   each is COMPUTED from the rendered DOM (announcedText above), so the empty one is empty because the
   browser has nothing to announce — not because a caption says so. */
function NamedControl({ label, children, unnamed }: { label: string; children: ReactNode; unnamed?: boolean }) {
  const wrap = useRef<HTMLDivElement>(null);
  const [name, setName] = useState<string | null>(null);
  useEffect(() => {
    const btn = wrap.current?.querySelector("button");
    if (btn) setName(announcedText(btn));
  }, []);
  return (
    <Flex direction="column" gap="2" align="start" ref={wrap}>
      <Text size="1" weight="bold" style={{ color: "var(--ds-text-weak)", letterSpacing: "0.06em" }}>{label}</Text>
      {children}
      <Text size="1" style={{ color: "var(--ds-text-weak)", fontFamily: "var(--code-font-family)" }}>
        accessible name:{" "}
        <span style={{ color: name ? "var(--ds-text-success)" : "var(--ds-text-error)", fontWeight: 700 }}>
          {name === null ? "…" : name || "(empty)"}
        </span>
      </Text>
      {unnamed && (
        <Text size="1" style={{ color: "var(--ds-text-weak)", maxWidth: 220, lineHeight: 1.5 }}>
          A glyph is a picture. With nothing else in the button, there is nothing to read out — the control
          is unusable by voice or screen reader.
        </Text>
      )}
    </Flex>
  );
}

/* ---- 3. the announcement reveal ------------------------------------------------
   The demonstration a reader can check without ever installing a screen reader: press the button and
   every hidden string on the page is listed VERBATIM, read out of the rendered specimens by
   `data-vh-announce`. If a specimen's hidden text ever changed, this panel would change with it. */
function AnnouncementReveal({ scope }: { scope: RefObject<HTMLDivElement | null> }) {
  const [items, setItems] = useState<{ where: string; text: string }[] | null>(null);
  return (
    <Box style={{ borderRadius: "var(--ds-radius-4)", border: "1px solid var(--ds-stroke-weak)", background: "var(--ds-bg-subtle)", padding: "var(--space-4)" }}>
      <Flex direction="column" gap="3" align="start">
        <Button
          priority="secondary"
          data-testid="vh-reveal"
          onClick={() =>
            setItems(
              Array.from(scope.current?.querySelectorAll<HTMLElement>("[data-vh-announce]") ?? []).map((n) => ({
                where: n.dataset.vhAnnounce ?? "",
                text: n.textContent ?? "",
              })),
            )
          }
        >
          Show what a screen reader reads
        </Button>
        {items === null ? (
          <Text size="1" style={{ color: "var(--ds-text-weak)" }}>
            The specimens above look, to a sighted reader, like an icon and five stars. Press the button to
            see the text a screen reader gets instead — read straight off those same elements.
          </Text>
        ) : (
          <Flex direction="column" gap="2" style={{ width: "100%" }} data-testid="vh-reveal-list">
            {items.map((it) => (
              <Flex key={it.where} align="baseline" gap="3" style={{ paddingTop: "var(--space-2)", borderTop: "1px solid var(--ds-stroke-weak)" }}>
                <Text size="1" style={{ color: "var(--ds-text-weak)", width: 132, flexShrink: 0 }}>{it.where}</Text>
                <Text size="2" weight="bold" style={{ color: "var(--ds-text-strong)", fontFamily: "var(--code-font-family)" }}>“{it.text}”</Text>
              </Flex>
            ))}
          </Flex>
        )}
      </Flex>
    </Box>
  );
}

/* ---- 4. the skip link ---------------------------------------------------------
   The one pattern where a hidden element is INTERACTIVE, and the reason the clip technique exists at all:
   the link is out of the layout until it takes focus, then it surfaces. Story-scoped CSS because the
   reveal is a :focus state, which an inline style cannot express. Painted from the system roles. */
const SKIP_CSS = `
.ds-story-skip {
  position: absolute; top: 0; left: 0;
  width: 1px; height: 1px; overflow: hidden;
  clip: rect(0, 0, 0, 0); white-space: nowrap;
}
.ds-story-skip:focus {
  width: auto; height: auto; overflow: visible; clip: auto;
  display: inline-flex; align-items: center;
  padding: var(--space-2) var(--space-3);
  border-radius: var(--ds-radius-3);
  background: var(--ds-fill-accent); color: var(--on-accent);
  font-size: var(--font-size-1); font-weight: 700; text-decoration: none;
}`;

function SkipLinkDemo() {
  return (
    <Flex direction="column" gap="2">
      <style>{SKIP_CSS}</style>
      <Box
        style={{
          position: "relative",
          minHeight: 44,
          display: "flex",
          alignItems: "center",
          padding: "0 var(--space-3)",
          borderRadius: "var(--ds-radius-3)",
          border: "1px dashed var(--ds-stroke-weak)",
          background: "var(--ds-bg-subtle)",
        }}
      >
        {/* eslint-disable-next-line jsx-a11y/anchor-is-valid */}
        <a className="ds-story-skip" href="#vh-demo-main" data-testid="vh-skip">Skip to main content</a>
        <Text size="1" style={{ color: "var(--ds-text-weak)" }}>Click here, then press Tab — the link appears.</Text>
      </Box>
      <Box id="vh-demo-main" style={{ padding: "var(--space-2) var(--space-3)", borderRadius: "var(--ds-radius-3)", background: "var(--ds-bg-base)", border: "1px solid var(--ds-stroke-weak)" }}>
        <Text size="1" style={{ color: "var(--ds-text-weak)" }}>…the main content it jumps past the nav to.</Text>
      </Box>
    </Flex>
  );
}

/* The Tokens spec: an honest "nothing to paint", plus the geometry the clip DOES own, read live off a
   rendered instance so even the null result is measured rather than asserted. There is nothing here a
   measured token row could check — a measured row compares a painted property against a token, and this
   component paints none — so every row is prose, and says so. */
function VisuallyHiddenSpec() {
  const wrap = useRef<HTMLDivElement>(null);
  const [v, setV] = useState<{ box: string; position: string; clip: string; overflow: string } | null>(null);
  useEffect(() => {
    const el = wrap.current?.querySelector<HTMLElement>("[data-probe]");
    if (!el) return;
    const cs = getComputedStyle(el);
    const r = el.getBoundingClientRect();
    setV({
      box: `${Math.round(r.width)} × ${Math.round(r.height)}px`,
      position: cs.position,
      clip: cs.clip,
      overflow: cs.overflow,
    });
  }, []);
  return (
    <LiteTokenSpec
      rationale={
        <>
          Nothing to paint: VisuallyHidden declares <strong>no <Mono>--ds-*</Mono> roles</strong> and reuses
          no component's skin — it sets no fill, stroke, or text colour, so there is no swatch to show and
          no brand shift to follow. It rides no size lane either. The only CSS it owns is the clip box
          below, read off a rendered instance: geometry that takes the content out of the layout while
          leaving it in the accessibility tree.
        </>
      }
    >
      <div ref={wrap} style={{ position: "absolute", width: 0, height: 0, overflow: "hidden" }}>
        <VisuallyHidden data-probe>probe</VisuallyHidden>
      </div>
      {/* No measured rows here, and that is the finding rather than a gap: VisuallyHidden paints
          nothing, so there is no property on it that any token could be checked against. What it does
          own is geometry, and every row below is read off the rendered instance beside them. */}
      <NoteRow part="Paint roles" value="none — no fill, stroke, or text colour" />
      <NoteRow part="Rendered box" value={v ? `${v.box} — clipped, not collapsed` : "…"} />
      <NoteRow part="In the layout" value={v ? `position: ${v.position} — reserves no space` : "…"} />
      <NoteRow part="Clip" value={v ? `${v.clip} — overflow: ${v.overflow}` : "…"} />
    </LiteTokenSpec>
  );
}

const VH_PROPS: PropDef[] = [
  { name: "children", type: "ReactNode", desc: <>The content held in the accessibility tree but taken out of the visual layout — a screen reader still announces it. Keep it real, human-readable text; this is the whole point of the component.</>, source: "Radix" },
  { name: "asChild", type: "boolean", def: "false", desc: <>Merge the visually-hidden treatment onto the single child element instead of rendering a wrapping <Code>&lt;span&gt;</Code> — use it to hide a semantic node (a heading, a label, a link) without adding one to the tree.</>, source: "Radix" },
];

const meta: Meta<typeof VisuallyHidden> = {
  title: "Components/Content/VisuallyHidden",
  component: VisuallyHidden,
  parameters: {
    controls: { disable: true },
    docs: {
      description: {
        component:
          "**VisuallyHidden** takes its content out of the VISUAL layout while keeping it in the " +
          "accessibility tree — the announce-only, screen-reader-only pattern. That combination is the " +
          "whole point: `display: none` and `visibility: hidden` both delete the content from the " +
          "accessibility tree too, so they hide it from *everyone*. The element is clipped to a 1 × 1 box " +
          "instead, which reserves no space yet stays readable by assistive tech. Reach for it to name an " +
          "icon-only control, to front a focus-revealed skip link, or to voice context sighted users get " +
          "from layout alone. It carries no `--ds-*` overrides and no size lane — pure a11y plumbing, never " +
          "paint. The Usage story puts the three hiding techniques side by side on both channels — what is on " +
          "screen and, transcribed beside it, what a screen reader reads — with every string walked out of " +
          "the rendered specimen, so none of it has to be taken on faith.",
      },
    },
  },
};
export default meta;
type Story = StoryObj<typeof VisuallyHidden>;

/* The three real uses, sharing one root so the reveal panel can read the hidden strings back out of the
   very elements rendered above it (rather than from a list typed alongside them, which could drift). */
function UsesSection() {
  const scope = useRef<HTMLDivElement>(null);
  return (
    <Flex direction="column" gap="5" ref={scope}>
      <Grid columns={{ initial: "1", sm: "3" }} gapX="6" gapY="5">
        <Scenario
          label="NAME AN ICON-ONLY CONTROL"
          caption={<>The benefit: the button keeps its compact icon-only look AND gets a real name, so it is reachable by screen reader and by voice control (“click Close”).</>}
        >
          <Flex align="center" gap="3">
            <IconButton priority="secondary" data-testid="vh-close-button">
              <X size={16} />
              <VisuallyHidden data-testid="vh-close-label" data-vh-announce="Close button">Close</VisuallyHidden>
            </IconButton>
            <Text size="1" style={{ color: "var(--ds-text-weak)" }}>Dismiss this panel</Text>
          </Flex>
        </Scenario>

        <Scenario
          label="SKIP TO MAIN CONTENT"
          caption={<>The benefit: a keyboard user skips a long nav in one keystroke, and nobody else ever sees the link. This is the one case where hiding something INTERACTIVE is right — because focus brings it back.</>}
        >
          <SkipLinkDemo />
        </Scenario>

        <Scenario
          label="VOICE WHAT THE LAYOUT SAYS"
          caption={<>The benefit: the meaning a sighted reader gets from five glyphs at a glance reaches everyone else as a sentence, with no visual clutter added to carry it.</>}
        >
          <Flex align="center" gap="3">
            <StarRating value={4} of={5} />
            <Text size="1" style={{ color: "var(--ds-text-weak)" }}>Reviewer rating</Text>
          </Flex>
        </Scenario>
      </Grid>

      <AnnouncementReveal scope={scope} />
    </Flex>
  );
}

/** Usage — the primary lite docs story: the problem it solves (measured), the real uses, a
 *  verifiable announcement reveal, the honest token spec, and the do/don't. */
export const Usage: Story = {
  // Two scoped axe carve-outs, both deliberate:
  //  • DODONT_LABEL — the DO/DON'T word itself, step-11 ink on its own step-3 tint, 4.10 at 12px bold;
  //    the colour and the word already carry the meaning (the shared exception every DoDont page takes).
  //    Scoped to that row only — the specimens inside the cards are checked, unlike the old whole-card form.
  //  • [data-unnamed-demo] — this page deliberately renders ONE icon button with no accessible name,
  //    because showing the failure IS the lesson. axe is right about it; the specimen is the point.
  // Everything else on the page stays fully checked.
  parameters: { a11y: { context: { exclude: [DODONT_LABEL, "[data-unnamed-demo]"] } } },
  render: () => (
    <Page>
      <PageHeader title="VisuallyHidden · Usage" standfirst={DEFINITION} />

      <Section
        title="Why not just hide it?"
        lead="The same sentence taken off the screen three ways, each shown on both channels: what a sighted reader sees, and what a screen reader reads. The first and third look identical — that is exactly the problem — so the second box is where the difference lives. Every value is read off the rendered element: the transcript is walked out of the specimen itself, the box from its geometry, the verdict from its own resolved display / visibility."
      >
        <Grid columns={{ initial: "1", sm: "3" }} gap="4">
          <HidingCard method="none" testId="hide-none" />
          <HidingCard method="visibility" testId="hide-visibility" />
          <HidingCard method="clip" testId="hide-clip" />
        </Grid>
        <Caption>
          Read the second row across. <Code>display: none</Code> collapses to nothing and is dropped from
          the tree — the sentence is not in its transcript. <Code>visibility: hidden</Code> is the trap: it
          still <em>reserves</em> its box (you can see the gap it leaves on screen) and is <em>still</em>{" "}
          dropped from the tree, so you pay the layout cost and get the same transcript as the first card.
          VisuallyHidden clips to a 1 × 1 box that reserves nothing, and because the element is still
          rendered the sentence survives — the only transcript of the three that carries it. Cards 1 and 3
          are indistinguishable on screen and differ entirely in what is read: that is the whole component
          in one comparison.
        </Caption>
      </Section>

      <Rule />

      <Section
        title="What it buys you"
        lead="Three patterns you already know from real products, each with the benefit stated. The hidden text is invisible on screen — press the button underneath to read exactly what a screen reader gets instead."
      >
        <UsesSection />
      </Section>

      <Rule />

      <Section
        title="With and without, side by side"
        lead="The same icon button twice. The accessible name under each is computed from the rendered DOM — the empty one is empty because the browser genuinely has nothing to announce."
      >
        <Flex gap="8" wrap="wrap">
          <NamedControl label="WITH A HIDDEN LABEL">
            <IconButton priority="secondary" data-testid="vh-named">
              <X size={16} />
              <VisuallyHidden>Close</VisuallyHidden>
            </IconButton>
          </NamedControl>
          <NamedControl label="WITHOUT ONE" unnamed>
            <IconButton priority="secondary" data-unnamed-demo data-testid="vh-unnamed">
              <X size={16} />
            </IconButton>
          </NamedControl>
        </Flex>
        <Caption>
          Both buttons look identical and behave identically for a mouse. The difference is entirely in
          what the browser can hand to assistive tech — which is why this defect survives design review so
          easily, and why the fix is one hidden word.
        </Caption>
      </Section>

      <Rule />

      <Section title="What to hide, and what never to" lead="The test is simple: would a sighted user be worse off if this text appeared on screen? If yes, hide it. If they need it, show it.">
        <Grid columns={{ initial: "1", sm: "2" }} gap="3">
          <DoDont kind="do" bare note="Text that must be ANNOUNCED but not seen: a name for a visual-only control, or the meaning the layout already conveys to the eye. Keep it a real sentence — it is read aloud, not scanned.">
            <Flex direction="column" gap="2">
              <Flex align="center" gap="2">
                <IconButton priority="secondary"><X size={14} /><VisuallyHidden>Close</VisuallyHidden></IconButton>
                <Text size="1" style={{ color: "var(--ds-text-strong)" }}>named “Close”</Text>
              </Flex>
              <Flex align="center" gap="2">
                <StarRating value={4} of={5} />
                <Text size="1" style={{ color: "var(--ds-text-strong)" }}>reads “Rated 4 out of 5 stars”</Text>
              </Flex>
            </Flex>
          </DoDont>
          <DoDont kind="dont" bare note="Not a way to hide something people need to SEE — that is a conditional render. And not a parking space for controls: a permanently hidden button is a keyboard trap nobody can find. The only interactive exception is the focus-revealed pattern, like a skip link, which comes back the moment it is reached.">
            <Flex direction="column" gap="2">
              <Text size="1" style={{ color: "var(--ds-text-strong)" }}>
                A price, an error message, or a step count clipped out of view — sighted users simply lose it.
              </Text>
              <Text size="1" style={{ color: "var(--ds-text-strong)" }}>
                A hidden “Delete account” button that only a screen reader can reach.
              </Text>
            </Flex>
          </DoDont>
        </Grid>
      </Section>

      <Rule />

      <Section title="Tokens" lead="VisuallyHidden paints nothing — it declares no --ds-* roles and reuses no skin. What it does own is the clip geometry, read live off a rendered instance.">
        <VisuallyHiddenSpec />
      </Section>
    </Page>
  ),
  play: async ({ canvasElement }) => {
    // Passive (no driving / no flash): VisuallyHidden has no open/close behaviour, so its a11y contract is
    // asserted right here — the hidden text is PRESENT and NON-EMPTY (still in the tree) and is CLIPPED,
    // not display:none (so a screen reader still announces it). axe runs automatically on the story.
    const label = canvasElement.querySelector<HTMLElement>('[data-testid="vh-close-label"]');
    if (!label) throw new Error("Usage must render the visually-hidden Close label");

    // Present in the DOM with real text → still in the accessibility tree.
    if (!label.textContent || label.textContent.trim() === "") {
      throw new Error("a VisuallyHidden label must carry non-empty text so a screen reader can announce it");
    }

    // Clipped, NOT display:none — display:none would drop it from the a11y tree and defeat the purpose.
    const cs = getComputedStyle(label);
    if (cs.display === "none") {
      throw new Error(`a VisuallyHidden label must be clipped, not removed; got display:${cs.display}`);
    }

    // …and it really is out of the VISUAL layout — clipped to a ~1px box, not laid out at its text width.
    const rect = label.getBoundingClientRect();
    if (rect.width > 2 || rect.height > 2) {
      throw new Error(`a VisuallyHidden label must be clipped to a ~1px box; got ${Math.round(rect.width)}×${Math.round(rect.height)}`);
    }

    // The icon-only button takes its accessible name from the hidden label (its only text content).
    const button = canvasElement.querySelector<HTMLElement>('[data-testid="vh-close-button"]');
    if (!button || (button.textContent ?? "").trim() !== "Close") {
      throw new Error("the icon-only button must take its accessible name from the hidden “Close” label");
    }

    // The comparison the page is built on, asserted rather than illustrated: display:none collapses to
    // nothing, visibility:hidden STILL reserves its box (the surprise), and only the clipped one keeps a
    // rendered element that assistive tech can reach.
    const probe = (id: string) => {
      const card = canvasElement.querySelector<HTMLElement>(`[data-testid="${id}"]`);
      if (!card) throw new Error(`the comparison must render the ${id} card`);
      const el = card.querySelector<HTMLElement>("[data-probe]");
      if (!el) throw new Error(`${id} must render its hidden sample`);
      return { el, rect: el.getBoundingClientRect(), cs: getComputedStyle(el) };
    };
    const gone = probe("hide-none");
    const invisible = probe("hide-visibility");
    const clipped = probe("hide-clip");
    if (gone.rect.width !== 0 || gone.rect.height !== 0) {
      throw new Error(`display:none must occupy no box; got ${gone.rect.width}×${gone.rect.height}`);
    }
    if (invisible.rect.width <= 2) {
      throw new Error(`visibility:hidden must still RESERVE its box — that is the point of the card; got ${invisible.rect.width}px wide`);
    }
    if (clipped.cs.display === "none" || clipped.cs.visibility === "hidden") {
      throw new Error("the VisuallyHidden sample must stay in the accessibility tree (neither display:none nor visibility:hidden)");
    }
    if (clipped.rect.width > 2 || clipped.rect.height > 2) {
      throw new Error(`the VisuallyHidden sample must reserve no space; got ${clipped.rect.width}×${clipped.rect.height}`);
    }

    // The transcripts are what make that comparison legible, so they are asserted too — and asserted as
    // a DIFFERENCE, since a transcript that agreed with the wrong card would look perfectly plausible.
    // Cards 1 and 2 must read the same sentence WITHOUT the hidden phrase; card 3 must recover it.
    const transcript = (id: string) => {
      const el = canvasElement.querySelector<HTMLElement>(`[data-testid="${id}-transcript"]`);
      if (!el) throw new Error(`the ${id} card must render its screen-reader transcript`);
      return (el.textContent ?? "").trim();
    };
    const spokenNone = transcript("hide-none");
    const spokenInvisible = transcript("hide-visibility");
    const spokenClipped = transcript("hide-clip");
    if (spokenClipped.includes("…")) throw new Error("the transcripts must be computed from the specimens, not left pending");
    if (!spokenClipped.includes(SAMPLE)) {
      throw new Error(`the clipped sample must still be announced; transcript read ${spokenClipped}`);
    }
    if (spokenNone.includes(SAMPLE) || spokenInvisible.includes(SAMPLE)) {
      throw new Error("display:none and visibility:hidden must drop the sentence from the announcement");
    }
    if (spokenNone !== spokenInvisible) {
      throw new Error(`display:none and visibility:hidden must announce the SAME thing; got ${spokenNone} vs ${spokenInvisible}`);
    }
    if (spokenNone === spokenClipped) {
      throw new Error("the clipped card must announce something the other two do not — that is the page's argument");
    }

    // The side-by-side: one button has a name from its hidden label, the other genuinely has none — the
    // whole argument of the page. Compare their announceable text (the icons are aria-hidden).
    const named = canvasElement.querySelector<HTMLElement>('[data-testid="vh-named"]');
    const unnamed = canvasElement.querySelector<HTMLElement>('[data-testid="vh-unnamed"]');
    if (!named || !unnamed) throw new Error("the comparison must render both the named and the unnamed button");
    if (announcedText(named) !== "Close") throw new Error(`the named button must announce “Close”; got “${announcedText(named)}”`);
    if (announcedText(unnamed) !== "") throw new Error(`the unnamed button must have nothing to announce; got “${announcedText(unnamed)}”`);
  },
};

type PropsArgs = {
  children: string;
  hideLabel: boolean;
  asChild: boolean;
};

/** Props — the live, args-driven VisuallyHidden. Toggle whether the label is hidden; the DOM text
 *  stays either way, so the button keeps its accessible name while its VISUAL footprint changes. */
export const Props: StoryObj<PropsArgs> = {
  args: { children: "Close", hideLabel: true, asChild: false },
  argTypes: {
    children: { control: "text", description: "The content held in the accessibility tree but out of view.", table: { category: "Content" } },
    hideLabel: { control: "boolean", description: "Demo toggle — wrap the label in VisuallyHidden (announce-only, icon-only look) or show it visibly. Not a VisuallyHidden prop.", table: { category: "Demo" } },
    asChild: { control: "boolean", description: "Merge the hidden treatment onto the child span instead of rendering a wrapping span (same visual result, one fewer node).", table: { category: "Accessibility" } },
  },
  parameters: { controls: { disable: false } },
  render: ({ children, hideLabel, asChild }: PropsArgs) => (
    <Page maxWidth="none">
      <PageHeader title="VisuallyHidden · Props" standfirst={DEFINITION} />
      <Box style={{ padding: "16px 0 8px" }}>
        <Button priority="secondary">
          <X size={16} />
          {hideLabel ? (
            asChild ? (
              <VisuallyHidden asChild>
                <span>{children}</span>
              </VisuallyHidden>
            ) : (
              <VisuallyHidden>{children}</VisuallyHidden>
            )
          ) : (
            <span>{children}</span>
          )}
        </Button>
      </Box>
      <Caption>
        Toggle <strong>hideLabel</strong>: the button flips between icon-only and icon-plus-label, but the{" "}
        <Code>{children || "…"}</Code> text stays in the DOM either way — so the accessible name never
        changes.
      </Caption>
      <PropsLead />
      <Rule />
      <Section title="Props reference" lead={<>The props <Code>VisuallyHidden</Code> accepts — both pass through to Radix. Every other <Code>&lt;span&gt;</Code> attribute (<Code>id</Code>, <Code>aria-*</Code>, handlers) flows through untouched.</>}>
        <PropTable rows={VH_PROPS} />
      </Section>
    </Page>
  ),
};

/** History — the rulings this component encodes and a changelog of how it changes over time. */
export const History: Story = {
  render: () => (
    <Page>
      <PageHeader title="VisuallyHidden · History" standfirst={DEFINITION} />

      <Section title="Decisions" lead="The rulings this component encodes.">
        <Flex direction="column" gap="3">
          <Decision id="[[catalog-as-specification]] · Wrapped Radix component">
            VisuallyHidden is a <strong>wrapped</strong> Radix Themes primitive — the Radix name wins; built
            on the Radix substrate, not a hand-rolled clip utility. Because it is pure a11y plumbing there is
            nothing to override, so the wrap is a documented <Code>export</Code>, not a forwardRef shell.
          </Decision>
          <Decision id="Announce-only">
            The content is clipped to a 1px box (absolutely positioned, <Code>overflow: hidden</Code>,{" "}
            <Code>clip: rect(0,0,0,0)</Code>) rather than <Code>display: none</Code> — so it stays OUT of the
            visual layout but IN the accessibility tree, where a screen reader still announces it. Use it to
            name a visual-only control, or to voice context sighted users read from layout alone. It is not a
            way to hide content people need to <strong>see</strong> — that is a conditional-render job.
          </Decision>
          <Decision id="No paint, no size lane">
            VisuallyHidden declares no <Code>--ds-*</Code> roles and rides no size lane: it never sets a fill,
            stroke, or text colour, and it never sizes a control — it only removes content from view. So it
            owns no token spec; there is nothing to read live because it never paints.
          </Decision>
        </Flex>
      </Section>

      <Rule />

      <Section title="Changelog" lead="Notable changes, newest first — grows as the component evolves.">
        <Flex direction="column" gap="3">
          <Decision id="0.9.0">
            Initial <Code>System/VisuallyHidden</Code> — Radix VisuallyHidden surfaced as a documented
            re-export; the announce-only / screen-reader-only pattern (clipped, not <Code>display: none</Code>);
            no <Code>--ds-*</Code> overrides and no size lane (pure a11y plumbing); History page added so every
            component, stubs included, has one.
          </Decision>
        </Flex>
      </Section>
    </Page>
  ),
};
