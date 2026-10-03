import { createContext, useContext } from "react";

/**
 * Where the primary (solid) action anchors within a `ButtonGroup`.
 * - `primary-first` (default): primary on the LEFT in LTR. The system default.
 * - `primary-last`: primary on the RIGHT — the other common convention.
 *
 * Set once at the app root via `Provider`'s `buttonOrder`; a per-`ButtonGroup`
 * `order` prop overrides it for a specific cluster that must deviate.
 */
export type ButtonOrder = "primary-first" | "primary-last";

export const ButtonOrderContext = createContext<ButtonOrder>("primary-first");

/** The active system button order (default `primary-first`). */
export const useButtonOrder = () => useContext(ButtonOrderContext);
