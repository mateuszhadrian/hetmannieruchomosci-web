// Endpoint formularzy (functions/api/kontakt.ts) — kolejność kroków
// i odpowiedzi z docs/analiza-formularze-a.md §4.2. Resend i Turnstile
// WYŁĄCZNIE jako atrapy `fetch`; magazyn limitu = atrapa w pamięci.
// Żaden test nie wykonuje żądania do sieci.
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { onRequest } from "../../functions/api/kontakt";
import {
  CONTACT_FROM_NOTIFY,
  CONTACT_TO,
  FORM_MAX_BYTES,
} from "../../src/lib/contact-form";
import { CONTACT_PATH, SELL_PATH } from "../../src/lib/routes";

const HOST = "https://podglad.example";
const ENDPOINT = `${HOST}/api/kontakt`;
const TURNSTILE = "https://challenges.cloudflare.com/turnstile/v0/siteverify";
const RESEND = "https://api.resend.com/emails";

// wartości sztuczne — testy nie znają prawdziwych sekretów
const ENV = { RESEND_API_KEY: "test-resend", TURNSTILE_SECRET_KEY: "test-ts" };

const KONTAKT = {
  form: "kontakt",
  name: "Anna Nowak",
  email: "anna@example.com",
  phone: "",
  message: "Proszę o kontakt w sprawie mieszkania.",
  firma: "",
  elapsed: "12000",
  "cf-turnstile-response": "token-z-atrapy",
};

const SPRZEDAJ = {
  form: "sprzedaj",
  type: "2",
  transaction: "131",
  name: "Jan Kowalski",
  email: "",
  phone: "600 100 200",
  location: "Poznań, Winogrady",
  area: "50",
  price: "500 000",
  notes: "",
  firma: "",
  elapsed: "12000",
  "cf-turnstile-response": "token-z-atrapy",
};

function post(
  fields: Record<string, string>,
  headers: Record<string, string> = {},
): Request {
  const body = new FormData();
  for (const [key, value] of Object.entries(fields)) body.append(key, value);
  return new Request(ENDPOINT, {
    method: "POST",
    headers: { accept: "application/json", ...headers },
    body,
  });
}

interface Call {
  url: string;
  init: RequestInit;
}

/** Atrapa `fetch`: Turnstile i Resend odpowiadają wg ustawień; każde
 *  wywołanie jest zapisywane. */
function stubFetch(
  opts: { turnstile?: boolean | "down"; resend?: number } = {},
) {
  const calls: Call[] = [];
  const fn = vi.fn(
    async (input: string | URL | Request, init?: RequestInit) => {
      const url = String(input);
      calls.push({ url, init: init ?? {} });
      if (url === TURNSTILE) {
        if (opts.turnstile === "down") throw new Error("sieć");
        return Response.json({ success: opts.turnstile ?? true });
      }
      if (url === RESEND) {
        return new Response("{}", { status: opts.resend ?? 200 });
      }
      throw new Error(`nieoczekiwane żądanie: ${url}`);
    },
  );
  vi.stubGlobal("fetch", fn);
  return calls;
}

const sentMail = (calls: Call[]) => {
  const call = calls.find((c) => c.url === RESEND);
  return call ? JSON.parse(String(call.init.body)) : undefined;
};

beforeEach(() => {
  vi.spyOn(console, "error").mockImplementation(() => {});
});
afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("endpoint formularzy: odrzucenia przed wysyłką", () => {
  it("metoda inna niż POST → 405", async () => {
    const calls = stubFetch();
    const res = await onRequest({
      request: new Request(ENDPOINT),
      env: ENV,
    });
    expect(res.status).toBe(405);
    expect(res.headers.get("allow")).toBe("POST");
    expect(calls).toHaveLength(0);
  });

  it("za duże żądanie odpada po nagłówku, przed czytaniem treści → 413", async () => {
    const calls = stubFetch();
    const res = await onRequest({
      request: post(KONTAKT, { "content-length": String(FORM_MAX_BYTES + 1) }),
      env: ENV,
    });
    expect(res.status).toBe(413);
    expect(calls).toHaveLength(0);
  });

  it("nieznany albo jeszcze nieobsługiwany rodzaj → 400 `form`", async () => {
    const calls = stubFetch();
    for (const form of ["", "inny", "oferta", "praca"]) {
      const res = await onRequest({
        request: post({ ...KONTAKT, form }),
        env: ENV,
      });
      expect(res.status, form).toBe(400);
      expect(await res.json(), form).toEqual({ ok: false, error: "form" });
    }
    expect(calls).toHaveLength(0);
  });

  it("pułapka (honeypot, czas, brak elapsed) → 200 i ZERO żądań", async () => {
    const calls = stubFetch();
    for (const trap of [
      { firma: "ACME" },
      { elapsed: "1500" },
      { elapsed: "" },
    ]) {
      const res = await onRequest({
        request: post({ ...KONTAKT, ...trap }),
        env: ENV,
      });
      expect(res.status).toBe(200);
      expect(await res.json()).toEqual({ ok: true });
    }
    expect(calls).toHaveLength(0);
  });

  it("pułapka działa także bez sekretów (sonda żywotności)", async () => {
    stubFetch();
    const res = await onRequest({
      request: post({ ...KONTAKT, firma: "sonda" }),
      env: {},
    });
    expect(res.status).toBe(200);
  });

  it("walidacja → 400 z listą pól, bez żądań", async () => {
    const calls = stubFetch();
    const res = await onRequest({
      request: post({ ...KONTAKT, name: "", email: "", message: "" }),
      env: ENV,
    });
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({
      ok: false,
      error: "fields",
      fields: ["name", "contact", "message"],
    });
    expect(calls).toHaveLength(0);
  });

  it("brak sekretów → 503 `config`, bez żądań i bez wartości w logu", async () => {
    const calls = stubFetch();
    const res = await onRequest({ request: post(KONTAKT), env: {} });
    expect(res.status).toBe(503);
    expect(await res.json()).toEqual({ ok: false, error: "config" });
    expect(calls).toHaveLength(0);
  });

  it("Turnstile odmawia → 403, Resend nietknięty", async () => {
    const calls = stubFetch({ turnstile: false });
    const res = await onRequest({ request: post(KONTAKT), env: ENV });
    expect(res.status).toBe(403);
    expect(await res.json()).toEqual({ ok: false, error: "turnstile" });
    expect(calls.map((c) => c.url)).toEqual([TURNSTILE]);
  });

  it("Turnstile nieosiągalny → 502", async () => {
    const calls = stubFetch({ turnstile: "down" });
    const res = await onRequest({ request: post(KONTAKT), env: ENV });
    expect(res.status).toBe(502);
    expect(sentMail(calls)).toBeUndefined();
  });

  it("limit dzienny wyczerpany → 503 `quota`, Resend nietknięty", async () => {
    const calls = stubFetch();
    const res = await onRequest({
      request: post(KONTAKT),
      env: {
        ...ENV,
        KONTAKT_KV: { get: async () => "80", put: async () => {} },
      },
    });
    expect(res.status).toBe(503);
    expect(await res.json()).toEqual({ ok: false, error: "quota" });
    expect(sentMail(calls)).toBeUndefined();
  });

  it("Resend odmawia → 502 `send`; log niesie sam kod HTTP", async () => {
    stubFetch({ resend: 422 });
    const res = await onRequest({ request: post(KONTAKT), env: ENV });
    expect(res.status).toBe(502);
    expect(await res.json()).toEqual({ ok: false, error: "send" });
    const logged = vi.mocked(console.error).mock.calls.flat().join(" ");
    expect(logged).toContain("422");
    expect(logged).not.toContain(ENV.RESEND_API_KEY);
    expect(logged).not.toContain("anna@example.com");
  });
});

describe("endpoint formularzy: wysyłka", () => {
  it("kontakt: jedno żądanie do Resend z właściwym nadawcą i adresatem", async () => {
    const calls = stubFetch();
    const res = await onRequest({ request: post(KONTAKT), env: ENV });
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true });
    expect(calls.map((c) => c.url)).toEqual([TURNSTILE, RESEND]);

    const turnstile = new URLSearchParams(String(calls[0].init.body));
    expect(turnstile.get("secret")).toBe(ENV.TURNSTILE_SECRET_KEY);
    expect(turnstile.get("response")).toBe("token-z-atrapy");

    const mail = sentMail(calls);
    expect(mail.from).toBe(CONTACT_FROM_NOTIFY);
    expect(mail.to).toEqual([CONTACT_TO]);
    expect(mail.reply_to).toBe("anna@example.com");
    expect(mail.subject).toMatch(/— kontakt$/);
    expect(mail.text).toContain("Proszę o kontakt w sprawie mieszkania.");
    expect(mail.html).toContain("Kontakt ze strony");
    expect(mail.headers["X-Entity-Ref-ID"]).toMatch(/^[0-9a-f-]{36}$/);
    expect(new Headers(calls[1].init.headers).get("authorization")).toBe(
      `Bearer ${ENV.RESEND_API_KEY}`,
    );
  });

  it("adres strony w mailu pochodzi z hosta żądania", async () => {
    const calls = stubFetch();
    await onRequest({ request: post(KONTAKT), env: ENV });
    expect(sentMail(calls).text).toContain(`Strona: ${HOST}${CONTACT_PATH}`);
  });

  it("sam telefon → żądanie BEZ pola reply_to", async () => {
    const calls = stubFetch();
    const res = await onRequest({
      request: post({ ...KONTAKT, email: "", phone: "600 100 200" }),
      env: ENV,
    });
    expect(res.status).toBe(200);
    expect(sentMail(calls)).not.toHaveProperty("reply_to");
  });

  it("zgłoszenie nieruchomości: mail niesie powierzchnię i cenę", async () => {
    const calls = stubFetch();
    const res = await onRequest({ request: post(SPRZEDAJ), env: ENV });
    expect(res.status).toBe(200);
    const mail = sentMail(calls);
    expect(mail.subject).toMatch(/— zgłoszenie nieruchomości$/);
    expect(mail.text).toContain("Powierzchnia:\n50 m²");
    expect(mail.text).toContain("Cena:\n500 000 zł");
    expect(mail.text).toContain("Typ nieruchomości:\nMieszkanie");
    expect(mail.text).toContain(`Strona: ${HOST}${SELL_PATH}`);
    expect(mail).not.toHaveProperty("reply_to");
  });

  it("limit dzienny: licznik rośnie o jeden na wysłane zgłoszenie", async () => {
    stubFetch();
    const store = new Map<string, string>();
    const kv = {
      get: async (key: string) => store.get(key) ?? null,
      put: async (key: string, value: string) => void store.set(key, value),
    };
    await onRequest({
      request: post(KONTAKT),
      env: { ...ENV, KONTAKT_KV: kv },
    });
    await onRequest({
      request: post(KONTAKT),
      env: { ...ENV, KONTAKT_KV: kv },
    });
    expect([...store.values()]).toEqual(["2"]);
    expect([...store.keys()][0]).toMatch(/^quota:\d{4}-\d{2}-\d{2}$/);
  });

  it("KONTAKT_TO nadpisuje adresata; wartość niebędąca adresem jest ignorowana", async () => {
    let calls = stubFetch();
    await onRequest({
      request: post(KONTAKT),
      env: { ...ENV, KONTAKT_TO: "testy@example.com" },
    });
    expect(sentMail(calls).to).toEqual(["testy@example.com"]);

    calls = stubFetch();
    await onRequest({
      request: post(KONTAKT),
      env: { ...ENV, KONTAKT_TO: "nie-adres" },
    });
    expect(sentMail(calls).to).toEqual([CONTACT_TO]);
  });
});

describe("endpoint formularzy: wysyłka bez JS", () => {
  const plain = (referer?: string) => {
    const body = new FormData();
    for (const [key, value] of Object.entries(KONTAKT)) body.append(key, value);
    return new Request(ENDPOINT, {
      method: "POST",
      headers: {
        accept: "text/html,application/xhtml+xml",
        ...(referer ? { referer } : {}),
      },
      body,
    });
  };

  it("zwykły submit → 303 na stronę formularza, bez żądań", async () => {
    const calls = stubFetch();
    const res = await onRequest({
      request: plain(`${HOST}${SELL_PATH}`),
      env: ENV,
    });
    expect(res.status).toBe(303);
    expect(res.headers.get("location")).toBe(`${HOST}${SELL_PATH}#formularz`);
    expect(calls).toHaveLength(0);
  });

  it("obcy albo brakujący Referer → strona kontaktu na własnym hoście", async () => {
    stubFetch();
    for (const referer of [
      undefined,
      "https://obcy.example/kontakt/",
      `${HOST}/oferty/`,
      "nie-adres",
    ]) {
      const res = await onRequest({ request: plain(referer), env: ENV });
      expect(res.status).toBe(303);
      expect(res.headers.get("location"), String(referer)).toBe(
        `${HOST}${CONTACT_PATH}#formularz`,
      );
    }
  });
});
