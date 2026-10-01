// Testy na ZBUDOWANYM `dist/` (`pnpm test:dist`, po `pnpm build`): skan
// pod kątem nazw pól zabronionych i spójność `_redirects`. Osobny config,
// bo nie potrzebują środowiska Astro i biegają w bramce syncu (sync.yml)
// oraz w jobie quality (ci.yml).
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    include: ["tests/dist/**/*.test.ts"],
  },
});
