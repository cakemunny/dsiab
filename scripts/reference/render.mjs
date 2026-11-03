/**
 * Markdown for the compiled component reference ([[compiled-component-reference]]). Pure: models
 * in, text out. Lists rather than tables, so the `|` in a union type needs no escaping.
 */
import { oneLine } from "./types.mjs";

/** The sentence every file opens on. The guard requires it verbatim. */
export const DOCS_WIN =
  "The docs page wins. This file is compiled at build time from the package's types and roster. " +
  "Where it disagrees with the docs page, the page is right and this file is a defect.";

const NOT_HERE =
  "Measured token values, visual states, keyboard behaviour and live examples are on the docs page, not here.";

const code = (text) => (text.includes("`") ? `\`\` ${text} \`\`` : `\`${text}\``);
const names = (list) => list.map(code).join(", ");

const KIND_LABEL = {
  component: "component", compound: "compound component", hook: "hook", function: "function", type: "type", value: "value",
};

function propLine(prop) {
  const head = `${prop.name}${prop.optional ? "?" : ""}: ${prop.type}`;
  const extra = [
    prop.default ? `default ${code(prop.default)}` : null,
    prop.variant ? "in one variant shape only" : null,
  ].filter(Boolean);
  return `- ${code(head)}${extra.length ? ` (${extra.join("; ")})` : ""}${prop.doc ? `: ${prop.doc}` : ""}`;
}

/** The props block for one props shape. `exported` is the set of names this entry publishes. */
/** A props shape's identity, so a props type that only restates a component's props can point at it. */
const shapeOf = (props) => [...props.own.map((p) => p.name)].sort().join(",") + `|${[...props.radix].sort().join(",")}`;

function propsBlock(props, refused, sameAs) {
  const lines = [];
  if (refused?.names.length) lines.push(`- Not accepted from Radix ${code(refused.label)}: ${names(refused.names)}.`);
  const declared = props.refused.filter((n) => !refused?.names.includes(n));
  if (declared.length) lines.push(`- Not accepted (typed \`never\`): ${names(declared)}.`);
  if (sameAs) {
    lines.push(`- The props of ${code(sameAs)}, listed under it.`);
    return lines;
  }
  if (props.union) lines.push("- The props are a union of shapes. A member marked \"in one variant shape only\" belongs to one of them.");
  lines.push(...props.own.map(propLine));
  if (props.radix.length) lines.push(`- Inherited from Radix: ${names(props.radix)}.`);
  if (props.other) lines.push(`- Also takes ${props.other} React and HTML attributes.`);
  return lines;
}

function partBlock(part, ctx, depth) {
  const lines = [`${"#".repeat(depth)} ${code(part.path)}`, ""];
  if (part.doc) lines.push(part.doc, "");
  if (part.props) {
    const sameAs = part.props.own.length ? ctx.shapes.get(shapeOf(part.props)) : null;
    lines.push(...propsBlock(part.props, ctx.notAccepted(part), sameAs), "");
  }
  for (const child of part.parts) lines.push(...partBlock(child, ctx, Math.min(depth + 1, 6)));
  return lines;
}

function exportBlock(model, ctx) {
  const lines = [`### ${code(model.name)} (${KIND_LABEL[model.kind]})`, ""];
  if (model.doc) lines.push(model.doc, "");
  if (model.alias) lines.push(`- ${code(`type ${model.name} = ${model.alias}`)}`);
  if (model.signature) lines.push(`- ${code(model.signature)}`);
  if (model.default) lines.push(`- Default: ${code(model.default)}`);
  if (model.parts?.length) lines.push(`- Parts: ${names(model.parts.map((p) => p.path))}.`);
  if (model.props) {
    const isType = model.kind === "type";
    const sameAs = isType && model.props.own.length ? ctx.shapes.get(shapeOf(model.props)) : null;
    lines.push(...propsBlock(model.props, isType ? null : ctx.notAccepted(model), sameAs));
  }
  if (lines.at(-1) !== "") lines.push("");
  for (const part of model.parts ?? []) lines.push(...partBlock(part, ctx, 4));
  return lines;
}

function importLine(models) {
  const list = models.map((m) => (m.kind === "type" ? `type ${m.name}` : m.name)).join(", ");
  return `import { ${list} } from "dsiab";`;
}

/** The category heading an entry is grouped under in the index. */
export function categoryOf(page) {
  if (!page.story) return "Hooks and other exports";
  const segments = page.story.title.split("/");
  return segments[0] === "Components" ? segments.slice(1, -1).join(" / ") : segments.slice(0, -1).join(" / ");
}

/**
 * One `<Name>.md`. `entry` is the dist-registry projection of the entry, `page` its docs page,
 * `models` one per export, `ctx` carries `version`, `linkOf(page)`, and `notAccepted(model)`, which
 * returns `{ label, names }` for the Radix props a model refuses, or null.
 */
export function renderComponent(entry, page, models, ctx) {
  const url = ctx.linkOf(page);
  const lines = [
    `<!-- Generated from dsiab ${ctx.version}. Do not edit; it is rebuilt with the package. -->`,
    `# ${entry.name}`,
    "",
    `> ${DOCS_WIN} Docs page: ${url}`,
    "",
    `- Status: ${entry.status}. Tier: ${entry.tier}. Category: ${categoryOf(page)}.`,
  ];
  const renders = models.some((m) => m.kind === "component" || m.kind === "compound");
  if (renders) {
    lines.push(entry.wraps
      ? `- Built on Radix Themes ${code(entry.wraps)}. Only the props listed below apply.`
      : "- A custom composition, not a thin Radix wrap. Only the props listed below apply.");
  }
  if (page.parent) lines.push(`- Documented on the ${page.parent} page. See also [${page.parent}.md](./${page.parent}.md).`);
  if (!page.story) lines.push("- It has no docs page of its own. The link above opens the docs site.");
  if (models.length) {
    const setup = renders ? ` Load ${code('import "dsiab/styles.css"')} once, and render inside ${code("<Provider>")}.` : "";
    lines.push(`- Import: ${code(importLine(models))}${setup}`);
  }
  lines.push(`- ${NOT_HERE}`, "", "## Exports", "");
  if (!models.length) {
    lines.push(`${code(entry.name)} has no export of its own. It is a part of ${page.parent}, documented in [${page.parent}.md](./${page.parent}.md).`, "");
  }
  const shapes = new Map(models.filter((m) => m.kind !== "type" && m.props).map((m) => [shapeOf(m.props), m.name]));
  for (const model of models) lines.push(...exportBlock(model, { ...ctx, shapes }));
  return `${lines.join("\n").replace(/\n{3,}/g, "\n\n").trimEnd()}\n`;
}

function firstSentence(text) {
  const flat = oneLine(text);
  const end = flat.search(/[.!?](\s|$)/);
  const sentence = end === -1 ? flat : flat.slice(0, end + 1);
  return sentence.length > 200 ? `${sentence.slice(0, 197)}...` : sentence;
}

/** `index.md`: every available entry grouped by category, then what the package leaves out. */
export function renderIndex(items, unavailable, version) {
  const groups = new Map();
  for (const { entry, page, models } of items) {
    const key = categoryOf(page);
    const primary = [entry.name, `${entry.name}Props`].map((n) => models.find((m) => m.name === n && m.doc)).find(Boolean);
    const summary = primary ? `: ${firstSentence(primary.doc)}` : page.parent ? `: part of ${page.parent}.` : "";
    groups.set(key, [...(groups.get(key) ?? []), [entry.name, `- [${entry.name}](./${entry.name}.md)${summary}`]]);
  }
  const byName = (list) => list.sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0)).map(([, line]) => line);
  const last = (k) => (k === "Hooks and other exports" ? 1 : 0);
  const keys = [...groups.keys()].sort((a, b) => last(a) - last(b) || (a < b ? -1 : a > b ? 1 : 0));
  const lines = [
    `<!-- Generated from dsiab ${version}. Do not edit; it is rebuilt with the package. -->`,
    "# dsiab components",
    "",
    `> ${DOCS_WIN}`,
    "",
    "One file per available component, hook and type group: its exports, the exact props each takes, the Radix props it inherits and the ones it does not accept, and the import line.",
    "",
  ];
  for (const key of keys) lines.push(`## ${key}`, "", ...byName(groups.get(key)), "");
  lines.push("## Not included", "", ...unavailable.map((e) => `- ${e.name}: ${e.reason}`));
  return `${lines.join("\n").trimEnd()}\n`;
}
