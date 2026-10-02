// Jedyne miejsce, które wie „skąd brać obrazek w danym rozmiarze" (D29):
// jeden oryginał JPEG w R2, każdy rozmiar powstaje z adresu URL przez
// Cloudflare Image Transformations na hoście `MEDIA_BASE` (Z2: jedna
// stała, absolutna). Warianty: `card` (karta listy), `hero` (detal
// i lightbox), `og` (og:image). Stały `format=webp` — `format=auto`
// mnożyłby warianty przez formaty (limit transformacji).
//
// Tryby:
//  - produkcja/preview: `{MEDIA_BASE}/cdn-cgi/image/{opcje}/{r2Key}`;
//  - dev (`import.meta.env.DEV`): oryginał z R2 — bez zużywania
//    transformacji na localhoście;
//  - fixture (`MEDIA_SOURCE=fixture`, skrypt `build:visual`): lokalna
//    kopia WebP z `tests/fixtures/offers/media/` — testy wizualne bez sieci.
// Pusty `MEDIA_BASE` daje adresy względne — build nie pada, obrazy 404.
import { MEDIA_BASE } from "./site-config";

export type ImgVariant = "card" | "hero" | "og";

/** Opcje transformacji per wariant. `onerror=redirect`: gdy transformacja
 *  się nie uda, przeglądarka dostaje oryginał zamiast błędu. */
export const IMG_VARIANTS: Record<ImgVariant, string> = {
  // karta listy: kadr 3:2 jak pole karty (serwer tnie zamiast przeglądarki),
  // 720 px = ostro na telefonie @2× (karta ≈ 360 css px)
  card: "width=720,height=480,fit=cover,format=webp,quality=80,onerror=redirect",
  hero: "width=1600,format=webp,quality=82,onerror=redirect",
  og: "width=1200,height=630,fit=cover,format=webp,quality=80,onerror=redirect",
};

/** Prefiks lokalnych kopii fixture'u (serwowane z `dist/media/`). */
export const FIXTURE_MEDIA_PREFIX = "/media";

function normalizeKey(r2Key: string): string {
  return r2Key.replace(/^\/+/, "");
}

/** Adres oryginału w zasobniku mediów (bez transformacji). */
export function mediaUrl(r2Key: string): string {
  return `${MEDIA_BASE}/${normalizeKey(r2Key)}`;
}

/** Lokalna kopia fixture'u: ten sam klucz, rozszerzenie `.webp`. */
export function fixtureMediaPath(r2Key: string): string {
  return `${FIXTURE_MEDIA_PREFIX}/${normalizeKey(r2Key).replace(/\.(jpe?g|png)$/i, ".webp")}`;
}

export function imgAt(r2Key: string, variant: ImgVariant): string {
  if (import.meta.env.MEDIA_SOURCE === "fixture")
    return fixtureMediaPath(r2Key);
  if (import.meta.env.DEV) return mediaUrl(r2Key);
  return `${MEDIA_BASE}/cdn-cgi/image/${IMG_VARIANTS[variant]}/${normalizeKey(r2Key)}`;
}
