// Hero strony głównej — ruch (część chunku home-motion.ts, ładowanego
// dynamicznie tylko przy prefers-reduced-motion: no-preference; bez JS
// / przy reduce hero to samo zdjęcie). Port z designu (site.js §3 i §9) —
// wygląd i tempo, nie mechanika; docs/analiza-home.md H2, H3, H10.
//
// FILM → ZDJĘCIE: zdjęcie (element LCP) leży pod spodem i jest widoczne
// zawsze; film ma `opacity: 0` i pokazuje się dopiero, gdy NAPRAWDĘ gra
// (zdarzenie `playing`), a po końcu materiału gaśnie i odsłania zdjęcie.
// Każda inna droga — odrzucone play() (tryb oszczędzania energii, blokada
// autoodtwarzania), błąd pobrania, oszczędzanie danych, okno poniżej
// progu desktopu — kończy się tym samym stanem: zdjęcie. Stan niesie
// `data-state` na <video>: idle → playing → photo (CSS w HomeHero.astro).
//
// ZOOM: warstwa obrazu rośnie, a nagłówek gaśnie w miarę przewijania
// hero. `transform`/`opacity` na osobnych warstwach, własna pętla rAF
// z dociąganiem (reguła scroll.md: scroll natywny, dekoracje wygładza
// rAF; żadnej maski na dużym obrazie).
import {
  HOME_DESKTOP_MIN_PX,
  HOME_HERO_FADE,
  HOME_HERO_LERP,
  HOME_HERO_ZOOM,
  HOME_VIDEO_END_RATE,
  HOME_VIDEO_TAIL_S,
} from "./home-config";

type VideoState = "idle" | "playing" | "photo";

function initVideo(hero: HTMLElement): void {
  const video = hero.querySelector<HTMLVideoElement>("[data-hero-video]");
  const photo = hero.querySelector<HTMLImageElement>("[data-hero-photo]");
  if (!video || !photo) return;
  const desktopMQ = matchMedia(`(min-width: ${HOME_DESKTOP_MIN_PX}px)`);
  let started = false;
  let raf = 0;

  const setState = (state: VideoState) => {
    video.dataset.state = state;
  };
  const toPhoto = () => {
    cancelAnimationFrame(raf);
    if (video.dataset.state === "photo") return;
    setState("photo");
    video.pause();
  };

  // pod koniec materiału film zwalnia i dopiero wtedy przechodzi w zdjęcie
  function slowDown() {
    if (video!.dataset.state === "photo") return;
    const remaining = video!.duration - video!.currentTime;
    if (Number.isFinite(remaining)) {
      const p =
        remaining <= HOME_VIDEO_TAIL_S
          ? Math.min(1, Math.max(0, 1 - remaining / HOME_VIDEO_TAIL_S))
          : 0;
      const rate = 1 + (HOME_VIDEO_END_RATE - 1) * p;
      if (Math.abs(video!.playbackRate - rate) > 0.005) {
        video!.playbackRate = rate;
      }
    }
    raf = requestAnimationFrame(slowDown);
  }

  function play() {
    video!.addEventListener(
      "playing",
      () => {
        if (video!.dataset.state === "idle") setState("playing");
      },
      { once: true },
    );
    video!.addEventListener("ended", toPhoto);
    // błąd pobrania zgłasza OSTATNIE <source>, błąd dekodowania — <video>
    video!.addEventListener("error", toPhoto);
    const sources = Array.from(video!.querySelectorAll("source"));
    sources.at(-1)?.addEventListener("error", toPhoto);
    // adresy źródeł stoją w `data-src` — dopiero tu film staje się
    // pobieralny (poniżej progu desktopu nie dochodzi do tego nigdy)
    for (const source of sources) {
      if (source.dataset.src) source.src = source.dataset.src;
    }
    video!.preload = "auto";
    video!.load();
    video!.playbackRate = 1;
    video!.play().then(
      () => {
        raf = requestAnimationFrame(slowDown);
      },
      // odrzucone autoodtwarzanie albo brak obsługiwanego źródła
      toPhoto,
    );
  }

  function start() {
    if (started || !desktopMQ.matches) return;
    const saveData = (
      navigator as Navigator & { connection?: { saveData?: boolean } }
    ).connection?.saveData;
    if (saveData) return;
    started = true;
    // film nie konkuruje z plakatem (LCP): start dopiero po jego wczytaniu
    if (photo!.complete) play();
    else photo!.addEventListener("load", play, { once: true });
  }

  start();
  desktopMQ.addEventListener("change", (e) => {
    if (e.matches) start();
    else if (started) toPhoto();
  });
}

function initZoom(hero: HTMLElement): void {
  const layer = hero.querySelector<HTMLElement>("[data-hero-zoom]");
  const fades = Array.from(
    hero.querySelectorAll<HTMLElement>("[data-hero-fade]"),
  ).map((el) => ({ el, top0: 1, target: 0, current: 0 }));
  if (!layer && !fades.length) return;

  let target = 0;
  let current = 0;
  let raf = 0;
  let lastT = 0;
  let active = false;

  // punkt odniesienia gaśnięcia: pozycja nagłówka w dokumencie
  function measure() {
    for (const f of fades) {
      f.top0 = Math.max(1, f.el.getBoundingClientRect().top + window.scrollY);
    }
  }
  const clamp01 = (v: number) => Math.min(1, Math.max(0, v));

  // cele z PROSTOKĄTÓW (nie ze scrollY): blokada scrolla nakładek
  // (`body{position:fixed}`) zeruje scrollY, a prostokąty zostają
  function targets() {
    const r = hero.getBoundingClientRect();
    target = clamp01(-r.top / (r.height || 1));
    for (const f of fades) {
      f.target = clamp01(1 - f.el.getBoundingClientRect().top / f.top0);
    }
  }
  /** `k` = ułamek drogi do celu w tym kroku; `k >= 1` → skok na cel. */
  function apply(k: number): boolean {
    let moving = false;
    const step = (cur: number, tgt: number): number => {
      if (k >= 1 || Math.abs(tgt - cur) <= 0.0005) return tgt;
      moving = true;
      return cur + (tgt - cur) * k;
    };
    current = step(current, target);
    if (layer) {
      layer.style.transform = `scale(${(1 + HOME_HERO_ZOOM * current).toFixed(4)})`;
    }
    for (const f of fades) {
      f.current = step(f.current, f.target);
      f.el.style.opacity = (1 - HOME_HERO_FADE * f.current).toFixed(3);
    }
    return moving;
  }
  // dociąganie liczone z czasu klatki: po długiej przerwie (karta w tle)
  // jedna spóźniona klatka ląduje dokładnie na celu
  function frame(ts: number) {
    raf = 0;
    const dt = lastT ? ts - lastT : 16.67;
    lastT = ts;
    targets();
    const k = dt > 200 ? 1 : 1 - Math.pow(1 - HOME_HERO_LERP, dt / 16.67);
    if (apply(k)) raf = requestAnimationFrame(frame);
    else lastT = 0;
  }
  function snap() {
    targets();
    apply(1);
  }
  const onScroll = () => {
    if (active && !raf) raf = requestAnimationFrame(frame);
  };

  // liczymy tylko, gdy hero jest w oknie
  new IntersectionObserver((entries) => {
    for (const e of entries) {
      active = e.isIntersecting;
      if (layer) layer.style.willChange = active ? "transform" : "";
      snap();
    }
  }).observe(hero);

  addEventListener("scroll", onScroll, { passive: true });
  let lastW = window.innerWidth;
  addEventListener(
    "resize",
    () => {
      // tylko zmiana szerokości — wysokość zmienia chowany pasek adresu
      if (window.innerWidth === lastW) return;
      lastW = window.innerWidth;
      measure();
      snap();
    },
    { passive: true },
  );
  addEventListener("load", () => {
    measure();
    snap();
  });
  measure();
  snap();
}

/** Uzbraja film i zoom hero (wołane z home-motion.ts). */
export function initHomeHero(): void {
  const hero = document.querySelector<HTMLElement>("[data-home-hero]");
  if (!hero) return;
  initVideo(hero);
  initZoom(hero);
}
