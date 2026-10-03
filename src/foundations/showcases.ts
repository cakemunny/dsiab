/* =============================================================================
   showcases.ts — THE ONE LIST OF SHOWCASE RECREATIONS
   -----------------------------------------------------------------------------
   Ruled in DECISIONS [[showcases-and-fixture]]. `src/scenarios/` holds two kinds of page that obey
   opposite rules, and three separate guards need to tell them apart:

     SHOWCASE — a recreation of a recognisable interface archetype, rendered at
       rest, full-bleed, one leaf each in the `UI examples` folder ([[sidebar-order]] moved them
       there from the sidebar root [[showcases-and-fixture]] chose). It asserts NOTHING: axe is off
       wholesale and box-law layer 2 does not apply. It is a visual reference a
       person reads, and its job is that a newcomer can judge our components
       against an interface they already know.
     FIXTURE — `_composition.stories.tsx`, the dense cross-component probe that
       inherited the old scenario suite's test role. Every rule still binds it.

   WHY THIS FILE EXISTS RATHER THAN A LIST IN EACH GUARD. `axe-scope` keys off
   FILE PATHS (it reads source text) and `boxLaw` keys off STORY TITLES (it runs
   in the browser with no filesystem). Two hand-maintained lists of the same
   eight pages would drift the first time one was edited, and the drift would be
   silent in both directions: a page missing from one list gets a rule applied
   that [[showcases-and-fixture]] says should not apply to it. So both derive from `SHOWCASES` below,
   and `showcases.node-check.ts` asserts the list still matches what is on disk.

   ADDING OR REMOVING A RECREATION is therefore a single edit here, plus the
   `storySort` order literal in `.storybook/preview.tsx` — which has its own
   drift guard, because Storybook statically parses that file and it cannot
   import from this one.
   ============================================================================= */

/** A showcase recreation: the source file, its `UI examples/<Name>` sidebar title, and
 *  what it depicts. */
export interface Showcase {
  /** Repo-relative source path — the key `axe-scope.node-check.ts` reads. */
  readonly file: string;
  /** Storybook title, `UI examples/<Name>` with exactly one slash ([[sidebar-order]]). The file's single
   *  story is named `<Name>`, so Storybook hoists it to one sidebar leaf. */
  readonly title: string;
  /** What the page depicts, in one line. Shown in guard failures so a reader of a
   *  red lane knows what the entry is without opening the file. */
  readonly depicts: string;
}

/** The sidebar folder every showcase sits in ([[sidebar-order]]). */
export const SHOWCASE_FOLDER = "UI examples";

/** The eight recreations, in sidebar order: the three AI-native paradigms lead,
 *  because they are the ones a component reference cannot teach you. */
export const SHOWCASES: readonly Showcase[] = [
  {
    file: "src/scenarios/CodeEditor.stories.tsx",
    title: "UI examples/Code editor",
    depicts: "an AI-integrated code editor",
  },
  {
    file: "src/scenarios/AiAssistant.stories.tsx",
    title: "UI examples/AI assistant",
    depicts: "a conversational AI assistant",
  },
  {
    file: "src/scenarios/AgentRun.stories.tsx",
    title: "UI examples/Agent run",
    depicts: "an autonomous agent run view",
  },
  {
    file: "src/scenarios/VideoPlatform.stories.tsx",
    title: "UI examples/Video platform",
    depicts: "a video watch page",
  },
  {
    file: "src/scenarios/SocialFeed.stories.tsx",
    title: "UI examples/Social feed",
    depicts: "a social media feed",
  },
  {
    file: "src/scenarios/MailClient.stories.tsx",
    title: "UI examples/Mail client",
    depicts: "a web mail client",
  },
  {
    file: "src/scenarios/AnalyticsDashboard.stories.tsx",
    title: "UI examples/Analytics dashboard",
    depicts: "a product analytics dashboard",
  },
  {
    file: "src/scenarios/ProjectBoard.stories.tsx",
    title: "UI examples/Project board",
    depicts: "a kanban project board",
  },
];

/** The composition fixture that inherited the probe role. Underscore-prefixed, so
 *  the docs guards skip it and no reader lands on it. */
export const COMPOSITION_FIXTURE = "src/scenarios/_composition.stories.tsx";

/** Titles, for the browser-side guards that have no filesystem. */
export const SHOWCASE_TITLES: ReadonlySet<string> = new Set(SHOWCASES.map((s) => s.title));

/**
 * Is this story a showcase recreation?
 *
 * Matched on TITLE first. Falls back to the id for the same reason `isLayer2Story` checks both: a
 * caller that only has an id still gets a verdict. The fallback slugs the whole title the way
 * Storybook does, `/` included: lowercase, every run of characters other than a letter or digit
 * collapsed to one hyphen, hyphens trimmed. `UI examples/Code editor` becomes `ui-examples-code-editor`.
 */
export function isShowcaseStory(story: { title?: string; id?: string }): boolean {
  if (story.title && SHOWCASE_TITLES.has(story.title)) return true;
  if (!story.id) return false;
  const idPrefix = story.id.split("--")[0];
  return SHOWCASES.some(
    (s) => s.title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "") === idPrefix,
  );
}
