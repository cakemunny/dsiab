/**
 * Where each component's docs page lives, read from its stories file ([[compiled-component-reference]]).
 *
 * The title comes from the CSF meta object and the first story from the first named export, which
 * the story-order guard holds to `Anatomy` or `Usage`. The id is Storybook's own `toId`, imported
 * and not re-derived, so the link is the id Storybook serves.
 *
 * An entry with no `storyPath` falls back to the stories file of its `module` (the TopNav children
 * and TypeaheadItem are documented on their parent's page), and otherwise has no page of its own.
 */
import ts from "typescript";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { toId, storyNameFromExport } from "storybook/internal/csf";

function unwrap(node) {
  while (node && (ts.isSatisfiesExpression(node) || ts.isAsExpression(node) || ts.isParenthesizedExpression(node))) {
    node = node.expression;
  }
  return node;
}

/** `{ title, firstStory }` from one CSF file, or throw naming what is missing. */
export function storyFacts(path) {
  const source = ts.createSourceFile(path, readFileSync(path, "utf8"), ts.ScriptTarget.Latest, false, ts.ScriptKind.TSX);
  const vars = new Map();
  let meta = null;
  let firstStory = null;
  for (const statement of source.statements) {
    if (ts.isVariableStatement(statement)) {
      const exported = statement.modifiers?.some((m) => m.kind === ts.SyntaxKind.ExportKeyword);
      for (const decl of statement.declarationList.declarations) {
        if (!ts.isIdentifier(decl.name)) continue;
        vars.set(decl.name.text, decl.initializer);
        if (exported && !firstStory) firstStory = decl.name.text;
      }
    } else if (ts.isExportAssignment(statement)) {
      const value = unwrap(statement.expression);
      meta = unwrap(ts.isIdentifier(value) ? vars.get(value.text) : value);
    }
  }
  const titleProp = meta && ts.isObjectLiteralExpression(meta)
    ? meta.properties.find((p) => ts.isPropertyAssignment(p) && p.name.getText(source) === "title")
    : null;
  const title = titleProp && ts.isStringLiteralLike(titleProp.initializer) ? titleProp.initializer.text : null;
  if (!title || !firstStory) throw new Error(`reference: ${path} has no literal meta title or no named story export`);
  return { title, firstStory, id: toId(title, storyNameFromExport(firstStory)) };
}

/**
 * The page for one registry entry: `{ story, parent }`. `story` is the facts of the stories file
 * that documents it, or null. `parent` names the registry entry whose page that is, when it is not
 * the entry's own.
 */
export function pageFor(root, entry, registry) {
  if (entry.storyPath) return { story: storyFacts(resolve(root, entry.storyPath)), parent: null };
  if (entry.module && !entry.module.includes("/")) {
    const path = `src/components/ui/${entry.module}.stories.tsx`;
    if (existsSync(resolve(root, path))) {
      const owner = registry.find((e) => e.storyPath === path);
      return { story: storyFacts(resolve(root, path)), parent: owner?.name ?? null };
    }
  }
  return { story: null, parent: null };
}
