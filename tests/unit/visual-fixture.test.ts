// Strażnik zamrożonej treści na poziomie plików (Etap 3): `dist/` zbudowany
// przez `pnpm build:visual` musi odpowiadać fixture'owi
// (tests/fixtures/offers) co do liczby i zbioru ofert — baseline'y
// wizualne są obrazem tej treści, więc rozjazd = czerwone zrzuty bez
// zmiany w kodzie. Test POMIJA się, gdy dist nie pochodzi z build:visual
// (rozpoznanie: brak `dist/media/`, które tworzy wyłącznie integracja
// fixture-media) — w jobie quality biegnie przed buildem i nic nie
// sprawdza; bramkuje w jobie e2e po `pnpm build:visual`.
// Oferty przez helper; przy braku fixture'u — skip.
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { fixtureMediaPath, FIXTURE_MEDIA_PREFIX } from "../../src/lib/img";
import { listPath, offerPath } from "../../src/lib/offers/urls";
import { MEDIA_BASE } from "../../src/lib/site-config";
import {
  offerRoutesFromFixture,
  readFixtureOffersTyped,
} from "../helpers/offers";

const DIST = "dist";
const MEDIA_DIR = join(DIST, FIXTURE_MEDIA_PREFIX.slice(1));
const FIXTURE = readFixtureOffersTyped();
const ROUTES = offerRoutesFromFixture();

/** `/oferty/a/b/` → `dist/oferty/a/b/index.html` */
const fileFor = (path: string) => join(DIST, path, "index.html");

function walkHtml(dir: string, out: string[] = []): string[] {
  if (!existsSync(dir)) return out;
  for (const name of readdirSync(dir)) {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) walkHtml(path, out);
    else if (name.endsWith(".html")) out.push(path);
  }
  return out;
}

const cardsIn = (html: string): string[] =>
  [...html.matchAll(/data-offer-card="([^"]+)"/g)].map((m) => m[1]).sort();

describe.skipIf(FIXTURE.length === 0 || !existsSync(MEDIA_DIR))(
  "dist z build:visual = fixture ofert",
  () => {
    it("każdy detal z fixture'u jest plikiem w dist ze znacznikiem swojego numeru", () => {
      for (const o of FIXTURE) {
        const file = fileFor(offerPath(o));
        expect(existsSync(file), file).toBe(true);
        expect(readFileSync(file, "utf8"), file).toContain(
          `data-offer-detail="${o.number}"`,
        );
      }
    });

    it("liczba detali w dist = liczba ofert fixture'u (żadnej spoza fixture'u)", () => {
      const details = walkHtml(join(DIST, "oferty")).filter((f) =>
        /data-offer-detail=/.test(readFileSync(f, "utf8")),
      );
      expect(details.length).toBe(FIXTURE.length);
    });

    it("każda lista z fixture'u ma DOKŁADNIE karty ofert, które na nią trafiają", () => {
      expect(ROUTES.lists.length).toBeGreaterThan(0);
      for (const path of ROUTES.lists) {
        const file = fileFor(path);
        expect(existsSync(file), file).toBe(true);
        const expected = FIXTURE.filter(
          (o) =>
            listPath(o) === path ||
            listPath(o, { withLocation: false }) === path,
        )
          .map((o) => o.number)
          .sort();
        expect(cardsIn(readFileSync(file, "utf8")), path).toEqual(expected);
      }
    });

    it("suma kart na listach typ×transakcja (bez lokalizacji) = liczba ofert", () => {
      const topLists = new Set(
        FIXTURE.map((o) => listPath(o, { withLocation: false })),
      );
      let cards = 0;
      for (const path of topLists) {
        cards += cardsIn(readFileSync(fileFor(path), "utf8")).length;
      }
      expect(cards).toBe(FIXTURE.length);
    });

    it("zdjęcia i mapy ofert są lokalne: HTML ofert nie wskazuje hosta mediów, kopie istnieją w dist/media", () => {
      const html = walkHtml(join(DIST, "oferty")).map((f) =>
        readFileSync(f, "utf8"),
      );
      if (MEDIA_BASE) {
        for (const h of html) expect(h).not.toContain(MEDIA_BASE);
      }
      // pierwsze zdjęcie każdej oferty (to, które pokazuje szkielet
      // i karta) ma kopię WebP w dist/media
      for (const o of FIXTURE) {
        const first = o.photos[0];
        if (!first) continue;
        const file = join(DIST, fixtureMediaPath(first.r2Key));
        expect(existsSync(file), `${o.number}: ${file}`).toBe(true);
      }
    });
  },
);

describe("bez build:visual", () => {
  it("test nie wywraca się przy braku dist/media (skip, nie błąd)", () => {
    // Sam fakt dojścia tutaj = moduł załadował się bez wyjątku.
    expect(typeof existsSync(MEDIA_DIR)).toBe("boolean");
  });
});
