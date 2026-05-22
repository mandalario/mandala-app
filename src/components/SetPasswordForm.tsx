import { useState } from "react";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { useTranslation } from "@/i18n/LanguageContext";

const passwordSchema = z
  .object({
    password: z.string().min(6).max(72),
    confirm: z.string().min(6).max(72),
  })
  .refine((data) => data.password === data.confirm, {
    message: "mismatch",
    path: ["confirm"],
  });

type SetPasswordFormProps = {
  onSuccess?: () => void;
  submitLabel?: string;
};

export function SetPasswordForm({ onSuccess, submitLabel }: SetPasswordFormProps) {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(false);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = passwordSchema.safeParse({ password, confirm });
    if (!parsed.success) {
      const issue = parsed.error.issues[0];
      if (issue.path[0] === "confirm" && issue.message === "mismatch") {
        toast.error(t("setPassword.errors.mismatch"));
      } else if (issue.path[0] === "password") {
        toast.error(t("setPassword.errors.short"));
      }
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: parsed.data.password });
      if (error) {
        const msg = error.message.toLowerCase();
        if (msg.includes("weak") || msg.includes("pwned") || msg.includes("compromised") || msg.includes("breach")) {
          toast.error(t("login.errors.weakPassword"));
        } else if (msg.includes("same") && msg.includes("password")) {
          toast.error(t("setPassword.errors.sameAsOld"));
        } else {
          toast.error(t("setPassword.errors.generic") + error.message);
        }
        return;
      }
      await supabase.auth.refreshSession();
      toast.success(t("setPassword.success"));
      setPassword("");
      setConfirm("");
      onSuccess?.();
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <Field label={t("setPassword.password")}>
        <Input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder={t("login.passwordPlaceholder")}
          className="bg-input/60 border-0 h-11 rounded-xl"
          autoComplete="new-password"
          required
        />
      </Field>
      <Field label={t("setPassword.confirm")}>
        <Input
          type="password"
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          placeholder={t("login.passwordPlaceholder")}
          className="bg-input/60 border-0 h-11 rounded-xl"
          autoComplete="new-password"
          required
        />
      </Field>
      <Button
        type="submit"
        disabled={loading}
        className="w-full h-11 rounded-xl bg-gradient-to-r from-primary to-accent text-primary-foreground font-semibold"
      >
        {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : (submitLabel ?? t("setPassword.submit"))}
      </Button>
    </form>
  );
}

const Field = ({ label, children }: { label: string; children: React.ReactNode }) => (
  <div className="space-y-1.5">
    <Label className="text-xs">{label}</Label>
    {children}
  </div>
);
