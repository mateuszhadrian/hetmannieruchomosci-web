# Mini-analiza — domknięcie Etapów 4 i 5 (PR porządkowy)

> **Status:** ZAKODOWANA na gałęzi `chore/domkniecie-4-5` (2026-10-05).
> Zakres zaakceptowany razem z analizą 4.7 (`analiza-polityka.md` §11,
> decyzje Q6 i Q9 z 2026-10-04) — osobnego etapu akceptacji nie było;
> ten plik jest zapisem tego, co zrobione i zmierzone. Podstawa:
> instrukcja wykonawcza (dokument lokalny), „Domknięcie Etapu 4 + 5";
> pozycje „porządkowy PR domknięcia" z `docs/optional-todos.md`.
> Zasada PR-a: **zero zmian wyglądu i zachowania** — każdą pozycję
> zamyka pomiar (odcisk HTML, zrzuty progiem 0, bajty).

## 1. Pozycje i wynik

| # | Pozycja | Wynik |
| --- | --- | --- |
| D1 | Rozdzielenie arkuszy listy rodzaju i detalu oferty (Q8 analizy 5B) | **zrobione** — dwie trasy zamiast jednej (§2) |
| D2 | Utwardzenie zrzutu `chrome-footer` na `webkit-iphone-14` bez zmiany baseline'ów | **zrobione** — przyczyna znaleziona, 0 z 120 (§3) |
| D3 | Usunięcie nieużywanych plików | **zrobione** — pięć plików (§4) |
| D4 | Hero `/sprzedaj-z-nami/` na `data-px="top"` (decyzja Q9b) | **NIE zmieniane** — wzór CSS F41 zostaje (działa, ma własny kontrakt e2e; zmiana przesuwałaby kadr i wymagała regeneracji zrzutów bez zysku dla użytkownika) |
| D5 | Komentarz w bramce ruchu (F37 analizy 5A) | **zrobione** — komentarze poza skryptem inline (§5) |
| D6 | `/uslugi/` na wspólnym `content-anchor.ts` (Q6 analizy 4.7) | **NIE zmieniane po pomiarze** (§6) |
| D7 | `docs/placeholdery-tresci.md` | **zrobione** — 87 znaczników w 15 plikach, cztery warianty do wyboru, sześć wartości do potwierdzenia |
| D8 | `docs/poprawki-po-implementacji.md` | **zrobione** — jedna lista do oceny na urządzeniach, bez naprawiania |
| D9 | Propozycja progów LHCI | **po merge'u** — pomiar na runnerze uruchamia Mateusz (§7) |
| D10 | `CLAUDE.md`: Etapy 4 i 5 (kod) — WYKONANE | zrobione |

## 2. D1 — dwie trasy ofert

**Mechanizm.** Astro linkuje arkusze per PLIK trasy, nie per gałąź
renderowania. Jedna trasa `[...path].astro` renderowała albo listę, albo
detal, więc OBA widoki dostawały arkusz detalu, arkusz kart i arkusz
formularzy.

**Zmiana.** `src/pages/oferty/[...path].astro` zostaje trasą LIST (jeden
albo dwa segmenty), detale dostają
`src/pages/oferty/[kind]/[location]/[number].astro`.
`src/lib/offers/static-paths.ts`: `offerListStaticPaths()`
i `offerDetailStaticPaths()` zamiast jednej funkcji; adresy bez zmian
(te same funkcje z `urls.ts`). Trasa o trzech nazwanych segmentach ma
w Astro pierwszeństwo przed parametrem rest, a w buildzie statycznym
każdy plik generuje wyłącznie własne adresy — unit sprawdza, że zbiory
się nie przecinają.

**Pomiar (`pnpm build:visual`, baza = `main` po #32):**

| Trasa | CSS przed | CSS po |
| --- | --- | --- |
| lista rodzaju (`/oferty/{rodzaj}/`, z lokalizacją) | 90 775 / 19 660 B w 4 arkuszach | **51 293 / 11 104 B w 2 arkuszach** (jak `/oferty/`) |
| detal | 90 775 / 19 660 B w 4 arkuszach | **67 188 / 14 628 B w 3 arkuszach** |
| `/oferty/`, 404 | 51 293 / 11 104 B w 2 arkuszach | bez zmian |

- HTML list i detali porównany tokenowo: różnią się WYŁĄCZNIE odnośniki
  do arkuszy (lista −2, detal −1); arkusz detalu ma tę samą treść
  (ten sam hash).
- `script` wszystkich tras bez zmian; wyspa listy co do bajta (38 653 B).
- Zrzuty `oferty-*`, `oferta-*`, `not-found-*` progiem 0: identyczne.
- LHCI lokalnie, mobile, mediana z 3 przebiegów (baza → po): lista
  rodzaju LCP 2 492 → 2 422 ms, `total` 316 → 305 KB; detal działki
  (najmniejszy zapas w serwisie) 2 790 → 2 711 ms, `total` 402 → 396 KB;
  detal mieszkania 2 186 → 2 114 ms. Zysk ok. 70–80 ms na telefonie —
  zgodny z kosztem zmierzonym przy dołożeniu arkusza formularzy w 5B.

## 3. D2 — `chrome-footer` na `webkit-iphone-14`

Reprodukcja: `--repeat-each=40 --workers=10` na jednym profilu — 12 z 40
czerwonych, zawsze 225 px różnicy w prostokącie logo stopki.

Przyczyna: WebKit po przewinięciu rysuje skalowane obrazy rastrowe
najpierw w niższej jakości i poprawia je do pełnej z opóźnieniem. Pod
obciążeniem poprawka przychodziła później niż `settle(300)` po
`scrollIntoViewIfNeeded`, a dwa kolejne zrzuty Playwrighta w tym oknie
były sobie równe (czyli „stabilne") — i oba w niższej jakości.

Sprawdzone warianty: ponowne zdekodowanie obrazu po przewinięciu — bez
efektu (13 z 40); dłuższe odczekanie (1 500 ms) — **0 z 120**. W specu
zostaje stała `FOOTER_SETTLE_MS` z opisem. Baseline nietknięty, próg
nietknięty. Ten sam mechanizm tłumaczy pojedyncze różnice w prostokącie
logo na zrzutach pełnej strony przy progu 0 (SV31 analizy 4.6) — tam
mieszczą się w progu projektu i zostają bez zmian.

## 4. D3 — usunięte pliki

`src/components/sections/CollapsibleText.astro`,
`src/components/sections/collapsible.ts` (nieużywane od Etapu 0 — detal
oferty ma własne zwijanie opisu), `src/components/SkeletonPage.astro`
(ostatni użytkownik — polityka — dostał widok w 4.7),
`src/assets/img/uslugi-hero-m.webp`, `src/assets/img/uslugi-prawne2.webp`
(nieużywane od 4.6). Każdy sprawdzony grepem po `src/`, `tests/`,
`scripts/`, `functions/` i configach — zero importów; tabela pochodnych
w `docs/design/README.md` poprawiona.

Przy okazji znalezione, NIE usunięte (poza decyzją z 4.6): dwa kolejne
nieimportowane obrazy — `onas-dokumentacja.webp` (strona używa wariantu
`-m`) i `sprzedaj-doradca-m.webp` (zastąpiony kadrem `-tall`). Nie
trafiają do builda; pozycja w `docs/optional-todos.md`.

## 5. D5 — bramka ruchu

`MotionGate.astro` trzymał komentarze W skrypcie `is:inline`, a taki
skrypt jest wysyłany bez zmian — z komentarzami — na każdej stronie
z ruchem; komentarz wspominał też moduł strony głównej na pozostałych
stronach (F37). Komentarze przeniesione do nagłówka komponentu (lista
stron aktualna), opakowanie `<Fragment>` niepotrzebne. HTML „/",
`/sprzedaj-z-nami/`, `/o-nas/`, `/uslugi/`: **−309 B każda**; poza tym
skryptem HTML tych tras bez zmian (odcisk), zrzuty progiem 0 identyczne,
e2e ruchu zielone.

## 6. D6 — `/uslugi/` zostaje przy własnej kopii logiki kotwic

Rekomendacja z analizy 4.7 (Q6) zakładała przepięcie `/uslugi/` na
`content-anchor.ts`. Pomiar po przepięciu:

| Trasa | `script` przed | `script` po przepięciu |
| --- | --- | --- |
| `/polityka-prywatnosci/` | 8 217 / 3 402 B w 4 plikach (skrypt strony inline) | 8 921 / 3 920 B w **6 plikach** (+2 żądania) |
| `/uslugi/` | 11 217 / 5 170 B w 7 plikach | 11 305 / 5 276 B w **8 plikach** (+1 żądanie) |

Moduł współdzielony przez dwie strony bundler wydziela do osobnego
pliku; polityka traci wtedy skrypt wstawiany inline. Trzy dodatkowe
żądania za usunięcie 25 linii powtórzenia to zły interes — **zmiana
cofnięta**. Obie kopie mają komentarz „zmiany W PARZE" (skrypt strony
`/uslugi/` i `content-anchor.ts`), a kontrakty kotwic obu stron pilnują
e2e na trzech profilach.

## 7. D9 — budżety LHCI

Pomiar WYŁĄCZNIE na runnerze, po zmergowaniu tego PR-a (rozdzielenie
arkuszy zmienia LCP tras ofert, więc pomiar sprzed merge'u byłby
nieaktualny):

```
gh workflow run lhci-measure.yml --ref main
```

Z podsumowania biegu i artefaktu `lhci-measure` powstaje propozycja
progów (reguła LCP: max(mediana × 1,15; mediana + 1 300 ms); wagi
zasobów z zapasem na Etap 6) — osobny mały PR `chore/lhci-budgets`,
decyzja Mateusza. Przy okazji pierwsze liczby z runnera dla `/uslugi/`,
`/o-nas/`, `/praca/`, `/sprzedaj-z-nami/`, `/kontakt/`
i `/polityka-prywatnosci/` (dotąd tylko lokalne).

Stan lokalny po tym PR-ze (1 przebieg, oba configi, asercje czyste na
13 adresach): najwyższy `script` — listy ofert 29 003 B (73 % bramki
40 000 B); najwyższy `total` — „/" desktop 845 KB (70 % z 1,2 MB, w tym
film); najwyższy LCP mobile — detal działki ok. 2 710 ms (próg 3 200);
TBT 0, CLS ≤ 0,011, zero podmiotów trzecich.

## 8. Weryfikacja lokalna

- format, lint, typecheck — czysto; unit 548 (546 zielonych + 2 skip),
  w tym `offers-urls` z nowymi kontraktami tras;
- build 89 stron (adresy bez zmian — sitemapa i `_redirects` jak przed
  zmianą: 227 reguł), `test:dist` 6/6;
- e2e na 6 profilach: 765 zielonych (+1 239 pominięć profili), żaden
  spec nie wymagał zmiany;
- `test:visual` progiem 0 (przebieg pomiarowy, pliki przywrócone): 251
  zrzutów identycznych co do piksela, `not-found-top` różni się na dwóch
  profilach desktop jak od 4.1 (pod progiem projektu);
- LHCI lokalnie — §2 i §7.

## 9. Do decyzji / do wykonania poza kodem (Mateusz)

1. Po merge'u: `lhci-measure.yml` na main → propozycja progów (§7).
2. Dwa dodatkowe nieużywane obrazy (§4) — usunąć przy najbliższej okazji
   albo zostawić; nie wpływają na build.
3. `not-found-top` różni się od baseline'u o ok. 830–880 px na dwóch
   profilach desktop od 4.1 (pod progiem) — regeneracja tego jednego
   zrzutu to osobna, świadoma decyzja (zmiana baseline'u).
4. Lista placeholderów (`placeholdery-tresci.md` §1) — pozycje „decyzje
   klientki" warto wysłać przed jej testami.
