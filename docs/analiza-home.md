# Mini-analiza 4.4 — strona główna (`/`)

> **Status:** ZAAKCEPTOWANA 2026-10-03 (wszystkie rekomendacje Q1–Q9
> z §9), zrealizowana na gałęzi `feat/home` — uzupełnienia po
> implementacji w §10. Część 4.4 Etapu 4 wg instrukcji
> wykonawczej (dokument lokalny, `docs/plan/`) — tabela 4.4, „Tryb pracy",
> „Zasada rozjazdów"; prompt §4.4 z `etap-4-prompty.md`. Referencja
> wyglądu: `docs/design/export/index.html` (gałęzie `.br-m` i `.br-d`),
> `assets/js/site.js` §3 (hero: wideo → zdjęcie), §9 (zoom hero
> i gaśnięcie nagłówka), §10 (reveale, parallax), `assets/css/site.css`.
> Baza wiedzy — odsyłacze sekcją, bez cytowania: part2 §0 (trzy zasady),
> §4.1 (wyszukiwarka podstawowa na głównej), §4.3 ostatni punkt („Wybrane
> oferty"), §12 (inwentarz designu); part3 §2.4 (daty, `addedAt`).
> Spójność z 4.1 (`analiza-chrome.md`: pasek „/" liczony z `innerHeight`,
> sloty kontaktowe, R6 kontrast), 4.2 (`analiza-oferty.md`: karta, `imgAt`,
> plakietki, R4/R5/R17, §12.5 pomiar budżetu) i 4.3 (`analiza-oferta.md`
> §11: dobór 3 najnowszych aktywnych na 404, helper `import()` Vite,
> lekcje Astro).

## 0. Zakres i podział

Strona główna to czysty Astro + mały TS (bez Preact, bez wyspy): hero
z wideo, pięć sekcji treści, trzy kafle ofert z `data.ts`, moduł ruchu.
**Rekomendacja: JEDEN PR (`feat/home`).** Podział (a) statyka / (b) ruch
kosztowałby dwie regeneracje tych samych zrzutów (parallax przesuwa
kadry zdjęć także w stanie „po odsłonięciu", więc baseline'y `home-*`
z (a) rozjechałyby się w (b) na wszystkich profilach), a kod ruchu jest
mały (prognoza ok. 2 KB gzip). Wyjście awaryjne: gdyby workflow
baseline'ów linux pokazał niestabilne zrzuty przez ruch, ruch schodzi do
osobnego PR-a (b), a ten zamyka się na statyce — bez zmian w markupie
(atrybuty `data-rv`/`data-px` bez modułu są bezwładne).

Poza zakresem (bez zmian): chrome, `overlay.ts`, `/oferty/`, detal, 404,
formularze, pozostałe trasy, sync, dane, progi LHCI, JSON-LD strony
głównej (Etap 6).

## 1. Inwentarz z designu

Elementy wspólne sekcji 01–05: eyebrow (kreska 18/26 px + wersaliki,
tracking 0,14–0,16 em), `h2` dwukolorowy (druga fraza w miedzi), akapit
15–20 px `--slate`, przycisk miedziany z promieniem `0 0 0 12–16 px`,
kontener 1360 px, odstęp pionowy `clamp(48px, 13vw, 80px)` (mobile)
/ `clamp(56px, 5vw, 110px)` (desktop).

### 1.1 Hero

| Element | Mobile < 1025 | Desktop ≥ 1025 | Port |
| --- | --- | --- | --- |
| Pole | `min-height: 100svh`, kolumna `space-between`, tło `--navy` | `height: 100svh`, tło `--navy` | `100svh` (nie `dvh`); pasek „/" liczy próg z `innerHeight` — bez zmian w chrome |
| Obraz | `hero-mobile.png` jako tło, `cover`, pozycja `89% 50%` | `<video>` z plakatem + warstwa zdjęcia (opacity 0 → 1 po filmie) | JEDEN `<img>` w `<picture>` (LCP) pod spodem + `<video>` nad nim (H1, H2) |
| Wideo | nie startuje (gałąź desktop ukryta) | `muted playsinline preload="none"`, sam WebM; start z JS, ostatnie 1,5 s zwalnia do 0,2×, po `ended` zdjęcie wchodzi w 1 200 ms | jak design, MP4 + WebM (H3) |
| Przyciemnienie | brak | tint `rgba(9,18,36,.10)` + szum SVG 6 % (`mix-blend-mode: overlay`) | tint zostaje; szum bez `mix-blend-mode` (H9) |
| Treść | `h1` u góry pod paskiem (`#ddd`, cień); u dołu pas z leadem (szkło, blur 11, tekst do prawej) i pas z kolorowym logo (szkło .39, blur 13) | karta szklana na środku: eyebrow, `h1`, kreska miedziana, lead, 2 CTA („Zobacz oferty" → `/oferty/`, „Sprzedaj z nami" → `/sprzedaj-z-nami/`); u dołu pas 3 kolumn (Sprzedaż / Wynajem / Wsparcie prawne z opisami; opisy znikają przy wysokości ≤ 700 px) | jeden markup; elementy tylko-mobile / tylko-desktop przełączane `display` (H4) |
| Ruch (§9) | warstwa obrazu `scale 1 → 1,30` w miarę przewijania hero, `h1` gaśnie do 0,3 | to samo na wideo i zdjęciu | `transform`/`opacity` na osobnych warstwach, własna pętla rAF z dociąganiem (reguła `scroll.md`) |

Fakty zmierzone: ostatnia klatka filmu ≈ plakat (przejście w zdjęcie
jest bezszwowe), pierwsza klatka to inne ujęcie (w designie twarde
cięcie plakat → film). Film: 832×464, 5,2 s, bez dźwięku.

### 1.2 Sekcje 01–05

| Sekcja | Mobile < 1025 | Desktop ≥ 1025 |
| --- | --- | --- |
| **01 O nas** (białe tło) | nagłówek → zdjęcie 4:5 odsunięte od lewej, promień `0 0 0 48–72`, granatowa plansza liczb („10 lat na rynku", „4 lata pod własnym szyldem") wystająca w lewo-dół → akapit → „Więcej o nas" | siatka 5fr/6fr: zdjęcie z planszą liczb (prawy dół) · eyebrow, `h2`, akapit, przycisk |
| **02 Oferty** (`--bg`) | nagłówek → akapit → karuzela pozioma `scroll-snap` (kafel 82 % szerokości, 3:4) → „Przeglądaj oferty" | wiersz: nagłówek + akapit · przycisk do prawej; siatka 7fr/5fr: duży kafel (min. 380–520 px) + dwa mniejsze jeden pod drugim |
| Kafel oferty | zdjęcie na całe pole + gradient granatowy od dołu; plakietka „Nowość" (lewy górny róg); kicker (`--copper-light`), tytuł `h3`, pinezka + lokalizacja, cena | to samo, większa typografia; hover `translateY(-6px)` |
| **03 Usługi** (ciemna, `min-height: 100svh`) | zdjęcie tła `uslugi-doradcy` + gradient pionowy; nagłówek, akapit, 3 kafle szklane (numer w rogu, tytuł, opis, „Zobacz →") | gradient skośny; siatka 5fr/7fr: tekst · 3 kafle w wierszach (numer, tytuł + opis, strzałka w kółku), hover `translateX(8px)` |
| **04 Sprzedaj z nami** (`--bg`; mobile `min-height: 100svh`) | nagłówek → zdjęcie 4:5 z podpisem na granatowej planszy → akapit → lista 4 kroków jako oś (kwadraty 01–04, czwarty miedziany) → przycisk | wiersz 7fr/5fr: nagłówek · akapit + przycisk; wiersz 4fr/8fr: zdjęcie z podpisem · siatka 2×2 kart kroków (czwarta granatowa) |
| **05 Kontakt** (ciemna, `min-height` 480–640 / 620–860) | zdjęcie tła `kontakt-biuro` + gradient; nagłówek, akapit, telefon dużą czcionką, szklana lista (e-mail, adres biura, godziny), „Przejdź do kontaktu" | siatka 7fr/5fr: nagłówek, akapit, telefon · lista + przycisk |

Linki sekcji 03: `/uslugi/#sprzedaje`, `#kupuje`, `#pomoc-prawna`
(kotwice powstaną w 4.6 — do tego czasu link ląduje na górze strony).

### 1.3 Ruch (§10)

- **Reveale:** bloki treści sekcji (poza hero) startują z `opacity 0`
  + `translateY 22 px` (mobile; 0,7 s / 0,8 s) albo `44 px + scale .984`
  (desktop; 0,95 s / 1,05 s, kaskada `min(i, 5) × 0,07 s`); duże bloki
  obrazowe — sam fade. Próg: górna krawędź powyżej 92 % wysokości okna.
  Na mobile bloki na szkle (`backdrop-filter`) NIE są animowane.
- **Parallax:** zdjęcia `data-px` (01, 04) i zdjęcia tła sekcji ciemnych
  (03, 05) jadą w pionie o ±10 % (desktop) / ±8 % (mobile) wysokości
  kadru; kafle ofert wyłączone (`data-nopx`).
- Wszystko wyłączone przy `prefers-reduced-motion: reduce`.

## 2. Rozjazdy — rozstrzygnięcia

Numeracja `H` (home), żeby nie mieszać z `R` list i detalu.

| # | Rozjazd | Rozstrzygnięcie | Źródło |
| --- | --- | --- | --- |
| H1 | Hero jako `background-image` / `poster` wideo | `<picture>` + `<img>` (`eager`, `fetchpriority="high"`, `width`/`height`, `<link rel="preload">` per kadr przez slot `head`) jako warstwa bazowa — to element LCP i nie obejmuje go żaden reveal | prompt 4.4 (LCP) |
| H2 | Design nakłada zdjęcie NA film po `ended`; start filmu = twarde cięcie z plakatu | film leży NAD zdjęciem z `opacity: 0`; po zdarzeniu `playing` wchodzi krótkim przenikaniem, po `ended` (albo błędzie) gaśnie w 1 200 ms i odsłania zdjęcie. Wygląd końca identyczny, start łagodniejszy, a w DOM jest jedna warstwa obrazu zamiast dwóch | zasada 3 (wygląd i tempo) |
| H3 | Design: sam WebM (2,0 MB) | pierwsze `<source>` = MP4 (H.264), drugie = WebM (VP9), OBA przekodowane (§6); w HTML `muted playsinline preload="none"`, bez `autoplay`; start z JS za bramką ruchu, dopiero po wczytaniu plakatu. Film startuje **wyłącznie ≥ 1025 px** (jak design) → pytanie Q5 | instrukcja 4.4, P9 |
| H4 | Lead hero ma w eksporcie DWA brzmienia (mobile dłuższy, desktop krótszy + 3 kolumny u dołu); mobile nie ma eyebrow ani CTA | jeden markup, oba brzmienia jak w designie przełączane `display` (elementy ukryte nie są czytane); teksty na listę PLACEHOLDER z dopiskiem „dwa warianty" | zasada 3; U9 |
| H5 | Kafle ofert wpisane w makietę (3 sztuki, treść przykładowa) | dane z `data.ts`; liczba 3 z designu; dobór → Q3; komponent → Q2 | instrukcja 4.4; part2 §4.3 |
| H6 | Obecna strona ma na głównej wyszukiwarkę podstawową, design nie | → Q1 (rekomendacja: jak design) | part2 §4.1, §12 |
| H7 | Telefon i e-mail w sekcji 05 jako jawne `tel:` / `mailto:` | sloty `a[data-tel]` i `a[data-mail="biuro"]` z `<span data-slot>`; bez JS wiersze slotów są puste i ukryte, zostaje przycisk do `/kontakt/` | `contact-details.ts`, analiza 4.1 R2/R3 |
| H8 | Adres biura i godziny w sekcji 05 wpisane w makietę | adres z `BUSINESS` (`jsonld.ts`); godziny w brzmieniu designu sekcji (wartość ta sama co w stopce — `Footer.astro` zostaje nietknięty) | analiza 4.1 R5 |
| H9 | Szum SVG z `mix-blend-mode: overlay` na całym hero nad filmem | szum zostaje jako zwykła warstwa o tym samym kryciu, BEZ trybu mieszania (mieszanie pełnoekranowej warstwy nad skalowanym filmem to droga do przemalowań — lekcja `scroll.md`); różnica wizualna pomijalna | `scroll.md` |
| H10 | Zoom hero: komentarz w `site.js` mówi 1,06, kod liczy `1 + 0,30 × postęp` | obowiązuje zachowanie kodu (to widać w makiecie): stała `HOME_HERO_ZOOM = 0.30` w `home-config.ts`; do oceny na `nowa.` | `site.js` §9 |
| H11 | Parallax designu = `translate` + `scale(1 + 2a)` nadawane z JS | zapas w układzie: obraz wyższy od kadru o `2a` (`top: -a`, `height: 100 % + 2a`, `max-width: none`), JS pisze sam `translateY`; amplitudy 0,10 / 0,08 jako stałe; stan = czysta funkcja pozycji scrolla (także poza kadrem — determinizm zrzutów) | `sections.md` „zapas ≥ ruch" |
| H12 | Reveale: skrypt designu sam taguje dzieci sekcji | atrybuty `data-rv` wpisane w markup (SSR), stany startowe wyłącznie pod `html.js-motion`, klasa `.is-in` z IntersectionObservera; kaskada przez `--rvd` inline; bloki szklane dostają reveal tylko ≥ 1025 (`data-rv="d"`) | `sections.md` |
| H13 | Kolory poniżej AA (allowlista axe PUSTA): biały tekst na miedzi w przyciskach i plakietce „Nowość" (3,1:1), eyebrow miedziany 12–14 px na jasnym tle (3,1:1), miedziana fraza `h2` na `--bg` (2,8:1 — poniżej progu dużego tekstu 3:1) | przyciski miedziane i plakietka: tekst `--ink` (5,5:1; jak „Zadzwoń", „Pokaż", „Rezerwacja"); eyebrow na jasnym tle: `--copper-text`; fraza `h2` na jasnym tle: `--copper-dark` (3,4:1 na `--bg`, 3,9:1 na bieli); na ciemnych sekcjach `--copper-light` jak w designie | analiza 4.2 R17, 4.1 R6 |
| H14 | Tekst hero na filmie/zdjęciu: szkło karty `rgba(9,18,36,.24)` nad jasnym pasem zachodu słońca | pomiar na NAJJAŚNIEJSZYM kadrze (zrzut + luminancja pod tekstem) w trakcie implementacji; jeśli lead / eyebrow nie trzymają 4,5:1, rośnie krycie szkła (token), nie zmienia się kolor tekstu. Wynik z liczbami w „Uzupełnieniach" | reguła a11y (`testing.md`) |
| H15 | Liczby „10" i „4" oraz zdania o stażu w sekcji 01 | brzmienie z designu, PLACEHOLDER (U9) — baza wiedzy ich nie potwierdza | zasada 3 (wartości z makiet) |
| H16 | Drobne kolory spoza tokenów (`#4a5464`, `#ddd7cc`, `#12233f`) | tokeny `--slate`, `--line`, `--ink` | `docs/design/README.md` |
| H17 | Kadr plakatu na telefonie: `hero-poster-m.webp` 1024×574 jest za niski | nowy kadr pionowy `hero-poster-tall.webp` 720×816 (pełna wysokość źródła, wycinek wokół pozycji 89 %), podawany `<source media="(max-width: 767px)">`; od 768 px plik 1456×816. `scripts/optimize-images.mjs` dostaje opcjonalny parametr wycinka (dziś umie tylko szerokość) | P9; `docs/design/README.md` |

Bez rozjazdu: tytuł strony (`ui.ts` = tytuł z designu), jeden telefon
i `biuro@` w sekcji kontaktu, godziny biura, brak social mediów.

**Uwaga do źródła plakatu:** eksport ma 1456×816 px — na oknie 1920 px
i na telefonach @3× obraz jest powiększany (miękki pod szkłem i tintem,
ale to granica materiału, nie kodu). Ostrzejszy kadr = prośba do autora
designu, poza tym PR-em.

## 3. Czego design nie ma, a trzeba zbudować

1. **Dobór ofert i stany brzegowe sekcji 02:** 3, 2, 1 i 0 ofert (siatka
   desktop: 3 = duży + dwa; 2 = dwa równe; 1 = jeden na całą szerokość);
   kafel bez zdjęcia (pasy granatowe z makiety + „Zdjęcia wkrótce");
   „Zapytaj o cenę"; cena poprzednia przekreślona; plakietka statusu,
   jeśli dobór obejmie statusy inne niż `aktywna` (Q3).
2. **Bramka ruchu:** skrypt inline w `<head>` nadaje `html.js-motion`
   przy `no-preference`; moduł ruchu ładowany dynamicznie. Bez JS i przy
   `reduce`: pełna, statyczna treść, samo zdjęcie w hero, zero transformów.
3. **Zachowanie filmu poza ścieżką główną:** odrzucone `play()` (tryb
   oszczędzania energii, blokada autoodtwarzania), błąd pobrania, karta
   w tle, `navigator.connection.saveData` → zostaje zdjęcie, bez
   komunikatu. Zmiana szerokości przez próg 1025 w trakcie filmu → film
   gaśnie do zdjęcia.
4. **Stabilna wysokość pierwszego ekranu:** hero i sekcje pełnoekranowe
   stoją na `100svh`; leniwe przypięcie wysokości (`--svh`) tylko wtedy,
   gdy przeglądarka zmienia `svh` bez zmiany szerokości (wzorzec z rodziny
   projektów zamiast sondy `--vph` z eksportu, która przypina zawsze).
5. **Moduł ruchu wspólny dla stron treściowych** (Q7): reveale i parallax
   wrócą na `/sprzedaj-z-nami/`, `/o-nas/`, `/uslugi/`.
6. **Kadr pionowy plakatu** i przekodowane wideo (H17, §6).

## 4. Architektura i pliki

- `src/pages/index.astro` — `BaseLayout` (slot `head`: bramka inline
  + dwa `preload` plakatu z `media`), `Navbar`, `main.home`, sekcje,
  `Footer`, skrypt strony (przypięcie `--svh` + dynamiczny `import()`
  modułu ruchu przy `no-preference`).
- `src/components/sections/home/`: `HomeHero.astro`, `HomeAbout.astro`,
  `HomeOffers.astro` (+ `HomeOfferTile.astro`), `HomeServices.astro`,
  `HomeSell.astro`, `HomeContact.astro`, `home-config.ts` (stałe:
  `HOME_DESKTOP_MIN_PX`, `HOME_POSTER_TALL_BELOW_PX`, `HOME_OFFERS_MAX
  = 3`, `HOME_HERO_ZOOM`, `HOME_HERO_FADE`, `HOME_HERO_LERP`,
  `HOME_VIDEO_TAIL_S`, `HOME_VIDEO_END_RATE`; czasy przenikania filmu
  siedzą w CSS hero), `home-hero.ts` (film + zoom; część chunku ruchu),
  `home-motion.ts` (wejście chunku: `content-motion` + `home-hero`),
  `home-copy.ts` (teksty PLACEHOLDER w jednym miejscu — także dla
  testów); przypięcie `--svh` we wspólnym `sections/content-viewport.ts`.
- `src/components/sections/content-motion.ts` — **przepisany** na
  selektory designu (`data-rv` → `.is-in`, `data-px`), gałęzie szablonu
  (ryciny, dryf tła, `data-plxr`) wycięte; `content-config.ts`: stałe
  amplitud i progów zamiast stałych szablonu; `content.css` — wspólne
  prymitywy stron treściowych (eyebrow, `h2` dwukolorowy, przycisk
  miedziany, stany startowe reveali, kadr parallaxu).
- `src/components/sections/SectionHead.astro` — eyebrow + `h2` (wspólny
  dla sekcji 01–05 i przyszłych stron treściowych).
- `tests/helpers/visual.ts` — `revealSweep` na selektorach
  `html.js-motion [data-rv]:not(.is-in)` (W PARZE z modułem).
- `scripts/optimize-images.mjs` — parametr wycinka; `src/assets/img/
hero-poster-tall.webp`; `public/video/hero.{mp4,webm}` przekodowane.
- Dokumenty: ten plik, `docs/README.md`, `docs/optional-todos.md`
  (zamknięte: `hero.webm`, moduł ruchu), `docs/design/README.md`
  (tabela wideo i kadr pionowy), `CLAUDE.md`, `.claude/rules/testing.md`,
  `sections.md`.

`CollapsibleText.astro` / `collapsible.ts` (nieużywane, nie-ruch)
zostają nietknięte — decyzja o nich przy 4.5/4.6.

## 5. Kontrakty i testy

**Znaczniki:** `main.home`, `section[data-home="hero|o-nas|oferty|uslugi|
sprzedaj|kontakt"]`, `[data-hero-photo]` (obraz LCP), `video[data-hero-
video]` z `data-state="idle|playing|photo"`, `[data-hero-zoom]`,
`[data-hero-fade]`, `[data-home-offers]` i `[data-home-offer="{numer}"]`,
`[data-rv]`, `[data-px]` (rodzic = kadr z `overflow: clip`).

**E2E `tests/e2e/home.spec.ts`** (treść na `chromium-1920`; układ i hero
na `chromium-pixel-5` i `webkit-iphone-14`; `useMediaStub`):

| Kontrakt | Asercja |
| --- | --- |
| Hero | `main h1` widoczny i niepusty; wysokość hero = wysokość okna (sub-pikselowo, tolerancja 0,5 px); plakat `eager` + `fetchpriority="high"` + `width`/`height`; w surowym HTML dwa `link[rel=preload][as=image]` z `media` i właściwym kadrem per szerokość |
| Wideo | atrybuty `muted`, `playsinline`, `preload="none"`, brak `autoplay`, kolejność `<source>` MP4 → WebM; desktop: po starcie `data-state="playing"`, po wywołanym w teście zdarzeniu `ended` → `photo` i film ma `opacity 0`; mobile: ŻADNE żądanie `/video/` i `data-state="idle"`; bez JS i przy PUNKTOWEJ emulacji `reduce` (z komentarzem — dozwolony wyjątek): brak żądania wideo, brak `js-motion`, treść sekcji widoczna |
| Sekcje 01–05 | nagłówki `h2` z `home-copy.ts`; każdy link sekcji odpowiada < 400 (`/o-nas/`, `/oferty/`, `/uslugi/` ×3, `/sprzedaj-z-nami/`, `/kontakt/`); 4 kroki w sekcji 04 |
| Kafle | numery `[data-home-offer]` = dobór z helpera (`readOffersTyped` → reguła z Q3 → `sortEntries(…, "newest").slice(0, 3)`), `href` = `offerPath`, cena `formatPrice`, obraz `card` z `width`/`height`/`alt`, `lazy`; „Nowość" ⇔ `isNewOffer` względem `data-build-now`; zero ofert → wariant bez kafli (bez skipa) |
| Sloty | surowy HTML bez numeru i adresów e-mail; po JS `a[data-tel]` = `buildPhoneHref()`, `a[data-mail="biuro"]` = `mailto:`; puste kotwice mają `<span data-slot>` |
| Progi | `expectBreakpointFlip` 1025 (elementy tylko-mobile / tylko-desktop hero, siatka sekcji 01, karuzela ↔ siatka kafli) |
| Ruch | z JS: `html.js-motion`, blok poniżej zgięcia ma `opacity 0`, po przewinięciu `.is-in` i `opacity 1`; parallax — sonda układu: zapas obrazu nad i pod kadrem ≥ maksymalny ruch (dla każdego `[data-px]`, na obu szerokościach); zoom: po przewinięciu o pół hero `scale` > 1, `h1` < 1 |
| Scroll natywny | brak `overflow: hidden` na `html`/`body`, `scrollTo` działa bez pośrednika |
| Sieć | zero hostów trzecich (własny host + `MEDIA_BASE`) |
| a11y | axe WCAG 2 A/AA całej strony (desktop i mobile), allowlista PUSTA |

**Visual `tests/visual/home.spec.ts`** (fixture, `useVisualFixtureGuard`,
`prepareSweep` + `revealSweep`, 6 profili): `home-top` (okno startowe)
i `home-full` (fullPage) = 12 PNG na platformę. **Wideo:** element filmu
leży pod treścią hero i ma `opacity 0` poza odtwarzaniem — maska
Playwrighta zakryłaby cały pierwszy ekran razem z `h1`. Zrzuty biorą
więc stan „zdjęcie": żądania `/video/**` są w specu wizualnym odcinane
(`page.route` → abort), co jest zaprojektowaną ścieżką błędu (film
nigdy nie staje się widoczny), a spec dodatkowo asertuje
`data-state != "playing"` przed zrzutem → Q8 (świadome odstępstwo od
litery reguły „wideo pod maską", zgodne z jej celem). Odtwarzanie
testuje e2e.

**`chrome.spec.ts`:** `chrome-home-top` i `chrome-home-solid` rozjadą się
na 6 profilach (zamierzone, regeneracja w tym PR); z `chrome-home-solid`
schodzi dosztukowanie `main` (to samo odcięcie wideo co wyżej).
`navigation.spec.ts`: wariant „/" bez dosztukowania wysokości; reszta
bez zmian. `smoke`, `seo`, `a11y` — bez zmian speców.

**Unit:** `home-offers` (czysta funkcja doboru `pickHomeOffers(offers,
max)` w `src/lib/offers/` — dane syntetyczne: kolejność, statusy, mniej
niż 3, zero; fixture: wynik = 3 numery).

**Kolejność baseline'ów:** kod → workflow linux z `feat/home` (spec
`tests/visual/home.spec.ts tests/visual/chrome.spec.ts`, mode `changed`)
→ `git pull` → diff darwin → darwin → commit darwin na końcu.

## 6. Budżet

**Wideo — pomiar (ffmpeg lokalnie, źródło `hero.webm` z eksportu;
SSIM względem źródła):**

| Plik | Rozmiar | SSIM | Uwagi |
| --- | --- | --- | --- |
| `hero.webm` dziś (VP9) | 2 055 KB | 1,000 | źródło |
| `hero.mp4` dziś (H.264 CRF 23) | 896 KB | 0,894 | |
| MP4 CRF 26 | 583 KB | 0,886 | |
| **MP4 CRF 28** | **443 KB** | 0,879 | rekomendacja |
| WebM VP9 CRF 38 | 650 KB | 0,887 | |
| **WebM VP9 CRF 42** | **461 KB** | 0,879 | rekomendacja |

Materiał jest ziarnisty (niski SSIM już przy 896 KB), więc zejście
z 896 do 443 KB kosztuje 0,015 SSIM — pod tintem, szumem i szkłem karty
praktycznie niewidoczne; film gra raz, 5 s.

**`total` desktop na „/" (próg 1 200 000 B) — policzone przed kodem:**
dziś 135 KB. Bez filmu po 4.4 prognoza ok. 400 KB (plakat 91 KB,
zdjęcie 01 — 61 KB, trzy kafle z fixture'u ok. 80 KB, HTML/CSS/JS ok.
+25 KB; obrazy poniżej progu leniwego ładowania się nie liczą).

| Wariant pierwszego `<source>` | `total` desktop | wobec progu |
| --- | --- | --- |
| WebM dzisiejszy (2,0 MB) | ok. 2,45 MB | **204 % — poza progiem** |
| MP4 dzisiejszy (896 KB) | ok. 1,30 MB | **108 % — poza progiem** |
| MP4 CRF 26 (583 KB) | ok. 0,98 MB | 82 % |
| **MP4 CRF 28 (443 KB)** | **ok. 0,84 MB** | **70 %** |

Chrome z LHCI wybiera MP4, więc liczy się rozmiar MP4; WebM jest dla
przeglądarek bez H.264 (w tym Chromium Playwrighta — testy e2e grają
WebM). Próg `total` zostaje nietknięty.

**`total` mobile** (próg 1 000 000 B): filmu nie ma; plakat pionowy ok.
40–50 KB zamiast 91 KB → prognoza ok. 300 KB (30 %).

**`script`** (próg 40 000 B; dziś „/" = 4 980 B transferu): skrypt
strony z przypięciem `--svh` ok. +0,5 KB, helper `import()` Vite +733 B
(wspólny plik z listą i detalem), chunk ruchu (reveale, parallax, film,
zoom) ok. +2 KB → prognoza **ok. 8,2 KB = 21 % bramki**. Raport po
`build:visual`: brutto / gzip osobno dla skryptu strony, chunku ruchu
i helpera (metoda §12.5 analizy 4.2).

**LCP:** element LCP = plakat (preload, `fetchpriority`); mobile dziś
1 810 ms (tekst) → prognoza 2,0–2,4 s przy progu 3 200 (margines poniżej
regułowych 1 300 ms jest możliwy — zgłoszę z liczbą); desktop ok. 0,5–0,7 s
przy progu 1 800. Film startuje po wczytaniu plakatu, więc nie konkuruje
z LCP. CLS: hero ma stałą wysokość, obrazy mają wymiary. Lokalny `lhci`
(1 przebieg, oba configi) po implementacji; zmiana jakiegokolwiek progu
= osobna decyzja po `lhci-measure.yml`.

## 7. Lista PLACEHOLDER (U9; zamykana w 7.7)

Wszystkie teksty w `home-copy.ts`, brzmienie z designu:

| Sekcja | Teksty |
| --- | --- |
| Hero | eyebrow „Agencja nieruchomości · Poznań"; `h1` „Nieruchomości w Poznaniu i okolicach. Doświadczenie, które daje pewność."; lead desktop „Agencja łącząca praktyków rynku poznańskiego."; lead mobile „Agencja łącząca praktyków rynku. Sprzedaż, wynajem, wsparcie prawne." (DWA warianty — H4); CTA „Zobacz oferty", „Sprzedaj z nami"; kolumny „Sprzedaż — Wycena, przygotowanie, negocjacje", „Wynajem — Sprawdzeni najemcy, bezpieczne umowy", „Wsparcie prawne — Stan prawny, spadki, trudne przypadki" |
| 01 | „Praktycy poznańskiego rynku. Twoje bezpieczeństwo na pierwszym miejscu."; akapit „Od dekady działamy…"; liczby „10 lat na rynku", „4 lata pod własnym szyldem" (H15 — WARTOŚCI do potwierdzenia); „Więcej o nas"; alt zdjęcia |
| 02 | „Mieszkania, domy i lokale. Każda oferta z pełnym stanem prawnym."; akapit „Zanim oferta trafi na stronę…"; „Przeglądaj oferty"; tekst stanu bez ofert |
| 03 | „Prowadzimy przez całą transakcję. Od pierwszego dokumentu do klucza w drzwiach."; akapit; trzy kafle (tytuł + opis); „Zobacz"; alt zdjęcia |
| 04 | „Sprzedaż bez ryzyka w papierach. Formalności bierzemy na siebie."; akapit; podpis zdjęcia; cztery kroki (tytuł + opis); „Sprzedaj z nami"; alt zdjęcia |
| 05 | „Porozmawiajmy, zanim cokolwiek zdecydujesz."; akapit; „Przejdź do kontaktu" |

Nie są placeholderami: adres biura, godziny, telefon, `biuro@`, tytuł
strony.

## 8. Co sprawdzić na fizycznym telefonie (i na `nowa.`)

1. iOS w trybie oszczędzania energii (iPad w poziomie ≥ 1025 — tylko tam
   film startuje): brak autoodtwarzania ma dać samo zdjęcie, bez ikony
   „play" i bez pustego kadru.
2. Kadr plakatu na wysokim telefonie (pozycja 89 %): czy wieża i zachód
   słońca są w polu, czy `h1` i pasy szkła nie zasłaniają motywu.
3. Klatkowanie pierwszego ekranu przy scrollu w Safari (macOS i iOS):
   zoom warstwy pod pasami z `backdrop-filter` — jeśli klatkuje,
   wyłączamy zoom per szerokość jedną stałą (`home-config.ts`).
4. Zwijany pasek adresu Safari / Chrome a hero `100svh`: brak skoku
   treści; przemalowanie paska „/" kończy się przed końcem hero.
5. Parallax na Androidzie (zdjęcia 01, 04, tła 03, 05): płynność, brak
   prześwitu tła kadru na krańcach.
6. Zimny cache na realnym łączu: kiedy pojawia się plakat (przed nim
   granatowe tło), czy tekst hero jest czytelny, zanim obraz dojdzie.
7. Karuzela kafli: swipe o jeden kafel, brak przewijania strony w bok.
8. Linki `tel:` i `mailto:` w sekcji 05; przycisk „Przejdź do kontaktu".
9. Desktop na `nowa.`: tempo przejścia film → zdjęcie, siła zoomu (H10),
   jakość przekodowanego filmu na dużym ekranie (Q5).

## 9. Pytania do Mateusza (z rekomendacją)

1. **Q1 — wyszukiwarka na głównej (H6).** Rekomendacja: **jak design,
   bez formularza** — wejścia do `/oferty/`: CTA hero (desktop), pierwsza
   pozycja menu, przycisk i kafle sekcji 02. Pełny panel jest jedno
   kliknięcie dalej, a formularz na hero wymagałby projektu, którego nie
   ma. Alternatywa (tania, bez JS): rząd pigułek rodzajów z licznikami
   pod nagłówkiem sekcji 02 — linki do list SSG.
2. **Q2 — kafel oferty.** Rekomendacja: **kafel z designu**
   (`HomeOfferTile.astro`, czysty Astro) zbudowany z tego samego wpisu
   indeksu i tych samych funkcji co karta (`cardKicker`, `cardBadges`,
   `formatPrice`, `formatLocation`) — sekcja 02 ma własny, obrazowy
   charakter (duży kafel + dwa małe, karuzela na telefonie), a `OfferCard`
   zrobiłby z niej kopię listy i dociągnął `offers.css` (5 KB gzip) na
   stronę główną. Koszt: drugi wygląd oferty w serwisie (logika wspólna).
3. **Q3 — dobór.** Rekomendacja: **tylko `aktywna`, najnowsze wg
   `SORT_NEWEST_BY`, 3 sztuki** — ta sama reguła co 404. Dziś wynik jest
   identyczny z parytetem „wszystkie statusy" (sześć najnowszych ofert
   w danych to oferty aktywne), różnica pojawi się, gdy świeża oferta
   dostanie rezerwację albo zostanie sprzedana: zajawka „Oferty" nie
   powinna wtedy otwierać się kaflem „Sprzedane". Mniej niż 3 aktywne →
   tyle kafli, ile jest (bez dopełniania innymi statusami).
4. **Q4 — zero ofert.** Rekomendacja: sekcja ZOSTAJE (nagłówek, akapit,
   przycisk „Przeglądaj oferty"), znika sama siatka kafli — lista
   `/oferty/` ma własny stan pusty.
5. **Q5 — wideo.** Rekomendacja: start **tylko ≥ 1025 px** (jak design;
   telefon dostaje samo zdjęcie — bez transferu, bez ryzyka trybu
   oszczędzania energii), **MP4 CRF 28 (443 KB) jako pierwsze źródło
   + WebM VP9 CRF 42 (461 KB)**. Jeśli po obejrzeniu na `nowa.` jakość
   będzie za niska — CRF 26 (583 KB, `total` 82 % progu).
6. **Q6 — jeden PR** (§0).
7. **Q7 — moduł ruchu.** Rekomendacja: **przepisać `content-motion.ts`**
   (wspólne reveale + parallax dla wszystkich stron treściowych, gałęzie
   szablonu wycięte) i dodać `home-hero.ts` tylko dla hero. Zamyka uwagę
   (5) Etapu 0 i pozycję w `optional-todos.md`.
8. **Q8 — zrzuty a wideo:** odcięcie `/video/**` w specach wizualnych
   zamiast maski (§5).
9. **Q9 — obraz dużego kafla (desktop).** Kafel ma ok. 790 px szerokości,
   wariant `card` 720 px — na ekranach @2× będzie wyraźnie miękki.
   Rekomendacja: `srcset` z wariantem `hero` (1600 px) TYLKO dla dużego
   kafla (ten sam adres co pierwsze zdjęcie detalu — zero nowych
   transformacji); małe kafle i telefon zostają na `card`. Wariant
   minimalny: `card` wszędzie.

## 10. Uzupełnienia po implementacji

Decyzje Q1–Q9 zapadły wg rekomendacji (2026-10-03): bez wyszukiwarki na
głównej, kafel z designu na logice karty, dobór = najnowsze `aktywna`
(maks. 3, bez dopełniania), zero ofert = sekcja bez siatki, film tylko
≥ 1025 px (MP4 CRF 28 + WebM CRF 42), jeden PR, przepisany
`content-motion.ts` + `home-hero.ts`, odcięcie wideo w zrzutach, `hero`
@2× tylko na dużym kaflu.

### 10.1 Co powstało

- `src/pages/index.astro` (bramka `js-motion` inline w `<head>`
  z bezpiecznikiem, dwa `preload` plakatu, skrypt strony: przypięcie
  `--svh` + dynamiczny `import()` ruchu) i `src/components/sections/home/`:
  `HomeHero`, `HomeAbout`, `HomeOffers` + `HomeOfferTile`, `HomeServices`,
  `HomeSell`, `HomeContact`, `home-config.ts`, `home-copy.ts`,
  `home-hero.ts`, `home-motion.ts`.
- Wspólne dla stron treściowych: `sections/content.css` (klasy `sx-*`,
  kadr `.px-frame`, stany reveali), `SectionHead.astro`,
  `content-motion.ts` (przepisany: `[data-rv]` → `.is-in`, `[data-px]`),
  `content-config.ts` (`RV_TRIGGER`, `PX_AMT_*`), `content-viewport.ts`
  (`armViewportPin`, `vpH`). Gałęzie szablonu (ryciny, dryf tła,
  `data-plxr`) usunięte — uwaga (5) Etapu 0 zamknięta.
- `src/lib/offers/home-offers.ts` (`pickHomeOffers`).
- Zasoby: `hero-poster-tall.webp` (720×816, 31 KB; `hero-poster-m.webp`
  usunięty — nic go nie używało), `public/video/hero.mp4` 443 KB
  i `hero.webm` 461 KB; `scripts/optimize-images.mjs` z parametrem
  wycinka.

### 10.2 Rozstrzygnięcia w trakcie (ciąg dalszy §2)

| # | Temat | Rozstrzygnięcie |
| --- | --- | --- |
| H14 | Kontrast tekstu hero — **pomiar** | Metoda: zrzuty okna co 450 ms przez cały film (15 klatek) + stan zdjęcia, tekst przezroczysty (cienie zostają), luminancja tła w prostokącie tekstu — percentyl 95; szerokości 1920, 1440, 1366, 1025 oraz 320, 390, 412, 820, 1024. Szkło z designu (.24): lead 2,6:1, `h1` 3,3:1. **Wdrożone:** szkło karty `rgba(9,18,36,.45)` + lead `rgba(255,255,255,.94)` → lead ≥ 4,8:1, `h1` ≥ 5,1:1, eyebrow ≥ 6,7:1, przycisk drugi ≥ 6,1:1. Telefon i tablet (design: brak scrimu, pas leadu brąz .1 → lead 1,4:1 na 320 px, 3,9:1 na tablecie; `h1` 2,9:1 na tablecie): scrim pod nagłówkiem `.25 → 0` (do 62 % wysokości) → `h1` ≥ 4,0:1 (duży tekst), pas leadu `rgba(9,18,36,.55)` + biały tekst → ≥ 5,3:1. Axe zgłasza te miejsca jako „incomplete" (obraz pod tekstem), więc pomiar jest jedynym strażnikiem — zmiana krycia, kolorów albo materiału wideo = ponowny pomiar |
| H18 | „LCP = plakat" | Chrome NIE liczy obrazu wypełniającego całe okno jako kandydata LCP (traktuje go jak tło) — elementem LCP na „/" jest `h1` (potwierdzone w raporcie Lighthouse, mobile i desktop). Plakat zostaje obrazem priorytetowym (`eager`, `fetchpriority`, `preload`) dla kompletności pierwszego ekranu; eksperyment bez `preload` nie skrócił LCP (2 190 ms wobec 2 110–2 270 ms z preloadem) |
| H19 | Kafle: `srcset` z deskryptorami `w` | przy `720w/1600w` przeglądarka wybierała `hero` już na ekranach 1× (pole dużego kafla ma ok. 775 px > 720) — użyte deskryptory gęstości: `card 1x, hero 2x` w `<source media="(min-width: 1025px)">` |
| H20 | Małe kafle na desktopie: kicker lądował na jasnym zdjęciu | gradient małych kafli zaczyna się wyżej (8 % / 52 % zamiast 26 % / 64 %); duży kafel jak w designie |
| H21 | Karuzela na tablecie | kolumna treści ma poniżej 1025 px najwyżej 600 px, więc karuzela wychodzi do krawędzi ekranu o margines sekcji (`--ho-gut`), nie o sam `--pad` |
| H22 | `data-rv` a hover | reguła reveala niesie własne `transition` — atrybut stoi wyłącznie na blokach nieinteraktywnych (przyciski i kafle-linki są owinięte), inaczej hover szedłby w tempie reveala |
| H23 | Atrybut hero | sekcja ma `data-home-hero` — `data-hero` nosi już nagłówek paska (wariant „/") i pierwszy `querySelector` trafiałby w pasek |
| H24 | `navigation.spec`, `smoke.spec` | dostały `useMediaStub()` — „/" niesie teraz obrazy ofert z hosta mediów, a testy nie wykonują żądań do sieci. Poza tym `navigation` zmienił tylko brak dosztukowania wysokości w teście wariantu „/"; `seo` i `a11y` bez zmian |
| H25 | Zrzuty `chrome-home-solid` | zmierzone progiem 0: `chromium-1920`, `firefox-desktop`, `chromium-pixel-5` identyczne co do piksela (0 różnic), pozostałe trzy profile czerwone → workflow linux w trybie `changed` wystarcza |

### 10.3 Budżet (pomiar jak §12.5 analizy 4.2, `pnpm build:visual`)

| Plik | Rola | brutto | gzip -9 |
| --- | --- | --- | --- |
| chrome (Navbar, Footer, `contact-details`, `site-config`) | bez zmian | 8 135 B | 3 373 B |
| `index.astro_…js` | skrypt strony (przypięcie `--svh`, bramka importu) | 971 B | 596 B |
| `preload-helper.*.js` | helper `import()` Vite (wspólny z listą i detalem) | 1 254 B | 704 B |
| `home-motion.*.js` | chunk ruchu: reveale, parallax, film, zoom — tylko przy `no-preference` | 3 679 B | 1 625 B |
| **razem `script` na „/"** | | **14 039 B** | **6 298 B** |
| `index.*.css` | sekcje strony głównej + `content.css` | 30 856 B | 5 874 B |
| HTML „/" (fixture, 3 kafle) | | 35 716 B | 7 277 B |
| skrypty inline | bramka ruchu 648 B, fade `BaseLayout` 1 077 B | | |

Wyspa listy nietknięta (`SearchIsland` 38 653 B co do bajta).

**LHCI lokalnie (1 przebieg, oba configi — asercje czyste na 8
adresach):**

| „/" | mobile | próg | desktop | próg |
| --- | --- | --- | --- | --- |
| `script` | 9 345 B (23 %) | 40 000 | 9 345 B (23 %) | 40 000 |
| `total` | 296,5 KB (30 %) | 1 000 000 | **843,8 KB (70 %)** | 1 200 000 |
| w tym film | 0 (nie startuje) | | 443,1 KB (MP4) | |
| w tym obrazy | 196,1 KB | | 300,2 KB | |
| LCP | 2 110–2 270 ms (4 przebiegi) | 3 200 | 628–658 ms (5 przebiegów) | 1 800 |
| TBT | 0 ms | 600 | 0 ms w 4 z 5 przebiegów, raz 112 ms | 300 |
| CLS | 0,000 | 0,05 | 0,007 | 0,05 |
| wynik `performance` | 0,98 | 0,9 | 0,98 | 0,95 |

Prognoza z §6 sprawdziła się co do `total` desktop (0,84 MB). Obserwacja:
**LCP mobile ma margines ok. 0,9–1,1 s do progu** (poniżej regułowych
1,3 s; trasa tekstowa dla porównania 1 730–1 820 ms) — różnicę robi
drugi arkusz CSS i plakat konkurujący o łącze z fontami, od których
zależy malowanie `h1`. Progi nietknięte; liczba z runnera przyjdzie
z joba `lighthouse` na PR — gdyby była czerwona, właściwą drogą jest
`lhci-measure.yml` i decyzja, nie podniesienie progu w tym PR.

### 10.4 Weryfikacja lokalna

- format, lint, typecheck — czyste; unit 410 (+2 skip) przy `dist`
  z `build:visual`; build 89 stron; `test:dist` 6/6.
- `pnpm test:e2e` na 6 profilach: **453 zielone** (693 pominięcia
  profili), 0 czerwonych; nowy `home.spec.ts` = 19 testów (35 przebiegów
  na 3 profilach); axe 0 naruszeń po przejeździe całej strony (desktop
  i dwa profile mobilne; allowlista PUSTA).
- `test:visual`: **21 czerwonych OCZEKIWANYCH** — 12 nowych zrzutów bez
  baseline'u (`home-top`, `home-full` × 6 profili) + 9 rozjazdów
  `chrome-home-*` (`chrome-home-top` × 6, `chrome-home-solid` × 3: 1366,
  iPhone SE, iPhone 14); pozostałe 118 zielone (`chrome-bar`,
  `chrome-sheet`, `chrome-footer`, `oferty`, `oferta`, `not-found` bez
  ruchu). Drugi przebieg `home` na zapisanych zrzutach: 12/12 stabilne
  (zrzuty robocze usunięte — baseline'y powstają wg świętej kolejności).

### 10.5 PLACEHOLDER (U9)

Lista z §7 bez zmian — wszystkie teksty w `home-copy.ts`.

### 10.6 Co sprawdzić na `nowa.` i na fizycznym telefonie

Lista z §8 + po implementacji: (10) krycie szkła karty hero (.45 zamiast
.24) i ciemny pas leadu na telefonie — czy odejście od „lekkiego szkła"
jest akceptowalne wizualnie (to cena kontrastu AA; alternatywą jest
jaśniejszy tekst na mniejszym polu, nie jaśniejsze szkło); (11) start
filmu na realnym łączu — przenikanie zdjęcie → pierwsza klatka (0,6 s)
i koniec (1,2 s); (12) reveale na telefonie przy szybkim przewijaniu
(bloki nie mogą zostawać puste); (13) karuzela kafli na tablecie.

### 10.7 Decyzje po raporcie (Mateusz, 2026-10-03)

Wszystkie cztery wg rekomendacji — bez zmian w kodzie:

1. **Szkło karty hero .45, pas leadu .55 i scrim pod `h1` na telefonie**
   — ZAAKCEPTOWANE (kontrast AA z pomiaru ma pierwszeństwo przed „lekkim
   szkłem" z designu).
2. **Margines LCP mobile ok. 1 s** — bez zmiany progu; czerwony job
   `lighthouse` na PR = pomiar `lhci-measure.yml` i osobna decyzja.
3. **Zoom hero 1,30** (wartość z kodu designu) — ZOSTAJE; ocena na
   `nowa.`, ewentualna korekta to jedna stała (`HOME_HERO_ZOOM`).
4. **Film MP4 CRF 28 / WebM CRF 42** — ZOSTAJE; ocena jakości na dużym
   ekranie po merge'u (CRF 26 = 583 KB, `total` desktop 82 % progu).
