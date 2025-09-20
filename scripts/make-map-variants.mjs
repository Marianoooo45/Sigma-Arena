#!/usr/bin/env node
import fs from "fs";
import path from "path";
import sharp from "sharp";

// Usage: node scripts/make-map-variants.mjs public/images/map.png [--allowUpscale]
const src = process.argv[2] || "public/images/map.png";
const allowUpscale = process.argv.includes("--allowUpscale");

const targets = [
  { w: 2048, out: "map@1x.webp" },
  { w: 3072, out: "map@2x.webp" },
  { w: 4096, out: "map@4x.webp" }, // passe à 6144 si tu as besoin d’ultra 5K
];

async function upscaleProgressive(input, targetW) {
  // Upscale par paliers x2 pour limiter les artefacts
  let img = sharp(input);
  const meta = await img.metadata();
  let curW = meta.width || 0;

  if (!curW) throw new Error("Largeur source inconnue");

  while (curW < targetW) {
    const nextW = Math.min(curW * 2, targetW);
    const buf = await img
      .resize({ width: nextW, kernel: sharp.kernel.lanczos3, withoutEnlargement: false })
      .sharpen(0.5)                  // coup de netteté léger
      .modulate({ saturation: 1.02 }) // micro boost pour compenser le lissage
      .toBuffer();
    img = sharp(buf);
    curW = nextW;
  }
  return img;
}

async function run() {
  if (!fs.existsSync(src)) {
    console.error("❌ Source introuvable:", src);
    process.exit(1);
  }

  const dir = path.dirname(src);
  const baseMeta = await sharp(src).metadata();
  const baseW = baseMeta.width || 0;

  console.log(`🔎 Source: ${src} — ${baseW}×${baseMeta.height} • allowUpscale=${allowUpscale}`);

  for (const t of targets) {
    const out = path.join(dir, t.out);

    if (!allowUpscale && baseW && t.w > baseW) {
      console.log(`↪️  Skip ${t.out} (target ${t.w} > source ${baseW})`);
      continue;
    }

    let pipeline;
    if (t.w > baseW) {
      // upscale progressif
      pipeline = await upscaleProgressive(src, t.w);
    } else {
      // simple resize vers le bas ou égal
      pipeline = sharp(src).resize({ width: t.w, withoutEnlargement: !allowUpscale, kernel: sharp.kernel.lanczos3 });
    }

    await pipeline
      .webp({ quality: 88, alphaQuality: 90, effort: 6 })
      .toFile(out);

    console.log(`✅ ${out}`);
  }
}

run().catch((e) => { console.error(e); process.exit(1); });
