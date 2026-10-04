// Endpoint formularzy (functions/api/kontakt.ts) — kolejność kroków
// i odpowiedzi z docs/analiza-formularze-a.md §4.2 i analiza-formularze-b.md
// §3.1. Resend i Turnstile WYŁĄCZNIE jako atrapy `fetch`; magazyn limitu
// i binding plików statycznych (indeks ofert) = atrapy w pamięci.
// Żaden test nie wykonuje żądania do sieci.
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { onRequest } from "../../functions/api/kontakt";
import {
  CONTACT_FROM_NOTIFY,
  CONTACT_TO,
  FORM_MAX_BYTES,
  OFFER_NOT_IN_INDEX,
} from "../../src/lib/contact-form";
import {
  CONTACT_PATH,
  OFFERS_INDEX_PATH,
  SELL_PATH,
} from "../../src/lib/routes";

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

// dane SYNTETYCZNE — numer i adres nie istnieją w żadnym źródle
const OFFER_PATH = "/oferty/mieszkanie-na-sprzedaz/poznan-testowo/xx000111/";
const OFERTA = {
  form: "oferta",
  offer: "XX000111",
  name: "Ewa Zielińska",
  email: "ewa@example.com",
  phone: "",
  message: "Jestem zainteresowana tą ofertą. Proszę o kontakt.",
  firma: "",
  elapsed: "12000",
  "cf-turnstile-response": "token-z-atrapy",
};
const INDEX = {
  offers: [
    {
      number: "XX000222",
      path: "/oferty/dom-na-sprzedaz/testowo/xx000222/",
      title: "Inna oferta",
      location: { city: "Testowo" },
    },
    {
      number: "XX000111",
      path: OFFER_PATH,
      title: "Mieszkanie <b>testowe</b> 2 pokoje",
      location: { city: "Poznań", district: "Testowo", street: "Próbna" },
    },
  ],
  locations: {},
};

/** Atrapa bindingu plików statycznych: serwuje wyłącznie indeks ofert. */
function stubAssets(index: unknown = INDEX, status = 200) {
  const urls: string[] = [];
  return {
    urls,
    ASSETS: {
      fetch: async (input: string | URL | Request) => {
        urls.push(String(input));
        return new Response(JSON.stringify(index), { status });
      },
    },
  };
}

/** Żądanie formularza. Nagłówek `content-length` ustawiamy jawnie (jak
 *  przeglądarka) — funkcja rozstrzyga o rozmiarze po nagłówku, zanim
 *  przeczyta treść; `null` = żądanie bez deklaracji rozmiaru. */
function post(
  fields: Record<string, string>,
  headers: Record<string, string | null> = {},
): Request {
  const body = new FormData();
  for (const [key, value] of Object.entries(fields)) body.append(key, value);
  const all: Record<string, string> = {};
  for (const [key, value] of Object.entries({
    accept: "application/json",
    "content-length": "2048",
    ...headers,
  })) {
    if (value !== null) all[key] = value;
  }
  return new Request(ENDPOINT, { method: "POST", headers: all, body });
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
    const request = post(KONTAKT, {
      "content-length": String(FORM_MAX_BYTES + 1),
    });
    const read = vi.spyOn(request, "formData");
    const res = await onRequest({ request, env: ENV });
    expect(res.status).toBe(413);
    expect(read).not.toHaveBeenCalled();
    expect(calls).toHaveLength(0);
  });

  it("żądanie bez deklaracji rozmiaru nie jest czytane → 411", async () => {
    const calls = stubFetch();
    for (const value of [null, "", "abc", "-5", "12.5"]) {
      const request = post(KONTAKT, { "content-length": value });
      const read = vi.spyOn(request, "formData");
      const res = await onRequest({ request, env: ENV });
      expect(res.status, String(value)).toBe(411);
      expect(await res.json()).toEqual({ ok: false, error: "length-required" });
      expect(read, String(value)).not.toHaveBeenCalled();
    }
    expect(calls).toHaveLength(0);
  });

  it("nieznany albo jeszcze nieobsługiwany rodzaj → 400 `form`", async () => {
    const calls = stubFetch();
    for (const form of ["", "inny", "praca"]) {
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

describe("endpoint formularzy: zapytanie o ofertę", () => {
  it("numer z indeksu → mail z tytułem, lokalizacją i adresem Z INDEKSU", async () => {
    const calls = stubFetch();
    const assets = stubAssets();
    const res = await onRequest({
      request: post(OFERTA),
      env: { ...ENV, ASSETS: assets.ASSETS },
    });
    expect(res.status).toBe(200);
    expect(calls.map((c) => c.url)).toEqual([TURNSTILE, RESEND]);
    expect(assets.urls).toEqual([`${HOST}${OFFERS_INDEX_PATH}`]);

    const mail = sentMail(calls);
    expect(mail.subject).toMatch(/^Zapytanie do agenta ze strony www /);
    expect(mail.subject).toMatch(/— oferta XX000111$/);
    expect(mail.to).toEqual([CONTACT_TO]);
    expect(mail.reply_to).toBe("ewa@example.com");
    expect(mail.text).toContain(`${HOST}${OFFER_PATH}`);
    expect(mail.text).toContain("Mieszkanie <b>testowe</b> 2 pokoje · Poznań");
    expect(mail.text).toContain("Próbna");
    expect(mail.text).toContain(`Strona: ${HOST}${OFFER_PATH}`);
    expect(mail.text).toContain("Jestem zainteresowana tą ofertą.");
    // wartości z indeksu escapowane jak dane klienta
    expect(mail.html).toContain("Mieszkanie &lt;b&gt;testowe&lt;/b&gt;");
    expect(mail.html).not.toContain("<b>testowe</b>");
    expect(mail.html).toContain(`<a href="${HOST}${OFFER_PATH}"`);
  });

  it("tytuł i adres dosłane przez klienta NIE trafiają do maila", async () => {
    const calls = stubFetch();
    await onRequest({
      request: post({
        ...OFERTA,
        title: "PODSTAWIONY TYTUŁ",
        url: "https://obcy.example/pulapka",
        path: "/oferty/podstawiona/",
      }),
      env: { ...ENV, ASSETS: stubAssets().ASSETS },
    });
    const mail = sentMail(calls);
    for (const part of [mail.subject, mail.text, mail.html]) {
      expect(part).not.toContain("PODSTAWIONY");
      expect(part).not.toContain("obcy.example");
      expect(part).not.toContain("podstawiona");
    }
  });

  it("numer małymi literami jest tym samym numerem", async () => {
    const calls = stubFetch();
    await onRequest({
      request: post({ ...OFERTA, offer: "xx000111" }),
      env: { ...ENV, ASSETS: stubAssets().ASSETS },
    });
    expect(sentMail(calls).subject).toMatch(/— oferta XX000111$/);
    expect(sentMail(calls).text).toContain(`${HOST}${OFFER_PATH}`);
  });

  it("numer spoza indeksu → zgłoszenie wychodzi z dopiskiem, bez tytułu i linku", async () => {
    const calls = stubFetch();
    const res = await onRequest({
      request: post({ ...OFERTA, offer: "XX999999" }),
      env: { ...ENV, ASSETS: stubAssets().ASSETS },
    });
    expect(res.status).toBe(200);
    const mail = sentMail(calls);
    expect(mail.subject).toMatch(/— oferta XX999999$/);
    expect(mail.text).toContain(OFFER_NOT_IN_INDEX);
    expect(mail.text).not.toContain("testowe");
    expect(mail.html).not.toContain("<a href");
    expect(mail.text).toContain(`Strona: ${HOST}/oferty/`);
  });

  it("indeks nieczytelny albo brak bindingu → to samo, bez błędu wysyłki", async () => {
    for (const env of [
      { ...ENV },
      { ...ENV, ASSETS: stubAssets(INDEX, 500).ASSETS },
      { ...ENV, ASSETS: stubAssets("to nie jest indeks").ASSETS },
      { ...ENV, ASSETS: stubAssets({ offers: [{ number: 7 }, null] }).ASSETS },
      {
        ...ENV,
        ASSETS: {
          fetch: async () => {
            throw new Error("binding");
          },
        },
      },
    ]) {
      const calls = stubFetch();
      const res = await onRequest({ request: post(OFERTA), env });
      expect(res.status).toBe(200);
      expect(sentMail(calls).text).toContain(OFFER_NOT_IN_INDEX);
    }
    // log bez numeru oferty i bez danych klienta
    const logged = vi.mocked(console.error).mock.calls.flat().join(" ");
    expect(logged).not.toContain("XX000111");
    expect(logged).not.toContain("ewa@example.com");
  });

  it("wpis indeksu z adresem spoza ofert jest pomijany", async () => {
    const calls = stubFetch();
    const index = {
      offers: [{ ...INDEX.offers[1], path: "https://obcy.example/x" }],
    };
    await onRequest({
      request: post(OFERTA),
      env: { ...ENV, ASSETS: stubAssets(index).ASSETS },
    });
    expect(sentMail(calls).text).toContain(OFFER_NOT_IN_INDEX);
    expect(sentMail(calls).html).not.toContain("obcy.example");
  });

  it("numer o złym kształcie → 400 z polem `offer`, indeks nieczytany", async () => {
    const calls = stubFetch();
    const assets = stubAssets();
    for (const offer of ["", "111", "XX 111", "XX000111<script>", "../x"]) {
      const res = await onRequest({
        request: post({ ...OFERTA, offer }),
        env: { ...ENV, ASSETS: assets.ASSETS },
      });
      expect(res.status, offer).toBe(400);
      expect(await res.json(), offer).toEqual({
        ok: false,
        error: "fields",
        fields: ["offer"],
      });
    }
    expect(calls).toHaveLength(0);
    expect(assets.urls).toHaveLength(0);
  });

  it("indeks czytany dopiero PO pułapce, walidacji, Turnstile i limicie", async () => {
    const assets = stubAssets();
    const env = { ...ENV, ASSETS: assets.ASSETS };

    stubFetch();
    await onRequest({ request: post({ ...OFERTA, firma: "bot" }), env });
    await onRequest({ request: post({ ...OFERTA, name: "" }), env });
    await onRequest({ request: post(OFERTA), env: { ASSETS: assets.ASSETS } });

    stubFetch({ turnstile: false });
    await onRequest({ request: post(OFERTA), env });

    stubFetch();
    await onRequest({
      request: post(OFERTA),
      env: {
        ...env,
        KONTAKT_KV: { get: async () => "80", put: async () => {} },
      },
    });
    expect(assets.urls).toHaveLength(0);
  });
});

describe("endpoint formularzy: wysyłka bez JS", () => {
  const plain = (referer?: string) =>
    post(KONTAKT, {
      accept: "text/html,application/xhtml+xml",
      // zwykły submit odpada PRZED kontrolą rozmiaru i przed czytaniem treści
      "content-length": null,
      ...(referer ? { referer } : {}),
    });

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

  it("submit z detalu oferty wraca na TEN detal", async () => {
    const calls = stubFetch();
    const res = await onRequest({
      request: plain(`${HOST}${OFFER_PATH}?utm=x`),
      env: ENV,
    });
    expect(res.status).toBe(303);
    expect(res.headers.get("location")).toBe(`${HOST}${OFFER_PATH}#formularz`);
    expect(calls).toHaveLength(0);
  });

  it("obcy albo brakujący Referer → strona kontaktu na własnym hoście", async () => {
    stubFetch();
    for (const referer of [
      undefined,
      "https://obcy.example/kontakt/",
      `https://obcy.example${OFFER_PATH}`,
      `${HOST}/oferty/`,
      `${HOST}/oferty/mieszkanie-na-sprzedaz/`,
      `${HOST}/oferty/mieszkanie-na-sprzedaz/poznan/`,
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
