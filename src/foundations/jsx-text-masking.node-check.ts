/* =============================================================================
   JSX TEXT IS TEXT — the masking guard for the consumer rule checker.

   `ds-check` blanks comments out of a script file before its matchers run, and
   it skips string literals. Its scanner used to read JSX text as code, so
   ordinary words on a page turned into syntax:

     · `<Code>/* x</Code>` opened a block comment that ran to the end of the
       file, and every finding below it vanished while the run stayed clean.
     · `<Text>https://a.b</Text>` opened a line comment that ate the rest of
       its line.
     · `<p>Don't</p>` opened a string that ate the rest of its line.

   Each case below hides one real `aschild-nonint` finding behind page text, so
   a regression turns a count of 1 into 0. The remaining cases hold the shapes
   the JSX tracking must NOT break: a comment allowance inside JSX, a string
   attribute, TypeScript generics in a .tsx file, a cast in a .ts file, a
   template-literal style value, and a file whose JSX never closes.
   ============================================================================= */
import { test, expect } from "vitest";
import { checkSource } from "./consumerRules.mjs";

const LOST = "<Button asChild><div>x</div></Button>";

const rulesIn = (file: string, src: string) => {
  const r = checkSource(file, src);
  if (!r) throw new Error(`checkSource read nothing for ${file}`);
  return { findings: r.findings.map((f) => `${f.line} ${f.rule}`), allowed: r.allowed.length };
};

test.each([
  ["a block-comment opener in page text", `<Code>/* x</Code>\n${LOST}\n`, "2 aschild-nonint"],
  ["a web address in page text, same line", `<Text>https://a.b</Text> ${LOST}\n`, "1 aschild-nonint"],
  ["an apostrophe in page text, same line", `<p>Don't</p> ${LOST}\n`, "1 aschild-nonint"],
  ["page text inside a returned tree", `function A() {\n  return (\n    <div>\n      <Code>/* x</Code>\n      ${LOST}\n    </div>\n  );\n}\n`, "5 aschild-nonint"],
])("%s does not hide the finding after it", (_label, src, want) => {
  expect(rulesIn("a.tsx", src).findings).toEqual([want]);
});

test("a comment allowance inside JSX is still a comment", () => {
  const src =
    "<div>\n" +
    "  <span tabIndex={2}>{/* ds-allow tabindex-positive — this demo shows the ordering bug on purpose */}x</span>\n" +
    "</div>\n";
  expect(rulesIn("a.tsx", src)).toEqual({ findings: [], allowed: 1 });
});

test("a string attribute is still a string", () => {
  expect(rulesIn("a.tsx", '<Hint title="set tabIndex={2} to see it" />\n').findings).toEqual([]);
});

test.each([
  ["an arrow generic with a comma", "const id = <T,>(x: T) => x;"],
  ["an arrow generic with a constraint", "const id = <T extends object>(x: T) => x;"],
  ["a generic function type", "type F = <T>(a: T) => T;"],
  ["a generic call", 'const [s] = useState<string>("");'],
])("%s in a .tsx file is not read as an element", (_label, line) => {
  expect(rulesIn("a.tsx", `${line}\nconst el = ${LOST};\n`).findings).toEqual(["2 aschild-nonint"]);
});

test("a type cast in a .ts file is not read as an element", () => {
  const src = 'const a = <any>b;\nconst s = { transition: "all 1s" };\n';
  expect(rulesIn("a.ts", src).findings).toEqual(["2 transition-all"]);
});

test("a template-literal style value is still read, by design", () => {
  expect(rulesIn("a.tsx", "const s = { transition: `all 1s` };\n").findings).toEqual(["1 transition-all"]);
});

test("JSX that never closes falls back to the plain scan", () => {
  const src = 'const x = <div>;\nconst s = { transition: "all 1s" };\n';
  expect(rulesIn("a.tsx", src).findings).toEqual(["2 transition-all"]);
});
