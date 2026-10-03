// Copyright (c) Meta Platforms, Inc. and affiliates.
// Portions derived from facebook/astryx packages/core/src/utils/groupItems.ts @ 9daca871 (MIT, © Meta Platforms)

import type { TypeaheadOption } from "./Typeahead";

/* groupItems — group search results by `auxiliaryData.group`, preserving group insertion order.
 * LIFTED from Astryx (facebook/astryx `@astryxdesign/core`, commit 9daca871, `utils/groupItems.ts`)
 * under the port doctrine (DECISIONS [[catalog-as-specification]]), adapted to our `TypeaheadOption` (Astryx's `SearchableItem`).
 *
 * CommandPalette derives BOTH the flat activedescendant order AND the render tree from ONE call to this
 * util ([[command-palette]]) — killing the upstream fragile dual-invariant where two separate inline group passes had to
 * agree on ordering. */

/** A group of options with an optional heading (`null` = the trailing ungrouped bucket). */
export interface ItemGroup<TAux = unknown> {
  heading: string | null;
  items: TypeaheadOption<TAux>[];
}

/** Read the group string off an option's `auxiliaryData.group` (any non-string → ungrouped). */
export function getItemGroup(item: TypeaheadOption): string | undefined {
  const aux = item.auxiliaryData as Record<string, unknown> | undefined;
  return typeof aux?.group === "string" ? aux.group : undefined;
}

/**
 * Group options by `auxiliaryData.group`, preserving the insertion order of groups. Ungrouped options
 * collect into a final `{ heading: null }` bucket. When NO option has a group, returns a single
 * `{ heading: null, items }` entry (a flat list).
 */
export function groupItems<TAux>(items: TypeaheadOption<TAux>[]): ItemGroup<TAux>[] {
  const hasGroups = items.some((item) => getItemGroup(item) != null);
  if (!hasGroups) return [{ heading: null, items }];

  const groupOrder: string[] = [];
  const groups = new Map<string, TypeaheadOption<TAux>[]>();
  const ungrouped: TypeaheadOption<TAux>[] = [];

  for (const item of items) {
    const group = getItemGroup(item);
    if (group != null) {
      if (!groups.has(group)) {
        groupOrder.push(group);
        groups.set(group, []);
      }
      groups.get(group)?.push(item);
    } else {
      ungrouped.push(item);
    }
  }

  const result: ItemGroup<TAux>[] = groupOrder.map((heading) => ({ heading, items: groups.get(heading) ?? [] }));
  if (ungrouped.length > 0) result.push({ heading: null, items: ungrouped });
  return result;
}
