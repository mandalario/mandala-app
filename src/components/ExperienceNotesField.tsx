import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import { useTranslation } from "@/i18n/LanguageContext";
import { cn } from "@/lib/utils";

const OPTION_KEYS = [
  "neverSurfed",
  "beginner",
  "alreadySurfed",
  "fewTimes",
  "stoodUp",
  "bodyboard",
  "otherBoardSports",
] as const;

type Props = {
  value: string;
  onChange: (value: string) => void;
  rows?: number;
  className?: string;
};

function toggleInNotes(current: string, phrase: string): string {
  const parts = current
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  const idx = parts.findIndex((p) => p === phrase);
  if (idx >= 0) {
    parts.splice(idx, 1);
    return parts.join(", ");
  }
  return parts.length ? `${current}, ${phrase}` : phrase;
}

function isSelected(notes: string, phrase: string): boolean {
  return notes
    .split(",")
    .map((s) => s.trim())
    .includes(phrase);
}

export function ExperienceNotesField({ value, onChange, rows = 3, className }: Props) {
  const { t } = useTranslation();
  const [optionsOpen, setOptionsOpen] = useState(false);

  const options = OPTION_KEYS.map((key) => ({
    key,
    label: t(`profile.experienceOptions.${key}`),
  }));

  return (
    <div className="space-y-2">
      <Textarea
        rows={rows}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={t("profile.experienceOptions.placeholder")}
        className={className}
      />
      <button
        type="button"
        onClick={() => setOptionsOpen((o) => !o)}
        aria-expanded={optionsOpen}
        aria-label={optionsOpen ? t("profile.experienceOptions.toggleHide") : t("profile.experienceOptions.toggleShow")}
        className="flex items-center gap-2 text-xs text-muted-foreground hover:text-primary transition-colors"
      >
        <span
          className={cn(
            "w-7 h-7 rounded-full glass flex items-center justify-center shrink-0 transition-transform",
            optionsOpen && "rotate-180"
          )}
        >
          <ChevronDown className="w-4 h-4" />
        </span>
        <span>{optionsOpen ? t("profile.experienceOptions.toggleHide") : t("profile.experienceOptions.toggleShow")}</span>
      </button>
      {optionsOpen && (
        <div className="space-y-2 animate-in fade-in slide-in-from-top-1 duration-200">
          <p className="text-[11px] text-muted-foreground">{t("profile.experienceOptions.hint")}</p>
          <ul className="flex flex-col gap-2" role="listbox" aria-multiselectable="true">
            {options.map(({ key, label }) => {
              const active = isSelected(value, label);
              return (
                <li key={key} role="option" aria-selected={active}>
                  <button
                    type="button"
                    onClick={() => onChange(toggleInNotes(value, label))}
                    className={cn(
                      "w-full h-10 px-3 rounded-xl border text-sm text-left transition-colors",
                      active
                        ? "border-primary/50 bg-primary/15 text-primary font-medium"
                        : "border-input bg-background/80 text-foreground hover:border-primary/30"
                    )}
                  >
                    {label}
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}
