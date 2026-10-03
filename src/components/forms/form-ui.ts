// Formularze — logika ZAWSZE aktywna (niezależna od
// prefers-reduced-motion): walidacja, pułapki antyspamowe, token Turnstile,
// wysyłka i ekran potwierdzenia. Wspólna dla wszystkich formularzy serwisu
// (Etap 5A, docs/analiza-formularze-a.md); markup daje FormFrame.astro
// i FormField.astro.
//
// Reguły walidacji importowane z src/lib/contact-form.ts — jedno źródło
// prawdy dla klienta i serwera: ta sama funkcja `validateForm` rozstrzyga
// po obu stronach, więc walidacje nie mogą się rozjechać. Serwerowa
// odpowiedź 400 z listą pól zapala te same opakowania `[data-f]`.
//
// ZERO tekstów w tym module: komunikaty błędów siedzą w HTML i pokazuje je
// CSS przy klasie `.err`; etykiety przycisku przychodzą z data-atrybutów.
// Telefon w komunikatach składa fillContactSlots (lib/contact-details,
// wołany przez skrypt chrome'u) — ten moduł nie zna numeru ani adresów.
import {
  isActiveFormKind,
  MIN_FILL_MS,
  validateForm,
  type ActiveFormKind,
  type FieldName,
  type FormRaw,
} from "@/lib/contact-form";
import {
  FORM_SCROLL_GAP_PX,
  FORM_ENDPOINT,
  TURNSTILE_SITE_KEY,
  TURNSTILE_SRC,
  TURNSTILE_TIMEOUT_MS,
} from "./form-config";

/* ── Turnstile: element <script> wstawiany do DOM DOPIERO przy pierwszym
   focusie w formularzu (wcześniej go nie ma — zero żądań do podmiotów
   trzecich przy wejściu), widget renderowany jawnie, egzekucja przy submit
   (token żyje 300 s — render przy wejściu mógłby wygasnąć, zanim ktoś
   dopisze wiadomość). Brak skryptu / pusty klucz / timeout → token "" →
   serwer odpowie odmową → komunikat błędu wysyłki. ── */
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
      s.remove();
      reject(new Error("turnstile: skrypt nie wstał"));
    };
    document.head.appendChild(s);
  });
  return turnstileLoad;
}

/** Dosuwa element w okno: górna krawędź nie wyżej niż dół stałego paska
 *  (+ odstęp), a gdy element jest pod oknem — dolna krawędź w oknie.
 *  Natywny `window.scrollTo`, bez animacji. */
function revealUnderBar(el: HTMLElement): void {
  const hdr = document.querySelector<HTMLElement>("[data-nav]");
  const limit = (hdr?.offsetHeight ?? 0) + FORM_SCROLL_GAP_PX;
  const r = el.getBoundingClientRect();
  if (r.top < limit) {
    window.scrollTo(0, window.scrollY + r.top - limit);
  } else if (r.bottom > window.innerHeight) {
    const down = r.bottom - window.innerHeight + FORM_SCROLL_GAP_PX;
    window.scrollTo(0, window.scrollY + Math.min(down, r.top - limit));
  }
}

type Control = HTMLInputElement | HTMLTextAreaElement;
/** Pola formularza = kontrolki w opakowaniach `[data-f]` (honeypot
 *  i checkbox zgody stoją poza nimi). */
const CONTROLS = "[data-f] input, [data-f] textarea";

function initForm(frame: HTMLElement): void {
  const form = frame.querySelector<HTMLFormElement>("form[data-form]");
  const kindAttr = form?.dataset.form ?? "";
  if (!form || !isActiveFormKind(kindAttr)) return;
  const kind: ActiveFormKind = kindAttr;

  const sendBtn = form.querySelector<HTMLButtonElement>("[data-form-submit]");
  const sendLb = sendBtn?.querySelector<HTMLElement>("[data-label]");
  const srvErr = form.querySelector<HTMLElement>("[data-form-error]");
  const tsBox = form.querySelector<HTMLElement>("[data-form-ts]");
  const hp = form.querySelector<HTMLInputElement>('[name="firma"]');
  const done = frame.querySelector<HTMLElement>("[data-form-done]");
  if (!sendBtn || !sendLb || !srvErr || !tsBox || !hp || !done) return;

  // Komunikaty błędów daje HTML + CSS; dymki przeglądarki zostają dla
  // wersji bez JS (atrybuty `required` w markupie).
  form.noValidate = true;

  /* honeypot jest readonly (autofill przeglądarki nie wypełnia pól
     readonly); focus zdejmuje blokadę, żeby bot piszący „po ludzku" nadal
     się łapał */
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
    if (!window.turnstile || widgetId !== null) return;
    widgetId = window.turnstile.render(tsBox!, {
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
      if (widgetId === null) return "";
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
        window.turnstile?.execute(tsBox!);
      } catch {
        clearTimeout(timer);
        tokenResolve = null;
        resolve("");
      }
    });
  }

  function resetTurnstile(): void {
    if (widgetId === null) return;
    try {
      window.turnstile?.reset(widgetId);
    } catch {
      /* widget mógł zniknąć — nieistotne */
    }
  }

  // ── błędy pól ──
  const wraps = () =>
    Array.from(form!.querySelectorAll<HTMLElement>("[data-f]"));

  /** `aria-describedby` = podpowiedź (stała, z `data-desc`) + komunikaty
   *  AKTYWNYCH błędów opakowań, w których siedzi pole. Komunikat ukryty
   *  przez CSS i tak byłby czytany jako opis, gdyby był podpięty na stałe. */
  function syncControl(control: Control): void {
    const ids = (control.dataset.desc ?? "").split(" ").filter(Boolean);
    let invalid = false;
    for (
      let wrap = control.closest<HTMLElement>("[data-f]");
      wrap;
      wrap = wrap.parentElement?.closest<HTMLElement>("[data-f]") ?? null
    ) {
      if (!wrap.classList.contains("err")) continue;
      invalid = true;
      const msg = wrap.querySelector<HTMLElement>(":scope > [data-msg]");
      if (msg?.id) ids.push(msg.id);
    }
    if (ids.length) control.setAttribute("aria-describedby", ids.join(" "));
    else control.removeAttribute("aria-describedby");
    control.setAttribute("aria-invalid", invalid ? "true" : "false");
  }

  function setErrors(fields: readonly FieldName[]): void {
    for (const wrap of wraps()) {
      wrap.classList.toggle(
        "err",
        fields.includes(wrap.dataset.f as FieldName),
      );
    }
    form!.querySelectorAll<Control>(CONTROLS).forEach(syncControl);
  }

  function focusFirstError(): void {
    const first = form!.querySelector<HTMLElement>(".err");
    const control = first?.querySelector<Control>(CONTROLS);
    if (!control) return;
    // pole w zwiniętym bloku opcjonalnym — najpierw go otwieramy
    const details = control.closest("details");
    if (details) details.open = true;
    // Przewijanie robimy SAMI: przeglądarki różnie dosuwają pole przy
    // focus() pod stałym paskiem (WebKit na Linuksie zostawiał je pod
    // paskiem mimo scroll-margin) — a pole zasłonięte paskiem to błąd,
    // którego użytkownik nie widzi.
    control.focus({ preventScroll: true });
    revealUnderBar(first ?? control);
  }

  // pisanie w polu gasi jego błąd (i błąd pary, do której należy)
  const clearFor = (e: Event) => {
    const target = e.target as Element | null;
    let touched = false;
    for (
      let wrap = target?.closest<HTMLElement>("[data-f]") ?? null;
      wrap;
      wrap = wrap.parentElement?.closest<HTMLElement>("[data-f]") ?? null
    ) {
      if (wrap.classList.contains("err")) {
        wrap.classList.remove("err");
        touched = true;
      }
    }
    if (touched) form!.querySelectorAll<Control>(CONTROLS).forEach(syncControl);
  };
  form.addEventListener("input", clearFor);
  form.addEventListener("change", clearFor);

  function setBusy(on: boolean): void {
    busy = on;
    sendBtn!.disabled = on;
    form!.setAttribute("aria-busy", on ? "true" : "false");
    sendLb!.textContent = on
      ? (sendBtn!.dataset.sending ?? "…")
      : (sendBtn!.dataset.send ?? "");
  }

  function showDone(): void {
    form!.hidden = true;
    done!.hidden = false;
    frame.dataset.state = "sent";
    done!
      .querySelector<HTMLElement>("[data-done-h]")
      ?.focus({ preventScroll: true });
    // potwierdzenie jest niższe od formularza — dosuwamy ramkę pod pasek,
    // jeśli jej górna krawędź została nad oknem
    revealUnderBar(frame);
  }

  function readRaw(): FormRaw {
    const raw: FormRaw = {};
    for (const [key, value] of new FormData(form!).entries()) {
      if (typeof value === "string") raw[key] = value;
    }
    return raw;
  }

  async function handleSubmit(): Promise<void> {
    if (busy) return;

    const result = validateForm(kind, readRaw());
    setErrors(result.ok ? [] : result.fields);
    if (!result.ok) {
      focusFirstError();
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
      fd.append("cf-turnstile-response", token);
      const res = await fetch(FORM_ENDPOINT, {
        method: "POST",
        headers: { accept: "application/json" },
        body: fd,
      });
      if (res.status === 400) {
        // serwer odrzucił pola — te same opakowania co walidacja kliencka
        const body = (await res.json().catch(() => null)) as {
          fields?: FieldName[];
        } | null;
        if (body?.fields?.length) {
          setErrors(body.fields);
          focusFirstError();
          return;
        }
      }
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
    .querySelector<HTMLButtonElement>("[data-form-again]")
    ?.addEventListener("click", () => {
      form.reset();
      setErrors([]);
      srvErr.hidden = true;
      done.hidden = true;
      form.hidden = false;
      frame.dataset.state = "form";
      t0 = Date.now();
      form.querySelector<Control>(CONTROLS)?.focus({ preventScroll: true });
    });
}

/** Uzbraja wszystkie formularze na stronie (`[data-form-frame]`). */
export function initForms(root: ParentNode = document): void {
  root.querySelectorAll<HTMLElement>("[data-form-frame]").forEach(initForm);
}
