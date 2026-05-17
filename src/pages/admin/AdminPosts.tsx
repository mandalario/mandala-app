import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { Plus, Trash2, Edit3, Loader2 } from "lucide-react";
import { Modal } from "./AdminStudents";

type Category = "warm_up" | "pre_surfing";
type Post = { id: string; title: string; body: string | null; youtube_url: string | null; is_published: boolean; category: Category; created_at: string };

const CAT_LABEL: Record<Category, string> = { warm_up: "Warm Up", pre_surfing: "Pre Surfing" };

export default function AdminPosts() {
  const { user } = useAuth();
  const [list, setList] = useState<Post[]>([]);
  const [edit, setEdit] = useState<Post | null>(null);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    const { data } = await supabase.from("posts").select("*").order("created_at", { ascending: false });
    setList((data ?? []) as Post[]); setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const remove = async (id: string) => {
    if (!confirm("Remover post?")) return;
    await supabase.from("posts").delete().eq("id", id); load();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-widest text-primary/80">Conteúdo</p>
          <h1 className="text-3xl font-bold">Posts & vídeos</h1>
        </div>
        <Button onClick={() => setEdit({ id: "", title: "", body: "", youtube_url: "", is_published: true, category: "pre_surfing", created_at: "" })} className="rounded-xl bg-gradient-to-r from-primary to-accent"><Plus className="w-4 h-4 mr-1" /> Novo</Button>
      </div>

      {loading ? <div className="glass rounded-2xl p-12 text-center"><Loader2 className="w-5 h-5 animate-spin mx-auto" /></div> :
        <div className="space-y-2">
          {list.map((p) => (
            <div key={p.id} className="glass-strong rounded-2xl p-4 flex items-center gap-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-semibold truncate">{p.title}</span>
                  <span className="text-[10px] uppercase tracking-widest px-2 py-0.5 rounded-full bg-primary/15 text-primary">{CAT_LABEL[p.category]}</span>
                  <span className={`text-[10px] uppercase tracking-widest px-2 py-0.5 rounded-full ${p.is_published ? "bg-success/15 text-success" : "bg-muted/40 text-muted-foreground"}`}>{p.is_published ? "Publicado" : "Rascunho"}</span>
                </div>
                {p.youtube_url && <div className="text-xs text-muted-foreground truncate">{p.youtube_url}</div>}
              </div>
              <Button size="sm" variant="ghost" onClick={() => setEdit(p)} className="rounded-xl"><Edit3 className="w-3 h-3" /></Button>
              <Button size="sm" variant="ghost" onClick={() => remove(p.id)} className="rounded-xl text-destructive hover:bg-destructive/10"><Trash2 className="w-3 h-3" /></Button>
            </div>
          ))}
        </div>
      }

      {edit && <PostForm post={edit} authorId={user!.id} onClose={() => { setEdit(null); load(); }} />}
    </div>
  );
}

function PostForm({ post, authorId, onClose }: { post: Post; authorId: string; onClose: () => void }) {
  const [f, setF] = useState(post);
  const [saving, setSaving] = useState(false);
  const save = async () => {
    setSaving(true);
    const payload = { title: f.title, body: f.body || null, youtube_url: f.youtube_url || null, is_published: f.is_published, category: f.category, author_id: authorId };
    const { error } = post.id
      ? await supabase.from("posts").update(payload).eq("id", post.id)
      : await supabase.from("posts").insert(payload);
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success("Salvo"); onClose();
  };
  return (
    <Modal onClose={onClose}>
      <h2 className="text-xl font-bold mb-4">{post.id ? "Editar post" : "Novo post"}</h2>
      <div className="space-y-3">
        <div><Label>Título</Label><Input value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} className="bg-input/60 border-0 h-11 rounded-xl mt-1" /></div>
        <div>
          <Label>Categoria</Label>
          <div className="grid grid-cols-2 gap-2 mt-1">
            {(["warm_up","pre_surfing"] as Category[]).map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setF({ ...f, category: c })}
                className={`h-11 rounded-xl text-sm font-medium transition-colors ${f.category === c ? "bg-primary text-primary-foreground" : "bg-secondary/40 text-foreground/70 hover:bg-secondary/60"}`}
              >
                {CAT_LABEL[c]}
              </button>
            ))}
          </div>
        </div>
        <div><Label>Link do YouTube</Label><Input value={f.youtube_url ?? ""} onChange={(e) => setF({ ...f, youtube_url: e.target.value })} placeholder="https://youtu.be/..." className="bg-input/60 border-0 h-11 rounded-xl mt-1" /></div>
        <div><Label>Texto</Label><Textarea value={f.body ?? ""} onChange={(e) => setF({ ...f, body: e.target.value })} className="bg-input/60 border-0 rounded-xl mt-1 min-h-32" /></div>
        <div className="flex items-center justify-between p-3 rounded-xl bg-secondary/40">
          <span className="text-sm">Publicado</span>
          <Switch checked={f.is_published} onCheckedChange={(v) => setF({ ...f, is_published: v })} />
        </div>
        <Button onClick={save} disabled={saving || !f.title} className="w-full h-11 rounded-xl bg-gradient-to-r from-primary to-accent">{saving ? <Loader2 className="w-4 h-4 animate-spin" /> : "Salvar"}</Button>
      </div>
    </Modal>
  );
}
