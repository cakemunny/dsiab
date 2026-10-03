import { type ReactNode, useLayoutEffect, useRef, useState } from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { Box, Code, Flex, Grid } from "@radix-ui/themes";
import { ArrowRight, CaretRight, Check, Download, Plus, Trash, Upload } from "@phosphor-icons/react";
import { Button, type ButtonPriority } from "./Button";
import { ButtonGroup } from "./ButtonGroup";
import { Text as UIText } from "./Text";
import {
  AccentColor, AnatomyLegend, Caption, Decision, DoDont, DODONT_LABEL, dotStyle, HexThemeKey, hLine, MeasuredRow,
  MeasuredSpec, NoteRow, Page, PageHeader, PropsLead, PropDef, PropTable, Rule, Scenario, Section, tick,
  TokenGroup,
} from "./_storyKit";
import { assertMeasuredRows, parseColor, resolveColor, themeRoot, withAccent } from "../../foundations/_assert";

/** The one definition of this component — the standfirst every page of it opens with. */
const DEFINITION = (
  <>
    The system button speaks in <Code>priority</Code>, not raw Radix variants. <Code>priority</Code> names
    the weight of an action — <Code>primary</Code> (solid), <Code>secondary</Code> (surface, the default),{" "}
    <Code>tertiary</Code> (ghost) — so the choice is about intent, not appearance. One rule carries the rest:
    one solid primary per page, which keeps a solid fill meaning “this is the action.”
  </>
);

const variantOf = (b: HTMLElement) =>
  Array.from(b.classList).find((c) => c.startsWith("rt-variant-"))?.replace("rt-variant-", "");

/* ---- anatomy diagram (Button-specific) ------------------------------------
   The button centres via flex (so it never wraps or gets width-constrained) and the specimen is
   fixed at size 3 — a stable spec reference. Below ~340px the wrapper scrolls.

   Every callout is MEASURED off that live specimen rather than parked at a hand-computed offset: a
   dot takes its x from the part it names and its y from that part's own edge, read in a layout
   effect and re-read by a ResizeObserver on the frame and the specimen. A pinned number drifts the
   moment the label, the type step, the radius or the control lane moves — and had: both icon
   callouts sat 4px off the glyph they name. */

/** Where a callout sits and what it points at.
 *  `gutter` — the dot parks in the left gutter and runs a leader in to the part's LEFT edge; `at`
 *  picks the y it lands on (the container's top edge, or the focus ring's bottom).
 *  `over` — the dot sits above the specimen on the part's own CENTRE line and drops a tick to the
 *  first edge below it; `lane` is how far above that edge the tick starts, so the label's callout
 *  clears the two icon callouts instead of landing in their row. */
type Pin =
  | { n: number; part: string; place: "gutter"; at: "top" | "bottom" }
  | { n: number; part: string; place: "over"; lane: number };

/** The box every `over` tick stops on, so a callout over a glyph INSIDE the button never draws
 *  across its fill. */
const CONTAINER = ".rt-Button";
const DOT = 20; // dotStyle's diameter
const LEADER = 42; // the shortest gutter leader — the dots share one x, so the others stretch
const LANE = { icon: 19, label: 37 };

const PINS: Pin[] = [
  { n: 1, part: CONTAINER, place: "gutter", at: "top" },
  { n: 2, part: "[data-part='focus-ring']", place: "gutter", at: "bottom" },
  { n: 3, part: `${CONTAINER} > svg:first-child`, place: "over", lane: LANE.icon },
  { n: 4, part: "[data-part='label']", place: "over", lane: LANE.label },
  { n: 5, part: `${CONTAINER} > svg:last-child`, place: "over", lane: LANE.icon },
];

function AnatomyDiagram() {
  const frame = useRef<HTMLDivElement>(null);
  const specimen = useRef<HTMLDivElement>(null);
  const [pins, setPins] = useState<Record<number, { x: number; y: number }>>({});
  /** One x for every gutter dot, so they stack in a column — taken off the leftmost part. */
  const [gutter, setGutter] = useState<number | null>(null);

  useLayoutEffect(() => {
    const f = frame.current;
    const s = specimen.current;
    if (!f || !s) return;
    const measure = () => {
      const box = s.querySelector<HTMLElement>(CONTAINER);
      if (!box) return;
      const fr = f.getBoundingClientRect();
      const stop = box.getBoundingClientRect().top;
      const next: Record<number, { x: number; y: number }> = {};
      let leftmost = Infinity;
      for (const p of PINS) {
        const el = s.querySelector<HTMLElement>(p.part);
        if (!el) continue;
        const r = el.getBoundingClientRect();
        if (p.place === "gutter") {
          const x = Math.round(r.left - fr.left);
          next[p.n] = { x, y: Math.round((p.at === "top" ? r.top : r.bottom) - fr.top) };
          leftmost = Math.min(leftmost, x);
        } else {
          // the tick stops at whichever edge it reaches first — the part's own top, or the
          // container's — so a callout over a glyph inside the button stops at the button.
          next[p.n] = {
            x: Math.round(r.left + r.width / 2 - fr.left),
            y: Math.round(Math.min(r.top, stop) - fr.top),
          };
        }
      }
      setPins(next);
      setGutter(Number.isFinite(leftmost) ? leftmost - LEADER - DOT : null);
    };
    measure();
    let raf = 0;
    const ro = new ResizeObserver(() => { cancelAnimationFrame(raf); raf = requestAnimationFrame(measure); });
    ro.observe(f);
    ro.observe(s);
    return () => { cancelAnimationFrame(raf); ro.disconnect(); };
  }, []);

  return (
    <Box style={{ overflowX: "auto" }}>
      <Box ref={frame} style={{ position: "relative", width: "100%", minWidth: 340, maxWidth: 600, margin: "0 auto", height: 210, background: "var(--ds-bg-subtle)", borderRadius: "var(--ds-radius-4)", overflow: "hidden" }}>
        <Flex align="center" justify="center" style={{ position: "absolute", inset: 0 }}>
          <Box ref={specimen} style={{ position: "relative" }}>
            {/* focus-ring overlay — the two layers the control paints ([[focus-ring]]): the accent base, then the Radix alpha stacked on it */}
            <Box aria-hidden data-part="focus-ring" style={{ position: "absolute", inset: -2, borderRadius: "var(--ds-radius-3)", outline: "2px solid var(--ds-stroke-focus)", outlineOffset: 2, pointerEvents: "none" }} />
            <Box aria-hidden style={{ position: "absolute", inset: -2, borderRadius: "var(--ds-radius-3)", outline: "2px solid var(--ds-stroke-focus-stack)", outlineOffset: 2, pointerEvents: "none" }} />
            <Button priority="secondary" size="3" data-size-lesson="anatomy callout geometry">
              <Plus weight="bold" />
              <span data-part="label">Add member</span>
              <ArrowRight weight="bold" />
            </Button>
          </Box>
        </Flex>
        {PINS.map((p) => {
          const a = pins[p.n];
          if (!a) return null;
          if (p.place === "gutter") {
            if (gutter == null) return null;
            return (
              <Box key={p.n}>
                <Box style={{ ...dotStyle, left: gutter, top: a.y - DOT / 2 }}>{p.n}</Box>
                <Box style={hLine({ left: gutter + DOT, top: a.y, width: a.x - gutter - DOT })} />
              </Box>
            );
          }
          return (
            <Box key={p.n}>
              <Box style={{ ...dotStyle, left: a.x - DOT / 2, top: a.y - p.lane - DOT }}>{p.n}</Box>
              <Box style={tick({ left: a.x, top: a.y - p.lane, height: p.lane })} />
            </Box>
          );
        })}
      </Box>
    </Box>
  );
}

const ANATOMY_PARTS: [number, string, string][] = [
  [1, "Container", "the clickable surface — fill, border, height, padding"],
  [2, "Focus ring", "keyboard-focus indicator, offset 2px"],
  [3, "Leading icon", "optional — modifies the action (add, upload)"],
  [4, "Label", "required — the accessible name; sets min width"],
  [5, "Trailing icon", "optional — signals movement (continue, open)"],
];

/* ========================================================================== */

const meta: Meta<typeof Button> = {
  title: "Components/Action/Button",
  component: Button,
  // The one axe exclusion is the DO/DON'T word, which reads 4.10:1 on its own tint by design
  // (DODONT_LABEL in _storyKit.tsx). The solid primary stays in the check ([[text-on-solid-fill-contrast]]).
  parameters: {
    a11y: { context: { exclude: [DODONT_LABEL] } },
    // The docs stories use custom render() and don't read args, so the Controls panel is dead there.
    // Hidden by default; the Props story re-enables it. (Accessibility + Interactions stay on.)
    controls: { disable: true },
    docs: {
      description: {
        component:
          "The system button speaks in **priority**, not raw Radix variants. `priority` names the " +
          "weight of an action — **primary** (solid), **secondary** (surface, the default), and " +
          "**tertiary** (ghost) — so each choice is about intent, not appearance. The flat " +
          "variants `soft`, `outline`, and `classic` aren’t exposed, so a button can’t drift " +
          "off-system by accident. One rule carries the rest: **one solid primary per page**, which " +
          "keeps a solid fill meaning “this is the action.”",
      },
    },
  },
};
export default meta;
type Story = StoryObj<typeof Button>;

/** The parts of a button — a labeled diagram — plus the content slots and the states it can take.
 *  The token spec that used to close this page now closes Usage. */
export const Anatomy: Story = {
  render: () => (
    <Page>
      <PageHeader title="Button · Anatomy" standfirst={DEFINITION} />
      <Section title="Anatomy" lead="The secondary (surface) variant is shown — it surfaces the most: a fill, a visible edge, and both icon slots.">
        <AnatomyDiagram />
        <AnatomyLegend parts={ANATOMY_PARTS} />
        <Caption>
          The leading and trailing icons are optional; the label is required — it’s the button’s
          accessible name. The container also carries <strong>optical padding</strong>: a small
          internal inset so the label never sits flush to the edge.
        </Caption>
      </Section>

      <Rule />

      <Section title="Content" lead="Icon position carries meaning — it isn’t decoration.">
        <Flex gap="3" align="center" wrap="wrap">
          <Button priority="secondary"><Plus weight="bold" /> Add member</Button>
          <Button priority="secondary">Continue <ArrowRight weight="bold" /></Button>
          <Button priority="secondary">Export</Button>
        </Flex>
        <Caption>
          A <strong>leading</strong> icon modifies the action (add, upload, delete). A{" "}
          <strong>trailing</strong> icon signals movement (continue, open, expand). Label-only is the
          neutral default. Icons take <Code>weight="bold"</Code> to match the label’s weight.
        </Caption>
      </Section>

      <Rule />

      <Section title="States" lead="Beyond rest, hover, and focus — which appear as you point at and tab through the buttons.">
        <Flex gap="3" align="center" wrap="wrap">
          <Button priority="primary">Enabled</Button>
          <Button priority="primary" disabled>Disabled</Button>
          <Button priority="primary" loading>Saving</Button>
        </Flex>
        <Caption>
          <strong>Disabled</strong> is intentionally low-contrast (WCAG-exempt — GUIDELINES §9) —
          prefer guiding the user toward a valid action over silently disabling one.{" "}
          <strong>loading</strong> swaps the label for a spinner and blocks input while holding the
          button’s size, so the layout doesn’t jump.
        </Caption>
        <Caption>
          <strong>Focus:</strong> on keyboard focus (<Code>:focus-visible</Code>) the button takes the
          system focus ring ([[focus-ring]]). The ring is the accent (<Code>--ds-stroke-focus</Code>) with a Radix
          alpha (<Code>--ds-stroke-focus-stack</Code>) stacked on it. It is 2px wide and sits 2px outside
          the button. It clears 3:1 and APCA Lc 30 on every surface, for every accent, in both modes. It is
          the same ring on every control.
        </Caption>
        <Caption>
          <strong>Interaction &amp; motion:</strong> each grade answers a pointer differently, and the token
          table that closes <strong>Usage</strong> is measured off each one. <strong>Primary</strong> darkens its fill one step on hover and
          holds that step through the press. <strong>Tertiary</strong> tints on hover and deepens again on press.
          <strong> Secondary</strong> does not move its fill on hover at all — it deepens its edge, and the fill
          appears only under the press. Those transitions ride the GUIDELINES §7 ladder — the hover background over{" "}
          <Code>--ds-duration-micro</Code>, press at <Code>--ds-duration-instant</Code>, colour + focus
          over <Code>--ds-duration-fast</Code> — all honouring reduced-motion.
        </Caption>
      </Section>
    </Page>
  ),
};

/* ---- Properties (Button-specific) ---------------------------------------- */

const BUTTON_PROPS: PropDef[] = [
  { name: "priority", type: `"primary" | "secondary" | "tertiary"`, def: `"secondary"`, desc: <>The system’s button vocabulary → Radix <Code>solid</Code>/<Code>surface</Code>/<Code>ghost</Code>. <strong>primary</strong> is the one solid per page; <strong>secondary</strong> (default) is a surface; <strong>tertiary</strong> recedes to text.</>, source: "Button.tsx:23" },
  { name: "variant", type: `"solid" | "surface" | "ghost" | …`, locked: true, desc: <>Radix’s raw variant is <strong>not exposed</strong> — <Code>priority</Code> owns it, so a button can’t drift off-system. <Code>soft</Code>, <Code>outline</Code>, and <Code>classic</Code> are intentionally unavailable.</>, source: "Button.tsx:21" },
  { name: "size", type: `"1" | "2" | "3" | "4"`, desc: <>Control size. Unset, it resolves from the global <Code>uiSize</Code> (default <Code>small</Code> → <Code>1</Code>); Radix’s own default is <Code>2</Code>. Set explicitly for a standalone or hero button.</>, source: "Button.tsx:27 · Radix" },
  { name: "tone", type: `"danger"`, desc: <>Destructive intent — re-paints the grade from the accent-aware error family. Orthogonal to <Code>priority</Code>. Never use Radix’s <Code>color</Code> for this — it bypasses the brand-collision shift.</>, source: "Button.tsx" },
  { name: "loading", type: "boolean", def: "false", desc: <>Swaps the label for a spinner and blocks input while holding the button’s size, so the layout doesn’t jump.</>, source: "Radix" },
  { name: "disabled", type: "boolean", def: "false", desc: <>Disables the button. Intentionally low-contrast (WCAG-exempt) — prefer guiding toward a valid action over silently disabling one.</>, source: "Radix" },
  { name: "children", type: "ReactNode", desc: <>The visible label — also the button’s accessible name. Optional leading/trailing Phosphor icons compose inline at <Code>weight="bold"</Code>.</>, source: "Radix" },
  { name: "onClick", type: "(e) => void", desc: <>Click handler; fires on pointer and keyboard activation.</>, source: "Radix" },
];

/** Usage: which grade to pick, the component in real situations, the guidance that protects the
 *  budget, and — closing the page — the live token spec measured off each grade. */
export const Usage: Story = {
  // Scoped exceptions; the rest of the page IS contrast-checked. Two of them:
  //   DODONT_LABEL   the DO/DON'T word only — the specimens inside the cards are now checked, which the
  //                  old whole-card "[data-dodont]" carve-out prevented. Overrides the meta's array.
  //   danger buttons red-11 ink on the surface variant's tint, #ce2c31 on #fbe8ea = 4.42 (light), ink on a
  //                  tint and not a solid fill. Flagged rather than changed here. The selector also
  //                  covers the solid danger button, which entered at white on the red-9 solid #e5484d,
  //                  3.91, under the retired 3:1 floor for text on a solid fill. [[text-on-solid-fill-contrast]]
  //                  replaced that floor with 4.5:1 and APCA Lc 60 and moved the danger fill to
  //                  --error-solid, and no current ruling excuses the solid danger button.
  parameters: { a11y: { context: { exclude: [DODONT_LABEL, ".rt-Button[data-tone='danger']"] } } },
  render: (_args, { globals }) => (
    <HexThemeKey.Provider value={`${globals.accent}-${globals.appearance}-${globals.contrast}`}>
      <Page>
        <PageHeader title="Button · Usage" standfirst={DEFINITION} />
        <Section title="Priority — the decision, not the style" lead="Reach for a grade by how much the action matters; the styling follows.">
          <Box data-testid="priority-ladder">
            <Flex gap="3" align="center" wrap="wrap">
              <Button priority="primary">Save changes</Button>
              <Button priority="secondary">Cancel</Button>
              <Button priority="tertiary">Learn more</Button>
            </Flex>
          </Box>
          <Caption>
            <strong>primary</strong> is a solid fill, reserved for the single most consequential action
            — so a solid always reads as “the one thing to do.” <strong>secondary</strong>{" "}
            is the default: a surface that stands distinct without competing. <strong>tertiary</strong>{" "}
            recedes to text for low-stakes, repeated, or utility actions.
          </Caption>
        </Section>

        <Rule />

        <Section
          title="In context"
          lead={<>Real situations, driven by the toolbar above — <strong>Accent</strong> re-skins each group, <strong>Size</strong> scales them, <strong>Appearance</strong> flips light and dark. The <em>Delete</em> action takes <Code>tone="danger"</Code> — accent-aware, so it follows a brand-collision shift instead of staying literal red.</>}
        >
          <Grid columns={{ initial: "1", sm: "2" }} gapX="6" gapY="5">
            <Scenario label="FORM FOOTER" caption="The common pair — one solid commit, one surface escape.">
              <ButtonGroup>
                <Button priority="primary">Save changes</Button>
                <Button priority="secondary">Cancel</Button>
              </ButtonGroup>
            </Scenario>

            <Scenario
              label="DESTRUCTIVE CONFIRM"
              caption={<>The one sanctioned exception to one-solid-per-page (GUIDELINES §5): the safe action keeps the accent solid, the destructive one takes <Code>tone="danger"</Code> (danger-solid) and reads first by position.</>}
            >
              <ButtonGroup order="primary-first">
                <Button priority="primary">Keep item</Button>
                <Button priority="primary" tone="danger"><Trash weight="bold" /> Delete permanently</Button>
              </ButtonGroup>
            </Scenario>

            <Scenario label="TOOLBAR" caption="Equal-weight utilities — no solid needed; not every cluster has a primary.">
              <ButtonGroup>
                <Button priority="secondary"><Plus weight="bold" /> Add member</Button>
                <Button priority="secondary">Export</Button>
              </ButtonGroup>
            </Scenario>

            <Scenario
              label="TRAILING ACTION"
              caption="Tertiary’s home — a low-stakes trailing action on a list header. A button always owns its box, so it keeps its own space; for an in-sentence, navigational link, reach for a text link instead."
            >
              <Flex
                align="center"
                justify="between"
                style={{ padding: "8px 0", borderTop: "1px solid var(--ds-stroke-weak)", borderBottom: "1px solid var(--ds-stroke-weak)" }}
              >
                <UIText style={{ color: "var(--ds-text-strong)" }}>Recent members</UIText>
                <Button priority="tertiary">View all <ArrowRight weight="bold" /></Button>
              </Flex>
            </Scenario>
          </Grid>
        </Section>

        <Rule />

        <Section
          title="Destructive — tone crosses the priority ladder"
          lead={<>Danger is <strong>orthogonal</strong> to priority: <Code>tone="danger"</Code> re-paints any grade from the accent-aware error family, so every emphasis level has a destructive form. It follows a brand-collision shift — never <Code>color="red"</Code>, which would bypass it and stay literal red.</>}
        >
          <Box data-testid="danger-ladder">
            <Flex gap="3" align="center" wrap="wrap">
              <Button priority="primary" tone="danger"><Trash weight="bold" /> Delete project</Button>
              <Button tone="danger">Remove member</Button>
              <Button priority="tertiary" tone="danger">Clear drafts</Button>
              <Button priority="primary" tone="danger" disabled><Trash weight="bold" /> Delete (disabled)</Button>
            </Flex>
          </Box>
          <Caption>
            <strong>Danger-solid</strong> (primary) is the confirm-dialog moment; <strong>danger-surface</strong>{" "}
            (secondary, the default grade) is an in-context delete; <strong>danger-ghost</strong> (tertiary) is a
            low-stakes destructive utility. Each carries a verb + object label, so colour is never the only cue
            (WCAG 1.4.1); a leading glyph reinforces the delete actions. Disabled danger greys out like any button —
            the paint rules gate on <Code>:not([data-disabled])</Code> (Radix’s own disabled marker, so it holds for{" "}
            <Code>asChild</Code> and loading too), so Radix’s disabled state always wins.
          </Caption>
        </Section>

        <Rule />

        <Section
          title="Button order — where the primary anchors"
          lead={<>A <Code>ButtonGroup</Code> anchors the primary (solid) action per the system <strong>buttonOrder</strong> — <Code>primary-first</Code> (left) by default, set once on <Code>Provider</Code> and previewable from the <strong>Btn order</strong> toolbar above. It reorders the DOM, so tab order always matches what’s on screen. A cluster that must read the other way takes a per-group <Code>order</Code> override.</>}
        >
          <Grid columns={{ initial: "1", sm: "2" }} gapX="6" gapY="5">
            <Scenario label="SYSTEM DEFAULT" caption={<>Follows the toolbar — flip <strong>Btn order</strong> to see the solid jump sides. (A group with no solid is left as authored.)</>}>
              <Box data-testid="order-default">
                <ButtonGroup>
                  <Button priority="primary">Save changes</Button>
                  <Button priority="secondary">Cancel</Button>
                </ButtonGroup>
              </Box>
            </Scenario>
            <Scenario label="PER-GROUP OVERRIDE" caption={<>One cluster pins its own order with <Code>order="primary-last"</Code> — keeping the commit on the right whatever the system default is set to.</>}>
              <Box data-testid="order-last">
                <ButtonGroup order="primary-last">
                  <Button priority="primary">Save changes</Button>
                  <Button priority="secondary">Cancel</Button>
                </ButtonGroup>
              </Box>
            </Scenario>
          </Grid>
        </Section>

        <Rule />

        <Section title="Spending the primary budget" lead="A page gets one solid — the discipline is choosing which action earns it. The most common misuse is spending it twice.">
          <Grid columns={{ initial: "1", sm: "2" }} gap="3">
            <DoDont kind="do" accent={globals.accent as AccentColor} note="One solid anchors the page; the surface alternative stays legible beside it.">
              <Button priority="primary">Save changes</Button>
              <Button priority="secondary">Cancel</Button>
            </DoDont>
            <DoDont kind="dont" accent={globals.accent as AccentColor} note="Two solids compete for the same attention — neither reads as the primary action.">
              <Button priority="primary">Save changes</Button>
              <Button priority="primary">Discard</Button>
            </DoDont>
          </Grid>
        </Section>

        <Rule />

        <Section title="Label — verb first, object named" lead="A button label is a micro-promise: say what happens, not just that something will.">
          <Grid columns={{ initial: "1", sm: "2" }} gap="3">
            <DoDont kind="do" accent={globals.accent as AccentColor} note="A verb plus an object tells you exactly what fires — no interpretation needed.">
              <Button priority="primary">Save changes</Button>
            </DoDont>
            <DoDont kind="dont" accent={globals.accent as AccentColor} note="When a specific action is available, a generic “Submit” hides it — you can’t tell whether the form saves, sends, or pays.">
              <Button priority="primary">Submit</Button>
            </DoDont>
            <DoDont kind="do" accent={globals.accent as AccentColor} note="Naming the object (“file”) removes ambiguity when more than one thing on the screen could be deleted.">
              <Button priority="primary" tone="danger"><Trash weight="bold" /> Delete file</Button>
            </DoDont>
            <DoDont kind="dont" accent={globals.accent as AccentColor} note="“OK” and “Yes” borrow their meaning from the dialog above — they fail in isolation and under time pressure.">
              <Button priority="primary">OK</Button>
            </DoDont>
          </Grid>
        </Section>

        <Rule />

        <Section title="Size — surface and prominence, not preference" lead="The system defaults to small for dense product UI; step up only when a button needs to carry more visual weight on its own.">
          <Flex gap="4" align="center" wrap="wrap" data-size-lesson="size matrix — the two steps side by side ARE the comparison">
            <Button priority="primary" size="2">Get started</Button>
            <Button priority="primary" size="3">Get started</Button>
          </Flex>
          <Caption>
            Size 2 (left) suits toolbars, form footers, and data-dense views — it sits in line without
            dominating. Size 3 (right) is for a standalone primary on a marketing page, an empty-state
            CTA, or a touch-first surface where the larger hit target earns the height. Size 4 is reserved
            for rare hero moments where the button is the sole focal point.
          </Caption>
          <Grid columns={{ initial: "1", sm: "2" }} gap="3" data-size-lesson="do/don't on mixing steps in one cluster — the pinned steps ARE the point">
            <DoDont kind="do" accent={globals.accent as AccentColor} note="A cluster’s actions share one size — the even rhythm tells you they’re peers.">
              <ButtonGroup>
                <Button priority="secondary" size="2"><Plus weight="bold" /> Add member</Button>
                <Button priority="secondary" size="2">Export</Button>
              </ButtonGroup>
            </DoDont>
            <DoDont kind="dont" accent={globals.accent as AccentColor} note="Mixed sizes in one cluster imply one action matters more — express that with priority, not size.">
              <ButtonGroup>
                <Button priority="secondary" size="3"><Plus weight="bold" /> Add member</Button>
                <Button priority="secondary" size="2">Export</Button>
              </ButtonGroup>
            </DoDont>
          </Grid>
          <Caption>
            When an action has no text label at all, that’s <Code>IconButton</Code>’s job — a{" "}
            <Code>Button</Code> always carries a visible label, which is its accessible name.
          </Caption>
        </Section>

        <Rule />

        <Section title="Tertiary is a button, not a link" lead="Tertiary recedes to text, but it’s still a button — it owns its box and its tap target. Inline, in-sentence navigation belongs to a text link.">
          <Grid columns={{ initial: "1", sm: "2" }} gap="3">
            <DoDont kind="do" accent={globals.accent as AccentColor} note="A low-stakes action that earns a button — dismiss, skip, learn more. It sits on its own, with its own space and target.">
              <Button priority="tertiary">Skip for now</Button>
            </DoDont>
            <DoDont kind="dont" accent={globals.accent as AccentColor} note="A button dropped mid-sentence breaks the text flow and the reading rhythm — inline navigation is a text link’s job, not a button’s.">
              <UIText style={{ color: "var(--ds-text-strong)" }}>
                Read the <Button priority="tertiary">full guidelines</Button> before continuing.
              </UIText>
            </DoDont>
          </Grid>
        </Section>

        <Rule />

        <Section title="Tokens" lead="Measured off a rendered button, not resolved from the token: each row names an element and a property, reads that property off a real Button, and reports whether it equals what the token it names resolves to — so a row can disagree with the component, and three of them did.">
          <Caption>
            <strong>What the grades paint from.</strong> Only the <strong>primary</strong> (solid) grade is a
            straight alias of the system’s roles. <strong>Secondary</strong> and <strong>tertiary</strong> reuse
            Radix’s own surface and ghost skins, which paint from Radix’s alpha steps directly — so those rows
            name the Radix token the skin uses, the same way a reused panel skin does. The label ink,{" "}
            <Code>--accent-a11</Code>, is the alpha twin of the step <Code>--ds-text-link</Code> names: it lands
            on the same colour on the page and composites correctly on a tinted surface.
          </Caption>
          <Flex direction="column" gap="4">
            <TokenGroup label="PRIMARY" blurb="The single most consequential action — one solid per page." specimen={<Button priority="primary">Button</Button>}>
              <MeasuredSpec render={() => <Button priority="primary">Button</Button>}>
                <MeasuredRow part="Container fill" token="--ds-fill-accent" select=".rt-Button" prop="background-color" />
                <MeasuredRow part="Container fill" state="hover" token="--ds-fill-accent" select=".rt-Button" prop="background-color"
                  note="The rest fill holds under hover and press, and --ds-fill-accent-hover lays a Radix alpha over it." />
                <MeasuredRow part="Label + icon" token="--on-accent" select=".rt-Button" prop="color" />
                <MeasuredRow part="Focus ring" state="focus-visible" token="--ds-stroke-focus" select=".rt-Button" prop="outline-color"
                  note="The accent base layer. A Radix alpha, --ds-stroke-focus-stack, sits on top of it ([[focus-ring]])." />
              </MeasuredSpec>
            </TokenGroup>
            <TokenGroup label="SECONDARY" blurb="The default — alternatives that stay distinct without competing." specimen={<Button priority="secondary">Button</Button>}>
              <MeasuredSpec render={() => <Button priority="secondary">Button</Button>}>
                <MeasuredRow part="Container fill" token="--accent-surface" select=".rt-Button" prop="background-color"
                  note="A near-white tinted surface, not the accent wash a ghost button uses." />
                <MeasuredRow part="Container fill" state="active" token="--ds-fill-accent-weak" select=".rt-Button" prop="background-color"
                  note="The fill appears on PRESS. Hover leaves it alone and deepens the edge instead." />
                <MeasuredRow part="Label + icon" token="--accent-a11" select=".rt-Button" prop="color" />
              </MeasuredSpec>
              <NoteRow part="Container edge" value="a 1px INSET ring drawn in the box-shadow, not a border — --accent-a7 at rest, --accent-a8 on hover; a colour inside a shadow list, so no single property carries it" />
            </TokenGroup>
            <TokenGroup label="TERTIARY" blurb="Low-stakes, repeated, or inline actions — recedes to text." specimen={<Button priority="tertiary">Button</Button>}>
              <NoteRow part="Container fill · rest" value="transparent" radix="—" />
              <MeasuredSpec render={() => <Button priority="tertiary">Button</Button>}>
                <MeasuredRow part="Container fill" state="hover" token="--ds-fill-accent-weak" select=".rt-Button" prop="background-color"
                  note="Deepens again on press, to --ds-fill-accent-med." />
                <MeasuredRow part="Label + icon" token="--accent-a11" select=".rt-Button" prop="color" />
              </MeasuredSpec>
            </TokenGroup>
            <TokenGroup label="ALL PRIORITIES">
              <NoteRow part="Shape (radius)" value="inherits <Theme radius>" radix="--radius-*" />
              <NoteRow part="Height" value="Radix internal" radix="--base-button-height" />
              <NoteRow part="Label type" value="control size lane" radix="--font-size-*" />
              <MeasuredSpec render={() => <Button priority="primary" disabled>Button</Button>}>
                <MeasuredRow part="Disabled fill" token="--ds-fill-disabled" select=".rt-Button" prop="background-color"
                  note="Read off a genuinely disabled button — every grade lands on the same neutral pair." />
                <MeasuredRow part="Disabled label" token="--ds-text-disabled" select=".rt-Button" prop="color" />
              </MeasuredSpec>
            </TokenGroup>
          </Flex>
        </Section>
      </Page>
    </HexThemeKey.Provider>
  ),
  play: async ({ canvasElement }) => {
    const ladder = canvasElement.querySelector('[data-testid="priority-ladder"]');
    if (!ladder) throw new Error("priority ladder not rendered");
    const got = Array.from(ladder.querySelectorAll<HTMLElement>("button.rt-Button")).map(variantOf);
    const want = ["solid", "surface", "ghost"];
    if (got.length !== 3 || want.some((w, i) => got[i] !== w)) {
      throw new Error(`priority→variant contract: expected ${want.join("/")}, got ${got.join("/")}`);
    }
    // [[destructive-tone]] — the DESTRUCTIVE CONFIRM's danger button is solid and attribute-driven (tone="danger"),
    // NOT Radix's color prop (a local data-accent-color would bypass the [[brand-collision-shift-table]]/[[oxblood-preset]]/[[brand-status-collision-gate]] collision layer).
    const confirmDanger = Array.from(canvasElement.querySelectorAll<HTMLElement>("button.rt-Button"))
      .find((b) => b.textContent?.includes("Delete permanently"));
    if (!confirmDanger) throw new Error("destructive confirm button not rendered");
    if (!confirmDanger.classList.contains("rt-variant-solid")) {
      throw new Error(`destructive confirm must be solid, got "${confirmDanger.className}"`);
    }
    if (confirmDanger.getAttribute("data-tone") !== "danger") {
      throw new Error("destructive confirm must carry data-tone='danger'");
    }
    if (confirmDanger.getAttribute("data-accent-color")) {
      throw new Error("danger must NOT set data-accent-color — Radix's color prop bypasses collision ([[destructive-tone]])");
    }

    // [[destructive-tone]] danger ladder — tone="danger" paints from the ACCENT-AWARE error family, asserted by
    // resolved bytes (never literal red, never data-accent-color). near() mirrors the sibling stories.
    const near = (a: number, b: number, tol = 6) => Math.abs(a - b) <= tol;
    const sameColor = (
      g: { r: number; g: number; b: number },
      w: { r: number; g: number; b: number },
    ) => near(g.r, w.r) && near(g.g, w.g) && near(g.b, w.b);
    const dangerLadder = canvasElement.querySelector('[data-testid="danger-ladder"]');
    if (!dangerLadder) throw new Error("danger ladder not rendered");
    const dangerSolid = Array.from(dangerLadder.querySelectorAll<HTMLElement>("button.rt-Button"))
      .find((b) => b.textContent?.includes("Delete project"));
    if (!dangerSolid) throw new Error("danger solid (Delete project) not rendered");
    const root = themeRoot(dangerSolid);
    // (a) the danger solid paints --ds-fill-error in the settled render (no accent flip → no transition race)
    const errFill = resolveColor(root, "--ds-fill-error");
    const solidBg = parseColor(getComputedStyle(dangerSolid).backgroundColor);
    if (!sameColor(solidBg, errFill)) {
      throw new Error(`danger solid bg must be --ds-fill-error; got ${getComputedStyle(dangerSolid).backgroundColor}`);
    }
    if (dangerSolid.getAttribute("data-tone") !== "danger") throw new Error("danger solid must carry data-tone='danger'");
    if (dangerSolid.getAttribute("data-accent-color")) throw new Error("danger must NOT set data-accent-color ([[destructive-tone]])");
    // disabled danger greys out — the :not([data-disabled]) guard keeps Radix's disabled state in charge
    const dangerDisabled = Array.from(dangerLadder.querySelectorAll<HTMLElement>("button.rt-Button"))
      .find((b) => b.textContent?.includes("(disabled)"));
    if (!dangerDisabled) throw new Error("disabled danger specimen not rendered");
    const disabledBg = parseColor(getComputedStyle(dangerDisabled).backgroundColor);
    if (sameColor(disabledBg, errFill)) {
      throw new Error("disabled danger must NOT paint the error fill — Radix's disabled state must win");
    }
    // (b) --ds-fill-error is collision-aware: red under a neutral brand, oxblood under a tomato brand.
    // Probe-span reads (resolveColor) — no element transition to race. If the token didn't shift, tone
    // would not be accent-aware, which is the whole reason Radix's color="red" is banned for danger.
    const rGray = withAccent(root, "gray");
    const errGray = resolveColor(root, "--ds-fill-error");
    rGray();
    const rTomato = withAccent(root, "tomato");
    const errTomato = resolveColor(root, "--ds-fill-error");
    rTomato();
    if (sameColor(errTomato, errGray)) {
      throw new Error("--ds-fill-error did not shift gray→tomato — tone='danger' would not be collision-aware");
    }

    // buttonOrder: the system default (primary-first) anchors the solid first; a per-group
    // order="primary-last" override flips it to last, and the DOM (tab) order follows.
    const dft = canvasElement.querySelector('[data-testid="order-default"]');
    const dftBtns = Array.from(dft?.querySelectorAll<HTMLElement>("button.rt-Button") ?? []);
    if (!dftBtns[0]?.classList.contains("rt-variant-solid")) {
      throw new Error("system default (primary-first): the solid button should be first in the group");
    }
    const last = canvasElement.querySelector('[data-testid="order-last"]');
    const lastBtns = Array.from(last?.querySelectorAll<HTMLElement>("button.rt-Button") ?? []);
    if (lastBtns.length !== 2 || !lastBtns[lastBtns.length - 1]?.classList.contains("rt-variant-solid")) {
      throw new Error("order='primary-last': the solid button should be last in the group");
    }

    // The token table's EVIDENCE, asserted at runtime ([[measured-token-rows]]). Static analysis can prove a row is a
    // MeasuredRow; only a live DOM can prove it measured a real Button node, that the claim was resolved
    // somewhere else, and that the two agree. Button is the canonical table, so this is the call every
    // other component's token story copies — the only per-component part is the expected row count.
    // 11 measured rows: PRIMARY 4 + SECONDARY 3 + TERTIARY 2 + ALL PRIORITIES 2. (The NoteRows alongside
    // them are prose, marked data-token-row="note", and skipped.)
    const rows = assertMeasuredRows(canvasElement);
    if (rows.measured !== 11 || rows.unproven !== 0) {
      throw new Error(`expected 11 measured / 0 unproven token rows, got ${rows.measured} / ${rows.unproven}`);
    }
  },
};

/* Props icon menu — icon ReactNodes can't be JSON args, so the controls are plain string keys
   mapped to nodes here and composed in render(). weight="bold" matches the label weight. */
const ICON_OPTIONS = ["none", "plus", "arrow-right", "caret-right", "trash", "download", "upload", "check"] as const;
type IconKey = (typeof ICON_OPTIONS)[number];
const ICON_MAP: Record<IconKey, ReactNode> = {
  none: undefined,
  plus: <Plus weight="bold" />,
  "arrow-right": <ArrowRight weight="bold" />,
  "caret-right": <CaretRight weight="bold" />,
  trash: <Trash weight="bold" />,
  download: <Download weight="bold" />,
  upload: <Upload weight="bold" />,
  check: <Check weight="bold" />,
};

type PropsArgs = {
  priority: ButtonPriority;
  size: "auto" | "1" | "2" | "3" | "4";
  tone: "none" | "danger";
  disabled: boolean;
  loading: boolean;
  label: string;
  leadIcon: IconKey;
  trailIcon: IconKey;
  onClick: () => void;
};

/** Props — the live, args-driven Button. Build any button from the Controls panel: priority,
 *  size, color, both icon slots, label, and the disabled/loading states. Clicks log in Actions. */
export const Props: StoryObj<PropsArgs> = {
  args: {
    priority: "primary",
    // "auto" (size unset) is the default so the button tracks the global uiSize toolbar out of the box.
    size: "auto",
    tone: "none",
    disabled: false,
    loading: false,
    label: "Save changes",
    leadIcon: "none",
    trailIcon: "none",
  },
  argTypes: {
    priority: { control: "inline-radio", options: ["primary", "secondary", "tertiary"], table: { category: "Variant" } },
    size: { control: "inline-radio", options: ["auto", "1", "2", "3", "4"], description: '"auto" tracks the global uiSize toolbar (unset); a step pins it.', table: { category: "Variant" } },
    tone: { control: "inline-radio", options: ["none", "danger"], description: "`danger` = destructive — paints from the accent-aware error family.", table: { category: "Variant" } },
    label: { control: "text", description: "The visible label — also the button's accessible name.", table: { category: "Content" } },
    leadIcon: { name: "leading icon", control: "select", options: ICON_OPTIONS, table: { category: "Content" } },
    trailIcon: { name: "trailing icon", control: "select", options: ICON_OPTIONS, table: { category: "Content" } },
    disabled: { control: "boolean", table: { category: "State" } },
    loading: { control: "boolean", table: { category: "State" } },
    onClick: { action: "clicked", table: { category: "Events" } },
  },
  // re-enable Controls here (it's disabled at the meta level for the curated docs stories)
  parameters: { controls: { disable: false } },
  render: ({ priority, size, tone, disabled, loading, label, leadIcon, trailIcon, onClick }: PropsArgs) => {
    const lead = ICON_MAP[leadIcon];
    const trail = ICON_MAP[trailIcon];
    return (
      <Page maxWidth="none">
        <PageHeader title="Button · Props" standfirst={DEFINITION} />
        <Box style={{ padding: "8px 0 2px" }}>
          <Button priority={priority} size={size === "auto" ? undefined : size} {...(tone === "danger" ? { tone: "danger" as const } : {})} disabled={disabled} loading={loading} onClick={onClick}>
            {lead}{lead ? " " : ""}{label}{trail ? " " : ""}{trail}
          </Button>
        </Box>
        <PropsLead />
        <Rule />
        <Section title="Props reference" lead={<>Every prop <Code>Button</Code> accepts — <Code>priority</Code> is the system’s own API, the rest pass through to Radix’s <Code>Button</Code>. <Code>variant</Code> is locked so a button can’t drift off-system.</>}>
          <PropTable rows={BUTTON_PROPS} />
        </Section>
      </Page>
    );
  },
};

/** History — the rulings this component encodes and a changelog of how it changes over time. */
export const History: Story = {
  render: () => (
    <Page>
      <PageHeader title="Button · History" standfirst={DEFINITION} />
      <Section title="Decisions" lead="The rulings this component encodes.">
        <Flex direction="column" gap="3">
          <Decision id="[[button-priority]] · Priority, not variant">
            <Code>priority</Code> (primary/secondary/tertiary) maps to Radix solid/surface/ghost —
            the API names UI priority, not a variant.
          </Decision>
          <Decision id="[[soft-variant-scope]] · No soft on controls">
            <Code>soft</Code> is banned on interactive controls; buttons use surface. <Code>outline</Code>{" "}
            and <Code>classic</Code> are unused, so they aren’t exposed here.
          </Decision>
          <Decision id="[[text-on-solid-fill-contrast]] · Text on the solid fill">
            The label on a solid button reaches WCAG 4.5:1 and APCA Lc 60 at rest, on hover and on
            press. Where step 9 falls short of either floor, the fill takes a deeper step, and hover and
            press lay a Radix alpha over the rest fill. The error fill of a seeded brand keeps Radix step 9
            and stays an open gap.
          </Decision>
        </Flex>
      </Section>

      <Rule />

      <Section title="Changelog" lead="Notable changes, newest first — grows as the component evolves.">
        <Flex direction="column" gap="3">
          <Decision id="0.9.0">
            Initial component — the priority ladder, the surface-on-inputs / no-<Code>soft</Code>{" "}
            policy, and control/text size-lane alignment. The token spec reads live from the CSS;
            stories split into History · Anatomy · Usage · Props.
          </Decision>
        </Flex>
      </Section>
    </Page>
  ),
};
