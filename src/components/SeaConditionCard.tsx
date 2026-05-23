import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Waves, Timer, Navigation, Wind, Thermometer, Star, Droplets } from "lucide-react";
import { useTranslation } from "@/i18n/LanguageContext";
import { intlLocaleFor } from "@/i18n/dateLocale";
import { translateStudentContent } from "@/i18n/studentContent";

type SeaStatus = "excelente" | "bom" | "medio" | "ruim" | "flat";

type SeaCondition = {
  location: string;
  summary: string;
  stars: number;
  status: SeaStatus;
  waves: string;
  period: string;
  wave_dir: string;
  wind: string;
  water_temp: string;
  air_temp: string;
  ideal_for: string;
  updated_at?: string;
};

const statusColors: Record<SeaStatus, string> = {
  excelente: "bg-emerald-500/35 text-emerald-100 border-emerald-400/40",
  bom: "bg-teal-500/35 text-teal-100 border-teal-400/40",
  medio: "bg-amber-500/35 text-amber-100 border-amber-400/40",
  ruim: "bg-rose-500/35 text-rose-100 border-rose-400/40",
  flat: "bg-sky-500/35 text-sky-100 border-sky-400/40",
};

const DAY_IDS = ["dom", "seg", "ter", "qua", "qui", "sex", "sab"] as const;
const DAY_LOCALE_KEYS = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"] as const;

const STATUS_LOCALE_KEYS: Record<SeaStatus, string> = {
  excelente: "excellent",
  bom: "good",
  medio: "medium",
  ruim: "bad",
  flat: "flat",
};

export function SeaConditionCard() {
  const { t, language } = useTranslation();
  const intlLocale = intlLocaleFor(language);

  const defaultData: SeaCondition = useMemo(
    () => ({
      location: t("seaCondition.defaults.spot"),
      summary: t("seaCondition.defaults.summary"),
      stars: 4,
      status: "excelente",
      waves: "1.2m",
      period: "10s",
      wave_dir: "SSE",
      wind: "E",
      water_temp: "22°C",
      air_temp: "0.4m",
      ideal_for: t("seaCondition.defaults.levels"),
      updated_at: new Date().toISOString(),
    }),
    [t],
  );

  const daysOfWeekList = useMemo(
    () =>
      DAY_IDS.map((id, i) => ({
        id,
        label: t(`seaCondition.weekdays.${DAY_LOCALE_KEYS[i]}`),
      })),
    [t],
  );

  const statusLabel = (status: SeaStatus) => t(`seaCondition.status.${STATUS_LOCALE_KEYS[status]}`);

  const [data, setData] = useState<Record<string, SeaCondition> | SeaCondition | null>(null);
  const [loading, setLoading] = useState(true);

  const todayIndex = new Date().getDay();
  const [selectedDay, setSelectedDay] = useState(DAY_IDS[todayIndex]);

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
        }
      } catch (e) {
        console.error("Erro ao carregar condições do mar:", e);
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
          if (payload.new && (payload.new as { value?: string }).value) {
            try {
              setData(JSON.parse((payload.new as { value: string }).value));
            } catch (e) {
              console.error(e);
            }
          }
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  if (loading) {
    return (
      <div className="glass rounded-3xl p-6 animate-pulse flex items-center justify-center min-h-[250px]">
        <div className="text-sm text-muted-foreground">{t("seaCondition.loading")}</div>
      </div>
    );
  }

  const stored = data ?? defaultData;
  const isWeeklyFormat = stored !== null && typeof stored === "object" && "seg" in stored;
  const activeData: SeaCondition = isWeeklyFormat
    ? ((stored as Record<string, SeaCondition>)[selectedDay] ?? defaultData)
    : ((stored as SeaCondition) ?? defaultData);

  const summary = translateStudentContent("seaSummary", activeData.summary, language);
  const idealFor = translateStudentContent("seaIdealFor", activeData.ideal_for, language);

  const updatedAtFormatted =
    data && typeof data === "object" && "updated_at" in data && data.updated_at
      ? new Date(data.updated_at as string).toLocaleString(intlLocale, {
          day: "2-digit",
          month: "2-digit",
          hour: "2-digit",
          minute: "2-digit",
        })
      : "";

  return (
    <div className="rounded-3xl overflow-hidden shadow-xl border border-white/10 transition-all duration-300 hover:scale-[1.01]">
      <div className="bg-gradient-to-b from-[#1b5e8c]/80 to-[#0d3f63]/90 backdrop-blur-md p-5 text-white relative">
        <div className="flex justify-between items-center text-[10px] uppercase tracking-wider text-sky-200/70 font-semibold">
          <span>{t("seaCondition.title")}</span>
          {updatedAtFormatted ? <span>{updatedAtFormatted}</span> : null}
        </div>
        <h3 className="text-xl font-bold mt-1.5 text-white tracking-tight">{activeData.location}</h3>
        <p className="text-xs text-sky-100/80 mt-1 italic font-medium">{summary}</p>

        <div className="flex items-center justify-between mt-4">
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

          <span
            className={`text-[10px] uppercase font-bold tracking-wider px-3 py-1 rounded-full border ${
              statusColors[activeData.status] ?? statusColors.excelente
            }`}
          >
            {statusLabel(activeData.status)}
          </span>
        </div>
      </div>

      {isWeeklyFormat && (
        <div className="bg-[#0b3350]/90 backdrop-blur-md px-5 py-3 border-t border-white/5 overflow-x-auto scrollbar-hide">
          <div className="flex gap-2 w-max">
            {daysOfWeekList.map((d) => {
              const isSelected = selectedDay === d.id;
              const isToday = d.id === DAY_IDS[todayIndex];
              return (
                <button
                  key={d.id}
                  type="button"
                  onClick={() => setSelectedDay(d.id)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                    isSelected
                      ? "bg-sky-400 text-[#092942] shadow-sm shadow-sky-400/20 scale-105"
                      : "bg-white/5 text-sky-200/60 hover:bg-white/10 hover:text-sky-100"
                  }`}
                >
                  {isToday ? t("seaCondition.today") : d.label}
                </button>
              );
            })}
          </div>
        </div>
      )}

      <div className="bg-[#092942]/65 backdrop-blur-md p-5 space-y-4 border-t border-white/10">
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-white/5 border border-white/10 rounded-2xl p-3 flex flex-col items-center justify-center text-center backdrop-blur-sm">
            <Waves className="w-5 h-5 text-sky-400 mb-1" />
            <span className="text-[10px] text-sky-200/60 uppercase font-semibold">{t("seaCondition.metrics.waves")}</span>
            <span className="text-base font-extrabold text-white mt-0.5">{activeData.waves}</span>
          </div>

          <div className="bg-white/5 border border-white/10 rounded-2xl p-3 flex flex-col items-center justify-center text-center backdrop-blur-sm">
            <Timer className="w-5 h-5 text-sky-400 mb-1" />
            <span className="text-[10px] text-sky-200/60 uppercase font-semibold">{t("seaCondition.metrics.period")}</span>
            <span className="text-base font-extrabold text-white mt-0.5">{activeData.period}</span>
          </div>

          <div className="bg-white/5 border border-white/10 rounded-2xl p-3 flex flex-col items-center justify-center text-center backdrop-blur-sm">
            <Navigation className="w-5 h-5 text-sky-400 mb-1 rotate-45" />
            <span className="text-[10px] text-sky-200/60 uppercase font-semibold">{t("seaCondition.metrics.waveDir")}</span>
            <span className="text-base font-extrabold text-white mt-0.5">{activeData.wave_dir}</span>
          </div>

          <div className="bg-white/5 border border-white/10 rounded-2xl p-3 flex flex-col items-center justify-center text-center backdrop-blur-sm">
            <Wind className="w-5 h-5 text-sky-400 mb-1" />
            <span className="text-[10px] text-sky-200/60 uppercase font-semibold">{t("seaCondition.metrics.windDir")}</span>
            <span className="text-base font-extrabold text-white mt-0.5">{activeData.wind}</span>
          </div>

          <div className="bg-white/5 border border-white/10 rounded-2xl p-3 flex flex-col items-center justify-center text-center backdrop-blur-sm">
            <Thermometer className="w-5 h-5 text-sky-300 mb-1" />
            <span className="text-[10px] text-sky-200/60 uppercase font-semibold">{t("seaCondition.metrics.water")}</span>
            <span className="text-base font-extrabold text-sky-300 mt-0.5">{activeData.water_temp}</span>
          </div>

          <div className="bg-white/5 border border-white/10 rounded-2xl p-3 flex flex-col items-center justify-center text-center backdrop-blur-sm">
            <Droplets className="w-5 h-5 text-orange-400 mb-1" />
            <span className="text-[10px] text-sky-200/60 uppercase font-semibold">{t("seaCondition.metrics.tide")}</span>
            <span className="text-base font-extrabold text-orange-400 mt-0.5">{activeData.air_temp}</span>
          </div>
        </div>

        {idealFor && (
          <div className="text-center pt-2 border-t border-white/10">
            <p className="text-xs font-semibold text-sky-200/90">
              {t("seaCondition.metrics.idealFor")}{" "}
              <span className="font-extrabold text-white">{idealFor}</span>
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
