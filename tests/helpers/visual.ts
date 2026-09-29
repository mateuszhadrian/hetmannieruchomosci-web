// Wspólne klocki testów wizualnych: freeze.css, determinizm zdjęć i start
// sweepa.
import { fileURLToPath } from "node:url";
import { type Page } from "@playwright/test";
import { gotoReady, scrollPageTo, settle } from "./scroll";

/** Arkusz zerujący czasowe animacje CSS — determinizm klatek. */
const FREEZE = fileURLToPath(new URL("./freeze.css", import.meta.url));

/** Po wstrzyknięciu freeze.css strona musi zdążyć przemalować zatrzymane
 *  animacje, zanim zaczniemy mierzyć kotwice i fotografować. */
const FREEZE_REPAINT_MS = 400;

/**
 * Determinizm ZDJĘĆ: przy zrzucie elementu wyższego niż viewport
 * Playwright zszywa go z kilku przewinięć, więc obraz `lazy`+`async` bywa
 * rasteryzowany w trakcie dekodowania. Objaw diagnostyczny: różnice
 * WYŁĄCZNIE na krawędziach zdjęć, tekst pikselowo identyczny (czerwone CI
 * przy zielonym przebiegu lokalnym). Eager+sync i doczekanie `decode()`
 * zdejmuje wyścig; dla obrazów już wczytanych to no-op.
 */
export async function settleImages(page: Page): Promise<void> {
  await page.evaluate(async () => {
    const imgs = Array.from(document.images);
    for (const img of imgs) {
      img.loading = "eager";
      img.decoding = "sync";
    }
    await Promise.all(
      imgs.map((img) =>
        img.complete
          ? img.decode().catch(() => undefined)
          : new Promise<void>((resolve) => {
              img.addEventListener("load", () => resolve(), { once: true });
              img.addEventListener("error", () => resolve(), { once: true });
            }),
      ),
    );
  });
}

/** Wspólny start sweepa: nawigacja + freeze.css + repaint + zdjęcia. */
export async function prepareSweep(page: Page, path = "/"): Promise<void> {
  await gotoReady(page, path);
  await page.addStyleTag({ path: FREEZE });
  await page.waitForTimeout(FREEZE_REPAINT_MS);
  await settleImages(page);
}

/**
 * Przejazd przez całą stronę (odpala IO revealów), powrót na górę.
 * Utwardzony po flake'u webkit-CI w szablonie:
 * (1) dół strony dostaje PEŁNE settle — na wolnym WebKit
 * IntersectionObserver nie zdąża policzyć przecięć w pauzie kroku
 * (140 ms) i reveale ostatniej sekcji PRZEPADAŁY po skoku na górę
 * (CTA bez tekstu na zrzucie); (2) po powrocie na górę wymuszamy
 * przemalunek pętli rAF modułów ruchu zdarzeniem scroll — WebKit
 * potrafi nie dostarczyć zdarzenia po programowym skoku i parallaxy
 * zostawały z transformami ze środka przejazdu.
 */
export async function revealSweep(page: Page): Promise<void> {
  const total = await page.evaluate(
    () => document.body.scrollHeight - window.innerHeight,
  );
  const step = await page.evaluate(() => Math.round(window.innerHeight * 0.7));
  for (let y = step; y < total + step; y += step) {
    await page.evaluate((top) => window.scrollTo(0, top), Math.min(y, total));
    await page.waitForTimeout(140);
  }
  await settle(page, 400);

  // Dociśnięcie maruderów: na wolnym WebKit IO potrafi policzyć
  // przecięcie już PO odjeździe na kolejny krok — element bywał w kadrze
  // tylko przez jedną pauzę i jego reveal/rysowanie przepadało.
  // Każdy wciąż uzbrojony element wjeżdża do kadru na pełne settle;
  // elementy nieodhaczalne (schowane pod zwiniętym max-height — IO tnie
  // intersectionRect po overflow przodka) odpuszczamy po 3 przebiegach.
  // Selektory = atrybuty wejść z content-motion.ts (dopasowanie do
  // reveali designu razem z tym modułem, Etap 4).
  const armed = page.locator(
    "html.js-motion [data-rev]:not(.in), html.js-motion [data-ryc]:not(.in), html.js-motion [data-rycsb]:not(.in)",
  );
  for (let pass = 0; pass < 3 && (await armed.count()) > 0; pass++) {
    for (const el of await armed.all()) {
      if (!(await el.isVisible().catch(() => false))) continue;
      // TYLKO scroll dokumentu — scrollIntoViewIfNeeded przewija też
      // przewijalne KONTENERY po drodze (pudełka overflow:hidden są
      // przewijalne programowo) i rozjeżdżał okna zwiniętych akapitów.
      await el
        .evaluate((node) => {
          const r = node.getBoundingClientRect();
          window.scrollTo(
            0,
            Math.max(0, r.top + window.scrollY - window.innerHeight / 2),
          );
        })
        .catch(() => {});
      await settle(page, 200);
    }
  }

  await scrollPageTo(page, 0);
  // Wymuszony przemalunek pętli rAF przy y=0: WebKit potrafi zgubić
  // zdarzenie scroll po programowym skoku (pętla nie namalowałaby
  // stanu końcowego transformów).
  await page.evaluate(() => window.dispatchEvent(new Event("scroll")));
  await settle(page, 400);
}
