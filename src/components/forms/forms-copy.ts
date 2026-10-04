// Teksty formularzy w JEDNYM miejscu — importują je komponenty i testy
// (asercje nie hardkodują brzmień). Etykiety pól, placeholdery,
// podpowiedzi, komunikaty walidacji, noty, ekrany potwierdzenia
// i komunikaty błędu wysyłki pochodzą ze specyfikacji formularzy w bazie
// wiedzy projektu (dokument lokalny) — NIE są placeholderami. Teksty
// oznaczone PLACEHOLDER (U9) to wersje robocze do potwierdzenia.
// Brzmienie zgody marketingowej: `MARKETING_CONSENT` w lib/contact-form.ts
// (czytają je także maile); zgody na przyszłe rekrutacje:
// `FUTURE_RECRUITMENT_CONSENT` tamże.
import { cvLimitLabel, cvTypesLabel } from "../../lib/cv-file";

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
  /** Potwierdzenie BEZ deklaracji czasu odpowiedzi (rekrutacja): samo
   *  `doneBefore` + `doneAfter`. */
  doneUntimed?: boolean;
  /** Zdanie kończące się numerem telefonu (albo adresem) ze slotu; puste
   *  = potwierdzenie bez slotu. */
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

export const SPRZEDAJ_FORM_COPY = {
  heading: "Zgłoś nieruchomość",
  // PLACEHOLDER (U9): akapit pod nagłówkiem (brzmienie z designu).
  lead: "Potrzebujemy tylko pierwszych pól. Pozostałe są opcjonalne — pomagają nam przygotować wycenę przed rozmową.",
  type: { legend: "Typ nieruchomości" },
  transaction: { legend: "Rodzaj transakcji" },
  /** Nagłówek rozwijanego bloku pól opcjonalnych (dopisek „(opcjonalnie)"
   *  z `FORM_COPY.optional`; pola wewnątrz już go nie powtarzają). */
  details: "Szczegóły nieruchomości",
  location: { label: "Lokalizacja", placeholder: "Poznań, Winogrady" },
  area: { label: "Powierzchnia (m²)", placeholder: "48" },
  price: {
    label: "Oczekiwana cena (PLN)",
    placeholder: "550 000",
    hint: "Nie musisz jej znać — pomożemy ją ustalić.",
  },
  notes: {
    label: "Opis lub uwagi",
    placeholder: "Co jeszcze warto wiedzieć o nieruchomości?",
  },
  errors: {
    type: "Wybierz, czego dotyczy zgłoszenie.",
    transaction: "Zaznacz, czy chodzi o sprzedaż, czy o wynajem.",
    area: "Podaj powierzchnię w metrach, samą liczbą.",
    price: "Podaj cenę samą liczbą, bez „zł”.",
  },
  // PLACEHOLDER (U9): zdanie przed numerem telefonu pod przyciskiem.
  call: "Wolisz przez telefon?",
  frame: {
    purpose:
      "Twoje dane wykorzystujemy po to, żeby przygotować odpowiedź i wycenę.",
    submit: "Wyślij zgłoszenie",
    serverError:
      "Nie udało się wysłać zgłoszenia — coś po naszej stronie. Spróbuj jeszcze raz albo zadzwoń:",
    doneHeading: "Zgłoszenie wysłane.",
    doneBefore: "Przejrzymy je i odezwiemy się w ciągu",
    doneAfter:
      " z propozycją terminu oględzin. Zdjęć nie potrzebujemy na tym etapie — poprosimy o nie, kiedy się skontaktujemy.",
    doneCall: "",
    again: "Wyślij kolejne zgłoszenie",
  } satisfies FormFrameCopy,
} as const;

export const OFERTA_FORM_COPY = {
  message: {
    label: "Wiadomość",
    /** Treść startowa pola — brzmienie z formularza dotychczasowej strony
     *  (NIE placeholder: klient może ją wysłać bez zmian). Numer, tytuł
     *  i adres oferty niesie mail, nie treść. */
    value: "Jestem zainteresowany(a) tą ofertą. Proszę o kontakt.",
  },
  // PLACEHOLDER (U9): teksty ramki — brzmienia robocze na wzór formularza
  // kontaktowego (zdanie o celu, etykieta przycisku, potwierdzenie, błąd).
  frame: {
    purpose:
      "Twoje dane wykorzystujemy po to, żeby odpowiedzieć na to zapytanie.",
    submit: "Wyślij zapytanie",
    serverError:
      "Nie udało się wysłać zapytania — coś po naszej stronie. Spróbuj jeszcze raz albo zadzwoń:",
    doneHeading: "Zapytanie wysłane.",
    doneBefore: "Odezwiemy się w ciągu",
    doneAfter: ".",
    doneCall: "Jeśli sprawa nie może czekać — zadzwoń:",
    again: "Napisz kolejną wiadomość",
  } satisfies FormFrameCopy,
} as const;

// PLACEHOLDER (U9): CAŁY blok tekstów formularza rekrutacyjnego to
// brzmienia robocze (specyfikacja tego formularza nie ma jeszcze tekstów);
// nota i zgoda na przyszłe rekrutacje — do weryfikacji razem z polityką
// prywatności. NIE są placeholderami: etykiety i komunikaty pól wspólnych
// (`FORM_COPY`) oraz dopisek typów i limitu pliku — liczony ze stałych
// (`CV_TYPES`, `CV_MAX_BYTES` w lib/cv-file.ts).
export const PRACA_FORM_COPY = {
  message: {
    label: "Treść wiadomości",
    placeholder:
      "Napisz kilka słów o sobie — czym się zajmujesz i dlaczego chcesz pracować w nieruchomościach.",
  },
  cv: {
    label: "CV",
    pick: "Wybierz plik",
    /** Widoczne tylko od 1025 px i tylko po uzbrojeniu pola skryptem. */
    drag: "lub przeciągnij go tutaj",
    idle: "Nie wybrano pliku",
    hint: `${cvTypesLabel()} · maks. ${cvLimitLabel()}`,
  },
  errors: {
    cv: "Dołącz plik z CV — bez niego nie możemy rozpatrzyć zgłoszenia.",
    cvType: `Ten plik nie jest w formacie ${cvTypesLabel().replace(" lub ", " ani ")}. Zapisz CV w jednym z nich i wybierz je ponownie.`,
    /** Po tym zdaniu adres e-mail biura ze slotu. */
    cvSize: `Plik jest większy niż ${cvLimitLabel()}. Wyślij CV mailem na adres:`,
  },
  /** Zdanie pod przyciskiem; po nim adres e-mail biura ze slotu. */
  mail: "Wolisz mailem? Wyślij CV na adres:",
  frame: {
    purpose: "Twoje dane wykorzystujemy po to, żeby przeprowadzić rekrutację.",
    submit: "Wyślij zgłoszenie",
    serverError:
      "Nie udało się wysłać zgłoszenia — coś po naszej stronie. Spróbuj jeszcze raz albo wyślij CV mailem na adres:",
    doneHeading: "Zgłoszenie wysłane.",
    doneBefore:
      "Dziękujemy za zainteresowanie pracą w HETMAN Nieruchomości. Skontaktujemy się z wybranymi osobami.",
    doneAfter: "",
    doneUntimed: true,
    doneCall: "",
    again: "Wyślij kolejne zgłoszenie",
  } satisfies FormFrameCopy,
} as const;
