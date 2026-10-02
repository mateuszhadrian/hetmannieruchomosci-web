// Lighthouse CI — profil DESKTOP (preset lighthouse:desktop).
// Reszta zasad jak w lighthouserc.cjs (tam opis ratchetu i wariancji).
//
// BUDŻETY = RATCHET od pomiaru bazowego na runnerze CI (lhci-measure.yml,
// 5 przebiegów, 2026-10-02, szkielet Etapu 3): perf 1.00, LCP 411 ms,
// TBT 0 ms, CLS 0,0032, script 4 KB, total 130 KB, fonty 4 / 67 KB.
// Reguły progów i zasady zmian jak w lighthouserc.cjs.
module.exports = {
  ci: {
    collect: {
      staticDistDir: "./dist",
      url: [
        "/",
        "/polityka-prywatnosci/",
        "/oferty/",
        "/oferty/mieszkanie-na-sprzedaz/",
      ],
      numberOfRuns: 5,
      settings: { preset: "desktop" },
    },
    assert: {
      aggregationMethod: "median-run",
      assertions: {
        "categories:performance": ["error", { minScore: 0.95 }],
        // mediana 411 ms + 1 300 ms = 1 711 → 1 800
        "largest-contentful-paint": ["error", { maxNumericValue: 1800 }],
        // TBT po wyspie wyszukiwarki (R27): pomiar lhci-measure.yml
        // 2026-10-02 (5 przebiegów): wszystkie trasy 0 ms (zadanie hydratacji
        // < 50 ms bez dławienia CPU). Reguła TBT jak w lighthouserc.cjs:
        // max(mediana × 2; mediana + 300 ms) → 300 ms.
        "total-blocking-time": ["error", { maxNumericValue: 300 }],
        // mediana 0,0032
        "cumulative-layout-shift": ["error", { maxNumericValue: 0.05 }],
        // mediana 4 KB; zapas na moduły widoków (Etap 4)
        "resource-summary:script:size": ["error", { maxNumericValue: 30000 }],
        // mediana 130 KB; desktop dostaje większe kadry niż mobile
        "resource-summary:total:size": ["error", { maxNumericValue: 1200000 }],
        "resource-summary:font:count": ["error", { maxNumericValue: 4 }],
        // mediana 67 KB → +10 %
        "resource-summary:font:size": ["error", { maxNumericValue: 76000 }],
      },
    },
    upload: { target: "temporary-public-storage" },
  },
};
