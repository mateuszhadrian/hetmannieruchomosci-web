---
paths:
  - "src/components/sections/**"
  - "src/components/navbar/**"
  - "src/components/offers/**"
  - "src/components/Footer.astro"
---

# Sekcje strony — gotchas

Widoki powstają w Etapach 4–5 (po jednym, pętla mini-analiza →
implementacja → testy → PR) — mini-analizy per widok lądują w `docs/`
(`analiza-*.md`), każda z sekcją „Rozjazdy design ↔ baza wiedzy". Ten
plik jest uzupełniany razem z widokami; poniżej reguły wspólne
odziedziczone z szablonu projektu i stan chrome'u po Etapie 0.

## Wspólne

- **Design to wygląd, nie zachowanie i nie wartości.** Limity, treści
  zgód, adresy e-mail, presety filtrów i dane ofert w makietach są
  przykładowe. Gdy design różni się od bazy wiedzy w logice albo wartości,
  obowiązuje baza wiedzy (`docs/kb/`, dokument lokalny).
- **Jeden markup responsywny.** Podwójne drzewa DOM eksportu
  (`.br-m`/`.br-d`), jednostki `cqw` i sonda `--vph` to artefakty
  narzędzia — nie wchodzą. Skalowanie: `clamp()` + tokeny z
  `src/styles/global.css`.
- Moduły ruchu (`*-motion.ts`) ładowane DYNAMICZNIE tylko przy
  `prefers-reduced-motion: no-preference`; bez JS i przy reduce sekcja
  renderuje pełną, statyczną treść. Reveale i parallaxy designu
  (`data-rv`, `data-px`) stoją na CSS i IntersectionObserver za bramką
  `js-motion` — triggery zawsze na scrollu DOKUMENTU. Wspólny moduł:
  `src/components/sections/content-motion.ts` (od 4.4 — opis w sekcji
  „Strona główna" niżej); strona treściowa dokłada tylko swoje wejście
  chunku (`<widok>-motion.ts`) i bramkę inline w `<head>`.
- **BEZ bibliotek ruchu i scrolla** — ruch sekcji to własne pętle rAF i
  `IntersectionObserver` (wzorzec `content-motion.ts`).
- **`data-rv` tylko na blokach NIEinteraktywnych** (wrapper, nie link
  ani przycisk): reguła reveala niesie własne `transition`, które
  nadpisałoby przejścia hover elementu (przycisk, kafel z `transform` na
  hover) i dawało hover w tempie reveala.
- Breakpoint projektu: **1025 px** (desktop ≥ 1025; tablet 1024 px
  dostaje układ tabletowy). **Drugi próg 768 px** (telefon < 768);
  mapa kontaktu podmienia plik przy 600 px. Stałe w
  `src/lib/site-config.ts`; testy importują `*_DESKTOP_MIN_PX` z configu
  sekcji, a `@media` w `.astro` trzymamy z nią W PARZE (CSS nie
  zaimportuje stałej) — kontrakt `expectBreakpointFlip`.
- **Parallax musi mieć zapas ≥ ruch**: element przesuwany o ułamek
  wysokości kadru musi wystawać poza kadr co najmniej o tyle (`top: -amt%`
  / `height: (100+2·amt)%`). Preflight Tailwinda ma
  `img { max-width: 100% }` — bez `max-width: none` zapas powstaje tylko
  w pionie. Testy wizualne tego NIE pilnują; strażnikiem jest sonda układu
  w e2e.
- Pola formularzy na mobile mają PODŁOGĘ `font-size: 16px` (Safari iOS
  zoomuje stronę przy focusie mniejszego pola i zostawia ją zoomniętą).
- Kontener z `overflow: hidden` jest kontenerem scrolla — programowe
  `scrollIntoView`/fokus potrafi ustawić mu `scrollLeft` i wypchnąć treść
  na stałe. Gdzie chodzi tylko o przycięcie, używaj `overflow: clip`.
- Warstwy testów po zmianie: `.claude/rules/testing.md`; sekcje dostają
  własne specy w `tests/visual/` razem z widokami.

## Chrome (navbar/stopka) — stan po Etapie 4.1 (`docs/analiza-chrome.md`)

- Pasek jest FIXED; treść stron odsuwa się o `var(--hdr-h)` (statyczny
  fallback w `global.css`, skrypt Navbara doprecyzowuje pomiarem).
- Stany paska: `[data-scroll-nav]` + `[data-hero]` (SSR, WYŁĄCZNIE
  `HOME_PATH` — wariant przezroczysty nad hero), `[data-solid]` (na „/"
  po dojechaniu przemalowania do końca, na pozostałych trasach po
  `NAV_SOLID_FALLBACK_PX`), `[data-open]` (otwarty sheet). Poza „/"
  szklane tło jest widoczne zawsze. **Auto-hide paska NIE istnieje.**
- **Wariant „/" to PRÓG SCROLLA, nie selektor hero:** postęp
  `e = smoothstep((scrollY − 0,32·h) / (h − pasek − 0,32·h))`,
  `h = innerHeight` (stałe `NAV_HOME_*` w `nav-config.ts`). Pętla rAF
  dociąga wartość (reguła `scroll.md`) i pisze KILKA zmiennych CSS na
  nagłówku (`--nav-e`, `--nav-c`, `--nav-ch`, `--nav-sh`, `--nav-bar`);
  CSS konsumuje (szkło, scrim, crossfade logo jasne/ciemne, kolor
  linków i kresek burgera). Przy `reduce` — skok bez dociągania (to
  stan, nie animacja). Bez JS `<noscript>` przywraca pełny pasek.
  Mechanizm `[data-navref]` z Etapu 0 nie istnieje — 4.4 nie potrzebuje
  selektora hero (hero pełnoekranowe).
- **Efekt liter** (`.hn-ch` z dwiema kopiami znaku, `.hn-sp` = spacja)
  generuje Astro z `mainNavItems` — zero JS; link ma `aria-label`
  w naturalnej pisowni, litery `aria-hidden`. Ruch liter WYŁĄCZNIE pod
  `@media (prefers-reduced-motion: no-preference)`; litery to osobne
  inline-blocki, więc kerning między nimi nie działa (jak w designie).
- Menu mobilne = bottom sheet na `overlay.ts` (focus-trap, Esc, scrim,
  swipe-down, blokada scrolla). Nakładka z `data-overlay-kind="sheet"`
  uzbraja gest „przeciągnij w dół" i nadpisuje panelowi inline'owy
  `transform` — nie dawaj `kind="sheet"` nakładce, która na desktopie
  jest wyśrodkowanym modalem (objaw: zgubiony klik). Podkład sheetu
  `.96` zamiast szkła `.39` z designu (kontrast AA nad ciemnym hero).
  Przejście na desktop (`NAV_DESKTOP_MIN_PX`) domyka sheet.
- **Stan paska zamraża się na czas KAŻDEJ otwartej nakładki.**
  `overlay.ts` blokuje scroll przez `body{position:fixed;top:-scrollY}`,
  co zeruje `window.scrollY`; `onScroll` Navbara wychodzi wtedy od razu
  (`sheetOpen || document.body.style.position === "fixed"`).
- Pozycja „Praca" w menu i stopce stoi za przełącznikiem `SHOW_PRACA`
  (`src/lib/site-config.ts`) — pozycje menu bierz z `src/i18n/nav.ts`,
  nie wpisuj ich w komponent.
- **Stopka** (R1 analizy): `Biuro:` (adres poznański → link do map,
  otwierany po kliknięciu), `Godziny:`, `E-mail:` (slot `biuro`),
  `Firma:` (nazwa rejestrowa, siedziba, NIP, REGON — dane z `BUSINESS`
  w `src/lib/jsonld.ts`, pola `seat*`). Rok © z `BUILD_NOW`. Mobile ma
  przyciski „Zadzwoń"/„Napisz" ze slotami `data-fill="href"` (bez JS
  prowadzą na `/kontakt/`); desktop — telefon + CTA. Etykiety danych
  α .7 (design .45 nie trzyma AA). `.ft a { color:#fff }` ma wyższą
  specyficzność niż klasa przycisku — kolor tekstu przycisku
  miedzianego ustawiaj przez `.ft .ft-btn--call`.
- Firma nie ma profili w mediach społecznościowych — chrome nie ma
  sekcji social. Teksty-drafty oznaczone `PLACEHOLDER` w kodzie
  (lista w `docs/analiza-chrome.md` §7).

## Lista ofert — stan po Etapie 4.2 (a) (`docs/analiza-oferty.md`)

- **Jedna karta dla SSG i klienta:** `src/components/offers/OfferCard.tsx`
  (Preact; w (a) renderowana przez Astro BEZ `client:*` → zero JS).
  Wejściem karty jest WPIS INDEKSU (`OfferIndexEntry` z
  `index-entry.ts`), nie `Offer` — SSG robi `toIndexEntry(offer)`, wyspa
  (b) czyta `/oferty/index.json`. Treści z CRM wyłącznie jako tekst;
  `dangerouslySetInnerHTML` zabronione. „Teraz" do „Nowości" karta
  dostaje w propie `nowIso` (SSG: `BUILD_NOW`; lista niesie je też
  w `data-build-now` — kontrakt e2e).
- Style karty i listy w `src/components/offers/offers.css` (klasy
  `oc-*`, `ol-*`; komponent Preact nie ma scope'u). Progi W PARZE
  z `site-config.ts`: `< 768` jedna kolumna (karta w kolumnie),
  `768–1024` karta w WIERSZU (zdjęcie z lewej, zawsze), `≥ 1025` siatka
  maks. 3 kolumn (karta w kolumnie) — kontrakt e2e mierzy
  `flex-direction` `.oc-link` po obu stronach obu progów.
- **Wszystkie karty trasy w HTML** (wzorzec E5, analiza §5.3); paginacja
  i filtry dochodzą z wyspą (b) — karty od 13. dostaną wtedy `hidden`
  - `<noscript>` odkrywający. Kolejność SSG = `sortEntries(…, "newest")`.
- Kolory z designu poniżej AA (allowlista axe PUSTA): kicker i tag
  „0% prowizji" → `--copper-text` (nowy token), numer oferty i stan bez
  zdjęć → `--muted`, plakietka „Rezerwacja" = tekst `--ink` na miedzi.
  Bez grayscale na sprzedanych (O9); plakietka „Wynajęte" (R5).
- Rząd pigułek statusu na telefonie to region przewijany poziomo:
  `role="region"` + `aria-label` + `tabindex="0"` (axe
  `scrollable-region-focusable`; reguła eslint dopuszcza `region`).
- Nawigacja (a) = zwykłe linki do list SSG z `routes.ts`: pigułki
  rodzajów (typ × transakcja z ≥ 1 ofertą, z licznikami) i pastylki
  lokalizacji rodzaju; wyspa (b) przejmuje te elementy jako filtry.
- Obraz karty: `imgAt(r2Key, "card")` = `720×480 fit=cover` (3:2, serwer
  tnie), `width`/`height` z danych, `loading="lazy"` poza pierwszymi
  trzema (`eager`, pierwsza `fetchpriority="high"`).
- CTA pod listą: slot `a[data-tel][data-fill="href"]` (bez JS →
  `/kontakt/`), teksty PLACEHOLDER (U9) w `offers-ui.ts` (`UI.cta*`).
- Indeks: `/oferty/index.json` (wpisy + `locations`), `index-text.json`
  (opisy) — endpointy statyczne, poza sitemapą; nazwy kluczy =
  `INDEX_FIELDS` (test unit + skan `test:dist`).

## Wyszukiwarka ofert — stan po Etapie 4.2 (b) (`docs/analiza-oferty.md` §12)

- **Jedyna wyspa projektu:** `src/components/offers/SearchIsland.tsx`
  (`client:load` w `OffersListPage.astro`) + `search-panel.tsx`,
  `combobox.tsx`, `sort-listbox.tsx`, `pagination.tsx`. Renderuje w SSR
  nagłówek z licznikiem, nawigację (a) z propsa `nav` (linki do list SSG
  liczone w Astro), panel, pasek statusów + sortowanie, siatkę
  (WSZYSTKIE karty trasy, od 13. `hidden`), paginację, zero wyników;
  hydratacja na TYM SAMYM markupie (stan początkowy =
  `parseSearch(pathname, "")` po obu stronach; `location.search` czytane
  po montażu). Wyspa ma `display: contents`, jej bloki są elementami
  flexa `.ol-in` w NATURALNEJ kolejności DOM — **bez CSS `order`**:
  Astro wstawia styl `display:contents` dla `astro-island` dopiero
  w `<body>`, a nagłówek przestawiany regułą `order` nad blok
  renderowany wcześniej dawał na mobile CLS 0,07 (job `lighthouse` na
  main po merge'u #16). Kontrakt e2e: kolejność DOM = kolejność na
  ekranie, `order` = 0.
- **Nic nie importuj do wyspy z modułów z zodem/htmlparser2/node:** słowniki
  wartości żyją w `src/lib/offers/enums.ts` (schema.ts re-eksportuje);
  `index-entry.ts`, `data.ts`, `schema.ts` tylko jako `import type`.
  Po każdej zmianie wyspy pomiar budżetu (analiza §12.5) — import zoda
  dał +75 KB brutto, zanim został wycięty.
- **Logika wyłącznie z `filters.ts`** (`parseSearch`, `applyFilters`,
  `sortEntries`, `statusCounts`, `targetPath`, `serializeSearch`) i
  `locations-ui.ts` (podpowiedzi). Brakująca reguła = zmiana tam + unit.
- **Panel = draft** (mapa nazw parametrów → surowy tekst, parsowana przez
  `parseSearch` — pole i adres czytają wartości identycznie); „Pokaż N
  ofert" (`formatShowCount`, biernik) i Enter stosują; „Wyczyść" zeruje
  i stosuje (R20). Statusy, sortowanie, paginacja stosują się od razu.
  Pola nieadekwatne do typu z draftu znikają z panelu rozszerzonego
  (`isFieldRelevant`), a ich wartości są kasowane (`pruneDraft`).
- **Adres:** `targetPath` — typ ∧ transakcja → ścieżka SSG; lokalizacja
  w ścieżce tylko dla LIŚCIA drzewa z istniejącą listą, inaczej
  `?lokalizacja=`; segment adresu listy = `locationSlug` (dokładny, R18).
  `pushState` przy każdej zmianie, `popstate` → `parseSearch`.
- **Dane:** propsy = wpisy indeksu TRASY + drzewo lokalizacji; `/oferty/`
  (`complete`) nie pobiera `index.json`; listy SSG dociągają go
  w `requestIdleCallback` albo natychmiast, gdy stan wymaga;
  `index-text.json` przy pierwszym „szukaj w opisie". Skeleton tylko gdy
  stanu nie da się policzyć z propsów. `client:load` serializuje propsy do
  HTML (`/oferty/` z 46 wpisami ≈ +60 KB brutto, gzip ≈ 9 KB).
- **Breakpointy W PARZE z `DESKTOP_MIN_PX`:** panel (`.op`) i sortowanie
  (`.ol-sort`) tylko ≥ 1025; nawigacja (a) `.ol-nav` tylko < 1025
  (`<noscript>` przywraca ją na desktopie i chowa panel/paginację).
- **a11y:** przycisk „Pokaż" = tekst `--ink` na miedzi (jak „Zadzwoń"
  stopki); span bez roli nie niesie `aria-label` (wyłączone strzałki
  paginacji mają `sr-only`); combobox lokalizacji/ulicy
  (`aria-activedescendant`, `role=option`), listbox sortowania z fokusem
  na opcji; `aria-controls` tylko na istniejący element (`#op-more`
  renderowany wyłącznie po rozwinięciu).
- **Hydratacja a JSX:** sąsiednie teksty (`{a} <b>`) pisz jednym
  wyrażeniem — inaczej Preact rozdziela węzeł scalony przez parser (test
  „zero mutacji siatki" to wyłapuje).

## Mobile listy ofert — stan po Etapie 4.2 (c) (`docs/analiza-oferty.md` §13)

- **Sheety „Filtry" / „Sortuj" są POZA drzewem vdom wyspy.** Powłoki
  (`#ol-sheet-filters`, `#ol-sheet-sort`: scrim, panel `data-overlay-panel`,
  uchwyt `data-overlay-drag`, `h2` + X `data-overlay-close`, kontener
  `[data-sheet-mount]`) buduje `src/components/offers/sheets.tsx`
  bezpośrednio w `<body>` przy pierwszym otwarciu (chunk z dynamicznego
  `import()`, prefetch po pierwszym `touchstart`/`pointerdown` poniżej
  1025 — NIE w idle, bo LHCI doliczyłoby kod, którego desktop nie
  wykonuje). Treść renderuje wyspa jako OSOBNY root Preact (`render(vnode,
mount)` w `useLayoutEffect` przy każdym renderze, `render(null)`
  w `onClose`). Powód: `overlay.ts` portalizuje `[data-overlay]` do
  `<body>`, a Preact przy kolejnym renderze wstawiałby węzeł z powrotem;
  powłoka w SSR wewnątrz wyspy psułaby hydratację. Mechanika (Esc, X,
  scrim, swipe-down, focus-trap, blokada scrolla, reset `scrollTop`)
  w całości z `overlay.ts` przez `window.overlay.open(id, { onClose })`.
- **Jeden `SearchPanel`, dwa hosty.** SSR zawsze renderuje panel inline
  (hydratacja bez mutacji na desktopie; < 1025 `display:none`). Po
  montażu `matchMedia(DESKTOP_MIN_PX)`: poniżej progu panel inline jest
  ODMONTOWANY (w DOM nie ma `.op`), ten sam komponent w wariancie
  `variant="sheet"` (`.op.op--sheet`, pola jedno pod drugim, „Więcej
  filtrów" z podpowiedzią, akcje w stopce sheetu przez `PanelActions`)
  renderuje się w sheecie z tym samym draftem i TYMI SAMYMI id pól.
  Przejście na ≥ 1025 domyka sheet i przywraca panel inline. Kontrakt
  progu z wartością `ABSENT` (`tests/helpers/breakpoint.ts`).
- Pasek narzędzi < 1025: `.ol-mtools` („Filtruj" `[data-offers-filters]`,
  „{sortowanie}" `[data-offers-sort-btn]` z `[data-sort-current]`, NIE
  `data-sort-label` — ten niesie listbox desktopu, a locatory e2e są
  strict); ≥ 1025 `.ol-dtools` (przełącznik `[data-offers-view]`
  z `data-view-set`, listbox). `<noscript>` chowa oba.
- **Nawigacja (a) `nav.ol-nav` pod JS jest UKRYTA na każdej szerokości**
  (R28) — zostaje w DOM dla `<noscript>` i crawlera. Nie przywracaj jej
  na mobile „bo jest miejsce": design mobilny to pasek narzędzi → karty.
- **Siatka/lista** (R29): `data-view` na `[data-offers-grid]`, czysto CSS
  (lista = wiersz + kolumna ceny `grid-row: 1 / span 4` w `.oc-body`),
  domyślnie `OFFERS_LIST_VIEW` z `site-config.ts`, stan NIETRWAŁY
  (sessionStorage dawałby skok siatka → lista po hydratacji).
- Sheet sortowania = wybór TYMCZASOWY (`SortSheet` ma własny `useState`),
  „Zastosuj" stosuje; „Wyczyść" w sheecie zeruje i stosuje, sheet zostaje
  otwarty (R30). Combobox zatrzymuje propagację Esc przy otwartych
  podpowiedziach (inaczej `overlay.ts` zamknąłby cały sheet).
- Stany brzegowe: `applied.invalid` → `[data-offers-invalid]`; błąd
  pobrania `index.json`/`index-text.json` → `[data-offers-error]`
  z `[data-offers-retry]` (bez cichego fallbacku na pulę trasy —
  dawałby mylące wyniki); „Pokaż" bez liczby (`countFailed`) zamiast
  wiecznego „…"; pole opisu `aria-busy` + `#op-opis-hint` podczas
  pobierania tekstów. Na liście rodzaju parametry adresu nigdy nie
  wymagają pełnego indeksu — wymaga go dopiero zmiana rodzaju w panelu.
  **Stany pobierania (R34, po flaky na main 2026-10-03):** flaga błędu
  schodzi dopiero po SUKCESIE pobrania albo przy nowym stanie
  zastosowanym (`setApplied` kasuje ją w tym samym renderze); żądanie
  w drodze to STAN `pending` (ref nie przerenderuje); próba automatyczna
  pokazuje skeleton, ręczne „Ponów" trzyma blok błędu z przyciskiem
  `disabled` + `aria-busy` (`retrying`) do wyniku. **Handler kliknięcia
  nie może synchronicznie odmontować klikniętego elementu** — Playwright
  nie potrafi wtedy potwierdzić kliknięcia („element was detached from
  the DOM, retrying") i ponawia je na przycisku, którego już nie ma.
- **Komentarz we frontmatterze `.astro` nie może zawierać `<` ze spacją**
  (np. „sheety < 1025"): kompilator Astro gubi typy frontmatteru
  i `astro check` zgłasza `any` w zupełnie innych liniach. `<noscript>`
  w backtickach jest bezpieczne.
- axe przy otwartym sheecie: skan `.include(#ol-sheet-…)` po wjeździe
  (`SHEET_IN_MS`), bo treść pod scrimem liczy kontrast przez nakładkę.

## Detal oferty — stan po Etapie 4.3 (a) (`docs/analiza-oferta.md`)

- **Czysty Astro + TS, bez Preact:** `src/components/offers/OfferDetailPage.astro`
  (+ `offer-detail.css`, klasy `od-*`) i `src/scripts/offer-detail.ts`
  (moduł strony, ładowany zawsze). Ikony dla `.astro` przez
  `Icon.astro` (`ALL_ICONS` z `icons-detail.ts` = `ICONS` listy + ikony
  detalu). **Nie dopisuj ikon detalu do `icons.ts`:** wyspa listy trzyma
  cały obiekt `ICONS` (dostęp `ICONS[name]`), więc każda ścieżka tam to
  bajty na `/oferty/` (pierwszy build: +655 B). Analogicznie: żadnych
  efektów ubocznych na poziomie modułu w `format.ts`/`offers-ui.ts`
  (np. `new Intl.DateTimeFormat`) — bundler ich nie wytnie.
- **Nagłówek na mobile leży NAD dolną częścią hero** (`.od-head`
  absolutnie, pudełko o wysokości `--od-hero-h` — wspólna zmienna z
  `.od-hero`; `.od-top` jest kontekstem, a miniatury są JEGO częścią,
  więc `bottom: 0` celowałoby pod hero). Desktop: nagłówek statycznie nad
  siatką hero + 2×2 kafle.
- **Hero = tor `scroll-snap`** ze WSZYSTKIMI zdjęciami (`hero` wariant,
  pierwsze `eager` + `fetchpriority` + `<link rel=preload>`, reszta
  `lazy`); ‹ ›, klawiatura ←/→ przy fokusie toru przewijają hero; kadr,
  kafle, miniatury, „Wszystkie zdjęcia" i „Rzuty" (`data-gal-open`)
  otwierają lightbox (sekcja niżej). **Miniatury spoza pierwszych `OFFER_THUMBS_EAGER` mają
  `data-src`** (JS dogrywa je IO z `root` = pasek): natywne
  `loading="lazy"` w POZIOMYM pasku ładuje wszystkie obrazy (Chrome:
  22/22), a LHCI na fixture tego nie widzi (kopie 400 px). Pion i rzuty: `object-fit: contain` (pion na rozmytym tle
  `card` tej samej fotografii). Licznik czyta `scrollLeft / clientWidth`.
- **„Dane szczegółowe" wyłącznie z `src/lib/offers/details-rows.ts`**
  (jedna deklaratywna lista: etykieta + `value(offer, ctx)`; `null` =
  wiersz ukryty). Nowy wiersz = jedna pozycja w `DETAIL_ROWS` + wpis
  w `DETAIL_ROW_IDS` + test. Desktop 2 kolumny: `--od-rows` (liczba
  wierszy na kolumnę) liczona w Astro.
- **Opis = JEDYNE `set:html` w projekcie** (`descriptionHtml`
  sanityzowany w syncu; klasy `ta-center`, `ta-justify`, `u` mają CSS
  w `offer-detail.css`). Zwijanie: JS mierzy `scrollHeight` i dopiero
  wtedy dokłada `data-collapsed` + przycisk (próg
  `OFFER_DESCRIPTION_COLLAPSE_PX` mobile/desktop); bez JS pełny tekst.
  Zwinięte pudełko ma `overflow: hidden`, nie `clip` — axe uznaje treść
  za obciętą tylko przy `hidden` (przy `clip` tekst spod maski liczył
  kontrast na tle ciemnego kafla filmu → naruszenie).
- **Film i spacer: iframe DOPIERO po kliknięciu** (D32) — kafel to `<a>`
  do YouTube / spaceru (działa bez JS), JS podmienia go na `iframe`
  (`youtube-nocookie.com/embed`, `allow` bez `microphone`). Miniatura =
  pierwsze zdjęcie oferty z R2, nigdy z serwerów YouTube.
- **Mapa** = `maps[coordKey(lat, lon)]` (bez `goneSince`) jako `<img>`
  w NATURALNYCH proporcjach manifestu (pasek atrybucji nietykalny — bez
  `object-fit: cover`); prod `mediaUrl()`, fixture kopia lokalna.
  Brak wpisu → sekcja i kotwica znikają. `INTERACTIVE_MAP` nie ma UI.
- **Kotwice**: `nav[data-offer-anchors]` sticky pod paskiem
  (`top: var(--hdr-h)`, wysokość `--od-anchors-h` 48/52); pozycje
  warunkowe (opis/film/spacer/mapa); sekcje mają `scroll-margin-top:
calc(var(--hdr-h) + var(--od-anchors-h) + 8px)` — także `.od-contact`
  (spoza `.od-sec`). Podświetlenie przez IntersectionObserver.
- **Sloty kontaktowe**: panel, pasek dolny i sekcja kontaktu używają
  `a[data-tel]` / `a[data-mail="joanna"]` (+ `data-fill="href"` na
  przyciskach, bez JS → `/kontakt/`); puste kotwice slotów MUSZĄ mieć
  dziecko `<span data-slot>` (lint `anchor-has-content`). Kontrakt na
  surowym HTML wycina blok `.od-desc` (opis z CRM poza kontraktem).
  Avatar „JH" = `--ink` na miedzi (biel z designu 3,1:1 nie trzyma AA).
- **Pasek dolny (< 1025)**: `position: sticky; bottom: 0; height: 0` na
  końcu `main` (znika razem z `main` na stopce), przyciski absolutnie;
  ≥ 1025 ukryty JEST I HOST, I PASEK (kontrakt `expectBreakpointFlip`
  czyta `display` samego paska). Panel boczny (`aside[data-offer-panel]`)
  tylko ≥ 1025, `top: calc(var(--hdr-h) + var(--od-anchors-h) + 16px)`.
- **Udostępnij**: trzy linki do sharerów (Facebook, WhatsApp, X)
  z absolutnym adresem + „Skopiuj link"; gdy `navigator.share` istnieje,
  JS pokazuje jeden przycisk natywny i chowa linki. Zero żądań do
  podmiotów trzecich przy wejściu — linki, nie skrypty.
- **Meta**: `<title>`/`description` z `detail-meta.ts` (opis cięty na
  granicy zdania ≤ 160), `og:image` = `imgAt(first, "og")` przez prop
  `ogImage` w `BaseLayout`, JSON-LD `realEstateListing()` z `jsonld.ts`
  (adres do ulicy, bez `geo`, cena pominięta przy `null`) przez
  `JsonLd.astro` w slocie head. `data-build-now` na `main` (jak lista).
- **Żadnego `scrollIntoView` w skryptach widoku** do dosuwania elementu
  w POZIOMYM pasku (miniatury, kotwice): `block: "nearest"` przewija też
  przodków, czyli stronę w pionie — rusza sticky i wywraca zrzuty pełnej
  strony na linuksowym Chromium („two consecutive stable screenshots",
  bieg 37113992326). Używaj `revealInStrip()` (sam `scrollLeft` paska).
- `tests/e2e/oferta.spec.ts` korzysta z lokalnego `imgAt()` zbudowanego
  z `IMG_VARIANTS` + `MEDIA_BASE` — prawdziwy `imgAt` czyta
  `import.meta.env`, którego Node Playwrighta nie ma.

## Lightbox, druk, 404 świadoma ofert — stan po 4.3 (b) (`docs/analiza-oferta.md` §11)

- **Lightbox = `src/scripts/offer-lightbox.ts`**, chunk z dynamicznego
  `import()` w `offer-detail.ts` (prefetch po pierwszym `pointerdown`/
  `touchstart` na galerii — NIE w idle). Powłoka `#of-lightbox` to klon
  szablonu `template[data-lb-tpl]` z `LightboxShell.astro`, wstawiany do
  `<body>` przy PIERWSZYM otwarciu (przed otwarciem nie ma go w DOM);
  tor wypełniają kadry czytane z galerii hero (atrybuty `src`, `width`,
  `height`, `alt` — bez drugiej serializacji). Teksty i ikony zostają
  w Astro; chunk NIE importuje `offers-ui.ts`.
- **Szablon HTML (`<template>`) nie może stać w wyrażeniu `{warunek &&
(…)}`** — kompilator Astro generuje wtedy zepsuty kod (build pada na
  „Expected ")" but found "class""). Szablon siedzi na najwyższym poziomie
  własnego komponentu, a warunek obejmuje KOMPONENT
  (`{first && <LightboxShell />}`). Komentarz blokowy między `(`
  a elementem w wyrażeniu też wywraca build — komentarz wkładaj do
  elementu jako `{/* … */}`.
- **Mechanika wyłącznie z `overlay.ts`** (Esc, X, scrim, focus-trap,
  blokada scrolla, swipe-down). Moduł trzyma tylko `data-overlay-kind`:
  `sheet` poniżej 1025, `modal` od 1025 (`matchMedia`, W PARZE z `@media`
  sekcji `lb-*` w `offer-detail.css`); zmiana progu przy otwartym
  lightboxie ZAMYKA go. Nagłówek sheetu niesie `data-overlay-drag`
  (uchwyt jak w sheetach listy); ‹ › tylko od 1025.
- Tor = natywny scroll-snap (`scroll-snap-stop: always`), kadr = 100 %
  szerokości toru, obraz `contain` (naturalne proporcje, R11). ‹ › i ←/→
  bez zapętlenia; licznik liczy `scrollLeft / clientWidth`, a w trakcie
  płynnego dojazdu ignoruje kadry pośrednie (`target`). **Przycisk, który
  dostaje `disabled`, mając fokus, oddaje go drugiej strzałce albo
  panelowi** — inaczej Tab uciekłby z dialogu. Bieżący kadr i sąsiedzi
  `eager`, reszta `lazy`.
- Po zamknięciu `onClose` stawia hero na oglądanym kadrze (`goTo(i,
true)`). **Akcja wymagająca przewinięcia strony („Napisz" → `#kontakt`)
  wykonuje się w `onClose`, PO odblokowaniu scrolla** — przy
  `body{position:fixed}` skok kotwicy nic nie robi, a `overlay.ts` i tak
  przywraca zapamiętaną pozycję.
- Atrybuty obrazów kopiuj przez `getAttribute` — własność `img.width`
  zwraca rozmiar NA EKRANIE, a `img.src` adres rozwinięty.
- **Druk** (`@media print` na końcu `offer-detail.css`): kartka A4 ma ok.
  690 px, więc bazą jest układ MOBILNY, a emulacja `print` na szerokim
  oknie dostaje reguły desktopowe — arkusz nadpisuje OBA układy. Tła nie
  są drukowane: tekst ciemnych sekcji (nagłówek na hero, kontakt) dostaje
  ciemny kolor. Elementy tylko do druku: `.od-print-photos` (siatka
  zdjęć `card`), `.od-print-links` (adresy filmu i spaceru),
  `.od-print-foot` — na ekranie `display:none`.
- **Obrazy arkusza druku mają `data-print-img`** (siatka, rzuty, mapa):
  na ekranie są `lazy` (siatka w ogóle niewidoczna → niepobierana),
  „Drukuj / PDF" przełącza je na `eager` i czeka na wczytanie (limit
  `PRINT_IMAGES_WAIT_MS`) przed `window.print()`; `beforeprint` robi to
  samo bez czekania. Nowy obraz widoczny w druku = ten atrybut.
- **404 (`src/pages/404.astro`)**: ten sam plik odpowiada pod każdym
  adresem, więc wariant ofertowy rozpoznaje skrypt `is:inline` (ścieżka
  `/oferty/…` albo `/sw\d+`). Blok ofertowy siedzi w `template[data-nf-tpl]`
  i ZASTĘPUJE blok generyczny (`[data-nf-generic]`) — w DOM jest zawsze
  jeden `h1`, a zdjęcia kart nie pobierają się na zwykłej 404. Karty =
  `OfferCard` bez `client:*` (zero modułów widoku; kontrakt „jedyne
  moduły to chrome" zostaje), dobór `sortEntries(…, "newest")` z ofert
  `aktywna`. Układ generyczny centruje przez `place-items: center` —
  działa to też w układzie blokowym (`justify-self`), więc wariant
  ofertowy resetuje `place-items` i ma `width: 100%`.

## Strona główna — stan po Etapie 4.4 (`docs/analiza-home.md`)

- **Czysty Astro i mały TS, bez wyspy:** `src/pages/index.astro` składa
  `src/components/sections/home/` (`HomeHero`, `HomeAbout`, `HomeOffers`
  z `HomeOfferTile`, `HomeServices`, `HomeSell`, `HomeContact`); stałe w
  `home-config.ts`, WSZYSTKIE teksty w `home-copy.ts` (PLACEHOLDER U9;
  testy importują je stamtąd). Wspólne prymitywy stron treściowych:
  `sections/content.css` (klasy globalne `sx-*`: sekcja, eyebrow, `h2`
  dwukolorowy, akapit, przycisk; kadr `.px-frame`; stany reveali) i
  `SectionHead.astro`. Style sekcji — scoped w komponentach; elementy z
  dziecka (`SectionHead`, kafel) przez `:global()`.
- **Bramka ruchu:** skrypt `is:inline` w slocie `head` nadaje
  `html.js-motion` przy `no-preference` PRZED malowaniem; skrypt strony
  ładuje `home-motion.ts` dynamicznym `import()`. Bezpieczniki, żeby
  treść nigdy nie została ukryta: `.catch` importu zdejmuje klasę, a
  bramka zdejmuje ją 3 s po `load`, jeśli moduł nie ustawił
  `data-motion` na `<html>`. Stany startowe w CSS WYŁĄCZNIE pod
  `html.js-motion`.
- **Hero** (`data-home-hero` — NIE `data-hero`: ten atrybut nosi pasek
  nawigacji): wysokość `var(--svh, 100svh)`; warstwy: `<img>` w
  `<picture>` (obraz priorytetowy: `eager`, `fetchpriority`, dwa
  `preload` z `media` w `<head>`, ŻADNEGO reveala) → `<video>`
  (`opacity: 0`, `display: none` poniżej 1025) → scrim, tint, szum →
  treść. Kadr pionowy `hero-poster-tall.webp` poniżej 768 px
  (`HOME_POSTER_TALL_BELOW_PX`). Elementy tylko-mobile `.hero-m` i
  tylko-desktop `.hero-d` (jeden markup). Elementem LCP jest `h1` —
  Chrome nie liczy obrazu wypełniającego całe okno. **Krycia szkła i
  scrimów są z POMIARU kontrastu** na najjaśniejszych kadrach filmu
  (analiza H14) — axe nie liczy kontrastu nad obrazem (zwraca
  „incomplete"), więc zmiana krycia, koloru tekstu albo materiału wideo
  wymaga ponownego pomiaru (metoda w analizie §10.2).
- **Film → zdjęcie (`home-hero.ts`):** w HTML `muted`, `playsinline`,
  `preload="none"`, bez `autoplay` i bez `poster`; `<source>` MP4 →
  WebM z adresami w `data-src`, NIE w `src` (WebKit na Linuksie pobiera
  pierwsze źródło mimo `preload="none"`) — JS wpisuje `src` i woła
  `load()` dopiero przy starcie. Start wyłącznie od 1025 px, po
  wczytaniu plakatu; stan na
  `video[data-state]`: `idle` → `playing` (dopiero zdarzenie `playing`
  pokazuje film) → `photo` (koniec materiału, odrzucone `play()`, błąd,
  zejście poniżej progu; `saveData` w ogóle nie startuje). Zoom: JEDNA
  warstwa `[data-hero-zoom]` (zdjęcie i film), `transform` z pętli rAF z
  dociąganiem; cele liczone z PROSTOKĄTÓW, nie ze `scrollY` (blokada
  scrolla nakładek zeruje `scrollY`). Szum bez `mix-blend-mode`.
- **`content-motion.ts`** (wspólny): reveale — IntersectionObserver
  nadaje `.is-in` (raz; blok nad oknem odsłaniany od razu), kaskada
  desktop przez `--rvd` inline, `data-rv="soft"` = sam fade,
  `data-rv="d"` = reveal tylko od 1025 (bloki na szkle:
  `backdrop-filter` mruga przy zmianie krycia). Parallax — obraz
  `[data-px]` w kadrze `.px-frame` (`overflow: clip`; kadr szukany przez
  `closest`, bo obraz bywa w `<picture>`): pod `js-motion` obraz dostaje
  zapas `--px-a` (0,08 i 0,10 — W PARZE z `PX_AMT_*` w
  `content-config.ts`), JS pisze sam `translate3d`; transform jest
  czystą funkcją pozycji scrolla (liczony także poza oknem),
  przemalowanie na `resize` tylko przy zmianie szerokości.
- **`content-viewport.ts`:** `armViewportPin(host)` przypina `--svh`
  dopiero, gdy `100svh` drgnie bez zmiany szerokości (przeglądarki
  zmieniające rozmiar widoku z paskiem adresu; także rozciągnięcie okna
  przy zrzucie fullPage w WebKit); `vpH()` dla pętli ruchu. Poza bramką
  ruchu — to stabilność układu.
- **Kafle ofert:** `pickHomeOffers()` (`src/lib/offers/home-offers.ts`)
  = najnowsze `aktywna`, najwyżej `HOME_OFFERS_MAX`; zero → sekcja bez
  siatki. `HomeOfferTile.astro` to wygląd z designu na LOGICE karty
  (`cardKicker`, `cardBadges`, `formatPrice`, `formatLocation`, wpis
  indeksu) — zmiana reguł prezentacji oferty idzie do `offers-ui.ts`
  albo `format.ts`, nie do kafla. Znaczniki `data-home-offer="{numer}"`
  (NIE `data-offer-card` — ten liczy strażnik fixture'u na liście).
  Obraz `card`; duży kafel pełnej trójki ma
  `<source media="(min-width: 1025px)" srcset="card 1x, hero 2x">`
  (deskryptory `x`, nie `w` — przy `w` przeglądarka brała `hero` już na
  ekranach 1×). Telefon i tablet: karuzela `scroll-snap`
  (`scroll-snap-stop: always`), wyjście do krawędzi przez `--ho-gut`.
- **Dekoracyjne numery** (kafle usług, kroki) to liczniki CSS w
  pseudo-elementach — nie tekst w DOM (kontrast dekoracji nie wchodzi do
  axe, kolejność niesie `<ol>`).
- **Sloty kontaktowe z własnym `display`** potrzebują reguły
  `[hidden] { display: none }` — `display: inline-flex` klasy wygrywa z
  atrybutem `hidden`.

## Dane kontaktowe (antyscraping)

- Telefon i e-maile: sloty `a[data-tel]`, `a[data-mail="biuro|joanna"]`
  (+ opcjonalny `[data-slot]`, `data-fill="href"`) wypełniane przez
  `fillContactSlots` z `src/lib/contact-details.ts` — nie „upraszczaj" do
  jawnego `tel:`/`mailto:` w markupie. `biuro` = kontakt, stopka,
  polityka; `joanna` = karta agenta.
- Kontrakt na surowym HTML obejmuje chrome, `/kontakt/`, kartę agenta
  i politykę. **Wyłączony z niego jest opis oferty z CRM** — treści
  klientki nie redagujemy.
- `src/lib/jsonld.ts` nie zna telefonu ani e-maili i nie importuje
  `contact-details`.

## Formularze — mechanika odziedziczona, pola w Etapie 5

- Mechanika w `sections/contact/contact-ui.ts` (ładowana ZAWSZE — to
  funkcja, nie dekoracja); logika i szablon maila w
  `src/lib/contact-form.ts`; endpoint `functions/api/kontakt.ts`.
  **Zestaw pól w kodzie jest dziś odziedziczony i NIE jest docelowy.**
- Komunikaty walidacji siedzą w SSR i pokazuje je CSS przy klasie
  `.err`; skrypt zapala tylko klasę — zero tekstów w JS.
- Honeypot jest `readonly` (autofill Chrome'a nie wypełnia readonly;
  focus zdejmuje atrybut) — nie usuwaj atrybutu.
- Turnstile ładowany leniwie (pierwszy `focusin` w formularzu) — nie
  przenoś do eager loadu.
- Pułapki klienckie mają serwerowy odpowiednik w endpointcie (honeypot,
  czas wypełnienia, weryfikacja Turnstile) — zmiany po jednej stronie
  kontraktu wymagają przeglądu drugiej.
- Zgoda wymuszona jest nieważna: żaden checkbox zgody nie może być
  warunkiem wysłania formularza. Zestaw pól i zgód deklaruje polityka
  prywatności — zmiana pól wymaga przeglądu tamtego dokumentu.
