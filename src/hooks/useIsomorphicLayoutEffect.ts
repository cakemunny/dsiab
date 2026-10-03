// Copyright (c) Meta Platforms, Inc. and affiliates.
// Portions derived from facebook/astryx packages/core/src/hooks/useIsomorphicLayoutEffect.ts @ 88c95e4 (MIT, © Meta Platforms)

/* useIsomorphicLayoutEffect — SSR-safe layout-effect switch: useLayoutEffect on the client, useEffect on
 * the server (where React warns about useLayoutEffect but neither fires during render anyway). LIFTED from
 * Astryx (facebook/astryx `@astryxdesign/core` v0.1.4, commit 88c95e4,
 * `packages/core/src/hooks/useIsomorphicLayoutEffect.ts`) under the port doctrine (DECISIONS [[catalog-as-specification]]), adapted to our naming. */


/**
 * @file useIsomorphicLayoutEffect.ts
 * @input React useLayoutEffect, useEffect
 * @output Exports useIsomorphicLayoutEffect
 * @position Internal utility; used by components that need useLayoutEffect
 *   but must avoid the SSR warning React emits when useLayoutEffect runs
 *   on the server (where there is no DOM to synchronously measure).
 *
 * On the client this is useLayoutEffect; on the server it falls back to
 * useEffect (which is a no-op during SSR anyway). The runtime behavior is
 * identical — neither hook fires during server rendering — but React only
 * warns about useLayoutEffect.
 */

import {useEffect, useLayoutEffect} from 'react';

export const useIsomorphicLayoutEffect =
  typeof window !== 'undefined' ? useLayoutEffect : useEffect;
