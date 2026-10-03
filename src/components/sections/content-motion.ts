// Ruch stron treściowych (strona główna od 4.4; /sprzedaj-z-nami/,
// /o-nas/, /uslugi/ w kolejnych częściach) — moduł ładowany DYNAMICZNIE
// wyłącznie przy prefers-reduced-motion: no-preference. Stany startowe
// uzbraja klasa html.js-motion (skrypt inline przed malowaniem — patrz
// index.astro) i arkusz content.css; bez JS / przy reduce strona jest
// w pełni statyczna i kompletna. Scroll NATYWNY na dokumencie
// (.claude/rules/scroll.md): wejścia to IntersectionObserver, parallax —
// jedna pętla rAF na pasywnym `scroll`.
//
// Port z designu (site.js §10), nie kopia mechaniki:
//  [data-rv]  blok treści odsłaniany raz, po wejściu w kadr (klasa .is-in;
//             przejścia w content.css). Atrybut stoi w markupie (SSR) —
//             design nadawał go skryptem.
//  [data-px]  zdjęcie w kadrze `.px-frame` jadące w pionie o ułamek
//             wysokości kadru; zapas układu = amplituda (content.css).
import {
  CONTENT_DESKTOP_MIN_PX,
  PX_AMT_DESKTOP,
  PX_AMT_MOBILE,
  RV_TRIGGER,
} from "./content-config";
import { vpH } from "./content-viewport";

const qa = <T extends HTMLElement = HTMLElement>(s: string) =>
  Array.from(document.querySelectorAll<T>(s));

/* ── reveale: wejścia jednorazowe ── */
function initReveals(): void {
  const els = qa("[data-rv]");
  if (!els.length) return;
  const io = new IntersectionObserver(
    (entries) => {
      for (const e of entries) {
        // nad oknem (przeładowanie w środku strony, skok kotwicy) —
        // odsłaniamy od razu; pod oknem — czekamy na wejście
        if (!e.isIntersecting && e.boundingClientRect.bottom > 0) continue;
        io.unobserve(e.target);
        e.target.classList.add("is-in");
      }
    },
    // górna krawędź bloku powyżej RV_TRIGGER wysokości okna
    { rootMargin: `0px 0px -${Math.round((1 - RV_TRIGGER) * 100)}% 0px` },
  );
  for (const el of els) io.observe(el);
}

/* ── parallax: jedna pętla rAF ── */
function initParallax(): void {
  // kadr = najbliższy `.px-frame` (obraz bywa owinięty w <picture>)
  const items = qa("[data-px]")
    .map((el) => ({ el, frame: el.closest<HTMLElement>(".px-frame") }))
    .filter(
      (it): it is { el: HTMLElement; frame: HTMLElement } => it.frame !== null,
    );
  if (!items.length) return;
  const desktopMQ = matchMedia(`(min-width: ${CONTENT_DESKTOP_MIN_PX}px)`);
  let raf = 0;

  function paint() {
    raf = 0;
    const vh = vpH();
    const amt = desktopMQ.matches ? PX_AMT_DESKTOP : PX_AMT_MOBILE;
    // BEZ pomijania elementów poza oknem: transform jest czystą funkcją
    // pozycji scrolla (poza kadrem clamp daje stały punkt krańcowy, w kadr
    // element wchodzi dokładnie z niego). Z pomijaniem elementy zostawały
    // z transformem „ostatniej klatki, kiedy były widoczne" — wynik
    // zależny od próbkowania rAF, różny między maszynami (zrzuty
    // fullPage). Koszt: kilka getBoundingClientRect na klatkę.
    for (const { el, frame } of items) {
      // pozycja z KADRU (nieruchomy) — transform elementu nie zapętla
      // własnego odczytu
      const r = frame.getBoundingClientRect();
      if (!r.height) continue;
      const p = Math.min(1, Math.max(0, (vh - r.top) / (vh + r.height)));
      const y = (0.5 - p) * 2 * amt * r.height;
      el.style.transform = `translate3d(0,${y.toFixed(1)}px,0)`;
    }
  }
  const tick = () => {
    if (!raf) raf = requestAnimationFrame(paint);
  };

  addEventListener("scroll", tick, { passive: true });
  // Przemalowanie na resize TYLKO przy zmianie szerokości: zmiana samej
  // wysokości to chowany pasek adresu telefonu (parallax nie może szarpać
  // w jego rytm) ALBO chwilowe rozciągnięcie okna, którym WebKit
  // Playwrighta robi zrzut fullPage.
  let lastW = window.innerWidth;
  addEventListener(
    "resize",
    () => {
      if (window.innerWidth === lastW) return;
      lastW = window.innerWidth;
      tick();
    },
    { passive: true },
  );
  desktopMQ.addEventListener("change", tick);
  // obrazy `lazy` zmieniają wysokość dokumentu po wczytaniu — pozycje
  // kadrów poniżej przesuwają się bez zdarzenia scroll
  addEventListener("load", tick);
  paint();
}

/** Uzbraja reveale i parallax bieżącej strony. Znacznik `data-motion`
 *  na <html> zdejmuje bezpiecznik bramki (skrypt inline cofa klasę
 *  js-motion, gdy moduł się nie wczyta — treść nie może zostać ukryta). */
export function initContentMotion(): void {
  document.documentElement.setAttribute("data-motion", "");
  initReveals();
  initParallax();
}
