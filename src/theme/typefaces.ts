/* =============================================================================
   typefaces.ts — the vetted roster, and the escape hatch
   -----------------------------------------------------------------------------
   `typography.css` reads its three families through
   `var(--ds-typeface-body|heading|code, <default>)`. This module owns what those
   properties may be set to.

   TWO PATHS, KEPT APART BY THE TYPE, BECAUSE THEY BEHAVE DIFFERENTLY:
     - a ROSTER face is a bare string. The system knows the family, owns its
       fallback chain, and has verified it against the vetting criteria.
     - `{ stack: "..." }` is any CSS font stack. The system sets it and makes no
       claim about it — and, critically, LOADS NOTHING for it.

   A type union that hid that fork would be a control that lies at the call site
   ("I set both the same way, why did one 404?"), so it is in the JSDoc of every
   branch as well as here.

   THE SYSTEM DOES BUNDLE THE ROSTER FONTS — `src/tokens/index.css` imports all
   six weight/slope files for each, alongside Inter's. Ruled: the system
   vets them AND ships them, so a consumer sets a face and it renders with no
   further step.

   The cost is real and is stated at the import site rather than here: every
   consumer downloads all four families whether they use one or none, which was
   already true of Inter alone. Opt-in per face would fix both at once and is the
   open packaging question — but it is a question about DELIVERY, not about what
   this module knows, so it changes the imports and not this table.
   ============================================================================= */

/** A sans face vetted for body and heading use. */
export type SansFace = "schibsted-grotesk" | "atkinson-hyperlegible-next";
/** A monospace face vetted for the code role. */
export type MonoFace = "jetbrains-mono";
export type RosterFace = SansFace | MonoFace;

/** An arbitrary CSS font stack. The consumer owns delivery AND the outcome. */
export interface CustomStack {
  stack: string;
}

export interface TypefaceSet {
  /** Headings. Unset follows `body`. A roster face resolves a vetted stack; `{ stack }` is your own and loads nothing. */
  heading?: SansFace | CustomStack;
  /** Body and all UI text. A roster face resolves a vetted stack; `{ stack }` is your own and loads nothing. */
  body?: SansFace | CustomStack;
  /** Code and monospace. A roster face resolves a vetted stack; `{ stack }` is your own and loads nothing. */
  code?: MonoFace | CustomStack;
}

interface RosterEntry {
  /** Which lane this face serves — the column that lets one table hold both. */
  role: "sans" | "mono";
  /** The family name as the font files register it. */
  family: string;
  /** The full stack the system sets, fallbacks included. */
  stack: string;
  /** The `@fontsource` package THIS SYSTEM imports to supply the files — see
   *  `tokens/index.css`. The consuming app imports nothing; `INCUMBENTS.menlo` is
   *  the one entry naming no package, because it is a system face. */
  fontsource: string;
  /** Why this face is on the roster rather than merely acceptable. */
  note: string;
}

const SANS_FALLBACK = `-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", sans-serif`;
const MONO_FALLBACK = `"Menlo", "Consolas", "Bitstream Vera Sans Mono", monospace`;

/** The incumbents. They are not `RosterFace` values — selecting them writes no
 *  property at all — but they ARE faces the system ships and loads, so anything
 *  claiming to list the system's typefaces has to include them or it is lying by
 *  omission. `role` is what lets one table hold both lanes honestly. */
export const INCUMBENTS = {
  inter: {
    role: "sans" as const,
    family: "Inter",
    stack: `"Inter", ${SANS_FALLBACK}`,
    fontsource: "@fontsource/inter",
    note: "The system default for body and headings. Every metric in the system — the reading measure, the 12px floor, the control-box ladder — was tuned against it, so it is the baseline every other face is compared to.",
  },
  menlo: {
    role: "mono" as const,
    family: "Menlo",
    stack: MONO_FALLBACK,
    fontsource: "(system font — not bundled)",
    note: "The system default for code. A macOS system face with a Consolas and Bitstream fallback, so unlike the rest of this table it is not a package the system loads — which is exactly why a cross-platform mono is on the roster.",
  },
} as const;

export const ROSTER: Record<RosterFace, RosterEntry> = {
  "schibsted-grotesk": {
    role: "sans",
    family: "Schibsted Grotesk",
    stack: `"Schibsted Grotesk", ${SANS_FALLBACK}`,
    fontsource: "@fontsource/schibsted-grotesk",
    note: "The closest metric match to Inter measured — 0 advance and x-height both ~97% — so the reading measure and the 12px floor barely move. Drawn italic, real tabular figures, no reserved font name.",
  },
  "atkinson-hyperlegible-next": {
    role: "sans",
    family: "Atkinson Hyperlegible Next",
    stack: `"Atkinson Hyperlegible Next", ${SANS_FALLBACK}`,
    fontsource: "@fontsource/atkinson-hyperlegible-next",
    note: "The alternate that does a different job rather than a second grotesk: an accessibility-first face from the Braille Institute, drawn to disambiguate confusable letterforms.",
  },
  "jetbrains-mono": {
    role: "mono",
    family: "JetBrains Mono",
    stack: `"JetBrains Mono", ${MONO_FALLBACK}`,
    fontsource: "@fontsource/jetbrains-mono",
    note: "Highest x-height of any mono measured (~101% of Inter's), a dotted zero against an undotted O, and 1/l/I drawn apart. Every monospace is inherently tabular, so the figure contract cannot fail in the code lane.",
  },
};

const isCustomStack = (v: unknown): v is CustomStack =>
  typeof v === "object" && v !== null && typeof (v as CustomStack).stack === "string";

/** Resolve one slot to the CSS value, or null when it is unset. */
export function resolveFace(v: RosterFace | CustomStack | undefined): string | null {
  if (v === undefined) return null;
  if (isCustomStack(v)) {
    const s = v.stack.trim();
    // Empty is "not supplied", never `font-family: ;`.
    return s === "" ? null : s;
  }
  return ROSTER[v]?.stack ?? null;
}

export const TYPEFACE_PROPERTIES = [
  "--ds-typeface-heading",
  "--ds-typeface-body",
  "--ds-typeface-code",
] as const;

/**
 * Write a typeface set to the document root.
 *
 * On `documentElement` rather than the theme root, and that is load-bearing
 * rather than incidental: a PORTAL renders into `<body>` and is therefore NOT a
 * descendant of the theme root at all, so an inline style there would never
 * reach a Select menu, a MultiSelect panel or a Toast. Setting it on the
 * document root inherits to `<body>` and so to every portal.
 *
 * Unset means nothing is written, so every `var()` falls through to its default
 * and rendering is byte-identical to a system with no typeface prop at all.
 */
export function applyTypefaces(root: HTMLElement, set: TypefaceSet | undefined): void {
  const values = {
    "--ds-typeface-heading": resolveFace(set?.heading),
    "--ds-typeface-body": resolveFace(set?.body),
    "--ds-typeface-code": resolveFace(set?.code),
  };
  for (const [prop, value] of Object.entries(values)) {
    if (value === null) root.style.removeProperty(prop);
    else root.style.setProperty(prop, value);
  }
}

export function clearTypefaces(root: HTMLElement): void {
  for (const p of TYPEFACE_PROPERTIES) root.style.removeProperty(p);
}
