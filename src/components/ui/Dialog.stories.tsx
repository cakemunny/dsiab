import { type ReactNode, useLayoutEffect, useRef, useState } from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { Box, Code, Flex, Grid, Text } from "@radix-ui/themes";
import { X } from "@phosphor-icons/react";
import { useResolvedSize } from "../../theme/SizeContext";
import { Dialog } from "./Dialog";
import { Button } from "./Button";
import { IconButton } from "./IconButton";
import { TextField } from "./TextField";
import {
  AnatomyLegend, Caption, Decision, DoDont, DODONT_LABEL, dotStyle, HexThemeKey, hLine, KeyBinding, KeyRow,
  getRowEvidence, MeasuredRow, MeasuredSpec, Mono, Page, PageHeader, PropsLead, type PropDef, PropTable,
  Rule, Scenario, Section,
} from "./_storyKit";
import { assertMeasuredRows, awaitMeasuredRows } from "../../foundations/_assert";

/** The one definition of this component — the standfirst every page of it opens with. */
const DEFINITION = (
  <>
    The standard modal: a titled, opaque panel over a dimmed page for a focused task or a short flow. The{" "}
    <Code>Content</Code> rides the container size lane, a step roomier than a control, and{" "}
    <Code>Dialog.Footer</Code> anchors the one solid primary in the global button order. For a
    consequential, irreversible confirm, reach for <Code>AlertDialog</Code> instead.
  </>
);

/* Dialog reuses Radix's own modal-panel + overlay skin (an opaque surface, the shared scrim), so it
   declares no --ds-* roles of its own; the only System-owned paint in the frame is the Footer's solid
   primary (a System Button).

   Every row below is MEASURED: it names an element and a property, reads that property off a rendered
   element, and checks it against the token it claims — so a row can disagree with the component.

   THE PANEL AND THE SCRIM ARE MEASURED THROUGH A MOUNT · MEASURE · UNMOUNT CYCLE. Both exist only while
   a modal is mounted, and a mounted modal takes the whole document with it — the overlay locks body
   scroll and the Content aria-hides every sibling, which would leave this docs page unscrollable. So the
   measurement host mounts a real Dialog, holds it exactly long enough for every row beneath it to read
   (the rows join a barrier; the host cannot unmount until all of them have released), and then takes it
   down again. Nothing is left mounted: after the read the page scrolls normally and nothing is hidden.
   The panel is aimed INTO the measurement host with `container`, so it is off-screen the whole time. */

function PrimaryActionSpec() {
  return (
    <Box style={{ borderRadius: "var(--ds-radius-4)", border: "1px solid var(--ds-stroke-weak)", overflow: "hidden", background: "var(--ds-bg-subtle)" }}>
      <Flex align="center" gap="3" style={{ padding: "20px" }}>
        <Box style={{ flexShrink: 0 }}><Button priority="primary">Save changes</Button></Box>
        <Text size="1" style={{ color: "var(--ds-text-weak)" }}>
          The Footer's solid primary paints from the accent-aware <Mono>--ds-fill-accent</Mono> family, so it
          tracks the brand collision shift — and its two rows are read off a rendered Button. The panel and
          the scrim reuse Radix's own modal skin — <Mono>--color-panel-solid</Mono> for the opaque surface
          (never translucent) and <Mono>--color-overlay</Mono> for the scrim that dims and blocks the page
          behind it. Neither exists outside an open modal, so a real one is mounted off-screen for the few
          frames it takes to read all five rows, then taken down again.
        </Text>
      </Flex>
      <MeasuredSpec
        transient
        render={(host) => (
          <>
            <Button priority="primary">Save changes</Button>
            {/* A real System Dialog, aimed into the measurement host: `container` puts the overlay and
                the panel inside a visibility:hidden box rather than over the page, and the host takes
                the whole thing down again the moment the rows below have read it. Focus is steered
                away so the read never moves the reader's caret. */}
            <Dialog.Root open>
              <Dialog.Content
                container={host}
                aria-describedby={undefined}
                onOpenAutoFocus={(e) => e.preventDefault()}
              >
                <Dialog.Title>Panel paint measurement</Dialog.Title>
              </Dialog.Content>
            </Dialog.Root>
          </>
        )}
      >
        <MeasuredRow
          part="Panel surface"
          note="The opaque card the task sits on."
          token="--color-panel-solid"
          select=".rt-DialogContent"
          prop="background-color"
        />
        <MeasuredRow
          part="Panel elevation"
          note="The modal step of the shadow ladder, above the popover tier."
          token="--ds-shadow-6"
          select=".rt-DialogContent"
          prop="box-shadow"
        />
        <MeasuredRow
          part="Overlay scrim"
          note="Dims and blocks the page behind the modal — painted on the overlay's ::before."
          token="--color-overlay"
          select=".rt-DialogOverlay"
          prop="background-color"
          pseudo="::before"
        />
        <MeasuredRow
          part="Primary action fill"
          note="The Footer's one solid primary."
          token="--ds-fill-accent"
          select=".rt-BaseButton.rt-variant-solid"
          prop="background-color"
        />
        <MeasuredRow
          part="Primary action text"
          token="--on-accent"
          select=".rt-BaseButton.rt-variant-solid"
          prop="color"
        />
      </MeasuredSpec>
    </Box>
  );
}

/* The static panel representation for the Anatomy diagram. A live modal can't be shown here — it would
   trap focus, lock scroll, and dim the whole page on view — so the parts are labeled on a faithful
   still: the real dialog surface tokens, real System Text at the title's and body's steps, and the real
   Dialog.Footer (a ButtonGroup that works outside Root). The title is bold Text rather than a Heading
   because a specimen title is not a rung of this page's outline — the live Dialog.Title carries the
   heading semantics. The live, openable Dialog lives in Usage, Keyboard, and the Props.

   THE STILL WEARS THE VENDOR'S OWN PANEL CLASSES, AND THAT IS THE FIX FOR A REAL DEFECT. It used to
   hand-copy the panel: `padding: 24`, plus its own `background`, `borderRadius` and `boxShadow`. Four
   copies of a skin the vendor already declares — and the padding was the one that bit. Radix pads a
   Dialog from `--dialog-content-padding`, set per size step (1→--space-3, 2→--space-4, 3→--space-5,
   4→--space-6), and Dialog.Content rides the container lane, so a REAL dialog measures 16 / 24 / 32px of
   padding at small / medium / large — verified by opening the Props at each tier. The still's 24 was
   frozen at the MEDIUM step, so on the default (small) page it depicted a dialog one step roomier than
   any dialog the system renders, and it never moved when the reader changed the global size.
   `rt-BaseDialogContent rt-r-size-N` with N from the same `useResolvedSize("container")` call
   `Dialog.tsx` makes means padding, radius, surface and shadow are now the panel's, not a transcription
   of it — there is no second copy left to drift. (The BASE class only: `.rt-DialogContent` is what the
   Usage token rows select, and a still answering those selectors would be measured as if it were the
   real thing.)

   THE PINS MOVED TO MEASUREMENT FOR THE SAME REASON. Their tops were literals tuned against one
   rendering; once the padding steps, every part below it moves and hand-set leaders point at nothing. So
   they are read off the rendered still — the established diagram pattern on this system (Badge,
   AvatarGroup, Blockquote, Button) — with a ResizeObserver, which also covers the reader dragging the
   docs pane. */
const DOT = 20;
const LEADER = 58;

/* Which part each numeral points at, and which gutter its dot sits in. `top` anchors the numeral near
   the part's top edge rather than its centre — used for the panel itself, whose centre is the body. */
const PANEL_PINS: { n: number; part: string; side: "left" | "right"; anchor?: "top" }[] = [
  { n: 2, part: "panel", side: "left", anchor: "top" },
  { n: 3, part: "title", side: "right" },
  { n: 4, part: "desc", side: "right" },
  { n: 5, part: "body", side: "left" },
  { n: 6, part: "footer", side: "right" },
];

type PinBox = { top: number; dotLeft: number; lineLeft: number };

function PanelStill() {
  // The SAME call Dialog.Content makes (Dialog.tsx) — the still resolves the step the real panel would.
  const step = useResolvedSize<"1" | "2" | "3" | "4">("container", undefined);
  const frame = useRef<HTMLDivElement>(null);
  const panel = useRef<HTMLDivElement>(null);
  const [pins, setPins] = useState<Record<number, PinBox>>({});

  useLayoutEffect(() => {
    const f = frame.current;
    const p = panel.current;
    if (!f || !p) return;
    const measure = () => {
      const fr = f.getBoundingClientRect();
      const pr = p.getBoundingClientRect();
      const next: Record<number, PinBox> = {};
      for (const pin of PANEL_PINS) {
        const el = pin.part === "panel" ? p : p.querySelector<HTMLElement>(`[data-part="${pin.part}"]`);
        if (!el) continue;
        const r = el.getBoundingClientRect();
        const y = pin.anchor === "top" ? r.top + DOT / 2 : r.top + r.height / 2;
        const left = Math.round(pr.left - fr.left);
        const right = Math.round(pr.right - fr.left);
        next[pin.n] = {
          top: Math.round(y - fr.top - DOT / 2),
          dotLeft: pin.side === "left" ? left - LEADER - DOT : right + LEADER,
          lineLeft: pin.side === "left" ? left - LEADER : right,
        };
      }
      setPins(next);
    };
    measure();
    let raf = 0;
    const ro = new ResizeObserver(() => { cancelAnimationFrame(raf); raf = requestAnimationFrame(measure); });
    ro.observe(f);
    ro.observe(p);
    return () => { cancelAnimationFrame(raf); ro.disconnect(); };
  }, [step]);

  return (
    <Box style={{ overflowX: "auto" }}>
      <Box ref={frame} style={{ position: "relative", width: "100%", minWidth: 660, padding: "36px 0", display: "flex", justifyContent: "center", background: "var(--ds-bg-subtle)", border: "1px solid var(--ds-stroke-weak)", borderRadius: "var(--ds-radius-4)" }}>
        <Box
          ref={panel}
          className={`rt-BaseDialogContent rt-r-size-${step}`}
          // Only what the still needs the vendor NOT to decide: a fixed specimen width (the class says
          // 100%), and static flow so the frame's own height follows the panel as its padding steps.
          style={{ width: 420, margin: 0, position: "static", overflow: "visible" }}
        >
          {/* No header X: this panel's Footer carries a Cancel — a button whose whole job is to close — and
              the one-dismissal ruling allows exactly ONE labelled way out, so the labelled one wins. That
              is why the legend lists Close as a BULLETED, unnumbered part: this specimen is the arm of the
              rule where the X must NOT appear, so there is nothing here to pin a numeral to. */}
          {/* A still's title is SPECIMEN CONTENT, not a rung of this page's outline — a real
              Dialog.Title carries the heading semantics, and a heading here would skip a level
              under the page's H1 → H2 tree. Bold Text, same as the Section specimens. */}
          <Text data-part="title" as="p" size="4" weight="bold" style={{ color: "var(--ds-text-strong)" }}>Rename project</Text>
          <Text data-part="desc" as="p" size="2" style={{ color: "var(--ds-text-weak)", marginTop: 4, marginBottom: 16 }}>
            Give the project a clear, memorable name. This is what your team sees.
          </Text>
          <Box data-part="body">
            <TextField label="Project name" defaultValue="Orbit" />
          </Box>
          <Box data-part="footer">
            <Dialog.Footer>
              <Button priority="secondary">Cancel</Button>
              <Button priority="primary">Save changes</Button>
            </Dialog.Footer>
          </Box>
        </Box>
        {/* 1 — overlay scrim: the dot sits ON the backdrop it names, no leader needed */}
        <Box style={{ ...dotStyle, left: 16, top: 16 }}>1</Box>
        {PANEL_PINS.map(({ n }) => {
          const box = pins[n];
          if (!box) return null;
          return (
            <Box key={n}>
              <Box style={{ ...dotStyle, left: box.dotLeft, top: box.top }}>{n}</Box>
              <Box style={hLine({ left: box.lineLeft, top: box.top + DOT / 2, width: LEADER })} />
            </Box>
          );
        })}
      </Box>
    </Box>
  );
}

const ANATOMY_PARTS: [number, string, string][] = [
  [1, "Overlay scrim", "a dim over the page that blocks interaction; clicking it (or Escape) dismisses unless the flow forbids it"],
  [2, "Panel", "the opaque, elevated modal surface — never translucent; sized on the container lane"],
  [3, "Title", "a required Heading naming the task, verb-led; Radix wires aria-labelledby to it"],
  [4, "Description", "an optional supporting line, auto-wired to aria-describedby"],
  [5, "Body", "the task content — a short form, a message, a focused step"],
  [6, "Footer", "the action row: a ButtonGroup that anchors the one solid primary per the global buttonOrder"],
];

/* The conditional part. It carries a BULLET, not a numeral, because it is deliberately absent from the
   still above — this specimen's Cancel is already its dismissal, so a header X would be the second
   labelled way out. Every numeral in the legend points at a pin on the diagram; a numbered row with
   nothing to point at would send the reader hunting for a callout that isn't there. */
function ConditionalPart({ name, note }: { name: string; note: ReactNode }) {
  return (
    <Flex gap="2" align="start" mt="3">
      <Box style={{ width: 18, height: 18, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <Box style={{ width: 7, height: 7, borderRadius: 9999, background: "var(--ds-fill-strong)" }} />
      </Box>
      <Flex direction="column" gap="1" style={{ minWidth: 0 }}>
        <Text size="1" weight="bold" style={{ color: "var(--ds-text-strong)", lineHeight: "18px" }}>{name}</Text>
        <Text size="1" style={{ color: "var(--ds-text-weak)", textWrap: "pretty" }}>{note}</Text>
      </Flex>
    </Flex>
  );
}

const DIALOG_KEYS: KeyBinding[] = [
  { keys: ["Tab", "Shift + Tab"], action: <>Move focus through the panel's controls. Focus is <strong>trapped</strong> inside the open dialog — it never reaches the page behind.</>, src: "radix" },
  { keys: ["Esc"], action: "Close the dialog and return focus to the trigger that opened it.", src: "radix" },
  { keys: ["Space", "Enter"], action: <>On the <strong>trigger</strong>, open the dialog; on a focused <strong>button</strong> inside it, activate that button.</>, src: "radix" },
  { keys: ["Enter"], action: <>In a <strong>text field</strong>, submit the form — when the Footer's primary is that form's submit button, this resolves the dialog without reaching for the mouse.</>, src: "radix" },
];

const PROPS: PropDef[] = [
  { name: "Dialog.Content — size", type: `"1" | "2" | "3" | "4"`, def: "container lane (2 at small)", desc: <>Radix Content size (padding + radius). Unset, it follows the global <Code>uiSize</Code> <strong>container</strong> lane — a step roomier than a control; an explicit step wins.</>, source: "Dialog.tsx" },
  { name: "Dialog.Footer", type: "ButtonGroup props", desc: <>The action row — a <Code>ButtonGroup</Code> that anchors the solid primary per the global <Code>buttonOrder</Code>. Override <Code>order</Code> / <Code>justify</Code> / <Code>mt</Code>.</>, source: "Dialog.tsx" },
  { name: "Dialog.Title", type: "Heading props", desc: <>Required — names the task. Radix wires <Code>aria-labelledby</Code> to it.</>, source: "Radix" },
  { name: "Dialog.Description", type: "Text props", desc: <>Optional supporting line, auto-wired to <Code>aria-describedby</Code>.</>, source: "Radix" },
  { name: "Root / Trigger / Close", type: "compound parts", desc: <>Pass through to Radix. Trigger/Close compose a child via <Code>asChild</Code>, so a System <Code>Button</Code> drops straight in.</>, source: "Radix" },
  { name: "onOpenAutoFocus / onCloseAutoFocus", type: "(e) => void", desc: <>Steer where focus lands on open / where it returns on close (pass through Content).</>, source: "Radix" },
];

const meta: Meta<typeof Dialog.Root> = {
  title: "Components/Modals & Popovers/Dialog",
  component: Dialog.Root,
  parameters: {
    controls: { disable: true },
    docs: {
      description: {
        component:
          "**Dialog** is the standard modal — a titled, opaque panel over a dimmed page for a focused task " +
          "or a short flow. It wraps Radix's compound Dialog with a Content that rides the `uiSize` container " +
          "lane (a step roomier than a control) and a `Dialog.Footer` that anchors the one solid primary per " +
          "the global `buttonOrder`. Modal-tier motion is inherited from the shared dialog base classes — no " +
          "per-component CSS. For a consequential, irreversible confirm, reach for **AlertDialog**.",
      },
    },
  },
};
export default meta;
type Story = StoryObj<typeof Dialog.Root>;

/* The canonical content-dialog specimen, reused across the docs stories. A CLOSED trigger — viewing the
   story never opens it (opening is user-initiated, so no focus-trap flash on view). */
function RenameDialog({ triggerLabel = "Rename project…" }: { triggerLabel?: string }) {
  return (
    <Dialog.Root>
      <Dialog.Trigger>
        <Button priority="secondary">{triggerLabel}</Button>
      </Dialog.Trigger>
      <Dialog.Content maxWidth="440px">
        {/* No header X — Cancel exists only to close, so it IS the dismissal ([[modal-dismissal]]: exactly one). */}
        <Dialog.Title>Rename project</Dialog.Title>
        <Dialog.Description size="2">
          Give the project a clear, memorable name. This is what your team sees.
        </Dialog.Description>
        <Box mt="3">
          <TextField label="Project name" defaultValue="Orbit" />
        </Box>
        <Dialog.Footer>
          <Dialog.Close>
            <Button priority="secondary">Cancel</Button>
          </Dialog.Close>
          <Dialog.Close>
            <Button priority="primary">Save changes</Button>
          </Dialog.Close>
        </Dialog.Footer>
      </Dialog.Content>
    </Dialog.Root>
  );
}

/* The OTHER arm of the one-dismissal rule: a read-only reference panel with NO Footer at all. Nothing
   here commits and nothing here abandons — you read it and leave — so the header X is the dialog's only
   labelled way out, and it is what satisfies the APG's "a visible element with role button that closes
   the dialog". Note what this specimen deliberately does NOT have: a "Got it" button. A button whose
   whole job is to close IS the dismissal, and pairing it with an X is the redundancy the rule forbids. */
function DetailDialog() {
  return (
    <Dialog.Root>
      <Dialog.Trigger>
        <Button priority="secondary">View build details…</Button>
      </Dialog.Trigger>
      <Dialog.Content maxWidth="440px">
        <Flex justify="between" align="start" gap="3">
          <Dialog.Title>Build 4.2.1</Dialog.Title>
          {/* REQUIRED here: nothing in this dialog dismisses it, so the X is the visible closing control. */}
          <Dialog.Close>
            <IconButton priority="tertiary" aria-label="Close">
              <X />
            </IconButton>
          </Dialog.Close>
        </Flex>
        <Dialog.Description size="2">
          Published 12 March by Dana Reyes — 42 commits across 6 services.
        </Dialog.Description>
        <Box mt="3">
          {BUILD_FACTS.map(([term, value]) => (
            <Flex key={term} justify="between" gap="4" py="1" style={{ borderTop: "1px solid var(--ds-stroke-weak)" }}>
              <Text size="2" style={{ color: "var(--ds-text-weak)" }}>{term}</Text>
              <Text size="2" style={{ color: "var(--ds-text-strong)" }}>{value}</Text>
            </Flex>
          ))}
        </Box>
      </Dialog.Content>
    </Dialog.Root>
  );
}

const BUILD_FACTS: [string, string][] = [
  ["Duration", "4 m 12 s"],
  ["Triggered by", "merge to main"],
  ["Artifacts", "3"],
];

/* A STATIC panel showing just the head + footer of each dismissal arm, so the difference is visible on
   the page instead of only after a click (a live modal can't sit inline — it would trap focus and dim the
   page). Painted from the real panel tokens, so it reads as the surface it depicts. `footer` is optional:
   the X arm's specimen is a read-only panel with NO footer, which is exactly why its X is load-bearing. */
function DismissalStill({ withX, title, body, footer }: { withX: boolean; title: string; body: string; footer?: ReactNode }) {
  // Same reasoning as PanelStill: wear the panel's own classes rather than transcribe them, so these two
  // cards pad 16 / 24 / 32px with the global size exactly as the live dialogs beside them do. The
  // hand-copied `padding: var(--space-4)` they carried was the small step, frozen — at medium and large
  // the reader saw the rule illustrated on a panel a step or two tighter than the dialog it describes.
  const step = useResolvedSize<"1" | "2" | "3" | "4">("container", undefined);
  return (
    <Box
      className={`rt-BaseDialogContent rt-r-size-${step}`}
      style={{ width: "100%", margin: 0, position: "static", overflow: "visible" }}
    >
      <Flex justify="between" align="start" gap="3">
        {/* Specimen content, not page structure — see PanelStill above. */}
        <Text as="p" size="3" weight="bold" style={{ color: "var(--ds-text-strong)" }}>{title}</Text>
        {withX && (
          <IconButton priority="tertiary" aria-label="Close">
            <X />
          </IconButton>
        )}
      </Flex>
      <Text as="p" size="2" style={{ color: "var(--ds-text-weak)", marginTop: 4 }}>{body}</Text>
      {footer ? <Dialog.Footer>{footer}</Dialog.Footer> : null}
    </Box>
  );
}

// A tiny inline Kbd for the standfirst (the shared-kit Kbd is for key tables).
function InlineKbd({ children }: { children: ReactNode }) {
  return <Code variant="soft">{children}</Code>;
}

/** Anatomy — the labeled parts of the modal frame. The live token spec lives in Usage. */
export const Anatomy: Story = {
  render: (_args, { globals }) => (
    <HexThemeKey.Provider value={`${globals.accent}-${globals.appearance}-${globals.contrast}`}>
      <Page>
        <PageHeader title="Dialog · Anatomy" standfirst={DEFINITION} />
        <Section title="The parts" lead="A modal is a scrim over the page and an opaque panel with a titled head, an optional description, the task body, and a footer of actions. The numbered parts are pinned onto the still — a live modal can't be diagrammed here (it would trap focus and dim the page on view); open one from Usage below to see it move. The still wears the real panel's own classes, so it pads and rounds on the container lane exactly as a live dialog does: change the global size and it steps with it, and the leaders re-measure onto their parts.">
          <PanelStill />
          <AnatomyLegend parts={ANATOMY_PARTS} />
          <ConditionalPart
            name="Close — conditional, so it carries no number"
            note={<>A tertiary IconButton that dismisses; focus returns to the trigger. It appears only when nothing else in the dialog closes it — which is why the still above has none: that panel's Cancel is already its one labelled way out. See Usage for the read-only panel that earns an X.</>}
          />
          <Caption>
            The panel is opaque and elevated; the scrim behind it blocks the page. Only the panel's own
            controls are focusable while the dialog is open — focus is trapped and returns to the trigger on
            close.
          </Caption>
        </Section>
      </Page>
    </HexThemeKey.Provider>
  ),
};

/** Usage — a real content dialog, the one-solid-primary rule, when to reach for AlertDialog instead,
 *  and the live token spec that closes the page. */
export const Usage: Story = {
  // The DO/DON'T word (success/error step-11 ink on its own tint) measures 4.10 at 12px bold, under axe's
  // 4.5; the colour + the word already carry the meaning, so that row is the documented exception. Scoped
  // to the label itself — the cards' specimens stay fully axe-checked, which "[data-dodont]" did not do.
  // The solid danger button is the second exception, surfaced by that narrowing. It entered at white
  // on the red-9 fill #e5484d, 3.91 in both appearances, under the retired 3:1 floor for text on a
  // solid fill. [[text-on-solid-fill-contrast]] replaced that floor with 4.5:1 and APCA Lc 60 and
  // moved the danger fill to --error-solid, and no current ruling excuses this button.
  parameters: { a11y: { context: { exclude: [DODONT_LABEL, ".rt-Button[data-tone='danger']"] } } },
  render: (_args, { globals }) => (
    <Page maxWidth={900}>
      <PageHeader title="Dialog · Usage" standfirst={DEFINITION} />
      <Section title="A focused task — rename a project" lead="The most common dialog job is a short, focused task: a small form or a single step, opened from a trigger, resolved by a primary. Title names the task (verb-led), the body holds just what the task needs, and the Footer pairs a calm Cancel with one solid primary.">
        <RenameDialog />
        <Caption>Click the trigger to open. <InlineKbd>Esc</InlineKbd> or Cancel dismisses; the primary saves. Focus returns to the trigger on close.</Caption>
      </Section>

      <Rule />

      <Section
        title="Exactly one labelled dismissal"
        lead="A modal gets ONE visible, labelled control whose whole job is to leave — and only one. The test is not what a button is called, it is what the button does. If any Footer button merely closes (Cancel, Got it, OK, Done, Dismiss), that button IS the dismissal and the header carries no X. The X is required only when nothing in the dialog dismisses it — every Footer button commits (Save, Submit, Apply), or there is no Footer at all. Escape and the scrim always work in addition, but are never the only way out."
      >
        <Grid columns={{ initial: "1", sm: "2" }} gap="4">
          <Scenario label="A FOOTER BUTTON DISMISSES → NO X" caption={<>A task or form dialog. <strong>Cancel</strong> exists only to close, so it is the dismissal and the header carries no X — the labelled control wins. Open the live one below.</>}>
            <DismissalStill
              withX={false}
              title="Rename project"
              body="Give the project a clear, memorable name."
              footer={<><Button priority="secondary">Cancel</Button><Button priority="primary">Save changes</Button></>}
            />
          </Scenario>
          <Scenario label="NOTHING IN THE FOOTER DISMISSES → X REQUIRED" caption={<>A read-only reference panel — nothing to commit, nothing to abandon, no Footer at all. The header <strong>X</strong> is the only labelled way out, so here it is required. A Footer whose buttons <em>all</em> commit lands in this same arm.</>}>
            <DismissalStill
              withX
              title="Build 4.2.1"
              body="Published 12 March by Dana Reyes — 42 commits across 6 services."
            />
          </Scenario>
        </Grid>
        <Flex gap="4" wrap="wrap" mt="2">
          <RenameDialog triggerLabel="Open the Cancel version…" />
          <DetailDialog />
        </Flex>
        <Caption>
          <strong>A lone “Got it” or “OK” is a dismissal, not an action.</strong> Its whole job is to close, so
          it already <em>is</em> the labelled way out and the dialog takes no X — an X beside it would be two
          controls doing one job, the reader left to guess at the difference. The one exception is an
          acknowledgement the system actually <em>records</em>: there the button commits the acknowledgement
          and the X leaves without it, so the two genuinely lead to different places and both are earned.
        </Caption>
        <Caption>
          A consequential confirm is a different component: <Code>AlertDialog</Code> <strong>never</strong> has
          an X — the user leaves through <em>Cancel</em> or the destructive action, so the choice stays
          explicit. (It cannot have one: the underlying AlertDialog exposes no close part at all.)
        </Caption>
      </Section>

      <Rule />

      <Section title="One solid primary" lead="A dialog resolves to a single obvious action. Give it one solid primary and a secondary escape — never two solids competing, and never a vague label that hides what will happen.">
        <Grid columns={{ initial: "1", sm: "2" }} gap="3">
          <DoDont kind="do" bare note="One solid primary + a secondary Cancel, a verb-led title — the reader knows the one thing this dialog does. Ordered by the system buttonOrder (Dialog.Footer).">
            <Dialog.Footer style={{ marginTop: 0 }}>
              <Button priority="secondary">Cancel</Button>
              <Button priority="primary">Save changes</Button>
            </Dialog.Footer>
          </DoDont>
          <DoDont kind="dont" bare note="Two solid primaries make the reader choose which is “the” action; a vague “OK” hides the stakes. Demote one to secondary and label the primary with its verb.">
            <Dialog.Footer style={{ marginTop: 0 }}>
              <Button priority="primary">OK</Button>
              <Button priority="primary">Save</Button>
            </Dialog.Footer>
          </DoDont>
        </Grid>
      </Section>

      <Rule />

      <Section title="Dialog vs. AlertDialog" lead="Both are modal, but they answer different questions. Reach for a Dialog when the user is doing a task; reach for an AlertDialog when they must confirm a consequential, usually irreversible action.">
        <Grid columns={{ initial: "1", sm: "2" }} gap="3">
          <DoDont kind="do" bare note="A task or a short flow — a form, a setting, a focused step — is a Dialog. It carries a body and resolves with a Save/Done primary.">
            <Dialog.Footer style={{ marginTop: 0 }}>
              <Button priority="secondary">Cancel</Button>
              <Button priority="primary">Save changes</Button>
            </Dialog.Footer>
          </DoDont>
          <DoDont kind="dont" bare note="A consequential, irreversible confirm (“Delete project?”) is an AlertDialog, not a Dialog — it pairs a calm Cancel with a solid-danger Action and traps focus on the decision.">
            <Dialog.Footer style={{ marginTop: 0 }}>
              <Button priority="secondary">Cancel</Button>
              <Button priority="primary" tone="danger">Delete project</Button>
            </Dialog.Footer>
          </DoDont>
        </Grid>
        <Caption>See <Code>System/Modals &amp; Popovers/AlertDialog</Code> for the destructive-confirm pattern (the both-solid <Code>tone="danger"</Code> model).</Caption>
      </Section>

      <Rule />

      <HexThemeKey.Provider value={`${globals.accent}-${globals.appearance}-${globals.contrast}`}>
        <Section title="Tokens" lead="Each row names an element and a property and reads that property off the rendered element, then checks it against the token it claims — so a row can disagree with the component. The System-owned paint is the Footer's solid primary; the panel and the scrim reuse Radix's modal skin, and are read off a real Dialog mounted off-screen for the few frames the reading takes.">
          <PrimaryActionSpec />
        </Section>
      </HexThemeKey.Provider>
    </Page>
  ),
  // The only play here is PASSIVE: viewing this story must not open a modal ON THE PAGE. The panel the
  // token table reads is mounted inside the measurement host and taken down again before this runs.
  // The open · focus-trap · Escape behaviour lives in _internal/Dialog behavior.
  play: async ({ canvasElement }) => {
    // The token table's EVIDENCE, asserted at runtime: all five rows read a REAL rendered element —
    // two off a Button, three off a Dialog that was mounted, measured and unmounted. `awaitMeasuredRows`
    // waits both for every row to record its evidence AND for that mount cycle to have closed.
    const rows = await awaitMeasuredRows(canvasElement);
    if (rows.measured !== 5 || rows.unproven !== 0) {
      throw new Error(`expected 5 measured / 0 unproven token rows, got ${rows.measured} / ${rows.unproven}`);
    }

    // THE PAGE SURVIVED THE READ. A mounted modal locks body scroll and aria-hides every sibling of the
    // panel; if the cycle failed to tear down, this page would be frozen and half-invisible to a screen
    // reader with nothing on screen to explain why. So the teardown is asserted, not assumed.
    if (document.body.hasAttribute("data-scroll-locked")) {
      throw new Error("body is still scroll-locked after the measurement cycle — the modal never unmounted");
    }
    const hidden = Array.from(document.body.children).filter((n) => n.hasAttribute("aria-hidden")).length;
    if (hidden) throw new Error(`${hidden} body children are still aria-hidden after the measurement cycle`);
    if (document.querySelector(".rt-DialogContent")) {
      throw new Error("a dialog panel is still mounted after the measurement cycle (no on-view modal)");
    }

    /* THE CONNECTED CHECK STILL BITES. Measuring a modal means the node is deliberately detached by the
     * time anything checks it, so the guard asks the honest question instead — was it in the document
     * WHEN IT WAS READ. That is only worth anything if it still rejects a node that never was, so prove
     * it here, with the kit's own evidence shape and a node that was built and never rendered. */
    const proofRow = document.createElement("div");
    proofRow.setAttribute("data-token-row", "measured");
    const real = getRowEvidence(canvasElement.querySelector('[data-token-row="measured"]')!)!;
    Object.assign(proofRow, {
      __dsRowEvidence: { ...real, measuredNode: document.createElement("div"), connectedAtRead: false },
    });
    const scope = document.createElement("div");
    scope.appendChild(proofRow);
    let rejected = "";
    try { assertMeasuredRows(scope); } catch (e) { rejected = (e as Error).message; }
    if (!/NOT in the document when it was read/.test(rejected)) {
      throw new Error(`the guard accepted a node that was never in the document — it must not. Got: ${rejected || "no error"}`);
    }
    // …and the same evidence with the stamp intact is accepted, so the two cases are really told apart.
    Object.assign(proofRow, { __dsRowEvidence: { ...real, measuredNode: document.createElement("div"), connectedAtRead: true } });
    assertMeasuredRows(scope);
  },
};

/** Keyboard — the modal's key → action contract: the focus trap, Escape to close, and focus return. */
export const Keyboard: Story = {
  render: () => (
    <Page maxWidth={900}>
      <PageHeader title="Dialog · Keyboard" standfirst={DEFINITION} />
      <Section
        title="Keyboard"
        lead={<>The full key → action contract. Opening the dialog moves focus inside and <strong>traps</strong> it there; <Code>Esc</Code> closes and returns focus to the trigger. Open the live target below and try the keys.</>}
      >
        <Flex direction="column" gap="2">
          <Box><RenameDialog triggerLabel="Open a dialog…" /></Box>
          <Caption>A live target — open it, then <Code>Tab</Code> through the field and buttons (focus stays inside), and <Code>Esc</Code> to close.</Caption>
        </Flex>
        <Box style={{ borderRadius: "var(--ds-radius-4)", border: "1px solid var(--ds-stroke-weak)", overflow: "hidden", background: "var(--ds-bg-subtle)" }}>
          {DIALOG_KEYS.map((b) => <KeyRow key={b.keys.join("+")} {...b} />)}
        </Box>
        <Caption>
          <strong>Screen readers:</strong> the panel is <Code>role="dialog"</Code> with <Code>aria-modal</Code>,
          named by its <Code>Title</Code> (<Code>aria-labelledby</Code>) and described by its{" "}
          <Code>Description</Code> (<Code>aria-describedby</Code>). The trigger carries{" "}
          <Code>aria-haspopup="dialog"</Code>; on close, focus returns to it.
        </Caption>
      </Section>
    </Page>
  ),
};

type PropsArgs = {
  size: "auto" | "1" | "2" | "3" | "4";
  title: string;
  description: string;
  primaryLabel: string;
};

/** Props — drive the Content size, the title/description, and the primary label; full axe. */
export const Props: StoryObj<PropsArgs> = {
  // "auto" (size unset) is the default so the dialog tracks the global uiSize toolbar out of the box.
  args: { size: "auto", title: "Rename project", description: "Give the project a clear, memorable name.", primaryLabel: "Save changes" },
  argTypes: {
    size: { control: "inline-radio", options: ["auto", "1", "2", "3", "4"], description: '"auto" tracks the global uiSize toolbar (size unset → the container lane, small → 2); a step (1–4) pins the Content size.', table: { category: "Variant" } },
    title: { control: "text", description: "The dialog Title — names the task, verb-led.", table: { category: "Content" } },
    description: { control: "text", description: "The optional supporting line (aria-describedby).", table: { category: "Content" } },
    primaryLabel: { control: "text", description: "The Footer's solid primary — its verb.", table: { category: "Content" } },
  },
  parameters: { controls: { disable: false } },
  render: ({ size, title, description, primaryLabel }: PropsArgs) => (
    <Page maxWidth="none">
      <PageHeader title="Dialog · Props" standfirst={DEFINITION} />
      <Box style={{ padding: "8px 0 2px" }}>
        <Dialog.Root>
          <Dialog.Trigger>
            <Button priority="secondary">{title}…</Button>
          </Dialog.Trigger>
          <Dialog.Content size={size === "auto" ? undefined : size} maxWidth="440px">
            <Dialog.Title>{title}</Dialog.Title>
            {description ? <Dialog.Description size="2">{description}</Dialog.Description> : null}
            <Box mt="3">
              <TextField label="Project name" defaultValue="Orbit" />
            </Box>
            <Dialog.Footer>
              <Dialog.Close><Button priority="secondary">Cancel</Button></Dialog.Close>
              <Dialog.Close><Button priority="primary">{primaryLabel}</Button></Dialog.Close>
            </Dialog.Footer>
          </Dialog.Content>
        </Dialog.Root>
      </Box>
      <PropsLead />
      <Rule />
      <Section title="Props reference" lead={<>Every prop <Code>Dialog</Code> adds or forwards.</>}>
        <PropTable rows={PROPS} />
      </Section>
    </Page>
  ),
};

/** History — the rulings this component encodes and a changelog of how it changes over time. */
export const History: Story = {
  render: () => (
    <Page>
      <PageHeader title="Dialog · History" standfirst={DEFINITION} />
      <Section title="Decisions" lead="The rulings this component encodes.">
        <Flex direction="column" gap="3">
          <Decision id="[[catalog-as-specification]] · Wrapped Radix component">
            A <strong>wrapped</strong> Radix Themes component — the Radix name wins; built on the Radix
            substrate + our <Code>--ds-*</Code> layer, not a from-scratch modal.
          </Decision>
          <Decision id="[[floating-surface-fill]] · Opaque modal panel">
            Content is an <strong>opaque, elevated panel</strong> (Radix's solid dialog skin) — no
            translucent variant is exposed. The scrim + panel reuse the shared dialog skin, so the standard
            modal can never drift from the specialized surfaces on backdrop treatment.
          </Decision>
          <Decision id="[[button-priority]] · One solid primary in the Footer">
            <strong><Code>Dialog.Footer</Code> anchors one solid primary</strong> via the system{" "}
            <Code>buttonOrder</Code> — it renders a <Code>ButtonGroup</Code>, so the primary sits where the
            global order says and the tab order follows the visual order (a wrapper wires every
            system-parameterized behavior, not just tokens). A destructive confirm is AlertDialog's job —
            Dialog exposes no <Code>tone</Code>.
          </Decision>
          <Decision id="[[modal-dismissal]] · One dismissal">
            <strong>Exactly one labelled dismissal — and the test is what a button does, not what it is called.</strong>{" "}
            If any Footer button's whole job is to close (<Code>Cancel</Code>, but equally <em>Got it</em>,{" "}
            <em>OK</em>, <em>Done</em>, <em>Dismiss</em>), that button <strong>is</strong> the dismissal and the
            header carries <strong>no X</strong>. A header X is required only when <strong>nothing</strong> in
            the dialog dismisses it — every Footer button commits (Save, Submit, Apply), or there is no Footer
            at all — and it is then what satisfies the requirement for a visible closing control.{" "}
            <Code>Esc</Code> and the scrim always work in addition, but are never the only way out.{" "}
            <Code>AlertDialog</Code> never has an X — a consequential confirm is left through an explicit
            choice. Two controls doing the same job, one of them unlabelled, is redundancy the reader has to
            resolve; where both are earned, it is because they lead <em>different</em> places (commit the
            acknowledgement vs leave without it, keep the work vs abandon it).
          </Decision>
          <Decision id="Container size">
            Content rides the <strong>container</strong> size lane (<Code>small</Code> → <Code>2</Code>) — a
            step roomier than the control lane, so a standard content dialog reads more spacious than a terse
            confirm. An explicit <Code>size</Code> always wins.
          </Decision>
          <Decision id="Standard vs specialized">
            System Dialog serves the <strong>standard</strong> title / description / body / footer modal. The
            specialized surfaces — a command palette, a lightbox, a mobile drawer — deliberately keep the raw
            Radix Dialog: they steer their own focus, skin their own content, and animate their own tiers. The
            non-swap is intentional, so it never reads as an oversight.
          </Decision>
        </Flex>
      </Section>

      <Rule />

      <Section title="Changelog" lead="Notable changes, newest first — grows as the component evolves.">
        <Flex direction="column" gap="3">
          <Decision id="0.9.0">
            Initial <Code>System/Dialog</Code> — the standard modal wrapped from Radix's compound Dialog: an
            opaque panel on the container size lane, a <Code>Dialog.Footer</Code> that anchors the primary via
            the system <Code>buttonOrder</Code>, and modal-tier motion inherited from the shared dialog base
            classes. Full spine: History · Anatomy · Usage · Keyboard · Props.
          </Decision>
        </Flex>
      </Section>
    </Page>
  ),
};
