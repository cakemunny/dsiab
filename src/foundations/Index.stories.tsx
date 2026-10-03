import { useEffect, useState, type ReactNode } from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { Box, Card, Flex, Text } from "@radix-ui/themes";
import { Caption, Mono, Muted, Page, PageHeader, Section } from "../components/ui/_storyKit";
import { DataList } from "../components/ui/DataList";
import { Link } from "../components/ui/Link";

/* =============================================================================
   Index — the front door ([[sidebar-order]]).
   -----------------------------------------------------------------------------
   WHO READS THIS, AND WHEN. Someone who just opened the docs. Their questions
   come in order: what is this, how do I start, where do I find things, what
   will fail my code, and where is the reasoning. The page answers them in that
   order, the way README.md does, and closes on the map of every page.

   THE MAP IS LIVE. It reads Storybook's own index.json, so it cannot drift from
   the sidebar. It lists the three documentation sections and never `_internal`:
   those pages are test fixtures, and a front door that links to them presents
   them as guidance.

   Section titles share one grammar, a question-word clause ("How to start",
   "What your code must do"), so the page reads as the questions it answers.
   ============================================================================= */

/** The documentation sections, in sidebar order. `_internal` is not one of them. */
const SECTIONS = ["Foundations", "Components", "UI examples"];

type Entry = { id: string; title: string; type: string };
type PageLink = { id: string; label: string };
/** `subcat` is null for a section with no subgrouping (Foundations, UI examples). */
type Group = { subcat: string | null; pages: PageLink[] };
type SectionPages = { section: string; groups: Group[] };
/** `idOf` maps a title to its first story, so prose can link a page by title. */
type StoryIndex = { idOf: ReadonlyMap<string, string>; sections: SectionPages[] };

// Read live from Storybook's own index.json: one link per page (its first story), grouped by
// section and, for Components, by category too, because that title is "Components/<Category>/<Name>".
function useStoryIndex(): StoryIndex {
  const [index, setIndex] = useState<StoryIndex>({ idOf: new Map(), sections: [] });
  useEffect(() => {
    fetch(new URL("index.json", location.href))
      .then((r) => r.json())
      .then((data: { entries: Record<string, Entry> }) => {
        const idOf = new Map<string, string>();
        for (const e of Object.values(data.entries ?? {})) {
          if (e.type === "story" && !idOf.has(e.title)) idOf.set(e.title, e.id);
        }
        const bySection = new Map<string, Map<string, PageLink[]>>();
        for (const [title, id] of idOf) {
          const [section, ...rest] = title.split("/");
          // A root-level title is this page. `_internal` is tests, not documentation.
          if (rest.length === 0 || section === "_internal") continue;
          const subcat = rest.length > 1 ? rest[0] : "";
          const label = (rest.length > 1 ? rest.slice(1) : rest).join(" / ");
          const subMap = bySection.get(section) ?? new Map<string, PageLink[]>();
          subMap.set(subcat, [...(subMap.get(subcat) ?? []), { id, label }]);
          bySection.set(section, subMap);
        }
        const rank = (s: string) => { const i = SECTIONS.indexOf(s); return i < 0 ? SECTIONS.length : i; };
        const sections = [...bySection]
          .map(([section, subMap]) => ({ section, groups: [...subMap].map(([subcat, pages]) => ({ subcat: subcat || null, pages })) }))
          .sort((a, b) => rank(a.section) - rank(b.section) || a.section.localeCompare(b.section));
        setIndex({ idOf, sections });
      })
      .catch(() => setIndex({ idOf: new Map(), sections: [] }));
  }, []);
  return index;
}

const linkCard = {
  display: "block", padding: "12px 14px", borderRadius: "var(--ds-radius-3)",
  border: "1px solid var(--ds-stroke-weak)", background: "var(--ds-bg-subtle)",
  color: "var(--ds-text-strong)", textDecoration: "none",
  font: "500 14px var(--default-font-family)",
} as const;

const cardGrid = { display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: 8 } as const;

/** A link to another docs page by its title. Plain text until the index loads, so the prose never
 *  carries a dead link. */
function PageRef({ idOf, title, children }: { idOf: ReadonlyMap<string, string>; title: string; children: ReactNode }) {
  const id = idOf.get(title);
  return id ? <Link href={`./?path=/story/${id}`} target="_top">{children}</Link> : <>{children}</>;
}

/** The five sidebar entries, top to bottom, with what each is for. */
const SIDEBAR: [string, ReactNode][] = [
  ["Index", "This page. What the system is, how to start, and a map of every page."],
  ["Foundations", "The tokens and rules every component paints from: colour, type, spacing, icons, elevation and motion. Customize, Changelog and Decisions open the section."],
  ["Components", "One page per component, in twelve groups. Each page shows the component, when to use it, and the tokens it paints from."],
  ["UI examples", "Eight familiar screens built from the components and shown at rest. Judge the parts against an interface you already know."],
  ["_internal", "Test fixtures that keep the docs honest. The section opens collapsed, and nothing in it is guidance."],
];

/** The rules that bind consumer code. AGENTS.md carries each one in full. */
const RULES: [string, ReactNode][] = [
  ["Paint from tokens", <>Use the <Mono>--ds-*</Mono> semantic tokens. Never a hex value, and never a bare Radix scale step such as <Mono>--accent-9</Mono>. Status colour comes from the accent-aware families, so it follows a brand swap.</>],
  ["Never !important", <>Win the cascade with specificity and source order under <Mono>.radix-themes</Mono>.</>],
  ["Reuse before you invent", "Check the registry first. If the component exists, import it. If it does not, use the raw Radix Themes component or report the gap. Never invent a value the system does not specify."],
  ["Let inputs carry their chrome", <>Give an input its <Mono>label</Mono>, <Mono>description</Mono> and <Mono>validation</Mono> as props. The field shell behind them is internal, so a hand-built field cannot match it.</>],
  ["Run the check", <>Run <Mono>npx ds-check</Mono> before you call the work done. It exits 0 only when the files it reads need no fix.</>],
];

/** A term and what it means, one row each. Each value is one span held to the reading measure: the
 *  value is a flex row, and bare children would lay each inline code out as its own column. */
function Rows({ rows }: { rows: [string, ReactNode][] }) {
  return (
    <DataList.Root orientation={{ initial: "vertical", sm: "horizontal" }}>
      {rows.map(([term, what]) => (
        <DataList.Item key={term}>
          <DataList.Label>{term}</DataList.Label>
          <DataList.Value><span style={{ maxWidth: "var(--ds-text-measure)" }}>{what}</span></DataList.Value>
        </DataList.Item>
      ))}
    </DataList.Root>
  );
}

function SystemIndex() {
  const { idOf, sections } = useStoryIndex();
  return (
    <Page>
      <PageHeader
        title="DSIAB - Design System In A Box"
        standfirst="A React component and token layer over Radix Themes. Accent, neutral, size and contrast are props on one Provider, so one change re-skins a whole product. Every page here renders the real components with the real tokens."
      />

      <Section
        title="How to start"
        lead="Install the package, then add two imports. The stylesheet import is required: the build moves the CSS out of the JavaScript, so a component without it paints nothing."
      >
        <Card size="2">
          <Box style={{ overflowX: "auto" }}>
            <pre style={{
              margin: 0, whiteSpace: "pre", fontFamily: "var(--code-font-family)",
              fontSize: 12, lineHeight: 1.7, color: "var(--ds-text-strong)",
            }}>
{`npm install dsiab

import "dsiab/styles.css";                 `}<span style={{ color: "var(--ds-text-weak)" }}>{`// once, at your app's entry point`}</span>{`
import { Provider, Button } from "dsiab";

<Provider accentColor="iris">
  <Button priority="primary">Create project</Button>
</Provider>`}
            </pre>
          </Box>
        </Card>
        <Caption>
          Mount <Mono>Provider</Mono> once, above everything. Every <Mono>--ds-*</Mono> value resolves
          against it, and a component outside it gets empty values. Do not import Radix&rsquo;s own
          stylesheet as well, because <Mono>dsiab/styles.css</Mono> already contains it.{" "}
          <PageRef idOf={idOf} title="Foundations/Customize">Customize</PageRef> lists every prop{" "}
          <Mono>Provider</Mono> takes.
        </Caption>
      </Section>

      <Section title="How the sidebar is organised" lead="Five entries, top to bottom. Read them in that order the first time.">
        <Rows rows={SIDEBAR} />
      </Section>

      <Section
        title="What your code must do"
        lead={<>Five rules bind code built on this system. <Mono>AGENTS.md</Mono> carries them in full, and <PageRef idOf={idOf} title="Foundations/Enforcement">Enforcement</PageRef> shows which ones a machine checks.</>}
      >
        <Rows rows={RULES} />
      </Section>

      <Section title="What accessibility covers">
        <Text as="p" size="2" style={{ maxWidth: "var(--ds-text-measure)", lineHeight: 1.6 }}>
          The system is built to help you meet WCAG 2.2 AA. Contrast floors, focus, target size and
          keyboard behaviour live in the tokens and the components, and axe runs on every story in light
          and dark. A component library cannot make a product conformant alone. Page-level criteria stay
          with you, and <Mono>GUIDELINES.md</Mono> section 9 states the gaps the system knows about.
        </Text>
      </Section>

      <Section title="Where decisions and changes live" lead="Two pages hold the history. Cite a ruling by its ID rather than argue it again.">
        <div style={cardGrid}>
          {[
            ["Foundations/Decisions", "Decisions", "Why each rule exists, grouped by theme."],
            ["Foundations/Changelog", "Changelog", "Features and fixes, newest first."],
          ].map(([title, label, what]) => (
            <a key={title} href={idOf.has(title) ? `./?path=/story/${idOf.get(title)}` : undefined} target="_top" style={linkCard}>
              <Flex direction="column" gap="1">
                {label}
                <Muted>{what}</Muted>
              </Flex>
            </a>
          ))}
        </div>
      </Section>

      <Section
        title="Where every page lives"
        lead="Every page in the three documentation sections, read from the sidebar itself, so this list always matches it. The list omits the _internal fixtures, which are tests rather than guidance."
      >
        <Flex direction="column" gap="5">
          {sections.map(({ section, groups }) => (
            <Flex key={section} direction="column" gap="2">
              <Text as="p" size="2" weight="bold" style={{ color: "var(--ds-text-strong)" }}>{section}</Text>
              {groups.map(({ subcat, pages }, i) => (
                <div key={subcat ?? "_flat"} style={{ marginTop: subcat && i > 0 ? 8 : 0 }}>
                  {subcat && (
                    <Text as="p" size="1" weight="bold" mb="2" style={{ color: "var(--ds-text-weak)", letterSpacing: "0.06em", textTransform: "uppercase" }}>
                      {subcat}
                    </Text>
                  )}
                  <div style={cardGrid}>
                    {pages.map((p) => (
                      <a key={p.id} href={`./?path=/story/${p.id}`} target="_top" style={linkCard}>{p.label}</a>
                    ))}
                  </div>
                </div>
              ))}
            </Flex>
          ))}
        </Flex>
      </Section>
    </Page>
  );
}

const meta: Meta<typeof SystemIndex> = {
  title: "Index",
  component: SystemIndex,
  parameters: {
    layout: "fullscreen",
    docs: {
      description: {
        component:
          "The front door: what the system is, how to start, how the sidebar is organised, the rules " +
          "that bind your code, and a live map of every documentation page, read from Storybook's own " +
          "story index so it never drifts.",
      },
    },
  },
};
export default meta;
type Story = StoryObj<typeof SystemIndex>;
export const Index: Story = {};
