import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";

import { useAuth } from "@/hooks/useAuth";
import { OceanBackground } from "@/components/OceanBackground";
import { Brand } from "@/components/Brand";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import logoMandala from "@/assets/logo-mandala.png";
import { useTranslation } from "@/i18n/LanguageContext";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { createRealEmailField, stripInvalidEmailInput } from "@/lib/email";
import { getOAuthRedirectUrl, isReactNativeWebView } from "@/lib/nativeApp";

const AUTH_FIELD_KEYS: Record<string, string> = {
  full_name: "login.fullName",
  email: "login.email",
  password: "login.password",
};

function formatAuthValidationError(
  error: z.ZodError,
  t: (key: string, vars?: Record<string, string | number>) => string,
): string {
  const issue = error.issues[0];
  if (!issue) return t("validation.formCheck");
  const field = String(issue.path[0] ?? "");
  const fieldLabel = AUTH_FIELD_KEYS[field] ? t(AUTH_FIELD_KEYS[field]) : field;
  return t("validation.fieldError", { field: fieldLabel, message: issue.message });
}

function createSignupSchema(t: (key: string, vars?: Record<string, string | number>) => string) {
  return z.object({
    full_name: z.string().trim().min(2, t("validation.authShortName")).max(100),
    email: createRealEmailField(t),
    password: z.string().min(6, t("validation.authMinPassword")).max(72),
  });
}

function createLoginSchema(t: (key: string, vars?: Record<string, string | number>) => string) {
  return z.object({
    email: createRealEmailField(t),
    password: z.string().min(1, t("validation.authPasswordRequired")),
  });
}

const getErrorMessage = (error: unknown) => (error instanceof Error ? error.message : String(error));

export default function Auth() {
  const navigate = useNavigate();
  const { user, isGuest, loading: authLoading } = useAuth();
  const { t } = useTranslation();
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [loading, setLoading] = useState(false);
  const [sendingReset, setSendingReset] = useState(false);
  const [form, setForm] = useState({ full_name: "", email: "", password: "" });

  useEffect(() => {
    if (!authLoading && user && !isGuest) navigate("/", { replace: true });
  }, [user, isGuest, authLoading, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (mode === "signup") {
        const parsed = createSignupSchema(t).safeParse(form);
        if (!parsed.success) {
          toast.error(formatAuthValidationError(parsed.error, t));
          return;
        }
        const { error } = await supabase.auth.signUp({
          email: parsed.data.email,
          password: parsed.data.password,
          options: {
            emailRedirectTo: `${window.location.origin}/`,
            data: { full_name: parsed.data.full_name },
          },
        });
        if (error) {
          const msg = error.message.toLowerCase();
          if (msg.includes("already registered") || msg.includes("already been registered") || msg.includes("user already")) {
            toast.error(t("login.errors.alreadyRegistered"));
          } else if (msg.includes("weak") || msg.includes("pwned") || msg.includes("compromised") || msg.includes("breach")) {
            toast.error(t("login.errors.weakPassword"));
          } else if (msg.includes("password") && msg.includes("short")) {
            toast.error(t("login.errors.shortPassword"));
          } else if (msg.includes("invalid email")) {
            toast.error(t("login.errors.invalidEmail"));
          } else if (msg.includes("rate limit")) {
            toast.error(t("login.errors.rateLimit"));
          } else {
            toast.error(t("login.errors.signupGeneric") + error.message);
          }
          return;
        }
        toast.success(t("login.success.signup"));
      } else {
        const parsed = createLoginSchema(t).safeParse(form);
        if (!parsed.success) {
          toast.error(formatAuthValidationError(parsed.error, t));
          return;
        }
        const { error } = await supabase.auth.signInWithPassword({
          email: parsed.data.email,
          password: parsed.data.password,
        });
        if (error) {
          toast.error(t("login.errors.invalidCredentials"));
          return;
        }
      }
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async () => {
    const parsed = createRealEmailField(t).safeParse(form.email);
    if (!parsed.success) {
      toast.error(t("login.forgot.invalidEmail"));
      return;
    }

    setSendingReset(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(parsed.data, {
        redirectTo: `${window.location.origin}/auth`,
      });
      if (error) {
        toast.error(t("login.forgot.error") + error.message);
        return;
      }
      toast.success(t("login.forgot.success"));
    } finally {
      setSendingReset(false);
    }
  };

  return (
    <div className="relative min-h-screen flex items-center justify-center px-4 py-12">
      <OceanBackground />

      <div className="absolute top-4 right-4 z-10">
        <LanguageSwitcher />
      </div>

      <div className="w-full max-w-md">
        {/* Brand */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-3xl glow-primary mb-4 animate-float p-2 shadow-elevated bg-white">
            <img src={logoMandala} alt="Mandala Rio Surf School" className="w-full h-full object-contain" />
          </div>
          <Brand size="lg" />
          <p className="text-muted-foreground mt-3 text-sm">{t("login.subtitle")}</p>
        </div>

        {/* Card */}
        <div className="glass-strong rounded-3xl p-8 shadow-elevated">
          {/* Mode toggle */}
          <div className="flex gap-1 p-1 rounded-2xl bg-secondary/40 mb-6">
            <button
              type="button"
              onClick={() => setMode("login")}
              className={`flex-1 py-2.5 rounded-xl text-sm font-medium transition-all ${
                mode === "login"
                  ? "bg-primary text-primary-foreground shadow-soft"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {t("login.tabLogin")}
            </button>
            <button
              type="button"
              onClick={() => setMode("signup")}
              className={`flex-1 py-2.5 rounded-xl text-sm font-medium transition-all ${
                mode === "signup"
                  ? "bg-primary text-primary-foreground shadow-soft"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {t("login.tabSignup")}
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {mode === "signup" && (
              <div className="space-y-2">
                <Label htmlFor="full_name">{t("login.fullName")}</Label>
                <Input
                  id="full_name"
                  value={form.full_name}
                  onChange={(e) => setForm({ ...form, full_name: e.target.value })}
                  placeholder={t("login.fullNamePlaceholder")}
                  className="bg-input/60 border-0 h-12 rounded-xl"
                  required
                />
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="email">{t("login.email")}</Label>
              <Input
                id="email"
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: stripInvalidEmailInput(e.target.value) })}
                placeholder={t("login.emailPlaceholder")}
                className="bg-input/60 border-0 h-12 rounded-xl"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">{t("login.password")}</Label>
              <Input
                id="password"
                type="password"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                placeholder={t("login.passwordPlaceholder")}
                className="bg-input/60 border-0 h-12 rounded-xl"
                required
              />
            </div>
            {mode === "login" && (
              <button
                type="button"
                onClick={handleForgotPassword}
                disabled={loading || sendingReset}
                className="text-xs text-primary hover:underline disabled:opacity-60"
              >
                {sendingReset ? t("login.forgot.sending") : t("login.forgot.link")}
              </button>
            )}

            <Button
              type="submit"
              disabled={loading}
              className="w-full h-12 rounded-xl bg-gradient-to-r from-primary to-accent text-primary-foreground font-semibold shadow-soft hover:opacity-95 transition-opacity"
            >
              {loading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : mode === "login" ? (
                t("login.button")
              ) : (
                t("login.buttonSignup")
              )}
            </Button>
          </form>


          <p className="text-xs text-muted-foreground text-center mt-6">
            {mode === "signup" ? t("login.footerSignup") : t("login.footerLogin")}
          </p>

          <div className="text-center text-xs text-muted-foreground mt-4 space-x-2">
            <Link to="/support" className="hover:text-foreground underline-offset-2 hover:underline">{t("support.title")}</Link>
            <span>·</span>
            <Link to="/terms" className="hover:text-foreground underline-offset-2 hover:underline">Termos de Uso</Link>
            <span>·</span>
            <Link to="/privacy" className="hover:text-foreground underline-offset-2 hover:underline">Política de Privacidade</Link>
          </div>

        </div>
      </div>
    </div>
  );
}
