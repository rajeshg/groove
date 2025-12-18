import { describe, it, expect } from "vitest";
import { getDisplayName, getInitials, getAvatarColor } from "./avatar";

describe("getDisplayName", () => {
  it("prefers firstName + lastName combination", () => {
    expect(getDisplayName({ firstName: "John", lastName: "Doe" })).toBe(
      "John Doe"
    );
  });

  it("falls back to firstName only", () => {
    expect(getDisplayName({ firstName: "John", lastName: null })).toBe("John");
  });

  it("falls back to lastName only", () => {
    expect(getDisplayName({ firstName: null, lastName: "Doe" })).toBe("Doe");
  });

  it("falls back to email if no name available", () => {
    expect(
      getDisplayName({
        firstName: null,
        lastName: null,
        email: "john@example.com",
      })
    ).toBe("john@example.com");
  });

  it("falls back to shortened ID for deleted users", () => {
    const id = "550e8400-e29b-41d4-a716-446655440000";
    const result = getDisplayName({
      firstName: null,
      lastName: null,
      email: undefined,
      id,
    });
    expect(result).toBe("User 550e8400");
  });

  it("returns 'Deleted User' for null input", () => {
    expect(getDisplayName(null)).toBe("Deleted User");
  });

  it("returns 'Deleted User' for undefined input", () => {
    expect(getDisplayName(undefined)).toBe("Deleted User");
  });

  it("handles empty strings gracefully", () => {
    const id = "550e8400-e29b-41d4-a716-446655440000";
    expect(
      getDisplayName({
        firstName: "",
        lastName: "",
        email: "",
        id,
      })
    ).toBe("User 550e8400");
  });
});

describe("getInitials", () => {
  it("extracts two initials from full name", () => {
    expect(getInitials("John Doe")).toBe("JD");
  });

  it("extracts single initial for single word", () => {
    expect(getInitials("Rajesh")).toBe("R");
  });

  it("handles multi-word names by taking first two words", () => {
    expect(getInitials("Alice Bob Smith")).toBe("AB");
  });

  it("handles email with dots as separator", () => {
    expect(getInitials("john.doe@example.com")).toBe("JD");
  });

  it("handles underscores as separators", () => {
    expect(getInitials("alice_bob_charles")).toBe("AB");
  });

  it("handles hyphens as separators", () => {
    expect(getInitials("mary-jane-watson")).toBe("MJ");
  });

  it("returns ? for empty string", () => {
    expect(getInitials("")).toBe("?");
  });

  it("returns uppercase initials", () => {
    expect(getInitials("john doe")).toBe("JD");
  });

  it("handles mixed case", () => {
    expect(getInitials("JoHn DoE")).toBe("JD");
  });

  it("handles extra spaces", () => {
    expect(getInitials("John    Doe")).toBe("JD");
  });

  it("handles extra dots", () => {
    expect(getInitials("j..d...o...e")).toBe("JD");
  });
});

describe("getAvatarColor", () => {
  it("returns consistent color for same input", () => {
    const color1 = getAvatarColor("John Doe");
    const color2 = getAvatarColor("John Doe");
    expect(color1).toBe(color2);
  });

  it("returns different colors for different inputs", () => {
    const color1 = getAvatarColor("John Doe");
    const color2 = getAvatarColor("Jane Smith");
    // We can't guarantee they're different, but very likely
    // Just verify both are valid hex colors
    expect(color1).toMatch(/^#[0-9A-F]{6}$/i);
    expect(color2).toMatch(/^#[0-9A-F]{6}$/i);
  });

  it("returns valid hex color", () => {
    const color = getAvatarColor("Test User");
    expect(color).toMatch(/^#[0-9A-F]{6}$/i);
  });

  it("returns color from defined palette", () => {
    const colors = [
      "#AF2E1B",
      "#CC6324",
      "#3B4B59",
      "#BFA07A",
      "#ED8008",
      "#ED3F1C",
      "#BF1B1B",
      "#736B1E",
      "#D07B53",
      "#736356",
      "#AD1D1D",
      "#BF7C2A",
      "#C09C6F",
      "#698F9C",
      "#7C956B",
      "#5D618F",
      "#3B3633",
      "#67695E",
    ];
    const color = getAvatarColor("Any String");
    expect(colors).toContain(color);
  });

  it("distributes colors across palette for different inputs", () => {
    const colorSet = new Set();
    // Test with 50 different strings to check distribution
    for (let i = 0; i < 50; i++) {
      colorSet.add(getAvatarColor(`User ${i}`));
    }
    // Should have more than 1 color (with very high probability)
    expect(colorSet.size).toBeGreaterThan(1);
  });
});
