import { supabase } from "@/integrations/supabase/client";
import { compressImageFile, isLikelyImageFile } from "@/lib/compressImage";
import { withTimeout } from "@/lib/withTimeout";

const COMPRESS_TIMEOUT_MS = 12_000;
const UPLOAD_TIMEOUT_MS = 25_000;

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

async function uploadToBucket(bucket: "teachers" | "partners", path: string, file: File) {
  const ext = extensionFromFile(file);
  return withTimeout(
    supabase.storage.from(bucket).upload(path, file, {
      contentType: file.type || `image/${ext}`,
      cacheControl: "3600",
      upsert: true,
    }),
    UPLOAD_TIMEOUT_MS,
    "O envio demorou demais. Verifique sua conexão e tente novamente.",
  );
}

/** Uploads a teacher avatar to storage (partners bucket, same as other admin uploads). */
export async function uploadTeacherAvatar(file: File): Promise<{ publicUrl: string } | { error: string }> {
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

  const fileName = `${crypto.randomUUID()}.jpg`;
  const partnersPath = `teachers/${fileName}`;

  try {
    const primary = await uploadToBucket("partners", partnersPath, prepared);
    if (!primary.error) {
      const { data } = supabase.storage.from("partners").getPublicUrl(partnersPath);
      return { publicUrl: data.publicUrl };
    }

    const fallback = await uploadToBucket("teachers", fileName, prepared);
    if (fallback.error) {
      return {
        error:
          "Não foi possível enviar a foto. Verifique se você está logado como admin e tente novamente. " +
          fallback.error.message,
      };
    }

    const { data } = supabase.storage.from("teachers").getPublicUrl(fileName);
    return { publicUrl: data.publicUrl };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Erro desconhecido ao enviar a foto.";
    return { error: message };
  }
}
