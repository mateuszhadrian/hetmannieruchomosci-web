// Integracja Astro: w trybie `MEDIA_SOURCE=fixture` (skrypt `build:visual`)
// kopiuje lokalne kopie zdjęć i map fixture'u (`tests/fixtures/offers/media/`)
// do `dist/media/`, skąd wskazuje je `imgAt()` (`fixtureMediaPath`). Dzięki
// temu testy wizualne nie wykonują żadnych żądań do sieci. W zwykłym
// buildzie integracja nic nie robi; `public/` zostaje jedynym publicDir.
import type { AstroIntegration } from "astro";
import { cpSync, existsSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { FIXTURE_MEDIA_PREFIX } from "../lib/img";

export const FIXTURE_MEDIA_DIR = "tests/fixtures/offers/media";

export default function fixtureMedia(): AstroIntegration {
  return {
    name: "hetman:fixture-media",
    hooks: {
      "astro:build:done": ({ dir, logger }) => {
        if (process.env.MEDIA_SOURCE !== "fixture") return;
        if (!existsSync(FIXTURE_MEDIA_DIR)) {
          logger.warn(
            `${FIXTURE_MEDIA_DIR} nie istnieje — zdjęcia fixture'u będą 404 (uruchom pnpm fixtures:build)`,
          );
          return;
        }
        const out = join(fileURLToPath(dir), FIXTURE_MEDIA_PREFIX.slice(1));
        cpSync(FIXTURE_MEDIA_DIR, out, { recursive: true });
        logger.info(`media fixture'u skopiowane do ${out}`);
      },
    },
  };
}
