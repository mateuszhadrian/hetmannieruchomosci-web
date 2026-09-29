// Kontrakt progu desktop/mobile: stała *_DESKTOP_MIN_PX configu sekcji musi
// odpowiadać progowi @media w komponentach tej sekcji. CSS nie zaimportuje
// stałej (reguła sections.md), więc para jest utrzymywana RĘCZNIE — a do
// rundy refaktoru przed Etapem 7 nikt jej nie pilnował: sześć z siedmiu
// configów deklarowało w komentarzu ochronę testami, której nie było (R14).
//
// Helper mierzy `display` wybranych elementów PO OBU stronach progu:
// przy `minPx - 1` musi obowiązywać układ mobilny, przy `minPx` — desktopowy.
// Rozjazd w którąkolwiek stronę (ktoś zmienia @media i zapomina o stałej albo
// odwrotnie) daje czerwony test, także wtedy, gdy nowy próg leży między
// szerokościami profili testowych (te mają tylko 1366 i 1920).
import { expect, type Page } from "@playwright/test";
import { settle } from "./scroll";

/** Czyta `display` elementów spod podanych selektorów (klucz → selektor). */
async function displays(
  page: Page,
  selectors: Record<string, string>,
): Promise<Record<string, string>> {
  return page.evaluate((sels: Record<string, string>) => {
    const out: Record<string, string> = {};
    for (const [key, sel] of Object.entries(sels)) {
      const el = document.querySelector(sel);
      if (!el) throw new Error(`Brak elementu ${sel} (klucz ${key})`);
      out[key] = getComputedStyle(el).display;
    }
    return out;
  }, selectors);
}

/**
 * Sprawdza, że układ przełącza się DOKŁADNIE na progu `minPx`.
 * `below` opisuje oczekiwane `display` przy `minPx - 1`, `above` — przy `minPx`.
 * Wysokość viewportu zostaje bez zmian (próg jest wyłącznie szerokościowy).
 */
export async function expectBreakpointFlip(
  page: Page,
  minPx: number,
  selectors: Record<string, string>,
  below: Record<string, string>,
  above: Record<string, string>,
): Promise<void> {
  const height = page.viewportSize()?.height ?? 900;

  await page.setViewportSize({ width: minPx - 1, height });
  await settle(page, 150);
  expect(
    await displays(page, selectors),
    `układ mobilny musi obowiązywać przy ${minPx - 1} px`,
  ).toEqual(below);

  await page.setViewportSize({ width: minPx, height });
  await settle(page, 150);
  expect(
    await displays(page, selectors),
    `układ desktopowy musi obowiązywać już przy ${minPx} px`,
  ).toEqual(above);
}
