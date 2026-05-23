import { GraduationCap } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Teacher } from "@/lib/teacherRatings";

const PALETTE = [
  "bg-primary",
  "bg-emerald-600",
  "bg-amber-600",
  "bg-violet-600",
  "bg-rose-600",
];

function initials(name: string) {
  return name
    .split(" ")
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase();
}

function colorIndex(id: string) {
  let n = 0;
  for (let i = 0; i < id.length; i++) n += id.charCodeAt(i);
  return n % PALETTE.length;
}

type Props = {
  teacher: Pick<Teacher, "id" | "name" | "avatar_url">;
  size?: "sm" | "md" | "lg";
  className?: string;
};

const dim = { sm: "w-11 h-11 text-xs", md: "w-12 h-12 text-sm", lg: "w-20 h-20 text-xl" };

export function TeacherAvatar({ teacher, size = "md", className }: Props) {
  if (teacher.avatar_url) {
    return (
      <img
        src={teacher.avatar_url}
        alt=""
        className={cn("rounded-full object-cover shrink-0", dim[size], className)}
      />
    );
  }
  const ini = initials(teacher.name);
  if (!ini) {
    return (
      <div
        className={cn(
          "rounded-full bg-secondary/60 flex items-center justify-center shrink-0",
          dim[size],
          className,
        )}
      >
        <GraduationCap className="w-1/2 h-1/2 opacity-50" />
      </div>
    );
  }
  return (
    <div
      className={cn(
        "rounded-full flex items-center justify-center font-bold text-primary-foreground shrink-0",
        PALETTE[colorIndex(teacher.id)],
        dim[size],
        className,
      )}
    >
      {ini}
    </div>
  );
}
