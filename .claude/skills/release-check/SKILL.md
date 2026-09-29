---
name: release-check
description: Audyt przedwdrożeniowy — pełna bramka jakości + testy na preview, zanim zmiana trafi na main (main = to, co widzi klientka; deploy na Cloudflare Pages). Użyj przed każdym PR-em do main i przed przełączeniem domeny.
---

Przeprowadź audyt przedwdrożeniowy. NIE commituj i NIE pushuj — raport
kończy się propozycją treści commita dla Mateusza.

## 1. Stan repo

```!
git status --short
git log --oneline -5
git ls-files docs | grep -E "^docs/(kb|plan)/" || echo "OK: docs/kb i docs/plan poza gitem"
```

Repo jest PUBLICZNE: w plikach śledzonych nie może być treści bazy
wiedzy, plików planu, sekretów ani wartości pól z `FORBIDDEN_FIELDS`.

## 2. Bramka jakości (identyczna z CI — kolejność jak w .github/workflows/ci.yml)

Uruchom po kolei; każdy błąd napraw albo zgłoś:
`pnpm format:check` → `pnpm lint` → `pnpm typecheck` → `pnpm test:unit`
→ `pnpm build`.

## 3. Testy na preview

- `pnpm test:e2e` — funkcjonalne + a11y + SEO/linki, na buildzie z kroku 2
  (webServer wstaje sam na 4399);
- `pnpm build:visual && pnpm test:visual` — pełna siatka wizualna vs
  baseline na zamrożonym fixture ofert (FAIL = diff do obejrzenia
  w `test-results/`; interpretacja: skill `/verify-mobile`);
- `pnpm exec lhci autorun --config=lighthouserc.cjs` oraz
  `rm -rf .lighthouseci && pnpm exec lhci autorun --config=lighthouserc.desktop.cjs`
  — budżety wydajnościowe na buildzie z fixture (progi mierzone na
  runnerze CI; lokalny wynik jest orientacyjny);
- po ostatnim teście wizualnym odtwórz build produkcyjny: `pnpm build`;
- w `dist/`: brak odwołań do `localhost`/portów dev, brak pełnego
  telefonu i e-maili poza opisami ofert, obecne `_headers`,
  `_routes.json`, `_redirects` (od Etapu 2);
- `CHECK_REMOTE_MEDIA=1` — każdy obraz z danych odpowiada na hoście
  mediów (od Etapu 2; zewnętrzna sieć, więc tylko tutaj, nie w PR).

## 4. Checklista urządzeń fizycznych

Emulacja NIE wykrywa poniższych — jeśli zmiana dotyka obszaru, poproś
Mateusza o test na telefonie i wskaż, na co patrzeć:

| Obszar                                     | Kiedy test fizyczny                          |
| ------------------------------------------ | -------------------------------------------- |
| Limit warstwy GPU Androida                 | zmiany galerii, lightboxa, bottom sheetów    |
| iOS Low Power Mode                         | zmiany wideo hero                            |
| Zwijany toolbar Safari (metryki viewportu) | pasek dolny detalu oferty, sticky, sheety    |
| Klawiatura ekranowa, wybór pliku           | zmiany formularzy (pola 16 px, załącznik CV) |
| Linki `tel:`                               | zmiany slotów kontaktowych                   |
| Zimny cache + realne łącze komórkowe       | większe zmiany zasobów przed release         |
| Dotyk fizyczny (swipe galerii, swipe-down) | zmiany galerii/sheetów/scrolla               |

## 5. Raport

Podsumuj: wyniki bramki, wyniki testów, ryzyka. Na końcu zaproponuj treść
commita (conventional, ze scope, po angielsku, temat małą literą; lista
plików JAWNA — nigdy `git add .`) i **PR z feature brancha** — main jest
chroniony rulesetem, bezpośredni push nie przejdzie. Po merge'u deploy
robi Cloudflare Pages automatycznie, a workflow `prod-smoke.yml` sam
sonduje adres produkcyjny bieżącej fazy (@prod-smoke). Proces:
`docs/daily-workflow.md`.
