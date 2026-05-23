import { Star } from "lucide-react";
import { cn } from "@/lib/utils";

type Props = {
  value: number;
  size?: "sm" | "md" | "lg";
  className?: string;
};

const sizes = { sm: "w-3 h-3", md: "w-4 h-4", lg: "w-5 h-5" };

export function StarRating({ value, size = "md", className }: Props) {
  return (
    <span className={cn("inline-flex items-center gap-0.5", className)}>
      {[1, 2, 3, 4, 5].map((s) => {
        const filled = value >= s - 0.25;
        const half = !filled && value > s - 1 && value < s;
        return (
          <Star
            key={s}
            className={cn(
              sizes[size],
              filled || half ? "fill-amber-400 text-amber-400" : "text-muted-foreground/30",
            )}
          />
        );
      })}
    </span>
  );
}

type InteractiveProps = {
  value: number;
  onChange: (v: number) => void;
  size?: "sm" | "md";
};

export function StarRatingInput({ value, onChange, size = "md" }: InteractiveProps) {
  const icon = size === "sm" ? "w-7 h-7" : "w-9 h-9";
  return (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map((s) => (
        <button
          key={s}
          type="button"
          onClick={() => onChange(s)}
          className="p-0.5 rounded-lg hover:bg-secondary/50 transition-colors"
        >
          <Star
            className={cn(
              icon,
              s <= value ? "fill-amber-400 text-amber-400" : "text-muted-foreground/30",
            )}
          />
        </button>
      ))}
    </div>
  );
}
