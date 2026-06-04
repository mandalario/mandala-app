import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { OceanBackground } from "@/components/OceanBackground";
import { SetPasswordForm } from "@/components/SetPasswordForm";
import { Button } from "@/components/ui/button";
import { useTranslation } from "@/i18n/LanguageContext";
import { useAuth } from "@/hooks/useAuth";
import {
  dismissSetPasswordPrompt,
  userHasOAuthLogin,
  userHasPasswordLogin,
  userSkippedSetPassword,
} from "@/lib/auth";

export default function ForceSetPassword() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { user, loading, signOut } = useAuth();

  useEffect(() => {
    if (loading || !user) return;
    if (
      !userHasOAuthLogin(user) ||
      userHasPasswordLogin(user) ||
      userSkippedSetPassword(user)
    ) {
      navigate("/", { replace: true });
    }
  }, [loading, user, navigate]);

  const skipForNow = () => {
    if (user) dismissSetPasswordPrompt(user.id);
    navigate("/", { replace: true });
  };

  if (loading || !user) {
    return (
      <div className="relative min-h-screen flex items-center justify-center">
        <OceanBackground />
        <Loader2 className="w-6 h-6 animate-spin" />
      </div>
    );
  }

  return (
    <div className="relative min-h-screen flex items-center justify-center px-4 py-12">
      <OceanBackground />
      <div className="w-full max-w-md glass-strong rounded-3xl p-6 md:p-8 space-y-4">
        <h1 className="text-2xl font-bold">{t("setPassword.promptTitle")}</h1>
        <p className="text-sm text-muted-foreground">{t("setPassword.promptDescription")}</p>
        {user.email && (
          <p className="text-xs text-muted-foreground">
            {t("setPassword.emailHint")} <span className="font-medium text-foreground">{user.email}</span>
          </p>
        )}
        <SetPasswordForm
          submitLabel={t("setPassword.submit")}
          onSuccess={() => navigate("/", { replace: true })}
        />
        <Button type="button" variant="ghost" className="w-full" onClick={skipForNow}>
          {t("setPassword.later")}
        </Button>
        <Button type="button" variant="ghost" className="w-full" onClick={signOut}>
          {t("common.signOut")}
        </Button>
      </div>
    </div>
  );
}
