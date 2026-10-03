import { useState, type ReactNode } from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { Box, Flex, Grid, Theme } from "@radix-ui/themes";
import {
  BellSimple,
  BookmarkSimple,
  ClockCounterClockwise,
  CornersOut,
  DownloadSimple,
  FilmSlate,
  Flag,
  FrameCorners,
  GearSix,
  House,
  ListPlus,
  MagnifyingGlass,
  Play,
  Scissors,
  ShareFat,
  SkipForward,
  SpeakerHigh,
  ThumbsDown,
  ThumbsUp,
  VideoCamera,
} from "@phosphor-icons/react";
import { AspectRatio } from "../components/ui/AspectRatio";
import { Avatar } from "../components/ui/Avatar";
import { Badge } from "../components/ui/Badge";
import { Button } from "../components/ui/Button";
import { Carousel } from "../components/ui/Carousel";
import { Collapsible } from "../components/ui/Collapsible";
import { DropdownMenu } from "../components/ui/DropdownMenu";
import { Heading } from "../components/ui/Heading";
import { IconButton } from "../components/ui/IconButton";
import { Link } from "../components/ui/Link";
import { MoreMenu } from "../components/ui/MoreMenu";
import { Overlay } from "../components/ui/Overlay";
import { ScrollArea } from "../components/ui/ScrollArea";
import { Select } from "../components/ui/Select";
import { Separator } from "../components/ui/Separator";
import { Skeleton } from "../components/ui/Skeleton";
import { Slider } from "../components/ui/Slider";
import { Tabs } from "../components/ui/Tabs";
import { Text } from "../components/ui/Text";
import { TextField } from "../components/ui/TextField";
import { Thumbnail } from "../components/ui/Thumbnail";
import { Timestamp } from "../components/ui/Timestamp";
import { Tooltip } from "../components/ui/Tooltip";
import { TopNav } from "../components/ui/TopNav";
import { useResolvedSize } from "../theme/SizeContext";

/* Video platform — a recreation of the watch page archetype, rendered AT REST.
 *
 * Recognition is the point: a reader already knows what a watch page is, so what they are actually
 * looking at is our components carrying it — a player frame reserved by AspectRatio under a control
 * strip of real Sliders, a channel row, an action cluster, a disclosure for the description, a
 * Carousel shelf of shorts, a real comment thread, and a recommendation rail whose tiles are
 * Overlays (duration chip on the media, watch-later and queue actions in the scrim) and whose tail
 * is still loading behind Skeletons. Full-bleed, real application width, no doc-page chrome and no
 * reading measure on the app layout; the only measure here sits on the description prose, which is
 * genuine prose.
 *
 * Nothing autoplays and nothing opens: the poster frame is an inline SVG, not a <video>, the player
 * is paused, every Tooltip is closed (a closed Tooltip renders nothing at all), every hover scrim is
 * at opacity 0, and the page carries no play function. Every colour comes from a --ds-* role.
 *
 * WHAT IS STILL PINNED, AND WHY. Controls, the page title and the section heads all ride their lanes
 * now, so the page moves when the global tier does. The remaining `Text size` steps do NOT, and they
 * cannot: this page's type hierarchy is a set of RELATIVE offsets — a channel name above its
 * subscriber count, a comment handle above its body, a tile title above its view count — and the
 * system resolves exactly one text step per tier. `CONTROL_MEMBER_STEP` already encodes "one step
 * down, floored at 1" but it is internal and control-lane, so a page has no supported way to say
 * "one step below body". Stating these as absolute steps is the only route available; it is a gap,
 * not a preference. Same shape for the two avatar pins: a comment thread reads as a thread because
 * the reply disc is smaller than its parent, and Avatar exposes an absolute box, not a ramp offset.
 */

/* ---- invented imagery: inline SVG data URIs, no binary assets ------------ */

// `&` in a label is invalid XML inside the SVG payload, and an unparseable data URI renders as a
// broken image rather than failing loudly — so the label is escaped before it is encoded. The caption
// sits at 79% of the height so the player's control strip never slices through it.
const frame = (from: string, to: string, label: string) =>
  `data:image/svg+xml;utf8,${encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="640" height="360">
       <defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
         <stop offset="0" stop-color="${from}"/><stop offset="1" stop-color="${to}"/>
       </linearGradient></defs>
       <rect width="640" height="360" fill="url(#g)"/>
       <circle cx="320" cy="170" r="66" fill="rgba(255,255,255,.18)"/>
       <path d="M296 134 L296 206 L360 170 Z" fill="rgba(255,255,255,.82)"/>
       <text x="50%" y="286" font-family="sans-serif" font-size="30" fill="rgba(255,255,255,.72)"
             text-anchor="middle">${label.replace(/&/g, "&amp;")}</text>
     </svg>`,
  )}`;

const square = (from: string, to: string) =>
  `data:image/svg+xml;utf8,${encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="128" height="128">
       <defs><linearGradient id="s" x1="0" y1="0" x2="1" y2="1">
         <stop offset="0" stop-color="${from}"/><stop offset="1" stop-color="${to}"/>
       </linearGradient></defs>
       <rect width="128" height="128" fill="url(#s)"/>
     </svg>`,
  )}`;

// The shelf tiles are vertical, so they get their own 9:16 payload rather than a cover-cropped 16:9
// frame — cropping the wide one sideways would slice its caption in half.
const portrait = (from: string, to: string, label: string) =>
  `data:image/svg+xml;utf8,${encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="270" height="480">
       <defs><linearGradient id="p" x1="0" y1="0" x2="1" y2="1">
         <stop offset="0" stop-color="${from}"/><stop offset="1" stop-color="${to}"/>
       </linearGradient></defs>
       <rect width="270" height="480" fill="url(#p)"/>
       <circle cx="135" cy="220" r="44" fill="rgba(255,255,255,.18)"/>
       <path d="M119 196 L119 244 L161 220 Z" fill="rgba(255,255,255,.82)"/>
       <text x="50%" y="418" font-family="sans-serif" font-size="22" fill="rgba(255,255,255,.72)"
             text-anchor="middle">${label.replace(/&/g, "&amp;")}</text>
     </svg>`,
  )}`;

interface Recommendation {
  title: string;
  channel: string;
  views: string;
  age: string;
  duration: string;
  poster: string;
}

const rec = (
  title: string,
  channel: string,
  views: string,
  age: string,
  duration: string,
  from: string,
  to: string,
): Recommendation => ({ title, channel, views, age, duration, poster: frame(from, to, channel) });

const NEXT_UP: Recommendation[] = [
  rec("Every jig on the wall, ranked by how often it gets used", "Bench & Bracket", "412K views", "3 weeks ago", "24:18", "#5a6cff", "#9f7bff"),
  rec("Why every kitchen knife dulls the same way", "Slow Prep", "1.2M views", "5 months ago", "16:02", "#ff8a5c", "#ffc75c"),
  rec("A quiet hour of cold-water harbour footage", "North Cut", "88K views", "9 days ago", "1:04:37", "#2f9bd6", "#4fd3c4"),
  rec("Reading a spreadsheet nobody has opened since 2009", "Ledger Hours", "236K views", "2 months ago", "31:55", "#7a8798", "#b6c2cf"),
  rec("The bridge that was built twice, on purpose", "Load Path", "3.4M views", "1 year ago", "42:09", "#d6534f", "#ff9a7a"),
  rec("Field recording: a night train through the pass", "North Cut", "51K views", "6 days ago", "58:20", "#3c4a7a", "#6f86c9"),
  rec("Sharpening jigs, tested until one of them broke", "Bench & Bracket", "674K views", "7 months ago", "19:44", "#4f9d69", "#a7d96c"),
  rec("Every stamp on the back of a cast-iron pan", "Slow Prep", "129K views", "4 weeks ago", "12:31", "#a9612f", "#e0a35c"),
  // The rail now fills the watch column rather than stopping at a 720px box, and eight tiles no
  // longer reach the bottom of it — a rail that ends two thirds of the way down reads as broken
  // rather than as finished. Seventeen is also closer to what a real recommendation rail serves.
  rec("Refacing a thrust pad by hand, twice", "Bench & Bracket", "302K views", "2 weeks ago", "27:41", "#5a6cff", "#9f7bff"),
  rec("The cheapest multimeter that is still honest", "Load Path", "1.8M views", "8 months ago", "22:13", "#d6534f", "#ff9a7a"),
  rec("Forty minutes of a lathe and nothing else", "North Cut", "63K views", "12 days ago", "40:00", "#2f9bd6", "#4fd3c4"),
  rec("Why the service sheet is wrong about torque", "Ledger Hours", "187K views", "3 months ago", "15:26", "#7a8798", "#b6c2cf"),
  rec("Rewiring a tonearm without a jig", "Bench & Bracket", "521K views", "5 weeks ago", "18:52", "#4f9d69", "#a7d96c"),
  rec("A kitchen scale, calibrated against nothing", "Slow Prep", "94K views", "10 days ago", "9:47", "#ff8a5c", "#ffc75c"),
  rec("The second bridge, and why it held", "Load Path", "2.2M views", "2 years ago", "51:18", "#3c4a7a", "#6f86c9"),
  rec("Sorting a box of unlabelled shims", "Bench & Bracket", "148K views", "6 weeks ago", "13:04", "#a9612f", "#e0a35c"),
  rec("Night ferry, one microphone, no edits", "North Cut", "37K views", "4 days ago", "1:12:05", "#28304d", "#5a6cff"),
];

interface Short {
  title: string;
  views: string;
  duration: string;
  poster: string;
}

const short = (title: string, views: string, duration: string, from: string, to: string): Short => ({
  title, views, duration, poster: portrait(from, to, "Bench & Bracket"),
});

const SHORTS: Short[] = [
  short("The one clamp trick", "2.1M", "0:38", "#5a6cff", "#9f7bff"),
  short("Bearing, out in 30s", "884K", "0:29", "#ff8a5c", "#ffc75c"),
  short("Reading a spirit level", "312K", "0:47", "#2f9bd6", "#4fd3c4"),
  short("Why the plinth warped", "1.4M", "0:52", "#4f9d69", "#a7d96c"),
  short("Cheap files vs. good", "206K", "0:41", "#d6534f", "#ff9a7a"),
  short("Tonearm wire, stripped", "97K", "0:33", "#7a8798", "#b6c2cf"),
  short("Three shims, one seat", "455K", "0:26", "#a9612f", "#e0a35c"),
  short("The wobble, slowed down", "1.1M", "0:44", "#3c4a7a", "#6f86c9"),
];

const CHAPTERS = [
  { at: "0:00", label: "What the box arrived as", art: square("#5a6cff", "#9f7bff") },
  { at: "4:12", label: "Stripping the plinth", art: square("#ff8a5c", "#ffc75c") },
  { at: "11:39", label: "The bearing that was seized", art: square("#2f9bd6", "#4fd3c4") },
  { at: "18:05", label: "Rewiring the tonearm", art: square("#4f9d69", "#a7d96c") },
  { at: "26:47", label: "First play, and a wobble", art: square("#d6534f", "#ff9a7a") },
];

interface CommentNode {
  author: string;
  handle: string;
  posted: string;
  body: string;
  likes: string;
  replies?: CommentNode[];
}

const COMMENTS: CommentNode[] = [
  {
    author: "Marta Oyelaran", handle: "@bench.notes", posted: "2026-09-16T09:12:00Z", likes: "2.1K",
    body:
      "The seized bearing at 11:39 is the part nobody films. I spent two evenings on the same fault and gave up on heat entirely, so watching it come free with penetrating oil and patience was worth the whole runtime.",
    replies: [
      {
        author: "Bench & Bracket", handle: "@benchandbracket", posted: "2026-09-16T11:40:00Z", likes: "486",
        body: "Heat was where I started too. It warped the housing on the first attempt, which is why that take is not in the cut.",
      },
      {
        author: "Devon Hall", handle: "@devhall", posted: "2026-09-16T14:02:00Z", likes: "73",
        body: "Penetrating oil and a week of waiting has fixed more of my projects than any tool I own.",
      },
    ],
  },
  {
    author: "Priya Raghunathan", handle: "@pr.workshop", posted: "2026-09-15T19:48:00Z", likes: "914",
    body:
      "Chapter markers on a 34 minute repair video should be mandatory. I came back three times and landed exactly where I left off each time.",
  },
  {
    author: "Tomasz Wierzbicki", handle: "@tomw", posted: "2026-09-14T08:30:00Z", likes: "355",
    body:
      "Small correction: the platter mat shown at 26:47 is the later reissue, not the original cork. Does not change the result, but the originals are thinner and the tracking force needs a nudge.",
  },
];

/* ---- regions -------------------------------------------------------------- */

/* Every section head on this page is an h3 PEER — the comments header, the shorts shelf, the rail.
 * They are headings inside page chrome, not page titles, so they ride the chromeHeading lane ([[chrome-heading-lane]]):
 * 14 / 16 / 18px across the tiers, one step above body. The page `heading` lane would put them at
 * 20 / 24 / 28 — level with the video title two blocks up — and an absolute pin (they were size="4"
 * and size="3", which also disagreed with each other for no reason) freezes them off the tier
 * entirely. One helper, so the three cannot drift apart again.
 */
function SectionHeading({ children }: { children: ReactNode }) {
  const size = useResolvedSize<"2" | "3" | "4">("chromeHeading", undefined);
  return (
    <Heading as="h3" size={size}>
      {children}
    </Heading>
  );
}

function WatchNav() {
  return (
    <TopNav
      aria-label="Primary"
      center={
        <Box style={{ width: "clamp(180px, 30vw, 560px)" }}>
          <TextField aria-label="Search videos" placeholder="Search videos, channels and playlists" defaultValue="">
            <TextField.Slot><MagnifyingGlass aria-hidden /></TextField.Slot>
          </TextField>
        </Box>
      }
      end={
        <Flex align="center" gap="2">
          <Tooltip content="Upload a video">
            <IconButton priority="tertiary" aria-label="Upload a video"><VideoCamera aria-hidden /></IconButton>
          </Tooltip>
          <Tooltip content="Notifications">
            <IconButton priority="tertiary" aria-label="Notifications, 3 unread"><BellSimple aria-hidden /></IconButton>
          </Tooltip>
          {/* UNPINNED (was size={30}). A raw px box froze the account avatar while every other control
              in the bar rode the tier, which is half of what made the header read as "stuck". Unset it
              follows the avatar lane: 16 at small · 20 at medium · 24 at large. */}
          <Avatar src={square("#6f86c9", "#b6c2cf")} alt="" fallback="AK" />
        </Flex>
      }
    >
      <TopNav.Heading href="#home" logo={<FilmSlate aria-hidden />}>Watch</TopNav.Heading>
      <TopNav.Item label="Home" icon={<House aria-hidden />} href="#home" />
      <TopNav.Item label="Subscriptions" href="#subscriptions" isSelected />
    </TopNav>
  );
}

/* The player is PAUSED, which is why its chrome is drawn rather than hidden: a paused player shows its
 * scrub bar, its volume and its transport. Both bars are real Sliders sitting at a resting position —
 * they are the components this chrome is made of, not a picture of them.
 *
 * THE STRIP IS A SCRIM, NOT A PANEL. It used to paint --ds-bg-overlay, which is an OPAQUE panel token
 * (#fff in light, --gray-3 in dark): over real footage it would hide the frame outright, and in the
 * light appearance it read as a white toolbar bolted under the video rather than chrome floating on
 * it. Real player chrome is a translucent gradient over the picture, so this paints --ds-scrim — a
 * BLACK alpha at 0.60, identical in both appearances since [[scrim-value]] — fading up out of the bottom edge.
 * The frame shows through the whole strip and the fade band has no edge to read as a bar.
 *
 * AND THE CHROME IS PERMANENTLY DARK. A scrim is a dark veil in BOTH app modes, so controls standing
 * on it cannot take the app's own scale: in light the Slider's surface track and the secondary
 * IconButton skin are near-white chips, in dark they are near-black ones, and one of those two is
 * always wrong on a dark veil. The system already answers exactly this — Thumbnail's remove-✕ and the
 * Lightbox stage both pin a dark <Theme> around their scrim surface — so the chrome reuses that idiom
 * and reads identically light-on-dark in either appearance. Text takes --ds-on-scrim, the ink [[scrim-foreground-tokens]]
 * certifies for a scrim (5.74:1 worst case: white media under the 0.60 veil).
 *
 * The strip is still NOT an Overlay: Overlay's scrim covers the whole media (inset: 0) and reveals on
 * hover, and a hero player wants persistent chrome over an undimmed frame. Overlay carries the rail
 * tiles below, where the hover reveal IS the behaviour.
 *
 * NOTHING HERE IS SIZE-PINNED ANY MORE. Every control carried size="1", which is why the player did
 * not move when the global tier did. Unset, the two Sliders, the six IconButtons and the timecode all
 * ride the control / text lanes.
 */

/* The fade band. The gradient reaches FULL scrim exactly where the strip's top padding ends, so every
 * control below it stands on the certified 0.60 veil and only the dead band above it is translucent —
 * one token drives both the padding and the gradient stop, so they cannot drift apart. */
const CHROME_FADE = "var(--ds-space-48)";

function PlayerChrome() {
  return (
    <Theme
      appearance="dark"
      hasBackground={false}
      style={{ position: "absolute", insetInline: 0, bottom: 0 }}
    >
      <Flex
        direction="column"
        gap="2"
        style={{
          paddingBlockStart: CHROME_FADE,
          paddingBlockEnd: "var(--ds-space-12)",
          paddingInline: "var(--ds-space-12)",
          background: `linear-gradient(to bottom, transparent, var(--ds-scrim) ${CHROME_FADE})`,
          color: "var(--ds-on-scrim)",
        }}
      >
        <Slider aria-label="Seek through the video" defaultValue={[37]} />
        <Flex align="center" justify="between" gap="3" wrap="wrap">
          <Flex align="center" gap="2">
            <Tooltip content="Play">
              <IconButton priority="secondary" aria-label="Play"><Play weight="fill" aria-hidden /></IconButton>
            </Tooltip>
            <Tooltip content="Next video">
              <IconButton priority="secondary" aria-label="Next video"><SkipForward weight="fill" aria-hidden /></IconButton>
            </Tooltip>
            <Tooltip content="Mute">
              <IconButton priority="secondary" aria-label="Mute"><SpeakerHigh aria-hidden /></IconButton>
            </Tooltip>
            {/* The volume bar has no natural content width, so it is stated in `em` — the one length on
                this page that tracks the tier, since the strip's font-size IS the global body size
                (14 / 16 / 18px → 84 / 96 / 108px). A px width would freeze it beside controls that grow. */}
            <Box style={{ width: "6em" }}>
              <Slider aria-label="Volume" defaultValue={[68]} />
            </Box>
            <Text style={{ fontVariantNumeric: "tabular-nums" }}>12:47 / 34:06</Text>
          </Flex>
          <Flex align="center" gap="2">
            <Tooltip content="Playback settings">
              <IconButton priority="secondary" aria-label="Playback settings"><GearSix aria-hidden /></IconButton>
            </Tooltip>
            <Tooltip content="Theatre mode">
              <IconButton priority="secondary" aria-label="Theatre mode"><FrameCorners aria-hidden /></IconButton>
            </Tooltip>
            <Tooltip content="Full screen">
              <IconButton priority="secondary" aria-label="Full screen"><CornersOut aria-hidden /></IconButton>
            </Tooltip>
          </Flex>
        </Flex>
      </Flex>
    </Theme>
  );
}

function Player() {
  return (
    <Box style={{ position: "relative", overflow: "hidden", borderRadius: "var(--ds-radius-4)", background: "var(--ds-bg-sunken)" }}>
      <AspectRatio ratio={16 / 9}>
        <img
          src={frame("#28304d", "#5a6cff", "Bench & Bracket")}
          alt="Poster frame: a stripped turntable plinth on a workbench"
          style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
        />
      </AspectRatio>
      <PlayerChrome />
    </Box>
  );
}

function ChannelRow() {
  return (
    <Flex align="center" justify="between" wrap="wrap" gap="4">
      <Flex align="center" gap="3">
        <Avatar size={40} src={square("#5a6cff", "#9f7bff")} alt="" fallback="BB" />
        <Box>
          <Text as="div" size="3" weight="medium">Bench &amp; Bracket</Text>
          <Text as="div" size="2" style={{ color: "var(--ds-text-weak)" }}>412K subscribers</Text>
        </Box>
        <Button priority="primary">Subscribe</Button>
      </Flex>

      <Flex align="center" gap="2" wrap="wrap">
        <Flex align="center" gap="1">
          <Button priority="secondary"><ThumbsUp aria-hidden /> 38K</Button>
          <Tooltip content="Dislike">
            <IconButton priority="secondary" aria-label="Dislike this video"><ThumbsDown aria-hidden /></IconButton>
          </Tooltip>
        </Flex>
        <Button priority="secondary"><ShareFat aria-hidden /> Share</Button>
        <Button priority="secondary"><BookmarkSimple aria-hidden /> Save</Button>
        <MoreMenu label="More actions for this video" contentProps={{ align: "end" }}>
          <DropdownMenu.Item><ListPlus aria-hidden /> Add to playlist</DropdownMenu.Item>
          <DropdownMenu.Item><DownloadSimple aria-hidden /> Download</DropdownMenu.Item>
          <DropdownMenu.Item><Scissors aria-hidden /> Clip</DropdownMenu.Item>
          <DropdownMenu.Separator />
          <DropdownMenu.Item tone="danger"><Flag aria-hidden /> Report</DropdownMenu.Item>
        </MoreMenu>
      </Flex>
    </Flex>
  );
}

function Description() {
  // The disclosure label is the one piece of state on this page: a trigger that still reads "Show
  // more" while its content is open contradicts itself. It starts CLOSED, so the page is at rest.
  const [isOpen, setIsOpen] = useState(false);
  return (
    <Box style={{ background: "var(--ds-bg-subtle)", borderRadius: "var(--ds-radius-3)", padding: "var(--ds-space-16)" }}>
      <Flex align="center" gap="3" wrap="wrap" mb="2">
        <Text size="2" weight="medium">1,284,901 views</Text>
        <Timestamp value="2026-09-13T16:00:00Z" size="2" />
        <Badge>Restoration</Badge>
        <Badge>34 min</Badge>
      </Flex>

      {/* THE DESCRIPTION KEEPS ITS MEASURE. This is the long-form prose on the page — a synopsis plus
          two paragraphs of production notes behind the disclosure — and sustained reading is exactly
          what --ds-text-measure exists for. It is the other half of the judgement made on the comment
          bodies (see Comment below): prose holds the measure, a short utterance conforms to its
          container. The measure is guidance, not a law to apply uniformly. */}
      <Text as="p" size="2" style={{ maxWidth: "var(--ds-text-measure)" }}>
        A crate of turntable parts, one seized main bearing, and a plinth that had been painted over
        twice. Full teardown, the two repairs that failed, and the measurement that finally explained
        the wobble.
      </Text>

      <Box mt="2">
        <Collapsible
          open={isOpen}
          onOpenChange={setIsOpen}
          trigger={<Text size="2" weight="medium">{isOpen ? "Show less" : "Show more"}</Text>}
        >
          <Flex direction="column" gap="3" pt="2">
            <Text as="p" size="2" style={{ maxWidth: "var(--ds-text-measure)" }}>
              Tools and parts are listed in the order they appear. The replacement thrust pad is a
              generic 8mm sintered bronze part, not a service item, so the seat needs facing before
              it will sit flat. Torque figures are in the pinned comment because two viewers measured
              lower values than the service sheet claims.
            </Text>
            <Text as="p" size="2" style={{ maxWidth: "var(--ds-text-measure)" }}>
              Recorded over four evenings in a garage workshop. Audio is a single shotgun mic, which
              is why the drill sounds louder than it was.
            </Text>

            <Separator size="4" />

            <Text as="div" size="2" weight="medium">Chapters</Text>
            <Flex direction="column" gap="2">
              {CHAPTERS.map((chapter) => (
                <Flex key={chapter.at} align="center" gap="3">
                  <Thumbnail src={chapter.art} alt="" label={chapter.label} />
                  <Box>
                    <Link href={`#t=${chapter.at}`} size="2">{chapter.at}</Link>
                    <Text as="div" size="2" style={{ color: "var(--ds-text-weak)" }}>{chapter.label}</Text>
                  </Box>
                </Flex>
              ))}
            </Flex>
          </Flex>
        </Collapsible>
      </Box>
    </Box>
  );
}

function Comment({ comment, isReply = false }: { comment: CommentNode; isReply?: boolean }) {
  return (
    <Flex gap="3" align="start">
      {/* PINNED, deliberately. The parent/reply hierarchy IS the size difference, and Avatar exposes
          no tier-relative ramp — only an absolute box — so a thread that reads as a thread can only
          be stated in absolute steps here. See the report note on tier-relative type. */}
      <Avatar size={isReply ? 24 : 36} src={square("#7a8798", "#b6c2cf")} alt="" fallback={comment.author.slice(0, 1)} />
      <Box style={{ flex: 1, minWidth: 0 }}>
        <Flex align="center" gap="2" wrap="wrap">
          <Text size="2" weight="medium">{comment.handle}</Text>
          <Timestamp value={comment.posted} size="1" />
        </Flex>
        {/* A COMMENT BODY FILLS ITS COLUMN. It used to carry --ds-text-measure, which is the wrong
            call here: these are two or three sentences in an already-narrow, avatar-indented column
            that is close to the measure to begin with, so capping it again only opened a ragged
            gutter inside a box that was never too wide. Optimal measure is a judgement, not a rule —
            longer-form reading holds it (the description above), a short utterance conforms to the
            container it was posted into. */}
        <Text as="p" size="2" mt="1">{comment.body}</Text>
        {/* UNPINNED (was size="1" on all three). The comment action row is a control cluster like any
            other; unset it rides the control lane (1/2/3) with the rest of the page. */}
        <Flex align="center" gap="2" mt="1">
          <Button priority="tertiary"><ThumbsUp aria-hidden /> {comment.likes}</Button>
          <IconButton priority="tertiary" aria-label={`Dislike the comment by ${comment.author}`}>
            <ThumbsDown aria-hidden />
          </IconButton>
          <Button priority="tertiary">Reply</Button>
        </Flex>
        {comment.replies != null && (
          <Flex direction="column" gap="3" mt="3">
            {comment.replies.map((reply) => (
              <Comment key={reply.handle} comment={reply} isReply />
            ))}
          </Flex>
        )}
      </Box>
    </Flex>
  );
}

function Comments() {
  return (
    <Flex direction="column" gap="4">
      <Flex align="center" justify="between" wrap="wrap" gap="3">
        <SectionHeading>428 comments</SectionHeading>
        <Select defaultValue="top">
          <Select.Trigger aria-label="Sort comments" />
          <Select.Content>
            <Select.Item value="top">Top comments</Select.Item>
            <Select.Item value="newest">Newest first</Select.Item>
            <Select.Item value="oldest">Oldest first</Select.Item>
          </Select.Content>
        </Select>
      </Flex>

      <Flex gap="3" align="center">
        {/* PINNED to the top-level comment box. The composer is the reader's own turn at the head of
            the same thread, so its avatar has to match the comment avatars beneath it; unset it would
            drop to the avatar lane (16 at small) and sit visibly smaller than the replies it leads. */}
        <Avatar size={36} src={square("#6f86c9", "#b6c2cf")} alt="" fallback="AK" />
        <Box style={{ flex: 1 }}>
          <TextField aria-label="Add a comment" placeholder="Add a comment" defaultValue="" />
        </Box>
      </Flex>

      <Flex direction="column" gap="5">
        {COMMENTS.map((comment) => (
          <Comment key={comment.handle} comment={comment} />
        ))}
      </Flex>

      <Box>
        <Button priority="tertiary">Show more comments</Button>
      </Box>
    </Flex>
  );
}

/* The shelf every video platform runs under the player: short vertical clips from the same channel,
 * scrolled horizontally rather than wrapped. That is a Carousel — a scroll track, not a slideshow —
 * so it snaps its tiles and fades the edge that still has content behind it.
 */
function ShortsShelf() {
  return (
    <Flex direction="column" gap="3" asChild>
      <section aria-label="Shorts from Bench and Bracket">
        <SectionHeading>Shorts from Bench &amp; Bracket</SectionHeading>
        <Carousel aria-label="Shorts from Bench and Bracket" gap={3} hasSnap>
          {SHORTS.map((clip) => (
            <Box key={clip.title} style={{ width: 148 }}>
              <Box style={{ position: "relative", overflow: "hidden", borderRadius: "var(--ds-radius-3)" }}>
                <AspectRatio ratio={9 / 16}>
                  <img src={clip.poster} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
                </AspectRatio>
                <Box
                  style={{
                    position: "absolute",
                    right: "var(--ds-space-4)",
                    bottom: "var(--ds-space-4)",
                    background: "var(--ds-bg-base)",
                    borderRadius: "var(--ds-radius-full)",
                  }}
                >
                  <Badge size="1">{clip.duration}</Badge>
                </Box>
              </Box>
              <Text as="div" size="1" weight="medium" mt="2">{clip.title}</Text>
              <Text as="div" size="1" style={{ color: "var(--ds-text-weak)" }}>{clip.views} views</Text>
            </Box>
          ))}
        </Carousel>
      </section>
    </Flex>
  );
}

/* The tile's thumbnail is an Overlay: the duration chip rides with the media, and the watch-later /
 * queue actions live in the scrim, revealed on hover or keyboard focus. At rest the scrim is
 * invisible — but its actions stay in the tab order, which is the component's whole contract.
 */
function RailItem({ item }: { item: Recommendation }) {
  return (
    <Flex gap="3" align="start">
      <Overlay
        position="bottom"
        style={{ width: 168, flexShrink: 0 }}
        media={
          <Box style={{ position: "relative" }}>
            <AspectRatio ratio={16 / 9}>
              <img src={item.poster} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
            </AspectRatio>
            <Box
              style={{
                position: "absolute",
                right: "var(--ds-space-4)",
                bottom: "var(--ds-space-4)",
                background: "var(--ds-bg-base)",
                borderRadius: "var(--ds-radius-full)",
              }}
            >
              <Badge size="1">{item.duration}</Badge>
            </Box>
          </Box>
        }
      >
        {/* PINNED, and the tile is the reason. The thumbnail is a fixed 168×94 box, so the chip and
            the two scrim actions have to fit THAT, not the ambient tier: unset, the icon buttons
            climb to 40px at the large tier and two of them plus their gap overrun a 94px-tall scrim.
            The duration chip above is pinned for the same reason. A tile that resized with the tier
            would be the honest fix, and it is a rail-layout change, not a size-lane one. */}
        <Flex align="center" justify="end" gap="1" width="100%">
          <Tooltip content="Watch later">
            <IconButton priority="secondary" size="1" aria-label={`Save ${item.title} to watch later`}>
              <ClockCounterClockwise aria-hidden />
            </IconButton>
          </Tooltip>
          <Tooltip content="Add to queue">
            <IconButton priority="secondary" size="1" aria-label={`Add ${item.title} to the queue`}>
              <ListPlus aria-hidden />
            </IconButton>
          </Tooltip>
        </Flex>
      </Overlay>
      <Box style={{ minWidth: 0 }}>
        <Text as="div" size="2" weight="medium">{item.title}</Text>
        <Text as="div" size="1" style={{ color: "var(--ds-text-weak)" }}>{item.channel}</Text>
        <Text as="div" size="1" style={{ color: "var(--ds-text-weak)" }}>
          {item.views} · {item.age}
        </Text>
      </Box>
    </Flex>
  );
}

/* The tail of the rail is still fetching. Each placeholder is sized to the tile it will become — the
 * thumbnail block to the tile's own 168×94, the two text lines by standing in for real Text nodes — so
 * nothing shifts when the recommendations land.
 */
function RailItemLoading() {
  return (
    <Flex gap="3" align="start">
      <Skeleton width="168px" height="94px" style={{ borderRadius: "var(--ds-radius-3)", flexShrink: 0 }} />
      <Box style={{ minWidth: 0, flex: 1 }}>
        <Skeleton>
          <Text as="div" size="2" weight="medium">Loading a recommended video title</Text>
        </Skeleton>
        <Box mt="1">
          <Skeleton>
            <Text as="div" size="1">Channel name</Text>
          </Skeleton>
        </Box>
      </Box>
    </Flex>
  );
}

function Rail() {
  return (
    <Flex direction="column" gap="3" asChild>
      <aside aria-label="Next up">
        <SectionHeading>Next up</SectionHeading>
        <Tabs.Nav aria-label="Recommendation filters">
          <Tabs.Nav.Link href="#all" active>All</Tabs.Nav.Link>
          <Tabs.Nav.Link href="#channel">From this channel</Tabs.Nav.Link>
          <Tabs.Nav.Link href="#recent">Recently uploaded</Tabs.Nav.Link>
        </Tabs.Nav>
        {/* FILL THE COLUMN. The rail used to stop at a flat `maxHeight: 720` while the watch column
            beside it ran to ~1920, so the list was sliced mid-tile under a scrollbar with a thousand
            pixels of empty aside below it. The Grid no longer pins its items to the start, so the
            aside stretches to the row, and the ScrollArea takes whatever the heading and the filter
            tabs leave.

            `flex-basis: 0` is what keeps this from going circular: with a zero basis the rail
            contributes nothing to the row's own height, so it fills the watch column instead of
            stretching it. That is only right where there IS a taller sibling — in the single-column
            layout a zero basis would collapse the rail to nothing, so the floor is responsive:
            `max-content` below lg (the rail sizes to its list and flows with the page), `0` from lg
            up (the rail takes the column and scrolls the surplus). */}
        <Box asChild minHeight={{ initial: "max-content", lg: "0" }}>
          <ScrollArea type="hover" scrollbars="vertical" style={{ flex: "1 1 0" }}>
            <Flex direction="column" gap="4" pr="3">
              {NEXT_UP.map((item) => (
                <RailItem key={item.title} item={item} />
              ))}
              <RailItemLoading />
              <RailItemLoading />
            </Flex>
          </ScrollArea>
        </Box>
      </aside>
    </Flex>
  );
}

function WatchPage() {
  return (
    <Box style={{ minHeight: "100vh", background: "var(--ds-bg-base)" }}>
      <WatchNav />
      <Grid columns={{ initial: "1", lg: "minmax(0, 1fr) 420px" }} gap="6" p="5" asChild>
        <main>
          <Flex direction="column" gap="4" style={{ minWidth: 0 }}>
            <Player />
            {/* UNPINNED (was size="6"). This IS the page title, so the page heading ladder is the
                right one: 20 / 24 / 28 across the tiers. The section heads below ride chromeHeading
                instead ([[chrome-heading-lane]]) — they are chrome, not titles. */}
            <Heading as="h2">Rebuilding a 1962 turntable from a box of parts</Heading>
            <ChannelRow />
            <Description />
            <ShortsShelf />
            <Separator size="4" />
            <Comments />
          </Flex>
          <Rail />
        </main>
      </Grid>
    </Box>
  );
}

const meta: Meta = {
  title: "UI examples/Video platform",
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

export const Screen: Story = { name: "Video platform", render: () => <WatchPage /> };
