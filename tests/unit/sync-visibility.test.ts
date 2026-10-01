// Widoczność (part3 §2.1): status aktywny + eksport; przełącznik Z9;
// W4; diff widoczności liczony z numerów ofert widocznych (bez
// przechowywania statusów ofert spoza strony).
import { describe, expect, it } from "vitest";
import {
  ACTIVE_STATUS,
  ALL_STATUSES,
  diffVisibility,
  exportWarning,
  isVisible,
} from "../../scripts/sync/visibility";
import { readSyntheticList } from "../helpers/raw";

describe("isVisible", () => {
  it("rekordy syntetyczne (status 3, eksport 1) są widoczne", () => {
    for (const raw of readSyntheticList()) expect(isVisible(raw)).toBe(true);
  });

  it("status inny niż aktywny → niewidoczna, nawet z eksportem", () => {
    expect(isVisible({ status: 9, offerExport: 1 })).toBe(false);
    expect(isVisible({ status: 52, offerExport: 0 })).toBe(false);
    expect(isVisible({ status: "52", offerExport: "1" })).toBe(false);
  });

  it("reguła domyślna wymaga eksportu, `status-only` nie", () => {
    const rec = { status: "3", offerExport: 0 };
    expect(isVisible(rec, "status-and-export")).toBe(false);
    expect(isVisible(rec, "status-only")).toBe(true);
    expect(isVisible({ status: 3 }, "status-and-export")).toBe(false);
  });

  it("pełna lista statusów zawiera 52 i 1 (realnie używane) oraz 3", () => {
    expect(ALL_STATUSES).toContain(52);
    expect(ALL_STATUSES).toContain(1);
    expect(ALL_STATUSES).toContain(ACTIVE_STATUS);
  });
});

describe("W4 niespójny eksport", () => {
  it("status 9 z eksportem 1 → W4 z numerem poza message", () => {
    const w = exportWarning({ status: 9, offerExport: 1, number: "SW900009" });
    expect(w?.code).toBe("W4");
    expect(w?.number).toBe("SW900009");
    expect(w?.message).not.toContain("SW900009");
    expect(w?.detail).toBe("status=9");
  });

  it("status 3 albo eksport 0 → brak ostrzeżenia", () => {
    expect(exportWarning({ status: 3, offerExport: 1 })).toBeUndefined();
    expect(exportWarning({ status: 9, offerExport: 0 })).toBeUndefined();
  });
});

describe("diffVisibility", () => {
  const all = [
    { id: 1, number: "SW900001", status: 3 },
    { id: 2, number: "SW900002", status: 52 },
    { id: 3, number: "SW900003", status: 3 },
  ];

  it("zniknięte dostają status docelowy, brak w CRM = bez statusu", () => {
    const diff = diffVisibility(
      ["SW900001", "SW900002", "SW900009"],
      ["SW900001", "SW900003"],
      all,
    );
    expect(diff.gone).toEqual([
      { number: "SW900002", status: 52 },
      { number: "SW900009" },
    ]);
    expect(diff.appeared).toEqual(["SW900003"]);
  });

  it("bez zmian → pusty diff", () => {
    const diff = diffVisibility(["SW900001"], ["SW900001"], all);
    expect(diff).toEqual({ gone: [], appeared: [] });
  });
});
