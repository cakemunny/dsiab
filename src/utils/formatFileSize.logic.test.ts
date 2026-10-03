// Copyright (c) Meta Platforms, Inc. and affiliates.

/**
 * @file formatFileSize.logic.test.ts
 * @input Uses vitest, formatFileSize
 * @output Unit tests for the lifted byte-size formatter
 * @position Testing; validates formatFileSize.ts. The function is LIFTED from Astryx
 *   (`packages/core/src/FileInput/FileInput.tsx`, commit 88c95e4) under DECISIONS [[catalog-as-specification]]; upstream ships
 *   NO tests for it, so this boundary coverage (B / KB / MB, binary 1024) is NET-NEW.
 *
 * SYNC: When formatFileSize.ts changes, update tests to match new behavior.
 */

import { describe, it, expect } from "vitest";
import { formatFileSize } from "./formatFileSize";

const KB = 1024;
const MB = 1024 * 1024;

describe("formatFileSize — bytes (< 1 KiB)", () => {
  it("renders whole bytes with a B suffix, no decimal", () => {
    expect(formatFileSize(0)).toBe("0 B");
    expect(formatFileSize(1)).toBe("1 B");
    expect(formatFileSize(512)).toBe("512 B");
    expect(formatFileSize(1023)).toBe("1023 B"); // one byte below the KB boundary
  });
});

describe("formatFileSize — kilobytes (1 KiB ≤ x < 1 MiB)", () => {
  it("crosses into KB exactly at 1024 with a 1-decimal value", () => {
    expect(formatFileSize(KB)).toBe("1.0 KB");
    expect(formatFileSize(1536)).toBe("1.5 KB"); // 1.5 * 1024
    expect(formatFileSize(2.4 * KB)).toBe("2.4 KB");
  });

  it("stays in KB right up to the MB boundary (rounds, does not roll over early)", () => {
    // 1 MiB - 1 byte → 1048575 / 1024 = 1023.999… → toFixed(1) rounds to "1024.0 KB" (still KB, not MB).
    expect(formatFileSize(MB - 1)).toBe("1024.0 KB");
  });
});

describe("formatFileSize — megabytes (≥ 1 MiB)", () => {
  it("crosses into MB exactly at 1048576 with a 1-decimal value", () => {
    expect(formatFileSize(MB)).toBe("1.0 MB");
    expect(formatFileSize(2.4 * MB)).toBe("2.4 MB");
    expect(formatFileSize(82 * MB)).toBe("82.0 MB");
  });
});
