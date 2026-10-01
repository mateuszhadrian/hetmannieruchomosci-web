// Widoczność oferty (2.4, part3 §2.1): na stronę trafia oferta ze
// statusem „aktywna publikacja" i włączonym eksportem. Przełącznik
// `VISIBILITY_RULE` (Z9) pozwala przejść na sam status, gdyby pole
// eksportu nie przetrwało rezygnacji z poprzedniego serwisu.
// Diff widoczności (kto zniknął i dokąd) idzie WYŁĄCZNIE do raportu
// prywatnego — numery i statusy ofert niewidocznych nie są publiczne,
// dlatego poprzedni stan to tylko lista numerów ofert widocznych
// (z `data/offers.json`), nigdy statusy ofert spoza strony.
import { VISIBILITY_RULE } from "../../src/lib/site-config";
import type { BasicListItem } from "./esti-client";
import { warning, type SyncWarning } from "./warnings";

/** status CRM „aktywna publikacja" */
export const ACTIVE_STATUS = 3;
/** pełna lista statusów do odpytania `basic-list` na potrzeby diffu */
export const ALL_STATUSES = [1, 2, 3, 4, 5, 6, 7, 8, 9, 52, 81, 99] as const;

export type VisibilityRule = "status-and-export" | "status-only";

function int(v: unknown): number | undefined {
  if (v === null || v === undefined || v === "") return undefined;
  const n = Number(v);
  return Number.isFinite(n) ? Math.trunc(n) : undefined;
}

/** Czy oferta (surowy rekord albo pozycja `basic-list`) jest widoczna. */
export function isVisible(
  rec: { status?: unknown; offerExport?: unknown },
  rule: VisibilityRule = VISIBILITY_RULE,
): boolean {
  const status = int(rec.status);
  if (status !== ACTIVE_STATUS) return false;
  if (rule === "status-only") return true;
  return int(rec.offerExport) === 1;
}

/** W4 „niespójny eksport": eksport włączony przy statusie innym niż
 *  aktywny. Numer tylko do raportu prywatnego. */
export function exportWarning(rec: {
  status?: unknown;
  offerExport?: unknown;
  number?: unknown;
}): SyncWarning | undefined {
  const status = int(rec.status);
  if (status === undefined || status === ACTIVE_STATUS) return undefined;
  if (int(rec.offerExport) !== 1) return undefined;
  const number = typeof rec.number === "string" ? rec.number : undefined;
  return warning("W4", number, `status=${status}`);
}

export interface VisibilityChange {
  number: string;
  /** status CRM po zmianie; `undefined` = oferty nie ma już w CRM wcale */
  status?: number;
}

export interface VisibilityDiff {
  /** były widoczne, nie są (dokąd poszły — status CRM) */
  gone: VisibilityChange[];
  /** są widoczne, wcześniej nie były */
  appeared: string[];
}

/** Porównanie poprzedniego zbioru widocznych (numery z `data/offers.json`)
 *  z bieżącym stanem CRM. `allStatuses` = `basic-list` z `ALL_STATUSES`. */
export function diffVisibility(
  previousVisible: readonly string[],
  currentVisible: readonly string[],
  allStatuses: readonly BasicListItem[],
): VisibilityDiff {
  const statusByNumber = new Map(allStatuses.map((i) => [i.number, i.status]));
  const current = new Set(currentVisible);
  const previous = new Set(previousVisible);
  const gone: VisibilityChange[] = [];
  for (const number of previousVisible) {
    if (current.has(number)) continue;
    const status = statusByNumber.get(number);
    gone.push(status === undefined ? { number } : { number, status });
  }
  const appeared = currentVisible.filter((n) => !previous.has(n));
  return { gone, appeared };
}
