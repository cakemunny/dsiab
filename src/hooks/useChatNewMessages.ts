// Copyright (c) Meta Platforms, Inc. and affiliates.
//
// Portions derived from facebook/astryx packages/core/src/Chat/useChatNewMessages.ts @ d7c9a39b
// (MIT, © Meta Platforms) — the new-message detector behind the transcript's "new messages" affordance:
// it watches the content element for size changes, and flags whenever the LAST message element changes
// identity while the scroll is unlocked (locked means the reader is already at the bottom watching them
// arrive). The same resize callback is the streaming pump — it fires `onResize` on every height change
// so the scroll engine can follow growing content.
//
// One divergence from the source: messages are found by the `data-ds-chat-message` ATTRIBUTE rather
// than a class name, so styling can never accidentally break message detection. The attribute name is
// exported as `CHAT_MESSAGE_ATTR` — the component that stamps it and the engine that reads it share
// one constant and cannot drift apart.

import { useCallback, useEffect, useRef, useState } from "react";
import { observeResize, unobserveResize } from "../utils/sharedResizeObserver";

/** The attribute a transcript stamps on every message element. Stamp it; don't hand-write the string. */
export const CHAT_MESSAGE_ATTR = "data-ds-chat-message";

/** CSS selector form of `CHAT_MESSAGE_ATTR`. */
const CHAT_MESSAGE_SELECTOR = `[${CHAT_MESSAGE_ATTR}]`;

export interface UseChatNewMessagesOptions {
  /**
   * Whether the scroll is currently locked (following content). While locked, arriving messages do
   * NOT flag — the reader is already at the bottom and can see them.
   */
  isLocked: boolean;
  /**
   * Called on every content height change (a new message, or streaming growth of the last one).
   * Wire it to the scroll engine's `scrollIfLocked`.
   */
  onResize?: () => void;
}

export interface UseChatNewMessagesReturn {
  /** Whether messages arrived while the scroll was unlocked. */
  hasNewMessages: boolean;
  /** Clear the flag (the reader has acknowledged them). */
  dismiss: () => void;
  /**
   * Callback ref for the content element (the element that wraps the messages, NOT the scroll
   * container). Handles a late mount and an element swap — the observer attaches whenever the
   * element appears, with no state or version counter.
   */
  contentRef: (el: HTMLElement | null) => void;
}

/**
 * Track whether new messages arrived while the reader was scrolled away, and pump content-growth
 * notifications to the scroll engine. Returns the flag, a `dismiss`, and the callback ref to attach.
 *
 * The hook OWNS its content element in the shared ResizeObserver: that observer holds one callback
 * per element, so a second `observeResize` on the same element would silently replace this one.
 * Never point another observer at the element passed to `contentRef`.
 *
 * @example
 * const { hasNewMessages, dismiss, contentRef } = useChatNewMessages({ isLocked, onResize: scrollIfLocked });
 */
export function useChatNewMessages({
  isLocked,
  onResize,
}: UseChatNewMessagesOptions): UseChatNewMessagesReturn {
  const [hasNewMessages, setHasNewMessages] = useState(false);
  const lastMessageRef = useRef<Element | null>(null);

  // Mirrored into refs so the resize callback always reads the CURRENT values without the observer
  // having to be re-registered on every render (re-registering would drop the flag's continuity).
  const isLockedRef = useRef(isLocked);
  isLockedRef.current = isLocked;
  const onResizeRef = useRef(onResize);
  onResizeRef.current = onResize;

  // The element currently observed, and the teardown that releases it.
  const elementRef = useRef<HTMLElement | null>(null);
  const cleanupRef = useRef<(() => void) | null>(null);

  const attach = useCallback((el: HTMLElement) => {
    // The callback deliberately ignores the ResizeObserverEntry: `observeResize` fires ONCE
    // synchronously on registration with a partial `{ target }` entry whose `contentRect` is
    // undefined, and everything here is read off the element anyway.
    observeResize(el, () => {
      onResizeRef.current?.();

      const messages = el.querySelectorAll(CHAT_MESSAGE_SELECTOR);
      const last = messages.length > 0 ? messages[messages.length - 1] : null;

      if (last && last !== lastMessageRef.current) {
        lastMessageRef.current = last;
        if (!isLockedRef.current) setHasNewMessages(true);
      }
    });

    cleanupRef.current = () => unobserveResize(el);
  }, []);

  const detach = useCallback(() => {
    cleanupRef.current?.();
    cleanupRef.current = null;
  }, []);

  const contentRef = useCallback(
    (el: HTMLElement | null) => {
      if (el === elementRef.current) return;
      detach();
      elementRef.current = el;
      if (el) attach(el);
    },
    [attach, detach],
  );

  useEffect(() => detach, [detach]);

  const dismiss = useCallback(() => setHasNewMessages(false), []);

  return { hasNewMessages, dismiss, contentRef };
}
