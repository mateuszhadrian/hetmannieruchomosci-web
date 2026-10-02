// Lighthouse CI — profil DESKTOP (preset lighthouse:desktop).
// Reszta zasad jak w lighthouserc.cjs (tam opis ratchetu i wariancji).
//
// STAN: progi LUŹNE, TYMCZASOWE do czasu wpisu median z lhci-measure.yml
// (mierzony build z fixture); potem RATCHET.
module.exports = {
  ci: {
    collect: {
      staticDistDir: "./dist",
      url: ["/", "/polityka-prywatnosci/", "/oferty/"],
      numberOfRuns: 5,
      settings: { preset: "desktop" },
    },
    assert: {
      aggregationMethod: "median-run",
      assertions: {
        "categories:performance": ["error", { minScore: 0.8 }],
        "largest-contentful-paint": ["error", { maxNumericValue: 3000 }],
        "total-blocking-time": ["error", { maxNumericValue: 300 }],
        "cumulative-layout-shift": ["error", { maxNumericValue: 0.1 }],
        "resource-summary:script:size": ["error", { maxNumericValue: 60000 }],
        "resource-summary:total:size": ["error", { maxNumericValue: 2000000 }],
        "resource-summary:font:count": ["warn", { maxNumericValue: 4 }],
        "resource-summary:font:size": ["error", { maxNumericValue: 100000 }],
      },
    },
    upload: { target: "temporary-public-storage" },
  },
};
