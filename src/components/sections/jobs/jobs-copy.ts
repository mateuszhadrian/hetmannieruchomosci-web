// Teksty widoku /praca/ w jednym miejscu (importują je sekcje i testy).
// PLACEHOLDER (U9): wszystkie brzmienia są robocze (nagłówek z designu) —
// do potwierdzenia przez klientkę. Teksty formularza:
// src/components/forms/forms-copy.ts (`PRACA_FORM_COPY`).
export const JOBS_COPY = {
  eyebrow: "Praca",
  title: "Dołącz do nas.",
  accent: "Wyślij swoje CV.",
  // PLACEHOLDER (U9): opis zdjęcia dla czytników ekranu.
  imageAlt: "Biurko i fotel w biurze — miejsce pracy doradcy",
  /** Stan przy wyłączonym przełączniku SHOW_PRACA: strona bez formularza. */
  closed: {
    heading: "Praca",
    text: "Obecnie nie prowadzimy rekrutacji przez stronę. Jeśli chcesz o coś zapytać, napisz do nas albo zadzwoń.",
    cta: "Przejdź do kontaktu",
  },
} as const;
