import { useCallback, useRef, type Ref } from "react";

// EVERY OPTION SAYS WHERE IT SITS (Radix #3962, #4110).
//
// Radix's listbox wraps each option in three layers of divs, and it sets no `aria-posinset` or
// `aria-setsize`. The two issues report that VoiceOver with Chrome then announces an option with no
// position and no count. So the open listbox numbers its own options in DOM order, the way a flat
// listbox is counted, and renumbers them whenever its items change. An option that carries its own
// numbering keeps it, which leaves room for a list that renders only part of a longer set.
//
// The listbox node exists only while the menu is open, so the numbering hangs off its ref. React
// calls a ref in the same commit phase as a layout effect, each time the node mounts, so the numbers
// land before the first paint of the open menu. Select and MultiSelect both call it.
const OPTION = '[role="option"]';
const numberedByUs = new WeakSet<Element>();

function numberOptions(listbox: HTMLElement) {
  const options = listbox.querySelectorAll(OPTION);
  const size = String(options.length);
  options.forEach((option, i) => {
    const ownNumbering = option.hasAttribute("aria-posinset") || option.hasAttribute("aria-setsize");
    if (ownNumbering && !numberedByUs.has(option)) return;
    numberedByUs.add(option);
    option.setAttribute("aria-posinset", String(i + 1));
    option.setAttribute("aria-setsize", size);
  });
}

/** A ref callback that numbers the options under the node it receives, renumbers them when the node's
 *  children change, and passes the node on to `ref`. */
export function useOptionNumbering<T extends HTMLElement>(ref?: Ref<T>) {
  const observer = useRef<MutationObserver | null>(null);
  return useCallback(
    (node: T | null) => {
      observer.current?.disconnect();
      observer.current = null;
      if (node) {
        numberOptions(node);
        observer.current = new MutationObserver(() => numberOptions(node));
        observer.current.observe(node, { childList: true, subtree: true });
      }
      if (typeof ref === "function") ref(node);
      else if (ref) ref.current = node;
    },
    [ref],
  );
}
