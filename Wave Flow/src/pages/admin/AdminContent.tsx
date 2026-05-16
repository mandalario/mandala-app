import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { Plus, Trash2, Loader2, Image as ImageIcon, Handshake, Quote, Upload, Edit3, ExternalLink, Calendar as CalIcon } from "lucide-react";

type Partner = { id: string; name: string; description: string | null; logo_url: string | null; website_url: string | null; is_active: boolean; sort_order: number };
type Banner = { id: string; partner_id: string | null; title: string | null; subtitle: string | null; body: string | null; background_image_url: string | null; cta_label: string | null; cta_url: string | null; is_active: boolean; sort_order: number; starts_at: string | null; ends_at: string | null };
type DailyQuote = { id: string; text: string; author: string | null; scheduled_date: string | null; is_active: boolean };

const sb = supabase as any;

export default function AdminContent() {
  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs uppercase tracking-widest text-primary/80">Marketing</p>
        <h1 className="text-3xl font-bold">Conteúdo & Parceiros</h1>
        <p className="text-sm text-muted-foreground mt-1">Banners, parceiros e frases do dia.</p>
      </div>

      <Tabs defaultValue="banners" className="w-full">
        <TabsList className="bg-secondary/40 rounded-xl p-1">
          <TabsTrigger value="banners" className="rounded-lg"><ImageIcon className="w-4 h-4 mr-1.5" /> Banners</TabsTrigger>
          <TabsTrigger value="partners" className="rounded-lg"><Handshake className="w-4 h-4 mr-1.5" /> Parceiros</TabsTrigger>
          <TabsTrigger value="quotes" className="rounded-lg"><Quote className="w-4 h-4 mr-1.5" /> Frases do dia</TabsTrigger>
        </TabsList>

        <TabsContent value="banners" className="mt-5"><BannersTab /></TabsContent>
        <TabsContent value="partners" className="mt-5"><PartnersTab /></TabsContent>
        <TabsContent value="quotes" className="mt-5"><QuotesTab /></TabsContent>
      </Tabs>
    </div>
  );
}

/* ---------- Partners ---------- */
function PartnersTab() {
  const [items, setItems] = useState<Partner[]>([]);
  const [editing, setEditing] = useState<Partner | null>(null);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    const { data } = await sb.from("partners").select("*").order("sort_order").order("created_at");
    setItems((data ?? []) as Partner[]);
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const remove = async (id: string) => {
    if (!confirm("Remover parceiro?")) return;
    const { error } = await sb.from("partners").delete().eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Removido"); load();
  };
  const toggle = async (p: Partner) => { await sb.from("partners").update({ is_active: !p.is_active }).eq("id", p.id); load(); };

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button onClick={() => setEditing({ id: "", name: "", description: null, logo_url: null, website_url: null, is_active: true, sort_order: 0 })} className="rounded-xl bg-gradient-to-r from-primary to-accent">
          <Plus className="w-4 h-4 mr-1" /> Novo parceiro
        </Button>
      </div>
      {loading ? <div className="glass rounded-2xl p-12 text-center"><Loader2 className="w-5 h-5 animate-spin mx-auto" /></div>
        : items.length === 0 ? <div className="glass rounded-2xl p-10 text-center text-sm text-muted-foreground">Nenhum parceiro ainda.</div>
          : <div className="grid sm:grid-cols-2 gap-3">
            {items.map((p) => (
              <div key={p.id} className="glass-strong rounded-2xl p-4 flex gap-3">
                <div className="w-14 h-14 rounded-xl bg-secondary/40 overflow-hidden flex items-center justify-center shrink-0">
                  {p.logo_url ? <img src={p.logo_url} alt="" className="w-full h-full object-cover" /> : <Handshake className="w-5 h-5 opacity-40" />}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2"><div className="font-semibold truncate">{p.name}</div>
                    <span className={`text-[10px] uppercase px-2 py-0.5 rounded-full ${p.is_active ? "bg-success/15 text-success" : "bg-muted/40 text-muted-foreground"}`}>{p.is_active ? "Ativo" : "Off"}</span>
                  </div>
                  {p.description && <div className="text-xs text-muted-foreground line-clamp-2 mt-0.5">{p.description}</div>}
                  {p.website_url && <a href={p.website_url} target="_blank" rel="noreferrer" className="text-xs text-primary inline-flex items-center gap-1 mt-1"><ExternalLink className="w-3 h-3" /> site</a>}
                </div>
                <div className="flex flex-col items-end gap-2">
                  <Switch checked={p.is_active} onCheckedChange={() => toggle(p)} />
                  <button onClick={() => setEditing(p)} className="text-muted-foreground hover:text-primary"><Edit3 className="w-4 h-4" /></button>
                  <button onClick={() => remove(p.id)} className="text-muted-foreground hover:text-destructive"><Trash2 className="w-4 h-4" /></button>
                </div>
              </div>
            ))}
          </div>}
      {editing && <PartnerEditor partner={editing} onClose={() => { setEditing(null); load(); }} />}
    </div>
  );
}

function PartnerEditor({ partner, onClose }: { partner: Partner; onClose: () => void }) {
  const [form, setForm] = useState(partner);
  const [saving, setSaving] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const save = async () => {
    setSaving(true);
    const payload = { name: form.name, description: form.description, logo_url: form.logo_url, website_url: form.website_url, is_active: form.is_active, sort_order: form.sort_order };
    const { error } = form.id
      ? await sb.from("partners").update(payload).eq("id", form.id)
      : await sb.from("partners").insert(payload);
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success("Salvo"); onClose();
  };

  const upload = async (file: File) => {
    const ext = file.name.split(".").pop();
    const path = `${crypto.randomUUID()}.${ext}`;
    const { error } = await supabase.storage.from("partners").upload(path, file);
    if (error) return toast.error(error.message);
    const { data } = supabase.storage.from("partners").getPublicUrl(path);
    setForm({ ...form, logo_url: data.publicUrl });
  };

  return (
    <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="glass-strong rounded-t-3xl sm:rounded-3xl w-full sm:max-w-lg max-h-[92vh] overflow-y-auto p-5">
        <h2 className="text-lg font-bold mb-4">{form.id ? "Editar parceiro" : "Novo parceiro"}</h2>
        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <div className="w-16 h-16 rounded-xl bg-secondary/40 overflow-hidden flex items-center justify-center">
              {form.logo_url ? <img src={form.logo_url} className="w-full h-full object-cover" alt="" /> : <Handshake className="w-6 h-6 opacity-40" />}
            </div>
            <Button variant="outline" onClick={() => fileRef.current?.click()} className="rounded-xl"><Upload className="w-4 h-4 mr-1" /> Logo</Button>
            <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={(e) => e.target.files?.[0] && upload(e.target.files[0])} />
          </div>
          <Field label="Nome"><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></Field>
          <Field label="Descrição"><Textarea rows={2} value={form.description ?? ""} onChange={(e) => setForm({ ...form, description: e.target.value })} /></Field>
          <Field label="Site (URL)"><Input value={form.website_url ?? ""} onChange={(e) => setForm({ ...form, website_url: e.target.value })} placeholder="https://" /></Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Ordem"><Input type="number" value={form.sort_order} onChange={(e) => setForm({ ...form, sort_order: Number(e.target.value) })} /></Field>
            <div className="flex items-center justify-between border rounded-xl px-3 h-10 mt-6"><Label className="text-sm">Ativo</Label><Switch checked={form.is_active} onCheckedChange={(v) => setForm({ ...form, is_active: v })} /></div>
          </div>
        </div>
        <div className="flex gap-2 mt-5">
          <Button variant="outline" onClick={onClose} className="flex-1 rounded-xl">Cancelar</Button>
          <Button onClick={save} disabled={saving || !form.name} className="flex-1 rounded-xl bg-gradient-to-r from-primary to-accent">{saving ? <Loader2 className="w-4 h-4 animate-spin" /> : "Salvar"}</Button>
        </div>
      </div>
    </div>
  );
}

/* ---------- Banners ---------- */
function BannersTab() {
  const [items, setItems] = useState<Banner[]>([]);
  const [partners, setPartners] = useState<Partner[]>([]);
  const [editing, setEditing] = useState<Banner | null>(null);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    const [{ data: b }, { data: p }] = await Promise.all([
      sb.from("home_banners").select("*").order("sort_order"),
      sb.from("partners").select("*").order("name"),
    ]);
    setItems((b ?? []) as Banner[]); setPartners((p ?? []) as Partner[]); setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const remove = async (id: string) => {
    if (!confirm("Remover banner?")) return;
    await sb.from("home_banners").delete().eq("id", id); load();
  };
  const toggle = async (b: Banner) => { await sb.from("home_banners").update({ is_active: !b.is_active }).eq("id", b.id); load(); };

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button onClick={() => setEditing({ id: "", partner_id: null, title: "", subtitle: "", body: "", background_image_url: null, cta_label: "", cta_url: "", is_active: true, sort_order: 0, starts_at: null, ends_at: null })} className="rounded-xl bg-gradient-to-r from-primary to-accent">
          <Plus className="w-4 h-4 mr-1" /> Novo banner
        </Button>
      </div>
      {loading ? <div className="glass rounded-2xl p-12 text-center"><Loader2 className="w-5 h-5 animate-spin mx-auto" /></div>
        : items.length === 0 ? <div className="glass rounded-2xl p-10 text-center text-sm text-muted-foreground">Nenhum banner ainda.</div>
          : <div className="grid md:grid-cols-2 gap-3">
            {items.map((b) => (
              <div key={b.id} className="glass-strong rounded-2xl overflow-hidden">
                <div className="relative h-32 bg-secondary/40">
                  {b.background_image_url && <img src={b.background_image_url} alt="" className="w-full h-full object-cover" />}
                  <div className="absolute inset-0 bg-gradient-to-t from-background/80 to-transparent" />
                  <div className="absolute bottom-2 left-3 right-3">
                    {b.subtitle && <p className="text-[10px] uppercase tracking-widest text-primary/90">{b.subtitle}</p>}
                    {b.title && <p className="font-bold text-sm truncate">{b.title}</p>}
                  </div>
                  <span className={`absolute top-2 right-2 text-[10px] uppercase px-2 py-0.5 rounded-full ${b.is_active ? "bg-success/80 text-success-foreground" : "bg-muted/80"}`}>{b.is_active ? "Ativo" : "Off"}</span>
                </div>
                <div className="p-3 flex items-center justify-between gap-2">
                  <div className="text-xs text-muted-foreground truncate flex-1">{b.cta_label || "—"}</div>
                  <Switch checked={b.is_active} onCheckedChange={() => toggle(b)} />
                  <button onClick={() => setEditing(b)} className="text-muted-foreground hover:text-primary"><Edit3 className="w-4 h-4" /></button>
                  <button onClick={() => remove(b.id)} className="text-muted-foreground hover:text-destructive"><Trash2 className="w-4 h-4" /></button>
                </div>
              </div>
            ))}
          </div>}
      {editing && <BannerEditor banner={editing} partners={partners} onClose={() => { setEditing(null); load(); }} />}
    </div>
  );
}

function BannerEditor({ banner, partners, onClose }: { banner: Banner; partners: Partner[]; onClose: () => void }) {
  const [form, setForm] = useState(banner);
  const [saving, setSaving] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const save = async () => {
    setSaving(true);
    const payload = {
      partner_id: form.partner_id, title: form.title || null, subtitle: form.subtitle || null,
      body: form.body || null, background_image_url: form.background_image_url,
      cta_label: form.cta_label || null, cta_url: form.cta_url || null,
      is_active: form.is_active, sort_order: form.sort_order,
      starts_at: form.starts_at, ends_at: form.ends_at,
    };
    const { error } = form.id
      ? await sb.from("home_banners").update(payload).eq("id", form.id)
      : await sb.from("home_banners").insert(payload);
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success("Salvo"); onClose();
  };

  const upload = async (file: File) => {
    const ext = file.name.split(".").pop();
    const path = `${crypto.randomUUID()}.${ext}`;
    const { error } = await supabase.storage.from("banners").upload(path, file);
    if (error) return toast.error(error.message);
    const { data } = supabase.storage.from("banners").getPublicUrl(path);
    setForm({ ...form, background_image_url: data.publicUrl });
  };

  return (
    <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="glass-strong rounded-t-3xl sm:rounded-3xl w-full sm:max-w-xl max-h-[92vh] overflow-y-auto p-5">
        <h2 className="text-lg font-bold mb-4">{form.id ? "Editar banner" : "Novo banner"}</h2>
        <div className="space-y-3">
          <div>
            <Label className="text-xs">Imagem de fundo</Label>
            <div className="mt-1.5 relative h-36 rounded-xl bg-secondary/40 overflow-hidden flex items-center justify-center">
              {form.background_image_url ? <img src={form.background_image_url} alt="" className="w-full h-full object-cover" /> : <ImageIcon className="w-6 h-6 opacity-40" />}
              <button onClick={() => fileRef.current?.click()} className="absolute bottom-2 right-2 px-3 py-1.5 rounded-lg bg-background/80 text-xs flex items-center gap-1"><Upload className="w-3 h-3" /> Upload</button>
              <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={(e) => e.target.files?.[0] && upload(e.target.files[0])} />
            </div>
          </div>
          <Field label="Parceiro (opcional)">
            <select className="w-full h-10 rounded-md border bg-background px-3 text-sm" value={form.partner_id ?? ""} onChange={(e) => setForm({ ...form, partner_id: e.target.value || null })}>
              <option value="">— sem parceiro —</option>
              {partners.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </Field>
          <Field label="Título"><Input value={form.title ?? ""} onChange={(e) => setForm({ ...form, title: e.target.value })} /></Field>
          <Field label="Subtítulo"><Input value={form.subtitle ?? ""} onChange={(e) => setForm({ ...form, subtitle: e.target.value })} /></Field>
          <Field label="Texto"><Textarea rows={2} value={form.body ?? ""} onChange={(e) => setForm({ ...form, body: e.target.value })} /></Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Texto do botão"><Input value={form.cta_label ?? ""} onChange={(e) => setForm({ ...form, cta_label: e.target.value })} placeholder="Saiba mais" /></Field>
            <Field label="Link do botão"><Input value={form.cta_url ?? ""} onChange={(e) => setForm({ ...form, cta_url: e.target.value })} placeholder="https://" /></Field>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Início (opcional)"><Input type="date" value={form.starts_at ? form.starts_at.slice(0, 10) : ""} onChange={(e) => setForm({ ...form, starts_at: e.target.value ? `${e.target.value}T00:00:00Z` : null })} /></Field>
            <Field label="Fim (opcional)"><Input type="date" value={form.ends_at ? form.ends_at.slice(0, 10) : ""} onChange={(e) => setForm({ ...form, ends_at: e.target.value ? `${e.target.value}T23:59:59Z` : null })} /></Field>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Ordem"><Input type="number" value={form.sort_order} onChange={(e) => setForm({ ...form, sort_order: Number(e.target.value) })} /></Field>
            <div className="flex items-center justify-between border rounded-xl px-3 h-10 mt-6"><Label className="text-sm">Ativo</Label><Switch checked={form.is_active} onCheckedChange={(v) => setForm({ ...form, is_active: v })} /></div>
          </div>
        </div>
        <div className="flex gap-2 mt-5">
          <Button variant="outline" onClick={onClose} className="flex-1 rounded-xl">Cancelar</Button>
          <Button onClick={save} disabled={saving} className="flex-1 rounded-xl bg-gradient-to-r from-primary to-accent">{saving ? <Loader2 className="w-4 h-4 animate-spin" /> : "Salvar"}</Button>
        </div>
      </div>
    </div>
  );
}

/* ---------- Quotes ---------- */
function QuotesTab() {
  const [items, setItems] = useState<DailyQuote[]>([]);
  const [editing, setEditing] = useState<DailyQuote | null>(null);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    const { data } = await sb.from("daily_quotes").select("*").order("scheduled_date", { ascending: true, nullsFirst: false }).order("created_at");
    setItems((data ?? []) as DailyQuote[]); setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const remove = async (id: string) => { if (!confirm("Remover frase?")) return; await sb.from("daily_quotes").delete().eq("id", id); load(); };
  const toggle = async (q: DailyQuote) => { await sb.from("daily_quotes").update({ is_active: !q.is_active }).eq("id", q.id); load(); };

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button onClick={() => setEditing({ id: "", text: "", author: "", scheduled_date: null, is_active: true })} className="rounded-xl bg-gradient-to-r from-primary to-accent">
          <Plus className="w-4 h-4 mr-1" /> Nova frase
        </Button>
      </div>
      {loading ? <div className="glass rounded-2xl p-12 text-center"><Loader2 className="w-5 h-5 animate-spin mx-auto" /></div>
        : items.length === 0 ? <div className="glass rounded-2xl p-10 text-center text-sm text-muted-foreground">Nenhuma frase cadastrada.</div>
          : <div className="space-y-2">
            {items.map((q) => (
              <div key={q.id} className="glass-strong rounded-2xl p-4 flex items-start gap-3">
                <Quote className="w-4 h-4 text-primary shrink-0 mt-1" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm italic">"{q.text}"</p>
                  <div className="text-xs text-muted-foreground mt-1 flex items-center gap-2 flex-wrap">
                    {q.author && <span>— {q.author}</span>}
                    {q.scheduled_date && <span className="inline-flex items-center gap-1"><CalIcon className="w-3 h-3" /> {new Date(q.scheduled_date + "T12:00").toLocaleDateString("pt-BR")}</span>}
                    {!q.scheduled_date && <span className="opacity-60">rotativa</span>}
                  </div>
                </div>
                <Switch checked={q.is_active} onCheckedChange={() => toggle(q)} />
                <button onClick={() => setEditing(q)} className="text-muted-foreground hover:text-primary"><Edit3 className="w-4 h-4" /></button>
                <button onClick={() => remove(q.id)} className="text-muted-foreground hover:text-destructive"><Trash2 className="w-4 h-4" /></button>
              </div>
            ))}
          </div>}
      {editing && <QuoteEditor quote={editing} onClose={() => { setEditing(null); load(); }} />}
    </div>
  );
}

function QuoteEditor({ quote, onClose }: { quote: DailyQuote; onClose: () => void }) {
  const [form, setForm] = useState(quote);
  const [saving, setSaving] = useState(false);
  const save = async () => {
    setSaving(true);
    const payload = { text: form.text, author: form.author || null, scheduled_date: form.scheduled_date, is_active: form.is_active };
    const { error } = form.id
      ? await sb.from("daily_quotes").update(payload).eq("id", form.id)
      : await sb.from("daily_quotes").insert(payload);
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success("Salvo"); onClose();
  };
  return (
    <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="glass-strong rounded-t-3xl sm:rounded-3xl w-full sm:max-w-md max-h-[92vh] overflow-y-auto p-5">
        <h2 className="text-lg font-bold mb-4">{form.id ? "Editar frase" : "Nova frase"}</h2>
        <div className="space-y-3">
          <Field label="Frase"><Textarea rows={3} value={form.text} onChange={(e) => setForm({ ...form, text: e.target.value })} /></Field>
          <Field label="Autor (opcional)"><Input value={form.author ?? ""} onChange={(e) => setForm({ ...form, author: e.target.value })} /></Field>
          <Field label="Programar para data (opcional — sem data: rotativa)">
            <Input type="date" value={form.scheduled_date ?? ""} onChange={(e) => setForm({ ...form, scheduled_date: e.target.value || null })} />
          </Field>
          <div className="flex items-center justify-between border rounded-xl px-3 h-10"><Label className="text-sm">Ativa</Label><Switch checked={form.is_active} onCheckedChange={(v) => setForm({ ...form, is_active: v })} /></div>
        </div>
        <div className="flex gap-2 mt-5">
          <Button variant="outline" onClick={onClose} className="flex-1 rounded-xl">Cancelar</Button>
          <Button onClick={save} disabled={saving || !form.text.trim()} className="flex-1 rounded-xl bg-gradient-to-r from-primary to-accent">{saving ? <Loader2 className="w-4 h-4 animate-spin" /> : "Salvar"}</Button>
        </div>
      </div>
    </div>
  );
}

const Field = ({ label, children }: { label: string; children: React.ReactNode }) => (
  <div className="space-y-1.5"><Label className="text-xs">{label}</Label>{children}</div>
);
