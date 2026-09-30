// Status oferty z prefiksu tytułu (D38). Klientka oznacza sprzedane,
// wynajęte i zarezerwowane oferty prefiksem w tytule — CRM nie ma osobnego
// pola, a oferta z prefiksem pozostaje dla CRM „aktualna". Parser jest
// jedynym źródłem statusu w fazie 1 (`statusSource: 'title'`).
// Kod przeniesiony z analizy danych CRM; sprawdzony na realnych tytułach
// (test `offers-status`: 8 aktywnych / 21 sprzedanych / 13 wynajętych /
// 3 rezerwacje na 45 ofertach, w tym literówka „SPRZEDEDANE").
import type { OfferStatus, Transaction } from "./schema";

const STATUS_PREFIX =
  /^\s*(SPRZED[EA]DANE|SPRZEDANE|SPRZEDANY|SPRZEDANA|WYNAJ[EĘ]TE|WYNAJ[EĘ]TY|WYNAJ[EĘ]TA|REZERWACJA|ZAREZERWOWANE)\b[\s\-–—:!.]*/iu;
/** „0%" w tytule = plakietka „0% prowizji", nie status. */
const ZERO_PERCENT = /(^|\s)0\s?%(\s|$)/u;
/** Kandydat na NIEZNANY prefiks (W5): tytuł zaczyna się ciągiem wielkich
 *  liter o długości ≥ 6, którego parser nie rozpoznał. */
const UNKNOWN_PREFIX = /^\s*([A-ZĄĆĘŁŃÓŚŹŻ]{6,})\b/u;

export const ZERO_COMMISSION_BADGE = "0% prowizji";

export interface ParsedTitle {
  status: OfferStatus;
  /** tytuł bez prefiksu i bez „0%" */
  title: string;
  badges: string[];
  /** rozpoznany prefiks (surowy zapis z tytułu) albo null */
  matchedPrefix: string | null;
  /** ciąg wielkich liter na początku, którego parser nie zna (W5) */
  unknownPrefix: string | null;
}

export function parseTitle(
  rawTitle: string,
  transaction: Transaction,
): ParsedTitle {
  let title = rawTitle.trim();
  let status: OfferStatus = "aktywna";
  let matchedPrefix: string | null = null;
  const m = STATUS_PREFIX.exec(title);
  if (m) {
    matchedPrefix = m[1];
    const p = m[1].toUpperCase();
    if (p.startsWith("SPRZED")) status = "sprzedana";
    else if (p.startsWith("WYNAJ")) status = "wynajeta";
    else status = "rezerwacja";
    title = title.slice(m[0].length);
  }
  // „sprzedane" przy wynajmie / „wynajęte" przy sprzedaży — ufamy
  // transakcji, nie słowu
  if (status === "sprzedana" && transaction === "wynajem") status = "wynajeta";
  if (status === "wynajeta" && transaction === "sprzedaz") status = "sprzedana";

  const badges: string[] = [];
  if (ZERO_PERCENT.test(title)) {
    badges.push(ZERO_COMMISSION_BADGE);
    title = title.replace(ZERO_PERCENT, " ");
  }
  title = title
    .replace(/^[\s\-–—:]+/, "")
    .replace(/\s{2,}/g, " ")
    .trim();

  const unknownPrefix =
    matchedPrefix === null ? (UNKNOWN_PREFIX.exec(title)?.[1] ?? null) : null;

  return { status, title, badges, matchedPrefix, unknownPrefix };
}
