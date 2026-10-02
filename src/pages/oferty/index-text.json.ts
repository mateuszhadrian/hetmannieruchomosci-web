// `/oferty/index-text.json` — teksty do „szukaj w opisie" (tytuł + opis
// bez HTML, znormalizowane), osobno od indeksu: ładowane dopiero przy
// użyciu tego filtra (part2 §9). Klucz = numer oferty.
import type { APIRoute } from "astro";
import { loadOffersData } from "@/lib/offers/data";
import { buildIndexText } from "@/lib/offers/index-entry";

export const GET: APIRoute = () =>
  new Response(JSON.stringify(buildIndexText(loadOffersData().offers)), {
    headers: { "Content-Type": "application/json; charset=utf-8" },
  });
