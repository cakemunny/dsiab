import { useLayoutEffect, useRef, useState, type ComponentProps, type CSSProperties, type ReactNode, type RefObject } from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { Box, Code, Flex, Grid, Text as RadixText } from "@radix-ui/themes";
import { DotsThreeVertical, Hand, HandGrabbing, HandPointing } from "@phosphor-icons/react";
import { DragHandle, type DragHandleOrientation } from "./DragHandle";
import { Card } from "./Card";
import { Badge } from "./Badge";
import { IconButton } from "./IconButton";
import { Link } from "./Link";
import { useReorder, type ReorderChange, type ReorderGroup } from "../../hooks/useReorder";
import { observeDropIndicator } from "../../hooks/reorderIndicator";
import { useSizeLane } from "../../theme/SizeContext";
import {
  AnatomyLegend, Caption, Decision, DoDont, DODONT_LABEL, dotStyle, HexThemeKey, KeyRow, type KeyBinding,
  MeasuredRow, MeasuredSpec, Mono, NoteRow, Page, PageHeader, PropsLead, type PropDef, PropTable, Rule,
  Section, SizeLesson,
} from "./_storyKit";
import { assertMeasuredRows } from "../../foundations/_assert";

/** The component's definition — one source, referenced by the header of every story on this page. */
const DEFINITION = <>An <em>optional</em> grip for a reorderable item: a ghost icon-button carrying the six-dot glyph, sized on the control lane so it clears the 24×24 pointer floor at every tier. The item itself is the drag source — <Code>useReorder().getItemProps(id)</Code> alone gives a complete, accessible reorder. Add a handle to say <em>this is draggable</em> where the shape of the thing does not already say it, or to keep the drag off an item whose own content is interactive.</>;

/* The attributes the hook writes during a gesture, for STATIC specimens — the docs have to show the
   feedback states without dragging anything, and nothing on a page can synthesise a real gesture.
   Spread rather than written inline, because a hyphenated literal on a component is checked against
   its props type. Every one of these is exactly what `getItemProps` / `getGroupProps` emit, so what
   a reader sees here is the shipped paint and not a mock of it.

   TWO LEVELS, since the indicator moved onto the group. The ITEM still names which edge of which
   row the slot is on — that is the data half, and a consumer painting its own mark reads it. The
   GROUP wears the mark, and `FrozenGroup` below runs the shipped measuring code over the frozen
   markup so the caret lands where a real drag would put it rather than where a literal guessed. */
const HELD = { "data-ds-reorder-lifted": "true" } as const;
const DROP_BEFORE = { "data-ds-reorder-drop": "before" } as const;
const DROP_AFTER = { "data-ds-reorder-drop": "after" } as const;

/* ---- specimen one: the default, a list with NO handle anywhere ------------
   Markup the hook has never heard of: a bare <ul> of <li> rows. TWO getters are the whole
   integration. Each row is the drag source, the keyboard route and the drop destination, and the
   hook gives a plain <li> the tab stop it does not have. */
const FIELD_LABELS: Record<string, string> = {
  name: "Full name",
  email: "Email address",
  role: "Role",
  team: "Team",
  status: "Account status",
};

function ChangeLine({ change }: { change: ReorderChange | null }) {
  return (
    <RadixText size="1" style={{ color: "var(--ds-text-weak)", minHeight: "var(--ds-space-20)", display: "block" }}>
      {change
        ? `onReorder: ${change.id} from ${change.from.group}[${change.from.index}] to ${change.to.group}[${change.to.index}]`
        : "onReorder has not fired yet."}
    </RadixText>
  );
}

const ROW_STYLE = {
  display: "flex",
  alignItems: "center",
  gap: "var(--ds-space-8)",
  padding: "var(--ds-space-4) var(--ds-space-8)",
  borderRadius: "var(--ds-radius-3)",
  background: "var(--ds-bg-raised)",
} as const;

/* The gap is not decoration. An insertion caret is centred in the space between two rows and has
   to touch neither, and the terminus is 8px across — so a reorderable list needs --ds-space-12
   between its rows, and the same at its ends for the first and last slots. Both shipped surfaces
   use that step; below it the mark starts overlapping the rows it separates. */
const LIST_LAYOUT = {
  listStyle: "none",
  margin: 0,
  padding: "var(--ds-space-12)",
  display: "flex",
  flexDirection: "column",
  gap: "var(--ds-space-12)",
} as const;

/* The list's frame is the story's paint. A frozen group wears it on a wrapper, because the token
   table measures the drop mark on the group's own pseudo-elements and a group carrying an inline
   background or border reads as a paint the story applied ([[measured-token-rows]]). */
const LIST_FRAME = {
  border: "1px solid var(--ds-stroke-weak)",
  borderRadius: "var(--ds-radius-4)",
  background: "var(--ds-bg-subtle)",
} as const;

const LIST_STYLE = { ...LIST_LAYOUT, ...LIST_FRAME } as const;

function SortableFieldList() {
  const [change, setChange] = useState<ReorderChange | null>(null);
  const reorder = useReorder({
    defaultGroups: [{ id: "fields", label: "Fields", items: ["name", "email", "role", "team", "status"] }],
    itemLabel: (id) => FIELD_LABELS[id] ?? id,
    onReorder: (next) => setChange(next),
  });
  const group = reorder.groups[0];
  return (
    <Flex direction="column" gap="2" style={{ maxWidth: 360 }}>
      <ul {...reorder.getGroupProps(group.id)} style={LIST_STYLE}>
        {/* No lifted branch: the ghost, the placeholder edge and the drop indicator are the
            library's, painted off the attributes `getItemProps` writes. A page that re-derives them
            from `liftedId` is rebuilding what it already spread. */}
        {group.items.map((id) => (
          <li key={id} {...reorder.getItemProps(id)} style={{ ...ROW_STYLE, border: "1px solid var(--ds-stroke-weak)" }}>
            <RadixText size="2" style={{ color: "var(--ds-text-strong)" }}>{FIELD_LABELS[id]}</RadixText>
          </li>
        ))}
      </ul>
      <span {...reorder.getInstructionsProps()}>{reorder.instructions}</span>
      <ChangeLine change={change} />
    </Flex>
  );
}

/* ---- specimen two: the case that EARNS a handle ---------------------------
   Every row carries a link and a menu button. A whole-row drag would fight both of them, and a
   whole-row click would steal the link. So the grip is the draggable part — which is the split the
   rule draws: an entity whose surface is already spoken for hands the drag to a handle. */
const WEBHOOK_LABELS: Record<string, string> = {
  build: "Build finished",
  deploy: "Deploy succeeded",
  incident: "Incident opened",
};

function SortableWebhookList() {
  const reorder = useReorder({
    defaultGroups: [{ id: "hooks", label: "Webhooks", items: ["build", "deploy", "incident"] }],
    itemLabel: (id) => WEBHOOK_LABELS[id] ?? id,
  });
  const group = reorder.groups[0];
  return (
    <Flex direction="column" gap="2" style={{ maxWidth: 360 }}>
      <ul {...reorder.getGroupProps(group.id)} style={LIST_STYLE}>
        {group.items.map((id) => (
          <li key={id} {...reorder.getItemProps(id)} style={{ ...ROW_STYLE, border: "1px solid var(--ds-stroke-weak)" }}>
            <DragHandle {...reorder.getHandleProps(id)} />
            <Link href={`#${id}`} style={{ flex: 1 }}>{WEBHOOK_LABELS[id]}</Link>
            <IconButton priority="tertiary" aria-label={`${WEBHOOK_LABELS[id]} actions`}>
              <DotsThreeVertical weight="bold" />
            </IconButton>
          </li>
        ))}
      </ul>
      <span {...reorder.getInstructionsProps()}>{reorder.instructions}</span>
    </Flex>
  );
}

/* ---- specimen three: a three-column board, THREE groups -------------------
   The same hook, the same getters, different markup and a second axis. No grips: a card on a board
   is IMPLIED draggable, so the cursor is the affordance and the card is the drag source. The
   horizontal arrow keys start working because there is a second group. */
const CARD_LABELS: Record<string, string> = {
  c1: "Audit the empty states",
  c2: "Tokenise the grip",
  c3: "Write the key map",
  c4: "Measure the pointer floor",
  c5: "Announce the cancel",
  c6: "Read the ledger",
};
const BOARD: ReorderGroup[] = [
  { id: "todo", label: "To do", items: ["c1", "c2", "c3"] },
  { id: "doing", label: "In progress", items: ["c4"] },
  { id: "review", label: "Review", items: ["c5", "c6"] },
];

/* CONTROLLED, where the list above is uncontrolled: the board owns its order and writes it from
   onReorder. Both modes are on the page on purpose, because a consumer persisting an order to a
   server needs the controlled one and should be able to read what it looks like. */
function ReorderBoard() {
  const [groups, setGroups] = useState<ReorderGroup[]>(BOARD);
  const [change, setChange] = useState<ReorderChange | null>(null);
  const reorder = useReorder({
    groups,
    itemLabel: (id) => CARD_LABELS[id] ?? id,
    onReorder: (next, nextGroups) => {
      setGroups(nextGroups);
      setChange(next);
    },
  });
  // A hand-composed column heading rides the tier through the public lane ([[size-lane-hook]]) rather than a
  // literal step, which would be inert at every size.
  // Cast at the boundary, the way MailClient does: the lane is typed `string` because it serves
  // every Radix ramp, and this call site knows which one it is handing the step to.
  const headingSize = useSizeLane("chromeHeading") as ComponentProps<typeof RadixText>["size"];
  return (
    <Flex direction="column" gap="2">
      <Grid columns="3" gap="3">
        {reorder.groups.map((group) => (
          <Box
            key={group.id}
            {...reorder.getGroupProps(group.id)}
            role="group"
            aria-label={group.label}
            style={{
              // --ds-space-12, not 8: the caret at the END of a column is centred half a row gap
              // below the final card, and it needs that much padding underneath or it is clamped
              // against the column's edge and lands on the card instead of in the gap.
              padding: "var(--ds-space-12)",
              borderRadius: "var(--ds-radius-4)",
              background: "var(--ds-bg-subtle)",
              border: `1px solid ${reorder.liftedId ? "var(--ds-stroke-strong)" : "var(--ds-stroke-weak)"}`,
              minHeight: 200,
            }}
          >
            <Flex align="center" justify="between" mb="2">
              <RadixText size={headingSize} weight="bold" style={{ color: "var(--ds-text-strong)" }}>
                {group.label}
              </RadixText>
              <Badge>{group.items.length}</Badge>
            </Flex>
            {/* gap="3" — the same --ds-space-12 the board columns use, which is the gap an 8px
                terminus fits inside with air either side. */}
            <Flex direction="column" gap="3">
              {/* `variant="outlined"` at every moment. The held card used to be switched to
                  `elevated` here, which said "raised" where the minimal pattern needs it to say
                  "picked up, still here" — and an elevated card under the ghost's 0.4 opacity reads
                  as neither. The library's ghost does the whole job. */}
              {group.items.map((id) => (
                <Card key={id} {...reorder.getItemProps(id)} variant="outlined">
                  <RadixText size="1" style={{ color: "var(--ds-text-strong)" }}>{CARD_LABELS[id]}</RadixText>
                </Card>
              ))}
            </Flex>
          </Box>
        ))}
      </Grid>
      <span {...reorder.getInstructionsProps()}>{reorder.instructions}</span>
      <ChangeLine change={change} />
    </Flex>
  );
}

/* ---- specimen four: the feedback states, frozen -------------------------------
   Every state a reorder passes through, rendered from the real attributes so a reader sees all of
   them at once and none of them needs a gesture. The capability's whole visual vocabulary is four
   things, and three of them only exist mid-drag — which is exactly why they went unnoticed until
   the board was driven in review, which found that dragging had no feedback at all and dropping
   said nothing about where the item was going to go. */

/** One frozen row. `drop` and `held` take the literal attribute objects the hook emits. */
function StateRow({
  id,
  children,
  held,
  drop,
}: {
  id: string;
  children: string;
  held?: typeof HELD;
  drop?: typeof DROP_BEFORE | typeof DROP_AFTER;
}) {
  return (
    <li
      data-ds-reorder-item={id}
      {...held}
      {...drop}
      style={{ ...ROW_STYLE, border: "1px solid var(--ds-stroke-weak)" }}
    >
      <RadixText size="2" style={{ color: "var(--ds-text-strong)" }}>{children}</RadixText>
    </li>
  );
}

/**
 * A frozen reorder GROUP, painted by the shipped code path — geometry included. `observeDropIndicator`
 * is the same function `useReorder` calls on every retarget: it measures the gap and writes the
 * custom properties `tokens/components.css` places the mark from. A hand-typed offset would be a
 * picture of the indicator rather than the indicator, and would drift the first time a row changed
 * height; this cannot, because it is the production measurement running over frozen markup.
 *
 * `sample` is the item in hand. The empty-container placeholder takes its height and its corner
 * radius from the dragged card, so a specimen that wants to show the real thing has to hand it a
 * real element to measure.
 */
function FrozenGroup({
  id,
  markId,
  markEdge = "before",
  empty,
  sample,
  style,
  children,
}: {
  id: string;
  markId?: string;
  markEdge?: "before" | "after";
  empty?: boolean;
  sample?: RefObject<HTMLElement | null>;
  style?: CSSProperties;
  children?: ReactNode;
}) {
  const ref = useRef<HTMLUListElement>(null);
  useLayoutEffect(() => {
    const group = ref.current;
    if (!group || (!markId && !empty)) return;
    const item = markId ? group.querySelector<HTMLElement>(`[data-ds-reorder-item="${markId}"]`) : null;
    return observeDropIndicator(group, item, markEdge, sample?.current ?? null);
  }, [markId, markEdge, empty, sample]);
  return (
    <Box style={{ ...LIST_FRAME, ...style }}>
      <ul
        ref={ref}
        data-ds-reorder-group={id}
        data-ds-reorder-drop={empty ? "empty" : markId ? "between" : undefined}
        style={LIST_LAYOUT}
      >
        {children}
      </ul>
    </Box>
  );
}

/** One captioned specimen in the states grid. The mark props go straight through to `FrozenGroup`. */
function StateCase({
  title,
  note,
  markId,
  markEdge,
  children,
}: {
  title: string;
  note: ReactNode;
  markId?: string;
  markEdge?: "before" | "after";
  children: ReactNode;
}) {
  return (
    <Flex direction="column" gap="2">
      <RadixText size="1" weight="medium" style={{ color: "var(--ds-text-strong)" }}>{title}</RadixText>
      <FrozenGroup id={`states-${title}`} markId={markId} markEdge={markEdge}>
        {children}
      </FrozenGroup>
      <Caption>{note}</Caption>
    </Flex>
  );
}

/**
 * The empty-container case, and it needs BOTH lists to be honest. Review of the first build's
 * version of this frame found it the worst case: it shows where the thing will land and nothing
 * else, and with nothing else in the container the coloured line says nothing. What the reader has to
 * see is the pairing — a card lifted out of one list, and the SHAPE of that card standing in the
 * one it is heading for — so the specimen renders the source beside the destination and measures
 * the placeholder off the real ghost.
 */
function EmptyTargetCase() {
  const ghost = useRef<HTMLLIElement>(null);
  return (
    <Flex direction="column" gap="2">
      <RadixText size="1" weight="medium" style={{ color: "var(--ds-text-strong)" }}>Into an empty list</RadixText>
      <Flex direction="column" gap="1">
        <FrozenGroup id="states-empty-source">
          <li ref={ghost} data-ds-reorder-item="empty-src" {...HELD} style={{ ...ROW_STYLE, border: "1px solid var(--ds-stroke-weak)" }}>
            <RadixText size="2" style={{ color: "var(--ds-text-strong)" }}>Role</RadixText>
          </li>
        </FrozenGroup>
        <FrozenGroup id="states-empty-target" empty sample={ghost} />
      </Flex>
      <Caption>
        A line is a <strong>relative</strong> mark: the rows either side are what give it meaning. There are none
        here, so a line would be a coloured stripe pointing at nothing. The container shows the shape of the
        outcome instead — a slot the size and the corner radius of the card actually in hand, measured off it.
      </Caption>
    </Flex>
  );
}

/* The cursor is the one state a screenshot cannot show, because the pointer is not part of the page.
   Phosphor's two hands ARE the two cursors, so the affordance can be read rather than described. */
const CURSORS: [typeof Hand, string, ReactNode][] = [
  [HandPointing, "pointer", <>What a link shows, and what a nested control inside an item keeps — a click there really is that control's. It is also what a board card used to show everywhere, because <Code>ClickableCard</Code>'s stretched overlay covers the whole card.</>],
  [Hand, "grab", <>The whole draggable surface, at rest and on hover, overlay included. On a card with no grip this is the entire affordance, which is why it is not allowed to be wrong.</>],
  [HandGrabbing, "grabbing", <>From the moment a press becomes a drag until it ends — on the <strong>document</strong>, not the item. A drag captures the pointer on the group, so the hand spends the gesture over everything except the thing it is holding.</>],
];

/* ---- the target-size ladder, measured off the rendered button -------------
   The box is IconButton's, so this reads the [[control-box-per-step]] control box rather than a number this page typed.
   The unsized handle is the one that moves with the uiSize toolbar; the three explicit steps are
   pinned so the ladder is visible on one screen. */
function HandleBox({ size, caption }: { size?: "1" | "2" | "3"; caption: string }) {
  const ref = useRef<HTMLButtonElement>(null);
  const [box, setBox] = useState("");
  useLayoutEffect(() => {
    const node = ref.current;
    if (!node) return;
    const rect = node.getBoundingClientRect();
    setBox(`${Math.round(rect.width)} × ${Math.round(rect.height)}`);
  }, [size]);
  return (
    <Flex direction="column" align="center" gap="1">
      <DragHandle ref={ref} label={`Reorder ${caption}`} size={size} />
      <Mono>{box || "…"}</Mono>
      <RadixText size="1" style={{ color: "var(--ds-text-weak)" }}>{caption}</RadixText>
    </Flex>
  );
}

/* ---- anatomy diagram ------------------------------------------------------
   Four numbered callouts on one real row: the glyph, the hit box, the item the grip belongs to, and
   the hidden instructions node. The pins sit on the specimen rather than in a gutter, because the
   row is only a few tens of pixels tall. */
const PINS: [number, string][] = [
  [1, "calc(50% - 46px)"],
  [2, "calc(50% - 12px)"],
  [3, "calc(50% + 30px)"],
  [4, "calc(50% + 96px)"],
];

function AnatomyDiagram() {
  return (
    <Box style={{ position: "relative", padding: "44px 0 12px", maxWidth: 360 }}>
      <Flex align="center" gap="2" style={{ position: "relative" }}>
        {PINS.map(([n, left]) => (
          <span key={n} data-pin={n} style={{ ...dotStyle, position: "absolute", left, top: -34 }}>
            {n}
          </span>
        ))}
        <Box
          style={{
            ...ROW_STYLE,
            border: "1px solid var(--ds-stroke-weak)",
            width: "100%",
          }}
        >
          <DragHandle label="Reorder Email address" />
          <RadixText size="2" style={{ color: "var(--ds-text-strong)" }}>Email address</RadixText>
        </Box>
      </Flex>
    </Box>
  );
}

const ANATOMY_PARTS: [number, string, string][] = [
  [1, "Grip glyph", "DotsSixVertical at weight=\"bold\" — a sparse glyph carries a weight by ruling ([[optical-icon-weight]]), or it reads as disabled beside the dense icons in the same row."],
  [2, "Hit target", "The ghost IconButton box: 24 / 32 / 40px across the three tiers. A handle that is the only draggable region carries the whole reorder, so it takes this system's 24×24 pointer floor and never less."],
  [3, "The item", "Spread getItemProps here. The item is the drag source whether or not a grip exists, and while something is lifted it is also a destination a single click can place on."],
  [4, "Instructions", "One hidden node per list, rendered from getInstructionsProps and named by every item's and every handle's aria-describedby."],
];

/* ---- token spec: measured off rendered handles and frozen reorder states ---- */
function DragHandleTokens() {
  const specGhost = useRef<HTMLLIElement>(null);
  return (
    <Box style={{ borderRadius: "var(--ds-radius-4)", border: "1px solid var(--ds-stroke-weak)", overflow: "hidden", background: "var(--ds-bg-subtle)" }}>
      <Flex direction="column" gap="2" style={{ padding: "20px" }}>
        <RadixText size="1" style={{ color: "var(--ds-text-weak)" }}>
          The grip adds four declarations to a ghost <Mono>IconButton</Mono>, and the capability's feedback adds
          four paints on top — all eight from existing roles and <strong>no new tokens</strong>. The glyph is the
          neutral icon role rather than the accent a ghost button would paint; the held state is the press fill;
          the ghost's placeholder edge is the ordinary component border; the insertion caret is a solid from the 9
          rung, because it is a mark rather than a border and a border step vanishes against a card's own
          hairline; and the empty container's placeholder is the other way round — it IS an edge, so it takes the
          accent border step over the faintest accent wash the system has.
        </RadixText>
      </Flex>
      <MeasuredSpec
        render={() => (
          <Flex align="center" gap="3">
            <DragHandle label="Reorder row" />
            <DragHandle label="Held row" {...HELD} />
            {/* The reorder states, frozen from the attributes the getters emit — and placed by the
                same measuring code a live drag runs, so the caret in this spec is the shipped one. */}
            <FrozenGroup id="spec" markId="spec-drop" style={{ width: 150 }}>
              <li ref={specGhost} data-ds-reorder-item="spec-ghost" {...HELD} style={{ ...ROW_STYLE, border: "1px solid var(--ds-stroke-weak)" }}>
                <RadixText size="1">Held</RadixText>
              </li>
              <li data-ds-reorder-item="spec-drop" {...DROP_BEFORE} style={{ ...ROW_STYLE, border: "1px solid var(--ds-stroke-weak)" }}>
                <RadixText size="1">Lands here</RadixText>
              </li>
            </FrozenGroup>
            <FrozenGroup id="spec-empty" empty sample={specGhost} style={{ width: 110 }} />
          </Flex>
        )}
      >
        <MeasuredRow
          part="Grip glyph"
          note="currentColor on the button, inherited by the SVG (GUIDELINES §4)."
          token="--ds-icon-neutral"
          select=".rt-ds-drag-handle"
          prop="color"
        />
        <MeasuredRow
          part="Held · fill"
          note="Read off a handle carrying the attribute the hook writes on a lift."
          token="--ds-fill-press"
          select=".rt-ds-drag-handle[data-ds-reorder-lifted]"
          prop="background-color"
        />
        <MeasuredRow
          part="Held · glyph"
          token="--ds-text-strong"
          select=".rt-ds-drag-handle[data-ds-reorder-lifted]"
          prop="color"
        />
        <MeasuredRow
          part="Focus ring"
          note="The IconButton's ring, read at its accent base. A Radix alpha, --ds-stroke-focus-stack, sits on top of it, 2px wide, 2px outside the handle ([[focus-ring]])."
          token="--ds-stroke-focus"
          select=".rt-ds-drag-handle"
          prop="outline-color"
          state="focus-visible"
        />
        <MeasuredRow
          part="Ghost · placeholder edge"
          note="The dashed outline on a held item. Outline, not border: the item's box must not move when it is picked up."
          token="--ds-stroke-strong"
          select="[data-ds-reorder-item][data-ds-reorder-lifted]"
          prop="outline-color"
        />
        <MeasuredRow
          part="Insertion caret · line"
          note="A 2px rule on the GROUP, centred in the measured gap and as wide as the item it points at — never on the item, whose box a Radix Card clips at."
          token="--accent-indicator"
          select="[data-ds-reorder-group][data-ds-reorder-drop='between']"
          prop="background-color"
          pseudo="::before"
        />
        <MeasuredRow
          part="Insertion caret · terminus"
          note="The 8px dot at the leading end. It is what separates a caret from a card's own hairline: a rule alone reads as a border, a rule with a terminus reads as an insertion point."
          token="--accent-indicator"
          select="[data-ds-reorder-group][data-ds-reorder-drop='between']"
          prop="background-color"
          pseudo="::after"
        />
        <MeasuredRow
          part="Empty container · slot edge"
          note="A card-shaped placeholder, not a line: with no rows either side there is nothing for a line to be relative to. Height and radius are measured off the item in hand."
          token="--ds-stroke-accent"
          select="[data-ds-reorder-group][data-ds-reorder-drop='empty']"
          prop="border-top-color"
          pseudo="::after"
        />
        <MeasuredRow
          part="Empty container · slot wash"
          token="--ds-fill-accent-weak"
          select="[data-ds-reorder-group][data-ds-reorder-drop='empty']"
          prop="background-color"
          pseudo="::after"
        />
        <NoteRow part="Ghost · opacity" value="0.4, a literal beside the 0.5 and 0.6 this file already spends on the same job" radix="dimmed rather than removed, so the item reads as still there and not yet displaced" />
        <NoteRow part="Cursor" value="grab on the ITEM, the grip and a stretched link overlay; grabbing on the DOCUMENT for the life of a drag" radix="the closed hand is a state of the page, because a captured pointer spends the drag away from the item" />
        <NoteRow part="Motion" value="a background-color transition on the grip and an opacity transition on the item, both --ds-duration-fast" radix="prefers-reduced-motion clamps both to 0.01ms in motion.css" />
      </MeasuredSpec>
    </Box>
  );
}

/* ---- Keyboard + pointer map ---------------------------------------------- */
const KEYS: KeyBinding[] = [
  { keys: ["Space"], action: <>On a resting item, <strong>lift</strong> it. On the lifted item, <strong>drop</strong> it where it points. On another item, place the lifted item on that item's slot. Space rather than Enter, because an item is often a link and Enter belongs to the link.</>, src: "system" },
  { keys: ["Enter"], action: <>While something is lifted, <strong>drop</strong> it. While nothing is, Enter is left alone and does whatever the item already did — follow its link, press its button. On a <Code>DragHandle</Code>, which does nothing else, Enter lifts as well.</>, src: "system" },
  { keys: ["↑", "↓"], action: <>While lifted, move the item one slot <strong>within its group</strong>. Neither end wraps — an edge press does nothing rather than teleporting the item.</>, src: "system" },
  { keys: ["←", "→"], action: <>While lifted, move the item to the <strong>adjacent group</strong>, keeping its index clamped into the new group. Silent for a single-group list, where sideways means nothing.</>, src: "system" },
  { keys: ["Escape"], action: <>Cancel and return the item to its origin, from a keyboard lift or a pointer drag alike. It reaches the lift from <strong>any</strong> item, so tabbing away mid-gesture is not a dead end.</>, src: "system" },
  { keys: ["Tab"], action: <>Move to the next item. An item that is already focusable (a link, a button) keeps its own single tab stop; a plain one is given a tab stop by the hook, measured off the mounted node rather than guessed.</>, src: "system" },
];

/* ---- Props ---------------------------------------------------------------- */
const PROPS: PropDef[] = [
  { name: "label", type: "string", desc: <>Accessible name. Spreading <Code>getHandleProps(id)</Code> supplies one that states the held position, so pass this only for a grip you drive yourself. It wins over a spread <Code>aria-label</Code>.</>, source: "DragHandle.tsx" },
  { name: "orientation", type: `"vertical" | "horizontal"`, def: `"vertical"`, desc: <>Grip axis: <Code>DotsSixVertical</Code> for a stacked list, <Code>DotsSix</Code> for a row. Both declare <Code>weight="bold"</Code> ([[optical-icon-weight]]).</>, source: "DragHandle.tsx" },
  { name: "size", type: `"1" | "2" | "3"`, desc: <>Explicit control step. Unset, it rides the global <Code>uiSize</Code> control lane (24 / 32 / 40px), which is what keeps the 24×24 floor at the smallest tier.</>, source: "IconButton.tsx" },
  { name: "disabled", type: "boolean", def: "false", desc: <>Native button disabled. A locked row keeps its grip visible and inert rather than losing it.</>, source: "IconButton.tsx" },
  { name: "className", type: "string", desc: <>Appended after <Code>rt-ds-drag-handle</Code>.</>, source: "DragHandle.tsx" },
  { name: "priority", type: "—", locked: true, desc: <>Locked to <Code>tertiary</Code> (ghost). A grip is chrome, and a surface or solid one would read as the row's primary action.</>, source: "DragHandle.tsx" },
];

/* ========================================================================== */
const meta: Meta<typeof DragHandle> = {
  title: "Components/Action/DragHandle",
  component: DragHandle,
  parameters: {
    controls: { disable: true },
    docs: {
      description: {
        component:
          "**DragHandle** is the OPTIONAL grip for a reorderable item — a `tertiary` (ghost) `IconButton` " +
          "carrying `DotsSixVertical` at `weight=\"bold\"` (the [[optical-icon-weight]] sparse-glyph rule). The drag source is " +
          "the item: spread `useReorder().getItemProps(id)` and the pointer drag, the keyboard route and the " +
          "single-pointer click route (WCAG 2.5.7) all work with no handle anywhere. Add one to signal that " +
          "something is draggable when its shape does not already say so, or to keep the drag off an item " +
          "whose own content is interactive. It composes rather than invents: the control box, the 24×24 " +
          "target floor, the control size lane and the system focus ring ([[focus-ring]]) all arrive from " +
          "`IconButton`.",
      },
    },
  },
};
export default meta;
type Story = StoryObj<typeof DragHandle>;

/* ---- Anatomy ------------------------------------------------------------- */
export const Anatomy: Story = {
  render: () => (
    <Page>
      <PageHeader title="DragHandle · Anatomy" standfirst={DEFINITION} />

      <Section title="Start here: there is no handle in this list" lead="Two getters — getGroupProps on the list, getItemProps on each row — and the rows drag, lift by keyboard, and place by single click. The component this page documents is nowhere in it.">
        <SortableFieldList />
        <Caption>
          The ruling: a whole card is dragged whole, and a drag handle is for precise handling or for
          confirming that an item is draggable where that is not already apparent. The rule that follows is
          that a whole entity is draggable by default, and a grip is what an entity earns when its own surface
          is already spoken for by a link, a button or a field.
        </Caption>
      </Section>

      <Rule />

      <Section title="Anatomy" lead="Four parts, and only the first two are the component: the glyph and its box. The item and the instructions node belong to the list around it.">
        <AnatomyDiagram />
        <AnatomyLegend parts={ANATOMY_PARTS} />
        <Caption>The handle is a real <Code>&lt;button&gt;</Code>, which is what makes Space and Enter reach it without a hand-rolled key listener. It is a second entrance to the same machine, never a second machine.</Caption>
      </Section>

      <Rule />

      <Section title="Target size" lead="The box is IconButton's, so the 24×24 pointer floor (GUIDELINES §9) holds at the smallest step. Each figure is read off the rendered button, not typed here.">
        <SizeLesson why="the ladder IS the lesson: three pinned steps beside the ambient one, so a reader sees the whole control lane on one screen and can check the 24px floor at the bottom of it">
          <Flex align="end" gap="5">
            <HandleBox caption="rides the tier" />
            <HandleBox size="1" caption="size 1" />
            <HandleBox size="2" caption="size 2" />
            <HandleBox size="3" caption="size 3" />
          </Flex>
        </SizeLesson>
        <Caption>When the grip is the only draggable part of an entity, it carries the whole reorder for a pointer — so it is the last control on the page that can afford to be under the floor. Flip the <Code>uiSize</Code> toolbar and the first specimen moves with it; the three pinned steps do not. [[checkbox-target-size]] records that <Code>Checkbox</Code> does not meet this floor, so the floor is worth measuring rather than assuming.</Caption>
      </Section>

      <Rule />

      <Section title="Orientation" lead="Two glyphs, one rule: whichever reads as the grip for the axis the list runs on.">
        <Flex align="center" gap="5">
          <Flex align="center" gap="2"><DragHandle label="Reorder row" /><Code>vertical</Code></Flex>
          <Flex align="center" gap="2"><DragHandle label="Reorder column" orientation="horizontal" /><Code>horizontal</Code></Flex>
        </Flex>
      </Section>
    </Page>
  ),
  play: async ({ canvasElement }) => {
    // The legend numbers each part, so each number has to point at something on the specimen.
    const pins = canvasElement.querySelectorAll("[data-pin]");
    if (pins.length !== ANATOMY_PARTS.length)
      throw new Error(`expected ${ANATOMY_PARTS.length} callout pins on the specimen; got ${pins.length}`);
    // The pointer floor, asserted rather than claimed: every handle on the page, whatever its step.
    for (const handle of canvasElement.querySelectorAll(".rt-ds-drag-handle")) {
      const rect = handle.getBoundingClientRect();
      if (rect.width < 24 || rect.height < 24)
        throw new Error(`a DragHandle measured ${rect.width}×${rect.height}, under the 24×24 pointer floor`);
    }
    // The first specimen is the whole point of the page opening on it: it must contain no grip, and
    // its rows must still be reachable by Tab.
    const first = canvasElement.querySelector("[data-ds-reorder-group]");
    if (!first) throw new Error("the opening specimen renders no reorder group");
    if (first.querySelector(".rt-ds-drag-handle"))
      throw new Error("the opening specimen is supposed to prove a list needs no handle, and it has one");
    for (const item of first.querySelectorAll<HTMLElement>("[data-ds-reorder-item]")) {
      if (item.tabIndex < 0) throw new Error(`item ${item.dataset.dsReorderItem} is not a tab stop`);
    }
  },
};

/* ---- Usage --------------------------------------------------------------- */
export const Usage: Story = {
  // The DO/DON'T word sits at the documented small-bold exception ([[soft-fill-text-exception]]), the same carve-out every
  // other page's card label takes. The specimens themselves stay fully checked.
  parameters: { a11y: { context: { exclude: [DODONT_LABEL] } } },
  render: (_args, { globals }) => (
    <Page>
      <PageHeader title="DragHandle · Usage" standfirst={DEFINITION} />

      <Section title="When a handle earns its place" lead="Every row here holds a link and a menu button. A whole-row drag would fight both, and a whole-row click would steal the link — so the grip is the draggable part.">
        <SortableWebhookList />
        <Caption>
          This is the exception, stated as one: “if the entity has other interactive parts (eg buttons,
          dropdowns), then just make the drag handle icon the draggable part of the entity”. The other reason to
          add one is discoverability — a grip tells a reader the row moves when nothing else about the row does.
        </Caption>
      </Section>

      <Rule />

      <Section title="The same hook, a board" lead="Three groups instead of one, columns instead of rows, and no grips: a card is implied draggable, so the grab cursor is the affordance. The horizontal arrow keys start working because a second group exists.">
        <ReorderBoard />
        <Caption>The list on the Anatomy page is <strong>uncontrolled</strong> (<Code>defaultGroups</Code>, the hook owns the order). This board is <strong>controlled</strong>: it holds the array itself and writes the one <Code>onReorder</Code> hands it, which is the mode to use when the order is persisted somewhere.</Caption>
      </Section>

      <Rule />

      <Section title="Do / don't" lead="The item is the drag source. The grip is an affordance you add for a reason you can name.">
        <Grid columns={{ initial: "1", sm: "2" }} gap="3">
          <DoDont kind="do" bare note="Drag the whole thing. A card, a settings row, a list item with nothing else to click: spread getItemProps and leave the row's surface as the target. The grab cursor is the affordance.">
            <Flex align="center" gap="2" style={{ ...ROW_STYLE, border: "1px solid var(--ds-stroke-weak)", cursor: "grab" }}>
              <RadixText size="2">Email address</RadixText>
            </Flex>
          </DoDont>
          <DoDont kind="dont" bare note="Do not hang a grip beside a row that has nothing else to click. It buys no affordance the cursor does not already give, it shrinks the row it sits next to, and a column of them reads as a gutter of loose furniture.">
            <Flex align="center" gap="1">
              <DragHandle label="Reorder Email address" />
              <Flex align="center" gap="2" style={{ ...ROW_STYLE, border: "1px dashed var(--ds-stroke-strong)", flex: 1 }}>
                <RadixText size="2">Email address</RadixText>
              </Flex>
            </Flex>
          </DoDont>
        </Grid>
        <Caption>
          Neither route may be the only one. A drag alone fails <strong>WCAG 2.5.7</strong>, which asks for a
          single-pointer alternative to the dragging movement and is not discharged by a keyboard equivalent —
          the gap [[dragging-movement-gaps]] already records against two existing components.
        </Caption>
      </Section>

      <Rule />

      <HexThemeKey.Provider value={`${globals.accent}-${globals.appearance}-${globals.contrast}`}>
        <Section title="Tokens" lead="Each row is read off a rendered handle and checked against the token it names, so the table can disagree with the component.">
          <DragHandleTokens />
        </Section>
      </HexThemeKey.Provider>
    </Page>
  ),
  play: async ({ canvasElement }) => {
    const rows = assertMeasuredRows(canvasElement);
    if (rows.measured !== 9 || rows.unproven !== 0) {
      throw new Error(`expected 9 measured / 0 unproven token rows, got ${rows.measured} / ${rows.unproven}`);
    }
    // Every ITEM names an instructions element, and that element has to exist: a describedby
    // pointing at nothing tells assistive tech precisely nothing. The item carries it now, because
    // the item is what a reader lands on when there is no grip.
    const item = canvasElement.querySelector("[data-ds-reorder-item]");
    const id = item?.getAttribute("aria-describedby");
    if (!id) throw new Error("the first reorder item carries no aria-describedby");
    const target = canvasElement.querySelector(`#${id}`) ?? document.getElementById(id);
    if (!target?.textContent?.includes("space bar"))
      throw new Error(`aria-describedby="${id}" does not resolve to the key map`);
  },
};

/* ---- Feedback ------------------------------------------------------------ */
export const Feedback: Story = {
  render: () => (
    <Page>
      <PageHeader title="DragHandle · Feedback" standfirst={DEFINITION} />

      <Section
        title="Four states, none of which needs a gesture to see"
        lead="Every specimen below is frozen from the attributes the prop getters actually emit, so what is on this page is the shipped paint rather than a picture of it."
      >
        <Grid columns={{ initial: "1", sm: "2" }} gap="4">
          <StateCase
            title="1 · At rest"
            note={<>Nothing but the cursor. The library paints no resting decoration on an item: whatever the row already looked like, it still looks like.</>}
          >
            <StateRow id="rest-a">Full name</StateRow>
            <StateRow id="rest-b">Email address</StateRow>
          </StateCase>

          <StateCase
            title="2 · Hovered"
            note={<>Also nothing but the cursor — hover the rows above and watch it turn <Mono>grab</Mono>. A hover FILL would be wrong here and not merely unnecessary: a row's hover belongs to the row, and a card that already washes itself would wash twice.</>}
          >
            <StateRow id="hover-a">Full name</StateRow>
            <StateRow id="hover-b">Email address</StateRow>
          </StateCase>

          <StateCase
            title="3 · Lifted — the ghost"
            note={<>The held item keeps its slot at <Mono>opacity: 0.4</Mono> behind a dashed placeholder edge. It does not move, and nothing around it moves either, which is what leaves the original order readable while you decide.</>}
          >
            <StateRow id="lift-a" held={HELD}>Full name</StateRow>
            <StateRow id="lift-b">Email address</StateRow>
          </StateCase>

          <StateCase
            title="4 · Lifted — with the drop indicator"
            note={<>The same lift, pointing somewhere. The caret sits in the GAP between two rows, touching neither, with a terminus at its leading end — that is what makes it read as an insertion point rather than as the top border of the row below it. One mark for a drag, an arrow key and a destination click alike, because all three move one pending position.</>}
            markId="drop-b"
          >
            <StateRow id="drop-a" held={HELD}>Full name</StateRow>
            <StateRow id="drop-b" drop={DROP_BEFORE}>Email address</StateRow>
            <StateRow id="drop-c">Role</StateRow>
          </StateCase>
        </Grid>
      </Section>

      <Rule />

      <Section title="Where the indicator can land" lead="Three cases, and the last two are the ones a reorder usually gets wrong: past the final item, and into a list with nothing in it.">
        <Grid columns={{ initial: "1", sm: "3" }} gap="4">
          <StateCase title="Between two items" markId="mid-b" note={<>Centred in the space between them, as wide as the rows themselves.</>}>
            <StateRow id="mid-a">Full name</StateRow>
            <StateRow id="mid-b" drop={DROP_BEFORE}>Email address</StateRow>
            <StateRow id="mid-c">Role</StateRow>
          </StateCase>
          <StateCase title="At the end" markId="end-c" markEdge="after" note={<>In the gap BELOW the final row, the same distance off it as any caret between two rows — not pinned to the bottom of the container.</>}>
            <StateRow id="end-a">Full name</StateRow>
            <StateRow id="end-b">Email address</StateRow>
            <StateRow id="end-c" drop={DROP_AFTER}>Role</StateRow>
          </StateCase>
          <EmptyTargetCase />
        </Grid>
        <Caption>
          THE GROUP OWNS THE MARK, not the item, and the first build proved why by not doing it. It hung a{" "}
          <Mono>box-shadow</Mono> off the item to avoid a measurement
          pass, and a shadow is clipped to the outside of its own border box, so it can only ever start at that
          item's edge: the one place an insertion mark must never be. Nor can a pseudo-element rescue it. Measured
          here, Radix's <Code>Card</Code> — the item shape the board uses — carries <Mono>overflow: hidden</Mono>{" "}
          and <Mono>contain: paint</Mono> and has already spent both pseudos, so an item that is a Card can paint
          nothing outside itself at all. The group is the one element in the contract guaranteed to be a plain
          container, and it is also the element that owns the gaps. It costs one{" "}
          <Mono>getBoundingClientRect</Mono> pass per retarget and buys a single mark that a bare <Mono>li</Mono>{" "}
          and a skinned <Code>Card</Code> wear identically.
        </Caption>
      </Section>

      <Rule />

      <Section title="The cursor is two states, not one" lead="An open hand over anything that can be picked up, and a closed hand for as long as something is being held. The second half is a state of the whole page, not of the item.">
        <Flex direction="column" gap="3">
          {CURSORS.map(([Glyph, name, note]) => (
            <Flex key={name} align="start" gap="3">
              <Glyph size={24} color="var(--ds-icon-neutral)" aria-hidden />
              <Flex direction="column" gap="1" style={{ flex: 1 }}>
                <Mono>cursor: {name}</Mono>
                <RadixText size="1" style={{ color: "var(--ds-text-weak)" }}>{note}</RadixText>
              </Flex>
            </Flex>
          ))}
        </Flex>
        <Caption>
          The closed hand belongs to the document because a drag captures the pointer on the GROUP, so the hand
          spends almost the whole gesture over something other than the card it is holding. Measured here before
          it existed: mid-drag, <Mono>getComputedStyle(document.body).cursor</Mono> read <Mono>auto</Mono>, and on
          a board card even the resting cursor was <Mono>pointer</Mono>, because <Code>ClickableCard</Code>'s
          stretched overlay covers the card and an anchor's cursor comes from the user-agent stylesheet.
        </Caption>
      </Section>

      <Rule />

      <Section title="Minimal, not maximal" lead="Two patterns were on the table and the choice is a ruling, not a preference.">
        <Grid columns={{ initial: "1", sm: "2" }} gap="3">
          <DoDont kind="do" bare note="MINIMAL — the list holds still, the held item stays put as a ghost, and a thin indicator marks the slot. Less movement, the original order stays readable, and abandoning the move is obviously free.">
            <Flex direction="column" gap="2" style={{ width: "100%" }}>
              <FrozenGroup id="do-minimal" markId="do-b">
                <StateRow id="do-a" held={HELD}>Full name</StateRow>
                <StateRow id="do-b" drop={DROP_BEFORE}>Email address</StateRow>
                <StateRow id="do-c">Role</StateRow>
              </FrozenGroup>
            </Flex>
          </DoDont>
          <DoDont kind="dont" bare note="MAXIMAL — the list opens a real gap and the item is already in it. The feedback is immediate, and the cost is the one its own advocates name: it stops being clear how to back out without changing anything.">
            <Flex direction="column" gap="2" style={{ width: "100%" }}>
              <FrozenGroup id="dont-maximal">
                <StateRow id="dont-a">Email address</StateRow>
                <StateRow id="dont-b" held={HELD}>Full name</StateRow>
                <StateRow id="dont-c">Role</StateRow>
              </FrozenGroup>
            </Flex>
          </DoDont>
        </Grid>
        <Caption>
          The capability shipped maximal and was corrected. Three reasons, in order: Escape-to-cancel is a published
          part of the <strong>[[reorder-single-pointer-path]]</strong> contract and the maximal pattern's stated disadvantage undercuts it; one
          visual language has to serve three input routes, and a keyboard lift has no pointer to follow or gap to
          open under a finger; and resolving a hit against a list that reflows <em>because</em> the pointer is there
          is a feedback loop, which is where reorder oscillation comes from.
        </Caption>
      </Section>

      <Rule />

      <Section title="Now do it for real" lead="Every state above, driven. Press an item to lift it, or drag it — the threshold between the two is 5px.">
        <SortableFieldList />
      </Section>
    </Page>
  ),
  play: async ({ canvasElement }) => {
    // The page's whole claim is that a reader sees the feedback WITHOUT dragging, so the frozen
    // specimens have to actually be painting — and, since the mark moved onto the group, that its
    // GEOMETRY was measured rather than left at the CSS fallback of 0. An indicator pinned to the
    // top of its container is the defect this build exists to fix, so it is the thing asserted.
    const ghost = canvasElement.querySelector<HTMLElement>('[data-ds-reorder-item="lift-a"]');
    if (!ghost) throw new Error("the lifted specimen is missing");
    if (Number(getComputedStyle(ghost).opacity) >= 1)
      throw new Error("the lifted specimen is not painting as a ghost");
    // And it must NOT be wearing an accent ring: a ring says "drop INTO this", which is the one
    // thing an insertion mark never means ([[reorder-capability]] as amended).
    if (getComputedStyle(ghost).outlineStyle !== "dashed")
      throw new Error("the ghost's placeholder edge is not the neutral dashed outline");

    for (const group of canvasElement.querySelectorAll<HTMLElement>('[data-ds-reorder-drop="between"]')) {
      const y = Number.parseFloat(getComputedStyle(group).getPropertyValue("--ds-reorder-drop-y"));
      if (!Number.isFinite(y) || y <= 0)
        throw new Error(`a caret specimen was never measured: --ds-reorder-drop-y is "${y}"`);
      if (getComputedStyle(group, "::before").content === "none")
        throw new Error("a group carrying the between attribute paints no caret");
    }

    const empty = canvasElement.querySelector<HTMLElement>('[data-ds-reorder-drop="empty"]');
    if (!empty) throw new Error("the empty-list specimen is missing");
    if (getComputedStyle(empty, "::after").content === "none")
      throw new Error("an empty list carrying the drop attribute paints no placeholder");
    // Card-SHAPED, not a hairline: the review finding on the first build was a 3px line at
    // the top of an empty column. A slot measured off the item in hand is tens of pixels tall.
    if (Number.parseFloat(getComputedStyle(empty, "::after").height) < 16)
      throw new Error("the empty-list placeholder is a line, not a slot");
  },
};

/* ---- Keyboard ------------------------------------------------------------ */
export const Keyboard: Story = {
  render: () => (
    <Page>
      <PageHeader title="DragHandle · Keyboard" standfirst={DEFINITION} />

      <Section title="Keyboard" lead="A lift is a mode: the arrow keys belong to the reorder while an item is held, and to the page when nothing is.">
        <Box style={{ border: "1px solid var(--ds-stroke-weak)", borderRadius: "var(--ds-radius-4)", overflow: "hidden" }}>
          {KEYS.map((k, i) => <KeyRow key={i} {...k} />)}
        </Box>
        <Caption>Unhandled keys are left alone, so a list with its own typeahead or roving focus keeps working around the capability. Keys pressed inside a field, a button or a switch belong to that control and never reach the reorder.</Caption>
      </Section>

      <Rule />

      <Section title="The single-pointer route is the same machine" lead="Click a row to lift it, then click a destination to place it. No drag, no key, and the item lands in the slot the destination occupies — which is the alternative WCAG 2.5.7 asks for and a keyboard path never supplies.">
        <SortableFieldList />
        <Caption>
          A drag works too, on Pointer Events rather than the HTML5 drag-and-drop API: a press becomes a drag
          once it travels <Mono>5px</Mono> — the distance at which a still hand's drift ends and intent begins —
          and under that it stays a click. On touch the separator is time rather than distance, a{" "}
          <Mono>120ms</Mono> hold, because a touch drag and a page scroll are the same gesture until something
          tells them apart.
        </Caption>
      </Section>

      <Rule />

      <Section title="Where the click route cannot reach" lead="An item whose surface already does something keeps that something, and loses the click-to-lift.">
        <Flex direction="column" gap="2">
          <RadixText size="2" style={{ color: "var(--ds-text-weak)" }}>
            A click that lands on a link, a button or a field belongs to that control, so the item's
            single-pointer lift stands aside — otherwise a board card could never be opened by clicking it. The
            drag and the keyboard route still work, and the destination half of the click route still works, but
            the LIFT half does not. For those items the 2.5.7 alternative has to be an explicit control: a
            <strong> More</strong> menu carrying the movement outcomes as ordinary menu items, which is the
            pattern the WCAG Understanding document names for a dragging movement that cannot be replaced by a
            simpler pointer gesture.
          </RadixText>
          <Caption>Open gap, recorded rather than papered over: the hook ships no move-outcome menu today.</Caption>
        </Flex>
      </Section>
    </Page>
  ),
};

/* ---- Across groups ------------------------------------------------------- */
export const AcrossGroups: Story = {
  render: () => (
    <Page>
      <PageHeader title="DragHandle · Across groups" standfirst={DEFINITION} />

      <Section title="Moving between lists" lead="Lift a card, then ← and → to change column and ↑ and ↓ to change position. A click on another column's card, or on the column itself, does the same move with one pointer and no drag.">
        <ReorderBoard />
      </Section>

      <Rule />

      <Section title="What the index means when the group changes" lead="An index is always the item's FINAL position, and the two bounds differ by one — which is the off-by-one a same-list move introduces.">
        <Flex direction="column" gap="2">
          <RadixText size="2" style={{ color: "var(--ds-text-weak)" }}>
            Within one group the item is removed before it is reinserted, so the last slot it can reach is{" "}
            <Mono>length - 1</Mono>. Into another group nothing is removed, so the last slot is <Mono>length</Mono>,
            one past the final card — which is how a column takes an appended card at all. Reading both bounds as{" "}
            <Mono>length</Mono> is what makes an item moved one place down inside its own list land back where it
            started, and <Code>useReorder.logic.test.ts</Code> pins every case.
          </RadixText>
          <Caption>The announcement states the resolved position in human terms after each move: “Tokenise the grip, position 2 of 4 in In progress”. Position, never index — “position 2” is what a listener can act on, where “index 1” asks them to do arithmetic about a list they cannot see.</Caption>
        </Flex>
      </Section>
    </Page>
  ),
};

/* ---- Props --------------------------------------------------------------- */
type PropsArgs = { label: string; orientation: DragHandleOrientation; size: "1" | "2" | "3"; disabled: boolean };

export const Props: StoryObj<PropsArgs> = {
  args: { label: "Reorder Email address", orientation: "vertical", size: "2", disabled: false },
  argTypes: {
    label: { control: "text", description: "Accessible name (the hook supplies one when you spread getHandleProps).", table: { category: "Content" } },
    orientation: { control: "inline-radio", options: ["vertical", "horizontal"], description: "Grip axis.", table: { category: "Variant" } },
    size: { control: "inline-radio", options: ["1", "2", "3"], description: "Explicit control step; unset rides the uiSize lane.", table: { category: "Size" } },
    disabled: { control: "boolean", description: "Native button disabled.", table: { category: "State" } },
  },
  parameters: { controls: { disable: false } },
  render: ({ label, orientation, size, disabled }: PropsArgs) => (
    <Page maxWidth="none">
      <PageHeader title="DragHandle · Props" standfirst={DEFINITION} />
      <Flex align="center" gap="2" style={{ padding: "var(--ds-space-8) 0 var(--ds-space-2)" }}>
        <DragHandle label={label} orientation={orientation} size={size} disabled={disabled} />
        <RadixText size="2" style={{ color: "var(--ds-text-weak)" }}>{label}</RadixText>
      </Flex>
      <PropsLead />
      <Rule />
      <Section title="Props reference" lead={<>Every prop <Code>DragHandle</Code> takes. The reorder behaviour is <Code>useReorder</Code>'s, spread in through <Code>getHandleProps(id)</Code>.</>}>
        <PropTable rows={PROPS} />
      </Section>
      <Rule />
      <Section title="The hook's surface" lead={<>What <Code>useReorder</Code> returns. <Code>getGroupProps</Code> and <Code>getItemProps</Code> are the complete integration; <Code>getHandleProps</Code> is the optional one.</>}>
        <Flex direction="column" gap="1">
          <NoteRow part="groups" value="the order to render — the COMMITTED order, lift or no lift" radix="the minimal pattern paints the pending move; it never applies it to the array" />
          <NoteRow part="liftedId · liftedAt" value="which item is held, and the FINAL index it would take once removed from its origin" />
          <NoteRow part="dropAt" value="where the insertion marker sits in the RENDERED list — for markup the library's own mark cannot reach, a table row or a canvas" radix="the library already paints the indicator itself, from the attributes the getters write" />
          <NoteRow part="getGroupProps(groupId)" value="the group attribute, the destination click, the whole pointer drag, and the drop mark — the caret between two items and the placeholder in an empty one alike" radix="capture lives here, because the item's own node moves on the drop" />
          <NoteRow part="getItemProps(itemId)" value="the drag source, the keyboard route, the destination click, and a tab stop if the item has none" />
          <NoteRow part="getHandleProps(itemId)" value="OPTIONAL — a second entrance: the accessible name, describedby, and a press that lifts without waiting for the threshold" />
          <NoteRow part="getInstructionsProps()" value="one hidden node per list, the describedby target" />
          <NoteRow part="onReorder(change, groups)" value="fires once per completed move" radix="{ id, from: { group, index }, to: { group, index } }" />
        </Flex>
      </Section>
    </Page>
  ),
};

/* ---- History ------------------------------------------------------------- */
export const History: Story = {
  render: () => (
    <Page>
      <PageHeader title="DragHandle · History" standfirst={DEFINITION} />

      <Section title="Decisions" lead="The rulings this component and its capability encode.">
        <Flex direction="column" gap="3">
          <Decision id="[[reorder-capability]] · the capability is the shipped thing">
            Reordering lives in <Code>useReorder</Code>, a headless hook over items grouped by container id, and
            <Code>DragHandle</Code> is the one net-new surface it needed. Registered on its own ([[registry-module-paths]]'s path
            module), it follows the <Code>useResizable</Code> precedent: the hook is the engine and the handle
            renders it. Items are ids in groups, so reordering <em>within</em> a list and moving <em>between</em>
            lists are the same call, and a settings list uses one axis where a board uses two.
          </Decision>
          <Decision id="[[reorder-capability]] · the ITEM is the drag source, the handle is optional">
            Shipped the other way round and corrected. The ruling: a whole card is dragged whole, and a drag handle is
            for precise handling or for confirming that an item is draggable where that is not already apparent.
            The rule that follows: a whole entity is draggable by default, and a grip is what an entity earns
            when its own surface is already spoken for by a link, a button or a field.{" "}
            <Code>getItemProps</Code> is now the complete integration.
          </Decision>
          <Decision id="[[reorder-capability]] · a press is a click until it travels 5px">
            The cost of whole-item dragging, and the one thing the handle model never needed. 5px is where a
            still hand's drift ends and intent begins; on touch the separator is 120ms of hold rather than a
            distance, because a touch drag and a scroll are the same gesture until time tells them apart. A
            completed drag kills its own trailing click on the document in the capture phase — without that, a
            card that is a link navigates every time it is dropped.
          </Decision>
          <Decision id="[[reorder-capability]] · nothing is written until the drop, and nothing MOVES until then either">
            A lift records the origin plus a moving target, and the committed order is what renders. Escape
            restores by construction rather than by a second reverse move that could drift from the first — and
            since the feedback became the minimal pattern the same property is visible: the list you can see during
            a drag is the list you get if you abandon it.
          </Decision>
          <Decision id="[[reorder-capability]] · minimal reorder feedback, with a ghost and a drop indicator">
            There are two ways to answer “where will this land”. The MAXIMAL one opens a real gap and is
            immediate and physical, at the cost that once the list has swallowed the item, backing out with
            nothing changed stops reading as possible. The MINIMAL one keeps the held item in place as a ghost
            and marks the destination with an insertion caret. This capability ships minimal: Escape is a
            published route it must not undercut, one visual language has to serve a drag, an arrow key and a
            single click, and a hit test resolved against a list that reflows under the pointer oscillates.
          </Decision>
          <Decision id="[[reorder-capability]] · the cursor is the document's, not the item's">
            <Mono>grab</Mono> on the draggable surface including a stretched link overlay, and{" "}
            <Mono>grabbing</Mono> stamped on <Mono>&lt;html&gt;</Mono> for the life of a pointer drag. A drag
            captures on the group, so an item-scoped grabbing cursor is visible for about five pixels and never
            again. No <Mono>!important</Mono> anywhere: the
            resting fix outranks a user-agent rule, and the drag fix wins on specificity at (0,2,1).
          </Decision>
          <Decision id="[[reorder-single-pointer-path]] · 2.5.7 is a single-pointer route, not a keyboard one">
            [[dragging-movement-gaps]] records two components failing <strong>2.5.7 Dragging Movements</strong> and states the reason a
            keyboard alternative does not close it. This capability ships the criterion as a real route: click an
            item to lift, click a destination to place, no drag anywhere. The keyboard route earns
            <strong>2.1.1</strong>, the announcements carry the state change, and <Code>aria-grabbed</Code> is
            deliberately unused — it was deprecated in WAI-ARIA 1.1 with no replacement, so a live region
            carries the state change instead.
          </Decision>
          <Decision id="[[reorder-single-pointer-path]] · arrow-key moving is a conscious rejection of newer guidance">
            The case against directional controls is real and was weighed: screen-reader users must change mode
            to send arrows, a complex move costs many keystrokes, and “up” means little to someone who cannot
            see the layout. The system keeps arrows anyway, because they are the only route that needs no new
            vocabulary and no menu to be built first, and because the alternative — explicit move outcomes in
            the item's own menu — is shipped alongside rather than instead. It is not, yet: that remains an
            open gap, recorded here rather than left implicit.
          </Decision>
          <Decision id="[[optical-icon-weight]] · the grip carries a weight">
            <Code>DotsSixVertical</Code> and <Code>DotsSix</Code> are both in the sparse-glyph register, so each
            declares <Code>weight="bold"</Code>. Six small marks at <Code>regular</Code> read as disabled beside
            the dense glyphs in the same row, and the guard holds it.
          </Decision>
        </Flex>
      </Section>
      <Rule />
      <Section title="Changelog" lead="Notable changes, newest first — grows as the component evolves.">
        <Flex direction="column" gap="3">
          <Decision id="0.9.0 · the drop indicator became an insertion mark">
            The first feedback build was functionally right and read wrong: the drop indicator sat on an existing
            card, so a reorder looked like grouping into that card, and with no other card it sat at the top of the
            container. The mark moved from the ITEM to the GROUP, which is what lets it sit in the gap between two
            cards, touching neither, at the width of the cards themselves, with a terminus at its leading end. An
            empty container no longer gets a line at all — a line is a relative mark and has nothing to be relative
            to there — but a card-shaped placeholder measured off the item in hand. And the held item stopped
            wearing an accent RING when the pending slot was its own origin: a ring is the universal signal for
            dropping INTO something, which is the one thing a reorder never means.
          </Decision>
          <Decision id="0.9.0 · the drag grew feedback">
            On the project board, neither dragging nor dropping showed where the item would go, and the cursor still
            read as a finger. Three fixes, all in the library so no page rebuilds them. <Code>groups</Code> is now the
            COMMITTED order at every moment and the held item stays in its slot as a ghost, which is the minimal
            reorder pattern replacing the maximal preview that used to relocate the card mid-drag. A DROP INDICATOR
            is painted from{" "}
            <Mono>data-ds-reorder-drop</Mono> — the leading edge of the target item, the trailing edge of a list's
            final item, and the empty list's own container — for the keyboard route as much as the pointer one.
            And the cursor became honest: <Mono>grab</Mono> reaches a stretched link overlay, and{" "}
            <Mono>grabbing</Mono> is the document's for the life of a drag. <Code>dropAt</Code> joins the returned
            surface for markup the paint cannot reach.
          </Decision>
          <Decision id="0.9.0 · the item became the drag source">
            <Code>getItemProps</Code> now carries the pointer drag, the keyboard route and a tab stop for an item
            that has none, so a list with no <Code>DragHandle</Code> reorders completely. A 5px movement
            threshold and a 120ms touch hold separate a drag from a click, a capture-phase blocker suppresses the
            click a drag leaves behind, and the item's own <Code>dragstart</Code> is prevented so the browser's
            native drag cannot race this one. The project board dropped its grips and drags whole cards.
          </Decision>
          <Decision id="0.9.0">
            Initial <Code>System/DragHandle</Code> plus the <Code>useReorder</Code> capability: three input routes
            over one state machine (keyboard, single-pointer click, Pointer Events drag), within-group and
            cross-group moves, live announcements through the singleton <Code>useAnnounce</Code>, and the pure
            index math unit tested in <Code>src/hooks/useReorder.logic.test.ts</Code>.
          </Decision>
        </Flex>
      </Section>
    </Page>
  ),
};
