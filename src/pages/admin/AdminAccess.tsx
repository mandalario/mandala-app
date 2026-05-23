import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { ShieldCheck, Loader2, Trash2, UserPlus, Search, Pencil } from "lucide-react";
import { useTranslation } from "@/i18n/LanguageContext";
import {
  GRANTABLE_ADMIN_AREAS,
  hasFullAdminAccess,
  isSuperAdminEmail,
  type AdminArea,
} from "@/lib/adminPermissions";

type AdminRow = {
  user_id: string;
  email: string | null;
  full_name: string | null;
  areas: AdminArea[] | null;
};

export default function AdminAccess() {
  const { t } = useTranslation();
  const { user, isSuperAdmin } = useAuth();
  const [admins, setAdmins] = useState<AdminRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [email, setEmail] = useState("");
  const [granting, setGranting] = useState(false);
  const [selectedAreas, setSelectedAreas] = useState<AdminArea[]>(["dashboard"]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editAreas, setEditAreas] = useState<AdminArea[]>([]);
  const [savingEdit, setSavingEdit] = useState(false);

  const areaLabel = (id: AdminArea) => t(`admin.access.areas.${id}`);

  const load = async () => {
    setLoading(true);
    const { data: roles, error } = await supabase
      .from("user_roles")
      .select("user_id")
      .eq("role", "admin");

    if (error) {
      toast.error(t("admin.access.loadError") + error.message);
      setLoading(false);
      return;
    }

    const ids = (roles ?? []).map((r) => r.user_id);
    if (ids.length === 0) {
      setAdmins([]);
      setLoading(false);
      return;
    }

    const [{ data: profiles }, { data: perms }] = await Promise.all([
      supabase.from("profiles").select("id, email, full_name").in("id", ids),
      supabase.from("admin_permissions").select("user_id, area").in("user_id", ids),
    ]);

    const permsByUser = new Map<string, AdminArea[]>();
    for (const p of perms ?? []) {
      const list = permsByUser.get(p.user_id) ?? [];
      list.push(p.area);
      permsByUser.set(p.user_id, list);
    }

    setAdmins(
      ids.map((id) => {
        const p = profiles?.find((x) => x.id === id);
        const userPerms = permsByUser.get(id);
        return {
          user_id: id,
          email: p?.email ?? null,
          full_name: p?.full_name ?? null,
          areas: userPerms && userPerms.length > 0 ? userPerms : null,
        };
      }),
    );
    setLoading(false);
  };

  useEffect(() => {
    if (!isSuperAdmin) return;
    load();
  }, [isSuperAdmin]);

  const toggleArea = (list: AdminArea[], setList: (v: AdminArea[]) => void, area: AdminArea) => {
    if (list.includes(area)) {
      if (list.length === 1) {
        toast.error(t("admin.access.minOneArea"));
        return;
      }
      setList(list.filter((a) => a !== area));
    } else {
      setList([...list, area]);
    }
  };

  const AreaPicker = ({
    value,
    onChange,
  }: {
    value: AdminArea[];
    onChange: (v: AdminArea[]) => void;
  }) => (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
      {GRANTABLE_ADMIN_AREAS.map((a) => (
        <label
          key={a.id}
          className="flex items-center gap-2.5 rounded-xl px-3 py-2 bg-secondary/30 cursor-pointer hover:bg-secondary/50"
        >
          <Checkbox
            checked={value.includes(a.id)}
            onCheckedChange={() => toggleArea(value, onChange, a.id)}
          />
          <span className="text-sm">{areaLabel(a.id)}</span>
        </label>
      ))}
    </div>
  );

  const handleGrant = async (e: React.FormEvent) => {
    e.preventDefault();
    const target = email.trim().toLowerCase();
    if (!target) return;
    if (selectedAreas.length === 0) {
      toast.error(t("admin.access.minOneArea"));
      return;
    }
    setGranting(true);

    const { data: profile, error: pErr } = await supabase
      .from("profiles")
      .select("id, email, full_name")
      .ilike("email", target)
      .maybeSingle();

    if (pErr || !profile) {
      toast.error(t("admin.access.notFound"));
      setGranting(false);
      return;
    }

    const { error: insErr } = await supabase
      .from("user_roles")
      .insert({ user_id: profile.id, role: "admin" });

    if (insErr) {
      setGranting(false);
      if (insErr.code === "23505") {
        toast.info(t("admin.access.alreadyAdmin"));
      } else {
        toast.error(t("admin.access.grantError") + insErr.message);
      }
      return;
    }

    if (!isSuperAdminEmail(profile.email)) {
      const { error: permErr } = await supabase.from("admin_permissions").insert(
        selectedAreas.map((area) => ({ user_id: profile.id, area })),
      );
      if (permErr) {
        setGranting(false);
        toast.error(t("admin.access.permError") + permErr.message);
        return;
      }
    }

    setGranting(false);

    toast.success(t("admin.access.granted", { email: profile.email }));
    setEmail("");
    setSelectedAreas(["dashboard"]);
    load();
  };

  const startEdit = (row: AdminRow) => {
    setEditingId(row.user_id);
    setEditAreas(row.areas?.length ? [...row.areas] : GRANTABLE_ADMIN_AREAS.map((a) => a.id));
  };

  const saveEdit = async (userId: string) => {
    if (editAreas.length === 0) {
      toast.error(t("admin.access.minOneArea"));
      return;
    }
    setSavingEdit(true);
    await supabase.from("admin_permissions").delete().eq("user_id", userId);
    const { error } = await supabase.from("admin_permissions").insert(
      editAreas.map((area) => ({ user_id: userId, area })),
    );
    setSavingEdit(false);
    if (error) {
      toast.error(t("admin.access.permError") + error.message);
      return;
    }
    toast.success(t("admin.access.areasUpdated"));
    setEditingId(null);
    load();
  };

  const handleRevoke = async (row: AdminRow) => {
    if (row.user_id === user?.id) {
      toast.error(t("admin.access.selfRevoke"));
      return;
    }
    if (!confirm(t("admin.access.revokeConfirm", { email: row.email ?? row.user_id }))) return;

    await supabase.from("admin_permissions").delete().eq("user_id", row.user_id);
    const { error } = await supabase
      .from("user_roles")
      .delete()
      .eq("user_id", row.user_id)
      .eq("role", "admin");

    if (error) {
      toast.error(t("admin.access.revokeError") + error.message);
      return;
    }
    toast.success(t("admin.access.revoked"));
    load();
  };

  if (!isSuperAdmin) {
    return (
      <div className="py-12 text-center text-sm text-muted-foreground">
        {t("admin.access.superAdminOnly")}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <ShieldCheck className="w-6 h-6 text-primary" /> {t("admin.access.title")}
        </h1>
        <p className="text-sm text-muted-foreground mt-1">{t("admin.access.subtitle")}</p>
      </div>

      <form onSubmit={handleGrant} className="glass-strong rounded-2xl p-4 md:p-5 space-y-3">
        <label className="text-xs uppercase tracking-widest text-primary/80 font-semibold">
          {t("admin.access.grant")}
        </label>
        <div className="flex flex-col sm:flex-row gap-2">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder={t("admin.access.emailPlaceholder")}
              className="bg-input/60 border-0 h-11 rounded-xl pl-9"
              required
            />
          </div>
          <Button
            type="submit"
            disabled={granting}
            className="h-11 rounded-xl bg-gradient-to-r from-primary to-accent text-primary-foreground font-semibold"
          >
            {granting ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <span className="inline-flex items-center gap-2">
                <UserPlus className="w-4 h-4" /> {t("admin.access.grantBtn")}
              </span>
            )}
          </Button>
        </div>
        <div>
          <p className="text-xs uppercase tracking-widest text-primary/80 font-semibold mb-2">
            {t("admin.access.selectAreas")}
          </p>
          <AreaPicker value={selectedAreas} onChange={setSelectedAreas} />
        </div>
        <p className="text-xs text-muted-foreground">{t("admin.access.grantHint")}</p>
      </form>

      <div className="glass-strong rounded-2xl p-4 md:p-5">
        <h2 className="text-sm uppercase tracking-widest text-primary/80 font-semibold mb-3">
          {t("admin.access.current", { count: admins.length })}
        </h2>
        {loading ? (
          <div className="py-8 text-center">
            <Loader2 className="w-5 h-5 animate-spin mx-auto text-primary" />
          </div>
        ) : admins.length === 0 ? (
          <div className="py-8 text-center text-sm text-muted-foreground">
            {t("admin.access.none")}
          </div>
        ) : (
          <ul className="divide-y divide-white/5">
            {admins.map((a) => (
              <li key={a.user_id} className="py-3 space-y-2">
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <div className="text-sm font-medium truncate">
                      {a.full_name || a.email || a.user_id}
                    </div>
                    {a.email && a.full_name && (
                      <div className="text-xs text-muted-foreground truncate">{a.email}</div>
                    )}
                    {a.user_id === user?.id && (
                      <span className="inline-block mt-1 text-[10px] uppercase tracking-widest text-primary">
                        {t("admin.access.you")}
                      </span>
                    )}
                    {editingId !== a.user_id && (
                      <p className="text-xs text-muted-foreground mt-1">
                        {hasFullAdminAccess(false, a.areas)
                          ? t("admin.access.fullAccess")
                          : a.areas?.map(areaLabel).join(" · ")}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    {a.user_id !== user?.id && (
                      <>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => (editingId === a.user_id ? setEditingId(null) : startEdit(a))}
                          className="text-primary hover:text-primary"
                        >
                          <Pencil className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleRevoke(a)}
                          className="text-destructive hover:text-destructive hover:bg-destructive/10"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </>
                    )}
                  </div>
                </div>
                {editingId === a.user_id && (
                  <div className="space-y-2 pl-1">
                    <AreaPicker value={editAreas} onChange={setEditAreas} />
                    <div className="flex gap-2">
                      <Button size="sm" disabled={savingEdit} onClick={() => saveEdit(a.user_id)}>
                        {savingEdit ? <Loader2 className="w-4 h-4 animate-spin" /> : t("admin.shared.apply")}
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => setEditingId(null)}>
                        {t("common.cancel")}
                      </Button>
                    </div>
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
