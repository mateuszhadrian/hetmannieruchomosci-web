// Lighthouse CI — profil MOBILE (domyślna emulacja LHCI: Moto G Power,
// CPU 4×, sieć 4G) = nasz proxy „słabszego Androida".
// Profil desktop: lighthouserc.desktop.cjs.
//
// STAN Etapu 0: progi LUŹNE, TYMCZASOWE — łapią wyłącznie grubą regresję.
// Realne budżety powstają w Etapie 3 z pomiaru szkieletu na runnerze CI
// (mediana z `lhci collect` + scripts/lhci-median.mjs) i od tego momentu
// działają jak RATCHET: zacieśnianie wyłącznie decyzją Mateusza, osobnym
// commitem, po ponownym pomiarze w CI.
//
// ⚠️ LOKALNY `lhci autorun` z tym configiem WYPADA GORZEJ NIŻ CI i to jest
// normalne: emulacja mobile dokłada stały mnożnik CPU do hosta, więc wynik
// zależy od obciążenia maszyny. Czerwony przebieg lokalny NIE jest powodem
// do ruszania progów; bramkuje CI i tylko pomiar z CI jest podstawą
// ratchetu.
//
// ⚠️ Wariancja runnera na LCP bywa rzędu sekundy przy ZEROWEJ zmianie
// bajtów. Pojedynczy czerwony przebieg na LCP nie dowodzi regresji —
// najpierw porównaj `resource-summary` obu przebiegów; sygnałem jest
// dopiero różnica w BAJTACH.
module.exports = {
  ci: {
    collect: {
      staticDistDir: "./dist",
      // LHCI mierzy WYŁĄCZNIE adresy wpisane tutaj. „/" + trasa tekstowa
      // + lista ofert; adresy list i detali ofert z fixture'u dochodzą,
      // gdy powstaną ich widoki (Etap 4).
      url: ["/", "/polityka-prywatnosci/", "/oferty/"],
      // Mediana z 5 znacznie rzadziej ląduje na wartości odstającej.
      numberOfRuns: 5,
    },
    assert: {
      aggregationMethod: "median-run",
      assertions: {
        "categories:performance": ["error", { minScore: 0.7 }],
        "largest-contentful-paint": ["error", { maxNumericValue: 6000 }],
        "total-blocking-time": ["error", { maxNumericValue: 300 }],
        "cumulative-layout-shift": ["error", { maxNumericValue: 0.1 }],
        "resource-summary:script:size": ["error", { maxNumericValue: 60000 }],
        "resource-summary:total:size": ["error", { maxNumericValue: 1500000 }],
        // Cztery pliki: latin + polski subset dla dwóch krojów.
        "resource-summary:font:count": ["warn", { maxNumericValue: 4 }],
        // Fonty rosną wyłącznie wtedy, gdy ktoś świadomie doda krój albo
        // poszerzy zakres znaków w scripts/subset-fonts.mjs.
        "resource-summary:font:size": ["error", { maxNumericValue: 100000 }],
      },
    },
    upload: { target: "temporary-public-storage" },
  },
};
