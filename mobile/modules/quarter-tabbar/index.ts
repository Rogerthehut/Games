import { requireNativeViewManager } from "expo-modules-core";
import type { ComponentType } from "react";
import type { ViewProps } from "react-native";

export interface QuarterTabBarProps extends ViewProps {
  /** The tabs: an id, the words under the icon, and the name of an SF Symbol. */
  items: { id: string; title: string; symbol: string }[];
  /** Which tab is selected, or null for none (on Me and the Parents' area). */
  selected: string | null;
  /** The colour of the selected tab, as #rrggbb. */
  tint?: string;
  onSelect: (event: { nativeEvent: { id: string } }) => void;
}

/** The native tab bar, or null in a build that doesn't contain it yet (an older app, Expo Go): the caller then draws its own. */
export function loadQuarterTabBar(): ComponentType<QuarterTabBarProps> | null {
  try { return requireNativeViewManager("QuarterTabBar") as ComponentType<QuarterTabBarProps>; } catch { return null; }
}
