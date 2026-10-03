# Mini-analiza 4.2 — `/oferty/` (lista, wyszukiwarka, indeks JSON, SSG kombinacji)

> **Status:** ZAAKCEPTOWANA 2026-10-02 (wszystkie rekomendacje §5 i §8),
> część (a) ZREALIZOWANA na gałęzi `feat/oferty` (uzupełnienia po
> implementacji: R17, §3 pkt 13 i §11). Część 4.2 Etapu 4 wg instrukcji
> wykonawczej (dokument lokalny, `docs/plan/`) — tabela 4.2, „Kontrakty
> zachowania", „Zasada rozjazdów". Referencja wyglądu:
> `docs/design/export/oferty.html`, `assets/css/site.css` (sekcja Oferty),
> `assets/js/site.js` §5 (wyłącznie UI — makieta nie filtruje, nie
> stronicuje i nie czyta adresu). Baza wiedzy — odsyłacze sekcją, bez
> cytowania: part2 §4 (zachowanie), §9 (hybryda), §12 (inwentarz), §3
> (model); part3 §4.2 (lokalizacje), §7.2 (indeks), §2.4–2.6 (daty, cena,
> typy), §3.1 (zdjęcia). Decyzje: D12, D15, D16, D29, D30, D31, O1, O3,
> O5, O9.

## 0. Podział na PR-y i zakres tej sesji

Część 4.2 nie mieści się w jednym PR-ze (jedyna wyspa projektu, komplet
17 filtrów, dwa tryby mobile/desktop, stany brzegowe). Podział:

| PR  | Gałąź               | Zakres                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  | Wygląd po merge'u na `nowa.`                                                                                                                                                                      |
| --- | ------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| (a) | `feat/oferty`       | trasy SSG (`/oferty/` + typ × transakcja [× lokalizacja] tylko z ≥ 1 ofertą) w wyglądzie docelowym; **jeden komponent karty**; nagłówek z licznikiem; pigułki statusu z licznikami (SSR, bez interakcji); karty **wszystkie** (§5.3); sekcja CTA; `src/lib/offers/filters.ts` (czysta logika: parsowanie adresu, filtry, sortowanie, paginacja, liczniki) z testami unit; indeks `/oferty/index.json` + `/oferty/index-text.json` z testem kluczy; integracja Preact jako renderer SSR karty (§5.1); adres listy z fixture w `lighthouserc*.cjs`; specy e2e + visual (`tests/visual/oferty.spec.ts`); zero JS widoku | lista działa bez JS: wszystkie oferty danej trasy, linki do detali i do list SSG (typ, transakcja, lokalizacja) jako nawigacja; panel filtrów i sortowanie **jeszcze nie** (atrapy nie wchodzą) |
| (b) | `feat/oferty-wyspa` | wyspa `SearchIsland.tsx` (desktop): panel podstawowy + rozszerzony, chipsy lokalizacji z autocomplete offline, pigułki statusu interaktywne, sortowanie, paginacja `?strona=N`, `pushState`/`popstate`, licznik „Pokaż N ofert", skeleton; wyspa woła wyłącznie `filters.ts`                                                                                                                                                                                                                                                             | pełna wyszukiwarka na desktopie; mobile ma listę i linki, bez sheetów                                                                                                                             |
| (c) | `feat/oferty-mobile`| bottom sheety „Filtry" i „Sortuj" na `overlay.ts`, przyciski Filtruj/Sortuj, stan zero wyników (teksty part2 §4.3), zależność pól od typu w UI, przełącznik siatka/lista, stany brzegowe (nieznane parametry, strona poza zakresem, zły slug)                                                                                                                                                                                                                                                                                             | komplet 4.2                                                                                                                                                                                       |

**Rekomendacja na TĘ sesję:** (a) do pełnego, zmergowalnego PR-a. Logika
filtrów i indeks powstają już teraz (testowalne bez DOM), więc (b) jest
czystym „podłączeniem UI". Start (b) w tej sesji tylko na Twoje „tak"
(osobna gałąź od `feat/oferty`).

## 1. Inwentarz z designu (`oferty.html`)

Makieta ma dwie gałęzie DOM (`.br-m` ≤ 1024, `.br-d` ≥ 1025) i warianty
`.vp-phone`/`.vp-tablet` — artefakt narzędzia, budujemy jeden markup.
Kontener 1360 px, `1cqw ≈ 13,6 px` na desktopie. Motyw rogu: zaokrąglony
WYŁĄCZNIE lewy dolny róg (karta 24 px, CTA 12–16 px); pigułki 999 px;
inputy bez promienia.

### 1.1 Nagłówek i pasek narzędzi

| Element              | Desktop (≥ 1025)                                                                                      | Mobile                                                                         |
| -------------------- | ----------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------ |
| Sekcja               | padding-top `96 + clamp(24,2.6cqw,48)`, boki `clamp(48,5cqw,120)`, tło `--bg`                         | padding-top pasek + `clamp(19.6,5.641cqw,29.3)`, boki `--pad`                  |
| `h1` „Oferty"        | Manrope 600 `clamp(40,3.6cqw,56)`, lh 1, ls −0,02 em, `--navy`                                        | `clamp(28,8cqw,40)`, lh 1,05                                                   |
| Licznik              | „Znaleziono **45 ofert**" 17 px `--muted`, `strong` `--navy` 600, do prawej, wyrównanie do dołu h1    | 15 px                                                                          |
| Pasek narzędzi       | lewa: 3 pigułki statusu; prawa: przełącznik Siatka/Lista (44×44, obrys granat) + przycisk „Sortuj: Najnowsze" z listą (`role=listbox`, 4 opcje, ptaszek miedziany) | siatka 2 przycisków „Filtruj" / „{bieżące sortowanie}" (min-h 48, obrys granat), pod nimi pigułki statusu w rzędzie przewijanym poziomo do krawędzi |
| Pigułka statusu      | h 44, padding 0 16, 15 px/600, licznik α .7 waga 500; wciśnięta = tło i obrys `--navy`, tekst biały; wyłączona = białe tło, obrys `rgba(24,58,107,.3)`, tekst granat 500 | identycznie                                                                    |

### 1.2 Panel filtrów (desktop inline; mobile w bottom sheecie)

Panel: białe pudełko, obrys `rgba(24,58,107,.1)`, promień `0 0 0 24`,
siatka 12 kolumn (`gap 20/24`, padding `24 28`). Etykieta pola: 12 px,
ls 0,12 em, wersaliki, 600, granat.

| Pole (span)                 | Kontrolka                                                                                                           | Uwagi                                       |
| --------------------------- | ------------------------------------------------------------------------------------------------------------------- | ------------------------------------------- |
| Typ nieruchomości (5)       | 5 pigułek h 40: Wszystkie · Mieszkanie · Dom · Działka · Komercyjny                                                 | etykieta → R1                               |
| Transakcja (3)              | segment 3 pól (obrys granat, promień `0 0 0 12`): Wszystkie · Sprzedaż · Wynajem                                    |                                             |
| Lokalizacja (4)             | input h 44 z lupą, placeholder „Miejscowość lub dzielnica"; chipy pod polem (h 36, granat, X w kółku)              | chip „Poznań" = preset → R3                 |
| Cena (3), Powierzchnia (3)  | dwa inputy od/do, sufiks w polu („zł", „m²"), `inputmode=numeric`                                                    | „do 800 000" = preset → R3                  |
| Akcje (6)                   | „Więcej filtrów" (tekst + chevron, `aria-expanded`), Wyczyść (obrys), Pokaż (miedź, promień `0 0 0 12`, hover `--copper-dark`) | „Pokaż" bez liczby → §3                     |
| **Rozszerzony** (`#more-i`) | Ulica (input „np. Milczańska") · Pokoje (pigułki 1–5+) · Piętro od/do · Rok budowy od/do (sufiks „r.") · Rynek (segment Dowolny/Pierwotny/Wtórny) · Winda (Dowolnie/Tak/Nie) · Umeblowane (pigułki Dowolnie/Tak/Nie/Może/Częściowo) · Liczba pięter w budynku (input „do", sufiks „pięter") · Szukaj w opisie („np. garaż, ogród") · Numer oferty („np. SW376101") · Wyczyść + Pokaż | przy rozwinięciu przyciski z wiersza podstawowego znikają |

Mobile (sheet „Filtry"): te same pola jedno pod drugim, większe (pigułki
h 44, inputy h 48/16 px, chipy h 44); „Więcej filtrów" jako pełny wiersz
z podpowiedzią „pokoje, piętro, rok budowy, rynek, winda…"; stopka sheetu
sticky: Wyczyść + Pokaż (miedź, `1fr`). Sheet „Sortuj": dwie grupy
segmentów (Data dodania: Najnowsze/Najstarsze; Cena: Rosnąco/Malejąco)
+ „Zastosuj" — wybór tymczasowy do zatwierdzenia. Oba sheety: uchwyt
40×4, nagłówek `h2` + X 44×44, scrim `#08101e` α .26, panel `max-height
92%`, promień `18 18 0 0`.

### 1.3 Karta oferty (jeden szkielet, cztery warianty)

Karta = `<a>` na całość (aria-label „{kicker}: {tytuł}, {lokalizacja},
{cena}[ — status]"), białe tło, obrys `rgba(24,58,107,.1)`, promień
`0 0 0 24`, hover `translateY(-4px)` + cień `0 18px 40px rgba(24,58,107,.14)`
(telefon bez hovera).

| Strefa              | Design                                                                                                                                                                                                                 | Port                                                                                                         |
| ------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------ |
| Zdjęcie             | `aspect-ratio 3/2`, tło `--bg-photo`, `background-image` cover; sprzedane: `grayscale(.55)` + nakładka `rgba(14,32,60,.42)`; brak zdjęć: ikona budynku + „Zdjęcia wkrótce"                                             | `<img>` z `imgAt(r2Key,"card")`, `width`/`height`, `loading=lazy`, `object-fit: cover`; grayscale NIE (R4)   |
| Plakietki           | lewy górny róg, h 26, 12 px/600, ls 0,1 em, wersaliki, białe: Nowość `--navy`, Rezerwacja `--copper`, Sprzedane `--ink`                                                                                                 | + Wynajęte (R5), z `status`/`badges`/`isNewOffer`                                                            |
| Ikony mediów        | prawy dolny róg, pastylki `rgba(14,32,60,.72)` + blur 8, h 26: aparat + liczba zdjęć, play („Film"), „360°"                                                                                                            | jak design; blur tylko na desktopie (koszt na mobile — §7)                                                   |
| Kicker              | 12 px, ls 0,14 em, wersaliki, 600, `--copper`: „Mieszkanie na sprzedaż"                                                                                                                                                | `formatKind(mainType, transaction)` (R9)                                                                     |
| Tytuł `h2`          | 600, lh 1,3, ls −0,01 em, **clamp 2 linie**; 19 px (siatka) / 22 px (lista) / `clamp(17,4.6cqw,21)` (telefon)                                                                                                          | `offer.title` jako tekst; pusty tytuł → `typeName` (dane: tytuły 0–50 znaków)                                 |
| Lokalizacja         | pinezka miedziana 17 px + „Poznań, Malta · ul. Milczańska", 15 px `--slate`                                                                                                                                             | `formatLocation(offer.location)`                                                                             |
| Fakty `ul`          | 1–4 pozycje, ikona 17 px granat + tekst 14 px (telefon 15 px), `gap 6/14`; mieszkanie/lokal: m² · pokoje · piętro („parter z 4") · rok; dom: m² · pokoje · rok · działka; działka: m²                                 | macierz per typ (§3.6), `format.ts`                                                                          |
| Cena                | 700, ls −0,02 em, granat (sprzedane `--muted`); 26 px (siatka) / 28 (lista) / `clamp(22,6cqw,27)`; cena/m² 14 px `--muted`; siatka: jeden wiersz z linią nad; lista: kolumna prawa `min-width 200`                      | `formatPrice`/`formatPricePerM2`; „Zapytaj o cenę" (part3 §2.5); obniżka → §3                                |
| Numer               | mono 12 px, ls 0,06 em, `--faint`                                                                                                                                                                                      | `offer.number`                                                                                               |
| „0% prowizji"       | obrys miedziany h 24, 12 px/600                                                                                                                                                                                        | z `badges`                                                                                                   |

Układy: siatka `repeat(auto-fill, minmax(max(272px,(100% − 48px)/3),1fr))`
(maks. 3 kolumny, gap 24); lista: wiersz zdjęcie `clamp(280,30cqw,380)` +
treść + kolumna ceny; tablet (768–1024) ZAWSZE wiersz (zdjęcie
`clamp(260,36cqw,340)`); telefon (< 768) ZAWSZE jedna kolumna kart.

### 1.4 Paginacja i CTA

Paginacja: przyciski 44×44, 15 px/600, obrys `rgba(24,58,107,.25)`;
bieżąca = granat; „Poprzednia"/„Następna" tylko ikonami z `aria-label`;
skrajna wyłączona `#9a968f`; desktop wyśrodkowana, mobile `space-between`.
Numery wszystkie (bez skracania) — zgodne z part2 §4.3.

CTA „02 cta kontakt": zdjęcie `onas-cta` + gradient granatowy, eyebrow
„Nie znalazłeś?" `--copper-light`, `h2` „Nie ma tu tego, czego szukasz?
**Opisz nam to.**", akapit, przyciski „Zostaw kryteria" (miedź →
`/kontakt/`) i „Zadzwoń" (obrys biały → slot `data-tel`, R11).

### 1.5 Ikony

19 inline'owych SVG `viewBox 0 0 24 24`, `stroke currentColor 1.75`,
rozmiar z `font-size` rodzica: pinezka, narożniki (m²), aparat, drzwi
(pokoje), kalendarz (rok), schodki (piętro), warstwy (działka), play,
budynek, X, ptaszek, chevrony (↓ ← →), sortowanie, lupa, siatka, lista,
suwaki. Port: jeden plik `src/components/offers/icons.ts` (funkcje
zwracające ścieżki) używany przez kartę w Preact i przez komponenty
`.astro`.

## 2. Rozjazdy design ↔ baza wiedzy — rozstrzygnięcia

| #   | Rozjazd                                                                                                                                                  | Rozstrzygnięcie                                                                                                                                                                                                                                                                                                 | Źródło                                 |
| --- | -------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------- |
| R1  | Pigułka typu „Komercyjny"                                                                                                                                | **„Lokal komercyjny"** (także w kickerze karty i nagłówkach list) — `TYPE_LABEL` z `format.ts`                                                                                                                                                                                                                  | D16                                    |
| R2  | Trzecia pigułka statusu „Sprzedane i wynajęte" (design) vs „Oferty archiwalne" (D12)                                                                     | **Decyzja Mateusza (M3a)** — rekomendacja w §5.2                                                                                                                                                                                                                                                                | D12, O1                                |
| R3  | Presety w makiecie: Mieszkanie, Sprzedaż, chip Poznań, cena do 800 000, pokoje 3, wszystkie statusy wciśnięte                                            | **Bez presetów** na `/oferty/`; listy SSG mają typ, transakcję i lokalizację ze ścieżki. Stan statusów → M3b (§5.2)                                                                                                                                                                                              | O3, part2 §4.1                         |
| R4  | Zdjęcie sprzedanej oferty w grayscale + ciemna nakładka                                                                                                  | **Bez grayscale i nakładki**: plakietka zostaje, zdjęcie bez zmian (stempel Esti na zdjęciu + plakietka wystarczą). Cena sprzedanych w `--muted` zostaje (prezentacja)                                                                                                                                           | O9                                     |
| R5  | Design nie ma plakietki „Wynajęte" (ma tylko Sprzedane)                                                                                                  | **Dochodzi „Wynajęte"** dla `status === "wynajeta"`, styl jak „Sprzedane"                                                                                                                                                                                                                                       | part2 §3.1 (`status`), D12             |
| R6  | Cena przy sprzedanych/wynajętych: design pokazuje                                                                                                        | Pokazujemy wg `SHOW_PRICE_WHEN_SOLD` (dziś `true`); `false` → wiersz ceny znika, numer zostaje                                                                                                                                                                                                                  | O5, `site-config.ts`                   |
| R7  | Sortowanie po cenie przy „wszystkie transakcje" — makieta nie ma logiki                                                                                  | **Grupowanie**: rosnąco = wynajem (ceny miesięczne) przed sprzedażą, w grupach po cenie; malejąco = odwrotnie; „Zapytaj o cenę" zawsze na końcu                                                                                                                                                                 | part2 §9 (świadoma poprawka)           |
| R8  | Paginacja mobile to martwe `<a href="#">`                                                                                                                | Prawdziwe linki `?strona=N` obsługiwane przez wyspę; bez JS wszystkie karty są w HTML (§5.3), więc paginacja jest ukryta                                                                                                                                                                                         | part2 §12                              |
| R9  | Kicker karty = typ + transakcja („Dom na sprzedaż"), bez podtypu; obecna strona ma w podtytule `{Typ (podtyp)}`                                          | **Jak design** (podtyp trafia do detalu 4.3 i do pola `typeName` w indeksie) — to prezentacja karty, nie logika wyszukiwania                                                                                                                                                                                    | zasada 3 (design = wygląd)             |
| R10 | Przycisk „Pokaż" bez liczby                                                                                                                              | Plan wymaga licznika na żywo → **„Pokaż N ofert"** z odmianą (`formatOffersCount`) — (b)                                                                                                                                                                                                                        | instrukcja 4.2 (wyspa)                 |
| R11 | CTA „Zadzwoń" z jawnym `tel:` w HTML                                                                                                                     | Slot `a[data-tel][data-fill="href"]`, bez JS → `/kontakt/` (jak stopka)                                                                                                                                                                                                                                         | `contact-details.ts`, analiza 4.1 R2   |
| R12 | Zdjęcie karty jako `div role=img` z `background-image` na pełny `_max`                                                                                   | `<img>` + `imgAt(r2Key, "card")`, `alt` z danych, `width`/`height` z manifestu, `loading="lazy"` (pierwsze 3 karty `eager` + `fetchpriority="high"` dla pierwszej — LCP listy)                                                                                                                                 | D29, stała techniczna 3                |
| R13 | Wariant karty „Zdjęcia wkrótce"                                                                                                                          | Zostaje jako stan `photos.length === 0` (dane: 0 przypadków dziś, schemat dopuszcza pustą tablicę)                                                                                                                                                                                                              | odporność                              |
| R14 | Winda „Nie" w designie jako zwykła opcja; dane: `elevators` undefined = brak danych, nie „nie"                                                           | „Nie" filtruje **wyłącznie `elevators === 0`** (jawna dana); brak danych nie jest ani „tak", ani „nie". Przy dzisiejszych danych „Nie" daje 0 wyników — to prawda o danych, nie błąd (pytanie 4 w §8)                                                                                                            | schemat `elevators`, D14 (nie wnioskować) |
| R15 | Kolory tekstu designu (`#1c1b19`, `#2f3a4c`, `#6b6864`, `#8a867f`, `#9a968f`)                                                                            | Tokeny `--ink`, `--slate`, `--muted`, `--faint`; `#9a968f` (stan wyłączony) = nowy token `--disabled` w `global.css`                                                                                                                                                                                             | `docs/design/README.md`                |
| R16 | Design: „Poznań, Malta · ul. Milczańska" (dzielnica po przecinku)                                                                                        | `formatLocation` daje dokładnie ten format; dla ofert bez dzielnicy „Kórnik · ul. Zwierzyniecka"; dla `placeName` z gminą poza Poznaniem bez dopisku `info` na karcie (jest w autocomplete)                                                                                                                      | part3 §4.2                             |
| R17 | Kolory designu w drobnym druku: kicker i tag `--copper` (3,1:1), numer i stan bez zdjęć `--faint` (3,6:1), plakietka „Rezerwacja” biały na miedzi (3,1:1) — poniżej AA 4,5:1 | **Tokeny AA** (allowlista axe pusta): `--copper-text` #965d1c (5,4:1) dla kickera i tagu, `--muted` dla numeru i stanu bez zdjęć, plakietka „Rezerwacja” z tekstem `--ink` na miedzi (5,5:1). Ta sama zasada co R6 chrome’u | reguła a11y (`testing.md`) |

Bez rozjazdu: 12 kart na stronę (part2 §4.3 = design 4 strony × 12),
cztery sortowania (`newest`/`oldest`/`priceAsc`/`priceDesc` ↔ part2 §4.2
`sort`), formaty cen i m² (part2 §3.4 = design), „parter" (format.ts),
trzy pigułki statusu z licznikami (D12/O1 = design), filtry łączone AND.

## 3. Czego design nie ma, a trzeba zbudować

1. **Stan zero wyników** (part2 §4.3: nagłówek „Znaleziono 0 ofert",
   komunikat i trzy podpowiedzi) — (c); na `/oferty/` przy zerze ofert
   w danych (stan dopuszczalny builda) ten sam blok renderuje SSR w (a).
2. **Skeleton** przy ładowaniu indeksu — (b); w (a) niepotrzebny (SSR).
3. **Nagłówek i meta per lista SSG**: `h1` „Mieszkania na sprzedaż" /
   „… — Poznań Winogrady", `<title>`, `description`; liczba mnoga typów
   = nowa mapa `TYPE_LABEL_PLURAL` w `format.ts` (Mieszkania, Domy,
   Działki, Lokale komercyjne).
4. **Linki nawigacyjne bez JS** (zamiast panelu): w (a) pasek „typ" i
   „transakcja" to zwykłe linki do list SSG (pigułki jak w designie, ale
   `<a>`); lista lokalizacji danej kombinacji jako pastylki z licznikami
   (`locations.json`). W (b) wyspa przejmuje te same elementy
   (progressive enhancement, ten sam markup).
5. **Obsługa parametrów URL** (`?strona`, filtry, sortowanie) — czysta
   funkcja w (a) (`parseSearch`/`serializeSearch`), UI w (b).
6. **Zależność pól od typu** (macierz; filtr nieadekwatny do typu jest
   ignorowany, a w UI (c) ukryty):

   | Pole                   | Mieszkanie | Dom | Działka        | Lokal komercyjny |
   | ---------------------- | ---------- | --- | -------------- | ---------------- |
   | powierzchnia (`area`)  | ✓          | ✓   | ✓ (= działka)  | ✓                |
   | działka (`plotArea`)   | –          | ✓   | –              | –                |
   | pokoje                 | ✓          | ✓   | –              | ✓                |
   | piętro                 | ✓          | –   | –              | ✓                |
   | liczba pięter          | ✓ („z N")  | ✓   | –              | ✓                |
   | rok budowy             | ✓          | ✓   | –              | ✓                |
   | winda                  | ✓          | –   | –              | ✓                |
   | umeblowanie            | ✓          | –   | –              | –                |
   | rynek                  | ✓          | ✓   | ✓              | ✓                |

   Fakty na karcie wg tej samej macierzy (dom: m² · pokoje · rok ·
   działka; działka: m²; mieszkanie/lokal: m² · pokoje · piętro · rok);
   fakt bez danych znika, lista faktów ma 0–4 pozycje.
7. **Plakietka „Wynajęte"** (R5) i **obniżka ceny**: przy
   `previousPrice > price` poprzednia cena przekreślona obok ceny
   (part3 §2.5; design nie ma) — w (a), bo karta jest jedna.
8. **„Zapytaj o cenę"** na karcie (`price === null`): zamiast ceny, bez
   wiersza cena/m² (fixture: SW372150 przez nadpisanie).
9. **Liczniki pigułek statusu** liczone z OFERT BIEŻĄCEJ TRASY (lista
   `mieszkanie-na-wynajem` liczy swoje), nie z całego zbioru.
10. **Breadcrumbs** — nie w 4.2 (okruszki wchodzą z detalem 4.3; lista ma
    nagłówek z kontekstem i link „Wszystkie oferty").
11. **Autocomplete offline** z `info` dla miejscowości poza Poznaniem
    (part3 §4.2) — (b).
12. **Lokalizacja oferty → węzeł drzewa**: `offers.json` nie niesie id
    węzła; algorytm ścieżki slugów żyje w `scripts/sync/locations.ts`
    (`leafId`). Strona potrzebuje go do filtra prefiksowego →
    `src/lib/offers/location-path.ts` (ta sama logika) + test
    równoważności z funkcją syncu na danych syntetycznych, fixture
    i `data/` (bez dotykania `scripts/sync/**`; przeniesienie źródła do
    `src/lib` i import w syncu = propozycja osobnego, małego PR-a, §8).

13. **Nawigacja (a) bez wyspy** — po implementacji: zamiast osobnych
    pigułek typu (z domyślną sprzedażą, §8 pkt 8) lista dostała pigułki
    RODZAJÓW: typ × transakcja z ≥ 1 ofertą, każda z licznikiem, plus
    „Wszystkie oferty”; na liście rodzaju — pastylki lokalizacji
    z licznikami. Powód: pigułka typu bez listy „typ × wszystkie
    transakcje” byłaby ślepym linkiem albo cichym przekierowaniem na
    sprzedaż. Wyspa (b) zastępuje ten blok panelem designu.

## 4. Filtry: pole w indeksie → reguła → test (komplet part2 §4.2 + status)

Indeks `/oferty/index.json` = `{ offers: OfferIndexEntry[], locations:
LocationsFile }` (drzewo z `data/locations.json` jedzie w tym samym pliku
— autocomplete i liczniki chipów offline). Pola wpisu (allow-lista
`INDEX_FIELDS`, test „brak kluczy spoza listy"): `number`, `path`,
`title`, `typeName`, `mainType`, `transaction`, `market`, `status`,
`badges`, `addedAt`, `price`, `pricePerM2`, `previousPrice`, `currency`,
`area`, `plotArea`, `rooms`, `floor`, `floorsInBuilding`, `buildingYear`,
`elevators`, `furnished`, `location` (`city`, `district`, `street`,
`streetType`, `placeName`, `slug`, `nodeId`), `photo` (`r2Key`, `width`,
`height`, `alt`), `photosCount`, `hasVideo`, `hasTour`, `hasPlan`.
Opis osobno: `/oferty/index-text.json` = `{ [number]: tekst }` (tytuł +
opis bez HTML, małe litery, bez diakrytyków), ładowany dopiero przy
„szukaj w opisie". Rozmiar: 46 ofert ≈ 40 KB + 5 KB drzewa (part3 §7.2
prognozuje 37 KB dla 32 pól).

| Filtr (part2 §4.2 `name`)                     | Parametr URL / źródło           | Pole w indeksie                   | Reguła (AND z resztą)                                                                                                            | Test unit (`filters.test.ts`)                                                                                                   |
| --------------------------------------------- | ------------------------------- | --------------------------------- | -------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| `main_type_id`                                | ścieżka `{typ}-na-…` / `?typ=`  | `mainType`                        | równość; brak = wszystkie; nieznana wartość → 0 wyników (parytet)                                                                | synt.: każdy z 4 typów zawęża do swoich; `typ=foo` → 0                                                                          |
| `transaction`                                 | ścieżka `…-na-{transakcja}` / `?transakcja=` | `transaction`         | równość                                                                                                                          | synt.                                                                                                                           |
| `location` (ścieżka `a\|b\|c…`, `0` dowolny)  | ścieżka `/{slug}/` lub `?lokalizacja={nodeId}` | `location.nodeId`     | **prefiks po segmentach** (`nodeId === p || nodeId.startsWith(p + "/")`); slug listy SSG → nodeId przez wpisy indeksu              | synt.: Poznań obejmuje dzielnice; `wielkopolskie` = wszystko; obcy prefiks → 0; `poznan` nie pasuje do `poznanski`              |
| `street`                                      | `?ulica=`                       | `location.street`                 | równość bez wielkości liter po `slugify`; **tylko gdy ustawiona lokalizacja** (kaskada); brak ulicy w ofercie → odpada             | synt.: bez lokalizacji ignorowane; z lokalizacją zawęża                                                                         |
| `price_from`, `price_to`                      | `?cena-od=`, `?cena-do=`        | `price`                           | zakres domknięty; jedna skala (parytet); `null` (zapytaj o cenę) odpada przy dowolnym limicie                                      | synt. (w tym `price=null`); fixture: `cena-od=500000` → zbiór z fixture'u                                                       |
| `area_total_from/_to`                         | `?pow-od=`, `?pow-do=`          | `area`                            | zakres (działka: `area` = powierzchnia działki)                                                                                   | synt.; fixture: `pow-od=60` liczy z 10                                                                                          |
| `description`                                 | `?opis=`                        | `index-text.json[number]`         | `includes` po normalizacji (małe litery, bez diakrytyków); **obejmuje tytuł** (świadoma poprawka)                                | synt.: fraza z opisu, fraza z tytułu, brak → 0; wartownik `FORBIDDEN_SENTINEL` NIE występuje w tekście                          |
| `number`                                      | `?numer=`                       | `number`                          | równość bez wielkości liter, po `trim`; częściowy numer → 0 (parytet)                                                            | synt.: `sw…` = `SW…`; `376` → 0                                                                                                 |
| `apartment_room_number_from/_to`              | `?pokoje-od=`, `?pokoje-do=`    | `rooms`                           | zakres; „5+" = `od=5`; brak `rooms` odpada                                                                                       | synt.                                                                                                                           |
| `apartment_floor_from/_to`                    | `?pietro-od=`, `?pietro-do=`    | `floor`                           | zakres; **`0` jest wartością** (`pietro-do=0` = tylko parter) — świadoma poprawka; `floor` undefined odpada                      | synt.: `pietro-od=0&pietro-do=0` → tylko parter; fixture: 2 oferty z parteru                                                    |
| `building_year_from/_to`                      | `?rok-od=`, `?rok-do=`          | `buildingYear`                    | zakres                                                                                                                           | synt.                                                                                                                           |
| `market`                                      | `?rynek=pierwotny\|wtorny`      | `market`                          | równość                                                                                                                          | synt.; fixture 3/7                                                                                                              |
| `building_elevatornumber` (Tak/Nie)           | `?winda=tak\|nie`               | `elevators`                       | `tak` = `> 0`; `nie` = `=== 0` (R14); undefined odpada w obu                                                                      | synt. z trzema wariantami (1, 0, undefined)                                                                                     |
| `apartment_furnishings`                       | `?umeblowane=tak\|nie\|moze\|czesciowo` | `furnished`               | równość                                                                                                                          | synt.; fixture: tak 2, nie 1, czesciowo 1                                                                                       |
| `building_floornumber_to`                     | `?pieter-do=`                   | `floorsInBuilding`                | `≤`; undefined odpada                                                                                                            | synt.; fixture: `pieter-do=4` → 3 oferty                                                                                        |
| **status** (D12)                              | `?status=aktywna,rezerwacja,archiwalne` | `status`                  | zbiór; `archiwalne` = `sprzedana ∪ wynajeta`; pusty zbiór = pusty wynik; brak parametru = domyślny stan (M3b)                     | synt.; fixture: liczniki 2 / 1 / 7                                                                                              |
| `sort`                                        | `?sort=newest\|oldest\|priceAsc\|priceDesc` | `addedAt`, `price`, `transaction` | newest = `SORT_NEWEST_BY` malejąco (remis → numer); price wg R7; nieznany → newest                                   | synt.: porządek, remisy, `null` na końcu, grupowanie przy mieszanych transakcjach                                                |
| `searchIndex` (strona)                        | `?strona=N`                     | —                                 | 12 na stronę (`PAGE_SIZE` w `filters.ts`); `0`, `-1`, `abc` → 1; poza zakresem → pusta strona z nagłówkiem „Znaleziono N ofert" (parytet) | synt.: 25 wpisów → 3 strony, krawędzie                                                                                   |
| (pola zależne od typu)                        | —                               | `mainType`                        | filtr pola nieadekwatnego do wybranego typu jest **ignorowany** (macierz §3.6); przy „wszystkie typy" działa normalnie            | synt.: `typ=dzialka&pokoje-od=3` = wszystkie działki                                                                            |

Wartości parametrów liczbowych: tekst nienumeryczny ignorowany bez błędu
(parytet). Puste = brak filtra. `serializeSearch` pomija wartości
domyślne — adres `/oferty/` bez parametrów to stan domyślny.

## 5. Decyzje do akceptacji

### 5.1 Integracja Preact już w (a) — rekomendacja

Plan: „jeden komponent karty dla SSG i klienta". Jeśli (a) napisze kartę
w `.astro`, (b) musi ją przepisać do `.tsx` i od tej chwili istnieją dwa
źródła tego samego markupu (albo wyrzucamy pierwsze). Rekomendacja:
`@astrojs/preact` + `preact` wchodzą w (a), `OfferCard.tsx` renderuje się
WYŁĄCZNIE po stronie serwera (bez dyrektywy `client:*` → zero bajtów JS
w `dist`). W (b) ta sama karta trafia do wyspy. Koszt w (a): dwie
zależności w `package.json`, `jsx`/`jsxImportSource` w `tsconfig.json`,
renderer w `astro.config.mjs`. Alternatywa: karta w `.astro` teraz,
przepisanie w (b) — mniej zależności w tym PR-ze, ale podwójna praca
i ryzyko rozjazdu.

### 5.2 M3 — pigułki statusu

**(M3a) Etykieta trzeciej pigułki.** Rekomendacja: termin klientki z D12
w formie równoległej do „Aktywne"/„Rezerwacje": **„Archiwalne"** (pełne
„Oferty archiwalne — sprzedane i wynajęte" w `aria-label` i w `title`).
Uzasadnienie: baza wiedzy wygrywa z designem w wartościach; krótsza
etykieta mieści się w rzędzie na telefonie (design: „Sprzedane
i wynajęte" to najdłuższa pigułka). Jeśli wolisz dosłownie „Oferty
archiwalne" albo wersję designu — jedna stała w `offers-ui.ts`.

**(M3b) Stan domyślny filtra statusu.** Rekomendacja: **wszystko
włączone** (parytet, wartość domyślna planu). Dziś 37/46 ofert to
archiwum; przejrzystość daje plakietka + pigułki z licznikami (D12), a
klientka chce archiwum jako referencje. Alternatywa „aktywne +
rezerwacje" ukryłaby 80 % listy za kliknięciem i zmieniłaby to, co
klientka zna. Sygnał do przemyślenia w Etapie 7 po testach Joanny.
Niezależnie od wyboru: parametr `?status=` zapisuje stan w adresie.

### 5.3 HTML listy: wszystkie karty czy tylko pierwsza strona

Rekomendacja: **wszystkie karty w HTML** (wzorzec E5), paginacja po
stronie klienta. Uzasadnienie: (1) bez JS cała lista jest dostępna, a
linki `?strona=N` nie prowadzą do stanu, którego nie da się pokazać;
(2) wyspa w stanie domyślnym nie musi nic przerenderować (hydratacja na
tym samym markupie, zero migotania); (3) koszt to HTML: ~1,3 KB na kartę
→ 46 ofert ≈ 60 KB (gzip ≈ 8 KB), 200 ofert ≈ 260 KB (gzip ≈ 30 KB) —
obrazy są `lazy`, więc LCP i `total` LHCI nie rosną z liczbą kart;
(4) listy SSG z lokalizacją są małe (1–7 kart). Mechanika w (b): karty
od 13. w górę dostają `hidden` w SSR, a `<noscript><style>` je odkrywa —
JS pokazuje 12 od pierwszej klatki (bez skoku układu), brak JS pokazuje
wszystko. W (a) (bez wyspy) wszystkie karty są widoczne, bez paginacji.
Alternatywa (tylko 12 w HTML): mniejszy HTML przy 200+ ofertach, ale bez
JS strony 2+ są nieosiągalne.

### 5.4 Budżet wyspy < 15 KB — jak zmierzę

Po `pnpm build:visual`: suma rozmiarów plików `dist/_astro/*.js`
ładowanych przez `/oferty/` (z `<script>` w HTML i importów), brutto
i po `gzip -9` (budżet 15 KB liczę **brutto, bez kompresji** —
ostrożniej; LHCI `script:size` też liczy bajty przesyłane). Osobno
Preact runtime (~4 KB) i kod wyspy. Wynik do PR-a (b) i do raportu.
W (a) skrypt listy = 0 B; raport poda zużycie `script` po (a) dla
porównania.

### 5.5 LHCI — adres listy SSG z fixture

Do `lighthouserc.cjs` i `lighthouserc.desktop.cjs` dochodzi
`/oferty/mieszkanie-na-sprzedaz/` (fixture: 2 karty — SW303888,
SW486462, w tym obniżka ceny i plakietka Sprzedane). `/oferty/` już jest
mierzone (10 kart z fixture'u). Po merge'u (a) — `lhci-measure.yml`
(5 przebiegów) i ewentualny wpis median to osobna decyzja.

### 5.6 Przypadki, których fixture nie pokrywa — propozycje do `selection.json` (bez edycji)

| Luka                                                                | Skutek                                                              | Propozycja (numer dobiera Mateusz z listy publicznej)                              |
| ------------------------------------------------------------------- | ------------------------------------------------------------------- | ---------------------------------------------------------------------------------- |
| 10 ofert < 13 → `/oferty/` ma jedną stronę                          | zrzut i e2e paginacji w (b) nie mają fixture'u                      | dołożyć ≥ 3 oferty (np. 2 mieszkania na wynajem + dom), razem ≥ 13                 |
| brak oferty z `elevators` (winda)                                   | filtr „winda: tak" bez przypadku na fixture (unit na synt. zostaje) | mieszkanie z windą (dane: 3 aktywne mają `elevators`)                              |
| brak lokalu komercyjnego na wynajem                                 | lista `lokal-komercyjny-na-wynajem` bez zrzutu                      | 1 lokal na wynajem (dane: 1 aktywny)                                               |
| brak oferty aktywnej z działek/domów poza Poznaniem                 | karta z `info` gminy tylko sprzedana                                | opcjonalnie                                                                        |
| brak oferty z `availableFrom` w przyszłości                         | dotyczy detalu 4.3, nie listy                                       | — (nadpisanie `availableFrom` istnieje w mechanice)                                |

Zmiana `selection.json` = `pnpm fixtures:build` + oba komplety baseline'ów
w tym samym PR — najlepiej razem z PR-em (b), nie w (a).

## 6. Kontrakty i testy

**Utrzymane z szkieletu:** `data-offer-card="{numer}"` na karcie
(strażnik `assertVisualFixture`, `visual-fixture.test.ts`,
`offers-skeleton.spec.ts`), `main h1` (smoke), `data-offer-detail`/
`-number`/`-price` na detalu (szkielet detalu nietknięty), adresy
z `routes.ts`/`urls.ts`, sitemapa = trasy statyczne + listy + detale.

**Nowe moduły (a):**

| Plik                                        | Rola                                                                                                                                                                                        |
| ------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `src/lib/offers/location-path.ts`           | `locationPath(loc)`, `leafId(loc)` — ścieżka slugów (ta sama co w syncu; test równoważności)                                                                                                |
| `src/lib/offers/index-entry.ts`             | `INDEX_FIELDS`, `toIndexEntry(offer)`, `toIndexText(offer)` (tekst opisu bez HTML — `htmlparser2` już w zależnościach), `buildIndex(data)`                                                  |
| `src/lib/offers/filters.ts`                 | `PAGE_SIZE = 12`, typy `SearchState`, `parseSearch(pathname, search)`, `serializeSearch(state)`, `applyFilters(entries, state, texts?)`, `sortEntries`, `paginate`, `statusCounts`, `isFieldRelevant(type, field)` |
| `src/lib/offers/offers-ui.ts`               | etykiety UI listy (typy, transakcje, statusy wg M3a, sortowania, teksty zero wyników z part2 §4.3), `TYPE_LABEL_PLURAL`, `listTitle(state)`                                                  |
| `src/components/offers/OfferCard.tsx`       | karta (Preact, SSR w (a)); treści z CRM jako tekst — bez `dangerouslySetInnerHTML`                                                                                                           |
| `src/components/offers/icons.ts`            | ścieżki SVG designu                                                                                                                                                                         |
| `src/components/offers/OffersList.astro`    | nagłówek + licznik, linki typ/transakcja/lokalizacja (SSG), pigułki statusu (SSR), siatka kart, CTA; przyjmuje `offers` trasy i `state`                                                      |
| `src/pages/oferty/index.astro`              | `/oferty/` = `OffersList` na wszystkich ofertach (zero ofert → stan pusty)                                                                                                                  |
| `src/pages/oferty/[...path].astro`          | listy → `OffersList`; detal bez zmian                                                                                                                                                       |
| `src/pages/oferty/index.json.ts`            | endpoint statyczny z `buildIndex(loadOffersData())`                                                                                                                                         |
| `src/pages/oferty/index-text.json.ts`       | endpoint statyczny z opisami                                                                                                                                                                |

**Testy unit (a):** `offers-filters` (tabela §4 na danych syntetycznych
`syntheticFullOffers()` + liczniki na fixture ze skipem), `offers-index`
(klucze ⊆ `INDEX_FIELDS`, `findForbiddenKeys` puste, brak `descriptionHtml`
w indeksie, `index-text` bez tagów i bez `FORBIDDEN_SENTINEL`, każdy wpis
ma `path === offerPath(offer)`), `offers-location-path` (równość z
`scripts/sync/locations.ts` na synt./fixture/`data/`; każdy `nodeId`
istnieje w `locations.json`), `offers-format` (+ `TYPE_LABEL_PLURAL`).
`test:dist` skanuje też `index.json` i `index-text.json` (już obejmuje
`dist/**/*.json`).

**E2E (a) — `tests/e2e/oferty.spec.ts`** (dane produkcyjne, `pickOffer` +
`test.skip`, `useMediaStub`): `/oferty/` 200, `h1`, licznik = liczba
ofert w `data/`, liczba kart = liczba ofert; karta: link na
`offerPath(o)`, `<img>` z `width`/`height` i `alt`, cena =
`formatPrice(o)`, numer; parter → tekst „parter" (`pickOffer({floor: 0})`);
plakietka dla `sprzedana`/`wynajeta`/`rezerwacja` (po jednej, skip gdy
brak); „0% prowizji" (skip); „Nowość" tylko gdy `isNewOffer` (asercja
dwustronna: jest ↔ `BUILD_NOW` w oknie); lista typ×transakcja×lokalizacja
ma DOKŁADNIE oferty tej kombinacji; linki typu/transakcji/lokalizacji
prowadzą na istniejące listy (< 400); kolejność kart = `addedAt` malejąco;
`index.json` 200, `Content-Type` JSON, liczba wpisów = liczba ofert,
klucze ⊆ `INDEX_FIELDS`; kontrakt breakpointu siatki (`expectBreakpointFlip`
1025: kolumny 3 ↔ 1; 768 pilnuje unit na CSS? — nie: drugi flip na 768
mierzony `grid-template-columns`); CTA „Zadzwoń" bez JS → `/kontakt/`,
z JS `tel:`; zero żądań poza własny host i `MEDIA_BASE` (nasłuch sieci).
`offers-skeleton.spec.ts` zostaje (kontrakty nadal prawdziwe).

**Visual (a) — `tests/visual/oferty.spec.ts`** (fixture,
`useVisualFixtureGuard`, `prepareSweep`): `oferty-list` (pełna strona
`/oferty/`, 10 kart, próg fullPage 0,001 jak `not-found-full`),
`oferty-card` (element pierwszej karty listy `/oferty/mieszkanie-na-sprzedaz/`
— obniżka + Sprzedane), `oferty-list-location` (pełna strona
`/oferty/mieszkanie-na-wynajem/poznan-piatkowo/` — jedna karta z parterem
i „Nowość"). 3 zrzuty × 6 profili = 18 PNG na platformę. Zrzuty
chrome'u nie powinny się ruszyć (chrome nietknięty).

**Baseline'y:** kolejność święta — kod → workflow „Update linux visual
baselines" z `feat/oferty` (spec `tests/visual/oferty.spec.ts`, mode
`changed`) → `git pull` → diff darwin → `pnpm test:visual:update` → commit
darwin na końcu. Nieśledzone darwin PNG z pierwszego lokalnego
`test:visual` usuwam po przebiegu.

**LHCI:** §5.5; zużycie budżetów po `build:visual` w raporcie.

## 7. Co sprawdzić na fizycznym telefonie (po (a); reszta po (c))

1. Lista `/oferty/` na iOS Safari i Chrome Android: karty 1 kolumna,
   zdjęcia 3:2 bez skoku układu przy dogrywaniu (`width`/`height`),
   `lazy` nie zostawia pustych kart przy szybkim przewijaniu.
2. Pastylki mediów na zdjęciu (`backdrop-filter`) — klatkowanie na
   słabszym Androidzie = sygnał do wyłączenia bluru na mobile.
3. Rząd pigułek statusu przewijany poziomo: brak paska, przewija się
   palcem, nie łapie gestu „wstecz" systemu.
4. Tap w kartę trafia w link (cały obszar), bez opóźnienia; hover-lift
   nie „wisi" po tapie (telefon bez hovera — `@media (hover: hover)`).
5. Tytuły 2-liniowe z `line-clamp` przy długich tytułach i dużych
   czcionkach systemowych.
6. CTA „Zadzwoń" otwiera dialer (slot), „Zostaw kryteria" → `/kontakt/`.
7. Tablet (iPad, 768–1024): karty w wierszach (zdjęcie z lewej),
   kolumna ceny nie łamie się przy „Zapytaj o cenę".
8. Po (c): sheety filtrów i sortowania (swipe-down, klawiatura ekranowa
   nad polami liczbowymi `inputmode=numeric`, podłoga 16 px pól).

## 8. Pytania do Mateusza

1. **Podział (a)/(b)/(c)** i zakres tej sesji — §0. Akceptujesz (a) jak
   opisano (wszystkie karty widoczne, linki zamiast panelu, bez
   paginacji do (b))?
2. **Preact w (a)** jako renderer SSR karty (§5.1) — tak / nie (karta
   w `.astro`, przepisanie w (b))?
3. **M3a** etykieta: „Archiwalne" (rekomendacja) / „Oferty archiwalne" /
   „Sprzedane i wynajęte". **M3b** stan domyślny: wszystko włączone
   (rekomendacja) / aktywne + rezerwacje.
4. **Winda „Nie"** = wyłącznie `elevators === 0` (R14). Przy dzisiejszych
   danych daje 0 wyników. Alternatywa „Nie = 0 albo brak danych" łamie
   zasadę niewnioskowania — nie rekomenduję.
5. **Wszystkie karty w HTML** (§5.3, rekomendacja) czy tylko pierwsze 12?
6. **`location-path.ts` jako duplikat** logiki syncu z testem
   równoważności (ta sesja nie dotyka `scripts/sync/**`). Osobny mały PR
   „sync importuje ścieżkę z `src/lib`" — chcesz go po (a)?
7. **Wariant obrazu karty**: dziś `card = width=640`; proponuję
   `width=720,height=480,fit=cover` (3:2 jak karta, ostre na telefonie
   @2×, serwer tnie zamiast przeglądarki). Zmienia adresy wszystkich
   zdjęć kart (46 nowych transformacji, w limicie 5 000/mies.). Tak / nie
   (zostaje `width=640`, `object-fit` w CSS)?
8. **Linki typ/transakcja w (a)**: pigułki-linki zgodnie z designem, ale
   bez „Wszystkie" jako pigułki aktywnej na `/oferty/`? Proponuję:
   „Wszystkie" linkuje na `/oferty/`, typ na `/oferty/{typ}-na-sprzedaz/`
   (sprzedaż jako domyślna transakcja linku, bo bez wyspy nie ma listy
   „typ × wszystkie transakcje"); z wyspą (b) pigułki stają się filtrami.
   Alternatywa: w (a) bez pigułek typu — tylko pastylki lokalizacji.

## 9. Lista PLACEHOLDER (U9; zamykana w 7.7)

| Tekst                                                                                                                                       | Miejsce                      | Uwagi                                                                  |
| ------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------- | ---------------------------------------------------------------------- |
| „Nie znalazłeś?" / „Nie ma tu tego, czego szukasz? Opisz nam to." / „Zostaw swoje kryteria w formularzu kontaktowym — odezwiemy się, gdy pojawi się pasująca oferta. Możesz też po prostu zadzwonić." | `OffersList.astro` (CTA)     | drafty z designu                                                       |
| „Zostaw kryteria", „Zadzwoń"                                                                                                                | `OffersList.astro` (CTA)     | brzmienie z designu                                                    |
| „Zdjęcia wkrótce"                                                                                                                           | `OfferCard.tsx`              | brzmienie z designu (stan bez zdjęć)                                   |
| Meta `description` list SSG („Mieszkania na sprzedaż w Poznaniu — oferty biura Hetman Nieruchomości…")                                      | `offers-ui.ts`               | szablon do szlifu w Etapie 6                                           |
| Teksty zero wyników                                                                                                                         | `offers-ui.ts`               | parytet z obecną stroną (part2 §4.3) — nie draft, ale do przeglądu (c) |

Nie są placeholderami: etykiety filtrów i opcji (design + D16), „Znaleziono
N ofert" (parytet), „Nowość"/„Rezerwacja"/„Sprzedane"/„Wynajęte"/„0%
prowizji", „Zapytaj o cenę" (part3 §2.5), formaty liczb (`format.ts`).

## 10. Pliki do zmiany (po akceptacji, część (a))

- nowe: `src/lib/offers/{location-path,index-entry,filters,offers-ui}.ts`,
  `src/components/offers/{OfferCard.tsx,icons.ts,OffersList.astro}`,
  `src/pages/oferty/{index.json.ts,index-text.json.ts}`,
  `tests/unit/{offers-filters,offers-index,offers-location-path}.test.ts`,
  `tests/e2e/oferty.spec.ts`, `tests/visual/oferty.spec.ts`;
- zmienione: `src/pages/oferty/index.astro`, `src/pages/oferty/[...path].astro`
  (gałąź listy), `src/lib/offers/format.ts` (`TYPE_LABEL_PLURAL`),
  `src/lib/img.ts` (wariant `card` — pytanie 7), `src/styles/global.css`
  (token `--disabled`), `astro.config.mjs`, `tsconfig.json`,
  `package.json`/`pnpm-lock.yaml` (Preact — pytanie 2),
  `lighthouserc*.cjs`, `tests/unit/img.test.ts` (jeśli pytanie 7 = tak),
  `.claude/rules/{testing,sections}.md`, `CLAUDE.md`, `docs/README.md`;
- nietknięte: `scripts/sync/**`, `data/**`, `tests/fixtures/offers/**`,
  `Navbar.astro`, `Footer.astro`, `overlay.ts`, `data.ts`, `schema.ts`,
  detal w `[...path].astro`.

## 11. Uzupełnienia po implementacji (a)

- **Zależności:** `@astrojs/preact` 5.1.5 (linia 6.x wymaga Vite 8 /
  Astro 7) + `preact` 10.29; `vite` 7.3.5 trafił do devDependencies, bo
  po dodaniu integracji peer-y `@tailwindcss/vite` i `vitest` przeskoczyły
  na Vite 8 i `astro check` padał na niezgodnych typach pluginów.
- **Osierocone chunki Preact w `dist/_astro`** (`client.*.js`,
  `signals.module.*.js`, razem ≈ 22 KB): integracja emituje runtime
  kliencki nawet bez `client:*`; żadna strona ich nie ładuje (LHCI
  i budżety nietknięte). Zużyje je dopiero wyspa (b).
- **Preact SSR a `fetchpriority`:** atrybut przechodzi jako zwykły
  atrybut HTML; `width`/`height` obrazu z danych (nie z wariantu 720×480)
  — CSS `aspect-ratio: 3/2` i `object-fit: cover` rozstrzygają układ.
- **Pigułki statusu w (a)** to informacja (liczniki trasy), nie
  przełączniki — bez `aria-pressed`; interakcja wchodzi z wyspą.

## 12. Plan (b) — wyspa wyszukiwarki (`feat/oferty-wyspa`)

> **Status:** plan ZAAKCEPTOWANY 2026-10-02 (wszystkie rekomendacje
> 12.2–12.6), część (b) ZREALIZOWANA na gałęzi `feat/oferty-wyspa`
> (uzupełnienia po implementacji: §12.9). Zakres z §0 (b) + z promptu
> sesji: zależność pól od typu w UI i stan zero wyników (R23) weszły tu.

### 12.1 Co powstaje

| Plik | Rola |
| --- | --- |
| `src/components/offers/SearchIsland.tsx` (+ małe moduły w tym samym katalogu: `search-panel.tsx`, `location-field.tsx`, `sort-listbox.tsx`, `pagination.tsx`) | jedyna wyspa projektu: nagłówek z licznikiem (`h1` + `[data-offers-count]`, `aria-live`), panel filtrów (podstawowy + rozszerzony wg §1.2), pasek statusów (3 przełączniki `aria-pressed` z licznikami z `runSearch().counts`), sortowanie (przycisk + `role="listbox"`, klawiatura ↑↓ Home End Enter Esc, zamknięcie klikiem poza), siatka kart z `OfferCard.tsx`, paginacja (`<a href="?strona=N">` wszystkie numery + „Poprzednia"/„Następna" ikonami z `aria-label`, skrajna `aria-disabled`), stan zero wyników (`ZERO_RESULTS` z `offers-ui.ts`), skeleton |
| `src/components/offers/OffersListPage.astro` | zostaje powłoką: sekcja `[data-offers-list][data-build-now]`, blok nawigacji (a) (`nav.ol-nav`) i CTA poza wyspą; `<SearchIsland client:load …/>`; `<noscript><style>` (patrz 12.3) |
| `src/components/offers/offers.css` | style panelu (`op-*`), paska narzędzi, listboxa, paginacji, skeletonu, zera wyników; progi 1025/768 W PARZE z `site-config.ts` |
| `src/lib/offers/filters.ts` | (1) **`locationSlug`** w `SearchState` — dokładne dopasowanie segmentu adresu listy (R18 niżej), parametr `resolveSlug` znika; (2) `targetPath(state, ctx)` — czysta reguła adresu dla `pushState` (12.2); (3) bez zmian reszty kontraktu |
| `src/lib/offers/locations-ui.ts` (nowy) | czyste funkcje na drzewie z `index.json.locations`: `suggestLocations(nodes, query)` (poziomy miejscowość/dzielnica/poddzielnica, prefiks słowa po `normalizeText`, `info` ZAWSZE gdy węzeł je ma — part3 §4.2, licznik), `nodeLabel(node)`, `isLeaf(nodes, id)`, `streetsUnder(streets, id)` (kaskada ulicy: ulice wszystkich węzłów pod wybranym) |
| `src/lib/offers/format.ts` | `formatShowCount(n)` → „Pokaż 1 ofertę / 2 oferty / 5 ofert" (biernik; `formatOffersCount` to mianownik nagłówka) |
| `src/lib/offers/offers-ui.ts` | etykiety panelu (pola, opcje, „Więcej/Mniej filtrów", „Wyczyść", „Pokaż", podpowiedzi placeholderów z designu = PLACEHOLDER U9) |
| `tests/unit/{offers-filters,offers-format,offers-locations-ui}.test.ts` | nowe reguły (12.4) |
| `tests/e2e/oferty-wyspa.spec.ts` (nowy), `tests/e2e/oferty.spec.ts` (adaptacja), `tests/visual/oferty.spec.ts` (+4 zrzuty) | 12.4 |
| `.claude/rules/{testing,sections}.md`, `CLAUDE.md`, `docs/README.md`, ten plik (§11 uzupełnienia) | dokumentacja |

Nietknięte: `scripts/sync/**`, `data/**`, `tests/fixtures/offers/**`
(poza propozycją 12.6, którą edytuje Mateusz), `overlay.ts`, `data.ts`,
`schema.ts`, `index-entry.ts`, `OfferCard.tsx` (ta sama karta renderuje
się w wyspie bez zmian), detal w `[...path].astro`, chrome, `lighthouserc*.cjs`.

### 12.2 Architektura wyspy

- **`client:load`, nie `client:idle`.** Wyspa jest właścicielem stanu
  adresu: wejście z parametrami (`?strona=2`, `?cena-od=`) musi
  przerenderować listę najszybciej, jak się da, a panel jest widoczny od
  pierwszej klatki (SSR) — `idle` zostawiłoby okno, w którym kliknięcia
  w panel giną. Koszt: moduł ~10–12 KB po gzipie (12.5) ładowany jako
  `type=module` (nie blokuje LCP); hydratacja ≤ 46 kart to pojedyncze ms.
- **Hydratacja na tym samym markupie.** Astro renderuje `SearchIsland`
  przez Preact SSR i hydratuje TEN SAM komponent z tymi samymi propsami —
  równość markupu wynika z konstrukcji. Propsy: `entries` (wpisy indeksu
  TRASY — `toIndexEntry` jak w (a)), `complete` (`/oferty/` niesie
  komplet → nigdy nie pobiera `index.json`), `locations` (drzewo, ~5 KB —
  autocomplete i chipy działają od razu), `pathname` trasy, `nowIso`.
  Stan początkowy = `parseSearch(pathname, "")` po obu stronach; po
  montażu wyspa czyta `location.search` i przerenderowuje TYLKO gdy stan
  różni się od domyślnego (test: zero mutacji DOM siatki przy wejściu bez
  parametrów; CLS mierzone `PerformanceObserver` < 0,05).
- **Dane spoza trasy** (`/oferty/index.json`): na listach SSG pobierane
  w `requestIdleCallback` (fallback `setTimeout`) oraz natychmiast, gdy
  stan z adresu ich wymaga; `/oferty/index-text.json` dopiero przy
  pierwszym użyciu „szukaj w opisie" (także z adresu). **Skeleton** (12
  placeholderów kart 3:2) wyłącznie wtedy, gdy wyspa nie umie wyrenderować
  bieżącego stanu z tego, co ma (opis z adresu; zmiana rodzaju na liście
  SSG przed nadejściem indeksu) — w stanie domyślnym skeleton nie
  występuje (SSR). Licznik „Pokaż …" w czasie pobierania pokazuje „…"
  i `aria-busy`.
- **Panel = stan roboczy (draft), lista = stan zastosowany.** Pola panelu
  (typ, transakcja, lokalizacja, ulica, cena, powierzchnia, pokoje,
  piętro, rok, rynek, winda, umeblowane, liczba pięter, opis, numer)
  zmieniają draft; licznik „Pokaż N ofert" liczy
  `applyFilters(all, {...draft, statuses: stan.statuses})` na żywo;
  „Pokaż" (i Enter w polu) stosuje draft. Pigułki statusu, sortowanie
  i paginacja stosują się natychmiast (są poza panelem — jak w designie).
  **„Wyczyść" = zeruje draft I stosuje** (jedno kliknięcie, lista nie
  zostaje w stanie sprzed czyszczenia) — decyzja prezentacyjna, do
  odwołania jednym wierszem.
- **Zależność pól od typu w UI:** pole nieadekwatne do typu z draftu
  (`isFieldRelevant`) znika z panelu rozszerzonego, a jego wartość
  w drafcie jest kasowana (nie „wisi" ukryta); logika filtra bez zmian.
- **Adres (`targetPath` + `serializeSearch`):** typ ∧ transakcja →
  `/oferty/{typ}-na-{transakcja}/`; dodatkowo lokalizacja, gdy wybrany
  węzeł jest LIŚCIEM drzewa i istnieje wpis tej kombinacji z tym slugiem
  (= lista SSG istnieje) → `/…/{slug}/`; w pozostałych przypadkach
  `/oferty/` albo ścieżka rodzaju + parametry (`?typ=`, `?transakcja=`,
  `?lokalizacja={nodeId}`). Reszta zawsze w parametrach. `pushState`
  przy każdej zmianie stanu zastosowanego, `popstate` → `parseSearch`
  → render; nagłówek `h1`/`<title>` nie zmienia się przy `pushState`
  poza `h1` wyspy (`listHeading` z nowego stanu) — canonical i meta
  zostają z SSG (filtry w parametrach = ten sam canonical).
- **Lokalizacja:** jeden wybór (parytet part2 §4.2 — jeden `location`),
  chip z etykietą węzła (`label ?? name`) i X; pole = combobox
  (`role="combobox"`, `aria-autocomplete="list"`, lista
  `role="listbox"`, ↑↓ Enter Esc); podpowiedzi offline z `locations`
  (12.1). Ulica: pole aktywne tylko z lokalizacją (kaskada), podpowiedzi
  z `streetsUnder`, wpis wolny dozwolony (dopasowanie w `filters.ts`).
- **Mobile w (b):** panel `display:none` < 1025 (W PARZE z
  `DESKTOP_MIN_PX`), blok nawigacji (a) zostaje widoczny < 1025
  i znika ≥ 1025 (panel go zastępuje); pigułki statusu i paginacja
  działają na każdej szerokości; sortowanie na mobile dopiero z sheetem
  (c). Kontrakt `expectBreakpointFlip(1025)` na `.ol-nav`/`.op`.
- **Bez JS** (`<noscript><style>` w sekcji): karty od 13. (SSR `hidden`)
  odkryte, paginacja i panel ukryte, nawigacja (a) widoczna także
  ≥ 1025. Linki SSG i `/oferty/` działają jak w (a).

### 12.3 Rozjazdy i decyzje tej sesji (ciąg dalszy §2)

| # | Rozjazd | Rozstrzygnięcie |
| --- | --- | --- |
| R18 | Lista SSG z lokalizacją (a) = DOKŁADNIE oferty o danym slugu (`listPath`), a `parseSearch` z (a) mapowała slug → id węzła → dopasowanie PREFIKSOWE. Dla slugu miejscowości z dzielnicami (`…/poznan/`: 1 oferta SSG vs 19 prefiksem) hydratacja zmieniałaby zawartość strony | **Segment adresu listy = dopasowanie dokładne** (`locationSlug` w stanie), prefiks tylko dla `?lokalizacja=`; `resolveSlug` znika. Test unit + e2e (lista z lokalizacją po hydratacji = zbiór SSG) |
| R19 | Budżet wyspy „< 15 KB" (§5.4: brutto). Runtime klienta Astro+Preact (`client.*.js`) to dziś 12 965 B brutto, więc brutto całości wyjdzie ok. 25–30 KB | **Raport w obu miarach**; bramką jest LHCI `script:size` 30 000 B, a serwer LHCI kompresuje (`compression` w `fallback-server.js`) → budżet LHCI i „< 15 KB" z part2 §9 czytam jako bajty PRZESYŁANE (gzip). Do potwierdzenia przez Mateusza po pomiarze (12.5) |
| R20 | Design: „Wyczyść" tylko odmalowuje kontrolki | Zeruje draft i stosuje (12.2) |
| R21 | Poziomy węzłów w podpowiedziach (obecna strona pozwala wybrać powiat/województwo) | Placeholder designu „Miejscowość lub dzielnica" → podpowiedzi = miejscowość / dzielnica / poddzielnica; powiat i województwo poza listą (`info` i tak niesie gminę i powiat). Jednowierszowa zmiana w `suggestLocations`, jeśli chcesz inaczej |
| R22 | Design: etykieta „Pokaż" bez liczby (R10) | „Pokaż N ofert" biernikiem (`formatShowCount`) |
| R23 | Stan zero wyników był w (c) | **Wchodzi w (b)** — bez niego filtr dający 0 wyników zostawia pustą siatkę; teksty `ZERO_RESULTS` (parytet part2 §4.3), zrzut `oferty-zero` |

### 12.4 Testy

- **Unit:** `offers-filters` — `locationSlug` (dokładny; koegzystencja
  z `?lokalizacja=`; `serializeSearch` nigdy nie emituje slugu), `targetPath`
  (liść z listą → ścieżka slugu; miejscowość z dzielnicami → parametr;
  brak typu/transakcji → `/oferty/` + parametry); `offers-format`
  (`formatShowCount` 1/2/5/12/22/25); `offers-locations-ui` (prefiks
  słowa, diakrytyki, poziomy, `info` zawsze gdy jest, liść, ulice pod
  węzłem) — synt. + fixture.
- **E2E `oferty-wyspa.spec.ts`** (chromium-1920, dane produkcyjne,
  `pickOffer` + `test.skip`, `useMediaStub`; oczekiwania liczone
  `runSearch` na pobranym `/oferty/index.json` i `index-text.json`):
  (1) hydratacja bez przerenderowania (MutationObserver na siatce = 0
  mutacji) i CLS < 0,05; (2) każdy z 17 filtrów + status zawęża albo
  zostawia liczbę = `runSearch` (część przez UI: pigułka typu, segment
  transakcji, autocomplete lokalizacji → chip, cena + „Pokaż", „Więcej
  filtrów" + pokoje + winda; reszta przez adres); (3) licznik „Pokaż N"
  na żywo = liczba po „Pokaż"; (4) adres ↔ stan: po „Pokaż" adres =
  `serializeSearch`, odświeżenie odtwarza kontrolki (aria-pressed,
  wartości pól, chip) i liczbę; wstecz/dalej przywracają poprzedni
  stan; (5) typ+transakcja → `pushState` na ścieżkę SSG; liść z listą →
  ścieżka slugu, miejscowość z dzielnicami → `?lokalizacja=`; (6)
  paginacja (skip ≤ 12): 12 widocznych, reszta `hidden`, `?strona=2`,
  numery wszystkie, skrajne `aria-disabled`, strona poza zakresem = 0
  widocznych + nagłówek N; (7) pigułki statusu: wyłączenie zmienia
  liczbę i adres, wszystkie wyłączone = 0; (8) sortowanie: kolejność
  widocznych = `sortEntries` dla 4 kluczy; (9) zero wyników: nagłówek
  i 3 podpowiedzi; (10) lista SSG z lokalizacją po hydratacji = zbiór
  SSG (R18); (11) klawiatura listboxa i combobox; (12) bez JS (surowy
  HTML): `hidden` od 13., `<noscript>` ze stylem, panel w SSR; (13)
  próg 1025: `.ol-nav` ↔ panel (`expectBreakpointFlip`); (14) zero
  żądań do podmiotów trzecich także po interakcjach; (15) axe na
  `/oferty/` z panelem rozwiniętym i otwartym listboxem (allowlista
  pusta).
- **Adaptacja `oferty.spec.ts`:** liczność kart = oferty (karty ukryte
  liczą się), nawigacja (a) sprawdzana jako `toBeAttached` (na 1920
  ukryta), pigułki statusu jako `button[data-status-group]`.
- **Visual `oferty.spec.ts`** (fixture, `useVisualFixtureGuard`):
  istniejące `oferty-list`, `oferty-card`, `oferty-list-location` się
  ROZJADĄ na profilach desktop (panel zamiast nawigacji); nowe:
  `oferty-panel` (element panelu, tylko profile ≥ 1025 — na mobile
  `test.skip`), `oferty-panel-more` (panel rozwinięty, j.w.),
  `oferty-list-filtered` (fullPage `/oferty/?cena-od=500000`, 6 profili),
  `oferty-zero` (fullPage `/oferty/?numer=SW000000`, 6 profili),
  `oferty-pagination` (fullPage `/oferty/?strona=2` — `test.skip`, dopóki
  fixture ma ≤ 12 ofert). Razem +18 PNG na platformę (+6 po przebudowie
  fixture'u). Kolejność święta: kod → workflow linux z brancha (spec
  `tests/visual/oferty.spec.ts`, mode `changed`; `all` tylko po pomiarze
  progiem 0) → `git pull` → diff darwin → `test:visual:update` → commit
  darwin na końcu.

### 12.5 Budżet wyspy — pomiar

Po `pnpm build:visual`: z `dist/oferty/index.html` zbieram `component-url`
i `renderer-url` z `<astro-island>`, `<script src>` oraz statyczne
importy tych plików w `dist/_astro/` (skrypt pomiarowy w scratchpadzie,
wynik do PR-a); dla każdego pliku bajty brutto i po `gzip -9`, osobno:
runtime (`client.*.js` = Preact + renderer Astro; `signals.module.*.js`
NIE ładuje się bez sygnałów), kod wyspy (chunk komponentu + ewentualne
współdzielone), skrypt inline `astro-island` (bajty w HTML). Prognoza:
brutto 25–30 KB, gzip 10–13 KB; LHCI `script:size` po (a) ≈ 4 KB → po
(b) ≈ 15 KB z 30 000 B. LHCI lokalnie 1 przebieg na obu configach
(asercje), wynik w raporcie. Koszt uboczny: `client:load` serializuje
propsy do HTML — `/oferty/` z 46 wpisami to ok. +60 KB HTML brutto
(gzip ≈ 9 KB) — podaję w raporcie.

### 12.6 Fixture — propozycja do `selection.json` (edytuje Mateusz)

| Numer | Co wnosi | Luka z §5.6 |
| --- | --- | --- |
| ~~`SW803370`~~ → `SW964944` | lokal na wynajem NIE występuje w zrzucie `list` z 2026-09-28 (wszedł do CRM później); zamiast niego mieszkanie na sprzedaż, aktywna, parter, Winogrady (3. karta `mieszkanie-na-sprzedaz`, 3. parter) | lista `komercyjny-na-wynajem` i chip z `info` dla oferty aktywnej ZOSTAJĄ bez zrzutu — do nowego zrzutu (decyzja Mateusza, GET do API) |
| `SW149199` | mieszkanie na wynajem z windą (`elevators` = 1), wynajęta, Poznań bez dzielnicy (slug `poznan` = R18) | winda „tak", dokładny slug miejscowości |
| `SW622811` | mieszkanie na sprzedaż z windą, sprzedana, Wilda | druga winda, 3. karta `mieszkanie-na-sprzedaz` |

13 ofert → `/oferty/` ma 2 strony (zrzut `oferty-pagination`, e2e na
fixture nie trzeba — e2e biega na `data/`). Kolejność dla Mateusza:
edycja `selection.json` → `pnpm fixtures:build` → commit generatów na
`feat/oferty-wyspa` PRZED workflowem baseline'ów (inaczej baseline'y
powstają dwa razy).

### 12.7 Zostaje do (c)

Bottom sheety „Filtry" i „Sortuj" na `overlay.ts`, przyciski
Filtruj/Sortuj i sortowanie na mobile, przełącznik siatka/lista, stany
brzegowe (komunikat przy nieznanym parametrze, zły slug), panel na
tablecie 768–1024 (w (b) tablet = układ mobilny: nawigacja (a)).

### 12.8 Punkty kontrolne crona (sesja (b))

Start sesji 2026-10-02 15:45 UTC: bieg planowy 2026-10-03 — „oczekuje"
(ostatni bieg `schedule` 2026-10-02 08:27 UTC, opisany). Kontrola
w każdym punkcie z promptu; porządek po cronie ma pierwszeństwo.

### 12.9 Uzupełnienia po implementacji (b)

- **Budżet wyspy (pomiar 12.5, `pnpm build:visual`, `dist/oferty/`):**

  | Plik | Rola | brutto | gzip -9 |
  | --- | --- | --- | --- |
  | `SearchIsland.*.js` | kod wyspy (panel, combobox, listbox, paginacja, karta, `filters.ts`, `offers-ui.ts`, `format.ts`, `locations-ui.ts`, ikony) | 32 794 B | 11 898 B |
  | `preact.module.*.js` + `hooks.module.*.js` | Preact 10 + hooks | 13 170 B | 5 640 B |
  | `client.*.js` | renderer kliencki Astro (hydratacja) | 2 669 B | 1 395 B |
  | **wyspa + runtime** | | **48 674 B** | **18 991 B** |
  | chrome (a): Navbar, Footer, `contact-details` | bez zmian | 8 044 B | 3 269 B |
  | **razem `script` na `/oferty/`** | bramka LHCI 30 000 B liczona po kompresji | 56 718 B | **22 260 B (74 %)** |
  | `signals.module.*.js` | emitowany, NIE ładowany (`import()` tylko przy sygnałach) | 7 915 B | — |
  | skrypty inline w HTML (fade BaseLayout + runtime `astro-island`) | | 5 630 B | — |

  LHCI lokalnie (1 przebieg, oba configi, asercje czyste): `script`
  na `/oferty/` = **25 889 B (86 % bramki 30 000 B)** — LHCI liczy
  transfer z własną kompresją i nagłówkami, więc wyżej niż `gzip -9`;
  `total` 458 KB (46 % / 38 %), TBT 0 ms, CLS 0,003, LCP desktop
  528 ms (próg 1 800). Zbliżenie do bramki `script` zgłoszone: kolejne
  skrypty widoków (lightbox 4.3, hero 4.4) muszą zmieścić się w ~4 KB
  albo bramka wymaga decyzji o progu.
  „< 15 KB" z part2 §9 spełnione dla kodu wyspy po gzipie (11,9 KB)
  i NIE dla sumy z runtime (19,0 KB) ani brutto (48,7 KB) — R19 do
  decyzji Mateusza (bramka twarda LHCI mieści się z zapasem 26 %).
  Serializacja propsów `client:load`: `/oferty/` na fixture (10 wpisów)
  = 79,6 KB HTML brutto / 12,1 KB gzip (`props="…"` 22 435 znaków);
  na `data/` (46 wpisów) proporcjonalnie ok. 100 KB brutto / ~15 KB gzip.
- **Zod w bundlu (wycięty):** pierwszy build wyspy miał 107 880 B brutto,
  bo `filters.ts` i panel importowały słowniki wartości z `schema.ts`
  (zod). Słowniki przeniesione do `src/lib/offers/enums.ts` (moduł bez
  zależności), `schema.ts` re-eksportuje — jedyna zmiana w `schema.ts`,
  bez zmiany kształtu schematu (R24, poza planem; reguła w `sections.md`).
- **Hydratacja a sąsiednie teksty w JSX** (R25): `{a} <b>` to w vdom dwa
  węzły tekstowe, a parser HTML daje jeden — Preact przy hydratacji
  rozdzielał węzeł (94 mutacje DOM siatki). Poprawka w `OfferCard.tsx`
  (`sr-only` „zdjęć") i wyspie (licznik, pigułki statusu); test „zero
  mutacji" pilnuje.
- **`?status=` (pusty zbiór)** musi przeżyć serializację — `serializeSearch`
  pomijało puste wartości, więc „żadna grupa" czytała się jak stan
  domyślny; poprawka + test unit.
- **Kontrast „Pokaż":** biały na miedzi (3,1:1) → `--ink` na miedzi
  (5,5:1), hover `--copper-hover` — jak „Zadzwoń" stopki (R6 chrome'u).
  Wyłączone strzałki paginacji: `span` bez roli nie może nieść
  `aria-label` (axe `aria-prohibited-attr`) → tekst `sr-only`.
- **Pigułki typu przy 1366 px** zawijały się do dwóch linii — `ol-pill--sm`
  14 px / padding 12 px / gap 6 px (mieszczą się w 5/12 panelu).
- **Nawigacja (a) na mobile zostaje** (panel wchodzi tylko ≥ 1025, sheety
  w (c)); na desktopie znika pod panelem, `<noscript>` ją przywraca.
- **Test unit `liczniki na fixture`** (`offers-filters.test.ts`) ma liczby
  policzone dla 13 ofert fixture'u (po 12.6) i pomija się, gdy fixture
  nie został przebudowany po zmianie `selection.json`.
- **R26 — CLS na mobile po merge'u (PR #16):** job `lighthouse` na
  `main` padł na `/oferty/mieszkanie-na-sprzedaz/` (CLS 0,056 > 0,05;
  lokalnie 0,073, na `/oferty/` 0,025). Element: `nav.ol-nav`. Mechanizm:
  Astro wstawia `<style>astro-island{display:contents}</style>` w `<body>`
  tuż przed wyspą, a nagłówek (w wyspie) był przestawiany regułą CSS
  `order` NAD nawigację (a) renderowaną wcześniej przez Astro — na
  mobile nawigacja malowała się na górze, a dojeżdżający nagłówek spychał
  ją w dół. Poprawka (gałąź `fix/oferty-cls-nav`): nawigacja renderowana
  przez wyspę z propsa `nav` (rodzaje + lokalizacje liczone w Astro)
  w naturalnej kolejności DOM, `order` usunięte; CLS 0,000 na obu
  stronach; test e2e kolejności DOM = ekranu. Lekcja do `sections.md`:
  w wyspie nie używaj `order` do przestawiania bloków względem markupu
  spoza wyspy.
- **R27 — TBT mobile na `/oferty/` po merge'u #17:** `lighthouse` na
  main padł na TBT 485 ms > 150 ms; ten sam kod na PR #17 dał 146 ms,
  na PR #16 14 ms (raporty z publicznego magazynu LHCI: jedno zadanie
  hydratacji wyspy 64 → 196 → ~535 ms w kolejnych biegach, pozostałe
  metryki wątku głównego też 1,5–3× wolniejsze — runner, nie kod).
  Lokalnie przy 4× dławieniu CPU (Playwright + CDP, 5 przebiegów):
  mediana TBT 23 ms przed poprawką R26 i 19 ms po niej, zadanie
  hydratacji ~70 ms. Próg 150 ms był ręcznym minimum z mediany 0
  (szkielet bez JS, Etap 3) — wyspa to pierwszy realny JS w serwisie.
  Ścieżka wg reguły ratchetu (testing.md): `lhci-measure.yml` na main
  (5 przebiegów × 2 configi), próg TBT z mediany z marginesem na
  wariancję runnera (analogicznie do LCP: max(×1,15; +margines)) —
  decyzja Mateusza, osobny commit; do rozważenia w (c): `client:idle`
  nie skraca zadania, realne skrócenie dałoby tylko lżejsze
  hydratowanie (mniej kart w pierwszym renderze), czyli zmiana
  architektury §12.2 — nie bez decyzji.
  **Pomiar (sesja (c), `lhci-measure.yml` na main po #17, 2026-10-02
  19:43 UTC, 5 przebiegów × 2 configi):** mobile `/oferty/` TBT
  31 / 40 / 47 / 54 / 456 ms (mediana 47; jedno zadanie hydratacji
  75 → 579 ms w przebiegu odstającym), `/oferty/mieszkanie-na-sprzedaz/`
  5 / 22 / 24 / 24 / 62 ms (mediana 24); desktop wszystkie trasy 0 ms
  (zadanie < 50 ms). `script` na obu trasach ofert 26 054 B (87 %
  bramki 30 000 B), `total` 288–295 KB mobile / 295–479 KB desktop,
  CLS 0,000 (R26 potwierdzona), LCP mobile 2 360 ms (próg 3 200 —
  margines 840 ms, mniejszy niż regułowe 1 300 ms; LCP nietknięte,
  obserwacja). Progi TBT: reguła max(mediana × 2; mediana + 300 ms)
  dawała 350 ms mobile, ale przebieg odstający (456) i czerwony bieg na
  main (485 jako mediana z 5) leżą powyżej — decyzja Mateusza: zapas
  ponad fałszywe czerwienie runnera, mobile 150 → **600 ms** (≈ 1,15 ×
  najgorszy przebieg, granica „poor" Google), desktop 100 → **300 ms**
  (mediana 0, reguła) — PR #18, zmergowany 2026-10-02 20:21 UTC.

## 13. Plan (c) — mobile, sheety, siatka/lista, stany brzegowe (`feat/oferty-mobile`)

> **Status:** plan ZAAKCEPTOWANY 2026-10-02 (rekomendacje 13.2–13.4
> przyjęte w całości); realizacja w tej samej sesji. Zakres: §0 (c)
> + §12.7. Progi TBT rozstrzygnięte osobno (R27, PR #18).

### 13.1 Co powstaje

| Plik | Rola |
| --- | --- |
| `src/components/offers/sheets.tsx` (nowy, **dynamiczny `import()`**) | powłoki sheetów „Filtry" i „Sortuj" (`#ol-sheet-filters`, `#ol-sheet-sort`: scrim, panel `data-overlay-panel`, uchwyt `data-overlay-drag`, `h2` + X `data-overlay-close`, kontener treści) budowane w `<body>` przy pierwszym otwarciu; `FiltersSheet` (ten sam `SearchPanel` w wariancie `sheet` + sticky stopka Wyczyść / Pokaż N ofert) i `SortSheet` (dwie grupy segmentów + „Zastosuj", wybór tymczasowy) |
| `SearchIsland.tsx` | pasek narzędzi < 1025 (`.ol-mtools`: „Filtruj" + „{bieżące sortowanie}"), host panelu `inline` / `sheet` z `matchMedia(1025)`, treść sheetu jako DRUGI root Preact (`render(vnode, mount)` w `useLayoutEffect`, `render(null)` po zamknięciu), `window.overlay.open/close` z `onClose`, przejście na ≥ 1025 domyka sheet, przełącznik siatka/lista (`data-view` na `[data-offers-grid]`), stany `invalid` / błąd pobrania z „Ponów", prefetch chunku sheetów przy pierwszym `touchstart`/`pointerdown` poniżej progu |
| `search-panel.tsx` | prop `variant: "inline" \| "sheet"` (sheet: pola jedno pod drugim, większe kontrolki, „Więcej filtrów" jako pełny wiersz z podpowiedzią, bez akcji w siatce), eksport `PanelActions`, `aria-busy` + podpowiedź statusu na polu opisu podczas pobierania tekstów, „Pokaż" bez liczby po błędzie pobrania |
| `combobox.tsx` | Esc przy otwartych podpowiedziach zatrzymuje propagację (inaczej `overlay.ts` zamykałby cały sheet) |
| `offers.css` | pasek narzędzi mobile, grupa desktop (przełącznik widoku + sortowanie), widok listy, style sheetów (`ols-*`), bloki `invalid` / błąd; nawigacja (a) ukryta pod JS |
| `OffersListPage.astro` | `<noscript>`: chowa pasek narzędzi mobile i grupę desktop, odkrywa nawigację (a) |
| `offers-ui.ts`, `site-config.ts` | teksty sheetów, widoku, stanów brzegowych (nowe = PLACEHOLDER); `OFFERS_LIST_VIEW` (domyślny widok) |
| `tests/helpers/breakpoint.ts` | wartość oczekiwana `absent` (element nie istnieje po danej stronie progu) |
| `tests/e2e/oferty-mobile.spec.ts` (nowy), `oferty-wyspa.spec.ts`, `oferty.spec.ts`, `tests/visual/oferty.spec.ts` | 13.5 |

Nietknięte: `overlay.ts` (używamy API), `filters.ts` (bez nowej reguły),
`OfferCard.tsx`, `data.ts`, `schema.ts`, `enums.ts`, chrome, sync,
fixture, `lighthouserc*.cjs` (po PR #18).

### 13.2 Sheety a Preact (uzasadnienie)

- Sheety są POZA drzewem vdom wyspy: `overlay.ts` przenosi każdy
  `[data-overlay]` do `<body>` (`portalize`), a Preact przy kolejnym
  renderze wstawiałby węzeł z powrotem na swoje miejsce; węzeł w SSR
  wewnątrz wyspy psułby też hydratację. Powłoki buduje `sheets.tsx`
  bezpośrednio w `<body>` (statyczny HTML bez treści z CRM), treść
  renderuje Preact jako osobny root do kontenera powłoki.
- **Jeden `SearchPanel`, zero duplikatu:** SSR renderuje panel inline
  zawsze (hydratacja bez mutacji na desktopie; < 1025 `display:none`).
  Po montażu host = `matchMedia(1025)`: poniżej progu panel inline jest
  odmontowany (niewidoczny → zero CLS), a ten sam komponent z tym samym
  draftem i tymi samymi id renderuje się w sheecie. ≥ 1025: sheet
  domknięty, panel inline wraca.
- Mechanika (Esc, X, scrim, swipe-down z uchwytu i z treści na górze,
  focus-trap, blokada scrolla `body{position:fixed}` z powrotem pozycji,
  reset `scrollTop`) w całości z `overlay.ts`; wyspa dostaje `onClose`
  i tylko zeruje swój stan. Pasek Navbara zamraża się sam (`frozen()`).
- Chunk sheetów ładowany dynamicznie: zero bajtów w pomiarze LHCI
  (prefetch dopiero po pierwszym dotknięciu / wskaźniku, nie w idle).

### 13.3 Rozstrzygnięcia

| # | Rozjazd | Rozstrzygnięcie |
| --- | --- | --- |
| R28 | Nawigacja (a) na mobile po wejściu sheetów | **Znika pod JS** (design mobilny: pasek narzędzi → karty; sheet przejmuje typ, transakcję i lokalizację; blok zajmował 200–400 px nad pierwszą kartą). Zostaje w DOM dla `<noscript>` i crawlera |
| R29 | Widok domyślny desktop: parytet „lista" vs design „siatka" | **Siatka** (parytet to wartość, design = wygląd). Stan NIETRWAŁY: odczyt `sessionStorage` po hydratacji dawałby skok siatka → lista u realnych użytkowników, a powrót z detalu przywraca stan przez bfcache. Domyślny widok w `OFFERS_LIST_VIEW` |
| R30 | „Wyczyść" w sheecie | zeruje draft i stosuje (R20), sheet ZOSTAJE otwarty (licznik pokazuje komplet) |
| R31 | Sheet „Sortuj" | wybór tymczasowy, „Zastosuj" stosuje i zamyka; Esc / X / scrim / swipe porzuca (parytet designu `pendSort`) |
| R32 | Teksty stanów brzegowych (nieznany typ/transakcja, błąd pobrania, pobieranie opisów, „Więcej filtrów" z podpowiedzią) | brak w bazie wiedzy i designie (poza podpowiedzią) → PLACEHOLDER (U9) w `offers-ui.ts` |
| R33 | Panel inline pod progiem nie istnieje | `expectBreakpointFlip` dostaje wartość `absent`; kontrakt progu: `.ol-mtools` flex/none, `.ol-view` none/flex, `.op` absent/block, `.ol-sort` none/block |

### 13.4 Stany brzegowe

- `invalid` (nieznany `?typ=`/`?transakcja=`) → blok `[data-offers-invalid]`
  z komunikatem i linkiem „Wszystkie oferty" zamiast ogólnego zera wyników.
- Błąd pobrania `index.json` / `index-text.json` → blok `[data-offers-error]`
  z „Ponów" zamiast skeletonu i zamiast cichego fallbacku na wyniki
  z puli trasy (mylące); „Pokaż" bez liczby, dopóki danych nie ma.
- Pole opisu podczas pobierania tekstów: `aria-busy` + podpowiedź
  statusu (`role="status"`).
- `?strona=` ujemne / tekst → 1 (parser z (a)) — tylko test.
- Zły slug lokalizacji / rodzaju → 404 Astro (SSG; bez zmian).

### 13.5 Testy

- **E2E `oferty-mobile.spec.ts`** (`chromium-pixel-5`, `webkit-iphone-14`;
  tablet przez `setViewportSize(900)`): pasek narzędzi widoczny, panel
  inline nieobecny, nawigacja (a) ukryta; „Filtruj" otwiera sheet
  (`role=dialog`, `h2`), zamknięcie przez X / Esc / scrim / swipe-down;
  focus-trap (Tab zostaje w sheecie); `body{position:fixed}` i powrót
  pozycji scrolla; „Pokaż" = `runSearch` + adres + zamknięcie, draft
  wspólny (ponowne otwarcie pokazuje wciśniętą pigułkę); „Więcej filtrów"
  w sheecie; „Sortuj" → „Zastosuj" vs porzucenie (adres, etykieta
  przycisku, kolejność); przejście na desktop domyka sheet i przywraca
  panel inline; pigułki statusu i paginacja na mobile; tablet: karty
  w wierszu + sheet; flip progu (R33); zero żądań trzecich po
  interakcjach; axe z otwartym sheetem filtrów i sortowania.
- **E2E `oferty-wyspa.spec.ts`** (1920): przełącznik siatka/lista
  (kolumny siatki ↔ wiersz `.oc-link`, `aria-pressed`), stany brzegowe
  (`?typ=zamek` → `[data-offers-invalid]`; `page.route` abort →
  `[data-offers-error]` → „Ponów" → lista = `runSearch`; `?strona=-1`,
  `?strona=abc` → strona 1); adaptacja kolejności DOM (bez panelu
  na 390 px) i flipu progu. `oferty.spec`: nawigacja (a) w DOM, ukryta
  pod JS, `<noscript>` w surowym HTML.
- **Visual `oferty.spec.ts`**: `oferty-sheet-filtry`, `oferty-sheet-sortuj`
  (zrzut strony z otwartym sheetem, profile mobilne), `oferty-tools-mobile`
  (element `.ol-tools`, mobile), `oferty-list-view-list` (fullPage
  po przełączeniu na listę, desktop). Rozjadą się fullPage `oferty-list`,
  `oferty-list-location`, `oferty-list-filtered`, `oferty-zero` na
  WSZYSTKICH profilach (mobile: pasek narzędzi zamiast nawigacji;
  desktop: przełącznik widoku w pasku) — zamierzone; `oferty-card`,
  `oferty-panel`, `oferty-panel-more`, `chrome`, `not-found` bez ruchu.

### 13.6 Budżet

Pomiar jak §12.5 po `build:visual`: osobno runtime, kod wyspy i chunk
sheetów (ładowany poza pierwszym malowaniem). Prognoza: wyspa +2–3 KB
brutto, sheety ~5 KB brutto w osobnym chunku; `script` LHCI ≈ 27 KB
z 30 KB. Przekroczenie bramki = stop i zgłoszenie.

### 13.7 Uzupełnienia po implementacji (c)

- **Budżet (pomiar §12.5, `pnpm build:visual`, `dist/oferty/`):**

  | Plik | Rola | brutto | gzip -9 |
  | --- | --- | --- | --- |
  | `SearchIsland.*.js` | kod wyspy (+ pasek narzędzi, host panelu, przełącznik widoku, stany brzegowe, drugi root) | 38 236 B (było 32 794) | 13 608 B (było 11 898) |
  | `preact.module` + `hooks.module` + `client` | runtime | 15 955 B | 7 056 B |
  | **wyspa + runtime** | | **54 191 B** | **20 664 B** |
  | chrome (Navbar, Footer, `contact-details`, `site-config`) | bez zmian | 8 101 B | 3 342 B |
  | **razem `script` na `/oferty/`** | | **62 471 B** | **24 153 B** |
  | `sheets.*.js` | chunk sheetów — dynamiczny `import()`, poza pierwszym ładowaniem | 2 287 B | 1 059 B |
  | `signals.module` | emitowany, nieładowany | 7 915 B | — |

  LHCI lokalnie (1 przebieg, oba configi, asercje czyste): `script` na
  `/oferty/` = **28 223 B = 94 % bramki 30 000 B** (po (b): 25 889 B,
  86 %); `total` 299 KB mobile / 482 KB desktop; TBT 41 ms mobile,
  0 desktop; CLS 0,000; LCP mobile 2 350 ms, desktop 524 ms. **Kolejny
  skrypt widoku (lightbox 4.3, hero 4.4) nie zmieści się w bramce
  `script`** — decyzja o progu PRZED 4.3 (zbliżenie zgłoszone już po (b)).
  **Próg podniesiony** (PR `chore/lhci-script`, po merge'u #19): pomiar
  `lhci-measure.yml` 2026-10-02 22:06 UTC na main — `script` 28 223 B
  w każdym z 20 przebiegów (mobile + desktop, obie trasy ofert; rozrzut
  zerowy, bo bajty są deterministyczne), TBT mobile mediana 11 ms
  (`/oferty/`, jeden przebieg odstający 1 238 ms) i 0 ms (lista rodzaju),
  LCP mobile 2 494 / 2 345 ms, CLS 0. Nowy próg w OBU configach:
  **40 000 B** (reguła `max(28 223 × 1,3; 28 223 + 10 000) = 38 223 →
  39 000`; decyzja Mateusza 2026-10-03: 40 000 z zapasem ok. 11,8 KB) —
  zapas wyłącznie na lightbox 4.3 i hero 4.4; pozostałe progi bez zmian.
  HTML `/oferty/` na fixture: 96,5 KB brutto / 13,6 KB gzip (`props`
  28 434 znaków — przyrost wobec (b) to prop `nav` z R26).
- **R34 — flaky „Ponów" (main 2026-10-03, bieg 37117494021, lokalnie
  2/4 → 5/6):** `retry()` → `loadAll()` zdejmowało flagę błędu na
  starcie próby, więc blok `[data-offers-error]` odmontowywał się
  SYNCHRONICZNIE w handlerze kliknięcia; Playwright nie mógł potwierdzić
  kliknięcia („element was detached from the DOM, retrying") i czekał
  30 s na przycisk, którego już nie było (dane nadeszły, lista
  wyrenderowana). Przy okazji druga rasa: po zastosowaniu nowego stanu
  jeden kadr pokazywał komunikat ze STAREJ próby, zanim efekt wystartował
  nową — test łapał ten kadr, a automatyczna próba (już bez `route.abort`)
  zdejmowała blok w trakcie klikania. Poprawka w `SearchIsland.tsx`:
  flaga błędu schodzi tylko po sukcesie albo wraz z nowym `applied`
  (batch w jednym renderze); `pending` jako stan; próba automatyczna =
  skeleton, ręczne ponowienie = blok zostaje z przyciskiem `disabled`
  + `aria-busy` (`retrying`) do wyniku; `textsLoading`/`countFailed`
  liczone z `pending`. Oba testy błędów 8/8 zielone w pętli lokalnej;
  `oferty-wyspa` + `oferty-mobile` + `oferty` + `a11y` 89/89 na trzech
  profilach; wyspa 38 611 B brutto / 13 755 B gzip (+375 / +147 wobec
  (c)); visual `oferty` i `chrome` bez ruchu.
- **`oferty-card` na profilach mobilnych rozjechał się bez zmiany karty:**
  nowy pasek narzędzi ma inną wysokość niż blok nawigacji (a), więc karta
  leży na innej ułamkowej pozycji y — zrzut elementu różni się
  antyaliasingiem całej treści (diff pokazuje kontury wszystkiego).
  Regeneracja zamierzona, nie regres.
- **Komentarz we frontmatterze `.astro` z `<` ze spacją** („sheety
  < 1025") rozstraja kompilator Astro: `astro check` zgłasza `any`
  w zupełnie innych liniach pliku. Lekcja w `sections.md`.
- **Test błędu pobrania `index.json`** musi przejść przez panel: na liście
  rodzaju żaden parametr adresu nie wymaga pełnego indeksu (typ
  i transakcja idą ze ścieżki), wymaga go dopiero zmiana rodzaju
  w panelu — stąd scenariusz „Wszystkie" typy → „Pokaż" bez liczby →
  `[data-offers-error]` → „Ponów".
- **axe przy otwartym sheecie** skanuje sam dialog (`include`) po wjeździe
  (600 ms): treść pod scrimem liczy kontrast przez nakładkę, a w trakcie
  przejścia `opacity` scrimu zaniżało kontrast elementów samego sheetu.
- **WebKit a focus-trap:** Tab w WebKit pomija przyciski (jak
  w `navigation.spec`) — test focus-trapu biegnie na `chromium-pixel-5`.
- PLACEHOLDER (U9) nowe w (c): podpowiedź „pokoje, piętro, rok budowy,
  rynek, winda…" (design), status „Wczytujemy opisy ofert…", teksty
  `EDGE` (nieznany rodzaj, błąd pobrania) w `offers-ui.ts`.

### 13.8 Co sprawdzić na fizycznym telefonie (po (c))

1. Sheet „Filtry": swipe-down za uchwyt i z treści przewiniętej na górę
   (gest NIE może odświeżać strony); przewijanie treści sheetu nie
   przewija strony pod spodem; pozycja listy wraca po zamknięciu.
2. Klawiatura ekranowa nad polami liczbowymi (`inputmode=numeric`)
   i nad lokalizacją — podpowiedzi widoczne nad klawiaturą, bez zoomu
   (podłoga 16 px); Safari: zwijany toolbar a sticky stopka Wyczyść /
   Pokaż (`env(safe-area-inset-bottom)`).
3. „Pokaż N ofert" zamyka sheet i lista się odświeża bez skoku;
   pigułki statusu przewijane palcem.
4. Sheet „Sortuj": segmenty tapnięciem, „Zastosuj" zmienia etykietę
   przycisku; zamknięcie X / scrim / swipe nie zmienia sortowania.
5. Tablet (iPad): przyciski Filtruj / Sortuj w jednym wierszu, karty
   w wierszu, sheet na pełną szerokość.
6. Obrót ekranu z otwartym sheetem (iPad w poziomie ≥ 1025 → sheet ma
   się domknąć, panel inline pojawić).
