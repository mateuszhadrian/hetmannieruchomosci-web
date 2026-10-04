// Logika formularzy (src/lib/contact-form.ts) — pułapki na boty,
// walidacja per formularz (dwa osobne pola kontaktowe, wymagane co
// najmniej jedno), słowniki zgłoszenia nieruchomości i treść maili A, B,
// C i D (Etap 5: docs/analiza-formularze-a.md §5, analiza-formularze-b.md
// §4). Reguły pliku CV: cv-file.test.ts. Dane wyłącznie syntetyczne.
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  ACTIVE_FORM_KINDS,
  buildMail,
  CONTACT_FROM_NOTIFY,
  CONTACT_TO,
  escapeHtml,
  ESTATE_TYPES,
  FORM_KINDS,
  FORM_PAGE_PATH,
  formatMailPrice,
  FUTURE_RECRUITMENT_CONSENT,
  isActiveFormKind,
  isBotTrap,
  isFormPagePath,
  LOCATION_MAX,
  MARKETING_CONSENT,
  MESSAGE_MAX,
  NAME_MAX,
  OFFER_NOT_IN_INDEX,
  OFFER_NUMBER_RE,
  parseArea,
  parsePrice,
  stripNewlines,
  TRANSACTIONS,
  validateForm,
  type FormRaw,
  type KontaktData,
  type OfertaData,
  type PracaData,
  type SprzedajData,
  type ValidationResult,
} from "../../src/lib/contact-form";
import { checkCv, CV_MAX_BYTES, formatFileSize } from "../../src/lib/cv-file";
import {
  CONTACT_PATH,
  JOBS_PATH,
  OFFERS_PATH,
  SELL_PATH,
} from "../../src/lib/routes";
import { offerRoutesFromData, readOffersTyped } from "../helpers/offers";

const kontaktRaw: FormRaw = {
  form: "kontakt",
  name: "Anna Nowak",
  email: "anna@example.com",
  phone: "",
  message: "Chciałabym zapytać o sprzedaż mieszkania.",
};

const kontaktData: KontaktData = {
  form: "kontakt",
  name: "Anna Nowak",
  email: "anna@example.com",
  phone: "",
  marketing: false,
  message: "Chciałabym zapytać o sprzedaż mieszkania.",
};

const sprzedajRaw: FormRaw = {
  form: "sprzedaj",
  type: "2",
  transaction: "131",
  name: "Jan Kowalski",
  email: "",
  phone: "600 100 200",
};

const sprzedajData: SprzedajData = {
  form: "sprzedaj",
  name: "Jan Kowalski",
  email: "jan@example.com",
  phone: "600 100 200",
  marketing: true,
  type: "2",
  transaction: "131",
  location: "Poznań, Winogrady",
  area: "50",
  price: "500000",
  notes: "Trzecie piętro, do odświeżenia.",
};

// zapytanie o ofertę — numer i adres SYNTETYCZNE
const ofertaRaw: FormRaw = {
  form: "oferta",
  offer: "XX000111",
  name: "Ewa Zielińska",
  email: "ewa@example.com",
  phone: "",
  message: "Jestem zainteresowana tą ofertą. Proszę o kontakt.",
};

const ofertaData: OfertaData = {
  form: "oferta",
  offer: "XX000111",
  name: "Ewa Zielińska",
  email: "ewa@example.com",
  phone: "",
  marketing: false,
  message: "Jestem zainteresowana tą ofertą. Proszę o kontakt.",
};

const OFFER_PATH = "/oferty/mieszkanie-na-sprzedaz/poznan-testowo/xx000111/";
const MAIL_OFFER = {
  title: "Mieszkanie testowe 2 pokoje",
  place: "Poznań, Testowo · ul. Próbna",
  path: OFFER_PATH,
};

const CTX = { sentAt: "3 paź 2026, 12:00", origin: "https://podglad.example" };

// zgłoszenie do pracy — opis pliku tak, jak buduje go moduł kliencki
const pracaRaw: FormRaw = {
  form: "praca",
  name: "Maria Wiśniewska",
  email: "maria@example.com",
  phone: "",
  message: "",
  "cv:name": "CV Maria Wiśniewska.pdf",
  "cv:size": "345678",
};

const pracaData: PracaData = {
  form: "praca",
  name: "Maria Wiśniewska",
  email: "maria@example.com",
  phone: "",
  message: "Od pięciu lat pracuję w sprzedaży.",
  future: false,
  cv: {
    name: "CV-Maria-Wisniewska.pdf",
    size: 345678,
    mime: "application/pdf",
  },
};

/** Zgoda marketingowa z wyniku walidacji (formularz „Praca" jej nie ma). */
const marketingOf = (r: ValidationResult): boolean | undefined =>
  r.ok && r.data.form !== "praca" ? r.data.marketing : undefined;

describe("formularze: rodzaje", () => {
  it("endpoint zna i obsługuje cztery rodzaje", () => {
    expect(FORM_KINDS).toEqual(["kontakt", "sprzedaj", "oferta", "praca"]);
    expect(ACTIVE_FORM_KINDS).toEqual(FORM_KINDS);
    for (const kind of ACTIVE_FORM_KINDS) {
      expect(isActiveFormKind(kind, true), kind).toBe(true);
    }
    for (const other of ["", "KONTAKT", "PRACA", "inny"]) {
      expect(isActiveFormKind(other, true), other).toBe(false);
    }
  });

  it("wyłączony przełącznik podstrony „Praca” = rodzaj `praca` nieobsługiwany", () => {
    expect(isActiveFormKind("praca", false)).toBe(false);
    for (const kind of ["kontakt", "sprzedaj", "oferta"]) {
      expect(isActiveFormKind(kind, false), kind).toBe(true);
    }
  });

  it("cel powrotu bez JS: strony formularzy i detale ofert, nic więcej", () => {
    for (const path of [CONTACT_PATH, SELL_PATH, JOBS_PATH, OFFER_PATH]) {
      expect(isFormPagePath(path), path).toBe(true);
    }
    for (const path of [
      "/",
      OFFERS_PATH,
      "/oferty/mieszkanie-na-sprzedaz/",
      "/oferty/mieszkanie-na-sprzedaz/poznan/",
      "/oferty/index.json",
      "/oferty/a/b/xx000111/dalej/",
      "/kontakt",
      "//obcy.example/oferty/a/b/xx1/",
    ]) {
      expect(isFormPagePath(path), path).toBe(false);
    }
  });

  it("każdy adres detalu z danych jest celem powrotu (skip bez danych)", () => {
    for (const path of offerRoutesFromData().details) {
      expect(isFormPagePath(path), path).toBe(true);
    }
  });

  it("strona formularza wynika z rodzaju (nie z danych klienta)", () => {
    expect(FORM_PAGE_PATH).toEqual({
      kontakt: CONTACT_PATH,
      sprzedaj: SELL_PATH,
      praca: JOBS_PATH,
    });
  });
});

describe("formularze: isBotTrap", () => {
  it("czysty submit (pusty honeypot, elapsed ≥ 4000) NIE jest botem", () => {
    expect(isBotTrap({ firma: "", elapsed: "4000" })).toBe(false);
  });

  it("wypełniony honeypot = bot", () => {
    expect(isBotTrap({ firma: "ACME Sp. z o.o.", elapsed: "12000" })).toBe(
      true,
    );
  });

  it("submit szybszy niż 4 s = bot", () => {
    expect(isBotTrap({ firma: "", elapsed: "3999" })).toBe(true);
  });

  it("brak/niesparsowalny elapsed (POST z pominięciem JS) = bot", () => {
    expect(isBotTrap({ firma: "", elapsed: "" })).toBe(true);
    expect(isBotTrap({ firma: "", elapsed: "abc" })).toBe(true);
    expect(isBotTrap({})).toBe(true);
  });
});

describe("formularz kontaktowy: validateForm", () => {
  it("poprawne zgłoszenie przechodzi i jest znormalizowane (trim)", () => {
    expect(
      validateForm("kontakt", {
        ...kontaktRaw,
        name: "  Anna Nowak  ",
        email: " anna@example.com ",
      }),
    ).toEqual({ ok: true, data: kontaktData });
  });

  it("sam TELEFON wystarcza — e-mail zostaje pusty", () => {
    for (const phone of [
      "600100200",
      "600 100 200",
      "+48 600 100 200",
      "+48-600-100-200",
      "(48) 600.100.200",
    ]) {
      expect(
        validateForm("kontakt", { ...kontaktRaw, email: "", phone }),
        phone,
      ).toEqual({ ok: true, data: { ...kontaktData, email: "", phone } });
    }
  });

  it("oba kanały naraz są przyjmowane", () => {
    const r = validateForm("kontakt", { ...kontaktRaw, phone: "600 100 200" });
    expect(r).toEqual({
      ok: true,
      data: { ...kontaktData, phone: "600 100 200" },
    });
  });

  it("ani e-mail, ani telefon → błąd PARY (`contact`), nie pól", () => {
    expect(
      validateForm("kontakt", { ...kontaktRaw, email: "  ", phone: "" }),
    ).toEqual({ ok: false, fields: ["contact"] });
  });

  it("pole wypełnione błędnie jest błędem nawet przy poprawnym drugim", () => {
    expect(
      validateForm("kontakt", {
        ...kontaktRaw,
        email: "anna@x",
        phone: "600 100 200",
      }),
    ).toEqual({ ok: false, fields: ["email"] });
    expect(validateForm("kontakt", { ...kontaktRaw, phone: "12345" })).toEqual({
      ok: false,
      fields: ["phone"],
    });
  });

  it("błędny e-mail bez telefonu → błąd pola, nie pary", () => {
    for (const bad of ["abc", "abc@x", "a@b.c", "a b@example.com"]) {
      expect(
        validateForm("kontakt", { ...kontaktRaw, email: bad }),
        bad,
      ).toEqual({ ok: false, fields: ["email"] });
    }
  });

  it("puste / za długie imię odpada", () => {
    expect(validateForm("kontakt", { ...kontaktRaw, name: "   " })).toEqual({
      ok: false,
      fields: ["name"],
    });
    expect(
      validateForm("kontakt", {
        ...kontaktRaw,
        name: "x".repeat(NAME_MAX + 1),
      }),
    ).toEqual({ ok: false, fields: ["name"] });
  });

  it("wiadomość: pusta albo za długa odpada; krótka przechodzi", () => {
    expect(validateForm("kontakt", { ...kontaktRaw, message: "  " })).toEqual({
      ok: false,
      fields: ["message"],
    });
    expect(
      validateForm("kontakt", {
        ...kontaktRaw,
        message: "x".repeat(MESSAGE_MAX + 1),
      }),
    ).toEqual({ ok: false, fields: ["message"] });
    expect(validateForm("kontakt", { ...kontaktRaw, message: "Halo" }).ok).toBe(
      true,
    );
  });

  it("błędy wracają w kolejności pól formularza", () => {
    expect(validateForm("kontakt", { form: "kontakt" })).toEqual({
      ok: false,
      fields: ["name", "contact", "message"],
    });
  });

  it("zgoda marketingowa: domyślnie NIE, zaznaczona = TAK; nigdy warunkiem", () => {
    const off = validateForm("kontakt", kontaktRaw);
    expect(marketingOf(off)).toBe(false);
    const on = validateForm("kontakt", { ...kontaktRaw, marketing: "1" });
    expect(marketingOf(on)).toBe(true);
  });

  it("imię jest zawsze jedną linią", () => {
    const r = validateForm("kontakt", {
      ...kontaktRaw,
      name: "Anna\r\nBcc: spam@evil.example",
    });
    expect(r.ok && r.data.name).toBe("Anna Bcc: spam@evil.example");
  });
});

describe("zapytanie o ofertę: validateForm", () => {
  it("poprawne zgłoszenie niesie numer, wiadomość i dane kontaktowe", () => {
    const res = validateForm("oferta", {
      ...ofertaRaw,
      name: "  Ewa Zielińska ",
    });
    expect(res).toEqual({ ok: true, data: ofertaData });
  });

  it("numer jest normalizowany do wielkich liter", () => {
    const res = validateForm("oferta", { ...ofertaRaw, offer: " xx000111 " });
    expect(res.ok && res.data.form === "oferta" && res.data.offer).toBe(
      "XX000111",
    );
  });

  it("numer pusty albo o złym kształcie → pole `offer` (pierwsze na liście)", () => {
    for (const offer of [
      undefined,
      "",
      "000111",
      "XX",
      "XX 000111",
      "XX000111;DROP",
      "XX000111\nBcc: x@example.com",
      "<b>XX1</b>",
    ]) {
      const res = validateForm("oferta", { ...ofertaRaw, offer, name: "" });
      expect(res, String(offer)).toEqual({
        ok: false,
        fields: ["offer", "name"],
      });
    }
  });

  it("kształt numeru obejmuje każdy numer z danych (skip bez danych)", () => {
    for (const source of ["data", "fixture"] as const) {
      for (const o of readOffersTyped(source)) {
        expect(OFFER_NUMBER_RE.test(o.number), o.number).toBe(true);
      }
    }
  });

  it("para kontaktowa i wiadomość jak w formularzu kontaktowym", () => {
    expect(
      validateForm("oferta", { ...ofertaRaw, email: "", phone: "600 100 200" })
        .ok,
    ).toBe(true);
    expect(
      validateForm("oferta", { ...ofertaRaw, email: "", message: " " }),
    ).toEqual({ ok: false, fields: ["contact", "message"] });
    expect(validateForm("oferta", { ...ofertaRaw, email: "ewa@" })).toEqual({
      ok: false,
      fields: ["email"],
    });
  });

  it("zgoda marketingowa: domyślnie NIE; pola typu i transakcji nie dotyczą", () => {
    const res = validateForm("oferta", { ...ofertaRaw, marketing: "1" });
    expect(marketingOf(res)).toBe(true);
  });

  it("numer oferty nie jest polem pozostałych formularzy", () => {
    const res = validateForm("kontakt", { ...kontaktRaw, offer: "XX000111" });
    expect(res.ok && res.data).not.toHaveProperty("offer");
  });
});

describe("zgłoszenie nieruchomości: validateForm", () => {
  it("minimum: typ, transakcja, imię i jeden kanał kontaktu", () => {
    expect(validateForm("sprzedaj", sprzedajRaw)).toEqual({
      ok: true,
      data: {
        form: "sprzedaj",
        name: "Jan Kowalski",
        email: "",
        phone: "600 100 200",
        marketing: false,
        type: "2",
        transaction: "131",
        location: "",
        area: "",
        price: "",
        notes: "",
      },
    });
  });

  it("słowniki niosą identyfikatory CRM, etykieta „Lokal komercyjny”", () => {
    expect(ESTATE_TYPES.map((t) => t.value).sort()).toEqual([
      "1",
      "2",
      "3",
      "4",
    ]);
    expect(ESTATE_TYPES.map((t) => t.label)).toEqual([
      "Mieszkanie",
      "Dom",
      "Działka",
      "Lokal komercyjny",
    ]);
    expect(TRANSACTIONS).toEqual([
      { value: "131", label: "Sprzedaż" },
      { value: "132", label: "Wynajem" },
    ]);
  });

  it("typ: brak, `0` i wartość spoza słownika = nie wybrano", () => {
    for (const type of [undefined, "", "0", "5", "mieszkanie"]) {
      expect(
        validateForm("sprzedaj", { ...sprzedajRaw, type }),
        String(type),
      ).toEqual({ ok: false, fields: ["type"] });
    }
    for (const type of ["1", "2", "3", "4"]) {
      expect(validateForm("sprzedaj", { ...sprzedajRaw, type }).ok).toBe(true);
    }
  });

  it("transakcja: tylko 131 i 132", () => {
    for (const transaction of [undefined, "", "0", "130", "sprzedaz"]) {
      expect(
        validateForm("sprzedaj", { ...sprzedajRaw, transaction }),
        String(transaction),
      ).toEqual({ ok: false, fields: ["transaction"] });
    }
    expect(
      validateForm("sprzedaj", { ...sprzedajRaw, transaction: "132" }).ok,
    ).toBe(true);
  });

  it("pola opcjonalne: wartości poprawne są normalizowane", () => {
    const r = validateForm("sprzedaj", {
      ...sprzedajRaw,
      location: " Poznań,\n Winogrady ",
      area: "52.5",
      price: "550 000",
      notes: "  Do remontu.  ",
    });
    expect(r.ok && r.data).toMatchObject({
      location: "Poznań, Winogrady",
      area: "52,5",
      price: "550000",
      notes: "Do remontu.",
    });
  });

  it("powierzchnia i cena nieliczbowe → błąd pola", () => {
    for (const area of ["duża", "52 m2", "52m²", "-5", "1,234"]) {
      expect(validateForm("sprzedaj", { ...sprzedajRaw, area }), area).toEqual({
        ok: false,
        fields: ["area"],
      });
    }
    for (const price of ["550 000 zł", "pół miliona", "550k", "55,5"]) {
      expect(
        validateForm("sprzedaj", { ...sprzedajRaw, price }),
        price,
      ).toEqual({ ok: false, fields: ["price"] });
    }
  });

  it("lokalizacja i uwagi są przycinane, nie odrzucane", () => {
    const r = validateForm("sprzedaj", {
      ...sprzedajRaw,
      location: "x".repeat(LOCATION_MAX + 20),
      notes: "y".repeat(MESSAGE_MAX + 20),
    });
    expect(r.ok && r.data.form === "sprzedaj" && r.data.location).toHaveLength(
      LOCATION_MAX,
    );
    expect(r.ok && r.data.form === "sprzedaj" && r.data.notes).toHaveLength(
      MESSAGE_MAX,
    );
  });

  it("puste zgłoszenie: komplet błędów w kolejności pól", () => {
    expect(validateForm("sprzedaj", { form: "sprzedaj" })).toEqual({
      ok: false,
      fields: ["type", "transaction", "name", "contact"],
    });
  });
});

describe("zgłoszenie do pracy: validateForm", () => {
  const validate = (raw: FormRaw) => validateForm("praca", raw, checkCv);

  it("minimum: imię, jeden kanał kontaktu i plik; treść opcjonalna", () => {
    expect(validate(pracaRaw)).toEqual({
      ok: true,
      data: {
        form: "praca",
        name: "Maria Wiśniewska",
        email: "maria@example.com",
        phone: "",
        message: "",
        future: false,
        cv: {
          name: "CV-Maria-Wisniewska.pdf",
          size: 345678,
          mime: "application/pdf",
        },
      },
    });
  });

  it("para kontaktowa jak w pozostałych formularzach (sam telefon wystarcza)", () => {
    const phone = validate({ ...pracaRaw, email: "", phone: "600 100 200" });
    expect(phone.ok).toBe(true);
    expect(validate({ ...pracaRaw, email: "" })).toEqual({
      ok: false,
      fields: ["contact"],
    });
    expect(validate({ ...pracaRaw, email: "maria@x" })).toEqual({
      ok: false,
      fields: ["email"],
    });
  });

  it("zgoda na przyszłe rekrutacje: domyślnie NIE, zaznaczona = TAK", () => {
    const off = validate(pracaRaw);
    expect(off.ok && off.data.form === "praca" && off.data.future).toBe(false);
    const on = validate({ ...pracaRaw, future: "1" });
    expect(on.ok && on.data.form === "praca" && on.data.future).toBe(true);
  });

  it("formularz nie ma zgody marketingowej — pole dosłane jest ignorowane", () => {
    const res = validate({ ...pracaRaw, marketing: "1" });
    expect(res.ok && res.data).not.toHaveProperty("marketing");
  });

  it("treść jest przycinana, nie odrzucana", () => {
    const res = validate({
      ...pracaRaw,
      message: "x".repeat(MESSAGE_MAX + 50),
    });
    expect(
      res.ok && res.data.form === "praca" && res.data.message,
    ).toHaveLength(MESSAGE_MAX);
  });

  it("błąd pliku stoi na końcu listy, po polach osobowych", () => {
    expect(validate({ form: "praca" })).toEqual({
      ok: false,
      fields: ["name", "contact", "cv"],
    });
    expect(
      validate({ ...pracaRaw, name: "", "cv:name": "zdjecie.jpg" }),
    ).toEqual({ ok: false, fields: ["name", "cv-type"] });
    expect(
      validate({ ...pracaRaw, "cv:size": String(CV_MAX_BYTES + 1) }),
    ).toEqual({ ok: false, fields: ["cv-size"] });
  });

  it("bez kontroli pliku zgłoszenia nie da się przyjąć", () => {
    expect(validateForm("praca", pracaRaw)).toEqual({
      ok: false,
      fields: ["cv"],
    });
  });

  it("opis pliku nie jest polem pozostałych formularzy", () => {
    const res = validateForm("kontakt", {
      ...kontaktRaw,
      "cv:name": "cv.pdf",
      "cv:size": "10",
    });
    expect(res.ok && res.data).not.toHaveProperty("cv");
  });
});

describe("formularze: liczby", () => {
  it("parseArea: liczba z opcjonalną częścią dziesiętną", () => {
    expect(parseArea("48")).toBe("48");
    expect(parseArea("52,5")).toBe("52,5");
    expect(parseArea("52.75")).toBe("52,75");
    expect(parseArea("1 200")).toBe("1200");
    expect(parseArea("")).toBeNull();
    expect(parseArea("ok. 50")).toBeNull();
  });

  it("parsePrice: cyfry, spacje i kropki jako separatory tysięcy", () => {
    expect(parsePrice("550000")).toBe("550000");
    expect(parsePrice("550 000")).toBe("550000");
    expect(parsePrice("1.250.000")).toBe("1250000");
    expect(parsePrice("550 00")).toBeNull();
    expect(parsePrice("550000 zł")).toBeNull();
  });

  it("formatMailPrice grupuje tysiące i dopisuje walutę", () => {
    expect(formatMailPrice("500000")).toBe("500 000 zł");
    expect(formatMailPrice("1250000")).toBe("1 250 000 zł");
    expect(formatMailPrice("900")).toBe("900 zł");
  });
});

describe("formularze: escapowanie", () => {
  it("escapeHtml neutralizuje wszystkie znaki specjalne HTML", () => {
    expect(escapeHtml(`<a href="x" onclick='y'>&`)).toBe(
      "&lt;a href=&quot;x&quot; onclick=&#39;y&#39;&gt;&amp;",
    );
  });

  it("stripNewlines skleja wieloliniowy tekst w jedną linię", () => {
    expect(stripNewlines("Anna\r\n Nowak \n")).toBe("Anna Nowak");
  });
});

describe("mail A — kontakt", () => {
  const mail = buildMail(kontaktData, CTX);

  it("temat: dotychczasowy prefiks + dopisek kontekstu, bez danych klienta", () => {
    expect(mail.subject).toBe(
      "Zapytanie ze strony www hetmannieruchomosci.com — kontakt",
    );
    const hostile = buildMail(
      { ...kontaktData, name: "Anna\nBcc: spam@evil.example" },
      CTX,
    );
    expect(hostile.subject).toBe(mail.subject);
    expect(hostile.subject).not.toMatch(/[\r\n]/);
  });

  it("etykiety stoją w ustalonej kolejności", () => {
    const order = [
      "KONTAKT ZE STRONY",
      "Treść:",
      "Dane kontaktowe:",
      "Imię i nazwisko:",
      "Adres e-mail:",
      "Numer telefonu:",
      "Zgoda na oferty i informacje handlowe:",
      "Wysłano:",
      "Strona:",
    ];
    const at = order.map((label) => mail.text.indexOf(label));
    expect(at.every((i) => i >= 0)).toBe(true);
    expect([...at].sort((a, b) => a - b)).toEqual(at);
  });

  it("niesie wiadomość, oba kanały (brakujący = „nie podano”) i zgodę", () => {
    expect(mail.text).toContain("Chciałabym zapytać o sprzedaż mieszkania.");
    expect(mail.text).toContain("Adres e-mail:\nanna@example.com");
    expect(mail.text).toContain("Numer telefonu:\nnie podano");
    expect(mail.text).toContain("Zgoda na oferty i informacje handlowe: Nie");
    expect(mail.text).toContain(MARKETING_CONSENT);
    expect(mail.html).toContain(escapeHtml(MARKETING_CONSENT));

    const yes = buildMail({ ...kontaktData, marketing: true }, CTX);
    expect(yes.text).toContain("Zgoda na oferty i informacje handlowe: Tak");
    expect(yes.html).toContain("Zgoda na oferty i informacje handlowe: Tak");
  });

  it("stopka: data, adres strony z HOSTA ŻĄDANIA, zdanie o odpowiedzi", () => {
    expect(mail.text).toContain(`Wysłano: ${CTX.sentAt}`);
    expect(mail.text).toContain(`Strona: ${CTX.origin}${CONTACT_PATH}`);
    expect(mail.text).toContain("odpowiadając, piszesz do klienta");
    const phoneOnly = buildMail(
      { ...kontaktData, email: "", phone: "600 100 200" },
      CTX,
    );
    expect(phoneOnly.text).not.toContain("piszesz do klienta");
    expect(phoneOnly.text).toContain("skontaktuj się telefonicznie");
    expect(phoneOnly.text).toContain("Adres e-mail:\nnie podano");
  });

  it("HTML jest escapowany; tekst zostaje dosłowny", () => {
    const m = buildMail(
      { ...kontaktData, message: "Oferta <b>specjalna</b> & co dalej?" },
      CTX,
    );
    expect(m.text).toContain("Oferta <b>specjalna</b> & co dalej?");
    expect(m.html).toContain("Oferta &lt;b&gt;specjalna&lt;/b&gt; &amp;");
    expect(m.html).not.toContain("<b>specjalna</b>");
  });

  it("mail nie niesie obrazków ani skryptów", () => {
    expect(mail.html).not.toMatch(/<img|<script|<link/i);
  });
});

describe("mail B — zgłoszenie nieruchomości", () => {
  const mail = buildMail(sprzedajData, CTX);

  it("temat i nagłówek zgłoszenia", () => {
    expect(mail.subject).toBe(
      "Zapytanie ze strony www hetmannieruchomosci.com — zgłoszenie nieruchomości",
    );
    expect(mail.text).toContain("ZGŁOSZONA OFERTA");
    expect(mail.html).toContain("Zgłoszona oferta");
  });

  // Dotychczasowa strona gubiła te dwa pola w mailu — to jest powód
  // istnienia tego testu.
  it("NIESIE powierzchnię i cenę (tekst i HTML)", () => {
    expect(mail.text).toContain("Powierzchnia:\n50 m²");
    expect(mail.text).toContain("Cena:\n500 000 zł");
    expect(mail.html).toContain("50 m²");
    expect(mail.html).toContain("500 000 zł");
  });

  it("niesie ETYKIETY słownika, nie identyfikatory", () => {
    expect(mail.text).toContain("Typ transakcji:\nSprzedaż");
    expect(mail.text).toContain("Typ nieruchomości:\nMieszkanie");
    expect(mail.text).not.toMatch(/\b131\b/);
    const rent = buildMail(
      { ...sprzedajData, type: "4", transaction: "132" },
      CTX,
    );
    expect(rent.text).toContain("Typ transakcji:\nWynajem");
    expect(rent.text).toContain("Typ nieruchomości:\nLokal komercyjny");
  });

  it("etykiety stoją w ustalonej kolejności", () => {
    const order = [
      "Typ transakcji:",
      "Typ nieruchomości:",
      "Treść wiadomości:",
      "Lokalizacja nieruchomości:",
      "Powierzchnia:",
      "Cena:",
      "Dane kontaktowe:",
      "Imię i nazwisko:",
      "Adres e-mail:",
      "Numer telefonu:",
      "Zgoda na oferty i informacje handlowe: Tak",
    ];
    const at = order.map((label) => mail.text.indexOf(label));
    expect(at.every((i) => i >= 0)).toBe(true);
    expect([...at].sort((a, b) => a - b)).toEqual(at);
  });

  it("puste pola opcjonalne są pomijane", () => {
    const bare = buildMail(
      { ...sprzedajData, location: "", area: "", price: "", notes: "" },
      CTX,
    );
    for (const label of [
      "Treść wiadomości:",
      "Lokalizacja nieruchomości:",
      "Powierzchnia:",
      "Cena:",
    ]) {
      expect(bare.text, label).not.toContain(label);
    }
  });

  it("stopka wskazuje stronę zgłoszenia na hoście żądania", () => {
    expect(mail.text).toContain(`Strona: ${CTX.origin}${SELL_PATH}`);
  });
});

describe("mail D — zapytanie o ofertę", () => {
  const mail = buildMail(ofertaData, { ...CTX, offer: MAIL_OFFER });
  const url = `${CTX.origin}${OFFER_PATH}`;

  it("temat: dotychczasowy prefiks zapytania do agenta + numer oferty", () => {
    expect(mail.subject).toBe(
      "Zapytanie do agenta ze strony www hetmannieruchomosci.com — oferta XX000111",
    );
    expect(mail.subject).not.toMatch(/[\r\n]/);
    expect(mail.subject).not.toContain("Ewa");
  });

  it("nagłówek z numerem, pod nim adres oferty oraz tytuł · lokalizacja", () => {
    const lines = mail.text.split("\n");
    expect(lines[0]).toBe(
      "ZAPYTANIE WYSŁANE ZE STRONY WWW DO OFERTY NR XX000111",
    );
    expect(lines[1]).toBe(url);
    expect(lines[2]).toBe(
      "Mieszkanie testowe 2 pokoje · Poznań, Testowo · ul. Próbna",
    );
    expect(mail.html).toContain(
      `do oferty nr <a href="${url}" style="color:#083870">XX000111</a>`,
    );
    expect(mail.html).toContain("Mieszkanie testowe 2 pokoje · Poznań");
  });

  it("etykiety stoją w ustalonej kolejności", () => {
    const order = [
      "Treść wiadomości:",
      "Dane kontaktowe:",
      "Imię i nazwisko:",
      "Adres e-mail:",
      "Numer telefonu:",
      "Zgoda na oferty i informacje handlowe: Nie",
      "Brzmienie zgody:",
      "Wysłano:",
      "Strona:",
    ];
    let at = -1;
    for (const label of order) {
      const next = mail.text.indexOf(label, at + 1);
      expect(next, label).toBeGreaterThan(at);
      at = next;
    }
    expect(mail.text).toContain(MARKETING_CONSENT);
  });

  it("stopka wskazuje adres oferty na hoście żądania", () => {
    expect(mail.text).toContain(`Strona: ${url}`);
    expect(mail.text).toContain("odpowiadając, piszesz do klienta");
  });

  it("wartości z indeksu są escapowane w HTML", () => {
    const m = buildMail(ofertaData, {
      ...CTX,
      offer: {
        title: 'Lokal "A&B" <script>x</script>',
        place: "Testowo <i>",
        path: OFFER_PATH,
      },
    });
    expect(m.html).not.toContain("<script>");
    expect(m.html).not.toContain("<i>");
    expect(m.html).toContain("Lokal &quot;A&amp;B&quot; &lt;script&gt;");
    expect(m.text).toContain('Lokal "A&B" <script>x</script> · Testowo <i>');
  });

  it("numer spoza indeksu: dopisek zamiast tytułu i linku, zgłoszenie kompletne", () => {
    for (const offer of [null, undefined]) {
      const m = buildMail(ofertaData, { ...CTX, offer });
      expect(m.subject).toMatch(/— oferta XX000111$/);
      expect(m.text.split("\n")[1]).toBe(OFFER_NOT_IN_INDEX);
      expect(m.html).toContain(escapeHtml(OFFER_NOT_IN_INDEX));
      expect(m.html).not.toContain("<a ");
      expect(m.text).toContain(`Strona: ${CTX.origin}${OFFERS_PATH}`);
      expect(m.text).toContain("Jestem zainteresowana tą ofertą.");
      expect(m.text).toContain("ewa@example.com");
    }
  });

  it("dane oferty z kontekstu nie przeciekają do maili A i B", () => {
    for (const data of [kontaktData, sprzedajData]) {
      const m = buildMail(data, { ...CTX, offer: MAIL_OFFER });
      expect(m.text).not.toContain("Mieszkanie testowe");
      expect(m.text).not.toContain(OFFER_PATH);
      expect(m.subject).not.toContain("do agenta");
    }
  });
});

describe("mail C — zgłoszenie do pracy", () => {
  const mail = buildMail(pracaData, CTX);

  it("temat: dotychczasowy prefiks + dopisek, bez danych kandydata", () => {
    expect(mail.subject).toBe(
      "Zapytanie ze strony www hetmannieruchomosci.com — zgłoszenie do pracy",
    );
    const hostile = buildMail(
      { ...pracaData, name: "Maria\nBcc: spam@evil.example" },
      CTX,
    );
    expect(hostile.subject).toBe(mail.subject);
  });

  it("etykiety stoją w ustalonej kolejności; bez nagłówka danych kontaktowych", () => {
    const order = [
      "ZGŁOSZENIE OFERTY PRACY",
      "Imię i nazwisko kandydata:",
      "E-mail kandydata:",
      "Numer telefonu:",
      "Treść zgłoszenia:",
      "CV:",
      "Zgoda na przyszłe rekrutacje:",
      "Wysłano:",
      "Strona:",
    ];
    const at = order.map((label) => mail.text.indexOf(label));
    expect(at.every((i) => i >= 0)).toBe(true);
    expect([...at].sort((a, b) => a - b)).toEqual(at);
    expect(mail.text).not.toContain("Dane kontaktowe:");
  });

  it("linia CV niesie nazwę i rozmiar załącznika", () => {
    const line = `CV:\n${pracaData.cv.name} (${formatFileSize(pracaData.cv.size)})`;
    expect(mail.text).toContain(line);
    expect(mail.html).toContain(
      `${pracaData.cv.name} (${formatFileSize(pracaData.cv.size)})`,
    );
  });

  it("zgoda na przyszłe rekrutacje Tak / Nie + brzmienie; BEZ zgody marketingowej", () => {
    expect(mail.text).toContain("Zgoda na przyszłe rekrutacje: Nie");
    expect(mail.text).toContain(FUTURE_RECRUITMENT_CONSENT);
    expect(mail.html).toContain(escapeHtml(FUTURE_RECRUITMENT_CONSENT));
    const yes = buildMail({ ...pracaData, future: true }, CTX);
    expect(yes.text).toContain("Zgoda na przyszłe rekrutacje: Tak");
    expect(yes.html).toContain("Zgoda na przyszłe rekrutacje: Tak");
    for (const part of [mail.text, mail.html]) {
      expect(part).not.toContain("informacje handlowe");
      expect(part).not.toContain(MARKETING_CONSENT);
    }
  });

  it("pusta treść jest pomijana; brakujący kanał = „nie podano”", () => {
    const bare = buildMail({ ...pracaData, message: "" }, CTX);
    expect(bare.text).not.toContain("Treść zgłoszenia:");
    expect(bare.text).toContain("Numer telefonu:\nnie podano");
    const phoneOnly = buildMail(
      { ...pracaData, email: "", phone: "600 100 200" },
      CTX,
    );
    expect(phoneOnly.text).toContain("E-mail kandydata:\nnie podano");
    expect(phoneOnly.text).toContain("skontaktuj się telefonicznie");
    expect(mail.text).toContain("odpowiadając, piszesz do kandydata");
  });

  it("stopka wskazuje stronę „Praca” na hoście żądania", () => {
    expect(mail.text).toContain(`Wysłano: ${CTX.sentAt}`);
    expect(mail.text).toContain(`Strona: ${CTX.origin}${JOBS_PATH}`);
  });

  it("HTML jest escapowany; mail nie niesie obrazków ani skryptów", () => {
    const hostile = buildMail(
      { ...pracaData, message: "<script>alert(1)</script> & co" },
      CTX,
    );
    expect(hostile.html).toContain(
      "&lt;script&gt;alert(1)&lt;/script&gt; &amp; co",
    );
    expect(hostile.html).not.toContain("<script>");
    expect(mail.html).not.toMatch(/<img|<script/i);
  });

  it("dane oferty z kontekstu nie przeciekają do maila C", () => {
    const withOffer = buildMail(pracaData, { ...CTX, offer: MAIL_OFFER });
    expect(withOffer.text).toBe(mail.text);
    expect(withOffer.html).toBe(mail.html);
  });
});

describe("maile A i B po dodaniu maila D", () => {
  it("układ początku wiadomości bez zmian: nagłówek, pusta linia, etykieta", () => {
    expect(buildMail(kontaktData, CTX).text.split("\n").slice(0, 3)).toEqual([
      "KONTAKT ZE STRONY",
      "",
      "Treść:",
    ]);
    expect(buildMail(sprzedajData, CTX).text.split("\n").slice(0, 3)).toEqual([
      "ZGŁOSZONA OFERTA",
      "",
      "Typ transakcji:",
    ]);
  });
});

describe("formularze: adresat i nadawca", () => {
  it("adresatem jest skrzynka biura", () => {
    expect(CONTACT_TO).toBe("biuro@hetmannieruchomosci.com");
  });

  // Resend weryfikuje SUBDOMENĘ `send.` (domena główna zostaje przy
  // skrzynkach pocztowych). Adres nadawcy spoza niej = odmowa wysyłki.
  it("powiadomienie wychodzi z subdomeny send.", () => {
    expect(CONTACT_FROM_NOTIFY).toBe(
      "Formularz www <formularz@send.hetmannieruchomosci.com>",
    );
  });

  it("potwierdzenie do nadawcy nie istnieje (moduł i endpoint)", async () => {
    const mod = await import("../../src/lib/contact-form");
    expect(mod).not.toHaveProperty("buildConfirmEmail");
    expect(mod).not.toHaveProperty("CONTACT_FROM_CONFIRM");
    const endpoint = readFileSync("functions/api/kontakt.ts", "utf8");
    expect(endpoint).not.toMatch(/Confirm/i);
  });

  it("brzmienia zgód nie zawierają adresu e-mail ani gwiazdki", () => {
    expect(MARKETING_CONSENT).not.toMatch(/@|\*/);
    expect(FUTURE_RECRUITMENT_CONSENT).not.toMatch(/@|\*/);
  });
});
