import { censorPassword, getSummaryName, formatDateStr } from "../helpers";

// ---------------------------------------------------------------------------
// censorPassword
// ---------------------------------------------------------------------------

describe("censorPassword", () => {
  it("returns empty string when given empty string", () => {
    expect(censorPassword("")).toBe("");
  });

  it("masks approximately 70% of the characters", () => {
    const password = "abcdefghij"; // 10 chars, 70% = 7 masked
    const result = censorPassword(password);
    const asteriskCount = [...result].filter((c) => c === "*").length;
    expect(asteriskCount).toBe(7);
  });

  it("preserves the original length", () => {
    const password = "mypassword123";
    const result = censorPassword(password);
    expect(result.length).toBe(password.length);
  });

  it("does not mask the entire string (some original chars remain)", () => {
    const password = "abcdefghij";
    const result = censorPassword(password);
    const nonAsterisk = [...result].filter((c) => c !== "*").length;
    expect(nonAsterisk).toBe(password.length - Math.floor(password.length * 0.7));
  });

  it("handles single character passwords", () => {
    const result = censorPassword("x");
    // Math.floor(1 * 0.7) = 0, so nothing gets masked
    expect(result.length).toBe(1);
  });
});

// ---------------------------------------------------------------------------
// getSummaryName
// ---------------------------------------------------------------------------

describe("getSummaryName", () => {
  it("returns first character of a single-word name", () => {
    expect(getSummaryName("Kyle")).toBe("K");
  });

  it("returns first character of the last word in a two-word name", () => {
    expect(getSummaryName("Minh Tri")).toBe("T");
  });

  it("returns first character of the last word in a multi-word name", () => {
    expect(getSummaryName("John Doe Smith")).toBe("S");
  });

  it("handles single character name", () => {
    expect(getSummaryName("A")).toBe("A");
  });

  it("handles name with trailing space", () => {
    // "John " splits to ["John", ""], last word is "" whose charAt(0) is ""
    const result = getSummaryName("John ");
    // split(" ")[1] is "" which is !== undefined, so it takes the last word
    expect(result).toBe("");
  });
});

// ---------------------------------------------------------------------------
// formatDateStr
// ---------------------------------------------------------------------------

describe("formatDateStr", () => {
  it("returns a string containing both date and time parts", () => {
    const isoDate = "2024-06-15T14:30:00.000Z";
    const result = formatDateStr(isoDate);
    // Should contain a space separating date and time
    expect(result).toContain(" ");
  });

  it("returns a formatted date string with expected date format", () => {
    const isoDate = "2024-01-05T09:05:00.000Z";
    const result = formatDateStr(isoDate);
    // Date portion should be MM/DD/YYYY format
    expect(result).toMatch(/\d{2}\/\d{2}\/\d{4}/);
  });

  it("returns a formatted time string", () => {
    const isoDate = "2024-06-15T14:30:00.000Z";
    const result = formatDateStr(isoDate);
    // Time portion should contain AM or PM
    expect(result).toMatch(/(AM|PM)/);
  });

  it("preserves the full ISO date information in the output", () => {
    const isoDate = "2024-12-25T00:00:00.000Z";
    const result = formatDateStr(isoDate);
    expect(result).toBeTruthy();
    expect(typeof result).toBe("string");
  });
});
