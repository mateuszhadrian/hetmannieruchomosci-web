# hetmannieruchomosci-web — CLAUDE.md

Strona biura nieruchomości **HETMAN Nieruchomości** (Poznań) —
`hetmannieruchomosci.com`. Astro 6 **static** (bez SSR), **PL-only**.
Hosting: Cloudflare Pages, deploy automatyczny z gałęzi `main` →
**main = to, co widzi klientka**. Do przełączenia domeny strona żyje pod
adresem podglądu `nowa.hetmannieruchomosci.com` (z nagłówkiem `noindex`);
obecna strona klientki pod domeną główną działa do tego czasu nietknięta.
Main chroniony rulesetem — zmiany idą przez feature branch → PR → zielone
checki → merge (`docs/daily-workflow.md`); jedynym wyjątkiem jest bot
syncu danych.

**Oferty pochodzą z systemu CRM biura.** Nocny sync (GitHub Actions)
pobiera je, przepuszcza przez allow-listę pól, zapisuje `data/*.json`
i wyzwala build; zdjęcia ofert leżą w zasobniku mediów (R2), rozmiary
powstają przez transformacje obrazów. Faza 1 jest **bez CMS** — treści
statyczne siedzą w kodzie.

Projekt budowany wg instrukcji wykonawczej (Etapy 0–9) i bazy wiedzy.
**Oba zestawy dokumentów są LOKALNE, poza gitem** (`docs/plan/`,
`docs/kb/`) — repo jest publiczne. Decyzje D01–D41 i ustalenia U1–U17 są
zapadłe: NIE otwieraj ich na nowo; jeśli coś okazuje się niewykonalne,
zatrzymaj się i zgłoś z uzasadnieniem. Kod startowy to kopia szablonu
projektów z tej samej rodziny: infrastruktura (testy, CI, budżety,
formularz, nakładki) została, widoki powstają od nowa wg `docs/design/`.

## Zasady twarde

1. **NIGDY nie wykonuj `git commit` ani `git push`** — commituje wyłącznie
   Mateusz. Twoja rola: zostawić zmiany w working tree i ZAPROPONOWAĆ
   treść commita (conventional commits ze scope, po angielsku, temat małą
   literą, np. `feat(oferty): …`, `fix(sync): …`) z JAWNĄ listą plików —
   nigdy `git add .`. Blokada jest też egzekwowana w
   `.claude/settings.json`.
2. **Dane ofert pisze wyłącznie skrypt, nigdy ręcznie:** pliki w `data/`
   zapisuje bot syncu, a katalog `tests/fixtures/offers/` buduje
   `pnpm fixtures:build`. Blokada w settings.json i hook `guard-data.sh`.
   Jedyny wyjątek: `tests/fixtures/offers/selection.json` (lista numerów
   ofert i nadpisań do fixture'u) — ten plik pisze się ręcznie.
3. **Nie dotykaj `dist/` i `.astro/`** — generowane.
4. **Sekrety i dane wrażliwe:** nie czytaj `.env*`, `~/.config/hetman/`,
   `**/devtools/api/**`; nie loguj tokenów ani kluczy. Żadnych wartości
   pól z `FORBIDDEN_FIELDS` w kodzie, testach, logach, dokumentach
   i odpowiedziach (`.claude/rules/data-sync.md`).
5. **Nie aktualizuj baseline'ów wizualnych**
   (`tests/visual/__screenshots__/`) bez pokazania diffu i zgody Mateusza.
   Aktualizacja wyłącznie przez `pnpm test:visual:update` po akceptacji;
   komplet linuksowy → workflow `update-visual-baselines.yml`. Święta
   kolejność: kod → workflow linux → commit darwin na końcu.
6. **API systemu CRM: wyłącznie `GET`, wyłącznie przez `scripts/sync`**,
   nigdy z adresem zapytania w logu (adres niesie token). Obecna,
   produkcyjna strona klientki: wyłącznie `GET`. W sesji Claude pracuje na
   danych syntetycznych — przebiegi z API uruchamia Mateusz.
7. **Decyzje są zapadłe; CRM jest źródłem prawdy; design = wygląd.**
   Treści ofert nie redagujemy (tylko sanityzacja i prezentacja). Sposób
   pracy klientki ma się zmienić jak najmniej. Gdy design różni się od
   bazy wiedzy w logice albo wartości — obowiązuje baza wiedzy.
8. **Repo jest PUBLICZNE:** nic z `docs/kb/` ani `docs/plan/` nie trafia
   do plików śledzonych przez git — także do tego pliku, mini-analiz
   i komunikatów commitów. Odsyłaj sekcją („part3 §1.3"), nie kopiuj
   treści. Publiczne są też logi GitHub Actions.
9. **Docs-first:** gdy krok instrukcji trzeba wykonać inaczej, najpierw
   opisz rozjazd Mateuszowi, potem koduj. Nie instaluj niczego globalnie.

## Mapa projektu

- **8 tras statycznych** + strona 404 (`src/pages/404.astro`, noindex, poza
  sitemapą) — `src/lib/routes.ts`: `/`, `/oferty/`, `/sprzedaj-z-nami/`,
  `/o-nas/`, `/uslugi/`, `/praca/`, `/kontakt/`, `/polityka-prywatnosci/`.
- **Trasy ofert** (wzorzec w `routes.ts`, funkcje `offerListPath` /
  `offerDetailPath`): `/oferty/{typ}-na-{transakcja}/`,
  `…/{lokalizacja}/`, `…/{lokalizacja}/{numer}/` oraz indeks wyszukiwarki
  `/oferty/index.json`. Wchodzą w Etapie 2 (szkielety) i 4 (widoki).
- **Przełączniki i stałe** w jednym miejscu: `src/lib/site-config.ts`
  (progi układu, `SHOW_PRACA`, `MAP_MARKER`, `SHOW_PRICE_WHEN_SOLD`,
  `SHOW_TAGS`, `INTERACTIVE_MAP`, `SORT_NEWEST_BY`, `NEW_BADGE_DAYS`,
  `AGENT`, `MEDIA_BASE`).
- **Breakpoint projektu: 1025 px** (desktop ≥ 1025; tablet 1024 px dostaje
  układ tabletowy); drugi próg **768 px**; mapa kontaktu 600 px. Stała
  w configu + `@media` W PARZE, kontrakt `expectBreakpointFlip`.
- **Tokeny** w `src/styles/global.css` (paleta i typografia z designu);
  **fonty** Manrope Variable + Archivo Variable, self-hosted przez
  Fontsource z własnymi polskimi subsetami (`src/styles/fonts.css`,
  `scripts/subset-fonts.mjs`). Google Fonts NIE wchodzi.
- **Dane kontaktowe przez sloty antyscrapingowe**
  (`src/lib/contact-details.ts`): jeden telefon `a[data-tel]`, dwa adresy
  `a[data-mail="biuro|joanna"]`; pełnych ciągów NIE MA w statycznym HTML.
  Kontrakt nie obejmuje opisu oferty z CRM.
- **Nakładki** (menu mobilne, a docelowo bottom sheety filtrów
  i sortowania oraz lightbox galerii) stoją na `src/scripts/overlay.ts` —
  mechaniki nie ruszać. Scroll NATYWNY na dokumencie
  (`.claude/rules/scroll.md`).
- **Formularze:** Pages Function `functions/api/kontakt.ts` + Resend,
  logika w `src/lib/contact-form.ts`. Functions uruchamiają się wyłącznie
  dla `/api/*` (`public/_routes.json`).
- **Pliki platformy** w `public/`: `_headers` (noindex dla podglądu
  i `*.pages.dev`; domena główna bez wpisu), `_routes.json`, `robots.txt`.
- **Eksport designu** (`docs/design/export/*.html`) = referencja WYGLĄDU,
  nie zachowania, wartości ani implementacji — podwójne drzewa DOM,
  jednostki `cqw` i style inline to artefakty narzędzia. Obrazy i wideo
  eksportu są POZA repo (`.gitignore`); pochodne w `src/assets/img/`
  i `public/video/`. Mapa i tabela assetów: `docs/design/README.md`.

## Komendy

- `pnpm dev` — dev server (port 4321)
- `pnpm build` / `pnpm preview`; `pnpm build:visual` — build na
  zamrożonym fixture ofert (`OFFERS_DATA_DIR=./tests/fixtures/offers`,
  `MEDIA_SOURCE=fixture` → `imgAt()` daje lokalne kopie zdjęć)
- `pnpm typecheck` — `astro check` (obejmuje też `tests/` i `functions/`)
- `pnpm lint` / `pnpm lint:fix` / `pnpm format` / `pnpm format:check`
- Testy (kontrakt: `.claude/rules/testing.md`): `pnpm test` (wszystko);
  `pnpm test:unit` (Vitest, sekundy); `pnpm test:e2e` (Playwright:
  funkcjonalne + a11y + SEO; wymaga `pnpm build`); `pnpm test:visual`
  (zrzuty vs baseline; wymaga `pnpm build:visual`; webServer sam wstaje
  na 4399); `pnpm test:visual:update` (nowe baseline'y — TYLKO za zgodą
  Mateusza); `pnpm test:smoke:prod` (smoke przeciw adresowi produkcyjnemu
  bieżącej fazy)
- `pnpm sync` / `pnpm sync:dry` — sync ofert (`scripts/sync/index.ts`;
  flagi `--source=api|file`, `--skip-photos`, `--skip-maps`, `--force`,
  `--out=`, `--prev=`, `--report=mail|stdout|none`; lokalnie pisze do
  `.sync-out/`, w Actions do `data/`; tryb `api` uruchamia wyłącznie
  Mateusz albo workflow `sync.yml`); `pnpm fixtures:build` — fixture
  ofert z zrzutu `ESTI_RAW_SNAPSHOT` (uruchamia Mateusz, żądania do sieci)
- `pnpm test:dist` — skan zbudowanego `dist/` (nazwy pól zabronionych,
  spójność `_redirects`); wymaga `pnpm build`; stoi w bramce syncu
  i w jobie `quality`
- `node scripts/optimize-images.mjs <src> <out.webp> [szer] [q]` — obrazy
  z eksportu designu → WebP do `src/assets/img/`
- `node scripts/subset-fonts.mjs` — polskie subsety fontów
- `node scripts/make-icons.mjs` — komplet ikon marki + og-image (wersja
  tymczasowa na źródłach rastrowych; nie podmieniaj plików ręcznie)
- CI (GitHub Actions) na push/PR — 3 joby: `quality` (format:check →
  lint → typecheck → test:unit → build), `e2e` (test:e2e + test:visual),
  `lighthouse` (budżety w `lighthouserc*.cjs`). Po merge'u do main
  dodatkowo `prod-smoke.yml`. Lokalnie husky: pre-commit lint-staged,
  commit-msg commitlint.
- Skille: `/test`, `/release-check`, `/verify-mobile`.

## Stan projektu (aktualizuj po każdym etapie!)

Każda sesja zaczyna pracę od przeczytania tej sekcji. Zasady wpisu:
fakty, nie opis przebiegu; bez treści z bazy wiedzy i planu (plik jest
publiczny); wpisy kolejnych etapów dopisuje się POD poprzednimi, niczego
nie kasując; etap wykonany częściowo oznacza się „W TOKU" z listą tego,
co zostało.

- **Etap 0 (bootstrap) — WYKONANY** (2026-09-29): repo powstało jako kopia
  szablonu projektu (147 plików), z której wycięto 53 pliki: cały aparat
  CMS, kolekcję i widoki poprzedniego serwisu wraz z ich specami. Zostały
  infrastruktura testów i CI, `overlay.ts`, mechanika formularza
  i modułu ruchu. Powstało 8 tras-szkieletów na `SkeletonPage.astro`,
  `routes.ts` z wzorcem adresów ofert, `site-config.ts` z przełącznikami,
  tokeny z designu, fonty Manrope + Archivo (pakiety variable, sama oś
  wagi, bez italików; polskie subsety 8 KB), `public/_headers`
  i `_routes.json`, robocze Navbar i stopka (płaskie menu, bottom sheet;
  BEZ auto-hide i dropdownu), 20 kadrów designu w dwóch wariantach WebP,
  wideo hero w WebM i MP4, ekosystem `.claude` (5 reguł, 4 hooki,
  3 skille). Decyzje w trakcie: `DESKTOP_MIN_PX = 1025`,
  `TABLET_MIN_PX = 768` w `site-config.ts` (configi sekcji importują
  stamtąd); zakres osi Manrope 200–800 (z arkusza Fontsource);
  potwierdzenie do nadawcy formularza usunięte; ikony i og-image
  TYMCZASOWE, ze źródeł rastrowych, bez `favicon.svg`. Weryfikacja:
  format, lint, typecheck, 52 testy unit, build 9 stron, e2e 218 testów
  na 6 profilach — zielone. Świadomie zostawione na później: baseline'y
  wizualne i realne budżety LHCI (Etap 3), wygląd docelowy chrome'u (4.1),
  pola formularzy (5), JSON-LD w stronach i wektor znaku (6).
  UWAGI dla kolejnych etapów: (1) `pnpm sync`, `sync:dry`,
  `fixtures:build` to ZAŚLEPKI kończące się błędem; katalogi `data/`
  i `tests/fixtures/offers/` nie istnieją. (2) `TURNSTILE_SITE_KEY`
  i `MEDIA_BASE` są PUSTE. (3) Zestaw pól w `contact-form.ts`,
  `contact-ui.ts` i `functions/api/kontakt.ts` jest odziedziczony
  i niedocelowy; żaden widok nie osadza dziś formularza. (4) `imgAt()`
  ma logikę szablonu (dwa rozmiary, `format=auto`) — warianty i host
  ustala Etap 2. (5) `content-motion.ts` i `revealSweep` znają selektory
  szablonu (`data-rev`, `data-plx`…), nie designu (`data-rv`, `data-px`);
  `CollapsibleText` jest nieużywany. (6) `tests/helpers/offers.ts` to
  wersja minimalna (sam odporny odczyt), a `assertVisualFixture` zakłada
  znacznik `data-offer-card=` na karcie oferty — kontrakt do potwierdzenia
  w Etapach 3 i 4.2. (7) Blokada `Write(tests/fixtures/offers/**)`
  w settings.json obejmuje też `selection.json`, który ma być pisany
  ręcznie — do rozstrzygnięcia przed Etapem 2. (8) Specy `visual/chrome`
  i `visual/not-found` nie mają baseline'ów, więc `pnpm test:visual`
  i job `e2e` w CI będą czerwone do Etapu 3. (9) Wariant `-m` kadrów
  poziomych ma mniejszą wysokość niż desktopowy — hero strony głównej na
  telefonie może wymagać własnego kadru (4.4). (10) Pliki HTML eksportu
  designu ładują po otwarciu w przeglądarce zasoby z serwerów
  zewnętrznych — do czytania kodu, nie do klikania w sesji.
  KOREKTA 2026-09-30 (decyzje po raporcie): uwaga (7) ROZSTRZYGNIĘTA —
  blokada w settings.json wymienia generaty fixture'u z nazwy (`offers`,
  `locations`, `photos`, `maps`, katalog `media/`), a `selection.json`
  jest spod niej wyłączony; resztę katalogu pilnuje hook `guard-data.sh`.
  Źródła ikon (`src/assets/logo/source/`) i pełny eksport designu zostają
  w repo.
- **Etap 1 (chmura) — WYKONANY** (2026-10-01): repo publiczne na
  GitHubie; ruleset ochrony `main` (wymagany check `quality`; bypass
  wyłącznie dla konta bota syncu — patrz 2.0 niżej); projekt Cloudflare
  Pages `hetmannieruchomosci-web` (deploy z `main`; nagłówek noindex
  i Pages Function `/api/kontakt` potwierdzone; `_headers`
  i `_routes.json` Pages wczytuje jako konfigurację i nie serwuje — 404
  pod tymi ścieżkami to stan poprawny); domena
  `nowa.hetmannieruchomosci.com` Active z noindex; Resend klientki:
  domena `send.` zweryfikowana, trzy rekordy dodane u rejestratora,
  poczta klientki przetestowana (SPF/DKIM pass); workflow `prod-smoke`
  zielony. Nazwy zasobów (bez wartości): `docs/kb/rejestr-konfiguracji.md`
  (lokalnie).
- **Etap 2 / 2.0 (chmura i konta) — WYKONANY** (2026-10-01): bucket R2
  `hetman-media` (EU) z tokenem Object Read & Write (scope: ten bucket);
  tymczasowy host mediów `hetman-media.hadrianm.pl` (Z2) Active —
  transformacje potwierdzone nagłówkiem `cf-resized: internal=ok`; plan
  Images: 9/5 000 transformacji w miesiącu → D29 wariant główny;
  Geoapify: klucz zrotowany; deploy hook Pages `sync`; konto bota
  `hetman-sync-bot` (collaborator Write, 2FA, classic PAT `public_repo`
  ważny do 2027-10-01, User-bypass Always w rulesecie dodany przez API);
  11 sekretów Actions: `ESTICRM_COMPANY`, `ESTICRM_TOKEN`,
  `SYNC_AGREEMENT_SIGNAL`, `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`,
  `R2_SECRET_ACCESS_KEY`, `GEOAPIFY_KEY`, `SYNC_PUSH_TOKEN`,
  `REPORT_RESEND_API_KEY`, `REPORT_TO`, `PAGES_DEPLOY_HOOK`
  (`HEARTBEAT_URL` — decyzja w S2c). `MEDIA_BASE` w `site-config.ts`
  nadal pusty — wartość `https://hetman-media.hadrianm.pl` wpisuje S2b.
- **Etap 2 / S2a (dane ofert, kroki 2.1–2.3) — WYKONANY** (2026-09-30,
  gałąź `feat/sync-s2a`): allow-lista i skan pól zabronionych
  (`src/lib/offers/public-fields.ts`), schemat Zod strict w dwóch
  wariantach — pełny i po normalizacji (`schema.ts`), parser statusu
  z tytułu (`status.ts`, sprawdzony na realnych tytułach 8/21/13/3),
  formattery (`format.ts`), adresy jako opakowania nad `routes.ts`
  (`urls.ts`), `slugify`, czysta funkcja `_redirects` (`redirects.ts`)
  i integracja Astro `src/integrations/redirects.ts` zapisująca
  `dist/_redirects` po buildzie (P17; sprawdzona: bez `data/` = 3 reguły
  stałe, z danymi = krótkie adresy, stare ścieżki, dawne adresy; zły plik
  wywraca build); w `scripts/sync/`: `normalize.ts` (słownik API jako
  parametr — P15; daty ISO Europe/Warsaw bez biblioteki; ostrzeżenia
  z kodami, numer oferty poza `message`), `sanitize.ts` (sanitize-html,
  style → klasy), `locations.ts` (drzewo z nazw, liczniki, ulice, kolizje
  slugów), `ledger.ts` (rejestr tylko dopisuje), `warnings.ts`,
  `dictionary.ts`, `dates.ts`; `scripts/collect-legacy.ts`
  (`pnpm redirects:legacy`, parser HTML listy) i `scripts/probe-redirects.ts`
  (`pnpm test:redirects:prod`, nieuruchamiana w sesji). Fixture'y
  w `tests/fixtures/raw/`: 4 rekordy syntetyczne z wartownikami w polach
  zabronionych, słownik syntetyczny (prawdziwego `slownik-api.json` nie
  było), 45 realnych tytułów bez numerów, 3 karty listy bez `tel:`
  i `mailto:`. Zależności: `tsx`, `sanitize-html`, `htmlparser2`
  (dependencies), `@types/sanitize-html`. Testy: 11 nowych plików unit
  (154 testy razem), format/lint/typecheck/build zielone. Reguła
  `data-sync.md` uzupełniona o mapę kodu i konwencje. DECYZJE W TRAKCIE:
  (1) id sygnału umowy do W1/W2 NIE jest w repo — `normalize` dostaje go
  w `agreementSignalId` (wartość pola z `FORBIDDEN_FIELDS`, zasada 4);
  skąd go weźmie sync — do ustalenia w S2b/S2c. (2) `locations.json` bez
  pola `version` (zasada „bez znaczników czasu w plikach commitowanych").
  (3) `formatLocation` przyjmuje `streetType` (`ul.`/`os.`). (4) Wpisy
  w `surroundings` to pełne nazwy pól (`recreationForest`), w `security`
  i `media` — bez prefiksu. UWAGI dla S2b/S2c: `OfferSchema` wymaga
  zdjęć z `r2Key/etag/width/height` (2.5); `data.ts` i `test:dist`
  nie istnieją; integracja `_redirects` czyta `offers.json` lekkim
  schematem (numer, typ, transakcja, slug) — pełną walidację ma dać
  `data.ts`; `tests/helpers/offers.ts` nadal minimalny.
- **Etap 2 / S2b (dane ofert, kroki 2.4–2.7) — WYKONANY** (2026-10-01,
  gałąź `feat/sync-s2b`): `scripts/sync/esti-client.ts` (`basic-list`,
  `list?take=100` ze stronicowaniem `skip` do `totalCount`, `dictionary`
  walidowany `DictionarySchema`; `x-ratelimit-remaining: 0` → odczekanie,
  jedno ponowienie po 429/5xx/błędzie sieci; `EstiApiError` bez adresu
  zapytania), `visibility.ts` (`isVisible` wg `VISIBILITY_RULE`
  w `site-config.ts` — Z9; `ALL_STATUSES`; W4; `diffVisibility` liczony
  z samych numerów ofert widocznych), `photos.ts` (If-None-Match →
  304/200, sha256, wymiary sharpem z korektą orientacji EXIF, klucz
  `offers/{crmId}/{id}-{sha256[:8]}.jpg`, pula ≤ 4, manifest
  `data/photos.json` z `goneSince` i `replaced` zamiast `seenAt`, W6 przy
  przejściu aktywna ↔ nieaktywna bez zmiany ETagów, `PHOTO_FETCH`),
  `r2.ts` (`@aws-sdk/client-s3`: put/list/remove, magazyn dry-run,
  `cleanupGone` po 30 dniach także dla kluczy zastąpionych,
  `findOrphans`), `maps.ts` + `src/lib/offers/map-key.ts` (`coordKey`
  5 miejsc; jedno żądanie Geoapify per punkt; styl i zoom mapy kontaktu,
  kadr 600×467 @2 → WebP bez kadrowania; klucz `maps/{hash16}.webp`
  zależny od `MAP_MARKER`; manifest `data/maps.json`; `MAP_FETCH`),
  `report.ts` (`publicSummary` ze strażnikiem `redactPublic`,
  `privateReport` text + html, `sendReport` przez Resend z parametrem
  `from`), `src/lib/img.ts` przepisany (`imgAt(r2Key, card|hero|og)`,
  stały `format=webp`, `onerror=redirect`, dev → oryginał,
  `MEDIA_SOURCE=fixture` → `/media/{klucz}.webp`; `envPrefix`
  w `astro.config.mjs`, `src/env.d.ts`). Stała `MEDIA_BASE` wskazuje
  host tymczasowy `hetman-media.hadrianm.pl`. Schemat: `PhotosFileSchema`,
  `MapsFileSchema`, wzorce `PHOTO_R2_KEY`, `MAP_R2_KEY`, `COORD_KEY`;
  nowe kody `PHOTO_FETCH`, `MAP_FETCH`. Zależności: `@aws-sdk/client-s3`
  i `sharp` (0.35.2 → 0.35.5) w `dependencies`. Testy: 8 plików unit
  nowych/przepisanych (235 testów, 7 skip bez danych),
  format/lint/typecheck/build/build:visual zielone. DECYZJE W TRAKCIE
  (domyślne z planu sesji, zatwierdzone): (1) prawdziwy słownik API
  w testach czytany spoza repo (`readDictionaryForTests`), w repo tylko
  syntetyczny; (2) bez geokodowania — schemat wymaga współrzędnych;
  (3) wymuszony GET po zmianie daty eksportu galerii pominięty (ETag
  niesie mtime, wymagałby pola kontrolnego w manifeście); (4) nadawca
  raportu = sekret `REPORT_FROM` (czyta 2.8); (5) warianty obrazów card
  640 / hero 1600 / og 1200×630 — do korekty w 4.2/4.3; (6) mapa oferty
  = surowy Geoapify z wbudowanym znacznikiem w kolorze `--navy` (stała
  w `maps.ts` W PARZE z tokenem), bez tintu i własnej pinezki mapy
  kontaktu (prezentacja w 4.3). UWAGI dla S2c: (1) kopiowanie
  `tests/fixtures/offers/media/` do `dist/media/` nie istnieje
  (integracja albo `publicDir`); (2) `data.ts` waliduje `photos.json`
  i `maps.json` nowymi schematami; (3) `syncPhotos` potrzebuje
  `previousStatus` z poprzedniego `offers.json`, `diffVisibility` —
  jego numerów; (4) składnia parametrów `marker`/`geometry` Geoapify
  zweryfikowana wyłącznie testem kształtu adresu — pierwszy bieg
  z `--skip-photos` ma to potwierdzić obrazem; (5) `--dry-run` powinien
  dostać `createDryRunStore()` i pominąć wysyłkę raportu albo wysłać
  z dopiskiem; (6) sekret `REPORT_FROM` do dodania przed 2.11.
- **Etap 2 / S2c (dane ofert, kroki 2.8–2.11) — WYKONANY** (2026-10-01,
  gałąź `feat/sync-s2c`): `scripts/sync/pipeline.ts` (czysty przebieg
  kroków 1–11 z zależnościami jako parametrami; bezpieczniki 0 ofert
  i spadek > 50 % → `aborted` bez zapisu, `force` omija; porównanie
  z poprzednim stanem po przepuszczeniu obu stron przez schematy
  strict → „brak zmian"; przebudowa zależna od daty jako odcisk
  wczoraj/dziś; czyszczenie R2 przed zapisem manifestów, błąd zasobnika
  nie blokuje zapisu) + `index.ts` (CLI: `--source=api|file`, `--dry-run`,
  `--skip-photos`, `--skip-maps`, `--force`, `--out=`, `--prev=`,
  `--report=mail|stdout|none`; env = nazwy sekretów z 2.0,
  `SYNC_AGREEMENT_SIGNAL` czytane tylko tu; wyjście lokalnie ZAWSZE
  `.sync-out/`, w Actions `data/`; `outcome`/`changed`/`rebuild`
  w `GITHUB_OUTPUT`; kody wyjścia 0/2/1); `src/lib/offers/data.ts`
  (`loadOffersData(dir)` — jedyny odczyt danych, 6 plików strict, brak =
  pusty stan, bufor per katalog, `BUILD_NOW` z env; integracja
  `_redirects` czyta przez `data.ts`), `time-rules.ts` (`isNewOffer`,
  `showsAvailableFrom`, `dateDependentFingerprint`, daty Europe/Warsaw),
  `urls.ts` + `offerRoutes()`, `static-paths.ts`; szkielet
  `src/pages/oferty/[...path].astro` (listy typ×transakcja
  i z lokalizacją, detale: h1, numer, cena, pierwsze zdjęcie `card`,
  mapa z `maps[coordKey()]`; znaczniki `data-offer-card`,
  `data-offer-detail`, `data-offer-number`, `data-offer-price`;
  `SkeletonPage` dostał `<slot />`); integracja
  `src/integrations/fixture-media.ts` (kopia `tests/fixtures/offers/media/`
  → `dist/media/` przy `MEDIA_SOURCE=fixture`); `scripts/sync/fixtures.ts`
  (`pnpm fixtures:build`: ten sam pipeline w trybie plikowym, magazyn
  plikowy WebP 400 px / mapy 600 px pod `fixtureMediaPath()`, `overrides`:
  `price`, `previousPrice`, `addedAt`, `availableFrom`, `planPhotos`;
  `FIXTURE_NOW` W PARZE z `BUILD_NOW` skryptu `build:visual`);
  `tests/fixtures/offers/selection.json` (10 numerów, 4 nadpisania);
  `.github/workflows/sync.yml` (cron 02:15 UTC + dispatch `dry_run`/
  `force`/`skip_photos`, bramka test:unit + build + test:dist PRZED
  commitem, commit bota, pull --rebase, push, deploy hook TYLKO gdy
  `rebuild && !changed`, mail o błędzie przez curl, heartbeat warunkowy
  przez `env.HEARTBEAT_URL`); `pnpm test:dist` (`vitest.dist.config.ts`,
  `tests/dist/dist.test.ts`: skan `dist/**/*.{html,json}` pod kątem nazw
  z `FORBIDDEN_FIELDS`, `_redirects` w limitach, bez pętli, każdy cel
  plikiem w dist) także w jobie `quality`. Testy: `offers-data`,
  `offers-time-rules`, `sync-index` (15), `sync-fixtures`,
  `offers-contract` (data/ + fixture, skip bez danych), rozszerzone
  `offers-urls`; e2e `offers-skeleton.spec.ts` (@prod-smoke, skip przy
  zerze ofert; `/{NUMER}` → 301 tylko z `BASE_URL`); `seo.spec` sitemapa =
  trasy statyczne + trasy ofert z danych (`offerRoutesFromData()`
  w `tests/helpers/offers.ts`). Weryfikacja: format/lint/typecheck,
  unit 263 (+29 skip), build na danych syntetycznych = 12 tras ofert,
  11 reguł, sitemapa 20, `test:dist` zielony; `build:visual` zielony
  z ostrzeżeniem o braku `media/`; e2e 81 (2 profile). DECYZJE W TRAKCIE:
  (1) deploy hook nie jest wołany po pushu bota (push sam buduje Pages) —
  rozjazd z 2.10 do akceptacji; (2) `/oferty/index.json` zostaje na 4.2;
  (3) `--skip-photos`/`--skip-maps` = atrapy pobierania (znane bez zmian,
  nowe odłożone z PHOTO_FETCH/MAP_FETCH); (4) `--dry-run` wysyła raport
  z etykietą „przebieg próbny", `--report=stdout` ignorowane w Actions;
  (5) poprzedni stan czytany ZAWSZE z `--prev` (domyślnie `data/`),
  zły plik = błąd przebiegu; (6) `offers.json` sortowane po numerze.
  UWAGI dla 2.9/2.11/Etapu 3: (1) fixture NIE jest zbudowany — `pnpm
fixtures:build` uruchamia Mateusz (`ESTI_RAW_SNAPSHOT`,
  `ESTI_DICTIONARY_FILE`, `GEOAPIFY_KEY`), potem commit generatów
  i baseline'y w Etapie 3; (2) `data/` ma tylko `legacy-redirects.json` —
  pierwszy sync (2.11) przez `workflow_dispatch`; (3) `sync.yml`
  nieuruchamiany; składnia parametrów Geoapify nadal potwierdzona tylko
  testem kształtu adresu; (4) mapa na detalu w trybie produkcyjnym to
  oryginał z R2 (`mediaUrl`), w fixture kopia lokalna — prezentację
  ustala 4.3; (5) `tests/helpers/offers.ts` zna `offerRoutesFromData()`
  i `firstOfferPath()`, selektory po cechach nadal brak (Etap 3).
  DOPISEK 2026-10-02 (po S2c): 2.9 WYKONANE 2026-10-01 (PR #9) — fixture
  10 ofert z `tests/fixtures/offers/selection.json`, `media/` lokalne
  WebP. Poprawki po S2c: PR #8 (CLI pomija samotne `--` z pnpm), PR #10
  (bucket R2 ma jurysdykcję EU → endpoint `{account}.eu.r2…`, stała
  `R2_JURISDICTION` w `index.ts`, `r2Endpoint()` w `r2.ts`). 2.11 WYKONANE
  2026-10-02: dry-run w Actions OK; pierwszy bieg właściwy padł na Access
  Denied (endpoint R2 bez `eu.`), drugi OK: 46 ofert, 609 zdjęć, 38 map,
  218 s, commit bota `chore(data): sync ofert 2026-10-02`; `/{NUMER}` →
  301 → detal 200 na `nowa.`; `test:smoke:prod` 49/49; wartość sekretu
  `SYNC_AGREEMENT_SIGNAL` poprawiona (objaw: W1 ×37); klucze R2
  wymienione. Stan ostrzeżeń w raportach: W2 ×3 (spodziewany szum, do
  rozmowy z klientką w Etapie 7), W3 ×1. Pkt 4 z 2.11 (noc bez zmian)
  POTWIERDZONY 2026-10-02: bieg planowy wystartował 08:27 UTC (cron stoi
  na 02:15 UTC — bieg o 02:15 nie wystąpił, opóźnienie ok. 6 h, znana
  cecha harmonogramów GitHuba; harmonogram bez zmian, ewentualna korekta
  godziny to osobna decyzja — Z5), 71 s, „bez zmian", 46 ofert widocznych
  (poprzednio 46), bez commita bota. Bieg 2026-10-03 — do dopisania.
- **Etap 3 (testy/CI na szkielecie) — WYKONANY** (2026-10-02, PR #11 +
  commit budżetów LHCI): `tests/helpers/offers.ts` w pełnej wersji (odczyt
  typowany `readOffersTyped(source)` po schemacie strict, buforowany;
  `pickOffer`/`pickOffers`/`filterOffers`/`matchesCriteria` z kryteriami
  `status`, `mainType`, `transaction`, `market`, `withVideo`, `withTour`,
  `withPlan`, `floor` (`0` = parter), `withPreviousPrice`,
  `priceOnRequest`, `minPhotos`, `where`; `describeCriteria`; dotychczasowe
  eksporty bez zmian); `guards.ts`: `useMediaStub()` (zaślepka
  `page.route` na `MEDIA_BASE`, używana w `offers-skeleton`, `a11y`,
  `seo`), `assertVisualFixture` wzmocniony — zbiór numerów kart pierwszej
  listy typ×transakcja = fixture ORAZ sonda lokalnej kopii zdjęcia
  (`/media/…webp` → 200; sama liczność kart przepuszczała dist z `data/`);
  `a11y`: pierwsza lista i detal z `data/` (allowlista PUSTA, szkielet
  bez naruszeń); `seo`: canonical/og:url i brak noindex pierwszej listy
  i detalu, crawl linków obejmuje pierwszą listę; `smoke`: asercja
  `x-robots-tag: noindex` fazy podglądu (tylko z `BASE_URL`; w Etapie 8
  odwracana na apeksie); nowe unit: `offers-helpers` (kryteria na danych
  syntetycznych, pokrycie wariantów `selection.json` na fixture),
  `visual-fixture` (dist z `build:visual` = fixture co do detali, kart
  i lokalnych mediów; skip bez `dist/media/`; w `ci.yml` bramkuje w jobie
  `e2e` po `build:visual`); baseline'y: darwin 18 PNG (`chrome`,
  `not-found`, 6 profili) z pierwszego `pnpm test:visual:update`, linux
  18 PNG z workflow `update-visual-baselines.yml` (bot-commit na branchu
  PR-a), progi bez zmian (0,0005 / fullPage 0,001), masek wideo nie ma
  (szkielet bez wideo); `ci.yml`: job `lighthouse` sam robi
  `pnpm build:visual` (mierzy build z fixture'u); workflow
  `lhci-measure.yml` (`workflow_dispatch`, 5 przebiegów × 2 configi →
  `scripts/lhci-median.mjs` → mediany w podsumowaniu biegu i artefakcie
  `lhci-measure`; uruchamialny dopiero, gdy plik jest na main);
  `lhci-median.mjs` liczy próg LCP = max(×1,15; +1 300 ms) i medianę
  rozmiaru fontów; `prod-smoke.yml` już celował w `nowa.` — bez zmian.
  BUDŻETY LHCI (ratchet) z pomiaru na runnerze 2026-10-02 (mediany:
  mobile LCP 1 808 ms, desktop 411 ms, TBT 0, CLS 0,0017/0,0032, script
  4 KB, total 130 KB, fonty 4 pliki / 67 KB): mobile perf ≥ 0,9, LCP
  3 200, TBT 150, CLS 0,05, script 30 000 B, total 1 000 000 B, fonty 4 /
  76 000 B; desktop perf ≥ 0,95, LCP 1 800, TBT 100, reszta jak mobile
  poza total 1 200 000 B; `font:count` z warn na error. Ruleset
  `main-protection`: required `quality` + `e2e` + `lighthouse` (pkt 6
  wykonany przez API). Weryfikacja: format/lint/typecheck, unit 312
  (+2 skip), build 89 stron, `test:dist` 6/6, e2e 235 (+155 skip
  profili), `test:visual` 18/18 ×2, trzy joby CI zielone na PR,
  `prod-smoke` po merge'u zielony; budżety sprawdzone lokalnie
  (`lhci collect` ×1 + `assert` na obu configach — czysto). DECYZJE
  W TRAKCIE: (1) `visual-fixture.test.ts` biegnie w jobie `e2e`, nie
  w `quality` (tam dist nie istnieje); (2) pomiar LHCI jako osobny
  workflow, nie input `ci.yml`; (3) TBT z mediany 0 dostał ręczne minimum
  150/100 ms; (4) wagi zasobów z zapasem na przyrost widoków (script
  30 KB, total 1,0/1,2 MB) — przekroczenie przez widok = decyzja, nie
  ciche podniesienie. UWAGI dla Etapu 4: (1) specy widoków biorą oferty
  przez `pickOffer` + `test.skip`; (2) adres stałej listy i detalu
  z fixture'u do `lighthouserc*.cjs` po 4.2/4.3 i ponowny pomiar
  `lhci-measure.yml`; (3) wynik pierwszego crona syncu (2026-10-03, pkt 4
  z 2.11) do dopisania pod wpisem S2c.

- **Etap 4 / 4.1 (chrome globalny) — WYKONANY** (2026-10-02, PR #13,
  gałąź `feat/chrome`, mini-analiza `docs/analiza-chrome.md` zaakceptowana):
  `Navbar.astro` w wyglądzie docelowym — logo w dwóch wariantach
  (WebP z Etapu 0; eksport designu NIE ma SVG, wektor zostaje na Etap 6),
  6 pozycji z efektem liter generowanym w Astro (`.hn-ch`/`.hn-sp`,
  `aria-label`, ruch tylko bez `prefers-reduced-motion`), telefon przez
  slot; wariant „/" (`data-scroll-nav` + `data-hero` w SSR, tylko
  `HOME_PATH`): przemalowanie POZYCJĄ SCROLLA z progiem liczonym
  z `innerHeight` (`NAV_HOME_FADE_START = 0.32`, koniec = h − pasek,
  smoothstep, pętla rAF z dociąganiem `NAV_HOME_LERP`, zmienne CSS
  `--nav-*` na nagłówku; `<noscript>` przywraca pełny pasek);
  mechanizm `[data-navref]`/`NAV_SOLID_HERO_PAD_PX` z Etapu 0 usunięty;
  sheet bez zmian mechaniki (overlay.ts), podkład `.96`; `Footer.astro`
  wg designu per breakpoint (mobile: logo + telefon, hasło, przyciski
  „Zadzwoń"/„Napisz" ze slotami `data-fill="href"`, pastylki mapy strony;
  desktop: hasło, telefon, CTA, linki wersalikami) + ROZJAZD R1
  rozstrzygnięty na rzecz bazy wiedzy: wiersz `Firma:` z nazwą
  rejestrową, siedzibą (pola `seat*` w `BUSINESS`, `jsonld.ts`; węzły
  JSON-LD bez zmian), NIP, REGON oraz wiersz `E-mail:` ze slotem `biuro`;
  rok © z `BUILD_NOW`; etykiety α .7 (design .45 < AA). Testy:
  `navigation.spec` zaadaptowany i rozszerzony (wariant „/", zamknięcie
  sheetu przy przejściu na desktop, litery + punktowy test `reduce`
  z komentarzem, stopka z kompletem danych, przyciski bez JS →
  `/kontakt/`), `chrome.spec` +3 zrzuty (`chrome-home-top`,
  `chrome-home-solid`, `chrome-footer` z ukrytym paskiem). Weryfikacja
  lokalna: format/lint/typecheck, unit 312 (+2 skip), build 89 stron,
  `test:dist` 6/6, e2e 268 na 6 profilach zielone (axe 0 naruszeń po poprawce
  kontrastu przycisku „Zadzwoń"), `test:visual` 31 czerwonych
  OCZEKIWANYCH (18 nowych zrzutów bez baseline'u + 13 rozjazdów:
  `chrome-bar` ×3, `chrome-sheet` ×3, `not-found-full` ×6,
  `not-found-top` 1366; pomiar progiem 0: `not-found-top` różni się
  o ok. 830–900 px także na 1920/firefox, czyli POD progiem — stąd
  zalecany tryb `all` dla workflow linux). PLACEHOLDER (U9): hasło
  stopki, CTA „Skontaktuj się z nami"/„Zadzwoń"/„Napisz", „Przeglądaj
  oferty", linia „Realizacja", pisownia nazwy w ©. Budżety LHCI
  (z `dist` po `build:visual`): patrz raport sesji; progi nietknięte.
  Baseline'y linux (workflow) i darwin wgrane w PR #13; po merge'u
  `prod-smoke` zielony (bieg 2026-10-02 11:06 UTC na commicie #13).
  Porządek po cronie: bieg 2026-10-03 — do dopisania (patrz wpis S2c).

- **Etap 4 / 4.2 (a) (`/oferty/`: trasy SSG + karta + lista bez wyspy) —
  WYKONANY** (2026-10-02, PR #14, gałąź `feat/oferty`, mini-analiza
  `docs/analiza-oferty.md` zaakceptowana w całości — podział (a)/(b)/(c),
  Preact w (a), M3a „Archiwalne”, M3b wszystkie statusy włączone, winda
  „Nie” = wyłącznie `elevators === 0`, wszystkie karty w HTML, kopia
  reguły ścieżki slugów w `src/lib`, wariant `card` 720×480 cover,
  pigułki rodzajów jako linki): integracja `@astrojs/preact` 5.1.5 +
  `preact` 10 (Astro 6 wymaga linii 5.x; 6.x ciągnie Vite 8) oraz
  `vite` 7.3.5 w devDependencies (bez tego peer-y `@tailwindcss/vite`
  i `vitest` przeskakiwały na Vite 8 i `astro check` padał na typach);
  `jsx: react-jsx` + `jsxImportSource: preact` w `tsconfig.json`;
  `src/lib/offers/`: `location-path.ts` (kopia `locationPath`/`leafId`
  z syncu + `matchesLocation` — prefiks po segmentach),
  `index-entry.ts` (`INDEX_FIELDS`, `toIndexEntry`, `toIndexText`,
  `buildIndex`), `filters.ts` (komplet filtrów part2 §4.2 + status,
  `parsePath`/`parseSearch`/`serializeSearch` z polskimi parametrami,
  `sortEntries` z grupowaniem transakcji po cenie, `paginate` 12,
  `statusCounts`, `runSearch`, macierz pól per typ `isFieldRelevant`,
  nieznany typ/transakcja w parametrze → `invalid` = 0 wyników),
  `text.ts` (`normalizeText`), `offers-ui.ts` (etykiety, nagłówki list,
  `cardFacts`/`cardBadges`/`cardKicker`); `format.ts` +
  `TYPE_LABEL_PLURAL`, `formatKindPlural`, `formatYear`,
  `TRANSACTION_LABEL`; `img.ts`: `card` =
  `width=720,height=480,fit=cover`; tokeny `--disabled` i `--copper-text`
  (#965d1c, 5,4:1) w `global.css`; `src/components/offers/`:
  `OfferCard.tsx` (Preact SSR, zero JS; wejście = wpis indeksu),
  `icons.ts` (19 ikon designu), `offers.css`, `OffersListPage.astro`
  (h1 + licznik, pigułki rodzajów typ×transakcja z licznikami, pastylki
  lokalizacji rodzaju, pigułki statusu z licznikami jako region
  przewijany, WSZYSTKIE karty trasy posortowane „najnowsze”, stan bez
  ofert, CTA ze slotem `data-tel`); `src/pages/oferty/index.astro`
  i gałąź listy `[...path].astro` (detal = szkielet bez zmian);
  endpointy `index.json.ts` (46 ofert ≈ 48 KB, wpisy + drzewo)
  i `index-text.json.ts` (≈ 148 KB), poza sitemapą; `lighthouserc*.cjs`
  dostały `/oferty/mieszkanie-na-sprzedaz/`. Testy: unit `offers-filters`,
  `offers-index`, `offers-location-path`, `offers-format` (+2);
  e2e `oferty.spec.ts` (18 testów, chromium-1920); visual
  `oferty.spec.ts` (3 zrzuty × 6 profili). Weryfikacja lokalna:
  format/lint/typecheck, unit 356 (+7 skip), build 89 stron, `test:dist`
  6/6, e2e 285 (+255 skip profili) na 6 profilach — zielone; a11y 0
  naruszeń po dwóch poprawkach (kontrast kicker/numer/tag/plakietka
  „Rezerwacja”, `tabindex` regionu pigułek); `test:visual`: 18
  czerwonych OCZEKIWANYCH (nowe zrzuty bez baseline’u), chrome i 404
  bez rozjazdu; LHCI lokalnie (1 przebieg, oba configi) — asercje
  czyste. ROZJAZDY poza mini-analizą: R17 kolory designu poniżej AA
  zastąpione tokenami (sections.md); nawigacja (a) to pigułki RODZAJÓW
  (typ × transakcja z ≥ 1 ofertą) zamiast osobnych pigułek typu
  z domyślną sprzedażą — bez ślepych linków. Zużycie budżetów LHCI po
  `build:visual`: patrz raport sesji. PLACEHOLDER (U9): teksty CTA,
  „Zdjęcia wkrótce”, stan bez ofert, szablon meta description list.
  Baseline’y linux (workflow z brancha, spec `oferty.spec.ts`, mode
  `changed`) i darwin (18 + 18 PNG) wgrane w PR #14; merge 2026-10-02
  15:02 UTC, `prod-smoke` zielony, bramka bota na nowym `main` (unit 356,
  build 89 stron, `test:dist` 6/6) zielona. PO MERGE'U (gałąź
  `chore/sync-location-path`): reguła ścieżki slugów ma JEDNO źródło
  `src/lib/offers/location-path.ts` — `scripts/sync/locations.ts`
  importuje i re-eksportuje (`locationPath`, `leafId`,
  `communeIsCityPart`); zachowanie bez zmian (unit 356 zielone, w tym
  `sync-locations` i test spójności z `locations.json`). PR #15
  zmergowany 2026-10-02 15:38 UTC, `prod-smoke` zielony, bramka bota
  potwierdzona. Pierwszy bieg
  syncu po tej zmianie = cron 2026-10-03 (sprawdzić: „bez zmian",
  brak commita bota). DALEJ: (b) wyspa (`feat/oferty-wyspa`) i (c)
  mobile — kolejne sesje 4.2 (prompt lokalny
  `docs/plan/prompt-etap-4-2b.md`); przed (b) decyzja o wpisach do
  `selection.json` (≥ 13 ofert, oferta z windą, lokal na wynajem).
  Porządek po cronie: bieg 2026-10-03 — do dopisania.

- **Etap 4 / 4.2 (b) (`/oferty/`: wyspa wyszukiwarki) — W TOKU**
  (2026-10-02, gałąź `feat/oferty-wyspa`, plan §12 w `docs/analiza-oferty.md`
  zaakceptowany w całości; kod kompletny, czeka na commity, fixture
  i baseline'y): `src/components/offers/SearchIsland.tsx` (`client:load`
  w `OffersListPage.astro`) + `search-panel.tsx`, `combobox.tsx`,
  `sort-listbox.tsx`, `pagination.tsx` — nagłówek z licznikiem
  (`aria-live`), panel podstawowy + rozszerzony (17 filtrów, chip
  lokalizacji z autocomplete offline z `info`, ulica w kaskadzie, pola
  zależne od typu znikają), pigułki statusu jako przełączniki z licznikami
  na żywo, listbox sortowania z klawiatury, paginacja `?strona=N`
  (wszystkie numery, prawdziwe linki), stan zero wyników (`ZERO_RESULTS`),
  skeleton tylko gdy stanu nie da się policzyć z propsów; hydratacja na
  markupie SSR (stan początkowy `parseSearch(pathname, "")` po obu
  stronach, `location.search` czytane po montażu; zero mutacji siatki =
  kontrakt e2e); propsy = wpisy trasy + drzewo lokalizacji, `/oferty/`
  nie pobiera indeksu, listy SSG dociągają `index.json` w idle,
  `index-text.json` przy pierwszym „szukaj w opisie"; panel = draft
  (mapa parametrów → `parseSearch`), „Pokaż N ofert" (`formatShowCount`,
  biernik) i Enter stosują, „Wyczyść" zeruje i stosuje; `pushState` przez
  `targetPath()` (typ ∧ transakcja → ścieżka SSG, liść drzewa z listą →
  segment slugu, inaczej `?lokalizacja=`), `popstate`; SSR: karty od 13.
  `hidden`, `<noscript><style>` odkrywa je i chowa panel/paginację/sort,
  nawigacja (a) zostaje < 1025 (panel tylko ≥ 1025, W PARZE
  z `DESKTOP_MIN_PX`). `filters.ts`: `locationSlug` (segment adresu
  listy = dopasowanie DOKŁADNE, R18; `resolveSlug` usunięty), pusty
  `status=` przeżywa serializację, `targetPath()`; nowe
  `src/lib/offers/locations-ui.ts` (podpowiedzi), `enums.ts` (słowniki
  wartości bez zoda — `schema.ts` re-eksportuje; zod w bundlu dawał
  +75 KB), `format.ts` + `formatShowCount`, `offers-ui.ts` + `PANEL`,
  `MARKET_LABEL`, `FURNISHED_LABEL`; `OfferCard.tsx` tylko poprawka
  sąsiednich węzłów tekstowych (hydratacja). Testy: unit `offers-filters`
  (+5), `offers-format` (+1), nowy `offers-locations-ui` (6) — 372 (+2
  skip); e2e nowy `oferty-wyspa.spec.ts` (15 testów, chromium-1920),
  `oferty.spec.ts` zaadaptowany (nawigacja (a) w DOM, widoczna < 1025;
  plakietki `toHaveCount`); visual `oferty.spec.ts` +5 zrzutów
  (`oferty-panel`, `oferty-panel-more` tylko ≥ 1025; `oferty-list-filtered`,
  `oferty-zero`; `oferty-pagination` skip dopóki fixture ≤ 12 ofert).
  Weryfikacja lokalna: format/lint/typecheck, unit 372, build 89 stron,
  `test:dist` 6/6, e2e 298 (+320 skip profili) na 6 profilach, axe 0
  naruszeń (po poprawkach: „Pokaż" `--ink` na miedzi, strzałki paginacji
  bez `aria-label` na spanie); `test:visual` 24 czerwone OCZEKIWANE
  (18 nowych zrzutów bez baseline'u + `oferty-list` i
  `oferty-list-location` na 3 profilach desktop), chrome i 404 bez
  rozjazdu; pomiar progiem 0 na mobile: 7/9 identyczne, 2 po 4 i 10 px
  → workflow linux w trybie `changed`. BUDŻET WYSPY (R19, `build:visual`):
  kod wyspy 32,8 KB brutto / 11,9 KB gzip, Preact + hooks + renderer
  15,8 KB / 7,0 KB, razem 48,7 KB / 19,0 KB; cały `script` na `/oferty/`
  56,7 KB / 22,3 KB (gzip -9); LHCI lokalnie (1 przebieg, oba configi,
  asercje czyste) liczy `script` na `/oferty/` jako 25 889 B = 86 %
  bramki 30 000 B (ZBLIŻENIE — do decyzji przy kolejnych skryptach),
  `total` 458 KB (46 % mobile / 38 % desktop), TBT 0, CLS 0,003, LCP
  desktop 528 ms; propsy `client:load` w HTML: `/oferty/` na fixture
  79,6 KB / 12,1 KB. DECYZJE W TRAKCIE (R18–R25 w analizie §12.3 i §12.9):
  `client:load` zamiast `idle`; slug dokładny; budżet czytany po gzipie
  (do potwierdzenia); „Wyczyść" stosuje; podpowiedzi tylko
  miejscowość/dzielnica/poddzielnica; zero wyników już w (b); słowniki
  w `enums.ts`. DO ZROBIENIA PRZEZ MATEUSZA: `selection.json` +
  `SW803370`, `SW149199`, `SW622811` → `pnpm fixtures:build` → aktualizacja
  liczb w teście `liczniki na fixture` (`offers-filters.test.ts`) →
  baseline'y linux (workflow, spec `tests/visual/oferty.spec.ts`, mode
  `changed`) → darwin → PR. (c) = sheety mobile, Filtruj/Sortuj,
  siatka/lista, stany brzegowe. Porządek po cronie: bieg 2026-10-03 —
  do dopisania (w chwili końca sesji nie wystąpił).

## Dokumentacja

- Indeks i statusy plików: `docs/README.md` (tam też kolejność lektury
  dla nowej sesji).
- Codzienny proces pracy: `docs/daily-workflow.md`.
- Zadania cykliczne i świadomie odłożone: `docs/optional-todos.md`.
- Design-referencje: `docs/design/README.md` + 9 plików HTML eksportu.
- Reguły szczegółowe: `.claude/rules/` — `testing.md`, `sections.md`,
  `scroll.md`, `capture-scripts.md`, `data-sync.md`.
- TYLKO LOKALNIE (poza gitem): instrukcja wykonawcza i prompty etapów
  w `docs/plan/`, baza wiedzy w `docs/kb/`. Kopia źródłowa obu katalogów
  leży poza repo; brak tych katalogów w świeżym klonie jest stanem
  oczekiwanym — poproś Mateusza o ich dostarczenie.
