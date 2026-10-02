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
| `plan/prompt-etap-4-1.md` | Prompt sesji 4.1 (chrome globalny: navbar, wariant „/", bottom sheet, stopka) + porządek po pierwszym cronie syncu — w toku (2026-10-02) |
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
