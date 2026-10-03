import type { ReactNode } from "react";
import { useSyncExternalStore } from "react";
import { Theme, useThemeContext } from "@radix-ui/themes";

/** Resolve whether the system is currently in dark mode, reactively. */
function useSystemDark() {
  return useSyncExternalStore(
    (cb) => {
      const mq = window.matchMedia("(prefers-color-scheme: dark)");
      mq.addEventListener("change", cb);
      const obs = new MutationObserver(cb);
      obs.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
      return () => {
        mq.removeEventListener("change", cb);
        obs.disconnect();
      };
    },
    () =>
      document.documentElement.classList.contains("dark") ||
      (!document.documentElement.classList.contains("light") &&
        window.matchMedia("(prefers-color-scheme: dark)").matches),
    () => false,
  );
}

/**
 * Inverted-section wrapper. Renders a nested <Theme> at the OPPOSITE of the
 * resolved appearance, so children use the default --ds-* roles and flip
 * automatically with the system mode. This is the mechanism for inverted /
 * emphasised sections — not a fixed inverse colour set.
 */
export function Contrast({ children }: { children: ReactNode }) {
  const { appearance } = useThemeContext();
  const systemDark = useSystemDark();
  const resolvedDark = appearance === "dark" || (appearance === "inherit" && systemDark);
  return <Theme appearance={resolvedDark ? "light" : "dark"}>{children}</Theme>;
}
