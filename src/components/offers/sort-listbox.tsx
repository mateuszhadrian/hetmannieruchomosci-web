// Sortowanie (desktop): przycisk `aria-haspopup="listbox"` + lista
// `role="listbox"` z opcjami (design: ptaszek przy wybranej). Klawiatura:
// otwarcie przenosi fokus na wybraną opcję, ↑↓ Home End przesuwają,
// Enter/Space wybiera, Esc i Tab zamykają i wracają na przycisk; klik
// poza listą zamyka. Wybór stosuje się natychmiast (poza panelem).
import { useEffect, useRef, useState } from "preact/hooks";
import { SORT_KEYS, type SortKey } from "../../lib/offers/filters";
import { PANEL, SORT_LABEL } from "../../lib/offers/offers-ui";
import { Icon } from "./OfferCard";

export function SortListbox({
  value,
  onChange,
}: {
  value: SortKey;
  onChange(key: SortKey): void;
}) {
  const [open, setOpen] = useState(false);
  const btn = useRef<HTMLButtonElement>(null);
  const list = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    list.current
      ?.querySelector<HTMLElement>('[role="option"][aria-selected="true"]')
      ?.focus();
    const onDown = (e: MouseEvent) => {
      const t = e.target as Node;
      if (!list.current?.contains(t) && !btn.current?.contains(t))
        setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [open]);

  const close = (refocus: boolean) => {
    setOpen(false);
    if (refocus) btn.current?.focus();
  };
  const choose = (key: SortKey) => {
    close(true);
    if (key !== value) onChange(key);
  };

  return (
    <div class="ol-sort" data-offers-sort>
      <button
        ref={btn}
        type="button"
        class="ol-sort-btn"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls="ol-sort-list"
        onClick={() => setOpen((o) => !o)}
      >
        <Icon name="sort" />
        <span>
          <span class="ol-sort-pre">{PANEL.sort}</span>
          <span data-sort-label={value}>{SORT_LABEL[value]}</span>
        </span>
        <span class="ol-sort-chev" aria-hidden="true">
          <Icon name="chevronDown" />
        </span>
      </button>
      <div
        ref={list}
        id="ol-sort-list"
        class="ol-sort-list"
        role="listbox"
        aria-label={PANEL.sortList}
        hidden={!open}
        onKeyDown={(e) => {
          const opts = Array.from(
            list.current?.querySelectorAll<HTMLElement>('[role="option"]') ??
              [],
          );
          const i = opts.indexOf(document.activeElement as HTMLElement);
          const focusAt = (n: number) =>
            opts[(n + opts.length) % opts.length]?.focus();
          switch (e.key) {
            case "ArrowDown":
              e.preventDefault();
              focusAt(i + 1);
              break;
            case "ArrowUp":
              e.preventDefault();
              focusAt(i - 1);
              break;
            case "Home":
              e.preventDefault();
              focusAt(0);
              break;
            case "End":
              e.preventDefault();
              focusAt(opts.length - 1);
              break;
            case "Enter":
            case " ":
              e.preventDefault();
              if (i >= 0) choose(SORT_KEYS[i]);
              break;
            case "Escape":
              e.preventDefault();
              close(true);
              break;
            case "Tab":
              close(false);
              break;
          }
        }}
      >
        {SORT_KEYS.map((key) => (
          <div
            key={key}
            role="option"
            tabIndex={-1}
            aria-selected={key === value}
            class="ol-sort-opt"
            onClick={() => choose(key)}
          >
            <span>{SORT_LABEL[key]}</span>
            <span class="ol-sort-check" aria-hidden="true">
              <Icon name="check" />
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
