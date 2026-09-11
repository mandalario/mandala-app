import { useEffect, useState } from "react";
import { isReactNativeWebView } from "@/lib/nativeApp";

/**
 * Hook that returns true if the current runtime is a mobile app WebView.
 * Performs immediate check + short-polling check in case bridge is injected asynchronously.
 */
export function useIsApp(): boolean {
  const [isApp, setIsApp] = useState<boolean>(() => isReactNativeWebView());

  useEffect(() => {
    if (isApp) return;

    if (isReactNativeWebView()) {
      setIsApp(true);
      return;
    }

    const interval = setInterval(() => {
      if (isReactNativeWebView()) {
        setIsApp(true);
        clearInterval(interval);
      }
    }, 100);

    const timeout = setTimeout(() => {
      clearInterval(interval);
    }, 2500);

    return () => {
      clearInterval(interval);
      clearTimeout(timeout);
    };
  }, [isApp]);

  return isApp;
}
