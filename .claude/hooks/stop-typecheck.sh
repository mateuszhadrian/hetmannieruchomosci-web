#!/bin/bash
# Stop: odpal typecheck + testy jednostkowe (sekundy), gdy w working tree
# sa zmienione pliki .ts/.tsx/.astro.
# Exit 2 = zablokuj zakonczenie tury i kaz Claude'owi naprawic bledy.
# Testow Playwright celowo NIE wpinamy w Stop (za wolne) — od tego sa
# skille (/test, /verify-mobile) i CI.
set -u
input=$(cat)

# Zabezpieczenie przed petla: jesli tura juz trwa z powodu tego hooka — przepusc.
echo "$input" | jq -e '.stop_hook_active == true' >/dev/null 2>&1 && exit 0

cd "$CLAUDE_PROJECT_DIR" || exit 0
git diff --name-only HEAD 2>/dev/null | grep -qE '\.(ts|tsx|astro)$' || exit 0

out=$(pnpm -s typecheck 2>&1)
if [ $? -ne 0 ]; then
  {
    echo "pnpm typecheck nie przechodzi — napraw przed zakonczeniem tury:"
    echo "$out" | tail -40
  } >&2
  exit 2
fi

out=$(pnpm -s test:unit 2>&1)
if [ $? -ne 0 ]; then
  {
    echo "pnpm test:unit nie przechodzi — napraw przed zakonczeniem tury:"
    echo "$out" | tail -40
  } >&2
  exit 2
fi
exit 0
