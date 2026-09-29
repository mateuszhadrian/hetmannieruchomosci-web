#!/bin/bash
# PreToolUse(Edit|Write): blokada recznej edycji danych ofert i fixture'u.
# data/*.json pisze wylacznie bot syncu, tests/fixtures/offers/** wylacznie
# `pnpm fixtures:build` (regula: .claude/rules/data-sync.md).
set -u
input=$(cat)
file=$(echo "$input" | jq -r '.tool_input.file_path // empty')
[ -z "$file" ] && exit 0
rel="${file#"${CLAUDE_PROJECT_DIR:-}"/}"

case "$rel" in
  data/*)
    echo 'STOP: data/** pisze wylacznie bot syncu (workflow sync.yml). Reczna edycja rozjedzie dane z CRM i zostanie nadpisana najblizszej nocy. Blad w danych naprawia sie w CRM albo w kodzie syncu. Jesli Mateusz wyraznie kazal edytowac ten plik, popros go o jednorazowe potwierdzenie.' >&2
    exit 2
    ;;
  tests/fixtures/offers/selection.json)
    # jedyny plik fixture'u pisany recznie: lista numerow ofert + overrides
    exit 0
    ;;
  tests/fixtures/offers/*)
    echo 'STOP: tests/fixtures/offers/** powstaje wylacznie z `pnpm fixtures:build` (uruchamia Mateusz). Zmien selection.json albo kod normalizacji i popros o ponowne zbudowanie fixture — razem z nowymi baseline'"'"'ami w tym samym PR.' >&2
    exit 2
    ;;
esac
exit 0
