// Logika formularzy (src/lib/contact-form.ts) — pułapki na boty,
// walidacja per formularz (dwa osobne pola kontaktowe, wymagane co
// najmniej jedno), słowniki zgłoszenia nieruchomości i treść maili A i B
// (Etap 5A, docs/analiza-formularze-a.md §5). Dane wyłącznie syntetyczne.
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
  isActiveFormKind,
  isBotTrap,
  LOCATION_MAX,
  MARKETING_CONSENT,
  MESSAGE_MAX,
  NAME_MAX,
  parseArea,
  parsePrice,
  stripNewlines,
  TRANSACTIONS,
  validateForm,
  type FormRaw,
  type KontaktData,
  type SprzedajData,
} from "../../src/lib/contact-form";
import { CONTACT_PATH, SELL_PATH } from "../../src/lib/routes";

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

const CTX = { sentAt: "3 paź 2026, 12:00", origin: "https://podglad.example" };

describe("formularze: rodzaje", () => {
  it("endpoint zna cztery rodzaje, w 5A obsługuje dwa", () => {
    expect(FORM_KINDS).toEqual(["kontakt", "sprzedaj", "oferta", "praca"]);
    expect(ACTIVE_FORM_KINDS).toEqual(["kontakt", "sprzedaj"]);
    expect(isActiveFormKind("kontakt")).toBe(true);
    expect(isActiveFormKind("sprzedaj")).toBe(true);
    for (const other of ["oferta", "praca", "", "KONTAKT", "inny"]) {
      expect(isActiveFormKind(other), other).toBe(false);
    }
  });

  it("strona formularza wynika z rodzaju (nie z danych klienta)", () => {
    expect(FORM_PAGE_PATH).toEqual({
      kontakt: CONTACT_PATH,
      sprzedaj: SELL_PATH,
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
    expect(off.ok && off.data.marketing).toBe(false);
    const on = validateForm("kontakt", { ...kontaktRaw, marketing: "1" });
    expect(on.ok && on.data.marketing).toBe(true);
  });

  it("imię jest zawsze jedną linią", () => {
    const r = validateForm("kontakt", {
      ...kontaktRaw,
      name: "Anna\r\nBcc: spam@evil.example",
    });
    expect(r.ok && r.data.name).toBe("Anna Bcc: spam@evil.example");
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

  it("brzmienie zgody nie zawiera adresu e-mail ani gwiazdki", () => {
    expect(MARKETING_CONSENT).not.toMatch(/@|\*/);
  });
});
