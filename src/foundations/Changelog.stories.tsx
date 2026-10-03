import type { CSSProperties } from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { Page, PageHeader } from "../components/ui/_storyKit";
// Self-syncing: the changelog is generated from git history by `scripts/gen-changelog.mjs`
// (npm run changelog) into this committed data module, so the story can never hand-drift from the
// commits. A Storybook story can't run git at render time — the prebuild file is the bridge.
import { CHANGELOG, type ChangelogEntry } from "./changelog.generated";

type Entry = ChangelogEntry;
const ENTRIES = CHANGELOG.entries;

// git log is already newest-first; bucket consecutive entries into day groups, order preserved.
type Day = { date: string; entries: Entry[] };
const DAYS: Day[] = ENTRIES.reduce<Day[]>((days, e) => {
  const last = days[days.length - 1];
  if (last && last.date === e.date) last.entries.push(e);
  else days.push({ date: e.date, entries: [e] });
  return days;
}, []);

// Near-monochrome type tag — feat/fix stay neutral; only a breaking change earns the red hit.
function typeStyle(type: string): CSSProperties {
  const breaking = type === "breaking";
  return {
    fontFamily: "var(--code-font-family)", fontSize: 11, fontWeight: 700, letterSpacing: "0.02em",
    padding: "1px 6px", borderRadius: "var(--ds-radius-2)", flexShrink: 0, alignSelf: "flex-start",
    color: breaking ? "var(--ds-text-error)" : "var(--ds-text-weak)",
    background: breaking ? "var(--ds-fill-error-weak)" : "var(--ds-fill-weak)",
    textTransform: "uppercase",
  };
}

// A decision-id reference (e.g. [[relative-timestamp]]) cited in the commit — a pointer to the "why" on Decisions.
const refChip: CSSProperties = {
  fontFamily: "var(--code-font-family)", fontSize: 11, fontWeight: 700, whiteSpace: "nowrap",
  color: "var(--ds-text-link)", background: "var(--ds-fill-accent-weak)",
  padding: "0 5px", borderRadius: "var(--ds-radius-2)", marginLeft: 6,
};

const dayNode: CSSProperties = {
  width: 7, height: 7, borderRadius: "var(--ds-radius-full)", background: "var(--ds-fill-strong)", flexShrink: 0,
};

function ChangelogPage() {
  return (
    <Page>
      <PageHeader
        title="Changelog"
        standfirst="What’s changed in the system, newest first, generated from git history. Only features, fixes and breaking changes appear, and internal churn is filtered out. The package’s CHANGELOG.md groups the same entries by release."
      />
      <div style={{ display: "flex", flexDirection: "column", gap: 28 }}>
        {DAYS.map((day) => (
          <div key={day.date} style={{ display: "grid", gridTemplateColumns: "88px 1fr", gap: 16, alignItems: "start" }}>
            {/* The date column IS the spine — position on the page is position in time. One node per day. */}
            <div style={{ display: "flex", alignItems: "center", gap: 8, paddingTop: 3 }}>
              <span aria-hidden style={dayNode} />
              {/* No `fontVariantNumeric` here. These dates are STATIC — the law is for figures that
                  change in place (GUIDELINES §3) — and the column is set in --code-font-family, a
                  monospaced stack where every glyph already carries one advance width, so the property
                  changed nothing. It read `tabular-nums` until 2026-08-01: an inline declaration in a
                  docs page that was neither a specimen of the property nor a measured table. */}
              <time dateTime={day.date} style={{ fontFamily: "var(--code-font-family)", fontSize: 12, color: "var(--ds-text-weak)" }}>
                {day.date}
              </time>
            </div>
            <ol role="list" style={{ listStyle: "none", margin: 0, padding: "0 0 0 16px", borderLeft: "1px solid var(--ds-stroke-weak)", display: "flex", flexDirection: "column", gap: 10 }}>
              {day.entries.map((e, i) => (
                <li role="listitem" key={`${e.hash}-${i}`} style={{ display: "flex", gap: 10, alignItems: "baseline" }}>
                  <span style={typeStyle(e.type)}>{e.type}</span>
                  <span style={{ flex: 1, minWidth: 0, maxWidth: "var(--ds-text-measure)", font: "400 14px/20px var(--default-font-family)", color: "var(--ds-text-strong)" }}>
                    {e.summary}
                    {e.refs.map((r) => <span key={r} style={refChip} title={`See Decisions · ${r}`}>{r}</span>)}
                  </span>
                </li>
              ))}
            </ol>
          </div>
        ))}
      </div>
    </Page>
  );
}

const meta: Meta<typeof ChangelogPage> = {
  title: "Foundations/Changelog",
  component: ChangelogPage,
  parameters: {
    docs: {
      description: {
        component:
          "A chronological changelog — what changed in the system, newest first, grouped by day. " +
          "Generated from git commit history (`scripts/gen-changelog.mjs` → `changelog.generated.ts`), " +
          "filtered to consumer-facing `feat`/`fix`/breaking changes; the by-theme decision rationale lives " +
          "on **Foundations/Decisions**.",
      },
    },
  },
};
export default meta;
type Story = StoryObj<typeof ChangelogPage>;

/** Single self-named story → Storybook single-story hoisting collapses the sidebar leaf to "Changelog". */
export const Changelog: Story = {
  play: async ({ canvasElement }) => {
    if (ENTRIES.length === 0) throw new Error("Changelog is empty — did `npm run changelog` generate the data file?");
    // Only consumer-facing types survive the generator's filter (no docs/chore/refactor noise).
    if (ENTRIES.some((e) => !["feat", "fix", "breaking"].includes(e.type)))
      throw new Error("Changelog contains a filtered-out commit type");
    // The machine `type(scope):` prefix must be stripped from every summary.
    if (ENTRIES.some((e) => /^(feat|fix|docs|chore|refactor|test|build|ci|perf|style)(\(|!|:)/.test(e.summary)))
      throw new Error("A commit prefix leaked into a changelog summary");
    // Newest-first: the first rendered day is not older than the last.
    if (DAYS[0].date < DAYS[DAYS.length - 1].date) throw new Error("Changelog is not newest-first");
    const items = canvasElement.querySelectorAll('li[role="listitem"]');
    if (items.length !== ENTRIES.length) throw new Error(`Changelog rendered ${items.length} entries (expected ${ENTRIES.length})`);
  },
};
