// Wyspa wyszukiwarki `/oferty/` (4.2 b + c) — JEDYNA wyspa projektu
// (`client:load` w OffersListPage.astro). Renderuje się w SSR przez Preact
// i hydratuje na TYM SAMYM markupie: stan początkowy =
// `parseSearch(pathname, "")` po obu stronach; po montażu wyspa czyta
// `location.search` i przerenderowuje tylko, gdy stan różni się od
// domyślnego (zero mutacji DOM siatki przy wejściu bez parametrów — kontrakt
// e2e).
//
// Dane: `entries` = wpisy indeksu TRASY (SSR i hydratacja), `complete` =
// `/oferty/` niesie komplet; reszta (`/oferty/index.json`) dociągana
// w requestIdleCallback na listach SSG albo natychmiast, gdy stan tego
// wymaga; `index-text.json` dopiero przy „szukaj w opisie". Skeleton
// tylko wtedy, gdy stanu nie da się wyrenderować z tego, co jest; błąd
// pobrania → blok z „Ponów" (bez cichego fallbacku na pulę trasy — 4.2 c).
//
// Mobile (< 1025, 4.2 c): pasek narzędzi „Filtruj" / „{sortowanie}"
// otwiera bottom sheety na overlay.ts. Panel filtrów jest JEDEN: SSR
// renderuje go inline (hydratacja bez mutacji na desktopie; < 1025
// `display:none`), po montażu host = matchMedia(DESKTOP_MIN_PX) — poniżej
// progu panel inline jest odmontowany, a ten sam `SearchPanel` z tym samym
// draftem renderuje się w sheecie jako OSOBNY root Preact (`render()` do
// kontenera powłoki w <body>, poza vdom wyspy — docs/analiza-oferty.md
// §13.2). Kod sheetów ładuje dynamiczny `import()` przy pierwszym
// otwarciu (prefetch po pierwszym dotknięciu, nie w idle).
//
// Logika filtrów, sortowania, paginacji i adresu WYŁĄCZNIE z
// `src/lib/offers/filters.ts` (`parseSearch`, `applyFilters`,
// `sortEntries`, `statusCounts`, `targetPath`, `serializeSearch`);
// karty z `OfferCard.tsx` (ten sam komponent co SSG).
import { render } from "preact";
import {
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "preact/hooks";
import {
  applyFilters,
  DEFAULT_SORT,
  DEFAULT_STATE,
  PAGE_SIZE,
  PARAM,
  parsePath,
  parseSearch,
  serializeSearch,
  sortEntries,
  STATUS_GROUPS,
  statusCounts,
  statusGroupOf,
  targetPath,
  type SearchState,
  type SortKey,
  type StatusGroup,
} from "../../lib/offers/filters";
import { formatInt, formatOffersCount } from "../../lib/offers/format";
import type {
  OfferIndexEntry,
  OffersIndex,
} from "../../lib/offers/index-entry";
import { nodeOfSlug } from "../../lib/offers/locations-ui";
import {
  EDGE,
  listHeading,
  PANEL,
  SORT_LABEL,
  STATUS_GROUP_LABEL,
  STATUS_GROUP_TITLE,
  UI,
  ZERO_RESULTS,
} from "../../lib/offers/offers-ui";
import type { LocationsFile } from "../../lib/offers/schema";
import { OFFERS_PATH } from "../../lib/offers/urls";
import { DESKTOP_MIN_PX, OFFERS_LIST_VIEW } from "../../lib/site-config";
import { Icon, OfferCard } from "./OfferCard";
import { Pagination } from "./pagination";
import { pruneDraft, SearchPanel, type Draft } from "./search-panel";
import type { SheetKind } from "./sheets";
import { SortListbox } from "./sort-listbox";

export interface SearchIslandProps {
  /** wpisy indeksu trasy (SSG) — hydratacja na tym samym zbiorze */
  entries: OfferIndexEntry[];
  /** trasa niesie KOMPLET ofert (`/oferty/`) — bez pobierania indeksu */
  complete: boolean;
  locations: LocationsFile;
  /** ścieżka trasy (`/oferty/mieszkanie-na-sprzedaz/`) */
  pathname: string;
  /** „teraz" builda (plakietka „Nowość") */
  nowIso: string;
  /** nawigacja (a): linki do list SSG (rodzaje z licznikami, pastylki
   *  lokalizacji rodzaju) — pod JS ukryta (sheety i panel ją zastępują,
   *  R28), widoczna bez JS przez `<noscript>`; liczona w Astro */
  nav: { kinds: NavPill[]; locations: NavPill[] };
}

export interface NavPill {
  href: string;
  label: string;
  count: number;
}

type SheetsModule = typeof import("./sheets");
type PanelHost = "inline" | "sheet";
type ListView = "grid" | "list";

const INDEX_URL = `${OFFERS_PATH}index.json`;
const TEXT_URL = `${OFFERS_PATH}index-text.json`;

function sameState(a: SearchState, b: SearchState): boolean {
  return (
    a.locationSlug === b.locationSlug &&
    a.invalid === b.invalid &&
    serializeSearch(a).toString() === serializeSearch(b).toString()
  );
}

/** Draft panelu ze stanu zastosowanego (bez statusów, sortu, strony);
 *  slug z adresu → id węzła (chip). */
function draftFrom(
  state: SearchState,
  pool: readonly OfferIndexEntry[],
): Draft {
  const q = serializeSearch({
    ...state,
    statuses: DEFAULT_STATE.statuses,
    sort: DEFAULT_SORT,
    page: 1,
  });
  const d: Draft = Object.fromEntries(q);
  if (state.location === undefined && state.locationSlug !== undefined) {
    const id = nodeOfSlug(pool, state.locationSlug);
    if (id !== undefined) d[PARAM.location] = id;
  }
  return pruneDraft(d, state.mainType);
}

function stateFromDraft(draft: Draft, base: SearchState): SearchState {
  const s = parseSearch(OFFERS_PATH, new URLSearchParams(draft));
  return { ...s, statuses: base.statuses, sort: base.sort, page: 1 };
}

function onIdle(fn: () => void): () => void {
  if (typeof requestIdleCallback === "function") {
    const id = requestIdleCallback(fn, { timeout: 2000 });
    return () => cancelIdleCallback(id);
  }
  const id = setTimeout(fn, 300);
  return () => clearTimeout(id);
}

/** Priorytet wczytywania zdjęć: pierwsze trzy karty w pierwszym ekranie. */
const priority = (i: number) => (i === 0 ? "high" : i < 3 ? "eager" : "lazy");

let sheetsPromise: Promise<SheetsModule> | null = null;
/** Chunk sheetów — jeden `import()` na stronę. */
const loadSheets = () => (sheetsPromise ??= import("./sheets"));

export function SearchIsland(p: SearchIslandProps) {
  const route = useMemo(() => parsePath(p.pathname), [p.pathname]);
  const initial = useMemo(() => parseSearch(p.pathname, ""), [p.pathname]);
  const [applied, setAppliedRaw] = useState<SearchState>(initial);
  const [all, setAll] = useState<OfferIndexEntry[] | null>(
    p.complete ? p.entries : null,
  );
  const [texts, setTexts] = useState<Record<string, string> | null>(null);
  const [failed, setFailed] = useState({ all: false, texts: false });
  /** Nowy stan zastosowany kasuje STARĄ flagę błędu w tym samym renderze
   *  (batch) — inaczej jeden kadr pokazywał komunikat z poprzedniej próby,
   *  zanim efekt wystartował nową (wyścig z klikiem w „Ponów"). */
  const setApplied = (next: SearchState) => {
    setAppliedRaw(next);
    setFailed((f) => (f.all || f.texts ? { all: false, texts: false } : f));
  };
  const [draft, setDraft] = useState<Draft>(() =>
    draftFrom(initial, p.entries),
  );
  const [locText, setLocText] = useState("");
  const [streetText, setStreetText] = useState("");
  const [moreOpen, setMoreOpen] = useState(false);
  // 4.2 c: host panelu, otwarty sheet, widok siatka/lista
  const [host, setHost] = useState<PanelHost>("inline");
  const [sheet, setSheet] = useState<SheetKind | null>(null);
  const [view, setView] = useState<ListView>(OFFERS_LIST_VIEW);
  const loading = useRef({ all: false, texts: false });
  /** żądanie w drodze — jako STAN (ref nie przerenderuje): ponowienie po
   *  błędzie ma pokazać `aria-busy`, choć flaga błędu zostaje do sukcesu */
  const [pending, setPending] = useState({ all: false, texts: false });
  /** ręczne „Ponów" w toku: blok błędu ZOSTAJE zamontowany (przycisk
   *  `disabled` + `aria-busy`) do wyniku — synchroniczne odmontowanie
   *  w handlerze kliknięcia gubiło klik (Playwright: „element was
   *  detached from the DOM, retrying"; flaky na main 2026-10-03) */
  const [retrying, setRetrying] = useState(false);
  const sheets = useRef<SheetsModule | null>(null);
  const root = useRef<HTMLDivElement>(null);

  const pool = all ?? p.entries;
  const nodes = p.locations.nodes;

  /** Czy stan da się policzyć z puli trasy (bez pełnego indeksu). */
  const withinRoute = (s: SearchState) =>
    all !== null ||
    (s.mainType === route.mainType &&
      s.transaction === route.transaction &&
      s.locationSlug === route.locationSlug);

  const needsAll = !withinRoute(applied);
  const needsTexts = applied.description !== undefined && texts === null;
  const renderable = !needsAll && !needsTexts;
  const busy = pending.all || pending.texts;
  // Błąd pokazujemy, gdy ostatnia próba padła i NIC nie jest w drodze
  // (automatyczna próba po zmianie stanu dostaje skeleton, nie stary
  // komunikat); wyjątek: ręczne ponowienie trzyma blok z zajętym przyciskiem.
  const fetchFailed =
    ((needsAll && failed.all) || (needsTexts && failed.texts)) &&
    (!busy || retrying);

  // Flaga błędu schodzi DOPIERO po udanym pobraniu, nie na starcie
  // ponowienia: zdjęcie jej na starcie odmontowywało blok błędu i montowało
  // go z powrotem po kolejnej porażce — klik w „Ponów" trafiał w węzeł
  // właśnie odłączany (e2e: „element was detached from the DOM", flaky
  // na main 2026-10-03). Ponowienie w trakcie trwającego żądania nic nie
  // robi — żądanie i tak dobiegnie końca.
  const loadAll = () => {
    if (loading.current.all || all !== null) return;
    loading.current.all = true;
    setPending((q) => ({ ...q, all: true }));
    fetch(INDEX_URL)
      .then((r) =>
        r.ok ? (r.json() as Promise<OffersIndex>) : Promise.reject(r.status),
      )
      .then((idx) => {
        setAll(idx.offers);
        setFailed((f) => (f.all ? { ...f, all: false } : f));
      })
      .catch(() => {
        loading.current.all = false;
        setFailed((f) => (f.all ? f : { ...f, all: true }));
      })
      .finally(() => setPending((q) => ({ ...q, all: false })));
  };
  const loadTexts = () => {
    if (loading.current.texts || texts !== null) return;
    loading.current.texts = true;
    setPending((q) => ({ ...q, texts: true }));
    fetch(TEXT_URL)
      .then((r) =>
        r.ok
          ? (r.json() as Promise<Record<string, string>>)
          : Promise.reject(r.status),
      )
      .then((t) => {
        setTexts(t);
        setFailed((f) => (f.texts ? { ...f, texts: false } : f));
      })
      .catch(() => {
        loading.current.texts = false;
        setFailed((f) => (f.texts ? f : { ...f, texts: true }));
      })
      .finally(() => setPending((q) => ({ ...q, texts: false })));
  };
  const retry = () => {
    setRetrying(true);
    if (needsAll) loadAll();
    if (needsTexts) loadTexts();
  };
  useEffect(() => {
    if (!busy) setRetrying(false);
  }, [busy]);

  // Adres → stan po montażu i przy wstecz/dalej.
  useEffect(() => {
    const read = () => parseSearch(location.pathname, location.search);
    const first = read();
    if (!sameState(first, initial)) {
      setApplied(first);
      setDraft(draftFrom(first, pool));
    }
    const onPop = () => {
      const s = read();
      setApplied(s);
      setDraft(draftFrom(s, all ?? p.entries));
    };
    addEventListener("popstate", onPop);
    const cancel = p.complete ? () => {} : onIdle(loadAll);
    return () => {
      removeEventListener("popstate", onPop);
      cancel();
    };
  }, []);

  // Host panelu z progu (W PARZE z @media w offers.css): poniżej progu
  // panel inline znika (jest display:none, więc bez skoku układu), ≥ 1025
  // sheet się domyka (jak menu Navbara). Prefetch chunku sheetów po
  // pierwszym dotknięciu/wskaźniku poniżej progu — nie w idle, żeby
  // pomiar LHCI nie liczył kodu, który desktop nigdy nie wykona.
  useEffect(() => {
    const mq = matchMedia(`(min-width:${DESKTOP_MIN_PX}px)`);
    const sync = () => {
      setHost(mq.matches ? "inline" : "sheet");
      if (mq.matches && sheets.current) {
        for (const id of Object.values(sheets.current.SHEET_ID))
          window.overlay?.close(id);
      }
    };
    sync();
    mq.addEventListener("change", sync);
    const prefetch = () => {
      if (!mq.matches) void loadSheets().then((m) => (sheets.current = m));
    };
    const opts = { once: true, passive: true } as const;
    addEventListener("touchstart", prefetch, opts);
    addEventListener("pointerdown", prefetch, opts);
    return () => {
      mq.removeEventListener("change", sync);
      removeEventListener("touchstart", prefetch);
      removeEventListener("pointerdown", prefetch);
    };
  }, []);

  useEffect(() => {
    if (needsAll) loadAll();
  }, [needsAll]);

  const draftState = useMemo(
    () => stateFromDraft(draft, applied),
    [draft, applied],
  );
  const draftNeedsAll = !withinRoute(draftState);
  const draftNeedsTexts =
    draftState.description !== undefined && texts === null;
  useEffect(() => {
    if (draftNeedsAll) loadAll();
    if (needsTexts || draftNeedsTexts) loadTexts();
  }, [draftNeedsAll, needsTexts, draftNeedsTexts]);

  const navigate = (next: SearchState, scroll = false) => {
    const t = targetPath(next, pool, nodes);
    const qs = serializeSearch(t.state, t.pathState).toString();
    const url = t.pathname + (qs ? `?${qs}` : "");
    if (url !== location.pathname + location.search)
      history.pushState(null, "", url);
    setApplied(t.state);
    if (scroll && root.current) {
      const top = root.current.getBoundingClientRect().top + scrollY;
      scrollTo(0, Math.max(0, top - 96));
    }
  };

  const apply = () => {
    const s = stateFromDraft(draft, applied);
    navigate(s);
    setDraft(draftFrom(s, pool));
    setLocText("");
  };
  const clear = () => {
    const s: SearchState = {
      ...DEFAULT_STATE,
      statuses: applied.statuses,
      sort: applied.sort,
    };
    navigate(s);
    setDraft({});
    setLocText("");
    setStreetText("");
  };
  const toggleStatus = (g: StatusGroup) => {
    const on = applied.statuses.includes(g);
    const statuses = on
      ? applied.statuses.filter((x) => x !== g)
      : STATUS_GROUPS.filter((x) => x === g || applied.statuses.includes(x));
    navigate({ ...applied, statuses, page: 1 });
  };
  const setSort = (sort: SortKey) => navigate({ ...applied, sort, page: 1 });
  const hrefFor = (page: number) => {
    const t = targetPath({ ...applied, page }, pool, nodes);
    const qs = serializeSearch(t.state, t.pathState).toString();
    return t.pathname + (qs ? `?${qs}` : "");
  };

  // ── Sheety (mobile) ─────────────────────────────────────────────────
  const openSheet = (kind: SheetKind) => {
    void loadSheets().then((m) => {
      sheets.current = m;
      m.ensureSheet(kind);
      setSheet(kind);
    });
  };
  const closeSheet = () => {
    if (sheet && sheets.current)
      window.overlay?.close(sheets.current.SHEET_ID[sheet]);
  };
  const applyFromSheet = () => {
    apply();
    closeSheet();
  };
  const applySortFromSheet = (key: SortKey) => {
    setSort(key);
    closeSheet();
  };
  // Otwarcie: po pierwszym renderze treści do kontenera powłoki (layout
  // effect niżej) overlay.ts otwiera sheet; `onClose` łapie KAŻDĄ drogę
  // zamknięcia (X, Esc, scrim, swipe, „Pokaż", „Zastosuj", próg desktop).
  useEffect(() => {
    const m = sheets.current;
    if (!sheet || !m) return;
    const id = m.SHEET_ID[sheet];
    const mount = m.ensureSheet(sheet);
    window.overlay?.open(id, {
      onClose: () => {
        render(null, mount);
        setSheet((s) => (s === sheet ? null : s));
      },
    });
  }, [sheet]);

  // ── Wyniki ──────────────────────────────────────────────────────────
  const noStatus = renderable
    ? applyFilters(
        pool,
        { ...applied, statuses: STATUS_GROUPS },
        texts ?? undefined,
      )
    : [];
  const matched = noStatus.filter((e) =>
    applied.statuses.includes(statusGroupOf(e.status)),
  );
  const sorted = sortEntries(matched, applied.sort);
  const counts = statusCounts(noStatus);
  const pages = Math.max(1, Math.ceil(sorted.length / PAGE_SIZE));
  const start = (applied.page - 1) * PAGE_SIZE;
  const inWindow = (i: number) => i >= start && i < start + PAGE_SIZE;
  // błąd „widoczny" = flaga błędu bez trwającego ponowienia
  const draftFailed =
    (draftNeedsAll && failed.all && !pending.all) ||
    (draftNeedsTexts && failed.texts && !pending.texts);
  const showCount =
    !draftNeedsAll && !draftNeedsTexts
      ? applyFilters(pool, draftState, texts ?? undefined).length
      : null;
  const textsLoading =
    (needsTexts || draftNeedsTexts) &&
    texts === null &&
    (pending.texts || !failed.texts);

  const locationLabel =
    applied.locationSlug !== undefined
      ? pool.find((e) => e.location.slug === applied.locationSlug)?.location
          .placeName
      : undefined;
  const heading = listHeading({
    mainType: applied.mainType,
    transaction: applied.transaction,
    locationLabel,
  });
  const total = renderable ? sorted.length : null;

  const panelProps = {
    draft,
    onDraft: setDraft,
    locations: p.locations,
    count: showCount,
    countFailed: draftFailed,
    moreOpen,
    onMore: setMoreOpen,
    onClear: clear,
    locText,
    onLocText: setLocText,
    streetText,
    onStreetText: setStreetText,
    textsLoading,
  };

  // Treść otwartego sheetu = osobny root Preact w kontenerze powłoki,
  // odświeżany przy KAŻDYM renderze wyspy (draft, liczniki).
  useLayoutEffect(() => {
    const m = sheets.current;
    if (!sheet || !m) return;
    const mount = m.ensureSheet(sheet);
    render(
      sheet === "filters" ? (
        <m.FiltersSheet {...panelProps} onApply={applyFromSheet} />
      ) : (
        <m.SortSheet value={applied.sort} onApply={applySortFromSheet} />
      ),
      mount,
    );
  });

  const results = () => {
    if (fetchFailed)
      return (
        <div class="ol-zero ol-zero--error" data-offers-error role="alert">
          <h2 class="ol-zero-h">{EDGE.errorHeading}</h2>
          <p class="ol-zero-p">{EDGE.errorText}</p>
          <button
            type="button"
            class="op-btn op-btn--primary"
            data-offers-retry
            disabled={retrying}
            aria-busy={retrying || undefined}
            onClick={retry}
          >
            {EDGE.retry}
          </button>
        </div>
      );
    if (!renderable)
      return (
        <ul
          class="ol-grid ol-grid--skel"
          aria-busy="true"
          aria-label={PANEL.loading}
          data-offers-skeleton
        >
          {Array.from({ length: PAGE_SIZE }, (_, i) => (
            <li key={i} class="oc-skel" aria-hidden="true">
              <div class="oc-skel-media" />
              <div class="oc-skel-body">
                <span />
                <span />
                <span />
              </div>
            </li>
          ))}
        </ul>
      );
    if (applied.invalid)
      return (
        <div class="ol-zero" data-offers-invalid>
          <h2 class="ol-zero-h">{EDGE.invalidHeading}</h2>
          <p class="ol-zero-p">{EDGE.invalidText}</p>
          <a class="op-btn" href={OFFERS_PATH}>
            {EDGE.invalidLink}
          </a>
        </div>
      );
    if (pool.length === 0)
      return (
        <p class="ol-empty" data-offers-empty>
          {/* PLACEHOLDER (U9): stan listy bez ofert w danych */}
          Aktualnie nie mamy ofert w tej kategorii. Zajrzyj do pozostałych list
          albo zostaw nam swoje kryteria.
        </p>
      );
    if (sorted.length === 0)
      return (
        <div class="ol-zero" data-offers-zero>
          <h2 class="ol-zero-h">{ZERO_RESULTS.heading}</h2>
          <ul class="ol-zero-hints">
            {ZERO_RESULTS.hints.map((h) => (
              <li key={h}>{h}</li>
            ))}
          </ul>
        </div>
      );
    return (
      <>
        <ul class="ol-grid" data-offers-grid data-view={view}>
          {sorted.map((entry, i) => (
            <li key={entry.number} hidden={!inWindow(i)}>
              <OfferCard
                entry={entry}
                nowIso={p.nowIso}
                priority={priority(i)}
              />
            </li>
          ))}
        </ul>
        {start >= sorted.length && (
          <p class="ol-empty" data-offers-page-empty>
            {PANEL.noResultsOnPage}
          </p>
        )}
        <Pagination
          page={applied.page}
          pages={pages}
          hrefFor={hrefFor}
          onGo={(page) => navigate({ ...applied, page }, true)}
        />
      </>
    );
  };

  return (
    <div class="ol-island" ref={root}>
      <div class="ol-head">
        <h1 class="ol-h1">{heading}</h1>
        <p
          class="ol-count"
          data-offers-count={total ?? undefined}
          aria-live="polite"
          aria-busy={total === null}
        >
          {total === null ? (
            <strong>{PANEL.counting}</strong>
          ) : total > 0 ? (
            <>
              {`${UI.found} `}
              <strong>{formatOffersCount(total)}</strong>
            </>
          ) : (
            <strong>{formatOffersCount(0)}</strong>
          )}
        </p>
      </div>

      <nav class="ol-nav" aria-label="Rodzaje ofert i lokalizacje">
        <div>
          <span class="ol-nav-label" id="ol-kinds-label">
            {UI.type}
          </span>
          <ul
            class="ol-pills"
            aria-labelledby="ol-kinds-label"
            data-offers-kinds
          >
            {p.nav.kinds.map((n) => (
              <li key={n.href}>
                <a
                  class="ol-pill"
                  href={n.href}
                  aria-current={n.href === p.pathname ? "page" : undefined}
                >
                  {`${n.label} `}
                  <small>{formatInt(n.count)}</small>
                </a>
              </li>
            ))}
          </ul>
        </div>
        {p.nav.locations.length > 1 && (
          <div>
            <span class="ol-nav-label" id="ol-loc-label">
              {UI.location}
            </span>
            <ul
              class="ol-pills"
              aria-labelledby="ol-loc-label"
              data-offers-locations
            >
              {p.nav.locations.map((n) => (
                <li key={n.href}>
                  <a
                    class="ol-pill"
                    href={n.href}
                    aria-current={n.href === p.pathname ? "page" : undefined}
                  >
                    {`${n.label} `}
                    <small>{formatInt(n.count)}</small>
                  </a>
                </li>
              ))}
            </ul>
          </div>
        )}
      </nav>

      {host === "inline" && (
        <SearchPanel {...panelProps} variant="inline" onApply={apply} />
      )}

      <div class="ol-tools">
        {/* pasek narzędzi < 1025 (W PARZE z DESKTOP_MIN_PX): sheety */}
        <div class="ol-mtools" data-offers-mtools>
          <button
            type="button"
            class="ol-mbtn ol-mbtn--filters"
            aria-haspopup="dialog"
            aria-expanded={sheet === "filters"}
            data-offers-filters
            onClick={() => openSheet("filters")}
          >
            <Icon name="filters" />
            <span>{PANEL.filters}</span>
          </button>
          <button
            type="button"
            class="ol-mbtn"
            aria-haspopup="dialog"
            aria-expanded={sheet === "sort"}
            data-offers-sort-btn
            onClick={() => openSheet("sort")}
          >
            <Icon name="sort" />
            <span data-sort-current={applied.sort}>
              {SORT_LABEL[applied.sort]}
            </span>
          </button>
        </div>
        {/* region przewijany poziomo na telefonie (axe: fokusowalne dzieci) */}
        <div
          class="ol-status"
          role="region"
          aria-label={UI.status}
          data-offers-status
        >
          <ul class="ol-pills ol-pills--nowrap">
            {STATUS_GROUPS.map((g) => (
              <li key={g}>
                <button
                  type="button"
                  class="ol-pill"
                  aria-pressed={applied.statuses.includes(g)}
                  title={STATUS_GROUP_TITLE[g]}
                  data-status-group={g}
                  onClick={() => toggleStatus(g)}
                >
                  {`${STATUS_GROUP_LABEL[g]} `}
                  <small>{formatInt(counts[g])}</small>
                </button>
              </li>
            ))}
          </ul>
        </div>
        <div class="ol-dtools">
          <div
            class="ol-view"
            role="group"
            aria-label={PANEL.view}
            data-offers-view
          >
            {(["grid", "list"] as const).map((v) => (
              <button
                type="button"
                key={v}
                aria-pressed={view === v}
                aria-label={v === "grid" ? PANEL.viewGrid : PANEL.viewList}
                title={v === "grid" ? PANEL.viewGrid : PANEL.viewList}
                data-view-set={v}
                onClick={() => setView(v)}
              >
                <Icon name={v} />
              </button>
            ))}
          </div>
          <SortListbox value={applied.sort} onChange={setSort} />
        </div>
      </div>

      {results()}
    </div>
  );
}
