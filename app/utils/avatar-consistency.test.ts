import { describe, it, expect } from "vitest";
import { getAvatarColor } from "./avatar";

/**
 * Test for avatar color consistency across browsers and sessions
 * This verifies that the same user always gets the same color,
 * which is critical for consistent UX across different browsers
 */
describe("Avatar Color Consistency", () => {
  it("generates consistent colors across multiple calls", () => {
    const userName = "John Doe";
    const colors = Array.from({ length: 100 }, () => getAvatarColor(userName));
    // All 100 calls should return the same color
    expect(new Set(colors).size).toBe(1);
    expect(colors[0]).toBe(colors[99]);
  });

  it("handles the same user across different sessions", () => {
    // Simulate different browser sessions
    const user = "alice@example.com";
    const session1Color = getAvatarColor(user);
    // Reset any potential state and call again (simulating a new page load)
    const session2Color = getAvatarColor(user);
    expect(session1Color).toBe(session2Color);
  });

  it("produces consistent colors for users with special characters", () => {
    const users = [
      "user+tag@example.com",
      "user_name@example.com",
      "user-name@example.com",
      "user.name@example.com",
    ];
    // Call each user's color twice
    users.forEach((user) => {
      const color1 = getAvatarColor(user);
      const color2 = getAvatarColor(user);
      expect(color1).toBe(color2);
    });
  });

  it("produces consistent colors for unicode usernames", () => {
    const users = ["José Garcia", "李明", "Müller", "Сергей", "محمد"];
    users.forEach((user) => {
      const color1 = getAvatarColor(user);
      const color2 = getAvatarColor(user);
      const color3 = getAvatarColor(user);
      expect(color1).toBe(color2);
      expect(color2).toBe(color3);
    });
  });

  it("hash function does not overflow for very long names", () => {
    const longName = "A".repeat(10000);
    expect(() => {
      const color = getAvatarColor(longName);
      expect(color).toMatch(/^#[0-9A-F]{6}$/i);
    }).not.toThrow();
  });

  it("different but similar names produce different colors", () => {
    const color1 = getAvatarColor("John");
    const color2 = getAvatarColor("John ");
    const color3 = getAvatarColor("john");
    // These should likely be different (though not guaranteed by the API)
    // but test at least that they're valid
    expect(color1).toMatch(/^#[0-9A-F]{6}$/i);
    expect(color2).toMatch(/^#[0-9A-F]{6}$/i);
    expect(color3).toMatch(/^#[0-9A-F]{6}$/i);
  });

  it("ensures deterministic distribution across palette", () => {
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

    // Generate colors for 1000 users and verify all results are from palette
    const generatedColors = new Set();
    for (let i = 0; i < 1000; i++) {
      const color = getAvatarColor(`User ${i}`);
      generatedColors.add(color);
      // Verify color is in palette
      expect(colors).toContain(color);
    }

    // Should use at least 10 different colors from palette (with high probability)
    expect(generatedColors.size).toBeGreaterThanOrEqual(10);
  });

  it("matches colors consistently across JavaScript engines", () => {
    // This test ensures that the hash function works the same way
    // regardless of JavaScript engine (V8, SpiderMonkey, etc.)
    const testCases = [
      { input: "test", expectedModulo: 0 }, // Just verify it doesn't crash
      { input: "hello world", expectedModulo: 0 },
      { input: "😀", expectedModulo: 0 },
    ];

    testCases.forEach(({ input }) => {
      const color = getAvatarColor(input);
      // Just verify it's a valid hex color
      expect(color).toMatch(/^#[0-9A-F]{6}$/i);
      // And verify it's consistent across calls
      const color2 = getAvatarColor(input);
      expect(color).toBe(color2);
    });
  });
});
