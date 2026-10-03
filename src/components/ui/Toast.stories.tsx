import { Fragment, useEffect, useRef, useState, type ComponentType, type CSSProperties, type ReactNode, type RefObject } from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { Box, Code, Flex, Grid, Text } from "@radix-ui/themes";
import {
  Info, CheckCircle, Warning, WarningCircle, X, ArrowRight, Pause, type IconProps,
} from "@phosphor-icons/react";
import {
  ToastProvider, ToastViewport, useToast,
  type ToastTone, type ToastPosition, type CollisionBehavior,
} from "./Toast";
import { Button } from "./Button";
import { IconButton } from "./IconButton";
import {
  AnatomyLegend, Caption, Decision, DoDont, DODONT_LABEL, dotStyle, HexThemeKey, KeyBinding, KeyRow, MeasuredRow,
  MeasuredSpec, Mono, Muted, NoteRow, Page, PageHeader, PropsLead, type PropDef, PropTable, Rule, Scenario, Section, tick,
} from "./_storyKit";
import { awaitMeasuredRows } from "../../foundations/_assert";
import { ComparisonSection, MESSAGING_COMPARISON } from "./_comparisons";

/** The component's definition — one source, referenced by the header of every story on this page. */
const DEFINITION = <>Transient feedback that floats over content. Four accent-aware tones — <Code>error</Code> persists, the rest auto-hide. One action (Undo) and a mandatory dismiss, stacked in a fixed viewport corner.</>;

/* The FULL six-section docs spine — History · Anatomy · Usage · Keyboard · QueueStates · Props —
   for the Toast engine (the wave's only full-tier component). EVERY toast shown on these pages is a
   STATIC mock painted from the real --ds-* tokens (a `.rt-ds-toast` div with NO data-state → no enter
   animation, the DropdownMenu MenuMock pattern), so viewing a page NEVER spawns, auto-hides, or animates
   a toast. The live engine (spawn / windowing / dedup / pause-aware timer / focus handoff) is exercised in
   _internal/Toast behavior, and the one user-initiated spawn is the Props's "Show toast" button. */

const TONE_ICON: Record<ToastTone, ComponentType<IconProps>> = {
  info: Info, success: CheckCircle, warning: Warning, error: WarningCircle,
};
const TONE_BODY: Record<ToastTone, string> = {
  info: "Heads up — your export is queued.",
  success: "Project archived.",
  warning: "You have unsaved changes.",
  error: "Upload failed — the file is too large.",
};

/** A static toast specimen — the real `.rt-ds-toast` skin (opaque surface, family tint, glyph) with NO
 *  data-state, so it renders settled without the enter animation. The docs analog of DropdownMenu's MenuMock.
 *  `footer` spans all three grid columns (a countdown / paused / persistence affordance). */
function ToastMock({
  tone, action, actionLabel = "Undo", body, footer, style,
}: {
  tone: ToastTone;
  action?: boolean;
  /** The action label — caller-supplied so an error specimen can read "Retry" (a failed upload can't be undone). */
  actionLabel?: ReactNode;
  body?: ReactNode;
  footer?: ReactNode;
  style?: CSSProperties;
}) {
  const Glyph = TONE_ICON[tone];
  return (
    <div className="rt-ds-toast" data-tone={tone} style={{ maxWidth: 400, ...style }}>
      <span className="rt-ds-toast-icon" aria-hidden><Glyph weight="fill" /></span>
      <div className="rt-ds-toast-body">{body ?? TONE_BODY[tone]}</div>
      <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
        {action && <Button priority="secondary" size="1">{actionLabel}</Button>}
        <IconButton priority="tertiary" color="gray" size="1" aria-label="Dismiss"><X weight="bold" /></IconButton>
      </div>
      {footer && <div style={{ gridColumn: "1 / -1", marginTop: 2 }}>{footer}</div>}
    </div>
  );
}

/* A REAL toast does not exist until the engine spawns one, and it arrives mid-enter-animation. A row
   that read on the frame it renders would find nothing, or catch a value that is true for a few
   milliseconds. So the rows wait for the toasts to exist AND for their own animations to finish. This
   gates only WHEN the rows read, never WHAT they read. */
function WhenSettled({ within, select, children }: { within: RefObject<HTMLElement | null>; select: string; children: ReactNode }) {
  const [ready, setReady] = useState(false);
  // useEffect, not useLayoutEffect: a parent's ref is attached AFTER its children's layout effects run.
  useEffect(() => {
    let raf = 0;
    let tries = 0;
    const tick = () => {
      const root = within.current;
      const els = root ? Array.from(root.querySelectorAll(select)) : [];
      const settled = els.length > 0 && els.every((el) => el.getAnimations().every((a) => a.playState !== "running"));
      if (settled) { setReady(true); return; }
      if (tries++ < 240) raf = requestAnimationFrame(tick);
    };
    tick();
    return () => cancelAnimationFrame(raf);
  }, [within, select]);
  return ready ? <>{children}</> : null;
}

/** Spawns one persistent toast per tone into the enclosing provider, so the rows below have a real
 *  instance of every family to read. `autoHide: false` keeps them for the life of the page — a timed
 *  toast would vanish out from under the table. Nothing is visible: the whole thing renders inside the
 *  measurement host. */
function ToastMeasurement() {
  const show = useToast();
  useEffect(() => {
    const dismissers = TONES.map((tone) => show({ body: `${tone} measurement`, tone, autoHide: false }));
    return () => dismissers.forEach((dismiss) => dismiss());
  }, [show]);
  return null;
}

const TONES: ToastTone[] = ["info", "success", "warning", "error"];

/** The token spec — every family's three roles MEASURED off a real, spawned toast of that tone and
 *  checked against the token each row claims, so a row can disagree with the component. */
function ToastSpec() {
  const wrap = useRef<HTMLDivElement>(null);
  return (
    <Box style={{ borderRadius: "var(--ds-radius-4)", border: "1px solid var(--ds-stroke-weak)", overflow: "hidden", background: "var(--ds-bg-subtle)" }}>
      <Flex align="center" gap="3" style={{ padding: "20px" }}>
        <Text size="1" style={{ color: "var(--ds-text-weak)" }}>
          Each tone paints from its accent-aware family — a weak <Mono>--ds-fill-*-weak</Mono> tint over an
          opaque <Mono>--ds-bg-overlay</Mono> base, a <Mono>--ds-stroke-*</Mono> border, and{" "}
          <Mono>--ds-text-*</Mono> on the glyph and body — so every tone tracks the brand collision shift.
          Every row below is read off a real toast of that tone, spawned by the engine into a hidden
          measurement viewport. The tint is the one part with no row: it is laid on as a gradient layer
          rather than a colour property, so nothing can be read off it to compare.
        </Text>
      </Flex>
      <div ref={wrap}>
        <MeasuredSpec
          render={(host) => (
            <ToastProvider label="Toast skin measurement">
              <ToastMeasurement />
              <ToastViewport position="bottom-end" label="Toast skin measurement" container={host} />
            </ToastProvider>
          )}
        >
          <WhenSettled within={wrap} select=".rt-ds-toast">
            <MeasuredRow
              part="Surface base"
              note="Shared by every tone — opaque, so a toast never goes see-through over content."
              token="--ds-bg-overlay"
              select='.rt-ds-toast[data-tone="info"]'
              prop="background-color"
            />
            {TONES.map((tone) => (
              <Fragment key={tone}>
                <MeasuredRow
                  part={`${tone} · border`}
                  token={`--ds-stroke-${tone}`}
                  select={`.rt-ds-toast[data-tone="${tone}"]`}
                  prop="border-top-color"
                />
                <MeasuredRow
                  part={`${tone} · text + glyph`}
                  token={`--ds-text-${tone}`}
                  select={`.rt-ds-toast[data-tone="${tone}"] .rt-ds-toast-body`}
                  prop="color"
                />
              </Fragment>
            ))}
          </WhenSettled>
        </MeasuredSpec>
      </div>
      <NoteRow part="Elevation" value="--ds-shadow-overlay — a toast floats above the page, not on it" />
      <NoteRow part="Tone tint" value="each tone lays a --ds-fill-{tone}-weak wash over that base as a background-IMAGE layer, so the base underneath stays opaque — there is no single colour property to read it off" />
    </Box>
  );
}

/* ---- Anatomy diagram ------------------------------------------------------ */

/** The toast rendered CLEANLY (real `.rt-ds-toast` skin), centred in a viewport frame, with numbered
 *  badges OUTSIDE the component connected by leader lines — the house anatomy pattern (Select/TextField),
 *  so the numerals read as annotations, never as part of the toast (a badge inside would look like a count). */
function ToastAnatomyDiagram() {
  return (
    <Box style={{ overflowX: "auto" }}>
      <Box style={{ position: "relative", width: "100%", minWidth: 460, maxWidth: 560, margin: "0 auto", height: 200, background: "var(--ds-bg-subtle)", border: "1px dashed var(--ds-stroke-weak)", borderRadius: "var(--ds-radius-4)", overflow: "hidden" }}>
        {/* the toast — centred, rendered clean (no inline badges) */}
        <Box data-size-lesson="toast affordances hold step 1 — the notification card sets its own scale" style={{ position: "absolute", left: "50%", top: "50%", transform: "translate(-50%, -50%)", width: 340 }}>
          <div className="rt-ds-toast" data-tone="success" style={{ width: "100%" }}>
            <span className="rt-ds-toast-icon" aria-hidden><CheckCircle weight="fill" /></span>
            <div className="rt-ds-toast-body">Project archived.</div>
            <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
              <Button priority="secondary" size="1">Undo</Button>
              <IconButton priority="tertiary" color="gray" size="1" aria-label="Dismiss"><X weight="bold" /></IconButton>
            </div>
          </div>
        </Box>
        {/* 1 — status icon (badge above, tick down to the glyph) */}
        <Box style={{ ...dotStyle, left: "calc(50% - 160px)", top: 42 }}>1</Box>
        <Box style={tick({ left: "calc(50% - 150px)", top: 62, height: 14 })} />
        {/* 3 — action / Undo (badge above, tick down) */}
        <Box style={{ ...dotStyle, left: "calc(50% + 91px)", top: 42 }}>3</Box>
        <Box style={tick({ left: "calc(50% + 101px)", top: 62, height: 14 })} />
        {/* 2 — body (badge below, tick up) */}
        <Box style={{ ...dotStyle, left: "calc(50% - 86px)", top: 138 }}>2</Box>
        <Box style={tick({ left: "calc(50% - 76px)", top: 124, height: 14 })} />
        {/* 4 — dismiss (badge below, tick up) */}
        <Box style={{ ...dotStyle, left: "calc(50% + 138px)", top: 138 }}>4</Box>
        <Box style={tick({ left: "calc(50% + 148px)", top: 124, height: 14 })} />
        {/* 5 — the viewport corner the stack pins to: a dashed rail marker in the frame corner */}
        <Box style={{ position: "absolute", right: 14, bottom: 14, width: 30, height: 22, borderRight: "2px solid var(--ds-stroke-weak)", borderBottom: "2px solid var(--ds-stroke-weak)", borderBottomRightRadius: "var(--ds-radius-3)" }} />
        <Box style={{ ...dotStyle, left: "auto", right: 50, bottom: 18 }}>5</Box>
      </Box>
    </Box>
  );
}

const ANATOMY_PARTS: [number, string, string][] = [
  [1, "Status icon", "a filled Phosphor glyph keyed to the tone — Info · CheckCircle · Warning · WarningCircle, the same family cue as a Field validation."],
  [2, "Body", "one line of feedback — no title. Painted --ds-text-{tone} over the opaque tinted surface; wraps to at most a couple of lines, never a paragraph."],
  [3, "Action", "at most one, canonically Undo — a size-1 secondary (surface) Button ridden by Toast.Action, whose altText is required (an a11y upgrade). A quiet accent chip keeps the message the hero. Omit it and the toast is feedback only."],
  [4, "Dismiss", "the mandatory close — a size-1 tertiary IconButton. Action + dismiss ride a ButtonGroup so the system buttonOrder governs the cluster (never a raw Flex)."],
  [5, "Viewport corner", "the fixed rail toasts stack in (ToastViewport position, default bottom-end). Newest enters at the anchored edge; the window caps at maxVisible."],
];

/* ---- Usage: the mount snippet + the decision map -------------------------- */

function CodeBlock({ children }: { children: string }) {
  return (
    <Box style={{ borderRadius: "var(--ds-radius-3)", border: "1px solid var(--ds-stroke-weak)", background: "var(--ds-bg-base)", padding: "14px 16px", overflowX: "auto" }}>
      <pre style={{ margin: 0, whiteSpace: "pre", fontFamily: "var(--code-font-family)", fontSize: 12, lineHeight: 1.7, color: "var(--ds-text-strong)" }}>{children}</pre>
    </Box>
  );
}

const MOUNT_SNIPPET = `import { Provider, ToastProvider, ToastViewport, useToast } from "@system/ui";

// 1 — Mount once, at the app root, inside the system <Provider>.
//     Place exactly one <ToastViewport /> — the fixed corner rail toasts render into.
function App() {
  return (
    <Provider>
      <ToastProvider>
        <Routes />         {/* your app */}
        <ToastViewport />  {/* default corner: bottom-end */}
      </ToastProvider>
    </Provider>
  );
}

// 2 — Anywhere below, get the imperative handle and fire feedback.
//     useToast() THROWS if there is no <ToastProvider> above it (no implicit DOM mount).
function SaveButton() {
  const toast = useToast();
  return (
    <Button
      onClick={() =>
        toast({
          body: "Draft saved.",
          tone: "success",
          action: { label: "Undo", altText: "Undo saving the draft", onClick: restore },
        })
      }
    >
      Save
    </Button>
  );
}`;

/* The Toast · Callout · AlertDialog comparison table now lives in ./_comparisons (MESSAGING_COMPARISON),
   rendered from all three components' Usage stories via ComparisonSection so the copies can't drift. */

/* ---- Keyboard contract ---------------------------------------------------- */

const TOAST_KEYS: KeyBinding[] = [
  { keys: ["F8"], action: <>Jump focus to the toast viewport from anywhere on the page — Radix's default hotkey.</>, src: "radix" },
  { keys: ["Tab", "⇧ Tab"], action: <>Move between the focused toast's <strong>Action</strong> and <strong>Dismiss</strong>, and on through the rest of the stack.</>, src: "radix" },
  { keys: ["Enter", "Space"], action: <>Activate the focused control — run <strong>Undo</strong>, or <strong>Dismiss</strong> the toast.</>, src: "radix" },
  { keys: ["Esc"], action: <>Dismiss the focused toast. Focus hands off to the next toast → the previous → the element focused before the chain — never dropping to <Code>&lt;body&gt;</Code> (the system manager).</>, src: "radix" },
  { keys: ["Swipe →"], action: <>Pointer or touch drag dismisses a toast; the swipe direction follows the corner — right for an <Code>-end</Code> viewport, left for a <Code>-start</Code>.</>, src: "radix" },
];

/* ---- QueueStates specimens ------------------------------------------------ */

const WINDOW_ITEMS: { tone: ToastTone; body: string }[] = [
  { tone: "success", body: "Report.pdf is ready." },
  { tone: "info", body: "Export queued." },
  { tone: "success", body: "Invite sent to Priya." },
  { tone: "warning", body: "Storage is 90% full." },
  { tone: "success", body: "Sync complete." },
];

function CountdownBar({ tone, pct, label }: { tone: ToastTone; pct: number; label: ReactNode }) {
  return (
    <Flex direction="column" gap="1" style={{ width: "100%" }}>
      <Box style={{ height: 3, borderRadius: "var(--ds-radius-full)", background: "var(--ds-fill-weak)", overflow: "hidden" }}>
        <Box style={{ height: "100%", width: `${pct}%`, background: `var(--ds-text-${tone})`, borderRadius: "var(--ds-radius-full)" }} />
      </Box>
      <Text size="1" style={{ color: "var(--ds-text-weak)" }}>{label}</Text>
    </Flex>
  );
}

/* ========================================================================== */

const meta: Meta = {
  title: "Components/Feedback & Status/Toast",
  parameters: {
    controls: { disable: true },
    docs: {
      description: {
        component:
          "**Toast** is transient feedback that floats over content — built on `@radix-ui/react-toast` with the " +
          "System's four accent-aware tone families, modal-tier motion (in briskly, out slowly), and the " +
          "**queue manager Radix doesn't ship** (windowing, id-dedup, a pause-aware timer, focus handoff). " +
          "A toast is *feedback, not a decision*: reach for `AlertDialog` to decide, `Callout` for persistent " +
          "in-page messaging, and the `Field` shell for form validation — never a toast.",
      },
    },
  },
};
export default meta;
type Story = StoryObj;

/* ---- Props ----------------------------------------------------------- */

const PROPS: PropDef[] = [
  { name: "body", type: "ReactNode", desc: <>The message. A toast has no title — one line of feedback.</>, source: "Toast.tsx" },
  { name: "tone", type: `"info" | "success" | "warning" | "error"`, def: `"info"`, desc: <>Semantic family. <Code>error</Code> persists + announces assertively; the rest auto-hide + announce politely.</>, source: "Toast.tsx" },
  { name: "autoHide", type: "boolean", def: "true (false for error)", desc: <>Auto-dismiss after <Code>autoHideDuration</Code>. Paused on hover/focus/window-blur.</>, source: "Toast.tsx" },
  { name: "autoHideDuration", type: "number", def: "5000", desc: <>Countdown in ms; on resume it clamps to a 1000ms minimum.</>, source: "Toast.tsx" },
  { name: "action", type: "{ label, altText, onClick }", desc: <>One action, canonically Undo. Renders in a <Code>ButtonGroup</Code> with the mandatory dismiss; <Code>altText</Code> is required.</>, source: "Toast.tsx" },
  { name: "uniqueID / collisionBehavior", type: `string / "overwrite" | "ignore"`, def: `— / "overwrite"`, desc: <>Dedup key + how a live collision resolves: replace + reset, or drop the newcomer.</>, source: "Toast.tsx" },
  { name: "onHide", type: "() => void", desc: <>Fires when the entry leaves (dismissed, swiped, timed out, or programmatic).</>, source: "Toast.tsx" },
  { name: "ToastViewport — position", type: `"top|bottom-start|end"`, def: `"bottom-end"`, desc: <>Corner the toasts stack in.</>, source: "Toast.tsx" },
  { name: "ToastViewport — maxVisible", type: "number", def: "5", desc: <>Cap of simultaneously-rendered toasts; older ones queue and surface as slots free.</>, source: "Toast.tsx" },
  { name: "ToastViewport — container", type: "HTMLElement | null", def: "document.body", desc: <>Element the rail portals into. The body is what lets a toast clear an open modal. Pass another element only to contain the rail.</>, source: "Toast.tsx" },
];

type PropsArgs = {
  tone: ToastTone;
  autoHide: boolean;
  autoHideDuration: number;
  action: boolean;
  uniqueID: string;
  collisionBehavior: CollisionBehavior;
  position: ToastPosition;
  maxVisible: number;
};

function PropsTrigger(args: PropsArgs) {
  const toast = useToast();
  return (
    <Box style={{ padding: "8px 0 2px" }}>
      <Button
        priority="secondary"
        onClick={() =>
          toast({
            body: TONE_BODY[args.tone],
            tone: args.tone,
            autoHide: args.autoHide,
            autoHideDuration: args.autoHideDuration,
            action: args.action ? { label: "Undo", altText: "Undo the last action", onClick: () => {} } : undefined,
            uniqueID: args.uniqueID || undefined,
            collisionBehavior: args.collisionBehavior,
          })
        }
      >
        Show toast
      </Button>
    </Box>
  );
}

export const Anatomy: Story = {
  // The tone specimens paint --ds-text-{tone} (step-11) on a weak family tint — several accents land just
  // under axe's strict 4.5 (the [[brand-collision-shift-table]] step-11 reality, same basis as the Field validation text), so scope
  // color-contrast off for these tinted specimens only. The action is a secondary surface chip (accent-11
  // on accent-a3), which clears 4.5 on its own — it no longer leans on the on-solid exception.
  parameters: { a11y: { context: { exclude: [DODONT_LABEL] } } },
  render: (_args, { globals }) => (
    <HexThemeKey.Provider value={`${globals.accent}-${globals.appearance}-${globals.contrast}`}>
      <Page>
        <PageHeader title="Toast · Anatomy" standfirst={DEFINITION} />

        <Section title="Anatomy" lead="A toast is a status icon, a single line of body, an optional action, and a mandatory dismiss — pinned in the viewport corner. It has no title and no more than one action; anything more belongs in a dialog.">
          <ToastAnatomyDiagram />
          <AnatomyLegend parts={ANATOMY_PARTS} />
          <Caption>
            Only the <strong>icon</strong>, <strong>body</strong>, and <strong>dismiss</strong> are always present.
            The <strong>action</strong> is optional (at most one, canonically Undo). The surface is{" "}
            <strong>opaque</strong>, so it never goes see-through over content.
          </Caption>
        </Section>

        <Rule />

        <Section title="Tones" lead="Four families, each a settled specimen painted from its own accent-aware tokens. error carries an action here; the surface stays opaque over content.">
          <Flex direction="column" gap="3" data-size-lesson="toast affordances hold step 1 — the notification card sets its own scale">
            <ToastMock tone="info" />
            <ToastMock tone="success" action />
            <ToastMock tone="warning" />
            <ToastMock tone="error" action actionLabel="Retry" />
          </Flex>
        </Section>

      </Page>
    </HexThemeKey.Provider>
  ),
};

/** Usage — how to mount it, when to choose a toast over a Callout or an AlertDialog, the do/don't, and
 *  the live token spec that closes the page. */
export const Usage: Story = {
  // The DoDont labels (~4.1–4.4:1) sit just under axe's 4.5, and the tone specimens paint step-11 text on
  // a weak family tint (the [[brand-collision-shift-table]] step-11 reality) — the same documented exception as Kbd/DropdownMenu. Scoped
  // here only; the Props keeps full axe. (The "do" card's Undo is now a secondary surface chip.)
  parameters: { a11y: { context: { exclude: [DODONT_LABEL] } } },
  render: (_args, { globals }) => (
    <Page>
      <PageHeader title="Toast · Usage" standfirst={DEFINITION} />

      <ComparisonSection comparison={MESSAGING_COMPARISON} highlight="Toast" />

      <Rule />

      <Section title="Feedback, not a decision" lead="A toast reports what just happened and gets out of the way. Four rules keep it in its lane.">
        <Flex direction="column" gap="3">
          <Decision id="Feedback">A toast is <strong>feedback, not a decision</strong>. If the user must choose, use <Code>AlertDialog</Code>.</Decision>
          <Decision id="Persistent">For persistent, in-context messaging use <Code>Callout</Code> — a toast is transient by nature.</Decision>
          <Decision id="Validation">Never a toast for <strong>form validation</strong> — that rides the <Code>Field</Code> shell, inline with the input.</Decision>
          <Decision id="One action">At most <strong>one action</strong> per toast, canonically Undo. More than one belongs in a dialog.</Decision>
        </Flex>
      </Section>

      <Rule />

      <Section title="Do / Don't" lead="A toast reports what happened; it never asks the user to decide.">
        <Grid columns={{ initial: "1", sm: "2" }} gap="3" data-size-lesson="toast affordances hold step 1 — the notification card sets its own scale">
          <DoDont kind="do" bare note="Feedback on a completed action, one line, with a single Undo — the user can carry on or reverse. Auto-hides; an error would persist instead.">
            <ToastMock tone="success" action />
          </DoDont>
          <DoDont kind="dont" bare note="A toast is the wrong home for a decision (“Delete this?” → AlertDialog) or for a field error (→ the inline Field message). Transient feedback can’t carry a choice or wait for one.">
            <ToastMock tone="error" />
          </DoDont>
        </Grid>
      </Section>

      <Rule />

      {/* Mounting is the last thing a reader needs — lead with when-to-use, close with how-to-wire. */}
      <Section title="Mounting" lead="Toast is consumer-mounted — nothing wires it automatically. Wrap the app in a ToastProvider inside the system Provider, place one ToastViewport, then call useToast anywhere below.">
        <CodeBlock>{MOUNT_SNIPPET}</CodeBlock>
        <Caption>The <Code>ToastProvider</Code> is not baked into <Code>Provider</Code> (that would create a theme→component import cycle) — mount it yourself, once. <Code>useToast()</Code> throws if there is no provider above it, so a missing mount fails loudly rather than silently dropping toasts.</Caption>
      </Section>

      <Rule />

      <HexThemeKey.Provider value={`${globals.accent}-${globals.appearance}-${globals.contrast}`}>
        <Section title="Tokens" lead="Measured off a real toast of each tone — every row names the element and the property that paints the part, reads it, and checks it against the token it claims.">
          <ToastSpec />
        </Section>
      </HexThemeKey.Provider>
    </Page>
  ),
  // The only play here is PASSIVE: viewing the docs must not spawn a VISIBLE toast (the four the table
  // measures live in the hidden measurement host and never appear). The engine behavior — spawn,
  // windowing, dedup, the pause-aware timer, focus handoff — lives in _internal/Toast behavior.
  play: async ({ canvasElement }) => {
    // The token table's EVIDENCE, asserted at runtime — every row read a REAL spawned toast of its tone.
    // The toasts are spawned by the engine, so the table does not exist at the instant the story renders.
    // `awaitMeasuredRows` is told how many rows this story declares: it blocks until all 9 are on the page
    // AND each has recorded its evidence, then runs the identical assertions. Without the count, an empty
    // table would satisfy "every row I can see has evidence" and return 0/0.
    const rows = await awaitMeasuredRows(canvasElement, { rows: 9 });
    if (rows.measured !== 9 || rows.unproven !== 0) {
      throw new Error(`expected 9 measured / 0 unproven token rows, got ${rows.measured} / ${rows.unproven}`);
    }
  },
};

/** Keyboard — the complete key → action contract. Everything is inherited from the Radix Toast primitive;
 *  the system layers the pause-aware timer and the next→previous→restore focus handoff on top. */
export const Keyboard: Story = {
  // The static target toast paints --ds-text-success (step-11) on a weak tint — just under axe's strict 4.5
  // for some accents (the [[brand-collision-shift-table]] step-11 reality). Its Undo is a secondary surface chip (clears 4.5 on its own).
  parameters: { a11y: { context: { exclude: [DODONT_LABEL] } } },
  render: () => (
    <Page>
      <PageHeader title="Toast · Keyboard" standfirst={DEFINITION} />

      <Section title="Keyboard" lead={<>The full key → action contract. Press <Code>F8</Code> to jump focus into the stack from anywhere, then the keys below act on the focused toast. Every binding is inherited from the Radix Toast primitive; the system adds the focus handoff and the pause-aware timer, not new keys.</>}>
        <Flex direction="column" gap="2">
          <Box data-size-lesson="toast affordances hold step 1 — the notification card sets its own scale" style={{ maxWidth: 400 }}>
            <ToastMock tone="success" action />
          </Box>
          <Caption>A static target — its <strong>Undo</strong> and <strong>Dismiss</strong> are real, focusable controls, so you can <Code>Tab</Code> and activate them here without a live toast spawning.</Caption>
        </Flex>
        <Box style={{ borderRadius: "var(--ds-radius-4)", border: "1px solid var(--ds-stroke-weak)", overflow: "hidden", background: "var(--ds-bg-subtle)" }}>
          {TOAST_KEYS.map((b) => <KeyRow key={b.keys.join("+")} {...b} />)}
        </Box>
      </Section>

      <Rule />

      <Section title="Timer & focus" lead="Beyond the keys, the system layers a pause-aware timer and a focus handoff on top of the primitive.">
        <Flex direction="column" gap="3" style={{ maxWidth: 640 }}>
          <Text size="2" style={{ color: "var(--ds-text-strong)" }}>
            The auto-hide countdown <strong>pauses</strong> on hover, on focus, and on window blur, and clamps to a
            1000&nbsp;ms minimum on resume — a refocused toast never vanishes mid-read.
          </Text>
          <Text size="2" style={{ color: "var(--ds-text-strong)" }}>
            On dismiss, <strong>focus</strong> moves to the next toast, else the previous, else the element focused
            before the chain — it never drops to <Code>&lt;body&gt;</Code>.
          </Text>
          <Text size="2" style={{ color: "var(--ds-text-strong)" }}>
            <Code>error</Code> <strong>announces assertively</strong>; every other tone is polite — so an error
            interrupts a screen reader while routine confirmations wait their turn.
          </Text>
        </Flex>
      </Section>
    </Page>
  ),
  // No play — the target is static; live keyboard behavior is asserted in _internal/Toast behavior.
};

/** QueueStates — the manager's queue behaviors as STATIC specimens: windowing, overwrite dedup, a paused
 *  timer, and persistence by tone. Pre-rendered mocks painted from real --ds-* tokens; nothing spawns on
 *  view (the live queue is driven in _internal/Toast behavior). */
export const QueueStates: Story = {
  // SIDEBAR LEAF, in the house's sentence case. Left to Storybook the export name is
  // title-cased into "Queue States", which then disagrees with this page's own h1 —
  // the header suffix is the role humanized ("Queue states"), and the sidebar is the
  // same page. An explicit `name` does not change the story id.
  name: "Queue states",
  render: () => (
    <Page>
      <PageHeader title="Toast · Queue states" standfirst={DEFINITION} />

      <Section title="Windowing — newest maxVisible render, the rest queue" lead="The viewport renders only the newest maxVisible toasts (default 5) — entries.slice(-maxVisible). Older toasts wait and surface as slots free; the chip stands in for the N still queued.">
        <Flex direction="column" gap="2" align="stretch" style={{ maxWidth: 360 }} data-size-lesson="toast affordances hold step 1 — the notification card sets its own scale">
          <Box style={{ alignSelf: "flex-end", padding: "2px 10px", borderRadius: "var(--ds-radius-full)", background: "var(--ds-fill-weak)", border: "1px solid var(--ds-stroke-weak)" }}>
            <Text size="1" style={{ color: "var(--ds-text-weak)" }}>+3 more queued</Text>
          </Box>
          {WINDOW_ITEMS.map((it, i) => (
            <ToastMock key={i} tone={it.tone} body={it.body} style={{ maxWidth: "none" }} />
          ))}
        </Flex>
        <Caption>Five visible at a bottom-end viewport; the three still queued surface one at a time as these dismiss or time out. Raise <Code>maxVisible</Code> to show more at once.</Caption>
      </Section>

      <Rule />

      <Section title="Overwrite dedup — one id, replaced in place" lead="A second toast with a live uniqueID follows collisionBehavior. overwrite (the default) replaces the existing entry — new body, timer reset — instead of stacking a duplicate; ignore drops the newcomer and leaves the first untouched.">
        <Flex align="center" gap="4" wrap="wrap" data-size-lesson="toast affordances hold step 1 — the notification card sets its own scale">
          <Flex direction="column" gap="1" style={{ minWidth: 220, flex: 1 }}>
            <Muted>First call — <Mono>uniqueID: "upload"</Mono></Muted>
            <ToastMock tone="info" body="Uploading… 40%" style={{ maxWidth: "none" }} />
          </Flex>
          <Flex align="center" gap="1" style={{ color: "var(--ds-text-weak)", flexShrink: 0 }}>
            <ArrowRight weight="bold" />
            <Text size="1">overwrite (same id)</Text>
          </Flex>
          <Flex direction="column" gap="1" style={{ minWidth: 220, flex: 1 }}>
            <Muted>Second call — <strong>same id</strong></Muted>
            <ToastMock tone="info" body="Uploading… 90%" style={{ maxWidth: "none" }} />
          </Flex>
        </Flex>
        <Caption>Progress and status updates keyed to one <Code>uniqueID</Code> stay a single toast rather than a pile of near-duplicates — the manager cancels the pending removal and resets the countdown on the reused id.</Caption>
      </Section>

      <Rule />

      <Section title="Paused timer" lead="The auto-hide countdown holds while the pointer is over a toast, while it holds focus, and while the window is blurred — so a toast can't slip away mid-read. On resume the remaining time clamps to a 1000ms minimum.">
        <Box data-size-lesson="toast affordances hold step 1 — the notification card sets its own scale" style={{ maxWidth: 400 }}>
          <ToastMock
            tone="info"
            body="Heads up — your export is queued."
            footer={
              <Flex align="center" gap="2">
                <Pause weight="fill" style={{ color: "var(--ds-text-weak)", flexShrink: 0 }} />
                <CountdownBar tone="info" pct={55} label="Timer paused — pointer, focus, or window-blur holds it" />
              </Flex>
            }
          />
        </Box>
        <Caption>The bar is frozen at whatever time remained when the pause began; it resumes (never below 1s) once the pointer leaves, focus moves out, and the window regains focus.</Caption>
      </Section>

      <Rule />

      <Section title="Persistence by tone" lead="error persists — no auto-hide, dismissed by hand — and announces assertively. Every other tone auto-hides after ~5s and announces politely.">
        <Grid columns={{ initial: "1", sm: "2" }} gap="3" data-size-lesson="toast affordances hold step 1 — the notification card sets its own scale">
          <Scenario label="ERROR · PERSISTS" caption={<>Stays until the user acts — a failure shouldn’t vanish before it’s read. Announced assertively (<Code>type="foreground"</Code>).</>}>
            <ToastMock
              tone="error"
              body="Upload failed — the file is too large."
              style={{ maxWidth: "none" }}
              footer={<Text size="1" style={{ color: "var(--ds-text-weak)" }}>Persists — no auto-hide; dismiss manually.</Text>}
            />
          </Scenario>
          <Scenario label="SUCCESS · AUTO-HIDES" caption={<>Fades after ~5s (paused on hover / focus / blur). Announced politely (<Code>type="background"</Code>).</>}>
            <ToastMock
              tone="success"
              body="Project archived."
              style={{ maxWidth: "none" }}
              footer={<CountdownBar tone="success" pct={40} label="Auto-hides in ~5s" />}
            />
          </Scenario>
        </Grid>
        <Caption>The countdown bar is illustrative — the live component has no visible timer bar; it simply hides when the clock runs out. <Code>autoHide</Code> / <Code>autoHideDuration</Code> override the per-tone default.</Caption>
      </Section>
    </Page>
  ),
  // No play — every specimen is a static mock. The live queue (windowing, dedup, persistence) is
  // exercised in _internal/Toast behavior.
};

/* ---- Props ----------------------------------------------------------- */

export const Props: StoryObj<PropsArgs> = {
  args: { tone: "success", autoHide: true, autoHideDuration: 5000, action: true, uniqueID: "", collisionBehavior: "overwrite", position: "bottom-end", maxVisible: 5 },
  argTypes: {
    tone: { control: "inline-radio", options: ["info", "success", "warning", "error"], table: { category: "Content" } },
    autoHide: { control: "boolean", description: "Auto-dismiss (forced false for error unless set).", table: { category: "Lifecycle" } },
    autoHideDuration: { control: { type: "number", min: 1000, step: 500 }, table: { category: "Lifecycle" } },
    action: { control: "boolean", description: "Show an Undo action.", table: { category: "Content" } },
    uniqueID: { control: "text", description: "Dedup key — reuse it + click again to see collisionBehavior.", table: { category: "Dedup" } },
    collisionBehavior: { control: "inline-radio", options: ["overwrite", "ignore"], table: { category: "Dedup" } },
    position: { control: "select", options: ["top-start", "top-end", "bottom-start", "bottom-end"], table: { category: "Viewport" } },
    maxVisible: { control: { type: "number", min: 1, max: 8 }, table: { category: "Viewport" } },
  },
  parameters: { controls: { disable: false } },
  render: (args: PropsArgs) => (
    <ToastProvider swipeDirection={args.position.endsWith("start") ? "left" : "right"}>
      <Page maxWidth="none">
        <PageHeader title="Toast · Props" standfirst={DEFINITION} />
        <PropsTrigger {...args} />
        <Caption>Click <strong>Show toast</strong> to spawn one — the render stays static until you do. Set a <Code>uniqueID</Code> and click again to watch <Code>collisionBehavior</Code>.</Caption>
        <PropsLead />
        <Rule />
        <Section title="Props reference" lead={<>Every option <Code>useToast</Code> and the viewport accept.</>}>
          <PropTable rows={PROPS} />
        </Section>
      </Page>
      <ToastViewport position={args.position} maxVisible={args.maxVisible} />
    </ToastProvider>
  ),
};

/** The parts of a toast — a labeled callout diagram + each tone. The live token spec lives in Usage. */

export const History: Story = {
  render: () => (
    <Page>
      <PageHeader title="Toast · History" standfirst={DEFINITION} />

      <Section title="Decisions" lead="The rulings this component encodes.">
        <Flex direction="column" gap="3">
          <Decision id="[[headless-primitives-declared]] · Built on a Radix primitive">Built on the raw <Code>@radix-ui/react-toast</Code> primitive (a first-class dependency) + our <Code>--ds-*</Code> layer. The <strong>queue manager Radix doesn't ship</strong> — windowing, dedup, a pause-aware timer, and focus handoff — is added on top, all in one file.</Decision>
          <Decision id="[[toast-feedback-tier]] · tones">Four accent-aware tone families — <Code>info</Code> (default) · <Code>success</Code> · <Code>warning</Code> · <Code>error</Code> — painted from <Code>--ds-fill-*-weak</Code> / <Code>--ds-stroke-*</Code> / <Code>--ds-text-*</Code> + a Phosphor status glyph (the Field convention). The surface is an <strong>opaque</strong> panel. <Code>error</Code> persists (no auto-hide) and announces assertively (<Code>type="foreground"</Code>); the rest auto-hide at 5000ms and announce politely (<Code>type="background"</Code>). The primitive announces — we never hand-set <Code>role</Code>/<Code>aria-live</Code>.</Decision>
          <Decision id="[[toast-feedback-tier]] · queue">The manager owns the queue: <strong>windowing</strong> (only the newest <Code>maxVisible</Code>, default 5, render — older ones queue), <strong>dedup</strong> (<Code>uniqueID</Code> + <Code>collisionBehavior</Code>), a <strong>pause-aware timer</strong> (hover/focus + window-blur pause, 1000ms resume clamp), and <strong>focus handoff</strong> on dismiss (next → previous → restore, never <Code>&lt;body&gt;</Code>). Radix's Presence lifecycle handles the enter/exit bookkeeping.</Decision>
          <Decision id="[[toast-feedback-tier]] · actions">The action + mandatory dismiss ride a <Code>ButtonGroup</Code> (buttonOrder governs the cluster — never a raw Flex). One action, canonically <strong>Undo</strong>, rendered as a <Code>priority="secondary"</Code> (surface) chip — a quiet accent surface keeps the tone message the hero. <Code>Toast.Action</Code> requires an <Code>altText</Code> — a spoken description of what the action does, so it is never announced as a bare label. Swipe-dismiss follows the corner; Escape closes.</Decision>
          <Decision id="Fixed chrome">A toast is fixed transient chrome, so its size is <strong>pinned</strong> — the buttons stay <Code>size="1"</Code> and the body at <Code>font-size-2</Code> rather than following the global <Code>uiSize</Code> lane. Intentional: a passing notification shouldn't balloon (or shrink) with the app's density setting the way in-page controls do.</Decision>
          <Decision id="Motion · the modal tier">A toast arrives unbidden, so it slides in briskly on <Code>--ds-duration-moderate</Code> (180ms) and leaves on the much longer <Code>--ds-duration-expressive</Code> (320ms) with the decelerating <Code>--ds-ease-standard</Code> — long enough to register that it went, and long enough to grab before it does. <strong>Swipe is the exception</strong>: a swipe is direct manipulation, so it follows the pointer and snaps away on <Code>--ds-ease-exit</Code>. You dismissed it deliberately; it shouldn't linger.</Decision>
          <Decision id="Hotkey">The focus-the-viewport hotkey is Radix's default <Code>F8</Code> — press it to jump focus into the toast stack from anywhere on the page.</Decision>
          <Decision id="SSR">A <Code>useToast()</Code> called with no <Code>&lt;ToastProvider&gt;</Code> above it <strong>throws</strong> with a clear message — there is no implicit DOM mount, so a missing provider fails loudly rather than silently dropping toasts.</Decision>
          <Decision id="Provider">Consumer-mounts: <Code>&lt;ToastProvider&gt;</Code> wraps the app once (typically just inside the system <Code>&lt;Provider&gt;</Code>) and a <Code>&lt;ToastViewport&gt;</Code> is placed once. It is not baked into <Code>Provider.tsx</Code> — that avoids a theme→component import cycle and keeps the whole engine in one file, matching Radix's app-root Provider convention. See the <strong>Usage</strong> page for the copy-paste mount snippet.</Decision>
        </Flex>
      </Section>
      <Rule />
      <Section title="Changelog" lead="Newest first.">
        <Flex direction="column" gap="3">
          <Decision id="0.9.0 · motion">Retimed to the modal tier: in on 180ms, out on 320ms with the decelerating curve — previously it slid in over 260ms and was cut away in 120ms, the opposite of how a notification should behave. Swipe-dismiss keeps its fast snap.</Decision>
          <Decision id="0.9.0">Docs upgraded to the full six-section spine — <strong>Anatomy</strong> (callout diagram + the tone specimens), <strong>Usage</strong> (mount snippet + toast-vs-Callout-vs-AlertDialog decision map + do/don't + the live token spec), <strong>Keyboard</strong> (F8 · Esc · swipe), and <strong>QueueStates</strong> (windowing · dedup · paused · persistence). Every specimen is a static mock — viewing a page never spawns a toast.</Decision>
          <Decision id="0.9.0">Initial <Code>System/Toast</Code> — the engine (four tones, windowed queue, dedup, pause-aware timer, focus handoff) + the lite-floor docs.</Decision>
        </Flex>
      </Section>
    </Page>
  ),
};
