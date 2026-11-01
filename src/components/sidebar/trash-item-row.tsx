"use client";

import { FileText, RotateCcw, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { TRASH_EXPIRING_SOON_DAYS } from "@/lib/trash-retention";

export interface TrashedPage {
  id: string;
  title: string;
  icon: string | null;
  deleted_at: string;
}

interface TrashItemRowProps {
  page: TrashedPage;
  daysLeft: number;
  operating: boolean;
  onRestore: (page: TrashedPage) => void;
  onPermanentDelete: (page: TrashedPage) => void;
}

export function TrashItemRow({
  page,
  daysLeft,
  operating,
  onRestore,
  onPermanentDelete,
}: TrashItemRowProps) {
  const expiringSoon = daysLeft <= TRASH_EXPIRING_SOON_DAYS;
  const countdownLabel = daysLeft === 0 ? "Deletes today" : `${daysLeft}d left`;
  const countdownTitle =
    daysLeft === 0
      ? "Permanently deleted today"
      : `Permanently deleted in ${daysLeft} day${daysLeft === 1 ? "" : "s"}`;

  return (
    <div
      data-testid="trash-item"
      className="group relative flex items-center gap-2 px-2 py-0.5 text-sm text-muted-foreground hover:bg-overlay-hover"
    >
      <span className="flex h-4 w-4 shrink-0 items-center justify-center">
        {page.icon ? (
          <span className="text-sm">{page.icon}</span>
        ) : (
          <FileText className="h-4 w-4" />
        )}
      </span>

      <span className="flex-1 truncate text-left opacity-60">
        {page.title || "Untitled"}
      </span>

      <span
        data-testid="trash-purge-countdown"
        className={cn(
          "shrink-0 text-xs tabular-nums group-hover:hidden group-focus-within:hidden",
          expiringSoon ? "text-destructive" : "text-muted-foreground",
        )}
        title={countdownTitle}
      >
        {countdownLabel}
      </span>

      <div className="absolute right-2 flex items-center gap-0.5 opacity-0 group-hover:opacity-100 group-focus-within:opacity-100">
        <Button
          variant="ghost"
          size="icon-xs"
          className="h-5 w-5"
          onClick={() => onRestore(page)}
          disabled={operating}
          aria-label="Restore page"
          data-testid="trash-restore-btn"
        >
          <RotateCcw className="h-3 w-3" />
        </Button>
        <Button
          variant="ghost"
          size="icon-xs"
          className="h-5 w-5 text-destructive"
          onClick={() => onPermanentDelete(page)}
          disabled={operating}
          aria-label="Permanently delete page"
          data-testid="trash-delete-btn"
        >
          <X className="h-3 w-3" />
        </Button>
      </div>
    </div>
  );
}
