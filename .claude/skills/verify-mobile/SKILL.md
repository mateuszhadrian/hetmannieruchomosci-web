---
name: verify-mobile
description: Weryfikacja regresyjna wyglądu przez testy wizualne Playwright (tests/visual/) — specy per widok, pixel-diff vs baseline na 6 profilach, build z zamrożonego fixture ofert. Użyj po każdej zmianie wyglądu sekcji/widoku oraz przed release.
---

Zweryfikuj wygląd istniejącą siatką wizualną (NIE pisz własnych sweepów —
specy w `tests/visual/` są siatką regresyjną z commitowanym baseline'em
w `tests/visual/__screenshots__/`; specy per widok powstają razem
z widokami w Etapach 4–5).

## 1. Build + przebieg

```!
git status --short tests/visual/__screenshots__ | head -5
```

- Testy wizualne biegają na PREVIEW (build produkcyjny) — webServer configu
  wstaje sam na porcie 4399 (nie 4321 — tam często wisi dev do testów na
  telefonie). Helper `assertPreview` wykrywa dev server i przerwie.
- Build MUSI pochodzić z fixture: `pnpm build:visual && pnpm test:visual`
  (6 profili: chromium-1920/1366, firefox, webkit-SE/14, pixel-5).
  Zwykły `pnpm build` wciąga dane produkcyjne — strażnik
  `assertVisualFixture` przerwie z instrukcją.
- Zawężenie do jednego widoku:
  `pnpm exec playwright test tests/visual/<spec>.spec.ts`

## 2. Interpretacja

- FAIL → obejrzyj diff w `test-results/**/…-diff.png` (Read) lub raport HTML
  (`pnpm exec playwright show-report`) i oceń: regresja czy ZAMIERZONA zmiana
  wyglądu? Zamierzona → pokaż Mateuszowi diff, po akceptacji zaktualizuj
  baseline'y (`pnpm test:visual:update`) — TYLKO darwin; komplet linuksowy
  aktualizuje ręcznie wyzwalany workflow `update-visual-baselines.yml`
  (kolejność na zawsze: kod → workflow linux → commit darwin na końcu).
- Różnice na kartach i detalach ofert przy NIEZMIENIONYM kodzie znaczą,
  że build nie pochodzi z fixture albo fixture został przebudowany —
  nie regeneruj baseline'ów, ustal przyczynę.
- Wideo (hero strony głównej, film oferty) jest maskowane na zrzutach;
  stan funkcjonalny sprawdzają testy e2e.
- Żaden profil nie leży w przedziale tabletowym 768–1024 px — układ
  tabletowy sprawdzaj ręcznie i kontraktem `expectBreakpointFlip`.
- Emulacja NIE wykrywa: limitu warstwy GPU Androida (galerie/sheety),
  Low Power Mode, zwijanego toolbara iOS, klawiatury ekranowej, zimnego
  cache, dotyku fizycznego (swipe galerii, swipe-down sheetów). Przy
  zmianach w tych obszarach poproś Mateusza o test na fizycznych
  urządzeniach.
- Nie emuluj `prefers-reduced-motion: reduce` (bramka w BaseLayout
  wyłączyłaby animacje) — chyba że celowo testujesz ścieżkę reduced.
