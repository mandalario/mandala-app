/** URL do APK Android (coloque o arquivo em public/ ou use URL externa). */
export const APK_DOWNLOAD_URL =
  import.meta.env.VITE_APK_DOWNLOAD_URL ?? "/mandalario.apk";

export function isAndroidDevice(): boolean {
  if (typeof navigator === "undefined") return false;
  return /android/i.test(navigator.userAgent);
}
