# Mini-analiza 5B — zapytanie o ofertę (detal) i `/praca/` z CV

> **Status:** ZAAKCEPTOWANA 2026-10-04 (wszystkie rekomendacje Q1–Q8
> z §9). PR 1 (`feat/oferta-zapytanie`: zapytanie o ofertę) ZMERGOWANY —
> PR #27, 2026-10-04 (uzupełnienia w §10); PR 2 (`feat/praca`: `/praca/`
> z CV) ZMERGOWANY — PR #29, 2026-10-04 (uzupełnienia w §11).
> Część 5B Etapu 5 wg instrukcji wykonawczej (dokument lokalny,
> `docs/plan/`): kroki 5.2 (reguły implementacji uploadu), 5.3, akapit 5B,
> 5.4; prompt §5B z `etap-4-prompty.md`. Referencje wyglądu:
> `docs/design/export/oferta.html` (sekcja `#kontakt`, gałęzie `.br-m`
> i `.br-d`), `praca.html`, `assets/js/site.js` §2 (formularz referencyjny
> nie wysyła danych) i §11 (pole pliku). Baza wiedzy — odsyłacze sekcją,
> bez cytowania: part2 §11 (formularz przy ofercie), §12 (błędy logiczne
> `praca.html`); part1 §8 (D20–D22; U15 — limit CV); part3 §9.2 (maile
> C i D); `formularze-wspolne.md` §1, §6–§8.
> Spójność z 5A (`analiza-formularze-a.md`: jedna funkcja walidacji,
> ramka `FormFrame`, F24 `aria-describedby`, F36 dosuwanie pod pasek,
> F40 pomiar kontrastu) i z 4.3 (`analiza-oferta.md`: R1 karta agenta,
> R7 pusty `[data-offer-inquiry]`, budżet §10–§11).
>
> **Warunki startu:** kroki 5.1 (chmura) i 5.2 (pomiar CPU, limit CV
> 2 MB albo 1 MB) NIE są wykonane (odpowiedź Mateusza 2026-10-04) — kod
> i testy stoją na atrapach. PR 1 (zapytanie o ofertę) od nich nie
> zależy. **Decyzja zmieniona 2026-10-04 (kolejność):** najpierw cały
> design (5B PR 2 → 4.5 → 4.6 → 4.7), chmura jednym blokiem na końcu
> (5.1 → 5.2 → wysyłki 5.5). PR 2 (`/praca/`) powstaje więc z uploadem od
> razu, z limitem CV jako JEDNĄ stałą `CV_MAX_BYTES`; pomiar 5.2 odbędzie
> się później na gotowej funkcji (nie na osobnej gałęzi testowej) i może
> tę stałą obniżyć — §11.7. Warunek, który zostaje: 5.1 i 5.2 przed
> testami klientki (Etap 7) i przed podaniem jej limitu CV. Zapisy „PR 2
> nie rusza bez wyniku 5.2" w §9.0 i §10.7 są nieaktualne. Testy
> dotychczasowych widoków na `nowa.`: bez usterek (pobieżnie); większe
> poprawki — po całej implementacji, jednym planem.

## 0. Zakres i podział

| PR | Gałąź | Zawartość |
| --- | --- | --- |
| 1 | `feat/oferta-zapytanie` | rodzaj `oferta` w `contact-form.ts` (walidacja, mail D), weryfikacja numeru w funkcji (indeks ofert), ciemny wariant ramki formularza, formularz w `[data-offer-inquiry]` na detalu, testy; porządki dokumentów po 5A PR 2 |
| 2 | `feat/praca` (od main po merge'u PR 1) | rodzaj `praca` (walidacja, mail C), upload CV w funkcji (reguły 5.2), pole pliku (`FormFile.astro` + `form-file.ts`), wariant bloku zgód ramki, widok `/praca/`, testy, LHCI |

Poza zakresem (bez zmian): `/kontakt/`, `/sprzedaj-z-nami/`, „/",
`/oferty/` (lista i wyspa), galeria i lightbox detalu, 404, trasy
treściowe 4.5–4.7, `overlay.ts`, chrome, sync, dane, fixture, progi LHCI,
chmura.

## 1. Inwentarz z designu

### 1.1 Formularz przy ofercie (`oferta.html`, sekcja `#kontakt`)

Sekcja istnieje od 4.3 (tło ze zdjęciem + gradient granatowy, eyebrow,
`h2` „Zapytaj o tę ofertę", karta agenta, wiersze telefon / e-mail,
„Wróć do listy ofert"). Design dokłada formularz NA CIEMNYM TLE:

| Element | Mobile < 1025 | Desktop ≥ 1025 |
| --- | --- | --- |
| Położenie | pod kartą agenta i wierszami kontaktu, nad linkiem powrotu | prawa kolumna siatki sekcji (lewa: nagłówek, agent, wiersze, powrót) |
| Pola | jedna kolumna: Imię i nazwisko → E-mail → Telefon → Wiadomość (4 wiersze) | E-mail i Telefon w jednym wierszu |
| Wygląd pól | etykieta biała 14 px / 600, pole białe BEZ obrysu, 52 px, tekst 16 px | to samo |
| Blok końcowy | checkbox 22 px (akcent miedziany) z tekstem białym `.86`, nota 13 px biała `.7` z linkiem do polityki, przycisk miedziany „Wyślij" (52 px, do lewej, promień lewego dolnego rogu) | to samo |
| Wiadomość | wypełniona tekstem z numerem i tytułem oferty | to samo |

Formularz nie ma własnego nagłówka — nazwę niesie `h2` sekcji.

### 1.2 `/praca/` (`praca.html`; bez `data-anim` — bez ruchu, pasek stały)

| Blok | Mobile < 1025 | Desktop ≥ 1025 |
| --- | --- | --- |
| Pasek | wariant stały (szkło), zdjęcie wchodzi pod pasek | wariant stały, treść odsunięta o pasek |
| Hero | zdjęcie `praca-hero` na pełną szerokość, wysokość 240–360 px (`cover`, pozycja 40 % 62 %), pod nim eyebrow „Praca" i `h1` „Dołącz do nas. **Wyślij swoje CV.**" (24–42 px), tło `--bg` | biała sekcja; zdjęcie w kontenerze 1360 px, wysokość 300–460 px, promień lewego dolnego rogu; biała karta z eyebrow i `h1` (34–54 px) NASUNIĘTA na dół zdjęcia (ujemny margines 80–128 px) |
| Formularz | kolumna 600 px, kreska nad formularzem; pola jedno pod drugim: Imię i nazwisko → E-mail → Telefon (opcjonalnie) → Treść wiadomości (opcjonalnie) → CV → trzy checkboxy → przycisk „Wyślij zgłoszenie" → „Wolisz mailem? Wyślij CV na …" | siatka 3 kolumn: Imię / E-mail / Telefon; niżej Treść (2 kolumny) obok strefy CV (1 kolumna, ta sama wysokość); checkboxy w 3 kolumnach; przycisk i „Wolisz mailem?" w jednym wierszu |
| Pole CV | etykieta „CV"; strefa z obrysem przerywanym (72 px): przycisk-etykieta „Wybierz plik", nazwa pliku („Nie wybrano pliku"), dopisek „PDF, DOC lub DOCX · maks. 5 MB"; `input type="file"` ukryty wizualnie (1 px) | strefa 150 px, wyśrodkowana, dodatkowo „lub przeciągnij go tutaj" |
| `site.js` §11 | nazwa wybranego pliku w strefie; przeciągnij i upuść (podświetlenie strefy, przypisanie `input.files`); bez skryptu pole działa jak zwykły `input` | to samo |

Design nie ma: akapitu wprowadzającego, opisu stanowiska, stanów błędów,
potwierdzenia, komunikatu o za dużym pliku.

## 2. Rozjazdy — rozstrzygnięcia

Numeracja `F` — ciąg dalszy 5A (ostatni: F47). „Baza" = baza wiedzy.

| # | Rozjazd | Rozstrzygnięcie | Źródło |
| --- | --- | --- | --- |
| F48 | Treść startowa wiadomości przy ofercie: design wstawia zdanie z numerem i tytułem oferty | **tekst z obecnej strony** (bez numeru i tytułu — te niesie mail z indeksu); pole zostaje edytowalne i wymagane (niepuste) | part2 §11 |
| F49 | Checkbox przy ofercie: design „Chcę otrzymywać informacje o nowych ofertach (opcjonalnie)" | **zgoda D21** (`MARKETING_CONSENT` — jedno brzmienie w serwisie), opcjonalna, odznaczona | part1 §8 D21; part2 §12 |
| F50 | Nota przy ofercie: design „Administratorem danych jest…" | nota w układzie 5A: zdanie o celu + wspólny ogon z linkiem do polityki (link podkreślony) | `formularze-wspolne.md` §5–6 |
| F51 | Telefon przy ofercie: w designie „(opcjonalnie, jeśli podasz e-mail)" / „(opcjonalnie)" przy wymaganym e-mailu | **para kontaktowa 5A** (`FormContactPair`: dwa pola, wymagane co najmniej jedno, wspólna podpowiedź, kolejność E-mail → Telefon) | `formularze-wspolne.md` §1; part2 §11 |
| F52 | Tytuł, lokalizacja i adres oferty w mailu | **nie z pól formularza**: formularz niesie wyłącznie ukryty numer (`offer`); funkcja czyta `/oferty/index.json` przez `env.ASSETS.fetch()` i sama bierze `title`, `location.placeName` (+ ulica) i `path`. Adres = host żądania + `path`. Zachowanie przy numerze spoza indeksu → **Q2** | part3 §9.2 D; instrukcja 5B |
| F53 | Temat maila D | dzisiejszy prefiks zapytania do agenta + numer oferty; numer w temacie pochodzi z WERYFIKACJI (wzorzec numeru + indeks), nie jest dowolnym tekstem klienta | part3 §9.2 |
| F54 | Adresat zapytania | `biuro@` (jak pozostałe formularze; `KONTAKT_TO` nadpisuje na podglądach); karta agenta dalej pokazuje `joanna@` przez slot (R1 z 4.3) | part1 §8 D20; part2 §11 |
| F55 | Kolory na ciemnym tle (allowlista axe PUSTA) | biały tekst przycisku na miedzi → `--ink` (jak wszędzie); tekst zgody i noty — krycie z POMIARU kontrastu nad zdjęciem tła (metoda F40; axe zwraca „incomplete"); komunikaty błędów w jasnym odcieniu czerwieni (nowy token `--error-light`, ≥ 4,5:1 na najjaśniejszym miejscu tła sekcji); link do polityki i fokus w `--copper-light` | analiza 5A F12, F40 |
| F56 | Pasek dolny detalu (telefon i tablet) zasłania dół okna dokładnie tam, gdzie stoi formularz | pasek znika, gdy fokus jest w formularzu albo formularz pokazuje potwierdzenie (czysty CSS: `:has(:focus-within)`); „Napisz" paska i lightboxa dalej celuje w `#kontakt` (design) | analiza 4.3 §1.4 |
| F57 | `praca.html`: zgoda rekrutacyjna jako checkbox `required` | **nie wchodzi** — zamiast niej nota informacyjna z linkiem do polityki (podstawa przetwarzania nie jest zgodą) | part2 §12; part1 §8 D22 |
| F58 | `praca.html`: checkbox marketingowy | **nie wchodzi** (D21 nie obejmuje formularza rekrutacyjnego) | part2 §12; instrukcja 5.3 |
| F59 | `praca.html`: zgoda na przyszłe rekrutacje | **wchodzi jako JEDYNY checkbox**: opcjonalny, odznaczony, bez gwiazdki; pole `future`; mail niesie Tak / Nie + brzmienie | part1 §8 D22; part3 §9.2 C |
| F60 | Limit CV: design „maks. 5 MB" | **2 MB** (U15) albo 1 MB po pomiarze 5.2 — JEDNA stała `CV_MAX_BYTES` w `contact-form.ts`; z niej liczą się: dopisek w strefie, komunikat, kontrola w przeglądarce, próg funkcji | part1 §8 D22; instrukcja 5.2 |
| F61 | Za duży plik | komunikat pod polem kieruje na e-mail biura przez slot `a[data-mail="biuro"]` (nie ślepy zaułek); plik zostaje odrzucony w przeglądarce, przed wysyłką | part1 §8 D22 |
| F62 | E-mail w `/praca/`: design wymagany, telefon opcjonalny | → **Q1** (rekomendacja: zasada wspólna — para kontaktowa) | instrukcja 5B |
| F63 | Typ pliku: design polega na `accept` | `accept` zostaje (podpowiedź dla systemowego okna wyboru), ale rozstrzyga walidacja: rozszerzenie (przeglądarka i funkcja) ORAZ sygnatura pliku (funkcja): PDF, DOC (kontener OLE), DOCX (ZIP); rozszerzenie musi zgadzać się z sygnaturą | instrukcja 5B |
| F64 | Nazwa i typ załącznika | nazwa oczyszczana (bez ścieżki, znaki spoza bezpiecznego zestawu → `-`, limit długości, rozszerzenie z walidacji; pusta → nazwa zastępcza); MIME załącznika z ROZSZERZENIA po weryfikacji sygnatury, nie z deklaracji przeglądarki | part3 §9.2 C |
| F65 | CV nie jest nigdzie zapisywane | plik żyje wyłącznie w pamięci żądania: formularz → base64 → treść żądania do Resend; KV dostaje tylko licznik dzienny; logi bez nazwy pliku i danych kandydata | part1 §8 D22 |
| F66 | Potwierdzenie i błąd wysyłki w `/praca/` | → **Q5** (czas odpowiedzi w potwierdzeniu rekrutacji); komunikat błędu wysyłki kończy się slotem E-MAILA biura (kandydat ma wysłać plik, nie dzwonić) | `formularze-wspolne.md` §2, §8 |
| F67 | Etykiety i placeholdery `/praca/` | pola wspólne (imię, e-mail, telefon) — teksty 5A; „Treść wiadomości (opcjonalnie)", placeholder, „Wyślij zgłoszenie", „Wolisz mailem?", treść noty i zgody na przyszłe rekrutacje — brzmienia robocze (baza nie ma jeszcze tekstów tego formularza) → PLACEHOLDER, §7 | `formularze-wspolne.md` §8 |
| F68 | Kolory `/praca/` poniżej AA | jak F12: eyebrow `--copper-text`, druga fraza `h1` `--copper-dark`, przycisk z tekstem `--ink`, tekst `#4a4844` → `--slate` | analiza 5A F12 |
| F69 | Desktop `/praca/`: sekcja na pełną wysokość okna (`vp-full`) | artefakt — wysokość z treści (jak F23) | `docs/design/README.md` |
| F70 | „lub przeciągnij go tutaj" | widoczne tylko od 1025 px i tylko gdy moduł pola pliku jest uzbrojony (bez JS upuszczenie pliku na stronę otworzyłoby go w karcie) | `site.js` §11 |

Bez rozjazdu: ukryty numer oferty, brak potwierdzenia do nadawcy,
`Reply-To` = e-mail klienta albo kandydata (jeśli podał), nadawca `send.`
(U7), potwierdzenie w miejscu formularza, czas odpowiedzi przy ofercie
(jedna deklaracja serwisu), „Wolisz mailem?" pod formularzem pracy
(slot), antyspam jak w 5A.

## 3. Czego design nie ma, a trzeba zbudować

### 3.1 Wspólne (`src/lib/contact-form.ts`, `functions/api/kontakt.ts`)

1. **Aktywacja rodzajów:** `ACTIVE_FORM_KINDS` dostaje `oferta` (PR 1)
   i `praca` (PR 2). Strona formularza przestaje być stałą tabelą —
   zapytanie o ofertę żyje pod adresem detalu: przekierowanie wysyłki bez
   JS (303) przyjmuje Referer z własnego hosta pod `/oferty/…`, a kontener
   formularza na detalu dostaje `id="formularz"` (jeden cel powrotu dla
   czterech formularzy).
2. **Rozmiar żądania — dwa progi, jedna zasada.** Dziś funkcja porównuje
   `Content-Length` z progiem formularza tekstowego PRZED czytaniem
   treści, ale brak nagłówka przepuszcza (liczy się jak zero). Zmiany:
   - brak albo nieliczbowy `Content-Length` → **411** (nic nie czytamy;
     przeglądarki wysyłają nagłówek dla `FormData` zawsze —
     [DO SPRAWDZENIA na podglądzie, §8]);
   - próg przed czytaniem treści = limit CV + narzut formularza
     (`CV_REQUEST_MAX_BYTES` = `CV_MAX_BYTES` + `FORM_MAX_BYTES`) → 413;
   - po odczytaniu rodzaju: formularz inny niż `praca` z żądaniem ponad
     `FORM_MAX_BYTES` albo z jakimkolwiek plikiem → 413.
   Rodzaj formularza jest w treści żądania, więc próg per rodzaj PRZED
   czytaniem wymagałby deklaracji w nagłówku — a tę napastnik i tak
   ustawiłby na `praca`. Jedyną realną ochroną czasu funkcji jest więc
   próg górny; drugi próg to higiena formularzy tekstowych.
3. **Mail D (zapytanie o ofertę):** nagłówek z numerem jako linkiem do
   adresu oferty, pod nim jedna linia „tytuł · lokalizacja"; Treść
   wiadomości; Dane kontaktowe; zgoda marketingowa Tak / Nie + brzmienie;
   stopka (data, adres oferty z hosta żądania, zdanie o odpowiadaniu).
   Wszystkie wartości z indeksu escapowane jak dane klienta.
4. **Mail C (praca):** etykiety w dzisiejszej kolejności (kandydat,
   e-mail, telefon, treść — pomijana, gdy pusta), linia „CV: nazwa
   (rozmiar)", zgoda na przyszłe rekrutacje Tak / Nie + brzmienie; BEZ
   linii zgody marketingowej.
5. **Załącznik (reguły 5.2 — wszystkie cztery):** base64 natywnie
   (→ **Q3**: którym API); treść żądania do Resend = `JSON.stringify`
   wiadomości BEZ załącznika + doklejony fragment
   `"attachments":[{…,"content":"` + base64 + `"}]}` (alfabet base64 nie
   wymaga escapowania; nazwa i typ przechodzą przez `JSON.stringify`
   osobno — to kilkadziesiąt bajtów); odrzucenie po `Content-Length` przed
   czytaniem (pkt 2); kontrola rozmiaru w przeglądarce (pkt 3.3).
   Kodowanie następuje NA KOŃCU — po pułapce, walidacji, Turnstile
   i liczniku — więc odrzucone żądania nie płacą za base64.
6. **Kolejność kroków funkcji po 5B:** metoda → 303 dla POST bez
   `Accept: application/json` (treść nieczytana) → rozmiar (411 / 413) →
   treść → rodzaj (+ próg rodzaju) → pułapka 200 → walidacja 400 z `fields`
   (dla `praca`: obecność, rozmiar, rozszerzenie, sygnatura) → sekrety 503
   → Turnstile → licznik KV → [oferta: indeks ofert] → [praca: base64] →
   Resend 502.

### 3.2 Zapytanie o ofertę (PR 1)

1. **Ciemny wariant ramki** (`FormFrame` z propem `tone="dark"`): klasa
   `fm-frame--dark` przestawia w `forms.css` zmienne kolorów (etykiety,
   podpowiedzi, zgoda, nota, komunikaty, obrys fokusu, potwierdzenie,
   blok błędu wysyłki); pola zostają białe bez obrysu (design). Jeden
   markup, zero nowych komponentów pól.
2. **Nazwa dostępna formularza:** `aria-labelledby` = `h2` sekcji
   (`FormFrame` dostaje opcjonalny prop).
3. **Stany** (błędy, wysyłanie, błąd wysyłki z telefonem przez slot,
   potwierdzenie z czasem odpowiedzi i telefonem) — mechanika 5A bez
   zmian; fokus pierwszego błędu i potwierdzenie dosuwa skrypt pod pasek
   ORAZ pod pasek kotwic detalu (`revealUnderBar` liczy dziś sam nagłówek
   — dostaje opcjonalny drugi element sticky, czytany z atrybutu ramki).
4. **Uzbrojenie:** `initForms()` w skrypcie detalu → **Q4** (statycznie
   czy leniwie).
5. **Druk:** `[data-offer-inquiry]` jest już ukryty w arkuszu druku —
   bez zmian (zrzut `oferta-druk` do zmierzenia progiem 0).
6. **Status oferty:** formularz na KAŻDYM detalu, także rezerwacja,
   sprzedane, wynajęte → **Q6**.

### 3.3 `/praca/` (PR 2)

1. **`FormFile.astro`** — pole pliku: `<label>` „CV", strefa-etykieta
   (`[data-file-zone]`, cel 48 px+), `input type="file"` ukryty wizualnie,
   ale w kolejności Tab i z widocznym fokusem na strefie
   (`:has(:focus-visible)`), `accept`, `required`; nazwa pliku
   `[data-file-name]` (`aria-live="polite"`), dopisek typów i limitu
   liczony z `CV_MAX_BYTES`. Trzy komunikaty w HTML — brak pliku, zły typ,
   za duży (ze slotem e-maila) — jako ZAGNIEŻDŻONE opakowania `data-f`
   (`cv`, `cv-type`, `cv-size`), tak jak para kontaktowa: mechanika
   `.err` i `aria-describedby` z `form-ui.ts` działa bez zmian, zero
   tekstów w JS.
2. **`form-file.ts`** (osobny moduł, TYLKO `/praca/` — wspólny chunk
   `form-ui` nie rośnie o kod pola pliku): nazwa i rozmiar wybranego
   pliku, przeciągnij i upuść z podświetleniem strefy, powrót do stanu
   „Nie wybrano pliku" po `reset`.
3. **`form-ui.ts` — trzy małe zmiany:** `readRaw()` dokłada dla pól
   plikowych nazwę i rozmiar (`cv:name`, `cv:size`) — `validateForm`
   sprawdza je tą samą regułą po obu stronach (funkcja buduje te same
   klucze z `FormData`); odpowiedź 413 zapala błąd rozmiaru pliku, gdy
   formularz ma takie opakowanie (inaczej zwykły błąd wysyłki); lista
   rodzajów.
4. **Wariant bloku zgód ramki:** `FormFrame` dostaje prop `consent`
   (`name` + tekst; domyślnie zgoda marketingowa) i prop kontaktu
   w komunikatach (`tel` domyślnie, `mail` dla pracy — nowy
   `FormMail.astro`, slot `a[data-mail="biuro"]`). Trzy istniejące
   formularze renderują się bez zmian (HTML `/kontakt/`
   i `/sprzedaj-z-nami/` do porównania odciskiem na `build:visual`).
5. **Widok:** `src/pages/praca.astro` + `sections/jobs/` (`JobsHero`,
   `JobsForm`, `jobs-copy.ts`, `jobs-config.ts`); pasek stały, bez
   modułu ruchu i bez `MotionGate`; zdjęcie hero `eager` +
   `fetchpriority` + `preload` z `media` (plik `-m` poniżej 768 px —
   oba pliki istnieją od Etapu 0, nowego kadru nie trzeba: pole jest
   poziome na każdej szerokości); `id="formularz"` ze `scroll-margin-top`.
6. **Bez JS:** formularz kompletny (`enctype="multipart/form-data"`),
   natywne `required`; `<noscript>` jak w 5A; POST bez JS → 303 (funkcja
   nie czyta wtedy treści, więc plik nie kosztuje czasu funkcji).
7. **Flaga `SHOW_PRACA`** → **Q7** (co znaczy „wyłączona" dla trasy).

## 4. Kontrakty i testy

**Znaczniki:** `form[data-form="oferta"]` w `[data-offer-inquiry]`,
`input[type=hidden][name="offer"]`, pola `of-name`, `of-email`, `of-phone`,
`of-message`; `/praca/`: `[data-jobs-hero]`, `section#formularz`,
`form[data-form="praca"]`, pola `pf-name`, `pf-email`, `pf-phone`,
`pf-message`, `pf-cv`, `[data-file]`, `[data-file-zone]`,
`[data-file-name]`, opakowania `data-f="cv|cv-type|cv-size"`, checkbox
`future`.

**Unit** (`contact-form.test.ts`, `contact-endpoint.test.ts` —
rozszerzone; atrapy `fetch`, KV i `ASSETS`):

| Obszar | Asercje |
| --- | --- |
| Walidacja `oferta` | numer wg wzorca numeru oferty (pusty / zły → odrzucenie całego zgłoszenia, nie błąd pola); imię; para kontaktowa; wiadomość niepusta; zgoda domyślnie „nie" |
| Mail D | temat = prefiks + numer; nagłówek z numerem i adresem z hosta żądania + `path` z indeksu; linia tytuł · lokalizacja Z INDEKSU; **pole `title` / `url` dosłane przez klienta nie trafia do maila**; escapowanie wartości z indeksu; zgoda + brzmienie |
| Endpoint `oferta` | numer w indeksie → jedno żądanie do Resend; numer spoza indeksu i awaria `ASSETS` → wg decyzji Q2; indeks czytany dopiero PO Turnstile; 303 z Refererem detalu wraca na ten detal |
| Rozmiar | brak `Content-Length` → 411 i treść NIEprzeczytana (żądanie z treścią, której odczyt wywraca test); ponad próg górny → 413 bez czytania; formularz tekstowy z plikiem albo ponad 64 KB → 413 |
| Walidacja `praca` | brak pliku → `cv`; rozszerzenie spoza listy → `cv-type`; rozmiar ponad limit → `cv-size` (granica: dokładnie limit przechodzi); para kontaktowa wg Q1; treść opcjonalna; `future` domyślnie „nie" |
| Sygnatura | PDF / OLE / ZIP rozpoznane; `.pdf` z treścią ZIP i odwrotnie → `cv-type`; plik krótszy niż sygnatura → `cv-type` |
| Nazwa i MIME | ścieżka, znaki sterujące, cudzysłów, bardzo długa nazwa, sama kropka → nazwa bezpieczna z właściwym rozszerzeniem; MIME z rozszerzenia |
| Żądanie do Resend (praca) | treść jest poprawnym JSON-em; `attachments[0]` = nazwa, `content_type`, a `content` po zdekodowaniu jest BAJT W BAJT plikiem wejściowym (także 2 MB); `reply_to` tylko przy e-mailu; brak linii zgody marketingowej w mailu C; linia CV z nazwą i rozmiarem |
| Kolejność | pułapka → 200 i ZERO żądań (plik nieodczytany do base64); odmowa Turnstile → brak kodowania; log błędu bez nazwy pliku i danych kandydata |
| Stałe | dopisek limitu i próg funkcji liczone z `CV_MAX_BYTES` |

**E2E** — endpoint i Turnstile ZAWSZE zaślepione (`tests/helpers/forms.ts`;
`recordPosts` zapisuje dodatkowo nazwę, rozmiar i typ pól plikowych);
pliki testowe to bufory budowane w teście (`setInputFiles({ name,
mimeType, buffer })`) — żaden plik nie opuszcza przeglądarki testowej.

| Spec | Kontrakty |
| --- | --- |
| `oferta.spec.ts` (rozszerzenie; treść `chromium-1920`, formularz także `chromium-pixel-5` i `webkit-iphone-14`; `pickOffer` + `test.skip`) | formularz w `[data-offer-inquiry]` (dotychczasowa asercja „puste" odwrócona), `aria-labelledby` = `h2` sekcji, ukryty numer = numer oferty, wiadomość startowa z `forms-copy.ts`, pola i kolejność, zgoda odznaczona bez `required`; surowy HTML sekcji nadal bez telefonu, maila, `tel:`, `mailto:`; pusta para → `.err`, fokus pod paskiem I pod kotwicami, zero żądań; minimum (imię + telefon) → jedno żądanie: `form=oferta`, `offer`, `message`, bez `marketing`; zgoda → `marketing=1`; potwierdzenie w miejscu formularza (czas odpowiedzi, slot telefonu), „kolejna" przywraca tekst startowy; antyspam; Turnstile dopiero po `focusin` (zero hostów trzecich przy wejściu i po przewinięciu); 400 / 500; pasek dolny znika przy fokusie w formularzu (mobile); „Napisz" lightboxa i paska → `#kontakt` (bez zmian); próg 1025 (`.fm-row2` 1 ↔ 2 kolumny, siatka sekcji); `font-size` pól ≥ 16 px; axe `.include` sekcji w trzech stanach (z `mouse.move(0, 0)` + `settle` przed skanem potwierdzenia); bez JS: `<noscript>`, `method` / `action` |
| `praca.spec.ts` (nowy; te same trzy profile) | hero (`h1`, eyebrow, zdjęcie `eager` + `fetchpriority`, dwa `preload` z `media`, `currentSrc` przy 767 / 768, proporcje bez deformacji); pola i kolejność; JEDEN checkbox (`future`, odznaczony, bez `required`), brak `marketing` i `consent_recruitment` w DOM; **upload:** brak pliku → `cv`, fokus na polu pliku pod paskiem; zły typ (`.txt`, `.jpg`) → `cv-type`; za duży (limit + 1 B) → `cv-size` ze slotem `mailto:` po JS, ZERO żądań; poprawny PDF / DOCX → nazwa w strefie, jedno żądanie z plikiem (nazwa, rozmiar) i polami; zmiana pliku gasi błąd; „kolejne zgłoszenie" czyści plik; 413 z zaślepki → błąd rozmiaru; 400 `cv-type` z zaślepki (sygnatura); upuszczenie pliku na strefę (desktop); strefa ≥ 48 px, fokus widoczny; sloty: surowy `<main>` bez adresów, po JS `mailto:` w trzech miejscach; antyspam, Turnstile, stany, bez JS (`enctype`, `<noscript>`); próg 1025 (siatka 1 ↔ 3 kolumny); zero hostów trzecich; axe w czterech stanach (wyjściowy, błędy, plik wybrany, potwierdzenie) |
| `navigation`, `seo`, `a11y`, `smoke` | bez zmian speców (trasa `/praca/` już w nich jest); `smoke`: sonda produkcyjna dalej `form=kontakt` — przy okazji potwierdza, że 411 nie dotyka zwykłych żądań |

**Visual** (fixture, 6 profili; święta kolejność baseline'ów bez zmian):

| PR | Zrzuty | PNG na platformę |
| --- | --- | --- |
| 1 | `oferta-mieszkanie`, `-dom`, `-dzialka`, `-lokal` (fullPage) — ROZJADĄ SIĘ na wszystkich profilach (formularz w sekcji kontaktu): regeneracja 24; nowe `oferta-form-errors`, `oferta-form-done` (element sekcji `#kontakt`, pasek fixed i kotwice schowane) | 24 zmienione + 12 nowych |
| 1 | `oferta-druk`, `oferta-lightbox`, `chrome-*`, `oferty-*`, `not-found-*` — pomiar progiem 0 (oczekiwane 0 różnic) | 0 |
| 2 | `praca-full` (fullPage), `praca-form-errors`, `praca-form-file` (strefa z wybranym plikiem), `praca-form-done` (element `section#formularz`) | 24 nowe |
| 2 | `kontakt-*`, `sprzedaj-*` po zmianie ramki — pomiar progiem 0 (oczekiwane 0 różnic) | 0 |

**LHCI:** PR 1 — adresy detali już są w configach; PR 2 — `/praca/`
dopisane do obu.

## 5. Budżet (prognoza; pomiar po `build:visual` w raporcie PR-a)

| Zasób | Detal oferty (PR 1) | `/praca/` (PR 2) |
| --- | --- | --- |
| `script` (próg 40 000 B) | dziś 15 592 B brutto / 6 850 B gzip; dochodzi wspólny chunk `form-ui` (5 802 / 2 540 B) + kilkadziesiąt bajtów uzbrojenia → **ok. 21,5 KB / 9,4 KB gzip; LHCI ok. 11,7 KB = 29 % bramki** (dziś 22 %) | chrome 8,2 KB + skrypt strony + `form-ui` + `form-file` (ok. 1,2 KB / 0,6 KB gzip) → **ok. 15,5 KB / 6,8 KB gzip; LHCI ok. 9 KB = 23 %** |
| HTML | + ok. 4 KB brutto / 1 KB gzip na każdy detal (formularz, komunikaty) | ok. 28 KB / 7 KB |
| CSS | **uwaga:** trasa `[...path]` linkuje arkusze listy rodzaju i detalu na OBU widokach (stan znany, `optional-todos`) — wspólny arkusz formularzy (ok. 9–10 KB brutto / 2,5–3 KB gzip po dołożeniu wariantu ciemnego) trafi jako dodatkowy, blokujący render plik także na listy `/oferty/{rodzaj}/…` | arkusz formularzy wspólny z `/kontakt/` i `/sprzedaj-z-nami/` |
| `total` | + ok. 6–7 KB transferu | fonty 67 KB + zdjęcie 29 KB (mobile) / 49 KB (desktop) → ok. 150–180 KB |
| LCP | **ryzyko:** detal działki ma na mobile margines ok. 0,4 s do progu 3 200 ms; dodatkowy arkusz w `<head>` to jedyna rzecz, którą PR 1 dokłada do pierwszego ekranu. Pomiar lokalny wszystkich 4 detali i listy rodzaju PRZED i PO; gdyby LCP się ruszył — rozdzielenie arkuszy listy i detalu (wpis z `optional-todos`) wchodzi do PR 1 zamiast czekać na PR porządkowy (decyzja po pomiarze) | zdjęcie hero albo `h1` — `preload` z `media`; prognoza jak `/kontakt/` (ok. 2,0–2,1 s mobile) |
| Trasy spoza zakresu | wspólny arkusz formularzy rośnie o wariant ciemny → `/kontakt/`, `/sprzedaj-z-nami/` + ok. 0,3 KB gzip CSS; `form-ui` + ok. 0,1–0,2 KB gzip (klucze plików, 413, drugi element sticky) na trzech trasach | `form-ui` bez dalszego wzrostu (kod pola pliku w osobnym module) |

Czas funkcji (plan Free: limit czasu procesora na żądanie): najdroższe
kroki `praca` to rozbiór `multipart` 2 MB (kod natywny platformy), base64
natywnie i zbudowanie treści żądania do Resend bez serializacji
załącznika — czyli dokładnie to, co mierzy krok 5.2. Zapytanie o ofertę
dokłada odczyt i rozbiór indeksu (ok. 48 KB przy 46 ofertach — pomijalne).
Progi LHCI nietknięte.

## 6. Ryzyka platformy (do potwierdzenia na podglądzie, nie w testach)

1. `env.ASSETS` — binding plików statycznych w funkcjach Pages; unit
   testuje atrapę, realne działanie potwierdza pierwsza wysyłka z `nowa.`
   (5.5): mail D z tytułem = działa; mail z dopiskiem o braku weryfikacji
   = nie działa (Q2).
2. `Content-Length` w żądaniach przeglądarek za siecią brzegową (pkt 3.1.2)
   — na `nowa.` wysyłka przed krokiem 5.1 ma kończyć się odpowiedzią 503,
   nie 411 (widać w narzędziach przeglądarki).
3. Base64 (Q3) i czas procesora przy 2 MB — krok 5.2.
4. Obiekt `File` w `request.formData()` funkcji (zależny od daty
   zgodności projektu Pages — przy projektach z 2026 r. spełnione).

## 7. Lista PLACEHOLDER (U9; zamykana w 7.7)

| Widok | Teksty |
| --- | --- |
| Zapytanie o ofertę | zdanie o celu w nocie, etykieta przycisku („Wyślij zapytanie"; design: „Wyślij"), nagłówek i zdania potwierdzenia, komunikat błędu wysyłki |
| `/praca/` | eyebrow; `h1` „Dołącz do nas. Wyślij swoje CV."; etykieta i placeholder treści; „Wybierz plik", „lub przeciągnij go tutaj", „Nie wybrano pliku"; trzy komunikaty pola pliku; **nota informacyjna rekrutacji i brzmienie zgody na przyszłe rekrutacje (do weryfikacji prawnej razem z polityką — 4.7)**; „Wyślij zgłoszenie"; „Wolisz mailem? Wyślij CV na …"; potwierdzenie (Q5); błąd wysyłki; opis zdjęcia |

NIE są placeholderami: treść startowa wiadomości przy ofercie, zgoda
D21, etykiety i komunikaty pól wspólnych (5A), dopisek typów i limitu
(liczony ze stałej).

## 8. Co sprawdzić na `nowa.` i na fizycznym telefonie

1. **Wybór pliku — iOS (Safari):** arkusz „Biblioteka zdjęć / Zrób
   zdjęcie / Wybierz pliki" — czy `accept` zostawia „Wybierz pliki"
   i czy PDF z aplikacji Pliki oraz z iCloud Drive (plik niepobrany
   lokalnie) trafia do pola z poprawną nazwą i rozmiarem; plik `.pages`
   albo zdjęcie → komunikat o typie.
2. **Wybór pliku — Android (Chrome):** systemowy wybór dokumentów, plik
   z Dysku Google (pobierany w locie — rozmiar znany dopiero po pobraniu),
   plik z „Pobrane"; powrót z okna wyboru nie przeładowuje strony i nie
   gubi wpisanych pól.
3. **Plik większy niż limit:** komunikat widoczny pod polem, adres
   e-mail klikalny (otwiera pocztę), pola zachowane.
4. **Strefa pliku:** trafialność kciukiem, długa nazwa pliku nie rozpycha
   strefy (wielokropek), fokus widoczny z klawiatury zewnętrznej.
5. **Detal — formularz na ciemnym tle:** czytelność etykiet, zgody, noty
   i komunikatów błędów w słońcu; białe pola przy autouzupełnianiu
   (żółte tło Chrome / iOS) — czy tekst zostaje czytelny.
6. **Detal — klawiatura a pasek dolny:** po dotknięciu pola pasek
   „Zadzwoń / Napisz" znika i nie zasłania pola ani przycisku; po wyjściu
   z formularza wraca; „Napisz" z paska i z lightboxa ląduje na sekcji
   kontaktu pod paskiem kotwic.
7. **Detal — błąd i potwierdzenie:** pusta para kontaktowa → pole pod
   paskiem i kotwicami (Safari iOS — F36); potwierdzenie widoczne bez
   przewijania, numer klikalny.
8. **Turnstile (po 5.1):** widget na ciemnym tle sekcji — czy mieści się
   nad przyciskiem i jest czytelny; wyzwanie przy wysyłce pliku 2 MB na
   wolnym łączu (token żyje 300 s).
9. **Wysyłka CV na łączu komórkowym:** przycisk w stanie „Wysyłanie…" przez
   cały upload, brak podwójnej wysyłki po ponownym dotknięciu.
10. **Na `nowa.` DO kroku 5.1:** wysyłka każdego formularza kończy się
    komunikatem błędu, a w narzędziach przeglądarki odpowiedzią 503 (nie
    411, nie 413). PO 5.1 (wysyłki 5.5 — Mateusz): mail D z tytułem,
    lokalizacją i działającym linkiem do oferty; mail C z załącznikiem,
    który się otwiera (PDF, DOC, DOCX), poprawną nazwą i typem.

## 9. Pytania do Mateusza (z rekomendacją)

### 9.0 Z bramki startowej (bez nich nie zamknę PR 2)

> Nieaktualne od 2026-10-04 (decyzja o kolejności — „Warunki startu"):
> PR 2 nie czeka na 5.2; pomiar odbywa się później, na gotowej funkcji.

- **5.1 wykonane?** Jeśli tak — klucz publiczny Turnstile (osobny commit).
- **5.2 — wynik pomiaru:** 2 MB czy 1 MB; oraz czym pomiar kodował base64
  (ma znaczenie dla Q3) i czy flaga zgodności z Node jest włączona
  w projekcie Pages.

### 9.1 Decyzje 5B

1. **Q1 — e-mail w `/praca/` (F62).** Rekomendacja: **zasada wspólna —
   para kontaktowa** (e-mail albo telefon, co najmniej jedno; ten sam
   komponent i te same komunikaty co w trzech pozostałych formularzach).
   Na desktopie układ z designu zostaje: Imię | E-mail | Telefon w jednym
   rzędzie, podpowiedź pod parą. Alternatywa: e-mail wymagany, telefon
   opcjonalny jak w designie (osobna reguła i osobny komunikat tylko dla
   tego formularza).
2. **Q2 — numer oferty, którego nie ma w indeksie (F52).** Zdarzy się
   uczciwie: strona otwarta wieczorem, nocny sync zdejmuje ofertę,
   wysyłka rano. Rekomendacja: **zgłoszenie przechodzi, jeśli numer ma
   poprawny wzorzec** — mail niesie numer i dopisek, że oferty nie ma
   w bieżącym indeksie strony (bez tytułu, lokalizacji i linku); tak samo,
   gdy indeksu nie da się odczytać. Zapytanie klienta jest warte więcej
   niż ścisłość, a z klienta dalej nie przyjmujemy niczego poza numerem
   o sprawdzonym kształcie. Alternatywa: odrzucenie (komunikat błędu
   wysyłki z telefonem) — tracimy zapytanie.
3. **Q3 — base64 „natywnie": którym API (reguła 1 kroku 5.2).**
   Instrukcja wskazuje `Buffer` (wymaga flagi zgodności z Node
   w projekcie Pages). Statyczny import modułu Node w funkcji ma koszt
   uboczny: gdyby flagi nie było, publikacja funkcji może się nie udać —
   a ta sama funkcja obsługuje pozostałe trzy formularze
   [DO SPRAWDZENIA, nie wiem tego na pewno]. Rekomendacja: **wykrywanie
   w czasie działania, bez importu** — natywne
   `Uint8Array.prototype.toBase64` (silnik platformy), a gdy go nie ma —
   globalny `Buffer`; brak obu → 503 tylko dla `praca`, reszta formularzy
   działa. Obie ścieżki są natywne (duch reguły zachowany), unit testuje
   obie. Alternatywa: dokładnie wg instrukcji (`Buffer` z importem) —
   wtedy potrzebuję potwierdzenia, że flaga jest włączona i że pomiar 5.2
   szedł tą ścieżką.
4. **Q4 — moduł formularzy na detalu: od razu czy leniwie.**
   Rekomendacja: **od razu** (`initForms()` w skrypcie detalu, jak na
   pozostałych stronach): moduł jest wspólnym, już cache'owanym plikiem
   (2,5 KB gzip), skrypty modułowe nie blokują renderu, a wariant leniwy
   otwiera okno, w którym szybka wysyłka poszłaby natywnym POST-em (303
   i utrata wpisanych danych). Koszt: `script` detalu 22 % → ok. 29 %
   bramki. Alternatywa: `import()` przy zbliżeniu sekcji do okna —
   oszczędza ok. 2,5 KB na wejściu kosztem dodatkowej mechaniki.
5. **Q5 — potwierdzenie w `/praca/` (F66).** „3 dni robocze" to
   deklaracja wobec klientów; w rekrutacji byłaby NOWYM zobowiązaniem
   klientki wobec każdego kandydata. Rekomendacja: **potwierdzenie bez
   deklaracji czasu** („Zgłoszenie wysłane." + jedno zdanie robocze,
   PLACEHOLDER do potwierdzenia przez klientkę); ramka dostaje wariant
   potwierdzenia bez czasu odpowiedzi. Alternatywa: ta sama deklaracja co
   w pozostałych formularzach.
6. **Q6 — formularz przy ofertach nieaktywnych.** Rekomendacja:
   **formularz na każdym detalu** (rezerwacja, sprzedane, wynajęte) —
   parytet z obecną stroną; pytanie o sprzedaną ofertę to zwykle „macie
   coś podobnego?". Alternatywa: tylko oferty aktywne i rezerwacje.
7. **Q7 — co znaczy `SHOW_PRACA = false` dla trasy.** Dziś flaga zdejmuje
   pozycję z menu i stopki, a trasa buduje się zawsze. Rekomendacja:
   wyłączona flaga dodatkowo **zdejmuje stronę z sitemapy, daje jej
   `noindex`, zamienia formularz na krótką informację z linkiem do
   kontaktu, a funkcja odrzuca `form=praca`** — adres nie znika (stare
   linki nie kończą się 404), ale nie przyjmuje zgłoszeń. Stan wyłączony
   pilnuje unit (funkcja, lista sitemapy); e2e biega na fladze włączonej.
   Alternatywa: bez zmian (flaga = tylko nawigacja).
8. **Q8 — rozdzielenie arkuszy listy i detalu w PR 1** — tylko jeśli
   pomiar z §5 pokaże ruch LCP; wtedy przedstawię liczby i zapytam przed
   zmianą.

## 10. Uzupełnienia po implementacji — PR 1 (`feat/oferta-zapytanie`)

Decyzje Q1–Q8 zapadły wg rekomendacji (2026-10-04). PR 1 realizuje Q2
(numer spoza indeksu nie odrzuca zgłoszenia), Q4 (moduł formularzy na
detalu od razu), Q6 (formularz na każdym detalu) i zostawia Q8 do
decyzji po liczbach z §10.3; Q1, Q3, Q5, Q7 należą do PR 2.

### 10.1 Co powstało

- `src/lib/contact-form.ts` — rodzaj `oferta` aktywny: `OFFER_NUMBER_RE`,
  `OfertaData`, pole `offer` w walidacji, `isFormPagePath` (strony
  formularzy + adresy detali), `MailOffer` i `MailContext.offer`,
  `OFFER_NOT_IN_INDEX`, mail D w `buildMail`.
- `functions/api/kontakt.ts` — `lookupOffer` (indeks przez binding
  `ASSETS`, wpis sprawdzany co do kształtu), odpowiedź 411 dla żądania
  bez deklaracji rozmiaru, powrót 303 na detal oferty.
- `src/lib/routes.ts` — `OFFERS_INDEX_PATH`.
- `src/components/forms/`: `FormFrame.astro` (propy `tone`, `labelledby`,
  `under`), `FormField.astro` (prop `value` — treść startowa pola
  wielowierszowego), `form-ui.ts` (dosuwanie pod drugi pasek, błąd pola
  bez opakowania → komunikat błędu wysyłki), `forms.css` (wariant
  `fm-frame--dark`), `forms-copy.ts` (`OFERTA_FORM_COPY`).
- `src/components/offers/OfferInquiry.astro` (nowy), sekcja kontaktu
  w `OfferDetailPage.astro` i `offer-detail.css`, `initForms` w
  `src/scripts/offer-detail.ts`; token `--error-light` w `global.css`.
- Testy: unit `contact-form` (63 testy, +17) i `contact-endpoint` (29,
  +10); e2e `oferta-zapytanie.spec.ts` (nowy, 15 testów) i poprawki
  locatorów w `oferta.spec.ts`; visual `oferta.spec.ts` + 2 zrzuty.

### 10.2 Rozstrzygnięcia w trakcie (ciąg dalszy §2)

| # | Temat | Rozstrzygnięcie |
| --- | --- | --- |
| F71 | Cel powrotu po wysyłce bez JS | tylko adresy DETALI (`/oferty/{rodzaj}/{lokalizacja}/{numer}/`), nie całe `/oferty/…` — listy nie mają formularza; test z 5A („Referer listy → strona kontaktu") został bez zmian |
| F72 | Próg rozmiaru w PR 1 | wchodzi sama odpowiedź 411 (żądanie bez `Content-Length` nie jest czytane); drugi próg — górny dla CV i próg rodzaju — dochodzi razem z rodzajem `praca` w PR 2. Pomocnik testów ustawia nagłówek jawnie (obiekt `Request` w Node nie dokłada go sam) |
| F73 | Błąd pola, które nie ma opakowania | `setErrors()` zwraca, czy cokolwiek się zapaliło; gdy nie (ukryty numer — z walidacji klienckiej albo z odpowiedzi 400) → komunikat błędu wysyłki. Przy okazji: komunikat błędu wysyłki gaśnie na początku KAŻDEJ próby (wcześniej dopiero po przejściu walidacji) |
| F74 | Przycisk wysyłki bez tła | arkusz stron treściowych (`content.css` z klasą `sx-btn`) nie jest ładowany na trasie ofert — przycisk był gołym tekstem. Wygląd przycisku miedzianego detalu dopisany w `offer-detail.css` (`.od-inquiry .sx-btn.fm-send`, tekst `--ink`); bez importu całego arkusza treściowego |
| F75 | Położenie linku „Wróć do listy ofert" | w DOM stoi PO formularzu (telefon: pod formularzem, jak w designie); od 1025 px siatka sekcji stawia go pod lewą kolumną. Kolejność fokusu na desktopie: karta agenta → formularz → powrót |
| F76 | Kreska nad formularzem na telefonie | nie wchodzi — wiersze kontaktu mają własną dolną kreskę, druga dawała podwójną linię |
| F77 | Przycisk wysyłki na telefonie | do lewej, stała szerokość z treści (design detalu) — inaczej niż pełna szerokość w `/kontakt/`; cel dotykowy ≥ 48 px (e2e) |
| F78 | **F55 — pomiar kontrastu** | metoda F40: zrzut pełnej strony z przezroczystym tekstem, kontrast liczony dla każdego piksela tła w prostokątach linii tekstu, wynik = 5. percentyl; 9 rozmiarów okna (1920×1080, 1366×768, 1025×768, 1024×768, 768×1024, 412×915, 390×844, 360×640, 320×568), dwa detale, stany „błędy" i „potwierdzenie". Najgorsze wyniki: link do polityki (`--copper-light`) 6,6:1; komunikat błędu (`--error-light`) 6,8:1; podpowiedź pary (biel `.78`) 8,7:1; nota (biel `.78`) 8,8:1; akapit potwierdzenia (biel `.86`) 9,1:1; zgoda (biel `.86`) 10,0:1; nagłówek potwierdzenia 11,3:1; blok błędu wysyłki 11,3:1; link powrotu 12,5:1. Wszystko powyżej 4,5:1 z zapasem — krycia zostają |
| F79 | Zrzuty elementu sekcji | chowane są pasek fixed, pasek kotwic i pasek dolny (wszystkie trzy wjeżdżałyby na zszywany zrzut) |
| F80 | Sloty telefonu w sekcji kontaktu | komunikat błędu i potwierdzenie formularza niosą własne `a[data-tel]`, więc locator `a[data-tel]` w obrębie sekcji przestał być jednoznaczny — testy detalu celują w `a.od-contact-row[data-tel]` |

### 10.3 Budżet (pomiar jak §12.5 analizy 4.2, `pnpm build:visual`; baza = `main` zbudowany tą samą komendą)

| Zasób | main | PR 1 | różnica |
| --- | --- | --- | --- |
| `script` detalu (brutto / gzip -9) | 15 662 / 6 608 B, 6 plików | 21 843 / 9 309 B, 7 plików | + 6 181 / + 2 701 B, + 1 żądanie (wspólny `form-ui`) |
| `form-ui.*.js` (wspólny chunk) | 5 802 / 2 540 B | 6 131 / 2 710 B | + 329 / ok. + 130–170 B |
| skrypt detalu | 6 203 / 2 586 B | 6 253 / 2 612 B | + 50 / + 26 B |
| HTML detalu (mieszkanie) | 49 905 / 10 068 B | 53 921 / 11 508 B | + 4 016 / + 1 440 B |
| CSS trasy `[...path]` (lista rodzaju I detal) | 82 876 / 17 629 B, 3 arkusze | 90 678 / 19 616 B, **4 arkusze** | + 7 802 / + 1 987 B, **+ 1 arkusz blokujący** (`FormFrame.*.css` 7 003 / 1 855 B) |
| `/kontakt/` `script` | 14 049 / 5 995 B | 14 378 / 6 128 B | + 329 / + 133 B |
| `/kontakt/` CSS | 39 378 / 9 276 B | 40 784 / 9 486 B | + 1 406 / + 210 B (wariant ciemny) |
| `/sprzedaj-z-nami/` `script` | 16 415 / 7 370 B | 16 744 / 7 498 B | + 329 / + 128 B |
| „/", `/oferty/`, `/praca/` | bez zmian skryptów; CSS + 22 B (token) | | |
| wyspa listy `SearchIsland` | 38 653 B | 38 653 B | co do bajta |

(Liczby `script` z tej tabeli obejmują moduły importowane statycznie
przez skrypty strony; różnią się o kilkadziesiąt bajtów od sum z analiz
4.3 i 5A, które liczyły pliki wymienione w HTML.)

**LHCI lokalnie (1 przebieg, oba configi — asercje czyste na 10
adresach):** detale `script` 12 039 B = **30 % bramki 40 000 B** (main:
8 936 B = 22 %), `total` mobile 306–465 KB, TBT 0, CLS 0; LCP mobile
2 185 / 2 423 / 2 287 / 2 721 ms (mieszkanie / dom / działka / lokal),
desktop 497–656 ms; lista rodzaju `script` 28 987 B (72 %), LCP mobile
2 499 ms; `/kontakt/` `script` 8 450 B (21 %), `/sprzedaj-z-nami/`
12 477 B (31 %).

**Q8 — wpływ dodatkowego arkusza (3 przebiegi mobile, main kontra PR 1,
ta sama maszyna):**

| Adres | FCP main → PR | LCP main (3 przebiegi) | LCP PR (3 przebiegi) |
| --- | --- | --- | --- |
| lista `mieszkanie-na-sprzedaz` | 1 286 → 1 287 ms | 2 425 / 2 425 / 2 497 | 2 420 / 2 491 / 2 491 |
| detal mieszkania | 1 067 → 1 139 ms | 2 112 / 2 053 / 2 133 | 2 187 / 2 189 / 2 154 |
| detal działki | 1 059 → 1 138 ms | 2 268 / 2 713 / 2 268 | 2 788 / 2 785 / 2 186 |

Odczyt: dodatkowy arkusz kosztuje na detalu **ok. 70–80 ms FCP i ok.
60–80 ms LCP**; lista rodzaju — w granicach szumu. Detal działki jest
dwumodalny na OBU buildach (ok. 2,2 s albo ok. 2,75 s — zależnie od tego,
który obraz wygrywa wyścig), więc mediana z trzech przebiegów nie
rozstrzyga; najgorszy przebieg PR 1 to 2 788 ms przy progu 3 200 ms
(margines ok. 0,41 s — jak po 4.3). Asercje bramki przechodzą; progi
nietknięte. **Decyzja Q8 (Mateusz, 2026-10-04, wg rekomendacji):** koszt
przyjęty w PR 1; rozdzielenie arkuszy listy i detalu zostaje na PR
porządkowy (zdjęłoby z listy cały arkusz detalu, czyli więcej niż dokłada
ten PR). Wyjątek: czerwony job `lighthouse` na LCP detalu przy tych
bajtach — wtedy rozdzielenie wchodzi od razu, osobnym małym PR-em.

### 10.4 Weryfikacja lokalna

- format, lint, typecheck — czyste (2 podpowiedzi zastane, spoza zakresu);
  unit 477 testów: 475 zielonych + 2 skip (38 plików); build 89 stron;
  `test:dist` 6/6.
- `pnpm test:e2e` na 6 profilach: **591 zielonych** (909 pominięć
  profili), 0 czerwonych; nowy `oferta-zapytanie.spec.ts` = 15 testów
  (35 przebiegów na 3 profilach); axe 0 naruszeń w trzech stanach
  formularza (desktop i Pixel 5; allowlista PUSTA).
- `test:visual`: **36 czerwonych OCZEKIWANYCH** — 24 zrzuty pełnej strony
  detalu (4 warianty × 6 profili; formularz w sekcji kontaktu) + 12
  nowych bez baseline'u (`oferta-form-errors`, `oferta-form-done` × 6);
  157 zielonych. Drugi przebieg nowych zrzutów na zapisanych plikach:
  12/12 stabilne (zrzuty robocze usunięte — baseline'y powstają wg
  świętej kolejności). Pomiar progiem 0: `oferta-druk`,
  `oferta-lightbox`, `kontakt-*`, `sprzedaj-*`, `oferty-*`, `chrome-*` —
  0 różnic, z wyjątkiem `chrome-footer` na `webkit-iphone-14`
  (niestabilność zastana, F47 w analizie 5A; w zwykłym przebiegu zielony).

### 10.5 PLACEHOLDER (U9)

`forms-copy.ts` (`OFERTA_FORM_COPY.frame`): zdanie o celu w nocie,
„Wyślij zapytanie", „Zapytanie wysłane.", zdania potwierdzenia, komunikat
błędu wysyłki, „Napisz kolejną wiadomość". Treść startowa wiadomości,
etykiety, komunikaty pól i zgoda — nie są placeholderami.

### 10.6 Co sprawdzić na `nowa.` i na fizycznym telefonie

Lista z §8 pkt 5–7 i 10 + po implementacji:

1. **Sekcja kontaktu na telefonie:** kolejność karta agenta → formularz →
   „Wróć do listy ofert"; długość sekcji (formularz wydłuża ją o ok. dwa
   ekrany) — czy „Napisz" z paska dolnego ląduje w miejscu, z którego
   widać, że niżej jest formularz.
2. **Pasek dolny:** znika po dotknięciu pola, nie wraca w trakcie pisania
   (także przy przełączaniu pól klawiszem „Dalej"), wraca po zamknięciu
   klawiatury i dotknięciu poza formularzem.
3. **Białe pola na granacie:** autouzupełnianie (tło pola po wypełnieniu
   przez przeglądarkę), kursor i zaznaczenie tekstu, czerwony obrys
   błędu w słońcu.
4. **Checkbox zgody:** znaczek w kolorze miedzi na ciemnym tle (iOS
   rysuje natywny znaczek po swojemu).
5. **Treść startowa wiadomości:** da się ją skasować i wpisać własną;
   po „Napisz kolejną wiadomość" wraca.
6. **Błąd i potwierdzenie:** pole z błędem pod paskiem kotwic (Safari
   iOS), potwierdzenie widoczne bez przewijania.
7. **Na `nowa.` DO kroku 5.1:** wysyłka kończy się komunikatem błędu
   z numerem telefonu; w narzędziach przeglądarki odpowiedź **503**
   (gdyby była 411 — przeglądarka nie wysłała `Content-Length` i trzeba
   wrócić do F72, zanim wejdzie 5.1).
8. **PO 5.1 (wysyłka 5.5 — Mateusz):** mail z tematem z numerem oferty,
   tytułem i lokalizacją pod nagłówkiem, numerem jako linkiem do oferty
   na `nowa.`; gdyby zamiast tytułu przyszedł dopisek o braku oferty
   w indeksie — binding plików statycznych nie działa (§6 pkt 1).

### 10.7 Do decyzji / do wykonania poza kodem (Mateusz)

Decyzje Mateusza z 2026-10-04 („wszystko wg rekomendacji"):

1. **Q8** — koszt dodatkowego arkusza przyjęty; rozdzielenie arkuszy
   w PR porządkowym (§10.3).
2. **Kolejność:** kroki 5.1 i 5.2 nadal przed nami; ~~bez wyniku 5.2
   PR 2 (`/praca/`) nie rusza~~ — **decyzja zmieniona 2026-10-04:**
   najpierw cały design (5B PR 2 → 4.5 → 4.6 → 4.7), blok chmury na końcu
   (5.1 → 5.2 → 5.5); PR 2 powstaje z limitem CV jako stałą, pomiar 5.2
   później na gotowej funkcji (§11.7).
3. **Runner CI:** etykieta `ubuntu-latest` zmienia wersję systemu od
   2026-10-19 — workflowy z przeglądarkami i pomiarem (CI, baseline'y
   linux, pomiar LHCI, smoke) dostają przypiętą wersję `ubuntu-24.04`
   osobnym małym PR-em (`chore/ci-pin-runner`), po merge'u PR 1.
4. Zaległe z 5A (analiza 5A §11.7): gradient hero „Sprzedaj z nami" na
   telefonie zostaje (cena kontrastu AA); utwardzenie `chrome-footer`
   i korekta komentarza bramki ruchu — w PR porządkowym.

## 11. Uzupełnienia po implementacji — PR 2 (`feat/praca`)

PR 2 realizuje Q1 (para kontaktowa), Q3 (base64 natywnie z wykrywaniem
w czasie działania), Q5 (potwierdzenie bez deklaracji czasu), Q7
(znaczenie wyłączonego przełącznika) oraz F57–F70. Limit CV to jedna
stała `CV_MAX_BYTES`; pomiar czasu procesora (krok 5.2) odbędzie się na
tej funkcji po założeniu zasobów w chmurze — §11.7.

### 11.1 Co powstało

- `src/lib/cv-file.ts` (nowy) — `CV_MAX_BYTES`, `CV_TYPES` (rozszerzenie,
  etykieta, sygnatura, MIME), `detectCvSignature`, `cvTypeOf`,
  `sanitizeCvName`, `formatFileSize`, teksty i atrybuty liczone ze stałych
  (`cvAccept()`, `cvTypesLabel()`, `cvLimitLabel()`), reguła `checkCv`.
- `src/lib/mail-attachment.ts` (nowy) — `pickBase64Encoder` (dwie ścieżki
  natywne, wykrywane w czasie działania), `withAttachment` (doklejenie
  załącznika do zserializowanej wiadomości).
- `src/lib/contact-form.ts` — rodzaj `praca` aktywny (za przełącznikiem:
  `isActiveFormKind(value, showPraca)`), `CV_REQUEST_MAX_BYTES`,
  `FUTURE_RECRUITMENT_CONSENT`, pola `cv` / `cv-type` / `cv-size`,
  `PracaData`, typ `CvCheck` i trzeci parametr `validateForm`, mail C.
- `functions/api/kontakt.ts` — próg górny żądania przed czytaniem treści,
  próg formularzy tekstowych i zakaz plików po odczytaniu rodzaju, opis
  pliku składany przez funkcję (sygnatura z pierwszych bajtów), kodowanie
  na końcu, treść żądania z doklejonym załącznikiem, log ścieżki kodowania.
- `src/lib/routes.ts` — `isSitemapPath` (filtr sitemapy za przełącznikiem);
  `astro.config.mjs` korzysta z niego.
- `src/components/forms/`: `FormFile.astro`, `FormMail.astro`,
  `form-file.ts` (nowe); `FormFrame.astro` (propy `consent`, `contact`,
  `enctype`; potwierdzenie bez czasu przez `doneUntimed` w tekstach),
  `form-ui.ts` (opis pól plikowych w `readRaw()`, odpowiedź 413,
  `initForms(root, checkCv)`), `forms-copy.ts` (`PRACA_FORM_COPY`).
- `src/pages/praca.astro` + `src/components/sections/jobs/` (`JobsHero`,
  `JobsForm`, `JobsClosed`, `jobs-copy.ts`, `jobs-config.ts`).
- Testy: unit `cv-file` (nowy, 23), `site-flags` (nowy, 7),
  `contact-form` (80, +17), `contact-endpoint` (44, +15); e2e
  `praca.spec.ts` (nowy, 24 testy); visual `praca.spec.ts` (nowy,
  4 zrzuty × 6 profili); `tests/helpers/forms.ts` — `recordPosts`
  zapisuje pola plikowe (nazwa, rozmiar, typ); `/praca/` w obu
  `lighthouserc*.cjs`.

### 11.2 Rozstrzygnięcia w trakcie (ciąg dalszy §2 i §10.2)

| # | Temat | Rozstrzygnięcie |
| --- | --- | --- |
| F81 | **Pole pliku: jedna etykieta zamiast strefy-etykiety** (§3.3 pkt 1 zakładał `<label>` „CV" + strefę jako drugi `<label>` i ukryty `input`) | natywny `input type="file"` leży NA CAŁEJ strefie (przezroczysty, fokusowalny). Dwie etykiety jednego pola dawały w axe wynik „do przeglądu" i ryzyko, że czytnik na iOS przeczyta tylko jedną. Zyski uboczne: klik i dotyk w dowolnym miejscu strefy bez pośrednictwa etykiety, upuszczenie pliku działa NATYWNIE także bez JS. Dopisek typów i limitu jest opisem pola (`aria-describedby`), napisy dublujące natywną kontrolkę („Wybierz plik", nazwa pliku) są ukryte przed czytnikami — nazwę wybranego pliku ogłasza samo pole |
| F82 | F70 — „lub przeciągnij go tutaj" tylko po uzbrojeniu skryptem | po F81 upuszczenie działa bez JS, więc dopisek jest widoczny od 1025 px zawsze (bez przeskoku układu po uzbrojeniu). Moduł `form-file.ts` dokłada podświetlenie strefy i jedną ścieżkę dla wszystkich przeglądarek (pierwszy z upuszczonych plików → pole → `change`) |
| F83 | **Reguły pliku poza bundlem pozostałych formularzy** (§5 obiecywał „`form-ui` bez dalszego wzrostu") | pierwsza wersja trzymała reguły pliku w `validateForm` — wspólny chunk rósł o 1 483 B brutto / 666 B gzip na `/kontakt/`, `/sprzedaj-z-nami/` i detalu. Reguły przeniesione do `src/lib/cv-file.ts`, a `validateForm` dostaje kontrolę pliku jako PARAMETR (`checkCv`): przekazują ją strona `/praca/` i funkcja — nadal jedna reguła po obu stronach. Wzrost wspólnego chunku: 467 B / 203 B gzip (opis pól plikowych, 413, gałąź `praca`). Skutek: stała `CV_MAX_BYTES` żyje w `cv-file.ts`, nie w `contact-form.ts` (F60 wskazywał ten drugi plik) |
| F84 | Cykl importów | `cv-file.ts` importował wartość z `contact-form.ts`, a ten — wartość z `cv-file.ts`; stała liczona na poziomie modułu wychodziła `NaN` (wyłapał unit). `cv-file.ts` bierze z `contact-form.ts` wyłącznie typy; `CV_REQUEST_MAX_BYTES` liczy się w `contact-form.ts` |
| F85 | Kiedy plik jest walidowany | przy WYSYŁCE, jak pozostałe pola (komunikat + fokus na polu pod paskiem); wybór pliku pokazuje od razu nazwę i rozmiar w strefie. Kontrola przy wyborze wymagałaby drugiej ścieżki zapalania błędów obok `form-ui.ts` |
| F86 | Kolejność kontroli pliku | brak pliku → `cv`; rozszerzenie spoza listy → `cv-type`; rozmiar ponad limit → `cv-size`; plik pusty albo sygnatura niezgodna z rozszerzeniem (tylko funkcja) → `cv-type`. Zły typ wygrywa z rozmiarem (plik i tak nie do przyjęcia). Odpowiedź 413 funkcji zapala `cv-size`, gdy formularz ma takie opakowanie |
| F87 | Opis pliku po stronie funkcji | funkcja KASUJE pola tekstowe `cv:name` / `cv:size` / `cv:sig` dosłane przez klienta i składa opis sama z obiektu pliku; sygnaturę czyta z pierwszych 8 bajtów (wycinek), pełny plik — dopiero po pułapce, walidacji, sekretach, Turnstile i liczniku. Test mierzy rozmiary odczytów: żądanie odsiane czyta najwyżej 8 bajtów |
| F88 | Brak natywnego kodowania na platformie | 503 `encoder` tylko dla `praca`, sprawdzane razem z sekretami (przed Turnstile — nie zużywa tokenu ani licznika); pozostałe formularze działają. Funkcja loguje ścieżkę kodowania i rozmiar pliku (bez nazwy pliku i danych kandydata) — pomiar 5.2 ma wiedzieć, co mierzy |
| F89 | Nazwa załącznika (F64) | bez ścieżki, znaki diakrytyczne → litery podstawowe, wszystko spoza `[A-Za-z0-9._-]` → `-`, do 80 znaków, rozszerzenie z walidacji; nazwa pusta po oczyszczeniu (np. zapis niełaciński) → `CV.{rozszerzenie}` |
| F90 | Mail C | temat: dotychczasowy prefiks + „zgłoszenie do pracy"; nagłówek i etykiety w kolejności maila dotychczasowej strony (kandydat, e-mail, telefon, treść — pomijana, gdy pusta), linia „CV: nazwa (rozmiar)", zgoda na przyszłe rekrutacje Tak / Nie + brzmienie; bez nagłówka „Dane kontaktowe" i bez linii zgody marketingowej; stopka jak w pozostałych |
| F91 | **Zdjęcie pod szklanym paskiem (telefon, tablet) a kontrast logo i przycisku menu** | design kładzie zdjęcie pod pasek; logo i kreski przycisku menu są granatowe. POMIAR (kontrast granatu względem każdego piksela tła w prostokącie elementu; mediana i 5. percentyl; 7 rozmiarów okna od 320×568 do 1024×768, Chromium i WebKit): bez korekty przycisk menu na tablecie 2,20–2,65:1 (mediana; 5. percentyl do 1,80:1) — poniżej 3:1 wymaganych dla elementów interfejsu; telefon 3,7–4,8:1. **Wdrożone:** pas zdjęcia pod paskiem rozjaśniony kolorem tła strony (krycie .5, wyłącznie na wysokości paska — poniżej paska zdjęcie bez zmian). Po zmianie: 5. percentyl ≥ 4,58:1, mediana ≥ 4,96:1 we wszystkich rozmiarach i obu silnikach. Axe tego nie liczy — pomiar jest jedynym strażnikiem; chrome bez zmian |
| F92 | Ramka formularza po zmianach (wymóg: HTML trzech istniejących formularzy bez zmian) | porównanie odciskiem na `build:visual` (hashe nazw zasobów znormalizowane): `/kontakt/`, `/sprzedaj-z-nami/`, detal oferty, „/", `/oferty/`, lista rodzaju, 404 — identyczne. Po drodze wyrażenie warunkowe w miejscu elementu zgubiło jedną spację za slotem telefonu w potwierdzeniu (bez znaczenia dla wyglądu) — przywrócona jawnie |
| F93 | Potwierdzenie i sloty (Q5, F66) | potwierdzenie: nagłówek + jedno zdanie, bez czasu odpowiedzi i bez kontaktu; adres e-mail biura stoi w trzech miejscach: komunikat o za dużym pliku, błąd wysyłki, „Wolisz mailem?" pod przyciskiem (to zdanie znika bez JS razem ze slotem) |
| F94 | Stan wyłączonego przełącznika (Q7) | strona: `JobsClosed` (nagłówek, zdanie, przycisk do kontaktu), `noindex`, bez canonicala i preloadów zdjęcia; poza sitemapą i nawigacją; funkcja: `form=praca` → 400 jak nieznany rodzaj; strona nadal jest celem powrotu po wysyłce bez JS. Pilnuje unit `site-flags` (moduły ładowane z podmienionym configiem) + jednorazowa kontrola builda z wyłączonym przełącznikiem (wynik zgodny). E2E biegają na przełączniku włączonym — przestawienie go wymaga przeglądu speców z listą tras statycznych |
| F95 | Układ desktop | imię, e-mail, telefon w jednym rzędzie: para kontaktowa zajmuje dwie kolumny siatki i trzyma tę samą szczelinę, podpowiedź i błąd pary pod jej dwiema kolumnami; treść (dwie kolumny) obok strefy pliku (ta sama wysokość — także gdy pod strefą stoi komunikat); jeden checkbox i nota w szerokości czytelnej linii zamiast trzech kolumn zgód z designu; przycisk i „Wolisz mailem?" w jednym wierszu |
| F96 | Style pola pliku | w komponencie `FormFile.astro` (scoped), nie w `forms.css` — wspólny arkusz formularzy ładuje się też na trasach ofert (lekcja §10.3) |

### 11.3 Budżet (pomiar jak §10.3, `pnpm build:visual`; baza = `main` zbudowany tą samą komendą)

| Zasób | main | PR 2 | różnica |
| --- | --- | --- | --- |
| `/praca/` `script` (brutto / gzip -9) | 8 205 / 3 393 B, 4 pliki (szkielet) | 16 852 / 7 329 B, 6 plików | chrome + `form-ui` 6 598 / 2 876 B + skrypt strony 2 037 / 1 051 B (pole pliku i reguły pliku) |
| `/praca/` CSS | 27 685 / 6 064 B, 1 arkusz | 40 837 / 9 578 B, 3 arkusze | wspólny arkusz formularzy 7 079 / 1 865 B + arkusz strony 6 073 / 1 649 B |
| `/praca/` HTML | 16 989 / 3 486 B | 26 644 / 6 524 B | |
| `form-ui.*.js` (wspólny chunk) | 6 131 / 2 673 B | 6 598 / 2 876 B | + 467 / + 203 B |
| `/kontakt/` `script` | 14 378 / 6 128 B | 14 857 / 6 340 B | + 479 / + 212 B |
| `/sprzedaj-z-nami/` `script` | 16 744 / 7 498 B | 17 223 / 7 709 B | + 479 / + 211 B |
| detal oferty `script` | 21 843 / 9 309 B | 22 322 / 9 519 B | + 479 / + 210 B |
| wspólny arkusz formularzy (`/kontakt/`, `/sprzedaj-z-nami/`, trasa ofert) | 7 003 / 1 829 B | 7 079 / 1 865 B | + 76 / + 36 B (reguła slotu adresu) |
| „/", `/oferty/`, lista rodzaju, 404, szkielety | | | `script` + 12 B (moduł przełączników), CSS bez zmian |
| wyspa listy `SearchIsland` | 38 653 B | 38 653 B | co do bajta |
| HTML `/kontakt/`, `/sprzedaj-z-nami/`, detalu, „/", `/oferty/`, 404 | | | identyczny (odcisk) |

**LHCI lokalnie (1 przebieg, oba configi — asercje czyste na 11
adresach):** `/praca/` `script` 9 696 B = **24 % bramki 40 000 B**,
`total` 176 KB mobile / 197 KB desktop, LCP mobile 1 964 ms (element LCP
= zdjęcie hero; margines ok. 1,24 s do 3 200 ms), desktop 488 ms, TBT 0,
CLS 0,000 / 0,003, zero podmiotów trzecich. Pozostałe: detale `script`
12 256 B (31 %; było 30 %), LCP mobile 2 118 / 2 570 / 2 711 / 2 723 ms
(mieszkanie / dom / działka / lokal — w dotychczasowym rozrzucie), lista
rodzaju 29 003 B (73 %), `/kontakt/` 8 670 B (22 %), `/sprzedaj-z-nami/`
12 697 B (32 %), „/" 10 590 B (26 %). Progi nietknięte. Arkusz blokujący
na trasie ofert urósł o 36 B gzip — bez wpływu na pomiar z §10.3.

Czas funkcji: ścieżka `praca` robi kolejno rozbiór `multipart` (kod
platformy), odczyt 8 bajtów sygnatury, walidację, a po Turnstile
i liczniku — jeden odczyt pliku do pamięci, base64 natywnie i sklejenie
treści żądania (bez serializacji załącznika). To jest to, co zmierzy
krok 5.2 (§11.7).

### 11.4 Weryfikacja lokalna

- format, lint, typecheck — czyste (2 podpowiedzi zastane, spoza zakresu);
  unit 539 testów w 40 plikach: 537 zielonych + 2 skip przy `dist/`
  z `build:visual` (532 + 7 skip bez `dist/media`); build 89 stron;
  `test:dist` 6/6.
- `pnpm test:e2e` na 6 profilach: **643 zielone** (1 001 pominięć
  profili), 0 czerwonych; nowy `praca.spec.ts` = 24 testy (52 przebiegi
  na 3 profilach); axe 0 naruszeń w pięciu stanach formularza (wyjściowy,
  błędy, za duży plik, plik wybrany, potwierdzenie; desktop i Pixel 5;
  allowlista PUSTA).
- `test:visual`: **24 czerwone OCZEKIWANE** (nowe zrzuty `praca-*` bez
  baseline'u), 193 zielone. Drugi przebieg nowych zrzutów na zapisanych
  plikach: 24/24 stabilne (zrzuty robocze usunięte — baseline'y powstają
  wg świętej kolejności). Pomiar progiem 0 pozostałych speców
  (`kontakt`, `sprzedaj`, `oferta`, `chrome`, `home`, `oferty`,
  `not-found`): 191 identycznych; różni się wyłącznie zastany
  `not-found-top` na dwóch profilach desktop (828 i 877 px, pod progiem —
  stan z 4.1, bez związku z PR 2).
- Jednorazowy build z wyłączonym przełącznikiem: strona bez formularza,
  `noindex`, poza sitemapą i nawigacją (F94); przełącznik przywrócony.

### 11.5 PLACEHOLDER (U9)

`jobs-copy.ts`: eyebrow, nagłówek (dwie frazy), opis zdjęcia, teksty
stanu wyłączonego. `forms-copy.ts` (`PRACA_FORM_COPY`): etykieta
i placeholder treści, „Wybierz plik", „lub przeciągnij go tutaj", „Nie
wybrano pliku", trzy komunikaty pola pliku, „Wolisz mailem? Wyślij CV na
adres:", zdanie o celu w nocie, „Wyślij zgłoszenie", potwierdzenie
(nagłówek + zdanie, bez deklaracji czasu), błąd wysyłki. **Nota
rekrutacyjna i brzmienie zgody na przyszłe rekrutacje
(`FUTURE_RECRUITMENT_CONSENT` w `contact-form.ts`) — do weryfikacji
prawnej razem z polityką (4.7).** Nie są placeholderami: etykiety
i komunikaty pól wspólnych, dopisek typów i limitu (liczony ze stałych).

### 11.6 Co sprawdzić na `nowa.` i na fizycznym telefonie

Lista z §8 pkt 1–4 i 8–10 (wybór pliku!) + po implementacji:

1. **iOS (Safari) — wybór pliku:** dotknięcie strefy otwiera arkusz
   systemowy; czy jest w nim „Wybierz pliki" (a nie tylko zdjęcia); PDF
   z aplikacji Pliki i z iCloud Drive (plik niepobrany lokalnie) —
   w strefie pojawia się nazwa i rozmiar; plik `.pages` albo zdjęcie →
   po wysyłce komunikat o typie.
2. **Android (Chrome) — wybór pliku:** okno wyboru dokumentów, plik
   z Dysku Google i z „Pobrane"; powrót z okna nie przeładowuje strony
   i nie gubi wpisanych pól; rozmiar w strefie zgadza się z plikiem.
3. **Strefa pliku:** trafialność kciukiem (cała strefa reaguje, nie tylko
   granatowy przycisk), długa nazwa pliku kończy się wielokropkiem,
   rozmiar zostaje widoczny.
4. **Plik większy niż limit:** komunikat pod strefą, adres e-mail
   klikalny (otwiera pocztę), pola i plik zachowane; po wybraniu
   mniejszego pliku komunikat znika.
5. **Zdjęcie pod paskiem (telefon, tablet):** logo i przycisk menu
   czytelne nad rozjaśnionym pasem zdjęcia — także w słońcu; granica
   rozjaśnienia niewidoczna pod dolną krawędzią paska przy przewijaniu.
6. **Desktop:** przeciągnięcie pliku z pulpitu na strefę (podświetlenie,
   nazwa w strefie); upuszczenie OBOK strefy otwiera plik w karcie —
   zachowanie przeglądarki, do oceny, czy przeszkadza.
7. **Klawiatura ekranowa:** pole treści i przycisk wysyłki nie chowają
   się pod klawiaturą; po błędzie pole z komunikatem stoi pod paskiem.
8. **Na `nowa.` DO kroku 5.1:** wysyłka z plikiem kończy się komunikatem
   błędu z adresem e-mail; w narzędziach przeglądarki odpowiedź **503**
   z treścią JSON `config` (nie 411, nie 413). Plik nieco poniżej limitu
   też ma dać 503 — gdyby wyszło 413, narzut żądania jest większy niż
   założony zapas (do zgłoszenia przed 5.2).
9. **PO 5.1 i 5.2 (wysyłki 5.5 — Mateusz):** mail C z załącznikiem, który
   się otwiera (PDF, DOC, DOCX), z nazwą bez polskich znaków i właściwym
   typem; linia „CV: nazwa (rozmiar)"; „Odpowiedz" pisze do kandydata.

### 11.7 Pomiar limitu CV (krok 5.2) na tej funkcji

Pomiar odbywa się na gotowej funkcji `/api/kontakt` z formularza
`/praca/` — na podglądzie PR-a albo na `nowa.`, po kroku 5.1.

1. **Środowisko (Preview albo Production projektu Pages):** sekrety
   funkcji z kroku 5.1 (usługa pocztowa, Turnstile) ustawione w TYM
   środowisku; klucz publiczny Turnstile wpisany w `form-config.ts`
   (osobny commit — bez niego wysyłka kończy się odmową Turnstile, zanim
   funkcja dotknie pliku); zmienna `KONTAKT_TO` = własny adres Mateusza
   (wysyłki pomiarowe nie idą na skrzynkę biura); binding licznika
   opcjonalny.
2. **Plik:** PDF o rozmiarze DOKŁADNIE limitu (pierwsze bajty to
   sygnatura PDF, reszta dowolna) — najdroższy przypadek, który funkcja
   przyjmuje. Plik o bajt większy ma dać komunikat w przeglądarce, bez
   żądania.
3. **Wysyłki:** 10 zgłoszeń z prawdziwej przeglądarki (formularz musi
   zdobyć token Turnstile), w odstępach kilkunastu sekund.
4. **Odczyt:** podgląd logów funkcji na żywo w panelu projektu Pages
   (albo `wrangler pages deployment tail`) — każda wysyłka zostawia linię
   `kontakt: załącznik … B, base64 przez toBase64 | Buffer` (która
   ścieżka kodowania działa na platformie) oraz wynik wywołania; czas
   procesora i przekroczenia limitu — w metrykach funkcji projektu
   [DO SPRAWDZENIA w panelu: dokładne położenie widoku]. Przekroczenie
   limitu czasu procesora przeglądarka widzi jako odpowiedź z kodem błędu
   platformy 1102 (treść NIE jest naszym JSON-em — nasze 503 niosą
   `config`, `quota` albo `encoder`).
5. **Wynik ma dwie wartości:** 10/10 bez błędu 1102 → limit zostaje;
   jakikolwiek błąd 1102 → limit 1 MB.
6. **Przy wyniku 1 MB:** jedna zmiana — stała `CV_MAX_BYTES` w
   `src/lib/cv-file.ts`. Dopisek w strefie, komunikat, kontrola
   w przeglądarce, progi funkcji i testy liczą się z niej same. Do
   regeneracji: zrzuty z dopiskiem limitu — `praca-full`,
   `praca-form-errors`, `praca-form-file` × 6 profili (oba komplety,
   święta kolejność); `praca-form-done` bez zmian. Potem ponowny pomiar
   plikiem 1 MB.
7. Gdyby log pokazał `503 encoder` — platforma nie ma żadnej z dwóch
   ścieżek kodowania (flaga zgodności z Node w ustawieniach funkcji
   projektu — krok 5.1 pkt 5).

### 11.8 Decyzje i rzeczy do wykonania poza kodem (Mateusz)

Decyzje Mateusza z 2026-10-04 („wszystko wg rekomendacji") — bez zmian
w kodzie:

1. **F81 — pole pliku jako natywny input na strefie** (odejście od
   zapisu „strefa-etykieta" z §3.3): ZOSTAJE. Potwierdzenie na telefonie
   (§11.6 pkt 1–3) przy testach po całej implementacji; gdyby systemowy
   arkusz wyboru zachowywał się gorzej niż przy etykiecie — pozycja na
   listę poprawek.
2. **F91 — rozjaśnienie zdjęcia pod paskiem:** ZOSTAJE (wynika z pomiaru
   kontrastu); ocena wyglądu na telefonie — lista poprawek po całej
   implementacji.
3. **F88 — log ścieżki kodowania i rozmiaru pliku w funkcji:** ZOSTAJE na
   stałe (nie niesie nazwy pliku ani danych kandydata; przydaje się przy
   pomiarze 5.2 i przy diagnozie nieudanych wysyłek).
4. **Upuszczenie pliku obok strefy** (przeglądarka otwiera plik w karcie):
   bez obsługi; ewentualna blokada na poziomie strony — pozycja na listę
   poprawek, jeśli test na komputerze pokaże, że przeszkadza.
5. **Teksty `/praca/`** zostają jako PLACEHOLDER; nota rekrutacyjna
   i brzmienie zgody na przyszłe rekrutacje — weryfikacja prawna razem
   z polityką (4.7).
6. Blok chmury po zakończeniu widoków: 5.1 → 5.2 (§11.7) → 5.5; zapis
   w `docs/optional-todos.md`.
