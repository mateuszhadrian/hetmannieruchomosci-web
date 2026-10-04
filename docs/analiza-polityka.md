# Mini-analiza 4.7 — `/polityka-prywatnosci/`

> **Status:** ZAAKCEPTOWANA 2026-10-04 (Q1–Q10 wg rekomendacji; do tego
> polecenie Mateusza: ponowna weryfikacja treści z materiałami źródłowymi
> projektu i ze źródłami prawnymi, dokument możliwie kompletny — tak, żeby
> klientka i jej prawnik mieli jak najmniej do uzupełnienia), zakodowana
> na gałęzi `feat/polityka` — uzupełnienia po implementacji w §10, lista
> dla prawnika w §12. Część 4.7 Etapu 4 wg instrukcji wykonawczej (dokument
> lokalny, `docs/plan/`): akapit 4.7, „Tryb pracy", „Zasada rozjazdów",
> krok 7.7 (finalizacja treści); prompt §4.7 z `etap-4-prompty.md`.
> Referencja wyglądu: BRAK — `docs/design/export/polityka-prywatnosci.html`
> to pusty placeholder; układ wg bazy wiedzy (`polityka-struktura.md` §1
> i §4), treść = DRAFT wg part1 §10 i §11 (decyzje D23–D28). Za stan
> prawny odpowiada klientka i jej prawnik (D23) — ta analiza zgłasza
> rozjazdy, nie rozstrzyga ich.
> Spójność z 5A i 5B (`analiza-formularze-a.md`, `-b.md`: pola, zgody, co
> funkcja robi z danymi), 4.1 (`analiza-chrome.md` R1: dane firmy
> w stopce) i 4.6 (`analiza-uslugi.md` §10: kotwice z asercją położenia,
> SV32 — szerokości porównywane z sekcją, nie z oknem).

## 0. Zakres

PR 1, gałąź `feat/polityka`: widok polityki (nagłówek z pasmem daty
i wersji, spis treści na kotwicach, `sticky` od 1025 px, dwanaście
sekcji — po weryfikacji doszła osobna sekcja o przekazywaniu danych poza
EOG, §10.2 — wyróżnione prawo sprzeciwu, pas „Pytania o dane") — czysty Astro,
pasek w wariancie stałym, bez ruchu, bez wyspy, bez formularza. Trasa
jest indeksowana, w sitemapie i w obu configach LHCI od Etapu 3 — bez
zmian. Stary adres klauzuli → 301 istnieje w regułach stałych
(`src/lib/offers/redirects.ts`) — bez zmian.

PR 2 (`chore/domkniecie-4-5`) — po zmergowaniu PR 1; plan w §11.

Poza zakresem: formularze (poza opisem w treści), oferty, pozostałe
widoki, chrome, `overlay.ts`, sync, dane, fixture, chmura, progi LHCI,
JSON-LD (Etap 6), poprawki z testów na `nowa.`.

## 1. Inwentarz

Design nie daje nic poza nagłówkiem zastępczym. Stan dzisiejszy:
`src/pages/polityka-prywatnosci.astro` = `SkeletonPage` — jedyny
pozostały użytkownik szkieletu (grep po `src/`: żaden inny plik go nie
importuje), więc po tej części `SkeletonPage.astro` zostaje bez
użytkowników → usunięcie w PR 2.

Linki do polityki: stopka (`Footer.astro`, `.ft-policy`) i nota każdego
formularza (`FormFrame.astro`) — oba prowadzą na adres bez kotwicy.

Baza (main, `pnpm build:visual`): HTML 17 122 B, `script` 8 217 / 3 402 B
w 4 plikach (sam chrome), CSS 27 685 / 6 064 B w 1 arkuszu; LHCI lokalnie
`script` 5 012 B, LCP mobile 1 731 ms (element LCP = `h1`).

## 2. Stan strony a treść polityki — sprawdzone w kodzie

| # | Twierdzenie w polityce | Dowód (kod, 2026-10-04) | Wynik |
| --- | --- | --- | --- |
| S1 | brak cookies i bannera | zero `document.cookie`, `localStorage`, `indexedDB` w `src/` i `functions/`; odpowiedzi serwera podglądu, funkcji formularzy i hosta mediów bez nagłówka `Set-Cookie` (GET, 2026-10-04) | zgodne po zmianie z PP3 (flaga w `sessionStorage` usunięta w tym PR); kontrola nagłówków ponownie po włączeniu reguł ochrony w Etapie 8 |
| S2 | statystyka bez cookies (D27) | brak skryptu analityki w `BaseLayout.astro` i w HTML serwowanym z `nowa.` (GET) | **rozjazd PP2** — skrypt dziś nie jest osadzony |
| S3 | ochrona przed spamem ładowana po pierwszym fokusie w formularzu | `form-ui.ts` tworzy element skryptu przy `focusin`; `TURNSTILE_SITE_KEY` pusty do kroku 5.1 | zgodne (konstrukcja); funkcja przekazuje usłudze adres IP żądania (`remoteip`) — IP nie trafia do maila ani logów |
| S4 | zgłoszenia wychodzą mailem, strona ich nie zapisuje | `functions/api/kontakt.ts`: jedna wiadomość do biura, `Reply-To` tylko przy podanym e-mailu, logi bez danych osoby | zgodne; dostawca wysyłki trzyma własny rejestr wiadomości — PP6 |
| S5 | CV nie jest nigdzie zapisywane | plik żyje w pamięci żądania, jedzie jako załącznik; log niesie rozmiar i ścieżkę kodowania | zgodne (zastrzeżenie jak S4) |
| S6 | licznik dzienny nie zawiera danych osobowych | klucz `quota:{data}` → liczba, TTL 2 dni; binding opcjonalny | zgodne — polityka go nie wymienia jako danych |
| S7 | film i spacer dopiero po kliknięciu | `offer-detail.ts`: `iframe` po kliknięciu, `youtube-nocookie`; miniatura z własnego zasobnika | zgodne |
| S8 | brak Google Fonts | fonty z `@fontsource-variable`, `fonts.css`; zero hostów trzecich w HTML | zgodne |
| S9 | brak mapy interaktywnej | `INTERACTIVE_MAP = false`, mapy to obrazy z zasobnika mediów i z builda | zgodne — dostawca kafli nie jest odbiorcą danych odwiedzających |
| S10 | linki zewnętrzne dopiero po kliknięciu | mapy (stopka, kontakt, detal), udostępnianie oferty (trzy odnośniki), YouTube — zwykłe `<a>` | zgodne; jedno zdanie w sekcji o cookies |
| S11 | zdjęcia ofert z zasobnika mediów | `MEDIA_BASE` = host tymczasowy do Etapu 8 | PP7 |
| S12 | pola i zgody formularzy | `contact-form.ts`, `forms-copy.ts`, komponenty formularzy — tabela w §2.1 | zgodne z opisem w sekcji 03 draftu |

### 2.1 Pola i zgody formularzy (źródło: kod)

| Formularz | Pola | Zgoda (opcjonalna, odznaczona) |
| --- | --- | --- |
| Kontakt | imię i nazwisko · e-mail i telefon (wymagane co najmniej jedno) · wiadomość | marketingowa (`MARKETING_CONSENT`) |
| Zgłoś nieruchomość | typ · rodzaj transakcji · imię i nazwisko · e-mail / telefon · opcjonalnie: lokalizacja, powierzchnia, oczekiwana cena, uwagi | marketingowa |
| Zapytanie o ofertę | numer oferty (pole ukryte) · imię i nazwisko · e-mail / telefon · wiadomość | marketingowa |
| Praca (za `SHOW_PRACA`) | imię i nazwisko · e-mail / telefon · treść (opcjonalna) · CV (PDF, DOC, DOCX) | na przyszłe rekrutacje (`FUTURE_RECRUITMENT_CONSENT`); marketingowej NIE MA |

Wszystkie: pułapka antyspamowa, czas wypełnienia, token ochrony przed
spamem — dane techniczne żądania, nie trafiają do maila. Polityka cytuje
oba brzmienia zgód ZE STAŁYCH (zmiana brzmienia zmienia dokument).
Zdanie o formularzu „Praca" renderuje się tylko przy `SHOW_PRACA`;
sekcja o kandydatach zostaje zawsze (rekrutacja także mailem).

## 3. Rozjazdy — rozstrzygnięcia

| # | Rozjazd | Rozstrzygnięcie |
| --- | --- | --- |
| PP1 | Design nie ma widoku | układ wg `polityka-struktura.md` §1 i §4; wygląd z tokenów i typografii istniejących widoków tekstowych (`/kontakt/`, `/praca/`) |
| PP2 | Analityka (D27) opisana w polityce, a skrypt dziś nie jest osadzony | **zostaje opis wg D27, bez zmiany kodu**: instrukcja włącza analitykę w Etapie 8 (Etap 6 pkt 5 = kontrola zgodności polityki z D27), a data obowiązywania dokumentu = dzień przełączenia (7.7). Do tego czasu strona żyje pod podglądem z `noindex`. Pozycja kontrolna do listy Etapu 8 |
| PP3 | „Brak cookies" jest prawdą, ale `BaseLayout` zapisywał w pamięci sesji przeglądarki flagę `hm:visited` (wartość `1`, bez identyfikatora; sterowała krótkim przejściem między stronami) | **Q5 — rozstrzygnięcie ZMIENIONE po weryfikacji (§10.2 PP14):** przechowywanie informacji w urządzeniu końcowym wymaga zgody, o ile nie jest konieczne do świadczenia usługi (Prawo komunikacji elektronicznej, art. 399) — ozdobne przejście tego warunku nie spełnia, więc samo „opisanie" zostawiałoby prawnikowi realny problem. Flaga USUNIĘTA: przejście wewnętrzne rozpoznaje `document.referrer`, strona niczego nie zapisuje w urządzeniu, a polityka mówi to wprost |
| PP4 | Wzorzec strony chce „czytelnego fallbacku bez JS" dla danych administratora, a kontrakt antyscrapingowy (test `navigation`, wszystkie trasy statyczne) zabrania telefonu i e-maili w statycznym HTML | **Q4** — rekomendacja: bez JS dokument identyfikuje administratora w całości (nazwa rejestrowa, siedziba, NIP, REGON, biuro — statyczny HTML z `BUSINESS`) i podaje adres listowny; telefon i e-mail zostają w slotach, `<noscript>` mówi o tym wprost |
| PP5 | Wzorzec podaje kotwice numerowane (`#pp-NN`) | **Q1** — rekomendacja: identyfikatory znaczące (`#administrator`, `#okresy`, `#sprzeciw` …): prawnik może dodać albo przestawić sekcję bez zmiany adresów, a nota formularza może kiedyś celować w konkretną sekcję |
| PP6 | Lista odbiorców w bazie wiedzy (part1 §10.5) nie rozstrzyga: (a) kto jest stroną umów z dostawcami hostingu i wysyłki i czy wykonawca strony ma dostęp do rejestru wysłanych wiadomości; (b) jak długo dostawca wysyłki trzyma ten rejestr | **rozstrzygnięte po weryfikacji (§10.2 PP15):** (a) wg instrukcji (Etap 9) hosting działa na koncie wykonawcy, wysyłka na koncie klientki — wykonawca wchodzi do listy odbiorców jako KATEGORIA (utrzymanie i obsługa techniczna), bez znacznika; umowa powierzenia = pozycja Etapu 9; (b) 30 dni wg dokumentacji dostawcy — wiersz w tabeli okresów |
| PP7 | Zdjęcia ofert serwuje dziś host tymczasowy (domena wykonawcy) | polityka opisuje stan z dnia obowiązywania (po Etapie 8: host w domenie klientki, ten sam dostawca); bez wpływu na treść, pozycja kontrolna Etapu 8 |
| PP8 | Pozycje part1 §10.5 ze statusem „do ustalenia" / „do sprawdzenia" (aplikacja pocztowa, system wymiany ofert, biuro rachunkowe, transfery poza EOG) | transfery poza EOG — sprawdzone i opisane w osobnej sekcji (§10.2 PP16); aplikacja pocztowa, system wymiany ofert i obsługa księgowa — w treści ze znacznikiem (zależą od praktyki klientki) |
| PP9 | Okresy przechowywania: znane są trzy (part1 §10.4), reszta otwarta | znane wpisane; okres AML = wartość ustawowa, sprawdzona (bez znacznika); rekrutacja i przyszłe rekrutacje — propozycja ze znacznikiem „do potwierdzenia" (§10.2 PP17) |
| PP10 | Adres korespondencyjny przyjęty domyślnie (D26) | w treści adres siedziby z `BUSINESS` (adres do doręczeń z rejestru — wartość pewna), bez znacznika; potwierdzenie na liście §12 |
| PP11 | Part1 §10.6 nie wymienia informacji z art. 13 ust. 2 lit. e RODO (dobrowolność podania danych i skutek niepodania) | akapit „Czy musisz podawać dane" w sekcji 03 (bez znacznika — to element obowiązkowy, nie wartość); na liście §12 |
| PP12 | Data dokumentu | **Q3** — stałe w kodzie, nie `BUILD_NOW`; data obowiązywania = PLACEHOLDER do dnia przełączenia (7.7) |
| PP13 | Brzmienie zgody na przyszłe rekrutacje ma już znacznik PLACEHOLDER w `contact-form.ts` | bez zmian — polityka cytuje stałą; pozycja na liście dla prawnika |

## 4. Czego design nie ma, a trzeba zbudować (czyli wszystko)

**Układ** (jeden markup, próg 1025 px W PARZE ze stałą
`POLICY_DESKTOP_MIN_PX`):

- **Nagłówek:** eyebrow, `h1` „Polityka prywatności", jedno zdanie
  wstępu, **pasmo dokumentu** `<dl data-policy-meta>` — „Obowiązuje od",
  „Ostatnia aktualizacja", „Wersja". Przy `POLICY_DRAFT` nad pasmem
  jednozdaniowa informacja „projekt dokumentu" (Q2).
- **Spis treści** `nav[data-policy-toc]` (`aria-label`), `<ol>`
  z dwunastoma odnośnikami `#id` — czyste kotwice, działa bez JS, bez
  podświetlania bieżącej sekcji (zero skryptu). Poniżej 1025 px: karta
  nad treścią. Od 1025 px: lewa kolumna, `position: sticky`,
  `top: var(--hdr-h) + odstęp`, `align-self: start`; gdy spis jest wyższy
  od okna (niski laptop) — własne przewijanie (`max-height` z `svh`,
  `overflow-y: auto`, region dostępny z klawiatury). Żaden przodek nie
  ma `overflow: hidden / clip` (test).
- **Treść:** kolumna do ok. 72 `ch`, `text-wrap: pretty`; sekcje
  `section[id][data-policy-section]` z `h2` i `aria-labelledby`, numer
  sekcji jako licznik CSS (dekoracja; kolejność niosą `<ol>` spisu
  i struktura nagłówków). `scroll-margin-top: var(--hdr-h) + 16 px` na
  obu progach (pasek stały, sekcje nie zawierają jego wysokości).
- **Sekcja 03** (najdłuższa): siedem grup osób wg D24 jako karty —
  `h3` + `<dl>` (jakie dane · po co · podstawa prawna).
- **Sekcja 04:** lista odbiorców (kto → co i dlaczego) w trzech grupach:
  dostawcy usług, odbiorcy związani z transakcją, treści uruchamiane
  kliknięciem.
- **Sekcja „Jak długo…":** JEDYNE miejsce z okresami — tabela dwukolumnowa
  (grupa → okres) z `<caption>`; mieści się na 320 px bez przewijania.
- **Sekcja „Prawo sprzeciwu":** osobna sekcja z własnym `h2`
  i pozycją w spisie, wizualnie wyłamana (granatowa ramka, jasny tekst,
  miedziana kreska) — nie punkt listy praw. Kontrast na jednolitym tle
  liczy axe.
- **Pas domykający „Pytania o dane":** e-mail i telefon przez sloty
  (`a[data-mail="biuro"]`, `a[data-tel]` z `<span data-slot>`), adres
  listowny i biuro z `BUSINESS`; bez JS wiersze slotów znikają
  (`:has(> a[hidden])`), `<noscript>` wyjaśnia (PP4).
- **Druk** (Q7): `@media print` — bez paska, stopki i spisu, treść na
  całą szerokość, ramka sprzeciwu z obrysem zamiast tła.

**Sekcje i kotwice** (Q1; tytuły robocze):

| Nr | `id` | Tytuł |
| --- | --- | --- |
| 01 | `administrator` | Kto jest administratorem Twoich danych |
| 02 | `zrodla` | Skąd mamy Twoje dane |
| 03 | `cele` | Po co przetwarzamy dane i na jakiej podstawie |
| 04 | `odbiorcy` | Komu przekazujemy dane |
| 05 | `poza-eog` | Przekazywanie danych poza Europejski Obszar Gospodarczy |
| 06 | `okresy` | Jak długo przechowujemy dane |
| 07 | `prawa` | Twoje prawa |
| 08 | `sprzeciw` | Prawo sprzeciwu |
| 09 | `cookies` | Pliki cookies, statystyka i treści zewnętrzne |
| 10 | `czego-nie-robimy` | Czego nie robimy |
| 11 | `skarga` | Skarga do organu nadzorczego |
| 12 | `zmiany` | Zmiany polityki |

**Treść:** piszę wg part1 §10 (grupy D24, podstawy §10.2, AML §10.3,
okresy §10.4, odbiorcy §10.5, elementy §10.6) i §11 (D27, D28). Każda
niewiadoma = widoczny znacznik w tekście (Q2) — lista w §7.

## 5. Architektura i pliki

- `src/pages/polityka-prywatnosci.astro` — `BaseLayout`, `<Navbar />`
  (wariant stały), `<main class="pp">`, `<Footer />`; skrypt strony =
  sama korekta pozycji po wejściu z kotwicą (Q6). Bez `MotionGate`, bez
  `content.css` (własne klasy `pp-*`; arkusz stron treściowych niesie
  reveale i kadry, których tu nie ma).
- `src/components/sections/policy/`: `PolicyHead.astro` (nagłówek,
  pasmo), `PolicyToc.astro`, `PolicyBody.astro` (dwanaście sekcji —
  treść jako markup; długi tekst prawny z odnośnikami, slotami
  i znacznikami nie nadaje się na stałe tekstowe), `PolicyContact.astro`
  (pas domykający), `PolicyTodo.astro` (znacznik niewiadomej:
  `<mark data-policy-todo>`), `policy-config.ts` (`POLICY_SECTIONS` —
  `id` + tytuł, jedno źródło dla spisu, nagłówków i testów;
  `POLICY_VERSION`, `POLICY_UPDATED`, `POLICY_EFFECTIVE`, `POLICY_DRAFT`,
  `POLICY_DESKTOP_MIN_PX`).
- `src/components/sections/content-anchor.ts` (Q6) — wydzielona korekta
  pozycji po wejściu z kotwicą w adresie (logika z `uslugi.astro`:
  po `load` i po fontach, tylko `navigation.type === "navigate"`, tylko
  dopóki użytkownik nie przewinął).
- `ui.ts`: tytuł i opis strony bez zmian (tytuł jest kontraktem testu).
- Chrome, `BaseLayout`, `contact-details.ts`, `jsonld.ts`, formularze —
  bez zmian. HTML pozostałych tras porównany odciskiem.

## 6. Kontrakty i testy

**Unit** `policy` (nowy, mały): `id` sekcji unikalne, ASCII, kebab-case;
dwanaście pozycji; `POLICY_DRAFT === false` ⇒ data obowiązywania
ustawiona; format dat i wersji.

**E2E** `polityka.spec.ts` (treść `chromium-1920`; kotwice, układ, sloty
także `chromium-pixel-5` i `webkit-iphone-14`):

- nagłówek: `main h1`, tytuł strony, pasmo = stałe z `policy-config`;
  przy `POLICY_DRAFT` informacja o projekcie i `[data-policy-todo]`
  w liczbie > 0, bez `POLICY_DRAFT` — zero (bramka 7.7);
- **spis = nagłówki:** odnośniki spisu w kolejności `POLICY_SECTIONS`,
  `href` = `#id`, tekst = tekst `h2` sekcji, każda sekcja
  `aria-labelledby` własnego `h2`, jeden `h1`, hierarchia `h2` → `h3`;
- **kotwice z asercją położenia** (wzorzec `expectAtAnchor`,
  `expect.poll`, trzy profile, w tym WebKit): klik w spis (wszystkie
  pozycje na desktopie; pierwsza, „sprzeciw" i ostatnia na telefonach),
  wejście z adresu z kotwicą, powrót „wstecz" do spisu; górna krawędź
  sekcji = dolna krawędź paska + margines (± 1,5 px), `h2` w oknie;
  `scroll-behavior` dokumentu = `auto`;
- **`sticky`** (desktop): po przewinięciu w połowę dokumentu górna
  krawędź spisu = pasek + odstęp (sub-pikselowo), spis w oknie; żaden
  przodek z `overflow` innym niż `visible`; niskie okno (1366 × 560):
  spis przewijalny i osiągalny z klawiatury; `expectBreakpointFlip`
  (siatka block ↔ grid, spis static ↔ sticky); szerokości porównywane
  z kontenerem, nie z `documentElement.clientWidth` (SV32);
- **sloty:** surowy `<main>` bez telefonu, e-maili, `tel:`, `mailto:`;
  puste kotwice z `<span data-slot>`; po JS `mailto:` / `tel:`; bez JS
  (`javaScriptEnabled: false`): nazwa rejestrowa, siedziba, NIP, REGON
  i biuro widoczne (wartości z `BUSINESS`), `.pp-nojs` widoczne
  (locator po klasie), wiersze slotów ukryte;
- **sprzeciw:** `section#sprzeciw[data-policy-objection]` z własnym `h2`,
  pozycja w spisie, tło inne niż sąsiednich sekcji;
- **zgodność z formularzami:** tekst zawiera `MARKETING_CONSENT`
  i `FUTURE_RECRUITMENT_CONSENT` (ta druga ⇔ `SHOW_PRACA`);
- tabela okresów: `caption`, nagłówki `th[scope]`; brak przewijania
  w bok na 320 i 390 px;
- brak ruchu: zero `js-motion`, `[data-rv]`, `[data-px]`; scroll
  natywny; zero hostów trzecich; druk (`emulateMedia`): pasek, stopka
  i spis ukryte;
- axe WCAG 2 A/AA: desktop, Pixel 5, niskie okno ze spisem przewijanym.

`navigation`, `seo`, `a11y`, `smoke` obejmują trasę już dziś (lista
`STATIC_PATHS`) — bez zmian speców; pierwszy pełny przebieg e2e pokaże,
czy któryś locator przestał być jednoznaczny.

**Visual** `polityka.spec.ts` (`useVisualFixtureGuard`): `polityka-top`
(okno startowe), `polityka-full` (fullPage, próg 0,001) × 6 profili =
12 PNG na platformę. Znaczniki niewiadomych SĄ na obrazie — finalizacja
treści w 7.7 i tak regeneruje oba zrzuty.

## 6a. Budżet (prognoza; pomiar po `build:visual` w uzupełnieniach)

`script`: chrome 8 217 B + skrypt strony z korektą kotwicy ok. 0,5 KB
(+1 plik) — ok. 13 % bramki 40 000 B po gzipie LHCI. CSS: +6–8 KB brutto
(własne klasy, bez `content.css`). HTML: z 17 KB do ok. 50–60 KB (tekst).
Brak obrazów; element LCP = `h1`; `total` mobile ok. 150 KB. Progi
nietknięte, ryzyka dla bramek nie widzę.

## 7. Lista PLACEHOLDER (zamykana w 7.7)

Stan PO implementacji i weryfikacji — pierwotna lista szesnastu pozycji
skróciła się do ośmiu znaczników w tekście (reszta została ustalona ze
źródeł, §10.2). Cała treść pozostaje projektem do przeglądu prawnika
(D23); pełna lista z pytaniami: §12.

| # | Sekcja dokumentu | Znacznik | Kto zamyka |
| --- | --- | --- | --- |
| 1 | pasmo dokumentu | [do uzupełnienia] data obowiązywania = dzień uruchomienia strony | Mateusz (Etap 8) |
| 2 | 04 Odbiorcy — Microsoft | [do potwierdzenia] czy aplikacja pocztowa synchronizuje skrzynkę przez chmurę dostawcy | klientka |
| 3 | 04 Odbiorcy — obsługa księgowa | [do uzupełnienia] biuro rachunkowe albo program księgowy | klientka |
| 4 | 04 Odbiorcy — doradca kredytowy | [do potwierdzenia] przekazanie wyłącznie na prośbę klienta; podstawa prawna | klientka + prawnik |
| 5 | 04 Odbiorcy — inne biura | [do uzupełnienia] czy i jakie dane klientów trafiają do systemu wymiany ofert | klientka |
| 6 | 05 Poza EOG | [do potwierdzenia] program pocztowy a transfer — wynika z pozycji 2 | klientka + prawnik |
| 7 | 06 Okresy — rekrutacja | [do potwierdzenia] do zakończenia rekrutacji, najwyżej 6 miesięcy | klientka + prawnik |
| 8 | 06 Okresy — przyszłe rekrutacje | [do potwierdzenia] do cofnięcia zgody, najwyżej 12 miesięcy | klientka + prawnik |

Poza tekstem polityki: brzmienie zgody na przyszłe rekrutacje (stała
`FUTURE_RECRUITMENT_CONSENT` w `contact-form.ts`, znacznik PLACEHOLDER
z 5B) — polityka cytuje stałą.

Do weryfikacji technicznej w kroku 5.1 (gdy powstanie widget): czy
usługa ochrony formularzy zapisuje w przeglądarce własne dane — zdanie
w sekcji 09 jest na to przygotowane („może zapisać … niezbędne
informacje techniczne").

## 8. Co sprawdzić na fizycznym telefonie (i na `nowa.`)

1. Spis treści: dotknięcie pozycji stawia nagłówek sekcji POD paskiem
   (Safari iOS, Chrome Android) — pierwsza, „Prawo sprzeciwu", ostatnia.
2. „Wstecz" po skoku wraca do spisu, nie opuszcza strony.
3. Wejście z adresu z kotwicą (np. `…/polityka-prywatnosci/#okresy`
   wklejone w pasek) — sekcja pod paskiem, także na zimnym cache.
4. Tabela okresów i karty grup na 320–390 px: bez przewijania w bok,
   długie słowa i adres e-mail łamią się w kolumnie.
5. Odnośniki spisu: wygodny cel dotyku (≥ 44 px), brak przypadkowych
   trafień w sąsiednią pozycję.
6. Sloty: `tel:` wybiera numer, `mailto:` otwiera pocztę.
7. Tablet poziomo i laptop 13″: spis przyklejony pod paskiem, nie
   ucieka i nie nachodzi na stopkę; przy niskim oknie przewija się sam.
8. Druk / „Zapisz jako PDF" z przeglądarki (komputer): dokument bez
   paska i spisu, ramka sprzeciwu czytelna w czerni.
9. Link z noty dowolnego formularza i ze stopki otwiera politykę od
   góry.

## 9. Pytania do Mateusza (z rekomendacją)

**Decyzja 2026-10-04: komplet rekomendacji przyjęty.** Dwie pozycje
wykonane inaczej niż w rekomendacji — po weryfikacji, w ramach polecenia
„jak najmniej pracy dla klientki i prawnika": Q5 (flaga w pamięci sesji
usunięta zamiast opisana — PP14) i Q8 (wykonawca i okres rejestru
wiadomości wpisane jako fakty, nie znaczniki — PP15). Q10: wynik
sprawdzenia własnego zastąpiła weryfikacja z dokumentacji dostawców
(PP16).

- **Q1 — kotwice.** Identyfikatory znaczące (`#administrator` …
  `#zmiany`, tabela w §4) zamiast `#pp-NN` ze wzorca. **Rekomendacja:
  znaczące** (PP5).
- **Q2 — widoczność draftu.** Niewiadome widoczne w tekście jako
  wyróżnione „[do uzupełnienia: …]" / „[do potwierdzenia]" + jedno
  zdanie „projekt dokumentu" nad pasmem, sterowane stałą `POLICY_DRAFT`;
  test pilnuje, że po jej wyłączeniu znaczników jest zero.
  **Rekomendacja: tak** — prawnik czyta stronę na `nowa.` (noindex)
  i widzi dokładnie, co jest otwarte; draft nie wyjdzie na produkcję
  niezauważony.
- **Q3 — data i wersja.** `POLICY_VERSION = "1.0"`,
  `POLICY_UPDATED = "2026-10-04"` (dzień draftu; zmieniana ręcznie przy
  każdej zmianie treści), `POLICY_EFFECTIVE = null` → w paśmie znacznik
  „dzień uruchomienia strony" do 7.7. **Rekomendacja: tak.**
- **Q4 — bez JS.** Dane rejestrowe i adres listowny w statycznym HTML,
  telefon i e-mail tylko w slotach + `<noscript>`. **Rekomendacja:
  tak** (PP4; kontrakt antyscrapingowy zostaje nietknięty).
- **Q5 — flaga w pamięci sesji.** Opisać jednym zdaniem w sekcji o cookies
  i zapytać prawnika (mechanizm zostaje) albo usunąć mechanizm
  z `BaseLayout` (osobna decyzja o chrome, zmiana zachowania
  nawigacji). **Rekomendacja: opisać.**
- **Q6 — wejście z kotwicą w adresie.** Korekta pozycji jako wspólny
  moduł `content-anchor.ts`; w PR 1 używa go tylko polityka, `/uslugi/`
  przechodzi na niego w PR 2 (odcisk HTML + e2e kotwic usług).
  **Rekomendacja: tak**; alternatywa — brak skryptu na polityce (strona
  nie ma obrazów ani ruchu, ale wysokość paska i fonty zmieniają układ
  po skoku — lekcja z WebKita na Linuksie).
- **Q7 — arkusz druku.** Prosty `@media print` (ok. 0,4 KB CSS).
  **Rekomendacja: tak** — prawnik i klientka dostają czysty PDF
  z przeglądarki.
- **Q8 — dwie luki treści.** (a) Zdanie robocze o dobrowolności podania
  danych (PP11); (b) wykonawca strony jako możliwy odbiorca i okres
  rejestru wiadomości u dostawcy wysyłki (PP6) — oba jako znaczniki do
  oceny prawnika. **Rekomendacja: tak.** Jeśli wiesz, kto jest stroną
  umów z dostawcami hostingu i wysyłki po przekazaniu (Etap 9) —
  podaj, wpiszę zamiast znacznika.
- **Q9 — PR 2.** (a) Osobny krótki dokument
  `docs/analiza-domkniecie-4-5.md` zamiast sekcji tutaj (inny zakres:
  arkusze ofert, spec chrome'u, porządki, LHCI) — **rekomendacja:
  osobny**, piszę go po merge'u PR 1. (b) Hero `/sprzedaj-z-nami/` na
  `data-px="top"` — **rekomendacja: NIE zmieniać**: obecny wzór CSS
  działa i ma własny kontrakt e2e, zmiana przesuwa kadr zdjęcia
  pierwszego ekranu (ponowna ocena wyglądu) i wymaga regeneracji
  zrzutów `sprzedaj-*` na obu platformach, a użytkownik nic nie zyskuje;
  pozycja w `optional-todos.md` do zamknięcia jako „zostaje".
- **Q10 — sprawdzenie własne.** Czy masz wynik pozycji z planu
  (Część E pkt 14: aplikacja pocztowa a chmura dostawcy, transfery poza
  EOG)? **Domyślnie: nie — zostają znaczniki 8 i 12.**

## 10. Uzupełnienia po implementacji

Decyzje Q1–Q10 zapadły wg rekomendacji (2026-10-04) razem z poleceniem:
zweryfikować treść jeszcze raz z materiałami źródłowymi projektu (baza
wiedzy, odpowiedzi klientki, lista pytań do polityki) i ze źródłami
prawnymi, a dokument przygotować tak, żeby klientka i prawnik mieli jak
najmniej do uzupełnienia. Materiały źródłowe potwierdziły ustalenia
part1 §10 bez sprzeczności; weryfikacja zewnętrzna zmieniła siedem
rzeczy (PP14–PP20).

### 10.1 Co powstało

- `src/pages/polityka-prywatnosci.astro` + `sections/policy/`:
  `PolicyHead`, `PolicyToc`, `PolicyBody`, `PolicySection`,
  `PolicyContact`, `PolicySlot`, `PolicyTodo`, `policy.css`,
  `policy-config.ts`.
- `src/components/sections/content-anchor.ts` — `armAnchorAlign(selektor)`,
  korekta pozycji po wejściu z kotwicą w adresie (w tym PR używa go tylko
  polityka).
- `src/layouts/BaseLayout.astro` — skrypt przejścia wewnętrznego bez
  zapisu w przeglądarce (PP14).
- Testy: unit `policy` (8), e2e `polityka.spec.ts` (24 testy; 42 przebiegi
  na 6 profilach), visual `polityka.spec.ts` (2 zrzuty × 6 profili).
- `SkeletonPage.astro` został bez użytkowników — usunięcie w PR 2.

### 10.2 Rozstrzygnięcia w trakcie (ciąg dalszy §3)

| # | Sprawa | Rozstrzygnięcie |
| --- | --- | --- |
| PP14 | Flaga `hm:visited` w `sessionStorage` (PP3, Q5) | Przechowywanie informacji w urządzeniu końcowym wymaga zgody, chyba że jest konieczne do świadczenia usługi (Prawo komunikacji elektronicznej, art. 399). Ozdobne przejście między stronami tego nie spełnia. **Flaga usunięta:** przejście wewnętrzne rozpoznaje `document.referrer` (adres odsyłający z tego samego serwisu) — zachowanie to samo (wejście z zewnątrz bez bramki, przejścia wewnątrz serwisu z krótkim fade), zero zapisu. Polityka może powiedzieć wprost „strona niczego nie zapisuje w Twoim urządzeniu", a e2e to sprawdza (cookies, `localStorage`, `sessionStorage` puste po przejściu wewnętrznym). Osobny commit — można go wyłączyć z PR bez wpływu na resztę (wtedy zdanie w sekcji 09 wymaga korekty) |
| PP15 | Wykonawca strony i rejestr wiadomości u dostawcy wysyłki (PP6, Q8) | Hosting działa na koncie wykonawcy → wykonawca wpisany jako odbiorca (kategoria „utrzymanie i obsługa techniczna"), bez zdań o tym, do czego NIE ma dostępu (ma dostępy administracyjne, więc takiej deklaracji nie składamy). Dostawca wysyłki przechowuje treść wiadomości i dzienniki 30 dni, w USA — wpisane do tabeli okresów i do sekcji o transferach. Zdanie „strona nie zapisuje pliku CV" zostaje prawdziwe; pełny obraz daje wiersz o dostawcy |
| PP16 | Transfery poza EOG (PP8, Q10) | Wzorzec zakładał „brak przekazywania poza EOG [do potwierdzenia]" w sekcji „Czego nie robimy". Sprawdzone: obaj dostawcy techniczni to spółki z USA, obaj w programie Data Privacy Framework, obaj mają w umowach standardowe klauzule umowne; treść i dzienniki wysyłki leżą w USA także przy europejskim regionie wysyłki. **Nowa, osobna sekcja 05** (dokument ma 12 sekcji) z podstawą transferu i informacją, jak uzyskać kopię zabezpieczeń |
| PP17 | Okresy rekrutacyjne (PP9) | Propozycje z bazy wiedzy wpisane jako wartości ze znacznikiem „do potwierdzenia": do zakończenia rekrutacji, najwyżej 6 miesięcy; przyszłe rekrutacje — do cofnięcia zgody, najwyżej 12 miesięcy (górna granica dodana, bo bezterminowe przechowywanie jest najczęstszym zarzutem). Stanowisko organu nadzorczego jest ostrzejsze — opisane w §12.1 |
| PP18 | Adres organu nadzorczego | Urząd zmienił siedzibę — starsze wzorce polityk (także ten, na którym opiera się układ strony) niosą poprzedni adres. Wpisany aktualny, ze strony urzędu |
| PP19 | Okres AML i artykuł zgody marketingowej | Potwierdzone w tekstach ustaw: 5 lat od zakończenia stosunków gospodarczych albo transakcji okazjonalnej (art. 49 ust. 1 ustawy AML — bez znacznika); zgoda na marketing bezpośredni — art. 398 Prawa komunikacji elektronicznej (nie przepisy sprzed listopada 2024) |
| PP20 | Program pocztowy jako odbiorca | Dokumentacja dostawcy potwierdza, że aplikacja mobilna i nowa wersja na komputer synchronizują konta innych dostawców przez własną chmurę. Czy dotyczy to biura, zależy od używanej wersji → pozycja w odbiorcach ze znacznikiem (§12.1 pkt 2) |
| PP21 | Źródła danych (sekcja 02) | Dodana „druga strona transakcji" (wynika z przekazywania danych stron notariuszowi); rejestrów publicznych NIE dopisałem — brak ustalenia (§12.2 pkt 11) |
| PP22 | Statystyka — liczby | Opis bez liczb o przechowywaniu: narzędzie nie zapisuje danych pozwalających rozpoznać osobę, a wartości z bazy wiedzy nie dało się potwierdzić w dokumentacji dostawcy |
| PP23 | Znaczniki widoczne w tekście | 8 zamiast 16 z §7 pierwotnej wersji: wszystko, co dało się ustalić ze źródeł, jest wpisane jako treść; znacznik zostaje tylko tam, gdzie odpowiedź zna wyłącznie klientka |
| PP24 | Skrypt inline w `BaseLayout` | `is:inline` wysyła skrypt razem z komentarzami — komentarz przeniesiony poza skrypt, warunek uproszczony: HTML KAŻDEJ trasy mniejszy o 705 B |
| PP25 | Wspólny arkusz +21 B | Skaner klas Tailwinda czyta źródła — w nowych plikach po raz pierwszy wystąpiło słowo `table`, więc do wspólnego arkusza weszła klasa użytkowa `.table` (+21 B brutto / +8 B gzip na każdej trasie). Bez wpływu na wygląd (zrzuty progiem 0) |
| PP26 | Skrypt strony | Korekta kotwicy jest tak mała, że Astro wstawia ją inline — polityka nie ma własnego pliku skryptu (4 pliki chrome'u jak szkielet) |
| PP27 | Listy w tekście | Preflight Tailwinda zeruje `list-style` — `.pp-list` przywraca znaczniki (lista praw jest numerowana) |
| PP28 | Przewijany spis a axe | Region przewijany zawiera odnośniki, więc jest osiągalny z klawiatury bez `tabindex` — axe bez naruszeń przy oknie 1366 × 480; fokus na pozycji wprowadza ją w widoczną część spisu |

### 10.3 Budżet (pomiar jak §12.5 analizy 4.2, `pnpm build:visual`; baza = `main` zbudowany tą samą komendą)

| Trasa | Pozycja | Baza | Po zmianie |
| --- | --- | --- | --- |
| `/polityka-prywatnosci/` | HTML | 17 122 B | 42 758 B |
| | `script` (pliki) | 8 217 / 3 402 B w 4 plikach | bez zmian (skrypt strony inline, ok. 0,6 KB w HTML) |
| | CSS | 27 685 / 6 064 B w 1 arkuszu | 35 790 / 8 291 B w 2 arkuszach (+8 105 / +2 227 B) |
| każda inna trasa (37) | HTML | — | −705 B (skrypt inline bez komentarzy) |
| | wspólny arkusz | — | +21 B / +8 B gzip (PP25) |
| | pozostałe zasoby | — | bez zmian; wyspa listy co do bajta (38 653 B) |

Odcisk HTML (hashe nazw zasobów znormalizowane, skrypt przejścia
wewnętrznego wycięty): **37 z 38 tras builda na fixture identyczne**,
różni się wyłącznie polityka.

LHCI lokalnie (1 przebieg, oba configi, asercje czyste na 13 adresach):

| Adres | `script` | `total` | LCP mobile / desktop | CLS | Element LCP |
| --- | --- | --- | --- | --- | --- |
| `/polityka-prywatnosci/` | 5 012 B (13 % bramki) | 126 KB | 1 658 / 411 ms | 0,000 / 0,011 | akapit wstępu / sekcja 01 |
| „/" | 10 754 B (27 %) | 298 / 845 KB | 2 194 / 644 ms | ≤ 0,007 | `h1` |
| `/kontakt/` | 8 670 B (22 %) | 183 / 202 KB | 2 047 / 493 ms | ≤ 0,007 | mapa |
| `/uslugi/` | 9 703 B (24 %) | 268 / 329 KB | 2 343 / 548 ms | ≤ 0,007 | zdjęcie hero / `h1` |
| `/o-nas/` | 9 551 B (24 %) | 330 / 383 KB | 2 265 / 547 ms | ≤ 0,007 | zdjęcie hero / `h1` |
| lista rodzaju | 29 003 B (73 %) | 316 KB | 2 489 / 541 ms | ≤ 0,003 | zdjęcie karty |
| detal (działka) | 12 256 B (31 %) | 402 / 490 KB | 2 729 / 582 ms | ≤ 0,006 | zdjęcie hero |

TBT 0 wszędzie, zero podmiotów trzecich. Progi nietknięte; polityka jest
najlżejszą trasą serwisu. CLS desktop 0,011 na polityce (próg 0,05) —
podmiana fontu w długim tekście; obserwacja.

### 10.4 Weryfikacja lokalna

- format, lint, typecheck — czysto; unit 547 (545 zielonych + 2 skip
  przy `dist/` z `build:visual`), w tym nowy `policy` (8);
- build 89 stron, `test:dist` 6/6;
- e2e na 6 profilach: 765 zielonych (+1 239 pominięć profili) — pełny
  przebieg po zmianie `BaseLayout` (żaden istniejący test nie wymagał
  poprawki); axe 0 naruszeń (desktop, Pixel 5, niskie okno);
- `test:visual` z progiem 0 (jeden przebieg pomiarowy, pliki przywrócone):
  **239 zrzutów identycznych co do piksela** (w tym wszystkie `chrome-*`,
  `home-*`, `kontakt-*`, `sprzedaj-*`, `praca-*`, `o-nas-*`, `uslugi-*`,
  `oferty-*`, `oferta-*`), 12 nowych `polityka-*` bez baseline'u,
  `not-found-top` różni się na `chromium-1920` (877 px) i `firefox-desktop`
  (828 px) — stan znany od 4.1, pod progiem projektu, bez regeneracji;
  drugi przebieg `polityka` na progach projektu: 12/12 zielone (zrzuty
  stabilne); robocze `*-darwin.png` usunięte;
- LHCI lokalnie — §10.3.

### 10.5 PLACEHOLDER

Lista w §7 (osiem znaczników) i §12.

### 10.6 Co sprawdzić na `nowa.` i na fizycznym telefonie

Lista z §8 (pkt 1–9) + po implementacji:

1. **Przejścia między stronami** (zmiana w `BaseLayout`): wejście na stronę
   z wyszukiwarki albo z wpisanego adresu — bez mrugnięcia; kliknięcie
   w menu albo w link w stopce — krótkie, miękkie pojawienie się treści
   jak dotąd. Safari iOS i Chrome Android, także „wstecz".
2. **Znaczniki projektu** w tekście: czytelne, nie rozjeżdżają wierszy
   tabeli okresów na telefonie.
3. **Ramka „Prawo sprzeciwu"** na telefonie: tekst na granacie czytelny,
   odnośnik widoczny.
4. **Wydruk do PDF** (komputer, Chrome i Safari): informacja o projekcie
   jest na pierwszej stronie, karty i wiersze tabeli nie łamią się w pół.

### 10.7 Do decyzji / do wykonania poza kodem (Mateusz)

1. **Draft do prawnika** (D23): PDF z wydruku strony podglądu + lista
   §12 (pytania 12.1 kieruj do klientki — pięć z ośmiu znaczników zamyka
   ona sama, bez prawnika).
2. **Umowa o utrzymanie strony** (Etap 9): powierzenie przetwarzania —
   polityka wymienia wykonawcę jako odbiorcę danych.
3. **Etap 8:** data obowiązywania (`POLICY_EFFECTIVE`), włączenie
   statystyki, kontrola nagłówków `Set-Cookie` po włączeniu reguł ochrony,
   host mediów w domenie klientki.
4. **Krok 5.1:** po założeniu widgetu sprawdzić w narzędziach przeglądarki,
   czy zapisuje własne dane (zdanie w sekcji 09 jest na to przygotowane).
5. Jeśli wolisz NIE zmieniać `BaseLayout` w tym PR — pomiń commit
   z PP14; wtedy przed merge'em trzeba przywrócić zdanie o fladze sesji
   w sekcji 09 i usunąć test „strona niczego nie zapisuje w urządzeniu".

## 11. Plan PR 2 — domknięcie Etapów 4 i 5 (szkic; szczegóły w osobnym dokumencie po Q9)

1. `docs/placeholdery-tresci.md` — każdy PLACEHOLDER z `src/` (dziś 12
   plików + polityka) z adresem i osobą zamykającą; warianty i wartości
   do potwierdzenia przez klientkę.
2. Rozdzielenie arkuszy listy rodzaju i detalu oferty (pomiar CSS per
   trasa i LCP przed / po; wyspa listy co do bajta).
3. Utwardzenie zrzutu `chrome-footer` na `webkit-iphone-14` — tylko
   spec, bez zmiany baseline'ów (pomiar progiem 0).
4. Usunięcie `CollapsibleText.astro`, `collapsible.ts`,
   `SkeletonPage.astro`, `uslugi-hero-m.webp`, `uslugi-prawne2.webp`
   (każdy po sprawdzeniu grepem, że nic go nie importuje).
5. `/uslugi/` na wspólnym `content-anchor.ts` (Q6); komentarz
   w `MotionGate.astro` (F37).
6. Pomiar `lhci-measure.yml` na runnerze (uruchamia Mateusz) →
   propozycja progów z median jako osobny commit; liczby dla `/uslugi/`,
   `/o-nas/`, `/praca/`, `/sprzedaj-z-nami/`, `/kontakt/`.
7. `docs/poprawki-po-implementacji.md` — jedna lista pozycji „do oceny
   na urządzeniach" z analiz i z `optional-todos.md`, bez naprawiania.
8. `CLAUDE.md`: Etapy 4 i 5 (kod) — WYKONANE; zostaje blok chmury.

## 12. Lista dla prawnika i klientki: placeholdery i pytania

Draft idzie do prawnika klientki po zmergowaniu PR 1 (D23) — najwygodniej
jako wydruk do PDF ze strony podglądu (arkusz druku: bez paska i spisu,
z informacją o projekcie). Numery sekcji = numery w dokumencie.

### 12.1 Znaczniki w tekście (8) — wymagają odpowiedzi

| # | Sekcja | Pytanie | Do kogo |
| --- | --- | --- | --- |
| 1 | pasmo dokumentu | Data obowiązywania — wpisywana w dniu uruchomienia strony pod domeną główną | wykonawca |
| 2 | 04 — Microsoft | Czy poczta biura jest odbierana w aplikacji, która synchronizuje skrzynkę przez chmurę dostawcy aplikacji (aplikacja mobilna i „nowa" wersja na komputer tak robią — dokumentacja dostawcy)? Jeśli tak: pozycja zostaje, a dostawca wchodzi do sekcji 05 | klientka |
| 3 | 04 — obsługa księgowa | Kto prowadzi księgowość: biuro rachunkowe (nazwa kategorii wystarczy) czy program księgowy? | klientka |
| 4 | 04 — doradca kredytowy | Czy dane trafiają do doradcy wyłącznie na prośbę klienta? Od tego zależy podstawa prawna (działanie na żądanie osoby albo zgoda) | klientka + prawnik |
| 5 | 04 — inne biura | Czy do systemu wymiany ofert trafiają jakiekolwiek dane klientów (właścicieli, kupujących), czy wyłącznie opis nieruchomości? | klientka |
| 6 | 05 — program pocztowy | Wynika z pozycji 2: jeśli dostawca aplikacji przetwarza pocztę w chmurze, czy i na jakiej podstawie poza EOG | prawnik |
| 7 | 06 — rekrutacja | Okres: „do zakończenia rekrutacji, nie dłużej niż 6 miesięcy od zgłoszenia" — propozycja. Organ nadzorczy stoi na stanowisku, że dane kandydatów usuwa się po zakończeniu rekrutacji; dłuższy okres wymaga uzasadnienia (roszczenia) | klientka + prawnik |
| 8 | 06 — przyszłe rekrutacje | Okres: „do cofnięcia zgody, nie dłużej niż 12 miesięcy" — propozycja (górna granica chroni przed bezterminowym przechowywaniem) | klientka + prawnik |

### 12.2 Przyjęte w treści bez znacznika — do potwierdzenia przy przeglądzie

1. **Adres do korespondencji w sprawach danych** = adres siedziby z rejestru (sekcja 01); biuro w Poznaniu podane osobno jako miejsce spotkań.
2. **30 dni dla zapytań bez umowy** (sekcja 06) — okres podany przez klientkę; punkt startu dopisany: „od zakończenia korespondencji w tej sprawie". Dokument musi zgadzać się z praktyką (jak długo wiadomości faktycznie zostają w skrzynce).
3. **6 lat dla dokumentów transakcji** — okres podany przez klientkę (od końca roku rozliczenia transakcji albo wygaśnięcia umowy); do oceny, czy jeden okres pokrywa wszystkie tytuły (podatkowe, rachunkowe, roszczenia).
4. **5 lat dla dokumentacji AML** — art. 49 ust. 1 ustawy z 1 marca 2018 r. (od zakończenia stosunków gospodarczych albo przeprowadzenia transakcji okazjonalnej).
5. **Podstawy prawne** w siedmiu kartach sekcji 03 — wg ustaleń part1 §10.2; dla odwiedzających stronę przyjęty art. 6 ust. 1 lit. f (działanie i bezpieczeństwo strony, statystyka zbiorcza).
6. **Rekrutacja:** art. 6 ust. 1 lit. b + art. 22¹ Kodeksu pracy; dane nadmiarowe podane z własnej inicjatywy — zgoda; prośba o niepodawanie danych szczególnych kategorii.
7. **Akapit „Czy musisz podawać dane"** (art. 13 ust. 2 lit. e) — dopisany, nie było go w ustaleniach.
8. **Dostawcy „na podstawie umów powierzenia"** (sekcja 04) — zdanie zakłada, że umowy są zawarte: z dostawcami poczty, systemu ofert i wysyłki (zwykle część regulaminu usługi) oraz z wykonawcą strony (hosting działa na jego koncie — powierzenie do wpisania w umowę o utrzymanie strony).
9. **Sekcja 05 (poza EOG):** dwóch dostawców z USA — decyzja o adekwatności z 10 lipca 2023 r. (obaj w programie Data Privacy Framework) + standardowe klauzule umowne w umowach powierzenia dostawców; treść i dzienniki wysyłki przechowywane w USA mimo europejskiego regionu wysyłki.
10. **Okres 30 dni u dostawcy wysyłki** (sekcja 06) — wg dokumentacji dostawcy dla planów bez indywidualnych ustawień; dotyczy też załącznika z CV. Strona sama niczego nie zapisuje.
11. **Źródła danych** (sekcja 02): portal ogłoszeniowy, polecenie albo inne biuro, klient będący drugą stroną transakcji. Czy są inne (na przykład rejestry publiczne sprawdzane przed transakcją)?
12. **Prawo sprzeciwu** (sekcja 08): marketing opiera się na zgodzie; zdanie o sprzeciwie wobec marketingu bezpośredniego zostawione dla pełności art. 21 ust. 2–3.
13. **Brak inspektora ochrony danych** (sekcja 10) — przyjęte, że obowiązek nie powstaje.
14. **Ochrona formularzy** (sekcja 09): usługa uruchamia się dopiero przy wypełnianiu formularza i „może zapisać w przeglądarce niezbędne informacje techniczne" — do oceny, czy mieści się w wyjątku dla informacji koniecznych do świadczenia usługi; weryfikacja techniczna po uruchomieniu widgetu (krok 5.1).
15. **Statystyka** (sekcja 09): opis dotyczy stanu z dnia obowiązywania — narzędzie jest włączane przy uruchomieniu strony pod domeną główną (dziś skrypt nie jest osadzony).
16. **Brzmienia zgód** cytowane w sekcji 03 pochodzą wprost z formularzy; zgoda na przyszłe rekrutacje ma w kodzie status roboczy.
17. **Zdanie o braku pracowników i współpracowników** z dostępem do danych (sekcja 04) — prawdziwe dziś; do aktualizacji po zatrudnieniu pierwszej osoby.

### 12.3 Pytania, na które ustalenia z klientką nie odpowiadają

Jeśli którakolwiek odpowiedź brzmi „tak", w dokumencie dochodzi odbiorca,
cel albo okres: komunikatory w kontakcie z klientami · nagrywanie rozmów
telefonicznych · monitoring w biurze · dysk w chmurze i kopie zapasowe ·
podpis elektroniczny albo obieg umów w usłudze zewnętrznej · narzędzia AI,
do których trafiałyby dane klientów · własna baza kontaktów poza systemem
ofert · zdjęcia nieruchomości, na których widać osoby albo dokumenty ·
współpraca stała z rzeczoznawcą albo fotografem.

### 12.4 Źródła weryfikacji (stan na 2026-10-04)

- Organ nadzorczy — adres siedziby (zmieniony względem starszych
  wzorców polityk): <https://uodo.gov.pl/pl/p/kontakt>
- Prawo komunikacji elektronicznej (Dz.U. 2024 poz. 1221), art. 398–400 —
  zgoda na marketing bezpośredni, przechowywanie informacji w urządzeniu
  końcowym: <https://isap.sejm.gov.pl/isap.nsf/DocDetails.xsp?id=WDU20240001221>
- Ustawa o przeciwdziałaniu praniu pieniędzy oraz finansowaniu
  terroryzmu, art. 49 — okres przechowywania dokumentacji.
- Dostawca wysyłki — miejsce przechowywania, mechanizmy transferu, okres
  przechowywania wiadomości i dzienników: <https://resend.com/security/gdpr>
- Dostawca hostingu — Data Privacy Framework i standardowe klauzule
  umowne: <https://www.cloudflare.com/trust-hub/gdpr/>; zakres danych usługi
  ochrony formularzy: <https://www.cloudflare.com/turnstile-privacy-policy/>
- Program pocztowy — synchronizacja kont innych dostawców przez chmurę:
  <https://support.microsoft.com/en-us/office/sync-your-account-to-the-microsoft-cloud-985f9e19-d308-4e85-9d1d-0c6f32f8e981>
- Rekrutacja — okres przechowywania danych kandydatów (rozbieżne
  stanowiska organu nadzorczego i objaśnień ministerialnych):
  <https://www.prawo.pl/kadry/co-zrobic-z-cv-po-zakonczeniu-rekrutacji-wytyczne-uodo,309657.html>
