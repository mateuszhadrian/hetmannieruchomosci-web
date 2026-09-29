// Słownik PL-only. Mechanizm useTranslations zostaje uśpiony na jednym
// języku: Lang = "pl", zero martwych kluczy. Widoki portowane w Etapach
// 4–5 trzymają teksty INLINE w komponentach — tutaj zostają wyłącznie meta
// stron, których używają strony i testy. Tytuły wg designu; opisy meta =
// wersje robocze szkieletu, szlif per widok w Etapach 4–6.
export const defaultLang = "pl";

const BRAND = "Hetman Nieruchomości";

export const ui = {
  pl: {
    "meta.title": `${BRAND} — agencja nieruchomości w Poznaniu`,
    "meta.description":
      "Biuro nieruchomości w Poznaniu. Mieszkania, domy, działki i lokale na sprzedaż i wynajem w Poznaniu i okolicach.",
    "offersPage.title": `Oferty — ${BRAND}`,
    "offersPage.description":
      "Oferty nieruchomości w Poznaniu i okolicach: mieszkania, domy, działki i lokale komercyjne na sprzedaż i wynajem.",
    "sellPage.title": `Sprzedaj z nami — ${BRAND}`,
    "sellPage.description":
      "Chcesz sprzedać lub wynająć nieruchomość w Poznaniu? Zgłoś ją — zajmiemy się dokumentami, prezentacją i transakcją.",
    "aboutPage.title": `O nas — ${BRAND}`,
    "aboutPage.description":
      "Poznaj biuro Hetman Nieruchomości — pośrednictwo w obrocie nieruchomościami w Poznaniu i okolicach.",
    "servicesPage.title": `Usługi — ${BRAND}`,
    "servicesPage.description":
      "Usługi biura Hetman Nieruchomości: pośrednictwo w sprzedaży, wynajmie i zakupie nieruchomości oraz obsługa dokumentów.",
    "jobsPage.title": `Praca — ${BRAND}`,
    "jobsPage.description":
      "Dołącz do biura Hetman Nieruchomości w Poznaniu — wyślij swoje CV.",
    "contactPage.title": `Kontakt — ${BRAND}`,
    "contactPage.description":
      "Skontaktuj się z biurem Hetman Nieruchomości w Poznaniu — formularz kontaktowy, telefon i adres biura.",
    // Tytuł polityki jest KONTRAKTEM testu e2e — zmiana wymaga poprawki
    // w specu.
    "policyPage.title": `Polityka prywatności — ${BRAND}`,
    "policyPage.description":
      "Polityka prywatności serwisu hetmannieruchomosci.com — kto jest administratorem danych, jakie dane przetwarzamy, na jakiej podstawie, jak długo i jakie masz prawa.",
    // Strona 404 (src/pages/404.astro) — bez description: noindex.
    "notFoundPage.title": `Nie znaleziono strony — ${BRAND}`,
  },
} as const;
