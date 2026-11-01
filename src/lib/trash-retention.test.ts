import { describe, it, expect } from "vitest";
import {
  TRASH_RETENTION_DAYS,
  TRASH_EXPIRING_SOON_DAYS,
  daysUntilPurge,
} from "./trash-retention";

const NOW = new Date("2026-11-01T12:00:00Z");

function deletedDaysAgo(days: number): string {
  return new Date(NOW.getTime() - days * 86_400_000).toISOString();
}

describe("daysUntilPurge", () => {
  it("returns the full retention period for a just-deleted page", () => {
    expect(daysUntilPurge(NOW.toISOString(), NOW)).toBe(TRASH_RETENTION_DAYS);
  });

  it("returns days remaining for a mid-retention page", () => {
    expect(daysUntilPurge(deletedDaysAgo(12), NOW)).toBe(18);
  });

  it("returns a low value for a page near expiry", () => {
    expect(daysUntilPurge(deletedDaysAgo(27), NOW)).toBe(3);
  });

  it("returns 0 for a page past the retention period", () => {
    expect(daysUntilPurge(deletedDaysAgo(30), NOW)).toBe(0);
    expect(daysUntilPurge(deletedDaysAgo(45), NOW)).toBe(0);
  });

  it("clamps to the retention period when deleted_at is in the future", () => {
    expect(daysUntilPurge(deletedDaysAgo(-5), NOW)).toBe(TRASH_RETENTION_DAYS);
  });

  it("treats partial days as elapsed once a full day has passed", () => {
    const almostTwoDays = new Date(
      NOW.getTime() - (1 * 86_400_000 + 86_400_000 - 1),
    ).toISOString();
    expect(daysUntilPurge(almostTwoDays, NOW)).toBe(TRASH_RETENTION_DAYS - 1);
  });

  it("defines the expiring-soon threshold as a positive bound below retention", () => {
    expect(TRASH_EXPIRING_SOON_DAYS).toBeGreaterThan(0);
    expect(TRASH_EXPIRING_SOON_DAYS).toBeLessThan(TRASH_RETENTION_DAYS);
  });
});
