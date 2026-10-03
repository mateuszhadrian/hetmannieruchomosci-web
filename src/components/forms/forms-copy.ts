// Teksty formularzy w JEDNYM miejscu — importują je komponenty i testy
// (asercje nie hardkodują brzmień). Etykiety pól, placeholdery,
// podpowiedzi, komunikaty walidacji, noty, ekrany potwierdzenia
// i komunikaty błędu wysyłki pochodzą ze specyfikacji formularzy w bazie
// wiedzy projektu (dokument lokalny) — NIE są placeholderami. Teksty
// oznaczone PLACEHOLDER (U9) to wersje robocze do potwierdzenia.
// Brzmienie zgody marketingowej: `MARKETING_CONSENT` w lib/contact-form.ts
// (czytają je także maile).

/** Deklarowany czas odpowiedzi — JEDNA liczba w całym serwisie. */
export const RESPONSE_TIME = "3 dni roboczych";

export const FORM_COPY = {
  // PLACEHOLDER (U9): dopisek przy polach opcjonalnych.
  optional: "(opcjonalnie)",
  name: { label: "Imię i nazwisko", placeholder: "Jan Kowalski" },
  email: { label: "E-mail", placeholder: "jan.kowalski@example.com" },
  phone: { label: "Telefon", placeholder: "600 100 200" },
  contactHint:
    "Wystarczy jedno z dwóch — wybierz, jak wolisz, żebyśmy się odezwali.",
  errors: {
    name: "Podaj imię, żebyśmy wiedzieli, jak się do Ciebie zwracać.",
    contact: "Podaj e-mail albo telefon — inaczej nie mamy jak odpowiedzieć.",
    email: "Ten adres e-mail wygląda na niepełny.",
    phone: "Numer wygląda na niepełny — sprawdź, czy ma wszystkie cyfry.",
    message: "Napisz kilka słów o tym, w czym możemy pomóc.",
  },
  /** Druga część noty informacyjnej — wspólna; po niej link do polityki. */
  noteTail:
    "Kto jest administratorem, jak długo przechowujemy dane i jakie masz prawa — opisuje",
  policyLink: "Polityka prywatności",
  // PLACEHOLDER (U9): etykieta przycisku w trakcie wysyłki.
  sending: "Wysyłanie…",
  // PLACEHOLDER (U9): informacja dla przeglądarek bez JavaScriptu.
  noJs: "Wysłanie formularza wymaga włączonego JavaScriptu (zabezpieczenie przed spamem). Bez niego zapraszamy do biura — adres znajdziesz na tej stronie i w stopce.",
  /** Etykieta pułapki na boty (pole niewidoczne dla ludzi i czytników). */
  honeypot: "Firma (pozostaw puste)",
} as const;

/** Teksty ramki jednego formularza (FormFrame.astro). */
export interface FormFrameCopy {
  /** Zdanie o celu przetwarzania — pierwsza część noty. */
  purpose: string;
  submit: string;
  /** Komunikat błędu wysyłki; po nim numer telefonu ze slotu. */
  serverError: string;
  doneHeading: string;
  /** Tekst przed pogrubionym czasem odpowiedzi i po nim. */
  doneBefore: string;
  doneAfter: string;
  /** Zdanie kończące się numerem telefonu ze slotu (albo puste). */
  doneCall: string;
  again: string;
}

export const KONTAKT_FORM_COPY = {
  heading: "Napisz do nas",
  lead: "Odpowiadamy na każdą wiadomość. Jeśli sprawa jest pilna, szybciej będzie zadzwonić.",
  message: {
    label: "Wiadomość",
    placeholder:
      "Napisz, w czym możemy pomóc. Jeśli pytasz o konkretną ofertę, podaj jej numer.",
  },
  frame: {
    purpose:
      "Twoje dane wykorzystujemy po to, żeby odpowiedzieć na tę wiadomość.",
    submit: "Wyślij wiadomość",
    serverError:
      "Nie udało się wysłać wiadomości — coś po naszej stronie. Spróbuj jeszcze raz albo zadzwoń:",
    doneHeading: "Wiadomość wysłana.",
    doneBefore: "Odezwiemy się w ciągu",
    doneAfter: ".",
    doneCall: "Jeśli sprawa nie może czekać — zadzwoń:",
    again: "Napisz kolejną wiadomość",
  } satisfies FormFrameCopy,
} as const;
