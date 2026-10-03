import type { Meta, StoryObj } from "@storybook/react-vite";
import type { CSSProperties } from "react";
import { Box, Flex } from "@radix-ui/themes";
import {
  ArrowsClockwise,
  Copy,
  Info,
  MagnifyingGlass,
  Paperclip,
  Plus,
  ShareNetwork,
  Sparkle,
  ThumbsDown,
  ThumbsUp,
} from "@phosphor-icons/react";
import { SideNav } from "../components/ui/SideNav";
import { ChatLayout } from "../components/ui/ChatLayout";
import { ChatMessage } from "../components/ui/ChatMessage";
import { ChatMessageMetadata } from "../components/ui/ChatMessageMetadata";
import { ChatSystemMessage } from "../components/ui/ChatSystemMessage";
import { ChatToolCalls, type ChatToolCallItem } from "../components/ui/ChatToolCalls";
import { ChatComposer } from "../components/ui/ChatComposer";
import { Citation } from "../components/ui/Citation";
import { Avatar } from "../components/ui/Avatar";
import { Badge } from "../components/ui/Badge";
import { Button } from "../components/ui/Button";
import { Code } from "../components/ui/Code";
import { FileInput } from "../components/ui/FileInput";
import { Heading } from "../components/ui/Heading";
import { IconButton } from "../components/ui/IconButton";
import { MoreMenu } from "../components/ui/MoreMenu";
import { DropdownMenu } from "../components/ui/DropdownMenu";
import { List, ListItem } from "../components/ui/List";
import { RadioGroup } from "../components/ui/RadioGroup";
import { Select } from "../components/ui/Select";
import { Slider } from "../components/ui/Slider";
import { Switch } from "../components/ui/Switch";
import { Text } from "../components/ui/Text";
import { Timestamp } from "../components/ui/Timestamp";
import { Tooltip } from "../components/ui/Tooltip";

/* A conversational assistant, recreated: history rail, transcript, docked composer, settings rail. It
 * renders AT REST — nothing open, nothing mid-gesture, no interaction script. The only motion-adjacent
 * state on the page is the streaming turn, and that is represented STATICALLY: `isStreaming` on the
 * layout is an `aria-busy` flag, and the composer's `isStopShown` swaps send for stop. Neither
 * animates, which is why no tool call carries `status: "running"` — that state renders a Spinner, and
 * a spinner on open is the kind of greeting this page exists to avoid.
 *
 * The reading measure appears exactly once per assistant answer, on the prose paragraphs inside the
 * bubble. That is the one place it belongs: the rail, the header and the dock run the full width of
 * the viewport, because app chrome has no measure.
 *
 * The assistant's mark is `Avatar`'s own initial rather than an SVG data URI with a gradient in it:
 * the fallback paints from the accent-aware soft skin, so the mark follows a brand swap. A hardcoded
 * gradient would be the one thing on this screen that ignored the theme.
 *
 * The settings rail is where the conversation's own knobs live — the documents it may read, how long
 * an answer runs, how literal it is, which tools it may reach for. They are in a rail rather than the
 * dock on purpose: the dock holds what you change every turn (the model, an attachment, stop), the
 * rail holds what you set once. Every one of them renders its state in place, with nothing to open.
 */

/** The prose body of an answer — the one legitimate reading measure on this screen. */
const PROSE: CSSProperties = { maxWidth: "var(--ds-text-measure)" };

const WEAK: CSSProperties = { color: "var(--ds-text-weak)" };

const TODAY = [
  "Rooftop solar payback for the Bristol site",
  "Reply to the landlord about the loading bay",
  "Summarise the Q3 board pack",
];

const EARLIER = [
  "Why the nightly rollup job got slower",
  "Forklift service intervals",
  "Rewrite the returns policy in plain English",
  "Rota cover for the December shutdown",
  "Translate the supplier contract clause 7",
];

/* Two calls, so the component renders its collapsed group summary: the latest call's state and name
 * with a "2 calls" count, and the rows hidden until someone asks for them. `defaultOpen={false}` is
 * the default and is stated anyway — the closed state is the point of this fixture, not a leftover. */
const TOOL_CALLS: ChatToolCallItem[] = [
  {
    name: "web_search",
    status: "complete",
    target: "commercial rooftop solar installed cost per kW 2026",
    duration: "1.4s",
    stats: "6 sources",
    resultDetail: (
      <Flex direction="column" gap="1">
        <Text size="1" style={WEAK}>
          Commercial solar cost survey, Q1 2026 — £480–£620 per kW installed, 50–150 kW band.
        </Text>
        <Text size="1" style={WEAK}>
          Regional electricity price index — 27.1p per kWh, non-domestic half-hourly, Q1 2026.
        </Text>
      </Flex>
    ),
  },
  {
    name: "calculate",
    status: "complete",
    target: "210000 * 0.271 * 0.82 - 1150 / (48000)",
    duration: "180ms",
    resultDetail: (
      <Flex direction="column" gap="1">
        <Text size="1" style={WEAK}>annual_saving = £45,543</Text>
        <Text size="1" style={WEAK}>simple_payback = 1.05 years (before self-consumption limits)</Text>
      </Flex>
    ),
  },
];

/* The history rail. Three regions, and each one is told apart by a DIFFERENT device rather than by
 * spacing alone, which is what made the old rail read as one undifferentiated list:
 *
 *   1. NEW CHAT IS A BUTTON, not a nav row. It is the rail's own action — it goes nowhere — so it
 *      carries a control's surface (border + fill) where every destination below it is a ghost row.
 *      `secondary`, deliberately, not `primary`: the composer's send is this page's one solid button
 *      (`priority="primary"` inside ChatComposer), and the grade says "one per page".
 *   2. SEARCH SITS IN THE SECTION HEADER, beside the list's title, instead of spending a full-width
 *      row on one word. An icon-only control, so a Tooltip names it — same treatment as every other
 *      icon-only control on this page.
 *   3. THE RECENCY GROUPS ARE RULED APART. SideNav DOES ship the grouping construct — `SideNav.Section`
 *      + `SideNav.Heading`, both already in use here — but when the rail is EXPANDED the heading is
 *      type only (uppercase, weak, 12px) and the section boundary is an 8px margin; the 1px rule the
 *      heading draws exists only in the COLLAPSED rail. So the visible rule between the two groups has
 *      to come from the page. That is not a seam drawn twice: nothing else paints this boundary, and
 *      this rail is never collapsed (no collapse button, no `defaultCollapsed`), so the heading's own
 *      collapsed rule can never appear beside it.
 */
function HistoryRail() {
  return (
    <SideNav aria-label="Conversations">
      <SideNav.Section>
        {/* Full-bleed and start-aligned, so it shares the rows' left edge instead of floating. No
            `size` — the rail's controls follow the global tier like everything else. */}
        <Button priority="secondary" type="button" onClick={() => {}} style={{ width: "100%", justifyContent: "flex-start" }}>
          <Plus />
          New chat
        </Button>

        <Flex align="center" justify="between" gap="2" style={{ paddingInlineStart: "var(--ds-space-8)" }}>
          {/* The visible title says what the nav landmark is already named, so the two agree. */}
          <Text weight="medium" style={{ minWidth: 0 }} truncate>
            Conversations
          </Text>
          <Tooltip content="Search chats">
            <IconButton type="button" priority="tertiary" aria-label="Search chats">
              <MagnifyingGlass />
            </IconButton>
          </Tooltip>
        </Flex>
      </SideNav.Section>

      <SideNav.Section>
        <SideNav.Heading>Today</SideNav.Heading>
        {TODAY.map((title, i) => (
          <SideNav.Item key={title} label={title} href="#" isSelected={i === 0} />
        ))}
      </SideNav.Section>

      {/* `divided` rather than a hand-rolled Separator: the rule now belongs to SideNav.Section
          ([[side-nav-section-divider]]), so every rail in the system can group the same way instead of this page owning a
          fix that travels nowhere. */}
      <SideNav.Section divided>
        <SideNav.Heading>Previous 7 days</SideNav.Heading>
        {EARLIER.map((title) => (
          <SideNav.Item key={title} label={title} href="#" />
        ))}
      </SideNav.Section>
    </SideNav>
  );
}

/** The screen's own bar: what this conversation is, what answered it, and what you can do to it. */
function ScreenHeader() {
  return (
    <Flex
      align="center"
      justify="between"
      gap="4"
      style={{
        padding: "var(--ds-space-12) var(--ds-space-24)",
        borderBlockEnd: "1px solid var(--ds-stroke-weak)",
        background: "var(--ds-bg-base)",
      }}
    >
      <Flex align="center" gap="3" style={{ minWidth: 0 }}>
        {/* The screen's only h1: the conversation IS the page. */}
        <Heading as="h1" size="3" truncate>
          Rooftop solar payback for the Bristol site
        </Heading>
        <Badge leadingIcon={<Sparkle />}>Helix 2 Pro</Badge>
      </Flex>

      <Flex align="center" gap="2">
        <Tooltip content="Share this conversation">
          <IconButton type="button" priority="tertiary" aria-label="Share this conversation">
            <ShareNetwork />
          </IconButton>
        </Tooltip>
        {/* `MoreMenu`, not a hand-rolled IconButton: an overflow menu is what it is for, and it
            already ships `DotsThreeVertical weight="bold"`. Hand-rolling it here rendered the
            glyph at REGULAR weight, where three small dots carry far less optical weight than the
            stroked share glyph beside them and read as imperceptible ([[optical-icon-weight]]). */}
        <MoreMenu label="Conversation options">
          <DropdownMenu.Item>Rename conversation</DropdownMenu.Item>
          <DropdownMenu.Item>Duplicate</DropdownMenu.Item>
          <DropdownMenu.Item>Export transcript</DropdownMenu.Item>
          <DropdownMenu.Separator />
          <DropdownMenu.Item tone="danger">Delete conversation</DropdownMenu.Item>
        </MoreMenu>
        <Avatar size="sm" fallback="RM" />
      </Flex>
    </Flex>
  );
}

/* Copy, regenerate, and the two feedback controls — the row that hangs off a finished answer. Every
 * one is icon-only, and an icon-only control in a dense row is where a Tooltip earns its keep: the
 * glyph is the whole label, so the hint names it in words for anyone who is not sure. The tooltips
 * are CLOSED at rest — nothing here opens on load. */
function AnswerActions() {
  return (
    <Flex align="center" gap="1">
      <Tooltip content="Copy this answer">
        <IconButton type="button" priority="tertiary" aria-label="Copy this answer">
          <Copy />
        </IconButton>
      </Tooltip>
      <Tooltip content="Regenerate this answer">
        <IconButton type="button" priority="tertiary" aria-label="Regenerate this answer">
          <ArrowsClockwise />
        </IconButton>
      </Tooltip>
      <Tooltip content="Good answer">
        <IconButton type="button" priority="tertiary" aria-label="Good answer">
          <ThumbsUp />
        </IconButton>
      </Tooltip>
      <Tooltip content="Bad answer">
        <IconButton type="button" priority="tertiary" aria-label="Bad answer">
          <ThumbsDown />
        </IconButton>
      </Tooltip>
    </Flex>
  );
}

/** The substantive answer: prose at a measure, a cited figure, and the assumptions it rests on. */
function AnswerBody() {
  return (
    <Flex direction="column" gap="3">
      <Text as="p" size="2" style={PROSE}>
        £48,000 for 92 kW works out at £522 per kW, which sits mid-range for a 50–150 kW rooftop
        array this year — the current survey band is £480 to £620 per kW installed
        <Citation
          number={1}
          variant="number"
          source={{ title: "Commercial solar cost survey, Q1 2026", url: "https://example.org/solar-cost-survey" }}
        />
        . So the price is fair rather than keen — worth a second quote, but no red flag.
      </Text>

      <Text as="p" size="2" style={PROSE}>
        Payback turns almost entirely on how much of the generation you use yourself. At 210,000 kWh a
        year against a 27.1p import rate, the array covers roughly 82,000 kWh of your own demand —{" "}
        <Code>82,000 × £0.271</Code>{" "}
        — for about £22,200 a year, so payback lands near two years and two months. Export at 4.1p
        adds very little.
      </Text>

      <List listStyle="disc" density="compact">
        <ListItem label={<Text size="2">Assumes the Bristol roof pitch and shading survey from March still holds.</Text>} />
        <ListItem label={<Text size="2">No inverter replacement inside year ten, which is the usual optimism.</Text>} />
        <ListItem label={<Text size="2">Import price held flat; the index has moved 9% in eighteen months.</Text>} />
      </List>

      <Flex align="center" gap="2" wrap="wrap">
        <Citation
          number={1}
          source={{ title: "Commercial solar cost survey, Q1 2026", url: "https://example.org/solar-cost-survey" }}
        />
        <Citation
          number={2}
          source={{ title: "Regional electricity price index", url: "https://example.org/price-index" }}
        />
      </Flex>
    </Flex>
  );
}

/** The dock: attachment, model picker, and the stop control the streaming turn puts there. */
function Composer() {
  return (
    <ChatComposer
      onSubmit={() => {}}
      onStop={() => {}}
      isStopShown
      label="Message the assistant"
      placeholder="Ask about the site, the numbers, or the paperwork…"
      actions={
        <Flex align="center" gap="2">
          {/* The dock keeps its ICON affordance. FileInput belongs to this page, but not here: it is a
              field — label row, control, status line — and a field cannot live in a 24px action row
              (the box-law guard measures the compact shell at 147px against its claimed step). The
              real file surface is the conversation's reference documents, in the settings rail. */}
          <Tooltip content="Attach a file">
            <IconButton type="button" priority="tertiary" aria-label="Attach a file">
              <Paperclip />
            </IconButton>
          </Tooltip>
          {/* Closed at rest. Bare root, so no field chrome — the trigger carries its own name. */}
          <Select defaultValue="pro">
            <Select.Trigger aria-label="Model" icon={<Sparkle />} />
            <Select.Content>
              <Select.Item value="fast">Helix 2 Fast</Select.Item>
              <Select.Item value="pro">Helix 2 Pro</Select.Item>
              <Select.Item value="research">Helix 2 Research</Select.Item>
            </Select.Content>
          </Select>
        </Flex>
      }
    />
  );
}

/* The switch row this rail repeats, in the system's one switch shape: the label LEADS and the switch
 * sits on the trailing edge, so the states line up in a single scannable column. `htmlFor` is what
 * names the control — a Switch takes no label of its own. */
function SettingSwitch({ id, label, defaultChecked }: { id: string; label: string; defaultChecked?: boolean }) {
  return (
    <Flex align="center" justify="between" gap="3">
      <Text as="label" htmlFor={id} size="2">
        {label}
      </Text>
      <Switch id={id} defaultChecked={defaultChecked} style={{ flexShrink: 0 }} />
    </Flex>
  );
}

/* The settings this conversation carries: the documents it may read, how long an answer should run,
 * how literal it should be, and which tools it may reach for. The rail is where an assistant's
 * settings actually live — the composer holds the ones you change every turn, this holds the ones you
 * set once and leave.
 *
 * SEAM: the rail owns the hairline between itself and the transcript (`borderInlineStart`), and the
 * transcript side carries none — one owner per seam. The header's own bottom border runs above both.
 *
 * NAMING THE GROUPS: neither RadioGroup nor Slider ships a label of its own (the FieldGroup shell is
 * unexported, a known gap), so each visible caption gets an id and the control points at it with
 * `aria-labelledby` — not an `aria-label` duplicating text already on screen. */
function SettingsRail() {
  return (
    <Flex
      direction="column"
      gap="5"
      style={{
        width: 292,
        flexShrink: 0,
        overflowY: "auto",
        padding: "var(--ds-space-16)",
        borderInlineStart: "1px solid var(--ds-stroke-weak)",
        background: "var(--ds-bg-base)",
      }}
    >
      <Heading as="h2" size="2">
        Conversation settings
      </Heading>

      {/* The quote and the meter readings the answer is arguing about — attached once, in scope for
          every turn. A dropzone rather than the compact row: the rail is a column with width to
          spare, and dropping a PDF into it is the actual gesture. */}
      <FileInput
        label="Reference documents"
        accept=".pdf,.csv,.xlsx"
        isMultiple
        maxSize={10 * 1024 * 1024}
        onValueChange={() => {}}
        description="Attached files stay in scope for the whole conversation."
      />

      <Flex direction="column" gap="2">
        <Text id="answer-length-label" size="2" weight="medium">
          Answer length
        </Text>
        <RadioGroup defaultValue="balanced" name="answer-length" aria-labelledby="answer-length-label">
          <RadioGroup.Item value="brief">Brief</RadioGroup.Item>
          <RadioGroup.Item value="balanced" description="A few paragraphs, with the working shown">
            Balanced
          </RadioGroup.Item>
          <RadioGroup.Item value="thorough">Thorough</RadioGroup.Item>
        </RadioGroup>
      </Flex>

      <Flex direction="column" gap="2">
        <Text id="temperature-label" size="2" weight="medium">
          Temperature
        </Text>
        {/* `showInput` is the readout — the box IS the value display, so nothing duplicates it in the
            caption row. Uncontrolled: the page states a position, it does not drive one. */}
        <Slider
          aria-labelledby="temperature-label"
          min={0}
          max={1}
          step={0.1}
          defaultValue={[0.3]}
          showInput
        />
        <Text size="1" style={WEAK}>
          Low keeps the assistant close to what it found; high lets it speculate.
        </Text>
      </Flex>

      <Flex direction="column" gap="3">
        <Text size="2" weight="medium">
          Tools
        </Text>
        <SettingSwitch id="setting-web-search" label="Web search" defaultChecked />
        <SettingSwitch id="setting-extended-thinking" label="Extended thinking" />
        <SettingSwitch id="setting-citations" label="Cite sources" defaultChecked />
      </Flex>
    </Flex>
  );
}

function AiAssistantScreen() {
  const mark = <Avatar size="sm" fallback="H" />;

  return (
    <Flex style={{ height: "100vh", background: "var(--ds-bg-base)" }}>
      <HistoryRail />

      <Flex direction="column" style={{ flex: "1 1 auto", minWidth: 0 }}>
        <ScreenHeader />

        <Box style={{ flex: "1 1 auto", minHeight: 0, paddingInline: "var(--ds-space-16)", paddingBlockEnd: "var(--ds-space-16)" }}>
          <ChatLayout
            label="Conversation about rooftop solar payback for the Bristol site"
            style={{ height: "100%" }}
            /* The streaming turn, stated rather than animated: this marks the log busy so a screen
               reader hears the finished answer once instead of every partial. */
            isStreaming
            sessionStatus={
              <Text size="1" style={WEAK}>
                Writing a reply — you can keep typing.
              </Text>
            }
            composer={<Composer />}
          >
            <ChatSystemMessage variant="divider">Today</ChatSystemMessage>

            <ChatMessage
              sender="user"
              metadata={<ChatMessageMetadata timestamp={<Timestamp value="2026-09-18T16:41:00Z" format="time" />} status="read" />}
            >
              We have a quote of £48,000 for 92 kW of rooftop solar on the Bristol warehouse. Is that a
              fair price, and how long until it pays back? We use about 210,000 kWh a year.
            </ChatMessage>

            <ChatToolCalls calls={TOOL_CALLS} defaultOpen={false} />

            <ChatMessage
              sender="assistant"
              name="Helix"
              avatar={mark}
              label="Message from the assistant"
              metadata={
                <ChatMessageMetadata
                  timestamp={<Timestamp value="2026-09-18T16:41:22Z" format="time" />}
                  footer={
                    <Flex align="center" gap="3">
                      {/* No `size`: the metadata row resolves the tier once and the footer slot makes
                          every descendant inherit it ([[container-size-seeding]]). A `size="1"` here was a pin that the row
                          silently overrode — it said one thing and rendered another. */}
                      <Text style={WEAK}>Helix 2 Pro · 6.1s</Text>
                      <AnswerActions />
                    </Flex>
                  }
                />
              }
            >
              <AnswerBody />
            </ChatMessage>

            <ChatSystemMessage icon={<Info weight="fill" />}>
              You switched this conversation to Helix 2 Research.
            </ChatSystemMessage>

            <ChatMessage
              sender="user"
              metadata={<ChatMessageMetadata timestamp={<Timestamp value="2026-09-18T16:44:00Z" format="time" />} status="read" />}
            >
              Redo it assuming we only self-consume 60%, and tell me what the number is if the import
              price falls back to 21p.
            </ChatMessage>

            {/* The turn in flight. No metadata row: nothing has finished, so there is nothing to
                timestamp, and no actions to offer on half an answer. */}
            <ChatMessage sender="assistant" name="Helix" avatar={mark} label="Message from the assistant">
              <Text as="p" size="2" style={PROSE}>
                At 60% self-consumption the array covers 126,000 kWh of your own demand, so the saving
                drops to about £34,100 a year and payback moves out to roughly
              </Text>
            </ChatMessage>
          </ChatLayout>
        </Box>
      </Flex>

      <SettingsRail />
    </Flex>
  );
}

const meta: Meta = {
  title: "UI examples/AI assistant",
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

export const Screen: Story = { name: "AI assistant", render: () => <AiAssistantScreen /> };
