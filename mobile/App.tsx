import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  BackHandler,
  Linking,
  Platform,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import * as WebBrowser from "expo-web-browser";
import * as Notifications from "expo-notifications";
import * as Device from "expo-device";
import Constants from "expo-constants";
import { WebView, WebViewNavigation } from "react-native-webview";

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

async function registerForPushNotificationsAsync(): Promise<string | null> {
  if (!Device.isDevice) {
    console.log("Push notifications require a physical device.");
    return null;
  }

  if (Platform.OS === "android") {
    await Notifications.setNotificationChannelAsync("mandalario-alerts", {
      name: "Alertas e Avisos",
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: "#0b1e3a",
    });
  }

  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;
  if (existingStatus !== "granted") {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }
  if (finalStatus !== "granted") {
    console.log("Push notification permission not granted.");
    return null;
  }

  const projectId =
    Constants?.expoConfig?.extra?.eas?.projectId ??
    Constants?.easConfig?.projectId ??
    "e0d3b661-b855-4ca1-98d5-e65af5907953";

  if (!projectId) {
    console.error("EAS Project ID not found for push notification");
    return null;
  }

  try {
    const pushTokenData = await Notifications.getExpoPushTokenAsync({
      projectId,
    });
    return pushTokenData.data;
  } catch (error) {
    console.error("Erro ao obter expo push token:", error);
    return null;
  }
}

const APP_BACKGROUND = "#ffffff";
const APP_LOADING_ACCENT = "#0b1e3a";

WebBrowser.maybeCompleteAuthSession();

const DEFAULT_WEB_URL = "https://mandalario.app";

const INJECTED_APP_SETUP = `
  (function() {
    window.__IS_MANDALARIO_APP__ = true;
    try {
      sessionStorage.setItem("is_mandalario_app", "true");
      localStorage.setItem("is_mandalario_app", "true");
    } catch(e) {}

    function hidePurchases() {
      if (!document.getElementById('mandalario-hide-packages-style')) {
        var style = document.createElement('style');
        style.id = 'mandalario-hide-packages-style';
        style.innerHTML = 'a[href*="/packages"], a[href="/packages"], [title*="crédito" i], [title*="Crédito"], [title*="credit" i], [title*="Créditos"] { display: none !important; }';
        (document.head || document.documentElement).appendChild(style);
      }
    }

    hidePurchases();
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', hidePurchases);
    }
    window.addEventListener('load', hidePurchases);
  })();
  true;
`;

function getSafeBaseUrl(raw?: string): string {
  const candidate = (raw ?? "").trim() || DEFAULT_WEB_URL;
  try {
    const parsed = new URL(candidate);
    if (parsed.protocol !== "https:") return DEFAULT_WEB_URL;
    parsed.searchParams.set("app", "1");
    return parsed.toString();
  } catch {
    return DEFAULT_WEB_URL;
  }
}

function getAllowedOrigins(baseUrl: string): string[] {
  const url = new URL(baseUrl);
  const origins = new Set<string>([url.origin]);
  const host = url.hostname;
  if (host.startsWith("www.")) {
    origins.add(`${url.protocol}//${host.slice(4)}`);
  } else {
    origins.add(`${url.protocol}//www.${host}`);
  }
  return [...origins];
}

function isAllowedUrl(rawUrl: string, appUrl: string, allowedOrigins: string[]): boolean {
  try {
    const absolute = new URL(rawUrl, appUrl);
    return absolute.protocol === "https:" && allowedOrigins.includes(absolute.origin);
  } catch {
    return false;
  }
}

/** Google / Apple / Supabase OAuth must stay in-app (or use the auth session browser). */
function isOAuthProviderUrl(rawUrl: string): boolean {
  try {
    const { hostname } = new URL(rawUrl);
    if (hostname === "accounts.google.com") return true;
    if (hostname === "appleid.apple.com") return true;
    if (hostname.endsWith(".supabase.co")) return true;
    return false;
  } catch {
    return false;
  }
}

function isAppAuthCallback(rawUrl: string, appUrl: string): boolean {
  try {
    const absolute = new URL(rawUrl, appUrl);
    return absolute.pathname === "/auth/callback" || absolute.pathname.startsWith("/auth/callback");
  } catch {
    return false;
  }
}

export default function App() {
  const webViewRef = useRef<WebView>(null);
  const [canGoBack, setCanGoBack] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const loadFinishedRef = useRef(false);

  const finishInitialLoad = useCallback(() => {
    if (loadFinishedRef.current) return;
    loadFinishedRef.current = true;
    setIsLoading(false);
  }, []);

  const appUrl = useMemo(() => getSafeBaseUrl(process.env.EXPO_PUBLIC_WEB_URL), []);
  const allowedOrigins = useMemo(() => getAllowedOrigins(appUrl), [appUrl]);

  const handleNavigationStateChange = useCallback((navState: WebViewNavigation) => {
    setCanGoBack(navState.canGoBack);
  }, []);

  const openInAppUrl = useCallback(
    (rawUrl?: string) => {
      if (!rawUrl || !webViewRef.current) return;
      if (!isAllowedUrl(rawUrl, appUrl, allowedOrigins) && !isAppAuthCallback(rawUrl, appUrl)) return;
      const absolute = new URL(rawUrl, appUrl).toString();
      const js = `window.location.replace(${JSON.stringify(absolute)}); true;`;
      webViewRef.current.injectJavaScript(js);
    },
    [appUrl, allowedOrigins],
  );

  const sendPushTokenToWeb = useCallback(async () => {
    try {
      const token = await registerForPushNotificationsAsync();
      if (token && webViewRef.current) {
        const payload = JSON.stringify({ type: "PUSH_TOKEN", token });
        const js = `
          (function() {
            try {
              var payload = ${JSON.stringify(payload)};
              window.dispatchEvent(new MessageEvent('message', { data: payload }));
              document.dispatchEvent(new MessageEvent('message', { data: payload }));
            } catch(e) {}
          })();
          true;
        `;
        webViewRef.current.injectJavaScript(js);
      }
    } catch (err) {
      console.error("Falha ao registrar push token:", err);
    }
  }, []);

  const startOAuthInAppBrowser = useCallback(
    async (authUrl: string, redirectTo: string) => {
      try {
        const result = await WebBrowser.openAuthSessionAsync(authUrl, redirectTo);
        if (result.type === "success" && result.url) {
          openInAppUrl(result.url);
        }
      } catch {
        // user dismissed browser
      }
    },
    [openInAppUrl],
  );

  useEffect(() => {
    const subscription = BackHandler.addEventListener("hardwareBackPress", () => {
      if (canGoBack && webViewRef.current) {
        webViewRef.current.goBack();
        return true;
      }
      return false;
    });
    return () => subscription.remove();
  }, [canGoBack]);

  useEffect(() => {
    const timeout = setTimeout(finishInitialLoad, 12_000);
    return () => clearTimeout(timeout);
  }, [finishInitialLoad]);

  useEffect(() => {
    const handleDeepLink = (event: { url: string }) => {
      if (isAllowedUrl(event.url, appUrl, allowedOrigins) || isAppAuthCallback(event.url, appUrl)) {
        openInAppUrl(event.url);
      }
    };

    Linking.getInitialURL()
      .then((url) => {
        if (url) handleDeepLink({ url });
      })
      .catch(() => undefined);

    const subscription = Linking.addEventListener("url", handleDeepLink);
    return () => subscription.remove();
  }, [appUrl, allowedOrigins, openInAppUrl]);

  useEffect(() => {
    const responseSubscription = Notifications.addNotificationResponseReceivedListener((response) => {
      const url = response.notification.request.content.data?.url;
      if (typeof url === "string" && url.trim()) {
        openInAppUrl(url);
      }
    });

    void Notifications.getLastNotificationResponseAsync().then((response) => {
      if (response) {
        const url = response.notification.request.content.data?.url;
        if (typeof url === "string" && url.trim()) {
          openInAppUrl(url);
        }
      }
    });

    return () => {
      responseSubscription.remove();
    };
  }, [openInAppUrl]);

  return (
    <SafeAreaView style={styles.container} edges={["top", "bottom"]}>
      <StatusBar style={isLoading ? "dark" : "light"} />
      <WebView
        ref={webViewRef}
        style={styles.webView}
        source={{ uri: appUrl }}
        originWhitelist={allowedOrigins}
        applicationNameForUserAgent="MandalarioApp/1.0"
        injectedJavaScriptBeforeContentLoaded={INJECTED_APP_SETUP}
        injectedJavaScript={INJECTED_APP_SETUP}
        onNavigationStateChange={handleNavigationStateChange}
        javaScriptEnabled
        domStorageEnabled
        thirdPartyCookiesEnabled={false}
        sharedCookiesEnabled
        geolocationEnabled={false}
        allowFileAccess={true}
        allowFileAccessFromFileURLs={true}
        allowUniversalAccessFromFileURLs={false}
        mediaCapturePermissionGrantType="grant"
        allowsInlineMediaPlayback={true}
        mixedContentMode="never"
        setSupportMultipleWindows={false}
        allowsBackForwardNavigationGestures={false}
        mediaPlaybackRequiresUserAction={false}
        allowsLinkPreview={false}
        onLoadProgress={({ nativeEvent }) => {
          if (nativeEvent.progress >= 0.9) finishInitialLoad();
        }}
        onLoadEnd={() => {
          finishInitialLoad();
        }}
        onMessage={(event) => {
          try {
            const payload = JSON.parse(event.nativeEvent.data);
            if (payload?.type === "OAUTH_URL" && typeof payload.url === "string") {
              const redirectTo =
                typeof payload.redirectTo === "string"
                  ? payload.redirectTo
                  : `${appUrl}/auth/callback`;
              void startOAuthInAppBrowser(payload.url, redirectTo);
            } else if (payload?.type === "GET_PUSH_TOKEN") {
              void sendPushTokenToWeb();
            }
          } catch {
            // ignore malformed payload
          }
        }}
        onShouldStartLoadWithRequest={(request) => {
          if (!request.url) return false;
          if (isAllowedUrl(request.url, appUrl, allowedOrigins)) return true;
          if (isAppAuthCallback(request.url, appUrl)) return true;
          if (isOAuthProviderUrl(request.url)) return true;
          Linking.openURL(request.url).catch(() => undefined);
          return false;
        }}
      />

      {isLoading ? (
        <View pointerEvents="none" style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color={APP_LOADING_ACCENT} />
          <Text style={styles.loadingText}>Carregando...</Text>
        </View>
      ) : null}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: APP_BACKGROUND,
  },
  webView: {
    flex: 1,
    backgroundColor: APP_BACKGROUND,
  },
  loadingOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 10,
    elevation: 10,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: APP_BACKGROUND,
    gap: 8,
  },
  loadingText: {
    color: APP_LOADING_ACCENT,
    fontSize: 14,
  },
});
