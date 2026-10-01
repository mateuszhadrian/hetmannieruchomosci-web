// Raport syncu (2.7, part3 §2.2, Z7). DWA wyjścia o różnej widoczności:
//  - `publicSummary()` → log GitHub Actions (PUBLICZNY): wynik, liczności,
//    `summarize()` ostrzeżeń — bez numerów ofert, bez wartości pól
//    kontrolnych, bez adresów API; strażnik `redactPublic()` wycina
//    wzorce numerów i adresów na wypadek komunikatu błędu z zewnątrz;
//  - `privateReport()` → mail do Mateusza (Resend, konto Mateusza):
//    ostrzeżenia z `number`/`detail`, diff widoczności ze statusami CRM,
//    błędy w pełnym brzmieniu.
import type { Dictionary } from "./dictionary";
import type { MapStats } from "./maps";
import type { PhotoStats } from "./photos";
import type { VisibilityDiff } from "./visibility";
import { WARNING_CODES, summarize, type SyncWarning } from "./warnings";

export type SyncOutcome =
  | "ok"
  | "no-changes"
  | "dry-run"
  | "aborted"
  | "failed";

export const OUTCOME_LABEL: Record<SyncOutcome, string> = {
  ok: "zakończony — dane zapisane",
  "no-changes": "zakończony — bez zmian",
  "dry-run": "przebieg próbny — bez zapisu",
  aborted: "PRZERWANY przez bezpiecznik — bez zapisu",
  failed: "BŁĄD — bez zapisu",
};

export interface SyncStats {
  /** oferty widoczne po filtrze */
  visible: number;
  /** liczba ofert w poprzednim `data/offers.json` */
  previousVisible?: number;
  /** liczba ofert w CRM we wszystkich statusach (sama liczba) */
  inCrm?: number;
  requests?: number;
  photos?: PhotoStats;
  maps?: MapStats;
  durationMs?: number;
  /** liczba skasowanych obiektów R2 (czyszczenie po 30 dniach) */
  cleaned?: number;
}

export interface ReportInput {
  outcome: SyncOutcome;
  /** data/czas przebiegu (ISO) — tylko w treści raportu, nie w plikach */
  runAt: string;
  stats: SyncStats;
  warnings: readonly SyncWarning[];
  visibility?: VisibilityDiff;
  /** do etykiet statusów CRM w raporcie prywatnym */
  dictionary?: Dictionary;
  /** komunikaty błędów (mogą nieść szczegóły — raport prywatny; publicznie
   *  po redakcji) */
  errors?: readonly string[];
}

/** Numer oferty (`SW486462`), adres z protokołem, fragment query z tokenem. */
const NUMBER_RE = /\b[A-Z]{1,4}\d{4,}\b/g;
const URL_RE = /https?:\/\/\S+/gi;
const TOKEN_RE = /\b(token|apiKey|company)=[^\s&]+/gi;

/** Strażnik treści publicznej — ostatnia linia obrony, nie zamiast
 *  dyscypliny w komunikatach. */
export function redactPublic(text: string): string {
  return text
    .replace(URL_RE, "[adres]")
    .replace(TOKEN_RE, "$1=[ukryte]")
    .replace(NUMBER_RE, "[numer]");
}

function fmtPhotos(p: PhotoStats): string {
  return `zdjęcia: ${p.total} (bez zmian ${p.unchanged}, pobrane ${p.downloaded}, wgrane ${p.uploaded}, nieudane ${p.failed}, nowe goneSince ${p.gone})`;
}

function fmtMaps(m: MapStats): string {
  return `mapy: punkty ${m.points} (z manifestu ${m.reused}, żądania ${m.requested}, wgrane ${m.uploaded}, nieudane ${m.failed}, nowe goneSince ${m.gone})`;
}

function statLines(s: SyncStats): string[] {
  const lines = [
    `oferty widoczne: ${s.visible}${s.previousVisible === undefined ? "" : ` (poprzednio ${s.previousVisible})`}`,
  ];
  if (s.inCrm !== undefined)
    lines.push(`oferty w CRM (wszystkie statusy): ${s.inCrm}`);
  if (s.requests !== undefined) lines.push(`żądania do API: ${s.requests}`);
  if (s.photos) lines.push(fmtPhotos(s.photos));
  if (s.maps) lines.push(fmtMaps(s.maps));
  if (s.cleaned !== undefined)
    lines.push(`obiekty skasowane z R2: ${s.cleaned}`);
  if (s.durationMs !== undefined)
    lines.push(`czas: ${Math.round(s.durationMs / 1000)} s`);
  return lines;
}

/** Podsumowanie do logu Actions: kody i liczności, nic więcej. */
export function publicSummary(input: ReportInput): string {
  const lines = [
    `Sync ofert: ${OUTCOME_LABEL[input.outcome]}`,
    ...statLines(input.stats),
    `ostrzeżenia: ${input.warnings.length ? summarize(input.warnings) : "brak"}`,
  ];
  if (input.visibility) {
    lines.push(
      `widoczność: zniknęło ${input.visibility.gone.length}, pojawiło się ${input.visibility.appeared.length}`,
    );
  }
  if (input.errors?.length) {
    lines.push(
      `błędy: ${input.errors.length} (szczegóły w raporcie prywatnym)`,
    );
  }
  return redactPublic(lines.join("\n"));
}

export interface PrivateReport {
  subject: string;
  text: string;
  html: string;
}

function statusLabel(dict: Dictionary | undefined, status: number | undefined) {
  if (status === undefined) return "brak w CRM";
  const label = dict?.data.status?.[String(status)];
  return label ? `${status} (${label})` : String(status);
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/** Raport prywatny — pełne szczegóły. */
export function privateReport(input: ReportInput): PrivateReport {
  const date = input.runAt.slice(0, 10);
  const subject = `[hetman sync] ${date}: ${OUTCOME_LABEL[input.outcome]}${
    input.warnings.length ? ` — ${summarize(input.warnings)}` : ""
  }`;

  const sections: Array<[string, string[]]> = [];
  sections.push([
    "Przebieg",
    [`czas startu: ${input.runAt}`, ...statLines(input.stats)],
  ]);

  if (input.errors?.length) sections.push(["Błędy", [...input.errors]]);

  if (input.visibility) {
    const { gone, appeared } = input.visibility;
    const lines = [
      ...gone.map(
        (g) =>
          `zniknęła: ${g.number} → status ${statusLabel(input.dictionary, g.status)}`,
      ),
      ...appeared.map((n) => `pojawiła się: ${n}`),
    ];
    sections.push(["Widoczność", lines.length ? lines : ["bez zmian"]]);
  }

  const byCode = new Map<string, SyncWarning[]>();
  for (const w of input.warnings) {
    byCode.set(w.code, [...(byCode.get(w.code) ?? []), w]);
  }
  const warnLines: string[] = [];
  for (const [code, list] of [...byCode.entries()].sort(([a], [b]) =>
    a.localeCompare(b),
  )) {
    warnLines.push(
      `${code} — ${WARNING_CODES[code as keyof typeof WARNING_CODES] ?? list[0].message} ×${list.length}`,
    );
    for (const w of list) {
      warnLines.push(
        `  • ${w.number ?? "(bez numeru)"}${w.detail ? `: ${w.detail}` : ""}`,
      );
    }
  }
  sections.push(["Ostrzeżenia", warnLines.length ? warnLines : ["brak"]]);

  const text = sections
    .map(([title, lines]) => `== ${title} ==\n${lines.join("\n")}`)
    .join("\n\n");
  const html = `<!doctype html><html lang="pl"><body style="font-family:system-ui,sans-serif;font-size:14px;line-height:1.5">${sections
    .map(
      ([title, lines]) =>
        `<h2 style="font-size:16px;margin:16px 0 4px">${escapeHtml(title)}</h2><pre style="margin:0;white-space:pre-wrap;font:inherit">${escapeHtml(lines.join("\n"))}</pre>`,
    )
    .join("")}</body></html>`;
  return { subject, text, html };
}

export interface SendReportOptions {
  apiKey: string;
  to: string;
  /** nadawca zweryfikowany na koncie Resend Mateusza (`REPORT_FROM`) */
  from: string;
  report: PrivateReport;
  fetch?: FetchLike;
}

type FetchLike = (
  url: string,
  init?: { method?: string; headers?: Record<string, string>; body?: string },
) => Promise<Response>;

/** Wysyłka przez Resend. Wynik bez treści odpowiedzi — klucz API nie
 *  trafia do logów. */
export async function sendReport(
  options: SendReportOptions,
): Promise<{ ok: boolean; status: number }> {
  const doFetch: FetchLike = options.fetch ?? ((url, init) => fetch(url, init));
  try {
    const res = await doFetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        authorization: `Bearer ${options.apiKey}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        from: options.from,
        to: [options.to],
        subject: options.report.subject,
        text: options.report.text,
        html: options.report.html,
      }),
    });
    return { ok: res.ok, status: res.status };
  } catch {
    return { ok: false, status: 0 };
  }
}
