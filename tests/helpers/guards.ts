// Strażniki wspólne dla testów Playwright.
import { test, type Page } from "@playwright/test";
import { fixtureMediaPath } from "../../src/lib/img";
import { listPath } from "../../src/lib/offers/urls";
import { MEDIA_BASE } from "../../src/lib/site-config";
import { offerRoutesFromFixture, readFixtureOffersTyped } from "./offers";

/** Zamrożony zestaw testów wizualnych (tests/fixtures/offers). Przez
 *  helper — fixture może jeszcze nie istnieć, a goły odczyt wywracałby
 *  WSZYSTKIE specy przy ładowaniu modułu (reguła testing.md). */
const FIXTURE_OFFERS = readFixtureOffersTyped();

/** Znacznik jednej karty oferty w HTML-u listy (szkielet S2c i widok
 *  4.2 niosą `data-offer-card="{numer}"`). Sprawdzana strona: pierwsza
 *  lista typ×transakcja z fixture'u — `/oferty/` do Etapu 4.2 jest
 *  szkieletem bez kart. */
const OFFER_CARD_MARKER = /data-offer-card="([^"]+)"/g;
const FIXTURE_LIST_PATH = offerRoutesFromFixture().lists[0];

/** Zaślepka 1×1 GIF zamiast zdjęć z zasobnika — testy funkcjonalne nie
 *  wykonują żądań do sieci (testing.md); w trybie fixture obrazy są
 *  lokalne i reguła nic nie łapie. */
const PIXEL_GIF = Buffer.from("R0lGODlhAQABAAAAACw=", "base64");

/** Rejestruje `beforeEach` przechwytujący żądania do hosta mediów
 *  (`MEDIA_BASE`) — dla speców, które otwierają trasy ofert. */
export function useMediaStub(): void {
  if (!MEDIA_BASE) return;
  test.beforeEach(async ({ page }) => {
    await page.route(`${MEDIA_BASE}/**`, (route) =>
      route.fulfill({ status: 200, contentType: "image/gif", body: PIXEL_GIF }),
    );
  });
}

/** Strażnik preview: testy biegają na buildzie produkcyjnym (pnpm preview),
 *  NIGDY na dev serverze. Astro dev wstrzykuje klienta Vite — wykrywamy go
 *  w HTML-u i przerywamy z czytelnym komunikatem (dev vs preview = fałszywe
 *  różnice wizualne i inny timing). Na produkcji (BASE_URL) przechodzi. */
export async function assertPreview(page: Page): Promise<void> {
  const res = await page.request.get("/");
  if (!res.ok()) {
    throw new Error(
      `Serwer nie odpowiada (HTTP ${res.status()}). Uruchom najpierw: ` +
        `pnpm build && pnpm preview --port 4399 (lub ustaw BASE_URL).`,
    );
  }
  const html = await res.text();
  if (html.includes("/@vite/client")) {
    throw new Error(
      "Pod baseURL działa DEV SERVER (wykryto /@vite/client) — testy " +
        "wymagają preview. Zostaw dev na 4321 i odpal: pnpm build && " +
        "pnpm preview --port 4399.",
    );
  }
}

/** Rejestruje wspólny `beforeAll` ze strażnikiem preview — wywołaj na topie
 *  pliku speca zamiast kopiować blok hooka. */
export function usePreviewGuard(): void {
  test.beforeAll(async ({ browser }) => {
    const page = await browser.newPage();
    await assertPreview(page);
    await page.close();
  });
}

/** Strażnik zamrożonej treści: baseline'y wizualne ofert stoją na
 *  tests/fixtures/offers, więc `dist` pod testem MUSI pochodzić
 *  z `pnpm build:visual`. Zwykły `pnpm build` wciąga dane produkcyjne
 *  (zmieniają się co noc bez PR-a) i każdy zrzut listy, liczników i detalu
 *  rozjeżdża się co do piksela. Bez tego strażnika objawem jest pixel-diff,
 *  z nim — jedno czytelne zdanie.
 *  Dwa dowody (Etap 3): (1) zbiór numerów kart na pierwszej liście
 *  typ×transakcja = numery ofert fixture'u na tej liście — sama LICZBA kart
 *  nie wystarcza, bo lista z `data/` o tej samej liczności przeszłaby;
 *  (2) lokalna kopia pierwszego zdjęcia (`/media/…webp`) odpowiada 200 —
 *  tylko `build:visual` kopiuje media fixture'u do dist (tryb fixture
 *  = zero żądań do sieci).
 *  Dopóki fixture nie istnieje (Etapy 0–2), nie ma czego pilnować. */
export async function assertVisualFixture(page: Page): Promise<void> {
  if (FIXTURE_OFFERS.length === 0 || !FIXTURE_LIST_PATH) return;
  const hint =
    "Odpal: pnpm build:visual && pnpm test:visual (zwykły pnpm build " +
    "wciąga dane produkcyjne i rozjeżdża baseline'y).";
  const res = await page.request.get(FIXTURE_LIST_PATH);
  if (!res.ok()) {
    throw new Error(
      `Testy wizualne wymagają buildu na zamrożonej treści: lista ` +
        `${FIXTURE_LIST_PATH} z fixture'u nie istnieje w dist ` +
        `(HTTP ${res.status()}). ${hint}`,
    );
  }
  const html = await res.text();
  const cards = [...html.matchAll(OFFER_CARD_MARKER)].map((m) => m[1]).sort();
  const expected = FIXTURE_OFFERS.filter(
    (o) => listPath(o, { withLocation: false }) === FIXTURE_LIST_PATH,
  )
    .map((o) => o.number)
    .sort();
  if (cards.join(",") !== expected.join(",")) {
    throw new Error(
      `Testy wizualne wymagają buildu na zamrożonej treści: ${FIXTURE_LIST_PATH} ma ` +
        `karty [${cards.join(", ")}], a fixture przewiduje [${expected.join(", ")}]. ${hint}`,
    );
  }
  const photo = FIXTURE_OFFERS.flatMap((o) => o.photos)[0];
  if (photo) {
    const media = await page.request.get(fixtureMediaPath(photo.r2Key));
    if (
      !media.ok() ||
      !/image\/webp/.test(media.headers()["content-type"] ?? "")
    ) {
      throw new Error(
        `Testy wizualne wymagają buildu na zamrożonej treści: lokalna kopia ` +
          `zdjęcia fixture'u nie odpowiada (HTTP ${media.status()}) — dist nie ` +
          `pochodzi z build:visual (brak dist/media/). ${hint}`,
      );
    }
  }
}

/** Rejestruje `beforeAll` z obydwoma strażnikami wizualnymi (preview +
 *  zamrożona treść) — dla speców, których zrzuty zależą od ofert. */
export function useVisualFixtureGuard(): void {
  test.beforeAll(async ({ browser }) => {
    const page = await browser.newPage();
    await assertPreview(page);
    await assertVisualFixture(page);
    await page.close();
  });
}

/** Rejestruje `beforeEach` pomijający testy poza projektem chromium-1920 —
 *  dla speców niezależnych od profilu (meta/treść), które wystarczy
 *  przebiec raz. `reason` pojawia się w raporcie jako powód skipa. */
export function useChromium1920Only(reason: string): void {
  // eslint-disable-next-line no-empty-pattern -- Playwright wymaga destrukturyzacji fixtures
  test.beforeEach(async ({}, testInfo) => {
    test.skip(testInfo.project.name !== "chromium-1920", reason);
  });
}

/** Kolektor problemów strony: console.error + pageerror + 404 (poza
 *  transformacjami Cloudflare — `/cdn-cgi/image/` dla obrazów i
 *  `/cdn-cgi/media/` dla klatek-miniatur filmów; oba endpointy istnieją
 *  WYŁĄCZNIE na produkcji, więc ich lokalne 404 to znany artefakt preview).
 *  Zwraca funkcję odczytu przefiltrowanej, zdeduplikowanej listy. */
export function collectPageIssues(page: Page): () => string[] {
  const issues: string[] = [];
  page.on("console", (msg) => {
    if (msg.type() === "error") issues.push(`console.error: ${msg.text()}`);
  });
  page.on("pageerror", (err) => issues.push(`pageerror: ${String(err)}`));
  page.on("response", (res) => {
    if (res.status() === 404 && !/\/cdn-cgi\/(image|media)\//.test(res.url())) {
      issues.push(`404: ${res.url()}`);
    }
  });
  return () =>
    [...new Set(issues)].filter(
      // Konsolowe echo lokalnych 404 obrazów (realny 404 łapie listener response).
      (e) => !/Failed to load resource.*404/.test(e),
    );
}
