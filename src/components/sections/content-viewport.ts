// Stała wysokość okna dla sekcji pełnoekranowych i pętli ruchu (wzorzec
// z rodziny projektów; design robił to sondą `--vph` przypinaną zawsze).
//
// Na części telefonów chowanie paska adresu ZMIENIA rozmiar widoku
// (przeglądarki oparte na WebView), więc drga nawet `100svh`, a każda
// sekcja liczona z wysokości okna przeskakuje w rytm paska. Mechanika —
// NIE przypinać profilaktycznie: wartość wpisana z JS nigdy nie jest bit
// w bit tym, co policzyła przeglądarka, więc dopóki sonda `100svh` przy
// STAŁEJ szerokości stoi, układ liczy czysty CSS (Safari, Chrome, desktop,
// testy — zero zmian). Dopiero gdy sonda drgnie bez zmiany szerokości,
// mrozimy wartość SPRZED drgnięcia w `--svh` na hoście (inline wygrywa
// z domyślnym `--svh: 100svh` z CSS). Zmiana szerokości (obrót ekranu)
// zdejmuje przypięcie.
//
// To samo chroni zrzuty pełnej strony: WebKit Playwrighta rozciąga okno
// na czas zrzutu, a sekcja `100svh` urosłaby razem z nim.
let probe: HTMLDivElement | undefined;
let pinned = false;
let baseSvh = 0;

function probeH(): number {
  if (!probe) {
    probe = document.createElement("div");
    probe.style.cssText =
      "position:fixed;top:0;left:0;width:0;height:100svh;" +
      "visibility:hidden;pointer-events:none";
    document.body.appendChild(probe);
  }
  return probe.offsetHeight || window.innerHeight;
}

/** Wysokość okna dla pętli ruchu: przypięta, gdy pasek adresu rusza
 *  widokiem — parallaxy nie szarpią w jego rytm. */
export function vpH(): number {
  return pinned ? baseSvh : probeH();
}

/** Uzbraja sondę i leniwe przypinanie `--svh` na `host`. Wołane ZAWSZE
 *  (stabilność układu, nie dekoracja — poza bramką js-motion); bez JS
 *  zostaje czyste `100svh` z CSS. */
export function armViewportPin(host: HTMLElement): void {
  let lastWidth = window.innerWidth;
  baseSvh = probeH();
  addEventListener(
    "resize",
    () => {
      if (window.innerWidth !== lastWidth) {
        // realna zmiana okna (obrót, zmiana rozmiaru) — od nowa, czysty CSS
        lastWidth = window.innerWidth;
        pinned = false;
        host.style.removeProperty("--svh");
        baseSvh = probeH();
        return;
      }
      if (pinned) return;
      if (probeH() === baseSvh) return; // svh stabilne — niczego nie ruszamy
      pinned = true;
      host.style.setProperty("--svh", `${baseSvh}px`);
    },
    { passive: true },
  );
}
