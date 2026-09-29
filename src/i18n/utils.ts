import { ui, defaultLang } from "./ui";

export type Lang = keyof typeof ui;
export type UiKey = keyof (typeof ui)[typeof defaultLang];

// Zwraca funkcję t() związaną z danym językiem.
// Brakujący klucz w danym języku spada na język domyślny (fallback).
export function useTranslations(lang: Lang) {
  return function t(key: UiKey): string {
    return ui[lang][key] ?? ui[defaultLang][key];
  };
}
