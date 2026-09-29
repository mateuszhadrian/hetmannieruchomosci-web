// Zwijane akapity — wspólny mechanizm (markup: CollapsibleText.astro).
// Czysty progressive enhancement: SSR renderuje PEŁNY tekst z przyciskiem
// `hidden`, ten moduł (ładowany ZAWSZE — to funkcja, nie dekoracja: działa
// też przy prefers-reduced-motion) uzbraja przyciski i zwija treść.
// Zwijanie dotyczy wyłącznie układu mobile — stan trzyma atrybut
// [data-collapsed], a efekt (max-height + maska) nadaje CSS komponentu
// pod @media poniżej progu desktopu, więc JS nie potrzebuje media query
// i stan przeżywa przejścia przez próg (desktop pokazuje pełny tekst
// zawsze).

/** Uzbraja wszystkie instancje [data-clp] na stronie (stan startowy:
 *  zwinięte) i podpina przełączanie. Wołać raz, po sparsowaniu DOM. */
export function initCollapsibles(): void {
  for (const host of document.querySelectorAll<HTMLElement>("[data-clp]")) {
    const btn = host.querySelector<HTMLButtonElement>("[data-clp-btn]");
    if (!btn) continue;

    host.setAttribute("data-collapsed", "");
    btn.setAttribute("aria-expanded", "false");
    btn.hidden = false;

    btn.addEventListener("click", () => {
      const collapse = !host.hasAttribute("data-collapsed");
      if (!collapse) {
        host.removeAttribute("data-collapsed");
        btn.setAttribute("aria-expanded", "true");
        return;
      }
      // Zwijanie zabiera dokumentowi wysokość NAD pozycją scrolla —
      // bez korekty przycisk (i palec) ląduje w treści następnej
      // sekcji. Utrzymujemy przycisk w miejscu: pomiar przed/po +
      // scrollBy o różnicę (natywny, natychmiastowy — scroll.md).
      const before = btn.getBoundingClientRect().top;
      host.setAttribute("data-collapsed", "");
      btn.setAttribute("aria-expanded", "false");
      const delta = btn.getBoundingClientRect().top - before;
      if (delta !== 0) window.scrollBy(0, delta);
    });
  }
}
