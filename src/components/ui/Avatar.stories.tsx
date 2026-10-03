import { type ReactNode, useLayoutEffect, useRef, useState } from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { Box, Code, Flex, Grid, Text } from "@radix-ui/themes";
import { Buildings, Robot, User } from "@phosphor-icons/react";
import { Avatar, type AvatarStatus } from "./Avatar";
import { AvatarGroup } from "./AvatarGroup";
import { Badge } from "./Badge";
import { Button } from "./Button";
import { LinkProvider } from "./Link";
import { Timestamp } from "./Timestamp";
import TopNav from "./TopNav";
import type { AvatarSize } from "../../theme/SizeContext";
import { awaitMeasuredRows, themeRoot, parseColor, resolveColor } from "../../foundations/_assert";
import {
  AnatomyLegend, Caption, Decision, DemoLink, DoDont, DODONT_LABEL, dotStyle, HexThemeKey, hLine, MeasuredRow,
  MeasuredSpec, Muted, NoteRow, Page, PageHeader, PropsLead, type PropDef, PropTable, Rule, Scenario, Section,
  tick, TokenGroup,
} from "./_storyKit";

/** The one definition of this component — the standfirst every page of it opens with. */
const DEFINITION = (
  <>
    A person or entity's picture, initials, or fallback glyph, sized on the line-height ladder so it drops
    in beside text without vertical nudging. Locked to the <Code>soft</Code> variant and a circle by
    default — opt a rounded square for an org or a bot. It adds a presence dot and stacks into{" "}
    <Code>AvatarGroup</Code>.
  </>
);

// A self-contained portrait placeholder — an inline SVG data-URI, so the docs never depend on a
// network fetch (external avatar URLs like i.pravatar.cc / example.com don't load in Storybook under
// CSP/offline → a broken blob). A soft-tinted head-and-shoulders silhouette stands in for a real photo
// wherever a specimen must demonstrate the IMAGE slot (and its `alt`), not the initials fallback.
const PORTRAIT = `data:image/svg+xml,${encodeURIComponent(
  '<svg xmlns="http://www.w3.org/2000/svg" width="96" height="96" viewBox="0 0 96 96">' +
    // An illustrated portrait with actual features (hair, face, warm palette) — reads as "a photo of a
    // specific person", NOT a faceless stock silhouette (which would collide with the "a generic user
    // glyph is NOT an avatar" specimen). Still a self-contained data-URI (CSP-safe, no network).
    '<rect width="96" height="96" fill="#e7ddc9"/>' + // warm sand backdrop
    '<path d="M16 96c0-18 14-29 32-29s32 11 32 29z" fill="#5b7a99"/>' + // shoulders / dusty-blue top
    '<rect x="42" y="50" width="12" height="15" rx="6" fill="#e3ab84"/>' + // neck
    '<ellipse cx="48" cy="39" rx="18" ry="20" fill="#3f2d21"/>' + // hair (behind)
    '<ellipse cx="48" cy="44" rx="15" ry="16" fill="#f0c39c"/>' + // face
    '<circle cx="43" cy="43" r="1.7" fill="#3f2d21"/><circle cx="53" cy="43" r="1.7" fill="#3f2d21"/>' + // eyes
    '<path d="M44 50q4 3 8 0" stroke="#b3714f" stroke-width="1.5" fill="none" stroke-linecap="round"/>' + // smile
    "</svg>",
)}`;

const meta: Meta<typeof Avatar> = {
  title: "Components/Content/Avatar",
  component: Avatar,
  parameters: {
    controls: { disable: true },
    docs: {
      description: {
        component:
          "The system avatar renders on a **line-height size ladder** — the same idea as icons, where a " +
          "size is a text line box (xs 16 / sm 20 / md 24 / lg 30 / xl 40), so an avatar drops in beside " +
          "text without vertical nudging. It's locked to the **soft** variant (a tinted fill with legible " +
          "initials), a **circle** by default (opt a rounded-square for an entity/org/bot), and adds two " +
          "things Radix leaves out: a **presence dot** and **AvatarGroup** stacking.",
      },
    },
  },
};
export default meta;
type Story = StoryObj<typeof Avatar>;

// Rasterized-colour proximity check (P3-safe) — used by the Anatomy status-dot fold.
const near = (a: { r: number; g: number; b: number }, b: { r: number; g: number; b: number }) =>
  Math.abs(a.r - b.r) + Math.abs(a.g - b.g) + Math.abs(a.b - b.b) < 8;

// Status → accent-aware fill token, for the folded coloured-backdrop play below. offline =
// --ds-icon-neutral (an OPAQUE muted gray — it holds over an AvatarGroup overlap, where a translucent
// fill would bleed). The dot IS a StatusDot, so the colours are ITS accent-aware variants:
// online→success · busy→error · away→warning · offline→neutral (the muted absence gray).
const STATUS_TOKEN: Record<AvatarStatus, string> = {
  online: "--ds-fill-success", busy: "--ds-fill-error", away: "--ds-fill-warning", offline: "--ds-icon-neutral",
};

/* Live size probe — measures the rendered avatar box from the DOM (docs read values live). */
function LadderRow({ size }: { size: AvatarSize }) {
  const ref = useRef<HTMLDivElement>(null);
  const [px, setPx] = useState<number | null>(null);
  useLayoutEffect(() => {
    const el = ref.current?.querySelector(".rt-AvatarRoot") as HTMLElement | null;
    if (el) setPx(Math.round(el.getBoundingClientRect().width));
  }, []);
  const role: Record<AvatarSize, string> = { xs: "XS / caption", sm: "Small", md: "Medium body", lg: "H3 heading", xl: "H1 heading" };
  return (
    <Flex ref={ref} align="center" gap="4">
      <Avatar size={size} fallback="AL" />
      <Text as="p" size="2" style={{ color: "var(--ds-text-strong)" }}>
        The quick brown fox — <Code>{size}</Code> · {px ?? "—"}px · caps {role[size]}
      </Text>
    </Flex>
  );
}

const ANATOMY_PARTS: [number, string, string][] = [
  [1, "Ring / box", "the circular (or rounded-square) container — sized off the text line-height ladder (--ds-avatar-box → --avatar-size), so an avatar standing beside text matches the line it sits on. An AvatarGroup takes the taller portrait ramp instead (24 / 30 / 40) and gives every box a 2px bg-base ring so overlaps read"],
  [2, "Image", "an <img> (object-fit: cover) shown when src is set — it sits on top of the fallback"],
  [3, "Fallback", "initials (person) or a Phosphor icon (system/bot) shown when there's no image (or it fails to load)"],
  [4, "Status dot", "optional presence: the accent-aware fill with the StatusDot's 1px inset edge on it ([[status-dot-edges]]), a 2px bg-base cutout ring, and a hidden text label"],
];

/* ---- anatomy diagram (Avatar-specific) — one 40px specimen (a photo + a presence dot) centred in a
   frame, with numbered callout dots + leader lines pointing at the canonical parts. Mirrors Badge's
   AnatomyDiagram. The Image (2) and Fallback (3) share the content slot: the <img> renders on TOP of
   the fallback, so callout 3 points at that same region (the layer beneath the photo). */
function AvatarAnatomyDiagram() {
  return (
    <Box style={{ overflowX: "auto" }}>
      <Box style={{ position: "relative", width: "100%", minWidth: 340, maxWidth: 600, margin: "0 auto", height: 220, background: "var(--ds-bg-subtle)", borderRadius: "var(--ds-radius-4)", overflow: "hidden" }}>
        <Flex align="center" justify="center" style={{ position: "absolute", inset: 0 }}>
          {/* PINNED to `xl`, and the pin is load-bearing: every callout dot and leader line below is
              absolutely positioned against a 40px box centred at (50%, 50%) — `50% ± 20px`. Let this
              track the uiSize toolbar and the box moves to 16 / 20 / 24px while the leader lines stay
              where they are, and the diagram points at empty space. */}
          <Avatar size="xl" src={PORTRAIT} alt="" status="online" fallback="AL" />
        </Flex>
        {/* Callout positions are approximate — the specimen is a 40px box centred at (50%, 50%), its
            edges at 50%±20px and the status dot bottom-right. controller will measure+tune each. */}
        {/* 1 — Ring / box (leads in from the left to the box edge) */}
        <Box style={{ ...dotStyle, left: "calc(50% - 134px)", top: 100 }}>1</Box>{/* controller will measure+tune */}
        <Box style={hLine({ left: "calc(50% - 112px)", top: 110, width: 90 })} />{/* controller will measure+tune */}
        {/* 2 — Image (leads down from the top to the photo) */}
        <Box style={{ ...dotStyle, left: "50%", top: 26, transform: "translateX(-50%)" }}>2</Box>{/* controller will measure+tune */}
        <Box style={tick({ left: "50%", top: 46, height: 42 })} />{/* controller will measure+tune */}
        {/* 3 — Fallback (leads in from the right to the content slot beneath the image) */}
        <Box style={{ ...dotStyle, left: "calc(50% + 116px)", top: 100 }}>3</Box>{/* controller will measure+tune */}
        <Box style={hLine({ left: "calc(50% + 22px)", top: 110, width: 90 })} />{/* controller will measure+tune */}
        {/* 4 — Status / presence dot (leads down to the bottom-right dot) */}
        <Box style={{ ...dotStyle, left: "calc(50% + 4px)", top: 176 }}>4</Box>{/* controller will measure+tune */}
        <Box style={tick({ left: "calc(50% + 14px)", top: 130, height: 44 })} />{/* controller will measure+tune */}
      </Box>
    </Box>
  );
}

/* The presence dot's four colours and its cutout ring, read off a REAL rendered avatar. The row that
   this replaces painted its own 14px disc from the very token it then named, so it agreed by
   construction and could never disagree with the component. Each row below names an element inside a
   live instance and a property, reads that property, and checks it against the token it claims. */
function StatusDotSpec() {
  return (
    <MeasuredSpec
      render={() => (
        <Flex align="center" gap="4">
          {/* PINNED, and the pin is the point: this is the measured twin of the visible Status
              specimen below, so the two have to stand on the SAME rung or the table stops describing
              what the reader is looking at. `lg` is that rung. */}
          {(["online", "busy", "away", "offline"] as AvatarStatus[]).map((st) => (
            <Avatar key={st} size="lg" status={st} fallback="AL" />
          ))}
        </Flex>
      )}
    >
      <MeasuredRow part="Online" note="Here and reachable." token="--ds-fill-success" select='.rt-ds-avatar-status[data-variant="success"]' prop="background-color" />
      <MeasuredRow part="Busy" note="Signed in, but not to be interrupted." token="--ds-fill-error" select='.rt-ds-avatar-status[data-variant="error"]' prop="background-color" />
      <MeasuredRow part="Away" note="Signed in, away from the desk." token="--ds-fill-warning" select='.rt-ds-avatar-status[data-variant="warning"]' prop="background-color" />
      <MeasuredRow part="Offline" note="The absence gray — OPAQUE, so it holds over an AvatarGroup overlap where a translucent fill would let the disc behind it bleed through." token="--ds-icon-neutral" select='.rt-ds-avatar-status[data-variant="neutral"]' prop="background-color" />
      <MeasuredRow part="Cutout ring" note="The 2px band that punches the dot off the avatar's own edge — and off whatever the avatar is sitting on." token="--ds-bg-base" select=".rt-ds-avatar-status" prop="border-top-color" />
    </MeasuredSpec>
  );
}
/** Rows in `StatusDotSpec` — the exact count the Usage play asserts have measured. */
const SPEC_ROWS = 5;

export const Anatomy: Story = {
  render: (_args, { globals }) => (
    <HexThemeKey.Provider value={`${globals.accent}-${globals.appearance}-${globals.contrast}`}>
      <Page>
        <PageHeader title="Avatar · Anatomy" standfirst={DEFINITION} />
        <Section title="Anatomy" lead="The avatar and its parts — a photo (or an initials/icon fallback), an optional presence dot, inside a circular box. Sizes are a line-height ladder — each box caps the line box of the text role it pairs with.">
          <AvatarAnatomyDiagram />
          <AnatomyLegend parts={ANATOMY_PARTS} />
          <Caption>The specimen shows a photo with a presence dot; without a <Code>src</Code> the same box shows the <Code>fallback</Code> (initials or an icon). A standalone avatar has no ring — the 2px <Code>--ds-bg-base</Code> ring is added only in an <Code>AvatarGroup</Code> so overlaps read.</Caption>
        </Section>

        <Rule />

        <Section title="Size ladder" lead="Each size is a text line-height — an avatar drops in beside that text with no vertical nudge. Read the px live from the rendered box.">
          <Flex direction="column" gap="3">
            {(["xs", "sm", "md", "lg", "xl"] as const).map((s) => <LadderRow key={s} size={s} />)}
          </Flex>
          <Caption>Larger than <Code>xl</Code> (profile heroes) is a raw number — <Code>size={"{64}"}</Code> — which leaves the inline-with-text scale.</Caption>
          <Box data-case="unsized-track" style={{ marginTop: 4, paddingTop: 14, borderTop: "1px solid var(--ds-stroke-weak)" }}>
            <Flex align="center" gap="4">
              <Avatar fallback="AL" />
              <Text as="p" size="2" style={{ color: "var(--ds-text-strong)", maxWidth: "var(--ds-text-measure)", lineHeight: 1.6 }}>
                Leave <Code>size</Code> unset and the box <strong>tracks the global uiSize toolbar</strong> (the same mechanism as Button/Text) — <Code>small→16</Code> · <Code>medium→20</Code> · <Code>large→24px</Code>. Flip the <Code>uiSize</Code> toolbar (top) and watch this one resize; the pinned ladder above ignores it.
              </Text>
            </Flex>
          </Box>
        </Section>

        <Rule />

        <Section title="Fallback — person vs system" lead="Radix's single fallback slot is a documentation convention: a person gets initials, a system/bot/team gets an icon.">
          {/* PINNED to `lg`, and the pin is the lesson's precondition: the fallback CONTENT is what this
              section teaches, and it has to be readable to teach it. Fallback type is derived from the box
              (--avatar-fallback-two-letters-font-size = box x 0.44, components.css), so at the ambient xs
              rung "AL" renders at 7px and the glyph at ~9px — measured on this page. `lg` is the smallest
              rung where initials and a glyph read as different KINDS of fallback rather than as two
              smudges. Unset avatars — the ones that track the uiSize toolbar — are demonstrated on the
              size ladder above. */}
          <Flex align="center" gap="5" wrap="wrap">
            <Flex direction="column" align="center" gap="1"><Avatar size="lg" fallback="AL" /><Muted>person</Muted></Flex>
            <Flex direction="column" align="center" gap="1"><Avatar size="lg" fallback={<Robot />} /><Muted>bot</Muted></Flex>
            <Flex direction="column" align="center" gap="1"><Avatar size="lg" radius="medium" fallback={<Buildings />} /><Muted>org</Muted></Flex>
          </Flex>
        </Section>

        <Rule />

        <Section title="Radius — person vs entity" lead="Circle reads as a person; a rounded-square reads as an entity, org, or bot.">
          {/* PINNED to `lg`, and the pin is the lesson's precondition: the whole section is the SHAPE
              difference, and a corner radius scales with the box. At the ambient xs rung (16px) the
              circle and the rounded square differ by about two pixels of corner and the pair reads as
              one shape twice. */}
          <Flex align="center" gap="5" wrap="wrap">
            <Flex direction="column" align="center" gap="1"><Avatar size="lg" radius="full" fallback="AL" /><Muted>full (person)</Muted></Flex>
            <Flex direction="column" align="center" gap="1"><Avatar size="lg" radius="medium" fallback={<Buildings />} /><Muted>medium (entity)</Muted></Flex>
          </Flex>
        </Section>

        <Rule />

        <Section title="Status" lead="An optional presence dot — colour is paired with a hidden text label, never colour alone.">
          {/* Both rows below (and the measured StatusDotSpec that documents them) are PINNED to `lg`,
              and the pin is the lesson's precondition: the dot has a FLOOR — width/height
              max(8px, box × 0.25) in components.css — so it does not shrink with the box. At the ambient
              xs rung it is 8px on a 16px disc, a quarter of the avatar, and four such swatches stop
              being tellable apart by colour, which is the only thing this section is teaching. `lg` is
              where the dot sits at the proportion the component actually ships. */}
          <Flex align="center" gap="5" wrap="wrap">
            {(["online", "busy", "away", "offline"] as AvatarStatus[]).map((st) => (
              <Flex key={st} direction="column" align="center" gap="1">
                <Avatar size="lg" status={st} fallback="AL" /><Muted>{st}</Muted>
              </Flex>
            ))}
          </Flex>
          {/* The 2px --ds-bg-base ring must read the dot off ANY surface, not just the white page — shown
              here over an accent fill (the coloured-backdrop check the play asserts). */}
          <Box data-coloured-status style={{ background: "var(--ds-fill-accent)", borderRadius: "var(--ds-radius-4)", padding: 20, marginTop: 4 }}>
            <Flex align="center" gap="5" wrap="wrap">
              {(["online", "busy", "away", "offline"] as AvatarStatus[]).map((st) => (
                <Box key={st} data-cstatus={st}><Avatar size="lg" status={st} fallback="AL" /></Box>
              ))}
            </Flex>
          </Box>
          <Caption>The ring punches the dot off any surface. <Code>offline</Code> is <Code>--ds-icon-neutral</Code> — an opaque muted gray, so it holds over an <Code>AvatarGroup</Code> overlap where a translucent fill would bleed.</Caption>
        </Section>

        {/* Size-contract probe (visually hidden, aria-hidden): a raw number is an inline hero box (64px)
            and "inherit" opts out of DS sizing (no rt-ds-avatar class). Folded here from the former
            `_SizeContract` fixture so the assertion lives in a doc story's play, with no sidebar entry. */}
        <Box aria-hidden data-testid="size-contract" style={{ position: "absolute", width: 1, height: 1, padding: 0, margin: -1, overflow: "hidden", clipPath: "inset(50%)", whiteSpace: "nowrap", border: 0 }}>
          <div data-case="number"><Avatar size={64} fallback="AL" /></div>
          <div data-case="inherit"><Avatar size="inherit" fallback="AL" /></div>
        </Box>
      </Page>
    </HexThemeKey.Provider>
  ),
  // Folds the former `_SizeContract` + `_StatusDot` fixtures into this doc story's play (matching
  // Badge/Callout) so neither needs a sidebar page. Asserts: the size contract (number → 64px box;
  // "inherit" → no rt-ds-avatar class) and the presence dot (accessible name; accent-aware fill incl.
  // offline=--ds-icon-neutral; a 2px --ds-bg-base ring that reads over a COLOURED backdrop).
  play: async ({ canvasElement }) => {
    // --- size contract (from _SizeContract) ---
    const num = canvasElement.querySelector('[data-testid="size-contract"] [data-case="number"] .rt-AvatarRoot') as HTMLElement | null;
    if (!num) throw new Error("number-size probe not rendered");
    if (Math.round(parseFloat(getComputedStyle(num).width)) !== 64) {
      throw new Error(`number size should be 64px, got ${getComputedStyle(num).width}`);
    }
    const inh = canvasElement.querySelector('[data-testid="size-contract"] [data-case="inherit"] .rt-AvatarRoot') as HTMLElement | null;
    if (!inh) throw new Error("inherit-size probe not rendered");
    if (inh.className.includes("rt-ds-avatar")) {
      throw new Error(`"inherit" must emit no rt-ds-avatar class, got "${inh.className}"`);
    }

    // --- status dot over a COLOURED backdrop (from _StatusDot) ---
    const root = themeRoot(canvasElement);
    const fail: string[] = [];
    for (const [status, token] of Object.entries(STATUS_TOKEN)) {
      const dot = canvasElement.querySelector(`[data-cstatus="${status}"] .rt-ds-avatar-status`) as HTMLElement | null;
      if (!dot) { fail.push(`${status}: no dot`); continue; }
      // Accessible name (colour is not alone — WCAG 1.4.1).
      if (dot.getAttribute("role") !== "img" || !dot.getAttribute("aria-label")) {
        fail.push(`${status}: dot needs role="img" + aria-label`); continue;
      }
      // Colour resolves to the accent-aware token (rasterized — P3-safe).
      const got = parseColor(getComputedStyle(dot).backgroundColor);
      const want = resolveColor(root, token);
      if (!near(got, want)) fail.push(`${status}: dot ${JSON.stringify(got)} != ${token} ${JSON.stringify(want)}`);
      // Ring reads over the coloured backdrop (2px bg-base border present).
      if (!getComputedStyle(dot).border.includes("2px")) fail.push(`${status}: missing 2px ring`);
    }
    if (fail.length) throw new Error("Status-dot failures:\n" + fail.join("\n"));
  },
};

/* ---- Usage specimens: real product surfaces -------------------------------
   An avatar's only job is to answer "who", and a rule about "who" is legible
   just once — beside the thing being identified. A disc floating on its own
   above a caption teaches nothing, so every specimen below is a slice of a
   surface a product actually ships: a member row, an assignee cell, the people
   bar over a shared document, a product header, a comment. */

/** The bordered row every in-context specimen sits in — the subtle ground, hairline edge and 4-step
 *  radius the library's other in-context specimens use (see MoreMenu's project row). */
function Surface({ children, maxWidth = 460 }: { children: ReactNode; maxWidth?: number | string }) {
  return (
    <Box
      style={{
        background: "var(--ds-bg-subtle)",
        border: "1px solid var(--ds-stroke-weak)",
        borderRadius: "var(--ds-radius-4)",
        padding: "var(--space-3) var(--space-4)",
        maxWidth,
      }}
    >
      {children}
    </Box>
  );
}

/** The primary line of a row — the name of the person, team or thing the avatar stands for. */
const RowTitle = ({ children }: { children: ReactNode }) => (
  <Text size="2" weight="medium" style={{ color: "var(--ds-text-strong)" }}>{children}</Text>
);

/** The supporting line under it. */
const RowMeta = ({ children }: { children: ReactNode }) => (
  <Text size="1" style={{ color: "var(--ds-text-weak)" }}>{children}</Text>
);

/** A product's brand mark, for the header specimens. */
const BrandMark = () => (
  <Box style={{ width: 18, height: 18, borderRadius: "var(--ds-radius-2)", background: "var(--ds-fill-accent)" }} />
);

/** A comment under a design review — the commonest place an avatar sits beside a name that is
 *  already on the page. `alt` is the variable the do/don't pair below turns. */
function CommentRow({ alt }: { alt: string }) {
  return (
    <Flex gap="3" align="start">
      <Avatar src={PORTRAIT} alt={alt} fallback="AL" />
      <Flex direction="column" gap="1" style={{ minWidth: 0 }}>
        <Flex align="center" gap="2">
          <RowTitle>Ada Lovelace</RowTitle>
          <Timestamp value="2026-07-29T14:12:00Z" format="time" size="1" />
        </Flex>
        <Text size="2" style={{ color: "var(--ds-text-weak)", lineHeight: 1.6 }}>
          The 4.5 floor holds on every accent except grass — I’ll re-measure that one before we merge.
        </Text>
      </Flex>
    </Flex>
  );
}

/** A product header with the account avatar in its trailing slot — the place an avatar stands
 *  completely alone, with no name anywhere near it. Links are muted so a click in the docs never
 *  navigates the story away. */
function ProductHeader({ label, avatar }: { label: string; avatar: ReactNode }) {
  return (
    <LinkProvider component={DemoLink}>
      <TopNav aria-label={label} end={avatar}>
        <TopNav.Heading href="#home" logo={<BrandMark />}>Northwind</TopNav.Heading>
      </TopNav>
    </LinkProvider>
  );
}

export const Usage: Story = {
  // Two documented-specimen a11y carve-outs, scoped to THIS story only:
  //  • DODONT_LABEL — the DO/DON'T word row only (--ds-text-success/-error on the weak semantic fill),
  //    4.10 at 12px bold, under axe's 4.5; colour-not-alone (the word + check/X icon carry the meaning,
  //    WCAG 1.4.1). Scoped to that row — the card's specimens stay checked, which the older whole-card
  //    "[data-dodont]" form prevented. Same carve-out every DoDont page takes.
  //  • image-alt — the "alone in a header" DON'T renders a DELIBERATE anti-pattern: an image `src`
  //    with NO `alt`. The portrait is a reliable data-URI so it actually loads, and axe's image-alt
  //    correctly flags it — which IS the point of the DON'T. Scoped off here so the teaching specimen
  //    can render; the fold in the play still asserts the dev warning fires for it, and asserts the
  //    alt each of the four cards CLAIMS, so the carve-out can never quietly cover a real omission.
  // Every OTHER Avatar story keeps both rules fully ON (soft initials clear 4.5:1; real images carry alt).
  parameters: { a11y: { context: { exclude: [DODONT_LABEL] }, config: { rules: [{ id: "image-alt", enabled: false }] } } },
  render: (_args, { globals }) => (
    <Page maxWidth={900}>
      <PageHeader title="Avatar · Usage" standfirst={DEFINITION} />
      <Section
        title="A person, or a thing"
        lead="Shape is read before any word is, and here it is carrying meaning rather than style: a circle is a human being, a rounded square is an organisation, a workspace or a bot. Hold the two apart and a mixed screen — people, and the teams they belong to — sorts itself with no explaining."
      >
        <Grid columns={{ initial: "1", sm: "2" }} gapX="6" gapY="5">
          <Scenario
            label="PERSON"
            caption={<>A circle crops to a face, and the initials fall back into the same round disc. Presence rides the box, so a member list can say who is <em>here</em> as well as who is on it.</>}
          >
            <Surface maxWidth="100%">
              <Flex align="center" gap="3">
                {/* PINNED to `md`, and the pin is the lesson's precondition: this section's claim is that
                    SHAPE carries the person/organisation distinction, and radius scales with the box —
                    at the ambient xs rung (16px) the circle and the rounded square opposite are the same
                    small blob. Its ENTITY twin is pinned to the same rung for the same reason. */}
                <Avatar size="md" status="online" fallback="AL" />
                <Flex direction="column" style={{ minWidth: 0, flex: 1 }}>
                  <RowTitle>Ada Lovelace</RowTitle>
                  <RowMeta>ada@northwind.co</RowMeta>
                </Flex>
                <Badge>Admin</Badge>
              </Flex>
            </Surface>
          </Scenario>
          <Scenario
            label="ENTITY"
            caption={<>A rounded square holds a logo without cropping it, and reads as an organisation rather than as a colleague called Northwind. Its fallback is a glyph, not initials.</>}
          >
            <Surface maxWidth="100%">
              <Flex align="center" gap="3">
                {/* PINNED to `md` — the PERSON twin's rung, for the reason recorded there (the pair only
                    teaches shape if shape is legible). */}
                <Avatar size="md" radius="medium" fallback={<Buildings />} />
                <Flex direction="column" style={{ minWidth: 0, flex: 1 }}>
                  <RowTitle>Northwind Trading</RowTitle>
                  <RowMeta>Enterprise · 148 seats</RowMeta>
                </Flex>
                <Badge>Owner</Badge>
              </Flex>
            </Surface>
          </Scenario>
        </Grid>
        <Caption>
          One prop separates those two rows — <Code>radius</Code>. The box, the fill and the fallback slot
          are identical, which is exactly why the shape has to be the thing carrying the difference.
        </Caption>
      </Section>

      <Rule />

      <Section
        title="Somebody in particular, or nobody yet"
        lead="An avatar stands for a specific person. A generic glyph in the same box stands for the ABSENCE of one — an unassigned task, an unfilled seat, a review nobody has picked up. Both are avatar-shaped on purpose: the row keeps its rhythm and its column widths whether or not the seat is filled."
      >
        <Grid columns={{ initial: "1", sm: "2" }} gapX="6" gapY="5">
          <Scenario label="ASSIGNED" caption={<>The avatar answers “who”, and the name beside it says which who. Initials are the fallback for a person — never a silhouette.</>}>
            <Surface maxWidth="100%">
              <Flex direction="column" gap="2">
                <RowTitle>Re-measure the grass accent</RowTitle>
                <Flex align="center" gap="2">
                  {/* PINNED to `sm`, and the pin is the lesson's precondition: the pair turns on
                      initials vs a generic glyph, and fallback type is derived from the box, so at the
                      ambient xs rung "PR" renders at ~7px. Its UNASSIGNED twin holds the same rung so the
                      two slots stay the same width — which is the other half of what the section claims. */}
                  <Avatar size="sm" fallback="PR" />
                  <RowMeta>Priya Raman · due Thursday</RowMeta>
                </Flex>
              </Flex>
            </Surface>
          </Scenario>
          <Scenario label="UNASSIGNED" caption={<>The same slot with nobody in it. The glyph is a placeholder <em>for</em> a person, never a stand-in for one — and it holds the space, so the row does not jump the moment somebody takes the task.</>}>
            <Surface maxWidth="100%">
              <Flex direction="column" gap="2">
                <RowTitle>Audit the dark-mode tints</RowTitle>
                <Flex align="center" gap="2">
                  {/* PINNED to `sm` — the ASSIGNED twin's rung. The section's claim is that the row keeps
                      its rhythm and column widths whether or not the seat is filled, which is only true
                      while the filled and empty slots are the same box. */}
                  <Avatar size="sm" fallback={<User />} />
                  <RowMeta>Unassigned · due Thursday</RowMeta>
                </Flex>
              </Flex>
            </Surface>
          </Scenario>
        </Grid>
      </Section>

      <Rule />

      <Section
        title="A stack, when the question is “who else”"
        lead="Overlap a set of people into one row when the reader wants to know who else is here rather than exactly who each one is — a document's people bar, a project's members cell. Every disc renders at the group's size with a ring so the overlap reads, and max caps the stack before it starts pushing the rest of the toolbar around."
      >
        <Surface maxWidth={560}>
          <Flex align="center" gap="4">
            <Flex direction="column" style={{ minWidth: 0, flex: 1 }}>
              <RowTitle>Accent collision audit</RowTitle>
              <RowMeta>Edited 4 minutes ago</RowMeta>
            </Flex>
            {/* Unsized on purpose. AvatarGroup's own default is the PORTRAIT ramp (24 / 30 / 40), so at
                the default tier this is the same 24px box the former `size="md"` pinned — and unlike the
                pin it climbs with the uiSize toolbar. Sizing is documented on System/AvatarGroup. */}
            <AvatarGroup max={4} label="7 people in this document">
              <Avatar fallback="AL" />
              <Avatar fallback="TL" />
              <Avatar fallback="PR" />
              <Avatar fallback="SW" />
              <Avatar fallback="NH" />
              <Avatar fallback="JB" />
              <Avatar fallback="MK" />
            </AvatarGroup>
            <Button priority="secondary">Share</Button>
          </Flex>
        </Surface>
        <Caption>
          The stack announces itself as one named group — <Code>label="7 people in this document"</Code> —
          so the summary a sighted reader takes from the picture is the summary a screen reader gets, not
          seven loose discs and a counter. Capping, sizing and the <Code>+N</Code> disc are documented on{" "}
          <Code>System/AvatarGroup</Code>.
        </Caption>
      </Section>

      <Rule />

      <Section
        title="Alone in a header, alt is the only name she has"
        lead="An image avatar needs a text alternative, and the right one depends entirely on what sits beside it. In a product header, nothing does: the picture IS the account control, so alt has to carry the person's name."
      >
        <Grid columns={{ initial: "1", sm: "2" }} gap="3">
          <DoDont
            kind="do"
            bare
            note={<><Code>alt="Ada Lovelace"</Code> names the person the picture stands for, so the control announces her where a sighted reader recognises her.</>}
          >
            <Box data-alt="named" style={{ width: "100%" }}>
              <ProductHeader
                label="Product header, avatar named"
                avatar={<Avatar src={PORTRAIT} alt="Ada Lovelace" fallback="AL" />}
              />
            </Box>
          </DoDont>
          <DoDont
            kind="dont"
            bare
            note={<>The same avatar with <Code>alt</Code> left off altogether. It warns in development, and the one control in the header that says who is signed in announces a file URL — or nothing at all.</>}
          >
            <Box data-alt="missing" style={{ width: "100%" }}>
              <ProductHeader
                label="Product header, avatar unnamed"
                avatar={<Avatar src={PORTRAIT} fallback="AL" />}
              />
            </Box>
          </DoDont>
        </Grid>
      </Section>

      <Rule />

      <Section
        title="Beside a visible name, alt stays empty"
        lead="Anywhere the name is already on the page — a comment, a member row, a card — the picture is decorative, and a second copy of the name inside it is simply read out twice in a row. An empty alt is how you say so."
      >
        <Grid columns={{ initial: "1", sm: "2" }} gap="3">
          <DoDont
            kind="do"
            bare
            note={<><Code>alt=""</Code> marks the picture decorative, so the row announces “Ada Lovelace” once — from the text, where the name belongs.</>}
          >
            <Box data-alt="decorative" style={{ width: "100%" }}>
              <Surface maxWidth="100%"><CommentRow alt="" /></Surface>
            </Box>
          </DoDont>
          <DoDont
            kind="dont"
            bare
            note={<>The name in the picture AND in the text. A screen reader reads “Ada Lovelace Ada Lovelace” before it reaches a word of the comment.</>}
          >
            <Box data-alt="doubled" style={{ width: "100%" }}>
              <Surface maxWidth="100%"><CommentRow alt="Ada Lovelace" /></Surface>
            </Box>
          </DoDont>
        </Grid>
        <Caption>
          <Code>alt=""</Code> is a deliberate mark, not an omission: it says the name is already on the
          page and this picture adds nothing to read. Leaving the attribute off is the case that warns,
          because the component cannot tell a considered blank from a forgotten one.
        </Caption>
      </Section>

      <Rule />

      <HexThemeKey.Provider value={`${globals.accent}-${globals.appearance}-${globals.contrast}`}>
        <Section title="Tokens" lead="The box is a size lane rather than a colour, so it is stated; the presence dot IS a colour, so every one of its rows is read off a rendered avatar and checked against the token it claims — flip the accent or the appearance toolbar and the readings re-resolve.">
          <Flex direction="column" gap="4">
            <TokenGroup label="BOX" specimen={<Avatar fallback="AL" />}>
              <NoteRow part="Box (xs → xl)" value="16 / 20 / 24 / 30 / 40" radix="--ds-text-*-leading" />
              <NoteRow part="Variant" value="soft (locked)" radix="--accent-3 / --accent-a11" />
              <NoteRow part="Radius" value="full (default) · medium (entity)" radix="--radius-*" />
            </TokenGroup>
            <TokenGroup label="STATUS DOT">
              <StatusDotSpec />
            </TokenGroup>
          </Flex>
          <Caption>The four presence colours are the semantic <Code>--ds-fill-*</Code> / <Code>--ds-icon-*</Code> roles, so they follow a brand accent's collision shift rather than pinning a fixed green and red. The away, online and busy dots also stack the StatusDot edge, a 1px inset ring inside the cutout ring, which holds each at WCAG 3:1 and APCA Lc 30 against that ring ([[status-dot-edges]]).</Caption>
        </Section>
      </HexThemeKey.Provider>
    </Page>
  ),
  // Folds the former `_AltWarning` fixture into this doc story's play (matching Badge/Callout) so it
  // needs no sidebar page. The header DON'T renders exactly the flagged case: an image `src` with NO
  // `alt`, which must warn in dev (WCAG 1.1.1). Install the console.warn spy BEFORE mount so the
  // on-mount effect fires inside the spy window (mount() renders the story).
  play: async ({ mount, canvasElement }) => {
    const original = console.warn;
    const calls: string[] = [];
    console.warn = (...a: unknown[]) => { calls.push(String(a[0])); };
    try {
      await mount();
    } finally {
      console.warn = original;
    }
    // `.some` not a strict count — StrictMode can double-invoke the effect. Three of the four portraits
    // carry an alt (one names her, one is the deliberate blank, one is the doubled DON'T), so ONLY the
    // header DON'T warns.
    if (!calls.some((w) => w.includes("WCAG 1.1.1") && w.includes("`alt`"))) {
      throw new Error(`expected a dev alt-warning for the no-alt DON'T avatar, captured: ${JSON.stringify(calls)}`);
    }

    // The four alt specimens each load their data-URI portrait cleanly — never a broken blob. Radix
    // only mounts the <img> once the image resolves, so the count is polled rather than read once.
    const WANT_IMAGES = 4;
    const loaded = (list: HTMLImageElement[]) => list.every((i) => i.complete && i.naturalWidth > 0);
    let imgs: HTMLImageElement[] = [];
    for (let i = 0; i < 60; i++) {
      imgs = Array.from(canvasElement.querySelectorAll<HTMLImageElement>(".rt-AvatarImage"));
      if (imgs.length === WANT_IMAGES && loaded(imgs)) break;
      await new Promise((r) => requestAnimationFrame(r));
    }
    if (imgs.length !== WANT_IMAGES || !loaded(imgs)) {
      throw new Error(`expected ${WANT_IMAGES} alt-specimen images to render cleanly, got ${imgs.length} (loaded: ${imgs.map((i) => i.complete && i.naturalWidth > 0).join(",")})`);
    }

    // …and each carries the alt its card CLAIMS. Without this the four cards could teach four rules
    // while rendering the same markup, and the page would document nothing.
    const altOf = (key: string) =>
      canvasElement.querySelector<HTMLImageElement>(`[data-alt="${key}"] .rt-AvatarImage`)?.getAttribute("alt");
    const expected: [string, string | null][] = [
      ["named", "Ada Lovelace"],   // DO   — standing alone, alt names her
      ["decorative", ""],          // DO   — name adjacent, alt is the deliberate blank
      ["doubled", "Ada Lovelace"], // DON'T— name adjacent AND in alt, announced twice
      ["missing", null],           // DON'T— no alt attribute at all (the case that warns)
    ];
    for (const [key, want] of expected) {
      const got = altOf(key);
      if (got !== want) throw new Error(`[data-alt="${key}"] should render alt=${JSON.stringify(want)}, got ${JSON.stringify(got)}`);
    }

    // --- the token table's EVIDENCE, asserted at runtime ---
    // Every status row read a REAL rendered dot on a real avatar (its fill, and the cutout ring), never
    // a swatch this story painted. `rows: N` is the exact form: an "at least one" floor is satisfied by
    // a table that has not filled in yet.
    const rows = await awaitMeasuredRows(canvasElement, { rows: SPEC_ROWS });
    if (rows.measured !== SPEC_ROWS || rows.unproven !== 0) {
      throw new Error(`expected ${SPEC_ROWS} measured / 0 unproven token rows, got ${rows.measured} / ${rows.unproven}`);
    }
  },
};

const AVATAR_PROPS: PropDef[] = [
  { name: "size", type: `"xs" | "sm" | "md" | "lg" | "xl" | number | "inherit"`, def: "avatar lane (xs at small)", desc: <>Box size. A t-shirt name maps to the line-height ladder — <Code>xs</Code> 16 · <Code>sm</Code> 20 · <Code>md</Code> 24 · <Code>lg</Code> 30 · <Code>xl</Code> 40 — so an avatar drops in beside text without nudging. A raw number is a hero box in px (off the inline-with-text scale). Unset, it follows the global <Code>uiSize</Code> avatar lane (<Code>small</Code> → <Code>xs</Code>, 16px); <Code>inherit</Code> opts out entirely and lets Radix's own box govern.</>, source: "Avatar.tsx:36" },
  { name: "status", type: `"online" | "busy" | "away" | "offline"`, desc: <>Presence dot, bottom-right. It renders the <Code>StatusDot</Code> component — an accent-aware <Code>--ds-*</Code> fill plus a visually-hidden text label, so presence never reads by colour alone. The dot scales with the box and carries a <Code>--ds-bg-base</Code> cutout ring so it holds over a photo.</>, source: "Avatar.tsx:38" },
  { name: "fallback", type: "ReactNode", desc: <><strong>Required.</strong> What shows with no <Code>src</Code> (or while it loads). The convention: a person → initials (<Code>"AL"</Code>); a system, bot, or team → a glyph node.</>, source: "Radix" },
  { name: "src", type: "string", desc: <>Image URL. Absent or failed, the <Code>fallback</Code> shows instead.</>, source: "Radix" },
  { name: "alt", type: "string", desc: <>Text alternative for the image (WCAG 1.1.1). <Code>alt=""</Code> is the explicit decorative opt-out, for an avatar whose name is already in adjacent text. A <Code>src</Code> with no <Code>alt</Code> logs a dev-only warning.</>, source: "Avatar.tsx:55 · Radix" },
  { name: "radius", type: `"full" | "none" | "small" | "medium" | "large"`, def: `"full"`, desc: <>Corner radius — and a meaning, not just a shape: a <strong>circle</strong> is a person, a <strong>rounded square</strong> (<Code>medium</Code>) is an entity, org, or bot.</>, source: "Avatar.tsx:48" },
  { name: "variant", type: `"soft" | "solid"`, locked: true, desc: <>Not exposed — always the tinted <Code>soft</Code> fill. Solid-fill initials can't hold the contrast floor at avatar sizes, so the choice is made once, here.</>, source: "Avatar.tsx:70" },
  { name: "color", type: `"gray" | "blue" | "red" | …`, desc: <>A categorical Radix hue, for deriving a per-person tint from a name. Unset, the avatar picks up the theme accent.</>, source: "Radix" },
];

const FALLBACK_OPTIONS = ["initials", "user", "bot", "org"] as const;
type FallbackKey = (typeof FALLBACK_OPTIONS)[number];
const FALLBACK_MAP: Record<FallbackKey, NonNullable<ReactNode>> = {
  initials: "AL", user: <User />, bot: <Robot />, org: <Buildings />,
};

type PropsArgs = {
  size: AvatarSize | "inherit" | "auto";
  radius: "full" | "medium" | "none";
  fallback: FallbackKey;
  status: "none" | AvatarStatus;
  src: string;
  alt: string;
};

export const Props: StoryObj<PropsArgs> = {
  // Default "auto" (size unset) so the Props avatar tracks the global uiSize toolbar out of the
  // box — flip uiSize (toolbar) small ↔ large and the box resizes (16 ↔ 24). Pick a t-shirt name to pin it.
  args: { size: "auto", radius: "full", fallback: "initials", status: "none", src: "", alt: "Ada Lovelace" },
  argTypes: {
    size: { control: "inline-radio", options: ["auto", "xs", "sm", "md", "lg", "xl", "inherit"], description: '"auto" tracks the global uiSize toolbar (unset); a t-shirt name pins the box; "inherit" opts out (Radix default).', table: { category: "Size" } },
    radius: { control: "inline-radio", options: ["full", "medium", "none"], table: { category: "Shape" } },
    fallback: { control: "select", options: FALLBACK_OPTIONS, table: { category: "Content" } },
    status: { control: "select", options: ["none", "online", "busy", "away", "offline"], table: { category: "Content" } },
    src: { control: "text", description: "Image URL — leave blank to show the fallback.", table: { category: "Content" } },
    alt: { control: "text", description: "Text alternative; alt=\"\" marks a decorative avatar.", table: { category: "Content" } },
  },
  parameters: { controls: { disable: false } },
  render: ({ size, radius, fallback, status, src, alt }: PropsArgs) => (
    <Page maxWidth="none">
      <PageHeader title="Avatar · Props" standfirst={DEFINITION} />
      <Box style={{ padding: "8px 0 2px" }}>
        <Avatar
          size={size === "auto" ? undefined : size}
          radius={radius}
          status={status === "none" ? undefined : status}
          src={src || undefined}
          alt={alt}
          fallback={FALLBACK_MAP[fallback]}
        />
      </Box>
      <PropsLead />
      <Rule />
      <Section title="Props reference" lead={<>Every prop <Code>Avatar</Code> accepts — <Code>size</Code> and <Code>status</Code> are the system's own, the rest pass through to Radix's <Code>Avatar</Code>. <Code>variant</Code> is locked so initials always sit on the tinted soft fill.</>}>
        <PropTable rows={AVATAR_PROPS} />
      </Section>
    </Page>
  ),
};

export const History: Story = {
  render: () => (
    <Page>
      <PageHeader title="Avatar · History" standfirst={DEFINITION} />
      <Section title="Decisions" lead="The rulings this component encodes.">
        <Flex direction="column" gap="3">
          <Decision id="Sizing">
            Avatar sizes are a t-shirt ladder keyed to text line-heights (<Code>--ds-text-*-leading</Code>),
            mirroring <Code>icons.css</Code> — so an avatar caps the same line box as the text it sits with.
          </Decision>
          <Decision id="[[avatar-shape-perceptibility]] · Variant locked to soft">
            <Code>variant</Code> is locked to <Code>soft</Code>, so solid is not exposed. The lock came from
            solid-fill initials failing the 3:1 floor that then held for text on a solid fill, which
            [[text-on-solid-fill-contrast]] later raised to 4.5:1 and APCA Lc 60.
          </Decision>
          <Decision id="[[field-shell]] · Accent-aware presence dot">
            The presence dot paints from accent-aware <Code>--ds-fill-*</Code> tokens, so status colour
            follows the brand's collision shifts instead of a fixed Radix green/red.
          </Decision>
          <Decision id="[[status-dot-edges]] · an edge on the presence dot">
            The presence dot is a StatusDot, so it takes the StatusDot edge: a 1px inset ring of{" "}
            <Code>--warning-dot-edge</Code>, <Code>--success-dot-edge</Code> or <Code>--error-dot-edge</Code> on
            its fill, inside the 2px cutout ring. Against that ring the away dot read as low as 1.23:1 and the
            online dot 1.31:1 in light, and the busy dot 2.06:1 and APCA Lc 12.0 in dark. With the edge the
            lowest reads 3.13:1 in light and 4.41:1 and Lc 32.7 in dark. The offline dot,{" "}
            <Code>--ds-icon-neutral</Code>, clears on its own fill and takes no edge.
          </Decision>
          <Decision id="1.1.1">
            An image <Code>src</Code> without <Code>alt</Code> warns in dev; <Code>alt=""</Code> is the
            explicit decorative opt-out for an avatar redundant with adjacent text.
          </Decision>
        </Flex>
      </Section>
      <Rule />
      <Section title="Changelog" lead="Notable changes, newest first.">
        <Flex direction="column" gap="3">
          <Decision id="0.9.0">
            Initial component — the line-height ladder + <Code>useResolvedAvatarSize</Code>, soft-lock,
            circle default, presence dot, dev alt-warning, and AvatarGroup. Token/size spec reads live from
            the DOM; stories split into History · Anatomy · Usage · Props.
          </Decision>
        </Flex>
      </Section>
    </Page>
  ),
};
