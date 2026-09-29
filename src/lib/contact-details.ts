// Telefon i e-maile firmowe dla chrome'u (navbar, sheet menu, stopka)
// oraz widoków (kontakt, karta agenta, polityka). Antyscraping: pełne
// ciągi NIE istnieją w bundle'u ani w statycznym HTML — składane
// z fragmentów dopiero w JS po załadowaniu strony (sloty
// [data-tel]/[data-mail] startują ukryte; bez JS chrome nie pokazuje
// numeru).
// Ten moduł jest JEDYNYM miejscem w projekcie, które zna fragmenty numeru
// i adresów; JSON-LD celowo nie dostaje ani telefonu, ani maila.
//
// ZAKRES kontraktu na surowym HTML: chrome, /kontakt/, karta agenta
// i polityka. WYŁĄCZONY z niego jest opis oferty pochodzący z CRM — treści
// klientki nie redagujemy, więc dane kontaktowe wpisane przez nią w opis
// zostają.
//
// Jeden telefon: a[data-tel]. Dwa adresy: a[data-mail="biuro"] (kontakt,
// stopka, polityka) i a[data-mail="joanna"] (karta agenta).

export type MailBox = "biuro" | "joanna";

const PHONE_PARTS: readonly number[] = [48, 530, 100, 335];

const EMAIL_DOMAIN = ["hetmannieruchomosci", "com"] as const;

export const buildPhoneHref = (): string => "tel:+" + PHONE_PARTS.join("");

export const buildPhoneDisplay = (): string =>
  "+" + PHONE_PARTS[0] + " " + PHONE_PARTS.slice(1).join(" ");

export const buildEmail = (box: MailBox = "biuro"): string =>
  box + String.fromCharCode(64) + EMAIL_DOMAIN[0] + "." + EMAIL_DOMAIN[1];

/** Wypełnia sloty telefonu/maili w DOM (chrome renderuje je puste+hidden).
 *  Kotwica z wewnętrznym [data-slot] (np. wiersz z etykietą — etykieta
 *  zostaje) dostaje tekst do slotu; bez slotu — w textContent całej
 *  kotwicy. Wariant `data-fill="href"` (np. przycisk „Zadzwoń"):
 *  podmieniamy WYŁĄCZNIE cel linku, etykieta kotwicy zostaje nietknięta. */
export function fillContactSlots(root: ParentNode = document): void {
  const fill = (
    a: HTMLAnchorElement,
    mode: string | undefined,
    href: string,
    text: string,
  ) => {
    a.href = href;
    if (mode !== "href") {
      (a.querySelector<HTMLElement>("[data-slot]") ?? a).textContent = text;
    }
    a.hidden = false;
  };
  root.querySelectorAll<HTMLAnchorElement>("a[data-tel]").forEach((a) => {
    fill(a, a.dataset.fill, buildPhoneHref(), buildPhoneDisplay());
  });
  root.querySelectorAll<HTMLAnchorElement>("a[data-mail]").forEach((a) => {
    const box: MailBox = a.dataset.mail === "joanna" ? "joanna" : "biuro";
    const email = buildEmail(box);
    fill(a, a.dataset.fill, "mailto:" + email, email);
  });
}
