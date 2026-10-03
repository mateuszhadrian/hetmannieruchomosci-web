// Ikony detalu oferty (4.3, `oferta.html`) — osobny moduł, żeby nie
// trafiały do bundla wyspy wyszukiwarki razem z `ICONS` (dostęp
// `ICONS[name]` zatrzymuje w bundlu cały obiekt). Konsument: `Icon.astro`.
import { FILLED_ICONS, ICONS, type IconName } from "./icons";

export const DETAIL_ICONS = {
  /** dwa prostokąty — kopiuj numer / link */
  copy: "M9 9h11v11H9z M5 15H4V4h11v1",
  /** drukarka — „Drukuj / PDF" */
  print: "M7 8V3h10v5 M6 17H4V8h16v9h-2 M7 13h10v8H7z",
  /** strzałka ↗ — „Otwórz w mapach", linki zewnętrzne */
  external: "M7 17L17 7 M9 7h8v8",
  /** arkusz udostępniania (Web Share API) */
  share: "M4 12v8a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-8 M16 6l-4-4-4 4 M12 2v13",
  /** Facebook (wypełnione) */
  facebook:
    "M13.5 22v-8h2.7l.4-3.2h-3.1V8.8c0-.9.3-1.6 1.6-1.6h1.7V4.4c-.3 0-1.3-.1-2.5-.1-2.5 0-4.1 1.5-4.1 4.2v2.3H7.4V14h2.8v8z",
  /** WhatsApp (obrys) */
  whatsapp:
    "M12 3a9 9 0 0 0-7.7 13.6L3 21l4.5-1.2A9 9 0 1 0 12 3z M9.2 8.6c.3 3 2.7 5.4 5.7 5.7l1.1-1.1 1.9.9-.3 1.6c-.2.6-.9 1-1.6.9A8.4 8.4 0 0 1 8.5 9c-.1-.7.3-1.4.9-1.6l1.6-.3.9 1.9-1.1 1.1z",
  /** X (wypełnione) */
  x: "M17.5 3h3.1l-6.8 7.8L21.8 21h-6.3l-4.9-6.4L5 21H1.9l7.3-8.3L1.5 3H8l4.4 5.9L17.5 3zm-1.1 16.2h1.7L7 4.7H5.2l11.2 14.5z",
} as const;

export type DetailIconName = IconName | keyof typeof DETAIL_ICONS;

/** Komplet ścieżek dla `.astro` (lista + detal). */
export const ALL_ICONS: Record<DetailIconName, string> = {
  ...ICONS,
  ...DETAIL_ICONS,
};

export const ALL_FILLED: ReadonlySet<DetailIconName> = new Set<DetailIconName>([
  ...FILLED_ICONS,
  "facebook",
  "x",
]);
