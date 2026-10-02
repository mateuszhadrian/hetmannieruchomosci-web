// Panel filtrów (desktop, 4.2 b) — wygląd docs/analiza-oferty.md §1.2.
// Panel edytuje STAN ROBOCZY (`Draft` = mapa nazw parametrów adresu →
// surowy tekst, parsowana przez `parseSearch`, więc pole i adres czytają
// wartości identycznie); „Pokaż N ofert" stosuje draft, „Wyczyść" zeruje
// i stosuje (R20). Pola nieadekwatne do typu z draftu znikają z panelu
// rozszerzonego (`isFieldRelevant`), a ich wartości są kasowane.
import {
  isFieldRelevant,
  PARAM,
  type TypeField,
} from "../../lib/offers/filters";
import {
  formatShowCount,
  TRANSACTION_LABEL,
  TYPE_LABEL,
} from "../../lib/offers/format";
import {
  nodeById,
  nodeLabel,
  streetsUnder,
  suggestLocations,
  suggestStreets,
} from "../../lib/offers/locations-ui";
import {
  FURNISHED_LABEL,
  MARKET_LABEL,
  PANEL,
  UI,
} from "../../lib/offers/offers-ui";
import {
  FURNISHED,
  MAIN_TYPES,
  MARKETS,
  TRANSACTIONS,
  type MainType,
} from "../../lib/offers/enums";
import type { LocationsFile } from "../../lib/offers/schema";
import { Combobox } from "./combobox";
import { Icon } from "./OfferCard";

export type Draft = Record<string, string>;

/** Które klucze draftu kasuje zmiana typu (pole nieadekwatne). */
const FIELD_PARAMS: Record<TypeField, readonly string[]> = {
  plotArea: [],
  rooms: [PARAM.roomsFrom, PARAM.roomsTo],
  floor: [PARAM.floorFrom, PARAM.floorTo],
  floorsTo: [PARAM.floorsTo],
  year: [PARAM.yearFrom, PARAM.yearTo],
  elevator: [PARAM.elevator],
  furnished: [PARAM.furnished],
};

export function pruneDraft(
  draft: Draft,
  mainType: MainType | undefined,
): Draft {
  const next = { ...draft };
  for (const field of Object.keys(FIELD_PARAMS) as TypeField[]) {
    if (isFieldRelevant(mainType, field)) continue;
    for (const key of FIELD_PARAMS[field]) delete next[key];
  }
  return next;
}

export interface SearchPanelProps {
  draft: Draft;
  onDraft(next: Draft): void;
  locations: LocationsFile;
  /** liczba wyników dla draftu; `null` = liczenie (dane w drodze) */
  count: number | null;
  moreOpen: boolean;
  onMore(open: boolean): void;
  onApply(): void;
  onClear(): void;
  /** tekst w polu lokalizacji (poza draftem — draft trzyma id węzła) */
  locText: string;
  onLocText(text: string): void;
  streetText: string;
  onStreetText(text: string): void;
}

export function SearchPanel(p: SearchPanelProps) {
  const d = p.draft;
  const set = (key: string, value: string | undefined) => {
    const next = { ...d };
    if (value === undefined || value === "") delete next[key];
    else next[key] = value;
    p.onDraft(next);
  };
  const toggle = (key: string, value: string) =>
    set(key, d[key] === value ? undefined : value);
  const mainType = d[PARAM.mainType] as MainType | undefined;
  const relevant = (f: TypeField) => isFieldRelevant(mainType, f);

  const locId = d[PARAM.location];
  const locNode = locId ? nodeById(p.locations.nodes, locId) : undefined;
  const locSugg = suggestLocations(p.locations.nodes, p.locText).map((n) => ({
    key: n.id,
    label: nodeLabel(n),
    info: n.info,
    count: n.count,
  }));
  const streets = locId ? streetsUnder(p.locations.streets, locId) : [];
  const streetSugg = suggestStreets(streets, p.streetText).map((s) => ({
    key: s.name,
    label: `${s.type} ${s.name}`,
    count: s.count,
  }));

  const rooms = (n: number) => {
    const from = d[PARAM.roomsFrom];
    const to = d[PARAM.roomsTo];
    const on =
      n === 5
        ? from === "5" && to === undefined
        : from === String(n) && to === String(n);
    return (
      <button
        type="button"
        class="ol-pill ol-pill--sm"
        aria-pressed={on}
        key={n}
        onClick={() => {
          const next = { ...d };
          delete next[PARAM.roomsFrom];
          delete next[PARAM.roomsTo];
          if (!on) {
            next[PARAM.roomsFrom] = String(n);
            if (n < 5) next[PARAM.roomsTo] = String(n);
          }
          p.onDraft(next);
        }}
      >
        {n === 5 ? PANEL.roomsMax : n}
      </button>
    );
  };

  const numInput = (key: string, placeholder: string, suffix?: string) => (
    <label class="op-num">
      <span class="sr-only">{placeholder}</span>
      <input
        class="op-input"
        type="text"
        inputMode="numeric"
        autocomplete="off"
        placeholder={placeholder}
        value={d[key] ?? ""}
        onInput={(e) => set(key, e.currentTarget.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            p.onApply();
          }
        }}
      />
      {suffix && <span class="op-suffix">{suffix}</span>}
    </label>
  );
  const textInput = (key: string, id: string, placeholder: string) => (
    <input
      id={id}
      aria-labelledby={`${id}-l`}
      class="op-input"
      type="text"
      autocomplete="off"
      placeholder={placeholder}
      value={d[key] ?? ""}
      onInput={(e) => set(key, e.currentTarget.value)}
      onKeyDown={(e) => {
        if (e.key === "Enter") {
          e.preventDefault();
          p.onApply();
        }
      }}
    />
  );
  const seg = (
    key: string,
    options: readonly { value: string | undefined; label: string }[],
  ) => (
    <div class="op-seg" role="group">
      {options.map((o) => (
        <button
          type="button"
          key={o.label}
          aria-pressed={(d[key] ?? undefined) === o.value}
          onClick={() => set(key, o.value)}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
  const actions = (
    <div class="op-actions">
      <button type="button" class="op-btn" onClick={p.onClear}>
        {PANEL.clear}
      </button>
      <button
        type="button"
        class="op-btn op-btn--primary"
        data-offers-apply
        aria-busy={p.count === null}
        onClick={p.onApply}
      >
        {p.count === null ? PANEL.counting : formatShowCount(p.count)}
      </button>
    </div>
  );
  const field = (
    id: string,
    label: string,
    cls: string,
    body: preact.ComponentChildren,
  ) => (
    <div class={`op-f ${cls}`}>
      <span class="op-label" id={`${id}-l`}>
        {label}
      </span>
      {body}
    </div>
  );

  return (
    <div class="op" role="region" aria-label={PANEL.region} data-offers-panel>
      <div class="op-grid">
        {field(
          "op-typ",
          PANEL.type,
          "op-f--type",
          <div class="op-pills" role="group" aria-labelledby="op-typ-l">
            <button
              type="button"
              class="ol-pill ol-pill--sm"
              aria-pressed={mainType === undefined}
              onClick={() =>
                p.onDraft(pruneDraft({ ...d, [PARAM.mainType]: "" }, undefined))
              }
            >
              {UI.all}
            </button>
            {MAIN_TYPES.map((t) => (
              <button
                type="button"
                class="ol-pill ol-pill--sm"
                key={t}
                aria-pressed={mainType === t}
                onClick={() =>
                  p.onDraft(pruneDraft({ ...d, [PARAM.mainType]: t }, t))
                }
              >
                {TYPE_LABEL[t]}
              </button>
            ))}
          </div>,
        )}
        {field(
          "op-tr",
          PANEL.transaction,
          "op-f--tr",
          seg(PARAM.transaction, [
            { value: undefined, label: UI.all },
            ...TRANSACTIONS.map((t) => ({
              value: t,
              label: TRANSACTION_LABEL[t],
            })),
          ]),
        )}
        {field(
          "op-loc",
          PANEL.location,
          "op-f--loc",
          <>
            <Combobox
              id="op-loc"
              labelledBy="op-loc-l"
              icon="search"
              value={p.locText}
              placeholder={PANEL.locationPlaceholder}
              suggestions={locSugg}
              onInput={p.onLocText}
              onPick={(s) => {
                p.onLocText("");
                p.onStreetText("");
                const next: Draft = { ...d, [PARAM.location]: s.key };
                delete next[PARAM.street];
                p.onDraft(next);
              }}
              onSubmit={p.onApply}
            />
            {locNode && (
              <ul class="op-chips" data-offers-chips>
                <li class="op-chip">
                  <span>{nodeLabel(locNode)}</span>
                  <button
                    type="button"
                    class="op-chip-x"
                    aria-label={`${PANEL.removeLocation}: ${nodeLabel(locNode)}`}
                    onClick={() => {
                      const next = { ...d };
                      delete next[PARAM.location];
                      delete next[PARAM.street];
                      p.onStreetText("");
                      p.onDraft(next);
                    }}
                  >
                    <Icon name="close" />
                  </button>
                </li>
              </ul>
            )}
          </>,
        )}
        {field(
          "op-cena",
          PANEL.price,
          "op-f--price",
          <div class="op-range">
            {numInput(PARAM.priceFrom, PANEL.from, PANEL.currency)}
            {numInput(PARAM.priceTo, PANEL.to, PANEL.currency)}
          </div>,
        )}
        {field(
          "op-pow",
          PANEL.area,
          "op-f--area",
          <div class="op-range">
            {numInput(PARAM.areaFrom, PANEL.from, PANEL.areaUnit)}
            {numInput(PARAM.areaTo, PANEL.to, PANEL.areaUnit)}
          </div>,
        )}
        <div class="op-f op-f--actions">
          <button
            type="button"
            class="op-more"
            aria-expanded={p.moreOpen}
            aria-controls="op-more"
            data-offers-more
            onClick={() => p.onMore(!p.moreOpen)}
          >
            <span>{p.moreOpen ? PANEL.less : PANEL.more}</span>
            <span class="op-more-chev" aria-hidden="true">
              <Icon name="chevronDown" />
            </span>
          </button>
          {!p.moreOpen && actions}
        </div>
      </div>
      {p.moreOpen && (
        <div class="op-grid op-grid--more" id="op-more">
          {field(
            "op-ulica",
            PANEL.street,
            "op-f--street",
            <Combobox
              id="op-ulica"
              labelledBy="op-ulica-l"
              value={d[PARAM.street] ?? p.streetText}
              placeholder={PANEL.streetPlaceholder}
              disabled={!locId}
              suggestions={streetSugg}
              onInput={(t) => {
                p.onStreetText(t);
                set(PARAM.street, t);
              }}
              onPick={(s) => {
                p.onStreetText(s.key);
                set(PARAM.street, s.key);
              }}
              onSubmit={p.onApply}
            />,
          )}
          {relevant("rooms") &&
            field(
              "op-pok",
              PANEL.rooms,
              "op-f--rooms",
              <div class="op-pills" role="group" aria-labelledby="op-pok-l">
                {[1, 2, 3, 4, 5].map(rooms)}
              </div>,
            )}
          {relevant("floor") &&
            field(
              "op-pietro",
              PANEL.floor,
              "op-f--floor",
              <div class="op-range">
                {numInput(PARAM.floorFrom, PANEL.from)}
                {numInput(PARAM.floorTo, PANEL.to)}
              </div>,
            )}
          {relevant("year") &&
            field(
              "op-rok",
              PANEL.year,
              "op-f--year",
              <div class="op-range">
                {numInput(PARAM.yearFrom, PANEL.from, PANEL.yearSuffix)}
                {numInput(PARAM.yearTo, PANEL.to, PANEL.yearSuffix)}
              </div>,
            )}
          {field(
            "op-rynek",
            PANEL.market,
            "op-f--market",
            seg(PARAM.market, [
              { value: undefined, label: PANEL.marketAny },
              ...MARKETS.map((m) => ({ value: m, label: MARKET_LABEL[m] })),
            ]),
          )}
          {relevant("elevator") &&
            field(
              "op-winda",
              PANEL.elevator,
              "op-f--elevator",
              seg(PARAM.elevator, [
                { value: undefined, label: PANEL.any },
                { value: "tak", label: PANEL.yes },
                { value: "nie", label: PANEL.no },
              ]),
            )}
          {relevant("furnished") &&
            field(
              "op-umebl",
              PANEL.furnished,
              "op-f--furnished",
              <div class="op-pills" role="group" aria-labelledby="op-umebl-l">
                <button
                  type="button"
                  class="ol-pill ol-pill--sm"
                  aria-pressed={d[PARAM.furnished] === undefined}
                  onClick={() => set(PARAM.furnished, undefined)}
                >
                  {PANEL.any}
                </button>
                {FURNISHED.map((f) => (
                  <button
                    type="button"
                    class="ol-pill ol-pill--sm"
                    key={f}
                    aria-pressed={d[PARAM.furnished] === f}
                    onClick={() => toggle(PARAM.furnished, f)}
                  >
                    {FURNISHED_LABEL[f]}
                  </button>
                ))}
              </div>,
            )}
          {relevant("floorsTo") &&
            field(
              "op-pietra",
              PANEL.floors,
              "op-f--floors",
              <div class="op-range op-range--one">
                {numInput(PARAM.floorsTo, PANEL.to, PANEL.floorsSuffix)}
              </div>,
            )}
          {field(
            "op-opis",
            PANEL.description,
            "op-f--desc",
            textInput(
              PARAM.description,
              "op-opis",
              PANEL.descriptionPlaceholder,
            ),
          )}
          {field(
            "op-numer",
            PANEL.number,
            "op-f--number",
            textInput(PARAM.number, "op-numer", PANEL.numberPlaceholder),
          )}
          <div class="op-f op-f--actions op-f--actions-more">{actions}</div>
        </div>
      )}
    </div>
  );
}
