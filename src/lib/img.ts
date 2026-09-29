// Jedyne miejsce, które wie „skąd brać obrazek w danym rozmiarze".
// Skalowanie w locie przez Cloudflare Image Transformations — jeden
// oryginał w R2, każdy rozmiar powstaje z adresu URL.
//
// STAN Etapu 0: mechanizm odziedziczony z szablonu bez zmian logiki.
// Warianty, format i host mediów dla zdjęć ofert ustala Etap 2
// (docs/plan → krok 2.5; `MEDIA_BASE` w src/lib/site-config.ts).
export function imgAt(src: string, width: "full" | "mobile"): string {
  // Lokalnie (dev/preview) endpoint /cdn-cgi/image nie istnieje — pokaż oryginał.
  if (import.meta.env.DEV) return src;
  const w = width === "mobile" ? 320 : 960; // szerokości pod telefon / desktop
  // format=auto → przeglądarka dostaje AVIF/WebP automatycznie.
  // replace: źródło bez wiodącego "/"; pełne URL-e https://… przechodzą
  // bez zmian.
  return `/cdn-cgi/image/width=${w},format=auto/${src.replace(/^\//, "")}`;
}
