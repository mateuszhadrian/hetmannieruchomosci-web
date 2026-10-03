// Meta detalu oferty (4.3): `<title>`, `description` cięte na granicy
// zdania, tekst opisu bez HTML (do meta i JSON-LD), tytuł zastępczy.
// Czyste funkcje bez DOM; `htmlparser2` jak w `index-entry.ts`.
import { DomUtils, parseDocument } from "htmlparser2";
import { formatKind, formatLocation, formatPrice } from "./format";
import type { Offer } from "./schema";

const BRAND = "Hetman Nieruchomości";
/** Limit meta description (Google ucina ok. 155–160 znaków). */
export const DESCRIPTION_MAX = 160;

/** Tytuł do nagłówka: tytuł z CRM albo nazwa typu, gdy pusty. */
export function offerHeading(offer: Offer): string {
  return offer.title.trim() || offer.typeName;
}

/** „{tytuł} — Mieszkanie na sprzedaż, Poznań Winogrady · Hetman
 *  Nieruchomości". */
export function detailTitle(offer: Offer): string {
  const kind = formatKind(offer.mainType, offer.transaction);
  return `${offerHeading(offer)} — ${kind}, ${offer.location.placeName} · ${BRAND}`;
}

/** Widoczny tekst opisu (bez HTML), białe znaki scalone. */
export function descriptionText(html: string): string {
  return DomUtils.textContent(parseDocument(html)).replace(/\s+/g, " ").trim();
}

/** Ucięcie tekstu na GRANICY ZDANIA do `max` znaków: ostatnie `.`, `!`
 *  albo `?` (przed spacją lub końcem) w limicie; gdy żadne zdanie nie
 *  mieści się — na ostatniej spacji z wielokropkiem. */
export function cutAtSentence(text: string, max = DESCRIPTION_MAX): string {
  if (text.length <= max) return text;
  const head = text.slice(0, max + 1);
  let end = -1;
  const re = /[.!?](?=\s|$)/g;
  for (const m of head.matchAll(re)) {
    if (m.index !== undefined && m.index < max) end = m.index;
  }
  if (end > 0) return text.slice(0, end + 1).trim();
  const cut = text.lastIndexOf(" ", max - 1);
  return `${text.slice(0, cut > 0 ? cut : max - 1).trimEnd()}…`;
}

/** Opis zastępczy, gdy oferta nie ma opisu (dane dopuszczają pusty). */
export function fallbackDescription(offer: Offer): string {
  const kind = formatKind(offer.mainType, offer.transaction);
  const price = formatPrice(offer.price, offer.transaction, offer.currency);
  return `${kind} — ${formatLocation(offer.location)}. ${price}. Oferta ${offer.number} biura ${BRAND}.`;
}

/** Meta description detalu (także `description` w JSON-LD). */
export function detailDescription(offer: Offer): string {
  const text = descriptionText(offer.descriptionHtml);
  return cutAtSentence(text || fallbackDescription(offer));
}
