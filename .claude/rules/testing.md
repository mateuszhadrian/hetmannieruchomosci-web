# Testy — kontrakt projektu

Harness odziedziczony z szablonu projektu (konfiguracja
Playwright/Vitest/axe/LHCI, 6 profili, helpery); liczby szablonu NIE
obowiązują — baseline'y i budżety powstają od nowa w Etapie 3.

STAN po S2c (Etap 2): unit — `contact-details`, `contact-form`,
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
fixture, skip bez danych) — wszystkie na danych SYNTETYCZNYCH z
`tests/fixtures/raw/` (helpery `tests/helpers/raw.ts`, w tym
`syntheticFullOffers()`); dist — `tests/dist/dist.test.ts`
(`pnpm test:dist`, osobny `vitest.dist.config.ts`, wymaga `pnpm build`);
e2e — `navigation`, `seo` (sitemapa = trasy statyczne + trasy ofert
z danych), `a11y`, `smoke`, `not-found`, `offers-skeleton` (detal
i lista pierwszej oferty z `data/`, skip przy zerze ofert; `/{NUMER}` →
301 tylko z `BASE_URL`); visual — `chrome` i `not-found` (BEZ
baseline'ów — powstają w Etapie 3). Fixture ofert ma dotąd tylko
`selection.json` (`pnpm fixtures:build` uruchamia Mateusz), `data/` tylko
`legacy-redirects.json` (pierwszy sync — 2.11). Specy widoków powstają
razem z widokami (Etapy 4–5): widok dostaje WŁASNY spec e2e i visual.

## Co zmieniasz → co uruchamiasz

| Zmiana                                                                  | Warstwa (komenda)                                                                 |
| ----------------------------------------------------------------------- | --------------------------------------------------------------------------------- |
| `scripts/sync/**`, `src/lib/offers/**` (allow-lista, schemat, parser)   | `pnpm test:unit` (kontrakt danych)                                                |
| `src/lib/img.ts`, `MEDIA_BASE`, `IMG_VARIANTS`                          | `pnpm test:unit` (`img`, `media-r2`)                                              |
| `src/lib/offers/data.ts`, `redirects.ts`, integracje, `[...path].astro` | `pnpm test:unit && pnpm build && pnpm test:dist`                                  |
| `scripts/sync/pipeline.ts`, `index.ts`, `fixtures.ts`, `sync.yml`       | `pnpm test:unit` (`sync-index`, `sync-fixtures`); workflow NIE uruchamiać w sesji |
| `src/i18n/**`, `src/lib/*.ts` (img, routes, contact-form, jsonld, …)    | `pnpm test:unit`                                                                  |
| `scripts/subset-fonts.mjs`, `src/styles/fonts.css`                      | `pnpm test:unit` (kontrakt subsetów)                                              |
| `src/scripts/**`, navbar, stopka, wyszukiwarka, galeria, formularze     | `pnpm build && pnpm test:e2e`                                                     |
| Każda zmiana wyglądu                                                    | `pnpm build:visual && pnpm test:visual`                                           |
| Przed release                                                           | pełne `pnpm test` + `/release-check`                                              |

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
- LHCI: do Etapu 3 progi LUŹNE, tymczasowe (`lighthouserc*.cjs`). Od
  Etapu 3 RATCHET: budżety z pomiaru na runnerze CI (`lhci collect`
  z `numberOfRuns=5`, potem `node scripts/lhci-median.mjs`), mierzony
  jest **build z fixture**; zacieśnianie tylko świadomą decyzją Mateusza,
  osobnym commitem. LHCI mierzy WYŁĄCZNIE adresy wpisane w config — trasy
  ofert trzeba dopisać, gdy powstaną ich widoki. Lokalny `lhci` wypada
  gorzej niż CI (mnożnik CPU) — nie jest podstawą ratchetu.
  ⚠️ Wariancja runnera na LCP bywa rzędu sekundy przy ZEROWEJ zmianie
  bajtów: próg bliżej niż ~1,3 s od mediany zamienia bramkę w loterię,
  a pojedynczy czerwony przebieg na LCP NIE dowodzi regresji — najpierw
  porównaj `resource-summary` obu przebiegów.
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
