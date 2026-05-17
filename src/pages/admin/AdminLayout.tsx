import { useEffect } from "react";
import { Link, NavLink, Outlet, useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { OceanBackground } from "@/components/OceanBackground";
import { Brand } from "@/components/Brand";
import { NotificationsBell } from "@/components/NotificationsBell";
import { LayoutDashboard, Users, CalendarDays, ScrollText, Video, MessageCircle, LogOut, Package, Wind, Image as ImageIcon, DollarSign, ShieldCheck, Bell, KeyRound, Loader2 } from "lucide-react";
import logoMandala from "@/assets/logo-mandala.png";

const nav = [
  { to: "/admin", label: "Dashboard", icon: LayoutDashboard, end: true },
  { to: "/admin/students", label: "Alunos", icon: Users },
  { to: "/admin/schedule", label: "Agenda & Mar", icon: CalendarDays },
  { to: "/admin/forecast", label: "Previsão", icon: Wind },
  { to: "/admin/billing", label: "Cobrança", icon: DollarSign },
  { to: "/admin/packages", label: "Pacotes", icon: Package },
  { to: "/admin/content", label: "Conteúdo", icon: ImageIcon },
  { to: "/admin/posts", label: "Posts", icon: Video },
  { to: "/admin/chat", label: "Chat", icon: MessageCircle },
  { to: "/admin/notifications", label: "Notificações", icon: Bell },
  { to: "/admin/terms", label: "Termos", icon: ScrollText },
  { to: "/admin/privacy", label: "Privacidade", icon: ShieldCheck },
  { to: "/admin/access", label: "Admins", icon: KeyRound },
];

export default function AdminLayout() {
  const { profile, signOut, isAdmin, loading, user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (loading) return;
    if (!user) {
      navigate("/auth", { replace: true });
    } else if (!isAdmin) {
      navigate("/", { replace: true });
    }
  }, [user, isAdmin, loading, navigate]);

  if (loading || !user || !isAdmin) {
    return (
      <div className="relative min-h-screen flex items-center justify-center">
        <OceanBackground />
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="relative min-h-screen flex">
      <OceanBackground />

      {/* Sidebar - desktop */}
      <aside className="hidden lg:flex w-64 flex-col p-4 sticky top-0 h-screen">
        <div className="glass-strong rounded-3xl flex-1 flex flex-col p-4">
          <div className="flex items-center gap-3 px-2 py-3 mb-2">
            <div className="w-11 h-11 rounded-2xl bg-white flex items-center justify-center glow-primary shrink-0 p-1">
              <img src={logoMandala} alt="Mandala Rio" className="w-full h-full object-contain" />
            </div>
            <Brand size="sm" align="left" />
          </div>
          <nav className="flex-1 space-y-1">
            {nav.map((n) => (
              <NavLink
                key={n.to}
                to={n.to}
                end={n.end}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-colors ${isActive ? "bg-primary/15 text-primary font-semibold" : "text-foreground/70 hover:bg-secondary/40"}`
                }
              >
                <n.icon className="w-4 h-4" /> {n.label}
              </NavLink>
            ))}
          </nav>
          <div className="mt-2 flex items-center gap-2 px-2">
            <NotificationsBell />
            <button onClick={signOut} className="flex-1 flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-foreground/70 hover:bg-secondary/40">
              <LogOut className="w-4 h-4" /> Sair
            </button>
          </div>
          <div className="text-[10px] text-muted-foreground px-3 mt-2">{profile?.email}</div>
        </div>
      </aside>

      {/* Mobile top bar */}
      <div className="lg:hidden fixed top-0 inset-x-0 z-30 glass-strong">
        <div className="flex items-center justify-between px-4 py-3">
          <Link to="/admin" className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-xl bg-white flex items-center justify-center shrink-0 p-0.5"><img src={logoMandala} alt="Mandala Rio" className="w-full h-full object-contain" /></div>
            <Brand size="sm" align="left" />
          </Link>
          <div className="flex items-center gap-2">
            <NotificationsBell />
            <button onClick={signOut} className="w-9 h-9 rounded-full glass flex items-center justify-center"><LogOut className="w-4 h-4" /></button>
          </div>
        </div>
        <div className="overflow-x-auto no-scrollbar border-t border-white/5">
          <div className="flex gap-1 px-2 py-2 min-w-max">
            {nav.map((n) => (
              <NavLink key={n.to} to={n.to} end={n.end}
                className={({ isActive }) => `whitespace-nowrap px-3 py-1.5 rounded-lg text-xs flex items-center gap-1.5 ${isActive ? "bg-primary/20 text-primary font-semibold" : "text-foreground/70"}`}>
                <n.icon className="w-3.5 h-3.5" />{n.label}
              </NavLink>
            ))}
          </div>
        </div>
      </div>

      <main className="flex-1 min-w-0 pt-28 lg:pt-6 pb-12 px-5 lg:px-8">
        <div className="max-w-6xl mx-auto">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
