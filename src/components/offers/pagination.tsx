// Paginacja listy (part2 §4.3: 12 na stronę, WSZYSTKIE numery, bez
// skracania): prawdziwe linki `?strona=N` (środkowy klik, bez JS — ukryte
// przez <noscript>), klik = `pushState` w wyspie. Skrajne strzałki
// wyłączone (`aria-disabled`, bez href). Przy jednej stronie nic.
import { formatInt } from "../../lib/offers/format";
import { PANEL } from "../../lib/offers/offers-ui";
import { Icon } from "./OfferCard";

export function Pagination({
  page,
  pages,
  hrefFor,
  onGo,
}: {
  page: number;
  pages: number;
  hrefFor(page: number): string;
  onGo(page: number): void;
}) {
  if (pages <= 1) return null;
  const link = (
    target: number,
    label: string,
    content: preact.ComponentChildren,
    cls: string,
  ) => {
    const enabled = target >= 1 && target <= pages && target !== page;
    return enabled ? (
      <a
        class={cls}
        href={hrefFor(target)}
        aria-label={label}
        onClick={(e) => {
          if (e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return;
          e.preventDefault();
          onGo(target);
        }}
      >
        {content}
      </a>
    ) : (
      // span bez roli nie może nieść aria-label (axe aria-prohibited-attr)
      <span class={cls} aria-disabled="true">
        {content}
        <span class="sr-only">{label}</span>
      </span>
    );
  };
  const numbers: number[] = [];
  for (let i = 1; i <= pages; i++) numbers.push(i);
  return (
    <nav class="ol-pg" aria-label={PANEL.pagination} data-offers-pagination>
      {link(
        page - 1,
        PANEL.prevPage,
        <Icon name="chevronLeft" />,
        "ol-pg-btn ol-pg-btn--arrow",
      )}
      <ul class="ol-pg-list">
        {numbers.map((n) => (
          <li key={n}>
            {n === page ? (
              <span class="ol-pg-btn" aria-current="page">
                {formatInt(n)}
              </span>
            ) : (
              link(n, `${PANEL.pageN} ${n}`, formatInt(n), "ol-pg-btn")
            )}
          </li>
        ))}
      </ul>
      {link(
        page + 1,
        PANEL.nextPage,
        <Icon name="chevronRight" />,
        "ol-pg-btn ol-pg-btn--arrow",
      )}
    </nav>
  );
}
