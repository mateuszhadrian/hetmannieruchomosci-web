# Placeholdery treści — co jest robocze i kto to zamyka

> **Status:** AKTUALNE (2026-10-05, po Etapach 4 i 5 — kod). Lista
> wszystkich tekstów-draftów i wartości oznaczonych w kodzie znacznikiem
> `PLACEHOLDER`, z adresem pliku i osobą, która je zamyka. Zamknięcie =
> potwierdzenie albo zmiana brzmienia ORAZ usunięcie znacznika w kodzie.
> **Bramka wyjścia przed przełączeniem domeny** (finalizacja treści wg
> instrukcji, krok 7.7): `grep -rn "PLACEHOLDER" src` nie zwraca nic.
> Stan dziś: 87 znaczników w 15 plikach.
>
> Teksty pochodzą z designu (dane przykładowe — design to wygląd, nie
> treść) albo powstały przy budowie widoków. Teksty formularzy ze
> specyfikacji w bazie wiedzy NIE są placeholderami i nie mają
> znaczników.

Zmiana brzmienia = zmiana w pliku `*-copy.ts` (testy czytają teksty
stamtąd, więc same się dostosują) + regeneracja zrzutów wizualnych widoku
w tym samym PR. Zmiana długości tekstu nad zdjęciem albo na szkle =
ponowny pomiar kontrastu nie jest potrzebny, ale sprawdź łamanie wierszy
na 320 px.

## 1. Decyzje klientki — najpierw te (zmieniają treść, nie tylko potwierdzają)

### 1.1 Warianty do wyboru (design ma dwa brzmienia, wstawione jedno)

| Gdzie | Wstawione | Drugi wariant | Plik |
| --- | --- | --- | --- |
| `/o-nas/`, nagłówek sekcji „Historia" | „Biuro, które powstało z prostej potrzeby. / Słuchać i brać odpowiedzialność." | „10 lat na rynku. 4 lata pod własnym szyldem. / Setki rozwiązanych problemów." | `src/components/sections/about/about-copy.ts` (`history.title`, `history.accent`) |
| `/uslugi/`, trzecie wejście hero | nadtytuł „Nie planuję transakcji" + „Potrzebuję pomocy prawnej" | „Potrzebujesz tylko pomocy prawnej?" | `src/components/sections/services/services-copy.ts` (`hero.entries[2]`) |
| `/uslugi/`, przycisk telefonu w pasie CTA „Sprzedaję" | „Zadzwoń i umów wycenę" | „Zadzwoń" | `services-copy.ts` (`sell.cta.call`) |
| „/", akapit hero | desktop: „Agencja łącząca praktyków rynku poznańskiego."; telefon: „Agencja łącząca praktyków rynku. Sprzedaż, wynajem, wsparcie prawne." | — (dwa brzmienia żyją obok siebie; do potwierdzenia albo ujednolicenia) | `src/components/sections/home/home-copy.ts` (`hero.leadDesktop`, `hero.leadMobile`) |

### 1.2 Wartości i deklaracje do potwierdzenia (fakty, nie styl)

| Deklaracja | Gdzie | Plik |
| --- | --- | --- |
| Liczby: „10 lat na poznańskim rynku", „4 lata pod własnym szyldem", „setki rozwiązanych spraw" | `/o-nas/` (pas liczb hero), „/" (sekcja „O nas": „10", „4" oraz zdanie „Od dekady… od czterech lat…") | `about-copy.ts` (`hero.stats`), `home-copy.ts` (`about.stats`, `about.text`) |
| „Pierwsza rozmowa nic nie kosztuje" | `/uslugi/`, blok zamykający „Pomocy prawnej" | `services-copy.ts` (`legal.cta.text`) |
| „Dostęp do systemu MLS" — baza ofert niepublikowanych na portalach | `/uslugi/`, lista „Kupuję" | `services-copy.ts` (`buy.items`) |
| „Stworzyliśmy zespół ekspertów" | `/o-nas/`, drugi akapit historii | `about-copy.ts` (`history.paragraphs`) — **uwaga:** polityka prywatności mówi dziś, że biuro nie zatrudnia pracowników ani współpracowników z dostępem do danych; oba zdania muszą być prawdziwe jednocześnie |
| Czas odpowiedzi „3 dni roboczych" na ekranach potwierdzenia — zostaje czy wariant „zwykle tego samego dnia, najpóźniej w ciągu 3 dni roboczych" | formularze kontaktu, zgłoszenia nieruchomości, zapytania o ofertę | `src/components/forms/forms-copy.ts` (`RESPONSE_TIME` — bez znacznika: wartość ustalona, otwarte jest tylko brzmienie; instrukcja, krok 7.7) |
| Pisownia nazwy w stopce: „© … Hetman Nieruchomości" (design) czy „HETMAN" (rejestr) | stopka | `src/components/Footer.astro` (`copyright`) |

## 2. Polityka prywatności — klientka i jej prawnik

Cała treść `/polityka-prywatnosci/` jest projektem (`POLICY_DRAFT` w
`src/components/sections/policy/policy-config.ts`). Osiem znaczników
w tekście, lista pozycji przyjętych domyślnie i pytania bez odpowiedzi:
**`docs/analiza-polityka.md` §12**. Pliki ze znacznikiem:
`policy-config.ts`, `PolicyBody.astro`, `PolicyTodo.astro` (komponent
znika razem z ostatnim znacznikiem). Do tego brzmienie zgody na przyszłe
rekrutacje: `src/lib/contact-form.ts` (`FUTURE_RECRUITMENT_CONSENT`) —
polityka cytuje tę stałą.

## 3. Teksty robocze według widoku — do potwierdzenia przez klientkę

„Cały plik" = wszystkie teksty widoku są brzmieniem z designu albo
roboczym; znaczniki stoją przy grupach kluczy.

| Widok | Plik | Zakres |
| --- | --- | --- |
| Stopka (każda strona) | `src/components/Footer.astro` | hasło („Nieruchomości, dokumenty i sprawy prawne — w jednym miejscu."), przycisk „Skontaktuj się z nami", pisownia nazwy w ©; linia wykonawcy („Realizacja: …") — **zamyka Mateusz** |
| Strona główna | `src/components/sections/home/home-copy.ts` (+ komentarz w `HomeAbout.astro`) | cały plik: hero, „O nas", „Oferty", „Usługi" (trzy kafle), „Sprzedaj z nami" (cztery kroki), „Kontakt" |
| `/oferty/` — lista | `src/lib/offers/offers-ui.ts` (`UI`, `PANEL`, `EDGE`) | „Zdjęcia wkrótce", CTA pod listą („Nie znalazłeś?" …), podpowiedzi w polach filtrów („np. Milczańska", „np. garaż, ogród", „np. SW376101", „Miejscowość lub dzielnica"), podpowiedź pod „Więcej filtrów", teksty stanów brzegowych (nieznany rodzaj ofert, błąd wczytania, wczytywanie opisów) |
| `/oferty/` — stan bez ofert | `src/components/offers/SearchIsland.tsx` | jeden komunikat („Aktualnie nie mamy ofert w tej kategorii…") |
| Detal oferty | `offers-ui.ts` (`DETAIL`) | etykiety przycisków i sekcji („Wszystkie zdjęcia", „Skopiuj link", „Skopiowano", „Drukuj / PDF", „Czytaj więcej", „Zwiń", „Odtwórz film", „Rozpocznij spacer", „Otwórz w mapach", „Wróć do listy ofert"), nota o odtwarzaczu YouTube, sekcja kontaktu („Kontakt w sprawie oferty", „Zapytaj o tę ofertę"), stopka galerii („Zainteresowała Cię ta oferta?") |
| 404 pod adresem oferty | `offers-ui.ts` (`DETAIL.nf*`) | „Ta oferta jest już niedostępna", akapit, wariant bez aktywnych ofert, „Najnowsze oferty" |
| `/kontakt/` | `src/components/sections/contact/contact-copy.ts` | eyebrow, nagłówek, akapit; opis mapy dla czytników ekranu; informacja dla przeglądarek bez JavaScriptu |
| `/sprzedaj-z-nami/` | `src/components/sections/sell/sell-copy.ts`; `forms-copy.ts` (`SPRZEDAJ_FORM_COPY.lead`, `.call`) | hero (eyebrow, nagłówek, akapit, przycisk), opis zdjęcia, trzy kroki; akapit pod nagłówkiem formularza, „Wolisz przez telefon?" |
| `/o-nas/` | `src/components/sections/about/about-copy.ts` | cały plik: hero, historia (+ wariant z §1.1), specjalizacja, kontakt |
| `/uslugi/` | `src/components/sections/services/services-copy.ts` | cały plik: hero i trzy wejścia, „Sprzedaję" (5 pozycji), „Kupuję" (5), „Pomoc prawna" (6), dwa pasy CTA, blok zamykający |
| `/praca/` | `src/components/sections/jobs/jobs-copy.ts`; `forms-copy.ts` (`PRACA_FORM_COPY`) | cały widok i cały blok tekstów formularza rekrutacyjnego (etykiety, komunikaty o pliku, potwierdzenie, „Wolisz mailem?") |
| Zapytanie o ofertę | `forms-copy.ts` (`OFERTA_FORM_COPY.frame`) | teksty ramki formularza (cel przetwarzania w nocie, przycisk, komunikat błędu, potwierdzenie) |

## 4. Teksty techniczne — zamyka Mateusz (potwierdzenie brzmienia wystarczy)

| Tekst | Plik |
| --- | --- |
| Dopisek „(opcjonalnie)" przy polach, etykieta „Wysyłanie…", informacja dla przeglądarek bez JavaScriptu | `forms-copy.ts` (`FORM_COPY.optional`, `.sending`, `.noJs`) |
| Szablon meta description list ofert (szlif razem z SEO w Etapie 6) | `offers-ui.ts` (`listDescription`) |
| Linia wykonawcy w stopce (brzmienie i adres) | `Footer.astro` (`madeBy*`) |

## 5. Poza znacznikami — treści, które też czekają

- **Ikony i obraz podglądu linków** są tymczasowe (źródła rastrowe) —
  Etap 6, nie treść klientki.
- **Zdjęcie hero `/uslugi/`** — ostrzejszy plik to prośba do autora
  designu (`docs/optional-todos.md`).
- **Limit CV** w dopisku pola pliku liczy się ze stałej; ostateczna
  wartość po pomiarze na platformie (krok 5.2) — klientce podajemy ją
  dopiero wtedy.

## 6. Jak zamykać

1. Odpowiedzi klientki zbieraj w czasie jej testów na podglądzie
   (Etap 7); pozycje z §1 warto wysłać wcześniej jedną wiadomością —
   część zmienia nagłówki.
2. Wdrożenie: zmiana tekstu w pliku z tabeli, usunięcie znacznika,
   `pnpm test:unit && pnpm build && pnpm test:e2e` dla widoku, potem oba
   komplety zrzutów wizualnych widoku w tym samym PR.
3. Polityka: po przeglądzie prawnika — usunięcie znaczników `PolicyTodo`,
   `POLICY_EFFECTIVE`, `POLICY_UPDATED`, `POLICY_VERSION`, na końcu
   `POLICY_DRAFT = false` (testy pilnują kolejności).
4. Kontrola końcowa: `grep -rn "PLACEHOLDER" src` — pusto.
