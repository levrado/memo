import type { Meta, StoryObj } from "@storybook/react";
import { AccountSettingsForm } from "./account-settings-form";

const meta: Meta<typeof AccountSettingsForm> = {
  title: "Account/AccountSettingsForm",
  component: AccountSettingsForm,
  parameters: {
    layout: "padded",
    nextjs: { appDirectory: true },
  },
  decorators: [
    (Story) => (
      <div className="mx-auto max-w-xl">
        <Story />
      </div>
    ),
  ],
};

export { meta as default };

type Story = StoryObj<typeof AccountSettingsForm>;

// Inline SVG avatar — external image URLs fail to load in
// offline/restricted-egress environments and break visual regression.
const AVATAR_URL = `data:image/svg+xml,${encodeURIComponent(
  '<svg xmlns="http://www.w3.org/2000/svg" width="150" height="150"><rect width="150" height="150" fill="#3e4c63"/><circle cx="75" cy="58" r="26" fill="#94a3b8"/><ellipse cx="75" cy="128" rx="42" ry="28" fill="#94a3b8"/></svg>',
)}`;

export const Default: Story = {
  args: {
    userId: "user-123",
    displayName: "Alice Johnson",
    email: "alice@example.com",
    avatarUrl: null,
  },
};

export const WithAvatar: Story = {
  args: {
    userId: "user-123",
    displayName: "Alice Johnson",
    email: "alice@example.com",
    avatarUrl: AVATAR_URL,
  },
};

export const LongDisplayName: Story = {
  args: {
    userId: "user-456",
    displayName: "A Very Long Display Name That Might Overflow The Input Field",
    email: "longname@example.com",
    avatarUrl: null,
  },
};

export const SingleInitial: Story = {
  args: {
    userId: "user-789",
    displayName: "Bob",
    email: "bob@example.com",
    avatarUrl: null,
  },
};
