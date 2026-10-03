import { createContext, useContext, useId, type ComponentProps, type ComponentType, type ReactNode } from "react";
import { Box, Flex, Text, VisuallyHidden } from "@radix-ui/themes";
import type { Responsive } from "@radix-ui/themes/props";
import { useResolvedSize } from "../../theme/SizeContext";
import { WarningCircle, Warning, CheckCircle, Info, type IconProps } from "@phosphor-icons/react";
import { Tooltip } from "./Tooltip";
import { useFormLayoutDirection, type FormLayoutDirection } from "./FormLayout";

type Tone = "error" | "warning" | "success" | "info";
type Validation = { tone: Tone; message: ReactNode };

/**
 * The size a Field shell is told its control resolved to — the CONTROL lane's step, in the same shape
 * the control's own `size` prop accepts, RESPONSIVE OBJECTS INCLUDED.
 *
 * It was `string`, which is why every Field-riding input whose `size` comes from a Radix prop type
 * (TextField / TextArea / Select / Checkbox) had to launder it through
 * `typeof resolvedSize === "string" ? resolvedSize : undefined` to compile — and a consumer passing
 * `size={{ initial: "1", md: "3" }}` therefore handed the shell `undefined` and left the LABEL on the
 * ambient tier while the control stepped with the breakpoint. Accepting the object is what lets the
 * label track the control it names (see Field.Label — Radix's `Text` resolves the object itself).
 */
export type FieldSize = Responsive<"1" | "2" | "3">;

// Per-tone status glyph. Colour is inherited via currentColor from the message Box's
// `color: var(--ds-text-{tone})` (== --ds-icon-{tone}, step-11) — no separate colour prop needed.
const TONE_ICON: Record<Tone, ComponentType<IconProps>> = {
  error: WarningCircle,
  warning: Warning,
  success: CheckCircle,
  info: Info,
};

// The helper/message text tracks the field size: a large (size-3) field gets a 14px (size-2)
// helper line; smaller fields stay 12px (size-1). The status glyph + line-height scale to match.
//
// KNOWN GAP — a RESPONSIVE size takes the base metrics. Two of these three outputs could follow a
// breakpoint object (`text` is a Radix `Text` size, which resolves one itself; `line` duplicates
// Radix's own per-step line-height), but `glyph` is a raw px number on the icon component and has no
// responsive form without moving it into CSS. Rather than ship a half-responsive row — a stepping
// font size under a pinned leading — the whole set stays on the base step. This is NOT a regression
// from forwarding responsive objects into the shell: before that, a responsive size reached here as
// `undefined` and took the same branch. Deciding what a responsive helper row should do is a ruling,
// not plumbing.
const helperMetrics = (size?: FieldSize) =>
  size === "3"
    ? ({ text: "2", line: "20px", glyph: 18 } as const)
    : ({ text: "1", line: "16px", glyph: 16 } as const);

type Ctx = {
  controlId: string;
  // The id carried by the rendered Field.Label. `htmlFor` only names a LABELABLE element, so a control
  // whose focusable part is a span (a role="slider" thumb) can't be named by the label at all — it needs
  // `aria-labelledby={labelId}`. Follows FieldGroup's existing labelId precedent (GroupCtx, below).
  labelId: string;
  messageId: string;
  descriptionId: string;
  hasDescription: boolean;
  invalid: boolean;
  validation?: Validation;
  size?: FieldSize;
};
const FieldCtx = createContext<Ctx | null>(null);
const useField = () => {
  const ctx = useContext(FieldCtx);
  if (!ctx) throw new Error("Field.* must be used inside <Field.Root>");
  return ctx;
};

/** Spread onto the control inside a Field.Root — wires id, aria-describedby, aria-invalid.
 *  The support-text slot shows EITHER the persistent description (calm guidance) OR the
 *  validation message (which REPLACES it, carrying corrective copy) — never both, so the
 *  field never reads as redundant helper + message. aria-describedby points to whichever
 *  is shown. */
function fieldAriaFrom(ctx: Ctx) {
  const describedBy = ctx.validation ? ctx.messageId : ctx.hasDescription ? ctx.descriptionId : undefined;
  return { id: ctx.controlId, "aria-describedby": describedBy, "aria-invalid": ctx.invalid || undefined } as const;
}

export function useFieldControl() {
  return fieldAriaFrom(useField());
}

/** Optional variant — the Field aria when the control is inside a Field.Root, else null. For controls
 *  that are also used standalone (e.g. a bare Select with its own external label). */
export function useOptionalFieldControl() {
  const ctx = useContext(FieldCtx);
  return ctx ? fieldAriaFrom(ctx) : null;
}

/** The id of the rendered `Field.Label`, or null outside a Field.Root. For a control whose focusable
 *  part is NOT a labelable element (a `role="slider"` span), `htmlFor` is a silent no-op — such a
 *  control names itself with `aria-labelledby={useOptionalFieldLabelId()}` instead. Returns the id
 *  whether or not a Label was rendered; an unresolvable `aria-labelledby` is ignored by the accessible-
 *  name computation, which then falls through to `aria-label`. */
export function useOptionalFieldLabelId() {
  return useContext(FieldCtx)?.labelId ?? null;
}

// ===== Field horizontal-labels amendment (DECISIONS [[horizontal-field-labels]]) =============================================
// [[horizontal-field-labels]] amends [[field-shell]]: Field.Root gains a `direction` mode (see DECISIONS.md).
//   Field.Root gains a `direction: "vertical" | "horizontal"` mode. VERTICAL (default) is the historic
//   shape — label stacked over the control (an unchanged `Flex direction="column" gap="1"`). HORIZONTAL
//   lays the label in a LEFT COLUMN beside the control: a CSS grid `grid-template-columns: auto 1fr`
//   (label track + control track), the label vertically centred to the control's row; the
//   description/message sit in the CONTROL column (second track), never under the label. The mode
//   resolves in order: explicit `direction` prop → the ambient FormLayout context (D9) → `"vertical"`,
//   and is threaded to the Root as `data-direction`. So every Field-riding input (TextField / Select /
//   TextArea / …) inherits horizontal labels for FREE inside a horizontal FormLayout — no per-input
//   plumbing. The grid COLLAPSES to a single stacked column at ≤480px via a CSS `@media (max-width:480px)`
//   query — NOT JS (page chrome must be SSR-sane; a layout that needs JS to be correct isn't). All layout
//   lives in components.css (`.radix-themes`-scoped, no `!important`, ZERO net-new tokens — it reuses the
//   `--space-*` scale); the only net-new is the direction context + the grid rules. Vertical Field is
//   byte-identical in render to before (no `[data-direction="horizontal"]` rule matches a vertical field;
//   the inert `data-direction="vertical"` attribute changes no pixels).
function Root({ validation, description, size, direction, children }: { validation?: Validation; description?: ReactNode; size?: FieldSize; direction?: FormLayoutDirection; children: ReactNode }) {
  const base = useId();
  // Resolution order: explicit prop wins; else inherit the FormLayout direction; else "vertical".
  const inherited = useFormLayoutDirection();
  const resolvedDirection: FormLayoutDirection = direction ?? inherited ?? "vertical";
  const ctx: Ctx = {
    controlId: `${base}-control`,
    labelId: `${base}-label`,
    messageId: `${base}-msg`,
    descriptionId: `${base}-desc`,
    hasDescription: description != null,
    invalid: validation?.tone === "error",
    validation,
    size,
  };
  return (
    <FieldCtx.Provider value={ctx}>
      <Flex direction="column" gap="1" data-validation={validation?.tone} data-direction={resolvedDirection}>{children}</Flex>
    </FieldCtx.Provider>
  );
}

function Label({ info, endSlot, children }: { info?: ReactNode; endSlot?: ReactNode; children: ReactNode }) {
  const { controlId, labelId, size: fieldSize } = useField();
  // The label shares the step with the control it names: the field's own resolved size when the
  // control carries one (the context is how Description/Message already read it), the ambient text
  // lane otherwise. It was a hard-coded size-2 — one step ABOVE the control at the small tier, one
  // BELOW at large; and reading only the ambient lane inverted the same pair on explicitly-sized fields.
  // No cast: FieldSize is a Responsive<"1"|"2"|"3">, which IS a TextSize, so a responsive field size
  // reaches Radix's Text intact and the label steps at the same breakpoints as the control it names.
  // The cast this replaced was load-bearing only while the shell's size was typed `string`.
  type TextSize = ComponentProps<typeof Text>["size"];
  const labelSize = useResolvedSize<TextSize>("text", fieldSize);
  // data-field-part="label" is the grid hook the horizontal-labels CSS keys off (components.css): in a
  // horizontal Field.Root the label is placed in the auto (left) track and everything else in the 1fr
  // control track. Inert in vertical mode — no rule matches it there, so this is a zero-regression marker.
  //
  // The paint lives in CSS (.rt-ds-field-label), not on a style prop, because the label's colour is a
  // function of the CONTROL's state, not a constant: an inline `color` would be unbeatable by the
  // disabled rule (inline wins the cascade over any non-!important selector, and !important is out).
  // See the "Disabled field label" block in components.css.
  return (
    <Flex data-field-part="label" align="center" justify="between" gap="2" style={{ minHeight: 20 }}>
      <Flex align="center" gap="1" style={{ minWidth: 0 }}>
        <Text id={labelId} as="label" htmlFor={controlId} size={labelSize} weight="medium" className="rt-ds-field-label">
          {children}
        </Text>
        {info}
      </Flex>
      {endSlot}
    </Flex>
  );
}

// ---- Shared support-text renderers (used by both Field.* and FieldGroup.*) -----------------
// A calm helper line in a weak neutral tone (never a semantic colour) so it reads as context.
//
// The COLOUR is declared in the stylesheet (`[data-field-part="description"]`, tokens/components.css),
// not inline. Both lines are the same paint from the same role; the difference is that an inline value
// is indistinguishable from one a docs page painted onto a probe, so a value read back off this element
// could never be accepted as the component's own — which took the description and message rows of every
// control that rides this shell out of verification. The size-dependent metrics stay inline: they are
// computed from the field's size, not a token.
export function HelperLine({ id, size, children }: { id?: string; size?: FieldSize; children: ReactNode }) {
  const m = helperMetrics(size);
  return (
    <Text id={id} data-field-part="description" size={m.text}
          style={{ lineHeight: m.line, textWrap: "pretty" }}>
      {children}
    </Text>
  );
}

// A validation row: status glyph + message, painted from the accent-aware family token. The glyph
// is aria-hidden (the message text + role="alert"/aria-invalid carry the SR signal); align="start"
// keeps the glyph top-aligned to the first line of a wrapping message; text-wrap:pretty avoids an
// orphan on the last wrapped line.
// `data-field-part="message"` + `data-tone` are the hooks the per-tone colour rule keys off
// (tokens/components.css) — self-contained, so a StatusLine still paints correctly outside a
// Field.Root, where there is no ancestor [data-validation] to inherit the tone from.
export function StatusLine({ id, tone, size, role, children }: { id?: string; tone: Tone; size?: FieldSize; role?: string; children: ReactNode }) {
  const Glyph = TONE_ICON[tone];
  const m = helperMetrics(size);
  return (
    <Flex asChild align="start" gap="1">
      <Box id={id} role={role} data-field-part="message" data-tone={tone}>
        <Glyph size={m.glyph} weight="fill" aria-hidden style={{ flexShrink: 0 }} />
        <Text size={m.text} style={{ color: "inherit", lineHeight: m.line, textWrap: "pretty" }}>{children}</Text>
      </Box>
    </Flex>
  );
}

function Description({ children }: { children: ReactNode }) {
  // The validation message REPLACES the description when a state is active (the message becomes the
  // corrective helper), so the field never stacks redundant helper + message. Renders nothing when
  // empty or when validation has taken over the support-text slot.
  const { descriptionId, validation, size } = useField();
  if (children == null || validation != null) return null;
  return <HelperLine id={descriptionId} size={size}>{children}</HelperLine>;
}

function Message() {
  const { messageId, validation, size } = useField();
  if (!validation) return null;
  return (
    <StatusLine id={messageId} tone={validation.tone} size={size}
                role={validation.tone === "error" ? "alert" : undefined}>
      {validation.message}
    </StatusLine>
  );
}

export const Field = { Root, Label, Description, Message };

// ===== Soft-disable-with-reason (D8 / DECISIONS [[disabled-reason]]) — a SHARED Field-family affordance ==============
// Built ONCE here so every Field-riding input (DateInput / TimeInput / NumberInput / FileInput /
// Tokenizer) gets it identically. The problem it solves: a natively-`disabled` control drops out of the
// accessibility tree and receives NO hover or focus, so it can never carry a *perceivable* reason for
// being off. So when — AND ONLY WHEN — a control is `disabled` with a non-empty `disabledReason`, we
// SOFT-disable instead:
//   • the control gets aria-disabled="true" + readOnly (NOT native `disabled`) → it stays focusable /
//     tabbable, so hover AND keyboard focus can surface the reason;
//   • its control-CONTAINER (not the input) is wrapped in the System `<Tooltip content={reason}>`
//     (the wrap over Radix's Tooltip — solid panel per [[floating-surface-fill]], popper-tier motion; it replaced the raw
//     primitive once Tooltip was ported, DECISIONS [[disabled-reason]] changelog);
//   • a persistent, visually-hidden reason node (id = reasonId) backs aria-describedby, so AT reads the
//     reason even BEFORE the tooltip opens (Radix wires describedby only while the tooltip is open);
//   • a quiet, aria-hidden Info glyph in the trailing slot is the visual "there's a reason here" cue —
//     aria-hidden because the reason itself already travels via aria-describedby (no double-announce);
//   • it is deliberately NOT aria-invalid — a reason is guidance, not an error, and must not borrow the
//     error vocabulary.
// The dimming is REUSED, not re-declared: Radix folds `:read-only` into its own `:disabled` skin (same
// gray-a2 fill, gray-a6 border, gray-a11 text), so a readOnly field already looks identical to a
// hard-disabled one. The only net-new CSS is the `not-allowed` cursor over the [data-disabled-reason]
// wrapper (components.css). ZERO net-new tokens.
//
// CONSUMER CONTRACT: the input owns EARLY-RETURNING its edit / keydown / focus side-effect handlers while
// `soft` is true — readOnly stops native typing, but a custom control's click / step / paste / open
// handlers must bail themselves (check `dr.soft`).
//
// Usage (call from a component rendered INSIDE Field.Root, so the field aria resolves):
//   const fieldAria = useFieldControl();
//   const dr = useDisabledReason({ disabled, disabledReason });
//   // MERGE the reason id with any field-level describedby (validation / description):
//   const describedBy = [fieldAria["aria-describedby"], dr.soft ? dr.reasonId : undefined]
//     .filter(Boolean).join(" ") || undefined;
//   return (
//     <DisabledReasonTooltip {...dr.tooltip}>
//       <TheControl {...fieldAria} {...dr.controlProps} aria-describedby={describedBy}>
//         {leadingSlots}
//         {dr.showGlyph && <TextField.Slot side="right"><DisabledReasonGlyph size={glyphSize} /></TextField.Slot>}
//       </TheControl>
//     </DisabledReasonTooltip>
//   );

type DisabledReasonControlProps = {
  "aria-disabled"?: true;
  readOnly?: true;
  disabled?: true;
  "aria-describedby"?: string;
};

/** The soft-disable primitive. Returns the control wiring + tooltip props + glyph flag for a
 *  Field-riding input. See the block comment above and DECISIONS [[disabled-reason]]. */
export function useDisabledReason({ disabled, disabledReason }: { disabled?: boolean; disabledReason?: string }) {
  const reasonId = useId();
  const reason = disabledReason && disabledReason.trim() ? disabledReason : undefined;
  const soft = Boolean(disabled && reason);
  // Soft ⇒ aria-disabled + readOnly (+ a convenience describedby=reasonId for a control with no other
  // describedby; a Field control that ALSO carries validation/description describedby must MERGE reasonId,
  // see the usage note). Hard (disabled, no reason) ⇒ native disabled — nothing to perceive, so the
  // cheapest correct treatment. Neither ⇒ nothing.
  const controlProps: DisabledReasonControlProps = soft
    ? { "aria-disabled": true, readOnly: true, "aria-describedby": reasonId }
    : disabled
      ? { disabled: true }
      : {};
  return {
    /** A non-empty reason is present ⇒ soft-disable is active (aria-disabled + readOnly + tooltip + glyph). */
    soft,
    /** Native disabled is in effect (disabled with no reason). */
    hardDisabled: Boolean(disabled) && !soft,
    /** The trimmed reason, or undefined when not soft. */
    reason,
    /** id of the persistent hidden reason node — the aria-describedby target. */
    reasonId,
    /** Spread on the control element (input / trigger / button). */
    controlProps,
    /** Render the trailing Info glyph? (true iff soft). */
    showGlyph: soft,
    /** Spread onto <DisabledReasonTooltip> to wrap the control container. */
    tooltip: { soft, reason, reasonId } as const,
  };
}

/** Wraps a soft-disabled control's CONTAINER in the reason Tooltip and emits the persistent, visually-
 *  hidden reason node (the aria-describedby target — present even while the tooltip is closed). Renders
 *  children unchanged when not soft, so a consumer can wrap unconditionally. The [data-disabled-reason]
 *  attribute is the CSS hook for the `not-allowed` cursor (components.css, [[disabled-reason]]). The Tooltip opens on
 *  hover (pointer) and on keyboard focus (focusin bubbles from the inner focusable to this wrapper). */
export function DisabledReasonTooltip({ soft, reason, reasonId, children }: { soft: boolean; reason?: string; reasonId: string; children: ReactNode }) {
  if (!soft || !reason) return <>{children}</>;
  return (
    <Tooltip content={reason}>
      <Box data-disabled-reason="" style={{ display: "block" }}>
        {children}
        <VisuallyHidden id={reasonId}>{reason}</VisuallyHidden>
      </Box>
    </Tooltip>
  );
}

/** The quiet trailing affordance: a regular-weight Info glyph in the neutral icon tone, aria-hidden (the
 *  reason is announced via aria-describedby, not the glyph). Drop it in the control's trailing slot. */
export function DisabledReasonGlyph({ size = 16 }: { size?: number }) {
  return <Info size={size} weight="regular" aria-hidden style={{ color: "var(--ds-icon-neutral)", display: "block" }} />;
}

// ===== FieldGroup — group label + validation chrome for GROUP controls (CheckboxGroup / RadioGroup) =====
// A group is a set of related options, not a single control: the name is a group LABEL (a Text — we ship
// no <fieldset>, so there is no real <legend>), validation lives once at the bottom, and aria-invalid is
// NEVER set on the group (not meaningful on role=group/radiogroup; it over-announces on every item). The
// group reads as "has an error" via the LABEL adopting the family colour + the status glyph + the message.
type GroupCtx = {
  labelId: string;
  messageId: string;
  descriptionId: string;
  hasDescription: boolean;
  validation?: Validation;
  size?: FieldSize;
};
const FieldGroupCtx = createContext<GroupCtx | null>(null);

/** Optional — the FieldGroup context if the consumer is inside one, else null. Group controls
 *  (CheckboxGroup/RadioGroup) and their items read this to auto-wire aria only when wrapped. */
export const useOptionalFieldGroup = () => useContext(FieldGroupCtx);

const useGroup = () => {
  const ctx = useContext(FieldGroupCtx);
  if (!ctx) throw new Error("FieldGroup.* must be used inside <FieldGroup.Root>");
  return ctx;
};

function groupAriaFrom(ctx: GroupCtx) {
  const describedBy = ctx.validation ? ctx.messageId : ctx.hasDescription ? ctx.descriptionId : undefined;
  return { "aria-labelledby": ctx.labelId, "aria-describedby": describedBy } as const;
}

/** Spread onto the group root (the role=group/radiogroup container) — names it from the label and
 *  points it at the active support text. aria-invalid is intentionally omitted (see note above). */
export function useFieldGroupControl() {
  return groupAriaFrom(useGroup());
}

/** For OUR group wrappers (CheckboxGroup/RadioGroup): the group aria when inside a FieldGroup, else
 *  null — so a group used standalone behaves exactly as before. Context is read unconditionally. */
export function useOptionalFieldGroupControl() {
  const ctx = useOptionalFieldGroup();
  return ctx ? groupAriaFrom(ctx) : null;
}

/** For a group ITEM control: combine the caller's aria-describedby + an optional per-item description
 *  id + the group-level message id. The group message is appended so that a checkbox/radio tab stop
 *  announces a pre-existing group error (role="alert" only fires on the message's APPEARANCE). */
export function useGroupItemDescribedBy(caller: string | undefined, descId: string | undefined) {
  const group = useOptionalFieldGroup();
  const groupMsgId = group?.validation ? group.messageId : undefined;
  return [caller, descId, groupMsgId].filter(Boolean).join(" ") || undefined;
}

/** A group item's text slot: the label, plus an optional secondary description line beneath it. The
 *  description sits inside the item's text slot (already indented past the control), weak neutral tone,
 *  scaled to the group size. The control top-aligns to the title via the [data-field-item-desc] hook
 *  in components.css (the item label is otherwise centre-aligned, which mis-aligns a two-line option).
 *
 *  The colour is declared in CSS (.rt-ds-field-item-desc) because it has to follow the item's state, not
 *  just the role: when the item is switched off its title dims, and a supporting line still at full
 *  strength beneath a dimmed title inverts the pair — the smaller, secondary line reads as the louder of
 *  the two. It is a separate class rather than the shared [data-field-part="description"] because that
 *  attribute is a query target for the FIELD-level helper line in several stories, and an item
 *  description answering those queries would change what they measure. Size metrics stay inline: they
 *  are computed from the group's size, not a token. */
export function GroupItemBody({ descId, description, children }: { descId: string; description?: ReactNode; children: ReactNode }) {
  const group = useOptionalFieldGroup();
  // Unconditional (hooks rule) and a real fix: with no FieldGroup ancestor, `group` is null and the
  // description was pinned to the size-1 metrics forever — it never stepped up at the large tier.
  const lane = useResolvedSize("text", undefined);
  if (description == null) return <>{children}</>;
  const m = helperMetrics(group?.size ?? lane);
  return (
    <span data-field-item-desc style={{ display: "flex", flexDirection: "column", gap: "var(--ds-space-2)" }}>
      <span>{children}</span>
      <Text id={descId} size={m.text} className="rt-ds-field-item-desc" style={{ lineHeight: m.line, textWrap: "pretty" }}>
        {description}
      </Text>
    </span>
  );
}

function GroupRoot({ validation, description, size, children }: { validation?: Validation; description?: ReactNode; size?: FieldSize; children: ReactNode }) {
  const base = useId();
  const ctx: GroupCtx = {
    labelId: `${base}-label`,
    messageId: `${base}-msg`,
    descriptionId: `${base}-desc`,
    hasDescription: description != null,
    validation,
    size,
  };
  // FieldGroup.Root is a plain layout container — deliberately NOT a <fieldset> and NOT role=group.
  // The single grouping role comes from the Radix group inside (role=group / radiogroup), named via the
  // label's id + aria-labelledby. A <fieldset> (role=group) around Radix's own group/radiogroup
  // double-groups the a11y tree — verified against the ARIA tree, so we use one named group instead.
  // Group-level validation is signalled by the LABEL turning the family colour (GroupLabel) plus the
  // message below the whole set — no shell tint/border (kept deliberately flat). data-validation is a
  // structural marker only.
  return (
    <FieldGroupCtx.Provider value={ctx}>
      <Flex direction="column" gap="1" data-field-group="" data-validation={validation?.tone}>
        {children}
      </Flex>
    </FieldGroupCtx.Provider>
  );
}

function GroupLabel({ info, endSlot, children }: { info?: ReactNode; endSlot?: ReactNode; children: ReactNode }) {
  const { labelId, validation, size: groupSize } = useGroup();
  // Shares the step with the group's controls — the group's own size when set, ambient otherwise
  // (see Field.Label's note; was a hard-coded size-2).
  const groupLabelSize = useResolvedSize<ComponentProps<typeof Text>["size"]>("text", groupSize as ComponentProps<typeof Text>["size"]);
  // The group's visible name — an id'd text element referenced by the inner group's aria-labelledby.
  // Not a <legend> (that needs a <fieldset>) and not a <label htmlFor> (that targets a single control).
  // The id sits on the name Text only, so aria-labelledby resolves to the clean name (not info/endSlot).
  // On a validation state the NAME adopts the family text colour — this is the group-level status
  // signal (the group has an error/warning/…), reinforced by the message below the whole set. The tone
  // rides `data-tone` and the paint is declared in CSS, for the same two reasons as Field.Label: an
  // inline colour can't be read back as the component's own, and it can't be overridden by the
  // "every control in this group is disabled" rule without !important.
  return (
    <Flex align="center" justify="between" gap="2" style={{ minHeight: 20 }}>
      <Flex align="center" gap="1" style={{ minWidth: 0 }}>
        <Text id={labelId} size={groupLabelSize} weight="medium" className="rt-ds-field-group-label" data-tone={validation?.tone}>{children}</Text>
        {info}
      </Flex>
      {endSlot}
    </Flex>
  );
}

function GroupDescription({ children }: { children: ReactNode }) {
  const { descriptionId, validation, size } = useGroup();
  if (children == null || validation != null) return null;
  return <HelperLine id={descriptionId} size={size}>{children}</HelperLine>;
}

function GroupMessage() {
  const { messageId, validation, size } = useGroup();
  if (!validation) return null;
  return (
    <StatusLine id={messageId} tone={validation.tone} size={size}
                role={validation.tone === "error" ? "alert" : undefined}>
      {validation.message}
    </StatusLine>
  );
}

export const FieldGroup = { Root: GroupRoot, Label: GroupLabel, Description: GroupDescription, Message: GroupMessage };
