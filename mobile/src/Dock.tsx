import { BlurView } from "expo-blur";
import { GlassView, isLiquidGlassAvailable } from "expo-glass-effect";
import { Platform, Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Svg, { Circle, Path } from "react-native-svg";
import { DOCK_TABS, type DockTab } from "./messages";
import { loadQuarterTabBar } from "../modules/quarter-tabbar";

/** The system tab bar (a real UITabBar, so iOS 26 draws it as Liquid Glass). Only present in a build made after it was added; otherwise the glass pill below is used. */
const NativeBar = Platform.OS === "ios" ? loadQuarterTabBar() : null;
const SYMBOLS: Record<DockTab, string> = { today: "house", skills: "map", plan: "flag", search: "magnifyingglass" };

/**
 * The tab dock: Today, Skills, Plan, Me. A floating pill of Liquid Glass on iOS 26 (a frosted blur on older iPhones), with quarter's pink
 * on the selected tab's icon and border. The page draws the screens; this only says which one to open. The icons are the same drawings as the site's.
 */
const PINK = "#d9477f", PINK_SOFT = "#f8dae6", INK = "#3b3a4f";
const ICONS: Record<DockTab, (c: string) => React.ReactNode> = {
  today: (c) => <><Path d="M3.5 11 12 3.5 20.5 11" stroke={c} /><Path d="M5.5 9.5V20h5v-5.5h3V20h5V9.5" stroke={c} /></>,
  skills: (c) => <><Circle cx="6" cy="18" r="2.2" stroke={c} /><Circle cx="18" cy="6" r="2.2" stroke={c} /><Path d="M8.2 18H14a3 3 0 0 0 0-6h-3a3 3 0 0 1 0-6h4.8" stroke={c} /></>,
  plan: (c) => <><Path d="M5.5 21V4" stroke={c} /><Path d="M5.5 4.5h11l-2.2 4 2.2 4h-11" stroke={c} /></>,
  search: (c) => <><Circle cx="11" cy="11" r="6.5" stroke={c} /><Path d="m16 16 4.5 4.5" stroke={c} /></>,
};

export function Dock({ tab, onSelect }: { tab: DockTab | "none"; onSelect: (t: DockTab) => void }) {
  const inset = useSafeAreaInsets();
  if (NativeBar) {
    return (
      <View style={{ height: 49 + inset.bottom }} accessibilityRole="tablist">
        <NativeBar style={{ flex: 1 }} tint={PINK} selected={tab === "none" ? null : tab}
          items={DOCK_TABS.map((t) => ({ id: t.id, title: t.label, symbol: SYMBOLS[t.id] }))}
          onSelect={(e) => { const id = e.nativeEvent.id; if (DOCK_TABS.some((t) => t.id === id)) onSelect(id as DockTab); }} />
      </View>
    );
  }
  const glass = Platform.OS === "ios" && isLiquidGlassAvailable();
  const items = DOCK_TABS.map((t) => {
    const on = t.id === tab, colour = on ? PINK : INK;
    return (
      <Pressable key={t.id} onPress={() => onSelect(t.id)} accessibilityRole="tab" accessibilityState={{ selected: on }} accessibilityLabel={t.label} style={styles.item} hitSlop={4}>
        <View style={[styles.iconWrap, on && styles.iconOn]}>
          <Svg width={24} height={24} viewBox="0 0 24 24" fill="none" strokeWidth={1.9} strokeLinecap="round" strokeLinejoin="round">{ICONS[t.id](colour)}</Svg>
        </View>
        <Text style={[styles.label, { color: colour }, on && styles.labelOn]}>{t.label}</Text>
      </Pressable>
    );
  });
  // The dock sits below the page, not over it, so nothing scrolls underneath and every icon is easy to read
  return (
    <View style={[styles.wrap, { paddingBottom: Math.max(inset.bottom, 10) }]} accessibilityRole="tablist">
      {glass
        ? <GlassView glassEffectStyle="regular" tintColor="#ffffff66" isInteractive style={styles.pill}>{items}</GlassView>
        : <BlurView intensity={90} tint="systemChromeMaterialLight" style={[styles.pill, styles.blurred]}>{items}</BlurView>}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: "center", paddingTop: 8, backgroundColor: "#faf5ea", borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: "#18192b22" },
  pill: { flexDirection: "row", alignItems: "center", paddingHorizontal: 10, paddingVertical: 6, borderRadius: 34, gap: 2, minWidth: 280, justifyContent: "space-around", overflow: "hidden" },
  blurred: { borderWidth: StyleSheet.hairlineWidth, borderColor: "#18192b22", shadowColor: "#18192b", shadowOpacity: 0.16, shadowRadius: 18, shadowOffset: { width: 0, height: 6 } },
  item: { alignItems: "center", justifyContent: "center", minWidth: 64, paddingVertical: 2, gap: 1 },
  iconWrap: { paddingHorizontal: 16, paddingVertical: 5, borderRadius: 999, borderWidth: 1.5, borderColor: "transparent" },
  iconOn: { backgroundColor: PINK_SOFT + "cc", borderColor: PINK },
  label: { fontSize: 11, fontWeight: "700", letterSpacing: 0.2 },
  labelOn: { fontWeight: "800" },
});
