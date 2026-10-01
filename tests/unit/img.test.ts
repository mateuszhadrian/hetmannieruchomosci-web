// Kontrakt imgAt() — jedyne miejsce wiedzy o rozmiarach obrazów ofert
// (D29). Tryby czytane z import.meta.env w chwili wywołania — stubujemy
// env per test (DEV, MEDIA_SOURCE).
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  FIXTURE_MEDIA_PREFIX,
  IMG_VARIANTS,
  fixtureMediaPath,
  imgAt,
  mediaUrl,
} from "../../src/lib/img";
import { MEDIA_BASE } from "../../src/lib/site-config";

const KEY = "offers/90000001/500000001-abcdef01.jpg";

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("MEDIA_BASE", () => {
  it("jest adresem absolutnym https bez końcowego ukośnika albo pustym ciągiem", () => {
    expect(MEDIA_BASE === "" || /^https:\/\/[^/]+$/.test(MEDIA_BASE)).toBe(
      true,
    );
  });
});

describe("imgAt: produkcja (DEV=false)", () => {
  it("buduje {MEDIA_BASE}/cdn-cgi/image/{opcje}/{r2Key} dla każdego wariantu", () => {
    vi.stubEnv("DEV", false);
    vi.stubEnv("MEDIA_SOURCE", "");
    for (const variant of ["card", "hero", "og"] as const) {
      expect(imgAt(KEY, variant)).toBe(
        `${MEDIA_BASE}/cdn-cgi/image/${IMG_VARIANTS[variant]}/${KEY}`,
      );
    }
  });

  it("warianty: stały format=webp, onerror=redirect, og 1200×630 cover", () => {
    for (const opts of Object.values(IMG_VARIANTS)) {
      expect(opts).toContain("format=webp");
      expect(opts).not.toContain("format=auto");
      expect(opts).toContain("onerror=redirect");
      expect(opts).toMatch(/(^|,)width=\d+(,|$)/);
    }
    expect(IMG_VARIANTS.og).toContain("width=1200,height=630,fit=cover");
    const w = (v: string) => Number(/width=(\d+)/.exec(v)![1]);
    expect(w(IMG_VARIANTS.card)).toBeLessThan(w(IMG_VARIANTS.hero));
  });

  it("zdejmuje wiodący '/' z klucza (unika //)", () => {
    vi.stubEnv("DEV", false);
    vi.stubEnv("MEDIA_SOURCE", "");
    expect(imgAt(`/${KEY}`, "card")).toBe(imgAt(KEY, "card"));
    expect(imgAt(KEY, "card")).not.toContain("//offers");
  });
});

describe("imgAt: dev (DEV=true)", () => {
  it("zwraca oryginał z zasobnika — bez transformacji na localhoście", () => {
    vi.stubEnv("DEV", true);
    vi.stubEnv("MEDIA_SOURCE", "");
    expect(imgAt(KEY, "hero")).toBe(mediaUrl(KEY));
    expect(mediaUrl(KEY)).toBe(`${MEDIA_BASE}/${KEY}`);
  });
});

describe("imgAt: fixture (MEDIA_SOURCE=fixture)", () => {
  it("ścieżka lokalna /media/{klucz}.webp niezależnie od DEV", () => {
    vi.stubEnv("MEDIA_SOURCE", "fixture");
    vi.stubEnv("DEV", false);
    expect(imgAt(KEY, "card")).toBe(
      `${FIXTURE_MEDIA_PREFIX}/offers/90000001/500000001-abcdef01.webp`,
    );
    vi.stubEnv("DEV", true);
    expect(imgAt(KEY, "og")).toBe(fixtureMediaPath(KEY));
    expect(imgAt(KEY, "og")).not.toContain("https://");
  });
});
