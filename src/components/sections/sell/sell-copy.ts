// Teksty widoku /sprzedaj-z-nami/ w jednym miejscu (importują je sekcje
// i testy). Brzmienia z designu oznaczone PLACEHOLDER (U9) — do
// potwierdzenia przez klientkę. Teksty formularza „Zgłoś nieruchomość":
// src/components/forms/forms-copy.ts (`SPRZEDAJ_FORM_COPY`).

export const SELL_COPY = {
  // PLACEHOLDER (U9): eyebrow, nagłówek (dwie frazy), akapit i przycisk
  // hero. Akapit BEZ obietnicy czasu odpowiedzi — ta pada raz, na ekranie
  // potwierdzenia (docs/analiza-formularze-a.md Q4).
  eyebrow: "Sprzedaj z nami",
  title: "Chcesz sprzedać?",
  accent: "Zajmiemy się resztą.",
  lead: "Opisz nieruchomość w kilku polach. Oddzwonimy z bezpłatną wyceną i planem sprzedaży.",
  cta: "Wypełnij zgłoszenie",
  // PLACEHOLDER (U9): opis zdjęcia hero.
  imageAlt: "Agent Hetman Nieruchomości z dokumentami w pustym mieszkaniu",
  // PLACEHOLDER (U9): trzy kroki (tytuł + jedno zdanie).
  steps: [
    { title: "Zgłoszenie", text: "Formularz zajmuje dwie minuty." },
    { title: "Wycena i plan", text: "Dzwonimy z realną ceną i strategią." },
    { title: "Oględziny", text: "Zdjęcia, opis i start sprzedaży." },
  ],
} as const;
