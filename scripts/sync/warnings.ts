// Ostrzeżenia syncu. Dwa poziomy widoczności (repo i logi Actions są
// PUBLICZNE): `code` + liczności idą do logu, `number` i `detail` tylko
// do raportu prywatnego (2.7). `message` NIGDY nie zawiera numeru oferty,
// wartości pól kontrolnych ani adresów API.

export const WARNING_CODES = {
  /** prefiks statusu w tytule bez sygnału kontrolnego umowy */
  W1: "prefiks statusu bez sygnału umowy",
  /** sygnał kontrolny umowy bez prefiksu statusu (spodziewany szum) */
  W2: "sygnał umowy bez prefiksu statusu",
  /** znacznik w CRM zmieniony — czas na test znaczników (O8) */
  W3: "znacznik oferty w CRM zmieniony",
  /** status CRM inny niż aktywny, a eksport włączony (2.4) */
  W4: "niespójny eksport",
  /** nieznany prefiks tytułu, oferta traktowana jako aktywna */
  W5: "nieznany prefiks tytułu",
  /** zdjęcia mogą mieć nieaktualny stempel (2.5) */
  W6: "zdjęcia mogą mieć nieaktualny stempel",
  /** pierwsze zdjęcie inne niż `main_picture` */
  MAIN_PICTURE: "pierwsze zdjęcie inne niż główne",
  /** nieznany format linku wideo — pole pominięte */
  VIDEO_LINK: "nieznany format linku wideo",
  /** opis www różni się od opisu głównego */
  DESCRIPTION_DIFF: "osobny opis www",
  /** brak etykiety w słowniku API — pole pominięte */
  DICT_MISS: "brak etykiety w słowniku",
  /** nieznany typ ulicy — pominięty */
  STREET_TYPE: "nieznany typ ulicy",
  /** kolizja slugu lokalizacji — dopisany sufiks */
  SLUG_COLLISION: "kolizja slugu lokalizacji",
  /** zdjęcia nie udało się pobrać — zostaje poprzednia kopia albo
   *  zdjęcie wypada z oferty (2.5) */
  PHOTO_FETCH: "nie udało się pobrać zdjęcia",
  /** mapy nie udało się pobrać — oferta bez mapy do następnego syncu (2.6) */
  MAP_FETCH: "nie udało się pobrać mapy",
} as const;

export type WarningCode = keyof typeof WARNING_CODES;

export interface SyncWarning {
  code: WarningCode;
  /** treść publiczna (bez numeru oferty) */
  message: string;
  /** numer oferty — tylko do raportu prywatnego */
  number?: string;
  /** szczegół — tylko do raportu prywatnego */
  detail?: string;
}

export function warning(
  code: WarningCode,
  number?: string,
  detail?: string,
): SyncWarning {
  const w: SyncWarning = { code, message: WARNING_CODES[code] };
  if (number !== undefined) w.number = number;
  if (detail !== undefined) w.detail = detail;
  return w;
}

/** Publiczne podsumowanie: `W2 ×2, W5 ×1` — same kody i liczności. */
export function summarize(warnings: readonly SyncWarning[]): string {
  const counts = new Map<WarningCode, number>();
  for (const w of warnings) counts.set(w.code, (counts.get(w.code) ?? 0) + 1);
  return [...counts.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([code, n]) => `${code} ×${n}`)
    .join(", ");
}
