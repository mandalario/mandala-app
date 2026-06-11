import sharp from "sharp";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const assetsDir = path.join(__dirname, "..", "assets");
const src = path.join(assetsDir, "adaptive-icon.png");
const out = path.join(assetsDir, "notification-icon.png");

const { data, info } = await sharp(src)
  .resize(512, 512, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } })
  .ensureAlpha()
  .raw()
  .toBuffer({ resolveWithObject: true });

const pixels = data;
const w = info.width;
const h = info.height;
const outPixels = Buffer.alloc(w * h * 4);

for (let i = 0; i < w * h; i++) {
  const o = i * 4;
  const r = pixels[o];
  const g = pixels[o + 1];
  const b = pixels[o + 2];
  const a = pixels[o + 3];
  const brightness = (r + g + b) / 3;
  const isDarkBg = brightness < 35 && a > 0;
  const isVisible = a > 20 && !isDarkBg;
  outPixels[o] = 255;
  outPixels[o + 1] = 255;
  outPixels[o + 2] = 255;
  outPixels[o + 3] = isVisible ? Math.min(255, Math.round(a * (brightness / 255 + 0.35))) : 0;
}

await sharp(outPixels, { raw: { width: w, height: h, channels: 4 } })
  .resize(96, 96, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } })
  .png()
  .toFile(out);

const meta = await sharp(out).metadata();
console.log(`Created ${out} (${meta.width}x${meta.height})`);
