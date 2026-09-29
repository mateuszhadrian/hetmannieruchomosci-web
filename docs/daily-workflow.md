# Codzienny proces pracy (od Etapu 1)

> **Status:** AKTUALNE od założenia repo i rulesetu `main-protection`
> (Etap 1). Konwencja jak w szablonie projektu.
> Required checks: do Etapu 3 samo `quality`; od Etapu 3 komplet
> `quality`, `e2e`, `lighthouse`.
>
> **Zasada nadrzędna: `main` = to, co widzi klientka.** Każdy merge do
> `main` uruchamia deploy Cloudflare Pages na
> `nowa.hetmannieruchomosci.com` (do Etapu 8) i na
> `hetmannieruchomosci.com` (od Etapu 8). Bezpośredni push na `main`
> jest zablokowany rulesetem — wszystko idzie przez PR. **Jedyny
> wyjątek: bot syncu** (niżej).

## Standardowy cykl zmiany

```bash
# 1. Zawsze startuj ze świeżego main — bot mógł w nocy dopisać dane
git checkout main && git pull

# 2. Feature branch (konwencja: typ/krotki-opis)
git checkout -b feat/nazwa-zmiany      # albo fix/..., docs/..., chore/...

# 3. Praca (sesja Claude Code zostawia zmiany w working tree — commitujesz TY)

# 4. Testy przed commitem — w sesji Claude: /test; ręcznie minimum:
pnpm format:check && pnpm lint && pnpm typecheck && pnpm test:unit && pnpm build

# 5. Commit (conventional commits ze scope, po angielsku, temat małą literą)
git add <konkretne-pliki-lub-katalogi>   # NIGDY git add . / git add -A
git commit -m "feat(oferty): short description"

# 6. Push + PR
git push -u origin feat/nazwa-zmiany
gh pr create --base main --title "feat(oferty): short description" --body "Co i po co. Testy: ..."

# 7. Checki → merge (squash) → sprzątanie
gh pr merge --squash --delete-branch
git checkout main && git pull
```

Po merge'u: Pages deployuje automatycznie (~1–2 min); `prod-smoke.yml`
sam sonduje adres produkcyjny bieżącej fazy.

## Konwencja commitów

- **Conventional commits ze scope, po angielsku, temat małą literą**:
  `feat(oferty): add status filter`, `fix(sync): keep floor zero`,
  `test(e2e): cover empty results`, `docs(plan): update project state`.
- Scope'y: `bootstrap`, `chrome`, `oferty` (lista, wyszukiwarka,
  indeks), `oferta` (detal), `home`, `formularze`, `kontakt`,
  `sprzedaj`, `praca`, `o-nas`, `uslugi`, `polityka`, `sync`, `data`
  (**zarezerwowany dla bota**), `redirects`, `pdf`, `seo`, `ci`,
  `deps`, `claude`, `plan`, `project`.
- Pilnuje tego commitlint (husky, hook `commit-msg`).
- Decyzje ze skutkami (zmiana progów LHCI, nowe baseline'y, zmiana
  schematu `Offer`, zmiana allow-listy, przebudowa fixture) = **osobne
  commity**, nie doklejki do feature'a.

## Zakazy twarde przy commitach

- **NIGDY `git add .` ani `git add -A`.** W katalogu roboczym leżą
  rzeczy, które nie mogą trafić do publicznego repo (`.sync-out/`
  z lokalnych przebiegów syncu, `docs/kb/`, `docs/plan/`) — są
  w `.gitignore`, ale
  jawne dodawanie plików jest drugą linią obrony.
- **`data/*.json` pisze wyłącznie bot syncu.** Nie edytujesz ich
  ręcznie i nie commitujesz ich z lokalnego przebiegu. Jedyny
  wyjątek, świadomy i w osobnym PR: `data/legacy-redirects.json`
  (mapa 301) — buduje go skrypt `pnpm redirects:legacy`, uruchamia
  i commituje Mateusz (kroki 2.3 i 8.1).
- **`tests/fixtures/offers/**` powstaje wyłącznie z `pnpm
  fixtures:build`.** Zmiana fixture = ponowne uruchomienie skryptu +
  oba komplety baseline'ów w tym samym PR.
- Claude **nie commituje i nie pushuje** (zasada twarda nr 1
  w `CLAUDE.md`; blokada w `settings.json`).
- Baseline'y wizualne tylko po obejrzeniu diffu; kolejność NA ZAWSZE:
  kod → workflow linux (`update-visual-baselines.yml`) → commit darwin
  na końcu.
- Przed każdym pushem nowego pliku w `docs/`: czy nie zawiera treści
  z bazy wiedzy ani z plików planu (repo jest publiczne).

## Checki na PR

| Check        | Co sprawdza                                                                                          | Required?    |
| ------------ | ---------------------------------------------------------------------------------------------------- | ------------ |
| `quality`    | format → lint → typecheck → unit (w tym kontrakt danych i `FORBIDDEN_FIELDS`) → build → skan `dist`     | **TAK**      |
| `e2e`        | `test:e2e` na danych produkcyjnych z `data/` + `build:visual` + `test:visual` vs baseline'y `*-linux.png` | od Etapu 3 |
| `lighthouse` | budżety ratchet `lighthouserc*.cjs` na buildzie z fixture (mobile + desktop)                          | od Etapu 3   |
| `prod-smoke` | po merge'u: czeka na świeży deploy i sonduje adres produkcyjny                                        | n/d          |

Czerwony `e2e` z pixel-diffem oglądasz w artefakcie
`playwright-report`; zamierzona zmiana wyglądu = nowe baseline'y (oba
komplety) w tym samym PR. Czerwony `lighthouse` = regres budżetu;
progów nie ruszamy w PR-ze feature'a. Czerwony `prod-smoke` bywa
wyścigiem z deployem — `workflow_dispatch` i sprawdź ponownie.

**Czerwony `e2e` bez Twojej zmiany w kodzie** zwykle znaczy, że zmienił
się skład ofert, a test nie był na to odporny. Naprawa: helper
`tests/helpers/offers.ts` + `test.skip` z powodem — nie dopasowywanie
testu do dzisiejszych danych.

## Przypadki specjalne

- **Commit bota syncu na `main`.** Workflow `sync.yml` (cron
  `15 2 * * *` UTC + `workflow_dispatch`) commituje `data/*.json`
  PROSTO na `main` jako konto techniczne z bypassem rulesetu —
  jedyny legalny wyjątek. Komunikat: `chore(data): sync ofert
  YYYY-MM-DD`. Konsekwencje:
  - rano zaczynaj od `git pull`; feature branch starszy niż jedna noc
    przed PR-em zrebase'uj na `main`;
  - konfliktów nie będzie, dopóki nie dotykasz `data/`;
  - commit bota NIE przechodzi przez PR ani required checks — jego
    bramką są testy i build wewnątrz `sync.yml`, przed commitem;
  - noc bez zmian w CRM = brak commita i brak builda.
- **Pilna publikacja dla Joanny:** Actions → `sync` → Run workflow
  (bez `dry_run`). Kilka minut do publikacji.
- **Zły sync opublikował błędne dane:** `git revert <commit bota>`
  w PR-ze (droga standardowa) — Pages przebuduje poprzedni stan.
  Następnej nocy sync znów zapisze to, co jest w CRM, więc przyczynę
  trzeba usunąć tego samego dnia (w CRM albo w kodzie syncu); do tego
  czasu wyłącz harmonogram (Actions → `sync` → Disable workflow).
- **Sync przerwany bezpiecznikiem** (zero ofert albo spadek o ponad
  połowę): strona stoi na ostatniej dobrej wersji. Sprawdź raport
  mailowy; jeśli spadek jest prawdziwy (Joanna porządkowała bazę) —
  `workflow_dispatch` z `force=true`.
- **Zmiana schematu `Offer` albo allow-listy:** jeden PR obejmuje
  `public-fields.ts` / `schema.ts` / `normalize.ts` / testy kontraktu
  / fixture (przebudowany skryptem). Po merge'u `workflow_dispatch`,
  żeby `data/` dostało nowy kształt — inaczej build stoi na starych
  danych do nocy. Schemat musi czytać stary kształt do czasu
  pierwszego syncu (pola nowe jako opcjonalne).
- **Hotfix produkcji:** ta sama droga (branch → PR → checki → merge) —
  ruleset nie ma wyjątków dla ludzi; przy realnym pożarze można
  chwilowo wyłączyć Enforcement w rulesecie, decyzja świadoma i do
  natychmiastowego cofnięcia.
- **Awaria GitHub Actions:** `ci.yml` i `sync.yml` mają
  `workflow_dispatch` — odpal ręcznie. Sync niewykonany jednej nocy
  niczego nie psuje (strona pokazuje stan z poprzedniej). Harmonogram
  w repo publicznym bywa wyłączany po 60 dniach bez aktywności —
  sprawdzaj przy przeglądzie z `optional-todos.md`.
- **Lokalny przebieg syncu:** `pnpm sync:dry` albo `pnpm sync` z
  wyjściem do `.sync-out/`; z API tylko Mateusz (zmienne z
  `~/.config/hetman/esticrm.env`), Claude wyłącznie `--source=file` na
  danych syntetycznych.

## Nota o enforcement

Repo jest **publiczne** (U2): ruleset egzekwowany za darmo, ale też
**publiczne są logi GitHub Actions i cała historia git**. W repo i w
logach nie ma: tokenów i kluczy, wartości pól z `FORBIDDEN_FIELDS`,
numerów ofert niewidocznych na stronie, treści bazy wiedzy
(`docs/kb/`) ani plików planu (`docs/plan/`). Sekrety żyją w 1Password, w GitHub Actions Secrets
i w zmiennych Cloudflare Pages. `data/offers.json` to dane publiczne —
te same, które widać na stronie.
