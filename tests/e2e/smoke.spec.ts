// Minimalny smoke (@prod-smoke): strona wstaje, nagłówek renderuje, brak
// błędów konsoli. PL-only. Ten sam kod biega w E2E na preview i po
// deployu przeciw adresowi produkcyjnemu bieżącej fazy:
// pnpm test:smoke:prod (BASE_URL).
// Selektory celowo ogólne (main h1) — mają przetrwać wymianę szkieletu
// Etapu 0 na docelowe widoki bez edycji smoke'a. Asercje formularzy
// i nagłówka noindex fazy podglądu dochodzą w Etapach 3 i 5.
import { expect, test } from "@playwright/test";
import { collectPageIssues } from "../helpers/guards";

test.describe("smoke", { tag: "@prod-smoke" }, () => {
  test("/ wstaje: 200, lang=pl, h1 renderuje, bez błędów konsoli", async ({
    page,
  }) => {
    const issues = collectPageIssues(page);
    const res = await page.goto("/", { waitUntil: "networkidle" });
    expect(res?.status()).toBe(200);
    await expect(page.locator("html")).toHaveAttribute("lang", "pl");
    await expect(page.locator("main h1")).toBeVisible();
    await expect(page.locator("main h1")).not.toBeEmpty();
    expect(issues()).toEqual([]);
  });

  for (const path of ["/oferty/", "/kontakt/"]) {
    test(`${path} wstaje: 200, h1 w DOM`, async ({ page }) => {
      const res = await page.goto(path, { waitUntil: "networkidle" });
      expect(res?.status()).toBe(200);
      await expect(page.locator("main h1")).toBeAttached();
    });
  }

  test("nieistniejący adres: status 404 i strona 404 (nie soft-404)", async ({
    request,
  }) => {
    // Bez dist/404.html Cloudflare Pages odpowiada stroną główną z kodem
    // 200 — ten test pilnuje, że na deployu działa prawdziwe 404.
    const res = await request.get("/nie-ma-takiej-strony-smoke/");
    expect(res.status()).toBe(404);
    const html = await res.text();
    expect(html).toContain("Strona o podanym adresie nie istnieje");
    expect(html).toContain('name="robots" content="noindex"');
  });

  test("kluczowe zasoby odpowiadają", async ({ request }) => {
    for (const path of ["/favicon.ico", "/site.webmanifest", "/og-image.png"]) {
      const res = await request.get(path);
      expect(res.ok(), path).toBe(true);
    }
  });

  test("POST /api/kontakt z honeypotem → 200 bez wysyłki maila", async ({
    request,
  }, testInfo) => {
    // Pages Function żyje tylko na deployu Cloudflare — lokalny preview
    // serwuje sam dist.
    test.skip(
      !process.env.BASE_URL,
      "endpoint istnieje tylko na deployu (BASE_URL)",
    );
    // Jedna sonda, nie 6: reguła WAF formularza blokuje serie POST-ów
    // z jednego IP — probe per projekt by ją strącał.
    test.skip(
      testInfo.project.name !== "chromium-1920",
      "sonda endpointu niezależna od przeglądarki — wystarczy raz",
    );
    // Wypełniony honeypot = ścieżka bot-trap: funkcja odpowiada 200 i CICHO
    // odrzuca PRZED wysyłką przez Resend — sonda nie generuje maili.
    const res = await request.post("/api/kontakt", {
      multipart: {
        // kontrakt pól odziedziczony z szablonu; zmienia się w Etapie 5
        name: "Prod Smoke",
        contact: "prod-smoke@example.com",
        place: "",
        message: "Sonda żywotności endpointu — honeypot celowo wypełniony.",
        firma: "smoke-probe-bot-trap",
        elapsed: "10000",
        lang: "pl",
        "cf-turnstile-response": "",
      },
    });
    expect(res.status()).toBe(200);
  });
});
