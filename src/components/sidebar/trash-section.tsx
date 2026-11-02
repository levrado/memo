"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import { toast } from "@/lib/toast";
import { getClient } from "@/lib/supabase/lazy-client";
import {
  captureSupabaseError,
  isInsufficientPrivilegeError,
  isSchemaNotFoundError,
} from "@/lib/sentry";
import { retryOnNetworkError } from "@/lib/retry";
import {
  TRASH_RETENTION_DAYS,
  daysUntilPurge,
} from "@/lib/trash-retention";
import { useWorkspace } from "@/components/sidebar/workspace-context";
import {
  TrashItemRow,
  type TrashedPage,
} from "@/components/sidebar/trash-item-row";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";


export function TrashSection() {
  const router = useRouter();
  const { workspaceId } = useWorkspace();
  const [trashedPages, setTrashedPages] = useState<TrashedPage[]>([]);
  const [expanded, setExpanded] = useState(false);
  const [permanentDeleteTarget, setPermanentDeleteTarget] =
    useState<TrashedPage | null>(null);
  const [emptyTrashConfirm, setEmptyTrashConfirm] = useState(false);
  const [operating, setOperating] = useState(false);
  const [refetchKey, setRefetchKey] = useState(0);

  // Listen for trash changes from page-tree soft-delete
  useEffect(() => {
    function handleTrashChanged() {
      setRefetchKey((k) => k + 1);
    }
    window.addEventListener("trash-changed", handleTrashChanged);
    return () => window.removeEventListener("trash-changed", handleTrashChanged);
  }, []);

  // Fetch trashed pages for this workspace
  useEffect(() => {
    if (!workspaceId) return;

    let cancelled = false;

    async function fetchTrashed() {
      const { data, error } = await retryOnNetworkError(async () => {
        const supabase = await getClient();
        return supabase
          .from("pages")
          .select("id, title, icon, deleted_at")
          .eq("workspace_id", workspaceId)
          .not("deleted_at", "is", null)
          .order("deleted_at", { ascending: false });
      });

      if (cancelled) return;

      if (error) {
        if (
          !isSchemaNotFoundError(error) &&
          !isInsufficientPrivilegeError(error)
        ) {
          captureSupabaseError(error, "trash:fetch");
        }
        return;
      }

      if (data) {
        // Only show top-level trashed pages (pages that were directly trashed,
        // not their descendants). A top-level trashed page has either no parent
        // or its parent is not in the trashed set.
        setTrashedPages(data as TrashedPage[]);
      }
    }

    fetchTrashed();

    return () => {
      cancelled = true;
    };
  }, [workspaceId, refetchKey]);

  const handleRestore = useCallback(
    async (page: TrashedPage) => {
      setOperating(true);
      const supabase = await getClient();
      const { error } = await supabase.rpc("restore_page", {
        page_id: page.id,
      });

      if (error) {
        if (
          !isSchemaNotFoundError(error) &&
          !isInsufficientPrivilegeError(error)
        ) {
          captureSupabaseError(error, "trash:restore");
        }
        toast.error("Failed to restore page", { duration: 8000 });
      } else {
        setTrashedPages((prev) => prev.filter((p) => p.id !== page.id));
        toast.success("Page restored", { duration: 4000 });
        window.dispatchEvent(new CustomEvent("pages-changed"));
        router.refresh();
      }
      setOperating(false);
    },
    [router],
  );

  const handlePermanentDelete = useCallback(async () => {
    if (!permanentDeleteTarget) return;
    setOperating(true);

    const supabase = await getClient();
    const { error } = await supabase
      .from("pages")
      .delete()
      .eq("id", permanentDeleteTarget.id);

    if (error) {
      if (
        !isSchemaNotFoundError(error) &&
        !isInsufficientPrivilegeError(error)
      ) {
        captureSupabaseError(error, "trash:permanent-delete");
      }
      toast.error("Failed to permanently delete page", { duration: 8000 });
    } else {
      setTrashedPages((prev) =>
        prev.filter((p) => p.id !== permanentDeleteTarget.id),
      );
      toast("Page permanently deleted", { duration: 4000 });
    }

    setOperating(false);
    setPermanentDeleteTarget(null);
  }, [permanentDeleteTarget]);

  const handleEmptyTrash = useCallback(async () => {
    if (!workspaceId) return;
    setOperating(true);

    const supabase = await getClient();
    const { error } = await supabase.rpc("empty_trash", {
      ws_id: workspaceId,
    });

    if (error) {
      if (
        !isSchemaNotFoundError(error) &&
        !isInsufficientPrivilegeError(error)
      ) {
        captureSupabaseError(error, "trash:empty");
      }
      toast.error("Failed to empty trash", { duration: 8000 });
    } else {
      setTrashedPages([]);
      toast("Trash emptied", { duration: 4000 });
    }

    setOperating(false);
    setEmptyTrashConfirm(false);
  }, [workspaceId]);

  // Hidden when empty
  if (trashedPages.length === 0) return null;

  return (
    <div className="flex flex-col gap-0.5" data-testid="trash-section">
      <button
        className="flex items-center gap-2 px-2 py-0.5 text-xs tracking-widest uppercase text-label-faint hover:text-label-muted focus-visible:bg-overlay-active focus-visible:outline-none"
        onClick={() => setExpanded((prev) => !prev)}
        aria-expanded={expanded}
      >
        <Trash2 className="h-3 w-3" />
        <span className="flex-1 text-left">Trash</span>
        <span className="text-xs tabular-nums">{trashedPages.length}</span>
      </button>

      {expanded && (
        <div className="flex flex-col gap-0.5">
          {trashedPages.map((page) => (
            <TrashItemRow
              key={page.id}
              page={page}
              daysLeft={daysUntilPurge(page.deleted_at)}
              operating={operating}
              onRestore={handleRestore}
              onPermanentDelete={setPermanentDeleteTarget}
            />
          ))}

          <p className="px-2 pt-1 text-xs text-muted-foreground">
            Pages are permanently deleted after {TRASH_RETENTION_DAYS} days
          </p>

          <Button
            variant="ghost"
            size="sm"
            className="mx-2 mt-1 justify-start text-xs text-destructive hover:text-destructive"
            onClick={() => setEmptyTrashConfirm(true)}
            disabled={operating}
          >
            <Trash2 className="h-3 w-3" />
            Empty trash
          </Button>
        </div>
      )}

      {/* Permanent delete confirmation */}
      <AlertDialog
        open={permanentDeleteTarget !== null}
        onOpenChange={(open) => {
          if (!open) setPermanentDeleteTarget(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Permanently delete page</AlertDialogTitle>
            <AlertDialogDescription>
              {`"${permanentDeleteTarget?.title || "Untitled"}" will be permanently deleted. This action cannot be undone.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              onClick={handlePermanentDelete}
              disabled={operating}
            >
              {operating ? "Deleting…" : "Delete permanently"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Empty trash confirmation */}
      <AlertDialog
        open={emptyTrashConfirm}
        onOpenChange={setEmptyTrashConfirm}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Empty trash</AlertDialogTitle>
            <AlertDialogDescription>
              {`All ${trashedPages.length} trashed page${trashedPages.length === 1 ? "" : "s"} will be permanently deleted. This action cannot be undone.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              onClick={handleEmptyTrash}
              disabled={operating}
            >
              {operating ? "Emptying…" : "Empty trash"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
