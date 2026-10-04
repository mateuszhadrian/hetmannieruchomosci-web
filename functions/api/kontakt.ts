// Pages Function: POST /api/kontakt — JEDEN endpoint wszystkich formularzy
// serwisu; rodzaj niesie pole `form` (`kontakt`, `sprzedaj`, `oferta`,
// `praca`).
// Sekrety (RESEND_API_KEY, TURNSTILE_SECRET_KEY) żyją w ustawieniach
// projektu Pages; binding KONTAKT_KV jest OPCJONALNY (dzienny bezpiecznik
// limitu Resend); KONTAKT_TO jest OPCJONALNE (nadpisuje adresata — np.
// w środowisku Preview, żeby próbne wysyłki z podglądów PR-ów nie szły do
// biura).
// Strona wysyła jedną wiadomość, do biura; nic poza mailem nie jest
// utrwalane, a IP i przeglądarka klienta nie trafiają do treści.
// Zapytanie o ofertę: z formularza przychodzi WYŁĄCZNIE numer oferty —
// tytuł, lokalizację i adres funkcja czyta sama z indeksu ofert
// (`/oferty/index.json`, plik statyczny tego samego wdrożenia, przez
// binding ASSETS).
// Zgłoszenie do pracy: CV jedzie jako załącznik maila i żyje WYŁĄCZNIE
// w pamięci żądania (nic nie jest zapisywane, logi nie niosą nazwy pliku
// ani danych kandydata). Reguły czasu procesora: odrzucenie po nagłówku
// przed czytaniem treści, kodowanie pliku na samym końcu i tylko natywnie,
// treść żądania do usługi pocztowej bez serializacji załącznika.
import {
  buildMail,
  CONTACT_FROM_NOTIFY,
  CONTACT_TO,
  CV_REQUEST_MAX_BYTES,
  FORM_MAX_BYTES,
  isActiveFormKind,
  isBotTrap,
  isFormPagePath,
  isValidEmail,
  validateForm,
  type FormRaw,
  type MailOffer,
} from "../../src/lib/contact-form";
import {
  checkCv,
  CV_SIGNATURE_BYTES,
  detectCvSignature,
} from "../../src/lib/cv-file";
import {
  pickBase64Encoder,
  withAttachment,
} from "../../src/lib/mail-attachment";
import { formatLocation } from "../../src/lib/offers/format";
import { CONTACT_PATH, OFFERS_INDEX_PATH } from "../../src/lib/routes";

// Minimalne typy zamiast @cloudflare/workers-types — używamy wyłącznie
// standardowych API (Request/Response/FormData/fetch), które pokrywa lib DOM.
interface KVNamespaceLike {
  get(key: string): Promise<string | null>;
  put(
    key: string,
    value: string,
    options?: { expirationTtl?: number },
  ): Promise<void>;
}

/** Binding plików statycznych wdrożenia (Pages daje go każdej funkcji). */
interface AssetsLike {
  fetch(input: string | URL | Request): Promise<Response>;
}

interface Env {
  RESEND_API_KEY?: string;
  TURNSTILE_SECRET_KEY?: string;
  KONTAKT_KV?: KVNamespaceLike;
  KONTAKT_TO?: string;
  ASSETS?: AssetsLike;
}

interface PagesContext {
  request: Request;
  env: Env;
}

// 80 < 100/dzień (limit Resend), z zapasem na retry.
const DAILY_LIMIT = 80;

function json(status: number, body: Record<string, unknown>): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

export const onRequest = async (ctx: PagesContext): Promise<Response> => {
  if (ctx.request.method !== "POST") {
    return new Response("Method Not Allowed", {
      status: 405,
      headers: { allow: "POST" },
    });
  }
  return handlePost(ctx);
};

/** Wysyłka BEZ JS (zwykły submit formularza): nie ma tokenu Turnstile ani
 *  czasu wypełnienia, więc zgłoszenia nie da się przyjąć. Zamiast surowego
 *  JSON-u — powrót na stronę formularza (tam `<noscript>` wyjaśnia, że
 *  wysyłka wymaga JavaScriptu). Cel bierzemy z Referera tylko wtedy, gdy
 *  to nasza strona formularza. */
function redirectBack(request: Request): Response {
  const origin = new URL(request.url).origin;
  let path: string = CONTACT_PATH;
  try {
    const ref = new URL(request.headers.get("referer") ?? "");
    if (ref.origin === origin && isFormPagePath(ref.pathname)) {
      path = ref.pathname;
    }
  } catch {
    /* brak albo zły Referer — strona kontaktu */
  }
  return new Response(null, {
    status: 303,
    headers: { location: `${origin}${path}#formularz` },
  });
}

async function handlePost({ request, env }: PagesContext): Promise<Response> {
  // Moduł kliencki zawsze prosi o JSON; brak tej deklaracji = submit bez JS.
  if (!(request.headers.get("accept") ?? "").includes("application/json")) {
    return redirectBack(request);
  }

  // Odrzucenie po nagłówku PRZED czytaniem treści — inaczej każdy mógłby
  // spalić czas funkcji, wysyłając duży plik. Żądanie BEZ deklaracji
  // rozmiaru nie jest czytane wcale (przeglądarka wysyłająca formularz
  // podaje ją zawsze).
  const declared = request.headers.get("content-length");
  const length = declared === null || declared === "" ? NaN : Number(declared);
  if (!Number.isInteger(length) || length < 0) {
    return json(411, { ok: false, error: "length-required" });
  }
  // Próg górny = limit CV + narzut pól. Rodzaj formularza siedzi w treści,
  // więc próg formularzy tekstowych sprawdzamy zaraz po jej odczytaniu.
  if (length > CV_REQUEST_MAX_BYTES) {
    return json(413, { ok: false, error: "too-large" });
  }

  let fd: FormData;
  try {
    fd = await request.formData();
  } catch {
    return json(400, { ok: false, error: "bad-form" });
  }
  const raw: FormRaw = {};
  let hasFile = false;
  for (const [key, value] of fd.entries()) {
    if (typeof value === "string") raw[key] = value;
    else hasFile = true;
  }

  const kind = raw.form ?? "";
  if (!isActiveFormKind(kind)) return json(400, { ok: false, error: "form" });

  // Formularz tekstowy nie niesie plików i mieści się w swoim progu.
  if (kind !== "praca" && (hasFile || length > FORM_MAX_BYTES)) {
    return json(413, { ok: false, error: "too-large" });
  }

  // Bot-trap: udawany sukces bez wysyłki — bot nie wie, że został odsiany.
  if (isBotTrap(raw)) return json(200, { ok: true });

  // Opis pliku do walidacji składa FUNKCJA (nazwa, rozmiar, sygnatura
  // z pierwszych bajtów) — pola tekstowe o tych nazwach dosłane przez
  // klienta nie mają znaczenia.
  delete raw["cv:name"];
  delete raw["cv:size"];
  delete raw["cv:sig"];
  const cv = kind === "praca" ? fd.get("cv") : null;
  const file = cv !== null && typeof cv !== "string" ? cv : null;
  if (file && file.name !== "") {
    raw["cv:name"] = file.name;
    raw["cv:size"] = String(file.size);
    raw["cv:sig"] = detectCvSignature(
      new Uint8Array(await file.slice(0, CV_SIGNATURE_BYTES).arrayBuffer()),
    );
  }

  const validated = validateForm(kind, raw, checkCv);
  if (!validated.ok) {
    return json(400, { ok: false, error: "fields", fields: validated.fields });
  }

  if (!env.RESEND_API_KEY || !env.TURNSTILE_SECRET_KEY) {
    console.error("kontakt: brak sekretów w środowisku funkcji");
    return json(503, { ok: false, error: "config" });
  }

  // Załącznik wymaga natywnego kodowania base64; platforma bez niego nie
  // obsłuży TEGO formularza (pozostałe działają).
  const encoder = validated.data.form === "praca" ? pickBase64Encoder() : null;
  if (validated.data.form === "praca" && !encoder) {
    console.error("kontakt: brak natywnego kodowania base64 — załącznik");
    return json(503, { ok: false, error: "encoder" });
  }

  // Turnstile — token jest jednorazowy i żyje 300 s; frontend pobiera
  // świeży przy każdym submicie.
  let turnstile: { success?: boolean };
  try {
    const res = await fetch(
      "https://challenges.cloudflare.com/turnstile/v0/siteverify",
      {
        method: "POST",
        body: new URLSearchParams({
          secret: env.TURNSTILE_SECRET_KEY,
          response: raw["cf-turnstile-response"] ?? "",
          remoteip: request.headers.get("cf-connecting-ip") ?? "",
        }),
      },
    );
    turnstile = await res.json();
  } catch {
    return json(502, { ok: false, error: "turnstile-unreachable" });
  }
  if (!turnstile.success) return json(403, { ok: false, error: "turnstile" });

  // Dzienny bezpiecznik — aktywny tylko gdy projekt ma binding KONTAKT_KV.
  if (env.KONTAKT_KV) {
    const key = `quota:${new Date().toISOString().slice(0, 10)}`;
    const used = Number((await env.KONTAKT_KV.get(key)) ?? "0");
    if (used >= DAILY_LIMIT) return json(503, { ok: false, error: "quota" });
    await env.KONTAKT_KV.put(key, String(used + 1), {
      expirationTtl: 172800,
    });
  }

  const sentAt = new Intl.DateTimeFormat("pl-PL", {
    timeZone: "Europe/Warsaw",
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date());

  // Adres strony w stopce maila z HOSTA ŻĄDANIA: na podglądzie prowadzi na
  // podgląd, po przełączeniu domeny — na domenę główną.
  const origin = new URL(request.url).origin;
  const mail = buildMail(validated.data, {
    sentAt,
    origin,
    // dopiero tutaj — żądanie odsiane wcześniej nie kosztuje odczytu indeksu
    ...(validated.data.form === "oferta"
      ? { offer: await lookupOffer(env, origin, validated.data.offer) }
      : {}),
  });
  const to =
    env.KONTAKT_TO && isValidEmail(env.KONTAKT_TO)
      ? env.KONTAKT_TO
      : CONTACT_TO;
  const message = JSON.stringify({
    from: CONTACT_FROM_NOTIFY,
    to: [to],
    // Reply-To = klient, więc „Odpowiedz" pisze wprost do niego. Gdy podał
    // SAM TELEFON, nagłówka nie ma wcale (Resend odrzuca pusty).
    ...(validated.data.email ? { reply_to: validated.data.email } : {}),
    // Losowy identyfikator — klienci poczty nie sklejają zgłoszeń w wątek.
    headers: { "X-Entity-Ref-ID": crypto.randomUUID() },
    ...mail,
  } satisfies OutgoingEmail);

  // Kodowanie pliku NA KOŃCU — żądanie odsiane wcześniej (pułapka,
  // walidacja, Turnstile, limit) za nie nie płaci. Treść żądania =
  // wiadomość + doklejony fragment z base64, bez serializacji załącznika.
  let body = message;
  if (validated.data.form === "praca" && encoder && file) {
    body = withAttachment(message, {
      filename: validated.data.cv.name,
      contentType: validated.data.cv.mime,
      base64: encoder.encode(new Uint8Array(await file.arrayBuffer())),
    });
    // ścieżka kodowania i rozmiar — bez nazwy pliku i danych kandydata
    console.log(
      `kontakt: załącznik ${validated.data.cv.size} B, base64 przez ${encoder.via}`,
    );
  }

  const sent = await sendEmail(env.RESEND_API_KEY, body);
  if (!sent.ok) {
    console.error(`kontakt: powiadomienie nie wyszło (HTTP ${sent.status})`);
    return json(502, { ok: false, error: "send" });
  }

  return json(200, { ok: true });
}

/**
 * Wpis oferty z indeksu wyszukiwarki. `null`, gdy numeru w nim nie ma
 * (oferta zdjęta po otwarciu strony) albo indeksu nie da się odczytać —
 * zgłoszenie wtedy i tak wychodzi, z dopiskiem zamiast tytułu i linku
 * (zapytanie klienta jest warte więcej niż ścisłość).
 */
async function lookupOffer(
  env: Env,
  origin: string,
  number: string,
): Promise<MailOffer | null> {
  if (!env.ASSETS) {
    console.error("kontakt: brak bindingu ASSETS — oferta bez weryfikacji");
    return null;
  }
  try {
    const res = await env.ASSETS.fetch(`${origin}${OFFERS_INDEX_PATH}`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const index = (await res.json()) as { offers?: unknown };
    const entries = Array.isArray(index.offers) ? index.offers : [];
    const entry = entries.find(
      (e): e is IndexEntryLike =>
        isIndexEntry(e) && e.number.toUpperCase() === number,
    );
    if (!entry) return null;
    return {
      title: entry.title,
      place: formatLocation(entry.location),
      path: entry.path,
    };
  } catch {
    console.error("kontakt: indeks ofert nieczytelny — oferta bez weryfikacji");
    return null;
  }
}

/** Pola wpisu indeksu, z których korzysta mail (kształt:
 *  src/lib/offers/index-entry.ts — tu sprawdzany, nie zakładany). */
interface IndexEntryLike {
  number: string;
  path: string;
  title: string;
  location: {
    city: string;
    district?: string;
    street?: string;
    streetType?: string;
  };
}

function isIndexEntry(value: unknown): value is IndexEntryLike {
  if (typeof value !== "object" || value === null) return false;
  const e = value as Record<string, unknown>;
  const loc = e.location as Record<string, unknown> | null | undefined;
  return (
    typeof e.number === "string" &&
    typeof e.title === "string" &&
    typeof e.path === "string" &&
    e.path.startsWith("/oferty/") &&
    typeof loc === "object" &&
    loc !== null &&
    typeof loc.city === "string"
  );
}

interface OutgoingEmail {
  from: string;
  to: string[];
  reply_to?: string;
  headers: Record<string, string>;
  subject: string;
  html: string;
  text: string;
}

/** `body` = gotowa treść żądania (JSON wiadomości, ewentualnie z doklejonym
 *  załącznikiem). */
async function sendEmail(
  apiKey: string,
  body: string,
): Promise<{ ok: boolean; status: number }> {
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        authorization: `Bearer ${apiKey}`,
        "content-type": "application/json",
      },
      body,
    });
    return { ok: res.ok, status: res.status };
  } catch {
    return { ok: false, status: 0 };
  }
}
