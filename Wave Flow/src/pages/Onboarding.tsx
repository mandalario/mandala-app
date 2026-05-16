import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { z } from "zod";
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

const schema = z.object({
  full_name: z.string().trim().min(2).max(100),
  phone: z.string().trim().min(8).max(20),
  age: z.coerce.number().int().min(5).max(99),
  weight_kg: z.coerce.number().min(20).max(250),
  height_cm: z.coerce.number().min(80).max(230),
  surf_level: z.enum(["iniciante", "intermediario", "avancado"]),
  stance: z.enum(["regular", "goofy", "desconhecido"]),
  can_swim: z.boolean(),
  has_own_board: z.boolean(),
  board_size: z.string().trim().max(50).optional().or(z.literal("")),
  experience_notes: z.string().trim().max(500).optional().or(z.literal("")),
  medical_conditions: z.string().trim().max(500).optional().or(z.literal("")),
  emergency_contact_name: z.string().trim().min(2).max(100),
  emergency_contact_phone: z.string().trim().min(8).max(20),
});

export default function Onboarding() {
  const navigate = useNavigate();
  const { user, profile, refreshProfile } = useAuth();

  const handleBackToAuth = async () => {
    await supabase.auth.signOut();
    navigate("/auth", { replace: true });
  };
  const [step, setStep] = useState<"terms" | "form">("terms");
  const [checkingLegal, setCheckingLegal] = useState(true);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    full_name: profile?.full_name ?? "",
    phone: "",
    age: "",
    weight_kg: "",
    height_cm: "",
    surf_level: "iniciante" as "iniciante" | "intermediario" | "avancado",
    stance: "desconhecido" as "regular" | "goofy" | "desconhecido",
    can_swim: false,
    has_own_board: false,
    board_size: "",
    experience_notes: "",
    medical_conditions: "",
    emergency_contact_name: "",
    emergency_contact_phone: "",
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
    const parsed = schema.safeParse(form);
    if (!parsed.success) {
      toast.error(parsed.error.issues[0].message);
      return;
    }
    setLoading(true);
    const { error } = await supabase
      .from("profiles")
      .upsert({
        id: user.id,
        email: user.email ?? profile?.email ?? "",
        ...parsed.data,
        board_size: parsed.data.board_size || null,
        experience_notes: parsed.data.experience_notes || null,
        medical_conditions: parsed.data.medical_conditions || null,
        approval_status: "pending",
        profile_completed: true,
      }, { onConflict: "id" });
    setLoading(false);

    if (error) {
      toast.error("Erro ao salvar: " + error.message);
      return;
    }
    toast.success("Ficha enviada! Aguarde aprovação do admin.");
    await refreshProfile();
    navigate("/", { replace: true });
  };

  const stepLabels: Record<typeof step, { title: string; subtitle: string }> = {
    terms: { title: "Antes de começar", subtitle: "Leia os termos até o fim para liberar a próxima etapa." },
    form: { title: "Sua ficha técnica", subtitle: "Para o instrutor te conhecer melhor antes da primeira aula." },
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
            Voltar para login
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
          <Dot active={step === "terms"} done={step !== "terms"} label="Termos" />
          <div className="h-px w-8 bg-white/10" />
          <Dot active={step === "form"} done={false} label="Ficha" />
        </div>

        {checkingLegal ? (
          <div className="glass-strong rounded-3xl p-12 text-center">
            <Loader2 className="w-6 h-6 animate-spin mx-auto text-primary" />
          </div>
        ) : step === "terms" ? (
          <TermsGate onAccepted={() => setStep("form")} />
        ) : (
          <form onSubmit={handleSubmit} className="glass-strong rounded-3xl p-6 md:p-8 space-y-6 shadow-elevated">
            <Section title="Dados pessoais">
              <Field label="Nome completo">
                <Input value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} required className="bg-input/60 border-0 h-11 rounded-xl" />
              </Field>
              <Field label="Telefone (WhatsApp)">
                <Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="(11) 99999-9999" required className="bg-input/60 border-0 h-11 rounded-xl" />
              </Field>
              <div className="grid grid-cols-3 gap-3">
                <Field label="Idade">
                  <Input type="number" value={form.age} onChange={(e) => setForm({ ...form, age: e.target.value })} required className="bg-input/60 border-0 h-11 rounded-xl" />
                </Field>
                <Field label="Peso (kg)">
                  <Input type="number" step="0.1" value={form.weight_kg} onChange={(e) => setForm({ ...form, weight_kg: e.target.value })} required className="bg-input/60 border-0 h-11 rounded-xl" />
                </Field>
                <Field label="Altura (cm)">
                  <Input type="number" value={form.height_cm} onChange={(e) => setForm({ ...form, height_cm: e.target.value })} required className="bg-input/60 border-0 h-11 rounded-xl" />
                </Field>
              </div>
            </Section>

            <Section title="Sobre seu surf">
              <div className="grid md:grid-cols-2 gap-3">
                <Field label="Nível">
                  <Select value={form.surf_level} onValueChange={(v) => setForm({ ...form, surf_level: v as typeof form.surf_level })}>
                    <SelectTrigger className="bg-input/60 border-0 h-11 rounded-xl"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="iniciante">Iniciante</SelectItem>
                      <SelectItem value="intermediario">Intermediário</SelectItem>
                      <SelectItem value="avancado">Avançado</SelectItem>
                    </SelectContent>
                  </Select>
                </Field>
                <Field label="Base">
                  <Select value={form.stance} onValueChange={(v) => setForm({ ...form, stance: v as typeof form.stance })}>
                    <SelectTrigger className="bg-input/60 border-0 h-11 rounded-xl"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="regular">Regular (pé esquerdo na frente)</SelectItem>
                      <SelectItem value="goofy">Goofy (pé direito na frente)</SelectItem>
                      <SelectItem value="desconhecido">Não sei ainda</SelectItem>
                    </SelectContent>
                  </Select>
                </Field>
              </div>

              <ToggleRow label="Sei nadar" description="Importante para sua segurança no mar" checked={form.can_swim} onChange={(v) => setForm({ ...form, can_swim: v })} />
              <ToggleRow label="Tenho prancha própria" description="Caso contrário, providenciamos uma" checked={form.has_own_board} onChange={(v) => setForm({ ...form, has_own_board: v })} />

              {form.has_own_board && (
                <Field label="Tamanho da prancha">
                  <Input value={form.board_size} onChange={(e) => setForm({ ...form, board_size: e.target.value })} placeholder={`Ex: 6'2"`} className="bg-input/60 border-0 h-11 rounded-xl" />
                </Field>
              )}

              <Field label="Experiência prévia (opcional)">
                <Textarea value={form.experience_notes} onChange={(e) => setForm({ ...form, experience_notes: e.target.value })} className="bg-input/60 border-0 rounded-xl min-h-20" />
              </Field>
            </Section>

            <Section title="Saúde & emergência">
              <Field label="Condições médicas (opcional)">
                <Textarea value={form.medical_conditions} onChange={(e) => setForm({ ...form, medical_conditions: e.target.value })} className="bg-input/60 border-0 rounded-xl min-h-20" />
              </Field>
              <div className="grid md:grid-cols-2 gap-3">
                <Field label="Contato de emergência">
                  <Input value={form.emergency_contact_name} onChange={(e) => setForm({ ...form, emergency_contact_name: e.target.value })} required className="bg-input/60 border-0 h-11 rounded-xl" />
                </Field>
                <Field label="Telefone do contato">
                  <Input value={form.emergency_contact_phone} onChange={(e) => setForm({ ...form, emergency_contact_phone: e.target.value })} required className="bg-input/60 border-0 h-11 rounded-xl" />
                </Field>
              </div>
            </Section>

            <Button type="submit" disabled={loading} className="w-full h-12 rounded-xl bg-gradient-to-r from-primary to-accent text-primary-foreground font-semibold">
              {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : (
                <span className="inline-flex items-center gap-2">Enviar ficha <ArrowRight className="w-4 h-4" /></span>
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
