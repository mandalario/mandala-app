import { supabase } from "@/integrations/supabase/client";

function extensionFromFile(file: File): string {
  const fromName = file.name.split(".").pop()?.toLowerCase();
  if (fromName && /^[a-z0-9]+$/.test(fromName)) return fromName;
  switch (file.type) {
    case "image/jpeg":
      return "jpg";
    case "image/png":
      return "png";
    case "image/webp":
      return "webp";
    case "image/gif":
      return "gif";
    default:
      return "jpg";
  }
}

function isBucketMissing(message: string) {
  const m = message.toLowerCase();
  return m.includes("bucket") && (m.includes("not found") || m.includes("does not exist"));
}

/** Uploads a teacher avatar; falls back to partners/teachers/ if bucket teachers is missing. */
export async function uploadTeacherAvatar(file: File): Promise<{ publicUrl: string } | { error: string }> {
  const maxBytes = 5 * 1024 * 1024;
  if (file.size > maxBytes) {
    return { error: "Imagem muito grande (máx. 5 MB)." };
  }
  if (!file.type.startsWith("image/")) {
    return { error: "Selecione um arquivo de imagem (JPG, PNG ou WebP)." };
  }

  const ext = extensionFromFile(file);
  const fileName = `${crypto.randomUUID()}.${ext}`;
  const opts = {
    contentType: file.type || `image/${ext}`,
    cacheControl: "3600",
    upsert: false,
  };

  const primary = await supabase.storage.from("teachers").upload(fileName, file, opts);
  if (!primary.error) {
    const { data } = supabase.storage.from("teachers").getPublicUrl(fileName);
    return { publicUrl: data.publicUrl };
  }

  if (!isBucketMissing(primary.error.message)) {
    return { error: primary.error.message };
  }

  const fallbackPath = `teachers/${fileName}`;
  const fallback = await supabase.storage.from("partners").upload(fallbackPath, file, opts);
  if (fallback.error) {
    return {
      error:
        "Não foi possível enviar a foto. Aplique a migration do Supabase (bucket teachers) ou tente novamente. " +
        fallback.error.message,
    };
  }

  const { data } = supabase.storage.from("partners").getPublicUrl(fallbackPath);
  return { publicUrl: data.publicUrl };
}
