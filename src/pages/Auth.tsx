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

          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t border-border/50" />
            </div>
            <div className="relative flex justify-center text-xs">
              <span className="bg-background/0 px-2 text-muted-foreground">ou</span>
            </div>
          </div>

          <div className="space-y-2.5">
            <Button
              type="button"
              variant="outline"
              disabled={loading}
              onClick={async () => {
                setLoading(true);
                try {
                  const redirectTo = getOAuthRedirectUrl();
                  const inNativeApp = isReactNativeWebView();
                  const { data, error } = await supabase.auth.signInWithOAuth({
                    provider: "google",
                    options: {
                      redirectTo,
                      skipBrowserRedirect: inNativeApp,
                      queryParams: { prompt: "select_account" },
                    },
                  });
                  if (error) {
                    toast.error(t("login.googleError") + error.message);
                    return;
                  }
                  if (inNativeApp && data?.url) {
                    const bridge = (window as Window & { ReactNativeWebView?: { postMessage: (msg: string) => void } })
                      .ReactNativeWebView;
                    bridge?.postMessage(
                      JSON.stringify({ type: "OAUTH_URL", url: data.url, redirectTo }),
                    );
                  }
                } catch (e: unknown) {
                  toast.error(t("login.googleError") + getErrorMessage(e));
                } finally {
                  setLoading(false);
                }
              }}
              className="w-full h-12 rounded-xl font-medium"
            >
              <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
              {t("login.google")}
            </Button>

            <Button
              type="button"
              variant="outline"
              disabled={loading}
              onClick={async () => {
                setLoading(true);
                try {
                  const redirectTo = getOAuthRedirectUrl();
                  const inNativeApp = isReactNativeWebView();
                  const { data, error } = await supabase.auth.signInWithOAuth({
                    provider: "apple",
                    options: {
                      redirectTo,
                      skipBrowserRedirect: inNativeApp,
                    },
                  });
                  if (error) {
                    toast.error(t("login.appleError") + error.message);
                    return;
                  }
                  if (inNativeApp && data?.url) {
                    const bridge = (window as Window & { ReactNativeWebView?: { postMessage: (msg: string) => void } })
                      .ReactNativeWebView;
                    bridge?.postMessage(
                      JSON.stringify({ type: "OAUTH_URL", url: data.url, redirectTo }),
                    );
                  }
                } catch (e: unknown) {
                  toast.error(t("login.appleError") + getErrorMessage(e));
                } finally {
                  setLoading(false);
                }
              }}
              className="w-full h-12 rounded-xl font-medium bg-black text-white hover:bg-zinc-800 hover:text-white dark:bg-white dark:text-black dark:hover:bg-zinc-200 border-0"
            >
              <svg className="w-5 h-5 mr-2 fill-current" viewBox="0 0 170 170">
                <path d="M150.37 130.25c-2.45 5.66-5.35 10.87-8.71 15.66-4.58 6.53-8.33 11.05-11.22 13.56-4.48 4.12-9.28 6.23-14.42 6.35-3.69 0-8.14-1.05-13.32-3.18-5.19-2.12-9.97-3.17-14.34-3.17-4.58 0-9.49 1.05-14.75 3.17-5.26 2.13-9.5 3.24-12.74 3.35-4.84.13-9.64-1.9-14.41-6.1-3.23-2.76-7.17-7.46-11.83-14.1-6.19-8.81-11.02-18.73-14.49-29.74-3.47-11.01-5.21-21.75-5.21-32.22 0-14.54 3.75-26.49 11.24-35.84 7.49-9.35 17.07-14.12 28.74-14.3 4.48 0 9.42 1.13 14.83 3.39 5.41 2.26 9.35 3.39 11.82 3.39 2.19 0 6.07-1.11 11.64-3.32 5.57-2.21 10.37-3.32 14.41-3.32 10.1 0 18.74 3.23 25.93 9.69 7.19 6.46 11.83 14.7 13.92 24.72-9.01 5.46-13.43 12.92-13.26 22.38.17 7.44 2.81 13.88 7.91 19.32 5.1 5.44 11.45 8.79 19.05 10.05-2.04 6.13-4.54 12.06-7.51 17.79zM119.22 31.84c0-6.93 2.51-13.56 7.53-19.89 5.02-6.33 11.39-10.29 19.11-11.88.35 2.13.53 4.14.53 6.03 0 7.02-2.52 13.78-7.57 20.28-5.05 6.5-11.45 10.45-19.2 11.85-.26-1.89-.4-3.7-.4-5.43z"/>
              </svg>
              {t("login.apple")}
            </Button>
          </div>

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
