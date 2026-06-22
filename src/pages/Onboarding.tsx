import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { OceanBackground } from "@/components/OceanBackground";
import { TermsGate } from "@/components/TermsGate";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { Waves, Loader2, ArrowRight, ArrowLeft } from "lucide-react";
import { ExperienceNotesField } from "@/components/ExperienceNotesField";
import { useTranslation } from "@/i18n/LanguageContext";
import { boardTypeLabel } from "@/i18n/boardTypes";
import { BOARD_TYPES } from "@/lib/board";
import { stripDecimalSeparators } from "@/lib/utils";
import { PhoneInput } from "@/components/PhoneInput";
import { stripDigitsFromName, stripToDecimalInput, stripToDigits } from "@/lib/phone";
import {
  createOnboardingProfileSchema,
  formatAllProfileValidationErrors,
  isOnboardingProfilePersisted,
} from "@/lib/profileFormValidation";
import { checkPhoneAvailable } from "@/lib/checkPhoneAvailable";

export default function Onboarding() {
  const navigate = useNavigate();
  const { user, profile, refreshProfile } = useAuth();
  const { t } = useTranslation();

  const handleBackToAuth = async () => {
    await supabase.auth.signOut();
    navigate("/auth", { replace: true });
  };
  const [step, setStep] = useState<"terms" | "form">("terms");
  const [checkingLegal, setCheckingLegal] = useState(true);
  const [loading, setLoading] = useState(false);

  const parsedBoard = (() => {
    const raw = profile?.board_size ?? "";
    for (const bt of BOARD_TYPES) {
      if (raw.startsWith(bt)) {
        let rem = raw.slice(bt.length).trim();
        if (rem.startsWith("(") && rem.endsWith(")")) {
          rem = rem.slice(1, -1).trim();
        } else if (rem.startsWith("-")) {
          rem = rem.slice(1).trim();
        }
        return { type: bt, size: rem };
      }
    }
    return { type: "", size: raw };
  })();

  const [form, setForm] = useState({
    full_name: profile?.full_name ?? "",
    phone: profile?.phone ?? "",
    age: profile?.age?.toString() ?? "",
    weight_kg: profile?.weight_kg?.toString() ?? "",
    height_cm: profile?.height_cm?.toString() ?? "",
    surf_level: (profile?.surf_level ?? "iniciante") as "iniciante" | "intermediario" | "avancado",
    stance: (profile?.stance ?? "desconhecido") as "regular" | "goofy" | "desconhecido",
    can_swim: !!profile?.can_swim,
    has_own_board: !!profile?.has_own_board,
    board_type: parsedBoard.type,
    board_size: parsedBoard.size,
    experience_notes: profile?.experience_notes ?? "",
    medical_conditions: profile?.medical_conditions ?? "",
    emergency_contact_name: profile?.emergency_contact_name ?? "",
    emergency_contact_phone: profile?.emergency_contact_phone ?? "",
  });

  // Verifica termos
  useEffect(() => {
    let cancelled = false;
    const fallback = setTimeout(() => {
      if (!cancelled) {
        setCheckingLegal(false);
      }
    }, 6000);

    (async () => {
      if (!user) return;
      try {
        const { data: activeTerms } = await supabase
          .from("terms_of_service")
          .select("id")
          .eq("is_active", true)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();

        if (cancelled) return;

        if (!activeTerms) {
          setStep("form");
          setCheckingLegal(false);
          return;
        }

        const { data: termsAccepted } = await supabase
          .from("terms_acceptances")
          .select("id")
          .eq("user_id", user.id)
          .eq("terms_id", activeTerms.id)
          .maybeSingle();

        if (cancelled) return;
        setStep(termsAccepted ? "form" : "terms");
        setCheckingLegal(false);
      } catch {
        if (!cancelled) setCheckingLegal(false);
      }
    })();

    return () => {
      cancelled = true;
      clearTimeout(fallback);
    };
  }, [user]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    if (!form.can_swim) {
      toast.error(t("onboarding.errors.swimRequired"));
      return;
    }

    const combinedBoard = form.board_type && form.board_size 
      ? `${form.board_type} (${form.board_size})`
      : form.board_type || form.board_size || "";

    const dataToValidate = {
      ...form,
      board_size: combinedBoard
    };

    const parsed = createOnboardingProfileSchema(t).safeParse(dataToValidate);
    if (!parsed.success) {
      toast.error(formatAllProfileValidationErrors(parsed.error, t), { duration: 8000 });
      return;
    }

    const phoneCheck = await checkPhoneAvailable(parsed.data.phone, user.id);
    if (!phoneCheck.ok) {
      toast.error(
        t("validation.fieldError", {
          field: t("onboarding.fields.phoneWhatsapp"),
          message: t("validation.phoneCheckFailed"),
        }),
      );
      return;
    }
    if (!phoneCheck.available) {
      toast.error(
        t("validation.fieldError", {
          field: t("onboarding.fields.phoneWhatsapp"),
          message: t("validation.phoneAlreadyUsed"),
        }),
      );
      return;
    }
    setLoading(true);
    const { data: saved, error } = await supabase
      .from("profiles")
      .update({
        full_name: parsed.data.full_name,
        phone: parsed.data.phone,
        age: parsed.data.age,
        weight_kg: parsed.data.weight_kg,
        height_cm: parsed.data.height_cm,
        surf_level: parsed.data.surf_level,
        stance: parsed.data.stance,
        can_swim: parsed.data.can_swim,
        has_own_board: parsed.data.has_own_board,
        board_size: parsed.data.board_size || null,
        experience_notes: parsed.data.experience_notes || null,
        medical_conditions: parsed.data.medical_conditions || null,
        emergency_contact_name: parsed.data.emergency_contact_name,
        emergency_contact_phone: parsed.data.emergency_contact_phone,
        approval_status: "pending",
        profile_completed: true,
      })
      .eq("id", user.id)
      .select(
        "id, full_name, phone, age, weight_kg, height_cm, emergency_contact_name, emergency_contact_phone, profile_completed",
      )
      .single();
    setLoading(false);

    if (error) {
      if (error.code === "23505" && error.message.includes("phone_digits")) {
        toast.error(
          t("validation.fieldError", {
            field: t("onboarding.fields.phoneWhatsapp"),
            message: t("validation.phoneAlreadyUsed"),
          }),
        );
        return;
      }
      if (error.code === "23514" || error.message.includes("profile_incomplete")) {
        toast.error(t("common.saveErrorPrefix") + t("onboarding.errors.saveIncomplete"));
        return;
      }
      toast.error(t("common.saveErrorPrefix") + error.message);
      return;
    }
    if (!isOnboardingProfilePersisted(saved)) {
      await supabase.from("profiles").update({ profile_completed: false }).eq("id", user.id);
      toast.error(t("common.saveErrorPrefix") + t("onboarding.errors.saveIncomplete"));
      return;
    }
    toast.success(t("onboarding.success.submitted"));
    await refreshProfile();
    navigate("/pending", { replace: true });
  };

  const stepLabels: Record<typeof step, { title: string; subtitle: string }> = {
    terms: { title: t("onboarding.termsStep.title"), subtitle: t("onboarding.termsStep.subtitle") },
    form: { title: t("onboarding.formStep.title"), subtitle: t("onboarding.formStep.subtitle") },
  };

  return (
    <div className="relative min-h-screen px-4 py-12">
      <OceanBackground />

      <div className="max-w-2xl mx-auto">
        <div className="mb-4">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={handleBackToAuth}
            className="text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            {t("onboarding.backToLogin")}
          </Button>
        </div>

        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl glass-strong glow-primary mb-3">
            <Waves className="w-7 h-7 text-primary" />
          </div>
          <h1 className="text-3xl md:text-4xl font-bold text-gradient">
            {stepLabels[step].title}
          </h1>
          <p className="text-muted-foreground mt-2">
            {stepLabels[step].subtitle}
          </p>
        </div>

        {/* Stepper */}
        <div className="flex items-center justify-center gap-2 mb-6">
          <Dot active={step === "terms"} done={step !== "terms"} label={t("onboarding.steps.terms")} />
          <div className="h-px w-8 bg-white/10" />
          <Dot active={step === "form"} done={false} label={t("onboarding.steps.form")} />
        </div>

        {checkingLegal ? (
          <div className="glass-strong rounded-3xl p-12 text-center">
            <Loader2 className="w-6 h-6 animate-spin mx-auto text-primary" />
          </div>
        ) : step === "terms" ? (
          <TermsGate onAccepted={() => setStep("form")} />
        ) : (
          <form onSubmit={handleSubmit} className="glass-strong rounded-3xl p-6 md:p-8 space-y-6 shadow-elevated">
            <Section title={t("onboarding.sections.personal")}>
              <Field label={t("profile.fields.fullName")}>
                <Input value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} required className="bg-input/60 border-0 h-11 rounded-xl" />
              </Field>
              <Field label={t("onboarding.fields.phoneWhatsapp")}>
                <PhoneInput
                  value={form.phone}
                  onChange={(phone) => setForm({ ...form, phone })}
                  required
                />
              </Field>
              <div className="grid grid-cols-3 gap-3">
                <Field label={t("profile.fields.age")}>
                  <Input
                    type="text"
                    inputMode="numeric"
                    value={form.age}
                    onChange={(e) => setForm({ ...form, age: stripToDigits(e.target.value, 2) })}
                    required
                    className="bg-input/60 border-0 h-11 rounded-xl"
                  />
                </Field>
                <Field label={t("profile.fields.weight")}>
                  <Input
                    type="text"
                    inputMode="decimal"
                    value={form.weight_kg}
                    onChange={(e) => setForm({ ...form, weight_kg: stripToDecimalInput(e.target.value) })}
                    required
                    className="bg-input/60 border-0 h-11 rounded-xl"
                  />
                </Field>
                <Field label={t("profile.fields.height")}>
                  <Input
                    type="text"
                    inputMode="numeric"
                    value={form.height_cm}
                    onChange={(e) => setForm({ ...form, height_cm: stripDecimalSeparators(e.target.value) })}
                    required
                    className="bg-input/60 border-0 h-11 rounded-xl"
                  />
                </Field>
              </div>
            </Section>

            <Section title={t("onboarding.sections.surf")}>
              <div className="grid md:grid-cols-2 gap-3">
                <Field label={t("profile.fields.level")}>
                  <Select value={form.surf_level} onValueChange={(v) => setForm({ ...form, surf_level: v as typeof form.surf_level })}>
                    <SelectTrigger className="bg-input/60 border-0 h-11 rounded-xl"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="iniciante">{t("profile.levels.beginner")}</SelectItem>
                      <SelectItem value="intermediario">{t("profile.levels.intermediate")}</SelectItem>
                      <SelectItem value="avancado">{t("profile.levels.advanced")}</SelectItem>
                    </SelectContent>
                  </Select>
                </Field>
                <Field label={t("profile.fields.stance")}>
                  <Select value={form.stance} onValueChange={(v) => setForm({ ...form, stance: v as typeof form.stance })}>
                    <SelectTrigger className="bg-input/60 border-0 h-11 rounded-xl"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="regular">{t("onboarding.stances.regularLong")}</SelectItem>
                      <SelectItem value="goofy">{t("onboarding.stances.goofyLong")}</SelectItem>
                      <SelectItem value="desconhecido">{t("onboarding.stances.unknownLong")}</SelectItem>
                    </SelectContent>
                  </Select>
                </Field>
              </div>

              <ToggleRow label={t("onboarding.canSwim.label")} description={t("onboarding.canSwim.description")} checked={form.can_swim} onChange={(v) => setForm({ ...form, can_swim: v })} />
              <ToggleRow label={t("onboarding.ownBoard.label")} description={t("onboarding.ownBoard.description")} checked={form.has_own_board} onChange={(v) => setForm({ ...form, has_own_board: v })} />

              {form.has_own_board && (
                <div className="grid md:grid-cols-2 gap-3">
                  <Field label={t("board.type")}>
                    <Select value={form.board_type} onValueChange={(v) => setForm({ ...form, board_type: v })}>
                      <SelectTrigger className="bg-input/60 border-0 h-11 rounded-xl">
                        <SelectValue placeholder={t("board.selectType")} />
                      </SelectTrigger>
                      <SelectContent>
                        {BOARD_TYPES.map((value) => (
                          <SelectItem key={value} value={value}>{boardTypeLabel(value, t)}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </Field>
                  <Field label={t("board.size")}>
                    <Input 
                      value={form.board_size} 
                      onChange={(e) => setForm({ ...form, board_size: e.target.value })} 
                      placeholder={t("board.sizePlaceholder")} 
                      className="bg-input/60 border-0 h-11 rounded-xl" 
                    />
                  </Field>
                </div>
              )}

              <Field label={t("onboarding.fields.experienceOptional")}>
                <ExperienceNotesField
                  value={form.experience_notes}
                  onChange={(experience_notes) => setForm({ ...form, experience_notes })}
                  rows={3}
                  className="bg-input/60 border-0 rounded-xl min-h-20"
                />
              </Field>
            </Section>

            <Section title={t("onboarding.sections.health")}>
              <Field label={t("onboarding.fields.medicalOptional")}>
                <Textarea value={form.medical_conditions} onChange={(e) => setForm({ ...form, medical_conditions: e.target.value })} className="bg-input/60 border-0 rounded-xl min-h-20" />
              </Field>
              <div className="grid md:grid-cols-2 gap-3">
                <Field label={t("onboarding.fields.emergencyContact")}>
                  <Input
                    value={form.emergency_contact_name}
                    onChange={(e) =>
                      setForm({ ...form, emergency_contact_name: stripDigitsFromName(e.target.value) })
                    }
                    placeholder={t("onboarding.fields.emergencyNamePlaceholder")}
                    required
                    className="bg-input/60 border-0 h-11 rounded-xl"
                  />
                </Field>
                <Field label={t("onboarding.fields.emergencyPhone")}>
                  <PhoneInput
                    value={form.emergency_contact_phone}
                    onChange={(emergency_contact_phone) =>
                      setForm({ ...form, emergency_contact_phone })
                    }
                    required
                  />
                </Field>
              </div>
            </Section>

            <Button type="submit" disabled={loading} className="w-full h-12 rounded-xl bg-gradient-to-r from-primary to-accent text-primary-foreground font-semibold">
              {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : (
                <span className="inline-flex items-center gap-2">{t("onboarding.submit")} <ArrowRight className="w-4 h-4" /></span>
              )}
            </Button>
          </form>
        )}
      </div>
    </div>
  );
}

const Dot = ({ active, done, label }: { active: boolean; done: boolean; label: string }) => (
  <div className={`flex items-center gap-2 ${active || done ? "text-primary" : "text-muted-foreground"}`}>
    <div className={`w-2 h-2 rounded-full ${done ? "bg-success" : active ? "bg-primary" : "bg-muted"}`} />
    <span className="text-xs uppercase tracking-widest">{label}</span>
  </div>
);

const Section = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <div className="space-y-3">
    <h3 className="text-sm uppercase tracking-widest text-primary/80 font-semibold">{title}</h3>
    <div className="space-y-3">{children}</div>
  </div>
);

const Field = ({ label, children }: { label: string; children: React.ReactNode }) => (
  <div className="space-y-1.5">
    <Label className="text-xs text-muted-foreground">{label}</Label>
    {children}
  </div>
);

const ToggleRow = ({ label, description, checked, onChange }: { label: string; description: string; checked: boolean; onChange: (v: boolean) => void }) => (
  <div className="flex items-center justify-between gap-4 p-3 rounded-xl bg-secondary/40">
    <div>
      <div className="text-sm font-medium">{label}</div>
      <div className="text-xs text-muted-foreground">{description}</div>
    </div>
    <Switch checked={checked} onCheckedChange={onChange} />
  </div>
);
