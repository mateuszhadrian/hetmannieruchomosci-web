// Plik CV formularza „Praca" (src/lib/cv-file.ts) i załącznik maila
// (src/lib/mail-attachment.ts) — docs/analiza-formularze-b.md §4: limit
// jako JEDNA stała, typy po rozszerzeniu i sygnaturze, nazwa załącznika,
// kodowanie base64 (obie ścieżki natywne i brak obu), treść żądania
// z doklejonym załącznikiem. Pliki to bufory budowane w teście.
import { describe, expect, it, vi } from "vitest";
import {
  CV_REQUEST_MAX_BYTES,
  FORM_MAX_BYTES,
  type FormRaw,
} from "../../src/lib/contact-form";
import {
  checkCv,
  CV_MAX_BYTES,
  CV_SIGNATURE_BYTES,
  CV_TYPES,
  cvAccept,
  cvLimitLabel,
  cvTypeOf,
  cvTypesLabel,
  detectCvSignature,
  formatFileSize,
  sanitizeCvName,
} from "../../src/lib/cv-file";
import {
  pickBase64Encoder,
  withAttachment,
} from "../../src/lib/mail-attachment";
import { PRACA_FORM_COPY } from "../../src/components/forms/forms-copy";

const MB = 1024 * 1024;
const PDF = [0x25, 0x50, 0x44, 0x46, 0x2d, 0x31, 0x2e, 0x37]; // %PDF-1.7
const OLE = [0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1];
const ZIP = [0x50, 0x4b, 0x03, 0x04, 0x14, 0x00, 0x06, 0x00];

const raw = (name: string, size: number, sig?: string): FormRaw => ({
  "cv:name": name,
  "cv:size": String(size),
  ...(sig === undefined ? {} : { "cv:sig": sig }),
});

describe("CV: stałe", () => {
  it("limit jest całkowitą liczbą megabajtów, a próg żądania = limit + narzut pól", () => {
    expect(CV_MAX_BYTES % MB).toBe(0);
    expect(CV_MAX_BYTES).toBeGreaterThan(0);
    expect(CV_REQUEST_MAX_BYTES).toBe(CV_MAX_BYTES + FORM_MAX_BYTES);
  });

  it("dopisek w polu i komunikat o za dużym pliku liczą się ze stałej", () => {
    const limit = `${CV_MAX_BYTES / MB} MB`;
    expect(cvLimitLabel()).toBe(limit);
    expect(PRACA_FORM_COPY.cv.hint).toBe(`${cvTypesLabel()} · maks. ${limit}`);
    expect(PRACA_FORM_COPY.errors.cvSize).toContain(`większy niż ${limit}`);
  });

  it("typy: PDF, DOC, DOCX — etykieta, atrybut accept i MIME z jednej listy", () => {
    expect(CV_TYPES.map((t) => t.ext)).toEqual(["pdf", "doc", "docx"]);
    expect(cvTypesLabel()).toBe("PDF, DOC lub DOCX");
    expect(cvAccept().split(",")).toEqual([
      ".pdf",
      ".doc",
      ".docx",
      ...CV_TYPES.map((t) => t.mime),
    ]);
    expect(CV_TYPES.map((t) => t.mime)).toEqual([
      "application/pdf",
      "application/msword",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    ]);
  });

  it("formatFileSize: kilobajty, megabajty z przecinkiem", () => {
    expect(formatFileSize(1)).toBe("1 KB");
    expect(formatFileSize(345678)).toBe("338 KB");
    expect(formatFileSize(1.5 * MB)).toBe("1,5 MB");
    expect(formatFileSize(3 * MB)).toBe("3 MB");
    expect(formatFileSize(MB - 1)).toBe("1 MB");
  });
});

describe("CV: sygnatura", () => {
  it("rozpoznaje PDF, kontener OLE i ZIP", () => {
    expect(detectCvSignature(new Uint8Array(PDF))).toBe("pdf");
    expect(detectCvSignature(new Uint8Array(OLE))).toBe("ole");
    expect(detectCvSignature(new Uint8Array(ZIP))).toBe("zip");
    expect(Math.max(PDF.length, OLE.length, ZIP.length)).toBeLessThanOrEqual(
      CV_SIGNATURE_BYTES,
    );
  });

  it("plik krótszy niż sygnatura, pusty albo o innym początku → nieznana", () => {
    expect(detectCvSignature(new Uint8Array(PDF.slice(0, 4)))).toBe("");
    expect(detectCvSignature(new Uint8Array(OLE.slice(0, 7)))).toBe("");
    expect(detectCvSignature(new Uint8Array(ZIP.slice(0, 3)))).toBe("");
    expect(detectCvSignature(new Uint8Array())).toBe("");
    expect(detectCvSignature(new TextEncoder().encode("To jest tekst."))).toBe(
      "",
    );
    // JPEG i pusty ZIP (PK\x05\x06) nie są dokumentami
    expect(detectCvSignature(new Uint8Array([0xff, 0xd8, 0xff, 0xe0]))).toBe(
      "",
    );
    expect(detectCvSignature(new Uint8Array([0x50, 0x4b, 0x05, 0x06]))).toBe(
      "",
    );
  });
});

describe("CV: checkCv", () => {
  it("brak pliku → `cv`", () => {
    expect(checkCv({})).toEqual({ field: "cv" });
    expect(checkCv(raw("", 0))).toEqual({ field: "cv" });
    expect(checkCv(raw("   ", 10))).toEqual({ field: "cv" });
  });

  it("rozszerzenie spoza listy → `cv-type` (wielkość liter bez znaczenia)", () => {
    for (const name of [
      "cv.txt",
      "cv.jpg",
      "cv.pdf.exe",
      "cv",
      "cv.",
      ".pdf.zip",
    ]) {
      expect(checkCv(raw(name, 1000)), name).toEqual({ field: "cv-type" });
    }
    for (const name of [
      "cv.pdf",
      "CV.PDF",
      "cv.Doc",
      "życiorys.DOCX",
      ".pdf",
    ]) {
      expect(checkCv(raw(name, 1000)), name).toHaveProperty("cv");
    }
    expect(cvTypeOf("a.b.docx")?.ext).toBe("docx");
    expect(cvTypeOf("docx")).toBeUndefined();
  });

  it("rozmiar: dokładnie limit przechodzi, bajt więcej → `cv-size`", () => {
    expect(checkCv(raw("cv.pdf", CV_MAX_BYTES))).toHaveProperty("cv");
    expect(checkCv(raw("cv.pdf", CV_MAX_BYTES + 1))).toEqual({
      field: "cv-size",
    });
    expect(checkCv({ "cv:name": "cv.pdf", "cv:size": "abc" })).toEqual({
      field: "cv-size",
    });
  });

  it("zły typ wygrywa z rozmiarem (plik i tak nie do przyjęcia)", () => {
    expect(checkCv(raw("zdjecie.jpg", CV_MAX_BYTES * 3))).toEqual({
      field: "cv-type",
    });
  });

  it("plik pusty → `cv-type`", () => {
    expect(checkCv(raw("cv.pdf", 0))).toEqual({ field: "cv-type" });
  });

  it("sygnatura (tylko funkcja) musi zgadzać się z rozszerzeniem", () => {
    expect(checkCv(raw("cv.pdf", 1000, "pdf"))).toHaveProperty("cv");
    expect(checkCv(raw("cv.doc", 1000, "ole"))).toHaveProperty("cv");
    expect(checkCv(raw("cv.docx", 1000, "zip"))).toHaveProperty("cv");
    for (const [name, sig] of [
      ["cv.pdf", "zip"],
      ["cv.docx", "pdf"],
      ["cv.doc", "zip"],
      ["cv.docx", "ole"],
      ["cv.pdf", ""],
      ["cv.pdf", "cokolwiek"],
    ]) {
      expect(checkCv(raw(name, 1000, sig)), `${name} / ${sig}`).toEqual({
        field: "cv-type",
      });
    }
  });

  it("wynik niesie nazwę po oczyszczeniu i MIME z ROZSZERZENIA", () => {
    expect(checkCv(raw("Życiorys Jan Kowalski.PDF", 2048, "pdf"))).toEqual({
      cv: {
        name: "Zyciorys-Jan-Kowalski.pdf",
        size: 2048,
        mime: "application/pdf",
      },
    });
    expect(checkCv(raw("cv.docx", 10))).toMatchObject({
      cv: { mime: CV_TYPES[2].mime },
    });
  });
});

describe("CV: nazwa załącznika", () => {
  it("ścieżka, znaki sterujące, cudzysłów, spacje → nazwa bezpieczna", () => {
    const cases: [string, string][] = [
      ["C:\\Users\\jan\\Dokumenty\\CV.pdf", "CV.pdf"],
      ["/home/jan/../../etc/passwd.pdf", "passwd.pdf"],
      ['cv "ostateczne" <final>.pdf', "cv-ostateczne-final.pdf"],
      ["cv\r\nBcc: x@evil.example.pdf", "cv-Bcc-x-evil.example.pdf"],
      ["Zażółć gęślą jaźń — Łódź.pdf", "Zazolc-gesla-jazn-Lodz.pdf"],
      ["   .pdf", "CV.pdf"],
      [".pdf", "CV.pdf"],
      ["....pdf", "CV.pdf"],
      ["履歴書.pdf", "CV.pdf"],
      ["cv.final.v2.PDF", "cv.final.v2.pdf"],
    ];
    for (const [input, expected] of cases) {
      expect(sanitizeCvName(input, "pdf"), input).toBe(expected);
    }
  });

  it("rozszerzenie pochodzi z walidacji, nie z nazwy", () => {
    expect(sanitizeCvName("cv.exe.DOCX", "docx")).toBe("cv.exe.docx");
    expect(sanitizeCvName("cv.pdf", "doc")).toBe("cv.doc");
  });

  it("bardzo długa nazwa jest przycinana, wynik ma wyłącznie bezpieczne znaki", () => {
    const name = sanitizeCvName(
      `${"bardzo długa nazwa ".repeat(40)}.pdf`,
      "pdf",
    );
    expect(name.length).toBeLessThanOrEqual(84);
    expect(name).toMatch(/^[A-Za-z0-9._-]+\.pdf$/);
    expect(name).not.toMatch(/-\.pdf$/);
  });
});

describe("załącznik: kodowanie base64", () => {
  const bytes = new Uint8Array([0, 1, 2, 250, 251, 252, 253, 254, 255]);
  const expected = Buffer.from(bytes).toString("base64");

  it("ścieżka silnika: metoda `toBase64` ma pierwszeństwo", () => {
    const toBase64 = vi.fn(function (this: Uint8Array) {
      return Buffer.from(this).toString("base64");
    });
    const from = vi.fn();
    const encoder = pickBase64Encoder({ toBase64, Buffer: { from } });
    expect(encoder?.via).toBe("toBase64");
    expect(encoder?.encode(bytes)).toBe(expected);
    expect(toBase64).toHaveBeenCalledTimes(1);
    expect(from).not.toHaveBeenCalled();
  });

  it("ścieżka `Buffer`: gdy metody silnika nie ma", () => {
    const encoder = pickBase64Encoder({ toBase64: undefined, Buffer });
    expect(encoder?.via).toBe("Buffer");
    expect(encoder?.encode(bytes)).toBe(expected);
    // widok na część większego bufora koduje tylko swój zakres
    const view = new Uint8Array(
      new Uint8Array([9, 9, ...bytes, 9]).buffer,
      2,
      9,
    );
    expect(encoder?.encode(view)).toBe(expected);
  });

  it("brak obu ścieżek → null (funkcja odpowiada wtedy błędem konfiguracji)", () => {
    expect(pickBase64Encoder({})).toBeNull();
    expect(
      pickBase64Encoder({ toBase64: "nie-funkcja", Buffer: {} }),
    ).toBeNull();
  });

  it("środowisko testów ma co najmniej jedną ścieżkę natywną", () => {
    expect(pickBase64Encoder()?.encode(bytes)).toBe(expected);
  });

  it("moduł nie importuje modułów Node (wykrywanie w czasie działania)", async () => {
    const { readFileSync } = await import("node:fs");
    const source = readFileSync("src/lib/mail-attachment.ts", "utf8");
    expect(source).not.toMatch(/from\s+["']node:|require\(/);
    expect(source).not.toMatch(/\bbtoa\b|fromCharCode/);
  });
});

describe("załącznik: treść żądania", () => {
  it("doklejony fragment daje poprawny JSON z kompletem pól", () => {
    const message = { from: "a", to: ["b"], subject: 'ż „x” "y"', text: "t" };
    const body = withAttachment(JSON.stringify(message), {
      filename: 'cv "x".pdf',
      contentType: "application/pdf",
      base64: "QUJD",
    });
    expect(JSON.parse(body)).toEqual({
      ...message,
      attachments: [
        {
          filename: 'cv "x".pdf',
          content_type: "application/pdf",
          content: "QUJD",
        },
      ],
    });
  });

  it("treść pliku nie przechodzi przez serializację (sklejenie tekstów)", () => {
    const base64 = "A".repeat(1000);
    const json = '{"subject":"s"}';
    const body = withAttachment(json, {
      filename: "cv.pdf",
      contentType: "application/pdf",
      base64,
    });
    expect(body.startsWith('{"subject":"s","attachments":[{')).toBe(true);
    expect(body.endsWith(`"content":"${base64}"}]}`)).toBe(true);
  });
});
