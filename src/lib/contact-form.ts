// Logika formularzy serwisu — czysty TS, bez zależności od runtime'u
// Workers i bez DOM. Konsumenci: functions/api/kontakt.ts (Pages
// Function), src/components/forms/form-ui.ts (walidacja kliencka),
// komponenty formularzy (słowniki, brzmienie zgody) i testy unit.
//
// Etap 5 (docs/analiza-formularze-a.md, analiza-formularze-b.md): JEDEN
// endpoint z polem `form`; rodzaje `kontakt`, `sprzedaj`, `oferta`
// (zapytanie przy ofercie) i `praca` (zgłoszenie z CV jako załącznikiem;
// za przełącznikiem SHOW_PRACA).
// Dwa OSOBNE pola kontaktowe, wymagane co najmniej jedno.
// `validateForm` jest jednym źródłem prawdy dla klienta i serwera — obie
// strony dostają tę samą listę błędnych pól, więc nie mogą się rozjechać.
//
// Potwierdzenie do nadawcy NIE istnieje — strona wysyła jedną wiadomość,
// do biura. Nic poza mailem nie jest utrwalane (CV żyje wyłącznie
// w pamięci żądania).
import { CV_MAX_BYTES, formatFileSize } from "./cv-file";
import { CONTACT_PATH, JOBS_PATH, OFFERS_PATH, SELL_PATH } from "./routes";
import { SHOW_PRACA } from "./site-config";

export const CONTACT_TO = "biuro@hetmannieruchomosci.com";
// Nadawca MUSI siedzieć na domenie zweryfikowanej w Resendzie (subdomena
// `send.`; domena główna zostaje przy skrzynkach pocztowych). Adres spoza
// zweryfikowanej domeny = odmowa wysyłki po stronie Resenda, nie błąd
// naszego kodu.
export const CONTACT_FROM_NOTIFY =
  "Formularz www <formularz@send.hetmannieruchomosci.com>";

/** Nazwa serwisu w temacie powiadomienia — prefiks tematu jest taki sam
 *  jak w mailach dotychczasowej strony (reguły poczty biura działają
 *  dalej); zmienia się tylko dopisek kontekstu. */
const SITE_LABEL = "hetmannieruchomosci.com";
const SUBJECT_PREFIX = `Zapytanie ze strony www ${SITE_LABEL}`;
/** Zapytanie przy ofercie miało na dotychczasowej stronie własny temat. */
const SUBJECT_PREFIX_AGENT = `Zapytanie do agenta ze strony www ${SITE_LABEL}`;

export const MIN_FILL_MS = 4000;
export const NAME_MAX = 100;
export const EMAIL_MAX = 254;
export const PHONE_MAX = 40;
/** Lokalizacja nieruchomości — pole OPCJONALNE, jedna linia. */
export const LOCATION_MAX = 120;
export const MESSAGE_MAX = 5000;
/** Górny rozmiar żądania formularza tekstowego (endpoint odrzuca większe
 *  po nagłówku `Content-Length`, zanim przeczyta treść). */
export const FORM_MAX_BYTES = 64 * 1024;
/** Górny rozmiar żądania z plikiem CV: limit pliku + narzut pól formularza.
 *  Endpoint odrzuca większe po nagłówku, zanim przeczyta treść. */
export const CV_REQUEST_MAX_BYTES = CV_MAX_BYTES + FORM_MAX_BYTES;

export const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
/** Telefon PO normalizacji (`normalizePhone`): opcjonalny „+" i 9–15 cyfr.
 *  Polski numer ma 9 cyfr, górna granica mieści prefiksy krajowe.
 *  Reguła jest CELOWO permisywna — twardsza dawałaby fałszywe odrzuty
 *  (numer bywa pisany na kilkanaście sposobów). */
export const PHONE_RE = /^\+?\d{9,15}$/;

// ── Rodzaje formularzy ──────────────────────────────────────────────────
export const FORM_KINDS = ["kontakt", "sprzedaj", "oferta", "praca"] as const;
export type FormKind = (typeof FORM_KINDS)[number];
/** Rodzaje obsługiwane przez endpoint. `praca` stoi za przełącznikiem
 *  SHOW_PRACA: wyłączony = funkcja odrzuca ten rodzaj jak nieznany. */
export const ACTIVE_FORM_KINDS = [
  "kontakt",
  "sprzedaj",
  "oferta",
  "praca",
] as const;
export type ActiveFormKind = (typeof ACTIVE_FORM_KINDS)[number];

export function isActiveFormKind(
  value: string,
  showPraca: boolean = SHOW_PRACA,
): value is ActiveFormKind {
  if (value === "praca" && !showPraca) return false;
  return (ACTIVE_FORM_KINDS as readonly string[]).includes(value);
}

/** Strony formularzy o STAŁYM adresie — do stopki maila i przekierowania
 *  wysyłki bez JS. Ścieżka wynika z RODZAJU formularza, nie z danych
 *  klienta. Zapytanie o ofertę żyje pod adresem detalu (`isFormPagePath`). */
export const FORM_PAGE_PATH = {
  kontakt: CONTACT_PATH,
  sprzedaj: SELL_PATH,
  praca: JOBS_PATH,
} as const;

/** Adres detalu oferty: `/oferty/{rodzaj}/{lokalizacja}/{numer}/`
 *  (wzorzec tras w routes.ts; numer w adresie małymi literami). */
const OFFER_DETAIL_PATH_RE = /^\/oferty\/[^/]+\/[^/]+\/[a-z]{1,8}\d{1,12}\/$/;

/** Czy pod tą ścieżką stoi któryś formularz serwisu (cel powrotu po
 *  wysyłce bez JS — nigdy adres spoza tej listy). */
export function isFormPagePath(path: string): boolean {
  return (
    (Object.values(FORM_PAGE_PATH) as string[]).includes(path) ||
    OFFER_DETAIL_PATH_RE.test(path)
  );
}

/** Kształt numeru oferty — W PARZE z `OfferSchema.number`
 *  (src/lib/offers/schema.ts; ten moduł nie importuje schematów — trafia
 *  do bundla klienta). Jedyna wartość o ofercie, którą przyjmujemy
 *  z formularza; tytuł, lokalizację i adres funkcja bierze z indeksu. */
export const OFFER_NUMBER_RE = /^[A-Z]{1,8}\d{1,12}$/;

// ── Słowniki zgłoszenia nieruchomości ───────────────────────────────────
// Wartości = identyfikatory słownika CRM (te same, które wysyłał
// dotychczasowy formularz) — NIE zmieniać; kolejność i etykiety to sprawa
// interfejsu. Brak wyboru, `0` i wartość spoza słownika są dla walidacji
// tym samym: „nie wybrano".
export const ESTATE_TYPES = [
  { value: "2", label: "Mieszkanie" },
  { value: "1", label: "Dom" },
  { value: "3", label: "Działka" },
  { value: "4", label: "Lokal komercyjny" },
] as const;
export const TRANSACTIONS = [
  { value: "131", label: "Sprzedaż" },
  { value: "132", label: "Wynajem" },
] as const;

const labelOf = (
  dict: readonly { value: string; label: string }[],
  value: string,
): string | undefined => dict.find((d) => d.value === value)?.label;

/** Zgoda na udział w przyszłych rekrutacjach — JEDYNY checkbox formularza
 *  „Praca" (opcjonalny, odznaczony; to nie zgoda marketingowa). Widok
 *  i mail czytają tę stałą.
 *  PLACEHOLDER (U9): brzmienie do weryfikacji razem z polityką. */
export const FUTURE_RECRUITMENT_CONSENT =
  "Chcę, żeby moje zgłoszenie było brane pod uwagę także w przyszłych " +
  "rekrutacjach HETMAN Nieruchomości.";

/** Zgoda marketingowa — JEDNO brzmienie w całym serwisie (widoki i maile
 *  czytają tę stałą). Opcjonalna, domyślnie odznaczona; żaden formularz
 *  nie może od niej uzależniać wysyłki. Brzmienie bez adresu e-mail
 *  (kontrakt antyscrapingowy na statycznym HTML). */
export const MARKETING_CONSENT =
  "Chcę dostawać oferty i informacje handlowe od HETMAN Nieruchomości — " +
  "mailem lub telefonicznie. Zgodę mogę wycofać w każdej chwili.";

// ── Pola ────────────────────────────────────────────────────────────────
/** Surowe pola z multipart/form-data (zawsze stringi; brak = "").
 *  Pole plikowe `cv` jest opisane kluczami `cv:name` i `cv:size` (obie
 *  strony) oraz `cv:sig` (tylko funkcja — sygnatura z początku pliku). */
export type FormRaw = Record<string, string | undefined>;

/** Kontrola pliku CV: nazwa błędnego pola albo opis załącznika. Reguła
 *  żyje w lib/cv-file.ts (`checkCv`) i jest PRZEKAZYWANA do `validateForm`
 *  — formularze bez pola pliku nie niosą jej w bundlu. */
export type CvCheck = (
  raw: FormRaw,
) => { field: "cv" | "cv-type" | "cv-size" } | { cv: PracaData["cv"] };

/** Nazwy pól w odpowiedzi walidacji = wartości `data-f` w markupie.
 *  `contact` = para e-mail / telefon (błąd „nie podano żadnego"). */
export type FieldName =
  | "name"
  | "email"
  | "phone"
  | "contact"
  | "message"
  /** Ukryty numer oferty — nie ma opakowania w markupie; błąd tego pola
   *  kończy się komunikatem błędu wysyłki. */
  | "offer"
  | "type"
  | "transaction"
  | "location"
  | "area"
  | "price"
  | "notes"
  /** Pole pliku CV: brak pliku / zły typ (rozszerzenie, sygnatura, plik
   *  pusty) / plik większy niż limit — trzy zagnieżdżone opakowania. */
  | "cv"
  | "cv-type"
  | "cv-size";

interface PersonData {
  name: string;
  /** "" gdy nie podano. Niepusty trafia do Reply-To. */
  email: string;
  /** "" gdy nie podano; zapisany tak, jak go wpisano (przycięty). */
  phone: string;
}
interface CommonData extends PersonData {
  marketing: boolean;
}
export interface KontaktData extends CommonData {
  form: "kontakt";
  message: string;
}
export interface SprzedajData extends CommonData {
  form: "sprzedaj";
  /** Identyfikatory słownika (`ESTATE_TYPES`, `TRANSACTIONS`). */
  type: string;
  transaction: string;
  /** Pola opcjonalne: "" gdy nie podano. */
  location: string;
  /** Liczba z przecinkiem dziesiętnym, bez jednostki (np. "52,5"). */
  area: string;
  /** Same cyfry (np. "550000"). */
  price: string;
  notes: string;
}
export interface OfertaData extends CommonData {
  form: "oferta";
  /** Numer oferty (wielkimi literami), o kształcie `OFFER_NUMBER_RE`. */
  offer: string;
  message: string;
}
export interface PracaData extends PersonData {
  form: "praca";
  /** Treść zgłoszenia — opcjonalna, "" gdy nie podano. */
  message: string;
  /** Zgoda na przyszłe rekrutacje (formularz nie ma zgody marketingowej). */
  future: boolean;
  cv: {
    /** Nazwa załącznika po oczyszczeniu (`sanitizeCvName`). */
    name: string;
    size: number;
    /** Typ MIME z rozszerzenia (po weryfikacji). */
    mime: string;
  };
}
export type FormSubmission =
  | KontaktData
  | SprzedajData
  | OfertaData
  | PracaData;

export type ValidationResult =
  | { ok: true; data: FormSubmission }
  | { ok: false; fields: FieldName[] };

/**
 * Pułapka na boty: honeypot `firma` niepusty LUB `elapsed` < MIN_FILL_MS.
 * Brak/niesparsowalny `elapsed` = POST z pominięciem naszego JS = bot.
 */
export function isBotTrap(raw: { firma?: string; elapsed?: string }): boolean {
  if ((raw.firma ?? "") !== "") return true;
  const elapsed = Number(raw.elapsed === "" ? NaN : raw.elapsed);
  return !Number.isFinite(elapsed) || elapsed < MIN_FILL_MS;
}

/** Numer do postaci porównywalnej z PHONE_RE: bez spacji, kropek,
 *  myślników (także półpauz), nawiasów i ukośników. */
function normalizePhone(value: string): string {
  return value.replace(/[\s.\-–—()/]/g, "");
}

export function isValidEmail(value: string): boolean {
  return value.length <= EMAIL_MAX && EMAIL_RE.test(value);
}

export function isValidPhone(value: string): boolean {
  return PHONE_RE.test(normalizePhone(value));
}

/** Powierzchnia: sama liczba (spacje pomijane), opcjonalna część
 *  dziesiętna po przecinku albo kropce. Zwraca zapis z przecinkiem albo
 *  `null`, gdy to nie liczba. */
export function parseArea(value: string): string | null {
  const v = value.replace(/[\s\u00a0]/g, "");
  if (!/^\d{1,6}([.,]\d{1,2})?$/.test(v)) return null;
  return v.replace(".", ",");
}

/** Cena: same cyfry; spacje i kropki jako separatory tysięcy są
 *  dozwolone. Zwraca same cyfry albo `null`. */
export function parsePrice(value: string): string | null {
  const v = value.trim();
  if (!/^\d{1,3}([ \u00a0.]\d{3})+$|^\d{1,12}$/.test(v)) return null;
  return v.replace(/\D/g, "");
}

/** Do pól jednoliniowych i tematu: jedna linia. */
export function stripNewlines(s: string): string {
  return s.replace(/\s*[\r\n]+\s*/g, " ").trim();
}

const text = (raw: FormRaw, key: string): string => (raw[key] ?? "").trim();

/**
 * Walidacja zgłoszenia. Pola błędne wracają w kolejności, w jakiej stoją
 * w formularzu. Pola opcjonalne zgłoszenia nieruchomości nigdy nie
 * odrzucają pustej wartości; lokalizacja i uwagi są przycinane, nie
 * odrzucane (śmieciowy payload nie rozepcha maila). Zgłoszenie do pracy
 * wymaga `checkCv` (kontrola pliku) — błąd pliku stoi na końcu listy.
 */
export function validateForm(
  kind: ActiveFormKind,
  raw: FormRaw,
  checkCv?: CvCheck,
): ValidationResult {
  const fields: FieldName[] = [];

  const offer = text(raw, "offer").toUpperCase();
  if (kind === "oferta" && !OFFER_NUMBER_RE.test(offer)) fields.push("offer");

  const type = text(raw, "type");
  const transaction = text(raw, "transaction");
  if (kind === "sprzedaj") {
    if (!labelOf(ESTATE_TYPES, type)) fields.push("type");
    if (!labelOf(TRANSACTIONS, transaction)) fields.push("transaction");
  }

  const name = stripNewlines(text(raw, "name"));
  if (name.length === 0 || name.length > NAME_MAX) fields.push("name");

  // Dwa osobne pola, wymagane co najmniej jedno. Pole WYPEŁNIONE błędnie
  // jest błędem także wtedy, gdy drugie jest poprawne — ktoś chciał je
  // podać, więc literówka nie może przejść po cichu.
  const email = text(raw, "email");
  const phone = text(raw, "phone").slice(0, PHONE_MAX);
  if (email !== "" && !isValidEmail(email)) fields.push("email");
  if (phone !== "" && !isValidPhone(phone)) fields.push("phone");
  if (email === "" && phone === "") fields.push("contact");

  const marketing = text(raw, "marketing") !== "";

  if (kind === "praca") {
    // O pliku rozstrzyga `checkCv` (lib/cv-file.ts) — ta sama funkcja
    // w przeglądarce i w funkcji; bez niej zgłoszenia nie da się przyjąć.
    const file = checkCv ? checkCv(raw) : { field: "cv" as const };
    if ("field" in file) return { ok: false, fields: [...fields, file.field] };
    if (fields.length > 0) return { ok: false, fields };
    return {
      ok: true,
      data: {
        form: "praca",
        name,
        email,
        phone,
        message: text(raw, "message").slice(0, MESSAGE_MAX),
        future: text(raw, "future") !== "",
        cv: file.cv,
      },
    };
  }

  if (kind === "kontakt" || kind === "oferta") {
    const message = text(raw, "message");
    if (message.length === 0 || message.length > MESSAGE_MAX) {
      fields.push("message");
    }
    if (fields.length > 0) return { ok: false, fields };
    const common = { name, email, phone, marketing, message };
    return {
      ok: true,
      data:
        kind === "oferta"
          ? { form: "oferta", offer, ...common }
          : { form: "kontakt", ...common },
    };
  }

  const areaRaw = text(raw, "area");
  const area = areaRaw === "" ? "" : parseArea(areaRaw);
  if (area === null) fields.push("area");
  const priceRaw = text(raw, "price");
  const price = priceRaw === "" ? "" : parsePrice(priceRaw);
  if (price === null) fields.push("price");

  if (fields.length > 0) return { ok: false, fields };
  return {
    ok: true,
    data: {
      form: "sprzedaj",
      name,
      email,
      phone,
      marketing,
      type,
      transaction,
      location: stripNewlines(text(raw, "location")).slice(0, LOCATION_MAX),
      area: area ?? "",
      price: price ?? "",
      notes: text(raw, "notes").slice(0, MESSAGE_MAX),
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

/** Cena do maila: grupy po trzy cyfry + waluta („500 000 zł"). */
export function formatMailPrice(digits: string): string {
  return `${digits.replace(/\B(?=(\d{3})+(?!\d))/g, " ")} zł`;
}

export interface EmailContent {
  subject: string;
  html: string;
  text: string;
}

/** Dane oferty do maila — WYŁĄCZNIE z indeksu ofert czytanego przez
 *  funkcję, nigdy z pól formularza. */
export interface MailOffer {
  title: string;
  /** Lokalizacja w jednej linii (miejscowość, dzielnica, ulica). */
  place: string;
  /** Ścieżka detalu (`/oferty/…/`). */
  path: string;
}

export interface MailContext {
  /** Data i godzina wysłania, już sformatowana (Europe/Warsaw). */
  sentAt: string;
  /** Początek adresu z HOSTA ŻĄDANIA (`https://host`) — na podglądzie
   *  linki prowadzą na podgląd, po przełączeniu na domenę główną. */
  origin: string;
  /** Zapytanie o ofertę: wpis z indeksu albo `null`, gdy numeru w nim nie
   *  ma (oferta zdjęta po otwarciu strony) lub indeksu nie dało się
   *  odczytać — zgłoszenie i tak wychodzi, z dopiskiem zamiast tytułu. */
  offer?: MailOffer | null;
}

const NOT_GIVEN = "nie podano";
/** Dopisek w mailu, gdy numeru oferty nie ma w bieżącym indeksie. */
export const OFFER_NOT_IN_INDEX =
  "Oferty o tym numerze nie ma w bieżącym indeksie strony — mogła zostać zdjęta po otwarciu strony przez klienta.";
/** Kolor nagłówka i etykiet w mailu (kolor marki z logo). */
const MAIL_COLOR = "#083870";

interface MailRow {
  label: string;
  value: string;
}

const SUBJECT_CONTEXT = {
  kontakt: "kontakt",
  sprzedaj: "zgłoszenie nieruchomości",
} as const;
const HEADING = {
  kontakt: "Kontakt ze strony",
  sprzedaj: "Zgłoszona oferta",
} as const;

/**
 * Powiadomienie do skrzynki biura — układ jak w mailach dotychczasowej
 * strony (nagłówek, etykieta, wartość, „Dane kontaktowe:", zgoda), żeby
 * odbiorca nie musiał uczyć się nowego formatu. Temat jest stały per
 * formularz (żadnych danych klienta w temacie); zapytanie o ofertę niesie
 * w temacie numer — zweryfikowany co do kształtu, nie dowolny tekst.
 */
export function buildMail(
  data: FormSubmission,
  ctx: MailContext,
): EmailContent {
  if (data.form === "praca") return buildJobMail(data, ctx);
  const isOffer = data.form === "oferta";
  const subject = isOffer
    ? `${SUBJECT_PREFIX_AGENT} — oferta ${data.offer}`
    : `${SUBJECT_PREFIX} — ${SUBJECT_CONTEXT[data.form]}`;
  const heading = isOffer
    ? `Zapytanie wysłane ze strony www do oferty nr ${data.offer}`
    : HEADING[data.form];

  // Zapytanie o ofertę: adres, tytuł i lokalizacja z INDEKSU.
  const offer = isOffer ? (ctx.offer ?? null) : null;
  const offerUrl = offer ? `${ctx.origin}${offer.path}` : "";
  const offerLine = offer ? `${offer.title} · ${offer.place}` : "";

  const rows: MailRow[] = [];
  if (data.form === "sprzedaj") {
    rows.push(
      {
        label: "Typ transakcji",
        value: labelOf(TRANSACTIONS, data.transaction) ?? "",
      },
      {
        label: "Typ nieruchomości",
        value: labelOf(ESTATE_TYPES, data.type) ?? "",
      },
    );
    if (data.notes) rows.push({ label: "Treść wiadomości", value: data.notes });
    if (data.location) {
      rows.push({ label: "Lokalizacja nieruchomości", value: data.location });
    }
    if (data.area)
      rows.push({ label: "Powierzchnia", value: `${data.area} m²` });
    if (data.price) {
      rows.push({ label: "Cena", value: formatMailPrice(data.price) });
    }
  } else {
    rows.push({
      label: isOffer ? "Treść wiadomości" : "Treść",
      value: data.message,
    });
  }

  const contact: MailRow[] = [
    { label: "Imię i nazwisko", value: data.name },
    { label: "Adres e-mail", value: data.email || NOT_GIVEN },
    { label: "Numer telefonu", value: data.phone || NOT_GIVEN },
  ];
  const consent = `Zgoda na oferty i informacje handlowe: ${
    data.marketing ? "Tak" : "Nie"
  }`;
  const page = isOffer
    ? offerUrl || `${ctx.origin}${OFFERS_PATH}`
    : `${ctx.origin}${FORM_PAGE_PATH[data.form]}`;
  const replyNote = data.email
    ? "Wiadomość wygenerowana automatycznie; odpowiadając, piszesz do klienta."
    : "Wiadomość wygenerowana automatycznie. Klient nie podał adresu e-mail — skontaktuj się telefonicznie.";

  const textRow = (r: MailRow) => `${r.label}:\n${r.value}\n`;
  const text = [
    heading.toUpperCase(),
    ...(isOffer
      ? [offer ? `${offerUrl}\n${offerLine}` : OFFER_NOT_IN_INDEX]
      : []),
    "",
    ...rows.map(textRow),
    "Dane kontaktowe:",
    "",
    ...contact.map(textRow),
    consent,
    `Brzmienie zgody: „${MARKETING_CONSENT}"`,
    "",
    "--",
    `Wysłano: ${ctx.sentAt}`,
    `Strona: ${page}`,
    replyNote,
  ].join("\n");

  const label = (s: string) =>
    `<p style="margin:16px 0 4px;color:${MAIL_COLOR};font-weight:bold">${escapeHtml(s)}:</p>`;
  const value = (s: string) =>
    `<div style="white-space:pre-wrap">${escapeHtml(s)}</div>`;
  const htmlRow = (r: MailRow) => label(r.label) + value(r.value);
  // numer w nagłówku jest linkiem do oferty (jak w mailach dotychczasowej
  // strony); wartości z indeksu escapowane tak samo jak dane klienta
  const headingHtml =
    isOffer && offer
      ? `${escapeHtml(heading.slice(0, -data.offer.length))}<a href="${escapeHtml(offerUrl)}" style="color:${MAIL_COLOR}">${escapeHtml(data.offer)}</a>`
      : escapeHtml(heading);
  const underHeading = !isOffer
    ? []
    : [
        `<p style="margin:0 0 8px;text-align:center${offer ? ";font-weight:bold" : ""}">${escapeHtml(offer ? offerLine : OFFER_NOT_IN_INDEX)}</p>`,
      ];
  const html = [
    `<div style="font-family:system-ui,-apple-system,'Segoe UI',Arial,sans-serif;font-size:15px;line-height:1.5;color:#1c1b19">`,
    `<h2 style="margin:0 0 8px;color:${MAIL_COLOR};text-align:center;text-transform:uppercase;font-size:18px">${headingHtml}</h2>`,
    ...underHeading,
    ...rows.map(htmlRow),
    `<h3 style="margin:24px 0 0;color:${MAIL_COLOR};font-size:16px">Dane kontaktowe:</h3>`,
    ...contact.map(htmlRow),
    `<p style="margin:24px 0 4px"><strong>${escapeHtml(consent)}</strong></p>`,
    `<p style="margin:0;font-size:11px;color:#6b6864">${escapeHtml(MARKETING_CONSENT)}</p>`,
    `<hr style="margin:24px 0 12px;border:0;border-top:1px solid #cccccc">`,
    `<p style="margin:0;font-size:12px;color:#6b6864">Wysłano: ${escapeHtml(ctx.sentAt)}<br>Strona: ${escapeHtml(page)}<br>${escapeHtml(replyNote)}</p>`,
    `</div>`,
  ].join("\n");

  return { subject, html, text };
}

/**
 * Mail C — zgłoszenie do pracy. Etykiety w kolejności maila dotychczasowej
 * strony (kandydat, e-mail, telefon, treść), linia „CV" z nazwą i rozmiarem
 * załącznika, zgoda na przyszłe rekrutacje. BEZ linii zgody marketingowej
 * — formularz jej nie ma. Sam plik dokleja funkcja jako załącznik.
 */
function buildJobMail(data: PracaData, ctx: MailContext): EmailContent {
  const subject = `${SUBJECT_PREFIX} — zgłoszenie do pracy`;
  const heading = "Zgłoszenie oferty pracy";
  const rows: MailRow[] = [
    { label: "Imię i nazwisko kandydata", value: data.name },
    { label: "E-mail kandydata", value: data.email || NOT_GIVEN },
    { label: "Numer telefonu", value: data.phone || NOT_GIVEN },
    ...(data.message
      ? [{ label: "Treść zgłoszenia", value: data.message }]
      : []),
    {
      label: "CV",
      value: `${data.cv.name} (${formatFileSize(data.cv.size)})`,
    },
  ];
  const consent = `Zgoda na przyszłe rekrutacje: ${data.future ? "Tak" : "Nie"}`;
  const page = `${ctx.origin}${FORM_PAGE_PATH.praca}`;
  const replyNote = data.email
    ? "Wiadomość wygenerowana automatycznie; odpowiadając, piszesz do kandydata."
    : "Wiadomość wygenerowana automatycznie. Kandydat nie podał adresu e-mail — skontaktuj się telefonicznie.";

  const text = [
    heading.toUpperCase(),
    "",
    ...rows.map((r) => `${r.label}:\n${r.value}\n`),
    consent,
    `Brzmienie zgody: „${FUTURE_RECRUITMENT_CONSENT}"`,
    "",
    "--",
    `Wysłano: ${ctx.sentAt}`,
    `Strona: ${page}`,
    replyNote,
  ].join("\n");

  const html = [
    `<div style="font-family:system-ui,-apple-system,'Segoe UI',Arial,sans-serif;font-size:15px;line-height:1.5;color:#1c1b19">`,
    `<h2 style="margin:0 0 8px;color:${MAIL_COLOR};text-align:center;text-transform:uppercase;font-size:18px">${escapeHtml(heading)}</h2>`,
    ...rows.map(
      (r) =>
        `<p style="margin:16px 0 4px;color:${MAIL_COLOR};font-weight:bold">${escapeHtml(r.label)}:</p>` +
        `<div style="white-space:pre-wrap">${escapeHtml(r.value)}</div>`,
    ),
    `<p style="margin:24px 0 4px"><strong>${escapeHtml(consent)}</strong></p>`,
    `<p style="margin:0;font-size:11px;color:#6b6864">${escapeHtml(FUTURE_RECRUITMENT_CONSENT)}</p>`,
    `<hr style="margin:24px 0 12px;border:0;border-top:1px solid #cccccc">`,
    `<p style="margin:0;font-size:12px;color:#6b6864">Wysłano: ${escapeHtml(ctx.sentAt)}<br>Strona: ${escapeHtml(page)}<br>${escapeHtml(replyNote)}</p>`,
    `</div>`,
  ].join("\n");

  return { subject, html, text };
}
