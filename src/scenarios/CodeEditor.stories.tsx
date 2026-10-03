import type { Meta, StoryObj } from "@storybook/react-vite";
import { Box, Flex } from "@radix-ui/themes";
import {
  At,
  CaretRight,
  Cube,
  File,
  FileCode,
  FileMd,
  FileTs,
  Folder,
  FolderOpen,
  FunctionIcon,
  GitBranch,
  MagnifyingGlass,
  MapTrifold,
  Paragraph,
  Paperclip,
  Sparkle,
  TextAa,
  Warning,
  WarningCircle,
  X,
} from "@phosphor-icons/react";
import { useResizable } from "../hooks/useResizable";
import { Avatar } from "../components/ui/Avatar";
import { Badge } from "../components/ui/Badge";
import { Breadcrumbs, BreadcrumbItem } from "../components/ui/Breadcrumbs";
import { ChatComposer } from "../components/ui/ChatComposer";
import { ChatMessage } from "../components/ui/ChatMessage";
import { ChatMessageList } from "../components/ui/ChatMessageList";
import { ChatToolCalls, type ChatToolCallItem } from "../components/ui/ChatToolCalls";
import { Code } from "../components/ui/Code";
import { Heading } from "../components/ui/Heading";
import { IconButton } from "../components/ui/IconButton";
import { Kbd } from "../components/ui/Kbd";
import { Layout } from "../components/ui/Layout";
import { Outline, type OutlineItem } from "../components/ui/Outline";
import { ResizeHandle } from "../components/ui/ResizeHandle";
import { ScrollArea } from "../components/ui/ScrollArea";
import { Separator } from "../components/ui/Separator";
import { StatusDot } from "../components/ui/StatusDot";
import { Tabs } from "../components/ui/Tabs";
import { Text } from "../components/ui/Text";
import { ToggleButtonGroup } from "../components/ui/ToggleButtonGroup";
import { Tooltip } from "../components/ui/Tooltip";
import { TreeList, type TreeListItemData } from "../components/ui/TreeList";

/* Code editor — a generic recreation of an AI-integrated editor, at rest.
 *
 * Three regions across a resizable shell: the project rail (TreeList + Outline), the document
 * (link tabs over a gutter-and-source surface carrying a ghost-text completion), and the assistant
 * (the Chat family with a collapsed tool-call trace). Nothing is mid-gesture: the completion is
 * static ghost text with its accept hint, the tool trace is collapsed, the composer is empty.
 *
 * Every colour comes from a --ds-* role. The syntax palette is the semantic families read as an
 * editor theme — keywords info, strings success, numbers warning, types/calls accent (text-link),
 * comments and ghost text weak — so it follows a brand collision shift like everything else.
 *
 * NARROWING. A resizable pane has a real floor and never grows a horizontal scrollbar inside it:
 * labels TRUNCATE (one line, ellipsis, `min-width: 0`), prose REFLOWS, and the assistant's floor
 * (320px) is set from the widest thing that cannot shrink — its own header at the large tier,
 * measured at 307px. The ONE deliberate horizontal scroll on this page is the source surface: a
 * code line must never wrap, so it scrolls sideways as an editor's does.
 */

/* ---- the syntax palette --------------------------------------------------- */

type Tone = "plain" | "kw" | "str" | "num" | "sym" | "cmt";

const TONE: Record<Tone, string> = {
  plain: "var(--ds-text-strong)",
  kw: "var(--ds-text-info)",
  str: "var(--ds-text-success)",
  num: "var(--ds-text-warning)",
  sym: "var(--ds-text-link)",
  cmt: "var(--ds-text-weak)",
};

type Seg = readonly [Tone, string];

interface SourceLine {
  n: number;
  segs: readonly Seg[];
  /** Left change bar, as a working copy shows uncommitted edits. */
  change?: "added" | "modified";
}

/* src/server/checkout.ts, scrolled to the function the assistant is talking about. */
const SOURCE: readonly SourceLine[] = [
  { n: 42, segs: [["kw", "import"], ["plain", " { applyPromotion } "], ["kw", "from"], ["str", ' "../pricing/promotions"'], ["plain", ";"]] },
  { n: 43, segs: [["kw", "import type"], ["plain", " { "], ["sym", "Cart"], ["plain", ", "], ["sym", "Discount"], ["plain", ", "], ["sym", "Total"], ["plain", " } "], ["kw", "from"], ["str", ' "../types/cart"'], ["plain", ";"]] },
  { n: 44, segs: [["plain", ""]] },
  { n: 45, segs: [["kw", "const"], ["plain", " "], ["sym", "LOYALTY_RATE"], ["plain", ": "], ["sym", "Record"], ["plain", "<"], ["sym", "Tier"], ["plain", ", "], ["sym", "number"], ["plain", "> = {"]] },
  { n: 46, segs: [["plain", "  bronze: "], ["num", "0.02"], ["plain", ","]] },
  { n: 47, segs: [["plain", "  silver: "], ["num", "0.05"], ["plain", ","]] },
  { n: 48, segs: [["plain", "  gold: "], ["num", "0.08"], ["plain", ","]] },
  { n: 49, segs: [["plain", "};"]] },
  { n: 50, segs: [["plain", ""]] },
  { n: 51, segs: [["cmt", "/** Totals a cart, then layers every discount the shopper has earned. */"]] },
  { n: 52, segs: [["kw", "export function"], ["plain", " "], ["sym", "totalCart"], ["plain", "(cart: "], ["sym", "Cart"], ["plain", ", promo?: "], ["sym", "string"], ["plain", "): "], ["sym", "Total"], ["plain", " {"]] },
  { n: 53, segs: [["kw", "  const"], ["plain", " subtotal = cart.lines."], ["sym", "reduce"], ["plain", "((sum, line) => sum + line.price * line.qty, "], ["num", "0"], ["plain", ");"]] },
  { n: 54, segs: [["kw", "  const"], ["plain", " rate = "], ["sym", "LOYALTY_RATE"], ["plain", "[cart.shopper.tier] ?? "], ["num", "0"], ["plain", ";"]] },
  { n: 55, segs: [["kw", "  const"], ["plain", " discounts: "], ["sym", "Discount"], ["plain", "[] = [];"]] },
  { n: 56, segs: [["plain", ""]] },
  { n: 57, segs: [["kw", "  if"], ["plain", " (promo) {"]], change: "modified" },
  { n: 58, segs: [["plain", "    discounts."], ["sym", "push"], ["plain", "("], ["sym", "applyPromotion"], ["plain", "(promo, subtotal));"]], change: "modified" },
  { n: 59, segs: [["plain", "  }"]], change: "modified" },
  { n: 60, segs: [["plain", ""]] },
];

/** The line the caret sits on, and what the model is offering to write on it. */
const CARET_LINE = 61;
const GHOST = 'discounts.push({ kind: "loyalty", amount: subtotal * rate });';

const TAIL: readonly SourceLine[] = [
  { n: 62, segs: [["plain", ""]] },
  { n: 63, segs: [["kw", "  return"], ["plain", " "], ["sym", "settle"], ["plain", "(subtotal, discounts);"]] },
  { n: 64, segs: [["plain", "}"]] },
];

const GUTTER: React.CSSProperties = {
  width: "var(--ds-space-32)",
  textAlign: "right",
  color: "var(--ds-text-weak)",
  fontVariantNumeric: "tabular-nums",
  flexShrink: 0,
};

/* A single-line LABEL truncates; only prose reflows. Both halves matter: `white-space: nowrap` +
 * ellipsis give the one line, and `min-width: 0` is what lets a flex child shrink below its own
 * text at all — without it the label refuses to shrink and pushes its container's MIN-CONTENT
 * width up, which is how a narrowing pane ends up with a horizontal scrollbar instead of a floor. */
const TRUNCATE: React.CSSProperties = {
  minWidth: 0,
  overflow: "hidden",
  textOverflow: "ellipsis",
  whiteSpace: "nowrap",
};

const CHANGE_FILL: Record<NonNullable<SourceLine["change"]>, string> = {
  added: "var(--ds-fill-success)",
  modified: "var(--ds-fill-warning)",
};

/* [[status-dot-edges]]. The bar paints the status dot's fill, so it stacks the dot's edge as a 1px inset ring. The bar
   is 2px wide, so the ring covers all of it. */
const CHANGE_EDGE: Record<NonNullable<SourceLine["change"]>, string> = {
  added: "var(--success-dot-edge)",
  modified: "var(--warning-dot-edge)",
};

function ChangeBar({ change }: { change?: SourceLine["change"] }) {
  return (
    <Box
      aria-hidden
      style={{
        width: "var(--ds-space-2)",
        alignSelf: "stretch",
        flexShrink: 0,
        background: change ? CHANGE_FILL[change] : "transparent",
        boxShadow: change ? `inset 0 0 0 1px ${CHANGE_EDGE[change]}` : undefined,
      }}
    />
  );
}

function Row({ line }: { line: SourceLine }) {
  return (
    <Flex align="center" gap="3" style={{ paddingInline: "var(--ds-space-8)" }}>
      <ChangeBar change={line.change} />
      <Text style={GUTTER}>{line.n}</Text>
      <Code variant="ghost" style={{ whiteSpace: "pre", color: "var(--ds-text-strong)" }}>
        {line.segs.map(([tone, text], i) => (
          <span key={i} style={{ color: TONE[tone] }}>{text}</span>
        ))}
      </Code>
    </Flex>
  );
}

/** The caret line: real indentation, a block caret, then the model's suggestion as dimmed text. */
function GhostLine() {
  return (
    <Flex
      align="center"
      gap="3"
      style={{ paddingInline: "var(--ds-space-8)", background: "var(--ds-fill-weaker)" }}
    >
      <ChangeBar />
      <Text style={{ ...GUTTER, color: "var(--ds-text-strong)" }}>{CARET_LINE}</Text>
      <Code variant="ghost" style={{ whiteSpace: "pre", color: "var(--ds-text-strong)" }}>
        {"  "}
        <Box
          aria-hidden
          style={{
            display: "inline-block",
            width: "var(--ds-space-2)",
            height: "1.1em",
            verticalAlign: "text-bottom",
            background: "var(--ds-fill-strong)",
          }}
        />
        <span style={{ color: "var(--ds-text-weak)" }}>{GHOST}</span>
      </Code>
    </Flex>
  );
}

/** The accept affordance that rides a shown completion. */
function GhostHint() {
  return (
    <Flex align="center" gap="2" style={{ paddingLeft: "var(--ds-space-56)", paddingBlock: "var(--ds-space-8)" }}>
      <Flex
        align="center"
        gap="3"
        style={{
          paddingInline: "var(--ds-space-8)",
          paddingBlock: "var(--ds-space-4)",
          border: "1px solid var(--ds-stroke-weak)",
          borderRadius: "var(--ds-radius-2)",
          background: "var(--ds-bg-overlay)",
        }}
      >
        <Sparkle weight="fill" style={{ color: "var(--ds-icon-interactive)" }} />
        <Text style={{ color: "var(--ds-text-weak)", whiteSpace: "nowrap" }}>Completion from the whole-file context</Text>
        <Separator orientation="vertical" size="1" decorative />
        <Text style={{ color: "var(--ds-text-weak)", whiteSpace: "nowrap" }}>
          <Kbd>Tab</Kbd> accept
        </Text>
        <Text style={{ color: "var(--ds-text-weak)", whiteSpace: "nowrap" }}>
          <Kbd>Esc</Kbd> dismiss
        </Text>
      </Flex>
    </Flex>
  );
}

/* ---- the project rail ----------------------------------------------------- */

const folderShut = <Folder weight="fill" style={{ color: "var(--ds-icon-interactive)" }} />;
const folderOpen = <FolderOpen weight="fill" style={{ color: "var(--ds-icon-interactive)" }} />;
const tsFile = <FileTs style={{ color: "var(--ds-icon-neutral)" }} />;
const configFile = <FileCode style={{ color: "var(--ds-icon-neutral)" }} />;
const plainFile = <File style={{ color: "var(--ds-icon-neutral)" }} />;
const readmeFile = <FileMd style={{ color: "var(--ds-icon-neutral)" }} />;

/* The one-letter working-copy marks a rail shows beside a touched file. */
const modifiedMark = <Text weight="medium" style={{ color: "var(--ds-text-warning)" }}>M</Text>;
const addedMark = <Text weight="medium" style={{ color: "var(--ds-text-success)" }}>A</Text>;

const PROJECT: TreeListItemData[] = [
  {
    id: "src", label: "src", startContent: folderOpen, isExpanded: true,
    children: [
      {
        id: "pricing", label: "pricing", startContent: folderShut,
        children: [
          { id: "promotions", label: "promotions.ts", startContent: tsFile, isSelected: false, onClick: () => {} },
          { id: "rounding", label: "rounding.ts", startContent: tsFile, isSelected: false, onClick: () => {} },
        ],
      },
      {
        id: "server", label: "server", startContent: folderOpen, isExpanded: true,
        children: [
          { id: "checkout", label: "checkout.ts", startContent: tsFile, endContent: modifiedMark, isSelected: true, onClick: () => {} },
          { id: "session", label: "session.ts", startContent: tsFile, isSelected: false, onClick: () => {} },
          { id: "webhooks", label: "webhooks.ts", startContent: tsFile, endContent: addedMark, isSelected: false, onClick: () => {} },
        ],
      },
      {
        id: "store", label: "store", startContent: folderShut,
        children: [{ id: "cart-store", label: "cart-store.ts", startContent: tsFile, isSelected: false, onClick: () => {} }],
      },
      {
        id: "types", label: "types", startContent: folderShut,
        children: [{ id: "cart-types", label: "cart.ts", startContent: tsFile, isSelected: false, onClick: () => {} }],
      },
    ],
  },
  {
    id: "tests", label: "tests", startContent: folderShut,
    children: [{ id: "pricing-test", label: "pricing.test.ts", startContent: tsFile, isSelected: false, onClick: () => {} }],
  },
  { id: "tsconfig", label: "tsconfig.json", startContent: configFile, isSelected: false, onClick: () => {} },
  { id: "package", label: "package.json", startContent: plainFile, isSelected: false, onClick: () => {} },
  { id: "readme", label: "README.md", startContent: readmeFile, isSelected: false, onClick: () => {} },
];

const SYMBOLS: OutlineItem[] = [
  { id: "sym-loyalty-rate", text: "LOYALTY_RATE", level: 2 },
  { id: "sym-total-cart", text: "totalCart(cart, promo)", level: 2 },
  { id: "sym-subtotal", text: "subtotal", level: 3 },
  { id: "sym-discounts", text: "discounts", level: 3 },
  { id: "sym-settle", text: "settle(subtotal, discounts)", level: 2 },
];

const RAIL_LABEL: React.CSSProperties = {
  color: "var(--ds-text-weak)",
  textTransform: "uppercase",
  display: "block",
  ...TRUNCATE,
};

function ProjectRail() {
  return (
    <Flex direction="column" style={{ height: "100%" }}>
      <Flex align="center" justify="between" gap="2" style={{ padding: "var(--ds-space-12)" }}>
        <Text weight="medium" style={TRUNCATE}>checkout-service</Text>
        <Badge tone="warning">2 changed</Badge>
      </Flex>
      <ScrollArea type="auto" scrollbars="vertical" style={{ flex: "1 1 auto", minHeight: 0 }}>
        <Box style={{ paddingInline: "var(--ds-space-8)", paddingBottom: "var(--ds-space-16)" }}>
          <TreeList
            density="compact"
            items={PROJECT}
            header={<Text weight="medium" style={RAIL_LABEL}>Explorer</Text>}
          />
          <Box style={{ paddingBlock: "var(--ds-space-12)" }}>
            <Separator size="4" decorative />
          </Box>
          <Box style={{ paddingInline: "var(--ds-space-4)" }}>
            <Text weight="medium" style={RAIL_LABEL}>Outline</Text>
            <Outline items={SYMBOLS} activeId="sym-total-cart" label="Symbols in checkout.ts" />
          </Box>
        </Box>
      </ScrollArea>
    </Flex>
  );
}

/* ---- the assistant panel -------------------------------------------------- */

const TRACE: ChatToolCallItem[] = [
  { name: "read_file", status: "complete", node: "workspace", target: "src/server/checkout.ts", duration: "80ms" },
  { name: "read_file", status: "complete", node: "workspace", target: "src/store/cart-store.ts", duration: "64ms" },
  { name: "search", status: "complete", target: 'loyalty in src/**/*.ts', duration: "210ms", stats: "7 matches" },
  { name: "edit_file", status: "complete", node: "workspace", target: "src/server/checkout.ts", additions: 6, deletions: 1, duration: "120ms" },
];

const ASSISTANT_AVATAR = <Avatar radius="medium" fallback={<Sparkle weight="fill" />} />;

function AssistantPanel() {
  return (
    <Flex direction="column" style={{ height: "100%", background: "var(--ds-bg-raised)" }}>
      <Flex align="center" justify="between" gap="2" style={{ padding: "var(--ds-space-12)" }}>
        <Flex align="center" gap="2">
          <Sparkle weight="fill" style={{ color: "var(--ds-icon-interactive)" }} />
          {/* PINNED on purpose: the heading lane is the DOCUMENT lane (5/6/7 → 20/24/28px) and a
              chrome bar cannot ride it. "2" is the chrome step; everything else here follows the tier. */}
          <Heading as="h2" size="2">Assistant</Heading>
          <Badge tone="info">whole workspace</Badge>
        </Flex>
        <Tooltip content="Close the assistant panel">
          <IconButton type="button" priority="tertiary" aria-label="Close the assistant panel">
            <X />
          </IconButton>
        </Tooltip>
      </Flex>
      <Separator size="4" decorative />
      <ChatMessageList
        label="Assistant conversation about the checkout service"
        style={{ flex: "1 1 auto", minHeight: 0, padding: "var(--ds-space-12)" }}
      >
        <ChatMessage sender="user">
          The loyalty discount disappears from the total whenever a promo code is applied. Where does it
          go?
        </ChatMessage>

        <ChatMessage sender="assistant" name="Assistant" avatar={ASSISTANT_AVATAR} group="first">
          <Text as="p">
            The rate is computed and then never used. <Code>totalCart</Code> reads{" "}
            <Code>LOYALTY_RATE</Code> into <Code>rate</Code> on line 54, but only the promo branch pushes
            anything onto <Code>discounts</Code> — so with a promo code the cart settles on that one
            discount, and without one it settles on nothing at all.
          </Text>
          {/* The collapsed tool-call summary truncates its target — but only once its width is
              DEFINITE. The log's scroll wrapper is shrink-to-fit, so the summary's min-content
              (477px at the large tier) propagated up and minted a horizontal scrollbar instead.
              Inline-size containment stops the block asking for width it does not need: it takes
              what it is given and the ladder inside it does the rest. */}
          <Box mt="2" style={{ containerType: "inline-size" }}>
            <ChatToolCalls calls={TRACE} />
          </Box>
        </ChatMessage>

        <ChatMessage sender="assistant" name="Assistant" avatar={ASSISTANT_AVATAR} group="last">
          <Text as="p">
            I have drafted the missing push on line 61 as an inline completion, and left the promo branch
            alone so the two discounts stack. <Code>settle()</Code> already sums the array, so nothing
            downstream changes.
          </Text>
        </ChatMessage>
      </ChatMessageList>
      <Box style={{ padding: "var(--ds-space-12)" }}>
        <ChatComposer
          onSubmit={() => {}}
          label="Message the assistant"
          placeholder="Ask about checkout.ts, or describe an edit…"
          actions={
            <>
              <Tooltip content="Attach a file">
                <IconButton type="button" priority="tertiary" aria-label="Attach a file">
                  <Paperclip />
                </IconButton>
              </Tooltip>
              <Tooltip content="Add a file, symbol or selection as context">
                <IconButton type="button" priority="tertiary" aria-label="Add context">
                  <At />
                </IconButton>
              </Tooltip>
            </>
          }
        />
      </Box>
    </Flex>
  );
}

/* ---- the document --------------------------------------------------------- */

const OPEN_FILES: { id: string; label: string; href: string; dirty?: boolean }[] = [
  { id: "checkout", label: "checkout.ts", href: "#file-checkout", dirty: true },
  { id: "cart-store", label: "cart-store.ts", href: "#file-cart-store" },
  { id: "pricing-test", label: "pricing.test.ts", href: "#file-pricing-test" },
];

function OpenFileTabs() {
  return (
    <Tabs.Nav.Root aria-label="Open files">
      {OPEN_FILES.map((file) => (
        <Tabs.Nav.Link key={file.id} href={file.href} active={file.id === "checkout"}>
          <Flex align="center" gap="2">
            <FileTs style={{ color: "var(--ds-icon-neutral)" }} />
            {file.label}
            {file.dirty ? <StatusDot variant="warning" label="Unsaved changes" /> : null}
          </Flex>
        </Tabs.Nav.Link>
      ))}
    </Tabs.Nav.Root>
  );
}

const PROBLEMS: { tone: "error" | "warning"; message: string; where: string }[] = [
  { tone: "error", message: "Property 'shopper' does not exist on type 'Cart'.", where: "src/server/checkout.ts:54" },
  { tone: "warning", message: "'Total' is declared but its value is never read.", where: "src/server/checkout.ts:43" },
  { tone: "warning", message: "Prefer awaiting applyPromotion() before pushing its result.", where: "src/server/checkout.ts:58" },
];

function ProblemsPanel() {
  return (
    <Flex direction="column" style={{ height: "100%", background: "var(--ds-bg-subtle)" }}>
      <Flex align="center" justify="between" gap="2" style={{ padding: "var(--ds-space-8)" }}>
        <Flex align="center" gap="2">
          <Text weight="medium" style={RAIL_LABEL}>Problems</Text>
          <Badge tone="error" leadingIcon={<WarningCircle weight="fill" />}>1</Badge>
          <Badge tone="warning" leadingIcon={<Warning weight="fill" />}>2</Badge>
        </Flex>
        <Tooltip content="Close the problems panel">
          <IconButton type="button" priority="tertiary" aria-label="Close the problems panel">
            <X />
          </IconButton>
        </Tooltip>
      </Flex>
      <ScrollArea type="auto" scrollbars="vertical" style={{ flex: "1 1 auto", minHeight: 0 }}>
        <Flex direction="column" style={{ paddingInline: "var(--ds-space-8)", paddingBottom: "var(--ds-space-8)" }}>
          {PROBLEMS.map((problem) => (
            <Flex key={problem.where + problem.message} align="center" gap="2" style={{ paddingBlock: "var(--ds-space-4)" }}>
              {problem.tone === "error" ? (
                <WarningCircle weight="fill" style={{ color: "var(--ds-icon-error)", flexShrink: 0 }} />
              ) : (
                <Warning weight="fill" style={{ color: "var(--ds-icon-warning)", flexShrink: 0 }} />
              )}
              {/* The message is the long half and truncates; the locator is short, never shrinks,
                  and is the half a reader jumps from. */}
              <Text style={TRUNCATE}>{problem.message}</Text>
              <Text style={{ color: "var(--ds-text-weak)", whiteSpace: "nowrap", flexShrink: 0 }}>{problem.where}</Text>
            </Flex>
          ))}
        </Flex>
      </ScrollArea>
    </Flex>
  );
}

function Document() {
  // The problems panel is a stacked pane, so its separator resizes HEIGHT and docks to the end. The
  // consumer owns the engine call (ResizeHandle is presentational) — one call, never in a map.
  const drawer = useResizable({
    defaultSize: 156,
    minSizePx: 96,
    maxSizePx: 320,
    orientation: "horizontal",
    side: "end",
    "aria-label": "Resize the problems panel",
  });

  return (
    <Flex direction="column" style={{ height: "100%", minHeight: 0 }}>
      <Box style={{ paddingInline: "var(--ds-space-8)", paddingTop: "var(--ds-space-8)" }}>
        <OpenFileTabs />
      </Box>
      <Flex
        align="center"
        justify="between"
        gap="2"
        style={{ paddingInline: "var(--ds-space-16)", paddingBlock: "var(--ds-space-8)" }}
      >
        <Breadcrumbs label="Path to the open symbol" separator={<CaretRight />} variant="supporting">
          <BreadcrumbItem href="#crumb-src" startIcon={folderShut}>src</BreadcrumbItem>
          <BreadcrumbItem href="#crumb-server" startIcon={folderShut}>server</BreadcrumbItem>
          <BreadcrumbItem href="#crumb-file" startIcon={tsFile}>checkout.ts</BreadcrumbItem>
          <BreadcrumbItem isCurrent startIcon={<FunctionIcon />}>totalCart</BreadcrumbItem>
        </Breadcrumbs>
        <Text style={{ color: "var(--ds-text-weak)", whiteSpace: "nowrap", flexShrink: 0 }}>Ln {CARET_LINE}, Col 3</Text>
      </Flex>
      <Separator size="4" decorative />
      {/* Both axes: a source line is never wrapped, so a long one scrolls sideways as an editor's does. */}
      <ScrollArea type="auto" scrollbars="both" style={{ flex: "1 1 auto", minHeight: 0 }}>
        <Box style={{ paddingBlock: "var(--ds-space-8)", minWidth: "max-content" }}>
          {SOURCE.map((line) => <Row key={line.n} line={line} />)}
          <GhostLine />
          <GhostHint />
          {TAIL.map((line) => <Row key={line.n} line={line} />)}
        </Box>
      </ScrollArea>
      <ResizeHandle
        separatorProps={drawer.separatorProps}
        onDragStart={drawer.onDragStart}
        aria-label="Resize the problems panel"
      />
      <Box style={{ height: drawer.isCollapsed ? 0 : drawer.size, flexShrink: 0, overflow: "hidden" }}>
        <ProblemsPanel />
      </Box>
    </Flex>
  );
}

/* ---- the shell ------------------------------------------------------------ */

function TitleBar() {
  return (
    <Flex align="center" justify="between" gap="4">
      <Flex align="center" gap="2">
        <Cube weight="fill" style={{ color: "var(--ds-icon-interactive)" }} />
        {/* Same chrome pin as the assistant header above. */}
        <Heading as="h2" size="2">checkout.ts</Heading>
        <Text style={{ color: "var(--ds-text-weak)", whiteSpace: "nowrap" }}>checkout-service</Text>
      </Flex>
      <Flex
        align="center"
        gap="3"
        style={{
          minWidth: 0,
          paddingInline: "var(--ds-space-12)",
          paddingBlock: "var(--ds-space-4)",
          border: "1px solid var(--ds-stroke-weak)",
          borderRadius: "var(--ds-radius-3)",
          background: "var(--ds-bg-subtle)",
        }}
      >
        <MagnifyingGlass style={{ color: "var(--ds-icon-neutral)" }} />
        <Text style={{ color: "var(--ds-text-weak)", ...TRUNCATE }}>Search files, symbols or commands</Text>
        <Text style={{ color: "var(--ds-text-weak)", whiteSpace: "nowrap", flexShrink: 0 }}>
          <Kbd>⌘</Kbd> <Kbd>K</Kbd>
        </Text>
      </Flex>
      <Flex align="center" gap="2">
        {/* The view toggles are STATE, not actions — wrap is on, invisibles and the minimap are off —
            so they are a toggle group rather than three icon buttons, and the group is ONE control in
            this row ([[toggle-group-box]]). Each item is icon-only, so each carries `pressedIcon`: the selected face is
            the bold cut of the same glyph, which survives the colour being taken away.

            NO TOOLTIP ON AN ITEM. Radix's Tooltip trigger stamps its OWN `data-state`
            ("closed"/"delayed-open") on the element it clones, and `asChild` puts that on the very
            button ToggleGroup marks `data-state="on"|"off"`. The tooltip wins, so the pressed fill
            never paints and BOTH `pressedIcon` faces render at once — measured here before it was
            taken out. The item's `aria-label` is the name; the hint has no supported home. */}
        <ToggleButtonGroup.Root type="multiple" defaultValue={["wrap"]} label="Editor view">
          <ToggleButtonGroup.Item value="wrap" aria-label="Word wrap" pressedIcon={<TextAa weight="bold" />}>
            <TextAa />
          </ToggleButtonGroup.Item>
          <ToggleButtonGroup.Item value="whitespace" aria-label="Show whitespace" pressedIcon={<Paragraph weight="bold" />}>
            <Paragraph />
          </ToggleButtonGroup.Item>
          <ToggleButtonGroup.Item value="minimap" aria-label="Minimap" pressedIcon={<MapTrifold weight="fill" />}>
            <MapTrifold />
          </ToggleButtonGroup.Item>
        </ToggleButtonGroup.Root>
        <Tooltip content="Jump to symbol">
          <IconButton type="button" priority="tertiary" aria-label="Jump to symbol">
            <FunctionIcon />
          </IconButton>
        </Tooltip>
      </Flex>
    </Flex>
  );
}

function StatusStrip() {
  return (
    <Flex align="center" justify="between" gap="4">
      <Flex align="center" gap="4" style={{ minWidth: 0 }}>
        <Flex align="center" gap="2">
          <GitBranch style={{ color: "var(--ds-icon-neutral)" }} />
          <Text style={TRUNCATE}>feat/stack-loyalty-and-promo</Text>
        </Flex>
        <Flex align="center" gap="2">
          <StatusDot variant="success" label="Language server ready" />
          <Text style={{ color: "var(--ds-text-weak)", ...TRUNCATE }}>Language server ready</Text>
        </Flex>
        <Flex align="center" gap="2">
          <Badge tone="error" leadingIcon={<WarningCircle weight="fill" />}>1</Badge>
          <Badge tone="warning" leadingIcon={<Warning weight="fill" />}>2</Badge>
        </Flex>
      </Flex>
      <Flex align="center" gap="4" style={{ flexShrink: 0 }}>
        <Text style={{ color: "var(--ds-text-weak)", whiteSpace: "nowrap" }}>Spaces: 2</Text>
        <Text style={{ color: "var(--ds-text-weak)", whiteSpace: "nowrap" }}>UTF-8</Text>
        <Text style={{ color: "var(--ds-text-weak)", whiteSpace: "nowrap" }}>LF</Text>
      </Flex>
    </Flex>
  );
}

function CodeEditorScreen() {
  return (
    <Layout
      padding="0"
      defaultHasDividers
      style={{ height: "100vh", "--ds-layout-content-min": "480px" } as React.CSSProperties}
      data-testid="code-editor"
    >
      <Layout.Header landmark style={{ paddingInline: "var(--ds-space-16)", paddingBlock: "var(--ds-space-8)" }}>
        <TitleBar />
      </Layout.Header>

      <Layout.Panel
        landmark
        resizable={{ defaultSize: 272, minSizePx: 208, maxSizePx: 420, "aria-label": "Resize the project rail" }}
      >
        <ProjectRail />
      </Layout.Panel>

      <Layout.Content>
        <Document />
      </Layout.Content>

      <Layout.Panel
        landmark
        side="end"
        resizable={{ defaultSize: 428, minSizePx: 320, maxSizePx: 520, "aria-label": "Resize the assistant panel" }}
      >
        <AssistantPanel />
      </Layout.Panel>

      <Layout.Footer landmark style={{ paddingInline: "var(--ds-space-16)", paddingBlock: "var(--ds-space-4)" }}>
        <StatusStrip />
      </Layout.Footer>
    </Layout>
  );
}

const meta: Meta = {
  title: "UI examples/Code editor",
  parameters: {
    layout: "fullscreen",
    // Showcase pages assert nothing and are registered as fully axe-off in
    // src/foundations/axe-scope.node-check.ts under ruling [[showcases-and-fixture]]. They are visual
    // references, not evidence. The composition fixture carries the axe role.
    a11y: { test: "off" },
  },
};
export default meta;
type Story = StoryObj;

export const Screen: Story = { name: "Code editor", render: () => <CodeEditorScreen /> };
