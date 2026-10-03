# Mini-analiza 4.3 — detal oferty + strona 404 świadoma ofert

> **Status:** ZAAKCEPTOWANA 2026-10-03 (wszystkie rekomendacje §0 i §6),
> część (a) W REALIZACJI na gałęzi `feat/oferta`. Część 4.3 Etapu 4 wg instrukcji
> wykonawczej (dokument lokalny, `docs/plan/`) — tabela 4.3, „Kontrakty
> poza widokiem", „Zasada rozjazdów"; prompt §4.3 z `etap-4-prompty.md`.
> Referencja wyglądu: `docs/design/export/oferta.html` (gałęzie `.br-m`
> i `.br-d`), `assets/js/site.js` §6 (galeria/lightbox — wyłącznie UI),
> `assets/css/site.css`. Baza wiedzy — odsyłacze sekcją, bez cytowania:
> part2 §5 (sekcje detalu), §6 (zdjęcia), §12 (inwentarz designu), §3
> (model); part3 §6.1 (19 wierszy), §6.2 (pola bez miejsca w designie),
> §6.3 (agent), §3.1 i §3.3 (zdjęcia, stemple), §5 (opis), §2.4–2.5
> (daty, cena). Decyzje: D17, D29, D31, D32, D36, D37, O5, O7, O9, U12.
> Spójność z 4.1 (`analiza-chrome.md`: pasek fixed i `--hdr-h`, sheet na
> `overlay.ts`, sloty kontaktowe) i 4.2 (`analiza-oferty.md`: karta,
> `imgAt`, statusy, R4/R5/R9, §12 budżet, §13 sheety poza vdom).

## 0. Zakres i podział na PR-y

Część 4.3 ma dwanaście niezależnych klocków (galeria, lightbox, meta,
kotwice, wiersze danych, opis, osadzenia, mapa, karta agenta, panel/pasek,
druk, 404, meta/OG/JSON-LD). Kod detalu jest czystym Astro + małym TS —
bez Preact (jedyna wyspa projektu zostaje w 4.2), więc nie ma ryzyka
hydratacji jak w (b). Ryzyko leży w LICZBIE kontraktów i zrzutów.

| PR | Gałąź | Zakres | Co widać na `nowa.` po merge'u |
| --- | --- | --- | --- |
| (a) | `feat/oferta` | układ detalu w wyglądzie docelowym: nagłówek (kicker, h1, lokalizacja, cena, plakietka statusu), galeria (hero + kafle 2×2 + miniatury; mobile karuzela snap), meta (kopiuj numer, „Dodano", udostępnij, kopiuj link, Drukuj/PDF), pasek kotwic, 4 skróty, **`details-rows.ts`** (tabela z deklaratywnej listy), opis z „Czytaj więcej", film i spacer po kliknięciu, mapa statyczna, sekcja kontaktowa z kartą agenta (miejsce na formularz 5B), panel boczny / pasek dolny, okruszki, meta/OG/JSON-LD per oferta, adresy detali w `lighthouserc*.cjs`, e2e `oferta.spec.ts`, visual 4 warianty | pełny detal; kliknięcie w zdjęcie przewija galerię (lightbox jeszcze nie) |
| (b) | `feat/oferta-lightbox` | lightbox na `overlay.ts` (chunk z dynamicznego `import()`), arkusz druku, 404 świadoma ofert; visual: lightbox, druk, 404 oferty | komplet 4.3 |

**Rekomendacja:** (a) jako pełny, zmergowalny PR w tej sesji; (b) od
razu po merge'u (a), na osobnej gałęzi, w tej samej sesji, jeśli czas
pozwoli (jak (b)/(c) w 4.2). Powód podziału: (a) i (b) rozjeżdżają
różne baseline'y (4 detale vs lightbox/druk/`not-found`), więc dwa PR-y
nie regenerują niczego dwa razy. Jeśli wolisz JEDEN PR — zakres bez
zmian, kolejność pracy ta sama.

## 1. Inwentarz z designu (`oferta.html`)

Makieta ma dwie gałęzie DOM (`.br-m` ≤ 1024 z `-m` w id sekcji, `.br-d`
≥ 1025) — budujemy JEDEN markup; id sekcji bez sufiksów (`#szczegoly`,
`#opis`, `#film`, `#spacer`, `#mapa`, `#kontakt`). Kontener 1360 px,
rogi: zaokrąglony WYŁĄCZNIE lewy dolny (24 px kafle, 12–14 px przyciski).

### 1.1 Nagłówek i galeria

| Element | Mobile (≤ 1024) | Desktop (≥ 1025) | Port |
| --- | --- | --- | --- |
| Hero | pole `clamp(480, 140vw, 600)` wysokości, zdjęcie `cover`, gradient granatowy od dołu; NA zdjęciu: pastylki „FILM"/„360°" (lewy górny), licznik „1 / 19" z aparatem (prawy górny), przyciski ‹ › 44 px (biel .92), u dołu kicker (`--copper-light`), `h1` biały `clamp(24, 6.8vw, 34)`, lokalizacja z pinezką (link do listy), cena `clamp(30, 8.6vw, 42)` 700 + cena/m² | nagłówek NAD galerią: kicker `--copper` 12 px, `h1` granat `clamp(32, 2.9vw, 44)`, lokalizacja 16 px `--slate`; cena `clamp(34, 2.8vw, 42)` 700 granat do prawej + cena/m² `--muted`; siatka 2 kolumn `clamp(400, 36vw, 520)` wysokości: hero (lewa, zoom-in, ‹ ›, pastylki, licznik) + 2×2 kafle (prawa) | jeden `<header>` + jedna galeria; na mobile nagłówek leży ABSOLUTNIE nad dolną częścią hero (gradient), na desktopie statycznie nad siatką. Hero = tor `scroll-snap` ze WSZYSTKIMI zdjęciami (`imgAt(…, "hero")`, pierwsze `eager`+`fetchpriority=high` = LCP, reszta `lazy`), ‹ › przewijają tor, licznik czyta pozycję; pion = `object-fit: contain` na rozmytym tle (`card` tej samej fotografii) — §2 R12. Kafle 2×2 (`card`, zdjęcia 2–5) i miniatury otwierają lightbox (b) / przewijają hero (a) |
| Miniatury | pas przewijany poziomo, kafelki `clamp(72, 20vw, 88)` 3:2, aktywny obrys miedziany 2 px, ostatni = „Wszystkie zdjęcia (19)" | kafelki `clamp(120, 10.3vw, 148)`, ostatni z ikoną aparatu | przyciski `aria-label="Zdjęcie N z M"`, `card`; aktywna miniatura za hero (`aria-current`); „Wszystkie zdjęcia (N)" → lightbox (b), w (a) przewija do pierwszego |
| Rzuty | brak w designie | brak | `kind === "plan"` → osobna sekcja „Rzuty" (kafle `card`, w lightboxie na końcu toru) — part2 §3.5; fixture: SW303888 (nadpisanie `planPhotos`) |

### 1.2 Meta i kotwice

| Element | Design | Port |
| --- | --- | --- |
| Numer | przycisk mono 13 px `--muted` z ikoną kopiowania, `aria-label="Kopiuj numer oferty SW…"` | `<button data-offer-copy="number">` + `role=status` „Skopiowano"; bez JS przycisk ukryty (`<noscript>`), numer widoczny jako tekst |
| „Dodano 28 sie 2026" | 13–14 px `--muted` | `formatDateShort(addedAt)` (`Intl` pl-PL, Europe/Warsaw) — nowa funkcja w `format.ts` |
| Udostępnij | etykieta 12 px wersaliki `--faint` + 3 przyciski 44×44 (Facebook, WhatsApp, X) + „Skopiuj link" + „Drukuj / PDF" (obrys `rgba(24,58,107,.25)`) | linki `<a target=_blank rel=noopener>` do sharerów z ABSOLUTNYM adresem oferty (`Astro.site`); „Skopiuj link" = przycisk (JS); „Drukuj / PDF" = `window.print()` (JS) — §2 R6 |
| Kotwice | pasek `sticky` pod nawigacją, szkło `.88` + blur 16, 48/52 px wysokości, pozycje Szczegóły · Opis · Film · Spacer 360 · Mapa · Kontakt, aktywna = granat + kreska miedziana | `nav[aria-label="Sekcje oferty"]`, `top: var(--hdr-h)`, pozycje warunkowe (Film/Spacer/Mapa tylko gdy dane), podświetlenie przez `IntersectionObserver` (SSR: pierwsza aktywna), `scroll-margin-top: calc(var(--hdr-h) + var(--anchors-h))` na sekcjach; mobile przewijany poziomo |

### 1.3 Treść

| Sekcja | Design | Port |
| --- | --- | --- |
| Skróty (4 kafle) | `--bg-soft`, ikona 20/24 px granat, wartość 15–17 px 600, podpis 12–13 px `--muted`: powierzchnia · pokoje · piętro („2. piętro" / „z 4") · rok | `cardFacts(toIndexEntry(offer))` z `offers-ui.ts` — TA SAMA macierz pól per typ co karta (dom: m² · pokoje · rok · działka; działka: m²); 0–4 kafli |
| Dane szczegółowe | `<dl>` 19 wierszy (`dt` `--muted`, `dd` 600 do prawej, linia `rgba(24,58,107,.1)`); desktop 2 kolumny, `grid-auto-flow: column` | `details-rows.ts` (§3.2); desktop 2 kolumny z liczbą wierszy liczoną z danych (`--rows`) |
| Opis | akapity 15/16 px `--slate`, `max-height` 380/420 + maska gradientowa + „Czytaj więcej" (`aria-expanded`) | `descriptionHtml` przez `set:html` (JEDYNE w projekcie); klasy sanityzera `ta-center`, `ta-justify`, `u` dostają CSS; zwijanie przez `CollapsibleText.astro` + `collapsible.ts` (szablon; skin dopasowany, próg zwijania na obu szerokościach, nie tylko mobile — §2 R15); pusty opis → sekcja i kotwica znikają |
| Film | kafel 16:9, tło `--navy-deep`, pierwsze zdjęcie `.7`, przycisk play 64/68 px miedź, podpis „YouTube · 2:14" | `<a href="https://www.youtube.com/watch?v=…" target=_blank rel=noopener>` jako kafel (bez JS link); JS: klik → `<iframe src="https://www.youtube-nocookie.com/embed/{id}?autoplay=1&rel=0" allow="autoplay; fullscreen; picture-in-picture" title="Film o nieruchomości">` w miejsce kafla; podpis „YouTube" (brak czasu trwania w danych — §2 R5); miniatura = pierwsze zdjęcie oferty z R2 (`card`), NIE z serwerów YouTube |
| Spacer 360° | kafel 16:9, pierwsze zdjęcie `.45`, owal „360°", przycisk „Rozpocznij spacer" | `<a href={tourUrl} target=_blank rel=noopener>` (bez JS); JS: `<iframe src={tourUrl} allow="fullscreen" title="Wirtualny spacer">` — BEZ `microphone` (D32) |
| Mapa | obraz 4:3 (mobile) / 16:9 (desktop) jako przycisk „Pokaż interaktywną mapę", pod nim pinezka + lokalizacja i „Otwórz w mapach ↗" | `maps[coordKey(lat, lon)]` → `<img>` w NATURALNYCH proporcjach (pasek atrybucji nietykalny — §2 R3), `width`/`height` z manifestu; prod: `mediaUrl(r2Key)` (plik już WebP), fixture: kopia lokalna; „Otwórz w mapach" = link do `maps.google.com/?q={lat},{lon}` otwierany po kliknięciu; brak wpisu / `goneSince` → sekcja i kotwica znikają; przycisku interaktywnej mapy NIE MA (`INTERACTIVE_MAP = false`) |

### 1.4 Kontakt, panel boczny, pasek dolny

| Element | Design | Port |
| --- | --- | --- |
| Sekcja kontakt (`#kontakt`) | tło `onas-cta` + gradient granatowy (jak CTA listy), eyebrow „Kontakt w sprawie oferty", `h2` „Zapytaj o tę ofertę", avatar inicjały „JH" 56–60 px miedź, imię 18–19 px, „Pośrednik w obrocie nieruchomościami · lic. 24178", wiersze telefon (`Zadzwoń`) i e-mail (`E-mail`), formularz, „‹ Wróć do listy ofert" | ten sam blok tła co `.ol-cta`; `AGENT` + nowe stałe `role`, `licenseNo` w `site-config.ts`; telefon = slot `a[data-tel]`, e-mail = slot `a[data-mail="joanna"]` (§2 R1); formularz = PUSTE MIEJSCE `[data-offer-inquiry]` (5B); „Wróć do listy ofert" → `listPath(offer, { withLocation: false })` |
| Panel boczny (desktop) | `aside sticky top:160`, biały, cień, „Cena" + kwota 36 px + cena/m², „Zadzwoń" (granat) / „Napisz" (miedź → `#kontakt`), mini-karta agenta, telefon i e-mail | `top: calc(var(--hdr-h) + var(--anchors-h) + 16px)`; „Zadzwoń" = slot `data-tel data-fill="href"` (bez JS → `/kontakt/`); e-mail slot `joanna`; przy `price === null` → „Zapytaj o cenę"; sprzedane wg `SHOW_PRICE_WHEN_SOLD` (§2 R16) |
| Pasek dolny (mobile) | `sticky bottom:0` na końcu `main`, szkło `.9` + blur, 2 przyciski 50 px „Zadzwoń" (granat) / „Napisz" (miedź → `#kontakt`) | jak design (CSS, zero JS): znika razem z końcem `main` (nad stopką); `padding-bottom: env(safe-area-inset-bottom)`; sloty jak wyżej |
| Lightbox (b) | mobile: panel od dołu (`translateY(101%)`), scrim `#08101e .4`, nagłówek „Galeria 1 / 19" + X, tor snap 3:2 + stopka CTA „Zainteresowała Cię ta oferta? Zadzwoń / Napisz"; desktop: pełny ekran `--navy-deep`, tor snap `height: calc(100svh − 260px)`, ‹ › 52 px, ta sama stopka CTA | §3.4 |

### 1.5 Ikony

Nowe względem `icons.ts` (19 z listy): kopiuj (dwa prostokąty), drukarka,
link zewnętrzny ↗, Facebook, WhatsApp, X (wypełnione), play 64 px (jest),
owal „360°" (CSS). Dochodzą do `icons.ts` (ta sama tablica ścieżek).

## 2. Rozjazdy design ↔ baza wiedzy — rozstrzygnięcia

| # | Rozjazd | Rozstrzygnięcie | Źródło |
| --- | --- | --- | --- |
| R1 | Karta agenta i panel boczny pokazują `biuro@…` | **`joanna@`** przez slot `a[data-mail="joanna"]`; `biuro@` zostaje adresem formularza (5B) | D37, part3 §6.3, `contact-details.ts` |
| R2 | Telefon i e-mail jako gołe `tel:`/`mailto:` w HTML (hero, panel, pasek, kontakt, lightbox) | sloty `data-tel` / `data-mail` (+ `data-fill="href"` na przyciskach); bez JS przyciski → `/kontakt/`; kontrakt na surowym HTML obejmuje kartę agenta, NIE opis z CRM | kontrakt antyscrapingowy (`sections.md`) |
| R3 | Mapa jako przycisk „Pokaż interaktywną mapę" i kadr 4:3 / 16:9 `cover` | **bez przycisku** (`INTERACTIVE_MAP = false`, O7); obraz w NATURALNYCH proporcjach manifestu — `cover` obcinałby pasek atrybucji | D36, O7, `docs/design/README.md` (pasek atrybucji) |
| R4 | Design detalu nie ma plakietki statusu ani plakietki „Nowość" | **Plakietki z listy dochodzą** (`cardBadges`) na hero, obok pastylek; cena sprzedanych w `--muted`; grayscale NIE | O9, part3 §3.3, spójność z kartą (R4/R5 listy) |
| R5 | Film: podpis „YouTube · 2:14" i miniatura z makiety | miniatura = **pierwsze zdjęcie oferty z R2** (tak robi też makieta — `detal-mock-1`), więc kopia miniatury YouTube przez sync NIE jest potrzebna (zero zmian w syncu); podpis „YouTube" bez czasu (danych nie ma); krótka nota pod kaflem o załadowaniu odtwarzacza po kliknięciu (PLACEHOLDER) | D32, part3 §1.4 (`videoId`) |
| R6 | Udostępnij: przyciski `noop`, link X zepsuty na obecnej stronie | prawdziwe LINKI do sharerów (Facebook `sharer.php?u=`, WhatsApp `wa.me/?text=`, X `intent/tweet?url=`) z absolutnym adresem; otwierane po kliknięciu = zero żądań do podmiotów trzecich przy wejściu; „Skopiuj link" przez `navigator.clipboard` z etykietą stanu | part2 §5.1 pkt 1 i §5.3, stała techniczna 10 |
| R7 | Formularz zapytania w sekcji kontakt (name, email, phone, message, marketing) | **nie wchodzi** — sekcja zostawia kontener `[data-offer-inquiry]` na formularz 5B; układ dwukolumnowy desktopu zachowany (prawa kolumna pusta do 5B) | prompt 4.3, part2 §11 |
| R8 | Wartości wierszy „Transakcja", „Typ", „Rynek" małą literą (`sprzedaż`, `mieszkanie`, `wtórny`) | etykiety z `format.ts`/`offers-ui.ts` jak w filtrach (`Sprzedaż`, `Mieszkanie`, `Wtórny`) — jedno źródło etykiet; wiersz „Typ" niesie podtyp (`Dom (bliźniak)`, `Lokal komercyjny (biuro)`) jak `formatKind` | D16, zasada 3 (prezentacja) |
| R9 | Design nie ma okruszków ani „wróć do listy" (part2 §12: do dobudowania) | okruszki `Oferty › {rodzaj} › {lokalizacja}` z linkami do list SSG + bieżący numer; „Wróć do listy ofert" w sekcji kontaktu → lista rodzaju | instrukcja 4.3 (Nawigacja) |
| R10 | Lightbox mobile = panel od dołu bez uchwytu, zamykany tylko X | **swipe-down zamyka** — powłoka dostaje `data-overlay-kind="sheet"` poniżej 1025 (gest z `overlay.ts` za darmo: treść nie przewija się w pionie, więc `scrollTop === 0`; ruch poziomy po torze jest oddawany przeglądarce, bo `dx > dy`), `kind="modal"` od 1025 (pełny ekran, bez gestu); atrybut synchronizuje `matchMedia` (lekcja eha: `sheet` na desktopowym modalu gubi klik). Własnego swipe'u nie piszemy → `data-overlay-nodrag` niepotrzebny | instrukcja 4.3, `sections.md` (kind sheet), lekcja `open-detail.ts` |
| R11 | Lightbox desktop: kadry 3:2 `cover`, `height: 100svh − 260px` | **naturalne proporcje** (`object-fit: contain` w polu `100svh − 200px`) — lightbox ma pokazywać całe zdjęcie, także pionowe | part2 §6 (konsekwencje) |
| R12 | Hero mobile `cover` w polu 480–600 px | poziome `cover` (jak design); PIONOWE `contain` na rozmytym tle tej samej fotografii (`card`, `filter: blur(18px)`, `scale(1.1)`) | part2 §6, D17 (dowolna liczba zdjęć) |
| R13 | Hero mobile przełącza `src` jednego `<img>` (‹ ›), bez swipe'u | **karuzela snap** (`scroll-snap-type: x mandatory`, `scroll-snap-stop: always`) na obu szerokościach; ‹ › przewijają tor, licznik czyta `scrollLeft`; klawiatura ←/→ przy fokusie na galerii | `scroll.md` (kontrakt karuzel), instrukcja (swipe galerii) |
| R14 | Sekcje z sufiksami `-m`/`-d` i skok `initHashJump` z `site.js` | jedno drzewo, czyste id; kotwice to zwykłe linki `#…` + `scroll-margin-top`; bez `scroll-behavior: smooth` na `html` | `docs/design/README.md`, `scroll.md` |
| R15 | „Czytaj więcej" zawsze, także przy krótkim opisie; `CollapsibleText` szablonu zwija tylko na mobile | zwijanie na KAŻDEJ szerokości (design ma je też na desktopie), ale tylko gdy treść przekracza próg (JS mierzy `scrollHeight` po uzbrojeniu; krótki opis = bez przycisku); bez JS pełny tekst | zasada 2 (treści nie skracamy — zwijamy prezentację) |
| R16 | Design pokazuje cenę zawsze | sprzedane/wynajęte wg `SHOW_PRICE_WHEN_SOLD` (dziś `true`): `false` → hero, panel i wiersze Cena / Cena za m² bez kwoty, w ich miejscu plakietka statusu; `price === null` → „Zapytaj o cenę" bez ceny/m² (hero, panel, wiersz) | O5, part3 §2.5 |
| R17 | Kolory drobnego druku poniżej AA: kicker `--copper` 12 px na białym (3,1:1), etykieta „Udostępnij" `--faint` 12 px (3,6:1), podpis „powierzchnia" `--muted` 12 px (4,9:1 OK) | `--copper-text` dla kickera desktop (jak R17 listy), `--muted` dla „Udostępnij"; na ciemnym hero `--copper-light` (7:1 OK); allowlista axe PUSTA | reguła a11y (`testing.md`) |
| R18 | Obniżka ceny i Omnibus — design nie ma | przy `previousPrice > price`: poprzednia cena przekreślona (hero, panel, wiersz Cena) + dopisek „najniższa cena z 30 dni: X" w wierszu Cena, gdy `lowestPrice30d` istnieje; przy podwyżce nic | part3 §2.5 |
| R19 | „Dostępne od" — design nie ma, dane mają (`availableFrom`) | wiersz „Dostępne od" TYLKO gdy `showsAvailableFrom(availableFrom, BUILD_NOW)` (data dzisiejsza/przyszła) — reguła już istnieje w `time-rules.ts` i sync liczy po niej przebudowę, więc detal MUSI ją konsumować | part3 §2.4, `time-rules.ts` (2.8 pkt 10) |
| R20 | Winda: design „tak" | `elevators ≥ 1` → „tak" (+ „(2)" gdy więcej), `0` → „nie" (jawna dana), `undefined` → wiersz ukryty | part3 §6.1 wiersz 9, R14 listy |

Bez rozjazdu: kolejność sekcji (part2 §5.1 ↔ design), 19 wierszy (part3
§6.1 ↔ design), pierwsze zdjęcie = główne, `og:image` z pierwszego
zdjęcia, lightbox w wariancie `hero` i `og` wyłącznie dla `og:image`
(D29), agent jako stała (part3 §6.3), krótkie adresy `/{NUMER}` (D31 —
`_redirects` bez zmian).

## 3. Czego design nie ma, a trzeba zbudować

### 3.1 Strona detalu — architektura

- `src/components/offers/OfferDetailPage.astro` (+ `offer-detail.css`):
  komplet sekcji z §1 w JEDNYM markupie; `data-offer-detail="{numer}"`,
  `data-offer-number`, `data-offer-price` (kontrakty szkieletu
  i `offers-skeleton.spec`), `main h1` (smoke). Gałąź detalu
  w `src/pages/oferty/[...path].astro` podmienia `SkeletonPage` na ten
  komponent; adresy bez zmian.
- `src/scripts/offer-detail.ts` (czysty TS, bez Preact; ładowany zawsze
  jako moduł strony): licznik i ‹ › hero, miniatury (`aria-current`),
  klawiatura ←/→ przy fokusie na galerii, kopiowanie numeru/linku,
  `window.print()`, podświetlenie kotwic (`IntersectionObserver`),
  osadzenia filmu/spaceru po kliknięciu, `initCollapsibles()` dla opisu,
  prefetch chunku lightboxa po pierwszym `pointerdown`/`touchstart` na
  galerii, otwarcie lightboxa (b). Prognoza: ok. 6 KB brutto / 2,5 KB
  gzip.
- Bez JS: galeria przewija się palcem/kółkiem (snap natywny), linki
  kotwic działają, film/spacer to linki, opis pełny, przyciski wymagające
  JS ukryte przez `<noscript><style>` (kopiuj, drukuj, ‹ › hero).

### 3.2 `src/lib/offers/details-rows.ts` — deklaratywna lista wierszy

Jedna tablica `DETAIL_ROWS: DetailRow[]`, gdzie
`DetailRow = { id, label, value(offer, ctx) => string | DetailValue | null }`
(`ctx = { now, showPrice }`); `null` = wiersz ukryty. `detailRows(offer,
ctx)` zwraca wiersze do renderu. 19 wierszy designu + 3 wiersze parytetu
obecnej strony dla domu (part2 §5.2) + 1 wiersz z reguły daty (R19):

| # | id | Etykieta | Źródło i formatter | Warunek |
| --- | --- | --- | --- | --- |
| 1 | `transaction` | Transakcja | `TRANSACTION_LABEL` | zawsze |
| 2 | `type` | Typ | `TYPE_LABEL` + podtyp (`subType`) jak `formatKind` bez transakcji | zawsze |
| 3 | `location` | Lokalizacja | `formatLocation(location)` | zawsze |
| 4 | `area` | Powierzchnia | `formatArea(area)` | zawsze (działka: `area` = powierzchnia działki) |
| 4a | `plotArea` | Powierzchnia działki | `formatArea(plotArea)` | `dom` i `plotArea` (part2 §5.2) |
| 4b | `usableArea` | Powierzchnia użytkowa | `formatArea(usableArea)` | **do decyzji (§6 Q2)** |
| 5 | `rooms` | Pokoje | `formatInt(rooms)` | `isFieldRelevant(type, "rooms")` i `rooms` |
| 6 | `floor` | Piętro | `formatFloor(floor, floorsInBuilding)` (`0` = parter) | `isFieldRelevant(type, "floor")` i `floor !== undefined` |
| 6a | `floors` | Liczba pięter | `formatInt(floorsInBuilding)` | `dom` i `floorsInBuilding` (part2 §5.2) |
| 7 | `year` | Rok budowy | `formatYear` | `buildingYear` |
| 8 | `market` | Rynek | `MARKET_LABEL` | zawsze |
| 9 | `elevator` | Winda | ≥ 1 → „tak" / „tak (N)"; `0` → „nie" | `elevators !== undefined` (R20) |
| 10 | `furnished` | Umeblowanie | `FURNISHED_LABEL` | `furnished` |
| 11 | `balcony` | Balkon / loggia | liczniki `extras.balcony/loggia/terrace` → „balkon", „2 balkony, loggia", „taras" (`countLabel`) | suma > 0 |
| 12 | `garage` | Garaż | `extras.garage/parkingUnderground/parking` → „garaż", „miejsce w hali garażowej", „2 miejsca parkingowe" | suma > 0 |
| 13 | `basement` | Piwnica | `extras.basement/storage` → „piwnica", „komórka lokatorska" | suma > 0 |
| 14 | `heating` | Ogrzewanie | `heating` (tekst ze słownika CRM) | `heating` |
| 15 | `condition` | Stan | `condition` | `condition` |
| 16 | `rent` | Czynsz administracyjny | `formatPrice(rent, "wynajem")` → „330 zł / mies." | `rent > 0` |
| 16a | `availableFrom` | Dostępne od | `formatDateShort(availableFrom)` | `showsAvailableFrom(availableFrom, now)` (R19) |
| 17 | `number` | Numer oferty | `number` | zawsze |
| 18 | `price` | Cena | `formatPrice` (+ przekreślona poprzednia, + Omnibus — R18) | `showPrice` (R16); `price === null` → „Zapytaj o cenę" |
| 19 | `pricePerM2` | Cena za m² | `formatPricePerM2` | `showPrice` i `price !== null` i `pricePerM2` |

Kolejność = design (wiersze parytetu wchodzą obok sąsiadów: 4a po 4,
6a po 6, 16a po 16). Test unit `offers-details-rows.test.ts`: na danych
syntetycznych każdy wiersz pojawia się/znika wg warunku; `floor: 0` →
„parter"; `elevators` `undefined` → brak wiersza, `0` → „nie", `2` →
„tak (2)"; `rent: 0`/brak → brak; `price: null` → „Zapytaj o cenę" i brak
wiersza 19; `showPrice: false` → brak 18 i 19; dom → 4a, 6a, bez 6;
działka → bez 5, 6, 7, 9, 10; `availableFrom` wczoraj → brak, jutro →
wiersz; liczebniki „2 balkony", „miejsce parkingowe"; na fixture: każda
z 13 ofert daje wiersze 1–4, 8, 17 i żadna wartość nie zawiera
`undefined`/`NaN`. Pola §6.2 bez miejsca w designie — §6 Q2.

### 3.3 Meta, OG, JSON-LD

- `src/lib/offers/detail-meta.ts`: `detailTitle(offer)` =
  „{tytuł} — {rodzaj}, {placeName} · Hetman Nieruchomości" (tytuł pusty →
  `typeName`); `detailDescription(offer)` = tekst opisu bez HTML
  (`htmlparser2`, jak `toIndexText`, ale z zachowaną wielkością liter),
  cięty NA GRANICY ZDANIA do ≤ 160 znaków (ostatnie `.`, `!`, `?` przed
  limitem; brak zdania → ucięcie na spacji + „…"); pusty opis → szablon
  z rodzaju, lokalizacji i ceny. Test unit.
- `BaseLayout.astro` dostaje OPCJONALNE propsy `ogImage`, `ogImageAlt`
  (domyślnie dzisiejsze `og-image.png`) — jedyna zmiana w layoucie;
  detal podaje `imgAt(first.r2Key, "og")` (1200×630 `fit=cover`, D29);
  bez zdjęć → domyślny obraz. `og:type` zostaje `website`.
- `src/lib/jsonld.ts` + `realEstateListing(site, offer)`:
  `RealEstateListing` { `@id` = adres oferty + `#oferta`, `name`, `url`,
  `description` (jak meta), `image` (do 5 adresów `hero`), `datePosted`
  (`addedAt`), `offers`: `Offer` { `price`, `priceCurrency`, `url` } —
  POMINIĘTE przy `price === null`; `address`: `PostalAddress`
  { `streetAddress` = „ul. X" (sama ulica, bez numeru — pola numeru
  budynku/lokalu nie istnieją w danych), `addressLocality` = miasto,
  `addressRegion` = województwo, `addressCountry` PL }; `floorSize`
  (`QuantitativeValue`, `unitCode: "MTK"`); `numberOfRooms`;
  `provider`: `{ "@id": …/#firma }` (referencja). BEZ `telephone`,
  `email`, `geo`, BEZ `sameAs`. Render przez `JsonLd.astro` w slocie
  head. Test w `jsonld.test.ts`: brak kontaktów (te same `FORBIDDEN`),
  brak kluczy `telephone`/`email`/`geo`, brak ceny przy `null`, adres
  bez numeru (klucze `streetAddress` bez cyfr poza typem ulicy),
  `image` ⊆ adresy `imgAt(…, "hero")`. `seo.spec`: trasy statyczne nadal
  bez JSON-LD; detal niesie DOKŁADNIE jeden węzeł.
- Okruszki w JSON-LD (`BreadcrumbList`) — Etap 6 (razem z wpięciem
  węzłów firmy).

### 3.4 Lightbox (b) — `src/scripts/offer-lightbox.ts` (chunk)

- Powłoka `#of-lightbox` (`[data-overlay]`, `role="dialog"`,
  `aria-modal`, `aria-labelledby`) budowana w `<body>` przy pierwszym
  otwarciu (jak `sheets.tsx`, ale czysty DOM — zero Preact): nagłówek
  „Galeria" + licznik `aria-live=polite` + X `[data-overlay-close]`, tor
  `scroll-snap` (`[data-lb-track]`, kadry `imgAt(…, "hero")` w naturalnych
  proporcjach, `lazy` poza bieżącym i sąsiadami), ‹ › (`disabled` na
  krańcach — bez zapętlania, jak eha), stopka CTA „Zainteresowała Cię ta
  oferta?" z „Zadzwoń" (slot `data-tel data-fill="href"` wypełniany
  `fillContactSlots(root)` po zbudowaniu) i „Napisz" (`#kontakt`,
  zamyka). Treść = lista zdjęć z atrybutów `data-*` miniatur/kafli
  (klucze R2 i wymiary są w HTML galerii — bez drugiej serializacji).
- Mechanika z `overlay.ts`: `window.overlay.open(id, { label, onClose })`,
  Esc, X, focus-trap, blokada scrolla; `data-overlay-kind` = `sheet`
  < 1025 / `modal` ≥ 1025 (R10), synchronizowany przy `matchMedia.change`;
  zmiana progu przy otwartym lightboxie ZAMYKA go (reguła `sections.md`).
- Klawiatura: ←/→ przewijają tor (`scrollTo` + `scroll-snap-stop:
  always`), Esc = `overlay.ts`. Licznik nadąża za swipe'em (`scroll`
  → `Math.round(scrollLeft / clientWidth)`). Po zamknięciu hero galerii
  przewija się do kadru oglądanego w lightboxie (korekta z eha).
- Otwarcie: klik w hero (desktop `cursor: zoom-in`), kafel, miniaturę,
  „Wszystkie zdjęcia (N)", kafel w „Rzutach"; start od wskazanego indeksu.
- Prefetch chunku po pierwszym `pointerdown`/`touchstart` na galerii
  (nie w idle — LHCI nie liczy bajtów, których strona nie ładuje).

### 3.5 Druk (b) — `@media print` w `offer-detail.css`

Arkusz projektowany pod późniejszą trasę `druk` (7.6): ukryte chrome,
kotwice, przyciski, panel/pasek, sekcje film/spacer (zostaje adres
spaceru jako tekst), lightbox; widoczne: nagłówek (kicker, tytuł,
lokalizacja, cena), pierwsze zdjęcie w pełnej szerokości + siatka 2×3
kolejnych (`card`), skróty, kompletna tabela danych, pełny opis
(zwijanie zdjęte), mapa, karta agenta (telefon i e-mail ze slotów —
drukowane po JS, bez JS puste), stopka „hetmannieruchomosci.com ·
{numer}". Bez numeru budynku i lokalu (nie ma ich w danych).
`page-break-inside: avoid` na wierszach i kaflach. „Drukuj / PDF" =
`window.print()`.

### 3.6 404 świadoma ofert (b) — `src/pages/404.astro`

- Jeden dokument `dist/404.html` dla wszystkich adresów → wariant
  oferty rozpoznaje się w PRZEGLĄDARCE (`location.pathname` zaczyna się
  od `/oferty/` albo pasuje do `/^\/sw\d+\/?$/i`), skryptem INLINE
  (~300 B; `not-found.spec` wymaga, by jedynymi modułami były Navbar
  i Footer — kontrakt zostaje). Bez JS: dzisiejszy komunikat.
- SSR renderuje OBA bloki: dzisiejszy (`[data-nf-generic]`) i ofertowy
  (`[data-nf-offer]`, `hidden`): `h1` „Ta oferta jest już niedostępna"
  (PLACEHOLDER), akapit z linkiem do `/oferty/`, nagłówek „Najnowsze
  oferty" + 3 karty `OfferCard` (SSR, `lazy`) = 3 najnowsze oferty
  `status === "aktywna"` wg `SORT_NEWEST_BY` z `data.ts` (`toIndexEntry`;
  `nowIso` = `BUILD_NOW`); przy < 3 aktywnych — tyle, ile jest; przy 0 —
  sam komunikat z linkiem. Status 404, `noindex`, bez canonicala, bez
  JSON-LD, poza sitemapą — bez zmian.
- Visual `not-found` (generyczny adres): blok ofertowy jest `hidden`, więc
  zrzut MOŻE się nie ruszyć; jeśli się ruszy (import `offers.css`
  zmienia kaskadę) — regeneracja zamierzona. Nowy zrzut
  `not-found-offer` pod adresem `/oferty/mieszkanie-na-sprzedaz/poznan/sw000000/`.

### 3.7 Pozostałe

- `format.ts`: `formatDateShort(iso)` → „28 sie 2026" (`Intl.DateTimeFormat`
  `pl-PL`, `Europe/Warsaw`, `month: "short"`; test unit — Node ma pełne
  ICU, zapis deterministyczny), `formatCount` dla liczebników „balkon /
  balkony / balkonów", „miejsce / miejsca / miejsc parkingowych".
- `site-config.ts`: `AGENT.role` („Pośrednik w obrocie
  nieruchomościami") i `AGENT.licenseNo` („24178") — stałe konfiguracyjne
  (part3 §6.3), nie z API; `OFFER_DESCRIPTION_COLLAPSE_PX = 380` (mobile)
  / 420 (desktop) — próg zwijania opisu.
- `offers-ui.ts` + `DETAIL` (etykiety sekcji, przycisków, kotwic,
  komunikatów 404 — teksty nowe = PLACEHOLDER U9, §7).
- `icons.ts` + 6 ikon (§1.5).
- `lighthouserc.cjs`, `lighthouserc.desktop.cjs`: 4 adresy detali
  z fixture'u (§5).

## 4. Kontrakty i testy

**Utrzymane:** `data-offer-detail`, `data-offer-number`,
`data-offer-price` (szkielet; `offers-skeleton.spec` bez zmian), `main h1`
(smoke), `data-offer-photo` na pierwszym kadrze hero i `data-offer-map`
na mapie, adresy z `urls.ts`, sitemapa, `a11y` i `seo` na pierwszym
detalu (allowlista axe PUSTA), `offers.css` listy nietknięty poza
ewentualnym wspólnym blokiem tła CTA (`.ol-cta` → klasa współdzielona).

**Nowe kontrakty (selektory):** `[data-offer-gallery]` (tor hero
`[data-gal-track]`, kadry `[data-gal-slide]`, licznik `[data-gal-count]`,
‹ › `[data-gal-prev]`/`[data-gal-next]`, miniatury `[data-gal-thumb="i"]`,
„Wszystkie zdjęcia" `[data-gal-all]`), `[data-offer-plans]`,
`nav[data-offer-anchors]` + `a[aria-current]`, `[data-offer-facts]`,
`dl[data-offer-rows]` z `[data-row="{id}"]`, `[data-offer-desc]` +
`[data-clp-btn]`, `[data-offer-video]` / `[data-offer-tour]` (kafel-link →
po kliknięciu `iframe`), `[data-offer-map]`, `[data-offer-map-link]`,
`[data-offer-contact]` + `[data-offer-inquiry]`, `aside[data-offer-panel]`,
`[data-offer-bar]`, `[data-offer-copy="number|link"]` +
`[data-offer-copied]` (`role=status`), `[data-offer-print]`,
`nav[data-offer-crumbs]`, `[data-offer-share="facebook|whatsapp|x"]`;
lightbox `#of-lightbox` (`[data-lb-track]`, `[data-lb-count]`,
`[data-lb-prev]`/`[data-lb-next]`); 404: `[data-nf-generic]`,
`[data-nf-offer]`.

**E2E `tests/e2e/oferta.spec.ts`** (dane produkcyjne, `pickOffer` +
`test.skip` z powodem, `useMediaStub`; profile: treść na
`chromium-1920`, gesty i pasek dolny na `chromium-pixel-5` +
`webkit-iphone-14`, tablet przez `setViewportSize(900)`):

1. detal pierwszej oferty: 200, `h1` = tytuł (lub `typeName`), kicker =
   `formatKind`, lokalizacja = `formatLocation`, cena = `formatPrice`,
   `[data-offer-price]`; plakietka statusu dla `sprzedana`/`wynajeta`/
   `rezerwacja` (po jednej, skip gdy brak); „Zapytaj o cenę" bez
   cena/m² (`priceOnRequest: true`, skip — dziś 0); obniżka
   (`withPreviousPrice` + `previousPrice > price`, skip — dziś 0);
2. galeria: liczba kadrów = `photos.length` (kind `photo`), pierwszy
   `eager`, pozostałe `lazy`, każdy `img` z `width`/`height`/`alt`
   i adresem `imgAt(…, "hero")`; licznik „1 / N"; ‹ › zmieniają licznik;
   klawiatura → / ← przy fokusie; miniatury `aria-current`; kadr
   pionowy ma `data-portrait` i `object-fit: contain`
   (`pickOffer({ where: o => o.photos.some(p => p.height > p.width) })`,
   skip); „Rzuty" tylko przy `withPlan` (skip — dziś 0, fixture ma);
   swipe myszą po torze przewija o jeden kadr (`scroll-snap-stop`),
   jak w `oferty-mobile.spec` (`page.mouse`);
3. (b) lightbox: klik w kafel otwiera `#of-lightbox` (`role=dialog`,
   `is-open`) od wskazanego indeksu, licznik, →/← przewijają, Esc
   zamyka i hero stoi na ostatnim oglądanym kadrze; X; `kind` = `sheet`
   na mobile i `modal` na 1920; swipe-down myszą zamyka na mobile;
   focus-trap (Tab ×6; skip WebKit); `body{position:fixed}` i powrót
   `scrollY`; `setViewportSize(1025)` domyka; przed otwarciem w DOM nie
   ma `#of-lightbox`; axe `.include(#of-lightbox)` po wjeździe;
4. kotwice: zestaw pozycji = Szczegóły, Opis, [Film], [Spacer 360],
   [Mapa], Kontakt wg obecności danych (`withVideo`, `withTour`, mapa =
   `maps[coordKey]` z helpera — nowy `readMapsTyped()` w
   `tests/helpers/offers.ts`); klik przewija (`scrollY > 0`, sekcja pod
   paskiem: `getBoundingClientRect().top ≥ hdr + anchors − 1`);
   podświetlenie po przewinięciu do `#opis`;
5. dane: `[data-row]` id = `detailRows(offer).map(id)` (ten sam moduł,
   te same dane — kontrakt render = funkcja); `floor: 0` → „parter";
   `elevators` brak → brak wiersza; `rent` → „zł / mies.";
6. opis: `[data-offer-desc]` niepusty, bez `<script>`; przy długim
   opisie przycisk „Czytaj więcej" → `aria-expanded` → pełna wysokość;
   krótki → brak przycisku; surowy HTML (bez JS) niesie pełny tekst;
7. film/spacer: PRZED kliknięciem `iframe` = 0 w całym dokumencie;
   kafel = `<a>` do YouTube/`tourUrl`; po kliknięciu DOKŁADNIE jeden
   `iframe` z `youtube-nocookie.com/embed/{videoId}` (`allow` bez
   `microphone`) / `tourUrl`; żądania do hosta osadzenia przechwycone
   `page.route` (zaślepka) — test sieci: do kliknięcia hosty =
   {własny, `MEDIA_BASE`}; po kliknięciu dochodzi wyłącznie host
   osadzenia; oferta bez filmu/spaceru = brak sekcji i kotwicy
   (`withVideo: false`);
8. mapa: `img[data-offer-map]` z `width`/`height` z manifestu, `src` =
   `mediaUrl(entry.r2Key)`; „Otwórz w mapach" `href` =
   `maps.google.com/?q={lat},{lon}` z `target=_blank rel=noopener`;
   brak sekcji „Pokaż interaktywną mapę"; oferta bez mapy (skip, gdy
   wszystkie mają);
9. kontakt: karta agenta = `AGENT.name`, `role`, `licenseNo`; surowy
   HTML detalu NIE zawiera telefonu ani maili poza `[data-offer-desc]`
   (asercja po wycięciu bloku opisu — kontrakt antyscrapingowy nie
   obejmuje opisu z CRM); po JS `a[data-tel]` → `tel:`,
   `a[data-mail="joanna"]` → `mailto:joanna@…`; przyciski „Zadzwoń" bez
   JS → `/kontakt/`; `[data-offer-inquiry]` istnieje i jest puste;
   „Wróć do listy ofert" → lista rodzaju (200);
10. panel/pasek: 1920 — `aside` `position: sticky`, widoczny; pasek
    dolny `display: none`; pixel-5 — pasek widoczny, przypięty do dołu
    okna (`getBoundingClientRect().bottom ≈ innerHeight`), znika po
    przewinięciu do stopki; flip progu 1025 (`expectBreakpointFlip`:
    panel none/block, pasek grid/none, układ nagłówka);
11. meta: kopiuj numer → `navigator.clipboard` (zaślepka przez
    `page.evaluate` + `context.grantPermissions`) → `[data-offer-copied]`
    „Skopiowano"; kopiuj link = pełny adres; linki udostępniania mają
    absolutny `u=`/`url=` z numerem w ścieżce; „Dodano" =
    `formatDateShort(addedAt)`; `title` = `detailTitle`, `description`,
    canonical, `og:url`, `og:image` = `imgAt(first, "og")`,
    `og:image:width/height` 1200/630; JSON-LD: jeden węzeł
    `RealEstateListing`, bez `telephone`/`email`/`geo`, `offers.price`
    = `offer.price` (skip gdy `null`);
12. okruszki: 3 linki (Oferty › rodzaj › lokalizacja) + bieżący numer
    `aria-current="page"`, każdy link < 400;
13. zero żądań do podmiotów trzecich przy wejściu (i po interakcjach bez
    kliknięcia w osadzenia);
14. (b) druk: `page.emulateMedia({ media: "print" })` → chrome, kotwice,
    panel, pasek, przyciski `display: none`; tabela i pełny opis
    widoczne; `window.print` zaślepiony → klik „Drukuj / PDF" woła go;
15. (b) 404: `/oferty/x/y/sw000000/` i `/sw000000` → status 404,
    `[data-nf-offer]` widoczny, `h1` z komunikatem o ofercie, karty =
    3 najnowsze aktywne z helpera (`pickOffers({ status: "aktywna" })`
    posortowane po `SORT_NEWEST_BY`; skip przy 0), link do `/oferty/`;
    `/nie-ma-takiej-strony/` → dzisiejszy komunikat; bez JS → dzisiejszy
    komunikat na każdym adresie; `not-found.spec` bez zmian poza
    rozszerzeniem o te przypadki.

**Visual `tests/visual/oferta.spec.ts`** (fixture, `useVisualFixtureGuard`,
`prepareSweep`, próg fullPage 0,001): (a) `oferta-mieszkanie`
(`/oferty/mieszkanie-na-sprzedaz/poznan-winogrady/sw486462/` — aktywna,
film + spacer, obniżka, 12 zdjęć), `oferta-dom`
(`/oferty/dom-na-sprzedaz/poznan-szczepankowo/sw349452/` — działka,
liczba pięter, zdjęcia pionowe), `oferta-dzialka`
(`/oferty/dzialka-na-sprzedaz/kornik-bnin/sw184702/` — bez ulicy,
sprzedana, 22 zdjęcia, bez pokoi/piętra), `oferta-lokal`
(`/oferty/lokal-komercyjny-na-sprzedaz/poznan-wilda/sw372150/` —
rezerwacja, „Zapytaj o cenę", parter) = 4 fullPage × 6 profili = 24 PNG;
(b) `oferta-lightbox` (zrzut strony po otwarciu od 2. kadru, `settle(300)`,
6 profili), `oferta-druk` (`emulateMedia print`, fullPage, tylko
`chromium-1920`), `not-found-offer` (fullPage, 6 profili) = +13 PNG.
Zdjęcia fixture'u to lokalne WebP 400 px — hero `contain`/`cover`
skaluje je w górę (miękkie, ale deterministyczne). `chrome` i `oferty` nie
mogą się ruszyć; `not-found` — §3.6.

**Unit:** `offers-details-rows` (§3.2), `offers-detail-meta` (tytuł,
cięcie opisu na zdaniu, pusty opis), `jsonld` (+ `realEstateListing`),
`offers-format` (+ `formatDateShort`, liczebniki), `offers-helpers`
(+ `readMapsTyped`).

**Baseline'y:** święta kolejność — kod → workflow „Update linux visual
baselines" z `feat/oferta` (spec `tests/visual/oferta.spec.ts`, mode
`changed`; w (b) + `not-found.spec.ts`) → `git pull` → diff darwin →
`pnpm test:visual:update` → kontrola `git status --short tests/visual`
(liczba ` M` + `??` = lista rozjazdów) → commit darwin na końcu.

## 5. Budżet i LHCI

- `script` na detalu (LHCI liczy transfer): chrome 8,1 KB brutto / 3,3 KB
  gzip + `offer-detail` ok. 6 / 2,5 KB + `collapsible.ts` ok. 1 / 0,5 KB
  → ok. 7 KB transferu z bramki 40 000 B; lightbox to chunk z `import()`
  (ok. 5 / 2 KB) poza pomiarem. Lista `/oferty/` nietknięta (28 223 B).
  Pomiar jak §12.5 analizy 4.2 po `build:visual` — do raportu.
- `total` na detalu w LHCI mierzy build z FIXTURE'U (kopie 400 px), więc
  jest optymistyczny wobec produkcji (hero 1200 px ≈ 150–250 KB); na
  produkcji LCP detalu = pierwszy kadr hero (`eager`, `fetchpriority`,
  `preload` w head przez slot). Obserwacja do raportu, nie bramka.
- `lighthouserc*.cjs` dostają 4 adresy detali z fixture'u (te same co
  visual (a)). Koszt: 8 adresów × 5 przebiegów × 2 configi — job
  `lighthouse` wydłuży się o ok. 4–6 min (§6 Q3).
- Zdjęcia: hero `imgAt(…, "hero")` (1600 → oryginał 1200 bez upscalingu),
  kafle i miniatury `card` (ten sam adres = jedno pobranie), `og`
  wyłącznie w `og:image`. Pierwszy wariant `hero` każdej oferty to nowa
  transformacja (46 ofert; `og` dochodzi tylko przy podglądach linków) —
  w limicie 5 000/mies. (dziś 9 + 46 `card`).

## 6. Pytania do Mateusza (z rekomendacją)

1. **Podział (a)/(b)** jak w §0 — tak / jeden PR?
2. **Wiersze spoza designu** (part3 §6.2 „bez decyzji"). Rekomendacja:
   w (a) 19 wierszy designu + 3 parytetu domu + „Dostępne od" (R19) —
   jak w §3.2; dodatkowe pola z danymi wchodzą jedną linią każde, gdy
   zdecydujesz (kandydaci z realnym pokryciem w `data/`: forma własności
   28/46, kuchnia 40, łazienki 42, sypialnie 37, powierzchnia użytkowa
   19, kaucja 16, opłaty 6, wyposażenie 29, poziomy 2, materiał 2,
   ogród 7, strych 4, działka: ogrodzenie/dojazd/przeznaczenie 8,
   lokal: witryna/przeznaczenia 2; media/bezpieczeństwo/okolica wymagają
   słownika etykiet dla ok. 30 kodów). Alternatywa: dołożyć od razu te
   bez słowników (ok. 12 wierszy) w drugiej grupie „Pozostałe".
3. **LHCI: 4 adresy detali** (prompt) czy 2 (mieszkanie z filmem
   i spacerem = najcięższy; działka 22 zdjęć)? Rekomendacja: 4, zgodnie
   z promptem; przy wydłużeniu jobu ponad ok. 12 min — zejście do 2 to
   jedna linia w configach.
4. **Udostępnij** (R6): trzy linki do sharerów + „Skopiuj link" jak
   design, czy dodatkowo `navigator.share` na mobile (natywny arkusz
   systemowy, zero adresów podmiotów trzecich)? Rekomendacja: design + na
   mobile jeden przycisk „Udostępnij" przez `navigator.share` ZAMIAST
   trzech ikon, gdy API jest dostępne (ikony jako fallback).
5. **Lightbox mobile zamykany swipe-down** przez `kind="sheet"` (R10) —
   akceptujesz? Alternatywa: tylko X/Esc (`kind="modal"` wszędzie).
6. **Omnibus** (R18): dopisek „najniższa cena z 30 dni" w wierszu Cena
   przy obniżce — tak (rekomendacja, jedna linia) / nie.
7. **Nota pod kaflem filmu** o odtwarzaczu YouTube po kliknięciu
   (PLACEHOLDER; polityka 4.7 i tak to opisze) — zostawić / usunąć?
8. **Baseline'y `not-found`**: jeśli generyczny zrzut się nie ruszy, nie
   regeneruję; jeśli się ruszy — regeneracja w PR (b). OK?

## 7. Lista PLACEHOLDER (U9; zamykana w 7.7)

| Tekst | Miejsce | Uwagi |
| --- | --- | --- |
| „Kontakt w sprawie oferty", „Zapytaj o tę ofertę" | sekcja kontakt | brzmienie z designu |
| „Zainteresowała Cię ta oferta?" | stopka lightboxa | brzmienie z designu |
| „Wróć do listy ofert", „Wszystkie zdjęcia (N)", „Rozpocznij spacer", „Odtwórz film", „Otwórz w mapach", „Skopiuj link" / „Skopiowano", „Drukuj / PDF", „Czytaj więcej" / „Zwiń" | przyciski i linki | brzmienie z designu |
| „Film", „Spacer 360°", „Mapa", „Dane szczegółowe", „Opis", „Szczegóły", „Kontakt", „Rzuty" | nagłówki sekcji i kotwice | design + instrukcja („Film" neutralnie) |
| nota pod kaflem filmu („Po kliknięciu załaduje się odtwarzacz YouTube.") | sekcja film | tekst nowy — §6 Q7 |
| „Ta oferta jest już niedostępna", akapit z linkiem, „Najnowsze oferty" | `404.astro` | brzmienie z instrukcji (nagłówek) + tekst nowy |
| szablon `<title>` i `description` detalu | `detail-meta.ts` | szlif w Etapie 6 |
| etykiety wierszy spoza designu (4a, 6a, 16a) | `details-rows.ts` | parytet obecnej strony / reguła daty |

Nie są placeholderami: etykiety 19 wierszy (design + part3 §6.1), dane
agenta (part3 §6.3), formaty (`format.ts`), „Zapytaj o cenę", plakietki.

## 8. Co sprawdzić na fizycznym telefonie

1. Hero: swipe palcem przewija DOKŁADNIE o jeden kadr (`scroll-snap-stop`),
   bez przeskoków przy szybkim geście; licznik nadąża; zdjęcia pionowe
   na rozmytym tle bez skoku układu; ‹ › nie zasłaniają twarzy/okien.
2. Lightbox (b): otwarcie z kafla i miniatury, swipe poziomy między
   kadrami, swipe-down zamyka (NIE odświeża strony — Android), X i
   przycisk wstecz systemu (zamyka? — overlay.ts nie obsługuje
   `popstate`; obserwacja), blokada scrolla pod lightboxem (iOS),
   limit warstw GPU Androida przy 22 kadrach `hero` (klatkowanie =
   sygnał do zmniejszenia wariantu lightboxa).
3. Pasek dolny: leży NAD zwijanym paskiem Safari (`env(safe-area-inset-bottom)`),
   nie zasłania ostatniego wiersza sekcji kontakt, znika na stopce;
   „Zadzwoń" otwiera dialer, „Napisz" przewija do sekcji kontakt.
4. Kotwice: pasek przewija się poziomo palcem, aktywna pozycja wjeżdża
   w kadr; skok do sekcji nie chowa nagłówka pod dwoma paskami.
5. Film: tap w kafel → odtwarzacz startuje w miejscu (autoplay po geście);
   iOS Low Power Mode — odtwarzacz czeka na drugi tap (brak autoplay);
   spacer 360 w iframe — dotyk steruje spacerem, nie stroną.
6. Kopiuj numer / link: komunikat „Skopiowano" i realna zawartość
   schowka; udostępnij przez WhatsApp otwiera aplikację.
7. „Czytaj więcej": po zwinięciu przycisk zostaje pod palcem (korekta
   `scrollBy` z `collapsible.ts`).
8. Druk (b): „Drukuj / PDF" na iOS otwiera arkusz udostępniania z PDF;
   zdjęcia nie są przycięte, tabela nie łamie wiersza.
9. Tablet (iPad 768–1024): nagłówek nad hero jak na telefonie (układ
   mobilny do 1024), pasek dolny obecny; obrót do poziomu ≥ 1025 →
   panel boczny, lightbox domyka się.

## 9. Pliki do zmiany (po akceptacji, część (a))

- nowe: `src/components/offers/OfferDetailPage.astro`, `offer-detail.css`,
  `src/scripts/offer-detail.ts`, `src/lib/offers/details-rows.ts`,
  `detail-meta.ts`, `tests/unit/{offers-details-rows,offers-detail-meta}.test.ts`,
  `tests/e2e/oferta.spec.ts`, `tests/visual/oferta.spec.ts`, ten plik;
- zmienione: `src/pages/oferty/[...path].astro` (gałąź detalu),
  `src/lib/offers/format.ts` (`formatDateShort`, liczebniki),
  `src/lib/offers/offers-ui.ts` (`DETAIL`), `src/lib/site-config.ts`
  (`AGENT.role`, `AGENT.licenseNo`, próg zwijania), `src/lib/jsonld.ts`
  (`realEstateListing`), `src/layouts/BaseLayout.astro` (propsy
  `ogImage`/`ogImageAlt`), `src/components/offers/icons.ts`,
  `src/components/sections/CollapsibleText.astro` (skin + próg na obu
  szerokościach), `tests/helpers/offers.ts` (`readMapsTyped`),
  `tests/unit/{jsonld,offers-format,offers-helpers}.test.ts`,
  `tests/e2e/seo.spec.ts` (detal niesie jeden węzeł JSON-LD),
  `lighthouserc*.cjs`, `.claude/rules/{testing,sections}.md`,
  `CLAUDE.md`, `docs/README.md`, `tests/visual/__screenshots__/**`
  (święta kolejność);
- (b): `src/scripts/offer-lightbox.ts`, `src/pages/404.astro`,
  `offer-detail.css` (`@media print`), `tests/e2e/not-found.spec.ts`,
  `tests/visual/not-found.spec.ts`;
- nietknięte: `scripts/sync/**`, `data/**`, `tests/fixtures/offers/**`,
  `overlay.ts` (API), `data.ts`, `schema.ts`, `enums.ts`, allow-lista,
  `OfferCard.tsx` (reużyta na 404), `SearchIsland.tsx` i lista,
  `Navbar.astro`, `Footer.astro`, progi LHCI (poza adresami).

## 10. Uzupełnienia po implementacji (a)

- **Budżet (pomiar jak §12.5 analizy 4.2, `pnpm build:visual`):**

  | Plik | Rola | brutto | gzip -9 |
  | --- | --- | --- | --- |
  | `OfferDetailPage.astro_…js` | skrypt detalu (`offer-detail.ts`: galeria, odroczone miniatury, kopiowanie, share, kotwice, osadzenia, zwijanie opisu) | 5 176 B | 2 069 B |
  | chrome (Navbar, Footer, `contact-details`, `site-config`) | bez zmian | 8 135 B | 3 373 B |
  | **razem `script` na detalu** | | **13 311 B** | **5 442 B** |
  | `SearchIsland.*.js` | wyspa listy — NIETKNIĘTA | 38 236 B | 13 608 B |

  LHCI lokalnie (1 przebieg, oba configi, asercje czyste): `script` na
  czterech detalach z fixture'u = **7 285 B (18 % bramki 40 000 B)**,
  lista `/oferty/` 28 632 B (72 %); desktop: `total` 418–690 KB (z czego
  obrazy 312–584 KB — kopie fixture'u 400 px, więc produkcja z wariantem
  `hero` 1200 px będzie cięższa), LCP 549–583 ms (próg 1 800), TBT 0,
  CLS 0,006; mobile (po odroczeniu miniatur): `script` detali 7 415 B
  (19 %), `total` 296–475 KB (działka spadła z 757 KB na 411 KB), LCP
  2 108–2 785 ms (próg 3 200 — działka z 22 zdjęciami ma margines
  ok. 415 ms, mniejszy niż regułowe 1 300 ms; obserwacja do pomiaru
  `lhci-measure.yml` na runnerze, nie zmiana progu), TBT 0, CLS 0,000.
  HTML detalu (mieszkanie, 12 zdjęć):
  46,3 KB brutto / 9,6 KB gzip. Skrypt inline (fade `BaseLayout`): 1,1 KB.
- **Miniatury nie mogą polegać na natywnym `loading="lazy"`:** w poziomym
  pasku Chrome ładował WSZYSTKIE (22/22 na 390 px, 18/22 na 1440 px —
  sonda Playwright), czyli na produkcji ok. 1 MB wariantu `card` per
  detal, którego LHCI na fixture (kopie 400 px) nie wyłapie. Miniatury
  spoza pierwszych `OFFER_THUMBS_EAGER` (6) mają `data-src`, a JS dogrywa
  je IntersectionObserverem z `root` = pasek (margines 240 px): po
  zmianie 7/22 na mobile, 10/22 na desktopie. Kadry hero w torze snap
  ładują się poprawnie (1/22) — natywne `lazy` wystarcza. Bez JS widać
  pierwszych 6 miniatur (pasek i tak nic bez JS nie robi).
- **Wyspa listy pilnowana co do bajta:** pierwszy build dał `SearchIsland`
  38 891 B (+655), bo nowe ikony detalu weszły do `ICONS` z `icons.ts`,
  a wyspa trzyma cały obiekt (`ICONS[name]`). Ikony detalu żyją więc
  w `icons-detail.ts` (`ALL_ICONS` dla `Icon.astro`), a `ICONS` wrócił
  do 38 236 B. Z tego samego powodu `formatDateShort` tworzy
  `Intl.DateTimeFormat` leniwie (efekt uboczny na poziomie modułu nie
  jest wycinany przez bundler).
- **Zwijanie opisu własne**, nie przez `CollapsibleText.astro` szablonu
  (tamten zwija wyłącznie na mobile i zawsze; R15 wymaga zwijania na
  obu szerokościach i tylko przy długiej treści — pomiar `scrollHeight`
  po uzbrojeniu). Zwinięte pudełko ma `overflow: hidden` (nie `clip`):
  axe uznaje treść za obciętą tylko przy `hidden` — przy `clip` tekst
  spod maski na mobile „nachodził" na ciemny kafel filmu i dawał
  naruszenie kontrastu (serious).
- **`Icon.astro`** zamiast inline'owych SVG w markupie — ta sama tablica
  ścieżek co karta Preact.
- **Nagłówek na mobile** pozycjonowany pudełkiem o wysokości hero
  (`--od-hero-h`, wspólna zmienna z `.od-hero`), bo `.od-top` obejmuje
  także miniatury i `bottom: 0` celowało pod hero (pierwszy zrzut).
- **Kontrast:** avatar „JH" biały na miedzi (3,1:1) → `--ink` (R17);
  w panelu bocznym 18 px to tekst normalny, więc nawet „duży tekst"
  nie ratował bieli.
- **Pasek dolny ≥ 1025:** ukryty i host, i sam pasek — `display`
  dziecka `display:none` rodzica nadal liczy się jako `grid`, a kontrakt
  `expectBreakpointFlip` czyta `display` paska.
- **`scroll-margin-top` sekcji kontaktu** (spoza `.od-sec`) też z +8 px
  — bez tego klik kotwicy „Kontakt" stawiał sekcję 1,4 px pod paskiem.
- **E2E a `imgAt`:** prawdziwy `imgAt()` czyta `import.meta.env`, którego
  Node Playwrighta nie ma — spec buduje adres z `IMG_VARIANTS` +
  `MEDIA_BASE` lokalnie.
- **Workflow baseline'ów linux padł (bieg 37113992326) na 6/8 zrzutach
  chromium desktop: „Failed to take two consecutive stable screenshots"**
  — strona zmieniała się między kolejnymi zrzutami pełnej strony.
  Przyczyna: `scrollIntoView({ block: "nearest" })` na aktywnej
  miniaturze (po `scroll` toru) i na aktywnej kotwicy (po
  IntersectionObserver) przewija też PRZODKÓW, czyli stronę w pionie,
  a to rusza elementami sticky (pasek kotwic, panel boczny) w trakcie
  zrzutu. Poprawka: `revealInStrip()` zmienia wyłącznie `scrollLeft`
  paska. Odtworzone i potwierdzone w kontenerze
  `mcr.microsoft.com/playwright:v1.61.1-noble` (ścieżka awaryjna
  z `testing.md`): bez poprawki 5/8 niestabilnych, z poprawką 8/8
  zielone w dwóch przebiegach. Komenda diagnozy (pierwszy przebieg pisze
  brakujące `*-linux.png`, drugi je porównuje):

  ```
  docker run --rm -v "$PWD":/work -v /work/node_modules -w /work -e CI=1 mcr.microsoft.com/playwright:v1.61.1-noble bash -c "corepack enable; pnpm install --frozen-lockfile; pnpm build:visual; pnpm exec playwright test tests/visual/oferta.spec.ts --project=chromium-1920"
  ```

  Po diagnozie `rm -rf .pnpm-store` (store pnpm z kontenera ląduje
  w repo i wywraca `format:check`) oraz `git clean -f tests/visual/__screenshots__`. Baseline'y linux nadal z workflow (kontener
  tylko do diagnozy; wygenerowane w nim PNG usunięte).
- **Job `lighthouse` na PR #21 (bieg 37115724942) padł na TBT mobile
  `/oferty/` = 715 ms > 600** — na LIŚCIE, nie na detalu. Raport mediany:
  jedno zadanie hydratacji wyspy 765 ms (R27 z 4.2 b: to samo zadanie
  w pomiarach 31–54 ms, odstające 456 i 1 238 ms), `script` listy
  28 254 B — wyspa co do bajta jak po (c) (38 236 B; +31 B to chunk
  `site-config` z nowymi stałymi), detale TBT 0–92 ms. Zmiana PR-a nie
  dotyka kodu listy, więc to wariancja runnera, nie regresja. Ścieżka:
  ponowny bieg CI (push commitu docs); czerwień ponownie = decyzja
  o progu TBT (jak #18) albo o odchudzeniu hydratacji (mniej kart
  w pierwszym renderze — zmiana architektury §12.2, osobna decyzja).
- **Visual `not-found-full` na webkit-iphone-se** padł RAZ w łańcuchu
  końcowym (wysokość strony 1 447 px zamiast 1 361 — `100svh` pod
  obciążeniem), w izolacji i w pełnym `test:visual` wcześniej zielony;
  baseline nietknięty.
- **Pełny `pnpm test:e2e`** pod obciążeniem (równolegle preview + MCP
  przeglądarki, 18 min) dał 6 czerwonych z limitu 30 s w specach
  nietkniętych (`oferty-wyspa`, `navigation`, `offers-skeleton`,
  `smoke` na webkit-SE); powtórzone na czystej maszynie — zielone.
- PLACEHOLDER (U9) nowe: `DETAIL` w `offers-ui.ts` (§7).
- **Zostaje do (b)** (`feat/oferta-lightbox` od main po merge'u (a)):
  lightbox na `overlay.ts` (§3.4; `data-gal-open` już czeka), arkusz
  druku (§3.5), 404 świadoma ofert (§3.6), visual `oferta-lightbox`,
  `oferta-druk`, `not-found-offer`.

