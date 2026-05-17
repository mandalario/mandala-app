import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Waves, Timer, Navigation, Wind, Thermometer, Star } from "lucide-react";

type SeaCondition = {
  location: string;
  summary: string;
  stars: number;
  status: "excelente" | "bom" | "medio" | "ruim" | "flat";
  waves: string;
  period: string;
  wave_dir: string;
  wind: string;
  water_temp: string;
  air_temp: string;
  ideal_for: string;
  updated_at: string;
};

const statusLabels = {
  excelente: "Excelente",
  bom: "Bom",
  medio: "Médio",
  ruim: "Ruim",
  flat: "Sem Ondas",
};

const statusColors = {
  excelente: "bg-emerald-500/35 text-emerald-100 border-emerald-400/40",
  bom: "bg-teal-500/35 text-teal-100 border-teal-400/40",
  medio: "bg-amber-500/35 text-amber-100 border-amber-400/40",
  ruim: "bg-rose-500/35 text-rose-100 border-rose-400/40",
  flat: "bg-sky-500/35 text-sky-100 border-sky-400/40",
};

const defaultData: SeaCondition = {
  location: "Barra da Tijuca, Rio de Janeiro, Brasil",
  summary: "Céu limpo, mar liso e ondas consistentes",
  stars: 4,
  status: "excelente",
  waves: "1.2m",
  period: "10s",
  wave_dir: "SSE",
  wind: "8 km/h",
  water_temp: "22°C",
  air_temp: "26°C",
  ideal_for: "Todos os Níveis",
  updated_at: new Date().toISOString(),
};

export function SeaConditionCard() {
  const [data, setData] = useState<SeaCondition | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const { data: res } = await supabase
          .from("app_settings")
          .select("value")
          .eq("key", "sea_condition_card")
          .maybeSingle();

        if (res?.value) {
          setData(JSON.parse(res.value));
        } else {
          setData(defaultData);
        }
      } catch (e) {
        console.error("Erro ao carregar condições do mar:", e);
        setData(defaultData);
      } finally {
        setLoading(false);
      }
    };

    load();

    const channel = supabase
      .channel("sea-condition-watch-v4")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "app_settings", filter: "key=eq.sea_condition_card" },
        (payload) => {
          if (payload.new && (payload.new as any).value) {
            try {
              setData(JSON.parse((payload.new as any).value));
            } catch (e) {
              console.error(e);
            }
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  if (loading) {
    return (
      <div className="glass rounded-3xl p-6 animate-pulse flex items-center justify-center min-h-[250px]">
        <div className="text-sm text-muted-foreground">Carregando painel de condições do mar...</div>
      </div>
    );
  }

  const activeData = data || defaultData;
  const updatedAtFormatted = activeData.updated_at
    ? new Date(activeData.updated_at).toLocaleString("pt-BR", {
        day: "2-digit",
        month: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
      })
    : "";

  return (
    <div className="rounded-3xl overflow-hidden shadow-xl border border-white/10 transition-all duration-300 hover:scale-[1.01]">
      {/* Seção Superior - Azul Degradê */}
      <div className="bg-gradient-to-b from-[#1b5e8c]/80 to-[#0d3f63]/90 backdrop-blur-md p-5 text-white relative">
        <div className="flex justify-between items-center text-[10px] uppercase tracking-wider text-sky-200/70 font-semibold">
          <span>Condições Atuais</span>
          {updatedAtFormatted && (
            <span className="opacity-90 font-bold bg-sky-950/40 px-2.5 py-0.5 rounded-full border border-sky-300/10 text-[9px] tracking-normal">
              Atualizado: {updatedAtFormatted}
            </span>
          )}
        </div>
        <h3 className="text-xl font-bold mt-1.5 text-white tracking-tight">{activeData.location}</h3>
        <p className="text-xs text-sky-100/80 mt-1 italic font-medium">{activeData.summary}</p>

        <div className="flex items-center justify-between mt-4">
          {/* Estrelas */}
          <div className="flex gap-1">
            {[1, 2, 3, 4, 5].map((s) => (
              <Star
                key={s}
                className={`w-5 h-5 ${
                  s <= (activeData.stars ?? 4)
                    ? "fill-amber-400 text-amber-400"
                    : "text-sky-300/40 fill-sky-300/10"
                }`}
              />
            ))}
          </div>

          {/* Badge de Status */}
          <span className={`text-[10px] uppercase font-bold tracking-wider px-3 py-1 rounded-full border ${statusColors[activeData.status] ?? statusColors.excelente}`}>
            {statusLabels[activeData.status] ?? "Excelente"}
          </span>
        </div>
      </div>

      {/* Seção Inferior - Grid Transparente combinando com o fundo */}
      <div className="bg-[#092942]/65 backdrop-blur-md p-5 space-y-4 border-t border-white/10">
        <div className="grid grid-cols-2 gap-3">
          {/* Ondas */}
          <div className="bg-white/5 border border-white/10 rounded-2xl p-3 flex flex-col items-center justify-center text-center backdrop-blur-sm">
            <Waves className="w-5 h-5 text-sky-400 mb-1" />
            <span className="text-[10px] text-sky-200/60 uppercase font-semibold">Ondas</span>
            <span className="text-base font-extrabold text-white mt-0.5">{activeData.waves}</span>
          </div>

          {/* Período */}
          <div className="bg-white/5 border border-white/10 rounded-2xl p-3 flex flex-col items-center justify-center text-center backdrop-blur-sm">
            <Timer className="w-5 h-5 text-sky-400 mb-1" />
            <span className="text-[10px] text-sky-200/60 uppercase font-semibold">Período</span>
            <span className="text-base font-extrabold text-white mt-0.5">{activeData.period}</span>
          </div>

          {/* Direção da Onda */}
          <div className="bg-white/5 border border-white/10 rounded-2xl p-3 flex flex-col items-center justify-center text-center backdrop-blur-sm">
            <Navigation className="w-5 h-5 text-sky-400 mb-1 rotate-45" />
            <span className="text-[10px] text-sky-200/60 uppercase font-semibold">Dir. Onda</span>
            <span className="text-base font-extrabold text-white mt-0.5">{activeData.wave_dir}</span>
          </div>

          {/* Vento */}
          <div className="bg-white/5 border border-white/10 rounded-2xl p-3 flex flex-col items-center justify-center text-center backdrop-blur-sm">
            <Wind className="w-5 h-5 text-sky-400 mb-1" />
            <span className="text-[10px] text-sky-200/60 uppercase font-semibold">Vento</span>
            <span className="text-base font-extrabold text-white mt-0.5">{activeData.wind}</span>
          </div>

          {/* Água */}
          <div className="bg-white/5 border border-white/10 rounded-2xl p-3 flex flex-col items-center justify-center text-center backdrop-blur-sm">
            <Thermometer className="w-5 h-5 text-sky-300 mb-1" />
            <span className="text-[10px] text-sky-200/60 uppercase font-semibold">Água</span>
            <span className="text-base font-extrabold text-sky-300 mt-0.5">{activeData.water_temp}</span>
          </div>

          {/* Ar */}
          <div className="bg-white/5 border border-white/10 rounded-2xl p-3 flex flex-col items-center justify-center text-center backdrop-blur-sm">
            <Thermometer className="w-5 h-5 text-orange-400 mb-1" />
            <span className="text-[10px] text-sky-200/60 uppercase font-semibold">Ar</span>
            <span className="text-base font-extrabold text-orange-400 mt-0.5">{activeData.air_temp}</span>
          </div>
        </div>

        {/* Footer - Ideal para */}
        {activeData.ideal_for && (
          <div className="text-center pt-2 border-t border-white/10">
            <p className="text-xs font-semibold text-sky-200/90">
              Ideal para: <span className="font-extrabold text-white">{activeData.ideal_for}</span>
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
