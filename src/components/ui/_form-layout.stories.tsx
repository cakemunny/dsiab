import type { Meta, StoryObj } from "@storybook/react-vite";
import { TextField as RadixTextField } from "@radix-ui/themes";
import { FormLayout } from "./FormLayout";
import { Field, useFieldControl } from "./Field";
import { TextField } from "./TextField";
import { Select } from "./Select";

/* Test-only behavioral plays for FormLayout + the Field horizontal-labels amendment — kept OUT of the
   docs story (System/Layout/FormLayout) per §4. Underscore-prefixed file → registry/category/order-guard
   exempt, grouped under _internal. Plays are hand-rolled (no @storybook/test): assertions via throw,
   passive DOM reads only (FormLayout has no open/close behaviour to drive). axe still runs on each story. */

const q = (root: ParentNode, sel: string) => root.querySelector<HTMLElement>(sel);
const all = (root: ParentNode, sel: string) => Array.from(root.querySelectorAll<HTMLElement>(sel));

/** A bare Field-riding control (raw Radix TextField wired via useFieldControl) — the minimal harness for
 *  exercising Field.Root's direction resolution without a full System input. */
function RawControl({ testid }: { testid: string }) {
  const aria = useFieldControl();
  return <RadixTextField.Root {...aria} data-testid={testid} defaultValue="value" />;
}

const meta: Meta = {
  title: "_internal/FormLayout behavior",
  parameters: { controls: { disable: true } },
};
export default meta;
type Story = StoryObj;

/* -------------------------------------------------------------------------- */
/** Labels sit LEFT of inputs in horizontal mode — the core visual contract, asserted via bounding rects
 *  across two different Field-riding input types (TextField + Select). */
export const LabelsSitLeft: Story = {
  render: () => (
    <FormLayout direction="horizontal" data-testid="fl" style={{ maxWidth: 480 }}>
      <TextField label="Full name" defaultValue="Ada Lovelace" />
      <Select label="Role" defaultValue="admin">
        <Select.Trigger />
        <Select.Content>
          <Select.Item value="admin">Admin</Select.Item>
          <Select.Item value="viewer">Viewer</Select.Item>
        </Select.Content>
      </Select>
    </FormLayout>
  ),
  play: async ({ canvasElement }) => {
    const fl = q(canvasElement, '[data-testid="fl"]');
    if (!fl) throw new Error("FormLayout did not render");
    // Horizontal placement only holds ABOVE the 480px collapse breakpoint (a CSS @media). If the browser
    // viewport is at/below it, the layout is (correctly) stacked — assert that instead of horizontal.
    if (window.innerWidth <= 480) {
      for (const field of all(fl, '[data-direction="horizontal"]')) {
        if (getComputedStyle(field).gridTemplateColumns.includes("subgrid")) throw new Error("below 480px the horizontal field must drop subgrid for a single-column stack");
      }
      return;
    }
    const fields = all(fl, '[data-direction="horizontal"]');
    if (fields.length !== 2) throw new Error(`expected 2 horizontal Field.Roots (TextField + Select); got ${fields.length}`);
    const controlLefts: number[] = [];
    for (const field of fields) {
      if (getComputedStyle(field).display !== "grid") throw new Error("horizontal Field.Root must be display:grid");
      // Inside a horizontal FormLayout the field subgrids the shared tracks (the [[horizontal-field-labels]] alignment mechanism).
      if (!getComputedStyle(field).gridTemplateColumns.includes("subgrid")) throw new Error("horizontal Field.Root inside a FormLayout must be grid-template-columns: subgrid");
      const label = q(field, '[data-field-part="label"]');
      const control = q(field, ".rt-TextFieldRoot, .rt-SelectTrigger");
      if (!label || !control) throw new Error("horizontal field must render a label and a control");
      const lr = label.getBoundingClientRect();
      const cr = control.getBoundingClientRect();
      const fr = field.getBoundingClientRect();
      controlLefts.push(cr.left);
      // label's right edge is at/left of the control's left edge (label is the left column) …
      if (lr.right > cr.left + 2) throw new Error(`label must sit LEFT of the control; label.right=${lr.right.toFixed(1)} control.left=${cr.left.toFixed(1)}`);
      // … and shares the control's row (their vertical spans overlap — label is centred to that row) …
      if (!(lr.bottom > cr.top && lr.top < cr.bottom)) throw new Error("label must sit on the control's row (vertical overlap)");
      // … and the auto label track must not collapse to 0 (which overflows the label left, out of the grid).
      if (lr.left < fr.left - 1) throw new Error(`label overflows the field's left edge (auto label track collapsed); label.left=${lr.left.toFixed(1)} field.left=${fr.left.toFixed(1)}`);
    }
    // The aligned column: two rows with DIFFERENT label lengths ("Full name" vs "Role") must still put
    // both controls at the SAME left edge — the shared subgrid label column. A per-field grid drifts here.
    if (Math.max(...controlLefts) - Math.min(...controlLefts) > 1.5) throw new Error(`controls must share one left edge across rows of different label lengths; lefts=[${controlLefts.map((l) => l.toFixed(1)).join(", ")}]`);
  },
};

/* -------------------------------------------------------------------------- */
/** Direction resolution: explicit prop → FormLayout context → "vertical". A Field-riding input inside a
 *  horizontal FormLayout inherits horizontal; a bare Field (no FormLayout) defaults to vertical; an
 *  explicit Field.direction overrides the inherited context. */
export const DirectionResolution: Story = {
  render: () => (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      {/* inherited: TextField + Select inside a horizontal FormLayout */}
      <FormLayout direction="horizontal" data-testid="inherit">
        <TextField label="Name" defaultValue="Ada" />
        <Select label="Role" defaultValue="admin">
          <Select.Trigger />
          <Select.Content>
            <Select.Item value="admin">Admin</Select.Item>
          </Select.Content>
        </Select>
      </FormLayout>

      {/* explicit override: a Field pinned vertical, INSIDE a horizontal FormLayout */}
      <FormLayout direction="horizontal" data-testid="override-wrap">
        <Field.Root direction="vertical">
          <Field.Label>Pinned vertical</Field.Label>
          <RawControl testid="override-ctl" />
        </Field.Root>
      </FormLayout>

      {/* default: a bare Field with no FormLayout and no direction prop */}
      <div data-testid="bare">
        <Field.Root>
          <Field.Label>Bare default</Field.Label>
          <RawControl testid="bare-ctl" />
        </Field.Root>
      </div>
    </div>
  ),
  play: async ({ canvasElement }) => {
    // 1. Inherited: both inputs' Field.Roots resolve to horizontal.
    const inherit = q(canvasElement, '[data-testid="inherit"]')!;
    const inheritRoots = all(inherit, "[data-direction]");
    if (inheritRoots.length !== 2) throw new Error(`inherited: expected 2 Field.Roots; got ${inheritRoots.length}`);
    for (const r of inheritRoots) {
      if (r.getAttribute("data-direction") !== "horizontal") throw new Error("a Field-riding input in a horizontal FormLayout must inherit data-direction=horizontal");
    }

    // 2. Explicit override wins over the inherited horizontal context.
    const overrideWrap = q(canvasElement, '[data-testid="override-wrap"]')!;
    const overrideRoot = q(overrideWrap, "[data-direction]")!;
    if (overrideRoot.getAttribute("data-direction") !== "vertical") throw new Error("an explicit Field.direction must OVERRIDE the inherited FormLayout context");
    if (getComputedStyle(overrideRoot).display !== "flex") throw new Error("a vertical Field.Root must stay display:flex (unchanged column)");

    // 3. Default: a bare Field (no FormLayout, no prop) resolves to vertical — the byte-identical default.
    const bare = q(canvasElement, '[data-testid="bare"]')!;
    const bareRoot = q(bare, "[data-direction]")!;
    if (bareRoot.getAttribute("data-direction") !== "vertical") throw new Error("a bare Field must default to data-direction=vertical");
    if (getComputedStyle(bareRoot).display !== "flex") throw new Error("the default vertical Field.Root must render display:flex (no grid, byte-identical)");
    // no horizontal grid rule applies to a vertical field → its grid-template-columns stays 'none'
    if (getComputedStyle(bareRoot).gridTemplateColumns !== "none") throw new Error("a vertical Field.Root must NOT pick up the horizontal grid template");
  },
};

/* -------------------------------------------------------------------------- */
/** The ≤480px collapse is CSS-only. Viewport resize isn't reliably drivable from a browser-mode play, so
 *  we (a) assert the two-track grid at the current (wide) viewport, and (b) prove the collapse is wired
 *  as a CSS @media (max-width:480px) rule — never JS — by finding it in the loaded stylesheets. */
export const NarrowCollapseIsCssOnly: Story = {
  render: () => (
    <FormLayout direction="horizontal" data-testid="collapse" style={{ maxWidth: 480 }}>
      <TextField label="Full name" defaultValue="Ada Lovelace" />
    </FormLayout>
  ),
  play: async ({ canvasElement }) => {
    // (a) At a wide viewport, the FormLayout owns a two-track grid and the horizontal Field.Root subgrids
    //     it. (Below 480px both collapse to one column — verified as CSS in part (b).)
    const container = q(canvasElement, '[data-ds-form-layout="horizontal"]')!;
    const field = q(canvasElement, '[data-direction="horizontal"]')!;
    if (window.innerWidth > 480) {
      const containerCols = getComputedStyle(container).gridTemplateColumns;
      if (containerCols === "none" || !containerCols.includes(" ")) throw new Error(`the horizontal FormLayout must own a two-track grid at wide width; got grid-template-columns: ${containerCols}`);
      const fieldCols = getComputedStyle(field).gridTemplateColumns;
      if (!fieldCols.includes("subgrid")) throw new Error(`the horizontal Field.Root must subgrid the FormLayout's tracks at wide width; got grid-template-columns: ${fieldCols}`);
    }

    // (b) The collapse lives in a CSS @media (max-width:480px) rule targeting the horizontal Field.Root
    //     and re-setting grid-template-columns — proving it's CSS, not JS.
    let found = false;
    for (const sheet of Array.from(document.styleSheets)) {
      let rules: CSSRuleList;
      try { rules = sheet.cssRules; } catch { continue; } // skip cross-origin sheets
      for (const rule of Array.from(rules)) {
        if (rule instanceof CSSMediaRule && /max-width:\s*480px/.test(rule.conditionText)) {
          for (const inner of Array.from(rule.cssRules)) {
            if (
              inner instanceof CSSStyleRule &&
              inner.selectorText.includes('data-direction="horizontal"') &&
              /grid-template-columns/.test(inner.style.cssText)
            ) {
              found = true;
            }
          }
        }
      }
    }
    if (!found) throw new Error("the ≤480px collapse must be a CSS @media(max-width:480px) rule re-setting grid-template-columns on the horizontal Field.Root (found none → collapse is not CSS-wired)");
  },
};
