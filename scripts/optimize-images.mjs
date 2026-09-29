// Optymalizacja obrazów statycznych sekcji (Etap 4 — hero, zajawki itd.):
// ciężkie PNG z eksportów designów (docs/design/export/assets — POZA repo) →
// WebP w docelowych rozmiarach do src/assets/ (decyzja D6; wzorzec sharp
// z szablonu źródłowego). Obrazy REALIZACJI nie idą do repo — od początku
// R2 + imgAt() (Etap 2).
//
// Użycie:
//   node scripts/optimize-images.mjs <src.png> <out.webp> [szerokość] [jakość]
//   node scripts/optimize-images.mjs <src.png> <out.webp> 1600 82
//
// Osobne warianty desktop/mobile tam, gdzie mobile wymaga odciążenia:
// wywołaj dwa razy z różnymi szerokościami (np. hero-desktop.webp 1920,
// hero-mobile.webp 828).
import { existsSync } from "node:fs";
import { mkdir } from "node:fs/promises";
import { dirname } from "node:path";
import sharp from "sharp";

const [src, out, widthArg, qualityArg] = process.argv.slice(2);

if (!src || !out) {
  console.error(
    "Użycie: node scripts/optimize-images.mjs <src> <out.webp> [szerokość] [jakość=82]",
  );
  process.exit(1);
}
if (!existsSync(src)) {
  console.error(`Brak pliku wejściowego: ${src}`);
  process.exit(1);
}

const width = widthArg ? Number(widthArg) : undefined;
const quality = qualityArg ? Number(qualityArg) : 82;

await mkdir(dirname(out), { recursive: true });

const pipeline = sharp(src);
if (width) pipeline.resize({ width, withoutEnlargement: true });
const info = await pipeline.webp({ quality }).toFile(out);

console.log(
  `${src} → ${out} (${info.width}×${info.height}, ${(info.size / 1024).toFixed(0)} KB, q=${quality})`,
);
