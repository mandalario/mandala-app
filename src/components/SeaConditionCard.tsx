import { useEffect, useMemo, useState } from "react";
import { format } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { Waves, Timer, Navigation, Wind, Thermometer, Droplets } from "lucide-react";
import { useTranslation } from "@/i18n/LanguageContext";
import { intlLocaleFor } from "@/i18n/dateLocale";
import { translateStudentContent } from "@/i18n/studentContent";
import { cn } from "@/lib/utils";
import {
  CALENDAR_CONDITION_LEGEND_CLASSES,
  CALENDAR_CONDITION_DOT_COLORS,
  getDayCalendarCondition,
  getDefaultForecastDay,
  getForecastTargetWeekStart,
  getRotatedForecastDays,
  isRotatedForecastDayToday,
  isWeeklySeaForecast,
  type ForecastDayId,
  type SurfConditionKey,
  type WeeklySeaForecast,
} from "@/lib/seaForecastCalendar";

type SeaCondition = {
  location: string;
  summary: string;
  calendar_condition?: SurfConditionKey;
  waves: string;
  period: string;
  wave_dir: string;
  wind: string;
  water_temp: string;
  air_temp: string;
  ideal_for: string;
  updated_at?: string;
};

const DAY_LOCALE_KEYS: Record<ForecastDayId, string> = {
  seg: "mon",
  ter: "tue",
  qua: "wed",
  qui: "thu",
  sex: "fri",
  sab: "sat",
  dom: "sun",
};

export function SeaConditionCard() {
  const { t, language } = useTranslation();
  const intlLocale = intlLocaleFor(language);

  const defaultData: SeaCondition = useMemo(
    () => ({
      location: t("seaCondition.defaults.spot"),
      summary: t("seaCondition.defaults.summary"),
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

  const [data, setData] = useState<Record<string, SeaCondition> | SeaCondition | null>(null);
  const [loading, setLoading] = useState(true);

  const weeklyForecast = isWeeklySeaForecast(data) ? (data as WeeklySeaForecast) : null;
  const rotatedDays = getRotatedForecastDays(
    getForecastTargetWeekStart(weeklyForecast),
    new Date(),
  );
  const [selectedDay, setSelectedDay] = useState<ForecastDayId>(() =>
    getDefaultForecastDay(weeklyForecast),
  );

  useEffect(() => {
    if (weeklyForecast) {
      setSelectedDay(getDefaultForecastDay(weeklyForecast));
    }
  }, [data]);

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
  const weeklyStored = isWeeklyFormat ? (stored as Record<string, SeaCondition>) : null;
  const storedDay = weeklyStored?.[selectedDay];
  const activeData: SeaCondition = isWeeklyFormat
    ? (storedDay ?? defaultData)
    : ((stored as SeaCondition) ?? defaultData);

  const summary = translateStudentContent("seaSummary", activeData.summary, language);
  const idealFor = translateStudentContent("seaIdealFor", activeData.ideal_for, language);
  const calendarCondition = isWeeklyFormat
    ? getDayCalendarCondition(storedDay)
    : getDayCalendarCondition(activeData);

  const calendarConditionLabel = (key: SurfConditionKey) =>
    t(`seaCondition.calendarCondition.${key}`);

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

        {calendarCondition && (
          <div className="mt-4">
            <span
              className={cn(
                "inline-flex items-center gap-2 text-xs font-semibold px-3 py-1.5 rounded-full border",
                CALENDAR_CONDITION_LEGEND_CLASSES[calendarCondition].active,
              )}
            >
              <span
                className={cn(
                  "w-2.5 h-2.5 rounded-full shrink-0",
                  CALENDAR_CONDITION_LEGEND_CLASSES[calendarCondition].dot,
                )}
              />
              {calendarConditionLabel(calendarCondition)}
            </span>
          </div>
        )}
      </div>

      {isWeeklyFormat && (
        <div className="bg-[#0b3350]/90 backdrop-blur-md px-5 py-3 border-t border-white/5 overflow-x-auto scrollbar-hide">
          <div className="flex gap-2 w-max">
            {rotatedDays.map(({ dayId, date }) => {
              const isSelected = selectedDay === dayId;
              const isToday = isRotatedForecastDayToday({ dayId, date });
              const dayData = weeklyStored?.[dayId];
              const dayCond = getDayCalendarCondition(dayData);
              const weekdayLabel = t(`seaCondition.weekdays.${DAY_LOCALE_KEYS[dayId]}`);
              return (
                <button
                  key={`${dayId}-${date.toISOString()}`}
                  type="button"
                  onClick={() => setSelectedDay(dayId)}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                    isSelected
                      ? "bg-sky-400 text-[#092942] shadow-sm shadow-sky-400/20 scale-105"
                      : "bg-white/5 text-sky-200/60 hover:bg-white/10 hover:text-sky-100"
                  }`}
                >
                  <span
                    className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                      dayCond ? CALENDAR_CONDITION_DOT_COLORS[dayCond] : "bg-transparent"
                    }`}
                  />
                  {isToday ? t("seaCondition.today") : `${weekdayLabel} ${format(date, "dd/MM")}`}
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
