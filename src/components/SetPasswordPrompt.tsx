import { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { SetPasswordForm } from "@/components/SetPasswordForm";
import { useTranslation } from "@/i18n/LanguageContext";
import {
  setPasswordDismissKey,
  userHasOAuthLogin,
  userHasPasswordLogin,
} from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";

/** Oferece cadastro de senha após login social (ex.: Google). */
export function SetPasswordPrompt() {
  const { user, loading, isAdmin } = useAuth();
  const { t } = useTranslation();
  const location = useLocation();
  const [open, setOpen] = useState(false);
  const [passwordSet, setPasswordSet] = useState(false);

  useEffect(() => {
    if (loading || !user || isAdmin || location.pathname === "/auth") {
      setOpen(false);
      return;
    }

    if (passwordSet || userHasPasswordLogin(user)) {
      setOpen(false);
      return;
    }

    if (!userHasOAuthLogin(user)) {
      setOpen(false);
      return;
    }

    if (localStorage.getItem(setPasswordDismissKey(user.id)) === "1") {
      setOpen(false);
      return;
    }

    setOpen(true);
  }, [user, loading, isAdmin, location.pathname, passwordSet]);

  const dismiss = () => {
    if (user) localStorage.setItem(setPasswordDismissKey(user.id), "1");
    setOpen(false);
  };

  const onSuccess = async () => {
    setPasswordSet(true);
    setOpen(false);
    await supabase.auth.getUser();
  };

  return (
    <Dialog open={open} onOpenChange={(next) => !next && dismiss()}>
      <DialogContent className="sm:max-w-md rounded-3xl">
        <DialogHeader>
          <DialogTitle>{t("setPassword.promptTitle")}</DialogTitle>
          <DialogDescription>{t("setPassword.promptDescription")}</DialogDescription>
        </DialogHeader>
        {user?.email && (
          <p className="text-xs text-muted-foreground -mt-2">
            {t("setPassword.emailHint")} <span className="font-medium text-foreground">{user.email}</span>
          </p>
        )}
        <SetPasswordForm onSuccess={onSuccess} submitLabel={t("setPassword.submit")} />
        <Button type="button" variant="ghost" className="w-full" onClick={dismiss}>
          {t("setPassword.later")}
        </Button>
      </DialogContent>
    </Dialog>
  );
}
