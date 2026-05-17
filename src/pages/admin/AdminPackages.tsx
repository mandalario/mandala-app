import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { Plus, Trash2, Edit3, Loader2 } from "lucide-react";
import { Modal } from "./AdminStudents";

type Pkg = { id: string; name: string; description: string | null; credits: number; price_cents: number; is_active: boolean; sort_order: number };

const fmt = (c: number) => `R$ ${(c / 100).toFixed(2).replace(".", ",")}`;

export default function AdminPackages() {
  const [list, setList] = useState<Pkg[]>([]);
  const [edit, setEdit] = useState<Pkg | null>(null);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    const { data } = await supabase.from("credit_packages").select("*").order("sort_order");
    setList((data ?? []) as Pkg[]); setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const remove = async (id: string) => {
    if (!confirm("Remover pacote?")) return;
    await supabase.from("credit_packages").delete().eq("id", id); load();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-widest text-primary/80">Catálogo</p>
          <h1 className="text-3xl font-bold">Pacotes de créditos</h1>
        </div>
        <Button onClick={() => setEdit({ id: "", name: "", description: "", credits: 1, price_cents: 10000, is_active: true, sort_order: list.length + 1 })} className="rounded-xl bg-gradient-to-r from-primary to-accent"><Plus className="w-4 h-4 mr-1" /> Novo</Button>
      </div>

      {loading ? <div className="glass rounded-2xl p-12 text-center"><Loader2 className="w-5 h-5 animate-spin mx-auto" /></div> :
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {list.map((p) => (
            <div key={p.id} className="glass-strong rounded-2xl p-5">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="text-xs uppercase tracking-widest text-primary/80">{p.credits} créd.</div>
                  <div className="font-bold text-lg">{p.name}</div>
                </div>
                <span className={`text-[10px] uppercase tracking-widest px-2 py-0.5 rounded-full ${p.is_active ? "bg-success/15 text-success" : "bg-muted/40 text-muted-foreground"}`}>{p.is_active ? "Ativo" : "Inativo"}</span>
              </div>
              {p.description && <p className="text-sm text-muted-foreground mt-1">{p.description}</p>}
              <div className="text-2xl font-bold text-gradient mt-3">{fmt(p.price_cents)}</div>
              <div className="flex gap-2 mt-3">
                <Button size="sm" variant="ghost" onClick={() => setEdit(p)} className="flex-1 rounded-xl"><Edit3 className="w-3 h-3 mr-1" /> Editar</Button>
                <Button size="sm" variant="ghost" onClick={() => remove(p.id)} className="rounded-xl text-destructive hover:bg-destructive/10"><Trash2 className="w-3 h-3" /></Button>
              </div>
            </div>
          ))}
        </div>
      }

      {edit && <PkgForm pkg={edit} onClose={() => { setEdit(null); load(); }} />}
    </div>
  );
}

function PkgForm({ pkg, onClose }: { pkg: Pkg; onClose: () => void }) {
  const [f, setF] = useState(pkg);
  const [saving, setSaving] = useState(false);
  const save = async () => {
    setSaving(true);
    const payload = { name: f.name, description: f.description || null, credits: f.credits, price_cents: f.price_cents, is_active: f.is_active, sort_order: f.sort_order };
    const { error } = pkg.id
      ? await supabase.from("credit_packages").update(payload).eq("id", pkg.id)
      : await supabase.from("credit_packages").insert(payload);
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success("Salvo"); onClose();
  };
  return (
    <Modal onClose={onClose}>
      <h2 className="text-xl font-bold mb-4">{pkg.id ? "Editar pacote" : "Novo pacote"}</h2>
      <div className="space-y-3">
        <div><Label>Nome</Label><Input value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} className="bg-input/60 border-0 h-11 rounded-xl mt-1" /></div>
        <div><Label>Descrição</Label><Textarea value={f.description ?? ""} onChange={(e) => setF({ ...f, description: e.target.value })} className="bg-input/60 border-0 rounded-xl mt-1" /></div>
        <div className="grid grid-cols-2 gap-2">
          <div><Label>Créditos</Label><Input type="number" min={1} value={f.credits} onChange={(e) => setF({ ...f, credits: +e.target.value })} className="bg-input/60 border-0 h-11 rounded-xl mt-1" /></div>
          <div><Label>Preço (R$)</Label><Input type="number" step="0.01" value={(f.price_cents / 100).toString()} onChange={(e) => setF({ ...f, price_cents: Math.round(+e.target.value * 100) })} className="bg-input/60 border-0 h-11 rounded-xl mt-1" /></div>
        </div>
        <div className="flex items-center justify-between p-3 rounded-xl bg-secondary/40">
          <span className="text-sm">Ativo</span>
          <Switch checked={f.is_active} onCheckedChange={(v) => setF({ ...f, is_active: v })} />
        </div>
        <Button onClick={save} disabled={saving || !f.name} className="w-full h-11 rounded-xl bg-gradient-to-r from-primary to-accent">{saving ? <Loader2 className="w-4 h-4 animate-spin" /> : "Salvar"}</Button>
      </div>
    </Modal>
  );
}
