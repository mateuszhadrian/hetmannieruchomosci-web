// Endpoint formularzy (functions/api/kontakt.ts) — kolejność kroków
// i odpowiedzi z docs/analiza-formularze-a.md §4.2 i analiza-formularze-b.md
// §3.1. Resend i Turnstile WYŁĄCZNIE jako atrapy `fetch`; magazyn limitu
// i binding plików statycznych (indeks ofert) = atrapy w pamięci.
// Zgłoszenie do pracy: pliki CV to bufory budowane w teście; treść żądania
// do usługi pocztowej jest sprawdzana bajt w bajt.
// Żaden test nie wykonuje żądania do sieci.
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { onRequest } from "../../functions/api/kontakt";
import {
  CONTACT_FROM_NOTIFY,
  CONTACT_TO,
  CV_REQUEST_MAX_BYTES,
  FORM_MAX_BYTES,
  FUTURE_RECRUITMENT_CONSENT,
  MARKETING_CONSENT,
  OFFER_NOT_IN_INDEX,
} from "../../src/lib/contact-form";
import {
  CV_MAX_BYTES,
  CV_SIGNATURE_BYTES,
  CV_TYPES,
  formatFileSize,
} from "../../src/lib/cv-file";
import {
  CONTACT_PATH,
  JOBS_PATH,
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
  fields: Record<string, string | File>,
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

// zgłoszenie do pracy — dane SYNTETYCZNE, pliki to bufory z testu
const PRACA = {
  form: "praca",
  name: "Maria Wiśniewska",
  email: "maria@example.com",
  phone: "",
  message: "Od pięciu lat pracuję w sprzedaży.",
  firma: "",
  elapsed: "12000",
  "cf-turnstile-response": "token-z-atrapy",
};
const SIG = {
  pdf: [0x25, 0x50, 0x44, 0x46, 0x2d, 0x31, 0x2e, 0x37],
  ole: [0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1],
  zip: [0x50, 0x4b, 0x03, 0x04, 0x14, 0x00, 0x06, 0x00],
};

/** Treść pliku: sygnatura + deterministyczne bajty (pełny zakres 0–255,
 *  żeby kodowanie nie mogło „przejść" na samym ASCII). */
function fileBytes(sig: number[], size: number): Uint8Array<ArrayBuffer> {
  const bytes = new Uint8Array(size);
  for (let i = 0; i < size; i++) bytes[i] = (i * 31 + 7) & 0xff;
  bytes.set(sig.slice(0, size));
  return bytes;
}

function cvFile(
  name = "CV Maria Wiśniewska.pdf",
  bytes: Uint8Array<ArrayBuffer> = fileBytes(SIG.pdf, 4096),
  type = "application/octet-stream",
): File {
  return new File([bytes], name, { type });
}

/** Żądanie z plikiem — `content-length` jak z przeglądarki (plik + pola). */
function postCv(
  file: File | null,
  fields: Record<string, string> = {},
  headers: Record<string, string | null> = {},
): Request {
  return post(
    { ...PRACA, ...fields, ...(file ? { cv: file } : {}) },
    { "content-length": String((file?.size ?? 0) + 2048), ...headers },
  );
}

const sentMail = (calls: Call[]) => {
  const call = calls.find((c) => c.url === RESEND);
  return call ? JSON.parse(String(call.init.body)) : undefined;
};

beforeEach(() => {
  vi.spyOn(console, "error").mockImplementation(() => {});
  vi.spyOn(console, "log").mockImplementation(() => {});
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

  it("żądanie ponad próg górny odpada po nagłówku, przed czytaniem treści → 413", async () => {
    const calls = stubFetch();
    for (const request of [
      post(KONTAKT, { "content-length": String(CV_REQUEST_MAX_BYTES + 1) }),
      postCv(
        cvFile(),
        {},
        {
          "content-length": String(CV_REQUEST_MAX_BYTES + 1),
        },
      ),
    ]) {
      const read = vi.spyOn(request, "formData");
      const res = await onRequest({ request, env: ENV });
      expect(res.status).toBe(413);
      expect(await res.json()).toEqual({ ok: false, error: "too-large" });
      expect(read).not.toHaveBeenCalled();
    }
    expect(calls).toHaveLength(0);
  });

  it("formularz tekstowy ponad swój próg albo z plikiem → 413", async () => {
    const calls = stubFetch();
    for (const [fields, length] of [
      [KONTAKT, FORM_MAX_BYTES + 1],
      [SPRZEDAJ, CV_REQUEST_MAX_BYTES],
      [{ ...KONTAKT, cv: cvFile() }, 8192],
      [{ ...OFERTA, zalacznik: cvFile("x.pdf") }, 8192],
    ] as const) {
      const res = await onRequest({
        request: post(fields, { "content-length": String(length) }),
        env: ENV,
      });
      expect(res.status, fields.form).toBe(413);
      expect(await res.json()).toEqual({ ok: false, error: "too-large" });
    }
    // dokładnie próg formularza tekstowego jeszcze przechodzi
    const edge = await onRequest({
      request: post(KONTAKT, { "content-length": String(FORM_MAX_BYTES) }),
      env: {},
    });
    expect(edge.status).toBe(503);
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

  it("nieznany rodzaj → 400 `form`", async () => {
    const calls = stubFetch();
    for (const form of ["", "inny", "PRACA"]) {
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

describe("endpoint formularzy: zgłoszenie do pracy", () => {
  /** Rozmiary treści czytanych z pliku w trakcie obsługi żądania. */
  function spyReads() {
    const sizes: number[] = [];
    const original = Blob.prototype.arrayBuffer;
    vi.spyOn(Blob.prototype, "arrayBuffer").mockImplementation(function (
      this: Blob,
    ) {
      sizes.push(this.size);
      return original.call(this);
    });
    return sizes;
  }

  it("PDF: mail z załącznikiem — nazwa oczyszczona, MIME z rozszerzenia, treść bajt w bajt", async () => {
    const calls = stubFetch();
    const bytes = fileBytes(SIG.pdf, 4096);
    const res = await onRequest({
      request: postCv(cvFile("CV Maria Wiśniewska.PDF", bytes)),
      env: ENV,
    });
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true });
    expect(calls.map((c) => c.url)).toEqual([TURNSTILE, RESEND]);

    // treść żądania jest poprawnym JSON-em
    const mail = sentMail(calls);
    expect(mail.from).toBe(CONTACT_FROM_NOTIFY);
    expect(mail.to).toEqual([CONTACT_TO]);
    expect(mail.reply_to).toBe("maria@example.com");
    expect(mail.subject).toMatch(/— zgłoszenie do pracy$/);
    expect(mail.headers["X-Entity-Ref-ID"]).toMatch(/^[0-9a-f-]{36}$/);
    expect(mail.attachments).toHaveLength(1);
    const [attachment] = mail.attachments;
    expect(Object.keys(attachment)).toEqual([
      "filename",
      "content_type",
      "content",
    ]);
    expect(attachment.filename).toBe("CV-Maria-Wisniewska.pdf");
    // typ z ROZSZERZENIA po weryfikacji — nie z deklaracji przeglądarki
    expect(attachment.content_type).toBe("application/pdf");
    expect(Buffer.from(attachment.content, "base64").equals(bytes)).toBe(true);

    expect(mail.text).toContain(
      `CV:\nCV-Maria-Wisniewska.pdf (${formatFileSize(bytes.length)})`,
    );
    expect(mail.text).toContain("Od pięciu lat pracuję w sprzedaży.");
    expect(mail.text).toContain("Zgoda na przyszłe rekrutacje: Nie");
    expect(mail.text).toContain(FUTURE_RECRUITMENT_CONSENT);
    expect(mail.text).toContain(`Strona: ${HOST}${JOBS_PATH}`);
    for (const part of [mail.text, mail.html]) {
      expect(part).not.toContain(MARKETING_CONSENT);
      expect(part).not.toContain("informacje handlowe");
    }
  });

  it("plik o rozmiarze DOKŁADNIE limitu: przechodzi, treść bajt w bajt", async () => {
    const calls = stubFetch();
    const bytes = fileBytes(SIG.pdf, CV_MAX_BYTES);
    const request = postCv(cvFile("cv.pdf", bytes));
    expect(Number(request.headers.get("content-length"))).toBeLessThanOrEqual(
      CV_REQUEST_MAX_BYTES,
    );
    const res = await onRequest({ request, env: ENV });
    expect(res.status).toBe(200);
    const body = String(calls.find((c) => c.url === RESEND)?.init.body);
    const mail = JSON.parse(body);
    const decoded = Buffer.from(mail.attachments[0].content, "base64");
    expect(decoded.length).toBe(CV_MAX_BYTES);
    expect(decoded.equals(bytes)).toBe(true);
    // załącznik stoi na końcu treści żądania (doklejony, nie zserializowany)
    expect(body.endsWith(`${mail.attachments[0].content}"}]}`)).toBe(true);
  });

  it("DOC i DOCX: sygnatura zgodna z rozszerzeniem, właściwy typ załącznika", async () => {
    for (const [name, sig, mime] of [
      ["cv.doc", SIG.ole, CV_TYPES[1].mime],
      ["cv.DOCX", SIG.zip, CV_TYPES[2].mime],
    ] as const) {
      const calls = stubFetch();
      const res = await onRequest({
        request: postCv(cvFile(name, fileBytes(sig, 2000))),
        env: ENV,
      });
      expect(res.status, name).toBe(200);
      const [attachment] = sentMail(calls).attachments;
      expect(attachment.filename, name).toBe(name.toLowerCase());
      expect(attachment.content_type, name).toBe(mime);
    }
  });

  it("zgoda na przyszłe rekrutacje i sam telefon", async () => {
    const calls = stubFetch();
    const res = await onRequest({
      request: postCv(cvFile(), {
        email: "",
        phone: "600 100 200",
        message: "",
        future: "1",
        marketing: "1",
      }),
      env: ENV,
    });
    expect(res.status).toBe(200);
    const mail = sentMail(calls);
    expect(mail).not.toHaveProperty("reply_to");
    expect(mail.text).toContain("Zgoda na przyszłe rekrutacje: Tak");
    expect(mail.text).not.toContain("Treść zgłoszenia:");
    expect(mail.text).not.toContain("informacje handlowe");
  });

  it("walidacja pliku → 400 z polem pliku, bez żądań", async () => {
    const calls = stubFetch();
    const cases: [string, File | null, string[]][] = [
      ["brak pliku", null, ["cv"]],
      ["puste pole pliku", new File([], ""), ["cv"]],
      [
        "zły typ",
        cvFile("zdjecie.jpg", fileBytes([0xff, 0xd8], 500)),
        ["cv-type"],
      ],
      ["tekst", cvFile("cv.txt", fileBytes(SIG.pdf, 500)), ["cv-type"]],
      [
        "PDF z treścią ZIP",
        cvFile("cv.pdf", fileBytes(SIG.zip, 500)),
        ["cv-type"],
      ],
      [
        "DOCX z treścią PDF",
        cvFile("cv.docx", fileBytes(SIG.pdf, 500)),
        ["cv-type"],
      ],
      [
        "DOC z treścią ZIP",
        cvFile("cv.doc", fileBytes(SIG.zip, 500)),
        ["cv-type"],
      ],
      [
        "krótszy niż sygnatura",
        cvFile("cv.pdf", fileBytes(SIG.pdf, 3)),
        ["cv-type"],
      ],
      ["pusty", cvFile("cv.pdf", new Uint8Array(0)), ["cv-type"]],
    ];
    for (const [label, file, fields] of cases) {
      const res = await onRequest({ request: postCv(file), env: ENV });
      expect(res.status, label).toBe(400);
      expect(await res.json(), label).toEqual({
        ok: false,
        error: "fields",
        fields,
      });
    }
    expect(calls).toHaveLength(0);
  });

  it("plik ponad limit przy zaniżonej deklaracji rozmiaru → 400 `cv-size`", async () => {
    const calls = stubFetch();
    const res = await onRequest({
      request: postCv(
        cvFile("cv.pdf", fileBytes(SIG.pdf, CV_MAX_BYTES + 1)),
        {},
        { "content-length": "4096" },
      ),
      env: ENV,
    });
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({
      ok: false,
      error: "fields",
      fields: ["cv-size"],
    });
    expect(calls).toHaveLength(0);
  });

  it("błąd pliku stoi po błędach pól osobowych", async () => {
    stubFetch();
    const res = await onRequest({
      request: postCv(null, { name: "", email: "" }),
      env: ENV,
    });
    expect(await res.json()).toEqual({
      ok: false,
      error: "fields",
      fields: ["name", "contact", "cv"],
    });
  });

  it("opis pliku dosłany jako pola tekstowe NIE zastępuje pliku", async () => {
    const calls = stubFetch();
    const spoof = { "cv:name": "cv.pdf", "cv:size": "1000", "cv:sig": "pdf" };
    const none = await onRequest({ request: postCv(null, spoof), env: ENV });
    expect(none.status).toBe(400);
    expect((await none.json()).fields).toEqual(["cv"]);

    // pole `cv` jako tekst to nie plik
    const text = await onRequest({
      request: post({ ...PRACA, ...spoof, cv: "%PDF-1.7 udawany" }),
      env: ENV,
    });
    expect(text.status).toBe(400);
    expect((await text.json()).fields).toEqual(["cv"]);

    // sygnatura liczy się z TREŚCI pliku, nie z dosłanego pola
    const zip = await onRequest({
      request: postCv(cvFile("cv.pdf", fileBytes(SIG.zip, 500)), spoof),
      env: ENV,
    });
    expect((await zip.json()).fields).toEqual(["cv-type"]);
    expect(calls).toHaveLength(0);
  });

  it("kolejność: plik kodowany NA KOŃCU — odsiane żądanie czyta najwyżej sygnaturę", async () => {
    const file = () => cvFile("cv.pdf", fileBytes(SIG.pdf, 50_000));
    const kv = { get: async () => "80", put: async () => {} };

    // pułapka: plik nietknięty, zero żądań
    let calls = stubFetch();
    let reads = spyReads();
    const trap = await onRequest({
      request: postCv(file(), { firma: "bot" }),
      env: ENV,
    });
    expect(trap.status).toBe(200);
    expect(reads).toEqual([]);
    expect(calls).toHaveLength(0);
    vi.restoreAllMocks();
    vi.spyOn(console, "error").mockImplementation(() => {});
    vi.spyOn(console, "log").mockImplementation(() => {});

    // błąd pól osobowych, brak sekretów, odmowa Turnstile, limit dzienny:
    // z pliku czytany jest wyłącznie początek (sygnatura)
    for (const [label, request, env, turnstile, status] of [
      ["pola", postCv(file(), { name: "" }), ENV, true, 400],
      ["sekrety", postCv(file()), {}, true, 503],
      ["turnstile", postCv(file()), ENV, false, 403],
      ["limit", postCv(file()), { ...ENV, KONTAKT_KV: kv }, true, 503],
    ] as const) {
      calls = stubFetch({ turnstile });
      reads = spyReads();
      const res = await onRequest({ request, env });
      expect(res.status, label).toBe(status);
      expect(reads, label).toEqual([CV_SIGNATURE_BYTES]);
      expect(sentMail(calls), label).toBeUndefined();
      vi.restoreAllMocks();
      vi.spyOn(console, "error").mockImplementation(() => {});
      vi.spyOn(console, "log").mockImplementation(() => {});
    }

    // zgłoszenie przyjęte: sygnatura, a pełny plik dopiero po Turnstile
    calls = stubFetch();
    reads = spyReads();
    const ok = await onRequest({ request: postCv(file()), env: ENV });
    expect(ok.status).toBe(200);
    expect(reads).toEqual([CV_SIGNATURE_BYTES, 50_000]);
    expect(calls.map((c) => c.url)).toEqual([TURNSTILE, RESEND]);
  });

  it("kodowanie: metoda silnika ma pierwszeństwo, `Buffer` jest zapasem", async () => {
    const proto = Uint8Array.prototype as { toBase64?: () => string };
    const original = Object.getOwnPropertyDescriptor(proto, "toBase64");
    const bytes = fileBytes(SIG.pdf, 3000);
    try {
      // ścieżka silnika (środowisko testów może jej nie mieć — podstawiona)
      const native = vi.fn(function (this: Uint8Array) {
        return Buffer.from(this).toString("base64");
      });
      Object.defineProperty(proto, "toBase64", {
        value: native,
        configurable: true,
        writable: true,
      });
      let calls = stubFetch();
      await onRequest({ request: postCv(cvFile("cv.pdf", bytes)), env: ENV });
      expect(native).toHaveBeenCalledTimes(1);
      expect(vi.mocked(console.log).mock.calls.flat().join(" ")).toContain(
        "base64 przez toBase64",
      );
      expect(
        Buffer.from(sentMail(calls).attachments[0].content, "base64").equals(
          bytes,
        ),
      ).toBe(true);

      // ścieżka `Buffer`: metody silnika nie ma
      delete proto.toBase64;
      calls = stubFetch();
      const res = await onRequest({
        request: postCv(cvFile("cv.pdf", bytes)),
        env: ENV,
      });
      expect(res.status).toBe(200);
      expect(
        Buffer.from(sentMail(calls).attachments[0].content, "base64").equals(
          bytes,
        ),
      ).toBe(true);
      expect(vi.mocked(console.log).mock.calls.flat().join(" ")).toContain(
        `załącznik ${bytes.length} B, base64 przez Buffer`,
      );
    } finally {
      if (original) Object.defineProperty(proto, "toBase64", original);
      else delete proto.toBase64;
    }
  });

  it("Resend odmawia → 502; log bez nazwy pliku i danych kandydata", async () => {
    stubFetch({ resend: 422 });
    const res = await onRequest({
      request: postCv(cvFile("Tajne-CV-Marii.pdf")),
      env: ENV,
    });
    expect(res.status).toBe(502);
    expect(await res.json()).toEqual({ ok: false, error: "send" });
    const logged = [
      ...vi.mocked(console.error).mock.calls,
      ...vi.mocked(console.log).mock.calls,
    ]
      .flat()
      .join(" ");
    expect(logged).toContain("422");
    expect(logged).toContain("base64 przez");
    for (const secret of ["Tajne", "Maria", "maria@example.com", "sprzedaży"]) {
      expect(logged).not.toContain(secret);
    }
  });

  it("pozostałe formularze nie niosą załącznika", async () => {
    const calls = stubFetch();
    await onRequest({ request: post(KONTAKT), env: ENV });
    expect(sentMail(calls)).not.toHaveProperty("attachments");
  });
});

describe("endpoint formularzy: platforma bez natywnego base64", () => {
  it("zgłoszenie do pracy → 503 `encoder` przed Turnstile; pozostałe formularze działają", async () => {
    vi.resetModules();
    vi.doMock("../../src/lib/mail-attachment", async (original) => ({
      ...(await original<typeof import("../../src/lib/mail-attachment")>()),
      pickBase64Encoder: () => null,
    }));
    try {
      const { onRequest: handler } =
        await import("../../functions/api/kontakt");
      let calls = stubFetch();
      const res = await handler({ request: postCv(cvFile()), env: ENV });
      expect(res.status).toBe(503);
      expect(await res.json()).toEqual({ ok: false, error: "encoder" });
      expect(calls).toHaveLength(0);

      calls = stubFetch();
      const other = await handler({ request: post(KONTAKT), env: ENV });
      expect(other.status).toBe(200);
      expect(calls.map((c) => c.url)).toEqual([TURNSTILE, RESEND]);
    } finally {
      vi.doUnmock("../../src/lib/mail-attachment");
      vi.resetModules();
    }
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

  it("submit ze strony „Praca” wraca na nią, a plik nie jest czytany", async () => {
    const calls = stubFetch();
    const request = postCv(
      cvFile(),
      {},
      {
        accept: "text/html",
        "content-length": String(CV_REQUEST_MAX_BYTES * 4),
        referer: `${HOST}${JOBS_PATH}`,
      },
    );
    const read = vi.spyOn(request, "formData");
    const res = await onRequest({ request, env: ENV });
    expect(res.status).toBe(303);
    expect(res.headers.get("location")).toBe(`${HOST}${JOBS_PATH}#formularz`);
    expect(read).not.toHaveBeenCalled();
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
