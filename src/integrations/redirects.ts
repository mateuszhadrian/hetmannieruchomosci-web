// Integracja Astro: po `astro build` zapisuje `dist/_redirects` z danych
// ofert (P17). Dane czyta przez `data.ts` — ten sam katalog
// (`OFFERS_DATA_DIR`) i ta sama walidacja strict, co strona; brak plików
// = same reguły stałe, zły kształt danych wywraca build.
import type { AstroIntegration } from "astro";
import { writeFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { loadOffersData, offersDataDir } from "../lib/offers/data";
import {
  buildRedirectRules,
  MAX_RULE_LENGTH,
  MAX_STATIC_RULES,
  renderRedirects,
} from "../lib/offers/redirects";

export function redirectsFileContent(dataDir: string): string {
  const { offers, ledger, legacy } = loadOffersData(dataDir);
  const rules = buildRedirectRules({ offers, ledger, legacy });
  if (rules.length > MAX_STATIC_RULES) {
    throw new Error(
      `_redirects: ${rules.length} reguł > limit ${MAX_STATIC_RULES}`,
    );
  }
  const text = renderRedirects(rules);
  const tooLong = text.split("\n").find((l) => l.length > MAX_RULE_LENGTH);
  if (tooLong) throw new Error("_redirects: reguła dłuższa niż limit");
  return text;
}

export default function redirects(): AstroIntegration {
  return {
    name: "hetman:redirects",
    hooks: {
      "astro:build:done": ({ dir, logger }) => {
        const dataDir = offersDataDir();
        const text = redirectsFileContent(dataDir);
        const out = join(fileURLToPath(dir), "_redirects");
        writeFileSync(out, text);
        logger.info(
          `_redirects: ${text.trim().split("\n").length} reguł (dane: ${dataDir})`,
        );
      },
    },
  };
}
