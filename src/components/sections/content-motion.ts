// Ruch stron treściowych — moduł ładowany DYNAMICZNIE wyłącznie przy
// prefers-reduced-motion: no-preference. Stany startowe uzbraja klasa
// html.js-motion (inline skrypt przed paintem w stronie) — bez JS / przy
// reduce strona jest w pełni statyczna i kompletna. Scroll NATYWNY na
// dokumencie (.claude/rules/scroll.md): wejścia to IntersectionObserver,
// parallaxy — jedna pętla rAF na pasywnym `scroll`.
//
// STAN Etapu 0: mechanika odziedziczona z szablonu BEZ zmian (reveale
// [data-rev], rysowanie maską [data-ryc]/[data-rycsb], parallaxy
// [data-plxr]/[data-plx], dryf tła [data-paper-tex]). Design Hetman
// nazywa reveale `data-rv`, a parallax `data-px` — dopasowanie
// selektorów, temp i wycięcie nieużywanych gałęzi: Etap 4 (pierwszy
// widok z animacją wejścia).
import {
  CONTENT_DESKTOP_MIN_PX,
  PAPER_BG_SPEED,
  PLX_AMT,
  PLXR_MAX_PX,
} from "./content-config";

const desktopMQ = matchMedia(`(min-width: ${CONTENT_DESKTOP_MIN_PX}px)`);
const qa = <T extends HTMLElement = HTMLElement>(s: string) =>
  Array.from(document.querySelectorAll<T>(s));

/* ── wejścia jednorazowe: reveale + rysowanie rycin ── */

// Po zakończeniu rysowania atrybut maski SCHODZI z elementu (jak
// w eksporcie) — ryciny bywają jednocześnie [data-plxr] (transform co
// klatkę), a maska na przesuwanej warstwie to drogi wzorzec przemalowań
// (lekcja szablonu). animationcancel: freeze.css testów wizualnych anuluje bieg —
// bez tej gałęzi rycina zostałaby w połowie zamaskowana na zrzutach.
// Wołać PO nadaniu klasy .in: gdy animacja w ogóle nie wystartowała
// (animation-name: none — freeze.css zdążył PRZED .in), nie będzie
// żadnego zdarzenia do złapania, więc stan końcowy domykamy od ręki —
// bez tej gałęzi rycina zostawała w ZAMASKOWANYM stanie startowym
// zależnie od wyścigu ładowania modułu z freeze.css (flake webkit-CI
// w szablonie).
function drop(el: HTMLElement, attr: string) {
  const done = () => {
    el.removeAttribute(attr);
    el.classList.remove("in");
  };
  if (getComputedStyle(el).animationName === "none") {
    done();
    return;
  }
  el.addEventListener("animationend", done, { once: true });
  el.addEventListener("animationcancel", done, { once: true });
}

const revIO = new IntersectionObserver(
  (entries) => {
    for (const e of entries) {
      if (!e.isIntersecting && e.boundingClientRect.bottom > 0) continue;
      revIO.unobserve(e.target);
      e.target.classList.add("in");
    }
  },
  { rootMargin: "0px 0px -10% 0px", threshold: 0.01 },
);
qa("[data-rev]").forEach((el) => {
  // pierwszy ekran od razu — rootMargin -10% kazałby elementom na
  // starcie czekać z opacity 0 na pierwszy ruch palcem
  if (el.getBoundingClientRect().top < window.innerHeight) {
    el.classList.add("in");
  } else {
    revIO.observe(el);
  }
});

// ryciny mobile — próg 30 % widoczności (skrypt eksportu)
const rycIO = new IntersectionObserver(
  (entries) => {
    for (const e of entries) {
      if (!e.isIntersecting) continue;
      const el = e.target as HTMLElement;
      rycIO.unobserve(el);
      el.classList.add("in");
      drop(el, "data-ryc");
    }
  },
  { threshold: 0.3 },
);
qa("[data-ryc]").forEach((el) => rycIO.observe(el));

// ryciny desktop — eksport rysował, gdy środek minął linię 60 %
// wysokości viewportu; odwzorowanie: rootMargin przycina dolne 40 %
const drawIO = new IntersectionObserver(
  (entries) => {
    for (const e of entries) {
      if (!e.isIntersecting) continue;
      const el = e.target as HTMLElement;
      drawIO.unobserve(el);
      el.classList.add("in");
      drop(el, "data-rycsb");
    }
  },
  { rootMargin: "0px 0px -40% 0px" },
);
qa("[data-rycsb]").forEach((el) => drawIO.observe(el));

/* ── parallaxy + dryf tła: jedna pętla rAF ── */

const rycs = qa("[data-plxr]");
const photos = qa("[data-plx]");
// dryf tła (desktop); tekstura FIXED przesuwana transformem modulo
// okres (kompozytor, bez przemalowań)
const paperTex = document.querySelector<HTMLElement>("[data-paper-tex]");
const paperRatio = paperTex ? Number(paperTex.dataset.ratio) : 0;
let raf = 0;

const clamp = (v: number) => Math.max(-1, Math.min(1, v));

function paint() {
  raf = 0;
  if (paperTex && paperRatio > 0) {
    if (desktopMQ.matches) {
      const period = window.innerWidth * paperRatio;
      const y = (window.scrollY * PAPER_BG_SPEED) % period;
      paperTex.style.transform = `translateY(${(-y).toFixed(1)}px)`;
    } else {
      // powrót na mobile: tekstura absolute jedzie z treścią bez korekty
      paperTex.style.transform = "";
    }
  }
  if (desktopMQ.matches) {
    // desktop eksportu jest statyczny — zdejmij inline transformy
    // z elementów mobilnych (mogły zostać po przejściu przez próg)
    for (const el of [...rycs, ...photos]) {
      if (el.style.transform) el.style.transform = "";
    }
    return;
  }
  // BEZ pomijania elementów poza viewportem: transform liczymy ZAWSZE, więc stan każdego
  // elementu jest czystą funkcją bieżącej pozycji scrolla — poza
  // kadrem `clamp` daje stały punkt krańcowy, w kadr element wchodzi
  // dokładnie z niego (wizualnie identycznie). Z pomijaniem elementy
  // środka strony zostawały z transformem „ostatniej klatki, kiedy
  // były widoczne" — wynik zależny od próbkowania rAF podczas
  // przewijania, różny między maszynami (flake webkit-CI 2026-08-24
  // na zrzutach fullPage). Koszt: kilkanaście getBoundingClientRect
  // na tick — pomijalny.
  const vh = window.innerHeight;
  const vc = vh / 2;
  for (const el of rycs) {
    const r = el.getBoundingClientRect();
    if (!r.height) continue;
    const p = clamp((r.top + r.height / 2 - vc) / (vh / 2));
    el.style.transform = `translateY(${(p * PLXR_MAX_PX).toFixed(1)}px)`;
  }
  for (const el of photos) {
    // Kadr (rodzic z maską) jest nieruchomy — pozycja liczona z niego,
    // żeby transform elementu nie zapętlał własnego odczytu.
    const frame = el.parentElement;
    if (!frame) continue;
    const f = frame.getBoundingClientRect();
    if (!f.height) continue;
    const p = clamp((f.top + f.height / 2 - vc) / ((vh + f.height) / 2));
    el.style.transform = `translateY(${(p * (PLX_AMT / 2) * f.height).toFixed(1)}px)`;
  }
}

function tick() {
  if (!raf) raf = requestAnimationFrame(paint);
}

if (rycs.length || photos.length || paperTex) {
  window.addEventListener("scroll", tick, { passive: true });
  // Repaint na resize TYLKO przy zmianie szerokości:
  // zmiana samej wysokości to chowany pasek URL telefonu (parallax nie
  // może szarpać w jego rytm) ALBO chwilowe rozciągnięcie viewportu,
  // którym WebKit Playwrighta robi zrzut fullPage — repaint z vh równym
  // wysokości CAŁEJ strony ścigał się tam ze zrzutem i przestawiał
  // transformy losowo względem baseline'u (flake webkit-CI 2026-08-24).
  let lastW = window.innerWidth;
  window.addEventListener("resize", () => {
    if (window.innerWidth === lastW) return;
    lastW = window.innerWidth;
    tick();
  });
  desktopMQ.addEventListener("change", tick);
  paint();
}

export {};
