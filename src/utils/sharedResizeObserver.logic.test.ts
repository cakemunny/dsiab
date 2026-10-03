// Copyright (c) Meta Platforms, Inc. and affiliates.
// Portions derived from facebook/astryx packages/core/src/utils/sharedResizeObserver.test.ts @ 88c95e4 (MIT, © Meta Platforms)

/* sharedResizeObserver.logic.test.ts — the 6 upstream Astryx cases (commit 88c95e4,
 * `utils/sharedResizeObserver.test.ts`), ported to the NODE lane (vitest.node.config.ts, DECISIONS [[catalog-as-specification]]).
 * Runs in a pure-node environment (no DOM), so "elements" are plain objects used only as Map keys — the
 * observer never touches them beyond identity, and observe/unobserve/disconnect are mocked. `vi.resetModules`
 * + a dynamic import per test gives each case a FRESH module singleton (the observer is module-level state). */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// A fake element — sharedResizeObserver uses it only as a Map key and passes it straight to the mocked
// observe/unobserve, so no real DOM is needed.
const fakeEl = (id: string) => ({ id }) as unknown as Element;

describe("sharedResizeObserver", () => {
  let mockObserve: ReturnType<typeof vi.fn>;
  let mockUnobserve: ReturnType<typeof vi.fn>;
  let mockDisconnect: ReturnType<typeof vi.fn>;
  let capturedCallback: ResizeObserverCallback;
  let constructorCalls: number;

  beforeEach(() => {
    mockObserve = vi.fn();
    mockUnobserve = vi.fn();
    mockDisconnect = vi.fn();
    constructorCalls = 0;

    // A class (not a vi.fn arrow) so `new ResizeObserver(...)` is genuinely constructable. Redefined each
    // test so it closes over the fresh mocks. Mirrors the FakeResizeObserver idiom in useOverflow.test.ts.
    class FakeResizeObserver {
      observe = mockObserve;
      unobserve = mockUnobserve;
      disconnect = mockDisconnect;
      constructor(cb: ResizeObserverCallback) {
        constructorCalls++;
        capturedCallback = cb;
      }
    }
    vi.stubGlobal("ResizeObserver", FakeResizeObserver);
  });

  afterEach(() => {
    vi.resetModules();
    vi.unstubAllGlobals();
  });

  it("creates a single ResizeObserver for multiple elements", async () => {
    const { observeResize, unobserveResize } = await import("./sharedResizeObserver");
    const el1 = fakeEl("el1");
    const el2 = fakeEl("el2");

    observeResize(el1, vi.fn());
    observeResize(el2, vi.fn());

    expect(constructorCalls).toBe(1);
    expect(mockObserve).toHaveBeenCalledTimes(2);
    expect(mockObserve).toHaveBeenCalledWith(el1);
    expect(mockObserve).toHaveBeenCalledWith(el2);

    unobserveResize(el1);
    unobserveResize(el2);
  });

  it("fires callback synchronously on registration", async () => {
    const { observeResize, unobserveResize } = await import("./sharedResizeObserver");
    const el = fakeEl("el");
    const cb = vi.fn();

    observeResize(el, cb);

    expect(cb).toHaveBeenCalledTimes(1);
    expect(cb).toHaveBeenCalledWith(expect.objectContaining({ target: el }));

    unobserveResize(el);
  });

  it("dispatches resize entries to the correct callbacks", async () => {
    const { observeResize, unobserveResize } = await import("./sharedResizeObserver");
    const el1 = fakeEl("el1");
    const el2 = fakeEl("el2");
    const cb1 = vi.fn();
    const cb2 = vi.fn();

    observeResize(el1, cb1);
    observeResize(el2, cb2);

    // Reset counts from the initial synchronous fire.
    cb1.mockClear();
    cb2.mockClear();

    capturedCallback([{ target: el1 } as unknown as ResizeObserverEntry], {} as ResizeObserver);
    expect(cb1).toHaveBeenCalledTimes(1);
    expect(cb2).not.toHaveBeenCalled();

    capturedCallback([{ target: el2 } as unknown as ResizeObserverEntry], {} as ResizeObserver);
    expect(cb2).toHaveBeenCalledTimes(1);

    unobserveResize(el1);
    unobserveResize(el2);
  });

  it("destroys the observer when the last element is unobserved", async () => {
    const { observeResize, unobserveResize } = await import("./sharedResizeObserver");
    const el1 = fakeEl("el1");
    const el2 = fakeEl("el2");

    observeResize(el1, vi.fn());
    observeResize(el2, vi.fn());

    unobserveResize(el1);
    expect(mockDisconnect).not.toHaveBeenCalled();

    unobserveResize(el2);
    expect(mockDisconnect).toHaveBeenCalledTimes(1);
  });

  it("recreates observer after full teardown", async () => {
    const { observeResize, unobserveResize } = await import("./sharedResizeObserver");

    const el1 = fakeEl("el1");
    observeResize(el1, vi.fn());
    unobserveResize(el1);
    expect(constructorCalls).toBe(1);

    const el2 = fakeEl("el2");
    observeResize(el2, vi.fn());
    expect(constructorCalls).toBe(2);

    unobserveResize(el2);
  });

  it("replaces callback when same element is observed twice", async () => {
    const { observeResize, unobserveResize } = await import("./sharedResizeObserver");
    const el = fakeEl("el");
    const cb1 = vi.fn();
    const cb2 = vi.fn();

    observeResize(el, cb1);
    cb1.mockClear();

    observeResize(el, cb2);

    capturedCallback([{ target: el } as unknown as ResizeObserverEntry], {} as ResizeObserver);

    // Only the latest callback fires for subsequent resizes.
    expect(cb1).not.toHaveBeenCalled();
    // cb2: one initial synchronous fire on registration + one from the captured callback.
    expect(cb2).toHaveBeenCalledTimes(2);

    unobserveResize(el);
  });
});
