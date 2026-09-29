// Strażniki wspólne dla testów Playwright.
import { test, type Page } from "@playwright/test";
import { readFixtureOffers } from "./offers";

/** Ile ofert ma zamrożony zestaw testów wizualnych
 *  (tests/fixtures/offers). Przez helper — fixture może jeszcze nie
 *  istnieć, a goły odczyt wywracałby WSZYSTKIE specy przy ładowaniu
 *  modułu (reguła testing.md). */
const FIXTURE_OFFERS = readFixtureOffers().length;

/** Znacznik jednej karty oferty w HTML-u listy. Kontrakt z widokiem
 *  `/oferty/` — widok powstaje w Etapie 4.2, strażnik dostaje pełną
 *  postać w Etapie 3. */
const OFFER_CARD_MARKER = /data-offer-card=/g;

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
 *  Dopóki fixture nie istnieje (Etapy 0–2), nie ma czego pilnować. */
export async function assertVisualFixture(page: Page): Promise<void> {
  if (FIXTURE_OFFERS === 0) return;
  const res = await page.request.get("/oferty/");
  if (!res.ok()) return; // brak strony diagnozuje assertPreview
  const html = await res.text();
  const cards = (html.match(OFFER_CARD_MARKER) ?? []).length;
  if (cards === 0 || cards > FIXTURE_OFFERS) {
    throw new Error(
      `Testy wizualne wymagają buildu na zamrożonej treści: /oferty/ ma ` +
        `${cards} kart, a tests/fixtures/offers ma ${FIXTURE_OFFERS} ofert. ` +
        `Odpal: pnpm build:visual && pnpm test:visual (zwykły pnpm build ` +
        `wciąga dane produkcyjne i rozjeżdża baseline'y).`,
    );
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
