import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import type { Language } from "./LanguageContext";
import pt from "./locales/pt.json";
import en from "./locales/en.json";
import es from "./locales/es.json";

const FLAGS: Record<Language, string> = { pt: "🇧🇷", en: "🇺🇸", es: "🇪🇸" };
const NAMES: Record<Language, string> = { pt: "Português", en: "English", es: "Español" };
const dicts: Record<Language, any> = { pt, en, es };

function tr(lang: Language, key: string, fallback: string) {
  const parts = key.split(".");
  let cur: any = dicts[lang];
  for (const p of parts) cur = cur?.[p];
  return typeof cur === "string" ? cur : fallback;
}

export function LanguagePickerDialog({
  suggested,
  onConfirm,
}: {
  suggested: Language;
  onConfirm: (lang: Language) => void;
}) {
  const [selected, setSelected] = useState<Language>(suggested);

  return (
    <Dialog open>
      <DialogContent
        className="sm:max-w-md"
        onPointerDownOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle>{tr(selected, "languagePicker.title", "Choose your language")}</DialogTitle>
          <DialogDescription>
            {tr(selected, "languagePicker.subtitle", "You can change this anytime in the app.")}
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-2 py-2">
          {(["pt", "en", "es"] as Language[]).map((lang) => (
            <button
              key={lang}
              type="button"
              onClick={() => setSelected(lang)}
              className={`flex items-center gap-3 rounded-xl border px-4 py-3 text-left transition-colors ${
                selected === lang
                  ? "border-primary bg-primary/10"
                  : "border-border hover:bg-secondary/40"
              }`}
            >
              <span className="text-2xl leading-none">{FLAGS[lang]}</span>
              <span className="font-medium">{NAMES[lang]}</span>
            </button>
          ))}
        </div>
        <Button onClick={() => onConfirm(selected)} className="w-full">
          {tr(selected, "languagePicker.confirm", "Continue")}
        </Button>
      </DialogContent>
    </Dialog>
  );
}
