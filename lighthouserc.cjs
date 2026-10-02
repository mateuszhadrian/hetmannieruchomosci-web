// Lighthouse CI — profil MOBILE (domyślna emulacja LHCI: Moto G Power,
// CPU 4×, sieć 4G) = nasz proxy „słabszego Androida".
// Profil desktop: lighthouserc.desktop.cjs.
//
// Mierzony jest build z FIXTURE (`pnpm build:visual` w jobie lighthouse) —
// treść zamrożona, więc budżet nie pływa z nocnym syncem.
// BUDŻETY = RATCHET od pomiaru bazowego na runnerze CI (lhci-measure.yml,
// 5 przebiegów, 2026-10-02, szkielet Etapu 3; mediany identyczne dla
// trzech adresów): perf 1.00, LCP 1 808 ms, TBT 0 ms, CLS 0,0017,
// script 4 KB, total 130 KB, fonty 4 pliki / 67 KB.
// Reguły progów: LCP = max(mediana ×1,15; mediana + 1,3 s) zaokrąglone
// w górę (wariancja runnera); TBT z mediany 0 dostaje ręczne minimum;
// wagi zasobów z zapasem na przyrost sekcji widoków (Etap 4 dokłada
// zdjęcia kart i moduły nakładek) — mimo to każdy widok, który budżet
// przekroczy, wymaga świadomej decyzji, nie cichego podniesienia.
// Zmiana progu = decyzja Mateusza, osobny commit, po ponownym pomiarze.
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
      url: [
        "/",
        "/polityka-prywatnosci/",
        "/oferty/",
        // lista SSG z fixture'u (4.2 a): 2 karty, obniżka, plakietka Sprzedane
        "/oferty/mieszkanie-na-sprzedaz/",
      ],
      // Mediana z 5 znacznie rzadziej ląduje na wartości odstającej.
      numberOfRuns: 5,
    },
    assert: {
      aggregationMethod: "median-run",
      assertions: {
        "categories:performance": ["error", { minScore: 0.9 }],
        // mediana 1 808 ms + 1 300 ms = 3 108 → 3 200
        "largest-contentful-paint": ["error", { maxNumericValue: 3200 }],
        // TBT po wyspie wyszukiwarki (4.2 b, R27): pomiar lhci-measure.yml
        // 2026-10-02 (5 przebiegów, main po #17): /oferty/ 31/40/47/54/456 ms
        // → mediana 47 ms; /oferty/mieszkanie-na-sprzedaz/ 5/22/24/24/62 ms
        // → mediana 24 ms. Jedno zadanie hydratacji wyspy skacze na
        // obciążonym runnerze 10× (75 → 579 ms) przy ZEROWEJ zmianie bajtów,
        // więc ×1,15 z lhci-median.mjs jest dla TBT za ciasne. Reguła
        // max(mediana × 2; mediana + 300 ms) dałaby 350 ms, ale przebieg
        // odstający (456 ms) i czerwony bieg na main po #17 (485 ms jako
        // MEDIANA z 5) leżą powyżej — próg = ok. 1,15 × najgorszy
        // obserwowany przebieg, zaokrąglony do granicy „poor" Google:
        // 600 ms (decyzja Mateusza 2026-10-02: zapas ponad fałszywe
        // czerwienie runnera). Realny kod: mediana 47 ms.
        "total-blocking-time": ["error", { maxNumericValue: 600 }],
        // mediana 0,0017 — połowa progu „good" Google
        "cumulative-layout-shift": ["error", { maxNumericValue: 0.05 }],
        // mediana 4 KB; zapas na nakładki, wyszukiwarkę i galerię (Etap 4)
        "resource-summary:script:size": ["error", { maxNumericValue: 30000 }],
        // mediana 130 KB; zapas na zdjęcia kart listy i hero (Etap 4)
        "resource-summary:total:size": ["error", { maxNumericValue: 1000000 }],
        // Cztery pliki: latin + polski subset dla dwóch krojów.
        "resource-summary:font:count": ["error", { maxNumericValue: 4 }],
        // mediana 67 KB → +10 % = 74 KB. Fonty rosną wyłącznie wtedy, gdy
        // ktoś świadomie doda krój albo poszerzy zakres znaków
        // w scripts/subset-fonts.mjs.
        "resource-summary:font:size": ["error", { maxNumericValue: 76000 }],
      },
    },
    upload: { target: "temporary-public-storage" },
  },
};
