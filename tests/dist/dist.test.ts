// Skan zbudowanej strony (`dist/`): (1) żadna nazwa z FORBIDDEN_FIELDS nie
// występuje w HTML ani JSON — ostatnia linia obrony przed wyciekiem pola
// spoza allow-listy do publicznego buildu; (2) `_redirects` istnieje,
// mieści się w limitach Pages, a każdy cel reguły jest plikiem w dist
// (reguła na adres, którego nie ma = pętla 301 → 404 dla klienta).
// Biega w bramce syncu PRZED commitem bota (Z6) i w jobie quality.
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { describe, expect, it } from "vitest";
import { FORBIDDEN_FIELDS } from "../../src/lib/offers/public-fields";
import {
  MAX_RULE_LENGTH,
  MAX_STATIC_RULES,
  parseRedirects,
} from "../../src/lib/offers/redirects";

const DIST = "dist";

function walk(dir: string, out: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) walk(path, out);
    else out.push(path);
  }
  return out;
}

/** Ścieżka adresu → plik w dist (`/oferty/a/` → `dist/oferty/a/index.html`). */
function fileForPath(path: string): string {
  const clean = path.split(/[?#]/)[0];
  if (clean.endsWith("/")) return join(DIST, clean, "index.html");
  return existsSync(join(DIST, clean))
    ? join(DIST, clean)
    : join(DIST, clean, "index.html");
}

describe("dist/", () => {
  it("istnieje (uruchom najpierw pnpm build)", () => {
    expect(existsSync(join(DIST, "index.html")), "brak dist/index.html").toBe(
      true,
    );
  });

  const files = existsSync(DIST)
    ? walk(DIST).filter((f) => /\.(html|json)$/.test(f))
    : [];

  it.skipIf(files.length === 0)(
    "żaden HTML ani JSON nie zawiera nazwy pola z FORBIDDEN_FIELDS",
    () => {
      const patterns = FORBIDDEN_FIELDS.map(
        (name) => [name, new RegExp(`\\b${name}\\b`)] as const,
      );
      const hits: string[] = [];
      for (const file of files) {
        const text = readFileSync(file, "utf8");
        for (const [name, re] of patterns) {
          if (re.test(text)) hits.push(`${relative(DIST, file)}: ${name}`);
        }
      }
      expect(hits).toEqual([]);
    },
  );
});

describe("dist/_redirects", () => {
  const path = join(DIST, "_redirects");
  const text = existsSync(path) ? readFileSync(path, "utf8") : "";
  const rules = parseRedirects(text);

  it("istnieje i ma przynajmniej reguły stałe", () => {
    expect(existsSync(path)).toBe(true);
    expect(rules.length).toBeGreaterThanOrEqual(3);
  });

  it("mieści się w limitach Pages (liczba reguł, długość linii, same 301)", () => {
    expect(rules.length).toBeLessThanOrEqual(MAX_STATIC_RULES);
    for (const line of text.split("\n")) {
      expect(line.length).toBeLessThanOrEqual(MAX_RULE_LENGTH);
    }
    for (const r of rules) expect(r.status).toBe(301);
  });

  it("źródła są unikalne i żadne nie jest celem (brak pętli)", () => {
    const from = rules.map((r) => r.from);
    expect(new Set(from).size).toBe(from.length);
    const targets = new Set(rules.map((r) => r.to));
    for (const f of from) expect(targets.has(f), f).toBe(false);
  });

  it("każdy cel reguły jest plikiem w dist", () => {
    const missing = rules
      .filter((r) => !existsSync(fileForPath(r.to)))
      .map((r) => `${r.from} → ${r.to}`);
    expect(missing).toEqual([]);
  });
});
