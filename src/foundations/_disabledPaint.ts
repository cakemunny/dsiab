/* _disabledPaint — the assertion that a disabled control still LOOKS disabled ([[disabled-paint-arm]]).
 *
 * The defect it guards: a component rule that paints a control unconditionally outranks Radix's own
 * disabled skin, because `.radix-themes .rt-ds-thing` is (0,2,0) and loads after
 * `.rt-BaseButton:where(.rt-variant-ghost):where([data-disabled])` is (0,1,0). The control keeps its
 * live colours and the only surviving difference is `cursor: not-allowed`. A touch user never receives
 * a cursor, a keyboard user never receives one, and a pointer user only learns on hover — so the state
 * is carried on one channel that most people never see (WCAG 1.4.1).
 *
 * `cursor` is therefore deliberately NOT part of the comparison. Neither is `pointer-events`.
 *
 * Effective opacity multiplies every ancestor's, because a wrapper that dims the control (Carousel's
 * `.rt-ds-carousel-nav[data-hidden]`) is a legitimate way to carry the state and must count as a pass.
 *
 * Lives in its own module rather than in `_assert.ts`, which is already past the 400-line cap. */

/** The channels a person can actually see. Order is fixed so two readings compare as strings. */
export function paintOf(el: Element): string {
  const s = getComputedStyle(el);
  let opacity = 1;
  const filters: string[] = [];
  for (let n: Element | null = el; n && n !== document.documentElement; n = n.parentElement) {
    const cs = getComputedStyle(n);
    opacity *= Number.parseFloat(cs.opacity);
    if (cs.filter && cs.filter !== "none") filters.push(cs.filter);
  }
  return [
    `color=${s.color}`,
    `background=${s.backgroundColor}`,
    `border=${s.borderColor}`,
    `shadow=${s.boxShadow}`,
    `opacity=${opacity.toFixed(3)}`,
    `filter=${filters.join("+") || "none"}`,
  ].join("  ");
}

/**
 * Throw unless the disabled control paints differently from the enabled one.
 *
 * @param disabled The control in its disabled state.
 * @param enabled The same control in its enabled state.
 * @param label What the pair is, for the failure message.
 */
export function assertDisabledPaintDiffers(disabled: Element, enabled: Element, label: string): void {
  const off = paintOf(disabled);
  const on = paintOf(enabled);
  if (off !== on) return;
  const cursorOff = getComputedStyle(disabled).cursor;
  const cursorOn = getComputedStyle(enabled).cursor;
  throw new Error(
    `${label}: the disabled control paints exactly like the enabled one — ${off}. ` +
      `The only difference is cursor (${cursorOff} vs ${cursorOn}), which touch and keyboard users ` +
      `never receive. Add a [data-disabled] arm to the rule that paints it.`,
  );
}
