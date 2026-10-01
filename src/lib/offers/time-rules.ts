// Reguły prezentacji zależne od DATY — jedno miejsce dla strony i syncu.
// Strona czyta „teraz" z `BUILD_NOW` (data.ts); sync porównuje wynik dla
// wczoraj i dziś, żeby wykryć przebudowę potrzebną bez zmiany danych
// (2.8 pkt 10: ofercie mija próg „Nowość", `availableFrom` przechodzi
// w przeszłość). Granulacja dzienna w strefie Europe/Warsaw.
import { NEW_BADGE_DAYS } from "../site-config";

const TZ = "Europe/Warsaw";
const dateFormatter = new Intl.DateTimeFormat("en-CA", {
  timeZone: TZ,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

/** Data kalendarzowa `YYYY-MM-DD` momentu `at` w czasie polskim. */
export function warsawDate(at: Date): string {
  return dateFormatter.format(at);
}

/** Dni między dwiema datami `YYYY-MM-DD` (b − a). */
export function daysBetween(a: string, b: string): number {
  const toUtc = (d: string) =>
    Date.UTC(
      Number(d.slice(0, 4)),
      Number(d.slice(5, 7)) - 1,
      Number(d.slice(8, 10)),
    );
  return Math.round((toUtc(b) - toUtc(a)) / 86_400_000);
}

/** Plakietka „Nowość": od dodania minęło najwyżej `NEW_BADGE_DAYS` dni
 *  (liczone po datach kalendarzowych; data w przyszłości = nie-nowość). */
export function isNewOffer(addedAt: string, now: Date): boolean {
  const added = warsawDate(new Date(addedAt));
  const days = daysBetween(added, warsawDate(now));
  return days >= 0 && days <= NEW_BADGE_DAYS;
}

/** „Dostępne od" pokazujemy tylko, gdy data jeszcze nie minęła (jest
 *  dzisiejsza albo przyszła); przeszłą ukrywamy bez ostrzeżenia. */
export function showsAvailableFrom(
  availableFrom: string | undefined,
  now: Date,
): boolean {
  if (!availableFrom) return false;
  return daysBetween(warsawDate(now), availableFrom) >= 0;
}

export interface DateDependent {
  addedAt: string;
  availableFrom?: string;
}

/** Odcisk prezentacji zależnej od daty dla zbioru ofert — równość
 *  odcisków dla dwóch dat oznacza, że przebudowa nic by nie zmieniła. */
export function dateDependentFingerprint(
  offers: readonly DateDependent[],
  now: Date,
): string {
  return offers
    .map(
      (o) =>
        `${isNewOffer(o.addedAt, now) ? "N" : "-"}${showsAvailableFrom(o.availableFrom, now) ? "A" : "-"}`,
    )
    .join("");
}
