// Załącznik maila (CV z formularza „Praca") — dwie reguły, od których
// zależy czas procesora funkcji (docs/analiza-formularze-b.md §3.1 pkt 5):
// 1. base64 WYŁĄCZNIE natywnie — nigdy pętlą po bajtach;
// 2. treść żądania do usługi pocztowej = zserializowana wiadomość BEZ
//    załącznika + doklejony fragment z base64 (załącznik nie przechodzi
//    przez `JSON.stringify`).
// Czysty TS, bez importu modułów Node: kodowanie jest WYKRYWANE w czasie
// działania, więc brak którejś ścieżki na platformie nie wywraca funkcji
// (pozostałe formularze działają dalej).

export interface Base64Encoder {
  encode: (bytes: Uint8Array) => string;
  /** Która ścieżka działa na tej platformie (do logu funkcji — pomiar
   *  czasu procesora ma wiedzieć, co mierzy). */
  via: "toBase64" | "Buffer";
}

interface BufferLike {
  from(
    data: ArrayBufferLike,
    byteOffset: number,
    length: number,
  ): { toString(encoding: "base64"): string };
}

/** Skąd brać kodowanie — domyślnie środowisko wykonania; parametr dla
 *  testów (obie ścieżki i brak obu). */
export interface Base64Scope {
  /** `Uint8Array.prototype.toBase64` (silnik platformy). */
  toBase64?: unknown;
  /** Globalny `Buffer` (zgodność z Node). */
  Buffer?: unknown;
}

const runtimeScope = (): Base64Scope => ({
  toBase64: (Uint8Array.prototype as { toBase64?: unknown }).toBase64,
  Buffer: (globalThis as { Buffer?: unknown }).Buffer,
});

/**
 * Natywny koder base64 albo `null`, gdy platforma nie ma żadnego:
 * najpierw metoda silnika, potem globalny `Buffer`.
 */
export function pickBase64Encoder(
  scope: Base64Scope = runtimeScope(),
): Base64Encoder | null {
  const native = scope.toBase64;
  if (typeof native === "function") {
    return {
      via: "toBase64",
      encode: (bytes) => (native as () => string).call(bytes),
    };
  }
  const buffer = scope.Buffer as BufferLike | undefined;
  if (buffer && typeof buffer.from === "function") {
    return {
      via: "Buffer",
      encode: (bytes) =>
        buffer
          .from(bytes.buffer, bytes.byteOffset, bytes.byteLength)
          .toString("base64"),
    };
  }
  return null;
}

export interface MailAttachment {
  filename: string;
  contentType: string;
  /** Treść pliku w base64 (alfabet nie wymaga escapowania w JSON-ie). */
  base64: string;
}

/**
 * Treść żądania z załącznikiem: `json` = zserializowana wiadomość (obiekt)
 * bez załącznika; fragment z załącznikiem jest DOKLEJANY — nazwa i typ
 * przechodzą przez `JSON.stringify` osobno (kilkadziesiąt bajtów), treść
 * pliku nie.
 */
export function withAttachment(json: string, file: MailAttachment): string {
  return (
    json.slice(0, -1) +
    `,"attachments":[{"filename":${JSON.stringify(file.filename)}` +
    `,"content_type":${JSON.stringify(file.contentType)}` +
    `,"content":"` +
    file.base64 +
    `"}]}`
  );
}
