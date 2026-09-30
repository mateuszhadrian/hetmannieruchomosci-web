// Widoczny tekst z fragmentu HTML (do kontraktu sanityzacji: tekst przed
// = tekst po). Parser htmlparser2 dekoduje encje jak przeglądarka.
import { DomUtils, parseDocument } from "htmlparser2";

export function textContent(html: string): string {
  return DomUtils.textContent(parseDocument(html));
}
