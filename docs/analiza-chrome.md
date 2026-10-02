# Mini-analiza 4.1 — chrome globalny (navbar, menu mobilne, stopka)

> **Status:** ZAAKCEPTOWANA 2026-10-02 (wszystkie rekomendacje z §6:
> wariant A szkieletu „/", dwa adresy w stopce, podkład sheetu .96, logo
> 600 px), ZREALIZOWANA na gałęzi `feat/chrome`. Część 4.1 Etapu 4 wg
> instrukcji wykonawczej (dokument lokalny, `docs/plan/`) — tabela 4.1
> i „Zasada rozjazdów". Referencja wyglądu: nagłówek i stopka
> `docs/design/export/index.html` (wariant strony głównej) oraz
> `kontakt.html` (wariant stały), `assets/js/site.js` §1 i §4,
> `assets/css/site.css` (sekcje navbar/menu). Baza wiedzy — odsyłacze
> sekcją, bez cytowania.

## 1. Inwentarz z designu

### 1.1 Navbar desktop (≥ 1025 px)

| Element | Design | Port |
| --- | --- | --- |
| Pasek | sticky, 96 px, gutter 48 px (32 px poniżej 1200 px), bez tła poza szkłem | FIXED (jak dziś), `--hdr-h` 96 px, gutter `--g` z `global.css` |
| Szkło | `rgba(221,221,221,.39)` + blur 22 px + linia `rgba(24,58,107,.12)` | tokeny `--glass`, `--glass-line` (już są) |
| Logo | pudełko 196×52, obraz 42 px wysokości; na „/" dwa obrazy nałożone (jasny `logo-silver` nad hero → ciemny `logo-color` po scrollu) | oba WebP z `src/assets/logo/` (600 px, q 90); poza „/" tylko `logo-color` |
| Pozycje | 6: Oferty · Sprzedaj z nami · O nas · Usługi · Praca · Kontakt; Archivo 500 13 px (12 px < 1200), tracking 0,16 em, wersaliki, kolor `#1a1a1a` → granat na hover; podkreślenie 1 px wjeżdżające od lewej; bieżąca = granat + miedziana kreska | `src/i18n/nav.ts` (bez zmian), „Praca" za `SHOW_PRACA`; kolor tekstu = token `--ink` |
| Efekt liter | każda litera to `.hn-ch` z DWOMA kopiami (`clip-path: inset(0)`), hover przesuwa obie o −100 % (0,42 s, `cubic-bezier(.76,0,.24,1)`), opóźnienie `i × 0,028 s`; spacja = `.hn-sp` 0,3 em; link ma `aria-label`, litery `aria-hidden` | litery generowane w Astro (zero JS); opóźnienie z `--i` inline; cały ruch liter za `@media (prefers-reduced-motion: no-preference)` |
| Telefon | pigułka granatowa, biały tekst, Manrope 500 14 px, promień 999 | slot `a[data-tel]` (bez JS ukryty — jak dziś) |

### 1.2 Navbar — wariant strony głównej (`data-scroll-nav`, tylko „/")

| Element | Design (`site.js` §4) | Port |
| --- | --- | --- |
| Postęp `e` | `start = 0,32 × h`, `end = h − navH`, `h` = wysokość hero; smoothstep | **próg scrolla, nie selektor hero:** `h = innerHeight` (hero z 4.4 jest pełnoekranowe, więc wzór zostaje identyczny); stałe w `nav-config.ts` |
| Co się przemalowuje | szkło `0 → 1`; scrim (gradient 190 px od `rgba(12,11,10,.55)`) `1 → 0`; logo jasne `1 → 0`, ciemne `0 → 1`; kolor linków biały `.88` → `#1a1a1a`, cień tekstu gaśnie, halo hover gaśnie; cień pigułki gaśnie; mobile: kreski burgera `#ddd → #183a6b`, szkło i logo jak wyżej | jedna pętla rAF ustawia KILKA zmiennych CSS na `header` (`--nav-e`, kolory, alfa cienia); CSS konsumuje. Wygładzanie własną pętlą (reguła `scroll.md`), przy `reduce` bez dociągania (skok do wartości) |
| `data-solid` | brak w designie | zostaje jako KONTRAKT testów: na „/" = `e ≥ 1`; na pozostałych trasach jak dziś (po 8 px) |

Scrim z designu występuje tylko w gałęzi desktopowej; na jednym markupie
dostaje go też mobile (poprawia czytelność jasnego logo nad jasną
treścią; na docelowym hero jest niewidoczny w praktyce).

### 1.3 Navbar mobile + bottom sheet (≤ 1024 px)

| Element | Design (`site.js` §1, `site.css`) | Port |
| --- | --- | --- |
| Pasek | `clamp(80px, 23vw, 120px)`, logo 37–56 px, burger 44×44 z dwiema kreskami 38×2,5 (X po otwarciu); na „/" kreski jasne | jak dziś (`.mbtn`), kolor kresek z `--nav-*` na „/" |
| Sheet | scrim `#08101e` α .26; panel od dołu `translateY(101 %) → 0` 0,42 s, promień 18 px, cień; lista Manrope 400 `clamp(21px, 6.15vw, 30px)` granat, 64 px/wiersz; stopka sheetu: etykieta „Zadzwoń" + numer + mały `logo-color` | mechanika `overlay.ts` (focus-trap, Esc, scrim, swipe-down, blokada scrolla) — **NIE** portujemy `html.mnav-lock` ani guardów z `site.js` |
| Pozycje sheetu | „Przeglądaj oferty", Sprzedaj z nami, O nas, Usługi, Praca, Kontakt (bez „Strona główna" — logo) | `sheetLabel` w `nav.ts` (już jest) |
| Tło sheetu | szkło `.39` + blur | **podkład gęstszy** `rgba(243,242,239,.96)` + blur (decyzja Etapu 0, podtrzymana): na „/" sheet otworzy się nad ciemnym hero, a granatowy tekst na szkle `.39` nie trzyma AA; allowlista axe ma zostać pusta |
| Zamknięcie przy przejściu na desktop | `matchMedia('(min-width:1025px)').change → set(false)` | jest w Navbarze (`desktopMQ`), dostaje test |

### 1.4 Stopka (identyczna na wszystkich podstronach eksportu)

| Blok | Mobile | Desktop |
| --- | --- | --- |
| Rząd 1 | `logo-silver` 22–26 px + telefon (Archivo, miedziana kreska) | logo 22–30 px, hasło (14–17 px, 32 ch), telefon duży (24–34 px, do prawej), CTA „Skontaktuj się z nami" (obrys) |
| Hasło | „Nieruchomości, dokumenty i sprawy prawne — w jednym miejscu." (15 px, 260 px) | j.w. |
| Przyciski | siatka 2 kolumny: „Zadzwoń" (tło miedź, tekst `--ink`) + „Napisz" (obrys) | brak — zamiast tego telefon + CTA |
| Mapa strony | 7 pastylek z obrysem (Strona główna + 6 pozycji), 44 px | 7 linków Archivo 13 px wersaliki, kreski górna i dolna |
| Dane | „Biuro:" adres poznański → link do map; godziny; nazwa rejestrowa; NIP · REGON | te same dane w jednym wierszu z etykietami `Biuro:` / `Godziny:` / `Firma:` |
| Pas dolny | Polityka prywatności (13 px), © 2026 Hetman Nieruchomości, „Realizacja: hadrianm — pracownia stron i aplikacji" (11 px) | © · polityka · realizacja (13 px, realizacja do prawej) |

Mapy: link `https://maps.google.com/?q=…` otwierany po KLIKNIĘCIU
(zero żądań do podmiotów trzecich przy wejściu — stała techniczna 10).

### 1.5 Wektor znaku

W eksporcie **nie ma logo w SVG** — wyłącznie `logo-color.png`
i `logo-silver.png` (1500×346/344) oraz 12 inline'owych `<svg>` ikon
interfejsu w `index.html`. Zgodnie z promptem: zgłaszam, własnego
odrysu nie robię. Chrome stoi na pochodnych WebP 600 px z Etapu 0
(29 KB + 20 KB); `favicon.svg`, ikony i og-image zostają na Etap 6
(P10 w instrukcji).

## 2. Rozjazdy design ↔ baza wiedzy — rozstrzygnięcia

| # | Rozjazd | Rozstrzygnięcie | Źródło |
| --- | --- | --- | --- |
| R1 | Stopka designu nie ma adresu siedziby ani e-maila | **Obowiązuje baza wiedzy.** Wiersz `Firma:` dostaje nazwę rejestrową, adres siedziby (Wrocław, wg CEIDG), NIP i REGON; dochodzi wiersz `E-mail:` ze slotem `a[data-mail="biuro"]`. Wiersz `Biuro:` (adres poznański z linkiem do map) ZOSTAJE — to miejsce spotkań; etykiety rozróżniają oba adresy | `docs/kb/formularze-wspolne.md` §3; part1 §1 |
| R2 | Mobile: „Napisz" to w designie goły `mailto:biuro@…` w HTML | kotwica ze slotem `data-mail="biuro" data-fill="href"` — etykieta zostaje, cel wstawia JS; bez JS prowadzi na `/kontakt/`. Analogicznie „Zadzwoń" (`data-tel data-fill="href"`) | kontrakt antyscrapingowy (`contact-details.ts`, `navigation.spec.ts`) |
| R3 | Telefon w pasku i stopce designu to pełny `tel:` w HTML | sloty `a[data-tel]` jak dziś (bez JS ukryte) | j.w. |
| R4 | NIP w designie bez myślników (`8951815332`), w bazie z myślnikami | zostaje zapis z designu (prezentacja; ten sam zapis w `jsonld.ts`) | part1 §1 — wartość ta sama |
| R5 | Godziny: design „pon.–pt. 11:00–17:00, inne terminy po ustaleniu" | zgodne z bazą wiedzy (część zdania o spotkaniu w innym terminie) — **nie** placeholder | part1 §1 |
| R6 | Etykiety danych stopki w designie mają α .45 na granacie | **α .7** — .45 nie trzyma AA (ok. 3,4:1 przy 14 px); allowlista axe pusta | reguła a11y (`testing.md`) |
| R7 | Tło sheetu: szkło .39 | podkład .96 + blur (patrz 1.3) | j.w. |
| R8 | Kolor tekstu nawigacji `#1a1a1a` | token `--ink` `#1c1b19` (tokeny z `docs/design/README.md`) | — |
| R9 | `aria-label` linków w designie wersalikami (`"OFERTY"`) | etykieta w naturalnej pisowni (czytniki ekranu literują wersaliki jak skrót); wersaliki tylko `text-transform` | a11y |
| R10 | © rok wpisany na sztywno („2026") | rok z `BUILD_NOW` (`src/lib/offers/data.ts`) — stała techniczna 7; w `build:visual` daje 2026 | kontekst wspólny, stała 7 |

Bez rozjazdu: „Praca" w menu (part2 §12: w v8 jest, D05/D39 → flaga
`SHOW_PRACA`), brak sekcji social (part1 §1: brak profili), jeden
telefon i dwa adresy e-mail (`biuro` w stopce; `joanna` dopiero w karcie
agenta, 4.3).

## 3. Czego design nie ma, a trzeba zbudować

1. **Próg scrolla bez hero.** Wariant „/" działa na dzisiejszym
   szkielecie: `h = innerHeight` (stałe `NAV_HOME_FADE_START = 0.32`,
   `NAV_HOME_FADE_END_PAD = navH` w `nav-config.ts`). Mechanizm
   `[data-navref]`/`NAV_SOLID_HERO_PAD_PX` z Etapu 0 (nigdzie
   nieużywany) wychodzi — 4.4 nie potrzebuje selektora hero, bo hero
   jest pełnoekranowe. `sections.md` dostaje aktualizację.
2. **Jedna pętla rAF, zmienne CSS zamiast stylów inline per link**
   (design pisze `style` na każdym linku i kresce co klatkę).
3. **Generowanie liter w Astro** (design ma je wpisane ręcznie) — z tej
   samej tablicy `mainNavItems`, więc flaga `SHOW_PRACA` i ewentualna
   zmiana etykiety nie wymagają ręcznego przepisywania spanów.
4. **Stan bez JS:** pasek z tłem, pozycje widoczne, telefon ukryty
   (kontrakt), „Zadzwoń"/„Napisz" prowadzą na `/kontakt/`, sheet
   niedostępny (jak dziś; menu desktop jest pełne, a mobile ma stopkę
   z 7 linkami).
5. **Mobile na „/":** kreski burgera, logo i szkło idą z tych samych
   zmiennych co desktop (design robi to osobno w gałęzi `.br-m`).
6. **Dane siedziby** dochodzą do `BUSINESS` w `src/lib/jsonld.ts`
   (jedyne źródło danych firmy; węzły JSON-LD bez zmian — adres
   `RealEstateAgent` to nadal biuro).

Skrypt Navbara rośnie o ok. 1 KB (pętla rAF + mieszanie kolorów);
litery i halo to czysty CSS.

## 4. Kontrakty i testy

**Selektory utrzymane** (`navigation.spec.ts`, `not-found.spec.ts`,
`chrome.spec.ts`): `header.hdr[data-nav]`, `.hdr-logo`, `.hdr-nav`,
`.nav-link`, `.hdr-tel`, `.mbtn[data-burger]`, `#nav-sheet`, `.m-link`,
`.sheet-call`, `[data-overlay-drag]`, `data-solid`, `data-open`,
`NAV_DESKTOP_MIN_PX`, `expectBreakpointFlip` na 1025.

**Nowe/zmienione kontrakty (ten sam PR):**

| Kontrakt | Test |
| --- | --- |
| Wariant „/": `header[data-scroll-nav]` TYLKO na `/`; na górze `.hdr-bg` opacity 0, logo jasne widoczne, ciemne niewidoczne, bez `data-solid`; po przewinięciu o `innerHeight` — `data-solid`, szkło 1, logo zamienione; na `/kontakt/` brak atrybutu, szkło 1 od razu | e2e `navigation` (desktop i mobile) |
| Zamknięcie sheetu przy przejściu na desktop: otwarty sheet + `setViewportSize(1025)` → `#nav-sheet` ukryty, `data-open` zdjęty, `aria-expanded=false` | e2e `navigation` (mobile) |
| Litery: każdy `.nav-link` ma `aria-label` = etykieta i tyle `.hn-ch`, ile liter; po hover pierwsza kopia litery ma `translateY < 0`; **przy `prefers-reduced-motion: reduce` transform = none** (punktowa emulacja `page.emulateMedia({ reducedMotion })` z komentarzem — wyjątek od reguły `testing.md`) | e2e `navigation` (desktop) |
| Stopka: 7 linków mapy strony = `footerNavItems`; tekst zawiera nazwę rejestrową, NIP, REGON i adres siedziby; KAŻDY `footer a[data-tel]` ma `tel:`; KAŻDY `footer a[data-mail="biuro"]` ma `mailto:`; „Zadzwoń"/„Napisz" przed JS prowadzą na `/kontakt/` (asercja na surowym HTML) | e2e `navigation` (spec adaptowany: dziś `toHaveAttribute` na pojedynczym locatorze — po zmianie slotów jest ich więcej) |
| Antyscraping na surowym HTML 8 tras: bez numeru i maili | bez zmian |
| axe: zero naruszeń na 8 trasach + 404 | `a11y.spec` bez zmian (allowlista pusta) |

**Zrzuty (`chrome.spec.ts`, bez nowych speców):** istniejące
`chrome-bar` (desktop, `/kontakt/`) i `chrome-sheet` (mobile) rozjadą
się — zamierzone. Nowe: `chrome-home-top` (pasek na `/` przy
`scrollY = 0`, 6 profili), `chrome-home-solid` (pasek na `/` po
przewinięciu o `innerHeight` z dosztukowaną wysokością strony, 6
profili), `chrome-footer` (element `footer` na `/kontakt/`, 6 profili).
Razem po 18 nowych PNG na platformę (darwin + linux = 36) plus
regeneracja 36 istniejących (`chrome-*`, `not-found-*`). Progi per-shot
bez zmian; wideo nie ma, masek nie dokładam.

**Kolejność baseline'ów** (święta): kod → workflow „Update linux visual
baselines" z `feat/chrome` (spec `tests/visual`, mode `changed`) →
`git pull` → diff darwin pokazany Mateuszowi → `pnpm test:visual:update`
→ commit darwin na końcu.

**Budżety LHCI (ratchet):** chrome dokłada ~1 KB JS (script dziś 7 KB
w `dist/_astro`, próg 30 000 B) i drugie logo na „/" (+20 KB obrazu,
próg total 1 000 000 B). Fonty bez zmian (4 pliki). Zużycie z `dist`
po `build:visual` trafi do raportu.

## 5. Co sprawdzić na fizycznym telefonie

1. Sheet: swipe-down za uchwyt i z treści przewiniętej na górę; brak
   odświeżenia strony (Android); tap w scrim; blokada scrolla pod
   sheetem (iOS Safari).
2. Wariant „/": chowanie paska adresu Safari/Chrome zmienia
   `innerHeight` — przemalowanie ma nie skakać (próg liczony przy
   resize), kreski burgera mają zmienić kolor razem z tłem.
3. Blur szkła paska (`backdrop-filter`) podczas przewijania na słabszym
   Androidzie — klatkowanie = sygnał do rezygnacji z bluru na mobile.
4. Linki `tel:` z paska sheetu i z przycisku „Zadzwoń" w stopce
   (otwierają dialer); „Napisz" otwiera klienta poczty z `biuro@`.
5. Rozmiar celów dotykowych: burger 44 px, pozycje sheetu 64 px,
   pastylki stopki 44 px.
6. Czytelność jasnego logo i kresek na górze „/" na DZISIEJSZYM
   szkielecie (jasne tło + scrim) — stan przejściowy do 4.4.
7. iOS „Ogranicz ruch": litery w pasku desktop nie dotyczą telefonu;
   sheet otwiera się bez animacji (overlay.ts respektuje `reduce`).

## 6. Pytania do Mateusza

1. **Szkielet „/" pod przezroczystym paskiem.** Rekomendacja (A):
   zostawić dzisiejszą treść — pasek jasny + scrim nad jasnym tłem,
   czytelny, ale „nie po designie" do 4.4; zero kodu do wyrzucenia.
   Alternatywa (B): tymczasowy ciemny pas `--navy-deep` o wysokości
   100 svh w `SkeletonPage` na „/" (ok. 10 linii CSS, wyrzucone w 4.4),
   dzięki czemu `nowa.` i baseline'y `chrome-home-*` pokazują docelowy
   kontrast. Wybieram A, chyba że wolisz B.
2. **Dwa adresy w stopce** (`Biuro:` Poznań z linkiem do map + siedziba
   w wierszu `Firma:`). Baza wiedzy ostrzega przed dwoma adresami obok
   siebie w karcie kontaktu; w stopce są rozdzielone etykietami.
   Rekomendacja: oba, jak w R1. Alternatywa: siedziba tylko w polityce,
   a w stopce sama nazwa + NIP/REGON + e-mail — ale to osłabia wymóg
   „adres łatwo dostępny" z §3.
3. **Podkład sheetu** `.96` zamiast szkła `.39` (R7) — akceptujesz
   odejście od wyglądu designu na rzecz kontrastu?
4. **Logo 600 px** (29 + 20 KB): wystarczy do 3× przy 42 px wysokości.
   Zostawiam; mniejsze pochodne (np. 400 px) to osobna decyzja, jeśli
   budżet `total` zacznie uwierać po 4.4.

## 7. Lista PLACEHOLDER (U9; zamykana w 7.7)

| Tekst | Miejsce | Uwagi |
| --- | --- | --- |
| „Nieruchomości, dokumenty i sprawy prawne — w jednym miejscu." | `Footer.astro` (hasło) | draft z designu, baza wiedzy go nie potwierdza |
| „Skontaktuj się z nami" (CTA desktop), „Zadzwoń" / „Napisz" (mobile) | `Footer.astro` | brzmienie z designu |
| „Przeglądaj oferty" (pozycja sheetu) | `src/i18n/nav.ts` | brzmienie z designu; w pasku „Oferty" |
| „Realizacja: hadrianm — pracownia stron i aplikacji" | `Footer.astro` | treść Mateusza — do potwierdzenia brzmienia i adresu |
| „© {rok} Hetman Nieruchomości" | `Footer.astro` | pisownia nazwy w © (design: „Hetman", rejestr: „HETMAN") |

Nie są placeholderami (potwierdzone w bazie wiedzy): etykiety menu,
godziny biura, nazwa rejestrowa, NIP, REGON, adres biura, adres
siedziby, `biuro@`, telefon.

## 8. Pliki do zmiany (po akceptacji)

- `src/components/navbar/Navbar.astro`, `nav-config.ts` — wygląd
  docelowy, litery, wariant „/", pętla rAF;
- `src/components/Footer.astro` — układ z designu per breakpoint,
  dane z R1, sloty z R2, rok z `BUILD_NOW`;
- `src/lib/jsonld.ts` — pola siedziby w `BUSINESS` (węzły bez zmian);
- `src/styles/global.css` — ewentualne tokeny (`--scrim`), bez zmian
  progów;
- `tests/e2e/navigation.spec.ts`, `tests/visual/chrome.spec.ts` — jak
  w §4; `tests/visual/__screenshots__/**` — wg świętej kolejności;
- `.claude/rules/sections.md` (chrome po 4.1), `.claude/rules/testing.md`
  (stan po 4.1), `CLAUDE.md` (wpis 4.1), `docs/README.md` (ten plik).
