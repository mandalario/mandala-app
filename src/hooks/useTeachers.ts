import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Teacher, TeacherReview } from "@/lib/teacherRatings";

const sb = supabase as any;

type ReviewRow = {
  id: string;
  teacher_id: string;
  user_id: string;
  rating: number;
  comment: string | null;
  created_at: string;
  profiles?: { full_name: string | null } | null;
};

type TeacherRow = {
  id: string;
  name: string;
  avatar_url: string | null;
  is_active: boolean;
  sort_order: number;
  teacher_reviews?: ReviewRow[];
};

function mapReview(r: ReviewRow): TeacherReview {
  return {
    id: r.id,
    teacher_id: r.teacher_id,
    user_id: r.user_id,
    rating: r.rating,
    comment: r.comment,
    created_at: r.created_at,
    student_name: r.profiles?.full_name ?? null,
  };
}

function mapTeacher(row: TeacherRow): Teacher {
  const reviews = (row.teacher_reviews ?? []).map(mapReview);
  return {
    id: row.id,
    name: row.name,
    avatar_url: row.avatar_url,
    is_active: row.is_active,
    sort_order: row.sort_order,
    reviews,
  };
}

export function useTeachers(opts?: { activeOnly?: boolean; includeReviews?: boolean }) {
  const activeOnly = opts?.activeOnly ?? false;
  const includeReviews = opts?.includeReviews ?? true;
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    let q = sb.from("teachers").select(
      includeReviews
        ? "*, teacher_reviews(id, teacher_id, user_id, rating, comment, created_at, profiles(full_name))"
        : "*",
    );
    if (activeOnly) q = q.eq("is_active", true);
    q = q.order("sort_order").order("name");
    const { data, error } = await q;
    if (error) {
      console.error(error);
      setTeachers([]);
    } else {
      setTeachers(((data ?? []) as TeacherRow[]).map(mapTeacher));
    }
    setLoading(false);
  }, [activeOnly, includeReviews]);

  useEffect(() => {
    load();
  }, [load]);

  return { teachers, loading, reload: load, setTeachers };
}
