# Testy — kontrakt projektu

Harness odziedziczony z szablonu projektu (konfiguracja
Playwright/Vitest/axe/LHCI, 6 profili, helpery); liczby szablonu NIE
obowiązują — baseline'y i budżety powstają od nowa w Etapie 3.

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

| Zmiana                                                                                                                    | Warstwa (komenda)                                                                                           |
| ------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------- |
| `scripts/sync/**`, `src/lib/offers/**` (allow-lista, schemat, parser)                                                     | `pnpm test:unit` (kontrakt danych)                                                                          |
| `src/lib/img.ts`, `MEDIA_BASE`, `IMG_VARIANTS`                                                                            | `pnpm test:unit` (`img`, `media-r2`)                                                                        |
| `src/lib/offers/data.ts`, `redirects.ts`, integracje, `[...path].astro`                                                   | `pnpm test:unit && pnpm build && pnpm test:dist`                                                            |
| `scripts/sync/pipeline.ts`, `index.ts`, `fixtures.ts`, `sync.yml`                                                         | `pnpm test:unit` (`sync-index`, `sync-fixtures`); workflow NIE uruchamiać w sesji                           |
| `src/i18n/**`, `src/lib/*.ts` (img, routes, contact-form, jsonld, …)                                                      | `pnpm test:unit`                                                                                            |
| `scripts/subset-fonts.mjs`, `src/styles/fonts.css`                                                                        | `pnpm test:unit` (kontrakt subsetów)                                                                        |
| `src/scripts/**`, navbar, stopka, wyszukiwarka, galeria, formularze                                                       | `pnpm build && pnpm test:e2e`                                                                               |
| `src/lib/offers/{filters,index-entry,location-path,offers-ui,text}.ts`, `src/components/offers/**`, `src/pages/oferty/**` | `pnpm test:unit && pnpm build && pnpm test:dist && pnpm test:e2e` (+ warstwa wizualna przy zmianie wyglądu) |
| `tests/helpers/**`, `lighthouserc*.cjs`, `.github/workflows/*.yml`                                                        | `pnpm test:unit` (helpery) + warstwa, której spec używa helpera; workflow NIE uruchamiać w sesji            |
| Każda zmiana wyglądu                                                                                                      | `pnpm build:visual && pnpm test:visual`                                                                     |
| Przed release                                                                                                             | pełne `pnpm test` + `/release-check`                                                                        |

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
