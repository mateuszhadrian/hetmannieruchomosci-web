// Przełącznik SHOW_PRACA (src/lib/site-config.ts) — co znaczy stan
// WYŁĄCZONY (docs/analiza-formularze-b.md Q7): pozycja znika z nawigacji,
// strona wypada z sitemapy, funkcja formularzy odrzuca `form=praca`.
// Testy e2e biegają na przełączniku włączonym; stan wyłączony pilnuje ta
// warstwa (moduły ładowane z podmienionym configiem).
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  CONTACT_PATH,
  isSitemapPath,
  JOBS_PATH,
  STATIC_PATHS,
} from "../../src/lib/routes";

const CONFIG = "../../src/lib/site-config";

/** Ładuje moduł na świeżo z przełącznikiem w zadanym stanie. */
async function withShowPraca<T>(
  value: boolean,
  load: () => Promise<T>,
): Promise<T> {
  vi.resetModules();
  vi.doMock(CONFIG, async (original) => ({
    ...(await original<typeof import("../../src/lib/site-config")>()),
    SHOW_PRACA: value,
  }));
  return load();
}

afterEach(() => {
  vi.doUnmock(CONFIG);
  vi.resetModules();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("SHOW_PRACA: sitemapa", () => {
  it("włączony: wszystkie trasy statyczne; strona 404 nigdy", () => {
    for (const path of STATIC_PATHS) {
      expect(isSitemapPath(path, true), path).toBe(true);
    }
    for (const path of ["/404", "/404/", "/oferty/404/"]) {
      expect(isSitemapPath(path, true), path).toBe(false);
      expect(isSitemapPath(path, false), path).toBe(false);
    }
  });

  it("wyłączony: bez podstrony „Praca”, reszta bez zmian", () => {
    expect(isSitemapPath(JOBS_PATH, false)).toBe(false);
    for (const path of STATIC_PATHS.filter((p) => p !== JOBS_PATH)) {
      expect(isSitemapPath(path, false), path).toBe(true);
    }
    expect(isSitemapPath("/oferty/mieszkanie-na-sprzedaz/", false)).toBe(true);
  });

  it("wartość domyślna filtra idzie za przełącznikiem", async () => {
    const off = await withShowPraca(
      false,
      () => import("../../src/lib/routes"),
    );
    expect(off.isSitemapPath(JOBS_PATH)).toBe(false);
    const on = await withShowPraca(true, () => import("../../src/lib/routes"));
    expect(on.isSitemapPath(JOBS_PATH)).toBe(true);
  });
});

describe("SHOW_PRACA: nawigacja", () => {
  it("wyłączony: pozycja znika z menu i z mapy strony w stopce", async () => {
    const off = await withShowPraca(false, () => import("../../src/i18n/nav"));
    expect(off.mainNavItems.map((i) => i.href)).not.toContain(JOBS_PATH);
    expect(off.footerNavItems.map((i) => i.href)).not.toContain(JOBS_PATH);
    const on = await withShowPraca(true, () => import("../../src/i18n/nav"));
    expect(on.mainNavItems.map((i) => i.href)).toContain(JOBS_PATH);
    expect(on.footerNavItems.map((i) => i.href)).toContain(JOBS_PATH);
  });
});

describe("SHOW_PRACA: funkcja formularzy", () => {
  const HOST = "https://podglad.example";
  const request = (form: string): Request => {
    const body = new FormData();
    for (const [key, value] of Object.entries({
      form,
      name: "Maria Wiśniewska",
      email: "maria@example.com",
      message: "Proszę o kontakt.",
      firma: "",
      elapsed: "12000",
    })) {
      body.append(key, value);
    }
    body.append("cv", new File(["%PDF-1.7 test"], "cv.pdf"));
    return new Request(`${HOST}/api/kontakt`, {
      method: "POST",
      headers: { accept: "application/json", "content-length": "4096" },
      body,
    });
  };

  it("wyłączony: `form=praca` odrzucone jak nieznany rodzaj, bez żądań", async () => {
    const fetchSpy = vi.fn();
    vi.stubGlobal("fetch", fetchSpy);
    const { onRequest } = await withShowPraca(
      false,
      () => import("../../functions/api/kontakt"),
    );
    const res = await onRequest({
      request: request("praca"),
      env: { RESEND_API_KEY: "x", TURNSTILE_SECRET_KEY: "y" },
    });
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ ok: false, error: "form" });
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("włączony: ten sam rodzaj przechodzi do walidacji", async () => {
    vi.stubGlobal("fetch", vi.fn());
    const { onRequest } = await withShowPraca(
      true,
      () => import("../../functions/api/kontakt"),
    );
    // bez sekretów: zgłoszenie poprawne co do pól dochodzi do kroku konfiguracji
    const res = await onRequest({ request: request("praca"), env: {} });
    expect(res.status).toBe(503);
    expect(await res.json()).toEqual({ ok: false, error: "config" });
  });

  it("wyłączony: strona „Praca” nadal jest celem powrotu po wysyłce bez JS", async () => {
    const { onRequest } = await withShowPraca(
      false,
      () => import("../../functions/api/kontakt"),
    );
    const res = await onRequest({
      request: new Request(`${HOST}/api/kontakt`, {
        method: "POST",
        headers: { referer: `${HOST}${JOBS_PATH}` },
        body: new FormData(),
      }),
      env: {},
    });
    expect(res.status).toBe(303);
    expect(res.headers.get("location")).toBe(`${HOST}${JOBS_PATH}#formularz`);
    expect(CONTACT_PATH).not.toBe(JOBS_PATH);
  });
});
