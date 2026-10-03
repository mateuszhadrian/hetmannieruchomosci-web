// Detal oferty (4.3) — skrypt widoku, czysty TS (bez Preact):
//  • galeria hero: licznik i aktywna miniatura nadążają za przewijaniem
//    toru (scroll-snap natywny), ‹ › i klawiatura ←/→ przewijają o kadr,
//    miniatury/kafle przewijają hero (w (a); w (b) otwierają lightbox);
//  • kopiowanie numeru i linku (`navigator.clipboard`) z komunikatem;
//  • natywne udostępnianie (`navigator.share`) zamiast trzech ikon, gdy
//    API jest dostępne; „Drukuj / PDF" = `window.print()`;
//  • pasek kotwic: podświetlenie sekcji w kadrze (IntersectionObserver);
//  • film i spacer: iframe powstaje DOPIERO po kliknięciu (D32) — do tego
//    czasu kafel jest zwykłym linkiem;
//  • opis: „Czytaj więcej" tylko gdy treść przekracza próg (pomiar
//    scrollHeight), stan w atrybucie, zwijanie trzyma przycisk pod palcem.
// Scroll natywny (scroll.md); sloty kontaktowe wypełnia skrypt Navbara.
import {
  DESKTOP_MIN_PX,
  OFFER_DESCRIPTION_COLLAPSE_PX,
} from "@/lib/site-config";

const DETAIL_COPIED_MS = 2000;
const desktopMQ = matchMedia(`(min-width: ${DESKTOP_MIN_PX}px)`);
const reduceMQ = matchMedia("(prefers-reduced-motion: reduce)");

const root = document.querySelector<HTMLElement>("[data-offer-detail]");

function q<T extends HTMLElement>(sel: string): T | null {
  return root?.querySelector<T>(sel) ?? null;
}
function qa<T extends HTMLElement>(sel: string): T[] {
  return root ? [...root.querySelectorAll<T>(sel)] : [];
}

/* ── galeria hero ──────────────────────────────────────────────────── */

const track = q<HTMLElement>("[data-gal-track]");
const slides = qa<HTMLElement>("[data-gal-slide]");
const count = q<HTMLElement>("[data-gal-count]");
const thumbs = qa<HTMLButtonElement>("[data-gal-thumb]");
let current = 0;

/** Indeks kadru z pozycji toru (kadry = szerokość toru). */
function indexFromScroll(): number {
  if (!track) return 0;
  const w = track.clientWidth || 1;
  return Math.max(
    0,
    Math.min(slides.length - 1, Math.round(track.scrollLeft / w)),
  );
}

/** Dosuwa element do widocznej części POZIOMEGO paska — wyłącznie
 *  `scrollLeft` paska. `scrollIntoView` przewijałoby też przodków
 *  (stronę w pionie), a to rusza elementami sticky — także w trakcie
 *  zrzutu pełnej strony w testach wizualnych. */
function revealInStrip(strip: HTMLElement, el: HTMLElement) {
  const left = el.offsetLeft - strip.offsetLeft;
  const right = left + el.offsetWidth;
  if (left < strip.scrollLeft) strip.scrollLeft = left;
  else if (right > strip.scrollLeft + strip.clientWidth) {
    strip.scrollLeft = right - strip.clientWidth;
  }
}

const thumbStrip = q<HTMLElement>(".od-thumbs-track");

function paint(i: number) {
  current = i;
  if (count) count.textContent = `${i + 1} / ${slides.length}`;
  for (const t of thumbs) {
    const on = Number(t.dataset.galThumb) === i;
    if (on) t.setAttribute("aria-current", "true");
    else t.removeAttribute("aria-current");
    if (on && thumbStrip) revealInStrip(thumbStrip, t);
  }
}

export function goTo(i: number, instant = false) {
  if (!track || !slides.length) return;
  const idx = Math.max(0, Math.min(slides.length - 1, i));
  const slide = slides[idx];
  track.scrollTo({
    left: slide.offsetLeft - track.offsetLeft,
    behavior: instant || reduceMQ.matches ? "auto" : "smooth",
  });
  paint(idx);
}

if (track && slides.length) {
  track.addEventListener(
    "scroll",
    () => {
      const i = indexFromScroll();
      if (i !== current) paint(i);
    },
    { passive: true },
  );
  q("[data-gal-prev]")?.addEventListener("click", () => goTo(current - 1));
  q("[data-gal-next]")?.addEventListener("click", () => goTo(current + 1));
  track.addEventListener("keydown", (e) => {
    if (e.key !== "ArrowLeft" && e.key !== "ArrowRight") return;
    e.preventDefault();
    goTo(current + (e.key === "ArrowRight" ? 1 : -1));
  });
  // miniatury, kafle 2×2, „Wszystkie zdjęcia", rzuty: przewiń hero do kadru
  // (lightbox dochodzi w (b) — ten sam atrybut `data-gal-open`)
  for (const el of qa<HTMLElement>("[data-gal-open]")) {
    el.addEventListener("click", () => {
      const i = Number(el.dataset.galOpen) || 0;
      goTo(i);
      if (!desktopMQ.matches || el.closest("[data-gal-track]")) return;
      track.focus({ preventScroll: true });
    });
  }
  // orientacja/rozmiar: dociągnij tor do bieżącego kadru (snap zostaje,
  // ale szerokość kadru się zmienia)
  window.addEventListener("resize", () => goTo(current, true));

  // miniatury spoza pierwszych N (`data-src`) dogrywają się, gdy wjeżdżają
  // w pasek — natywne `loading=lazy` w poziomym pasku ładowało wszystkie
  const strip = q<HTMLElement>(".od-thumbs-track");
  const deferred = qa<HTMLImageElement>(".od-thumb img[data-src]");
  if (strip && deferred.length) {
    const load = (img: HTMLImageElement) => {
      const src = img.dataset.src;
      if (!src) return;
      img.src = src;
      delete img.dataset.src;
    };
    if ("IntersectionObserver" in window) {
      const io = new IntersectionObserver(
        (entries) => {
          for (const e of entries) {
            if (!e.isIntersecting) continue;
            load(e.target as HTMLImageElement);
            io.unobserve(e.target);
          }
        },
        { root: strip, rootMargin: "0px 240px 0px 240px" },
      );
      for (const img of deferred) io.observe(img);
    } else {
      for (const img of deferred) load(img);
    }
  }
}

/* ── kopiowanie i udostępnianie ───────────────────────────────────── */

const copied = q<HTMLElement>("[data-offer-copied]");
let copiedTimer = 0;

async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}

for (const btn of qa<HTMLButtonElement>("[data-offer-copy]")) {
  btn.addEventListener("click", async () => {
    const value = btn.dataset.copyValue ?? "";
    const ok = await copyText(value);
    if (!ok) return;
    const label = btn.querySelector<HTMLElement>("[data-copy-label]");
    const msg =
      btn.dataset.copiedLabel ?? copied?.dataset.label ?? "Skopiowano";
    if (label) {
      const orig = label.dataset.orig ?? label.textContent ?? "";
      label.dataset.orig = orig;
      label.textContent = msg;
      window.clearTimeout(Number(label.dataset.t));
      label.dataset.t = String(
        window.setTimeout(() => {
          label.textContent = orig;
        }, DETAIL_COPIED_MS),
      );
    }
    if (copied) {
      copied.textContent = msg;
      window.clearTimeout(copiedTimer);
      copiedTimer = window.setTimeout(() => {
        copied.textContent = "";
      }, DETAIL_COPIED_MS);
    }
  });
}

const nativeShare = q<HTMLButtonElement>("[data-offer-share-native]");
if (nativeShare && typeof navigator.share === "function") {
  nativeShare.hidden = false;
  q(".od-share-links")?.setAttribute("hidden", "");
  nativeShare.addEventListener("click", () => {
    void navigator
      .share({
        title: nativeShare.dataset.shareTitle,
        text: nativeShare.dataset.shareText,
        url: location.href,
      })
      .catch(() => undefined);
  });
}

q("[data-offer-print]")?.addEventListener("click", () => window.print());

/* ── kotwice: podświetlenie sekcji w kadrze ────────────────────────── */

const anchorLinks = qa<HTMLAnchorElement>(
  "[data-offer-anchors] a[data-anchor]",
);
if (anchorLinks.length && "IntersectionObserver" in window) {
  const byId = new Map(anchorLinks.map((a) => [a.dataset.anchor!, a]));
  const visible = new Map<string, number>();
  const anchorStrip = q<HTMLElement>(".od-anchors-in");
  const setCurrent = (id: string) => {
    for (const a of anchorLinks) {
      if (a.dataset.anchor === id) a.setAttribute("aria-current", "true");
      else a.removeAttribute("aria-current");
    }
    const link = byId.get(id);
    if (link && anchorStrip) revealInStrip(anchorStrip, link);
  };
  const io = new IntersectionObserver(
    (entries) => {
      for (const e of entries) {
        if (e.isIntersecting)
          visible.set(e.target.id, e.boundingClientRect.top);
        else visible.delete(e.target.id);
      }
      if (!visible.size) return;
      // najwyżej leżąca widoczna sekcja = bieżąca
      const top = [...visible.entries()].sort((a, b) => a[1] - b[1])[0][0];
      setCurrent(top);
    },
    // kadr pomniejszony o paski u góry i dolną połowę — sekcja „wchodzi",
    // gdy jej początek mija pasek kotwic
    { rootMargin: "-45% 0px -45% 0px", threshold: 0 },
  );
  for (const id of byId.keys()) {
    const sec = document.getElementById(id);
    if (sec) io.observe(sec);
  }
}

/* ── film i spacer: iframe po kliknięciu ───────────────────────────── */

function embed(a: HTMLAnchorElement, src: string, allow: string) {
  const frame = document.createElement("iframe");
  frame.src = src;
  frame.title = a.dataset.embedTitle ?? "";
  frame.setAttribute("allow", allow);
  frame.setAttribute("allowfullscreen", "");
  frame.setAttribute("loading", "eager");
  frame.setAttribute("referrerpolicy", "strict-origin-when-cross-origin");
  frame.className = a.className.replace("od-embed", "od-embed od-embed--frame");
  a.replaceWith(frame);
}

q<HTMLAnchorElement>("[data-offer-video]")?.addEventListener("click", (e) => {
  const a = e.currentTarget as HTMLAnchorElement;
  const id = a.dataset.offerVideo;
  if (!id) return;
  e.preventDefault();
  embed(
    a,
    `https://www.youtube-nocookie.com/embed/${encodeURIComponent(id)}?autoplay=1&rel=0`,
    "autoplay; fullscreen; picture-in-picture",
  );
});

q<HTMLAnchorElement>("[data-offer-tour]")?.addEventListener("click", (e) => {
  const a = e.currentTarget as HTMLAnchorElement;
  const url = a.dataset.offerTour;
  if (!url) return;
  e.preventDefault();
  // bez `microphone` (D32)
  embed(a, url, "fullscreen");
});

/* ── opis: „Czytaj więcej" tylko gdy treść przekracza próg ─────────── */

const descWrap = q<HTMLElement>("[data-offer-desc-wrap]");
const descBtn = q<HTMLButtonElement>("[data-offer-desc-btn]");
if (descWrap && descBtn) {
  const limit = () =>
    desktopMQ.matches
      ? OFFER_DESCRIPTION_COLLAPSE_PX.desktop
      : OFFER_DESCRIPTION_COLLAPSE_PX.mobile;
  const arm = () => {
    const long = descWrap.scrollHeight > limit() + 40;
    if (!long) {
      descWrap.removeAttribute("data-collapsed");
      descBtn.hidden = true;
      descBtn.setAttribute("aria-expanded", "true");
      return;
    }
    if (descBtn.hidden) {
      descWrap.setAttribute("data-collapsed", "");
      descBtn.setAttribute("aria-expanded", "false");
      descBtn.hidden = false;
    }
  };
  descWrap.style.setProperty("--od-desc-max", `${limit()}px`);
  arm();
  desktopMQ.addEventListener("change", () => {
    descWrap.style.setProperty("--od-desc-max", `${limit()}px`);
  });
  descBtn.addEventListener("click", () => {
    const collapse = !descWrap.hasAttribute("data-collapsed");
    if (!collapse) {
      descWrap.removeAttribute("data-collapsed");
      descBtn.setAttribute("aria-expanded", "true");
      return;
    }
    // zwinięcie zabiera wysokość nad pozycją scrolla — przycisk zostaje
    // pod palcem (korekta jak w collapsible.ts)
    const before = descBtn.getBoundingClientRect().top;
    descWrap.setAttribute("data-collapsed", "");
    descBtn.setAttribute("aria-expanded", "false");
    const delta = descBtn.getBoundingClientRect().top - before;
    if (delta !== 0) window.scrollBy(0, delta);
  });
}

export {};
