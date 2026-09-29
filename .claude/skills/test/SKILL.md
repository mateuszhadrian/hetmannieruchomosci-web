---
name: test
description: Inteligentny wybór warstwy testów — czyta zmienione pliki (git), mapuje ścieżki na warstwy (unit/e2e/visual) wg .claude/rules/testing.md, uruchamia tylko potrzebne i raportuje zbiorczo. Domyślne wejście do testowania w codziennej pracy.
---

Uruchom właściwe warstwy testów dla bieżących zmian — nie więcej, nie mniej.
Kontrakt testowy projektu: `.claude/rules/testing.md`.

## 1. Ustal zakres zmian

```!
git status --short
git diff --name-only HEAD
```

Gdy working tree czysty (weryfikacja gałęzi przed PR-em) — porównaj
z main: `git diff --name-only origin/main...HEAD`.

## 2. Mapa ścieżek → warstwy

| Zmienione pliki                                                                             | Warstwy do uruchomienia                     |
| ------------------------------------------------------------------------------------------- | ------------------------------------------- |
| `scripts/sync/**`, `src/lib/offers/**`                                                      | unit (kontrakt danych)                      |
| `src/i18n/**`, `src/lib/*.ts`, `scripts/subset-fonts.mjs`, `src/styles/fonts.css`           | unit                                        |
| `src/scripts/**`, `src/components/navbar/**`, `src/components/Footer.astro`, `functions/**` | e2e                                         |
| wyszukiwarka i lista ofert, galeria i detal oferty, formularze                              | e2e (+ visual przy zmianie wyglądu)         |
| `src/layouts/**`, `src/styles/**`, komponenty sekcji, `src/pages/**`                        | visual (+ e2e gdy zmiana dotyka interakcji) |
| `tests/**`, configi testów                                                                  | zmieniona warstwa w całości                 |
| `public/**` (w tym `_headers`, `_routes.json`), `astro.config.mjs`                          | build + e2e (smoke); meta/SEO → seo.spec    |

Zmiana przekrojowa albo wątpliwość → pełne `pnpm test`.

Plików `data/**` i `tests/fixtures/offers/**` nie zmieniasz ręcznie —
jeśli `git status` pokazuje w nich zmiany, zgłoś to Mateuszowi zamiast
testować.

## 3. Wykonanie (kolejność od najszybszej warstwy)

1. `pnpm test:unit` — zawsze, gdy cokolwiek z mapy się łapie (sekundy).
2. Warstwy Playwright wymagają świeżego builda, każda SWOJEGO:
   - `pnpm build` → `pnpm test:e2e` (dane produkcyjne; zero ofert to
     stan dopuszczalny),
   - `pnpm build:visual` → `pnpm test:visual` (zamrożony fixture ofert).
   - Zawężenie do pliku/projektu, gdy zmiana jest punktowa:
     `pnpm exec playwright test tests/e2e/navigation.spec.ts`,
     `pnpm exec playwright test tests/visual/<spec>.spec.ts`.
3. Interpretacja FAIL-i wizualnych: skill `/verify-mobile` (diffy w
   `test-results/`, procedura baseline'ów).

## 4. Raport zbiorczy

Podsumuj: co uruchomiono i dlaczego (mapa), wyniki per warstwa,
FAIL-e z interpretacją (regresja vs zamierzona zmiana vs znany flake vs
zmiana składu ofert). Przy zamierzonej zmianie wyglądu przypomnij
procedurę DWÓCH kompletów baseline'ów (darwin lokalnie + linux przez
workflow) — bez zgody Mateusza baseline'ów nie aktualizujemy.
