# hetmannieruchomosci-web

Strona biura nieruchomości **HETMAN Nieruchomości** (Poznań) —
`hetmannieruchomosci.com`. Oferty pochodzą z systemu CRM biura: nocna
synchronizacja zapisuje je do repozytorium jako dane publiczne, a strona
buduje się z nich statycznie.

Stack: Astro 6 (static) · Tailwind 4 · scroll natywny (bez bibliotek
ruchu) · Cloudflare Pages / Pages Functions / R2 · Playwright / Vitest /
Lighthouse CI.

## Komendy

| Komenda             | Działanie                                          |
| :------------------ | :------------------------------------------------- |
| `pnpm install`      | Instalacja zależności                              |
| `pnpm dev`          | Serwer deweloperski (`localhost:4321`)             |
| `pnpm build`        | Build produkcyjny do `./dist/`                     |
| `pnpm build:visual` | Build na zamrożonym zestawie ofert (testy wyglądu) |
| `pnpm preview`      | Podgląd builda (testy używają portu 4399)          |
| `pnpm test`         | Pełna piramida: unit + e2e + visual                |
| `pnpm typecheck`    | `astro check`                                      |
| `pnpm lint`         | ESLint                                             |
| `pnpm format:check` | Prettier (sprawdzenie)                             |

## Dokumentacja

- `docs/README.md` — indeks dokumentacji i statusy plików,
- `docs/daily-workflow.md` — codzienny proces pracy (branch → PR → checki
  → merge → deploy),
- `docs/design/README.md` — referencje designu, mapa plik → trasa, assety,
- `CLAUDE.md` + `.claude/rules/` — zasady pracy w repo i stan projektu.

Repozytorium jest publiczne. Nie zawiera sekretów, surowych danych z CRM
ani dokumentów projektowych opisujących klienta — te żyją poza repo.
