/**
 * The props half of the compiled component reference ([[compiled-component-reference]]).
 *
 * One TypeScript program over `src/index.ts`, with the options `tsconfig.build.json` emits the
 * shipped declarations from, so what this reads is what `dist/index.d.ts` says. It reads the
 * source and not `dist/`, so the reference needs no prior build and the guard can run it in memory.
 *
 * A prop is OWN when one of its declarations sits outside `node_modules`, INHERITED FROM RADIX when
 * one sits under a Radix package, and otherwise it is a React or HTML attribute and only counted.
 * A member's type prints from its declared type node when there is one, because the checker expands
 * an alias such as `ISODateString` into a template literal nobody would recognise.
 *
 * Kind of an export, decided in this order: type-only symbol -> `type`; a lower-case name with a
 * call signature -> `hook` when it starts `use`, else `function`; a value with capitalised members
 * that are components -> `compound`; a value with a call signature -> `component`; anything else
 * -> `value`.
 */
import ts from "typescript";
import { resolve } from "node:path";

const RADIX_FILE = /node_modules\/(?:@radix-ui\/|radix-ui\/)/;
const PRINT = ts.TypeFormatFlags.NoTruncation | ts.TypeFormatFlags.UseAliasDefinedOutsideCurrentScope;

/** Collapse a doc or type text onto one line. */
export const oneLine = (text) => text.replace(/\s+/g, " ").trim();

/** Open the program once. Returns `describe(name)` and `radixProps(radixName, part?)`. */
export function openProgram(root) {
  const host = { ...ts.sys, onUnRecoverableConfigFileDiagnostic: () => {} };
  const config = ts.getParsedCommandLineOfConfigFile(resolve(root, "tsconfig.build.json"), {}, host);
  const entry = resolve(root, "src/index.ts");
  const options = { ...config.options, noEmit: true, declaration: false, emitDeclarationOnly: false };
  const program = ts.createProgram([entry], options);
  const checker = program.getTypeChecker();
  const exportsOf = (file) => {
    const symbol = file && checker.getSymbolAtLocation(file);
    return new Map((symbol ? checker.getExportsOfModule(symbol) : []).map((s) => [s.name, s]));
  };
  const own = exportsOf(program.getSourceFile(entry));
  const radixPath = ts.resolveModuleName("@radix-ui/themes", entry, options, ts.sys).resolvedModule?.resolvedFileName;
  const radix = exportsOf(radixPath && program.getSourceFile(radixPath));
  const ctx = { checker };

  return {
    has: (name) => own.has(name),
    describe(name) {
      const symbol = own.get(name);
      if (!symbol) throw new Error(`reference: ${name} is in registry.json exports[] but src/index.ts does not export it`);
      return describeSymbol(ctx, name, unalias(checker, symbol));
    },
    /**
     * The props Radix Themes `radixName` (or its `part`) takes that this export's props type does
     * not, so a reader who remembers the Radix API knows what it may not pass. A Radix compound with
     * no call signature of its own compares against its `Root`.
     */
    notAccepted(props, radixName, part) {
      const theirs = this.radixProps(radixName, part) ?? (part ? null : this.radixProps(radixName, "Root"));
      if (!theirs || !props) return [];
      const ours = new Set(props.names);
      const refused = [...theirs].filter((n) => !ours.has(n)).sort();
      // Refusing most of the Radix props means this export is not a wrap of that component at all.
      return refused.length > theirs.size / 2 ? [] : refused;
    },
    /** The prop names of a Radix Themes component, or of one of its parts, or null. */
    radixProps(radixName, part) {
      const symbol = radix.get(radixName);
      if (!symbol) return null;
      let type = checker.getTypeOfSymbol(unalias(checker, symbol));
      if (part) {
        const member = type.getProperty(part);
        if (!member) return null;
        type = checker.getTypeOfSymbol(member);
      }
      const props = propsTypeOf(checker, type);
      return props ? new Set(checker.getPropertiesOfType(props).map((p) => p.name)) : null;
    },
  };
}

function unalias(checker, symbol) {
  return symbol.flags & ts.SymbolFlags.Alias ? checker.getAliasedSymbol(symbol) : symbol;
}

function docOf(checker, symbol) {
  return ts.displayPartsToString(symbol.getDocumentationComment(checker)).trim();
}

function defaultOf(checker, symbol) {
  const tag = symbol.getJsDocTags(checker).find((t) => t.name === "default" || t.name === "defaultValue");
  return tag ? oneLine(ts.displayPartsToString(tag.text ?? [])) : null;
}

/** The type of a component's first parameter, or null for a value that takes no props. */
function propsTypeOf(checker, type) {
  const signature = type.getCallSignatures()[0];
  const param = signature?.getParameters()[0];
  if (!param) return null;
  return checker.getTypeOfSymbol(param);
}

function isObjectLike(type) {
  if (type.isUnion()) return type.types.some(isObjectLike);
  return Boolean(type.flags & (ts.TypeFlags.Object | ts.TypeFlags.Intersection));
}

function declaredFile(symbol) {
  return (symbol.declarations ?? []).map((d) => d.getSourceFile().fileName);
}

/** Print one member's type: its declared node text when it has one, else the checker's string. */
function memberType(checker, prop) {
  const node = (prop.valueDeclaration ?? prop.declarations?.[0])?.type;
  if (node) return oneLine(node.getText());
  return oneLine(checker.typeToString(checker.getTypeOfSymbol(prop), undefined, PRINT));
}

/**
 * Split a props type into own members (with type, doc and default), inherited Radix names, and a
 * count of the rest. A union is merged across its branches; a member missing from some branch is
 * marked `variant`. A member typed `never` in every branch is a declared refusal, so it is listed
 * as `refused` and not as a prop.
 */
export function splitProps(checker, type) {
  const branches = type.isUnion() ? type.types.filter(isObjectLike) : [type];
  const seen = new Map();
  for (const branch of branches) {
    for (const prop of checker.getPropertiesOfType(branch)) {
      const entry = seen.get(prop.name) ?? { symbols: [], branches: 0 };
      entry.symbols.push(prop);
      entry.branches += 1;
      seen.set(prop.name, entry);
    }
  }
  const own = [];
  const radix = [];
  const refused = [];
  let other = 0;
  for (const [name, { symbols, branches: count }] of seen) {
    const files = symbols.flatMap(declaredFile);
    if (files.some((f) => !f.includes("/node_modules/"))) {
      const live = symbols.filter((s) => memberType(checker, s) !== "never" && !(checker.getTypeOfSymbol(s).flags & ts.TypeFlags.Never));
      if (live.length === 0) {
        refused.push(name);
        continue;
      }
      const docs = [...new Set(live.map((s) => oneLine(docOf(checker, s))).filter(Boolean))];
      const types = [...new Set(live.map((s) => memberType(checker, s)))];
      own.push({
        name,
        optional: live.every((s) => s.flags & ts.SymbolFlags.Optional),
        type: types.length > 1 ? types.map((t) => (t.includes("=>") ? `(${t})` : t)).join(" | ") : types[0],
        doc: docs.join(" / "),
        default: live.map((s) => defaultOf(checker, s)).find(Boolean) ?? null,
        variant: branches.length > 1 && count < branches.length,
      });
    } else if (files.some((f) => RADIX_FILE.test(f))) radix.push(name);
    else other += 1;
  }
  const names = [...seen.keys()].filter((n) => !refused.includes(n));
  return { own, radix, other, refused, union: branches.length > 1, names };
}

function partsOf(checker, type) {
  return checker
    .getPropertiesOfType(type)
    .filter((p) => /^[A-Z]/.test(p.name))
    .filter((p) => {
      const t = checker.getTypeOfSymbol(p);
      return t.getCallSignatures().length > 0 || checker.getPropertiesOfType(t).some((q) => /^[A-Z]/.test(q.name));
    });
}

/** One part of a compound component, recursively (Tabs.Nav.Root). */
function describePart(ctx, path, symbol) {
  const { checker } = ctx;
  const type = checker.getTypeOfSymbol(symbol);
  const propsType = propsTypeOf(checker, type);
  return {
    path,
    doc: docOf(checker, symbol),
    props: propsType ? splitProps(checker, propsType) : null,
    parts: partsOf(checker, type).map((p) => describePart(ctx, `${path}.${p.name}`, p)),
  };
}

function describeSymbol(ctx, name, symbol) {
  const { checker } = ctx;
  const base = { name, doc: docOf(checker, symbol), default: defaultOf(checker, symbol) };
  const isType = symbol.flags & (ts.SymbolFlags.Interface | ts.SymbolFlags.TypeAlias) && !(symbol.flags & ts.SymbolFlags.Value);
  if (isType) {
    const type = checker.getDeclaredTypeOfSymbol(symbol);
    const decl = symbol.declarations?.find(ts.isTypeAliasDeclaration);
    const text = decl ? oneLine(decl.type.getText()) : null;
    const alias = text && !text.startsWith("{") && text.length <= 200 ? text : null;
    return { ...base, kind: "type", alias, props: isObjectLike(type) ? splitProps(checker, type) : null };
  }
  const type = checker.getTypeOfSymbol(symbol);
  const signatures = type.getCallSignatures();
  if (/^[a-z]/.test(name) && signatures.length > 0) {
    const decl = signatures[0].getDeclaration();
    const signature = decl && !decl.getSourceFile().isDeclarationFile && ts.isFunctionDeclaration(decl)
      ? oneLine(`${name}(${decl.parameters.map((p) => p.getText()).join(", ")})${decl.type ? `: ${decl.type.getText()}` : ""}`)
      : oneLine(`${name}${checker.signatureToString(signatures[0], undefined, PRINT)}`);
    return { ...base, kind: /^use[A-Z]/.test(name) ? "hook" : "function", signature };
  }
  const parts = partsOf(checker, type);
  const propsType = propsTypeOf(checker, type);
  if (parts.length > 0) {
    return {
      ...base,
      kind: "compound",
      // A compound that renders on its own (`<SideNav>`) stands for itself in a count. One that is
      // only an object of parts (`DropdownMenu`) is placed by its `Root` ([[local-usage-scan]]).
      callable: signatures.length > 0,
      props: propsType ? splitProps(checker, propsType) : null,
      parts: parts.map((p) => describePart(ctx, `${name}.${p.name}`, p)),
    };
  }
  if (signatures.length > 0) return { ...base, kind: "component", props: propsType ? splitProps(checker, propsType) : null };
  return { ...base, kind: "value", signature: oneLine(`${name}: ${checker.typeToString(type, undefined, PRINT)}`) };
}
