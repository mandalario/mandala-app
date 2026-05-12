import React, { useEffect, useRef, useState } from 'react';
import { StyleSheet, View, BackHandler, ActivityIndicator, Text, TouchableOpacity } from 'react-native';
import { WebView, WebViewNavigation } from 'react-native-webview';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import * as WebBrowser from 'expo-web-browser';
import * as Linking from 'expo-linking';

export default function App() {
  const THEME_COLOR = '#051d2d';
  const [loading, setLoading] = useState(true);
  const [canGoBack, setCanGoBack] = useState(false);
  const webViewRef = useRef<WebView>(null);
  const baseUrl = 'https://mandalario.vercel.app/';

  // Lidar com o botão de voltar no Android
  useEffect(() => {
    const onBackPress = () => {
      if (webViewRef.current && canGoBack) {
        webViewRef.current.goBack();
        return true;
      }
      return false;
    };

    BackHandler.addEventListener('hardwareBackPress', onBackPress);
    return () => BackHandler.removeEventListener('hardwareBackPress', onBackPress);
  }, [canGoBack]);

  useEffect(() => {
    const handleDeepLink = (event: { url: string }) => {
      const { url } = event;
      if (url && url.startsWith('mandala-app://')) {
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

  const handleShouldStartLoadWithRequest = (request: WebViewNavigation) => {
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
            style={[styles.webview, { backgroundColor: THEME_COLOR }]}
            javaScriptEnabled={true}
            domStorageEnabled={true}
            startInLoadingState={true}
            onLoadStart={() => setLoading(true)}
            onLoadEnd={() => setLoading(false)}
            onNavigationStateChange={(navState: WebViewNavigation) => {
              setCanGoBack(navState.canGoBack);
            }}
            scalesPageToFit={true}
            allowsInlineMediaPlayback={true}
            mediaPlaybackRequiresUserAction={false}
            sharedCookiesEnabled={true}
            cacheEnabled={true}
            allowsFullscreenVideo={false}
            mixedContentMode="always"
            thirdPartyCookiesEnabled={true}
            onShouldStartLoadWithRequest={handleShouldStartLoadWithRequest}
            userAgent="Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1"
            renderLoading={() => (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#ffffff" />
              </View>
            )}
            renderError={() => (
              <View style={styles.errorContainer}>
                <Text style={styles.errorTitle}>Sem conexão</Text>
                <Text style={styles.errorText}>Verifique sua internet e tente novamente.</Text>
                <TouchableOpacity 
                  style={styles.retryButton} 
                  onPress={() => webViewRef.current?.reload()}
                >
                  <Text style={styles.retryButtonText}>Tentar Novamente</Text>
                </TouchableOpacity>
              </View>
            )}
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
  loadingContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#051d2d',
  },
  errorContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#051d2d',
    padding: 20,
  },
  errorTitle: {
    color: '#ffffff',
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  errorText: {
    color: '#a0aec0',
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 20,
  },
  retryButton: {
    backgroundColor: '#ffffff',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#051d2d',
    fontSize: 16,
    fontWeight: 'bold',
  },
});
