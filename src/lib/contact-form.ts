// Logika formularza kontaktowego — czysty TS, bez zależności od runtime'u
// Workers. Konsumenci: functions/api/kontakt.ts (Pages Function),
// contact-ui.ts (walidacja kliencka) i testy unit.
//
// STAN Etapu 0: zmienione WYŁĄCZNIE adresy i stałe nadawcy oraz nazwa
// serwisu w powiadomieniu. Zestaw pól (`contact` jako jedno pole „telefon
// LUB e-mail", `place`) i treść szablonu są odziedziczone z szablonu
// projektu i NIE są docelowe — cztery formularze z własnymi polami,
// zgodami i szablonami maili powstają w Etapie 5 (specyfikacje:
// docs/kb, dokumenty lokalne).
//
// Potwierdzenie do nadawcy NIE istnieje — strona wysyła jedną wiadomość,
// do biura.

export const CONTACT_TO = "biuro@hetmannieruchomosci.com";
// Nadawca MUSI siedzieć na domenie zweryfikowanej w Resendzie (subdomena
// `send.`; domena główna zostaje przy skrzynkach pocztowych). Adres spoza
// zweryfikowanej domeny = odmowa wysyłki po stronie Resenda, nie błąd
// naszego kodu.
export const CONTACT_FROM_NOTIFY =
  "Formularz www <formularz@send.hetmannieruchomosci.com>";

/** Nazwa serwisu w temacie i treści powiadomienia. */
const SITE_LABEL = "hetmannieruchomosci.com";

export const MIN_FILL_MS = 4000;
export const NAME_MAX = 100;
const EMAIL_MAX = 254;
export const PHONE_MAX = 40;
/** Lokalizacja — pole OPCJONALNE: puste nie blokuje zgłoszenia. */
export const PLACE_MAX = 120;
export const MESSAGE_MIN = 10;
export const MESSAGE_MAX = 5000;

/** E-mail — ta sama reguła co dotąd (klient i serwer). */
export const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
/** Telefon PO normalizacji (`normalizePhone`): opcjonalny „+" i 9–15 cyfr.
 *  Polski numer ma 9 cyfr, górna granica mieści prefiksy krajowe.
 *  Reguła jest CELOWO permisywna — twardsza dawałaby fałszywe odrzuty
 *  (numer bywa pisany na kilkanaście sposobów). */
export const PHONE_RE = /^\+?\d{9,15}$/;

// PL-only — pole lang zostaje w kontrakcie multipart,
// ale jedyną wartością jest "pl".
type ContactLang = "pl";

/** Surowe pola z multipart/form-data (zawsze stringi, mogą być puste).
 *  `contact` = jedno pole „telefon LUB e-mail". */
export interface ContactRaw {
  name: string;
  contact: string;
  /** Lokalizacja — opcjonalne. */
  place: string;
  message: string;
  firma: string;
  elapsed: string;
  lang: string;
}

export interface ContactData {
  name: string;
  /** "" gdy podano wyłącznie telefon. Niepusty trafia do Reply-To. */
  email: string;
  /** "" gdy podano wyłącznie e-mail. Zapisany tak, jak go wpisano
   *  (przycięty do PHONE_MAX) — normalizacja służy tylko walidacji. */
  phone: string;
  /** "" gdy nie podano. */
  place: string;
  message: string;
  lang: ContactLang;
}

/**
 * Pułapka na boty: honeypot `firma` niepusty LUB `elapsed` < MIN_FILL_MS.
 * Brak/niesparsowalny `elapsed` = POST z pominięciem naszego JS = bot.
 */
export function isBotTrap(raw: Pick<ContactRaw, "firma" | "elapsed">): boolean {
  if (raw.firma !== "") return true;
  const elapsed = Number(raw.elapsed);
  return !Number.isFinite(elapsed) || elapsed < MIN_FILL_MS;
}

/** Numer do postaci porównywalnej z PHONE_RE: bez spacji, kropek,
 *  myślników (także półpauz), nawiasów i ukośników. */
function normalizePhone(value: string): string {
  return value.replace(/[\s.\-–—()/]/g, "");
}

export type ContactKind = "email" | "phone" | "invalid";

/** Rozbiór pola „telefon LUB e-mail". JEDNO źródło prawdy dla walidacji
 *  klienckiej (contact-ui.ts) i serwerowej (validateSubmission) — inaczej
 *  obie strony mogłyby się rozjechać.
 *
 *  Wpis bywa mieszany („jan@x.pl, 600 000 000"), więc najpierw szukamy
 *  tokenu wyglądającego na adres, a z RESZTY próbujemy złożyć numer.
 *  `kind` mówi, co udało się rozpoznać (`email` ma pierwszeństwo, bo to
 *  ono trafia do Reply-To). */
export function classifyContact(value: string): {
  kind: ContactKind;
  email: string;
  phone: string;
} {
  const v = value.trim();
  if (v.length === 0) return { kind: "invalid", email: "", phone: "" };

  const tokens = v.split(/[\s,;]+/).filter(Boolean);
  const mailToken = tokens.find(
    (t) => t.length <= EMAIL_MAX && EMAIL_RE.test(t),
  );
  const rest = mailToken ? tokens.filter((t) => t !== mailToken).join(" ") : v;
  const digits = normalizePhone(rest);
  const phone =
    digits.length > 0 && PHONE_RE.test(digits)
      ? rest.trim().slice(0, PHONE_MAX)
      : "";

  if (mailToken) return { kind: "email", email: mailToken, phone };
  if (phone) return { kind: "phone", email: "", phone };
  return { kind: "invalid", email: "", phone: "" };
}

export type ValidationResult =
  | { ok: true; data: ContactData }
  | { ok: false; field: "name" | "contact" | "message" };

export function validateSubmission(raw: ContactRaw): ValidationResult {
  const name = raw.name.trim();
  const message = raw.message.trim();

  if (name.length === 0 || name.length > NAME_MAX) {
    return { ok: false, field: "name" };
  }
  // Poprawny telefon ALBO poprawny e-mail — bez tego nie mamy jak
  // odpowiedzieć, więc to jedyne twarde pole poza imieniem i opisem.
  const contact = classifyContact(raw.contact);
  if (contact.kind === "invalid") return { ok: false, field: "contact" };
  if (message.length < MESSAGE_MIN || message.length > MESSAGE_MAX) {
    return { ok: false, field: "message" };
  }

  // Lokalizacja: opcjonalna i NIE odrzucająca zgłoszenia — jedna linia,
  // przycięta do PLACE_MAX (śmieciowy payload nie rozepcha maila).
  const place = stripNewlines(raw.place).slice(0, PLACE_MAX);

  return {
    ok: true,
    data: {
      name,
      email: contact.email,
      phone: contact.phone,
      place,
      message,
      lang: "pl",
    },
  };
}

export function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/** Do Subject: jedna linia (porządek w temacie, nie mechanizm security). */
export function stripNewlines(s: string): string {
  return s.replace(/\s*[\r\n]+\s*/g, " ").trim();
}

export interface EmailContent {
  subject: string;
  html: string;
  text: string;
}

/**
 * Powiadomienie do skrzynki biura. Czytelnie, bez ozdób; najważniejsze to
 * OD KOGO i JAK oddzwonić/odpisać. Odpowiedź jednym klikiem załatwia
 * Reply-To ustawiane przez endpoint — ale tylko wtedy, gdy podano e-mail.
 */
export function buildNotifyEmail(
  data: ContactData,
  sentAt: string,
): EmailContent {
  const name = stripNewlines(data.name);
  const place = stripNewlines(data.place);
  const subject = place
    ? `[${SITE_LABEL}] ${place}: zapytanie od ${name}`
    : `[${SITE_LABEL}] zapytanie od ${name}`;

  const text = [
    `Nowa wiadomość z formularza na ${SITE_LABEL}`,
    "",
    `Od: ${name}`,
    `Telefon: ${data.phone || "—"}`,
    `E-mail: ${data.email || "—"}`,
    `Lokalizacja: ${place || "—"}`,
    `Data: ${sentAt}`,
    "",
    "Wiadomość:",
    data.message,
  ].join("\n");

  const html = [
    `<p>Nowa wiadomość z formularza na ${SITE_LABEL}</p>`,
    `<p><strong>Od:</strong> ${escapeHtml(name)}<br>`,
    `<strong>Telefon:</strong> ${escapeHtml(data.phone || "—")}<br>`,
    `<strong>E-mail:</strong> ${escapeHtml(data.email || "—")}<br>`,
    `<strong>Lokalizacja:</strong> ${escapeHtml(place || "—")}<br>`,
    `<strong>Data:</strong> ${escapeHtml(sentAt)}</p>`,
    `<div style="white-space:pre-wrap;border-top:1px solid #ccc;padding-top:12px">${escapeHtml(data.message)}</div>`,
  ].join("\n");

  return { subject, html, text };
}
