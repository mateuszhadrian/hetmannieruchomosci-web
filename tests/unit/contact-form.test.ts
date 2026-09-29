// Logika formularza kontaktowego (src/lib/contact-form.ts) — walidacja,
// pułapki na boty, escapowanie i treść powiadomienia. STAN Etapu 0:
// kontrakt pól odziedziczony z szablonu (jedno pole „telefon LUB e-mail",
// opcjonalna lokalizacja); testy per formularz powstają w Etapie 5.
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  buildNotifyEmail,
  classifyContact,
  escapeHtml,
  isBotTrap,
  CONTACT_FROM_NOTIFY,
  CONTACT_TO,
  MESSAGE_MAX,
  NAME_MAX,
  PHONE_MAX,
  PLACE_MAX,
  stripNewlines,
  validateSubmission,
  type ContactData,
  type ContactRaw,
} from "../../src/lib/contact-form";

const validRaw: ContactRaw = {
  name: "Anna",
  contact: "anna@example.com",
  place: "Poznań, Winogrady",
  message: "Chciałabym zapytać o sprzedaż mieszkania.",
  firma: "",
  elapsed: "12000",
  lang: "pl",
};

const validData: ContactData = {
  name: "Anna",
  email: "anna@example.com",
  phone: "",
  place: "Poznań, Winogrady",
  message: "Chciałabym zapytać o sprzedaż mieszkania.",
  lang: "pl",
};

describe("kontakt: isBotTrap", () => {
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
  });
});

// ── pole „telefon LUB e-mail" — jedna funkcja dla klienta i serwera
describe("kontakt: classifyContact (telefon LUB e-mail)", () => {
  it("sam e-mail rozpoznany jako e-mail (telefon zostaje pusty)", () => {
    expect(classifyContact("  anna@example.com  ")).toEqual({
      kind: "email",
      email: "anna@example.com",
      phone: "",
    });
    expect(classifyContact("a.b+c@sub.dom.pl").kind).toBe("email");
  });

  it("numer w typowych zapisach rozpoznany jako telefon", () => {
    for (const value of [
      "600100200",
      "600 100 200",
      "+48 600 100 200",
      "+48-600-100-200",
      "(48) 600.100.200",
      "0048600100200",
    ]) {
      const r = classifyContact(value);
      expect(r.kind, value).toBe("phone");
      expect(r.email, value).toBe("");
      expect(r.phone, value).toBe(value.trim());
    }
  });

  it("wpis mieszany daje OBA pola, a e-mail decyduje o rodzaju", () => {
    expect(classifyContact("anna@example.com, 600 100 200")).toEqual({
      kind: "email",
      email: "anna@example.com",
      phone: "600 100 200",
    });
    expect(classifyContact("600 100 200 / anna@example.com").kind).toBe(
      "email",
    );
  });

  it("śmieci, urwane adresy i za krótkie numery odpadają", () => {
    for (const bad of [
      "",
      "   ",
      "abc",
      "abc@x",
      "a@b.c",
      "12345678",
      "zadzwoń do mnie",
    ]) {
      expect(classifyContact(bad).kind, bad).toBe("invalid");
    }
  });

  it("numer dłuższy niż PHONE_MAX zostaje przycięty, nie odrzucony", () => {
    const padded = "600 100 200" + " ".repeat(PHONE_MAX);
    const r = classifyContact(padded);
    expect(r.kind).toBe("phone");
    expect(r.phone.length).toBeLessThanOrEqual(PHONE_MAX);
  });
});

describe("kontakt: validateSubmission", () => {
  it("poprawne zgłoszenie przechodzi i jest znormalizowane (trim)", () => {
    const result = validateSubmission({
      ...validRaw,
      name: "  Anna  ",
      contact: " anna@example.com ",
    });
    expect(result).toEqual({ ok: true, data: validData });
  });

  it("sam TELEFON wystarcza — e-mail zostaje pusty", () => {
    const result = validateSubmission({
      ...validRaw,
      contact: "+48 600 100 200",
    });
    expect(result).toEqual({
      ok: true,
      data: { ...validData, email: "", phone: "+48 600 100 200" },
    });
  });

  it("ani telefon, ani e-mail = odrzucenie na polu contact", () => {
    for (const bad of ["", "   ", "oddzwońcie", "abc@x"]) {
      expect(validateSubmission({ ...validRaw, contact: bad }), bad).toEqual({
        ok: false,
        field: "contact",
      });
    }
  });

  it("puste / za długie imię odpada", () => {
    expect(validateSubmission({ ...validRaw, name: "   " })).toEqual({
      ok: false,
      field: "name",
    });
    expect(
      validateSubmission({ ...validRaw, name: "x".repeat(NAME_MAX + 1) }),
    ).toEqual({ ok: false, field: "name" });
  });

  it("wiadomość poza widełkami 10–5000 znaków odpada", () => {
    expect(validateSubmission({ ...validRaw, message: "za krótko" })).toEqual({
      ok: false,
      field: "message",
    });
    expect(
      validateSubmission({
        ...validRaw,
        message: "x".repeat(MESSAGE_MAX + 1),
      }),
    ).toEqual({ ok: false, field: "message" });
  });

  it("lokalizacja jest OPCJONALNA — pusta nie blokuje zgłoszenia", () => {
    const result = validateSubmission({ ...validRaw, place: "" });
    expect(result.ok && result.data.place).toBe("");
  });

  it("lokalizacja: jedna linia, przycięta do PLACE_MAX, bez odrzucania", () => {
    const multiline = validateSubmission({
      ...validRaw,
      place: " Poznań \r\n Bcc: spam@evil.com ",
    });
    expect(multiline.ok && multiline.data.place).toBe(
      "Poznań Bcc: spam@evil.com",
    );
    const long = validateSubmission({
      ...validRaw,
      place: "x".repeat(PLACE_MAX + 20),
    });
    expect(long.ok).toBe(true);
    expect(long.ok && long.data.place).toHaveLength(PLACE_MAX);
  });

  it("lang jest zawsze normalizowany do pl (PL-only)", () => {
    for (const lang of ["de", "en", ""]) {
      const r = validateSubmission({ ...validRaw, lang });
      expect(r.ok && r.data.lang, lang).toBe("pl");
    }
  });
});

describe("kontakt: escapowanie", () => {
  it("escapeHtml neutralizuje wszystkie znaki specjalne HTML", () => {
    expect(escapeHtml(`<a href="x" onclick='y'>&`)).toBe(
      "&lt;a href=&quot;x&quot; onclick=&#39;y&#39;&gt;&amp;",
    );
  });

  it("stripNewlines skleja wieloliniowy tekst w jedną linię", () => {
    expect(stripNewlines("Anna\r\n Nowak \n")).toBe("Anna Nowak");
  });
});

describe("kontakt: powiadomienie do biura", () => {
  it("subject niesie lokalizację i imię; bez lokalizacji — samo imię", () => {
    const withPlace = buildNotifyEmail(validData, "11 lip 2026, 12:00");
    expect(withPlace.subject).toBe(
      "[hetmannieruchomosci.com] Poznań, Winogrady: zapytanie od Anna",
    );
    const noPlace = buildNotifyEmail(
      { ...validData, place: "" },
      "11 lip 2026, 12:00",
    );
    expect(noPlace.subject).toBe("[hetmannieruchomosci.com] zapytanie od Anna");
  });

  it("subject jest zawsze jedną linią, nawet gdy imię zawiera newline", () => {
    const mail = buildNotifyEmail(
      { ...validData, name: "Anna\nBcc: spam@evil.com" },
      "x",
    );
    expect(mail.subject).not.toMatch(/[\r\n]/);
  });

  it("treść niesie oba kanały kontaktu, a brakujący pokazuje myślnik", () => {
    const mailOnly = buildNotifyEmail(validData, "1 sie 2026, 12:00");
    expect(mailOnly.text).toContain("E-mail: anna@example.com");
    expect(mailOnly.text).toContain("Telefon: —");

    const phoneOnly = buildNotifyEmail(
      { ...validData, email: "", phone: "+48 600 100 200" },
      "1 sie 2026, 12:00",
    );
    expect(phoneOnly.text).toContain("Telefon: +48 600 100 200");
    expect(phoneOnly.text).toContain("E-mail: —");
    expect(phoneOnly.html).toContain("+48 600 100 200");
  });

  it("treść niesie lokalizację (albo myślnik)", () => {
    expect(buildNotifyEmail(validData, "x").text).toContain(
      "Lokalizacja: Poznań, Winogrady",
    );
    expect(buildNotifyEmail({ ...validData, place: "" }, "x").text).toContain(
      "Lokalizacja: —",
    );
  });

  it("treść zawiera wiadomość; HTML jest escapowany", () => {
    const mail = buildNotifyEmail(
      { ...validData, message: "Oferta <b>specjalna</b> & co dalej?" },
      "11 lip 2026, 12:00",
    );
    expect(mail.text).toContain("Oferta <b>specjalna</b> & co dalej?");
    expect(mail.html).toContain("Oferta &lt;b&gt;specjalna&lt;/b&gt; &amp;");
    expect(mail.html).not.toContain("<b>specjalna</b>");
  });
});

describe("kontakt: adresat i nadawca", () => {
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
});
