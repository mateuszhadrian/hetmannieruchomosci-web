// Składanie tel/mail chrome'u (navbar/sheet/stopka) z fragmentów —
// antyscraping: pełne ciągi mogą powstać WYŁĄCZNIE w runtime; statyczny
// HTML pilnuje osobno test w tests/e2e/navigation.spec.ts.
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  buildEmail,
  buildPhoneDisplay,
  buildPhoneHref,
} from "../../src/lib/contact-details";

describe("contact-details (chrome)", () => {
  it("href telefonu: tel: bez spacji", () => {
    expect(buildPhoneHref()).toBe("tel:+48530100335");
  });

  it("tekst telefonu: ze spacjami (format z designu)", () => {
    expect(buildPhoneDisplay()).toBe("+48 530 100 335");
  });

  it("dwa adresy: biuro (domyślny) i joanna (karta agenta)", () => {
    expect(buildEmail()).toBe("biuro@hetmannieruchomosci.com");
    expect(buildEmail("biuro")).toBe("biuro@hetmannieruchomosci.com");
    expect(buildEmail("joanna")).toBe("joanna@hetmannieruchomosci.com");
  });

  it("źródło modułu nie zawiera pełnych ciągów (kontrakt antyscrapingowy)", () => {
    const source = readFileSync("src/lib/contact-details.ts", "utf8");
    expect(source).not.toMatch(/530\s?100\s?335/);
    expect(source).not.toMatch(/@hetmannieruchomosci/);
  });
});
