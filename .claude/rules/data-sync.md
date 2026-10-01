---
paths:
  - "scripts/sync/**"
  - "src/lib/offers/**"
  - "data/**"
  - "tests/fixtures/offers/**"
  - ".github/workflows/sync.yml"
---

# Dane ofert i sync — reguły

Oferty pochodzą z systemu CRM klientki. Nocny sync pobiera je, przepuszcza
przez allow-listę, normalizuje do schematu `Offer`, kopiuje zdjęcia do
zasobnika mediów i zapisuje `data/*.json`; build czyta wyłącznie te pliki.
Szczegóły (katalog pól, schemat, reguły statusu, kolejność kroków):
`docs/kb/` part3 i `docs/plan/` Etap 2 — dokumenty lokalne, poza repo.

STAN po S2b (Etap 2, kroki 2.1–2.7): istnieją allow-lista, schemat,
parser statusu, normalizacja, sanityzacja, lokalizacje, adresy, rejestr
adresów, generator `_redirects`, klient API, widoczność, zdjęcia → R2,
mapy → R2, raport i `imgAt()` (mapa niżej). Orkiestracja (`pnpm sync`,
`sync:dry`, `fixtures:build` nadal zaślepki), `data.ts`, szkieletowe
trasy ofert i workflow `sync.yml` dochodzą w S2c. Katalogu `data/` nie ma.

## Mapa kodu (S2a + S2b)

| Plik                              | Rola                                                                                                                                                                                                                                                                                                                                       |
| --------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `src/lib/offers/public-fields.ts` | `PUBLIC_FIELDS`, `CONTROL_FIELDS`, `FORBIDDEN_FIELDS`, `pickPublic()`, `pickControl()`, `findForbiddenKeys()` (skan głęboki)                                                                                                                                                                                                               |
| `src/lib/offers/schema.ts`        | Zod strict: `OfferSchema` (pełny, po kroku zdjęć), `NormalizedOfferSchema` (wynik normalizacji — zdjęcia bez `r2Key/etag/width/height`), `LocationsFileSchema`, `UrlLedgerSchema`, `LegacyRedirectsSchema`, `PhotosFileSchema` (`data/photos.json`), `MapsFileSchema` (`data/maps.json`), wzorce `PHOTO_R2_KEY`, `MAP_R2_KEY`, `COORD_KEY` |
| `src/lib/offers/map-key.ts`       | `coordKey(lat, lon)` — klucz punktu (5 miejsc ≈ 1 m) współdzielony przez sync i stronę; mapa oferty = `maps[coordKey(...)]`                                                                                                                                                                                                                |
| `src/lib/img.ts`                  | `imgAt(r2Key, "card" \| "hero" \| "og")` → `{MEDIA_BASE}/cdn-cgi/image/{opcje}/{r2Key}` (stały `format=webp`, `onerror=redirect`); dev → `mediaUrl()` (oryginał); `MEDIA_SOURCE=fixture` → `/media/{klucz}.webp`                                                                                                                           |
| `src/lib/offers/status.ts`        | `parseTitle()` — status z prefiksu tytułu (D38), plakietka „0% prowizji", `unknownPrefix` (W5)                                                                                                                                                                                                                                             |
| `src/lib/offers/format.ts`        | ceny, m², piętra (`0` = parter), liczebniki                                                                                                                                                                                                                                                                                                |
| `src/lib/offers/urls.ts`          | `offerPath()`, `listPath()`, `shortPaths()`; wzorzec adresu tylko w `routes.ts`                                                                                                                                                                                                                                                            |
| `src/lib/offers/slug.ts`          | `slugify()` (bez diakrytyków)                                                                                                                                                                                                                                                                                                              |
| `src/lib/offers/redirects.ts`     | czysta funkcja `_redirects` (rejestr + dawne adresy + 3 reguły stałe; wyłącznie statyczne 301)                                                                                                                                                                                                                                             |
| `src/integrations/redirects.ts`   | integracja Astro `astro:build:done` → `dist/_redirects` z `OFFERS_DATA_DIR`; brak plików = reguły stałe; zły kształt = build pada                                                                                                                                                                                                          |
| `scripts/sync/normalize.ts`       | `normalize(raw, { dictionary, agreementSignalId? })` → `{ offer, warnings }`; `NormalizeError` (pole + numer poza `message`)                                                                                                                                                                                                               |
| `scripts/sync/dictionary.ts`      | kształt słownika API i `lookup()`; słownik jest PARAMETREM (pobieranie: 2.4)                                                                                                                                                                                                                                                               |
| `scripts/sync/dates.ts`           | daty API → ISO 8601 z offsetem Europe/Warsaw (bez biblioteki)                                                                                                                                                                                                                                                                              |
| `scripts/sync/sanitize.ts`        | whitelista tagów, `style` → klasy (`ta-center`, `ta-justify`, `u`), `<br />` → `<br>`, serie `<br>` ≤ 2                                                                                                                                                                                                                                    |
| `scripts/sync/locations.ts`       | `buildLocations(offers)` → drzewo z nazw, liczniki, ulice, kolizje slugów adresowych (`-2` + `SLUG_COLLISION`)                                                                                                                                                                                                                             |
| `scripts/sync/ledger.ts`          | `updateLedger()` — rejestr `data/url-ledger.json`, tylko dopisuje                                                                                                                                                                                                                                                                          |
| `scripts/sync/warnings.ts`        | kody `W1`–`W6`, `MAIN_PICTURE`, `VIDEO_LINK`, `DESCRIPTION_DIFF`, `DICT_MISS`, `STREET_TYPE`, `SLUG_COLLISION`, `PHOTO_FETCH`, `MAP_FETCH`; `summarize()` = wersja publiczna                                                                                                                                                               |
| `scripts/sync/esti-client.ts`     | `createEstiClient({ company, token, fetch?, sleep? })` → `basicList(statuses?)`, `listAll()` (take=100, skip do `totalCount`), `dictionary()`; `x-ratelimit-remaining: 0` → odczekanie; jedno ponowienie po 429/5xx/sieci; `EstiApiError` zna tylko ścieżkę endpointu i kod HTTP                                                           |
| `scripts/sync/visibility.ts`      | `isVisible(rec, rule = VISIBILITY_RULE)` (Z9, stała w `site-config.ts`), `ALL_STATUSES`, `exportWarning()` (W4), `diffVisibility(prevNumbers, currNumbers, basicListAll)` → `{ gone, appeared }` do raportu prywatnego                                                                                                                     |
| `scripts/sync/photos.ts`          | `syncPhotos({ offers, manifest, previousStatus?, store, today })`: If-None-Match → 304/200, sha256, wymiary (sharp, orientacja EXIF), klucz `offers/{crmId}/{id}-{sha256[:8]}.jpg`, pula ≤ 4, W6, `PHOTO_FETCH`; zwraca `Offer[]` po walidacji strict i manifest                                                                           |
| `scripts/sync/r2.ts`              | `createS3Client`, `createR2Store(bucket, client)` (put/list/remove, `stats`), `createDryRunStore()`, `planCleanup`/`cleanupGone` (30 dni od `goneSince`, także klucze z `replaced`), `findOrphans`                                                                                                                                         |
| `scripts/sync/maps.ts`            | `syncMaps({ offers, manifest, store, apiKey, today, marker? })`: jedno żądanie Geoapify per `coordKey`, PNG → WebP bez kadrowania (pasek atrybucji), klucz `maps/{hash16}.webp` z trybu `MAP_MARKER`, `MAP_FETCH`; bez geokodowania (schemat wymaga współrzędnych)                                                                         |
| `scripts/sync/report.ts`          | `publicSummary()` (log Actions; strażnik `redactPublic()` wycina numery, adresy, `token=`), `privateReport()` (text + html), `sendReport({ apiKey, to, from })` przez Resend (fetch, bez SDK)                                                                                                                                              |
| `scripts/collect-legacy.ts`       | `pnpm redirects:legacy --from-file` albo `--from-site` → `data/legacy-redirects.json` (uruchamia Mateusz)                                                                                                                                                                                                                                  |
| `scripts/probe-redirects.ts`      | `pnpm test:redirects:prod` — sonda HEAD/GET na hoście z `BASE_URL`                                                                                                                                                                                                                                                                         |
| `tests/fixtures/raw/`             | dane SYNTETYCZNE o kształcie API (`synthetic-list.json`, `dictionary-synthetic.json`), realne tytuły bez numerów (`titles-45.json`), przycięty HTML listy (`lista-fragment.html`); czyta je `tests/helpers/raw.ts`                                                                                                                         |

Konwencje kodu:

- **Ostrzeżenie = `{ code, message, number?, detail? }`.** `message` jest
  publiczne i NIGDY nie zawiera numeru oferty ani wartości pól
  kontrolnych; `number` i `detail` idą wyłącznie do raportu prywatnego.
  Do logu Actions trafia tylko `summarize()` (kody + liczności).
- **Id sygnału umowy (W1/W2) nie jest w repo** — `normalize` dostaje go
  w `agreementSignalId`; brak = W1/W2 nie są liczone. Jest to wartość pola
  z `FORBIDDEN_FIELDS`, więc obowiązuje zasada twarda nr 4. Konwencja od
  S2a: wartość niesie zmienna środowiskowa `SYNC_AGREEMENT_SIGNAL` (sekret
  Actions; lokalnie plik `~/.config/hetman/esticrm.env`), czytana
  wyłącznie w orkiestracji syncu (2.8). Nazwa zmiennej może być w kodzie
  i logach, wartość — nigdy.
- **Slug adresowy ≠ id węzła.** `location.slug` (segment adresu, z
  `placeName`) rozstrzyga `buildLocations()` na całym zbiorze; id węzła
  drzewa to ścieżka slugów (`wielkopolskie/poznan/poznan/stare-miasto/…`).
- **Pliki danych bez znaczników czasu przebiegu** (`locations.json` bez
  `version`) — commit bota ma powstawać tylko przy zmianie treści.
- **Skrypty syncu importują z `src/lib/` ścieżkami względnymi** (tsx nie
  zna aliasu `@/`).
- **Adres z sekretem żyje tylko w zmiennej lokalnej żądania** (API CRM
  z tokenem, Geoapify z kluczem). Błędy niosą ścieżkę endpointu i kod
  HTTP; obiekt błędu `fetch` nie jest przekazywany dalej (może nieść URL).
  Komunikaty o zdjęciach mogą zawierać adres źródła — host CRM jest
  publiczny i bez tokena.
- **Manifesty bez znaczników czasu przebiegu.** `photos.json`: klucz =
  adres źródłowy zdjęcia; `maps.json`: klucz = `coordKey`. Jedyne daty to
  `goneSince` (od kiedy wpisu nie ma w widocznych ofertach) i `goneSince`
  w `replaced` (stare klucze zdjęcia po zmianie treści). Obiekt w R2
  znika po 30 dniach (`cleanupGone`), bo cache wariantów może go jeszcze
  wskazywać.
- **Zewnętrzne usługi są parametrami** (`fetch`, `sleep`, `store`,
  `apiKey`, `from`) — testy biegną na atrapach; Claude nie wywołuje API
  CRM, Geoapify, R2 ani Resend.
- **Nadawca raportu** to parametr `from` (`REPORT_FROM`, konto Resend
  Mateusza) — adres nie jest wpisany w kod.

## Zasady twarde

- **CRM jest jedynym źródłem prawdy o ofertach.** Treści ofert nie
  redagujemy: dopuszczalna jest sanityzacja HTML i decyzje o prezentacji.
  Status oferty ustawia człowiek — nigdy nie wnioskuj go z tego, że
  oferta zniknęła z danych.
- **Allow-lista, nie blacklista.** Do `data/offers.json` trafiają
  WYŁĄCZNIE pola z `PUBLIC_FIELDS`; wszystko inne sync odrzuca. Nowe pole
  w źródle nie pojawia się na stronie, dopóki ktoś świadomie nie dopisze
  go do listy.
- **`FORBIDDEN_FIELDS` to kontrakt testowy.** Żadna nazwa z tej listy nie
  może wystąpić jako klucz w danych publicznych (skan głęboki, na `data/`
  i na fixture). Wartości tych pól nie wolno wpisywać NIGDZIE: w kodzie,
  testach, fixture, logach, dokumentach, komunikatach commitów
  i odpowiedziach w sesji.
- **Surowa odpowiedź API żyje wyłącznie w pamięci procesu syncu** — nigdy
  na dysku runnera, w artefakcie, w logu ani w repo.
- **Dane pisze wyłącznie skrypt:** pliki w `data/` zapisuje bot syncu,
  katalog `tests/fixtures/offers/` buduje `pnpm fixtures:build`. Żadnych
  ręcznych edycji (blokada w `.claude/settings.json` i hook
  `guard-data.sh`). Dwa wyjątki: `tests/fixtures/offers/selection.json`
  (lista numerów ofert i nadpisań — pisany ręcznie, to WEJŚCIE skryptu)
  oraz `data/legacy-redirects.json` (buduje go skrypt uruchamiany przez
  Mateusza, w osobnym PR).
- **API: wyłącznie `GET`, wyłącznie przez `scripts/sync`.** Adres
  zapytania niesie token — nigdy nie loguj URL-a ani obiektu błędu, który
  go zawiera. Claude nie wywołuje API: pracuje w trybie `--source=file` na
  danych syntetycznych; przebiegi z API uruchamia Mateusz.
- **Logi GitHub Actions są PUBLICZNE** (repo publiczne). Do logu idą
  wyłącznie kody ostrzeżeń i liczności. Numery ofert niewidocznych na
  stronie, ich statusy i pola kontrolne — tylko w raporcie mailowym.
- Nie czytaj `.env*`, `~/.config/hetman/` ani `**/devtools/api/**`.

## Odporność

- **Zero ofert to stan dopuszczalny dla BUILDA** (brak `data/` = pusta
  lista, strona się buduje), ale **niedopuszczalny dla SYNCU**: zero
  ofert albo spadek o ponad połowę przerywa sync bez zapisu (bezpiecznik;
  obejście tylko świadomym `force`).
- Oferty w testach czyta się wyłącznie przez `tests/helpers/offers.ts`;
  test zależny od składu ofert robi `test.skip` z jawnym powodem.
- Bramka syncu (testy + build + skan `dist`) stoi w `sync.yml` PRZED
  commitem — commit bota omija PR i required checks.
- Zmiana schematu `Offer` albo allow-listy = jeden PR obejmujący listę
  pól, schemat, normalizację, testy kontraktu i przebudowany fixture;
  schemat czyta stary kształt do czasu pierwszego syncu (nowe pola jako
  opcjonalne).
- Wartość `0` jest daną, nie brakiem (piętro 0 = parter) — nie testuj pól
  liczbowych przez `falsy`.
