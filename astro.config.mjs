// @ts-check
import { defineConfig } from "astro/config";

import preact from "@astrojs/preact";
import sitemap from "@astrojs/sitemap";
import tailwindcss from "@tailwindcss/vite";

import fixtureMedia from "./src/integrations/fixture-media";
import redirects from "./src/integrations/redirects";
import { isSitemapPath } from "./src/lib/routes";

// https://astro.build/config
export default defineConfig({
  // Canonical i sitemapa wskazują domenę główną także na podglądzie —
  // podgląd chroni przed indeksacją nagłówek noindex z public/_headers.
  site: "https://hetmannieruchomosci.com",
  output: "static",
  // Sitemapa: wszystkie trasy poza stroną 404 i — przy wyłączonym
  // SHOW_PRACA — podstroną „Praca" (filtr jawny w src/lib/routes.ts — nie
  // polegamy na zachowaniu domyślnym integracji). Trasy druku dojdą tu
  // w Etapie 7.
  integrations: [
    // Jedyna wyspa projektu (4.2): karta oferty `OfferCard.tsx` renderuje
    // się w SSG; wyspa wyszukiwarki (4.2 b) hydratuje ją na kliencie.
    // Bez dyrektywy `client:*` komponent Preact nie wysyła żadnego JS.
    preact(),
    sitemap({
      filter: (page) => isSitemapPath(new URL(page).pathname),
    }),
    // `dist/_redirects` z danych ofert (OFFERS_DATA_DIR) — po buildzie.
    redirects(),
    // MEDIA_SOURCE=fixture → kopia tests/fixtures/offers/media/ do dist/media/.
    fixtureMedia(),
  ],

  vite: {
    plugins: [tailwindcss()],
    // `MEDIA_SOURCE=fixture` (skrypt `build:visual`) przełącza imgAt() na
    // lokalne kopie zdjęć fixture'u — bez prefiksu PUBLIC_ Vite nie
    // wpuściłby zmiennej do import.meta.env.
    envPrefix: ["PUBLIC_", "MEDIA_SOURCE"],
    build: {
      // Fonty NIGDY nie wchodzą do CSS jako base64. Domyślny
      // assetsInlineLimit Vite (4096 B) wciągnąłby polski subset Manrope
      // (3,3 KB) wprost do arkusza — bajty kroju lądowałyby w CSS
      // BLOKUJĄCYM RENDER, zamiast dogrywać się asynchronicznie przez
      // font-display: swap, a preload z BaseLayout wskazywałby plik,
      // którego nikt nie używa. Pozostałe assety (drobne obrazy)
      // zachowują domyślne zachowanie.
      assetsInlineLimit: (filePath) =>
        filePath.endsWith(".woff2") ? false : undefined,
    },
  },
});
