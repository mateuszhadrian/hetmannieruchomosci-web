# Mini-analiza 5A — `/kontakt/` i `/sprzedaj-z-nami/` z formularzami

> **Status:** ZAAKCEPTOWANA 2026-10-03 (wszystkie rekomendacje Q1–Q8
> z §9). PR 1 (`feat/kontakt`: wspólna mechanika + `/kontakt/`)
> ZMERGOWANY (PR #25, 2026-10-03) — uzupełnienia w §10; PR 2
> (`feat/sprzedaj`: `/sprzedaj-z-nami/`) ZMERGOWANY (PR #26, 2026-10-04)
> — uzupełnienia w §11. Część 5A zamknięta; ciąg dalszy (zapytanie
> o ofertę, `/praca/`): `analiza-formularze-b.md`.
> Część 5A Etapu 5 wg instrukcji wykonawczej (dokument lokalny,
> `docs/plan/`):
> kroki 5.3 (kod wspólny), tabela 5A, 5.4 (testy); prompt §5A
> z `etap-4-prompty.md`. Referencje wyglądu:
> `docs/design/export/kontakt.html`, `sprzedaj-z-nami.html` (gałęzie
> `.br-m` i `.br-d`), `assets/js/site.js` §2 (formularz referencyjny nie
> wysyła danych), §4 (pasek nad hero), §10 (reveale, parallax),
> `assets/css/site.css` (`.fld:focus`). Baza wiedzy — odsyłacze sekcją,
> bez cytowania: part1 §4 („Formularze obecnej strony"), §8 (D19–D22),
> §9 (mapy); part3 §9.2 (specyfikacja maili), §9.3; `formularze-wspolne.md`,
> `formularz-kontakt.md` (§2 pola i komunikaty, §4 adres, §4a mapa),
> `formularz-sprzedaj-z-nami.md` (§2 pola, słowniki, komunikaty).
> Spójność z 4.1 (`analiza-chrome.md`: sloty R2/R3, stopka R1, wariant
> paska „/"), 4.3 (`analiza-oferta.md`: puste `[data-offer-inquiry]` na 5B)
> i 4.4 (`analiza-home.md`: prymitywy `sx-*`, bramka ruchu, H13 kolory AA,
> H14 pomiar kontrastu nad zdjęciem, H17 kadr pionowy, H26 WebKit/Linux).
>
> **Warunek startu:** kroki 5.1 (chmura) i 5.2 (pomiar CPU) NIE są
> wykonane (odpowiedź Mateusza 2026-10-03) — kod i testy stoją na
> atrapach, wysyłki rzeczywiste (5.5) przesuwają się za 5.1. Testy 4.4 na
> `nowa.` i na telefonie: bez usterek.

## 0. Zakres i podział

Dwa PR-y, w tej kolejności:

| PR | Gałąź | Zawartość |
| --- | --- | --- |
| 1 | `feat/kontakt` | **wspólna mechanika formularzy** (logika i walidacja per formularz, budowa maili A i B, endpoint z polem `form`, moduł kliencki, komponenty pól, style) + widok `/kontakt/` + porządki dokumentów po 4.4 |
| 2 | `feat/sprzedaj` (od main po merge'u PR 1) | widok `/sprzedaj-z-nami/` (hero, 3 kroki, formularz „Zgłoś nieruchomość"), ruch (`sell-motion.ts`), wydzielenie bramki ruchu do komponentu (Q5), ewentualnie wariant paska nad hero (Q3) |

Logika i szablon maila B (zgłoszenie nieruchomości) wchodzą już w PR 1 —
endpoint ma jeden kontrakt, a test unit „mail niesie powierzchnię
i cenę" nie powinien czekać na widok. PR 2 dokłada wyłącznie widok,
testy e2e/visual i ruch.

Poza zakresem (bez zmian): `/`, `/oferty/`, wyspa, detal, lightbox, 404,
zapytanie o ofertę i `/praca/` (5B), pozostałe trasy treściowe,
`overlay.ts`, sync, dane, fixture, progi LHCI, JSON-LD `/kontakt/`
(Etap 6). Chrome — bez zmian, z jednym wyjątkiem DO DECYZJI (Q3).

## 1. Inwentarz z designu

Elementy wspólne obu widoków: eyebrow (kreska + wersaliki), `h1`
dwukolorowy, akapit wprowadzający, biała karta formularza z `h2`
i akapitem, przycisk miedziany z promieniem `0 0 0 12–20 px`, stopka
chrome'u. Kontener 1360 px (desktop), kolumna 600 px (mobile i tablet).

### 1.1 `/kontakt/` (`kontakt.html`; bez `data-anim` — bez ruchu)

| Blok | Mobile < 1025 | Desktop ≥ 1025 |
| --- | --- | --- |
| Pasek | wariant stały (szkło) | wariant stały |
| Wstęp | eyebrow „Kontakt", `h1` „Kupujesz, sprzedajesz czy szukasz porady? **Porozmawiajmy.**" (24–42 px), akapit 36 ch | to samo, `h1` 34–54 px, akapit 52 ch, blok do 960 px |
| Mapa | pełna szerokość ekranu, pole 4:3 z `object-fit: cover` (pozycja 52 % 38 %), promień `0 0 0 64–96 px`, plakietka granatowa „Otwórz w mapach →" w prawym górnym rogu; cała mapa jest linkiem | lewa kolumna siatki 5,6fr / 6,4fr; pole 3:2 `cover` (pozycja 50 % 100 %), obrys, promień `0 0 0 36–56 px`, plakietka j.w. |
| Karta danych | szklana (`.39` + blur 22), NASUNIĘTA na dół mapy (ujemny margines 56–84 px); wiersze: Biuro (pełna szerokość), Telefon i Godziny otwarcia (dwie kolumny), E-mail (pełna szerokość); etykiety Archivo 11 px wersaliki | szklana, nasunięta 44–68 px; kolejność: Telefon (26–34 px), E-mail (17–21 px), kreska, Biuro i Godziny w dwóch kolumnach |
| Formularz | biała karta na pełną szerokość pod kartą danych: `h2` „Napisz do nas", akapit, pola jedno pod drugim: Imię i nazwisko → E-mail → Telefon → podpowiedź → Wiadomość → checkbox → nota → przycisk na pełną szerokość | prawa kolumna siatki: biała karta, E-mail i Telefon w jednym wierszu, przycisk do lewej |

### 1.2 `/sprzedaj-z-nami/` (`sprzedaj-z-nami.html`; `data-anim` — ruch)

| Blok | Mobile < 1025 | Desktop ≥ 1025 |
| --- | --- | --- |
| Pasek | wariant „nad hero" (`data-scroll-nav`: przezroczysty, jasne logo, przemalowanie pozycją scrolla) | to samo (`hn--home`) |
| Hero | pełna wysokość okna, zdjęcie `sprzedaj-doradca` (`cover`, pozycja 64 % 50 %), gradient granatowy pionowy `.42 → .94`, treść przy dolnej krawędzi: eyebrow „Sprzedaj z nami", `h1` „Chcesz sprzedać? **Zajmiemy się resztą.**" (28–46 px), akapit, przycisk „Wypełnij zgłoszenie" → kotwica formularza | 66 % wysokości okna, gradient skośny `.94 → .30`, treść do lewej (56 ch), `h1` 36–58 px |
| 3 kroki | lista `<ol>`: białe wiersze z miedzianą kreską z lewej, numer 01–03 (12 px), `h2` kroku („Zgłoszenie", „Wycena i plan", „Oględziny") + jedno zdanie | 3 kolumny: białe karty z miedzianą kreską u góry, numer 28–36 px |
| Formularz | biała sekcja na pełną szerokość, `h2` „Zgłoś nieruchomość" + akapit, kolumna 600 px: Typ nieruchomości (4 kafle radio 2×2) → Rodzaj transakcji (2 kafle) → Lokalizacja → Imię i nazwisko → Telefon → E-mail → podpowiedź → rozwijany blok „Szczegóły nieruchomości (opcjonalnie)" (`<details>`: powierzchnia, liczba pokoi, cena, dodatkowe informacje) → checkbox → nota → przycisk → „Wolisz przez telefon? numer" | kolumna 1000 px: kafle radio w jednym rzędzie, Lokalizacja i Imię w jednym wierszu, Telefon i E-mail w jednym wierszu, w rozwijanym bloku trzy pola w rzędzie + pole tekstowe |

### 1.3 Pola — wygląd wspólny

Etykieta nad polem (15 px, 600, granat), pole 52 / 54 px wysokości,
obrys `rgba(24,58,107,.24)`, bez promienia, tekst 16 px, fokus: obrys
miedziany + poświata (`.fld:focus`); kafel radio = etykieta z obrysem
i natywnym `input` 20 px (`accent-color` granat), hover obrys miedziany;
checkbox natywny 24 px; podpowiedź i nota 13 px `--muted`; link do
polityki podkreślony.

### 1.4 Ruch (§10 — tylko „Sprzedaj z nami")

Reveale bloków treści (22 px / 44 px + skala, kaskada na desktopie),
parallax zdjęcia tła hero. Skrypt designu sam taguje bloki, w tym treść
hero.

## 2. Rozjazdy — rozstrzygnięcia

Numeracja `F` (formularze). „Baza" = baza wiedzy projektu.

| # | Rozjazd | Rozstrzygnięcie | Źródło |
| --- | --- | --- | --- |
| F1 | „Lokalizacja" w designie wymagana (`required`), w bazie opcjonalna | → **Q1** (rekomendacja: opcjonalna, przeniesiona do bloku pól opcjonalnych) | `formularz-sprzedaj-z-nami.md` §2; instrukcja 5A |
| F2 | Pole „Liczba pokoi" jest w designie, nie ma go w bazie ani w specyfikacji maila | → **Q2** (rekomendacja: nie wchodzi) | j.w.; part3 §9.2 B |
| F3 | Typ i transakcja: design = kafle radio z wartościami słownymi i etykietą „Lokal"; baza = wartości słownika CRM, etykieta „Lokal komercyjny", pozycja „brak wyboru" | **wygląd z designu (kafle radio), wartości i etykiety z bazy:** `type` = 1–4, `transaction` = 131 / 132 (D16), etykieta „Lokal komercyjny", kolejność Mieszkanie → Dom → Działka → Lokal komercyjny. Radio nie ma pozycji startowej — brak zaznaczenia, `0` i wartość spoza słownika to dla walidacji to samo: „nie wybrano" | `formularz-sprzedaj-z-nami.md` §2; part1 D16 |
| F4 | Etykiety, placeholdery, podpowiedzi i nagłówki pól różnią się drobnymi brzmieniami (design: „Powierzchnia w m²", „Dodatkowe informacje", przykładowe wartości); design nie ma ŻADNYCH komunikatów błędów ani podpowiedzi przy cenie | teksty pól, placeholdery, podpowiedzi i komunikaty walidacji wg bazy (to specyfikacja treści formularzy); układ wg designu | `formularz-kontakt.md` §2, `formularz-sprzedaj-z-nami.md` §2 |
| F5 | Kolejność pary kontaktowej: w `kontakt.html` E-mail → Telefon, w `sprzedaj-z-nami.html` Telefon → E-mail | jedna kolejność w obu formularzach: **E-mail → Telefon** (jak w bazie i w `kontakt.html`) | `formularze-wspolne.md` §1 |
| F6 | Zgoda marketingowa: design ma brzmienie D21; pliki formularzy w bazie rekomendują wariant dłuższy | **brzmienie D21** (to, które dostała klientka; instrukcja 5.3). Dodatkowy argument: wariant dłuższy niesie adres e-mail wprost w HTML — wbrew kontraktowi antyscrapingowemu. Checkbox opcjonalny, odznaczony, bez gwiazdki; formularz wysyła się bez niego | part1 §8 D21; instrukcja 5.3 |
| F7 | Nota informacyjna „Sprzedaj z nami" — w designie inne zdanie o celu niż w bazie | brzmienie z bazy; nota osobno, bezpośrednio nad przyciskiem; link do polityki podkreślony (axe `link-in-text-block`) | `formularz-sprzedaj-z-nami.md` §2; `formularze-wspolne.md` §5–6 |
| F8 | Design polega na atrybucie `required` i dymkach przeglądarki | komunikaty w HTML, pokazywane przez CSS przy klasie `.err`; skrypt nadaje formularzowi `novalidate` (bez JS zostaje walidacja natywna); pola wymagane zachowują `required` jako semantykę; oznaczamy pola OPCJONALNE, nie wymagane | `formularze-wspolne.md` §1, §6 |
| F9 | **Mapa kontaktu:** design kadruje ją `object-fit: cover` (mobile ucina dół) i nasuwa szklaną kartę danych na dolną krawędź — a tam jest napis atrybucji (na telefonie zajmuje ok. 87 % szerokości obrazu, na desktopie ok. 64 %, od prawej) | **mapa w naturalnych proporcjach pliku** (880×694 / 1206×838, bez kadrowania), **karta danych POD mapą, bez nasunięcia**; promień lewego dolnego rogu przechodzi z mapy na kartę (motyw zostaje, róg mapy nie ucina napisu). Karta traci efekt szkła (nie ma pod nią mapy) — zostaje półprzezroczyste tło z obrysem → **Q6** | part1 §9; `formularz-kontakt.md` §4a |
| F10 | Link mapy: w bazie „wyznacz trasę" po współrzędnych, w designie i instrukcji „Otwórz w mapach" po adresie | etykieta „Otwórz w mapach", cel = zapytanie po adresie biura z `BUSINESS` — ten sam adres, który niesie stopka (jedno zachowanie w serwisie); zwykła kotwica, nic się nie ładuje przed kliknięciem | instrukcja 5A; analiza 4.1 §1.4 |
| F11 | Telefon i e-mail w karcie danych, „Wolisz przez telefon?" — jawne `tel:` / `mailto:` | sloty `a[data-tel]`, `a[data-mail="biuro"]` z `<span data-slot>`; numer w ekranie potwierdzenia i w komunikacie błędu serwera też przez slot. Bez JS wiersze slotów są ukryte; `<noscript>` wyjaśnia (pkt 3.6) | `contact-details.ts`; analiza 4.1 R2/R3 |
| F12 | Kolory poniżej AA (allowlista axe PUSTA): biały tekst na miedzi (przyciski), eyebrow miedziany na jasnym tle, miedziana fraza `h1` na `--bg`, tekst `#4a4844` spoza tokenów | jak H13: przycisk = tekst `--ink` (klasa `sx-btn`), eyebrow `--copper-text`, fraza `h1` na jasnym tle `--copper-dark`, na hero `--copper-light`; akapity `--slate` / `--muted`; numery kroków jako liczniki CSS (dekoracja) | analiza 4.4 H13, H16 |
| F13 | **Pasek nad hero:** design „Sprzedaj z nami" (a także „O nas" i „Usługi") ma wariant przezroczysty jak strona główna; chrome z 4.1 zna go wyłącznie dla „/" | → **Q3** (rekomendacja: mała, jawna zmiana chrome'u w PR 2) | analiza 4.1 §1.2; `site.js` §4 |
| F14 | Akapit hero obiecuje odpowiedź „zwykle tego samego dnia"; baza zna jedną deklarację czasu odpowiedzi w całym serwisie | → **Q4** (rekomendacja: akapit bez obietnicy czasu; liczba pada raz — na ekranie potwierdzenia) | `formularze-wspolne.md` §2; part1 §8 |
| F15 | Hero „Sprzedaj z nami" na telefonie to wysokie pole z `cover`; wariant `-m` kadru (1024×574) ma za mało wysokości | nowy kadr pionowy `sprzedaj-doradca-tall.webp` 720×816 (wycinek wokół pozycji 64 %: lewa krawędź 471 px), podawany poniżej 768 px; od 768 px plik 1456×816. Ten sam przepis co H17 | analiza 4.4 H17; `docs/design/README.md` |
| F16 | Design odsłania revealami także treść hero | **hero bez reveala** (`h1` i zdjęcie to kandydaci LCP); reveale od sekcji kroków w dół, `data-rv` wyłącznie na blokach nieinteraktywnych (kroki, nagłówek formularza, opakowanie formularza jako `soft`); parallax zdjęcia hero przez `.px-frame` | `sections.md`; analiza 4.4 H18, H22 |
| F17 | Tekst na zdjęciu hero (gradient `.42` u góry na telefonie) | pomiar kontrastu na zrzucie metodą H14 (axe zwraca „incomplete"); jeśli akapit albo eyebrow nie trzymają 4,5:1 — rośnie krycie gradientu, nie zmienia się kolor tekstu; liczby w „Uzupełnieniach" | analiza 4.4 §10.2 |
| F18 | Nagłówek formularza: design „Zgłoś nieruchomość" + własny akapit; baza ma nagłówek równy nazwie strony | układ z designu (`h1` strony niesie nazwę, `h2` formularza „Zgłoś nieruchomość" — tak też w instrukcji); akapit pod `h2` = PLACEHOLDER | instrukcja, tabela 5A |
| F19 | Nadawca maila: tabela part3 podaje adres w domenie głównej | **U7** — subdomena `send.` (stała już jest w kodzie); adresat `biuro@`, konfigurowalny (Q7) | instrukcja 5.3, Z10 |
| F20 | `Reply-To` przy samym telefonie: kod odziedziczony wstawia adres biura | nagłówek pomijany, gdy klient nie podał e-maila | part3 §9.2 |
| F21 | Kod odziedziczony: jedno pole „telefon LUB e-mail", lokalizacja w kontakcie, temat z imieniem, próg 10 znaków wiadomości, pole `lang` | dwa osobne pola (walidacja alternatywna), temat z dzisiejszym prefiksem, wiadomość = niepusta (baza zna tylko przypadek „pusta"), `lang` wypada | `formularze-wspolne.md` §1; part3 §9.2 |
| F22 | Kotwica formularza: w eksporcie dwa różne `id` (artefakt podwójnego drzewa) | jedno `id="formularz"` ze `scroll-margin-top` pod pasek | `docs/design/README.md` |
| F23 | `kontakt.html` desktop: sekcja na pełną wysokość okna (`vp-full`) | artefakt — wysokość z treści | j.w. |

Bez rozjazdu: adres biura (jeden, poznański, etykieta „Biuro"; siedziba
zostaje w stopce), godziny (wartość z bazy, w karcie w krótkim brzmieniu
designu), brak załączników, brak pytania kontrolnego, potwierdzenie
w miejscu formularza, czas odpowiedzi na ekranie potwierdzenia.

## 3. Czego design nie ma, a trzeba zbudować

1. **Stany błędów pól:** klasa `.err` na opakowaniu pola (`[data-f]`) —
   czerwony obrys (nowy token `--error`, ≥ 4,5:1 na bieli), komunikat pod
   polem, `aria-invalid`, `aria-describedby` (podpowiedź + komunikat);
   błąd pary kontaktowej („brak obu") pod parą, błędy formatu pod
   konkretnym polem; kafle radio — komunikat pod grupą (`fieldset`).
   Po nieudanej próbie fokus idzie na pierwsze błędne pole
   (`scroll-margin-top` pod pasek); błąd w zwiniętym bloku szczegółów
   otwiera `<details>`. Wpisanie znaku gasi błąd pola.
2. **Stan wysyłania:** przycisk `disabled`, `aria-busy` na formularzu,
   etykieta „Wysyłanie…".
3. **Potwierdzenie w miejscu formularza:** nagłówek, zdanie o czasie
   odpowiedzi, numer przez slot, przycisk „napisz kolejną / wyślij
   kolejne" (reset pól i zegara). Fokus na nagłówek potwierdzenia, górna
   krawędź ramki dosuwana pod pasek (formularz jest wysoki, potwierdzenie
   niskie — bez dosunięcia użytkownik zostałby w stopce).
4. **Błąd serwera / sieci / Turnstile:** blok `role="alert"` nad
   przyciskiem z numerem przez slot; dane w polach zostają. Błąd
   walidacji zwrócony przez serwer (400 z listą pól) zapala te same
   `.err`, co walidacja kliencka.
5. **Antyspam:** honeypot `firma` (`readonly`, `tabindex="-1"`, ukryty
   wizualnie, nie `display:none`; fokus zdejmuje `readonly`), minimalny
   czas wypełnienia, Turnstile: skrypt wstawiany do DOM dopiero przy
   pierwszym `focusin` w formularzu (brak elementu `<script>` wcześniej —
   lekcja H26), widget renderowany jawnie, token pobierany przy wysyłce;
   dzienny bezpiecznik w KV po stronie funkcji. Reguły WAF nie ma i testy
   jej nie zakładają.
   **Stan do kroku 5.1:** `TURNSTILE_SITE_KEY` zostaje PUSTY, sekretów
   nie ma — na `nowa.` formularz po wysłaniu pokaże komunikat błędu
   serwera (zawodzi głośno, nic nie wysyła). To stan oczekiwany do 5.1.
6. **Bez JS:** formularz renderuje się kompletny (`method="post"`,
   `action="/api/kontakt"`, natywna walidacja), ale wysyłka wymaga JS
   (token Turnstile). `<noscript>` w formularzu mówi to wprost, zanim
   ktoś zacznie pisać, i odsyła do adresu biura (telefon i e-mail są
   składane w JS — kontrakt antyscrapingowy z 4.1). POST bez JS (nagłówek
   `Accept` bez `application/json`) funkcja kwituje przekierowaniem 303
   z powrotem na stronę formularza — nigdy surowym JSON-em.
7. **Oznaczenie pól opcjonalnych:** dopisek „(opcjonalnie)" w etykiecie;
   pola wewnątrz bloku „Szczegóły nieruchomości (opcjonalnie)" nie
   powtarzają go.
8. **Maile A i B** (pkt 4.3) i **kontrakt endpointu** (pkt 4.2).
9. **Bramka ruchu jako komponent** (Q5) i wejście chunku `sell-motion.ts`.

## 4. Architektura i pliki

### 4.1 Wspólna mechanika (PR 1)

- `src/lib/contact-form.ts` — **przepisany**, czysty TS bez zależności
  (importują go funkcja, moduł kliencki, komponenty i testy):
  rodzaje `FormKind = "kontakt" | "sprzedaj" | "oferta" | "praca"`
  (w 5A obsługiwane dwa pierwsze; pozostałe → odpowiedź 400 do 5B);
  `isBotTrap`; `validateForm(kind, raw)` → `{ ok, data }` albo
  `{ ok: false, fields: [...] }` — **jedna funkcja po obu stronach**
  (klient zapala `.err` z tej samej listy pól, którą zwróciłby serwer);
  walidatory e-maila, telefonu (reguły odziedziczone), powierzchni
  i ceny (sama liczba; separator dziesiętny i spacje dozwolone);
  słowniki `ESTATE_TYPES` (1–4) i `TRANSACTIONS` (131 / 132) z etykietami;
  `MARKETING_CONSENT` (jedno brzmienie dla widoków i maili);
  `buildMail(kind, data, ctx)` → `{ subject, text, html }`;
  stałe `CONTACT_TO`, `CONTACT_FROM_NOTIFY`, limity długości.
- `functions/api/kontakt.ts` — adaptacja (pkt 4.2).
- `src/components/forms/` (nowy katalog — mechanika jest wspólna dla
  czterech formularzy, nie dla sekcji „kontakt"):
  `form-ui.ts` (z `sections/contact/contact-ui.ts`: inicjalizacja po
  atrybutach `[data-form]`, bez id zaszytych w kodzie),
  `form-config.ts` (z `contact-config.ts`: endpoint, klucz i adres
  Turnstile, limit czasu), `FormFrame.astro` (ramka: formularz, honeypot,
  kontener Turnstile, blok błędu serwera, `<noscript>`, ekran
  potwierdzenia), `FormField.astro` (etykieta, dopisek opcjonalności,
  pole, podpowiedź, komunikaty), `FormConsent.astro` (checkbox D21 +
  nota — elementy kolumny flex z `gap`, nie obszary gridu),
  `forms.css` (klasy `fm-*`), `forms-copy.ts` (teksty wspólne: komunikaty
  walidacji, podpowiedź pary, etykiety przycisków — importowane też przez
  testy). Katalog `sections/contact/` dostaje sekcje widoku kontaktu.
- `src/styles/global.css` — token `--error`.

### 4.2 Endpoint `POST /api/kontakt` (jeden dla czterech formularzy)

Pola `multipart/form-data`: `form`, `name`, `email`, `phone`,
`marketing`, `firma` (honeypot), `elapsed`, `cf-turnstile-response`;
kontakt: `message`; sprzedaj: `type`, `transaction`, `location`, `area`,
`price`, `notes`.

Kolejność kroków i odpowiedzi (JSON `{ ok, error?, fields? }`):

| Krok | Wynik negatywny |
| --- | --- |
| metoda ≠ POST | 405 |
| `Content-Length` ponad próg formularza tekstowego (przed czytaniem treści) | 413 `too-large` |
| treść nie jest formularzem / nieznany albo nieobsługiwany `form` | 400 `bad-form` / `form` |
| pułapka (honeypot, czas, brak `elapsed`) | **200 `ok`** bez wysyłki (bot nie wie, że odpadł) |
| walidacja | 400 `fields` + lista pól |
| brak sekretów w środowisku | 503 `config` (log bez wartości) |
| Turnstile | 403 `turnstile` / 502 `turnstile-unreachable` |
| limit dzienny (KV, binding opcjonalny) | 503 `quota` |
| Resend | 502 `send` (log: sam kod HTTP) |

Żądanie do Resend: `from` (U7), `to` (stała albo nadpisanie ze
środowiska — Q7), `reply_to` tylko przy podanym e-mailu, `subject`,
`text`, `html`, nagłówek `X-Entity-Ref-ID` (losowy). Nic nie jest
utrwalane poza mailem; IP i przeglądarka klienta nie trafiają do treści.

### 4.3 Maile (part3 §9.2 — realizacja)

- Temat: dzisiejszy prefiks + dopisek kontekstu (A kontakt, B zgłoszenie
  nieruchomości) — reguły poczty klientki działają dalej.
- Treść `text/plain` + HTML w tym samym układzie: nagłówek, etykiety
  w dzisiejszej kolejności, wartości escapowane; kolor marki, font
  systemowy, bez obrazków.
- B niesie etykiety słownika (nie identyfikatory), lokalizację oraz
  **powierzchnię (z jednostką) i cenę (z walutą, grupowanie tysięcy)** —
  pola puste pomijane.
- Linia zgody marketingowej Tak / Nie + pełne brzmienie zgody.
- Stopka techniczna: data i godzina (Europe/Warsaw), adres strony
  źródłowej **zbudowany z hosta żądania** (na podglądzie `nowa.`, po
  przełączeniu domena główna) i ścieżki wynikającej z `form` (nie
  z danych klienta), zdanie o odpowiadaniu wprost klientowi (gdy jest
  `Reply-To`) albo o kontakcie telefonicznym (gdy go nie ma).
- Bez potwierdzenia do nadawcy (test unit już to pilnuje).

### 4.4 Widoki

- **PR 1:** `src/pages/kontakt.astro` (BaseLayout, Navbar, `main`,
  Footer; skrypt strony = `form-ui`), `sections/contact/`:
  `ContactIntro.astro`, `ContactMap.astro` (`<picture>`: desktopowy plik
  od `CONTACT_MAP_MIN_PX`, `width`/`height`, `lazy`), `ContactCard.astro`
  (sloty, adres z `BUSINESS`), `ContactForm.astro`, `contact-copy.ts`
  (PLACEHOLDER). Bez modułu ruchu.
- **PR 2:** `src/pages/sprzedaj-z-nami.astro`, `sections/sell/`:
  `SellHero.astro`, `SellSteps.astro`, `SellForm.astro`, `sell-copy.ts`,
  `sell-config.ts`, `sell-motion.ts` (wejście chunku:
  `initContentMotion()`); `src/components/MotionGate.astro` (Q5);
  `src/assets/img/sprzedaj-doradca-tall.webp` (F15);
  hero na `var(--svh, 100svh)` z `armViewportPin`.

## 5. Kontrakty i testy

**Znaczniki:** `form[data-form="kontakt|sprzedaj"]`, opakowania pól
`[data-f="name|email|phone|contact|message|type|transaction|location|
area|price|notes"]`, `[data-form-frame]` z `data-state="form|sent"`,
`[data-form-error]` (błąd serwera), `[data-form-done]`,
`[data-form-again]`, `[data-form-submit]`, `[data-form-ts]`;
`[data-contact-map]`, `[data-contact-card]`; `[data-sell-hero]`,
`[data-sell-steps]`, `#formularz`.

**Unit** (`tests/unit/contact-form.test.ts` przepisany +
`contact-endpoint.test.ts` nowy):

| Obszar | Asercje |
| --- | --- |
| Pułapki | honeypot, czas, brak `elapsed` (bez zmian) |
| Walidacja kontaktu | imię; sam e-mail, sam telefon, oba, żadne (pole `contact`); e-mail błędny przy poprawnym telefonie → błąd pola `email`; wiadomość pusta; zgoda domyślnie „nie" |
| Walidacja zgłoszenia | typ 1–4 (brak, `0`, wartość spoza słownika), transakcja 131 / 132; lokalizacja, powierzchnia, cena, uwagi puste = poprawne; powierzchnia i cena nieliczbowe → błąd pola; przycinanie długości, jedna linia |
| Mail A | temat = prefiks + kontekst, jedna linia; kolejność etykiet; `Tak/Nie` zgody + brzmienie; escapowanie HTML; stopka z adresem z hosta żądania |
| **Mail B** | **niesie powierzchnię i cenę** (tekst i HTML) — test wprost; etykiety słownika zamiast identyfikatorów; pola puste pominięte |
| Endpoint (atrapa `fetch`, atrapa KV) | 405; 413; nieznany `form` → 400; pułapka → 200 i ZERO wywołań `fetch`; walidacja → 400 z listą pól; brak sekretów → 503; Turnstile odmowa → 403; limit → 503; sukces: jedno żądanie do Resend z `from` = `send.`, `to` = `biuro@`, `reply_to` obecne tylko przy e-mailu, nagłówek `X-Entity-Ref-ID`; POST bez JS → 303 |
| Stałe | adresat, nadawca, brak potwierdzenia do nadawcy (istniejące testy) |

**E2E** — `tests/e2e/kontakt.spec.ts` (PR 1), `sprzedaj.spec.ts` (PR 2);
treść na `chromium-1920`, formularz także na `chromium-pixel-5`
i `webkit-iphone-14`. Lokalny preview nie ma funkcji, więc
`/api/kontakt` i skrypt Turnstile są ZAWSZE zaślepione (`page.route`;
helper `tests/helpers/forms.ts`: atrapa Turnstile, przechwycenie
i rozbiór wysłanego formularza, zegar `page.clock`). Żaden test nie
wysyła niczego na zewnątrz.

| Kontrakt | Asercja |
| --- | --- |
| Treść | `main h1`, eyebrow, teksty z `*-copy.ts`; `h2` formularza; link do polityki < 400 |
| Mapa | `<picture>` z `<source media="(min-width: 600px)">`, pliki i wymiary obu wariantów, proporcje obrazu na ekranie = proporcje pliku (sub-pikselowo — bez kadrowania), karta danych zaczyna się nie wyżej niż dolna krawędź mapy, link „Otwórz w mapach" z adresem biura; przełączenie pliku przy 599 / 600 px |
| Sloty | surowy `<main>` bez telefonu, maila, `tel:`, `mailto:`; po JS `a[data-tel]`, `a[data-mail="biuro"]`; puste kotwice mają `<span data-slot>` |
| Pola | każde pole ma `<label for>`, `autocomplete` na polach osobowych, `inputmode` na liczbowych; `font-size` pól ≥ 16 px (mobile); dopiski opcjonalności |
| Brak wymuszonego checkboxa | checkbox odznaczony, bez `required`; wysyłka bez niego przechodzi (`marketing` nieobecne w żądaniu), z nim — obecne |
| Warianty kontaktu | sam e-mail → wysyłka; sam telefon → wysyłka; nic → `.err` na parze, komunikat widoczny, fokus na pierwszym błędnym polu, ZERO żądań; błędny e-mail → `.err` pola |
| Antyspam | honeypot `readonly` + `tabindex="-1"`, poza `display:none`; wypełniony honeypot → ekran potwierdzenia i ZERO żądań; wysyłka przed minimalnym czasem (zegar) → to samo; po przesunięciu zegara → żądanie z `elapsed` ≥ progu |
| Turnstile | po wejściu i po przewinięciu: w DOM nie ma skryptu Turnstile i nie było żądania do jego hosta; po `focusin` — jest dokładnie jeden; token z atrapy trafia do żądania; skrypt zablokowany → wysyłka z pustym tokenem → komunikat błędu serwera |
| Stany | odpowiedź 200 → `[data-form-done]` w miejscu formularza, fokus na nagłówku, numer w slocie; „kolejna" → pusty formularz; 400 z polami → te same `.err`; 500 / przerwane połączenie → `[data-form-error]`, pola zachowane, przycisk znów aktywny; w trakcie: `disabled` + `aria-busy` |
| Zgłoszenie (PR 2) | wartości radio 1–4 i 131 / 132, etykieta „Lokal komercyjny"; brak wyboru → komunikaty grup; błąd w zwiniętych szczegółach otwiera `<details>`; żądanie niesie `area` i `price`; kotwica hero → `#formularz` pod paskiem |
| Bez JS | surowy HTML: `method="post"`, `action`, komplet pól, `<noscript>` |
| Progi | `expectBreakpointFlip(1025)` na układzie siatki (kontakt: 1 ↔ 2 kolumny; zgłoszenie: kafle, wiersze pól, kroki) |
| Ruch (PR 2) | `html.js-motion`, blok kroków `opacity 0` → `.is-in`; hero bez `[data-rv]`; sonda zapasu parallaxu; PUNKTOWA emulacja `reduce` z komentarzem (trzeci dozwolony wyjątek) → treść widoczna, brak `js-motion` |
| Sieć | zero hostów trzecich przy wejściu i po przewinięciu |
| a11y | axe WCAG 2 A/AA: stan wyjściowy, stan błędów, ekran potwierdzenia (desktop i mobile; „Sprzedaj" po `revealSweep`) — allowlista PUSTA |

Specy istniejące: `smoke` — sonda produkcyjna dostaje nowy kontrakt pól
(`form=kontakt`, honeypot wypełniony → 200) i traci komentarz o regule
WAF; `navigation`, `seo`, `a11y` — bez zmian speców (trasy już w nich są).

**Visual** (fixture, 6 profili):

| Spec | Zrzuty | PNG na platformę |
| --- | --- | --- |
| `kontakt.spec.ts` (PR 1) | `kontakt-full` (fullPage), `kontakt-form-errors` (karta formularza po pustej wysyłce), `kontakt-form-done` (potwierdzenie; endpoint zaślepiony, zegar) | 18 |
| `sprzedaj.spec.ts` (PR 2) | `sprzedaj-top` (okno startowe), `sprzedaj-full` (fullPage po `revealSweep`, szczegóły rozwinięte), `sprzedaj-form-errors`, `sprzedaj-form-done` | 24 |

`chrome.spec.ts` stoi na `/kontakt/`: `chrome-sheet` (zrzut strony
z otwartym menu, 3 profile mobilne) rozjedzie się w PR 1 — zamierzone,
regeneracja w tym PR; `chrome-bar` i `chrome-footer` zmierzę progiem 0
(góra strony pod paskiem zostaje w kolorze `--bg`, stopka bez zmian).
Kolejność baseline'ów bez zmian: kod → workflow linux z brancha (mode
`changed`) → `git pull` → diff darwin → darwin → commit darwin na końcu.

**LHCI:** `/kontakt/` (PR 1) i `/sprzedaj-z-nami/` (PR 2) dopisane do
obu configów. Turnstile nie wchodzi do pomiaru (ładuje się po `focusin`).

## 6. Budżet (prognoza; pomiar po `build:visual` w raporcie PR-a)

| Zasób | `/kontakt/` | `/sprzedaj-z-nami/` |
| --- | --- | --- |
| `script` (próg 40 000 B) | chrome ok. 3,4 KB + `form-ui` z walidatorami ok. 2,5–3 KB gzip → **ok. 6–6,5 KB (16 %)** | to samo + helper `import()` 0,7 KB + chunk ruchu ok. 1,2 KB → **ok. 8–8,5 KB (21 %)** |
| `total` | fonty 67 KB + mapa 37 KB (mobile) / 56 KB (desktop) + HTML/CSS → ok. 150–180 KB | fonty + zdjęcie hero 30 KB (kadr pionowy ok. 25–30 KB) → ok. 150–180 KB |
| LCP | `h1` (tekst) — jak trasa tekstowa, ok. 1,8 s mobile | mobile: `h1` (obraz na całe okno nie jest kandydatem — H18); desktop: zdjęcie hero (66 % okna) → `eager`, `fetchpriority`, `preload` z `media` |
| CLS | mapa i zdjęcia z wymiarami; ekran potwierdzenia podmienia formularz po interakcji (nie liczy się do CLS) | hero o stałej wysokości |

Progi LHCI nietknięte. `form-ui` nie importuje niczego z `offers/` ani
z zodem (walidatory własne, czyste).

## 7. Lista PLACEHOLDER (U9; zamykana w 7.7)

| Widok | Teksty (brzmienie z designu) |
| --- | --- |
| `/kontakt/` | eyebrow; `h1` „Kupujesz, sprzedajesz czy szukasz porady? Porozmawiajmy."; akapit „Napisz lub zadzwoń…"; alt mapy; etykieta przycisku |
| `/sprzedaj-z-nami/` | eyebrow; `h1` „Chcesz sprzedać? Zajmiemy się resztą."; akapit hero (Q4); „Wypełnij zgłoszenie"; trzy kroki (tytuł + zdanie); akapit pod „Zgłoś nieruchomość"; „Wolisz przez telefon?"; alt zdjęcia |
| wspólne | etykieta stanu wysyłania, treść `<noscript>`, dopisek „(opcjonalnie)" |

NIE są placeholderami (treść ze specyfikacji formularzy w bazie):
etykiety pól, placeholdery, podpowiedzi, komunikaty walidacji, zgoda
D21, noty informacyjne, ekrany potwierdzenia, komunikaty błędu serwera,
adres biura, godziny. Otwarte w bazie (do rozmowy z klientką, nie
blokuje): alternatywne zdanie o czasie odpowiedzi (`formularze-wspolne.md`
§2).

## 8. Co sprawdzić na fizycznym telefonie (i na `nowa.`)

1. **Klawiatura ekranowa a pola:** typ klawiatury (e-mail z „@",
   telefon numeryczny, powierzchnia z przecinkiem, cena cyfry); czy pole
   z fokusem i komunikat błędu nie chowają się pod klawiaturą ani pod
   paskiem; czy przycisk wysyłki jest osiągalny bez zamykania klawiatury.
2. **Zoom Safari przy fokusie:** żadne pole (także pole tekstowe
   i kafle radio) nie powiększa strony; po wyjściu z pola strona nie
   zostaje powiększona.
3. **Autouzupełnianie:** iOS (wizytówka) i Chrome na Androidzie
   wypełniają imię, e-mail i telefon; honeypot zostaje pusty (wysyłka po
   autouzupełnieniu nie kończy się fałszywym „wysłano").
4. Po wysyłce: potwierdzenie widoczne bez przewijania, numer klikalny
   (`tel:`); po błędzie: komunikat widoczny, dane w polach.
5. Kafle radio i checkbox zgody: trafialność kciukiem, cały tekst zgody
   klikalny; rozwijany blok szczegółów.
6. Mapa: czytelny napis atrybucji na wąskim ekranie, link otwiera
   aplikację map; plik desktopowy na złożonym telefonie / tablecie.
7. „Sprzedaj z nami": hero na wysokim telefonie (kadr 64 %), pasek adresu
   Safari a wysokość hero, przycisk „Wypełnij zgłoszenie" ląduje na
   nagłówku formularza pod paskiem, reveale przy szybkim przewijaniu.
8. Na `nowa.` DO kroku 5.1: wysyłka kończy się komunikatem błędu (stan
   oczekiwany). PO 5.1: wyzwanie Turnstile (czy widget mieści się nad
   przyciskiem), wysyłki rzeczywiste (5.5 — Mateusz).

## 9. Pytania do Mateusza (z rekomendacją)

1. **Q1 — „Lokalizacja" (F1).** Rekomendacja: **opcjonalna (baza)
   i przeniesiona do bloku „Szczegóły nieruchomości (opcjonalnie)"** jako
   pierwsze pole. Formularz ma wtedy czytelny podział zgodny ze zdaniem
   z designu „potrzebujemy tylko pierwszych pól": na wierzchu typ,
   transakcja, imię, e-mail / telefon; w bloku rozwijanym lokalizacja,
   powierzchnia, cena, uwagi. Na desktopie trzy pola bloku stoją w jednym
   rzędzie dokładnie jak w designie — lokalizacja zajmuje miejsce „liczby
   pokoi". Alternatywa: opcjonalna, ale w miejscu z designu (obok
   imienia) z dopiskiem „(opcjonalnie)"; albo wymagana jak w designie.
2. **Q2 — „Liczba pokoi" (F2).** Rekomendacja: **nie wchodzi** — nie ma
   jej w bazie ani w specyfikacji maila, nie ma sensu dla działki
   i lokalu, a zestaw pól deklaruje polityka prywatności; szczegóły
   mieści pole uwag. Alternatywa: pole opcjonalne + linia w mailu B.
3. **Q3 — pasek nad hero „Sprzedaj z nami" (F13).** Design ma tu ten sam
   przezroczysty pasek co strona główna (i to samo czeka „O nas"
   i „Usługi" w 4.5 / 4.6). Rekomendacja: **mała, jawna zmiana chrome'u
   w PR 2** — `Navbar` dostaje opcjonalny prop (strona deklaruje „mam
   hero pod paskiem"), a próg przemalowania liczy się z wysokości
   elementu hero strony zamiast ze sztywnej wysokości okna (na „/"
   wynik identyczny: hero = okno; „Sprzedaj" desktop: 66 % okna).
   Mechanika `overlay.ts`, sheet, stopka i wygląd paska na pozostałych
   trasach bez zmian; `navigation.spec` zyskuje test wariantu na drugiej
   trasie. Alternatywa bez dotykania chrome'u: hero zaczyna się POD
   stałym paskiem (pasek szklany jak na `/kontakt/`), a wariant
   przezroczysty wchodzi osobnym PR-em przed 4.5 — kosztem drugiej
   regeneracji zrzutów „Sprzedaj".
4. **Q4 — „zwykle tego samego dnia" w akapicie hero (F14).**
   Rekomendacja: **akapit bez obietnicy czasu** („Opisz nieruchomość
   w kilku polach. Oddzwonimy z bezpłatną wyceną i planem sprzedaży.");
   czas odpowiedzi pada raz, na ekranie potwierdzenia. Alternatywa:
   brzmienie z designu jako PLACEHOLDER do potwierdzenia przez klientkę.
5. **Q5 — bramka ruchu jako komponent.** Rekomendacja: **tak, w PR 2:**
   `MotionGate.astro` (skrypt inline z bezpiecznikiem) używany przez
   „/" i „Sprzedaj". Zmiana w `index.astro` ogranicza się do podmiany
   bloku skryptu na komponent — HTML wynikowy „/" ma zostać bajt w bajt
   ten sam (sprawdzę porównaniem `dist`), `home` e2e i zrzuty bez ruchu.
6. **Q6 — karta danych pod mapą zamiast na mapie (F9).** Wymóg atrybucji
   nie zostawia miejsca na nasunięcie (napis zajmuje większość dolnej
   krawędzi). Rekomendacja: **mapa bez kadrowania, karta bezpośrednio pod
   nią** (jedna bryła: mapa + karta, promień na karcie). Alternatywa
   zachowująca „szkło na mapie" wymagałaby wygenerowania nowych map
   z atrybucją w innym miejscu — poza zakresem 5A.
7. **Q7 — adresat w środowisku podglądu PR-ów.** Instrukcja każe ustawić
   sekrety Resend w środowiskach Production i Preview projektu Pages —
   po 5.1 każda próbna wysyłka z podglądu PR-a (`*.pages.dev`) poszłaby
   na `biuro@`. Rekomendacja: **opcjonalna zmienna środowiskowa
   `KONTAKT_TO`** (gdy ustawiona, zastępuje stałą) — w środowisku Preview
   wpisujesz własny adres, Production zostaje bez niej. „Konfigurowalny
   adresat" z bazy dostaje wtedy realne zastosowanie; domyślnie nic się
   nie zmienia.
8. **Q8 — przeniesienie mechaniki do `src/components/forms/`** (pkt 4.1;
   pliki `contact-ui.ts` i `contact-config.ts` zmieniają nazwę
   i katalog, `src/lib/contact-form.ts` i ścieżka endpointu zostają).
   Rekomendacja: tak — w 5B z tych samych plików skorzystają detal
   oferty i `/praca/`. Alternatywa: zostają w `sections/contact/`.

## 10. Uzupełnienia po implementacji — PR 1 (`feat/kontakt`)

Decyzje Q1–Q8 zapadły wg rekomendacji (2026-10-03): lokalizacja
opcjonalna w bloku szczegółów, bez „liczby pokoi", wariant paska nad
hero jako jawna zmiana chrome'u w PR 2, akapit hero bez obietnicy czasu,
bramka ruchu jako komponent (PR 2), karta danych pod mapą, opcjonalna
zmienna `KONTAKT_TO`, mechanika w `src/components/forms/`. Q1–Q5
realizuje PR 2; PR 1 zamyka Q6–Q8.

### 10.1 Co powstało

- `src/lib/contact-form.ts` — przepisany: rodzaje formularzy,
  `validateForm`, słowniki zgłoszenia, `parseArea` / `parsePrice`,
  `MARKETING_CONSENT`, `buildMail` (maile A i B), `FORM_PAGE_PATH`,
  `FORM_MAX_BYTES`.
- `functions/api/kontakt.ts` — jeden endpoint z polem `form`, kroki
  i odpowiedzi jak w §4.2, `KONTAKT_TO`, przekierowanie 303 dla wysyłki
  bez JS.
- `src/components/forms/`: `form-ui.ts` i `form-config.ts` (przeniesione
  z `sections/contact/`), `FormFrame.astro`, `FormField.astro`,
  `FormContactPair.astro`, `forms.css`, `forms-copy.ts`.
- `src/pages/kontakt.astro` + `sections/contact/`: `ContactIntro`,
  `ContactInfo`, `ContactForm`, `contact-copy.ts`, `contact-config.ts`.
- `src/styles/global.css` — token `--error`.
- Testy: unit `contact-form` (przepisany, 46 testów) i `contact-endpoint`
  (nowy, 19); e2e `kontakt.spec.ts` (19 testów), helper
  `tests/helpers/forms.ts`; visual `kontakt.spec.ts` (3 zrzuty × 6
  profili); `smoke` — sonda produkcyjna w nowym kontrakcie pól;
  `chrome.spec` — stopka niezależna od treści widoku (F25);
  `lighthouserc*.cjs` + `/kontakt/`.

### 10.2 Rozstrzygnięcia w trakcie (ciąg dalszy §2)

| # | Temat | Rozstrzygnięcie |
| --- | --- | --- |
| F24 | `aria-describedby` a komunikaty ukryte przez CSS | element wskazany w `aria-describedby` jest czytany jako opis pola także wtedy, gdy jest ukryty — komunikat błędu podpina więc skrypt, dopiero przy aktywnym błędzie (stałe opisy w `data-desc`); zdejmuje go razem z klasą `.err` |
| F25 | Zrzut `chrome-footer` zależał od treści `/kontakt/` | wysokość widoku nad stopką jest ułamkowa (`clamp` z `vw`), a zrzut ELEMENTU zaokrągla się wtedy o piksel inaczej — stopka „zmieniała się" bez zmiany stopki. Spec przypina `main` do stałej, całkowitej wysokości na czas zrzutu. Pomiar progiem 0: `chrome-bar` (3 profile desktop) i `chrome-home-*` — 0 różnic; `chrome-footer` identyczny na 1920, Firefox i Pixel 5, różny na 1366 (4 228 px), iPhone SE (wysokość 793 zamiast 794 px) i iPhone 14 (5 185 px) — tam dotychczasowy baseline był zdjęty z ułamkowej pozycji; `chrome-sheet` (treść `/kontakt/` pod scrimem): iPhone SE 0 różnic, iPhone 14 — 1 821 px, Pixel 5 — 584 px. Do regeneracji w PR: `chrome-footer` × 3, `chrome-sheet` × 2 (darwin; linux przez workflow w trybie `changed`) |
| F26 | Mapa `loading="lazy"` (design i specyfikacja mapy) | mapa jest na telefonie największym elementem pierwszego ekranu (potwierdzone w raporcie Lighthouse: element LCP) — ładowana od razu, `fetchpriority="high"`; `width` / `height` na `<img>` i `<source>` + `aspect-ratio` w CSS (CLS 0) |
| F27 | Promień karty danych | karta niesie motyw zaokrąglonego lewego dolnego rogu, ale mniejszy niż promień mapy w designie (28–48 px na telefonie, 36–56 px na desktopie) — przy promieniu 64–96 px łuk wchodziłby w tekst ostatniego wiersza |
| F28 | Wiersze karty bez JS | wiersz, którego slot został ukryty, znika cały (`:has(> a[hidden])`), `<noscript>` w karcie to wyjaśnia; kolejność wierszy różni się między progami przez `grid-template-areas` (DOM: telefon, e-mail, biuro, godziny) |
| F29 | Sonda produkcyjna `smoke` | wysyła nowy kontrakt pól i nagłówek `accept: application/json` — bez niego funkcja traktuje POST jako wysyłkę bez JS (303). Ścieżka pułapki odpowiada 200 także bez sekretów, więc sonda działa przed krokiem 5.1 |
| F30 | Zrzuty elementu formularza na telefonie | pasek fixed wjeżdżał na zszywany zrzut — chowany na czas zrzutu (jak w `chrome-footer`) |
| F31 | Ekran potwierdzenia w zrzucie | bez zegara i bez sieci: endpoint i Turnstile zaślepione; zwykle wysyłka w teście jest szybsza niż minimalny czas i moduł pokazuje potwierdzenie bez żądania, na wolnym runnerze żądanie trafia w zaślepkę — ekran ten sam |
| F32 | Silnik tekstowy Playwrighta pomija `<noscript>` | asercje wersji bez JS idą locatorem po klasie, nie `getByText` |
| F33 | Fokus pierwszego błędnego pola pod stałym paskiem | pola mają `scroll-margin-top` (pasek + zapas); test mierzy, że pole z fokusem stoi pod paskiem — poprawione po CI, patrz F36 |
| F34 | Obrys pól `rgba(24,58,107,.24)` z designu | zostaje (wygląd); kontrast obrysu jest niski (ok. 1,5:1) — axe tego nie bada, do oceny na telefonie w słońcu (§10.6) |
| F35 | `Reply-To`, temat | temat stały per formularz (bez danych klienta — nie ma czego wstrzyknąć), `reply_to` pomijane przy samym telefonie; puste pola opcjonalne zgłoszenia pomijane, brakujący kanał kontaktu = „nie podano" |

**F36 — po czerwonym jobie `e2e` na PR #25 (bieg 37151670813):** test
„pusta wysyłka" padł wyłącznie na `webkit-iphone-14` w CI — po `focus()`
pierwsze błędne pole stało 105 px POD stałym paskiem (lokalnie, na
macOS, przeglądarka dosuwała je poprawnie; druga po H26 różnica WebKita
między systemami). Poprawka w kodzie, nie w teście: moduł woła
`focus({ preventScroll: true })` i SAM dosuwa opakowanie pola pod pasek
(`revealUnderBar` — to samo, co dosuwa ramkę z potwierdzeniem; natywny
`window.scrollTo`). Dosuwanie nie zależy już od tego, jak silnik
traktuje `scroll-margin` przy fokusie. Test mierzy teraz całe
opakowanie (etykieta + pole): odstęp od paska ≥ `FORM_SCROLL_GAP_PX`
i dolna krawędź w oknie. Koszt: +187 B brutto / +66 B gzip (liczby
w §10.3 już po poprawce; pomiar LHCI sprzed poprawki — `script` rośnie
o ok. 70 B).

### 10.3 Budżet (pomiar jak §12.5 analizy 4.2, `pnpm build:visual`)

| Plik | Rola | brutto | gzip -9 |
| --- | --- | --- | --- |
| chrome (Navbar, Footer, `contact-details`, `site-config`) | bez zmian (4 pliki; gzip liczony per plik) | 8 135 B | 3 531 B |
| `kontakt.astro_…js` | moduł formularzy: walidacja, pułapki, Turnstile, wysyłka (po F36) | 5 791 B | 2 600 B |
| **razem `script` na `/kontakt/`** | | **13 926 B** | **6 131 B** |
| `kontakt.*.css` | widok + `forms.css` + `content.css` | 9 745 B | 2 352 B |
| HTML `/kontakt/` | | 26 361 B | 6 348 B |

Wyspa listy nietknięta (`SearchIsland` 38 653 B co do bajta).

**LHCI lokalnie (1 przebieg, oba configi — asercje czyste na 9
adresach):**

| `/kontakt/` | mobile | próg | desktop | próg |
| --- | --- | --- | --- | --- |
| `script` | 7 829 B (20 %) | 40 000 | 7 829 B (20 %) | 40 000 |
| `total` | 180,9 KB (18 %) | 1 000 000 | 200,3 KB (17 %) | 1 200 000 |
| LCP | 2 035–2 039 ms (2 przebiegi) | 3 200 | 475 ms | 1 800 |
| TBT | 0 ms | 600 | 0 ms | 300 |
| CLS | 0,000 | 0,05 | 0,007 | 0,05 |
| wynik `performance` | 0,99 | 0,9 | 1,00 | 0,95 |
| podmioty trzecie | 0 | | 0 | |

Elementem LCP jest mapa (oba profile). Margines LCP mobile ok. 1,16 s —
poniżej regułowych 1,3 s, jak na „/" (obserwacja; `fetchpriority` nie
zmienił wyniku). Prognoza z §6 sprawdziła się (skrypt 6,1 KB gzip wobec
prognozy 6–6,5 KB). Progi nietknięte.

### 10.4 Weryfikacja lokalna

- format, lint, typecheck — czyste; unit 450 testów: 443 zielone + 7 skip
  bez `dist/media` (38 plików); build 89 stron; `test:dist` 6/6.
- `pnpm test:e2e` na 6 profilach: **495 zielonych** (765 pominięć
  profili), 0 czerwonych; nowy `kontakt.spec.ts` = 19 testów (42
  przebiegi na 3 profilach); axe 0 naruszeń w trzech stanach formularza
  (desktop i Pixel 5; allowlista PUSTA).
- `test:visual`: **23 czerwone OCZEKIWANE** — 18 nowych zrzutów bez
  baseline'u (`kontakt-full`, `kontakt-form-errors`, `kontakt-form-done`
  × 6) + 5 rozjazdów chrome'u z F25; pozostałe 134 zielone. Drugi
  przebieg `kontakt` na zapisanych zrzutach: 18/18 stabilne (zrzuty
  robocze usunięte — baseline'y powstają wg świętej kolejności).

### 10.5 PLACEHOLDER (U9)

`contact-copy.ts`: eyebrow, nagłówek (dwie frazy), akapit, opis mapy,
informacja bez JS. `forms-copy.ts`: dopisek „(opcjonalnie)", etykieta
„Wysyłanie…", informacja bez JS. Reszta tekstów formularza pochodzi ze
specyfikacji w bazie wiedzy.

### 10.6 Co sprawdzić na `nowa.` i na fizycznym telefonie

Lista z §8 (pkt 1–6, 8) + po implementacji: (9) kolejność wierszy karty
danych na telefonie (Biuro → Telefon / Godziny → E-mail) i na desktopie;
(10) karta pod mapą bez efektu szkła — czy bryła „mapa + karta" jest
akceptowalna wizualnie; (11) obrys pól w ostrym świetle (F34);
(12) checkbox zgody: wielkość znaczka na iOS (pole trafienia ma 24 px;
silnik WebKit w testach rysuje znaczek mniejszy); (13) klawisz „Dalej"
/ „Gotowe" klawiatury ekranowej między polami i wysyłka klawiszem Enter
z pola jednoliniowego; (14) DO kroku 5.1: wysyłka kończy się komunikatem
błędu z numerem telefonu — to stan oczekiwany.

### 10.7 Do wykonania poza kodem (Mateusz)

1. **Krok 5.1** (chmura) — po nim: klucz publiczny Turnstile do
   `src/components/forms/form-config.ts` (stała `TURNSTILE_SITE_KEY`;
   instrukcja wskazuje jeszcze starą nazwę pliku), sekrety funkcji
   w środowiskach projektu Pages, opcjonalnie `KONTAKT_TO` w środowisku
   Preview (własny adres — podglądy PR-ów nie piszą wtedy do biura).
2. Wysyłki rzeczywiste (krok 5.5) dopiero po 5.1.
3. Lokalny rejestr konfiguracji: dopisać nazwę zmiennej `KONTAKT_TO`.

## 11. Uzupełnienia po implementacji — PR 2 (`feat/sprzedaj`)

Zakres wg decyzji Q1–Q5: lokalizacja opcjonalna w bloku szczegółów (Q1),
bez „liczby pokoi" (Q2), wariant paska nad hero jako jawna zmiana
chrome'u (Q3), akapit hero bez obietnicy czasu (Q4), bramka ruchu jako
komponent (Q5).

### 11.1 Co powstało

- `src/pages/sprzedaj-z-nami.astro` + `sections/sell/`: `SellHero`,
  `SellSteps`, `SellForm`, `sell-copy.ts`, `sell-config.ts`,
  `sell-motion.ts`.
- `src/components/MotionGate.astro` (bramka `js-motion`; używają jej „/"
  i „Sprzedaj z nami"), `src/components/forms/FormChoice.astro` (grupa
  radio), `FormTel.astro` (slot telefonu w komunikatach), style kafli
  i bloku opcjonalnego w `forms.css`, `SPRZEDAJ_FORM_COPY`
  w `forms-copy.ts`.
- Chrome (zakres Q3): `Navbar.astro` — prop `overHero`, próg
  przemalowania z wysokości elementu `[data-nav-hero]`; `nav-config.ts`
  — sam opis. `overlay.ts`, sheet, stopka i wygląd paska na pozostałych
  trasach bez zmian.
- `src/assets/img/sprzedaj-doradca-tall.webp` (720×816, 18 KB) — kadr
  pionowy poniżej 768 px.
- Testy: e2e `sprzedaj.spec.ts` (23 testy), `navigation.spec.ts` + 2
  (wariant paska na drugiej trasie); visual `sprzedaj.spec.ts` (4 zrzuty
  × 6 profili); `lighthouserc*.cjs` + `/sprzedaj-z-nami/`.

### 11.2 Rozstrzygnięcia w trakcie (ciąg dalszy §2 i §10.2)

| # | Temat | Rozstrzygnięcie |
| --- | --- | --- |
| F37 | **Q5 — bramka jako komponent, „/" bajt w bajt** | `dist/index.html` porównany przed i po wydzieleniu na buildzie ze stałą datą (`pnpm build:visual`): odcisk SHA-256 identyczny (`d1868b54…`), 39 248 B. Zwykły `pnpm build` nie nadaje się do takiego porównania — każdy przebieg wpisuje inny znacznik czasu w `data-build-now` (dwa buildy tego samego kodu różnią się tym jednym atrybutem). Komponent trzyma treść skryptu dosłownie (razem z komentarzem i wcięciem), stąd `<Fragment>` wokół skryptu; komentarz w skrypcie wspomina moduł ruchu strony głównej także na „Sprzedaj" — do poprawienia przy pierwszej zmianie skryptu, bez wartości funkcjonalnej |
| F38 | **Q3 — skąd pasek zna hero** | strona przekazuje `<Navbar overHero />` i oznacza element hero atrybutem `data-nav-hero`; pasek liczy próg z `offsetHeight` tego elementu. Strona główna zostaje bez znacznika (hero pełnoekranowe → wysokość okna, czyli dokładnie dotychczasowy wzór — zachowanie „/" identyczne z konstrukcji, `HomeHero.astro` nietknięty). Wariant domyślnie nadal ma wyłącznie „/" (`overHero` nieprzekazany = strona główna) — `index.astro` nie musiał się zmienić poza bramką |
| F39 | Zrzuty chrome'u po zmianie paska (próg 0) | `chrome-bar` (3 profile desktop), `chrome-sheet` (3 mobilne), `chrome-home-top` i `chrome-home-solid` (6), `chrome-footer` (6), a także `kontakt-form-errors`, `kontakt-form-done`, `home-top` — **0 różnic**; bez regeneracji. Wyjątek losowy, niezwiązany ze zmianą: F47 |
| F40 | **F17 — pomiar kontrastu hero** | Metoda H14: zrzut okna z przezroczystym tekstem, kontrast liczony dla każdego piksela tła w prostokątach linii tekstu, wynik = 5. percentyl (najjaśniejsze 5 % tła); 14 rozmiarów okna (1920×1080, 1440×900, 1366×768, 1025×768, 1024×768, 820×1180, 768×1024, 600×900, 412×915, 390×844, 375×667, 360×640, 320×568, 844×390), scroll 0 i 30 % wysokości hero, dodatkowo ścieżka `reduce`. Gradient z designu: eyebrow na niskich telefonach 4,46:1 (320×568), 4,58–4,59:1 (360 i 375 px), 4,73:1 (600×900) — poniżej albo na granicy 4,5:1. **Wdrożone:** środkowy stop gradientu telefonu `.72` przy 46 % → `.80` przy 42 % (kolory tekstu bez zmian). Po zmianie (wszystkie rozmiary): eyebrow ≥ 5,3:1, akapit ≥ 8,0:1, `h1` biały ≥ 11,5:1, fraza miedziana `h1` ≥ 4,3:1 (duży tekst — próg 3:1). Desktop bez zmiany gradientu: eyebrow ≥ 6,0:1, akapit ≥ 8,0:1. **Pasek nad zdjęciem:** linki paska (biel .88, 13 px) ≥ 7,5:1, jasne logo ≥ 5,0:1. Axe zwraca te miejsca jako „incomplete" — pomiar jest jedynym strażnikiem |
| F41 | Parallax zdjęcia PIERWSZEGO ekranu | moduł ruchu wpisuje transform dopiero po wczytaniu, a kadr stojący na górze strony o wysokości 66 % okna ma przy scrollu 0 przesunięcie ok. −15 px (1080 px okna) — zdjęcie przeskakiwałoby tuż po wejściu. Pozycja startowa jest więc policzona w CSS tym samym wzorem (zmienne `--sh-r` i `--px-a`; na telefonie wynik 0); e2e porównuje wartość z CSS z wartością wpisaną przez moduł |
| F42 | Wysokość hero | `min-height` (nie `height`): telefon i tablet — okno, desktop — 66 % okna (design `vp-66`); na niskich oknach treść rozpycha hero zamiast się obcinać. Ułamek w `--sh-r` W PARZE z `SELL_HERO_DESKTOP_RATIO` |
| F43 | Kafle radio a `aria-invalid` | `form-ui.ts` bez zmian: kontrolki błędnej grupy dostają `aria-invalid` i komunikat grupy w `aria-describedby` (tylko przy aktywnym błędzie), fokus idzie na pierwszy kafel; axe bez naruszeń w stanie błędów. Każde radio ma `required` — walidacja natywna działa bez JS |
| F44 | Potwierdzenie zgłoszenia | treść ze specyfikacji formularza nie ma numeru telefonu — `FormFrame` pokazuje slot tylko wtedy, gdy teksty ramki mają zdanie, które do niego prowadzi (`doneCall`); `/kontakt/` bez zmian (HTML potwierdzenia ten sam, zrzut `kontakt-form-done` 0 różnic) |
| F45 | Numery kroków | licznik CSS (dekoracja); drobny numer na telefonie (12 px) w odcieniu `--copper-text`, duży na desktopie w `--copper` jak w designie |
| F46 | Kolejność i szerokość pól na desktopie | po przeniesieniu lokalizacji do bloku opcjonalnego (Q1) imię zajmuje cały wiersz (jak w formularzu kontaktowym), para e-mail / telefon — dwa pola w wierszu, blok opcjonalny — trzy pola w rzędzie + pole uwag |
| F47 | Niestabilny zrzut `chrome-footer` (stan zastany) | na `webkit-iphone-14` pod obciążeniem równoległym WebKit rysuje czasem logo stopki w niższej jakości skalowania (różnica wyłącznie w prostokącie logo; 225 px wg Playwrighta przy progu 154 px). Pętla 12 przebiegów `chrome` + `kontakt` progiem 0: gałąź 2 / 12, **czysty main 1 / 12** — nie jest skutkiem PR 2; w izolacji zielony. Wpis w `docs/optional-todos.md` (utwardzenie speca bez zmiany baseline'ów) |

### 11.3 Budżet (pomiar jak §12.5 analizy 4.2, `pnpm build:visual`)

| Plik | Rola | brutto | gzip -9 |
| --- | --- | --- | --- |
| chrome (Navbar, Footer, `contact-details`, `site-config`) | pasek z progiem z wysokości hero: +70 B brutto wobec PR 1 | 8 205 B | 3 393 B |
| `sprzedaj-z-nami.astro_…js` | skrypt strony (uzbrojenie formularzy, przypięcie `--svh`, bramka importu ruchu) | 618 B | 379 B |
| `form-ui.*.js` | moduł formularzy — od PR 2 WSPÓLNY chunk dwóch widoków (w PR 1 siedział w skrypcie `/kontakt/`) | 5 802 B | 2 540 B |
| `content-viewport.*.js` | przypięcie `--svh` — wspólny chunk „/" i „Sprzedaj" | 536 B | 354 B |
| `preload-helper.*.js` | helper `import()` Vite (wspólny) | 1 254 B | 704 B |
| `content-motion.*.js` + `sell-motion.*.js` | ruch: reveale i parallax — tylko przy `no-preference` | 1 320 B | 810 B |
| **razem `script` na `/sprzedaj-z-nami/`** | | **17 735 B** | **8 180 B** |
| `sprzedaj-z-nami.*.css` + `FormFrame.*.css` | widok + `content.css`; style formularzy (wspólny arkusz dwóch widoków) | 11 557 B | 3 235 B |
| HTML `/sprzedaj-z-nami/` | | 30 192 B | 7 417 B |
| skrypty inline | bramka ruchu 648 B, fade `BaseLayout` 1 077 B | | |
| zdjęcie hero | kadr pionowy 18 190 B (poniżej 768 px), poziomy 30 150 B | | |

**Skutek uboczny dla widoków spoza zakresu** — bundler wydziela moduły
używane przez dwie strony do wspólnych plików, więc bajty i liczba żądań
zmieniają się także tam, gdzie kod się nie zmienił:

| Trasa | `script` brutto / gzip -9 po PR 2 | wobec stanu po PR 1 | żądania |
| --- | --- | --- | --- |
| „/" | 14 413 B / 6 773 B | +374 B / +475 B (osobne `content-viewport` i `content-motion`, pasek +70 B) | +2 |
| `/kontakt/` | 14 049 B / 5 995 B | +123 B / −136 B (osobny `form-ui`) | +1 |
| `/oferty/` (wyspa) | `SearchIsland` 38 653 B — co do bajta | bez zmian | 0 |

Arkusz `/kontakt/` rośnie o style kafli i bloku opcjonalnego (wspólny
`forms.css`): 11 715 B / 3 220 B wobec 9 745 B / 2 352 B.

**LHCI lokalnie (1 przebieg, oba configi — asercje czyste na 10
adresach):**

| `/sprzedaj-z-nami/` | mobile | próg | desktop | próg |
| --- | --- | --- | --- | --- |
| `script` | 12 339 B (31 %) | 40 000 | 12 339 B (31 %) | 40 000 |
| `total` | 169,1 KB (17 %) | 1 000 000 | 181,1 KB (15 %) | 1 200 000 |
| w tym obrazy | 68,4 KB | | 80,3 KB | |
| LCP | 2 114 ms | 3 200 | 529 ms | 1 800 |
| element LCP | `h1` | | zdjęcie hero | |
| TBT | 0 ms | 600 | 0 ms | 300 |
| CLS | 0,000 | 0,05 | 0,007 | 0,05 |
| wynik `performance` | 0,99 | 0,9 | 1,00 | 0,95 |
| podmioty trzecie | 0 | | 0 | |

Pozostałe trasy w tym samym przebiegu: „/" `script` 10 576 B (26 %
bramki; po 4.4: 9 345 B — LHCI liczy transfer z nagłówkami, więc dwa
dodatkowe żądania ważą więcej niż sam gzip), LCP mobile 2 111 ms,
`total` desktop 845 KB (70 %); `/kontakt/` `script` 8 312 B (21 %; po
PR 1: 7 829 B), LCP mobile 2 040 ms; `/oferty/` `script` 28 975 B (72 %).
Prognoza z §6 (`script` ok. 8–8,5 KB gzip, LCP mobile = `h1`, desktop =
zdjęcie) sprawdziła się. Margines LCP mobile ok. 1,09 s — poniżej
regułowych 1,3 s, jak na „/" i `/kontakt/` (obserwacja). Progi
nietknięte.

### 11.4 Weryfikacja lokalna

- format, lint, typecheck — czyste; unit 450 testów: 448 zielonych +
  2 skip (38 plików; bez zmian — reguły zgłoszenia weszły w PR 1); build
  89 stron; `test:dist` 6/6.
- `pnpm test:e2e` na 6 profilach: **556 zielonych** (854 pominięcia
  profili), 0 czerwonych; nowy `sprzedaj.spec.ts` = 23 testy (52
  przebiegi na 3 profilach), `navigation.spec.ts` + 2 testy (wariant
  paska na drugiej trasie, 6 profili); axe 0 naruszeń w trzech stanach formularza
  po przejeździe strony (desktop i Pixel 5; allowlista PUSTA).
- `test:visual`: **24 czerwone OCZEKIWANE** — nowe zrzuty bez baseline'u
  (`sprzedaj-top`, `sprzedaj-full`, `sprzedaj-form-errors`,
  `sprzedaj-form-done` × 6); pozostałe 157 zielone (`chrome`, `home`,
  `kontakt`, `oferty`, `oferta`, `not-found` bez ruchu — chrome zmierzony
  dodatkowo progiem 0, F39). Drugi przebieg `sprzedaj` na zapisanych
  zrzutach: 24/24 stabilne (zrzuty robocze usunięte — baseline'y powstają
  wg świętej kolejności). W jednym z pełnych przebiegów czerwony był też
  `chrome-footer` na `webkit-iphone-14` — niestabilność zastana (F47).
- `dist/index.html` po wydzieleniu `MotionGate`: bajt w bajt (F37).

### 11.5 PLACEHOLDER (U9)

`sell-copy.ts`: eyebrow, nagłówek (dwie frazy), akapit hero, „Wypełnij
zgłoszenie", opis zdjęcia, trzy kroki (tytuł + zdanie).
`forms-copy.ts` (`SPRZEDAJ_FORM_COPY`): akapit pod „Zgłoś nieruchomość",
„Wolisz przez telefon?". Reszta tekstów formularza pochodzi ze
specyfikacji w bazie wiedzy (etykiety, placeholdery, podpowiedź przy
cenie, komunikaty, nota, potwierdzenie, błąd wysyłki).

### 11.6 Co sprawdzić na `nowa.` i na fizycznym telefonie

Lista z §8 (pkt 1–5, 7, 8) + po implementacji:

1. **Hero na telefonie:** kadr zdjęcia (dłonie z podkładką widoczne nad
   tekstem), czytelność eyebrow i akapitu na tle zdjęcia (gradient
   mocniejszy niż w designie — F40), wysokość hero przy chowanym pasku
   adresu Safari (hero nie może skakać).
2. **Pasek nad hero:** jasne logo i kreski menu nad zdjęciem; przy
   przewijaniu pasek przemalowuje się płynnie i jest PEŁNY, zanim zjedzie
   pod niego jasna sekcja kroków (telefon: tuż przed końcem hero;
   desktop: hero ma 66 % okna). Otwarcie menu na górze strony i po
   przewinięciu nie zmienia stanu paska.
3. **„Wypełnij zgłoszenie":** po dotknięciu nagłówek „Zgłoś
   nieruchomość" staje pod paskiem (biała sekcja zaczyna się równo
   z dolną krawędzią paska), treść nie zostaje pusta (reveal).
4. **Kafle:** trafialność kciukiem (cały kafel jest celem), „Lokal
   komercyjny" łamie się na dwie linie na wąskim ekranie — czy mieści się
   w kaflu; brak zoomu strony po dotknięciu kafla.
5. **Blok „Szczegóły nieruchomości":** rozwijanie i zwijanie, znak „+"
   / „−"; klawiatura dla powierzchni (z przecinkiem) i ceny (cyfry);
   wpisz w cenę tekst, zwiń blok i wyślij — blok ma się otworzyć,
   a pole z błędem stanąć pod paskiem, nad klawiaturą.
6. **Pusta wysyłka:** fokus na pierwszym kaflu, grupa „Typ nieruchomości"
   z komunikatem widoczna pod paskiem (F36 — na iPhonie w Safari).
7. **Reveale przy szybkim przewijaniu:** kroki i formularz nie zostają
   puste; parallax zdjęcia hero nie szarpie przy chowaniu paska adresu
   i zdjęcie nie „podskakuje" tuż po wczytaniu strony (F41).
8. **Na dużym ekranie:** proporcja hero (66 % okna) i gradient skośny —
   czy tekst po lewej jest czytelny na 13″ i na szerokim monitorze.
9. DO kroku 5.1: wysyłka kończy się komunikatem błędu z numerem telefonu
   (stan oczekiwany); potwierdzenie można zobaczyć tylko „za szybką"
   wysyłką (poniżej 4 s od wejścia — pułapka pokazuje je bez żądania).

### 11.7 Do decyzji / do wykonania poza kodem (Mateusz)

1. Gradient hero na telefonie mocniejszy niż w designie (F40) — cena
   kontrastu AA; alternatywą jest inny kolor eyebrow, nie jaśniejszy
   gradient.
2. Komentarz w skrypcie bramki ruchu (F37) — zostawiony dosłownie dla
   porównania bajt w bajt; drobna korekta możliwa w dowolnym kolejnym
   PR-ze (zmieni HTML „/" o kilkadziesiąt bajtów).
3. Niestabilny `chrome-footer` (F47) — utwardzenie speca osobnym małym
   PR-em albo w PR-ze porządkowym.
4. Krok 5.1 (chmura) nadal przed nami — jak w §10.7.

Decyzje 2026-10-04 (wg rekomendacji): gradient z pkt 1 zostaje; pkt 2
i 3 — w PR porządkowym domknięcia Etapów 4 + 5.
