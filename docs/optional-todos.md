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
| Klucz publiczny Turnstile (dziś pusty — `src/components/forms/form-config.ts`); sekrety funkcji formularzy i opcjonalny adresat podglądów `KONTAKT_TO` | po założeniu zasobów w chmurze (krok 5.1 instrukcji); do tego czasu formularze na podglądzie kończą wysyłkę komunikatem błędu i nic nie wysyłają |
| Przepięcie hosta mediów `MEDIA_BASE` na domenę klientki (dziś host tymczasowy) | Etap 8                                     |
| Rozdzielenie arkuszy listy rodzaju i detalu oferty (jedna trasa `[...path]` linkuje CSS obu widoków na obu; od 5B także wspólny arkusz formularzy — czwarty plik blokujący render, ok. +70–80 ms FCP na detalu w pomiarze lokalnym: `docs/analiza-formularze-b.md` §10.3) | porządkowy PR domknięcia Etapów 4 + 5 — decyzja 2026-10-04 (Q8 analizy 5B): koszt przyjęty, rozdzielenie w PR porządkowym; wcześniej tylko wtedy, gdy job `lighthouse` padnie na LCP detalu |
| Przycisk wstecz systemu przy otwartej nakładce (lightbox, sheety): dziś opuszcza stronę, bo `overlay.ts` nie obsługuje `popstate` | po teście na fizycznym telefonie po 4.3 (b); zmiana = osobna decyzja o `overlay.ts` |
| Niestabilny zrzut `chrome-footer` na `webkit-iphone-14` pod obciążeniem równoległym: WebKit rysuje czasem logo stopki w niższej jakości skalowania (ok. 1 na 10 przebiegów lokalnie, także na main sprzed 5A PR 2; w izolacji zielony) | porządkowy PR domknięcia Etapów 4 + 5 (potwierdzone 2026-10-04) — utwardzenie speca bez zmiany baseline'ów; do tego czasu czerwony `chrome-footer` bez zmiany stopki = powtórka speca w izolacji |
| Etykieta `ubuntu-latest` w workflowach (CI, baseline'y linux, sync, smoke, pomiar LHCI) przechodzi na nową wersję systemu od 2026-10-19 (ostrzeżenie w logu CI z 2026-10-04) — zrzuty linuksowe mogą się rozjechać bez zmiany kodu | decyzja 2026-10-04: workflowy z przeglądarkami i pomiarem (CI, baseline'y linux, pomiar LHCI, smoke) dostają przypiętą wersję `ubuntu-24.04` osobnym małym PR-em (`chore/ci-pin-runner`) przed 2026-10-19; późniejsze podniesienie wersji = świadoma zmiana z regeneracją kompletu linux w tym samym PR |
| Panel treści, blog, przełącznik „Praca" w panelu          | faza 2 — poza zakresem tej budowy               |
