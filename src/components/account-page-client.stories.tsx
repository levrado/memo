import type { Meta, StoryObj } from "@storybook/react";
import { AccountPageClient } from "./account-page-client";

const meta: Meta<typeof AccountPageClient> = {
  title: "Account/AccountPageClient",
  component: AccountPageClient,
  parameters: {
    layout: "padded",
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

type Story = StoryObj<typeof AccountPageClient>;

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
