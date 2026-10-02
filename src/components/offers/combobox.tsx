// Pole z podpowiedziami (lokalizacja, ulica) — wzorzec combobox + listbox:
// `role="combobox"` na polu, `aria-autocomplete="list"`, `aria-expanded`,
// `aria-activedescendant`; ↑↓ przesuwają aktywną opcję, Enter wybiera
// (albo zatwierdza pole, gdy lista zamknięta), Esc zamyka. Podpowiedzi
// liczy wołający (offline, `locations-ui.ts`); komponent nie zna danych.
import { useState } from "preact/hooks";
import { formatInt } from "../../lib/offers/format";
import { PANEL } from "../../lib/offers/offers-ui";
import type { IconName } from "./icons";
import { Icon } from "./OfferCard";

export interface Suggestion {
  key: string;
  label: string;
  /** doprecyzowanie („gm. Tarnowo Podgórne, pow. poznański") */
  info?: string;
  count?: number;
}

export interface ComboboxProps {
  id: string;
  value: string;
  placeholder?: string;
  disabled?: boolean;
  icon?: IconName;
  suggestions: Suggestion[];
  onInput(text: string): void;
  onPick(s: Suggestion): void;
  /** Enter przy zamkniętej liście (zastosuj filtry) */
  onSubmit?(): void;
  labelledBy: string;
}

export function Combobox(p: ComboboxProps) {
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const listId = `${p.id}-list`;
  const show =
    open && !p.disabled && p.value.trim() !== "" && p.suggestions.length > 0;
  const activeId =
    show && active >= 0 && active < p.suggestions.length
      ? `${p.id}-opt-${active}`
      : undefined;

  const pick = (s: Suggestion) => {
    setOpen(false);
    setActive(-1);
    p.onPick(s);
  };

  return (
    <div class="op-combo">
      {p.icon && (
        <span class="op-combo-ico" aria-hidden="true">
          <Icon name={p.icon} />
        </span>
      )}
      <input
        id={p.id}
        class="op-input"
        type="text"
        role="combobox"
        autocomplete="off"
        aria-autocomplete="list"
        aria-expanded={show}
        aria-controls={listId}
        aria-activedescendant={activeId}
        aria-labelledby={p.labelledBy}
        placeholder={p.placeholder}
        disabled={p.disabled}
        value={p.value}
        onInput={(e) => {
          setOpen(true);
          setActive(-1);
          p.onInput(e.currentTarget.value);
        }}
        onFocus={() => setOpen(true)}
        onBlur={() => {
          setOpen(false);
          setActive(-1);
        }}
        onKeyDown={(e) => {
          if (e.key === "ArrowDown" || e.key === "ArrowUp") {
            if (p.suggestions.length === 0) return;
            e.preventDefault();
            setOpen(true);
            const n = p.suggestions.length;
            setActive((a) =>
              e.key === "ArrowDown" ? (a + 1) % n : (a - 1 + n) % n,
            );
          } else if (e.key === "Enter") {
            if (show && active >= 0) {
              e.preventDefault();
              pick(p.suggestions[active]);
            } else {
              e.preventDefault();
              p.onSubmit?.();
            }
          } else if (e.key === "Escape") {
            if (show) {
              e.preventDefault();
              // w bottom sheecie (4.2 c) Esc na dokumencie zamyka cały
              // sheet (overlay.ts) — pierwszy Esc ma zamknąć tylko listę
              e.stopPropagation();
              setOpen(false);
              setActive(-1);
            }
          }
        }}
      />
      <ul
        id={listId}
        class="op-sugg"
        role="listbox"
        aria-label={PANEL.suggestions}
        hidden={!show}
      >
        {show &&
          p.suggestions.map((s, i) => (
            <li
              id={`${p.id}-opt-${i}`}
              key={s.key}
              role="option"
              aria-selected={i === active}
              class="op-sugg-opt"
              data-active={i === active ? "" : undefined}
              // mousedown przed blur pola — klik nie gubi wyboru
              onMouseDown={(e) => {
                e.preventDefault();
                pick(s);
              }}
              onMouseEnter={() => setActive(i)}
            >
              <span class="op-sugg-label">{s.label}</span>
              {s.info && <span class="op-sugg-info">{s.info}</span>}
              {s.count !== undefined && (
                <span class="op-sugg-count">{formatInt(s.count)}</span>
              )}
            </li>
          ))}
      </ul>
    </div>
  );
}
