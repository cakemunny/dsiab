// Copyright (c) Meta Platforms, Inc. and affiliates.
// Portions derived from facebook/astryx packages/core/src/hooks/useAnnounce.ts @ 9daca871 (MIT, © Meta Platforms)

import { useCallback } from "react";

/* useAnnounce — imperative screen-reader announcements through a persistently-mounted, visually-hidden
 * live-region pair. LIFTED from Astryx (facebook/astryx `@astryxdesign/core` v0.1.4, commit 9daca871,
 * `hooks/useAnnounce.ts`) under the port doctrine (DECISIONS [[catalog-as-specification]]), adapted to our naming.
 *
 * Why a module-level singleton and not a per-component region: many screen readers will NOT announce
 * content injected into a live region that is created together with its content ("born with content").
 * Mounting the regions ONCE, empty, and only mutating their text later is what makes updates reliable —
 * a per-component <div aria-live> rendered with its message is silently dropped. The clear-then-rAF-reset
 * guarantees the mutation is observed even when the new text equals the current text (AT dedupe identical
 * content), and that the reset isn't coalesced with the clear. */

export type AnnouncePoliteness = "polite" | "assertive";

const CONTAINER_ATTR = "data-ds-live-region";
const VISUALLY_HIDDEN =
  "position:absolute;width:1px;height:1px;margin:-1px;padding:0;overflow:hidden;" +
  "clip:rect(0,0,0,0);white-space:nowrap;border:0;inset-block-start:0;inset-inline-start:0;" +
  "pointer-events:none;user-select:none;";

interface LiveRegions {
  polite: HTMLElement;
  assertive: HTMLElement;
}
let regions: LiveRegions | null = null;
// The in-flight re-set rAF per region — cancelled by a newer announce or a clear, so a just-cleared
// region can't be re-populated by a stale pending frame.
const pendingRaf: Record<AnnouncePoliteness, number | null> = { polite: null, assertive: null };

function createRegion(politeness: AnnouncePoliteness): HTMLElement {
  const el = document.createElement("div");
  el.setAttribute(CONTAINER_ATTR, politeness);
  el.setAttribute("aria-live", politeness);
  el.setAttribute("aria-atomic", "true");
  el.setAttribute("role", politeness === "assertive" ? "alert" : "status");
  el.style.cssText = VISUALLY_HIDDEN;
  document.body.appendChild(el);
  return el;
}

function getRegions(): LiveRegions | null {
  if (typeof document === "undefined") return null;
  if (regions) {
    // Re-attach if a region was removed (e.g. by a test cleanup).
    if (!regions.polite.isConnected) document.body.appendChild(regions.polite);
    if (!regions.assertive.isConnected) document.body.appendChild(regions.assertive);
    return regions;
  }
  regions = { polite: createRegion("polite"), assertive: createRegion("assertive") };
  return regions;
}

function announceMessage(message: string, politeness: AnnouncePoliteness): void {
  const r = getRegions();
  if (!r) return;
  const target = politeness === "assertive" ? r.assertive : r.polite;
  if (pendingRaf[politeness] != null) cancelAnimationFrame(pendingRaf[politeness]!);
  target.textContent = "";
  // Re-set on the NEXT frame (not the same tick) so the mutation isn't coalesced with the clear.
  pendingRaf[politeness] = requestAnimationFrame(() => {
    target.textContent = message;
    pendingRaf[politeness] = null;
  });
}

function clearRegion(politeness: AnnouncePoliteness): void {
  if (pendingRaf[politeness] != null) {
    cancelAnimationFrame(pendingRaf[politeness]!);
    pendingRaf[politeness] = null;
  }
  if (!regions) return;
  (politeness === "assertive" ? regions.assertive : regions.polite).textContent = "";
}

/** Returns `announce(message, politeness?)`. An empty message CLEARS any lingering status (used when a
 *  query is cleared) rather than announcing nothing. */
export function useAnnounce() {
  return useCallback((message: string, politeness: AnnouncePoliteness = "polite") => {
    if (!message) {
      clearRegion(politeness);
      return;
    }
    announceMessage(message, politeness);
  }, []);
}
