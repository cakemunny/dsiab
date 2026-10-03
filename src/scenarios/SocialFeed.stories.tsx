import { useState, type ReactNode } from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { Box, Flex } from "@radix-ui/themes";
import {
  ArrowsOut, Bell, BookmarkSimple, ChartBarHorizontal, ChatCircle, Compass, EnvelopeSimple, Export,
  Flag, Gif, Hash, Heart, House, ImageSquare, MagnifyingGlass, MapPin, PencilSimple, Prohibit,
  Repeat, SealCheck, Smiley, SpeakerSlash, TrendUp, UserCircle,
} from "@phosphor-icons/react";
import { SideNav } from "../components/ui/SideNav";
import { Button } from "../components/ui/Button";
import { IconButton } from "../components/ui/IconButton";
import { Avatar } from "../components/ui/Avatar";
import { AvatarGroup } from "../components/ui/AvatarGroup";
import { Badge } from "../components/ui/Badge";
import { Card } from "../components/ui/Card";
import { ClickableCard } from "../components/ui/ClickableCard";
import { Text } from "../components/ui/Text";
import { Heading, type HeadingProps } from "../components/ui/Heading";
import { Link } from "../components/ui/Link";
import { List, ListItem } from "../components/ui/List";
import { Separator } from "../components/ui/Separator";
import { Timestamp } from "../components/ui/Timestamp";
import { MoreMenu } from "../components/ui/MoreMenu";
import { DropdownMenu } from "../components/ui/DropdownMenu";
import { HoverCard } from "../components/ui/HoverCard";
import { TextArea } from "../components/ui/TextArea";
import { TextField } from "../components/ui/TextField";
import { Progress } from "../components/ui/Progress";
import { RadioCards } from "../components/ui/RadioCards";
import { AspectRatio } from "../components/ui/AspectRatio";
import { ScrollArea } from "../components/ui/ScrollArea";
import { SegmentedControl } from "../components/ui/SegmentedControl";
import { Lightbox } from "../components/ui/Lightbox";
import { OverflowList } from "../components/ui/OverflowList";
import { Skeleton } from "../components/ui/Skeleton";
import { Token } from "../components/ui/Token";
import { Tooltip } from "../components/ui/Tooltip";
import { useResolvedSize } from "../theme/SizeContext";

/* Social feed — a generic recreation of the three-column feed archetype, rendered AT REST.
 *
 * Recognition is the point: nobody needs the layout explained, so every component in it is being read
 * against an interface the reader already has an opinion about. The screen is full-bleed at real
 * application width — the only reading measure on it sits on post BODY prose, never on the shell. */

const NOW = Date.now();
const hoursAgo = (n: number) => NOW - n * 3_600_000;

/** Inline SVG stand-in for a photograph — no binary asset, no network request. */
const RIDGE = [{
  src: `data:image/svg+xml;utf8,${encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="960" height="540">
       <defs><linearGradient id="g" x1="0" y1="1" x2="1" y2="0">
         <stop offset="0" stop-color="#f0a35e"/><stop offset="1" stop-color="#8f5bd6"/></linearGradient></defs>
       <rect width="960" height="540" fill="url(#g)"/>
       <circle cx="760" cy="140" r="78" fill="rgba(255,255,255,.35)"/>
       <path d="M0 420 L240 286 L430 400 L660 250 L960 430 L960 540 L0 540 Z" fill="rgba(0,0,0,.24)"/>
       <text x="40" y="500" font-family="sans-serif" font-size="30" fill="rgba(255,255,255,.85)">Ridge trail, 05:41</text>
     </svg>`,
  )}`,
  alt: "Sunrise over a mountain ridge",
  caption: "Ridge trail, 05:41 — twenty minutes before the cloud came back in.",
}];

interface Author {
  name: string; handle: string; initials: string; bio: string; followers: string; isVerified?: boolean;
}

/** The blue tick, aria-named because colour and shape alone say nothing to a screen reader. */
function VerifiedMark() {
  return (
    <Box asChild aria-label="Verified account" style={{ color: "var(--ds-icon-info)", display: "flex" }}>
      <span><SealCheck weight="fill" /></span>
    </Box>
  );
}

const PRIYA: Author = { name: "Priya Raghunathan", handle: "@praghu", initials: "PR", followers: "18.4K",
  bio: "Build engineer. I delete more than I write. Opinions are load-bearing.", isVerified: true };
const MARCUS: Author = { name: "Marcus Oyelaran", handle: "@moyelaran", initials: "MO", followers: "6,210",
  bio: "Photographs mountains before work. Sometimes ships firmware." };
const DANI: Author = { name: "Dani Feldkamp", handle: "@dfeldkamp", initials: "DF", followers: "42.9K",
  bio: "Distributed systems, badly explained, on purpose.", isVerified: true };
const TOMO: Author = { name: "Tomo Ishikawa", handle: "@tomoishi", initials: "TI", followers: "3,884",
  bio: "Compilers, coffee, and one unresolved argument about whitespace." };
const RENATA: Author = { name: "Renata Silveira", handle: "@rsilveira", initials: "RS", followers: "11.2K",
  bio: "Infrastructure archaeologist. Ask me about the 2019 outage." };
const CALLUM: Author = { name: "Callum Whitfield", handle: "@cwhitfield", initials: "CW", followers: "902",
  bio: "Writes runbooks nobody reads until 03:00." };
const ASHA: Author = { name: "Asha Berhane", handle: "@aberhane", initials: "AB", followers: "27.6K",
  bio: "Type design, kerning crimes, and the occasional font release.", isVerified: true };

/* ---- author name + its (closed) profile preview ------------------------------------------------ */

function AuthorName({ author }: { author: Author }) {
  return (
    <HoverCard.Root>
      <HoverCard.Trigger>
        {/* Link carries NO size lane of its own (Link.tsx: "`size` is left unset so an inline link
            inherits the surrounding text size"), and its parent here is a bare Flex, so an unsized
            Link would inherit the 16px document root at every tier. `Text asChild` is the system's
            own idiom for that — Timestamp.tsx does exactly this — and it puts the name back on the
            text lane beside the handle. */}
        <Text asChild weight="bold">
          <Link href="#profile" underline="none" style={{ color: "var(--ds-text-strong)" }}>
            {author.name}
          </Link>
        </Text>
      </HoverCard.Trigger>
      <HoverCard.Content style={{ maxWidth: 300 }}>
        <Flex direction="column" gap="2">
          <Flex align="start" justify="between" gap="3">
            <Avatar size={40} fallback={author.initials} />
            <Button>Follow</Button>
          </Flex>
          <Box>
            <Text weight="bold" as="div">{author.name}</Text>
            <Text as="div" style={{ color: "var(--ds-text-weak)" }}>{author.handle}</Text>
          </Box>
          <Text>{author.bio}</Text>
          <Flex gap="4" style={{ color: "var(--ds-text-weak)" }}>
            <Text><strong>{author.followers}</strong> followers</Text>
            <Text><strong>318</strong> following</Text>
          </Flex>
        </Flex>
      </HoverCard.Content>
    </HoverCard.Root>
  );
}

/* The identity row a post leads with: who wrote it, whether they are verified, and when. Extracted
 * so the top-level post and the quoted post inside one cannot drift apart, because "a quoted post
 * leads with its author exactly as a top-level post does" has to be true in the code and not only
 * in the comment below. */
function Identity({ author, at }: { author: Author; at: number }) {
  return (
    <Flex align="center" gap="2" wrap="wrap" style={{ minWidth: 0 }}>
      <AuthorName author={author} />
      {author.isVerified && <VerifiedMark />}
      <Text style={{ color: "var(--ds-text-weak)" }}>{author.handle}</Text>
      <Text aria-hidden style={{ color: "var(--ds-text-weak)" }}>·</Text>
      <Timestamp value={at} format="relative" />
    </Flex>
  );
}

/* ---- the action row ----------------------------------------------------------------------------- */

function Action({ icon, label, hint, count }: { icon: ReactNode; label: string; hint: string; count?: string }) {
  return (
    <Flex align="center" gap="1">
      {/* The hint every feed puts on these five glyphs. Wired and CLOSED — nothing here is hovered.
          NO `size` on either half: the control lane and the text lane resolve to the SAME step at
          every tier (SizeContext.LANE_STEPS), which is the whole reason a button and the number
          beside it may never be pinned apart. Pinned at "1" these stayed a 24px button and 12px
          count at uiSize large, where everything around them had grown. */}
      <Tooltip content={hint}>
        <IconButton priority="tertiary" aria-label={label}>{icon}</IconButton>
      </Tooltip>
      {count != null && <Text style={{ color: "var(--ds-text-weak)" }}>{count}</Text>}
    </Flex>
  );
}

function ActionRow({ replies, reposts, likes }: { replies: string; reposts: string; likes: string }) {
  return (
    <Flex align="center" gap="5" pt="1">
      <Action icon={<ChatCircle />} label="Reply" hint="Reply to this post" count={replies} />
      <Action icon={<Repeat />} label="Repost" hint="Repost, or repost with a comment" count={reposts} />
      <Action icon={<Heart />} label="Like" hint="Like this post" count={likes} />
      <Action icon={<BookmarkSimple />} label="Save" hint="Save to your bookmarks" />
      <Action icon={<Export />} label="Share" hint="Copy a link, or send it on" />
    </Flex>
  );
}

/* ---- one post ----------------------------------------------------------------------------------- */

interface PostProps {
  author: Author; at: number; banner?: ReactNode; children: ReactNode;
  replies: string; reposts: string; likes: string; indent?: boolean;
}

function Post({ author, at, banner, children, replies, reposts, likes, indent }: PostProps) {
  return (
    <Box px="5" py="4" style={{ borderBottom: indent ? undefined : "1px solid var(--ds-stroke-weak)" }}>
      {banner}
      <Flex gap="3" align="start">
        {/* A raw px box, deliberately: the avatar column is this archetype's fixed 40px gutter, and
            every skeleton, thread spine and banner indent on the page is measured off it. The
            avatar lane (16/20/24) is the beside-text ramp and would put a portrait in it. */}
        <Avatar size={40} fallback={author.initials} />
        <Flex direction="column" gap="2" style={{ flex: 1, minWidth: 0 }}>
          <Flex align="center" justify="between" gap="3">
            <Identity author={author} at={at} />
            <MoreMenu label={`More actions for the post by ${author.name}`} contentProps={{ align: "end" }}>
              <DropdownMenu.Item>Not interested in this</DropdownMenu.Item>
              <DropdownMenu.Item>Add to a list</DropdownMenu.Item>
              <DropdownMenu.Item>Copy link to post</DropdownMenu.Item>
              <DropdownMenu.Separator />
              <DropdownMenu.Item><SpeakerSlash /> Mute {author.handle}</DropdownMenu.Item>
              <DropdownMenu.Item tone="danger"><Prohibit /> Block {author.handle}</DropdownMenu.Item>
              <DropdownMenu.Item tone="danger"><Flag /> Report post</DropdownMenu.Item>
            </MoreMenu>
          </Flex>
          {children}
          <ActionRow replies={replies} reposts={reposts} likes={likes} />
        </Flex>
      </Flex>
    </Box>
  );
}

/** Post prose — the ONE place a reading measure belongs on this screen. */
function Body({ children }: { children: ReactNode }) {
  return <Text as="p" style={{ maxWidth: "var(--ds-text-measure)", margin: 0 }}>{children}</Text>;
}

/* ---- the composer ------------------------------------------------------------------------------- */

const DRAFT =
  "Spent the morning tracing a 400ms regression to a cache key that quietly stopped including the locale.";

function Composer() {
  const used = DRAFT.length;
  return (
    <Box px="5" py="4" style={{ borderBottom: "1px solid var(--ds-stroke-weak)" }}>
      <Flex gap="3" align="start">
        <Avatar size={40} fallback="JL" />
        <Flex direction="column" gap="3" style={{ flex: 1, minWidth: 0 }}>
          <TextArea aria-label="Write a post" rows={2} defaultValue={DRAFT} placeholder="What's happening?" />
          <Flex align="center" justify="between" gap="3" wrap="wrap">
            <Flex align="center" gap="1">
              <Tooltip content="Add an image"><IconButton priority="tertiary" aria-label="Add an image"><ImageSquare /></IconButton></Tooltip>
              <Tooltip content="Add an animation"><IconButton priority="tertiary" aria-label="Add an animation"><Gif /></IconButton></Tooltip>
              <Tooltip content="Add a poll"><IconButton priority="tertiary" aria-label="Add a poll"><ChartBarHorizontal /></IconButton></Tooltip>
              <Tooltip content="Add an emoji"><IconButton priority="tertiary" aria-label="Add an emoji"><Smiley /></IconButton></Tooltip>
              <Tooltip content="Tag a location"><IconButton priority="tertiary" aria-label="Tag a location"><MapPin /></IconButton></Tooltip>
            </Flex>
            <Flex align="center" gap="3">
              <Box style={{ width: 84 }}>
                <Progress value={used} max={280} aria-label={`${used} of 280 characters used`} />
              </Box>
              <Text style={{ color: "var(--ds-text-weak)" }}>{280 - used} left</Text>
              <Button priority="primary">Post</Button>
            </Flex>
          </Flex>
        </Flex>
      </Flex>
    </Box>
  );
}

/* ---- the six posts ------------------------------------------------------------------------------ */

function MediaPost() {
  // The viewer is in the tree and CLOSED: the page renders at rest, so nothing has pressed Expand.
  const [isViewerOpen, setViewerOpen] = useState(false);
  return (
    <Post author={MARCUS} at={hoursAgo(3)} replies="34" reposts="96" likes="1,208">
      <Body>Left the car at 04:10 for this. Worth every minute of the climb.</Body>
      {/* TWO SMALL ACTIONS DO NOT EARN A FULL-IMAGE SCRIM. This rode an `Overlay`, which dimmed the
          entire 758×426 photograph on hover to reveal a 24px expand and a 24px save in one corner —
          a 323,000px² veil for 1,150px² of controls, and the reveal itself was the only reason the
          actions were ever hidden. Overlay has no prop for either alternative (no `scrim="none"`, no
          corner-confined gradient, and `position` offers fill/bottom/top with no corner), so the
          scrim is dropped rather than fought: the actions sit permanently on their own small pill in
          the corner they occupy. The pill is opaque (--ds-bg-raised), so the glyphs hold over any
          photograph without tinting it, and nothing has to hover or focus to find them.
          The frame — radius, clipping, border — moves onto this Box, which owned it before. */}
      <Box
        style={{
          position: "relative",
          overflow: "hidden",
          borderRadius: "var(--ds-radius-3)",
          border: "1px solid var(--ds-stroke-weak)",
        }}
      >
        <AspectRatio ratio={16 / 9}>
          <img src={RIDGE[0].src} alt={RIDGE[0].alt} style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
        </AspectRatio>
        <Flex
          align="center"
          gap="1"
          style={{
            position: "absolute",
            top: "var(--ds-space-8)",
            right: "var(--ds-space-8)",
            padding: "var(--ds-space-4)",
            borderRadius: "var(--ds-radius-full)",
            background: "var(--ds-bg-raised)",
            border: "1px solid var(--ds-stroke-weak)",
            boxShadow: "var(--ds-shadow-overlay)",
          }}
        >
          <Tooltip content="Open the photo full size">
            <IconButton priority="tertiary" aria-label="Open the photo full size" onClick={() => setViewerOpen(true)}>
              <ArrowsOut />
            </IconButton>
          </Tooltip>
          <Tooltip content="Save this photo">
            <IconButton priority="tertiary" aria-label="Save this photo"><BookmarkSimple /></IconButton>
          </Tooltip>
        </Flex>
      </Box>
      <Lightbox isOpen={isViewerOpen} onOpenChange={setViewerOpen} media={RIDGE} hasZoom />
    </Post>
  );
}

const POLL = [
  { value: "tabs", label: "Tabs, and the editor renders them how you like" },
  { value: "two", label: "Two spaces, no debate" },
  { value: "four", label: "Four spaces, I have wrists to protect" },
  { value: "none", label: "I have made peace with whatever the repo does" },
];

function PollPost() {
  return (
    <Post author={TOMO} at={hoursAgo(5)} replies="411" reposts="88" likes="742">
      <Body>Settle a standing argument for me. Your formatter runs on save and it decides the indentation. Which is it?</Body>
      <RadioCards.Root columns="1" gap="2" aria-label="Poll: which indentation do you use">
        {POLL.map((option) => (
          // Radix centres a card's content; a poll option is a row of prose and reads left-aligned.
          <RadioCards.Item key={option.value} value={option.value} style={{ justifyContent: "flex-start" }}>
            <Text>{option.label}</Text>
          </RadioCards.Item>
        ))}
      </RadioCards.Root>
      <Text style={{ color: "var(--ds-text-weak)" }}>1,204 votes · 6 hours left</Text>
    </Post>
  );
}

/* ---- the two nesting treatments ----------------------------------------------------------------- */

/* ONE NESTING TREATMENT PER RELATIONSHIP, AND THE TREATMENT NAMES THE RELATIONSHIP.
 *
 * A post on this page nests two different things, they mean opposite things, and so they may not be
 * drawn alike:
 *
 *   EMBEDDED CONTENT BY SOMEONE ELSE (a quoted post, a link preview) is a BORDERED SURFACE. The
 *   reader can see its edges, and an edge is what says "separate object, made by somebody else". A
 *   quoted post therefore leads with its author header exactly as a top-level post does, because it
 *   IS a post, only contained. Both embeds on this page are the same outlined Card surface, so a
 *   reader learns one visual idea and spends it twice.
 *
 *   CONTINUATION OF THE SAME THREAD (a reply) is a CONNECTOR RAIL, with no border. One conversation
 *   carrying on is not a second object, and a rail joins where an edge encloses.
 *
 * A left rule may not carry both readings. The quoted post used to be a Blockquote: a 4px accent
 * rule, which is the same device as the reply rail drawn 40px away with the opposite meaning, and it
 * put the quoted BODY first with the byline underneath, so a reader met a wall of text with no idea
 * whose it was. Containment takes the border, continuation keeps the rail.
 *
 * Reused rather than invented, after reading registry.json (Card, ClickableCard, Blockquote):
 * Card at variant="outlined" is the same surface ClickableCard paints for the link preview below,
 * which is the whole point of picking it. Blockquote is right for a PASSAGE quoted inside prose,
 * where its accent rule is a typographic mark, and wrong for an embedded post that carries an
 * author, a handle and a time of its own. ClickableCard is navigation-only by its own named
 * constraint, since the stretched-link overlay eats text selection, and quoted prose exists to be
 * read and copied. */
function QuotedPost({ author, at, children }: { author: Author; at: number; children: ReactNode }) {
  return (
    <Card variant="outlined">
      <Flex direction="column" gap="2">
        {/* Attribution FIRST, in the same Identity row the containing post uses. The avatar takes the
            lane default (the 16/20/24 beside-text ramp) rather than the post gutter's fixed 40px,
            because here it sits inline in a line of text instead of holding a column open. */}
        <Flex align="center" gap="2" wrap="wrap" style={{ minWidth: 0 }}>
          <Avatar fallback={author.initials} />
          <Identity author={author} at={at} />
        </Flex>
        {children}
        {/* NO ACTION ROW, and no counts. Reply, repost and like belong to the post that CONTAINS this
            one, so the row under the outer post is the only one a reader can press. A second row in
            here would offer five controls that quietly act on a different object. The reply under a
            thread keeps its action row, because a reply is a post in the timeline in its own right,
            which is the other half of the rule above. */}
      </Flex>
    </Card>
  );
}

function QuotePost() {
  return (
    <Post
      author={RENATA} at={hoursAgo(7)} replies="12" reposts="204" likes="988"
      banner={
        <Flex align="center" gap="2" pb="2" pl="7">
          <Repeat aria-hidden />
          <Text style={{ color: "var(--ds-text-weak)" }}>Renata Silveira reposted with a comment</Text>
        </Flex>
      }
    >
      <Body>This is the whole discipline in two sentences. Print it and tape it to the incident channel.</Body>
      <QuotedPost author={CALLUM} at={hoursAgo(19)}>
        <Body>
          A runbook is not documentation, it is a promise you make to the version of yourself who is
          awake at 03:00 and cannot think. Write it for that person.
        </Body>
      </QuotedPost>
    </Post>
  );
}

function ThreadPost() {
  return (
    <Box style={{ borderBottom: "1px solid var(--ds-stroke-weak)" }}>
      <Post author={DANI} at={hoursAgo(9)} replies="58" reposts="317" likes="2,940" indent>
        <Body>
          Consistent hashing is not complicated, it is just explained badly. Here is the version I wish
          somebody had handed me in my first week.
        </Body>
        {/* EMBEDDED CONTENT BY SOMEONE ELSE, so the bordered surface: this preview and the quoted
            post above render the same outlined Card. */}
        {/* Nothing pinned here any more: since [[chrome-heading-lane]] the card's `title` rides the chromeHeading lane
            (text + 1 → 14/16/18), which is the ladder a heading inside a surface wants, and `size`
            rides the container lane. */}
        <ClickableCard
          href="#article"
          title="Consistent hashing, explained with a pizza delivery route"
          headingAs="h3"
          variant="outlined"
        >
          <Text as="p" style={{ margin: 0, color: "var(--ds-text-weak)" }}>
            Why adding one server should move a slice of the keys and not all of them, drawn out with
            twelve addresses and one very tired driver.
          </Text>
          <Text as="div" mt="2" style={{ color: "var(--ds-text-weak)" }}>sparsebits.dev · 9 min read</Text>
        </ClickableCard>
      </Post>
      {/* CONTINUATION OF THE SAME THREAD, so the connector rail and no border. The rail is centred in
          the same 40px gutter the avatar above it occupies, which is what lines a reply up under the
          post it answers. */}
      <Flex px="5" pb="4" gap="3">
        <Flex justify="center" style={{ width: 40, flexShrink: 0 }}>
          <Box style={{ width: 2, borderRadius: "var(--ds-radius-full)", background: "var(--ds-stroke-weak)" }} />
        </Flex>
        <Box style={{ flex: 1, minWidth: 0 }}>
          <Post author={TOMO} at={hoursAgo(8)} replies="4" reposts="9" likes="211" indent>
            <Body>
              The pizza framing is the first one that made the rebalancing cost obvious to me. Adding the
              virtual-node section at the end was the right call.
            </Body>
          </Post>
        </Box>
      </Flex>
    </Box>
  );
}

/* The topics a post is filed under. More of them than a feed column can hold at most widths, which is
 * the case OverflowList exists for: it keeps the row on ONE line and collapses the tail into a count,
 * rather than wrapping a second line of chips under a three-line post. */
const PIPELINE_TOPICS = [
  "build-caching", "monorepo", "ci-pipelines", "developer-experience", "toolchain", "deletion-week",
];

/* A post that has not arrived yet. An infinite feed ALWAYS ends in one of these, and the placeholder
 * mirrors the shape of the post it stands in for — avatar, name line, three lines of body — so the
 * column does not jump when the real post lands. Radix takes the skeleton out of the a11y tree while
 * it is loading, so a screen reader reaches the feed's last real post and stops. */
function LoadingPost() {
  return (
    <Box px="5" py="4" style={{ borderBottom: "1px solid var(--ds-stroke-weak)" }}>
      <Flex gap="3" align="start">
        <Skeleton loading width="40px" height="40px" style={{ borderRadius: "var(--ds-radius-full)" }} />
        <Flex direction="column" gap="2" style={{ flex: 1, minWidth: 0 }}>
          <Skeleton loading width="180px" height="14px" />
          <Skeleton loading width="100%" height="10px" />
          <Skeleton loading width="88%" height="10px" />
          <Skeleton loading width="54%" height="10px" />
        </Flex>
      </Flex>
    </Box>
  );
}

function Feed() {
  return (
    <Box>
      <Composer />
      <Post author={PRIYA} at={NOW - 18 * 60_000} replies="86" reposts="240" likes="1,904">
        <Body>
          Six months of consolidating our build onto one pipeline, and the change that actually moved the
          numbers was deleting forty-one scripts nobody had run since 2023. The graph did not get faster.
          It got smaller.
        </Body>
        <OverflowList label="Topics on this post" gap={2}>
          {PIPELINE_TOPICS.map((topic) => (
            <Token key={topic} href="#topic" leadingIcon={<Hash weight="bold" />}>{topic}</Token>
          ))}
        </OverflowList>
      </Post>
      <MediaPost />
      <ThreadPost />
      <PollPost />
      <QuotePost />
      <LoadingPost />
      <LoadingPost />
    </Box>
  );
}

/* ---- the rails ---------------------------------------------------------------------------------- */

function LeftRail() {
  return (
    <SideNav aria-label="Primary" style={{ flexShrink: 0 }}>
      <SideNav.Section>
        {/* The wordmark is a brand lockup, not a control: its size and the glyph beside it are one
            fixed pair, so both stay pinned while everything under them rides the tier. */}
        <Flex align="center" gap="2" px="2" py="2">
          <Box style={{ color: "var(--ds-icon-interactive)", display: "flex" }}><Compass weight="fill" size={22} /></Box>
          <Text size="3" weight="bold" style={{ color: "var(--ds-text-strong)" }}>Roundtable</Text>
        </Flex>
      </SideNav.Section>
      <SideNav.Section>
        <SideNav.Item label="Home" icon={<House weight="fill" />} href="#home" isSelected />
        <SideNav.Item label="Explore" icon={<Compass />} href="#explore" />
        <SideNav.Item label="Notifications" icon={<Bell />} href="#notifications" endContent={<Badge>12</Badge>} />
        <SideNav.Item label="Messages" icon={<EnvelopeSimple />} href="#messages" endContent={<Badge tone="info">3</Badge>} />
        <SideNav.Item label="Bookmarks" icon={<BookmarkSimple />} href="#bookmarks" />
        <SideNav.Item label="Profile" icon={<UserCircle />} href="#profile" />
      </SideNav.Section>
      <SideNav.Section>
        <Box px="2" py="2">
          {/* PINNED at the top step: the compose button is the one hero action in this rail and the
              archetype's signature control. At uiSize large it is the tier step anyway; below that
              the pin is what keeps it from shrinking into the nav rows it has to outrank. */}
          <Button priority="primary" size="3" style={{ width: "100%" }}>
            <PencilSimple weight="bold" /> Post
          </Button>
        </Box>
      </SideNav.Section>
    </SideNav>
  );
}

const TRENDS = [
  { topic: "Incident retrospectives", meta: "Technology · 14.2K posts", rank: "1" },
  { topic: "Variable fonts", meta: "Design · 8,431 posts", rank: "2" },
  { topic: "Build caching", meta: "Technology · 6,118 posts", rank: "3" },
  { topic: "Coastal path relay", meta: "Sport · 4,907 posts", rank: "4" },
  { topic: "Seed round winter", meta: "Business · 3,260 posts", rank: "5" },
];

const SUGGESTED = [ASHA, CALLUM, MARCUS];

function RightRail() {
  // A heading inside a 340px rail card is CHROME, not a page title: the `heading` lane is 5/6/7
  // (20–28px) and would out-shout the card it labels, so both card titles read the chromeHeading
  // lane ([[chrome-heading-lane]] — text + 1, 14/16/18) explicitly rather than pinning a literal step that ignores
  // the tier. Resolved once here; both headings below use it.
  const cardTitle = useResolvedSize<HeadingProps["size"]>("chromeHeading", undefined);
  return (
    <Box
      p="4"
      style={{ width: 340, flexShrink: 0, borderLeft: "1px solid var(--ds-stroke-weak)", overflowY: "auto" }}
    >
      <Flex direction="column" gap="4">
        <TextField aria-label="Search the feed" placeholder="Search posts and people">
          <TextField.Slot><MagnifyingGlass /></TextField.Slot>
        </TextField>

        <Card variant="filled">
          <Flex direction="column" gap="2">
            <Flex align="center" gap="2">
              <TrendUp aria-hidden style={{ color: "var(--ds-icon-neutral)" }} />
              <Heading as="h2" size={cardTitle}>Trending now</Heading>
            </Flex>
            <List density="compact">
              {TRENDS.map((t) => (
                <ListItem
                  key={t.topic}
                  href="#trend"
                  label={t.topic}
                  description={t.meta}
                  startContent={<Text style={{ color: "var(--ds-text-weak)", width: 16 }}>{t.rank}</Text>}
                />
              ))}
            </List>
            <Text asChild><Link href="#trends">Show more</Link></Text>
          </Flex>
        </Card>

        <Card variant="filled">
          <Flex direction="column" gap="3">
            <Heading as="h2" size={cardTitle}>Who to follow</Heading>
            {SUGGESTED.map((p) => (
              <Flex key={p.handle} align="center" gap="3">
                {/* No pin: a suggestion row is a LIST row, not a post, so the disc rides the avatar
                    lane (16/20/24) beside the text it sits with. The feed's 40px gutter is the
                    post's own geometry and does not belong in a 340px rail. */}
                <Avatar fallback={p.initials} />
                <Box style={{ flex: 1, minWidth: 0 }}>
                  <Flex align="center" gap="1" style={{ minWidth: 0 }}>
                    {/* A single-line label truncates (§8b) — and `title` gives the hidden tail back,
                        which the ellipsis allowance in §9 requires. */}
                    <Text weight="bold" truncate title={p.name}>{p.name}</Text>
                    {p.isVerified && <VerifiedMark />}
                  </Flex>
                  <Text as="div" truncate style={{ color: "var(--ds-text-weak)" }}>{p.handle}</Text>
                </Box>
                <Button>Follow</Button>
              </Flex>
            ))}
            <Separator size="4" />
            <Flex align="center" gap="2">
              <AvatarGroup max={3} label="Followed by four people you know">
                <Avatar fallback="PR" />
                <Avatar fallback="RS" />
                <Avatar fallback="TI" />
                <Avatar fallback="DF" />
              </AvatarGroup>
              <Text style={{ color: "var(--ds-text-weak)" }}>Followed by people you know</Text>
            </Flex>
          </Flex>
        </Card>
      </Flex>
    </Box>
  );
}

/* ---- the screen --------------------------------------------------------------------------------- */

function SocialFeedScreen() {
  // Same call as the rail cards: this h1 labels a COLUMN of the shell, not a document, and it sits
  // in a bar whose height is set by the control beside it. The page `heading` lane (20–28px) would
  // drive that bar; chromeHeading ([[chrome-heading-lane]]) tracks the tier at 14/16/18 and leaves the bar alone.
  const columnTitle = useResolvedSize<HeadingProps["size"]>("chromeHeading", undefined);
  return (
    <Flex style={{ height: "100vh", background: "var(--ds-bg-base)", overflow: "hidden" }}>
      <LeftRail />
      {/* No borderRight here: the right rail declares its own `borderLeft`, and a seam is drawn
          once. Both sides painting `--ds-stroke-weak` put two hairlines a pixel apart. */}
      {/* `paddingRight` sits on the COLUMN, not on the ScrollArea: Radix pins the scrollbar to the
          ScrollArea root, so padding the root barely moves it. Insetting the parent is what keeps
          the 4px track off the right rail's `borderLeft`, where it reads as a second hairline. */}
      <Flex direction="column" style={{ flex: 1, minWidth: 0, paddingRight: "var(--ds-space-2)" }}>
        <Flex
          align="center"
          justify="between"
          gap="4"
          px="5"
          py="3"
          style={{ borderBottom: "1px solid var(--ds-stroke-weak)", background: "var(--ds-bg-raised)" }}
        >
          <Heading as="h1" size={columnTitle}>Home</Heading>
          <SegmentedControl.Root defaultValue="for-you" aria-label="Feed selection">
            <SegmentedControl.Item value="for-you">For you</SegmentedControl.Item>
            <SegmentedControl.Item value="following">Following</SegmentedControl.Item>
          </SegmentedControl.Root>
        </Flex>
        <ScrollArea type="auto" scrollbars="vertical" style={{ flex: 1, minHeight: 0 }}>
          <Feed />
        </ScrollArea>
      </Flex>
      <RightRail />
    </Flex>
  );
}

const meta: Meta = {
  title: "UI examples/Social feed",
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

export const Screen: Story = { name: "Social feed", render: () => <SocialFeedScreen /> };
