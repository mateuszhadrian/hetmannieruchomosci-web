#!/bin/bash
# PostToolUse(Edit|Write): auto-format pliku edytowanego przez Claude.
# Prettier respektuje .prettierignore (docs/ i JSON-y danych zostaną pominięte).
set -u
file=$(jq -r '.tool_input.file_path // empty')
[ -z "$file" ] && exit 0
cd "$CLAUDE_PROJECT_DIR" || exit 0

case "$file" in
  *.astro|*.ts|*.tsx|*.js|*.jsx|*.mjs)
    pnpm exec prettier --write --ignore-unknown "$file" >/dev/null 2>&1
    pnpm exec eslint --fix "$file" >/dev/null 2>&1
    ;;
  *.json|*.css|*.md|*.mdx)
    pnpm exec prettier --write --ignore-unknown "$file" >/dev/null 2>&1
    ;;
esac
exit 0
