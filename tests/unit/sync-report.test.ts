// Raport (2.7): wyjście publiczne bez numerów ofert, bez wartości pól
// kontrolnych, bez adresów i tokenów — także gdy wpadną w komunikat
// błędu; raport prywatny ma komplet; wysyłka przez Resend na atrapie.
import { describe, expect, it } from "vitest";
import {
  OUTCOME_LABEL,
  privateReport,
  publicSummary,
  redactPublic,
  sendReport,
  type ReportInput,
} from "../../scripts/sync/report";
import { warning } from "../../scripts/sync/warnings";
import { readSyntheticDictionary } from "../helpers/raw";

/** wartownik zamiast realnej wartości pola kontrolnego (zasada 4) */
const CONTROL_SENTINEL = "CONTROL_SENTINEL_999";
const NUMBERS = ["SW900001", "SW900002", "SW900003", "SW900004", "DW123456"];

const input: ReportInput = {
  outcome: "ok",
  runAt: "2026-10-01T03:15:00+02:00",
  stats: {
    visible: 45,
    previousVisible: 44,
    inCrm: 136,
    requests: 4,
    photos: {
      total: 591,
      unchanged: 580,
      downloaded: 11,
      uploaded: 9,
      failed: 2,
      gone: 3,
    },
    maps: {
      points: 37,
      reused: 36,
      requested: 1,
      uploaded: 1,
      failed: 0,
      gone: 0,
    },
    cleaned: 2,
    durationMs: 61_500,
  },
  warnings: [
    warning("W1", NUMBERS[0], `umowa=${CONTROL_SENTINEL}`),
    warning("W2", NUMBERS[1]),
    warning("W2", NUMBERS[2]),
    warning("W4", NUMBERS[3], "status=9"),
    warning("PHOTO_FETCH", NUMBERS[0], "HTTP 500; zdjęcie 1 — pominięte"),
  ],
  visibility: {
    gone: [{ number: NUMBERS[4], status: 52 }, { number: "SW900999" }],
    appeared: [NUMBERS[2]],
  },
  dictionary: readSyntheticDictionary(),
  errors: [
    `EstiAPI /offer/list: limit (HTTP 429) — https://app.example.invalid/apiClient/offer/list?company=7&token=SEKRET123 ${NUMBERS[0]}`,
  ],
};

describe("publicSummary", () => {
  const out = publicSummary(input);

  it("zawiera wynik, liczności i kody ostrzeżeń", () => {
    expect(out).toContain(OUTCOME_LABEL.ok);
    expect(out).toContain("oferty widoczne: 45 (poprzednio 44)");
    expect(out).toContain("zdjęcia: 591");
    expect(out).toContain("mapy: punkty 37");
    expect(out).toContain("PHOTO_FETCH ×1, W1 ×1, W2 ×2, W4 ×1");
    expect(out).toContain("widoczność: zniknęło 2, pojawiło się 1");
    expect(out).toContain("błędy: 1");
  });

  it("nie zawiera numerów ofert, wartości pól kontrolnych, adresów ani tokenów", () => {
    for (const n of [...NUMBERS, "SW900999"]) expect(out).not.toContain(n);
    expect(out).not.toContain(CONTROL_SENTINEL);
    expect(out).not.toContain("agreementType");
    expect(out).not.toContain("https://");
    expect(out).not.toContain("token=");
    expect(out).not.toContain("SEKRET123");
    expect(out).not.toContain("status=9");
    expect(out).not.toMatch(/\b[A-Z]{1,4}\d{4,}\b/);
  });

  it("redactPublic wycina numery, adresy i parametry uwierzytelniające", () => {
    expect(
      redactPublic(
        "oferta SW486462 i https://x.invalid/a?token=abc oraz apiKey=zzz company=7",
      ),
    ).toBe("oferta [numer] i [adres] oraz apiKey=[ukryte] company=[ukryte]");
  });

  it("brak ostrzeżeń i błędów → czytelne „brak”", () => {
    const quiet = publicSummary({
      outcome: "no-changes",
      runAt: input.runAt,
      stats: { visible: 45 },
      warnings: [],
    });
    expect(quiet).toContain("ostrzeżenia: brak");
    expect(quiet).toContain(OUTCOME_LABEL["no-changes"]);
    expect(quiet).not.toContain("błędy");
  });
});

describe("privateReport", () => {
  const rep = privateReport(input);

  it("temat niesie datę, wynik i podsumowanie kodów", () => {
    expect(rep.subject).toBe(
      `[hetman sync] 2026-10-01: ${OUTCOME_LABEL.ok} — PHOTO_FETCH ×1, W1 ×1, W2 ×2, W4 ×1`,
    );
  });

  it("treść ma numery, szczegóły, diff widoczności z etykietą statusu i błędy w pełnym brzmieniu", () => {
    for (const n of NUMBERS) expect(rep.text).toContain(n);
    expect(rep.text).toContain(CONTROL_SENTINEL);
    expect(rep.text).toContain("zniknęła: DW123456 → status 52 (Robocza)");
    expect(rep.text).toContain("zniknęła: SW900999 → status brak w CRM");
    expect(rep.text).toContain("pojawiła się: SW900003");
    expect(rep.text).toContain("token=SEKRET123");
    expect(rep.text).toContain("W2 — sygnał umowy bez prefiksu statusu ×2");
    expect(rep.html).toContain("&amp;token=");
    expect(rep.html).toContain("DW123456");
  });

  it("HTML escapuje treść", () => {
    const r = privateReport({
      ...input,
      warnings: [warning("W5", "SW900001", "<script>alert(1)</script>")],
    });
    expect(r.html).not.toContain("<script>");
    expect(r.html).toContain("&lt;script&gt;");
  });
});

describe("sendReport", () => {
  it("POST do Resend z Bearer, from/to/subject/text/html; wynik bez treści odpowiedzi", async () => {
    const calls: Array<{ url: string; init?: Record<string, unknown> }> = [];
    const res = await sendReport({
      apiKey: "re_sekret",
      to: "mateusz@example.invalid",
      from: "sync@example.invalid",
      report: privateReport(input),
      fetch: async (url, init) => {
        calls.push({ url, init: init as Record<string, unknown> });
        return new Response('{"id":"x"}', { status: 200 });
      },
    });
    expect(res).toEqual({ ok: true, status: 200 });
    expect(calls[0].url).toBe("https://api.resend.com/emails");
    const headers = calls[0].init?.headers as Record<string, string>;
    expect(headers.authorization).toBe("Bearer re_sekret");
    const body = JSON.parse(calls[0].init?.body as string);
    expect(body).toMatchObject({
      from: "sync@example.invalid",
      to: ["mateusz@example.invalid"],
    });
    expect(body.subject).toContain("[hetman sync]");
    expect(body.text).toContain("SW900001");
  });

  it("błąd sieci → { ok: false, status: 0 } bez wyjątku", async () => {
    const res = await sendReport({
      apiKey: "k",
      to: "a@example.invalid",
      from: "b@example.invalid",
      report: privateReport(input),
      fetch: async () => {
        throw new TypeError("fetch failed");
      },
    });
    expect(res).toEqual({ ok: false, status: 0 });
  });
});
