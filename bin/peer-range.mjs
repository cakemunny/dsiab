/**
 * Whether a peer range a project declares can meet the range this package needs.
 *
 * `dsiab init` reads the project's package.json and reports a peer whose
 * declared range falls clearly outside the need, such as `react` at `^18.3.0`
 * when this package needs `>=19`. The check answers one question: do the two
 * ranges share at least one version?
 *
 * The answer has three values. `true` means the ranges overlap. `false` means
 * that no version satisfies both. `null` means that the declared value is not a
 * range this module can read, such as a dist tag (`latest`), `*`, or a protocol
 * (`workspace:`, `file:`, `link:`, `npm:`, a git or a URL). The caller reports
 * nothing for `null`, because a guess about a tag is noise.
 *
 * The parser reads `||`, comparator sets, hyphen ranges, `^`, `~`, x-ranges and
 * exact versions. It drops prerelease and build tags, so `19.0.0-rc.1` reads as
 * `19.0.0`. That is an approximation, and it errs toward overlap.
 *
 * Zero dependencies, because `bin/dsiab-init.mjs` imports it from a consumer's
 * node_modules, and `semver` is not a runtime dependency of this package.
 */

/** A version is a triple of integers. Each range is a list of [lo, hi) intervals, hi `null` for no upper bound. */
const ZERO = [0, 0, 0];

function compare(a, b) {
  for (let i = 0; i < 3; i++) if (a[i] !== b[i]) return a[i] - b[i];
  return 0;
}

const isWild = (part) => part === undefined || part === "x" || part === "X" || part === "*";

/** Parse `1`, `1.2`, `1.x`, `v1.2.3-rc.1` into its known parts. Returns null when it is not a version. */
function parsePartial(text) {
  const core = text.replace(/^v/, "").replace(/[-+].*$/, "");
  const parts = core.split(".");
  if (parts.length > 3 || parts.some((p) => p === "")) return null;
  const known = [];
  for (const part of parts) {
    if (isWild(part)) break;
    if (!/^\d+$/.test(part)) return null;
    known.push(Number(part));
  }
  return known;
}

/** The lowest version a partial names: missing parts read as 0. */
const floor = (known) => [known[0] ?? 0, known[1] ?? 0, known[2] ?? 0];

/** The first version past every version a partial names: `1` → 2.0.0, `1.2` → 1.3.0, `1.2.3` → 1.2.4. */
function pastEnd(known) {
  if (known.length === 3) return [known[0], known[1], known[2] + 1];
  if (known.length === 2) return [known[0], known[1] + 1, 0];
  return [known[0] + 1, 0, 0];
}

function caretHi(known) {
  const [major, minor, patch] = known;
  if (major > 0 || known.length === 1) return [major + 1, 0, 0];
  if (minor > 0 || known.length === 2) return [0, minor + 1, 0];
  return [0, 0, patch + 1];
}

/** One comparator as a single [lo, hi) interval. Returns null when it cannot be read. */
function comparator(text) {
  const match = /^(<=|>=|<|>|=|\^|~>|~)?\s*(.+)$/.exec(text);
  if (!match) return null;
  const [, op = "", rest] = match;
  const known = parsePartial(rest);
  if (!known || known.length === 0) return null;
  switch (op) {
    case "":
    case "=":
      return [floor(known), pastEnd(known)];
    case "^":
      return [floor(known), caretHi(known)];
    case "~":
    case "~>":
      return [floor(known), known.length === 1 ? [known[0] + 1, 0, 0] : [known[0], known[1] + 1, 0]];
    case ">=":
      return [floor(known), null];
    case ">":
      return [pastEnd(known), null];
    case "<":
      return [ZERO, floor(known)];
    case "<=":
      return [ZERO, pastEnd(known)];
    default:
      return null;
  }
}

/** Intersect every comparator in one space-separated set. Returns null when any part cannot be read. */
function comparatorSet(text) {
  const hyphen = /^(\S+)\s+-\s+(\S+)$/.exec(text);
  const items = hyphen ? [`>=${hyphen[1]}`, `<=${hyphen[2]}`] : text.split(/\s+/);
  let lo = ZERO;
  let hi = null;
  for (const item of items) {
    const interval = comparator(item);
    if (!interval) return null;
    if (compare(interval[0], lo) > 0) lo = interval[0];
    if (interval[1] && (!hi || compare(interval[1], hi) < 0)) hi = interval[1];
  }
  return [lo, hi];
}

/** Parse a whole range into intervals. Returns null for a tag, a protocol, `*`, or anything unreadable. */
export function parseRange(range) {
  if (typeof range !== "string") return null;
  const text = range.trim().replace(/(<=|>=|<|>|=|\^|~>|~)\s+/g, "$1");
  if (text === "" || /[:/#]/.test(text)) return null;
  const intervals = [];
  for (const alternative of text.split("||")) {
    const set = alternative.trim();
    if (set === "" || isWild(set)) return null;
    const interval = comparatorSet(set);
    if (!interval) return null;
    intervals.push(interval);
  }
  return intervals;
}

const overlaps = (a, b) => {
  const lo = compare(a[0], b[0]) > 0 ? a[0] : b[0];
  const hi = !a[1] ? b[1] : !b[1] ? a[1] : compare(a[1], b[1]) < 0 ? a[1] : b[1];
  return !hi || compare(lo, hi) < 0;
};

/**
 * Whether the `declared` range shares a version with the `need` range.
 * Returns true (they overlap), false (no version meets both), or null (the declared value is not a readable range).
 */
export function admits(declared, need) {
  const have = parseRange(declared);
  const want = parseRange(need);
  if (!have || !want) return null;
  return have.some((a) => want.some((b) => overlaps(a, b)));
}
