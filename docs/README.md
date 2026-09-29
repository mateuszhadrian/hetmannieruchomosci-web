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

## 🔒 Tylko lokalnie — `docs/plan/` (poza git)

| Plik | Czego dotyczy |
| --- | --- |
| `plan/hetmannieruchomosci-web-creation-process.md` | **Instrukcja wykonawcza** budowy strony: Część A (checklista), Część B (Etapy 0–9, w tym Etap 2 „dane" i wymienna sekcja przełączenia domeny), Część C (praca z EstiCRM + checklista testów klientki), Część D (backupy), Część E (sprawy poza kodem), zastrzeżenia do decyzji, mapa otwartych kwestii |
| `plan/etap-4-prompty.md` | **Prompty startowe** części 4.1–4.7 i 5A–5B: kontekst wspólny, definition of done, szablon promptu korekty po testach klientki |
| `plan/prompt-start-realizacji.md` | **Prompt startowy Etapu 0** + szablon promptu dla sesji Etapów 2, 3, 6 i kroku 7.6 |

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
