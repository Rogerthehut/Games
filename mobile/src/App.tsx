import * as FileSystem from "expo-file-system/legacy";
import * as Linking from "expo-linking";
import * as Print from "expo-print";
import * as Sharing from "expo-sharing";
import { StatusBar } from "expo-status-bar";
import * as WebBrowser from "expo-web-browser";
import { Component, useCallback, useEffect, useRef, useState, type ComponentType, type ReactNode } from "react";
import { ActivityIndicator, BackHandler, Platform, Pressable, StyleSheet, Text, View } from "react-native";
import { WebView, type WebViewMessageEvent, type WebViewNavigation } from "react-native-webview";
import { APP_HOST, APP_URL, APP_VERSION, BACKGROUND, USER_AGENT_SUFFIX } from "./config";
import { decideNavigation, deepLink, isAppUrl } from "./links";
import { parseMessage, type FromWeb } from "./messages";
import { isDockSelection, isDockTab, type DockTab } from "./messages";
import { askForReview, biometric, haptic, setReminders } from "./native";

/**
 * quarter on iPhone and iPad: the site in a web view, with the few things a web view can't do handed to the phone
 * (printing, saving files through the share sheet, links to other sites, a little haptic feedback).
 * The page tells the app it is inside it with `window.__quarterNative`; see the web app's src/native/bridge.ts for the other half.
 */
/** react-native-webview 14's own prop types don't resolve under React 19's JSX types (every prop becomes `never`), so the component is used through a plain props type. The handlers below are still typed. */
const Web = WebView as unknown as ComponentType<Record<string, unknown> & { ref?: React.Ref<WebView> }>;
/** What this build of the app can do. The site checks this list before asking, so an older app that was installed before a feature existed is never asked for it. */
const BASE_FEATURES = ["haptics2", "biometric", "reminders", "review"];
/** "dock" is only claimed if the dock's native modules actually loaded, so a broken dock can never leave the page without a tab bar. */
const FEATURES = loadDock() ? [...BASE_FEATURES, "dock"] : BASE_FEATURES;
const NATIVE_INFO = JSON.stringify({ platform: Platform.OS, version: APP_VERSION, tablet: Platform.OS === "ios" ? Platform.isPad : false, features: FEATURES });
const BEFORE_LOAD = `window.__quarterNative = ${NATIVE_INFO}; true;`;

/**
 * The glass dock needs three native modules that older builds don't have. It is loaded only when first wanted, inside a try, and drawn inside an
 * error boundary, so if any of it fails the app simply has no dock (the page then draws its own tab bar) instead of closing.
 */
type DockProps = { tab: DockTab | "none"; onSelect: (t: DockTab) => void };
let dockComponent: ComponentType<DockProps> | null | undefined;
function loadDock(): ComponentType<DockProps> | null {
  if (dockComponent === undefined) {
    try { dockComponent = (require("./Dock") as { Dock: ComponentType<DockProps> }).Dock; } catch { dockComponent = null; }
  }
  return dockComponent;
}
class DockGuard extends Component<{ children: ReactNode; onFail: () => void }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  componentDidCatch() { this.props.onFail(); }
  render() { return this.state.failed ? null : this.props.children; }
}

export default function App() {
  const web = useRef<WebView>(null);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const [canGoBack, setCanGoBack] = useState(false);
  const [uri, setUri] = useState(APP_URL);
  const [dock, setDock] = useState<{ visible: boolean; tab: DockTab | "none" }>({ visible: false, tab: "today" });

  // Links to the site (from Messages, Mail, Safari) open here, on the page they point to
  useEffect(() => {
    const open = (url: string | null) => { const next = url && deepLink(url, APP_URL, APP_HOST); if (next) setUri(next); };
    void Linking.getInitialURL().then(open);
    const sub = Linking.addEventListener("url", (e) => open(e.url));
    return () => sub.remove();
  }, []);

  // Android's back button goes back in the page before it leaves the app
  useEffect(() => {
    if (Platform.OS !== "android") return;
    const sub = BackHandler.addEventListener("hardwareBackPress", () => { if (canGoBack) { web.current?.goBack(); return true; } return false; });
    return () => sub.remove();
  }, [canGoBack]);

  const tell = useCallback((message: unknown) => web.current?.postMessage(JSON.stringify(message)), []);

  const handle = useCallback(async (m: FromWeb) => {
    switch (m.type) {
      case "print":
        try { await Print.printAsync({ html: m.html }); } catch { /* cancelled */ }
        tell({ type: "print-done" }); // the page behaves as a browser does after printing
        break;
      case "share-file": {
        try {
          const uri = `${FileSystem.cacheDirectory}${m.filename}`;
          await FileSystem.writeAsStringAsync(uri, m.base64, { encoding: FileSystem.EncodingType.Base64 });
          if (await Sharing.isAvailableAsync()) await Sharing.shareAsync(uri, { mimeType: m.mime, dialogTitle: m.filename, UTI: m.mime === "application/pdf" ? "com.adobe.pdf" : undefined });
        } catch { /* nothing to share */ }
        break;
      }
      case "open-url": await WebBrowser.openBrowserAsync(m.url); break;
      case "haptic": await haptic(m.kind); break;
      case "biometric": tell({ type: "biometric-result", id: m.id, result: await biometric(m.reason) }); break;
      case "reminders": tell({ type: "reminders-result", result: await setReminders(m) }); break;
      case "review": await askForReview(); break;
      case "dock": if (isDockSelection(m.tab)) setDock({ visible: m.visible, tab: m.tab }); break;
    }
  }, [tell]);

  const onMessage = useCallback((e: WebViewMessageEvent) => {
    if (!isAppUrl(e.nativeEvent.url, APP_HOST)) return; // only the site itself may ask the app to do things
    const m = parseMessage(e.nativeEvent.data);
    if (m) void handle(m);
  }, [handle]);

  const retry = () => { setFailed(false); setLoading(true); web.current?.reload(); };

  return (
    <View style={styles.root}>
      <StatusBar style="auto" />
      <Web
        ref={web}
        source={{ uri }}
        style={styles.web}
        applicationNameForUserAgent={USER_AGENT_SUFFIX}
        injectedJavaScriptBeforeContentLoaded={BEFORE_LOAD}
        onMessage={onMessage}
        onShouldStartLoadWithRequest={(req: WebViewNavigation & { isTopFrame?: boolean }) => {
          const d = decideNavigation(req.url, APP_HOST, { isTopFrame: req.isTopFrame });
          if (d === "browser") { void WebBrowser.openBrowserAsync(req.url); return false; }
          if (d === "external") { void Linking.openURL(req.url); return false; }
          return d === "allow";
        }}
        onNavigationStateChange={(s: WebViewNavigation) => setCanGoBack(s.canGoBack)}
        onLoadStart={() => setFailed(false)}
        onLoadEnd={() => setLoading(false)}
        onError={() => { setFailed(true); setLoading(false); }}
        onHttpError={(e: { nativeEvent: { statusCode: number } }) => { if (e.nativeEvent.statusCode >= 500) { setFailed(true); setLoading(false); } }}
        contentInsetAdjustmentBehavior="never"
        allowsBackForwardNavigationGestures
        allowsLinkPreview={false}
        dataDetectorTypes="none"
        keyboardDisplayRequiresUserAction={false}
        automaticallyAdjustContentInsets={false}
        allowsInlineMediaPlayback
        mediaPlaybackRequiresUserAction={false}
        setSupportMultipleWindows={false}
        sharedCookiesEnabled
        pullToRefreshEnabled={false}
        textInteractionEnabled
        originWhitelist={["https://*"]}
        backgroundColor={BACKGROUND}
      />
      {dock.visible && !failed && (() => { const Dock = loadDock(); return Dock ? <DockGuard onFail={() => setDock({ visible: false, tab: "today" })}><Dock tab={dock.tab} onSelect={(t) => { void haptic("tap"); if (t !== "search") setDock({ visible: true, tab: t }); tell({ type: "navigate", tab: t }); }} /></DockGuard> : null; })()}
      {loading && !failed && <View style={styles.cover} pointerEvents="none"><ActivityIndicator size="large" color="#2f3a73" /></View>}
      {failed && (
        <View style={styles.cover}>
          <Text style={styles.title}>Can't reach quarter</Text>
          <Text style={styles.body}>Check your internet connection, then try again.</Text>
          <Pressable style={styles.button} onPress={retry} accessibilityRole="button" accessibilityLabel="Try again"><Text style={styles.buttonText}>Try again</Text></Pressable>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: BACKGROUND },
  web: { flex: 1, backgroundColor: BACKGROUND },
  cover: { position: "absolute", top: 0, left: 0, right: 0, bottom: 0, alignItems: "center", justifyContent: "center", backgroundColor: BACKGROUND, padding: 32, gap: 12 },
  title: { fontSize: 24, fontWeight: "800", color: "#121522" },
  body: { fontSize: 17, color: "#3b3a4f", textAlign: "center", maxWidth: 420 },
  button: { marginTop: 8, minHeight: 48, paddingHorizontal: 28, borderRadius: 24, backgroundColor: "#121522", alignItems: "center", justifyContent: "center" },
  buttonText: { color: "#fff", fontSize: 17, fontWeight: "800" },
});
