import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { OceanBackground } from "@/components/OceanBackground";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { ArrowLeft, Camera, Loader2, LogOut, User as UserIcon } from "lucide-react";
import { useTranslation } from "@/i18n/LanguageContext";

export default function Profile() {
  const { user, profile, refreshProfile, signOut, loading } = useAuth();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const fileRef = useRef<HTMLInputElement>(null);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [form, setForm] = useState({
    full_name: "", phone: "", height_cm: "" as string, weight_kg: "" as string,
    age: "" as string, stance: "desconhecido", surf_level: "iniciante",
    has_own_board: false, can_swim: false, board_size: "",
    emergency_contact_name: "", emergency_contact_phone: "",
    medical_conditions: "", experience_notes: "",
  });

  useEffect(() => {
    if (loading) return;
    if (!user) { navigate("/auth", { replace: true }); return; }
  }, [user, loading, navigate]);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data } = await supabase.from("profiles").select("*").eq("id", user.id).maybeSingle();
      if (data) {
        setForm({
          full_name: data.full_name ?? "",
          phone: data.phone ?? "",
          height_cm: data.height_cm?.toString() ?? "",
          weight_kg: data.weight_kg?.toString() ?? "",
          age: data.age?.toString() ?? "",
          stance: data.stance ?? "desconhecido",
          surf_level: data.surf_level ?? "iniciante",
          has_own_board: !!data.has_own_board,
          can_swim: !!data.can_swim,
          board_size: data.board_size ?? "",
          emergency_contact_name: data.emergency_contact_name ?? "",
          emergency_contact_phone: data.emergency_contact_phone ?? "",
          medical_conditions: data.medical_conditions ?? "",
          experience_notes: data.experience_notes ?? "",
        });
      }
    })();
  }, [user]);

  const save = async () => {
    if (!user) return;
    setSaving(true);
    const payload: any = {
      full_name: form.full_name || null,
      phone: form.phone || null,
      height_cm: form.height_cm ? Number(form.height_cm) : null,
      weight_kg: form.weight_kg ? Number(form.weight_kg) : null,
      age: form.age ? Number(form.age) : null,
      stance: form.stance,
      surf_level: form.surf_level,
      has_own_board: form.has_own_board,
      can_swim: form.can_swim,
      board_size: form.board_size || null,
      emergency_contact_name: form.emergency_contact_name || null,
      emergency_contact_phone: form.emergency_contact_phone || null,
      medical_conditions: form.medical_conditions || null,
      experience_notes: form.experience_notes || null,
    };
    const { error } = await supabase.from("profiles").update(payload).eq("id", user.id);
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success(t("profile.updated"));
    await refreshProfile();
  };

  const onAvatar = async (file: File) => {
    if (!user) return;
    setUploading(true);
    const ext = file.name.split(".").pop() ?? "jpg";
    const path = `${user.id}/avatar-${Date.now()}.${ext}`;
    const { error: upErr } = await supabase.storage.from("avatars").upload(path, file, { upsert: true });
    if (upErr) { setUploading(false); return toast.error(upErr.message); }
    const { data: pub } = supabase.storage.from("avatars").getPublicUrl(path);
    const { error } = await supabase.from("profiles").update({ avatar_url: pub.publicUrl }).eq("id", user.id);
    setUploading(false);
    if (error) return toast.error(error.message);
    toast.success(t("profile.photoUpdated"));
    await refreshProfile();
  };

  if (loading || !profile) {
    return (
      <div className="relative min-h-screen flex items-center justify-center">
        <OceanBackground />
        <Loader2 className="w-6 h-6 animate-spin" />
      </div>
    );
  }

  return (
    <div className="relative min-h-screen pb-24">
      <OceanBackground />
      <header className="px-5 pt-8 pb-4 flex items-center justify-between">
        <Link to="/" className="w-10 h-10 rounded-full glass flex items-center justify-center">
          <ArrowLeft className="w-4 h-4" />
        </Link>
        <h1 className="text-lg font-bold">{t("profile.title")}</h1>
        <button onClick={signOut} className="w-10 h-10 rounded-full glass flex items-center justify-center">
          <LogOut className="w-4 h-4" />
        </button>
      </header>

      <section className="px-5 flex flex-col items-center mt-2">
        <div className="relative">
          <div className="w-24 h-24 rounded-full glass-strong overflow-hidden flex items-center justify-center">
            {profile.avatar_url ? (
              <img src={profile.avatar_url} alt="" className="w-full h-full object-cover" />
            ) : (
              <UserIcon className="w-10 h-10 text-primary" />
            )}
          </div>
          <button
            onClick={() => fileRef.current?.click()}
            className="absolute bottom-0 right-0 w-9 h-9 rounded-full bg-gradient-to-br from-primary to-accent text-primary-foreground flex items-center justify-center shadow-lg"
          >
            {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Camera className="w-4 h-4" />}
          </button>
          <input ref={fileRef} type="file" accept="image/*" className="hidden"
            onChange={(e) => e.target.files?.[0] && onAvatar(e.target.files[0])} />
        </div>
        <p className="text-xs text-muted-foreground mt-3">{profile.email}</p>
        <div className="mt-3 flex flex-col items-center gap-2">
          <div className="inline-flex items-center gap-1.5 text-xs px-3 py-1 rounded-full bg-primary/15 text-primary">
            {profile.credits} {profile.credits === 1 ? t("profile.credit") : t("profile.credits")}
          </div>
          <Link to="/packages" className="text-[10px] uppercase tracking-widest text-primary hover:underline font-bold">
            {t("packages.title")} →
          </Link>
        </div>
      </section>

      <section className="px-5 mt-8 space-y-5">
        <Block title={t("profile.blocks.personal")}>
          <Field label={t("profile.fields.fullName")}><Input value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} /></Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label={t("profile.fields.phone")}><Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></Field>
            <Field label={t("profile.fields.age")}><Input type="number" value={form.age} onChange={(e) => setForm({ ...form, age: e.target.value })} /></Field>
            <Field label={t("profile.fields.height")}><Input type="number" value={form.height_cm} onChange={(e) => setForm({ ...form, height_cm: e.target.value })} /></Field>
            <Field label={t("profile.fields.weight")}><Input type="number" value={form.weight_kg} onChange={(e) => setForm({ ...form, weight_kg: e.target.value })} /></Field>
          </div>
        </Block>

        <Block title={t("profile.blocks.surf")}>
          <div className="grid grid-cols-2 gap-3">
            <Field label={t("profile.fields.level")}>
              <Select value={form.surf_level} onValueChange={(v) => setForm({ ...form, surf_level: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="iniciante">{t("profile.levels.beginner")}</SelectItem>
                  <SelectItem value="intermediario">{t("profile.levels.intermediate")}</SelectItem>
                  <SelectItem value="avancado">{t("profile.levels.advanced")}</SelectItem>
                </SelectContent>
              </Select>
            </Field>
            <Field label={t("profile.fields.stance")}>
              <Select value={form.stance} onValueChange={(v) => setForm({ ...form, stance: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="regular">{t("profile.stances.regular")}</SelectItem>
                  <SelectItem value="goofy">{t("profile.stances.goofy")}</SelectItem>
                  <SelectItem value="desconhecido">{t("profile.stances.unknown")}</SelectItem>
                </SelectContent>
              </Select>
            </Field>
          </div>
          <Field label={t("profile.fields.boardSize")}><Input value={form.board_size} onChange={(e) => setForm({ ...form, board_size: e.target.value })} /></Field>
          <div className="grid grid-cols-2 gap-3">
            <ToggleRow label={t("profile.fields.ownBoard")} value={form.has_own_board} onChange={(v) => setForm({ ...form, has_own_board: v })} />
            <ToggleRow label={t("profile.fields.canSwim")} value={form.can_swim} onChange={(v) => setForm({ ...form, can_swim: v })} />
          </div>
        </Block>

        <Block title={t("profile.blocks.emergency")}>
          <div className="grid grid-cols-2 gap-3">
            <Field label={t("profile.fields.emergencyName")}><Input value={form.emergency_contact_name} onChange={(e) => setForm({ ...form, emergency_contact_name: e.target.value })} /></Field>
            <Field label={t("profile.fields.emergencyPhone")}><Input value={form.emergency_contact_phone} onChange={(e) => setForm({ ...form, emergency_contact_phone: e.target.value })} /></Field>
          </div>
          <Field label={t("profile.fields.medical")}><Textarea rows={2} value={form.medical_conditions} onChange={(e) => setForm({ ...form, medical_conditions: e.target.value })} /></Field>
        </Block>

        <Block title={t("profile.blocks.about")}>
          <Field label={t("profile.fields.notes")}>
            <Textarea rows={3} value={form.experience_notes} onChange={(e) => setForm({ ...form, experience_notes: e.target.value })} />
          </Field>
        </Block>

        <Button onClick={save} disabled={saving} className="w-full h-12 rounded-xl bg-gradient-to-r from-primary to-accent text-primary-foreground font-semibold">
          {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null} {t("profile.save")}
        </Button>
      </section>
    </div>
  );
}

const Block = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <div className="glass-strong rounded-3xl p-5 space-y-3">
    <h2 className="text-xs uppercase tracking-widest text-primary/80">{title}</h2>
    {children}
  </div>
);
const Field = ({ label, children }: { label: string; children: React.ReactNode }) => (
  <div className="space-y-1.5"><Label className="text-xs">{label}</Label>{children}</div>
);
const ToggleRow = ({ label, value, onChange }: { label: string; value: boolean; onChange: (v: boolean) => void }) => (
  <button type="button" onClick={() => onChange(!value)}
    className={`h-10 px-3 rounded-xl border text-sm flex items-center justify-between ${value ? "border-primary/40 bg-primary/10 text-primary" : "border-input bg-background"}`}>
    {label}
    <span className={`w-4 h-4 rounded-full ${value ? "bg-primary" : "bg-muted"}`} />
  </button>
);
