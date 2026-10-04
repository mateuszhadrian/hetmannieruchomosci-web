// Teksty widoku /o-nas/ w jednym miejscu (importują je sekcje i testy).
// PLACEHOLDER (U9): brzmienie z designu, do potwierdzenia przez klientkę
// w kroku 7.7 — lista w docs/analiza-o-nas.md §7. Nie są placeholderami:
// adres biura (BUSINESS), telefon i e-mail (sloty).
import { CONTACT_PATH } from "../../../lib/routes";

export const ABOUT_COPY = {
  hero: {
    // PLACEHOLDER
    eyebrow: "O nas",
    title: "Nieruchomości to dla nas coś więcej niż transakcje.",
    accent: "To Twoje bezpieczeństwo.",
    lead: "Jesteśmy praktykami poznańskiego rynku nieruchomości. Łączymy wieloletnie doświadczenie z nieszablonowym podejściem, aby przeprowadzić Cię przez każdy, nawet najbardziej skomplikowany proces z pełnym spokojem.",
    // PLACEHOLDER — WARTOŚCI do potwierdzenia przez klientkę (te same
    // liczby niesie sekcja 01 strony głównej)
    stats: [
      { value: "10 lat", label: "na poznańskim rynku" },
      { value: "4 lata", label: "pod własnym szyldem" },
      { value: "setki", label: "rozwiązanych spraw" },
    ],
  },
  history: {
    // PLACEHOLDER
    eyebrow: "Historia i doświadczenie",
    // PLACEHOLDER — DWA warianty nagłówka w designie, wybór należy do
    // klientki (docs/analiza-o-nas.md A1). Wstawiony desktopowy; mobilny:
    // „10 lat na rynku. 4 lata pod własnym szyldem. / Setki rozwiązanych
    // problemów."
    title: "Biuro, które powstało z prostej potrzeby.",
    accent: "Słuchać i brać odpowiedzialność.",
    paragraphs: [
      "Hetman Nieruchomości powstało z prostej potrzeby: stworzenia biura, które naprawdę słucha klienta i bierze pełną odpowiedzialność za cały proces. Joanna Hetman, założycielka biura, od ponad dekady aktywnie działa w branży i doskonale zna rynek Poznania oraz okolic.",
      "Wiemy, jak dynamicznie zmieniają się trendy i przepisy. Dlatego stworzyliśmy zespół ekspertów, dla których praca w nieruchomościach to pasja i codzienne wyzwanie.",
    ],
    founderName: "Joanna Hetman",
    founderRole: "założycielka",
    founderAlt: "Joanna Hetman, założycielka Hetman Nieruchomości",
    documentsAlt: "Podpisywanie dokumentów w biurze Hetman Nieruchomości",
  },
  focus: {
    // PLACEHOLDER
    eyebrow: "Nasza specjalizacja",
    title: "Nie boimy się trudnych stanów prawnych.",
    accent: "Prostujemy to, co wydaje się nie do uratowania.",
    text: "Tam, gdzie inni widzą ryzyko, my widzimy plan działania. Przeprowadzamy gruntowną analizę, porządkujemy dokumentację i przygotowujemy nieruchomość tak, aby transakcja była w pełni bezpieczna dla obu stron.",
    note: "Dla nas to chleb powszedni.",
    items: [
      "Zadłużone mieszkania",
      "Skomplikowane sprawy spadkowe",
      "Niejasności w księgach wieczystych",
    ],
    contractAlt: "Podpisywanie umowy dotyczącej nieruchomości",
    paperworkAlt: "Dokumentacja nieruchomości przygotowana do transakcji",
  },
  contact: {
    // PLACEHOLDER
    eyebrow: "Masz pytania?",
    title: "Chcesz wiedzieć więcej?",
    accent: "Porozmawiajmy.",
    text: "Opowiedz nam o swojej sytuacji. Powiemy wprost, jak możemy pomóc, i zaproponujemy konkretny plan działania.",
    cta: "Skontaktuj się z nami",
    href: CONTACT_PATH,
    labels: { mail: "E-mail", phone: "Telefon", office: "Biuro" },
  },
} as const;
