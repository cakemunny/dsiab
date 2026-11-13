/* The one write of a brand colour ([[brand-colour-setting]]): six-digit hex for every accepted
   syntax, and the parser's own reason for a refusal. */
import { describe, expect, it } from "vitest";
import { parseSeed } from "./parseSeed";
import { storedSeed } from "./storedSeed";

describe("storedSeed", () => {
  it.each([
    ["#3B82F6", "#3b82f6"],
    ["#fa0", "#ffaa00"],
    ["  #ff6b5e  ", "#ff6b5e"],
    ["rgb(59, 130, 246)", "#3b82f6"],
    ["hsl(0 100% 50%)", "#ff0000"],
  ])("stores %j as %s", (input, hex) => {
    expect(storedSeed(input)).toEqual({ ok: true, hex });
  });

  it("stores an oklch() colour as the hex the parser reads it as", () => {
    const input = "oklch(0.6 0.15 250)";
    const p = parseSeed(input);
    if (!p.ok) throw new Error(p.reason);
    const r = storedSeed(input);
    expect(r.ok && /^#[0-9a-f]{6}$/.test(r.hex)).toBe(true);
    expect(r).toEqual({ ok: true, hex: `#${[p.rgb.r, p.rgb.g, p.rgb.b].map((v) => Math.round(v).toString(16).padStart(2, "0")).join("")}` });
  });

  it.each(["", "teal", "#3b8z", "rgba(1, 2, 3, 1)", "rgba(1, 2, 3, 0.5)", "#ffffff"])("refuses %j with the parser's reason", (input) => {
    const p = parseSeed(input);
    expect(p.ok).toBe(false);
    if (p.ok) return;
    expect(storedSeed(input)).toEqual({ ok: false, reason: p.reason });
  });
});
