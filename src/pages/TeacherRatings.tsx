import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { format, parseISO } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useTeachers } from "@/hooks/useTeachers";
import { OceanBackground } from "@/components/OceanBackground";
import { TeacherAvatar } from "@/components/teachers/TeacherAvatar";
import { StarRating, StarRatingInput } from "@/components/teachers/StarRating";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { ArrowLeft, ChevronRight, Loader2, Plus, Star } from "lucide-react";
import { useTranslation } from "@/i18n/LanguageContext";
import { dateFnsLocaleFor } from "@/i18n/dateLocale";
import {
  averageRating,
  ratingDistribution,
  reviewCount,
  type Teacher,
  type TeacherReview,
} from "@/lib/teacherRatings";

const sb = supabase as any;

export default function TeacherRatings() {
  const { user, loading: authLoading } = useAuth();
  const { t, language } = useTranslation();
  const navigate = useNavigate();
  const { teachers, loading, reload } = useTeachers({ activeOnly: true });
  const [selected, setSelected] = useState<Teacher | null>(null);
  const [reviewTarget, setReviewTarget] = useState<Teacher | null>(null);

  useEffect(() => {
    if (authLoading) return;
    if (!user) navigate("/auth", { replace: true });
  }, [user, authLoading, navigate]);

  const freshSelected = useMemo(() => {
    if (!selected) return null;
    return teachers.find((t) => t.id === selected.id) ?? selected;
  }, [selected, teachers]);

  if (authLoading || !user) {
    return (
      <div className="relative min-h-screen flex items-center justify-center">
        <OceanBackground />
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (freshSelected) {
    return (
      <>
        <TeacherDetail
          teacher={freshSelected}
          userId={user.id}
          onBack={() => setSelected(null)}
          onReview={() => setReviewTarget(freshSelected)}
        />
        {reviewTarget && (
          <ReviewDialog
            teacher={reviewTarget}
            userId={user.id}
            existing={reviewTarget.reviews?.find((r) => r.user_id === user.id)}
            onClose={() => setReviewTarget(null)}
            onSaved={() => {
              setReviewTarget(null);
              reload();
            }}
          />
        )}
      </>
    );
  }

  return (
    <div className="relative min-h-screen pb-24">
      <OceanBackground />
      <div className="sticky top-0 z-20 glass-strong border-b border-white/10">
        <div className="flex items-center gap-3 px-5 py-4">
          <Link
            to="/"
            className="w-10 h-10 rounded-xl glass flex items-center justify-center shrink-0"
            aria-label={t("common.back")}
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <p className="text-[10px] uppercase tracking-widest text-primary/80">
              {t("teacherRatings.eyebrow")}
            </p>
            <h1 className="text-lg font-bold">{t("teacherRatings.title")}</h1>
          </div>
        </div>
      </div>

      <div className="px-5 pt-4">
        {loading ? (
          <div className="glass rounded-2xl p-12 flex justify-center">
            <Loader2 className="w-6 h-6 animate-spin text-primary" />
          </div>
        ) : teachers.length === 0 ? (
          <div className="glass rounded-2xl p-10 text-center text-sm text-muted-foreground">
            {t("teacherRatings.noTeachers")}
          </div>
        ) : (
          <div className="glass-strong rounded-2xl overflow-hidden divide-y divide-border/50">
            {teachers.map((teacher) => {
              const score = averageRating(teacher.reviews ?? []);
              const total = reviewCount(teacher.reviews ?? []);
              const mine = teacher.reviews?.find((r) => r.user_id === user.id);
              return (
                <div
                  key={teacher.id}
                  className="flex items-center gap-3 p-4 hover:bg-secondary/30 transition-colors"
                >
                  <button
                    type="button"
                    className="flex flex-1 items-center gap-3 min-w-0 text-left"
                    onClick={() => setSelected(teacher)}
                  >
                    <TeacherAvatar teacher={teacher} />
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold truncate">{teacher.name}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <StarRating value={score} size="sm" />
                        <span className="text-sm font-bold text-primary">
                          {total > 0 ? score.toFixed(2) : "—"}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {t(total === 1 ? "teacherRatings.reviewOne" : "teacherRatings.reviewMany", {
                          count: total,
                        })}
                      </p>
                    </div>
                    <ChevronRight className="w-5 h-5 text-muted-foreground shrink-0" />
                  </button>
                  <Button
                    size="sm"
                    className="rounded-xl shrink-0"
                    variant={mine ? "outline" : "default"}
                    onClick={() => setReviewTarget(teacher)}
                  >
                    {mine ? t("teacherRatings.editReview") : t("teacherRatings.rate")}
                  </Button>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {reviewTarget && (
        <ReviewDialog
          teacher={reviewTarget}
          userId={user.id}
          existing={reviewTarget.reviews?.find((r) => r.user_id === user.id)}
          onClose={() => setReviewTarget(null)}
          onSaved={() => {
            setReviewTarget(null);
            reload();
          }}
        />
      )}
    </div>
  );
}

function TeacherDetail({
  teacher,
  userId,
  onBack,
  onReview,
}: {
  teacher: Teacher;
  userId: string;
  onBack: () => void;
  onReview: () => void;
}) {
  const { t, language } = useTranslation();
  const locale = dateFnsLocaleFor(language);
  const reviews = teacher.reviews ?? [];
  const overall = averageRating(reviews);
  const total = reviews.length;
  const dist = ratingDistribution(reviews);
  const mine = reviews.find((r) => r.user_id === userId);

  return (
    <div className="relative min-h-screen pb-8">
      <OceanBackground />
      <div className="sticky top-0 z-20 glass-strong border-b border-white/10">
        <div className="flex items-center gap-3 px-5 py-4">
          <button
            type="button"
            onClick={onBack}
            className="w-10 h-10 rounded-xl glass flex items-center justify-center"
            aria-label={t("common.back")}
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="text-lg font-bold">{t("teacherRatings.profileTitle")}</h1>
        </div>
      </div>

      <div className="px-5 pt-6 text-center">
        <TeacherAvatar teacher={teacher} size="lg" className="mx-auto" />
        <h2 className="text-xl font-bold mt-4">{teacher.name}</h2>
        <div className="flex items-center justify-center gap-2 mt-2">
          <span className="text-3xl font-extrabold">{total > 0 ? overall.toFixed(2) : "—"}</span>
          <StarRating value={overall} size="lg" />
        </div>
        <p className="text-sm text-muted-foreground mt-1">
          {t(total === 1 ? "teacherRatings.reviewOne" : "teacherRatings.reviewMany", { count: total })}
        </p>
      </div>

      {total > 0 && (
        <div className="px-5 mt-6 space-y-2">
          {dist.map(({ star, count: c, pct }) => (
            <div key={star} className="flex items-center gap-2 text-sm">
              <span className="w-4 text-right text-muted-foreground">{star}</span>
              <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
              <div className="flex-1 h-2 rounded-full bg-secondary/60 overflow-hidden">
                <div
                  className="h-full rounded-full bg-primary transition-all duration-500"
                  style={{ width: `${pct}%` }}
                />
              </div>
              <span className="w-6 text-xs text-muted-foreground text-right">{c}</span>
            </div>
          ))}
        </div>
      )}

      <div className="px-5 mt-6">
        <Button className="w-full rounded-xl" onClick={onReview}>
          <Plus className="w-4 h-4 mr-1" />
          {mine ? t("teacherRatings.editYourReview") : t("teacherRatings.rateThisTeacher")}
        </Button>
      </div>

      <div className="px-5 mt-8 space-y-3">
        <h3 className="text-xs uppercase tracking-widest text-primary/80">
          {t("teacherRatings.reviewsSection")}
        </h3>
        {total === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-6">
            {t("teacherRatings.noReviewsYet")}
          </p>
        ) : (
          [...reviews]
            .sort((a, b) => b.created_at.localeCompare(a.created_at))
            .map((r) => (
              <ReviewCard key={r.id} review={r} locale={locale} />
            ))
        )}
      </div>
    </div>
  );
}

function ReviewCard({
  review,
  locale,
}: {
  review: TeacherReview;
  locale: ReturnType<typeof dateFnsLocaleFor>;
}) {
  const month = format(parseISO(review.created_at), "MMM yyyy", { locale });
  return (
    <div className="glass rounded-2xl p-4">
      <div className="flex justify-between items-start gap-2">
        <span className="font-semibold text-sm">
          {review.student_name ?? "—"}
        </span>
        <StarRating value={review.rating} size="sm" />
      </div>
      {review.comment?.trim() && (
        <p className="text-sm text-muted-foreground mt-2">{review.comment}</p>
      )}
      <p className="text-[11px] text-muted-foreground/80 mt-2 capitalize">{month}</p>
    </div>
  );
}

function ReviewDialog({
  teacher,
  userId,
  existing,
  onClose,
  onSaved,
}: {
  teacher: Teacher;
  userId: string;
  existing?: TeacherReview;
  onClose: () => void;
  onSaved: () => void;
}) {
  const { t } = useTranslation();
  const [rating, setRating] = useState(existing?.rating ?? 5);
  const [comment, setComment] = useState(existing?.comment ?? "");
  const [saving, setSaving] = useState(false);

  const submit = async () => {
    setSaving(true);
    const payload = {
      teacher_id: teacher.id,
      user_id: userId,
      rating,
      comment: comment.trim() || null,
    };
    const { error } = existing
      ? await sb.from("teacher_reviews").update({ rating: payload.rating, comment: payload.comment }).eq("id", existing.id)
      : await sb.from("teacher_reviews").insert(payload);
    setSaving(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success(t("teacherRatings.reviewSaved"));
    onSaved();
  };

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="rounded-2xl max-w-md">
        <DialogHeader>
          <DialogTitle>{t("teacherRatings.modalTitle")}</DialogTitle>
          <p className="text-sm text-muted-foreground">{teacher.name}</p>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <p className="text-sm font-medium mb-2">{t("teacherRatings.ratingLabel")}</p>
            <StarRatingInput value={rating} onChange={setRating} />
          </div>
          <div>
            <p className="text-sm font-medium mb-2">{t("teacherRatings.commentLabel")}</p>
            <Textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder={t("teacherRatings.commentPlaceholder")}
              rows={3}
              className="rounded-xl"
            />
          </div>
        </div>
        <DialogFooter className="gap-2 sm:gap-2">
          <Button variant="outline" className="rounded-xl flex-1" onClick={onClose}>
            {t("common.cancel")}
          </Button>
          <Button className="rounded-xl flex-1" onClick={submit} disabled={saving}>
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : t("teacherRatings.submitReview")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
