// Lightbox galerii detalu oferty (4.3 b) — chunk z dynamicznego `import()`
// (`offer-detail.ts`; prefetch po pierwszym dotknięciu galerii, NIE w idle
// — LHCI nie liczy bajtów, których strona nie ładuje). Czysty DOM, zero
// Preact.
//  • Powłoka `#of-lightbox` to klon `<template data-lb-tpl>` z markupu
//    detalu, wstawiany do <body> przy PIERWSZYM otwarciu (przed otwarciem
//    nie istnieje w DOM); tor wypełniają kadry czytane z galerii hero
//    (`src` wariantu `hero`, `width`/`height`/`alt`) — bez drugiej
//    serializacji listy zdjęć.
//  • Mechanika nakładki (Esc, X, scrim, focus-trap, blokada scrolla,
//    swipe-down) w całości z `scripts/overlay.ts` — tu tylko `kind`:
//    `sheet` poniżej progu, `modal` od progu (gest sheetu nadpisuje
//    panelowi `transform`, więc na pełnoekranowym modalu gubiłby klik).
//    Zmiana progu przy otwartym lightboxie ZAMYKA go.
//  • Tor = natywny scroll-snap (`scroll-snap-stop: always`); ‹ › i ←/→
//    przewijają o kadr BEZ zapętlenia; licznik nadąża za swipe'em.
import { fillContactSlots } from "@/lib/contact-details";
import { DESKTOP_MIN_PX } from "@/lib/site-config";

const ID = "of-lightbox";
/** Po tylu ms od ‹ › / klawisza licznik znów słucha pozycji toru, nawet
 *  gdy płynny dojazd nie dotarł do celu (przerwany gestem). */
const LB_SETTLE_MS = 700;

const desktopMQ = matchMedia(`(min-width: ${DESKTOP_MIN_PX}px)`);
const reduceMQ = matchMedia("(prefers-reduced-motion: reduce)");

let root: HTMLElement | null = null;
let panel: HTMLElement | null = null;
let track: HTMLElement | null = null;
let count: HTMLElement | null = null;
let prev: HTMLButtonElement | null = null;
let next: HTMLButtonElement | null = null;
let slides: HTMLElement[] = [];
let current = 0;
/** cel płynnego dojazdu — do jego osiągnięcia zdarzenia `scroll` nie
 *  cofają licznika na kadry pośrednie */
let target: number | null = null;
let targetTimer = 0;
/** akcja po zamknięciu (po odblokowaniu scrolla strony), np. „Napisz" */
let afterClose: (() => void) | null = null;

const isOpen = () =>
  root !== null && !root.hidden && root.classList.contains("is-open");

const clamp = (i: number) => Math.max(0, Math.min(slides.length - 1, i));

function syncKind() {
  root?.setAttribute(
    "data-overlay-kind",
    desktopMQ.matches ? "modal" : "sheet",
  );
}

function indexFromScroll(): number {
  if (!track) return 0;
  return clamp(Math.round(track.scrollLeft / (track.clientWidth || 1)));
}

function paint(i: number) {
  current = i;
  if (count) count.textContent = `${i + 1} / ${slides.length}`;
  // bieżący kadr i sąsiedzi ładują się od razu, reszta zostaje `lazy`
  for (const j of [i - 1, i, i + 1]) {
    slides[j]?.querySelector("img")?.setAttribute("loading", "eager");
  }
  if (!prev || !next) return;
  const atStart = i <= 0;
  const atEnd = i >= slides.length - 1;
  // wyłączany przycisk nie może zabrać ze sobą fokusu (Tab uciekłby
  // z dialogu) — fokus przechodzi na drugą strzałkę albo na panel
  const active = document.activeElement;
  if ((atStart && active === prev) || (atEnd && active === next)) {
    const other = active === prev ? next : prev;
    const otherOff = active === prev ? atEnd : atStart;
    (otherOff ? panel : other)?.focus({ preventScroll: true });
  }
  prev.disabled = atStart;
  next.disabled = atEnd;
}

function go(i: number, instant = false) {
  if (!track || !slides.length) return;
  const idx = clamp(i);
  const smooth = !instant && !reduceMQ.matches;
  window.clearTimeout(targetTimer);
  target = smooth ? idx : null;
  if (smooth) {
    targetTimer = window.setTimeout(() => {
      target = null;
    }, LB_SETTLE_MS);
  }
  track.scrollTo({
    left: slides[idx].offsetLeft - track.offsetLeft,
    behavior: smooth ? "smooth" : "auto",
  });
  paint(idx);
}

function onScroll() {
  const i = indexFromScroll();
  if (target !== null) {
    if (i !== target) return;
    target = null;
  }
  if (i !== current) paint(i);
}

/** Buduje powłokę (raz). Zwraca false, gdy strona nie ma szablonu albo
 *  zdjęć — wołający zostaje przy przewijaniu hero. */
function build(): boolean {
  if (root) return true;
  const tpl = document.querySelector<HTMLTemplateElement>(
    "template[data-lb-tpl]",
  );
  const shell = tpl?.content.firstElementChild?.cloneNode(true) as
    | HTMLElement
    | undefined;
  const lane = shell?.querySelector<HTMLElement>("[data-lb-track]");
  if (!shell || !lane) return false;

  for (const fig of document.querySelectorAll<HTMLElement>(
    "[data-gal-slide]",
  )) {
    const src = fig.querySelector<HTMLImageElement>("img.od-img");
    if (!src) continue;
    const slide = document.createElement("figure");
    slide.className = "lb-slide";
    slide.setAttribute("role", "group");
    slide.setAttribute("aria-label", fig.getAttribute("aria-label") ?? "");
    if (fig.hasAttribute("data-plan")) slide.setAttribute("data-plan", "");
    const img = document.createElement("img");
    img.setAttribute("loading", "lazy");
    img.decoding = "async";
    img.alt = src.alt;
    // atrybuty, nie własności (`width` własność = rozmiar NA EKRANIE,
    // `src` własność = adres rozwinięty) — ten sam zapis co w galerii hero
    for (const name of ["width", "height", "src"]) {
      img.setAttribute(name, src.getAttribute(name) ?? "");
    }
    slide.appendChild(img);
    lane.appendChild(slide);
    slides.push(slide);
  }
  if (!slides.length) {
    slides = [];
    return false;
  }

  root = shell;
  panel = shell.querySelector<HTMLElement>("[data-overlay-panel]");
  track = lane;
  count = shell.querySelector<HTMLElement>("[data-lb-count]");
  prev = shell.querySelector<HTMLButtonElement>("[data-lb-prev]");
  next = shell.querySelector<HTMLButtonElement>("[data-lb-next]");
  document.body.appendChild(shell);
  fillContactSlots(shell);
  syncKind();

  track.addEventListener("scroll", onScroll, { passive: true });
  // gest na torze przejmuje licznik od razu (dojazd ‹ › zostaje przerwany)
  const release = () => {
    target = null;
  };
  track.addEventListener("pointerdown", release, { passive: true });
  track.addEventListener("touchstart", release, { passive: true });
  prev?.addEventListener("click", () => go(current - 1));
  next?.addEventListener("click", () => go(current + 1));
  // „Napisz": zamknij, a do sekcji kontaktu przewiń PO odblokowaniu
  // scrolla (przy `body{position:fixed}` skok kotwicy nic nie robi)
  shell
    .querySelector<HTMLAnchorElement>("[data-lb-write]")
    ?.addEventListener("click", (e) => {
      const id = (e.currentTarget as HTMLAnchorElement).hash.slice(1);
      e.preventDefault();
      afterClose = () => document.getElementById(id)?.scrollIntoView();
      window.overlay?.close(ID);
    });
  return true;
}

document.addEventListener("keydown", (e) => {
  if (e.key !== "ArrowLeft" && e.key !== "ArrowRight") return;
  if (!isOpen()) return;
  // także gdy fokus stoi na torze — inaczej natywny scroll strzałką
  // dublowałby ruch
  e.preventDefault();
  const to = current + (e.key === "ArrowRight" ? 1 : -1);
  if (to < 0 || to >= slides.length) return; // bez zapętlenia
  go(to);
});

desktopMQ.addEventListener("change", () => {
  syncKind();
  if (isOpen()) window.overlay?.close(ID);
});

window.addEventListener("resize", () => {
  if (isOpen()) go(current, true);
});

/** Otwiera lightbox od kadru `index`. `onClose(i)` dostaje kadr oglądany
 *  przy zamknięciu (hero galerii ma na nim stanąć). Zwraca false, gdy
 *  lightboxa nie da się zbudować. */
export function openLightbox(
  index: number,
  onClose: (index: number) => void,
): boolean {
  if (!window.overlay || !build() || !root) return false;
  afterClose = null;
  window.overlay.open(ID, {
    onClose: () => {
      const then = afterClose;
      afterClose = null;
      onClose(current);
      then?.();
    },
  });
  // po `hidden = false` tor ma już szerokość — ustaw kadr bez animacji
  go(index, true);
  return true;
}
