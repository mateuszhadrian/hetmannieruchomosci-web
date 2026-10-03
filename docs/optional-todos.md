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

## Świadomie odłożone

| Co                                                        | Do kiedy / warunek                              |
| --------------------------------------------------------- | ----------------------------------------------- |
| Wektor znaku, `favicon.svg`, finalne ikony i og-image     | Etap 6                                          |
| Klucz publiczny Turnstile (dziś pusty)                    | Etap 5                                          |
| Przepięcie hosta mediów `MEDIA_BASE` na domenę klientki (dziś host tymczasowy) | Etap 8                                     |
| Rozdzielenie arkuszy listy rodzaju i detalu oferty (jedna trasa `[...path]` linkuje CSS obu widoków na obu) | porządkowy PR domknięcia Etapów 4 + 5 — do rozważenia razem z przeglądem budżetów |
| Przycisk wstecz systemu przy otwartej nakładce (lightbox, sheety): dziś opuszcza stronę, bo `overlay.ts` nie obsługuje `popstate` | po teście na fizycznym telefonie po 4.3 (b); zmiana = osobna decyzja o `overlay.ts` |
| Panel treści, blog, przełącznik „Praca" w panelu          | faza 2 — poza zakresem tej budowy               |
