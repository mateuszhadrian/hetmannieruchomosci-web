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
  `prefers-reduced-motion: no-preference`; bez JS / przy reduce sekcja
  renderuje pełną, statyczną treść. Reveale i parallaxy designu
  (`data-rv`, `data-px`) portujemy na CSS + IntersectionObserver za
  bramką `js-motion` — triggery zawsze na scrollu DOKUMENTU.
- **BEZ bibliotek ruchu i scrolla** — ruch sekcji to własne pętle rAF
  i `IntersectionObserver` (wzorzec `content-motion.ts`).
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
