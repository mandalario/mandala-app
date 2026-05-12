import React, { useEffect, useRef } from 'react';
import { StyleSheet, View, Linking, Platform } from 'react-native';
import { WebView, WebViewNavigation } from 'react-native-webview';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import * as WebBrowser from 'expo-web-browser';
import * as LinkingExpo from 'expo-linking';

export default function App() {
  const THEME_COLOR = '#051d2d';
  const webViewRef = useRef<WebView>(null);
  const baseUrl = 'https://mandalario.vercel.app/';

  useEffect(() => {
    const handleDeepLink = (event: { url: string }) => {
      const { url } = event;
      if (url.startsWith('mandala-app://')) {
        // Se houver parâmetros de volta do Google Auth, podemos passá-los para o WebView
        // Por exemplo: mandala-app://auth?token=xyz
        const path = url.replace('mandala-app://', '');
        webViewRef.current?.injectJavaScript(`window.location.href = "${baseUrl}${path}";`);
      }
    };

    const subscription = Linking.addEventListener('url', handleDeepLink);

    // Verificar se o app foi aberto via link
    Linking.getInitialURL().then((url) => {
      if (url) handleDeepLink({ url });
    });

    return () => {
      subscription.remove();
    };
  }, []);

  const handleShouldStartLoadWithRequest = (request: any) => {
    const { url } = request;

    // Interceptar rotas do Google Auth
    if (
      url.includes('accounts.google.com') ||
      url.includes('google.com/accounts') ||
      url.includes('oauth2')
    ) {
      WebBrowser.openBrowserAsync(url);
      return false; // Bloqueia o carregamento no WebView e abre no navegador do sistema
    }

    return true;
  };

  return (
    <SafeAreaProvider>
      <SafeAreaView style={styles.container} edges={['top']}>
        <StatusBar style="light" />
        <View style={styles.webviewContainer}>
          <WebView 
            ref={webViewRef}
            source={{ uri: baseUrl }}
            style={styles.webview}
            javaScriptEnabled={true}
            domStorageEnabled={true}
            startInLoadingState={true}
            scalesPageToFit={true}
            allowsInlineMediaPlayback={true}
            mediaPlaybackRequiresUserAction={false}
            sharedCookiesEnabled={true}
            persistSessionCookies={true}
            cacheEnabled={true}
            allowsFullscreenVideo={false}
            mixedContentMode="always"
            thirdPartyCookiesEnabled={true}
            onShouldStartLoadWithRequest={handleShouldStartLoadWithRequest}
            userAgent="Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1"
            backgroundColor={THEME_COLOR}
          />
        </View>
      </SafeAreaView>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#051d2d',
  },
  webviewContainer: {
    flex: 1,
  },
  webview: {
    flex: 1,
  },
});
