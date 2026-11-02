import type { Meta, StoryObj } from "@storybook/react";
import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { TrashItemRow } from "./trash-item-row";
import { TRASH_RETENTION_DAYS } from "@/lib/trash-retention";

// TrashSection depends on next/navigation and Supabase.
// These stories render the visual appearance via the presentational
// TrashItemRow with static data and fixed daysLeft values.

const meta: Meta = {
  title: "Sidebar/TrashSection",
};

export { meta as default };

type Story = StoryObj;

const noop = () => {};

function TrashList({
  count,
  children,
}: {
  count: number;
  children: React.ReactNode;
}) {
  return (
    <div className="w-56 bg-muted p-2">
      <div className="flex flex-col gap-0.5">
        <button
          className="flex items-center gap-2 px-2 py-0.5 text-xs tracking-widest uppercase text-label-faint hover:text-label-muted"
          aria-expanded={true}
        >
          <Trash2 className="h-3 w-3" />
          <span className="flex-1 text-left">Trash</span>
          <span className="text-xs tabular-nums">{count}</span>
        </button>
        <div className="flex flex-col gap-0.5">
          {children}
          <p className="px-2 pt-1 text-xs text-muted-foreground">
            Pages are permanently deleted after {TRASH_RETENTION_DAYS} days
          </p>
          <Button
            variant="ghost"
            size="sm"
            className="mx-2 mt-1 justify-start text-xs text-destructive hover:text-destructive"
          >
            <Trash2 className="h-3 w-3" />
            Empty trash
          </Button>
        </div>
      </div>
    </div>
  );
}

export const Collapsed: Story = {
  render: () => (
    <div className="w-56 bg-muted p-2">
      <div className="flex flex-col gap-0.5">
        <button
          className="flex items-center gap-2 px-2 py-0.5 text-xs tracking-widest uppercase text-label-faint hover:text-label-muted"
          aria-expanded={false}
        >
          <Trash2 className="h-3 w-3" />
          <span className="flex-1 text-left">Trash</span>
          <span className="text-xs tabular-nums">3</span>
        </button>
      </div>
    </div>
  ),
};

export const Expanded: Story = {
  name: "Expanded (varied retention)",
  render: () => (
    <TrashList count={3}>
      <TrashItemRow
        page={{
          id: "t1",
          icon: "📝",
          title: "Old Meeting Notes",
          deleted_at: "2026-10-31T10:00:00Z",
        }}
        daysLeft={29}
        operating={false}
        onRestore={noop}
        onPermanentDelete={noop}
      />
      <TrashItemRow
        page={{
          id: "t2",
          icon: null,
          title: "Draft Proposal",
          deleted_at: "2026-10-20T15:30:00Z",
        }}
        daysLeft={18}
        operating={false}
        onRestore={noop}
        onPermanentDelete={noop}
      />
      <TrashItemRow
        page={{
          id: "t3",
          icon: "🗂️",
          title: "Archive",
          deleted_at: "2026-10-04T09:00:00Z",
        }}
        daysLeft={2}
        operating={false}
        onRestore={noop}
        onPermanentDelete={noop}
      />
    </TrashList>
  ),
};

export const SingleItem: Story = {
  render: () => (
    <TrashList count={1}>
      <TrashItemRow
        page={{
          id: "t1",
          icon: "📝",
          title: "Old Meeting Notes",
          deleted_at: "2026-10-31T10:00:00Z",
        }}
        daysLeft={29}
        operating={false}
        onRestore={noop}
        onPermanentDelete={noop}
      />
    </TrashList>
  ),
};

export const Empty: Story = {
  name: "Empty (hidden)",
  render: () => (
    <div className="w-56 bg-muted p-2">
      <p className="px-2 text-xs text-muted-foreground">
        (Trash section is hidden when empty)
      </p>
    </div>
  ),
};
