// Polityka prywatności (Etap 4.7, docs/analiza-polityka.md): stałe
// dokumentu i bramka projektu. Sekcje mają stabilne, znaczące kotwice;
// data dokumentu to stała (nie „teraz" builda); wyłączenie POLICY_DRAFT
// wymaga daty obowiązywania i ZERA znaczników niewiadomych w treści.
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  formatPolicyDate,
  POLICY_DRAFT,
  POLICY_EFFECTIVE,
  POLICY_OBJECTION_ID,
  POLICY_SECTIONS,
  POLICY_UPDATED,
  POLICY_VERSION,
  policyHeadingId,
  policySectionTitle,
} from "../../src/components/sections/policy/policy-config";

const DIR = join(process.cwd(), "src/components/sections/policy");
const ISO_DAY = /^\d{4}-\d{2}-\d{2}$/;

/** Źródła komponentów polityki (bez samego znacznika). */
function sources(): { name: string; text: string }[] {
  return readdirSync(DIR)
    .filter((name) => name.endsWith(".astro") && name !== "PolicyTodo.astro")
    .map((name) => ({ name, text: readFileSync(join(DIR, name), "utf8") }));
}

describe("sekcje polityki", () => {
  it("kotwice są unikalne, znaczące i czystym ASCII", () => {
    const ids = POLICY_SECTIONS.map((s) => s.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const id of ids) expect(id).toMatch(/^[a-z]+(-[a-z]+)*$/);
    // numer w kotwicy psułby adresy przy przestawieniu sekcji
    for (const id of ids) expect(id).not.toMatch(/\d/);
  });

  it("tytuły są niepuste i unikalne; nagłówki mają własne id", () => {
    const titles = POLICY_SECTIONS.map((s) => s.title);
    expect(new Set(titles).size).toBe(titles.length);
    for (const s of POLICY_SECTIONS) {
      expect(s.title.trim()).toBe(s.title);
      expect(s.title.length).toBeGreaterThan(5);
      expect(policySectionTitle(s.id)).toBe(s.title);
      expect(policyHeadingId(s.id)).toBe(`pp-${s.id}-h`);
    }
  });

  it("prawo sprzeciwu jest osobną sekcją", () => {
    expect(POLICY_SECTIONS.map((s) => s.id)).toContain(POLICY_OBJECTION_ID);
    // odrębnie od listy praw: sekcja praw stoi tuż przed nią
    const ids = POLICY_SECTIONS.map((s) => s.id as string);
    expect(ids.indexOf(POLICY_OBJECTION_ID)).toBe(ids.indexOf("prawa") + 1);
  });

  it("treść niesie każdą sekcję raz, w kolejności ze spisu", () => {
    const body = readFileSync(join(DIR, "PolicyBody.astro"), "utf8");
    const used = [...body.matchAll(/<PolicySection id="([^"]+)"/g)].map(
      (m) => m[1],
    );
    expect(used).toEqual(POLICY_SECTIONS.map((s) => s.id));
  });
});

describe("data i wersja dokumentu", () => {
  it("formatPolicyDate: dzień, miesiąc w dopełniaczu, rok", () => {
    expect(formatPolicyDate("2026-10-04")).toBe("4 października 2026 r.");
    expect(formatPolicyDate("2027-01-31")).toBe("31 stycznia 2027 r.");
    expect(() => formatPolicyDate("04.10.2026")).toThrow();
    expect(() => formatPolicyDate("2026-13-01")).toThrow();
  });

  it("stałe dokumentu mają poprawny kształt", () => {
    expect(POLICY_UPDATED).toMatch(ISO_DAY);
    expect(() => formatPolicyDate(POLICY_UPDATED)).not.toThrow();
    expect(POLICY_VERSION).toMatch(/^\d+\.\d+$/);
    if (POLICY_EFFECTIVE !== null) {
      expect(POLICY_EFFECTIVE).toMatch(ISO_DAY);
      expect(() => formatPolicyDate(POLICY_EFFECTIVE!)).not.toThrow();
    }
  });

  it("data dokumentu nie pochodzi z „teraz” builda", () => {
    for (const { name, text } of sources()) {
      expect(text, name).not.toContain("BUILD_NOW");
      expect(text, name).not.toMatch(/new Date\(/);
    }
  });
});

describe("bramka projektu (POLICY_DRAFT)", () => {
  const uses = sources().flatMap(({ name, text }) =>
    [...text.matchAll(/<PolicyTodo\b/g)].map(() => name),
  );

  it("projekt niesie znaczniki; wersja ostateczna — żadnego", () => {
    if (POLICY_DRAFT) {
      expect(uses.length).toBeGreaterThan(0);
    } else {
      expect(uses, "znaczniki w wersji ostatecznej").toEqual([]);
      expect(POLICY_EFFECTIVE, "data obowiązywania").not.toBeNull();
    }
  });
});
