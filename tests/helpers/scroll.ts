// Scroll w testach: natywny window.scrollTo, settle = 2×rAF + timeout.
// Gałąź Lenisa odeszła razem z biblioteką (D-Q1) — scroll w serwisie jest
// natywny wszędzie, więc testy przewijają dokładnie tak jak użytkownik.
import { type Page } from "@playwright/test";

/** Czeka aż strona „usiądzie": 2×rAF (pętla ruchu dogania) + timeout. */
export async function settle(page: Page, ms = 350): Promise<void> {
  await page.evaluate(
    () =>
      new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))),
  );
  await page.waitForTimeout(ms);
}

/** Przewija stronę do pozycji y i czeka, aż usiądzie. */
export async function scrollPageTo(page: Page, y: number): Promise<void> {
  await page.evaluate((top) => window.scrollTo(0, top), Math.round(y));
  await settle(page);
}

/**
 * Płynny dojazd do y (ease-out, rAF) — dla scen przypiętych, których postęp
 * jest przeliczany w pętli rAF przy każdej zmianie pozycji scrolla. Skok
 * „immediate" nie daje im ani jednej klatki na dogonienie celu, więc
 * pierwsza klatka po skoku bywa policzona ze starego postępu. Dojazd
 * z wyhamowaniem pozwala pętli nadążyć.
 */
async function scrollPageToSmooth(
  page: Page,
  y: number,
  ms = 1500,
): Promise<void> {
  await page.evaluate(
    async ({ top, ms }) => {
      const from = window.scrollY;
      const delta = top - from;
      const t0 = performance.now();
      await new Promise<void>((done) => {
        const tick = (now: number) => {
          const t = Math.min((now - t0) / ms, 1);
          const eased = 1 - Math.pow(1 - t, 3);
          const pos = from + delta * eased;
          window.scrollTo(0, pos);
          if (t < 1) requestAnimationFrame(tick);
          else done();
        };
        requestAnimationFrame(tick);
      });
    },
    { top: Math.round(y), ms },
  );
  await settle(page);
}

/**
 * Dojeżdża płynnie do y i czeka aż pozycja USIĄDZIE dokładnie tam
 * (tolerancja 2 px, do 3 prób) — inaczej rzuca. W projekcie nie ma scroll-snapa
 * na osi strony, więc jedyne, co może tu przeszkodzić, to zmiana wysokości
 * dokumentu w trakcie dojazdu (dogrywane zdjęcia).
 */
export async function scrollPageToStable(
  page: Page,
  y: number,
  tries = 3,
): Promise<void> {
  const target = Math.round(y);
  for (let i = 0; i < tries; i++) {
    await scrollPageToSmooth(page, target);
    // Bufor po dojeździe: pętle ruchu i dogrywane zdjęcia potrafią jeszcze
    // ruszyć pozycją. Wartość dobrana empirycznie — nie skracać bez pomiaru
    // na wolnym runnerze CI.
    await page.waitForTimeout(900);
    const at = await page.evaluate(() => window.scrollY);
    if (Math.abs(at - target) <= 2) return;
  }
  const at = await page.evaluate(() => window.scrollY);
  throw new Error(
    `scrollPageToStable: pozycja nie zbiegła do ${target} (jest ${at}) — ` +
      `czy dokument nie zmienia wysokości w trakcie dojazdu?`,
  );
}

/** Nawigacja + fonty gotowe — wspólny start testów E2E. */
export async function gotoReady(page: Page, path = "/"): Promise<void> {
  await page.goto(path, { waitUntil: "networkidle" });
  await page.evaluate(() => document.fonts?.ready);
}
