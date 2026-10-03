import { type ReactNode } from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { Box, Code, Flex, Grid, Text } from "@radix-ui/themes";
import { ShareNetwork, Copy, PaperPlaneTilt } from "@phosphor-icons/react";
import { Popover } from "./Popover";
import { Button } from "./Button";
import { TextField } from "./TextField";
import { Contrast } from "../../theme/Contrast";
import { useResolvedSize } from "../../theme/SizeContext";
import {
  Decision, DoDont, DODONT_LABEL, HexThemeKey, LiteTokenSpec, MeasuredRow, MeasuredSpec, Mono, Page, PageHeader,
  PropsLead, type PropDef, PropTable, Rule, Section,
} from "./_storyKit";
import { assertMeasuredRows } from "../../foundations/_assert";
import { ComparisonSection, FLOATING_INFO_COMPARISON } from "./_comparisons";

/* Popover reuses Radix's own solid panel skin (an opaque --color-panel-solid surface + an elevation
   shadow, [[floating-surface-fill]]), so it declares no --ds-* roles of its own — it's a skin-reuser (0 paint tokens).

   The rows below are MEASURED ([[measured-token-rows]]). Each one names an element and a property; the row reads that
   property off the rendered panel and checks it against the token it claims, so it can disagree with
   the component. The previous version read back a hidden span this file had just painted
   `--color-panel-solid` — it set the value it then measured, so the row could not fail, and a row that
   cannot fail guards nothing.

   The panel is PORTALED and only mounts while the Popover is open, which is the hard part — solved
   rather than worked around: a measurement-only Popover.Content is `forceMount`ed (it exists while the
   Root is closed, so there is no open transition, no focus move, no dismissable behaviour) and
   `container`-portaled into the MeasuredSpec host, which is visibility:hidden — off the screen, out of
   the a11y tree, out of axe, and still computing full styles. */

function PanelSkinSpec() {
  return (
    <LiteTokenSpec
      rationale={
        <>
          Popover reuses Radix's own solid panel skin and declares no <Mono>--ds-*</Mono> roles of its
          own — the panel is an opaque surface with an elevation shadow, never translucent. The rows below
          are read off a real, mounted <Mono>Popover.Content</Mono> and checked against the tokens they
          name, so they report what the panel paints rather than what the tokens say. It is the{" "}
          <em>same</em> panel skin the System menus sit on (DropdownMenu, ContextMenu, Select), so a
          Popover and a menu opened side by side read as one surface family. Its motion is inherited too:
          the panel rides the shared <Mono>.rt-PopperContent</Mono> base class, so it opens and closes on
          the system overlay-motion scale with zero component CSS.
        </>
      }
    >
      <MeasuredSpec
        render={(host) => (
          <Popover.Root>
            <Popover.Anchor />
            <Popover.Content forceMount container={host} aria-label="Panel skin measurement" />
          </Popover.Root>
        )}
      >
        <MeasuredRow
          part="Panel surface"
          note="The opaque card the content sits on."
          token="--color-panel-solid"
          select=".rt-PopoverContent"
          prop="background-color"
        />
        <MeasuredRow
          part="Panel text"
          note="Inherited from the panel, not set by the wrap."
          token="--gray-12"
          select=".rt-PopoverContent"
          prop="color"
        />
      </MeasuredSpec>
    </LiteTokenSpec>
  );
}

/* The Usage specimen — a realistic Share panel. Rendered CLOSED: viewing the docs page must never
   auto-open the panel (no defaultOpen, no controlled `open`), so the reader sees the trigger at rest and
   opens it themselves. The open/focus/Escape behaviour is exercised in _internal/Popover behavior. */
function SharePopover() {
  return (
    <Popover.Root>
      <Popover.Trigger>
        <Button priority="secondary"><ShareNetwork weight="bold" /> Share</Button>
      </Popover.Trigger>
      {/* The cap is set from the footer row's natural width, not eyeballed: the "link can view" line +
          the Copy-link button measure 262px side by side, and the Content's padding grows with the
          uiSize lane (12 · 16 · 24px a side), so a 288px cap left the row 6px short at medium/large and
          the line wrapped INTO the button. 320px clears the widest lane; the row itself is nowrap, so
          the panel grows to fit rather than reflowing the sentence. */}
      <Popover.Content maxWidth="320px" aria-label="Share this project">
        <Flex direction="column" gap="3">
          <Text size="2" weight="bold" style={{ color: "var(--ds-text-strong)" }}>Share “Orbit”</Text>
          {/* The field is the System TextField, so it carries a REAL label (not an aria-label beside a
              hand-rolled caption) and rides the control lane — the same lane as the Send button beside it,
              which is what keeps the two the same height. align="end" bottom-aligns the button to the
              input row, under the field's own label. */}
          <Flex gap="2" align="end">
            <Box style={{ flex: 1 }}>
              <TextField label="Invite by email" placeholder="name@company.com" />
            </Box>
            <Button priority="primary"><PaperPlaneTilt weight="bold" /> Send</Button>
          </Flex>
          <Flex align="center" justify="between" gap="2" wrap="nowrap" style={{ borderTop: "1px solid var(--ds-stroke-weak)", paddingTop: "var(--space-2)" }}>
            <Text size="1" style={{ color: "var(--ds-text-weak)", whiteSpace: "nowrap" }}>Anyone with the link can view</Text>
            <Popover.Close>
              <Button priority="tertiary" size="1" style={{ flexShrink: 0 }}><Copy weight="bold" /> Copy link</Button>
            </Popover.Close>
          </Flex>
        </Flex>
      </Popover.Content>
    </Popover.Root>
  );
}

/* A static panel mock painted from the system tokens — reads like a real floating Popover without a
   second portaled panel floating over the do/don't grid (the DropdownMenu MenuMock precedent).

   Its CHROME steps with the lane, because the real one does: `Popover.Content` resolves its step from
   the control lane (`useResolvedSize("control", size)`, Popover.tsx) and Radix's popover.css keys the
   panel's padding + radius off that step. Pinned at `--space-3` / `--ds-radius-4` the mock was right
   only at the default tier and silently wrong at medium and large — the same freeze the sibling menu
   mocks resolve away. The map below is Radix's own table from popover.css, restated because the vars
   it sets (`--popover-content-padding`) exist only under `.rt-PopoverContent`, which this mock is not. */
const CONTENT_CHROME: Record<"1" | "2" | "3" | "4", { padding: string; radius: string }> = {
  "1": { padding: "var(--space-3)", radius: "var(--ds-radius-4)" },
  "2": { padding: "var(--space-4)", radius: "var(--ds-radius-4)" },
  "3": { padding: "var(--space-5)", radius: "var(--ds-radius-5)" },
  "4": { padding: "var(--space-6)", radius: "var(--ds-radius-5)" },
};

function PanelMock({ children }: { children: ReactNode }) {
  const step = useResolvedSize<"1" | "2" | "3" | "4">("control", undefined) ?? "1";
  const chrome = CONTENT_CHROME[step];
  return (
    <Box style={{ background: "var(--ds-bg-overlay)", borderRadius: chrome.radius, boxShadow: "var(--ds-shadow-overlay)", border: "1px solid var(--ds-stroke-weak)", padding: chrome.padding, width: 232 }}>
      {children}
    </Box>
  );
}

const PROPS: PropDef[] = [
  { name: "Content — size", type: `"1" | "2" | "3" | "4"`, def: "control lane (1 at small)", desc: <>Radix Content size — tunes the panel's padding + radius. Unset on the wrapper it follows the global <Code>uiSize</Code> control lane; an explicit step wins.</>, source: "Popover.tsx" },
  { name: "Content — maxWidth", type: "Responsive<string>", def: `"480px"`, desc: <>Caps the panel width; the content wraps within it. Reach for a modest cap so a text/form panel stays a comfortable reading measure.</>, source: "Radix" },
  { name: "Content — width", type: "Responsive<string>", desc: <>Pins the panel to a fixed width instead of sizing to its content. Left unset the panel is content-sized (min the trigger width).</>, source: "Radix" },
  { name: "Root / Trigger / Close / Anchor", type: "compound parts", desc: <>Pass through to Radix. Trigger/Close compose a child via <Code>asChild</Code>, so a System <Code>Button</Code> drops straight in; Content also forwards the anchor/arrow positioning props (<Code>side</Code>, <Code>align</Code>, <Code>sideOffset</Code>).</>, source: "Radix" },
];

/** The one definition of this component — the standfirst every page of it opens with. */
const DEFINITION = <>A click-opened floating panel for supplemental content or a small form. Click the trigger to open it — <Kbd>Esc</Kbd>, a click outside, or a Close control dismisses it and returns focus to the trigger.</>;

const meta: Meta<typeof Popover.Root> = {
  title: "Components/Modals & Popovers/Popover",
  component: Popover.Root,
  parameters: {
    controls: { disable: true },
    docs: {
      description: {
        component:
          "**Popover** is a click-opened floating panel that holds arbitrary content — text, controls, or " +
          "a small form — as a labelled `role=\"dialog\"`. It wraps Radix's compound Popover with Content on " +
          "the uiSize control lane; it reuses Radix's solid panel skin (no `--ds-*` roles) and inherits the " +
          "shared popper motion via the `.rt-PopperContent` base class, so the wrap adds zero motion CSS. " +
          "Because it is click-opened and keyboard-reachable, it alone among the floating-info surfaces can " +
          "carry primary content or a form.",
      },
    },
  },
};
export default meta;
type Story = StoryObj<typeof Popover.Root>;

/** Usage — the Share specimen (closed on view), the live skin token spec, one do/don't, and the
 *  floating-info comparison. */
export const Usage: Story = {
  // Scoped exception on this docs story only (Props keeps full axe): the DoDont cards carry a
  // success/error tint that measures ~4.1–4.4 (just under axe's 4.5) — the colour + the DO/DON'T word
  // carry the meaning, so it's a documented specimen exception via [data-dodont]. The rest of the page
  // stays contrast-checked.
  parameters: { a11y: { context: { exclude: [DODONT_LABEL] } } },
  render: (_args, { globals }) => (
    <HexThemeKey.Provider value={`${globals.accent}-${globals.appearance}-${globals.contrast}`}>
      <Page>
        <PageHeader title="Popover · Usage" standfirst={DEFINITION} />
        <Section title="Specimen" lead="A Share panel — a trigger that opens a small form (an email field, a send action, a copy-link). Click to open; it stays closed on view.">
          <Box style={{ minHeight: 48 }}>
            <SharePopover />
          </Box>
        </Section>
        <Rule />
        <ComparisonSection comparison={FLOATING_INFO_COMPARISON} highlight="Popover" />
        <Rule />
        <Section title="What the panel should hold" lead="A Popover carries content or controls on demand — click-opened and keyboard-reachable, so it can hold a form. Match the surface to the weight of what it holds.">
          <Grid columns={{ initial: "1", sm: "2" }} gap="3">
            <DoDont kind="do" bare note="On-demand content, controls, or a small form. It's click-opened and keyboard-reachable, so the panel can carry real interactive content — a field, an action, a Close.">
              <PanelMock>
                <Flex direction="column" gap="2">
                  <Text size="1" weight="bold" style={{ color: "var(--ds-text-strong)" }}>Share “Orbit”</Text>
                  {/* Only the PANEL needs to be a mock (Popover.Content is portaled — see PanelMock).
                      What it holds does not: TextField and Button are ordinary in-flow controls, and the
                      Share specimen above already renders these exact two. Painted stand-ins pinned a
                      26px height and font-size-1, so the panel's contents held one size while the live
                      Popover beside them stepped with the uiSize lane. */}
                  <Flex gap="2" align="center">
                    <Box style={{ flex: 1, minWidth: 0 }}>
                      {/* No placeholder: PanelMock pins width 232, and at the large tier a real
                          "name@company.com" clips mid-word inside it. The mock it replaces painted an
                          EMPTY box, so an empty field is the same picture — and the pinned 232 is the
                          thing to revisit (SharePopover above documents 320px as what this row needs). */}
                      <TextField aria-label="Invite by email" />
                    </Box>
                    <Button priority="primary" style={{ flexShrink: 0 }}>Send</Button>
                  </Flex>
                </Flex>
              </PanelMock>
            </DoDont>
            <DoDont kind="dont" bare note="Not for a terse label (that's a Tooltip — hover/focus text) and not for a set of commands (that's a DropdownMenu — role=menu items). The content's weight decides the surface.">
              <Flex direction="column" gap="3">
                <Flex align="center" gap="2">
                  {/* An inverted bubble has no fixed "inverse" colour PAIR in the token set — there is a
                      surface role but no matching text role. The system's mechanism for that is Contrast,
                      which nests a Theme at the OPPOSITE appearance so the ordinary --ds-* roles resolve
                      inverted and keep flipping with the mode; so this mock paints --ds-bg-base /
                      --ds-text-strong inside it, never a raw scale. The clip wrapper is load-bearing:
                      that nested Theme paints its own square background, which would otherwise square off
                      the bubble's corners. */}
                  <Box style={{ borderRadius: "var(--ds-radius-2)", overflow: "hidden" }}>
                    <Contrast>
                      <Box style={{ padding: "3px var(--space-2)", borderRadius: "var(--ds-radius-2)", background: "var(--ds-bg-base)", color: "var(--ds-text-strong)", fontSize: "var(--font-size-1)", whiteSpace: "nowrap" }}>Archive</Box>
                    </Contrast>
                  </Box>
                  <Text size="1" style={{ color: "var(--ds-text-weak)" }}>a one-word label → Tooltip</Text>
                </Flex>
                <Flex align="center" gap="2">
                  <PanelMock>
                    <Flex direction="column" gap="1">
                      {["Edit", "Duplicate", "Delete"].map((c) => (
                        <Text key={c} size="1" style={{ color: "var(--ds-text-strong)", padding: "var(--space-1) var(--space-2)" }}>{c}</Text>
                      ))}
                    </Flex>
                  </PanelMock>
                  <Text size="1" style={{ color: "var(--ds-text-weak)" }}>a command list → DropdownMenu</Text>
                </Flex>
              </Flex>
            </DoDont>
          </Grid>
        </Section>
        <Rule />
        <Section title="Tokens" lead="Read live from the reused skin token — the drift guard. Popover reuses Radix's solid panel skin, so it owns no --ds-* roles; the spec documents what that skin resolves to in the running theme.">
          <PanelSkinSpec />
        </Section>
      </Page>
    </HexThemeKey.Provider>
  ),
  // The only play here is PASSIVE: viewing this story must not open/close the visible panel (the
  // flicker). The open · focus · popper-motion · Escape behaviour lives in _internal/Popover behavior.
  play: async ({ canvasElement }) => {
    // The token table's EVIDENCE, asserted at runtime ([[measured-token-rows]]) — the panel is portaled into the
    // measurement host, so this proves the row read a REAL mounted panel and not a probe.
    const rows = assertMeasuredRows(canvasElement);
    if (rows.measured !== 2 || rows.unproven !== 0) {
      throw new Error(`expected 2 measured / 0 unproven token rows, got ${rows.measured} / ${rows.unproven}`);
    }
  },
};

type PropsArgs = { size: "auto" | "1" | "2" | "3" | "4"; maxWidth: string; width: string };

/** Props — drive the Content size, maxWidth, and width; open the live panel. Full axe. */
export const Props: StoryObj<PropsArgs> = {
  // "auto" (size unset) is the default so the panel tracks the global uiSize toolbar out of the box.
  args: { size: "auto", maxWidth: "320px", width: "" },
  argTypes: {
    size: { control: "inline-radio", options: ["auto", "1", "2", "3", "4"], description: '"auto" tracks the global uiSize toolbar (unset → the control lane); a step (1–4) pins the panel padding + radius.', table: { category: "Variant" } },
    maxWidth: { control: "text", description: "Cap the panel width (e.g. \"320px\"). The content wraps within it.", table: { category: "Size" } },
    width: { control: "text", description: "Pin a fixed panel width (e.g. \"360px\"). Empty → content-sized.", table: { category: "Size" } },
  },
  parameters: { controls: { disable: false } },
  render: ({ size, maxWidth, width }: PropsArgs) => (
    <Page maxWidth="none">
      <PageHeader title="Popover · Props" standfirst={DEFINITION} />
      <Box style={{ padding: "8px 0 2px" }}>
        <Popover.Root>
          <Popover.Trigger>
            <Button priority="secondary"><ShareNetwork weight="bold" /> Open popover</Button>
          </Popover.Trigger>
          <Popover.Content size={size === "auto" ? undefined : size} maxWidth={maxWidth || undefined} width={width || undefined} aria-label="Example popover">
            <Flex direction="column" gap="2">
              <Text size="2" weight="bold" style={{ color: "var(--ds-text-strong)" }}>Panel content</Text>
              <Text size="1" style={{ color: "var(--ds-text-weak)" }}>
                Any content lives here — text, controls, or a small form. Tab through it; Escape closes and
                returns focus to the trigger.
              </Text>
              <Box mt="1"><TextField label="Example field" placeholder="A focusable field" /></Box>
            </Flex>
          </Popover.Content>
        </Popover.Root>
      </Box>
      <PropsLead />
      <Rule />
      <Section title="Props reference" lead={<>Every prop <Code>Popover</Code> adds or forwards.</>}>
        <PropTable rows={PROPS} />
      </Section>
    </Page>
  ),
};

// A tiny inline Kbd for the standfirst (the shared kit Kbd is for key tables).
function Kbd({ children }: { children: ReactNode }) {
  return <Code variant="soft">{children}</Code>;
}

/** History — the rulings this component encodes. */
export const History: Story = {
  render: () => (
    <Page>
      <PageHeader title="Popover · History" standfirst={DEFINITION} />
      <Section title="Decisions" lead="The rulings this component encodes.">
        <Flex direction="column" gap="3">
          <Decision id="[[catalog-as-specification]] · Wrapped Radix component">A wrapped Radix Themes component — the Radix name wins; built on the Radix Popover substrate + our <Code>--ds-*</Code> layer, not a from-scratch floating panel. Radix already portals, positions, dismisses, and returns focus.</Decision>
          <Decision id="[[floating-surface-fill]] · Opaque panel skin">Content reuses Radix's own opaque, elevated panel skin (<Code>--color-panel-solid</Code> + an elevation shadow) — no translucent variant is exposed (the floating-surface opacity rule). The wrap declares no <Code>--ds-*</Code> paint roles.</Decision>
          <Decision id="[[collapsible-and-accordion]] · Inherited popper motion">Motion is inherited, not declared: the panel carries the shared <Code>.rt-PopperContent</Code> base class, retimed to <Code>--ds-duration-overlay</Code> (150ms) / <Code>--ds-ease-entry</Code> in and the <strong>slower</strong> <Code>--ds-duration-emphasis</Code> (260ms) / <Code>--ds-ease-standard</Code> out — floating surfaces arrive quickly and leave unhurriedly, so a panel you have finished with eases off instead of being yanked away. Same motion as every other floating surface; the wrap adds zero motion CSS, and reduced motion collapses it for free.</Decision>
          <Decision id="uiSize · R10 · Global control lane">Content <Code>size</Code> follows the global control lane (our small default) unless set.</Decision>
        </Flex>
      </Section>
      <Rule />
      <Section title="Changelog" lead="Newest first.">
        <Decision id="0.9.0">Initial <Code>System/Popover</Code> — the click-opened floating panel for on-demand content and small forms; skin + popper motion inherited; lite spine.</Decision>
      </Section>
    </Page>
  ),
};
