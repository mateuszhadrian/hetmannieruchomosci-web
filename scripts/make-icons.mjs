// Generator zasobów marki: komplet ikon + domyślny og-image.
//
// STAN Etapu 0 — WERSJA TYMCZASOWA na źródłach RASTROWYCH. Znak i logo
// istnieją dziś tylko jako PNG; wektor znaku (odrys + weryfikacja
// pixel-diffem), `public/favicon.svg` jako generat i ewentualne
// pogrubienie najmniejszych rozmiarów wchodzą w Etapie 6. Do tego czasu
// BaseLayout nie linkuje favicon.svg.
//
// Użycie   : node scripts/make-icons.mjs
//
// Wejście  : src/assets/logo/source/znak-hetman.png (sam znak, z alfą)
//            + src/assets/logo/source/logo-color.png (pełne logo).
// Wyjście  : public/{favicon.ico, apple-touch-icon.png, icon-192.png,
//            icon-512.png, og-image.png}
//
// Dlaczego skrypt, a nie ciąg ręcznych komend: „dorób ikonę 256" za pół roku
// ma być jednym poleceniem, a nie odtwarzaniem parametrów z pamięci.
// Uwaga: to NIE jest to samo co scripts/optimize-images.mjs (obrazy z eksportu
// designu → WebP do src/assets/).
import sharp from "sharp";
import { existsSync, writeFileSync, statSync } from "node:fs";

const OUT = "public";
/** Sam znak — JEDYNE źródło rysunku ikon. */
const MARK = "src/assets/logo/source/znak-hetman.png";
/** Pełne logo (napis niesie nazwę firmy) — na og-image. */
const LOGO = "src/assets/logo/source/logo-color.png";

// Ikony: sam znak na BIAŁYM kwadracie. Bez alfy — iOS podkłada czerń pod
// przezroczystość na ekranie startowym.
const WHITE = { r: 255, g: 255, b: 255, alpha: 1 };

// og-image: pełne logo na tle strony — token `--bg` w src/styles/global.css
// (#f3f2ef). Logo jest SZEROKIE (ok. 4,3:1), więc kadr 1200×630 wypełnia
// szerokością.
const PAGE_BG = { r: 243, g: 242, b: 239, alpha: 1 };
const OG = { w: 1200, h: 630, logoW: 840 };

// Kadrowanie ikon: margines wokół znaku, liczony od krawędzi kwadratu.
// 8 % = znak zajmuje do 84 % krawędzi kadru.
const ICON_PAD = 0.08;

const kb = (p) => `${(statSync(p).size / 1024).toFixed(1)} kB`;

/** Znak przycięty do bboxu rysunku. Liczony RAZ — każdy rozmiar ikony
 *  skaluje się z tego samego rastra. */
let markCache;
const mark = async () =>
  (markCache ??= await sharp(MARK).trim({ threshold: 10 }).png().toBuffer());

/** PNG ikony: znak wyśrodkowany na BIAŁYM kwadracie, bez alfy. */
async function png(size) {
  const inner = Math.round(size * (1 - 2 * ICON_PAD));
  const scaled = await sharp(await mark())
    .resize({ width: inner, height: inner, fit: "inside" })
    .png()
    .toBuffer();
  const { width, height } = await sharp(scaled).metadata();
  return sharp({
    create: { width: size, height: size, channels: 4, background: WHITE },
  })
    .composite([
      {
        input: scaled,
        left: Math.round((size - width) / 2),
        top: Math.round((size - height) / 2),
      },
    ])
    .flatten({ background: WHITE })
    .png({ compressionLevel: 9 })
    .toBuffer();
}

/** Kontener ICO z payloadem PNG (obsługiwany przez wszystkie żywe przeglądarki). */
function ico(images) {
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0); // reserved
  header.writeUInt16LE(1, 2); // typ: ikona
  header.writeUInt16LE(images.length, 4);
  const dir = Buffer.alloc(16 * images.length);
  let offset = header.length + dir.length;
  images.forEach(({ size, data }, i) => {
    const at = i * 16;
    dir[at] = size >= 256 ? 0 : size; // 0 = 256 px
    dir[at + 1] = size >= 256 ? 0 : size;
    dir[at + 2] = 0; // paleta
    dir[at + 3] = 0; // reserved
    dir.writeUInt16LE(1, at + 4); // płaszczyzny
    dir.writeUInt16LE(32, at + 6); // bitów na piksel
    dir.writeUInt32LE(data.length, at + 8);
    dir.writeUInt32LE(offset, at + 12);
    offset += data.length;
  });
  return Buffer.concat([header, dir, ...images.map((i) => i.data)]);
}

async function main() {
  for (const source of [MARK, LOGO]) {
    if (!existsSync(source)) throw new Error(`brak źródła: ${source}`);
  }

  for (const [name, size] of [
    ["apple-touch-icon.png", 180],
    ["icon-192.png", 192],
    ["icon-512.png", 512],
  ]) {
    writeFileSync(`${OUT}/${name}`, await png(size));
    console.log(`${name.padEnd(21)} ${size}×${size}  ${kb(`${OUT}/${name}`)}`);
  }

  const sizes = [16, 32, 48];
  writeFileSync(
    `${OUT}/favicon.ico`,
    ico(
      await Promise.all(
        sizes.map(async (size) => ({ size, data: await png(size) })),
      ),
    ),
  );
  console.log(
    `favicon.ico           ${sizes.join("+")}  ${kb(`${OUT}/favicon.ico`)}`,
  );

  const logoBuf = await sharp(LOGO)
    .resize({ width: OG.logoW, height: OG.h - 80, fit: "inside" })
    .toBuffer();
  const { width: logoRealW, height: logoH } = await sharp(logoBuf).metadata();
  writeFileSync(
    `${OUT}/og-image.png`,
    await sharp({
      create: { width: OG.w, height: OG.h, channels: 3, background: PAGE_BG },
    })
      .composite([
        {
          input: logoBuf,
          left: Math.round((OG.w - logoRealW) / 2),
          top: Math.round((OG.h - logoH) / 2),
        },
      ])
      .png({ compressionLevel: 9, palette: true, colors: 128 })
      .toBuffer(),
  );
  console.log(
    `og-image.png          ${OG.w}×${OG.h}  ${kb(`${OUT}/og-image.png`)}`,
  );
}

await main();
