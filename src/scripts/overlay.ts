// Generyczny kontroler nakładek (modal + bottom sheet). Obsługuje dowolny
// element `[data-overlay]` w DOM — niezależnie od treści. Zapewnia:
//  • otwieranie/zamykanie z animacją (klasy is-open / is-closing),
//  • blokadę scrolla strony (body { position: fixed } + zapamiętana pozycja,
//    odblokowanie natywnym window.scrollTo — jedyna ścieżka, D-Q1),
//  • zamykanie przez Esc, klik w tło i przyciski [data-overlay-close],
//  • focus-trap + przywrócenie fokusu po zamknięciu,
//  • API: window.overlay.open(id, opts) / .close(id) / .isOpen().
//
// Reużywalny — konsumenci (bundlowany raz): menu mobilne w Navbarze, karty
// kategorii (KategorieSheets), detal realizacji (WorkDetailOverlay) wraz
// z podglądem pełnoekranowym. Treść wstrzykuje konsument.

declare global {
  interface Window {
    overlay?: OverlayApi;
  }
}

interface OpenOpts {
  label?: string; // aria-label nadawany nakładce na czas otwarcia
  onClose?: () => void; // wywoływane po zakończeniu animacji zamknięcia
}

interface OverlayApi {
  open: (id: string, opts?: OpenOpts) => void;
  close: (id: string) => void;
  isOpen: () => boolean;
}

const CLOSE_FALLBACK_MS = 360; // bezpiecznik, gdyby transitionend nie zaszedł

let activeEl: HTMLElement | null = null;
let lastFocused: HTMLElement | null = null;
let savedScroll = 0;
const onCloseMap = new WeakMap<HTMLElement, () => void>();

const reduceMQ = matchMedia("(prefers-reduced-motion: reduce)");

// Modalność ostatniej interakcji. Decyduje, czy po otwarciu nakładki pokazać
// pierścień fokusu na przycisku X: klawiatura → tak (pożądany), dotyk/mysz →
// nie (programowy focus i tak wywołałby heurystykę :focus-visible, przez co X
// wyglądałby jak "zaznaczony" do kolejnego tapnięcia). Patrz open().
let keyboardIntent = false;
document.addEventListener(
  "keydown",
  (e) => {
    if (e.key === "Tab" || e.key === "Enter" || e.key === " ")
      keyboardIntent = true;
  },
  true,
);
document.addEventListener(
  "pointerdown",
  () => {
    keyboardIntent = false;
  },
  true,
);

const FOCUSABLE =
  'a[href],button:not([disabled]),textarea,input,select,[tabindex]:not([tabindex="-1"])';

function panelOf(el: HTMLElement): HTMLElement {
  return el.querySelector<HTMLElement>("[data-overlay-panel]") ?? el;
}

function lockScroll() {
  savedScroll = window.scrollY;
  const b = document.body.style;
  b.position = "fixed";
  b.top = `-${savedScroll}px`;
  b.left = "0";
  b.right = "0";
}

function unlockScroll() {
  const b = document.body.style;
  b.position = "";
  b.top = "";
  b.left = "";
  b.right = "";
  window.scrollTo(0, savedScroll);
}

function open(id: string, opts: OpenOpts = {}) {
  const el = document.getElementById(id);
  if (!el || el === activeEl) return;
  if (activeEl) close(activeEl.id); // tylko jedna nakładka naraz

  lastFocused = document.activeElement as HTMLElement | null;
  if (opts.label) el.setAttribute("aria-label", opts.label);
  if (opts.onClose) onCloseMap.set(el, opts.onClose);

  el.hidden = false;
  el.classList.remove("is-closing");
  // każde otwarcie zaczyna od samej góry — wyzeruj kontener scrolla
  // (root = scroller modala) oraz oznaczone obszary scrollowalne (sheet).
  el.scrollTop = 0;
  el.querySelectorAll<HTMLElement>("[data-overlay-scroll]").forEach((s) => {
    s.scrollTop = 0;
  });
  // wymuś reflow, by przejście in zaczęło się od stanu zamkniętego
  void el.offsetWidth;
  el.classList.add("is-open");
  activeEl = el;

  lockScroll();

  // Autofocus na przycisk X tylko przy otwarciu klawiaturą (pierścień pożądany).
  // Dotyk/mysz → fokusujemy panel (tabindex=-1, bez pierścienia): dialog dostaje
  // fokus dla dostępności, ale X nie wygląda na "zaznaczony".
  const focusTarget = keyboardIntent
    ? (el.querySelector<HTMLElement>("[data-overlay-autofocus]") ??
      el.querySelector<HTMLElement>("[data-overlay-close]") ??
      panelOf(el))
    : panelOf(el);
  focusTarget?.focus({ preventScroll: true });
}

function close(id: string) {
  const el = document.getElementById(id);
  if (!el || el.hidden) return;

  const finish = () => {
    el.hidden = true;
    el.classList.remove("is-closing");
    // wyczyść inline style pozostałe po geście przeciągnięcia (drag-to-dismiss),
    // inaczej translateY z gestu nadpisałby CSS i sheet nie pokazałby się po
    // ponownym otwarciu.
    const p = panelOf(el);
    p.style.transform = "";
    p.style.transition = "";
    el.style.opacity = "";
    if (activeEl === el) {
      activeEl = null;
      unlockScroll();
    }
    el.removeAttribute("aria-label");
    const cb = onCloseMap.get(el);
    if (cb) {
      onCloseMap.delete(el);
      cb();
    }
    lastFocused?.focus({ preventScroll: true });
    lastFocused = null;
  };

  el.classList.remove("is-open");
  el.classList.add("is-closing");

  if (reduceMQ.matches) {
    finish();
    return;
  }

  const panel = panelOf(el);
  let done = false;
  const onEnd = (e: TransitionEvent) => {
    if (e.target !== panel) return;
    done = true;
    panel.removeEventListener("transitionend", onEnd);
    finish();
  };
  panel.addEventListener("transitionend", onEnd);
  window.setTimeout(() => {
    if (done) return;
    panel.removeEventListener("transitionend", onEnd);
    finish();
  }, CLOSE_FALLBACK_MS);
}

function isOpen() {
  return activeEl !== null;
}

// ── delegacja zdarzeń (działa też dla treści wstrzykniętej po fakcie) ──
document.addEventListener("click", (e) => {
  const target = e.target as HTMLElement;

  const closer = target.closest<HTMLElement>("[data-overlay-close]");
  if (closer) {
    const root = closer.closest<HTMLElement>("[data-overlay]");
    if (root) {
      close(root.id);
      return;
    }
  }

  // klik w tło: w obrębie nakładki, ale poza panelem
  const root = target.closest<HTMLElement>("[data-overlay]");
  if (root && !root.hidden && !target.closest("[data-overlay-panel]")) {
    close(root.id);
  }
});

// ── gest przeciągnięcia w dół (drag-to-dismiss) — tylko bottom sheet mobile ──
// Chwyt za "kreseczkę"/nagłówek [data-overlay-drag] i pociągnięcie w dół
// zamyka sheet; puszczenie poniżej progu (dystans lub prędkość „flick”)
// przywraca go płynnie na miejsce. Desktopowy Modal nie ma tej strefy.
//
// Runda 4: gest łapie się także W TREŚCI sheeta, ale WYŁĄCZNIE gdy jest ona
// przewinięta na samą górę — bo dopiero wtedy ciągnięcie w dół nie ma nic do
// przewijania. Wcześniej taki gest szedł do przeglądarki i mocniejszy ruch
// ODŚWIEŻAŁ STRONĘ zamiast zamknąć sheet (zgłoszenie Mateusza). Start z treści
// jest „warunkowy" (pending): przejmujemy go dopiero, gdy palec pójdzie w dół
// wyraźnie bardziej niż w bok — inaczej pozioma karuzela galerii w detalu
// zamykałaby sheet przy każdym przesunięciu kadru. Wyjątek `[data-overlay-nodrag]`
// nosi podgląd pełnoekranowy, który ma własny swipe-down (open-detail.ts).
//
// DOTYK IDZIE PRZEZ `touch*`, NIE PRZEZ `pointer*` (korekta po teście na
// telefonie): uchwyt działa na pointerach tylko dlatego, że ma w CSS
// `touch-action: none`, więc przeglądarka nie rości sobie do niego prawa.
// W treści `touch-action` musi zostać przewijalne — a wtedy przeglądarka
// uznaje gest za scroll i przerywa strumień pointerów `pointercancel`, zanim
// zdążymy przekroczyć próg. Zabrać jej gest da się WYŁĄCZNIE przez
// `preventDefault()` na `touchmove` w listenerze non-passive. Mysz i pióro
// zostają na pointerach (m.in. dlatego testy z myszą przechodziły mimo
// niedziałającego dotyku — emulacja tej różnicy nie pokazuje).
const DRAG_CLOSE_PX = 96; // minimalny dystans, by zamknąć
const DRAG_CLOSE_FRACTION = 0.28; // …lub ten ułamek wysokości panelu
const DRAG_FLICK_VY = 0.55; // …lub prędkość „flick” w px/ms
const DRAG_SLOP_PX = 8; // dystans, po którym rozstrzygamy kierunek gestu

interface DragState {
  root: HTMLElement;
  panel: HTMLElement;
  startX: number;
  startY: number;
  lastY: number;
  lastT: number;
  dy: number;
  vy: number;
  moved: boolean;
  /** gest z treści czeka na rozstrzygnięcie kierunku (uchwyt = od razu false) */
  pending: boolean;
  /** obszar scrollowalny pod palcem — musi zostać na górze, by przejąć gest */
  scroller: HTMLElement | null;
}
let drag: DragState | null = null;

function detachDrag() {
  window.removeEventListener("pointermove", onDragMove);
  window.removeEventListener("pointerup", endDrag);
  window.removeEventListener("pointercancel", endDrag);
  window.removeEventListener("touchmove", onTouchMove);
  window.removeEventListener("touchend", onTouchEnd);
  window.removeEventListener("touchcancel", onTouchEnd);
  drag = null;
}

/** Wspólny rdzeń ruchu — wołany z pointermove (mysz) i touchmove (dotyk).
 *  `prevent` odcina natywne zachowanie przeglądarki, gdy gest już przejęliśmy;
 *  zwraca false, gdy zdarzenia nie da się anulować (przeglądarka zdążyła
 *  rozpocząć przewijanie) — wtedy gest oddajemy. */
function moveDrag(
  x: number,
  y: number,
  t: number,
  prevent: () => boolean,
): void {
  if (!drag) return;

  if (drag.pending) {
    const dx = Math.abs(x - drag.startX);
    const dyRaw = y - drag.startY;
    // ruch w górę albo w bok = to nie jest gest zamykający: oddajemy go
    // przeglądarce (scroll treści, karuzela galerii) i nie wracamy do niego.
    // Progi 2 px to tolerancja na szum palca w pierwszej klatce.
    if (dyRaw < -2 || dx > Math.max(dyRaw, 2)) {
      detachDrag();
      return;
    }
    if (dyRaw <= 0) return; // jeszcze nie wiadomo, dokąd idzie palec
    // treść zdążyła podjechać (np. przez bezwładność) — nie przejmujemy
    if (drag.scroller && drag.scroller.scrollTop > 0) {
      detachDrag();
      return;
    }
    // Gest trzeba odebrać przeglądarce W PIERWSZEJ KLATCE ruchu w dół, nie po
    // przekroczeniu progu: po pierwszym niezablokowanym `touchmove` przeglądarka
    // uznaje gest za przewijanie i kolejne zdarzenia przychodzą już z
    // `cancelable === false` (zmierzone — patrz analiza rundy 4). Blokada jest
    // bezpieczna, bo przy `scrollTop === 0` ruch w dół i tak nie ma czego
    // przewijać, a ruch w bok odsialiśmy wyżej.
    if (!prevent()) {
      detachDrag();
      return;
    }
    if (dyRaw < DRAG_SLOP_PX) return; // gest już nasz, panel jeszcze stoi
    drag.pending = false;
    drag.startY = y; // panel rusza od zera, bez skoku o próg
  }

  const dy = Math.max(0, y - drag.startY); // tylko w dół
  if (!drag.moved && dy > 0) {
    // przejmujemy gest — jeśli przeglądarka już go sobie wzięła, odpuszczamy
    if (!prevent()) {
      detachDrag();
      return;
    }
    drag.moved = true;
    drag.panel.style.transition = "none"; // podążaj 1:1 za palcem
  } else if (drag.moved) {
    prevent();
  }
  const dt = t - drag.lastT;
  if (dt > 0) drag.vy = (y - drag.lastY) / dt;
  drag.lastY = y;
  drag.lastT = t;
  drag.dy = dy;
  drag.panel.style.transform = `translateY(${dy}px)`;
  // przygaszaj tło proporcjonalnie do przeciągnięcia
  const h = drag.panel.offsetHeight || 1;
  drag.root.style.opacity = String(1 - Math.min(1, dy / h) * 0.85);
}

function onDragMove(e: PointerEvent) {
  moveDrag(e.clientX, e.clientY, e.timeStamp, () => {
    e.preventDefault();
    return true;
  });
}

function onTouchMove(e: TouchEvent) {
  const t = e.touches[0];
  if (!t) return;
  moveDrag(t.clientX, t.clientY, e.timeStamp, () => {
    // `cancelable === false` znaczy, że przeglądarka już przewija i gestu
    // odebrać się nie da — lepiej oddać go w całości niż szarpać panelem
    if (!e.cancelable) return false;
    e.preventDefault();
    return true;
  });
}

function onTouchEnd(e: TouchEvent) {
  finishDrag(e.type === "touchcancel");
}

function endDrag(e: PointerEvent) {
  finishDrag(e.type === "pointercancel");
}

function finishDrag(cancelled: boolean) {
  if (!drag) return;
  const { root, panel, dy, vy, moved } = drag;
  detachDrag();

  if (!moved) {
    // czysty tap — nic nie ruszaliśmy, wyczyść ewentualne inline style
    panel.style.transition = "";
    panel.style.transform = "";
    root.style.opacity = "";
    return;
  }

  const h = panel.offsetHeight || 1;
  const shouldClose =
    !cancelled &&
    (dy > DRAG_CLOSE_PX || dy > h * DRAG_CLOSE_FRACTION || vy > DRAG_FLICK_VY);

  if (shouldClose) {
    // dokończ animację zejścia i uruchom pełne zamknięcie (unlock scroll, focus)
    panel.style.transition = "transform 0.26s cubic-bezier(0.3, 0, 0.4, 1)";
    panel.style.transform = "translateY(100%)";
    root.style.opacity = ""; // fade tła przejmie klasa is-closing
    close(root.id);
  } else {
    // za mało — wróć płynnie na miejsce
    panel.style.transition = "transform 0.26s cubic-bezier(0.2, 0.7, 0.2, 1)";
    panel.style.transform = "";
    root.style.opacity = "";
    const clear = () => {
      panel.style.transition = "";
      panel.removeEventListener("transitionend", clear);
    };
    panel.addEventListener("transitionend", clear);
  }
}

/** Kwalifikuje dotknięcie i uzbraja stan gestu. Zwraca false, gdy w tym
 *  miejscu gest nas nie dotyczy (modal, przycisk X, treść przewinięta niżej). */
function startDrag(
  target: HTMLElement,
  x: number,
  y: number,
  t: number,
): boolean {
  if (drag) return false;
  const handle = target.closest<HTMLElement>("[data-overlay-drag]");
  if (target.closest("[data-overlay-close]")) return false; // nie z przycisku X
  if (target.closest("[data-overlay-nodrag]")) return false; // własna obsługa
  const root = (handle ?? target).closest<HTMLElement>("[data-overlay]");
  if (
    !root ||
    root.hidden ||
    root.getAttribute("data-overlay-kind") !== "sheet" ||
    reduceMQ.matches
  )
    return false;

  let scroller: HTMLElement | null = null;
  if (!handle) {
    // start z treści: tylko wewnątrz panelu (klik w tło ma własną obsługę)
    // i tylko gdy obszar pod palcem jest przewinięty na samą górę
    if (!target.closest("[data-overlay-panel]")) return false;
    scroller =
      target.closest<HTMLElement>("[data-overlay-scroll]") ?? panelOf(root);
    if (scroller.scrollTop > 0) return false;
  }

  drag = {
    root,
    panel: panelOf(root),
    startX: x,
    startY: y,
    lastY: y,
    lastT: t,
    dy: 0,
    vy: 0,
    moved: false,
    pending: !handle,
    scroller,
  };
  return true;
}

document.addEventListener("pointerdown", (e) => {
  // dotyk obsługuje ścieżka touch* (patrz komentarz nad stałymi gestu)
  if (e.pointerType === "touch") return;
  if (!startDrag(e.target as HTMLElement, e.clientX, e.clientY, e.timeStamp))
    return;
  window.addEventListener("pointermove", onDragMove, { passive: false });
  window.addEventListener("pointerup", endDrag);
  window.addEventListener("pointercancel", endDrag);
});

document.addEventListener(
  "touchstart",
  (e) => {
    if (e.touches.length !== 1) return; // gest wielopalcowy = nie nasz
    const t = e.touches[0];
    if (!startDrag(e.target as HTMLElement, t.clientX, t.clientY, e.timeStamp))
      return;
    // non-passive: to TU odbieramy gest przeglądarce
    window.addEventListener("touchmove", onTouchMove, { passive: false });
    window.addEventListener("touchend", onTouchEnd);
    window.addEventListener("touchcancel", onTouchEnd);
  },
  { passive: true },
);

document.addEventListener("keydown", (e) => {
  if (!activeEl) return;
  if (e.key === "Escape") {
    e.preventDefault();
    close(activeEl.id);
    return;
  }
  if (e.key !== "Tab") return;

  const focusables = [
    ...activeEl.querySelectorAll<HTMLElement>(FOCUSABLE),
  ].filter((n) => n.offsetParent !== null || n === document.activeElement);
  if (!focusables.length) {
    e.preventDefault();
    return;
  }
  const first = focusables[0];
  const last = focusables[focusables.length - 1];
  const act = document.activeElement as HTMLElement;
  if (e.shiftKey && (act === first || !activeEl.contains(act))) {
    e.preventDefault();
    last.focus();
  } else if (!e.shiftKey && act === last) {
    e.preventDefault();
    first.focus();
  }
});

// Przenieś nakładki bezpośrednio do <body>, by nie były uwięzione w kontekście
// stackingu sekcji/.page (z-index:1) — inaczej navbar (z-index:50, rodzeństwo
// .page) przykrywałby nakładkę mimo jej wyższego z-index.
function portalize() {
  document.querySelectorAll<HTMLElement>("[data-overlay]").forEach((el) => {
    if (el.parentElement !== document.body) document.body.appendChild(el);
  });
}
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", portalize, { once: true });
} else {
  portalize();
}

const api: OverlayApi = { open, close, isOpen };
window.overlay = api;
export {};
