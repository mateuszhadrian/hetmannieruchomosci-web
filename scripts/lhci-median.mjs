// Mediany kluczowych metryk z przebiegów Lighthouse CI (pomiar bazowy +
// ratchet — docs/testing-tools-and-environemnts-setup-analysis.md §III.5).
// Narzędzie MANUALNE — nie jest wpięte w CI (w ci.yml występuje tylko
// w komentarzu); służy do ręcznego ratchetowania budżetów lighthouserc*.
//
// Użycie: pnpm exec lhci collect --config=<cfg> [--numberOfRuns=5]
//         node scripts/lhci-median.mjs [katalog=.lighthouseci]
//
// Czyta raporty lhr-*.json, grupuje po URL-u i wypisuje mediany metryk,
// na których stoją asercje, plus gotowe progi ratchet (czasy ×1,15,
// wagi zasobów +10%).

import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";

const DIR = process.argv[2] || ".lighthouseci";

const median = (xs) => {
  const s = [...xs].sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2;
};

const files = readdirSync(DIR).filter(
  (f) => f.startsWith("lhr-") && f.endsWith(".json"),
);
if (!files.length) {
  console.error(`Brak raportów lhr-*.json w ${DIR} — najpierw lhci collect.`);
  process.exit(1);
}

const byUrl = new Map();
for (const f of files) {
  const lhr = JSON.parse(readFileSync(path.join(DIR, f), "utf8"));
  const url = new URL(lhr.finalDisplayedUrl ?? lhr.requestedUrl).pathname;
  const rs = lhr.audits["resource-summary"]?.details?.items ?? [];
  const rsOf = (type) => rs.find((i) => i.resourceType === type) ?? {};
  const row = {
    perf: lhr.categories.performance.score,
    lcp: lhr.audits["largest-contentful-paint"].numericValue,
    tbt: lhr.audits["total-blocking-time"].numericValue,
    cls: lhr.audits["cumulative-layout-shift"].numericValue,
    scriptKB: (rsOf("script").transferSize ?? 0) / 1024,
    totalKB: (rsOf("total").transferSize ?? 0) / 1024,
    fontCount: rsOf("font").requestCount ?? 0,
  };
  if (!byUrl.has(url)) byUrl.set(url, []);
  byUrl.get(url).push(row);
}

for (const [url, rows] of byUrl) {
  const m = (key) => median(rows.map((r) => r[key]));
  console.log(`\n━━ ${url}  (${rows.length} przebiegów, mediany) ━━`);
  console.log(`  performance score : ${m("perf").toFixed(2)}`);
  console.log(
    `  LCP               : ${Math.round(m("lcp"))} ms  → próg ×1,15 = ${Math.round(m("lcp") * 1.15)} ms`,
  );
  console.log(
    `  TBT               : ${Math.round(m("tbt"))} ms  → próg ×1,15 = ${Math.round(m("tbt") * 1.15)} ms`,
  );
  console.log(`  CLS               : ${m("cls").toFixed(4)}`);
  console.log(
    `  script transfer   : ${m("scriptKB").toFixed(0)} KB → próg +10% = ${Math.round(m("scriptKB") * 1.1)} KB`,
  );
  console.log(
    `  total transfer    : ${m("totalKB").toFixed(0)} KB → próg +10% = ${Math.round(m("totalKB") * 1.1)} KB`,
  );
  console.log(`  font requests     : ${m("fontCount")}`);
}
