---
paths:
  - "src/components/sections/**"
  - "src/components/navbar/**"
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
