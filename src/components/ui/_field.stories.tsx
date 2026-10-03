import type { Meta, StoryObj } from "@storybook/react-vite";
import { Flex, TextField } from "@radix-ui/themes";
import {
  Field, FieldGroup, useFieldControl, useFieldGroupControl,
  useDisabledReason, DisabledReasonTooltip, DisabledReasonGlyph,
} from "./Field";
import { Checkbox } from "./Checkbox";
import { CheckboxGroup } from "./CheckboxGroup";
import { RadioGroup } from "./RadioGroup";
import { Select } from "./Select";
import { TextArea } from "./TextArea";
import { parseColor, resolveColor } from "../../foundations/_assert";

function BareControl() {
  const aria = useFieldControl();
  return <TextField.Root {...aria} data-testid="control" />;
}

function GroupProbe() {
  const aria = useFieldGroupControl();
  return <div data-testid="group" role="radiogroup" {...aria} />;
}

async function waitFor<T>(fn: () => T | null | undefined | false, timeout = 1500): Promise<T> {
  const t0 = performance.now();
  for (;;) {
    const v = fn();
    if (v) return v;
    if (performance.now() - t0 > timeout) throw new Error("waitFor: timed out");
    await new Promise((r) => setTimeout(r, 16));
  }
}

// A minimal Field-riding control that exercises the shared soft-disable-with-reason affordance the way a
// real input (DateInput/TimeInput/…) would: field aria from useFieldControl, disabled wiring from
// useDisabledReason, container wrapped in DisabledReasonTooltip, glyph in the trailing slot. Uses the RAW
// Radix TextField (there is no real DateInput yet — this is the validation harness, not the input).
function DisabledReasonControl({ disabled, disabledReason, testid }: { disabled?: boolean; disabledReason?: string; testid: string }) {
  const fieldAria = useFieldControl();
  const dr = useDisabledReason({ disabled, disabledReason });
  // Merge the reason id with any field-level describedby (validation/description) — the documented pattern.
  const describedBy = [fieldAria["aria-describedby"], dr.soft ? dr.reasonId : undefined].filter(Boolean).join(" ") || undefined;
  return (
    <DisabledReasonTooltip {...dr.tooltip}>
      <TextField.Root {...fieldAria} {...dr.controlProps} aria-describedby={describedBy} data-testid={testid} defaultValue="acme-inc">
        {dr.showGlyph && (
          <TextField.Slot side="right">
            <DisabledReasonGlyph />
          </TextField.Slot>
        )}
      </TextField.Root>
    </DisabledReasonTooltip>
  );
}

const meta: Meta = { title: "_internal/Field" };
export default meta;
type Story = StoryObj;

export const WiresAria: Story = {
  render: () => (
    <Field.Root validation={{ tone: "error", message: "Required." }}>
      <Field.Label>Email</Field.Label>
      <BareControl />
      <Field.Message />
    </Field.Root>
  ),
  play: async ({ canvasElement }) => {
    const label = canvasElement.querySelector<HTMLLabelElement>("label")!;
    const input = canvasElement.querySelector<HTMLInputElement>('[data-testid="control"]')!;
    const msg = canvasElement.querySelector<HTMLElement>('[role="alert"]')!;
    if (label.htmlFor !== input.id || !input.id) throw new Error("label htmlFor must match control id");
    if (input.getAttribute("aria-invalid") !== "true") throw new Error("aria-invalid must be true on error");
    if (input.getAttribute("aria-describedby") !== msg.id || !msg.id) {
      throw new Error("aria-describedby must reference the message id");
    }
    if (!msg.textContent?.includes("Required.")) throw new Error("message text missing");
  },
};

export const WiresGroupAria: Story = {
  render: () => (
    <FieldGroup.Root validation={{ tone: "error", message: "Pick at least one." }} description="Choose any that apply.">
      <FieldGroup.Label>Toppings</FieldGroup.Label>
      <GroupProbe />
      <FieldGroup.Description>Choose any that apply.</FieldGroup.Description>
      <FieldGroup.Message />
    </FieldGroup.Root>
  ),
  play: async ({ canvasElement }) => {
    const container = canvasElement.querySelector<HTMLElement>("[data-field-group]")!;
    if (!container) throw new Error("FieldGroup.Root must render a [data-field-group] container");
    // No <fieldset>: it would double-group with the Radix group/radiogroup inside.
    if (canvasElement.querySelector("fieldset")) throw new Error("FieldGroup must NOT render a <fieldset> (avoids double-grouping)");
    const group = canvasElement.querySelector<HTMLElement>('[data-testid="group"]')!;
    const labelledby = group.getAttribute("aria-labelledby");
    const label = labelledby ? document.getElementById(labelledby) : null;
    if (!label || !label.textContent?.includes("Toppings")) throw new Error("group must be aria-labelledby a 'Toppings' label element");
    // group-level status: on error the label NAME adopts the error family colour (no shell tint/border).
    // The paint is declared in the stylesheet now, keyed off data-tone, so read the RENDERED colour back
    // and compare it to the token resolved in the same tree. The old check read `label.style.color` — it
    // could only ever confirm that an inline string was present, and would have passed on any colour.
    if (label.dataset.tone !== "error") throw new Error('on error, the group label must carry data-tone="error"');
    const got = parseColor(getComputedStyle(label).color);
    const want = resolveColor(label, "--ds-text-error");
    if (got.r !== want.r || got.g !== want.g || got.b !== want.b) {
      throw new Error(`on error, the group label must adopt the error family text colour (got ${getComputedStyle(label).color})`);
    }
    if (canvasElement.querySelector("[data-field-group][style*='background']")) throw new Error("the group must NOT paint a shell background");
    const msg = canvasElement.querySelector<HTMLElement>('[role="alert"]')!;
    if (!msg?.id || !msg.textContent?.includes("Pick at least one")) throw new Error("error message + role=alert required");
    // validation active ⇒ message REPLACES description in the support slot; describedby points to the message
    if (group.getAttribute("aria-describedby") !== msg.id) {
      throw new Error("group aria-describedby must reference the active message id");
    }
    // aria-invalid is never meaningful on a group container
    if (group.hasAttribute("aria-invalid") || container.hasAttribute("aria-invalid")) {
      throw new Error("group must NOT carry aria-invalid");
    }
  },
};

export const GroupRootAutoWires: Story = {
  render: () => (
    <div>
      <FieldGroup.Root validation={{ tone: "error", message: "Pick at least one." }}>
        <FieldGroup.Label>Toppings</FieldGroup.Label>
        <CheckboxGroup data-testid="cg-wrapped">
          <CheckboxGroup.Item value="a">A</CheckboxGroup.Item>
          <CheckboxGroup.Item value="b">B</CheckboxGroup.Item>
        </CheckboxGroup>
        <FieldGroup.Message />
      </FieldGroup.Root>
      <CheckboxGroup data-testid="cg-standalone">
        <CheckboxGroup.Item value="a">A</CheckboxGroup.Item>
      </CheckboxGroup>
      <FieldGroup.Root>
        <FieldGroup.Label>Plan</FieldGroup.Label>
        <RadioGroup data-testid="rg-wrapped">
          <RadioGroup.Item value="free">Free</RadioGroup.Item>
        </RadioGroup>
      </FieldGroup.Root>
    </div>
  ),
  play: async ({ canvasElement }) => {
    const labelOf = (el: HTMLElement) => {
      const id = el.getAttribute("aria-labelledby");
      return id ? document.getElementById(id)?.textContent?.trim() : undefined;
    };
    const cgW = canvasElement.querySelector<HTMLElement>('[data-testid="cg-wrapped"]')!;
    if (labelOf(cgW) !== "Toppings") throw new Error("a wrapped CheckboxGroup must auto-wire aria-labelledby to its 'Toppings' label");
    const cgS = canvasElement.querySelector<HTMLElement>('[data-testid="cg-standalone"]')!;
    if (cgS.hasAttribute("aria-labelledby")) throw new Error("a standalone CheckboxGroup must NOT carry group aria");
    const rgW = canvasElement.querySelector<HTMLElement>('[data-testid="rg-wrapped"]')!;
    if (labelOf(rgW) !== "Plan") throw new Error("a wrapped RadioGroup must auto-wire aria-labelledby to its 'Plan' label");
    // No fieldsets anywhere — the Radix group/radiogroup is the single named group.
    if (canvasElement.querySelector("fieldset")) throw new Error("FieldGroup must not introduce a <fieldset>");
  },
};

export const ItemDescription: Story = {
  render: () => (
    <FieldGroup.Root validation={{ tone: "error", message: "Choose a plan to continue." }}>
      <FieldGroup.Label>Plan</FieldGroup.Label>
      <RadioGroup data-testid="rg">
        <RadioGroup.Item value="free" description="$0 — for trying things out">Free</RadioGroup.Item>
        <RadioGroup.Item value="pro" description="$20/mo — for growing teams">Pro</RadioGroup.Item>
      </RadioGroup>
      <FieldGroup.Message />
    </FieldGroup.Root>
  ),
  play: async ({ canvasElement }) => {
    const radio = canvasElement.querySelector<HTMLElement>('[role="radio"]')!;
    const describedby = radio.getAttribute("aria-describedby");
    if (!describedby) throw new Error("a described radio item must carry aria-describedby on the role=radio control");
    const ids = describedby.split(" ");
    const descEl = ids.map((id) => document.getElementById(id)).find((el) => el?.textContent?.includes("for trying things out"));
    if (!descEl) throw new Error("aria-describedby must reference the per-item description text");
    // the description sits inside the item (under the label), not as a detached sibling
    if (!descEl.closest('[data-field-item-desc]')) throw new Error("description must render in the item's text slot");
    // [[floating-surface-fill]]: each item's describedby also includes the group-level message id (tab-stop announcement)
    const msg = canvasElement.querySelector<HTMLElement>('[role="alert"]')!;
    if (!ids.includes(msg.id)) throw new Error("each item describedby must also include the group message id");
  },
};

export const CheckboxFieldApi: Story = {
  render: () => (
    <Flex direction="column" gap="4">
      <Checkbox data-testid="bare" aria-label="Standalone bare checkbox" />
      <Checkbox
        data-testid="labeled"
        label="I agree to the terms"
        description="You can opt out any time."
        validation={{ tone: "error", message: "Please accept the terms to continue." }}
      />
    </Flex>
  ),
  play: async ({ canvasElement }) => {
    // bare: no Field scaffolding around the control
    const bare = canvasElement.querySelector<HTMLElement>('[data-testid="bare"]')!;
    if (bare.hasAttribute("aria-describedby") || bare.hasAttribute("aria-invalid")) {
      throw new Error("a bare Checkbox (no label) must not carry Field aria");
    }
    // labeled: label associated by htmlFor, error wired, message replaces description
    const box = canvasElement.querySelector<HTMLElement>('[data-testid="labeled"]')!;
    if (box.getAttribute("aria-invalid") !== "true") throw new Error("error validation must set aria-invalid on the checkbox");
    const label = canvasElement.querySelector<HTMLLabelElement>("label[for]")!;
    if (!box.id || label.getAttribute("for") !== box.id) throw new Error("the label htmlFor must match the checkbox id");
    if (!label.textContent?.includes("I agree to the terms")) throw new Error("label text missing");
    const msg = canvasElement.querySelector<HTMLElement>('[role="alert"]')!;
    if (!msg.id || box.getAttribute("aria-describedby") !== msg.id) {
      throw new Error("aria-describedby must reference the message id (which replaces the description on error)");
    }
    if (!msg.textContent?.includes("Please accept")) throw new Error("error message text missing");
  },
};

export const TextAreaFieldApi: Story = {
  render: () => (
    <TextArea
      label="Bio"
      description="A short blurb for your profile."
      validation={{ tone: "error", message: "Bio is required." }}
    />
  ),
  play: async ({ canvasElement }) => {
    const ta = canvasElement.querySelector<HTMLTextAreaElement>("textarea")!;
    const label = canvasElement.querySelector<HTMLLabelElement>("label[for]")!;
    if (!ta.id || label.getAttribute("for") !== ta.id) throw new Error("label htmlFor must match the textarea id");
    if (ta.getAttribute("aria-invalid") !== "true") throw new Error("error must set aria-invalid on the textarea");
    const msg = canvasElement.querySelector<HTMLElement>('[role="alert"]')!;
    if (!msg.id || ta.getAttribute("aria-describedby") !== msg.id) throw new Error("aria-describedby must reference the message id (replaces description on error)");
    if (!msg.textContent?.includes("Bio is required")) throw new Error("error message text missing");
  },
};

export const SelectFieldApi: Story = {
  // No axe carve-out: the placeholder contrast this story used to exclude is FIXED (2026-08-04). It was
  // never exempt — SC 1.4.3 exempts INACTIVE controls, and this one is enabled, so the placeholder is its
  // visible label. Radix's [data-placeholder] skin (--gray-a10) measured #807984 on the #feebec invalid
  // wash = 3.67 light and #8d7c88 on #3b121b = 4.16 dark. `components.css` now paints every
  // .rt-SelectTrigger[data-placeholder] with --ds-text-weak, which measures 5.18 / 7.83 on the same two
  // surfaces. axe is left ON over the trigger deliberately — it is what keeps the fix from regressing.
  render: () => (
    <Select label="Country" validation={{ tone: "error", message: "Select a country." }}>
      <Select.Trigger data-testid="trigger" placeholder="Pick…" />
      <Select.Content>
        <Select.Item value="us">United States</Select.Item>
        <Select.Item value="ca">Canada</Select.Item>
      </Select.Content>
    </Select>
  ),
  play: async ({ canvasElement }) => {
    const trigger = canvasElement.querySelector<HTMLElement>('[data-testid="trigger"]')!;
    if (trigger.getAttribute("aria-invalid") !== "true") throw new Error("error must set aria-invalid on the Select trigger");
    const label = canvasElement.querySelector<HTMLLabelElement>("label[for]")!;
    if (!trigger.id || label.getAttribute("for") !== trigger.id) throw new Error("label htmlFor must match the trigger id");
    const msg = canvasElement.querySelector<HTMLElement>('[role="alert"]')!;
    if (!msg.id || trigger.getAttribute("aria-describedby") !== msg.id) throw new Error("aria-describedby must reference the message id");
    if (!msg.textContent?.includes("Select a country")) throw new Error("error message text missing");
  },
};

// ---- Soft-disable-with-reason (D8 / DECISIONS [[disabled-reason]]) ---------------------------------------------------
// When a Field-riding control is disabled WITH a reason, it must SOFT-disable: aria-disabled + readOnly
// (not native disabled, which would drop it from the a11y tree and kill the tooltip/focus that carry the
// reason), stay focusable, describe itself with the reason, surface a Tooltip, and NOT be aria-invalid.
export const DisabledReasonSoftDisable: Story = {
  render: () => (
    <Field.Root>
      <Field.Label>Workspace URL</Field.Label>
      <DisabledReasonControl disabled disabledReason="Only workspace owners can change this." testid="soft" />
    </Field.Root>
  ),
  play: async ({ canvasElement }) => {
    const input = canvasElement.querySelector<HTMLInputElement>('[data-testid="soft"]');
    if (!input) throw new Error("soft-disabled control did not render");
    // 1. aria-disabled + readOnly, and NOT native disabled (native disabled defeats the whole purpose).
    if (input.getAttribute("aria-disabled") !== "true") throw new Error('soft-disable must set aria-disabled="true"');
    if (!input.readOnly) throw new Error("soft-disable must set readOnly");
    if (input.disabled) throw new Error("soft-disable must NOT use native disabled (drops the control from the a11y tree)");
    // 2. still focusable / tabbable.
    if (input.tabIndex < 0) throw new Error("soft-disabled control must stay tabbable (tabIndex >= 0)");
    input.focus();
    if (document.activeElement !== input) throw new Error("soft-disabled control must be focusable");
    // 3. aria-describedby resolves to the PERSISTENT reason text (present even before the tooltip opens).
    const describedby = input.getAttribute("aria-describedby");
    if (!describedby) throw new Error("soft-disable must set aria-describedby to the reason id");
    const reasonEl = describedby.split(/\s+/).filter(Boolean)
      .map((id) => document.getElementById(id))
      .find((el) => el?.textContent?.includes("Only workspace owners can change this."));
    if (!reasonEl) throw new Error("aria-describedby must resolve to the persistent reason text");
    // 4. NOT aria-invalid — a reason is guidance, not an error.
    if (input.hasAttribute("aria-invalid")) throw new Error("soft-disable must NOT set aria-invalid (a reason is not an error)");
    // 5. the quiet trailing Info glyph is present and aria-hidden (reason travels via describedby).
    const wrapper = canvasElement.querySelector<HTMLElement>("[data-disabled-reason]");
    if (!wrapper) throw new Error("soft-disable must wrap the control container in a [data-disabled-reason] tooltip trigger");
    if (!wrapper.querySelector('svg[aria-hidden="true"]')) throw new Error("soft-disable must render the aria-hidden Info glyph");
    // 6. the tooltip content is reachable — focus (step 2) opens it; Radix portals it with role="tooltip".
    await waitFor(() => {
      const tip = document.querySelector<HTMLElement>('[role="tooltip"]');
      return tip && tip.textContent?.includes("Only workspace owners can change this.") ? tip : null;
    });
    // 7. the LABEL stays readable. This is the distinction soft-disable exists for: the control reads as
    //    unavailable, but the word that NAMES the thing the reason is about must not be the faintest ink
    //    on the field. --ds-text-disabled is contrast-exempt (1.91:1 light / 3.01:1 dark) — fine for an
    //    inert control, not for a name the user is being asked to reason about. Hard-disable dims it
    //    (asserted in DisabledWithoutReasonStaysNative); soft-disable must not.
    const label = canvasElement.querySelector<HTMLElement>(".rt-ds-field-label")!;
    if (!label) throw new Error("expected a Field.Label to measure");
    const labelColor = parseColor(getComputedStyle(label).color);
    const strong = resolveColor(label, "--ds-text-strong");
    const dim = resolveColor(label, "--ds-text-disabled");
    if (labelColor.r === dim.r && labelColor.g === dim.g && labelColor.b === dim.b) {
      throw new Error("a soft-disabled control must NOT dim its label — the reason needs a readable name to attach to");
    }
    if (labelColor.r !== strong.r || labelColor.g !== strong.g || labelColor.b !== strong.b) {
      throw new Error(`a soft-disabled label must stay --ds-text-strong (got ${getComputedStyle(label).color})`);
    }
    input.blur(); // return to a clean state (close the tooltip) before axe scans the story
  },
};

export const DisabledWithoutReasonStaysNative: Story = {
  render: () => (
    <Field.Root>
      <Field.Label>Workspace URL</Field.Label>
      <DisabledReasonControl disabled testid="hard" />
    </Field.Root>
  ),
  play: async ({ canvasElement }) => {
    const input = canvasElement.querySelector<HTMLInputElement>('[data-testid="hard"]');
    if (!input) throw new Error("disabled control did not render");
    // No reason ⇒ nothing to perceive ⇒ native disabled is correct (cheapest correct treatment).
    if (!input.disabled) throw new Error("disabled WITHOUT a reason must use native disabled");
    if (input.getAttribute("aria-disabled") === "true") throw new Error("hard-disable must NOT set aria-disabled");
    if (input.readOnly) throw new Error("hard-disable must NOT set readOnly");
    if (canvasElement.querySelector("[data-disabled-reason]")) throw new Error("no reason ⇒ no tooltip wrapper");
    if (canvasElement.querySelector("svg")) throw new Error("no reason ⇒ no Info glyph");
    // The label goes off WITH the control. Nothing here is readable-for-a-purpose — there is no reason to
    // read — so the name takes the inactive role, the other half of the split asserted next door.
    const label = canvasElement.querySelector<HTMLElement>(".rt-ds-field-label")!;
    if (!label) throw new Error("expected a Field.Label to measure");
    const got = parseColor(getComputedStyle(label).color);
    const want = resolveColor(label, "--ds-text-disabled");
    if (got.r !== want.r || got.g !== want.g || got.b !== want.b) {
      throw new Error(`a natively-disabled control must dim its label to --ds-text-disabled (got ${getComputedStyle(label).color})`);
    }
  },
};
