// Wyspa wyszukiwarki `/oferty/` (4.2 b) — JEDYNA wyspa projektu
// (`client:load` w OffersListPage.astro). Renderuje się w SSR przez Preact
// i hydratuje na TYM SAMYM markupie: stan początkowy =
// `parseSearch(pathname, "")` po obu stronach; po montażu wyspa czyta
// `location.search` i przerenderowuje tylko, gdy stan różni się od
// domyślnego (zero mutacji DOM przy wejściu bez parametrów — kontrakt e2e).
//
// Dane: `entries` = wpisy indeksu TRASY (SSR i hydratacja), `complete` =
// `/oferty/` niesie komplet; reszta (`/oferty/index.json`) dociągana
// w requestIdleCallback na listach SSG albo natychmiast, gdy stan tego
// wymaga; `index-text.json` dopiero przy „szukaj w opisie". Skeleton
// tylko wtedy, gdy stanu nie da się wyrenderować z tego, co jest.
//
// Logika filtrów, sortowania, paginacji i adresu WYŁĄCZNIE z
// `src/lib/offers/filters.ts` (`parseSearch`, `applyFilters`,
// `sortEntries`, `statusCounts`, `targetPath`, `serializeSearch`);
// karty z `OfferCard.tsx` (ten sam komponent co SSG).
import { useEffect, useMemo, useRef, useState } from "preact/hooks";
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
  listHeading,
  PANEL,
  STATUS_GROUP_LABEL,
  STATUS_GROUP_TITLE,
  UI,
  ZERO_RESULTS,
} from "../../lib/offers/offers-ui";
import type { LocationsFile } from "../../lib/offers/schema";
import { OFFERS_PATH } from "../../lib/offers/urls";
import { OfferCard } from "./OfferCard";
import { Pagination } from "./pagination";
import { pruneDraft, SearchPanel, type Draft } from "./search-panel";
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
}

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

export function SearchIsland(p: SearchIslandProps) {
  const route = useMemo(() => parsePath(p.pathname), [p.pathname]);
  const initial = useMemo(() => parseSearch(p.pathname, ""), [p.pathname]);
  const [applied, setApplied] = useState<SearchState>(initial);
  const [all, setAll] = useState<OfferIndexEntry[] | null>(
    p.complete ? p.entries : null,
  );
  const [texts, setTexts] = useState<Record<string, string> | null>(null);
  const [draft, setDraft] = useState<Draft>(() =>
    draftFrom(initial, p.entries),
  );
  const [locText, setLocText] = useState("");
  const [streetText, setStreetText] = useState("");
  const [moreOpen, setMoreOpen] = useState(false);
  const loading = useRef({ all: false, texts: false });
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

  const loadAll = () => {
    if (loading.current.all || all !== null) return;
    loading.current.all = true;
    fetch(INDEX_URL)
      .then((r) =>
        r.ok ? (r.json() as Promise<OffersIndex>) : Promise.reject(r.status),
      )
      .then((idx) => setAll(idx.offers))
      .catch(() => setAll(p.entries));
  };
  const loadTexts = () => {
    if (loading.current.texts || texts !== null) return;
    loading.current.texts = true;
    fetch(TEXT_URL)
      .then((r) =>
        r.ok
          ? (r.json() as Promise<Record<string, string>>)
          : Promise.reject(r.status),
      )
      .then(setTexts)
      .catch(() => setTexts({}));
  };

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
  const showCount =
    !draftNeedsAll && !draftNeedsTexts
      ? applyFilters(pool, draftState, texts ?? undefined).length
      : null;

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

      <SearchPanel
        draft={draft}
        onDraft={setDraft}
        locations={p.locations}
        count={showCount}
        moreOpen={moreOpen}
        onMore={setMoreOpen}
        onApply={apply}
        onClear={clear}
        locText={locText}
        onLocText={setLocText}
        streetText={streetText}
        onStreetText={setStreetText}
      />

      <div class="ol-tools">
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
        <SortListbox value={applied.sort} onChange={setSort} />
      </div>

      {!renderable ? (
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
      ) : pool.length === 0 ? (
        <p class="ol-empty" data-offers-empty>
          {/* PLACEHOLDER (U9): stan listy bez ofert w danych */}
          Aktualnie nie mamy ofert w tej kategorii. Zajrzyj do pozostałych list
          albo zostaw nam swoje kryteria.
        </p>
      ) : sorted.length === 0 ? (
        <div class="ol-zero" data-offers-zero>
          <h2 class="ol-zero-h">{ZERO_RESULTS.heading}</h2>
          <ul class="ol-zero-hints">
            {ZERO_RESULTS.hints.map((h) => (
              <li key={h}>{h}</li>
            ))}
          </ul>
        </div>
      ) : (
        <>
          <ul class="ol-grid" data-offers-grid>
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
      )}
    </div>
  );
}
