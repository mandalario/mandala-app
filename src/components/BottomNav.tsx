import { Link, useLocation } from "react-router-dom";
import { Home, Calendar, CreditCard, User, MessageCircle } from "lucide-react";
import { useTranslation } from "@/i18n/LanguageContext";

export function BottomNav() {
  const { t } = useTranslation();
  const location = useLocation();

  const isActive = (path: string) => {
    if (path === "/" && location.pathname === "/") return true;
    if (path !== "/" && location.pathname.startsWith(path)) return true;
    return false;
  };

  const navItems = [
    { to: "/", icon: Home, label: t("nav.home") || "Início" },
    { to: "/schedule", icon: Calendar, label: t("nav.schedule") || "Agenda" },
    { to: "/packages", icon: CreditCard, label: t("nav.buy") || "Comprar" },
    { to: "/chat", icon: MessageCircle, label: t("nav.chat") || "Chat" },
    { to: "/profile", icon: User, label: t("nav.profile") || "Perfil" },
  ];

  return (
    <nav className="fixed bottom-0 inset-x-0 z-50 lg:hidden pb-safe">
      <div className="mx-4 mb-4 glass-strong rounded-2xl p-1.5 flex items-center justify-between shadow-2xl ring-1 ring-white/10">
        {navItems.map((item) => {
          const active = isActive(item.to);
          return (
            <Link
              key={item.to}
              to={item.to}
              className={`flex flex-col items-center justify-center flex-1 py-2 gap-1 transition-all duration-300 rounded-xl ${
                active 
                  ? "text-primary bg-primary/10" 
                  : "text-muted-foreground hover:text-foreground hover:bg-secondary/20"
              }`}
            >
              <item.icon className={`w-5 h-5 transition-transform duration-300 ${active ? "scale-110" : ""}`} />
              <span className={`text-[10px] font-medium leading-none ${active ? "opacity-100" : "opacity-80"}`}>
                {item.label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
