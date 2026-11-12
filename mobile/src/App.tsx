import * as FileSystem from "expo-file-system/legacy";
import * as Haptics from "expo-haptics";
import * as Linking from "expo-linking";
import * as Print from "expo-print";
import * as Sharing from "expo-sharing";
import { StatusBar } from "expo-status-bar";
import * as WebBrowser from "expo-web-browser";
import { useCallback, useEffect, useRef, useState, type ComponentType } from "react";
import { ActivityIndicator, BackHandler, Platform, Pressable, StyleSheet, Text, View } from "react-native";
import { WebView, type WebViewMessageEvent, type WebViewNavigation } from "react-native-webview";
import { APP_HOST, APP_URL, APP_VERSION, BACKGROUND, USER_AGENT_SUFFIX } from "./config";
import { decideNavigation, isAppUrl } from "./links";
import { parseMessage, type FromWeb } from "./messages";

/**
 * quarter on iPhone and iPad: the site in a web view, with the few things a web view can't do handed to the phone
 * (printing, saving files through the share sheet, links to other sites, a little haptic feedback).
 * The page tells the app it is inside it with `window.__quarterNative`; see the web app's src/native/bridge.ts for the other half.
 */
/** react-native-webview 14's own prop types don't resolve under React 19's JSX types (every prop becomes `never`), so the component is used through a plain props type. The handlers below are still typed. */
const Web = WebView as unknown as ComponentType<Record<string, unknown> & { ref?: React.Ref<WebView> }>;
const NATIVE_INFO = JSON.stringify({ platform: Platform.OS, version: APP_VERSION, tablet: Platform.OS === "ios" ? Platform.isPad : false });
const BEFORE_LOAD = `window.__quarterNative = ${NATIVE_INFO}; true;`;

export default function App() {
  const web = useRef<WebView>(null);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const [canGoBack, setCanGoBack] = useState(false);

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
      case "haptic":
        if (m.kind === "tap") await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        else await Haptics.notificationAsync(m.kind === "success" ? Haptics.NotificationFeedbackType.Success : Haptics.NotificationFeedbackType.Error);
        break;
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
        source={{ uri: APP_URL }}
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
        allowsInlineMediaPlayback
        mediaPlaybackRequiresUserAction={false}
        setSupportMultipleWindows={false}
        sharedCookiesEnabled
        pullToRefreshEnabled={false}
        textInteractionEnabled
        originWhitelist={["https://*"]}
        backgroundColor={BACKGROUND}
      />
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
