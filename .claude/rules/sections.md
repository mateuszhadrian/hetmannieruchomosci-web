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
  chunku (`<widok>-motion.ts`) i bramkę inline w `<head>` — komponent
  `src/components/MotionGate.astro` (`<MotionGate slot="head" />`; od 5A
  używają go „/" i `/sprzedaj-z-nami/`, od 4.5 także `/o-nas/`, od 4.6
  `/uslugi/`).
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
- Stany paska: `[data-scroll-nav]` + `[data-hero]` (SSR — wariant
  przezroczysty „nad hero": strona główna oraz strony, które przekażą
  paskowi prop `overHero`; od 5A `/sprzedaj-z-nami/`, od 4.5 `/o-nas/`,
  od 4.6 `/uslugi/`),
  `[data-solid]`
  (w wariancie „nad hero" po dojechaniu przemalowania do końca, na
  pozostałych trasach po `NAV_SOLID_FALLBACK_PX`), `[data-open]` (otwarty
  sheet). Poza wariantem „nad hero" szklane tło jest widoczne zawsze.
  **Auto-hide paska NIE istnieje.**
- **Wariant „nad hero" to PRÓG SCROLLA liczony z wysokości hero:**
  postęp `e = smoothstep((scrollY − 0,32·h) / (h − pasek − 0,32·h))`,
  `h` = wysokość elementu `[data-nav-hero]` strony, a gdy strona go nie
  oznaczy — `innerHeight` (strona główna: hero pełnoekranowe, bez
  znacznika; `/sprzedaj-z-nami/`: hero 66 % okna na desktopie; `/o-nas/`:
  znacznik na KADRZE ZDJĘCIA — na telefonie samo zdjęcie, na desktopie
  cała sekcja; `/uslugi/`: znacznik na sekcji hero, ciemnej na obu
  progach). Strona z hero pod paskiem = `<Navbar overHero />` +
  `data-nav-hero` na elemencie, pod którym pasek ma być przezroczysty
  (pierwszy taki element w dokumencie) + hero zaczynające się od góry
  okna (własny `padding-top` z `--hdr-h`). Stałe `NAV_HOME_*` w `nav-config.ts`
  dotyczą całego wariantu. Tekst i logo paska stoją wtedy NAD zdjęciem —
  kontrast linków paska wchodzi do pomiaru kontrastu hero (axe go nie
  liczy). Pętla rAF
  dociąga wartość (reguła `scroll.md`) i pisze KILKA zmiennych CSS na
  nagłówku (`--nav-e`, `--nav-c`, `--nav-ch`, `--nav-sh`, `--nav-bar`);
  CSS konsumuje (szkło, scrim, crossfade logo jasne/ciemne, kolor
  linków i kresek burgera). Przy `reduce` — skok bez dociągania (to
  stan, nie animacja). Bez JS `<noscript>` przywraca pełny pasek.
  Mechanizm `[data-navref]` z Etapu 0 nie istnieje.
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
- **Bramka ruchu:** skrypt `is:inline` w slocie `head` (od 5A komponent
  `MotionGate.astro` — HTML „/" po wydzieleniu bajt w bajt ten sam) nadaje
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
  przemalowanie na `resize` tylko przy zmianie szerokości. Wartości
  atrybutu (od 4.5): `data-px="-1"` — kierunek odwrotny (dwa sąsiednie
  zdjęcia jadą przeciwnie); `data-px="top"` — kadr PIERWSZEGO EKRANU:
  przesunięcie liczone od pozycji scrolla 0 (zero na starcie,
  ograniczone do zapasu) — sposób na zdjęcie pierwszego ekranu bez
  przeskoku po wczytaniu modułu, gdy wysokość kadru nie jest ułamkiem
  okna (wzór CSS ze „Sprzedaj z nami" wymaga takiego ułamka). Od 4.6
  punkt zerowy wynika z POZYCJI KADRU W DOKUMENCIE (prostokąt kadru
  plus `scrollY`), więc kadr nie musi zaczynać się na samej górze strony
  (hero `/uslugi/` na telefonie: zdjęcie pod blokiem tekstu); przy
  blokadzie scrolla nakładek (`body{position:fixed}` zeruje `scrollY`)
  moduł trzyma ostatnią znaną pozycję. **Skok kotwicy** (od 4.6):
  bloki przeskoczone jednym susem nie przecinają okna, więc
  IntersectionObserver ich nie zgłasza — moduł odsłania wszystko, co po
  zdarzeniu `hashchange` leży NAD oknem (dotyczy każdej strony z kotwicą
  w treści: `#formularz`, sekcje usług).
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

## Formularze — stan po Etapie 5A (`docs/analiza-formularze-a.md`)

- **Jeden endpoint, jedno źródło reguł.** `functions/api/kontakt.ts`
  przyjmuje wszystkie formularze (pole `form`: `kontakt`, `sprzedaj`,
  `oferta`, `praca`). Reguły w `src/lib/contact-form.ts`
  (czysty TS): `validateForm(kind, raw)` zwraca dane albo LISTĘ błędnych
  pól — tę samą funkcję woła moduł kliencki i funkcja, a odpowiedź 400
  z `fields` zapala te same opakowania co walidacja kliencka. Zmiana
  reguły = zmiana tam + test unit; nigdy osobno po jednej stronie.
- **Dwa osobne pola kontaktowe, wymagane co najmniej jedno**
  (`FormContactPair.astro`): opakowanie `data-f="contact"` niesie błąd
  „nie podano żadnego", pola `email` / `phone` — własne błędy formatu.
  Pole wypełnione błędnie jest błędem także przy poprawnym drugim.
  Kolejność E-mail → Telefon jest jedna dla wszystkich formularzy.
- **Markup:** `src/components/forms/` — `FormFrame.astro` (formularz,
  blok końcowy zgoda → nota → przycisk jako elementy kolumny flex,
  pułapka, kontener Turnstile, błąd wysyłki, ekran potwierdzenia
  w miejscu formularza), `FormField.astro` (prawdziwy `<label>`, dopisek
  przy polach OPCJONALNYCH, komunikat w HTML), `forms.css` (klasy
  `fm-*`, globalne), `forms-copy.ts` (teksty — importują je też testy),
  `form-config.ts` (endpoint, klucz Turnstile), `form-ui.ts` (mechanika,
  ładowana ZAWSZE — to funkcja, nie dekoracja; strona woła `initForms()`),
  `FormChoice.astro` (grupa radio: `fieldset` + `legend`, kafle
  z natywnym `input`, komunikat pod grupą; `data-f` na fieldsecie),
  `FormTel.astro` (slot telefonu w komunikatach — kotwica bez białych
  znaków w środku; formatter rozbija ją na linie wszędzie, gdzie stoi
  w wyrażeniu, a białe znaki w kotwicy są podkreślane).
- **Kafle radio** niosą identyfikatory słownika CRM (`ESTATE_TYPES`,
  `TRANSACTIONS` w `contact-form.ts` — wartości nie zmieniać; kolejność
  i etykiety to interfejs). Radio nie ma pozycji startowej: brak
  zaznaczenia = „nie wybrano". Każde radio grupy ma `required`
  (walidacja natywna bez JS). Błąd grupy = klasa `.err` na fieldsecie;
  fokus idzie na PIERWSZY kafel grupy, zmiana wyboru gasi błąd.
- **Pola opcjonalne w `<details class="fm-more">`** (natywne — działa
  bez JS): pola wewnątrz nie powtarzają dopisku „(opcjonalnie)" (niesie
  go nagłówek bloku). Błąd pola w zwiniętym bloku — także zwrócony przez
  serwer — otwiera blok przed fokusem (`focusFirstError`). Test, który
  wypełnia pola bloku, najpierw go rozwija (pole w zwiniętym `<details>`
  nie jest widoczne).
- Potwierdzenie pokazuje numer telefonu tylko wtedy, gdy teksty ramki
  mają zdanie, które do niego prowadzi (`doneCall` niepuste — kontakt);
  zgłoszenie nieruchomości numeru w potwierdzeniu nie ma.
- **Zero tekstów w JS.** Komunikaty walidacji siedzą w SSR i pokazuje je
  CSS przy klasie `.err` na BEZPOŚREDNIM opakowaniu (`.err > .fm-msg`);
  skrypt zapala tylko klasę. Etykieta przycisku w trakcie wysyłki
  przychodzi z `data-sending`.
- **`aria-describedby` składa skrypt:** stałe opisy (podpowiedzi) stoją
  w `data-desc`, komunikat błędu jest dopinany DOPIERO przy aktywnym
  błędzie — element ukryty przez CSS, ale wskazany w `aria-describedby`,
  i tak byłby czytany jako opis pola.
- Skrypt nadaje formularzowi `novalidate`; atrybuty `required` zostają
  w HTML (semantyka + natywna walidacja bez JS). Bez JS formularz jest
  kompletny (`method`/`action`), ale wysyłka wymaga JS (token Turnstile)
  — mówi to `<noscript>`, a funkcja odsyła POST bez nagłówka
  `Accept: application/json` przekierowaniem 303 na stronę formularza
  (`#formularz`). Moduł kliencki ZAWSZE wysyła ten nagłówek.
- Honeypot `firma` jest `readonly` (autofill nie wypełnia pól readonly;
  focus zdejmuje atrybut), ma `tabindex="-1"` i jest ukryty wizualnie —
  nie `display:none`. Nie usuwaj atrybutu.
- **Turnstile:** element `<script>` powstaje dopiero przy pierwszym
  `focusin` w formularzu (wcześniej go nie ma w DOM — konstrukcja, nie
  podpowiedź dla przeglądarki); widget renderowany jawnie, token pobierany
  przy wysyłce. Pusty klucz albo niewstający skrypt = pusty token =
  odmowa serwera = komunikat błędu wysyłki (zawodzi głośno).
- Pułapki klienckie (honeypot, minimalny czas → udawany sukces bez
  żądania) mają serwerowy odpowiednik w endpointcie — zmiany po jednej
  stronie kontraktu wymagają przeglądu drugiej. Kolejność kroków funkcji:
  rozmiar po nagłówku (brak `Content-Length` → 411, ponad próg górny →
  413; treść nieczytana) → rodzaj (+ próg formularza tekstowego i zakaz
  plików → 413) → pułapka (200) → walidacja → sekrety (+ kodowanie
  załącznika dla `praca`) → Turnstile → limit dzienny (KV) → [oferta:
  indeks ofert] → [praca: base64 pliku] → Resend.
- **Maile** buduje `buildMail()` (temat stały per formularz — żadnych
  danych klienta w temacie; etykiety słownika zamiast identyfikatorów;
  mail zgłoszenia niesie powierzchnię i cenę; adres strony w stopce
  z HOSTA ŻĄDANIA). `Reply-To` tylko przy podanym e-mailu. Adresata
  nadpisuje opcjonalna zmienna środowiskowa `KONTAKT_TO` (podglądy PR-ów).
- **Zgoda marketingowa** (`MARKETING_CONSENT` w `contact-form.ts` — jedno
  brzmienie dla widoków i maili): opcjonalna, odznaczona, bez gwiazdki;
  żaden checkbox zgody nie może być warunkiem wysłania. Nota informacyjna
  to osobny element nad przyciskiem. Zestaw pól i zgód deklaruje polityka
  prywatności — zmiana pól wymaga przeglądu tamtego dokumentu.
- Po wysyłce: `form[hidden]`, `[data-form-done]` widoczne, fokus na
  nagłówku potwierdzenia, ramka dosuwana pod pasek (potwierdzenie jest
  niższe od formularza). Telefon w potwierdzeniu i w komunikacie błędu
  przez slot `a[data-tel]`. Klasy z własnym `display` mają regułę
  `[hidden] { display: none }`.
- Pola: `font-size` 16 px (podłoga iOS). **Dosuwanie pod stały pasek
  robi SKRYPT, nie przeglądarka:** `focus({ preventScroll: true })`,
  a potem `revealUnderBar()` (natywny `window.scrollTo`) dla pierwszego
  błędnego pola i dla ramki z potwierdzeniem. WebKit na Linuksie po
  samym `focus()` zostawiał pole pod paskiem mimo `scroll-margin-top`
  (czerwony `e2e` na PR #25, lokalnie na macOS zielony) — nie polegaj
  na przewijaniu przy fokusie.

## Kontakt — stan po Etapie 5A (`docs/analiza-formularze-a.md`)

- `src/pages/kontakt.astro` + `sections/contact/`: `ContactIntro`
  (eyebrow, `h1` dwukolorowy), `ContactInfo` (mapa + karta danych),
  `ContactForm`; teksty w `contact-copy.ts` (PLACEHOLDER U9), stałe
  w `contact-config.ts`. Widok NIE ma ruchu (bez bramki `js-motion`).
- **Mapa stoi w NATURALNYCH proporcjach pliku** (`<picture>`, plik
  desktopowy od `CONTACT_MAP_SWAP_PX` = 600 px; `aspect-ratio` w CSS
  W PARZE z tym progiem). Napis atrybucji jest wypalony przy dolnej
  krawędzi obrazu i zajmuje większość jej szerokości: żadnego
  `object-fit: cover`, żadnego zaokrąglenia dolnych rogów mapy i żadnego
  elementu nasuniętego na jej dół. **Karta danych stoi POD mapą** (design
  nasuwał ją na mapę) i to ona niesie promień lewego dolnego rogu.
  Kontrakt e2e mierzy proporcje i położenie karty na sześciu szerokościach.
- Mapa jest na telefonie elementem LCP: ładowana od razu
  (`fetchpriority="high"`, bez `lazy`).
- Karta: sloty `a[data-tel]`, `a[data-mail="biuro"]`; wiersz ze slotem
  ukrytym (bez JS) znika cały (`.ki-row:has(> a[hidden])`), `<noscript>`
  to wyjaśnia. Jeden adres — biuro (z `BUSINESS`); siedziba zostaje
  w stopce. Kolejność wierszy różni się między progami przez
  `grid-template-areas` (DOM: telefon, e-mail, biuro, godziny).
- Link „Otwórz w mapach" = `OFFICE_MAPS_URL` (zapytanie po adresie, ten
  sam cel co w stopce), zwykła kotwica otwierana po kliknięciu.

## Sprzedaj z nami — stan po Etapie 5A / PR 2 (`docs/analiza-formularze-a.md` §11)

- `src/pages/sprzedaj-z-nami.astro` + `sections/sell/`: `SellHero`,
  `SellSteps`, `SellForm`; teksty w `sell-copy.ts` (PLACEHOLDER U9)
  i `SPRZEDAJ_FORM_COPY` (`forms-copy.ts`), stałe w `sell-config.ts`,
  wejście chunku ruchu `sell-motion.ts` (samo `initContentMotion()`).
  Skrypt strony: `initForms()` zawsze, `armViewportPin`, dynamiczny
  `import()` ruchu przy `no-preference`.
- **Hero stoi POD przezroczystym paskiem** (`<Navbar overHero />`,
  `data-nav-hero` na sekcji): telefon i tablet `min-height` = okno,
  desktop 66 % okna — ułamek w zmiennej `--sh-r` (W PARZE
  z `SELL_HERO_DESKTOP_RATIO`). Zdjęcie i `h1` to kandydaci LCP: `eager`,
  `fetchpriority`, dwa `preload` z `media` na stronie, ŻADNEGO reveala
  w hero. Kadr pionowy `sprzedaj-doradca-tall.webp` poniżej 768 px
  (wycinek wokół pozycji 64 % — `object-position` jeden dla obu plików).
- **Parallax hero ma pozycję startową w CSS** (reguła pod
  `html.js-motion`, ten sam wzór co `content-motion.ts`, liczony
  z `--sh-r` i `--px-a`): kadr pierwszego ekranu dostaje transform dopiero
  po wczytaniu modułu ruchu, więc bez tej reguły zdjęcie przeskakiwało
  o kilkanaście pikseli tuż po wejściu. Kolejny widok z parallaxem
  w hero potrzebuje tego samego (e2e porównuje pozycję z CSS z tym, co
  wpisuje moduł).
- **Krycie gradientu hero jest z POMIARU kontrastu** (analiza §11.2):
  środkowy stop na telefonie mocniejszy niż w designie (eyebrow na
  niskich ekranach wypadał w jaśniejszej strefie). Zmiana krycia, koloru
  tekstu albo zdjęcia = ponowny pomiar, razem z linkami paska.
- Reveale: kroki (`li`, kaskada `--rvd`), nagłówek formularza,
  opakowanie formularza jako `soft` (sam fade — bez `transform` nad
  polami). Numery kroków to licznik CSS; drobny numer na telefonie ma
  odcień `--copper-text`.
- **Formularz „Zgłoś nieruchomość":** na wierzchu typ, transakcja, imię,
  para e-mail / telefon; lokalizacja, powierzchnia, cena i uwagi w bloku
  opcjonalnym (lokalizacja OPCJONALNA; pola „liczba pokoi" nie ma —
  zestaw pól deklaruje polityka prywatności). Sekcja `#formularz` ma
  `scroll-margin-top: var(--hdr-h)` — cel przycisku hero i powrotu po
  wysyłce bez JS; e2e mierzy położenie po kliknięciu także na WebKicie.
- „Wolisz przez telefon?" pod przyciskiem: slot `a[data-tel]`; bez JS
  całe zdanie znika (`:has(> a[hidden])`).

## Zapytanie o ofertę — stan po Etapie 5B / PR 1 (`docs/analiza-formularze-b.md`)

- **Formularz stoi w sekcji kontaktu detalu** (`[data-offer-inquiry]`,
  `id="formularz"` = cel powrotu po wysyłce bez JS): komponent
  `src/components/offers/OfferInquiry.astro` na wspólnej ramce
  `FormFrame` (`kind="oferta"`, `tone="dark"`, `labelledby` = `h2` sekcji
  — formularz nie ma własnego nagłówka). Uzbraja go skrypt detalu
  (`initForms(root)` w `offer-detail.ts`, od razu — do czasu uzbrojenia
  wysyłka poszłaby natywnym POST-em).
- **Z formularza wychodzi WYŁĄCZNIE numer oferty** (ukryte pole `offer`,
  kształt `OFFER_NUMBER_RE` — W PARZE z `OfferSchema.number`). Tytuł,
  lokalizację i adres do maila funkcja bierze sama z indeksu
  (`OFFERS_INDEX_PATH` przez binding `ASSETS`, dopiero po pułapce,
  walidacji, Turnstile i liczniku). Nie dokładaj pól „tytuł" / „adres"
  do formularza — wartości z klienta nie są zaufane. Numer spoza indeksu
  albo nieczytelny indeks NIE odrzuca zgłoszenia: mail wychodzi
  z dopiskiem `OFFER_NOT_IN_INDEX` zamiast tytułu i linku.
- **Błąd pola bez opakowania** (ukryty numer — z walidacji klienckiej
  albo z odpowiedzi 400) kończy się komunikatem błędu wysyłki:
  `setErrors()` zwraca, czy cokolwiek się zapaliło. Nowe pole ukryte =
  ten sam mechanizm, nie ciche „nic się nie stało".
- **Wariant ciemny ramki** (`fm-frame--dark` w `forms.css`): pola białe
  bez obrysu, teksty jasne, błąd w `--error-light`, linki i fokus
  w `--copper-light` / bieli. **Krycia tekstu są z POMIARU kontrastu**
  nad zdjęciem tła sekcji (axe zwraca „incomplete") — zmiana krycia,
  gradientu sekcji albo zdjęcia tła = ponowny pomiar (analiza §10).
- **Przycisk wysyłki na detalu ma wygląd z `offer-detail.css`**
  (`.od-inquiry .sx-btn.fm-send`): arkusz stron treściowych (`content.css`,
  klasa `sx-btn`) nie jest ładowany na trasie ofert — bez tej reguły
  przycisk jest gołym tekstem.
- **Dosuwanie pod DWA paski:** ramka niesie `under="[data-offer-anchors]"`
  (`data-form-under`) — `revealUnderBar` dolicza wysokość paska kotwic do
  wysokości nagłówka. Formularz pod innym elementem sticky = ten sam prop.
- **Pasek dolny (telefon, tablet) znika na czas fokusu w formularzu**
  (`.od:has(.od-inquiry:focus-within) .od-bar-host`) — stoi dokładnie
  tam, gdzie się pisze. „Napisz" paska i lightboxa dalej celuje
  w `#kontakt`.
- **Kolejność w DOM sekcji:** kolumna agenta → formularz → link powrotu;
  od 1025 px siatka stawia link pod lewą kolumną (formularz zajmuje oba
  wiersze prawej). Zrzut ELEMENTU sekcji chowa pasek, kotwice i pasek
  dolny.
- **Listy i detale ofert to DWIE trasy** (od domknięcia Etapów 4 i 5):
  `src/pages/oferty/[...path].astro` (listy) i
  `src/pages/oferty/[kind]/[location]/[number].astro` (detale). Astro
  linkuje arkusze per PLIK trasy, nie per gałąź renderowania — wspólny
  plik ładował style detalu i formularza także na listach. Nie łącz ich
  z powrotem i nie importuj `offer-detail.css` ani komponentów formularzy
  do drzewa listy; nowy widok ofert = własny plik trasy. Zmiana
  `forms.css` dotyczy teraz detali (i stron z formularzami), nie list.

## Praca — stan po Etapie 5B / PR 2 (`docs/analiza-formularze-b.md` §11)

- `src/pages/praca.astro` + `sections/jobs/`: `JobsHero` (zdjęcie +
  eyebrow + `h1` dwukolorowy), `JobsForm`, `JobsClosed` (stan wyłączony);
  teksty w `jobs-copy.ts` i `PRACA_FORM_COPY` (`forms-copy.ts`) — całość
  PLACEHOLDER (U9); stałe w `jobs-config.ts`. Widok NIE ma ruchu (bez
  bramki `js-motion`), pasek w wariancie stałym. Skrypt strony:
  `initForms(document, checkCv)` + `initFileFields()`.
- **Hero:** telefon i tablet — zdjęcie od górnej krawędzi okna, POD
  szklanym paskiem, tekst pod zdjęciem; desktop — zdjęcie w kolumnie
  strony pod paskiem, biała karta z nagłówkiem nasunięta na jego dół.
  Zdjęcie `eager` + `fetchpriority` + dwa `preload` z `media` na stronie
  (mniejszy plik poniżej 768 px — `JOBS_HERO_SMALL_BELOW_PX`).
  **Pas zdjęcia pod paskiem jest rozjaśniony** (`.jh::before`, kolor
  `--bg`, krycie z POMIARU): logo i przycisk menu są granatowe, a bez
  rozjaśnienia ich kontrast nad zdjęciem spadał na tablecie poniżej 3:1.
  Zmiana krycia, zdjęcia albo kadru = ponowny pomiar (axe tego nie liczy).
- **`SHOW_PRACA = false`** (`site-config.ts`) znaczy cztery rzeczy naraz:
  pozycja znika z menu i stopki (`nav.ts`), strona wypada z sitemapy
  (`isSitemapPath` w `routes.ts` — filtr w `astro.config.mjs`), dostaje
  `noindex` i `JobsClosed` zamiast formularza, a funkcja odrzuca
  `form=praca` (`isActiveFormKind`). Adres zostaje. Stan wyłączony
  pilnuje unit `site-flags`; e2e biegają na przełączniku włączonym —
  przestawienie go wymaga przeglądu `seo.spec`, `navigation.spec`
  i `a11y.spec` (lista tras statycznych) oraz baseline'ów chrome'u.
- **Limit CV to JEDNA stała `CV_MAX_BYTES` w `src/lib/cv-file.ts`** —
  dopisek w strefie, komunikat, kontrola w przeglądarce i progi funkcji
  liczą się z niej (`cvLimitLabel()`, `CV_REQUEST_MAX_BYTES`). Nie wpisuj
  wartości limitu w teksty ani testy; zmiana stałej = regeneracja zrzutów
  `praca-*` (dopisek jest na obrazie).
- **Reguły pliku żyją w `cv-file.ts`, poza bundlem pozostałych
  formularzy:** `validateForm(kind, raw, checkCv)` dostaje kontrolę pliku
  jako PARAMETR — przekazują ją strona `/praca/` (`initForms(document,
checkCv)`) i funkcja. Ta sama reguła po obu stronach; bez niej
  zgłoszenie do pracy kończy się błędem `cv`. `cv-file.ts` bierze
  z `contact-form.ts` wyłącznie typy (import wartości w tę stronę robi
  cykl — stała liczona z drugiego modułu wychodziła `NaN`). Teksty
  i atrybuty liczone ze stałych to FUNKCJE (`cvAccept()`,
  `cvTypesLabel()`, `cvLimitLabel()`), nie wyrażenia na poziomie modułu.
- **Opis pliku w surowych polach:** `cv:name`, `cv:size` (obie strony —
  `readRaw()` w `form-ui.ts` buduje je dla każdego pola plikowego)
  i `cv:sig` (tylko funkcja: sygnatura z pierwszych bajtów). Funkcja
  KASUJE pola tekstowe o tych nazwach i składa opis sama — dosłane przez
  klienta nie zastępują pliku. Trzy błędy: `cv` (brak pliku), `cv-type`
  (rozszerzenie spoza listy, plik pusty, sygnatura niezgodna
  z rozszerzeniem), `cv-size` (ponad limit; także odpowiedź 413).
- **Pole pliku (`FormFile.astro`):** natywny `input type="file"` leży NA
  CAŁEJ strefie (przezroczysty) — jedna etykieta `<label>`, dopisek typów
  i limitu jako opis (`aria-describedby`), napisy dublujące kontrolkę
  ukryte przed czytnikami; klik, dotyk i upuszczenie pliku działają bez
  JS. Trzy komunikaty jako ZAGNIEŻDŻONE opakowania `data-f` (`cv` ⊃
  `cv-type` ⊃ `cv-size`) — mechanika `.err` z `form-ui.ts` bez zmian,
  `change` gasi wszystkie trzy. Style pola siedzą w komponencie (scoped),
  nie w `forms.css` — wspólny arkusz ładuje się też na trasach ofert.
- **`form-file.ts`** (tylko `/praca/`): nazwa i rozmiar w strefie,
  podświetlenie przy przeciąganiu, upuszczenie (pierwszy plik →
  `input.files` → `change`), powrót do stanu wyjściowego po `reset`
  (zdarzenie `reset` odpala się PRZED wyczyszczeniem pól — odczyt
  w `setTimeout`). Niczego nie waliduje i nie niesie tekstów.
- **Ramka (`FormFrame`):** `consent={{ name, text }}` podmienia jedyny
  checkbox (tu: `future` — zgoda na przyszłe rekrutacje; zgody
  rekrutacyjnej `required` i marketingowej NIE MA), `contact="mail"`
  daje w komunikatach slot adresu biura (`FormMail.astro`) zamiast
  telefonu, `enctype`, a `doneUntimed` w tekstach — potwierdzenie bez
  deklaracji czasu odpowiedzi. **Zmiana ramki = porównanie HTML
  pozostałych formularzy odciskiem na `build:visual`** (wyrażenie
  w miejscu elementu gubiło spację — stąd `{" "}` po slocie).
- **Załącznik (`src/lib/mail-attachment.ts`):** base64 wyłącznie
  natywnie, wykrywane w czasie działania (`Uint8Array.prototype.toBase64`,
  potem globalny `Buffer`; brak obu → 503 `encoder` tylko dla `praca`);
  treść żądania = `JSON.stringify` wiadomości + DOKLEJONY fragment
  z załącznikiem. Plik czytany w całości dopiero po Turnstile i liczniku
  (wcześniej tylko `CV_SIGNATURE_BYTES`). Nazwa załącznika z
  `sanitizeCvName`, MIME z rozszerzenia. CV nie jest nigdzie zapisywane;
  logi bez nazwy pliku i danych kandydata.
- Desktop: imię | e-mail | telefon w jednym rzędzie (para zajmuje dwie
  kolumny i trzyma tę samą szczelinę — `--jf-gap`), treść (dwie kolumny)
  obok strefy pliku (ta sama wysokość); przycisk i „Wolisz mailem?"
  w jednym wierszu (siatka na `.fm-form` przez `:global()`).

## O nas — stan po Etapie 4.5 (`docs/analiza-o-nas.md`)

- `src/pages/o-nas.astro` + `sections/about/`: `AboutHero`,
  `AboutHistory`, `AboutFocus` (specjalizacja), `AboutContact`; teksty
  w `about-copy.ts` (całość PLACEHOLDER U9; nagłówek historii ma w
  designie DWA warianty — wstawiony desktopowy, wybór klientki), stałe
  w `about-config.ts`, wejście chunku ruchu `about-motion.ts`. Bez wyspy
  i bez formularza; skrypt strony: `armViewportPin` + dynamiczny
  `import()` ruchu przy `no-preference`.
- **Hero ma dwa układy na jednym markupie:** telefon i tablet — jasne tło,
  zdjęcie od górnej krawędzi okna (wysokość z SZEROKOŚCI okna, promień
  lewego dolnego rogu), szklana karta (eyebrow + `h1`) nasunięta na jego
  dół, akapit i pas liczb pod kartą (`margin-top: auto` — dosunięty do
  dołu hero o `min-height` = okno); desktop — pełne okno, zdjęcie +
  gradient, szkło na wspólnym opakowaniu karty i akapitu, pas liczb
  u dołu. Odstępy pionowe i rozmiar `h1` na desktopie ograniczone przez
  `svh` — na niskim oknie laptopa karta i pas liczb mieszczą się
  w pierwszym ekranie.
- **`data-nav-hero` stoi na kadrze zdjęcia (`.ah-media`), nie na
  sekcji:** poniżej 1025 px kadr ma wysokość zdjęcia, od 1025 px wypełnia
  sekcję (`inset: 0`). Pasek jest pełny, zanim wjedzie pod niego jasna
  część hero. Zmiana układu hero = sprawdź, z czego pasek liczy próg
  (`navigation.spec`, trasa `/o-nas/`).
- **Krycia są z POMIARU kontrastu** (analiza §10.2; axe zwraca
  „incomplete"): szkło karty na telefonie to kolor `--bg` z kryciem .8
  (srebro .39 z designu dawało eyebrow 2,3:1, a srebro o wyższym kryciu
  — miedzianej frazie poniżej 3:1); górny pas ZDJĘCIA na telefonie ma
  własne przyciemnienie pod paskiem (`.ah-shade` — jasne kreski menu nad
  jasnym fragmentem kadru; chrome nietknięty); górne stopy gradientów
  historii i kontaktu na telefonie oraz etykiety listy kontaktu mocniejsze
  niż w designie. Zmiana krycia, koloru tekstu albo zdjęcia = ponowny
  pomiar (telefon, tablet i desktop; Chromium i WebKit).
- Zdjęcie hero: `<picture>` z plikiem `-m` poniżej 768 px (pole na
  telefonie nie jest pionowe — bez kadru `-tall`), dwa `preload`
  z `media` na stronie, `eager`, `fetchpriority`, żadnego reveala,
  parallax `data-px="top"`. Na telefonie zdjęcie JEST kandydatem LCP (nie
  wypełnia okna); na desktopie elementem LCP jest `h1`.
- Historia: DOM w kolejności telefonu (Joanna → dokumenty); desktop
  przestawia kolumny przez `order` (zdjęcia nie są interaktywne). Blok
  tekstu ma JEDEN reveal (od 1025 px to szklana karta). Zdjęcie Joanny
  `data-px="-1"`.
- Specjalizacja: jedna treść na obu progach (akapit, dopisek, lista);
  zdjęcie „dokumentacja" tylko poniżej 1025 px (`display: none` + `lazy`
  — desktop go nie pobiera; moduł parallaxu pomija kadr o wysokości 0,
  sondy e2e filtrują takie kadry). Od 1025 px zdjęcie „umowa" wypełnia
  wysokość sekcji i dochodzi do lewej krawędzi okna. **`align-items`
  z siatki działa też we flexie** — kontener przełączany z `grid` na
  `flex` musi zresetować `align-items: start`, inaczej kadr bez własnej
  wysokości ma 0 px.
- Kontakt: lista danych (e-mail, telefon, biuro) tylko od 1025 px, sloty
  `a[data-mail="biuro"]`, `a[data-tel]` z `<span data-slot>`; bez JS
  wiersz slotu znika (`.ac-row:has(> a[hidden])`). Brąz sekcji to
  wartości lokalne komponentu (występuje tylko nad tym zdjęciem).

## Usługi — stan po Etapie 4.6 (`docs/analiza-uslugi.md`)

- `src/pages/uslugi.astro` + `sections/services/`: `ServicesHero`,
  `ServicesSell` (Sprzedaję), `ServicesBuy` (Kupuję), `ServicesLegal`
  (Pomoc prawna), wspólne `ServicesList` (lista numerowana) i
  `ServicesCta` (pas CTA sekcji 02 i 03); teksty w `services-copy.ts`
  (całość PLACEHOLDER U9; trzecie wejście hero i przycisk telefonu mają
  w designie DWA warianty — wstawione desktopowe), stałe
  w `services-config.ts` (w tym `SERVICES_ANCHORS`), wejście chunku ruchu
  `services-motion.ts`. Bez wyspy i bez formularza.
- **Kotwice `#sprzedaje`, `#kupuje`, `#pomoc-prawna`** (id na sekcjach,
  bez sufiksów gałęzi eksportu): cele trzech wejść hero i kafli sekcji
  „Usługi" strony głównej. Poniżej 1025 px sekcja staje POD paskiem
  (`scroll-margin-top: var(--hdr-h)`), od 1025 px przy górnej krawędzi
  okna — jej dopełnienie górne zawiera wysokość paska (design),
  `scroll-margin-top: 0`. Zmiana dopełnienia sekcji na desktopie = zmiana
  położenia po skoku (e2e mierzy oba warianty). Bez płynnego
  przewijania (`scroll-behavior`).
- **Wejście z kotwicą w adresie poprawia skrypt strony:** po `load`
  i po wczytaniu fontów cel jest ustawiany ponownie natywnym `scrollTo`
  (silniki bez kotwiczenia przewijania zostawiają sekcję przesuniętą,
  gdy układ zmienia się po skoku) — tylko przy zwykłym wejściu
  (`navigation.type === "navigate"`; przy odświeżeniu i „wstecz" pozycję
  przywraca przeglądarka) i tylko dopóki użytkownik sam nie przewinął.
  Kliknięcia wejść hero zostają natywne. Wysokość dokumentu nie zależy
  od wczytania obrazów: każdy kadr ma `aspect-ratio`, tła są absolutne —
  nowe zdjęcie bez zarezerwowanego miejsca nad sekcją psułoby skok.
- **Hero ma dwa układy na jednym markupie:** telefon i tablet — blok
  tekstu na jednolitym granacie, pod nim „scena" (`.uh-stage`) ze
  zdjęciem wypełniająca resztę okna i trzema wejściami u dołu; desktop —
  scena jest statyczna, kadr zdjęcia (`.uh-media`, absolutny) wypełnia
  całą sekcję, tekst stoi na szklanej karcie, wejścia tworzą pas u dołu.
  Trzecie wejście poniżej 1025 px to lżejszy, podkreślony link z samym
  tytułem (nadtytuł i strzałka ukryte). `data-nav-hero` na sekcji.
- Zdjęcie hero: źródło ma tylko 617 px wysokości. Poniżej 768 px
  `uslugi-hero-tall.webp` — wycinek o PEŁNEJ wysokości źródła (pole na
  telefonie jest pionowe; plik `-m` miał 439 px wysokości i nie jest już
  używany), od 768 px pełny plik; dwa `preload` z `media`, `eager`,
  `fetchpriority`, żadnego reveala, parallax `data-px="top"`. Na
  telefonie zdjęcie JEST kandydatem LCP (nie wypełnia okna).
- **Krycia są z POMIARU kontrastu** (analiza §10.2; axe zwraca
  „incomplete"): kafle wejść na telefonie mają jaśniejsze szkło niż
  w designie ORAZ własne przyciemnienie zdjęcia zakotwiczone do wejść
  (`.uh-entries::before` — nie do procentu pola: na niskim ekranie
  wejścia zajmują większość pola zdjęcia); karta hero na desktopie —
  granat mocniejszy niż w designie; **pas wejść na desktopie to CIEMNE
  szkło** (design: jasne srebro nad zdjęciem bez gradientu — nadtytuł
  1,3:1); górny pas zdjęcia pod paskiem przyciemniony w komponencie hero
  (jasne logo nad jasnym fragmentem kadru); szkło przycisków pasów CTA
  słabsze niż w designie, prawy koniec gradientu pasa „Sprzedaję"
  mocniejszy; blok zamykający „Pomocy prawnej" na telefonie ma
  przyciemnienie zakotwiczone do TREŚCI. Zmiana krycia, koloru tekstu
  albo zdjęcia = ponowny pomiar (telefon, tablet, desktop; Chromium
  i WebKit).
- **Pas CTA (`ServicesCta`) jest ostatnim dzieckiem sekcji:** poniżej
  1025 px stoi w kolumnie treści (marginesy boczne = dopełnienie sekcji),
  od 1025 px wychodzi na całą szerokość okna. Przyciski są częścią
  komponentu (propy `primary` / `secondary`, nie slot — style scoped nie
  sięgają treści slotu). Przycisk telefonu: slot
  `a[data-tel][data-fill="href"]` — etykieta stała, bez JS → `/kontakt/`.
- **Zdjęcia zmieniające rodzica między progami występują dwa razy**
  (`[data-services-extra="below" | "desktop"]`, `display: none` + `lazy`
  — ukryty wariant nie jest pobierany): „prezentacja 1" (kadr od 1025 px,
  tło pasa CTA poniżej), „prawne 3" (tło sekcji od 1025 px, tło bloku
  zamykającego poniżej); „prawne 2" tylko poniżej progu. Sondy e2e
  filtrują kadry o wysokości 0.
- „Pomoc prawna": DOM w układzie desktopu (kolumna z nagłówkiem,
  akapitem i listą · kolumna ze zdjęciem i blokiem zamykającym); poniżej
  1025 px kolumny są `display: contents`, a zdjęcia wchodzą między akapit
  i listę przez `order` (jedyny element interaktywny jest ostatni w DOM
  i na ekranie). Blok zamykający: telefon — zdjęcie tła i szklany
  przycisk, desktop — szklana karta i przycisk miedziany.
- `ServicesList`: jeden układ poniżej 1025 px, trzy od progu (`rows`,
  `wide` — numer · tytuł · opis na linii bazowej przez
  `display: contents`, `cols`); numery to licznik CSS; lista jest JEDNYM blokiem
  reveala (`data-rv` na `<ol>`).

## Polityka prywatności — stan po Etapie 4.7 (`docs/analiza-polityka.md`)

- `src/pages/polityka-prywatnosci.astro` + `sections/policy/`: `PolicyHead`
  (eyebrow, `h1`, wstęp, informacja o projekcie, pasmo dokumentu),
  `PolicyToc` (spis treści), `PolicyBody` (dwanaście sekcji — treść jako
  markup), `PolicySection` (`section[id]` + `h2` z `aria-labelledby`),
  `PolicyContact` (pas „Pytania o dane"), `PolicySlot` (slot e-maila /
  telefonu w zdaniu), `PolicyTodo` (znacznik niewiadomej), `policy.css`
  (klasy globalne `pp-*`; treść sekcji przychodzi slotem, więc style
  scoped by jej nie sięgały), `policy-config.ts`. Design NIE ma tego
  widoku — układ wg wzorca z bazy wiedzy, wygląd z tokenów. Pasek stały,
  bez ruchu, bez `content.css`.
- **Sekcje i kotwice z jednego źródła:** `POLICY_SECTIONS` (`id` + tytuł)
  karmi spis treści, nagłówki `h2` i testy. Kotwice są ZNACZĄCE
  (`#administrator`, `#okresy`, `#sprzeciw` …), bez numerów — prawnik może
  dopisać albo przestawić sekcję bez zmiany adresów. Numer sekcji i pozycji
  spisu to licznik CSS (dekoracja). Nowa sekcja = wpis w `POLICY_SECTIONS`
  oraz `<PolicySection id="…">` w `PolicyBody`, w tej samej kolejności
  (unit porównuje).
- **Treść musi zgadzać się ze stanem strony** — to, co da się czytać ze
  źródeł, jest z nich czytane: dane firmy z `BUSINESS`, brzmienia zgód
  z `contact-form.ts` (`MARKETING_CONSENT`, `FUTURE_RECRUITMENT_CONSENT`),
  zdania o formularzu „Praca" za `SHOW_PRACA`. Reszta to deklaracje, które
  trzeba PRZEJRZEĆ przy każdej zmianie: pól albo zgód formularzy, dostawców
  (hosting, wysyłka, ochrona przed spamem, statystyka), osadzeń (film,
  spacer, mapy), wszystkiego, co strona zapisuje w przeglądarce.
- **Strona niczego nie zapisuje w urządzeniu odwiedzającego** (cookies,
  `localStorage`, `sessionStorage`) — tak deklaruje sekcja „Pliki cookies…"
  i pilnuje tego e2e. Przejście wewnętrzne (mikro-fade w `BaseLayout`)
  rozpoznajemy po `document.referrer`, nie po fladze w pamięci sesji.
  Nowy zapis w przeglądarce = zmiana polityki ORAZ pytanie o podstawę
  (Prawo komunikacji elektronicznej, przechowywanie informacji
  w urządzeniu końcowym) — nie dodawaj go „przy okazji".
- **Projekt dokumentu (`POLICY_DRAFT`):** niewiadome stoją w tekście jako
  `<PolicyTodo>` („[do uzupełnienia: …]" / „[do potwierdzenia…]"), nad
  pasmem dokumentu jest informacja o projekcie. Wyłączenie stałej wymaga
  zera znaczników i ustawionej daty obowiązywania (`POLICY_EFFECTIVE`) —
  pilnują unit i e2e. Daty dokumentu to STAŁE (`POLICY_UPDATED`,
  `POLICY_EFFECTIVE`), nigdy „teraz" builda; zmiana treści = ręczna zmiana
  `POLICY_UPDATED` i `POLICY_VERSION`.
- **Dane administratora:** nazwa rejestrowa, siedziba, NIP, REGON i biuro
  stoją w statycznym HTML (dokument identyfikuje administratora bez JS);
  telefon i e-mail WYŁĄCZNIE przez sloty (`PolicySlot` — kotwica bez
  białych znaków w środku). Wiersz z ukrytym slotem znika
  (`.pp-row:has(a[hidden])`), `<noscript>` kieruje na adres listowny.
- **Spis treści:** czyste kotwice, bez podświetlania bieżącej sekcji (zero
  skryptu). Poniżej 1025 px karta nad treścią, od 1025 px
  `position: sticky` w lewej kolumnie siatki z `align-items: start`
  (`top` = pasek + `--pp-toc-top`), `max-height` z `svh` i własne
  przewijanie na niskim oknie. Żaden przodek nie może dostać `overflow`
  innego niż `visible` (e2e sprawdza cały łańcuch).
- **Kotwice:** `scroll-margin-top: var(--hdr-h) + --pp-gap` na sekcjach
  (16 px poniżej progu, 24 px od progu). Wejście z kotwicą w adresie
  poprawia wspólny `sections/content-anchor.ts` (`armAnchorAlign(selektor)`
  — logika z `/uslugi/`: po `load` i po fontach, tylko zwykłe wejście,
  tylko dopóki użytkownik nie przewinął). Bez `scroll-behavior`.
- **Prawo sprzeciwu** to osobna sekcja z własną pozycją w spisie,
  wizualnie wyłamana (granat, miedziana kreska) — przepis wymaga
  przedstawienia go odrębnie od pozostałych informacji; nie przenoś go do
  listy praw.
- Preflight Tailwinda zeruje `list-style` — listy w tekście dostają
  znaczniki z powrotem regułą `.pp-list`.
- **Druk** (`@media print` na końcu `policy.css`): bez paska, stopki
  i spisu; ramka sprzeciwu z obrysem i ciemnym tekstem (tła nie są
  drukowane); informacja o projekcie ZOSTAJE na wydruku.
