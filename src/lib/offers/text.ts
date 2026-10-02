// Normalizacja tekstu do porównań w wyszukiwarce (opis, tytuł, ulica,
// numer): małe litery, bez polskich znaków i akcentów, pojedyncze spacje.
// Jedna funkcja dla indeksu (budowanego w SSG) i dla wyspy (klient) —
// obie strony muszą normalizować identycznie, inaczej fraza wpisana
// z polskimi znakami nie trafi w tekst bez nich.
const POLISH: Record<string, string> = {
  ą: "a",
  ć: "c",
  ę: "e",
  ł: "l",
  ń: "n",
  ó: "o",
  ś: "s",
  ź: "z",
  ż: "z",
};

export function normalizeText(input: string): string {
  return input
    .toLowerCase()
    .replace(/[ąćęłńóśźż]/g, (ch) => POLISH[ch] ?? ch)
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}
