import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { CheckCircle2, XCircle, Search, Loader2, X, Plus, Save, User, Phone, Mail, Heart, Activity, Trash2 } from "lucide-react";

type Student = {
  id: string; email: string; full_name: string | null; phone: string | null;
  age: number | null; weight_kg: number | null; height_cm: number | null;
  surf_level: string | null; stance: string | null; can_swim: boolean | null;
  has_own_board: boolean | null; board_size: string | null;
  experience_notes: string | null; medical_conditions: string | null;
  emergency_contact_name: string | null; emergency_contact_phone: string | null;
  approval_status: string; credits: number; created_at: string;
};

export default function AdminStudents() {
  const [list, setList] = useState<Student[]>([]);
  const [filter, setFilter] = useState<"pending" | "approved" | "rejected" | "all">("approved");
  const [q, setQ] = useState("");
  const [open, setOpen] = useState<Student | null>(null);
  const [creating, setCreating] = useState(false);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    const { data: admins } = await supabase.from("user_roles").select("user_id").eq("role", "admin");
    const adminIds = (admins ?? []).map((r: any) => r.user_id);
    let query = supabase.from("profiles").select("*").order("created_at", { ascending: false });
    if (filter !== "all") query = query.eq("approval_status", filter);
    if (filter === "pending") query = query.eq("profile_completed", true);
    if (adminIds.length) query = query.not("id", "in", `(${adminIds.join(",")})`);
    const { data } = await query;
    setList((data ?? []) as Student[]);
    setLoading(false);
  };
  useEffect(() => { load(); }, [filter]);

  const filtered = list.filter((s) => {
    if (!q) return true;
    const t = q.toLowerCase();
    return (s.full_name ?? "").toLowerCase().includes(t) || s.email.toLowerCase().includes(t);
  });

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-widest text-primary/80">Gestão</p>
          <h1 className="text-3xl font-bold">Alunos</h1>
        </div>
        <Button onClick={() => setCreating(true)} className="rounded-xl">
          <Plus className="w-4 h-4 mr-2" /> Novo aluno
        </Button>
      </div>

      <div className="flex flex-col md:flex-row md:items-center gap-3">
        <div className="flex gap-1 p-1 rounded-xl bg-secondary/40 w-fit">
          {(["pending", "approved", "rejected", "all"] as const).map((f) => (
            <button key={f} onClick={() => setFilter(f)} className={`px-3 py-1.5 rounded-lg text-xs font-medium ${filter === f ? "bg-primary text-primary-foreground" : "text-muted-foreground"}`}>
              {f === "pending" ? "Pendentes" : f === "approved" ? "Aprovados" : f === "rejected" ? "Rejeitados" : "Todos"}
            </button>
          ))}
        </div>
        <div className="relative md:w-72">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar..." className="bg-input/60 border-0 h-10 rounded-xl pl-9" />
        </div>
      </div>

      {loading ? (
        <div className="glass rounded-2xl p-12 text-center"><Loader2 className="w-5 h-5 animate-spin mx-auto" /></div>
      ) : filtered.length === 0 ? (
        <div className="glass rounded-2xl p-12 text-center text-muted-foreground">Nenhum aluno encontrado.</div>
      ) : (
        <div className="space-y-2">
          {filtered.map((s) => (
            <button key={s.id} onClick={() => setOpen(s)} className="w-full text-left glass-strong rounded-2xl p-4 flex items-center gap-3 hover:bg-secondary/30 transition-colors">
              <div className="w-10 h-10 rounded-xl bg-primary/15 text-primary flex items-center justify-center font-semibold">
                {(s.full_name ?? s.email)[0]?.toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-semibold truncate">{s.full_name ?? "Sem nome"}</span>
                  <Badge status={s.approval_status} />
                  {s.surf_level && <span className="text-[10px] uppercase px-2 py-0.5 rounded-full bg-secondary/60">{s.surf_level}</span>}
                </div>
                <div className="text-xs text-muted-foreground truncate">{s.email}</div>
              </div>
              <div className="text-xs text-muted-foreground hidden md:block">{s.credits} créd.</div>
            </button>
          ))}
        </div>
      )}

      {open && <StudentSheet student={open} onClose={() => setOpen(null)} onSaved={() => { setOpen(null); load(); }} />}
      {creating && <CreateStudentSheet onClose={() => setCreating(false)} onCreated={() => { setCreating(false); load(); }} />}
    </div>
  );
}

const Badge = ({ status }: { status: string }) => {
  const map: any = {
    pending: "bg-warning/15 text-warning",
    approved: "bg-success/15 text-success",
    rejected: "bg-destructive/15 text-destructive",
  };
  const lbl: any = { pending: "pendente", approved: "aprovado", rejected: "rejeitado" };
  return <span className={`text-[10px] uppercase tracking-widest px-2 py-0.5 rounded-full ${map[status]}`}>{lbl[status]}</span>;
};

/* ---------------- Full-screen overlay ---------------- */
const Overlay = ({ children, onClose, title, subtitle, badge }: any) => (
  <div className="fixed inset-0 z-[100] bg-background/90 backdrop-blur-md overflow-y-auto" onClick={onClose}>
    <div
      className="min-h-full w-full flex items-stretch justify-center p-0 sm:p-4 md:p-8"
      onClick={(e) => e.stopPropagation()}
    >
      <div className="glass-strong w-full max-w-4xl rounded-none sm:rounded-3xl my-0 sm:my-4 flex flex-col">
        <div className="sticky top-0 z-10 flex items-center justify-between gap-3 p-5 border-b border-border/40 bg-background/70 backdrop-blur-xl rounded-t-none sm:rounded-t-3xl">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-xl font-bold truncate">{title}</h2>
              {badge}
            </div>
            {subtitle && <div className="text-sm text-muted-foreground truncate">{subtitle}</div>}
          </div>
          <button onClick={onClose} className="w-9 h-9 rounded-xl hover:bg-secondary/60 flex items-center justify-center shrink-0">
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="p-5 md:p-6 space-y-6">{children}</div>
      </div>
    </div>
  </div>
);

/* ---------------- Edit student ---------------- */
function StudentSheet({ student, onClose, onSaved }: { student: Student; onClose: () => void; onSaved: () => void }) {
  const [f, setF] = useState<Student>(student);
  const [saving, setSaving] = useState(false);
  const set = (k: keyof Student, v: any) => setF((p) => ({ ...p, [k]: v }));

  const decide = async (status: "approved" | "rejected") => {
    const { error } = await supabase.from("profiles").update({ approval_status: status }).eq("id", student.id);
    if (error) return toast.error(error.message);
    await supabase.from("notifications").insert({
      user_id: student.id,
      title: status === "approved" ? "Cadastro aprovado!" : "Cadastro recusado",
      body: status === "approved" ? "Você já pode agendar aulas." : "Entre em contato com o instrutor.",
      kind: "approval",
    });
    toast.success(status === "approved" ? "Aluno aprovado" : "Aluno rejeitado");
    onSaved();
  };

  const save = async () => {
    setSaving(true);
    const { error } = await supabase.from("profiles").update({
      full_name: f.full_name,
      phone: f.phone,
      age: f.age,
      weight_kg: f.weight_kg,
      height_cm: f.height_cm,
      surf_level: f.surf_level as any,
      stance: f.stance as any,
      can_swim: f.can_swim,
      has_own_board: f.has_own_board,
      board_size: f.board_size,
      experience_notes: f.experience_notes,
      medical_conditions: f.medical_conditions,
      emergency_contact_name: f.emergency_contact_name,
      emergency_contact_phone: f.emergency_contact_phone,
      credits: f.credits,
    }).eq("id", student.id);
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success("Dados atualizados");
    onSaved();
  };

  const deleteStudent = async () => {
    if (!window.confirm("Tem certeza que deseja excluir este aluno permanentemente?")) return;
    setSaving(true);
    const { error } = await supabase.from("profiles").delete().eq("id", student.id);
    setSaving(false);
    if (error) {
      toast.error("Erro ao excluir: " + error.message);
    } else {
      toast.success("Aluno excluído com sucesso");
      onSaved();
    }
  };

  const initial = (f.full_name ?? f.email)[0]?.toUpperCase();

  return (
    <Overlay
      onClose={onClose}
      title={f.full_name ?? f.email}
      subtitle={`${f.email}${f.phone ? " · " + f.phone : ""}`}
      badge={<Badge status={f.approval_status} />}
    >
      {/* Hero */}
      <div className="flex items-center gap-4 glass rounded-2xl p-4">
        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary to-primary/40 text-primary-foreground flex items-center justify-center text-2xl font-bold shrink-0">
          {initial}
        </div>
        <div className="grid grid-cols-3 gap-3 flex-1">
          <Stat label="Créditos" value={`${f.credits}`} />
          <Stat label="Nível" value={f.surf_level ?? "—"} />
          <Stat label="Base" value={f.stance ?? "—"} />
        </div>
      </div>

      <Section icon={<User className="w-4 h-4" />} title="Dados pessoais">
        <Field label="Nome completo"><Input value={f.full_name ?? ""} onChange={(e) => set("full_name", e.target.value)} /></Field>
        <Field label="Telefone"><Input value={f.phone ?? ""} onChange={(e) => set("phone", e.target.value)} /></Field>
        <Field label="Idade"><Input type="number" value={f.age ?? ""} onChange={(e) => set("age", e.target.value ? +e.target.value : null)} /></Field>
        <Field label="Peso (kg)"><Input type="number" value={f.weight_kg ?? ""} onChange={(e) => set("weight_kg", e.target.value ? +e.target.value : null)} /></Field>
        <Field label="Altura (cm)"><Input type="number" value={f.height_cm ?? ""} onChange={(e) => set("height_cm", e.target.value ? +e.target.value : null)} /></Field>
        <Field label="Créditos"><Input type="number" value={f.credits} onChange={(e) => set("credits", e.target.value ? +e.target.value : 0)} /></Field>
      </Section>

      <Section icon={<Activity className="w-4 h-4" />} title="Surf & evolução">
        <Field label="Nível">
          <Select value={f.surf_level ?? "iniciante"} onValueChange={(v) => set("surf_level", v)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="iniciante">Iniciante</SelectItem>
              <SelectItem value="intermediario">Intermediário</SelectItem>
              <SelectItem value="avancado">Avançado</SelectItem>
            </SelectContent>
          </Select>
        </Field>
        <Field label="Base (stance)">
          <Select value={f.stance ?? "desconhecido"} onValueChange={(v) => set("stance", v)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="regular">Regular</SelectItem>
              <SelectItem value="goofy">Goofy</SelectItem>
              <SelectItem value="desconhecido">Desconhecido</SelectItem>
            </SelectContent>
          </Select>
        </Field>
        <Field label="Tamanho da prancha"><Input value={f.board_size ?? ""} onChange={(e) => set("board_size", e.target.value)} /></Field>
        <Toggle label="Sabe nadar" value={!!f.can_swim} onChange={(v) => set("can_swim", v)} />
        <Toggle label="Prancha própria" value={!!f.has_own_board} onChange={(v) => set("has_own_board", v)} />
        <Field label="Notas de evolução" full>
          <Textarea rows={4} value={f.experience_notes ?? ""} onChange={(e) => set("experience_notes", e.target.value)} placeholder="Manobras dominadas, pontos a melhorar, progressão..." />
        </Field>
      </Section>

      <Section icon={<Heart className="w-4 h-4" />} title="Saúde & emergência">
        <Field label="Condições médicas" full>
          <Textarea rows={3} value={f.medical_conditions ?? ""} onChange={(e) => set("medical_conditions", e.target.value)} />
        </Field>
        <Field label="Contato de emergência"><Input value={f.emergency_contact_name ?? ""} onChange={(e) => set("emergency_contact_name", e.target.value)} /></Field>
        <Field label="Telefone de emergência"><Input value={f.emergency_contact_phone ?? ""} onChange={(e) => set("emergency_contact_phone", e.target.value)} /></Field>
      </Section>

      {/* Sticky actions */}
      <div className="sticky bottom-0 -mx-5 md:-mx-6 px-5 md:px-6 py-4 bg-background/80 backdrop-blur-xl border-t border-border/40 flex flex-col-reverse sm:flex-row gap-2">
        <Button variant="ghost" onClick={deleteStudent} disabled={saving} className="rounded-xl text-destructive hover:bg-destructive/10">
          <Trash2 className="w-4 h-4 mr-2" /> Excluir
        </Button>
        {f.approval_status !== "approved" && (
          <>
            <Button variant="ghost" onClick={() => decide("rejected")} className="rounded-xl text-destructive hover:bg-destructive/10">
              <XCircle className="w-4 h-4 mr-2" /> Rejeitar
            </Button>
            <Button onClick={() => decide("approved")} className="rounded-xl bg-success text-success-foreground hover:opacity-90">
              <CheckCircle2 className="w-4 h-4 mr-2" /> Aprovar
            </Button>
          </>
        )}
        <div className="flex-1" />
        <Button onClick={save} disabled={saving} className="rounded-xl">
          {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
          Salvar alterações
        </Button>
      </div>
    </Overlay>
  );
}

/* ---------------- Create student ---------------- */
function CreateStudentSheet({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const [loading, setLoading] = useState(false);
  const [f, setF] = useState({
    email: "", password: "", full_name: "", phone: "",
    age: "", weight_kg: "", height_cm: "",
    surf_level: "iniciante", stance: "desconhecido",
    can_swim: false, has_own_board: false, board_size: "",
    experience_notes: "",
  });
  const set = (k: string, v: any) => setF((p) => ({ ...p, [k]: v }));

  const submit = async () => {
    if (!f.email || !f.password || !f.full_name) return toast.error("Email, senha e nome são obrigatórios");
    if (f.password.length < 8) return toast.error("A senha deve ter ao menos 8 caracteres");
    setLoading(true);
    const { data, error } = await supabase.functions.invoke("admin-create-student", {
      body: {
        email: f.email,
        password: f.password,
        full_name: f.full_name,
        phone: f.phone,
        profile: {
          age: f.age ? +f.age : null,
          weight_kg: f.weight_kg ? +f.weight_kg : null,
          height_cm: f.height_cm ? +f.height_cm : null,
          surf_level: f.surf_level,
          stance: f.stance,
          can_swim: f.can_swim,
          has_own_board: f.has_own_board,
          board_size: f.board_size || null,
          experience_notes: f.experience_notes || null,
        },
      },
    });
    setLoading(false);
    if (error || (data as any)?.error) return toast.error((data as any)?.error ?? error?.message ?? "Erro");
    toast.success("Aluno criado e aprovado");
    onCreated();
  };

  return (
    <Overlay onClose={onClose} title="Novo aluno" subtitle="Crie a conta e pré-preencha o cadastro">
      <Section icon={<Mail className="w-4 h-4" />} title="Acesso">
        <Field label="Email"><Input type="email" value={f.email} onChange={(e) => set("email", e.target.value)} /></Field>
        <Field label="Senha (mín. 8)"><Input type="text" value={f.password} onChange={(e) => set("password", e.target.value)} /></Field>
      </Section>

      <Section icon={<User className="w-4 h-4" />} title="Dados pessoais">
        <Field label="Nome completo"><Input value={f.full_name} onChange={(e) => set("full_name", e.target.value)} /></Field>
        <Field label="Telefone"><Input value={f.phone} onChange={(e) => set("phone", e.target.value)} /></Field>
        <Field label="Idade"><Input type="number" value={f.age} onChange={(e) => set("age", e.target.value)} /></Field>
        <Field label="Peso (kg)"><Input type="number" value={f.weight_kg} onChange={(e) => set("weight_kg", e.target.value)} /></Field>
        <Field label="Altura (cm)"><Input type="number" value={f.height_cm} onChange={(e) => set("height_cm", e.target.value)} /></Field>
      </Section>

      <Section icon={<Activity className="w-4 h-4" />} title="Surf">
        <Field label="Nível">
          <Select value={f.surf_level} onValueChange={(v) => set("surf_level", v)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="iniciante">Iniciante</SelectItem>
              <SelectItem value="intermediario">Intermediário</SelectItem>
              <SelectItem value="avancado">Avançado</SelectItem>
            </SelectContent>
          </Select>
        </Field>
        <Field label="Base">
          <Select value={f.stance} onValueChange={(v) => set("stance", v)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="regular">Regular</SelectItem>
              <SelectItem value="goofy">Goofy</SelectItem>
              <SelectItem value="desconhecido">Desconhecido</SelectItem>
            </SelectContent>
          </Select>
        </Field>
        <Field label="Tamanho prancha"><Input value={f.board_size} onChange={(e) => set("board_size", e.target.value)} /></Field>
        <Toggle label="Sabe nadar" value={f.can_swim} onChange={(v) => set("can_swim", v)} />
        <Toggle label="Prancha própria" value={f.has_own_board} onChange={(v) => set("has_own_board", v)} />
        <Field label="Notas iniciais" full>
          <Textarea rows={3} value={f.experience_notes} onChange={(e) => set("experience_notes", e.target.value)} />
        </Field>
      </Section>

      <div className="sticky bottom-0 -mx-5 md:-mx-6 px-5 md:px-6 py-4 bg-background/80 backdrop-blur-xl border-t border-border/40 flex justify-end gap-2">
        <Button variant="ghost" onClick={onClose} className="rounded-xl">Cancelar</Button>
        <Button onClick={submit} disabled={loading} className="rounded-xl">
          {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Plus className="w-4 h-4 mr-2" />}
          Criar aluno
        </Button>
      </div>
    </Overlay>
  );
}

/* ---------------- Bits ---------------- */
const Section = ({ icon, title, children }: any) => (
  <div className="space-y-3">
    <div className="flex items-center gap-2 text-xs uppercase tracking-widest text-muted-foreground">
      <span className="w-7 h-7 rounded-lg bg-primary/10 text-primary flex items-center justify-center">{icon}</span>
      {title}
    </div>
    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">{children}</div>
  </div>
);

const Field = ({ label, children, full }: any) => (
  <div className={`space-y-1.5 ${full ? "md:col-span-2" : ""}`}>
    <Label className="text-xs text-muted-foreground">{label}</Label>
    {children}
  </div>
);

const Toggle = ({ label, value, onChange }: any) => (
  <div className="flex items-center justify-between glass rounded-xl px-3 py-2.5">
    <span className="text-sm">{label}</span>
    <Switch checked={value} onCheckedChange={onChange} />
  </div>
);

const Stat = ({ label, value }: any) => (
  <div className="text-center">
    <div className="text-[10px] uppercase tracking-widest text-muted-foreground">{label}</div>
    <div className="text-base font-semibold mt-0.5 truncate">{value}</div>
  </div>
);

export const Modal = ({ children, onClose }: { children: React.ReactNode; onClose: () => void }) => (
  <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm" onClick={onClose}>
    <div className="glass-strong rounded-3xl p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
      {children}
    </div>
  </div>
);
