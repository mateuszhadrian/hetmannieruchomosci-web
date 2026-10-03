// Teksty widoku /kontakt/ w jednym miejscu (importują je sekcje i testy).
// Brzmienia z designu oznaczone PLACEHOLDER (U9) — do potwierdzenia przez
// klientkę. Etykiety danych, adres i godziny NIE są placeholderami
// (godziny potwierdzone, adres z `BUSINESS`). Teksty formularza:
// src/components/forms/forms-copy.ts.
import { BUSINESS } from "../../../lib/jsonld";

export const CONTACT_COPY = {
  // PLACEHOLDER (U9): eyebrow, nagłówek (dwie frazy) i akapit z designu.
  eyebrow: "Kontakt",
  title: "Kupujesz, sprzedajesz czy szukasz porady?",
  accent: "Porozmawiajmy.",
  lead: "Napisz lub zadzwoń — powiemy wprost, jak możemy pomóc, i od czego zacząć.",
  // PLACEHOLDER (U9): opis mapy dla czytników ekranu.
  mapAlt: `Mapa okolicy biura — ${BUSINESS.street}, ${BUSINESS.locality}`,
  mapLink: "Otwórz w mapach",
  labels: {
    phone: "Telefon",
    mail: "E-mail",
    office: "Biuro",
    hours: "Godziny otwarcia",
  },
  /** Godziny biura — wartość potwierdzona; `hoursDays` + `hoursTime`
   *  (godziny nie łamią się w środku). */
  hoursDays: "pon.–pt.",
  hoursTime: "11:00–17:00",
  // PLACEHOLDER (U9): informacja dla przeglądarek bez JavaScriptu.
  noJs: "Telefon i adres e-mail pokazujemy po włączeniu JavaScriptu.",
} as const;
