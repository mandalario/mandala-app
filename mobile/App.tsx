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

function normalizeBaseUrl(rawUrl: string): string {
  return rawUrl.replace(/\/+$/, "");
}

export default function App() {
  const webViewRef = useRef<WebView>(null);
  const [canGoBack, setCanGoBack] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const appUrl = useMemo(() => {
    const envUrl = process.env.EXPO_PUBLIC_WEB_URL;
    return normalizeBaseUrl(envUrl && envUrl.trim().length > 0 ? envUrl : DEFAULT_WEB_URL);
  }, []);

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
        onNavigationStateChange={handleNavigationStateChange}
        javaScriptEnabled
        domStorageEnabled
        startInLoadingState
        onLoadStart={() => setIsLoading(true)}
        onLoadEnd={() => setIsLoading(false)}
        renderLoading={() => (
          <View style={styles.loader}>
            <ActivityIndicator size="large" />
          </View>
        )}
        onShouldStartLoadWithRequest={(request) => {
          if (!request.url) {
            return true;
          }

          const isHttp = request.url.startsWith("http://") || request.url.startsWith("https://");
          if (!isHttp) {
            Linking.openURL(request.url).catch(() => undefined);
            return false;
          }

          const normalizedRequestUrl = normalizeBaseUrl(request.url);
          const isSameDomain =
            normalizedRequestUrl.startsWith(appUrl) ||
            normalizedRequestUrl.startsWith(`${appUrl}/`);

          if (isSameDomain) {
            return true;
          }

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
