import { createContext, memo, useCallback, useContext, useEffect, useMemo, useState, type CSSProperties, type MouseEvent, type ReactNode } from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { Box, Flex } from "@radix-ui/themes";
import { MagnifyingGlass } from "@phosphor-icons/react";
import decisionsMd from "../../docs/DECISIONS.md?raw";
import referencesMd from "../../docs/REFERENCES.md?raw";
import { Page, PageHeader, RULING_PARAM, rulingHref } from "../components/ui/_storyKit";
import { Badge } from "../components/ui/Badge";
import { Button } from "../components/ui/Button";
import { CollapsibleGroup } from "../components/ui/Collapsible";
import { EmptyState } from "../components/ui/EmptyState";
import { Link } from "../components/ui/Link";
import { Select } from "../components/ui/Select";
import { Table } from "../components/ui/Table";
import { Text } from "../components/ui/Text";
import { TextField } from "../components/ui/TextField";
import { Token } from "../components/ui/Token";
import { VisuallyHidden } from "../components/ui/VisuallyHidden";
import { useSizeLane } from "../theme/SizeContext";

// The Decisions page IS the ruling ledger (DECISIONS.md), parsed live from the source so it cannot drift.
// Each ruling is a `### name` heading with a tags line ([[ruling-names-and-tags]]), and the page lists
// every ruling in one filterable list: search across names and headlines, tags that combine as AND, and
// a sort. The `## ` sections stay in the data only. Chronology lives on the Changelog.
type Block =
  | { kind: "p"; text: string }
  | { kind: "list"; items: string[] }
  | { kind: "table"; head: string[]; rows: string[][] }
  | { kind: "code"; lines: string[] };
type Ruling = { name: string; section: string; tags: string[]; date: string; headline: string; plain: string; blocks: Block[] };
type Source = { name: string; url: string; text: string };
type Verdict = { label: string; colon: boolean; text: string };
type Sort = "newest" | "oldest" | "name";

const CITE = /\[\[([a-z0-9]+(?:-[a-z0-9]+)*)\]\]/g;

// docs/REFERENCES.md is the one bibliography ([[ruling-shape]]). A row belongs to every ruling it cites as
// `[[name]]`, and a row that cites none belongs to the rulings its section heading cites.
function parseSources(md: string): Map<string, Source[]> {
  const byName = new Map<string, Source[]>();
  let headingNames: string[] = [];
  for (const line of md.split("\n")) {
    const head = line.match(/^##\s+(.*)$/);
    if (head) {
      headingNames = [...head[1].matchAll(CITE)].map((m) => m[1]);
      continue;
    }
    const row = line.match(/^\| \[([^\]]+)\]\(([^)]+)\) \| (.*) \|$/);
    if (!row) continue;
    const [, name, url, text] = row;
    const cited = [...text.matchAll(CITE)].map((m) => m[1]);
    for (const ruling of new Set(cited.length ? cited : headingNames)) {
      byName.set(ruling, [...(byName.get(ruling) ?? []), { name, url, text }]);
    }
  }
  return byName;
}

// A row records one or more verdicts, each opened by ADOPTED, READ or REJECTED. The page shows each on
// its own line, led by the verdict in sentence case, and drops the citations the row opens on. A label is
// the verdict word and at most a few plain words before a colon ("REJECTED as inapplicable:"). A verdict
// that runs into a sentence ("READ, and it is the defect [[name]] fixes: ...") keeps the bare word as its
// label and the sentence as its text, so a label never holds a full stop, a citation or code.
const VERDICT = "(?:ADOPTED|REJECTED|READ)";
const QUALIFIER = "[^:.`\\[\\]]{0,40}";
const VERDICT_SPLIT = new RegExp(`(?=\\b${VERDICT}\\b${QUALIFIER}:)`);
const VERDICT_LABEL = new RegExp(`^(${VERDICT})(?:(${QUALIFIER}):\\s*|\\b\\s*)`);
function verdictsOf(text: string): Verdict[] {
  return text
    .replace(/^(?:\[\[[a-z0-9-]+\]\](?:,\s*)?)+\.\s*/, "")
    .split(VERDICT_SPLIT)
    .map((piece) => piece.trim())
    .filter(Boolean)
    .map((piece) => {
      const m = piece.match(VERDICT_LABEL);
      if (!m) return { label: "", colon: false, text: piece };
      const word = (m[1] + (m[2] ?? "")).toLowerCase().replace(" and not adopted", ", not adopted");
      return { label: word.charAt(0).toUpperCase() + word.slice(1), colon: m[2] !== undefined, text: piece.slice(m[0].length) };
    });
}

// The older ledger shape ends a headline on its date, "(2026-10-01).", and the row prints the date beside
// it, so the page drops it for display. A parenthetical that holds only dates goes, and one that also
// holds a qualifier keeps the qualifier: "(interim patch, 2026-06-21)" reads "(interim patch)". The
// ledger keeps its text.
const ISO_DATE = /\s*\d{4}-\d{2}-\d{2}\s*/g;
function withoutTrailingDate(headline: string): string {
  const m = headline.match(/\s*\(([^()]*)\)([.!?]?)$/);
  if (!m || !/\d{4}-\d{2}-\d{2}/.test(m[1])) return headline;
  const kept = m[1]
    .split(/\s*[,;]\s*/)
    .map((part) => part.replace(ISO_DATE, " ").trim())
    .filter(Boolean);
  const head = headline.slice(0, m.index);
  return kept.length ? `${head} (${kept.join(", ")})${m[2]}` : `${head}${m[2]}`;
}

const HEADING = /^###\s+(\S+)\s*$/;
const TAGS_LINE = /^\*\*Tags\.\*\*\s+(.*?)\s*\*\*Ruled\.\*\*\s+(.*)$/;
const HEADLINE = /^\*\*(.+?)\*\*\s*(.*)$/;
const TABLE_DIVIDER = /^\|[\s:|-]+\|?$/;
const EVIDENCE = "**Evidence.**";

// A ruling's body lines group into blocks: consecutive `- ` lines are a list, consecutive `|` lines a
// table, a fenced run is code, and other consecutive lines a paragraph. The Evidence part keeps every
// earlier version of the ruling for contributors ([[ruling-shape]]), so the page stops there and a reader
// of the page never meets it.
function toBlocks(lines: string[]): Block[] {
  const blocks: Block[] = [];
  const kinds = lines.map((l) => (l.startsWith("- ") ? "list" : l.startsWith("|") ? "table" : "p"));
  for (let i = 0; i < lines.length; ) {
    if (!lines[i].trim()) {
      i++;
      continue;
    }
    if (lines[i].startsWith(EVIDENCE)) break;
    if (lines[i].startsWith("```")) {
      const code: string[] = [];
      for (i++; i < lines.length && !lines[i].startsWith("```"); i++) code.push(lines[i]);
      blocks.push({ kind: "code", lines: code });
      i++;
      continue;
    }
    const kind = kinds[i];
    const run: string[] = [];
    while (i < lines.length && lines[i].trim() && kinds[i] === kind && !lines[i].startsWith("```") && !lines[i].startsWith(EVIDENCE))
      run.push(lines[i++]);
    if (kind === "list") blocks.push({ kind: "list", items: run.map((l) => l.slice(2)) });
    else if (kind === "p") blocks.push({ kind: "p", text: run.join(" ") });
    else {
      const [head, ...rows] = run
        .filter((l) => !TABLE_DIVIDER.test(l))
        .map((l) => l.replace(/^\|/, "").replace(/\|$/, "").split("|").map((c) => c.trim()));
      blocks.push({ kind: "table", head, rows });
    }
  }
  return blocks;
}

// An entry runs from its `### name` heading to the next `### ` or `## ` heading. Its first line is the
// tags line, its next is the headline in bold. The labelled shape gives the headline a paragraph of its
// own, and the older single-paragraph shape opens its paragraph on it, so the text after the bold span,
// when there is any, starts the body.
function parseRulings(md: string): Ruling[] {
  const rulings: Ruling[] = [];
  let section = "";
  let open: { name: string; lines: string[] } | null = null;
  const close = () => {
    if (!open) return;
    const lines = open.lines;
    let i = lines.findIndex((l) => l.trim());
    const tags = lines[i]?.match(TAGS_LINE);
    if (!tags) throw new Error(`DECISIONS.md: ${open.name} has no Tags line`);
    for (i++; i < lines.length && !lines[i].trim(); i++);
    const head = lines[i]?.match(HEADLINE);
    if (!head) throw new Error(`DECISIONS.md: ${open.name} has no bold headline`);
    const body = [head[2], ...lines.slice(i + 1)];
    const headline = withoutTrailingDate(head[1]);
    rulings.push({
      name: open.name,
      section,
      tags: [...tags[1].matchAll(/`([A-Z]+)`/g)].map((m) => m[1]),
      date: tags[2].match(/\d{4}-\d{2}-\d{2}/)?.[0] ?? "",
      headline,
      // The headline as a reader sees it, which search reads: no emphasis markers, a link reduced to its text.
      plain: headline.replace(/\[([^\]]+)\]\([^)\s]+\)/g, "$1").replace(/\*\*|`|\*/g, ""),
      blocks: toBlocks(body),
    });
    open = null;
  };
  for (const line of md.split("\n")) {
    const sec = line.match(/^##\s+(.+)$/);
    if (sec) {
      close();
      section = sec[1].trim();
      continue;
    }
    const entry = line.match(HEADING);
    if (entry) {
      close();
      open = { name: entry[1], lines: [] };
      continue;
    }
    open?.lines.push(line);
  }
  close();
  return rulings;
}

const RULINGS = parseRulings(decisionsMd);
const BY_NAME = new Map(RULINGS.map((r) => [r.name, r]));
const SOURCES = parseSources(referencesMd);
/** Every tag with its total over the whole ledger. A tag's label reserves the width of its total. */
const TAG_TOTALS = (() => {
  const counts = new Map<string, number>();
  for (const r of RULINGS) for (const t of r.tags) counts.set(t, (counts.get(t) ?? 0) + 1);
  return [...counts].sort(([a], [b]) => a.localeCompare(b));
})();
const SORTS: { value: Sort; label: string }[] = [
  { value: "newest", label: "Newest first" },
  { value: "oldest", label: "Oldest first" },
  { value: "name", label: "Name" },
];

// A ruling with no date sorts last under both date orders, and a tie keeps ledger order (a stable sort).
function sorted(list: Ruling[], sort: Sort): Ruling[] {
  if (sort === "name") return [...list].sort((a, b) => a.name.localeCompare(b.name));
  const sign = sort === "newest" ? -1 : 1;
  return [...list].sort((a, b) => {
    if (!a.date || !b.date) return Number(!a.date) - Number(!b.date);
    return sign * a.date.localeCompare(b.date);
  });
}

// A link to another ruling opens that row in place, so the renderer reaches the page's open action.
const OpenRuling = createContext<(name: string) => void>(() => {});

function RulingAnchor({ name, children }: { name: string; children: ReactNode }) {
  const open = useContext(OpenRuling);
  const onClick = (e: MouseEvent<HTMLAnchorElement>) => {
    if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    e.preventDefault();
    open(name);
  };
  return <Link href={rulingHref(name)} target="_top" onClick={onClick}>{children}</Link>;
}

const inlineCode = { fontFamily: "var(--code-font-family)", fontSize: "0.92em" } as const;
const strong: CSSProperties = { color: "var(--ds-text-strong)", fontWeight: 600 };

// Minimal inline markdown: **bold** (which may hold `code`), `code`, [links](url) and [[name]] citations.
// Bare *italic* markers drop. A link renders with the system Link, and a link to a ruling opens its row.
// Inside a row trigger a link would nest one control in another, so `bare` renders its text alone.
function renderInline(text: string, bare = false): ReactNode[] {
  return text.split(/(\*\*[^*]+\*\*|`[^`]+`|\[\[[a-z0-9-]+\]\]|\[[^\]]+\]\([^)\s]+\))/g).map((p, i) => {
    if (p.startsWith("**") && p.endsWith("**"))
      return <strong key={i} style={strong}>{renderInline(p.slice(2, -2), bare)}</strong>;
    if (p.startsWith("`") && p.endsWith("`")) return <code key={i} style={inlineCode}>{p.slice(1, -1)}</code>;
    const cite = p.match(/^\[\[([a-z0-9-]+)\]\]$/);
    const link = p.match(/^\[([^\]]+)\]\(([^)\s]+)\)$/);
    const label = cite?.[1] ?? link?.[1];
    if (label == null) return p.replace(/\*([^*]+)\*/g, "$1");
    if (bare) return label;
    const ruling = cite?.[1] ?? link?.[2].match(/^#(.+)$/)?.[1];
    if (ruling && BY_NAME.has(ruling)) return <RulingAnchor key={i} name={ruling}>{label}</RulingAnchor>;
    return <Link key={i} href={link?.[2]}>{label}</Link>;
  });
}

// Every text on the page takes its size from the uiSize tier ([[size-lane-hook]]), on two steps. The
// meta text (a row's name and date, the count line, the Sort label) rides the text lane with the Badges
// and the Select beside it. A headline and the ruling it opens ride the chromeHeading lane, one step
// above, because a headline is the heading of its row and must never read smaller than its own tags.
const typeStep = (step: string): CSSProperties => ({ fontSize: `var(--font-size-${step})`, lineHeight: `var(--line-height-${step})` });

// The reading width binds prose only (GUIDELINES §3). A table is at least as wide as a paragraph, as wide
// as its content needs, and never wider than the column, so a cell wraps only when the column is full.
const proseBase: CSSProperties = {
  fontFamily: "var(--default-font-family)",
  fontWeight: 400,
  color: "var(--ds-text-weak)",
  maxWidth: "var(--ds-text-measure)",
  margin: "6px 0 0",
};
function useProse(): CSSProperties {
  return { ...proseBase, ...typeStep(useSizeLane("chromeHeading")) };
}
const tableWidth: CSSProperties = { width: "fit-content", minWidth: "min(100%, var(--ds-text-measure))", maxWidth: "100%" };

function BlockView({ block, name }: { block: Block; name: string }) {
  const prose = useProse();
  if (block.kind === "p") return <p style={prose}>{renderInline(block.text)}</p>;
  if (block.kind === "list")
    return (
      <ul style={{ ...prose, paddingLeft: 18, listStyle: "disc" }}>
        {block.items.map((item, i) => (
          <li key={i} style={{ margin: "2px 0" }}>{renderInline(item)}</li>
        ))}
      </ul>
    );
  // CodeBlock is out of scope (registry.json), so a fenced run keeps the page's inline code, one line each.
  if (block.kind === "code")
    return (
      <p style={prose}>
        {block.lines.map((line, i) => (
          <code key={i} style={{ ...inlineCode, display: "block", whiteSpace: "pre-wrap" }}>{line}</code>
        ))}
      </p>
    );
  return (
    <Box my="2" style={tableWidth}>
      <Table.Root aria-label={name}>
        <Table.Header>
          <Table.Row>
            {block.head.map((cell, i) => (
              <Table.ColumnHeaderCell key={i}>{renderInline(cell)}</Table.ColumnHeaderCell>
            ))}
          </Table.Row>
        </Table.Header>
        <Table.Body>
          {block.rows.map((row, i) => (
            <Table.Row key={i}>
              {row.map((cell, j) => (
                <Table.Cell key={j}>{renderInline(cell)}</Table.Cell>
              ))}
            </Table.Row>
          ))}
        </Table.Body>
      </Table.Root>
    </Box>
  );
}

// A ruling's sources are its rows in docs/REFERENCES.md ([[ruling-shape]]): each source a link, then one
// line per verdict. The label and the text go through the same inline renderer as the rest of the page,
// so a citation in either reads as a link to its ruling.
function SourcesView({ sources }: { sources: Source[] }) {
  const prose = useProse();
  return (
    <div data-sources="">
      <p style={prose}>
        <strong style={strong}>Sources.</strong>
      </p>
      <ul style={{ ...prose, paddingLeft: 18, listStyle: "disc" }}>
        {sources.map((source, i) => (
          <li key={i} style={{ margin: "6px 0 2px" }}>
            <Link href={source.url}>{source.name}</Link>
            <ul style={{ margin: "2px 0 0", paddingLeft: 16, listStyle: "circle" }}>
              {verdictsOf(source.text).map((verdict, j) => (
                <li key={j} style={{ margin: "1px 0" }}>
                  {verdict.label && (
                    <span data-verdict="" style={strong}>
                      {renderInline(verdict.colon ? `${verdict.label}:` : verdict.label)}
                    </span>
                  )}
                  {verdict.label && !/^[,;.)]/.test(verdict.text) ? " " : ""}
                  {renderInline(verdict.text)}
                </li>
              ))}
            </ul>
          </li>
        ))}
      </ul>
    </div>
  );
}

// The Sources part sits just before Status, the last visible part ([[ruling-shape]]), or last when a
// ruling has no Status.
function RulingBody({ ruling }: { ruling: Ruling }) {
  const status = ruling.blocks.findIndex((b) => b.kind === "p" && b.text.startsWith("**Status.**"));
  const at = status === -1 ? ruling.blocks.length : status;
  const sources = SOURCES.get(ruling.name);
  return (
    <>
      {ruling.blocks.slice(0, at).map((block, i) => (
        <BlockView key={i} block={block} name={ruling.name} />
      ))}
      {sources && <SourcesView sources={sources} />}
      {ruling.blocks.slice(at).map((block, i) => (
        <BlockView key={at + i} block={block} name={ruling.name} />
      ))}
    </>
  );
}

const headline: CSSProperties = {
  fontFamily: "var(--default-font-family)",
  fontWeight: 400,
  color: "var(--ds-text-strong)",
  maxWidth: "var(--ds-text-measure)",
};
const metaLine: CSSProperties = {
  display: "flex",
  flexWrap: "wrap",
  alignItems: "center",
  gap: 6,
  fontFamily: "var(--default-font-family)",
  fontWeight: 400,
  color: "var(--ds-text-weak)",
};
const nameStyle: CSSProperties = { fontFamily: "var(--code-font-family)", fontSize: "inherit", color: "var(--ds-text-weak)" };
const dateStyle: CSSProperties = { fontVariantNumeric: "tabular-nums" };

// One row per ruling, on the system CollapsibleGroup: the headline, which is the ruling itself, then the
// name, the tags and the date. Headlines sit at regular weight, so the labels inside an open ruling carry
// the emphasis. Several rulings may be open at once. A row's props never change, so opening one row does
// not render the other 234 again (40ms a click without the memo, measured 2026-10-01).
const RulingRow = memo(function RulingRow({ ruling }: { ruling: Ruling }) {
  const read = typeStep(useSizeLane("chromeHeading"));
  const meta = typeStep(useSizeLane("text"));
  return (
    <CollapsibleGroup.Item
      value={ruling.name}
      trigger={
        <span style={{ display: "flex", flexDirection: "column", gap: 4, flex: 1, minWidth: 0, textAlign: "start" }}>
          <span data-headline="" style={{ ...headline, ...read }}>{renderInline(ruling.headline, true)}</span>
          <span style={{ ...metaLine, ...meta }}>
            <code data-ruling={ruling.name} style={nameStyle}>{ruling.name}</code>
            {ruling.tags.map((t) => (
              <Badge key={t} color="gray">{t}</Badge>
            ))}
            {ruling.date ? <time dateTime={ruling.date} style={dateStyle}>{ruling.date}</time> : <span>No date recorded</span>}
          </span>
        </span>
      }
    >
      <RulingBody ruling={ruling} />
    </CollapsibleGroup.Item>
  );
});

/** The ruling named in the query string: the manager's first, where a link from another page lands,
 *  then the preview iframe's own. The top window may sit on another origin, so each read is guarded. */
function rulingFromUrl(): string | null {
  for (const search of [() => window.top?.location.search, () => window.location.search]) {
    try {
      const name = new URLSearchParams(search() ?? "").get(RULING_PARAM);
      if (name) return name;
    } catch {
      // A cross-origin top window refuses the read. The iframe's own query string comes next.
    }
  }
  return null;
}

/** Scroll a rendered row to the top of the view and move focus to its trigger. False when the row is
 *  not in the list. The page calls it after a link or the query string opens a row. */
function revealRow(name: string): boolean {
  const trigger = document.querySelector(`[data-ruling="${CSS.escape(name)}"]`)?.closest<HTMLElement>(".rt-ds-collapsible-trigger");
  if (!trigger) return false;
  trigger.closest(".rt-ds-accordion-item")?.scrollIntoView({ block: "start" });
  trigger.focus({ preventScroll: true });
  return true;
}

/** The search, the tag row, the sort and the list: the page below its header, so the docs page and the
 *  test page share one body. */
function Rulings() {
  const [query, setQuery] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  const [sort, setSort] = useState<Sort>("newest");
  const [open, setOpen] = useState<string[]>([]);
  const [reveal, setReveal] = useState<string | null>(null);

  const q = query.trim().toLowerCase();
  const visible = useMemo(
    () =>
      sorted(
        RULINGS.filter(
          (r) => tags.every((t) => r.tags.includes(t)) && (!q || r.name.includes(q) || r.plain.toLowerCase().includes(q)),
        ),
        sort,
      ),
    [q, tags, sort],
  );
  // A tag's count is the number of rulings left if that tag joins the current tags and search. A pressed
  // tag is in the filter already, so its count is the number of rulings shown.
  const tagCounts = useMemo(() => {
    const shown = RULINGS.filter(
      (r) => tags.every((t) => r.tags.includes(t)) && (!q || r.name.includes(q) || r.plain.toLowerCase().includes(q)),
    );
    return new Map(TAG_TOTALS.map(([tag]) => [tag, shown.filter((r) => r.tags.includes(tag)).length]));
  }, [q, tags]);

  // Opening a ruling clears any filter that hides it, so the row is there to scroll to.
  const openRuling = useCallback(
    (name: string) => {
      if (!BY_NAME.has(name)) return;
      if (!visible.some((r) => r.name === name)) {
        setQuery("");
        setTags([]);
      }
      setOpen((o) => (o.includes(name) ? o : [...o, name]));
      setReveal(name);
    },
    [visible],
  );

  useEffect(() => {
    const name = rulingFromUrl();
    if (name) openRuling(name);
    // The query string is read once, on mount.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (reveal && revealRow(reveal)) setReveal(null);
  }, [reveal, visible]);

  const toggleTag = (tag: string) => setTags((on) => (on.includes(tag) ? on.filter((t) => t !== tag) : [...on, tag]));
  const clearFilters = () => {
    setQuery("");
    setTags([]);
  };
  const summary =
    `${visible.length} of ${RULINGS.length} rulings` +
    (tags.length ? `, tagged ${tags.join(" and ")}` : "") +
    (q ? `, matching \u201c${query.trim()}\u201d` : "");

  return (
    // Two groups on two space steps: the search row and the tags read as one filter group (step 4), and
    // the count line and the list read as the results block below it (step 5 between the groups).
    <Flex direction="column" gap="5">
      {/* Each row's trigger sits in an h3, so the list takes an h2 the eye does not need. */}
      <VisuallyHidden asChild>
        <h2>Rulings</h2>
      </VisuallyHidden>
      <Flex direction="column" gap="4" data-decisions-filters="">
        <Flex wrap="wrap" align="center" justify="between" gapX="4" gapY="2">
          <Box style={{ flex: "1 1 280px", maxWidth: 360 }}>
            <TextField type="search" aria-label="Search rulings" placeholder="Search rulings" value={query} onChange={(e) => setQuery(e.target.value)}>
              <TextField.Slot>
                <MagnifyingGlass aria-hidden />
              </TextField.Slot>
            </TextField>
          </Box>
          <Flex align="center" gap="2">
            {/* The system Text resolves the text lane, the step the Select beside it resolves on the control lane. */}
            <Text weight="bold" aria-hidden style={{ color: "var(--ds-text-weak)" }}>Sort</Text>
            <Select value={sort} onValueChange={(v) => setSort(v as Sort)}>
              <Select.Trigger aria-label="Sort rulings" />
              <Select.Content>
                {SORTS.map((s) => (
                  <Select.Item key={s.value} value={s.value}>{s.label}</Select.Item>
                ))}
              </Select.Content>
            </Select>
          </Flex>
        </Flex>
        <Flex role="group" aria-label="Filter by tag" wrap="wrap" align="center" gapX="2" gapY="1">
          {TAG_TOTALS.map(([tag, total]) => {
            const pressed = tags.includes(tag);
            const count = tagCounts.get(tag) ?? 0;
            return (
              <Token key={tag} data-tag={tag} pressed={pressed} disabled={!pressed && count === 0} onClick={() => toggleTag(tag)}>
                {/* The label holds the width of the full total in equal-width figures, so a count that
                    falls never moves a tag. Only the count is read out. */}
                <span style={{ display: "inline-grid", justifyItems: "center", fontVariantNumeric: "tabular-nums" }}>
                  <span aria-hidden style={{ gridArea: "1 / 1", visibility: "hidden" }}>{`${tag} ${total}`}</span>
                  <span data-tag-count={count} style={{ gridArea: "1 / 1" }}>{`${tag} ${count}`}</span>
                </span>
              </Token>
            );
          })}
        </Flex>
      </Flex>
      <Flex direction="column" gap="2" data-decisions-results="">
        <Text as="p" role="status" style={{ color: "var(--ds-text-weak)" }}>{summary}</Text>
        {visible.length === 0 ? (
          <EmptyState
            data-decisions-empty=""
            size="2"
            icon={<MagnifyingGlass />}
            title="No ruling matches"
            description="No ruling carries every pressed tag and the search words together. Clear the filters to see every ruling again."
            actions={<Button onClick={clearFilters}>Clear filters</Button>}
            py="6"
          />
        ) : (
          <OpenRuling.Provider value={openRuling}>
            <CollapsibleGroup.Root type="multiple" dividers="all" value={open} onValueChange={setOpen} data-decisions-list="">
              {visible.map((r) => (
                <RulingRow key={r.name} ruling={r} />
              ))}
            </CollapsibleGroup.Root>
          </OpenRuling.Provider>
        )}
      </Flex>
    </Flex>
  );
}

const DEFINITION =
  "Why the system is the way it is. Every ruling carries a permanent name and one to three tags, and other pages cite a ruling by its name. Search the names and headlines, filter by tag, and open a ruling for its parts and its sources. For what changed and when, see the Changelog.";

function DecisionsPage() {
  return (
    <Page>
      <PageHeader title="Decisions" standfirst={DEFINITION} />
      <Rulings />
    </Page>
  );
}

/** The same page under the title [[docs-page-header]] gives a second story in the file. Only the hidden
 *  Interactions story renders it, so no reader lands on it. */
function DecisionsInteractionsPage() {
  return (
    <Page>
      <PageHeader title="Decisions · Interactions" standfirst={DEFINITION} />
      <Rulings />
    </Page>
  );
}

const meta: Meta<typeof DecisionsPage> = {
  title: "Foundations/Decisions",
  component: DecisionsPage,
  parameters: {
    docs: {
      description: {
        component:
          "The ruling ledger, read live from `DECISIONS.md`. Each ruling carries a permanent name and one to " +
          "three tags, and the page searches the names and headlines, filters by tag and sorts by date or " +
          "name. Each headline opens its reasoning and its sources. This is the *why*; the **Changelog** is " +
          "the *when*.",
      },
    },
  },
};
export default meta;
type Story = StoryObj<typeof DecisionsPage>;

/* ---- play helpers -------------------------------------------------------- */
async function waitFor<T>(fn: () => T | null | undefined | false, what: string, timeout = 2000): Promise<T> {
  const t0 = performance.now();
  for (;;) {
    const v = fn();
    if (v) return v as T;
    if (performance.now() - t0 > timeout) throw new Error(`Decisions: timed out waiting for ${what}`);
    const { promise, resolve } = Promise.withResolvers<void>();
    setTimeout(resolve, 4);
    await promise;
  }
}
function typeInto(input: HTMLInputElement, value: string) {
  Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value")!.set!.call(input, value);
  input.dispatchEvent(new Event("input", { bubbles: true }));
}
async function pickSort(root: HTMLElement, label: string) {
  const trigger = root.querySelector<HTMLElement>('[aria-label="Sort rulings"]')!;
  trigger.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true, cancelable: true, button: 0, pointerType: "mouse" }));
  trigger.dispatchEvent(new PointerEvent("pointerup", { bubbles: true, cancelable: true, button: 0, pointerType: "mouse" }));
  trigger.click();
  const option = await waitFor(
    () => [...document.querySelectorAll<HTMLElement>('[role="option"]')].find((o) => o.textContent?.trim() === label),
    `the ${label} sort option`,
  );
  option.click();
  await waitFor(() => trigger.textContent?.trim() === label, `the sort to read ${label}`);
}
const HEADINGS = decisionsMd.split("\n").filter((l) => l.startsWith("### ")).length;
const triggersIn = (root: HTMLElement) => [...root.querySelectorAll<HTMLElement>("[data-decisions-list] .rt-ds-collapsible-trigger")];
const nameOf = (t: HTMLElement) => t.querySelector("[data-ruling]")?.getAttribute("data-ruling") ?? "";
/** An old section code (a letter A, C, K, T or X, then digits) outside a word, which the converted ledger no longer prints. */
const OLD_CODE = /(^|[^A-Za-z0-9_-])([ACKTX]\d{1,3})(?![A-Za-z0-9_-])/;
/** The text of a part with its code spans removed: a citation quoted as code, such as the `[[focus-ring]]`
 *  example in ruling-names-and-tags, is text the ledger means to show. */
function proseOf(el: Element): string {
  const copy = el.cloneNode(true) as HTMLElement;
  copy.querySelectorAll("code").forEach((c) => c.remove());
  return copy.textContent ?? "";
}

/** The page at rest, as a reader lands on it. Single self-named story among the visible ones, so
 *  single-story hoisting collapses the sidebar leaf to "Decisions". Storybook runs a play on view, so this
 *  one only reads: the parse, the rows, the tag row and the default order. Everything that drives the page
 *  lives in Interactions below. */
export const Decisions: Story = {
  play: async ({ canvasElement }) => {
    if (RULINGS.length !== HEADINGS) throw new Error(`Decisions parsed ${RULINGS.length} rulings from ${HEADINGS} ### headings`);
    const triggers = triggersIn(canvasElement);
    if (triggers.length !== HEADINGS) throw new Error(`Decisions rendered ${triggers.length} rows (expected ${HEADINGS})`);

    // The tag row offers exactly the tags the ledger preamble declares, each with its count.
    const declared = [...(decisionsMd.match(/^\*\*Tags\.\*\* Each entry.*$/m)?.[0] ?? "").matchAll(/`([A-Z]+)`/g)].map((m) => m[1]);
    const offered = [...canvasElement.querySelectorAll('[aria-label="Filter by tag"] button')].map((b) => b.textContent?.trim().split(" ")[0]);
    if (!declared.length || offered.join() !== [...declared].sort().join())
      throw new Error(`Decisions offers tags ${offered.join(", ")}, the ledger declares ${declared.join(", ")}`);

    // Newest first by default, with the undated rulings last.
    const dates = triggers.map((t) => BY_NAME.get(nameOf(t))!.date);
    const firstUndated = dates.indexOf("");
    if (dates.some((d, i) => (i > 0 && d && d > dates[i - 1]) || (firstUndated !== -1 && i > firstUndated && d)))
      throw new Error("Decisions is not newest first by default, with undated rulings last");

    // A headline shows its date once, in the meta line, and never again at its own end.
    const dated = triggers.find((t) => /\d{4}-\d{2}-\d{2}\)?\W*$/.test(t.querySelector("[data-headline]")?.textContent ?? ""));
    if (dated) throw new Error(`The headline of ${nameOf(dated)} still ends on its date`);
  },
};

/** Test only: hidden from the sidebar and the docs view by `!dev`, still run by the test suite. It renders
 *  the same page and drives it the way a reader does: search, a tag, the sort, an empty result and its
 *  Clear filters action, a ruling opened from a link, and then every row opened once. Kept apart from the
 *  docs story so a reader's view of the page never moves on its own (the same split as
 *  `_radio-cards.stories.tsx` and the Colors FailLoudProbe). */
export const Interactions: Story = {
  tags: ["!dev"],
  render: () => <DecisionsInteractionsPage />,
  play: async ({ canvasElement }) => {
    const triggers = () => triggersIn(canvasElement);
    const rowOf = (name: string) => triggers().find((t) => nameOf(t) === name);
    const tagBodies = [...canvasElement.querySelectorAll<HTMLButtonElement>('[aria-label="Filter by tag"] button')];
    const status = canvasElement.querySelector('[role="status"]')!;
    const boxes = () =>
      [...canvasElement.querySelectorAll<HTMLElement>('[aria-label="Filter by tag"] .rt-ds-token')]
        .map((c) => {
          const r = c.getBoundingClientRect();
          return `${c.dataset.tag} ${r.left.toFixed(1)} ${r.top.toFixed(1)} ${r.width.toFixed(1)}`;
        })
        .join(" | ");
    const atRest = boxes();
    const shownCount = (b: HTMLElement) =>
      Number([...b.querySelectorAll<HTMLElement>("[data-tag-count]")].find((e) => !e.closest("[aria-hidden]"))?.dataset.tagCount);

    // Search narrows the list to rows whose name or headline holds the query.
    const input = canvasElement.querySelector<HTMLInputElement>('input[aria-label="Search rulings"]')!;
    typeInto(input, "oxblood");
    await waitFor(() => triggers().length < HEADINGS, "the search to narrow the list");
    for (const t of triggers())
      if (!`${nameOf(t)} ${t.textContent}`.toLowerCase().includes("oxblood")) throw new Error(`"${nameOf(t)}" does not match "oxblood"`);

    // A tag is a toggle, and every row left carries it.
    const colour = tagBodies.find((b) => b.textContent?.startsWith("COLOUR "))!;
    const searched = triggers().length;
    colour.click();
    await waitFor(() => colour.getAttribute("aria-pressed") === "true", "COLOUR to read pressed");
    await waitFor(() => triggers().length <= searched && status.textContent?.includes("tagged COLOUR"), "the COLOUR filter");
    for (const t of triggers())
      if (![...t.querySelectorAll(".rt-Badge")].some((b) => b.textContent === "COLOUR")) throw new Error(`"${nameOf(t)}" lacks COLOUR`);
    if (!status.textContent?.startsWith(`${triggers().length} of ${HEADINGS} rulings, tagged COLOUR, matching`))
      throw new Error(`Decisions count line reads "${status.textContent}"`);

    // Each count is the number of rulings left with that tag added, a tag with none left is dimmed and
    // cannot be pressed, and no tag moves while the counts change.
    for (const b of tagBodies) {
      const tag = b.closest<HTMLElement>(".rt-ds-token")!.dataset.tag!;
      const left = triggers().filter((t) => [...t.querySelectorAll(".rt-Badge")].some((x) => x.textContent === tag)).length;
      if (shownCount(b) !== left) throw new Error(`${tag} reads ${shownCount(b)} with ${left} rulings left`);
      if (b.disabled !== (left === 0 && b.getAttribute("aria-pressed") !== "true"))
        throw new Error(`${tag} is ${b.disabled ? "" : "not "}disabled with ${left} rulings left`);
    }
    if (boxes() !== atRest) throw new Error(`A tag moved while its count changed:\n${atRest}\n${boxes()}`);

    // The Name sort orders the rows that are left.
    await pickSort(canvasElement, "Name");
    const names = triggers().map(nameOf);
    if (names.join() !== [...names].sort((a, b) => a.localeCompare(b)).join()) throw new Error(`Name sort gave ${names.join(", ")}`);
    await pickSort(canvasElement, "Newest first");

    // A search that matches nothing shows the empty state, and its action empties the search and releases
    // every tag.
    typeInto(input, "no ruling says this");
    const empty = await waitFor(() => canvasElement.querySelector<HTMLElement>("[data-decisions-empty]"), "the empty state");
    if (!status.textContent?.startsWith(`0 of ${HEADINGS} rulings, tagged COLOUR`)) throw new Error(`Empty count line reads "${status.textContent}"`);
    if (!tagBodies.every((b) => b === colour || b.disabled)) throw new Error("A tag with no ruling left can still be pressed");
    if (colour.disabled) throw new Error("The pressed COLOUR tag cannot be released");
    const clear = [...empty.querySelectorAll("button")].find((b) => b.textContent?.trim() === "Clear filters");
    if (!clear) throw new Error("The empty state offers no Clear filters action");
    clear.click();
    await waitFor(
      () => triggers().length === HEADINGS && input.value === "" && tagBodies.every((b) => b.getAttribute("aria-pressed") === "false"),
      "Clear filters to empty the search and release every tag",
    );
    if (tagBodies.some((b) => b.disabled)) throw new Error("A tag stays disabled after Clear filters");
    if (boxes() !== atRest) throw new Error(`A tag moved after Clear filters:\n${atRest}\n${boxes()}`);

    // ruling-shape opens to its labelled parts, its Shape list and its sources among them.
    const shape = rowOf("ruling-shape")!;
    shape.click();
    await waitFor(() => shape.getAttribute("aria-expanded") === "true", "ruling-shape to open");
    const panel = document.getElementById(shape.getAttribute("aria-controls") ?? "")!;
    const shapeList = [...panel.querySelectorAll("p")].find((p) => p.textContent === "Shape.")?.nextElementSibling;
    if (shapeList?.tagName !== "UL") throw new Error("ruling-shape opened without its Shape list");
    const sourceLinks = panel.querySelectorAll("a[href^='http']").length;
    if (sourceLinks < 4) throw new Error(`ruling-shape opened with ${sourceLinks} source links (expected at least 4)`);

    // A link to another ruling opens that row and moves focus to its trigger.
    const toNames = [...panel.querySelectorAll<HTMLAnchorElement>("a")].find((a) => a.textContent === "ruling-names-and-tags")!;
    toNames.click();
    const names2 = rowOf("ruling-names-and-tags")!;
    await waitFor(() => names2.getAttribute("aria-expanded") === "true" && document.activeElement === names2, "the linked ruling to open");

    // Each click reads the open set the last one wrote, so the second waits for the first.
    names2.click();
    await waitFor(() => names2.getAttribute("aria-expanded") === "false", "ruling-names-and-tags to close");
    shape.click();
    await waitFor(() => shape.getAttribute("aria-expanded") === "false", "ruling-shape to close");

    // Every row, opened once. No Evidence part, no [[ citation, no stray backtick and no old section code
    // reach the page, and a Sources label is the verdict and its few plain words, never a sentence.
    if (RULINGS.some((r) => JSON.stringify(r.blocks).includes(EVIDENCE))) throw new Error("An Evidence part reached the Decisions page");
    let withSources = 0;
    let opened = 0;
    for (const row of triggers()) {
      const name = nameOf(row);
      row.click();
      const part = await waitFor(
        () => row.getAttribute("aria-expanded") === "true" && document.getElementById(row.getAttribute("aria-controls") ?? ""),
        `${name} to open`,
      );
      const prose = proseOf(part);
      if (prose.includes("[[")) throw new Error(`A [[ citation reached the page in ${name}`);
      if (/The entry as first written/.test(part.textContent ?? "")) throw new Error(`An Evidence part reached the page in ${name}`);
      // Prose only: code spans are literal, such as the bytes `20 C2 B7 20` in docs-page-header.
      const code = prose.match(OLD_CODE);
      if (code) throw new Error(`The old section code ${code[2]} reached the page in ${name}`);
      const sources = part.querySelector("[data-sources]");
      if (Boolean(sources) !== SOURCES.has(name)) throw new Error(`${name} shows ${sources ? "a" : "no"} Sources part against REFERENCES.md`);
      if (sources) {
        withSources++;
        const text = proseOf(sources);
        if (text.includes("[[") || text.includes("`")) throw new Error(`The Sources part of ${name} shows raw markdown: ${text.slice(0, 120)}`);
        for (const label of sources.querySelectorAll("[data-verdict]"))
          if (!/^(Adopted|Read|Rejected)\b[^.:]{0,40}:?$/.test(label.textContent ?? ""))
            throw new Error(`The Sources part of ${name} has the label "${label.textContent}"`);
      }
      // Each row closes before the next opens, so the page stays one panel tall and each render stays cheap.
      row.click();
      await waitFor(() => row.getAttribute("aria-expanded") === "false", `${name} to close`);
      opened++;
    }
    // The sweep proves something only if it ran: every row, and a Sources part among them.
    if (opened !== HEADINGS || !withSources) throw new Error(`The row sweep opened ${opened} rows, ${withSources} with sources`);

    (document.activeElement as HTMLElement | null)?.blur();
    window.scrollTo(0, 0);
  },
};
