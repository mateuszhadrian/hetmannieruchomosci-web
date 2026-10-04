// Wejście na stronę z kotwicą w adresie (np. `/polityka-prywatnosci/#okresy`):
// przeglądarka skacze do celu, zanim układ jest ostateczny (fonty, pomiar
// wysokości paska), a silniki bez kotwiczenia przewijania zostawiają wtedy
// sekcję przesuniętą. Po `load` i po wczytaniu fontów cel jest ustawiany
// ponownie natywnym `scrollTo` — tylko przy zwykłym wejściu (przy
// odświeżeniu i „wstecz" pozycję przywraca przeglądarka) i tylko dopóki
// użytkownik sam nie zaczął przewijać. Kliknięcia odnośników na stronie
// zostają natywne; bez JS kotwice działają jak zwykle.

/** `selector` — które elementy z `id` są celami kotwic tej strony
 *  (identyfikatory są czystym ASCII — bez dekodowania adresu). */
export function armAnchorAlign(selector: string): void {
  const hashTarget = (): HTMLElement | null => {
    const id = location.hash.slice(1);
    const el = id ? document.getElementById(id) : null;
    return el?.matches(selector) ? el : null;
  };
  const [nav] = performance.getEntriesByType(
    "navigation",
  ) as PerformanceNavigationTiming[];
  const target = hashTarget();
  if (!target || (nav && nav.type !== "navigate")) return;

  let touched = false;
  for (const type of ["wheel", "touchstart", "keydown", "pointerdown"]) {
    addEventListener(type, () => (touched = true), {
      once: true,
      passive: true,
    });
  }
  const align = () => {
    if (touched || hashTarget() !== target) return;
    const margin = parseFloat(getComputedStyle(target).scrollMarginTop) || 0;
    const off = target.getBoundingClientRect().top - margin;
    if (Math.abs(off) > 1) window.scrollTo(0, window.scrollY + off);
  };
  if (document.readyState === "complete") align();
  else addEventListener("load", align, { once: true });
  document.fonts?.ready.then(align);
}
