// Forecast proxy: supports Open-Meteo Marine (free) and WindGuru API (paid, token in WINDGURU_API_KEY)
import { corsHeaders } from "https://esm.sh/@supabase/supabase-js@2.95.0/cors";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.95.0";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: req.headers.get("Authorization") ?? "" } },
    });

    const { data: provider } = await supabase
      .from("forecast_providers")
      .select("*")
      .eq("is_active", true)
      .maybeSingle();

    if (!provider) {
      return new Response(JSON.stringify({ active: false }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const cfg = (provider.config ?? {}) as Record<string, unknown>;

    if (provider.kind === "open_meteo_marine") {
      const lat = Number(cfg.lat ?? -23.0);
      const lon = Number(cfg.lon ?? -43.5);
      const url = `https://marine-api.open-meteo.com/v1/marine?latitude=${lat}&longitude=${lon}&daily=wave_height_max,wave_period_max,wave_direction_dominant&timezone=auto&forecast_days=7`;
      const r = await fetch(url);
      const d = await r.json();
      return new Response(JSON.stringify({ active: true, kind: provider.kind, data: d }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (provider.kind === "windguru_api") {
      const token = Deno.env.get("WINDGURU_API_KEY");
      if (!token) {
        return new Response(JSON.stringify({ active: true, kind: provider.kind, error: "missing_token" }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200,
        });
      }
      const station = String(cfg.station_id ?? "");
      const url = `https://www.windguru.cz/int/iapi.php?q=forecast_spot&id_spot=${station}&id_model=3&token=${token}`;
      const r = await fetch(url);
      const d = await r.json().catch(() => ({}));
      return new Response(JSON.stringify({ active: true, kind: provider.kind, data: d }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // windguru_widget — handled client-side via embed script. Just return config.
    return new Response(JSON.stringify({ active: true, kind: provider.kind, config: cfg }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
