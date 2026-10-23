/* =============================================================================
   jsx-lost-space.node-check.ts — RUN-TOGETHER WORDS ON STORY PAGES
   -----------------------------------------------------------------------------
   JSX drops the line break between text and a tag that opens the next line, and
   the space goes with it: "a real" + newline + "<Code>&lt;ol&gt;</Code>" renders
   "a real<ol>". One search per line cannot see it, because the two words sit on
   separate lines, so 42 of these shipped before this guard.

   The guard fails on a line that ends in a word or punctuation when the next
   line opens a tag whose content starts with a character, not a space. It
   also fails the reverse join: a line that ends on a closing tag when the next
   line starts with a letter or digit, so "<em>between</em>" + newline + "lists"
   renders "betweenlists". Punctuation after a closing tag stays flush on
   purpose. To keep the space, end the line with {" "}. To join on purpose, end
   the line with a JSX comment in braces that says so, which ends the line in a
   brace and so passes.
   Lines inside a block comment are skipped, since they never render.
   ============================================================================= */
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { test, expect } from "vitest";

const SRC = join(process.cwd(), "src");

function tsxFiles(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    const p = join(dir, e.name);
    if (e.isDirectory()) return tsxFiles(p);
    return p.endsWith(".tsx") ? [p] : [];
  });
}

const ENDS_IN_TEXT = /[A-Za-z0-9,.;:!?)'"’”]$/;
const OPENS_TAG_ON_TEXT = /^<[A-Za-z][^>]*>[^\s<]/;
const CODE_ENDING = /[=(]\s*$/;
const ENDS_ON_CLOSING_TAG = /<\/[A-Za-z][\w.]*>$/;
const STARTS_WITH_WORD = /^[A-Za-z0-9]/;

export function lostSpaces(source: string): number[] {
  const lines = source.split("\n");
  const found: number[] = [];
  let inBlockComment = false;
  for (let i = 0; i < lines.length - 1; i++) {
    const line = lines[i];
    if (inBlockComment) {
      if (line.includes("*/")) inBlockComment = false;
      continue;
    }
    if (/^\s*\/\*/.test(line) && !line.includes("*/")) {
      inBlockComment = true;
      continue;
    }
    if (/^\s*(\/\/|\*)/.test(line)) continue;
    const end = line.trimEnd();
    const next = lines[i + 1].trimStart();
    if (ENDS_IN_TEXT.test(end) && OPENS_TAG_ON_TEXT.test(next) && !CODE_ENDING.test(end)) found.push(i + 1);
    else if (ENDS_ON_CLOSING_TAG.test(end) && STARTS_WITH_WORD.test(next)) found.push(i + 1);
  }
  return found;
}

test("no line of JSX text runs into a tag on the next line", () => {
  const offenders = tsxFiles(SRC).flatMap((file) =>
    lostSpaces(readFileSync(file, "utf8")).map((line) => `${file.slice(SRC.length + 1)}:${line}`),
  );
  expect(offenders, "end each of these lines with {\" \"}").toEqual([]);
});

test("the guard catches a lost space and passes the two sanctioned endings", () => {
  expect(lostSpaces("<p>\n  a real\n  <Code>ol</Code>\n</p>")).toEqual([2]);
  expect(lostSpaces('<p>\n  a real{" "}\n  <Code>ol</Code>\n</p>')).toEqual([]);
  expect(lostSpaces("<p>\n  word{/* no space */}\n  <em>s</em>\n</p>")).toEqual([]);
  expect(lostSpaces("/*\n  the SAME\n<span>, in a comment\n*/")).toEqual([]);
  // The reverse join, its fix, a deliberate join and the punctuation that stays flush.
  expect(lostSpaces("<p>\n  moving <em>between</em>\n  lists\n</p>")).toEqual([2]);
  expect(lostSpaces('<p>\n  moving <em>between</em>{" "}\n  lists\n</p>')).toEqual([]);
  expect(lostSpaces("<p>\n  <Kbd>Esc</Kbd>{/* a flex gap is the space */}\n  close\n</p>")).toEqual([]);
  expect(lostSpaces("<p>\n  the <Code>x</Code>\n  . And on\n</p>")).toEqual([]);
});
