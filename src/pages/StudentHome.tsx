import { useEffect, useState, type MouseEvent } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { OceanBackground } from "@/components/OceanBackground";
import { NotificationsBell } from "@/components/NotificationsBell";
import { CreditsBadge } from "@/components/CreditsBadge";
import { HomeBanners } from "@/components/HomeBanners";
import { HomePartners } from "@/components/HomePartners";
import { DailyQuote } from "@/components/DailyQuote";
import { SeaConditionCard } from "@/components/SeaConditionCard";
import { LessonHistory } from "@/components/LessonHistory";
import { Waves, Calendar, CreditCard, MessageCircle, Video, User as UserIcon, Star, ShoppingBag } from "lucide-react";
import logoMandala from "@/assets/logo-mandala.png";
import { useTranslation } from "@/i18n/LanguageContext";
import { intlLocaleFor } from "@/i18n/dateLocale";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { InstagramLink } from "@/components/InstagramLink";
import { isConfirmedSlot } from "@/lib/slotNotes";
import { useIsApp } from "@/hooks/useIsApp";
import { isIosApp, openWebWithCurrentAuth } from "@/lib/platform";

type NextBooking = { id: string; status: string; class_slots: { date: string; start_time: string; location: string | null; notes: string | null } | null };

export default function StudentHome() {
  const { user, profile } = useAuth();
  const { t, language } = useTranslation();
  const isApp = useIsApp();
  const isIos = isIosApp();
  const intlLocale = intlLocaleFor(language);
  const [next, setNext] = useState<NextBooking[]>([]);
  const [unread, setUnread] = useState(0);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const today = new Date().toISOString().slice(0, 10);
      const { data: nb } = await supabase
        .from("bookings")
        .select("id, status, class_slots(date, start_time, location, notes)")
        .eq("user_id", user.id)
        .eq("status", "confirmed")
        .gte("class_slots.date", today)
        .order("created_at", { ascending: false })
        .limit(3);
      setNext((nb ?? []).filter((x: any) => x.class_slots) as NextBooking[]);
    })();
  }, [user]);

  useEffect(() => {
    if (!user) return;
    const loadUnread = async () => {
      const { count } = await supabase
        .from("chat_messages")
        .select("id", { count: "exact", head: true })
        .eq("conversation_user", user.id)
        .neq("sender_id", user.id)
        .is("read_at", null);
      setUnread(count ?? 0);
    };
    loadUnread();
    const channel = supabase
      .channel("home-chat-unread")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "chat_messages", filter: `conversation_user=eq.${user.id}` },
        () => loadUnread(),
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  return (
    <div className="relative min-h-screen pb-24">
      <OceanBackground />

      {/* Top brand bar */}
      <div className="px-5 pt-6 flex items-start justify-between gap-3 relative z-30">
        <div className="flex flex-col items-start gap-1.5 min-w-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-12 h-12 rounded-2xl bg-white flex items-center justify-center p-1 shadow-soft shrink-0">
              <img src={logoMandala} alt="Mandala Rio Surf School" className="w-full h-full object-contain" />
            </div>
            <div className="leading-tight min-w-0">
              <p className="text-lg font-bold tracking-tight truncate">Mandala Rio</p>
              <p className="text-[11px] uppercase tracking-[0.28em] text-sky-300/90 mt-0.5">{t("dashboard.schoolTagline")}</p>
            </div>
          </div>
          <InstagramLink compact variant="pill" className="mt-0" />
        </div>
        <div className="flex flex-col items-end gap-2 shrink-0">
          <div className="flex items-center gap-2">
            <LanguageSwitcher compact />
            <NotificationsBell />
            <Link to="/profile" className="w-10 h-10 rounded-full glass flex items-center justify-center overflow-hidden shrink-0 ring-2 ring-primary/20" aria-label={t("studentHome.profileAria")}>
              {profile?.avatar_url ? (
                <img src={profile.avatar_url} alt="" className="w-full h-full object-cover" />
              ) : (
                <UserIcon className="w-5 h-5 text-primary" />
              )}
            </Link>
          </div>
          <CreditsBadge
            credits={profile?.credits ?? 0}
            creditsGrupo={profile?.credits_grupo}
            creditsParticular={profile?.credits_particular}
            creditsAluguel={profile?.credits_aluguel}
          />
        </div>
      </div>

      <header className="px-5 pt-6 pb-4">
        <p className="text-[10px] uppercase tracking-[0.3em] text-primary/80">{t("dashboard.welcome")}</p>
        <h1 className="text-2xl font-bold truncate">{profile?.full_name?.split(" ")[0] ?? t("dashboard.defaultName")}</h1>
      </header>

      <section className="px-5">
        <DailyQuote />
      </section>

      <section className="px-5 mt-6">
        <HomeBanners />
      </section>

      <section className="px-5 mt-6">
        <HomePartners />
      </section>

      <section className="px-5 mt-6 grid grid-cols-2 gap-3">
        <ActionTile to="/schedule" icon={<Calendar className="w-5 h-5" />} label={t("dashboard.actions.scheduleTitle")} sub={t("dashboard.actions.scheduleSub")} />
        <ActionTile to="/feed" icon={<Video className="w-5 h-5" />} label={t("dashboard.actions.preSurfingTitle")} sub={t("dashboard.actions.preSurfingSub")} />
        <ActionTile
          to="/chat"
          icon={<MessageCircle className="w-5 h-5" />}
          label={t("dashboard.actions.chatTitle")}
          sub={unread > 0 ? t(unread === 1 ? "dashboard.actions.chatSubUnreadOne" : "dashboard.actions.chatSubUnreadMany", { count: unread }) : t("dashboard.actions.chatSubDefault")}
          badge={unread}
        />
        <ActionTile
          to={isApp ? "/adquirir-aulas" : "/packages"}
          icon={<ShoppingBag className="w-5 h-5" />}
          label="Adquirir Aulas"
          sub="Aulas práticas na praia"
          onClick={
            isIos
              ? (e) => {
                  e.preventDefault();
                  void openWebWithCurrentAuth("/packages");
                }
              : undefined
          }
        />
        <ActionTile
          to="/teachers"
          icon={<Star className="w-5 h-5" />}
          label={t("teacherRatings.shortTitle")}
          sub={t("teacherRatings.shortSub")}
        />
      </section>


      <section className="px-5 mt-8">
        <SeaConditionCard />
      </section>

      <section className="px-5 mt-8">
        <h2 className="text-sm uppercase tracking-widest text-primary/80 mb-3">{t("dashboard.nextClasses")}</h2>
        {next.length === 0 ? (
          <div className="glass rounded-2xl p-8 text-center text-muted-foreground text-sm">
            <Waves className="w-8 h-8 mx-auto mb-2 opacity-50" />
            {t("dashboard.noClasses")}
          </div>
        ) : (
          <div className="space-y-2">
            {next.map((b) => {
              const isConfirmed = isConfirmedSlot(b.class_slots?.notes);
              return (
                <div key={b.id} className="glass rounded-2xl p-4 flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-primary/15 text-primary flex flex-col items-center justify-center text-xs font-bold">
                    <span>{new Date(b.class_slots!.date + "T12:00:00").toLocaleDateString(intlLocale, { day: "2-digit" })}</span>
                    <span className="uppercase">{new Date(b.class_slots!.date + "T12:00:00").toLocaleDateString(intlLocale, { month: "short" }).slice(0, 3)}</span>
                  </div>
                  <div className="flex-1">
                    <div className="font-semibold text-sm flex items-center gap-1.5 flex-wrap">
                      {parseInt(b.class_slots!.start_time.slice(0, 2), 10)}h
                      {isConfirmed && (
                        <span className="inline-flex items-center gap-1 text-[9px] uppercase font-bold px-1.5 py-0.5 rounded-full bg-success/15 text-success border border-success/30">
                          {t("studentHome.confirmed")}
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-muted-foreground">{b.class_slots!.location ?? t("dashboard.locationTBD")}</div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      <section className="px-5 mt-8">
        <LessonHistory />
      </section>
    </div>
  );
}

const ActionTile = ({ to, icon, label, sub, badge, onClick }: { to: string; icon: React.ReactNode; label: string; sub: string; badge?: number; onClick?: (event: MouseEvent<HTMLAnchorElement>) => void }) => (
  <Link to={to} onClick={onClick} className="glass rounded-2xl p-4 text-left hover:bg-secondary/40 transition-colors active:scale-95 block relative">
    <div className="w-10 h-10 rounded-xl bg-primary/15 text-primary flex items-center justify-center mb-3 relative">
      {icon}
      {badge && badge > 0 ? (
        <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-destructive text-destructive-foreground text-[10px] font-bold flex items-center justify-center ring-2 ring-background">
          {badge > 9 ? "9+" : badge}
        </span>
      ) : null}
    </div>
    <div className="font-semibold text-sm flex items-center gap-1.5">
      {label}
      {badge && badge > 0 ? <span className="w-1.5 h-1.5 rounded-full bg-destructive animate-pulse" /> : null}
    </div>
    <div className="text-xs text-muted-foreground mt-0.5">{sub}</div>
  </Link>
);
