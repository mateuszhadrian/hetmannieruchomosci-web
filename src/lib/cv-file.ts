// Plik CV (formularz „Praca") — limit, dozwolone typy, sygnatury, nazwa
// załącznika i KONTROLA PLIKU (`checkCv`). Osobny moduł, żeby reguły pliku
// nie trafiały do bundla formularzy bez pola pliku: `validateForm`
// (lib/contact-form.ts) dostaje `checkCv` jako parametr — przekazują go
// strona /praca/ (moduł kliencki) i funkcja, więc o pliku rozstrzyga ta
// sama reguła po obu stronach. Czysty TS, bez DOM i bez modułów Node.
// Z lib/contact-form.ts bierze WYŁĄCZNIE typy (tamten moduł importuje stąd
// wartości — import wartości w drugą stronę zrobiłby cykl).
import type { CvCheck, FormRaw } from "./contact-form";

/** Limit rozmiaru pliku CV — JEDYNE miejsce z tą liczbą. Liczą się z niej:
 *  dopisek w polu, komunikat o za dużym pliku, kontrola w przeglądarce
 *  i próg funkcji. Wartość wynika z limitu czasu procesora funkcji; pomiar
 *  na platformie może ją obniżyć, nie podnosi. */
export const CV_MAX_BYTES = 2 * 1024 * 1024;
/** Sygnatura (początek pliku): PDF, kontener OLE (DOC), ZIP (DOCX). */
export type CvSignature = "pdf" | "ole" | "zip";

/** Dozwolone typy CV. Rozszerzenie rozstrzyga po obu stronach, sygnatura
 *  — w funkcji; typ MIME załącznika bierze się STĄD (po weryfikacji), nie
 *  z deklaracji przeglądarki. */
export const CV_TYPES = [
  { ext: "pdf", label: "PDF", sig: "pdf", mime: "application/pdf" },
  { ext: "doc", label: "DOC", sig: "ole", mime: "application/msword" },
  {
    ext: "docx",
    label: "DOCX",
    sig: "zip",
    mime: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  },
] as const satisfies readonly {
  ext: string;
  label: string;
  sig: CvSignature;
  mime: string;
}[];
export type CvType = (typeof CV_TYPES)[number];

// Teksty i atrybuty liczone z listy typów i ze stałej limitu — FUNKCJE,
// nie stałe: wyrażenie na poziomie modułu trafiłoby do bundla każdej
// strony z formularzem (bundler go nie wytnie).
/** Atrybut `accept` pola pliku — podpowiedź dla systemowego okna wyboru;
 *  rozstrzyga walidacja. */
export const cvAccept = (): string =>
  [...CV_TYPES.map((t) => `.${t.ext}`), ...CV_TYPES.map((t) => t.mime)].join(
    ",",
  );

/** „PDF, DOC lub DOCX" — z listy typów. */
export const cvTypesLabel = (): string =>
  CV_TYPES.map((t) => t.label)
    .join(", ")
    .replace(/, ([^,]+)$/, " lub $1");

/** Limit CV do tekstów interfejsu — liczony ze stałej. */
export const cvLimitLabel = (): string => formatFileSize(CV_MAX_BYTES);

/** Ile bajtów początku pliku wystarcza do rozpoznania sygnatury. */
export const CV_SIGNATURE_BYTES = 8;

const SIGNATURES: readonly { sig: CvSignature; bytes: readonly number[] }[] = [
  { sig: "pdf", bytes: [0x25, 0x50, 0x44, 0x46, 0x2d] }, // %PDF-
  { sig: "ole", bytes: [0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1] },
  { sig: "zip", bytes: [0x50, 0x4b, 0x03, 0x04] }, // PK\x03\x04
];

/** Sygnatura z początku pliku albo "" (nieznana, plik krótszy niż
 *  sygnatura). */
export function detectCvSignature(head: Uint8Array): CvSignature | "" {
  for (const { sig, bytes } of SIGNATURES) {
    if (head.length >= bytes.length && bytes.every((b, i) => head[i] === b)) {
      return sig;
    }
  }
  return "";
}

/** Typ CV po rozszerzeniu nazwy pliku (wielkość liter bez znaczenia). */
export function cvTypeOf(fileName: string): CvType | undefined {
  const ext = /\.([A-Za-z0-9]+)$/.exec(fileName.trim())?.[1].toLowerCase();
  return CV_TYPES.find((t) => t.ext === ext);
}

/** Rozmiar pliku do wyświetlenia: „512 KB", „1,4 MB". */
export function formatFileSize(bytes: number): string {
  const kb = Math.max(1, Math.round(bytes / 1024));
  if (kb < 1024) return `${kb} KB`;
  const mb = Math.round((bytes / (1024 * 1024)) * 10) / 10;
  return `${String(mb).replace(".", ",")} MB`;
}

const CV_NAME_MAX = 80;
const CV_NAME_FALLBACK = "CV";

/**
 * Nazwa załącznika: bez ścieżki, bez znaków diakrytycznych, znaki spoza
 * `[A-Za-z0-9._-]` → `-`, ograniczona długość, rozszerzenie Z WALIDACJI
 * (nie z nazwy). Pusta po oczyszczeniu → nazwa zastępcza.
 */
export function sanitizeCvName(fileName: string, ext: string): string {
  const base = (fileName.split(/[\\/]/).pop() ?? "")
    .replace(/\.[^.]*$/, "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[łŁ]/g, (c) => (c === "ł" ? "l" : "L"))
    .replace(/[^A-Za-z0-9._-]+/g, "-")
    .replace(/-{2,}/g, "-")
    .replace(/^[-.]+|[-.]+$/g, "")
    .slice(0, CV_NAME_MAX)
    .replace(/[-.]+$/, "");
  return `${base || CV_NAME_FALLBACK}.${ext}`;
}

/**
 * Kontrola pliku CV z opisu w surowych polach: `cv:name`, `cv:size`
 * (obie strony) i `cv:sig` (tylko funkcja — sygnatura z początku pliku).
 * Brak pliku → `cv`; rozszerzenie spoza listy, plik pusty albo sygnatura
 * niezgodna z rozszerzeniem → `cv-type`; ponad limit → `cv-size`.
 */
export const checkCv: CvCheck = (raw: FormRaw) => {
  const fileName = (raw["cv:name"] ?? "").trim();
  const size = Number(raw["cv:size"] || "0");
  const type = cvTypeOf(fileName);
  const sig = raw["cv:sig"];
  if (fileName === "") return { field: "cv" };
  if (!type) return { field: "cv-type" };
  if (!Number.isFinite(size) || size > CV_MAX_BYTES)
    return { field: "cv-size" };
  if (size <= 0 || (sig !== undefined && sig !== type.sig)) {
    return { field: "cv-type" };
  }
  return {
    cv: { name: sanitizeCvName(fileName, type.ext), size, mime: type.mime },
  };
};
