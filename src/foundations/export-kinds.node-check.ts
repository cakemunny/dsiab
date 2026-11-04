/* =============================================================================
   export-kinds.node-check.ts — EVERY EXPORT HAS A KIND, EVERY COMPONENT A ROOT
   -----------------------------------------------------------------------------
   The usage scan of [[local-usage-scan]] counts what a project uses from the
   roster the installed package ships, `dist/registry.json`. Two fields there
   decide every count:

     kinds  each exported name of an available entry, mapped to `component`,
            `hook`, `function`, `constant` or `type`. A type is never counted.
     roots  the names whose placement counts as one use of the whole component,
            because one documentation page is one component: a dropdown with
            three items is one dropdown.

   A name with no kind, or a component with no root, is a use the scan cannot
   count, and it would surface as untraced in every team's report. So the build
   throws on either, and this guard holds the rule from five sides:

     COMPLETE   every exported name of every available entry has a shipped kind.
     ROOTS      every available entry that publishes anything countable has at
                least one root, and each root names an export or a part of one.
     KNOWN      the kinds and roots of the shapes the rule was written for:
                a forwarded-ref component, a function component, a context, an
                object of parts, a compound that renders on its own, a hook, a
                constant and a type.
     OVERRIDES  each written root exception is still needed, and a new entry
                with no export of its own name fails the build by name.
     BUILT      the shipped `dist/registry.json`, when a build is present,
                carries exactly the kinds and roots this run derives. CI builds
                before this lane runs, so there it is always checked.
   ============================================================================= */
import { existsSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  buildDistRegistry,
  typeFactsOf,
  SHIPPED_KIND,
  ROOT_OVERRIDES,
  SOURCE_PATH,
  OUT_PATH,
} from "../../scripts/dist-registry.mjs";
import { openProgram } from "../../scripts/reference/types.mjs";

interface Entry {
  name: string;
  status: string;
  exports: string[];
}
interface Projected extends Entry {
  kinds?: Record<string, string>;
  roots?: string[];
}
interface Model {
  kind: string;
  callable?: boolean;
  parts?: { path: string }[];
}

const SHIPPED = new Set(Object.values(SHIPPED_KIND));
const registry: Entry[] = JSON.parse(readFileSync(SOURCE_PATH, "utf8"));
const program = openProgram(process.cwd());
const describeExport = (name: string): Model => program.describe(name);
const projection = buildDistRegistry(registry, describeExport) as { components: Projected[] };
const available = projection.components.filter((c) => c.status === "available");
const entry = (name: string) => available.find((c) => c.name === name)!;
const kindOf = (name: string) => available.find((c) => c.exports.includes(name))?.kinds?.[name];

describe("export kinds and component roots", () => {
  it("COMPLETE: every exported name of every available entry has a shipped kind", () => {
    const missing = available.flatMap((c) =>
      c.exports.filter((n) => !SHIPPED.has(c.kinds?.[n] ?? "")).map((n) => `${c.name}: ${n} -> ${c.kinds?.[n]}`),
    );
    expect(missing, "these names have no kind a usage scan can read").toEqual([]);
  });

  it("ROOTS: every countable entry has a root, and each root names an export or a part of one", () => {
    const problems: string[] = [];
    for (const c of available) {
      const countable = c.exports.some((n) => c.kinds?.[n] !== "type");
      if (countable && !c.roots?.length) problems.push(`${c.name}: no root`);
      if (!countable && c.roots?.length) problems.push(`${c.name}: a root, though nothing of it is countable`);
      for (const root of c.roots ?? []) {
        const [head, part] = root.split(".");
        if (!c.exports.includes(head)) problems.push(`${c.name}: root ${root} is not one of its exports`);
        else if (part && !(describeExport(head).parts ?? []).some((p) => p.path === root)) {
          problems.push(`${c.name}: root ${root} names no part of ${head}`);
        }
      }
    }
    expect(problems).toEqual([]);
  });

  it("KNOWN: the kinds of the shapes the rule was written for", () => {
    expect({
      Button: kindOf("Button"),
      Breadcrumbs: kindOf("Breadcrumbs"),
      BreadcrumbContext: kindOf("BreadcrumbContext"),
      DropdownMenu: kindOf("DropdownMenu"),
      useAnnounce: kindOf("useAnnounce"),
      interactiveLayer: kindOf("interactiveLayer"),
      ButtonProps: kindOf("ButtonProps"),
      AccentColor: kindOf("AccentColor"),
    }).toEqual({
      Button: "component",
      Breadcrumbs: "component",
      BreadcrumbContext: "component",
      DropdownMenu: "component",
      useAnnounce: "hook",
      interactiveLayer: "constant",
      ButtonProps: "type",
      AccentColor: "type",
    });
  });

  it("KNOWN: the roots of the shapes the rule was written for", () => {
    expect({
      Button: entry("Button").roots,
      DropdownMenu: entry("DropdownMenu").roots,
      Select: entry("Select").roots,
      Toolbar: entry("Toolbar").roots,
      SideNav: entry("SideNav").roots,
      Field: entry("Field").roots,
      Toast: entry("Toast").roots,
      AccentColor: entry("AccentColor").roots,
      TypeaheadItem: entry("TypeaheadItem").roots,
    }).toEqual({
      Button: ["Button"],
      DropdownMenu: ["DropdownMenu.Root"],
      Select: ["Select", "Select.Root"],
      Toolbar: ["Toolbar.Root", "ToolbarRoot"],
      SideNav: ["SideNav"],
      Field: ["useOptionalFieldControl"],
      Toast: ["ToastProvider"],
      AccentColor: [],
      TypeaheadItem: [],
    });
  });

  it("OVERRIDES: each written root exception is still needed and names a real export", () => {
    const stale = Object.entries(ROOT_OVERRIDES as Record<string, string>).flatMap(([name, root]) => {
      const c = available.find((e) => e.name === name);
      if (!c) return [`${name}: no available entry of that name`];
      if (c.exports.includes(name)) return [`${name}: exports its own name now, so its root is worked out`];
      if (!c.exports.includes(root)) return [`${name}: ${root} is not one of its exports`];
      return [];
    });
    expect(stale, "remove or correct these in ROOT_OVERRIDES").toEqual([]);
  });

  it("OVERRIDES: a new entry with no export of its own name fails the build, by name", () => {
    const newcomer = { name: "Gauge", status: "ported", exports: ["GaugeProps", "GaugeDial"] };
    const fake = (name: string): Model => ({ kind: name.endsWith("Props") ? "type" : "component" });
    expect(() => typeFactsOf(newcomer, fake)).toThrow(/Gauge has no export named Gauge.*ROOT_OVERRIDES/s);
  });

  it.skipIf(!existsSync(OUT_PATH))("BUILT: the shipped roster carries exactly these kinds and roots", () => {
    const built = JSON.parse(readFileSync(OUT_PATH, "utf8")) as { components: Projected[] };
    const facts = (list: Projected[]) =>
      list.filter((c) => c.status === "available").map(({ name, kinds, roots }) => ({ name, kinds, roots }));
    expect(facts(built.components), "dist/registry.json is stale: run npm run build").toEqual(facts(available));
  });
});
