export type TeacherReview = {
  id: string;
  teacher_id: string;
  user_id: string;
  rating: number;
  comment: string | null;
  created_at: string;
  student_name?: string | null;
};

export type Teacher = {
  id: string;
  name: string;
  avatar_url: string | null;
  is_active: boolean;
  sort_order: number;
  reviews?: TeacherReview[];
};

export function reviewMonth(iso: string): string {
  return iso.slice(0, 7);
}

export function currentYearMonth(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

export function prevYearMonth(ym: string): string {
  const [y, m] = ym.split("-").map(Number);
  const d = new Date(y, m - 2, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

export function nextYearMonth(ym: string): string {
  const [y, m] = ym.split("-").map(Number);
  const d = new Date(y, m, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

export function averageRating(reviews: TeacherReview[], month?: string): number {
  const filtered = month
    ? reviews.filter((r) => reviewMonth(r.created_at) === month)
    : reviews;
  if (!filtered.length) return 0;
  return filtered.reduce((s, r) => s + r.rating, 0) / filtered.length;
}

export function reviewCount(reviews: TeacherReview[], month?: string): number {
  return month
    ? reviews.filter((r) => reviewMonth(r.created_at) === month).length
    : reviews.length;
}

export type TeacherRankEntry = {
  teacher: Teacher;
  score: number;
  count: number;
};

export function buildRanking(
  teachers: Teacher[],
  month?: string,
): TeacherRankEntry[] {
  return [...teachers]
    .map((t) => {
      const reviews = t.reviews ?? [];
      return {
        teacher: t,
        score: averageRating(reviews, month),
        count: reviewCount(reviews, month),
      };
    })
    .filter((x) => x.count > 0)
    .sort((a, b) => b.score - a.score || b.count - a.count);
}

export function ratingDistribution(reviews: TeacherReview[]) {
  const total = reviews.length;
  return [5, 4, 3, 2, 1].map((star) => ({
    star,
    count: reviews.filter((r) => r.rating === star).length,
    pct: total ? (reviews.filter((r) => r.rating === star).length / total) * 100 : 0,
  }));
}
