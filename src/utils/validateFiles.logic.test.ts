// Copyright (c) Meta Platforms, Inc. and affiliates.

/**
 * @file validateFiles.logic.test.ts
 * @input Uses vitest, validateFiles
 * @output Unit tests for the lifted constraint filter (accept / maxSize / maxFiles, partial acceptance)
 * @position Testing; validates validateFiles.ts. The function is LIFTED from Astryx
 *   (`packages/core/src/FileInput/FileInput.tsx`, commit 88c95e4) under DECISIONS [[catalog-as-specification]]; upstream ships NO
 *   tests for it, so this coverage is NET-NEW — including a MIXED partial-acceptance case (some files
 *   survive WHILE siblings are rejected) that upstream never exercises.
 *
 * SYNC: When validateFiles.ts changes, update tests to match new behavior.
 */

import { describe, it, expect } from "vitest";
import { validateFiles } from "./validateFiles";

const MB = 1024 * 1024;

// A minimal File stand-in — validateFiles only reads name / type / size, so a cast plain object avoids
// allocating real (potentially huge) File bodies just to exercise the size branch.
const mkFile = (name: string, type: string, size: number): File =>
  ({ name, type, size }) as unknown as File;

describe("validateFiles — all accepted", () => {
  it("returns every file and no errors when all pass accept + size + count", () => {
    const a = mkFile("a.png", "image/png", 1000);
    const b = mkFile("b.jpg", "image/jpeg", 2000);
    const { valid, errors } = validateFiles([a, b], ".png,.jpg", 5 * MB, 5, true);
    expect(valid).toEqual([a, b]);
    expect(errors).toEqual([]);
  });

  it("no constraints → passthrough (single-file field)", () => {
    const a = mkFile("resume.pdf", "application/pdf", 10 * MB);
    const { valid, errors } = validateFiles([a], undefined, undefined, undefined, false);
    expect(valid).toEqual([a]);
    expect(errors).toEqual([]);
  });
});

describe("validateFiles — all rejected", () => {
  it("wrong type → valid is empty, one error per file", () => {
    const gif = mkFile("cat.gif", "image/gif", 1000);
    const txt = mkFile("notes.txt", "text/plain", 1000);
    const { valid, errors } = validateFiles([gif, txt], ".png,.jpg", undefined, undefined, true);
    expect(valid).toEqual([]);
    expect(errors).toHaveLength(2);
    expect(errors[0]).toContain("cat.gif");
    expect(errors[1]).toContain("notes.txt");
  });

  it("oversize → valid is empty, error names the limit", () => {
    const big = mkFile("video.mov", "video/quicktime", 82 * MB);
    const { valid, errors } = validateFiles([big], undefined, 5 * MB, undefined, false);
    expect(valid).toEqual([]);
    expect(errors).toEqual(['"video.mov" exceeds 5.0 MB limit']);
  });
});

describe("validateFiles — MIXED partial acceptance (upstream never tests this)", () => {
  it("keeps the good files AND reports the rejected ones by wrong type", () => {
    const png = mkFile("keep.png", "image/png", 1000);
    const gif = mkFile("cat.gif", "image/gif", 1000);
    const jpg = mkFile("also.jpg", "image/jpeg", 1000);
    const { valid, errors } = validateFiles([png, gif, jpg], ".png,.jpg", undefined, undefined, true);
    // partial: the two accepted survive, the one wrong-type is dropped but named.
    expect(valid).toEqual([png, jpg]);
    expect(errors).toHaveLength(1);
    expect(errors[0]).toContain("cat.gif");
  });

  it("filters PROGRESSIVELY: a wrong-type is dropped before the size check, an oversize after it", () => {
    const good = mkFile("ok.png", "image/png", 1000);
    const wrongType = mkFile("bad.gif", "image/gif", 1000);
    const tooBig = mkFile("huge.png", "image/png", 82 * MB);
    const { valid, errors } = validateFiles([good, wrongType, tooBig], ".png", 5 * MB, undefined, true);
    expect(valid).toEqual([good]);
    expect(errors).toEqual([
      '"bad.gif" is not an accepted file type',
      '"huge.png" exceeds 5.0 MB limit',
    ]);
  });

  it("slices to maxFiles (multiple only) but keeps that surviving subset, plus the aggregate error", () => {
    const f = (n: number) => mkFile(`f${n}.png`, "image/png", 1000);
    const batch = [f(1), f(2), f(3), f(4), f(5)];
    const { valid, errors } = validateFiles(batch, ".png", undefined, 3, true);
    expect(valid).toHaveLength(3);
    expect(valid).toEqual([batch[0], batch[1], batch[2]]); // first 3 kept
    expect(errors).toEqual(["Maximum 3 files allowed"]);
  });

  it("maxFiles is IGNORED when not multiple (single-file field never slices)", () => {
    const a = mkFile("a.png", "image/png", 1000);
    const b = mkFile("b.png", "image/png", 1000);
    const { valid, errors } = validateFiles([a, b], undefined, undefined, 1, false);
    expect(valid).toEqual([a, b]); // no slice — isMultiple=false gates the maxFiles branch
    expect(errors).toEqual([]);
  });
});
