import type { Meta, StoryObj } from "@storybook/react-vite";
import type { CSSProperties, ReactNode } from "react";
import { useState } from "react";
import { Box, Flex, Text } from "@radix-ui/themes";
import motionCss from "../tokens/motion.css?raw";
import { awaitMeasuredRows, resolve, themeRoot } from "./_assert";
import {
  Caption, HexThemeKey, MeasuredRow, MeasuredSpec, Mono, Page, PageHeader, Rule, Section,
} from "../components/ui/_storyKit";
import { Button } from "../components/ui/Button";
import { Popover } from "../components/ui/Popover";
import { Table } from "../components/ui/Table";

// Values are parsed straight from motion.css (Vite ?raw), not hand-typed, so this
// reference can't drift from the token file — the same self-syncing rule the
// per-component Anatomy specs follow (DECISIONS [[docs-page-spine]]). Only the base .radix-themes
// block is read; the prefers-reduced-motion overrides below it are skipped.
const mediaIdx = motionCss.search(/@media/);
const motionBase = mediaIdx === -1 ? motionCss : motionCss.slice(0, mediaIdx);
function readTokens(prefix: string): [string, string][] {
  const re = new RegExp(`(${prefix}[\\w-]*)\\s*:\\s*([^;]+);`, "g");
  return Array.from(motionBase.matchAll(re), (m) => [m[1], m[2].trim()] as [string, string]);
}
function readToken(name: string): string {
  const m = motionBase.match(new RegExp(`${name}\\s*:\\s*([^;]+);`));
  return m ? m[1].trim() : "";
}

const DURATIONS = readTokens("--ds-duration-"); // [token, value], file order (instant → advanced)
const EASINGS = readTokens("--ds-ease-");
/* Parsed but not rendered: this page no longer documents stagger (GUIDELINES §7 holds the whole of
   that guidance, and the token still has no shipped component consumer). The `Durations` play keeps
   asserting it, because the play is motion.css's integrity check and dropping a token from it would
   be a silent loss of coverage. */
const STAGGER = readToken("--ds-stagger-step");

const durationValue = (token: string) => DURATIONS.find(([t]) => t === token)?.[1] ?? "";

/* THE LADDER, as one table: how much a surface interrupts decides which PAIR of steps it takes. Token
   names are prose here; the millisecond values beside them are read from the parsed ladder above, so
   they cannot drift. Three steps sit outside the pairs and are named in the caption instead —
   `instant` and `micro` belong to rule 1 (direct manipulation), and `advanced` has no consumer. */
const TIERS: { tier: string; surface: string; enter: string; exit: string }[] = [
  { tier: "Hint", surface: "Tooltip", enter: "--ds-duration-fast", exit: "--ds-duration-moderate" },
  { tier: "Popper", surface: "menu · popover · HoverCard · flyout · collapsible", enter: "--ds-duration-overlay", exit: "--ds-duration-emphasis" },
  { tier: "Modal", surface: "Dialog · AlertDialog · mobile drawer · Toast", enter: "--ds-duration-moderate", exit: "--ds-duration-expressive" },
];

const EASING_USE: Record<string, string> = {
  "--ds-ease-standard": "in-place change — and every slower exit",
  "--ds-ease-entry": "open / state-change — decelerate in",
  "--ds-ease-exit": "snaps — toast swipe out · swipe snap back · Overlay scrim hide",
  "--ds-ease-linear": "plain opacity fade",
};

/* What may be animated at all, and why. Prose only — there is no token behind a verdict, so nothing
   here can be read from the file; the table states the rule the component layer is held to. */
const ANIMATABLE: { verdict: string; properties: string; why: string }[] = [
  { verdict: "do", properties: "opacity · transform (translate / scale)", why: "the compositor owns both — no layout pass, no repaint" },
  { verdict: "avoid", properties: "box-shadow · background-color · color", why: "paint-only: fine for a short fade, never across a large surface" },
  { verdict: "never", properties: "width · height · top / left · margin", why: "layout thrash — every frame re-runs layout for the page" },
];

/** A token name is ONE identifier, and it must not break across two lines — half a name on each line
 *  stops reading as a name at all. The kit's `Mono` is the code-text treatment everywhere in this
 *  system; this only holds it together. */
const Token = ({ children }: { children: ReactNode }) => (
  <span style={{ whiteSpace: "nowrap" }}><Mono>{children}</Mono></span>
);

/** A titled statement card — the page's own shape for "here is a rule, in one paragraph". Capped at
 *  the page's own reading measure, the same `--ds-text-measure` the standfirst, the Section lead and
 *  every Caption take: the card is a paragraph of prose in a tint, not a layout band. */
function RuleCard({ title, children }: { title: string; children: ReactNode }) {
  return (
    <Box style={{
      maxWidth: "var(--ds-text-measure)", padding: "var(--ds-space-16)",
      borderRadius: "var(--ds-radius-3)", background: "var(--ds-bg-subtle)",
      border: "1px solid var(--ds-stroke-weak)",
    }}>
      <Text as="p" size="2" weight="bold" mb="1" style={{ color: "var(--ds-text-strong)" }}>{title}</Text>
      <Text as="p" size="2" style={{ color: "var(--ds-text-weak)", lineHeight: 1.6 }}>{children}</Text>
    </Box>
  );
}

/* ---- specimens: they run ONCE, at the real duration, when the reader asks -------------------------
 * Every specimen on this page is driven by a control and references the ladder THROUGH A TOKEN, which
 * is what makes reduced motion work: motion.css clamps `--ds-duration-*` to 0.01ms under
 * `prefers-reduced-motion: reduce`, so a specimen that interpolates the token's TEXT keeps the value
 * and loses the behaviour. Nothing here loops, so nothing needs a second reduced-motion rule of its
 * own — the clamp reaches all of it, exactly as it reaches a component. */

/** One tier's specimen. The chip ENTERS on that tier's enter step and LEAVES on its exit step, both at
 *  the real shipped duration. How long it stays in between is the READER's, which is also true of every
 *  real popper — the system names no dwell value, and this page does not invent one. At rest the chip
 *  is simply absent: nothing animates on mount (see rule 2). */
function TierSpecimen({ tier, enter, exit }: { tier: string; enter: string; exit: string }) {
  const [phase, setPhase] = useState<"" | "in" | "out">("");
  const shown = phase === "in";
  return (
    <Flex align="center" gap="3">
      {/* The control comes first: at rest the chip's slot is empty (nothing has arrived yet), and a
          24px hole to the LEFT of the button reads as a layout fault rather than as an empty stage. */}
      <Button
        priority="tertiary"
        aria-label={`${shown ? "Close" : "Open"} the ${tier}-tier specimen`}
        onClick={() => setPhase(shown ? "out" : "in")}
      >
        {shown ? "Close" : "Open"}
      </Button>
      <Box style={{ width: 24, height: 24, flexShrink: 0 }}>
        <div
          className="ds-motion-chip"
          data-phase={phase || undefined}
          style={{ "--ds-chip-in": `var(${enter})`, "--ds-chip-out": `var(${exit})` } as CSSProperties}
        />
      </Box>
    </Flex>
  );
}

/* The easing lane's four tracks — name · plot · travel · use — named once because the Replay control
   below the lanes offsets itself by the first two so it lands under the chips it moves. Geometry, not
   spacing: these size the specimen itself, the way the type ramp's lane widths do. */
const EASE_NAME_W = 104;
const EASE_PLOT_W = 56;
const EASE_TRACK_W = 160;
const EASE_CHIP_PX = 24;
const EASE_TRAVEL = EASE_TRACK_W - EASE_CHIP_PX;

/** cubic-bezier(x1,y1,x2,y2) → an SVG path from bottom-left (0,100) to top-right (100,0). */
function bezierPath(curve: string): string {
  const m = curve.match(/cubic-bezier\(([^)]+)\)/);
  if (!m) return "M0,100 L100,0";
  const [x1, y1, x2, y2] = m[1].split(",").map((n) => parseFloat(n));
  const f = (n: number) => (n * 100).toFixed(1);
  return `M0,100 C${f(x1)},${f(1 - y1)} ${f(x2)},${f(1 - y2)} 100,0`;
}

/* ---- section 1: a real component, measured ------------------------------------------------------
 * The panel below takes ZERO motion CSS from this page. It carries the shared `.rt-PopperContent`
 * base class, which components.css binds to the popper tier, and the rows underneath read that
 * binding back off a real, mounted panel. A story that hand-writes its own keyframes and then calls
 * itself proof of the token layer is proving its own <style> block. */
function LivePopover() {
  return (
    <Popover.Root>
      <Popover.Trigger>
        <Button priority="secondary">Open a popover</Button>
      </Popover.Trigger>
      <Popover.Content width="264px" aria-label="Popper motion demonstration">
        <Text as="p" size="2" style={{ color: "var(--ds-text-weak)", lineHeight: 1.6 }}>
          Nothing on this page times this panel. It opens on the popper tier because every floating
          surface in the system does, and it scales from the trigger it came out of.
        </Text>
      </Popover.Content>
    </Popover.Root>
  );
}

/** The popper timing, read off two real panels rather than transcribed. One instance is CLOSED (its
 *  exit pair is what a closed panel computes) and one is held OPEN, so both halves of the pair have a
 *  panel to be read from; both are `forceMount`ed and portaled into the MeasuredSpec host, which is
 *  visibility:hidden — off screen, out of the a11y tree, out of axe, still computing full styles.
 *  This is Popover's own token-spec recipe, one page up. */
function PopperTimingSpec() {
  return (
    <MeasuredSpec
      render={(host) => (
        <>
          <Popover.Root>
            <Popover.Anchor />
            <Popover.Content forceMount container={host} aria-label="Popover exit-timing measurement" />
          </Popover.Root>
          {/* Controlled and never changed, so the panel cannot be dismissed out from under the rows.
              `onOpenAutoFocus` is prevented because the host is hidden and focus has nowhere to land;
              it touches no painted value, so it cannot touch what is measured. */}
          <Popover.Root open>
            <Popover.Anchor />
            <Popover.Content
              forceMount
              container={host}
              onOpenAutoFocus={(e) => e.preventDefault()}
              aria-label="Popover enter-timing measurement"
            />
          </Popover.Root>
        </>
      )}
    >
      <MeasuredRow
        part="Enter · duration"
        note="What an opening panel is given to arrive in."
        token="--ds-duration-overlay"
        select='.rt-PopoverContent[data-state="open"]'
        prop="animation-duration"
      />
      {/* No `note` on the two curve rows: a cubic-bezier is too long for the value track and the row
          gives it a second line of its own, so a note above it only pushes the two further apart. */}
      <MeasuredRow
        part="Enter · curve"
        token="--ds-ease-entry"
        select='.rt-PopoverContent[data-state="open"]'
        prop="animation-timing-function"
      />
      <MeasuredRow
        part="Exit · duration"
        note="Longer than the entrance, by the rule."
        token="--ds-duration-emphasis"
        select='.rt-PopoverContent[data-state="closed"]'
        prop="animation-duration"
      />
      <MeasuredRow
        part="Exit · curve"
        token="--ds-ease-standard"
        select='.rt-PopoverContent[data-state="closed"]'
        prop="animation-timing-function"
      />
    </MeasuredSpec>
  );
}

function MotionPage() {
  // One shared position for all four easing chips, so they stay in phase and the curve is the only
  // difference between them. Each press moves them to the other end; the timing function always plays
  // FORWARD, so what you watch is the curve that is plotted beside it.
  const [easeAt, setEaseAt] = useState(0);

  return (
    <Page maxWidth={860}>
      <PageHeader
        title="Motion · Durations"
        standfirst="Motion has one job: confirm that something changed. If nothing changed state, nothing moves. Two rules decide the rest — a control you are operating right now moves instantly, and a surface that arrives on its own comes in fast and leaves slow. Each duration is named for the interaction it serves, not its millisecond value. Every specimen here runs once, at its real shipped duration, when you ask it to; under prefers-reduced-motion every step collapses to 0.01ms and nothing on the page moves at all."
      />

      <Section
        title="Durations, on a real component"
        lead={<>Open it, then close it: the panel arrives in {durationValue("--ds-duration-overlay")} and takes {durationValue("--ds-duration-emphasis")} to leave. Nothing on this page times it — the rows underneath are read off a real, mounted panel and checked against the tokens they name.</>}
      >
        <Box style={{ width: "fit-content" }}><LivePopover /></Box>
        <PopperTimingSpec />
        <Caption>
          The test of whether a story proves anything is what happens when you delete its animation
          CSS. This one has none to delete. The values above come from{" "}
          <Token>.rt-PopperContent</Token> — the class every menu, popover, HoverCard and flyout
          carries — so the same four numbers are what those surfaces run.
        </Caption>
      </Section>

      <Rule />

      <Section
        title="Two rules"
        lead="They pull in opposite directions on purpose: the first is about not getting in the way, the second about not vanishing before you have followed it. The first spends one step of the ladder; the second spends the rest of it."
      >
        <Flex direction="column" gap="3">
          <RuleCard title="1 · Direct manipulation is instant">
            A control you are operating right now — a button, a checkbox, a text field, a select
            trigger, a slider thumb — has no transition at all. Under the finger, easing reads as lag,
            not polish. The switch and the segmented control are the two earned exceptions: their
            thumb <em>travel</em> is the affordance, so it rides{" "}
            <Token>--ds-duration-micro</Token>, the shortest step that reads as travel rather than a
            jump.
          </RuleCard>
          <RuleCard title="2 · Ambient surfaces are faster in, slower out">
            A tooltip, menu, panel, dialog or toast arrives on its own schedule. It enters quickly —
            it is the thing you asked for — and leaves unhurriedly, because it has already been read
            and yanking it away pulls the eye back to something that no longer matters. An exit
            therefore runs <strong>longer</strong> than its own entrance and takes{" "}
            <Token>--ds-ease-standard</Token>, which decelerates, so it reads as settling rather than
            stalling. The only shipped surface with an animated exit shorter than its entrance is the{" "}
            <Token>Overlay</Token> scrim: a plain opacity fade over a still image has nothing to stay
            legible for. And an entrance fires on <em>open</em>, never on mount — a surface already on
            screen when the page paints is simply <em>there</em>. <Token>SideNav</Token> implements
            that literally, behind a <Token>data-animate</Token> attribute the first paint does not
            carry.
          </RuleCard>
        </Flex>
      </Section>

      <Rule />

      <Section
        title="The ladder — by how much the surface interrupts"
        lead={<>Every pair on the ladder is one row of this table: how far a surface intrudes decides which two steps it takes, and the exit is always the longer of the two. Enters take <Token>--ds-ease-entry</Token>, exits the decelerating <Token>--ds-ease-standard</Token>. The values are read from the token file — open and close each row to watch it at the real speed.</>}
      >
        <Box style={{ overflowX: "auto" }}>
          <Table.Root>
            <Table.Header>
              <Table.Row>
                <Table.ColumnHeaderCell>Tier</Table.ColumnHeaderCell>
                <Table.ColumnHeaderCell>Surface</Table.ColumnHeaderCell>
                <Table.ColumnHeaderCell>Enter</Table.ColumnHeaderCell>
                <Table.ColumnHeaderCell>Exit</Table.ColumnHeaderCell>
                <Table.ColumnHeaderCell>Watch it</Table.ColumnHeaderCell>
              </Table.Row>
            </Table.Header>
            <Table.Body>
              {TIERS.map((t) => (
                <Table.Row key={t.tier}>
                  <Table.RowHeaderCell>{t.tier}</Table.RowHeaderCell>
                  <Table.Cell>{t.surface}</Table.Cell>
                  <Table.Cell>
                    <Token>{t.enter.replace("--ds-duration-", "")}</Token>{" "}
                    <Mono muted>{durationValue(t.enter)}</Mono>
                  </Table.Cell>
                  <Table.Cell>
                    <Token>{t.exit.replace("--ds-duration-", "")}</Token>{" "}
                    <Mono muted>{durationValue(t.exit)}</Mono>
                  </Table.Cell>
                  <Table.Cell>
                    <TierSpecimen tier={t.tier} enter={t.enter} exit={t.exit} />
                  </Table.Cell>
                </Table.Row>
              ))}
            </Table.Body>
          </Table.Root>
        </Box>
        <Caption>
          Three steps sit outside the pairs: <Token>--ds-duration-instant</Token>{" "}
          ({durationValue("--ds-duration-instant")}) is the switch's press feedback,{" "}
          <Token>--ds-duration-micro</Token> ({durationValue("--ds-duration-micro")}) carries the switch
          and segmented-control thumb the same in both directions because travel is not an arrival, and{" "}
          <Token>--ds-duration-advanced</Token> ({durationValue("--ds-duration-advanced")}) is the
          ladder's top step with no shipped consumer. The ladder's reach ends there too: a loop's period
          is intrinsic to the loop, so the two ambient loops this system authors carry a literal duration
          instead of a step — and each declares its own reduced-motion silence, because the clamp only
          reaches values that came from the ladder.
        </Caption>
      </Section>

      <Rule />

      <Section
        title="Easing — the shape of the motion"
        lead="A curve's shape tells you how an element accelerates through its transition. Each one plots progress (vertical) against time (horizontal) — the dashed line is linear for reference, and the chip beside it moves on that exact curve."
      >
        <Flex direction="column" gap="4">
          {EASINGS.map(([token, curve]) => (
            <Flex key={token} align="center" gap="4">
              <Box style={{ width: EASE_NAME_W, flexShrink: 0 }}>
                <Token>{token.replace("--ds-", "")}</Token>
              </Box>
              <svg width={EASE_PLOT_W} height={EASE_PLOT_W} viewBox="-6 -6 112 112" style={{ flexShrink: 0 }} aria-hidden="true">
                <line x1="0" y1="100" x2="100" y2="0" stroke="var(--ds-stroke-weak)" strokeWidth="1.5" strokeDasharray="4 5" />
                <path d={bezierPath(curve)} fill="none" stroke="var(--ds-fill-accent)" strokeWidth="3" strokeLinecap="round" />
              </svg>
              <Box style={{ width: EASE_TRACK_W, height: EASE_CHIP_PX, flexShrink: 0 }}>
                <div
                  className="ds-ease-chip"
                  style={{ transitionTimingFunction: curve, transform: `translateX(${easeAt * EASE_TRAVEL}px)` }}
                />
              </Box>
              <Text size="2" style={{ color: "var(--ds-text-weak)" }}>{EASING_USE[token]}</Text>
            </Flex>
          ))}
          {/* The control sits directly under the track it drives — the two lane widths and the two
              gaps between them, so it lines up with the four chips rather than floating under the
              names. The offset is built from the same constants the lanes use. */}
          <Box style={{ marginLeft: `calc(${EASE_NAME_W}px + ${EASE_PLOT_W}px + var(--ds-space-16) * 2)` }}>
            <Button priority="secondary" onClick={() => setEaseAt((a) => (a ? 0 : 1))}>
              Replay all four
            </Button>
          </Box>
        </Flex>
        <Caption>
          All four chips move together and share one duration —{" "}
          <Token>--ds-duration-emphasis</Token> ({durationValue("--ds-duration-emphasis")}) — so the only
          thing that differs between the lanes is the curve. The timing function plays forward in both
          directions: what you watch is the curve that is plotted beside it, never its mirror image.
        </Caption>
      </Section>

      <Rule />

      <Section
        title="What moves — and what never does"
        lead="Stay on the compositor. The verdicts run in both directions: the first row is always safe, the last is never right."
      >
        <Box style={{ overflowX: "auto" }}>
          <Table.Root>
            <Table.Header>
              <Table.Row>
                <Table.ColumnHeaderCell>Verdict</Table.ColumnHeaderCell>
                <Table.ColumnHeaderCell>Properties</Table.ColumnHeaderCell>
                <Table.ColumnHeaderCell>Why</Table.ColumnHeaderCell>
              </Table.Row>
            </Table.Header>
            <Table.Body>
              {ANIMATABLE.map((r) => (
                <Table.Row key={r.verdict}>
                  <Table.RowHeaderCell>{r.verdict}</Table.RowHeaderCell>
                  <Table.Cell><Token>{r.properties}</Token></Table.Cell>
                  <Table.Cell>{r.why}</Table.Cell>
                </Table.Row>
              ))}
            </Table.Body>
          </Table.Root>
        </Box>
        <Caption>
          The one sanctioned layout animation is a collapsible's height, and only through the Radix
          variable — <Token>var(--radix-accordion-content-height)</Token> /{" "}
          <Token>var(--radix-collapsible-content-height)</Token> — which resolves the measured height so
          the keyframe has a real value to land on. A keyframed open/close also <em>restarts</em> when you
          interrupt it rather than reversing: an animation begins at its own first keyframe, not at the
          value the interrupted run had reached.
        </Caption>
      </Section>

      <style>{
        /* Both specimens reference the ladder through `var(--ds-duration-*)`, so the reduced-motion
           clamp in motion.css reaches them. Neither loops, so neither needs a rule of its own. */
        ".ds-motion-chip { width: 24px; height: 24px; border-radius: var(--ds-radius-2); background: var(--ds-fill-accent); opacity: 0; }" +
        '.ds-motion-chip[data-phase="in"]  { animation: dsChipIn  var(--ds-chip-in)  var(--ds-ease-entry)    both; }' +
        '.ds-motion-chip[data-phase="out"] { animation: dsChipOut var(--ds-chip-out) var(--ds-ease-standard) both; }' +
        "@keyframes dsChipIn  { from { opacity: 0; transform: scale(0.7) } to { opacity: 1; transform: scale(1)   } }" +
        "@keyframes dsChipOut { from { opacity: 1; transform: scale(1)   } to { opacity: 0; transform: scale(0.7) } }" +
        ".ds-ease-chip { width: 24px; height: 24px; border-radius: var(--ds-radius-2); background: var(--ds-fill-accent);" +
        "  transition-property: transform; transition-duration: var(--ds-duration-emphasis); }"
      }</style>
    </Page>
  );
}

const meta: Meta<typeof MotionPage> = {
  title: "Foundations/Motion",
  component: MotionPage,
  parameters: {
    docs: {
      description: {
        component:
          "Motion here has one job: to show that something changed — appeared, left, expanded, " +
          "responded to a tap. If nothing changed state, nothing moves. Two rules follow from that: " +
          "**a control you are operating right now is instant** (easing under the finger reads as lag), " +
          "and **a surface that arrives on its own is faster in, slower out** (it enters quickly because " +
          "you asked for it, and leaves unhurriedly because you have already read it). Durations are " +
          "named for what they're for rather than their millisecond count. Every specimen on the page " +
          "runs once, on demand, at its real shipped duration — nothing loops, and under reduced motion " +
          "every step collapses to 0.01ms.",
      },
    },
  },
};
export default meta;
type Story = StoryObj<typeof MotionPage>;

/** Walk all stylesheets (incl. @imports) looking for the reduced-motion override. */
function reducedMotionCollapses(): boolean {
  const visit = (rules: CSSRuleList | undefined): boolean => {
    if (!rules) return false;
    for (const rule of Array.from(rules)) {
      if (rule instanceof CSSImportRule) {
        try { if (visit(rule.styleSheet?.cssRules)) return true; } catch { /* cross-origin */ }
      } else if (rule instanceof CSSMediaRule) {
        if (rule.media.mediaText.includes("prefers-reduced-motion")) {
          const text = rule.cssText;
          if (text.includes("--ds-duration") && /0\.0\d*ms|0ms/.test(text)) return true;
        }
        if (visit(rule.cssRules)) return true;
      }
    }
    return false;
  };
  for (const sheet of Array.from(document.styleSheets)) {
    try { if (visit(sheet.cssRules)) return true; } catch { /* cross-origin */ }
  }
  return false;
}

export const Durations: Story = {
  render: (_args, { globals }) => (
    // The measured rows re-read on any toolbar flip. Timing is appearance-invariant, so the values do
    // not move — but a table that only ever reads once cannot be trusted to say so.
    <HexThemeKey.Provider value={`${globals.accent}-${globals.appearance}-${globals.contrast}`}>
      <MotionPage />
    </HexThemeKey.Provider>
  ),
  play: async ({ canvasElement }) => {
    const root = themeRoot(canvasElement);
    if (!DURATIONS.length || !EASINGS.length || !STAGGER) {
      throw new Error("motion.css ?raw parse produced no duration/easing/stagger tokens");
    }
    // Parsed-from-file value must equal what the browser computes — proves the
    // table reads the live tokens and that every token is actually applied.
    const all: [string, string][] = [...DURATIONS, ...EASINGS, ["--ds-stagger-step", STAGGER]];
    for (const [token, fileValue] of all) {
      const domValue = resolve(root, token);
      if (domValue !== fileValue) throw new Error(`${token}: file "${fileValue}" ≠ DOM "${domValue}"`);
    }
    if (!reducedMotionCollapses()) {
      throw new Error("No prefers-reduced-motion override collapsing --ds-duration-* found in CSS");
    }
    // The popper-timing table's EVIDENCE, asserted at runtime ([[measured-token-rows]]) — the panels are portaled into the
    // measurement host, so this proves the rows read REAL mounted panels rather than a probe, and that
    // the page's central claim (this system times a real component) is measured rather than asserted.
    const rows = await awaitMeasuredRows(canvasElement, { rows: 4 });
    if (rows.measured !== 4 || rows.unproven !== 0) {
      throw new Error(`expected 4 measured / 0 unproven token rows, got ${rows.measured} / ${rows.unproven}`);
    }
  },
};
