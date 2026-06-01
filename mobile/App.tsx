import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  BackHandler,
  Linking,
  SafeAreaView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { WebView, WebViewNavigation } from "react-native-webview";

const DEFAULT_WEB_URL = "https://mandalario.vercel.app";

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

  const appUrl = useMemo(() => getSafeBaseUrl(process.env.EXPO_PUBLIC_WEB_URL), []);
  const allowedOrigins = useMemo(() => getAllowedOrigins(appUrl), [appUrl]);

  const handleNavigationStateChange = useCallback((navState: WebViewNavigation) => {
    setCanGoBack(navState.canGoBack);
  }, []);

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
        onLoadEnd={() => setIsLoading(false)}
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
