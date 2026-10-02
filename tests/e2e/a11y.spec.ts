// Dostępność: skan axe-core na wszystkich trasach (PL-only) oraz na
// pierwszej liście i pierwszym detalu oferty z danych produkcyjnych (Etap 3;
// przy zerze ofert — skip z powodem). Poziom bramkujący: zero naruszeń
// critical/serious; pełny raport (wszystkie poziomy) ląduje w artefaktach
// testu — ratchet jak w LHCI. Skan na jednym profilu desktop i jednym
// mobile (układy się różnią); pozostałe projekty nie wnoszą nowych
// informacji. Zdjęcia ofert z hosta mediów są zaślepiane (useMediaStub).
import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import { STATIC_PATHS } from "../../src/lib/routes";
import { useMediaStub } from "../helpers/guards";
import { offerRoutesFromData } from "../helpers/offers";
import { gotoReady } from "../helpers/scroll";

const A11Y_PROJECTS = ["chromium-1920", "chromium-pixel-5"];

// RATCHET — allowlista znanych naruszeń startuje PUSTA i taka ma zostać:
// test bramkuje każde naruszenie critical/serious. Nowy wpis wolno dodać
// WYŁĄCZNIE decyzją Mateusza (świadomy wyjątek z uzasadnieniem); usunięcie
// wpisu = zacieśnienie.
const KNOWN_VIOLATIONS: Record<string, RegExp[]> = {};

function isKnown(ruleId: string, target: string): boolean {
  return (KNOWN_VIOLATIONS[ruleId] ?? []).some((re) => re.test(target));
}

// Trasy ofert: pierwsza lista typ×transakcja i pierwszy detal z `data/`
// (helper — plików może nie być). Które to oferty, zmienia się co noc;
// kontrakt dotyczy SZABLONU listy i detalu, nie konkretnej oferty.
const OFFER_ROUTES = offerRoutesFromData();
const NO_OFFERS = "brak ofert w data/ (zero ofert = stan dopuszczalny)";

// Każda trasa jest skanowana na obu profilach (układy się różnią).
const PATHS: { path: string; projects?: string[]; skipReason?: string }[] = [
  ...STATIC_PATHS.map((path) => ({ path })),
  // strona 404 (dowolny nieistniejący adres serwuje dist/404.html)
  { path: "/nie-ma-takiej-strony/" },
  {
    path: OFFER_ROUTES.lists[0] ?? "(lista ofert)",
    skipReason: OFFER_ROUTES.lists[0] ? undefined : NO_OFFERS,
  },
  {
    path: OFFER_ROUTES.details[0] ?? "(detal oferty)",
    skipReason: OFFER_ROUTES.details[0] ? undefined : NO_OFFERS,
  },
];

useMediaStub();

for (const { path, projects, skipReason } of PATHS) {
  test(`axe: brak naruszeń critical/serious na ${path}`, async ({
    page,
  }, testInfo) => {
    test.skip(Boolean(skipReason), skipReason);
    const allowed = projects ?? A11Y_PROJECTS;
    test.skip(
      !A11Y_PROJECTS.includes(testInfo.project.name) ||
        !allowed.includes(testInfo.project.name),
      "skan a11y tylko na chromium-1920 i chromium-pixel-5",
    );
    await gotoReady(page, path);
    const results = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa"])
      .analyze();

    await testInfo.attach(`axe-report${path.replaceAll("/", "-")}.json`, {
      body: JSON.stringify(results.violations, null, 2),
      contentType: "application/json",
    });

    const gating = results.violations
      .filter((v) => ["critical", "serious"].includes(v.impact ?? ""))
      .map((v) => ({
        id: v.id,
        impact: v.impact,
        help: v.help,
        // Ratchet: węzły z allowlisty odpadają; nowe węzły bramkują.
        nodes: v.nodes
          .map((n) => n.target.join(" "))
          .filter((target) => !isKnown(v.id, target)),
      }))
      .filter((v) => v.nodes.length > 0);
    expect(gating).toEqual([]);
  });
}
