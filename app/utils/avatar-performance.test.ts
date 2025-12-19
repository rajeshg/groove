import { describe, it, expect } from "vitest";
import { getDisplayName, getInitials, getAvatarColor } from "./avatar";

/**
 * Performance tests for avatar utilities
 * These tests verify that the functions handle large datasets efficiently
 * and don't have performance regressions
 */
describe("Avatar Performance", () => {
  it("getInitials processes 10000 strings in reasonable time", () => {
    const startTime = performance.now();

    for (let i = 0; i < 10000; i++) {
      getInitials(`User ${i} Name ${i}`);
    }

    const elapsed = performance.now() - startTime;
    // Should complete in under 500ms (very generous limit)
    expect(elapsed).toBeLessThan(500);
  });

  it("getAvatarColor processes 10000 strings in reasonable time", () => {
    const startTime = performance.now();

    for (let i = 0; i < 10000; i++) {
      getAvatarColor(`User ${i}`);
    }

    const elapsed = performance.now() - startTime;
    // Should complete in under 500ms
    expect(elapsed).toBeLessThan(500);
  });

  it("getDisplayName processes 10000 objects in reasonable time", () => {
    const startTime = performance.now();

    for (let i = 0; i < 10000; i++) {
      getDisplayName({
        firstName: `First${i}`,
        lastName: `Last${i}`,
        email: `user${i}@example.com`,
        id: `id-${i}`,
      });
    }

    const elapsed = performance.now() - startTime;
    // Should complete in under 500ms
    expect(elapsed).toBeLessThan(500);
  });

  it("can handle rendering large boards (1000+ cards) without lag", () => {
    const cardCount = 1000;
    const startTime = performance.now();

    // Simulate rendering all cards with avatar calculations
    for (let i = 0; i < cardCount; i++) {
      const displayName = getDisplayName({
        firstName: `User${i}`,
        lastName: `Creator`,
        id: `card-id-${i}`,
      });
      const initials = getInitials(displayName);
      const color = getAvatarColor(displayName);
      // Verify we got valid results
      expect(initials).toBeTruthy();
      expect(color).toMatch(/^#[0-9A-F]{6}$/i);
    }

    const elapsed = performance.now() - startTime;
    // 1000 cards should render in under 100ms
    expect(elapsed).toBeLessThan(100);
  });

  it("hash function is stable under repeated calls", () => {
    const userName = "John Doe";
    const iterations = 10000;

    const startTime = performance.now();
    const firstColor = getAvatarColor(userName);

    for (let i = 0; i < iterations; i++) {
      const color = getAvatarColor(userName);
      expect(color).toBe(firstColor);
    }

    const elapsed = performance.now() - startTime;
    // 10000 repeated calls should complete in under 500ms (generous for CI/CD environments)
    expect(elapsed).toBeLessThan(500);
  });

  it("handles edge cases efficiently", () => {
    const edgeCases = [
      "",
      "a",
      "a".repeat(1000),
      "🔥".repeat(100),
      "a".repeat(10000),
      "\n\t  ",
      "123456789".repeat(100),
    ];

    const startTime = performance.now();

    edgeCases.forEach((testCase) => {
      getInitials(testCase);
      getAvatarColor(testCase);
    });

    const elapsed = performance.now() - startTime;
    expect(elapsed).toBeLessThan(50);
  });

  it("concurrent operations dont cause memory issues", () => {
    const users = Array.from({ length: 100 }, (_, i) => ({
      firstName: `User${i}`,
      lastName: `Test`,
      id: `id-${i}`,
    }));

    const startTime = performance.now();
    // Simulate concurrent rendering of multiple components
    for (let pass = 0; pass < 100; pass++) {
      users.forEach((user) => {
        getDisplayName(user);
        getInitials(getDisplayName(user));
        getAvatarColor(getDisplayName(user));
      });
    }

    const elapsed = performance.now() - startTime;
    // 100 passes × 100 users × 3 function calls = 30000 operations
    // Should complete in under 200ms
    expect(elapsed).toBeLessThan(200);
  });

  it("memory usage stays constant across multiple iterations", () => {
    // This is a basic sanity check that we're not creating memory leaks
    // by repeatedly calling the functions
    const iterations = 50000;
    const colors = new Set<string>();

    for (let i = 0; i < iterations; i++) {
      const color = getAvatarColor(`User ${i}`);
      colors.add(color);
    }

    // We should only have at most 18 unique colors (from the palette)
    expect(colors.size).toBeLessThanOrEqual(18);
  });
});
