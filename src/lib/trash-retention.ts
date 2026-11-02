const MS_PER_DAY = 86_400_000;

/**
 * Pages in trash are permanently purged by `purge_old_trash` once
 * `deleted_at` is older than this many days (see migration
 * `20260421092413_add_soft_delete_to_pages.sql` and the
 * `GET /api/cron/purge-trash` cron).
 */
export const TRASH_RETENTION_DAYS = 30;

/** Items at or below this threshold are shown as expiring soon. */
export const TRASH_EXPIRING_SOON_DAYS = 3;

/**
 * Days remaining until a trashed page is permanently purged.
 * Clamped to [0, TRASH_RETENTION_DAYS] so clock skew or a delayed cron
 * never produces out-of-range values.
 */
export function daysUntilPurge(deletedAt: string, now: Date = new Date()): number {
  const elapsed = Math.floor(
    (now.getTime() - new Date(deletedAt).getTime()) / MS_PER_DAY,
  );
  return Math.min(
    TRASH_RETENTION_DAYS,
    Math.max(0, TRASH_RETENTION_DAYS - elapsed),
  );
}
