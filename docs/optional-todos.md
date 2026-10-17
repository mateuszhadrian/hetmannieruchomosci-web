# Zadania cykliczne i świadomie odłożone

> **Status:** AKTUALNE. Lista rzeczy, które nie są częścią żadnego etapu
> budowy, ale ktoś musi o nich pamiętać. Nazwy zasobów w chmurze
> i wartości sekretów NIE są tu zapisywane (repo jest publiczne) — żyją
> w menedżerze haseł i w lokalnym rejestrze konfiguracji.

## Cykliczne

| Co                                                        | Jak często                        | Po co                                                                                                  |
| --------------------------------------------------------- | --------------------------------- | ------------------------------------------------------------------------------------------------------ |
| Kontrola harmonogramu nocnego syncu                       | raz w miesiącu                    | harmonogram w repo publicznym bywa wyłączany po dłuższym braku aktywności; sprawdź, czy workflow biega; docelowo sekret `HEARTBEAT_URL` (usługa do wyboru). Obserwacja 2026-10-02: bieg planowy wystartował 08:27 UTC zamiast 02:15 UTC (opóźnienie ok. 6 h — znana cecha harmonogramów GitHuba); harmonogram bez zmian, zmiana godziny to osobna decyzja (Z5). Bieg 2026-10-03: start 08:03 UTC (opóźnienie ok. 6 h, powtarzalne) — harmonogram nadal bez zmian, decyzja Z5 otwarta |
| Rotacja tokenu konta technicznego (bota syncu)            | przed datą wygaśnięcia tokenu     | wygasły token = sync nie zapisze danych; strona stoi na ostatniej dobrej wersji                        |
| Przegląd zużycia transformacji obrazów                    | raz w miesiącu, po każdym dużym przyroście ofert | darmowy próg jest wspólny dla całego konta; po przekroczeniu nowe rozmiary zdjęć przestają powstawać |
| Kopia zapasowa zasobnika mediów                           | raz na kwartał                    | oryginały zdjęć ofert są archiwum niezależnym od źródła danych                                         |
| Przegląd zależności (`pnpm outdated`)                     | raz na kwartał                    | `playwright` i `@playwright/test` podnosić PARĄ; po bumpie nowe baseline'y                             |
| Przegląd budżetów Lighthouse                              | po każdym domkniętym etapie widoków | zacieśnienie progu = osobny commit, decyzja Mateusza, po pomiarze w CI                               |
| Kontrola metryk funkcji formularzy (Pages → projekt → Metrics → Production → Errors) | raz w miesiącu i po każdej serii zgłoszeń z CV | pomiar 5.2 (2026-10-17): załącznik 2 MB kosztuje ok. 24 ms CPU (p99 55 ms) przy nominalnym limicie 10 ms planu Free — runtime toleruje to dziś bez błędów; pozycja „Exceeded CPU Time Limits" > 0 = decyzja: Workers Paid albo `CV_MAX_BYTES` = 1 MB (`docs/analiza-formularze-b.md` §11.7) |

## Świadomie odłożone

| Co                                                        | Do kiedy / warunek                              |
| --------------------------------------------------------- | ----------------------------------------------- |
| Wektor znaku, `favicon.svg`, finalne ikony i og-image     | Etap 6                                          |
| Przepięcie hosta mediów `MEDIA_BASE` na domenę klientki (dziś host tymczasowy) | Etap 8                                     |
| Przycisk wstecz systemu przy otwartej nakładce (lightbox, sheety): dziś opuszcza stronę, bo `overlay.ts` nie obsługuje `popstate` | po teście na fizycznym telefonie po 4.3 (b); zmiana = osobna decyzja o `overlay.ts` |
| Wersja systemu runnera CI: przypięte `ubuntu-24.04` (PR #28, 2026-10-04) w czterech workflowach z przeglądarkami i pomiarem (CI, baseline'y linux, pomiar LHCI, smoke); `sync.yml` na `ubuntu-latest` | podniesienie wersji = świadoma zmiana z regeneracją kompletu linux w tym samym PR |
| Krok 5.5 — kontrola czterech maili testowych wysłanych 2026-10-17 z `nowa.` na `biuro@` („TEST HADRIANM 5.5 A–D"): klientka przesyła je jako załączniki z programu pocztowego na komputerze → nagłówek `Authentication-Results` (SPF i DKIM pass dla `send.`), folder na komputerze i telefonie, układ maili (tabela w raporcie sesji bloku chmury: `Reply-To`, załącznik 2 MB w C, powierzchnia i cena w B, link i tytuł oferty w D) | najwcześniej 2026-10-21 (rozmowa z klientką); mail w spamie = blokada przed Etapem 7 (nadawca i odbiorca w tej samej domenie — plan: DMARC/alignment przed testami klientki) |
| `/praca/` — do oceny przy testach po całej implementacji (`docs/analiza-formularze-b.md` §11.8): wybór pliku na iOS i Androidzie przy natywnym polu na całej strefie (F81), wygląd rozjaśnionego pasa zdjęcia pod paskiem na telefonie i tablecie (F91), upuszczenie pliku obok strefy na komputerze | lista poprawek po zakończeniu widoków (decyzje 2026-10-04: rozwiązania zostają, ocena na urządzeniach) |
| `/o-nas/` — do oceny przy testach po całej implementacji (`docs/analiza-o-nas.md` §10.8): pas liczb na telefonie (element spoza designu), jaśniejsze szkło karty hero i przyciemniony górny pas zdjęcia na telefonie (z pomiaru kontrastu), odstępy hero na niskim oknie laptopa, kadr zdjęcia „umowa" na desktopie | lista poprawek po zakończeniu widoków (rozwiązania zostają, ocena na urządzeniach) |
| `/uslugi/` — do oceny przy testach po całej implementacji (`docs/analiza-uslugi.md` §10.8): przyciemnienie zdjęcia pod wejściami hero na telefonie, ciemna karta i ciemny pas wejść na desktopie (design: jasne szkło), przyciemniony górny pas zdjęcia pod paskiem, mocniejszy gradient pasa CTA „Sprzedaję", blok zamykający „Pomocy prawnej" na telefonie, trzecie wejście hero jako link z samym tytułem — wszystko z pomiaru kontrastu | lista poprawek po zakończeniu widoków (rozwiązania zostają, ocena na urządzeniach) |
| Zdjęcie hero `/uslugi/`: źródło 1440×617 — pełne okno 1920×1080 to powiększenie 1,75×, telefon @3× ok. 2,4× (obraz miękki) | ostrzejszy plik (min. 2400 px szerokości) = prośba do autora designu; podmiana: dwa wywołania `scripts/optimize-images.mjs` (`docs/design/README.md`) + regeneracja zrzutów `uslugi-*` |
| Polityka prywatności — projekt (`POLICY_DRAFT` w `src/components/sections/policy/policy-config.ts`): osiem znaczników w treści, przegląd prawnika klientki, data obowiązywania (`POLICY_EFFECTIVE`), podniesienie `POLICY_UPDATED` i `POLICY_VERSION` przy każdej zmianie treści; lista pytań: `docs/analiza-polityka.md` §12 | finalizacja treści przed przełączeniem domeny (krok 7.7 instrukcji); wyłączenie stałej wymaga zera znaczników — pilnują testy; każda zmiana treści = regeneracja zrzutów `polityka-*` |
| Polityka a stan strony — trzy kontrole poza kodem: (1) statystyka odwiedzin opisana w polityce jest włączana dopiero przy uruchomieniu strony pod domeną główną (dziś skrypt nie jest osadzony) — po włączeniu sprawdzić, że działa bez cookies; (2) ZROBIONE 2026-10-17: widget ochrony formularzy nie zapisuje cookies ani storage strony, tylko `localStorage` własnej ramki (`docs/analiza-polityka.md` §12.2 pkt 14) — powtórzyć po zmianie trybu widgetu; (3) polityka wymienia wykonawcę strony jako odbiorcę danych — powierzenie przetwarzania do wpisania w umowę o utrzymanie strony; (4) po włączeniu reguł ochrony na domenie głównej sprawdzić, że odpowiedzi serwera nadal nie ustawiają cookies (nagłówek `Set-Cookie`) | (1) i (4) Etap 8, (3) Etap 9 |
| Budżety Lighthouse po domknięciu Etapów 4 i 5: pomiar `lhci-measure.yml` na main (po merge'u PR-a porządkowego — rozdzielenie arkuszy zmienia LCP tras ofert) → propozycja progów z median; pierwsze liczby z runnera dla `/uslugi/`, `/o-nas/`, `/praca/`, `/sprzedaj-z-nami/`, `/kontakt/`, `/polityka-prywatnosci/` | osobny mały PR `chore/lhci-budgets`, decyzja Mateusza (`docs/analiza-domkniecie-4-5.md` §7) |
| Dwa nieimportowane obrazy w `src/assets/img/`: `onas-dokumentacja.webp` (strona używa wariantu `-m`) i `sprzedaj-doradca-m.webp` (zastąpiony kadrem `-tall`) — nie trafiają do builda | usunięcie przy najbliższej zmianie tych widoków albo wcale (`docs/analiza-domkniecie-4-5.md` §4) |
| Zrzut `not-found-top` różni się od baseline'u o ok. 830–880 px na `chromium-1920` i `firefox-desktop` od Etapu 4.1 (pod progiem projektu, test zielony) | regeneracja tego jednego zrzutu = świadoma zmiana baseline'u, osobna decyzja |
| Treści robocze i decyzje klientki (87 znaczników `PLACEHOLDER`, cztery warianty do wyboru, sześć wartości do potwierdzenia): `docs/placeholdery-tresci.md` | finalizacja treści przed przełączeniem domeny (krok 7.7 instrukcji); pozycje §1 warto wysłać klientce przed jej testami |
| Lista pozycji do oceny na urządzeniach po całej implementacji: `docs/poprawki-po-implementacji.md` (zbiera wpisy z analiz; wiersze `/praca/`, `/o-nas/`, `/uslugi/` wyżej zostają jako odsyłacze) | plan poprawek Mateusza po testach na `nowa.` i na telefonie — osobne PR-y per widok |
| Panel treści, blog, przełącznik „Praca" w panelu          | faza 2 — poza zakresem tej budowy               |

## Zamknięte w domknięciu Etapów 4 i 5 (2026-10-05, `docs/analiza-domkniecie-4-5.md`)

| Co                                                        | Wynik                                           |
| --------------------------------------------------------- | ----------------------------------------------- |
| Rozdzielenie arkuszy listy rodzaju i detalu oferty        | dwie trasy (`[...path].astro` — listy, `[kind]/[location]/[number].astro` — detale): lista 2 arkusze zamiast 4, detal 3 zamiast 4 |
| Niestabilny zrzut `chrome-footer` na `webkit-iphone-14`   | spec czeka dłużej po przewinięciu do stopki (opóźniona poprawa jakości skalowanego logo w WebKicie) — 0 z 120 przy 10 workerach, baseline bez zmian |
| Parallax hero `/sprzedaj-z-nami/` na `data-px="top"`      | decyzja: NIE zmieniamy — wzór CSS F41 zostaje   |
| `CollapsibleText.astro`, `collapsible.ts`, `SkeletonPage.astro`, `uslugi-hero-m.webp`, `uslugi-prawne2.webp` | usunięte |
| Komentarz w skrypcie bramki ruchu (F37)                   | komentarze poza skryptem inline; HTML czterech stron z ruchem mniejszy o 309 B |
| `/uslugi/` na wspólnym `content-anchor.ts`                | NIE — po pomiarze (+2 żądania na polityce, +1 na usługach); dwie kopie logiki z dopiskiem „W PARZE” |

## Zamknięte w bloku chmury formularzy (2026-10-17, PR #34)

| Co                                                        | Wynik                                           |
| --------------------------------------------------------- | ----------------------------------------------- |
| Klucz publiczny Turnstile, sekrety funkcji, binding KV, `KONTAKT_TO` w Preview, zgodność z Node (krok 5.1) | zasoby założone, klucz w `form-config.ts`; nazwy w lokalnym rejestrze konfiguracji; sondy na podglądzie: pułapka 200, bez tokenu 403 `turnstile`, `praca` bez pól 400 |
| Pomiar limitu CV na gotowej funkcji (krok 5.2)             | 11/11 wysyłek pliku 2 097 152 B bez błędu 1102, kodowanie `toBase64` — limit 2 MB zostaje (`docs/analiza-formularze-b.md` §11.7) |
| Kontrola zapisu widgetu w przeglądarce (polityka)         | zero cookies i pusty storage strony; zapis tylko w ramce dostawcy — treść polityki bez zmian |
