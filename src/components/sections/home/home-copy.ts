// Teksty strony głównej w jednym miejscu (komponenty sekcji + testy e2e).
// PLACEHOLDER (U9): brzmienie z designu, do potwierdzenia przez klientkę
// w kroku 7.7 — lista w docs/analiza-home.md §7. Nie są placeholderami:
// adres biura (BUSINESS), godziny, telefon i e-mail (sloty).
import {
  ABOUT_PATH,
  CONTACT_PATH,
  OFFERS_PATH,
  SELL_PATH,
  SERVICES_PATH,
} from "../../../lib/routes";

export const HOME_COPY = {
  hero: {
    // PLACEHOLDER
    eyebrow: "Agencja nieruchomości · Poznań",
    heading:
      "Nieruchomości w Poznaniu i okolicach. Doświadczenie, które daje pewność.",
    // PLACEHOLDER — DWA brzmienia leadu w designie (H4): desktop krótszy
    // (resztę niosą kolumny u dołu), telefon dłuższy
    leadDesktop: "Agencja łącząca praktyków rynku poznańskiego.",
    leadMobile:
      "Agencja łącząca praktyków rynku. Sprzedaż, wynajem, wsparcie prawne.",
    ctaOffers: "Zobacz oferty",
    ctaSell: "Sprzedaj z nami",
    columns: [
      { title: "Sprzedaż", text: "Wycena, przygotowanie, negocjacje" },
      { title: "Wynajem", text: "Sprawdzeni najemcy, bezpieczne umowy" },
      {
        title: "Wsparcie prawne",
        text: "Stan prawny, spadki, trudne przypadki",
      },
    ],
  },
  about: {
    // PLACEHOLDER
    eyebrow: "O nas",
    title: "Praktycy poznańskiego rynku.",
    accent: "Twoje bezpieczeństwo na pierwszym miejscu.",
    text: "Od dekady działamy na rynku Poznania i okolic, od czterech lat pod własnym szyldem. Nie boimy się trudnych stanów prawnych — zadłużonych mieszkań, spraw spadkowych, niejasnych ksiąg wieczystych. Bierzemy odpowiedzialność za cały proces, żebyś Ty mógł zachować spokój.",
    // PLACEHOLDER — WARTOŚCI liczb do potwierdzenia (H15)
    stats: [
      { value: "10", label: "lat na rynku" },
      { value: "4", label: "lata pod własnym szyldem" },
    ],
    cta: "Więcej o nas",
    href: ABOUT_PATH,
    imageAlt:
      "Rozmowa doradcy Hetman Nieruchomości z klientami przy dokumentach",
  },
  offers: {
    // PLACEHOLDER
    eyebrow: "Oferty",
    title: "Mieszkania, domy i lokale.",
    accent: "Każda oferta z pełnym stanem prawnym.",
    text: "Zanim oferta trafi na stronę, sprawdzamy księgę wieczystą, zadłużenie i dokumenty. Wiesz dokładnie, co kupujesz — jeszcze przed pierwszym spotkaniem.",
    cta: "Przeglądaj oferty",
    href: OFFERS_PATH,
    /** etykieta listy kafli dla czytników */
    listLabel: "Najnowsze oferty",
  },
  services: {
    // PLACEHOLDER
    eyebrow: "Usługi",
    title: "Prowadzimy przez całą transakcję.",
    accent: "Od pierwszego dokumentu do klucza w drzwiach.",
    text: "Sprzedajesz, kupujesz czy utknąłeś w papierach — wybierz swoją ścieżkę i zobacz, co robimy za Ciebie.",
    more: "Zobacz",
    // kotwice sekcji /uslugi/ (SERVICES_ANCHORS w services-config.ts)
    items: [
      {
        title: "Sprzedaję lub wynajmuję",
        text: "Dokumenty, wycena, przygotowanie nieruchomości, bezpieczna finalizacja.",
        href: `${SERVICES_PATH}#sprzedaje`,
      },
      {
        title: "Kupuję lub szukam najmu",
        text: "Wyszukiwanie, prezentacje, weryfikacja stanu technicznego i prawnego.",
        href: `${SERVICES_PATH}#kupuje`,
      },
      {
        title: "Pomoc prawna",
        text: "Spadki, zadłużenia, nieuregulowane księgi wieczyste — prostujemy sprawy.",
        href: `${SERVICES_PATH}#pomoc-prawna`,
      },
    ],
    imageAlt: "Doradcy Hetman Nieruchomości omawiają dokumenty transakcji",
  },
  sell: {
    // PLACEHOLDER
    eyebrow: "Sprzedaj z nami",
    title: "Sprzedaż bez ryzyka w papierach.",
    accent: "Formalności bierzemy na siebie.",
    text: "Sprawdzamy stan prawny, kompletujemy dokumentację i reprezentujemy Cię w urzędach. Ty nie tracisz czasu ani pieniędzy na błąd w dokumentach.",
    caption:
      "Jeden agent przeprowadzi Cię od pierwszych dokumentów aż po akt notarialny.",
    steps: [
      {
        title: "Analiza prawna i techniczna",
        text: "Księga wieczysta, zadłużenie, zgodność dokumentów ze stanem faktycznym.",
      },
      {
        title: "Dokumenty i urzędy",
        text: "Kompletujemy papiery i reprezentujemy Cię w urzędach, sądach i spółdzielni.",
      },
      {
        title: "Wycena i plan sprzedaży",
        text: "Analiza cenowa, sesja zdjęciowa, portale i budżet reklamowy pod Twoją nieruchomość.",
      },
      {
        title: "Bezpieczna finalizacja",
        text: "Weryfikacja kupującego, nadzór u notariusza, protokół zdawczo-odbiorczy.",
      },
    ],
    cta: "Sprzedaj z nami",
    href: SELL_PATH,
    imageAlt:
      "Doradca Hetman Nieruchomości podpisuje dokumenty sprzedaży nieruchomości",
  },
  contact: {
    // PLACEHOLDER
    eyebrow: "Kontakt",
    title: "Porozmawiajmy,",
    accent: "zanim cokolwiek zdecydujesz.",
    text: "Jedna rozmowa bez zobowiązań wystarczy, żeby wiedzieć, na czym stoisz.",
    cta: "Przejdź do kontaktu",
    href: CONTACT_PATH,
    // godziny potwierdzone w bazie wiedzy (jak stopka) — nie placeholder
    hours: "Pon.–pt. 11:00–17:00",
  },
} as const;
