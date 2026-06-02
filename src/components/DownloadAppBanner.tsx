import { Download, Smartphone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTranslation } from "@/i18n/LanguageContext";
import { APK_DOWNLOAD_URL, isAndroidDevice } from "@/lib/appDownload";

export function DownloadAppBanner() {
  const { t } = useTranslation();
  const onAndroid = isAndroidDevice();

  return (
    <div className="w-full max-w-md mx-auto mb-6 animate-in fade-in slide-in-from-top-2 duration-500">
      <div className="glass-strong rounded-2xl p-4 shadow-soft border border-primary/20 flex items-center gap-3">
        <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center shrink-0">
          <Smartphone className="w-5 h-5 text-primary" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-foreground leading-tight">
            {t("appDownload.title")}
          </p>
          <p className="text-xs text-muted-foreground mt-0.5 leading-snug">
            {onAndroid ? t("appDownload.subtitleAndroid") : t("appDownload.subtitle")}
          </p>
        </div>
        <Button
          asChild
          size="sm"
          className="shrink-0 rounded-xl bg-gradient-to-r from-primary to-accent text-primary-foreground font-medium shadow-soft hover:opacity-95"
        >
          <a href={APK_DOWNLOAD_URL} download="mandalario.apk">
            <Download className="w-4 h-4 mr-1.5" />
            {t("appDownload.button")}
          </a>
        </Button>
      </div>
    </div>
  );
}
