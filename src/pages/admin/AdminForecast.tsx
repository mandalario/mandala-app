import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Wind, Loader2, Plus, Trash2, ExternalLink, Globe, Waves, Star } from "lucide-react";

type Provider = { id: string; kind: string; label: string; config: any; is_active: boolean };
const sb = supabase as any;

const KINDS = [
  { value: "windguru_widget", label: "WindGuru (widget grátis)", help: "Embute o widget oficial. Você só informa o ID do spot WindGuru." },
  { value: "windguru_api", label: "WindGuru API (paga)", help: "Requer token salvo in segredo (WINDGURU_API_KEY)." },
  { value: "open_meteo_marine", label: "Open-Meteo Marine (grátis, sem chave)", help: "Use latitude/longitude do spot." },
];

export default function AdminForecast() {
  const [items, setItems] = useState<Provider[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Provider | null>(null);

  const load = async () => {
    setLoading(true);
    const { data } = await sb.from("forecast_providers").select("*").order("created_at");
    setItems((data ?? []) as Provider[]); setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const activate = async (p: Provider) => {
    await sb.from("forecast_providers").update({ is_active: false }).neq("id", p.id);
    await sb.from("forecast_providers").update({ is_active: true }).eq("id", p.id);
    toast.success("Provedor ativado"); load();
  };
  const deactivate = async (p: Provider) => {
    await sb.from("forecast_providers").update({ is_active: false }).eq("id", p.id); load();
  };
  const remove = async (id: string) => { if (!confirm("Remover provedor?")) return; await sb.from("forecast_providers").delete().eq("id", id); load(); };

  return (
    <div className="space-y-6">
      {/* Editor de Condições Atuais */}
      <SeaConditionCardEditor />

      {/* Provedores de Previsão */}
      <div className="flex items-end justify-between gap-3 flex-wrap pt-6 border-t border-white/10">
        <div>
          <p className="text-xs uppercase tracking-widest text-primary/80">Previsão do mar</p>
          <h1 className="text-3xl font-bold">Provedores de previsão</h1>
          <p className="text-sm text-muted-foreground mt-1">Apenas um provedor pode estar ativo por vez. Aparece no painel de Agenda.</p>
        </div>
        <Button onClick={() => setEditing({ id: "", kind: "open_meteo_marine", label: "Open-Meteo", config: { lat: -23.0, lon: -43.5 }, is_active: false })} className="rounded-xl bg-gradient-to-r from-primary to-accent">
          <Plus className="w-4 h-4 mr-1" /> Novo provedor
        </Button>
      </div>

      {loading ? <div className="glass rounded-2xl p-12 text-center"><Loader2 className="w-5 h-5 animate-spin mx-auto" /></div>
        : items.length === 0 ? <div className="glass rounded-2xl p-10 text-center text-sm text-muted-foreground">Nenhum provedor configurado. Adicione um para ver previsões.</div>
          : <div className="space-y-2">
            {items.map((p) => {
              const kind = KINDS.find((k) => k.value === p.kind);
              return (
                <div key={p.id} className="glass-strong rounded-2xl p-4 flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-primary/15 text-primary flex items-center justify-center"><Wind className="w-5 h-5" /></div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <div className="font-semibold truncate">{p.label}</div>
                      {p.is_active && <span className="text-[10px] uppercase px-2 py-0.5 rounded-full bg-success/15 text-success">Ativo</span>}
                    </div>
                    <div className="text-xs text-muted-foreground">{kind?.label}</div>
                    <div className="text-[11px] text-muted-foreground/70 mt-0.5">{JSON.stringify(p.config)}</div>
                  </div>
                  {p.is_active ? <Button size="sm" variant="outline" onClick={() => deactivate(p)} className="rounded-lg">Desativar</Button>
                    : <Button size="sm" onClick={() => activate(p)} className="rounded-lg bg-gradient-to-r from-primary to-accent">Ativar</Button>}
                  <button onClick={() => setEditing(p)} className="text-xs text-primary px-2">editar</button>
                  <button onClick={() => remove(p.id)} className="text-muted-foreground hover:text-destructive"><Trash2 className="w-4 h-4" /></button>
                </div>
              );
            })}
          </div>}

      {editing && <ProviderEditor provider={editing} onClose={() => { setEditing(null); load(); }} />}

      <div className="glass rounded-2xl p-4 text-xs text-muted-foreground">
        <p className="font-semibold text-foreground mb-1 flex items-center gap-1.5"><Globe className="w-3.5 h-3.5" /> Sobre as opções</p>
        <ul className="space-y-1 list-disc pl-5">
          <li><strong>WindGuru widget:</strong> grátis. Pegue o spot ID em <a href="https://www.windguru.cz" target="_blank" rel="noreferrer" className="text-primary inline-flex items-center gap-1">windguru.cz <ExternalLink className="w-3 h-3" /></a> e cole abaixo.</li>
          <li><strong>WindGuru API:</strong> precisa de plano pago e token. Adicione o token como segredo <code>WINDGURU_API_KEY</code> nas Configurações de Cloud.</li>
          <li><strong>Open-Meteo Marine:</strong> grátis e sem chave. Só latitude/longitude.</li>
        </ul>
      </div>
    </div>
  );
}

function ProviderEditor({ provider, onClose }: { provider: Provider; onClose: () => void }) {
  const [form, setForm] = useState(provider);
  const [saving, setSaving] = useState(false);

  const save = async () => {
    setSaving(true);
    const payload = { kind: form.kind, label: form.label, config: form.config, is_active: form.is_active };
    let res;
    if (form.id) res = await sb.from("forecast_providers").update(payload).eq("id", form.id);
    else {
      if (form.is_active) await sb.from("forecast_providers").update({ is_active: false }).neq("id", "00000000-0000-0000-0000-000000000000");
      res = await sb.from("forecast_providers").insert(payload);
    }
    setSaving(false);
    if (res.error) return toast.error(res.error.message);
    toast.success("Salvo"); onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="glass-strong rounded-t-3xl sm:rounded-3xl w-full sm:max-w-md max-h-[92vh] overflow-y-auto p-5">
        <h2 className="text-lg font-bold mb-4">{form.id ? "Editar provedor" : "Novo provedor"}</h2>
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label className="text-xs">Tipo</Label>
            <select className="w-full h-10 rounded-md border bg-background px-3 text-sm" value={form.kind}
              onChange={(e) => setForm({ ...form, kind: e.target.value, config: defaultConfig(e.target.value) })}>
              {KINDS.map((k) => <option key={k.value} value={k.value}>{k.label}</option>)}
            </select>
            <p className="text-[11px] text-muted-foreground">{KINDS.find((k) => k.value === form.kind)?.help}</p>
          </div>
          <div className="space-y-1.5"><Label className="text-xs">Nome (interno)</Label><Input value={form.label} onChange={(e) => setForm({ ...form, label: e.target.value })} /></div>

          {form.kind === "windguru_widget" && (
            <>
              <div className="space-y-1.5"><Label className="text-xs">Spot ID (windguru)</Label>
                <Input value={String(form.config?.spot_id ?? "")} onChange={(e) => setForm({ ...form, config: { ...form.config, spot_id: e.target.value } })} placeholder="ex: 481971" /></div>
            </>
          )}
          {form.kind === "windguru_api" && (
            <>
              <div className="space-y-1.5"><Label className="text-xs">Station ID</Label>
                <Input value={String(form.config?.station_id ?? "")} onChange={(e) => setForm({ ...form, config: { ...form.config, station_id: e.target.value } })} /></div>
              <p className="text-[11px] text-muted-foreground">Adicione o token <code>WINDGURU_API_KEY</code> nos segredos do Cloud.</p>
            </>
          )}
          {form.kind === "open_meteo_marine" && (
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5"><Label className="text-xs">Latitude</Label>
                <Input type="number" step="0.0001" value={String(form.config?.lat ?? "")} onChange={(e) => setForm({ ...form, config: { ...form.config, lat: Number(e.target.value) } })} /></div>
              <div className="space-y-1.5"><Label className="text-xs">Longitude</Label>
                <Input type="number" step="0.0001" value={String(form.config?.lon ?? "")} onChange={(e) => setForm({ ...form, config: { ...form.config, lon: Number(e.target.value) } })} /></div>
            </div>
          )}

          <div className="flex items-center justify-between border rounded-xl px-3 h-10"><Label className="text-sm">Ativar agora</Label><Switch checked={form.is_active} onCheckedChange={(v) => setForm({ ...form, is_active: v })} /></div>
        </div>
        <div className="flex gap-2 mt-5">
          <Button variant="outline" onClick={onClose} className="flex-1 rounded-xl">Cancelar</Button>
          <Button onClick={save} disabled={saving || !form.label} className="flex-1 rounded-xl bg-gradient-to-r from-primary to-accent">{saving ? <Loader2 className="w-4 h-4 animate-spin" /> : "Salvar"}</Button>
        </div>
      </div>
    </div>
  );
}

function defaultConfig(kind: string) {
  if (kind === "windguru_widget") return { spot_id: "" };
  if (kind === "windguru_api") return { station_id: "" };
  return { lat: -23.0, lon: -43.5 };
}

const daysOfWeekList = [
  { id: "seg", label: "Segunda" },
  { id: "ter", label: "Terça" },
  { id: "qua", label: "Quarta" },
  { id: "qui", label: "Quinta" },
  { id: "sex", label: "Sexta" },
  { id: "sab", label: "Sábado" },
  { id: "dom", label: "Domingo" }
];

const defaultCondition = {
  location: "Arpoador, Rio de Janeiro, Brasil",
  summary: "Céu limpo e mar glass",
  stars: 4,
  status: "excelente",
  waves: "1.2m",
  period: "10s",
  wave_dir: "SSE",
  wind: "Leste",
  water_temp: "25°C",
  air_temp: "Seca",
  ideal_for: "Todos os Níveis"
};

function SeaConditionCardEditor() {
  const [weekData, setWeekData] = useState<Record<string, any>>({});
  const [activeDay, setActiveDay] = useState("seg");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const load = async () => {
      const { data } = await sb
        .from("app_settings")
        .select("value")
        .eq("key", "sea_condition_card")
        .maybeSingle();
        
      const initial = {} as Record<string, any>;
      daysOfWeekList.forEach(d => initial[d.id] = { ...defaultCondition });

      if (data?.value) {
        try {
          const parsed = JSON.parse(data.value);
          if (parsed.seg) {
            setWeekData({ ...initial, ...parsed });
          } else {
            // Migrate old flat format to weekly
            const migrated = { ...initial };
            daysOfWeekList.forEach(d => {
              migrated[d.id] = {
                location: parsed.location || defaultCondition.location,
                summary: parsed.summary || defaultCondition.summary,
                stars: parsed.stars || defaultCondition.stars,
                status: parsed.status || defaultCondition.status,
                waves: parsed.waves || defaultCondition.waves,
                period: parsed.period || defaultCondition.period,
                wave_dir: parsed.wave_dir || defaultCondition.wave_dir,
                wind: parsed.wind || defaultCondition.wind,
                water_temp: parsed.water_temp || defaultCondition.water_temp,
                air_temp: parsed.air_temp || defaultCondition.air_temp,
                ideal_for: parsed.ideal_for || defaultCondition.ideal_for
              };
            });
            setWeekData(migrated);
          }
        } catch (e) {
          console.error(e);
          setWeekData(initial);
        }
      } else {
        setWeekData(initial);
      }
      setLoading(false);
    };
    load();
  }, []);

  const save = async () => {
    setSaving(true);
    const value = JSON.stringify({
      ...weekData,
      updated_at: new Date().toISOString(),
    });
    const { error } = await sb
      .from("app_settings")
      .upsert({ key: "sea_condition_card", value }, { onConflict: "key" });
    setSaving(false);
    if (error) {
      toast.error(error.message);
    } else {
      toast.success("Painel de condições da semana atualizado!");
    }
  };

  const handleChange = (key: string, val: any) => {
    setWeekData(prev => ({
      ...prev,
      [activeDay]: {
        ...(prev[activeDay] || defaultCondition),
        [key]: val
      }
    }));
  };

  if (loading) {
    return (
      <div className="glass rounded-2xl p-6 text-center animate-pulse text-sm text-muted-foreground">
        Carregando painel de edição das condições do mar...
      </div>
    );
  }

  const currentData = weekData[activeDay] || defaultCondition;

  return (
    <div className="glass-strong rounded-3xl p-5 space-y-4">
      <div className="flex items-center gap-3 mb-2">
        <div className="w-10 h-10 rounded-2xl bg-primary/15 text-primary flex items-center justify-center shrink-0">
          <Waves className="w-5 h-5" />
        </div>
        <div>
          <h2 className="font-bold text-lg">Previsão da Semana</h2>
          <p className="text-xs text-muted-foreground">Configure as condições do mar para cada dia da semana.</p>
        </div>
      </div>

      <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
        {daysOfWeekList.map(d => (
          <Button
            key={d.id}
            variant={activeDay === d.id ? "default" : "outline"}
            size="sm"
            onClick={() => setActiveDay(d.id)}
            className={`rounded-xl px-4 ${activeDay === d.id ? "bg-primary text-primary-foreground" : "bg-background/50"}`}
          >
            {d.label}
          </Button>
        ))}
      </div>

      <div className="space-y-4 border-t border-white/5 pt-4">
        {/* Localização e Resumo */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold">Localização</Label>
            <Input
              value={currentData.location}
              onChange={(e) => handleChange("location", e.target.value)}
              placeholder="Ex: Arpoador, Rio de Janeiro, Brasil"
              className="bg-input/60 border-0 h-10 rounded-xl"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold">Resumo / Céu e Mar</Label>
            <Input
              value={currentData.summary}
              onChange={(e) => handleChange("summary", e.target.value)}
              placeholder="Ex: Céu limpo e mar glass"
              className="bg-input/60 border-0 h-10 rounded-xl"
            />
          </div>
        </div>

        {/* Avaliação e Classificação */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold">Avaliação (1 a 5 Estrelas)</Label>
            <select
              value={currentData.stars}
              onChange={(e) => handleChange("stars", Number(e.target.value))}
              className="w-full h-10 rounded-xl border border-white/10 bg-background/50 px-3 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
            >
              <option value={1}>⭐ (Muito Ruim)</option>
              <option value={2}>⭐⭐ (Regular)</option>
              <option value={3}>⭐⭐⭐ (Bom)</option>
              <option value={4}>⭐⭐⭐⭐ (Muito Bom)</option>
              <option value={5}>⭐⭐⭐⭐⭐ (Excelente)</option>
            </select>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold">Destaque do Mar</Label>
            <select
              value={currentData.status}
              onChange={(e) => handleChange("status", e.target.value)}
              className="w-full h-10 rounded-xl border border-white/10 bg-background/50 px-3 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
            >
              <option value="excelente">Excelente ✨</option>
              <option value="bom">Bom 👍</option>
              <option value="medio">Médio / Atenção ⚠️</option>
              <option value="ruim">Ruim / Ressaca 🚩</option>
              <option value="flat">Sem Ondas / Flat 🏖️</option>
            </select>
          </div>
        </div>

        {/* Parâmetros Grid - Linha 1 */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold">Ondas (m)</Label>
            <Input
              value={currentData.waves}
              onChange={(e) => handleChange("waves", e.target.value)}
              placeholder="Ex: 1.2m"
              className="bg-input/60 border-0 h-10 rounded-xl"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold">Período (s)</Label>
            <Input
              value={currentData.period}
              onChange={(e) => handleChange("period", e.target.value)}
              placeholder="Ex: 10s"
              className="bg-input/60 border-0 h-10 rounded-xl"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold">Dir. Onda</Label>
            <Input
              value={currentData.wave_dir}
              onChange={(e) => handleChange("wave_dir", e.target.value)}
              placeholder="Ex: SSE"
              className="bg-input/60 border-0 h-10 rounded-xl"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold">Direção do vento</Label>
            <Input
              value={currentData.wind}
              onChange={(e) => handleChange("wind", e.target.value)}
              placeholder="Ex: Leste, NE, S"
              className="bg-input/60 border-0 h-10 rounded-xl"
            />
          </div>
        </div>

        {/* Parâmetros Grid - Linha 2 */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold">Temperatura da Água</Label>
            <Input
              value={currentData.water_temp}
              onChange={(e) => handleChange("water_temp", e.target.value)}
              placeholder="Ex: 25°C"
              className="bg-input/60 border-0 h-10 rounded-xl"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold">Maré</Label>
            <Input
              value={currentData.air_temp}
              onChange={(e) => handleChange("air_temp", e.target.value)}
              placeholder="Ex: Seca, Cheia, 0.4m"
              className="bg-input/60 border-0 h-10 rounded-xl"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold">Ideal para (Nível)</Label>
            <Input
              value={currentData.ideal_for}
              onChange={(e) => handleChange("ideal_for", e.target.value)}
              placeholder="Ex: Todos os Níveis"
              className="bg-input/60 border-0 h-10 rounded-xl"
            />
          </div>
        </div>

        <Button onClick={save} disabled={saving} className="w-full h-11 rounded-xl bg-gradient-to-r from-primary to-accent font-bold mt-2 shadow-lg hover:shadow-primary/20 transition-all">
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : "Salvar Previsão da Semana"}
        </Button>
      </div>
    </div>
  );
}

