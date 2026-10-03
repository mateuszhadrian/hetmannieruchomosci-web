// Klocki testów formularzy (Etap 5A). Lokalny preview serwuje sam `dist`
// — funkcji `/api/kontakt` tam nie ma — a testy nie wykonują żądań do
// sieci, więc endpoint i skrypt Turnstile są ZAWSZE zaślepiane:
// - `stubEndpoint` odpowiada zamiast funkcji i liczy żądania,
// - `recordPosts` zapisuje pola wysyłanego formularza po stronie strony
//   (treść multipart w przechwyconym żądaniu nie jest dostępna we
//   wszystkich silnikach),
// - `stubTurnstile` podstawia atrapę `window.turnstile` zamiast skryptu
//   dostawcy,
// - `installClock` / `passFillTime` dają deterministyczny czas
//   wypełnienia (pułapka MIN_FILL_MS) bez realnego czekania.
import { type Page, type Route } from "@playwright/test";
import {
  FORM_ENDPOINT,
  TURNSTILE_SRC,
} from "../../src/components/forms/form-config";
import { MIN_FILL_MS } from "../../src/lib/contact-form";

export const TURNSTILE_HOST = new URL(TURNSTILE_SRC).host;
export const STUB_TOKEN = "token-z-atrapy";

export interface FormPost {
  fields: Record<string, string>;
  accept: string | null;
}

/** Zapis pól każdego wysłanego formularza — wołać PRZED nawigacją. */
export async function recordPosts(page: Page): Promise<void> {
  await page.addInitScript((endpoint) => {
    const w = window as unknown as { __formPosts: unknown[] };
    w.__formPosts = [];
    const original = window.fetch.bind(window);
    window.fetch = (input, init) => {
      if (String(input).includes(endpoint) && init?.body instanceof FormData) {
        const fields: Record<string, string> = {};
        for (const [key, value] of init.body.entries()) {
          if (typeof value === "string") fields[key] = value;
        }
        w.__formPosts.push({
          fields,
          accept: new Headers(init.headers).get("accept"),
        });
      }
      return original(input, init);
    };
  }, FORM_ENDPOINT);
}

export async function readPosts(page: Page): Promise<FormPost[]> {
  return page.evaluate(
    () => (window as unknown as { __formPosts: FormPost[] }).__formPosts,
  );
}

export interface EndpointStub {
  /** Liczba żądań, które dotarły do endpointu. */
  count: () => number;
}

/** Odpowiada zamiast funkcji. `respond` może wstrzymać odpowiedź (stan
 *  wysyłania) — dostaje trasę i sam ją domyka. */
export async function stubEndpoint(
  page: Page,
  respond:
    | { status: number; body?: Record<string, unknown> }
    | ((route: Route) => Promise<void>) = { status: 200, body: { ok: true } },
): Promise<EndpointStub> {
  let count = 0;
  await page.route(`**${FORM_ENDPOINT}`, async (route) => {
    count++;
    if (typeof respond === "function") return respond(route);
    await route.fulfill({
      status: respond.status,
      contentType: "application/json",
      body: JSON.stringify(respond.body ?? { ok: respond.status < 400 }),
    });
  });
  return { count: () => count };
}

export interface TurnstileStub {
  /** Liczba żądań do hosta Turnstile. */
  count: () => number;
}

/** Atrapa skryptu Turnstile: `execute()` od razu oddaje token.
 *  `mode: "blocked"` = skrypt nie wstaje (przerwane żądanie). */
export async function stubTurnstile(
  page: Page,
  mode: "ok" | "blocked" = "ok",
): Promise<TurnstileStub> {
  let count = 0;
  await page.route(`https://${TURNSTILE_HOST}/**`, async (route) => {
    count++;
    if (mode === "blocked") return route.abort();
    await route.fulfill({
      status: 200,
      contentType: "application/javascript",
      body: `window.turnstile = {
        render(el, opts) { window.__tsOpts = opts; return "widget-1"; },
        execute() { window.__tsOpts.callback(${JSON.stringify(STUB_TOKEN)}); },
        reset() {},
      };`,
    });
  });
  return { count: () => count };
}

/** Sztuczny zegar — wołać PRZED nawigacją. Czas płynie normalnie, dopóki
 *  test go nie przesunie. */
export async function installClock(page: Page): Promise<void> {
  await page.clock.install({ time: new Date("2026-10-01T10:00:00+02:00") });
}

/** Przesuwa zegar za próg minimalnego czasu wypełnienia. */
export async function passFillTime(page: Page): Promise<void> {
  await page.clock.fastForward(MIN_FILL_MS + 1000);
}
