// `/oferty/index.json` — indeks wyszukiwarki (D30): wpisy kart i filtrów
// bez opisu + drzewo lokalizacji. Statyczny plik z builda; czyta go wyspa
// (4.2 b). Kształt: `src/lib/offers/index-entry.ts` (allow-lista
// `INDEX_FIELDS`); skan nazw zabronionych robi `pnpm test:dist`.
import type { APIRoute } from "astro";
import { loadOffersData } from "@/lib/offers/data";
import { buildIndex } from "@/lib/offers/index-entry";

export const GET: APIRoute = () =>
  new Response(JSON.stringify(buildIndex(loadOffersData())), {
    headers: { "Content-Type": "application/json; charset=utf-8" },
  });
