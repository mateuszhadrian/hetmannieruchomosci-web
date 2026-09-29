// @ts-check
import { defineConfig } from "astro/config";

import sitemap from "@astrojs/sitemap";
import tailwindcss from "@tailwindcss/vite";

// https://astro.build/config
export default defineConfig({
  // Canonical i sitemapa wskazują domenę główną także na podglądzie —
  // podgląd chroni przed indeksacją nagłówek noindex z public/_headers.
  site: "https://hetmannieruchomosci.com",
  output: "static",
  // Sitemapa: wszystkie trasy poza stroną 404 (filtr jawny — nie polegamy
  // na zachowaniu domyślnym integracji). Trasy druku dojdą tu w Etapie 7.
  integrations: [
    sitemap({
      filter: (page) => !/\/404\/?$/.test(new URL(page).pathname),
    }),
  ],

  vite: {
    plugins: [tailwindcss()],
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
