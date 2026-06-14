import { supabase } from "@/integrations/supabase/client";
import { compressImageFile, isLikelyImageFile } from "@/lib/compressImage";
import { withTimeout } from "@/lib/withTimeout";

const COMPRESS_TIMEOUT_MS = 12_000;
const UPLOAD_TIMEOUT_MS = 25_000;

async function prepareImage(file: File): Promise<File | { error: string }> {
  if (file.size <= 400 * 1024) {
    return file;
  }

  try {
    return await withTimeout(
      compressImageFile(file),
      COMPRESS_TIMEOUT_MS,
      "COMPRESS_TIMEOUT",
    );
  } catch {
    if (file.size <= 2 * 1024 * 1024) {
      return file;
    }
    return {
      error:
        "Não foi possível processar esta imagem. Use JPG ou PNG (fotos HEIC podem não funcionar no navegador).",
    };
  }
}

/** Uploads a student profile photo to the avatars bucket. */
export async function uploadStudentAvatar(
  userId: string,
  file: File,
): Promise<{ publicUrl: string } | { error: string }> {
  const maxInputBytes = 15 * 1024 * 1024;
  if (file.size > maxInputBytes) {
    return { error: "Imagem muito grande (máx. 15 MB)." };
  }
  if (!isLikelyImageFile(file)) {
    return { error: "Selecione um arquivo de imagem (JPG, PNG ou WebP)." };
  }

  const prepared = await prepareImage(file);
  if ("error" in prepared) {
    return prepared;
  }

  const path = `${userId}/avatar-${Date.now()}.jpg`;

  try {
    const { error } = await withTimeout(
      supabase.storage.from("avatars").upload(path, prepared, {
        contentType: "image/jpeg",
        cacheControl: "3600",
        upsert: false,
      }),
      UPLOAD_TIMEOUT_MS,
      "O envio demorou demais. Verifique sua conexão e tente novamente.",
    );
    if (error) {
      return { error: error.message };
    }

    const { data } = supabase.storage.from("avatars").getPublicUrl(path);
    return { publicUrl: data.publicUrl };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Erro desconhecido ao enviar a foto.";
    return { error: message };
  }
}
