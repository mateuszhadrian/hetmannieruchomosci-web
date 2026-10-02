// Karta oferty — JEDEN komponent dla SSG (renderowany przez Astro bez
// `client:*`, zero JS) i dla wyspy wyszukiwarki (4.2 b). Wejście = wpis
// indeksu (`OfferIndexEntry`), nie `Offer`: oba konsumenci widzą ten sam
// kształt. Treści z CRM (tytuł, lokalizacja) renderowane WYŁĄCZNIE jako
// tekst — Preact escapuje; `dangerouslySetInnerHTML` jest tu zabronione.
// Wygląd: docs/analiza-oferty.md §1.3 (R4: bez grayscale; R5: „Wynajęte";
// R9: kicker bez podtypu; R12: <img> z wymiarami z danych; R13: stan
// bez zdjęć). Style: `offers.css` (klasy `oc-*`).
import { imgAt } from "../../lib/img";
import {
  ASK_FOR_PRICE,
  formatInt,
  formatLocation,
  formatPrice,
  formatPricePerM2,
} from "../../lib/offers/format";
import type { OfferIndexEntry } from "../../lib/offers/index-entry";
import {
  cardBadges,
  cardFacts,
  cardKicker,
  UI,
  type FactIcon,
} from "../../lib/offers/offers-ui";
import { SHOW_PRICE_WHEN_SOLD } from "../../lib/site-config";
import { FILLED_ICONS, ICON_VIEWBOX, ICONS, type IconName } from "./icons";

export interface OfferCardProps {
  entry: OfferIndexEntry;
  /** „teraz" do plakietki „Nowość" — ISO (serializowalne do wyspy) */
  nowIso: string;
  /** zdjęcie w pierwszym ekranie: `eager` + priorytet (LCP listy) */
  priority?: "high" | "eager" | "lazy";
}

const FACT_ICON: Record<FactIcon, IconName> = {
  area: "area",
  rooms: "rooms",
  floor: "floor",
  year: "year",
  plot: "plot",
};

export function Icon({ name }: { name: IconName }) {
  const filled = FILLED_ICONS.has(name);
  return (
    <svg
      viewBox={ICON_VIEWBOX}
      width="1em"
      height="1em"
      fill={filled ? "currentColor" : "none"}
      stroke={filled ? "none" : "currentColor"}
      stroke-width="1.75"
      stroke-linecap="round"
      stroke-linejoin="round"
      aria-hidden="true"
    >
      <path d={ICONS[name]} />
    </svg>
  );
}

export function OfferCard({
  entry: e,
  nowIso,
  priority = "lazy",
}: OfferCardProps) {
  const badges = cardBadges(e, new Date(nowIso));
  const facts = cardFacts(e);
  const sold = e.status === "sprzedana" || e.status === "wynajeta";
  const showPrice = !sold || SHOW_PRICE_WHEN_SOLD;
  const price = formatPrice(e.price, e.transaction, e.currency);
  const perM2 =
    e.price === null
      ? null
      : formatPricePerM2(e.pricePerM2, e.transaction, e.currency);
  const discount =
    e.price !== null &&
    e.previousPrice !== undefined &&
    e.previousPrice > e.price
      ? formatPrice(e.previousPrice, e.transaction, e.currency)
      : null;
  const commission = e.badges.find((b) => /^0\s?%/.test(b));
  const title = e.title || e.typeName;

  return (
    <article class="oc" data-offer-card={e.number} data-offer-status={e.status}>
      <a class="oc-link" href={e.path}>
        <div class="oc-media">
          {e.photo ? (
            <img
              class="oc-img"
              src={imgAt(e.photo.r2Key, "card")}
              alt={e.photo.alt}
              width={e.photo.width}
              height={e.photo.height}
              loading={priority === "lazy" ? "lazy" : "eager"}
              decoding="async"
              fetchpriority={priority === "high" ? "high" : undefined}
            />
          ) : (
            <div class="oc-nophoto">
              <span class="oc-nophoto-ico">
                <Icon name="building" />
              </span>
              <span>{UI.photosSoon}</span>
            </div>
          )}
          {badges.length > 0 && (
            <ul class="oc-badges" aria-label="Status">
              {badges.map((b) => (
                <li class="oc-badge" data-badge={b} key={b}>
                  {b}
                </li>
              ))}
            </ul>
          )}
          {e.photosCount > 0 && (
            <ul class="oc-media-pills">
              <li
                class="oc-pill"
                title={`${formatInt(e.photosCount)} ${UI.photos}`}
              >
                <Icon name="camera" />
                <span>{formatInt(e.photosCount)}</span>
                {/* jeden węzeł tekstowy — dwa sąsiednie teksty w JSX
                    parser HTML scala, a hydratacja Preact rozdziela */}
                <span class="sr-only">{` ${UI.photos}`}</span>
              </li>
              {e.hasVideo && (
                <li class="oc-pill">
                  <Icon name="play" />
                  <span class="sr-only">{UI.video}</span>
                </li>
              )}
              {e.hasTour && <li class="oc-pill">{UI.tour}</li>}
            </ul>
          )}
        </div>
        <div class="oc-body">
          <p class="oc-kicker">{cardKicker(e)}</p>
          <h2 class="oc-title">{title}</h2>
          <p class="oc-loc">
            <span class="oc-loc-ico">
              <Icon name="pin" />
            </span>
            <span>{formatLocation(e.location)}</span>
          </p>
          {facts.length > 0 && (
            <ul class="oc-facts">
              {facts.map((f) => (
                <li class="oc-fact" key={f.icon}>
                  <Icon name={FACT_ICON[f.icon]} />
                  <span>{f.text}</span>
                </li>
              ))}
            </ul>
          )}
          <div class="oc-tail">
            {showPrice && (
              <div class="oc-price" data-offer-card-price>
                <p class="oc-amount" data-sold={sold ? "" : undefined}>
                  {discount && <s class="oc-prev">{discount}</s>}
                  <span>{price}</span>
                </p>
                {perM2 && price !== ASK_FOR_PRICE && (
                  <p class="oc-ppm">{perM2}</p>
                )}
              </div>
            )}
            <div class="oc-foot">
              <span class="oc-num">{e.number}</span>
              {commission && <span class="oc-tag">{commission}</span>}
            </div>
          </div>
        </div>
      </a>
    </article>
  );
}
