// Sonda przekierowań na wskazanym hoście (`pnpm test:redirects:prod`,
// używana w 2.11 i przy przełączeniu domeny): każda reguła z
// `dist/_redirects` zwraca 301 z właściwym Location, a jej cel — 200.
// Wyłącznie GET/HEAD. Host: BASE_URL (domyślnie podgląd).
import { readFileSync } from "node:fs";
import { parseRedirects } from "../src/lib/offers/redirects";

const base = (
  process.env.BASE_URL ?? "https://nowa.hetmannieruchomosci.com"
).replace(/\/$/, "");
const file = process.argv[2] ?? "dist/_redirects";

async function head(url: string) {
  return fetch(url, { method: "HEAD", redirect: "manual" });
}

async function main() {
  const rules = parseRedirects(readFileSync(file, "utf8"));
  let failed = 0;
  for (const rule of rules) {
    const res = await head(`${base}${rule.from}`);
    const location = res.headers.get("location") ?? "";
    const target = location.startsWith("http")
      ? new URL(location).pathname
      : location;
    const okRedirect = res.status === rule.status && target === rule.to;
    const dest = okRedirect ? await head(`${base}${rule.to}`) : undefined;
    const ok = okRedirect && dest?.status === 200;
    if (!ok) {
      failed++;
      console.log(
        `FAIL ${rule.from} → ${res.status} ${target || "-"} (cel: ${dest?.status ?? "-"})`,
      );
    }
  }
  console.log(`${rules.length - failed}/${rules.length} reguł OK na ${base}`);
  if (failed) process.exit(1);
}

main().catch((e: unknown) => {
  console.error(e instanceof Error ? e.message : String(e));
  process.exit(1);
});
