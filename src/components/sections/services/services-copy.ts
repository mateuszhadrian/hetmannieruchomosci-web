// Teksty widoku /uslugi/ w jednym miejscu (importują je sekcje i testy).
// PLACEHOLDER (U9): brzmienie z designu, do potwierdzenia przez klientkę
// w kroku 7.7 — lista w docs/analiza-uslugi.md §7. Nie jest placeholderem
// numer telefonu (slot).
import { CONTACT_PATH, OFFERS_PATH, SELL_PATH } from "../../../lib/routes";
import { SERVICES_ANCHORS } from "./services-config";

export interface ServiceItem {
  title: string;
  text: string;
}

export const SERVICES_COPY = {
  hero: {
    // PLACEHOLDER
    eyebrow: "Usługi",
    title: "Profesjonalne pośrednictwo",
    accent: "od A do Z.",
    lead: "Gwarantujemy spokój, chronimy Twój czas i zabezpieczamy Twój kapitał na każdym etapie.",
    entriesLabel: "Wybierz swoją sytuację",
    // PLACEHOLDER — trzecie wejście ma w designie DWA warianty (analiza
    // SV1): wstawiony desktopowy; mobilny: „Potrzebujesz tylko pomocy
    // prawnej?"
    entries: [
      {
        kicker: "Mam nieruchomość",
        title: "Sprzedaję lub wynajmuję",
        href: `#${SERVICES_ANCHORS.sell}`,
      },
      {
        kicker: "Szukam nieruchomości",
        title: "Kupuję lub szukam najmu",
        href: `#${SERVICES_ANCHORS.buy}`,
      },
      {
        kicker: "Nie planuję transakcji",
        title: "Potrzebuję pomocy prawnej",
        href: `#${SERVICES_ANCHORS.legal}`,
      },
    ],
  },
  sell: {
    // PLACEHOLDER
    eyebrow: "Sprzedaję lub wynajmuję",
    title: "Chcesz sprzedać lub wynająć?",
    accent: "Zdejmiemy ten ciężar z Twoich barków.",
    text: "Z chęcią zajmiemy się całym procesem. Oszczędzasz czas, a my maksymalizujemy Twój zysk i dbamy o bezpieczeństwo.",
    imageAlt: "Przekazanie kluczy do nieruchomości po podpisaniu umowy",
    items: [
      {
        title: "Wycena i Strategia",
        text: "Sporządzamy rzetelną analizę cenową. Oceniamy potencjał, dobieramy budżet reklamowy i planujemy optymalną strategię działania.",
      },
      {
        title: "Home Staging i Marketing",
        text: "Twoja nieruchomość musi błyszczeć. Wykonujemy niezbędne aranżacje, organizujemy profesjonalną sesję zdjęciową, materiały wideo i spacery wirtualne.",
      },
      {
        title: "Prostowanie dokumentacji",
        text: "Sprawdzamy stan techniczny i prawny. Jeśli sytuacja tego wymaga – reprezentujemy Cię w urzędach i sądach, kompletując pełną teczkę dokumentów.",
      },
      {
        title: "Weryfikacja kupującego",
        text: "Sprawdzamy zdolność finansową, wypłacalność i prawdziwe intencje drugiej strony. Z nami wiesz, z kim podpisujesz umowę.",
      },
      {
        title: "Asysta przy finalizacji",
        text: "Nadzorujemy spotkania u notariusza, analizujemy zapisy w aktach i asystujemy przy protokole zdawczo-odbiorczym. Znamy wagę dokumentu pt. „Ustalenia Stron”.",
      },
    ] satisfies ServiceItem[],
    cta: {
      eyebrow: "Pierwszy krok",
      text: "Zadzwoń i sprawdź, jak możemy przygotować Twoją nieruchomość do transakcji — albo zostaw nam szczegóły w formularzu.",
      // PLACEHOLDER — DWA warianty w designie (analiza SV2): wstawiony
      // desktopowy; mobilny: „Zadzwoń"
      call: "Zadzwoń i umów wycenę",
      formKicker: "Formularz",
      form: "Sprzedaj z nami",
      formHref: SELL_PATH,
    },
  },
  buy: {
    // PLACEHOLDER
    eyebrow: "Kupuję lub szukam najmu",
    title: "Szukasz nieruchomości?",
    accent: "Znajdziemy tę właściwą, nawet jeśli nie ma jej w internecie.",
    text: "My nie tylko słyszymy, czego potrzebujesz – my słuchamy. W oparciu o setki przeprowadzonych rozmów podpowiadamy, na co zwrócić uwagę, by uniknąć kosztownych błędów.",
    firstAlt: "Doradczyni prezentuje klientowi wnętrze mieszkania",
    secondAlt: "Doradczyni pokazuje klientce wnętrze mieszkania",
    items: [
      {
        title: "Analiza rynku i Twoich potrzeb",
        text: "Metraż, lokalizacja, infrastruktura – ustalamy priorytety. Dopasowujemy opcje do Twojego stylu życia w Poznaniu i okolicach.",
      },
      {
        title: "Dostęp do systemu MLS",
        text: "To nasza ukryta karta. Jako profesjonaliści mamy dostęp do bazy ofert niepublikowanych na portalach (System MLS). Pokazujemy Ci przestrzenie, zanim dowie się o nich konkurencja.",
      },
      {
        title: "Selekcja i wizje lokalne",
        text: "Osobiście weryfikujemy to, co inni obiecują na zdjęciach. Jedziesz z nami tylko do tych miejsc, które faktycznie spełniają Twoje kryteria. Oszczędzamy Twój czas.",
      },
      {
        title: "Audyt techniczny i prawny",
        text: "Zanim cokolwiek podpiszesz, sprawdzamy księgi wieczyste, zadłużenia, opłaty czynszowe i podstawę prawną zbywcy. Zero przykrych niespodzianek.",
      },
      {
        title: "Bezpieczna finalizacja",
        text: "Negocjujemy najlepsze warunki, weryfikujemy akty notarialne i jesteśmy z Tobą aż do momentu przekazania kluczy i spisania protokołu zdawczo-odbiorczego.",
      },
    ] satisfies ServiceItem[],
    cta: {
      eyebrow: "Twoje nowe miejsce",
      text: "Porozmawiajmy o Twoim nowym miejscu.",
      contact: "Skontaktuj się z nami",
      contactHref: CONTACT_PATH,
      offers: "Przeglądaj oferty",
      offersHref: OFFERS_PATH,
    },
  },
  legal: {
    // PLACEHOLDER
    eyebrow: "Pomoc prawna",
    title: "Nie musisz sprzedawać,",
    accent: "żeby skorzystać z naszej pomocy.",
    text: "Czasem problemem nie jest transakcja, tylko to, co ją blokuje: nieaktualny wpis w księdze wieczystej, nieuregulowany spadek, dług, którego nikt nie chciał tknąć. Zajmujemy się takimi sprawami osobno — nawet jeśli nie planujesz sprzedaży ani zakupu.",
    firstAlt: "Podpisywanie dokumentów przy biurku",
    secondAlt: "Dokumenty analizowane przy lampie na biurku",
    items: [
      {
        title: "Analiza stanu prawnego",
        text: "Sprawdzamy księgę wieczystą, podstawę nabycia, obciążenia, hipoteki i zgodność dokumentów ze stanem faktycznym. Na koniec wiesz dokładnie, co masz i co trzeba naprawić.",
      },
      {
        title: "Sprawy spadkowe i współwłasność",
        text: "Prowadzimy Cię przez stwierdzenie nabycia spadku, dział spadku i zniesienie współwłasności. Porządkujemy sytuacje, w których właścicieli jest wielu, a zgody nie ma.",
      },
      {
        title: "Zadłużenia i obciążenia",
        text: "Ustalamy stan zobowiązań, kontaktujemy się z wierzycielami i szukamy rozwiązania, które zdejmie z nieruchomości blokadę — zanim sprawa trafi na licytację.",
      },
      {
        title: "Reprezentacja w urzędach i sądach",
        text: "Kompletujemy dokumenty i występujemy w Twoim imieniu w urzędzie miasta, spółdzielni, wydziale ksiąg wieczystych i sądzie. Ty nie musisz brać wolnego w pracy.",
      },
      {
        title: "Mediacje i negocjacje",
        text: "Rozmawiamy tam, gdzie strony przestały ze sobą rozmawiać: rodzina, wspólnicy, najemca i właściciel. Szukamy porozumienia, które da się zapisać i wykonać.",
      },
      {
        title: "Weryfikacja umów i aktów",
        text: "Analizujemy umowy przedwstępne, najmu i akty notarialne, zanim je podpiszesz. Pokazujemy, co w nich naprawdę stoi i co warto zmienić.",
      },
    ] satisfies ServiceItem[],
    cta: {
      eyebrow: "Pierwsza rozmowa",
      // PLACEHOLDER — deklaracja bezpłatnej rozmowy do potwierdzenia
      // przez klientkę
      text: "Opisz nam swoją sytuację — pierwsza rozmowa nic nie kosztuje i zwykle wystarcza, żeby powiedzieć, czy da się to rozwiązać.",
      contact: "Opisz swoją sprawę",
      contactHref: CONTACT_PATH,
    },
  },
} as const;
