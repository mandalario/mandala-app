import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

/**
 * Reads the global `billing_enabled` toggle from app_settings.
 * When false, the app runs in "free mode" (no Pix, no credits required).
 */
export function useBillingEnabled() {
  const [enabled, setEnabled] = useState<boolean | null>(null);

  useEffect(() => {
    let active = true;
    const load = async () => {
      const { data } = await supabase
        .from("app_settings")
        .select("value")
        .eq("key", "billing_enabled")
        .maybeSingle();
      if (active) setEnabled((data?.value ?? "false") === "true");
    };
    load();

    const channel = supabase
      .channel("billing-enabled-watch")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "app_settings", filter: "key=eq.billing_enabled" },
        (payload) => {
          const v = (payload.new as any)?.value ?? "false";
          setEnabled(v === "true");
        },
      )
      .subscribe();

    return () => {
      active = false;
      supabase.removeChannel(channel);
    };
  }, []);

  return enabled;
}
