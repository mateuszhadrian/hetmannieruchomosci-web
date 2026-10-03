// Pages Function: POST /api/kontakt — JEDEN endpoint wszystkich formularzy
// serwisu; rodzaj niesie pole `form` (Etap 5A: `kontakt`, `sprzedaj`;
// zapytanie o ofertę i praca dochodzą w 5B).
// Sekrety (RESEND_API_KEY, TURNSTILE_SECRET_KEY) żyją w ustawieniach
// projektu Pages; binding KONTAKT_KV jest OPCJONALNY (dzienny bezpiecznik
// limitu Resend); KONTAKT_TO jest OPCJONALNE (nadpisuje adresata — np.
// w środowisku Preview, żeby próbne wysyłki z podglądów PR-ów nie szły do
// biura).
// Strona wysyła jedną wiadomość, do biura; nic poza mailem nie jest
// utrwalane, a IP i przeglądarka klienta nie trafiają do treści.
import {
  buildMail,
  CONTACT_FROM_NOTIFY,
  CONTACT_TO,
  FORM_MAX_BYTES,
  FORM_PAGE_PATH,
  isActiveFormKind,
  isBotTrap,
  isValidEmail,
  validateForm,
  type FormRaw,
} from "../../src/lib/contact-form";
import { CONTACT_PATH } from "../../src/lib/routes";

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

interface Env {
  RESEND_API_KEY?: string;
  TURNSTILE_SECRET_KEY?: string;
  KONTAKT_KV?: KVNamespaceLike;
  KONTAKT_TO?: string;
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
  let path = CONTACT_PATH;
  try {
    const ref = new URL(request.headers.get("referer") ?? "");
    const known = Object.values(FORM_PAGE_PATH);
    if (ref.origin === origin && known.includes(ref.pathname)) {
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
  // spalić czas funkcji, wysyłając duży plik.
  const length = Number(request.headers.get("content-length") ?? "0");
  if (Number.isFinite(length) && length > FORM_MAX_BYTES) {
    return json(413, { ok: false, error: "too-large" });
  }

  let fd: FormData;
  try {
    fd = await request.formData();
  } catch {
    return json(400, { ok: false, error: "bad-form" });
  }
  const raw: FormRaw = {};
  for (const [key, value] of fd.entries()) {
    if (typeof value === "string") raw[key] = value;
  }

  const kind = raw.form ?? "";
  if (!isActiveFormKind(kind)) return json(400, { ok: false, error: "form" });

  // Bot-trap: udawany sukces bez wysyłki — bot nie wie, że został odsiany.
  if (isBotTrap(raw)) return json(200, { ok: true });

  const validated = validateForm(kind, raw);
  if (!validated.ok) {
    return json(400, { ok: false, error: "fields", fields: validated.fields });
  }

  if (!env.RESEND_API_KEY || !env.TURNSTILE_SECRET_KEY) {
    console.error("kontakt: brak sekretów w środowisku funkcji");
    return json(503, { ok: false, error: "config" });
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
  const mail = buildMail(validated.data, {
    sentAt,
    origin: new URL(request.url).origin,
  });
  const to =
    env.KONTAKT_TO && isValidEmail(env.KONTAKT_TO)
      ? env.KONTAKT_TO
      : CONTACT_TO;
  const sent = await sendEmail(env.RESEND_API_KEY, {
    from: CONTACT_FROM_NOTIFY,
    to: [to],
    // Reply-To = klient, więc „Odpowiedz" pisze wprost do niego. Gdy podał
    // SAM TELEFON, nagłówka nie ma wcale (Resend odrzuca pusty).
    ...(validated.data.email ? { reply_to: validated.data.email } : {}),
    // Losowy identyfikator — klienci poczty nie sklejają zgłoszeń w wątek.
    headers: { "X-Entity-Ref-ID": crypto.randomUUID() },
    ...mail,
  });
  if (!sent.ok) {
    console.error(`kontakt: powiadomienie nie wyszło (HTTP ${sent.status})`);
    return json(502, { ok: false, error: "send" });
  }

  return json(200, { ok: true });
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

async function sendEmail(
  apiKey: string,
  mail: OutgoingEmail,
): Promise<{ ok: boolean; status: number }> {
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        authorization: `Bearer ${apiKey}`,
        "content-type": "application/json",
      },
      body: JSON.stringify(mail),
    });
    return { ok: res.ok, status: res.status };
  } catch {
    return { ok: false, status: 0 };
  }
}
