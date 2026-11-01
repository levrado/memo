import type { Meta, StoryObj } from "@storybook/react";
import { TrashItemRow } from "./trash-item-row";

// TrashItemRow is presentational — daysLeft is fixed per story so visual
// regression baselines stay stable over time.

const meta: Meta<typeof TrashItemRow> = {
  title: "Sidebar/TrashItemRow",
  component: TrashItemRow,
  decorators: [
    (Story) => (
      <div className="w-56 bg-muted p-2">
        <Story />
      </div>
    ),
  ],
};

export { meta as default };

type Story = StoryObj<typeof TrashItemRow>;

const noop = () => {};

const basePage = {
  id: "t1",
  icon: "📝",
  title: "Old Meeting Notes",
  deleted_at: "2026-10-31T10:00:00Z",
};

export const RecentlyDeleted: Story = {
  name: "Recently deleted (29d left)",
  args: {
    page: basePage,
    daysLeft: 29,
    operating: false,
    onRestore: noop,
    onPermanentDelete: noop,
  },
};

export const MidRetention: Story = {
  name: "Mid-retention (12d left)",
  args: {
    page: { ...basePage, id: "t2", icon: null, title: "Draft Proposal" },
    daysLeft: 12,
    operating: false,
    onRestore: noop,
    onPermanentDelete: noop,
  },
};

export const NearExpiry: Story = {
  name: "Near expiry (2d left)",
  args: {
    page: { ...basePage, id: "t3", icon: "🗂️", title: "Archive" },
    daysLeft: 2,
    operating: false,
    onRestore: noop,
    onPermanentDelete: noop,
  },
};

export const DeletesToday: Story = {
  name: "Deletes today (0d left)",
  args: {
    page: { ...basePage, id: "t4", icon: null, title: "Stale Page" },
    daysLeft: 0,
    operating: false,
    onRestore: noop,
    onPermanentDelete: noop,
  },
};

export const OperatingDisabled: Story = {
  name: "Operating (buttons disabled)",
  args: {
    page: basePage,
    daysLeft: 29,
    operating: true,
    onRestore: noop,
    onPermanentDelete: noop,
  },
};

export const LongTitle: Story = {
  name: "Long title (truncated)",
  args: {
    page: {
      ...basePage,
      id: "t5",
      title: "A very long trashed page title that should truncate cleanly",
    },
    daysLeft: 14,
    operating: false,
    onRestore: noop,
    onPermanentDelete: noop,
  },
};
