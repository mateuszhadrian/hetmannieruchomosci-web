# Indeks dokumentacji — status plików

> Konwencja jak w szablonie projektu: każdy plik `.md`
> bezpośrednio w `docs/` ma tu wpis ze statusem. **Dodajesz nowy plik do
> `docs/`? Dopisz go tutaj.** Zmieniasz decyzję opisaną w którymś
> dokumencie? Zaktualizuj jego status i ten indeks.
>
> **Repo jest publiczne.** Katalogi `docs/kb/` (baza wiedzy) i
> `docs/plan/` (instrukcja wykonawcza i prompty) są w `.gitignore`
> i istnieją tylko lokalnie — kopia źródłowa leży w
> `~/Projects/hetmannieruchomosci/draftdata/`. W gicie są wyłącznie
> dokumenty o kodzie. Do plików śledzonych nie
> przenosimy z niej wartości danych wrażliwych, warunków handlowych ani
> opisów praktyk klientki; odsyłamy sekcją („part3 §1.3").
>
> Podkatalog `design/` = referencje designu (eksport HTML v8) — poza
> indeksem, patrz `design/README.md`.

## ✅ Aktualne — źródła prawdy (śledzone w git)

| Plik                                          | Czego dotyczy                                                                                                                                                                                                                  |
| --------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `daily-workflow.md`                           | **Codzienny proces pracy**: feature branch → `/test` → PR → checki → merge → auto-deploy; konwencja commitów i scope'y; zakazy (`git add .`, `data/*.json` pisze bot); przypadek „commit bota syncu na main"; hotfix; awarie     |
| `optional-todos.md`                           | **Zadania cykliczne i świadomie odłożone**: rotacja tokenu bota, przegląd zużycia transformacji obrazów, backup R2, kontrola harmonogramu syncu, pozycje odłożone osobną decyzją                                                 |
| `placeholdery-tresci.md`                      | **Lista tekstów-draftów i placeholderów** z adresem pliku i osobą zamykającą (powstaje przy domknięciu Etapów 4–5, zamykana w kroku 7.7)                                                                                         |
| `analiza-*.md`                                | **Mini-analizy części** (powstają w Etapach 4–5, po jednej na część): decyzje portu z designu, sekcja „Rozjazdy design ↔ baza wiedzy", lista rzeczy do sprawdzenia na telefonie                                                  |
| `analiza-chrome.md` | **Mini-analiza 4.1 (chrome globalny)**: inwentarz navbara, wariantu „/", bottom sheetu i stopki z designu; rozjazdy R1–R10 (m.in. siedziba i e-mail w stopce wg bazy wiedzy); kontrakty testów i zrzutów; lista PLACEHOLDER |
| `analiza-formularze-a.md` | **Mini-analiza 5A (`/kontakt/` i `/sprzedaj-z-nami/` z formularzami)** — zaakceptowana 2026-10-03 (Q1–Q8 wg rekomendacji), PR 1 ZMERGOWANY (PR #25, 2026-10-03), PR 2 ZMERGOWANY (PR #26, 2026-10-04): podział na dwa PR-y (wspólna mechanika + kontakt, potem zgłoszenie nieruchomości); inwentarz obu widoków per breakpoint; rozjazdy F1–F23 (lokalizacja, pokoje, wartości słownika w kaflach radio, mapa bez kadrowania i karta pod mapą, sloty, kolory AA, pasek nad hero, hero bez reveala); czego design nie ma (stany błędów, potwierdzenie, błąd serwera, antyspam, bez JS); kontrakt endpointu z polem `form`, maile A i B; kontrakty i testy (unit, e2e na atrapach, visual), budżet, PLACEHOLDER, telefon, pytania Q1–Q8; §10 uzupełnienia po PR 1: F24–F35 (`aria-describedby` tylko przy błędzie, stopka w zrzutach niezależna od treści widoku, mapa jako element LCP), budżet zmierzony, weryfikacja, kroki poza kodem; §11 uzupełnienia po PR 2: F37–F47 (prop paska `overHero` i próg z wysokości hero, `MotionGate`, pomiar kontrastu hero, pozycja startowa parallaxu w CSS, `FormChoice`, potwierdzenie bez numeru), budżet, weryfikacja, lista na telefon |
| `analiza-formularze-b.md` | **Mini-analiza 5B (zapytanie o ofertę na detalu i `/praca/` z CV)** — zaakceptowana 2026-10-04 (Q1–Q8 wg rekomendacji), PR 1 ZMERGOWANY (PR #27, 2026-10-04), PR 2 ZMERGOWANY (PR #29, 2026-10-04; `/praca/` z limitem CV jako jedną stałą — pomiar czasu procesora później, na gotowej funkcji): podział na dwa PR-y; inwentarz formularza w `oferta.html` (ciemne tło) i `praca.html` (pole pliku); rozjazdy F48–F70 (treść startowa wiadomości, zgoda D21, dane oferty w mailu z indeksu, pasek dolny a formularz, zgody rekrutacyjne, limit i typ CV, nazwa i MIME załącznika); czego design nie ma (progi rozmiaru żądania, maile C i D, załącznik wg reguł pomiaru CPU, ciemny wariant ramki, pole pliku, wariant bloku zgód); kontrakty i testy, budżet (wspólny arkusz na trasie ofert), ryzyka platformy, PLACEHOLDER, telefon (wybór pliku na iOS i Androidzie), pytania Q1–Q8; §10 uzupełnienia po PR 1: F71–F80 (cel powrotu bez JS, 411, błąd pola bez opakowania, przycisk bez arkusza treściowego, pomiar kontrastu ciemnego wariantu), budżet zmierzony, wpływ dodatkowego arkusza na FCP / LCP, weryfikacja, lista na telefon; §11 uzupełnienia po PR 2: F81–F92 (natywne pole pliku na strefie, reguły pliku poza bundlem pozostałych formularzy, rozjaśnienie zdjęcia pod paskiem z pomiaru kontrastu, stan wyłączonego przełącznika, treść żądania z doklejonym załącznikiem), budżet, weryfikacja, lista na telefon, opis pomiaru limitu CV |
| `analiza-home.md` | **Mini-analiza 4.4 (strona główna)**: inwentarz hero i sekcji 01–05 per breakpoint, ruch (film → zdjęcie, zoom, reveale, parallax); rozjazdy H1–H17 (obraz priorytetowy zamiast tła, MP4 + WebM, kafle ofert z danych, sloty kontaktowe, kontrast miedzi, kadr pionowy plakatu); kontrakty i testy; budżet z policzonym `total` desktop dla wideo; PLACEHOLDER; telefon; pytania Q1–Q9 (zaakceptowane wg rekomendacji); §10 uzupełnienia po implementacji: H14 pomiar kontrastu hero, H18 element LCP = `h1`, H19–H25, budżet zmierzony, weryfikacja |
| `analiza-o-nas.md` | **Mini-analiza 4.5 (`/o-nas/`)** — zaakceptowana 2026-10-04 (Q1–Q6 wg rekomendacji), ZMERGOWANA (PR #30, 2026-10-04): inwentarz hero, historii, specjalizacji i kontaktu per breakpoint; rozjazdy A1–A14 (dwa warianty nagłówka historii — wstawiony desktopowy, liczby jako wartości do potwierdzenia, jedna treść specjalizacji, sloty kontaktowe, znacznik paska na kadrze zdjęcia, kolory AA); czego design nie ma (pas liczb na telefonie); kontrakty i testy, budżet, PLACEHOLDER, telefon, pytania Q1–Q6; §10 uzupełnienia: A15–A22 (pomiar kontrastu z liczbami, wartości `data-px="-1"` i `data-px="top"` we wspólnym module ruchu, odstępy hero ograniczone wysokością okna), budżet zmierzony, weryfikacja, lista na telefon |
| `analiza-oferta.md` | **Mini-analiza 4.3 (detal oferty + 404 świadoma ofert)**: podział (a) układ/galeria/dane/osadzenia/mapa/kontakt/meta i (b) lightbox/druk/404; inwentarz `oferta.html` per sekcja; rozjazdy R1–R20 (`joanna@`, mapa bez kadrowania i bez trybu interaktywnego, plakietki na hero, miniatura filmu z R2, sharery jako linki, lightbox-sheet, Omnibus, „Dostępne od"); deklaratywna lista wierszy `details-rows.ts`; kontrakty i testy; budżet; PLACEHOLDER; telefon; §10 uzupełnienia po (a); §11 uzupełnienia po (b): R35–R42 (404 w szablonie, powłoka lightboxa w `LightboxShell.astro`, sheet/modal, blok zdjęć do druku), budżet z chunkiem lightboxa, lekcje, telefon |
| `analiza-oferty.md` | **Mini-analiza 4.2 (`/oferty/`)**: podział na PR-y (a) trasy SSG + karta + lista, (b) wyspa Preact i filtry (§12: plan i uzupełnienia po (b) — hydratacja na markupie SSR, draft panelu, `targetPath`, R18–R23, pomiar budżetu, propozycja fixture'u), (c) mobile i stany brzegowe (§13: sheety poza vdom wyspy jako drugi root Preact, jeden `SearchPanel` w dwóch hostach, R28–R33, stany brzegowe); inwentarz listy, panelu filtrów, karty, paginacji, CTA i sheetów z designu; rozjazdy R1–R16 (etykieta „Lokal komercyjny", bez presetów, bez grayscale, plakietka „Wynajęte", winda „Nie", grupowanie ceny); tabela filtr → pole indeksu → reguła → test; decyzje M3, HTML wszystkie karty, budżet wyspy, LHCI; kontrakty testów; PLACEHOLDER |
| `analiza-uslugi.md` | **Mini-analiza 4.6 (`/uslugi/`)** — zaakceptowana 2026-10-04 (Q1–Q7 wg rekomendacji), zakodowana na gałęzi `feat/uslugi`: inwentarz hero z trzema wejściami do sekcji, „Sprzedaję", „Kupuję" i „Pomoc prawna" per breakpoint; rozjazdy SV1–SV16 (dwa brzmienia trzeciego wejścia hero i przycisku telefonu, pasy CTA jako część sekcji, zdjęcia w różnych miejscach per próg, kotwice bez sufiksów z korektą pozycji po wejściu z adresu, kadr pionowy i rozdzielczość zdjęcia hero, parallax kadru pierwszego ekranu, kolory AA, pomiar kontrastu); kontrakty i testy, budżet, PLACEHOLDER, telefon, pytania Q1–Q7; §10 uzupełnienia: SV17–SV31 (tryb `data-px="top"` z pozycji kadru w dokumencie, odsłanianie bloków po skoku kotwicy, pomiar kontrastu z liczbami w trzech silnikach), budżet zmierzony, weryfikacja, lista na telefon |

## 🔒 Tylko lokalnie — `docs/plan/` (poza git)

| Plik | Czego dotyczy |
| --- | --- |
| `plan/hetmannieruchomosci-web-creation-process.md` | **Instrukcja wykonawcza** budowy strony: Część A (checklista), Część B (Etapy 0–9, w tym Etap 2 „dane" i wymienna sekcja przełączenia domeny), Część C (praca z EstiCRM + checklista testów klientki), Część D (backupy), Część E (sprawy poza kodem), zastrzeżenia do decyzji, mapa otwartych kwestii |
| `plan/etap-4-prompty.md` | **Prompty startowe** części 4.1–4.7 i 5A–5B: kontekst wspólny, definition of done, szablon promptu korekty po testach klientki |
| `plan/prompt-start-realizacji.md` | **Prompt startowy Etapu 0** + szablon promptu dla sesji Etapów 2, 3, 6 i kroku 7.6 |
| `plan/prompt-s2a.md` | Prompt sesji S2a (Etap 2, kroki 2.1–2.3) — wykonany 2026-09-30 (PR #1–#2) |
| `plan/prompt-s2b.md` | Prompt sesji S2b (Etap 2, kroki 2.4–2.7) — wykonany 2026-10-01 (PR #5) |
| `plan/prompt-s2c.md` | Prompt sesji S2c (Etap 2, kroki 2.8–2.11) — wykonany 2026-10-01 (PR #7–#10; fixture i pierwszy sync 2026-10-02) |
| `plan/prompt-etap-3.md` | Prompt sesji Etapu 3 (testy/CI na szkielecie) — wykonany 2026-10-02 (PR #11 + commit budżetów LHCI) |
| `plan/prompt-etap-4-1.md` | Prompt sesji 4.1 (chrome globalny: navbar, wariant „/", bottom sheet, stopka) + porządek po pierwszym cronie syncu — wykonany 2026-10-02 (PR #13) |
| `plan/prompt-etap-4-2.md` | Prompt sesji 4.2 (a) (`/oferty/`: trasy SSG, karta, lista bez wyspy, indeks JSON; bramka startowa + porządek po cronie) — wykonany 2026-10-02 (PR #14) |
| `plan/prompt-etap-4-2b.md` | Prompt sesji 4.2 (b) (wyspa Preact i filtry) z bezpiecznikiem crona — wykonany 2026-10-02 (PR #16, #17) |
| `plan/prompt-etap-4-2c.md` | Prompt sesji 4.2 (c) (sheety mobile, siatka/lista, stany brzegowe) — wykonany 2026-10-02 (PR #18 progi TBT, PR #19) |
| `plan/prompt-etap-4-3.md` | Prompt sesji 4.3 (detal oferty + 404) z bramką startową (próg `script` LHCI, wpis WYKONANY 4.2 c) i klauzulą o zaległym cronie — wykonany 2026-10-03 (PR #20 próg `script`, PR #21, poprawka #22) |
| `plan/prompt-etap-4-3b.md` | Prompt sesji 4.3 (b) (lightbox galerii na `overlay.ts`, arkusz druku, 404 świadoma ofert) z bramką startową — wykonany 2026-10-03 (PR #23) |
| `plan/prompt-etap-4-4.md` | Prompt sesji 4.4 (strona główna: hero z wideo przechodzącym w zdjęcie, sekcje 01–05, trzy kafle ofert z danych, reveale i parallax) z bramką startową i stanem po 4.3 (b) — wykonany 2026-10-03 (PR #24) |
| `plan/prompt-etap-5a.md` | Prompt sesji 5A (`/kontakt/` + `/sprzedaj-z-nami/` z formularzami; każdy widok osobnym PR-em) z bramką startową i stanem po 4.4 — PR 1 wykonany 2026-10-03 (PR #25) |
| `plan/prompt-etap-5a-2.md` | Prompt sesji 5A PR 2 (`/sprzedaj-z-nami/`: hero, 3 kroki, formularz „Zgłoś nieruchomość", ruch, wariant paska nad hero, bramka ruchu jako komponent) z bramką startową i stanem po PR 1 — PR 2 wykonany 2026-10-04 (PR #26) |
| `plan/prompt-etap-5b.md` | Prompt sesji 5B (zapytanie o ofertę + `/praca/`; dwa PR-y) z bramką startową i stanem po 5A — PR 1 wykonany 2026-10-04 (PR #27) |
| `plan/prompt-etap-5b-2.md` | Prompt sesji 5B PR 2 (`/praca/` z formularzem rekrutacyjnym i CV) z bramką startową i stanem po PR 1; limit CV jako jedna stała, pomiar z kroku 5.2 instrukcji później, na gotowej funkcji — PR 2 wykonany 2026-10-04 (PR #29) |
| `plan/prompt-etap-4-5.md` | Prompt sesji 4.5 (`/o-nas/`) z bramką startową i stanem po 5B PR 2 — wykonany 2026-10-04 (PR #30) |
| `plan/prompt-etap-4-6.md` | Prompt sesji 4.6 (`/uslugi/`) z bramką startową i stanem po 4.5 — zakodowana 2026-10-04 na gałęzi `feat/uslugi`; zostają baseline'y, PR i merge |
| `plan/prompt-etap-4-7.md` | Prompt sesji 4.7 (`/polityka-prywatnosci/` + domknięcie Etapów 4 i 5; dwa PR-y) z bramką startową i stanem po 4.6 — następna sesja (kolejność: 4.7 → blok chmury 5.1, 5.2, 5.5 → Etap 6) |
| `plan/rozmowa-z-joanna-etap-1.md` | Scenariusz rozmowy z klientką w Etapie 1 (Resend + wizyta w home.pl), krok po kroku |

## 🔒 Tylko lokalnie — `docs/kb/` (poza git)

| Plik                                                                                | Czego dotyczy                                                                                                                         |
| ----------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| `kb/hetman-baza-wiedzy-part1.md`                                                    | **Źródło nadrzędne (całość poza ofertami):** klient, fazy, architektura, formularze, polityka, DNS, dostępy, decyzje D01–D28, D39–D41 |
| `kb/hetman-baza-wiedzy-part2.md`                                                    | **Źródło nadrzędne dla ofert:** obecna strona, model danych, wyszukiwarka, detal, zdjęcia, lokalizacje, decyzje D29–D38, inwentarz designu |
| `kb/hetman-baza-wiedzy-part3.md`                                                    | **Źródło nadrzędne dla danych z EstiAPI:** katalog pól, allow-lista, schemat `Offer`, status i widoczność, sync, specyfikacja maili. Przy różnicach w szczegółach danych obowiązuje ten plik |
| `kb/formularz-kontakt.md`, `kb/formularz-sprzedaj-z-nami.md`, `kb/formularze-wspolne.md` | Specyfikacje pól, komunikatów i zgód formularzy                                                                                  |
| `kb/polityka-struktura.md`                                                          | Struktura sekcji polityki prywatności i wzorzec strony                                                                                |
| `kb/uwagi-joanny.md`                                                                | Zgłoszenia klientki z testów na podglądzie (Etap 7) z klasyfikacją                                                                    |
| `kb/rejestr-konfiguracji.md`                                                        | Nazwy zasobów w chmurze (bez wartości sekretów) — Część D                                                                             |

## Kolejność lektury dla nowej sesji

1. `CLAUDE.md` (korzeń repo) — zasady twarde i „Stan projektu".
2. Ten indeks.
3. Sekcja bieżącego etapu w `plan/hetmannieruchomosci-web-creation-process.md`.
4. Sekcje bazy wiedzy wskazane w tym etapie (`docs/kb/`).
5. Dla Etapów 4–5: `plan/etap-4-prompty.md` → kontekst wspólny.
