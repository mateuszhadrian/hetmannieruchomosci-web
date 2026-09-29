---
paths:
  - "scripts/**/*.mjs"
---

# Skrypty dev-only (optymalizacja / zasoby marki) — reguły

Skrypty `.mjs` w `scripts/` to ręczne narzędzia jednorazowe: wynik jest
COMMITOWANY, build niczego nie liczy. Kod syncu danych (`scripts/sync/**`,
TypeScript) ma osobną regułę: `.claude/rules/data-sync.md`.

- `optimize-images.mjs`: obrazy z eksportu designu
  (`docs/design/export/assets/img` — POZA repo, w .gitignore; tabela nazw
  i szerokości w `docs/design/README.md`) → WebP w docelowych rozmiarach
  do `src/assets/img/` (`node scripts/optimize-images.mjs <src> <out.webp>
[szer] [q]`). Wariant bez sufiksu = desktop, `-m` = mobile; widok dobiera
  wariant do realnego pola i w razie potrzeby generuje własny.
  **Zdjęcia OFERT nie idą tą drogą ani do repo** — kopiuje je sync do
  zasobnika mediów, rozmiary powstają przez `imgAt()`.
- `subset-fonts.mjs`: polskie subsety `latin-ext` obu krojów →
  `src/assets/fonts/`. Po zmianie listy znaków przegeneruj pliki i odpal
  `pnpm test:unit` (kontrakt `tests/unit/fonts-subset.test.ts`).
- `lhci-median.mjs`: helper agregacji przebiegów LHCI — nie ruszać bez
  zmiany konfiguracji lighthouserc.
- `make-icons.mjs`: komplet zasobów marki jednym poleceniem
  (`node scripts/make-icons.mjs`). **STAN: wersja tymczasowa na źródłach
  rastrowych** — `src/assets/logo/source/znak-hetman.png` (sam znak)
  i `logo-color.png` (pełne logo na og-image). WYJŚCIE =
  `public/{favicon.ico (16+32+48), apple-touch-icon, icon-192/512,
og-image.png}`. Ikony są BEZ alfy (iOS podkłada czerń). Kadr:
  przycięcie do bboxu rysunku + wyśrodkowanie z marginesem `ICON_PAD`.
  Wektor znaku i `public/favicon.svg` jako GENERAT (ten sam kadr dla SVG
  i rastrów) wchodzą w Etapie 6 — do tego czasu nie dodawaj favicon.svg
  ręcznie. Nie podmieniaj też plików w `public/` z pominięciem skryptu.
