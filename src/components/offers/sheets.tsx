// Bottom sheety listy ofert (4.2 c): „Filtry" i „Sortuj" na szkielecie
// scripts/overlay.ts (focus-trap, Esc, scrim, swipe-down, blokada scrolla,
// reset scrollTop) — mechaniki NIE powielamy, używamy `window.overlay`.
//
// Moduł ładowany DYNAMICZNIE przez wyspę przy pierwszym otwarciu (zero
// bajtów na desktopie i w pomiarze LHCI). Powłoki sheetów (scrim, panel,
// uchwyt, nagłówek h2 + X) powstają bezpośrednio w <body> — POZA drzewem
// vdom wyspy: overlay.ts portalizuje każdy `[data-overlay]` do <body>,
// a Preact przy kolejnym renderze wstawiałby taki węzeł z powrotem na
// swoje miejsce; powłoka w SSR wewnątrz wyspy psułaby też hydratację.
// Treść (ten sam `SearchPanel` co na desktopie, albo segmenty sortowania)
// renderuje wyspa jako OSOBNY root Preact do kontenera `[data-sheet-mount]`.
// Powłoka to statyczny HTML bez treści z CRM (docs/analiza-oferty.md §13.2).
import { useState } from "preact/hooks";
import { SORT_KEYS, type SortKey } from "../../lib/offers/filters";
import { PANEL, SORT_LABEL } from "../../lib/offers/offers-ui";
import { ICON_VIEWBOX, ICONS } from "./icons";
import {
  PanelActions,
  SearchPanel,
  type SearchPanelProps,
} from "./search-panel";

export const SHEET_ID = {
  filters: "ol-sheet-filters",
  sort: "ol-sheet-sort",
} as const;
export type SheetKind = keyof typeof SHEET_ID;

const TITLE: Record<SheetKind, string> = {
  filters: PANEL.filtersSheet,
  sort: PANEL.sortSheet,
};

function shellHtml(kind: SheetKind): string {
  const id = SHEET_ID[kind];
  return (
    `<div class="ols-ov" id="${id}" data-overlay data-overlay-kind="sheet" ` +
    `role="dialog" aria-modal="true" aria-labelledby="${id}-h" hidden>` +
    `<div class="ols" data-overlay-panel tabindex="-1" data-sheet="${kind}">` +
    `<div class="ols-head" data-overlay-drag>` +
    `<span class="ols-grab" aria-hidden="true"></span>` +
    `<div class="ols-bar"><h2 class="ols-h" id="${id}-h">${TITLE[kind]}</h2>` +
    `<button type="button" class="ols-x" data-overlay-close aria-label="${PANEL.close}">` +
    `<svg viewBox="${ICON_VIEWBOX}" width="1em" height="1em" fill="none" stroke="currentColor" ` +
    `stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">` +
    `<path d="${ICONS.close}"></path></svg></button></div></div>` +
    `<div class="ols-mount" data-sheet-mount></div>` +
    `</div></div>`
  );
}

/** Buduje obie powłoki w <body> (raz). Zwraca kontener treści sheetu. */
export function ensureSheet(kind: SheetKind): HTMLElement {
  let root = document.getElementById(SHEET_ID[kind]);
  if (!root) {
    const tpl = document.createElement("template");
    tpl.innerHTML = shellHtml(kind);
    root = tpl.content.firstElementChild as HTMLElement;
    document.body.appendChild(root);
  }
  return root.querySelector<HTMLElement>("[data-sheet-mount]")!;
}

/** Treść sheetu „Filtry": ten sam panel w wariancie `sheet` (pola jedno
 *  pod drugim) w obszarze przewijanym + sticky stopka Wyczyść / Pokaż.
 *  „Pokaż" stosuje i zamyka (wyspa); „Wyczyść" zeruje i stosuje, sheet
 *  zostaje (R30). */
export function FiltersSheet(p: SearchPanelProps) {
  return (
    <>
      <div class="ols-body" data-overlay-scroll>
        <SearchPanel {...p} variant="sheet" />
      </div>
      <div class="ols-foot">
        <PanelActions
          count={p.count}
          countFailed={p.countFailed}
          onApply={p.onApply}
          onClear={p.onClear}
        />
      </div>
    </>
  );
}

export interface SortSheetProps {
  /** sortowanie zastosowane (stan początkowy wyboru) */
  value: SortKey;
  /** „Zastosuj" — wyspa stosuje i zamyka; inne drogi zamknięcia porzucają */
  onApply(key: SortKey): void;
}

/** Treść sheetu „Sortuj": dwie grupy segmentów (data dodania / cena)
 *  + „Zastosuj"; wybór tymczasowy (R31, parytet designu `pendSort`). */
export function SortSheet(p: SortSheetProps) {
  const [pending, setPending] = useState<SortKey>(p.value);
  const group = (label: string, keys: readonly SortKey[], short: string[]) => (
    <div class="ols-group">
      <span class="op-label">{label}</span>
      <div class="op-seg op-seg--sheet" role="group" aria-label={label}>
        {keys.map((key, i) => (
          <button
            type="button"
            key={key}
            aria-pressed={pending === key}
            data-sort-option={key}
            onClick={() => setPending(key)}
          >
            {short[i]}
          </button>
        ))}
      </div>
    </div>
  );
  return (
    <>
      <div class="ols-body ols-body--sort" data-overlay-scroll>
        {group(
          PANEL.sortByDate,
          [SORT_KEYS[0], SORT_KEYS[1]],
          [SORT_LABEL.newest, SORT_LABEL.oldest],
        )}
        {group(
          PANEL.sortByPrice,
          [SORT_KEYS[2], SORT_KEYS[3]],
          [PANEL.priceAsc, PANEL.priceDesc],
        )}
      </div>
      <div class="ols-foot">
        <button
          type="button"
          class="op-btn op-btn--primary op-btn--wide"
          data-offers-sort-apply
          onClick={() => p.onApply(pending)}
        >
          {PANEL.sortApply}
        </button>
      </div>
    </>
  );
}
