// Minimalny smoke (@prod-smoke): strona wstaje, nagłówek renderuje, brak
// błędów konsoli. PL-only. Ten sam kod biega w E2E na preview i po
// deployu przeciw adresowi produkcyjnemu bieżącej fazy:
// pnpm test:smoke:prod (BASE_URL).
// Selektory celowo ogólne (main h1) — mają przetrwać wymianę szkieletu
// Etapu 0 na docelowe widoki bez edycji smoke'a. Asercja nagłówka noindex
// fazy podglądu — Etap 3 (niżej); sonda endpointu formularzy — Etap 5A.
import { expect, test } from "@playwright/test";
import { collectPageIssues, useMediaStub } from "../helpers/guards";

// „/" niesie od 4.4 kafle ofert — obrazy z hosta mediów idą przez zaślepkę
useMediaStub();

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

  test("FAZA PODGLĄDU: nagłówek x-robots-tag: noindex JEST na deployu", async ({
    request,
  }) => {
    // Nagłówek nadaje Cloudflare Pages z public/_headers (wpis dla
    // nowa.hetmannieruchomosci.com i *.pages.dev) — lokalny preview go nie
    // czyta, stąd tylko z BASE_URL. Chroni klientkę przed zaindeksowaniem
    // podglądu obok obecnej strony (duplikat treści).
    // ETAP 8 (przełączenie domeny): ta asercja jest ODWRACANA — na apeksie
    // hetmannieruchomosci.com nagłówka NIE MA (domena główna nie ma wpisu
    // w _headers); zmiana razem z PROD_URL i BASE_URL w tym samym PR.
    test.skip(
      !process.env.BASE_URL,
      "nagłówki z _headers nadaje tylko Cloudflare Pages (BASE_URL)",
    );
    for (const path of ["/", "/oferty/"]) {
      const res = await request.get(path);
      expect(res.status(), path).toBe(200);
      expect(res.headers()["x-robots-tag"], `${path}: x-robots-tag`).toMatch(
        /noindex/,
      );
    }
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
    // Jedna sonda, nie 6: endpoint jest niezależny od przeglądarki, a seria
    // POST-ów z jednego adresu wyglądałaby jak nadużycie.
    test.skip(
      testInfo.project.name !== "chromium-1920",
      "sonda endpointu niezależna od przeglądarki — wystarczy raz",
    );
    // Wypełniony honeypot = ścieżka bot-trap: funkcja odpowiada 200 i CICHO
    // odrzuca PRZED weryfikacją i wysyłką — sonda nie generuje maili
    // i działa także bez sekretów w środowisku. Nagłówek `accept` jak
    // w module klienckim (bez niego funkcja traktuje POST jako wysyłkę
    // bez JS i odsyła 303 na stronę formularza).
    const res = await request.post("/api/kontakt", {
      headers: { accept: "application/json" },
      multipart: {
        form: "kontakt",
        name: "Prod Smoke",
        email: "prod-smoke@example.com",
        phone: "",
        message: "Sonda żywotności endpointu — honeypot celowo wypełniony.",
        firma: "smoke-probe-bot-trap",
        elapsed: "10000",
        "cf-turnstile-response": "",
      },
    });
    expect(res.status()).toBe(200);
    expect(await res.json()).toEqual({ ok: true });
  });
});
