/* useTreeFocus.logic.test.ts — the PURE decision helpers of the lifted tree-focus hook (DECISIONS [[catalog-as-specification]] /
 * [[tree-list]]), unit-tested in the node lane with no DOM. The hook's DOM-integration behaviours (arrow / expand /
 * collapse / roving tab-stop repair / typeahead jump / controlled expansion / aria-selected) are covered
 * by the browser plays in _internal/TreeList behavior. Here we pin the extracted logic the hook and
 * TreeList both call: collectExpandedKeys, findInitialTabbableId, the level-scan-to-parent, and the
 * typeahead-buffer matcher. */

import { describe, it, expect } from "vitest";
import {
  collectExpandedKeys,
  findInitialTabbableId,
  findParentIndexByLevel,
  matchTypeahead,
  DEFAULT_TYPEAHEAD_RESET_MS,
  type TreeNodeLike,
} from "./useTreeFocus";

/* A small fixture tree:
     src (expanded)
       app.tsx
       ui (collapsed)         ← has children, NOT expanded
         Button.tsx
     package.json (disabled)
     README.md (selected)
*/
const TREE: TreeNodeLike[] = [
  {
    id: "src",
    isExpanded: true,
    children: [
      { id: "app.tsx" },
      { id: "ui", children: [{ id: "Button.tsx" }] },
    ],
  },
  { id: "pkg", isDisabled: true },
  { id: "readme", isSelected: true },
];

describe("collectExpandedKeys", () => {
  it("collects ids of expanded items that actually have children", () => {
    expect(collectExpandedKeys(TREE)).toEqual(["src"]);
  });

  it("ignores isExpanded on a leaf (no children)", () => {
    expect(collectExpandedKeys([{ id: "a", isExpanded: true }])).toEqual([]);
  });

  it("recurses into collapsed subtrees too (so a deep pre-expanded node is seeded)", () => {
    const deep: TreeNodeLike[] = [
      { id: "root", children: [{ id: "mid", isExpanded: true, children: [{ id: "leaf" }] }] },
    ];
    // `root` is not expanded, but the recursion still finds the expanded `mid` within it.
    expect(collectExpandedKeys(deep)).toEqual(["mid"]);
  });

  it("returns an empty array for an empty tree", () => {
    expect(collectExpandedKeys([])).toEqual([]);
  });
});

describe("findInitialTabbableId", () => {
  it("prefers the first selected enabled item (even nested)", () => {
    expect(findInitialTabbableId(TREE)).toBe("readme");
  });

  it("falls back to the first enabled item when nothing is selected", () => {
    const t: TreeNodeLike[] = [{ id: "a", isDisabled: true }, { id: "b" }, { id: "c" }];
    expect(findInitialTabbableId(t)).toBe("b");
  });

  it("finds a selected item nested inside a subtree before a later enabled root", () => {
    const t: TreeNodeLike[] = [
      { id: "a", children: [{ id: "a1", isSelected: true }] },
      { id: "b" },
    ];
    expect(findInitialTabbableId(t)).toBe("a1");
  });

  it("skips a selected-but-disabled item and takes the first enabled instead", () => {
    const t: TreeNodeLike[] = [{ id: "a", isSelected: true, isDisabled: true }, { id: "b" }];
    expect(findInitialTabbableId(t)).toBe("b");
  });

  it("falls back to the very first item when every item is disabled", () => {
    const t: TreeNodeLike[] = [{ id: "a", isDisabled: true }, { id: "b", isDisabled: true }];
    expect(findInitialTabbableId(t)).toBe("a");
  });

  it("returns undefined for an empty tree", () => {
    expect(findInitialTabbableId([])).toBeUndefined();
  });
});

describe("findParentIndexByLevel", () => {
  // Visible order + aria-levels for the expanded fixture:
  //   0 src(1)  1 app.tsx(2)  2 ui(2)  3 pkg(1)  4 readme(1)
  const levels = [1, 2, 2, 1, 1];

  it("finds the nearest shallower ancestor scanning upward", () => {
    // app.tsx (index 1, level 2) → src (index 0, level 1)
    expect(findParentIndexByLevel(levels, 1)).toBe(0);
    // ui (index 2, level 2) → src (index 0, level 1), NOT app.tsx (same level 2)
    expect(findParentIndexByLevel(levels, 2)).toBe(0);
  });

  it("returns -1 for a root-level item (no shallower ancestor above it)", () => {
    expect(findParentIndexByLevel(levels, 0)).toBe(-1);
    expect(findParentIndexByLevel(levels, 3)).toBe(-1);
  });

  it("returns -1 for an out-of-range index", () => {
    expect(findParentIndexByLevel(levels, -1)).toBe(-1);
    expect(findParentIndexByLevel(levels, 99)).toBe(-1);
  });

  it("crosses siblings to reach a deeper item's true parent", () => {
    // levels: root(1) child(2) grandchild(3) — grandchild's parent is child, not root.
    expect(findParentIndexByLevel([1, 2, 3], 2)).toBe(1);
  });
});

describe("matchTypeahead", () => {
  const texts = ["src", "app.tsx", "ui", "package.json", "readme"];

  it("jumps to the next item whose text starts with the query", () => {
    // from src (0), 'a' → app.tsx (1)
    expect(matchTypeahead(texts, "a", 0)).toBe(1);
  });

  it("multi-character buffer narrows the match", () => {
    // 'pac' → package.json (3)
    expect(matchTypeahead(texts, "pac", 0)).toBe(3);
  });

  it("is case-insensitive and trims surrounding whitespace", () => {
    expect(matchTypeahead(["  Readme  "], "readme", -1)).toBe(0);
  });

  it("searches AFTER the current item, then wraps around to include it last", () => {
    // two 'r' items: index 1 and 4; from index 2, wrap finds index 4 first... here single 'r':
    const t = ["ra", "x", "rb"];
    // from index 0 (ra), 'r' → next match after 0 is rb (2), not ra itself.
    expect(matchTypeahead(t, "r", 0)).toBe(2);
    // from index 2 (rb), 'r' → wraps to ra (0).
    expect(matchTypeahead(t, "r", 2)).toBe(0);
  });

  it("skips disabled items", () => {
    // from -1, 'u' → ui (2); mark 2 disabled → no other 'u' → -1.
    expect(matchTypeahead(texts, "u", -1)).toBe(2);
    expect(matchTypeahead(texts, "u", -1, (i) => i === 2)).toBe(-1);
  });

  it("returns -1 on an empty query or empty list", () => {
    expect(matchTypeahead(texts, "", 0)).toBe(-1);
    expect(matchTypeahead([], "a", 0)).toBe(-1);
  });

  it("returns -1 when nothing matches", () => {
    expect(matchTypeahead(texts, "zzz", 0)).toBe(-1);
  });
});

describe("DEFAULT_TYPEAHEAD_RESET_MS", () => {
  it("is the APG-conventional 500ms buffer window", () => {
    expect(DEFAULT_TYPEAHEAD_RESET_MS).toBe(500);
  });
});
