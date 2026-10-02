# Zadania cykliczne i świadomie odłożone

> **Status:** AKTUALNE. Lista rzeczy, które nie są częścią żadnego etapu
> budowy, ale ktoś musi o nich pamiętać. Nazwy zasobów w chmurze
> i wartości sekretów NIE są tu zapisywane (repo jest publiczne) — żyją
> w menedżerze haseł i w lokalnym rejestrze konfiguracji.

## Cykliczne

| Co                                                        | Jak często                        | Po co                                                                                                  |
| --------------------------------------------------------- | --------------------------------- | ------------------------------------------------------------------------------------------------------ |
| Kontrola harmonogramu nocnego syncu                       | raz w miesiącu                    | harmonogram w repo publicznym bywa wyłączany po dłuższym braku aktywności; sprawdź, czy workflow biega; docelowo sekret `HEARTBEAT_URL` (usługa do wyboru) |
| Rotacja tokenu konta technicznego (bota syncu)            | przed datą wygaśnięcia tokenu     | wygasły token = sync nie zapisze danych; strona stoi na ostatniej dobrej wersji                        |
| Przegląd zużycia transformacji obrazów                    | raz w miesiącu, po każdym dużym przyroście ofert | darmowy próg jest wspólny dla całego konta; po przekroczeniu nowe rozmiary zdjęć przestają powstawać |
| Kopia zapasowa zasobnika mediów                           | raz na kwartał                    | oryginały zdjęć ofert są archiwum niezależnym od źródła danych                                         |
| Przegląd zależności (`pnpm outdated`)                     | raz na kwartał                    | `playwright` i `@playwright/test` podnosić PARĄ; po bumpie nowe baseline'y                             |
| Przegląd budżetów Lighthouse                              | po każdym domkniętym etapie widoków | zacieśnienie progu = osobny commit, decyzja Mateusza, po pomiarze w CI                               |

## Świadomie odłożone

| Co                                                        | Do kiedy / warunek                              |
| --------------------------------------------------------- | ----------------------------------------------- |
| Wektor znaku, `favicon.svg`, finalne ikony i og-image     | Etap 6                                          |
| Realne budżety Lighthouse (dziś progi luźne, tymczasowe)  | po pomiarze na runnerze CI (workflow `lhci-measure.yml`, Etap 3) — wpis median do `lighthouserc*.cjs` osobnym commitem; od tej chwili ratchet |
| Klucz publiczny Turnstile (dziś pusty)                    | Etap 5                                          |
| Przepięcie hosta mediów `MEDIA_BASE` na domenę klientki (dziś host tymczasowy) | Etap 8                                     |
| Dopasowanie modułu ruchu do reveali z designu             | pierwszy widok z animacją wejścia (Etap 4)      |
| Re-enkodowanie `hero.webm` (2,0 MB wobec 0,9 MB w MP4)    | Etap 4.4, razem z osadzeniem wideo              |
| Panel treści, blog, przełącznik „Praca" w panelu          | faza 2 — poza zakresem tej budowy               |
