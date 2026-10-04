// Pole pliku (FormFile.astro) — osobny moduł, ładowany TYLKO tam, gdzie
// formularz ma plik (/praca/); wspólny form-ui.ts nie rośnie o ten kod.
// Trzy rzeczy: nazwa i rozmiar wybranego pliku w strefie, podświetlenie
// strefy przy przeciąganiu i upuszczenie pliku, powrót do stanu
// wyjściowego po `reset` formularza.
// Walidacja pliku (typ, rozmiar) należy do form-ui.ts i reguły `checkCv`
// z lib/cv-file.ts — ten moduł niczego nie odrzuca. Zero tekstów
// w JS: napis stanu wyjściowego czytany z HTML.
import { formatFileSize } from "@/lib/cv-file";

function initFileField(box: HTMLElement): void {
  const input = box.querySelector<HTMLInputElement>('input[type="file"]');
  const zone = box.querySelector<HTMLElement>("[data-file-zone]");
  const name = box.querySelector<HTMLElement>("[data-file-name]");
  const size = box.querySelector<HTMLElement>("[data-file-size]");
  if (!input || !zone || !name || !size) return;
  const idle = name.textContent ?? "";

  const show = () => {
    const file = input.files?.[0];
    name.textContent = file ? file.name : idle;
    size.textContent = file ? formatFileSize(file.size) : "";
    box.toggleAttribute("data-file-picked", Boolean(file));
  };
  input.addEventListener("change", show);
  // `reset` odpala się PRZED wyczyszczeniem pól — odczyt po nim
  input.form?.addEventListener("reset", () => setTimeout(show, 0));

  // Przeciągnij i upuść. Natywne pole przyjmuje upuszczony plik samo
  // (działa bez tego modułu); tu dochodzi podświetlenie strefy i jedna
  // ścieżka dla wszystkich przeglądarek: pierwszy z upuszczonych plików
  // trafia do pola, a `change` idzie tak samo jak po wyborze z okna.
  const drag = (on: boolean) => zone.toggleAttribute("data-drag", on);
  zone.addEventListener("dragover", (e) => {
    e.preventDefault();
    drag(true);
  });
  zone.addEventListener("dragleave", () => drag(false));
  zone.addEventListener("drop", (e) => {
    drag(false);
    const file = e.dataTransfer?.files[0];
    if (!file) return;
    try {
      const one = new DataTransfer();
      one.items.add(file);
      input.files = one.files;
    } catch {
      return; // bez przypisywania plików zostaje zachowanie natywne pola
    }
    e.preventDefault();
    input.dispatchEvent(new Event("change", { bubbles: true }));
  });

  show();
}

/** Uzbraja pola pliku na stronie (`[data-file]`). */
export function initFileFields(root: ParentNode = document): void {
  root.querySelectorAll<HTMLElement>("[data-file]").forEach(initFileField);
}
