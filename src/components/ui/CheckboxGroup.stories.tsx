import type { Meta, StoryObj } from "@storybook/react-vite";
import { useLayoutEffect, useRef, useState } from "react";
import { Box, Code, Flex, Grid, Text } from "@radix-ui/themes";
import { Checkbox } from "./Checkbox";
import { CheckboxGroup } from "./CheckboxGroup";
import { FieldGroup } from "./Field";
import {
  AccentColor, AnatomyLegend, Caption, Decision, DoDont, DODONT_LABEL, dotStyle, HexThemeKey, hLine,
  MeasuredRow, MeasuredSpec, NoteRow, Page, PageHeader, PropsLead, PropDef, PropTable, Rule, Scenario,
  Section, tick, TokenGroup,
} from "./_storyKit";
import { assertMeasuredRows } from "../../foundations/_assert";
import { ComparisonSection, PICK_FROM_SET_COMPARISON } from "./_comparisons";

/** The one definition of this component — the standfirst every page of it opens with. */
const DEFINITION = (
  <>
    A set of related checkboxes under one name — an independent, zero-to-many choice. Each{" "}
    <Code>CheckboxGroup.Item</Code> carries its own label; the group is <Code>role="group"</Code>, so it
    needs an accessible name of its own. For a single yes/no use <Code>Checkbox</Code>; for a one-of-many
    choice use <Code>RadioGroup</Code>.
  </>
);

/** The text of an item whose OWN control is switched off — Radix puts `data-disabled` on that control and
 *  the label text is its next sibling, so this matches the one item and never a live one beside it. The
 *  a11y-exclusion target for the deliberately-exempt disabled ink; see the note on `Anatomy`. */
const DISABLED_ITEM_LABEL = "[data-disabled] + .rt-CheckboxGroupItemInner";

/* ---- anatomy diagram (CheckboxGroup-specific) ---------------------------- */

/** Where a callout sits and what it points at.
 *  `gutter` — the dot parks in the left gutter and runs a leader in to the part's LEFT edge; `at`
 *  picks the y (the group boundary's top edge, or an item row's middle).
 *  `over` — the dot sits above the specimen on the part's own CENTRE line and drops a tick to the
 *  first item row's top edge; `lane` is how far above it the tick starts.
 *  `gap` — the one callout that names a SPACE, not a box: it comes in from the right at the midpoint
 *  between the two rows named in `between`, so it tracks the rhythm Radix owns rather than a number
 *  copied out of one render. */
type Pin =
  | { n: number; part: string; place: "gutter"; at: "top" | "center" }
  | { n: number; part: string; place: "over"; lane: number }
  | { n: number; part: string; place: "gap"; between: [string, string] };

const ITEM = ".rt-CheckboxGroupItem";
/** The first item row — every `over` tick stops on its top edge, short of the box it points into. */
const CONTAINER = ITEM;
const DOT = 20; // dotStyle's diameter
const LEADER = 94; // the shortest gutter leader — the dots share one x, so the other stretches
const RIGHT_LEADER = 84; // the gap callout's leader, out from the group boundary's right edge
const LANE = { over: 29 };

const PINS: Pin[] = [
  { n: 1, part: "[data-part='group']", place: "gutter", at: "top" },
  { n: 2, part: `${ITEM}:last-of-type`, place: "gutter", at: "center" },
  { n: 3, part: ".rt-CheckboxGroupItemCheckbox", place: "over", lane: LANE.over },
  { n: 4, part: ".rt-CheckboxGroupItemInner", place: "over", lane: LANE.over },
  { n: 5, part: "[data-part='group']", place: "gap", between: [ITEM, `${ITEM}:last-of-type`] },
];

/** A small CheckboxGroup specimen (2 items, one checked) with callouts to the group-level parts.
 *
 *  Every callout is MEASURED off that live specimen rather than parked at a hand-computed offset: a
 *  dot takes its x from the part it names and its y from that part's own edge, read in a layout
 *  effect and re-read by a ResizeObserver on the frame and the specimen. Pinned numbers drift the
 *  moment the item's type step, the box's size lane or Radix's inter-item rhythm moves — and they
 *  had: the label callout's dot sat 4px off the tick beneath it. */
function AnatomyDiagram() {
  const frame = useRef<HTMLDivElement>(null);
  const specimen = useRef<HTMLDivElement>(null);
  const [pins, setPins] = useState<Record<number, { x: number; y: number }>>({});
  const [gutter, setGutter] = useState<number | null>(null);

  useLayoutEffect(() => {
    const f = frame.current;
    const s = specimen.current;
    if (!f || !s) return;
    const measure = () => {
      const first = s.querySelector<HTMLElement>(CONTAINER);
      if (!first) return;
      const fr = f.getBoundingClientRect();
      const stop = first.getBoundingClientRect().top;
      const next: Record<number, { x: number; y: number }> = {};
      let leftmost = Infinity;
      for (const p of PINS) {
        const el = s.querySelector<HTMLElement>(p.part);
        if (!el) continue;
        const r = el.getBoundingClientRect();
        if (p.place === "gutter") {
          const x = Math.round(r.left - fr.left);
          next[p.n] = { x, y: Math.round((p.at === "top" ? r.top : r.top + r.height / 2) - fr.top) };
          leftmost = Math.min(leftmost, x);
        } else if (p.place === "over") {
          next[p.n] = {
            x: Math.round(r.left + r.width / 2 - fr.left),
            y: Math.round(Math.min(r.top, stop) - fr.top),
          };
        } else {
          const above = s.querySelector<HTMLElement>(p.between[0]);
          const below = s.querySelector<HTMLElement>(p.between[1]);
          if (!above || !below) continue;
          const mid = (above.getBoundingClientRect().bottom + below.getBoundingClientRect().top) / 2;
          next[p.n] = { x: Math.round(r.right - fr.left), y: Math.round(mid - fr.top) };
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
          {/* the specimen ref shrink-wraps the group, so every part below is a DESCENDANT of it (a
              selector run on the ref itself would not match the ref) and the ResizeObserver sees the
              group grow */}
          <Box ref={specimen}>
            {/* group-container outline — traces the role=group boundary the callout points at */}
            <Box data-part="group" style={{ position: "relative", padding: 12, borderRadius: "var(--ds-radius-3)", outline: "1px dashed var(--ds-stroke-weak)", outlineOffset: 0 }}>
              <CheckboxGroup size="3" defaultValue={["email"]} aria-label="anatomy specimen — notification channels">
                <CheckboxGroup.Item value="email">Email</CheckboxGroup.Item>
                <CheckboxGroup.Item value="sms">SMS</CheckboxGroup.Item>
              </CheckboxGroup>
            </Box>
          </Box>
        </Flex>
        {PINS.map((p) => {
          const a = pins[p.n];
          if (!a) return null;
          if (p.place === "over") {
            return (
              <Box key={p.n}>
                <Box style={{ ...dotStyle, left: a.x - DOT / 2, top: a.y - p.lane - DOT }}>{p.n}</Box>
                <Box style={tick({ left: a.x, top: a.y - p.lane, height: p.lane })} />
              </Box>
            );
          }
          if (p.place === "gap") {
            return (
              <Box key={p.n}>
                <Box style={{ ...dotStyle, left: a.x + RIGHT_LEADER, top: a.y - DOT / 2 }}>{p.n}</Box>
                <Box style={hLine({ left: a.x, top: a.y, width: RIGHT_LEADER })} />
              </Box>
            );
          }
          if (gutter == null) return null;
          return (
            <Box key={p.n}>
              <Box style={{ ...dotStyle, left: gutter, top: a.y - DOT / 2 }}>{p.n}</Box>
              <Box style={hLine({ left: gutter + DOT, top: a.y, width: a.x - gutter - DOT })} />
            </Box>
          );
        })}
      </Box>
    </Box>
  );
}

const ANATOMY_PARTS: [number, string, string][] = [
  [1, "Group container", "role=group — a named set; needs an aria-label"],
  [2, "Item", "one option: a control box plus its own label, as a unit"],
  [3, "Control box", "the checkbox itself — fill, border, indicator (shared with Checkbox)"],
  [4, "Label", "the item carries its label via children — no separate field"],
  [5, "Item gap", "the vertical rhythm between stacked items"],
];

/* ========================================================================== */

const meta: Meta<typeof CheckboxGroup> = {
  title: "Components/Choice/CheckboxGroup",
  component: CheckboxGroup,
  parameters: {
    // The docs stories use custom render() and don't read args, so Controls is dead there.
    // The Props re-enables it. (Accessibility + Interactions stay on.)
    controls: { disable: true },
    docs: {
      description: {
        component:
          "A set of related checkboxes under one `name` — an independent, **zero-to-many** choice. " +
          "Locked to the **surface** variant; each `CheckboxGroup.Item` carries its own label via " +
          "children. The group is `role=\"group\"`, so it needs an accessible name (`aria-label`). For a " +
          "single yes/no use `Checkbox`; for a one-of-many choice use `RadioGroup`.",
      },
    },
  },
};
export default meta;
type Story = StoryObj<typeof CheckboxGroup>;

/** The parts of a checkbox group — a labeled diagram — and the states an item can take. The token
 *  spec that used to close this page now closes Usage. */
export const Anatomy: Story = {
  // A switched-off item's label is painted --ds-text-disabled, the role that means "inactive control".
  // It is deliberately below the contrast floor — 1.90 light, 3.01 dark — and is one of only two roles
  // the system exempts, because an unavailable option should read as unavailable rather than as text you
  // can act on. Scoped to the text of an item whose own control is disabled; every other label on the
  // page stays contrast-checked.
  parameters: { a11y: { context: { exclude: [DISABLED_ITEM_LABEL] } } },
  render: () => (
    <Page>
      <PageHeader title="CheckboxGroup · Anatomy" standfirst={DEFINITION} />
      <Section title="Anatomy" lead="A group is a named set of checkbox items, stacked vertically. Each item carries its own label, so the box and its text travel together as one option.">
        <AnatomyDiagram />
        <AnatomyLegend parts={ANATOMY_PARTS} />
        <Caption>
          The group itself has <strong>role=group</strong>, so it needs an <strong>aria-label</strong> for
          its accessible name. An item is a checkbox <em>and</em> its label as a single unit — there’s no
          separate field wrapper. Each control box draws the same tokens as a standalone{" "}
          <strong>Checkbox</strong>.
        </Caption>
      </Section>

      <Rule />

      <Section title="States" lead="The states a single item takes inside the group. (A group can’t be indeterminate itself — that’s a single parent checkbox; see Usage.)">
        <Flex direction="column" gap="4">
          <CheckboxGroup defaultValue={["checked"]} aria-label="item states — resting and checked">
            <CheckboxGroup.Item value="unchecked">Unchecked</CheckboxGroup.Item>
            <CheckboxGroup.Item value="checked">Checked</CheckboxGroup.Item>
          </CheckboxGroup>
          <CheckboxGroup defaultValue={["disabled-checked"]} aria-label="item states — disabled" disabled>
            <CheckboxGroup.Item value="disabled">Disabled</CheckboxGroup.Item>
            <CheckboxGroup.Item value="disabled-checked">Disabled + checked</CheckboxGroup.Item>
          </CheckboxGroup>
        </Flex>
        <Caption>
          <strong>Disabled</strong> is intentionally low-contrast (WCAG-exempt — GUIDELINES §9). Prefer
          guiding the user over silently disabling a whole group.
        </Caption>
        <Caption>
          <strong>Focus &amp; interaction:</strong> each item's box takes the system focus ring ([[focus-ring]]): the
          accent (<Code>--ds-stroke-focus</Code>) with a Radix alpha (<Code>--ds-stroke-focus-stack</Code>)
          stacked on it, 2px wide, clearing 3:1 and APCA Lc 30 for every accent and mode, on{" "}
          <Code>:focus-visible</Code>; hover tints the box and the check toggles over{" "}
          <Code>--ds-duration-micro</Code>, colour + focus over <Code>--ds-duration-fast</Code> —
          reduced-motion honoured (GUIDELINES §6/§7). <strong>Colour-not-alone:</strong> the checked
          state is carried by the checkmark glyph, not colour (WCAG 1.4.1).
        </Caption>
      </Section>
    </Page>
  ),
};

/** Usage: the group in real situations, the guidance that keeps each one accessible, and — closing
 *  the page — the live token spec measured off a rendered group item. */
export const Usage: Story = {
  // The DO/DON'T word (success/error step-11 ink on its own tint) measures 4.10 at 12px bold, under axe's
  // 4.5; the colour + the word already carry the meaning, so that row is the documented exception. Scoped
  // to the label itself — the cards' specimens stay fully axe-checked, which "[data-dodont]" did not do.
  // The second entry is the label of a switched-off item (--ds-text-disabled, 1.90 light / 3.01 dark) —
  // see the note on Anatomy above.
  parameters: { a11y: { context: { exclude: [DODONT_LABEL, DISABLED_ITEM_LABEL] } } },
  render: (_args, { globals }) => (
    <HexThemeKey.Provider value={`${globals.accent}-${globals.appearance}-${globals.contrast}`}>
      <Page>
        <PageHeader title="CheckboxGroup · Usage" standfirst={DEFINITION} />
        <ComparisonSection comparison={PICK_FROM_SET_COMPARISON} highlight="Radio / Checkbox group" />

        <Rule />

        <Section
          title="In context"
          lead={<>Real situations, driven by the toolbar above — <strong>Accent</strong> tints the checked items, <strong>Size</strong> scales the group, <strong>Appearance</strong> flips light and dark.</>}
        >
          <Grid columns={{ initial: "1", sm: "2" }} gapX="6" gapY="5">
            <Scenario label="SETTINGS" caption={<>A settings group with a visible heading wired to the group via <code>aria-labelledby</code> — the heading <em>is</em> the accessible name, so it’s announced once for the set.</>}>
              <Flex direction="column" gap="2">
                <Text id="u-notify-label" size="2" weight="medium" style={{ color: "var(--ds-text-strong)" }}>Notification channels</Text>
                <CheckboxGroup defaultValue={["email"]} name="notify" aria-labelledby="u-notify-label">
                  <CheckboxGroup.Item value="email">Email</CheckboxGroup.Item>
                  <CheckboxGroup.Item value="sms">SMS</CheckboxGroup.Item>
                  <CheckboxGroup.Item value="push">Push</CheckboxGroup.Item>
                </CheckboxGroup>
              </Flex>
            </Scenario>

            <Scenario label="FILTERS" caption={<>A filter list — zero-to-many active at once. With no visible heading, the group carries its name in <code>aria-label</code>.</>}>
              <CheckboxGroup defaultValue={["article", "video"]} name="kind" aria-label="Filter by content type">
                <CheckboxGroup.Item value="article">Articles</CheckboxGroup.Item>
                <CheckboxGroup.Item value="video">Videos</CheckboxGroup.Item>
                <CheckboxGroup.Item value="podcast">Podcasts</CheckboxGroup.Item>
                <CheckboxGroup.Item value="course">Courses</CheckboxGroup.Item>
              </CheckboxGroup>
            </Scenario>

            <Scenario label="PERMISSIONS" caption={<>Feature toggles — each independent, so a checkbox set fits. A <code>disabled</code> item reads as locked rather than vanishing.</>}>
              <CheckboxGroup defaultValue={["read", "comment"]} name="perms" aria-label="Workspace permissions">
                <CheckboxGroup.Item value="read">Read</CheckboxGroup.Item>
                <CheckboxGroup.Item value="comment">Comment</CheckboxGroup.Item>
                <CheckboxGroup.Item value="edit">Edit</CheckboxGroup.Item>
                <CheckboxGroup.Item value="admin" disabled>Admin (upgrade required)</CheckboxGroup.Item>
              </CheckboxGroup>
            </Scenario>

            <Scenario label="SELECT-ALL (INDETERMINATE)" caption={<>The parent is a single <strong>Checkbox</strong>, indeterminate while only some children are checked — the one correct pairing of indeterminate with a group.</>}>
              <Flex direction="column" gap="2">
                <Flex gap="2" align="center">
                  <Checkbox checked="indeterminate" onCheckedChange={() => {}} aria-label="Select all scopes" />
                  <Text as="label" size="2" style={{ color: "var(--ds-text-strong)" }}>Select all</Text>
                </Flex>
                <Box style={{ paddingLeft: 24 }}>
                  <CheckboxGroup defaultValue={["repos"]} name="scopes" aria-label="Access scopes">
                    <CheckboxGroup.Item value="repos">Repositories</CheckboxGroup.Item>
                    <CheckboxGroup.Item value="actions">Actions</CheckboxGroup.Item>
                  </CheckboxGroup>
                </Box>
              </Flex>
            </Scenario>
          </Grid>
        </Section>

        <Rule />

        <Section
          title="Descriptions and a required selection"
          lead={<>An item can carry a secondary <strong>description</strong> line, and a group can require a minimum selection through a <Code>FieldGroup</Code>. On error the group <strong>name turns the family colour</strong> and the message sits below the set; the boxes themselves stay neutral.</>}
        >
          <Grid columns={{ initial: "1", sm: "2" }} gapX="6" gapY="5">
            <Scenario label="PER-ITEM DESCRIPTION" caption="Each option pairs a title with a secondary line; the box top-aligns to the title.">
              <FieldGroup.Root>
                <FieldGroup.Label>Notifications</FieldGroup.Label>
                <CheckboxGroup defaultValue={["product"]} name="u-notif-desc">
                  <CheckboxGroup.Item value="product" description="Releases, changelog, and roadmap updates">Product</CheckboxGroup.Item>
                  <CheckboxGroup.Item value="security" description="Sign-ins, password changes, and security alerts">Security</CheckboxGroup.Item>
                  <CheckboxGroup.Item value="marketing" description="Tips, offers, and the occasional newsletter">Marketing</CheckboxGroup.Item>
                </CheckboxGroup>
              </FieldGroup.Root>
            </Scenario>
            <Scenario label="REQUIRED — NONE CHOSEN" caption="At least one must be selected; the group reports an error until then — name in red, message below.">
              <FieldGroup.Root validation={{ tone: "error", message: "Select at least one channel." }}>
                <FieldGroup.Label>Notification channels</FieldGroup.Label>
                <CheckboxGroup name="u-notif-req">
                  <CheckboxGroup.Item value="email">Email</CheckboxGroup.Item>
                  <CheckboxGroup.Item value="sms">SMS</CheckboxGroup.Item>
                </CheckboxGroup>
                <FieldGroup.Message />
              </FieldGroup.Root>
            </Scenario>
          </Grid>
        </Section>

        <Rule />

        <Section title="Multi-select, not one-of" lead="Reach for a CheckboxGroup when options are independent and any number can be on. If exactly one must win, that’s a RadioGroup — checkboxes there mislead.">
          <Grid columns={{ initial: "1", sm: "2" }} gap="3">
            <DoDont kind="do" accent={globals.accent as AccentColor} note="Independent options, zero-to-many checked — the shape matches the choice.">
              <CheckboxGroup defaultValue={["wifi"]} name="amenities" aria-label="Amenities">
                <CheckboxGroup.Item value="wifi">Wi-Fi</CheckboxGroup.Item>
                <CheckboxGroup.Item value="parking">Parking</CheckboxGroup.Item>
                <CheckboxGroup.Item value="breakfast">Breakfast</CheckboxGroup.Item>
              </CheckboxGroup>
            </DoDont>
            <DoDont kind="dont" accent={globals.accent as AccentColor} note="Mutually-exclusive options as checkboxes — the boxes imply you can pick several plans at once. Use a RadioGroup for one-of-many.">
              <CheckboxGroup defaultValue={["pro"]} name="plan" aria-label="Plan">
                <CheckboxGroup.Item value="free">Free</CheckboxGroup.Item>
                <CheckboxGroup.Item value="pro">Pro</CheckboxGroup.Item>
                <CheckboxGroup.Item value="enterprise">Enterprise</CheckboxGroup.Item>
              </CheckboxGroup>
            </DoDont>
          </Grid>
        </Section>

        <Rule />

        <Section title="Tokens" lead="An item draws from Radix’s surface-variant skin — the same set as a single Checkbox. Every colour row below is MEASURED off a real group item rendered for the purpose: the property is read from the element that paints it and checked against the token the row names, so a row can disagree with the component.">
          <Flex direction="column" gap="4">
            <TokenGroup
              label="CHECKED"
              blurb="A checked item: the accent fill carries a contrast-coloured check."
              specimen={
                <CheckboxGroup defaultValue={["c"]} aria-label="checked item token specimen">
                  <CheckboxGroup.Item value="c">Checked</CheckboxGroup.Item>
                </CheckboxGroup>
              }
            >
              <MeasuredSpec
                render={() => (
                  <CheckboxGroup defaultValue={["c"]} aria-label="checked item measurement">
                    <CheckboxGroup.Item value="c">Checked</CheckboxGroup.Item>
                  </CheckboxGroup>
                )}
              >
                <MeasuredRow
                  part="Control fill" note="The box itself, drawn on the item checkbox’s ::before."
                  token="--accent-indicator" select=".rt-CheckboxGroupItemCheckbox" pseudo="::before" prop="background-color"
                />
                <MeasuredRow
                  part="Indicator" note="The check glyph, which has to clear the fill it sits on."
                  token="--accent-contrast" select=".rt-CheckboxGroupItemCheckbox .rt-BaseCheckboxIndicator" prop="color"
                />
              </MeasuredSpec>
            </TokenGroup>

            <TokenGroup
              label="RESTING & FOCUS"
              blurb="An unchecked item on Radix’s surface, with the focus ring on top."
              specimen={
                <CheckboxGroup aria-label="resting item token specimen">
                  <CheckboxGroup.Item value="r">Unchecked</CheckboxGroup.Item>
                </CheckboxGroup>
              }
            >
              <MeasuredSpec
                render={() => (
                  <CheckboxGroup aria-label="resting item measurement">
                    <CheckboxGroup.Item value="r">Unchecked</CheckboxGroup.Item>
                  </CheckboxGroup>
                )}
              >
                <MeasuredRow
                  part="Control surface" note="The unchecked box — Radix’s surface variant, translucent over the page."
                  token="--color-surface" select=".rt-CheckboxGroupItemCheckbox" pseudo="::before" prop="background-color"
                />
                <MeasuredRow
                  part="Focus ring" note="The accent base layer, read from the rule the item’s own stylesheet paints on keyboard focus. A Radix alpha, --ds-stroke-focus-stack, sits on top of it ([[focus-ring]])."
                  token="--ds-stroke-focus" select=".rt-CheckboxGroupItemCheckbox" prop="outline-color" state="focus-visible"
                />
              </MeasuredSpec>
              <NoteRow part="Control border" value="a 1px inset ring carried inside box-shadow — a neutral hairline, not an accent stroke" radix="--gray-a7" />
            </TokenGroup>

            <TokenGroup label="GROUP LAYOUT" blurb="The group is a vertical stack; Radix owns the inter-item rhythm.">
              <NoteRow part="Orientation" value="vertical stack (column)" />
              <NoteRow part="Item gap" value="Radix internal spacing scale" radix="--space-*" />
            </TokenGroup>

            <TokenGroup label="DISABLED">
              <MeasuredSpec
                render={() => (
                  <CheckboxGroup defaultValue={["d"]} aria-label="disabled item measurement">
                    <CheckboxGroup.Item value="d" disabled>Disabled</CheckboxGroup.Item>
                  </CheckboxGroup>
                )}
              >
                <MeasuredRow
                  part="Control fill" note="Read off a rendered disabled item, so this is the paint as it lands."
                  token="--ds-fill-disabled" select=".rt-CheckboxGroupItemCheckbox:disabled" pseudo="::before" prop="background-color"
                />
                <MeasuredRow
                  part="Indicator" note="The check dims with the box rather than disappearing."
                  token="--ds-text-disabled" select=".rt-CheckboxGroupItemCheckbox:disabled .rt-BaseCheckboxIndicator" prop="color"
                />
              </MeasuredSpec>
            </TokenGroup>

            <TokenGroup label="GEOMETRY">
              <NoteRow part="Shape (radius)" value="inherits <Theme radius>" radix="--radius-*" />
              <NoteRow part="Size" value="control size lane" radix="--checkbox-size-*" />
            </TokenGroup>
          </Flex>
        </Section>
      </Page>
    </HexThemeKey.Provider>
  ),
  play: async ({ canvasElement }) => {
    const group = canvasElement.querySelector(".rt-CheckboxGroupRoot");
    if (!group) throw new Error("checkbox group not rendered");
    if (group.getAttribute("role") !== "group") {
      throw new Error(`group root must have role="group", got "${group.getAttribute("role")}"`);
    }
    // The surface lock lands on the item checkboxes (the variant flows through context to each
    // .rt-CheckboxGroupItemCheckbox), NOT on .rt-CheckboxGroupRoot — verified in the running app.
    const item = group.querySelector(".rt-CheckboxGroupItemCheckbox");
    if (!item) throw new Error("checkbox group has no items");
    if (!item.classList.contains("rt-variant-surface")) {
      throw new Error(`group items must be surface, got "${item.className}"`);
    }

    // The token table's EVIDENCE, asserted at runtime: every measured row read a real group-item node,
    // resolved its claim somewhere else, and the two agree. Six rows, none unproven.
    const rows = assertMeasuredRows(canvasElement);
    if (rows.measured !== 6 || rows.unproven !== 0) {
      throw new Error(`expected 6 measured / 0 unproven token rows, got ${rows.measured} / ${rows.unproven}`);
    }
  },
};

/* ---- Properties — full prop reference (PropTable / PropDef live in _storyKit) - */

const ROOT_PROPS: PropDef[] = [
  { name: "size", type: `"1" | "2" | "3"`, def: `"1"`, desc: <>Control size. Unset, it resolves from the global <Code>uiSize</Code> (default <Code>small</Code> → <Code>1</Code>); Radix’s own default is <Code>2</Code>.</>, source: "CheckboxGroup.tsx:21 · Radix" },
  { name: "variant", type: `"surface"`, def: `"surface"`, locked: true, desc: <>Hard-set to <Code>surface</Code> and stripped from the public type — like every input, an item must separate from the page (border + fill + hover); <Code>soft</Code> and <Code>classic</Code> aren’t exposed.</>, source: "CheckboxGroup.tsx:20,25" },
  { name: "color", type: `<Radix accent>`, desc: <>Semantic override; otherwise the group inherits the theme accent.</>, source: "Radix" },
  { name: "highContrast", type: "boolean", def: "false", desc: <>Bumps the checked fill and border to Radix’s high-contrast step.</>, source: "Radix" },
  { name: "name", type: "string", desc: <>Form field name shared by every item — submits one entry per checked value.</>, source: "Radix" },
  { name: "disabled", type: "boolean", def: "false", desc: <>Disables every item in the group at once. Intentionally low-contrast (WCAG-exempt) — prefer guiding the user over silently disabling a whole group.</>, source: "Radix" },
  { name: "required", type: "boolean", def: "false", desc: <>Marks the group required for native form validation; each item mirrors it.</>, source: "Radix" },
  { name: "value / defaultValue", type: "string[]", desc: <>Controlled / uncontrolled array of the currently-checked item values.</>, source: "Radix" },
  { name: "onValueChange", type: "(value: string[]) => void", desc: <>Fires with the full array whenever any item is checked or unchecked.</>, source: "Radix" },
  { name: "orientation", type: `"horizontal" | "vertical"`, desc: <>Sets the arrow-key roving-focus axis only — the visual stack is always a vertical column (CSS), so this doesn’t change layout.</>, source: "Radix" },
  { name: "loop", type: "boolean", def: "true", desc: <>Arrow-key navigation wraps from the last item back to the first.</>, source: "Radix" },
  { name: "dir", type: `"ltr" | "rtl"`, desc: <>Reading direction for keyboard navigation.</>, source: "Radix" },
  { name: "aria-label / aria-labelledby", type: "string", desc: <>Names the <Code>role="group"</Code> container — required, since there’s no visible fieldset/legend. Auto-wired to a <Code>FieldGroup.Label</Code> (plus the validation message via <Code>aria-describedby</Code>) when nested in a <Code>FieldGroup.Root</Code>; pass <Code>aria-label</Code> directly for a standalone group.</>, source: "CheckboxGroup.tsx:24 · Field.tsx" },
  { name: "children", type: "ReactNode", desc: <>One or more <Code>CheckboxGroup.Item</Code> elements.</>, source: "Radix" },
];

const ITEM_PROPS: PropDef[] = [
  { name: "value", type: "string", def: "— (required)", desc: <>The option’s own value — reported in the group’s array when checked or unchecked.</>, source: "Radix" },
  { name: "description", type: "ReactNode", desc: <>Optional secondary line under the item’s label — a price, scope, or qualifier. Top-aligned, weak tone; the control aligns to the title, not the block.</>, source: "CheckboxGroup.tsx:29-30" },
  { name: "disabled", type: "boolean", def: "false", desc: <>Disables just this item; it also inherits the group’s own <Code>disabled</Code>.</>, source: "Radix" },
  { name: "aria-describedby", type: "string", desc: <>Merged, not overwritten — the system appends the item’s own <Code>description</Code> id and (inside a <Code>FieldGroup</Code>) the group’s validation-message id, so a per-item description and a pre-existing group error are both announced.</>, source: "CheckboxGroup.tsx:33-35" },
  { name: "children", type: "ReactNode", def: "— (required)", desc: <>The visible label — the item renders a <Code>Text as="label"</Code> wrapping the control and the label as one unit.</>, source: "Radix" },
];

type ValidationOption = "none" | "error" | "warning" | "success" | "info";

type PropsArgs = {
  label: string;
  validation: ValidationOption;
  itemDescriptions: boolean;
  size: "auto" | "1" | "2" | "3";
  disabled: boolean;
  itemCount: number;
  defaultValue: string[];
  onValueChange: (value: string[]) => void;
};

// inline-radio choice → the FieldGroup validation object (or undefined) — the `mapping` target, so
// the object is never edited as a raw control.
const VALIDATION: Record<ValidationOption, { tone: "error" | "warning" | "success" | "info"; message: string } | undefined> = {
  none: undefined,
  error: { tone: "error", message: "Select at least one option." },
  warning: { tone: "warning", message: "Some selections may need review." },
  success: { tone: "success", message: "Looks good — selections saved." },
  info: { tone: "info", message: "You can change these anytime." },
};

// An add-on dataset, so itemCount (2–5) always has a real label with a price/scope sub-line — the same
// register RadioGroup's Props uses for its plans, since the two sit on the same shelf.
const ADD_ONS: { value: string; label: string; description: string }[] = [
  { value: "seats", label: "Extra seats", description: "$8/mo per additional member" },
  { value: "support", label: "Priority support", description: "First response within one business hour" },
  { value: "storage", label: "Extra storage", description: "$5/mo per 100 GB beyond the plan" },
  { value: "sso", label: "SSO", description: "SAML sign-in for the whole org" },
  { value: "audit", label: "Audit logs", description: "Exportable, 12 months of retention" },
];

/** Props — the live, args-driven group, configurable as a field. Add a `label` to wrap it in a
 *  `FieldGroup` (label + validation message); leave it empty for a bare, aria-labelled group. The full
 *  prop reference (Root + Item) sits below the live instance. */
export const Props: StoryObj<PropsArgs> = {
  // "auto" (size unset) is the default so the group tracks the global uiSize toolbar out of the box.
  args: { label: "Plan add-ons", validation: "none", itemDescriptions: false, size: "auto", disabled: false, itemCount: 3, defaultValue: ["seats"] },
  argTypes: {
    label: { name: "group label", control: "text" },
    validation: { control: "inline-radio", options: ["none", "error", "warning", "success", "info"], mapping: VALIDATION },
    itemDescriptions: { name: "per-item description", control: "boolean" },
    size: { control: "inline-radio", options: ["auto", "1", "2", "3"], description: '"auto" tracks the global uiSize toolbar (unset); a step pins it.' },
    disabled: { control: "boolean" },
    itemCount: { name: "item count", control: { type: "range", min: 2, max: 5, step: 1 } },
    onValueChange: { action: "valueChange" },
  },
  parameters: { controls: { disable: false } },
  render: ({ label, validation, itemDescriptions, size, disabled, itemCount, defaultValue, onValueChange }: PropsArgs) => {
    const count = Math.max(2, Math.min(5, itemCount));
    // "auto" = leave `size` off, so the group (and its FieldGroup shell) ride the global uiSize.
    const resolvedSize = size === "auto" ? undefined : size;
    // `validation` arrives already resolved to {tone,message} | undefined via `mapping`.
    const resolved = validation as unknown as { tone: "error" | "warning" | "success" | "info"; message: string } | undefined;
    const items = ADD_ONS.slice(0, count).map((opt) => (
      <CheckboxGroup.Item key={opt.value} value={opt.value} description={itemDescriptions ? opt.description : undefined}>
        {opt.label}
      </CheckboxGroup.Item>
    ));
    const group = (
      <CheckboxGroup size={resolvedSize} disabled={disabled} defaultValue={defaultValue} onValueChange={onValueChange} {...(label ? {} : { "aria-label": "Props group" })}>
        {items}
      </CheckboxGroup>
    );
    return (
      <Page maxWidth="none">
        <PageHeader title="CheckboxGroup · Props" standfirst={DEFINITION} />
        <Box style={{ padding: "8px 0 2px" }}>
          {label ? (
            <FieldGroup.Root validation={resolved} size={resolvedSize}>
              <FieldGroup.Label>{label}</FieldGroup.Label>
              {group}
              <FieldGroup.Message />
            </FieldGroup.Root>
          ) : group}
        </Box>
        <PropsLead />
        <Rule />
        <Section title="Props reference" lead={<>Every prop across the group’s two parts — <Code>CheckboxGroup</Code> (the root) and <Code>CheckboxGroup.Item</Code> (one option). <Code>variant</Code> is locked so items can’t drift off-system.</>}>
          <Flex direction="column" gap="5">
            <Section title="Root — the group" lead={<><Code>CheckboxGroup</Code> is the <Code>role="group"</Code> container over Radix’s own Root — it locks <Code>variant</Code> and auto-wires <Code>aria-labelledby</Code>/<Code>aria-describedby</Code> when nested in a <Code>FieldGroup.Root</Code>.</>}>
              <PropTable rows={ROOT_PROPS} />
            </Section>
            <Rule />
            <Section title="Item — one option" lead={<><Code>CheckboxGroup.Item</Code> is a single checkbox plus its own label, as one unit. It adds an optional <Code>description</Code> slot and merges its <Code>aria-describedby</Code> with any group-level validation message.</>}>
              <PropTable rows={ITEM_PROPS} />
            </Section>
          </Flex>
          <Caption>
            One <strong>lock</strong>: the root is <Code>variant="surface"</Code>-only — stripped from the public type and hard-set internally. “Radix” in Source means an inherited primitive prop; <Code>CheckboxGroup.tsx:NN</Code> marks a system-owned one.
          </Caption>
        </Section>
      </Page>
    );
  },
};

/** History — the rulings this component encodes and a changelog of how it changes over time. */
export const History: Story = {
  render: () => (
    <Page>
      <PageHeader title="CheckboxGroup · History" standfirst={DEFINITION} />
      <Section title="Decisions" lead="The rulings this component encodes.">
        <Flex direction="column" gap="3">
          <Decision id="[[soft-variant-scope]] · surface-locked">
            Locked to <Code>variant="surface"</Code> — like every input, the items must separate from the
            page (border + fill + hover). <Code>soft</Code> and <Code>classic</Code> aren’t exposed.
          </Decision>
          <Decision id="Cardinality">
            One <Code>name</Code>, many values — a group models an independent, zero-to-many choice;{" "}
            <Code>CheckboxGroup.Item</Code> is a thin passthrough so options stay on-system.
          </Decision>
          <Decision id="Label">
            The group is <Code>role="group"</Code> — it needs an accessible name (an <Code>aria-label</Code>,
            or a visible heading wired with <Code>aria-labelledby</Code>), never shipped bare.
          </Decision>
        </Flex>
      </Section>

      <Rule />

      <Section title="Changelog" lead="Notable changes, newest first — grows as the component evolves.">
        <Flex direction="column" gap="3">
          <Decision id="0.9.0">
            Initial component — surface-locked <Code>CheckboxGroup.Root</Code> over Radix, size on the
            global <Code>uiSize</Code> control lane, with <Code>CheckboxGroup.Item</Code> re-exposed. Stories
            on the standard template: History · Anatomy · Usage · Props.
          </Decision>
        </Flex>
      </Section>
    </Page>
  ),
};
