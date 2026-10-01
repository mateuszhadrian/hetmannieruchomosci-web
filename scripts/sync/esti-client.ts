// Klient API systemu CRM (2.4). Wyłącznie GET, wyłącznie z tego modułu.
// Adres zapytania niesie `company` i `token` w query — NIGDY nie trafia
// do komunikatów błędów, logów ani wyjątków (`EstiApiError` zna tylko
// ścieżkę endpointu i kod HTTP). Surowa odpowiedź istnieje tylko w pamięci.
// Źródło: docs/kb part3 §1.1 (limit 60 żądań na okno), §2.1; publiczna
// dokumentacja API (`/offer/basic-list`, `/offer/list?take&skip`,
// `/offer/dictionary`).
import { z } from "zod";
import type { RawRecord } from "../../src/lib/offers/public-fields";
import { DictionarySchema, type Dictionary } from "./dictionary";

export const DEFAULT_BASE_URL = "https://app.esticrm.pl/apiClient";
/** Rozmiar strony `list` — maksimum, które API przyjmuje bez ucinania. */
export const PAGE_SIZE = 100;
/** Okno limitu, gdy API nie podaje czasu resetu (part3 §1.1: najpewniej
 *  minuta) — odczekujemy z zapasem. */
export const RATE_LIMIT_WINDOW_MS = 61_000;
/** Odstęp przed jedynym ponowieniem po 429/5xx/błędzie sieci. */
export const RETRY_DELAY_MS = 5_000;
/** Bezpiecznik stronicowania — więcej stron oznacza pętlę, nie dane. */
const MAX_PAGES = 100;

export type FetchLike = (
  url: string,
  init?: { method?: string; headers?: Record<string, string> },
) => Promise<Response>;

export interface EstiClientOptions {
  company: string;
  token: string;
  baseUrl?: string;
  fetch?: FetchLike;
  /** do testów: zamiast realnego odczekania */
  sleep?: (ms: number) => Promise<void>;
  rateLimitWindowMs?: number;
  retryDelayMs?: number;
  pageSize?: number;
}

/** Błąd API bez adresu zapytania: tylko ścieżka endpointu, kod HTTP
 *  i krótki powód. */
export class EstiApiError extends Error {
  constructor(
    public readonly endpoint: string,
    public readonly status: number | undefined,
    reason: string,
  ) {
    super(
      `EstiAPI ${endpoint}: ${reason}${status === undefined ? "" : ` (HTTP ${status})`}`,
    );
    this.name = "EstiApiError";
  }
}

export const BasicListItemSchema = z.looseObject({
  id: z.coerce.number().int(),
  number: z.string().min(1),
  status: z.coerce.number().int(),
  update_date: z.string().optional(),
});
export type BasicListItem = z.infer<typeof BasicListItemSchema>;

const BasicListResponseSchema = z.object({
  success: z.boolean().optional(),
  count: z.coerce.number().optional(),
  data: z.array(BasicListItemSchema),
});

const ListResponseSchema = z.object({
  success: z.boolean().optional(),
  count: z.coerce.number().optional(),
  totalCount: z.coerce.number().optional(),
  data: z.array(z.record(z.string(), z.unknown())),
});

export interface EstiClient {
  /** `GET /offer/basic-list` — bez statusów API zwraca oferty widoczne. */
  basicList(statuses?: readonly number[]): Promise<BasicListItem[]>;
  /** `GET /offer/list?take=100&skip=…` do wyczerpania. */
  listAll(): Promise<RawRecord[]>;
  /** `GET /offer/dictionary` zwalidowany `DictionarySchema`. */
  dictionary(): Promise<Dictionary>;
  /** liczba wykonanych żądań HTTP (diagnostyka, do podsumowania) */
  readonly requests: number;
}

const realSleep = (ms: number) =>
  new Promise<void>((resolve) => setTimeout(resolve, ms));

function headerInt(res: Response, name: string): number | undefined {
  const raw = res.headers.get(name);
  if (raw === null) return undefined;
  const n = Number(raw);
  return Number.isFinite(n) ? n : undefined;
}

export function createEstiClient(options: EstiClientOptions): EstiClient {
  const baseUrl = (options.baseUrl ?? DEFAULT_BASE_URL).replace(/\/$/, "");
  const doFetch: FetchLike = options.fetch ?? ((url, init) => fetch(url, init));
  const sleep = options.sleep ?? realSleep;
  const windowMs = options.rateLimitWindowMs ?? RATE_LIMIT_WINDOW_MS;
  const retryDelay = options.retryDelayMs ?? RETRY_DELAY_MS;
  const pageSize = options.pageSize ?? PAGE_SIZE;

  let requests = 0;
  /** po odpowiedzi z `x-ratelimit-remaining: 0` — ile odczekać przed
   *  kolejnym żądaniem */
  let cooldownMs = 0;

  function buildUrl(endpoint: string, params: Record<string, string>) {
    const url = new URL(`${baseUrl}${endpoint}`);
    url.searchParams.set("company", options.company);
    url.searchParams.set("token", options.token);
    for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
    return url.toString();
  }

  async function once(
    endpoint: string,
    url: string,
  ): Promise<{ res: Response } | { retryAfterMs: number; reason: string }> {
    let res: Response;
    try {
      requests += 1;
      res = await doFetch(url, {
        method: "GET",
        headers: { accept: "application/json" },
      });
    } catch {
      // Obiekt błędu fetch może nieść adres — nie przekazujemy go dalej.
      return { retryAfterMs: retryDelay, reason: "błąd sieci" };
    }
    const remaining = headerInt(res, "x-ratelimit-remaining");
    if (remaining !== undefined && remaining <= 0) {
      const reset = headerInt(res, "x-ratelimit-reset");
      cooldownMs =
        reset !== undefined && reset > 0 && reset < 3_600
          ? reset * 1_000
          : windowMs;
    } else {
      cooldownMs = 0;
    }
    if (res.status === 429 || res.status >= 500) {
      const retryAfter = headerInt(res, "retry-after");
      const wait =
        retryAfter !== undefined && retryAfter > 0
          ? retryAfter * 1_000
          : res.status === 429
            ? windowMs
            : retryDelay;
      return {
        retryAfterMs: wait,
        reason: res.status === 429 ? "limit żądań" : "błąd serwera",
      };
    }
    return { res };
  }

  async function request(
    endpoint: string,
    params: Record<string, string> = {},
  ): Promise<unknown> {
    const url = buildUrl(endpoint, params);
    if (cooldownMs > 0) await sleep(cooldownMs);
    let attempt = await once(endpoint, url);
    if ("retryAfterMs" in attempt) {
      await sleep(attempt.retryAfterMs);
      const second = await once(endpoint, url);
      if ("retryAfterMs" in second) {
        throw new EstiApiError(endpoint, undefined, second.reason);
      }
      attempt = second;
    }
    const { res } = attempt;
    if (!res.ok) {
      throw new EstiApiError(endpoint, res.status, "odpowiedź inna niż 2xx");
    }
    let body: unknown;
    try {
      body = await res.json();
    } catch {
      throw new EstiApiError(endpoint, res.status, "odpowiedź nie jest JSON");
    }
    if (
      body &&
      typeof body === "object" &&
      (body as { success?: unknown }).success === false
    ) {
      throw new EstiApiError(endpoint, res.status, "success=false");
    }
    return body;
  }

  function parse<T>(endpoint: string, schema: z.ZodType<T>, body: unknown): T {
    const checked = schema.safeParse(body);
    if (!checked.success) {
      const first = checked.error.issues[0];
      throw new EstiApiError(
        endpoint,
        undefined,
        `nieoczekiwany kształt odpowiedzi (${first?.path.join(".") || "?"})`,
      );
    }
    return checked.data;
  }

  return {
    get requests() {
      return requests;
    },

    async basicList(statuses) {
      const endpoint = "/offer/basic-list";
      const params: Record<string, string> = {};
      if (statuses && statuses.length) params.status = statuses.join(",");
      const body = await request(endpoint, params);
      return parse(endpoint, BasicListResponseSchema, body).data;
    },

    async listAll() {
      const endpoint = "/offer/list";
      const all: RawRecord[] = [];
      let skip = 0;
      for (let page = 0; page < MAX_PAGES; page++) {
        const body = await request(endpoint, {
          take: String(pageSize),
          skip: String(skip),
        });
        const { data, totalCount } = parse(endpoint, ListResponseSchema, body);
        all.push(...data);
        skip += data.length;
        if (data.length === 0 || data.length < pageSize) break;
        if (totalCount !== undefined && skip >= totalCount) break;
      }
      return all;
    },

    async dictionary() {
      const endpoint = "/offer/dictionary";
      const body = await request(endpoint);
      return parse(endpoint, DictionarySchema, body);
    },
  };
}
