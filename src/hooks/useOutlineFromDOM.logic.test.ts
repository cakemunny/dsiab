/* useOutlineFromDOM.logic.test.ts — node-lane coverage for the PURE outline helpers (slugify /
 * uniqueSlug / levelForElement), the extracted core of useOutlineFromDOM (DECISIONS [[catalog-as-specification]], D6). The DOM
 * scan + MutationObserver are the DOM half, exercised by the _internal Outline plays. */

import { describe, it, expect } from "vitest";
import { slugify, uniqueSlug, levelForElement } from "./useOutlineFromDOM";

describe("slugify", () => {
  it("lower-cases and hyphenates words", () => {
    expect(slugify("Getting Started")).toBe("getting-started");
    expect(slugify("Hello World!")).toBe("hello-world");
  });
  it("drops punctuation and collapses whitespace", () => {
    expect(slugify("  A/B   Testing  ")).toBe("ab-testing");
    expect(slugify("Multiple   spaces")).toBe("multiple-spaces");
    expect(slugify("under_scored_text")).toBe("under-scored-text");
  });
  it("trims edge hyphens and returns empty for symbol-only text", () => {
    expect(slugify("— Section —")).toBe("section");
    expect(slugify("!!!")).toBe("");
  });
});

describe("uniqueSlug", () => {
  it("returns the base when unused and records it", () => {
    const used = new Set<string>();
    expect(uniqueSlug("intro", used)).toBe("intro");
    expect(used.has("intro")).toBe(true);
  });
  it("appends -1, -2 … on collisions", () => {
    const used = new Set<string>();
    expect(uniqueSlug("intro", used)).toBe("intro");
    expect(uniqueSlug("intro", used)).toBe("intro-1");
    expect(uniqueSlug("intro", used)).toBe("intro-2");
  });
  it("falls back to 'section' for an empty base", () => {
    const used = new Set<string>();
    expect(uniqueSlug("", used)).toBe("section");
    expect(uniqueSlug("", used)).toBe("section-1");
  });
});

describe("levelForElement", () => {
  it("reads the level from an hN tag", () => {
    expect(levelForElement({ tagName: "H1" })).toBe(1);
    expect(levelForElement({ tagName: "h3" })).toBe(3);
    expect(levelForElement({ tagName: "H6" })).toBe(6);
  });
  it("honors a data-outline-level override, clamped to 1–6", () => {
    expect(levelForElement({ tagName: "DIV", dataset: { outlineLevel: "2" } })).toBe(2);
    expect(levelForElement({ tagName: "DIV", dataset: { outlineLevel: "9" } })).toBe(6);
    expect(levelForElement({ tagName: "DIV", dataset: { outlineLevel: "0" } })).toBe(1);
  });
  it("defaults to level 1 for a non-heading with no override", () => {
    expect(levelForElement({ tagName: "DIV" })).toBe(1);
    expect(levelForElement({ tagName: "SPAN", dataset: {} })).toBe(1);
  });
});
