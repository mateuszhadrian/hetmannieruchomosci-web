// Daty z API: „YYYY-MM-DD HH:MM:SS" bez strefy = czas polski. Zapisujemy
// ISO 8601 z offsetem Europe/Warsaw („2026-07-30T11:01:42+02:00"), żeby
// build i przeglądarka czytały ten sam moment niezależnie od strefy
// runnera. Bez zewnętrznej biblioteki: offset liczy `Intl`.
const TZ = "Europe/Warsaw";

const partsFormatter = new Intl.DateTimeFormat("en-US", {
  timeZone: TZ,
  hourCycle: "h23",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
});

/** Offset strefy (w minutach) dla danego momentu UTC. */
function offsetMinutesAt(utcMs: number): number {
  const p = Object.fromEntries(
    partsFormatter
      .formatToParts(new Date(utcMs))
      .filter((x) => x.type !== "literal")
      .map((x) => [x.type, Number(x.value)]),
  ) as Record<string, number>;
  const asUtc = Date.UTC(
    p.year,
    p.month - 1,
    p.day,
    p.hour,
    p.minute,
    p.second,
  );
  return Math.round((asUtc - utcMs) / 60_000);
}

const DATE_TIME = /^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2}):(\d{2})$/;
const DATE_ONLY = /^(\d{4})-(\d{2})-(\d{2})$/;

/** „2026-07-30 11:01:42" (czas polski) → „2026-07-30T11:01:42+02:00".
 *  Zwraca `undefined` dla pustych i niepoprawnych wartości. */
export function toIsoWarsaw(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  const m = DATE_TIME.exec(value.trim());
  if (!m) return undefined;
  const [y, mo, d, h, mi, s] = m.slice(1).map(Number);
  // Przybliżenie: potraktuj czas ścienny jak UTC, policz offset w tym
  // momencie i skoryguj; drugi przebieg łapie godzinę zmiany czasu.
  const guess = Date.UTC(y, mo - 1, d, h, mi, s);
  let offset = offsetMinutesAt(guess - offsetMinutesAt(guess) * 60_000);
  offset = offsetMinutesAt(guess - offset * 60_000);
  const sign = offset >= 0 ? "+" : "-";
  const abs = Math.abs(offset);
  const hh = String(Math.floor(abs / 60)).padStart(2, "0");
  const mm = String(abs % 60).padStart(2, "0");
  return `${m[1]}-${m[2]}-${m[3]}T${m[4]}:${m[5]}:${m[6]}${sign}${hh}:${mm}`;
}

/** „2026-07-30" albo „2026-07-30 00:00:00" → „2026-07-30". */
export function toIsoDate(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  const v = value.trim();
  if (DATE_ONLY.test(v)) return v;
  const m = DATE_TIME.exec(v);
  return m ? `${m[1]}-${m[2]}-${m[3]}` : undefined;
}
