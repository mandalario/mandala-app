import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { Plus, Loader2, ScrollText, Power } from "lucide-react";
import { Modal } from "./AdminStudents";

type Term = { id: string; version: string; title: string; content: string; is_active: boolean; created_at: string };

export default function AdminTerms() {
  const [list, setList] = useState<Term[]>([]);
  const [edit, setEdit] = useState<Term | null>(null);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    const { data } = await supabase.from("terms_of_service").select("*").order("created_at", { ascending: false });
    setList((data ?? []) as Term[]); setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const setActive = async (id: string) => {
    // desativa todos, ativa o escolhido
    await supabase.from("terms_of_service").update({ is_active: false }).neq("id", id);
    await supabase.from("terms_of_service").update({ is_active: true }).eq("id", id);
    toast.success("Versão ativada");
    load();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-widest text-primary/80">Legal</p>
          <h1 className="text-3xl font-bold">Termos de Uso</h1>
          <p className="text-sm text-muted-foreground mt-1">Apenas a versão ativa é exibida no cadastro.</p>
        </div>
        <Button onClick={() => setEdit({ id: "", version: "", title: "Termos de Uso", content: "", is_active: true, created_at: "" })} className="rounded-xl bg-gradient-to-r from-primary to-accent"><Plus className="w-4 h-4 mr-1" /> Nova versão</Button>
      </div>

      {loading ? <div className="glass rounded-2xl p-12 text-center"><Loader2 className="w-5 h-5 animate-spin mx-auto" /></div> :
        <div className="space-y-2">
          {list.map((t) => (
            <div key={t.id} className="glass-strong rounded-2xl p-4 flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-primary/15 text-primary flex items-center justify-center"><ScrollText className="w-4 h-4" /></div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-semibold">{t.title}</span>
                  <span className="text-xs text-muted-foreground">v{t.version}</span>
                  {t.is_active && <span className="text-[10px] uppercase tracking-widest px-2 py-0.5 rounded-full bg-success/15 text-success">Ativo</span>}
                </div>
                <div className="text-xs text-muted-foreground line-clamp-1 mt-0.5">{t.content.slice(0, 120)}...</div>
              </div>
              {!t.is_active && <Button size="sm" variant="ghost" onClick={() => setActive(t.id)} className="rounded-xl"><Power className="w-3 h-3 mr-1" /> Ativar</Button>}
              <Button size="sm" variant="ghost" onClick={() => setEdit(t)} className="rounded-xl">Editar</Button>
            </div>
          ))}
        </div>
      }

      {edit && <TermForm term={edit} onClose={() => { setEdit(null); load(); }} />}
    </div>
  );
}

function TermForm({ term, onClose }: { term: Term; onClose: () => void }) {
  const [f, setF] = useState(term);
  const [saving, setSaving] = useState(false);
  const save = async () => {
    setSaving(true);
    const payload = { version: f.version, title: f.title, content: f.content, is_active: f.is_active };
    const { error } = term.id
      ? await supabase.from("terms_of_service").update(payload).eq("id", term.id)
      : await supabase.from("terms_of_service").insert(payload);
    setSaving(false);
    if (error) return toast.error(error.message);
    // se ativou, desativa as outras
    if (f.is_active) await supabase.from("terms_of_service").update({ is_active: false }).neq("version", f.version);
    toast.success("Salvo"); onClose();
  };
  return (
    <Modal onClose={onClose}>
      <h2 className="text-xl font-bold mb-4">{term.id ? "Editar termos" : "Nova versão"}</h2>
      <div className="space-y-3">
        <div className="grid grid-cols-3 gap-2">
          <div><Label>Versão</Label><Input value={f.version} onChange={(e) => setF({ ...f, version: e.target.value })} placeholder="1.1" className="bg-input/60 border-0 h-11 rounded-xl mt-1" /></div>
          <div className="col-span-2"><Label>Título</Label><Input value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} className="bg-input/60 border-0 h-11 rounded-xl mt-1" /></div>
        </div>
        <div><Label>Conteúdo</Label><Textarea value={f.content} onChange={(e) => setF({ ...f, content: e.target.value })} className="bg-input/60 border-0 rounded-xl mt-1 min-h-64 font-mono text-xs" /></div>
        <div className="flex items-center justify-between p-3 rounded-xl bg-secondary/40">
          <div>
            <div className="text-sm">Tornar ativa</div>
            <div className="text-xs text-muted-foreground">Desativa as demais</div>
          </div>
          <Switch checked={f.is_active} onCheckedChange={(v) => setF({ ...f, is_active: v })} />
        </div>
        <Button onClick={save} disabled={saving || !f.version || !f.content} className="w-full h-11 rounded-xl bg-gradient-to-r from-primary to-accent">{saving ? <Loader2 className="w-4 h-4 animate-spin" /> : "Salvar"}</Button>
      </div>
    </Modal>
  );
}
