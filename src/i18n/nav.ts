import {
  ABOUT_PATH,
  CONTACT_PATH,
  HOME_PATH,
  JOBS_PATH,
  OFFERS_PATH,
  SELL_PATH,
  SERVICES_PATH,
} from "@/lib/routes";
import { SHOW_PRACA } from "@/lib/site-config";

// Pozycje menu głównego (PL-only) wg designu: sześć pozycji płaskich.
// Stopka składa „mapę strony" z tej samej tablicy (+ strona główna).
export interface NavItem {
  id: string;
  label: string;
  /** Etykieta w menu mobilnym, gdy różni się od paska desktop. */
  sheetLabel?: string;
  href: string;
}

const ALL_NAV_ITEMS: NavItem[] = [
  {
    id: "oferty",
    label: "Oferty",
    sheetLabel: "Przeglądaj oferty",
    href: OFFERS_PATH,
  },
  { id: "sprzedaj", label: "Sprzedaj z nami", href: SELL_PATH },
  { id: "o-nas", label: "O nas", href: ABOUT_PATH },
  { id: "uslugi", label: "Usługi", href: SERVICES_PATH },
  { id: "praca", label: "Praca", href: JOBS_PATH },
  { id: "kontakt", label: "Kontakt", href: CONTACT_PATH },
];

/** Menu główne — „Praca" za przełącznikiem SHOW_PRACA. */
export const mainNavItems: NavItem[] = ALL_NAV_ITEMS.filter(
  (item) => item.id !== "praca" || SHOW_PRACA,
);

/** Mapa strony w stopce: strona główna + menu główne. */
export const footerNavItems: NavItem[] = [
  { id: "home", label: "Strona główna", href: HOME_PATH },
  ...mainNavItems,
];
