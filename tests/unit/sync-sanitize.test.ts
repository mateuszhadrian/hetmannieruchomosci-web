// Sanityzacja opisu: widoczny tekst przed = po; script/on*/style wycięte;
// style → klasy; b/i → strong/em; <br /> → <br>; serie <br> ≤ 2.
import { describe, expect, it } from "vitest";
import {
  normalizeHtml,
  sameDescription,
  sanitizeDescription,
} from "../../scripts/sync/sanitize";
import { textContent } from "../helpers/html";
import { readSyntheticList } from "../helpers/raw";

describe("sanitizeDescription()", () => {
  it("nie zmienia widocznego tekstu opisów syntetycznych", () => {
    for (const raw of readSyntheticList()) {
      for (const field of ["description", "descriptionWebsite"] as const) {
        const html = raw[field];
        if (typeof html !== "string") continue;
        // script jest nie-tekstem (jego treść nie należy do opisu),
        // a \r\n → \n to jedyna zamierzona zmiana w tekście
        const expected = textContent(
          normalizeHtml(html.replace(/<script[\s\S]*?<\/script>/gi, "")),
        );
        expect(textContent(sanitizeDescription(html))).toBe(expected);
      }
    }
  });

  it("wycina script, iframe, img, atrybuty on* i style", () => {
    const out = sanitizeDescription(
      '<p onclick="x()" style="color:red">A<script>alert(1)</script><iframe src="x"></iframe><img src="x"></p>',
    );
    expect(out).toBe("<p>A</p>");
  });

  it("style → klasy z mapy; text-align: left bez śladu; inne style znikają", () => {
    expect(
      sanitizeDescription('<div style="text-align: justify">A</div>'),
    ).toBe('<div class="ta-justify">A</div>');
    expect(sanitizeDescription('<div style="text-align:center;">A</div>')).toBe(
      '<div class="ta-center">A</div>',
    );
    expect(sanitizeDescription('<div style="text-align: left">A</div>')).toBe(
      "<div>A</div>",
    );
    expect(
      sanitizeDescription('<span style="text-decoration: underline">A</span>'),
    ).toBe('<span class="u">A</span>');
    expect(sanitizeDescription('<span style="font-size: 30px">A</span>')).toBe(
      "<span>A</span>",
    );
    expect(sanitizeDescription('<div class="evil" id="x">A</div>')).toBe(
      "<div>A</div>",
    );
  });

  it("b/i → strong/em, u zostaje, listy zostają", () => {
    expect(sanitizeDescription("<b>A</b> <i>B</i> <u>C</u>")).toBe(
      "<strong>A</strong> <em>B</em> <u>C</u>",
    );
    expect(sanitizeDescription("<ul><li>A</li></ul><ol><li>B</li></ol>")).toBe(
      "<ul><li>A</li></ul><ol><li>B</li></ol>",
    );
  });

  it("nieznane tagi znikają, tekst zostaje", () => {
    expect(
      sanitizeDescription("<h1>A</h1><table><tr><td>B</td></tr></table>"),
    ).toBe("AB");
  });

  it("<br /> → <br>, \\r\\n → \\n, maks. dwa <br> z rzędu", () => {
    expect(sanitizeDescription("A<br />B\r\nC")).toBe("A<br>B\nC");
    expect(sanitizeDescription("A<br><br><br><br>B")).toBe("A<br><br>B");
    expect(sanitizeDescription("A<br /> <br />\n<br />B")).toBe("A<br><br>B");
    expect(sanitizeDescription("A<br><br>B")).toBe("A<br><br>B");
  });

  it("linki: tylko http(s)/mailto, z rel i target; javascript: znika", () => {
    expect(
      sanitizeDescription('<a href="https://example.invalid/x">S</a>'),
    ).toBe(
      '<a href="https://example.invalid/x" rel="noopener" target="_blank">S</a>',
    );
    expect(
      sanitizeDescription('<a href="mailto:a@example.invalid">M</a>'),
    ).toContain('href="mailto:a@example.invalid"');
    expect(
      sanitizeDescription('<a href="javascript:alert(1)" onclick="x()">L</a>'),
    ).toBe("<a>L</a>");
  });

  it("pusty i brakujący opis → pusty ciąg; spacja niełamliwa zostaje", () => {
    expect(sanitizeDescription("")).toBe("");
    expect(sanitizeDescription(null)).toBe("");
    expect(sanitizeDescription(undefined)).toBe("");
    expect(textContent(sanitizeDescription("A B"))).toBe("A B");
  });
});

describe("sameDescription()", () => {
  it("różnica tylko w serializacji <br /> i \\r\\n = ten sam opis", () => {
    expect(sameDescription("A<br />B\r\n", "A<br>B\n")).toBe(true);
    expect(sameDescription("A", "B")).toBe(false);
  });
});
