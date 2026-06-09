import { useRef, useState } from "react";
import { uploadTeacherAvatar } from "@/lib/uploadTeacherAvatar";
import { format, parseISO } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { useTeachers } from "@/hooks/useTeachers";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TeacherAvatar } from "@/components/teachers/TeacherAvatar";
import { StarRating } from "@/components/teachers/StarRating";
import { toast } from "sonner";
import {
  averageRating,
  buildRanking,
  currentYearMonth,
  nextYearMonth,
  prevYearMonth,
  type Teacher,
  type TeacherReview,
} from "@/lib/teacherRatings";
import { useTranslation } from "@/i18n/LanguageContext";
import { dateFnsLocaleFor } from "@/i18n/dateLocale";
import {
  ChevronLeft,
  ChevronRight,
  Edit3,
  GraduationCap,
  Loader2,
  Plus,
  Trash2,
  Trophy,
  Upload,
  X,
} from "lucide-react";

const sb = supabase as any;

type TeacherForm = {
  id: string;
  name: string;
  avatar_url: string | null;
  is_active: boolean;
  sort_order: number;
};

export default function AdminTeachers() {
  const { t } = useTranslation();

  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs uppercase tracking-widest text-primary/80">
          {t("admin.teachers.eyebrow")}
        </p>
        <h1 className="text-3xl font-bold">{t("admin.teachers.title")}</h1>
        <p className="text-sm text-muted-foreground mt-1">{t("admin.teachers.subtitle")}</p>
      </div>

      <Tabs defaultValue="manage" className="w-full">
        <TabsList className="bg-secondary/40 rounded-xl p-1 flex-wrap h-auto">
          <TabsTrigger value="manage" className="rounded-lg">
            <GraduationCap className="w-4 h-4 mr-1.5" />
            {t("admin.teachers.tabManage")}
          </TabsTrigger>
          <TabsTrigger value="monthly" className="rounded-lg">
            <Trophy className="w-4 h-4 mr-1.5" />
            {t("admin.teachers.tabMonthly")}
          </TabsTrigger>
          <TabsTrigger value="overall" className="rounded-lg">
            <Trophy className="w-4 h-4 mr-1.5" />
            {t("admin.teachers.tabOverall")}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="manage" className="mt-5">
          <ManageTeachersTab />
        </TabsContent>
        <TabsContent value="monthly" className="mt-5">
          <RankingTab mode="monthly" />
        </TabsContent>
        <TabsContent value="overall" className="mt-5">
          <RankingTab mode="overall" />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function ManageTeachersTab() {
  const { t } = useTranslation();
  const { teachers, loading, reload } = useTeachers({ activeOnly: false });
  const [editing, setEditing] = useState<TeacherForm | null>(null);
  const [selected, setSelected] = useState<Teacher | null>(null);

  const remove = async (id: string) => {
    if (!confirm(t("admin.teachers.confirmRemove"))) return;
    const { error } = await sb.from("teachers").delete().eq("id", id);
    if (error) return toast.error(error.message);
    toast.success(t("admin.shared.remove"));
    reload();
  };

  const toggle = async (teacher: Teacher) => {
    await sb.from("teachers").update({ is_active: !teacher.is_active }).eq("id", teacher.id);
    reload();
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button
          onClick={() =>
            setEditing({
              id: "",
              name: "",
              avatar_url: null,
              is_active: true,
              sort_order: teachers.length,
            })
          }
          className="rounded-xl bg-gradient-to-r from-primary to-accent"
        >
          <Plus className="w-4 h-4 mr-1" />
          {t("admin.teachers.newTeacher")}
        </Button>
      </div>

      {loading ? (
        <div className="glass rounded-2xl p-12 text-center">
          <Loader2 className="w-5 h-5 animate-spin mx-auto" />
        </div>
      ) : teachers.length === 0 ? (
        <div className="glass rounded-2xl p-10 text-center text-sm text-muted-foreground">
          {t("admin.teachers.empty")}
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 gap-3">
          {teachers.map((teacher) => {
            const score =
              teacher.reviews?.length
                ? teacher.reviews.reduce((s, r) => s + r.rating, 0) / teacher.reviews.length
                : 0;
            const count = teacher.reviews?.length ?? 0;
            return (
              <div key={teacher.id} className="glass-strong rounded-2xl p-4 flex gap-3">
                <button
                  type="button"
                  onClick={() => setSelected(teacher)}
                  className="flex flex-1 gap-3 min-w-0 text-left hover:opacity-90 transition-opacity"
                >
                  <TeacherAvatar teacher={teacher} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <div className="font-semibold truncate">{teacher.name}</div>
                      <span
                        className={`text-[10px] uppercase px-2 py-0.5 rounded-full ${
                          teacher.is_active
                            ? "bg-success/15 text-success"
                            : "bg-muted/40 text-muted-foreground"
                        }`}
                      >
                        {teacher.is_active ? t("admin.shared.active") : t("admin.shared.inactive")}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 mt-1">
                      <StarRating value={score} size="sm" />
                      <span className="text-xs font-semibold text-primary">
                        {count > 0 ? score.toFixed(2) : "—"}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        ({count})
                      </span>
                    </div>
                    <p className="text-[11px] text-primary/80 mt-1.5">
                      {t("admin.teachers.viewReviews")}
                    </p>
                  </div>
                  <ChevronRight className="w-5 h-5 text-muted-foreground shrink-0 self-center" />
                </button>
                <div className="flex flex-col items-end gap-2 shrink-0" onClick={(e) => e.stopPropagation()}>
                  <Switch checked={teacher.is_active} onCheckedChange={() => toggle(teacher)} />
                  <button
                    type="button"
                    onClick={() =>
                      setEditing({
                        id: teacher.id,
                        name: teacher.name,
                        avatar_url: teacher.avatar_url,
                        is_active: teacher.is_active,
                        sort_order: teacher.sort_order,
                      })
                    }
                    className="text-muted-foreground hover:text-primary"
                  >
                    <Edit3 className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => remove(teacher.id)}
                    className="text-muted-foreground hover:text-destructive"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {selected && (
        <TeacherReviewsSheet teacher={selected} onClose={() => setSelected(null)} />
      )}

      {editing && (
        <TeacherEditor
          form={editing}
          onClose={() => {
            setEditing(null);
            reload();
          }}
        />
      )}
    </div>
  );
}

function TeacherReviewsSheet({
  teacher,
  onClose,
}: {
  teacher: Teacher;
  onClose: () => void;
}) {
  const { t, language } = useTranslation();
  const locale = dateFnsLocaleFor(language);
  const reviews = [...(teacher.reviews ?? [])].sort((a, b) =>
    b.created_at.localeCompare(a.created_at),
  );
  const overall = averageRating(reviews);
  const total = reviews.length;

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" onClick={onClose}>
      <div
        className="glass-strong rounded-2xl w-full max-w-lg max-h-[90vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between gap-3 p-5 border-b border-border/40">
          <div className="flex items-center gap-3 min-w-0">
            <TeacherAvatar teacher={teacher} />
            <div className="min-w-0">
              <h2 className="font-bold truncate">{teacher.name}</h2>
              <div className="flex items-center gap-2 mt-0.5">
                <StarRating value={overall} size="sm" />
                <span className="text-sm font-semibold text-primary">
                  {total > 0 ? overall.toFixed(2) : "—"}
                </span>
                <span className="text-xs text-muted-foreground">
                  {t(total === 1 ? "teacherRatings.reviewOne" : "teacherRatings.reviewMany", {
                    count: total,
                  })}
                </span>
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-9 h-9 rounded-xl hover:bg-secondary/60 flex items-center justify-center shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 overflow-y-auto space-y-3">
          <h3 className="text-xs uppercase tracking-widest text-primary/80">
            {t("admin.teachers.reviewsTitle")}
          </h3>
          {total === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">
              {t("admin.teachers.noReviews")}
            </p>
          ) : (
            reviews.map((review) => (
              <AdminReviewCard key={review.id} review={review} locale={locale} t={t} />
            ))
          )}
        </div>
      </div>
    </div>
  );
}

function AdminReviewCard({
  review,
  locale,
  t,
}: {
  review: TeacherReview;
  locale: ReturnType<typeof dateFnsLocaleFor>;
  t: (key: string) => string;
}) {
  const dateLabel = format(parseISO(review.created_at), "d MMM yyyy", { locale });
  return (
    <div className="glass rounded-2xl p-4">
      <div className="flex justify-between items-start gap-2">
        <div className="min-w-0">
          <p className="text-[10px] uppercase tracking-widest text-muted-foreground">
            {t("admin.teachers.evaluatedBy")}
          </p>
          <p className="font-semibold text-sm truncate">
            {review.student_name ?? t("admin.shared.noName")}
          </p>
        </div>
        <StarRating value={review.rating} size="sm" />
      </div>
      {review.comment?.trim() ? (
        <p className="text-sm text-muted-foreground mt-2">{review.comment}</p>
      ) : (
        <p className="text-sm text-muted-foreground/60 mt-2 italic">
          {t("admin.teachers.noComment")}
        </p>
      )}
      <p className="text-[11px] text-muted-foreground/80 mt-2">{dateLabel}</p>
    </div>
  );
}

function TeacherEditor({
  form: initial,
  onClose,
}: {
  form: TeacherForm;
  onClose: () => void;
}) {
  const { t } = useTranslation();
  const [form, setForm] = useState(initial);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const save = async () => {
    if (!form.name.trim()) {
      toast.error(t("admin.teachers.nameRequired"));
      return;
    }
    setSaving(true);
    const payload = {
      name: form.name.trim(),
      avatar_url: form.avatar_url,
      is_active: form.is_active,
      sort_order: form.sort_order,
    };
    const { error } = form.id
      ? await sb.from("teachers").update(payload).eq("id", form.id)
      : await sb.from("teachers").insert(payload);
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success(t("admin.shared.saved"));
    onClose();
  };

  const upload = async (file: File) => {
    const localPreview = URL.createObjectURL(file);
    setPreviewUrl((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return localPreview;
    });
    setUploading(true);
    try {
      const result = await uploadTeacherAvatar(file);
      if ("error" in result) {
        URL.revokeObjectURL(localPreview);
        setPreviewUrl(null);
        toast.error(result.error);
        return;
      }
      URL.revokeObjectURL(localPreview);
      setPreviewUrl(null);
      setForm((f) => ({ ...f, avatar_url: result.publicUrl }));
      toast.success(t("admin.teachers.photoUploaded"));
    } catch {
      URL.revokeObjectURL(localPreview);
      setPreviewUrl(null);
      toast.error(t("admin.teachers.uploadFailed"));
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
      <div className="glass-strong rounded-2xl p-6 w-full max-w-md space-y-4 max-h-[90vh] overflow-y-auto">
        <h2 className="text-lg font-bold">
          {form.id ? t("admin.teachers.editTeacher") : t("admin.teachers.newTeacher")}
        </h2>
        <div className="flex flex-col items-center gap-2">
          <TeacherAvatar
            teacher={previewUrl ? { ...form, avatar_url: previewUrl } : form}
            size="lg"
          />
          {uploading && (
            <p className="text-xs text-muted-foreground flex items-center gap-1.5">
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
              {t("admin.teachers.uploadingPhoto")}
            </p>
          )}
        </div>
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) upload(f);
          }}
        />
        <Button
          type="button"
          variant="outline"
          className="w-full rounded-xl"
          disabled={uploading}
          onClick={() => fileRef.current?.click()}
        >
          {uploading ? (
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
          ) : (
            <Upload className="w-4 h-4 mr-2" />
          )}
          {uploading ? t("common.loading") : t("admin.shared.upload")}
        </Button>
        <div>
          <Label>{t("admin.shared.name")}</Label>
          <Input
            value={form.name}
            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            className="rounded-xl mt-1"
          />
        </div>
        <div className="flex items-center justify-between">
          <Label>{t("admin.shared.active")}</Label>
          <Switch
            checked={form.is_active}
            onCheckedChange={(v) => setForm((f) => ({ ...f, is_active: v }))}
          />
        </div>
        <div className="flex gap-2 pt-2">
          <Button variant="outline" className="flex-1 rounded-xl" onClick={onClose}>
            {t("common.cancel")}
          </Button>
          <Button className="flex-1 rounded-xl" onClick={save} disabled={saving}>
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : t("common.save")}
          </Button>
        </div>
      </div>
    </div>
  );
}

function RankingTab({ mode }: { mode: "monthly" | "overall" }) {
  const { t, language } = useTranslation();
  const locale = dateFnsLocaleFor(language);
  const { teachers, loading } = useTeachers({ activeOnly: true });
  const [month, setMonth] = useState(currentYearMonth());
  const maxMonth = currentYearMonth();

  const list = buildRanking(teachers, mode === "monthly" ? month : undefined);

  const monthLabel =
    mode === "monthly"
      ? format(parseISO(`${month}-01`), "MMMM yyyy", { locale })
      : null;

  const medals: Record<number, string> = {
    1: "text-amber-500",
    2: "text-slate-400",
    3: "text-amber-700",
  };

  return (
    <div className="space-y-4">
      {mode === "monthly" && (
        <div className="glass rounded-2xl flex items-center justify-between px-4 py-3">
          <Button
            type="button"
            variant="outline"
            size="icon"
            className="rounded-xl"
            onClick={() => setMonth(prevYearMonth(month))}
          >
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <span className="font-bold capitalize">{monthLabel}</span>
          <Button
            type="button"
            variant="outline"
            size="icon"
            className="rounded-xl"
            disabled={month >= maxMonth}
            onClick={() => setMonth(nextYearMonth(month))}
          >
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
      )}

      {loading ? (
        <div className="glass rounded-2xl p-12 text-center">
          <Loader2 className="w-5 h-5 animate-spin mx-auto" />
        </div>
      ) : list.length === 0 ? (
        <div className="glass rounded-2xl p-10 text-center text-sm text-muted-foreground">
          {t("admin.teachers.noRanking")}
        </div>
      ) : (
        <div className="glass-strong rounded-2xl overflow-hidden divide-y divide-border/50">
          {list.map(({ teacher, score, count }, i) => {
            const rank = i + 1;
            return (
              <div key={teacher.id} className="flex items-center gap-3 p-4">
                <span
                  className={`w-8 text-right font-extrabold shrink-0 ${
                    medals[rank] ?? "text-muted-foreground"
                  }`}
                >
                  {rank}º
                </span>
                <TeacherAvatar teacher={teacher} />
                <div className="flex-1 min-w-0">
                  <p className="font-semibold truncate">{teacher.name}</p>
                  <div className="flex items-center gap-2 mt-0.5">
                    <StarRating value={score} size="sm" />
                    <span className="text-sm font-bold text-primary">{score.toFixed(2)}</span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {t(count === 1 ? "teacherRatings.reviewOne" : "teacherRatings.reviewMany", {
                      count,
                    })}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
