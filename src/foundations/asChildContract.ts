/* =============================================================================
   asChildContract.ts — WHAT `asChild` HANDS OVER, AND WHAT NOTHING CAN HOLD
   -----------------------------------------------------------------------------
   `asChild` is the composition seam. It is also the one prop in this system that
   can void a published guarantee with no error, no type failure and no visible
   difference on the page. This file is the law of that seam, and the detector
   that makes the failure loud.

   WHY IT CAN VOID A GUARANTEE. Radix `Slot` merges with

       mergeProps(slotProps, childProps) -> { ...slotProps, ...overrideProps }

   where `overrideProps` starts as a copy of the CHILD's props. Read at
   `node_modules/@radix-ui/react-slot/dist/index.mjs` on 2026-09-21. Three
   props are combined rather than replaced:

       className  concatenated, both survive
       style      shallow-merged, the child wins per key
       on*        chained, the child runs first and the system runs after

   EVERYTHING ELSE IS TAKEN FROM THE CHILD WHERE THE CHILD DECLARES IT. So the
   paint survives a swap, which is the trap: a component that hands its element
   away still looks exactly right while `role`, `tabIndex`, `type`, `disabled`
   and every `aria-*` it declared have been silently replaced by the consumer's.

   THE THREE FAILURES THIS DETECTS, AND WHY EACH ONE IS SILENT.

     1. SHAPE. Not exactly one element child. `Slot` throws
        "Slot failed to slot onto its children..." from inside `node_modules`,
        naming no component and no file. Zero children is worse: `Slot` returns
        the children unchanged, so the component vanishes from the page with no
        error at all.
     2. OPERABILITY. A keyboard-operable element replaced by one that is not.
        A `<div>` has no keyboard activation, no `:focus-visible` (so the [[focus-ring]]
        focus ring never fires, because it is keyed to Radix's own focus
        selector), no disabled state, and as an inline or contentless box it can
        fall under the >=24x24 pointer floor GUIDELINES section 9 claims. Every
        one of those is a WCAG 2.2 AA guarantee this system publishes, and the
        page still paints correctly.
     3. OVERRIDE. The child declares a prop the component's contract depends on,
        and wins the merge. `<StatusDot asChild><span role="presentation"/>` is a
        status indicator that no longer exists to assistive technology.

   WHAT THIS DELIBERATELY DOES NOT DO: repair. Re-applying the system's props
   after the merge would make `asChild` mean "your props are honoured, except
   the ones we quietly take back", which is a second silent failure pointed the
   other way. Handing the element over IS handing the responsibility over. The
   job here is to make that loud and early, never to pretend it is safe.

   WHY A PLAIN RENDER-TIME FUNCTION RATHER THAN A `Slot` WRAPPER. The 72
   Radix-backed components never render `Slot` themselves, they forward the prop
   and Radix renders it. A wrapper would reach only the custom group. A call
   during render reaches both, runs under `renderToString` with no DOM (so the
   guard beside this file needs no browser), and degrades to nothing in
   production through `DEV_WARN`.

   ONE WARNING PER COMPONENT PER CAUSE PER PAGE, through `warnOnce`. A list of
   forty rows would bury the one line that matters, and this runs on every
   render of every component in the seam.
   ============================================================================= */
import { Children, isValidElement, type ReactElement, type ReactNode } from "react";
import { DEV_WARN, warnOnce } from "../theme/detectAndWarn";

/* ------------------------------------------------------------------------------------------------
   THE TAG LAW — which elements are keyboard-operable on their own
   ---------------------------------------------------------------------------------------------- */

/** Operable with no author help. Deliberately short: this is the set whose keyboard behaviour,
 *  focus ring and disabled state the browser supplies, not a list of everything focusable.
 *  `iframe` and `[contenteditable]` are focusable and are not controls, so neither is here. */
export const OPERABLE_TAGS: Readonly<Record<string, true>> = {
  button: true, input: true, select: true, textarea: true, summary: true,
};

/** Operable only WITH an `href`. An anchor without one is not focusable and not activatable by
 *  keyboard, which is the swap that looks most correct and is not: `<Button asChild><a onClick=…>`
 *  reads as a link, paints as a button, and cannot be reached by Tab. */
export const OPERABLE_WITH_HREF: Readonly<Record<string, true>> = { a: true, area: true };

/** Does the component's OWN element carry keyboard operability? Unconditional for `a`, because the
 *  system builds that element and a System link always has its `href`. The child form below is the
 *  conditional one, and the asymmetry is the whole point: what we render is known good, what we are
 *  handed is not. */
export function declaresOperable(tag: string): boolean {
  return OPERABLE_TAGS[tag] === true || OPERABLE_WITH_HREF[tag] === true;
}

/** Does the element a consumer handed over carry keyboard operability? `role` plus `tabIndex` is an
 *  explicit acceptance of responsibility by the consumer and passes, which is what keeps this from
 *  being noise on a deliberate, correct swap. */
export function rendersOperable(tag: string, props: Readonly<Record<string, unknown>>): boolean {
  if (OPERABLE_TAGS[tag] === true) return true;
  if (OPERABLE_WITH_HREF[tag] === true) {
    const href = props.href;
    return href !== undefined && href !== null && href !== "";
  }
  return typeof props.role === "string" && props.role !== "" && props.tabIndex !== undefined;
}

/* ------------------------------------------------------------------------------------------------
   THE CONTRACT A COMPONENT DECLARES AT THE SEAM
   ---------------------------------------------------------------------------------------------- */

export interface AsChildContract {
  /** The tag this component renders when `asChild` is absent, e.g. `"button"`. */
  element: string;
  /** The props this component's published contract depends on, as it would set them. Anything a
   *  consumer can override without consequence stays out: this is the a11y-load-bearing set
   *  (`role`, `tabIndex`, `type`, `disabled`, `aria-*`), not everything the component passes. */
  owns?: Readonly<Record<string, unknown>>;
}

export interface AsChildViolation {
  /** Stable key, `aschild:<component>:<cause>`. Also the `warnOnce` de-duplication key. */
  cause: string;
  /** The line a consumer reads in the console, without the `[dsiab] ` prefix. */
  message: string;
}

const NONE: readonly AsChildViolation[] = [];

/* ------------------------------------------------------------------------------------------------
   RESOLVING THE ELEMENT SLOT WILL ACTUALLY CLONE
   ---------------------------------------------------------------------------------------------- */

/** Radix marks `Slottable` with a GLOBAL registry symbol, which is the mechanism that makes the
 *  mark readable across copies of the package. Reading it here is what lets a component with a
 *  `Slottable` keep several children without this detector calling that a shape defect. */
const SLOTTABLE_IDENTIFIER = Symbol.for("radix.slottable");

function isSlottable(node: ReactNode): node is ReactElement<Record<string, unknown>> {
  if (!isValidElement(node)) return false;
  const type: unknown = node.type;
  if (typeof type !== "function" || !("__radixId" in type)) return false;
  return type.__radixId === SLOTTABLE_IDENTIFIER;
}

/** Mirrors `Slot`'s own resolution rather than approximating it, so what is inspected is the
 *  element Slot will clone. A holder array rather than a `let`, because a value assigned inside a
 *  callback is not narrowed by the compiler afterwards. */
function resolveTarget(children: ReactNode): { target: ReactElement | null; count: number } {
  const found: ReactElement[] = [];
  let count = 0;
  let sawSlottable = false;

  Children.forEach(children, (child) => {
    count += 1;
    if (!isSlottable(child)) return;
    sawSlottable = true;
    const props = child.props;
    const inner = "child" in props ? props.child : props.children;
    if (isValidElement(inner)) found.push(inner);
  });

  if (!sawSlottable && count === 1 && isValidElement(children)) found.push(children);
  return { target: found[0] ?? null, count };
}

/** A prop value as a reader would recognise it in their own source. */
function describe(value: unknown): string {
  if (typeof value === "string") return `"${value}"`;
  if (value === null) return "null";
  if (typeof value === "object") return "an object";
  if (typeof value === "function") return "a function";
  return String(value);
}

/* ------------------------------------------------------------------------------------------------
   THE DETECTOR
   ---------------------------------------------------------------------------------------------- */

/**
 * Call during render, ONLY when `asChild` is set. Returns every violation found, so a guard can
 * assert on the verdict rather than on the console, and warns once per component per cause per
 * page as a side effect.
 *
 * @param name      the component as a consumer writes it, e.g. `"Button"` or `"TopNav.Item"`
 * @param children  the children that will reach `Slot`
 * @param contract  what this component renders and what its contract depends on
 */
export function checkAsChild(
  name: string,
  children: ReactNode,
  contract: AsChildContract,
): readonly AsChildViolation[] {
  if (!DEV_WARN) return NONE;

  const found: AsChildViolation[] = [];
  const report = (cause: string, message: string) => {
    found.push({ cause: `aschild:${name}:${cause}`, message });
  };
  const { target, count } = resolveTarget(children);

  /* 1. SHAPE. */
  if (!target) {
    if (children || children === 0) {
      const got = count > 1 ? `${count} children` : "a child that is not an element";
      report(
        "shape",
        `\`<${name} asChild>\` was given ${got}. asChild renders your element in place of the ` +
          `component's own, so it needs exactly one React element child. Radix Slot throws on ` +
          `anything else, from inside node_modules, naming no component. Wrap them in one element, ` +
          `or use Slottable.`,
      );
    } else {
      report(
        "empty",
        `\`<${name} asChild>\` was given no children, so it renders nothing at all. asChild replaces ` +
          `the component's own element with yours, and there is no error for the case where there ` +
          `is no element to replace it with. Pass one element child, or drop asChild.`,
      );
    }
    return finish(found);
  }

  // React types `props` as `unknown` on an element whose component type is not known statically.
  // A plain bag is what it is, and every read below is a presence check before a value read.
  const childProps = (target.props ?? {}) as Record<string, unknown>;

  /* 2. OPERABILITY. Only an intrinsic tag can be judged here: a component child renders a tag this
        cannot see, which is stated in the guard and in the docs rather than guessed at. */
  if (typeof target.type === "string" && declaresOperable(contract.element)) {
    const tag = target.type;
    if (!rendersOperable(tag, childProps)) {
      const why = OPERABLE_WITH_HREF[tag] === true ? `an \`<${tag}>\` with no href` : `a \`<${tag}>\``;
      report(
        "operability",
        `\`<${name} asChild>\` was given ${why}, which is not keyboard-operable. ${name} renders ` +
          `\`<${contract.element}>\`, and keyboard activation, the focus ring, the disabled state ` +
          `and the 24x24 pointer floor all belong to that element. Slot merges className and style, ` +
          `so the swap still paints correctly and nothing else reports it. Give it a real ` +
          `interactive element, or put \`role\` and \`tabIndex\` on the child and own the keyboard ` +
          `behaviour yourself.`,
      );
    }
  }

  /* 3. OVERRIDE. */
  const owns = contract.owns;
  if (owns) {
    for (const prop of Object.keys(owns)) {
      if (!Object.prototype.hasOwnProperty.call(childProps, prop)) continue;
      if (childProps[prop] === owns[prop]) continue;
      report(
        `override:${prop}`,
        `\`<${name} asChild>\` was given a child that sets \`${prop}\`. Radix Slot merges the ` +
          `child's props OVER the component's for everything that is not className, style or an ` +
          `event handler, so ${describe(childProps[prop])} wins and ${name}'s own ` +
          `\`${prop}=${describe(owns[prop])}\` is dropped. Nothing about the rendered page shows ` +
          `this. Remove it from the child, or accept that the semantics are now yours.`,
      );
    }
  }

  return finish(found);
}

/** Warn each violation once per cause per page, then hand the list back. Kept separate from the
 *  detection so every exit path reports, and so a guard that wants the verdict does not have to
 *  read the console to get it. */
function finish(found: readonly AsChildViolation[]): readonly AsChildViolation[] {
  for (const v of found) warnOnce(v.cause, v.message);
  return found;
}
