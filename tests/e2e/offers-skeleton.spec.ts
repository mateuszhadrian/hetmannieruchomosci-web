// Szkielet tras ofert (2.8): adres pierwszej oferty z danych produkcyjnych
// odpowiada 200 z h1, numerem i ceną; lista typ×transakcja odpowiada 200
// i ma znacznik karty; krótki adres `/{NUMER}` przekierowuje na detal
// (reguła z `_redirects` — działa tylko na deployu, lokalny preview jej
// nie czyta). Oferty przez helper; przy zerze ofert — skip z powodem.
// Żądania do hosta mediów są przechwytywane (useMediaStub — żadnej sieci
// w testach).
import { expect, test } from "@playwright/test";
import { collectPageIssues, useMediaStub } from "../helpers/guards";
import { offerRoutesFromData, readOffersTyped } from "../helpers/offers";

const ROUTES = offerRoutesFromData();
const OFFERS = readOffersTyped();
const FIRST = ROUTES.details[0];
const NO_OFFERS = "brak ofert w data/ (zero ofert = stan dopuszczalny)";

test.describe("szkielet ofert", { tag: "@prod-smoke" }, () => {
  useMediaStub();

  test("detal pierwszej oferty: 200, h1, numer, cena", async ({ page }) => {
    test.skip(!FIRST, NO_OFFERS);
    const issues = collectPageIssues(page);
    const res = await page.goto(FIRST!, { waitUntil: "networkidle" });
    expect(res?.status()).toBe(200);
    await expect(page.locator("main h1")).toBeAttached();
    const number = OFFERS[0].number;
    await expect(page.locator("[data-offer-number]")).toHaveText(number);
    await expect(page.locator("[data-offer-price]")).not.toBeEmpty();
    expect(issues()).toEqual([]);
  });

  test("lista typ×transakcja: 200 i znaczniki kart", async ({ page }) => {
    test.skip(ROUTES.lists.length === 0, NO_OFFERS);
    const res = await page.goto(ROUTES.lists[0], { waitUntil: "networkidle" });
    expect(res?.status()).toBe(200);
    expect(await page.locator("[data-offer-card]").count()).toBeGreaterThan(0);
  });

  test("krótki adres /{NUMER} → 301 → detal (tylko na deployu)", async ({
    request,
  }) => {
    test.skip(!FIRST, NO_OFFERS);
    test.skip(
      !process.env.BASE_URL,
      "_redirects czyta tylko Cloudflare Pages — lokalny preview nie",
    );
    const number = OFFERS[0].number;
    const res = await request.get(`/${number}`, { maxRedirects: 0 });
    expect(res.status()).toBe(301);
    expect(res.headers().location).toContain(FIRST!);
  });
});
