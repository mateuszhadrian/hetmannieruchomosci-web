// Treść `dist/_redirects` (Cloudflare Pages) — czysta funkcja. Wyłącznie
// reguły statyczne, kod 301, bez pętli. Źródła:
//   1. rejestr adresów: `/{NUMER}` i `/{numer}` → aktualny adres oferty;
//      stare ścieżki oferty → aktualny adres;
//   2. dawne adresy poprzedniego serwisu (`data/legacy-redirects.json`);
//   3. lista stała (D25).
// Oferta nieobecna w danych (zdjęta z CRM) NIE dostaje reguł — jej adres
// zwraca 404 ze strony świadomej ofert (Etap 4.3). Limity Pages: 2 000
// reguł statycznych, 1 000 znaków na regułę.
import { OFFERS_PATH, POLICY_PATH, SERVICES_PATH } from "../routes";
import type { LegacyRedirects, UrlLedger } from "./schema";
import { offerPath, shortPaths, type OfferAddressable } from "./urls";

export const STATIC_REDIRECTS: ReadonlyArray<readonly [string, string]> = [
  ["/nasze-uslugi", SERVICES_PATH],
  ["/lista-ofert", OFFERS_PATH],
  ["/klauzula-informacyjna-formularza", POLICY_PATH],
];

export const MAX_STATIC_RULES = 2000;
export const MAX_RULE_LENGTH = 1000;

export interface RedirectRule {
  from: string;
  to: string;
  status: 301;
}

export interface RedirectsInput {
  offers: readonly OfferAddressable[];
  ledger?: UrlLedger;
  legacy?: LegacyRedirects;
}

/** Reguły w kolejności: stałe → krótkie adresy → stare ścieżki → dawne
 *  adresy. Duplikaty `from` (pierwszy wygrywa) i reguły `from === to`
 *  odpadają. */
export function buildRedirectRules({
  offers,
  ledger = {},
  legacy = {},
}: RedirectsInput): RedirectRule[] {
  const rules: RedirectRule[] = [];
  const seen = new Set<string>();
  const add = (from: string, to: string) => {
    if (from === to || seen.has(from)) return;
    seen.add(from);
    rules.push({ from, to, status: 301 });
  };

  for (const [from, to] of STATIC_REDIRECTS) add(from, to);

  const current = new Map<string, string>();
  for (const offer of [...offers].sort((a, b) =>
    a.number.localeCompare(b.number),
  )) {
    const to = offerPath(offer);
    current.set(offer.number, to);
    for (const from of shortPaths(offer.number)) add(from, to);
  }
  for (const [number, to] of current) {
    for (const old of ledger[number] ?? []) add(old, to);
  }
  for (const [number, to] of current) {
    for (const old of legacy[number]?.paths ?? []) add(old, to);
  }
  return rules;
}

/** Plik `_redirects`: jedna reguła na linię, `from to 301`. */
export function renderRedirects(rules: readonly RedirectRule[]): string {
  return rules.map((r) => `${r.from} ${r.to} ${r.status}`).join("\n") + "\n";
}

export function buildRedirects(input: RedirectsInput): string {
  return renderRedirects(buildRedirectRules(input));
}

/** Parser pliku `_redirects` (do testów i sondy). Pomija puste linie
 *  i komentarze. */
export function parseRedirects(text: string): RedirectRule[] {
  return text
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => l && !l.startsWith("#"))
    .map((l) => {
      const [from, to, status] = l.split(/\s+/);
      return { from, to, status: Number(status) as 301 };
    });
}
