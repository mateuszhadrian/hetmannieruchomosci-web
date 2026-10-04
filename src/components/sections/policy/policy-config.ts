// /polityka-prywatnosci/ (Etap 4.7, docs/analiza-polityka.md): stałe
// dokumentu — jedno źródło dla spisu treści, nagłówków sekcji, pasma
// daty i wersji oraz testów.
import { DESKTOP_MIN_PX } from "../../../lib/site-config";

/** Próg układu (spis treści obok treści, `sticky`) — W PARZE z `@media`
 *  w policy.css. */
export const POLICY_DESKTOP_MIN_PX = DESKTOP_MIN_PX;

export const POLICY_HEADING = "Polityka prywatności";

/** Numer wersji dokumentu — podnoszony RĘCZNIE przy każdej zmianie treści
 *  (razem z `POLICY_UPDATED`). */
export const POLICY_VERSION = "1.0";

/** Data ostatniej zmiany treści (ISO, sam dzień). NIE `BUILD_NOW`: data
 *  dokumentu nie może zmieniać się z buildem. */
export const POLICY_UPDATED = "2026-10-04";

/** Data, od której dokument obowiązuje (ISO, sam dzień) — dzień
 *  uruchomienia strony pod domeną główną. `null` = jeszcze nieustalona:
 *  pasmo dokumentu pokazuje znacznik do uzupełnienia. */
export const POLICY_EFFECTIVE: string | null = null;

/** PLACEHOLDER (U9, D23): treść polityki jest PROJEKTEM do przeglądu
 *  prawnika klientki. `true` = strona pokazuje informację o projekcie,
 *  a niewiadome stoją w tekście jako znaczniki (`PolicyTodo.astro`).
 *  Wyłączenie wymaga usunięcia wszystkich znaczników i ustawienia
 *  `POLICY_EFFECTIVE` — pilnują tego testy. */
export const POLICY_DRAFT: boolean = true;

/** Sekcje dokumentu w kolejności: `id` = kotwica (czyste ASCII — adres
 *  sekcji nie zmienia się przy przestawianiu albo dopisywaniu sekcji),
 *  `title` = nagłówek `h2` i pozycja spisu treści. */
export const POLICY_SECTIONS = [
  { id: "administrator", title: "Kto jest administratorem Twoich danych" },
  { id: "zrodla", title: "Skąd mamy Twoje dane" },
  { id: "cele", title: "Po co przetwarzamy dane i na jakiej podstawie" },
  { id: "odbiorcy", title: "Komu przekazujemy dane" },
  {
    id: "poza-eog",
    title: "Przekazywanie danych poza Europejski Obszar Gospodarczy",
  },
  { id: "okresy", title: "Jak długo przechowujemy dane" },
  { id: "prawa", title: "Twoje prawa" },
  { id: "sprzeciw", title: "Prawo sprzeciwu" },
  { id: "cookies", title: "Pliki cookies, statystyka i treści zewnętrzne" },
  { id: "czego-nie-robimy", title: "Czego nie robimy" },
  { id: "skarga", title: "Skarga do organu nadzorczego" },
  { id: "zmiany", title: "Zmiany polityki" },
] as const;

export type PolicySectionId = (typeof POLICY_SECTIONS)[number]["id"];

/** Sekcja wyróżniona wizualnie (art. 21 ust. 4 RODO: prawo sprzeciwu
 *  przedstawia się odrębnie od pozostałych informacji). */
export const POLICY_OBJECTION_ID: PolicySectionId = "sprzeciw";

export const policySectionTitle = (id: PolicySectionId): string =>
  POLICY_SECTIONS.find((s) => s.id === id)!.title;

/** Identyfikator nagłówka sekcji (cel `aria-labelledby`). */
export const policyHeadingId = (id: PolicySectionId): string => `pp-${id}-h`;

const MONTHS_GENITIVE = [
  "stycznia",
  "lutego",
  "marca",
  "kwietnia",
  "maja",
  "czerwca",
  "lipca",
  "sierpnia",
  "września",
  "października",
  "listopada",
  "grudnia",
] as const;

/** „2026-10-04" → „4 października 2026 r." (bez `Intl` — ten sam wynik
 *  w buildzie i w testach, niezależnie od danych regionalnych środowiska). */
export function formatPolicyDate(iso: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  const month = m ? MONTHS_GENITIVE[Number(m[2]) - 1] : undefined;
  if (!m || !month) throw new Error(`zła data dokumentu: ${iso}`);
  return `${Number(m[3])} ${month} ${m[1]} r.`;
}
