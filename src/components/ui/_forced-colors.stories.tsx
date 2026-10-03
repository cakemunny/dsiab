import type { Meta, StoryObj } from "@storybook/react-vite";
import { Box, Flex } from "@radix-ui/themes";
import { Plus } from "@phosphor-icons/react";
import { Button } from "./Button";
import { IconButton } from "./IconButton";
import { TextField } from "./TextField";
import { TextArea } from "./TextArea";
import { Select } from "./Select";
import { Checkbox } from "./Checkbox";
import { RadioGroup } from "./RadioGroup";
import { Switch } from "./Switch";
import { Tabs } from "./Tabs";
import { Callout } from "./Callout";
import { Pagination } from "./Pagination";
import { Token } from "./Token";
import { contrastRatio, flatten, parseColor, type RGBA } from "../../foundations/_assert";

/* Test-only guard for src/tokens/forced-colors.css (Windows contrast themes). Underscore-prefixed, so
   it is registry- and story-order-guard-exempt and grouped under _internal.

   THIS IS THE LIVE ARM, NOT A DECLARED ONE. The play turns forced colours ON through the Chrome
   DevTools protocol (`Emulation.setEmulatedMedia`, reached through Vitest Browser Mode's `cdp()`), in
   both the light and the dark system palette, and reads the forced paint back off the rendered
   controls. Under forcing, getComputedStyle reports the used colours, so every number below is what
   the browser paints: box-shadow computes to none, author colours become system colours, and only
   the rules in forced-colors.css put an edge or a state mark back.

   What it asserts, per palette:
   - every control edge is a solid line of at least 1px at 3:1 or more against Canvas (WCAG 1.4.11)
   - checked, on and selected states paint a fill at 3:1 against Canvas with a mark at 3:1 against
     that fill, and the unchecked, off and unselected states do not
   - the keyboard focus ring survives at 3:1 against Canvas
   - every Pagination dot keeps its 1px ring, and the current dot is a wider pill filled at 3:1
     against Canvas while the other dots stay unfilled ([[neutral-part-stacks]])
   - a Token toggle keeps its 1px edge at rest and pressed, and a pressed Token paints a fill at 3:1
     against Canvas with its label and check at 3:1 against that fill ([[token-pressed-state]])

   Outside Vitest (Storybook's own UI) there is no CDP handle, so the play reports that and stops.

   HOW THE EMULATION STAYS INSIDE THIS TEST. Emulation lives on the browser page, and Vitest runs the
   next story file on the same page, so emulation left on colours whatever runs next. Measured with the
   old play held after it turned emulation on: the play timed out, and Foundations/Colors, run next on
   that page, read --ds-text-strong on --ds-bg-base at 1.00:1. Three things stop that.
   - Vitest's onTestFinished hook turns it off. That hook runs when the test passes, throws or times
     out. A finally block is not enough, because a play that times out is still stuck when the next
     file starts.
   - Once the test ends, the play cannot turn it back on, so a play still running after a timeout
     cannot undo that reset.
   - The play turns it off before it measures, so an earlier leak cannot colour this measurement.

   WHY THE PLAY ASKS THE PAGE, NOT DEVTOOLS. In a full run the browser's DevTools pipe carries hundreds
   of megabytes of network events, and a DevTools reply reached Vitest 5 to 25 seconds after the
   request. The first reply opens the DevTools session, and before this change the play spent its
   whole 15 second budget waiting for it, while the measuring itself takes under 100 ms. So the session
   opens while this file imports, where no test clock runs, and after that the play sends each change
   and waits for matchMedia in the page to show it, never for the reply. */

type Cdp = { send: (method: string, params?: object) => Promise<unknown> };
type Harness = { cdp: Cdp; onTestFinished: (fn: () => Promise<void>) => void };
type Palette = "light" | "dark";

/** Vitest Browser Mode's DevTools handle and its end-of-test hook, or null anywhere else. */
async function vitestHarness(): Promise<Harness | null> {
  try {
    // Dynamic by necessity: `vitest/browser` exists only inside Vitest Browser Mode and throws on import
    // anywhere else, including Storybook's own UI where this story also runs, so `vitest` is only ever
    // reached inside a Vitest run.
    const { cdp } = await import("vitest/browser");
    const { onTestFinished } = await import("vitest");
    return { cdp: cdp() as unknown as Cdp, onTestFinished };
  } catch {
    return null;
  }
}

/* What "off" restores: the page's own media, read before this file changes anything. Vitest's
   Playwright provider opens each page with its own prefers-color-scheme override (light). DevTools
   holds one override per feature for the whole page, so clearing a feature this file set drops the
   provider's value as well, and the page falls through to the operating system. Measured here on a
   Mac in dark mode: the page read light before the play and dark after a clear. So "off" writes the
   page's own values back instead of clearing them. A page Vitest opens never forces colours, so
   forced-colors goes back to none even when an earlier leak left it on. */
const PAGE_SCHEME: Palette = matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
const PAGE_MEDIA = [
  { name: "forced-colors", value: "none" },
  { name: "prefers-color-scheme", value: PAGE_SCHEME },
];
const FORCED = "(forced-colors: active)";
/** How long the page may take to show a change. A change took 10 to 20 ms under a full run. */
const SETTLE_MS = 4000;

/* Top-level await on purpose. The first DevTools call opens the session, and under a full run its
   reply alone can outlast the test budget (WHY THE PLAY ASKS THE PAGE). Import time runs on no test
   clock. The same call puts back the page's own media if an earlier file left emulation on. */
const harness = await vitestHarness();
if (harness) await harness.cdp.send("Emulation.setEmulatedMedia", { features: PAGE_MEDIA });

/** Forced colours for the running test only (HOW THE EMULATION STAYS INSIDE THIS TEST). */
function forcedColours({ cdp, onTestFinished }: Harness) {
  let ended = false;
  let refused: unknown = null;
  const send = (features: { name: string; value: string }[]) => {
    cdp.send("Emulation.setEmulatedMedia", { features }).catch((error: unknown) => {
      refused = error;
    });
  };
  const pageShows = async (what: string, done: () => boolean) => {
    const start = performance.now();
    while (!done()) {
      if (refused) throw new Error(`_forced-colors: DevTools refused ${what}: ${String(refused)}`);
      if (performance.now() - start > SETTLE_MS) {
        throw new Error(`_forced-colors: ${what} did not reach the page within ${SETTLE_MS}ms, so nothing here was measured`);
      }
      await new Promise((settle) => setTimeout(settle, 10));
    }
  };
  const off = async () => {
    send(PAGE_MEDIA);
    await pageShows("restoring the page's own media", () => !matchMedia(FORCED).matches && matchMedia(`(prefers-color-scheme: ${PAGE_SCHEME})`).matches);
  };
  onTestFinished(async () => {
    ended = true;
    await off();
  });
  const on = async (palette: Palette) => {
    if (ended) throw new Error("_forced-colors: the test already ended, so emulation stays off");
    send([
      { name: "forced-colors", value: "active" },
      { name: "prefers-color-scheme", value: palette },
    ]);
    await pageShows(`forced colours in the ${palette} palette`, () => matchMedia(FORCED).matches && matchMedia(`(prefers-color-scheme: ${palette})`).matches);
  };
  return { on, off };
}

function Sheet() {
  return (
    <Flex direction="column" gap="4" p="5" data-fc-sheet="">
      <Flex gap="3" align="center" wrap="wrap">
        <Button priority="primary" data-fc="primary">Primary</Button>
        <Button priority="secondary" data-fc="secondary">Secondary</Button>
        <Button priority="secondary" disabled data-fc="disabled">Disabled</Button>
        <IconButton priority="secondary" aria-label="Add item" data-fc="icon"><Plus weight="bold" /></IconButton>
      </Flex>
      <Flex gap="3" align="start" wrap="wrap">
        <Box width="220px" data-fc="field"><TextField label="Email" defaultValue="ada@example.com" /></Box>
        <Box width="220px" data-fc="field-error">
          <TextField label="Username" defaultValue="ADMIN" validation={{ tone: "error", message: "Reserved word." }} />
        </Box>
        <Box width="220px" data-fc="area"><TextArea label="Notes" defaultValue="Two lines of text." /></Box>
        <Box width="220px" data-fc="select">
          <Select.Root defaultValue="pro" label="Plan">
            <Select.Trigger />
            <Select.Content>
              <Select.Item value="free">Free</Select.Item>
              <Select.Item value="pro">Pro</Select.Item>
            </Select.Content>
          </Select.Root>
        </Box>
      </Flex>
      <Flex gap="4" align="center" wrap="wrap">
        <Checkbox aria-label="Unchecked" data-fc="cb-off" />
        <Checkbox aria-label="Checked" defaultChecked data-fc="cb-on" />
        <Checkbox aria-label="Mixed" checked="indeterminate" onCheckedChange={() => {}} data-fc="cb-mixed" />
        <Checkbox aria-label="Disabled" disabled data-fc="cb-disabled" />
        <Switch aria-label="Off" data-fc="sw-off" />
        <Switch aria-label="On" defaultChecked data-fc="sw-on" />
        <Switch aria-label="Disabled" disabled data-fc="sw-disabled" />
      </Flex>
      <Flex gap="3" align="center" wrap="wrap" role="group" aria-label="Filter issues">
        <Token onClick={() => {}} pressed onRemove={() => {}} data-fc="tk-on">Bug</Token>
        <Token onClick={() => {}} pressed={false} data-fc="tk-off">Docs</Token>
      </Flex>
      <Box data-fc="radios">
        <RadioGroup defaultValue="pro" aria-label="Plan">
          <RadioGroup.Item value="free">Free</RadioGroup.Item>
          <RadioGroup.Item value="pro">Pro</RadioGroup.Item>
        </RadioGroup>
      </Box>
      <Box data-fc="tabs">
        <Tabs.Root defaultValue="a">
          <Tabs.List aria-label="Sections">
            <Tabs.Trigger value="a">Overview</Tabs.Trigger>
            <Tabs.Trigger value="b">Activity</Tabs.Trigger>
          </Tabs.List>
          <Tabs.Content value="a">Overview panel</Tabs.Content>
          <Tabs.Content value="b">Activity panel</Tabs.Content>
        </Tabs.Root>
      </Box>
      <Box width="420px" data-fc="callout">
        <Callout title="Scheduled maintenance">The dashboard is read-only on Sunday.</Callout>
      </Box>
      <Box data-fc="dots">
        <Pagination variant="dots" page={2} onChange={() => {}} totalPages={5} label="Slides" />
      </Box>
    </Flex>
  );
}

const meta: Meta = {
  title: "_internal/Forced colors",
  parameters: { controls: { disable: true } },
};
export default meta;
type Story = StoryObj;

/** The palette the browser forces, read back as sRGB. */
function systemColour(host: Element, keyword: string): RGBA {
  const probe = document.createElement("span");
  probe.style.color = keyword;
  host.appendChild(probe);
  const c = getComputedStyle(probe).color;
  probe.remove();
  return parseColor(c);
}

const ratio = (fg: RGBA, bg: RGBA) => +contrastRatio(fg, bg).toFixed(2);

/** Every edge measured under forced colours, with the rule that owns it. */
export const EdgesAndStates: Story = {
  render: () => <Sheet />,
  play: async ({ canvasElement }) => {
    if (!harness) {
      console.info("_forced-colors: no DevTools handle outside Vitest Browser Mode, so nothing was measured.");
      return;
    }
    const emulation = forcedColours(harness);
    await emulation.off();
    const sheet = canvasElement.querySelector<HTMLElement>("[data-fc-sheet]")!;
    const q = (sel: string) => {
      const el = sheet.querySelector<HTMLElement>(sel);
      if (!el) throw new Error(`_forced-colors: fixture node ${sel} did not render`);
      return el;
    };
    const failures: string[] = [];

    try {
      for (const palette of ["light", "dark"] as const) {
        await emulation.on(palette);
        // Switching palettes restyles every control, and the Switch track and thumb transition their
        // colours (--ds-duration-micro). Read the settled paint, not the first frame of a transition.
        for (const a of document.getAnimations()) a.finish();
        const canvas = systemColour(sheet, "Canvas");
        const fail = (what: string) => failures.push(`[${palette}] ${what}`);

        // EDGES. Each is a solid line of 1px or more at 3:1 against Canvas on all four sides.
        const edge = (label: string, el: Element, pseudo: string | null, owner: string) => {
          const cs = getComputedStyle(el, pseudo);
          for (const side of ["Top", "Right", "Bottom", "Left"] as const) {
            const width = parseFloat(cs.getPropertyValue(`border-${side.toLowerCase()}-width`));
            const style = cs.getPropertyValue(`border-${side.toLowerCase()}-style`);
            const colour = parseColor(cs.getPropertyValue(`border-${side.toLowerCase()}-color`));
            const r = ratio(colour, canvas);
            if (!(width >= 1) || style !== "solid" || r < 3) {
              fail(`${label}: ${side.toLowerCase()} edge is ${width}px ${style} at ${r}:1 against Canvas, needs 1px solid at 3:1 (${owner})`);
              return;
            }
          }
        };
        const BOXED = "forced-colors.css layer 2, the inset ::after edge";
        for (const k of ["primary", "secondary", "disabled", "icon"]) edge(`Button ${k}`, q(`[data-fc="${k}"]`), "::after", BOXED);
        edge("Select trigger", q('[data-fc="select"] .rt-SelectTrigger'), "::after", BOXED);
        edge("Callout", q('[data-fc="callout"] .rt-CalloutRoot'), "::after", BOXED);
        const FIELD = "forced-colors.css layer 2, the field border";
        edge("TextField at rest", q('[data-fc="field"] .rt-TextFieldRoot'), null, FIELD);
        edge("TextField in error", q('[data-fc="field-error"] .rt-TextFieldRoot'), null, FIELD);
        edge("TextArea", q('[data-fc="area"] .rt-TextAreaRoot'), null, FIELD);
        const TOGGLE = "forced-colors.css layer 2, the toggle ::before border";
        for (const k of ["cb-off", "cb-on", "cb-mixed", "cb-disabled", "sw-off", "sw-on", "sw-disabled"]) edge(k, q(`[data-fc="${k}"]`), "::before", TOGGLE);
        sheet.querySelectorAll('[data-fc="radios"] [role="radio"]').forEach((r, i) => edge(`radio ${i + 1}`, r, "::before", TOGGLE));

        // STATES. A checked, on or selected control paints a fill at 3:1 on Canvas and a mark at 3:1
        // on that fill. Its unchecked twin paints neither.
        const MARKS = "forced-colors.css layer 3";
        const fillOf = (el: Element, pseudo: string | null) =>
          flatten(parseColor(getComputedStyle(el, pseudo).backgroundColor), canvas);
        const onFill = (label: string, fill: RGBA) => {
          const r = ratio(fill, canvas);
          if (r < 3) fail(`${label}: state fill is ${r}:1 against Canvas, needs 3:1 (${MARKS})`);
        };
        const offFill = (label: string, fill: RGBA) => {
          const r = ratio(fill, canvas);
          if (r >= 1.5) fail(`${label}: the OFF state paints a fill at ${r}:1, so it no longer differs from ON`);
        };
        const mark = (label: string, colour: RGBA, fill: RGBA) => {
          const r = ratio(colour, fill);
          if (r < 3) fail(`${label}: mark is ${r}:1 against its fill, needs 3:1 (${MARKS})`);
        };

        for (const k of ["cb-on", "cb-mixed"]) {
          const box = q(`[data-fc="${k}"]`);
          const fill = fillOf(box, "::before");
          onFill(k, fill);
          const glyph = box.querySelector(".rt-BaseCheckboxIndicator");
          if (!glyph) fail(`${k}: no indicator glyph rendered`);
          else mark(`${k} glyph`, parseColor(getComputedStyle(glyph).color), fill);
        }
        offFill("cb-off", fillOf(q('[data-fc="cb-off"]'), "::before"));

        const radios = [...sheet.querySelectorAll('[data-fc="radios"] [role="radio"]')];
        const radioOn = radios.find((r) => r.getAttribute("data-state") === "checked")!;
        const radioOff = radios.find((r) => r.getAttribute("data-state") === "unchecked" && !r.hasAttribute("data-disabled"))!;
        const radioFill = fillOf(radioOn, "::before");
        onFill("radio checked", radioFill);
        if (getComputedStyle(radioOn, "::after").content === "none") fail("radio checked: no dot rendered");
        else mark("radio dot", parseColor(getComputedStyle(radioOn, "::after").backgroundColor), radioFill);
        offFill("radio unchecked", fillOf(radioOff, "::before"));

        const swOn = q('[data-fc="sw-on"]');
        const swOff = q('[data-fc="sw-off"]');
        const trackOn = fillOf(swOn, "::before");
        onFill("switch on", trackOn);
        mark("switch on thumb", parseColor(getComputedStyle(swOn.querySelector(".rt-SwitchThumb")!).backgroundColor), trackOn);
        offFill("switch off", fillOf(swOff, "::before"));
        mark("switch off thumb", parseColor(getComputedStyle(swOff.querySelector(".rt-SwitchThumb")!).backgroundColor), canvas);

        const tabs = [...sheet.querySelectorAll('[data-fc="tabs"] [role="tab"]')];
        const active = tabs.find((t) => t.getAttribute("data-state") === "active")!;
        const inactive = tabs.find((t) => t.getAttribute("data-state") === "inactive")!;
        onFill("selected tab bar", fillOf(active, "::before"));
        if (getComputedStyle(inactive, "::before").content !== "none") fail("an unselected tab paints the selection bar");

        // [[token-pressed-state]]. A Token toggle draws its edge with the surface box-shadow, so forced-colors.css
        // gives it an inset ::after edge at rest and pressed, and the pressed chip a Highlight fill under HighlightText.
        const tkOn = q('[data-fc="tk-on"]');
        const tkOff = q('[data-fc="tk-off"]');
        const TOKEN = "forced-colors.css layer 2, the Token toggle ::after edge";
        edge("Token toggle at rest", tkOff, "::after", TOKEN);
        edge("Token toggle pressed", tkOn, "::after", TOKEN);
        const tkFill = fillOf(tkOn, null);
        onFill("pressed Token", tkFill);
        const tkBody = tkOn.querySelector<HTMLElement>(".rt-ds-token-body")!;
        mark("pressed Token label", parseColor(getComputedStyle(tkBody).color), tkFill);
        // Chromium paints a Canvas backplate behind text whose forced-color-adjust is auto, and the colour
        // read above never shows it: measured, the HighlightText label sat on that backplate, white on white.
        const adjust = getComputedStyle(tkBody).getPropertyValue("forced-color-adjust");
        if (adjust !== "none") fail(`pressed Token label: forced-color-adjust is ${adjust}, so the browser paints a Canvas backplate over the Highlight fill behind it`);
        const tkRemove = tkOn.querySelector(".rt-IconButton");
        if (!tkRemove) fail("pressed Token: no remove ✕ rendered");
        else mark("pressed Token ✕", parseColor(getComputedStyle(tkRemove).color), tkFill);
        offFill("Token toggle at rest", fillOf(tkOff, null));

        // [[neutral-part-stacks]]. The dots draw their rest ring as an inset box-shadow, which forcing computes to none, so
        // forced-colors.css gives every dot a border and the current one a Highlight fill.
        const dots = [...sheet.querySelectorAll<HTMLElement>('[data-fc="dots"] .rt-ds-pagination__dot')];
        const pill = dots.filter((d) => d.getAttribute("aria-current") === "page");
        if (dots.length !== 5 || pill.length !== 1) {
          fail(`Pagination dots: expected 5 dots with one current, found ${dots.length} with ${pill.length} current`);
        } else {
          const DOTS = "forced-colors.css layer 2, the Pagination dot border";
          dots.forEach((d, i) => edge(`Pagination dot ${i + 1}`, d, null, DOTS));
          onFill("current Pagination dot", fillOf(pill[0], null));
          const pillWidth = pill[0].getBoundingClientRect().width;
          for (const d of dots) {
            if (d === pill[0]) continue;
            offFill("Pagination dot", fillOf(d, null));
            const w = d.getBoundingClientRect().width;
            if (!(pillWidth > w)) fail(`the current Pagination dot is ${pillWidth}px wide, not wider than a ${w}px dot ([[neutral-part-stacks]])`);
          }
        }

        // FOCUS. The ring is an outline, which forcing keeps. It must stay at 3:1 on Canvas.
        const ring = (label: string, target: HTMLElement, ringEl: Element, pseudo: string | null) => {
          target.focus({ focusVisible: true } as FocusOptions);
          const cs = getComputedStyle(ringEl, pseudo);
          const width = parseFloat(cs.outlineWidth);
          const r = ratio(parseColor(cs.outlineColor), canvas);
          if (cs.outlineStyle === "none" || !(width >= 1) || r < 3) {
            fail(`${label}: focus ring is ${cs.outlineWidth} ${cs.outlineStyle} at ${r}:1 against Canvas, needs 1px at 3:1`);
          }
          target.blur();
        };
        ring("Button focus", q('[data-fc="secondary"]'), q('[data-fc="secondary"]'), null);
        ring("TextField focus", q('[data-fc="field"] input'), q('[data-fc="field"] .rt-TextFieldRoot'), null);
        ring("Checkbox focus", q('[data-fc="cb-off"]'), q('[data-fc="cb-off"]'), "::before");
      }
    } finally {
      // axe runs next, on the page as a reader sees it, so the emulation goes off here too.
      await emulation.off();
    }

    if (failures.length) {
      throw new Error(
        "Under Windows forced colours a control lost its edge or its state (GUIDELINES §9, WCAG 1.4.11):\n" +
          failures.join("\n"),
      );
    }
  },
};
