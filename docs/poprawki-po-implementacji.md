# Poprawki po całej implementacji — lista do planu

> **Status:** AKTUALNE (2026-10-05). JEDNA lista pozycji „do oceny na
> urządzeniach", zebrana z mini-analiz części 4.4–4.7 i 5A–5B oraz
> z `docs/optional-todos.md`. To materiał do planu poprawek Mateusza —
> **nic z tej listy nie jest naprawiane przy okazji innych zmian**
> (ustalenie z 2026-10-04: usterki i drobne decyzje wyglądu zbieramy po
> całej implementacji i wdrażamy jednym planem, osobnymi PR-ami).
>
> Każda pozycja to rozwiązanie, które DZIAŁA i przeszło testy — pytanie
> brzmi „czy tak ma zostać", nie „czy to błąd". Kolumna „Skąd" wskazuje
> decyzję i liczby; kolumna „Gdyby zmieniać" — najmniejszą korektę.
> Zmiana krycia, koloru tekstu albo zdjęcia w pozycjach oznaczonych
> **(kontrast)** wymaga ponownego pomiaru kontrastu wg metody z analizy
> widoku — tamte wartości nie są gustem, tylko wynikiem pomiaru AA.

## 0. Usterki zgłoszone z testów na `nowa.` i na telefonie

(pusto — pytanie o testy `/uslugi/` i `/o-nas/` zostało bez odpowiedzi
w sesjach 4.6 i 4.7; dopisuj tutaj: widok · urządzenie i przeglądarka ·
co widać · czego się spodziewałeś)

## 1. Całość serwisu

| # | Co ocenić | Skąd | Gdyby zmieniać |
| --- | --- | --- | --- |
| 1.1 | Przycisk „wstecz" systemu przy otwartej nakładce (lightbox galerii, sheety filtrów i sortowania, menu): dziś opuszcza stronę zamiast zamknąć nakładkę | `analiza-oferta.md` §11.8 pkt 4; `optional-todos.md` | obsługa `popstate` w `overlay.ts` — osobna decyzja (mechanika nakładek jest wspólna) |
| 1.2 | Przejścia między stronami po zmianie w `BaseLayout` (4.7): wejście z zewnątrz bez mrugnięcia, przejście wewnątrz serwisu z krótkim pojawieniem treści; także „wstecz" i odświeżenie | `analiza-polityka.md` §10.2 PP14, §10.6 | czas przejścia to jedna reguła CSS w `BaseLayout.astro` |
| 1.3 | Stopka na telefonie: przyciski „Zadzwoń" / „Napisz", pastylki mapy strony, wiersz danych firmy — czytelność i cele dotyku | `analiza-chrome.md` | — |

## 2. Strona główna

| # | Co ocenić | Skąd | Gdyby zmieniać |
| --- | --- | --- | --- |
| 2.1 | **(kontrast)** Szkło karty hero .45 (design .24), ciemny pas akapitu na telefonie .55, przyciemnienie pod `h1` — czy odejście od „lekkiego szkła" jest akceptowalne | `analiza-home.md` §10.2 H14, §10.6 pkt 10, §10.7 pkt 1 | jaśniejszy tekst na mniejszym polu, nie jaśniejsze szkło |
| 2.2 | Film hero na realnym łączu (tylko od 1025 px): przenikanie zdjęcie → pierwsza klatka i koniec filmu; jakość obrazu na dużym monitorze | `analiza-home.md` §10.6 pkt 11, §10.7 pkt 4 | łagodniejsza kompresja (ok. +140 KB; `total` desktop z 70 % do ok. 82 % progu) |
| 2.3 | Zoom hero przy przewijaniu (1,30) — czy nie za mocny | `analiza-home.md` §10.7 pkt 3 | jedna stała `HOME_HERO_ZOOM` |
| 2.4 | Kadr pionowy plakatu na telefonie; tryb oszczędzania energii iOS (film nie startuje — ma zostać zdjęcie) | `analiza-home.md` §8 | inny wycinek kadru: jedno wywołanie `optimize-images.mjs` |
| 2.5 | Karuzela kafli ofert na telefonie i tablecie: przeciągnięcie o jeden kafel, wyjście do krawędzi ekranu | `analiza-home.md` §10.6 pkt 13 | — |
| 2.6 | Reveale przy szybkim przewijaniu: żaden blok nie zostaje pusty | `analiza-home.md` §10.6 pkt 12 | — |

## 3. Oferty — lista i detal

| # | Co ocenić | Skąd | Gdyby zmieniać |
| --- | --- | --- | --- |
| 3.1 | Sheety „Filtruj" i „Sortuj": przeciągnięcie w dół, przewijanie długiej listy filtrów, klawiatura ekranowa a stopka sheetu | `analiza-oferty.md` §13 | — |
| 3.2 | Galeria detalu i lightbox: swipe o jeden kadr, pasek dolny a zwijany pasek adresu Safari | `analiza-oferta.md` §11.7 | — |
| 3.3 | **(kontrast)** Formularz zapytania na ciemnym tle: białe pola na granacie, autouzupełnianie przeglądarki, obrys błędu w słońcu, znaczek checkboxa na iOS | `analiza-formularze-b.md` §10.2 F78, §10.6 pkt 3–4 | krycia w `forms.css` (wariant ciemny) |
| 3.4 | Sekcja kontaktu detalu na telefonie: długość (karta agenta → formularz → powrót), „Napisz" z paska dolnego — czy widać, że niżej jest formularz; pasek dolny znika na czas pisania | `analiza-formularze-b.md` §10.6 pkt 1–2 | cel „Napisz" (`#kontakt` → `#formularz`) |
| 3.5 | Detal działki: zapas LCP na telefonie najmniejszy w serwisie (ok. 0,4–0,5 s do progu w pomiarach lokalnych) — obserwacja po pomiarze na runnerze | wpisy 4.3 i 5B w `CLAUDE.md` | po rozdzieleniu arkuszy (domknięcie Etapów 4 i 5) detal ładuje o jeden arkusz mniej |

## 4. Formularze

| # | Co ocenić | Skąd | Gdyby zmieniać |
| --- | --- | --- | --- |
| 4.1 | `/kontakt/`: karta danych POD mapą, bez efektu szkła — czy bryła „mapa + karta" jest akceptowalna (napis atrybucji mapy nie może być zasłonięty) | `analiza-formularze-a.md` §10.6 pkt 10 | wygląd karty; położenie zostaje |
| 4.2 | Obrys pól w ostrym świetle; znaczek checkboxa zgody na iOS; klawisz „Dalej" / „Gotowe" między polami | `analiza-formularze-a.md` §10.6 pkt 11–13 | grubość i kolor obrysu w `forms.css` |
| 4.3 | **(kontrast)** `/sprzedaj-z-nami/`: gradient hero na telefonie mocniejszy niż w designie | `analiza-formularze-a.md` §11.2 F40, §11.7 pkt 1 | inny kolor eyebrow, nie jaśniejszy gradient |
| 4.4 | `/sprzedaj-z-nami/`: kafle wyboru na wąskim ekranie („Lokal komercyjny" w dwóch liniach), blok „Szczegóły nieruchomości" (rozwijanie, klawiatury liczbowe) | `analiza-formularze-a.md` §11.6 pkt 4–5 | — |
| 4.5 | `/praca/`: wybór pliku na iOS i Androidzie przy natywnym polu na całej strefie (arkusz systemowy: pliki, zdjęcia, aparat) | `analiza-formularze-b.md` §11.2 F81, §11.8 pkt 1 | powrót do strefy-etykiety |
| 4.6 | **(kontrast)** `/praca/`: rozjaśniony pas zdjęcia pod paskiem na telefonie i tablecie | `analiza-formularze-b.md` §11.2 F91, §11.8 pkt 2 | inny kadr zdjęcia |
| 4.7 | `/praca/` na komputerze: upuszczenie pliku OBOK strefy otwiera go w karcie przeglądarki | `analiza-formularze-b.md` §11.8 pkt 4 | blokada upuszczania na poziomie strony |

## 5. Strony treściowe

| # | Co ocenić | Skąd | Gdyby zmieniać |
| --- | --- | --- | --- |
| 5.1 | `/o-nas/`: pas trzech liczb na telefonie (element spoza designu) | `analiza-o-nas.md` §10.8 | ukrycie pasa poniżej 1025 px |
| 5.2 | **(kontrast)** `/o-nas/`: jaśniejsze szkło karty hero i przyciemniony górny pas zdjęcia na telefonie | `analiza-o-nas.md` §10.2, §10.8 | — |
| 5.3 | `/o-nas/`: odstępy hero na niskim oknie laptopa (karta i pas liczb w pierwszym ekranie); kadr zdjęcia „umowa" na desktopie | `analiza-o-nas.md` §10.8 | `object-position` kadru |
| 5.4 | **(kontrast)** `/uslugi/`: przyciemnienie zdjęcia pod wejściami hero na telefonie; ciemna karta i ciemny pas wejść na desktopie (design: jasne szkło); przyciemniony pas zdjęcia pod paskiem | `analiza-uslugi.md` §10.2 SV21–SV24, §10.8 | — |
| 5.5 | **(kontrast)** `/uslugi/`: mocniejszy gradient pasa CTA „Sprzedaję"; blok zamykający „Pomocy prawnej" na telefonie (zdjęcie widać głównie u góry) | `analiza-uslugi.md` §10.2 SV25–SV26, §10.8 | — |
| 5.6 | `/uslugi/`: trzecie wejście hero na telefonie jako lżejszy link z samym tytułem | `analiza-uslugi.md` §10.8 | wariant brzmienia — `placeholdery-tresci.md` §1.1 |
| 5.7 | `/uslugi/`: miękkość zdjęcia hero (źródło 1440×617 powiększane do pełnego okna) | `analiza-uslugi.md` §10.7 pkt 1; `optional-todos.md` | ostrzejszy plik od autora designu (min. 2400 px szerokości) |
| 5.8 | `/uslugi/` i polityka: skok kotwicą na telefonie — sekcja pod paskiem, „wstecz" wraca | `analiza-uslugi.md` §10.6; `analiza-polityka.md` §8 | — |
| 5.9 | Polityka: tabela okresów i znaczniki projektu na 320–390 px; ramka „Prawo sprzeciwu"; wydruk do PDF | `analiza-polityka.md` §8, §10.6 | — |

## 6. Jak z tej listy zrobić plan

1. Przejdź listę na telefonie (iOS Safari, Android Chrome) i na laptopie
   13″; przy każdej pozycji zapisz: zostaje / zmienić (jak) / usterka.
2. Usterki dopisz do §0 z nazwą urządzenia.
3. Pozycje „zmienić" pogrupuj według widoku — jeden PR na widok, bo
   każda zmiana wyglądu to oba komplety zrzutów wizualnych tego widoku.
4. Pozycje **(kontrast)**: najpierw pomiar wariantu, potem decyzja.
5. Brzmienia tekstów zamyka osobna lista: `docs/placeholdery-tresci.md`.
