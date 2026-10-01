// CLI syncu (`pnpm sync`, `pnpm sync:dry`): konfiguracja WYŁĄCZNIE ze
// zmiennych środowiskowych (nazwy = sekrety Actions; lokalnie
// `~/.config/hetman/esticrm.env`), flagi z linii poleceń, zależności
// realne (API CRM, R2, Geoapify, Resend) wpięte w `runPipeline()`.
// `SYNC_AGREEMENT_SIGNAL` jest czytane TU i nigdzie indziej — wartość
// nie trafia do logów ani plików.
// Wyjścia: `publicSummary()` na stdout (log Actions jest PUBLICZNY),
// raport prywatny mailem, a dla workflow — `outcome`, `changed`,
// `rebuild` w `GITHUB_OUTPUT`. Kody wyjścia: 0 ok / bez zmian / dry-run,
// 2 bezpiecznik, 1 błąd (konfiguracji albo przebiegu).
import { readFileSync } from "node:fs";
import { appendFileSync } from "node:fs";
import { DictionarySchema, EMPTY_DICTIONARY } from "./dictionary";
import { createEstiClient } from "./esti-client";
import {
  PipelineError,
  recordsFromSnapshot,
  runPipeline,
  type PipelineDeps,
  type PipelineSource,
} from "./pipeline";
import { createDryRunStore, createR2Store, createS3Client } from "./r2";
import {
  privateReport,
  publicSummary,
  sendReport,
  type ReportInput,
} from "./report";

export const R2_BUCKET = "hetman-media";

export interface CliArgs {
  source: "api" | "file";
  dryRun: boolean;
  skipPhotos: boolean;
  skipMaps: boolean;
  force: boolean;
  out?: string;
  prev: string;
  /** `mail` (domyślnie), `stdout` (tylko lokalnie — raport prywatny niesie
   *  numery ofert), `none` */
  report: "mail" | "stdout" | "none";
}

export function parseArgs(argv: readonly string[]): CliArgs {
  const args: CliArgs = {
    source: "api",
    dryRun: false,
    skipPhotos: false,
    skipMaps: false,
    force: false,
    prev: "data",
    report: "mail",
  };
  for (const a of argv) {
    const [flag, value] = a.includes("=") ? a.split(/=(.*)/s) : [a, undefined];
    switch (flag) {
      case "--source":
        if (value !== "api" && value !== "file")
          throw new Error("--source=api|file");
        args.source = value;
        break;
      case "--dry-run":
        args.dryRun = true;
        break;
      case "--skip-photos":
        args.skipPhotos = true;
        break;
      case "--skip-maps":
        args.skipMaps = true;
        break;
      case "--force":
        args.force = true;
        break;
      case "--out":
        if (!value) throw new Error("--out=<katalog>");
        args.out = value;
        break;
      case "--prev":
        if (!value) throw new Error("--prev=<katalog>");
        args.prev = value;
        break;
      case "--report":
        if (value !== "mail" && value !== "stdout" && value !== "none")
          throw new Error("--report=mail|stdout|none");
        args.report = value;
        break;
      default:
        throw new Error(`nieznana flaga: ${flag}`);
    }
  }
  return args;
}

type Env = Record<string, string | undefined>;

function required(env: Env, names: readonly string[]): string[] {
  return names.filter((n) => !env[n]);
}

/** Zmienne wymagane w danym trybie (nazwy mogą być w logu, wartości nie). */
export function missingEnv(args: CliArgs, env: Env): string[] {
  const names: string[] = [];
  if (args.source === "api") names.push("ESTICRM_COMPANY", "ESTICRM_TOKEN");
  else names.push("ESTI_RAW_SNAPSHOT");
  if (!args.dryRun)
    names.push("R2_ACCOUNT_ID", "R2_ACCESS_KEY_ID", "R2_SECRET_ACCESS_KEY");
  if (!args.skipMaps) names.push("GEOAPIFY_KEY");
  return required(env, names);
}

function readSnapshotSource(env: Env): PipelineSource {
  const records = recordsFromSnapshot(
    JSON.parse(readFileSync(env.ESTI_RAW_SNAPSHOT!, "utf8")),
  );
  const dictionary = env.ESTI_DICTIONARY_FILE
    ? DictionarySchema.parse(
        JSON.parse(readFileSync(env.ESTI_DICTIONARY_FILE, "utf8")),
      )
    : EMPTY_DICTIONARY;
  return { kind: "file", records, dictionary };
}

function githubOutput(env: Env, values: Record<string, string>) {
  if (!env.GITHUB_OUTPUT) return;
  appendFileSync(
    env.GITHUB_OUTPUT,
    Object.entries(values)
      .map(([k, v]) => `${k}=${v}\n`)
      .join(""),
  );
}

async function emitReport(
  args: CliArgs,
  env: Env,
  input: ReportInput,
): Promise<void> {
  const inActions = env.GITHUB_ACTIONS === "true";
  let mode = args.report;
  if (mode === "stdout" && inActions) {
    // log Actions jest publiczny — raport prywatny nigdy tam nie trafia
    console.log("raport prywatny: --report=stdout zignorowane w Actions");
    mode = "mail";
  }
  if (mode === "none") return;
  const report = privateReport(input);
  if (mode === "stdout") {
    console.log(`\n${report.subject}\n\n${report.text}`);
    return;
  }
  const missing = required(env, [
    "REPORT_RESEND_API_KEY",
    "REPORT_TO",
    "REPORT_FROM",
  ]);
  if (missing.length) {
    console.log(`raport prywatny: pominięty (brak ${missing.join(", ")})`);
    return;
  }
  const sent = await sendReport({
    apiKey: env.REPORT_RESEND_API_KEY!,
    to: env.REPORT_TO!,
    from: env.REPORT_FROM!,
    report,
  });
  console.log(
    sent.ok
      ? "raport prywatny: wysłany"
      : `raport prywatny: wysyłka nieudana (HTTP ${sent.status})`,
  );
}

export async function main(
  argv: readonly string[],
  env: Env = process.env,
): Promise<number> {
  const args = parseArgs(argv);
  const inActions = env.GITHUB_ACTIONS === "true";
  const outDir = args.out ?? (inActions ? "data" : ".sync-out");

  const missing = missingEnv(args, env);
  if (missing.length) {
    console.error(`sync: brak zmiennych środowiskowych: ${missing.join(", ")}`);
    return 1;
  }

  const source: PipelineSource =
    args.source === "api"
      ? {
          kind: "api",
          client: createEstiClient({
            company: env.ESTICRM_COMPANY!,
            token: env.ESTICRM_TOKEN!,
          }),
        }
      : readSnapshotSource(env);
  const store = args.dryRun
    ? createDryRunStore()
    : createR2Store(
        R2_BUCKET,
        createS3Client({
          accountId: env.R2_ACCOUNT_ID!,
          accessKeyId: env.R2_ACCESS_KEY_ID!,
          secretAccessKey: env.R2_SECRET_ACCESS_KEY!,
          bucket: R2_BUCKET,
        }),
      );
  const signal = env.SYNC_AGREEMENT_SIGNAL
    ? Number(env.SYNC_AGREEMENT_SIGNAL)
    : undefined;
  const deps: PipelineDeps = {
    source,
    store,
    geoapifyKey: env.GEOAPIFY_KEY,
    agreementSignalId:
      signal !== undefined && Number.isFinite(signal) ? signal : undefined,
  };

  let input: ReportInput;
  let code: number;
  let changed = false;
  let rebuild = false;
  try {
    const result = await runPipeline(deps, {
      previousDir: args.prev,
      outDir,
      dryRun: args.dryRun,
      skipPhotos: args.skipPhotos,
      skipMaps: args.skipMaps,
      force: args.force,
    });
    input = result.report;
    changed = result.changed;
    rebuild = result.rebuild;
    code = result.outcome === "aborted" ? 2 : 0;
    if (result.written) console.log(`zapisano pliki danych: ${result.written}`);
  } catch (e) {
    if (e instanceof PipelineError) {
      input = e.partial;
    } else {
      input = {
        outcome: "failed",
        runAt: new Date().toISOString(),
        stats: { visible: 0 },
        warnings: [],
        errors: [(e as Error).message],
      };
    }
    code = 1;
  }

  console.log(publicSummary(input));
  if (rebuild)
    console.log(
      "przebudowa zależna od daty: TAK (prezentacja zmienia się dziś)",
    );
  githubOutput(env, {
    outcome: input.outcome,
    changed: String(changed),
    rebuild: String(rebuild),
  });
  await emitReport(args, env, input);
  return code;
}

// uruchomienie z linii poleceń (nie przy imporcie w testach)
if (
  process.argv[1] &&
  /scripts[\\/]sync[\\/]index\.ts$/.test(process.argv[1])
) {
  main(process.argv.slice(2)).then(
    (code) => process.exit(code),
    (e) => {
      console.error(`sync: ${(e as Error).message}`);
      process.exit(1);
    },
  );
}
