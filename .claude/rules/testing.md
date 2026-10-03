# Testy — kontrakt projektu

Harness odziedziczony z szablonu projektu (konfiguracja
Playwright/Vitest/axe/LHCI, 6 profili, helpery); liczby szablonu NIE
obowiązują — baseline'y i budżety powstają od nowa w Etapie 3.

STAN po Etapie 4.3 (a) (detal oferty): unit — `offers-details-rows`
(19 wierszy designu + parytet domu + „Dostępne od"; parter, winda
brak/0/2, czynsz 0, „Zapytaj o cenę", `showPrice=false`, obniżka +
Omnibus, dom/działka, podtyp, fixture bez pustych wartości),
`offers-detail-meta` (tytuł, `cutAtSentence`, tekst bez HTML, fallback,
fixture ≤ 160), `jsonld` (+ `realEstateListing`: bez kontaktu/`geo`,
adres do ulicy, cena pominięta przy `null`, `floorSize`, `image`),
`offers-format` (+ `formatDateShort`, `countNoun`). E2E `oferta`
(treść na `chromium-1920`; gesty i pasek dolny na `chromium-pixel-5`
i `webkit-iphone-14`; dane produkcyjne, `pickOffer` + `test.skip`,
`useMediaStub`, mapy przez `readMapsTyped()`): nagłówek (tytuł,
kicker, lokalizacja → `listPath`, cena, kontrakty szkieletu), plakietki
statusu, „Zapytaj o cenę", obniżka, galeria (wszystkie zdjęcia `hero`,
`eager`/`lazy`, `width/height/alt`, licznik, ‹ ›, klawiatura, miniatura
→ snap; pion `contain` + `.od-blur`), rzuty, kotwice (zestaw warunkowy,
klik pod paski, `aria-current`), tabela = `detailRows()`, parter/winda,
opis (bez `<script>`, surowy HTML bez `data-collapsed`, „Czytaj więcej"
rozwija), film i spacer (0 `iframe` przed kliknięciem, link w `href`,
po kliknięciu DOKŁADNIE jeden `iframe` bez `microphone`; host osadzenia
zaślepiony `page.route`, nasłuch hostów), mapa (adres R2, wymiary,
naturalne proporcje, link do map, brak przycisku interaktywnego),
kontakt (surowy HTML bez kontaktów po wycięciu `.od-desc`, sloty po JS,
`[data-offer-inquiry]` puste, powrót do listy), panel (sticky, slot,
flip 1025: panel none/flex, pasek grid/none, kafle none/grid), meta
(schowek przez `grantPermissions`, „Dodano", sharery z absolutnym
adresem, `navigator.share` ↔ ikony), `window.print`, head (description,
canonical, `og:image` 1200×630, JSON-LD jeden węzeł bez kontaktu),
okruszki, zero podmiotów trzecich; mobile: nagłówek w obrębie hero,
pasek dolny przy dolnej krawędzi i znika na stopce, snap o jeden kadr.
Visual `oferta` (fixture): `oferta-mieszkanie` (SW486462), `oferta-dom`
(SW349452), `oferta-dzialka` (SW184702), `oferta-lokal` (SW372150) —
4 fullPage × 6 profili = 24 PNG na platformę; `chrome`, `oferty`
i `not-found` bez ruchu. LHCI mierzy dodatkowo 4 adresy detali
z fixture'u. `a11y` i `seo` na pierwszym detalu z `data/` — bez zmian
speców (allowlista PUSTA).

STAN po Etapie 4.2 (c) (mobile, sheety, siatka/lista, stany brzegowe):
e2e `oferty-mobile` (profile `chromium-pixel-5` i `webkit-iphone-14`,
tablet przez `setViewportSize(900)`; dane produkcyjne, oczekiwania
`runSearch` na `/oferty/index.json`): pasek narzędzi `[data-offers-mtools]`
widoczny < 1025, `[data-offers-panel]` NIEOBECNY, `nav.ol-nav` w DOM
i ukryta, powłok sheetów brak do pierwszego otwarcia; „Filtruj"
`[data-offers-filters]` → `#ol-sheet-filters` (`role=dialog`, `h2`,
`.op--sheet`, dokładnie jeden `[data-offers-panel]`), zamknięcie X
(`[data-overlay-close]`), Esc, scrim (`click` 10×10), swipe-down myszą za
`[data-overlay-drag]` (po `SHEET_IN_MS` = 600 ms wjazdu); blokada
scrolla (`body{position:fixed; top:-60px}` → powrót `scrollY`; strona
przewinięta tylko o 60 px, żeby klik w „Filtruj" nie przewijał); focus-trap
(Tab ×6 w dialogu; **skip na WebKit** — Tab pomija przyciski); „Pokaż"
z sheetu = `applyFilters` + adres + lista + sheet zamknięty, draft wspólny
po ponownym otwarciu, „Wyczyść" zostawia sheet (R30); „Więcej filtrów"
z podpowiedzią `PANEL.moreHint`, akcje tylko w `.ols-foot`; sheet
sortowania `[data-sort-option]` + `[data-offers-sort-apply]` (adres,
`[data-sort-current]`, `sortEntries`) vs Esc porzuca; `setViewportSize(1025)`
domyka sheet, zdejmuje `position:fixed`, przywraca `.op:not(.op--sheet)`;
flip 1025 (`expectBreakpointFlip` z `ABSENT`: mtools grid/none, `.op`
absent/block, `.ol-dtools` none/flex, `.ol-sort` none/block); tablet
900 px (`.oc-link` row + sheet); pigułki statusu i paginacja (skip ≤ 12);
surowy HTML (`data-offers-mtools`, `<noscript>` z `.ol-mtools` i `.ol-nav`,
bez `ol-sheet-*`); zero żądań trzecich po interakcjach; axe bez sheetu
oraz `.include(#ol-sheet-…)` po wjeździe. `oferty-wyspa` (1920): +
przełącznik siatka/lista (`[data-view-set]`, `data-view` na siatce,
kolumny 3 ↔ 1, `.oc-link` column ↔ row, adres nietknięty), stany
brzegowe (`?typ=zamek` / `?transakcja=darowizna` → `[data-offers-invalid]`
z linkiem `/oferty/`; `?strona=-1|abc|0` → strona 1; `page.route` abort
`index.json` → na liście rodzaju „Wszystkie" typy → `[data-offers-apply]`
= „Pokaż" bez liczby → błąd `[data-offers-error]` → `unroute` + `Ponów`
→ lista; abort `index-text.json` przy `?opis=` → błąd, ponowienie
z bramkowaną odpowiedzią → `#op-opis[aria-busy]` + `#op-opis-hint`
→ lista); kolejność DOM bez panelu na 390 px; flip progu z paskiem
narzędzi. `oferty.spec`: nawigacja (a) `toBeAttached` + `toBeHidden` po
obu stronach progu, `class="ol-nav"` i reguła `.ol-nav` w `<noscript>`
surowego HTML. Visual `oferty` (+4): `oferty-tools-mobile` (element
`.ol-tools`, tylko < 1025), `oferty-sheet-filtry` i `oferty-sheet-sortuj`
(zrzut strony z otwartym sheetem po `settle(300)`, tylko < 1025),
`oferty-list-view-list` (fullPage po `[data-view-set="list"]`, tylko
≥ 1025) = 42 PNG na platformę (48 po przebudowie fixture'u);
`oferty-list`, `oferty-list-location`, `oferty-list-filtered`,
`oferty-zero` rozjechały się na WSZYSTKICH profilach (pasek narzędzi /
przełącznik widoku) — regeneracja w PR (c).

STAN po Etapie 4.2 (b) (wyspa wyszukiwarki): unit — `offers-filters`
(+ `locationSlug` dokładny vs `?lokalizacja=` prefiks, pusty `status=`
przeżywa serializację, `targetPath`: liść z listą → ścieżka slugu,
miejscowość z dzielnicami → parametr, slug bez listy nowego rodzaju → id
węzła), `offers-format` (+ `formatShowCount` biernik),
`offers-locations-ui` (podpowiedzi: prefiks słowa, diakrytyki, poziomy
miejscowość/dzielnica/poddzielnica, `info`, liść, ulice pod węzłem; fixture
ze skipem); e2e `oferty-wyspa` (chromium-1920, dane produkcyjne,
oczekiwania = `runSearch` na pobranym `/oferty/index.json` +
`index-text.json`): hydratacja bez przerenderowania (MutationObserver
uzbrajany po `readyState === "interactive"` → zero mutacji w
`[data-offers-grid]`) i CLS < 0,05; 23 kombinacje parametrów adresu =
`runSearch` (widoczne karty `li:not([hidden])`, `[data-offers-count]`,
liczniki `[data-status-group] small`); lista SSG z lokalizacją po
hydratacji = zbiór SSG + chip; panel: pigułka typu → licznik
`[data-offers-apply]` = `formatShowCount` → „Pokaż" → `?typ=`; segment
transakcji → ścieżka SSG; autocomplete (`#op-loc`, `role=option`) → chip
`[data-offers-chips]` → adres z `targetPath`; cena + Enter → parametr;
odświeżenie odtwarza kontrolki; wstecz/dalej; „Wyczyść" → `/oferty/`;
„Więcej filtrów" (`[data-offers-more]`, `#op-more`): pokoje, winda,
zależność pól od typu (działka: brak `#op-pok-l`/`#op-winda-l`), ulica
`#op-ulica` disabled bez lokalizacji; pigułki statusu → `?status=`,
wszystkie wyłączone → `[data-offers-zero]`; sortowanie: 4 klucze =
`sortEntries`, listbox `.ol-sort-btn` + `[role=option]` z klawiatury
(Enter, ↓, Enter, Esc, fokus wraca); paginacja (skip ≤ 12)
`[data-offers-pagination]`: 12 widocznych, `li[hidden]`, `?strona=2`,
`aria-disabled`, poza zakresem `[data-offers-page-empty]`; zero wyników
(`ZERO_RESULTS`); surowy HTML (`data-offers-panel`, `<li hidden` od 13.,
`<noscript><style>`, `client="load"`); próg 1025 `.ol-nav` ↔ `.op` +
`.ol-sort` (`expectBreakpointFlip`); zero żądań do podmiotów trzecich po
interakcjach; axe z rozwiniętym panelem, podpowiedziami i listboxem.
`oferty.spec` zaadaptowany (nawigacja (a) w DOM, widoczna < 1025;
plakietki kart spoza pierwszej strony `toHaveCount`, nie `toBeVisible`).
Visual `oferty` (+4 zrzuty, 1 warunkowy): `oferty-panel` i
`oferty-panel-more` (element `[data-offers-panel]`, tylko profile ≥ 1025 —
mobile `test.skip`), `oferty-list-filtered` (fullPage `?cena-od=500000`),
`oferty-zero` (fullPage `?numer=SW000000`), `oferty-pagination` (fullPage
`?strona=2`, skip dopóki fixture ≤ 12 ofert) = 36 PNG na platformę
(42 po przebudowie fixture'u). Wyspa hydratuje się `client:load` na
markupie SSR — w testach wizualnych skeleton NIE występuje (stan z propsów).
**Uwaga do hydratacji w JSX:** dwa sąsiednie teksty (`{a} <b>`) parser
HTML scala w jeden węzeł, a Preact rozdziela → mutacje DOM; w kartach
i wyspie teksty z odstępem pisz jednym wyrażeniem (`{`${a} `}`).

STAN po Etapie 4.2 (a) (lista ofert): unit — `offers-filters` (tabela
filtr → pole → reguła z `docs/analiza-oferty.md` §4 na danych
syntetycznych + liczniki na fixture), `offers-index` (klucze wpisu ⊆
`INDEX_FIELDS`, brak pól zabronionych i opisu, `index-text` bez HTML),
`offers-location-path` (równoważność kopii reguły ścieżki slugów
z `scripts/sync/locations.ts` na synt./fixture/`data/` + każdy id
w `locations.json`, liczniki węzłów = poddrzewo), `offers-format`
(+ liczba mnoga, rok); e2e `oferty` (chromium-1920; dane produkcyjne,
`pickOffer` + skip: `/oferty/` 200 + h1 „Oferty” + licznik
`[data-offers-count]` + karty = oferty z `data/` w kolejności `addedAt`
malejąco; karta: link `offerPath`, `img.oc-img` z `width/height/alt`,
cena `formatPrice`, `.oc-num`, `.oc-pill` z liczbą zdjęć; „parter”;
plakietki `.oc-badge[data-badge]` Sprzedane/Wynajęte/Rezerwacja; tag
„0%”; „Zapytaj o cenę” bez `.oc-ppm`; „Nowość” ⇔ `isNewOffer` względem
`[data-offers-list][data-build-now]`; pigułki `[data-status-group]`
sumują się do liczby ofert; nawigacja `nav.ol-nav` (1 + liczba rodzajów
linków, każdy < 400, jedna `aria-current`); listy typ×transakcja
i z lokalizacją = DOKŁADNIE oferty kombinacji, h1 z `placeName`,
`[data-offers-locations]`; CTA `a[data-tel]` bez JS → `/kontakt/`, z JS
`tel:`; nasłuch sieci = własny host + `MEDIA_BASE`; kontrakt progów:
`.oc-link` `flex-direction` column/row/row/column przy 767/768/1024/1025
i 3 kolumny `[data-offers-grid]` przy 1366, zdjęcie 3:2 sub-pikselowo;
`/oferty/index.json` i `index-text.json`); visual `oferty` (fixture,
`useVisualFixtureGuard`): `oferty-list` (fullPage `/oferty/`, próg
0,001), `oferty-card` (element pierwszej karty
`/oferty/mieszkanie-na-sprzedaz/` — obniżka + Sprzedane),
`oferty-list-location` (fullPage `/oferty/mieszkanie-na-wynajem/poznan-piatkowo/`
— parter + Nowość) = 18 PNG na platformę. `offers-skeleton.spec`
zostaje (kontrakty prawdziwe). LHCI mierzy dodatkowo
`/oferty/mieszkanie-na-sprzedaz/`.

STAN po Etapie 4.1 (chrome): e2e `navigation` niesie kontrakty chrome'u
— selektory `header.hdr[data-nav]`, `.hdr-logo`, `.hdr-nav`, `.nav-link`
(z `.hn-ch`/`.hn-sp` liter), `.hdr-tel`, `.mbtn[data-burger]`,
`#nav-sheet`, `.m-link`, `.sheet-call`, `[data-overlay-drag]`; atrybuty
`data-scroll-nav`/`data-hero` (tylko „/"), `data-solid`, `data-open`;
wariant „/" (szkło 0 → stan pośredni → 1 po przewinięciu o `innerHeight`,
crossfade logo), zamknięcie sheetu przy `setViewportSize` na
`NAV_DESKTOP_MIN_PX`, efekt liter (nazwa dostępna z `aria-label`, podjazd
po hover, **punktowa emulacja `reducedMotion: "reduce"` z komentarzem** —
jedyny dozwolony wyjątek od zakazu niżej), stopka (wszystkie sloty
`data-tel`/`data-mail="biuro"`, komplet danych firmy z `BUSINESS`,
`footerNavItems`, przyciski bez JS → `/kontakt/` na surowym HTML);
visual `chrome`: `chrome-bar` (desktop, `/kontakt/`), `chrome-sheet`
(mobile), `chrome-home-top` i `chrome-home-solid` (pasek na „/" nad hero
i po przewinięciu o wysokość okna z dosztukowanym `main`), `chrome-footer`
(element `footer`, pasek fixed schowany na czas zrzutu — zszywany zrzut
elementu łapałby go na mobile). Zrzut elementu `[data-nav]` na „/" niesie
TREŚĆ pod przezroczystym paskiem — zmiana hero w 4.4 rozjedzie
`chrome-home-top` (zamierzone, regeneracja w tamtym PR).

STAN po Etapie 3: unit — `contact-details`, `contact-form`,
`fonts-subset`, `img` (warianty `card`/`hero`/`og`, tryby dev i fixture),
`jsonld`, `media-r2` (kształt adresów; klucze R2 z `data/` i fixture
przez `helpers/offers.ts` — skip, gdy danych nie ma; `CHECK_REMOTE_MEDIA=1`
→ HEAD na oryginały, tylko poza ścieżką PR) oraz kontrakt danych ofert:
`offers-allowlist`, `offers-schema`, `offers-status` (realne tytuły,
8/21/13/3), `offers-format`, `offers-urls`, `sync-normalize`,
`sync-sanitize`, `sync-locations`, `sync-ledger`, `sync-esti-client`
(atrapa fetch; słownik realny czytany SPOZA repo przez
`readDictionaryForTests`, fallback syntetyczny), `sync-visibility`,
`sync-photos` (JPEG-i generowane sharpem, atrapy fetch i R2), `sync-r2`
(atrapa `send()`), `sync-maps` (7 ofert = 1 żądanie), `sync-report`
(wyjście publiczne bez numerów i wartości kontrolnych), `redirects`,
`collect-legacy`, `sync-index` (orkiestracja w trybie plikowym, katalogi
tymczasowe, bezpieczniki, dry-run, CLI i `GITHUB_OUTPUT`),
`sync-fixtures` (`buildFixture()` do katalogu tymczasowego, nadpisania,
kopie WebP), `offers-data` (`data.ts`: brak katalogu, pusta tablica,
błędny rekord), `offers-time-rules`, `offers-contract` (data/ ORAZ
fixture, skip bez danych), `offers-helpers` (Etap 3: `matchesCriteria`
na danych syntetycznych, `0` = dana; pokrycie wariantów `selection.json`
przez `pickOffer` na fixture), `visual-fixture` (Etap 3: dist
z `build:visual` = fixture co do zbioru ofert, kart i lokalnych mediów;
skip bez `dist/media/`; w CI bramkuje w jobie `e2e` po `build:visual`) —
wszystkie na danych SYNTETYCZNYCH z `tests/fixtures/raw/` (helpery
`tests/helpers/raw.ts`, w tym `syntheticFullOffers()`); dist —
`tests/dist/dist.test.ts` (`pnpm test:dist`, osobny
`vitest.dist.config.ts`, wymaga `pnpm build`); e2e — `navigation`, `seo`
(sitemapa = trasy statyczne + trasy ofert z danych; canonical/og:url
i brak noindex pierwszej listy i detalu; crawl linków obejmuje pierwszą
listę), `a11y` (trasy statyczne + 404 + pierwsza lista i detal z `data/`,
allowlista PUSTA), `smoke` (@prod-smoke; nagłówek `x-robots-tag:
noindex` fazy podglądu — tylko z `BASE_URL`, odwracany w Etapie 8),
`not-found`, `offers-skeleton` (detal i lista pierwszej oferty z `data/`,
skip przy zerze ofert; `/{NUMER}` → 301 tylko z `BASE_URL`); visual —
`chrome` i `not-found` z baseline'ami darwin i linux (Etap 3: 18 PNG;
Etap 4.1: 36 PNG na platformę — 6 profili × 6 zrzutów). Fixture ofert: 10 ofert + `media/`
(`pnpm fixtures:build`, 2026-10-01), `data/` z pierwszego syncu
(2026-10-02, 46 ofert). Specy widoków powstają razem z widokami
(Etapy 4–5): widok dostaje WŁASNY spec e2e i visual.

**Helper ofert (`tests/helpers/offers.ts`)**: odczyt odporny
(`readOffers()`, `readFixtureOffers()` — surowe rekordy, pusta lista bez
pliku), odczyt typowany (`readOffersTyped(source)`,
`readFixtureOffersTyped()` — `Offer[]` po schemacie strict, buforowany),
selektory `pickOffer(criteria, source)`, `pickOffers()`,
`filterOffers()`, `matchesCriteria()` z kryteriami `status`, `mainType`,
`transaction`, `market`, `withVideo`, `withTour`, `withPlan`, `floor`
(`0` = parter), `withPreviousPrice`, `priceOnRequest`, `minPhotos`,
`where`; `describeCriteria()` do powodu skipa; adresy
`offerRoutesFromData()`, `offerRoutesFromFixture()`, `firstOfferPath()`.
Wzorzec speca: `const o = pickOffer({ withVideo: true });
test.skip(!o, "brak oferty z filmem w data/")`. Strażniki
(`tests/helpers/guards.ts`): `usePreviewGuard`, `useVisualFixtureGuard`
(zbiór numerów kart pierwszej listy = fixture + sonda lokalnej kopii
zdjęcia), `useMediaStub` (zaślepka `page.route` na `MEDIA_BASE` — każdy
spec otwierający trasy ofert), `useChromium1920Only`, `collectPageIssues`.

## Co zmieniasz → co uruchamiasz

| Zmiana                                                                                                                                                                                             | Warstwa (komenda)                                                                                                                                                                                                                                              |
| -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `scripts/sync/**`, `src/lib/offers/**` (allow-lista, schemat, parser)                                                                                                                              | `pnpm test:unit` (kontrakt danych)                                                                                                                                                                                                                             |
| `src/lib/img.ts`, `MEDIA_BASE`, `IMG_VARIANTS`                                                                                                                                                     | `pnpm test:unit` (`img`, `media-r2`)                                                                                                                                                                                                                           |
| `src/lib/offers/data.ts`, `redirects.ts`, integracje, `[...path].astro`                                                                                                                            | `pnpm test:unit && pnpm build && pnpm test:dist`                                                                                                                                                                                                               |
| `scripts/sync/pipeline.ts`, `index.ts`, `fixtures.ts`, `sync.yml`                                                                                                                                  | `pnpm test:unit` (`sync-index`, `sync-fixtures`); workflow NIE uruchamiać w sesji                                                                                                                                                                              |
| `src/i18n/**`, `src/lib/*.ts` (img, routes, contact-form, jsonld, …)                                                                                                                               | `pnpm test:unit`                                                                                                                                                                                                                                               |
| `scripts/subset-fonts.mjs`, `src/styles/fonts.css`                                                                                                                                                 | `pnpm test:unit` (kontrakt subsetów)                                                                                                                                                                                                                           |
| `src/scripts/**`, navbar, stopka, wyszukiwarka, galeria, formularze                                                                                                                                | `pnpm build && pnpm test:e2e`                                                                                                                                                                                                                                  |
| `src/lib/offers/{filters,index-entry,location-path,locations-ui,offers-ui,text,enums}.ts`, `src/components/offers/**` (w tym wyspa `SearchIsland.tsx`, sheety `sheets.tsx`), `src/pages/oferty/**` | `pnpm test:unit && pnpm build && pnpm test:dist && pnpm test:e2e` (+ warstwa wizualna przy zmianie wyglądu; po zmianie wyspy także pomiar budżetu — `docs/analiza-oferty.md` §12.5; sheety = profile mobilne `oferty-mobile`)                                  |
| `src/lib/offers/{details-rows,detail-meta}.ts`, `src/lib/jsonld.ts`, `src/components/offers/OfferDetailPage.astro`, `offer-detail.css`, `src/scripts/offer-detail.ts`                              | `pnpm test:unit && pnpm build && pnpm test:e2e tests/e2e/oferta.spec.ts tests/e2e/a11y.spec.ts tests/e2e/seo.spec.ts` (+ `build:visual && test:visual tests/visual/oferta.spec.ts` przy zmianie wyglądu; budżet `script` detalu — `docs/analiza-oferta.md` §5) |
| `tests/helpers/**`, `lighthouserc*.cjs`, `.github/workflows/*.yml`                                                                                                                                 | `pnpm test:unit` (helpery) + warstwa, której spec używa helpera; workflow NIE uruchamiać w sesji                                                                                                                                                               |
| Każda zmiana wyglądu                                                                                                                                                                               | `pnpm build:visual && pnpm test:visual`                                                                                                                                                                                                                        |
| Przed release                                                                                                                                                                                      | pełne `pnpm test` + `/release-check`                                                                                                                                                                                                                           |

## Zasady twarde

- Testy Playwright WYŁĄCZNIE na preview (webServer configu, port 4399 — na
  4321 często wisi dev do telefonu). Helper `assertPreview` wykrywa
  `/@vite/client` i przerywa — nie obchodź go.
- **Dwa buildy, dwa cele.** `pnpm build` (dane produkcyjne z `data/`) →
  `test:e2e`: testy funkcjonalne odporne na liczbę i skład ofert, w tym
  na ZERO ofert. `pnpm build:visual` (fixture,
  `OFFERS_DATA_DIR=./tests/fixtures/offers`) → `test:visual`.
- Testy wizualne stoją na **ZAMROŻONEJ treści ofert**
  (`tests/fixtures/offers`), bo baseline to obraz: oferta dodana, zdjęta
  albo zmieniona w CRM rozjeżdżałaby zrzuty listy, liczników i detalu —
  czyli blokowała WSZYSTKIE PR-y do czasu regeneracji baseline'ów.
  Strażnik `assertVisualFixture` porównuje `dist` z fixture i przerywa
  z instrukcją zamiast pixel-diffa. **Fixture jest niezależny od danych
  produkcyjnych** — buduje go WYŁĄCZNIE `pnpm fixtures:build`, nigdy
  ręcznie; zmiana fixture = ponowne uruchomienie skryptu + oba komplety
  baseline'ów w tym samym PR.
- **Testy wizualne i funkcjonalne nie wykonują żądań do sieci.** W trybie
  fixture obrazy ofert są lokalne; w `test:e2e` żądania do hosta mediów
  są przechwytywane (`page.route`) i zastępowane zaślepką. Test mediów
  zdalnych (`CHECK_REMOTE_MEDIA=1`) biega tylko poza ścieżką PR
  i w `/release-check` (zewnętrzna sieć = flaky).
- **`test:dist` to warstwa na ZBUDOWANYM `dist/`** (po `pnpm build`
  z danymi produkcyjnymi): bramka syncu PRZED commitem bota i job
  `quality`. Skan nazw z `FORBIDDEN_FIELDS` dotyczy HTML i JSON; przy
  zerze ofert sprawdza same reguły stałe `_redirects`.
- **Test NIE MOŻE wywracać się na danych z CRM.** Oferty czyta się
  wyłącznie przez `tests/helpers/offers.ts` — nigdy gołym
  `readFileSync`/`readdirSync` na `data/`: pliku może nie być, a goły
  odczyt wywraca moduł przy jego ładowaniu, czyli przed uruchomieniem
  czegokolwiek. Test zależny od składu ofert (oferta z filmem, sprzedana,
  z parteru…) robi `test.skip(...)` z jawnym powodem, gdy oferty o danej
  cesze nie ma — dane produkcyjne zmieniają się bez PR-a. Czerwony `e2e`
  bez zmiany w kodzie naprawia się helperem i `test.skip`, nie
  dopasowaniem testu do dzisiejszych danych.
- **Kontrakt danych**: test unit pilnuje, że dane publiczne nie zawierają
  kluczy spoza allow-listy ani z `FORBIDDEN_FIELDS` (skan głęboki, na
  `data/` i na fixture). Wartości pól zabronionych nie wolno wpisywać
  w testy ani fixture — `.claude/rules/data-sync.md`.
- Baseline'y (`tests/visual/__screenshots__/`, commitowane): DWA komplety
  per plik — `*-darwin.png` (lokalnie: `pnpm test:visual:update`) i
  `*-linux.png` (ręcznie wyzwalany workflow `update-visual-baselines.yml`,
  bot-commit na branch PR-a; awaryjnie Docker
  `mcr.microsoft.com/playwright:v<wersja>-noble`). Zamierzona zmiana
  wyglądu = kod + OBA komplety w jednym PR. Kolejność NA ZAWSZE:
  kod → workflow linux → commit darwin na końcu (bot-push nie wyzwala CI).
- **Zielony zrzut NIE znaczy „baseline aktualny"** — różnica może siedzieć
  pod per-shot `maxDiffPixelRatio`. Żeby ZMIERZYĆ, ile realnie się
  rozjechało, ustaw w specu na czas JEDNEGO przebiegu
  `maxDiffPixelRatio: 0` i `maxDiffPixels: 0`, odczytaj liczbę z logu
  i przywróć plik (`git diff` na specu musi wyjść czysty). Żaden baseline
  nie jest przy tym ruszany.
- **Kontrakt geometryczny mierz SUB-PIKSELOWO** (`getBoundingClientRect`),
  nigdy przez `offsetHeight`: dwie niezależnie zaokrąglone liczby
  całkowite potrafią rozjechać się w PRZECIWNE strony i wywrócić test przy
  niedoborze rzędu tysięcznych piksela. Lekarstwo: rect + jawna stała
  tolerancji (`SUBPIXEL_TOL_PX = 0.5`). Objaw diagnostyczny: czerwone
  także w IZOLACJI (czyli nie flake), przy mikroskopijnej różnicy.
- **Próg per-shot podnoś dopiero po POLICZENIU SUFITU klasy, nie „z
  zapasem".** Ustal, które elementy mogą się różnić (np. kadry
  z parallaxem), policz, jaki procent dokumentu zajmują — to surowy sufit
  klasy; Playwright liczy percepcyjnie, ok. 10× łagodniej. Bez dowodu
  mechanizmu (pasma diffu pokrywające się z kadrami) nie podnoś progu.
- ZAKAZ regenerowania baseline'u w celu „naprawienia" czerwonego testu bez
  pokazania diffu Mateuszowi i jego zgody (blokada Edit/Write także
  w settings.json). Nigdy nie „naprawiaj" rozjazdu darwin↔linux globalnym
  progiem — od tego jest `{platform}` w ścieżce snapshotów.
- Wideo na zrzutach zawsze przez maskę (klatka wideo to loteria);
  odtwarzanie testuj funkcjonalnie w e2e.
- NIE emuluj `prefers-reduced-motion: reduce` (bramka w BaseLayout = testy
  „przechodzą" na martwej stronie); świadome, punktowe wyjątki per test
  weryfikujące ścieżkę reduce są dozwolone — oznaczaj je komentarzem.
- a11y (axe): allowlista znanych naruszeń w `tests/e2e/a11y.spec.ts` to
  RATCHET — startujemy od PUSTEJ; wpis wolno usunąć po realnej poprawie;
  nowych nie dopisuj bez decyzji Mateusza.
- LHCI: job `lighthouse` w `ci.yml` mierzy **build z fixture**
  (`pnpm build:visual`, nie artefakt `dist` z `quality`). Budżety
  (`lighthouserc*.cjs`) = RATCHET od Etapu 3: pomiar WYŁĄCZNIE na
  runnerze CI workflowem `lhci-measure.yml` (`workflow_dispatch`;
  5 przebiegów na obu configach → `scripts/lhci-median.mjs` → mediany
  w podsumowaniu biegu i artefakcie `lhci-measure`; GitHub pozwala
  uruchomić workflow dispatch dopiero, gdy jego plik jest na main — z
  brancha dopiero po pierwszym merge'u); wpis progów = osobny commit
  (albo mały PR), zacieśnianie tylko świadomą decyzją Mateusza.
  Do czasu wpisu median obowiązują progi luźne, tymczasowe. LHCI mierzy
  WYŁĄCZNIE adresy wpisane w config — trasy ofert (stały adres listy
  i detalu z fixture'u) trzeba dopisać, gdy powstaną ich widoki (4.2/4.3).
  Lokalny `lhci` wypada gorzej niż CI (mnożnik CPU) — nie jest podstawą
  ratchetu.
  ⚠️ Wariancja runnera na LCP bywa rzędu sekundy przy ZEROWEJ zmianie
  bajtów: próg bliżej niż ~1,3 s od mediany zamienia bramkę w loterię,
  a pojedynczy czerwony przebieg na LCP NIE dowodzi regresji — najpierw
  porównaj `resource-summary` obu przebiegów. Próg LCP = max(mediana
  × 1,15; mediana + 1 300 ms) — `lhci-median.mjs` liczy go gotowego.
- Wersje `playwright` i `@playwright/test` podnoś PARĄ (jeden zestaw
  binariów); bump = też tag obrazu Dockera w procedurze baseline'ów.
- Profile Playwright: 6 (chromium-1920/1366, firefox, webkit-SE/14,
  pixel-5). Breakpoint projektu 1025 px ⇒ iPhone'y i Pixel zawsze dostają
  układ mobilny, chromium-1366/1920 desktop. Żaden profil nie leży
  w przedziale tabletowym 768–1024 — układ tabletowy i oba progi
  (1025, 768) pilnuje kontrakt `expectBreakpointFlip`
  (`tests/helpers/breakpoint.ts`), nie profile.

## Czego emulacja NIE wykrywa → fizyczne urządzenie

Limit warstwy GPU Androida (galerie/sheety); iOS Low Power Mode (wideo
hero); zwijany toolbar Safari (pasek dolny detalu oferty, metryki
viewportu); klawiatura ekranowa a pola formularzy; wybór pliku na iOS
i Androidzie; linki `tel:`; zimny cache + realne łącze; dotyk fizyczny
(swipe galerii i lightboxa, swipe-down sheetów). Przy zmianach w tych
obszarach poproś Mateusza o test na telefonie i wskaż, na co patrzeć.
