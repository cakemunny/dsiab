import {
  createContext,
  forwardRef,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ComponentProps,
  type ComponentPropsWithoutRef,
  type ElementRef,
} from "react";
import { Tabs as RadixTabs, TabNav } from "@radix-ui/themes";
import { useResolvedSize, useUISize, type UISize } from "../../theme/SizeContext";
import { accentColorProps, type AccentColor } from "../../theme/Provider";
import { useLinkComponent } from "./Link";

/* Tabs — a DUAL-surface wrap over BOTH of Radix Themes' tab primitives, so one module answers both
 * "switch the tab" jobs from a single import:
 *   • Root / List / Trigger / Content — PANEL tabs: peer views of ONE screen, content swapped in place
 *     (Radix `Tabs`). Nothing navigates; the panel below the tablist changes.
 *   • Nav (Nav.Root / Nav.Link) — LINK tabs that NAVIGATE to routes (Radix `TabNav`). Each link routes
 *     through `useLinkComponent()` so an app's framework Link (Next / React Router) is used, and the
 *     active one carries `aria-current="page"` — it's real navigation, not in-place switching.
 *
 * The 2-size clamp exception: Radix's Tabs.List / TabNav.Root `size` accepts ONLY "1" | "2" (default 2),
 * so the standard control lane (which maps large → "3") is OUT OF RANGE. Radix does NOT drop an
 * out-of-range enum — `extractProps` (@radix-ui/themes/dist/esm/helpers/extract-props.js) substitutes the
 * prop's own `default`, so an unclamped `large` would land on the tab list's default "2": a step nobody
 * asked for, picked by the vendor rather than by the lane. Tabs is therefore a documented two-size lane:
 * read the global uiSize and clamp to "1" | "2" so the landing is ours and explicit, and narrow the prop
 * type to TabsSize so an invalid step can't be passed in the first place — an explicit `size` still wins.
 * Applied on both List and Nav.
 *
 * WHERE the two steps land, and why (remapped 2026-07-31): the vendor's two tab-list steps are 32px
 * (`"1"`, `--tab-height: --space-6`) and 40px (`"2"`, `--space-7`) — the two boxes the CONTROL lane
 * resolves at medium and large (its steps 2 and 3 of 24 / 32 / 40). The TAB lane has no 24px step at
 * all, so a tab row can never sit beside a `small`-tier control at its own height; small is pinned to
 * the lowest box that exists. Two steps across three tiers leave one tier boundary silent whichever way
 * they are mapped, so the only real choice is WHICH boundary.
 *
 * It used to read { small: "1", medium: "2", large: "2" } — 32 / 40 / 40 — which put the silence on
 * medium → large: the uiSize toolbar moved and the tab row did not (the defect flagged in review), and at
 * medium a 40px tab row stood a full box above the 32px controls it shares a header with. It now reads
 * { small: "1", medium: "1", large: "2" } — 32 / 32 / 40 — so the row equals the control box at medium
 * (32 = 32) and at large (40 = 40), and its one visible step falls on medium → large, a boundary the
 * controls beside it also step on.
 *
 * BOX AND TYPE ARE TWO KNOBS HERE, NOT ONE. The vendor ships them welded: each `.rt-BaseTabList` size
 * class sets `--tab-height` AND `font-size`/`line-height`/`letter-spacing` in the same rule, and it pairs
 * each tab box with a label one step BELOW what the control lane pairs with that same box (measured: tab
 * "1" = 32px box + 12px label vs control step 2 = 32px + 14px; tab "2" = 40px + 14px vs control step 3 =
 * 40px + 16px). Taking the clamp above therefore ALSO took the vendor's type, and because small and
 * medium share the class `"1"`, both tiers rendered 12px labels — at medium, 12px tab labels beside 14px
 * body text, which is the row reading broken rather than merely small (flagged in review).
 * So the clamp is kept for the BOX and the TYPE is taken back onto OUR text lane: the wrap stamps the
 * TIER'S text step as `rt-ds-tablist-N` on the list, and that rung in components.css restates font-size /
 * line-height / letter-spacing at that step (the Calendar / Pagination / Breadcrumbs / ChatMessage rung
 * idiom — a component-qualified `.radix-themes`-scoped selector, which beats the vendor's
 * `:where()`-wrapped rule on specificity alone; no `!important`). The vendor class cannot carry this: it
 * reads `"1"` at BOTH small and medium, so it has no way to tell the two apart.
 * Landing, measured at `--scaling: 1`: 32px + 12px / 32px + 14px / 40px + 16px — the tab row now equals
 * the control row on BOTH axes at medium (32 = 32, 14 = 14) and at large (40 = 40, 16 = 16), and small
 * keeps the box floor the lane has no 24px step for.
 * An explicit `size` still wins the BOX, and the type stays on the text lane — pinning a step is a
 * statement about the row's height, not about the reader's type size.
 *
 * Keyboard + skin: the roving tabindex (arrow keys move between tabs, one Tab enters/leaves the tablist)
 * comes from the Radix primitives, and WHAT OPENS A TAB is this wrap's own ([[tabs-open-on-navigation]], below). The active-tab
 * underline reuses Radix's own tab skin, so the wrap declares NO `--ds-*` roles and adds no colour of
 * its own. */

/* ONLY NAVIGATION OPENS A TAB ([[tabs-open-on-navigation]], Radix #1047).
 *
 * Under its default automatic mode, Radix opens a tab on every focus event, whatever moved the focus.
 * VoiceOver moves keyboard focus as its cursor reads, so a VoiceOver user who read across the tab row
 * opened each tab on the way. Measured on the Keyboard page: a bare `focus()` on Activity, with no key
 * and no click, switched the panel from Overview to Activity.
 *
 * So Root holds the value, runs Radix in manual mode, and shares an activation context with each
 * Trigger. Trigger marks an unmodified arrow, Home, End, PageUp or PageDown keydown, the keys Radix's
 * roving focus moves on, and a focus that arrives while the mark stands opens that tab. A key that
 * Radix ignores, one with no focus intent for the list's orientation, drops the mark in a microtask.
 * Radix moves roving focus in a zero-delay timeout after the keydown, so the mark clears in a timeout
 * of its own NAV_MARK_MS later, and a focus from any later cursor move meets no mark. Enter, Space
 * and a pointer press open a tab through Radix's own manual handlers. A click that no press began,
 * the click VoiceOver sends on VO+Space and the click `element.click()` sends, opens its tab too. The
 * click that ends a pointer press, Enter or Space selects nothing, because Radix answered the press
 * already, the shape [[dropdown-assistive-click]] gives DropdownMenu. A consumer who passes `activationMode="manual"` keeps
 * manual, so arrows move focus only. An explicit `"automatic"` gets the behaviour above, not Radix's. */
const NAV_KEYS: Record<string, true> = {
  ArrowLeft: true,
  ArrowRight: true,
  ArrowUp: true,
  ArrowDown: true,
  Home: true,
  End: true,
  PageUp: true,
  PageDown: true,
};
const NAV_MARK_MS = 100;

interface TabsActivation {
  manual: boolean;
  markNavigation: () => void;
  takeNavigation: () => boolean;
  select: (value: string) => void;
}
const TabsActivationContext = createContext<TabsActivation | null>(null);

type TabsRootProps = ComponentProps<typeof RadixTabs.Root>;

function TabsRoot({ value: valueProp, defaultValue, onValueChange, activationMode, ...props }: TabsRootProps) {
  const [uncontrolled, setUncontrolled] = useState(defaultValue);
  const controlled = valueProp !== undefined;
  const value = controlled ? valueProp : uncontrolled;
  const setValue = useCallback(
    (next: string) => {
      if (!controlled) setUncontrolled(next);
      onValueChange?.(next);
    },
    [controlled, onValueChange],
  );
  const navigating = useRef(false);
  const timer = useRef<number | undefined>(undefined);
  useEffect(() => () => window.clearTimeout(timer.current), []);
  const activation = useMemo<TabsActivation>(
    () => ({
      manual: activationMode === "manual",
      markNavigation: () => {
        navigating.current = true;
        window.clearTimeout(timer.current);
        timer.current = window.setTimeout(() => {
          navigating.current = false;
        }, NAV_MARK_MS);
      },
      takeNavigation: () => {
        const marked = navigating.current;
        navigating.current = false;
        return marked;
      },
      select: (next) => {
        if (next !== value) setValue(next);
      },
    }),
    [activationMode, setValue, value],
  );
  return (
    <TabsActivationContext.Provider value={activation}>
      <RadixTabs.Root {...props} activationMode="manual" value={value ?? ""} onValueChange={setValue} />
    </TabsActivationContext.Provider>
  );
}

type TabsTriggerProps = ComponentPropsWithoutRef<typeof RadixTabs.Trigger>;

const TabsTrigger = forwardRef<ElementRef<typeof RadixTabs.Trigger>, TabsTriggerProps>(function TabsTrigger(
  { onPointerDown, onKeyDown, onFocus, onClick, ...props },
  ref,
) {
  const activation = useContext(TabsActivationContext);
  // A press that Radix already answered: a pointer gesture, or Enter or Space. The click that ends it
  // must not select a second time, or a controlled Root that re-renders late hears onValueChange twice.
  const pressed = useRef(false);
  const holdPress = (release: "pointerup" | "keyup") => {
    pressed.current = true;
    const events = release === "pointerup" ? ["pointerup", "pointercancel"] : ["keyup"];
    const clear = () => {
      for (const name of events) document.removeEventListener(name, clear, true);
      window.setTimeout(() => {
        pressed.current = false;
      }, 0);
    };
    for (const name of events) document.addEventListener(name, clear, true);
  };
  const handlePointerDown: TabsTriggerProps["onPointerDown"] = (event) => {
    onPointerDown?.(event);
    holdPress("pointerup");
  };
  const handleKeyDown: TabsTriggerProps["onKeyDown"] = (event) => {
    onKeyDown?.(event);
    if (!activation || event.defaultPrevented) return;
    if (event.key === "Enter" || event.key === " ") holdPress("keyup");
    if (activation.manual || event.metaKey || event.ctrlKey || event.altKey || event.shiftKey) return;
    if (!NAV_KEYS[event.key]) return;
    activation.markNavigation();
    // Radix's roving focus runs after this handler and prevents the default exactly when the key has
    // a focus intent. A key it ignores, ArrowUp in a horizontal list among them, drops the mark at once.
    queueMicrotask(() => {
      if (!event.isDefaultPrevented()) activation.takeNavigation();
    });
  };
  const handleFocus: TabsTriggerProps["onFocus"] = (event) => {
    onFocus?.(event);
    if (activation?.takeNavigation() && !props.disabled) activation.select(props.value);
  };
  const handleClick: TabsTriggerProps["onClick"] = (event) => {
    onClick?.(event);
    if (pressed.current) {
      pressed.current = false;
      return;
    }
    if (!activation || event.defaultPrevented || props.disabled) return;
    activation.select(props.value);
  };
  return (
    <RadixTabs.Trigger
      {...props}
      ref={ref}
      onPointerDown={handlePointerDown}
      onKeyDown={handleKeyDown}
      onFocus={handleFocus}
      onClick={handleClick}
    />
  );
});

/** The clamped Tabs size lane — the only two steps Radix's tab lists accept. */
export type TabsSize = "1" | "2";

const TAB_SIZE_CLAMP: Record<UISize, TabsSize> = { small: "1", medium: "1", large: "2" };

/** Resolve the tab-list size: an explicit step wins; otherwise the global uiSize CLAMPED to "1" | "2"
 *  (32 / 32 / 40 px — never the out-of-range "3" the raw control lane would return at large). */
function useClampedTabSize(explicit: TabsSize | undefined): TabsSize {
  const uiSize = useUISize();
  return explicit ?? TAB_SIZE_CLAMP[uiSize];
}

/** The TYPE hook, carried in the CLASS rather than in a `data-size` attribute — which is the one place
 *  this wrap has to diverge from the `rt-ds-x[data-size="N"]` rung idiom the rest of the system uses, and
 *  the DOM is why. `TabNav.Root` splits its props across TWO nodes: `className` goes to the inner
 *  `NavigationMenu.List` (the `.rt-BaseTabList` that carries the vendor's `rt-r-size-N` and paints the
 *  type), every other prop goes to the outer `<nav class="rt-TabNavRoot">`. A `data-size` attribute
 *  therefore lands one element ABOVE the element the rung has to select — verified in the rendered DOM,
 *  and in `@radix-ui/themes/src/components/tab-nav.tsx`. `className` is the only channel that reaches the
 *  same node on BOTH surfaces, so the step travels in it: one hook, one node, nothing stray left on a
 *  wrapper. The step is the tier's own TEXT step (1 / 2 / 3 → 12 / 14 / 16px), never the clamped box
 *  step, which reads "1" at small AND medium and so cannot tell the two tiers apart. */
function useTabListClass(className: string | undefined): string {
  const step = useResolvedSize<string>("text", undefined);
  return ["rt-ds-tablist", step && `rt-ds-tablist-${step}`, className].filter(Boolean).join(" ");
}

type RadixListProps = ComponentProps<typeof RadixTabs.List>;
type TabsListProps = Omit<RadixListProps, "size" | "color"> & {
  size?: TabsSize;
  /** Radix's 26 colours or the oxblood preset ([[part-colour-parity]]). */
  color?: AccentColor;
};

/** Panel tablist — the clamped 2-size BOX lane (small/medium → "1", large → "2") over the text lane's
 *  own TYPE step. */
function TabsList({ size, className, color, ...props }: TabsListProps) {
  return <RadixTabs.List size={useClampedTabSize(size)} className={useTabListClass(className)} {...accentColorProps(color)} {...props} />;
}

type RadixNavRootProps = ComponentProps<typeof TabNav.Root>;
type TabsNavRootProps = Omit<RadixNavRootProps, "size" | "color"> & {
  size?: TabsSize;
  /** Radix's 26 colours or the oxblood preset ([[part-colour-parity]]). */
  color?: AccentColor;
};

/** Navigation tablist — a `nav` of link tabs; rides the same box lane and the same type rungs as the
 *  panel list. */
function TabsNavRoot({ size, className, color, ...props }: TabsNavRootProps) {
  return <TabNav.Root size={useClampedTabSize(size)} className={useTabListClass(className)} {...accentColorProps(color)} {...props} />;
}

export interface TabsNavLinkProps extends Omit<ComponentProps<typeof TabNav.Link>, "asChild"> {
  /** The route this tab navigates to (routed through the app's framework Link via `useLinkComponent`). */
  href: string;
  /** The current route — draws the active underline (`data-active`) and sets `aria-current="page"`. */
  active?: boolean;
}

/** A link tab that NAVIGATES. Renders `TabNav.Link asChild` around the resolved framework Link so the
 *  app's router handles the click; the active link carries `aria-current="page"`. */
function TabsNavLink({ active = false, href, children, ...rest }: TabsNavLinkProps) {
  const LinkComponent = useLinkComponent();
  return (
    <TabNav.Link asChild active={active}>
      <LinkComponent {...rest} href={href} aria-current={active ? "page" : undefined}>
        {children}
      </LinkComponent>
    </TabNav.Link>
  );
}

/** Nav surface — usable as `<Tabs.Nav>` (the root) with `<Tabs.Nav.Link>` children; `Nav.Root` is the
 *  same component under an explicit name for symmetry with the panel `Root`. */
const Nav = Object.assign(TabsNavRoot, { Root: TabsNavRoot, Link: TabsNavLink });

export const Tabs = {
  Root: TabsRoot,
  List: TabsList,
  Trigger: TabsTrigger,
  Content: RadixTabs.Content,
  Nav,
};
