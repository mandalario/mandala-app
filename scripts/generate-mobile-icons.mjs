/**
 * Generates Expo mobile icons from src/assets/logo-mandala.png
 * Run: node scripts/generate-mobile-icons.mjs
 */
import { mkdir, copyFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const source = join(root, "src/assets/logo-mandala.png");
const mobileAssets = join(root, "mobile/assets");

async function appIcon(size, paddingRatio = 0.08) {
  const padding = Math.round(size * paddingRatio);
  const inner = size - padding * 2;
  return sharp(source)
    .resize(inner, inner, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .extend({
      top: padding,
      bottom: padding,
      left: padding,
      right: padding,
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    })
    .png()
    .toBuffer();
}

async function notificationIcon(size = 96) {
  const { data, info } = await sharp(source)
    .resize(size, size, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  const out = Buffer.alloc(data.length);
  for (let i = 0; i < data.length; i += 4) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    const alpha = data[i + 3];
    if (alpha < 32) continue;

    const maxChannel = Math.max(r, g, b);
    if (maxChannel < 48) continue;

    const luminance = 0.299 * r + 0.587 * g + 0.114 * b;
    const outAlpha = Math.min(255, Math.round((luminance / 255) * alpha * 1.2));

    out[i] = 255;
    out[i + 1] = 255;
    out[i + 2] = 255;
    out[i + 3] = outAlpha;
  }

  return sharp(out, { raw: { width: info.width, height: info.height, channels: 4 } })
    .png()
    .toBuffer();
}

async function splashIcon(width = 512, height = 512) {
  const logoSize = Math.round(Math.min(width, height) * 0.55);
  const logo = await sharp(source)
    .resize(logoSize, logoSize, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png()
    .toBuffer();

  return sharp({
    create: {
      width,
      height,
      channels: 4,
      background: { r: 255, g: 255, b: 255, alpha: 1 },
    },
  })
    .composite([{ input: logo, gravity: "center" }])
    .png()
    .toBuffer();
}

async function main() {
  await mkdir(mobileAssets, { recursive: true });

  const icon1024 = await appIcon(1024);
  await sharp(icon1024).toFile(join(mobileAssets, "icon.png"));
  await sharp(icon1024).toFile(join(mobileAssets, "adaptive-icon.png"));
  await sharp(icon1024).resize(48, 48).toFile(join(mobileAssets, "favicon.png"));

  const splash = await splashIcon(512, 512);
  await sharp(splash).toFile(join(mobileAssets, "splash-icon.png"));

  const notif = await notificationIcon(96);
  await sharp(notif).toFile(join(mobileAssets, "notification-icon.png"));

  // Keep web/PWA favicon in sync
  await copyFile(source, join(root, "public/favicon.png"));

  console.log("Generated mobile icons in mobile/assets/");
  console.log("  - icon.png (1024x1024)");
  console.log("  - adaptive-icon.png (1024x1024)");
  console.log("  - splash-icon.png (512x512)");
  console.log("  - notification-icon.png (96x96, white silhouette)");
  console.log("  - favicon.png (48x48)");
  console.log("Synced public/favicon.png");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
