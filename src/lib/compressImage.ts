const IMAGE_EXT = /\.(jpe?g|png|webp|gif|bmp)$/i;

export function isLikelyImageFile(file: File): boolean {
  if (file.type.startsWith("image/")) return true;
  return IMAGE_EXT.test(file.name);
}

function fitWithin(width: number, height: number, maxDimension: number) {
  if (width <= maxDimension && height <= maxDimension) {
    return { width, height };
  }
  const scale = maxDimension / Math.max(width, height);
  return {
    width: Math.round(width * scale),
    height: Math.round(height * scale),
  };
}

async function loadImage(file: File): Promise<ImageBitmap> {
  try {
    return await createImageBitmap(file);
  } catch {
    return new Promise((resolve, reject) => {
      const url = URL.createObjectURL(file);
      const img = new Image();
      img.onload = async () => {
        try {
          const bitmap = await createImageBitmap(img);
          URL.revokeObjectURL(url);
          resolve(bitmap);
        } catch (err) {
          URL.revokeObjectURL(url);
          reject(err);
        }
      };
      img.onerror = () => {
        URL.revokeObjectURL(url);
        reject(new Error("UNSUPPORTED_IMAGE"));
      };
      img.src = url;
    });
  }
}

export type CompressImageOptions = {
  maxDimension?: number;
  quality?: number;
  skipBelowBytes?: number;
};

/** Resizes and compresses images for faster uploads (e.g. avatars). */
export async function compressImageFile(
  file: File,
  options: CompressImageOptions = {},
): Promise<File> {
  const maxDimension = options.maxDimension ?? 800;
  const quality = options.quality ?? 0.85;
  const skipBelowBytes = options.skipBelowBytes ?? 250 * 1024;

  if (!isLikelyImageFile(file)) {
    throw new Error("UNSUPPORTED_IMAGE");
  }

  if (file.size <= skipBelowBytes && file.type === "image/jpeg") {
    return file;
  }

  const bitmap = await loadImage(file);
  const { width, height } = fitWithin(bitmap.width, bitmap.height, maxDimension);

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    bitmap.close();
    throw new Error("CANVAS_UNAVAILABLE");
  }
  ctx.drawImage(bitmap, 0, 0, width, height);
  bitmap.close();

  const blob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (b) => (b ? resolve(b) : reject(new Error("COMPRESS_FAILED"))),
      "image/jpeg",
      quality,
    );
  });

  const baseName = file.name.replace(/\.[^.]+$/, "") || "avatar";
  return new File([blob], `${baseName}.jpg`, {
    type: "image/jpeg",
    lastModified: Date.now(),
  });
}
