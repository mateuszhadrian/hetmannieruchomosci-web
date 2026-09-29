#!/bin/bash
# PostToolUse (Edit|Write): mapuje edytowana sciezke na wymagana warstwe
# testow (mapa: .claude/rules/testing.md) i wypisuje przypomnienie do
# kontekstu. NIEBLOKUJACY (exit 0); twarda bramka i tak stoi w CI.
# Throttling: jedno przypomnienie na warstwe na sesje (marker w /tmp).
set -u
input=$(cat)

file=$(echo "$input" | jq -r '.tool_input.file_path // empty' 2>/dev/null)
[ -z "$file" ] && exit 0
sid=$(echo "$input" | jq -r '.session_id // "nosession"' 2>/dev/null)
rel="${file#"${CLAUDE_PROJECT_DIR:-}"/}"

layer=""
msg=""
case "$rel" in
  scripts/sync/* | src/lib/offers/*)
    layer="data"
    msg="Zmiana w danych ofert: uruchom pnpm test:unit (kontrakt danych: allow-lista, FORBIDDEN_FIELDS, schemat). Zmiana schematu albo allow-listy = jeden PR z testami kontraktu i przebudowanym fixture (.claude/rules/data-sync.md)."
    ;;
  src/i18n/* | src/lib/* | scripts/subset-fonts.mjs | src/styles/fonts.css)
    layer="unit"
    msg="Uruchom pnpm test:unit (slowniki, moduly lib, kontrakt subsetow fontow)."
    ;;
  src/scripts/* | src/components/navbar/* | src/components/Footer.astro | src/components/offers/* | src/components/sections/contact/* | functions/*)
    layer="e2e"
    msg="Uruchom pnpm build && pnpm test:e2e (nawigacja / nakladki / wyszukiwarka i galeria ofert / formularze)."
    ;;
  src/layouts/* | src/styles/* | src/components/sections/* | src/pages/*)
    layer="visual"
    msg="Zmiana wygladu: pnpm build:visual && pnpm test:visual (siatka wizualna, 6 profili)."
    ;;
  *)
    exit 0
    ;;
esac

marker="/tmp/claude-remind-tests-${sid}-${layer}"
[ -e "$marker" ] && exit 0
touch "$marker" 2>/dev/null

printf '{"hookSpecificOutput":{"hookEventName":"PostToolUse","additionalContext":"[remind-tests] %s"}}\n' "$msg"
exit 0
