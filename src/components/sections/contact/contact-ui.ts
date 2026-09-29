// Formularz — logika ZAWSZE aktywna (niezależna od
// prefers-reduced-motion): walidacja, pułapki antyspamowe, token Turnstile,
// wysyłka i ekran potwierdzenia. Ruch widoku obsługuje WSPÓLNY moduł
// sections/content-motion.ts za bramką js-motion.
// STAN Etapu 0: mechanika odziedziczona z szablonu, bez widoku, który by
// ją osadzał; pola i cztery warianty formularza — Etap 5.
//
// Reguły walidacji (classifyContact, MESSAGE_MIN, MIN_FILL_MS) importowane
// z src/lib/contact-form.ts — jedno źródło prawdy dla klienta i serwera:
// ta sama funkcja rozstrzyga po obu stronach, więc walidacje nie mogą się
// rozjechać.
// Etykiety przycisku przychodzą przez data-atrybuty z markupu widoku.
//
// Telefon i e-mail w kaflach kontaktowych składa fillContactSlots
// (src/lib/contact-details.ts, wołany przez skrypt chrome'u w Navbarze) —
// ten moduł nie zna fragmentów numeru ani adresu.
import { classifyContact, MESSAGE_MIN, MIN_FILL_MS } from "@/lib/contact-form";
import {
  CONTACT_ENDPOINT,
  TURNSTILE_SITE_KEY,
  TURNSTILE_SRC,
  TURNSTILE_TIMEOUT_MS,
} from "./contact-config";

/* ── Turnstile: skrypt ładowany leniwie (pierwszy focus w formularzu),
   widget renderowany jawnie, egzekucja dopiero przy submit (token żyje
   300 s — render przy wejściu mógłby wygasnąć, zanim ktoś dopisze
   wiadomość). Brak skryptu/timeout → token "" → serwer odpowie 403 →
   komunikat .kt-srv z fallbackiem „zadzwoń". ── */
interface TurnstileApi {
  render(el: HTMLElement, opts: Record<string, unknown>): string;
  execute(el: HTMLElement): void;
  reset(id?: string): void;
}
declare global {
  interface Window {
    turnstile?: TurnstileApi;
  }
}

let turnstileLoad: Promise<void> | null = null;
function loadTurnstile(): Promise<void> {
  if (window.turnstile) return Promise.resolve();
  turnstileLoad ??= new Promise((resolve, reject) => {
    const s = document.createElement("script");
    s.src = TURNSTILE_SRC;
    s.async = true;
    s.onload = () => resolve();
    s.onerror = () => {
      turnstileLoad = null;
      reject(new Error("turnstile: skrypt nie wstał"));
    };
    document.head.appendChild(s);
  });
  return turnstileLoad;
}

export function initContactUi(section: HTMLElement): void {
  const frame = section.querySelector<HTMLElement>(".kt-frame");
  const form = section.querySelector<HTMLFormElement>(".kt-form");
  if (!frame || !form) return;

  const q = <T extends HTMLElement>(s: string) => form.querySelector<T>(s);
  const sendBtn = q<HTMLButtonElement>(".kt-send");
  const sendLb = sendBtn?.querySelector<HTMLElement>(".lb");
  const srvErr = q<HTMLElement>(".kt-srv");
  const tsBox = q<HTMLElement>(".kt-ts");
  const fName = q<HTMLElement>('[data-f="name"]');
  const fContact = q<HTMLElement>('[data-f="contact"]');
  const fMsg = q<HTMLElement>('[data-f="msg"]');
  const iName = q<HTMLInputElement>("#kt-name");
  const iContact = q<HTMLInputElement>("#kt-contact");
  const iMsg = q<HTMLTextAreaElement>("#kt-msg");
  const hp = q<HTMLInputElement>('[name="firma"]');
  if (
    !sendBtn ||
    !sendLb ||
    !srvErr ||
    !tsBox ||
    !fName ||
    !fContact ||
    !fMsg ||
    !iName ||
    !iContact ||
    !iMsg ||
    !hp
  ) {
    return;
  }

  /* honeypot jest readonly (autofill Chrome'a nie wypełnia readonly —
     naprawa incydentu z preview, patrz komentarz przy polu `firma`
     w src/pages/kontakt.astro); focus zdejmuje blokadę, żeby bot piszący
     „po ludzku" nadal się łapał */
  hp.addEventListener("focus", () => hp.removeAttribute("readonly"), {
    once: true,
  });

  let t0 = Date.now();
  let busy = false;
  let widgetId: string | null = null;
  let tokenResolve: ((token: string) => void) | null = null;

  /* rozgrzewka: skrypt Turnstile dociąga się, gdy ktoś zaczyna pisać */
  form.addEventListener("focusin", () => void loadTurnstile().catch(() => {}), {
    once: true,
  });

  function renderWidget(): void {
    if (!window.turnstile || widgetId !== null || !tsBox) return;
    widgetId = window.turnstile.render(tsBox, {
      sitekey: TURNSTILE_SITE_KEY,
      appearance: "interaction-only",
      execution: "execute",
      callback: (token: string) => {
        tokenResolve?.(token);
        tokenResolve = null;
      },
      "error-callback": () => {
        tokenResolve?.("");
        tokenResolve = null;
      },
    });
  }

  async function getToken(): Promise<string> {
    try {
      await loadTurnstile();
      renderWidget();
      if (widgetId === null || !tsBox) return "";
    } catch {
      return "";
    }
    return new Promise((resolve) => {
      const timer = setTimeout(() => {
        tokenResolve = null;
        resolve("");
      }, TURNSTILE_TIMEOUT_MS);
      tokenResolve = (token) => {
        clearTimeout(timer);
        resolve(token);
      };
      try {
        window.turnstile?.execute(tsBox as HTMLElement);
      } catch {
        clearTimeout(timer);
        tokenResolve = null;
        resolve("");
      }
    });
  }

  function resetTurnstile(): void {
    if (widgetId !== null) {
      try {
        window.turnstile?.reset(widgetId);
      } catch {
        /* widget mógł zniknąć — nieistotne */
      }
    }
  }

  function setErr(wrap: HTMLElement, on: boolean): void {
    wrap.classList.toggle("err", on);
    const input = wrap.querySelector("input, textarea");
    input?.setAttribute("aria-invalid", on ? "true" : "false");
  }
  for (const wrap of [fName, fContact, fMsg]) {
    wrap
      .querySelector("input, textarea")
      ?.addEventListener("input", () => setErr(wrap, false));
  }

  function setBusy(on: boolean): void {
    busy = on;
    sendBtn!.disabled = on;
    form!.setAttribute("aria-busy", on ? "true" : "false");
    sendLb!.textContent = on
      ? (sendBtn!.dataset.sending ?? "…")
      : (sendBtn!.dataset.send ?? "");
  }

  function showDone(): void {
    frame!.classList.add("sent");
    frame!
      .querySelector<HTMLElement>(".kt-done-h")
      ?.focus({ preventScroll: true });
  }

  async function handleSubmit(): Promise<void> {
    if (busy) return;

    const okName = iName!.value.trim().length > 0;
    // Poprawny telefon ALBO poprawny e-mail — rozstrzyga ta sama
    // funkcja, którą woła walidacja serwerowa.
    const okContact = classifyContact(iContact!.value).kind !== "invalid";
    const okMsg = iMsg!.value.trim().length >= MESSAGE_MIN;
    setErr(fName!, !okName);
    setErr(fContact!, !okContact);
    setErr(fMsg!, !okMsg);
    if (!okName || !okContact || !okMsg) {
      form!.querySelector<HTMLElement>(".err input, .err textarea")?.focus();
      return;
    }

    /* pułapki po stronie klienta: honeypot lub submit < MIN_FILL_MS →
       udawany sukces bez requestu (serwer i tak powtarza test) */
    if (hp!.value !== "" || Date.now() - t0 < MIN_FILL_MS) {
      showDone();
      return;
    }

    srvErr!.hidden = true;
    setBusy(true);
    try {
      const token = await getToken();
      const fd = new FormData(form!);
      fd.append("elapsed", String(Date.now() - t0));
      fd.append("lang", "pl");
      fd.append("cf-turnstile-response", token);
      const res = await fetch(CONTACT_ENDPOINT, {
        method: "POST",
        body: fd,
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      showDone();
    } catch {
      srvErr!.hidden = false;
    } finally {
      setBusy(false);
      resetTurnstile();
    }
  }

  form.addEventListener("submit", (e) => {
    e.preventDefault();
    void handleSubmit();
  });

  /* „Wyślij kolejną": reset formularza i zegara antyspamu */
  frame
    .querySelector<HTMLButtonElement>(".kt-again")
    ?.addEventListener("click", () => {
      form.reset();
      for (const wrap of [fName!, fContact!, fMsg!]) setErr(wrap, false);
      srvErr!.hidden = true;
      frame.classList.remove("sent");
      t0 = Date.now();
      iName!.focus({ preventScroll: true });
    });
}
