# Mini-analiza 4.5 — `/o-nas/`

> **Status:** ZMERGOWANA (PR #30, 2026-10-04) — zaakceptowana 2026-10-04
> (wszystkie rekomendacje Q1–Q6 z §9), uzupełnienia po implementacji
> w §10. Część 4.5 Etapu 4 wg instrukcji
> wykonawczej (dokument lokalny, `docs/plan/`): akapit 4.5, „Tryb pracy",
> „Zasada rozjazdów"; prompt §4.5 z `etap-4-prompty.md`. Referencja
> wyglądu: `docs/design/export/o-nas.html` (gałęzie `.br-m` i `.br-d`),
> `assets/js/site.js` §4 (pasek nad hero) i §10 (reveale, parallax),
> `assets/css/site.css` (`vp-full`, `vp-880`). Baza wiedzy nie ma dla tej
> strony reguł logiki ani wartości (strona statyczna, treść w kodzie —
> part1 §2); obowiązują zasady ogólne: part2 §0 (design = wygląd) i U9
> (teksty z designu to drafty).
> Spójność z 4.4 (`analiza-home.md`: prymitywy `sx-*`, `SectionHead`,
> `content-motion.ts`, H13 kolory AA, H14 pomiar kontrastu, H15 liczby,
> H17 kadr pionowy, H18 element LCP), 5A (`analiza-formularze-a.md` §11:
> wariant paska nad hero F38, pomiar F40, parallax pierwszego ekranu F41)
> i 5B (`analiza-formularze-b.md` §11.2 F91: pomiar elementów paska nad
> zdjęciem).

## 0. Zakres

Jeden PR, gałąź `feat/o-nas`: hero, historia, specjalizacja, CTA
kontaktu — czysty Astro + moduł ruchu (bez wyspy, bez formularza).
Chrome bez zmian: strona przekazuje `<Navbar overHero />` i oznacza
element hero atrybutem `data-nav-hero` (mechanizm z 5A).

Poza zakresem: formularze, oferty, „/", 404, `/uslugi/` (4.6), polityka
(4.7), sync, dane, fixture, progi LHCI, chmura, JSON-LD (Etap 6),
poprawki z testów na `nowa.`.

## 1. Inwentarz z designu

Strona ma `data-anim` (reveale i parallax) oraz pasek w wariancie
przezroczystym nad hero — na OBU gałęziach (`data-scroll-nav`,
`data-nav-m` ze scrimem i jasnym logo).

| Sekcja | Telefon i tablet (poniżej 1025) | Desktop (od 1025) |
| --- | --- | --- |
| **Hero** | tło `--bg`, `min-height` = okno; zdjęcie na pełną szerokość OD GÓRY okna (pod paskiem), wysokość `clamp(300px, 88vw, 460px)`, pozycja `50% 55%`, promień lewego dolnego rogu 64–96 px, parallax; szklana karta (srebro .39, blur 22) nasunięta na dół zdjęcia o 56–84 px: eyebrow granatowy, `h1` granatowy 24–42 px z frazą w miedzi; akapit POD kartą | pełne okno, ciemne; zdjęcie `cover` + gradient poziomy (.88 → .66 → .16); szklana karta do 720 px (granat .24, blur 14): eyebrow `--copper-light`, `h1` srebrny 38–60 px, akapit W karcie; u dołu pas trzech liczb na szkle („10 lat na poznańskim rynku", „4 lata pod własnym szyldem", „setki rozwiązanych spraw") |
| **02 Historia** (ciemna) | zdjęcie tła + gradient pionowy (.8 → .92); nagłówek, dwa akapity, siatka dwóch zdjęć 4:5: Joanna (promień lewego dolnego rogu, podpis „Joanna Hetman / założycielka") i dokumenty (opuszczone o 24–40 px) | `min-height` = max(880 px, okno); gradient skośny; siatka 6,5fr / 5,5fr: szklana karta (eyebrow, `h2`, dwa akapity) · dwa zdjęcia: dokumenty (z lewej, promień) i Joanna z podpisem (z prawej, opuszczona o 48–72 px) |
| **03 Specjalizacja** (biała) | nagłówek, akapit (z trzema pytaniami w treści), dwa zdjęcia 4:5: umowa (opuszczona) i dokumentacja (promień prawego dolnego rogu) | `min-height` 780 px; siatka 42 % / reszta: zdjęcie „umowa" na całą wysokość, do lewej krawędzi okna (promień prawego dolnego rogu) · eyebrow, `h2`, akapit, dopisek „Dla nas to chleb powszedni.", lista trzech pozycji w wierszu (kreska miedziana + nazwa) |
| **04 Kontakt** (ciemny brąz) | zdjęcie tła `onas-cta` + gradient pionowy; nagłówek, akapit, przycisk „Skontaktuj się z nami" → `/kontakt/` | `min-height` 520 px; gradient poziomy; siatka 7fr / 5fr: nagłówek i akapit · szklana karta: lista E-mail / Telefon / Biuro + przycisk |

Ruch (§10): bloki treści sekcji 02–04 odsłaniane po wejściu w kadr
(kaskada; bloki na szkle bez animacji poniżej 1025); parallax: zdjęcie
hero, zdjęcia tła sekcji 02 i 04, zdjęcia w treści; **zdjęcie Joanny ma
kierunek odwrotny** (`data-px="-1"`) — jedzie przeciwnie do sąsiada.

Obrazy (pochodne z Etapu 0 w `src/assets/img/`): `onas-hero` 1456×816
/ `-m` 1024×574, `onas-historia-bg` 960×1200 / 720×900, `onas-joanna`
1200×1177 / 720×706, `onas-dokumenty` 960×1200 / 720×900, `onas-umowa`
i `onas-dokumentacja` 1456×816 / 1024×574, `onas-cta` 1680×720
/ 1024×439 (to samo zdjęcie co tło CTA listy ofert i sekcji kontaktu
detalu — przeglądarka ma je często w pamięci).

## 2. Rozjazdy — rozstrzygnięcia

Numeracja `A` (about). Baza wiedzy nie reguluje tej strony — rozjazdy
dotyczą dwóch gałęzi eksportu, dostępności i reguł projektu.

| # | Design | Rozstrzygnięcie | Podstawa |
| --- | --- | --- | --- |
| A1 | **Nagłówek „Historia" ma dwie treści.** Gałąź mobilna: „10 lat na rynku. 4 lata pod własnym szyldem. / Setki rozwiązanych problemów."; desktopowa: „Biuro, które powstało z prostej potrzeby. / Słuchać i brać odpowiedzialność." | wchodzi wersja DESKTOPOWA na obu progach, oznaczona PLACEHOLDER; wybór należy do klientki (lista §7) | prompt §4.5; U9 |
| A2 | Liczby „10 lat", „4 lata", „setki": na desktopie pas w hero, na telefonie tylko w nagłówku historii (A1) | po A1 telefon traci liczby → Q1 (rekomendacja: pas liczb także na telefonie). Wartości to dane do potwierdzenia przez klientkę — PLACEHOLDER z dopiskiem „wartości", jak na stronie głównej | `analiza-home.md` H15 |
| A3 | Specjalizacja: dwie wersje treści (telefon: pytania w akapicie; desktop: akapit + dopisek + lista) i drugie zdjęcie tylko na telefonie | → Q2 (rekomendacja: JEDNA treść w strukturze desktopowej; zdjęcie „dokumentacja" tylko poniżej 1025, jak w designie — `lazy`, więc desktop go nie pobiera) | jeden markup (`sections.md`) |
| A4 | Kontakt: lista danych tylko na desktopie; `tel:` i `mailto:` wpisane wprost | sloty `a[data-tel]`, `a[data-mail="biuro"]` z `<span data-slot>` (bez JS wiersz slotu znika), adres z `BUSINESS`; widoczność listy → Q3 | `contact-details.ts`; `analiza-home.md` H7, H8 |
| A5 | Kolejność zdjęć historii: telefon Joanna → dokumenty, desktop dokumenty → Joanna | DOM w kolejności telefonu; desktop przestawia kolumny siatką (zdjęcia nie są interaktywne — kolejność fokusu się nie zmienia) | jeden markup |
| A6 | Akapit hero: telefon POD szklaną kartą, desktop W karcie | jeden markup: karta (eyebrow + `h1`) i akapit jako rodzeństwo; szkło na telefonie nosi karta, na desktopie wspólne opakowanie | jeden markup |
| A7 | Kolory poniżej AA na jasnym tle: eyebrow miedziany (3,1:1), fraza `h2` w miedzi (2,8–3,1:1), dopisek `#7b8494` na bieli (ok. 3,9:1), biały tekst na miedzianym przycisku (3,1:1) | tokeny jak w 4.4: eyebrow `--copper-text`, fraza `--copper-dark`, dopisek `--muted`, przycisk `sx-btn` (tekst `--ink`); na ciemnych sekcjach `--copper-light` | `analiza-home.md` H13 |
| A8 | Tekst nad zdjęciem i na szkle: karta hero na telefonie (granat i miedź na srebrze .39 nad zdjęciem), karta hero i pas liczb na desktopie (granat .24 — na „/" to krycie dawało 2,6:1), karta historii, podpis zdjęcia (.74, 10–12 px), etykiety listy kontaktu (.6, 10–12 px), jasne logo i kreski menu nad zdjęciem hero na telefonie | **POMIAR** w trakcie implementacji (metoda H14 / F40 / F91: kontrast względem każdego piksela tła w prostokącie elementu, 5. percentyl, 7 rozmiarów okna, Chromium i WebKit). Poniżej progu rośnie krycie szkła, gradientu albo tekstu — kolory zostają. Jeśli logo i kreski menu na telefonie nie trzymają 3:1, przyciemnienie dostaje górny pas ZDJĘCIA (w komponencie hero), nie pasek. Liczby w uzupełnieniach | `testing.md` (axe zwraca „incomplete") |
| A9 | Parallax: kierunek odwrotny (`-1`) i zdjęcie pierwszego ekranu | wspólny moduł nie zna kierunku, a wzór CSS z F41 (pozycja startowa) nie da się zastosować na telefonie: wysokość kadru hero zależy od SZEROKOŚCI okna, nie jest ułamkiem jego wysokości → Q4 | `analiza-formularze-a.md` F41 |
| A10 | Pasek nad hero: próg z elementu `[data-hero]` — na telefonie to ZDJĘCIE (300–460 px), na desktopie cała sekcja | `data-nav-hero` na kadrze zdjęcia: poniżej 1025 kadr ma wysokość zdjęcia, od 1025 wypełnia sekcję (`inset: 0`) — jeden znacznik daje oba progi; pasek jest pełny, zanim wjedzie pod niego jasna część hero. Chrome bez zmian | `analiza-formularze-a.md` F38; `site.js` §4 |
| A11 | Kadr hero na telefonie (przepis H17 / F15) | pole NIE jest pionowe: poniżej 768 px proporcje 1,07–1,67:1 → kadr `-tall` niepotrzebny (przy 767 px pole pokazuje 94 % szerokości źródła — wycinek nic by nie oszczędził). `<picture>`: `onas-hero-m.webp` poniżej 768 px, pełny plik od 768 px; dwa `preload` z `media` | `docs/design/README.md` |
| A12 | Sekcje pełnoekranowe na sondzie `--vph` | `var(--svh, 100svh)` + `armViewportPin` (wzorzec 4.4); hero desktop `min-height` (treść rozpycha na niskim oknie) | `analiza-home.md` §3 pkt 4 |
| A13 | Kolory spoza tokenów: brąz sekcji kontaktu (`#1a120c`, gradient `rgba(40,28,18)` / `rgba(22,15,10)`) | wartości designu jako zmienne lokalne komponentu — brąz występuje tylko nad tym zdjęciem (tak samo stoi w CTA listy ofert); bez nowych tokenów globalnych | `analiza-home.md` H16 |
| A14 | `alt` zdjęć | hero i tła: `alt=""` (dekoracja, jak w designie); Joanna, dokumenty, umowa, dokumentacja: opisy z designu (PLACEHOLDER) | — |

## 3. Czego design nie ma, a trzeba zbudować

1. **Pas liczb na telefonie** (jeśli Q1 = tak): trzy kolumny pod akapitem
   hero, liczba granatowa + podpis wersalikami — przyklejony do dołu
   hero (`margin-top: auto`), więc wypełnia `min-height` = okno na
   wysokich telefonach.
2. **Lista specjalizacji na telefonie** (jeśli Q2 = jedna treść): trzy
   pozycje jedna pod drugą, ta sama kreska i typografia co na desktopie.
3. **Stany bez JS i przy `reduce`:** pełna, statyczna treść; pasek pełny
   (`<noscript>` z chrome'u); wiersze slotów w karcie kontaktu znikają,
   zostają adres i przycisk.
4. **Tablet (768–1024):** układ telefonu w kolumnie 600 px; zdjęcie hero
   w pełnym pliku.
5. **Parallax zdjęcia pierwszego ekranu bez przeskoku** na obu progach
   (Q4) — e2e sprawdza przesunięcie 0 przy scrollu 0.

## 4. Architektura i pliki

- `src/pages/o-nas.astro` — `BaseLayout` (slot `head`: dwa `preload`
  zdjęcia hero z `media`, `MotionGate`), `<Navbar overHero />`,
  `main.about`, sekcje, `Footer`; skrypt strony: `armViewportPin`
  + dynamiczny `import()` ruchu przy `no-preference` (wzorzec
  `sprzedaj-z-nami.astro`, bez `initForms`).
- `src/components/sections/about/`: `AboutHero.astro`,
  `AboutHistory.astro`, `AboutFocus.astro` (specjalizacja),
  `AboutContact.astro`, `about-copy.ts` (WSZYSTKIE teksty, PLACEHOLDER
  U9 — importują je też testy), `about-config.ts`
  (`ABOUT_DESKTOP_MIN_PX`, `ABOUT_HERO_SMALL_BELOW_PX`),
  `about-motion.ts` (wejście chunku: `initContentMotion()`).
- Prymitywy bez kopiowania: `content.css` (`sx-*`, `.px-frame`, reveale),
  `SectionHead.astro`, `content-motion.ts`, `content-viewport.ts`,
  `MotionGate.astro`.
- `content-motion.ts` — tylko przy Q4 = tak: wartości atrybutu
  `data-px="-1"` (kierunek odwrotny) i `data-px="top"` (kadr zaczynający
  się na górze strony: przesunięcie 0 przy scrollu 0); wspólny chunk
  „/" i `/sprzedaj-z-nami/`.
- Znaczniki: `main.about`, `section[data-about="hero|historia|
  specjalizacja|kontakt"]`, `[data-about-hero]`, `[data-about-photo]`,
  `[data-about-stats]`, `[data-nav-hero]` (kadr zdjęcia hero).
- Testy: `tests/e2e/o-nas.spec.ts`, `tests/visual/o-nas.spec.ts`,
  `navigation.spec.ts` (trzecia trasa wariantu nad hero),
  `lighthouserc*.cjs` + `/o-nas/`.
- Dokumenty: ten plik, `docs/README.md`, `CLAUDE.md`,
  `.claude/rules/testing.md`, `sections.md`, `docs/optional-todos.md`.

`CollapsibleText.astro` / `collapsible.ts` (nieużywane od Etapu 0):
teksty tej strony są krótkie, komponent nie wchodzi; decyzja o nim
przechodzi na 4.6 (dłuższe listy usług) → Q6.

## 5. Kontrakty i testy

**E2E `o-nas.spec.ts`** (treść `chromium-1920`; hero, układ i ruch także
`chromium-pixel-5` i `webkit-iphone-14`; teksty z `about-copy.ts`):

| Kontrakt | Asercja |
| --- | --- |
| Hero | `main h1` = tytuł + fraza, eyebrow, akapit; zdjęcie `eager`, `fetchpriority`, wymiary, `opacity 1`, zero `[data-rv]` w hero; desktop: wysokość hero = okno (sub-pikselowo), trzy liczby; telefon: kadr zdjęcia od góry okna, niższy od okna, karta nasunięta na jego dół; surowy HTML: dwa `preload` z `media`, bramka `js-motion`; `currentSrc` przy 767 / 768 |
| Pasek | `navigation.spec`: `/o-nas/` — przezroczysty na górze, stan pośredni, `data-solid` przy `wysokość [data-nav-hero] − pasek` (na telefonie wzór z wysokości OKNA dawałby jeszcze stan pośredni — asercja odróżnia wzory); `data-scroll-nav` w surowym HTML mają wyłącznie „/", `/sprzedaj-z-nami/` i `/o-nas/` |
| Sekcje | `h2` (tytuł + fraza) i eyebrow z `about-copy`, `aria-labelledby`; historia: dwa akapity, dwa zdjęcia z `alt`, podpis; specjalizacja: trzy pozycje listy; kontakt: przycisk → `/kontakt/` (< 400) |
| Sloty | surowy `<main>` bez telefonu, e-maila, `tel:`, `mailto:`; dwie puste kotwice z `<span data-slot>`; po JS `tel:` / `mailto:`; adres = `BUSINESS` |
| Progi | `expectBreakpointFlip(1025)`: opakowanie tekstu hero, siatki historii, specjalizacji i kontaktu, drugie zdjęcie specjalizacji, lista kontaktu (wg Q3); 768: plik zdjęcia hero |
| Bez JS | brak `js-motion`, każdy `[data-rv]` `opacity 1`, sloty ukryte, `.hdr-bg` `opacity 1` |
| Ruch | `js-motion` + `data-motion`; blok spod zgięcia `opacity 0` → `.is-in`; żaden `[data-rv]` nie jest linkiem ani przyciskiem; **sonda parallaxu** dla każdego `[data-px]`: zapas ≥ `PX_AMT_*` × wysokość kadru, obraz zakrywa kadr w sześciu pozycjach scrolla; zdjęcie hero: przesunięcie 0 przy scrollu 0 (± 0,2 px); kierunek odwrotny zdjęcia Joanny = wzór ze znakiem przeciwnym; PUNKTOWA emulacja `reduce` z komentarzem (czwarty wyjątek w `testing.md`); scroll natywny |
| Sieć, a11y | zero hostów trzecich po `revealSweep`; axe po `revealSweep` (desktop i Pixel 5), allowlista PUSTA |

**Visual `o-nas.spec.ts`** (`useVisualFixtureGuard`): `o-nas-top` (okno
startowe) i `o-nas-full` (fullPage po `revealSweep`, próg 0,001) × 6
profili = 12 PNG na platformę. Pomiar progiem 0 bez regeneracji:
`chrome-*` (chrome nietknięty) oraz `home-*` i `sprzedaj-*` (wspólny
moduł ruchu przy Q4). `chrome-sheet` i `chrome-footer` stoją na
`/kontakt/` — bez ruchu.

**Unit:** bez zmian (widok nie ma logiki). **LHCI:** `/o-nas/` w obu
configach.

Kolejność baseline'ów: kod → workflow linux z `feat/o-nas` (spec
`tests/visual/o-nas.spec.ts`, mode `changed`) → `git pull` → diff darwin
→ darwin → commit darwin na końcu.

## 6. Budżet (prognoza; pomiar po `build:visual` w uzupełnieniach)

Baza (main, `build:visual`, 2026-10-04): szkielet `/o-nas/` `script`
8 217 B brutto / 3 402 B gzip w 4 plikach, CSS 27 685 / 6 064 B.

| Zasób | Prognoza |
| --- | --- |
| `script` na `/o-nas/` | chrome 8,2 KB + skrypt strony ok. 0,6 KB + `content-viewport` 0,5 KB + helper `import()` 1,3 KB + ruch ok. 1,4 KB → **ok. 12 KB brutto / 5,6 KB gzip**; w LHCI ok. 8–9 KB = ok. 22 % bramki 40 000 B |
| CSS | `content.css` + style sekcji: ok. +10 KB brutto / +2,5 KB gzip |
| Obrazy przy wejściu | telefon: zdjęcie hero `-m` 35 KB; desktop: 59 KB; reszta `lazy` (tła historii i kontaktu, cztery zdjęcia treści) |
| `total` | ok. 200–280 KB (bramka 1,0 / 1,2 MB) |
| LCP | telefon: ZDJĘCIE hero (nie wypełnia okna, więc jest kandydatem; `preload` + `fetchpriority`) — prognoza 2,0–2,3 s przy progu 3 200; desktop: `h1` (zdjęcie na całe okno nie jest kandydatem — H18), ok. 0,5–0,7 s |
| Trasy spoza zakresu | przy Q4: wspólny `content-motion` ok. +0,1 KB na „/" i `/sprzedaj-z-nami/`; HTML tych tras bez zmian (odcisk z hashami znormalizowanymi); wyspa listy co do bajta |

## 7. Lista PLACEHOLDER (U9; zamykana w 7.7)

Wszystkie teksty w `about-copy.ts`, brzmienie z designu:

| Sekcja | Teksty |
| --- | --- |
| Hero | eyebrow „O nas"; `h1` „Nieruchomości to dla nas coś więcej niż transakcje. / To Twoje bezpieczeństwo."; akapit „Jesteśmy praktykami poznańskiego rynku nieruchomości…"; liczby „10 lat — na poznańskim rynku", „4 lata — pod własnym szyldem", „setki — rozwiązanych spraw" (**WARTOŚCI do potwierdzenia** — te same co w sekcji 01 strony głównej) |
| Historia | eyebrow „Historia i doświadczenie"; `h2` — **DWA warianty do wyboru klientki:** (wstawiony, desktopowy) „Biuro, które powstało z prostej potrzeby. / Słuchać i brać odpowiedzialność." albo (mobilny) „10 lat na rynku. 4 lata pod własnym szyldem. / Setki rozwiązanych problemów."; dwa akapity („Hetman Nieruchomości powstało z prostej potrzeby…" — zawiera „od ponad dekady"; „Wiemy, jak dynamicznie zmieniają się trendy…"); podpis „Joanna Hetman / założycielka"; opisy zdjęć |
| Specjalizacja | eyebrow „Nasza specjalizacja"; `h2` „Nie boimy się trudnych stanów prawnych. / Prostujemy to, co wydaje się nie do uratowania."; akapit „Tam, gdzie inni widzą ryzyko…"; dopisek „Dla nas to chleb powszedni."; lista „Zadłużone mieszkania", „Skomplikowane sprawy spadkowe", „Niejasności w księgach wieczystych" (wariant mobilny designu: te same trzy hasła jako pytania w akapicie — A3); opisy zdjęć |
| Kontakt | eyebrow „Masz pytania?"; `h2` „Chcesz wiedzieć więcej? / Porozmawiajmy."; akapit „Opowiedz nam o swojej sytuacji…"; „Skontaktuj się z nami"; etykiety „E-mail", „Telefon", „Biuro" |

Nie są placeholderami: adres biura, telefon, `biuro@`, tytuł i opis
strony (`ui.ts`, bez zmian).

## 8. Co sprawdzić na fizycznym telefonie (i na `nowa.`)

1. **Pasek nad zdjęciem hero:** jasne logo i kreski menu czytelne nad
   zdjęciem; przy przewijaniu pasek jest PEŁNY, zanim zjedzie pod niego
   jasna część hero (karta, akapit); otwarcie menu nie zmienia stanu
   paska.
2. **Szklana karta hero:** czytelność `h1` (granat i fraza w miedzi) na
   szkle nad dolną krawędzią zdjęcia; brak mrugania rozmycia przy
   przewijaniu (parallax zdjęcia pod `backdrop-filter`).
3. **Zdjęcie hero po wczytaniu:** nie „podskakuje" tuż po wejściu
   (parallax pierwszego ekranu), kadr (dłonie nad dokumentami) widoczny;
   zwijany pasek adresu Safari nie szarpie zdjęciem.
4. **Historia:** dwa zdjęcia jadące w przeciwnych kierunkach — płynność
   na Androidzie, brak prześwitu tła kadru; czytelność akapitów na
   ciemnym tle; podpis pod zdjęciem.
5. **Reveale przy szybkim przewijaniu:** żadna sekcja nie zostaje pusta.
6. **Specjalizacja i kontakt:** przycisk „Skontaktuj się z nami"
   (trafialność), przejście na `/kontakt/`.
7. **Desktop na `nowa.`:** hero na 13″ i na szerokim monitorze (karta,
   pas liczb, czytelność linków paska nad zdjęciem), linki `tel:`
   i `mailto:` w karcie kontaktu, proporcje sekcji specjalizacji
   (zdjęcie do krawędzi okna).
8. Zimny cache na realnym łączu: kiedy pojawia się zdjęcie hero (przed
   nim podkład), czy karta z `h1` jest czytelna, zanim obraz dojdzie.

## 9. Pytania do Mateusza (z rekomendacją)

1. **Q1 — liczby na telefonie (A2).** Rekomendacja: **pas trzech liczb
   także na telefonie** (pod akapitem hero) — po wyborze desktopowego
   nagłówka historii telefon inaczej nie pokazuje ich wcale. Alternatywa:
   pas tylko od 1025 px (dokładnie jak design).
2. **Q2 — specjalizacja (A3).** Rekomendacja: **jedna treść w strukturze
   desktopowej** (akapit + dopisek + lista trzech pozycji) na obu
   progach; drugie zdjęcie tylko poniżej 1025. Alternatywa: dwa
   brzmienia akapitu przełączane `display` (zdublowana treść w HTML).
3. **Q3 — lista danych w sekcji kontaktu (A4).** Rekomendacja: **jak
   design — lista (e-mail, telefon, biuro) tylko od 1025 px**; na
   telefonie nagłówek, akapit, przycisk (tuż pod sekcją jest stopka
   z numerem i przyciskami „Zadzwoń" / „Napisz"). Alternatywa: lista na
   obu progach, jak w sekcji 05 strony głównej.
4. **Q4 — parallax (A9).** Rekomendacja: **dwie wartości atrybutu we
   wspólnym `content-motion.ts`**: `data-px="-1"` (zdjęcie Joanny jedzie
   odwrotnie, jak w designie) i `data-px="top"` (zdjęcie hero ma przy
   scrollu 0 przesunięcie 0 — bez przeskoku po wczytaniu modułu, na
   telefonie i desktopie). Koszt: ok. +0,1 KB we wspólnym chunku „/"
   i `/sprzedaj-z-nami/`; ich zrzuty i e2e mierzę progiem 0 — mają
   zostać bez zmian. Alternatywa (zero zmian w module): zdjęcie hero na
   telefonie bez parallaxu, Joanna w kierunku sąsiada.
5. **Q5 — korekty z pomiaru kontrastu (A8).** Rekomendacja: jak w 4.4,
   5A i 5B — **krycia szkła, gradientów i tekstu wdrażam z pomiaru bez
   osobnego pytania**, z liczbami w uzupełnieniach; kolory zostają.
6. **Q6 — `CollapsibleText`.** Rekomendacja: **nie wchodzi w 4.5**;
   decyzja (użycie albo usunięcie) w 4.6.

## 10. Uzupełnienia po implementacji

Decyzje Q1–Q6 zapadły wg rekomendacji (2026-10-04): pas liczb także na
telefonie, jedna treść specjalizacji (drugie zdjęcie tylko poniżej
1025 px), lista danych kontaktu tylko od 1025 px, dwie wartości `data-px`
we wspólnym module ruchu, korekty kryć z pomiaru bez osobnego pytania,
`CollapsibleText` bez zmian (decyzja w 4.6).

### 10.1 Co powstało

- `src/pages/o-nas.astro` + `sections/about/`: `AboutHero`,
  `AboutHistory`, `AboutFocus`, `AboutContact`, `about-copy.ts`,
  `about-config.ts`, `about-motion.ts`.
- `sections/content-motion.ts`: wartości `data-px="-1"` (kierunek
  odwrotny) i `data-px="top"` (kadr od góry strony) — jedyna zmiana we
  wspólnym kodzie; chrome, `overlay.ts`, `content.css` i pozostałe widoki
  nietknięte.
- Testy: e2e `o-nas.spec.ts` (13 testów), `navigation.spec.ts` (test
  wariantu „nad hero" biegnie po liście tras: `/sprzedaj-z-nami/`,
  `/o-nas/`); visual `o-nas.spec.ts` (2 zrzuty × 6 profili);
  `lighthouserc*.cjs` + `/o-nas/`.
- Obrazy: same pochodne z Etapu 0 (nowych plików nie ma);
  `onas-dokumentacja.webp` w pełnym rozmiarze nie jest używany (zdjęcie
  występuje tylko poniżej 1025 px — wystarcza plik `-m`).

### 10.2 Rozstrzygnięcia w trakcie (ciąg dalszy §2)

| # | Temat | Rozstrzygnięcie |
| --- | --- | --- |
| A15 | **A8 — pomiar kontrastu** | Metoda: zrzut okna z przezroczystym tekstem (elementy graficzne — logo, kreski menu — ukryte), kontrast koloru tekstu względem KAŻDEGO piksela tła w prostokątach linii tekstu, wynik = 5. percentyl (najgorsze 5 % tła); 9 rozmiarów okna poniżej progu (320×568, 360×640, 375×667, 390×844, 412×915, 600×900, 768×1024, 820×1180, 1024×768) i 5 od progu (1025×768, 1280×680, 1366×768, 1440×900, 1920×1080); pozycje scrolla: góra strony, element pod paskiem, element w środku i u dołu okna; Chromium i WebKit; po przejeździe odsłaniającym reveale. Wyniki niżej — najgorszy pomiar z obu silników |
| A16 | Szkło karty hero na telefonie | design (srebro `.39`): eyebrow nad dolną krawędzią zdjęcia **2,25:1**, `h1` 3,2:1. Samo podniesienie krycia srebra przyciemnia jasną część karty i spycha miedzianą frazę `h1` poniżej 3:1. **Wdrożone:** kolor `--bg` z kryciem `.8` → eyebrow ≥ 5,9:1, `h1` ≥ 6,4:1, fraza (duży tekst, `--copper-dark`) ≥ 3,4:1 |
| A17 | Kreski menu i logo nad zdjęciem hero (telefon, tablet) | kreski menu nad jasnym fragmentem kadru (dłonie, dokumenty) **1,9:1** przy samym scrimie paska; logo ≥ 8,9:1. **Wdrożone:** przyciemnienie górnego pasa ZDJĘCIA w komponencie hero (granat `.45` → `.32` na 60 % wysokości paska → 0 za paskiem + 48 px) → kreski ≥ 3,6:1 (próg elementów interfejsu 3:1), logo ≥ 10,6:1. Chrome nietknięty |
| A18 | Eyebrow historii i kontaktu na telefonie; etykiety listy kontaktu | historia: górny stop gradientu `.8` → `.86` (eyebrow 4,2:1 → ≥ 5,1:1); kontakt: górny stop `.7` → `.84`, dolny `.88` → `.9` (eyebrow 3,6:1 → ≥ 5,3:1); etykiety „E-mail / Telefon / Biuro" `.6` → `.82` (3,9:1 → ≥ 5,5:1) |
| A19 | Reszta pomiaru — bez zmian względem designu | desktop hero (szkło granat `.24` nad gradientem): eyebrow ≥ 8,8:1, `h1` ≥ 6,1:1, fraza miedziana ≥ 3,5:1 (duży tekst), akapit ≥ 6,7:1, liczby ≥ 12,0:1, podpisy liczb ≥ 5,3:1; linki paska nad zdjęciem ≥ 5,3:1, logo ≥ 13,1:1. Historia: `h2` ≥ 9,0:1, fraza ≥ 4,7:1, akapit ≥ 7,3:1, podpis zdjęcia ≥ 5,5:1 (obie części). Kontakt: `h2` ≥ 8,0:1, fraza ≥ 5,2:1, akapit ≥ 9,0:1, wartości listy ≥ 10,9:1. Axe zwraca te miejsca jako „incomplete" — pomiar jest jedynym strażnikiem |
| A20 | **A9 / Q4 — `data-px="top"`** | przesunięcie = `(vh / (vh + H) − p) × 2 × amplituda × H`, czyli zwykły wzór pomniejszony o wartość dla scrolla 0 (kadr zaczynający się na górze strony): 0 na starcie, potem tylko w górę; ograniczone do zapasu (`max(−amplituda × H, …)`), gdy kadr jest wyższy od okna. CSS nie daje pozycji startowej — e2e sprawdza przesunięcie 0 przy scrollu 0 i `transform: none` po zdjęciu stylu inline. Hero `/sprzedaj-z-nami/` zostaje na wzorze CSS z F41 (zmiana ruszyłaby jego zrzuty — pozycja w `optional-todos.md`) |
| A21 | **`data-px="-1"`** | zwykły wzór ze znakiem przeciwnym; zapas układu ten sam (symetryczny). Dla kadrów bez wartości atrybutu wyrażenie jest liczone w tej samej kolejności co przed zmianą (mnożenie przez 1 na końcu) — zrzuty `home-*` i `sprzedaj-*` zmierzone progiem 0: 0 różnic |
| A22 | Hero na niskim oknie laptopa | przy 1366×768 pas liczb wypadał pod pierwszy ekran (hero ok. 800 px). Odstępy pionowe hero, dopełnienie karty i rozmiar `h1` są ograniczone przez `svh` (`min(clamp(…), N svh)`); przy 1366×768 i 1280×680 karta i pas liczb mieszczą się w oknie, przy 1920×1080 wartości z designu bez zmian |
| A23 | Reveal bloku tekstu historii | jeden reveal na całym bloku (nagłówek + akapity) na obu progach — od 1025 px to szklana karta, która w designie też wjeżdża w całości; na telefonie design odsłaniał nagłówek i akapity osobno (różnica w kaskadzie, nie w wyglądzie końcowym) |
| A24 | Pas liczb na telefonie (Q1) | trzy kolumny pod akapitem, kreska nad każdą, liczba granatowa, podpis wersalikami w `--muted`; `margin-top: auto` — na wysokim telefonie pas stoi przy dolnej krawędzi hero (`min-height` = okno) |
| A25 | Zdjęcie tła historii a LCP na telefonie | hero ma wysokość okna, więc kadr tła historii (z zapasem parallaxu) zaczyna się tuż pod pierwszym ekranem i przeglądarka pobierała go z WYSOKIM priorytetem razem ze zdjęciem hero (elementem LCP): LCP lokalnie dwumodalne, 2 112–2 804 ms w czterech przebiegach. **Wdrożone:** `fetchpriority="low"` na obu zdjęciach tła i mniejszy plik tła historii poniżej 1025 px (`sizes` — tło leży pod gradientem `.86–.92`) → pięć przebiegów 1 971–2 369 ms (mediana 2 121) |
| A26 | Przełączenie siatki na flex | `.af-media` (siatka dwóch zdjęć na telefonie, flex na desktopie): `align-items: start` z reguły siatki działało też we flexie i kadr „umowa" miał 0 px wysokości — reset `align-items: stretch` od 1025 px; e2e mierzy wysokość kadru = wysokość sekcji |
| A27 | Zrzuty spoza zakresu (próg 0) | `chrome-*` (24), `home-*` (12), `sprzedaj-*` (24) — 60 zrzutów zielonych przy `maxDiffPixelRatio: 0` i `maxDiffPixels: 0`: 0 różnic, bez regeneracji. HTML pozostałych dziesięciu zmierzonych tras bez zmian (odcisk z hashami nazw zasobów znormalizowanymi) |

### 10.3 Budżet (pomiar jak §12.5 analizy 4.2, `pnpm build:visual`)

| Plik | Rola | brutto | gzip -9 |
| --- | --- | --- | --- |
| chrome (Navbar, Footer, `contact-details`, `site-config`) | bez zmian | 8 217 B | 3 402 B |
| `o-nas.astro_…js` | skrypt strony (przypięcie `--svh`, bramka importu ruchu) | 575 B | |
| `content-viewport.*.js` | wspólny chunk stron treściowych | 536 B | |
| `preload-helper.*.js` | helper `import()` Vite (wspólny) | 1 254 B | |
| `content-motion.*.js` + `about-motion.*.js` | ruch — tylko przy `no-preference` | 1 438 B | |
| **razem `script` na `/o-nas/`** (9 plików) | | **12 020 B** | **5 679 B** |
| `BaseLayout.*.css` + `o-nas.*.css` | chrome + `content.css` i style sekcji | 41 758 B | 8 892 B |
| HTML `/o-nas/` | | 29 142 B | 6 886 B |

Wobec szkieletu: `script` +3 803 / +2 277 B (prognoza: ok. 12 KB / 5,6 KB
— trafiona), CSS +14 073 / +2 828 B.

**Trasy spoza zakresu:** wspólny `content-motion` 1 271 → 1 389 B
(+118 B): „/" `script` 14 543 / 6 835 B (+118 / +52), `/sprzedaj-z-nami/`
18 661 / 8 578 B (+118 / +60), liczba plików bez zmian; pozostałe trasy
co do bajta; wyspa listy 38 653 B co do bajta.

**LHCI lokalnie (oba configi — asercje czyste na 12 adresach):**

| `/o-nas/` | mobile | próg | desktop | próg |
| --- | --- | --- | --- | --- |
| `script` | 9 442 B (24 %) | 40 000 | 9 442 B (24 %) | 40 000 |
| `total` | 330 KB (33 %) | 1 000 000 | 383 KB (32 %) | 1 200 000 |
| w tym obrazy | 234 KB | | 286 KB | |
| LCP | 2 121 ms (mediana z 5; 1 971–2 369) | 3 200 | 595 ms | 1 800 |
| element LCP | zdjęcie hero | | `h1` | |
| TBT | 0 ms | 600 | 0 ms | 300 |
| CLS | 0,000 | 0,05 | 0,007 | 0,05 |
| wynik `performance` | 0,98–0,99 | 0,9 | 1,00 | 0,95 |
| podmioty trzecie | 0 | | 0 | |

`total` jest wyższe niż w prognozie (200–280 KB): telefon z pomiaru
pobiera przy wejściu WSZYSTKIE obrazy `lazy` — cała strona mieści się
w odległości, przy której przeglądarka zaczyna je pobierać. Margines LCP
mobile ok. 1,08 s od mediany (najgorszy przebieg: 0,83 s) — poniżej
regułowych 1,3 s, jak na pozostałych stronach treściowych (obserwacja).
Pozostałe trasy w tym samym przebiegu: „/" `script` 10 644 B (27 %), LCP
mobile 2 109 ms, `total` desktop 845 KB (70 %); `/sprzedaj-z-nami/`
12 751 B (32 %), LCP mobile 2 261 ms; `/praca/` 9 696 B; lista rodzaju
29 003 B (73 %); detale 12 256 B (31 %), LCP mobile 2 187–2 721 ms.
Progi nietknięte.

### 10.4 Weryfikacja lokalna

- format, lint, typecheck — czyste; unit 539 testów: 537 zielonych +
  2 skip (40 plików, bez zmian); build 89 stron; `test:dist` 6/6.
- `pnpm test:e2e` na 6 profilach: **672 zielone** (1 056 pominięć
  profili), 0 czerwonych; nowy `o-nas.spec.ts` = 13 testów (23 przebiegi
  na 3 profilach), `navigation.spec.ts` + 1 test (6 profili); axe 0
  naruszeń po przejeździe strony (desktop i Pixel 5; allowlista PUSTA).
- `test:visual`: **12 czerwonych OCZEKIWANYCH** — nowe zrzuty bez
  baseline'u (`o-nas-top`, `o-nas-full` × 6); pozostałe 217 zielonych.
  Drugi przebieg `o-nas` na zapisanych zrzutach: 12/12 stabilne (zrzuty
  robocze usunięte — baseline'y powstają wg świętej kolejności).
- Zrzuty spoza zakresu progiem 0 i odciski HTML: A27.

### 10.5 PLACEHOLDER (U9)

Lista z §7 bez zmian — wszystko w `about-copy.ts`. Do rozmowy z klientką:
wybór nagłówka historii (dwa warianty) i potwierdzenie liczb „10 lat",
„4 lata", „setki" (te same wartości niesie sekcja 01 strony głównej).

### 10.6 Co sprawdzić na `nowa.` i na fizycznym telefonie

Lista z §8 (pkt 1–8) + po implementacji:

1. **Karta hero na telefonie:** jaśniejsze szkło niż w designie (A16) —
   czy karta nadal czyta się jako „szkło" nad zdjęciem, czy `h1` nie
   zlewa się z dolną krawędzią zdjęcia.
2. **Górny pas zdjęcia pod paskiem** (A17): przyciemnienie ma być
   niewidoczne jako osobny element; kreski menu czytelne.
3. **Pas liczb na telefonie** (A24): trzy kolumny na wąskim ekranie
   (320–360 px) — łamanie podpisów, odstęp od akapitu i od granatowej
   sekcji poniżej.
4. **Laptop 13″** (A22): hero z kartą i pasem liczb w pierwszym ekranie;
   na bardzo niskim oknie hero rośnie zamiast obcinać treść.
5. **Desktop, specjalizacja:** kadr zdjęcia „umowa" (dłoń z piórem) przy
   różnych szerokościach okna — zdjęcie poziome w wysokim polu.

### 10.7 Do decyzji / do wykonania poza kodem (Mateusz)

1. Nagłówek historii i liczby — do klientki (lista PLACEHOLDER, 7.7).
2. Hero `/sprzedaj-z-nami/` na `data-px="top"` zamiast wzoru CSS —
   opcjonalnie w PR porządkowym (zmienia zrzuty `sprzedaj-*`).
3. Liczb LHCI z runnera dla `/o-nas/` nie będzie w logu joba — LCP mobile
   do sprawdzenia przy najbliższym `lhci-measure.yml` (razem z `/praca/`,
   `/sprzedaj-z-nami/`, `/kontakt/`).

### 10.8 Lista do oceny po całej implementacji

Drobne decyzje wyglądu podjęte w trakcie (rozwiązania zostają, ocena na
urządzeniach — wpis w `docs/optional-todos.md`): pas liczb na telefonie
(element spoza designu), ton i krycie szkła karty hero na telefonie,
przyciemnienie górnego pasa zdjęcia, odstępy hero ograniczone wysokością
okna, kadr zdjęcia „umowa" na desktopie.
