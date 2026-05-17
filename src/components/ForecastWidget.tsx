import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, Wind } from "lucide-react";

const sb = supabase as any;

export function ForecastWidget() {
  const [provider, setProvider] = useState<any>(null);
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const widgetRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    (async () => {
      const { data: p } = await sb.from("forecast_providers").select("*").eq("is_active", true).maybeSingle();
      setProvider(p);
      if (p?.kind === "open_meteo_marine" || p?.kind === "windguru_api") {
        const { data: d } = await supabase.functions.invoke("forecast", { body: {} });
        setData(d);
      }
      setLoading(false);
    })();
  }, []);

  // WindGuru widget loader
  useEffect(() => {
    if (provider?.kind !== "windguru_widget" || !widgetRef.current) return;
    const spotId = provider.config?.spot_id;
    if (!spotId) return;
    widgetRef.current.innerHTML = "";
    const uid = `wg_${spotId}_${Date.now()}`;
    const div = document.createElement("div");
    div.id = uid;
    widgetRef.current.appendChild(div);
    const s = document.createElement("script");
    s.type = "text/javascript";
    s.text = `
      (function (window, document) {
        var loader = function () {
          var arg = ["s=${spotId}","m=100","mw=84","uid=${uid}","wj=knots","tj=c","waj=m","tij=cm","odh=0","doh=24","fhours=72","hrsm=2","vt=forecasts","lng=pt","idbs=1","p=WINDSPD,GUST,SMER,HTSGW,PERPW"];
          var script = document.createElement("script");
          var tag = document.getElementsByTagName("script")[0];
          script.src = "https://www.windguru.cz/js/widget.php?"+(arg.join("&"));
          tag.parentNode.insertBefore(script, tag);
        };
        window.addEventListener ? window.addEventListener("load", loader, false) : window.attachEvent("onload", loader);
        loader();
      })(window, document);
    `;
    document.body.appendChild(s);
  }, [provider]);

  if (loading) return <div className="glass rounded-2xl p-6 text-center"><Loader2 className="w-4 h-4 animate-spin mx-auto" /></div>;
  if (!provider) return (
    <div className="glass rounded-2xl p-6 text-center text-sm text-muted-foreground">
      <Wind className="w-6 h-6 mx-auto mb-2 opacity-40" />
      Nenhum provedor de previsão ativo. Configure em <span className="text-primary">Previsão do mar</span>.
    </div>
  );

  if (provider.kind === "windguru_widget") {
    return (
      <div className="glass-strong rounded-2xl p-3 overflow-x-auto">
        <div className="text-xs uppercase tracking-widest text-primary/80 px-2 pb-2">Previsão WindGuru</div>
        <div ref={widgetRef} />
      </div>
    );
  }

  if (provider.kind === "open_meteo_marine") {
    const daily = data?.data?.daily;
    if (!daily?.time) return <div className="glass rounded-2xl p-4 text-sm text-muted-foreground">Sem dados.</div>;
    return (
      <div className="glass-strong rounded-2xl p-4">
        <div className="text-xs uppercase tracking-widest text-primary/80 mb-3">Previsão Marine — 7 dias</div>
        <div className="grid grid-cols-7 gap-2">
          {daily.time.map((d: string, i: number) => {
            const dateObj = new Date(d + "T12:00");
            const weekday = dateObj.toLocaleDateString("pt-BR", { weekday: "short" }).replace(".", "");
            const dayMonth = dateObj.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });
            return (
              <div key={d} className="rounded-xl bg-secondary/20 p-2.5 text-center flex flex-col justify-between min-h-[105px] border border-white/5 hover:bg-secondary/40 hover:border-primary/20 transition-all duration-300">
                <div>
                  <div className="text-[10px] font-bold text-primary uppercase tracking-wider">{weekday}</div>
                  <div className="text-[9px] text-muted-foreground font-semibold mt-0.5">{dayMonth}</div>
                </div>
                <div className="mt-2 mb-1">
                  <div className="text-sm font-extrabold text-foreground">{daily.wave_height_max?.[i]?.toFixed(1) ?? "—"}m</div>
                  <div className="text-[10px] text-muted-foreground/80 mt-0.5">{daily.wave_period_max?.[i]?.toFixed(0) ?? "—"}s</div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  if (provider.kind === "windguru_api") {
    if (data?.error === "missing_token") return <div className="glass rounded-2xl p-4 text-sm text-warning">Configure o segredo <code>WINDGURU_API_KEY</code> para ativar a API.</div>;
    return <div className="glass-strong rounded-2xl p-4 text-xs"><div className="text-primary/80 uppercase tracking-widest mb-2">WindGuru API</div><pre className="overflow-auto max-h-60">{JSON.stringify(data?.data, null, 2)}</pre></div>;
  }

  return null;
}
