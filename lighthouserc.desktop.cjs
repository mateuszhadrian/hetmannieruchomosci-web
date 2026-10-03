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
        // detale z fixture'u (4.3) — jak w lighthouserc.cjs
        "/oferty/mieszkanie-na-sprzedaz/poznan-winogrady/sw486462/",
        "/oferty/dom-na-sprzedaz/poznan-szczepankowo/sw349452/",
        "/oferty/dzialka-na-sprzedaz/kornik-bnin/sw184702/",
        "/oferty/lokal-komercyjny-na-sprzedaz/poznan-wilda/sw372150/",
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
        // `script` po 4.2 (c) (wyspa wyszukiwarki + sheety): pomiar
        // lhci-measure.yml 2026-10-02 22:06 UTC (main po #19, 5 przebiegów):
        // 28 223 B w KAŻDYM przebiegu obu tras ofert (bajty są
        // deterministyczne — rozrzut 0; szkielet Etapu 3 miał 4 KB).
        // Reguła max(mediana × 1,3 = 36 690; mediana + 10 000 = 38 223)
        // dałaby 39 000 B; decyzja Mateusza 2026-10-03: 40 000 B
        // (zapas ok. 11,8 KB, żeby lightbox 4.3 — chunk na overlay.ts,
        // ok. 4–6 KB gzip — i hero/ruch 4.4 — ok. 2–3 KB — weszły bez
        // kolejnej zmiany progu). Zapas to WYŁĄCZNIE miejsce na widoki;
        // przekroczenie = STOP i decyzja, nie ciche podniesienie.
        "resource-summary:script:size": ["error", { maxNumericValue: 40000 }],
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
