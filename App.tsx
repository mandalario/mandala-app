import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
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
import * as Device from "expo-device";
import Constants from "expo-constants";
import * as Notifications from "expo-notifications";
import * as WebBrowser from "expo-web-browser";
import { WebView, WebViewNavigation } from "react-native-webview";

WebBrowser.maybeCompleteAuthSession();

const DEFAULT_WEB_URL = "https://mandalario.app";
export const PUSH_CHANNEL_ID = "mandalario-alerts";

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

function getSafeBaseUrl(raw?: string): string {
  const candidate = (raw ?? "").trim() || DEFAULT_WEB_URL;
  try {
    const parsed = new URL(candidate);
    if (parsed.protocol !== "https:") return DEFAULT_WEB_URL;
    return parsed.toString().replace(/\/+$/, "");
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

/** Google / Supabase OAuth must stay in-app (or use the auth session browser). */
function isOAuthProviderUrl(rawUrl: string): boolean {
  try {
    const { hostname } = new URL(rawUrl);
    if (hostname === "accounts.google.com") return true;
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

function isExpoGoRuntime(): boolean {
  return Constants.appOwnership === "expo";
}

export default function App() {
  const webViewRef = useRef<WebView>(null);
  const [canGoBack, setCanGoBack] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const loadFinishedRef = useRef(false);
  const pushTokenRef = useRef<string | null>(null);
  const pushSetupStartedRef = useRef(false);

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

  const postPushTokenToWeb = useCallback(() => {
    if (!pushTokenRef.current || !webViewRef.current) return;
    webViewRef.current.postMessage(
      JSON.stringify({ type: "PUSH_TOKEN", token: pushTokenRef.current }),
    );
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

  const registerPushToken = useCallback(async () => {
    if (!Device.isDevice || pushSetupStartedRef.current) return;
    if (isExpoGoRuntime()) return;
    pushSetupStartedRef.current = true;

    try {
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;

      if (existingStatus !== "granted") {
        const { status } = await Notifications.requestPermissionsAsync({
          ios: {
            allowAlert: true,
            allowBadge: false,
            allowSound: true,
          },
        });
        finalStatus = status;
      }
      if (finalStatus !== "granted") return;

      const projectId =
        Constants.expoConfig?.extra?.eas?.projectId ?? Constants.easConfig?.projectId;
      const tokenData = await Notifications.getExpoPushTokenAsync(
        projectId ? { projectId } : undefined,
      );
      pushTokenRef.current = tokenData.data;
      postPushTokenToWeb();
    } catch {
      pushSetupStartedRef.current = false;
    }
  }, [postPushTokenToWeb]);

  useEffect(() => {
    async function setupNotificationChannel() {
      if (Platform.OS !== "android") return;
      await Notifications.setNotificationChannelAsync(PUSH_CHANNEL_ID, {
        name: "Mandala Rio Surf School",
        description: "Aulas, agendamentos e mensagens da escola.",
        importance: Notifications.AndroidImportance.HIGH,
        vibrationPattern: [0, 200, 100, 200],
        lightColor: "#22c55e",
        sound: "default",
      });
    }

    const responseSubscription = Notifications.addNotificationResponseReceivedListener(
      (response) => {
        const url = response.notification.request.content.data?.url;
        if (typeof url === "string") {
          openInAppUrl(url);
        }
      },
    );

    setupNotificationChannel().catch(() => undefined);

    return () => {
      responseSubscription.remove();
    };
  }, [openInAppUrl]);

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

  return (
    <SafeAreaView style={styles.container} edges={["top", "bottom"]}>
      <WebView
        ref={webViewRef}
        style={styles.webView}
        source={{ uri: appUrl }}
        originWhitelist={allowedOrigins}
        onNavigationStateChange={handleNavigationStateChange}
        javaScriptEnabled
        domStorageEnabled
        thirdPartyCookiesEnabled={false}
        sharedCookiesEnabled
        geolocationEnabled={false}
        allowFileAccess={false}
        allowUniversalAccessFromFileURLs={false}
        mixedContentMode="never"
        setSupportMultipleWindows={false}
        allowsBackForwardNavigationGestures={false}
        mediaPlaybackRequiresUserAction
        allowsLinkPreview={false}
        onLoadProgress={({ nativeEvent }) => {
          if (nativeEvent.progress >= 0.9) finishInitialLoad();
        }}
        onLoadEnd={() => {
          finishInitialLoad();
          postPushTokenToWeb();
        }}
        onMessage={(event) => {
          try {
            const payload = JSON.parse(event.nativeEvent.data);
            if (payload?.type === "GET_PUSH_TOKEN") {
              registerPushToken();
            } else if (payload?.type === "OAUTH_URL" && typeof payload.url === "string") {
              const redirectTo =
                typeof payload.redirectTo === "string"
                  ? payload.redirectTo
                  : `${appUrl}/auth/callback`;
              void startOAuthInAppBrowser(payload.url, redirectTo);
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
          <ActivityIndicator size="large" />
          <Text style={styles.loadingText}>Carregando...</Text>
        </View>
      ) : null}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#ffffff",
  },
  webView: {
    flex: 1,
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 10,
    elevation: 10,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255, 255, 255, 0.85)",
    gap: 8,
  },
  loadingText: {
    color: "#111827",
    fontSize: 14,
  },
});
