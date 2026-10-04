# Testy — kontrakt projektu

Harness odziedziczony z szablonu projektu (konfiguracja
Playwright/Vitest/axe/LHCI, 6 profili, helpery); liczby szablonu NIE
obowiązują — baseline'y i budżety powstają od nowa w Etapie 3.

STAN po Etapie 4.6 (`/uslugi/`; wspólny moduł ruchu: tryb `data-px="top"`
liczony z pozycji kadru w dokumencie, odsłanianie bloków po skoku
kotwicy): unit bez zmian (widok nie ma logiki). E2E `uslugi` (nowy spec;
treść `chromium-1920`, hero, kotwice, układ i ruch także
`chromium-pixel-5` i `webkit-iphone-14`; teksty z `services-copy.ts`;
`useMediaStub` — test wejścia ze strony głównej otwiera „/"). Hero:
`main h1` = tytuł + fraza, `.uh-eyebrow`, akapit;
`[data-services-entries]` (`nav` z `aria-label`) — trzy `a` z `href` =
`#sprzedaje`, `#kupuje`, `#pomoc-prawna`, `.uh-name` i `.uh-kicker`
z `services-copy`; **poniżej progu nadtytuł TRZECIEGO wejścia jest
ukryty** (lżejszy link z samym tytułem, wysokość ≥ 44 px; kafle ≥ 48 px);
`[data-services-photo]` `eager`, `fetchpriority`, wymiary, `alt=""`,
`opacity 1`, zero `[data-rv]` w hero; `data-nav-hero` na sekcji hero;
geometria sub-pikselowo: hero od górnej krawędzi okna, wysokość ≥ okno;
desktop — wysokość = okno, kadr `.uh-media` = hero, dół pasa wejść = dół
hero, karta nad pasem; poniżej progu — kadr zaczyna się na dolnej
krawędzi `.uh-text` i kończy na dolnej krawędzi hero, wejścia leżą
w kadrze. Surowy HTML: dwa `link[rel=preload][as=image]` z `media` (kadr
`-tall` poniżej `SERVICES_HERO_TALL_BELOW_PX`), bramka `js-motion`,
`id` i `href` trzech kotwic, BRAK identyfikatorów z sufiksem `-m` / `-d`;
`scroll-behavior` dokumentu = `auto`; `<source>` 864×617, `currentSrc`
przy 767 / 768 (poll). **Kotwice (trzy profile, helper `expectAtAnchor`
— wszystko przez `expect.poll`):** górna krawędź sekcji w odległości
≤ 1,5 px od celu — **poniżej progu cel = dolna krawędź paska, od progu
= górna krawędź okna** (dopełnienie sekcji zawiera wysokość paska); `h2`
pod paskiem i w oknie; pierwszy `[data-rv]` sekcji dochodzi do
`opacity 1`; **żaden widoczny `[data-rv]` NAD oknem nie zostaje bez
`.is-in`** (bloki przeskoczone jednym susem — to wyłapało lukę modułu
ruchu); pasek `data-solid`. Trzy ścieżki: klik wejścia hero (× 3),
wejście z adresu `/uslugi/#…` (× 3), klik kafla
`[data-home="uslugi"] a.hsv-tile` na „/" (× 3 w jednym teście; `href`
kafli z `home-copy` = `SERVICES_PATH` + kotwica). Sekcje: `id`,
`aria-labelledby` = `uslugi-{sprzedaje|kupuje|pomoc-prawna}-h`, `h2`,
`.sx-head .sx-eyebrow` (**nie samo `.sx-eyebrow`** — pasy CTA też je
mają), akapit; `[data-services-list]` to `OL` z 5 / 5 / 6 pozycjami
(`h3` + `p` w kolejności z `services-copy`); zdjęcia po `alt` (`lazy`,
wymiary); `[data-services-extra="below"]` × 3 ukryte na desktopie,
`="desktop"` × 2 widoczne (na telefonie odwrotnie). Pasy CTA
`[data-services-cta]`: `.uc-eyebrow`, `.uc-text`, `a.uc-ghost`
(`.uc-kicker`, `.uc-name`) → `SELL_PATH` / `OFFERS_PATH`, `a.sx-btn` →
`CONTACT_PATH`; blok zamykający `.ul-close-eyebrow`, `.ul-close-text`,
`a.sx-btn`; trasy < 400. Slot: surowy `<main>` bez numeru, `tel:`,
`mailto:`; DOKŁADNIE jeden `a[data-tel]` z `data-fill="href"`
i `href` = `CONTACT_PATH`; po JS `href` = `tel:`, etykieta bez zmian.
Próg 1025: `expectBreakpointFlip` na 13 elementach (m.in. `.uh-stage`
flex ↔ block, wejścia flex ↔ grid, `.ul-main` contents ↔ flex, warianty
zdjęć none ↔ block) + sonda: kadr hero niższy od sekcji ↔ równy, pas CTA
węższy od okna ↔ na całą szerokość, zdjęcia „Pomocy prawnej" między
akapitem i listą ↔ obok listy. Telefon: warianty zdjęć, pięć przycisków
≥ 48 px, pas CTA w kolumnie treści, brak przewijania w bok. Bez JS: brak
`js-motion`, każdy `[data-rv]` `opacity 1`, kotwice w HTML, przycisk
telefonu → `CONTACT_PATH`, `.hdr-bg` `opacity 1`. Ruch: reveal pierwszego
bloku „Sprzedaję"; żaden `[data-rv]` nie jest linkiem ani przyciskiem;
**sonda parallaxu** — WIDOCZNYCH kadrów 7 na desktopie, 8 poniżej progu;
zapas ≥ `PX_AMT_*` × wysokość kadru; **zdjęcie hero (`data-px="top"`):
przesunięcie 0 przy scrollu 0 na OBU progach — poniżej progu kadr NIE
zaczyna się na górze strony (asercja `frameTop > 100`)**, `transform`
z CSS = `none`; obraz zakrywa kadr w sześciu pozycjach; kierunek odwrotny
— para kadrów „Kupuję" od progu, para „Pomocy prawnej" poniżej
(± 0,2 px). **PUNKTOWA emulacja `reduce` z komentarzem** (piąty dozwolony
wyjątek): brak `js-motion`, blok `opacity 1`, `[data-px]` `transform:
none`, skok kotwicy działa. Scroll natywny; zero hostów trzecich; axe po
`revealSweep` (desktop i Pixel 5). `navigation`: `OVER_HERO_PATHS`

- `/uslugi/`. Visual `uslugi` (`useVisualFixtureGuard`): `uslugi-top`
  (okno startowe) i `uslugi-full` (fullPage po `revealSweep`, próg 0,001;
  asercja slotu telefonu `href` = `tel:`) × 6 profili = 12 PNG na
  platformę. Zmierzone progiem 0 po zmianie `content-motion.ts`: `home-*`,
  `sprzedaj-*`, `o-nas-*`, `chrome-*` — wynik w `docs/analiza-uslugi.md`
  §10.4. **Pomiar kontrastu tekstu nad zdjęciem i na szkle** (kafle wejść
  i link na telefonie, karta i pas wejść na desktopie, logo i linki paska
  nad zdjęciem, przyciski szklane pasów CTA, blok zamykający „Pomocy
  prawnej", lista na ciemnej sekcji; axe tego nie liczy): metoda i liczby
  w `docs/analiza-uslugi.md` §10.2 — powtórz po zmianie krycia, gradientu,
  koloru tekstu albo zdjęcia; **mierz OBA silniki — WebKit dawał dla
  tekstu na szkle wyniki o 0,3–1,3 niższe niż Chromium**. LHCI mierzy
  dodatkowo `/uslugi/`.

STAN po Etapie 4.5 (`/o-nas/`; wspólny moduł ruchu z wartościami
`data-px="-1"` i `data-px="top"`): unit bez zmian (widok nie ma logiki).
E2E `o-nas` (nowy spec; treść `chromium-1920`, hero, układ i ruch także
`chromium-pixel-5` i `webkit-iphone-14`; teksty z `about-copy.ts`). Hero:
`main h1` = tytuł + fraza, `.ah-eyebrow`, akapit; **pas liczb
`[data-about-stats] li` (trzy pozycje, `strong` + `span`) widoczny na
OBU progach**; `[data-about-photo]` `eager`, `fetchpriority`, wymiary,
`alt=""`, `opacity 1`, zero `[data-rv]` w hero; geometria sub-pikselowo:
hero i kadr `[data-about-hero] [data-nav-hero]` od górnej krawędzi okna;
desktop — wysokość hero = okno, kadr = hero, dół pasa liczb = dół hero;
poniżej progu — wysokość kadru = `clamp(300, 0,88 × szerokość, 460)`,
kadr niższy od okna, karta `.ah-card` zaczyna się NAD dolną krawędzią
kadru i kończy pod nią, hero ≥ okno. Surowy HTML: dwa
`link[rel=preload][as=image]` z `media` (plik `-m` poniżej
`ABOUT_HERO_SMALL_BELOW_PX`), bramka `js-motion`; `<source>` 1024×574,
`currentSrc` przy 767 / 768 (poll). Sekcje: `aria-labelledby` =
`about-{historia|specjalizacja|kontakt}-h`, `h2` = tytuł + fraza, eyebrow;
historia — dwa akapity `.ay-body p`, dwa zdjęcia po `alt` (`lazy`,
wymiary), `figcaption` z rolą w `span`; specjalizacja — `.af-text`,
`.af-note`, trzy `.af-list li`, zdjęcie „umowa" widoczne,
`[data-about-extra]` w DOM i ukryte na desktopie; kontakt — `.ac-text`,
`a.sx-btn` → `CONTACT_PATH` (< 400). Sloty: surowy `<main>` bez telefonu,
e-maila, `tel:`, `mailto:`; DWIE ukryte kotwice z `<span data-slot>`; po
JS (desktop) w `[data-about-contacts]` trzy wiersze (etykiety z
`about-copy`), `mailto:` / `tel:`, adres z `BUSINESS`. Próg 1025:
`expectBreakpointFlip` (`.ah-in` block ↔ flex, `.ay-in` flex ↔ grid,
`.af` flex ↔ grid, `.af-media` grid ↔ flex, `[data-about-extra]` block ↔
none, `.ac-in` flex ↔ grid, `[data-about-contacts]` none ↔ flex) +
wysokości: kadr hero niższy od sekcji ↔ równy sekcji, kadr „umowa"
poniżej połowy sekcji ↔ równy sekcji. Telefon: lista kontaktu ukryta,
przycisk ≥ 48 px, drugie zdjęcie widoczne, brak przewijania w bok. Bez JS:
brak `js-motion`, każdy `[data-rv]` `opacity 1`, w liście kontaktu
JEDEN widoczny wiersz (biuro), `.hdr-bg` `opacity 1`. Ruch: `js-motion`,
`data-motion`, `.ay-card[data-rv]` `opacity 0` → `.is-in`, żaden
`[data-rv]` nie jest linkiem ani przyciskiem; **sonda parallaxu** —
liczba WIDOCZNYCH kadrów (wysokość > 0): 6 na desktopie, 7 poniżej
progu; zapas ≥ `PX_AMT_*` × wysokość kadru; **zdjęcie hero
(`data-px="top"`): przesunięcie wpisane przez moduł przy scrollu 0 = 0
(± 0,2 px), a po zdjęciu stylu inline `transform` = `none`** (CSS nie
daje pozycji startowej); obraz zakrywa kadr w sześciu pozycjach scrolla;
po przewinięciu o pół kadru zdjęcie hero ma przesunięcie ujemne;
**kierunek odwrotny** — przy kadrze w górnej części okna zdjęcie
`[data-px="-1"]` ma przesunięcie = wzór ze znakiem PRZECIWNYM (dodatnie),
zwykły kadr obok = wzór (ujemne), ± 0,2 px. **Po każdym przewinięciu
w sondzie parallaxu `dispatchEvent(new Event("scroll"))`** (helper
`scrollAndPaint` w specu): WebKit potrafi nie dostarczyć zdarzenia po
programowym skoku, a sonda porównuje transform z bieżącą pozycją.
**PUNKTOWA emulacja `reduce` z komentarzem** (czwarty dozwolony wyjątek):
brak `js-motion`, blok `opacity 1`, każdy `[data-px]` `transform: none`.
Scroll natywny; zero hostów trzecich po `revealSweep`; axe po
`revealSweep` (desktop i Pixel 5). `navigation`: test wariantu „nad
hero" biegnie po liście `OVER_HERO_PATHS` (`/sprzedaj-z-nami/`,
`/o-nas/`) — na `/o-nas/` poniżej progu `[data-nav-hero]` to kadr
zdjęcia, więc wzór z wysokości OKNA dawałby przy `kadr − pasek` jeszcze
stan pośredni (asercja odróżnia wzory także na profilach mobilnych);
`data-scroll-nav` w surowym HTML mają wyłącznie „/" i trasy z tej listy.
Visual `o-nas` (`useVisualFixtureGuard`): `o-nas-top` (okno startowe)
i `o-nas-full` (fullPage po `revealSweep`, próg 0,001) × 6 profili = 12
PNG na platformę. Zmierzone progiem 0 po zmianie `content-motion.ts`:
`home-*`, `sprzedaj-*`, `chrome-*` — wynik w `docs/analiza-o-nas.md`
§10.4. **Pomiar kontrastu tekstu nad zdjęciem i na szkle** (karta hero
na telefonie, kreski menu i logo nad zdjęciem, eyebrow historii
i kontaktu, etykiety listy kontaktu; axe tego nie liczy): metoda i liczby
w `docs/analiza-o-nas.md` §10.2 — powtórz po zmianie krycia, gradientu,
koloru tekstu albo zdjęcia. LHCI mierzy dodatkowo `/o-nas/`.

STAN po Etapie 5B / PR 2 (`/praca/` z plikiem CV): unit `cv-file` (NOWY:
limit jako stała — `CV_MAX_BYTES` jest całkowitą liczbą megabajtów,
`CV_REQUEST_MAX_BYTES` = limit + `FORM_MAX_BYTES`, dopisek i komunikat
z `PRACA_FORM_COPY` liczone ze stałej; `CV_TYPES`, `cvAccept()`,
`cvTypesLabel()`; `formatFileSize`; `detectCvSignature` — PDF, kontener
OLE, ZIP, plik krótszy niż sygnatura, pusty ZIP i JPEG; `checkCv` —
brak → `cv`, rozszerzenie → `cv-type`, **dokładnie limit przechodzi,
bajt więcej → `cv-size`**, zły typ wygrywa z rozmiarem, plik pusty,
sygnatura niezgodna z rozszerzeniem, nazwa po oczyszczeniu i MIME
z rozszerzenia; `sanitizeCvName` — ścieżka, znaki sterujące, cudzysłów,
diakrytyki, zapis niełaciński, długość; `pickBase64Encoder` na
WSTRZYKNIĘTYM zakresie — ścieżka silnika ma pierwszeństwo, ścieżka
`Buffer` (także widok na część bufora), brak obu → `null`, moduł bez
importów Node i bez `btoa`; `withAttachment` — poprawny JSON, załącznik
doklejony na końcu), `site-flags` (NOWY — stan WYŁĄCZONEGO
`SHOW_PRACA`: `isSitemapPath`, pozycje nawigacji, funkcja odrzuca
`form=praca` 400 `form`; moduły ładowane z podmienionym configiem przez
`vi.doMock` + `vi.resetModules` + dynamiczny `import()` — **wzorzec na
każdy test przełącznika z `site-config.ts`**), `contact-form` (+ rodzaj
`praca`: `validateForm(kind, raw, checkCv)` — bez `checkCv` zawsze błąd
`cv`; błąd pliku NA KOŃCU listy pól; treść przycinana; `future`; brak
`marketing` w danych; **mail C**: temat, kolejność etykiet, linia „CV:
nazwa (rozmiar)", zgoda na przyszłe rekrutacje + brzmienie, BEZ zgody
marketingowej i bez nagłówka danych kontaktowych, stopka z adresem
`/praca/`, escapowanie; helper `marketingOf()` — `PracaData` nie ma pola
`marketing`) i `contact-endpoint` (pomocniki `fileBytes(sig, size)` —
sygnatura + bajty z pełnego zakresu 0–255, `cvFile()`, `postCv()`
z `content-length` = plik + 2 048; **413 bez czytania treści dopiero
ponad `CV_REQUEST_MAX_BYTES`**; formularz tekstowy ponad
`FORM_MAX_BYTES` albo z JAKIMKOLWIEK plikiem → 413 po odczytaniu
rodzaju; PDF / DOC / DOCX → jedno żądanie do Resend: treść jest
poprawnym JSON-em, `attachments[0]` = `filename` (oczyszczona),
`content_type` (z rozszerzenia, nie z deklaracji przeglądarki),
`content` po zdekodowaniu **bajt w bajt = plik, także dla pliku
o rozmiarze limitu**, załącznik na końcu treści; walidacja pliku 400
z `cv` / `cv-type` / `cv-size`; plik ponad limit przy zaniżonej
deklaracji → `cv-size`; **pola tekstowe `cv:name` / `cv:size` /
`cv:sig` od klienta nie zastępują pliku**; **kolejność — szpieg na
`Blob.prototype.arrayBuffer` zapisuje ROZMIARY odczytów: pułapka `[]`,
odsiane żądanie `[CV_SIGNATURE_BYTES]`, przyjęte `[8, rozmiar pliku]`**;
ścieżka silnika podstawiona na `Uint8Array.prototype` i zdjęta
w `finally`, ścieżka `Buffer`; log `console.log` ze ścieżką kodowania —
bez nazwy pliku i danych kandydata; platforma bez kodowania (moduł
`mail-attachment` podmieniony `vi.doMock`) → 503 `encoder` przed
Turnstile, pozostałe formularze 200; 303 z Refererem `/praca/` bez
czytania pliku). E2E `praca` (nowy spec; treść `chromium-1920`,
formularz także `chromium-pixel-5` i `webkit-iphone-14`;
`test.skip(!SHOW_PRACA)`; teksty z `jobs-copy.ts` i `PRACA_FORM_COPY`;
endpoint i Turnstile zaślepione; **pliki = bufory budowane w teście**
przez `setInputFiles({ name, mimeType, buffer })`; `recordPosts`
zapisuje pola plikowe w `post.files` — nazwa, rozmiar, typ). Treść:
`main h1` = tytuł + akcent (druga fraza `display: block`), `id` =
`JOBS_HEADING_ID`, eyebrow; `[data-jobs-photo]` `eager`,
`fetchpriority`, wymiary, `alt`, `object-fit: cover`; surowy HTML: dwa
`link[rel=preload][as=image]` z `media` (plik `-m` poniżej
`JOBS_HERO_SMALL_BELOW_PX`), `currentSrc` przy 767 / 768 (poll); brak
`data-scroll-nav`, brak `js-motion`, zero `[data-rv]` / `[data-px]`.
Pola: kolejność `pf-name`, `pf-email`, `pf-phone`, `pf-message`,
`pf-cv`; treść z dopiskiem `FORM_COPY.optional` i bez `required`; pole
pliku — `type=file`, `name=cv`, `required`, `accept` = `cvAccept()`,
bez `multiple`, `aria-describedby="pf-cv-hint"`, **dokładnie JEDEN
`label[for="pf-cv"]`**, dopisek = `cvTypesLabel()` + `cvLimitLabel()`,
`[data-file-name]` = `idle`, input pokrywa strefę (różnica wymiarów
< 3 px, `opacity 0`, `display` ≠ `none`); `aria-labelledby` formularza
= `h1`, rola `form` z nazwą. Zgody: **dokładnie jeden checkbox —
`future`**, odznaczony, bez `required`, tekst =
`FUTURE_RECRUITMENT_CONSENT`; `[name=marketing]`,
`[name=consent_recruitment]`, `[name=consent_future]` — `toHaveCount(0)`;
nota z linkiem polityki; kolejność dzieci formularza `fm-consent`,
`fm-note`, `fm-send`, `jf-mail`. Sloty: surowy `<main>` bez adresów,
`tel:`, `mailto:`, **trzy** puste `a[data-mail="biuro"]` z
`<span data-slot>`, zero `data-tel`; po JS `a.jf-mail-a` =
`mailto:` (locator po KLASIE — w sekcji są trzy sloty adresu). Próg
1025: `expectBreakpointFlip` (`[data-jobs-row]` flex ↔ grid,
`[data-file-zone]` grid ↔ flex, `.fm-zone-drag` none ↔ block, formularz
flex ↔ grid) + geometria desktopu sub-pikselowo (trzy pola w rzędzie
równej szerokości, strefa pod telefonem, **treść i strefa tej samej
wysokości**, „Wolisz mailem?" w wierszu przycisku) i kolejność pionowa
poniżej progu. Surowy HTML: `method` / `action` /
`enctype="multipart/form-data"`, komplet `name`, `required` na imieniu
i pliku, brak `novalidate`, `<noscript>`, wszystkie komunikaty (w tym
trzy pola pliku i błąd wysyłki), limit ze stałej, potwierdzenie BEZ
`RESPONSE_TIME`, brak hosta Turnstile, brak `noindex`. Bez JS:
`.fm-nojs` widoczne, `.jf-mail` ukryte, strefa widoczna. Formularz:
pusta wysyłka → `.err` na `name`, `contact`, `cv` (nie na `cv-type`,
`cv-size`, `message`), fokus `#pf-name`; brak pliku → `cv`, fokus na
`#pf-cv`, `aria-describedby="pf-cv-hint pf-cv-err"`, opakowanie pod
paskiem i w oknie, obrys strefy w kolorze błędu (**`toHaveCSS` — kolor
ma przejście, odczyt jednorazowy trafiał w wartość pośrednią**), wybór
pliku gasi błąd; `.txt`, `.jpg` i pusty `.pdf` → `cv-type`; limit + 1 B
→ `cv-size` z `a[data-mail]` = `mailto:`, zero żądań, **plik dokładnie
limitu przechodzi**; poprawny PDF → nazwa i `formatFileSize` w strefie,
jedno żądanie, KOMPLET kluczy pól (bez `future`, bez `marketing`),
`post.files.cv` = nazwa, rozmiar, typ; potwierdzenie bez
`RESPONSE_TIME`, bez `<strong>` i bez linków; „kolejne zgłoszenie" →
`idle`, `files.length` 0; DOCX + telefon + treść + `future=1`; para
kontaktowa; **413 z zaślepki → `cv-size`**, 400 `fields: ["cv-type"]`
(sygnatura) → `cv-type`, 500 i przerwane żądanie → `[data-form-error]`
z `a[data-mail]` i BEZ `a[data-tel]`, plik zostaje w polu; upuszczenie
(tylko `chromium-1920`): `DataTransfer` budowany w stronie
(`evaluateHandle`), `dispatchEvent("dragover" / "drop", { dataTransfer
})`, `data-drag`, do pola trafia PIERWSZY z dwóch plików, błąd gaśnie,
wysyłka niesie upuszczony plik; antyspam; Turnstile po fokusie NA POLU
PLIKU; stan wysyłania (+ `requestSubmit()` w trakcie nie tworzy drugiego
żądania); `font-size` pięciu kontrolek ≥ 16 px, checkbox ≥ 24 px, strefa
i przycisk ≥ 48 px, długa nazwa nie zmienia szerokości strefy
(wielokropek, brak przewijania w bok); fokus z klawiatury → obrys
strefy (**tylko profile Chromium** — WebKit pomija w Tab kontrolki inne
niż tekstowe); zero hostów trzecich; axe w PIĘCIU stanach (wyjściowy,
błędy, za duży plik, plik wybrany, potwierdzenie — przed ostatnim
`mouse.move(0, 0)` + `settle(400)`). Visual `praca`
(`useVisualFixtureGuard`): `praca-full` (fullPage, próg 0,001),
`praca-form-errors`, `praca-form-file` (plik z bufora — nazwa i rozmiar
deterministyczne), `praca-form-done` (element `section#formularz`;
helper `shootForm`: fokus zdjęty, kursor w `0,0`, pasek fixed schowany)
× 6 profili = 24 PNG na platformę. **Dopisek limitu jest NA OBRAZIE**
(`praca-full`, `praca-form-errors`, `praca-form-file`): zmiana
`CV_MAX_BYTES` = regeneracja tych zrzutów. Zmierzone progiem 0 po
zmianie ramki i `form-ui.ts`: `kontakt-*`, `sprzedaj-*`, `oferta-*`,
`chrome-*`, `home-*`, `oferty-*` — 0 różnic; `not-found-top` różni się
na dwóch profilach desktop jak od 4.1 (pod progiem). **Porównanie HTML
„bez zmian" po modyfikacji wspólnego komponentu:** odcisk SHA na
`build:visual` z hashami nazw zasobów znormalizowanymi (hash chunku
zmienia się przy każdej zmianie modułu) — skrypt czyta `dist/`
w miejscu. **Pomiar kontrastu elementów paska nad zdjęciem** (`/praca/`,
telefon i tablet; axe tego nie liczy): metoda i liczby
w `docs/analiza-formularze-b.md` §11.2 F91 — powtórz po zmianie krycia
rozjaśnienia, zdjęcia albo jego kadru. LHCI mierzy dodatkowo `/praca/`.

STAN po Etapie 5B / PR 1 (formularz zapytania przy ofercie): unit
`contact-form` (+ rodzaj `oferta`: numer wg `OFFER_NUMBER_RE` —
normalizacja do wielkich liter, zły kształt = pole `offer` PIERWSZE na
liście; kształt obejmuje każdy numer z `data/` i fixture'u; para
kontaktowa i wiadomość jak w kontakcie; `isFormPagePath` — strony
formularzy i adresy DETALI, nic więcej, także każdy detal z danych;
**mail D**: temat = prefiks zapytania do agenta + numer, linie 1–3 tekstu
= nagłówek, adres z hosta żądania, „tytuł · lokalizacja", numer
w nagłówku HTML jako link, escapowanie wartości z indeksu, wariant
`OFFER_NOT_IN_INDEX` bez linku; dane oferty z kontekstu nie przeciekają
do maili A i B; początek maili A i B bez zmian) i `contact-endpoint`
(atrapa bindingu `ASSETS` serwująca indeks; dane SYNTETYCZNE — numer
`XX000111`): numer z indeksu → tytuł, lokalizacja i adres Z INDEKSU;
**pola `title` / `url` / `path` dosłane przez klienta nie trafiają do
maila**; numer małymi literami; numer spoza indeksu, indeks 500 /
nie-JSON / zły kształt, brak bindingu, wyjątek bindingu → 200 i mail
z dopiskiem (log bez numeru i danych klienta); wpis z adresem spoza
`/oferty/` pomijany; zły kształt numeru → 400 `fields: ["offer"]` bez
czytania indeksu; indeks czytany dopiero PO pułapce, walidacji,
sekretach, Turnstile i liczniku; **brak / nieliczbowy `Content-Length`
→ 411 i `formData()` NIE wołane** (szpieg), 413 też bez czytania;
303 z Refererem detalu wraca na TEN detal, Referer listy ofert albo obcy
→ strona kontaktu. **Pomocnik `post()` ustawia `content-length` jawnie**
(obiekt `Request` w Node nie dokłada go sam) — `null` = żądanie bez
deklaracji. E2E `oferta-zapytanie` (nowy spec; treść `chromium-1920`,
formularz także `chromium-pixel-5` i `webkit-iphone-14`; dane
produkcyjne — pierwsza oferta z `readOffersTyped()`, skip przy zerze
ofert; `useMediaStub`; endpoint i Turnstile zaślepione): formularz
w `[data-offer-inquiry]#formularz`, ramka `.fm-frame--dark`,
`aria-labelledby="od-h-contact"` i rola `form` z nazwą
`DETAIL.contactHeading`; pola ukryte = DOKŁADNIE `form` i `offer`
(= numer oferty), komplet `name` formularza (`form`, `offer`, `name`,
`email`, `phone`, `message`, `marketing`, `firma`), kolejność kontrolek
`of-name`, `of-email`, `of-phone`, `of-message`; `#of-message` =
`OFERTA_FORM_COPY.message.value` (bez numeru oferty); zgoda odznaczona
bez `required` = `MARKETING_CONSENT`, link polityki podkreślony;
kolejność dzieci `.od-contact-in`: `od-contact-col`, `od-inquiry`,
`od-back`; surowy HTML: `method` / `action`, brak `novalidate`,
`name="offer" value="{numer}"`, komunikaty w HTML, `<noscript>`, brak
hosta Turnstile, w formularzu brak `tel:` i `mailto:`; próg 1025:
`.od-contact-in` flex ↔ grid, formularz pod kartą ↔ w prawej kolumnie,
link powrotu pod formularzem ↔ pod kartą, `.fm-row2` 1 ↔ 2; bez JS
(`javaScriptEnabled: false`): `.fm-nojs` widoczne (locator po klasie).
Formularz: wysyłka bez imienia i kontaktu → `.err` na `name` i `contact`
(NIE na `message` — ma treść startową), fokus na `#of-name`,
**opakowanie pola ≥ `FORM_SCROLL_GAP_PX` pod dolną krawędzią PASKA
KOTWIC** (kotwice stoją pod nagłówkiem; helper `placeUnderBars`)
i w oknie, zero żądań; wyczyszczona wiadomość → `message`; imię +
telefon → jedno żądanie, KOMPLET kluczy żądania (nic o ofercie poza
`offer`), `message` = treść startowa, bez `marketing`; potwierdzenie
z `RESPONSE_TIME` i slotem telefonu pod paskami; „kolejna wiadomość"
przywraca treść startową (`form.reset()`); zgoda → `marketing=1`;
antyspam; Turnstile: zero skryptów po wejściu i po przewinięciu do
formularza, po focusie jeden; 400 `fields: ["email"]` → `.err`;
**400 `fields: ["offer"]` (pole bez opakowania) → `[data-form-error]`
ze slotem telefonu** — to samo przy numerze zepsutym w DOM (walidacja
kliencka, zero żądań); 500 i przerwane żądanie; stan wysyłania;
`font-size` ≥ 16 px, checkbox ≥ 24 px, przycisk ≥ 48 px; axe
`.include("[data-offer-contact]")` w trzech stanach (przed skanem
potwierdzenia `mouse.move(0, 0)` + `settle(400)`). Mobile: „Napisz"
paska → `#kontakt` pod paskami (poll); **`[data-offer-bar]` ukryty przy
fokusie w polu, w wiadomości i na przycisku wysyłki, widoczny po
przejściu fokusu na `.od-back`**. `oferta.spec`: slot telefonu sekcji to
`a.od-contact-row[data-tel]` (w sekcji są teraz też sloty komunikatów
formularza — sam `a[data-tel]` łamie tryb strict). Visual `oferta`:
cztery zrzuty pełnej strony niosą formularz (regeneracja na 6 profilach
= 24 PNG), nowe `oferta-form-errors` i `oferta-form-done` (element
`[data-offer-contact]`; `.hdr`, `[data-offer-anchors]` i `.od-bar-host`
schowane na czas zrzutu; fokus zdjęty, kursor w `0,0`) × 6 = 12 PNG na
platformę. Zmierzone progiem 0 po zmianie `forms.css` i `form-ui.ts`:
`oferta-druk`, `oferta-lightbox`, `kontakt-*`, `sprzedaj-*`, `oferty-*`,
`chrome-*` — 0 różnic (poza znanym `chrome-footer` na `webkit-iphone-14`
pod obciążeniem). **Pomiar kontrastu ciemnego wariantu** (axe nie liczy
tekstu nad zdjęciem): metoda i liczby w `docs/analiza-formularze-b.md`
§10 — powtórz po zmianie kryć, gradientu sekcji albo zdjęcia tła.

STAN po Etapie 5A / PR 2 (`/sprzedaj-z-nami/`, wariant paska nad hero na
drugiej trasie, bramka ruchu jako komponent): unit bez zmian (reguły
i mail zgłoszenia nieruchomości weszły w PR 1). E2E `sprzedaj` (treść na
`chromium-1920`; hero, kotwica, formularz i ruch także na
`chromium-pixel-5` i `webkit-iphone-14`; teksty z `sell-copy.ts`
i `SPRZEDAJ_FORM_COPY`; endpoint i Turnstile zaślepione jak w `kontakt`).
Hero: `main h1` = tytuł + akcent, eyebrow, akapit BEZ deklaracji czasu
odpowiedzi (`RESPONSE_TIME` pada tylko w potwierdzeniu), `a.sx-btn` →
`#formularz`; `[data-sell-hero]` z `data-nav-hero`, górna krawędź 0,
wysokość = okno × (`SELL_HERO_DESKTOP_RATIO` na desktopie, 1 poniżej
progu) sub-pikselowo; `[data-sell-photo]` `eager`, `fetchpriority`,
wymiary, `alt`, `opacity 1`, zero `[data-rv]` w hero; surowy HTML: dwa
`link[rel=preload][as=image]` z `media` (kadr pionowy poniżej
`SELL_HERO_TALL_BELOW_PX`), bramka `js-motion` w `<head>`; `currentSrc`
przy 767 / 768. **Kotwica:** klik przycisku hero → adres z `#formularz`,
górna krawędź `section#formularz` w odległości ≤ 1,5 px od dolnej
krawędzi paska (poll), `h2` w oknie, `.sf-head` dochodzi do `opacity 1`
— na trzech profilach, w tym WebKit. Treść: 3 kroki
(`[data-sell-steps] ol > li`, `h2` + `p`), `h2` formularza,
`aria-labelledby`. Pola: kafle `[data-f="type"] label.fm-tile` =
`ESTATE_TYPES` (wartości `2, 1, 3, 4`, etykiety, `radio`, `required`,
nic nie zaznaczone), `[data-f="transaction"]` = `TRANSACTIONS`
(`131`, `132`), `fieldset > legend`; kolejność WSZYSTKICH kontrolek po
id (`sf-type-*`, `sf-transaction-*`, `sf-name`, `sf-email`, `sf-phone`,
`sf-location`, `sf-area`, `sf-price`, `sf-notes` — bez „liczby pokoi");
`[data-sell-details]` bez `open`, `summary` = nagłówek + dopisek, pola
bloku bez dopisku i bez `required`, `inputmode` decimal / numeric,
podpowiedź ceny w `aria-describedby`; zgoda odznaczona i bez `required`;
kolejność zgoda → nota → przycisk → `.sf-call`. Sloty: surowy `<main>`
bez telefonu, maila, `tel:`, `mailto:`; DWIE puste kotwice
z `<span data-slot>` (błąd wysyłki, „Wolisz przez telefon?"). Próg 1025:
`expectBreakpointFlip` (`.ss-list` flex ↔ grid, `.ss-body` flex ↔
contents) + liczba rzędów kafli (typ 2 ↔ 1), kolumny `.fm-row2` 1 ↔ 2
i `.fm-row3` 1 ↔ 3, `--sh-r` 1 ↔ 0,66 (**czytaj `parseFloat` —
minifikator zapisuje `.66`**). Surowy HTML: `method`/`action`, komplet
`name`, `required` na radio i imieniu, brak `novalidate`, `<details>`
bez `open`, `<noscript>`, wszystkie komunikaty błędów, brak hosta
Turnstile. Bez JS: brak `js-motion`, każdy `[data-rv]` `opacity 1`,
`.fm-nojs` widoczne, `.sf-call` ukryte, `<details>` rozwija się
natywnie, `.hdr-bg` `opacity 1`. Formularz: pusta wysyłka → `.err` na
`type`, `transaction`, `name`, `contact` (nie na `email`, `phone`,
`area`, `price`), blok opcjonalny zostaje zwinięty, fokus na
`#sf-type-2`, `aria-describedby` = `sf-type-err` tylko przy błędzie,
fieldset ≥ `FORM_SCROLL_GAP_PX` pod paskiem i w oknie, zero żądań, wybór
kafla gasi błąd grupy; **błąd w ZWINIĘTYM bloku** (pola wypełnione, blok
zamknięty z powrotem) → `details[open]`, `.err` na `area` i `price`,
fokus na `#sf-area` pod paskiem, `aria-describedby` ceny = podpowiedź +
komunikat; minimum (typ, transakcja, imię, telefon) → jedno żądanie
(`form=sprzedaj`, `type`, `transaction`, puste pola opcjonalne, bez
`marketing`), potwierdzenie z `RESPONSE_TIME` i BEZ `a[data-tel]`,
„kolejne zgłoszenie" → nic nie zaznaczone; komplet + zgoda → żądanie
niesie `location`, `area`, `price`, `notes`, `marketing=1`; antyspam;
Turnstile po focusie na KAFLU; 400 z `fields: ["price"]` otwiera blok,
500 → `[data-form-error]` ze slotem; `font-size` kontrolek TEKSTOWYCH
≥ 16 px (selektor bez radio — radio dziedziczy rozmiar etykiety kafla),
kafle i `summary` ≥ 48 px, checkbox ≥ 24 px; zero hostów trzecich po
`revealSweep`; axe po `revealSweep` w trzech stanach (wyjściowy; błędy
z rozwiniętym blokiem; potwierdzenie — **przed skanem potwierdzenia
`page.mouse.move(0, 0)` + `settle(400)`**: przycisk „kolejne zgłoszenie"
ląduje pod kursorem zostawionym na przycisku wysyłki i axe trafiał
w środek przejścia hover, czyli w kolory pośrednie; czerwony tylko pod
obciążeniem, 1 na kilka przebiegów). Ruch: `js-motion`, `data-motion`,
`.sf-head[data-rv]` `opacity 0` → `.is-in` (kroki na szerokim ekranie
widać od razu — blokiem „spod zgięcia" jest nagłówek formularza), żaden
`[data-rv]` nie jest linkiem, przyciskiem, polem ani etykietą; **sonda
parallaxu hero**: zapas ≥ `PX_AMT_*` × wysokość kadru, przesunięcie
wpisane przez moduł przy scrollu 0 = wzór (± 0,2 px) ORAZ pozycja
startowa z CSS (po zdjęciu stylu inline) = wzór (± 1 px), obraz zakrywa
kadr w sześciu pozycjach; **PUNKTOWA emulacja `reduce` z komentarzem**
(trzeci dozwolony wyjątek): brak `js-motion`, treść widoczna,
`[data-px]` `transform: none`, formularz uzbrojony (`novalidate`);
scroll natywny. `navigation`: wariant „nad hero" na `/sprzedaj-z-nami/`
— przezroczysty na górze, stan pośredni w połowie drogi, `data-solid`
przy `hero − pasek` (na desktopie pozycja, w której wzór z wysokości
OKNA dawałby jeszcze stan pośredni — asercja odróżnia wzory); surowy
HTML ośmiu tras: `data-scroll-nav` ma wyłącznie „/" i `/sprzedaj-z-nami/`.
Visual `sprzedaj` (`useVisualFixtureGuard`): `sprzedaj-top` (okno
startowe), `sprzedaj-full` (fullPage po `revealSweep`, `<details>`
otwarte przez `open = true` PRZED przejazdem, próg 0,001),
`sprzedaj-form-errors` i `sprzedaj-form-done` (element
`section#formularz` po `revealSweep`; pasek fixed schowany) × 6 profili
= 24 PNG na platformę. Zrzuty chrome'u zmierzone progiem 0 po zmianie
paska: `chrome-bar`, `chrome-sheet`, `chrome-home-top`,
`chrome-home-solid`, `chrome-footer` — 0 różnic (bez regeneracji).
**Znana niestabilność (stan zastany, także na main):** `chrome-footer`
na `webkit-iphone-14` pod obciążeniem równoległym bywa czerwony w ok.
1 na 10 przebiegów — WebKit rysuje wtedy logo stopki w niższej jakości
skalowania (różnica wyłącznie w prostokącie logo, 225 px wg Playwrighta);
w izolacji zielony. Czerwony `chrome-footer` bez zmiany stopki = powtórz
spec w izolacji, zanim uznasz to za regres. LHCI mierzy dodatkowo
`/sprzedaj-z-nami/`.

STAN po Etapie 5A / PR 1 (wspólna mechanika formularzy + `/kontakt/`):
unit `contact-form` (PRZEPISANY: rodzaje formularzy; `isBotTrap`;
`validateForm` per formularz — dwa osobne pola kontaktowe, błąd pary
`contact` vs błędy pól, kolejność pól w odpowiedzi, zgoda domyślnie
„nie"; zgłoszenie nieruchomości: słowniki 1–4 i 131/132, `0` = nie
wybrano, pola opcjonalne, powierzchnia i cena jako liczby; `parseArea`,
`parsePrice`, `formatMailPrice`; mail A i **mail B niesie powierzchnię
i cenę**; temat stały; kolejność etykiet; stopka z hosta żądania;
adresat, nadawca, brak potwierdzenia do nadawcy) i NOWY
`contact-endpoint` (funkcja `onRequest` wołana wprost; `fetch` =
atrapa Turnstile i Resend, KV = atrapa w pamięci, sekrety sztuczne):
405, 413 po nagłówku, nieznany `form` → 400, pułapka → 200 i zero
żądań (także bez sekretów), walidacja → 400 z `fields`, brak sekretów →
503, Turnstile 403 / 502, limit → 503, Resend → 502 (log bez sekretu
i bez danych klienta), sukces: `from` = `send.`, `to`, `reply_to` tylko
przy e-mailu, `X-Entity-Ref-ID`, `KONTAKT_TO`, POST bez JS → 303 na
stronę formularza (Referer tylko własny). E2E `kontakt` (treść na
`chromium-1920`; formularz także `chromium-pixel-5` i
`webkit-iphone-14`; teksty z `forms-copy.ts` i `contact-copy.ts`).
**Lokalny preview nie ma funkcji — endpoint i skrypt Turnstile są
ZAWSZE zaślepione** helperami `tests/helpers/forms.ts`: `stubEndpoint`
(odpowiedź albo funkcja trzymająca odpowiedź; licznik żądań),
`recordPosts` + `readPosts` (pola wysłanego formularza zapisywane po
stronie strony przez podmianę `fetch` — wołać PRZED nawigacją),
`stubTurnstile("ok" | "blocked")` (atrapa `window.turnstile`, licznik
żądań do hosta), `installClock` + `passFillTime` (`page.clock`:
deterministyczny czas wypełnienia bez czekania 4 s). Kontrakty: wstęp
(`main h1`, eyebrow, `section#formularz h2`); mapa —
`<source media="(min-width: 600px)">`, wymiary obu plików, na sześciu
szerokościach (1920, 1025, 900, 600, 599, 390): `currentSrc` wg progu,
proporcje obrazu na ekranie = proporcje pliku (sub-pikselowo),
`object-fit` ≠ `cover`, promień mapy 0, karta `[data-contact-card]`
zaczyna się nie wyżej niż dół obrazu; sloty — surowy `<main>` bez
telefonu, maila, `tel:`, `mailto:`, cztery puste kotwice z
`<span data-slot>`, po JS `tel:` / `mailto:`; pola — `label[for]`,
`autocomplete`, kolejność `kf-name`, `kf-email`, `kf-phone`,
`kf-message`, checkbox zgody odznaczony i bez `required`, kolejność
zgoda → nota → przycisk, link polityki podkreślony i < 400, honeypot
`readonly` + `tabindex="-1"` + poza `display:none`; próg 1025
(`[data-contact-grid]` block/grid, `.ki-sub` contents/grid, `.fm-row2`
1 ↔ 2 kolumny); surowy HTML: `method="post"`, `action`, `required`,
brak `novalidate`, `<noscript>`, komunikaty błędów w HTML, brak hosta
Turnstile; bez JS (`javaScriptEnabled: false`): formularz widoczny,
`.fm-nojs` i `.ki-nojs` widoczne (**locator po klasie — silnik tekstowy
Playwrighta pomija `<noscript>`**), wiersze slotów ukryte. Formularz:
pusta wysyłka → `.err` na `name`, `contact`, `message` (nie na `email`
/ `phone`), komunikaty `> [data-msg]`, fokus na pierwszym polu, którego
opakowanie stoi ≥ `FORM_SCROLL_GAP_PX` pod paskiem i mieści się w oknie
(dosuwa skrypt — WebKit na Linuksie zostawiał pole pod paskiem, czerwony
`e2e` na PR #25), `aria-invalid`, `aria-describedby` z id
komunikatu TYLKO przy błędzie, zero żądań, pisanie gasi błąd (pole
pary gasi błąd pary); błędny e-mail / telefon → błąd pola; sam e-mail
→ jedno żądanie (`accept: application/json`, `form`, pola, `elapsed`
≥ `MIN_FILL_MS`, token z atrapy, BEZ `marketing`), `[data-form-done]`
w miejscu formularza, fokus na `[data-done-h]`, slot telefonu,
`[data-form-again]` → pusty formularz; sam telefon + zgoda →
`marketing=1`; antyspam: wysyłka przed czasem i wypełniony honeypot →
potwierdzenie i ZERO żądań; Turnstile: zero elementów `<script>`
i zero żądań przed focusem (także po przewinięciu), po focusie
dokładnie jeden; skrypt zablokowany → pusty token → 403 z zaślepki →
`[data-form-error]` (`role="alert"`, slot telefonu), pola zachowane;
400 z `fields` → `.err` + fokus; 500 i przerwane żądanie → błąd; stan
wysyłania (`disabled`, `aria-busy`, etykieta z `data-sending`);
`font-size` pól ≥ 16 px, checkbox ≥ 24 px; zero hostów trzecich; axe
w trzech stanach (wyjściowy, błędy, potwierdzenie). `smoke`: sonda
produkcyjna wysyła `form=kontakt` i nagłówek
`accept: application/json` (bez niego funkcja odpowiada 303). Visual `kontakt`
(`useVisualFixtureGuard`): `kontakt-full` (fullPage, próg 0,001),
`kontakt-form-errors` i `kontakt-form-done` (element
`section#formularz`; pasek fixed schowany na czas zrzutu elementu —
zszywany zrzut łapałby go na mobile; potwierdzenie bez sieci) × 6
profili = 18 PNG na platformę. `chrome.spec`: `chrome-footer` przypina
`main` do stałej wysokości na czas zrzutu (ułamkowa wysokość treści nad
stopką przesuwała zaokrąglenie zrzutu o piksel przy KAŻDEJ zmianie
widoku `/kontakt/`); `chrome-sheet` niesie treść `/kontakt/` pod
scrimem — rozjeżdża się przy zmianie widoku (zamierzone). LHCI mierzy
dodatkowo `/kontakt/`.

STAN po Etapie 4.4 (strona główna): unit `home-offers`
(`pickHomeOffers`: tylko `aktywna`, od najnowszej, bez dopełniania, zero
i limit; fixture ze skipem). E2E `home` (treść na `chromium-1920`;
układ, hero i ruch także na `chromium-pixel-5` i `webkit-iphone-14`;
`useMediaStub`; teksty z `home-copy.ts`): hero — `main h1` =
`HOME_COPY.hero.heading`, wysokość hero = `innerHeight` (sub-pikselowo),
`[data-hero-photo]` z `eager`, `fetchpriority`, wymiarami, `opacity 1` i
BEZ przodka `[data-rv]`; surowy HTML: dwa `link[rel=preload][as=image]`
z `media` (kadr pionowy poniżej `HOME_POSTER_TALL_BELOW_PX`), `<video>`
z `muted`, `playsinline`, `preload="none"`, `data-state="idle"`, bez
`autoplay` i `poster`, `<source>` MP4 → WebM z adresami w `data-src`
i BEZ `src` (WebKit na Linuksie pobierał źródło mimo `preload="none"` —
czerwony `e2e` na PR #24, lokalnie na macOS zielony), bramka `js-motion` w
`<head>`; desktop: `video[data-state]` → `playing` (Chromium Playwrighta
gra WebM — nie ma H.264), po `dispatchEvent(new Event("ended"))` →
`photo` i `opacity 0`; zwężenie okna poniżej 1025 w trakcie filmu →
`photo`; mobile: zero żądań `/video/`, stan `idle`, `currentSrc` = kadr
pionowy; **PUNKTOWA emulacja `reducedMotion: "reduce"` z komentarzem**
(drugi dozwolony wyjątek obok liter paska): brak `js-motion`, brak żądań
wideo, bloki spod zgięcia `opacity 1`, `[data-px]` i `[data-hero-zoom]`
z `transform: none`; bez JS: to samo, a do tego sloty ukryte i przycisk
do `/kontakt/`. Sekcje: `h2` = tytuł i akcent z `home-copy`, eyebrow,
CTA `a.sx-btn` → trasa, `aria-labelledby`; 3 kafle usług z `href` z
`home-copy`, 4 kroki; każdy link wewnętrzny < 400 (kotwice usług — liczy
się trasa). Kafle: `[data-home-offer]` w kolejności
`sortEntries(pickOffers({status:"aktywna"}).map(toIndexEntry),"newest")`
obciętej do `HOME_OFFERS_MAX`, `data-count`, treść z `format.ts` i
`offers-ui.ts`, `img.ht-img` = wariant `card` z wymiarami i `lazy`,
„Nowość" ⇔ `isNewOffer` względem `[data-home="oferty"][data-build-now]`,
`<source>` z `hero 2x` TYLKO na dużym kaflu pełnej trójki; zero
aktywnych = wariant bez `[data-home-offers]` (bez skipa); mobile:
karuzela (`overflow-x: auto`, `scroll-snap-stop: always`, brak
przewijania strony w bok; skip poniżej 2 kafli). Sloty: surowy `<main>`
bez telefonu, maila, `tel:` i `mailto:`; dwie kotwice `hidden` z
`<span data-slot>`; po JS `tel:` i `mailto:`. Progi:
`expectBreakpointFlip(1025)` na 9–10 elementach oraz kadr plakatu przy
767/768. Ruch: `html.js-motion` i `data-motion`, blok spod zgięcia
`opacity 0` → `.is-in`; **sonda parallaxu** — dla każdego `[data-px]`
zapas (połowa różnicy wysokości obrazu i kadru) ≥ `PX_AMT_*` × wysokość
kadru, a w sześciu pozycjach scrolla obraz zakrywa cały kadr; zoom:
`scale > 1,1` po pół ekranu, `h1` gaśnie, powrót = 1; scroll natywny
(`scrollTo` synchroniczne, bez blokady dokumentu); zero hostów trzecich
po `revealSweep`; axe PO `revealSweep` (reveale chowają treść spod
zgięcia — bez przejazdu axe by ją pominął; `a11y.spec` skanuje „/" bez
przejazdu, więc ten test jest właściwą bramką strony głównej). Visual
`home` (fixture, `useVisualFixtureGuard`): `home-top` (okno startowe) i
`home-full` (fullPage po `revealSweep`, próg 0,001) × 6 profili = 12 PNG
na platformę; **film hero odcinany przez `blockHeroVideo(page)`
(`tests/helpers/visual.ts`, `page.route` z przerwaniem żądań do katalogu `/video/`) zamiast
maski** — film leży pod treścią hero i maska zakryłaby cały pierwszy
ekran; odcięcie daje stan „zdjęcie" (spec asertuje, że `data-state` nie
jest `playing`). To samo w `chrome.spec` dla `chrome-home-top` i
`chrome-home-solid` (zrzuty paska niosą hero — zregenerowane w 4.4; z
`chrome-home-solid` zeszło dosztukowanie `main`). `revealSweep` zna
selektor `html.js-motion [data-rv]:not(.is-in)` (W PARZE z
`content-motion.ts`). `navigation` i `smoke` dostały `useMediaStub()`
(„/" niesie kafle ofert z hosta mediów).

STAN po Etapie 4.3 (b) (lightbox, druk, 404 świadoma ofert): e2e
`oferta` z blokiem „lightbox i druk" (chromium-1920; dane produkcyjne,
`pickOffer` z `where` po liczbie zdjęć `photo` i `test.skip`): przed
otwarciem `#of-lightbox` NIE istnieje i chunk `offer-lightbox` nie jest
pobrany; kafel `.od-tile[data-gal-open]` otwiera od wskazanego kadru
(`role=dialog`, `aria-modal`, nazwa dostępna = `DETAIL.galleryTitle`,
`data-overlay-kind="modal"`), `[data-lb-count]`, tor `[data-lb-track]` =
adresy `hero` z galerii w tej samej kolejności, `width`/`alt`, bieżący
kadr i sąsiedzi `eager`, reszta `lazy`, `object-fit: contain`,
`scroll-snap-stop: always`; ←/→ i `[data-lb-prev]`/`[data-lb-next]` bez
zapętlenia, `disabled` na krańcach, fokus wyłączanej strzałki przechodzi
na drugą; Esc zamyka → `[data-gal-count]`, pozycja toru hero i
`aria-current` miniatury = kadr oglądany; miniatura, „Wszystkie zdjęcia"
(`[data-gal-all]`), kadr hero, rzut (skip bez `withPlan`); X
`[data-overlay-close]`; stopka: `a[data-tel]` = `buildPhoneHref()`,
`[data-lb-write]` zamyka i `#kontakt` ląduje w oknie (poll —
przewinięcie po odblokowaniu scrolla); próg: `setViewportSize(1024)`
zamyka i daje `sheet`, `1025` zamyka i daje `modal`, ‹ › ukryte poniżej
progu; axe `.include("#of-lightbox")` po `LB_IN_MS` (600 ms). Mobile
(`pixel-5`, `iphone-14`): tap w kadr hero (`position` w górnej części —
dół przykrywa nagłówek) → sheet, `body{position:fixed; top:-60px}`,
swipe-down myszą za `[data-overlay-drag]` → powrót `scrollY`; licznik
nadąża za `scrollBy` toru; X / Esc / klik w scrim (`position` 10×6 — pas
nad sheetem); focus-trap Tab ×6 (**skip WebKit**);
`setViewportSize(1025)` domyka; axe i zero hostów trzecich. Druk:
`page.emulateMedia({ media: "print" })` → `header.hdr`, `footer.ft`,
okruszki, kotwice, panel, pasek, przyciski, `.od-share`, `.od-thumbs`,
film/spacer `toBeHidden`; `[data-offer-rows]` widoczne, pierwszy kadr
widoczny / drugi ukryty, `[data-offer-print-photos] img` = `card`
kolejnych zdjęć (`OFFER_PRINT_PHOTOS`), opis `max-height: none` oraz
`overflow: visible`, `[data-offer-print-links]` z adresem spaceru i
filmu, `[data-offer-print-foot]` = „host · numer"; „Drukuj / PDF":
`window.print` wołane PO wczytaniu obrazów arkusza (`expect.poll`; miarą
jest `img.complete`, nie `naturalWidth` — zaślepka mediów nie ma
wymiarów). **Zmiana względem (a):** miniatura otwiera lightbox, nie
przewija hero. E2E `not-found` (z `useMediaStub`):
`/oferty/x/y/sw000000/`, `/sw000000`, `/SW000000/` → 404, surowy HTML z
`data-nf-generic` i `template[data-nf-tpl]`; z JS `[data-nf-offer]`
widoczny, `[data-nf-generic]` nieobecny, JEDEN `h1` =
`DETAIL.nfHeading`, tytuł, noindex bez canonicala, `[data-nf-link]` →
`/oferty/`, karty `[data-nf-cards] [data-offer-card]` =
`sortEntries(aktywne, "newest").slice(0, 3)` z helpera (zero aktywnych =
`DETAIL.nfTextEmpty` bez siatki — bez skipa), wszystkie linki 200; adres
spoza ofert → komunikat generyczny i zero żądań do hosta mediów; skrypty
strony bez wyspy i skryptów widoku; axe WCAG 2 A/AA całej strony; bez JS
pod adresem oferty komunikat generyczny (jeden `h1`, zero kart). Visual:
`oferta` zyskuje `oferta-lightbox` (zrzut okna po kliknięciu miniatury Z
JS — bez przewijania strony, `settleImages` i `settle(300)`; 6 profili),
`oferta-druk` (fullPage, `emulateMedia print`, viewport 794×1123 = A4,
tylko `chromium-1920`); `not-found` zyskuje `not-found-offer` (fullPage
pod `/oferty/mieszkanie-na-sprzedaz/poznan/sw000000/`, 6 profili; spec
stoi teraz na `useVisualFixtureGuard`) — razem 13 nowych PNG na
platformę. Generyczne `not-found-top` / `not-found-full` zmierzone
progiem 0: `full` identyczne na 6 profilach, `top` różni się jak przed
zmianą (ok. 830–880 px na 1920/firefox, pod progiem — stan z 4.1) → bez
regeneracji.

STAN po Etapie 4.3 (a) (detal oferty): unit — `offers-details-rows`
(19 wierszy designu + parytet domu + „Dostępne od"; parter, winda
brak/0/2, czynsz 0, „Zapytaj o cenę", `showPrice=false`, obniżka +
Omnibus, dom/działka, podtyp, fixture bez pustych wartości),
`offers-detail-meta` (tytuł, `cutAtSentence`, tekst bez HTML, fallback,
fixture ≤ 160), `jsonld` (+ `realEstateListing`: bez kontaktu/`geo`,
adres do ulicy, cena pominięta przy `null`, `floorSize`, `image`),
`offers-format` (+ `formatDateShort`, `countNoun`). E2E `oferta`
(treść na `chromium-1920`; gesty i pasek dolny na `chromium-pixel-5`
i `webkit-iphone-14`; dane produkcyjne, `pickOffer` + `test.skip`,
`useMediaStub`, mapy przez `readMapsTyped()`): nagłówek (tytuł,
kicker, lokalizacja → `listPath`, cena, kontrakty szkieletu), plakietki
statusu, „Zapytaj o cenę", obniżka, galeria (wszystkie zdjęcia `hero`,
`eager`/`lazy`, `width/height/alt`, licznik, ‹ ›, klawiatura, miniatura
→ snap; pion `contain` + `.od-blur`), rzuty, kotwice (zestaw warunkowy,
klik pod paski, `aria-current`), tabela = `detailRows()`, parter/winda,
opis (bez `<script>`, surowy HTML bez `data-collapsed`, „Czytaj więcej"
rozwija), film i spacer (0 `iframe` przed kliknięciem, link w `href`,
po kliknięciu DOKŁADNIE jeden `iframe` bez `microphone`; host osadzenia
zaślepiony `page.route`, nasłuch hostów), mapa (adres R2, wymiary,
naturalne proporcje, link do map, brak przycisku interaktywnego),
kontakt (surowy HTML bez kontaktów po wycięciu `.od-desc`, sloty po JS,
`[data-offer-inquiry]` puste, powrót do listy), panel (sticky, slot,
flip 1025: panel none/flex, pasek grid/none, kafle none/grid), meta
(schowek przez `grantPermissions`, „Dodano", sharery z absolutnym
adresem, `navigator.share` ↔ ikony), `window.print`, head (description,
canonical, `og:image` 1200×630, JSON-LD jeden węzeł bez kontaktu),
okruszki, zero podmiotów trzecich; mobile: nagłówek w obrębie hero,
pasek dolny przy dolnej krawędzi i znika na stopce, snap o jeden kadr.
Visual `oferta` (fixture): `oferta-mieszkanie` (SW486462), `oferta-dom`
(SW349452), `oferta-dzialka` (SW184702), `oferta-lokal` (SW372150) —
4 fullPage × 6 profili = 24 PNG na platformę; `chrome`, `oferty`
i `not-found` bez ruchu. LHCI mierzy dodatkowo 4 adresy detali
z fixture'u. `a11y` i `seo` na pierwszym detalu z `data/` — bez zmian
speców (allowlista PUSTA).

STAN po Etapie 4.2 (c) (mobile, sheety, siatka/lista, stany brzegowe):
e2e `oferty-mobile` (profile `chromium-pixel-5` i `webkit-iphone-14`,
tablet przez `setViewportSize(900)`; dane produkcyjne, oczekiwania
`runSearch` na `/oferty/index.json`): pasek narzędzi `[data-offers-mtools]`
widoczny < 1025, `[data-offers-panel]` NIEOBECNY, `nav.ol-nav` w DOM
i ukryta, powłok sheetów brak do pierwszego otwarcia; „Filtruj"
`[data-offers-filters]` → `#ol-sheet-filters` (`role=dialog`, `h2`,
`.op--sheet`, dokładnie jeden `[data-offers-panel]`), zamknięcie X
(`[data-overlay-close]`), Esc, scrim (`click` 10×10), swipe-down myszą za
`[data-overlay-drag]` (po `SHEET_IN_MS` = 600 ms wjazdu); blokada
scrolla (`body{position:fixed; top:-60px}` → powrót `scrollY`; strona
przewinięta tylko o 60 px, żeby klik w „Filtruj" nie przewijał); focus-trap
(Tab ×6 w dialogu; **skip na WebKit** — Tab pomija przyciski); „Pokaż"
z sheetu = `applyFilters` + adres + lista + sheet zamknięty, draft wspólny
po ponownym otwarciu, „Wyczyść" zostawia sheet (R30); „Więcej filtrów"
z podpowiedzią `PANEL.moreHint`, akcje tylko w `.ols-foot`; sheet
sortowania `[data-sort-option]` + `[data-offers-sort-apply]` (adres,
`[data-sort-current]`, `sortEntries`) vs Esc porzuca; `setViewportSize(1025)`
domyka sheet, zdejmuje `position:fixed`, przywraca `.op:not(.op--sheet)`;
flip 1025 (`expectBreakpointFlip` z `ABSENT`: mtools grid/none, `.op`
absent/block, `.ol-dtools` none/flex, `.ol-sort` none/block); tablet
900 px (`.oc-link` row + sheet); pigułki statusu i paginacja (skip ≤ 12);
surowy HTML (`data-offers-mtools`, `<noscript>` z `.ol-mtools` i `.ol-nav`,
bez `ol-sheet-*`); zero żądań trzecich po interakcjach; axe bez sheetu
oraz `.include(#ol-sheet-…)` po wjeździe. `oferty-wyspa` (1920): +
przełącznik siatka/lista (`[data-view-set]`, `data-view` na siatce,
kolumny 3 ↔ 1, `.oc-link` column ↔ row, adres nietknięty), stany
brzegowe (`?typ=zamek` / `?transakcja=darowizna` → `[data-offers-invalid]`
z linkiem `/oferty/`; `?strona=-1|abc|0` → strona 1; `page.route` abort
`index.json` → na liście rodzaju „Wszystkie" typy → `[data-offers-apply]`
= „Pokaż" bez liczby → błąd `[data-offers-error]` → `unroute` + `Ponów`
→ lista; abort `index-text.json` przy `?opis=` → błąd, ponowienie
z bramkowaną odpowiedzią → `#op-opis[aria-busy]` + `#op-opis-hint`
→ lista); kolejność DOM bez panelu na 390 px; flip progu z paskiem
narzędzi. `oferty.spec`: nawigacja (a) `toBeAttached` + `toBeHidden` po
obu stronach progu, `class="ol-nav"` i reguła `.ol-nav` w `<noscript>`
surowego HTML. Visual `oferty` (+4): `oferty-tools-mobile` (element
`.ol-tools`, tylko < 1025), `oferty-sheet-filtry` i `oferty-sheet-sortuj`
(zrzut strony z otwartym sheetem po `settle(300)`, tylko < 1025),
`oferty-list-view-list` (fullPage po `[data-view-set="list"]`, tylko
≥ 1025) = 42 PNG na platformę (48 po przebudowie fixture'u);
`oferty-list`, `oferty-list-location`, `oferty-list-filtered`,
`oferty-zero` rozjechały się na WSZYSTKICH profilach (pasek narzędzi /
przełącznik widoku) — regeneracja w PR (c).

STAN po Etapie 4.2 (b) (wyspa wyszukiwarki): unit — `offers-filters`
(+ `locationSlug` dokładny vs `?lokalizacja=` prefiks, pusty `status=`
przeżywa serializację, `targetPath`: liść z listą → ścieżka slugu,
miejscowość z dzielnicami → parametr, slug bez listy nowego rodzaju → id
węzła), `offers-format` (+ `formatShowCount` biernik),
`offers-locations-ui` (podpowiedzi: prefiks słowa, diakrytyki, poziomy
miejscowość/dzielnica/poddzielnica, `info`, liść, ulice pod węzłem; fixture
ze skipem); e2e `oferty-wyspa` (chromium-1920, dane produkcyjne,
oczekiwania = `runSearch` na pobranym `/oferty/index.json` +
`index-text.json`): hydratacja bez przerenderowania (MutationObserver
uzbrajany po `readyState === "interactive"` → zero mutacji w
`[data-offers-grid]`) i CLS < 0,05; 23 kombinacje parametrów adresu =
`runSearch` (widoczne karty `li:not([hidden])`, `[data-offers-count]`,
liczniki `[data-status-group] small`); lista SSG z lokalizacją po
hydratacji = zbiór SSG + chip; panel: pigułka typu → licznik
`[data-offers-apply]` = `formatShowCount` → „Pokaż" → `?typ=`; segment
transakcji → ścieżka SSG; autocomplete (`#op-loc`, `role=option`) → chip
`[data-offers-chips]` → adres z `targetPath`; cena + Enter → parametr;
odświeżenie odtwarza kontrolki; wstecz/dalej; „Wyczyść" → `/oferty/`;
„Więcej filtrów" (`[data-offers-more]`, `#op-more`): pokoje, winda,
zależność pól od typu (działka: brak `#op-pok-l`/`#op-winda-l`), ulica
`#op-ulica` disabled bez lokalizacji; pigułki statusu → `?status=`,
wszystkie wyłączone → `[data-offers-zero]`; sortowanie: 4 klucze =
`sortEntries`, listbox `.ol-sort-btn` + `[role=option]` z klawiatury
(Enter, ↓, Enter, Esc, fokus wraca); paginacja (skip ≤ 12)
`[data-offers-pagination]`: 12 widocznych, `li[hidden]`, `?strona=2`,
`aria-disabled`, poza zakresem `[data-offers-page-empty]`; zero wyników
(`ZERO_RESULTS`); surowy HTML (`data-offers-panel`, `<li hidden` od 13.,
`<noscript><style>`, `client="load"`); próg 1025 `.ol-nav` ↔ `.op` +
`.ol-sort` (`expectBreakpointFlip`); zero żądań do podmiotów trzecich po
interakcjach; axe z rozwiniętym panelem, podpowiedziami i listboxem.
`oferty.spec` zaadaptowany (nawigacja (a) w DOM, widoczna < 1025;
plakietki kart spoza pierwszej strony `toHaveCount`, nie `toBeVisible`).
Visual `oferty` (+4 zrzuty, 1 warunkowy): `oferty-panel` i
`oferty-panel-more` (element `[data-offers-panel]`, tylko profile ≥ 1025 —
mobile `test.skip`), `oferty-list-filtered` (fullPage `?cena-od=500000`),
`oferty-zero` (fullPage `?numer=SW000000`), `oferty-pagination` (fullPage
`?strona=2`, skip dopóki fixture ≤ 12 ofert) = 36 PNG na platformę
(42 po przebudowie fixture'u). Wyspa hydratuje się `client:load` na
markupie SSR — w testach wizualnych skeleton NIE występuje (stan z propsów).
**Uwaga do hydratacji w JSX:** dwa sąsiednie teksty (`{a} <b>`) parser
HTML scala w jeden węzeł, a Preact rozdziela → mutacje DOM; w kartach
i wyspie teksty z odstępem pisz jednym wyrażeniem (`{`${a} `}`).

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

| Zmiana                                                                                                                                                                                                                        | Warstwa (komenda)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `scripts/sync/**`, `src/lib/offers/**` (allow-lista, schemat, parser)                                                                                                                                                         | `pnpm test:unit` (kontrakt danych)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| `src/lib/img.ts`, `MEDIA_BASE`, `IMG_VARIANTS`                                                                                                                                                                                | `pnpm test:unit` (`img`, `media-r2`)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| `src/lib/offers/data.ts`, `redirects.ts`, integracje, `[...path].astro`                                                                                                                                                       | `pnpm test:unit && pnpm build && pnpm test:dist`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| `scripts/sync/pipeline.ts`, `index.ts`, `fixtures.ts`, `sync.yml`                                                                                                                                                             | `pnpm test:unit` (`sync-index`, `sync-fixtures`); workflow NIE uruchamiać w sesji                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| `src/i18n/**`, `src/lib/*.ts` (img, routes, contact-form, jsonld, …)                                                                                                                                                          | `pnpm test:unit`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| `scripts/subset-fonts.mjs`, `src/styles/fonts.css`                                                                                                                                                                            | `pnpm test:unit` (kontrakt subsetów)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| `src/scripts/**`, navbar, stopka, wyszukiwarka, galeria, formularze                                                                                                                                                           | `pnpm build && pnpm test:e2e`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| `src/lib/offers/{filters,index-entry,location-path,locations-ui,offers-ui,text,enums}.ts`, `src/components/offers/**` (w tym wyspa `SearchIsland.tsx`, sheety `sheets.tsx`), `src/pages/oferty/**`                            | `pnpm test:unit && pnpm build && pnpm test:dist && pnpm test:e2e` (+ warstwa wizualna przy zmianie wyglądu; po zmianie wyspy także pomiar budżetu — `docs/analiza-oferty.md` §12.5; sheety = profile mobilne `oferty-mobile`)                                                                                                                                                                                                                                                                                                                                             |
| `src/lib/offers/{details-rows,detail-meta}.ts`, `src/lib/jsonld.ts`, `src/components/offers/{OfferDetailPage,LightboxShell}.astro`, `offer-detail.css`, `src/scripts/{offer-detail,offer-lightbox}.ts`, `src/pages/404.astro` | `pnpm test:unit && pnpm build && pnpm test:e2e tests/e2e/oferta.spec.ts tests/e2e/not-found.spec.ts tests/e2e/a11y.spec.ts tests/e2e/seo.spec.ts` (+ `build:visual && test:visual tests/visual/oferta.spec.ts tests/visual/not-found.spec.ts` przy zmianie wyglądu; budżet `script` detalu i chunk lightboxa — `docs/analiza-oferta.md` §5 i §11)                                                                                                                                                                                                                         |
| `src/lib/contact-form.ts`, `src/lib/cv-file.ts`, `src/lib/mail-attachment.ts`, `functions/api/**`, `src/components/forms/**`, `src/components/sections/contact/**`, `src/pages/kontakt.astro`                                 | `pnpm test:unit && pnpm build && pnpm test:e2e tests/e2e/kontakt.spec.ts tests/e2e/sprzedaj.spec.ts tests/e2e/oferta-zapytanie.spec.ts tests/e2e/praca.spec.ts tests/e2e/a11y.spec.ts tests/e2e/navigation.spec.ts` (+ `build:visual && test:visual tests/visual/kontakt.spec.ts tests/visual/chrome.spec.ts` przy zmianie wyglądu — `chrome.spec` stoi na `/kontakt/`; zmiana `FormFrame.astro` = porównanie HTML wszystkich formularzy odciskiem i pomiar `script` na trasach z formularzem); endpoint i Turnstile tylko jako atrapy, NIC nie wysyłać na skrzynkę biura |
| `src/components/offers/OfferInquiry.astro`, sekcja kontaktu w `OfferDetailPage.astro` / `offer-detail.css`, wariant ciemny w `forms.css`, `lookupOffer` w `functions/api/kontakt.ts`                                          | `pnpm test:unit && pnpm build && pnpm test:e2e tests/e2e/oferta-zapytanie.spec.ts tests/e2e/oferta.spec.ts tests/e2e/a11y.spec.ts` (+ `build:visual && test:visual tests/visual/oferta.spec.ts` przy zmianie wyglądu; krycia tekstu albo tło sekcji = pomiar kontrastu, `forms.css` = pomiar LCP list rodzaju i detali: `docs/analiza-formularze-b.md` §10)                                                                                                                                                                                                               |
| `src/pages/sprzedaj-z-nami.astro`, `src/components/sections/sell/**`, `src/components/forms/FormChoice.astro`, `src/components/MotionGate.astro`, `src/components/navbar/**` (wariant „nad hero")                             | `pnpm build && pnpm test:e2e tests/e2e/sprzedaj.spec.ts tests/e2e/navigation.spec.ts tests/e2e/home.spec.ts tests/e2e/kontakt.spec.ts tests/e2e/a11y.spec.ts` (+ `build:visual && test:visual tests/visual/sprzedaj.spec.ts tests/visual/chrome.spec.ts tests/visual/home.spec.ts tests/visual/kontakt.spec.ts` przy zmianie wyglądu; zmiana paska = pomiar `chrome-*` progiem 0; krycie gradientu, kolory tekstu albo zdjęcie hero = pomiar kontrastu: `docs/analiza-formularze-a.md` §11.2)                                                                             |
| `src/pages/praca.astro`, `src/components/sections/jobs/**`, `src/components/forms/{FormFile,FormMail}.astro`, `form-file.ts`, `CV_MAX_BYTES` / `CV_TYPES` w `cv-file.ts`, `SHOW_PRACA`, `isSitemapPath`                       | `pnpm test:unit && pnpm build && pnpm test:e2e tests/e2e/praca.spec.ts tests/e2e/a11y.spec.ts tests/e2e/seo.spec.ts tests/e2e/navigation.spec.ts` (+ `build:visual && test:visual tests/visual/praca.spec.ts` przy zmianie wyglądu; zmiana `CV_MAX_BYTES` = regeneracja zrzutów z dopiskiem; zdjęcie hero albo krycie rozjaśnienia pod paskiem = pomiar kontrastu: `docs/analiza-formularze-b.md` §11.2 F91)                                                                                                                                                              |
| `src/pages/o-nas.astro`, `src/components/sections/about/**`, `src/components/sections/content-motion.ts` (wartości `data-px`)                                                                                                 | `pnpm build && pnpm test:e2e tests/e2e/o-nas.spec.ts tests/e2e/uslugi.spec.ts tests/e2e/navigation.spec.ts tests/e2e/home.spec.ts tests/e2e/sprzedaj.spec.ts tests/e2e/a11y.spec.ts` (+ `build:visual && test:visual tests/visual/o-nas.spec.ts` przy zmianie wyglądu; zmiana `content-motion.ts` = pomiar `home-*`, `sprzedaj-*`, `o-nas-*` i `uslugi-*` progiem 0; krycie szkła, gradientów, kolory tekstu albo zdjęcia = pomiar kontrastu: `docs/analiza-o-nas.md` §10.2)                                                                                              |
| `src/pages/uslugi.astro`, `src/components/sections/services/**`, kotwice sekcji usług (`SERVICES_ANCHORS`, linki w `home-copy.ts`)                                                                                            | `pnpm build && pnpm test:e2e tests/e2e/uslugi.spec.ts tests/e2e/navigation.spec.ts tests/e2e/home.spec.ts tests/e2e/a11y.spec.ts` (+ `build:visual && test:visual tests/visual/uslugi.spec.ts` przy zmianie wyglądu; dopełnienie górne sekcji albo `scroll-margin-top` = testy kotwic na trzech profilach; krycie szkła, gradientów, kolory tekstu albo zdjęcia = pomiar kontrastu w OBU silnikach: `docs/analiza-uslugi.md` §10.2)                                                                                                                                       |
| `tests/helpers/**`, `lighthouserc*.cjs`, `.github/workflows/*.yml`                                                                                                                                                            | `pnpm test:unit` (helpery) + warstwa, której spec używa helpera; workflow NIE uruchamiać w sesji                                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| `src/pages/index.astro`, `src/components/sections/**` (sekcje strony głównej, moduły ruchu, `content.css`), `src/lib/offers/home-offers.ts`, `public/video/**`                                                                | `pnpm test:unit && pnpm build && pnpm test:e2e tests/e2e/home.spec.ts tests/e2e/navigation.spec.ts tests/e2e/a11y.spec.ts` (+ `build:visual && test:visual tests/visual/home.spec.ts tests/visual/chrome.spec.ts` przy zmianie wyglądu; wideo → `total` desktop w LHCI, szkło i kolory hero → pomiar kontrastu: `docs/analiza-home.md` §6, §10.2)                                                                                                                                                                                                                         |
| Każda zmiana wyglądu                                                                                                                                                                                                          | `pnpm build:visual && pnpm test:visual`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| Przed release                                                                                                                                                                                                                 | pełne `pnpm test` + `/release-check`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |

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
  `mcr.microsoft.com/playwright:v<wersja>-noble`; do DIAGNOZY czerwonego workflow ten sam obraz uruchamiany lokalnie —
  komenda w `docs/analiza-oferta.md` §10; wygenerowane w kontenerze PNG
  usuń, baseline'y linux biorą się z workflow). Zamierzona zmiana
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
  odtwarzanie testuj funkcjonalnie w e2e. Wyjątek uzgodniony w 4.4:
  film hero strony głównej (pod treścią, widoczny tylko w trakcie
  odtwarzania) odcina się `blockHeroVideo()` — maska zakryłaby `h1`.
- **Formularze: żaden test nie wysyła maila i nie woła usług
  zewnętrznych.** Endpoint i Turnstile w e2e/visual to zaślepki
  (`tests/helpers/forms.ts`), Resend w unit to atrapa `fetch`. Wysyłki
  rzeczywiste robi wyłącznie Mateusz, ręcznie. Pliki w testach to bufory
  budowane w teście — żaden plik nie opuszcza przeglądarki testowej ani
  procesu testów.
- NIE emuluj `prefers-reduced-motion: reduce` (bramka ruchu = testy
  „przechodzą" na martwej stronie); świadome, punktowe wyjątki per test
  weryfikujące ścieżkę reduce są dozwolone — oznaczaj je komentarzem
  (dziś pięć: litery paska w `navigation`, hero i reveale w `home`,
  reveale i parallax w `sprzedaj`, reveale i parallax w `o-nas`, reveale,
  parallax i kotwica w `uslugi`).
- **Wartości limitu CV nie wpisuj w testy** — asercje liczą ją ze stałej
  `CV_MAX_BYTES` (`cvLimitLabel()`, `formatFileSize`), bo pomiar na
  platformie może ją zmienić jednym commitem.
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
