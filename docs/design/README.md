# Design — referencje (eksport HTML, wersja v8)

> **Status:** AKTUALNE. Eksport jest źródłem **WYGLĄDU** — nie zachowania
> i nie wartości. Limity, treści zgód, adresy e-mail, presety filtrów
> i dane ofert w makietach to dane przykładowe. Przy każdej różnicy
> w logice albo wartości obowiązuje baza wiedzy projektu (dokument lokalny,
> poza repo — patrz `docs/README.md`).

Pliki przegląda się wprost z dysku (`docs/design/export/*.html`).
W gicie są HTML-e, `assets/css/site.css` i `assets/js/site.js`; katalogi
`assets/img/` i `assets/video/` są w `.gitignore` (24 MB) — do repo
wchodzą wyłącznie zoptymalizowane pochodne w `src/assets/` i `public/`.

## Czego z eksportu NIE przenosimy

Artefakty narzędzia, nie decyzje projektowe:

- **podwójne drzewa DOM** `.br-m` (≤ 1024 px) i `.br-d` (≥ 1025 px) oraz
  warianty `.vp-phone` / `.vp-tablet` — budujemy JEDEN markup responsywny;
- **jednostki `cqw`/`cqh`** i kontener `.page` — skalowanie przez
  `clamp()` i tokeny z `src/styles/global.css`;
- **sonda wysokości viewportu `--vph`** i klasy `.vp-*`;
- **style inline** i klasy pomocnicze `.hv-*` z `!important`;
- **Google Fonts** z `<head>` — kroje są self-hosted
  (`src/styles/fonts.css`);
- **atrybuty reactowe** w HTML (`onSubmit`, `defaultValue`);
- własna blokada scrolla i obsługa menu z `site.js` — robi to
  `src/scripts/overlay.ts`.

Przenosimy: paletę, typografię, proporcje, progi 1025 / 768 px, układ
sekcji, charakter ruchu (reveale `data-rv`, parallax `data-px`).

## Mapa plik → trasa

| Plik eksportu               | Trasa                                                | Widok powstaje w |
| --------------------------- | ---------------------------------------------------- | ---------------- |
| `index.html`                | `/`                                                  | Etap 4.4         |
| `oferty.html`               | `/oferty/` + listy `/oferty/{typ}-na-{transakcja}/…` | Etap 4.2         |
| `oferta.html`               | detal `/oferty/…/{lokalizacja}/{numer}/`             | Etap 4.3         |
| `sprzedaj-z-nami.html`      | `/sprzedaj-z-nami/`                                  | Etap 5           |
| `o-nas.html`                | `/o-nas/`                                            | Etap 4.5         |
| `uslugi.html`               | `/uslugi/`                                           | Etap 4.6         |
| `praca.html`                | `/praca/`                                            | Etap 5           |
| `kontakt.html`              | `/kontakt/`                                          | Etap 5           |
| `polityka-prywatnosci.html` | `/polityka-prywatnosci/` (w eksporcie pusty szablon) | Etap 4.7         |
| nagłówek i stopka (każdy)   | chrome globalny                                      | Etap 4.1         |

Strona 404 nie ma makiety — układ odziedziczony z szablonu projektu,
kolory i kroje z tokenów.

## Tokeny odczytane z eksportu

| Rola                       | Wartość   | Token            |
| -------------------------- | --------- | ---------------- |
| granat (nagłówki, stopka)  | `#183a6b` | `--navy`         |
| granat głęboki (tła hero)  | `#0e203c` | `--navy-deep`    |
| miedź (akcent, CTA)        | `#c98236` | `--copper`       |
| miedź jasna (ciemne tło)   | `#e0a86a` | `--copper-light` |
| tekst podstawowy           | `#1c1b19` | `--ink`          |
| tekst akapitów             | `#2f3a4c` | `--slate`        |
| tekst drugorzędny          | `#6b6864` | `--muted`        |
| podpisy                    | `#8a867f` | `--faint`        |
| tekst i kreski na ciemnym  | `#dddddd` | `--silver`       |
| tło strony                 | `#f3f2ef` | `--bg`           |
| podkład pod zdjęciem       | `#e9e7e2` | `--bg-photo`     |
| linie                      | `#e2dfd8` | `--line`         |

Kroje: **Manrope** (treść, nagłówki — wagi 400/500/600) i **Archivo**
(nawigacja, etykiety wersalikami, liczby — wagi 400/500/600); numer oferty
krojem monospace systemowym. Kolory zmierzone z samego logo są inne niż
w designie — w interfejsie obowiązuje design.

## Assety: przemianowania i pochodne

Przemianowania w `docs/design/export/assets/img/` wykonano PRZED
optymalizacją. Odwołania w plikach HTML eksportu zostają po staremu (to
tylko podgląd), więc przemianowany plik nie wyświetli się w makiecie
otwartej z dysku.

| Plik w eksporcie       | Po przemianowaniu  | Powód                         |
| ---------------------- | ------------------ | ----------------------------- |
| `onas-joanna.jpeg`     | `onas-joanna.jpg`  | spójne rozszerzenia           |

Pochodne generuje `node scripts/optimize-images.mjs <src> <out.webp>
[szerokość] [jakość]`. Wariant bez sufiksu = desktop (q 80), wariant `-m`
= mobile (q 78).

| Źródło (eksport)          | Wymiary   | Pochodne w `src/assets/img/`       | Szerokości  |
| ------------------------- | --------- | ---------------------------------- | ----------- |
| `hero-poster.png`         | 1456×816  | `hero-poster{,-tall}.webp`         | 1456 / 720 (kadr pionowy 720×816 — niżej) |
| `onas-hero-v2.png`        | 1456×816  | `onas-hero{,-m}.webp`              | 1456 / 1024 |
| `onas-dokumentacja.png`   | 1456×816  | `onas-dokumentacja{,-m}.webp`      | 1456 / 1024 |
| `onas-umowa.png`          | 1456×816  | `onas-umowa{,-m}.webp`             | 1456 / 1024 |
| `praca-hero.png`          | 1456×816  | `praca-hero{,-m}.webp`             | 1456 / 1024 |
| `sprzedaj-doradca.png`    | 1456×816  | `sprzedaj-doradca{,-m}.webp`       | 1456 / 1024 |
| `onas-cta.png`            | 1680×720  | `onas-cta{,-m}.webp`               | 1680 / 1024 |
| `uslugi-hero.jpg`         | 1440×617  | `uslugi-hero{,-tall,-m}.webp`      | 1440 / 864 (kadr o pełnej wysokości — niżej) / 1024 (nieużywany od 4.6) |
| `home-o-nas.png`          | 960×1200  | `home-o-nas{,-m}.webp`             | 960 / 720   |
| `kontakt-biuro.png`       | 960×1200  | `kontakt-biuro{,-m}.webp`          | 960 / 720   |
| `onas-dokumenty.png`      | 960×1200  | `onas-dokumenty{,-m}.webp`         | 960 / 720   |
| `onas-historia-bg.png`    | 960×1200  | `onas-historia-bg{,-m}.webp`       | 960 / 720   |
| `onas-joanna.jpg`         | 2088×2048 | `onas-joanna{,-m}.webp`            | 1200 / 720  |
| `uslugi-klucze.png`       | 896×1344  | `uslugi-klucze{,-m}.webp`          | 896 / 720   |
| `uslugi-doradcy.jpg`      | 900×1125  | `uslugi-doradcy{,-m}.webp`         | 900 / 720   |
| `uslugi-prawne1.jpg`      | 900×1125  | `uslugi-prawne1{,-m}.webp`         | 900 / 720   |
| `uslugi-prawne2.jpg`      | 900×1125  | `uslugi-prawne2{,-m}.webp`         | 900 / 720   |
| `uslugi-prawne3.jpg`      | 900×1125  | `uslugi-prawne3{,-m}.webp`         | 900 / 720   |
| `uslugi-prezentacja1.jpg` | 900×1125  | `uslugi-prezentacja1{,-m}.webp`    | 900 / 720   |
| `uslugi-prezentacja2.jpg` | 900×1125  | `uslugi-prezentacja2{,-m}.webp`    | 900 / 720   |
| `logo-color.png`          | 1500×346  | `src/assets/logo/logo-color.webp`  | 600 (q 90)  |
| `logo-silver.png`         | 1500×344  | `src/assets/logo/logo-silver.webp` | 600 (q 90)  |

Razem 20 kadrów → 40 plików WebP, 1,7 MB (źródła: 22 MB). Od Etapów 4.4–4.6 dochodzą kadry pionowe hero (`hero-poster-tall`, `sprzedaj-doradca-tall`, `uslugi-hero-tall`).

**Kadr pionowy plakatu hero (Etap 4.4).** Wariant `hero-poster-m.webp`
(1024×574) został zastąpiony przez `hero-poster-tall.webp` — wycinek
720×816 o PEŁNEJ wysokości źródła, podawany telefonom (< 768 px), gdzie
hero to wysokie pole z `object-fit: cover` i pozycją `89% 50%`:

```bash
node scripts/optimize-images.mjs docs/design/export/assets/img/hero-poster.png \
  src/assets/img/hero-poster-tall.webp 720 78 655,0,720,816
```

Lewa krawędź wycinka = (1456 − 720) × 0,89 = 655 px — przy tej wartości
`object-position: 89%` daje na wycinku dokładnie ten sam kadr co na pełnym
źródle, dla każdej proporcji okna.

**Kadr zdjęcia hero `/uslugi/` na telefon (Etap 4.6).** Pole zdjęcia na
telefonie jest pionowe albo zbliżone do kwadratu, a źródło ma tylko 617 px
wysokości — plik `-m` (1024×439) byłby powiększany ponad trzykrotnie.
Telefonom (< 768 px) podawany jest `uslugi-hero-tall.webp`: wycinek
864×617 o PEŁNEJ wysokości źródła wokół pozycji 50 % (`object-position`
w poziomie jest takie samo dla obu plików):

```bash
node scripts/optimize-images.mjs docs/design/export/assets/img/uslugi-hero.jpg \
  src/assets/img/uslugi-hero-tall.webp 864 78 288,0,864,617
```

Lewa krawędź wycinka = (1440 − 864) × 0,5 = 288 px. Źródło jest za małe
na pełne okno desktopu (1920×1080 = powiększenie 1,75×) — ostrzejszy plik
od autora designu podmienia się tym samym skryptem (wpis
w `docs/optional-todos.md`).

**Szerokości są punktem wyjścia, nie decyzją ostateczną.** Widok, który
osadza kadr, dobiera wariant do realnego pola (`sizes`) i w razie potrzeby
generuje własny tym samym skryptem. Dotyczy to zwłaszcza kadrów poziomych
wyświetlanych na telefonie w wysokim polu z `object-fit: cover` (hero
strony głównej): liczy się wtedy WYSOKOŚĆ pliku, a wariant `-m` ma jej
mniej niż desktopowy.

### Pliki, które NIE wchodzą

| Plik                                 | Dlaczego                                                                |
| ------------------------------------ | ----------------------------------------------------------------------- |
| `hero-mobile.png`                    | duplikat `hero-poster.png` piksel w piksel (różnią się metadanymi)      |
| `onas-hero.png`                      | nieużywany w żadnym pliku HTML (zastąpiony przez `onas-hero-v2.png`)    |
| `detal-mock-1…6.png`, `detal-mapa.png` | makiety zdjęć i mapy oferty — realne pochodzą z danych ofert          |
| `mapa-mobile.webp`, `mapa-desktop.webp` | mapy kontaktu bierzemy z gotowych plików źródłowych (niżej)          |

### Mapy kontaktu

`src/assets/img/mapa-kontakt-mobile.webp` (880×694) i
`mapa-kontakt-desktop.webp` (1206×838) — skopiowane bez zmian z plików
źródłowych projektu, NIE z eksportu. **Pasek atrybucji wypalony u dołu
obrazu jest wymagany licencją — nie wolno go przycinać** (także przez
`object-fit: cover` z kadrowaniem dołu). Podmiana mobile ↔ desktop
w `<picture>` przy 600 px (`CONTACT_MAP_MIN_PX`).

### Wideo hero

| Plik                    | Kodek          | Wymiary | Waga   |
| ----------------------- | -------------- | ------- | ------ |
| `public/video/hero.mp4`  | H.264 High, yuv420p, bez dźwięku, `faststart`, CRF 28 | 832×464 | 443 KB |
| `public/video/hero.webm` | VP9, CRF 42, bez dźwięku | 832×464 | 461 KB |

Oba pliki przekodowane w Etapie 4.4 ze źródła `assets/video/hero.webm`
eksportu (VP9, 2,0 MB — poza repo). MP4 jest PIERWSZYM `<source>` (H.264
gra w każdej przeglądarce z kodekami systemowymi), WebM — dla pozostałych
(m.in. Chromium bez kodeków własnościowych). Rozmiar MP4 wchodzi do
budżetu `total` desktop w Lighthouse — uzasadnienie i pomiary:
`docs/analiza-home.md` §6. Komendy:

```bash
ffmpeg -i hero.webm -an -c:v libx264 -profile:v high -level 4.0 \
  -pix_fmt yuv420p -crf 28 -preset slow -movflags +faststart hero.mp4
ffmpeg -i hero.webm -an -c:v libvpx-vp9 -b:v 0 -crf 42 -row-mt 1 \
  -deadline good -cpu-used 1 -pix_fmt yuv420p hero-out.webm
```

Osadzenie: `src/components/sections/home/HomeHero.astro` (bez `autoplay`,
`preload="none"`), start i przejście w zdjęcie: `home-hero.ts` — film gra
wyłącznie od 1025 px i tylko przy dozwolonym ruchu; każda inna ścieżka
(tryb oszczędzania energii, błąd, oszczędzanie danych) zostawia zdjęcie.

### Ikony i og-image

Generuje `node scripts/make-icons.mjs` ze źródeł rastrowych
w `src/assets/logo/source/`. To wersja tymczasowa — wektor znaku
i `favicon.svg` powstają w Etapie 6.
