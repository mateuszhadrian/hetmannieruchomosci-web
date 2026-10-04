# Mini-analiza 4.6 — `/uslugi/`

> **Status:** ZAAKCEPTOWANA 2026-10-04 (wszystkie rekomendacje Q1–Q7
> z §9), zakodowana na gałęzi `feat/uslugi` — uzupełnienia po implementacji
> w §10. Część 4.6 Etapu 4 wg instrukcji
> wykonawczej (dokument lokalny, `docs/plan/`): akapit 4.6, „Tryb pracy",
> „Zasada rozjazdów"; prompt §4.6 z `etap-4-prompty.md`. Referencja
> wyglądu: `docs/design/export/uslugi.html` (gałęzie `.br-m` i `.br-d`),
> `assets/js/site.js` §4 (pasek nad hero), §7 (kotwice) i §10 (reveale,
> parallax). Baza wiedzy nie ma dla tej strony reguł logiki ani wartości
> (strona statyczna, treść w kodzie — part1 §2); obowiązują zasady ogólne:
> part2 §0 (design = wygląd) i U9 (teksty z designu to drafty).
> Spójność z 4.5 (`analiza-o-nas.md`: hero w dwóch układach na jednym
> markupie, zdjęcie tylko na jednym progu, pomiar kontrastu A15, wartości
> `data-px`, A25 priorytet zdjęć tła), 4.4 (`analiza-home.md`: H13 kolory
> AA, H17 kadr pionowy, H18 element LCP; sekcja 03 z linkami do kotwic)
> i 5A (`analiza-formularze-a.md` §11: kotwica z asercją położenia, F38
> wariant paska nad hero).

## 0. Zakres

Jeden PR, gałąź `feat/uslugi`: hero z trzema wejściami do sekcji,
„Sprzedaję" (5 pozycji) z pasem CTA, „Kupuję" (5) z pasem CTA, „Pomoc
prawna" (6) — czysty Astro + moduł ruchu (bez wyspy, bez formularza).
Chrome bez zmian: strona przekazuje `<Navbar overHero />` i oznacza hero
atrybutem `data-nav-hero` (mechanizm z 5A).

Poza zakresem: formularze, oferty, „/" (poza sprawdzeniem linków sekcji
03), 404, `/o-nas/`, polityka (4.7), sync, dane, fixture, progi LHCI,
chmura, JSON-LD (Etap 6), poprawki z testów na `nowa.`.

## 1. Inwentarz z designu

Strona ma `data-anim` (reveale i parallax) oraz pasek przezroczysty nad
hero na OBU gałęziach. Tytuły `h1`, `h2`, `h3`, akapity i opisy pozycji
są w obu gałęziach IDENTYCZNE (porównanie skryptem: 55 i 58 elementów
tekstowych); różnice to pięć pozycji opisanych w §2 (SV1–SV3).

| Sekcja | Telefon i tablet (poniżej 1025) | Desktop (od 1025) |
| --- | --- | --- |
| **Hero** (`--navy-deep`, `min-height` = okno) | u góry na jednolitym granacie: eyebrow, `h1` biały z frazą w miedzi, akapit; pod nimi pole ZDJĘCIA wypełniające resztę okna (promień lewego górnego rogu 48–72 px, gradient 0 → .25 → .85), a w nim u dołu trzy wejścia: dwa szklane kafle (nadtytuł + tytuł + strzałka) i podkreślony link tekstowy | zdjęcie na całe okno BEZ gradientu; szklana karta do 760 px (granat .24, blur 14): eyebrow, `h1` srebrny 38–60 px, akapit; u dołu pas trzech kafli-linków na szkle (srebro .16, blur 22, `min-height` 120 px) |
| **02 Sprzedaję** (`--bg`) | nagłówek, akapit, zdjęcie „klucze" 4:3 (promień, parallax), lista 5 pozycji (numer 38–48 px, `h3`, opis), blok CTA W sekcji: zdjęcie tła „doradcy" + gradient .8–.92, akapit, przycisk telefonu, szklany przycisk „Formularz / Sprzedaj z nami →" | siatka 5,6fr / 6,4fr: nagłówek, akapit, zdjęcie 4:3 · lista z liniami między pozycjami; pas CTA jako OSOBNA sekcja na całą szerokość (`min-height` 440 px, gradient poziomy .9 → .28): eyebrow „Pierwszy krok", akapit 19–26 px · dwa przyciski |
| **03 Kupuję** (`--bg`) | nagłówek, akapit, zdjęcie „prezentacja 2" 4:3 (kierunek odwrotny), lista 5 pozycji, blok CTA ze zdjęciem tła „prezentacja 1": akapit, „Skontaktuj się z nami", „Przeglądaj oferty →" | wiersz 6fr / 6fr: nagłówek i akapit · dwa kadry 3:4 („prezentacja 1" z promieniem, „prezentacja 2" opuszczona, kierunek odwrotny); lista w wierszach trzykolumnowych (numer · `h3` · opis); pas CTA na całą szerokość BEZ zdjęcia (sam gradient): eyebrow „Twoje nowe miejsce", akapit · dwa przyciski |
| **04 Pomoc prawna** (ciemna) | nagłówek, akapit, dwa kadry 4:5 („prawne 1" z promieniem, „prawne 2" opuszczona, kierunek odwrotny), lista 6 pozycji, blok zamykający ze zdjęciem tła „prawne 3" (`min-height` 320–380 px, promień, gradient 0 → .9): akapit i szklany przycisk „Opisz swoją sprawę" | `min-height` = okno; zdjęcie tła „prawne 3" na całą sekcję + gradient .94 / .84 / .94; siatka 7fr / 4,6fr: nagłówek, akapit, lista w DWÓCH kolumnach · kadr „prawne 1" 3:4 i szklana karta: eyebrow „Pierwsza rozmowa", akapit, miedziany przycisk |

Ruch (§10): bloki treści sekcji 02–04 odsłaniane po wejściu w kadr (lista
jako jeden blok; bloki na szkle bez animacji poniżej 1025); parallax:
zdjęcie hero, zdjęcia tła i kadry w treści; „prezentacja 2" i „prawne 2"
jadą w kierunku odwrotnym (`data-px="-1"`).

Kotwice: w eksporcie z sufiksami (`sprzedaje-m` / `-d` itd. — artefakt
dwóch gałęzi, `site.js` §7); telefon: `scroll-margin-top` = pasek +
12–20 px; desktop: sekcje docelowe mają WŁASNE dopełnienie górne
z wysokością paska (96 px + 24–48 px) i zerowy margines przewijania.

Obrazy (pochodne z Etapu 0 w `src/assets/img/`, każdy z wariantem `-m`):
`uslugi-hero` 1440×617 / 1024×439, `uslugi-klucze` 896×1344 / 720×1080,
`uslugi-doradcy`, `uslugi-prezentacja1`, `uslugi-prezentacja2`,
`uslugi-prawne1`, `uslugi-prawne2`, `uslugi-prawne3` — 900×1125 /
720×900 (`uslugi-doradcy` jest też tłem sekcji 03 strony głównej).

## 2. Rozjazdy — rozstrzygnięcia

Numeracja `SV` (services). Baza wiedzy nie reguluje tej strony — rozjazdy
dotyczą dwóch gałęzi eksportu, dostępności i reguł projektu.

| # | Design | Rozstrzygnięcie | Podstawa |
| --- | --- | --- | --- |
| SV1 | **Trzecie wejście hero ma dwa brzmienia i dwa wyglądy.** Telefon: link tekstowy „Potrzebujesz tylko pomocy prawnej?"; desktop: kafel „Nie planuję transakcji / Potrzebuję pomocy prawnej →" | jeden markup, jedno brzmienie → Q1 (rekomendacja: desktopowe — pierwsza osoba, jak dwa pozostałe wejścia; na telefonie wejście zostaje lżejszym, podkreślonym linkiem) | jeden markup (`sections.md`); U9 |
| SV2 | **Przycisk telefonu w pasie CTA:** telefon „Zadzwoń", desktop „Zadzwoń i umów wycenę"; numer wpisany jako `tel:` | jedno brzmienie → Q2; numer przez slot `a[data-tel][data-fill="href"]` (etykieta zostaje, bez JS link prowadzi na `/kontakt/` — jak przyciski stopki) | `contact-details.ts`; `analiza-chrome.md` |
| SV3 | **Eyebrow bloków CTA** („Pierwszy krok", „Twoje nowe miejsce", „Pierwsza rozmowa") tylko na desktopie | jedna treść → Q2 (rekomendacja: eyebrow na obu progach) | `analiza-o-nas.md` A3 |
| SV4 | Pas CTA „Sprzedaję": na telefonie blok w sekcji, na desktopie osobna sekcja | jeden markup: blok jest OSTATNIM dzieckiem `section#sprzedaje` (tak design buduje pas „Kupuję" na desktopie); poniżej 1025 px stoi w kolumnie treści, od 1025 px wychodzi na całą szerokość okna. Ten sam komponent niesie pas „Kupuję" | jeden markup |
| SV5 | **Zdjęcia w różnych miejscach per próg:** „prezentacja 1" — tło bloku CTA (telefon) albo kadr w treści (desktop); „prawne 3" — tło bloku zamykającego albo tło całej sekcji; „prawne 2" tylko na telefonie; pas CTA „Kupuję" na desktopie bez zdjęcia | dwa elementy `<img>` tam, gdzie zdjęcie zmienia rodzica, przełączane `display` (`lazy` — ukryty wariant nie jest pobierany; znacznik `data-services-extra`); moduł parallaxu i sondy e2e pomijają kadry o wysokości 0 | `analiza-o-nas.md` A3 (`[data-about-extra]`) |
| SV6 | „Pomoc prawna": telefon — nagłówek, akapit, zdjęcia, lista, blok zamykający; desktop — lewa kolumna (nagłówek, akapit, lista), prawa (zdjęcie, karta) | DOM w układzie desktopu (dwie kolumny); poniżej 1025 px kolumny są `display: contents`, a zdjęcia wchodzą między akapit i listę przez `order`. Jedyny element interaktywny sekcji (przycisk) jest ostatni w DOM i na ekranie — kolejność fokusu się nie zmienia | `analiza-o-nas.md` A5 |
| SV7 | Kotwice z sufiksami | `id="sprzedaje"`, `id="kupuje"`, `id="pomoc-prawna"` na sekcjach. Telefon i tablet: `scroll-margin-top: var(--hdr-h)` (górna krawędź sekcji pod paskiem). Desktop — jak design: dopełnienie górne sekcji zawiera wysokość paska, margines przewijania 0 (sekcja staje przy górnej krawędzi okna, szklany pasek leży na JEJ tle, nagłówek pod paskiem). Bez `scroll-behavior: smooth` | prompt §4.6; `scroll.md` |
| SV8 | Wejście z kotwicą w adresie z innej strony (`/uslugi/#kupuje` ze strony głównej) | przeglądarka skacze do celu, zanim układ jest ostateczny (fonty, pomiar `--hdr-h`); silniki bez kotwiczenia przewijania (WebKit) zostawiają wtedy cel przesunięty → Q4 (rekomendacja: krótka korekta pozycji w skrypcie strony). Wysokość dokumentu NIE zależy od wczytania obrazów: każdy kadr ma `aspect-ratio` albo wysokość z układu, zdjęcia tła są absolutne | lekcje F36 i kotwicy „Sprzedaj z nami" (`sections.md`) |
| SV9 | **Zdjęcie hero** (źródło 1440×617): (a) na telefonie pole zdjęcia jest PIONOWE albo zbliżone do kwadratu (proporcje ok. 0,75–1,25:1) — plik `-m` (1024×439) ma za mało wysokości; (b) pełne okno na desktopie i ekrany @3× to skalowanie w górę | (a) kadr `uslugi-hero-tall.webp` — wycinek o PEŁNEJ wysokości źródła wokół pozycji 50 % (przepis H17), podawany poniżej 768 px; `uslugi-hero-m.webp` przestaje być używany. (b) → Q3 | `analiza-home.md` H17; `docs/design/README.md` |
| SV10 | Parallax zdjęcia hero na telefonie: kadr NIE zaczyna się na górze strony (stoi pod blokiem tekstu), więc `data-px="top"` w dzisiejszym kształcie dawałby przy scrollu 0 przesunięcie ok. +20 px — przeskok po wczytaniu modułu | → Q5 (rekomendacja: `top` liczy punkt zerowy z POZYCJI KADRU w dokumencie; dla kadru od góry strony wynik jest identyczny jak dziś) | `analiza-o-nas.md` A20 |
| SV11 | Kolory poniżej AA na jasnym tle: eyebrow miedziany, fraza `h2` w miedzi, biały tekst na miedzianych przyciskach | tokeny jak w 4.4 i 4.5: eyebrow `--copper-text`, fraza `--copper-dark`, przycisk `sx-btn` (tekst `--ink`); na ciemnych sekcjach `--copper-light`. Numery pozycji (miedź z kryciem .42 / .5) to dekoracja — licznik CSS w pseudo-elemencie, kolejność niesie `<ol>` | `analiza-home.md` H13 |
| SV12 | **Tekst nad zdjęciem i na szkle:** karta hero na desktopie (granat .24 nad zdjęciem BEZ gradientu — na „/" to krycie dawało 2,6:1), pas kafli hero (srebro .16), linki paska i logo nad zdjęciem bez gradientu, kafle i link na telefonie (srebro .26 nad dolną częścią zdjęcia), szklane przyciski pasów CTA (nadtytuł `#ffd6a8` 11–12 px na srebrze .39 — z rachunku ok. 4,0:1), akapity i opisy listy „Pomocy prawnej" (.74–.82) nad zdjęciem tła, blok zamykający na telefonie | **POMIAR** w trakcie implementacji (metoda A15: kontrast względem każdego piksela tła w prostokątach linii tekstu, 5. percentyl, 14 rozmiarów okna, Chromium i WebKit, razem z elementami paska). Poniżej progu rośnie krycie szkła, gradientu albo tekstu — kolory zostają; jasne elementy paska nad jasnym fragmentem zdjęcia = przyciemnienie górnego pasa ZDJĘCIA w komponencie hero, nie zmiana chrome'u → Q6 | `testing.md` (axe zwraca „incomplete") |
| SV13 | Sekcje pełnoekranowe na sondzie `--vph` | `var(--svh, 100svh)` + `armViewportPin`; hero i „Pomoc prawna" jako `min-height` (treść rozpycha na niskim oknie); odstępy hero na desktopie ograniczone przez `svh` (1366×768, 1280×680) | `analiza-o-nas.md` A12, A22 |
| SV14 | Przycisk bloku zamykającego „Pomocy prawnej": szklany na telefonie, miedziany na desktopie | jak design per próg, o ile szklany wariant przejdzie pomiar; inaczej miedziany na obu | zasada 3 |
| SV15 | `alt` zdjęć | hero i tła: `alt=""`; kadry w treści: opisy z designu (PLACEHOLDER) | — |
| SV16 | Stopka i menu w zakresie „linki mają trafiać w kotwice" | stopka i menu niosą samo `/uslugi/` (także w designie) — bez zmian. Linki sekcji 03 strony głównej mają już docelowe adresy (`home-copy.ts`); z pliku schodzi nieaktualny komentarz, HTML „/" bez zmian (odcisk) | `src/i18n/nav.ts` |

Bez rozjazdu: tytuł i opis strony (`ui.ts`), stary adres `/nasze-uslugi`
→ 301 (reguła stała z Etapu 2 — nie dochodzi druga).

## 3. Czego design nie ma, a trzeba zbudować

1. **Kadr pionowy zdjęcia hero** (SV9) — nowy plik w `src/assets/img/`,
   wpis w `docs/design/README.md`.
2. **Korekta pozycji po wejściu z kotwicą** (Q4) i asercje położenia na
   trzech profilach, w tym WebKit.
3. **Stany bez JS i przy `reduce`:** pełna, statyczna treść; pasek pełny
   (`<noscript>` z chrome'u); przycisk telefonu prowadzi na `/kontakt/`;
   kotwice działają natywnie.
4. **Tablet (768–1024):** układ telefonu w kolumnie 600 px; zdjęcie hero
   w pełnym pliku.
5. **Stany `:hover` i `:focus-visible`** kafli wejść i szklanych
   przycisków (design ma tylko hover na desktopie).
6. **Parallax zdjęcia pierwszego ekranu bez przeskoku** także wtedy, gdy
   kadr nie zaczyna się na górze strony (Q5).

## 4. Architektura i pliki

- `src/pages/uslugi.astro` — `BaseLayout` (slot `head`: dwa `preload`
  zdjęcia hero z `media`, `MotionGate`), `<Navbar overHero />`,
  `main.services`, sekcje, `Footer`; skrypt strony: `armViewportPin`,
  korekta kotwicy (Q4), dynamiczny `import()` ruchu przy `no-preference`
  (wzorzec `o-nas.astro`).
- `src/components/sections/services/`: `ServicesHero.astro`,
  `ServicesSell.astro`, `ServicesBuy.astro`, `ServicesLegal.astro`,
  `ServicesList.astro` (lista numerowana — jeden komponent, trzy układy
  desktopu: wiersze, wiersze trzykolumnowe, dwie kolumny),
  `ServicesCta.astro` (pas CTA sekcji 02 i 03), `services-copy.ts`
  (WSZYSTKIE teksty, PLACEHOLDER U9 — importują je też testy),
  `services-config.ts` (`SERVICES_DESKTOP_MIN_PX`,
  `SERVICES_HERO_TALL_BELOW_PX`, identyfikatory kotwic),
  `services-motion.ts` (wejście chunku: `initContentMotion()`).
- Prymitywy bez kopiowania: `content.css`, `SectionHead.astro`,
  `content-motion.ts`, `content-viewport.ts`, `MotionGate.astro`.
- `content-motion.ts` — tylko przy Q5 = tak: punkt zerowy trybu `top`
  z pozycji kadru w dokumencie (wspólny chunk „/", `/sprzedaj-z-nami/`,
  `/o-nas/`).
- `home-copy.ts` — sam komentarz (SV16).
- Znaczniki: `main.services`, `section[data-services="hero|sprzedaje|
  kupuje|pomoc-prawna"]`, `[data-services-hero]`,
  `[data-services-photo]`, `[data-services-entries]`,
  `[data-services-list]`, `[data-services-cta]`,
  `[data-services-extra]`, `[data-nav-hero]` (sekcja hero).
- Testy: `tests/e2e/uslugi.spec.ts`, `tests/visual/uslugi.spec.ts`,
  `navigation.spec.ts` (`OVER_HERO_PATHS` + `/uslugi/`),
  `lighthouserc*.cjs` + `/uslugi/`.
- Dokumenty: ten plik, `docs/README.md`, `CLAUDE.md`,
  `.claude/rules/testing.md`, `sections.md`, `docs/optional-todos.md`,
  `docs/design/README.md`.

## 5. Kontrakty i testy

**E2E `uslugi.spec.ts`** (treść `chromium-1920`; hero, kotwice, układ
i ruch także `chromium-pixel-5` i `webkit-iphone-14`; teksty
z `services-copy.ts`):

| Kontrakt | Asercja |
| --- | --- |
| Hero | `main h1` = tytuł + fraza, eyebrow, akapit; zdjęcie `eager`, `fetchpriority`, wymiary, `alt=""`, `opacity 1`, zero `[data-rv]` w hero; trzy wejścia `[data-services-entries] a` z `href` = `#sprzedaje`, `#kupuje`, `#pomoc-prawna`; hero od górnej krawędzi okna, wysokość ≥ okno (desktop: = okno przy 1920×1080, sub-pikselowo); surowy HTML: dwa `preload` z `media`, bramka `js-motion`; `currentSrc` przy 767 / 768 |
| **Kotwice** | (1) klik każdego wejścia hero → adres z kotwicą, górna krawędź sekcji w odległości ≤ 1,5 px od celu (telefon: dolna krawędź paska; desktop: górna krawędź okna), `h2` w oknie i pod paskiem, pierwszy blok sekcji dochodzi do `opacity 1`; (2) wejście bezpośrednie pod `/uslugi/#kupuje` i `#pomoc-prawna`; (3) ze strony głównej: klik kafla sekcji 03 → `/uslugi/#…` → to samo położenie. Wszystko przez `expect.poll`, na trzech profilach, w tym `webkit-iphone-14`; po skoku żaden `[data-rv]` NAD celem nie zostaje ukryty |
| Pasek | `navigation.spec`: `/uslugi/` w `OVER_HERO_PATHS` (próg z wysokości hero); `data-scroll-nav` w surowym HTML mają wyłącznie „/" i trasy z listy |
| Sekcje | `id` sekcji, `aria-labelledby`, `h2` (tytuł + fraza) i eyebrow; listy `[data-services-list] > li`: 5 / 5 / 6 pozycji, `h3` + opis w kolejności z `services-copy`; kadry po `alt` (`lazy`, wymiary); `[data-services-extra]` w DOM i ukryte na właściwym progu |
| Linki | pasy CTA: `/sprzedaj-z-nami/`, `/kontakt/`, `/oferty/`, „Opisz swoją sprawę" → `/kontakt/` (każdy < 400) |
| Sloty | surowy `<main>` bez telefonu, `tel:`, `mailto:`; przycisk telefonu bez JS → `/kontakt/`, po JS `tel:` z etykietą bez zmian |
| Progi | `expectBreakpointFlip(1025)`: opakowanie hero, wejścia hero, siatki sekcji, układ list, pasy CTA, elementy `extra`; 768: plik zdjęcia hero; telefon: brak przewijania w bok, cele dotyku ≥ 48 px (kafle, przyciski; link tekstowy ≥ 44 px) |
| Bez JS | brak `js-motion`, każdy `[data-rv]` `opacity 1`, `.hdr-bg` `opacity 1`, kotwice w HTML |
| Ruch | `js-motion` + `data-motion`; blok spod zgięcia `opacity 0` → `.is-in`; żaden `[data-rv]` nie jest linkiem ani przyciskiem; **sonda parallaxu** dla widocznych kadrów (wysokość > 0): zapas ≥ `PX_AMT_*` × wysokość kadru, obraz zakrywa kadr w sześciu pozycjach scrolla; zdjęcie hero: przesunięcie 0 przy scrollu 0 (± 0,2 px) na OBU progach; kierunek odwrotny; PUNKTOWA emulacja `reduce` z komentarzem (piąty wyjątek w `testing.md`); scroll natywny |
| Sieć, a11y | zero hostów trzecich po `revealSweep`; axe po `revealSweep` (desktop i Pixel 5), allowlista PUSTA |

**Visual `uslugi.spec.ts`** (`useVisualFixtureGuard`): `uslugi-top` (okno
startowe) i `uslugi-full` (fullPage po `revealSweep`, próg 0,001) × 6
profili = 12 PNG na platformę. Pomiar progiem 0 bez regeneracji:
`chrome-*` oraz — przy Q5 — `home-*`, `sprzedaj-*`, `o-nas-*` (wspólny
moduł ruchu).

**Unit:** bez zmian (widok nie ma logiki). **LHCI:** `/uslugi/` w obu
configach.

Kolejność baseline'ów: kod → workflow linux z `feat/uslugi` (spec
`tests/visual/uslugi.spec.ts`, mode `changed`) → `git pull` → diff darwin
→ darwin → commit darwin na końcu.

## 6. Budżet (prognoza; pomiar po `build:visual` w uzupełnieniach)

Baza (main `0925bc8`, `build:visual`, 2026-10-04): szkielet `/uslugi/`
`script` 8 217 B brutto / 3 402 B gzip w 4 plikach, CSS 27 685 /
6 064 B; `/o-nas/` 12 020 / 5 679 B, CSS 41 758 / 8 892 B.

| Zasób | Prognoza |
| --- | --- |
| `script` na `/uslugi/` | jak `/o-nas/` + korekta kotwicy ok. 0,3 KB → **ok. 12,4 KB brutto / 5,9 KB gzip**; w LHCI ok. 9,5–10 KB = ok. 25 % bramki 40 000 B |
| CSS | `content.css` + style pięciu komponentów: ok. +17 KB brutto / +3,5 KB gzip wobec szkieletu |
| Obrazy przy wejściu | telefon: kadr `-tall` ok. 35–45 KB; desktop: 59 KB; reszta `lazy` |
| `total` | suma WSZYSTKICH obrazów progu (górna granica — strona jest długa, ale pomiar na telefonie pobiera `lazy` z dużym wyprzedzeniem): telefon ok. 260 KB obrazów → `total` ok. **370–400 KB** (ok. 40 % z 1,0 MB); desktop ok. 300 KB obrazów → ok. **410–450 KB** (ok. 37 % z 1,2 MB) |
| LCP | telefon: pole zdjęcia hero nie wypełnia okna, więc ZDJĘCIE jest kandydatem (`preload` + `fetchpriority`, kadr `-tall`) — prognoza 2,0–2,4 s przy progu 3 200; desktop: `h1` (zdjęcie na całe okno nie jest kandydatem — H18), ok. 0,5–0,7 s |
| Trasy spoza zakresu | przy Q5: wspólny `content-motion` ok. +0,1 KB na „/", `/sprzedaj-z-nami/`, `/o-nas/`; HTML tych tras bez zmian (odcisk z hashami znormalizowanymi); wyspa listy co do bajta |

## 7. Lista PLACEHOLDER (U9; zamykana w 7.7)

Wszystkie teksty w `services-copy.ts`, brzmienie z designu:

| Sekcja | Teksty |
| --- | --- |
| Hero | eyebrow „Usługi"; `h1` „Profesjonalne pośrednictwo / od A do Z."; akapit „Gwarantujemy spokój, chronimy Twój czas…"; wejścia „Mam nieruchomość — Sprzedaję lub wynajmuję", „Szukam nieruchomości — Kupuję lub szukam najmu", trzecie — **DWA warianty** (SV1): „Nie planuję transakcji — Potrzebuję pomocy prawnej" albo „Potrzebujesz tylko pomocy prawnej?" |
| Sprzedaję | eyebrow „Sprzedaję lub wynajmuję"; `h2` „Chcesz sprzedać lub wynająć? / Zdejmiemy ten ciężar z Twoich barków."; akapit; 5 pozycji (Wycena i Strategia · Home Staging i Marketing · Prostowanie dokumentacji · Weryfikacja kupującego · Asysta przy finalizacji) z opisami; pas CTA: „Pierwszy krok", akapit „Zadzwoń i sprawdź…", przycisk — **dwa warianty** (SV2): „Zadzwoń i umów wycenę" albo „Zadzwoń"; „Formularz / Sprzedaj z nami"; opis zdjęcia |
| Kupuję | eyebrow „Kupuję lub szukam najmu"; `h2` „Szukasz nieruchomości? / Znajdziemy tę właściwą, nawet jeśli nie ma jej w internecie."; akapit (zawiera „setki przeprowadzonych rozmów"); 5 pozycji (Analiza rynku i Twoich potrzeb · Dostęp do systemu MLS · Selekcja i wizje lokalne · Audyt techniczny i prawny · Bezpieczna finalizacja) z opisami; pas CTA: „Twoje nowe miejsce", „Porozmawiajmy o Twoim nowym miejscu.", „Skontaktuj się z nami", „Przeglądaj oferty"; opisy zdjęć |
| Pomoc prawna | eyebrow „Pomoc prawna"; `h2` „Nie musisz sprzedawać, / żeby skorzystać z naszej pomocy."; akapit; 6 pozycji (Analiza stanu prawnego · Sprawy spadkowe i współwłasność · Zadłużenia i obciążenia · Reprezentacja w urzędach i sądach · Mediacje i negocjacje · Weryfikacja umów i aktów) z opisami; „Pierwsza rozmowa", akapit „Opisz nam swoją sytuację — pierwsza rozmowa nic nie kosztuje…" (**deklaracja do potwierdzenia przez klientkę**), „Opisz swoją sprawę"; opisy zdjęć |

Do rozmowy z klientką poza brzmieniem: deklaracja bezpłatnej pierwszej
rozmowy, „System MLS" (czy biuro z niego korzysta), zakres „reprezentacji
w urzędach i sądach" (opis usługi prawnej — ocena należy do klientki).

## 8. Co sprawdzić na fizycznym telefonie (i na `nowa.`)

1. **Wejścia hero:** dotknięcie każdego z trzech wejść przenosi do
   właściwej sekcji — nagłówek sekcji pod paskiem, nie pod nim schowany
   i nie w połowie ekranu; to samo po wejściu ze strony głównej (kafle
   sekcji „Usługi") i po wejściu z adresu z kotwicą.
2. **Hero na telefonie:** blok tekstu na granacie i pole zdjęcia
   wypełniają ekran; kafle wejść czytelne nad zdjęciem; zwijany pasek
   adresu Safari nie szarpie zdjęciem; zdjęcie nie „podskakuje" tuż po
   wejściu.
3. **Ostrość zdjęcia hero** na ekranie telefonu i na dużym monitorze
   (SV9 — materiał 617 px wysokości).
4. **Pasek nad hero:** jasne logo i menu czytelne; pasek pełny po
   przewinięciu hero; po skoku kotwicą pasek jest od razu pełny.
5. **Listy:** czytelność numerów i opisów, odstępy na wąskim ekranie
   (320–360 px); na ciemnej sekcji „Pomoc prawna" — czytelność opisów.
6. **Pasy CTA:** „Zadzwoń…" otwiera wybieranie numeru; szklane przyciski
   czytelne nad zdjęciem; trafialność przycisków.
7. **Parallax par zdjęć** (kierunki przeciwne) — płynność na Androidzie,
   brak prześwitu tła kadru; reveale przy szybkim przewijaniu — żadna
   sekcja nie zostaje pusta.
8. **Desktop na `nowa.`:** hero na 13″ (karta i pas kafli w pierwszym
   ekranie) i na szerokim monitorze; hover kafli; lista „Kupuję"
   w trzech kolumnach; „Pomoc prawna" — lista w dwóch kolumnach obok
   zdjęcia i karty.
9. Zimny cache na realnym łączu: kiedy pojawia się zdjęcie hero i czy
   kafle wejść są czytelne, zanim obraz dojdzie (podkład granatowy).

## 9. Pytania do Mateusza (z rekomendacją)

1. **Q1 — trzecie wejście hero (SV1).** Rekomendacja: **brzmienie
   desktopowe na obu progach** („Nie planuję transakcji" / „Potrzebuję
   pomocy prawnej" — pierwsza osoba, jak „Sprzedaję…" i „Kupuję…");
   wygląd per próg jak w designie: na desktopie trzeci kafel, na
   telefonie lżejszy, podkreślony link z samym tytułem („Potrzebuję
   pomocy prawnej" — nadtytuł ukryty poniżej 1025 px). Alternatywy:
   trzeci pełny kafel także na telefonie (hero wyższe o ok. 40 px) albo
   brzmienie mobilne („Potrzebujesz tylko pomocy prawnej?") na obu
   progach. Oba warianty trafiają na listę PLACEHOLDER.
2. **Q2 — jedna treść pasów CTA (SV2, SV3).** Rekomendacja: **eyebrow
   („Pierwszy krok", „Twoje nowe miejsce", „Pierwsza rozmowa") na obu
   progach** oraz **„Zadzwoń i umów wycenę" na obu progach** (mówi, po co
   dzwonić; mieści się na ekranie 320 px). Alternatywa: eyebrow tylko od
   1025 px i krótkie „Zadzwoń" na telefonie (dwa brzmienia przełączane
   `display`).
3. **Q3 — zdjęcie hero (SV9).** Pomiar: źródło 1440×617; pełne okno
   1920×1080 = powiększenie 1,75× (ekran 1×), okno 1440×900 na ekranie
   2× = 2,9×; telefon 390×844 @3× = ok. 2,4× (z plikiem `-m` byłoby
   3,3×). Symulacja w załączonym zrzucie: obraz jest miękki, ale kadr
   ma małą głębię ostrości (dłonie, dokument, klucze), a na desktopie
   lewą część przykrywa szklana karta. Rekomendacja: **wchodzi materiał,
   który jest — pełny plik od 768 px i nowy kadr `-tall` (pełna wysokość
   źródła) poniżej; bez sztucznego wyostrzania i bez dodatkowego
   przyciemniania; ostrzejsze źródło (min. 2400 px szerokości) = prośba
   do autora designu**, wpis na liście po całej implementacji. Podmiana
   pliku nie wymaga zmian w kodzie. Alternatywa: przyciemnić zdjęcie na
   desktopie gradientem (odejście od designu, maskuje miękkość).
4. **Q4 — korekta pozycji po wejściu z kotwicą (SV8).** Rekomendacja:
   **kilka linii w skrypcie strony**: gdy adres ma kotwicę jednej
   z trzech sekcji, po `load` i po wczytaniu fontów strona ustawia cel
   ponownie natywnym `scrollTo` (bez animacji) — tylko dopóki użytkownik
   sam nie przewinął. Kliknięcia wejść hero zostają natywne. Alternatywa:
   sam mechanizm przeglądarki + asercja; ryzyko: czerwony `e2e` na
   linuksowym WebKicie dopiero w CI (jak przy F36).
5. **Q5 — parallax zdjęcia hero na telefonie (SV10).** Rekomendacja:
   **tryb `data-px="top"` we wspólnym `content-motion.ts` liczy punkt
   zerowy z pozycji kadru w dokumencie** (dziś zakłada kadr od góry
   strony). Dla `/o-nas/` wynik identyczny co do wartości; koszt ok.
   +0,1 KB we wspólnym chunku trzech tras — ich zrzuty mierzę progiem 0,
   mają zostać bez zmian. Alternatywa (zero zmian w module): zdjęcie hero
   na telefonie bez parallaxu.
6. **Q6 — korekty z pomiaru kontrastu (SV12, SV14).** Rekomendacja: jak
   w 4.4, 5A, 5B i 4.5 — **krycia szkła, gradientów i tekstu wdrażam
   z pomiaru bez osobnego pytania**, z liczbami w uzupełnieniach; kolory
   zostają.
7. **Q7 — `CollapsibleText.astro` / `collapsible.ts`.** Rekomendacja:
   **nie wchodzą** — opisy pozycji mają 1–3 zdania, a zwijanie list
   chowałoby treść, do której prowadzą kotwice; **wpis „do usunięcia
   w PR porządkowym 4.7"** w `docs/optional-todos.md` (oba pliki są
   nieużywane od Etapu 0; detal oferty ma własne zwijanie opisu).

## 10. Uzupełnienia po implementacji

Decyzje Q1–Q7 zapadły wg rekomendacji (2026-10-04): trzecie wejście hero
w brzmieniu desktopowym (na telefonie lżejszy link z samym tytułem),
jedna treść pasów CTA (eyebrow i „Zadzwoń i umów wycenę" na obu progach),
zdjęcie hero z materiału, który jest (+ kadr `-tall`), korekta pozycji po
wejściu z kotwicą w adresie, tryb `data-px="top"` liczony z pozycji kadru
w dokumencie, korekty kryć z pomiaru bez osobnego pytania,
`CollapsibleText` do usunięcia w PR porządkowym.

### 10.1 Co powstało

- `src/pages/uslugi.astro` + `sections/services/`: `ServicesHero`,
  `ServicesSell`, `ServicesBuy`, `ServicesLegal`, `ServicesList`,
  `ServicesCta`, `services-copy.ts`, `services-config.ts`,
  `services-motion.ts`.
- `src/assets/img/uslugi-hero-tall.webp` (864×617, 35 KB) — wycinek
  o pełnej wysokości źródła wokół pozycji 50 % (komenda
  w `docs/design/README.md`); `uslugi-hero-m.webp` i pełny
  `uslugi-prawne2.webp` nie są już używane (zostają w repo do PR
  porządkowego).
- `sections/content-motion.ts` — dwie zmiany we wspólnym module (SV17,
  SV18); chrome, `overlay.ts`, `content.css` i pozostałe widoki
  nietknięte. `home-copy.ts` — sam komentarz.
- Testy: e2e `uslugi.spec.ts` (21 testów, 45 przebiegów na 3 profilach),
  `navigation.spec.ts` (`OVER_HERO_PATHS` + `/uslugi/`); visual
  `uslugi.spec.ts` (2 zrzuty × 6 profili); `lighthouserc*.cjs`
  + `/uslugi/`.

### 10.2 Rozstrzygnięcia w trakcie (ciąg dalszy §2)

Pomiar kontrastu (SV12) — metoda A15 z `analiza-o-nas.md`: zrzut okna
z przezroczystym tekstem (elementy graficzne paska ukryte), kontrast
koloru tekstu względem KAŻDEGO piksela tła w prostokątach linii tekstu,
wynik = 5. percentyl; 9 rozmiarów okna poniżej progu (320×568, 360×640,
375×667, 390×844, 412×915, 600×900, 768×1024, 820×1180, 1024×768) i 5 od
progu (1025×768, 1280×680, 1366×768, 1440×900, 1920×1080); przystanki
scrolla co 0,45 wysokości okna przez całą stronę (parallax przesuwa tło
względem tekstu); elementy paska mierzone przed startem przemalowania;
strzałki wejść i przycisków liczone jak elementy graficzne (próg 3:1).
Poniżej progu: Chromium i WebKit; od progu także Firefox. Liczby =
najgorszy wynik ze wszystkich silników, rozmiarów i przystanków.

| # | Temat | Rozstrzygnięcie |
| --- | --- | --- |
| SV17 | **Q5 — `data-px="top"` z pozycji kadru w dokumencie** | punkt zerowy = postęp kadru przy scrollu 0, liczony z `rect.top + scrollY` (dla kadru od góry strony wzór sprowadza się do dotychczasowego — zrzuty `o-nas-*` zmierzone progiem 0: 0 różnic); wynik ograniczony do zapasu w obie strony. Przy blokadzie scrolla nakładek (`body{position:fixed}` zeruje `scrollY`) moduł trzyma ostatnią znaną pozycję kadru. Na telefonie kadr hero stoi ok. 300–400 px pod górą strony — bez zmiany przesunięcie startowe wynosiłoby ok. +20 px |
| SV18 | **Bloki przeskoczone skokiem kotwicy** (znalezione testem kotwic) | po kliknięciu wejścia hero bloki sekcji NAD celem zostawały nieodsłonięte: były pod oknem, są nad oknem, nigdy go nie przecięły — IntersectionObserver ich nie zgłasza (design robił z tego powodu przebieg po liście przy każdym scrollu). **Wdrożone:** wspólny moduł odsłania po zdarzeniu `hashchange` wszystko, co leży nad oknem. Dotyczy też `#formularz` na `/sprzedaj-z-nami/` |
| SV19 | **Q4 — korekta po wejściu z kotwicą w adresie** | skrypt strony: przy zwykłym wejściu (`navigation.type === "navigate"`; odświeżenie i „wstecz" zostają przeglądarce) po `load` i po wczytaniu fontów ustawia cel ponownie natywnym `scrollTo`, jeśli odchyłka przekracza 1 px i użytkownik niczego nie dotknął (koło, dotyk, klawisz, wskaźnik). 1 210 B skryptu strony (o-nas: 575 B) |
| SV20 | Kotwice — położenie docelowe | poniżej 1025 px `scroll-margin-top: var(--hdr-h)` (sekcja pod paskiem); od 1025 px margines 0, dopełnienie górne sekcji = pasek + 24–48 px (design). E2E mierzy oba warianty na trzech profilach, trzema ścieżkami (klik wejścia, wejście z adresu, klik kafla na stronie głównej): odchyłka ≤ 1,5 px |
| SV21 | Kafle wejść hero na telefonie | design (srebro `.26`, gradient pola 0 → .25 → .85): nadtytuł nad jasnym dokumentem **1,66:1**, tytuł 3,12:1, strzałka 2,49:1. **Wdrożone:** szkło `.16` + przyciemnienie zdjęcia zakotwiczone do wejść (`.uh-entries::before`: 0 → `.72` na 96 px nad pierwszym kaflem → `.88` u dołu) — procent pola nie wystarcza, bo na niskim ekranie wejścia zajmują większość pola zdjęcia. Po zmianie: nadtytuł ≥ 5,1:1, tytuł ≥ 8,0:1, strzałka ≥ 6,3:1; link trzeciego wejścia w tej samej strefie |
| SV22 | Karta hero na desktopie | design (granat `.24` nad zdjęciem bez gradientu): eyebrow 4,18:1, fraza `h1` w miedzi **2,54:1** (WebKit przy `.5`: 2,26:1). **Wdrożone:** granat `.68` → eyebrow ≥ 5,7:1, `h1` ≥ 11,5:1, fraza ≥ 3,4:1 (duży tekst), akapit ≥ 8,6:1 |
| SV23 | Pas wejść hero na desktopie | design (srebro `.16`, blur 22, nad jasnym dokumentem): nadtytuł **1,30:1**, tytuł 1,73:1, strzałka 1,28:1 — jasne szkło nad jasnym zdjęciem nie da się uratować kryciem. **Wdrożone:** CIEMNE szkło, granat `.68` (linie podziału i rozmycie jak w designie) → nadtytuł ≥ 6,3:1, tytuł ≥ 8,6:1, strzałka ≥ 6,2:1. Krycie dobrane tak, żeby wynik trzymał także bez rozmycia tła (silnik Firefoksa w testach nie rozmywa) |
| SV24 | Logo i linki paska nad zdjęciem (desktop) | jasne logo nad mankietem koszuli **1,88:1** przy samym scrimie paska. **Wdrożone:** przyciemnienie górnego pasa ZDJĘCIA w komponencie hero (granat `.5` → `.36` na wysokości paska → 0 za paskiem + 72 px) → logo ≥ 4,2:1, linki paska ≥ 5,1:1. Chrome nietknięty. Telefon: pasek stoi nad jednolitym granatem (logo i kreski menu ≥ 12,6:1) |
| SV25 | Szklane przyciski pasów CTA | design (srebro `.39` telefon, `.16` desktop): nadtytuł „Formularz" 3,88:1 (telefon) i 4,00:1 (desktop). **Wdrożone:** szkło `.28` (telefon) i `.1` (desktop) oraz mocniejszy prawy koniec gradientu pasa „Sprzedaję" na desktopie (`.68` → `.7`, `.28` → `.68` — przyciski stoją nad najjaśniejszą częścią zdjęcia) → nadtytuł ≥ 4,7:1 na obu progach, tytuł ≥ 6,5:1, strzałka ≥ 4,4:1 |
| SV26 | Blok zamykający „Pomocy prawnej" na telefonie | design (gradient bloku 0 przy 25 % → .9): eyebrow (dodany przez Q2) nad jasnym fragmentem zdjęcia **1,04:1**, akapit 3,99:1 — treść zajmuje większość bloku. **Wdrożone:** przyciemnienie zakotwiczone do TREŚCI (tło `.ul-close-in`: 0 → `.86` na 56 px → `.92`, dopełnienie górne 72 px) → eyebrow ≥ 5,5:1, akapit ≥ 14,0:1, przycisk szklany ≥ 7,9:1 (SV14: wariant szklany zostaje) |
| SV27 | Reszta pomiaru — bez zmian względem designu | hero telefon (tekst na jednolitym granacie): eyebrow 7,8:1, `h1` 16,3:1, fraza 5,2:1, akapit 12,3:1. Pasy CTA: eyebrow ≥ 4,8:1 (telefon) / ≥ 8,2:1 (desktop), akapit ≥ 7,7:1. „Pomoc prawna": eyebrow ≥ 6,4:1, `h2` ≥ 12,1:1, fraza ≥ 5,3:1, akapit ≥ 6,6:1, tytuły pozycji ≥ 12,2:1, opisy pozycji ≥ 5,7:1 (desktop, krycie `.74` z designu) / 11,3:1 (telefon), karta na desktopie: eyebrow ≥ 7,0:1, akapit ≥ 15,2:1 |
| SV28 | WebKit a szkło | dla tekstu na szkle nad zdjęciem WebKit dawał wyniki o 0,3–1,3 niższe niż Chromium (fraza `h1` 2,26 vs 3,61 przy tym samym kryciu; nadtytuł pasa CTA 4,06 vs 4,44) — pomiar tylko w Chromium przepuściłby dwa miejsca poniżej progu |
| SV29 | Hero na niskim oknie laptopa | odstępy, dopełnienie karty, rozmiar `h1` i wysokość kafli pasa ograniczone przez `svh` (wzorzec A22); przy 1366×768 i 1280×680 karta i pas wejść mieszczą się w oknie |
| SV30 | Zrzuty spoza zakresu (próg 0) | `home-*` (12), `sprzedaj-*` (24), `o-nas-*` (12), `chrome-*` (24) przy `maxDiffPixelRatio: 0` i `maxDiffPixels: 0`: 0 różnic, bez regeneracji. HTML pozostałych dziesięciu zmierzonych tras bez zmian (odcisk z hashami nazw zasobów znormalizowanymi) |
| SV31 | Zrzut `uslugi-full` na `webkit-iphone-14` progiem 0 | w 1 z 4 przebiegów 214 pikseli różnicy — wyłącznie w prostokącie logo STOPKI (znana niestabilność skalowania logo w WebKicie, ta sama co `chrome-footer`); ok. 0,00007 obrazu przy progu 0,001 — zrzut stabilny przy progu projektu |
| SV32 | Czerwony `e2e` na PR #31 (bieg 37224624055) | jeden test: próg 1025 — szerokość pasa CTA porównana z `documentElement.clientWidth` różniła się na runnerze o 15 px. To rynna paska przewijania (`scrollbar-gutter: stable` w `global.css`): na Linuksie układ jest o nią węższy od wartości `clientWidth`, na macOS (paski nakładkowe) rynny nie ma. Wygląd bez wady — pas wypełnia sekcję. **Poprawka w teście:** porównanie z szerokością SEKCJI; pozostałe 722 testy zielone, `quality` i `lighthouse` zielone |

### 10.3 Budżet (pomiar jak §12.5 analizy 4.2, `pnpm build:visual`)

| Plik | Rola | brutto | gzip -9 |
| --- | --- | --- | --- |
| chrome (Navbar, Footer, `contact-details`, `site-config`) | bez zmian | 8 217 B | 3 402 B |
| `uslugi.astro_…js` | skrypt strony (przypięcie `--svh`, korekta kotwicy, bramka importu ruchu) | 1 210 B | |
| `content-viewport.*.js` | wspólny chunk stron treściowych | 536 B | |
| `preload-helper.*.js` | helper `import()` Vite (wspólny) | 1 254 B | |
| `content-motion.*.js` + `services-motion.*.js` | ruch — tylko przy `no-preference` | 1 755 B | |
| **razem `script` na `/uslugi/`** (9 plików) | | **12 972 B** | **6 144 B** |
| `BaseLayout.*.css` + `uslugi.*.css` | chrome + `content.css` i style sekcji | 49 509 B | 10 046 B |
| HTML `/uslugi/` | | 37 461 B | 8 803 B |

Wobec szkieletu: `script` +4 755 / +2 742 B (prognoza: ok. 12,4 / 5,9 KB —
trafiona z dokładnością do zmian SV17–SV19), CSS +21 824 / +3 982 B
(prognoza +17 / +3,5 KB).

**Trasy spoza zakresu:** wspólny `content-motion` 1 389 → 1 706 B
(+317 B: pozycja kadru w dokumencie i odsłanianie po skoku kotwicy):
„/" `script` 14 860 / 6 950 B (+317 / +115), `/sprzedaj-z-nami/`
18 978 / 8 684 B (+317 / +106), `/o-nas/` 12 337 / 5 790 B (+317 / +111),
liczba plików bez zmian; pozostałe trasy co do bajta; wyspa listy
38 653 B co do bajta.

**LHCI lokalnie (oba configi — asercje czyste na 13 adresach):**

| `/uslugi/` | mobile | próg | desktop | próg |
| --- | --- | --- | --- | --- |
| `script` | 9 703 B (24 %) | 40 000 | 9 703 B (24 %) | 40 000 |
| `total` | 269 KB (27 %) | 1 000 000 | 329 KB (27 %) | 1 200 000 |
| w tym obrazy | 168 KB (6 plików) | | 229 KB (7 plików) | |
| LCP | 2 198 ms (mediana z 5; 2 174–2 412) | 3 200 | 557 ms | 1 800 |
| element LCP | zdjęcie hero | | `h1` | |
| TBT | 0 ms | 600 | 0 ms | 300 |
| CLS | 0,000 | 0,05 | 0,007 | 0,05 |
| wynik `performance` | 0,98–0,99 | 0,9 | 1,00 | 0,95 |
| podmioty trzecie | 0 | | 0 | |

`total` jest NIŻSZE niż w prognozie (370–450 KB): strona jest długa
i pomiar na telefonie pobiera tylko obrazy z pierwszych ekranów (6 z 8),
a na desktopie mniejsze pliki `-m` dla kadrów w kolumnach. Margines LCP
mobile ok. 1,0 s od mediany (najgorszy przebieg: 0,79 s) — poniżej
regułowych 1,3 s, jak na pozostałych stronach treściowych (obserwacja).
Pozostałe trasy w tym samym przebiegu: „/" `script` 10 754 B (27 %), LCP
mobile 2 415 ms, `total` desktop 846 KB (70 %); `/sprzedaj-z-nami/`
12 860 B (32 %), LCP mobile 2 109 ms; `/o-nas/` 9 551 B (24 %), LCP
mobile 2 111 ms; `/praca/` 9 696 B; lista rodzaju 29 003 B (73 %); detale
12 256 B (31 %), LCP mobile 2 114–2 795 ms. Progi nietknięte.

### 10.4 Weryfikacja lokalna

- format, lint, typecheck — czyste; unit 539 testów: 537 zielonych +
  2 skip (40 plików, bez zmian); build 89 stron; `test:dist` 6/6.
- `pnpm test:e2e` na 6 profilach: **723 zielone** (1 137 pominięć
  profili), 0 czerwonych; nowy `uslugi.spec.ts` = 21 testów (45
  przebiegów na 3 profilach), `navigation.spec.ts` + 1 trasa (6 profili);
  axe 0 naruszeń po przejeździe strony (desktop i Pixel 5; allowlista
  PUSTA).
- `test:visual`: **12 czerwonych OCZEKIWANYCH** — nowe zrzuty bez
  baseline'u (`uslugi-top`, `uslugi-full` × 6); pozostałe 229 zielonych.
  Kolejne przebiegi `uslugi` na zapisanych zrzutach: 12/12 stabilne
  (zrzuty robocze usunięte — baseline'y powstają wg świętej kolejności).
- Zrzuty spoza zakresu progiem 0 i odciski HTML: SV30.

### 10.5 PLACEHOLDER (U9)

Lista z §7 bez zmian — wszystko w `services-copy.ts`. Do rozmowy
z klientką: trzecie wejście hero (dwa brzmienia), przycisk telefonu (dwa
brzmienia), deklaracja bezpłatnej pierwszej rozmowy, „System MLS", opis
zakresu pomocy prawnej. Poprawka typograficzna względem designu:
cudzysłów zamykający w „Ustalenia Stron”.

### 10.6 Co sprawdzić na `nowa.` i na fizycznym telefonie

Lista z §8 (pkt 1–9; w pkt 1 chodzi o wejście z adresu z kotwicą — po
odświeżeniu pozycję przywraca przeglądarka) + po implementacji:

1. **Kafle wejść na telefonie:** ciemniejsza dolna część zdjęcia pod
   wejściami (SV21) — czy zdjęcie nadal „czyta się" jako tło, czy kafle
   nie wyglądają jak na jednolitym tle.
2. **Karta i pas wejść na desktopie:** karta wyraźnie ciemniejsza niż
   w designie (SV22), pas wejść na ciemnym szkle zamiast jasnego (SV23) —
   ocena wyglądu na monitorze; czy rozmycie tła nie mruga przy
   przewijaniu (parallax zdjęcia pod szkłem).
3. **Pas CTA „Sprzedaję" na desktopie:** zdjęcie tła jest mocno
   przyciemnione także z prawej strony (SV25).
4. **Blok zamykający „Pomocy prawnej" na telefonie:** zdjęcie widać
   głównie w górnej części bloku (SV26).
5. **Po skoku kotwicą przewiń w górę:** sekcje nad celem mają być od razu
   odsłonięte (SV18), bez pustych miejsc.
6. **Laptop 13″:** hero z kartą i pasem wejść w pierwszym ekranie (SV29).

### 10.7 Do decyzji / do wykonania poza kodem (Mateusz)

1. Ostrzejsze źródło zdjęcia hero (min. 2400 px szerokości) — prośba do
   autora designu; podmiana = dwa wywołania `optimize-images.mjs`
   (komendy w `docs/design/README.md`) i regeneracja zrzutów `uslugi-*`.
2. Teksty do klientki — §10.5.
3. PR porządkowy (4.7): usunięcie `CollapsibleText.astro`,
   `collapsible.ts`, nieużywanych `uslugi-hero-m.webp`
   i `uslugi-prawne2.webp`.
4. Liczb LHCI z runnera dla `/uslugi/` nie będzie w logu joba — LCP
   mobile do sprawdzenia przy najbliższym `lhci-measure.yml` (razem
   z `/o-nas/`, `/praca/`, `/sprzedaj-z-nami/`, `/kontakt/`).

### 10.8 Lista do oceny po całej implementacji

Drobne decyzje wyglądu podjęte w trakcie (rozwiązania zostają, ocena na
urządzeniach — wpis w `docs/optional-todos.md`): przyciemnienie zdjęcia
pod wejściami hero na telefonie, ciemna karta i ciemny pas wejść na
desktopie, przyciemniony górny pas zdjęcia pod paskiem, mocniejszy
gradient pasa CTA „Sprzedaję", przyciemnienie treści bloku zamykającego
„Pomocy prawnej", trzecie wejście hero jako link z samym tytułem na
telefonie, miękkość zdjęcia hero.
