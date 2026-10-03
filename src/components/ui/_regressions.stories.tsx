import type { Meta, StoryObj } from "@storybook/react-vite";
import { Box, Flex } from "@radix-ui/themes";
import { MagnifyingGlass, Tray } from "@phosphor-icons/react";
import { AppShell } from "./AppShell";
import { Avatar } from "./Avatar";
import { AvatarGroup } from "./AvatarGroup";
import { Card } from "./Card";
import { ChatToolCalls } from "./ChatToolCalls";
import { DataList } from "./DataList";
import { EmptyState } from "./EmptyState";
import { Kbd } from "./Kbd";
import { Layout } from "./Layout";
import { ScrollArea } from "./ScrollArea";
import { Select } from "./Select";
import { Text } from "./Text";
import { TreeList } from "./TreeList";
import { SizeContext } from "../../theme/SizeContext";

/* =============================================================================
   _regressions.stories.tsx — ONE SPECIMEN PER FIXED DEFECT
   -----------------------------------------------------------------------------
   WHY THIS EXISTS. Seven component defects were found in three days by building
   showcase recreations and then sweeping them: [[seam-ownership]] doubled seams, [[select-affix-width]] a Select
   that swallowed any flex row, [[empty-state-size]] an EmptyState title that outranked the
   heading above it, [[app-shell-gutter]] an AppShell gutter with no escape, [[scroll-area-box-sizing]] a padded
   ScrollArea that ignored its own width, [[kbd-default-variant]] a Kbd wearing Radix's raised
   keycap, [[avatar-shape-perceptibility]] an avatar disc invisible against the page.

   Every one was fixed in the component. NONE of them had a guard, and four
   consecutive rulings say "mechanism gap" in their own text. That is the debt
   this file pays off. The repo's law is law → mechanism → guard; a fix with no
   guard is two thirds of the job, and the defect that returns is the one nobody
   is watching for.

   WHAT EACH ARM ASSERTS, and why it is the RIGHT assertion:

   Each arm measures the OBSERVABLE property the ruling promised a consumer, not
   the CSS declaration that currently delivers it. [[scroll-area-box-sizing]] asserts "a padded
   ScrollArea is as wide as its parent", never "box-sizing is border-box" —
   because the second passes happily if someone reaches the right value by a
   route the ruling did not intend, and fails spuriously if someone reaches the
   same outcome a better way. Every number here was measured in Chrome before it
   was written down, and each arm names the ruling it defends so a red run sends
   the reader to the reasoning rather than to a bare number.

   THIS IS NOT A DOCS PAGE. `_internal/*` is exempt from the story-order gate and
   from box-law layer 2, and the meta scopes axe off: these are bare specimens
   mounted to be measured, several deliberately in contexts (a 900px flex row, a
   264px column) that exist to reproduce a defect rather than to model good use.
   ============================================================================= */

const meta: Meta = {
  title: "_internal/Regressions",
  parameters: { a11y: { test: "off" } },
};
export default meta;
type Story = StoryObj;

/** A fallback font has wider metrics than Inter, so a width read taken mid-swap measures a box that
 *  is still laying out. Same helper as `_control-box.stories.tsx`, same reason. */
async function settle(): Promise<void> {
  await document.fonts.ready;
  const { promise, resolve } = Promise.withResolvers<void>();
  setTimeout(resolve, 200);
  await promise;
}

const px = (el: Element, prop: "width" | "height") =>
  Math.round(el.getBoundingClientRect()[prop]);

/** Composite an `rgba()` over an opaque backdrop and return the WCAG ratio. A token like
 *  `--ds-stroke-strong` is `gray-a8`, so rastering it opaque overstates its contrast by an order of
 *  magnitude — that mistake was made once while measuring [[avatar-shape-perceptibility]] and is not repeated here. */
function contrastOver(fg: string, bg: string): number {
  const parse = (c: string) => {
    const m = (c.match(/[\d.]+/g) ?? []).map(Number);
    return { r: m[0] ?? 0, g: m[1] ?? 0, b: m[2] ?? 0, a: m.length > 3 ? (m[3] ?? 1) : 1 };
  };
  const f = parse(fg);
  const b = parse(bg);
  const comp = [f.a * f.r + (1 - f.a) * b.r, f.a * f.g + (1 - f.a) * b.g, f.a * f.b + (1 - f.a) * b.b];
  const lum = (c: number[]) => {
    const ch = c.map((v) => {
      const s = v / 255;
      return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
    });
    return 0.2126 * ch[0] + 0.7152 * ch[1] + 0.0722 * ch[2];
  };
  const [hi, lo] = [lum(comp), lum([b.r, b.g, b.b])].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

export const Regressions: Story = {
  render: () => (
    <Flex direction="column" gap="5" p="4">
      {/* [[select-affix-width]] — a Select with a leading icon, in a flex ROW. The defect: the affix wrapper declared
          width:100%, which in a row resolves against the row and the select swallowed it. */}
      <Flex data-rx="select-affix-width-row" align="center" gap="3" style={{ width: 900 }}>
        <Select.Root defaultValue="all">
          <Select.Trigger data-rx="select-affix-width-select" icon={<MagnifyingGlass />} aria-label="Scope" />
          <Select.Content>
            <Select.Item value="all">All environments</Select.Item>
            <Select.Item value="prod">Production</Select.Item>
          </Select.Content>
        </Select.Root>
        <Text size="2">sits beside the select</Text>
      </Flex>

      {/* [[empty-state-size]] — the size ladder. Step 3 is the shipped default and must not move. */}
      <Flex gap="4" align="start">
        {(["1", "2", "3"] as const).map((s) => (
          <Box key={s} data-rx={`empty-state-size-${s}`} style={{ width: 240 }}>
            <EmptyState size={s} icon={<Tray />} title="Nothing here yet" headingAs="h3" />
          </Box>
        ))}
      </Flex>

      {/* [[scroll-area-box-sizing]] — a PADDED ScrollArea inside a known-width parent. */}
      <Box data-rx="scroll-area-box-sizing-parent" style={{ width: 300 }}>
        <ScrollArea data-rx="scroll-area-box-sizing-scroll" style={{ width: "100%", padding: 12 }}>
          <Text size="2">padded scroll body</Text>
        </ScrollArea>
      </Box>

      {/* [[kbd-default-variant]] — the default Kbd must be the FLAT key. */}
      <Flex gap="3" align="center">
        <Kbd data-rx="kbd-default-variant-default">Tab</Kbd>
        <Kbd data-rx="kbd-default-variant-classic" variant="classic">Tab</Kbd>
      </Flex>

      {/* [[avatar-shape-perceptibility]] — the avatar disc needs a perceptible edge. */}
      <Box data-rx="avatar-shape-perceptibility-host">
        <Avatar size="sm" fallback="RM" />
      </Box>

      {/* [[panel-background]] — a panel, to assert its fill is opaque. */}
      <Card data-rx="panel-background-card">
        <Text size="2">a panel nothing scrolls through</Text>
      </Card>

      {/* [[avatar-group-overlap]] — two-letter initials, which is the case the overlap has to clear. */}
      <AvatarGroup data-rx="avatar-group-overlap-group" label="Four people">
        <Avatar fallback="RK" />
        <Avatar fallback="DM" />
        <Avatar fallback="SO" />
      </AvatarGroup>

      {/* [[seam-ownership]] — an END-docked resizable panel. Its ResizeHandle IS the seam, so Layout must not also
          draw its divider on that boundary. The original bug only appeared on this side. */}
      <Box style={{ height: 160 }}>
        <Layout data-rx="seam-ownership-layout" defaultHasDividers style={{ height: "100%" }}>
          <Layout.Content>
            <Text size="2">content</Text>
          </Layout.Content>
          <Layout.Panel resizable side="end" style={{ width: 160 }}>
            <Text size="2">inspector</Text>
          </Layout.Panel>
        </Layout>
      </Box>

      {/* [[app-shell-gutter]] — the shell gutter must be configurable, and default to the 24px that already shipped. */}
      <Box style={{ height: 120 }}>
        <AppShell data-rx="app-shell-gutter-default">
          <Text size="2">default gutter</Text>
        </AppShell>
      </Box>
      <Box style={{ height: 120 }}>
        <AppShell data-rx="app-shell-gutter-flush" gutter="0">
          <Text size="2">flush</Text>
        </AppShell>
      </Box>

      {/* [[status-glyph-line-box]] — an error row is the case that goes start-aligned, which is where the glyph drifted
          off its own line.

          PINNED TO `large` ON PURPOSE. The suite renders at `small`, and at `small` a 16px glyph
          and a 16px line box agree BY COINCIDENCE, so the arm measured 0px and stayed green with
          the fix reverted. A guard that only passes is not a guard. The divergence is a function of
          the tier (0 / -2 / -3.5px at small / medium / large), so the fixture has to stand where
          the geometry actually differs. `SizeContext` rather than a nested `Provider`: the tier is
          all this needs, and nesting a second theme root to get it would change what is measured. */}
      <SizeContext.Provider value="large">
        <Box data-rx="status-glyph-line-box-host" style={{ width: 460 }}>
          <ChatToolCalls
            calls={[
              {
                name: "write_theme",
                target: "src/tokens/theme.css",
                status: "error",
                errorMessage: "Permission denied. The file is read-only in this sandbox.",
              },
            ]}
          />
        </Box>
      </SizeContext.Provider>

      {/* [[select-anchoring]] — the listbox must anchor UNDER its trigger and never come out narrower. Opened in
          play, because the panel does not exist until it is.

          THE TRIGGER IS DELIBERATELY WIDE AND THE OPTIONS DELIBERATELY SHORT. With a content-sized
          trigger the panel is naturally the wider of the two, so the width floor never bears any
          load and the arm stayed green with `min-width` deleted. This is the shape of the defect
          actually hit in review: a 190px filter control over a 170px panel. */}
      <Box data-rx="select-anchoring-host" style={{ width: 260 }}>
        <Select.Root defaultValue="a">
          <Select.Trigger data-rx="select-anchoring-trigger" aria-label="Environment" style={{ width: "100%" }} />
          <Select.Content>
            <Select.Item value="a">A</Select.Item>
            <Select.Item value="b">B</Select.Item>
          </Select.Content>
        </Select.Root>
      </Box>

      {/* [[data-list-overflow]] — ONE list, ONE overflow behaviour. Two values of very different length in a column
          too narrow for either: under the declared policy both must resolve the same way, which is
          the whole of the ruling. The defect was a list where one value wrapped and another
          ellipsised with nothing deciding which. */}
      <Box data-rx="data-list-overflow-host" style={{ width: 230 }}>
        <DataList.Root overflow="truncate">
          <DataList.Item>
            <DataList.Label>Model</DataList.Label>
            <DataList.Value data-rx="data-list-overflow-short">orion-3.5-large</DataList.Value>
          </DataList.Item>
          <DataList.Item>
            <DataList.Label>Branch</DataList.Label>
            <DataList.Value data-rx="data-list-overflow-long">agent/billing-sdk-migration-2026</DataList.Value>
          </DataList.Item>
        </DataList.Root>
      </Box>

      {/* [[truncating-label-width]] — a NARROW rail, which is the only place this defect exists. The label is far longer
          than the container and the row carries a trailing status marker. Two things must hold:
          the row shrinks to the rail so the label's ellipsis fires, and the one-character marker
          survives, because a status glyph must never be what the clipping eats. */}
      <Box data-rx="truncating-label-width-host" style={{ width: 150, overflow: "hidden" }}>
        <TreeList
          items={[
            {
              id: "truncating-label-width",
              label: "a-very-long-file-name-that-cannot-possibly-fit.ts",
              endContent: <span data-rx="truncating-label-width-mark">M</span>,
            },
          ]}
        />
      </Box>
    </Flex>
  ),

  play: async ({ canvasElement }) => {
    await settle();
    const fail: string[] = [];
    const q = (k: string) => canvasElement.querySelector(`[data-rx="${k}"]`);
    const need = (k: string) => {
      const el = q(k);
      if (!el) fail.push(`FIXTURE: [data-rx="${k}"] did not render — this arm measured nothing`);
      return el;
    };

    // ---- [[select-affix-width]]: the select sizes to its content, not to the row -------------------------------
    {
      const sel = need("select-affix-width-select");
      const row = need("select-affix-width-row");
      if (sel && row) {
        const w = px(sel, "width");
        const rowW = px(row, "width");
        // Measured before the fix: 820.9px in a 900px row, against 216.4px correct.
        if (w > rowW * 0.5) {
          fail.push(
            `[[select-affix-width]]: a Select with a leading icon is ${w}px wide in a ${rowW}px flex row. It must size ` +
              `to its content. The affix wrapper has taken back its width:100%`,
          );
        }
      }
    }

    // ---- [[empty-state-size]]: three distinct steps, and step 3 is the untouched default ----------------------
    {
      const sizes = (["1", "2", "3"] as const).map((s) => {
        const h = q(`empty-state-size-${s}`)?.querySelector("h3");
        return h ? parseFloat(getComputedStyle(h).fontSize) : NaN;
      });
      if (sizes.some(Number.isNaN)) fail.push("FIXTURE: an EmptyState title did not render");
      else {
        if (!(sizes[0] < sizes[1] && sizes[1] < sizes[2])) {
          fail.push(`[[empty-state-size]]: the size ladder is not monotonic — got ${sizes.join(" / ")}px for steps 1/2/3`);
        }
        // The shipped default rides the ambient heading lane; at the suite's small tier that is 20px.
        if (Math.round(sizes[2]) !== 20) {
          fail.push(
            `[[empty-state-size]]: step "3" renders ${sizes[2]}px, expected 20px. That step IS the pre-ruling ` +
              `default and moving it changes every EmptyState already in the wild`,
          );
        }
      }
    }

    // ---- [[scroll-area-box-sizing]]: a padded ScrollArea is as wide as its parent -----------------------------------
    {
      const vp = need("scroll-area-box-sizing-scroll");
      const parent = need("scroll-area-box-sizing-parent");
      // Our ScrollArea forwards props to the VIEWPORT; the ROOT is the box that must match.
      const sa = vp?.closest(".rt-ScrollAreaRoot") ?? parent?.querySelector(".rt-ScrollAreaRoot") ?? null;
      if (sa && parent) {
        const w = px(sa, "width");
        const pw = px(parent, "width");
        // Measured before the fix: 324px inside a 300px parent.
        if (w !== pw) {
          fail.push(
            `[[scroll-area-box-sizing]]: a padded ScrollArea renders ${w}px inside a ${pw}px parent. Its padding is ` +
              `inflating it, so content is cut by an ancestor with no scrollbar to reveal it`,
          );
        }
      }
    }

    // ---- [[kbd-default-variant]]: the default key is flat ---------------------------------------------------------
    {
      const flat = need("kbd-default-variant-default");
      const raised = need("kbd-default-variant-classic");
      if (flat && raised) {
        const flatShadow = getComputedStyle(flat).boxShadow;
        const raisedShadow = getComputedStyle(raised).boxShadow;
        if (flatShadow !== "none") {
          fail.push(`[[kbd-default-variant]]: the default Kbd paints a box-shadow ("${flatShadow.slice(0, 48)}…"). It must be the flat key`);
        }
        // The reverse arm: if `classic` stopped being raised, this file is asserting nothing.
        if (raisedShadow === "none") {
          fail.push(
            `[[kbd-default-variant]] REVERSE: variant="classic" paints no shadow either, so the default being flat ` +
              `proves nothing. Either Radix changed its skin or the variant stopped applying`,
          );
        }
      }
    }

    // ---- [[avatar-shape-perceptibility]]: the avatar has a perceptible edge ------------------------------------------------
    {
      const host = need("avatar-shape-perceptibility-host");
      // Radix Avatar does not forward unknown data-* onto its root, so match the class.
      const root = host?.querySelector(".rt-ds-avatar") ?? null;
      if (host) {
        if (!root) fail.push("FIXTURE: no .rt-ds-avatar rendered inside the [[avatar-shape-perceptibility]] host");
        const ring = root ? getComputedStyle(root, "::after").boxShadow : "none";
        if (!root || ring === "none" || ring === "") {
          fail.push("[[avatar-shape-perceptibility]]: the avatar has no ::after ring, so its disc is invisible against the page");
        } else {
          let bg = "rgba(0, 0, 0, 0)";
          let p: Element | null = host;
          while (p && bg === "rgba(0, 0, 0, 0)") {
            bg = getComputedStyle(p).backgroundColor;
            p = p.parentElement;
          }
          const colour = ring.match(/rgba?\([^)]+\)/)?.[0];
          // Measured at adoption: 3.02:1 dark, 1.91:1 light. The floor here is deliberately BELOW
          // both — this arm defends "there is a visible edge", not a conformance ratio, because [[avatar-shape-perceptibility]]
          // records that 3:1 is unreachable in light while the fill stays soft.
          if (colour && bg !== "rgba(0, 0, 0, 0)" && contrastOver(colour, bg) < 1.5) {
            fail.push(
              `[[avatar-shape-perceptibility]]: the avatar ring measures ${contrastOver(colour, bg).toFixed(2)}:1 against the page. ` +
                `It has been weakened back toward invisible`,
            );
          }
        }
      }
    }

    // ---- [[seam-ownership]]: one stroke at the seam, not two -------------------------------------------------
    {
      const layout = need("seam-ownership-layout");
      if (layout) {
        const handle = layout.querySelector(".rt-ds-resize-handle");
        if (!handle) fail.push("FIXTURE: the end-docked panel rendered no ResizeHandle");
        else {
          const hx = handle.getBoundingClientRect().left + handle.getBoundingClientRect().width / 2;
          const dividers = [...layout.querySelectorAll(".rt-ds-layout-divider")].filter((d) => {
            const r = d.getBoundingClientRect();
            return r.height > 20 && Math.abs(r.left - hx) <= 8;
          });
          if (dividers.length) {
            fail.push(
              `[[seam-ownership]]: Layout drew ${dividers.length} divider(s) on the same boundary as an END-docked ` +
                `panel's ResizeHandle. The handle IS the seam; a seam is drawn once`,
            );
          }
        }
      }
    }

    // ---- [[app-shell-gutter]]: the gutter is configurable, and its default has not moved -----------------------
    {
      const main = (k: string) => q(k)?.querySelector<HTMLElement>(".rt-ds-appshell-main");
      const dflt = main("app-shell-gutter-default");
      const flush = main("app-shell-gutter-flush");
      if (!dflt || !flush) fail.push("FIXTURE: an AppShell did not render its main");
      else {
        const dp = getComputedStyle(dflt).paddingTop;
        const fp = getComputedStyle(flush).paddingTop;
        if (dp !== "24px") fail.push(`[[app-shell-gutter]]: the default shell gutter is ${dp}, expected the 24px that already shipped`);
        if (fp !== "0px") fail.push(`[[app-shell-gutter]]: gutter="0" renders ${fp}, so the prop is not reaching the main element`);
      }
    }

    // ---- [[panel-background]]: panels are OPAQUE, so nothing smears through them -------------------------------
    {
      // Radix defaulted panelBackground="translucent", resolving the Card fill to a 3.5% wash that
      // scrolling content showed through. Asserted on the RENDERED fill rather than on the
      // attribute, because the attribute passing while the fill stays alpha is the failure that
      // matters. A Card paints through ::before, not background-color.
      const card = canvasElement.querySelector(".rt-Card, .rt-BaseCard");
      if (!card) fail.push("FIXTURE: no Card rendered for the [[panel-background]] arm");
      else {
        const fill = getComputedStyle(card, "::before").backgroundColor;
        const alpha = Number((fill.match(/[\d.]+/g) ?? [])[3] ?? 1);
        if (alpha < 1) {
          fail.push(
            `[[panel-background]]: the panel fill is ${fill} (alpha ${alpha}). A translucent panel lets content ` +
              `scroll visibly behind it — the lighter smear and flicker at scroll edges in dark`,
          );
        }
      }
    }

    // ---- [[scrim-value]]: one scrim value serves both appearances ------------------------------------------
    {
      const probe = document.createElement("div");
      probe.style.cssText = "position:fixed;top:-500px;width:10px;height:10px;background:var(--ds-scrim)";
      // MUST hang off the theme root: --ds-scrim is declared on .radix-themes, and canvasElement
      // can sit outside it, where the var resolves to nothing and the probe reads transparent.
      const themeRoot = canvasElement.closest(".radix-themes") ?? document.querySelector(".radix-themes") ?? canvasElement;
      themeRoot.appendChild(probe);
      const scrim = getComputedStyle(probe).backgroundColor;
      probe.remove();
      const alpha = Number((scrim.match(/[\d.]+/g) ?? [])[3] ?? 1);
      // 0.60 in both appearances. The floor guards the contrast obligation the token carries
      // (white on the scrim over worst-case white media reads 5.74:1 here, against 4.5); the
      // ceiling guards the defect — dark used to sit at 0.90 and erased the media under it.
      if (alpha < 0.55 || alpha > 0.75) {
        fail.push(
          `[[scrim-value]]: --ds-scrim is ${scrim} (alpha ${alpha}). Below ~0.55 the text on it drops under ` +
            `4.5:1; above ~0.75 it stops being a scrim over media and becomes a blackout`,
        );
      }
    }

    // ---- [[avatar-group-overlap]]: a grouped avatar's initials are not eaten by the overlap ------------------------
    {
      const group = canvasElement.querySelector(".rt-ds-avatar-group");
      const discs = group ? [...group.querySelectorAll<HTMLElement>(".rt-ds-avatar")] : [];
      if (discs.length < 2) fail.push("FIXTURE: the [[avatar-group-overlap]] arm needs an AvatarGroup with at least two discs");
      else {
        const a = discs[0].getBoundingClientRect();
        const b = discs[1].getBoundingClientRect();
        const fb = discs[0].querySelector(".rt-AvatarFallback");
        if (fb) {
          const range = document.createRange();
          range.selectNodeContents(fb);
          const ink = range.getBoundingClientRect();
          const covered = Math.round(ink.right - b.left);
          // Measured at adoption: 7.6px of a two-letter pair sat under the next disc at 40%
          // overlap, so "RK DM SO HB" read as "RI DI SC HI".
          if (covered > 0) {
            fail.push(
              `[[avatar-group-overlap]]: ${covered}px of a grouped avatar's initials sits under the next disc ` +
                `(overlap ${Math.round(((a.right - b.left) / a.width) * 100)}%). The overlap is ` +
                `derived from the two-letter font ratio and must not exceed it`,
            );
          }
        }
      }
    }

    // ---- [[status-glyph-line-box]]: the status glyph sits ON the first line of its row, at every tier --------------
    {
      const host = need("status-glyph-line-box-host");
      const glyph = host?.querySelector(".rt-ds-chat-toolcalls-glyph");
      const name = host?.querySelector(".rt-ds-chat-toolcalls-name");
      if (host && (!glyph || !name)) {
        fail.push("FIXTURE: the [[status-glyph-line-box]] arm needs a ChatToolCalls error row with a glyph and a name");
      } else if (glyph && name) {
        // The FIRST line box of the name, not the element box: the row is two lines tall and the
        // element box centre is the very thing the defect aligned to.
        const range = document.createRange();
        range.selectNodeContents(name);
        const line = range.getClientRects()[0] ?? name.getBoundingClientRect();
        const g = glyph.getBoundingClientRect();
        const offset = g.top + g.height / 2 - (line.top + line.height / 2);
        // Measured at this tier before the fix: -2px, and -3.5px at large. One pixel of slack
        // covers the sub-pixel rounding of an even glyph inside an odd line box, and nothing more.
        if (Math.abs(offset) > 1) {
          fail.push(
            `[[status-glyph-line-box]]: the tool-call status glyph is ${offset.toFixed(2)}px off the centre of the first ` +
              `line it labels. A fixed-size glyph beside tier-scaled text needs its own line box ` +
              `(min-height: 1lh); flush-topping it only ever agrees at one tier`,
          );
        }
      }
    }

    // ---- [[select-anchoring]]: the listbox is anchored under its trigger and is never narrower ----------------
    {
      const trigger = need("select-anchoring-trigger") as HTMLElement | null;
      if (trigger) {
        const t = trigger.getBoundingClientRect();
        trigger.click();
        await settle();
        const panel = document.querySelector("[data-radix-popper-content-wrapper]")?.firstElementChild;
        if (!panel) {
          fail.push(
            "[[select-anchoring]]: the Select panel did not open, or it is no longer popper-positioned — an " +
              "item-aligned panel has no popper wrapper, which is itself the defect",
          );
        } else {
          const p = panel.getBoundingClientRect();
          // Measured before the fix: dx +20, the panel top 4px ABOVE the trigger top, 170px wide
          // against a 190px trigger.
          if (Math.abs(p.left - t.left) > 1) {
            fail.push(`[[select-anchoring]]: the Select panel is ${(p.left - t.left).toFixed(1)}px off its trigger's left edge`);
          }
          // A flip is CORRECT: near a viewport edge Radix puts the panel above instead of below,
          // and this fixture sits low enough on a long page to trigger exactly that. What the
          // ruling forbids is the panel sitting ON the control, which is what item-aligned does on
          // whichever side it lands. So assert clearance, not a side.
          const clears = p.bottom <= t.top + 1 || p.top >= t.bottom - 1;
          if (!clears) {
            fail.push(
              `[[select-anchoring]]: the Select panel (${p.top.toFixed(1)}-${p.bottom.toFixed(1)}) overlaps its own ` +
                `trigger (${t.top.toFixed(1)}-${t.bottom.toFixed(1)}). Radix's item-aligned default is back`,
            );
          }
          if (p.width < t.width - 1) {
            fail.push(
              `[[select-anchoring]]: the Select panel is ${p.width.toFixed(1)}px against a ${t.width.toFixed(1)}px ` +
                `trigger. min-width: var(--radix-select-trigger-width) is not applying`,
            );
          }
          trigger.click();
          await settle();
        }
      }
    }

    // ---- [[data-list-overflow]]: one list resolves one overflow behaviour for every value -----------------------
    {
      const short = need("data-list-overflow-short") as HTMLElement | null;
      const long = need("data-list-overflow-long") as HTMLElement | null;
      if (short && long) {
        const lineOf = (el: HTMLElement) =>
          Math.round(el.getBoundingClientRect().height / parseFloat(getComputedStyle(el).lineHeight));
        const a = getComputedStyle(short);
        const b = getComputedStyle(long);
        // The observable a consumer sees, not the declaration: two values in the same list, one
        // short and one long, both narrower than they want to be, must RESOLVE THE SAME WAY.
        if (a.whiteSpace !== b.whiteSpace || a.textOverflow !== b.textOverflow) {
          fail.push(
            `[[data-list-overflow]]: two values in ONE DataList resolved differently — "${a.whiteSpace}/${a.textOverflow}" ` +
              `against "${b.whiteSpace}/${b.textOverflow}". The policy is declared once on the root ` +
              `and every value obeys it`,
          );
        }
        if (lineOf(short) !== lineOf(long)) {
          fail.push(
            `[[data-list-overflow]]: under one declared policy the two values occupy ${lineOf(short)} and ` +
              `${lineOf(long)} lines. This is the defect verbatim: one wrapped while another truncated`,
          );
        }
        // A truncated value must keep its full text reachable, or the ellipsis destroys content.
        const full = "agent/billing-sdk-migration-2026";
        const reachable = long.getAttribute("title") ?? long.querySelector("[title]")?.getAttribute("title");
        if (a.textOverflow === "ellipsis" && reachable !== full) {
          fail.push(
            `[[data-list-overflow]]: the truncated value carries title="${reachable ?? "(none)"}" instead of its full ` +
              `text. Truncation may hide a string, never lose it`,
          );
        }
      }
    }

    // ---- [[truncating-label-width]]: a narrow rail truncates the label and keeps the trailing marker ----------------
    {
      const host = need("truncating-label-width-host") as HTMLElement | null;
      const mark = need("truncating-label-width-mark") as HTMLElement | null;
      const row = host?.querySelector<HTMLElement>(".rt-ds-item");
      const label = host?.querySelector<HTMLElement>(".rt-ds-item-label");
      if (host && (!row || !label)) {
        fail.push("FIXTURE: the [[truncating-label-width]] arm needs a TreeList row with a label inside its narrow host");
      } else if (host && row && label && mark) {
        const hostBox = host.getBoundingClientRect();
        const rowBox = row.getBoundingClientRect();
        // 1. The row shrinks to the rail. Before the fix it stayed at its intrinsic width and ran
        //    62px past a 150px rail, which is what made the panel clip it mid-glyph.
        if (rowBox.right > hostBox.right + 1) {
          fail.push(
            `[[truncating-label-width]]: the tree row runs ${(rowBox.right - hostBox.right).toFixed(1)}px past its rail. ` +
              `A nowrap label's min-content is its whole string, so the row cannot shrink and the ` +
              `panel clips it instead of the label truncating`,
          );
        }
        // 2. And because it shrank, the ellipsis the label already carried actually fires.
        if (label.scrollWidth <= label.clientWidth + 1) {
          fail.push(
            `[[truncating-label-width]]: the label reports scrollWidth ${label.scrollWidth} against clientWidth ` +
              `${label.clientWidth}, so it is not being squeezed and its ellipsis never renders`,
          );
        }
        // 3. The trailing marker is the row's STATE and must never be what gets cut.
        const markBox = mark.getBoundingClientRect();
        if (markBox.right > hostBox.right + 1 || markBox.width === 0) {
          fail.push(
            `[[truncating-label-width]]: the trailing status marker is outside the rail (right ${markBox.right.toFixed(1)} ` +
              `against ${hostBox.right.toFixed(1)}). The label truncates so the marker survives, ` +
              `never the other way round`,
          );
        }
      }
    }

    if (fail.length) {
      throw new Error(
        `REGRESSIONS — ${fail.length} fixed defect(s) have returned. Each line names the ruling that ` +
          `explains it; read that entry in DECISIONS.md before changing this file.\n${fail.join("\n")}`,
      );
    }
  },
};
