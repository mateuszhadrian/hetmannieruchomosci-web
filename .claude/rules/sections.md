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

## Chrome (navbar/stopka) — stan po Etapie 0, wygląd docelowy w 4.1

- Pasek jest FIXED; treść stron odsuwa się o `var(--hdr-h)` (statyczny
  fallback w `global.css`, skrypt Navbara doprecyzowuje pomiarem).
- Stany paska: `[data-hero]` (strona ma `[data-navref]` — pasek startuje
  przezroczysty), `[data-solid]` (po zjechaniu z góry / z hero),
  `[data-open]` (otwarty sheet). Bez hero szklane tło jest widoczne
  zawsze. **Auto-hide paska NIE istnieje** — design go nie przewiduje.
- Menu mobilne = bottom sheet na `overlay.ts` (focus-trap, Esc, scrim,
  swipe-down, blokada scrolla). Nakładka z `data-overlay-kind="sheet"`
  uzbraja gest „przeciągnij w dół" i nadpisuje panelowi inline'owy
  `transform` — nie dawaj `kind="sheet"` nakładce, która na desktopie
  jest wyśrodkowanym modalem (objaw: zgubiony klik).
- **Stan paska zamraża się na czas KAŻDEJ otwartej nakładki.**
  `overlay.ts` blokuje scroll przez `body{position:fixed;top:-scrollY}`,
  co zeruje `window.scrollY`; `onScroll` Navbara wychodzi wtedy od razu
  (`sheetOpen || document.body.style.position === "fixed"`).
- Pozycja „Praca" w menu i stopce stoi za przełącznikiem `SHOW_PRACA`
  (`src/lib/site-config.ts`) — pozycje menu bierz z `src/i18n/nav.ts`,
  nie wpisuj ich w komponent.
- Firma nie ma profili w mediach społecznościowych — chrome nie ma
  sekcji social.

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
