import type { Database } from "@/integrations/supabase/types";

export type AdminArea = Database["public"]["Enums"]["admin_area"];

export const SUPER_ADMIN_EMAILS = [
  "contatomandalario@gmail.com",
  "pedrobrasil349@gmail.com",
] as const;

export function isSuperAdminEmail(email: string | null | undefined): boolean {
  if (!email) return false;
  return SUPER_ADMIN_EMAILS.includes(email.trim().toLowerCase() as (typeof SUPER_ADMIN_EMAILS)[number]);
}

/** Todas as áreas do painel (exceto "access", só super admin). */
export const ADMIN_AREAS: { id: AdminArea; path: string; end?: boolean }[] = [
  { id: "dashboard", path: "/admin", end: true },
  { id: "students", path: "/admin/students" },
  { id: "teachers", path: "/admin/teachers" },
  { id: "schedule", path: "/admin/schedule" },
  { id: "forecast", path: "/admin/forecast" },
  { id: "billing", path: "/admin/billing" },
  { id: "packages", path: "/admin/packages" },
  { id: "content", path: "/admin/content" },
  { id: "posts", path: "/admin/posts" },
  { id: "chat", path: "/admin/chat" },
  { id: "notifications", path: "/admin/notifications" },
  { id: "terms", path: "/admin/terms" },
  { id: "privacy", path: "/admin/privacy" },
];

export const GRANTABLE_ADMIN_AREAS = ADMIN_AREAS.filter((a) => a.id !== "access");

export function adminAreaFromPath(pathname: string): AdminArea | null {
  if (pathname === "/admin" || pathname === "/admin/") return "dashboard";
  if (pathname.startsWith("/admin/chat")) return "chat";
  const match = ADMIN_AREAS.find((a) => a.id !== "dashboard" && pathname.startsWith(a.path));
  return match?.id ?? null;
}

export function hasFullAdminAccess(
  isSuperAdmin: boolean,
  areas: AdminArea[] | null,
): boolean {
  if (isSuperAdmin) return true;
  return areas === null || areas.length === 0;
}

export function canAccessAdminArea(
  area: AdminArea,
  isSuperAdmin: boolean,
  areas: AdminArea[] | null,
): boolean {
  if (area === "access") return isSuperAdmin;
  if (hasFullAdminAccess(isSuperAdmin, areas)) return true;
  return areas?.includes(area) ?? false;
}

export function firstAllowedAdminPath(
  isSuperAdmin: boolean,
  areas: AdminArea[] | null,
): string {
  for (const a of ADMIN_AREAS) {
    if (canAccessAdminArea(a.id, isSuperAdmin, areas)) return a.path;
  }
  return "/admin";
}
