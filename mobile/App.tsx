import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  BackHandler,
  Linking,
  Platform,
  SafeAreaView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import * as Device from "expo-device";
import Constants from "expo-constants";
import * as Notifications from "expo-notifications";
import { WebView, WebViewNavigation } from "react-native-webview";

const DEFAULT_WEB_URL = "https://mandalario.vercel.app";
const WHATSAPP_STYLE_CHANNEL = "whatsapp-style";

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

export default function App() {
  const webViewRef = useRef<WebView>(null);
  const [canGoBack, setCanGoBack] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const pushTokenRef = useRef<string | null>(null);

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
      try {
        const absolute = new URL(rawUrl, appUrl).toString();
        const js = `window.location.href = ${JSON.stringify(absolute)}; true;`;
        webViewRef.current.injectJavaScript(js);
      } catch {
        // Ignore invalid URLs from payloads.
      }
    },
    [appUrl],
  );

  useEffect(() => {
    async function setupPush() {
      if (!Device.isDevice) return;

      if (Platform.OS === "android") {
        await Notifications.setNotificationChannelAsync(WHATSAPP_STYLE_CHANNEL, {
          name: "Mensagens estilo WhatsApp",
          importance: Notifications.AndroidImportance.MAX,
          vibrationPattern: [0, 250, 250, 250],
          lightColor: "#22c55e",
          sound: "default",
        });
      }

      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;

      if (existingStatus !== "granted") {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }
      if (finalStatus !== "granted") return;

      const projectId =
        Constants.expoConfig?.extra?.eas?.projectId ??
        Constants.easConfig?.projectId;
      const tokenData = await Notifications.getExpoPushTokenAsync(
        projectId ? { projectId } : undefined,
      );
      pushTokenRef.current = tokenData.data;
      postPushTokenToWeb();
    }

    const receivedSubscription = Notifications.addNotificationReceivedListener(() => {
      // no-op; UI handled by OS notification tray
    });
    const responseSubscription = Notifications.addNotificationResponseReceivedListener((response) => {
      const url = response.notification.request.content.data?.url;
      if (typeof url === "string") {
        openInAppUrl(url);
      }
    });

    setupPush().catch(() => undefined);

    return () => {
      receivedSubscription.remove();
      responseSubscription.remove();
    };
  }, [openInAppUrl, postPushTokenToWeb]);

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

  return (
    <SafeAreaView style={styles.container}>
      <WebView
        ref={webViewRef}
        source={{ uri: appUrl }}
        originWhitelist={allowedOrigins}
        onNavigationStateChange={handleNavigationStateChange}
        javaScriptEnabled
        domStorageEnabled
        setSupportMultipleWindows={false}
        allowsBackForwardNavigationGestures={false}
        startInLoadingState
        onLoadStart={() => setIsLoading(true)}
        onLoadEnd={() => {
          setIsLoading(false);
          postPushTokenToWeb();
        }}
        onMessage={(event) => {
          try {
            const payload = JSON.parse(event.nativeEvent.data);
            if (payload?.type === "GET_PUSH_TOKEN") {
              postPushTokenToWeb();
            }
          } catch {
            // ignore malformed payload
          }
        }}
        renderLoading={() => (
          <View style={styles.loader}>
            <ActivityIndicator size="large" />
          </View>
        )}
        onShouldStartLoadWithRequest={(request) => {
          if (!request.url) return false;
          try {
            const u = new URL(request.url);
            if (allowedOrigins.includes(u.origin)) return true;
            Linking.openURL(request.url).catch(() => undefined);
            return false;
          } catch {
            return false;
          }
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
  loader: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
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
