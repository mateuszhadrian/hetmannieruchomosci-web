// Sanityzacja opisu oferty (HTML z CRM). Treści nie redagujemy: widoczny
// tekst przed i po ma być identyczny (test `sync-sanitize`). Whitelista
// tagów wg realnie występujących w opisach klientki (docs/kb part3 §5.2);
// `style` znika i zamienia się w klasy z mapy niżej, wszystko inne
// (`class`, `id`, `on*`, `script`, `iframe`, `img`) wycinamy.
import sanitizeHtml from "sanitize-html";

/** Wartości `style` → klasa. `null` = styl bez śladu (domyślny). */
export const STYLE_TO_CLASS: Record<string, string | null> = {
  "text-align: center": "ta-center",
  "text-align: justify": "ta-justify",
  "text-align: left": null,
  "text-decoration: underline": "u",
};

const ALLOWED_TAGS = [
  "p",
  "br",
  "strong",
  "em",
  "ul",
  "ol",
  "li",
  "div",
  "span",
  "a",
  "u",
];

const CLASSES = Object.values(STYLE_TO_CLASS).filter(
  (c): c is string => c !== null,
);

/** `text-align:justify;` → `text-align: justify` (klucz mapy). */
function normalizeStyle(style: string): string[] {
  return style
    .split(";")
    .map((decl) =>
      decl
        .trim()
        .toLowerCase()
        .replace(/\s*:\s*/, ": "),
    )
    .filter(Boolean);
}

function classesFromStyle(style: string | undefined): string[] {
  if (!style) return [];
  const out: string[] = [];
  for (const decl of normalizeStyle(style)) {
    const cls = STYLE_TO_CLASS[decl];
    if (cls) out.push(cls);
  }
  return out;
}

/** Przenosi dozwolone style do klas i gubi wszystkie inne atrybuty. */
function restyle(
  tagName: string,
  attribs: Record<string, string>,
): sanitizeHtml.Tag {
  const classes = classesFromStyle(attribs.style);
  return {
    tagName,
    attribs: classes.length ? { class: classes.join(" ") } : {},
  };
}

/** Dozwolone schematy linku — sprawdzane PRZED dopisaniem rel/target. */
const SAFE_HREF = /^\s*(?:https?:|mailto:)/i;

const OPTIONS: sanitizeHtml.IOptions = {
  allowedTags: ALLOWED_TAGS,
  allowedAttributes: {
    a: ["href", "rel", "target"],
    p: ["class"],
    div: ["class"],
    span: ["class"],
    li: ["class"],
  },
  allowedClasses: {
    p: CLASSES,
    div: CLASSES,
    span: CLASSES,
    li: CLASSES,
  },
  allowedSchemes: ["http", "https", "mailto"],
  allowProtocolRelative: false,
  // b/i → strong/em; u zostaje; style → klasa
  transformTags: {
    b: "strong",
    i: "em",
    p: (tag, attribs) => restyle(tag, attribs),
    div: (tag, attribs) => restyle(tag, attribs),
    span: (tag, attribs) => restyle(tag, attribs),
    li: (tag, attribs) => restyle(tag, attribs),
    a: (tagName, attribs): sanitizeHtml.Tag => ({
      tagName,
      attribs: SAFE_HREF.test(attribs.href ?? "")
        ? { href: attribs.href, rel: "noopener", target: "_blank" }
        : {},
    }),
  },
  // Tekst z wyciętych tagów zostaje (tag znika, treść nie) — poza tymi,
  // których treść nie jest tekstem oferty.
  nonTextTags: ["script", "style", "textarea", "option", "noscript"],
};

/** Ujednolicenie zapisu przed sanityzacją (bez zmiany tekstu). */
export function normalizeHtml(html: string): string {
  return html.replace(/\r\n?/g, "\n").replace(/<br\s*\/>/gi, "<br>");
}

/** Sanityzacja opisu: whitelista, style → klasy, `<br />` → `<br>`,
 *  serie `<br>` ograniczone do dwóch. */
export function sanitizeDescription(html: string | null | undefined): string {
  if (!html) return "";
  const clean = sanitizeHtml(normalizeHtml(html), OPTIONS)
    .replace(/<br\s*\/>/gi, "<br>")
    .replace(/(?:<br>\s*){3,}/gi, "<br><br>");
  return clean.trim();
}

/** Opisy „główny" i „www" po normalizacji — czy to ten sam tekst?
 *  (CRM zapisuje kopię www innym serializerem: `<br />` vs `<br>`). */
export function sameDescription(a: string, b: string): boolean {
  return normalizeHtml(a).trim() === normalizeHtml(b).trim();
}
