import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export function PushNotificationManager() {
  const { user } = useAuth();

  useEffect(() => {
    if (!user) return;

    const handleMessage = async (event: MessageEvent) => {
      let data;
      try {
        data = typeof event.data === "string" ? JSON.parse(event.data) : event.data;
      } catch {
        return;
      }

      if (data?.type === "PUSH_TOKEN" && data.token) {
        console.log("Received push token from app:", data.token);
        
        const { error } = await supabase.functions.invoke("register-push-token", {
          body: { pushToken: data.token },
        });

        if (error) {
          let errorMessage = error.message;
          try {
            if (error.context) {
              const body = await error.context.json();
              errorMessage = body?.error || error.message;
            }
          } catch {
            // ignore
          }
          console.error("Error registering push token:", errorMessage);
        } else {
          console.log("Push token registered successfully");
        }
      }
    };

    window.addEventListener("message", handleMessage);
    // Para Android WebView às vezes o evento vem no document
    document.addEventListener("message", handleMessage as any);

    // Solicita o token ao app caso ele já não tenha enviado no load (com retentativas)
    const requestToken = () => {
      if ((window as any).ReactNativeWebView) {
        (window as any).ReactNativeWebView.postMessage(JSON.stringify({ type: "GET_PUSH_TOKEN" }));
      }
    };

    requestToken();
    const t1 = setTimeout(requestToken, 1000);
    const t2 = setTimeout(requestToken, 3000);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      window.removeEventListener("message", handleMessage);
      document.removeEventListener("message", handleMessage as any);
    };
  }, [user]);

  return null;
}
