// Slug z polskiej nazwy: bez diakrytyków, małe litery, myślniki.
// „Poznań Stare Miasto" → „poznan-stare-miasto"; „Tarnowo Podgórne" →
// „tarnowo-podgorne". Znaki spoza [a-z0-9] stają się separatorem.
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

export function slugify(input: string): string {
  return input
    .toLowerCase()
    .replace(/[ąćęłńóśźż]/g, (ch) => POLISH[ch] ?? ch)
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}
