// Subsety polskie fontów.
//
// Subsety `latin-ext` Fontsource'a niosą ok. 800 znaków, a serwis PL-only
// używa z tego zakresu DOKŁADNIE 16 kodów: polskich ĄąĆćĘęŁłŃńŚśŹźŻż.
// Ten skrypt tnie pliki `latin-ext` do polskiego alfabetu (harfbuzz przez
// subset-font). Wynik ląduje w src/assets/fonts/ i JEST COMMITOWANY —
// wzorzec optimize-images.mjs / make-icons.mjs: generat w repo, build
// niczego nie liczy. Dzięki src/assets/ (a nie public/) pliki przechodzą
// przez hashowanie Vite i dostają nagłówek immutable.
//
// ZAKRES ZNAKÓW to pełny polski alfabet, więc dowolne polskie słowo
// w treści oferty z CRM narysuje się właściwym krojem. Gdyby doszedł znak
// spoza tej listy (np. „†", czeskie „ř"), trzeba go DOPISAĆ i przegenerować
// — inaczej przeglądarka pokaże go krojem zastępczym. Pilnuje tego kontrakt
// tests/unit/fonts-subset.test.ts.
//
// Użycie:  node scripts/subset-fonts.mjs
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { createRequire } from "node:module";
import subsetFont from "subset-font";

const require = createRequire(import.meta.url);

/** Pełny polski alfabet poza zakresem `latin` (ó/Ó siedzą w U+0000–00FF,
 *  więc obsługuje je plik `latin` i tu ich nie ma). */
export const SUBSET_CHARS = "ĄąĆćĘęŁłŃńŚśŹźŻż";

const OUT_DIR = new URL("../src/assets/fonts/", import.meta.url);

/** Pliki źródłowe = subsety `latin-ext` Fontsource'a, oba kroje ZMIENNE
 *  (sama oś wagi: Archivo 100–900, Manrope 200–800). Design nie używa
 *  italików ani osi szerokości Archivo. */
const SOURCES = [
  "@fontsource-variable/archivo/files/archivo-latin-ext-wght-normal.woff2",
  "@fontsource-variable/manrope/files/manrope-latin-ext-wght-normal.woff2",
];

await mkdir(OUT_DIR, { recursive: true });

let before = 0;
let after = 0;
for (const specifier of SOURCES) {
  const source = await readFile(require.resolve(specifier));
  const subset = await subsetFont(source, SUBSET_CHARS, {
    targetFormat: "woff2",
    // `undefined` = zachowaj PEŁNY zakres osi (nie instancjonuj do jednej
    // wagi — nagłówki i tekst jadą po całej osi wght).
    variationAxes: { wght: undefined },
  });
  const name = specifier.split("/").pop().replace(".woff2", "-pl.woff2");
  await writeFile(new URL(name, OUT_DIR), subset);
  before += source.length;
  after += subset.length;
  const pct = ((100 * subset.length) / source.length).toFixed(1);
  console.log(
    `${String(source.length).padStart(7)} → ${String(subset.length).padStart(6)} B (${pct}%)  ${name}`,
  );
}
console.log(
  `${String(before).padStart(7)} → ${String(after).padStart(6)} B razem — oszczędność ${before - after} B`,
);
