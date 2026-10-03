/* Shared Storybook template kit — the System/* per-component story spine (History / Anatomy /
 * Usage / Props). Component stories import these primitives; component-specific bits (the
 * anatomy diagram, the token roles, the scenarios) stay in each *.stories.tsx. See DECISIONS [[docs-page-spine]]. */
import type { AnchorHTMLAttributes, ComponentProps, CSSProperties, ReactElement, ReactNode } from "react";
import { cloneElement, createContext, createElement, Fragment, isValidElement, useCallback, useContext, useLayoutEffect, useMemo, useRef, useState } from "react";
import { Box, Code, Flex, Grid, Heading, Table, Text, Theme } from "@radix-ui/themes";
import { Check, X } from "@phosphor-icons/react";
// The ruling ledger, read live so a citation can tell a real ruling name from a typo.
import decisionsMd from "../../../docs/DECISIONS.md?raw";
// Token-spec aliases are parsed from the real token CSS, so the table can't drift from the code.
import semanticCss from "../../tokens/semantic.css?raw";
import themeCss from "../../tokens/theme.css?raw";
import { ButtonGroup } from "./ButtonGroup";
import { Code as SystemCode } from "./Code";
import { Link } from "./Link";
/* The kit renders SYSTEM components, not private replicas of them. Kbd used to be hand-rolled here,
 * a frozen 12px `<kbd>`, which is how docs chrome ends up contradicting the components it documents
 * the moment the global uiSize moves. Its registry status is `ported`, so the kit uses it. */
import { Kbd } from "./Kbd";

/* ---- token alias map (parsed from the CSS source of truth) --------------- */
/* Kept for prose and for the legacy RoleRow/RenderedRow rows. The MEASURED row (below) treats the
   Radix alias as secondary context, not evidence — see the MEASURED TOKEN ROW block. */
export const TOKEN_ALIAS: Record<string, string> = {};
for (const css of [semanticCss, themeCss]) {
  for (const m of css.matchAll(/(--(?:ds|on)-[\w-]+)\s*:\s*var\((--[\w-]+)\)/g)) {
    if (!(m[1] in TOKEN_ALIAS)) TOKEN_ALIAS[m[1]] = m[2];
  }
}

/* ---- ruling citations ------------------------------------------------------
 * Outside the ledger a ruling is cited as `[[name]]`. Every string the kit renders on a story's
 * behalf goes through `linkRulings`, which turns each citation into a link to that ruling's row on
 * the Decisions page, with no brackets. The Decisions page reads `RULING_PARAM` from the top
 * window's query string to open and scroll to the row. */
export const RULING_PARAM = "ruling";

/** The Decisions page, opened on one ruling. Relative to the preview iframe, which sits beside the
 *  manager's own index, so `target="_top"` lands in the manager with the ruling selected. */
export function rulingHref(name: string): string {
  return `./?path=/story/foundations-decisions--decisions&${RULING_PARAM}=${encodeURIComponent(name)}`;
}

/** Every ruling name in the ledger: each `### name` heading of `docs/DECISIONS.md`. */
const RULING_NAMES: ReadonlySet<string> = new Set(
  [...decisionsMd.matchAll(/^### ([a-z0-9]+(?:-[a-z0-9]+)*)\s*$/gm)].map((m) => m[1]),
);

export function RulingLink({ name }: { name: string }) {
  return <Link href={rulingHref(name)} target="_top">{name}</Link>;
}

const CITATION = /\[\[([^[\]\n]+)\]\]/g;
const warned = new Set<string>();

/** One string, its citations replaced. Returns the string itself when it cites nothing, else one
 *  fragment, so a caller never receives a list it would have to key. */
function linkString(text: string): ReactNode {
  if (!text.includes("[[")) return text;
  const out: ReactNode[] = [];
  let last = 0;
  for (const m of text.matchAll(CITATION)) {
    const name = m[1].trim();
    if (m.index > last) out.push(text.slice(last, m.index));
    if (RULING_NAMES.has(name)) {
      out.push(<RulingLink name={name} />);
    } else {
      if (import.meta.env.DEV && !warned.has(name)) {
        warned.add(name);
        console.warn(`[dsiab] [[${name}]] names no ruling in docs/DECISIONS.md, so it renders as plain text.`);
      }
      out.push(name);
    }
    last = m.index + m[0].length;
  }
  if (last === 0) return text;
  if (last < text.length) out.push(text.slice(last));
  return createElement(Fragment, null, ...out);
}

/** Elements whose contents are code, never prose: a citation inside them stays as written. */
const VERBATIM = new Set<unknown>([Code, SystemCode, "code", "pre", "kbd"]);

/** Turn every `[[name]]` in rendered copy into a `RulingLink`. Accepts a string or React children,
 *  walks nested elements and clones only the ones whose children changed. Function children and the
 *  contents of a code element pass through untouched. A changed list comes back as one fragment
 *  whose children are spread, the way JSX writes static children, so no key warning follows. */
export function linkRulings(node: ReactNode): ReactNode {
  if (typeof node === "string") return linkString(node);
  if (Array.isArray(node)) {
    let changed = false;
    const out = node.map((child: ReactNode) => {
      const next = linkRulings(child);
      if (next !== child) changed = true;
      return next;
    });
    return changed ? createElement(Fragment, null, ...out) : node;
  }
  if (isValidElement(node)) {
    if (VERBATIM.has(node.type)) return node;
    const el = node as ReactElement<{ children?: ReactNode }>;
    const children = el.props.children;
    if (children === undefined || typeof children === "function") return node;
    const next = linkRulings(children);
    return next === children ? node : cloneElement(el, undefined, next);
  }
  return node;
}

/* ---- page chrome --------------------------------------------------------- */
export const Page = ({ maxWidth = "min(100%, 1040px)", children }: { maxWidth?: number | string; children: ReactNode }) => (
  <Flex direction="column" gap="6" p="5" style={{ maxWidth, background: "var(--ds-bg-base)" }}>{children}</Flex>
);

/** The one-sentence lead every Props story shares — 64 hand-typed copies of this sentence existed
 *  before it moved here; one source is the anti-drift mechanism (the Comparison-table rule). */
export const PropsLead = () => (
  <Caption>
    Drive this instance from the <strong>Controls</strong> panel; the full prop reference is below.
  </Caption>
);

// Page-level heading — the page's h1; Sections are h2 — plus a one/two-sentence standfirst,
// constrained to the reading measure. The spine of every page. standfirst is INLINE content only —
// it renders inside a <p>, so no block-level children.
//
// WHY h1, and why there is nothing to rank under: a story renders in the PREVIEW IFRAME, which is
// its own document. The manager's visually-hidden "Storybook" h1 (`.sb-sr-only`) lives in the PARENT
// document and never enters this one's heading tree, so it cannot outrank anything here. The only
// other h1s the preview document holds are Storybook's own hidden scaffolding — `.sb-nopreview_main`
// ("No Preview") and an empty `.sb-errordisplay_main` — both sealed inside `display: none` wrappers,
// so neither renders and neither reaches axe. That leaves the page title as the one rendered h1 of
// its document, which is what a reader landing on a bare `/iframe.html` URL needs: H1 page →
// H2 sections → H3 subsections, no level skipped and no borrowed root.
export function PageHeader({ title, standfirst }: { title: string; standfirst: ReactNode }) {
  return (
    <Box pb="5" style={{ borderBottom: "1px solid var(--ds-stroke-weak)" }}>
      <Heading as="h1" size="6" mb="2">{title}</Heading>
      <Text as="p" size="3" style={{ color: "var(--ds-text-weak)", maxWidth: "var(--ds-text-measure)", lineHeight: 1.6 }}>{linkRulings(standfirst)}</Text>
    </Box>
  );
}

export const Rule = () => <Box style={{ height: 1, width: "100%", background: "var(--ds-stroke-weak)" }} />;

export function Section({ title, lead, children }: { title: string; lead?: ReactNode; children: ReactNode }) {
  return (
    <Flex direction="column" gap="3">
      <Box>
        {/* h2 — one rung under the page title. A heading the CONTENT brings with it (an EmptyState
            or ClickableCard rendering its own) takes h3 under a Section; a nested Section stays h2 —
            Sections are peer bands, not an outline hierarchy. A SPECIMEN title is not document
            structure and takes bold <Text> instead, or it skips a level the moment the page's own
            tree moves. */}
        <Heading as="h2" size="3" mb="1">{title}</Heading>
        {lead && <Text as="p" size="2" style={{ color: "var(--ds-text-weak)", maxWidth: "var(--ds-text-measure)", lineHeight: 1.6 }}>{linkRulings(lead)}</Text>}
      </Box>
      {linkRulings(children)}
    </Flex>
  );
}

export const Caption = ({ children }: { children: ReactNode }) => (
  <Text size="1" style={{ color: "var(--ds-text-weak)", maxWidth: "var(--ds-text-measure)", lineHeight: 1.6 }}>{linkRulings(children)}</Text>
);

/* ---- size-lesson marker --------------------------------------------------- */
/* A docs specimen may pin a size step away from the ambient tier only when the pin IS the lesson —
 * a diagram whose callouts need fixed geometry, a deliberate size matrix, a measurement rig, an
 * inset affordance the component itself holds at a step. This marker states that reason
 * machine-readably; an undeclared pin in a docs story is a defect. Prefer putting the attribute on
 * an element the story already renders — this wrapper is for when there isn't one. It generates no
 * box (display: contents), so it never disturbs the layout it annotates. */
export const SizeLesson = ({ why, children }: { why: string; children: ReactNode }) => (
  <div data-size-lesson={why} style={{ display: "contents" }}>{children}</div>
);

export const Muted = ({ children }: { children: ReactNode }) => (
  <Text size="1" style={{ color: "var(--ds-text-weak)" }}>{linkRulings(children)}</Text>
);

/* ---- DemoLink: mute navigation in nav specimens (stories only) ------------ */
/* A story-only framework Link for the navigation specimens. It renders a REAL `<a>` — so hover, focus,
   keyboard roving, active/aria-current, tooltips, flyouts, and menus all behave exactly as they do in a
   product — but it SWALLOWS the click's navigation (`preventDefault`), so clicking a nav row in a docs
   story never navigates the Storybook iframe away and loses the chrome. It satisfies the `LinkComponent`
   contract (`{ href } & AnchorHTMLAttributes`), so wrapping a nav specimen in
   `<LinkProvider component={DemoLink}>` routes every provider-aware link (Item hrefs, SideNav rail leaves,
   TopNav brand + featured card, Outline entries, …) through it. It is scaffolding: the real components
   keep real navigation whenever no provider is present. */
export function DemoLink({ children, onClick, ...rest }: { href: string } & AnchorHTMLAttributes<HTMLAnchorElement>) {
  return (
    <a
      {...rest}
      onClick={(e) => {
        e.preventDefault();
        onClick?.(e);
      }}
    >
      {children}
    </a>
  );
}

/* ---- History: decision / changelog rows ---------------------------------- */
/** One History card. `id` reads `lead · title`: the lead carries the ruling name or names as
 *  `[[name]]` (or a plain label such as `0.9.0`), the title names what the card says. The header
 *  line shows the lead, with each name a link to its ruling, and the title beside it in weak ink. The
 *  card text sits below at the reading measure, its own citations linked the same way. */
export function Decision({ id, children }: { id: string; children: ReactNode }) {
  const cut = id.indexOf(" · ");
  const lead = cut < 0 ? id : id.slice(0, cut);
  const title = cut < 0 ? "" : id.slice(cut + 3);
  return (
    <Flex direction="column" gap="1" data-decision>
      <Flex wrap="wrap" align="baseline" gapX="2">
        <Text size="2" weight="medium" style={{ color: "var(--ds-text-strong)", lineHeight: 1.6 }}>{linkRulings(lead)}</Text>
        {title ? <Text size="2" style={{ color: "var(--ds-text-weak)", lineHeight: 1.6 }}>{linkRulings(title)}</Text> : null}
      </Flex>
      <Text size="2" style={{ color: "var(--ds-text-strong)", maxWidth: 540, lineHeight: 1.6 }}>{linkRulings(children)}</Text>
    </Flex>
  );
}

/* ---- Usage: scenarios + do/don't ----------------------------------------- */
export function Scenario({ label, caption, children }: { label: string; caption: ReactNode; children: ReactNode }) {
  return (
    <Flex direction="column" gap="2" style={{ minWidth: 240 }}>
      <Text size="1" weight="bold" style={{ color: "var(--ds-text-weak)", letterSpacing: "0.06em" }}>{linkRulings(label)}</Text>
      <Box>{children}</Box>
      <Caption>{caption}</Caption>
    </Flex>
  );
}

export type AccentColor = ComponentProps<typeof Theme>["accentColor"];

/* THE DO/DON'T AXE CARVE-OUT — the narrow one. Use this, not "[data-dodont]".
 *
 * `parameters.a11y.context.exclude` removes an element from the axe run ENTIRELY — every rule, not
 * the one you had in mind. So a page excluding "[data-dodont]" to forgive the DO/DON'T label's tint
 * was also forgiving anything else inside the card, and nobody could tell which pages were hiding
 * something. Measured, it was hiding real defects: Tabs' bare do/don't tablists emit triggers whose
 * aria-controls point at panels that were never mounted (aria-valid-attr-value, CRITICAL, both
 * appearances), and Table's sibling badge carve-out covered a success Badge at 4.20:1.
 *
 * The only thing in the card that genuinely cannot clear 4.5 is the DO/DON'T word itself — the
 * semantic step-11 ink on its own step-3 tint, measured 4.10 at 12px bold, which is the tradeoff
 * already settled when the semantic families were tuned (moving that ink darker clears the ratio and
 * loses the status hue). So mark JUST that row and exclude JUST that:
 *
 *     parameters: { a11y: { context: { exclude: [DODONT_LABEL] } } }
 *
 * The specimen keeps its full axe coverage. A DON'T specimen that genuinely demonstrates an ARIA or
 * labelling anti-pattern must then carve that rule out BY NAME, which is the point — an exemption
 * nobody can read is indistinguishable from a bug. */
export const DODONT_LABEL = "[data-dodont-label]";

export function DoDont({ kind, note, accent, bare, children }: { kind: "do" | "dont"; note: ReactNode; accent?: AccentColor; bare?: boolean; children: ReactNode }) {
  const ok = kind === "do";
  const fam = ok ? "success" : "error";
  const tone = `var(--ds-text-${fam})`;
  // Fill, border and tone all use the system's accent-aware semantic tokens, so the card tracks
  // the collision-shifted success/error for the selected brand (a grass brand's DO reads lime, a
  // red brand's DON'T reads oxblood) rather than a fixed Radix green/red.
  return (
    // data-dodont is the WHOLE card. Excluding it from axe forgives every rule inside the specimen,
    // which is almost never what a page means — see DODONT_LABEL above and prefer that. Kept because
    // pages still reference it; migrate them to the label marker rather than widening this.
    <Box data-dodont style={{ background: `var(--ds-fill-${fam}-weak)`, border: `1px solid var(--ds-stroke-${fam}-weak)`, borderRadius: "var(--ds-radius-4)", padding: 16 }}>
      <Flex direction="column" gap="3" width="100%">
        {/* data-dodont-label: the icon + the DO/DON'T word, the one part that cannot clear 4.5 (step-11
            ink on its own step-3 tint, 4.10 at 12px bold). This is what DODONT_LABEL excludes. */}
        <Flex align="center" gap="1" data-dodont-label>
          {ok ? <Check weight="bold" color={tone} /> : <X weight="bold" color={tone} />}
          <Text size="1" weight="bold" style={{ color: tone, letterSpacing: "0.06em" }}>{ok ? "DO" : "DON’T"}</Text>
        </Flex>
        {/* bare = freeform/prose content; otherwise children are button specimens, re-themed to the brand accent in a ButtonGroup */}
        {bare ? children : (
          <Theme accentColor={accent} hasBackground={false}>
            <ButtonGroup>{children}</ButtonGroup>
          </Theme>
        )}
        <Caption>{note}</Caption>
      </Flex>
    </Box>
  );
}

/* ---- Anatomy: diagram primitives + legend -------------------------------- */
export const dotStyle: CSSProperties = {
  position: "absolute", width: 20, height: 20, borderRadius: 9999,
  background: "var(--ds-fill-accent)", color: "var(--on-accent)",
  fontFamily: "var(--code-font-family)", fontSize: 11, fontWeight: 700,
  display: "block", alignContent: "center", textAlign: "center", textBox: "trim-both cap alphabetic", zIndex: 2,
};
export const tick = (s: CSSProperties): CSSProperties => ({ position: "absolute", width: 1, background: "var(--ds-stroke-strong)", opacity: 0.45, ...s });
export const hLine = (s: CSSProperties): CSSProperties => ({ position: "absolute", height: 1, background: "var(--ds-stroke-strong)", opacity: 0.45, ...s });

// A numbered legend keyed to the diagram callouts. `parts` = [number, name, note][].
// The numeral anchors the row (top-aligned to the title line); the title sits on the numeral's line
// and the note stacks beneath it, flush with the title's left edge (not wrapped back under the dot).
export const AnatomyLegend = ({ parts }: { parts: [number, string, string][] }) => (
  <Grid columns={{ initial: "1", sm: "2" }} gapX="6" gapY="3">
    {parts.map(([n, name, note]) => (
      <Flex key={n} gap="2" align="start">
        <Box style={{ ...dotStyle, position: "relative", width: 18, height: 18, flexShrink: 0 }}>{n}</Box>
        <Flex direction="column" gap="1" style={{ minWidth: 0 }}>
          <Text size="1" weight="bold" style={{ color: "var(--ds-text-strong)", lineHeight: "18px" }}>{linkRulings(name)}</Text>
          <Text size="1" style={{ color: "var(--ds-text-weak)", textWrap: "pretty" }}>{linkRulings(note)}</Text>
        </Flex>
      </Flex>
    ))}
  </Grid>
);

/* ---- Anatomy: self-syncing token spec ------------------------------------ */
// Convert any CSS color (rgb / oklch / lab / color()) to sRGB hex via a canvas — robust across
// browsers/displays, where a regex on getComputedStyle().color is not.
export function toHex(color: string): string {
  const ctx = document.createElement("canvas").getContext("2d", { willReadFrequently: true });
  if (!ctx) return color;
  ctx.fillStyle = color;
  ctx.fillRect(0, 0, 1, 1);
  const [r, g, b, a] = ctx.getImageData(0, 0, 1, 1).data;
  const h = (n: number) => n.toString(16).padStart(2, "0");
  return `#${h(r)}${h(g)}${h(b)}${a < 255 ? h(a) : ""}`;
}

// Story-level key (accent · appearance) — changes on any toolbar flip, re-rendering the story and
// re-running the effect that re-resolves every hex against the new theme.
export const HexThemeKey = createContext("");

// All code text in the table: one fixed-size, no-background monospace treatment — so it never scales
// with the size toolbar and the names match the hex.
export const Mono = ({ children, muted }: { children: ReactNode; muted?: boolean }) => (
  <span style={{ fontFamily: "var(--code-font-family)", fontSize: 12, color: muted ? "var(--ds-text-weak)" : "var(--ds-text-link)" }}>{children}</span>
);

export function HexValue({ token }: { token: string }) {
  const probe = useRef<HTMLSpanElement>(null);
  const [hex, setHex] = useState("");
  const themeKey = useContext(HexThemeKey);
  useLayoutEffect(() => {
    if (probe.current) setHex(toHex(getComputedStyle(probe.current).color));
  }, [themeKey]);
  return (
    <Mono muted>
      <span ref={probe} aria-hidden style={{ color: `var(${token})`, position: "absolute", width: 0, height: 0, overflow: "hidden" }} />
      {hex || "—"}
    </Mono>
  );
}

/* ---- THE TOKEN ROW: one layout, four columns, two densities ---------------
 * part · token (+swatch) · alias-or-verdict · resolved value
 *
 * The token NAME is the row's subject — it sits in the emphasised, link-coloured
 * column beside the swatch. The resolved value is a MUTED trailing footnote whose
 * only job is proving the name resolved. That order is the ruling (DECISIONS [[token-row-shape]]),
 * not a styling preference: a hex identifies nothing — it can't be searched, reused
 * across a component, or checked for drift — so a row that leads with one, or shows
 * a colour without saying where it came from, documents nothing. [[docs-page-spine]] (read it live,
 * never hand-type it) governs HOW the value is obtained; [[token-row-shape]] governs where it sits.
 *
 * Enforced two ways: `token-rows.node-check.ts` (static — R2 name-the-token,
 * R3 keep-the-value-a-value, R4 no-typed-hex) and `assertTokenRowShape` in
 * foundations/_assert.ts (runtime — the named token is what actually paints).
 * `data-token-row` is what the runtime half keys on, so it lives HERE, on the one
 * shell every row renders through, rather than in each story.
 */
export const SPEC_COLUMNS = "1.2fr 1.6fr 1.1fr 84px";
export const SPEC_GRID: CSSProperties = {
  display: "grid", gridTemplateColumns: SPEC_COLUMNS, gap: 12,
  padding: "7px 20px", borderTop: "1px solid var(--ds-stroke-weak)", alignItems: "center",
};

// The Foundations colour-wall density of the SAME four columns: a wide specimen chip
// instead of a 14px swatch (the wall previews each role as the thing it is — a fill is
// filled, a stroke is a border), roomier alias/value tracks, and no rule between rows
// (the wall groups by family, it isn't a per-component spec card). Kept as a second
// named density rather than folded into SPEC_COLUMNS because a 40px specimen dropped
// into a 1.2fr track would float in dead space — Colors.stories.tsx imports THIS
// instead of hand-writing a template that then drifts from the row shell.
export const SWATCH_GRID: CSSProperties = {
  display: "grid", gridTemplateColumns: "40px minmax(0, 1fr) 112px 88px",
  alignItems: "center", gap: 14, padding: "5px 8px", borderRadius: "var(--ds-radius-2)",
};

/** The row shell every token table renders through. `kind` marks the row for the
 *  runtime assertion: "colour" rows show a swatch and are checked (name present,
 *  name before value, value muted); "note" rows carry prose and are skipped. */
export function TokenRow({
  grid = SPEC_GRID, style, kind = "colour", children,
}: { grid?: CSSProperties; style?: CSSProperties; kind?: "colour" | "note"; children: ReactNode }) {
  return <Box data-token-row={kind} style={style ? { ...grid, ...style } : grid}>{children}</Box>;
}

// A row backed by a live design token: swatch + role name + Radix alias (parsed) + hex (resolved from the DOM).
export const RoleRow = ({ part, role }: { part: string; role: string }) => (
  <TokenRow>
    <Text size="1" style={{ color: "var(--ds-text-strong)" }}>{linkRulings(part)}</Text>
    <Flex align="center" gap="2">
      <Box style={{ width: 14, height: 14, borderRadius: 3, background: `var(${role})`, boxShadow: "inset 0 0 0 1px var(--ds-stroke-weak)", flexShrink: 0 }} />
      <Mono>{role}</Mono>
    </Flex>
    <Mono muted>{TOKEN_ALIAS[role] ?? "—"}</Mono>
    <Box style={{ textAlign: "right" }}><HexValue token={role} /></Box>
  </TokenRow>
);

/* A row that states rather than proves: a radius or size lane, a transparent rest, a paint no row can
 * measure (a colour inside a gradient, a literal with no token behind it).
 *
 * It renders on the MEASURED grid, not the legacy spec grid. Prose rows used to be rare; since every
 * unmeasurable paint correctly became one, most tables now mix the two — and two column templates in
 * one table put the same kind of information under two different headings, so a prose row's token
 * landed under "Measured". One set of tracks fixes that.
 *
 * It must still read as STATED, because proven-vs-stated is the whole point of the table. Two cues,
 * both where the eye already looks for evidence: the Measured cell is an em-dash exactly where a
 * measured row shows its value, and the verdict cell opens with `stated` — the same vocabulary as
 * `matches` and `not measured ·`. */
export const NoteRow = ({ part, value, radix }: { part: string; value: string; radix?: string }) => (
  <TokenRow kind="note" grid={MEASURED_GRID}>
    <Text size="1" style={{ color: "var(--ds-text-strong)" }}>{linkRulings(part)}</Text>
    <Box style={{ minWidth: 0 }}>{radix ? <Mono muted>{radix}</Mono> : null}</Box>
    <Box><Mono muted>—</Mono></Box>
    <Box style={{ overflowWrap: "anywhere" }}><Muted>stated · {value}</Muted></Box>
  </TokenRow>
);

/* ---- RenderedRow: the same row, for a value read off the DOM --------------
 * A component that borrows another component's SKIN (Kbd, Code, Separator, Spinner,
 * Popover, Skeleton…) declares no `--ds-*` role of its own, so there is no role to
 * hand to RoleRow — the value has to be read from the rendered element instead. The
 * reading (which element, which property) is component-specific and stays in the
 * story, keyed on HexThemeKey so it re-resolves on every toolbar flip.
 *
 * What it is NOT is a licence for a nameless row. "It reuses a Radix skin" still has
 * an answer to "which colour is this?" — it's the RADIX token the skin paints from
 * (`--color-panel-solid`, `--accent-a11`, `--gray-a3`). So `token` is REQUIRED
 * whenever the row shows a swatch, and the type enforces it: the two arms below are
 * disjoint, so `<RenderedRow label swatch value />` with no `token` does not compile.
 * That is deliberately stronger than the guard — a rule you can't type wrong beats a
 * rule you get told about later.
 *
 * Renders on SPEC_GRID, so a mixed table (RoleRow + RenderedRow, as List / Pagination
 * / Token have) lines up on ONE column rhythm:
 *
 *   label            │ ▪ --color-panel-solid │ = │        #fcfcfd
 *   └ part           └ token, link ink       └ verdict   └ value, muted, last
 */
export type RenderedRowProps = {
  /** The part being measured — "ON track fill", "Panel surface", "Thumb face". */
  label: string;
  /** The LIVE-READ value: a resolved hex for a colour row, a px/keyword for a note
   *  row. The value ONLY — the token name and the verdict have their own slots, and
   *  the guard's R3 rejects either one spliced in here. */
  value: ReactNode;
  /** Optional bound/unbound mark — "=" when the rendered colour matches the named
   *  token, "≠ (--other)" when it doesn't. Its own column; never concatenated. */
  verdict?: ReactNode;
} & (
  /** COLOUR row — it shows a swatch, so it MUST name the token that colour comes
   *  from. `swatch` stays nullable because it is read in an effect and is undefined
   *  on the first paint; what the type insists on is that the NAME is there. */
  | { swatch: string | undefined; token: string }
  /** NOTE row — no colour, so no swatch. May still name a token.
   *  The literal type on `swatch` is not decorative: it is what TypeScript prints
   *  when a story passes a swatch and forgets the token, so the error says what to
   *  do instead of "string is not assignable to undefined". */
  | { swatch?: "MISSING `token` — a swatch row must name the token it paints from"; token?: string }
);

export function RenderedRow(props: RenderedRowProps) {
  const { label, value, verdict } = props;
  const { token, swatch } = props;
  // No token to name → the row is prose, laid out exactly like NoteRow (see the note there on why
  // prose rows share the measured grid and how they stay distinguishable from a measured one).
  if (token === undefined) {
    return (
      <TokenRow kind="note" grid={MEASURED_GRID}>
        <Text size="1" style={{ color: "var(--ds-text-strong)" }}>{linkRulings(label)}</Text>
        <Box style={{ minWidth: 0 }}>{verdict ? <Mono muted>{verdict}</Mono> : null}</Box>
        <Box><Mono muted>—</Mono></Box>
        <Box style={{ overflowWrap: "anywhere" }}><Muted>stated · {value}</Muted></Box>
      </TokenRow>
    );
  }
  return (
    <TokenRow kind={swatch === undefined ? "note" : "colour"}>
      <Text size="1" style={{ color: "var(--ds-text-strong)" }}>{linkRulings(label)}</Text>
      <Flex align="center" gap="2" style={{ minWidth: 0 }}>
        {swatch ? <Box style={{ width: 14, height: 14, borderRadius: 3, background: swatch, boxShadow: "inset 0 0 0 1px var(--ds-stroke-weak)", flexShrink: 0 }} /> : null}
        <Mono>{token}</Mono>
      </Flex>
      {verdict ? <Mono muted>{verdict}</Mono> : null}
      {/* With no verdict the value spans the last TWO tracks — same right edge as a
          RoleRow hex, but room for a longer reading (a shadow, a font stack) without
          wrapping into a 84px column. */}
      <Box style={{ textAlign: "right", overflowWrap: "anywhere", ...(verdict ? null : { gridColumn: "3 / 5" }) }}>
        <Mono muted>{value}</Mono>
      </Box>
    </TokenRow>
  );
}

/* ===========================================================================
   THE MEASURED TOKEN ROW — part · token · value · verdict
   ---------------------------------------------------------------------------
   WHAT THE TABLE IS FOR. A reader uses it as a point of reference and as proof
   that the system obeys its own rules. Both jobs need the same thing: the row
   must be able to DISAGREE with the component.

   WHAT WENT WRONG. `RoleRow` and `RenderedRow` (above, now legacy) take the
   value from the story. The usual shape paints a hidden probe with the very
   token the row names, reads that probe back, and prints the hex — so the row
   agrees by construction. It proves the token layer resolves, which nobody
   doubted, and proves nothing about what the component paints. HoverCard and
   Popover shipped the extreme version: a span painted `--color-panel-solid`,
   read back, printed beside the label "Panel background".

   THE RULE. Read the value off the ELEMENT THAT PAINTS IT, and print the
   verdict. `MeasuredRow` therefore takes no `value`, no `swatch` and no
   `verdict` — a story supplies WHICH ELEMENT (`select`) and WHICH PROPERTY
   (`prop`) plus the token it claims, and this primitive does the reading:

     1. finds the element inside the enclosing <MeasuredSpec>'s measurement
        root — a real, rendered instance of the component, not a probe;
     2. reads `prop` off it (computed style; or the component's own matched
        rule for a pseudo-state; or a named endpoint of its own animation);
     3. resolves the CLAIMED token independently, on a probe appended INSIDE
        that element (so a nested <Theme> resolves correctly) — a different
        node from the one measured, which is the whole point;
     4. compares, and renders all four cells.

   A row that cannot be measured says so — "not measured · <reason>" — and
   never falls back to resolving the token. The story cannot ask for that
   shape; it is what the measurement failing produces.

   THE RADIX ALIAS is gone from the row. It was a peer column carrying nine
   different meanings across the tree (alias, a bare `=`, a component name, a
   CSS class, a WCAG criterion, prose, an em-dash) under no header at all. It
   is explanatory context, not evidence; put it in the section's prose.

   Enforced three ways — see DECISIONS [[measured-token-rows]]:
     · the TYPE: `MeasuredRowProps` has no value/swatch/verdict, so handing one
       in is a compile error;
     · `token-rows.node-check.ts` (static): the measured primitive is the only
       token row, no row hands in a value, no row measures a paint the story
       itself applied, no hand-typed hex;
     · `assertMeasuredRows` (`foundations/_assert.ts`, runtime): the measured
       node is real and connected, is NOT the node the token was resolved on,
       carries no inline paint for the property read, and the verdict is bound.
   =========================================================================== */

/** A pseudo-state whose paint exists only while the state is active.
 *
 *  `focus-within` is here because a wrapper that rings when something INSIDE it takes focus is the
 *  house pattern for a composite control — `.rt-TextAreaRoot:where(:focus-within)` is the rule that
 *  paints the TextArea's ring, and with no name for that state the row could only report the field
 *  had none. A focus hoisted through `:has()` (`.rt-ds-tokenizer:has(.rt-TextFieldInput:focus-visible)`)
 *  needs no new name: it is still `focus-visible`, and the rewriter below reaches inside the `:has()`.
 *
 *  `checked`, `read-only` and `placeholder-shown` are speakable because Radix's own sheet paints from
 *  them. Prefer a REST read where you can get one: rendering a genuinely checked (or disabled) instance
 *  and reading it with no `state` proves the same paint through the browser's own cascade, which is
 *  stronger evidence than the declaration this primitive reconstructs. Reach for `state` when the state
 *  cannot be rendered into existence — nothing can synthesise a real `:hover`. */
export type MeasureState =
  | "hover" | "focus-visible" | "focus" | "focus-within" | "active"
  | "disabled" | "checked" | "read-only" | "placeholder-shown";

/** A named frame of an animation, for a value with no resting state. */
export type MeasureEndpoint = { label: string; percent: number };

/** Which of the two things a `box-shadow` row proved — see `compareClaim`. */
export type MeasureCompared = "value" | "shadow-colour";

/** What a measured row can prove, attached to the row node for the runtime check. */
export type RowEvidence = {
  token: string;
  prop: string;
  select: string;
  pseudo?: string;
  state?: MeasureState;
  endpoint?: MeasureEndpoint;
  /** The element the value was READ FROM — a rendered component node. */
  measuredNode: Element | null;
  /** Was `measuredNode` in the document AT THE MOMENT IT WAS READ?
   *
   *  `measuredNode.isConnected` answers "is it in the document NOW", and for a surface that can only
   *  be measured while it is mounted (a modal panel — see `MeasuredSpec transient`) the answer is no
   *  by the time anything checks: the instance is deliberately gone. The property that actually
   *  matters is the one this stamps — the row read a node that was really in the document, not one
   *  that never was. Set here, from `isConnected`, at the instant of the read; there is no prop that
   *  can hand it in. */
  connectedAtRead: boolean;
  /** The element the CLAIMED token was resolved on. Never the measured node. */
  probeNode: Element | null;
  /** The stylesheet selector a state paint came from ("" for a resting read). */
  source: string;
  measured: string;
  expected: string;
  bound: boolean;
  reason: string;
  /** `"value"` compared the whole property; `"shadow-colour"` compared only the shadow's colour. */
  compared: MeasureCompared;
  /** The shadow minus its colour, for a `shadow-colour` row — reported, never compared. */
  geometry?: string;
  /** A WHOLE-shadow value taken apart for display — see `describeShadow`. Presentation only: the row
   *  still compares `measured` against `expected` as entire strings. `shadowExpected` is the same
   *  treatment of what the claimed token resolved to, so a row that differs can name the shape it
   *  expected instead of printing three hundred characters of it. */
  shadow?: ShadowView;
  shadowExpected?: ShadowView;
};

const EVIDENCE = "__dsRowEvidence";

/** Read back what a measured row proved. Returns undefined for a row that never measured. */
export function getRowEvidence(row: Element): RowEvidence | undefined {
  return (row as Element & { [EVIDENCE]?: RowEvidence })[EVIDENCE];
}

/** Properties whose value is a colour (so the row shows a swatch and compares in sRGB). */
const COLOUR_PROP = /(^|-)(color|fill|stroke)$/;

/** Shorthands to fall back to when a rule declares the longhand only via a shorthand carrying a
 *  `var()`. CSSOM cannot expand a shorthand whose value contains a custom property, so
 *  `getPropertyValue("outline-color")` comes back empty on `outline: 1px solid var(--x)`. */
const SHORTHAND_OF: Record<string, string[]> = {
  "background-color": ["background"],
  "outline-color": ["outline"],
  "border-top-color": ["border-top", "border-color", "border"],
  "border-bottom-color": ["border-bottom", "border-color", "border"],
  "border-left-color": ["border-left", "border-color", "border"],
  "border-right-color": ["border-right", "border-color", "border"],
};

/** Every style rule that is live in this document, media/supports conditions honoured. */
function* liveRules(list: CSSRuleList): Generator<CSSStyleRule> {
  for (const rule of Array.from(list)) {
    if (rule instanceof CSSStyleRule) {
      yield rule;
      if (rule.cssRules) yield* liveRules(rule.cssRules); // nested rules
    } else if (rule instanceof CSSMediaRule) {
      try { if (window.matchMedia(rule.conditionText).matches) yield* liveRules(rule.cssRules); } catch { /* unparseable condition */ }
    } else if (rule instanceof CSSSupportsRule) {
      try { if (CSS.supports(rule.conditionText)) yield* liveRules(rule.cssRules); } catch { /* unparseable condition */ }
    } else if (rule instanceof CSSKeyframesRule) {
      continue; // keyframe rules are not style rules; walking them yields nothing
    } else if ("cssRules" in rule) {
      yield* liveRules((rule as CSSGroupingRule).cssRules); // @layer, @scope, @container
    }
  }
}

/* ---- taking a state back out of a selector -------------------------------
 * `statePaint` needs one narrow operation: strip the state pseudo-class out of a rule's selector so
 * what remains can be handed to `el.matches()` — `.a:where(:disabled, [data-disabled])` has to come
 * back as `.a:where([data-disabled])`.
 *
 * String-replacing the pseudo cannot do that. Removing `:disabled` leaves `:where(, [data-disabled])`,
 * and tidying the orphaned comma leaves `:where( [data-disabled])` — whose surviving SPACE is a
 * descendant combinator. `matches()` then looks for a descendant carrying the attribute, finds none,
 * and the row reports that the component declares no such paint. Nothing errors; the check simply
 * stops being able to fail. `:where(x, y)` is Radix's house idiom for a state, so that took
 * `state="disabled"` out of service across the whole tree.
 *
 * So: walk the selector with paren / bracket / quote awareness and REBUILD each functional pseudo's
 * argument list from the arguments that survive. That removes the class of bug — dangling combinator,
 * empty group, doubled comma — instead of patching the three regexes that happened to be noticed. It
 * is deliberately NOT a CSS selector parser: `:nth-child(An+B of S)`, escapes and namespaces would all
 * have to be modelled to gain nothing here, and the parser would be a larger surface to get wrong than
 * the thing it replaced. This is a rewriter with exactly one job. */

/** Index of the `close` that balances the `open` at `from`, skipping quoted runs. */
function closingIndex(s: string, from: number, open: string, close: string): number {
  let depth = 0;
  for (let i = from; i < s.length; i++) {
    const c = s[i];
    if (c === "\\") { i += 1; continue; }
    if (c === '"' || c === "'") {
      i += 1;
      while (i < s.length && s[i] !== c) i += s[i] === "\\" ? 2 : 1;
      continue;
    }
    if (c === open) depth += 1;
    else if (c === close && --depth === 0) return i;
  }
  return s.length - 1; // unbalanced (never seen in a live sheet) — treat the rest as the group
}

/** Split a selector list on its TOP-LEVEL commas — the ones inside `()` or `[]` belong to a
 *  functional pseudo or an attribute value, and a colour like `rgb(1, 2, 3)` carries its own. */
function splitTopLevel(s: string): string[] {
  const out: string[] = [];
  let depth = 0;
  let start = 0;
  for (let i = 0; i < s.length; i++) {
    const c = s[i];
    if (c === "\\") { i += 1; continue; }
    if (c === '"' || c === "'") {
      i += 1;
      while (i < s.length && s[i] !== c) i += s[i] === "\\" ? 2 : 1;
      continue;
    }
    if (c === "(" || c === "[") depth += 1;
    else if (c === ")" || c === "]") depth -= 1;
    else if (c === "," && depth === 0) { out.push(s.slice(start, i)); start = i + 1; }
  }
  out.push(s.slice(start));
  return out;
}

type Stripped = { out: string; hit: boolean; negated: boolean };

/** Remove every `:state` token from ONE selector (no top-level commas). `negated` reports that the
 *  state was found inside a `:not()` — such a rule declares what the component paints while the state
 *  is OFF, so it must never be offered as the state's paint. */
function stripState(sel: string, state: string, inNot = false): Stripped {
  let out = "";
  let hit = false;
  let negated = false;
  let i = 0;
  while (i < sel.length) {
    const c = sel[i];
    if (c === "\\") { out += sel.slice(i, i + 2); i += 2; continue; }
    if (c === '"' || c === "'") {
      let j = i + 1;
      while (j < sel.length && sel[j] !== c) j += sel[j] === "\\" ? 2 : 1;
      out += sel.slice(i, j + 1); i = j + 1; continue;
    }
    if (c === "[") { // an attribute selector — copied through whole
      const j = closingIndex(sel, i, "[", "]");
      out += sel.slice(i, j + 1); i = j + 1; continue;
    }
    if (c === ":") {
      const nameAt = i + (sel[i + 1] === ":" ? 2 : 1); // "::" is a pseudo-ELEMENT, never the state
      const name = /^[\w-]+/.exec(sel.slice(nameAt))?.[0] ?? "";
      let j = nameAt + name.length;
      if (sel[j] === "(") { // functional pseudo — rebuild it from the arguments that survive
        const close = closingIndex(sel, j, "(", ")");
        const args = splitTopLevel(sel.slice(j + 1, close))
          .map((a) => stripState(a, state, inNot || name === "not"));
        hit = hit || args.some((a) => a.hit);
        negated = negated || args.some((a) => a.negated);
        // `:where(a, b)` is a disjunction, and we are POSITING the state. An argument that was only
        // the state (`:where(:disabled, [data-disabled])`) is therefore trivially satisfied, and the
        // whole group goes — keeping the siblings would demand `[data-disabled]` of an element whose
        // disabled-ness is the native `:disabled`, and it would never match. An argument that carried
        // more than the state (`:where(:disabled.rt-x, …)`) keeps its remainder alongside its siblings.
        const satisfied = args.some((a) => a.hit && !a.out);
        const kept = args.map((a) => a.out).filter(Boolean);
        out += satisfied || !kept.length ? "" : `${sel.slice(i, j)}(${kept.join(", ")})`;
        i = close + 1; continue;
      }
      if (nameAt === i + 1 && name === state) { // the state itself
        hit = true;
        negated = negated || inNot;
        i = j; continue;
      }
      out += sel.slice(i, j); i = j; continue;
    }
    out += c; i += 1;
  }
  return { out: out.replace(/\s+/g, " ").trim(), hit, negated };
}

/** `.a:hover .b` → `.a .b`. Returns null when this selector part doesn't carry the state, or carries
 *  it only under a `:not()` (where the rule is about the state being absent). */
function withoutState(part: string, state: string): { base: string; pseudo: string } | null {
  const s = stripState(part.trim(), state);
  if (!s.hit || s.negated) return null;
  // A ring drawn on ::before/::after: match the base element, read the pseudo separately.
  const pe = s.out.match(/::[\w-]+$/);
  return { base: (pe ? s.out.slice(0, -pe[0].length) : s.out).trim(), pseudo: pe ? pe[0] : "" };
}

/** The declaration a rule makes for `prop`, falling back to a `var()` carried inside a shorthand. */
function declaredValue(style: CSSStyleDeclaration, prop: string): string {
  const direct = style.getPropertyValue(prop);
  if (direct) return direct;
  for (const short of SHORTHAND_OF[prop] ?? []) {
    const v = style.getPropertyValue(short).match(/var\(\s*--[\w-]+[^)]*\)/);
    if (v) return v[0];
  }
  return "";
}

/** What looking for a state paint turned up. The two miss cases are DIFFERENT findings and the row
 *  has to say which: `declaring === 0` is about the COMPONENT (nothing paints this in that state);
 *  `matching === 0` is about the ROW (rules exist, the selector never reached them). Collapsing them
 *  into one message is how a broken rewriter reads as a clean bill of health. */
type StateLookup = {
  paint: { expr: string; selector: string; pseudo: string } | null;
  /** Rules that carry the state AND declare `prop` — for any element. */
  declaring: number;
  /** Rules that carry the state and whose stripped selector matches THIS element — any property. */
  matching: number;
};

/** The declaration the component's OWN stylesheet will paint for `prop` while `state` is active.
 *  Source order + `!important` approximate the cascade — every override in this system is a single
 *  `.radix-themes`-scoped rule, so there is no specificity race to lose.
 *
 *  `want` is the pseudo-element the row asked for. Left empty, the search DISCOVERS one (a ring drawn
 *  on `::before` is found without the row having to know); named, it constrains, because Radix draws a
 *  disabled control's edge on `::before` and its mark on `::after` and an unconstrained search would
 *  happily quote the wrong one under the right-looking label. */
function statePaint(el: Element, prop: string, state: MeasureState, want = ""): StateLookup {
  let best: { expr: string; selector: string; pseudo: string; important: boolean } | null = null;
  let declaring = 0;
  let matching = 0;
  for (const sheet of Array.from(document.styleSheets)) {
    let rules: CSSRuleList;
    try { rules = sheet.cssRules; } catch { continue; } // cross-origin sheet
    for (const rule of liveRules(rules)) {
      // splitTopLevel, not `.split(",")`: the commas inside `:where(:disabled, [data-disabled])`
      // belong to the pseudo, and cutting there hands the rewriter two selector fragments that can
      // never match anything — the same silent miss, one step earlier.
      for (const part of splitTopLevel(rule.selectorText)) {
        const stripped = withoutState(part.trim(), state);
        if (!stripped || !stripped.base) continue;
        if (want && stripped.pseudo !== want) continue;
        const expr = declaredValue(rule.style, prop);
        if (expr) declaring += 1;
        let hit = false;
        try { hit = el.matches(stripped.base); } catch { continue; } // unparseable remnant
        if (!hit) continue;
        matching += 1;
        if (!expr) continue;
        const important = rule.style.getPropertyPriority(prop) === "important";
        if (!best || important || !best.important) {
          best = { expr, selector: rule.selectorText, pseudo: stripped.pseudo, important };
        }
      }
    }
  }
  return { paint: best && { expr: best.expr, selector: best.selector, pseudo: best.pseudo }, declaring, matching };
}

/** Why no state paint was found, said so a reader can tell whose problem it is. */
function stateMiss(prop: string, state: MeasureState, look: StateLookup): string {
  if (!look.declaring) return `no :${state} rule declares ${prop} for this element`;
  if (!look.matching) {
    return `${prop} is declared for :${state} by ${look.declaring} rule${look.declaring === 1 ? "" : "s"}, ` +
      `but no :${state} selector matched this element — check \`select\`, or the state may be written another ` +
      `way (Radix also spells disabled as [data-disabled])`;
  }
  return `${look.matching} :${state} rule${look.matching === 1 ? "" : "s"} match this element and ` +
    `${look.declaring} declare${look.declaring === 1 ? "s" : ""} ${prop}, but none does both — the paint is on another element`;
}

/** Resolve a CSS expression for `prop` on a probe appended INSIDE `el`. Inside, because a portaled
 *  panel carries its own nested theme root and the token only resolves there; a probe, because the
 *  measured node must never be the node the claim is resolved on.
 *
 *  `unresolved` names any custom property in `expr` that came back EMPTY on the probe. That happens
 *  for two very different reasons and the row must not confuse them: the token genuinely isn't defined
 *  here, or — during a soft re-render, when only the story's query string changed — the substitution
 *  simply hasn't landed yet, and the property reads as its initial value for a frame. Either way the
 *  number is not evidence, so the row holds instead of printing a verdict off it. */
function probeResolve(el: Element, prop: string, expr: string): { value: string; node: Element; unresolved: string[] } {
  const probe = document.createElement("span");
  probe.setAttribute("data-ds-token-probe", "");
  probe.style.setProperty(prop, expr);
  el.appendChild(probe);
  const cs = getComputedStyle(probe);
  const value = cs.getPropertyValue(prop).trim();
  const unresolved = Array.from(expr.matchAll(/var\(\s*(--[\w-]+)/g))
    .map((m) => m[1])
    .filter((name) => !cs.getPropertyValue(name).trim());
  probe.remove();
  return { value, node: probe, unresolved };
}

const fmt = (prop: string, raw: string) => (COLOUR_PROP.test(prop) && raw ? toHex(raw) : raw.trim());

/* ---- a border drawn as a shadow ------------------------------------------
 * Every surface-variant control in this system draws its edge as an inset shadow, not a border:
 * `box-shadow: inset 0 0 0 1px var(--ds-stroke-error)`. Comparing the whole property cannot work,
 * because `box-shadow: var(--ds-stroke-error)` is not valid CSS — a bare colour is not a shadow — so
 * the claim resolves to `none` and the row calls a CORRECT component wrong. The asymmetry points at
 * the fix: a token that IS a whole shadow (`--ds-shadow-overlay` on a floating panel) compares fine
 * today. So the split is by what the token turns out to be, asked of the browser rather than guessed:
 * resolve it as a shadow first, and only if it isn't one, compare COLOUR against COLOUR.
 *
 * A colour-in-shadow row proves the colour and nothing else. It must not be mistaken for proof that
 * the hairline is 1px, or inset — so the row says `shadow colour` beside the part and prints the
 * geometry in the verdict as something reported, not compared. */

/** The comma-separated layers of a computed `box-shadow` (`rgb(…) 0px 0px 0px 1px inset`, ×N). */
const shadowLayers = (value: string) =>
  splitTopLevel(value).map((l) => l.trim()).filter((l) => l && l !== "none");

/** Split one shadow layer into its colour and everything else. Lengths always start with a digit,
 *  sign or dot and `inset` is a keyword, so whatever is left is the colour — whichever end the
 *  engine serialises it at, and whatever colour syntax it used (`rgb()`, `color(display-p3 …)`). */
function splitShadowLayer(layer: string): { colour: string; geometry: string } {
  const parts: string[] = [];
  let depth = 0;
  let start = 0;
  for (let i = 0; i <= layer.length; i++) {
    const c = layer[i];
    if (c === "(") depth += 1;
    else if (c === ")") depth -= 1;
    if ((c === " " && depth === 0) || i === layer.length) {
      if (i > start) parts.push(layer.slice(start, i));
      start = i + 1;
    }
  }
  const colour = parts.find((p) => p !== "inset" && !/^[-+.\d]/.test(p)) ?? "";
  return { colour, geometry: parts.filter((p) => p !== colour).join(" ") };
}

/* ---- showing a composite value ------------------------------------------
 * Two of the properties this table measures do not have a value a reader can take in: a computed
 * `box-shadow` is a comma-separated stack of layers, each carrying a colour in whatever syntax the
 * engine felt like (`oklab(0.83 …)`), and a computed `font-family` is the entire fallback stack. Both
 * ran through the same `fmt` as a hex and were printed verbatim — hundreds of characters in a cell
 * sized for `#1a1a1a`, which is why a previous slice REVERTED shadow rows rather than ship it.
 *
 * The fix is presentation, and only presentation. The COMPARISON below is untouched — whole string
 * against whole string — so a row can still say `differs`, and the guard still fails on a false
 * claim with both values in full. What changes is that the row shows the reader a shadow as its
 * layers (a swatch and a hex each, geometry beside them, one line naming the shape of the stack) and
 * a font stack as its head family with the rest a hover away. */

/** One layer of a decomposed `box-shadow`, for display. */
export type ShadowLayerView = {
  /** The layer's colour in sRGB hex — what the swatch paints. Empty if the layer carries none. */
  hex: string;
  /** Everything that is not the colour: offsets, blur, spread, and `inset` if present. */
  geometry: string;
  /** A RING sits on the box — no offset, no blur, drawn by its spread alone (this system's hairline
   *  idiom). Anything with an offset or a blur is a DROP. Named so the summary can say which. */
  kind: "ring" | "drop";
  /** The layer exactly as the engine serialised it, kept for the row's tooltip. */
  raw: string;
};

export type ShadowView = { layers: ShadowLayerView[]; summary: string };

/** The lengths of a layer's geometry in source order: offset-x, offset-y, blur, spread. */
const shadowLengths = (geometry: string) => geometry.split(/\s+/).filter((p) => /^[-+.\d]/.test(p));

/** Take a whole computed `box-shadow` apart for display. Reported, never compared. */
export function describeShadow(value: string): ShadowView {
  const layers: ShadowLayerView[] = shadowLayers(value).map((raw) => {
    const { colour, geometry } = splitShadowLayer(raw);
    const lengths = shadowLengths(geometry);
    const flat = (v: string | undefined) => !v || parseFloat(v) === 0;
    const ring = lengths.length >= 4 && flat(lengths[0]) && flat(lengths[1]) && flat(lengths[2]) && !flat(lengths[3]);
    return { hex: colour ? toHex(colour) : "", geometry, kind: ring ? "ring" : "drop", raw };
  });
  if (!layers.length) return { layers, summary: "nothing" };
  const rings = layers.filter((l) => l.kind === "ring");
  const drops = layers.length - rings.length;
  const parts: string[] = [];
  if (rings.length) parts.push(rings.length === 1 ? `ring ${shadowLengths(rings[0].geometry)[3]}` : `${rings.length} rings`);
  if (drops) parts.push(`${drops} drop${drops === 1 ? "" : "s"}`);
  return { layers, summary: `${layers.length} layer${layers.length === 1 ? "" : "s"} — ${parts.join(" + ")}` };
}

/** What the value column PRINTS for a property whose computed form is a list. The row compares the
 *  whole thing either way, so `title` carries it in full — the compaction never hides a difference,
 *  it just stops a font stack from wrapping into a cell six lines tall. */
function compactValue(prop: string, value: string): { text: string; title?: string } {
  if (prop !== "font-family" || !value) return { text: value };
  const families = splitTopLevel(value).map((f) => f.trim()).filter(Boolean);
  const head = families[0]?.replace(/^["']|["']$/g, "") ?? value;
  return families.length > 1 ? { text: `${head} …`, title: value } : { text: head };
}

type Comparison = {
  measured: string; expected: string; bound: boolean; probeNode: Element | null;
  compared: MeasureCompared; geometry?: string; reason?: string;
  shadow?: ShadowView; shadowExpected?: ShadowView;
};

/** The message for a value the row refused to build a verdict on. */
const unresolvedReason = (names: string[]) =>
  `${names.join(" and ")} ${names.length === 1 ? "does" : "do"} not resolve on this element ` +
  `— either the token is undefined here, or the style has not settled yet`;

/** Compare what was measured against what the claimed token independently resolves to, on a probe
 *  INSIDE the measured element (never the element itself — that is the row that cannot disagree). */
function compareClaim(el: Element, prop: string, token: string, raw: string): Comparison {
  const miss = (reason: string): Comparison =>
    { return { measured: "", expected: "", bound: false, probeNode: null, compared: "value", reason }; };

  if (prop === "box-shadow") {
    const shadowClaim = probeResolve(el, prop, `var(${token})`);
    if (shadowClaim.unresolved.length) return miss(unresolvedReason(shadowClaim.unresolved));
    const asShadow = shadowClaim.value.trim();
    if (!asShadow || asShadow === "none") {
      // Not a shadow, so the token is the shadow's COLOUR. Compare the two colours, and say so.
      const layers = shadowLayers(raw);
      if (!layers.length) return miss(`box-shadow paints nothing on this element`);
      const split = layers.map(splitShadowLayer);
      if (split.some((s) => !s.colour)) return miss(`this box-shadow carries no colour to compare`);
      const colours = Array.from(new Set(split.map((s) => toHex(s.colour).toLowerCase())));
      if (colours.length > 1) {
        return miss(`${layers.length} shadow layers paint different colours (${colours.join(", ")}) — a colour row proves one`);
      }
      const claim = probeResolve(el, "color", `var(${token})`);
      if (claim.unresolved.length) return miss(unresolvedReason(claim.unresolved));
      const expected = claim.value ? toHex(claim.value) : "";
      return {
        measured: colours[0], expected, probeNode: claim.node, compared: "shadow-colour",
        geometry: split.map((s) => s.geometry).join(", "),
        bound: Boolean(expected) && colours[0] === expected.toLowerCase(),
      };
    }
    /* The token IS a whole shadow, so the whole property is what gets compared — the same string
     * equality as before, on the same two strings. The row additionally carries both sides taken
     * apart (`describeShadow`), because neither string is something a reader can read. Note the
     * probe resolved above is reused rather than resolved a second time: one claim, one probe. */
    const measuredShadow = raw.trim();
    return {
      measured: measuredShadow, expected: asShadow, probeNode: shadowClaim.node, compared: "value",
      bound: measuredShadow.toLowerCase() === asShadow.toLowerCase(),
      shadow: describeShadow(measuredShadow), shadowExpected: describeShadow(asShadow),
    };
  }

  const claim = probeResolve(el, prop, `var(${token})`);
  if (claim.unresolved.length) return miss(unresolvedReason(claim.unresolved));
  const expected = fmt(prop, claim.value);
  const measured = fmt(prop, raw);
  return {
    measured, expected, probeNode: claim.node, compared: "value",
    bound: Boolean(expected) && measured.toLowerCase() === expected.toLowerCase(),
  };
}

type MeasureSpec = {
  select: string; prop: string; token: string;
  pseudo?: string; state?: MeasureState; endpoint?: MeasureEndpoint;
};

/** The whole reading, in one place, so the row component has no way to shortcut it.
 *
 *  `roots` is the measurement scope in search order — the hidden host first, then anything that
 *  host's own instance portaled OUT of it (a modal Content lands in `document.body`, never in its
 *  React parent). See `MeasuredSpec`. */
function measure(roots: Element[], spec: MeasureSpec): RowEvidence {
  const { select, prop, token, state, endpoint } = spec;
  const blank: RowEvidence = {
    token, prop, select, pseudo: spec.pseudo, state, endpoint, compared: "value",
    measuredNode: null, connectedAtRead: false, probeNode: null,
    source: "", measured: "", expected: "", bound: false, reason: "",
  };
  let el: Element | null = null;
  for (const root of roots) {
    // The root ITSELF can be the answer. Radix's Dialog portal is `asChild`, so the node that lands
    // in the body is the overlay — not a wrapper around it — and a descendant-only search would
    // report the scrim as a selector naming nothing.
    el = (root.matches(select) ? root : null) ?? root.querySelector(select);
    if (el) break;
  }
  if (!el) return { ...blank, reason: `no element matched “${select}”` };
  // Stamped once, here, from the node as it is at the instant of the read.
  blank.measuredNode = el;
  blank.connectedAtRead = el.isConnected;
  if (el.hasAttribute("data-ds-token-probe")) {
    return { ...blank, measuredNode: el, reason: "that element is a probe, not a rendered component" };
  }

  let pseudo = spec.pseudo ?? "";
  let raw = "";
  let source = "";

  if (state) {
    // The value exists only while the state is active, and JS cannot force :hover. So read the
    // declaration the component's own stylesheet will paint, then resolve it on the element.
    const look = statePaint(el, prop, state, pseudo);
    if (!look.paint) {
      return { ...blank, measuredNode: el, reason: stateMiss(prop, state, look) };
    }
    pseudo = pseudo || look.paint.pseudo;
    source = look.paint.selector;
    const painted = probeResolve(el, prop, look.paint.expr);
    // The rule's own `var()` has to have substituted, or the "measurement" is the property's initial
    // value dressed up as evidence — which is how a soft re-render produced a false `differs`.
    if (painted.unresolved.length) {
      return { ...blank, measuredNode: el, source, pseudo, reason: unresolvedReason(painted.unresolved) };
    }
    raw = painted.value;
  } else {
    const running = el.getAnimations().filter((a) => a.playState === "running" || a.playState === "paused");
    if (running.length && !endpoint) {
      /* Two very different things are "animated", and only one of them has no answer.
       *
       *  · A pulse or a sweep repeats forever: there is no resting value, so a row must name a frame
       *    or stay unproven. Refusing is the whole point — that rule is unchanged.
       *  · An ENTER TRANSITION ends. A modal panel plays one on mount, and for the ~200ms it lasts
       *    the element is "animated" even though the property being read (a surface colour, a
       *    shadow) is a plain resting declaration the transition never touches. Reporting that as
       *    unmeasurable would be a fact about the first few frames, not about the component. So the
       *    row waits it out, and if it somehow never settles it says exactly that. */
      const endless = running.some(
        (a) => !Number.isFinite(Number(a.effect?.getComputedTiming().iterations ?? 1)),
      );
      return {
        ...blank, measuredNode: el,
        reason: endless
          ? `animated (${running.length} running) — name an endpoint with \`at\``
          : `${running.length === 1 ? "a transition is" : `${running.length} transitions are`} still running on this element — the resting value has not arrived`,
      };
    }
    if (endpoint) {
      if (!running.length) return { ...blank, measuredNode: el, reason: "no animation on this element to take an endpoint of" };
      const saved = running.map((a) => ({ a, time: a.currentTime, playing: a.playState === "running" }));
      for (const a of running) {
        const d = Number(a.effect?.getComputedTiming().duration ?? 0);
        a.pause();
        a.currentTime = (endpoint.percent / 100) * d;
      }
      raw = getComputedStyle(el, pseudo || null).getPropertyValue(prop);
      for (const s of saved) { s.a.currentTime = s.time; if (s.playing) s.a.play(); }
      source = `@keyframes ${running.map((a) => (a as CSSAnimation).animationName ?? "?").join(" + ")}`;
    } else {
      raw = getComputedStyle(el, pseudo || null).getPropertyValue(prop);
    }
  }

  if (!raw.trim()) return { ...blank, measuredNode: el, source, pseudo, reason: `${prop} computes to nothing on this element` };

  const cmp = compareClaim(el, prop, token, raw);
  if (cmp.reason) return { ...blank, measuredNode: el, source, pseudo, reason: cmp.reason };
  return {
    ...blank, pseudo, source,
    measuredNode: el, probeNode: cmp.probeNode,
    measured: cmp.measured, expected: cmp.expected, bound: cmp.bound,
    compared: cmp.compared, geometry: cmp.geometry,
    shadow: cmp.shadow, shadowExpected: cmp.shadowExpected,
    reason: "",
  };
}

/* ---- the measurement root ------------------------------------------------
   WHAT A ROW NEEDS FROM THE SPEC THAT HOSTS IT: where to look, whether there is
   anything to look at yet, and — for a surface that cannot stay mounted — a way
   to say it has finished looking. See `MeasuredSpec` for the cycle itself. */
type MeasureScope = {
  /** The measurement roots, in search order: the hidden host, then anything this host's own
   *  instance portaled OUT of it. Called at read time, never cached, because a portal lands a
   *  commit after the instance renders. */
  roots: () => Element[];
  /** Which mount this row is reading. Bumped per cycle, so a row re-reads a remounted instance. */
  generation: number;
  /** Is an instance mounted right now? A row does not read — and records nothing — while false. */
  live: boolean;
  /** THE BARRIER. A row calls this as it starts reading and calls what it returns when it has
   *  finished; a transient host will not unmount until every joined row has released. */
  join: (generation: number) => () => void;
};

const NO_RELEASE = () => {};
const MeasureHost = createContext<MeasureScope | null>(null);

/** part · token · value · verdict. The header the old tables never had — the third column carried
 *  nine different meanings across the tree and nothing said which.
 *
 *  ── WHY THESE TRACKS ──────────────────────────────────────────────────────────────────────────
 *  TWO of the four columns hold prose that wraps (the part's note, the verdict's `stated ·` /
 *  `differs —` sentence) and TWO hold fixed-pitch content that never will. So the prose columns
 *  are the flexible ones and the mono columns are sized to what they actually carry — the reverse
 *  of the first cut, where the token column was `1.5fr` and grew with the table while its content
 *  did not: at a 852px table the widest token cell in the whole tree measured 210px inside a 265px
 *  track, so ~90px of that column was dead on EVERY row of EVERY component.
 *
 *   · 220px for the token: 26 mono chars at 7.22px + a 14px swatch and its 8px gap = 210, and the
 *     one 30-char no-swatch name (`--base-card-surface-box-shadow`) = 217. That covers every token
 *     the tree names on one line but the 46-char SegmentedControl outlier, which wrapped at the old
 *     width too and still breaks at a hyphen.
 *   · 96px for the value: unchanged, and the reason is spelled out on `longValue` in `MeasuredRow`.
 *
 *  The value column is LEFT-aligned, and that is the other half of the fix. Right-aligning an
 *  INTERIOR column pushes its content flush against the following gutter, so it read as glued to
 *  the verdict while a widening hole opened between it and the token — the same right-align that is
 *  correct in `SPEC_GRID`, where the value is the LAST column and lands flush with the table's own
 *  edge. Four left edges, one gutter, and the raggedness that is left is content-driven. It also
 *  keeps the system's own rule: `Table` right-aligns a column (with tabular figures) only when it
 *  is marked `numeric`, and this one carries hexes, px, keywords and weights side by side.
 *
 *  One gutter for every column (`--space-4`), not a per-pair judgement call.
 *
 *  Both mono tracks are `minmax(0, …)` rather than plain lengths: at their ideal width they ARE
 *  220/96, but a table narrow enough that two fixed tracks plus the gutters no longer fit gives
 *  them up instead of pushing the page into a horizontal scroll (measured: a 420px viewport
 *  overflowed by 15px with plain lengths, and does not with these). */
export const MEASURED_COLUMNS = "minmax(0, 1fr) minmax(0, 220px) minmax(0, 96px) minmax(0, 0.8fr)";
export const MEASURED_GRID: CSSProperties = {
  display: "grid", gridTemplateColumns: MEASURED_COLUMNS,
  columnGap: "var(--space-4)", rowGap: "var(--space-3)",
  padding: "7px 20px", borderTop: "1px solid var(--ds-stroke-weak)", alignItems: "baseline",
};
const HEAD: CSSProperties = { color: "var(--ds-text-weak)", letterSpacing: "0.06em", textTransform: "uppercase" };

/** Frames the host keeps waiting after the last row released, in case one more is on its way. */
const LATE_JOIN_FRAMES = 4;
/** Hard cap on a `transient` mount. A row that never releases must not be able to leave the page
 *  scroll-locked; the cycle ends regardless and the rows that did not finish stay unproven. */
const CYCLE_CAP_MS = 4000;

/** Hosts a real instance of the component and lets the rows beneath measure it.
 *
 *  `render` receives the host element so a PORTALED surface can be aimed into it
 *  (`<Popover.Content forceMount container={host} />`) — the panel then exists in the measurement
 *  root without the docs page having to sit in an open state. The host is `visibility: hidden`, so
 *  it paints nothing, holds no focus and is skipped by axe, while still computing full styles. The
 *  reader's copy of the specimen is a separate, visible render (TokenGroup's `specimen`) — this one
 *  exists only to be read, and it is a REAL instance of the component, not a stand-in for one.
 *
 *  ── `transient`: MOUNT · MEASURE · UNMOUNT ────────────────────────────────────────────────────
 *  A MODAL surface cannot be left mounted. Radix Themes hardcodes `modal: true` on `Dialog.Root`
 *  and `AlertDialog.Root` AFTER the prop spread (`Root = (p) => <Primitive.Root {...p} modal />`,
 *  and `RootProps` omits `modal` outright), so nothing a caller passes can opt out. A mounted modal
 *  puts `data-scroll-locked` on `<body>` (`overflow: hidden`) and `aria-hidden` on every body child
 *  that is not an ancestor of the panel: the docs page around it stops scrolling and leaves the
 *  a11y tree. Measured on the Dialog page with the panel force-mounted, a real 600px wheel moved
 *  `scrollTop` 0 → 0.
 *
 *  So `transient` mounts the instance, waits for every row beneath it to read, and then unmounts —
 *  the lock exists for the few frames of the read and the page is whole again afterwards. Three
 *  parts make that safe:
 *
 *   · THE BARRIER. Rows `join()` in their layout effect (children run before parents), so by the
 *     time this component's own layout effect runs, every row that will read has been counted. The
 *     host then unmounts only once all of them have released — plus `LATE_JOIN_FRAMES` of grace for
 *     a row that mounted behind a conditional. Unmounting early is worse than not measuring at all:
 *     the rows would read a torn-down tree and report it as a fact about the component.
 *   · THE ANNEX. A modal Content portals to `document.body`, not into its React parent, so it lands
 *     OUTSIDE the host. Every body child that appears while the instance is mounted is therefore
 *     adopted into the measurement scope and hidden in the same commit that created it — before the
 *     browser can paint it — and un-hidden and dropped when the cycle ends. Components that accept
 *     a portal `container` (Radix Themes' `Dialog.Content`) should still be aimed at the host; the
 *     annex is for the ones that own their portal internally.
 *   · THE RE-RUN. The cycle restarts on every appearance/accent flip, exactly like every other
 *     measured table, so the values re-resolve rather than going stale at the first theme. */
export function MeasuredSpec({
  render, transient = false, children,
}: { render: (host: HTMLElement) => ReactNode; transient?: boolean; children: ReactNode }) {
  const themeKey = useContext(HexThemeKey);
  const [host, setHost] = useState<HTMLDivElement | null>(null);
  // generation 0 = nothing has been mounted yet (transient only; a static spec is live from the start).
  const [cycle, setCycle] = useState(() => ({ generation: transient ? 0 : 1, live: !transient }));

  const barrier = useRef({ gen: 0, pending: 0, joined: 0, sealed: false });
  /** Body children present when this cycle opened — anything else is the instance's own portal. */
  const resident = useRef<Set<Element>>(new Set());
  const annexes = useRef<HTMLElement[]>([]);
  /** Whether a cycle is open, for the body watcher (a ref: it is read from outside React's flow). */
  const cycleOpen = useRef(false);

  // Reset the barrier DURING RENDER, not in an effect: a child row joins in its own layout effect,
  // which runs BEFORE this component's, so the counter for the new cycle has to exist by then.
  if (barrier.current.gen !== cycle.generation) {
    barrier.current = { gen: cycle.generation, pending: 0, joined: 0, sealed: false };
  }

  /** Take in (and hide) every body child that was not there when the cycle opened. */
  const adopt = useCallback(() => {
    if (!transient || !cycleOpen.current) return;
    for (const n of Array.from(document.body.children)) {
      if (!(n instanceof HTMLElement) || resident.current.has(n)) continue;
      resident.current.add(n);
      n.style.setProperty("visibility", "hidden");
      n.setAttribute("data-ds-measure-annex", "");
      annexes.current.push(n);
    }
  }, [transient]);

  /* HIDE IT BEFORE IT PAINTS. Two paths, because neither alone covers it:
   *   · a body watcher, so an insertion in ANY commit is caught. Radix's own portal primitive renders
   *     null on its first pass and only opens the portal from its own layout effect, so the panel
   *     arrives a commit after the one this component's effects run in. The watcher's callback is a
   *     microtask, which still lands before the browser paints;
   *   · the synchronous `adopt()` below, called from the rows' effects, so the first READ already has
   *     the annex in scope rather than costing a frame of retry. */
  useLayoutEffect(() => {
    if (!transient || !host) return;
    const watcher = new MutationObserver(() => adopt());
    watcher.observe(document.body, { childList: true });
    return () => {
      watcher.disconnect();
      // Unmounting mid-cycle (a story swap) must not leave an adopted node hidden forever: React
      // removes the ones it created, but a node adopted by accident would just stay invisible.
      cycleOpen.current = false;
      for (const n of annexes.current) {
        n.style.removeProperty("visibility");
        n.removeAttribute("data-ds-measure-annex");
      }
      annexes.current = [];
    };
  }, [transient, host, adopt]);

  const roots = useCallback(() => {
    adopt();
    const list: Element[] = [];
    if (host) list.push(host);
    for (const n of annexes.current) if (n.isConnected) list.push(n);
    return list;
  }, [adopt, host]);

  // Held in refs so the barrier's callbacks (which outlive a render) never close over a stale cycle.
  const finish = useRef(() => {});
  finish.current = () => {
    if (!transient) return;
    setCycle((c) => (c.live ? { generation: c.generation, live: false } : c));
  };
  const scheduleClose = useRef(() => {});
  scheduleClose.current = () => {
    const gen = barrier.current.gen;
    let frames = 0;
    const tick = () => {
      const b = barrier.current;
      if (b.gen !== gen || !b.sealed || b.pending > 0) return; // a late row joined — its release re-schedules
      if (frames++ < LATE_JOIN_FRAMES) { requestAnimationFrame(tick); return; }
      finish.current();
    };
    requestAnimationFrame(tick);
  };

  const join = useCallback((generation: number) => {
    if (!transient) return NO_RELEASE;
    const b = barrier.current;
    if (b.gen !== generation) return NO_RELEASE; // a row left over from a cycle that already closed
    b.pending += 1;
    b.joined += 1;
    let released = false;
    return () => {
      if (released) return;
      released = true;
      const cur = barrier.current;
      if (cur.gen !== generation) return;
      cur.pending -= 1;
      if (cur.sealed && cur.pending === 0) scheduleClose.current();
    };
  }, [transient]);

  // Open a cycle: snapshot the body first (so the instance's portal is identifiable), then mount.
  // Re-runs on a theme flip, which is what makes a transient table re-resolve like every other one.
  useLayoutEffect(() => {
    if (!transient || !host) return;
    resident.current = new Set(Array.from(document.body.children));
    cycleOpen.current = true;
    setCycle((c) => ({ generation: c.generation + 1, live: true }));
  }, [transient, host, themeKey]);

  // Seal the barrier. Children's layout effects have all run by now, so `joined` is final.
  useLayoutEffect(() => {
    if (!transient || !cycle.live) return;
    adopt(); // belt to the rows' braces: hide the portal even if no row reads it
    const b = barrier.current;
    b.sealed = true;
    if (b.pending === 0) scheduleClose.current();
    const cap = setTimeout(() => finish.current(), CYCLE_CAP_MS);
    return () => clearTimeout(cap);
  }, [transient, adopt, cycle.generation, cycle.live]);

  // The cycle closed: the instance is gone and took its portal with it. Release anything still
  // standing (a node this host did not create can be adopted by accident; it must not stay hidden).
  useLayoutEffect(() => {
    if (!transient || cycle.live) return;
    cycleOpen.current = false;
    for (const n of annexes.current) {
      n.style.removeProperty("visibility");
      n.removeAttribute("data-ds-measure-annex");
    }
    annexes.current = [];
  }, [transient, cycle.live, cycle.generation]);

  const scope = useMemo<MeasureScope>(
    () => ({ roots, generation: cycle.generation, live: Boolean(host) && cycle.live, join }),
    [roots, cycle.generation, cycle.live, host, join],
  );

  return (
    <>
      <div
        ref={setHost}
        /* The cycle's state, so a `play` can wait for the page to be whole again before it asserts
           anything about scrolling, focus or what is portaled. `awaitMeasuredRows` reads it. */
        data-measure-cycle={transient ? (cycle.generation === 0 ? "arming" : cycle.live ? "reading" : "done") : undefined}
        style={{ position: "absolute", width: 0, height: 0, overflow: "hidden", visibility: "hidden" }}
      >
        {host && cycle.live ? render(host) : null}
      </div>
      <MeasureHost.Provider value={scope}>
        <Box style={{ ...MEASURED_GRID, borderTop: "none", paddingTop: 10, paddingBottom: 4 }}>
          <Text size="1" weight="bold" style={HEAD}>Part</Text>
          <Text size="1" weight="bold" style={HEAD}>Token claimed</Text>
          <Text size="1" weight="bold" style={HEAD}>Measured</Text>
          <Text size="1" weight="bold" style={HEAD}>Verdict</Text>
        </Box>
        {children}
      </MeasureHost.Provider>
    </>
  );
}

/** Brings a surface that only exists AFTER an interaction into a measurement host, by performing that
 *  interaction on the component's own control.
 *
 *  A flyout panel is not a prop — no `open`, no `forceMount` reaches it, because the component owns
 *  the state a trigger toggles. The alternative to this is a story rebuilding the panel's markup by
 *  hand and measuring that, which measures the story. So the host clicks the REAL control (`trigger`,
 *  a selector resolved inside these children) exactly as a reader would, and the component opens
 *  through its own code path. For a measurement host only: the click is why `MeasuredSpec transient`
 *  exists to take the result down again afterwards. */
export function OpenedByClick({ trigger, children }: { trigger: string; children: ReactNode }) {
  const box = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    box.current?.querySelector<HTMLElement>(trigger)?.click();
  }, [trigger]);
  return <div ref={box}>{children}</div>;
}

/** The measured row. There is deliberately no `value`, `swatch` or `verdict` prop: everything the
 *  row shows is read here, from the element `select` names, and compared against `token`. */
export type MeasuredRowProps = {
  /** What is painted — "Panel surface", "Trigger hover fill", "Focus ring". */
  part: string;
  /** The rule being claimed: the `--ds-*` role, or the Radix token a reused skin paints from. */
  token: string;
  /** CSS selector for the painting element, resolved inside the enclosing `<MeasuredSpec>`. */
  select: string;
  /** The longhand CSS property to read — "background-color", "outline-color", "font-size". */
  prop: string;
  /** Read the pseudo-element instead of the element (rings drawn on `::before` / `::after`). */
  pseudo?: "::before" | "::after";
  /** Read the paint the component's own stylesheet declares for this state. */
  state?: MeasureState;
  /** For an animated value: the named frame to read. Without it an animated row stays unproven. */
  at?: MeasureEndpoint;
  /** One line under the part, for what the part IS. Never for the value. */
  note?: ReactNode;
  /* The three cells a story may NOT supply. They are declared — as literal string types nothing
   * real can satisfy — rather than simply omitted, because the literal is what TypeScript PRINTS
   * when someone tries: the error says what to do instead of "property does not exist". Same idiom
   * as `RenderedRowProps.swatch` above, and the reason 52 bad rows became 52 compile errors then. */
  value?: "MEASURED ROWS READ THE VALUE — drop `value`, and give `select` + `prop` instead";
  swatch?: "MEASURED ROWS DERIVE THE SWATCH from what they measured — drop `swatch`";
  verdict?: "MEASURED ROWS COMPUTE THE VERDICT by comparing — drop `verdict`";
};

export function MeasuredRow({ part, token, select, prop, pseudo, state, at, note }: MeasuredRowProps) {
  const scope = useContext(MeasureHost);
  const themeKey = useContext(HexThemeKey);
  const row = useRef<HTMLDivElement>(null);
  const [ev, setEv] = useState<RowEvidence | null>(null);

  const generation = scope?.generation ?? 0;
  const scopeLive = scope?.live ?? false;

  useLayoutEffect(() => {
    /* THE READING AND THE LABEL ARE WRITTEN TOGETHER.
     *
     * `data-token-row` is what the guard reads a row's status off, and it used to be rendered from
     * React state while the evidence beside it was written straight to the node. For a row that
     * settles on its first read those land in one commit and nothing shows. A row that DISAGREES
     * does not settle on its first read — it re-reads for `SETTLE_FRAMES` and stamps from inside a
     * `requestAnimationFrame`, which is exactly where `awaitMeasuredRows` is polling. The poll sees
     * the evidence appear, stops waiting and asserts in the same frame, before React has flushed the
     * re-render: the node still says `unproven` while its own evidence says it measured cleanly and
     * simply differs. The guard then reported "unproven with no reason" — a fact about the render
     * clock — in place of "measures X, but the token resolves to Y", which is the actual defect and
     * the whole reason the row exists. (Reproduced: point Card's `Lift (elevated only)` row at
     * `--ds-shadow-6` and the suite blamed the row instead of the mismatch.)
     *
     * So the label is stamped imperatively, from the same evidence, at the same instant — never
     * inferred a frame later. React's own re-render writes the identical value back. */
    const record = (e: RowEvidence) => {
      const node = row.current;
      if (node) {
        (node as Element & { [EVIDENCE]?: RowEvidence })[EVIDENCE] = e;
        node.setAttribute("data-token-row", e.reason ? "unproven" : "measured");
      }
      setEv(e);
    };

    /* No spec in scope at all is a finding — the row can never measure. A spec whose instance is
     * not mounted YET is not that: the row waits, and records nothing, so a transient table never
     * flickers a false "no element matched" on its way to the real reading. */
    if (!scope) {
      record({
        token, prop, select, pseudo, state, endpoint: at, measuredNode: null, connectedAtRead: false,
        probeNode: null, compared: "value", source: "", measured: "", expected: "", bound: false,
        reason: "no <MeasuredSpec> in scope",
      });
      return;
    }
    if (!scopeLive) return;

    // Join the barrier BEFORE the first read, so a transient host cannot unmount underneath us.
    const release = scope.join(generation);
    let live = true;
    /* Three things arrive late, and all three used to be printed as findings about the component.
     *
     *  · the ELEMENT. A portaled panel mounts a frame behind; a ScrollArea thumb takes about seven;
     *    a Toast is spawned by its own engine and a CommandPalette bootstraps asynchronously. One
     *    frame of grace was not enough, and a part that simply had not arrived read exactly like a
     *    selector pointing at nothing. Those are opposite findings — one is the row's fault and one
     *    is nobody's — so the row waits (`ELEMENT_FRAMES`), and if it still finds nothing it says
     *    WHICH: a host that never stopped mutating was still building; a host that went quiet and
     *    still has no match has a selector that is wrong.
     *  · the SUBSTITUTION. On a soft re-render (only the story's query string changed) a `var()` can
     *    be a frame short of substituting, so the read is the property's initial value — that is how
     *    a row cried `differs` at a component that was correct.
     *  · the VERDICT itself. A disagreement is never printed off a first read; it is confirmed on a
     *    later frame. A real mismatch survives unchanged, a transient one is gone, and nobody has to
     *    learn that red might mean nothing. */
    const ELEMENT_FRAMES = 60;
    const SETTLE_FRAMES = 3;
    let mutations = 0;
    let watcher: MutationObserver | null = null;

    const run = (attempt: number) => {
      if (!live || !row.current) return;
      const scopeRoots = scope.roots();
      const e: RowEvidence = measure(scopeRoots, { select, prop, token, pseudo, state, endpoint: at });

      if (!e.measuredNode) {
        if (!watcher) {
          watcher = new MutationObserver((records) => { mutations += records.length; });
          for (const r of scopeRoots) watcher.observe(r, { childList: true, subtree: true, attributes: true });
          // A surface that owns its own portal lands in the body, not in the host — so the "is it
          // still mounting?" question has to be asked of the body too, or a part that simply had
          // not arrived would be reported as a selector naming nothing.
          watcher.observe(document.body, { childList: true });
        }
        if (attempt < ELEMENT_FRAMES) { requestAnimationFrame(() => run(attempt + 1)); return; }
        e.reason = mutations
          ? `nothing matched “${select}” after ${ELEMENT_FRAMES} frames, and the specimen is still mounting — this part arrives later than the row can wait`
          : `nothing matched “${select}”, and the specimen stopped changing while waiting — the selector does not name a part this component renders`;
      } else if (attempt < ELEMENT_FRAMES && /still running on this element/.test(e.reason)) {
        // A finite enter transition — wait for it to end rather than report the first few frames.
        requestAnimationFrame(() => run(attempt + 1));
        return;
      } else if (attempt < SETTLE_FRAMES && (!e.reason ? !e.bound : /has not settled/.test(e.reason))) {
        requestAnimationFrame(() => run(attempt + 1));
        return;
      }

      watcher?.disconnect();
      record(e);
      release(); // the barrier: this row is done with the instance
    };
    run(1);
    return () => { live = false; watcher?.disconnect(); release(); };
  }, [scope, scopeLive, generation, themeKey, select, prop, token, pseudo, state, at?.percent, at?.label]);

  const proven = Boolean(ev && !ev.reason);
  const shadowColour = ev?.compared === "shadow-colour";
  const colour = COLOUR_PROP.test(prop) || shadowColour;
  // The qualifier carries WHAT WAS READ, so "shadow colour" sits beside ":focus" — a reader must not
  // take a colour-in-shadow row as proof of the hairline's geometry too.
  const qualifier = [state ? `:${state}` : "", pseudo ?? "", at ? `@ ${at.label}` : "",
    shadowColour ? "shadow colour" : ""].filter(Boolean).join(" ");
  /* A WHOLE shadow is not a value the column can hold at any width, so it is not printed as one: the
   * cell says how many layers there are and the second line lists them — a swatch and a hex per
   * layer, its geometry beside it, under one line naming the shape of the stack. See `describeShadow`
   * for why this is presentation only. */
  const shadow = proven ? ev!.shadow : undefined;
  /* Everything else that is long — a font stack, a gradient — goes through `compactValue` first, so
   * the cell holds the head of the list and the whole of it lives in the tooltip.
   *
   * The value track is 96px — sized for a hex, which is what all but a handful of rows measure. A
   * `box-shadow`, a gradient or a font stack wrapped inside it into a cell hundreds of pixels tall,
   * and the last slice REVERTED shadow rows rather than ship that. Widening the track is not the fix:
   * every row is its own grid sharing one fixed template (which is exactly what makes the columns line
   * up across a whole table), so any content-driven track would only widen the row that needed it and
   * break the alignment for the rest. So a long value keeps its four columns and takes a SECOND LINE,
   * spanning from the token column to the end, directly under the token it belongs to. Short values —
   * the overwhelming majority — stay where the eye scans for them. */
  const shown = compactValue(prop, ev?.measured ?? "");
  const longValue = !shadow && shown.text.length > 14;

  return (
    <Box
      ref={row}
      data-token-row={proven ? "measured" : "unproven"}
      data-measured-from={ev?.source || undefined}
      style={MEASURED_GRID}
    >
      <Flex direction="column" gap="1" style={{ minWidth: 0 }}>
        <Text size="1" style={{ color: "var(--ds-text-strong)" }}>
          {linkRulings(part)}{qualifier ? <Muted> {qualifier}</Muted> : null}
        </Text>
        {note ? <Caption>{note}</Caption> : null}
      </Flex>
      <Flex align="center" gap="2" style={{ minWidth: 0 }}>
        {colour && proven ? (
          <Box style={{ width: 14, height: 14, borderRadius: 3, background: ev!.measured, boxShadow: "inset 0 0 0 1px var(--ds-stroke-weak)", flexShrink: 0 }} />
        ) : null}
        <Mono>{token}</Mono>
      </Flex>
      <Box style={{ overflowWrap: "anywhere" }} title={shown.title}>
        {!proven ? <Mono muted>—</Mono>
          : shadow ? <Mono muted>{shadow.layers.length} layer{shadow.layers.length === 1 ? "" : "s"}</Mono>
          : longValue ? null
          : <Mono muted>{shown.text}</Mono>}
      </Box>
      <Box style={{ overflowWrap: "anywhere" }}>
        {!ev ? <Mono muted>reading…</Mono>
          : ev.reason ? <Mono muted>not measured · {ev.reason}</Mono>
          : ev.bound ? (
            <Text size="1" style={{ color: "var(--ds-text-weak)" }}>
              {shadowColour ? `matches — colour only; geometry (${ev.geometry}) not compared`
                : shadow ? "matches — every layer, colour and geometry"
                : "matches"}
            </Text>
          )
          : (
            <Text size="1" style={{ color: "var(--ds-text-error)" }}>
              differs — the token resolves to{" "}
              {shadow
                ? (ev.shadowExpected?.layers.length ? `a different shadow (${ev.shadowExpected.summary})` : "nothing")
                : (compactValue(prop, ev.expected).text || "nothing")}
            </Text>
          )}
      </Box>
      {shadow ? (
        <Flex direction="column" gap="1" style={{ gridColumn: "2 / -1", minWidth: 0, paddingTop: 2 }}>
          <Muted>{shadow.summary}</Muted>
          {/* keyed by position as well as content — two identical layers in one stack is legal CSS */}
          {shadow.layers.map((l, i) => (
            <Flex key={`${i}-${l.raw}`} align="center" gap="2" style={{ minWidth: 0 }} title={l.raw}>
              <Box style={{ width: 14, height: 14, borderRadius: 3, background: l.hex || "transparent", boxShadow: "inset 0 0 0 1px var(--ds-stroke-weak)", flexShrink: 0 }} />
              <Box style={{ minWidth: 76, flexShrink: 0 }}><Mono muted>{l.hex || "—"}</Mono></Box>
              <Box style={{ minWidth: 34, flexShrink: 0 }}><Muted>{l.kind}</Muted></Box>
              <Mono muted>{l.geometry}</Mono>
            </Flex>
          ))}
        </Flex>
      ) : proven && longValue ? (
        <Box style={{ gridColumn: "2 / -1", overflowWrap: "anywhere", paddingTop: 2 }} title={shown.title}>
          <Mono muted>{shown.text}</Mono>
        </Box>
      ) : null}
    </Box>
  );
}

// The low-token (skin-reuse) presentation of the "Tokens" section. A skin-reusing wrap — Link (one
// paint role, --ds-text-link) or Separator / Tooltip / Kbd (no --ds-* role, values read live) — has
// ≤1 paint token, so the multi-token TokenGroup card (specimen + prose blurb over a token grid)
// collapses to mostly-prose over a single row and reads broken (flagged in review on Link, where the two-
// column "specimen | prose" header balloons across the widened band). This renders it clean: a one-
// line reuse rationale left-aligned to the grid's first column, above EXACTLY ONE labeled binding row
// (a RoleRow, or a RenderedRow for the tokenless skin-reusers). No embedded specimen — the component
// already renders in the Specimen section above; the single row still reads live off the DOM so the
// drift guard is intact. Multi-token components keep the fuller TokenGroup card untouched.
export function LiteTokenSpec({ rationale, children }: { rationale: ReactNode; children: ReactNode }) {
  return (
    <Box style={{ borderRadius: "var(--ds-radius-4)", border: "1px solid var(--ds-stroke-weak)", overflow: "hidden", background: "var(--ds-bg-subtle)" }}>
      <Box style={{ padding: "14px 20px" }}>
        <Text size="1" style={{ color: "var(--ds-text-weak)", lineHeight: 1.6, maxWidth: "var(--ds-text-measure)" }}>{linkRulings(rationale)}</Text>
      </Box>
      {children}
    </Box>
  );
}

// A labelled group card: the label, the specimen when one is given, then the live token table
// (`children`).
export function TokenGroup({ label, blurb, specimen, children }: { label: string; blurb?: string; specimen?: ReactNode; children: ReactNode }) {
  return (
    <Box style={{ borderRadius: "var(--ds-radius-4)", border: "1px solid var(--ds-stroke-weak)", overflow: "hidden", background: "var(--ds-bg-subtle)" }}>
      {specimen ? (
        <Flex direction="column" align="start" gap="2" style={{ padding: "20px" }}>
          <Text size="1" weight="bold" style={{ color: "var(--ds-text-weak)", letterSpacing: "0.06em" }}>{label}</Text>
          <Box my="1">{specimen}</Box>
          {blurb && <Text size="1" style={{ color: "var(--ds-text-weak)" }}>{linkRulings(blurb)}</Text>}
        </Flex>
      ) : (
        <Box style={{ padding: "14px 20px" }}>
          <Text size="1" weight="bold" style={{ color: "var(--ds-text-weak)", letterSpacing: "0.06em" }}>{label}</Text>
        </Box>
      )}
      <Box style={{ padding: "0 0 8px" }}>{children}</Box>
    </Box>
  );
}

/* ---- Properties: prop reference table (shared across System/* components) - */
export type PropDef = { name: string; type: string; def?: string; locked?: boolean; desc: ReactNode; source: string };

const LockTag = () => (
  <span style={{ display: "inline-flex", alignItems: "center", marginLeft: 6, padding: "0 6px", height: 16, borderRadius: "var(--ds-radius-2)", background: "var(--ds-fill-accent-weak)", border: "1px solid var(--ds-stroke-accent-weak)", color: "var(--ds-text-link)", fontFamily: "var(--code-font-family)", fontSize: 10, fontWeight: 700, letterSpacing: "0.06em", lineHeight: "14px" }}>LOCKED</span>
);

export function PropTable({ rows }: { rows: PropDef[] }) {
  return (
    <Table.Root variant="surface" size="1" className="ds-prop-table">
      <Table.Header>
        <Table.Row>
          <Table.ColumnHeaderCell style={{ width: "18%" }}>Prop</Table.ColumnHeaderCell>
          <Table.ColumnHeaderCell style={{ width: "18%" }}>Type</Table.ColumnHeaderCell>
          <Table.ColumnHeaderCell style={{ width: "11%" }}>Default</Table.ColumnHeaderCell>
          <Table.ColumnHeaderCell style={{ width: "41%" }}>Description</Table.ColumnHeaderCell>
          <Table.ColumnHeaderCell style={{ width: "12%" }}>Source</Table.ColumnHeaderCell>
        </Table.Row>
      </Table.Header>
      <Table.Body>
        {rows.map((r) => (
          <Table.Row key={r.name}>
            <Table.RowHeaderCell style={{ verticalAlign: "top" }}><Code>{r.name}</Code></Table.RowHeaderCell>
            <Table.Cell style={{ verticalAlign: "top" }}><Code color="gray" variant="ghost" style={{ whiteSpace: "normal" }}>{r.type}</Code></Table.Cell>
            <Table.Cell style={{ verticalAlign: "top" }}>{r.def ? <Code variant="ghost">{r.def}</Code> : <Text size="1" style={{ color: "var(--ds-text-weak)" }}>—</Text>}{r.locked && <LockTag />}</Table.Cell>
            <Table.Cell style={{ verticalAlign: "top" }}><Text size="1" style={{ color: "var(--ds-text-strong)", lineHeight: 1.55 }}>{linkRulings(r.desc)}</Text></Table.Cell>
            <Table.Cell style={{ verticalAlign: "top" }}><Text size="1" style={{ color: "var(--ds-text-weak)", fontFamily: "var(--code-font-family)" }}>{r.source}</Text></Table.Cell>
          </Table.Row>
        ))}
      </Table.Body>
    </Table.Root>
  );
}

/* ---- Keyboard: key-binding reference rows (shared by Select / MultiSelect) - */
export type KeyBinding = { keys: string[]; action: ReactNode; src: "system" | "radix" | "popover" };

/* THE CAP IS THE COMPONENT. Re-exported under the kit's own name so the key tables that import it
 * keep their import, but every key a Keyboard section renders is now `System/Kbd` — Radix's key-cap
 * skin, on the uiSize TEXT lane. What stood here was a hand-rolled replica of it, frozen at 12px /
 * 18px / 1px 7px: the one place in the library where the documentation of a component was drawn by a
 * copy of that component, and the copy did not move when the global size did. A page set to `large`
 * showed large prose beside small caps, and any change to the real Kbd was invisible in the twenty
 * key tables that were supposed to be showing it. */
export { Kbd };

// Provenance badge: System (accent) vs a muted primitive label — Radix Themes' Select, or the
// @radix-ui/react-popover primitive MultiSelect is built on.
export const SrcTag = ({ kind }: { kind: KeyBinding["src"] }) =>
  kind === "system" ? (
    <span style={{ fontFamily: "var(--code-font-family)", fontSize: 10, fontWeight: 700, letterSpacing: "0.04em", textTransform: "uppercase", color: "var(--on-accent)", background: "var(--ds-fill-accent)", borderRadius: "var(--ds-radius-1)", padding: "2px 6px", whiteSpace: "nowrap" }}>System</span>
  ) : (
    <span style={{ fontFamily: "var(--code-font-family)", fontSize: 11, color: "var(--ds-text-weak)", whiteSpace: "nowrap" }}>{kind === "popover" ? "Popover" : "Radix"}</span>
  );

export const KeyRow = ({ keys, action, src }: KeyBinding) => (
  <Flex align="start" gap="4" style={{ padding: "10px 16px", borderTop: "1px solid var(--ds-stroke-weak)" }}>
    <Flex gap="1" wrap="wrap" style={{ width: 168, flexShrink: 0 }}>{keys.map((k) => <Kbd key={k}>{k}</Kbd>)}</Flex>
    <Text size="2" style={{ color: "var(--ds-text-strong)", lineHeight: 1.6, flex: 1, minWidth: 0 }}>{linkRulings(action)}</Text>
    <Box style={{ width: 72, flexShrink: 0, textAlign: "right", paddingTop: 2 }}><SrcTag kind={src} /></Box>
  </Flex>
);
