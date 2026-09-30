// Integracja Astro: po `astro build` zapisuje `dist/_redirects` z danych
// ofert (P17). Czyta ten sam katalog, co strona (`OFFERS_DATA_DIR`,
// domyślnie `./data`); brak plików = same reguły stałe. Zły kształt
// danych wywraca build — tak samo jak walidacja w `data.ts` (2.8).
import type { AstroIntegration } from "astro";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { z } from "zod";
import {
  buildRedirectRules,
  MAX_RULE_LENGTH,
  MAX_STATIC_RULES,
  renderRedirects,
} from "../lib/offers/redirects";
import {
  LegacyRedirectsSchema,
  MAIN_TYPES,
  TRANSACTIONS,
  UrlLedgerSchema,
} from "../lib/offers/schema";

/** Tylko pola potrzebne do adresu — pełną walidację robi `data.ts`. */
const AddressableSchema = z.array(
  z.looseObject({
    number: z.string(),
    mainType: z.enum(MAIN_TYPES),
    transaction: z.enum(TRANSACTIONS),
    location: z.looseObject({ slug: z.string() }),
  }),
);

function readJson<T>(
  dir: string,
  file: string,
  schema: z.ZodType<T>,
): T | undefined {
  const path = join(dir, file);
  if (!existsSync(path)) return undefined;
  const parsed = schema.safeParse(JSON.parse(readFileSync(path, "utf8")));
  if (!parsed.success) {
    throw new Error(
      `${path}: niepoprawne dane (${parsed.error.issues[0]?.message})`,
    );
  }
  return parsed.data;
}

export function redirectsFileContent(dataDir: string): string {
  const offers = readJson(dataDir, "offers.json", AddressableSchema) ?? [];
  const ledger = readJson(dataDir, "url-ledger.json", UrlLedgerSchema);
  const legacy = readJson(
    dataDir,
    "legacy-redirects.json",
    LegacyRedirectsSchema,
  );
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
        const dataDir = process.env.OFFERS_DATA_DIR || "./data";
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
